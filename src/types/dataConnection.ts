export type DataConnectorCategory =
  | 'RELATIONAL_DB'
  | 'DATA_WAREHOUSE'
  | 'OLAP'
  | 'NOSQL'
  | 'FILE'
  | 'OBJECT_STORAGE'
  | 'API'
  | 'STREAMING'
  | 'BEHAVIOR'
  | 'AD_PLATFORM'
  | 'WECHAT'
  | 'PUBLIC_DATA'
  | 'CONTENT'

export type DataConnectionStatus =
  | 'DRAFT'
  | 'SAVED'
  | 'TESTING'
  | 'TEST_SUCCESS'
  | 'TEST_FAILED'
  | 'AUTH_REQUIRED'
  | 'AUTH_EXPIRED'
  | 'INGESTING'
  | 'INGEST_SUCCESS'
  | 'INGEST_FAILED'
  | 'DISABLED'

export type DataConnectionAuthStatus =
  | 'NOT_AUTHORIZED'
  | 'AUTHORIZING'
  | 'AUTH_SUCCESS'
  | 'AUTH_FAILED'
  | 'AUTH_EXPIRED'
  | 'AUTH_REVOKED'

export type DataConnectionTestStatus = 'NOT_TESTED' | 'TESTING' | 'SUCCESS' | 'FAILED'
export type DataConnectionIngestStatus = 'NOT_STARTED' | 'CREATED' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELED'
export type DataConnectionVisibility = 'PROJECT' | 'PRIVATE'

export interface DataConnectionPermission {
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canTest: boolean
  canAuthorize: boolean
  canOneClickIngest: boolean
  canViewSecret: boolean
  role: 'SUPER_ADMIN' | 'PROJECT_ADMIN' | 'PROJECT_EDITOR' | 'DATA_DEVELOPER' | 'ANALYST' | 'READONLY'
}

export interface DataConnectionKeyValue {
  key: string
  value: string
}

export type DataConnectionConfigValue = string | number | boolean | string[] | DataConnectionKeyValue[] | null
export type DataConnectionConfig = Record<string, DataConnectionConfigValue>

export type ConnectorFieldType =
  | 'input'
  | 'password'
  | 'number'
  | 'textarea'
  | 'select'
  | 'switch'
  | 'radio'
  | 'tag'
  | 'keyValue'

export interface ConnectorFieldOption {
  label: string
  value: string | number | boolean
  disabled?: boolean
}

export interface ConnectorFieldSchema {
  key: string
  label: string
  fieldType: ConnectorFieldType
  required?: boolean
  placeholder?: string
  defaultValue?: DataConnectionConfigValue
  options?: ConnectorFieldOption[]
  secret?: boolean
  section: 'BASIC' | 'AUTH' | 'CONNECTION' | 'FILE' | 'ADVANCED' | 'INGEST'
  visibleWhen?: {
    field: string
    equals: string | number | boolean
  }
}

export interface DataConnectorDefinition {
  connectorType: string
  connectorName: string
  connectorCategory: DataConnectorCategory
  categoryName: string
  description: string
  tags: string[]
  supportsTest: boolean
  supportsPreview: boolean
  supportsOneClickIngest: boolean
  requiresAuth: boolean
  authType: 'NONE' | 'PASSWORD' | 'AKSK' | 'TOKEN' | 'OAUTH'
  enabled: boolean
  disabledReason?: string
  recommended?: boolean
  realtime?: boolean
  deployDependency?: string
  allowSaveWithoutTest?: boolean
  fields: ConnectorFieldSchema[]
}

export interface DataConnection {
  id: string
  projectId: string
  connectionName: string
  connectorType: string
  connectorName: string
  connectorCategory: DataConnectorCategory
  categoryName: string
  sourceSystem: string
  description?: string
  owner: string
  tags: string[]
  visibility: DataConnectionVisibility
  status: DataConnectionStatus
  authStatus: DataConnectionAuthStatus
  testStatus: DataConnectionTestStatus
  ingestStatus: DataConnectionIngestStatus
  supportsTest: boolean
  supportsPreview: boolean
  supportsOneClickIngest: boolean
  datasetCount: number
  modelingTaskCount: number
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
  recentTestTime?: string
  recentIngestTime?: string
  config: DataConnectionConfig
  secretKeys: string[]
}

