import {
  abAlarmTasks,
  abCoverageMatrix,
  abCohortReports,
  abDataDedupTasks,
  abDiversionConfigs,
  abExperimentBoards,
  abExperimentVariants,
  abExperiments,
  abExperimentPermissionGrants,
  abExperimentTemplates,
  abFeatureFlags,
  abFeatureVersions,
  abFilterTemplates,
  abFunnelReports,
  abHeatmapReports,
  abHitQueryTemplates,
  abMabReports,
  abAlarmTriggerRecords,
  abTemporaryRetentionQueryResults,
  abMetricBindingSnapshots,
  abMetricDirectoryGroups,
  abMetricGroups,
  abMetricPermissionRoles,
  abMetricResults,
  abMetrics,
  abMetricTemplates,
  abMutexDomainGroups,
  abOperationLogs,
  abParamSchemas,
  abPublishPlans,
  abReceiverGroups,
  abReportOverviews,
  abSensitiveInsightTasks,
  abSmoothEffectTasks,
  abTrafficConfigs,
  abTrafficLayers,
  abTrendPoints,
  abUniformDiversionConfigs,
  abWhitelistTests,
  abMustSeeMetricTrends,
} from '@/mock/abTesting'
import type {
  AbExperimentAction,
  AbExperimentStatus,
  AbPermissionLevel,
  AbUserPermissionContext,
  AlarmTask,
  AlarmTriggerRecord,
  AudienceRule,
  BackendIntegrationStatus,
  BoardDiffResult,
  DataDedupTask,
  DataDedupTaskDraft,
  DiversionConfig,
  Experiment,
  ExperimentBoard,
  ExperimentBoardDraft,
  ExperimentDraft,
  ExperimentDraftValidationResult,
  ExperimentParamSchema,
  ExperimentPermissionGrant,
  ExperimentPermissionUpdatePayload,
  ExperimentReportOverview,
  ExperimentTemplate,
  ExperimentTrafficConfig,
  ExperimentVariant,
  FeatureDecisionResult,
  FeatureFlag,
  FeatureFlagDraft,
  FeatureLifecycleAction,
  FeaturePublishRequest,
  FeatureSolidifyRequest,
  FeatureVariant,
  FeatureVersion,
  FeatureVersionDraft,
  HitDiagnosisResult,
  HitQueryRequest,
  HitQueryResult,
  HitQueryTemplate,
  Metric,
  MetricBindingSnapshot,
  MetricDirectoryGroup,
  MetricGroup,
  MetricGroupEditorPayload,
  MetricPermissionRoleMatrix,
  MetricTemplate,
  MetricStatisticResult,
  OperationLog,
  PublishPlan,
  ReceiverGroup,
  ReportExportTask,
  ReportFilter,
  TemporaryRetentionQueryPayload,
  TemporaryRetentionQueryResult,
  SmoothEffectTaskOperation,
  SmoothEffectTask,
  UniformDiversionConfig,
  WhitelistTest,
  WhitelistTestDraft,
} from '@/types/abTesting'
import type { EntityId } from '@/types/common'
import {
  calculateSmoothTraffic,
  calculateTrafficRecommendation,
  canTransitionFeaturePublishStatus,
  canTransitionFeatureStatus,
  canUseAbAction,
  evaluateFeatureDecision,
  getAbPermissionLevel,
  getExperimentActionAvailability,
  validateMetricFormula,
  validateExperimentParamValue,
  validateTrafficRatios,
} from '@/utils/abTestingRules'

const resolveMock = <T>(payload: T, delay = 180): Promise<T> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(payload), delay)
  })

const findExperiment = (experimentId: EntityId) =>
  abExperiments.find((experiment) => experiment.id === experimentId)

const findFeature = (featureId: EntityId) =>
  abFeatureFlags.find((feature) => feature.featureId === featureId)

const findFeatureVersion = (versionId: EntityId) =>
  abFeatureVersions.find((version) => version.versionId === versionId)

const currentOperator = { id: 'user_growth_lin', name: '林哲', department: '增长运营团队' }
const servicePermissionContext: AbUserPermissionContext = {
  userId: currentOperator.id,
  roles: ['EXPERIMENT_OWNER'],
  permissions: {
    experiment_create: true,
    view_report: true,
    export_report: true,
    create_metric: true,
    create_feature: true,
    publish_feature: true,
  },
}
const appMembers = [
  currentOperator,
  { id: 'user_data_zhou', name: '周婧', department: '商业化数据团队' },
  { id: 'user_product_xu', name: '许澄', department: '产品体验团队' },
  { id: 'user_qa_chen', name: '陈悦', department: '质量保障团队' },
]

const createId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

const nowIso = () => new Date().toISOString()

const paramKeyPattern = /^[A-Za-z_][A-Za-z0-9_]*$/
const featureKeyPattern = /^[A-Za-z0-9_]+$/
const featureNamePattern = /^[\u4e00-\u9fa5A-Za-z0-9_]+$/
const whitelistUserIdPattern = /^[A-Za-z0-9_@.-]{1,128}$/

function numberPrecision(value: number) {
  const [integerPart = '', decimalPart = ''] = String(Math.abs(value)).split('.')
  return { integerDigits: integerPart.replace(/^0+/, '').length || 1, decimalDigits: decimalPart.length }
}

function validateFeatureVariantRules(
  variantType: FeatureVersion['variantType'],
  variants: FeatureVariant[],
  audienceRules: AudienceRule[],
  defaultRule: AudienceRule,
) {
  const errors: string[] = []
  const variantIds = new Set<EntityId>()
  const stringValues = new Set<string>()
  for (const variant of variants) {
    if (!variant.variantId || variantIds.has(variant.variantId)) errors.push('变体 ID 不能为空且不能重复')
    variantIds.add(variant.variantId)
    if (!variant.name.trim()) errors.push('变体名称不能为空')
    if (variantType === 'boolean' && typeof variant.value !== 'boolean') {
      errors.push('boolean 变体值只能为 true 或 false')
    }
    if (variantType === 'string') {
      const value = typeof variant.value === 'string' ? variant.value : String(variant.value ?? '')
      if (!value) errors.push('string 变体值不能为空')
      if (stringValues.has(value)) errors.push('string 变体值不允许重复')
      stringValues.add(value)
    }
    if (variantType === 'number') {
      if (typeof variant.value !== 'number' || !Number.isFinite(variant.value)) {
        errors.push('number 变体值必须为合法数字')
      } else {
        const precision = numberPrecision(variant.value)
        if (precision.integerDigits > 10) errors.push('number 变体整数位最多 10 位')
        if (precision.decimalDigits > 5) errors.push('number 变体小数位最多 5 位')
      }
    }
    if (variantType === 'json' && (typeof variant.value !== 'object' || variant.value === null)) {
      errors.push('json 变体值必须为合法 JSON')
    }
  }
  if (variantType === 'boolean') {
    const values = variants.map((variant) => variant.value)
    if (variants.length !== 2 || !values.includes(true) || !values.includes(false)) {
      errors.push('boolean 类型必须且只能包含 true / false 两个变体')
    }
  }
  for (const rule of [...audienceRules, defaultRule]) {
    if (rule.deliveryType === 'single_variant' && (!rule.variantId || !variantIds.has(rule.variantId))) {
      errors.push('单变体发布规则必须选择存在的变体')
    }
    if (rule.deliveryType === 'multi_variant') {
      const weights = rule.variantWeights ?? []
      const total = Number(weights.reduce((sum, item) => sum + item.weight, 0).toFixed(3))
      if (Math.abs(total - 100) > 0.001) errors.push('多变体比例合计必须等于 100%')
      if (weights.some((item) => !variantIds.has(item.variantId))) errors.push('多变体规则引用了不存在的变体')
    }
  }
  return [...new Set(errors)]
}

function resolveMember(userId?: string) {
  return appMembers.find((member) => member.id === userId) ?? currentOperator
}

function getServiceFeaturePermission(feature: FeatureFlag): AbPermissionLevel {
  return getAbPermissionLevel(servicePermissionContext, {
    ownerIds: feature.owners,
    visibility: feature.featureType,
  })
}

function canViewServiceFeature(feature?: FeatureFlag) {
  return Boolean(feature && getServiceFeaturePermission(feature) !== 'none')
}

function canOperateServiceFeature(feature: FeatureFlag | undefined, action: string) {
  if (!feature) return false
  const grantedLevel = getServiceFeaturePermission(feature)
  if (grantedLevel === 'none') return false
  return canUseAbAction(servicePermissionContext, action, grantedLevel).allowed
}

function featurePermissionDeniedMessage(actionLabel: string) {
  return `暂无 Feature ${actionLabel}权限，请联系 Owner 添加为协作者`
}

function getFeatureIdFromOperationLog(log: OperationLog) {
  if (log.objectType === 'FEATURE') return log.objectId
  if (log.objectType === 'FEATURE_VERSION') return findFeatureVersion(log.objectId)?.featureId
  const featurePayload = log.after?.feature
  if (featurePayload && typeof featurePayload === 'object' && 'featureId' in featurePayload) {
    return String((featurePayload as Pick<FeatureFlag, 'featureId'>).featureId)
  }
  return undefined
}

function canViewOperationLog(log: OperationLog) {
  const featureId = getFeatureIdFromOperationLog(log)
  if (!featureId) return true
  return canViewServiceFeature(findFeature(featureId))
}

function hasHardcodedGroupParam(schemaKey: string, values: unknown[]) {
  if (!/(group|version|exp|test_id)/i.test(schemaKey)) return false
  const numericValues = values
    .map((value) => (typeof value === 'number' ? value : Number(value)))
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right)
  if (numericValues.length < 2) return false
  return numericValues.every((value, index) => index === 0 || value - (numericValues[index - 1] ?? value) === 1)
}

function isGoalDetailed(goal?: string) {
  const normalized = goal?.trim() ?? ''
  if (normalized.length < 20) return false
  const hasStrategy = /(验证|策略|方案|功能|文案|页面|算法|推荐|按钮|实验)/.test(normalized)
  const hasAudience = /(用户|人群|场景|访问|设备|地域|城市|客群)/.test(normalized)
  const hasMetric = /(指标|点击|转化|留存|播放|时长|收入|CTR|率|MDE)/i.test(normalized)
  const hasLift = /(提升|降低|增长|减少|优化|改善|预期|%|百分点|\d+)/.test(normalized)
  return hasStrategy && hasAudience && hasMetric && hasLift
}

const createdMockStorageKey = 'ab-testing:mock-created-state:v1'

interface CreatedMockState {
  experiments: Experiment[]
  variants: ExperimentVariant[]
  paramSchemas: ExperimentParamSchema[]
  diversionConfigs: DiversionConfig[]
  trafficConfigs: ExperimentTrafficConfig[]
  uniformConfigs: UniformDiversionConfig[]
  smoothTasks: SmoothEffectTask[]
  permissionGrants: ExperimentPermissionGrant[]
  metricGroups: MetricGroup[]
  metricDirectoryGroups: MetricDirectoryGroup[]
  metrics: Metric[]
  metricBindingSnapshots: MetricBindingSnapshot[]
  metricTemplates: MetricTemplate[]
  deletedMetricTemplateIds: EntityId[]
  alarmTasks: AlarmTask[]
  alarmTriggerRecords: AlarmTriggerRecord[]
  deletedAlarmTaskIds: EntityId[]
  receiverGroups: ReceiverGroup[]
  deletedReceiverGroupIds: EntityId[]
  temporaryRetentionQueries: TemporaryRetentionQueryResult[]
  reportExportTasks: ReportExportTask[]
  featureFlags: FeatureFlag[]
  featureVersions: FeatureVersion[]
  publishPlans: PublishPlan[]
  whitelistTests: WhitelistTest[]
  deletedWhitelistTestIds: EntityId[]
  dataDedupTasks: DataDedupTask[]
  experimentBoards: ExperimentBoard[]
  operationLogs: OperationLog[]
}

