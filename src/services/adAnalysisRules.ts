import type {
  AdAccessContext,
  AdMetadataTemplate,
  AdQueryFailureState,
  AdValidationResult,
} from '../types/adAnalysis'

export const compareAdVersion = (left: string, right: string) => {
  const leftParts = left.split('.').map(Number)
  const rightParts = right.split('.').map(Number)
  const length = Math.max(leftParts.length, rightParts.length)
  for (let index = 0; index < length; index += 1) {
    const diff = (leftParts[index] ?? 0) - (rightParts[index] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

export const validateAdMetricFormula = (
  formula: string,
  variables: string[],
): AdValidationResult => {
  const trimmed = formula.trim()
  if (!trimmed) return { valid: false, message: '公式不能为空。' }
  if (!/^[A-Z0-9+\-*/().\s]+$/.test(trimmed)) {
    return { valid: false, message: '公式仅支持变量、数字常量、四则运算符和括号。' }
  }

  const variableSet = new Set(variables)
  const referencedVariables = trimmed.match(/[A-Z]/g) ?? []
  const missing = referencedVariables.find((variable) => !variableSet.has(variable))
  if (missing) return { valid: false, message: `公式中的变量 ${missing} 不存在。` }

  let balance = 0
  for (const char of trimmed) {
    if (char === '(') balance += 1
    if (char === ')') balance -= 1
    if (balance < 0) return { valid: false, message: '括号必须成对。' }
  }
  if (balance !== 0) return { valid: false, message: '括号必须成对。' }

  if (/[+*/-]\s*[+*/]/.test(trimmed)) {
    return { valid: false, message: '不允许连续运算符。' }
  }

  if (/\/\s*0+(\.0+)?(?![0-9.])/.test(trimmed)) {
    return { valid: false, message: '除法分母不能为固定 0。' }
  }

  return { valid: true }
}

export const getAdQueryFailure = (context: AdAccessContext): AdQueryFailureState | null => {
  if (!context.permissions.viewAnalysis) {
    return {
      reason: 'permission_denied',
      title: '权限不足',
      message: '当前账号暂无广告投放分析查看权限，请联系项目管理员开通后重试。',
      action: '检查角色授权、报告授权用户和数据范围授权。',
    }
  }

  if (context.dataSourceAvailable === false) {
    return {
      reason: 'data_source_unavailable',
      title: '数据源不可用',
      message: '广告监测数据源当前不可用，无法生成查询结果或下载文件。',
      action: '检查媒体监测链路、数据源健康状态和最近一次同步任务。',
    }
  }

  if (!context.dataFusionReady || !context.idMappingReady || !context.monitoringDataReady) {
    return {
      reason: 'data_ingestion_incomplete',
      title: '数据接入未完成',
      message: '数据融合、ID Mapping 或广告监测数据接入尚未完成，查询结果不可验收。',
      action: '完成数据融合任务、ID Mapping 任务和广告监测数据接入后再查询。',
    }
  }

  return null
}

export const getAdReportGateFailure = (context: AdAccessContext): AdQueryFailureState | null => {
  if (!context.permissions.viewAdReport) {
    return {
      reason: 'permission_denied',
      title: '权限不足',
      message: '当前账号暂无广告投放报表查看权限。',
      action: '检查广告投放报表功能权限。',
    }
  }

  if (!context.vecdpPurchased || !context.iadPurchased) {
    return {
      reason: 'ad_report_not_purchased',
      title: '投放报表未开通',
      message: '广告投放报表需要同时采购 veCDP 和 iAD，且监测链接需在 iAD 内生成。',
      action: '在项目配置中确认 veCDP 与 iAD 采购状态。',
    }
  }

  return getAdQueryFailure(context)
}

export const validateTemplateMetricFormulas = (
  template: AdMetadataTemplate,
  selectedMetricIds?: string[],
): AdQueryFailureState | null => {
  const selected = selectedMetricIds?.length
    ? template.metricConfig.filter((metric) => selectedMetricIds.includes(metric.id))
    : template.metricConfig
  const invalid = selected
    .map((metric) => ({
      metric,
      result: validateAdMetricFormula(metric.formula, metric.conditions.map((condition) => condition.variable)),
    }))
    .find((item) => !item.result.valid)

  if (!invalid) return null

  return {
    reason: 'metric_formula_error',
    title: '指标公式错误',
    message: `指标「${invalid.metric.name}」配置异常：${invalid.result.message}`,
    action: '进入元数据模板编辑指标公式，保存后重新查询。',
  }
}

export const validateMediaEventChain = (
  template: AdMetadataTemplate,
  eventNames: string[],
): AdQueryFailureState | null => {
  const configuredEvents = new Set(template.behaviorEventConfig.map((event) => event.eventName))
  const missingEvents = eventNames.filter((eventName) => eventName && !configuredEvents.has(eventName))
  if (missingEvents.length === 0) return null

  return {
    reason: 'post_event_missing',
    title: '后链路事件缺失',
    message: `当前模板缺少后链路事件：${[...new Set(missingEvents)].join('、')}。`,
    action: '在广告元数据模板中补齐事件映射，或调整查询节点。',
  }
}

export const failureFromMessage = (message: string): AdQueryFailureState => {
  if (message.includes('数据源')) {
    return {
      reason: 'data_source_unavailable',
      title: '数据源不可用',
      message,
      action: '检查广告监测数据源和同步任务。',
    }
  }
  if (message.includes('指标') && message.includes('公式')) {
    return {
      reason: 'metric_formula_error',
      title: '指标公式错误',
      message,
      action: '修正指标公式后重新查询。',
    }
  }
  if (message.includes('权限') || message.includes('无权')) {
    return {
      reason: 'permission_denied',
      title: '权限不足',
      message,
      action: '检查功能权限、报告授权和数据权限。',
    }
  }
  if (message.includes('后链路') || message.includes('事件')) {
    return {
      reason: 'post_event_missing',
      title: '后链路事件缺失',
      message,
      action: '补齐事件配置后重新查询。',
    }
  }
  if (message.includes('接入') || message.includes('融合') || message.includes('Mapping')) {
    return {
      reason: 'data_ingestion_incomplete',
      title: '数据接入未完成',
      message,
      action: '确认数据接入任务全部完成。',
    }
  }
  if (message.includes('veCDP') || message.includes('iAD')) {
    return {
      reason: 'ad_report_not_purchased',
      title: '投放报表未开通',
      message,
      action: '确认 veCDP 与 iAD 采购状态。',
    }
  }
  if (message.includes('暂无广告数据')) {
    return {
      reason: 'no_data',
      title: '暂无数据',
      message,
      action: '调整筛选条件或确认对应数据是否已接入。',
    }
  }
  return {
    reason: 'no_data',
    title: '查询异常',
    message,
    action: '请检查筛选条件、模板配置和项目状态。',
  }
}
