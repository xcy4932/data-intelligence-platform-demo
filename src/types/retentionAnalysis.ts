import type { EventDefinition, EventMetadata, FilterCondition } from './eventAnalysis'

export type RetentionIdType = 'user_id' | 'device_id' | 'account_id' | 'custom_id'

export type RetentionModelType = 'fixed_date' | 'custom_interval' | 'continuous' | 'churn'

export type RetentionGranularity = 'day' | 'week' | 'month'

export type RetentionWindowMode = 'all' | 'key' | 'custom'

export type RetentionAggregationMode = 'weighted' | 'deduplicated'

export type RetentionChartType = 'trend' | 'comparison' | 'table'

export type RetentionMetricMode = 'retention' | 'churn'

export type RetentionRefreshPolicy = 'manual' | 'hourly' | 'daily'

export type RetentionTimeMode = 'fixed' | 'relative'

export type RetentionQueryState = 'idle' | 'dirty' | 'validating' | 'loading' | 'success' | 'empty' | 'error'

export type RetentionFieldType =
  | 'start_event_property'
  | 'return_event_property'
  | 'user_property'
  | 'user_tag'
  | 'cohort'

export type RetentionExtraMetricAggregator =
  | 'PV'
  | 'UV'
  | 'PV_UV'
  | 'SUM'
  | 'SUM_UV'
  | 'CUMSUM'
  | 'CUMSUM_UV'
  | 'CUMSUM_FUV'

export interface RetentionAnalysisScope {
  projectId: string
  appId?: string
  subjectId?: string
  idType: RetentionIdType
  timezone: string
}

export interface RetentionEventConfig {
  eventName: string
  displayName: string
  filters: FilterCondition[]
}

export interface RetentionRelationProperty {
  id: string
  startProperty: string
  returnProperty: string
  propertyType: 'string' | 'number' | 'boolean' | 'datetime'
}

export interface RetentionUserFilterGroup {
  id: string
  name: string
  relation: 'AND' | 'OR'
  conditions: FilterCondition[]
}

export interface RetentionComparisonGroup {
  id: string
  name: string
  userFilter: RetentionUserFilterGroup
  color: string
  enabled: boolean
}

export interface RetentionGroupBy {
  id: string
  fieldType: RetentionFieldType
  fieldName: string
  displayName: string
  valueMode: 'raw' | 'custom_interval' | 'auto_interval'
  listSplit?: boolean
}

export interface RetentionCustomWindow {
  id: string
  name: string
  startOffset: number
  endOffset: number
  unit: RetentionGranularity
}

export interface RetentionWindowConfig {
  mode: RetentionWindowMode
  keyOffsets: number[]
}

export interface RetentionContinuousConfig {
  enabled: boolean
  includeStartDay: boolean
  window: number
  unit: RetentionGranularity
}

export interface RetentionExtraMetric {
  id: string
  eventName: string
  displayName: string
  aggregator: RetentionExtraMetricAggregator
  propertyName?: string
  filters: FilterCondition[]
}

export interface RetentionQueryRequest {
  projectId: string
  subjectId?: string
  idType: RetentionIdType
  timezone: string
  modelType: RetentionModelType
  granularity: RetentionGranularity
  weekStartDay: 1 | 2 | 3 | 4 | 5 | 6 | 7
  startDate: string
  endDate: string
  startEvent: RetentionEventConfig
  returnEvent: RetentionEventConfig
  relationProperties: RetentionRelationProperty[]
  userFilter: RetentionUserFilterGroup
  comparisonGroups: RetentionComparisonGroup[]
  groupBys: RetentionGroupBy[]
  retentionWindows: RetentionWindowConfig
  customWindows: RetentionCustomWindow[]
  continuousRetention: RetentionContinuousConfig
  extraMetrics: RetentionExtraMetric[]
  aggregationMode: RetentionAggregationMode
  includeUserCount: boolean
  includeDay0: boolean
  chartType: RetentionChartType
}

export interface RetentionColumn {
  key: string
  label: string
  windowStartOffset: number
  windowEndOffset: number
}

export interface RetentionWindowResult {
  key: string
  retainedUsers: number
  retentionRate: number
  churnUsers: number
  churnRate: number
  extraMetrics: Record<string, number>
}

export interface RetentionResultRow {
  rowId: string
  cohortDate: string
  groupValues: Record<string, string | number>
  comparisonGroupId?: string
  comparisonGroupName?: string
  startUsers: number
  windows: RetentionWindowResult[]
}

export interface RetentionChartPoint {
  name: string
  windowKey: string
  windowLabel: string
  cohortDate?: string
  value: number
  users: number
  startUsers: number
}

export interface RetentionChartSeries {
  id: string
  name: string
  color: string
  points: RetentionChartPoint[]
}

export interface RetentionQueryResponse {
  queryId: string
  executedAt: string
  timezone: string
  summary: {
    totalStartUsers: number
    maxWindow: number
    aggregationMode: RetentionAggregationMode
    retainedUsersDay1: number
    retentionRateDay1: number
    retentionRateDay7: number
  }
  columns: RetentionColumn[]
  rows: RetentionResultRow[]
  chartData: {
    trend: RetentionChartSeries[]
    comparison: RetentionChartSeries[]
  }
}

export interface RetentionUserRecord {
  userId: string
  startEventTime: string
  returnEventTime?: string
  groupValue: string
  relationPropertyValue?: string
  userLevel: string
  channel: string
  lifecycleTag: string
}

export interface RetentionSavedAnalysisPayload {
  name: string
  description: string
  tags: string[]
  spaceType: 'personal' | 'team'
  timeMode: RetentionTimeMode
  queryConfig: RetentionQueryRequest
  chartConfig: {
    chartType: RetentionChartType
    selectedWindow?: string
    showUserCount: boolean
    showMetric: RetentionMetricMode
  }
}

export interface RetentionDashboardWidgetPayload {
  title: string
  dashboardId: string
  widgetType: 'retention_trend' | 'retention_comparison' | 'retention_table'
  timeMode: RetentionTimeMode
  refreshPolicy: RetentionRefreshPolicy
  queryConfig: RetentionQueryRequest
  chartConfig: {
    metric: RetentionMetricMode
    chartType: RetentionChartType
    selectedWindow?: string
    showUserCount: boolean
  }
}

export interface RetentionActionResult {
  success: boolean
  id: string
  message: string
}

export interface RetentionMetadata {
  eventMetadata: EventMetadata
  recommendedEvents: EventDefinition[]
}
