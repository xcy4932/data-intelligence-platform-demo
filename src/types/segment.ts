import type { EntityId, EntityStatus, ISODateString, ISODateTimeString, Owner } from './common'

export type SegmentType = 'rule' | 'upload' | 'advanced_manual' | 'subject_convert' | 'multi_subject' | 'split_child'

export type SegmentStatus = 'pending' | 'waiting' | 'running' | 'success' | 'failed' | 'expired' | 'deleted'

export type SegmentUpdateMode = 'manual' | 'daily' | 'scheduled'

export type SegmentEncryptionType = 'none' | 'sha256' | 'sm3' | 'md5'

export type SegmentCreateMethod = 'rule' | 'upload' | 'advanced_manual' | 'multi_subject'

export type SegmentRuleComputeMode = 'offline' | 'realtime'

export type SegmentSubjectMode = 'single' | 'multi'

export type SegmentConditionSource = 'tag' | 'behavior' | 'attribute' | 'detail' | 'segment'

export type SegmentLogic = 'and' | 'or'

export type SegmentLineageDirection = 'upstream' | 'downstream'

export type SegmentLineageAssetType = 'tag' | 'segment' | 'data_source' | 'relation_model' | 'analysis' | 'api' | 'campaign' | 'experiment'

export type SegmentRunStatus = 'success' | 'failed' | 'running' | 'waiting'

export type SegmentRunType = 'manual' | 'daily' | 'scheduled' | 'initial' | 'split' | 'subject_convert' | 'upload_replace' | 'manual_change'

export type SegmentGroupFilterLogic = 'any' | 'all'

export type SegmentDownloadFormat = 'txt' | 'csv' | 'gz'

export type SegmentSplitMode = 'random' | 'advanced'

export type SegmentRandomSplitStrategy = 'limit_count' | 'limit_package_count' | 'ratio'

export type SegmentAdvancedSplitLogic = 'include' | 'exclude' | 'top_n' | 'exclude_then_top_n'

export type SegmentServiceStatus = 'disabled' | 'enabled' | 'paused'

export type SegmentApplicationType = 'insight' | 'gmp' | 'visual_analysis' | 'experiment'

export type SegmentPrincipalType = 'user' | 'group' | 'role' | 'department'

export type SegmentPermissionLevel = 'view' | 'edit' | 'delete' | 'download' | 'manage'

export type SegmentUploadChangeMode = 'replace' | 'append' | 'remove'

export type SegmentRefreshMode = 'manual' | 'hourly' | 'daily'

export type SegmentRiskLevel = 'low' | 'medium' | 'high'

export type SegmentConditionOperator =
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

export interface SegmentPermissionSet {
  viewSegment: boolean
  createSegment: boolean
  manageSegment: boolean
  downloadSegment: boolean
  manageGroup: boolean
  multiSubject: boolean
  subjectConvert: boolean
  advancedManual: boolean
  advancedSplit: boolean
  downstreamApplication: boolean
  projectAdmin: boolean
}

export interface SegmentFeatureFlags {
  segmentCreationEnabled: boolean
  multiSubjectEnabled: boolean
  subjectConvertEnabled: boolean
  advancedManualPurchased: boolean
  advancedSplitPurchased: boolean
  idAutoIncrementEnabled: boolean
  multiSubjectDownloadAllEnabled: boolean
  gmpDeployed: boolean
  analyticsDeployed: boolean
  experimentDeployed: boolean
}

export interface SegmentRuntimePermission {
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  canDownload: boolean
  canAuthorize: boolean
  canUpdate: boolean
  canManageGroup: boolean
  canSplit: boolean
  canConfigureService: boolean
  canConfigureTtl: boolean
}

export interface SegmentSubject {
  id: EntityId
  name: string
  description: string
  idTypes: string[]
}

export interface SegmentIdTypeOption {
  id: string
  label: string
  subjectId: EntityId
  encryptedAtRest: boolean
  encryptionSupported: boolean
}

export interface SegmentGroup {
  id: EntityId
  name: string
  description: string
  segmentCount: number
  creator: Owner
  createdAt: ISODateTimeString
  updatedAt: ISODateTimeString
}

export interface SegmentAuthorization {
  id: EntityId
  segmentId: EntityId
  principalType: SegmentPrincipalType
  principalId: EntityId
  principalName: string
  permission: SegmentPermissionLevel
  grantedBy: Owner
  grantedAt: ISODateTimeString
}

export interface SegmentAuthorizationPrincipal {
  id: EntityId
  name: string
  type: SegmentPrincipalType
  department?: string
}

