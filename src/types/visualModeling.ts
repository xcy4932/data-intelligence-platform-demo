export type VisualModelingPermissionCode =
  | 'visual_modeling:view'
  | 'visual_modeling:create'
  | 'visual_modeling:edit'
  | 'visual_modeling:delete'
  | 'visual_modeling:run'
  | 'visual_modeling:manage_permission'
  | 'visual_modeling:resource_export'
  | 'visual_modeling:resource_import'
  | 'visual_modeling:realtime_label_generate'

export interface VisualModelingPermission {
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canRun: boolean
  canManagePermission: boolean
  canExport: boolean
  canImport: boolean
  canUseRealtimeLabelGenerate: boolean
}

export type VisualModelingTaskType = 'offline' | 'realtime'
export type VisualModelingTaskStatus = 'draft' | 'saved' | 'published' | 'running' | 'paused' | 'deleted'
export type VisualModelingRunMode = 'manual' | 'schedule'

export type RunStatus =
  | 'waiting_schedule'
  | 'waiting_dependency'
  | 'running'
  | 'success'
  | 'failed'
  | 'terminated'
  | 'partial_success'

export type OperatorCategory =
  | '数据输入'
  | '数据清洗'
  | '数据拆分'
  | '特征工程'
  | '自然语言处理'
  | '机器学习'
  | '输出'

export type OperatorType =
  | 'connection_table'
  | 'visual_modeling_dataset'
  | 'intelligent_insight_dataset'
  | 'cdp_dataset'
  | 'custom_sql'
  | 'field_setting'
  | 'join'
  | 'union_rows'
  | 'aggregate'
  | 'calculated_column'
  | 'filter_rows'
  | 'unpivot'
  | 'pivot'
  | 'string_index'
  | 'missing_value'
  | 'sort'
  | 'deduplicate'
  | 'split_field'
  | 'data_split'
  | 'binarize'
  | 'pca'
  | 'cartesian_product'
  | 'dct'
  | 'row_normalize'
  | 'column_normalize'
  | 'svd'
  | 'feature_hash'
  | 'one_hot'
  | 'array_process'
  | 'map_process'
  | 'feature_importance'
  | 'feature_select'
  | 'sentence_vector'
  | 'tokenize'
  | 'remove_stop_words'
  | 'predict'
  | 'model_file'
  | 'one_hot_model_apply'
  | 'classification'
  | 'clustering'
  | 'regression'
  | 'binary_evaluation'
  | 'multiclass_evaluation'
  | 'clustering_evaluation'
  | 'regression_evaluation'
  | 'dataset_output'
  | 'external_output'
  | 'kafka_output'
  | 'realtime_label_output'
  | 'split_output'

export type FieldType =
  | 'string'
  | 'int'
  | 'bigint'
  | 'double'
  | 'decimal'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'array<string>'
  | 'array<double>'
  | 'map<string,double>'
  | 'json'

export type FieldRole = 'regular' | 'label' | 'prediction' | 'id' | 'partition' | 'filter'

export interface FieldSchema {
  name: string
  displayName?: string
  type: FieldType
  role?: FieldRole
  nullable: boolean
  comment?: string
  sourceNodeId?: string
  sourceFieldName?: string
}

export interface DatasetSchema {
  fields: FieldSchema[]
  partitions?: FieldSchema[]
  rowCountEstimate?: number
}

export type NodeDataKind = 'table' | 'stream' | 'model' | 'vector' | 'onehot_model'

export interface NodePort {
  id: string
  name: string
  portType: 'input' | 'output'
  dataKind: NodeDataKind
  required: boolean
  maxConnections?: number
}

export interface ValidationError {
  nodeId?: string
  field?: string
  message: string
}

export interface ModelingNode {
  id: string
  type: OperatorType
  category: OperatorCategory
  name: string
  displayName: string
  x: number
  y: number
  width: number
  height: number
  inputPorts: NodePort[]
  outputPorts: NodePort[]
  config: Record<string, unknown>
  schema?: DatasetSchema
  previewStatus: 'empty' | 'ready' | 'loading' | 'error'
  validationStatus: 'valid' | 'invalid' | 'warning' | 'unknown'
  validationErrors: ValidationError[]
}

export interface ModelingEdge {
  id: string
  sourceNodeId: string
  sourcePortId: string
  targetNodeId: string
  targetPortId: string
}

export interface CanvasState {
  scale: number
  offsetX: number
  offsetY: number
}

export interface VisualModelingDAG {
  nodes: ModelingNode[]
  edges: ModelingEdge[]
  canvas: CanvasState
}

export interface ScheduleConfig {
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'cron'
  cron?: string
  time?: string
  dependencyStrategy?: 'all_success' | 'any_success' | 'none'
}

export interface DirtyDataConfig {
  enabled: boolean
  sampleRatePerSecond: number
}

export interface RuntimeConfig {
  resourceQueueId: string
  resourceQueueName: string
  parallelismDefault?: number
  taskManagerMemory?: string
  jobManagerMemory?: string
  taskSlots?: number
  yarnVcores?: number
  dirtyDataConfig?: DirtyDataConfig
}

