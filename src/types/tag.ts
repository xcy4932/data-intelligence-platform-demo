import type { EntityId, ISODateString, ISODateTimeString, Owner } from './common'

export type TagType =
  | 'rule'
  | 'statistic'
  | 'first_last'
  | 'preference'
  | 'priority'
  | 'calculation'
  | 'lifecycle'
  | 'rfm'
  | 'import'
  | 'manual'
  | 'sql'
  | 'model'

export type TagValueType =
  | 'text'
  | 'integer'
  | 'decimal'
  | 'multi_text'
  | 'multi_integer'
  | 'multi_decimal'
  | 'date'
  | 'datetime'
  | 'multi_date'
  | 'multi_datetime'

export type TagStatus = 'draft' | 'online' | 'offline' | 'deleted'

export type TagComputeType = 'offline' | 'realtime'

export type TagUpdateType = 'manual' | 'scheduled' | 'realtime'

export type TagFrequencyUnit = 'day' | 'week' | 'month' | 'realtime'

export type TagEmptyValueStrategy = 'empty' | 'keep_previous'

export type TagTtlStrategy = 'system' | 'custom'

export type TagRunStatus = 'running' | 'success' | 'failed' | 'waiting' | 'stopped' | 'other'

export type TagRunTriggerType = 'manual' | 'scheduled' | 'realtime' | 'rerun'

export type TagPermissionLevel = 'view' | 'edit' | 'manage'

export type TagMetadataDataType = 'text' | 'single_select' | 'multi_select'

export type TagLineageAssetType = 'data_source' | 'tag' | 'segment' | 'analysis' | 'api'

export type TagTemplateStatus = 'available' | 'created'

export type TagSortMode = 'value_asc' | 'value_desc' | 'count_asc' | 'count_desc' | 'custom'

export interface TagPermissionSet {
  viewTagSystem: boolean
  createTag: boolean
  createTypes: TagType[]
  editTagTree: boolean
  viewTagTask: boolean
  shelveTag: boolean
  tagView: boolean
  tagEdit: boolean
  tagManage: boolean
  runTag: boolean
  projectAdmin: boolean
  sqlPrivateDeployment: boolean
  realtimeEnabled: boolean
  templateEnabled: boolean
}

export interface TagCategory {
  id: EntityId
  parentId: EntityId | null
  name: string
  level: number
  sort: number
  tagCount: number
  system: boolean
  canEdit: boolean
}

export interface TagFrequencyConfig {
  unit: TagFrequencyUnit
  time?: string
  dayOfWeek?: number
  dayOfMonth?: number
}

export interface TagTtlConfig {
  strategy: TagTtlStrategy
  value?: number
  unit?: Exclude<TagFrequencyUnit, 'realtime'>
}

export interface TagRuntimePermission {
  canView: boolean
  canEdit: boolean
  canManage: boolean
  canShelve: boolean
  canRun: boolean
}

export interface TagRuleCondition {
  id: EntityId
  sourceType: 'tag' | 'attribute' | 'behavior' | 'detail' | 'sql' | 'model'
  sourceName: string
  field: string
  operator: string
  value: string
  dateMode?: 'dynamic' | 'fixed' | 'single'
  dateRange?: string
  behaviorPath?: string
  aggregateMethod?: string
  aggregateField?: string
  timeWindowDays?: number
  childGroup?: TagRuleGroup
  childGroups?: TagRuleGroup[]
}

export interface TagRuleGroup {
  id: EntityId
  relation?: 'and' | 'or'
  logic: 'and' | 'or'
  conditions: TagRuleCondition[]
  groups?: TagRuleGroup[]
}

export interface TagValueRule {
  id: EntityId
  name: string
  priority: number
  include: TagRuleGroup
  exclude: TagRuleGroup
}