function getMockStorage() {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function readCreatedMockState(): CreatedMockState {
  const emptyState: CreatedMockState = {
    experiments: [],
    variants: [],
    paramSchemas: [],
    diversionConfigs: [],
    trafficConfigs: [],
    uniformConfigs: [],
    smoothTasks: [],
    permissionGrants: [],
    metricGroups: [],
    metricDirectoryGroups: [],
    metrics: [],
    metricBindingSnapshots: [],
    metricTemplates: [],
    deletedMetricTemplateIds: [],
    alarmTasks: [],
    alarmTriggerRecords: [],
    deletedAlarmTaskIds: [],
    receiverGroups: [],
    deletedReceiverGroupIds: [],
    temporaryRetentionQueries: [],
    reportExportTasks: [],
    featureFlags: [],
    featureVersions: [],
    publishPlans: [],
    whitelistTests: [],
    deletedWhitelistTestIds: [],
    dataDedupTasks: [],
    experimentBoards: [],
    operationLogs: [],
  }
  const raw = getMockStorage()?.getItem(createdMockStorageKey)
  if (!raw) return emptyState
  try {
    return { ...emptyState, ...JSON.parse(raw) }
  } catch {
    return emptyState
  }
}

const abReportExportTasks: ReportExportTask[] = [
  ...abReportOverviews.map((overview) => ({
    id: `export_${overview.experimentId}_overview`,
    experimentId: overview.experimentId,
    reportType: 'overview' as const,
    fileName: `${overview.experimentName}-overview-report.xlsx`,
    status: 'success' as const,
    progress: 100,
    downloadUrl: `/mock-downloads/abtest/${overview.experimentId}/overview.xlsx`,
    createdBy: currentOperator.id,
    createdAt: overview.dataUpdatedAt,
    updatedAt: overview.dataUpdatedAt,
  })),
  {
    id: 'export_failed_metric_snapshot',
    experimentId: 'exp_feed_strategy',
    reportType: 'metrics',
    fileName: 'Feed 推荐策略实验-metrics-report.xlsx',
    status: 'failed',
    progress: 72,
    failureReason: '指标快照版本缺失，已允许重试并重新拉取快照。',
    createdBy: currentOperator.id,
    createdAt: '2026-05-28T16:00:00+02:00',
    updatedAt: '2026-05-28T16:03:00+02:00',
  },
]

function advanceReportExportQueue() {
  const changedTasks: ReportExportTask[] = []
  for (const task of abReportExportTasks) {
    if (task.status === 'queued') {
      task.status = 'running'
      task.progress = Math.max(task.progress, 18)
      task.updatedAt = nowIso()
      changedTasks.push({ ...task })
    } else if (task.status === 'running') {
      task.progress = Math.min(100, task.progress + 32)
      task.updatedAt = nowIso()
      if (task.progress >= 100) {
        task.status = 'success'
        task.downloadUrl = `/mock-downloads/abtest/${task.experimentId}/${task.reportType}.xlsx`
      }
      changedTasks.push({ ...task })
    }
  }
  if (changedTasks.length) persistCreatedMockState({ reportExportTasks: changedTasks })
}

function upsertById<T extends { id: EntityId }>(target: T[], items: T[]) {
  for (const item of items) {
    if (!target.some((existing) => existing.id === item.id)) target.unshift(item)
  }
}

function mergeById<T extends { id: EntityId }>(target: T[], items: T[]) {
  for (const item of items) {
    const index = target.findIndex((existing) => existing.id === item.id)
    if (index >= 0) {
      target.splice(index, 1, item)
    } else {
      target.unshift(item)
    }
  }
}

function mergeByKey<T>(target: T[], items: T[], getKey: (item: T) => EntityId) {
  for (const item of items) {
    const index = target.findIndex((existing) => getKey(existing) === getKey(item))
    if (index >= 0) {
      target.splice(index, 1, item)
    } else {
      target.unshift(item)
    }
  }
}

function applyCreatedMockState() {
  const state = readCreatedMockState()
  mergeById(abExperiments, state.experiments)
  mergeById(abExperimentVariants, state.variants)
  mergeById(abParamSchemas, state.paramSchemas)
  if (state.diversionConfigs.length) {
    for (const config of state.diversionConfigs) {
      if (!abDiversionConfigs.some((existing) => existing.experimentId === config.experimentId)) {
        abDiversionConfigs.push(config)
      }
    }
  }
  if (state.trafficConfigs.length) {
    for (const config of state.trafficConfigs) {
      if (!abTrafficConfigs.some((existing) => existing.experimentId === config.experimentId)) {
        abTrafficConfigs.push(config)
      }
    }
  }
  if (state.uniformConfigs.length) {
    for (const config of state.uniformConfigs) {
      if (!abUniformDiversionConfigs.some((existing) => existing.experimentId === config.experimentId)) {
        abUniformDiversionConfigs.push(config)
      }
    }
  }
  mergeById(abSmoothEffectTasks, state.smoothTasks)
  mergeById(abExperimentPermissionGrants, state.permissionGrants)
  mergeById(abMetricGroups, state.metricGroups)
  mergeById(abMetricDirectoryGroups, state.metricDirectoryGroups)
  mergeById(abMetrics, state.metrics)
  mergeById(abMetricBindingSnapshots, state.metricBindingSnapshots)
  mergeById(abMetricTemplates, state.metricTemplates)
  if (state.deletedMetricTemplateIds.length) {
    for (let index = abMetricTemplates.length - 1; index >= 0; index -= 1) {
      if (state.deletedMetricTemplateIds.includes(abMetricTemplates[index]?.id ?? '')) abMetricTemplates.splice(index, 1)
    }
  }
  mergeById(abAlarmTasks, state.alarmTasks)
  mergeById(abAlarmTriggerRecords, state.alarmTriggerRecords)
  if (state.deletedAlarmTaskIds.length) {
    for (let index = abAlarmTasks.length - 1; index >= 0; index -= 1) {
      if (state.deletedAlarmTaskIds.includes(abAlarmTasks[index]?.id ?? '')) abAlarmTasks.splice(index, 1)
    }
  }
  mergeById(abReceiverGroups, state.receiverGroups)
  if (state.deletedReceiverGroupIds.length) {
    for (let index = abReceiverGroups.length - 1; index >= 0; index -= 1) {
      if (state.deletedReceiverGroupIds.includes(abReceiverGroups[index]?.id ?? '')) abReceiverGroups.splice(index, 1)
    }
  }
  mergeById(abTemporaryRetentionQueryResults, state.temporaryRetentionQueries)
  mergeById(abReportExportTasks, state.reportExportTasks)
  mergeByKey(abFeatureFlags, state.featureFlags, (item) => item.featureId)
  mergeByKey(abFeatureVersions, state.featureVersions, (item) => item.versionId)
  mergeByKey(abPublishPlans, state.publishPlans, (item) => item.publishId)
  mergeById(abWhitelistTests, state.whitelistTests)
  if (state.deletedWhitelistTestIds.length) {
    for (let index = abWhitelistTests.length - 1; index >= 0; index -= 1) {
      if (state.deletedWhitelistTestIds.includes(abWhitelistTests[index]?.id ?? '')) abWhitelistTests.splice(index, 1)
    }
  }
  mergeById(abDataDedupTasks, state.dataDedupTasks)
  mergeById(abExperimentBoards, state.experimentBoards)
  upsertById(abOperationLogs, state.operationLogs)
}

function persistCreatedMockState(addition: Partial<CreatedMockState>) {
  const state = readCreatedMockState()
  const incomingPermissionExperimentIds = new Set((addition.permissionGrants ?? []).map((grant) => grant.experimentId))
  const nextState: CreatedMockState = {
    experiments: [...(addition.experiments ?? []), ...state.experiments].filter(
      (item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index,
    ),
    variants: [...(addition.variants ?? []), ...state.variants].filter(
      (item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index,
    ),
    paramSchemas: [...(addition.paramSchemas ?? []), ...state.paramSchemas].filter(
      (item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index,
    ),
    diversionConfigs: [...(addition.diversionConfigs ?? []), ...state.diversionConfigs].filter(
      (item, index, items) => items.findIndex((candidate) => candidate.experimentId === item.experimentId) === index,
    ),
    trafficConfigs: [...(addition.trafficConfigs ?? []), ...state.trafficConfigs].filter(
      (item, index, items) => items.findIndex((candidate) => candidate.experimentId === item.experimentId) === index,
    ),
    uniformConfigs: [...(addition.uniformConfigs ?? []), ...state.uniformConfigs].filter(
      (item, index, items) => items.findIndex((candidate) => candidate.experimentId === item.experimentId) === index,
    ),
    smoothTasks: [...(addition.smoothTasks ?? []), ...state.smoothTasks].filter(
      (item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index,
    ),
    permissionGrants: [
      ...(addition.permissionGrants ?? []),
      ...state.permissionGrants.filter((grant) => !incomingPermissionExperimentIds.has(grant.experimentId)),
    ].filter(
      (item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index,
    ),
    metricGroups: [...(addition.metricGroups ?? []), ...state.metricGroups].filter(
      (item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index,
    ),
    metricDirectoryGroups: [...(addition.metricDirectoryGroups ?? []), ...state.metricDirectoryGroups].filter(
      (item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index,
    ),
    metrics: [...(addition.metrics ?? []), ...state.metrics].filter(
      (item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index,
    ),
    metricBindingSnapshots: [...(addition.metricBindingSnapshots ?? []), ...state.metricBindingSnapshots].filter(
      (item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index,
    ),
    metricTemplates: [...(addition.metricTemplates ?? []), ...state.metricTemplates].filter(
      (item, index, items) =>
        ![...(addition.deletedMetricTemplateIds ?? []), ...state.deletedMetricTemplateIds].includes(item.id) &&
        items.findIndex((candidate) => candidate.id === item.id) === index,
    ),
    deletedMetricTemplateIds: [...new Set([...(addition.deletedMetricTemplateIds ?? []), ...state.deletedMetricTemplateIds])],
    alarmTasks: [...(addition.alarmTasks ?? []), ...state.alarmTasks].filter(
      (item, index, items) =>
        ![...(addition.deletedAlarmTaskIds ?? []), ...state.deletedAlarmTaskIds].includes(item.id) &&
        items.findIndex((candidate) => candidate.id === item.id) === index,
    ),
    alarmTriggerRecords: [...(addition.alarmTriggerRecords ?? []), ...state.alarmTriggerRecords].filter(
      (item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index,
    ),
    deletedAlarmTaskIds: [...new Set([...(addition.deletedAlarmTaskIds ?? []), ...state.deletedAlarmTaskIds])],
    receiverGroups: [...(addition.receiverGroups ?? []), ...state.receiverGroups].filter(
      (item, index, items) =>
        ![...(addition.deletedReceiverGroupIds ?? []), ...state.deletedReceiverGroupIds].includes(item.id) &&
        items.findIndex((candidate) => candidate.id === item.id) === index,
    ),
    deletedReceiverGroupIds: [...new Set([...(addition.deletedReceiverGroupIds ?? []), ...state.deletedReceiverGroupIds])],
    temporaryRetentionQueries: [...(addition.temporaryRetentionQueries ?? []), ...state.temporaryRetentionQueries].filter(
      (item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index,
    ),
    reportExportTasks: [...(addition.reportExportTasks ?? []), ...state.reportExportTasks].filter(
      (item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index,
    ),
    featureFlags: [...(addition.featureFlags ?? []), ...state.featureFlags].filter(
      (item, index, items) => items.findIndex((candidate) => candidate.featureId === item.featureId) === index,
    ),
    featureVersions: [...(addition.featureVersions ?? []), ...state.featureVersions].filter(
      (item, index, items) => items.findIndex((candidate) => candidate.versionId === item.versionId) === index,
    ),
    publishPlans: [...(addition.publishPlans ?? []), ...state.publishPlans].filter(
      (item, index, items) => items.findIndex((candidate) => candidate.publishId === item.publishId) === index,
    ),
    whitelistTests: [...(addition.whitelistTests ?? []), ...state.whitelistTests].filter(
      (item, index, items) =>
        ![...(addition.deletedWhitelistTestIds ?? []), ...state.deletedWhitelistTestIds].includes(item.id) &&
        items.findIndex((candidate) => candidate.id === item.id) === index,
    ),
    deletedWhitelistTestIds: [...new Set([...(addition.deletedWhitelistTestIds ?? []), ...state.deletedWhitelistTestIds])],
    dataDedupTasks: [...(addition.dataDedupTasks ?? []), ...state.dataDedupTasks].filter(
      (item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index,
    ),
    experimentBoards: [...(addition.experimentBoards ?? []), ...state.experimentBoards].filter(
      (item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index,
    ),
    operationLogs: [...(addition.operationLogs ?? []), ...state.operationLogs].filter(
      (item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index,
    ),
  }
  getMockStorage()?.setItem(createdMockStorageKey, JSON.stringify(nextState))
}

applyCreatedMockState()

export const abTestingApiPaths = {
  workspaceSummary: '/api/abtest/workspace/summary',
  experiments: '/api/abtest/experiments',
  experiment: (experimentId: EntityId) => `/api/abtest/experiments/${experimentId}`,
  experimentVariants: (experimentId: EntityId) => `/api/abtest/experiments/${experimentId}/variants`,
  experimentParams: (experimentId: EntityId) => `/api/abtest/experiments/${experimentId}/params`,
  experimentPlanning: (experimentId: EntityId) => `/api/abtest/experiments/${experimentId}/planning-bundle`,
  experimentTemplates: '/api/abtest/experiment-templates',
  experimentValidate: '/api/abtest/experiments/validate',
  experimentSubmitDebug: '/api/abtest/experiments/submit-debug',
  experimentTransition: (experimentId: EntityId) => `/api/abtest/experiments/${experimentId}/status-transition`,
  experimentSafeEdit: (experimentId: EntityId) => `/api/abtest/experiments/${experimentId}/safe-edit`,
  experimentScaleTraffic: (experimentId: EntityId) => `/api/abtest/experiments/${experimentId}/traffic-scale`,
  experimentCloseVariant: (experimentId: EntityId, variantId: EntityId) =>
    `/api/abtest/experiments/${experimentId}/variants/${variantId}/close`,
  experimentPermissions: (experimentId: EntityId) => `/api/abtest/experiments/${experimentId}/permissions`,
  hitQuery: '/api/abtest/tools/hit-query',
  hitQueryTemplates: '/api/abtest/tools/hit-query/templates',
  hitDiagnosis: '/api/abtest/tools/hit-diagnosis',
  dataDedupTasks: '/api/abtest/tools/data-dedup-tasks',
  dataDedupTaskRun: (taskId: EntityId) => `/api/abtest/tools/data-dedup-tasks/${taskId}/run`,
  dataDedupTaskDownload: (taskId: EntityId) => `/api/abtest/tools/data-dedup-tasks/${taskId}/download`,
  experimentBoards: '/api/abtest/boards',
  experimentBoard: (boardId: EntityId) => `/api/abtest/boards/${boardId}`,
  experimentBoardWidgets: (boardId: EntityId) => `/api/abtest/boards/${boardId}/widgets`,
  experimentBoardShare: (boardId: EntityId) => `/api/abtest/boards/${boardId}/share-link`,
  experimentBoardDiff: (boardId: EntityId) => `/api/abtest/boards/${boardId}/diff`,
  trafficCalculator: '/api/abtest/traffic/calculator',
  trafficLayers: '/api/abtest/traffic/layers',
  mutexDomains: '/api/abtest/traffic/mutex-domain-groups',
  uniformDiversionStart: '/api/abtest/traffic/rerandomization-tasks',
  uniformDiversionTask: (taskId: EntityId) => `/api/abtest/traffic/rerandomization-tasks/${taskId}`,
  uniformDiversionCancel: (taskId: EntityId) => `/api/abtest/traffic/rerandomization-tasks/${taskId}/cancel`,
  uniformDiversionApply: (taskId: EntityId) => `/api/abtest/traffic/rerandomization-tasks/${taskId}/apply`,
  smoothTask: (taskId: EntityId) => `/api/abtest/smooth-effect-tasks/${taskId}`,
  smoothTaskOperation: (taskId: EntityId, action: SmoothEffectTaskOperation) =>
    `/api/abtest/smooth-effect-tasks/${taskId}/${action}`,
  audienceEstimate: '/api/abtest/audience-estimate',
  runtimeDecision: '/api/abtest/runtime/decision',
  operationLogs: '/api/abtest/operation-logs',
  metricGroups: (appId: EntityId) => `/api/apps/${appId}/metric-groups`,
  metrics: (appId: EntityId) => `/api/apps/${appId}/metrics`,
  metricTemplates: (appId: EntityId) => `/api/apps/${appId}/metric-templates`,
  alarmTasks: (appId: EntityId) => `/api/apps/${appId}/metric-alarm-tasks`,
  receiverGroups: (appId: EntityId) => `/api/apps/${appId}/metric-receiver-groups`,
  mustSeeTrends: (appId: EntityId) => `/api/apps/${appId}/metric-must-see-trends`,
  reportOverview: (experimentId: EntityId) => `/api/abtest/reports/${experimentId}/overview`,
  reportMetrics: (experimentId: EntityId) => `/api/abtest/reports/${experimentId}/metrics`,
  reportFunnel: (metricId: EntityId) => `/api/abtest/reports/funnels/${metricId}`,
  reportCohort: (metricId: EntityId) => `/api/abtest/reports/cohorts/${metricId}`,
  reportHeatmap: (experimentId: EntityId) => `/api/abtest/reports/${experimentId}/heatmap`,
  reportMab: (experimentId: EntityId) => `/api/abtest/reports/${experimentId}/mab`,
  reportExportTasks: (experimentId: EntityId) => `/api/abtest/reports/${experimentId}/export-tasks`,
  reportExportTaskCancel: (taskId: EntityId) => `/api/abtest/report-export-tasks/${taskId}/cancel`,
  reportExportTaskRetry: (taskId: EntityId) => `/api/abtest/report-export-tasks/${taskId}/retry`,
  sensitiveInsightTasks: (experimentId?: EntityId) =>
    experimentId ? `/api/abtest/insight-tasks?experimentId=${experimentId}` : '/api/abtest/insight-tasks',
  featureFlags: '/api/feature-flags',
  featureFlag: (featureId: EntityId) => `/api/feature-flags/${featureId}`,
  featureVersions: (featureId: EntityId) => `/api/feature-flags/${featureId}/versions`,
  featureVersionPublish: (featureId: EntityId, versionId: EntityId) =>
    `/api/feature-flags/${featureId}/versions/${versionId}/publish`,
  featureVersionRollback: (featureId: EntityId, versionId: EntityId) =>
    `/api/feature-flags/${featureId}/versions/${versionId}/rollback`,
  featureRollback: (featureId: EntityId) => `/api/feature-flags/${featureId}/rollback`,
  featureDisable: (featureId: EntityId) => `/api/feature-flags/${featureId}/disable`,
  featureEnable: (featureId: EntityId) => `/api/feature-flags/${featureId}/enable`,
  featurePermission: (featureId: EntityId) => `/api/feature-flags/${featureId}/permission`,
  featureLifecycle: (featureId: EntityId) => `/api/feature-flags/${featureId}/lifecycle`,
  featurePublishHistory: '/api/feature-flags/publish-history',
  featurePublishPlans: '/api/feature-flags/publish-plans',
  featureWhitelists: (featureId: EntityId) => `/api/feature-flags/${featureId}/whitelists`,
  featureWhitelistTests: '/api/feature-flags/whitelist-tests',
  featureWhitelistTestsByFeature: (featureId: EntityId) => `/api/feature-flags/${featureId}/whitelist-tests`,
  featureSolidify: '/api/feature-flags/solidify-from-experiment',
  featureDecision: '/api/feature-flags/runtime/decision',
} as const

export const getAbBackendIntegrationStatus = (): Promise<BackendIntegrationStatus> => {
  const mode = import.meta.env.VITE_ABTEST_API_MODE === 'api' ? 'api' : 'mock'
  const baseUrl = import.meta.env.VITE_ABTEST_API_BASE ?? ''
  return resolveMock({
    mode,
    persistence: mode === 'api' ? 'backend' : 'localStorage',
    baseUrl: baseUrl || '未配置，当前使用前端 Mock',
    permissionGuard: mode === 'api' ? 'backend' : 'mock',
    operationLogStore: mode === 'api' ? 'backend' : 'localStorage',
    capabilities: [
      {
        id: 'real_api_contract',
        label: '真实 API 契约',
        status: 'api_contract',
        apiPath: abTestingApiPaths.experimentSubmitDebug,
        note: '实验提交、校验、流量层、互斥域、调平和平滑任务路径已固定，当前未切到真实服务。',
      },
      {
        id: 'permission_check',
        label: '权限校验',
        status: mode === 'api' ? 'ready' : 'backend_required',
        apiPath: abTestingApiPaths.operationLogs,
        note: '前端展示权限审计，最终鉴权需由后端按资源和角色兜底。',
      },
      {
        id: 'async_task',
        label: '异步任务状态',
        status: mode === 'api' ? 'ready' : 'mocked',
        apiPath: abTestingApiPaths.smoothTask('taskId'),
        note: '前端以任务状态为准刷新 UI；Mock 使用内存与 localStorage 模拟轮询。',
      },
      {
        id: 'sdk_diversion',
        label: 'SDK / 分流服务',
        status: 'backend_required',
        apiPath: abTestingApiPaths.runtimeDecision,
        note: 'Runtime 决策、曝光去重、分流 ID 稳定性需要真实 SDK 或分流 Agent 接入。',
      },
      {
        id: 'audience_traffic_compute',
        label: '受众预估与真实流量计算',
        status: 'backend_required',
        apiPath: abTestingApiPaths.audienceEstimate,
        note: '当前用公式与 Mock 数据估算，真实口径需要数仓/画像服务返回。',
      },
      {
        id: 'diagnosis_query',
        label: '命中查询与诊断接口',
        status: mode === 'api' ? 'ready' : 'api_contract',
        apiPath: `${abTestingApiPaths.hitQuery} / ${abTestingApiPaths.hitDiagnosis}`,
        note: 'PRD 第 35 章用户命中查询、命中诊断、模板、下载接口已进入契约；Mock 仍使用本地规则生成结果。',
      },
      {
        id: 'dedup_tasks',
        label: '数据查重任务接口',
        status: mode === 'api' ? 'ready' : 'api_contract',
        apiPath: abTestingApiPaths.dataDedupTasks,
        note: '支持创建任务、每日运行、手动运行和下载结果，真实去重需日志明细服务接入。',
      },
      {
        id: 'experiment_boards',
        label: '实验看板接口',
        status: mode === 'api' ? 'ready' : 'api_contract',
        apiPath: abTestingApiPaths.experimentBoards,
        note: '看板 CRUD、组件、授权、复制链接和 diff 计算路径已固定，真实图表数据需后端聚合服务。',
      },
    ],
    requiredBackends: [
      '实验 CRUD 与提交调试 API',
      '权限校验与操作日志持久化',
      '调平/平滑异步任务队列',
      'SDK 或分流服务 Runtime 决策',
      '受众预估与真实流量计算服务',
      '命中查询/诊断与下载服务',
      '数据查重任务与日志明细服务',
      '实验看板聚合与分享授权服务',
    ],
  })
}

export const getAbWorkspaceSummary = () =>
  resolveMock({
    totalExperiments: abExperiments.length,
    runningExperiments: abExperiments.filter((item) => item.status === 'RUNNING').length,
    debuggingExperiments: abExperiments.filter((item) => item.status === 'DEBUGGING').length,
    featureFlags: abFeatureFlags.length,
    activeMetricGroups: abMetricGroups.filter((item) => item.status === 'active').length,
    enabledAlarms: abAlarmTasks.filter((item) => item.enabled).length,
    coverage: abCoverageMatrix,
  })

export const getAbExperiments = (filters?: {
  keyword?: string
  statuses?: AbExperimentStatus[]
  type?: string
}): Promise<Experiment[]> => {
  const keyword = filters?.keyword?.trim().toLowerCase()
  return resolveMock(
    abExperiments.filter((experiment) => {
      const keywordMatched =
        !keyword ||
        experiment.name.toLowerCase().includes(keyword) ||
        experiment.id.toLowerCase().includes(keyword) ||
        experiment.owner.name.toLowerCase().includes(keyword)
      const statusMatched = !filters?.statuses?.length || filters.statuses.includes(experiment.status)
      const typeMatched = !filters?.type || experiment.type === filters.type
      return keywordMatched && statusMatched && typeMatched
    }),
  )
}

export const getAbExperiment = (experimentId: EntityId): Promise<Experiment | undefined> =>
  resolveMock(findExperiment(experimentId))

export const getAbExperimentVariants = (experimentId: EntityId) =>
  resolveMock(abExperimentVariants.filter((variant) => variant.experimentId === experimentId))

export const getAbExperimentParamSchemas = (experimentId: EntityId) =>
  resolveMock(abParamSchemas.filter((schema) => schema.experimentId === experimentId))

export const getAbExperimentPlanningBundle = (experimentId: EntityId) =>
  resolveMock({
    experiment: findExperiment(experimentId),
    variants: abExperimentVariants.filter((variant) => variant.experimentId === experimentId),
    paramSchemas: abParamSchemas.filter((schema) => schema.experimentId === experimentId),
    diversionConfig: abDiversionConfigs.find((config) => config.experimentId === experimentId),
    trafficConfig: abTrafficConfigs.find((config) => config.experimentId === experimentId),
    uniformConfig: abUniformDiversionConfigs.find((config) => config.experimentId === experimentId),
    smoothTask: abSmoothEffectTasks.find((task) => task.experimentId === experimentId),
  })

export const validateAbExperimentDraft = (
  draft: ExperimentDraft | Partial<Experiment>,
): Promise<ExperimentDraftValidationResult> => {
  const richDraft = 'variants' in draft && Array.isArray(draft.variants) ? draft : null
  const duplicateName = Boolean(
    draft.name?.trim() &&
      abExperiments.some(
        (experiment) =>
          ['RUNNING', 'DEBUGGING'].includes(experiment.status) && experiment.name.trim() === draft.name?.trim(),
      ),
  )
  const items: ExperimentDraftValidationResult['items'] = [
    {
      level: draft.type ? 'PASS' : 'ERROR',
      code: 'EXPERIMENT_TYPE_REQUIRED',
      message: draft.type ? '实验类型已选择' : '请选择实验类型',
      step: 1,
    },
    {
      level: draft.name?.trim() && draft.name.length <= 100 && !duplicateName ? 'PASS' : 'ERROR',
      code: 'EXPERIMENT_NAME_REQUIRED',
      message: duplicateName
        ? '同一应用下运行中或调试中实验名称不可重复'
        : draft.name?.trim() && draft.name.length <= 100
          ? '实验名称已填写'
          : '请输入 1-100 字实验名称',
      step: 2,
    },
    {
      level: (draft.description?.length ?? 0) <= 1000 ? 'PASS' : 'ERROR',
      code: 'EXPERIMENT_DESCRIPTION_LENGTH',
      message: (draft.description?.length ?? 0) <= 1000 ? '实验描述长度合法' : '实验描述最多 1000 字',
      step: 2,
    },
    {
      level: isGoalDetailed(draft.goal) ? 'PASS' : 'ERROR',
      code: 'GOAL_TOO_SIMPLE',
      message: isGoalDetailed(draft.goal) ? '实验目标完整' : '实验目标需说明策略、用户、指标和预期提升',
      step: 2,
    },
  ]

  if (richDraft) {
    const variantTraffic = richDraft.variants.map((variant) => variant.trafficRatio)
    const variantTrafficValidation = validateTrafficRatios(variantTraffic)
    const paramKeys = richDraft.paramSchemas.map((schema) => schema.key.trim()).filter(Boolean)
    const paramKeySet = new Set(paramKeys)
    const variantNames = richDraft.variants.map((variant) => variant.name.trim()).filter(Boolean)
    const invalidParamKey = richDraft.paramSchemas.find((schema) => schema.key.trim() && !paramKeyPattern.test(schema.key.trim()))
    const layer = abTrafficLayers.find((item) => item.id === richDraft.trafficConfig.trafficLayerId)
    const mutexDomain = abMutexDomainGroups
      .flatMap((group) => group.domains)
      .find((domain) => domain.id === richDraft.trafficConfig.mutexDomainId)
    const missingParamBinding = richDraft.paramSchemas.some((schema) =>
      richDraft.variants.some((variant) => schema.required && variant.params[schema.key] === undefined),
    )
    const invalidParamValue = richDraft.paramSchemas.flatMap((schema) =>
      richDraft.variants
        .map((variant) => ({
          schema,
          variant,
          result: validateExperimentParamValue(schema.type, variant.params[schema.key], schema.required),
        }))
        .filter((item) => !item.result.valid),
    )[0]
    const invalidAudienceCondition = richDraft.diversionConfig.filter.groups
      .flatMap((group) => group.conditions)
      .find((condition) => {
        const operatorNeedsValue = !['is_null', 'is_not_null'].includes(condition.operator)
        const emptyArray = Array.isArray(condition.value) && condition.value.length === 0
        return !condition.field.trim() || (operatorNeedsValue && (condition.value === undefined || condition.value === '' || emptyArray))
      })
    const smoothValid =
      richDraft.trafficConfig.effectiveMode === 'IMMEDIATE' ||
      ((richDraft.trafficConfig.smoothDurationMinutes ?? 0) >= 1 &&
        (richDraft.trafficConfig.smoothDurationMinutes ?? 0) <= 1440)
    const uniformReady =
      !richDraft.trafficConfig.uniformDiversionEnabled || richDraft.trafficConfig.uniformStatus === 'SUCCESS'
    const metricComparisonCount = Math.max(1, richDraft.metricIds.length) * Math.max(1, richDraft.variants.length - 1)
    const needsMultipleComparisonCorrection = metricComparisonCount > 1
    const hasMultipleComparisonCorrection = richDraft.trafficConfig.multiComparisonCorrection === true
    const mdeValue = richDraft.trafficConfig.planningMdeValue
    const mdeTooSmall = typeof mdeValue === 'number' && mdeValue < 0.02
    const recommendedTrafficRatio = richDraft.trafficConfig.planningRecommendedTrafficRatio
    const configuredTrafficRatio = richDraft.trafficConfig.experimentTrafficRatio / 100
    const estimatedReachableUsers =
      (richDraft.trafficConfig.planningEstimatedUsers ?? 0) *
      (richDraft.trafficConfig.planningTrafficFilterRatio ?? 1) *
      configuredTrafficRatio
    const estimatedTrafficInsufficient =
      typeof recommendedTrafficRatio === 'number'
        ? configuredTrafficRatio + 0.0001 < recommendedTrafficRatio
        : estimatedReachableUsers > 0 && estimatedReachableUsers < richDraft.variants.length * 5000
    const decisionIdField = richDraft.diversionConfig.decisionIdField.trim().toLowerCase()
    const stableDecisionId =
      richDraft.diversionConfig.decisionIdType !== 'custom' &&
      ['uid', 'user_id', 'device_id', 'did', 'uuid'].includes(decisionIdField) &&
      !/(session|request|trace|time|timestamp|random)/i.test(decisionIdField)
    const smoothDuration = richDraft.trafficConfig.smoothDurationMinutes ?? 0
    const smoothDurationSuggestionPass =
      richDraft.trafficConfig.effectiveMode === 'IMMEDIATE' || (smoothDuration >= 10 && smoothDuration <= 720)
    const coreMetric = richDraft.coreMetricId ? abMetrics.find((metric) => metric.id === richDraft.coreMetricId) : undefined
    const focusMetrics = (richDraft.focusMetricIds ?? [])
      .map((metricId) => abMetrics.find((metric) => metric.id === metricId))
      .filter((metric): metric is Metric => Boolean(metric))
    const allDraftMetrics = [...(coreMetric ? [coreMetric] : []), ...focusMetrics]
    const hasOfflineDraftMetric =
      allDraftMetrics.some((metric) => metric.status !== 'active') ||
      (richDraft.focusMetricIds ?? []).some((metricId) => !abMetrics.some((metric) => metric.id === metricId && metric.status === 'active')) ||
      (richDraft.coreMetricId ? !coreMetric || coreMetric.status !== 'active' : false)
    const focusFunnelCount = focusMetrics.filter((metric) => metric.metricCategory === 'funnel').length

    items.push(
      {
        level: richDraft.tags.length <= 20 ? 'PASS' : 'ERROR',
        code: 'EXPERIMENT_TAG_LIMIT',
        message: richDraft.tags.length <= 20 ? '实验标签数量合法' : '单个实验最多 20 个标签',
        step: 2,
      },
      {
        level: richDraft.durationDays >= 7 ? 'PASS' : 'WARN',
        code: 'EXPERIMENT_DURATION_SHORT',
        message:
          richDraft.durationDays >= 7
            ? '实验时长满足完整周期建议'
            : '实验周期过短，可能无法覆盖完整工作日与周末周期',
        step: 2,
      },
      {
        level: richDraft.variants.length >= 2 && richDraft.variants.length <= 20 ? 'PASS' : 'ERROR',
        code: 'VARIANT_COUNT',
        message:
          richDraft.variants.length >= 2 && richDraft.variants.length <= 20
            ? '至少包含 2 个实验版本'
            : '普通实验至少 2 个版本，最多 20 个版本',
        step: 3,
      },
      {
        level: variantNames.length === richDraft.variants.length && new Set(variantNames).size === variantNames.length ? 'PASS' : 'ERROR',
        code: 'VARIANT_NAME_UNIQUE',
        message:
          variantNames.length === richDraft.variants.length && new Set(variantNames).size === variantNames.length
            ? '版本名称唯一'
            : '版本名称不能为空，且同一实验内不可重复',
        step: 3,
      },
      {
        level: richDraft.variants.filter((variant) => variant.isControl).length === 1 ? 'PASS' : 'ERROR',
        code: 'CONTROL_VARIANT',
        message:
          richDraft.variants.filter((variant) => variant.isControl).length === 1
            ? '对照组唯一'
            : '必须且只能有一个对照组',
        step: 3,
      },
      {
        level: variantTrafficValidation.valid ? 'PASS' : 'ERROR',
        code: 'VARIANT_TRAFFIC_RATIO',
        message: variantTrafficValidation.valid
          ? '版本流量比例合计 100%'
          : variantTrafficValidation.message ?? '版本流量比例不合法',
        step: 3,
      },
      {
        level:
          paramKeys.length === richDraft.paramSchemas.length &&
          paramKeySet.size === paramKeys.length &&
          !invalidParamKey
            ? 'PASS'
            : 'ERROR',
        code: 'PARAM_SCHEMA_KEY',
        message: invalidParamKey
          ? '参数 Key 只能包含字母、数字、下划线，且不能以数字开头'
          : paramKeys.length === richDraft.paramSchemas.length && paramKeySet.size === paramKeys.length
            ? '参数 Key 唯一且完整'
            : '参数 Key 不能为空且不能重复',
        step: 3,
      },
      {
        level: missingParamBinding ? 'ERROR' : 'PASS',
        code: 'PARAM_BINDING',
        message: missingParamBinding ? '必填参数需要在每个版本中配置值' : '版本参数绑定完整',
        step: 3,
      },
      {
        level: invalidParamValue ? 'ERROR' : 'PASS',
        code: 'PARAM_VALUE_TYPE',
        message: invalidParamValue
          ? `${invalidParamValue.variant.name} / ${invalidParamValue.schema.name}: ${invalidParamValue.result.message}`
          : '版本参数值类型合法',
        step: 3,
      },
      {
        level: richDraft.diversionConfig.decisionIdField.trim() ? 'PASS' : 'ERROR',
        code: 'DECISION_ID_REQUIRED',
        message: richDraft.diversionConfig.decisionIdField.trim() ? '分流 ID 已配置' : '请配置分流 ID 字段',
        step: 4,
      },
      {
        level: richDraft.diversionConfig.filter.groups.length > 0 ? 'PASS' : 'WARN',
        code: 'AUDIENCE_FILTER',
        message: richDraft.diversionConfig.filter.groups.length > 0 ? '受众条件已配置' : '未配置受众条件，将命中全量用户',
        step: 4,
      },
      {
        level:
          richDraft.diversionConfig.filter.groups.length > 0 &&
          richDraft.diversionConfig.filter.groups.every((group) => group.conditions.length > 0) &&
          !invalidAudienceCondition
            ? 'PASS'
            : 'ERROR',
        code: 'AUDIENCE_RULES',
        message:
          richDraft.diversionConfig.filter.groups.length > 0 &&
          richDraft.diversionConfig.filter.groups.every((group) => group.conditions.length > 0) &&
          !invalidAudienceCondition
            ? '受众 AND/OR 条件合法'
            : '请至少配置一个完整受众条件组',
        step: 4,
      },
      {
        level:
          richDraft.trafficConfig.experimentTrafficRatio >= 0.01 &&
          richDraft.trafficConfig.experimentTrafficRatio <= 100
            ? 'PASS'
            : 'ERROR',
        code: 'EXPERIMENT_TRAFFIC_RANGE',
        message:
          richDraft.trafficConfig.experimentTrafficRatio >= 0.01 &&
          richDraft.trafficConfig.experimentTrafficRatio <= 100
            ? '实验流量范围合法'
            : '实验流量必须在 0.01%-100% 之间',
        step: 5,
      },
      {
        level: richDraft.trafficConfig.trafficLayerId ? 'PASS' : 'ERROR',
        code: 'TRAFFIC_LAYER_REQUIRED',
        message: richDraft.trafficConfig.trafficLayerId ? `已选择流量层：${layer?.name ?? richDraft.trafficConfig.trafficLayerId}` : '请选择流量层',
        step: 5,
      },
      {
        level:
          !layer || richDraft.trafficConfig.experimentTrafficRatio <= layer.availableTrafficRatio ? 'PASS' : 'ERROR',
        code: 'TRAFFIC_LAYER_CAPACITY',
        message:
          !layer || richDraft.trafficConfig.experimentTrafficRatio <= layer.availableTrafficRatio
            ? '实验流量未超过流量层可用比例'
            : '实验流量超过当前流量层可用比例',
        step: 5,
      },
      {
        level:
          !richDraft.trafficConfig.useMutex ||
          (richDraft.trafficConfig.mutexDomainId && (!mutexDomain || mutexDomain.runningExperimentIds.length === 0))
            ? 'PASS'
            : 'ERROR',
        code: 'MUTEX_DOMAIN_AVAILABLE',
        message:
          !richDraft.trafficConfig.useMutex ||
          (richDraft.trafficConfig.mutexDomainId && (!mutexDomain || mutexDomain.runningExperimentIds.length === 0))
            ? '互斥域可用'
            : `该互斥域已有 ${mutexDomain?.runningExperimentIds.length ?? 0} 个运行中实验，不允许强制加入`,
        step: 5,
      },
      {
        level: smoothValid ? 'PASS' : 'ERROR',
        code: 'SMOOTH_DURATION',
        message: smoothValid ? '平滑生效时间合法' : '平滑生效时间必须在 1-1440 分钟之间',
        step: 5,
      },
      {
        level: uniformReady ? 'PASS' : 'ERROR',
        code: 'UNIFORM_DIVERSION_READY',
        message: uniformReady ? '增强分流均匀性状态满足提交要求' : '开启增强分流均匀性后，需先调平成功',
        step: 5,
      },
      {
        level: richDraft.metricIds.length > 0 && Boolean(richDraft.coreMetricId) ? 'PASS' : 'ERROR',
        code: 'METRIC_SNAPSHOT',
        message:
          richDraft.metricIds.length > 0 && richDraft.coreMetricId
            ? '已绑定核心指标和关注指标快照'
            : '请至少选择一个核心指标，并可配置多个关注指标',
        step: 6,
      },
      {
        level: coreMetric && coreMetric.status === 'active' && coreMetric.metricCategory !== 'funnel' ? 'PASS' : 'ERROR',
        code: 'CORE_METRIC_RULE',
        message:
          coreMetric && coreMetric.status === 'active' && coreMetric.metricCategory !== 'funnel'
            ? `核心指标已配置：${coreMetric.name}`
            : '核心指标必须选择一个使用中的非漏斗指标',
        step: 6,
      },
      {
        level: focusFunnelCount <= 1 ? 'PASS' : 'ERROR',
        code: 'FOCUS_FUNNEL_LIMIT',
        message: focusFunnelCount <= 1 ? '关注指标中漏斗指标数量合法' : '关注指标最多选择一个漏斗指标',
        step: 6,
      },
      {
        level: hasOfflineDraftMetric ? 'ERROR' : 'PASS',
        code: 'METRIC_STATUS_ACTIVE',
        message: hasOfflineDraftMetric ? '已下线或不存在的指标不可用于发布' : '已选指标均为使用中状态',
        step: 6,
      },
      {
        level: !needsMultipleComparisonCorrection || hasMultipleComparisonCorrection ? 'PASS' : 'WARN',
        code: 'MULTIPLE_COMPARISON_CORRECTION',
        message:
          !needsMultipleComparisonCorrection || hasMultipleComparisonCorrection
            ? '多重比较校正已确认'
            : `当前有 ${metricComparisonCount} 个指标/版本比较，建议启用多重比较校正`,
        step: 6,
      },
      {
        level: mdeTooSmall ? 'WARN' : 'PASS',
        code: 'MDE_TOO_SMALL',
        message: mdeTooSmall
          ? `当前 MDE ${Math.round((mdeValue ?? 0) * 10000) / 100}% 偏小，建议提高 MDE、延长周期或扩大受众`
          : 'MDE 阈值处于可评估范围',
        step: 6,
      },
      {
        level: estimatedTrafficInsufficient ? 'WARN' : 'PASS',
        code: 'TRAFFIC_ESTIMATE_SUFFICIENT',
        message: estimatedTrafficInsufficient
          ? '预计流量低于样本量建议，建议提高流量、延长实验周期或减少版本数'
          : '预计流量满足当前样本量建议',
        step: 6,
      },
      {
        level: stableDecisionId ? 'PASS' : 'WARN',
        code: 'DECISION_ID_STABILITY',
        message: stableDecisionId
          ? '分流 ID 稳定性满足要求'
          : '分流 ID 建议使用 uid、did、device_id 等稳定字段，避免会话级或随机字段',
        step: 6,
      },
      {
        level: smoothDurationSuggestionPass ? 'PASS' : 'WARN',
        code: 'SMOOTH_DURATION_SUGGESTION',
        message: smoothDurationSuggestionPass
          ? '平滑生效时间建议已满足'
          : '平滑时间建议控制在 10-720 分钟，过短易抖动，过长会拖慢调试节奏',
        step: 6,
      },
    )

    if (richDraft.type === 'SPLIT_URL') {
      const urls = richDraft.variants.map((variant) => richDraft.specialConfig.splitUrl.urls[variant.tempId]?.trim() ?? '')
      const valid = urls.every(Boolean) && urls.every((url) => /^https?:\/\//.test(url)) && new Set(urls).size === urls.length
      const rulesValid =
        richDraft.specialConfig.splitUrl.matchMode === 'SIMPLE' ||
        richDraft.variants.every((variant) => {
          const rule = richDraft.specialConfig.splitUrl.rules[variant.tempId]
          return rule?.pattern?.trim() && rule.matchType
        })
      items.push({
        level: valid && rulesValid ? 'PASS' : 'ERROR',
        code: 'SPLIT_URL_CONFIG',
        message:
          valid && rulesValid
            ? '多链接版本 URL 与匹配规则已配置'
            : '多链接实验每个版本 URL 必填且不可重复，精准匹配模式需配置每个版本的匹配规则',
        step: 3,
      })
    }
    if (richDraft.type === 'PUSH') {
      const push = richDraft.specialConfig.push
      const missingVariantCopy = richDraft.variants.some(
        (variant) => !push.titles[variant.tempId]?.trim() || !push.contents[variant.tempId]?.trim(),
      )
      const valid = Boolean(
        push.channel &&
          push.touchRange &&
          push.frequencyCapPerUser > 0 &&
          push.rehearsalChecked &&
          push.approvalStatus === 'APPROVED' &&
          (push.sendMode === 'TRIGGER' ? push.triggerCondition : push.sendTime) &&
          !missingVariantCopy,
      )
      items.push({
        level: valid ? 'PASS' : 'ERROR',
        code: 'PUSH_CONFIG',
        message: valid ? '推送配置、频控、演练和审核均已完成' : '推送实验需配置通道、触达范围、频控、发送规则、版本内容，并完成演练和审核',
        step: 3,
      })
    }
    if (richDraft.type === 'MVT') {
      const elements = richDraft.specialConfig.mvt.elements
      const valid =
        elements.length >= 2 &&
        elements.every((element) => element.name.trim() && element.variants.length >= 2) &&
        Boolean(richDraft.specialConfig.mvt.primaryElementId)
      const combinationCount = elements.reduce((total, element) => total * Math.max(element.variants.length, 1), 1)
      items.push({
        level: valid ? 'PASS' : 'ERROR',
        code: 'MVT_CONFIG',
        message: valid ? 'MVT 元素、主元素和变体数量合法' : 'MVT 至少配置 2 个实验元素、主元素，且每个元素至少 2 个变体',
        step: 3,
      })
      if (valid && combinationCount > 12) {
        items.push({
          level: 'WARN',
          code: 'MVT_SAMPLE_RISK',
          message: `MVT 将生成 ${combinationCount} 个组合版本，请确认样本量充足`,
          step: 3,
        })
      }
    }
    if (richDraft.type === 'MAB') {
      const mab = richDraft.specialConfig.mab
      const mabValid =
        Boolean(mab.optimizationMetricId) &&
        mab.explorationTrafficRatio > 0 &&
        mab.rewardWindowHours > 0 &&
        mab.minSamplePerArm > 0
      items.push({
        level: mabValid ? 'PASS' : 'ERROR',
        code: 'MAB_CONFIG',
        message: mabValid ? 'MAB 算法、优化指标、奖励窗口和最小样本已配置' : 'MAB 实验必须配置算法、唯一优化指标、探索流量、奖励窗口和最小样本',
        step: 3,
      })
    }
    if (['PERSONALIZATION_WEB', 'PERSONALIZATION_CODE'].includes(richDraft.type)) {
      const audiences = richDraft.specialConfig.personalization.audiences
      const priorities = audiences.map((audience) => audience.priority)
      const valid =
        audiences.length > 0 &&
        audiences.every((audience) => audience.name.trim() && audience.rule.trim() && audience.variantTempId && audience.holdoutRatio >= 0) &&
        new Set(priorities).size === priorities.length
      items.push({
        level: valid ? 'PASS' : 'ERROR',
        code: 'PERSONALIZATION_CONFIG',
        message: valid ? '个性化人群、策略版本、保留组和优先级已配置' : '个性化实验需配置人群规则、绑定版本、保留组并保证优先级唯一',
        step: 3,
      })
    }
    if (richDraft.type === 'PARENT_CHILD') {
      const parentChild = richDraft.specialConfig.parentChild
      items.push({
        level:
          parentChild.parentExperimentId &&
          parentChild.parentVariantId &&
          parentChild.childTrafficRatio > 0 &&
          parentChild.trafficInheritanceMode
            ? 'PASS'
            : 'ERROR',
        code: 'PARENT_CHILD_CONFIG',
        message: parentChild.parentExperimentId && parentChild.parentVariantId ? '父实验、父版本和子实验流量已配置' : '父子实验需选择运行中的父实验及父实验版本',
        step: 3,
      })
    }
    if (richDraft.type === 'REVERSE') {
      const reverse = richDraft.specialConfig.reverse
      items.push({
        level:
          reverse.sourceExperimentId &&
          reverse.sourceControlVariantId &&
          reverse.suggestedTrafficRatio > 0 &&
          reverse.observationDays > 0
            ? 'PASS'
            : 'ERROR',
        code: 'REVERSE_CONFIG',
        message: reverse.sourceExperimentId && reverse.sourceControlVariantId ? '反转实验来源和候选对照流量已配置' : '反转实验需关联原实验和原对照组',
        step: 3,
      })
    }
    if (richDraft.type === 'AD') {
      const ad = richDraft.specialConfig.ad
      const selectedAccount = ad.accounts.find((account) => account.id === ad.accountId)
      const adValid =
        Boolean(ad.accountId && ad.projectId && ad.authorizationChecked) &&
        selectedAccount?.status === 'AUTHORIZED' &&
        ad.assets.length > 0 &&
        ad.assets.every((asset) => asset.reviewStatus === 'APPROVED') &&
        ad.deliveryConfig.dailyBudget > 0 &&
        Boolean(ad.deliveryConfig.startAt && ad.deliveryConfig.endAt) &&
        ad.reviewSchedule.auditStatus === 'APPROVED'
      items.push({
        level: adValid ? 'PASS' : 'ERROR',
        code: 'AD_CONFIG',
        message: adValid ? '广告账户、资产、投放配置、审核和排期已完成' : '广告实验需绑定已授权账户、项目、审核通过资产、投放配置和审核排期',
        step: 3,
      })
    }
    if (richDraft.type === 'VISUAL') {
      const visual = richDraft.specialConfig.visual
      const visualValid =
        /^https?:\/\//.test(visual.pageUrl) &&
        visual.extensionDetected &&
        visual.editorStatus === 'CONFIGURED' &&
        visual.elements.length > 0 &&
        visual.elements.every((element) => element.selector.trim() && element.newValue.trim())
      items.push({
        level: visualValid ? 'PASS' : 'ERROR',
        code: 'VISUAL_CONFIG',
        message: visualValid ? '可视化编辑器、扩展检测、元素编辑和热力图配置完整' : '可视化实验需配置页面 URL、扩展检测、编辑器状态和至少一个可编辑元素',
        step: 3,
      })
    }

    for (const schema of richDraft.paramSchemas) {
      const values = richDraft.variants.map((variant) => variant.params[schema.key])
      if (hasHardcodedGroupParam(schema.key, values)) {
        items.push({
          level: 'WARN',
          code: `PARAM_HARDCODE_${schema.tempId}`,
          message: `${schema.key} 可能按实验组编号设计，建议改为功能控制项`,
          step: 3,
        })
      }
    }
  } else {
    items.push({
      level: 'WARN',
      code: 'MDE_REVIEW',
      message: '建议在提交前确认 MDE 与业务 ROI 匹配',
      step: 6,
    })
  }

  return resolveMock({
    passed: !items.some((item) => item.level === 'ERROR'),
    items,
  })
}

function metricFlexibleValues(metric: Metric): MetricBindingSnapshot['flexibleValues'] {
  const definition = metric.definition
  const flexibleProperties =
    'flexibleProperties' in definition ? definition.flexibleProperties : []
  return flexibleProperties.map((property) => ({
    propertyId: property.propertyId,
    propertyName: property.propertyName,
    scope: property.scope,
    operator: property.defaultOperator,
    value: property.defaultValue,
    source: 'metric_default' as const,
  }))
}

function createMetricBindingSnapshotsForExperiment(experiment: Experiment, capturedAt: string) {
  return experiment.metricIds
    .map((metricId) => abMetrics.find((metric) => metric.id === metricId))
    .filter((metric): metric is Metric => Boolean(metric))
    .map((metric, index): MetricBindingSnapshot => {
      const group = abMetricGroups.find((item) => item.id === metric.metricGroupId)
      return {
        id: createId('metric_snapshot'),
        experimentId: experiment.id,
        metricId: metric.id,
        metricGroupId: metric.metricGroupId,
        metricName: metric.name,
        metricGroupName: group?.name ?? metric.metricGroupId,
        metricRole: metric.id === experiment.coreMetricId ? 'core' : 'focus',
        metricCategory: metric.metricCategory,
        definition: JSON.parse(JSON.stringify(metric.definition)) as Metric['definition'],
        numberFormat: { ...metric.numberFormat },
        flexibleValues: metricFlexibleValues(metric),
        statusAtBinding: metric.status,
        snapshotVersion:
          abMetricBindingSnapshots.filter((snapshot) => snapshot.metricId === metric.id).length + index + 1,
        source: 'experiment_create',
        capturedAt,
      }
    })
}

export const submitAbExperimentForDebug = async (
  draft: ExperimentDraft,
): Promise<{ experiment?: Experiment; validation: ExperimentDraftValidationResult; message: string }> => {
  const validation = await validateAbExperimentDraft(draft)
  if (!validation.passed) {
    return resolveMock({ validation, message: '提交失败，请先处理检查项' })
  }

  const experimentId = createId('exp')
  const createdAt = nowIso()
  const variantIdMap = new Map(draft.variants.map((variant) => [variant.tempId, createId('var')]))
  const experiment: Experiment = {
    id: experimentId,
    appId: draft.appId,
    name: draft.name,
    description: draft.description,
    type: draft.type,
    status: 'DEBUGGING',
    ownerId: draft.ownerId,
    owner: resolveMember(draft.ownerId),
    collaboratorIds: draft.collaboratorIds,
    visibility: draft.visibility,
    businessLineId: draft.businessLineId,
    goal: draft.goal,
    riskNote: draft.riskNote,
    tags: draft.tags,
    durationDays: draft.durationDays,
    trafficRatio: draft.trafficConfig.experimentTrafficRatio,
    coreMetricId: draft.coreMetricId,
    focusMetricIds: draft.focusMetricIds,
    metricIds: draft.metricIds,
    featureIds: draft.featureIds,
    createdAt,
    updatedAt: createdAt,
  }

  const variants: ExperimentVariant[] = draft.variants.map((variant) => ({
    id: variantIdMap.get(variant.tempId) ?? createId('var'),
    experimentId,
    name: variant.name,
    description: variant.description,
    isControl: variant.isControl,
    status: 'ACTIVE',
    trafficRatio: variant.trafficRatio,
    params: variant.params,
    testUserIds: variant.testUserIds,
    createdAt,
    updatedAt: createdAt,
  }))

  const paramSchemas: ExperimentParamSchema[] = draft.paramSchemas.map((schema) => ({
    id: createId('param'),
    experimentId,
    key: schema.key,
    name: schema.name,
    type: schema.type,
    required: schema.required,
    defaultValue: schema.defaultValue,
    description: schema.description,
  }))

  const diversionConfig: DiversionConfig = {
    experimentId,
    ...draft.diversionConfig,
  }

  const trafficConfig: ExperimentTrafficConfig = {
    experimentId,
    useMutex: draft.trafficConfig.useMutex,
    trafficLayerId: draft.trafficConfig.trafficLayerId,
    mutexDomainId: draft.trafficConfig.mutexDomainId,
    experimentTrafficRatio: draft.trafficConfig.experimentTrafficRatio,
    variantTrafficRatios: Object.fromEntries(
      draft.variants.map((variant) => [variantIdMap.get(variant.tempId) ?? variant.tempId, variant.trafficRatio]),
    ),
    effectiveMode: draft.trafficConfig.effectiveMode,
    smoothDurationMinutes: draft.trafficConfig.smoothDurationMinutes,
    experienceConsistencyEnabled: draft.trafficConfig.experienceConsistencyEnabled,
  }

  const uniformConfig: UniformDiversionConfig = {
    experimentId,
    enabled: draft.trafficConfig.uniformDiversionEnabled,
    mode: draft.trafficConfig.uniformDiversionMode,
    metricIds: draft.trafficConfig.uniformDiversionMode === 'METRIC' ? draft.trafficConfig.uniformMetricIds : undefined,
    segmentIds: draft.trafficConfig.uniformDiversionMode === 'SEGMENT' ? draft.trafficConfig.uniformSegmentIds : undefined,
    dateRange: draft.trafficConfig.uniformDateRange,
    maxRunTimes: draft.trafficConfig.uniformMaxRunTimes,
    pValueThreshold: draft.trafficConfig.uniformPValueThreshold,
    status: draft.trafficConfig.uniformDiversionEnabled ? draft.trafficConfig.uniformStatus : 'CANCELED',
    taskId: draft.trafficConfig.uniformTaskId,
  }

  const smoothTask: SmoothEffectTask | null =
    draft.trafficConfig.effectiveMode === 'SMOOTH'
      ? {
          id: createId('smooth'),
          experimentId,
          action: 'START',
          startTrafficRatio: 0,
          targetTrafficRatio: draft.trafficConfig.experimentTrafficRatio,
          currentTrafficRatio: 0,
          durationMinutes: draft.trafficConfig.smoothDurationMinutes ?? 120,
          startedAt: createdAt,
          expectedFinishedAt: new Date(
            new Date(createdAt).getTime() + (draft.trafficConfig.smoothDurationMinutes ?? 120) * 60000,
          ).toISOString(),
          status: 'RUNNING',
        }
      : null

  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'EXPERIMENT',
    objectId: experimentId,
    action: 'submit_debug',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before: { status: 'DRAFT' },
    after: { status: 'DEBUGGING', source: 'create_wizard' },
    createdAt,
  }
  const metricSnapshots = createMetricBindingSnapshotsForExperiment(experiment, createdAt)

  abExperiments.unshift(experiment)
  abExperimentVariants.push(...variants)
  abParamSchemas.push(...paramSchemas)
  abDiversionConfigs.push(diversionConfig)
  abTrafficConfigs.push(trafficConfig)
  abUniformDiversionConfigs.push(uniformConfig)
  if (smoothTask) abSmoothEffectTasks.push(smoothTask)
  abMetricBindingSnapshots.unshift(...metricSnapshots)
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({
    experiments: [experiment],
    variants,
    paramSchemas,
    diversionConfigs: [diversionConfig],
    trafficConfigs: [trafficConfig],
    uniformConfigs: [uniformConfig],
    smoothTasks: smoothTask ? [smoothTask] : [],
    metricBindingSnapshots: metricSnapshots,
    operationLogs: [operationLog],
  })

  return resolveMock({ experiment, validation, message: '实验已提交调试' })
}

export const transitionAbExperiment = async (
  experimentId: EntityId,
  action: AbExperimentAction,
): Promise<{ experiment?: Experiment; message: string }> => {
  const experiment = findExperiment(experimentId)
  if (!experiment) return resolveMock({ message: '实验不存在' })

  const availability = getExperimentActionAvailability(experiment.status, action, {
    hasPermission: true,
    smoothTaskRunning: abSmoothEffectTasks.some((task) => task.experimentId === experimentId && task.status === 'RUNNING'),
    uniformDiversionReady:
      abUniformDiversionConfigs.find((config) => config.experimentId === experimentId)?.status !== 'FAILED',
  })
  if (!availability.available || !availability.nextStatus) {
    return resolveMock({ experiment, message: availability.reason ?? '当前状态不可执行该操作' })
  }
  if (action === 'restart' && Date.now() - new Date(experiment.updatedAt).getTime() < 24 * 60 * 60 * 1000) {
    return resolveMock({ experiment, message: '距离上次状态变更不足 24 小时，暂不可重启实验' })
  }

  const beforeStatus = experiment.status
  experiment.status = availability.nextStatus
  experiment.updatedAt = nowIso()
  const operationLog: OperationLog = {
    id: `log_${Date.now()}`,
    objectType: 'EXPERIMENT',
    objectId: experimentId,
    action,
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before: { status: beforeStatus },
    after: { status: availability.nextStatus },
    createdAt: experiment.updatedAt,
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ experiments: [experiment], operationLogs: [operationLog] })
  return resolveMock({ experiment, message: '操作成功' })
}

export const safeEditAbExperiment = (
  experimentId: EntityId,
  patch: Pick<Partial<Experiment>, 'name' | 'goal' | 'riskNote' | 'tags' | 'metricIds'>,
): Promise<{ experiment?: Experiment; message: string }> => {
  const experiment = findExperiment(experimentId)
  if (!experiment) return resolveMock({ message: '实验不存在' })
  if (!['DEBUGGING', 'READY', 'RUNNING', 'PAUSED'].includes(experiment.status)) {
    return resolveMock({ experiment, message: '当前状态不支持安全编辑' })
  }
  const before = {
    name: experiment.name,
    goal: experiment.goal,
    riskNote: experiment.riskNote,
    tags: experiment.tags,
    metricIds: experiment.metricIds,
  }
  if (patch.name !== undefined) experiment.name = patch.name
  if (patch.goal !== undefined) experiment.goal = patch.goal
  if (patch.riskNote !== undefined) experiment.riskNote = patch.riskNote
  if (patch.tags !== undefined) experiment.tags = patch.tags
  if (patch.metricIds !== undefined) experiment.metricIds = patch.metricIds
  experiment.updatedAt = nowIso()
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'EXPERIMENT',
    objectId: experimentId,
    action: 'safe_edit',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before,
    after: patch,
    createdAt: experiment.updatedAt,
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ experiments: [experiment], operationLogs: [operationLog] })
  return resolveMock({ experiment, message: '运行中安全编辑已保存' })
}

export const getAbExperimentPermissionGrants = (experimentId?: EntityId): Promise<ExperimentPermissionGrant[]> =>
  resolveMock(
    experimentId
      ? abExperimentPermissionGrants.filter((grant) => grant.experimentId === experimentId)
      : abExperimentPermissionGrants,
  )

export const updateAbExperimentPermissions = (
  experimentId: EntityId,
  payload: ExperimentPermissionUpdatePayload,
): Promise<{ experiment?: Experiment; grants: ExperimentPermissionGrant[]; message: string }> => {
  const experiment = findExperiment(experimentId)
  if (!experiment) return resolveMock({ grants: [], message: '实验不存在' })
  const before = {
    visibility: experiment.visibility,
    collaboratorIds: [...experiment.collaboratorIds],
    grants: abExperimentPermissionGrants.filter((grant) => grant.experimentId === experimentId),
  }
  const now = nowIso()
  const normalizedGrants = payload.grants.map((grant) => ({
    ...grant,
    id: grant.id || createId('grant'),
    experimentId,
    subjectName: grant.subjectName || grant.subjectId,
    updatedAt: now,
    createdAt: grant.createdAt || now,
  }))
  experiment.visibility = payload.visibility
  experiment.collaboratorIds = normalizedGrants
    .filter((grant) => grant.subjectType === 'USER' && grant.permissionType === 'collaborate')
    .map((grant) => grant.subjectId)
  experiment.updatedAt = now

  for (let index = abExperimentPermissionGrants.length - 1; index >= 0; index -= 1) {
    if (abExperimentPermissionGrants[index]?.experimentId === experimentId) {
      abExperimentPermissionGrants.splice(index, 1)
    }
  }
  abExperimentPermissionGrants.unshift(...normalizedGrants)

  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'EXPERIMENT',
    objectId: experimentId,
    action: 'update_permission',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before,
    after: {
      visibility: experiment.visibility,
      collaboratorIds: experiment.collaboratorIds,
      grants: normalizedGrants,
    },
    createdAt: now,
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({
    experiments: [experiment],
    permissionGrants: normalizedGrants,
    operationLogs: [operationLog],
  })
  return resolveMock({ experiment, grants: normalizedGrants, message: '权限配置已保存' })
}

export const scaleAbExperimentTraffic = (
  experimentId: EntityId,
  targetTrafficRatio: number,
  smoothDurationMinutes = 120,
): Promise<{ experiment?: Experiment; smoothTask?: SmoothEffectTask; message: string }> => {
  const experiment = findExperiment(experimentId)
  if (!experiment) return resolveMock({ message: '实验不存在' })
  if (!['DEBUGGING', 'READY', 'RUNNING', 'PAUSED'].includes(experiment.status)) {
    return resolveMock({ experiment, message: '当前状态不支持扩缩量' })
  }
  const currentTrafficRatio = experiment.trafficRatio
  experiment.trafficRatio = targetTrafficRatio
  experiment.updatedAt = nowIso()
  const trafficConfig = abTrafficConfigs.find((config) => config.experimentId === experimentId)
  if (trafficConfig) {
    trafficConfig.experimentTrafficRatio = targetTrafficRatio
    trafficConfig.effectiveMode = 'SMOOTH'
    trafficConfig.smoothDurationMinutes = smoothDurationMinutes
  }
  const smoothTask: SmoothEffectTask = {
    id: createId('smooth'),
    experimentId,
    action: targetTrafficRatio > currentTrafficRatio ? 'EXPAND' : 'STOP',
    startTrafficRatio: currentTrafficRatio,
    targetTrafficRatio,
    currentTrafficRatio,
    durationMinutes: smoothDurationMinutes,
    startedAt: experiment.updatedAt,
    expectedFinishedAt: new Date(new Date(experiment.updatedAt).getTime() + smoothDurationMinutes * 60000).toISOString(),
    status: 'RUNNING',
  }
  abSmoothEffectTasks.unshift(smoothTask)
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'EXPERIMENT',
    objectId: experimentId,
    action: 'scale_traffic',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before: { trafficRatio: currentTrafficRatio },
    after: { trafficRatio: targetTrafficRatio, smoothDurationMinutes },
    createdAt: experiment.updatedAt,
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({
    experiments: [experiment],
    trafficConfigs: trafficConfig ? [trafficConfig] : [],
    smoothTasks: [smoothTask],
    operationLogs: [operationLog],
  })
  return resolveMock({ experiment, smoothTask, message: '扩缩量任务已创建' })
}

function syncExperimentTrafficFromSmoothTask(task: SmoothEffectTask) {
  const experiment = findExperiment(task.experimentId)
  const trafficConfig = abTrafficConfigs.find((config) => config.experimentId === task.experimentId)
  if (experiment) {
    experiment.trafficRatio = task.currentTrafficRatio
    experiment.updatedAt = nowIso()
  }
  if (trafficConfig) {
    trafficConfig.experimentTrafficRatio = task.currentTrafficRatio
    trafficConfig.effectiveMode = 'SMOOTH'
    trafficConfig.smoothDurationMinutes = task.durationMinutes
  }
  return { experiment, trafficConfig }
}

export const refreshSmoothEffectTask = (taskId: EntityId): Promise<{ smoothTask?: SmoothEffectTask; message: string }> => {
  const task = abSmoothEffectTasks.find((item) => item.id === taskId)
  if (!task) return resolveMock({ message: '平滑任务不存在' })
  if (task.status === 'RUNNING') {
    const currentTrafficRatio = calculateSmoothTraffic(task)
    const reachedTarget =
      task.targetTrafficRatio >= task.startTrafficRatio
        ? currentTrafficRatio >= task.targetTrafficRatio
        : currentTrafficRatio <= task.targetTrafficRatio
    task.currentTrafficRatio = reachedTarget ? task.targetTrafficRatio : currentTrafficRatio
    if (reachedTarget) task.status = 'FINISHED'
    syncExperimentTrafficFromSmoothTask(task)
    persistCreatedMockState({ smoothTasks: [task] })
  }
  return resolveMock({ smoothTask: task, message: '平滑任务状态已刷新' }, 120)
}

export const operateSmoothEffectTask = async (
  taskId: EntityId,
  action: SmoothEffectTaskOperation,
): Promise<{ smoothTask?: SmoothEffectTask; message: string }> => {
  if (action === 'refresh') return refreshSmoothEffectTask(taskId)
  const task = abSmoothEffectTasks.find((item) => item.id === taskId)
  if (!task) return resolveMock({ message: '平滑任务不存在' })

  const before = {
    status: task.status,
    currentTrafficRatio: task.currentTrafficRatio,
    startTrafficRatio: task.startTrafficRatio,
  }
  const now = nowIso()

  if (action === 'pause') {
    if (task.status !== 'RUNNING') return resolveMock({ smoothTask: task, message: '仅运行中的平滑任务可暂停' })
    task.currentTrafficRatio = calculateSmoothTraffic(task)
    task.status = 'PAUSED'
  } else if (action === 'rollback') {
    task.currentTrafficRatio = task.startTrafficRatio
    task.status = 'ROLLED_BACK'
  } else if (action === 'skip') {
    task.currentTrafficRatio = task.targetTrafficRatio
    task.status = 'FINISHED'
  } else if (action === 'retry') {
    if (!['FAILED', 'PAUSED', 'ROLLED_BACK'].includes(task.status)) {
      return resolveMock({ smoothTask: task, message: '当前任务状态无需重试' })
    }
    task.startTrafficRatio = task.currentTrafficRatio
    task.startedAt = now
    task.expectedFinishedAt = new Date(new Date(now).getTime() + task.durationMinutes * 60000).toISOString()
    task.status = 'RUNNING'
    task.failureReason = undefined
  }

  const synced = syncExperimentTrafficFromSmoothTask(task)
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'EXPERIMENT',
    objectId: task.experimentId,
    action: `smooth_${action}`,
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before,
    after: {
      status: task.status,
      currentTrafficRatio: task.currentTrafficRatio,
      targetTrafficRatio: task.targetTrafficRatio,
    },
    createdAt: now,
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({
    experiments: synced.experiment ? [synced.experiment] : [],
    trafficConfigs: synced.trafficConfig ? [synced.trafficConfig] : [],
    smoothTasks: [task],
    operationLogs: [operationLog],
  })
  const messages: Record<SmoothEffectTaskOperation, string> = {
    pause: '平滑任务已暂停',
    rollback: '平滑任务已回滚到起始流量',
    skip: '平滑任务已跳过并直接到目标流量',
    refresh: '平滑任务状态已刷新',
    retry: '平滑任务已重新开始',
  }
  return resolveMock({ smoothTask: task, message: messages[action] })
}

export const closeAbExperimentVariant = (
  experimentId: EntityId,
  variantId: EntityId,
): Promise<{ variant?: ExperimentVariant; message: string }> => {
  const variant = abExperimentVariants.find((item) => item.experimentId === experimentId && item.id === variantId)
  if (!variant) return resolveMock({ message: '实验版本不存在' })
  if (variant.isControl) return resolveMock({ variant, message: '对照组不能关闭' })
  const before = { status: variant.status, trafficRatio: variant.trafficRatio }
  variant.status = 'CLOSED'
  variant.updatedAt = nowIso()
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'EXPERIMENT',
    objectId: experimentId,
    action: 'close_variant',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before,
    after: { variantId, status: variant.status, trafficRatio: variant.trafficRatio },
    createdAt: variant.updatedAt,
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ variants: [variant], operationLogs: [operationLog] })
  return resolveMock({ variant, message: '实验组已关闭，原流量保留在关闭组，不释放也不分配给其他组' })
}

export const calculateAbTraffic = (input: Parameters<typeof calculateTrafficRecommendation>[0]) =>
  resolveMock(calculateTrafficRecommendation(input), 260)

export const getAbTrafficLayers = () => resolveMock(abTrafficLayers)
export const getAbMutexDomainGroups = () => resolveMock(abMutexDomainGroups)

export const getAbMetricGroups = (): Promise<MetricGroup[]> => resolveMock(abMetricGroups)
export const getAbMetricDirectoryGroups = (): Promise<MetricDirectoryGroup[]> => resolveMock(abMetricDirectoryGroups)
export const getAbMetrics = (): Promise<Metric[]> => resolveMock(abMetrics)
export const getAbMetricTemplates = () => resolveMock(abMetricTemplates)
export const getAbMetricPermissionRoleMatrix = (): Promise<MetricPermissionRoleMatrix[]> =>
  resolveMock(abMetricPermissionRoles)
export const getAbMetricBindingSnapshots = (experimentId?: EntityId): Promise<MetricBindingSnapshot[]> =>
  resolveMock(
    experimentId
      ? abMetricBindingSnapshots.filter((snapshot) => snapshot.experimentId === experimentId)
      : abMetricBindingSnapshots,
  )
export const getAbAlarmTasks = (): Promise<AlarmTask[]> => resolveMock(abAlarmTasks)
export const getAbAlarmTriggerRecords = (alarmTaskId?: EntityId): Promise<AlarmTriggerRecord[]> =>
  resolveMock(
    alarmTaskId
      ? abAlarmTriggerRecords.filter((record) => record.alarmTaskId === alarmTaskId)
      : abAlarmTriggerRecords,
  )
export const getAbReceiverGroups = () => resolveMock(abReceiverGroups)
export const getAbMustSeeMetricTrends = () => resolveMock(abMustSeeMetricTrends)

type AlarmTaskPayload = Pick<
  AlarmTask,
  'appId' | 'name' | 'description' | 'alarmType' | 'level' | 'interval' | 'enabled' | 'ruleRelation' | 'scene' | 'strategies' | 'notification'
>
type ReceiverGroupPayload = Pick<ReceiverGroup, 'appId' | 'name' | 'memberIds'>
type MetricDirectoryGroupPayload = Pick<MetricDirectoryGroup, 'appId' | 'name' | 'description'>

function validateMetricDirectoryGroupPayload(payload: MetricDirectoryGroupPayload, directoryId?: EntityId) {
  const errors: Record<string, string> = {}
  const name = payload.name.trim()
  const description = payload.description.trim()
  if (!name) errors.name = '请输入分组名称'
  if (name.length > 50) errors.name = '分组名称不能超过 50 个字符'
  if (description.length > 200) errors.description = '分组描述不能超过 200 个字符'
  if (
    abMetricDirectoryGroups.some(
      (directory) => directory.appId === payload.appId && directory.id !== directoryId && directory.name.trim() === name,
    )
  ) {
    errors.name = '当前应用内已存在同名目录分组'
  }
  return errors
}

export const saveAbMetricDirectoryGroup = (
  payload: MetricDirectoryGroupPayload & { id?: EntityId },
): Promise<{ directoryGroup?: MetricDirectoryGroup; message: string; fieldErrors?: Record<string, string> }> => {
  const fieldErrors = validateMetricDirectoryGroupPayload(payload, payload.id)
  if (Object.keys(fieldErrors).length) return resolveMock({ message: '请修正目录分组后再保存', fieldErrors }, 120)
  const existing = payload.id ? abMetricDirectoryGroups.find((directory) => directory.id === payload.id) : undefined
  const now = nowIso()
  const directoryGroup: MetricDirectoryGroup = {
    id: existing?.id ?? createId('dir'),
    appId: payload.appId,
    name: payload.name.trim(),
    description: payload.description.trim(),
    createdBy: existing?.createdBy ?? currentOperator.id,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
  const index = abMetricDirectoryGroups.findIndex((directory) => directory.id === directoryGroup.id)
  if (index >= 0) abMetricDirectoryGroups.splice(index, 1, directoryGroup)
  else abMetricDirectoryGroups.push(directoryGroup)
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'METRIC_GROUP',
    objectId: directoryGroup.id,
    action: existing ? 'edit_metric_directory_group' : 'create_metric_directory_group',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before: existing ? { name: existing.name, description: existing.description } : undefined,
    after: { name: directoryGroup.name, description: directoryGroup.description },
    createdAt: now,
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ metricDirectoryGroups: [directoryGroup], operationLogs: [operationLog] })
  return resolveMock({ directoryGroup, message: existing ? '目录分组已保存' : '目录分组已创建' }, 160)
}

function uniqueReceiverMemberNames(memberIds: EntityId[]) {
  return [...new Set(memberIds)].map((memberId) => resolveMember(memberId).name)
}

function syncReceiverGroupUsage() {
  for (const group of abReceiverGroups) {
    group.usedByAlarmTaskIds = abAlarmTasks
      .filter((task) => task.notification.receiverGroupIds.includes(group.id))
      .map((task) => task.id)
  }
}

function validateAlarmTaskPayload(payload: AlarmTaskPayload, taskId?: EntityId) {
  const errors: Record<string, string> = {}
  const name = payload.name.trim()
  if (!name) errors.name = '请输入报警任务名称'
  if (name.length > 50) errors.name = '报警任务名称不能超过 50 个字符'
  if (abAlarmTasks.some((task) => task.appId === payload.appId && task.id !== taskId && task.name.trim() === name)) {
    errors.name = '当前应用内已存在同名报警任务'
  }
  if (payload.alarmType === 'experiment' && !payload.scene.experimentId) errors.scene = '实验报警需选择实验'
  if (payload.alarmType === 'dashboard' && !payload.scene.dashboardId) errors.scene = '大盘报警需填写大盘 ID'
  if (!payload.strategies.length) errors.strategies = '至少配置一条报警策略'
  for (const strategy of payload.strategies) {
    if (!strategy.metricId) errors.strategies = '报警策略需选择指标'
    if (strategy.thresholdPercent <= 0 || strategy.thresholdPercent > 100) errors.strategies = '阈值需在 0-100 之间'
  }
  if (!payload.notification.channels.length) errors.notification = '至少选择一个通知渠道'
  if (payload.notification.channels.includes('email') && !payload.notification.receiverGroupIds.length) {
    errors.receiverGroupIds = '选择邮件通知时至少选择一个接收组'
  }
  if (!payload.notification.timeRanges.length) errors.notification = '至少配置一个报警时间段'
  const sortedRanges = [...payload.notification.timeRanges].sort((left, right) => left.start.localeCompare(right.start))
  for (const [index, range] of sortedRanges.entries()) {
    if (!range.start || !range.end || range.start >= range.end) errors.notification = '报警时间段开始时间必须早于结束时间'
    const previousRange = sortedRanges[index - 1]
    if (previousRange && previousRange.end > range.start) errors.notification = '多个报警时间段不可重叠'
  }
  for (const channel of payload.notification.channels) {
    if (channel !== 'email' && !payload.notification.maskedWebhooks[channel]?.trim()) {
      errors.notification = '启用机器人通知时需填写 WebHook'
    }
    const webhook = channel !== 'email' ? payload.notification.maskedWebhooks[channel]?.trim() : ''
    if (webhook) {
      try {
        const url = new URL(webhook)
        if (!['http:', 'https:'].includes(url.protocol)) errors.notification = 'WebHook 必须是合法 URL'
      } catch {
        errors.notification = 'WebHook 必须是合法 URL'
      }
    }
  }
  return errors
}

export const saveAbAlarmTask = (
  payload: AlarmTaskPayload & { id?: EntityId },
): Promise<{ task?: AlarmTask; message: string; fieldErrors?: Record<string, string> }> => {
  const fieldErrors = validateAlarmTaskPayload(payload, payload.id)
  if (Object.keys(fieldErrors).length) return resolveMock({ message: '请修正报警任务配置后再保存', fieldErrors }, 120)
  const existing = payload.id ? abAlarmTasks.find((task) => task.id === payload.id) : undefined
  const createdAt = existing?.createdAt ?? nowIso()
  const task: AlarmTask = {
    id: existing?.id ?? createId('alarm'),
    appId: payload.appId,
    name: payload.name.trim(),
    description: payload.description.trim(),
    alarmType: payload.alarmType,
    level: payload.level,
    interval: payload.interval,
    enabled: payload.enabled,
    ruleRelation: payload.ruleRelation,
    scene: payload.alarmType === 'experiment' ? { experimentId: payload.scene.experimentId } : { dashboardId: payload.scene.dashboardId },
    strategies: payload.strategies.map((strategy) => ({ ...strategy })),
    notification: {
      channels: [...new Set(payload.notification.channels)],
      maskedWebhooks: { ...payload.notification.maskedWebhooks },
      receiverGroupIds: [...new Set(payload.notification.receiverGroupIds)],
      timeRanges: payload.notification.timeRanges.length ? payload.notification.timeRanges : [{ start: '00:00', end: '23:59' }],
    },
    triggerCount: existing?.triggerCount ?? 0,
    createdBy: existing?.createdBy ?? currentOperator.id,
    createdAt,
  }
  const index = abAlarmTasks.findIndex((item) => item.id === task.id)
  if (index >= 0) abAlarmTasks.splice(index, 1, task)
  else abAlarmTasks.unshift(task)
  syncReceiverGroupUsage()
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'ALARM_TASK',
    objectId: task.id,
    action: existing ? 'edit' : 'create',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    after: { name: task.name, enabled: task.enabled, receiverGroupIds: task.notification.receiverGroupIds },
    createdAt: nowIso(),
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ alarmTasks: [task], receiverGroups: abReceiverGroups, operationLogs: [operationLog] })
  return resolveMock({ task, message: existing ? '报警任务已保存' : '报警任务已创建' }, 160)
}

export const toggleAbAlarmTaskEnabled = (
  taskId: EntityId,
  enabled: boolean,
): Promise<{ task?: AlarmTask; message: string }> => {
  const task = abAlarmTasks.find((item) => item.id === taskId)
  if (!task) return resolveMock({ message: '报警任务不存在' }, 120)
  task.enabled = enabled
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'ALARM_TASK',
    objectId: task.id,
    action: enabled ? 'enable' : 'disable',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    after: { enabled },
    createdAt: nowIso(),
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ alarmTasks: [task], operationLogs: [operationLog] })
  return resolveMock({ task, message: enabled ? '报警任务已启用' : '报警任务已停用' }, 120)
}

export const deleteAbAlarmTask = (taskId: EntityId): Promise<{ task?: AlarmTask; message: string }> => {
  const index = abAlarmTasks.findIndex((task) => task.id === taskId)
  if (index < 0) return resolveMock({ message: '报警任务不存在' }, 120)
  const [task] = abAlarmTasks.splice(index, 1)
  syncReceiverGroupUsage()
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'ALARM_TASK',
    objectId: task?.id ?? taskId,
    action: 'delete',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before: task ? { name: task.name } : undefined,
    createdAt: nowIso(),
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ deletedAlarmTaskIds: [taskId], receiverGroups: abReceiverGroups, operationLogs: [operationLog] })
  return resolveMock({ task, message: '报警任务已删除' }, 160)
}

function validateReceiverGroupPayload(payload: ReceiverGroupPayload, groupId?: EntityId) {
  const errors: Record<string, string> = {}
  const name = payload.name.trim()
  if (!name) errors.name = '请输入接收组名称'
  if (name.length > 50) errors.name = '接收组名称不能超过 50 个字符'
  if (!payload.memberIds.length) errors.memberIds = '至少选择一个成员'
  if (abReceiverGroups.some((group) => group.appId === payload.appId && group.id !== groupId && group.name.trim() === name)) {
    errors.name = '当前应用内已存在同名接收组'
  }
  return errors
}

export const saveAbReceiverGroup = (
  payload: ReceiverGroupPayload & { id?: EntityId },
): Promise<{ group?: ReceiverGroup; message: string; fieldErrors?: Record<string, string> }> => {
  const fieldErrors = validateReceiverGroupPayload(payload, payload.id)
  if (Object.keys(fieldErrors).length) return resolveMock({ message: '请修正接收组配置后再保存', fieldErrors }, 120)
  const existing = payload.id ? abReceiverGroups.find((group) => group.id === payload.id) : undefined
  const memberIds = [...new Set(payload.memberIds)]
  const group: ReceiverGroup = {
    id: existing?.id ?? createId('rg'),
    appId: payload.appId,
    name: payload.name.trim(),
    memberIds,
    memberNames: uniqueReceiverMemberNames(memberIds),
    usedByAlarmTaskIds: existing?.usedByAlarmTaskIds ?? [],
    createdBy: existing?.createdBy ?? currentOperator.id,
    updatedAt: nowIso(),
  }
  const index = abReceiverGroups.findIndex((item) => item.id === group.id)
  if (index >= 0) abReceiverGroups.splice(index, 1, group)
  else abReceiverGroups.unshift(group)
  syncReceiverGroupUsage()
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'ALARM_TASK',
    objectId: group.id,
    action: existing ? 'edit_receiver_group' : 'create_receiver_group',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    after: { name: group.name, memberIds: group.memberIds },
    createdAt: group.updatedAt,
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ receiverGroups: abReceiverGroups, operationLogs: [operationLog] })
  return resolveMock({ group, message: existing ? '接收组已保存' : '接收组已创建' }, 160)
}

export const deleteAbReceiverGroup = (groupId: EntityId): Promise<{ group?: ReceiverGroup; message: string; usedByAlarmTasks?: AlarmTask[] }> => {
  syncReceiverGroupUsage()
  const group = abReceiverGroups.find((item) => item.id === groupId)
  if (!group) return resolveMock({ message: '接收组不存在' }, 120)
  const usedByAlarmTasks = abAlarmTasks.filter((task) => task.notification.receiverGroupIds.includes(groupId))
  if (usedByAlarmTasks.length) {
    return resolveMock({ group, usedByAlarmTasks, message: '当前接收组正在被报警任务使用，不能删除' }, 120)
  }
  abReceiverGroups.splice(abReceiverGroups.findIndex((item) => item.id === groupId), 1)
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'ALARM_TASK',
    objectId: group.id,
    action: 'delete_receiver_group',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before: { name: group.name },
    createdAt: nowIso(),
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ deletedReceiverGroupIds: [groupId], operationLogs: [operationLog] })
  return resolveMock({ group, message: '接收组已删除' }, 160)
}

