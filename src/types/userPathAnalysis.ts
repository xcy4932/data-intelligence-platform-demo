import type { EventMetadata } from './eventAnalysis'

export type UserPathDirection = 'START_FROM' | 'END_AT'

export type UserPathSubjectType = 'user_id' | 'device_id' | 'account_id' | 'anonymous_id' | 'custom_id'

export type UserPathSessionUnit = 'second' | 'minute' | 'hour'

export type UserPathRatioMode = 'TOTAL' | 'STEP' | 'SOURCE'

export type UserPathQueryState = 'idle' | 'dirty' | 'validating' | 'loading' | 'success' | 'empty' | 'error'

export type UserPathNodeType =
  | 'EVENT'
  | 'UNSELECTED_EVENT'
  | 'DROP_OFF'
  | 'MORE_GROUP'
  | 'NO_PREVIOUS_EVENT'
  | 'UNKNOWN_GROUP_VALUE'

export type UserPathFilterRelation = 'AND' | 'OR'

export type UserPathFilterFieldType =
  | 'event_property'
  | 'user_property'
  | 'user_tag'
  | 'cohort'
  | 'subject_property'

export type UserPathFilterOperator =
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

export interface UserPathFilterCondition {
  id: string
  relation: UserPathFilterRelation
  fieldType: UserPathFilterFieldType
  fieldName: string
  fieldDisplayName: string
  operator: UserPathFilterOperator
  value: string | number | boolean | Array<string | number> | [number, number] | null
  displayValue: string
  childFilters?: UserPathFilterCondition[]
}

export interface UserPathFilterGroup {
  relation: UserPathFilterRelation
  conditions: UserPathFilterCondition[]
}

export interface UserPathCoreEventConfig {
  eventName: string
  eventDisplayName: string
  filters: UserPathFilterGroup
}

export interface UserPathEventConfig {
  id: string
  eventName: string
  eventDisplayName: string
  alias?: string
  filters: UserPathFilterGroup
  isCoreEvent: boolean
}

export interface UserPathSessionConfig {
  intervalValue: number
  intervalUnit: UserPathSessionUnit
}

export interface UserPathGroupByConfig {
  enabled: boolean
  targetEventId: string
  fieldType: 'event_property' | 'user_property' | 'user_tag' | 'subject_property'
  fieldName: string
  fieldDisplayName: string
  valueLimit: number
  includeOthers: boolean
  includeUnknown: boolean
}

export interface UserPathViewConfig {
  pathStepCount: number
  maxNodesPerStep: number
  minTrafficRatio: number
  ratioMode: UserPathRatioMode
  pinnedNodes: Array<{
    stepIndex: number
    nodeKey: string
  }>
}

export interface UserPathQueryRequest {
  projectId: string
  subject: {
    subjectType: UserPathSubjectType
    displayName: string
  }
  timezone: string
  direction: UserPathDirection
  coreEvent?: UserPathCoreEventConfig
  intermediateEvents: UserPathEventConfig[]
  includeUnselectedEvents: boolean
  sessionConfig: UserPathSessionConfig
  mergeConsecutiveDuplicateEvents: boolean
  segmentFilter: UserPathFilterGroup
  groupBy: UserPathGroupByConfig
  timeConfig: {
    startTime: string
    endTime: string
    granularity: 'day'
  }
  viewConfig: UserPathViewConfig
}

export interface UserPathStep {
  stepIndex: number
  label: string
  totalUserCount: number
  totalPathCount: number
}

export interface AggregatedPathNode {
  id: string
  stepIndex: number
  nodeKey: string
  nodeLabel: string
  nodeType: UserPathNodeType
  eventName?: string
  userCount: number
  pathCount: number
  ratioOfTotal: number
  ratioOfStep: number
}

export interface AggregatedPathEdge {
  id: string
  sourceNodeId: string
  targetNodeId: string
  sourceStepIndex: number
  targetStepIndex: number
  sourceLabel: string
  targetLabel: string
  userCount: number
  pathCount: number
  ratioOfSource: number
  ratioOfTotal: number
}

export interface HiddenNodeGroup {
  stepIndex: number
  reason: 'MAX_NODE_LIMIT' | 'TRAFFIC_THRESHOLD'
  mergedIntoNodeId: string
  originalNodes: Array<{
    nodeKey: string
    nodeLabel: string
    nodeType: UserPathNodeType
    eventName?: string
    userCount: number
    ratioOfStep: number
  }>
}

export interface UnselectedEventBreakdown {
  stepIndex: number
  eventName: string
  eventDisplayName: string
  userCount: number
  ratioOfUnselected: number
  ratioOfTotal: number
}

export interface UserPathQueryResponse {
  queryId: string
  executedAt: string
  timezone: string
  summary: {
    coreUserCount: number
    corePathCount: number
    direction: UserPathDirection
    pathStepCount: number
    totalDisplayedNodes: number
    totalDisplayedEdges: number
  }
  steps: UserPathStep[]
  nodes: AggregatedPathNode[]
  edges: AggregatedPathEdge[]
  hiddenNodeGroups: HiddenNodeGroup[]
  unselectedEventBreakdown: UnselectedEventBreakdown[]
  warnings: Array<{
    code: string
    message: string
  }>
}

export interface UserPathUserRecord {
  subjectId: string
  pathInstanceId: string
  firstEventTime: string
  lastEventTime: string
  pathSummary: string
  nodeEventTime?: string
}

export interface UserPathUserListResponse {
  total: number
  users: UserPathUserRecord[]
}

export interface UserPathSample {
  pathInstanceId: string
  subjectId: string
  nodes: Array<{
    stepIndex: number
    nodeLabel: string
    nodeType: UserPathNodeType
    eventTime?: string
  }>
}

export interface UserPathSampleResponse {
  total: number
  paths: UserPathSample[]
}

export interface UserPathMetadata {
  eventMetadata: EventMetadata
}

export interface UserPathActionResult {
  id: string
  message: string
}

export interface SavedUserPathAnalysisPayload {
  name: string
  description?: string
  tags: string[]
  queryConfig: UserPathQueryRequest
  viewConfig: UserPathViewConfig
  timeMode: 'fixed' | 'relative'
  favorite: boolean
}

export interface UserPathDashboardWidgetPayload {
  title: string
  dashboard: string
  sourceQueryConfig: UserPathQueryRequest
  chartConfig: UserPathViewConfig
  timeMode: 'fixed' | 'relative'
  refreshPolicy: 'manual' | 'daily'
  inheritPermission: boolean
}
