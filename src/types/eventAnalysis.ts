import type { CustomFormulaMetric } from './formula'

export type EventCategory = 'app' | 'game' | 'ad' | 'payment' | 'task' | 'reward'

export type EventPropertyDataType = 'string' | 'number' | 'boolean' | 'datetime'

export type EventPropertyType = 'event_property' | 'user_property' | 'common_property' | 'user_tag'

export type MetricOperator =
  | 'PV'
  | 'UV'
  | 'PV_UV'
  | 'UV_AU'
  | 'SUM'
  | 'AVG'
  | 'MAX'
  | 'MIN'
  | 'PER_USER_AVG'
  | 'DISTINCT_COUNT'
  | 'DISTINCT_USER_PROPERTY'
  | 'PERCENTILE_25'
  | 'PERCENTILE_50'
  | 'PERCENTILE_75'
  | 'PERCENTILE_90'
  | 'CUSTOM'
  | 'FORMULA'

export type FilterSourceType =
  | 'event_property'
  | 'user_property'
  | 'user_tag'
  | 'segment'
  | 'behavior'
  | 'dynamic_match'
  | 'common_property'

export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'in'
  | 'not_in'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'contains'
  | 'not_contains'
  | 'regex'
  | 'done'
  | 'not_done'
  | 'sequence_done'
  | 'today'
  | 'yesterday'
  | 'last_n_days'
  | 'before'
  | 'after'

export type FilterLogic = 'AND' | 'OR'

export type BehaviorFilterType = 'done' | 'not_done' | 'sequence_done'

export type DynamicMatchTargetType = 'user_tag' | 'segment'

export type DynamicMatchMode = 'event_day' | 'previous_day' | 'latest'

export type GroupSourceType = 'event_property' | 'user_property' | 'user_tag' | 'segment' | 'common_property'

export type GroupType = 'enum' | 'number_range' | 'datetime_bucket'

export type AnomalyLevel = 'P0' | 'P1' | 'P2' | 'P3'

export type AnomalyStatus = 'unhandled' | 'processing' | 'resolved'

export type RecommendedActionType = 'create_segment' | 'create_campaign' | 'create_experiment'

export type AnalysisQueryState =
  | 'idle'
  | 'dirty'
  | 'validating'
  | 'loading'
  | 'success'
  | 'empty'
  | 'error'

export type AnalysisConfigState = 'valid' | 'invalid' | 'unsaved' | 'saved'

export type AnalysisDirtyState = 'new' | 'saved' | 'dirty' | 'saving' | 'save_failed' | 'readonly'

export type SavedAnalysisType =
  | 'event'
  | 'retention'
  | 'funnel'
  | 'distribution'
  | 'path'
  | 'attribution'
  | 'ltv'
  | 'interval'

export type SavedAnalysisVisibility = 'private' | 'team' | 'public'

export type ChartType =
  | 'line'
  | 'stacked'
  | 'bar'
  | 'dual_axis'
  | 'donut'
  | 'pie'
  | 'percentage'
  | 'cumulative'

export type EventAnalysisChartType = ChartType

export type DashboardWidgetSaveObject = 'chart' | 'metric_card' | 'table' | 'chart_group'

export type DashboardWidgetChartType = ChartType | 'metric_card' | 'table'

export type DashboardSpaceType = 'personal' | 'team' | 'public'

export type DashboardRefreshMode = 'open' | 'scheduled' | 'manual' | 'snapshot'

export type DashboardRefreshSchedule = 'hourly' | 'daily_9' | 'weekly_monday_9'

export type DashboardSummaryItem = 'total' | 'latest' | 'avg' | 'max' | 'min' | 'wow' | 'yoy' | 'cumulative'

export type DownloadRange = 'page_result' | 'more_data'

export type DownloadContent = 'chart_data' | 'detail_data' | 'user_list'

export type DownloadFormat = 'csv' | 'excel'

export interface EventProperty {
  propertyName: string
  displayName: string
  dataType: EventPropertyDataType
  propertyType: EventPropertyType
  availableOperators: FilterOperator[]
}