type MetricTemplatePayload = Pick<
  MetricTemplate,
  'appId' | 'name' | 'description' | 'ownerId' | 'templateType' | 'availableUserIds' | 'metricGroupIds'
>

function validateMetricTemplatePayload(payload: MetricTemplatePayload, templateId?: EntityId) {
  const errors: Record<string, string> = {}
  const name = payload.name.trim()
  if (!name) errors.name = '请输入模板名称'
  if (name.length > 50) errors.name = '模板名称不能超过 50 个字符'
  if (!payload.ownerId) errors.ownerId = '请选择 Owner'
  if (!payload.metricGroupIds.length) errors.metricGroupIds = '至少选择一个指标组'
  if (
    abMetricTemplates.some(
      (template) => template.appId === payload.appId && template.id !== templateId && template.name.trim() === name,
    )
  ) {
    errors.name = '当前应用内已存在同名模板'
  }
  return errors
}

export const createAbMetricTemplate = (
  payload: MetricTemplatePayload,
): Promise<{ template?: MetricTemplate; message: string; fieldErrors?: Record<string, string> }> => {
  const fieldErrors = validateMetricTemplatePayload(payload)
  if (Object.keys(fieldErrors).length) return resolveMock({ message: '请修正模板配置后再保存', fieldErrors }, 120)
  const createdAt = nowIso()
  const template: MetricTemplate = {
    id: createId('tpl_metric'),
    appId: payload.appId,
    name: payload.name.trim(),
    description: payload.description.trim(),
    ownerId: payload.ownerId,
    templateType: payload.templateType,
    availableUserIds: payload.templateType === 'common' ? [] : [...new Set(payload.availableUserIds)],
    metricGroupIds: [...new Set(payload.metricGroupIds)],
    createdAt,
    updatedAt: createdAt,
  }
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'METRIC_TEMPLATE',
    objectId: template.id,
    action: 'create',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    after: { name: template.name, metricGroupIds: template.metricGroupIds },
    createdAt,
  }
  abMetricTemplates.unshift(template)
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ metricTemplates: [template], operationLogs: [operationLog] })
  return resolveMock({ template, message: '指标模板已创建' }, 160)
}

