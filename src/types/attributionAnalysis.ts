import type { EventMetadata } from './eventAnalysis'

export type AttributionType = 'event' | 'property'

export type AttributionSubjectType = 'user_id' | 'device_id' | 'account_id' | 'anonymous_id' | 'custom_id'

export type AttributionPlatformType = 'app' | 'web' | 'mini_program' | 'internal'

export type TargetMetricAggregator = 'COUNT' | 'USER_COUNT' | 'SUM' | 'AVG' | 'MAX' | 'MIN'

export type AttributionPropertyType = 'number' | 'string' | 'datetime' | 'boolean'

export type AttributionPropertyScope =
  | 'event_property'
  | 'event_public_property'
  | 'user_property'
  | 'subject_property'
  | 'user_tag'
  | 'cohort'
  | 'ad_property'

export type AttributionFilterOperator =
  | 'eq'
  | 'neq'
  | 'in'
  | 'not_in'
  | 'contains'
  | 'not_contains'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'is_null'
  | 'not_null'

export type AttributionFilterRelation = 'AND' | 'OR'

export type AttributionModelType =
  | 'FIRST_TOUCH'
  | 'LAST_TOUCH'
  | 'LINEAR'
  | 'POSITION_BASED'
  | 'TIME_DECAY'

export type AttributionResultMode = 'table' | 'bar' | 'trend' | 'model_compare' | 'path_detail'

export type AttributionSortBy =
  | 'contribution_desc'
  | 'contribution_asc'
  | 'target_metric_desc'
  | 'trigger_count_desc'
  | 'correlation_desc'

export type AttributionQueryState = 'idle' | 'dirty' | 'validating' | 'loading' | 'success' | 'empty' | 'error'

export type AttributionLookbackUnit = 'minute' | 'hour' | 'day'

export type AttributionGranularity = 'hour' | 'day' | 'week' | 'month'

export type AttributionNodeType = 'event' | 'property' | 'other' | 'unknown'

export interface AttributionFilterCondition {
  id: string
  relation: AttributionFilterRelation
  fieldType: AttributionPropertyScope
  fieldName: string
  fieldDisplayName: string
  operator: AttributionFilterOperator
  value: string | number | boolean | Array<string | number> | [number, number] | null
  displayValue: string
  childFilters?: AttributionFilterCondition[]
}

export interface SegmentFilter {
  relation: AttributionFilterRelation
  conditions: AttributionFilterCondition[]
}

export interface TargetMetricConfig {
  aggregator: TargetMetricAggregator
  propertyName?: string
  propertyDisplayName?: string
  propertyType?: AttributionPropertyType
}

export interface TargetEventConfig {
  eventName: string
  eventDisplayName: string
  filters: AttributionFilterCondition[]
  metric: TargetMetricConfig
}

export interface AttributionNodeGroupBy {
  fieldType: AttributionPropertyScope
  fieldName: string
  fieldDisplayName: string
  topN: number
}

export interface AttributionEventNode {
  id: string
  nodeType: 'event'
  eventName: string
  eventDisplayName: string
  alias: string
  filters: AttributionFilterCondition[]
  groupBy?: AttributionNodeGroupBy
}

export interface AttributionPropertyNode {
  id: string
  nodeType: 'property'
  sourceEventName?: string
  propertyScope: AttributionPropertyScope
  propertyName: string
  propertyDisplayName: string
  valueLimit: number
  includeUnknown: boolean
  includeOthers: boolean
  filters: AttributionFilterCondition[]
}

export interface EventAttributionConfig {
  attributionType: 'event'
  nodes: AttributionEventNode[]
  includeOtherConversions: boolean
}

export interface PropertyAttributionConfig {
  attributionType: 'property'
  propertyNode: AttributionPropertyNode
}

export interface RelationProperty {
  id: string
  leftEventId: string
  leftEventName: string
  leftPropertyName: string
  leftPropertyDisplayName: string
  rightEventId: string
  rightEventName: string
  rightPropertyName: string
  rightPropertyDisplayName: string
  propertyType: AttributionPropertyType
}

export interface ProcessEvent {
  id: string
  eventName: string
  eventDisplayName: string
  filters: AttributionFilterCondition[]
  relationProperties: RelationProperty[]
}

export interface ProcessEventConfig {
  enabled: boolean
  events: ProcessEvent[]
  relation: 'ALL_REQUIRED' | 'ANY_REQUIRED'
}

export interface QueryTimeConfig {
  startTime: string
  endTime: string
  granularity: AttributionGranularity
  timezone: string
}

export interface LookbackWindow {
  value: number
  unit: AttributionLookbackUnit
}

export interface TimeDecayConfig {
  halfLifeValue: number
  halfLifeUnit: 'hour' | 'day'
}

export interface PositionBasedConfig {
  firstWeight: number
  lastWeight: number
  middleWeight: number
}

export interface ClickAttributionWindow {
  enabled: boolean
  value: number
  unit: 'hour' | 'day'
  matchMethods: Array<'device_id' | 'fingerprint' | 'clipboard' | 'srn'>
}

export interface ImpressionAttributionWindow {
  enabled: boolean
  value: number
  unit: 'hour'
}

