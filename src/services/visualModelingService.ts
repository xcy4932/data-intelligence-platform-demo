import {
  createMockNode,
  getOperator,
  mockExportResources,
  mockImportParseResult,
  mockPreviewResults,
  mockVisualModelingRuns,
  mockVisualModelingTasks,
  sampleSchemas,
  visualModelingConnections,
  visualModelingDatasets,
  visualModelingFolders,
  visualModelingOperators,
  visualModelingPermission,
  visualModelingQueues,
} from '@/mock/visualModeling'
import type {
  CreateTaskPayload,
  DatasetSchema,
  ExportResource,
  ExportResult,
  FieldSchema,
  ImportExecuteResult,
  ImportParseResult,
  LineageEdge,
  LineageNode,
  ModelingEdge,
  ModelingNode,
  OperatorDefinition,
  OperatorType,
  PreviewResult,
  RunStatus,
  RunTaskPayload,
  TaskListFilter,
  TaskRunRecord,
  ValidationError,
  ValidationResult,
  VisualModelingPermission,
  VisualModelingTask,
  VisualModelingTaskType,
} from '@/types/visualModeling'

const delay = async (ms = 160): Promise<void> => {
  await new Promise((resolve) => window.setTimeout(resolve, ms))
}

const clone = <T>(value: T): T => {
  try {
    return structuredClone(value)
  } catch {
    return JSON.parse(JSON.stringify(value)) as T
  }
}

const taskStorageKey = 'visual_modeling_tasks_v2'
const runStorageKey = 'visual_modeling_runs_v2'

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') {
    return clone(fallback)
  }
  const stored = window.localStorage.getItem(key)
  if (!stored) {
    return clone(fallback)
  }
  try {
    return JSON.parse(stored) as T
  } catch {
    return clone(fallback)
  }
}

function persistState(): void {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(taskStorageKey, JSON.stringify(tasks))
  window.localStorage.setItem(runStorageKey, JSON.stringify(runs))
}

let tasks = readStorage(taskStorageKey, mockVisualModelingTasks)
let runs = readStorage(runStorageKey, mockVisualModelingRuns)

const nowText = (): string => '2026-05-24 10:30:00'
const today = (): string => '2026-05-24'

function normalize(value: unknown): string {
  return String(value ?? '').trim().toLowerCase()
}

function taskStatus(task: VisualModelingTask): RunStatus | 'other' {
  if (!task.lastRunStatus) {
    return 'other'
  }
  if (task.lastRunStatus === 'waiting_dependency' || task.lastRunStatus === 'waiting_schedule') {
    return 'running'
  }
  return task.lastRunStatus
}

function isRunningStatus(status?: RunStatus): boolean {
  return status === 'running' || status === 'waiting_dependency' || status === 'waiting_schedule'
}

function outputNodes(task: VisualModelingTask): ModelingNode[] {
  return task.dag.nodes.filter((node) => node.category === '输出')
}

function inputNodes(task: VisualModelingTask): ModelingNode[] {
  return task.dag.nodes.filter((node) => node.category === '数据输入')
}

function connectedNodeIds(task: VisualModelingTask): Set<string> {
  const ids = new Set<string>()
  task.dag.edges.forEach((edge) => {
    ids.add(edge.sourceNodeId)
    ids.add(edge.targetNodeId)
  })
  return ids
}

function isNonEmptyConfigValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false
  }
  if (typeof value === 'string') {
    return value.trim().length > 0
  }
  if (Array.isArray(value)) {
    return value.length > 0
  }
  return true
}

function getNode(task: VisualModelingTask, nodeId: string): ModelingNode | undefined {
  return task.dag.nodes.find((node) => node.id === nodeId)
}

function getIncomingNodes(task: VisualModelingTask, nodeId: string): ModelingNode[] {
  return task.dag.edges
    .filter((edge) => edge.targetNodeId === nodeId)
    .map((edge) => getNode(task, edge.sourceNodeId))
    .filter((node): node is ModelingNode => Boolean(node))
}

function getUpstreamSchema(task: VisualModelingTask, nodeId: string): DatasetSchema | undefined {
  const incoming = getIncomingNodes(task, nodeId)
  return incoming.find((node) => node.schema)?.schema
}

function makeField(name: string, type: FieldSchema['type'] = 'string', sourceNodeId?: string): FieldSchema {
  return {
    name,
    displayName: name,
    type,
    nullable: true,
    role: 'regular',
    sourceNodeId,
    sourceFieldName: name,
  }
}

function outputFieldName(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }
  return fallback
}