export const updateAbMetricTemplate = (
  templateId: EntityId,
  payload: MetricTemplatePayload,
): Promise<{ template?: MetricTemplate; message: string; fieldErrors?: Record<string, string> }> => {
  const template = abMetricTemplates.find((item) => item.id === templateId)
  if (!template) return resolveMock({ message: '指标模板不存在' }, 120)
  const fieldErrors = validateMetricTemplatePayload(payload, templateId)
  if (Object.keys(fieldErrors).length) return resolveMock({ template, message: '请修正模板配置后再保存', fieldErrors }, 120)
  const before = { name: template.name, metricGroupIds: template.metricGroupIds }
  template.appId = payload.appId
  template.name = payload.name.trim()
  template.description = payload.description.trim()
  template.ownerId = payload.ownerId
  template.templateType = payload.templateType
  template.availableUserIds = payload.templateType === 'common' ? [] : [...new Set(payload.availableUserIds)]
  template.metricGroupIds = [...new Set(payload.metricGroupIds)]
  template.updatedAt = nowIso()
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'METRIC_TEMPLATE',
    objectId: template.id,
    action: 'edit',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before,
    after: { name: template.name, metricGroupIds: template.metricGroupIds },
    createdAt: template.updatedAt,
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ metricTemplates: [template], operationLogs: [operationLog] })
  return resolveMock({ template, message: '指标模板已保存' }, 160)
}

