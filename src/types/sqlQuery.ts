export type SqlDataSourceType = 'MYSQL' | 'DORIS' | 'DATA_LAKE_API' | 'HIVE_JDBC'

export type SqlQueryPermissionCode =
  | 'sql_query:view'
  | 'sql_query:create_workbook'
  | 'sql_query:edit_workbook'
  | 'sql_query:delete_workbook'
  | 'sql_query:execute'
  | 'sql_query:download'
  | 'sql_query:create_visual_chart'
  | 'sql_query:create_routine'
  | 'sql_query:view_history'
  | 'sql_query:manage_folder'

export interface SqlQueryFeatureSwitch {
  tenantId: string
  enabled: boolean
  minVersion: string
  allowedProjectIds?: string[]
}

export interface SqlQueryPermissionState {
  canView: boolean
  canCreateWorkbook: boolean
  canEditWorkbook: boolean
  canDeleteWorkbook: boolean
  canExecute: boolean
  canDownload: boolean
  canCreateVisualChart: boolean
  canCreateRoutine: boolean
  canViewHistory: boolean
  canManageFolder: boolean
}

export interface SqlFolder {
  id: string
  projectId: string
  parentId: string | null
  name: string
  sortIndex: number
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
  deletedAt?: string
}

export type SqlVariableType = 'text' | 'dropdown' | 'date' | 'datetime_minute' | 'datetime_second'

export interface SqlVariableConfig {
  name: string
  type: SqlVariableType
  required: boolean
  defaultValue?: string
  options?: string[]
  dateFormat?: string
  createdFromSql: boolean
  updatedAt: string
}

export interface SqlWorkbook {
  id: string
  projectId: string
  folderId: string | null
  name: string
  description?: string
  sqlContent: string
  dataSourceType?: SqlDataSourceType
  connectionId?: string
  databaseName?: string
  resourceId?: string
  variableConfigs: SqlVariableConfig[]
  ownerId: string
  ownerName: string
  status: 'saved' | 'deleted'
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
  lastExecutedAt?: string
}

export interface TemporarySqlQuery {
  id: string
  projectId: string
  title: string
  sqlContent: string
  dataSourceType?: SqlDataSourceType
  connectionId?: string
  databaseName?: string
  resourceId?: string
  variableConfigs: SqlVariableConfig[]
  variableValues: Record<string, string>
  createdAt: string
  updatedAt: string
  localDraftKey: string
}

export type SqlQueryJobStatus =
  | 'created'
  | 'parsing'
  | 'waiting'
  | 'running'
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'timeout'

export interface SqlQueryJob {
  id: string
  projectId: string
  workbookId?: string
  temporaryQueryId?: string
  dataSourceType: SqlDataSourceType
  connectionId: string
  databaseName: string
  resourceId?: string
  rawSql: string
  compiledSql: string
  sqlHash: string
  variableValueSnapshot: Record<string, string>
  status: SqlQueryJobStatus
  resultRowCount?: number
  resultColumnCount?: number
  resultStorageId?: string
  resultExpired?: boolean
  resultSizeBytes?: number
  errorCode?: string
  errorMessage?: string
  startedAt?: string
  finishedAt?: string
  durationMs?: number
  createdBy: string
  createdAt: string
}

export type SqlDisplayType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'array_as_string'
  | 'map_as_string'
  | 'unknown'

export interface SqlResultColumn {
  name: string
  type: string
  displayType: SqlDisplayType
  nullable: boolean
  index: number
}

export interface SqlResultPage {
  columns: SqlResultColumn[]
  rows: Array<Record<string, unknown>>
  page: number
  pageSize: number
  totalRows: number
}

export interface SqlQueryHistory {
  id: string
  projectId: string
  workbookId?: string
  jobId: string
  sqlSnapshot: string
  dataSourceType: SqlDataSourceType
  connectionId: string
  connectionName: string
  databaseName: string
  status: SqlQueryJobStatus
  resultRowCount?: number
  resultExpired?: boolean
  errorMessage?: string
  executedBy: string
  executedAt: string
  durationMs?: number
}

