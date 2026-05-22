<script setup lang="ts">
import {
  NAlert,
  NButton,
  NCard,
  NDataTable,
  NDatePicker,
  NDrawer,
  NDrawerContent,
  NEmpty,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NModal,
  NSelect,
  NSpace,
  NSwitch,
  NTabPane,
  NTabs,
  NTag,
} from 'naive-ui'
import type { DataTableColumns, DataTableRowKey, SelectOption } from 'naive-ui'
import { computed, h, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { dataConnectionService } from '@/services/dataConnectionService'
import type {
  ConnectorFieldSchema,
  DataConnection,
  DataConnectionAuditLog,
  DataConnectionBatchDeleteImpact,
  DataConnectionColumnSchema,
  DataConnectionConfigValue,
  DataConnectionDataset,
  DataConnectionDeleteImpact,
  DataConnectionFormPayload,
  DataConnectionIngestionJob,
  DataConnectionLineageEdge,
  DataConnectionLineageNode,
  DataConnectionListFilter,
  DataConnectionModelingTask,
  DataConnectionPermission,
  DataConnectionPreviewRow,
  DataConnectionPreviewResult,
  DataConnectionPreviewStructureType,
  DataConnectionStatus,
  DataConnectionTableSchema,
  DataConnectionTestRecord,
  DataConnectorCategory,
  DataConnectorDefinition,
} from '@/types/dataConnection'

type ConnectionMode = 'list' | 'select' | 'create' | 'edit' | 'detail'
type DetailTab = 'overview' | 'preview' | 'assets' | 'runs' | 'lineage' | 'logs'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const testing = ref(false)
const saving = ref(false)
const ingesting = ref(false)
const notice = ref('正在加载数据连接。')
const noticeType = ref<'success' | 'warning' | 'error' | 'info'>('info')
const permission = ref<DataConnectionPermission | null>(null)
const connectors = ref<DataConnectorDefinition[]>([])
const connections = ref<DataConnection[]>([])
const selectedRows = ref<DataTableRowKey[]>([])
const currentConnection = ref<DataConnection | null>(null)
const previewResult = ref<DataConnectionPreviewResult | null>(null)
const testRecords = ref<DataConnectionTestRecord[]>([])
const ingestionJobs = ref<DataConnectionIngestionJob[]>([])
const datasets = ref<DataConnectionDataset[]>([])
const modelingTasks = ref<DataConnectionModelingTask[]>([])
const lineageNodes = ref<DataConnectionLineageNode[]>([])
const lineageEdges = ref<DataConnectionLineageEdge[]>([])
const auditLogs = ref<DataConnectionAuditLog[]>([])
const activeDetailTab = ref<DetailTab>('overview')
const connectorKeyword = ref('')
const connectorCategoryFilter = ref<DataConnectorCategory | 'ALL'>('ALL')
const showPreviewDrawer = ref(false)
const showAuthModal = ref(false)
const showDeleteModal = ref(false)
const showBatchDeleteModal = ref(false)
const showPostSaveModal = ref(false)
const deleteImpact = ref<DataConnectionDeleteImpact | null>(null)
const batchDeleteImpacts = ref<DataConnectionBatchDeleteImpact[]>([])
const pendingDeleteConnection = ref<DataConnection | null>(null)
const postSaveConnection = ref<DataConnection | null>(null)
const createdRange = ref<[number, number] | null>(null)
const recentTestRange = ref<[number, number] | null>(null)
const selectedPreviewTableKey = ref('')

const filters = reactive<DataConnectionListFilter>({
  keyword: '',
  connectorCategory: 'ALL',
  connectorType: 'ALL',
  status: 'ALL',
  createdBy: 'ALL',
  supportsOneClickIngest: 'ALL',
})

const form = reactive<DataConnectionFormPayload>({
  connectionName: '',
  connectorType: '',
  description: '',
  owner: '数据平台组',
  tags: [],
  visibility: 'PROJECT',
  sourceSystem: '',
  config: {},
})

const currentMode = computed<ConnectionMode>(() => {
  return (route.meta.connectionMode as ConnectionMode | undefined) ?? 'list'
})

const routeConnectionId = computed(() => String(route.params.connectionId ?? ''))
const routeConnectorType = computed(() => String(route.params.connectorType ?? ''))

const selectedConnector = computed(() => {
  return connectors.value.find((item) => item.connectorType === form.connectorType) ?? null
})

const canSaveCurrentForm = computed(() => {
  const connector = selectedConnector.value
  if (!connector) {
    return false
  }
  if (currentMode.value === 'edit') {
    return true
  }
  if (!connector.supportsTest || connector.allowSaveWithoutTest) {
    return true
  }
  return previewResult.value?.success === true || currentConnection.value?.testStatus === 'SUCCESS'
})

const batchDeleteSummary = computed(() => {
  const deletable = batchDeleteImpacts.value.filter((item) => item.impact.canDelete).length
  const blocked = batchDeleteImpacts.value.length - deletable
  return { deletable, blocked }
})

const connectorCategoryOptions = computed<SelectOption[]>(() => {
  const categories = Array.from(
    new Map(connectors.value.map((connector) => [connector.connectorCategory, connector.categoryName])),
  )
  return [
    { label: '全部类型', value: 'ALL' },
    ...categories.map(([value, label]) => ({ label, value })),
  ]
})

const connectorTypeOptions = computed<SelectOption[]>(() => [
  { label: '全部连接器', value: 'ALL' },
  ...connectors.value.map((connector) => ({
    label: connector.connectorName,
    value: connector.connectorType,
    disabled: !connector.enabled,
  })),
])

const creatorOptions = computed<SelectOption[]>(() => {
  const creators = Array.from(new Set(connections.value.map((connection) => connection.createdBy)))
  return [{ label: '全部创建人', value: 'ALL' }, ...creators.map((creator) => ({ label: creator, value: creator }))]
})

const statusOptions: SelectOption[] = [
  { label: '全部状态', value: 'ALL' },
  { label: '草稿', value: 'DRAFT' },
  { label: '未测试', value: 'SAVED' },
  { label: '正常', value: 'TEST_SUCCESS' },
  { label: '异常', value: 'TEST_FAILED' },
  { label: '待授权', value: 'AUTH_REQUIRED' },
  { label: '授权过期', value: 'AUTH_EXPIRED' },
  { label: '接入成功', value: 'INGEST_SUCCESS' },
  { label: '接入失败', value: 'INGEST_FAILED' },
  { label: '已停用', value: 'DISABLED' },
]

const oneClickOptions: SelectOption[] = [
  { label: '是否一键接入', value: 'ALL' },
  { label: '支持一键接入', value: 'YES' },
  { label: '不支持一键接入', value: 'NO' },
]

const visibilityOptions: SelectOption[] = [
  { label: '项目内可见', value: 'PROJECT' },
  { label: '仅自己可见', value: 'PRIVATE' },
]

const selectedConnectorCategoryOptions = computed<SelectOption[]>(() => {
  return connectorCategoryOptions.value.filter((item) => item.value === 'ALL' || item.value === connectorCategoryFilter.value)
})

const filteredConnectors = computed(() => {
  const keyword = connectorKeyword.value.trim().toLowerCase()
  return connectors.value.filter((connector) => {
    const categoryMatches =
      connectorCategoryFilter.value === 'ALL' || connector.connectorCategory === connectorCategoryFilter.value
    const keywordMatches =
      !keyword ||
      [connector.connectorName, connector.description, connector.categoryName, ...connector.tags]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    return categoryMatches && keywordMatches
  })
})

const stats = computed(() => {
  const failed = connections.value.filter((item) => ['TEST_FAILED', 'INGEST_FAILED', 'AUTH_EXPIRED'].includes(item.status)).length
  const normal = connections.value.filter((item) => ['TEST_SUCCESS', 'INGEST_SUCCESS'].includes(item.status)).length
  const untested = connections.value.filter((item) => item.testStatus === 'NOT_TESTED').length
  return [
    { label: '连接总数', value: String(connections.value.length) },
    { label: '正常连接', value: String(normal), tone: 'success' },
    { label: '异常连接', value: String(failed), tone: failed > 0 ? 'error' : 'success' },
    { label: '未测试', value: String(untested), tone: untested > 0 ? 'warning' : 'success' },
    { label: '一键接入', value: String(connections.value.filter((item) => item.supportsOneClickIngest).length) },
    { label: '最近失败', value: String(failed), tone: failed > 0 ? 'error' : 'success' },
  ]
})

const connectorSections = computed(() => {
  const connector = selectedConnector.value
  if (!connector) {
    return []
  }
  return [
    { key: 'BASIC', title: '基础参数', fields: sectionFields('BASIC') },
    { key: 'AUTH', title: '认证信息', fields: sectionFields('AUTH') },
    { key: 'CONNECTION', title: '连接参数', fields: sectionFields('CONNECTION') },
    { key: 'FILE', title: '文件参数', fields: sectionFields('FILE') },
    { key: 'INGEST', title: '一键接入设置', fields: sectionFields('INGEST') },
    { key: 'ADVANCED', title: '高级配置', fields: sectionFields('ADVANCED') },
  ].filter((section) => section.fields.length > 0)
})

const specialColumnTypes = new Set<DataConnectionColumnSchema['type']>([
  'DECIMAL',
  'JSON',
  'ARRAY',
  'MAP',
  'BINARY',
  'GEOGRAPHY',
  'UUID',
])

function previewTableKey(table: DataConnectionTableSchema): string {
  return `${table.schema ?? 'default'}__${table.tableName}`
}

function previewTableLabel(table: DataConnectionTableSchema): string {
  return `${table.schema ? `${table.schema}.` : ''}${table.tableName}`
}

function structureTypeText(type?: DataConnectionPreviewStructureType): string {
  const map: Record<DataConnectionPreviewStructureType, string> = {
    STRUCTURED: '结构化',
    SEMI_STRUCTURED: '半结构化',
    UNSTRUCTURED: '非结构化',
  }
  return type ? map[type] : '结构化'
}

function structureTagType(type?: DataConnectionPreviewStructureType): 'success' | 'warning' | 'error' | 'info' {
  if (type === 'UNSTRUCTURED') {
    return 'error'
  }
  if (type === 'SEMI_STRUCTURED') {
    return 'warning'
  }
  return 'success'
}

function columnTypeTagType(type: DataConnectionColumnSchema['type']): 'success' | 'warning' | 'error' | 'info' | 'default' {
  if (type === 'BINARY') {
    return 'error'
  }
  if (specialColumnTypes.has(type)) {
    return 'warning'
  }
  if (['BIGINT', 'DOUBLE', 'DECIMAL'].includes(type)) {
    return 'info'
  }
  return 'default'
}

function formatPreviewValue(value: string | number | boolean | null): string {
  if (value === null) {
    return 'NULL'
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }
  return String(value)
}

const previewTableOptions = computed<SelectOption[]>(() => {
  return (previewResult.value?.tables ?? []).map((table) => ({
    label: `${previewTableLabel(table)} · ${structureTypeText(table.structureType)}`,
    value: previewTableKey(table),
  }))
})

const selectedPreviewTable = computed<DataConnectionTableSchema | null>(() => {
  const tables = previewResult.value?.tables ?? []
  return tables.find((table) => previewTableKey(table) === selectedPreviewTableKey.value) ?? tables[0] ?? null
})

const currentPreviewRows = computed<DataConnectionPreviewRow[]>(() => {
  return selectedPreviewTable.value?.previewRows?.length
    ? selectedPreviewTable.value.previewRows
    : previewResult.value?.previewRows ?? []
})

const previewColumns = computed<DataTableColumns<DataConnectionPreviewRow>>(() => {
  const first = currentPreviewRows.value[0]
  if (!first) {
    return []
  }
  return Object.keys(first).map((key) => ({
    title: key,
    key,
    ellipsis: { tooltip: true },
    minWidth: 140,
    render: (row) => {
      const value = row[key] ?? null
      return h('span', { class: ['preview-cell', value === null ? 'is-null' : ''] }, formatPreviewValue(value))
    },
  }))
})

const previewTableColumns = computed<DataTableColumns<DataConnectionColumnSchema>>(() => {
  return [
    { title: '字段名', key: 'name', minWidth: 160 },
    { title: '显示名', key: 'displayName', minWidth: 160 },
    {
      title: '类型',
      key: 'type',
      width: 130,
      render: (row) => h(NTag, { size: 'small', type: columnTypeTagType(row.type) }, { default: () => row.type }),
    },
    {
      title: '可为空',
      key: 'nullable',
      width: 110,
      render: (row) => (row.nullable ? '是' : '否'),
    },
  ]
})

const previewSummaryCards = computed(() => {
  const result = previewResult.value
  const tables = result?.tables ?? []
  const specialCount = tables.reduce(
    (count, table) => count + table.columns.filter((column) => specialColumnTypes.has(column.type)).length,
    0,
  )
  return [
    { label: 'Schema / 库', value: String(result?.schemas.length ?? 0) },
    { label: '对象 / 表', value: String(tables.length) },
    {
      label: '结构类型',
      value: structureTypeText(selectedPreviewTable.value?.structureType),
      tone: selectedPreviewTable.value?.structureType === 'UNSTRUCTURED' ? 'error' : selectedPreviewTable.value?.structureType === 'SEMI_STRUCTURED' ? 'warning' : 'success',
    },
    { label: '特殊类型字段', value: String(specialCount), tone: specialCount > 0 ? 'warning' : 'success' },
    { label: '当前对象行数', value: (selectedPreviewTable.value?.rowEstimate ?? result?.rowEstimate ?? 0).toLocaleString() },
  ]
})

const lineageEdgeRows = computed(() => {
  const nodeLabelMap = new Map(lineageNodes.value.map((node) => [node.id, node.label]))
  return lineageEdges.value.map((edge) => ({
    ...edge,
    sourceLabel: nodeLabelMap.get(edge.source) ?? edge.source,
    targetLabel: nodeLabelMap.get(edge.target) ?? edge.target,
  }))
})

watch(previewResult, () => {
  selectedPreviewTableKey.value = previewTableOptions.value[0]?.value ? String(previewTableOptions.value[0]?.value) : ''
})

function statusTagType(status: DataConnectionStatus): 'success' | 'warning' | 'error' | 'info' | 'default' {
  if (['TEST_SUCCESS', 'INGEST_SUCCESS'].includes(status)) {
    return 'success'
  }
  if (['TEST_FAILED', 'INGEST_FAILED', 'AUTH_EXPIRED'].includes(status)) {
    return 'error'
  }
  if (['AUTH_REQUIRED', 'TESTING', 'INGESTING'].includes(status)) {
    return 'warning'
  }
  return 'default'
}

function statusText(status: DataConnectionStatus): string {
  const map: Record<DataConnectionStatus, string> = {
    DRAFT: '草稿',
    SAVED: '未测试',
    TESTING: '测试中',
    TEST_SUCCESS: '正常',
    TEST_FAILED: '异常',
    AUTH_REQUIRED: '待授权',
    AUTH_EXPIRED: '授权过期',
    INGESTING: '接入中',
    INGEST_SUCCESS: '接入成功',
    INGEST_FAILED: '接入失败',
    DISABLED: '已禁用',
  }
  return map[status]
}

function datasetStatusTagType(status: DataConnectionDataset['status']): 'success' | 'warning' | 'error' | 'default' {
  if (status === 'READY') {
    return 'success'
  }
  if (status === 'FAILED') {
    return 'error'
  }
  return 'warning'
}

function jobStatusTagType(status: DataConnectionIngestionJob['jobStatus']): 'success' | 'warning' | 'error' | 'default' {
  if (status === 'SUCCESS') {
    return 'success'
  }
  if (status === 'FAILED' || status === 'CANCELED') {
    return 'error'
  }
  if (['RUNNING', 'FETCHING', 'WRITING_RAW', 'MODELING_RUNNING'].includes(status)) {
    return 'warning'
  }
  return 'default'
}

function modelingStatusTagType(status: DataConnectionModelingTask['status']): 'success' | 'warning' | 'error' | 'default' {
  if (status === 'SUCCESS') {
    return 'success'
  }
  if (status === 'FAILED') {
    return 'error'
  }
  if (status === 'RUNNING') {
    return 'warning'
  }
  return 'default'
}

function lineageStatusTagType(status: DataConnectionLineageNode['status']): 'success' | 'warning' | 'error' {
  if (status === 'ERROR') {
    return 'error'
  }
  if (status === 'WARNING') {
    return 'warning'
  }
  return 'success'
}

function showNotice(message: string, type: typeof noticeType.value = 'success') {
  notice.value = message
  noticeType.value = type
}

function formatDate(ms: number): string {
  const date = new Date(ms)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function compactNowText(): string {
  const date = new Date()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')
  return `${date.getFullYear()}${month}${day}${hour}${minute}${second}`
}

function handleCreatedRangeChange(value: [number, number] | null) {
  createdRange.value = value
  filters.createdAtStart = value ? formatDate(value[0]) : undefined
  filters.createdAtEnd = value ? formatDate(value[1]) : undefined
  handleSearch()
}

function handleRecentTestRangeChange(value: [number, number] | null) {
  recentTestRange.value = value
  filters.recentTestStart = value ? formatDate(value[0]) : undefined
  filters.recentTestEnd = value ? formatDate(value[1]) : undefined
  handleSearch()
}

function sectionFields(section: ConnectorFieldSchema['section']): ConnectorFieldSchema[] {
  return selectedConnector.value?.fields.filter((field) => field.section === section && fieldVisible(field)) ?? []
}

function fieldVisible(field: ConnectorFieldSchema): boolean {
  if (!field.visibleWhen) {
    return true
  }
  return form.config[field.visibleWhen.field] === field.visibleWhen.equals
}

function resetForm(connectorType = '') {
  const connector = connectors.value.find((item) => item.connectorType === connectorType)
  form.connectorType = connectorType
  form.connectionName = connector ? `${connector.connectorName}_${compactNowText()}` : ''
  form.description = connector?.description ?? ''
  form.owner = '数据平台组'
  form.tags = connector?.tags.slice(0, 3) ?? []
  form.visibility = 'PROJECT'
  form.sourceSystem = connectorType ? `${connectorType}-source` : ''
  form.config = {}
  connector?.fields.forEach((field) => {
    form.config[field.key] = field.defaultValue ?? null
  })
  previewResult.value = null
  currentConnection.value = null
}

function fillForm(connection: DataConnection) {
  form.connectionName = connection.connectionName
  form.connectorType = connection.connectorType
  form.description = connection.description ?? ''
  form.owner = connection.owner
  form.tags = [...connection.tags]
  form.visibility = connection.visibility
  form.sourceSystem = connection.sourceSystem
  form.config = { ...connection.config }
}

function textValue(key: string): string {
  const value = form.config[key]
  return typeof value === 'string' ? value : value == null ? '' : String(value)
}

function numberValue(key: string): number | null {
  const value = form.config[key]
  return typeof value === 'number' ? value : null
}

function boolValue(key: string): boolean {
  return form.config[key] === true
}

function arrayValue(key: string): string[] {
  const value = form.config[key]
  return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : []
}

function fieldOptions(field: ConnectorFieldSchema): SelectOption[] {
  return (field.options ?? []).map((option) => ({
    label: option.label,
    value: typeof option.value === 'boolean' ? String(option.value) : option.value,
    disabled: option.disabled,
  }))
}

function setConfigValue(key: string, value: DataConnectionConfigValue) {
  form.config[key] = value
}

function keyValueItems(key: string): Array<{ key: string, value: string }> {
  const value = form.config[key]
  return Array.isArray(value) && value.every((item) => typeof item === 'object' && 'key' in item) ? value : []
}

function updateKeyValue(fieldKey: string, index: number, itemKey: 'key' | 'value', value: string) {
  const items = keyValueItems(fieldKey).map((item) => ({ ...item }))
  if (items[index]) {
    items[index][itemKey] = value
  }
  form.config[fieldKey] = items
}

function addKeyValue(fieldKey: string) {
  form.config[fieldKey] = [...keyValueItems(fieldKey), { key: '', value: '' }]
}

function removeKeyValue(fieldKey: string, index: number) {
  form.config[fieldKey] = keyValueItems(fieldKey).filter((_, itemIndex) => itemIndex !== index)
}

function validateForm(): string | null {
  if (!form.connectionName.trim()) {
    return '请输入连接名称。'
  }
  const duplicated = connections.value.some((connection) => {
    const sameName = connection.connectionName === form.connectionName.trim()
    const sameConnection = currentMode.value === 'edit' && connection.id === currentConnection.value?.id
    return sameName && !sameConnection
  })
  if (duplicated) {
    return '当前项目下已有同名连接，请修改连接名称。'
  }
  if (!form.connectorType) {
    return '请选择连接器。'
  }
  const connector = selectedConnector.value
  const missingField = connector?.fields.find((field) => field.required && fieldVisible(field) && !form.config[field.key])
  if (missingField) {
    return `请填写${missingField.label}。`
  }
  if (connector?.requiresAuth && currentMode.value === 'create' && form.config.__authorized !== true) {
    return '请先完成授权后再保存连接。'
  }
  return null
}

function payloadFromForm(): DataConnectionFormPayload {
  return {
    connectionName: form.connectionName,
    connectorType: form.connectorType,
    description: form.description,
    owner: form.owner,
    tags: form.tags,
    visibility: form.visibility,
    sourceSystem: form.sourceSystem,
    config: { ...form.config },
  }
}

async function loadConnections() {
  connections.value = await dataConnectionService.listConnections(filters)
}

async function loadBase() {
  loading.value = true
  permission.value = await dataConnectionService.getPermission()
  connectors.value = await dataConnectionService.listConnectors()
  await loadConnections()
  loading.value = false
}

async function loadConnectionDetail(connectionId: string, tab?: DetailTab) {
  loading.value = true
  const connection = await dataConnectionService.getConnection(connectionId)
  if (!connection) {
    loading.value = false
    showNotice('未找到该数据连接。', 'error')
    await router.push('/data-fusion/connections')
    return
  }
  currentConnection.value = connection
  fillForm(connection)
  previewResult.value = connection.supportsPreview ? await dataConnectionService.previewConnection({ connectionId }) : null
  testRecords.value = await dataConnectionService.listTestRecords(connectionId)
  ingestionJobs.value = await dataConnectionService.listIngestionJobs(connectionId)
  datasets.value = await dataConnectionService.listGeneratedDatasets(connectionId)
  modelingTasks.value = await dataConnectionService.listModelingTasks(connectionId)
  const lineage = await dataConnectionService.getLineage(connectionId)
  lineageNodes.value = lineage.nodes
  lineageEdges.value = lineage.edges
  auditLogs.value = await dataConnectionService.listAuditLogs(connectionId)
  activeDetailTab.value = tab ?? (route.meta.activeTab as DetailTab | undefined) ?? 'overview'
  loading.value = false
}

async function initByRoute() {
  if (currentMode.value === 'create') {
    resetForm(routeConnectorType.value)
    return
  }
  if (currentMode.value === 'select') {
    resetForm()
    return
  }
  if (currentMode.value === 'edit' || currentMode.value === 'detail') {
    await loadConnectionDetail(routeConnectionId.value)
    return
  }
  currentConnection.value = null
  await loadConnections()
}

async function handleSearch() {
  await loadConnections()
}

function openCreate(connectorType: string) {
  const connector = connectors.value.find((item) => item.connectorType === connectorType)
  if (!connector?.enabled) {
    showNotice(connector?.disabledReason ?? '该连接器当前不可用。', 'warning')
    return
  }
  router.push(`/data-fusion/connections/new/${connectorType}`)
}

async function handleTestConnection() {
  const error = validateForm()
  if (error) {
    showNotice(error, 'warning')
    return
  }
  testing.value = true
  previewResult.value = await dataConnectionService.testConnection(payloadFromForm())
  testing.value = false
  showNotice(previewResult.value.message, previewResult.value.success ? 'success' : 'error')
  showPreviewDrawer.value = true
}

async function handlePreviewData() {
  const detailConnection = currentMode.value === 'detail' ? currentConnection.value : null
  const isDetailTarget = Boolean(detailConnection)
  if (!isDetailTarget) {
    const error = validateForm()
    if (error) {
      showNotice(error, 'warning')
      return
    }
  }
  const target = isDetailTarget
    ? { connectionId: detailConnection?.id ?? '' }
    : payloadFromForm()
  previewResult.value = await dataConnectionService.previewConnection(target)
  showNotice(previewResult.value.message, previewResult.value.success ? 'success' : 'error')
  if (isDetailTarget) {
    activeDetailTab.value = 'preview'
    showPreviewDrawer.value = false
  } else {
    showPreviewDrawer.value = true
  }
}

async function handleTestExisting(connection: DataConnection) {
  testing.value = true
  previewResult.value = await dataConnectionService.testConnection({ connectionId: connection.id })
  testing.value = false
  showNotice(previewResult.value.message, previewResult.value.success ? 'success' : 'error')
  if (currentConnection.value?.id === connection.id) {
    await loadConnectionDetail(connection.id, activeDetailTab.value)
  } else {
    await loadConnections()
  }
}

async function handleSaveConnection() {
  const error = validateForm()
  if (error) {
    showNotice(error, 'warning')
    return
  }
  if (!canSaveCurrentForm.value) {
    showNotice('请先完成连接测试，测试成功后再保存。', 'warning')
    return
  }
  saving.value = true
  let saved: DataConnection | null = null
  try {
    saved = currentMode.value === 'edit' && currentConnection.value
      ? await dataConnectionService.updateConnection(currentConnection.value.id, payloadFromForm())
      : await dataConnectionService.createConnection(payloadFromForm())
    if (saved?.supportsTest && previewResult.value?.success) {
      await dataConnectionService.testConnection({ connectionId: saved.id })
      saved = await dataConnectionService.getConnection(saved.id)
    }
  } catch (error) {
    saving.value = false
    showNotice(error instanceof Error ? error.message : '保存失败，请重试。', 'error')
    return
  }
  saving.value = false
  if (!saved) {
    showNotice('保存失败，请重试。', 'error')
    return
  }
  postSaveConnection.value = saved
  showPostSaveModal.value = saved.supportsOneClickIngest
  showNotice(saved.supportsOneClickIngest ? '数据连接已保存，可继续执行一键接入。' : '数据连接已保存。')
  await router.push(`/data-fusion/connections/${saved.id}`)
}

async function handleAuthorize(connection?: DataConnection) {
  const target = connection ?? currentConnection.value
  if (!target && selectedConnector.value) {
    showAuthModal.value = false
    form.config.__authorized = true
    showNotice('授权已完成，请继续测试连接。')
    return
  }
  if (!target) {
    return
  }
  showAuthModal.value = false
  const updated = await dataConnectionService.authorizeConnection(target.id)
  if (updated) {
    currentConnection.value = updated
    if (currentMode.value === 'detail' && currentConnection.value?.id === target.id) {
      await loadConnectionDetail(target.id, activeDetailTab.value)
    } else {
      await loadConnections()
    }
    showNotice('授权已刷新。')
  }
}

async function handleBatchAuthorize() {
  const targets = connections.value.filter((item) => selectedRows.value.includes(item.id))
  if (targets.length === 0) {
    showNotice('请先选择要刷新授权的连接。', 'warning')
    return
  }
  for (const item of targets) {
    if (item.authStatus !== 'AUTH_SUCCESS' || item.supportsOneClickIngest) {
      await dataConnectionService.authorizeConnection(item.id)
    }
  }
  showNotice(`已完成 ${targets.length} 个连接的授权刷新。`)
  selectedRows.value = []
  await loadConnections()
}

async function handleOneClickIngest(connection?: DataConnection) {
  const target = connection ?? currentConnection.value
  if (!target) {
    return
  }
  if (!target.supportsOneClickIngest) {
    showNotice('当前连接器不支持一键接入。', 'warning')
    return
  }
  if (target.authStatus !== 'AUTH_SUCCESS') {
    showNotice('请先完成授权，再执行一键接入。', 'warning')
    return
  }
  if (target.testStatus !== 'SUCCESS') {
    showNotice('请先完成连接测试，测试成功后再执行一键接入。', 'warning')
    return
  }
  if (['CREATED', 'RUNNING'].includes(target.ingestStatus)) {
    showNotice('当前连接已有运行中的接入任务，请稍后查看任务状态。', 'warning')
    return
  }
  ingesting.value = true
  const job = await dataConnectionService.runOneClickIngest(target.id)
  ingesting.value = false
  if (!job) {
    showNotice('当前连接不支持一键接入。', 'warning')
    return
  }
  showPostSaveModal.value = false
  showNotice('一键接入完成，已生成数据集和建模任务。')
  await loadConnections()
  await loadConnectionDetail(target.id, 'assets')
}

async function refreshDetail(tab: DetailTab = activeDetailTab.value) {
  if (!currentConnection.value) {
    return
  }
  await loadConnectionDetail(currentConnection.value.id, tab)
  showNotice('详情数据已刷新。')
}

async function openDelete(connection: DataConnection) {
  pendingDeleteConnection.value = connection
  deleteImpact.value = await dataConnectionService.getDeleteImpact(connection.id)
  showDeleteModal.value = true
}

async function confirmDelete() {
  const target = pendingDeleteConnection.value
  if (!target) {
    return
  }
  const success = await dataConnectionService.deleteConnection(target.id)
  if (!success) {
    showNotice(deleteImpact.value?.reason ?? '该连接存在下游依赖，无法删除。', 'warning')
    return
  }
  showDeleteModal.value = false
  showNotice('数据连接已删除。')
  await router.push('/data-fusion/connections')
  await loadConnections()
}

async function handleBatchTest() {
  const targets = connections.value.filter((item) => selectedRows.value.includes(item.id))
  if (targets.length === 0) {
    showNotice('请先选择要测试的连接。', 'warning')
    return
  }
  for (const item of targets) {
    if (item.supportsTest) {
      await dataConnectionService.testConnection({ connectionId: item.id })
    }
  }
  showNotice(`已完成 ${targets.length} 个连接的批量测试。`)
  selectedRows.value = []
  await loadConnections()
}

async function handleBatchDelete() {
  const targets = connections.value.filter((item) => selectedRows.value.includes(item.id))
  if (targets.length === 0) {
    showNotice('请先选择要删除的连接。', 'warning')
    return
  }
  batchDeleteImpacts.value = []
  for (const item of targets) {
    batchDeleteImpacts.value.push({
      connection: item,
      impact: await dataConnectionService.getDeleteImpact(item.id),
    })
  }
  showBatchDeleteModal.value = true
}

async function confirmBatchDelete() {
  let deletedCount = 0
  let skippedCount = 0
  for (const item of batchDeleteImpacts.value) {
    const impact = item.impact
    if (!impact.canDelete) {
      skippedCount += 1
      continue
    }
    const success = await dataConnectionService.deleteConnection(item.connection.id)
    if (success) {
      deletedCount += 1
    } else {
      skippedCount += 1
    }
  }
  selectedRows.value = []
  showBatchDeleteModal.value = false
  await loadConnections()
  showNotice(`已删除 ${deletedCount} 个连接${skippedCount > 0 ? `，${skippedCount} 个因下游依赖未删除。` : '。'}`, skippedCount > 0 ? 'warning' : 'success')
}

function goDetail(connection: DataConnection, tab: DetailTab = 'overview') {
  router.push(`/data-fusion/connections/${connection.id}${tab === 'overview' ? '' : `/${tab}`}`)
}

const connectionColumns = computed<DataTableColumns<DataConnection>>(() => [
  { type: 'selection' },
  {
    title: '连接名称',
    key: 'connectionName',
    minWidth: 210,
    fixed: 'left',
    render: (row) =>
      h(
        NButton,
        { text: true, type: 'primary', onClick: () => goDetail(row) },
        { default: () => row.connectionName },
      ),
  },
  {
    title: '连接器',
    key: 'connectorName',
    minWidth: 160,
    render: (row) =>
      h(NSpace, { vertical: true, size: 2 }, () => [
        h('span', row.connectorName),
        h(NTag, { size: 'small' }, { default: () => row.categoryName }),
      ]),
  },
  { title: '来源系统', key: 'sourceSystem', minWidth: 150 },
  {
    title: '状态',
    key: 'status',
    width: 130,
    render: (row) => h(NTag, { type: statusTagType(row.status), size: 'small' }, { default: () => statusText(row.status) }),
  },
  {
    title: '授权 / 测试 / 接入',
    key: 'quality',
    minWidth: 210,
    render: (row) =>
      h(NSpace, { size: 6 }, () => [
        h(NTag, { size: 'small', type: row.authStatus === 'AUTH_SUCCESS' ? 'success' : 'warning' }, { default: () => row.authStatus === 'AUTH_SUCCESS' ? '授权正常' : '需授权' }),
        h(NTag, { size: 'small', type: row.testStatus === 'SUCCESS' ? 'success' : row.testStatus === 'FAILED' ? 'error' : 'default' }, { default: () => row.testStatus === 'SUCCESS' ? '测试成功' : row.testStatus === 'FAILED' ? '测试失败' : '未测试' }),
        h(NTag, { size: 'small', type: row.ingestStatus === 'SUCCESS' ? 'success' : 'default' }, { default: () => row.ingestStatus === 'SUCCESS' ? '已接入' : '未接入' }),
      ]),
  },
  { title: '数据集', key: 'datasetCount', width: 90 },
  { title: '建模任务', key: 'modelingTaskCount', width: 110 },
  { title: '最近测试时间', key: 'recentTestTime', minWidth: 170, render: (row) => row.recentTestTime ?? '-' },
  { title: '最近接入时间', key: 'recentIngestTime', minWidth: 170, render: (row) => row.recentIngestTime ?? '-' },
  { title: '创建人', key: 'createdBy', width: 130 },
  { title: '更新时间', key: 'updatedAt', minWidth: 170 },
  {
    title: '操作',
    key: 'actions',
    minWidth: 310,
    fixed: 'right',
    render: (row) =>
      h(NSpace, { size: 8 }, () => [
        h(NButton, { text: true, type: 'primary', onClick: () => goDetail(row) }, { default: () => '详情' }),
        h(NButton, { text: true, onClick: () => router.push(`/data-fusion/connections/${row.id}/edit`) }, { default: () => '编辑' }),
        h(NButton, { text: true, disabled: !row.supportsTest, onClick: () => handleTestExisting(row) }, { default: () => '测试' }),
        h(NButton, { text: true, disabled: !row.supportsOneClickIngest, onClick: () => handleOneClickIngest(row) }, { default: () => '一键接入' }),
        h(NButton, { text: true, onClick: () => goDetail(row, 'assets') }, { default: () => '数据集/任务' }),
        h(NButton, { text: true, onClick: () => handleAuthorize(row) }, { default: () => '授权' }),
        h(NButton, { text: true, type: 'error', onClick: () => openDelete(row) }, { default: () => '删除' }),
      ]),
  },
])

const testRecordColumns: DataTableColumns<DataConnectionTestRecord> = [
  { title: '测试时间', key: 'testedAt', minWidth: 170 },
  { title: '测试人', key: 'testedBy', width: 130 },
  {
    title: '状态',
    key: 'status',
    width: 120,
    render: (row) => h(NTag, { type: row.status === 'SUCCESS' ? 'success' : 'error' }, { default: () => row.status === 'SUCCESS' ? '成功' : '失败' }),
  },
  { title: '耗时', key: 'durationMs', width: 100, render: (row) => `${row.durationMs}ms` },
  { title: '错误信息', key: 'errorMessage', minWidth: 220, render: (row) => row.errorMessage ?? '-' },
]

const ingestColumns: DataTableColumns<DataConnectionIngestionJob> = [
  { title: '任务 ID', key: 'id', minWidth: 160 },
  { title: '开始时间', key: 'startedAt', minWidth: 170 },
  { title: '完成时间', key: 'finishedAt', minWidth: 170 },
  {
    title: '状态',
    key: 'jobStatus',
    width: 140,
    render: (row) => h(NTag, { type: jobStatusTagType(row.jobStatus), size: 'small' }, { default: () => row.jobStatus }),
  },
  { title: '原始表', key: 'rawDatasetId', minWidth: 180, render: (row) => row.rawDatasetId ?? '-' },
  { title: '结构化表', key: 'structuredDatasetId', minWidth: 200, render: (row) => row.structuredDatasetId ?? '-' },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    render: () => h(NButton, { text: true, type: 'primary', onClick: () => { activeDetailTab.value = 'assets' } }, { default: () => '查看产物' }),
  },
]

const datasetColumns: DataTableColumns<DataConnectionDataset> = [
  { title: '数据集名称', key: 'datasetName', minWidth: 240 },
  { title: '类型', key: 'datasetType', width: 120 },
  { title: '存储', key: 'storageEngine', width: 130 },
  { title: '行数', key: 'rowCount', width: 130, render: (row) => row.rowCount.toLocaleString() },
  {
    title: '状态',
    key: 'status',
    width: 120,
    render: (row) => h(NTag, { type: datasetStatusTagType(row.status), size: 'small' }, { default: () => row.status }),
  },
  { title: '创建时间', key: 'createdAt', minWidth: 170 },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    render: () => h(NButton, { text: true, type: 'primary', onClick: () => { activeDetailTab.value = 'lineage' } }, { default: () => '查看血缘' }),
  },
]

