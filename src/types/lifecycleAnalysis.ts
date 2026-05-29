import type { EntityId, ISODateString, ISODateTimeString } from './common'

export type LifecycleReportStatus = 'enabled' | 'disabled' | 'deleted'
export type LifecycleTrendMetric = 'total' | 'new' | 'lost'
export type LifecycleTrendRangeKey = 'last_7_days' | 'last_14_days' | 'last_3_months' | 'last_6_months' | 'last_12_months' | 'custom'
export type LifecycleChartType = 'line' | 'bar' | 'donut' | 'metric' | 'table'
export type LifecycleTransitionSourceType = 'stage' | 'transition_node' | 'transition' | 'path_node' | 'path_edge'
export type LifecycleCrowdRange = 'all' | 'new' | 'lost' | 'transition_node' | 'transition' | 'path_node' | 'path_edge'
export type LifecyclePathUpdateMode = 'manual' | 'daily'
export type LifecyclePathStatus = 'calculating' | 'success' | 'failed'
export type LifecyclePathNodeType = 'start' | 'middle' | 'end'
export type LifecyclePathConditionType = 'tag' | 'event'
export type LifecycleWindowUnit = 'minute' | 'hour' | 'day'
export type LifecyclePermissionType = 'view' | 'edit' | 'manage_path' | 'report_manage'
export type LifecycleAuthPrincipalType = 'user' | 'user_group' | 'role' | 'department'
export type LifecycleBackendAuditResourceType = 'report' | 'tag' | 'chart' | 'path' | 'authorization' | 'segment' | 'demo'
export type LifecycleChartFilterSource = 'tag' | 'event' | 'attribute'
export type LifecycleChartFilterLogic = 'and' | 'or'
export type LifecycleChartFilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'greater_equal'
  | 'less_than'
  | 'less_equal'
  | 'between'
  | 'in'
  | 'not_in'
  | 'has_value'
  | 'no_value'

export interface LifecyclePermissionSet {
  viewReport: boolean
  editReport: boolean
  managePath: boolean
  manageReport: boolean
  createSegment: boolean
  viewGroupProfile: boolean
  manageAuthorization: boolean
  deleteLifecycleTag: boolean
  projectAdmin: boolean
  tagResourceView: boolean
  downloadChartData: boolean
}

export interface LifecycleStage {
  value: string
  name: string
  english: string
  description: string
  color: string
  order: number
  visible: boolean
}

export interface LifecycleReport {
  id: EntityId
  tagId: EntityId
  tagName: string
  name: string
  subjectType: string
  subjectName: string
  stages: LifecycleStage[]
  creatorId: EntityId
  creatorName: string
  createdAt: ISODateTimeString
  updatedAt: ISODateTimeString
  latestDataDate: ISODateString
  maxDataDate: ISODateString
  status: LifecycleReportStatus
  permissions: LifecyclePermissionSet
  resourcePermissions: LifecycleResourcePermissionSnapshot
  isDemo?: boolean
  unavailableReason?: string
}

export interface LifecycleResourcePermissionSnapshot {
  allowedSubjectTypes: string[]
  allowedTagIds: EntityId[]
  allowedStageValues?: string[]
  allowedEventNames: string[]
  allowedSegmentIds: EntityId[]
  rowAccessRatio: number
  projectAuthorizationId: EntityId
  projectAuthorizationName: string
  syncedAt: ISODateTimeString
  deniedReasons: Record<string, string>
}

export interface LifecycleReportSearchFilters {
  keyword: string
  subjectTypes: string[]
  stageValues: string[]
  creatorIds: string[]
  createdRange: [ISODateString, ISODateString] | null
  page: number
  pageSize: number
}

export interface LifecycleReportSearchResult {
  records: LifecycleReport[]
  total: number
  page: number
  pageSize: number
  permissions: LifecyclePermissionSet
}