export interface SegmentConditionCatalogItem {
  id: EntityId
  source: SegmentConditionSource
  sourceName: string
  field: string
  label: string
  defaultOperator: SegmentConditionOperator
  defaultValue?: string | number | boolean | Array<string | number>
  timeRange?: string
  aggregate?: string
  realtimeSupported: boolean
}

export interface SegmentCondition {
  id: EntityId
  source: SegmentConditionSource
  sourceName: string
  field: string
  label: string
  operator: SegmentConditionOperator
  value?: string | number | boolean | Array<string | number>
  timeRange?: string
  aggregate?: string
  eventProperty?: string
}

export interface SegmentRuleGroup {
  id: EntityId
  name: string
  logic: SegmentLogic
  conditions: SegmentCondition[]
}

export interface SegmentRuleConfig {
  computeMode: SegmentRuleComputeMode
  subjectMode: SegmentSubjectMode
  satisfyLogic: SegmentLogic
  satisfyGroups: SegmentRuleGroup[]
  excludeGroup?: SegmentRuleGroup
}

export interface SegmentOneIdFilter {
  id: EntityId
  profileType: string
  field: string
  operator: SegmentConditionOperator
  value: string
}

export interface SegmentOneIdFilterGroup {
  id: EntityId
  name: string
  logic: SegmentLogic
  filters: SegmentOneIdFilter[]
}

export interface SegmentSamplingConfig {
  enabled: boolean
  keepCount?: number
  systemLimit: number
}

export interface SegmentDependencyConfig {
  mode: 'recommended' | 'custom'
  dependencies: Array<{ id: EntityId; name: string; type: 'id_task' | 'tag_task' | 'dataset_task'; ready: boolean }>
}

export interface SegmentScheduleConfig {
  updateMode: SegmentUpdateMode
  scheduledHours: string[]
  dailyTime?: string
  startDate?: ISODateString
  endDate?: ISODateString
  dependency: SegmentDependencyConfig
}

export interface SegmentUploadConfig {
  inputIdType: string
  outputIdType: string
  matchAllUsers: boolean
  allowOneIdAutoIncrement: boolean
  latestFileName?: string
  latestParseResult?: SegmentUploadParseResult
  changeMode?: SegmentUploadChangeMode
  changeSource?: 'file' | 'segment' | 'api'
}

export interface SegmentUploadParseResult {
  rawRows: number
  validIds: number
  duplicateIds: number
  invalidIds: number
  matchedIds: number
  unmatchedIds: number
  failedReasons: string[]
}

export interface SegmentSubjectRelationConfig {
  sourceSubjectId: EntityId
  targetSubjectId: EntityId
  relationModelId: EntityId
  relationModelName: string
  direction: 'forward' | 'reverse'
  condition: string
}

export interface SegmentMultiSubjectConfig {
  targetSubjectId: EntityId
  participantSubjectIds: EntityId[]
  relations: SegmentSubjectRelationConfig[]
  subjectRules: Record<EntityId, SegmentRuleConfig>
  downloadScope: 'target_only' | 'all_process_segments'
}

export interface SegmentServiceConfig {
  status: SegmentServiceStatus
  serviceKey?: string
  qpsLimit: number
  authType: 'token' | 'ak_sk' | 'none'
  expiresAt?: ISODateString
  lastChangedAt?: ISODateTimeString
}

export interface SegmentApplication {
  type: SegmentApplicationType
  name: string
  enabled: boolean
  prerequisite: string
  targetRoute: string
  description: string
  queryKeys?: string[]
}

export interface SegmentVersion {
  id: EntityId
  segmentId: EntityId
  versionNo: number
  count: number
  status: SegmentRunStatus
  startedAt: ISODateTimeString
  endedAt?: ISODateTimeString
  dataPartitionTime: ISODateString
  fileUri: string
  errorMessage?: string
  isLatest: boolean
}

export interface SegmentRunRecord {
  id: EntityId
  segmentId: EntityId
  taskType: SegmentRunType
  status: SegmentRunStatus
  progress?: number
  startedAt: ISODateTimeString
  endedAt?: ISODateTimeString
  count?: number
  durationMs?: number
  triggerBy: string
  errorMessage?: string
  dependencyView: Array<{ name: string; status: 'ready' | 'waiting' | 'failed'; message: string }>
  logEntries?: SegmentTaskLogEntry[]
}

export interface SegmentTaskLogEntry {
  time: ISODateTimeString
  level: 'info' | 'warning' | 'error'
  message: string
}

export interface SegmentLineageNode {
  id: EntityId
  segmentId: EntityId
  assetId: EntityId
  assetName: string
  assetType: SegmentLineageAssetType
  direction: SegmentLineageDirection
  level: number
  relationType: string
  owner: Owner
  updatedAt: ISODateTimeString
  targetRoute?: string
  truncated?: boolean
}

