export type DatasetTreeSection = 'custom' | 'theme' | 'recycle'

export type DatasetType =
  | 'normal'
  | 'associated'
  | 'theme_cdp'
  | 'theme_data_insight'
  | 'theme_gmp'
  | 'las'

export type DatasetSourceMode = 'direct' | 'extract' | 'theme' | 'associated'
export type DatasetStorageEngine = 'clickhouse' | 'hive' | 'bytehouse' | 'las' | 'kafka' | 'mysql' | 'unknown'
export type DatasetStatus =
  | 'draft'
  | 'editing'
  | 'validating'
  | 'saved'
  | 'syncing'
  | 'sync_success'
  | 'sync_failed'
  | 'disabled'
  | 'deleted'

export type DatasetPermission = 'none' | 'read_preview' | 'view' | 'edit' | 'admin'
export type DatasetVisibility = 'private' | 'team' | 'public'
export type DatasetCategory = 'personal' | 'shared' | 'public'
export type DatasetListSourceType =
  | 'data_connection'
  | 'visual_model'
  | 'theme_dataset'
  | 'mirror_dataset'
  | 'file_upload'
  | 'custom_sql'
export type DatasetListConnectionMode = 'direct' | 'extract' | 'theme' | 'mirror'
export type DatasetListSyncStatus =
  | 'none'
  | 'waiting'
  | 'running'
  | 'success'
  | 'failed'
  | 'partial_success'
  | 'disabled'
export type DatasetSensitivityLevel = 'unclassified' | 'sensitive_unmasked' | 'sensitive_masked' | 'non_sensitive'
export type SensitivityChoice = 'sensitive' | 'non_sensitive'
export type DatasetPriority = 'normal' | 'high' | 'very_high'
export type DatasetRunFrequency = 'none' | 'manual' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'other'

export type FieldType = 'string' | 'number' | 'integer' | 'decimal' | 'date' | 'datetime' | 'boolean' | 'json'
export type SemanticType = 'dimension' | 'measure' | 'time' | 'geo' | 'id' | 'unknown'
export type AggregationType = 'sum' | 'avg' | 'count' | 'count_distinct' | 'min' | 'max' | 'none'
export type JoinType = 'inner' | 'left' | 'right' | 'full'
export type UnionType = 'union_all' | 'union_distinct'
export type LogicOperator = 'AND' | 'OR'

export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'in'
  | 'not_in'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'is_null'
  | 'is_not_null'
  | 'regex'
  | 'last_n_days'

export type DatasetValue = string | number | boolean | null
export type DatasetPreviewRow = Record<string, DatasetValue>

export interface Dataset {
  id: string
  name: string
  description: string
  datasetType: DatasetType
  sourceMode: DatasetSourceMode
  folderId: string
  section: DatasetTreeSection
  owner: string
  visibility: DatasetVisibility
  permission: DatasetPermission
  readonly: boolean
  status: DatasetStatus
  storageEngine: DatasetStorageEngine
  connectionId?: string
  connectionName?: string
  databaseName?: string
  tableName?: string
  rowCount: number
  fieldCount: number
  tags: string[]
  updatedAt: string
  createdAt: string
  lastSyncAt?: string
  deletedAt?: string
  datasetCategory?: DatasetCategory
  sourceType?: DatasetListSourceType
  connectionMode?: DatasetListConnectionMode
  syncStatus?: DatasetListSyncStatus
  sensitivityLevel?: DatasetSensitivityLevel
  desensitizationVersion?: number
  alarmOwner?: string
  priority?: DatasetPriority
  queueName?: string
  runFrequency?: DatasetRunFrequency
  dataSizeBytes?: number
  latestAccessTime?: string
  usageInstructionUrl?: string
  defaultVisualQueryUrl?: string
  visualQueryConfig?: {
    allowSubscription: boolean
    allowMonitoring: boolean
    allowAutoQuery: boolean
    allowFilterSearchOptimization: boolean
    maxQueryDaysEnabled: boolean
    maxQueryDays?: number
    allowDropTimeoutNode: boolean
    detailFieldIds: string[]
    timeoutAccuracyLossThreshold: number
  }
}

