import type { EventDefinition, EventMetadata, EventPropertyDataType, FilterCondition } from './eventAnalysis'

export type FunnelIdType = 'user_id' | 'device_id' | 'account_id' | 'custom_id'

export type FunnelMode = 'ordered' | 'unordered'

export type FunnelCalculationType = 'UV' | 'PV'

export type FunnelWindowMode = 'preset' | 'custom' | 'same_day'

export type FunnelWindowUnit = 'second' | 'minute' | 'hour' | 'day'

export type FunnelAttributionStrategy = 'first_match' | 'closest_match'

export type FunnelAnalysisMode = 'steps' | 'trend' | 'duration'

export type FunnelChartType =
  | 'conversion_funnel'
  | 'basic_funnel'
  | 'bar'
  | 'line'
  | 'duration_histogram'
  | 'duration_boxplot'

export type FunnelTimeGranularity = 'minute' | 'hour' | 'day' | 'week' | 'month'

export type FunnelCompareMode = 'previous_period' | 'same_period_last_year' | 'custom'

export type FunnelGroupFieldType = 'event_property' | 'user_property' | 'user_tag' | 'cohort' | 'event_time'

export type FunnelGroupMode = 'single' | 'multi'

export type FunnelMetricAggregator = 'PV' | 'UV' | 'SUM' | 'AVG' | 'MAX' | 'MIN' | 'MEDIAN' | 'PERCENTILE'

export type FunnelRelationPropertySourceType =
  | 'event_property'
  | 'common_property'
  | 'user_property'
  | 'user_tag'
  | 'virtual_property'

export type FunnelDashboardRefreshPolicy = 'manual' | 'hourly' | 'daily'

export type FunnelQueryState = 'idle' | 'dirty' | 'validating' | 'loading' | 'success' | 'empty' | 'error'

export type FunnelUserType = 'reached' | 'lost' | 'converted'

export interface FunnelConversionWindow {
  mode: FunnelWindowMode
  value?: number
  unit?: FunnelWindowUnit
  restrictWithinSelectedTimeRange: boolean
}

export interface FunnelCountingConfig {
  calculationType: FunnelCalculationType
  allowEventReuse: boolean
  attributionStrategy: FunnelAttributionStrategy
}

export interface FunnelStepMetric {
  id: string
  stepId: string
  eventName: string
  eventDisplayName: string
  metricName: string
  aggregator: FunnelMetricAggregator
  propertyName?: string
  percentile?: number
  filters: FilterCondition[]
}

export interface FunnelStep {
  id: string
  order: number
  eventName: string
  eventDisplayName: string
  alias: string
  filters: FilterCondition[]
  simultaneousMetric?: FunnelStepMetric
}

export interface FunnelRelationPropertyMapping {
  stepId: string
  propertySource: FunnelRelationPropertySourceType
  propertyName: string
  propertyDisplayName: string
  propertyType: EventPropertyDataType
}

export interface FunnelRelationProperty {
  id: string
  relationMode: 'all_equal'
  stepMappings: FunnelRelationPropertyMapping[]
}

export interface FunnelComparisonGroup {
  id: string
  name: string
  color: string
  enabled: boolean
  filters: FilterCondition[]
}

export interface FunnelGroupBy {
  id: string
  fieldType: FunnelGroupFieldType
  fieldName: string
  displayName: string
  applyStepId?: string
  groupMode: FunnelGroupMode
  selectedValues: string[]
}

export interface FunnelPathVariant {
  id: string
  name: string
  changedStepOrder: number
  eventName: string
  eventDisplayName: string
}

export interface FunnelMultiPathConfig {
  enabled: boolean
  baseStepOrder: number
  paths: FunnelPathVariant[]
}

export interface FunnelTimeConfig {
  granularity: FunnelTimeGranularity
  startTime: string
  endTime: string
  timezone: string
  weekStartDay: 1 | 2 | 3 | 4 | 5 | 6 | 7
  restrictWindowWithinSelectedRange: boolean
}

export interface FunnelCompareTimeConfig {
  enabled: boolean
  mode: FunnelCompareMode
  startTime?: string
  endTime?: string
}

