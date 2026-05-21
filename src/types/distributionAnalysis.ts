import type { EventDefinition, EventMetadata, FilterCondition } from './eventAnalysis'

export type DistributionSubjectType = 'user_id' | 'device_id' | 'account_id' | 'anonymous_id' | 'custom_id'

export type DistributionAggregator =
  | 'PV'
  | 'ACTIVE_DAYS'
  | 'ACTIVE_HOURS'
  | 'SUM'
  | 'AVG'
  | 'MAX'
  | 'MIN'
  | 'DISTINCT'
  | 'FIRST'
  | 'LAST'

export type DistributionPropertyType = 'number' | 'string' | 'datetime' | 'boolean' | 'list'

export type DistributionBucketMode =
  | 'sturges_auto'
  | 'preset_frequency'
  | 'equal_width'
  | 'custom_equal_width'
  | 'custom_ranges'
  | 'enum_values'

export type DistributionChartMode = 'trend' | 'group'

export type DistributionChartType = 'line' | 'bar' | 'stacked_bar' | 'stacked_area' | 'pie' | 'donut'

export type DistributionGranularity = 'day' | 'week' | 'month'

export type DistributionQueryState = 'idle' | 'dirty' | 'validating' | 'loading' | 'success' | 'empty' | 'error'

export type DistributionFilterRelation = 'AND' | 'OR'

export type DistributionSortBy = 'bucket_order' | 'count_desc' | 'count_asc' | 'ratio_desc' | 'ratio_asc'

export interface DistributionMetricEvent {
  eventName: string
  eventDisplayName: string
  eventType: 'normal' | 'virtual' | 'visual'
  filters: FilterCondition[]
}

export interface DistributionMetric {
  event?: DistributionMetricEvent
  aggregator?: DistributionAggregator
  propertyName?: string
  propertyDisplayName?: string
  propertyType?: DistributionPropertyType
}

export interface DistributionRange {
  id: string
  label: string
  min?: number
  max?: number
  leftClosed: boolean
  rightClosed: boolean
}

export interface DistributionBucketConfig {
  mode: DistributionBucketMode
  bucketCount?: 5 | 10 | 15
  start?: number
  end?: number
  width?: number
  includeBelowRange?: boolean
  includeAboveRange?: boolean
  includeNullBucket: boolean
  ranges: DistributionRange[]
}

export interface DistributionUserFilterConfig {
  relation: DistributionFilterRelation
  conditions: FilterCondition[]
}

export interface DistributionGroupBy {
  id: string
  fieldType: 'event_property' | 'user_property' | 'user_tag' | 'cohort' | 'subject_property'
  fieldName: string
  displayName: string
  valueLimit: number
  includeOthers: boolean
  includeUnknown: boolean
}

export interface DistributionComparisonGroup {
  id: string
  name: string
  color: string
  enabled: boolean
  userFilter: DistributionUserFilterConfig
}

export interface DistributionQueryRequest {
  projectId: string
  subjectType: DistributionSubjectType
  timezone: string
  metric: DistributionMetric
  bucketConfig: DistributionBucketConfig
  userFilter: DistributionUserFilterConfig
  groupBys: DistributionGroupBy[]
  comparisonGroups: DistributionComparisonGroup[]
  timeRange: {
    startDate: string
    endDate: string
    granularity: DistributionGranularity
  }
  chartMode: DistributionChartMode
  chartType: DistributionChartType
  showRatio: boolean
  showCount: boolean
  sortBy: DistributionSortBy
}

export interface SubjectMetricValue {
  subjectId: string
  timeBucket: string
  metricValue: number | string | null
  eventCount: number
}

export interface DistributionBucketResult {
  bucketId: string
  bucketLabel: string
  min?: number
  max?: number
  subjectCount: number
  ratio: number
  groupName: string
  comparisonGroupName?: string
}

export interface DistributionTrendPoint {
  timeBucket: string
  bucketLabel: string
  groupName: string
  comparisonGroupName?: string
  subjectCount: number
  ratio: number
}

export interface DistributionDetailRow {
  key: string
  bucketLabel: string
  groupName: string
  comparisonGroupName: string
  subjectCount: number
  ratio: number
  avgMetricValue: number
  minMetricValue: number
  maxMetricValue: number
  sampleSubjects: string[]
  children?: DistributionDetailRow[]
  timeSeries: Array<{
    timeBucket: string
    subjectCount: number
    ratio: number
  }>
}

export interface DistributionQueryResponse {
  queryId: string
  executedAt: string
  timezone: string
  summary: {
    totalSubjects: number
    validSubjects: number
    nullSubjects: number
    peakBucketLabel: string
    peakBucketRatio: number
    avgMetricValue: number
  }
  buckets: DistributionBucketResult[]
  trend: DistributionTrendPoint[]
  details: DistributionDetailRow[]
}

export interface DistributionMetadata {
  eventMetadata: EventMetadata
  recommendedEvents: EventDefinition[]
}

export interface DistributionActionResult {
  success: boolean
  id: string
  message: string
}

export interface DistributionSavedAnalysisPayload {
  name: string
  description: string
  tags: string[]
  queryConfig: DistributionQueryRequest
}

export interface DistributionDashboardWidgetPayload {
  widgetName: string
  widgetType: 'distribution_trend' | 'distribution_group' | 'distribution_pie' | 'distribution_table'
  queryConfig: DistributionQueryRequest
}

export interface DistributionDrilldownContext {
  bucketLabel: string
  timeBucket?: string
  groupName: string
  comparisonGroupName: string
  subjectCount: number
  ratio: number
}

export interface DistributionUserRecord {
  subjectId: string
  metricValue: number | string | null
  bucketLabel: string
  eventCount: number
  firstEventTime: string
  lastEventTime: string
  groupName: string
}