export interface DatasetFolder {
  id: string
  name: string
  section: DatasetTreeSection
  parentId?: string
  readonly?: boolean
}

export interface DatasetListFilter {
  keyword?: string
  section?: DatasetTreeSection
  datasetType?: DatasetType | 'all'
  status?: DatasetStatus | 'all'
  owner?: string | 'all'
}

export interface SourceField {
  id: string
  name: string
  displayName: string
  fieldType: FieldType
  description?: string
  isPrimaryKey?: boolean
  isPartitionField?: boolean
}

export interface SourceTableItem {
  id: string
  connectionId: string
  connectionName: string
  databaseName: string
  schemaName?: string
  tableName: string
  displayName: string
  tableType: 'table' | 'view' | 'file' | 'topic'
  sourceMode: DatasetSourceMode
  storageEngine: DatasetStorageEngine
  hasPermission: boolean
  fieldCount: number
  rowCount: number
  isPartitioned?: boolean
  fields: SourceField[]
}

export interface DatasetField {
  id: string
  name: string
  displayName: string
  fieldType: FieldType
  semanticType: SemanticType
  aggregation: AggregationType
  visible: boolean
  sortable: boolean
  isPrimaryKey?: boolean
  isPartitionField?: boolean
  expression?: string
  sourceNodeId?: string
  sourceFieldName?: string
  description?: string
}

export interface FilterCondition {
  id: string
  logic: LogicOperator
  fieldId: string
  fieldName: string
  fieldType: FieldType
  operator: FilterOperator
  value?: DatasetValue
  valueList?: DatasetValue[]
  startValue?: DatasetValue
  endValue?: DatasetValue
  filterType: 'normal' | 'partition'
  children?: FilterCondition[]
}

export interface ModelFilterGroup {
  logic: 'AND'
  conditions: FilterCondition[]
}

export interface CustomSqlConfig {
  sql: string
  formattedSql: string
  validated: boolean
  validationMessage?: string
  previewFields: SourceField[]
}

export interface ModelNode {
  id: string
  type: 'table' | 'custom_sql' | 'dataset' | 'theme_dataset'
  alias: string
  sourceMode: DatasetSourceMode
  connectionId?: string
  connectionName?: string
  databaseName?: string
  schemaName?: string
  tableName?: string
  datasetId?: string
  selectedFields: SourceField[]
  preFilters: FilterCondition[]
  sqlConfig?: CustomSqlConfig
  position: {
    x: number
    y: number
  }
  status: 'normal' | 'invalid' | 'permission_denied' | 'schema_changed'
}

export interface JoinCondition {
  id: string
  leftField: string
  rightField: string
  operator: 'equals' | 'not_equals' | 'gt' | 'gte' | 'lt' | 'lte'
  useIdMapping?: boolean
}

export interface JoinConfig {
  joinType: JoinType
  conditions: JoinCondition[]
  expression: string
  idMappingEnabled: boolean
}

export interface UnionFieldMapping {
  id: string
  outputFieldName: string
  outputFieldType: FieldType
  sourceFieldMap: Record<string, string>
  compatible: boolean
}

export interface UnionConfig {
  unionType: UnionType
  fieldMappings: UnionFieldMapping[]
  mergeDuplicatedRows: boolean
}

export interface ModelEdge {
  id: string
  sourceNodeId: string
  targetNodeId: string
  relationType: 'join' | 'union'
  joinConfig?: JoinConfig
  unionConfig?: UnionConfig
  status: 'normal' | 'invalid'
}

export interface DatasetModel {
  datasetId: string
  nodes: ModelNode[]
  edges: ModelEdge[]
  outputFields: DatasetField[]
  modelFilter: ModelFilterGroup
  previewLimit: number
  version: number
}

export type SyncFrequency = 'manual' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'cron'
export type SyncTaskStatus = 'created' | 'waiting' | 'running' | 'success' | 'failed' | 'canceled'

export interface SyncConfig {
  datasetId: string
  enabled: boolean
  frequency: SyncFrequency
  scheduleText: string
  dependencyDatasetIds: string[]
  dependencyStrategy: 'all_success' | 'any_success' | 'none'
  alertOnFailure: boolean
  alertReceivers: string[]
  performance: {
    parallelism: number
    memoryGb: number
    timeoutMinutes: number
  }
  advancedParams: Record<string, string | number | boolean>
}