export interface EventDefinition {
  eventName: string
  displayName: string
  category: EventCategory
  description: string
  eventType: 'general' | 'virtual' | 'circle'
  properties: EventProperty[]
}

export interface UserAttribute {
  field: string
  displayName: string
  dataType: EventPropertyDataType
  description: string
}

export interface UserTag {
  field: string
  displayName: string
  valueExamples: string[]
  description: string
}

export interface UserSegmentOption {
  id: string
  name: string
  estimatedUsers: number
  description: string
}

export interface EventMetadata {
  events: EventDefinition[]
  userAttributes: UserAttribute[]
  userTags: UserTag[]
  userSegments: UserSegmentOption[]
}

export interface FilterCondition {
  id: string
  sourceType: FilterSourceType
  field: string
  fieldDisplayName: string
  operator: FilterOperator
  value: string | number | boolean | Array<string | number>
  displayValue: string
  logic: FilterLogic
  childFilters?: FilterCondition[]
  behaviorType?: BehaviorFilterType
  timeWindowDays?: number
  eventName?: string
  eventSequence?: string[]
  countOperator?: FilterOperator
  countValue?: number
  stepIntervalMinutes?: number
  matchEventName?: string
  matchTargetType?: DynamicMatchTargetType
  matchField?: string
  matchMode?: DynamicMatchMode
  manualInput?: boolean
}

export interface EventMetricConfig {
  id: string
  name: string
  eventName: string
  metricType: 'event' | 'property' | 'custom' | 'formula'
  operator: MetricOperator
  propertyName?: string
  expression?: string
  unit: string
  precision: number
  filters: FilterCondition[]
  enabled: boolean
  showAtomicMetrics?: boolean
  groupParticipating?: boolean
}

export interface GroupByRange {
  label: string
  min: number
  max: number
}

export interface GroupByConfig {
  id: string
  field: string
  displayName: string
  sourceType: GroupSourceType
  groupType: GroupType
  ranges?: GroupByRange[]
  topN: number
  enabled: boolean
  applyToMetricIds: string[]
}

export interface ComparisonGroup {
  id: string
  name: string
  description: string
  filters: FilterCondition[]
  colorKey: string
  enabled: boolean
}

export interface TimeRangeConfig {
  preset:
    | 'today'
    | 'yesterday'
    | 'last_7_days'
    | 'last_14_days'
    | 'last_30_days'
    | 'last_60_days'
    | 'last_180_days'
    | 'custom'
  startDate: string
  endDate: string
  granularity: 'hour' | 'day' | 'week'
  comparisonType: 'none' | 'previous_period' | 'same_week' | 'same_month' | 'same_year' | 'custom'
  customComparisonStartDate?: string
  customComparisonEndDate?: string
}

export interface ChartConfig {
  title?: string
  chartType: ChartType
  selectedMetricIds: string[]
  selectedGroupById?: string
  selectedGroupValues: string[]
  xAxisMode?: 'time' | 'group'
  yAxisMode?: 'single' | 'dual'
  leftAxisMetricIds?: string[]
  rightAxisMetricIds?: string[]
  dualAxisRenderMode?: 'line_line' | 'bar_line' | 'bar_bar'
  barDirection?: 'horizontal' | 'vertical'
  displayMode?: 'value' | 'percentage'
  topN?: number
  mergeOthers?: boolean
  showLegend: boolean
  showDataLabel: boolean
  showTooltip: boolean
  showCompareLine: boolean
  showPredictionBand: boolean
  showAnomalyPoint: boolean
  showCumulativeValue?: boolean
  showGrowthRate?: boolean
  tableMode?: 'hierarchy' | 'flat' | 'transpose'
}

export interface MetricTrendPoint {
  date: string
  actualValue: number
  compareValue: number
  expectedValue?: number
  upperBound?: number
  lowerBound?: number
  isAnomaly: boolean
  anomalyLevel?: AnomalyLevel
}

export interface TimeSeriesPoint {
  date: string
  groupName: string
  metricId: string
  metricName: string
  value: number
  compareValue: number
  expectedValue?: number
  upperBound?: number
  lowerBound?: number
  isAnomaly: boolean
  anomalyLevel?: AnomalyLevel
}

