import type { EventDefinition, EventMetadata, FilterCondition, GroupSourceType } from './eventAnalysis'

export type LtvSubjectType = 'user_id' | 'device_id' | 'account_id' | 'anonymous_id' | 'custom_id'

export type LtvDedupStrategy = 'once_per_day' | 'first_time_only'

export type LtvRevenueMetricType = 'iap' | 'ad'

export type LtvMissingEcpmStrategy = 'ERROR' | 'FILL_ZERO' | 'USE_PREVIOUS'

export type LtvEcpmUploadStatus = 'empty' | 'success' | 'error'

export type LtvWindowValue = number | 'to_date'

export type LtvIncompleteWindowMode = 'SHOW_PARTIAL' | 'SHOW_EMPTY' | 'SHOW_WITH_WARNING'

export type LtvChartMode = 'TREND' | 'COMPARE'

export type LtvTrendObject = 'overall' | 'date' | 'group'

export type LtvQueryState = 'idle' | 'dirty' | 'validating' | 'loading' | 'success' | 'empty' | 'error'

export type LtvSaveObjectType = 'analysis' | 'dashboard_widget'

export interface LtvWindowConfig {
  id: string
  label: string
  value: LtvWindowValue
  enabled: boolean
}

export interface LtvTimeRange {
  quickKey: 'today' | 'yesterday' | 'last_7_days' | 'last_14_days' | 'last_30_days' | 'custom'
  startDate: string
  endDate: string
}

export interface LtvStartEventConfig {
  eventName: string
  eventDisplayName: string
  dedupStrategy: LtvDedupStrategy
  filters: FilterCondition[]
}

export interface LtvRevenueMetricBase {
  id: string
  name: string
  type: LtvRevenueMetricType
  eventName: string
  eventDisplayName: string
  enabled: boolean
  filters: FilterCondition[]
}

export interface LtvIapRevenueMetric extends LtvRevenueMetricBase {
  type: 'iap'
  revenueProperty: string
  revenuePropertyDisplayName: string
  profitRatio: number
}

export interface LtvAdRevenueMetric extends LtvRevenueMetricBase {
  type: 'ad'
  ecpmSource: 'daily_upload' | 'fixed_mock'
  fixedEcpm: number
  missingEcpmStrategy: LtvMissingEcpmStrategy
  ecpmFileId?: string
  ecpmFileName?: string
  ecpmRecordCount: number
  ecpmCoverageStart?: string
  ecpmCoverageEnd?: string
  ecpmUploadStatus: LtvEcpmUploadStatus
  ecpmParseErrors: string[]
}

export type LtvRevenueMetric = LtvIapRevenueMetric | LtvAdRevenueMetric

export interface LtvSegmentFilterConfig {
  relation: 'AND' | 'OR'
  conditions: FilterCondition[]
}

export interface LtvComparisonGroup {
  id: string
  name: string
  color: string
  enabled: boolean
  filters: FilterCondition[]
}

export interface LtvGroupByConfig {
  enabled: boolean
  id: string
  sourceType: GroupSourceType | 'start_event_property' | 'subject_property'
  field: string
  displayName: string
  topN: number
  includeOthers: boolean
  includeUnknown: boolean
}

export interface LtvQueryRequest {
  projectId: string
  subjectType: LtvSubjectType
  timezone: string
  timeRange: LtvTimeRange
  startEvent: LtvStartEventConfig
  revenueMetrics: LtvRevenueMetric[]
  segmentFilter: LtvSegmentFilterConfig
  comparisonGroups: LtvComparisonGroup[]
  groupBy: LtvGroupByConfig
  windows: LtvWindowConfig[]
  incompleteWindowMode: LtvIncompleteWindowMode
  chartMode: LtvChartMode
  trendObject: LtvTrendObject
  selectedMetricId: 'total' | string
  compareWindowId: string
  selectedTrendTargetKey: string
  userPropertySnapshotMode: 'QUERY_TIME' | 'COHORT_DAY'
  decimalScale: number
}

export interface LtvCellMetricValue {
  metricId: string
  metricName: string
  revenue: number
  ltv: number
}

export interface LtvCellResult {
  windowId: string
  windowLabel: string
  windowValue: LtvWindowValue
  isComplete: boolean
  revenue: number
  ltv: number
  metricValues: LtvCellMetricValue[]
  warning?: string
}

export interface LtvDetailRow {
  key: string
  cohortDate: string
  groupName: string
  startUsers: number
  revenueToDate: number
  ltvToDate: number
  payRate: number
  arppu: number
  cells: LtvCellResult[]
  children?: LtvDetailRow[]
}

export interface LtvTrendPoint {
  date: string
  groupName: string
  windowLabel: string
  metricName: string
  revenue: number
  ltv: number
  startUsers: number
  isComplete: boolean
}

export interface LtvSummary {
  totalStartUsers: number
  totalRevenue: number
  overallLTVToDate: number
  cohortDateCount: number
  enabledMetricCount: number
  averagePayRate: number
}

export interface LtvQueryResponse {
  queryId: string
  executedAt: string
  timezone: string
  summary: LtvSummary
  windows: LtvWindowConfig[]
  metrics: LtvRevenueMetric[]
  rows: LtvDetailRow[]
  overallRows: LtvDetailRow[]
  trend: LtvTrendPoint[]
  warnings: string[]
}

export interface LtvMetadata {
  eventMetadata: EventMetadata
  recommendedStartEvents: EventDefinition[]
  recommendedRevenueEvents: EventDefinition[]
  recommendedAdEvents: EventDefinition[]
}

export interface LtvUserRecord {
  userId: string
  cohortDate: string
  groupName: string
  channel: string
  userLevel: string
  startEventTime: string
  revenueToDate: number
  ltvToDate: number
  paymentStatus: string
}

export interface LtvRevenueBreakdownRecord {
  orderId: string
  userId: string
  date: string
  eventTime: string
  metricName: string
  revenueType: LtvRevenueMetricType
  eventName: string
  eventCount: number
  revenueUserCount: number
  revenue: number
  rawRevenue: number
  cumulativeRevenue: number
  profitRatio?: number
  ecpm?: number
}

export interface LtvDrilldownContext {
  rowKey: string
  cohortDate: string
  groupName: string
  windowId: string
  windowLabel: string
  metricId: string
  metricName: string
}

export interface LtvActionResult {
  success: boolean
  id: string
  message: string
}

export interface LtvSavedAnalysisPayload {
  name: string
  description: string
  tags: string[]
  queryConfig: LtvQueryRequest
}

export interface LtvDashboardWidgetPayload {
  widgetName: string
  dashboardPath: string
  widgetType: 'ltv_trend' | 'ltv_compare' | 'ltv_table'
  chartMode: LtvChartMode
  queryConfig: LtvQueryRequest
}