export interface SyncTask {
  id: string
  datasetId: string
  taskName: string
  status: SyncTaskStatus
  startedAt: string
  finishedAt?: string
  durationSeconds?: number
  rowCount?: number
  errorMessage?: string
  logLines: string[]
}

export interface PreviewResult {
  fields: DatasetField[]
  rows: DatasetPreviewRow[]
  sampleSize: number
  warning?: string
}

export interface DatasetLineageNode {
  id: string
  name: string
  nodeType: 'connection' | 'table' | 'dataset' | 'dashboard' | 'analysis'
  level: 'upstream' | 'current' | 'downstream'
}

export interface DatasetLineageEdge {
  id: string
  source: string
  target: string
  relation: string
}

export interface DatasetPermissionRule {
  id: string
  datasetId: string
  subjectType: 'user' | 'team' | 'role'
  subjectName: string
  permission: DatasetPermission
  permissions?: DatasetPermission[]
  rowRule?: string
  columnRule?: string
}

export type MaskMethod = 'none' | 'hash' | 'partial' | 'rounding' | 'replace'
export type MaskingRuleType =
  | 'preset_name'
  | 'preset_email'
  | 'preset_contact'
  | 'preset_china_id_general'
  | 'preset_china_citizen_id'
  | 'preset_full_mask'
  | 'custom_middle'
  | 'custom_head_tail'
  | 'custom_before_special_char'
  | 'custom_after_special_char'

export type MaskingScopeMode = 'members_masked_others_unmasked' | 'members_unmasked_others_masked'
export type MaskingScopeMemberType = 'user' | 'team' | 'role'
export type MaskingScene =
  | 'preview'
  | 'visual_query'
  | 'dashboard'
  | 'download'
  | 'subscription'
  | 'monitor'
  | 'embed'
  | 'saved_analysis'
export type MaskingRestrictedCapability =
  | 'alias_bypass'
  | 'group_by'
  | 'format'
  | 'calculated_field'
  | 'download_original'

export interface MaskingScopeMember {
  memberType: MaskingScopeMemberType
  memberId: string
  memberName: string
}

export interface MaskingRuleConfig {
  replacementChar: string
  keepPrefixLength?: number
  keepSuffixLength?: number
  keepStartIndex?: number
  keepEndIndex?: number
  specialChar?: string
  fixedReplacement?: string
}

export interface DataMaskRule {
  id: string
  datasetId: string
  fieldId?: string
  fieldName: string
  fieldDisplayName?: string
  fieldType?: FieldType
  semanticType?: SemanticType
  method: MaskMethod
  ruleType?: MaskingRuleType
  ruleConfig?: MaskingRuleConfig
  scopeMode?: MaskingScopeMode
  scopeMembers?: MaskingScopeMember[]
  scenes?: MaskingScene[]
  restrictedCapabilities?: MaskingRestrictedCapability[]
  example: string
  enabled: boolean
  createdBy?: string
  createdAt?: string
  updatedBy?: string
  updatedAt?: string
}

export interface CurrentUserContext {
  userId: string
  userGroupIds: string[]
  roleIds: string[]
}

export interface DesensitizationOperationLog {
  id: string
  datasetId: string
  operatorId: string
  operatorName: string
  operationType:
    | 'update_sensitivity_level'
    | 'add_masking_field'
    | 'remove_masking_field'
    | 'update_masking_rule'
    | 'update_effective_scope'
    | 'download_masked_data'
    | 'export_masked_dashboard'
    | 'send_masked_subscription'
    | 'runtime_mask_visual_query'
  beforeValue?: unknown
  afterValue?: unknown
  operatedAt: string
}

export interface SqlValidationResult {
  success: boolean
  message: string
  fields: SourceField[]
}

export interface DatasetDraftPayload {
  name?: string
  datasetType: DatasetType
  sourceMode: DatasetSourceMode
  connectionId?: string
  folderId?: string
  sensitivityChoice?: SensitivityChoice
  sourceDatasetIds?: string[]
}