export interface VisualModelingTask {
  id: string
  projectId: string
  name: string
  description?: string
  taskType: VisualModelingTaskType
  ownerId: string
  ownerName: string
  folderId?: string
  folderName?: string
  status: VisualModelingTaskStatus
  runMode: VisualModelingRunMode
  scheduleConfig?: ScheduleConfig
  dag: VisualModelingDAG
  runtimeConfig: RuntimeConfig
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
  lastRunAt?: string
  lastRunStatus?: RunStatus
  deletedBy?: string
  deletedAt?: string
  expireDeleteAt?: string
  version: number
  autosaveFailed?: boolean
}

export interface OutputRunRecord {
  outputNodeId: string
  outputName: string
  status: RunStatus
  writtenRows?: number
  dirtyRows?: number
  errorMessage?: string
}

export interface TaskRunRecord {
  id: string
  taskId: string
  businessDate: string
  runType: 'manual' | 'schedule' | 'rerun'
  status: RunStatus
  startedAt?: string
  finishedAt?: string
  durationSeconds?: number
  outputRecords: OutputRunRecord[]
  errorMessage?: string
  createdBy: string
  remark?: string
  logLines: string[]
}

export interface PreviewResult {
  fields: FieldSchema[]
  rows: Record<string, string | number | boolean | null>[]
  logs: Array<{ time: string, level: 'INFO' | 'WARN' | 'ERROR', content: string }>
  metrics?: Record<string, number | string>
  confusionMatrix?: Array<{ actual: string, predicted: string, count: number }>
}

export interface OperatorOption {
  label: string
  value: string | number | boolean
}

export type ConfigFieldControl =
  | 'input'
  | 'textarea'
  | 'select'
  | 'multi-select'
  | 'radio'
  | 'switch'
  | 'number'
  | 'date'
  | 'field-list'
  | 'mapping-table'
  | 'condition-builder'
  | 'sql-editor'
  | 'key-value'

export interface OperatorConfigField {
  key: string
  label: string
  control: ConfigFieldControl
  required?: boolean
  placeholder?: string
  options?: OperatorOption[]
  defaultValue?: unknown
  min?: number
  max?: number
  visibleWhen?: {
    field: string
    equals: string | number | boolean
  }
  help?: string
}

export interface OperatorDefinition {
  type: OperatorType
  category: OperatorCategory
  name: string
  aliases: string[]
  description: string
  inputPorts: NodePort[]
  outputPorts: NodePort[]
  allowedTaskTypes: VisualModelingTaskType[]
  unavailableReason?: string
  configFields: OperatorConfigField[]
}

export interface TaskListFilter {
  status?: 'all' | RunStatus | 'other'
  runMode?: 'all' | VisualModelingRunMode
  owner?: 'all' | 'mine'
  keyword?: string
  sort?: 'lastRunAt_desc' | 'lastRunAt_asc' | 'createdAt_desc' | 'createdAt_asc'
}

export interface CreateTaskPayload {
  name: string
  description?: string
  taskType: VisualModelingTaskType
  folderId?: string
  runMode: VisualModelingRunMode
  scheduleConfig?: ScheduleConfig
  resourceQueueId: string
}

export interface RunTaskPayload {
  outputNodeIds: string[]
  businessDateStart: string
  businessDateEnd: string
  runType: 'manual' | 'rerun'
  remark?: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
}

export interface LineageNode {
  id: string
  label: string
  type: 'connection' | 'input_dataset' | 'task' | 'output_dataset' | 'analysis' | 'dashboard' | 'tag' | 'queue'
  level: 'upstream' | 'current' | 'downstream'
}

export interface LineageEdge {
  id: string
  source: string
  target: string
  relation: string
}

export interface ExportResource {
  taskId: string
  taskName: string
  ownerName: string
  folderPath: string
  createdAt: string
  inputDatasets: string[]
  outputDatasets: string[]
  dataConnections: string[]
  resourceQueues: string[]
  canExportOutputDataset: boolean
}

export interface ExportResult {
  fileName: string
  taskCount: number
  resourceCount: number
}

export type ImportMode = 'create_new' | 'overwrite'

export interface ImportParseResult {
  importId: string
  packageName: string
  tasks: Array<{ id: string, name: string, mode: ImportMode, valid: boolean, reason?: string }>
  inputDatasets: Array<{ sourceName: string, targetDatasetId?: string, compatible: boolean, issue?: string }>
  outputDatasets: Array<{ sourceName: string, importAction: 'create' | 'map_existing', targetName: string }>
  dataConnections: Array<{ sourceName: string, targetConnectionId?: string, compatible: boolean }>
  resourceQueues: Array<{ sourceName: string, targetQueueId?: string }>
}

export interface ImportExecuteResult {
  total: number
  success: number
  failed: number
  failures: Array<{ taskName: string, reason: string }>
  steps: Array<{ label: string, status: 'success' | 'failed' | 'running' }>
}
