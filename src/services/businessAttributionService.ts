import dayjs from 'dayjs'
import {
  businessAttributionDatasets,
  currentBusinessAttributionUser,
  defaultBusinessAttributionFilter,
  initialBusinessAttributionConfigs,
  initialBusinessAttributionDeliveries,
  initialBusinessAttributionPermissions,
  initialBusinessAttributionReports,
  initialBusinessAttributionSubscriptions,
  initialBusinessAttributionWebhooks,
  initialRegularRunStates,
} from '@/mock/businessAttribution'
import type {
  AnalysisTreeBlockVisible,
  AnalysisTreeConfig,
  AttributionConfig,
  AttributionEmbedQuery,
  AttributionHomeTab,
  AttributionHomeToolbar,
  AttributionPermissionRole,
  AttributionReport,
  AttributionReportBlockVisible,
  AttributionReportCard,
  AttributionReportType,
  AttributionSubscription,
  BusinessDateConfig,
  CompareConfig,
  CreateAttributionConfigForm,
  DimensionAttributionAlgorithm,
  DimensionAttributionRow,
  FilterGroup,
  PermissionGrant,
  RegularRunState,
  ReportDateOption,
  TrialRunResult,
  WebHookConfig,
  WebHookDeliveryRecord,
} from '@/types/businessAttribution'

interface BusinessAttributionStorage {
  configs: AttributionConfig[]
  reports: AttributionReport[]
  subscriptions: AttributionSubscription[]
  webhooks: WebHookConfig[]
  deliveries: WebHookDeliveryRecord[]
  permissions: PermissionGrant[]
  regularRuns: RegularRunState[]
  deletedConfigIds: string[]
}