export const deleteAbMetricTemplate = (templateId: EntityId): Promise<{ template?: MetricTemplate; message: string }> => {
  const index = abMetricTemplates.findIndex((item) => item.id === templateId)
  if (index < 0) return resolveMock({ message: '指标模板不存在' }, 120)
  const [template] = abMetricTemplates.splice(index, 1)
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'METRIC_TEMPLATE',
    objectId: template?.id ?? templateId,
    action: 'delete',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before: template ? { name: template.name, metricGroupIds: template.metricGroupIds } : undefined,
    createdAt: nowIso(),
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ deletedMetricTemplateIds: [templateId], operationLogs: [operationLog] })
  return resolveMock({ template, message: '指标模板已删除' }, 160)
}

const metricOperatorsNeedProperty = new Set(['sum/au', 'sum/uv', 'sum/pv', 'sum', 'count_distinct'])

function cloneMetricDefinition(definition: Metric['definition'], metricId: EntityId): Metric['definition'] {
  const nextDefinition = JSON.parse(JSON.stringify(definition)) as Metric['definition']
  nextDefinition.metricId = metricId
  return nextDefinition
}

function createUniqueMetricGroupName(baseName: string, appId: EntityId, excludedGroupId?: EntityId) {
  const normalizedBase = baseName.trim()
  const existingNames = new Set(
    abMetricGroups
      .filter((group) => group.appId === appId && group.id !== excludedGroupId)
      .map((group) => group.name.trim().toLowerCase()),
  )
  if (!existingNames.has(normalizedBase.toLowerCase())) return normalizedBase
  let index = 2
  while (existingNames.has(`${normalizedBase}${index}`.toLowerCase())) index += 1
  return `${normalizedBase}${index}`
}

function validateMetricDefinition(metric: Metric, groupType: MetricGroup['type']) {
  const errors: string[] = []
  if (!metric.name.trim()) errors.push('指标名称不能为空')
  if (metric.name.trim().length > 50) errors.push(`${metric.name} 名称不能超过 50 个字符`)
  if (metric.metricCategory !== groupType) errors.push(`${metric.name} 类型需与指标组类型一致`)
  if (metric.numberFormat.decimalPlaces < 0 || metric.numberFormat.decimalPlaces > 6) {
    errors.push(`${metric.name} 小数位需在 0-6 之间`)
  }
  if (groupType === 'event' && 'events' in metric.definition) {
    const events = metric.definition.events
    if (!events.length) errors.push(`${metric.name} 至少配置一个事件口径`)
    if (events.length > 26) errors.push(`${metric.name} 组合事件最多支持 A-Z 26 个`)
    if (metric.metricKind === 'composite' && events.length < 2) {
      errors.push(`${metric.name} 组合指标至少包含 2 个事件`)
    }
    for (const event of events) {
      if (!event.eventId) errors.push(`${metric.name} 的事件 ${event.code} 未选择事件`)
      if (!event.operator) errors.push(`${metric.name} 的事件 ${event.code} 未选择计算方式`)
      if (metricOperatorsNeedProperty.has(event.operator) && !event.propertyId) {
        errors.push(`${metric.name} 的事件 ${event.code} 需要选择属性`)
      }
      if (event.aggregationFilter?.enabled && event.aggregationFilter.dimensionType !== 'user' && !event.aggregationFilter.propertyId) {
        errors.push(`${metric.name} 的事件 ${event.code} 聚合过滤需选择聚合属性`)
      }
      for (const filter of event.filters) {
        if (!filter.propertyId || !filter.operator) errors.push(`${metric.name} 的过滤条件不完整`)
        if (!['is_null', 'is_not_null', '有值', '无值'].includes(filter.operator) && filter.value === '') {
          errors.push(`${metric.name} 的过滤条件缺少属性值`)
        }
      }
    }
    if (metric.metricKind === 'composite') {
      const formulaResult = validateMetricFormula(metric.definition.formula ?? '', events.map((event) => event.code))
      if (!formulaResult.valid) errors.push(`${metric.name}：${formulaResult.message}`)
    }
  }
  if (groupType === 'retention' && 'startEvent' in metric.definition) {
    if (!metric.definition.startEvent.eventId) errors.push(`${metric.name} 未选择起始事件`)
    if (!metric.definition.returnEvent.eventId) errors.push(`${metric.name} 未选择回访事件`)
    if (!Number.isInteger(metric.definition.retentionDays) || metric.definition.retentionDays < 1 || metric.definition.retentionDays > 365) {
      errors.push(`${metric.name} 留存天数需为 1-365 的整数`)
    }
  }
  if (groupType === 'funnel' && 'steps' in metric.definition) {
    if (metric.definition.steps.length < 2 || metric.definition.steps.length > 10) {
      errors.push(`${metric.name} 漏斗步骤需为 2-10 个`)
    }
    if (!metric.definition.conversionWindow.value || metric.definition.conversionWindow.value <= 0) {
      errors.push(`${metric.name} 转化窗口期必须为正整数`)
    }
  }
  return errors
}

function validateMetricGroupEditorPayload(payload: MetricGroupEditorPayload) {
  const fieldErrors: Record<string, string> = {}
  const name = payload.name.trim()
  if (!name) fieldErrors.name = '请输入指标组名称'
  if (name.length > 50) fieldErrors.name = '指标组名称不能超过 50 个字符'
  if (!payload.ownerId) fieldErrors.ownerId = '请选择 Owner'
  if (abMetricGroups.some((group) => group.appId === payload.appId && group.id !== payload.groupId && group.name.trim() === name)) {
    fieldErrors.name = '当前应用内已存在同名指标组'
  }
  if (!payload.metrics.length) fieldErrors.metrics = '指标配置至少包含 1 个指标'
  if (payload.type === 'event' && payload.metrics.length > 100) fieldErrors.metrics = '事件指标组最多保存 100 个指标'
  if (payload.type === 'retention' && payload.metrics.length > 1) fieldErrors.metrics = '留存指标组只能保存 1 个指标'
  if (payload.type === 'funnel' && payload.metrics.length > 1) fieldErrors.metrics = '漏斗指标组只能保存 1 个指标'

  const metricNames = payload.metrics.map((metric) => metric.name.trim()).filter(Boolean)
  if (new Set(metricNames).size !== metricNames.length) fieldErrors.metricNames = '当前指标组内存在重复指标名称'

  const definitionErrors = payload.metrics.flatMap((metric) => validateMetricDefinition(metric, payload.type))
  if (definitionErrors.length) fieldErrors.metricDefinitions = definitionErrors.slice(0, 4).join('；')
  return fieldErrors
}

export const saveAbMetricGroup = (
  payload: MetricGroupEditorPayload,
): Promise<{ group?: MetricGroup; metrics?: Metric[]; message: string; fieldErrors?: Record<string, string> }> => {
  const fieldErrors = validateMetricGroupEditorPayload(payload)
  if (Object.keys(fieldErrors).length) {
    return resolveMock({ message: '请修正指标组配置后再保存', fieldErrors }, 120)
  }

  const existingGroup = payload.mode === 'edit' && payload.groupId
    ? abMetricGroups.find((group) => group.id === payload.groupId)
    : undefined
  if (payload.mode === 'edit' && !existingGroup) {
    return resolveMock({ message: '指标组不存在' }, 120)
  }
  if (existingGroup?.status === 'offline') {
    return resolveMock({ group: existingGroup, message: '已下线指标组不可编辑' }, 120)
  }

  const createdAt = nowIso()
  const groupId = existingGroup?.id ?? createId(payload.mode === 'copy' ? 'mg_copy' : 'mg')
  const normalizedMetrics = payload.metrics.map((metric) => {
    const canReuseMetricId =
      payload.mode === 'edit' &&
      Boolean(metric.id) &&
      !metric.id.startsWith('draft_') &&
      abMetrics.some((item) => item.id === metric.id && item.metricGroupId === groupId)
    const metricId = canReuseMetricId ? metric.id : createId('metric')
    const previousMetric = abMetrics.find((item) => item.id === metric.id)
    return {
      ...metric,
      id: metricId,
      metricGroupId: groupId,
      metricCategory: payload.type,
      name: metric.name.trim(),
      description: metric.description.trim(),
      definition: cloneMetricDefinition(metric.definition, metricId),
      status: 'active' as const,
      createdAt: canReuseMetricId ? (previousMetric?.createdAt ?? createdAt) : createdAt,
      updatedAt: createdAt,
    }
  })
  const group: MetricGroup = {
    id: groupId,
    appId: payload.appId,
    name: payload.name.trim(),
    description: payload.description.trim(),
    type: payload.type,
    status: existingGroup?.status ?? 'active',
    ownerId: payload.ownerId,
    owner: resolveMember(payload.ownerId),
    creatorId: existingGroup?.creatorId ?? currentOperator.id,
    permissionType: payload.permissionType,
    authorizedUserIds: payload.permissionType === 'private' ? [...new Set(payload.authorizedUserIds)] : [],
    directoryGroupId: payload.directoryGroupId,
    metricIds: normalizedMetrics.map((metric) => metric.id),
    relatedExperimentIds: existingGroup?.relatedExperimentIds ?? [],
    createdAt: existingGroup?.createdAt ?? createdAt,
    updatedAt: createdAt,
  }
  const groupIndex = abMetricGroups.findIndex((item) => item.id === group.id)
  if (groupIndex >= 0) abMetricGroups.splice(groupIndex, 1, group)
  else abMetricGroups.unshift(group)

  for (let index = abMetrics.length - 1; index >= 0; index -= 1) {
    const metric = abMetrics[index]
    if (metric && metric.metricGroupId === group.id && !normalizedMetrics.some((item) => item.id === metric.id)) {
      abMetrics.splice(index, 1)
    }
  }
  mergeById(abMetrics, normalizedMetrics)

  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'METRIC_GROUP',
    objectId: group.id,
    action: payload.mode === 'edit' ? 'edit' : payload.mode === 'copy' ? 'copy_save' : 'create',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before: existingGroup ? { groupId: existingGroup.id, metricIds: existingGroup.metricIds } : undefined,
    after: { name: group.name, type: group.type, metricIds: group.metricIds },
    createdAt,
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ metricGroups: [group], metrics: normalizedMetrics, operationLogs: [operationLog] })
  return resolveMock({ group, metrics: normalizedMetrics, message: '指标组已保存' }, 180)
}

export const createAbMetricGroup = (payload: {
  appId: EntityId
  name: string
  description: string
  type: MetricGroup['type']
  permissionType: MetricGroup['permissionType']
  metricIds?: EntityId[]
}): Promise<{ group: MetricGroup; message: string }> => {
  const createdAt = nowIso()
  const group: MetricGroup = {
    id: createId('mg'),
    appId: payload.appId,
    name: payload.name.trim(),
    description: payload.description.trim(),
    type: payload.type,
    status: 'active',
    ownerId: currentOperator.id,
    owner: currentOperator,
    creatorId: currentOperator.id,
    permissionType: payload.permissionType,
    authorizedUserIds: payload.permissionType === 'private' ? [currentOperator.id] : [],
    metricIds: payload.metricIds ?? [],
    relatedExperimentIds: [],
    createdAt,
    updatedAt: createdAt,
  }
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'METRIC_GROUP',
    objectId: group.id,
    action: 'create',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    after: { name: group.name, type: group.type },
    createdAt,
  }
  abMetricGroups.unshift(group)
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ metricGroups: [group], operationLogs: [operationLog] })
  return resolveMock({ group, message: '指标组已创建' })
}

export const copyAbMetricGroup = (groupId: EntityId): Promise<{ group?: MetricGroup; message: string }> => {
  const source = abMetricGroups.find((group) => group.id === groupId)
  if (!source) return resolveMock({ message: '指标组不存在' })
  const createdAt = nowIso()
  const nextGroupId = createId('mg_copy')
  const copiedMetrics = source.metricIds
    .map((metricId) => abMetrics.find((metric) => metric.id === metricId))
    .filter((metric): metric is Metric => Boolean(metric))
    .map((metric) => {
      const metricId = createId('metric_copy')
      return {
        ...metric,
        id: metricId,
        metricGroupId: nextGroupId,
        definition: cloneMetricDefinition(metric.definition, metricId),
        isMustSee: false,
        createdAt,
        updatedAt: createdAt,
      }
    })
  const group: MetricGroup = {
    ...source,
    id: nextGroupId,
    name: createUniqueMetricGroupName(`${source.name}-复制`, source.appId),
    ownerId: currentOperator.id,
    owner: currentOperator,
    creatorId: currentOperator.id,
    metricIds: copiedMetrics.map((metric) => metric.id),
    relatedExperimentIds: [],
    createdAt,
    updatedAt: createdAt,
  }
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'METRIC_GROUP',
    objectId: group.id,
    action: 'copy',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before: { sourceGroupId: source.id },
    after: { name: group.name },
    createdAt,
  }
  abMetricGroups.unshift(group)
  abMetrics.unshift(...copiedMetrics)
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ metricGroups: [group], metrics: copiedMetrics, operationLogs: [operationLog] })
  return resolveMock({ group, message: '指标组已复制' })
}

export const mergeAbMetricGroups = (
  groupIds: EntityId[],
  options: {
    name?: string
    description?: string
    ownerId?: EntityId
    permissionType?: MetricGroup['permissionType']
    authorizedUserIds?: EntityId[]
    metricNameOverrides?: Record<EntityId, string>
  } = {},
): Promise<{ group?: MetricGroup; message: string; fieldErrors?: Record<string, string> }> => {
  const sources = abMetricGroups.filter((group) => groupIds.includes(group.id))
  if (sources.length < 2) return resolveMock({ message: '请至少选择两个指标组合并' })
  if (sources.some((group) => group.status !== 'active')) return resolveMock({ message: '仅使用中的指标组支持合并' })
  if (new Set(sources.map((group) => group.type)).size > 1) return resolveMock({ message: '请选择同一种指标类型的指标组合并' })
  if (sources[0]?.type !== 'event') {
    return resolveMock({ message: '留存指标组和漏斗指标组每组仅允许一个指标，不支持合并' })
  }
  const sourceMetrics = sources
    .flatMap((group) => group.metricIds)
    .map((metricId) => abMetrics.find((metric) => metric.id === metricId))
    .filter((metric): metric is Metric => Boolean(metric))
  const fieldErrors: Record<string, string> = {}
  const groupName = (options.name ?? '').trim()
  if (!groupName) fieldErrors.name = '请输入新指标组名称'
  if (groupName.length > 50) fieldErrors.name = '新指标组名称不能超过 50 个字符'
  if (groupName && abMetricGroups.some((group) => group.appId === sources[0]?.appId && group.name.trim() === groupName)) {
    fieldErrors.name = '当前应用内已存在同名指标组'
  }
  if (!options.ownerId) fieldErrors.ownerId = '请选择 Owner'
  const nextMetricNames = sourceMetrics.map((metric) => (options.metricNameOverrides?.[metric.id] ?? metric.name).trim())
  if (nextMetricNames.some((name) => !name)) fieldErrors.metricNames = '指标名称不能为空'
  if (nextMetricNames.some((name) => name.length > 50)) fieldErrors.metricNames = '指标名称不能超过 50 个字符'
  if (new Set(nextMetricNames).size !== nextMetricNames.length) {
    fieldErrors.metricNames = '指标名称重复，请修改后再合并'
  }
  if (Object.keys(fieldErrors).length) {
    return resolveMock({ message: '请修正合并配置后再保存', fieldErrors })
  }
  const createdAt = nowIso()
  const nextGroupId = createId('mg_merge')
  const copiedMetrics = sourceMetrics.map((metric) => {
    const metricId = createId('metric_merge')
    return {
      ...metric,
      id: metricId,
      metricGroupId: nextGroupId,
      name: (options.metricNameOverrides?.[metric.id] ?? metric.name).trim(),
      definition: cloneMetricDefinition(metric.definition, metricId),
      isMustSee: false,
      createdAt,
      updatedAt: createdAt,
    }
  })
  const metricIds = copiedMetrics.map((metric) => metric.id)
  const relatedExperimentIds = [...new Set(sources.flatMap((group) => group.relatedExperimentIds))]
  const group: MetricGroup = {
    id: nextGroupId,
    appId: sources[0]?.appId ?? 'app_news',
    name: groupName,
    description: (options.description ?? '').trim(),
    type: sources[0]?.type ?? 'event',
    status: 'active',
    ownerId: options.ownerId ?? currentOperator.id,
    owner: resolveMember(options.ownerId),
    creatorId: currentOperator.id,
    permissionType: options.permissionType ?? 'public',
    authorizedUserIds: options.permissionType === 'private' ? [...new Set(options.authorizedUserIds ?? [])] : [],
    metricIds,
    relatedExperimentIds,
    createdAt,
    updatedAt: createdAt,
  }
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'METRIC_GROUP',
    objectId: group.id,
    action: 'merge',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before: { sourceGroupIds: groupIds },
    after: { name: group.name, metricIds },
    createdAt,
  }
  abMetricGroups.unshift(group)
  abMetrics.unshift(...copiedMetrics)
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ metricGroups: [group], metrics: copiedMetrics, operationLogs: [operationLog] })
  return resolveMock({ group, message: '指标组已合并' })
}

export const offlineAbMetricGroup = (
  groupId: EntityId,
): Promise<{ group?: MetricGroup; message: string; relatedExperiments?: Experiment[] }> => {
  const group = abMetricGroups.find((item) => item.id === groupId)
  if (!group) return resolveMock({ message: '指标组不存在' })
  const runningExperiments = group.relatedExperimentIds
    .map((experimentId) => findExperiment(experimentId))
    .filter((experiment): experiment is Experiment => experiment?.status === 'RUNNING')
  if (runningExperiments.length) {
    return resolveMock({
      group,
      relatedExperiments: runningExperiments,
      message: '当前指标组存在被运行中实验使用的指标，请先停止相关实验或移除指标后再下线。',
    })
  }
  const before = { status: group.status }
  group.status = 'offline'
  group.updatedAt = nowIso()
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'METRIC_GROUP',
    objectId: group.id,
    action: 'offline',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before,
    after: { status: group.status },
    createdAt: group.updatedAt,
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ metricGroups: [group], operationLogs: [operationLog] })
  return resolveMock({ group, message: '指标组已下线' })
}

export const toggleAbMetricMustSee = (
  metricId: EntityId,
  isMustSee: boolean,
): Promise<{ metric?: Metric; message: string }> => {
  const metric = abMetrics.find((item) => item.id === metricId)
  if (!metric) return resolveMock({ message: '指标不存在' })
  const before = { isMustSee: metric.isMustSee }
  metric.isMustSee = isMustSee
  metric.updatedAt = nowIso()
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'METRIC_GROUP',
    objectId: metric.metricGroupId,
    action: 'toggle_must_see_metric',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before,
    after: { metricId, isMustSee },
    createdAt: metric.updatedAt,
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ metrics: [metric], operationLogs: [operationLog] })
  return resolveMock({ metric, message: isMustSee ? '已设为必看指标' : '已取消必看指标' })
}

export const getAbReportOverview = (experimentId: EntityId): Promise<ExperimentReportOverview | undefined> =>
  resolveMock(abReportOverviews.find((overview) => overview.experimentId === experimentId))

const synthesizeMetricResults = (experimentId: EntityId): MetricStatisticResult[] => {
  const experiment = findExperiment(experimentId)
  if (!experiment) return []
  if (experiment.type === 'MAB') {
    const mabReport = abMabReports.find((report) => report.experimentId === experimentId)
    if (!mabReport) return []
    const baselineArm = mabReport.arms[0]
    if (!baselineArm) return []
    return [
      {
        metricId: experiment.metricIds[0] ?? 'metric_banner_ctr',
        metricName: mabReport.optimizationMetric,
        metricType: 'event',
        versionResults: mabReport.arms.map((arm, index) => ({
          versionId: arm.armId,
          sampleSize: arm.entryUsers,
          metricValue: arm.metricValue,
          diffAbs: index === 0 ? null : arm.metricValue - baselineArm.metricValue,
          diffRel: index === 0 ? null : (arm.metricValue - baselineArm.metricValue) / baselineArm.metricValue,
          pValue: index === 0 ? null : Math.max(0.006, 0.12 - arm.p2ba * 0.1),
          mde: index === 0 ? null : 0.018,
          confidenceInterval: index === 0 ? null : [arm.distribution[0] - baselineArm.metricValue, arm.distribution[2] - baselineArm.metricValue],
          significance: index === 0 ? 'baseline' : arm.p2ba >= 0.6 ? 'positive' : 'neutral',
        })),
      },
    ]
  }
  return []
}

export const queryAbMetricResults = (experimentId: EntityId, filter?: Partial<ReportFilter>) => {
  const experiment = findExperiment(experimentId)
  const experimentMetricIds = new Set(experiment?.metricIds ?? [])
  const overviewMetrics = abReportOverviews.find((overview) => overview.experimentId === experimentId)?.coreMetricResults ?? []
  const baseMetrics = overviewMetrics.length
    ? overviewMetrics
    : abMetricResults.filter((metric) => !experimentMetricIds.size || experimentMetricIds.has(metric.metricId))
  const metrics = (baseMetrics.length ? baseMetrics : synthesizeMetricResults(experimentId)).map((metric) => {
    const filterCount = filter?.filters?.length ?? 0
    const cohortCount = filter?.cohorts?.length ?? 0
    const segmentFactor = Math.max(0.18, 1 - filterCount * 0.08 - cohortCount * 0.12)
    const modeFactor = filter?.dataMode === 'pre_aa' ? 0.96 : 1
    const granularityFactor = filter?.timeGranularity === 'hour' ? 0.78 : filter?.timeGranularity === '5m' ? 0.42 : 1
    return {
      ...metric,
      versionResults: metric.versionResults.map((result, index) => {
        const sampleSize = Math.max(120, Math.round(result.sampleSize * segmentFactor * granularityFactor))
        const valueFactor = modeFactor * (1 + (index === 0 ? -0.003 : 0.004) * filterCount)
        return {
          ...result,
          sampleSize,
          metricValue: result.metricValue === null ? null : result.metricValue * valueFactor,
          diffAbs: result.diffAbs === null ? null : result.diffAbs * modeFactor,
          diffRel: result.diffRel === null ? null : result.diffRel * modeFactor,
          pValue: result.pValue === null ? null : Math.min(0.99, result.pValue + filterCount * 0.006 + cohortCount * 0.01),
        }
      }),
    }
  })
  const versionIds = new Set(metrics.flatMap((metric) => metric.versionResults.map((result) => result.versionId)))
  const baseTrends = abTrendPoints.filter((point) => versionIds.has(point.versionId))
  const trends = (baseTrends.length
    ? baseTrends
    : metrics.flatMap((metric) =>
        metric.versionResults.flatMap((result) =>
          Array.from({ length: 7 }, (_, index) => ({
            time: `2026-05-${String(22 + index).padStart(2, '0')}`,
            versionId: result.versionId,
            value: Math.max(0, (result.metricValue ?? 0.1) * (0.92 + index * 0.015)),
            lowerBound: Math.max(0, (result.metricValue ?? 0.1) * 0.86),
            upperBound: (result.metricValue ?? 0.1) * 1.08,
            pValue: result.pValue ?? undefined,
          })),
        ),
      )).map((point, index) => ({
    ...point,
    time:
      filter?.timeGranularity === 'hour'
        ? `${point.time} ${String(index % 24).padStart(2, '0')}:00`
        : filter?.timeGranularity === '5m'
          ? `${point.time} ${String(index % 24).padStart(2, '0')}:${String((index % 12) * 5).padStart(2, '0')}`
          : point.time,
  }))
  return resolveMock({
    metrics,
    trends,
    templates: abFilterTemplates.filter((template) => !experiment || template.appId === experiment.appId),
  })
}

export const getAbFunnelReport = (metricId: EntityId, experimentId?: EntityId) =>
  resolveMock(
    abFunnelReports.find((report) => report.metricId === metricId && (!experimentId || report.experimentId === experimentId)) ??
      (!experimentId ? abFunnelReports.find((report) => report.metricId === metricId) : undefined),
  )

export const getAbCohortReport = (metricId: EntityId, experimentId?: EntityId) =>
  resolveMock(
    abCohortReports.find((report) => report.metricId === metricId && (!experimentId || report.experimentId === experimentId)) ??
      (!experimentId ? abCohortReports.find((report) => report.metricId === metricId) : undefined),
  )

function countMetricFilterTree(group: TemporaryRetentionQueryPayload['startFilterTree']): number {
  return group.conditions.length + group.groups.reduce((total, child) => total + countMetricFilterTree(child), 0)
}

