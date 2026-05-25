export type AttributionReportType = 'ANOMALY' | 'DIMENSION_ATTRIBUTION' | 'METRIC_ATTRIBUTION' | 'ANALYSIS_TREE'

export type AttributionConfigStatus =
  | 'DRAFT'
  | 'TRIAL_RUNNING'
  | 'TRIAL_SUCCESS'
  | 'TRIAL_FAILED'
  | 'REGULAR_ENABLED'
  | 'REGULAR_PAUSED'
  | 'DISABLED'

export type AttributionPermissionRole = 'VIEW' | 'EDIT' | 'MANAGE'
export type AttributionRunStatus = 'SUCCESS' | 'FAILED' | 'RUNNING' | 'NO_REPORT'
export type AttributionRegularStatus = 'ENABLED' | 'PAUSED'
export type AttributionHomeTab = 'CREATED_BY_ME' | 'SHARED_WITH_ME'
export type TrialRunState = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED'
export type GenerateType = 'REGULAR' | 'TRIAL' | 'CUSTOM' | 'RERUN'
export type AnomalyDirection = 'HIGHER' | 'LOWER' | 'NORMAL'
export type ContributionFactor = 'POSITIVE' | 'NEGATIVE'

export interface DisplayFormatRule {
  condition: string
  format: string
}

export type DisplayFormat =
  | { type: 'AUTO' }
  | { type: 'NUMBER'; decimalPlaces?: number; useThousandsSeparator?: boolean }
  | { type: 'PERCENT'; decimalPlaces?: number }
  | { type: 'PER_MILLE'; decimalPlaces?: number }
  | { type: 'RAW' }
  | { type: 'PP'; decimalPlaces?: number }
  | { type: 'CUSTOM'; rules: DisplayFormatRule[] }

export interface CoreMetricConfig {
  datasetId: string
  datasetName: string
  metricId: string
  metricName: string
  metricExpression: string
  aggregate: 'SUM' | 'COUNT' | 'COUNT_DISTINCT' | 'AVG' | 'AGG'
  aggregateLocked: boolean
  enableDailyAverage?: boolean
  displayFormat: DisplayFormat
  goalDirection: 'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER'
}

export interface BusinessDateConfig {
  dateField: string
  granularity: 'DAY' | 'WEEK' | 'BIWEEK' | 'MONTH' | 'BIMONTH'
  weekStartDay?: 1 | 2 | 3 | 4 | 5 | 6 | 7
  weekEndDay?: 1 | 2 | 3 | 4 | 5 | 6 | 7
  reportRunDay?: {
    type: 'AUTO_TODAY' | 'WEEKDAY' | 'MONTH_DAY'
    value?: number
  }
}

export interface DateRange {
  start: string
  end: string
}

export interface CompareConfig {
  basePeriod: DateRange & { label: 'BASE' }
  comparePeriod: DateRange & { label: 'COMPARE' }
  reportDate: string
  generatedBy: GenerateType
}

export interface FilterCondition {
  fieldId: string
  fieldName: string
  fieldType: 'STRING' | 'NUMBER' | 'DATE' | 'BOOLEAN'
  operator:
    | 'EQ'
    | 'NE'
    | 'IN'
    | 'NOT_IN'
    | 'GT'
    | 'GTE'
    | 'LT'
    | 'LTE'
    | 'BETWEEN'
    | 'IS_NULL'
    | 'IS_NOT_NULL'
    | 'CONTAINS'
    | 'NOT_CONTAINS'
  value?: unknown
}

export interface OrConditionGroup {
  id: string
  conditions: FilterCondition[]
}

export interface FilterGroup {
  andGroups: OrConditionGroup[]
}

export interface GroupDimensionConfig {
  fieldId: string
  fieldName: string
}

export interface DimensionFieldConfig {
  fieldId: string
  fieldName: string
  displayName?: string
}

export interface DimensionDrilldownPath {
  id: string
  name?: string
  dimensions: DimensionFieldConfig[]
}

export interface MetricFactor {
  metricId: string
  metricName: string
  aggregate: CoreMetricConfig['aggregate']
}