const storageKey = 'business_attribution_demo_state_v4'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const delay = async (ms = 100): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, ms))
const nowText = (): string => dayjs().format('YYYY-MM-DD HH:mm:ss')
const todayText = (): string => dayjs().format('YYYY-MM-DD')
const makeId = (prefix: string): string => `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
const demoToday = (): dayjs.Dayjs => dayjs('2026-05-25')

const defaultStorage: BusinessAttributionStorage = {
  configs: initialBusinessAttributionConfigs,
  reports: initialBusinessAttributionReports,
  subscriptions: initialBusinessAttributionSubscriptions,
  webhooks: initialBusinessAttributionWebhooks,
  deliveries: initialBusinessAttributionDeliveries,
  permissions: initialBusinessAttributionPermissions,
  regularRuns: initialRegularRunStates,
  deletedConfigIds: [],
}

function readStorage(): BusinessAttributionStorage {
  if (typeof window === 'undefined') return clone(defaultStorage)
  const stored = window.localStorage.getItem(storageKey)
  if (!stored) return clone(defaultStorage)

  try {
    const parsed = JSON.parse(stored) as Partial<BusinessAttributionStorage>
    return {
      configs: parsed.configs ?? clone(initialBusinessAttributionConfigs),
      reports: parsed.reports ?? clone(initialBusinessAttributionReports),
      subscriptions: parsed.subscriptions ?? clone(initialBusinessAttributionSubscriptions),
      webhooks: parsed.webhooks ?? clone(initialBusinessAttributionWebhooks),
      deliveries: parsed.deliveries ?? clone(initialBusinessAttributionDeliveries),
      permissions: parsed.permissions ?? clone(initialBusinessAttributionPermissions),
      regularRuns: parsed.regularRuns ?? clone(initialRegularRunStates),
      deletedConfigIds: parsed.deletedConfigIds ?? [],
    }
  } catch {
    return clone(defaultStorage)
  }
}

function writeStorage(next: BusinessAttributionStorage): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(storageKey, JSON.stringify(next))
}

let storage = readStorage()

function saveStorage(): void {
  writeStorage(storage)
}

function sortByUpdatedAt(configs: AttributionConfig[]): AttributionConfig[] {
  return [...configs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

function hasPermission(role: AttributionPermissionRole, action: 'view' | 'edit' | 'manage'): boolean {
  if (action === 'view') return ['VIEW', 'EDIT', 'MANAGE'].includes(role)
  if (action === 'edit') return ['EDIT', 'MANAGE'].includes(role)
  return role === 'MANAGE'
}

function highestRole(roles: AttributionPermissionRole[]): AttributionPermissionRole {
  if (roles.includes('MANAGE')) return 'MANAGE'
  if (roles.includes('EDIT')) return 'EDIT'
  return 'VIEW'
}

function getResolvedRole(config: AttributionConfig): AttributionPermissionRole {
  const explicitRoles = storage.permissions
    .filter((grant) => grant.resourceId === config.id)
    .filter((grant) => grant.granteeId === currentBusinessAttributionUser.id || grant.granteeType === 'USER_GROUP')
    .map((grant) => grant.role)

  if (config.creatorId === currentBusinessAttributionUser.id) {
    explicitRoles.push('MANAGE')
  }

  return highestRole(explicitRoles.length > 0 ? explicitRoles : [config.permissionSummary.currentUserRole])
}

function getLatestReport(configId: string): AttributionReport | undefined {
  return storage.reports
    .filter((report) => report.configId === configId)
    .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0]
}

function getLatestSuccessfulReport(configId: string): AttributionReport | undefined {
  return storage.reports
    .filter((report) => report.configId === configId && report.runStatus === 'SUCCESS')
    .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0]
}

function hydrateReportSnapshot(report: AttributionReport): AttributionReport {
  const next = clone(report)
  if (next.reportType !== 'ANALYSIS_TREE') return next

  const template = initialBusinessAttributionReports.find(
    (item): item is Extract<AttributionReport, { reportType: 'ANALYSIS_TREE' }> => item.reportType === 'ANALYSIS_TREE',
  )
  if (!template) return next

  const treeReport = next as Extract<AttributionReport, { reportType: 'ANALYSIS_TREE' }> & {
    treeResult?: Extract<AttributionReport, { reportType: 'ANALYSIS_TREE' }>['treeResult']
  }
  treeReport.treeResult ??= clone(template.treeResult)
  treeReport.groupOptions = treeReport.groupOptions?.length ? treeReport.groupOptions : clone(template.groupOptions)
  treeReport.activeGroupValue ||= template.activeGroupValue
  treeReport.webTabs ??= clone(template.webTabs)
  return treeReport
}

function findConfig(configId: string): AttributionConfig {
  const config = storage.configs.find((item) => item.id === configId)
  if (!config) throw new Error('归因配置不存在或已被删除。')
  return config
}

function findDataset(config: AttributionConfig) {
  return businessAttributionDatasets.find((dataset) => dataset.id === config.coreMetric.datasetId)
}

function normalizeWeekday(value: number): number {
  return value === 0 ? 7 : value
}

function startOfWeekByDay(date: dayjs.Dayjs, weekStartDay = 1): dayjs.Dayjs {
  const current = normalizeWeekday(date.day())
  const offset = (current - weekStartDay + 7) % 7
  return date.subtract(offset, 'day').startOf('day')
}

export function deriveComparePeriod(businessDate: BusinessDateConfig, generatedBy: CompareConfig['generatedBy'] = 'REGULAR'): CompareConfig {
  const today = demoToday()

  if (businessDate.granularity === 'DAY') {
    const compare = today.subtract(1, 'day')
    const base = today.subtract(2, 'day')
    return {
      basePeriod: { start: base.format('YYYY-MM-DD'), end: base.format('YYYY-MM-DD'), label: 'BASE' },
      comparePeriod: { start: compare.format('YYYY-MM-DD'), end: compare.format('YYYY-MM-DD'), label: 'COMPARE' },
      reportDate: today.format('YYYY-MM-DD'),
      generatedBy,
    }
  }

  if (businessDate.granularity === 'WEEK') {
    const compareStart = startOfWeekByDay(today, businessDate.weekStartDay ?? 1).subtract(7, 'day')
    const compareEnd = compareStart.add(6, 'day')
    const baseStart = compareStart.subtract(7, 'day')
    const baseEnd = baseStart.add(6, 'day')
    return {
      basePeriod: { start: baseStart.format('YYYY-MM-DD'), end: baseEnd.format('YYYY-MM-DD'), label: 'BASE' },
      comparePeriod: { start: compareStart.format('YYYY-MM-DD'), end: compareEnd.format('YYYY-MM-DD'), label: 'COMPARE' },
      reportDate: today.format('YYYY-MM-DD'),
      generatedBy,
    }
  }

  if (businessDate.granularity === 'BIWEEK') {
    const compareStart = startOfWeekByDay(today, businessDate.weekStartDay ?? 1).subtract(14, 'day')
    const compareEnd = compareStart.add(13, 'day')
    const baseStart = compareStart.subtract(14, 'day')
    const baseEnd = baseStart.add(13, 'day')
    return {
      basePeriod: { start: baseStart.format('YYYY-MM-DD'), end: baseEnd.format('YYYY-MM-DD'), label: 'BASE' },
      comparePeriod: { start: compareStart.format('YYYY-MM-DD'), end: compareEnd.format('YYYY-MM-DD'), label: 'COMPARE' },
      reportDate: today.format('YYYY-MM-DD'),
      generatedBy,
    }
  }

  if (businessDate.granularity === 'MONTH') {
    const compare = today.subtract(1, 'month')
    const base = today.subtract(2, 'month')
    return {
      basePeriod: { start: base.startOf('month').format('YYYY-MM-DD'), end: base.endOf('month').format('YYYY-MM-DD'), label: 'BASE' },
      comparePeriod: { start: compare.startOf('month').format('YYYY-MM-DD'), end: compare.endOf('month').format('YYYY-MM-DD'), label: 'COMPARE' },
      reportDate: today.format('YYYY-MM-DD'),
      generatedBy,
    }
  }

  const compareEnd = today.subtract(1, 'month').endOf('month')
  const compareStart = compareEnd.subtract(1, 'month').startOf('month')
  const baseEnd = compareStart.subtract(1, 'day').endOf('month')
  const baseStart = baseEnd.subtract(1, 'month').startOf('month')
  return {
    basePeriod: { start: baseStart.format('YYYY-MM-DD'), end: baseEnd.format('YYYY-MM-DD'), label: 'BASE' },
    comparePeriod: { start: compareStart.format('YYYY-MM-DD'), end: compareEnd.format('YYYY-MM-DD'), label: 'COMPARE' },
    reportDate: today.format('YYYY-MM-DD'),
    generatedBy,
  }
}

function toCard(config: AttributionConfig): AttributionReportCard {
  const latestReport = getLatestReport(config.id)
  const regular = storage.regularRuns.find((item) => item.configId === config.id)

  return {
    configId: config.id,
    name: config.name,
    description: config.description,
    reportType: config.reportType,
    lastCalculationDay: latestReport?.calculationDay,
    lastRunStatus: latestReport?.runStatus ?? 'NO_REPORT',
    regularStatus: regular?.enabled ? 'ENABLED' : 'PAUSED',
    pausedBySystem: regular?.pausedBySystem,
    pauseReason: regular?.pauseReason,
    nextRunAt: regular?.nextRunAt,
    skipPauseUntil: regular?.skipPauseUntil,
    creatorName: config.creatorName,
    updatedAt: config.updatedAt,
    permission: getResolvedRole(config),
    embeddedInDashboard: ['ba_anomaly_revenue', 'ba_tree_revenue'].includes(config.id),
  }
}

export function validatePartitionFilter(filterConfig?: FilterGroup): boolean {
  return Boolean(
    filterConfig?.andGroups.some((group) =>
      group.conditions.some(
        (condition) =>
          condition.fieldName === 'p_date' && ['EQ', 'IN', 'BETWEEN', 'GTE', 'LTE'].includes(condition.operator),
      ),
    ),
  )
}

export function validateWebTabUrl(url: string): boolean {
  return /^https?:\/\/.+/i.test(url.trim())
}

export function judgeAnomaly(actual: number, lower: number, upper: number) {
  if (actual < lower) {
    return {
      isAnomaly: true,
      direction: 'LOWER' as const,
      summary: '显著偏低',
      deviationDegree: Math.abs((actual - lower) / lower),
    }
  }

  if (actual > upper) {
    return {
      isAnomaly: true,
      direction: 'HIGHER' as const,
      summary: '显著偏高',
      deviationDegree: Math.abs((actual - upper) / upper),
    }
  }

  return {
    isAnomaly: false,
    direction: 'NORMAL' as const,
    summary: '没有显著变化',
    deviationDegree: null,
  }
}

export function judgeRuleAnomaly(
  baseValue: number,
  compareValue: number,
  upperThresholdPercent?: number,
  lowerThresholdPercent?: number,
): 'HIGHER' | 'LOWER' | 'NORMAL' | 'INVALID_BASE_ZERO' {
  if (baseValue === 0) return 'INVALID_BASE_ZERO'
  const changePercent = (compareValue - baseValue) / baseValue

  if (upperThresholdPercent !== undefined && changePercent > upperThresholdPercent) {
    return 'HIGHER'
  }

  if (lowerThresholdPercent !== undefined && changePercent < -Math.abs(lowerThresholdPercent)) {
    return 'LOWER'
  }

  return 'NORMAL'
}

export function inferDimensionAlgorithm(metricExpression: string): DimensionAttributionAlgorithm {
  const normalized = metricExpression.toLowerCase()

  if (normalized.includes('lod') || normalized.includes('fixed') || normalized.includes('include') || normalized.includes('exclude')) {
    return 'DROP'
  }

  const ratioLike = normalized.includes('/') && normalized.includes('sum(')
  if (ratioLike) {
    return 'PROPORTION'
  }

  return 'ADTRIBUTOR'
}

function wouldCreateCycle(tree: AnalysisTreeConfig): boolean {
  const adjacency = new Map<string, string[]>()
  tree.nodes.forEach((node) => adjacency.set(node.id, []))
  tree.edges.forEach((edge) => {
    adjacency.get(edge.fromNodeId)?.push(edge.toNodeId)
  })

  const visiting = new Set<string>()
  const visited = new Set<string>()

  function visit(nodeId: string): boolean {
    if (visiting.has(nodeId)) return true
    if (visited.has(nodeId)) return false

    visiting.add(nodeId)
    const children = adjacency.get(nodeId) ?? []
    for (const childId of children) {
      if (visit(childId)) return true
    }
    visiting.delete(nodeId)
    visited.add(nodeId)
    return false
  }

  return tree.nodes.some((node) => visit(node.id))
}

function validateBusinessDate(config: AttributionConfig): string[] {
  const errors: string[] = []
  const { businessDate } = config
  const dataset = findDataset(config)

  if (!businessDate.dateField) {
    errors.push('业务日期字段不能为空。')
  }

  if (dataset && !dataset.dateFields.some((field) => field.value === businessDate.dateField)) {
    errors.push('日期字段必须来自所选数据集中的日期类型字段。')
  }

  if (['WEEK', 'BIWEEK'].includes(businessDate.granularity)) {
    if (!businessDate.weekStartDay || !businessDate.weekEndDay) {
      errors.push('周或双周粒度必须配置开始日与结束日。')
    }

    if (businessDate.weekStartDay && businessDate.weekEndDay) {
      const span = ((businessDate.weekEndDay - businessDate.weekStartDay + 7) % 7) + 1
      if (span !== 7) {
        errors.push('周或双周粒度的开始日和结束日必须组成一个完整连续周周期。')
      }
    }
  }

  if (['MONTH', 'BIMONTH'].includes(businessDate.granularity) && businessDate.reportRunDay?.type === 'MONTH_DAY') {
    const day = businessDate.reportRunDay.value ?? 0
    if (day < 1 || day > 31) {
      errors.push('月度报告运行日必须在 1 到 31 之间。')
    }
  }

  return errors
}

function findDuplicateValues(values: string[]): string[] {
  const seen = new Set<string>()
  const duplicated = new Set<string>()
  values.forEach((value) => {
    if (seen.has(value)) duplicated.add(value)
    seen.add(value)
  })
  return Array.from(duplicated)
}

function validateCommonConfig(config: AttributionConfig): string[] {
  const errors: string[] = []
  const dataset = findDataset(config)

  if (!config.reportType) {
    errors.push('必须先选择归因类型。')
  }

  if (!config.coreMetric.metricId || !config.coreMetric.datasetId) {
    errors.push('必须配置核心指标。')
  }

  if (!dataset) {
    errors.push('数据集无权限或不存在。')
  }

  if (dataset && !dataset.metrics.some((metric) => metric.value === config.coreMetric.metricId)) {
    errors.push('指标字段不存在或当前用户无权限。')
  }

  if (!config.coreMetric.metricExpression.trim() || !/^[\w\s()+\-*/.,\u4e00-\u9fa5]+$/.test(config.coreMetric.metricExpression)) {
    errors.push('指标表达式解析失败，请检查指标表达式。')
  }

  if (!validatePartitionFilter(config.filterConfig)) {
    errors.push('必须指定分区日期 p_date 的查询范围，否则无法进行归因运算。')
  }

  errors.push(...validateBusinessDate(config))

  config.webTabs?.forEach((tab) => {
    if (!validateWebTabUrl(tab.url)) {
      errors.push(`网页 Tab「${tab.title}」URL 必须以 http:// 或 https:// 开头。`)
    }
  })

  return errors
}