export const queryAbTemporaryRetention = (
  payload: TemporaryRetentionQueryPayload,
): Promise<{ result?: TemporaryRetentionQueryResult; message: string; fieldErrors?: Record<string, string> }> => {
  const fieldErrors: Record<string, string> = {}
  const experiment = findExperiment(payload.experimentId)
  if (!experiment) fieldErrors.experimentId = '实验不存在'
  if (!payload.startEventId) fieldErrors.startEventId = '请选择起始事件'
  if (!payload.returnEventId) fieldErrors.returnEventId = '请选择回访事件'
  if (!payload.startDate || !payload.endDate || payload.startDate > payload.endDate) {
    fieldErrors.dateRange = '请选择合法的查询日期范围'
  }
  if (Object.keys(fieldErrors).length) return resolveMock({ message: '请修正临时留存查询条件', fieldErrors }, 120)

  const metricId = payload.metricId || experiment?.metricIds.find((id) => abMetrics.find((metric) => metric.id === id)?.metricCategory === 'retention')
  const baseReport =
    (metricId ? abCohortReports.find((report) => report.metricId === metricId) : undefined) ??
    abCohortReports.find((report) => report.metricId === 'metric_retention_d1')
  if (!baseReport) return resolveMock({ message: '暂无可用于临时留存查询的同期群数据' }, 120)

  const startFilterCount = countMetricFilterTree(payload.startFilterTree)
  const returnFilterCount = countMetricFilterTree(payload.returnFilterTree)
  const filterFactor = Math.max(0.4, 1 - startFilterCount * 0.05 - returnFilterCount * 0.06)
  const result: TemporaryRetentionQueryResult = {
    id: createId('temp_retention'),
    experimentId: payload.experimentId,
    metricId: baseReport.metricId,
    sourceMetricId: payload.metricId ?? null,
    startEventId: payload.startEventId,
    returnEventId: payload.returnEventId,
    startFilterTree: JSON.parse(JSON.stringify(payload.startFilterTree)) as TemporaryRetentionQueryPayload['startFilterTree'],
    returnFilterTree: JSON.parse(JSON.stringify(payload.returnFilterTree)) as TemporaryRetentionQueryPayload['returnFilterTree'],
    retentionDays: baseReport.retentionDays,
    rows: baseReport.rows.map((row) => ({
      ...row,
      newUsers: Math.max(1, Math.round(row.newUsers * filterFactor)),
      values: row.values.map((value, index) => (index === 0 ? value : Math.max(0, Number((value * (1 - (startFilterCount + returnFilterCount) * 0.006)).toFixed(4))))),
    })),
    queriedAt: nowIso(),
    summary: {
      startFilterCount,
      returnFilterCount,
      versionCount: new Set(baseReport.rows.map((row) => row.versionId)).size,
      cohortCount: baseReport.rows.length,
    },
  }
  abTemporaryRetentionQueryResults.unshift(result)
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'EXPERIMENT',
    objectId: payload.experimentId,
    action: 'query_temporary_retention',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    after: {
      metricId: payload.metricId,
      startEventId: payload.startEventId,
      returnEventId: payload.returnEventId,
      startFilterCount,
      returnFilterCount,
    },
    createdAt: result.queriedAt,
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ temporaryRetentionQueries: [result], operationLogs: [operationLog] })
  return resolveMock({ result, message: '临时留存查询完成，口径已写入本次报告查询记录' }, 240)
}

export const getAbHeatmapReport = (experimentId?: EntityId) => {
  const experiment = experimentId ? findExperiment(experimentId) : undefined
  if (experiment && experiment.type !== 'VISUAL' && experiment.type !== 'SPLIT_URL') return resolveMock(undefined)
  return resolveMock(
    (experimentId ? abHeatmapReports.find((report) => report.experimentId === experimentId) : undefined) ??
      abHeatmapReports[0],
  )
}
export const getAbMabReport = (experimentId: EntityId) =>
  resolveMock(abMabReports.find((report) => report.experimentId === experimentId))
export const getAbSensitiveInsightTasks = (experimentId?: EntityId) =>
  resolveMock(
    experimentId
      ? abSensitiveInsightTasks.filter((task) => task.experimentId === experimentId)
      : abSensitiveInsightTasks,
  )

export const getAbReportExportTasks = (experimentId?: EntityId): Promise<ReportExportTask[]> =>
  {
    advanceReportExportQueue()
    return resolveMock(
      experimentId
        ? abReportExportTasks.filter((task) => task.experimentId === experimentId)
        : abReportExportTasks,
    )
  }

export const createAbReportExportTask = (
  experimentId: EntityId,
  reportType: ReportExportTask['reportType'],
): Promise<{ task: ReportExportTask; message: string }> => {
  const experiment = findExperiment(experimentId)
  const createdAt = nowIso()
  const task: ReportExportTask = {
    id: createId('export'),
    experimentId,
    reportType,
    fileName: `${experiment?.name ?? experimentId}-${reportType}-report.xlsx`,
    status: 'queued',
    progress: 0,
    createdBy: currentOperator.id,
    createdAt,
    updatedAt: createdAt,
  }
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'EXPERIMENT',
    objectId: experimentId,
    action: 'export_report',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    after: { taskId: task.id, reportType, fileName: task.fileName },
    createdAt,
  }
  abReportExportTasks.unshift(task)
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ reportExportTasks: [task], operationLogs: [operationLog] })
  return resolveMock({ task, message: '报告导出任务已进入队列' }, 320)
}

export const cancelAbReportExportTask = (
  taskId: EntityId,
): Promise<{ task?: ReportExportTask; message: string }> => {
  const task = abReportExportTasks.find((item) => item.id === taskId)
  if (!task) return resolveMock({ message: '导出任务不存在' }, 120)
  if (!['queued', 'running'].includes(task.status)) {
    return resolveMock({ task, message: '当前状态不可取消' }, 120)
  }
  const before = { status: task.status, progress: task.progress }
  task.status = 'canceled'
  task.progress = Math.min(task.progress, 99)
  task.failureReason = '用户取消导出任务。'
  task.updatedAt = nowIso()
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'EXPERIMENT',
    objectId: task.experimentId,
    action: 'cancel_report_export',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before,
    after: { status: task.status, taskId: task.id },
    createdAt: task.updatedAt,
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ reportExportTasks: [{ ...task }], operationLogs: [operationLog] })
  return resolveMock({ task, message: '导出任务已取消' }, 160)
}

export const retryAbReportExportTask = (
  taskId: EntityId,
): Promise<{ task?: ReportExportTask; message: string }> => {
  const task = abReportExportTasks.find((item) => item.id === taskId)
  if (!task) return resolveMock({ message: '导出任务不存在' }, 120)
  if (!['failed', 'canceled'].includes(task.status)) {
    return resolveMock({ task, message: '当前状态不需要重试' }, 120)
  }
  const before = { status: task.status, failureReason: task.failureReason }
  task.status = 'queued'
  task.progress = 0
  task.failureReason = undefined
  task.downloadUrl = undefined
  task.updatedAt = nowIso()
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'EXPERIMENT',
    objectId: task.experimentId,
    action: 'retry_report_export',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before,
    after: { status: task.status, taskId: task.id },
    createdAt: task.updatedAt,
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ reportExportTasks: [{ ...task }], operationLogs: [operationLog] })
  return resolveMock({ task, message: '导出任务已重新入队' }, 160)
}

function getLatestFullVersion(featureId: EntityId, excludingVersionId?: EntityId) {
  return [...abFeatureVersions]
    .filter(
      (version) =>
        version.featureId === featureId &&
        version.versionId !== excludingVersionId &&
        version.versionStatus === 'full',
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0]
}

function applyDuePublishPlans() {
  const changedFeatures: FeatureFlag[] = []
  const changedVersions: FeatureVersion[] = []
  const changedPlans: PublishPlan[] = []
  const operationLogs: OperationLog[] = []
  const now = Date.now()

  for (const plan of abPublishPlans) {
    if (plan.status === 'canceled' || plan.status === 'rolled_back' || plan.status === 'failed') continue
    const feature = findFeature(plan.featureId)
    const version = findFeatureVersion(plan.versionId)
    if (!feature || !version) {
      const failedAt = nowIso()
      const nextPlan: PublishPlan = { ...plan, status: 'failed' }
      abPublishPlans.splice(abPublishPlans.findIndex((item) => item.publishId === nextPlan.publishId), 1, nextPlan)
      const operationLog: OperationLog = {
        id: createId('log'),
        objectType: 'FEATURE_VERSION',
        objectId: plan.versionId,
        action: 'schedule_feature_publish_failed',
        operatorId: 'system_scheduler',
        operatorName: '系统调度',
        before: { plan },
        after: { status: 'failed', failureReason: 'Feature 或版本不存在', notifyOwners: feature?.owners ?? [], plan: nextPlan },
        createdAt: failedAt,
      }
      abOperationLogs.unshift(operationLog)
      changedPlans.push(nextPlan)
      operationLogs.push(operationLog)
      continue
    }

    const rollbackDue = plan.rollbackAt ? new Date(plan.rollbackAt).getTime() <= now : false
    if (rollbackDue) {
      const createdAt = nowIso()
      const fallbackVersion = getLatestFullVersion(plan.featureId, plan.versionId)
      const nextVersion: FeatureVersion = { ...version, versionStatus: 'rolled_back', publishTraffic: 0 }
      const nextFeature: FeatureFlag = {
        ...feature,
        status: fallbackVersion ? 'enabled' : 'disabled',
        publishStatus: fallbackVersion ? 'full' : 'disabled',
        currentVersionId: fallbackVersion?.versionId ?? feature.currentVersionId,
        updatedAt: createdAt,
      }
      const nextPlan: PublishPlan = { ...plan, status: 'rolled_back' }
      abFeatureVersions.splice(abFeatureVersions.findIndex((item) => item.versionId === nextVersion.versionId), 1, nextVersion)
      abFeatureFlags.splice(abFeatureFlags.findIndex((item) => item.featureId === nextFeature.featureId), 1, nextFeature)
      abPublishPlans.splice(abPublishPlans.findIndex((item) => item.publishId === nextPlan.publishId), 1, nextPlan)
      const operationLog: OperationLog = {
        id: createId('log'),
        objectType: 'FEATURE',
        objectId: feature.featureId,
        action: fallbackVersion ? 'rollback_feature' : 'rollback_feature_close',
        operatorId: 'system_scheduler',
        operatorName: '系统调度',
        before: { currentVersionId: feature.currentVersionId, publishStatus: feature.publishStatus, plan },
        after: { currentVersionId: nextFeature.currentVersionId, publishStatus: nextFeature.publishStatus, plan: nextPlan },
        createdAt,
      }
      abOperationLogs.unshift(operationLog)
      changedFeatures.push(nextFeature)
      changedVersions.push(nextVersion)
      changedPlans.push(nextPlan)
      operationLogs.push(operationLog)
      continue
    }

    if (plan.publishType !== 'scheduled' || plan.status === 'completed') continue
    const orderedSteps = [...plan.steps].sort((left, right) => left.stepNo - right.stepNo)
    const dueSteps = orderedSteps.filter((step) => new Date(step.publishTime).getTime() <= now)
    const dueTraffic = dueSteps.at(-1)?.traffic
    if (!dueTraffic) continue
    const targetTraffic = orderedSteps.at(-1)?.traffic ?? dueTraffic
    const nextPublishStatus = dueTraffic >= 100 ? 'full' : 'gray'
    const nextPlanStatus = dueTraffic >= targetTraffic ? 'completed' : 'running'
    if (
      feature.currentVersionId === version.versionId &&
      feature.publishStatus === nextPublishStatus &&
      version.publishTraffic === dueTraffic &&
      version.versionStatus === nextPublishStatus &&
      plan.status === nextPlanStatus
    ) {
      continue
    }
    if (!canTransitionFeaturePublishStatus(version.versionStatus, nextPublishStatus)) {
      const failedAt = nowIso()
      const nextPlan: PublishPlan = { ...plan, status: 'failed' }
      abPublishPlans.splice(abPublishPlans.findIndex((item) => item.publishId === nextPlan.publishId), 1, nextPlan)
      const operationLog: OperationLog = {
        id: createId('log'),
        objectType: 'FEATURE_VERSION',
        objectId: version.versionId,
        action: 'schedule_feature_publish_failed',
        operatorId: 'system_scheduler',
        operatorName: '系统调度',
        before: { versionStatus: version.versionStatus, publishTraffic: version.publishTraffic, plan },
        after: {
          status: 'failed',
          failureReason: `版本状态 ${version.versionStatus} 不支持定时发布到 ${nextPublishStatus}`,
          notifyOwners: feature.owners,
          plan: nextPlan,
        },
        createdAt: failedAt,
      }
      abOperationLogs.unshift(operationLog)
      changedPlans.push(nextPlan)
      operationLogs.push(operationLog)
      continue
    }
    const createdAt = nowIso()
    const nextVersion: FeatureVersion = {
      ...version,
      versionStatus: nextPublishStatus,
      publishTraffic: dueTraffic,
    }
    const nextFeature: FeatureFlag = {
      ...feature,
      status: 'enabled',
      publishStatus: nextPublishStatus,
      currentVersionId: version.versionId,
      updatedAt: createdAt,
    }
    const nextPlan: PublishPlan = { ...plan, status: nextPlanStatus }
    abFeatureVersions.splice(abFeatureVersions.findIndex((item) => item.versionId === nextVersion.versionId), 1, nextVersion)
    abFeatureFlags.splice(abFeatureFlags.findIndex((item) => item.featureId === nextFeature.featureId), 1, nextFeature)
    abPublishPlans.splice(abPublishPlans.findIndex((item) => item.publishId === nextPlan.publishId), 1, nextPlan)
    const operationLog: OperationLog = {
      id: createId('log'),
      objectType: 'FEATURE_VERSION',
      objectId: version.versionId,
      action: 'schedule_feature_publish',
      operatorId: 'system_scheduler',
      operatorName: '系统调度',
      before: { versionStatus: version.versionStatus, publishTraffic: version.publishTraffic, plan },
      after: { versionStatus: nextVersion.versionStatus, publishTraffic: nextVersion.publishTraffic, plan: nextPlan },
      createdAt,
    }
    abOperationLogs.unshift(operationLog)
    changedFeatures.push(nextFeature)
    changedVersions.push(nextVersion)
    changedPlans.push(nextPlan)
    operationLogs.push(operationLog)
  }

  if (changedFeatures.length || changedVersions.length || changedPlans.length || operationLogs.length) {
    persistCreatedMockState({
      featureFlags: changedFeatures,
      featureVersions: changedVersions,
      publishPlans: changedPlans,
      operationLogs,
    })
  }
}

export const getAbFeatureFlags = () => {
  applyDuePublishPlans()
  return resolveMock(abFeatureFlags.filter((feature) => canViewServiceFeature(feature)))
}
export const getAbFeatureVersions = (featureId?: EntityId) => {
  applyDuePublishPlans()
  return resolveMock(
    (featureId ? abFeatureVersions.filter((version) => version.featureId === featureId) : abFeatureVersions)
      .filter((version) => canViewServiceFeature(findFeature(version.featureId))),
  )
}
export const getAbPublishPlans = () => {
  applyDuePublishPlans()
  return resolveMock(abPublishPlans.filter((plan) => canViewServiceFeature(findFeature(plan.featureId))))
}
export const getAbWhitelistTests = () => {
  applyDuePublishPlans()
  const now = Date.now()
  for (const test of abWhitelistTests) {
    if (test.status === 'active' && new Date(test.expiresAt).getTime() <= now) {
      test.status = 'expired'
    }
  }
  return resolveMock(abWhitelistTests.filter((test) => canViewServiceFeature(findFeature(test.featureId))))
}

export const createAbFeatureFlag = (
  draft: FeatureFlagDraft,
): Promise<{ feature?: FeatureFlag; version?: FeatureVersion; message: string }> => {
  if (servicePermissionContext.permissions.create_feature !== true) {
    return resolveMock({ message: featurePermissionDeniedMessage('创建') }, 120)
  }
  const duplicated = abFeatureFlags.find(
    (feature) => feature.key.trim() === draft.key.trim(),
  )
  if (duplicated) {
    return resolveMock({ feature: duplicated, message: 'Feature Key 已存在，请使用唯一 Key' }, 120)
  }
  if (!draft.key.trim()) return resolveMock({ message: '请输入 Key 名称' }, 120)
  if (draft.key.trim().length > 200) return resolveMock({ message: 'Key 最长不超过 200 个字符' }, 120)
  if (!featureKeyPattern.test(draft.key.trim())) {
    return resolveMock({ message: 'Key 仅支持英文字符、数字、下划线' }, 120)
  }
  if (!draft.name.trim()) return resolveMock({ message: '请输入 Feature 名称' }, 120)
  if (draft.name.trim().length > 100) return resolveMock({ message: 'Feature 名称最长不超过 100 个字符' }, 120)
  if (!featureNamePattern.test(draft.name.trim())) return resolveMock({ message: 'Feature 名称不支持特殊符号' }, 120)
  if (abFeatureFlags.some((feature) => feature.name.trim() === draft.name.trim())) {
    return resolveMock({ message: 'Feature 名称已存在，请使用唯一名称' }, 120)
  }
  if (draft.description.length > 2048) return resolveMock({ message: 'Feature 描述最长不超过 2048 个字符' }, 120)
  if (!draft.appId) return resolveMock({ message: '请选择适用 App' }, 120)
  if (!draft.owners.length) return resolveMock({ message: '至少配置一个 Owner' }, 120)
  if (draft.tags.length > 10) return resolveMock({ message: '最多添加 10 个标签' }, 120)
  if (draft.tags.some((tag) => tag.length > 20)) return resolveMock({ message: '单个标签最长 20 个字符' }, 120)
  if (new Set(draft.tags.map((tag) => tag.toLowerCase())).size !== draft.tags.length) {
    return resolveMock({ message: '标签已存在' }, 120)
  }
  if (!draft.variants.length || !draft.variants.some((variant) => variant.variantId === draft.defaultVariantId)) {
    return resolveMock({ message: '请至少配置一个变体并选择默认变体' }, 120)
  }

  const createdAt = nowIso()
  const featureId = createId('feat')
  const versionId = createId('feat_ver')
  const firstVariantId = draft.variants[0]?.variantId
  const defaultVariantId = draft.defaultVariantId ?? firstVariantId
  const defaultRule = draft.defaultRule ?? {
    ruleId: 'else',
    name: '默认规则',
    order: 999,
    conditions: [],
    deliveryType: defaultVariantId ? 'single_variant' as const : 'no_value' as const,
    variantId: defaultVariantId,
  }
  const variantErrors = validateFeatureVariantRules(
    draft.variantType,
    draft.variants,
    draft.audienceRules ?? [],
    defaultRule,
  )
  if (variantErrors.length) return resolveMock({ message: variantErrors[0] ?? '变体配置不完整' }, 120)
  const feature: FeatureFlag = {
    featureId,
    appId: draft.appId,
    key: draft.key.trim(),
    name: draft.name.trim(),
    description: draft.description.trim(),
    imageUrl: draft.imageUrl,
    terminalType: draft.terminalType,
    featureType: draft.featureType ?? 'public',
    status: 'enabled',
    publishStatus: 'unpublished',
    currentVersionId: versionId,
    owners: draft.owners.length ? draft.owners : [currentOperator.id],
    tags: draft.tags,
    relatedExperimentIds: [],
    createdBy: currentOperator.id,
    createdAt,
    updatedAt: createdAt,
  }
  const version: FeatureVersion = {
    versionId,
    featureId,
    versionNo: 'V1',
    versionStatus: 'unpublished',
    variantType: draft.variantType,
    variants: draft.variants,
    audienceRules: [...(draft.audienceRules ?? [])].sort((left, right) => left.order - right.order),
    defaultRule,
    publishTraffic: draft.publishTraffic ?? 0,
    createdBy: currentOperator.id,
    createdAt,
  }
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'FEATURE',
    objectId: featureId,
    action: 'create_feature',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    after: { feature, version },
    createdAt,
  }
  abFeatureFlags.unshift(feature)
  abFeatureVersions.unshift(version)
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ featureFlags: [feature], featureVersions: [version], operationLogs: [operationLog] })
  return resolveMock({ feature, version, message: 'Feature 已创建，初始版本待发布' }, 180)
}

export const createAbFeatureVersion = (
  featureId: EntityId,
  draft: FeatureVersionDraft,
): Promise<{ version?: FeatureVersion; message: string }> => {
  const feature = findFeature(featureId)
  if (!feature) return resolveMock({ message: 'Feature 不存在' }, 120)
  if (!canOperateServiceFeature(feature, 'create_feature')) {
    return resolveMock({ message: featurePermissionDeniedMessage('编辑') }, 120)
  }
  if (draft.expectedFeatureUpdatedAt && draft.expectedFeatureUpdatedAt !== feature.updatedAt) {
    return resolveMock({ message: '当前 Feature 已被他人修改，请刷新后重试' }, 120)
  }
  const variantErrors = validateFeatureVariantRules(
    draft.variantType,
    draft.variants,
    draft.audienceRules,
    draft.defaultRule,
  )
  if (variantErrors.length) return resolveMock({ message: variantErrors[0] ?? '版本配置不完整' }, 120)

  const createdAt = nowIso()
  const nextNo = abFeatureVersions.filter((version) => version.featureId === featureId).length + 1
  const version: FeatureVersion = {
    versionId: createId('feat_ver'),
    featureId,
    versionNo: `V${nextNo}`,
    versionStatus: 'unpublished',
    variantType: draft.variantType,
    variants: draft.variants,
    audienceRules: [...draft.audienceRules].sort((left, right) => left.order - right.order),
    defaultRule: draft.defaultRule,
    publishTraffic: 0,
    createdBy: currentOperator.id,
    createdAt,
  }
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'FEATURE_VERSION',
    objectId: version.versionId,
    action: 'create_feature_version',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    after: { version },
    createdAt,
  }
  const nextFeature: FeatureFlag = { ...feature, updatedAt: createdAt }
  abFeatureFlags.splice(abFeatureFlags.findIndex((item) => item.featureId === featureId), 1, nextFeature)
  abFeatureVersions.unshift(version)
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ featureFlags: [nextFeature], featureVersions: [version], operationLogs: [operationLog] })
  return resolveMock({ version, message: 'Feature 版本已创建，等待发布' }, 180)
}

export const disableAbFeatureVersion = (
  featureId: EntityId,
  versionId: EntityId,
): Promise<{ version?: FeatureVersion; message: string }> => {
  const feature = findFeature(featureId)
  const version = findFeatureVersion(versionId)
  if (!feature || !version || version.featureId !== featureId) {
    return resolveMock({ message: 'Feature 或版本不存在' }, 120)
  }
  if (!canOperateServiceFeature(feature, 'publish_feature')) {
    return resolveMock({ feature, version, message: featurePermissionDeniedMessage('发布') }, 120)
  }
  if (feature.currentVersionId === versionId && ['gray', 'full', 'publish_confirm'].includes(version.versionStatus)) {
    return resolveMock({ version, message: '当前线上生效版本不可直接禁用，请先回滚或关闭 Feature' }, 120)
  }
  if (version.versionStatus === 'disabled') {
    return resolveMock({ version, message: '版本已禁用' }, 120)
  }
  if (!canTransitionFeaturePublishStatus(version.versionStatus, 'disabled')) {
    return resolveMock({ version, message: `版本状态不支持从 ${version.versionStatus} 禁用` }, 120)
  }
  const createdAt = nowIso()
  const nextVersion: FeatureVersion = { ...version, versionStatus: 'disabled', publishTraffic: 0 }
  abFeatureVersions.splice(abFeatureVersions.findIndex((item) => item.versionId === versionId), 1, nextVersion)
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'FEATURE_VERSION',
    objectId: versionId,
    action: 'disable_feature_version',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before: { versionStatus: version.versionStatus, publishTraffic: version.publishTraffic },
    after: { versionStatus: nextVersion.versionStatus, publishTraffic: nextVersion.publishTraffic },
    createdAt,
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ featureVersions: [nextVersion], operationLogs: [operationLog] })
  return resolveMock({ version: nextVersion, message: 'Feature 版本已禁用' }, 180)
}

