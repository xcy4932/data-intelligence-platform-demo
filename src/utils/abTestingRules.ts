import type {
  AbExperimentAction,
  AbExperimentParamType,
  AbExperimentStatus,
  AbPermissionLevel,
  AbUserPermissionContext,
  AudienceRule,
  FeatureDecisionResult,
  FeatureFlag,
  FeaturePublishStatus,
  FeatureStatus,
  FeatureVersion,
  SmoothEffectTask,
} from '@/types/abTesting'

const allowedTransitions: Record<AbExperimentStatus, Partial<Record<AbExperimentAction, AbExperimentStatus>>> = {
  DRAFT: {
    save_draft: 'DRAFT',
    submit_debug: 'DEBUGGING',
    archive: 'ARCHIVED',
    edit: 'DRAFT',
    manage_permission: 'DRAFT',
  },
  DEBUGGING: {
    start: 'RUNNING',
    edit: 'DEBUGGING',
    archive: 'ARCHIVED',
    manage_permission: 'DEBUGGING',
  },
  READY: {
    start: 'RUNNING',
    edit: 'READY',
    manage_permission: 'READY',
  },
  RUNNING: {
    pause: 'PAUSED',
    freeze: 'FROZEN',
    stop: 'ENDED',
    edit: 'RUNNING',
    solidify_feature: 'RUNNING',
    manage_permission: 'RUNNING',
  },
  PAUSING: {
    stop: 'STOPPING',
    manage_permission: 'PAUSING',
  },
  PAUSED: {
    resume: 'RUNNING',
    stop: 'ENDED',
    edit: 'PAUSED',
    manage_permission: 'PAUSED',
  },
  FROZEN: {
    resume: 'RUNNING',
    stop: 'ENDED',
    solidify_feature: 'FROZEN',
    manage_permission: 'FROZEN',
  },
  STOPPING: {
    manage_permission: 'STOPPING',
  },
  STOPPED: {
    restart: 'RUNNING',
    manage_permission: 'STOPPED',
  },
  ENDED: {
    restart: 'RUNNING',
    solidify_feature: 'ENDED',
    manage_permission: 'ENDED',
  },
  ARCHIVED: {},
}

export function getNextExperimentStatus(
  status: AbExperimentStatus,
  action: AbExperimentAction,
): AbExperimentStatus | null {
  return allowedTransitions[status][action] ?? null
}

export function getExperimentActionAvailability(
  status: AbExperimentStatus,
  action: AbExperimentAction,
  options: { hasPermission: boolean; smoothTaskRunning?: boolean; uniformDiversionReady?: boolean } = {
    hasPermission: true,
  },
): { available: boolean; reason?: string; nextStatus?: AbExperimentStatus } {
  if (!options.hasPermission) {
    return { available: false, reason: '暂无操作权限' }
  }
  if (options.smoothTaskRunning && ['start', 'pause', 'stop', 'edit'].includes(action)) {
    return { available: false, reason: '平滑生效任务执行中，暂不可变更实验状态' }
  }
  if (action === 'start' && options.uniformDiversionReady === false) {
    return { available: false, reason: '增强分流均匀性尚未调平成功' }
  }
  const nextStatus = getNextExperimentStatus(status, action)
  if (!nextStatus) {
    return { available: false, reason: `当前状态不支持「${action}」操作` }
  }
  return { available: true, nextStatus }
}

const actionPermissionLevel: Record<string, AbPermissionLevel> = {
  save_draft: 'collaborate',
  submit_debug: 'collaborate',
  start: 'admin',
  pause: 'admin',
  freeze: 'admin',
  resume: 'admin',
  stop: 'admin',
  restart: 'admin',
  archive: 'admin',
  edit: 'collaborate',
  solidify_feature: 'admin',
  manage_permission: 'admin',
  view_report: 'view',
  export_report: 'view',
  create_metric: 'collaborate',
  manage_metric: 'admin',
  create_feature: 'collaborate',
  publish_feature: 'collaborate',
  rollback_feature: 'collaborate',
  delete_feature: 'collaborate',
  manage_feature_permission: 'collaborate',
}

const permissionRank: Record<AbPermissionLevel, number> = {
  none: 0,
  view: 1,
  collaborate: 2,
  admin: 3,
}