export interface TagRuleConfig {
  type: TagType
  summary: string
  values?: TagValueRule[]
  sourceType?: 'behavior' | 'detail' | 'attribute' | 'tag'
  dataSource?: string
  dateRange?: string
  behaviorPath?: string
  eventName?: string
  detailTable?: string
  attributeTable?: string
  timeField?: string
  targetField?: string
  filterGroup?: TagRuleGroup
  excludeGroup?: TagRuleGroup
  aggregateMethod?: string
  aggregateField?: string
  distinctField?: string
  postAggregateOperator?: string
  postAggregateValue?: string
  statisticMethod?: string
  firstLastMode?: 'first' | 'last'
  outputMode?: 'event_time' | 'days_since' | 'attribute'
  outputAttribute?: string
  topN?: number
  sortMode?: TagSortMode
  preferenceMetric?: 'count_most' | 'numeric_max' | 'sum' | 'average'
  preferenceField?: string
  tieBreaker?: string
  outputFeature?: string
  displayMode?: 'raw' | 'range'
  intervals?: Array<{ id: EntityId; name: string; min?: number; max?: number }>
  selectedFields?: Array<{ id: EntityId; name: string; valueType: TagValueType }>
  assignmentRules?: Array<{ fieldId: EntityId; mode: 'raw' | 'enum' | 'range' | 'days_since'; defaultValue?: number; mappings: Array<{ id: EntityId; label: string; value: number; min?: number; max?: number }> }>
  expression?: string
  emptyHandling?: 'zero' | 'discard'
  resultBounds?: { min?: number; max?: number }
  fieldBounds?: Array<{ fieldId: EntityId; min?: number; max?: number }>
  lifecycleModel?: 'AIPL' | '5A' | 'custom'
  rfmSourceType?: 'detail' | 'attribute' | 'tag'
  rfmPeriod?: string
  rfmMetrics?: Array<{ key: 'R' | 'F' | 'M'; enabled: boolean; field?: string; method?: string; compareType?: 'average' | 'median' | 'custom'; customThreshold?: number; threshold: string }>
  rfmValueNames?: Array<{ code: string; name: string }>
  sql?: string
  sqlFieldMappings?: Array<{ sourceColumn: string; targetField: 'subject_id' | 'tag_value' | 'partition_date'; required: boolean }>
  manualIdType?: 'user_id' | 'member_id' | 'subject_id'
  manualDelimiter?: ',' | ' ' | '\n'
  uploadMode?: 'cover' | 'remove'
  importFields?: Array<{ id: EntityId; sourceField: string; sourceType?: string; tagName: string; categoryId: EntityId; valueType: TagValueType; forceCast?: boolean }>
  modelTaskId?: EntityId
}

export interface TagDefinition {
  id: EntityId
  projectId: EntityId
  subjectId: EntityId
  subjectName: string
  name: string
  description: string
  type: TagType
  valueType: TagValueType
  categoryId: EntityId
  status: TagStatus
  computeType: TagComputeType
  updateType: TagUpdateType
  frequency: TagFrequencyConfig
  emptyValueStrategy: TagEmptyValueStrategy
  ttl: TagTtlConfig
  onlineServiceEnabled: boolean
  valueSaveMode?: 'single' | 'multi'
  metadata: Record<EntityId, string | string[]>
  rule: TagRuleConfig
  createdBy: Owner
  createdAt: ISODateTimeString
  updatedAt: ISODateTimeString
  latestDataDate?: ISODateString
  latestDurationMs?: number
  latestRunStatus?: TagRunStatus
  resourceAdmins: Owner[]
  permissions: TagRuntimePermission
  favorite: boolean
  visible: boolean
  fromTemplate: boolean
  downstreamDependencyCount: number
  syncedProjectIds: EntityId[]
}

export interface TagRuleVersion {
  id: EntityId
  tagId: EntityId
  versionNo: number
  rule: TagRuleConfig
  isCurrent: boolean
  createdBy: Owner
  createdAt: ISODateTimeString
}

export interface TagRunRecord {
  id: EntityId
  tagId: EntityId
  runDate: ISODateString
  partitionDate: ISODateString
  triggerType: TagRunTriggerType
  status: TagRunStatus
  startedAt?: ISODateTimeString
  endedAt?: ISODateTimeString
  durationMs?: number
  operator: string
  errorMessage?: string
  logUrl?: string
}