export interface LifecycleFilterOptions {
  subjects: Array<{ label: string; value: string }>
  stages: Array<{ label: string; value: string }>
  creators: Array<{ label: string; value: string }>
}

export interface LifecycleStageSnapshot {
  id: EntityId
  reportId: EntityId
  stageValue: string
  date: ISODateString
  totalCount: number
  previousTotalCount: number
  dayGrowthRate: number | null
  newCount: number
  lostCount: number
  noComparableReason?: string
}

export interface LifecycleTrendPoint {
  date: ISODateString
  stageValue: string
  stageName: string
  metricType: LifecycleTrendMetric
  count: number
  previousCount: number
  changeRate: number | null
}

export interface LifecycleTransitionNode {
  id: EntityId
  stageValue: string
  stageName: string
  side: 'from' | 'to'
  userCount: number
  retainedCount: number
  newCount: number
  lostCount: number
}

export interface LifecycleTransitionEdge {
  id: EntityId
  fromStage: string
  fromStageName: string
  toStage: string
  toStageName: string
  userCount: number
  fromRatio: number
  toRatio: number
}

export interface LifecycleTransitionResult {
  nodes: LifecycleTransitionNode[]
  edges: LifecycleTransitionEdge[]
  startDate: ISODateString
  endDate: ISODateString
}

export interface LifecycleBusinessChart {
  id: EntityId
  reportId: EntityId
  title: string
  stageValues: string[]
  chartType: LifecycleChartType
  dimension: string
  metric: string
  timeRange: [ISODateString, ISODateString]
  filters: string
  filterLogic?: LifecycleChartFilterLogic
  filterConditions?: LifecycleChartFilterCondition[]
  sort: 'asc' | 'desc'
  topN: number
  updatedAt: ISODateTimeString
  loading?: boolean
  error?: boolean
}

export interface LifecycleChartFilterCondition {
  id: EntityId
  source: LifecycleChartFilterSource
  sourceId?: EntityId
  sourceName: string
  field: string
  label: string
  operator: LifecycleChartFilterOperator
  value: string
  value2?: string
  timeRange?: [ISODateString, ISODateString]
}

export interface LifecycleBusinessChartDataRow {
  name: string
  value: number
  stageName: string
  date?: ISODateString
}

export interface LifecycleChartDownloadFile {
  fileName: string
  mimeType: string
  content: string
}

export interface LifecyclePathPeriodConfig {
  quickKey: 'last_7_days' | 'last_14_days' | 'last_30_days' | 'custom'
  startDate: ISODateString
  endDate: ISODateString
}

export interface LifecyclePathConditionConfig {
  tagId?: EntityId
  tagName?: string
  tagValue?: string
  eventName?: string
  eventDisplayName?: string
  propertyFilter?: string
  timeLimit?: string
}

export interface LifecyclePathNode {
  id: EntityId
  pathId: EntityId
  nodeType: LifecyclePathNodeType
  nodeName: string
  conditionType: LifecyclePathConditionType
  conditionConfig: LifecyclePathConditionConfig
  windowValue: number
  windowUnit: LifecycleWindowUnit
  orderIndex: number
  userCount: number
  ratio: number
  lostCount: number
  lostRate: number
  conversionRate: number
}

export interface LifecyclePathEdge {
  id: EntityId
  fromNodeId: EntityId
  toNodeId: EntityId
  userCount: number
  conversionRate: number
  lostCount: number
}

export interface LifecyclePath {
  id: EntityId
  reportId: EntityId
  name: string
  description: string
  updateMode: LifecyclePathUpdateMode
  dailyExecuteTime?: string
  periodConfig: LifecyclePathPeriodConfig
  targetSegmentId?: EntityId
  targetSegmentName?: string
  status: LifecyclePathStatus
  nextRunAt?: ISODateTimeString
  lastRunAt?: ISODateTimeString
  creatorId: EntityId
  creatorName: string
  createdAt: ISODateTimeString
  updatedAt: ISODateTimeString
  nodes: LifecyclePathNode[]
  edges: LifecyclePathEdge[]
}