const modelingColumns: DataTableColumns<DataConnectionModelingTask> = [
  { title: '任务名称', key: 'taskName', minWidth: 240 },
  { title: '类型', key: 'taskType', width: 150 },
  {
    title: '状态',
    key: 'status',
    width: 120,
    render: (row) => h(NTag, { type: modelingStatusTagType(row.status), size: 'small' }, { default: () => row.status }),
  },
  { title: '输出数据集', key: 'outputDatasetId', minWidth: 180, render: (row) => row.outputDatasetId ?? '-' },
  { title: '更新时间', key: 'updatedAt', minWidth: 170 },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    render: () => h(NButton, { text: true, type: 'primary', onClick: () => { activeDetailTab.value = 'runs' } }, { default: () => '查看运行' }),
  },
]

const logColumns: DataTableColumns<DataConnectionAuditLog> = [
  { title: '时间', key: 'createdAt', minWidth: 170 },
  { title: '操作', key: 'action', width: 150 },
  { title: '操作人', key: 'operator', width: 130 },
  { title: '说明', key: 'message', minWidth: 260 },
]

onMounted(async () => {
  await loadBase()
  await initByRoute()
})

watch(
  () => route.fullPath,
  async () => {
    await initByRoute()
  },
)
</script>

<template>
  <div class="data-connection-page">
    <n-alert :type="noticeType" closable class="notice">
      {{ notice }}
    </n-alert>

    <section v-if="currentMode === 'list'" class="page-section">
      <div class="page-heading">
        <div>
          <h1>数据连接</h1>
          <p>统一管理数据库、文件、API、广告平台、微信生态和公共数据接入。</p>
        </div>
        <n-space>
          <n-button secondary @click="loadConnections">刷新</n-button>
          <n-button type="primary" :disabled="permission?.canCreate === false" @click="router.push('/data-fusion/connections/new')">
            新建数据连接
          </n-button>
        </n-space>
      </div>

      <div class="stats-grid">
        <n-card v-for="item in stats" :key="item.label" class="stat-card">
          <div class="muted">{{ item.label }}</div>
          <strong :class="item.tone">{{ item.value }}</strong>
        </n-card>
      </div>

      <n-card class="filter-card">
        <div class="filter-grid">
          <n-input v-model:value="filters.keyword" placeholder="搜索连接名称、来源系统、标签或负责人" clearable @keyup.enter="handleSearch" />
          <n-select v-model:value="filters.connectorCategory" :options="connectorCategoryOptions" @update:value="handleSearch" />
          <n-select v-model:value="filters.connectorType" :options="connectorTypeOptions" @update:value="handleSearch" />
          <n-select v-model:value="filters.status" :options="statusOptions" @update:value="handleSearch" />
          <n-select v-model:value="filters.createdBy" :options="creatorOptions" @update:value="handleSearch" />
          <n-select v-model:value="filters.supportsOneClickIngest" :options="oneClickOptions" @update:value="handleSearch" />
          <n-date-picker
            :value="createdRange"
            type="daterange"
            clearable
            start-placeholder="创建开始日期"
            end-placeholder="创建结束日期"
            @update:value="handleCreatedRangeChange"
          />
          <n-date-picker
            :value="recentTestRange"
            type="daterange"
            clearable
            start-placeholder="测试开始日期"
            end-placeholder="测试结束日期"
            @update:value="handleRecentTestRangeChange"
          />
        </div>
      </n-card>

      <n-card>
        <div class="table-toolbar">
          <n-space>
            <n-button :disabled="selectedRows.length === 0" @click="handleBatchTest">批量测试</n-button>
            <n-button :disabled="selectedRows.length === 0" @click="handleBatchAuthorize">批量刷新授权</n-button>
            <n-button type="error" secondary :disabled="selectedRows.length === 0" @click="handleBatchDelete">批量删除</n-button>
          </n-space>
          <span class="muted">已选择 {{ selectedRows.length }} 个连接</span>
        </div>
        <n-data-table
          v-model:checked-row-keys="selectedRows"
          :columns="connectionColumns"
          :data="connections"
          :loading="loading"
          :row-key="(row: DataConnection) => row.id"
          :scroll-x="1900"
          :pagination="{ pageSize: 8 }"
        />
      </n-card>
    </section>

    <section v-else-if="currentMode === 'select'" class="page-section">
      <div class="page-heading">
        <div>
          <h1>选择连接器</h1>
          <p>选择数据来源类型后进入配置。未开放的连接器会显示原因。</p>
        </div>
        <n-button @click="router.push('/data-fusion/connections')">返回列表</n-button>
      </div>
      <n-card>
        <div class="filter-grid selector-filter">
          <n-input v-model:value="connectorKeyword" placeholder="搜索连接器名称、说明或标签" clearable />
          <n-select v-model:value="connectorCategoryFilter" :options="connectorCategoryOptions" />
          <n-select :value="connectorCategoryFilter" :options="selectedConnectorCategoryOptions" disabled />
        </div>
      </n-card>
      <div class="connector-grid">
        <n-card
          v-for="connector in filteredConnectors"
          :key="connector.connectorType"
          class="connector-card"
          :class="{ disabled: !connector.enabled }"
        >
          <div class="connector-title-row">
            <h3>{{ connector.connectorName }}</h3>
            <n-tag :type="connector.recommended ? 'success' : 'default'" size="small">
              {{ connector.categoryName }}
            </n-tag>
          </div>
          <p>{{ connector.description }}</p>
          <n-space size="small">
            <n-tag v-for="tag in connector.tags" :key="tag" size="small">{{ tag }}</n-tag>
          </n-space>
          <div class="connector-meta">
            <span>{{ connector.supportsTest ? '支持测试' : '无需测试' }}</span>
            <span>{{ connector.supportsPreview ? '字段预览' : '无预览' }}</span>
            <span>{{ connector.supportsOneClickIngest ? '一键接入' : '仅连接' }}</span>
          </div>
          <n-alert v-if="!connector.enabled" type="warning" class="connector-warning">
            {{ connector.disabledReason }}
          </n-alert>
          <n-button block type="primary" :disabled="!connector.enabled" @click="openCreate(connector.connectorType)">
            配置连接
          </n-button>
        </n-card>
      </div>
    </section>

    <section v-else-if="currentMode === 'create' || currentMode === 'edit'" class="page-section editor-layout">
      <div class="page-heading">
        <div>
          <h1>{{ currentMode === 'create' ? '配置数据连接' : '编辑数据连接' }}</h1>
          <p>{{ selectedConnector?.description }}</p>
        </div>
        <n-space>
          <n-button @click="router.back()">取消</n-button>
          <n-button secondary :loading="testing" :disabled="selectedConnector?.supportsTest === false" @click="handleTestConnection">
            测试连接
          </n-button>
          <n-button secondary :disabled="selectedConnector?.supportsPreview === false" @click="handlePreviewData">数据预览</n-button>
          <n-button type="primary" :loading="saving" @click="handleSaveConnection">保存连接</n-button>
        </n-space>
      </div>

      <div class="editor-grid">
        <n-card class="form-card">
          <n-form label-placement="left" label-width="118">
            <n-form-item label="连接器">
              <n-select
                v-model:value="form.connectorType"
                :options="connectorTypeOptions"
                :disabled="currentMode === 'edit'"
                @update:value="(value: string) => resetForm(value)"
              />
            </n-form-item>
            <n-form-item label="连接名称">
              <n-input v-model:value="form.connectionName" placeholder="请输入连接名称" />
            </n-form-item>
            <n-form-item label="来源系统">
              <n-input v-model:value="form.sourceSystem" placeholder="例如 crm、ad-platform、order-api" />
            </n-form-item>
            <n-form-item label="负责人">
              <n-input v-model:value="form.owner" />
            </n-form-item>
            <n-form-item label="标签">
              <n-select v-model:value="form.tags" multiple tag placeholder="输入标签后回车" />
            </n-form-item>
            <n-form-item label="可见范围">
              <n-select v-model:value="form.visibility" :options="visibilityOptions" />
            </n-form-item>
            <n-form-item label="描述">
              <n-input v-model:value="form.description" type="textarea" placeholder="说明连接用途、数据范围和负责人" />
            </n-form-item>
          </n-form>
        </n-card>

        <n-card class="side-card">
          <h3>连接能力</h3>
          <div class="capability-list">
            <span>{{ selectedConnector?.supportsTest ? '可测试连接' : '无需连接测试' }}</span>
            <span>{{ selectedConnector?.supportsPreview ? '支持字段预览' : '无字段预览' }}</span>
            <span>{{ selectedConnector?.supportsOneClickIngest ? '支持一键接入' : '不支持一键接入' }}</span>
            <span>{{ selectedConnector?.requiresAuth ? `需要 ${selectedConnector?.authType} 授权` : '无需额外授权' }}</span>
          </div>
          <n-button v-if="selectedConnector?.requiresAuth" block secondary @click="showAuthModal = true">
            授权 / 刷新授权
          </n-button>
        </n-card>
      </div>

      <n-card v-for="section in connectorSections" :key="section.key" class="config-section">
        <h3>{{ section.title }}</h3>
        <div class="dynamic-field-grid">
          <n-form-item v-for="field in section.fields" :key="field.key" :label="field.label">
            <n-input
              v-if="field.fieldType === 'input' || field.fieldType === 'password'"
              :value="textValue(field.key)"
              :type="field.fieldType === 'password' ? 'password' : 'text'"
              :placeholder="field.placeholder"
              @update:value="(value: string) => setConfigValue(field.key, value)"
            />
            <n-input
              v-else-if="field.fieldType === 'textarea'"
              :value="textValue(field.key)"
              type="textarea"
              :placeholder="field.placeholder"
              @update:value="(value: string) => setConfigValue(field.key, value)"
            />
            <n-input-number
              v-else-if="field.fieldType === 'number'"
              :value="numberValue(field.key)"
              :placeholder="field.placeholder"
              @update:value="(value: number | null) => setConfigValue(field.key, value)"
            />
            <n-select
              v-else-if="field.fieldType === 'select' || field.fieldType === 'radio'"
              :value="textValue(field.key)"
              :options="fieldOptions(field)"
              :placeholder="field.placeholder"
              @update:value="(value: string | number) => setConfigValue(field.key, value)"
            />
            <n-switch
              v-else-if="field.fieldType === 'switch'"
              :value="boolValue(field.key)"
              @update:value="(value: boolean) => setConfigValue(field.key, value)"
            />
            <n-select
              v-else-if="field.fieldType === 'tag'"
              :value="arrayValue(field.key)"
              multiple
              tag
              :placeholder="field.placeholder ?? '输入后回车'"
              @update:value="(value: string[]) => setConfigValue(field.key, value)"
            />
            <div v-else-if="field.fieldType === 'keyValue'" class="kv-editor">
              <div v-for="(item, index) in keyValueItems(field.key)" :key="`${field.key}_${index}`" class="kv-row">
                <n-input :value="item.key" placeholder="Key" @update:value="(value: string) => updateKeyValue(field.key, index, 'key', value)" />
                <n-input :value="item.value" placeholder="Value" @update:value="(value: string) => updateKeyValue(field.key, index, 'value', value)" />
                <n-button text type="error" @click="removeKeyValue(field.key, index)">删除</n-button>
              </div>
              <n-button secondary size="small" @click="addKeyValue(field.key)">添加参数</n-button>
            </div>
          </n-form-item>
        </div>
      </n-card>
    </section>

    <section v-else-if="currentMode === 'detail' && currentConnection" class="page-section">
      <div class="page-heading">
        <div>
          <h1>{{ currentConnection.connectionName }}</h1>
          <p>{{ currentConnection.connectorName }} · {{ currentConnection.sourceSystem }} · {{ currentConnection.owner }}</p>
        </div>
        <n-space>
          <n-button @click="router.push('/data-fusion/connections')">返回列表</n-button>
          <n-button @click="router.push(`/data-fusion/connections/${currentConnection.id}/edit`)">编辑</n-button>
          <n-button secondary :disabled="!currentConnection.supportsTest" @click="handleTestExisting(currentConnection)">
            测试
          </n-button>
          <n-button secondary :disabled="!selectedConnector?.requiresAuth && currentConnection.authStatus === 'AUTH_SUCCESS'" @click="handleAuthorize(currentConnection)">
            {{ currentConnection.authStatus === 'AUTH_SUCCESS' ? '刷新授权' : '授权' }}
          </n-button>
          <n-button type="primary" :loading="ingesting" :disabled="!currentConnection.supportsOneClickIngest" @click="handleOneClickIngest()">
            一键接入
          </n-button>
          <n-button type="error" secondary @click="openDelete(currentConnection)">删除</n-button>
        </n-space>
      </div>

      <div class="stats-grid">
        <n-card class="stat-card"><div class="muted">连接状态</div><strong>{{ statusText(currentConnection.status) }}</strong></n-card>
        <n-card class="stat-card"><div class="muted">数据集</div><strong>{{ currentConnection.datasetCount }}</strong></n-card>
        <n-card class="stat-card"><div class="muted">建模任务</div><strong>{{ currentConnection.modelingTaskCount }}</strong></n-card>
        <n-card class="stat-card"><div class="muted">最近测试</div><strong>{{ currentConnection.recentTestTime ?? '-' }}</strong></n-card>
        <n-card class="stat-card"><div class="muted">最近接入</div><strong>{{ currentConnection.recentIngestTime ?? '-' }}</strong></n-card>
      </div>

      <n-card>
        <n-tabs v-model:value="activeDetailTab" type="line" animated>
          <n-tab-pane name="overview" tab="连接概览">
            <div class="detail-grid">
              <div>
                <h3>基础信息</h3>
                <dl class="info-list">
                  <dt>连接器</dt><dd>{{ currentConnection.connectorName }}</dd>
                  <dt>来源系统</dt><dd>{{ currentConnection.sourceSystem }}</dd>
                  <dt>创建人</dt><dd>{{ currentConnection.createdBy }}</dd>
                  <dt>更新时间</dt><dd>{{ currentConnection.updatedAt }}</dd>
                  <dt>说明</dt><dd>{{ currentConnection.description }}</dd>
                </dl>
              </div>
              <div>
                <h3>连接配置</h3>
                <div class="config-preview">
                  <div v-for="(value, key) in currentConnection.config" :key="key">
                    <span>{{ key }}</span>
                    <strong>{{ Array.isArray(value) ? value.map((item) => typeof item === 'string' ? item : `${item.key}:${item.value}`).join('，') : value }}</strong>
                  </div>
                </div>
              </div>
            </div>
          </n-tab-pane>
          <n-tab-pane name="preview" tab="字段预览">
            <div class="tab-toolbar">
              <div>
                <h3>字段与样例数据</h3>
                <p class="muted">查看库、表、集合、文件对象的结构差异与样例数据。</p>
              </div>
              <n-button secondary :disabled="!currentConnection.supportsPreview" @click="handlePreviewData">刷新预览</n-button>
            </div>
            <n-empty v-if="!previewResult" description="暂无预览数据">
              <template #extra>
                <n-button secondary :disabled="!currentConnection.supportsPreview" @click="handlePreviewData">读取预览</n-button>
              </template>
            </n-empty>
            <div v-else>
              <n-alert :type="previewResult.success ? 'success' : 'error'" class="inline-alert">{{ previewResult.message }}</n-alert>
              <div v-if="previewResult.success" class="preview-panel">
                <div class="preview-summary-grid">
                  <div v-for="item in previewSummaryCards" :key="item.label" class="preview-summary-card">
                    <span>{{ item.label }}</span>
                    <strong :class="item.tone">{{ item.value }}</strong>
                  </div>
                </div>

                <div class="preview-object-toolbar">
                  <div>
                    <h3>预览对象</h3>
                    <p class="muted">
                      多库多表连接可切换对象；半结构化和非结构化对象会展示原始样本。
                    </p>
                  </div>
                  <n-select
                    v-model:value="selectedPreviewTableKey"
                    :options="previewTableOptions"
                    class="preview-object-select"
                  />
                </div>

                <div class="preview-object-meta">
                  <n-tag :type="structureTagType(selectedPreviewTable?.structureType)">
                    {{ structureTypeText(selectedPreviewTable?.structureType) }}
                  </n-tag>
                  <span>{{ selectedPreviewTable ? previewTableLabel(selectedPreviewTable) : '-' }}</span>
                  <span>字段 {{ selectedPreviewTable?.columns.length ?? 0 }}</span>
                  <span>行数 {{ (selectedPreviewTable?.rowEstimate ?? previewResult.rowEstimate).toLocaleString() }}</span>
                </div>

                <div v-if="selectedPreviewTable?.warnings?.length" class="preview-warnings">
                  <n-alert
                    v-for="warning in selectedPreviewTable.warnings"
                    :key="warning"
                    type="warning"
                    class="inline-alert"
                  >
                    {{ warning }}
                  </n-alert>
                </div>

                <div class="preview-layout">
                  <section>
                    <h3>字段结构</h3>
                    <n-data-table
                      :columns="previewTableColumns"
                      :data="selectedPreviewTable?.columns ?? []"
                      :pagination="false"
                      :scroll-x="620"
                    />
                  </section>
                  <section>
                    <h3>样例数据</h3>
                    <n-data-table
                      v-if="currentPreviewRows.length"
                      :columns="previewColumns"
                      :data="currentPreviewRows"
                      :scroll-x="1100"
                      :pagination="false"
                    />
                    <n-empty v-else description="该对象暂无结构化样例数据。" />
                    <div v-if="selectedPreviewTable?.rawSample || previewResult.rawResponse" class="raw-preview">
                      <h3>原始样本</h3>
                      <pre>{{ selectedPreviewTable?.rawSample ?? previewResult.rawResponse }}</pre>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </n-tab-pane>
          <n-tab-pane name="assets" tab="产物">
            <div class="tab-toolbar">
              <div>
                <h3>生成产物</h3>
                <p class="muted">一键接入后会生成原始数据集、结构化数据集和建模任务。</p>
              </div>
              <n-space>
                <n-button secondary @click="refreshDetail('assets')">刷新产物</n-button>
                <n-button type="primary" :loading="ingesting" :disabled="!currentConnection.supportsOneClickIngest" @click="handleOneClickIngest()">
                  运行一键接入
                </n-button>
              </n-space>
            </div>
            <h3>生成数据集</h3>
            <n-data-table :columns="datasetColumns" :data="datasets" :scroll-x="1080" :pagination="false" />
            <h3>建模任务</h3>
            <n-data-table :columns="modelingColumns" :data="modelingTasks" :scroll-x="980" :pagination="false" />
          </n-tab-pane>
          <n-tab-pane name="runs" tab="运行记录">
            <div class="tab-toolbar">
              <div>
                <h3>测试与接入记录</h3>
                <p class="muted">保留连接测试和接入任务的执行结果，便于排查问题。</p>
              </div>
              <n-space>
                <n-button secondary :loading="testing" :disabled="!currentConnection.supportsTest" @click="handleTestExisting(currentConnection)">
                  重新测试
                </n-button>
                <n-button type="primary" :loading="ingesting" :disabled="!currentConnection.supportsOneClickIngest" @click="handleOneClickIngest()">
                  运行接入
                </n-button>
              </n-space>
            </div>
            <h3>连接测试</h3>
            <n-data-table :columns="testRecordColumns" :data="testRecords" :scroll-x="880" :pagination="false" />
            <h3>接入任务</h3>
            <n-data-table :columns="ingestColumns" :data="ingestionJobs" :scroll-x="1120" :pagination="false" />
          </n-tab-pane>
          <n-tab-pane name="lineage" tab="血缘">
            <div class="tab-toolbar">
              <div>
                <h3>连接血缘</h3>
                <p class="muted">展示连接到原始数据集、建模任务、结构化数据集和下游使用对象的链路。</p>
              </div>
              <n-button secondary @click="refreshDetail('lineage')">刷新血缘</n-button>
            </div>
            <div class="lineage-canvas">
              <div v-for="node in lineageNodes" :key="node.id" class="lineage-node">
                <n-tag size="small" :type="lineageStatusTagType(node.status)">{{ node.type }}</n-tag>
                <strong>{{ node.label }}</strong>
              </div>
            </div>
            <n-data-table
              :columns="[
                { title: '上游', key: 'sourceLabel' },
                { title: '关系', key: 'relationName' },
                { title: '下游', key: 'targetLabel' },
              ]"
              :data="lineageEdgeRows"
              :pagination="false"
            />
          </n-tab-pane>
          <n-tab-pane name="logs" tab="审计日志">
            <div class="tab-toolbar">
              <div>
                <h3>审计日志</h3>
                <p class="muted">记录创建、编辑、测试、授权、接入和删除等关键操作。</p>
              </div>
              <n-button secondary @click="refreshDetail('logs')">刷新日志</n-button>
            </div>
            <n-data-table :columns="logColumns" :data="auditLogs" :scroll-x="760" :pagination="false" />
          </n-tab-pane>
        </n-tabs>
      </n-card>
    </section>

    <n-drawer v-model:show="showPreviewDrawer" width="720">
      <n-drawer-content title="字段与样例数据预览">
        <n-empty v-if="!previewResult" description="请先测试连接或打开已有连接详情。" />
        <div v-else>
          <n-alert :type="previewResult.success ? 'success' : 'error'" class="inline-alert">
            {{ previewResult.message }}
          </n-alert>
          <div v-if="previewResult.success" class="preview-panel">
            <div class="preview-summary-grid">
              <div v-for="item in previewSummaryCards" :key="item.label" class="preview-summary-card">
                <span>{{ item.label }}</span>
                <strong :class="item.tone">{{ item.value }}</strong>
              </div>
            </div>

            <div class="preview-object-toolbar">
              <div>
                <h3>预览对象</h3>
                <p class="muted">选择不同库、表、集合或文件对象查看字段差异。</p>
              </div>
              <n-select
                v-model:value="selectedPreviewTableKey"
                :options="previewTableOptions"
                class="preview-object-select"
              />
            </div>

            <div class="preview-object-meta">
              <n-tag :type="structureTagType(selectedPreviewTable?.structureType)">
                {{ structureTypeText(selectedPreviewTable?.structureType) }}
              </n-tag>
              <span>{{ selectedPreviewTable ? previewTableLabel(selectedPreviewTable) : '-' }}</span>
              <span>字段 {{ selectedPreviewTable?.columns.length ?? 0 }}</span>
              <span>行数 {{ (selectedPreviewTable?.rowEstimate ?? previewResult.rowEstimate).toLocaleString() }}</span>
            </div>

            <div v-if="selectedPreviewTable?.warnings?.length" class="preview-warnings">
              <n-alert
                v-for="warning in selectedPreviewTable.warnings"
                :key="warning"
                type="warning"
                class="inline-alert"
              >
                {{ warning }}
              </n-alert>
            </div>

            <h3>字段结构</h3>
            <n-data-table
              :columns="previewTableColumns"
              :data="selectedPreviewTable?.columns ?? []"
              :pagination="false"
              :scroll-x="620"
            />
            <h3>样例数据</h3>
            <n-data-table
              v-if="currentPreviewRows.length"
              :columns="previewColumns"
              :data="currentPreviewRows"
              :scroll-x="1100"
              :pagination="false"
            />
            <n-empty v-else description="该对象暂无结构化样例数据。" />
            <div v-if="selectedPreviewTable?.rawSample || previewResult.rawResponse" class="raw-preview">
              <h3>原始样本</h3>
              <pre>{{ selectedPreviewTable?.rawSample ?? previewResult.rawResponse }}</pre>
            </div>
          </div>
        </div>
      </n-drawer-content>
    </n-drawer>

    <n-modal v-model:show="showAuthModal" preset="card" title="授权数据连接" class="small-modal">
      <p>当前连接器需要授权后才能测试或一键接入。Demo 中会模拟 OAuth / AKSK 授权成功。</p>
      <n-alert type="info">授权成功后仅保存令牌摘要，敏感凭据不会明文展示。</n-alert>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showAuthModal = false">取消</n-button>
          <n-button type="primary" @click="handleAuthorize()">确认授权</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showDeleteModal" preset="card" title="删除数据连接确认" class="delete-modal">
      <n-alert :type="deleteImpact?.canDelete ? 'warning' : 'error'" class="inline-alert">
        {{ deleteImpact?.reason }}
      </n-alert>
      <div class="impact-grid">
        <span>数据集 {{ deleteImpact?.datasets ?? 0 }}</span>
        <span>建模任务 {{ deleteImpact?.modelingTasks ?? 0 }}</span>
        <span>标签 {{ deleteImpact?.tags ?? 0 }}</span>
        <span>分群 {{ deleteImpact?.segments ?? 0 }}</span>
        <span>看板 {{ deleteImpact?.dashboards ?? 0 }}</span>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showDeleteModal = false">取消</n-button>
          <n-button type="error" :disabled="deleteImpact?.canDelete === false" @click="confirmDelete">确认删除</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showBatchDeleteModal" preset="card" title="批量删除确认" class="delete-modal">
      <n-alert :type="batchDeleteSummary.blocked > 0 ? 'warning' : 'error'" class="inline-alert">
        将删除 {{ batchDeleteSummary.deletable }} 个连接，{{ batchDeleteSummary.blocked }} 个连接因下游依赖会被跳过。
      </n-alert>
      <div class="batch-impact-list">
        <div v-for="item in batchDeleteImpacts" :key="item.connection.id" class="batch-impact-row">
          <strong>{{ item.connection.connectionName }}</strong>
          <n-tag :type="item.impact.canDelete ? 'warning' : 'error'" size="small">
            {{ item.impact.canDelete ? '可删除' : '不可删除' }}
          </n-tag>
          <span>{{ item.impact.reason }}</span>
        </div>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showBatchDeleteModal = false">取消</n-button>
          <n-button type="error" :disabled="batchDeleteSummary.deletable === 0" @click="confirmBatchDelete">确认删除</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showPostSaveModal" preset="card" title="连接保存成功" class="small-modal">
      <n-alert type="success" class="inline-alert">
        {{ postSaveConnection?.connectionName }} 已保存。该连接器支持一键接入，可自动生成原始数据集、结构化数据集和建模任务。
      </n-alert>
      <p class="muted">如果暂不接入，也可以在连接详情页稍后执行。</p>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showPostSaveModal = false">稍后接入</n-button>
          <n-button type="primary" :loading="ingesting" @click="postSaveConnection && handleOneClickIngest(postSaveConnection)">
            立即一键接入
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<style scoped lang="scss">
.data-connection-page {
  min-height: 100%;
  background: #f3f6fa;
  padding: 24px;
  color: #111827;
}