function validateAnomalyConfig(config: AttributionConfig): string[] {
  const errors: string[] = []
  const anomaly = config.anomalyConfig

  if (!anomaly) {
    errors.push('异动分析必须配置异动检测参数。')
    return errors
  }

  if (anomaly.detectionMode === 'ALGORITHM') {
    if (!anomaly.algorithmConfig) {
      errors.push('算法模式必须配置算法参数。')
    } else {
      if (anomaly.algorithmConfig.sensitivity < 1 || anomaly.algorithmConfig.sensitivity > 100) {
        errors.push('敏感度必须在 1 到 100 之间。')
      }

      if (anomaly.algorithmConfig.observationWindow < 7) {
        errors.push('算法模式至少需要 7 个历史观察周期。')
      }

      if (anomaly.algorithmConfig.ignoreSmallShareMetric?.enabled && !anomaly.algorithmConfig.ignoreSmallShareMetric.metricId) {
        errors.push('开启小流量忽略时，需要选择一个衡量占比指标。')
      }

      if (anomaly.algorithmConfig.ignoreSmallShareMetric?.enabled && anomaly.algorithmConfig.ignoreSmallShareMetric.threshold < 0.02) {
        errors.push('忽略小流量异常项的占比阈值不能低于 2%。')
      }
    }
  }

  if (anomaly.detectionMode === 'RULE') {
    if (!anomaly.ruleConfig) {
      errors.push('规则模式必须配置阈值规则。')
    } else if (anomaly.ruleConfig.upperThresholdPercent === undefined && anomaly.ruleConfig.lowerThresholdPercent === undefined) {
      errors.push('规则模式至少需要配置上阈值或下阈值。')
    } else if (
      judgeRuleAnomaly(
        config.coreMetric.metricName.includes('零基准') ? 0 : 100,
        92,
        anomaly.ruleConfig.upperThresholdPercent,
        anomaly.ruleConfig.lowerThresholdPercent,
      ) === 'INVALID_BASE_ZERO'
    ) {
      errors.push('基准值为 0，无法使用百分比规则判断异常，请调整指标或规则。')
    }
  }

  anomaly.dimensionDrilldowns?.forEach((path) => {
    const dimensionIds = path.dimensions.map((dimension) => dimension.fieldId)
    if (dimensionIds.length < 1) {
      errors.push(`维度拆解「${path.name ?? path.id}」至少选择 1 个维度。`)
    }
    if (dimensionIds.length > 5) {
      errors.push('每条维度拆解路径最多建议 5 个维度，请减少下钻层级。')
    }
    if (findDuplicateValues(dimensionIds).length > 0) {
      errors.push('同一下钻路径中不能重复选择维度。')
    }
  })

  anomaly.metricDisassemblies?.forEach((formula) => {
    if (!formula.formulaName.trim() || !formula.expression.trim()) {
      errors.push('指标拆解公式名称和表达式不能为空。')
    }
    if (formula.factors.length < 1) {
      errors.push(`指标拆解「${formula.formulaName}」至少添加 1 个指标因子。`)
    }
  })

  return errors
}