function inferSchemaFromNode(task: VisualModelingTask, node: ModelingNode): DatasetSchema | undefined {
  if (node.category === '数据输入') {
    if (node.schema?.fields.length) {
      return node.schema
    }
    if (task.taskType === 'realtime') {
      return sampleSchemas.stream!
    }
    if (node.type === 'connection_table' && String(node.config.connectionId ?? '').includes('kafka')) {
      return sampleSchemas.stream!
    }
    if (node.type === 'custom_sql') {
      return sampleSchemas.payment!
    }
    return sampleSchemas.event!
  }
  const upstream = getUpstreamSchema(task, node.id) ?? node.schema
  if (!upstream) {
    return sampleSchemas.event!
  }
  if (node.type === 'field_setting') {
    const rows = Array.isArray(node.config.fieldConfig) ? node.config.fieldConfig : []
    if (!rows.length) {
      return upstream
    }
    const fields = rows
      .filter((row) => typeof row === 'object' && row !== null && row.keep !== false)
      .map((row) => {
        const sourceName = String(row.source ?? row.name ?? '')
        const sourceField = upstream.fields.find((field) => field.name === sourceName)
        return {
          ...(sourceField ?? makeField(sourceName, 'string', node.id)),
          name: outputFieldName(row.target, sourceName),
          displayName: outputFieldName(row.target, sourceName),
          type: (row.type as FieldSchema['type']) ?? sourceField?.type ?? 'string',
          sourceNodeId: node.id,
          sourceFieldName: sourceName,
        }
      })
    return { ...upstream, fields }
  }
  if (node.type === 'calculated_column') {
    const rows = Array.isArray(node.config.calculatedFields) ? node.config.calculatedFields : []
    const calculated = rows
      .filter((row) => typeof row === 'object' && row !== null)
      .map((row, index) =>
        makeField(
          outputFieldName(row.target ?? row.name ?? row.outputField, `calc_${index + 1}`),
          (row.type as FieldSchema['type']) ?? 'double',
          node.id,
        ),
      )
    const overwrite = Boolean(node.config.overwriteExisting)
    const baseFields = overwrite
      ? upstream.fields.filter((field) => !calculated.some((item) => item.name === field.name))
      : upstream.fields
    return { ...upstream, fields: [...baseFields, ...calculated] }
  }
  if (node.type === 'split_field') {
    const rows = Array.isArray(node.config.splitFields) ? node.config.splitFields : []
    const keepSource = node.config.keepSourceField !== false
    const sourceField = String(node.config.sourceField ?? '')
    const baseFields = keepSource ? upstream.fields : upstream.fields.filter((field) => field.name !== sourceField)
    const splitFields = rows
      .filter((row) => typeof row === 'object' && row !== null)
      .map((row, index) =>
        makeField(
          outputFieldName(row.target ?? row.outputField, `split_${index + 1}`),
          (row.type as FieldSchema['type']) ?? 'string',
          node.id,
        ),
      )
    return { ...upstream, fields: [...baseFields, ...splitFields] }
  }
  if (node.type === 'tokenize') {
    return { ...upstream, fields: [...upstream.fields, makeField(String(node.config.outputColumn ?? 'tokens'), 'array<string>', node.id)] }
  }
  if (node.type === 'remove_stop_words') {
    return {
      ...upstream,
      fields: [...upstream.fields, makeField(String(node.config.outputColumn ?? 'clean_tokens'), 'array<string>', node.id)],
    }
  }
  if (node.type === 'classification' || node.type === 'regression' || node.type === 'predict' || node.type.includes('evaluation')) {
    const baseFields = upstream.fields.filter((field) => field.name !== 'prediction' && field.name !== 'prediction_probability')
    const predictionFields = sampleSchemas.modelOutput!.fields.filter((field) => !baseFields.some((item) => item.name === field.name))
    return {
      ...upstream,
      fields: [...baseFields, ...predictionFields],
    }
  }
  return upstream
}

function adaptPortForTask(task: VisualModelingTask, node: ModelingNode, port: ModelingNode['inputPorts'][number]): ModelingNode['inputPorts'][number] {
  const definition = getOperator(node.type)
  if (task.taskType !== 'realtime' || port.dataKind !== 'table' || !definition.allowedTaskTypes.includes('realtime')) {
    return { ...port }
  }
  return {
    ...port,
    dataKind: 'stream',
    name: port.portType === 'input' ? '实时流' : '输出流',
  }
}

function adaptNodePortsForTask(task: VisualModelingTask, node: ModelingNode): void {
  const definition = getOperator(node.type)
  node.inputPorts = definition.inputPorts.map((port) => adaptPortForTask(task, node, port))
  node.outputPorts = definition.outputPorts.map((port) => adaptPortForTask(task, node, port))
}

function adaptTaskPorts(task: VisualModelingTask): void {
  task.dag.nodes.forEach((node) => adaptNodePortsForTask(task, node))
}

function updateDerivedSchemas(task: VisualModelingTask): void {
  adaptTaskPorts(task)
  task.dag.nodes.forEach((node) => {
    node.schema = inferSchemaFromNode(task, node)
    if (node.schema) {
      node.previewStatus = 'ready'
    }
  })
}

function edgeDataKind(task: VisualModelingTask, edge: ModelingEdge): { source?: string, target?: string } {
  const source = getNode(task, edge.sourceNodeId)
  const target = getNode(task, edge.targetNodeId)
  const sourcePort = source?.outputPorts.find((port) => port.id === edge.sourcePortId)
  const targetPort = target?.inputPorts.find((port) => port.id === edge.targetPortId)
  return { source: sourcePort?.dataKind, target: targetPort?.dataKind }
}

function createsCycle(task: VisualModelingTask, newEdge?: ModelingEdge): boolean {
  const adjacency = new Map<string, string[]>()
  task.dag.nodes.forEach((node) => adjacency.set(node.id, []))
  const edges = newEdge ? [...task.dag.edges, newEdge] : task.dag.edges
  edges.forEach((edge) => {
    const list = adjacency.get(edge.sourceNodeId)
    if (list) {
      list.push(edge.targetNodeId)
    }
  })

  const visiting = new Set<string>()
  const visited = new Set<string>()

  function visit(nodeId: string): boolean {
    if (visiting.has(nodeId)) {
      return true
    }
    if (visited.has(nodeId)) {
      return false
    }
    visiting.add(nodeId)
    const next = adjacency.get(nodeId) ?? []
    for (const target of next) {
      if (visit(target)) {
        return true
      }
    }
    visiting.delete(nodeId)
    visited.add(nodeId)
    return false
  }

  return task.dag.nodes.some((node) => visit(node.id))
}

function validateName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) {
    return '任务名称不能为空'
  }
  if (trimmed.length > 64) {
    return '任务名称最多 64 个字符'
  }
  if (/[\\/:*?"<>|]/.test(trimmed)) {
    return '任务名称不能包含 / \\ : * ? " < > |'
  }
  return ''
}

function validateSql(sql: string): string {
  const trimmed = sql.trim()
  if (!trimmed) {
    return 'SQL 不能为空'
  }
  if (!/^select\b/i.test(trimmed)) {
    return '只允许查询语句，SQL 必须以 SELECT 开头'
  }
  if (/\b(create|drop|alter|insert|update|delete|truncate)\b/i.test(trimmed)) {
    return 'SQL 只允许查询，不允许 DDL / DML'
  }
  return ''
}

function fieldNames(schema?: DatasetSchema): Set<string> {
  return new Set([...(schema?.fields ?? []), ...(schema?.partitions ?? [])].map((field) => field.name))
}

const referenceKeys = new Set([
  'source',
  'field',
  'sourceField',
  'inputField',
  'inputFields',
  'inputColumn',
  'inputColumns',
  'featureColumns',
  'labelColumn',
  'targetColumn',
  'predictionColumn',
  'probabilityColumn',
  'clusterField',
  'arrayField',
  'mapField',
  'pivotField',
  'valueField',
  'groupFields',
  'reservedFields',
  'dedupFields',
  'sortFields',
  'selectedFields',
])