export interface LifecyclePathPayload {
  name: string
  description: string
  updateMode: LifecyclePathUpdateMode
  dailyExecuteTime?: string
  periodConfig: LifecyclePathPeriodConfig
  targetSegmentId?: EntityId
  targetSegmentName?: string
  nodes: Array<Omit<LifecyclePathNode, 'id' | 'pathId' | 'userCount' | 'ratio' | 'lostCount' | 'lostRate' | 'conversionRate'> & { id?: EntityId }>
}

export interface LifecycleExportSegmentPayload {
  reportId: EntityId
  sourceType: LifecycleTransitionSourceType
  sourceName: string
  stageValues: string[]
  crowdRange: LifecycleCrowdRange
  timeRange: [ISODateString, ISODateString]
  outputIdType: string
  segmentName: string
  description: string
  authTargets: LifecycleExportAuthTarget[]
  groupIds: string[]
  updateMode: 'on_demand' | 'daily'
  sourceConfig?: Record<string, unknown>
}

export interface LifecycleExportAuthTarget {
  principalType: LifecycleAuthPrincipalType
  principalId: EntityId
  principalName: string
}

export interface LifecycleExportSegmentResult {
  segmentId: EntityId
  segmentCount: number
  status: 'success' | 'empty' | 'failed'
  message: string
}

export interface LifecycleExportSegmentLog {
  id: EntityId
  reportId: EntityId
  sourceType: LifecycleTransitionSourceType
  sourceConfig: Record<string, unknown>
  segmentId: EntityId
  segmentName: string
  segmentCount: number
  creatorId: EntityId
  creatorName: string
  createdAt: ISODateTimeString
}

export interface LifecycleInsightPayload {
  reportId: EntityId
  insightObject: 'single' | 'merged'
  stageValues: string[]
  reportName: string
  entryMode: 'direct' | 'stay'
  sourceType?: LifecycleTransitionSourceType
  sourceName?: string
  crowdRange?: LifecycleCrowdRange
  timeRange?: [ISODateString, ISODateString]
  sourceConfig?: Record<string, unknown>
}

export interface LifecycleInsightResult {
  reportId: EntityId
  redirectPath: string
  message: string
}

export interface LifecycleAuthorization {
  id: EntityId
  reportId: EntityId
  principalType: LifecycleAuthPrincipalType
  principalId: EntityId
  principalName: string
  permissions: LifecyclePermissionType[]
  tagViewGranted: boolean
  projectAuthorizationId: EntityId
  projectAuthorizationName: string
  tagPermissionSyncedAt?: ISODateTimeString
  grantedBy: string
  grantedAt: ISODateTimeString
}

export interface LifecycleProjectAuthorizationLink {
  id: EntityId
  reportId: EntityId
  principalType: LifecycleAuthPrincipalType
  principalId: EntityId
  principalName: string
  permissions: LifecyclePermissionType[]
  tagPermissionLevel?: 'view' | 'edit' | 'manage'
  source: 'project_center'
  syncedAt: ISODateTimeString
}

export interface LifecycleAuditLog {
  id: EntityId
  userId: EntityId
  userName: string
  action: string
  reportId: EntityId
  tagId: EntityId
  targetId?: EntityId
  before?: string
  after?: string
  ip: string
  createdAt: ISODateTimeString
}

export interface LifecycleBackendAuditRecord {
  id: EntityId
  module: 'lifecycle_analysis'
  action: string
  resourceType: LifecycleBackendAuditResourceType
  resourceId: EntityId
  reportId: EntityId
  tagId: EntityId
  userId: EntityId
  userName: string
  before?: unknown
  after?: unknown
  metadata?: Record<string, unknown>
  ip: string
  createdAt: ISODateTimeString
}