export function getAbPermissionLevel(
  context: AbUserPermissionContext,
  resource: {
    ownerId?: string
    collaboratorIds?: string[]
    visibility?: 'PUBLIC' | 'PRIVATE' | 'public' | 'private'
    ownerIds?: string[]
  },
): AbPermissionLevel {
  if (context.roles.includes('SUPER_ADMIN') || context.roles.includes('APP_ADMIN')) return 'admin'
  if (resource.ownerId === context.userId || resource.ownerIds?.includes(context.userId)) return 'admin'
  if (resource.collaboratorIds?.includes(context.userId)) return 'collaborate'
  if (resource.visibility === 'PUBLIC' || resource.visibility === 'public') return 'view'
  return 'none'
}

export function canUseAbAction(
  context: AbUserPermissionContext,
  action: string,
  grantedLevel: AbPermissionLevel,
): { allowed: boolean; requiredLevel: AbPermissionLevel; reason: string } {
  const explicitGrant = context.permissions[action]
  const requiredLevel = actionPermissionLevel[action] ?? 'admin'
  const allowed = explicitGrant === true || permissionRank[grantedLevel] >= permissionRank[requiredLevel]
  return {
    allowed,
    requiredLevel,
    reason: allowed ? '权限满足操作要求' : `需要 ${requiredLevel} 权限，当前为 ${grantedLevel}`,
  }
}

const allowedFeatureStatusTransitions: Record<FeatureStatus, FeatureStatus[]> = {
  enabled: ['disabled'],
  disabled: ['enabled', 'deleted'],
  deleted: [],
}

const allowedFeaturePublishStatusTransitions: Record<FeaturePublishStatus, FeaturePublishStatus[]> = {
  unpublished: ['pending_publish', 'gray', 'publish_confirm', 'full', 'disabled'],
  pending_publish: ['gray', 'canceled'],
  gray: ['full', 'rolled_back'],
  publish_confirm: ['gray', 'full', 'rolled_back'],
  full: ['rolled_back'],
  rolled_back: ['disabled'],
  disabled: ['canceled'],
  canceled: [],
}

export function canTransitionFeatureStatus(from: FeatureStatus, to: FeatureStatus) {
  return allowedFeatureStatusTransitions[from].includes(to)
}

export function canTransitionFeaturePublishStatus(from: FeaturePublishStatus, to: FeaturePublishStatus) {
  return allowedFeaturePublishStatusTransitions[from].includes(to)
}

export function validateExperimentParamValue(
  type: AbExperimentParamType,
  value: unknown,
  required = true,
): { valid: boolean; message?: string } {
  if (value === undefined || value === null || value === '') {
    return required ? { valid: false, message: '必填参数不能为空' } : { valid: true }
  }

  if (type === 'NUMBER') {
    return typeof value === 'number' && Number.isFinite(value)
      ? { valid: true }
      : { valid: false, message: 'Number 参数必须是有限数字' }
  }
  if (type === 'STRING') {
    return typeof value === 'string' && value.length <= 1000
      ? { valid: true }
      : { valid: false, message: 'String 参数必须是 1000 字以内字符串' }
  }
  if (type === 'BOOLEAN') {
    return typeof value === 'boolean'
      ? { valid: true }
      : { valid: false, message: 'Boolean 参数只能为 true 或 false' }
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return isJsonObject(parsed)
        ? { valid: true }
        : { valid: false, message: 'Json 参数顶层必须是对象' }
    } catch (error) {
      return { valid: false, message: getJsonErrorMessage(error) }
    }
  }

  return isJsonObject(value)
    ? { valid: true }
    : { valid: false, message: 'Json 参数顶层必须是对象' }
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function getJsonErrorMessage(error: unknown): string {
  if (error instanceof SyntaxError) {
    return `JSON 格式错误：${error.message}`
  }
  return 'JSON 格式错误'
}