.notice {
  margin-bottom: 18px;
}

.page-section {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.page-heading {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: flex-start;

  h1 {
    margin: 0;
    font-size: 30px;
  }

  p {
    margin: 10px 0 0;
    color: #667085;
    font-weight: 600;
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(140px, 1fr));
  gap: 12px;
}

.stat-card {
  background: #fff;

  strong {
    display: block;
    margin-top: 10px;
    font-size: 28px;
  }

  .success {
    color: #16a34a;
  }

  .error {
    color: #e11d48;
  }

  .warning {
    color: #d97706;
  }
}

.muted {
  color: #667085;
  font-weight: 600;
}

.filter-grid {
  display: grid;
  grid-template-columns: minmax(280px, 1.4fr) repeat(3, minmax(180px, 1fr));
  gap: 12px;
}

.selector-filter {
  grid-template-columns: minmax(360px, 1fr) 240px 240px;
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.connector-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(240px, 1fr));
  gap: 16px;
}

.connector-card {
  display: flex;
  flex-direction: column;
  gap: 14px;

  p {
    min-height: 54px;
    color: #667085;
    line-height: 1.6;
  }
}

.connector-card.disabled {
  opacity: 0.72;
}

.connector-title-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;

  h3 {
    margin: 0;
  }
}

.connector-meta {
  display: flex;
  gap: 10px;
  color: #667085;
  font-size: 13px;
}