export interface MetricDisassemblyFormula {
  id: string
  formulaName: string
  expression: string
  factors: MetricFactor[]
}

export interface AnomalyConfig {
  detectionMode: 'ALGORITHM' | 'RULE'
  algorithmConfig?: {
    algorithm: 'HOLT_WINTERS' | 'PROPHET'
    sensitivity: number
    observationWindow: number
    smoothingWindow?: number
    ignoreSmallShareMetric?: {
      enabled: boolean
      metricId?: string
      threshold: number
    }
  }
  ruleConfig?: {
    compareTarget: 'LAST_PERIOD' | 'LAST_WEEK_SAME_DAY'
    upperThresholdPercent?: number
    lowerThresholdPercent?: number
  }
  dimensionDrilldowns?: DimensionDrilldownPath[]
  metricDisassemblies?: MetricDisassemblyFormula[]
}

export type DimensionAttributionAlgorithm = 'ADTRIBUTOR' | 'PROPORTION' | 'DROP'

export interface DimensionAttributionView {
  id: string
  name: string
  viewType: 'DRILLDOWN' | 'COMBINATION' | 'AUTO_DISCOVERY'
  algorithm: DimensionAttributionAlgorithm
  dimensions: DimensionFieldConfig[]
  excludedDimensions?: string[]
  topN?: number
}

export interface DimensionAttributionConfig {
  attributionViews: DimensionAttributionView[]
  groupDimensions?: GroupDimensionConfig[]
  showCoreMetricAnomaly: boolean
  anomalyConfig?: AnomalyConfig
  calculateCoreMetricImpact?: boolean
}

export interface MetricFactorConfig {
  id: string
  metricName: string
  datasetId: string
  metricId: string
  aggregate: CoreMetricConfig['aggregate']
  dateField: string
  displayFormat: DisplayFormat
}

export interface MultiplicativeFormulaConfig {
  factors: MetricFactorConfig[]
}

export interface CompositeFormulaConfig {
  expression: string
  factors: MetricFactorConfig[]
}

export interface ProcessMetricConfig extends MetricFactorConfig {}

export interface CorrelationAttributionConfig {
  processMetrics: ProcessMetricConfig[]
  modelConfig: {
    algorithm: 'XGBOOST_SHAP'
    trainTestSplitRatio?: number
    minHistoryPeriods?: number
  }
}

export interface MetricAttributionFormula {
  id: string
  name: string
  attributionMode: 'MULTIPLICATIVE' | 'COMPOSITE_FORMULA' | 'CORRELATION'
  factorDisplayOrder: 'CONTRIBUTION_DESC' | 'CONFIG_ORDER'
  multiplicativeConfig?: MultiplicativeFormulaConfig
  compositeFormulaConfig?: CompositeFormulaConfig
  correlationConfig?: CorrelationAttributionConfig
}

export interface MetricAttributionConfig {
  formulas: MetricAttributionFormula[]
  groupDimensions?: GroupDimensionConfig[]
  showCoreMetricAnomaly: boolean
  anomalyConfig?: AnomalyConfig
}

export interface AnalysisTreeEdge {
  fromNodeId: string
  toNodeId: string
}

export interface DimensionContributionQuery {
  path: string[]
  cursor?: string
  limit?: number
}

export type AnalysisTreeNodeType =
  | 'metric'
  | 'limit'
  | 'metricContribution'
  | 'metricContributionGroup'
  | 'dimensionContribution'
  | 'dimensionContributionGroup'
  | 'anomaly'
  | 'trendAnomaly'
  | 'text'

export interface AnalysisTreeNodeBase {
  id: string
  type: AnalysisTreeNodeType
  name: string
  parentId: string[]
  nextId: string[]
  status: 'unready' | 'running' | 'finish' | 'failed' | 'wontDrill'
  msg?: string
  nlg?: string
  params?: Record<string, unknown>
}