export interface ReAttributionWindow {
  value: number
  unit: 'day'
}

export interface DeepEventPostbackWindow {
  value: number
  unit: 'day'
}

export type WebAttributionPropertyMode =
  | 'recent_ad_property'
  | 'first_ad_property'
  | 'session_ad_property'
  | 'landing_page_ad_property'

export interface AttributionWindowConfig {
  click: ClickAttributionWindow
  impression: ImpressionAttributionWindow
  reAttribution: ReAttributionWindow
  deepEventPostback: DeepEventPostbackWindow
  webPropertyMode: WebAttributionPropertyMode
}

export interface AttributionViewConfig {
  resultMode: AttributionResultMode
  sortBy: AttributionSortBy
  showUnknown: boolean
  showOthers: boolean
}

export interface AttributionQueryRequest {
  projectId: string
  subject: {
    subjectType: AttributionSubjectType
    displayName: string
  }
  platformType: AttributionPlatformType
  timezone: string
  targetEvent?: TargetEventConfig
  attributionConfig: EventAttributionConfig | PropertyAttributionConfig
  processEventConfig?: ProcessEventConfig
  segmentFilter?: SegmentFilter
  queryTime: QueryTimeConfig
  lookbackWindow: LookbackWindow
  selectedModels: AttributionModelType[]
  modelOptions: {
    timeDecay: TimeDecayConfig
    positionBased: PositionBasedConfig
  }
  attributionWindowConfig: AttributionWindowConfig
  viewConfig: AttributionViewConfig
}

export interface AttributionResultRow {
  rowId: string
  attributionKey: string
  attributionLabel: string
  nodeType: AttributionNodeType
  triggerCount: number
  validTriggerCount: number
  validTriggerRate: number
  targetMetricValue: number
  contributionRate: number
  correlation?: number
  modelType: AttributionModelType
  groupValues?: Record<string, string | number>
}

export interface AttributionTrendResult {
  timeBucket: string
  modelType: AttributionModelType
  rows: Array<{
    attributionKey: string
    attributionLabel: string
    targetMetricValue: number
    contributionRate: number
    triggerCount: number
    validTriggerRate: number
  }>
}

export interface TouchPoint {
  id: string
  nodeId: string
  nodeType: 'event' | 'property'
  eventId: string
  eventName: string
  eventDisplayName: string
  eventTime: string
  attributionKey: string
  attributionValue: string
  properties: Record<string, string | number | boolean>
}

export interface ProcessMatchedEvent {
  eventId: string
  eventName: string
  eventDisplayName: string
  eventTime: string
  properties: Record<string, string | number | boolean>
}

export interface AttributionPath {
  pathId: string
  subjectId: string
  targetEventId: string
  targetEventName: string
  targetEventDisplayName: string
  targetEventTime: string
  targetMetricValue: number
  modelType: AttributionModelType
  touches: TouchPoint[]
  touchWeights: Array<{
    touchId: string
    attributionLabel: string
    weight: number
    attributedValue: number
  }>
  processEvents: ProcessMatchedEvent[]
}

export interface AttributionQueryResponse {
  queryId: string
  executedAt: string
  timezone: string
  summary: {
    targetEventCount: number
    attributedTargetMetric: number
    unattributedTargetMetric: number
    attributedRate: number
    modelCount: number
  }
  models: Array<{
    modelType: AttributionModelType
    rows: AttributionResultRow[]
    totals: {
      targetMetricTotal: number
      validTouchCount: number
      contributionTotal: number
    }
  }>
  trend: AttributionTrendResult[]
  pathSamples: AttributionPath[]
  metadata: {
    targetEventName: string
    targetEventDisplayName: string
    attributionType: AttributionType
    lookbackWindowLabel: string
    queryTimeLabel: string
  }
}

export interface AttributionUserRecord {
  subjectId: string
  targetEventId: string
  targetEventTime: string
  targetMetricValue: number
  attributedValue: number
  attributionWeight: number
  pathSummary: string
}

export interface AttributionUserListResponse {
  total: number
  users: AttributionUserRecord[]
}

export interface AttributionPathResponse {
  total: number
  paths: AttributionPath[]
}

export interface RecommendedAttributionProperty {
  propertyScope: AttributionPropertyScope
  propertyName: string
  propertyDisplayName: string
  propertyType: AttributionPropertyType
  platformTypes: AttributionPlatformType[]
}

export interface AttributionMetadata {
  eventMetadata: EventMetadata
  recommendedProperties: RecommendedAttributionProperty[]
}

export interface AttributionActionResult {
  success: boolean
  id: string
  message: string
}

export interface SavedAttributionAnalysisPayload {
  name: string
  description: string
  tags: string[]
  queryConfig: AttributionQueryRequest
  timeMode: 'fixed' | 'relative'
  favorite: boolean
}

export interface AttributionDashboardWidgetPayload {
  title: string
  widgetType: 'attribution_table' | 'attribution_bar' | 'attribution_trend' | 'attribution_model_compare'
  dashboard: string
  sourceQueryConfig: AttributionQueryRequest
  refreshPolicy: 'manual' | 'hourly' | 'daily'
}