.connector-warning {
  min-height: 72px;
}

.editor-grid {
  display: grid;
  grid-template-columns: minmax(560px, 1fr) 320px;
  gap: 16px;
}

.form-card,
.side-card,
.config-section {
  background: #fff;
}

.capability-list {
  display: grid;
  gap: 10px;
  margin: 16px 0;

  span {
    padding: 10px 12px;
    border-radius: 6px;
    background: #f8fafc;
    color: #475467;
    font-weight: 600;
  }
}

.dynamic-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(280px, 1fr));
  gap: 4px 24px;
}

.kv-editor {
  width: 100%;
}

.kv-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 8px;
  margin-bottom: 8px;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.tab-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 16px;

  h3 {
    margin: 0 0 6px;
  }

  p {
    margin: 0;
  }
}

.info-list {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 12px;

  dt {
    color: #667085;
    font-weight: 700;
  }

  dd {
    margin: 0;
  }
}

.config-preview {
  display: grid;
  gap: 10px;

  div {
    display: grid;
    grid-template-columns: 150px 1fr;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 6px;
    background: #f8fafc;
  }

  span {
    color: #667085;
    font-weight: 700;
  }
}

.inline-alert {
  margin-bottom: 16px;
}

.preview-panel {
  display: grid;
  gap: 16px;
}