function collectFieldReferences(key: string, value: unknown): string[] {
  const refs: string[] = []
  if (value === null || value === undefined) {
    return refs
  }
  if (typeof value === 'string') {
    if (referenceKeys.has(key) || /(field|column|columns|fields)$/i.test(key)) {
      refs.push(value)
    }
    return refs
  }
  if (Array.isArray(value)) {
    value.forEach((item) => {
      refs.push(...collectFieldReferences(key, item))
    })
    return refs
  }
  if (typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([childKey, childValue]) => {
      if (key === 'splitFields' && childKey === 'source') {
        return
      }
      if (referenceKeys.has(childKey)) {
        refs.push(...collectFieldReferences(childKey, childValue))
      }
    })
  }
  return refs
}

function validateFieldReference(
  task: VisualModelingTask,
  node: ModelingNode,
  key: string,
  value: unknown,
  warnings: ValidationError[],
  errors: ValidationError[],
): void {
  const outputFieldKeys = new Set(['outputField', 'outputFields', 'outputColumn', 'outputColumns', 'predictionField'])
  if (outputFieldKeys.has(key) || (key === 'clusterField' && node.type === 'clustering')) {
    return
  }
  const candidates = collectFieldReferences(key, value)
  const names = fieldNames(getUpstreamSchema(task, node.id) ?? node.schema)
  candidates.forEach((candidate) => {
    if (!candidate.trim()) {
      return
    }
    if (names.size > 0 && !names.has(candidate)) {
      errors.push({ nodeId: node.id, field: key, message: `字段「${candidate}」已不存在，请重新选择` })
    }
  })
  if (key === 'aggregateFields' && Array.isArray(value) && value.length > 0) {
    const missingAlias = value.some((item) => typeof item === 'object' && item !== null && !('alias' in item))
    if (missingAlias) {
      warnings.push({ nodeId: node.id, field: key, message: '当前聚合字段未设置别名，将使用系统默认字段名' })
    }
  }
}

function fieldsByName(schema?: DatasetSchema): Map<string, FieldSchema> {
  return new Map((schema?.fields ?? []).map((field) => [field.name, field]))
}

function isNumericField(field?: FieldSchema): boolean {
  return Boolean(field && ['int', 'bigint', 'double', 'decimal'].includes(field.type))
}

function hasMeaningfulObjectValue(value: Record<string, unknown>): boolean {
  return Object.values(value).some((item) => isNonEmptyConfigValue(item))
}