export interface TagPermission {
  id: EntityId
  tagId: EntityId
  principalType: 'user' | 'group'
  principalId: EntityId
  principalName: string
  permission: TagPermissionLevel
  grantedBy: string
  grantedAt: ISODateTimeString
}

export interface TagMetadataField {
  id: EntityId
  projectId: EntityId
  name: string
  dataType: TagMetadataDataType
  required: boolean
  enumValues: string[]
  quickFilterEnabled: boolean
  description?: string
  createdBy: string
  createdAt: ISODateTimeString
  status: 'enabled' | 'disabled'
}

export interface TagOperationLog {
  id: EntityId
  tagId: EntityId
  operator: string
  actionType: 'create' | 'edit' | 'online' | 'offline' | 'delete' | 'authorize' | 'rerun' | 'metadata' | 'move'
  content: string
  beforeJson?: string
  afterJson?: string
  createdAt: ISODateTimeString
}

export interface TagTemplate {
  id: EntityId
  name: string
  description: string
  categoryPath: string
  ruleSummary: string
  status: TagTemplateStatus
  tagType: TagType
  lifecycleTemplate: boolean
}

export interface TagLineageNode {
  id: EntityId
  name: string
  assetType: TagLineageAssetType
  direction: 'upstream' | 'downstream'
  level: number
  status: 'normal' | 'unavailable' | 'waiting'
}

export interface TagDependencyRisk {
  tagId: EntityId
  tagName: string
  downstreamCount: number
  resources: TagLineageNode[]
  message: string
}

export interface TagValueDistribution {
  value: string
  count: number
  rate: number
  sort: number
}

export interface TagHistoryPoint {
  date: ISODateString
  total: number
  values: Array<{ value: string; count: number }>
}

export interface TagValueAssessment {
  lastUsedDays: number
  internalUsageCount: number
  internalReferenceCount: number
  internalQueryCount: number
  externalCallCount: number
  apiCallCount: number
  p95LatencyMs: number
  errorRate: number
}

export interface TagDetailBundle {
  tag: TagDefinition
  ruleVersions: TagRuleVersion[]
  runs: TagRunRecord[]
  permissions: TagPermission[]
  distributions: TagValueDistribution[]
  history: TagHistoryPoint[]
  lineage: TagLineageNode[]
  assessment: TagValueAssessment
  operationLogs: TagOperationLog[]
}

export interface TagListFilters {
  keyword?: string
  categoryId?: EntityId
  ignoreCategory?: boolean
  creator?: string
  types?: TagType[]
  valueTypes?: TagValueType[]
  statuses?: TagStatus[]
  runStatuses?: TagRunStatus[]
  metadata?: Record<EntityId, string | string[]>
}

export interface TagCreatePayload {
  name: string
  description: string
  type: TagType
  valueType: TagValueType
  categoryId: EntityId
  computeType: TagComputeType
  updateType: TagUpdateType
  frequency: TagFrequencyConfig
  emptyValueStrategy: TagEmptyValueStrategy
  ttl: TagTtlConfig
  onlineServiceEnabled: boolean
  valueSaveMode?: 'single' | 'multi'
  metadata: Record<EntityId, string | string[]>
  rule: TagRuleConfig
  saveAsDraft?: boolean
}

export interface TagEstimateResult {
  total: number
  emptyCount: number
  coverageRate: number
  values: TagValueDistribution[]
  message: string
}

export interface TagSqlParseResult {
  ok: boolean
  message: string
  columns: Array<{ name: string; type: string }>
  previewRows: Array<Record<string, string | number>>
}

export interface TagUploadResult {
  successRows: number
  failedRows: number
  errors: Array<{ row: number; reason: string }>
}

export interface TagBulkResult {
  successIds: EntityId[]
  failures: Array<{ tagId: EntityId; reason: string }>
}