.preview-summary-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(120px, 1fr));
  gap: 10px;
}

.preview-summary-card {
  padding: 12px;
  border-radius: 6px;
  background: #f8fafc;

  span {
    display: block;
    color: #667085;
    font-weight: 700;
    font-size: 13px;
  }

  strong {
    display: block;
    margin-top: 8px;
    font-size: 20px;
  }

  .success {
    color: #16a34a;
  }

  .warning {
    color: #d97706;
  }

  .error {
    color: #e11d48;
  }
}

.preview-object-toolbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;

  h3 {
    margin-bottom: 6px;
  }

  p {
    margin: 0;
  }
}

.preview-object-select {
  width: min(460px, 50%);
}

.preview-object-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  color: #667085;
  font-weight: 700;
}

.preview-warnings {
  display: grid;
  gap: 8px;
}

.preview-layout {
  display: grid;
  grid-template-columns: minmax(360px, 0.9fr) minmax(520px, 1.4fr);
  gap: 18px;
  align-items: start;
}

.raw-preview {
  margin-top: 16px;

  pre {
    max-height: 260px;
    overflow: auto;
    padding: 12px;
    border-radius: 6px;
    background: #111827;
    color: #e5e7eb;
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.6;
  }
}

:deep(.preview-cell) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
}

:deep(.preview-cell.is-null) {
  color: #98a2b3;
}

.lineage-canvas {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 12px 0 18px;
}

.lineage-node {
  min-width: 190px;
  border: 1px solid #d9e2ec;
  border-radius: 8px;
  padding: 14px;
  background: #f8fafc;
  display: grid;
  gap: 10px;
}

.impact-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  margin-top: 14px;

  span {
    padding: 12px;
    border-radius: 6px;
    background: #f8fafc;
    text-align: center;
    font-weight: 700;
  }
}

.batch-impact-list {
  display: grid;
  gap: 10px;
  max-height: 320px;
  overflow: auto;
}

.batch-impact-row {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) auto minmax(220px, 1.4fr);
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #f8fafc;
}

:deep(.small-modal) {
  width: 520px;
}

:deep(.delete-modal) {
  width: 620px;
}

@media (max-width: 1280px) {
  .stats-grid,
  .connector-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .filter-grid {
    grid-template-columns: repeat(2, minmax(220px, 1fr));
  }

  .editor-grid,
  .detail-grid,
  .preview-layout {
    grid-template-columns: 1fr;
  }

  .preview-summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .preview-object-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .preview-object-select {
    width: 100%;
  }
}
</style>