function validateFieldNameList(node: ModelingNode, errors: ValidationError[]): void {
  const fields = node.schema?.fields ?? []
  const seen = new Map<string, number>()
  fields.forEach((field) => {
    const name = field.name.trim()
    if (!name) {
      errors.push({ nodeId: node.id, message: '输出字段名不能为空' })
      return
    }
    if (/[\\/:*?"<>|]/.test(name)) {
      errors.push({ nodeId: node.id, field: 'fieldConfig', message: `输出字段「${name}」包含非法字符` })
    }
    seen.set(name, (seen.get(name) ?? 0) + 1)
  })
  seen.forEach((count, name) => {
    if (count > 1) {
      errors.push({ nodeId: node.id, field: 'fieldConfig', message: `输出字段「${name}」重复` })
    }
  })
}

function validateConditionRows(
  node: ModelingNode,
  fieldKey: string,
  fieldLabel: string,
  conditions: Array<Record<string, unknown>>,
  errors: ValidationError[],
  prefix = '',
): void {
  conditions.forEach((condition, index) => {
    const label = prefix ? `${prefix}.${index + 1}` : `${index + 1}`
    if (Array.isArray(condition.conditions)) {
      if (condition.conditions.length === 0) {
        errors.push({ nodeId: node.id, field: fieldKey, message: `${fieldLabel}第 ${label} 个二级条件组不能为空` })
      } else {
        validateConditionRows(node, fieldKey, fieldLabel, condition.conditions as Array<Record<string, unknown>>, errors, label)
      }
      return
    }
    const operator = String(condition.operator ?? '')
    const needsValue = !['is_null', 'is_not_null'].includes(operator)
    if (!String(condition.field ?? '').trim() || !operator.trim() || (needsValue && !isNonEmptyConfigValue(condition.value))) {
      errors.push({ nodeId: node.id, field: fieldKey, message: `${fieldLabel}第 ${label} 条条件不完整` })
    }
  })
}

function validateRequiredConfigField(node: ModelingNode, field: OperatorDefinition['configFields'][number], errors: ValidationError[]): void {
  const value = node.config[field.key]
  if (field.control === 'field-list') {
    if (field.required && (Array.isArray(value) ? value.length === 0 : !node.schema?.fields.length)) {
      errors.push({ nodeId: node.id, field: field.key, message: `${field.label}不能为空` })
    }
    return
  }
  if (field.control === 'mapping-table') {
    const rows = Array.isArray(value) ? value : []
    const validRows = rows.filter((row) => typeof row === 'object' && row !== null && hasMeaningfulObjectValue(row as Record<string, unknown>))
    if (field.required && validRows.length === 0) {
      errors.push({ nodeId: node.id, field: field.key, message: `${field.label}不能为空` })
    }
    return
  }
  if (field.control === 'condition-builder') {
    const conditions =
      typeof value === 'object' && value !== null && Array.isArray((value as { conditions?: unknown }).conditions)
        ? (value as { conditions: Array<Record<string, unknown>> }).conditions
        : []
    if (field.required && conditions.length === 0) {
      errors.push({ nodeId: node.id, field: field.key, message: `${field.label}不能为空` })
      return
    }
    validateConditionRows(node, field.key, field.label, conditions, errors)
    return
  }
  if (field.required && !isNonEmptyConfigValue(value)) {
    errors.push({ nodeId: node.id, field: field.key, message: `${field.label}不能为空` })
  }
}

function validateModelFieldTypes(task: VisualModelingTask, node: ModelingNode, errors: ValidationError[]): void {
  const upstreamFields = fieldsByName(getUpstreamSchema(task, node.id) ?? node.schema)
  const featureColumns = Array.isArray(node.config.featureColumns) ? node.config.featureColumns.map(String) : []
  if (['classification', 'regression', 'clustering', 'pca', 'svd', 'row_normalize', 'column_normalize'].includes(node.type)) {
    featureColumns.forEach((name) => {
      if (upstreamFields.has(name) && !isNumericField(upstreamFields.get(name))) {
        errors.push({ nodeId: node.id, field: 'featureColumns', message: `特征列「${name}」必须为数值型或已编码字段` })
      }
    })
  }
  const labelColumn = String(node.config.labelColumn ?? '')
  const targetColumn = String(node.config.targetColumn ?? '')
  if (labelColumn && featureColumns.includes(labelColumn)) {
    errors.push({ nodeId: node.id, field: 'labelColumn', message: '标签列不能同时作为特征列' })
  }
  if (targetColumn) {
    if (featureColumns.includes(targetColumn)) {
      errors.push({ nodeId: node.id, field: 'targetColumn', message: '目标列不能同时作为特征列' })
    }
    if (node.type === 'regression' && upstreamFields.has(targetColumn) && !isNumericField(upstreamFields.get(targetColumn))) {
      errors.push({ nodeId: node.id, field: 'targetColumn', message: '回归目标列必须为数值型' })
    }
  }
}

function validateNode(task: VisualModelingTask, node: ModelingNode): { errors: ValidationError[], warnings: ValidationError[] } {
  const definition = getOperator(node.type)
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  if (!definition.allowedTaskTypes.includes(task.taskType)) {
    errors.push({
      nodeId: node.id,
      message: task.taskType === 'realtime' ? '实时任务不能使用离线算子' : '离线任务不能使用实时算子',
    })
  }
  if (node.type === 'realtime_label_output' && !visualModelingPermission.canUseRealtimeLabelGenerate) {
    errors.push({ nodeId: node.id, message: '当前用户无实时标签输出权限' })
  }
  if (task.taskType === 'realtime' && node.type === 'connection_table') {
    const connection = visualModelingConnections.find((item) => item.id === node.config.connectionId)
    if (connection && !connection.realtime) {
      errors.push({ nodeId: node.id, field: 'connectionId', message: '实时任务只能选择实时数据连接' })
    }
  }
  if (node.type === 'custom_sql') {
    const sqlMessage = validateSql(String(node.config.sql ?? ''))
    if (sqlMessage) {
      errors.push({ nodeId: node.id, field: 'sql', message: sqlMessage })
    }
  }
  definition.configFields.forEach((field) => {
    const hidden =
      field.visibleWhen &&
      node.config[field.visibleWhen.field] !== field.visibleWhen.equals
    if (!hidden) {
      validateRequiredConfigField(node, field, errors)
    }
    validateFieldReference(task, node, field.key, node.config[field.key], warnings, errors)
  })
  if (node.type === 'dataset_output') {
    const datasetName = String(node.config.datasetName ?? '').trim()
    if (datasetName && datasetName.length > 64) {
      errors.push({ nodeId: node.id, field: 'datasetName', message: '数据集名称最多 64 个字符' })
    }
    if (/[\\/:*?"<>|]/.test(datasetName)) {
      errors.push({ nodeId: node.id, field: 'datasetName', message: '数据集名称不能包含特殊字符' })
    }
  }
  if (node.type === 'data_split' && Array.isArray(node.config.splitOutputs)) {
    const ratioSum = node.config.splitOutputs.reduce((sum, item) => {
      if (typeof item === 'object' && item !== null && 'ratio' in item) {
        return sum + Number(item.ratio)
      }
      return sum
    }, 0)
    if (node.config.splitType === 'ratio' && ratioSum !== 100) {
      errors.push({ nodeId: node.id, field: 'splitOutputs', message: '按比例拆分时所有比例总和必须等于 100' })
    }
  }
  validateModelFieldTypes(task, node, errors)
  validateFieldNameList(node, errors)

  return { errors, warnings }
}

function validateDag(task: VisualModelingTask): ValidationResult {
  updateDerivedSchemas(task)
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  if (inputNodes(task).length === 0) {
    errors.push({ message: '至少需要一个输入节点' })
  }
  if (outputNodes(task).length === 0) {
    errors.push({ message: '至少需要一个输出节点' })
  }
  const connected = connectedNodeIds(task)
  task.dag.nodes.forEach((node) => {
    if (task.dag.nodes.length > 1 && !connected.has(node.id)) {
      errors.push({ nodeId: node.id, message: '存在孤立节点，请连接到流程中' })
    }
    node.inputPorts.filter((port) => port.required).forEach((port) => {
      const incomingCount = task.dag.edges.filter((edge) => edge.targetNodeId === node.id && edge.targetPortId === port.id).length
      if (incomingCount === 0) {
        errors.push({ nodeId: node.id, message: `${node.displayName} 缺少「${port.name}」输入` })
      }
    })
  })
  if (createsCycle(task)) {
    errors.push({ message: 'DAG 中存在环路，请删除形成环的连线' })
  }
  const queue = visualModelingQueues.find((item) => item.id === task.runtimeConfig.resourceQueueId)
  if (!queue?.available) {
    errors.push({ message: '资源队列不可用，请切换队列' })
  }
  const outputNames = new Map<string, string>()
  outputNodes(task).forEach((node) => {
    const name = String(node.config.datasetName ?? node.config.topic ?? node.config.tagName ?? node.displayName)
    const existing = outputNames.get(name)
    if (existing) {
      errors.push({ nodeId: node.id, message: `输出节点名称「${name}」重复` })
      errors.push({ nodeId: existing, message: `输出节点名称「${name}」重复` })
    }
    outputNames.set(name, node.id)
  })
  task.dag.edges.forEach((edge) => {
    const source = getNode(task, edge.sourceNodeId)
    const target = getNode(task, edge.targetNodeId)
    if (!source || !target) {
      errors.push({ message: '连线引用了不存在的节点' })
      return
    }
    if (source.id === target.id) {
      errors.push({ nodeId: source.id, message: '不能连接自己' })
    }
    if (source.category === '输出') {
      errors.push({ nodeId: source.id, message: '输出算子不能有下游节点' })
    }
    const kinds = edgeDataKind(task, edge)
    if (kinds.source && kinds.target && kinds.source !== kinds.target) {
      errors.push({
        nodeId: target.id,
        message: `无法连接：上游输出为 ${kinds.source}，当前输入需要 ${kinds.target}`,
      })
    }
  })
  task.dag.nodes.forEach((node) => {
    const result = validateNode(task, node)
    errors.push(...result.errors)
    warnings.push(...result.warnings)
    node.validationErrors = result.errors
    node.validationStatus = result.errors.length > 0 ? 'invalid' : result.warnings.length > 0 ? 'warning' : 'valid'
  })

  return { valid: errors.length === 0, errors, warnings }
}

function sortTasks(items: VisualModelingTask[], sort: TaskListFilter['sort'] = 'lastRunAt_desc'): VisualModelingTask[] {
  const [fieldName, direction] = sort.split('_') as ['lastRunAt' | 'createdAt', 'asc' | 'desc']
  return [...items].sort((left, right) => {
    const leftValue = left[fieldName]
    const rightValue = right[fieldName]
    if (!leftValue && !rightValue) {
      return 0
    }
    if (!leftValue) {
      return 1
    }
    if (!rightValue) {
      return -1
    }
    return direction === 'asc' ? leftValue.localeCompare(rightValue) : rightValue.localeCompare(leftValue)
  })
}

function createEdge(sourceNode: ModelingNode, targetNode: ModelingNode, task?: VisualModelingTask): ModelingEdge | null {
  const targetPorts = [...targetNode.inputPorts].sort((left, right) => Number(right.required) - Number(left.required))
  for (const targetPort of targetPorts) {
    const usedConnections =
      task?.dag.edges.filter((edge) => edge.targetNodeId === targetNode.id && edge.targetPortId === targetPort.id).length ?? 0
    if (targetPort.maxConnections && usedConnections >= targetPort.maxConnections) {
      continue
    }
    const sourcePort = sourceNode.outputPorts.find((port) => port.dataKind === targetPort.dataKind)
    if (!sourcePort) {
      continue
    }
    return {
      id: `edge_${sourceNode.id}_${targetNode.id}_${sourcePort.id}_${targetPort.id}_${Date.now()}`,
      sourceNodeId: sourceNode.id,
      sourcePortId: sourcePort.id,
      targetNodeId: targetNode.id,
      targetPortId: targetPort.id,
    }
  }
  const sourcePort = sourceNode.outputPorts[0]
  const targetPort = targetNode.inputPorts[0]
  if (!sourcePort || !targetPort) {
    return null
  }
  return {
    id: `edge_${sourceNode.id}_${targetNode.id}_${sourcePort.id}_${targetPort.id}_${Date.now()}`,
    sourceNodeId: sourceNode.id,
    sourcePortId: sourcePort.id,
    targetNodeId: targetNode.id,
    targetPortId: targetPort.id,
  }
}

function makeLineage(task: VisualModelingTask): { nodes: LineageNode[], edges: LineageEdge[] } {
  const upstream: LineageNode[] = inputNodes(task).map((node) => ({
    id: `up_${node.id}`,
    label: node.displayName,
    type: String(node.config.connectionId ?? '').includes('conn') ? 'connection' : 'input_dataset',
    level: 'upstream',
  }))
  const current: LineageNode = {
    id: task.id,
    label: task.name,
    type: 'task',
    level: 'current',
  }
  const downstream: LineageNode[] = outputNodes(task).map((node) => ({
    id: `down_${node.id}`,
    label: String(node.config.datasetName ?? node.config.topic ?? node.config.tagName ?? node.displayName),
    type:
      node.type === 'realtime_label_output'
        ? 'tag'
        : node.type === 'kafka_output' || node.type === 'external_output'
          ? 'output_dataset'
          : 'output_dataset',
    level: 'downstream',
  }))
  downstream.push(
    {
      id: `dashboard_${task.id}`,
      label: `${task.name} 运营看板`,
      type: 'dashboard',
      level: 'downstream',
    },
    {
      id: `analysis_${task.id}`,
      label: `${task.name} 保存分析`,
      type: 'analysis',
      level: 'downstream',
    },
  )

  const nodes = [...upstream, current, ...downstream]
  const edges: LineageEdge[] = [
    ...upstream.map((node) => ({
      id: `edge_${node.id}_${task.id}`,
      source: node.id,
      target: task.id,
      relation: '建模输入',
    })),
    ...downstream.map((node) => ({
      id: `edge_${task.id}_${node.id}`,
      source: task.id,
      target: node.id,
      relation: node.type === 'dashboard' || node.type === 'analysis' ? '下游引用' : '任务输出',
    })),
  ]
  return { nodes, edges }
}

function previewForNode(task: VisualModelingTask, node: ModelingNode): PreviewResult {
  if (node.type.includes('evaluation')) {
    return clone(mockPreviewResults.eval!)
  }
  if (task.taskType === 'realtime' || node.schema?.fields.some((field) => field.name === 'offset')) {
    return clone(mockPreviewResults.stream!)
  }
  const preview = clone(mockPreviewResults.default!)
  const schema = inferSchemaFromNode(task, node)
  if (schema?.fields.length) {
    preview.fields = clone(schema.fields)
  }
  return preview
}

function touchTask(task: VisualModelingTask): void {
  task.updatedAt = nowText()
  task.updatedBy = 'Chaoyang Xu'
  task.version += 1
}

function uniqueCopyName(sourceName: string, folderId?: string): string {
  const base = `${sourceName} 副本`.slice(0, 60)
  let candidate = base
  let index = 2
  while (
    tasks.some(
      (task) =>
        task.status !== 'deleted' &&
        task.folderId === folderId &&
        normalize(task.name) === normalize(candidate),
    )
  ) {
    candidate = `${base} ${index}`.slice(0, 64)
    index += 1
  }
  return candidate
}

function buildNewTask(payload: CreateTaskPayload): VisualModelingTask {
  const queue = visualModelingQueues.find((item) => item.id === payload.resourceQueueId) ?? visualModelingQueues[0]
  const folder = visualModelingFolders.find((item) => item.id === payload.folderId) ?? visualModelingFolders[0]
  return {
    id: `task_${Date.now()}`,
    projectId: 'project_demo',
    name: payload.name.trim(),
    description: payload.description?.trim(),
    taskType: payload.taskType,
    ownerId: 'current_user',
    ownerName: 'Chaoyang Xu',
    folderId: folder?.id ?? 'folder_default',
    folderName: folder?.name ?? '默认目录',
    status: 'draft',
    runMode: payload.taskType === 'realtime' ? 'manual' : payload.runMode,
    scheduleConfig: payload.runMode === 'schedule' ? payload.scheduleConfig : undefined,
    dag: {
      nodes: [],
      edges: [],
      canvas: { scale: 1, offsetX: 0, offsetY: 0 },
    },
    runtimeConfig: {
      resourceQueueId: queue?.id ?? 'queue_001',
      resourceQueueName: queue?.name ?? '默认队列',
      parallelismDefault: payload.taskType === 'realtime' ? 8 : 4,
      taskManagerMemory: payload.resourceQueueId === 'queue_ml' ? '8g' : '4g',
      jobManagerMemory: '2g',
      taskSlots: 4,
      yarnVcores: 2,
      dirtyDataConfig: { enabled: true, sampleRatePerSecond: 100 },
    },
    createdBy: 'Chaoyang Xu',
    createdAt: nowText(),
    updatedBy: 'Chaoyang Xu',
    updatedAt: nowText(),
    version: 1,
  }
}

export const visualModelingService = {
  async getPermission(): Promise<VisualModelingPermission> {
    await delay()
    return clone(visualModelingPermission)
  },

  async listOperators(taskType: VisualModelingTaskType): Promise<OperatorDefinition[]> {
    await delay()
    return clone(
      visualModelingOperators
        .filter((operator) => operator.allowedTaskTypes.includes(taskType))
        .filter((operator) => operator.type !== 'realtime_label_output' || visualModelingPermission.canUseRealtimeLabelGenerate)
        .map((operator) => ({
          ...operator,
          unavailableReason: undefined,
        })),
    )
  },

  async listTasks(filter: TaskListFilter = {}): Promise<VisualModelingTask[]> {
    await delay()
    const keyword = normalize(filter.keyword)
    const filtered = tasks.filter((task) => {
      if (task.status === 'deleted') {
        return false
      }
      const statusMatches =
        !filter.status ||
        filter.status === 'all' ||
        taskStatus(task) === filter.status
      const runModeMatches = !filter.runMode || filter.runMode === 'all' || task.runMode === filter.runMode
      const ownerMatches = !filter.owner || filter.owner === 'all' || task.ownerId === 'current_user'
      const inputs = inputNodes(task).map((node) => node.displayName).join(',')
      const outputs = outputNodes(task)
        .map((node) => String(node.config.datasetName ?? node.config.topic ?? node.config.tagName ?? node.displayName))
        .join(',')
      const keywordMatches =
        !keyword ||
        [task.name, inputs, outputs, task.createdBy, task.ownerName].some((text) => normalize(text).includes(keyword))
      return statusMatches && runModeMatches && ownerMatches && keywordMatches
    })
    return clone(sortTasks(filtered, filter.sort))
  },

  async getTask(taskId: string): Promise<VisualModelingTask | null> {
    await delay()
    const task = tasks.find((item) => item.id === taskId)
    if (!task) {
      return null
    }
    updateDerivedSchemas(task)
    validateDag(task)
    return clone(task)
  },

  async checkName(name: string, folderId = 'folder_default', currentTaskId?: string): Promise<{ valid: boolean, message: string }> {
    await delay(120)
    const nameMessage = validateName(name)
    if (nameMessage) {
      return { valid: false, message: nameMessage }
    }
    const duplicated = tasks.some(
      (task) =>
        task.id !== currentTaskId &&
        task.status !== 'deleted' &&
        task.folderId === folderId &&
        normalize(task.name) === normalize(name),
    )
    if (duplicated) {
      return { valid: false, message: '同一目录下任务名称不能重复' }
    }
    return { valid: true, message: '名称可用' }
  },

  async createTask(payload: CreateTaskPayload): Promise<{ taskId: string }> {
    await delay(260)
    const check = await this.checkName(payload.name, payload.folderId)
    if (!check.valid) {
      throw new Error(check.message)
    }
    const task = buildNewTask(payload)
    tasks.unshift(task)
    persistState()
    return { taskId: task.id }
  },

  async updateTask(task: VisualModelingTask): Promise<VisualModelingTask> {
    await delay(260)
    const index = tasks.findIndex((item) => item.id === task.id)
    if (index < 0) {
      throw new Error('任务不存在')
    }
    const check = await this.checkName(task.name, task.folderId, task.id)
    if (!check.valid) {
      throw new Error(check.message)
    }
    const next = clone(task)
    touchTask(next)
    next.status = next.status === 'draft' ? 'saved' : next.status
    next.autosaveFailed = false
    validateDag(next)
    tasks[index] = next
    persistState()
    return clone(next)
  },

  async saveDraft(task: VisualModelingTask): Promise<VisualModelingTask> {
    await delay(180)
    const index = tasks.findIndex((item) => item.id === task.id)
    if (index < 0) {
      throw new Error('任务不存在')
    }
    const next = clone(task)
    next.status = next.status === 'published' ? 'published' : 'draft'
    next.updatedAt = nowText()
    next.updatedBy = 'Chaoyang Xu'
    next.autosaveFailed = false
    updateDerivedSchemas(next)
    tasks[index] = next
    persistState()
    return clone(next)
  },

  async deleteTask(taskId: string): Promise<void> {
    await delay(180)
    const task = tasks.find((item) => item.id === taskId)
    if (!task) {
      throw new Error('任务不存在')
    }
    task.status = 'deleted'
    task.deletedBy = 'Chaoyang Xu'
    task.deletedAt = nowText()
    task.expireDeleteAt = '2026-06-08 10:30:00'
    task.lastRunStatus = undefined
    touchTask(task)
    persistState()
  },

  async validateTask(task: VisualModelingTask): Promise<ValidationResult> {
    await delay(220)
    const target = clone(task)
    return validateDag(target)
  },

  validateConnection(task: VisualModelingTask, sourceNodeId: string, targetNodeId: string): { valid: boolean, message: string, edge?: ModelingEdge } {
    const source = task.dag.nodes.find((node) => node.id === sourceNodeId)
    const target = task.dag.nodes.find((node) => node.id === targetNodeId)
    if (!source || !target) {
      return { valid: false, message: '节点不存在' }
    }
    if (source.id === target.id) {
      return { valid: false, message: '无法连接：不能连接自己' }
    }
    if (source.category === '输出') {
      return { valid: false, message: '无法连接：输出算子不能有下游节点' }
    }
    const newEdge = createEdge(source, target, task)
    if (!newEdge) {
      return { valid: false, message: '无法连接：缺少可用端口' }
    }
    const sourcePort = source.outputPorts.find((port) => port.id === newEdge.sourcePortId)
    const targetPort = target.inputPorts.find((port) => port.id === newEdge.targetPortId)
    if (!sourcePort || !targetPort) {
      return { valid: false, message: '无法连接：缺少可用端口' }
    }
    if (sourcePort.dataKind !== targetPort.dataKind) {
      return {
        valid: false,
        message: `无法连接：上游输出为 ${sourcePort.dataKind}，当前节点输入需要 ${targetPort.dataKind}`,
      }
    }
    const usedConnections = task.dag.edges.filter(
      (edge) => edge.targetNodeId === target.id && edge.targetPortId === targetPort.id,
    )
    if (targetPort.maxConnections && usedConnections.length >= targetPort.maxConnections) {
      return { valid: false, message: '无法连接：输入端口连接数已达上限' }
    }
    if (createsCycle(task, newEdge)) {
      return { valid: false, message: '无法连接：该连线会形成环路' }
    }
    return { valid: true, message: '连线成功', edge: newEdge }
  },

  createNode(type: OperatorType, task: VisualModelingTask, x: number, y: number): ModelingNode {
    const id = `node_${type}_${Date.now()}`
    const node = createMockNode(type, id, x, y)
    adaptNodePortsForTask(task, node)
    node.schema = inferSchemaFromNode(task, node)
    return node
  },

  async cloneTask(taskId: string): Promise<{ taskId: string }> {
    await delay(260)
    const source = tasks.find((item) => item.id === taskId)
    if (!source) {
      throw new Error('任务不存在')
    }
    const copied = clone(source)
    copied.id = `task_${Date.now()}`
    copied.name = uniqueCopyName(source.name, source.folderId)
    copied.status = 'draft'
    copied.createdBy = 'Chaoyang Xu'
    copied.ownerId = 'current_user'
    copied.ownerName = 'Chaoyang Xu'
    copied.createdAt = nowText()
    copied.updatedBy = 'Chaoyang Xu'
    copied.updatedAt = nowText()
    copied.version = 1
    copied.lastRunAt = undefined
    copied.lastRunStatus = undefined
    copied.deletedAt = undefined
    copied.deletedBy = undefined
    copied.expireDeleteAt = undefined
    copied.dag.nodes = copied.dag.nodes.map((node) => ({
      ...node,
      id: `${node.id}_copy_${Date.now()}`,
      validationStatus: 'unknown',
      validationErrors: [],
    }))
    const idMap = new Map(source.dag.nodes.map((node, index) => [node.id, copied.dag.nodes[index]?.id ?? node.id]))
    copied.dag.edges = source.dag.edges
      .map((edge) => ({
        ...edge,
        id: `edge_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        sourceNodeId: idMap.get(edge.sourceNodeId) ?? edge.sourceNodeId,
        targetNodeId: idMap.get(edge.targetNodeId) ?? edge.targetNodeId,
      }))
    updateDerivedSchemas(copied)
    tasks.unshift(copied)
    persistState()
    return { taskId: copied.id }
  },

  async runTask(taskId: string, payload: RunTaskPayload): Promise<TaskRunRecord> {
    await delay(320)
    const task = tasks.find((item) => item.id === taskId)
    if (!task) {
      throw new Error('任务不存在')
    }
    const validation = validateDag(task)
    if (!validation.valid) {
      throw new Error(validation.errors[0]?.message ?? '任务校验未通过')
    }
    if (payload.outputNodeIds.length === 0) {
      throw new Error('至少选择一个输出节点')
    }
    if (task.taskType === 'realtime' && (payload.businessDateStart !== today() || payload.businessDateEnd !== today())) {
      throw new Error('实时任务只能立即启动，不支持历史业务日期')
    }
    task.status = 'running'
    task.lastRunAt = nowText()
    task.lastRunStatus = 'running'
    touchTask(task)
    const outputs = outputNodes(task).filter((node) => payload.outputNodeIds.includes(node.id))
    const run: TaskRunRecord = {
      id: `run_${Date.now()}`,
      taskId,
      businessDate:
        payload.businessDateStart === payload.businessDateEnd
          ? payload.businessDateStart
          : `${payload.businessDateStart} ~ ${payload.businessDateEnd}`,
      runType: payload.runType,
      status: 'running',
      startedAt: nowText(),
      outputRecords: outputs.map((node) => ({
        outputNodeId: node.id,
        outputName: String(node.config.datasetName ?? node.config.topic ?? node.config.tagName ?? node.displayName),
        status: 'running',
        writtenRows: task.taskType === 'realtime' ? 0 : undefined,
        dirtyRows: 0,
      })),
      createdBy: 'Chaoyang Xu',
      remark: payload.remark,
      logLines: [
        '[10:30:00] 任务已提交运行。',
        task.taskType === 'realtime' ? '[10:30:05] 正在启动 Flink 作业。' : '[10:30:05] 已生成离线执行计划。',
      ],
    }
    runs.unshift(run)
    persistState()
    return clone(run)
  },

  async previewNode(taskId: string, nodeId: string, limit = 100): Promise<PreviewResult> {
    await delay(360)
    const task = tasks.find((item) => item.id === taskId)
    const node = task?.dag.nodes.find((item) => item.id === nodeId)
    if (!task || !node) {
      throw new Error('节点不存在')
    }
    if (getIncomingNodes(task, nodeId).some((upstream) => upstream.validationStatus === 'invalid')) {
      throw new Error('请先完成上游节点配置')
    }
    const preview = previewForNode(task, node)
    preview.rows = preview.rows.slice(0, limit)
    node.previewStatus = 'ready'
    persistState()
    return clone(preview)
  },

  async listRuns(taskId: string): Promise<TaskRunRecord[]> {
    await delay()
    return clone(runs.filter((run) => run.taskId === taskId))
  },

  async rerun(runId: string): Promise<TaskRunRecord> {
    await delay(260)
    const run = runs.find((item) => item.id === runId)
    if (!run) {
      throw new Error('运行记录不存在')
    }
    return this.runTask(run.taskId, {
      outputNodeIds: run.outputRecords.map((output) => output.outputNodeId),
      businessDateStart: run.businessDate.slice(0, 10),
      businessDateEnd: run.businessDate.slice(0, 10),
      runType: 'rerun',
      remark: '重跑将使用当前任务最新配置重新执行该业务日期。',
    })
  },

  async terminateRun(runId: string): Promise<void> {
    await delay(180)
    const run = runs.find((item) => item.id === runId)
    if (!run) {
      throw new Error('运行记录不存在')
    }
    run.status = 'terminated'
    run.finishedAt = nowText()
    run.durationSeconds = 732
    run.outputRecords = run.outputRecords.map((output) => ({ ...output, status: 'terminated' }))
    run.logLines.push('[10:30:00] 用户终止任务，已写入成功的输出不自动回滚。')
    const task = tasks.find((item) => item.id === run.taskId)
    if (task && isRunningStatus(task.lastRunStatus)) {
      task.status = 'paused'
      task.lastRunStatus = 'terminated'
      touchTask(task)
    }
    persistState()
  },

  async terminateTask(taskId: string): Promise<void> {
    await delay(180)
    const task = tasks.find((item) => item.id === taskId)
    if (!task) {
      throw new Error('任务不存在')
    }
    const run = runs.find(
      (item) =>
        item.taskId === taskId &&
        (item.status === 'running' || item.status === 'waiting_dependency' || item.status === 'waiting_schedule'),
    )
    if (run) {
      run.status = 'terminated'
      run.finishedAt = nowText()
      run.durationSeconds = 732
      run.outputRecords = run.outputRecords.map((output) => ({ ...output, status: 'terminated' }))
      run.logLines.push('[10:30:00] 用户终止任务，已写入成功的输出不自动回滚。')
    }
    task.status = 'paused'
    task.lastRunStatus = 'terminated'
    touchTask(task)
    persistState()
  },

  async getLineage(taskId: string): Promise<{ nodes: LineageNode[], edges: LineageEdge[] }> {
    await delay()
    const task = tasks.find((item) => item.id === taskId)
    if (!task) {
      return { nodes: [], edges: [] }
    }
    return clone(makeLineage(task))
  },

  async listRecycleBin(): Promise<VisualModelingTask[]> {
    await delay()
    return clone(tasks.filter((task) => task.status === 'deleted'))
  },

  async restoreTask(taskId: string, newName?: string): Promise<VisualModelingTask> {
    await delay(220)
    const task = tasks.find((item) => item.id === taskId)
    if (!task) {
      throw new Error('任务不存在')
    }
    const name = newName?.trim() || task.name
    const check = await this.checkName(name, task.folderId, task.id)
    if (!check.valid) {
      throw new Error(check.message)
    }
    task.name = name
    task.status = 'saved'
    task.deletedAt = undefined
    task.deletedBy = undefined
    task.expireDeleteAt = undefined
    touchTask(task)
    persistState()
    return clone(task)
  },

  async permanentlyDeleteTask(taskId: string): Promise<void> {
    await delay(180)
    tasks = tasks.filter((task) => task.id !== taskId)
    runs = runs.filter((run) => run.taskId !== taskId)
    persistState()
  },

  async listExportResources(): Promise<ExportResource[]> {
    await delay()
    return clone(mockExportResources)
  },

  async exportResources(taskIds: string[], includePermission: boolean): Promise<ExportResult> {
    await delay(420)
    if (taskIds.length === 0) {
      throw new Error('请选择需要导出的任务')
    }
    if (taskIds.length > 100) {
      throw new Error('每次最多导出 100 个任务')
    }
    const resourceCount = mockExportResources
      .filter((resource) => taskIds.includes(resource.taskId))
      .reduce(
        (sum, resource) =>
          sum +
          resource.inputDatasets.length +
          resource.outputDatasets.length +
          resource.dataConnections.length +
          resource.resourceQueues.length,
        includePermission ? 4 : 0,
      )
    return {
      fileName: `可视化建模_20260524_${Math.random().toString(36).slice(2, 8).toUpperCase()}.prep`,
      taskCount: taskIds.length,
      resourceCount,
    }
  },

  async parseImport(fileName: string): Promise<ImportParseResult> {
    await delay(520)
    if (!fileName.endsWith('.prep')) {
      throw new Error('仅支持上传 .prep 格式的可视化建模资源包')
    }
    return clone({ ...mockImportParseResult, packageName: fileName })
  },

  async executeImport(parseResult: ImportParseResult): Promise<ImportExecuteResult> {
    await delay(760)
    const failures = parseResult.tasks
      .filter((task) => !task.valid)
      .map((task) => ({ taskName: task.name, reason: task.reason ?? '资源校验失败' }))
    return {
      total: parseResult.tasks.length,
      success: parseResult.tasks.length - failures.length,
      failed: failures.length,
      failures,
      steps: [
        { label: '解析资源包', status: 'success' },
        { label: '校验资源', status: failures.length ? 'failed' : 'success' },
        { label: '创建 / 覆盖任务', status: failures.length ? 'failed' : 'success' },
        { label: '映射数据集', status: 'success' },
        { label: '映射数据连接', status: 'success' },
        { label: '写入权限', status: 'success' },
        { label: '完成', status: failures.length ? 'failed' : 'success' },
      ],
    }
  },

  getStaticOptions() {
    return {
      folders: clone(visualModelingFolders),
      queues: clone(visualModelingQueues),
      connections: clone(visualModelingConnections),
      datasets: clone(visualModelingDatasets),
    }
  },

  getOperatorDefinition(type: OperatorType): OperatorDefinition {
    return clone(getOperator(type))
  },

  getUpstreamFields(task: VisualModelingTask, nodeId: string): FieldSchema[] {
    const taskClone = clone(task)
    updateDerivedSchemas(taskClone)
    return clone(getUpstreamSchema(taskClone, nodeId)?.fields ?? getNode(taskClone, nodeId)?.schema?.fields ?? [])
  },
}