function validateDimensionAttributionConfig(config: AttributionConfig): string[] {
  const errors: string[] = []
  const dimensionConfig = config.dimensionAttributionConfig

  if (!dimensionConfig || dimensionConfig.attributionViews.length === 0) {
    errors.push('维度归因至少需要配置 1 个归因视角。')
    return errors
  }

  dimensionConfig.attributionViews.forEach((view) => {
    const fieldIds = view.dimensions.map((dimension) => dimension.fieldId)

    if (view.viewType === 'DRILLDOWN' && fieldIds.length < 1) {
      errors.push(`下钻视角「${view.name}」至少选择 1 个维度。`)
    }

    if (view.viewType === 'COMBINATION' && fieldIds.length < 2) {
      errors.push(`组合视角「${view.name}」至少选择 2 个维度。`)
    }

    if (view.viewType === 'AUTO_DISCOVERY' && fieldIds.length < 1) {
      errors.push(`自动发现视角「${view.name}」至少保留 1 个分析维度。`)
    }

    if (findDuplicateValues(fieldIds).length > 0) {
      errors.push(`视角「${view.name}」中不能选择重复维度。`)
    }

    if (fieldIds.some((fieldId) => fieldId.includes('date') || fieldId === 'p_date')) {
      errors.push(`视角「${view.name}」不能选择日期字段作为归因维度。`)
    }
  })

  if (dimensionConfig.showCoreMetricAnomaly && dimensionConfig.anomalyConfig) {
    errors.push(...validateAnomalyConfig({ ...config, anomalyConfig: dimensionConfig.anomalyConfig }))
  }

  return errors
}

function validateMetricAttributionConfig(config: AttributionConfig): string[] {
  const errors: string[] = []
  const metricConfig = config.metricAttributionConfig

  if (!metricConfig || metricConfig.formulas.length === 0) {
    errors.push('指标归因至少需要配置 1 个归因公式。')
    return errors
  }

  const metricNames: string[] = []

  metricConfig.formulas.forEach((formula) => {
    if (!formula.name.trim()) {
      errors.push('指标归因公式名称不能为空。')
    }

    if (formula.attributionMode === 'MULTIPLICATIVE') {
      const factors = formula.multiplicativeConfig?.factors ?? []
      if (factors.length < 2) {
        errors.push(`乘法公式「${formula.name}」至少需要 2 个因子。`)
      }
      factors.forEach((factor) => {
        if (!factor.datasetId || !factor.metricId || !factor.aggregate || !factor.dateField || !factor.displayFormat) {
          errors.push(`乘法公式「${formula.name}」中的每个因子必须配置数据集、指标、聚合方式、日期字段和数据格式。`)
        }
        if (factor.dateField !== config.businessDate.dateField) {
          errors.push(`乘法公式「${formula.name}」中的因子日期粒度必须与核心指标一致。`)
        }
        if (factor.metricName.includes('零') || factor.metricId.includes('zero')) {
          errors.push('乘法归因要求核心指标和所有因子在基准期、观察期均大于 0。')
        }
      })
      metricNames.push(...factors.map((factor) => factor.metricName))
    }

    if (formula.attributionMode === 'COMPOSITE_FORMULA') {
      const composite = formula.compositeFormulaConfig
      if (!composite?.expression.trim()) {
        errors.push(`复合公式「${formula.name}」表达式不能为空。`)
      } else {
        if (/\(\s*\)/.test(composite.expression)) {
          errors.push(`复合公式「${formula.name}」不允许出现空括号。`)
        }
        if (/[+\-*/]{2,}/.test(composite.expression.replace(/\s/g, ''))) {
          errors.push(`复合公式「${formula.name}」不允许连续运算符。`)
        }
        const declaredNames = new Set((composite.factors ?? []).map((factor) => factor.metricName))
        const tokens = composite.expression.match(/[\u4e00-\u9fa5A-Za-z_][\u4e00-\u9fa5A-Za-z0-9_]*/g) ?? []
        const unknownTokens = tokens.filter(
          (token) => !declaredNames.has(token) && !['sum', 'count', 'avg'].includes(token.toLowerCase()),
        )
        if (unknownTokens.length > 0) {
          errors.push(`复合公式「${formula.name}」存在未声明变量：${unknownTokens.join('、')}。`)
        }
        if (/\/\s*0(?!\d)/.test(composite.expression)) {
          errors.push(`复合公式「${formula.name}」除法分母在试运算中不能为 0。`)
        }
      }
      metricNames.push(...(composite?.factors.map((factor) => factor.metricName) ?? []))
    }

    if (formula.attributionMode === 'CORRELATION') {
      const processMetrics = formula.correlationConfig?.processMetrics ?? []
      if (processMetrics.length < 2) {
        errors.push(`相关性归因「${formula.name}」至少添加 2 个过程指标。`)
      }
      processMetrics.forEach((metric) => {
        if (!metric.datasetId || !metric.metricId || !metric.aggregate || !metric.dateField || !metric.displayFormat) {
          errors.push(`相关性归因「${formula.name}」中的每个过程指标必须配置数据集、指标、聚合方式、日期字段和数据格式。`)
        }
      })
      metricNames.push(...processMetrics.map((metric) => metric.metricName))
    }
  })

  if (findDuplicateValues(metricNames).length > 0) {
    errors.push('同一报告内指标名称不能重复。')
  }

  if (metricConfig.showCoreMetricAnomaly && metricConfig.anomalyConfig) {
    errors.push(...validateAnomalyConfig({ ...config, anomalyConfig: metricConfig.anomalyConfig }))
  }

  return errors
}

function validateAnalysisTreeConfig(config: AttributionConfig): string[] {
  const errors: string[] = []
  const tree = config.analysisTreeConfig

  if (!tree || tree.nodes.length === 0) {
    errors.push('指标分析树至少需要 1 个节点。')
    return errors
  }

  if (wouldCreateCycle(tree)) {
    errors.push('分析树节点不能形成循环依赖。')
  }

  const nodeIds = new Set(tree.nodes.map((node) => node.id))
  tree.edges.forEach((edge) => {
    if (!nodeIds.has(edge.fromNodeId) || !nodeIds.has(edge.toNodeId)) {
      errors.push('分析树连线必须连接已存在的节点。')
    }
  })

  return errors
}

function validateConfigByType(config: AttributionConfig): string[] {
  const errors = validateCommonConfig(config)

  if (config.reportType === 'ANOMALY') {
    errors.push(...validateAnomalyConfig(config))
  }

  if (config.reportType === 'DIMENSION_ATTRIBUTION') {
    errors.push(...validateDimensionAttributionConfig(config))
  }

  if (config.reportType === 'METRIC_ATTRIBUTION') {
    errors.push(...validateMetricAttributionConfig(config))
  }

  if (config.reportType === 'ANALYSIS_TREE') {
    errors.push(...validateAnalysisTreeConfig(config))
  }

  return errors
}