export interface GroupSummaryRow {
  id: string
  groupName: string
  dimension: string
  value: number
  compareValue: number
  percentage: number
  diffRate: number
  affectedUsers: number
}

export interface DualAxisPoint {
  date: string
  leftValue: number
  rightValue: number
  groupName?: string
}

export interface PercentageSeriesPoint {
  date: string
  groupName: string
  value: number
  rawValue: number
}

export interface CumulativeSeriesPoint {
  date: string
  groupName: string
  currentValue: number
  compareValue: number
}

export interface AnomalyPoint {
  date: string
  metricId: string
  metricName: string
  actualValue: number
  expectedValue: number
  anomalyLevel: AnomalyLevel
}

export interface ChartLegendItem {
  id: string
  name: string
  color: string
  enabled: boolean
}

export interface DimensionContribution {
  id: string
  dimension: string
  dimensionValue: string
  actualValue: number
  expectedValue: number
  diff: number
  diffRate: number
  contributionRate: number
  affectedUsers: number
  pinned?: 'top' | 'bottom'
}

export interface EventAnalysisDetailRow {
  id: string
  date: string
  comparisonGroup: string
  userGroup: string
  coinBalanceLevel: string
  adPosition: string
  gameType: string
  paymentStatus: string
  appVersion: string
  adWatchPv: number
  adWatchUv: number
  adWatchPerUser: number
  adCompleteRate: number
  adRevenue: number
  wowChange: number
  yoyChange: number
  contributionRate: number
  affectedUsers: number
}

export interface RecommendedAction {
  id: string
  actionType: RecommendedActionType
  title: string
  description: string
  targetRoute: string
  payload: Record<string, string | number | boolean | string[]>
}

export interface AnomalyDiagnosis {
  id: string
  anomalyDate: string
  metricName: string
  actualValue: number
  expectedValue: number
  lowerBound: number
  upperBound: number
  diff: number
  diffRate: number
  severity: AnomalyLevel
  confidence: number
  lookbackDays: number
  status: AnomalyStatus
  summary: string
  contributions: DimensionContribution[]
  recommendedActions: RecommendedAction[]
}

export interface EventAnalysisMetricCard {
  id: string
  metricId: string
  metricName: string
  value: number
  compareValue: number
  unit: string
  precision: number
  changeRate: number
  status: 'normal' | 'warning' | 'critical' | 'growth'
  tooltip: string
}

export interface EventAnalysisTemplate {
  id: string
  name: string
  description: string
  scenario: 'ad_watch_decline' | 'new_user_conversion' | 'retention' | 'payment_conversion'
  dateRangeLabel: string
  timeRange: TimeRangeConfig
  primaryEventName: string
  primaryMetricId: string
  metricConfigs: EventMetricConfig[]
  formulaMetrics: CustomFormulaMetric[]
  filters: FilterCondition[]
  groupByConfigs: GroupByConfig[]
  comparisonGroups: ComparisonGroup[]
  chartConfig: ChartConfig
}

export interface AffectedUser {
  userId: string
  userLevel: string
  coinBalance: number
  activeDays7d: number
  gameRounds7d: number
  adWatchCount7d: number
  adWatchDeclineRate3d: number
  paymentStatus: string
  churnRisk: '低' | '中' | '高'
  lastLoginTime: string
  recommendedAction: string
}

export interface EventAnalysisQueryConfig {
  templateId: string
  timeRange: TimeRangeConfig
  metricConfigs: EventMetricConfig[]
  formulaMetrics: CustomFormulaMetric[]
  filters: FilterCondition[]
  comparisonGroups: ComparisonGroup[]
  groupByConfigs: GroupByConfig[]
  chartConfig: ChartConfig
}

export interface EventSavedAnalysisConfig {
  metrics: EventMetricConfig[]
  formulaMetrics: CustomFormulaMetric[]
  filters: FilterCondition[]
  groupBys: GroupByConfig[]
  comparisonGroups: ComparisonGroup[]
  anomalyConfig?: {
    confidenceInterval: number
    lookbackDays: number
  }
}

