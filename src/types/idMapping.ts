export type IdmSubjectType = 'USER' | 'VEHICLE' | 'SHOP' | 'ITEM' | 'CUSTOM'
export type IdmSubjectStatus = 'ENABLED' | 'DISABLED'
export type IdmConfigStatus = 'NOT_CONFIGURED' | 'DRAFT' | 'VALIDATED' | 'PUBLISHED' | 'DRAFT_CHANGED' | 'VALIDATE_FAILED' | 'PUBLISH_FAILED'
export type IdmTaskStatus = 'NOT_RUN' | 'WAITING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELED'
export type IdmGraphStatus = 'NOT_CONFIGURED' | 'DRAFT' | 'PUBLISHED' | 'RUNNING' | 'FAILED'
export type IdmIdKind = 'SINGLE' | 'COMPOSITE'
export type IdmIdDataType = 'STRING' | 'NUMBER'
export type IdmChannelIdentifier = 'UID' | 'PHONE' | 'EMAIL' | 'IDFA' | 'OAID' | 'IMEI' | 'OPENID' | 'UNIONID' | 'CUSTOM'
export type IdmDataSourceType = 'DATA_NOT_CONFIGURED' | 'REALTIME_ONLY' | 'OFFLINE_REALTIME'
export type IdmUpdateMode = 'FULL' | 'INCREMENTAL'
export type IdmMappingType = 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_ONE' | 'MANY_TO_MANY'
export type IdmStrategyType = 'LATEST' | 'EARLIEST' | 'MAX' | 'MIN'
export type IdmValidationLevel = 'ERROR' | 'WARNING' | 'INFO'
export type IdmTaskType = 'ONEID_GENERATE' | 'ID_SYNC' | 'RELATION_GENERATE' | 'RELATION_SYNC' | 'CROSS_SUBJECT_GENERATE'
export type IdmTaskCategory = 'SUBJECT_ONEID' | 'CROSS_SUBJECT'
export type IdmExploreEnv = 'OFFLINE' | 'REALTIME' | 'ALL'
export type IdmVisibility = 'PRIVATE' | 'PROJECT' | 'TENANT'
export type IdmOnlineAuthType = 'TOKEN' | 'AKSK'
export type IdmCorrectionScope = 'VISUAL_MODELING' | 'PROFILE_DETAIL' | 'BEHAVIOR_DETAIL'

export interface IdmPermission {
  canView: boolean
  canEdit: boolean
  canRun: boolean
  canDelete: boolean
  canAuthorize: boolean
  role: 'GROUP_ADMIN' | 'PROJECT_ADMIN' | 'IDM_ADMIN' | 'OPS' | 'ANALYST'
}

export interface IdmSubject {
  id: string
  tenantId: string
  projectId?: string
  subjectName: string
  subjectCode: string
  subjectType: IdmSubjectType
  avatarType: string
  description?: string
  status: IdmSubjectStatus
  configStatus: IdmConfigStatus
  graphStatus: IdmGraphStatus
  latestTaskStatus: IdmTaskStatus
  idTypeCount: number
  relationCount: number
  lastPublishedAt?: string
  lastRunAt?: string
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
  downstreamDependencyCount: number
  isolatedLowPriorityCount: number
}

export interface IdmOverview {
  subjectTotal: number
  publishedSubjectCount: number
  draftSubjectCount: number
  todaySuccessTaskCount: number
  todayFailedTaskCount: number
  latestRunAt: string
  alerts: IdmAlert[]
}

export interface IdmAlert {
  id: string
  level: IdmValidationLevel
  title: string
  description: string
  subjectId?: string
  actionText?: string
}

export interface IdmDataset {
  id: string
  name: string
  type: 'HIVE' | 'CLICKHOUSE' | 'MYSQL'
  updateCycle: 'DAY' | 'HOUR' | 'REALTIME'
  fields: Array<{
    name: string
    displayName: string
    dataType: IdmIdDataType | 'DATETIME'
    isPartition?: boolean
  }>
}

export interface IdmDataPreviewRow {
  rowNo: number
  idValue: string
  partitionValue: string
  rawValue: string
  qualityFlag: 'VALID' | 'EMPTY' | 'DUPLICATED'
}