export type AnalysisTreeNode = AnalysisTreeNodeBase & {
  column?: string
  aggregate?: CoreMetricConfig['aggregate']
  filterConfig?: FilterGroup
  isAnomaly?: boolean
  content?: string
  params?: Record<string, unknown> & { query?: DimensionContributionQuery[] }
}

export interface AnalysisTreeConfig {
  treeId: string
  name: string
  nodes: AnalysisTreeNode[]
  edges: AnalysisTreeEdge[]
  granularity: BusinessDateConfig['granularity']
}

export interface WebTabConfig {
  id: string
  title: string
  url: string
  order: number
}

export interface ResourcePermissionSummary {
  currentUserRole: AttributionPermissionRole
  granteeCount: number
  inheritedFromGroup?: boolean
}

export interface AttributionConfig {
  id: string
  projectId: string
  name: string
  description?: string
  reportType?: AttributionReportType
  reportTypeLocked: boolean
  status: AttributionConfigStatus
  creatorId: string
  creatorName: string
  createdAt: string
  updatedAt: string
  coreMetric: CoreMetricConfig
  businessDate: BusinessDateConfig
  compareConfig: CompareConfig
  filterConfig?: FilterGroup
  groupDimensions?: GroupDimensionConfig[]
  anomalyConfig?: AnomalyConfig
  dimensionAttributionConfig?: DimensionAttributionConfig
  metricAttributionConfig?: MetricAttributionConfig
  analysisTreeConfig?: AnalysisTreeConfig
  webTabs?: WebTabConfig[]
  subscriptionCreatedBySystem: boolean
  permissionSummary: ResourcePermissionSummary
}

export interface AttributionHomeToolbar {
  searchKeyword: string
  reportTypeFilter?: AttributionReportType | 'ALL'
  statusFilter?: AttributionConfigStatus | 'ALL'
  createButtonVisible: boolean
}

export interface CreateAttributionConfigForm {
  name: string
  description?: string
}

export interface AttributionReportCard {
  configId: string
  name: string
  description?: string
  reportType?: AttributionReportType
  lastCalculationDay?: string
  lastRunStatus: AttributionRunStatus
  regularStatus: AttributionRegularStatus
  pausedBySystem?: boolean
  pauseReason?: 'NO_VISIT_LONG_TIME' | 'MANUAL'
  nextRunAt?: string
  skipPauseUntil?: string
  creatorName: string
  updatedAt: string
  permission: AttributionPermissionRole
  embeddedInDashboard: boolean
}

export interface ReportDateOption {
  reportId: string
  calculationDay: string
  label: string
  runStatus: Exclude<AttributionRunStatus, 'NO_REPORT'>
  generateType: GenerateType
}

export interface AnomalyStatus {
  isAnomaly: boolean
  direction: AnomalyDirection
  summary: string
  deviationDegree: number | null
}

export interface TrendGraph {
  date: string[]
  self: number[]
  forecast?: number[]
  upper?: number[]
  lower?: number[]
}

export interface AnomalyPrimaryBlock {
  metricName: string
  compareDate: string
  baseDate?: string
  compareValue: number
  diffLastPeriod?: number
  changePercentLastPeriod?: number | null
  diffLastWeek?: number
  changePercentLastWeek?: number | null
  isAnomaly: boolean
  anomalyDirection: AnomalyDirection
  summary: string
  deviationDegree?: number | null
  graph: TrendGraph
}

export interface AnomalyMetricDisassemblyRow {
  metricName: string
  compareValue: number
  baseValue: number
  diff: number
  changePercent: number | null
  significance: 'NO_SIGNIFICANT_CHANGE' | 'SIGNIFICANT_HIGHER' | 'SIGNIFICANT_LOWER'
  deviationDegree: number | null
  graph: TrendGraph
}

export interface AnomalyDimensionRow {
  id: string
  path: string[]
  pathValue: string[]
  compareValue: number
  baseValue: number
  diff: number
  changePercent: number | null
  percentage?: number
  isAnomaly: boolean
  anomalyDirection: AnomalyDirection
  summary: string
  deviationDegree: number | null
  subPathAnomalyNum: number
  children?: AnomalyDimensionRow[]
}