export interface SqlQueryLog {
  id: string
  jobId: string
  level: 'INFO' | 'WARN' | 'ERROR'
  message: string
  timestamp: string
}

export interface SqlResultDownloadTask {
  id: string
  jobId: string
  projectId: string
  encoding: 'UTF-8' | 'GBK'
  fileFormat: 'CSV'
  status: 'created' | 'running' | 'success' | 'failed' | 'expired'
  fileName: string
  fileSizeBytes?: number
  downloadUrl?: string
  errorMessage?: string
  csvText?: string
  createdBy: string
  createdAt: string
  expiredAt: string
}

export interface SqlTemporaryDataset {
  id: string
  projectId: string
  jobId: string
  name: string
  originType: 'SQL_QUERY_RESULT'
  schema: SqlResultColumn[]
  status: 'creating' | 'ready' | 'failed' | 'converted' | 'expired'
  expiredAt: string
  createdBy: string
  createdAt: string
}

export interface SqlTemporaryDatasetCleanupResult {
  expiredCount: number
  deletedDatasetIds: string[]
}

export interface SqlVisualChart {
  id: string
  projectId: string
  temporaryDatasetId: string
  datasetId: string
  chartName: string
  datasetName: string
  description?: string
  sourceSqlJobId: string
  sqlSnapshot: string
  connectionId: string
  databaseName: string
  saved: boolean
  createdAt: string
}

export type SqlRoutineScheduleType = 'daily' | 'weekly' | 'monthly' | 'cron'

export interface SqlRoutineTask {
  id: string
  projectId: string
  chartId: string
  datasetId: string
  sourceSqlJobId: string
  sqlSnapshot: string
  connectionId: string
  databaseName: string
  syncType: 'full_overwrite' | 'partition_overwrite'
  partitionField?: string
  scheduleType: SqlRoutineScheduleType
  scheduleCron?: string
  scheduleStartAt: string
  executeTime: string
  notifyEnabled: boolean
  notifyUserIds: string[]
  enabled: boolean
  maxResultSizeBytes: number
  status: 'enabled' | 'paused' | 'deleted'
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface SqlRoutineRunRecord {
  id: string
  routineId: string
  status: 'waiting' | 'running' | 'success' | 'failed'
  startedAt?: string
  finishedAt?: string
  durationMs?: number
  resultSizeBytes?: number
  resultRowCount?: number
  errorMessage?: string
  logs: string[]
}

export interface SqlMetadataConnection {
  id: string
  name: string
  type: SqlDataSourceType
  permission: 'readable' | 'unavailable'
  resourceRequired?: boolean
}

export interface SqlMetadataTable {
  name: string
  type: 'table' | 'view'
  hasPermission: boolean
  isPartitioned: boolean
  comment?: string
}

export interface SqlTableColumn {
  name: string
  type: string
  nullable: boolean
  comment?: string
}

export interface SqlTablePartition {
  column: string
  type: string
  latestValue: string
}

export interface SqlTableInfo {
  tableName: string
  databaseName: string
  connectionName: string
  tableType: 'table' | 'view'
  comment: string
}

export interface SqlParseResult {
  valid: boolean
  compiledSql?: string
  statementType?: string
  columns?: SqlResultColumn[]
  tables?: Array<{ databaseName: string, tableName: string }>
  errors?: Array<{ line?: number, column?: number, message: string }>
}

export interface SqlEditorTabState {
  tabId: string
  workbookId?: string
  temporaryQueryId?: string
  title: string
  sqlContent: string
  dataSourceType?: SqlDataSourceType
  connectionId?: string
  databaseName?: string
  resourceId?: string
  variableConfigs: SqlVariableConfig[]
  variableValues: Record<string, string>
  dirty: boolean
  saving: boolean
  parsing: boolean
  running: boolean
  cursorLine: number
  cursorColumn: number
  currentJobId?: string
  lastParseResult?: SqlParseResult
}

export interface SqlResultQueryParams {
  page: number
  pageSize: number
  sortColumn?: string
  sortOrder?: 'asc' | 'desc'
  filterColumn?: string
  filterValue?: string
  filterMode?: 'contains' | 'equals'
}