export interface IdmRelationPreviewRow {
  rowNo: number
  sourceValue: string
  targetValue: string
  partitionValue: string
  strategyValue?: string
  duplicateGroupSize: number
  resolvedTargetValue?: string
  qualityFlag: 'VALID' | 'DUPLICATED_SOURCE' | 'EMPTY_FIELD' | 'STRATEGY_EMPTY'
}

export interface IdmIdType {
  id: string
  tenantId: string
  subjectId: string
  idName: string
  idCode: string
  idKind: IdmIdKind
  idDataType: IdmIdDataType
  channelIdentifier: IdmChannelIdentifier
  sourceType: string
  recommendedPriority: number
  description?: string
  dataSourceType: IdmDataSourceType
  datasetId?: string
  datasetName?: string
  partitionField?: string
  partitionFormat?: string
  updateMode?: IdmUpdateMode
  idField?: string
  compositeParts?: IdmCompositePart[]
  dimensionDatasetId?: string
  dimensionValueField?: string
  dimensionNameField?: string
  status: 'DATA_NOT_CONFIGURED' | 'REALTIME_ONLY' | 'DATA_CONFIGURED' | 'JOINED_GRAPH'
  isGraphAvailable: boolean
  priority: number
  forceOneToOne: boolean
  unbindEnabled: boolean
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
}

export interface IdmCompositePart {
  partName: string
  partCode: string
  dataType: IdmIdDataType
  fieldName: string
}

export interface IdmIdTemplate {
  id: string
  selected: boolean
  idName: string
  idCode: string
  idDataType: IdmIdDataType
  channelIdentifier: IdmChannelIdentifier
  sourceType: string
  recommendedPriority: number
}

export interface IdmReferenceRelation {
  id: string
  tenantId: string
  subjectId: string
  relationName: string
  relationDesc?: string
  datasetId: string
  datasetName: string
  partitionField: string
  partitionFormat: string
  updateMode: IdmUpdateMode
  sourceIdTypeId: string
  sourceIdName: string
  sourceField: string
  targetIdTypeId: string
  targetIdName: string
  targetField: string
  mappingType: IdmMappingType
  strategyEnabled: boolean
  strategyField?: string
  strategyType?: IdmStrategyType
  unbindEnabled: boolean
  status: 'DRAFT' | 'PUBLISHED' | 'INVALID'
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
}

export interface IdmGraphNode {
  idTypeId: string
  idName: string
  idCode: string
  priority: number
  isBaseCandidate: boolean
  joined: boolean
  warning?: string
}

export interface IdmGraphEdge {
  id: string
  sourceIdTypeId: string
  targetIdTypeId: string
  relationId: string
  relationName: string
  strategyText: string
}

export interface IdmGraphConfig {
  id: string
  tenantId: string
  subjectId: string
  versionNo: number
  configStatus: IdmConfigStatus
  nodes: IdmGraphNode[]
  edges: IdmGraphEdge[]
  options: {
    reuseHistoryOneId: boolean
    forceOneToOneForHighPriority: boolean
    allowOneIdChange: boolean
    recordChangeLog: boolean
    triggerDataCorrection: boolean
    realtimeOfflineMerge: boolean
    silenceDefaultStrategy: boolean
  }
  publishedAt?: string
  publishedBy?: string
  updatedAt: string
}

export interface IdmConfigVersion {
  id: string
  subjectId: string
  versionNo: number
  versionName: string
  configSnapshot: IdmGraphConfig
  publishStatus: 'PUBLISHED' | 'ROLLBACKED'
  publishedBy: string
  publishedAt: string
  changeSummary: string
}

export interface IdmValidationItem {
  id: string
  level: IdmValidationLevel
  code: string
  message: string
  target?: string
}

export interface IdmTask {
  id: string
  taskName: string
  taskCategory: IdmTaskCategory
  taskType: IdmTaskType
  subjectId?: string
  subjectName?: string
  crossRelationName?: string
  tableName: string
  idTypeCode?: string
  createdAt: string
  lastRunAt?: string
  status: IdmTaskStatus
  durationSeconds?: number
  owner: string
  upstreamTaskIds: string[]
  downstreamTaskIds: string[]
}