function validateCustomPeriodRange(config: AttributionConfig, basePeriod: { start: string; end: string }, comparePeriod: { start: string; end: string }): string[] {
  const errors: string[] = []
  const ranges = [basePeriod, comparePeriod]

  ranges.forEach((range) => {
    if (!dayjs(range.start).isValid() || !dayjs(range.end).isValid()) {
      errors.push('自定义运算日期格式不正确。')
    }
    if (dayjs(range.start).isAfter(dayjs(range.end))) {
      errors.push('自定义运算开始日期不能晚于结束日期。')
    }
  })

  const expectedDays: Partial<Record<BusinessDateConfig['granularity'], number>> = {
    DAY: 1,
    WEEK: 7,
    BIWEEK: 14,
  }
  const expected = expectedDays[config.businessDate.granularity]

  if (expected) {
    ranges.forEach((range) => {
      const days = dayjs(range.end).diff(dayjs(range.start), 'day') + 1
      if (days !== expected) {
        errors.push(`${config.businessDate.granularity} 粒度要求基准期和观察期都为 ${expected} 天。`)
      }
    })
  }

  if (config.businessDate.granularity === 'MONTH') {
    ranges.forEach((range) => {
      if (!dayjs(range.start).isSame(dayjs(range.start).startOf('month'), 'day') || !dayjs(range.end).isSame(dayjs(range.end).endOf('month'), 'day')) {
        errors.push('月粒度必须选择两个完整月。')
      }
    })
  }

  if (config.businessDate.granularity === 'BIMONTH') {
    ranges.forEach((range) => {
      const start = dayjs(range.start)
      const end = dayjs(range.end)
      const monthCount = end.diff(start, 'month') + 1
      if (!start.isSame(start.startOf('month'), 'day') || !end.isSame(end.endOf('month'), 'day') || monthCount !== 2) {
        errors.push('双月粒度必须选择两个完整连续月份。')
      }
    })
  }

  return Array.from(new Set(errors))
}

function ensureDefaultSubscription(config: AttributionConfig): void {
  const exists = storage.subscriptions.some((subscription) => subscription.configId === config.id && subscription.creatorId === 'system')
  if (exists) return

  storage.subscriptions.unshift({
    id: makeId('sub_default'),
    configId: config.id,
    name: `默认订阅 · ${config.name}`,
    displayDate: 'CALCULATION_DAY',
    pushChannel: 'FEISHU_USER',
    recipients: [{ id: currentBusinessAttributionUser.id, name: currentBusinessAttributionUser.name, type: 'USER' }],
    frequency: 'AFTER_EACH_REGULAR_RUN',
    pushTime: '09:00',
    enabled: true,
    creatorId: 'system',
    creatorName: '系统',
    createdAt: nowText(),
    updatedAt: nowText(),
  })
  config.subscriptionCreatedBySystem = true
}

function makeReportFromTemplate(config: AttributionConfig, generateType: 'TRIAL' | 'CUSTOM' | 'RERUN' | 'REGULAR'): AttributionReport | null {
  if (!config.reportType) return null
  const template = storage.reports.find((report) => report.reportType === config.reportType && report.runStatus === 'SUCCESS')
  if (!template) return null

  const next = clone(template)
  next.reportId = makeId(`report_${config.reportType.toLowerCase()}`)
  next.configId = config.id
  next.configName = config.name
  next.calculationDay = todayText()
  next.generatedAt = nowText()
  next.generateType = generateType
  next.compareConfig = generateType === 'REGULAR' ? deriveComparePeriod(config.businessDate, 'REGULAR') : { ...config.compareConfig, generatedBy: generateType }
  next.webTabs = clone(config.webTabs ?? [])

  if ('primary' in next) {
    next.primary.metricName = config.coreMetric.metricName
  }

  return hydrateReportSnapshot(next)
}

function createDefaultConfig(form: CreateAttributionConfigForm): AttributionConfig {
  const now = nowText()
  const businessDate = clone(initialBusinessAttributionConfigs[0]!.businessDate)

  return {
    id: makeId('ba_config'),
    projectId: 'project_demo',
    name: form.name.trim(),
    description: form.description?.trim(),
    reportType: undefined,
    reportTypeLocked: false,
    status: 'DRAFT',
    creatorId: currentBusinessAttributionUser.id,
    creatorName: currentBusinessAttributionUser.name,
    createdAt: now,
    updatedAt: now,
    coreMetric: clone(initialBusinessAttributionConfigs[0]!.coreMetric),
    businessDate,
    compareConfig: deriveComparePeriod(businessDate, 'TRIAL'),
    filterConfig: clone(defaultBusinessAttributionFilter),
    groupDimensions: [],
    webTabs: [],
    subscriptionCreatedBySystem: false,
    permissionSummary: { currentUserRole: 'MANAGE', granteeCount: 0 },
  }
}

function normalizeConfigForType(config: AttributionConfig): AttributionConfig {
  const next = clone(config)

  if (next.reportType === 'ANOMALY' && !next.anomalyConfig) {
    next.anomalyConfig = clone(initialBusinessAttributionConfigs[0]!.anomalyConfig!)
  }

  if (next.reportType === 'DIMENSION_ATTRIBUTION' && !next.dimensionAttributionConfig) {
    next.dimensionAttributionConfig = clone(initialBusinessAttributionConfigs[1]!.dimensionAttributionConfig!)
  }

  if (next.reportType === 'METRIC_ATTRIBUTION' && !next.metricAttributionConfig) {
    next.metricAttributionConfig = clone(initialBusinessAttributionConfigs[2]!.metricAttributionConfig!)
  }

  if (next.reportType === 'ANALYSIS_TREE' && !next.analysisTreeConfig) {
    next.analysisTreeConfig = clone(initialBusinessAttributionConfigs[3]!.analysisTreeConfig!)
  }

  return next
}

export function applyReportVisibleConfig(config?: AttributionReportBlockVisible) {
  const visible = {
    navigation: true,
    tab: true,
    title: true,
    group: true,
    primary: true,
    bigEvent: true,
    controlPane: true,
    tables: true,
    pureTable: false,
  }

  if (!config) return visible

  const blockVisible = config.autoInsight.reportBlockVisible
  Object.assign(visible, blockVisible)

  if (blockVisible.navigation === false) {
    visible.tab = false
  }

  visible.pureTable = config.autoInsight.reportControl?.pureTable ?? false
  return visible
}

export function applyAnalysisTreeVisibleConfig(config?: AnalysisTreeBlockVisible) {
  return {
    title: config?.autoInsight.reportBlockVisible.title ?? true,
    conclusion: config?.autoInsight.reportBlockVisible.conclusion ?? true,
    analysisTree: config?.autoInsight.reportBlockVisible.analysisTree ?? true,
    conclusionClickEnable: config?.autoInsight.reportControl?.conclusionClickEnable ?? true,
  }
}

export function parseFeatureConfig(value?: string | null): AttributionReportBlockVisible | undefined {
  if (!value) return undefined

  try {
    const decoded = decodeURIComponent(value)
    return JSON.parse(decoded) as AttributionReportBlockVisible
  } catch {
    return undefined
  }
}

export function buildEmbedUrl(configId: string, query: AttributionEmbedQuery = {}): string {
  const params = new URLSearchParams()
  params.set('CalculationDay', query.CalculationDay ?? 'Latest')

  if (query.OnlyRootCause) params.set('OnlyRootCause', query.OnlyRootCause)
  if (query.Algorithms) params.set('Algorithms', query.Algorithms)
  if (query.Advance) params.set('Advance', query.Advance)
  if (query.Inline) params.set('Inline', query.Inline)
  if (query.Feature) params.set('Feature', query.Feature)

  return `/analysis-center/business-attribution/reports/${configId}?${params.toString()}`
}