export interface RootCauseDimensionResult {
  dimensionName: string
  surprise: number
  isRootCause: boolean
  rank: number
}

export interface DimensionAttributionRow {
  id: string
  path: string[]
  pathValue: string[]
  baseVal: number
  cmpVal: number
  diff: number
  pop: number | null
  contributionRate: number
  contributionValue: number
  factor: ContributionFactor
  parentBaseVal?: number
  parentCmpVal?: number
  parentDiff?: number
  numeratorBase?: number
  numeratorCompare?: number
  denominatorBase?: number
  denominatorCompare?: number
  epValue?: number
  dropScore?: number
  withinContribution?: number
  betweenContribution?: number
  children?: DimensionAttributionRow[]
}

export type DimensionViewDisplayMode = 'TABLE' | 'WATERFALL' | 'BREAKDOWN_TREE'

export interface DimensionAttributionViewResult {
  viewId: string
  viewName: string
  viewType: DimensionAttributionView['viewType']
  algorithm: DimensionAttributionAlgorithm
  displayModes: DimensionViewDisplayMode[]
  rows: DimensionAttributionRow[]
}

export interface CoreMetricImpactRow {
  dimensionValue: string
  currentMetricValue: number
  diffWithOverall: number
  metricValueAfterRemoval: number
  impactDiff: number
}

export interface MultiplicativeAttributionRow {
  factorName: string
  baseVal: number
  cmpVal: number
  diff: number
  pop: number | null
  contributionValue: number
  contributionRate: number
  factor: ContributionFactor
}

export interface NonMultiplicativeAttributionRow {
  factorName: string
  baseVal: number
  cmpVal: number
  diff: number
  pop: number | null
  shapContributionValue?: number
  contributionRate: number
}

export interface MetricAttributionFormulaResult {
  formulaId: string
  formulaName: string
  attributionMode: MetricAttributionFormula['attributionMode']
  qualityWarning?: string
  rows: Array<MultiplicativeAttributionRow | NonMultiplicativeAttributionRow>
}

export interface AnalysisTreeNodeDetail {
  nodeId: string
  title: string
  rows: Array<Record<string, string | number>>
}

export interface AnalysisTreeReportResult {
  conclusion: string
  nodes: AnalysisTreeNode[]
  edges: AnalysisTreeEdge[]
  details: AnalysisTreeNodeDetail[]
}

export interface AttributionReportBase {
  reportId: string
  configId: string
  configName: string
  reportType: AttributionReportType
  calculationDay: string
  runStatus: Exclude<AttributionRunStatus, 'NO_REPORT'>
  generateType: GenerateType
  generatedAt: string
  compareConfig: CompareConfig
  groupOptions: Array<{ label: string; value: string }>
  activeGroupValue: string
  webTabs: WebTabConfig[]
  bigEvents: Array<{ title: string; impact: string; date: string }>
}

export type AttributionReport =
  | (AttributionReportBase & {
      reportType: 'ANOMALY'
      primary: AnomalyPrimaryBlock
      metricDisassemblyRows: AnomalyMetricDisassemblyRow[]
      dimensionRows: AnomalyDimensionRow[]
    })
  | (AttributionReportBase & {
      reportType: 'DIMENSION_ATTRIBUTION'
      primary: AnomalyPrimaryBlock
      rootCauses: RootCauseDimensionResult[]
      viewResults: DimensionAttributionViewResult[]
      impactRows: CoreMetricImpactRow[]
    })
  | (AttributionReportBase & {
      reportType: 'METRIC_ATTRIBUTION'
      primary: AnomalyPrimaryBlock
      formulaResults: MetricAttributionFormulaResult[]
    })
  | (AttributionReportBase & {
      reportType: 'ANALYSIS_TREE'
      treeResult: AnalysisTreeReportResult
    })

export interface RegularRunState {
  configId: string
  enabled: boolean
  pausedBySystem: boolean
  pauseReason?: 'NO_VISIT_LONG_TIME' | 'MANUAL'
  lastVisitedAt?: string
  lastRunAt?: string
  nextRunAt?: string
  skipPauseUntil?: string
}