export function validateMetricFormula(
  formula: string,
  eventCodes: string[],
): { valid: boolean; message?: string } {
  const trimmed = formula.trim()
  if (!trimmed) return { valid: false, message: '请输入指标关系' }
  if (/[^A-Z+\-*/()\s]/.test(trimmed)) {
    return { valid: false, message: '公式仅支持事件编号、括号和四则运算符' }
  }
  if (/[+\-*/]{2,}/.test(trimmed)) {
    return { valid: false, message: '公式不允许连续运算符' }
  }
  if (/^[+\-*/]/.test(trimmed) || /[+\-*/]$/.test(trimmed)) {
    return { valid: false, message: '公式不能以运算符开头或结尾' }
  }
  if ((trimmed.match(/\(/g) ?? []).length !== (trimmed.match(/\)/g) ?? []).length) {
    return { valid: false, message: '公式括号不完整' }
  }
  if (/\([^()]*\([^()]*\)/.test(trimmed)) {
    return { valid: false, message: '当前仅支持一层括号' }
  }

  const referencedCodes = trimmed.match(/[A-Z]/g) ?? []
  const missingCode = referencedCodes.find((code) => !eventCodes.includes(code))
  if (missingCode) {
    return { valid: false, message: `公式中存在未定义事件编号：${missingCode}` }
  }

  return { valid: true }
}

export function validateTrafficRatios(ratios: number[], expectedTotal = 100): { valid: boolean; total: number; message?: string } {
  const total = Number(ratios.reduce((sum, ratio) => sum + ratio, 0).toFixed(2))
  if (ratios.some((ratio) => !Number.isFinite(ratio) || ratio < 0)) {
    return { valid: false, total, message: '流量比例必须是非负数字' }
  }
  if (ratios.some((ratio) => ratio === 0)) {
    return { valid: false, total, message: '已启用版本的流量比例不能为 0' }
  }
  if (Math.abs(total - expectedTotal) > 0.001) {
    return { valid: false, total, message: `流量比例合计必须等于 ${expectedTotal}%` }
  }
  return { valid: true, total }
}

export function calculateSmoothTraffic(task: Pick<SmoothEffectTask, 'startTrafficRatio' | 'targetTrafficRatio' | 'durationMinutes' | 'startedAt'>, now = new Date()): number {
  const startedAt = new Date(task.startedAt).getTime()
  const elapsedMinutes = Math.max(0, (now.getTime() - startedAt) / 60000)
  if (task.durationMinutes <= 0) return task.targetTrafficRatio
  const progress = Math.min(1, elapsedMinutes / task.durationMinutes)
  const current = task.startTrafficRatio + (task.targetTrafficRatio - task.startTrafficRatio) * progress
  return Number(current.toFixed(4))
}

export function calculateTrafficRecommendation(input: {
  estimatedTotalUsers: number
  versionCount: number
  mdeValue: number
  metricVariance: number
  alpha?: number
  power?: number
  trafficFilterRatio?: number
}): {
  sampleSizePerGroup: number
  recommendedTotalSampleSize: number
  recommendedTrafficRatio: number
  overLimit: boolean
  suggestions: string[]
} {
  const alpha = input.alpha ?? 0.05
  const power = input.power ?? 0.8
  const zAlpha = alpha <= 0.01 ? 2.58 : alpha <= 0.05 ? 1.96 : 1.64
  const zPower = power >= 0.99 ? 2.33 : power >= 0.9 ? 1.28 : 0.84
  const effect = Math.max(input.mdeValue, 0.000001)
  const variance = Math.max(input.metricVariance, 0.000001)
  const sampleSizePerGroup = Math.ceil((2 * variance * Math.pow(zAlpha + zPower, 2)) / Math.pow(effect, 2))
  const recommendedTotalSampleSize = sampleSizePerGroup * input.versionCount
  const effectiveReachableUsers = Math.max(1, input.estimatedTotalUsers * ((input.trafficFilterRatio ?? 1) || 1))
  const recommendedTrafficRatio = recommendedTotalSampleSize / effectiveReachableUsers
  const overLimit = recommendedTrafficRatio > 1
  const suggestions = overLimit
    ? ['延长实验周期', '减少实验版本数', '提高 MDE', '扩大受众范围']
    : ['建议按当前流量配置执行，并在报告中持续观察 MDE']

  return {
    sampleSizePerGroup,
    recommendedTotalSampleSize,
    recommendedTrafficRatio,
    overLimit,
    suggestions,
  }
}

export function evaluateFeatureDecision(input: {
  feature?: FeatureFlag
  version?: FeatureVersion
  userId: string
  context: Record<string, unknown>
  inWhitelist?: boolean
  inExperiment?: boolean
  localDefault?: unknown
}): FeatureDecisionResult {
  const featureKey = input.feature?.key ?? 'unknown_feature'
  if (!input.feature) {
    return localDefaultDecision(featureKey, input.localDefault, 'feature_missing')
  }
  if (input.inWhitelist) {
    const variant = input.version?.variants[0]
    return {
      featureKey,
      value: variant?.value ?? input.localDefault,
      variantId: variant?.variantId,
      variantName: variant?.name,
      versionId: input.version?.versionId,
      decisionSource: 'whitelist',
      decisionReason: 'matched_whitelist',
      isDefaultValue: !variant,
    }
  }
  if (input.inExperiment) {
    return {
      featureKey,
      value: input.localDefault,
      decisionSource: 'experiment',
      decisionReason: 'matched_experiment',
      isDefaultValue: true,
    }
  }
  if (input.feature.status !== 'enabled') {
    return localDefaultDecision(featureKey, input.localDefault, 'feature_disabled')
  }
  if (!input.version || input.version.versionStatus === 'unpublished' || input.version.versionStatus === 'disabled') {
    return localDefaultDecision(featureKey, input.localDefault, 'feature_missing')
  }

  const trafficBucket = stableBucket(`${input.feature.appId}:${input.feature.key}:${input.version.versionId}:${input.userId}`)
  if (trafficBucket >= input.version.publishTraffic) {
    return localDefaultDecision(featureKey, input.localDefault, 'traffic_not_hit')
  }

  const matchedRule = input.version.audienceRules
    .sort((left, right) => left.order - right.order)
    .find((rule) => matchesAudienceRule(rule, input.context))
  const rule = matchedRule ?? input.version.defaultRule
  return resolveRuleDecision(featureKey, input.version, rule, input.userId, input.localDefault)
}

function resolveRuleDecision(
  featureKey: string,
  version: FeatureVersion,
  rule: AudienceRule,
  userId: string,
  localDefault: unknown,
): FeatureDecisionResult {
  if (rule.deliveryType === 'no_value') {
    return localDefaultDecision(featureKey, localDefault, 'no_value_by_rule', version.versionId, rule.ruleId)
  }
  const variantId =
    rule.deliveryType === 'single_variant'
      ? rule.variantId
      : pickWeightedVariant(rule.variantWeights ?? [], `${version.versionId}:${rule.ruleId}:${userId}`)
  const variant = version.variants.find((item) => item.variantId === variantId)
  if (!variant) {
    return localDefaultDecision(featureKey, localDefault, 'no_value_by_rule', version.versionId, rule.ruleId)
  }
  return {
    featureKey,
    value: variant.value,
    variantId: variant.variantId,
    variantName: variant.name,
    versionId: version.versionId,
    decisionSource: 'feature',
    decisionReason: rule.ruleId === 'else' ? 'matched_default_rule' : 'matched_audience_rule',
    ruleId: rule.ruleId,
    isDefaultValue: false,
  }
}

function localDefaultDecision(
  featureKey: string,
  value: unknown,
  reason: FeatureDecisionResult['decisionReason'],
  versionId?: string,
  ruleId?: string,
): FeatureDecisionResult {
  return {
    featureKey,
    value,
    versionId,
    ruleId,
    decisionSource: 'local_default',
    decisionReason: reason,
    isDefaultValue: true,
  }
}

function matchesAudienceRule(rule: AudienceRule, context: Record<string, unknown>): boolean {
  if (rule.conditions.length === 0) return false
  return rule.conditions.every((condition) => {
    const actual = context[condition.fieldName]
    const expected = condition.value
    if (
      condition.fieldSource === 'custom_variable' &&
      (actual === undefined || actual === null || actual === '')
    ) {
      return false
    }
    switch (condition.operator) {
      case 'eq':
        return actual === expected
      case 'neq':
        return actual !== expected
      case 'in':
        return Array.isArray(expected) && expected.includes(actual)
      case 'not_in':
        return Array.isArray(expected) && !expected.includes(actual)
      case 'contains':
        return String(actual ?? '').includes(String(expected ?? ''))
      case 'not_contains':
        return !String(actual ?? '').includes(String(expected ?? ''))
      case 'gt':
        return Number(actual) > Number(expected)
      case 'gte':
        return Number(actual) >= Number(expected)
      case 'lt':
        return Number(actual) < Number(expected)
      case 'lte':
        return Number(actual) <= Number(expected)
      case 'is_null':
        return actual === undefined || actual === null || actual === ''
      case 'is_not_null':
        return actual !== undefined && actual !== null && actual !== ''
      case 'between':
        return Array.isArray(expected) && Number(actual) >= Number(expected[0]) && Number(actual) <= Number(expected[1])
      default:
        return false
    }
  })
}

function pickWeightedVariant(weights: Array<{ variantId: string; weight: number }>, seed: string): string | undefined {
  const total = weights.reduce((sum, item) => sum + item.weight, 0)
  if (total <= 0) return undefined
  const bucket = stableBucket(seed, total)
  let cursor = 0
  for (const item of weights) {
    cursor += item.weight
    if (bucket <= cursor) return item.variantId
  }
  return weights.at(-1)?.variantId
}

function stableBucket(seed: string, max = 100): number {
  let hash = 2166136261
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (Math.abs(hash) % max) + 1
}