export interface FunnelViewConfig {
  analysisMode: FunnelAnalysisMode
  chartType: FunnelChartType
  selectedMetric: 'previous_conversion_rate' | 'overall_conversion_rate' | 'reached_count' | 'lost_count' | 'avg_duration' | 'median_duration'
  selectedStepPair?: {
    fromStepId: string
    toStepId: string
  }
}

export interface FunnelQueryRequest {
  projectId: string
  subjectId?: string
  idType: FunnelIdType
  timezone: string
  funnelMode: FunnelMode
  calculationType: FunnelCalculationType
  countingConfig: FunnelCountingConfig
  conversionWindow: FunnelConversionWindow
  steps: FunnelStep[]
  relationProperties: FunnelRelationProperty[]
  globalFilters: FilterCondition[]
  comparisonGroups: FunnelComparisonGroup[]
  groupBys: FunnelGroupBy[]
  multiPath: FunnelMultiPathConfig
  timeConfig: FunnelTimeConfig
  compareTime: FunnelCompareTimeConfig
  viewConfig: FunnelViewConfig
}

export interface FunnelStepResult {
  stepId: string
  stepOrder: number
  stepName: string
  reachedCount: number
  lostCount: number
  previousConversionRate: number
  overallConversionRate: number
  previousLostRate: number
  overallLostRate: number
  avgDurationMs: number
  medianDurationMs: number
  simultaneousMetricValue?: number
}

export interface FunnelGroupResult {
  groupKey: string
  groupValues: Record<string, string | number>
  steps: FunnelStepResult[]
}

export interface FunnelTrendPoint {
  timeBucket: string
  seriesKey: string
  stepPair: string
  value: number
  count: number
}

export interface FunnelDurationBucket {
  bucketStart: number
  bucketEnd: number
  count: number
  ratio: number
}

export interface FunnelDurationStats {
  min: number
  p25: number
  median: number
  avg: number
  p75: number
  max: number
}

export interface FunnelQueryResponse {
  queryId: string
  executedAt: string
  timezone: string
  summary: {
    firstStepCount: number
    finalStepCount: number
    overallConversionRate: number
    totalLostCount: number
    avgDurationMs: number
    medianDurationMs: number
  }
  steps: FunnelStepResult[]
  groups: FunnelGroupResult[]
  comparisonGroups: FunnelGroupResult[]
  trend: FunnelTrendPoint[]
  comparisonTrend: FunnelTrendPoint[]
  duration: {
    histogram: FunnelDurationBucket[]
    boxplot: FunnelDurationStats
  }
  comparisonDuration: Array<{
    groupKey: string
    groupName: string
    histogram: FunnelDurationBucket[]
    boxplot: FunnelDurationStats
  }>
}

export interface FunnelUserRecord {
  userId: string
  firstStepTime: string
  reachedStepTime?: string
  lostAfterStepId?: string
  durationMs?: number
  groupValue: string
  pathName: string
  stepEvents: Array<{
    stepId: string
    eventName: string
    eventTime: string
  }>
}

export interface FunnelTemplate {
  id: string
  name: string
  description: string
  category: string
  ownerId: string
  visibility: 'private' | 'team' | 'public'
  config: {
    funnelMode: FunnelMode
    calculationType: FunnelCalculationType
    conversionWindow: FunnelConversionWindow
    steps: FunnelStep[]
    relationProperties: FunnelRelationProperty[]
  }
  createdAt: string
  updatedAt: string
}

export interface FunnelSavedAnalysisPayload {
  name: string
  description: string
  tags: string[]
  spaceType: 'personal' | 'team'
  timeMode: 'fixed' | 'relative'
  queryConfig: FunnelQueryRequest
  viewConfig: FunnelViewConfig
}

export interface FunnelDashboardWidgetPayload {
  title: string
  dashboardId: string
  widgetType: 'funnel_steps' | 'funnel_trend' | 'funnel_duration' | 'funnel_table'
  refreshPolicy: FunnelDashboardRefreshPolicy
  timeMode: 'fixed' | 'relative'
  queryConfig: FunnelQueryRequest
  chartConfig: FunnelViewConfig
}

export interface FunnelActionResult {
  success: boolean
  id: string
  message: string
}

export interface FunnelMetadata {
  eventMetadata: EventMetadata
  templates: FunnelTemplate[]
  recommendedEvents: EventDefinition[]
}