export interface SubscriptionRecipient {
  id: string
  name: string
  type: 'USER' | 'USER_GROUP' | 'WEBHOOK'
}

export interface AttributionSubscription {
  id: string
  configId: string
  name: string
  displayDate: 'CALCULATION_DAY' | 'REPORT_DAY' | 'COMPARE_DAY'
  pushChannel: 'FEISHU_USER' | 'FEISHU_GROUP' | 'DINGTALK_USER' | 'DINGTALK_GROUP' | 'WEBHOOK'
  recipients: SubscriptionRecipient[]
  frequency: 'AFTER_EACH_REGULAR_RUN' | 'DAILY' | 'WEEKLY' | 'MONTHLY'
  pushTime?: string
  webhookId?: string
  enabled: boolean
  creatorId: string
  creatorName: string
  createdAt: string
  updatedAt: string
}

export interface WebHookConfig {
  id: string
  projectId: string
  name: string
  url: string
  secret: string
  subscribedEvents: Array<'ATTRIBUTION_REPORT' | 'ANALYSIS_TREE'>
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface WebHookDeliveryRecord {
  id: string
  webhookId: string
  eventName: 'ATTRIBUTION_REPORT' | 'ANALYSIS_TREE'
  status: 'SUCCESS' | 'RETRYING' | 'FAILED'
  attempts: number
  nextRetryAt?: string
  payloadPreview: string
  createdAt: string
}

export interface AttributionReportWebhookPayload {
  secret: string
  event: {
    channel: 'insight'
    timestamp: number
    title: 'insight_report'
    payload: {
      calculationDay: string
      reportType: 'ANOMALY' | 'DIM_CONTRIBUTE' | 'MEASURE_CONTRIBUTE'
      reportLink: string
      sceneId: string
      sceneGroupId: string
      bigEvents: AttributionReportBase['bigEvents']
      reportUrl: string
      token: string
      detail: unknown[]
    }
  }
}

export interface AnalysisTreeWebhookMeta {
  taskId: string
  reportId: number
  submitJobId: number
  name: string
  user: string
  appId: number
  baseDateStr: string
  cmpDateStr: string
  generateType: 'regular' | 'custom'
  granularity: 'day' | 'week' | 'biweek' | 'month' | 'bimonth'
  components: AnalysisTreeNodeBase[]
}

export interface PermissionGrant {
  id: string
  resourceId: string
  granteeType: 'USER' | 'USER_GROUP'
  granteeId: string
  granteeName: string
  role: AttributionPermissionRole
}

export interface AttributionEmbedQuery {
  CalculationDay?: string | 'Latest'
  OnlyRootCause?: 'True' | 'False'
  Algorithms?: 'Adtributor' | 'Drop' | 'Proportion'
  Advance?: 'True' | 'False'
  Inline?: 'true' | 'false'
  Feature?: string
}

export interface AttributionReportBlockVisible {
  autoInsight: {
    reportBlockVisible: {
      navigation?: boolean
      tab?: boolean
      title?: boolean
      group?: boolean
      primary?: boolean
      bigEvent?: boolean
      controlPane?: boolean
      tables?: boolean
    }
    reportControl?: {
      pureTable?: boolean
    }
  }
}

export interface AnalysisTreeBlockVisible {
  autoInsight: {
    reportBlockVisible: {
      title?: boolean
      conclusion?: boolean
      analysisTree?: boolean
    }
    reportControl?: {
      conclusionClickEnable?: boolean
    }
  }
}

export interface AnalysisTreeDashboardWidgetConfig {
  title: string
  titleVisible: boolean
  analysisTreeId: string
  displayBlocks: {
    title: boolean
    conclusion: boolean
    analysisTree: boolean
  }
  bindGlobalDateFilter: boolean
  toolbarIconsVisible: boolean
  padding: number
  appearance: {
    backgroundColor?: string
    borderVisible?: boolean
  }
}

export interface TrialRunResult {
  state: TrialRunState
  message: string
  warnings: string[]
  trialJobId?: string
}