export const publishAbFeatureVersion = (
  featureId: EntityId,
  request: FeaturePublishRequest,
): Promise<{ feature?: FeatureFlag; version?: FeatureVersion; plan?: PublishPlan; message: string }> => {
  const feature = findFeature(featureId)
  const version = findFeatureVersion(request.versionId)
  if (!feature || !version || version.featureId !== featureId) {
    return resolveMock({ message: 'Feature 或版本不存在' }, 120)
  }
  if (!canOperateServiceFeature(feature, 'publish_feature')) {
    return resolveMock({ feature, version, message: featurePermissionDeniedMessage('发布') }, 120)
  }
  if (feature.status !== 'enabled') {
    return resolveMock({ feature, version, message: 'Feature 未开启，不能发布版本' }, 120)
  }
  if (['disabled', 'rolled_back', 'canceled'].includes(version.versionStatus)) {
    return resolveMock({ feature, version, message: '已禁用、已回滚或已取消发布的版本不能直接发布' }, 120)
  }
  if (!Number.isFinite(request.publishTraffic) || request.publishTraffic < 1 || request.publishTraffic > 100) {
    return resolveMock({ feature, version, message: '发布流量必须在 1%-100% 之间' }, 120)
  }
  if (!request.description.trim()) {
    return resolveMock({ feature, version, message: '请输入发布描述' }, 120)
  }
  if (request.description.trim().length > 500) {
    return resolveMock({ feature, version, message: '发布描述最长不超过 500 个字符' }, 120)
  }
  if (request.rollbackAt && new Date(request.rollbackAt).getTime() <= Date.now()) {
    return resolveMock({ feature, version, message: '定时下线时间必须晚于当前时间' }, 120)
  }

  const createdAt = nowIso()
  const isScheduled =
    request.publishType === 'scheduled' &&
    request.scheduledAt !== undefined &&
    new Date(request.scheduledAt).getTime() > Date.now()
  if (request.publishType === 'scheduled' && !isScheduled) {
    return resolveMock({ feature, version, message: '首次发布时间必须晚于当前时间' }, 120)
  }
  const steps = request.scheduleSteps?.length
    ? [...request.scheduleSteps].sort((left, right) => left.stepNo - right.stepNo)
    : [
        {
          stepNo: 1,
          publishTime: request.scheduledAt ?? createdAt,
          traffic: request.publishTraffic,
        },
      ]
  const invalidStep = steps.some((step, index) => {
    const previous = steps[index - 1]
    return (
      step.traffic < 1 ||
      step.traffic > 100 ||
      (previous !== undefined &&
        (step.traffic <= previous.traffic ||
          new Date(step.publishTime).getTime() <= new Date(previous.publishTime).getTime())) ||
      (isScheduled && new Date(step.publishTime).getTime() <= Date.now())
    )
  })
  if (invalidStep || Math.abs((steps.at(-1)?.traffic ?? 0) - request.publishTraffic) > 0.001) {
    return resolveMock({ feature, version, message: '发布计划需时间递增、流量递增，最后一步等于目标流量' }, 120)
  }
  const publishStatus = isScheduled
    ? 'pending_publish'
    : request.requireConfirmation
      ? 'publish_confirm'
      : request.publishTraffic >= 100
      ? 'full'
      : 'gray'
  if (!canTransitionFeaturePublishStatus(version.versionStatus, publishStatus)) {
    return resolveMock({ feature, version, message: `版本状态不支持从 ${version.versionStatus} 发布到 ${publishStatus}` }, 120)
  }
  const nextVersion: FeatureVersion = {
    ...version,
    versionStatus: publishStatus,
    publishTraffic: isScheduled ? 0 : request.publishTraffic,
  }
  const nextFeature: FeatureFlag = {
    ...feature,
    status: 'enabled',
    publishStatus,
    currentVersionId: isScheduled ? feature.currentVersionId : version.versionId,
    updatedAt: createdAt,
  }
  const plan: PublishPlan = {
    publishId: createId('pub'),
    featureId,
    versionId: version.versionId,
    publishType: request.publishType,
    status: isScheduled ? 'pending' : publishStatus === 'full' ? 'completed' : 'running',
    description: request.description.trim(),
    steps,
    rollbackAt: request.rollbackAt ?? null,
    createdBy: currentOperator.id,
  }
  const featureIndex = abFeatureFlags.findIndex((item) => item.featureId === featureId)
  const versionIndex = abFeatureVersions.findIndex((item) => item.versionId === version.versionId)
  abFeatureFlags.splice(featureIndex, 1, nextFeature)
  abFeatureVersions.splice(versionIndex, 1, nextVersion)
  abPublishPlans.unshift(plan)
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'FEATURE_VERSION',
    objectId: version.versionId,
    action: isScheduled ? 'schedule_feature_publish' : 'publish_feature',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before: { versionStatus: version.versionStatus, publishTraffic: version.publishTraffic },
    after: { versionStatus: nextVersion.versionStatus, publishTraffic: nextVersion.publishTraffic, plan },
    createdAt,
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({
    featureFlags: [nextFeature],
    featureVersions: [nextVersion],
    publishPlans: [plan],
    operationLogs: [operationLog],
  })
  return resolveMock({ feature: nextFeature, version: nextVersion, plan, message: 'Feature 发布任务已创建' }, 220)
}

export const cancelAbFeaturePublish = (
  featureId: EntityId,
  versionId: EntityId,
): Promise<{ feature?: FeatureFlag; version?: FeatureVersion; plan?: PublishPlan; message: string }> => {
  const feature = findFeature(featureId)
  const version = findFeatureVersion(versionId)
  if (!feature || !version || version.featureId !== featureId) {
    return resolveMock({ message: 'Feature 或版本不存在' }, 120)
  }
  if (!canOperateServiceFeature(feature, 'publish_feature')) {
    return resolveMock({ feature, version, message: featurePermissionDeniedMessage('发布') }, 120)
  }
  if (version.versionStatus !== 'pending_publish') {
    return resolveMock({ feature, version, message: '仅未到首次发布时间的定时发布可以取消' }, 120)
  }
  if (!canTransitionFeaturePublishStatus(version.versionStatus, 'canceled')) {
    return resolveMock({ feature, version, message: `版本状态不支持从 ${version.versionStatus} 取消发布` }, 120)
  }
  const createdAt = nowIso()
  const latestFullVersion = [...abFeatureVersions]
    .filter((item) => item.featureId === featureId && item.versionId !== versionId && item.versionStatus === 'full')
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0]
  const nextVersion: FeatureVersion = { ...version, versionStatus: 'canceled', publishTraffic: 0 }
  const nextFeature: FeatureFlag = {
    ...feature,
    currentVersionId: latestFullVersion?.versionId ?? feature.currentVersionId,
    publishStatus: latestFullVersion ? 'full' : 'disabled',
    status: latestFullVersion ? 'enabled' : 'disabled',
    updatedAt: createdAt,
  }
  const planIndex = abPublishPlans.findIndex((plan) => plan.featureId === featureId && plan.versionId === versionId && plan.status !== 'canceled')
  const existingPlan = planIndex >= 0 ? abPublishPlans[planIndex] : undefined
  const nextPlan: PublishPlan | undefined = existingPlan ? { ...existingPlan, status: 'canceled' } : undefined
  abFeatureVersions.splice(abFeatureVersions.findIndex((item) => item.versionId === versionId), 1, nextVersion)
  abFeatureFlags.splice(abFeatureFlags.findIndex((item) => item.featureId === featureId), 1, nextFeature)
  if (nextPlan) abPublishPlans.splice(planIndex, 1, nextPlan)
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'FEATURE_VERSION',
    objectId: versionId,
    action: 'cancel_feature_publish',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before: { versionStatus: version.versionStatus, publishTraffic: version.publishTraffic },
    after: { versionStatus: nextVersion.versionStatus, publishTraffic: nextVersion.publishTraffic },
    createdAt,
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({
    featureFlags: [nextFeature],
    featureVersions: [nextVersion],
    publishPlans: nextPlan ? [nextPlan] : [],
    operationLogs: [operationLog],
  })
  return resolveMock({ feature: nextFeature, version: nextVersion, plan: nextPlan, message: 'Feature 发布已取消' }, 180)
}

export const rollbackAbFeature = (
  featureId: EntityId,
  targetVersionId?: EntityId,
): Promise<{ feature?: FeatureFlag; version?: FeatureVersion; message: string }> => {
  const feature = findFeature(featureId)
  if (!feature) return resolveMock({ message: 'Feature 不存在' }, 120)
  if (!canOperateServiceFeature(feature, 'rollback_feature')) {
    return resolveMock({ feature, message: featurePermissionDeniedMessage('回滚') }, 120)
  }
  if (!['gray', 'publish_confirm', 'full'].includes(feature.publishStatus)) {
    return resolveMock({ feature, message: '仅灰度中、发布确认或已全量 Feature 可以回滚' }, 120)
  }
  if (!canTransitionFeaturePublishStatus(feature.publishStatus, 'rolled_back')) {
    return resolveMock({ feature, message: `发布状态不支持从 ${feature.publishStatus} 回滚` }, 120)
  }

  const candidateVersions = abFeatureVersions.filter((version) => version.featureId === featureId)
  const currentVersion = feature.currentVersionId ? findFeatureVersion(feature.currentVersionId) : undefined
  const explicitTarget = candidateVersions.find((version) => version.versionId === targetVersionId)
  if (explicitTarget && ['disabled', 'rolled_back', 'unpublished', 'canceled'].includes(explicitTarget.versionStatus)) {
    return resolveMock({ feature, version: explicitTarget, message: '目标版本不可回滚或不可恢复' }, 120)
  }
  const target =
    explicitTarget?.versionStatus === 'full'
      ? explicitTarget
      : [...candidateVersions]
          .filter((version) => version.versionId !== feature.currentVersionId && version.versionStatus === 'full')
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0]
  const createdAt = nowIso()
  if (!target) {
    const nextFeature: FeatureFlag = {
      ...feature,
      status: 'disabled',
      publishStatus: 'disabled',
      updatedAt: createdAt,
    }
    const nextCurrentVersion = currentVersion
      ? { ...currentVersion, versionStatus: 'rolled_back' as const, publishTraffic: 0 }
      : undefined
    abFeatureFlags.splice(abFeatureFlags.findIndex((item) => item.featureId === featureId), 1, nextFeature)
    if (nextCurrentVersion) {
      abFeatureVersions.splice(
        abFeatureVersions.findIndex((item) => item.versionId === nextCurrentVersion.versionId),
        1,
        nextCurrentVersion,
      )
    }
    const operationLog: OperationLog = {
      id: createId('log'),
      objectType: 'FEATURE',
      objectId: featureId,
      action: 'rollback_feature_close',
      operatorId: currentOperator.id,
      operatorName: currentOperator.name,
      before: { currentVersionId: feature.currentVersionId, publishStatus: feature.publishStatus },
      after: { status: nextFeature.status, publishStatus: nextFeature.publishStatus },
      createdAt,
    }
    abOperationLogs.unshift(operationLog)
    persistCreatedMockState({
      featureFlags: [nextFeature],
      featureVersions: nextCurrentVersion ? [nextCurrentVersion] : [],
      operationLogs: [operationLog],
    })
    return resolveMock({ feature: nextFeature, version: nextCurrentVersion, message: '无历史全量版本，已关闭 Feature 并回退到本地默认值' }, 220)
  }

  const nextFeature: FeatureFlag = {
    ...feature,
    currentVersionId: target.versionId,
    publishStatus: 'rolled_back',
    status: 'enabled',
    updatedAt: createdAt,
  }
  const nextVersion: FeatureVersion = {
    ...target,
    versionStatus: 'full',
    publishTraffic: 100,
  }
  const nextOldCurrentVersion =
    currentVersion && currentVersion.versionId !== nextVersion.versionId
      ? { ...currentVersion, versionStatus: 'rolled_back' as const, publishTraffic: 0 }
      : undefined
  abFeatureFlags.splice(abFeatureFlags.findIndex((item) => item.featureId === featureId), 1, nextFeature)
  abFeatureVersions.splice(abFeatureVersions.findIndex((item) => item.versionId === nextVersion.versionId), 1, nextVersion)
  if (nextOldCurrentVersion) {
    abFeatureVersions.splice(
      abFeatureVersions.findIndex((item) => item.versionId === nextOldCurrentVersion.versionId),
      1,
      nextOldCurrentVersion,
    )
  }
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'FEATURE',
    objectId: featureId,
    action: 'rollback_feature',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before: { currentVersionId: feature.currentVersionId, publishStatus: feature.publishStatus },
    after: { currentVersionId: nextFeature.currentVersionId, publishStatus: nextFeature.publishStatus },
    createdAt,
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({
    featureFlags: [nextFeature],
    featureVersions: [nextVersion, ...(nextOldCurrentVersion ? [nextOldCurrentVersion] : [])],
    operationLogs: [operationLog],
  })
  return resolveMock({ feature: nextFeature, version: nextVersion, message: 'Feature 已回滚到目标版本' }, 220)
}

export const createAbWhitelistTest = (
  featureId: EntityId,
  draft: WhitelistTestDraft,
): Promise<{ test?: WhitelistTest; message: string }> => {
  const feature = findFeature(featureId)
  if (!feature) return resolveMock({ message: 'Feature 不存在' }, 120)
  if (!canOperateServiceFeature(feature, 'create_feature')) {
    return resolveMock({ message: featurePermissionDeniedMessage('白名单测试') }, 120)
  }

  const createdAt = nowIso()
  if (!draft.name.trim()) return resolveMock({ message: '请输入白名单测试名称' }, 120)
  const expiresAtMs = new Date(draft.expiresAt).getTime()
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    return resolveMock({ message: '失效时间不能早于当前时间' }, 120)
  }
  if (expiresAtMs - Date.now() > 7 * 24 * 60 * 60 * 1000) {
    return resolveMock({ message: '白名单失效时间不能超过 7 天' }, 120)
  }
  const ruleEntries = Object.entries(draft.ruleUserIds)
  if (!ruleEntries.length || ruleEntries.some(([, userIds]) => !userIds.map((userId) => userId.trim()).filter(Boolean).length)) {
    return resolveMock({ message: '每条启用规则至少需要一个白名单用户' }, 120)
  }
  const allUserIds = ruleEntries.flatMap(([, userIds]) => userIds.map((userId) => userId.trim()).filter(Boolean))
  const invalidUserId = allUserIds.find((userId) => !whitelistUserIdPattern.test(userId))
  if (invalidUserId) {
    return resolveMock({ message: `白名单用户 ID 格式不合法：${invalidUserId}` }, 120)
  }
  if (new Set(allUserIds).size !== allUserIds.length) {
    const seen = new Map<string, string>()
    const duplicated = ruleEntries
      .flatMap(([ruleId, userIds]) => userIds.map((userId) => ({ ruleId, userId: userId.trim() })).filter((item) => item.userId))
      .find((item) => {
        const previousRule = seen.get(item.userId)
        if (previousRule !== undefined) return true
        seen.set(item.userId, item.ruleId)
        return false
      })
    return resolveMock({ message: duplicated ? `用户 ${duplicated.userId} 已存在于其他规则，请先删除重复用户` : '白名单用户不能在同一测试内重复出现在多个规则' }, 120)
  }
  const versionMode = draft.versionMode ?? (draft.versionId ? 'existing' : 'custom')
  if (versionMode === 'existing' && !draft.versionId) {
    return resolveMock({ message: '请选择已有 Feature 版本' }, 120)
  }
  if (versionMode === 'custom' && !draft.customVariants?.length) {
    return resolveMock({ message: '自定义白名单需要配置变体信息' }, 120)
  }
  if (versionMode === 'custom' && draft.customVariants?.length) {
    const firstValue = draft.customVariants[0]?.value
    const customVariantType = inferFeatureVariantType(firstValue)
    const customDefaultRule = draft.customAudienceRules?.find((rule) => rule.ruleId === 'else') ?? createDefaultWhitelistRule(draft.customVariants[0]?.variantId)
    const customErrors = validateFeatureVariantRules(
      customVariantType,
      draft.customVariants,
      (draft.customAudienceRules ?? []).filter((rule) => rule.ruleId !== 'else'),
      customDefaultRule,
    )
    if (customErrors.length) return resolveMock({ message: customErrors[0] ?? '自定义白名单配置不完整' }, 120)
  }
  const test: WhitelistTest = {
    id: createId('wl'),
    featureId,
    name: draft.name.trim(),
    versionMode,
    versionId: draft.versionId,
    status: 'active',
    expiresAt: draft.expiresAt,
    customVariants: draft.customVariants,
    customAudienceRules: draft.customAudienceRules,
    ruleUserIds: draft.ruleUserIds,
    createdBy: currentOperator.id,
    createdAt,
  }
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'FEATURE',
    objectId: featureId,
    action: 'create_whitelist_test',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    after: { test },
    createdAt,
  }
  abWhitelistTests.unshift(test)
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ whitelistTests: [test], operationLogs: [operationLog] })
  return resolveMock({ test, message: '白名单测试已创建，状态为生效中，预计 1 分钟内生效' }, 180)
}

export const terminateAbWhitelistTest = (
  testId: EntityId,
): Promise<{ test?: WhitelistTest; message: string }> => {
  const test = abWhitelistTests.find((item) => item.id === testId)
  if (!test) return resolveMock({ message: '白名单测试不存在' }, 120)
  if (!canOperateServiceFeature(findFeature(test.featureId), 'create_feature')) {
    return resolveMock({ test, message: featurePermissionDeniedMessage('白名单测试') }, 120)
  }
  if (test.status !== 'active') return resolveMock({ test, message: '当前白名单已失效或已终止' }, 120)
  const createdAt = nowIso()
  const nextTest: WhitelistTest = { ...test, status: 'terminated' }
  abWhitelistTests.splice(abWhitelistTests.findIndex((item) => item.id === testId), 1, nextTest)
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'FEATURE',
    objectId: test.featureId,
    action: 'terminate_whitelist_test',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before: { status: test.status },
    after: { status: nextTest.status },
    createdAt,
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ whitelistTests: [nextTest], operationLogs: [operationLog] })
  return resolveMock({ test: nextTest, message: '白名单测试已终止' }, 180)
}

export const copyAbWhitelistTest = (
  testId: EntityId,
): Promise<{ test?: WhitelistTest; message: string }> => {
  const test = abWhitelistTests.find((item) => item.id === testId)
  if (!test) return resolveMock({ message: '白名单测试不存在' }, 120)
  if (!canOperateServiceFeature(findFeature(test.featureId), 'create_feature')) {
    return resolveMock({ test, message: featurePermissionDeniedMessage('白名单测试') }, 120)
  }
  const createdAt = nowIso()
  const copied: WhitelistTest = {
    ...test,
    id: createId('wl'),
    name: `${test.name} 副本`,
    status: 'active',
    expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: currentOperator.id,
    createdAt,
  }
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'FEATURE',
    objectId: test.featureId,
    action: 'copy_whitelist_test',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    after: { copiedFrom: test.id, test: copied },
    createdAt,
  }
  abWhitelistTests.unshift(copied)
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ whitelistTests: [copied], operationLogs: [operationLog] })
  return resolveMock({ test: copied, message: '白名单测试已复制' }, 180)
}

export const deleteAbWhitelistTest = (
  testId: EntityId,
): Promise<{ message: string }> => {
  const test = abWhitelistTests.find((item) => item.id === testId)
  if (!test) return resolveMock({ message: '白名单测试不存在' }, 120)
  if (!canOperateServiceFeature(findFeature(test.featureId), 'create_feature')) {
    return resolveMock({ message: featurePermissionDeniedMessage('白名单测试') }, 120)
  }
  const createdAt = nowIso()
  abWhitelistTests.splice(abWhitelistTests.findIndex((item) => item.id === testId), 1)
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'FEATURE',
    objectId: test.featureId,
    action: 'delete_whitelist_test',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before: { test },
    createdAt,
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ deletedWhitelistTestIds: [testId], operationLogs: [operationLog] })
  return resolveMock({ message: '白名单测试已删除' }, 180)
}

export const changeAbFeatureLifecycle = (
  featureId: EntityId,
  action: FeatureLifecycleAction,
): Promise<{ feature?: FeatureFlag; message: string }> => {
  const feature = findFeature(featureId)
  if (!feature) return resolveMock({ message: 'Feature 不存在' }, 120)
  if (!canOperateServiceFeature(feature, 'delete_feature')) {
    return resolveMock({ feature, message: featurePermissionDeniedMessage('生命周期管理') }, 120)
  }
  const nextStatus = action === 'enable' ? 'enabled' : action === 'disable' ? 'disabled' : 'deleted'
  if (action === 'delete') {
    if (feature.status === 'enabled') {
      return resolveMock({ feature, message: '开启状态不可删除，请先关闭 Feature' }, 120)
    }
    const runningExperiment = feature.relatedExperimentIds
      .map((experimentId) => findExperiment(experimentId))
      .find((experiment): experiment is Experiment => experiment?.status === 'RUNNING')
    if (runningExperiment) {
      return resolveMock({ feature, message: `当前 Feature 存在运行中的关联实验「${runningExperiment.name}」，不可删除` }, 120)
    }
    const blockingVersion = abFeatureVersions.find(
      (version) =>
        version.featureId === featureId &&
        ['pending_publish', 'gray', 'publish_confirm'].includes(version.versionStatus),
    )
    if (blockingVersion) {
      return resolveMock({ feature, message: '当前 Feature 存在灰度中、发布确认或待发布版本，不可删除' }, 120)
    }
  }
  if (!canTransitionFeatureStatus(feature.status, nextStatus)) {
    return resolveMock({ feature, message: `Feature 状态不支持从 ${feature.status} 变更为 ${nextStatus}` }, 120)
  }

  const createdAt = nowIso()
  const nextFeature: FeatureFlag = {
    ...feature,
    status: nextStatus,
    publishStatus: action === 'enable' ? feature.publishStatus : action === 'disable' ? 'disabled' : 'canceled',
    updatedAt: createdAt,
  }
  abFeatureFlags.splice(abFeatureFlags.findIndex((item) => item.featureId === featureId), 1, nextFeature)
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'FEATURE',
    objectId: featureId,
    action: `feature_${action}`,
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before: { status: feature.status, publishStatus: feature.publishStatus },
    after: { status: nextFeature.status, publishStatus: nextFeature.publishStatus },
    createdAt,
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ featureFlags: [nextFeature], operationLogs: [operationLog] })
  return resolveMock({ feature: nextFeature, message: 'Feature 生命周期状态已更新' }, 180)
}

export const updateAbFeaturePermission = (
  featureId: EntityId,
  featureType: FeatureFlag['featureType'],
): Promise<{ feature?: FeatureFlag; message: string }> => {
  const feature = findFeature(featureId)
  if (!feature) return resolveMock({ message: 'Feature 不存在' }, 120)
  if (!canOperateServiceFeature(feature, 'manage_feature_permission')) {
    return resolveMock({ feature, message: featurePermissionDeniedMessage('权限管理') }, 120)
  }

  const createdAt = nowIso()
  const nextFeature: FeatureFlag = {
    ...feature,
    featureType,
    updatedAt: createdAt,
  }
  abFeatureFlags.splice(abFeatureFlags.findIndex((item) => item.featureId === featureId), 1, nextFeature)
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'FEATURE',
    objectId: featureId,
    action: 'feature_permission_update',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before: { featureType: feature.featureType },
    after: { featureType },
    createdAt,
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ featureFlags: [nextFeature], operationLogs: [operationLog] })
  return resolveMock({ feature: nextFeature, message: 'Feature 权限类型已更新' }, 180)
}

function inferFeatureVariantValue(variant: ExperimentVariant) {
  const entries = Object.entries(variant.params)
  if (entries.length === 1) return entries[0]?.[1]
  return variant.params
}

function inferFeatureVariantType(value: unknown): FeatureVersion['variantType'] {
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'string') return 'string'
  return 'json'
}