export function createDownloadRows(rows: DimensionAttributionRow[]): string {
  const header = ['路径', '维度值', '基准值', '观察值', '差值', '贡献率', '贡献值']
  const body = rows.map((row) => [
    row.path.join('>'),
    row.pathValue.join('>'),
    row.baseVal,
    row.cmpVal,
    row.diff,
    row.contributionRate,
    row.contributionValue,
  ])

  return [header, ...body].map((line) => line.join(',')).join('\n')
}

export const businessAttributionService = {
  async getDatasets() {
    await delay()
    return clone(businessAttributionDatasets)
  },

  async listCards(tab: AttributionHomeTab, toolbar: AttributionHomeToolbar): Promise<AttributionReportCard[]> {
    await delay()

    const keyword = toolbar.searchKeyword.trim().toLowerCase()
    const filtered = sortByUpdatedAt(storage.configs)
      .filter((config) => !storage.deletedConfigIds.includes(config.id))
      .filter((config) => (tab === 'CREATED_BY_ME' ? config.creatorId === currentBusinessAttributionUser.id : config.creatorId !== currentBusinessAttributionUser.id))
      .filter((config) => !keyword || `${config.name}${config.description ?? ''}`.toLowerCase().includes(keyword))
      .filter((config) => !toolbar.reportTypeFilter || toolbar.reportTypeFilter === 'ALL' || config.reportType === toolbar.reportTypeFilter)
      .filter((config) => !toolbar.statusFilter || toolbar.statusFilter === 'ALL' || config.status === toolbar.statusFilter)

    return filtered.map(toCard)
  },

  async createConfig(form: CreateAttributionConfigForm): Promise<AttributionConfig> {
    await delay()
    const name = form.name.trim()
    const description = form.description?.trim() ?? ''

    if (name.length < 1 || name.length > 50) {
      throw new Error('名称长度必须在 1 到 50 字符之间。')
    }

    if (description.length > 500) {
      throw new Error('描述不能超过 500 字符。')
    }

    const duplicated = storage.configs.some(
      (config) => config.creatorId === currentBusinessAttributionUser.id && !storage.deletedConfigIds.includes(config.id) && config.name === name,
    )
    if (duplicated) {
      throw new Error('归因配置名称已存在，请修改名称。')
    }

    const config = createDefaultConfig({ name, description })
    storage.configs.unshift(config)
    storage.regularRuns.unshift({ configId: config.id, enabled: true, pausedBySystem: false, nextRunAt: dayjs().add(1, 'day').format('YYYY-MM-DD 08:00:00') })
    storage.permissions.unshift({
      id: makeId('grant_owner'),
      resourceId: config.id,
      granteeType: 'USER',
      granteeId: currentBusinessAttributionUser.id,
      granteeName: currentBusinessAttributionUser.name,
      role: 'MANAGE',
    })
    saveStorage()
    return clone(config)
  },

  async getConfig(configId: string): Promise<AttributionConfig> {
    await delay()
    return clone(findConfig(configId))
  },

  async saveConfigAndTrialRun(config: AttributionConfig): Promise<TrialRunResult> {
    await delay(180)
    const index = storage.configs.findIndex((item) => item.id === config.id)
    if (index < 0) throw new Error('归因配置不存在或已被删除。')

    const previous = storage.configs[index]!
    const next = normalizeConfigForType(config)

    if (previous.reportTypeLocked && previous.reportType && previous.reportType !== next.reportType) {
      throw new Error('归因类型已锁定，如需切换请复制配置后重新选择类型。')
    }

    const errors = validateConfigByType(next)
    next.updatedAt = nowText()

    if (errors.length > 0) {
      next.status = 'TRIAL_FAILED'
      storage.configs[index] = next
      saveStorage()
      return {
        state: 'FAILED',
        message: errors[0] ?? '试运算失败。',
        warnings: errors.slice(1),
        trialJobId: makeId('trial_job'),
      }
    }

    next.status = 'TRIAL_SUCCESS'
    next.reportTypeLocked = Boolean(next.reportType)
    ensureDefaultSubscription(next)
    storage.configs[index] = next

    const report = makeReportFromTemplate(next, 'TRIAL')
    if (report) {
      storage.reports.unshift(report)
    }

    saveStorage()
    return {
      state: 'SUCCESS',
      message: '试运算成功，配置已保存，并已生成一份试运算报告。',
      warnings: next.reportType === 'METRIC_ATTRIBUTION' ? ['若相关性模型质量不足，报告会展示弱模型警告。'] : [],
      trialJobId: makeId('trial_job'),
    }
  },

  async duplicateConfig(configId: string): Promise<AttributionConfig> {
    await delay()
    const source = findConfig(configId)
    const copy = clone(source)
    copy.id = makeId('ba_copy')
    copy.name = `${source.name} 副本`
    copy.status = 'DRAFT'
    copy.reportTypeLocked = false
    copy.creatorId = currentBusinessAttributionUser.id
    copy.creatorName = currentBusinessAttributionUser.name
    copy.createdAt = nowText()
    copy.updatedAt = nowText()
    copy.subscriptionCreatedBySystem = false
    copy.permissionSummary = { currentUserRole: 'MANAGE', granteeCount: 0 }
    storage.configs.unshift(copy)
    saveStorage()
    return clone(copy)
  },

  async deleteConfig(configId: string): Promise<void> {
    await delay()
    storage.configs = storage.configs.filter((config) => config.id !== configId)
    storage.reports = storage.reports.filter((report) => report.configId !== configId)
    storage.subscriptions = storage.subscriptions.filter((subscription) => subscription.configId !== configId)
    storage.permissions = storage.permissions.filter((grant) => grant.resourceId !== configId)
    storage.regularRuns = storage.regularRuns.filter((regular) => regular.configId !== configId)
    storage.deletedConfigIds.push(configId)
    saveStorage()
  },

  async runTrial(configId: string): Promise<TrialRunResult> {
    const config = findConfig(configId)
    return businessAttributionService.saveConfigAndTrialRun(config)
  },

  async toggleRegularRun(configId: string, enabled: boolean, reason: 'MANUAL' | 'NO_VISIT_LONG_TIME' = 'MANUAL'): Promise<RegularRunState> {
    await delay()
    let regular = storage.regularRuns.find((item) => item.configId === configId)
    if (!regular) {
      regular = { configId, enabled, pausedBySystem: false }
      storage.regularRuns.push(regular)
    }

    regular.enabled = enabled
    regular.pausedBySystem = !enabled && reason === 'NO_VISIT_LONG_TIME'
    regular.pauseReason = enabled ? undefined : reason
    regular.nextRunAt = enabled ? dayjs().add(1, 'day').format('YYYY-MM-DD 08:00:00') : undefined

    const config = findConfig(configId)
    config.status = enabled ? 'REGULAR_ENABLED' : 'REGULAR_PAUSED'
    config.updatedAt = nowText()

    saveStorage()
    return clone(regular)
  },

  async skipSystemPause(configId: string): Promise<RegularRunState> {
    await delay()
    const regular = storage.regularRuns.find((item) => item.configId === configId)
    if (!regular) throw new Error('例行任务不存在。')
    regular.skipPauseUntil = dayjs().add(30, 'day').format('YYYY-MM-DD')
    regular.enabled = true
    regular.pausedBySystem = false
    saveStorage()
    return clone(regular)
  },

  async listReportDates(configId: string): Promise<ReportDateOption[]> {
    await delay()
    return storage.reports
      .filter((report) => report.configId === configId)
      .sort((a, b) => b.calculationDay.localeCompare(a.calculationDay))
      .map((report) => ({
        reportId: report.reportId,
        calculationDay: report.calculationDay,
        label: report.generateType === 'CUSTOM' ? `自定义 ${report.calculationDay}` : report.calculationDay,
        runStatus: report.runStatus,
        generateType: report.generateType,
      }))
  },

  async getReport(configId: string, calculationDay?: string | null): Promise<AttributionReport> {
    await delay()
    const reports = storage.reports.filter((report) => report.configId === configId)
    const report =
      calculationDay && calculationDay !== 'Latest'
        ? reports.find((item) => item.calculationDay === calculationDay)
        : reports.filter((item) => item.runStatus === 'SUCCESS').sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0]

    if (!report) {
      throw new Error('暂无可查看的成功报告。')
    }

    return hydrateReportSnapshot(report)
  },

  async createCustomRun(configId: string, basePeriod: { start: string; end: string }, comparePeriod: { start: string; end: string }): Promise<AttributionReport> {
    await delay(180)
    const config = findConfig(configId)
    const errors = validateCustomPeriodRange(config, basePeriod, comparePeriod)
    if (errors.length > 0) {
      throw new Error(errors[0])
    }
    const report = makeReportFromTemplate(config, 'CUSTOM')
    if (!report) throw new Error('当前配置暂不支持自定义运算。')

    report.compareConfig = {
      basePeriod: { ...basePeriod, label: 'BASE' },
      comparePeriod: { ...comparePeriod, label: 'COMPARE' },
      reportDate: todayText(),
      generatedBy: 'CUSTOM',
    }
    report.calculationDay = comparePeriod.end
    report.generatedAt = nowText()
    storage.reports.unshift(report)
    saveStorage()
    return hydrateReportSnapshot(report)
  },

  async regularRun(configId: string): Promise<AttributionReport | null> {
    await delay(180)
    const config = findConfig(configId)
    const regular = storage.regularRuns.find((item) => item.configId === configId)
    if (!regular?.enabled || !config.reportType || config.status === 'DRAFT' || config.status === 'DISABLED') {
      return null
    }

    config.compareConfig = deriveComparePeriod(config.businessDate, 'REGULAR')
    const report = makeReportFromTemplate(config, 'REGULAR')
    if (!report) return null
    report.compareConfig = clone(config.compareConfig)
    report.calculationDay = report.compareConfig.comparePeriod.end
    storage.reports.unshift(report)
    regular.lastRunAt = nowText()
    regular.nextRunAt = dayjs(regular.lastRunAt).add(config.businessDate.granularity === 'DAY' ? 1 : 7, 'day').format('YYYY-MM-DD 08:00:00')
    await businessAttributionService.pushEnabledSubscriptionsForReport(report)
    storage.webhooks
      .filter((webhook) => webhook.enabled)
      .forEach((webhook) => {
        storage.deliveries.unshift({
          id: makeId('delivery_regular'),
          webhookId: webhook.id,
          eventName: report.reportType === 'ANALYSIS_TREE' ? 'ANALYSIS_TREE' : 'ATTRIBUTION_REPORT',
          status: 'SUCCESS',
          attempts: 1,
          payloadPreview: JSON.stringify(businessAttributionService.createWebhookPayload(report, webhook)).slice(0, 180),
          createdAt: nowText(),
        })
      })
    saveStorage()
    return hydrateReportSnapshot(report)
  },

  async rerunReport(configId: string, reportId?: string, triggerSubscription = false): Promise<AttributionReport> {
    await delay(180)
    const config = findConfig(configId)
    const source = reportId ? storage.reports.find((report) => report.reportId === reportId) : getLatestReport(configId)
    const report = makeReportFromTemplate(config, 'RERUN')
    if (!report) throw new Error('重跑失败：没有可用报告快照。')
    if (source) {
      report.compareConfig = clone(source.compareConfig)
      report.calculationDay = source.calculationDay
    }
    storage.reports.unshift(report)

    if (triggerSubscription) {
      storage.deliveries.unshift({
        id: makeId('delivery_manual'),
        webhookId: 'manual_subscription',
        eventName: report.reportType === 'ANALYSIS_TREE' ? 'ANALYSIS_TREE' : 'ATTRIBUTION_REPORT',
        status: 'SUCCESS',
        attempts: 1,
        payloadPreview: `重跑成功后已触发订阅推送：${report.configName}`,
        createdAt: nowText(),
      })
    }

    saveStorage()
    return hydrateReportSnapshot(report)
  },

  async getRegularRun(configId: string): Promise<RegularRunState | undefined> {
    await delay()
    return clone(storage.regularRuns.find((item) => item.configId === configId))
  },

  async listSubscriptions(): Promise<AttributionSubscription[]> {
    await delay()
    return clone(storage.subscriptions)
  },

  async saveSubscription(subscription: AttributionSubscription): Promise<AttributionSubscription> {
    await delay()
    const errors: string[] = []
    if (!subscription.name.trim()) errors.push('订阅名称不能为空。')
    if (subscription.recipients.length === 0) errors.push('至少需要选择一个接收人、群组或 WebHook。')
    if (subscription.pushChannel === 'WEBHOOK' && !subscription.webhookId) errors.push('WebHook 订阅必须选择 WebHook 配置。')
    if (errors.length > 0) throw new Error(errors[0])

    const index = storage.subscriptions.findIndex((item) => item.id === subscription.id)
    const next = { ...subscription, updatedAt: nowText() }
    if (index >= 0) {
      storage.subscriptions[index] = next
    } else {
      storage.subscriptions.unshift({ ...next, id: makeId('sub'), createdAt: nowText(), creatorId: currentBusinessAttributionUser.id, creatorName: currentBusinessAttributionUser.name })
    }
    saveStorage()
    return clone(next)
  },

  async toggleSubscription(subscriptionId: string, enabled: boolean): Promise<void> {
    await delay()
    const subscription = storage.subscriptions.find((item) => item.id === subscriptionId)
    if (!subscription) throw new Error('订阅不存在。')
    subscription.enabled = enabled
    subscription.updatedAt = nowText()
    saveStorage()
  },

  async deleteSubscription(subscriptionId: string): Promise<void> {
    await delay()
    storage.subscriptions = storage.subscriptions.filter((subscription) => subscription.id !== subscriptionId)
    saveStorage()
  },

  async pushLatestReport(subscriptionId: string): Promise<void> {
    await delay(150)
    const subscription = storage.subscriptions.find((item) => item.id === subscriptionId)
    if (!subscription) throw new Error('订阅不存在。')
    const latestReport = getLatestSuccessfulReport(subscription.configId)
    if (!latestReport) throw new Error('暂无可推送的成功报告')
    storage.deliveries.unshift({
      id: makeId('delivery_push'),
      webhookId: subscription.webhookId ?? subscription.pushChannel,
      eventName: latestReport.reportType === 'ANALYSIS_TREE' ? 'ANALYSIS_TREE' : 'ATTRIBUTION_REPORT',
      status: 'SUCCESS',
      attempts: 1,
      payloadPreview: `已使用最新成功报告 ${latestReport.reportId} 发起推送。`,
      createdAt: nowText(),
    })
    saveStorage()
  },

  async pushEnabledSubscriptionsForReport(report: AttributionReport): Promise<void> {
    storage.subscriptions
      .filter((subscription) => subscription.enabled && subscription.configId === report.configId)
      .forEach((subscription) => {
        storage.deliveries.unshift({
          id: makeId('delivery_subscription'),
          webhookId: subscription.webhookId ?? subscription.pushChannel,
          eventName: report.reportType === 'ANALYSIS_TREE' ? 'ANALYSIS_TREE' : 'ATTRIBUTION_REPORT',
          status: 'SUCCESS',
          attempts: 1,
          payloadPreview: `例行报告 ${report.reportId} 已推送到 ${subscription.name}。`,
          createdAt: nowText(),
        })
      })
  },

  createWebhookPayload(report: AttributionReport, webhook: WebHookConfig) {
    const reportTypeMap = {
      ANOMALY: 'ANOMALY',
      DIMENSION_ATTRIBUTION: 'DIM_CONTRIBUTE',
      METRIC_ATTRIBUTION: 'MEASURE_CONTRIBUTE',
      ANALYSIS_TREE: 'ANOMALY',
    } as const

    return {
      secret: webhook.secret,
      event: {
        channel: 'insight',
        timestamp: Date.now(),
        title: 'insight_report',
        payload: {
          calculationDay: report.calculationDay,
          reportType: reportTypeMap[report.reportType],
          reportLink: `/analysis-center/business-attribution/reports/${report.configId}?calculationDay=${report.calculationDay}`,
          sceneId: report.configId,
          sceneGroupId: report.configId,
          bigEvents: report.bigEvents,
          reportUrl: `/openapi/attribution/report/${report.reportId}`,
          token: makeId('token_8h'),
          detail:
            report.reportType === 'ANOMALY'
              ? [{ name: report.configName, method: 'hw', primary: report.primary, disassembly: report.metricDisassemblyRows, drillDown: report.dimensionRows }]
              : report.reportType === 'DIMENSION_ATTRIBUTION'
                ? report.viewResults
                : report.reportType === 'METRIC_ATTRIBUTION'
                  ? report.formulaResults
                  : [report.treeResult],
        },
      },
    }
  },

  createAnalysisTreeWebhookMeta(report: AttributionReport) {
    if (report.reportType !== 'ANALYSIS_TREE') {
      throw new Error('只有指标分析树报告支持两阶段元信息同步。')
    }

    return {
      taskId: report.configId,
      reportId: Number(report.reportId.replace(/\D/g, '').slice(-8) || 0),
      submitJobId: Number(Date.now().toString().slice(-8)),
      name: report.configName,
      user: currentBusinessAttributionUser.name,
      appId: 10001,
      baseDateStr: report.compareConfig.basePeriod.end,
      cmpDateStr: report.compareConfig.comparePeriod.end,
      generateType: report.generateType === 'CUSTOM' ? 'custom' : 'regular',
      granularity: 'week',
      components: report.treeResult.nodes,
    }
  },

  async listWebhooks(): Promise<{ webhooks: WebHookConfig[]; deliveries: WebHookDeliveryRecord[] }> {
    await delay()
    return {
      webhooks: clone(storage.webhooks),
      deliveries: clone(storage.deliveries),
    }
  },

  async saveWebhook(webhook: WebHookConfig): Promise<WebHookConfig> {
    await delay()
    if (!webhook.name.trim()) throw new Error('WebHook 名称必填。')
    if (!validateWebTabUrl(webhook.url)) throw new Error('WebHook URL 必须是 http:// 或 https:// 开头。')
    if (!webhook.secret.trim()) throw new Error('Secret 必填。')
    if (webhook.subscribedEvents.length === 0) throw new Error('至少勾选一个订阅事件。')

    const index = storage.webhooks.findIndex((item) => item.id === webhook.id)
    const next = { ...webhook, updatedAt: nowText() }
    if (index >= 0) {
      storage.webhooks[index] = next
    } else {
      storage.webhooks.unshift({ ...next, id: makeId('webhook'), projectId: 'project_demo', createdAt: nowText() })
    }
    saveStorage()
    return clone(next)
  },

  async testWebhook(webhookId: string): Promise<void> {
    await delay(180)
    const webhook = storage.webhooks.find((item) => item.id === webhookId)
    if (!webhook) throw new Error('WebHook 配置不存在。')
    storage.deliveries.unshift({
      id: makeId('delivery_test'),
      webhookId,
      eventName: webhook.subscribedEvents.includes('ANALYSIS_TREE') ? 'ANALYSIS_TREE' : 'ATTRIBUTION_REPORT',
      status: 'SUCCESS',
      attempts: 1,
      payloadPreview: '测试推送返回 code=0，接收成功。',
      createdAt: nowText(),
    })
    saveStorage()
  },

  async listPermissions(configId: string): Promise<PermissionGrant[]> {
    await delay()
    return clone(storage.permissions.filter((grant) => grant.resourceId === configId))
  },

  async savePermission(grant: PermissionGrant): Promise<PermissionGrant> {
    await delay()
    const config = findConfig(grant.resourceId)
    if (!hasPermission(getResolvedRole(config), 'manage')) {
      throw new Error('只有管理权限用户可以授权。')
    }

    if (grant.granteeId === config.creatorId && grant.role !== 'MANAGE') {
      throw new Error('创建者默认拥有管理权限，不允许降低自己的管理权限。')
    }

    const index = storage.permissions.findIndex((item) => item.id === grant.id)
    const next = { ...grant, id: grant.id || makeId('grant') }
    if (index >= 0) {
      storage.permissions[index] = next
    } else {
      storage.permissions.unshift(next)
    }
    config.permissionSummary.granteeCount = storage.permissions.filter((item) => item.resourceId === config.id).length
    saveStorage()
    return clone(next)
  },

  async deletePermission(grantId: string): Promise<void> {
    await delay()
    const grant = storage.permissions.find((item) => item.id === grantId)
    if (!grant) return
    const config = findConfig(grant.resourceId)
    if (grant.granteeId === config.creatorId) {
      throw new Error('创建者默认拥有管理权限，不允许删除自己的管理权限。')
    }
    storage.permissions = storage.permissions.filter((item) => item.id !== grantId)
    config.permissionSummary.granteeCount = storage.permissions.filter((item) => item.resourceId === config.id).length
    saveStorage()
  },

  async resetDemoState(): Promise<void> {
    await delay()
    storage = clone(defaultStorage)
    saveStorage()
  },
}