export interface IdmTaskRunRecord {
  id: string
  taskId: string
  runDate: string
  triggerType: 'AUTO' | 'MANUAL' | 'RERUN'
  status: IdmTaskStatus
  startTime: string
  endTime?: string
  durationSeconds?: number
  partition: string
  errorMessage?: string
}

export interface IdmTaskDagNode {
  id: string
  label: string
  type: string
  status: IdmTaskStatus
  startedAt?: string
  endedAt?: string
}

export interface IdmTaskDag {
  taskId: string
  nodes: IdmTaskDagNode[]
  edges: Array<{ source: string, target: string }>
}

export interface IdmOneIdMappingResult {
  idTypeCode: string
  idTypeName: string
  idValue: string
  baseId?: string
  env: IdmExploreEnv
  taskName?: string
  updatedAt?: string
  abnormal: boolean
  abnormalReason?: string
  relatedIds: Array<{ idTypeName: string, idValue: string }>
}

export interface IdmOneIdChangeLog {
  id: string
  changedAt: string
  idTypeCode: string
  idValue: string
  oldBaseId: string
  newBaseId: string
  changeReason: 'REFERENCE_CHANGED' | 'PRIORITY_CHANGED' | 'STRATEGY_CHANGED' | 'MANUAL_CORRECTION'
  taskName: string
  versionNo: number
  operator: string
}

export interface IdmLineageNode {
  id: string
  label: string
  type: 'DATASET' | 'ID_TYPE' | 'ONEID_TASK' | 'TAG' | 'SEGMENT' | 'ONLINE_SERVICE' | 'MARKETING'
  status?: IdmTaskStatus
  description?: string
  owner?: string
  updatedAt?: string
  objectCount?: number
}

export interface IdmLineageEdge {
  source: string
  target: string
  edgeType: 'READS' | 'GENERATES' | 'DEPENDS_ON' | 'SERVES' | 'TRIGGERS' | 'EXPORTS'
  relationName: string
  rule?: string
  status?: IdmTaskStatus
  impactLevel: 'HIGH' | 'MEDIUM' | 'LOW'
  updatedAt: string
}

export interface IdmLineageGraph {
  objectType: string
  objectName: string
  nodes: IdmLineageNode[]
  edges: IdmLineageEdge[]
}

export interface IdmCrossSubjectRelation {
  id: string
  relationName: string
  relationDesc?: string
  datasetId?: string
  datasetName: string
  partitionField?: string
  partitionFormat?: string
  updateMode?: IdmUpdateMode
  subjectAName: string
  subjectAIdTypeName: string
  subjectAField?: string
  subjectBName: string
  subjectBIdTypeName: string
  subjectBField?: string
  aToBMode: 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'DENY'
  bToAMode: 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'DENY'
  strategyField?: string
  strategyType?: IdmStrategyType
  status: 'DRAFT' | 'PUBLISHED' | 'OFFLINE'
  owner?: string
  relationCount?: number
  qualityScore?: number
  downstreamObjects?: string[]
  updatedAt: string
}

export interface IdmCrossSubjectPreviewRow {
  id: string
  subjectAId: string
  subjectAName: string
  subjectBId: string
  subjectBName: string
  relationScore: number
  strategyValue: string
  lastEventTime: string
  status: 'VALID' | 'DUPLICATE' | 'MISSING_FIELD'
}

export interface IdmOnlineService {
  id: string
  serviceName: string
  serviceObject: 'SUBJECT' | 'CROSS_RELATION'
  subjectName?: string
  idTypeNames: string[]
  returnFields: string[]
  qpsLimit: number
  enabled: boolean
  authType: IdmOnlineAuthType
  remark?: string
}

export interface IdmCorrectionSetting {
  enabled: boolean
  correctionScope: IdmCorrectionScope[]
  scheduleType: 'DAILY'
  maxBackfillDays: number
}

export interface IdmVisibilityRule {
  id: string
  targetType: 'USER' | 'USER_GROUP' | 'ROLE'
  targetName: string
  disabledSubjects: string[]
  disabledIdTypes: string[]
  updatedAt: string
}

export interface IdmAuditLog {
  id: string
  operator: string
  action: string
  objectName: string
  before?: string
  after?: string
  createdAt: string
}