export interface AnalysisQueryConfig {
  analysisType: SavedAnalysisType
  timeRange: TimeRangeConfig
  timezone: string
  subjectType?: string
  statisticUnit?: string
  moduleConfig: EventSavedAnalysisConfig
}

export interface AnalysisChartConfig {
  chartType: string
  selectedMetricIds: string[]
  selectedGroupByIds?: string[]
  topN?: number
  mergeOthers?: boolean
  showLegend: boolean
  showTooltip: boolean
  showDataLabel: boolean
  showCompareLine?: boolean
  showAnomalyPoint?: boolean
  showPredictionBand?: boolean
  displayMode?: 'value' | 'percentage'
}

export interface AnalysisTableConfig {
  tableMode: 'flat' | 'hierarchy' | 'transpose'
  visibleColumns: string[]
  sortConfig?: {
    field: string
    order: 'ascend' | 'descend'
  }
  filters?: Record<string, Array<string | number>>
  pageSize: number
}

export interface AnalysisInteractionState {
  selectedMetricId?: string
  selectedAnomalyId?: string
  selectedGroupValue?: string
  temporaryFilters?: FilterCondition[]
  activeTab?: string
  expandedRows?: string[]
}

export interface SavedAnalysis {
  id: string
  name: string
  description?: string
  analysisType: SavedAnalysisType
  ownerId: string
  ownerName: string
  visibility: SavedAnalysisVisibility
  folderId: string
  tags: string[]
  version: number
  queryConfig: AnalysisQueryConfig
  chartConfig: AnalysisChartConfig
  tableConfig?: AnalysisTableConfig
  interactionState?: AnalysisInteractionState
  createdAt: string
  updatedAt: string
}

export interface EventAnalysisResult {
  metricCards: EventAnalysisMetricCard[]
  timeSeries: TimeSeriesPoint[]
  metricTrend: MetricTrendPoint[]
  groupSummaries: GroupSummaryRow[]
  dualAxisSeries: DualAxisPoint[]
  percentageSeries: PercentageSeriesPoint[]
  cumulativeSeries: CumulativeSeriesPoint[]
  tableRows: EventAnalysisDetailRow[]
  anomalyPoints: AnomalyPoint[]
  anomalyDiagnosis: AnomalyDiagnosis
  chartLegendItems: ChartLegendItem[]
  chartTopNOptions: number[]
}

export interface SaveAnalysisConfigPayload {
  analysisId?: string
  templateId: string
  name: string
  description?: string
  visibility: SavedAnalysisVisibility
  folderId: string
  tags: string[]
  saveChartState: boolean
  saveTableState: boolean
  savedAnalysis: Omit<SavedAnalysis, 'id' | 'createdAt' | 'updatedAt' | 'version'>
}

export interface SaveAsSegmentPayload {
  segmentName: string
  description: string
  estimatedUsers: number
  sourceMetric: string
}

export interface SaveDashboardPayload {
  chartName: string
  description?: string
  sourceAnalysis: string
  sourceDescription: string
  tags: string[]
  saveObject: DashboardWidgetSaveObject
  spaceType: DashboardSpaceType
  dashboardId: string
  chartType: DashboardWidgetChartType
  displayItems: DashboardSummaryItem[]
  refreshMode: DashboardRefreshMode
  refreshSchedule?: DashboardRefreshSchedule
  fixedSnapshot: boolean
  queryConfig: EventAnalysisQueryConfig
  chartConfig: ChartConfig
}

export interface DashboardLocation {
  id: string
  name: string
  path: string
  spaceType: DashboardSpaceType
  canWrite: boolean
  widgets: string[]
}

export interface DownloadTaskPayload {
  range: DownloadRange
  contents: DownloadContent[]
  format: DownloadFormat
}

export interface DownloadTask {
  id: string
  name: string
  range: DownloadRange
  contents: DownloadContent[]
  format: DownloadFormat
  status: 'created' | 'running' | 'completed'
  createdAt: string
}

export interface MockActionResult {
  success: boolean
  id: string
  message: string
}