export const solidifyExperimentToFeature = (
  request: FeatureSolidifyRequest,
): Promise<{ feature?: FeatureFlag; version?: FeatureVersion; message: string }> => {
  const experiment = findExperiment(request.experimentId)
  const experimentVariants = abExperimentVariants.filter((variant) => variant.experimentId === request.experimentId)
  const winner = experimentVariants.find((variant) => variant.id === request.winnerVariantId)
  if (!experiment || !winner) return resolveMock({ message: '实验或胜出版本不存在' }, 120)
  const featureKey = request.featureKey.trim()
  const featureName = request.featureName.trim()
  const targetAppId = request.appId || experiment.appId
  const description = (request.description ?? `由实验「${experiment.name}」固化生成。`).trim()
  const ownerIds = request.ownerIds?.length ? request.ownerIds : [experiment.ownerId]
  const tags = request.tags?.length ? request.tags : [...experiment.tags, '实验固化']
  if (!featureKey) return resolveMock({ message: '请输入 Feature Key' }, 120)
  if (featureKey.length > 200) return resolveMock({ message: 'Feature Key 最长不超过 200 个字符' }, 120)
  if (!featureKeyPattern.test(featureKey)) return resolveMock({ message: 'Feature Key 仅支持英文字符、数字、下划线' }, 120)
  if (!featureName) return resolveMock({ message: '请输入 Feature 名称' }, 120)
  if (featureName.length > 100) return resolveMock({ message: 'Feature 名称最长不超过 100 个字符' }, 120)
  if (!featureNamePattern.test(featureName)) return resolveMock({ message: 'Feature 名称不支持特殊符号' }, 120)
  if (description.length > 2048) return resolveMock({ message: 'Feature 描述最长不超过 2048 个字符' }, 120)
  if (!targetAppId) return resolveMock({ message: '请选择适用 App' }, 120)
  if (!ownerIds.length) return resolveMock({ message: '至少配置一个 Owner' }, 120)
  if (tags.length > 10) return resolveMock({ message: '最多添加 10 个标签' }, 120)
  if (tags.some((tag) => tag.length > 20)) return resolveMock({ message: '单个标签最长 20 个字符' }, 120)
  if (new Set(tags.map((tag) => tag.toLowerCase())).size !== tags.length) {
    return resolveMock({ message: '标签已存在' }, 120)
  }
  const rolloutRows = request.variantRollouts?.filter((item) => item.traffic > 0) ?? []
  const selectedRollouts = rolloutRows.length ? rolloutRows : [{ experimentVariantId: winner.id, traffic: 100 }]
  const selectedIds = new Set(selectedRollouts.map((item) => item.experimentVariantId))
  const selectedVariants = experimentVariants.filter((variant) => selectedIds.has(variant.id))
  if (!selectedVariants.length) return resolveMock({ message: '请选择至少一个实验分组用于固化' }, 120)
  const trafficTotal = Number(selectedRollouts.reduce((sum, item) => sum + item.traffic, 0).toFixed(2))
  if (Math.abs(trafficTotal - 100) > 0.001) {
    return resolveMock({ message: '多组固化比例合计必须等于 100%' }, 120)
  }

  const winnerValue = inferFeatureVariantValue(winner)
  const variantType = inferFeatureVariantType(winnerValue)
  const mismatchedVariant = selectedVariants.find(
    (variant) => inferFeatureVariantType(inferFeatureVariantValue(variant)) !== variantType,
  )
  if (mismatchedVariant) {
    return resolveMock({ message: `实验分组「${mismatchedVariant.name}」参数类型与胜出组不一致，无法固化到同一 Feature` }, 120)
  }

  const createdAt = nowIso()
  const existingFeature = abFeatureFlags.find((feature) => feature.key === featureKey)
  if (existingFeature && existingFeature.appId !== targetAppId) {
    return resolveMock({ feature: existingFeature, message: 'Feature Key 已存在于其他 App，请更换 Key 或在对应 App 内固化' }, 120)
  }
  if (existingFeature && !canOperateServiceFeature(existingFeature, 'create_feature')) {
    return resolveMock({ feature: existingFeature, message: featurePermissionDeniedMessage('实验固化') }, 120)
  }
  if (!existingFeature && servicePermissionContext.permissions.create_feature !== true) {
    return resolveMock({ message: featurePermissionDeniedMessage('实验固化') }, 120)
  }
  if (!existingFeature && abFeatureFlags.some((feature) => feature.name.trim() === featureName)) {
    return resolveMock({ message: 'Feature 名称已存在，请使用唯一名称' }, 120)
  }
  const existingLatestVersion = existingFeature
    ? [...abFeatureVersions]
        .filter((versionItem) => versionItem.featureId === existingFeature.featureId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0]
    : undefined
  if (existingLatestVersion && existingLatestVersion.variantType !== variantType) {
    return resolveMock({
      feature: existingFeature,
      message: `已有 Feature 变体类型为 ${existingLatestVersion.variantType}，与实验固化类型 ${variantType} 不兼容`,
    }, 120)
  }
  const featureId = existingFeature?.featureId ?? createId('feat')
  const featureVariants = selectedVariants.map((variant) => {
    const override = request.variantOverrides?.find((item) => item.experimentVariantId === variant.id)
    return {
      variantId: `solid_${variant.id}`,
      name: override?.name.trim() || variant.name,
      value: inferFeatureVariantValue(variant),
      description: override?.description?.trim() || variant.description || `${experiment.name} 固化版本`,
    }
  })
  const winnerFeatureVariantId = `solid_${winner.id}`
  const defaultRule =
    selectedRollouts.length > 1
      ? {
          ruleId: 'else',
          name: '默认规则',
          order: 999,
          conditions: [],
          deliveryType: 'multi_variant' as const,
          variantWeights: selectedRollouts.map((item) => ({
            variantId: `solid_${item.experimentVariantId}`,
            weight: item.traffic,
          })),
        }
      : {
          ruleId: 'else',
          name: '默认规则',
          order: 999,
          conditions: [],
          deliveryType: 'single_variant' as const,
          variantId: winnerFeatureVariantId,
        }
  const version: FeatureVersion = {
    versionId: createId('feat_ver'),
    featureId,
    versionNo: `V${abFeatureVersions.filter((item) => item.featureId === featureId).length + 1}`,
    versionStatus: 'unpublished',
    variantType,
    variants: featureVariants,
    audienceRules: [],
    defaultRule,
    publishTraffic: 0,
    createdBy: currentOperator.id,
    createdAt,
  }
  const feature: FeatureFlag = {
    ...(existingFeature ?? {
      featureId,
      appId: targetAppId,
      key: featureKey,
      name: featureName,
      description,
      terminalType: request.terminalType ?? (experiment.type === 'CLIENT_CODE' || experiment.type === 'VISUAL' ? 'client' : 'server'),
      featureType: request.featureType ?? (experiment.visibility === 'PRIVATE' ? 'private' : 'public'),
      owners: ownerIds,
      tags,
      relatedExperimentIds: [],
      createdBy: currentOperator.id,
      createdAt,
    }),
    status: 'enabled',
    publishStatus: 'unpublished',
    currentVersionId: existingFeature?.currentVersionId ?? version.versionId,
    relatedExperimentIds: [...new Set([...(existingFeature?.relatedExperimentIds ?? []), experiment.id])],
    updatedAt: createdAt,
  }
  if (existingFeature) {
    abFeatureFlags.splice(abFeatureFlags.findIndex((item) => item.featureId === feature.featureId), 1, feature)
  } else {
    abFeatureFlags.unshift(feature)
  }
  abFeatureVersions.unshift(version)
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'FEATURE',
    objectId: feature.featureId,
    action: 'solidify_experiment_to_feature',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    after: { experimentId: experiment.id, winnerVariantId: winner.id, feature, version },
    createdAt,
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ featureFlags: [feature], featureVersions: [version], operationLogs: [operationLog] })
  return resolveMock({ feature, version, message: '实验结果已生成未发布 Feature 版本，请进入发布流程后再线上生效' }, 240)
}

function findActiveWhitelistMatch(featureId: EntityId, userId: string) {
  const now = Date.now()
  for (const test of abWhitelistTests.filter((item) => item.featureId === featureId)) {
    if (test.status === 'active' && new Date(test.expiresAt).getTime() <= now) {
      test.status = 'expired'
    }
    if (test.status !== 'active') continue
    const matchedRuleId = Object.entries(test.ruleUserIds).find(([, userIds]) =>
      userIds.map((item) => item.trim()).includes(userId),
    )?.[0]
    if (matchedRuleId) return { test, ruleId: matchedRuleId }
  }
  return undefined
}

function createDefaultWhitelistRule(variantId?: EntityId): AudienceRule {
  return {
    ruleId: 'else',
    name: '白名单默认规则',
    order: 999,
    conditions: [],
    deliveryType: variantId ? 'single_variant' : 'no_value',
    variantId,
  }
}

function buildWhitelistVersion(feature: FeatureFlag, test: WhitelistTest): FeatureVersion | undefined {
  const existingVersion = test.versionId ? findFeatureVersion(test.versionId) : undefined
  if ((test.versionMode ?? 'existing') !== 'custom') {
    return existingVersion ?? findFeatureVersion(feature.currentVersionId ?? '')
  }
  const variants: FeatureVariant[] = test.customVariants ?? []
  const firstVariant = variants[0]
  return {
    versionId: test.versionId ?? `${test.id}_custom`,
    featureId: feature.featureId,
    versionNo: '白名单自定义',
    versionStatus: 'full',
    variantType: inferFeatureVariantType(firstVariant?.value),
    variants,
    audienceRules: [...(test.customAudienceRules ?? [])].sort((left, right) => left.order - right.order),
    defaultRule: createDefaultWhitelistRule(firstVariant?.variantId),
    publishTraffic: 100,
    createdBy: test.createdBy,
    createdAt: test.createdAt,
  }
}

function selectWeightedVariant(rule: AudienceRule, userId: string) {
  if (!rule.variantWeights?.length) return undefined
  const bucket = hashSubject(`${rule.ruleId}:${userId}`) % 100
  let accumulated = 0
  return rule.variantWeights.find((item) => {
    accumulated += item.weight
    return bucket < accumulated
  })?.variantId
}

function resolveWhitelistDecision(
  feature: FeatureFlag,
  version: FeatureVersion | undefined,
  ruleId: EntityId,
  userId: string,
  localDefault?: unknown,
): FeatureDecisionResult {
  const ruleCandidates = version ? [...version.audienceRules, version.defaultRule] : []
  const rule = ruleCandidates.find((item) => item.ruleId === ruleId) ?? version?.defaultRule
  const variantId = rule?.variantId ?? (rule ? selectWeightedVariant(rule, userId) : undefined) ?? version?.variants[0]?.variantId
  const variant = version?.variants.find((item) => item.variantId === variantId)
  return {
    featureKey: feature.key,
    value: variant?.value ?? localDefault,
    variantId: variant?.variantId,
    variantName: variant?.name,
    versionId: version?.versionId,
    decisionSource: 'whitelist',
    decisionReason: 'matched_whitelist',
    ruleId: rule?.ruleId,
    isDefaultValue: !variant,
  }
}

function isRunningExperimentHit(feature: FeatureFlag, userId: string, manualHit?: boolean) {
  if (manualHit === true) return true
  if (manualHit === false) return false
  const runningExperiment = feature.relatedExperimentIds
    .map((experimentId) => findExperiment(experimentId))
    .find((experiment): experiment is Experiment => experiment?.status === 'RUNNING')
  if (!runningExperiment) return false
  return (hashSubject(`${runningExperiment.id}:${userId}`) % 100) < runningExperiment.trafficRatio
}

export const decideAbFeature = (input: {
  featureId: EntityId
  userId: string
  context: Record<string, unknown>
  inWhitelist?: boolean
  inExperiment?: boolean
  localDefault?: unknown
}): Promise<FeatureDecisionResult> => {
  const feature = abFeatureFlags.find((item) => item.featureId === input.featureId)
  const version = abFeatureVersions.find((item) => item.versionId === feature?.currentVersionId)
  if (feature) {
    const whitelistMatch = input.inWhitelist
      ? findActiveWhitelistMatch(feature.featureId, input.userId) ?? { test: abWhitelistTests.find((test) => test.featureId === feature.featureId), ruleId: 'else' }
      : findActiveWhitelistMatch(feature.featureId, input.userId)
    if (whitelistMatch?.test) {
      return resolveMock(
        resolveWhitelistDecision(
          feature,
          buildWhitelistVersion(feature, whitelistMatch.test),
          whitelistMatch.ruleId,
          input.userId,
          input.localDefault,
        ),
        120,
      )
    }
  }
  return resolveMock(
    evaluateFeatureDecision({
      feature,
      version,
      userId: input.userId,
      context: input.context,
      inWhitelist: false,
      inExperiment: feature ? isRunningExperimentHit(feature, input.userId, input.inExperiment) : input.inExperiment,
      localDefault: input.localDefault,
    }),
    120,
  )
}

export const getAbOperationLogs = (objectId?: EntityId): Promise<OperationLog[]> =>
  resolveMock(
    (objectId ? abOperationLogs.filter((log) => log.objectId === objectId) : abOperationLogs)
      .filter((log) => canViewOperationLog(log)),
  )

export const getAbExperimentTemplates = (): Promise<ExperimentTemplate[]> => resolveMock(abExperimentTemplates)

export const getAbHitQueryTemplates = (): Promise<HitQueryTemplate[]> => resolveMock(abHitQueryTemplates)

function hashSubject(value: string) {
  return value.split('').reduce((total, char) => total + char.charCodeAt(0), 0)
}

export const queryAbExperimentHits = (request: HitQueryRequest): Promise<HitQueryResult[]> => {
  const subjectHash = hashSubject(request.subjectId || 'anonymous')
  const queriedAt = nowIso()
  const results = abExperiments
    .filter((experiment) => !request.experimentId || experiment.id === request.experimentId)
    .map((experiment, index): HitQueryResult => {
      const variants = abExperimentVariants.filter((variant) => variant.experimentId === experiment.id)
      const bucket = (subjectHash + index * 17) % 100
      const whitelist = /qa|test|ssid/i.test(request.subjectId)
      const audiencePassed = bucket % 7 !== 0
      const trafficHit = bucket < experiment.trafficRatio
      const hitStatus = whitelist ? 'whitelist' : !audiencePassed ? 'excluded' : trafficHit ? 'hit' : 'not_hit'
      const variant =
        hitStatus === 'hit' || hitStatus === 'whitelist'
          ? variants[(subjectHash + index) % Math.max(variants.length, 1)]
          : undefined
      return {
        id: createId('hit'),
        subjectId: request.subjectId,
        subjectType: request.subjectType,
        experimentId: experiment.id,
        experimentName: experiment.name,
        hitStatus,
        variantName: variant?.name ?? '-',
        decisionSource: whitelist ? 'whitelist' : !audiencePassed ? 'audience' : trafficHit ? 'traffic' : 'feature_default',
        audiencePassed,
        trafficBucket: bucket,
        reason:
          hitStatus === 'whitelist'
            ? '命中测试白名单，优先返回指定版本'
            : hitStatus === 'excluded'
              ? '未满足受众条件'
              : hitStatus === 'hit'
                ? '受众通过且落入实验流量桶'
                : '受众通过但未落入实验流量桶',
        queriedAt,
      }
    })
    .filter((result) => !request.hitStatus || request.hitStatus === 'all' || result.hitStatus === request.hitStatus)

  const sorted = [...results].sort((left, right) => {
    const direction = request.sortOrder === 'asc' ? 1 : -1
    if (request.sortBy === 'experimentName') return left.experimentName.localeCompare(right.experimentName) * direction
    if (request.sortBy === 'hitStatus') return left.hitStatus.localeCompare(right.hitStatus) * direction
    return left.queriedAt.localeCompare(right.queriedAt) * direction
  })
  return resolveMock(sorted)
}

export const diagnoseAbExperimentHit = (input: {
  subjectId: string
  experimentId: EntityId
}): Promise<HitDiagnosisResult> => {
  const experiment = findExperiment(input.experimentId) ?? abExperiments[0]
  const hit = experiment
    ? queryAbExperimentHits({
        subjectId: input.subjectId,
        subjectType: 'uid',
        experimentId: experiment.id,
        hitStatus: 'all',
        sortBy: 'queriedAt',
        sortOrder: 'desc',
      })
    : Promise.resolve([])
  return hit.then((items) => {
    const result = items[0]
    const blocked = result?.hitStatus === 'excluded' || result?.hitStatus === 'not_hit'
    return {
      id: createId('diagnosis'),
      subjectId: input.subjectId,
      experimentId: experiment?.id ?? input.experimentId,
      experimentName: experiment?.name ?? input.experimentId,
      finalDecision: result ? `${result.hitStatus} / ${result.variantName}` : '实验不存在',
      createdAt: nowIso(),
      stages: [
        { stage: 'identity', status: input.subjectId.trim() ? 'pass' : 'blocked', message: '分流 ID 已解析' },
        { stage: 'permission', status: 'pass', message: '当前用户具备诊断权限' },
        { stage: 'audience', status: result?.audiencePassed ? 'pass' : 'blocked', message: result?.audiencePassed ? '受众规则通过' : '受众规则未通过' },
        { stage: 'whitelist', status: result?.hitStatus === 'whitelist' ? 'pass' : 'warning', message: result?.hitStatus === 'whitelist' ? '白名单优先生效' : '未命中白名单' },
        { stage: 'traffic', status: blocked ? 'blocked' : 'pass', message: result?.reason ?? '无命中结果' },
        { stage: 'variant', status: result?.variantName && result.variantName !== '-' ? 'pass' : 'warning', message: `返回版本：${result?.variantName ?? '-'}` },
        { stage: 'exposure', status: blocked ? 'warning' : 'pass', message: blocked ? '未记录曝光或无需曝光' : '曝光记录可写入' },
      ],
    } satisfies HitDiagnosisResult
  })
}

export const getAbDataDedupTasks = (): Promise<DataDedupTask[]> => resolveMock(abDataDedupTasks)

export const createAbDataDedupTask = (
  draft: DataDedupTaskDraft,
): Promise<{ task: DataDedupTask; message: string }> => {
  const now = nowIso()
  const task: DataDedupTask = {
    id: createId('dedup'),
    name: draft.name,
    experimentId: draft.experimentId,
    scope: draft.scope,
    schedule: draft.schedule,
    windowMinutes: draft.windowMinutes,
    status: draft.schedule === 'daily' ? 'queued' : 'running',
    duplicateRate: 0,
    duplicateRows: 0,
    createdBy: currentOperator.id,
    createdAt: now,
    updatedAt: now,
  }
  abDataDedupTasks.unshift(task)
  persistCreatedMockState({ dataDedupTasks: [task] })
  return resolveMock({ task, message: '查重任务已创建' })
}

export const runAbDataDedupTask = (taskId: EntityId): Promise<{ task?: DataDedupTask; message: string }> => {
  const task = abDataDedupTasks.find((item) => item.id === taskId)
  if (!task) return resolveMock({ message: '查重任务不存在' })
  const seed = hashSubject(task.id)
  task.status = 'success'
  task.duplicateRows = seed % 240
  task.duplicateRate = Number((task.duplicateRows / 100000).toFixed(4))
  task.downloadUrl = `/mock-downloads/abtest/dedup/${task.id}.csv`
  task.lastRunAt = nowIso()
  task.updatedAt = task.lastRunAt
  persistCreatedMockState({ dataDedupTasks: [task] })
  return resolveMock({ task, message: '查重任务已运行完成' })
}

export const downloadAbDataDedupTask = (taskId: EntityId): Promise<{ task?: DataDedupTask; message: string }> => {
  const task = abDataDedupTasks.find((item) => item.id === taskId)
  if (!task) return resolveMock({ message: '查重任务不存在' })
  if (!task.downloadUrl) task.downloadUrl = `/mock-downloads/abtest/dedup/${task.id}.csv`
  persistCreatedMockState({ dataDedupTasks: [task] })
  return resolveMock({ task, message: `查重结果已生成：${task.downloadUrl}` })
}

export const getAbExperimentBoards = (): Promise<ExperimentBoard[]> => resolveMock(abExperimentBoards)

export const saveAbExperimentBoard = (
  draft: ExperimentBoardDraft & { id?: EntityId; widgets?: ExperimentBoard['widgets'] },
): Promise<{ board: ExperimentBoard; message: string }> => {
  const now = nowIso()
  const existing = draft.id ? abExperimentBoards.find((board) => board.id === draft.id) : undefined
  const board: ExperimentBoard = {
    id: existing?.id ?? createId('board'),
    name: draft.name,
    description: draft.description,
    ownerId: existing?.ownerId ?? currentOperator.id,
    visibility: draft.visibility,
    authorizedUserIds: draft.authorizedUserIds,
    timeConfig: draft.timeConfig,
    widgets: draft.widgets ?? existing?.widgets ?? [],
    shareToken: existing?.shareToken ?? createId('share'),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
  const index = abExperimentBoards.findIndex((item) => item.id === board.id)
  if (index >= 0) abExperimentBoards.splice(index, 1, board)
  else abExperimentBoards.unshift(board)
  persistCreatedMockState({ experimentBoards: [board] })
  return resolveMock({ board, message: existing ? '看板已保存' : '看板已创建' })
}

export const copyAbExperimentBoardLink = (boardId: EntityId): Promise<{ url: string; message: string }> => {
  const board = abExperimentBoards.find((item) => item.id === boardId)
  const token = board?.shareToken ?? createId('share')
  return resolveMock({ url: `${window.location.origin}/ab-testing/boards?share=${token}`, message: '看板链接已复制' })
}

export const calculateAbBoardDiff = (boardId: EntityId): Promise<BoardDiffResult[]> => {
  const board = abExperimentBoards.find((item) => item.id === boardId)
  const widgets = board?.widgets.filter((widget) => widget.type === 'metric' || widget.type === 'diff') ?? []
  return resolveMock(
    widgets.map((widget, index) => {
      const baseline = Number((0.2 + index * 0.04).toFixed(4))
      const current = Number((baseline * (1.04 + index * 0.02)).toFixed(4))
      const diffAbs = Number((current - baseline).toFixed(4))
      return {
        id: createId('board_diff'),
        widgetId: widget.id,
        title: widget.title,
        baselineValue: baseline,
        currentValue: current,
        diffAbs,
        diffRel: Number((diffAbs / baseline).toFixed(4)),
        status: diffAbs > 0 ? 'up' : diffAbs < 0 ? 'down' : 'flat',
      } satisfies BoardDiffResult
    }),
  )
}

export const abTestingService = {
  getWorkspaceSummary: getAbWorkspaceSummary,
  getExperiments: getAbExperiments,
  getExperiment: getAbExperiment,
  getExperimentVariants: getAbExperimentVariants,
  getExperimentParamSchemas: getAbExperimentParamSchemas,
  getExperimentPlanningBundle: getAbExperimentPlanningBundle,
  getExperimentTemplates: getAbExperimentTemplates,
  getHitQueryTemplates: getAbHitQueryTemplates,
  queryExperimentHits: queryAbExperimentHits,
  diagnoseExperimentHit: diagnoseAbExperimentHit,
  getDataDedupTasks: getAbDataDedupTasks,
  createDataDedupTask: createAbDataDedupTask,
  runDataDedupTask: runAbDataDedupTask,
  downloadDataDedupTask: downloadAbDataDedupTask,
  getExperimentBoards: getAbExperimentBoards,
  saveExperimentBoard: saveAbExperimentBoard,
  copyExperimentBoardLink: copyAbExperimentBoardLink,
  calculateBoardDiff: calculateAbBoardDiff,
  getBackendIntegrationStatus: getAbBackendIntegrationStatus,
  validateExperimentDraft: validateAbExperimentDraft,
  submitExperimentForDebug: submitAbExperimentForDebug,
  transitionExperiment: transitionAbExperiment,
  safeEditExperiment: safeEditAbExperiment,
  getExperimentPermissionGrants: getAbExperimentPermissionGrants,
  updateExperimentPermissions: updateAbExperimentPermissions,
  scaleExperimentTraffic: scaleAbExperimentTraffic,
  refreshSmoothEffectTask,
  operateSmoothEffectTask,
  closeExperimentVariant: closeAbExperimentVariant,
  calculateTraffic: calculateAbTraffic,
  getTrafficLayers: getAbTrafficLayers,
  getMutexDomainGroups: getAbMutexDomainGroups,
  getMetricGroups: getAbMetricGroups,
  getMetricDirectoryGroups: getAbMetricDirectoryGroups,
  getMetrics: getAbMetrics,
  getMetricTemplates: getAbMetricTemplates,
  getMetricPermissionRoleMatrix: getAbMetricPermissionRoleMatrix,
  getMetricBindingSnapshots: getAbMetricBindingSnapshots,
  createMetricTemplate: createAbMetricTemplate,
  updateMetricTemplate: updateAbMetricTemplate,
  deleteMetricTemplate: deleteAbMetricTemplate,
  getAlarmTasks: getAbAlarmTasks,
  getAlarmTriggerRecords: getAbAlarmTriggerRecords,
  getReceiverGroups: getAbReceiverGroups,
  saveAlarmTask: saveAbAlarmTask,
  toggleAlarmTaskEnabled: toggleAbAlarmTaskEnabled,
  deleteAlarmTask: deleteAbAlarmTask,
  saveReceiverGroup: saveAbReceiverGroup,
  deleteReceiverGroup: deleteAbReceiverGroup,
  getMustSeeMetricTrends: getAbMustSeeMetricTrends,
  saveMetricDirectoryGroup: saveAbMetricDirectoryGroup,
  saveMetricGroup: saveAbMetricGroup,
  createMetricGroup: createAbMetricGroup,
  copyMetricGroup: copyAbMetricGroup,
  mergeMetricGroups: mergeAbMetricGroups,
  offlineMetricGroup: offlineAbMetricGroup,
  toggleMetricMustSee: toggleAbMetricMustSee,
  getReportOverview: getAbReportOverview,
  queryMetricResults: queryAbMetricResults,
  getFunnelReport: getAbFunnelReport,
  getCohortReport: getAbCohortReport,
  queryTemporaryRetention: queryAbTemporaryRetention,
  getHeatmapReport: getAbHeatmapReport,
  getMabReport: getAbMabReport,
  getSensitiveInsightTasks: getAbSensitiveInsightTasks,
  getReportExportTasks: getAbReportExportTasks,
  createReportExportTask: createAbReportExportTask,
  cancelReportExportTask: cancelAbReportExportTask,
  retryReportExportTask: retryAbReportExportTask,
  getFeatureFlags: getAbFeatureFlags,
  getFeatureVersions: getAbFeatureVersions,
  getPublishPlans: getAbPublishPlans,
  getWhitelistTests: getAbWhitelistTests,
  createFeatureFlag: createAbFeatureFlag,
  createFeatureVersion: createAbFeatureVersion,
  disableFeatureVersion: disableAbFeatureVersion,
  publishFeatureVersion: publishAbFeatureVersion,
  cancelFeaturePublish: cancelAbFeaturePublish,
  rollbackFeature: rollbackAbFeature,
  createWhitelistTest: createAbWhitelistTest,
  terminateWhitelistTest: terminateAbWhitelistTest,
  copyWhitelistTest: copyAbWhitelistTest,
  deleteWhitelistTest: deleteAbWhitelistTest,
  changeFeatureLifecycle: changeAbFeatureLifecycle,
  updateFeaturePermission: updateAbFeaturePermission,
  solidifyExperimentToFeature,
  decideFeature: decideAbFeature,
  getOperationLogs: getAbOperationLogs,
  apiPaths: abTestingApiPaths,
}