export interface SegmentTemplate {
  id: EntityId
  name: string
  type: 'system' | 'project' | 'personal'
  description: string
  subjectId: EntityId
  idType: string
  encryptionType: SegmentEncryptionType
  sampling: SegmentSamplingConfig
  rule: SegmentRuleConfig
  creator: Owner
  createdAt: ISODateTimeString
}

export interface SegmentSplitPackageDraft {
  id: EntityId
  name: string
  limitCount?: number
  ratio?: number
}

export interface SegmentSplitPreviewRow {
  name: string
  count: number
  ratio: number
  inheritedGroupNames: string[]
}

export interface SegmentDownloadRequest {
  versionId?: EntityId
  format: SegmentDownloadFormat
  encrypted: boolean
  masked: boolean
  description: string
  scope: 'target_only' | 'all_process_segments'
}

export interface SegmentExportFile {
  fileName: string
  mimeType: string
  content: string
}

export interface SegmentBackendContract {
  id: EntityId
  title: string
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string
  request: string
  response: string
  persistence: string[]
}

export interface SegmentRecord {
  id: EntityId
  name: string
  description: string
  type: SegmentType
  subjectId: EntityId
  subjectName: string
  outputIdType: string
  encryptionType: SegmentEncryptionType
  count: number
  status: SegmentStatus
  updateMode: SegmentUpdateMode
  scheduledEnabled: boolean
  groupIds: EntityId[]
  creator: Owner
  editor: Owner
  createdAt: ISODateTimeString
  updatedAt: ISODateTimeString
  ttlDays: number
  authorizationIds: EntityId[]
  parentId?: EntityId
  childIds: EntityId[]
  rule?: SegmentRuleConfig
  oneIdFilters: SegmentOneIdFilter[]
  oneIdFilterLogic?: SegmentLogic
  oneIdFilterGroups?: SegmentOneIdFilterGroup[]
  sampling: SegmentSamplingConfig
  schedule: SegmentScheduleConfig
  upload?: SegmentUploadConfig
  multiSubject?: SegmentMultiSubjectConfig
  subjectConversion?: SegmentSubjectRelationConfig & { sourceSegmentId: EntityId }
  service: SegmentServiceConfig
  applications: SegmentApplication[]
  permissions: SegmentRuntimePermission
  relatedMetricIds: EntityId[]
  lineageImpactCount: number
  physicalDeleted?: boolean
}

export interface SegmentWorkbenchData {
  permissions: SegmentPermissionSet
  featureFlags: SegmentFeatureFlags
  subjects: SegmentSubject[]
  idTypes: SegmentIdTypeOption[]
  groups: SegmentGroup[]
  segments: SegmentRecord[]
  authorizations: SegmentAuthorization[]
  templates: SegmentTemplate[]
  authorizationPrincipals: SegmentAuthorizationPrincipal[]
  conditionCatalog: SegmentConditionCatalogItem[]
  backendContracts: SegmentBackendContract[]
}

export interface SegmentCreatePayload {
  method: SegmentCreateMethod | 'subject_convert'
  name: string
  description: string
  subjectId: EntityId
  outputIdType: string
  encryptionType: SegmentEncryptionType
  groupIds: EntityId[]
  authorizationIds: EntityId[]
  ttlDays: number
  rule: SegmentRuleConfig
  oneIdFilters: SegmentOneIdFilter[]
  oneIdFilterLogic: SegmentLogic
  oneIdFilterGroups: SegmentOneIdFilterGroup[]
  sampling: SegmentSamplingConfig
  schedule: SegmentScheduleConfig
  upload?: SegmentUploadConfig
  multiSubject?: SegmentMultiSubjectConfig
  subjectConversion?: SegmentSubjectRelationConfig & { sourceSegmentId: EntityId }
}

export interface SegmentProfileMetric {
  label: string
  value: number
  unit: string
  benchmark: number
  deltaRate: number
}

export interface SegmentBehaviorInsight {
  id: EntityId
  title: string
  description: string
  evidenceMetricIds: EntityId[]
  confidence: number
}

export interface UserSegment {
  id: EntityId
  name: string
  description: string
  status: EntityStatus
  owner: Owner
  size: number
  coverageRate: number
  riskLevel: SegmentRiskLevel
  refreshMode: SegmentRefreshMode
  lastCalculatedAt: ISODateTimeString
  conditions: SegmentCondition[]
  profileMetrics: SegmentProfileMetric[]
  behaviorInsights: SegmentBehaviorInsight[]
  recommendedActions: string[]
  relatedMetricIds: EntityId[]
}