export type DataConnectionColumnType =
  | 'STRING'
  | 'BIGINT'
  | 'DOUBLE'
  | 'DECIMAL'
  | 'DATETIME'
  | 'BOOLEAN'
  | 'JSON'
  | 'ARRAY'
  | 'MAP'
  | 'BINARY'
  | 'GEOGRAPHY'
  | 'UUID'

export type DataConnectionPreviewStructureType = 'STRUCTURED' | 'SEMI_STRUCTURED' | 'UNSTRUCTURED'

export type DataConnectionPreviewRow = Record<string, string | number | boolean | null>

export interface DataConnectionColumnSchema {
  name: string
  displayName: string
  type: DataConnectionColumnType
  nullable: boolean
}

export interface DataConnectionTableSchema {
  schema?: string
  tableName: string
  columns: DataConnectionColumnSchema[]
  rowEstimate?: number
  previewRows?: DataConnectionPreviewRow[]
  structureType?: DataConnectionPreviewStructureType
  rawSample?: string
  warnings?: string[]
}

export interface DataConnectionPreviewResult {
  success: boolean
  message: string
  errorCode?: string
  schemas: string[]
  tables: DataConnectionTableSchema[]
  previewRows: DataConnectionPreviewRow[]
  rowEstimate: number
  rawResponse?: string
}

export interface DataConnectionTestRecord {
  id: string
  connectionId: string
  status: DataConnectionTestStatus
  errorCode?: string
  errorMessage?: string
  testedBy: string
  testedAt: string
  durationMs: number
}

export type DataConnectionIngestionJobStatus =
  | 'CREATED'
  | 'FETCHING'
  | 'WRITING_RAW'
  | 'MODELING_CREATED'
  | 'MODELING_RUNNING'
  | 'DATASET_CREATED'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELED'

export interface DataConnectionIngestionJob {
  id: string
  connectionId: string
  jobStatus: DataConnectionIngestionJobStatus
  sourceType: string
  rawDatasetId?: string
  structuredDatasetId?: string
  modelingTaskId?: string
  errorCode?: string
  errorMessage?: string
  startedBy: string
  startedAt: string
  finishedAt?: string
}

export interface DataConnectionDataset {
  id: string
  connectionId: string
  datasetName: string
  datasetType: 'RAW' | 'STRUCTURED'
  storageEngine: 'Hive' | 'ClickHouse' | 'Kafka' | 'TOS'
  rowCount: number
  status: 'CREATED' | 'READY' | 'FAILED'
  createdAt: string
}

export interface DataConnectionModelingTask {
  id: string
  connectionId: string
  taskName: string
  taskType: 'VISUAL_MODELING' | 'REALTIME_STREAM' | 'FILE_PARSE'
  status: 'CREATED' | 'RUNNING' | 'SUCCESS' | 'FAILED'
  outputDatasetId?: string
  updatedAt: string
}

export interface DataConnectionLineageNode {
  id: string
  label: string
  type: 'CONNECTION' | 'RAW_DATASET' | 'MODEL_TASK' | 'STRUCTURED_DATASET' | 'TAG' | 'SEGMENT' | 'DASHBOARD'
  status: 'NORMAL' | 'WARNING' | 'ERROR'
}

export interface DataConnectionLineageEdge {
  id: string
  source: string
  target: string
  relationName: string
}

export interface DataConnectionAuditLog {
  id: string
  connectionId: string
  action: string
  operator: string
  message: string
  createdAt: string
}

export interface DataConnectionDeleteImpact {
  datasets: number
  modelingTasks: number
  tags: number
  segments: number
  dashboards: number
  canDelete: boolean
  reason: string
}

export interface DataConnectionBatchDeleteImpact {
  connection: DataConnection
  impact: DataConnectionDeleteImpact
}

export interface DataConnectionListFilter {
  keyword?: string
  connectorCategory?: DataConnectorCategory | 'ALL'
  connectorType?: string | 'ALL'
  status?: DataConnectionStatus | 'ALL'
  createdBy?: string | 'ALL'
  supportsOneClickIngest?: 'ALL' | 'YES' | 'NO'
  createdAtStart?: string
  createdAtEnd?: string
  recentTestStart?: string
  recentTestEnd?: string
}

export interface DataConnectionFormPayload {
  connectionName: string
  connectorType: string
  description?: string
  owner: string
  tags: string[]
  visibility: DataConnectionVisibility
  sourceSystem: string
  config: DataConnectionConfig
}
