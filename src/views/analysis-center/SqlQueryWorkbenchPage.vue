<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import {
  NAlert,
  NBadge,
  NButton,
  NButtonGroup,
  NDatePicker,
  NDropdown,
  NEmpty,
  NForm,
  NFormItem,
  NGi,
  NGrid,
  NIcon,
  NInput,
  NModal,
  NPagination,
  NPopover,
  NRadioButton,
  NRadioGroup,
  NSelect,
  NSpace,
  NSwitch,
  NTabPane,
  NTabs,
  NTag,
  NTooltip,
} from 'naive-ui'
import type { SelectOption } from 'naive-ui'
import {
  AddOutline,
  BookmarkOutline,
  ChevronForwardOutline,
  CloudDownloadOutline,
  CodeSlashOutline,
  FolderOpenOutline,
  PlayOutline,
  RefreshOutline,
  SaveOutline,
  SearchOutline,
  SettingsOutline,
  StopCircleOutline,
} from '@vicons/ionicons5'
import { sqlQueryService, defaultVariableConfig, extractSqlVariables } from '@/services/sqlQueryService'
import type {
  SqlDataSourceType,
  SqlEditorTabState,
  SqlFolder,
  SqlMetadataTable,
  SqlParseResult,
  SqlQueryHistory,
  SqlQueryJob,
  SqlQueryLog,
  SqlQueryPermissionState,
  SqlResultColumn,
  SqlResultPage,
  SqlTableColumn,
  SqlTableInfo,
  SqlTablePartition,
  SqlVariableConfig,
  SqlVariableType,
  SqlWorkbook,
} from '@/types/sqlQuery'

type FeedbackType = 'success' | 'warning' | 'error' | 'info'
type LeftPanel = 'workbooks' | 'history' | 'metadata'
type ResultPanel = 'history' | 'result' | 'logs'

interface TableDetailState {
  loading: boolean
  columns: SqlTableColumn[]
  preview?: SqlResultPage
  partitions: SqlTablePartition[]
  info?: SqlTableInfo
  error?: string
}

interface SearchDraft {
  column: string
  value: string
  mode: 'contains' | 'equals'
}

const PROJECT_ID = 'project_001'
const draftStorageKey = 'sql_query_opened_tabs_v1'
const toolbarStorageKey = 'sql_query_toolbar_positions_v1'
const sourceOptions: SelectOption[] = sqlQueryService.supportedSourceTypes.map((type) => ({ label: type, value: type }))
const resourceOptions: SelectOption[] = [
  { label: '默认执行资源', value: 'resource_default' },
  { label: '高优先级队列', value: 'resource_high' },
  { label: '低峰批量队列', value: 'resource_batch' },
]
const pageSizeOptions: SelectOption[] = [10, 20, 50, 100, 500].map((value) => ({ label: `${value} 行 / 页`, value }))
const variableTypeOptions: Array<{ label: string, value: SqlVariableType }> = [
  { label: 'Text', value: 'text' },
  { label: 'Dropdown List', value: 'dropdown' },
  { label: 'Date', value: 'date' },
  { label: 'Date and Time', value: 'datetime_minute' },
  { label: 'Date and Time with seconds', value: 'datetime_second' },
]
const dateFormatOptions: Record<SqlVariableType, SelectOption[]> = {
  text: [],
  dropdown: [],
  date: [
    { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' },
    { label: 'YYYY/MM/DD', value: 'YYYY/MM/DD' },
    { label: 'YYYYMMDD', value: 'YYYYMMDD' },
  ],
  datetime_minute: [
    { label: 'YYYY-MM-DD HH:mm', value: 'YYYY-MM-DD HH:mm' },
    { label: 'YYYY/MM/DD HH:mm', value: 'YYYY/MM/DD HH:mm' },
  ],
  datetime_second: [
    { label: 'YYYY-MM-DD HH:mm:ss', value: 'YYYY-MM-DD HH:mm:ss' },
    { label: 'YYYY/MM/DD HH:mm:ss', value: 'YYYY/MM/DD HH:mm:ss' },
  ],
}
const functionSuggestions = [
  { label: 'COUNT', insertText: 'COUNT(${column})', description: '聚合计数函数' },
  { label: 'SUM', insertText: 'SUM(${column})', description: '求和函数' },
  { label: 'AVG', insertText: 'AVG(${column})', description: '平均值函数' },
  { label: 'DATE_FORMAT', insertText: "DATE_FORMAT(${date_column}, '%Y-%m-%d')", description: '日期格式化' },
  { label: 'COALESCE', insertText: 'COALESCE(${column}, 0)', description: '空值兜底' },
]

const router = useRouter()
const loading = ref(true)
const permissions = ref<SqlQueryPermissionState | null>(null)
const forbidden = ref(false)
const feedback = reactive<{ type: FeedbackType, message: string }>({
  type: 'info',
  message: '正在加载 SQL 查询工作台。',
})
const folders = ref<SqlFolder[]>([])
const workbooks = ref<SqlWorkbook[]>([])
const globalHistories = ref<SqlQueryHistory[]>([])
const workbookHistories = ref<SqlQueryHistory[]>([])
const activeLeftPanel = ref<LeftPanel>('workbooks')
const resultPanel = ref<ResultPanel>('result')
const treeKeyword = ref('')
const selectedFolderId = ref('root')
const openedTabs = ref<SqlEditorTabState[]>([])
const activeTabId = ref('')
const editorRef = ref<HTMLTextAreaElement | null>(null)
const connectionOptions = ref<SelectOption[]>([])
const databaseOptions = ref<SelectOption[]>([])
const metadataConnections = ref<SelectOption[]>([])
const metadataDatabases = ref<SelectOption[]>([])
const metadataTables = ref<SqlMetadataTable[]>([])
const metadataKeyword = ref('')
const metadataType = ref<SqlDataSourceType>('MYSQL')
const metadataConnectionId = ref('conn_mysql_sales')
const metadataDatabase = ref('sales')
const tableDetails = ref<Record<string, TableDetailState>>({})
const currentJob = ref<SqlQueryJob | null>(null)
const currentLogs = ref<SqlQueryLog[]>([])
const resultPage = ref<SqlResultPage | null>(null)
const resultQuery = reactive({
  page: 1,
  pageSize: 100,
  sortColumn: undefined as string | undefined,
  sortOrder: undefined as 'asc' | 'desc' | undefined,
  filterColumn: undefined as string | undefined,
  filterValue: '',
  filterMode: 'contains' as 'contains' | 'equals',
})
const folderModalVisible = ref(false)
const folderModalMode = ref<'create' | 'rename'>('create')
const folderModalName = ref('')
const folderModalTargetId = ref<string | null>('root')
const saveModalVisible = ref(false)
const saveDraft = reactive({
  name: '',
  folderId: 'root',
  description: '',
})
const moveModalVisible = ref(false)
const movingWorkbook = ref<SqlWorkbook | null>(null)
const moveFolderId = ref('root')
const variableModalVisible = ref(false)
const editingVariableName = ref('')
const variableDraft = reactive<SqlVariableConfig>(defaultVariableConfig('变量'))
const shortcutModalVisible = ref(false)
const findPanelVisible = ref(false)
const findText = ref('')
const replaceText = ref('')
const currentFindIndex = ref(0)
const searchModalVisible = ref(false)
const searchDraft = reactive<SearchDraft>({ column: '', value: '', mode: 'contains' })
const showSuggestions = ref(false)
const suggestionKeyword = ref('')
const toolbarPosition = reactive({ x: 12, y: 12 })
let pollTimer: number | undefined
let autosaveTimer: number | undefined
let tableSearchTimer: number | undefined
let draggingToolbar = false
let dragOffsetX = 0
let dragOffsetY = 0

const activeTab = computed(() => openedTabs.value.find((tab) => tab.tabId === activeTabId.value))
const hasDirtyTabs = computed(() => openedTabs.value.some((tab) => tab.dirty))
const folderOptions = computed<SelectOption[]>(() =>
  folders.value.map((folder) => ({
    label: `${'  '.repeat(getFolderDepth(folder.id))}${folder.name}`,
    value: folder.id,
    disabled: folder.id !== 'root' && Boolean(folder.deletedAt),
  })),
)
const activeWorkbook = computed(() => {
  const tab = activeTab.value
  if (!tab?.workbookId) return null
  return workbooks.value.find((workbook) => workbook.id === tab.workbookId) ?? null
})
const activeWorkbookDeleted = computed(() => Boolean(activeTab.value?.workbookId && !activeWorkbook.value))
const visibleDownload = computed(() => permissions.value?.canDownload && currentJob.value)
const canDownload = computed(() => Boolean(currentJob.value?.status === 'success' && !currentJob.value.resultExpired && permissions.value?.canDownload))
const canCreateChart = computed(() =>
  Boolean(currentJob.value?.status === 'success' && !currentJob.value.resultExpired && permissions.value?.canCreateVisualChart && resultPage.value?.columns.length),
)
const statusSummary = computed(() => {
  const job = currentJob.value
  if (!job) return '暂无执行任务'
  const statusMap: Record<string, string> = {
    created: '已创建',
    parsing: '解析中',
    waiting: '等待资源',
    running: '运行中',
    success: '查询成功',
    failed: '查询失败',
    cancelled: '已停止',
    timeout: '已超时',
  }
  return `${statusMap[job.status] ?? job.status}${job.durationMs ? ` · ${(job.durationMs / 1000).toFixed(1)} 秒` : ''}`
})
const filteredSuggestions = computed(() => {
  const keyword = suggestionKeyword.value.toUpperCase()
  return functionSuggestions
    .filter((item) => !keyword || item.label.startsWith(keyword))
    .sort((a, b) => a.label.localeCompare(b.label))
    .slice(0, 6)
})
const findMatches = computed(() => {
  const tab = activeTab.value
  const keyword = findText.value
  if (!tab || !keyword) return []
  const matches: Array<{ start: number, end: number }> = []
  const source = tab.sqlContent.toLowerCase()
  const target = keyword.toLowerCase()
  let index = source.indexOf(target)
  while (index >= 0) {
    matches.push({ start: index, end: index + keyword.length })
    index = source.indexOf(target, index + Math.max(1, keyword.length))
  }
  return matches
})
const visibleFolderIds = computed(() => {
  const keyword = treeKeyword.value.trim().toLowerCase()
  const ids = new Set<string>()
  const addAncestors = (folderId: string | null | undefined) => {
    let current = folderId ? folders.value.find((folder) => folder.id === folderId) : folders.value.find((folder) => folder.id === 'root')
    while (current) {
      ids.add(current.id)
      current = current.parentId ? folders.value.find((folder) => folder.id === current?.parentId) : undefined
    }
  }
  if (!keyword) {
    folders.value.forEach((folder) => ids.add(folder.id))
    return ids
  }
  folders.value.forEach((folder) => {
    if (folder.name.toLowerCase().includes(keyword)) {
      addAncestors(folder.id)
    }
  })
  workbooks.value.forEach((workbook) => {
    if (workbook.name.toLowerCase().includes(keyword)) {
      addAncestors(workbook.folderId)
    }
  })
  return ids
})
const visibleFolders = computed(() =>
  folders.value
    .filter((folder) => visibleFolderIds.value.has(folder.id))
    .sort((a, b) => getFolderDepth(a.id) - getFolderDepth(b.id) || a.sortIndex - b.sortIndex),
)

function setFeedback(type: FeedbackType, message: string): void {
  feedback.type = type
  feedback.message = message
}

async function copyText(text: string, successMessage = 'SQL 已复制'): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    setFeedback('success', successMessage)
  } catch {
    window.prompt('复制失败，请手动复制以下内容', text)
  }
}

function getFolderDepth(folderId: string): number {
  let depth = 0
  let folder = folders.value.find((item) => item.id === folderId)
  while (folder?.parentId) {
    depth += 1
    folder = folders.value.find((item) => item.id === folder?.parentId)
  }
  return Math.max(0, depth - 1)
}

function workbooksForFolder(folderId: string): SqlWorkbook[] {
  const keyword = treeKeyword.value.trim().toLowerCase()
  return workbooks.value.filter((workbook) => {
    const inFolder = (workbook.folderId ?? 'root') === folderId
    const matched = !keyword || workbook.name.toLowerCase().includes(keyword)
    return inFolder && matched
  })
}

function readSavedToolbarPosition(tab: SqlEditorTabState): void {
  try {
    const stored = JSON.parse(window.localStorage.getItem(toolbarStorageKey) ?? '{}') as Record<string, { x: number, y: number }>
    const key = tab.workbookId ?? tab.temporaryQueryId ?? tab.tabId
    const value = stored[key]
    toolbarPosition.x = value?.x ?? 12
    toolbarPosition.y = value?.y ?? 12
  } catch {
    toolbarPosition.x = 12
    toolbarPosition.y = 12
  }
}

function saveToolbarPosition(): void {
  const tab = activeTab.value
  if (!tab) return
  const key = tab.workbookId ?? tab.temporaryQueryId ?? tab.tabId
  const stored = JSON.parse(window.localStorage.getItem(toolbarStorageKey) ?? '{}') as Record<string, { x: number, y: number }>
  stored[key] = { x: toolbarPosition.x, y: toolbarPosition.y }
  window.localStorage.setItem(toolbarStorageKey, JSON.stringify(stored))
}

function workbookToTab(workbook: SqlWorkbook): SqlEditorTabState {
  const variableValues = Object.fromEntries(workbook.variableConfigs.map((config) => [config.name, config.defaultValue ?? '']))
  return {
    tabId: `tab_${workbook.id}`,
    workbookId: workbook.id,
    title: workbook.name,
    sqlContent: workbook.sqlContent,
    dataSourceType: workbook.dataSourceType,
    connectionId: workbook.connectionId,
    databaseName: workbook.databaseName,
    resourceId: workbook.resourceId,
    variableConfigs: workbook.variableConfigs,
    variableValues,
    dirty: false,
    saving: false,
    parsing: false,
    running: false,
    cursorLine: 1,
    cursorColumn: 1,
  }
}

function createTemporaryTab(): SqlEditorTabState {
  const now = new Date()
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
  return {
    tabId: `tab_tmp_${Date.now()}`,
    temporaryQueryId: `tmp_${Date.now()}`,
    title: `临时查询-${stamp}`,
    sqlContent: '',
    dataSourceType: 'MYSQL',
    connectionId: 'conn_mysql_sales',
    databaseName: 'sales',
    variableConfigs: [],
    variableValues: {},
    dirty: false,
    saving: false,
    parsing: false,
    running: false,
    cursorLine: 1,
    cursorColumn: 1,
  }
}

function syncVariablesFromSql(tab: SqlEditorTabState): void {
  const names = extractSqlVariables(tab.sqlContent)
  const nextConfigs = names.map((name) => {
    const old = tab.variableConfigs.find((config) => config.name === name)
    if (old) return old
    const config = defaultVariableConfig(name)
    tab.variableValues[name] = config.defaultValue ?? ''
    return config
  })
  Object.keys(tab.variableValues).forEach((name) => {
    if (!names.includes(name)) {
      delete tab.variableValues[name]
    }
  })
  tab.variableConfigs = nextConfigs
}

async function refreshFoldersAndWorkbooks(): Promise<void> {
  folders.value = await sqlQueryService.listFolders()
  workbooks.value = await sqlQueryService.listWorkbooks()
}

async function refreshHistories(): Promise<void> {
  globalHistories.value = await sqlQueryService.listHistories()
  if (activeTab.value?.workbookId) {
    workbookHistories.value = await sqlQueryService.listHistories(activeTab.value.workbookId)
  } else {
    workbookHistories.value = []
  }
}

async function loadConnectionOptions(tab: SqlEditorTabState): Promise<void> {
  if (!tab.dataSourceType) {
    connectionOptions.value = []
    databaseOptions.value = []
    return
  }
  const connections = await sqlQueryService.getConnections(tab.dataSourceType)
  connectionOptions.value = connections.map((connection) => ({ label: connection.name, value: connection.id }))
  if (tab.connectionId) {
    const databases = await sqlQueryService.getDatabases(tab.connectionId)
    databaseOptions.value = databases.map((database) => ({ label: database, value: database }))
  } else {
    databaseOptions.value = []
  }
}

async function loadMetadataControls(): Promise<void> {
  const connections = await sqlQueryService.getConnections(metadataType.value)
  metadataConnections.value = connections.map((connection) => ({ label: connection.name, value: connection.id }))
  if (!connections.some((connection) => connection.id === metadataConnectionId.value)) {
    metadataConnectionId.value = connections[0]?.id ?? ''
  }
  if (metadataConnectionId.value) {
    const databases = await sqlQueryService.getDatabases(metadataConnectionId.value)
    metadataDatabases.value = databases.map((database) => ({ label: database, value: database }))
    if (!databases.includes(metadataDatabase.value)) {
      metadataDatabase.value = databases[0] ?? ''
    }
  } else {
    metadataDatabases.value = []
    metadataDatabase.value = ''
  }
  await loadMetadataTables()
}

async function loadMetadataTables(): Promise<void> {
  if (!metadataConnectionId.value || !metadataDatabase.value) {
    metadataTables.value = []
    return
  }
  const result = await sqlQueryService.getTables({
    connectionId: metadataConnectionId.value,
    databaseName: metadataDatabase.value,
    keyword: metadataKeyword.value,
  })
  metadataTables.value = result.items
}

function scheduleTableSearch(): void {
  window.clearTimeout(tableSearchTimer)
  tableSearchTimer = window.setTimeout(() => {
    void loadMetadataTables()
  }, 300)
}

async function loadTableDetail(table: SqlMetadataTable): Promise<void> {
  if (!table.hasPermission || tableDetails.value[table.name]?.columns.length) return
  tableDetails.value[table.name] = { loading: true, columns: [], partitions: [] }
  try {
    const [columns, preview, partitions, info] = await Promise.all([
      sqlQueryService.getTableColumns(table.name),
      sqlQueryService.getTablePreview(table.name),
      sqlQueryService.getTablePartitions(table.name),
      sqlQueryService.getTableInfo({
        tableName: table.name,
        databaseName: metadataDatabase.value,
        connectionId: metadataConnectionId.value,
        tableType: table.type,
        comment: table.comment,
      }),
    ])
    tableDetails.value[table.name] = { loading: false, columns, preview, partitions, info }
  } catch (error) {
    tableDetails.value[table.name] = {
      loading: false,
      columns: [],
      partitions: [],
      error: error instanceof Error ? error.message : '表信息加载失败',
    }
  }
}

async function initialize(): Promise<void> {
  loading.value = true
  try {
    const [featureSwitch, permission] = await Promise.all([sqlQueryService.getFeatureSwitch(), sqlQueryService.getPermissions()])
    permissions.value = permission
    forbidden.value = !featureSwitch.enabled || !featureSwitch.allowedProjectIds?.includes(PROJECT_ID) || !permission.canView
    if (forbidden.value) {
      setFeedback('error', '当前项目未开通 SQL 查询模块')
      return
    }
    await refreshFoldersAndWorkbooks()
    await loadMetadataControls()
    const restored = restoreDraftTabs()
    if (!restored) {
      const firstWorkbook = workbooks.value[0]
      openedTabs.value = firstWorkbook ? [workbookToTab(firstWorkbook)] : [createTemporaryTab()]
      activeTabId.value = openedTabs.value[0]?.tabId ?? ''
    }
    const tab = activeTab.value
    if (tab) {
      syncVariablesFromSql(tab)
      readSavedToolbarPosition(tab)
      await loadConnectionOptions(tab)
    }
    await refreshHistories()
    setFeedback('success', 'SQL 查询工作台已就绪。')
  } catch (error) {
    setFeedback('error', error instanceof Error ? error.message : 'SQL 查询工作台加载失败')
  } finally {
    loading.value = false
  }
}

function restoreDraftTabs(): boolean {
  try {
    const raw = window.localStorage.getItem(draftStorageKey)
    if (!raw) return false
    const tabs = JSON.parse(raw) as SqlEditorTabState[]
    if (!Array.isArray(tabs) || !tabs.length) return false
    openedTabs.value = tabs
    activeTabId.value = tabs[0]?.tabId ?? ''
    return true
  } catch {
    return false
  }
}

function autosaveDraftTabs(): void {
  window.localStorage.setItem(draftStorageKey, JSON.stringify(openedTabs.value))
}

function openFolderModal(mode: 'create' | 'rename', folder?: SqlFolder): void {
  folderModalMode.value = mode
  folderModalTargetId.value = folder?.id ?? selectedFolderId.value ?? 'root'
  folderModalName.value = mode === 'rename' ? (folder?.name ?? '') : ''
  folderModalVisible.value = true
}

async function submitFolderModal(): Promise<void> {
  try {
    if (folderModalMode.value === 'create') {
      const folder = await sqlQueryService.createFolder(folderModalTargetId.value, folderModalName.value)
      selectedFolderId.value = folder.id
      setFeedback('success', '文件夹创建成功')
    } else if (folderModalTargetId.value) {
      await sqlQueryService.renameFolder(folderModalTargetId.value, folderModalName.value)
      setFeedback('success', '文件夹重命名成功')
    }
    folderModalVisible.value = false
    await refreshFoldersAndWorkbooks()
  } catch (error) {
    setFeedback('error', error instanceof Error ? error.message : '文件夹保存失败')
  }
}

async function deleteFolder(folder: SqlFolder): Promise<void> {
  const hasChildren = folders.value.some((item) => item.parentId === folder.id) || workbooks.value.some((workbook) => workbook.folderId === folder.id)
  const message = hasChildren
    ? '该文件夹下包含查询文件或子文件夹，删除后其中内容将一并移除。确认删除？'
    : '确认删除该文件夹？'
  if (!window.confirm(message)) return
  try {
    await sqlQueryService.deleteFolder(folder.id)
    setFeedback('success', '文件夹已删除，内部查询文件同步不可见')
    await refreshFoldersAndWorkbooks()
  } catch (error) {
    setFeedback('error', error instanceof Error ? error.message : '删除失败')
  }
}

function createNewQuery(folderId = selectedFolderId.value || 'root'): void {
  const tab = createTemporaryTab()
  openedTabs.value.push(tab)
  activeTabId.value = tab.tabId
  selectedFolderId.value = folderId
  void loadConnectionOptions(tab)
  setFeedback('info', '已创建临时查询，可直接编辑 SQL。')
}

async function openWorkbook(workbook: SqlWorkbook): Promise<void> {
  const dirtyTab = activeTab.value
  if (dirtyTab?.dirty) {
    const saveFirst = window.confirm('当前查询尚未保存，切换后未保存内容可能丢失。是否保存？')
    if (saveFirst) {
      await saveActiveTab()
    }
  }
  const existing = openedTabs.value.find((tab) => tab.workbookId === workbook.id)
  if (existing) {
    activeTabId.value = existing.tabId
  } else {
    const tab = workbookToTab(await sqlQueryService.getWorkbook(workbook.id))
    openedTabs.value.push(tab)
    activeTabId.value = tab.tabId
  }
  if (activeTab.value) {
    syncVariablesFromSql(activeTab.value)
    readSavedToolbarPosition(activeTab.value)
    await loadConnectionOptions(activeTab.value)
    await refreshHistories()
    focusEditorEnd()
  }
}

function closeTab(tabId: string): void {
  const tab = openedTabs.value.find((item) => item.tabId === tabId)
  if (tab?.dirty && !window.confirm('当前 SQL 尚未保存，关闭后未保存内容可能丢失。确认关闭？')) {
    return
  }
  openedTabs.value = openedTabs.value.filter((item) => item.tabId !== tabId)
  if (activeTabId.value === tabId) {
    activeTabId.value = openedTabs.value[0]?.tabId ?? ''
  }
  if (!openedTabs.value.length) {
    createNewQuery()
  }
}

async function saveActiveTab(): Promise<void> {
  const tab = activeTab.value
  if (!tab || !permissions.value) return
  if (activeWorkbookDeleted.value) {
    setFeedback('warning', '该查询文件已被删除，禁止保存和运行。')
    return
  }
  if (!permissions.value.canCreateWorkbook && !permissions.value.canEditWorkbook) {
    setFeedback('warning', '当前用户无保存权限')
    return
  }
  if (!tab.workbookId) {
    saveDraft.name = tab.title.startsWith('临时查询') ? '' : tab.title
    saveDraft.folderId = selectedFolderId.value || 'root'
    saveDraft.description = ''
    saveModalVisible.value = true
    return
  }
  tab.saving = true
  try {
    const workbook = await sqlQueryService.updateWorkbook(tab.workbookId, {
      sqlContent: tab.sqlContent,
      dataSourceType: tab.dataSourceType,
      connectionId: tab.connectionId,
      databaseName: tab.databaseName,
      resourceId: tab.resourceId,
      variableConfigs: tab.variableConfigs,
    })
    tab.title = workbook.name
    tab.dirty = false
    setFeedback('success', '查询文件已保存')
    await refreshFoldersAndWorkbooks()
  } catch (error) {
    setFeedback('error', error instanceof Error ? error.message : '保存失败')
  } finally {
    tab.saving = false
  }
}

async function submitSaveModal(): Promise<void> {
  const tab = activeTab.value
  if (!tab) return
  tab.saving = true
  try {
    const workbook = await sqlQueryService.createWorkbook({
      projectId: PROJECT_ID,
      folderId: saveDraft.folderId,
      name: saveDraft.name,
      description: saveDraft.description,
      sqlContent: tab.sqlContent,
      dataSourceType: tab.dataSourceType,
      connectionId: tab.connectionId,
      databaseName: tab.databaseName,
      resourceId: tab.resourceId,
      variableConfigs: tab.variableConfigs,
    })
    tab.workbookId = workbook.id
    tab.title = workbook.name
    tab.dirty = false
    saveModalVisible.value = false
    window.localStorage.removeItem(draftStorageKey)
    await refreshFoldersAndWorkbooks()
    await refreshHistories()
    setFeedback('success', '临时查询已保存为工作簿')
  } catch (error) {
    setFeedback('error', error instanceof Error ? error.message : '保存查询失败')
  } finally {
    tab.saving = false
  }
}

async function renameWorkbook(workbook: SqlWorkbook): Promise<void> {
  const name = window.prompt('请输入新的查询文件名称', workbook.name)
  if (!name) return
  try {
    const updated = await sqlQueryService.updateWorkbook(workbook.id, { name })
    const tab = openedTabs.value.find((item) => item.workbookId === workbook.id)
    if (tab) tab.title = updated.name
    await refreshFoldersAndWorkbooks()
    setFeedback('success', '查询文件已重命名')
  } catch (error) {
    setFeedback('error', error instanceof Error ? error.message : '重命名失败')
  }
}

async function copyWorkbook(workbook: SqlWorkbook): Promise<void> {
  try {
    const copied = await sqlQueryService.copyWorkbook(workbook.id)
    await refreshFoldersAndWorkbooks()
    setFeedback('success', `已复制为 ${copied.name}`)
  } catch (error) {
    setFeedback('error', error instanceof Error ? error.message : '复制失败')
  }
}

function openMoveModal(workbook: SqlWorkbook): void {
  movingWorkbook.value = workbook
  moveFolderId.value = workbook.folderId ?? 'root'
  moveModalVisible.value = true
}

async function submitMoveWorkbook(): Promise<void> {
  if (!movingWorkbook.value) return
  try {
    await sqlQueryService.moveWorkbook(movingWorkbook.value.id, moveFolderId.value)
    moveModalVisible.value = false
    await refreshFoldersAndWorkbooks()
    setFeedback('success', '查询文件已移动')
  } catch (error) {
    setFeedback('error', error instanceof Error ? error.message : '移动失败')
  }
}

async function deleteWorkbook(workbook: SqlWorkbook): Promise<void> {
  if (!window.confirm('确认删除该查询文件？')) return
  try {
    await sqlQueryService.deleteWorkbook(workbook.id)
    openedTabs.value = openedTabs.value.filter((tab) => tab.workbookId !== workbook.id)
    if (!openedTabs.value.length) createNewQuery()
    await refreshFoldersAndWorkbooks()
    setFeedback('success', '查询文件已删除')
  } catch (error) {
    setFeedback('error', error instanceof Error ? error.message : '删除失败')
  }
}

function handleSqlInput(event: Event): void {
  const tab = activeTab.value
  const target = event.target as HTMLTextAreaElement | null
  if (!tab || !target) return
  tab.sqlContent = target.value
  tab.dirty = true
  tab.lastParseResult = undefined
  syncVariablesFromSql(tab)
  updateCursorState()
}

function updateCursorState(): void {
  const tab = activeTab.value
  const editor = editorRef.value
  if (!tab || !editor) return
  const beforeCursor = tab.sqlContent.slice(0, editor.selectionStart)
  const lines = beforeCursor.split('\n')
  tab.cursorLine = lines.length
  tab.cursorColumn = (lines.at(-1)?.length ?? 0) + 1
}

function focusEditorEnd(): void {
  void nextTick(() => {
    const editor = editorRef.value
    const tab = activeTab.value
    if (!editor || !tab) return
    editor.focus()
    editor.selectionStart = tab.sqlContent.length
    editor.selectionEnd = tab.sqlContent.length
    updateCursorState()
  })
}

function insertTextAtCursor(text: string): void {
  const tab = activeTab.value
  const editor = editorRef.value
  if (!tab) return
  const start = editor?.selectionStart ?? tab.sqlContent.length
  const end = editor?.selectionEnd ?? tab.sqlContent.length
  tab.sqlContent = `${tab.sqlContent.slice(0, start)}${text}${tab.sqlContent.slice(end)}`
  tab.dirty = true
  syncVariablesFromSql(tab)
  void nextTick(() => {
    if (editor) {
      const cursor = start + text.length
      editor.focus()
      editor.selectionStart = cursor
      editor.selectionEnd = cursor
      updateCursorState()
    }
  })
}

function selectFindMatch(index: number): void {
  const editor = editorRef.value
  const matches = findMatches.value
  if (!editor || !matches.length) return
  const normalizedIndex = ((index % matches.length) + matches.length) % matches.length
  currentFindIndex.value = normalizedIndex
  const match = matches[normalizedIndex]
  if (!match) return
  editor.focus()
  editor.selectionStart = match.start
  editor.selectionEnd = match.end
  updateCursorState()
}

function openFindPanel(): void {
  findPanelVisible.value = true
  void nextTick(() => {
    const editor = editorRef.value
    const tab = activeTab.value
    if (!editor || !tab) return
    const selected = tab.sqlContent.slice(editor.selectionStart, editor.selectionEnd)
    if (selected) {
      findText.value = selected
    }
    selectFindMatch(0)
  })
}

function findNext(direction: 1 | -1): void {
  if (!findText.value) return
  selectFindMatch(currentFindIndex.value + direction)
}

function replaceCurrent(): void {
  const tab = activeTab.value
  const matches = findMatches.value
  const match = matches[currentFindIndex.value]
  if (!tab || !match) return
  tab.sqlContent = `${tab.sqlContent.slice(0, match.start)}${replaceText.value}${tab.sqlContent.slice(match.end)}`
  tab.dirty = true
  syncVariablesFromSql(tab)
  void nextTick(() => selectFindMatch(currentFindIndex.value))
}

function replaceAll(): void {
  const tab = activeTab.value
  if (!tab || !findText.value) return
  const escaped = findText.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const count = findMatches.value.length
  tab.sqlContent = tab.sqlContent.replace(new RegExp(escaped, 'gi'), replaceText.value)
  tab.dirty = true
  syncVariablesFromSql(tab)
  setFeedback('success', `已替换 ${count} 处匹配内容。`)
}

async function insertTableName(table: SqlMetadataTable): Promise<void> {
  const tab = activeTab.value
  if (!tab || !table.hasPermission) return
  const text = sqlQueryService.makeInsertTableName(metadataType.value, metadataDatabase.value, table.name)
  tab.dataSourceType = metadataType.value
  tab.connectionId = metadataConnectionId.value
  tab.databaseName = metadataDatabase.value
  await loadConnectionOptions(tab)
  insertTextAtCursor(text)
  setFeedback('success', '表名已插入到当前光标位置')
}

async function insertSelectTemplate(table: SqlMetadataTable): Promise<void> {
  const tab = activeTab.value
  if (!tab || !table.hasPermission) return
  const template = await sqlQueryService.makeSelectTemplate(metadataType.value, metadataDatabase.value, table.name)
  tab.dataSourceType = metadataType.value
  tab.connectionId = metadataConnectionId.value
  tab.databaseName = metadataDatabase.value
  await loadConnectionOptions(tab)
  insertTextAtCursor(template)
  setFeedback('success', '查询语句模板已插入')
}

async function handleSourceTypeChange(value: string): Promise<void> {
  const tab = activeTab.value
  if (!tab) return
  tab.dataSourceType = value as SqlDataSourceType
  tab.connectionId = undefined
  tab.databaseName = undefined
  tab.resourceId = undefined
  tab.dirty = true
  await loadConnectionOptions(tab)
}

async function handleConnectionChange(value: string): Promise<void> {
  const tab = activeTab.value
  if (!tab) return
  tab.connectionId = value
  tab.databaseName = undefined
  tab.dirty = true
  await loadConnectionOptions(tab)
}

function handleDatabaseChange(value: string): void {
  const tab = activeTab.value
  if (!tab) return
  tab.databaseName = value
  tab.dirty = true
}

function handleResourceChange(value: string | null): void {
  const tab = activeTab.value
  if (!tab) return
  tab.resourceId = value ?? undefined
  tab.dirty = true
}

async function formatSql(): Promise<void> {
  const tab = activeTab.value
  const editor = editorRef.value
  if (!tab) return
  try {
    const start = editor?.selectionStart ?? 0
    const end = editor?.selectionEnd ?? 0
    const selected = start !== end ? tab.sqlContent.slice(start, end) : tab.sqlContent
    const formatted = await sqlQueryService.formatSql(selected)
    if (start !== end) {
      tab.sqlContent = `${tab.sqlContent.slice(0, start)}${formatted}${tab.sqlContent.slice(end)}`
    } else {
      tab.sqlContent = formatted
    }
    tab.dirty = true
    syncVariablesFromSql(tab)
    setFeedback('success', 'SQL 已按当前方言格式化')
  } catch (error) {
    setFeedback('error', error instanceof Error ? error.message : '格式化失败')
  }
}

function validateVariables(tab: SqlEditorTabState): string | null {
  syncVariablesFromSql(tab)
  for (const config of tab.variableConfigs) {
    const value = tab.variableValues[config.name] ?? ''
    if (config.required && !value) {
      return `变量「${config.name}」不能为空`
    }
    if (config.type === 'dropdown' && value && !(config.options ?? []).includes(value)) {
      return `变量「${config.name}」必须从下拉选项中选择`
    }
    if (config.type === 'date' && value && !dateFormatToRegex(config.dateFormat ?? 'YYYY-MM-DD').test(value)) {
      return `变量「${config.name}」日期格式不正确`
    }
    if (config.type === 'datetime_minute' && value && !dateFormatToRegex(config.dateFormat ?? 'YYYY-MM-DD HH:mm').test(value)) {
      return `变量「${config.name}」日期时间格式不正确`
    }
    if (config.type === 'datetime_second' && value && !dateFormatToRegex(config.dateFormat ?? 'YYYY-MM-DD HH:mm:ss').test(value)) {
      return `变量「${config.name}」日期时间格式不正确`
    }
  }
  return null
}

function validateRunPrerequisites(tab: SqlEditorTabState): string | null {
  if (!tab.sqlContent.trim()) return '空 SQL 不能运行'
  if (!tab.dataSourceType || !tab.connectionId || !tab.databaseName) return '请选择数据源类型、数据连接和数据库'
  return validateVariables(tab)
}

async function parseSql(showSuccess = true): Promise<SqlParseResult | null> {
  const tab = activeTab.value
  if (!tab) return null
  if (activeWorkbookDeleted.value) {
    setFeedback('warning', '该查询文件已被删除，禁止保存和运行。')
    return null
  }
  const validationError = validateRunPrerequisites(tab)
  if (validationError) {
    setFeedback('error', validationError)
    return null
  }
  tab.parsing = true
  try {
    const result = await sqlQueryService.parseSql({
      projectId: PROJECT_ID,
      workbookId: tab.workbookId,
      temporaryQueryId: tab.temporaryQueryId,
      dataSourceType: tab.dataSourceType!,
      connectionId: tab.connectionId!,
      databaseName: tab.databaseName!,
      resourceId: tab.resourceId,
      rawSql: tab.sqlContent,
      variableValues: tab.variableValues,
    })
    tab.lastParseResult = result
    if (result.valid && showSuccess) {
      setFeedback('success', `解析成功：${result.statementType}，涉及 ${result.tables?.length ?? 0} 张表，${result.columns?.length ?? 0} 个字段`)
    } else if (!result.valid) {
      const message = result.errors?.[0]?.message ?? 'SQL 解析失败'
      setFeedback('error', message)
      currentLogs.value = [
        ...currentLogs.value,
        { id: `parse_${Date.now()}`, jobId: 'local_parse', level: 'ERROR', message, timestamp: new Date().toLocaleString('sv-SE') },
      ]
      resultPanel.value = 'logs'
    }
    return result
  } catch (error) {
    setFeedback('error', error instanceof Error ? error.message : '解析失败')
    return null
  } finally {
    tab.parsing = false
  }
}

async function runSql(): Promise<void> {
  const tab = activeTab.value
  if (activeWorkbookDeleted.value) {
    setFeedback('warning', '该查询文件已被删除，禁止保存和运行。')
    return
  }
  if (!tab || !permissions.value?.canExecute) {
    setFeedback('warning', '当前用户无执行权限')
    return
  }
  const parseResult = await parseSql(false)
  if (!parseResult?.valid) return
  tab.running = true
  resultPanel.value = 'logs'
  currentJob.value = null
  currentLogs.value = []
  resultPage.value = null
  try {
    const job = await sqlQueryService.executeSql({
      projectId: PROJECT_ID,
      workbookId: tab.workbookId,
      temporaryQueryId: tab.temporaryQueryId,
      dataSourceType: tab.dataSourceType!,
      connectionId: tab.connectionId!,
      databaseName: tab.databaseName!,
      resourceId: tab.resourceId,
      rawSql: tab.sqlContent,
      variableValues: tab.variableValues,
    })
    tab.currentJobId = job.id
    currentJob.value = job
    autosaveDraftTabs()
    setFeedback('info', '查询任务已提交，关闭页面后任务仍会继续执行。')
    startPolling(job.id)
  } catch (error) {
    tab.running = false
    setFeedback('error', error instanceof Error ? error.message : '运行失败')
  }
}

function startPolling(jobId: string): void {
  window.clearInterval(pollTimer)
  pollTimer = window.setInterval(() => {
    void refreshJob(jobId)
  }, 1000)
  void refreshJob(jobId)
}

async function refreshJob(jobId: string): Promise<void> {
  const tab = activeTab.value
  try {
    const job = await sqlQueryService.getJob(jobId)
    currentJob.value = job
    currentLogs.value = await sqlQueryService.getLogs(jobId)
    if (['success', 'failed', 'cancelled', 'timeout'].includes(job.status)) {
      window.clearInterval(pollTimer)
      if (tab) tab.running = false
      await refreshHistories()
      if (job.status === 'success') {
        resultPanel.value = 'result'
        await loadResultPage()
        setFeedback('success', `查询成功，共 ${job.resultRowCount ?? 0} 行数据。`)
      } else {
        resultPanel.value = 'logs'
        setFeedback('error', job.errorMessage ?? '查询未成功完成')
      }
    }
  } catch (error) {
    setFeedback('error', error instanceof Error ? error.message : '任务状态刷新失败')
  }
}

async function stopCurrentJob(): Promise<void> {
  if (!currentJob.value) return
  const job = await sqlQueryService.cancelJob(currentJob.value.id)
  currentJob.value = job
  currentLogs.value = await sqlQueryService.getLogs(job.id)
  activeTab.value && (activeTab.value.running = false)
  setFeedback('warning', '查询已停止')
}

async function loadResultPage(): Promise<void> {
  const jobId = currentJob.value?.id ?? activeTab.value?.currentJobId
  if (!jobId) return
  try {
    resultPage.value = await sqlQueryService.getResultPage(jobId, {
      page: resultQuery.page,
      pageSize: resultQuery.pageSize,
      sortColumn: resultQuery.sortColumn,
      sortOrder: resultQuery.sortOrder,
      filterColumn: resultQuery.filterColumn,
      filterValue: resultQuery.filterValue,
      filterMode: resultQuery.filterMode,
    })
  } catch (error) {
    setFeedback('warning', error instanceof Error ? error.message : '结果加载失败')
  }
}

function toggleSort(column: SqlResultColumn): void {
  if (resultQuery.sortColumn !== column.name) {
    resultQuery.sortColumn = column.name
    resultQuery.sortOrder = 'asc'
  } else if (resultQuery.sortOrder === 'asc') {
    resultQuery.sortOrder = 'desc'
  } else if (resultQuery.sortOrder === 'desc') {
    resultQuery.sortColumn = undefined
    resultQuery.sortOrder = undefined
  } else {
    resultQuery.sortOrder = 'asc'
  }
  resultQuery.page = 1
  void loadResultPage()
}

function openColumnSearch(column: SqlResultColumn): void {
  searchDraft.column = column.name
  searchDraft.value = resultQuery.filterColumn === column.name ? resultQuery.filterValue : ''
  searchDraft.mode = resultQuery.filterMode
  searchModalVisible.value = true
}

function applyColumnSearch(): void {
  resultQuery.filterColumn = searchDraft.value ? searchDraft.column : undefined
  resultQuery.filterValue = searchDraft.value
  resultQuery.filterMode = searchDraft.mode
  resultQuery.page = 1
  searchModalVisible.value = false
  void loadResultPage()
}

function clearColumnSearch(): void {
  resultQuery.filterColumn = undefined
  resultQuery.filterValue = ''
  resultQuery.page = 1
  searchModalVisible.value = false
  void loadResultPage()
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

async function handleDownload(key: string | number): Promise<void> {
  const encoding = String(key) as 'UTF-8' | 'GBK'
  if (!currentJob.value || !activeTab.value) return
  try {
    const task = await sqlQueryService.createDownloadTask(currentJob.value.id, encoding, activeTab.value.title)
    const blob = new Blob([task.csvText ?? ''], { type: `text/csv;charset=${encoding.toLowerCase()}` })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = task.fileName
    anchor.click()
    URL.revokeObjectURL(url)
    setFeedback('success', '下载已开始')
  } catch (error) {
    setFeedback('error', error instanceof Error ? error.message : '下载失败，请稍后重试')
  }
}

async function createVisualization(): Promise<void> {
  if (!currentJob.value) return
  try {
    setFeedback('info', '正在生成可视化数据。')
    const dataset = await sqlQueryService.createVisualizationDataset(currentJob.value.id)
    let ready = false
    for (let index = 0; index < 12; index += 1) {
      const refreshed = await sqlQueryService.getVisualizationDataset(dataset.id)
      if (refreshed.status === 'ready') {
        ready = true
        break
      }
      await new Promise((resolve) => window.setTimeout(resolve, 300))
    }
    if (ready) {
      void router.push(`/visual-query/create?datasetId=${dataset.id}&from=sql-query&jobId=${currentJob.value.id}`)
    } else {
      setFeedback('warning', '数据集正在生成中，稍后可在可视化查询中查看。')
    }
  } catch (error) {
    setFeedback('error', error instanceof Error ? error.message : '生成可视化数据失败')
  }
}

function openVariableModal(config: SqlVariableConfig): void {
  editingVariableName.value = config.name
  Object.assign(variableDraft, {
    ...defaultVariableConfig(config.name, config.type),
    ...JSON.parse(JSON.stringify(config)),
    options: [...(config.options ?? [])],
  })
  variableModalVisible.value = true
}

function saveVariableConfig(): void {
  const tab = activeTab.value
  if (!tab) return
  const options = String(variableDraft.options?.join('\n') ?? '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, array) => array.indexOf(item) === index)
  if (variableDraft.type === 'dropdown' && !options.length) {
    setFeedback('error', 'Dropdown List 至少需要 1 个有效选项')
    return
  }
  const index = tab.variableConfigs.findIndex((config) => config.name === editingVariableName.value)
  if (index >= 0) {
    const previousValue = tab.variableValues[editingVariableName.value] ?? ''
    const nextConfig: SqlVariableConfig = {
      ...JSON.parse(JSON.stringify(variableDraft)),
      options,
      updatedAt: new Date().toLocaleString('sv-SE'),
    }
    tab.variableConfigs.splice(index, 1, nextConfig)
    if (!isVariableValueCompatible(nextConfig, previousValue)) {
      tab.variableValues[nextConfig.name] = nextConfig.defaultValue ?? ''
    }
    tab.dirty = true
  }
  variableModalVisible.value = false
}

function isVariableValueCompatible(config: SqlVariableConfig, value: string): boolean {
  if (!value) return true
  if (config.type === 'dropdown') return (config.options ?? []).includes(value)
  if (config.type === 'date') return dateFormatToRegex(config.dateFormat ?? 'YYYY-MM-DD').test(value)
  if (config.type === 'datetime_minute') return dateFormatToRegex(config.dateFormat ?? 'YYYY-MM-DD HH:mm').test(value)
  if (config.type === 'datetime_second') return dateFormatToRegex(config.dateFormat ?? 'YYYY-MM-DD HH:mm:ss').test(value)
  return true
}

function dateFormatToRegex(format: string): RegExp {
  if (format === 'YYYYMMDD') return /^\d{8}$/
  if (format.includes('HH:mm:ss')) return /^\d{4}[-/]\d{2}[-/]\d{2} \d{2}:\d{2}:\d{2}$/
  if (format.includes('HH:mm')) return /^\d{4}[-/]\d{2}[-/]\d{2} \d{2}:\d{2}$/
  return /^\d{4}[-/]\d{2}[-/]\d{2}$/
}

function formatDateByPattern(timestamp: number | null, pattern: string): string {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')
  return pattern
    .replace('YYYY', String(yyyy))
    .replace('MM', mm)
    .replace('DD', dd)
    .replace('HH', hh)
    .replace('mm', mi)
    .replace('ss', ss)
}

function parseDateValue(value: string): number | null {
  if (!value) return null
  const normalized = value.length === 8 ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}` : value.replace(/\//g, '-')
  const parsed = Date.parse(normalized)
  return Number.isNaN(parsed) ? null : parsed
}

function handleVariableDateUpdate(config: SqlVariableConfig, value: number | null): void {
  const tab = activeTab.value
  if (!tab) return
  tab.variableValues[config.name] = formatDateByPattern(value, config.dateFormat ?? 'YYYY-MM-DD')
}

function handleEditorKeydown(event: KeyboardEvent): void {
  if (showSuggestions.value && event.key === 'Enter') {
    event.preventDefault()
    const first = filteredSuggestions.value[0]
    if (first) insertTextAtCursor(first.insertText)
    showSuggestions.value = false
    return
  }
  if (event.shiftKey && event.key === 'Enter') {
    event.preventDefault()
    void runSql()
    return
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
    event.preventDefault()
    void saveActiveTab()
    return
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f') {
    event.preventDefault()
    openFindPanel()
    return
  }
  if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'p') {
    event.preventDefault()
    void parseSql()
    return
  }
  if (event.altKey && event.shiftKey && event.key.toLowerCase() === 'f') {
    event.preventDefault()
    void formatSql()
  }
}

function handleEditorKeyup(event: KeyboardEvent): void {
  updateCursorState()
  if (/^[a-zA-Z_]$/.test(event.key) || event.key === '.') {
    const editor = editorRef.value
    const tab = activeTab.value
    if (!editor || !tab) return
    const before = tab.sqlContent.slice(0, editor.selectionStart)
    const keyword = before.match(/[A-Za-z_][A-Za-z0-9_]*$/)?.[0] ?? ''
    suggestionKeyword.value = keyword
    showSuggestions.value = filteredSuggestions.value.length > 0
  } else if (!['ArrowDown', 'ArrowUp'].includes(event.key)) {
    showSuggestions.value = false
  }
}

function startToolbarDrag(event: PointerEvent): void {
  draggingToolbar = true
  dragOffsetX = event.offsetX
  dragOffsetY = event.offsetY
  window.addEventListener('pointermove', moveToolbar)
  window.addEventListener('pointerup', stopToolbarDrag)
}

function moveToolbar(event: PointerEvent): void {
  if (!draggingToolbar) return
  const container = document.querySelector('.sql-editor-shell')?.getBoundingClientRect()
  if (!container) return
  toolbarPosition.x = Math.min(Math.max(8, event.clientX - container.left - dragOffsetX), Math.max(8, container.width - 360))
  toolbarPosition.y = Math.min(Math.max(8, event.clientY - container.top - dragOffsetY), Math.max(8, container.height - 56))
}

function stopToolbarDrag(): void {
  draggingToolbar = false
  saveToolbarPosition()
  window.removeEventListener('pointermove', moveToolbar)
  window.removeEventListener('pointerup', stopToolbarDrag)
}

async function restoreHistoryToEditor(history: SqlQueryHistory): Promise<boolean> {
  const tab = activeTab.value
  if (!tab) return false
  if (tab.dirty && !window.confirm('当前编辑器存在未保存变更，确认用历史 SQL 覆盖？')) return false
  tab.sqlContent = history.sqlSnapshot
  tab.dataSourceType = history.dataSourceType
  tab.connectionId = history.connectionId
  tab.databaseName = history.databaseName
  tab.dirty = true
  syncVariablesFromSql(tab)
  await loadConnectionOptions(tab)
  setFeedback('success', '历史 SQL 已恢复到编辑器')
  return true
}

async function rerunHistory(history: SqlQueryHistory): Promise<void> {
  const restored = await restoreHistoryToEditor(history)
  if (!restored) return
  await runSql()
}

async function viewHistoryResult(history: SqlQueryHistory): Promise<void> {
  if (history.resultExpired) {
    setFeedback('warning', '查询结果已过期，请重新运行 SQL。')
    return
  }
  const job = await sqlQueryService.getJob(history.jobId)
  currentJob.value = job
  currentLogs.value = await sqlQueryService.getLogs(job.id)
  resultQuery.page = 1
  await loadResultPage()
  resultPanel.value = 'result'
}

async function viewHistoryLogs(history: SqlQueryHistory): Promise<void> {
  const job = await sqlQueryService.getJob(history.jobId)
  currentJob.value = job
  currentLogs.value = await sqlQueryService.getLogs(job.id)
  resultPanel.value = 'logs'
}

function handleBeforeUnload(event: BeforeUnloadEvent): void {
  if (!hasDirtyTabs.value) return
  event.preventDefault()
  event.returnValue = '当前 SQL 尚未保存，离开后未保存内容可能丢失。确认离开？'
}

watch(activeTabId, async () => {
  const tab = activeTab.value
  if (!tab) return
  readSavedToolbarPosition(tab)
  await loadConnectionOptions(tab)
  if (tab.currentJobId) {
    await refreshJob(tab.currentJobId)
  } else {
    currentJob.value = null
    currentLogs.value = []
    resultPage.value = null
  }
  await refreshHistories()
})

watch(
  () => [resultQuery.page, resultQuery.pageSize],
  () => {
    void loadResultPage()
  },
)

watch(findText, () => {
  currentFindIndex.value = 0
  void nextTick(() => selectFindMatch(0))
})

onMounted(() => {
  void initialize()
  autosaveTimer = window.setInterval(autosaveDraftTabs, 2000)
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  window.clearInterval(pollTimer)
  window.clearInterval(autosaveTimer)
  window.clearTimeout(tableSearchTimer)
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

onBeforeRouteLeave(() => {
  if (!hasDirtyTabs.value) return true
  return window.confirm('当前 SQL 尚未保存，离开后未保存内容可能丢失。确认离开？')
})
</script>

<template>
  <div v-if="forbidden" class="sql-query-page">
    <n-alert type="error" title="403">
      当前项目未开通 SQL 查询模块
    </n-alert>
  </div>

  <div v-else class="sql-query-page">
    <div class="sql-page-header">
      <div>
        <h1>SQL 查询</h1>
        <p>选择数据源、编写 SQL、查看结果，并保存到可视化分析或配置例行更新。</p>
      </div>
      <n-space>
        <n-button secondary size="small" @click="shortcutModalVisible = true">
          快捷键
        </n-button>
        <n-button v-if="permissions?.canCreateWorkbook" type="primary" size="small" :disabled="loading" @click="createNewQuery()">
          <template #icon><n-icon><AddOutline /></n-icon></template>
          新建查询
        </n-button>
      </n-space>
    </div>

    <n-alert :type="feedback.type" class="sql-feedback" :show-icon="false">
      {{ feedback.message }}
    </n-alert>

    <div class="sql-workbench">
      <aside class="sql-left-panel">
        <n-radio-group v-model:value="activeLeftPanel" class="left-panel-tabs">
          <n-radio-button value="workbooks">工作簿</n-radio-button>
          <n-radio-button value="history">查询历史</n-radio-button>
          <n-radio-button value="metadata">库表查询</n-radio-button>
        </n-radio-group>

        <section v-if="activeLeftPanel === 'workbooks'" class="left-panel-body">
          <n-input v-model:value="treeKeyword" placeholder="搜索文件夹 / 查询文件" clearable>
            <template #prefix><n-icon><SearchOutline /></n-icon></template>
          </n-input>
          <div class="panel-actions">
            <n-button v-if="permissions?.canManageFolder" size="small" secondary @click="openFolderModal('create')">
              新建文件夹
            </n-button>
            <n-button v-if="permissions?.canCreateWorkbook" size="small" secondary @click="createNewQuery()">
              新建查询
            </n-button>
          </div>

          <div class="folder-tree">
            <div
              v-for="folder in visibleFolders"
              :key="folder.id"
              class="folder-node"
              :class="{ selected: selectedFolderId === folder.id }"
              :style="{ paddingLeft: `${8 + getFolderDepth(folder.id) * 16}px` }"
              @click="selectedFolderId = folder.id"
            >
              <div class="folder-title">
                <n-icon><FolderOpenOutline /></n-icon>
                <span>{{ folder.name }}</span>
              </div>
              <div v-if="folder.id !== 'root'" class="node-actions">
                <n-button v-if="permissions?.canCreateWorkbook" size="tiny" text @click.stop="createNewQuery(folder.id)">查询</n-button>
                <n-button v-if="permissions?.canManageFolder" size="tiny" text @click.stop="openFolderModal('create', folder)">子文件夹</n-button>
                <n-button v-if="permissions?.canManageFolder" size="tiny" text @click.stop="openFolderModal('rename', folder)">重命名</n-button>
                <n-button v-if="permissions?.canManageFolder" size="tiny" text type="error" @click.stop="deleteFolder(folder)">删除</n-button>
              </div>
              <div v-if="workbooksForFolder(folder.id).length" class="workbook-list">
                <div v-for="workbook in workbooksForFolder(folder.id)" :key="workbook.id" class="workbook-node">
                  <button class="workbook-open" type="button" @click.stop="openWorkbook(workbook)">
                    <n-icon><BookmarkOutline /></n-icon>
                    <span>{{ workbook.name }}</span>
                  </button>
                  <div class="node-actions">
                    <n-button v-if="permissions?.canEditWorkbook || workbook.ownerId === 'current_user'" size="tiny" text @click.stop="renameWorkbook(workbook)">重命名</n-button>
                    <n-button size="tiny" text @click.stop="copyWorkbook(workbook)">复制</n-button>
                    <n-button v-if="permissions?.canEditWorkbook || workbook.ownerId === 'current_user'" size="tiny" text @click.stop="openMoveModal(workbook)">移动到</n-button>
                    <n-button size="tiny" text @click.stop="copyText(workbook.sqlContent)">复制 SQL</n-button>
                    <n-button v-if="permissions?.canDeleteWorkbook || workbook.ownerId === 'current_user'" size="tiny" text type="error" @click.stop="deleteWorkbook(workbook)">删除</n-button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section v-if="activeLeftPanel === 'history'" class="left-panel-body history-list">
          <n-empty v-if="!globalHistories.length" description="暂无查询历史" />
          <article v-for="history in globalHistories" :key="history.id" class="history-card">
            <div class="history-title">
              <n-tag size="small" :type="history.status === 'success' ? 'success' : history.status === 'failed' ? 'error' : 'info'" :bordered="false">
                {{ history.status }}
              </n-tag>
              <span>{{ history.connectionName }} / {{ history.databaseName }}</span>
            </div>
            <pre>{{ history.sqlSnapshot }}</pre>
            <div class="history-meta">
              {{ history.executedAt }} · {{ history.resultRowCount ?? 0 }} 行
              <span v-if="history.resultExpired"> · 结果已过期</span>
            </div>
            <n-space size="small">
              <n-button size="tiny" secondary @click="copyText(history.sqlSnapshot)">复制</n-button>
              <n-button size="tiny" secondary @click="restoreHistoryToEditor(history)">恢复</n-button>
              <n-button size="tiny" secondary @click="rerunHistory(history)">重新运行</n-button>
              <n-button size="tiny" secondary :disabled="history.resultExpired" @click="viewHistoryResult(history)">查看结果</n-button>
              <n-button size="tiny" secondary @click="viewHistoryLogs(history)">查看日志</n-button>
            </n-space>
          </article>
        </section>

        <section v-if="activeLeftPanel === 'metadata'" class="left-panel-body metadata-panel">
          <n-select v-model:value="metadataType" :options="sourceOptions" @update:value="loadMetadataControls" />
          <n-select v-model:value="metadataConnectionId" :options="metadataConnections" placeholder="选择数据连接" @update:value="loadMetadataControls" />
          <n-select v-model:value="metadataDatabase" :options="metadataDatabases" filterable placeholder="选择数据库" @update:value="loadMetadataTables" />
          <n-input v-model:value="metadataKeyword" placeholder="搜索表" clearable @input="scheduleTableSearch">
            <template #prefix><n-icon><SearchOutline /></n-icon></template>
          </n-input>
          <div class="table-list">
            <n-empty v-if="!metadataTables.length" description="暂无可用数据表" />
            <n-popover
              v-for="table in metadataTables"
              :key="table.name"
              trigger="hover"
              placement="right"
              style="width: 620px"
              @update:show="(show) => show && loadTableDetail(table)"
            >
              <template #trigger>
                <div class="table-node" :class="{ denied: !table.hasPermission }">
                  <div>
                    <strong>{{ table.name }}</strong>
                    <span>{{ table.type }}{{ table.isPartitioned ? ' · 分区表' : '' }}</span>
                  </div>
                  <n-space size="small">
                    <n-button size="tiny" secondary :disabled="!table.hasPermission" @click.stop="insertTableName(table)">插入表名</n-button>
                    <n-button size="tiny" secondary :disabled="!table.hasPermission" @click.stop="insertSelectTemplate(table)">插入查询语句</n-button>
                  </n-space>
                </div>
              </template>
              <div v-if="!table.hasPermission" class="table-popover">
                <n-alert type="warning" :show-icon="false">
                  无权限表仅展示表名，不展示字段、预览和分区信息。
                </n-alert>
              </div>
              <div v-else class="table-popover">
                <n-alert v-if="tableDetails[table.name]?.error" type="error" :show-icon="false">
                  {{ tableDetails[table.name]?.error }}
                </n-alert>
                <n-tabs v-else type="line" animated>
                  <n-tab-pane name="columns" tab="字段信息">
                    <table class="mini-table">
                      <thead><tr><th>字段名</th><th>类型</th><th>可空</th><th>备注</th></tr></thead>
                      <tbody>
                        <tr v-for="column in tableDetails[table.name]?.columns ?? []" :key="column.name">
                          <td>{{ column.name }}</td>
                          <td>{{ column.type }}</td>
                          <td>{{ column.nullable ? '是' : '否' }}</td>
                          <td>{{ column.comment }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </n-tab-pane>
                  <n-tab-pane name="preview" tab="数据预览">
                    <table class="mini-table">
                      <thead>
                        <tr><th v-for="column in tableDetails[table.name]?.preview?.columns ?? []" :key="column.name">{{ column.name }}</th></tr>
                      </thead>
                      <tbody>
                        <tr v-for="(row, index) in tableDetails[table.name]?.preview?.rows.slice(0, 5) ?? []" :key="index">
                          <td v-for="column in tableDetails[table.name]?.preview?.columns ?? []" :key="column.name">{{ formatCell(row[column.name]) }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </n-tab-pane>
                  <n-tab-pane name="partitions" tab="分区信息">
                    <n-empty v-if="!(tableDetails[table.name]?.partitions.length)" description="该表暂无分区信息" />
                    <table v-else class="mini-table">
                      <thead><tr><th>分区字段</th><th>分区类型</th><th>最近分区</th></tr></thead>
                      <tbody>
                        <tr v-for="partition in tableDetails[table.name]?.partitions ?? []" :key="partition.column">
                          <td>{{ partition.column }}</td>
                          <td>{{ partition.type }}</td>
                          <td>{{ partition.latestValue }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </n-tab-pane>
                  <n-tab-pane name="info" tab="表信息">
                    <div class="info-grid">
                      <span>表名</span><strong>{{ tableDetails[table.name]?.info?.tableName }}</strong>
                      <span>数据库</span><strong>{{ tableDetails[table.name]?.info?.databaseName }}</strong>
                      <span>数据源</span><strong>{{ tableDetails[table.name]?.info?.connectionName }}</strong>
                      <span>表类型</span><strong>{{ tableDetails[table.name]?.info?.tableType }}</strong>
                      <span>描述</span><strong>{{ tableDetails[table.name]?.info?.comment }}</strong>
                    </div>
                  </n-tab-pane>
                </n-tabs>
              </div>
            </n-popover>
          </div>
        </section>
      </aside>

      <main class="sql-main-panel">
        <div class="editor-tabs">
          <button
            v-for="tab in openedTabs"
            :key="tab.tabId"
            type="button"
            :class="{ active: tab.tabId === activeTabId }"
            @click="activeTabId = tab.tabId"
          >
            {{ tab.title }}<span v-if="tab.dirty"> *</span>
            <span class="tab-close" @click.stop="closeTab(tab.tabId)">×</span>
          </button>
          <n-button v-if="permissions?.canCreateWorkbook" size="small" quaternary @click="createNewQuery()">
            <template #icon><n-icon><AddOutline /></n-icon></template>
          </n-button>
        </div>

        <n-alert v-if="activeWorkbookDeleted" type="warning" :show-icon="false">
          该查询文件已被删除，禁止保存和运行。SQL 快照仍可复制或另存为新查询。
        </n-alert>

        <section v-if="activeTab" class="editor-config">
          <n-grid :cols="24" :x-gap="12" :y-gap="8">
            <n-gi :span="4">
              <n-select :value="activeTab.dataSourceType" :options="sourceOptions" placeholder="数据源类型" @update:value="handleSourceTypeChange" />
            </n-gi>
            <n-gi :span="5">
              <n-select :value="activeTab.connectionId" :options="connectionOptions" placeholder="数据连接" @update:value="handleConnectionChange" />
            </n-gi>
            <n-gi :span="5">
              <n-select :value="activeTab.databaseName" :options="databaseOptions" filterable placeholder="数据库" @update:value="handleDatabaseChange" />
            </n-gi>
            <n-gi :span="4">
              <n-select
                :value="activeTab.resourceId"
                :options="resourceOptions"
                clearable
                placeholder="执行资源"
                @update:value="handleResourceChange"
              />
            </n-gi>
            <n-gi :span="6">
              <n-space justify="end" size="small">
                <n-button
                  v-if="permissions?.canCreateWorkbook || permissions?.canEditWorkbook"
                  size="small"
                  secondary
                  :disabled="activeWorkbookDeleted"
                  :loading="activeTab.saving"
                  @click="saveActiveTab"
                >
                  <template #icon><n-icon><SaveOutline /></n-icon></template>
                  保存
                </n-button>
                <n-button size="small" secondary :loading="activeTab.parsing" :disabled="!permissions?.canExecute || activeWorkbookDeleted" @click="parseSql()">
                  <template #icon><n-icon><CodeSlashOutline /></n-icon></template>
                  解析
                </n-button>
                <n-button size="small" type="primary" :loading="activeTab.running" :disabled="!permissions?.canExecute || activeWorkbookDeleted" @click="runSql">
                  <template #icon><n-icon><PlayOutline /></n-icon></template>
                  运行
                </n-button>
              </n-space>
            </n-gi>
          </n-grid>
        </section>

        <section v-if="activeTab" class="sql-editor-shell">
          <div class="floating-toolbar" :style="{ left: `${toolbarPosition.x}px`, top: `${toolbarPosition.y}px` }">
            <div class="drag-handle" @pointerdown="startToolbarDrag">工具栏</div>
            <n-button-group size="small">
              <n-tooltip trigger="hover">
                <template #trigger>
                  <n-button secondary @click="formatSql">
                    <n-icon><RefreshOutline /></n-icon>
                  </n-button>
                </template>
                格式化 SQL
              </n-tooltip>
              <n-tooltip trigger="hover">
                <template #trigger>
                  <n-button secondary @click="openFindPanel">
                    <n-icon><SearchOutline /></n-icon>
                  </n-button>
                </template>
                查找 / 替换
              </n-tooltip>
              <n-dropdown
                v-if="visibleDownload"
                trigger="click"
                :disabled="!visibleDownload || !canDownload"
                :options="[
                  { label: '下载 UTF-8', key: 'UTF-8' },
                  { label: '下载 GBK', key: 'GBK' },
                ]"
                @select="handleDownload"
              >
                <n-tooltip trigger="hover">
                  <template #trigger>
                    <n-button secondary :disabled="!visibleDownload || !canDownload">
                      <n-icon><CloudDownloadOutline /></n-icon>
                    </n-button>
                  </template>
                  {{ canDownload ? '下载完整 CSV 结果' : currentJob?.resultExpired ? '查询结果已过期，请重新运行' : '查询成功后可下载' }}
                </n-tooltip>
              </n-dropdown>
              <n-tooltip trigger="hover">
                <template #trigger>
                  <n-button secondary :disabled="!canCreateChart" @click="createVisualization">
                    <n-icon><ChevronForwardOutline /></n-icon>
                  </n-button>
                </template>
                新建图表
              </n-tooltip>
              <n-button secondary type="warning" :disabled="currentJob?.status !== 'running'" @click="stopCurrentJob">
                <template #icon><n-icon><StopCircleOutline /></n-icon></template>
                停止
              </n-button>
            </n-button-group>
          </div>
          <div class="line-gutter">
            <span v-for="line in activeTab.sqlContent.split('\n').length || 1" :key="line" :class="{ current: line === activeTab.cursorLine }">
              {{ line }}
            </span>
          </div>
          <textarea
            ref="editorRef"
            class="sql-textarea"
            spellcheck="false"
            :value="activeTab.sqlContent"
            placeholder="请输入单一 SQL 查询语句，支持 {{变量名}} 自定义变量。"
            @input="handleSqlInput"
            @select="updateCursorState"
            @click="updateCursorState"
            @keydown="handleEditorKeydown"
            @keyup="handleEditorKeyup"
          />
          <div v-if="showSuggestions && filteredSuggestions.length" class="suggestion-panel">
            <div v-for="suggestion in filteredSuggestions" :key="suggestion.label" class="suggestion-item" @mousedown.prevent="insertTextAtCursor(suggestion.insertText)">
              <strong>{{ suggestion.label }}</strong>
              <span>{{ suggestion.description }}</span>
            </div>
          </div>
          <div v-if="findPanelVisible" class="find-panel">
            <n-input v-model:value="findText" size="small" placeholder="查找" clearable />
            <n-input v-model:value="replaceText" size="small" placeholder="替换为" clearable />
            <span>{{ findMatches.length ? currentFindIndex + 1 : 0 }} / {{ findMatches.length }}</span>
            <n-button size="small" secondary @click="findNext(-1)">上一个</n-button>
            <n-button size="small" secondary @click="findNext(1)">下一个</n-button>
            <n-button size="small" secondary :disabled="!findMatches.length" @click="replaceCurrent">替换</n-button>
            <n-button size="small" secondary :disabled="!findMatches.length" @click="replaceAll">全部替换</n-button>
            <n-button size="small" quaternary @click="findPanelVisible = false">关闭</n-button>
          </div>
          <div class="editor-status">
            <span>第 {{ activeTab.cursorLine }} 行，第 {{ activeTab.cursorColumn }} 列</span>
            <span>括号匹配正常</span>
            <span>{{ activeTab.dirty ? '未保存' : '已保存' }}</span>
            <span v-if="activeTab.lastParseResult?.valid">解析成功：{{ activeTab.lastParseResult.statementType }}</span>
          </div>
        </section>

        <section v-if="activeTab?.variableConfigs.length" class="variable-panel">
          <div class="section-title">
            <strong>变量说明</strong>
            <span>变量值会原样替换，Text 与 Dropdown 不会自动加引号。</span>
          </div>
          <n-grid :cols="24" :x-gap="12" :y-gap="12">
            <n-gi v-for="config in activeTab.variableConfigs" :key="config.name" :span="8">
              <div class="variable-item">
                <div class="variable-label">
                  <span>{{ config.name }}</span>
                  <n-tag size="small" :bordered="false">{{ config.type }}</n-tag>
                  <n-button size="tiny" quaternary circle @click="openVariableModal(config)">
                    <template #icon><n-icon><SettingsOutline /></n-icon></template>
                  </n-button>
                </div>
                <n-select
                  v-if="config.type === 'dropdown'"
                  v-model:value="activeTab.variableValues[config.name]"
                  :options="(config.options ?? []).map((item) => ({ label: item, value: item }))"
                  placeholder="请选择"
                />
                <n-date-picker
                  v-else-if="config.type === 'date'"
                  type="date"
                  clearable
                  :value="parseDateValue(activeTab.variableValues[config.name] ?? '')"
                  @update:value="(value) => handleVariableDateUpdate(config, value)"
                />
                <n-date-picker
                  v-else-if="config.type === 'datetime_minute'"
                  type="datetime"
                  clearable
                  :value="parseDateValue(activeTab.variableValues[config.name] ?? '')"
                  @update:value="(value) => handleVariableDateUpdate(config, value)"
                />
                <n-date-picker
                  v-else-if="config.type === 'datetime_second'"
                  type="datetime"
                  clearable
                  :value="parseDateValue(activeTab.variableValues[config.name] ?? '')"
                  @update:value="(value) => handleVariableDateUpdate(config, value)"
                />
                <n-input v-else v-model:value="activeTab.variableValues[config.name]" placeholder="输入变量值" />
              </div>
            </n-gi>
          </n-grid>
        </section>

        <section class="result-panel">
          <div class="result-header">
            <div>
              <strong>{{ statusSummary }}</strong>
              <span v-if="currentJob?.status === 'success'"> · {{ currentJob.resultRowCount ?? 0 }} 行 · {{ currentJob.resultColumnCount ?? 0 }} 字段</span>
            </div>
            <n-space size="small">
              <n-badge v-if="resultQuery.filterColumn" type="info" :value="'筛选'">
                <n-button size="small" secondary @click="clearColumnSearch">清除筛选</n-button>
              </n-badge>
            </n-space>
          </div>
          <n-alert v-if="currentJob?.status === 'failed'" type="error" :show-icon="false" class="result-error">
            查询失败。错误类型：{{ currentJob.errorCode ?? 'UNKNOWN' }}；错误详情：{{ currentJob.errorMessage ?? '请查看查询日志' }}
          </n-alert>
          <n-tabs v-model:value="resultPanel" type="line" animated>
            <n-tab-pane name="history" tab="当前工作簿查询历史">
              <n-empty v-if="!workbookHistories.length" description="当前工作簿暂无查询历史" />
              <table v-else class="data-table compact">
                <thead>
                  <tr><th>状态</th><th>数据连接</th><th>数据库</th><th>执行时间</th><th>行数</th><th>耗时</th><th>操作</th></tr>
                </thead>
                <tbody>
                  <tr v-for="history in workbookHistories" :key="history.id">
                    <td>{{ history.status }}</td>
                    <td>{{ history.connectionName }}</td>
                    <td>{{ history.databaseName }}</td>
                    <td>{{ history.executedAt }}</td>
                    <td>{{ history.resultRowCount ?? '-' }}</td>
                    <td>{{ history.durationMs ? `${(history.durationMs / 1000).toFixed(1)}s` : '-' }}</td>
                    <td>
                      <n-space size="small">
                        <n-button size="tiny" secondary @click="copyText(history.sqlSnapshot)">复制 SQL</n-button>
                        <n-button size="tiny" secondary @click="restoreHistoryToEditor(history)">恢复</n-button>
                        <n-button size="tiny" secondary @click="rerunHistory(history)">重新运行</n-button>
                        <n-button size="tiny" secondary :disabled="history.resultExpired" @click="viewHistoryResult(history)">查看结果</n-button>
                        <n-button size="tiny" secondary @click="viewHistoryLogs(history)">查看日志</n-button>
                      </n-space>
                    </td>
                  </tr>
                </tbody>
              </table>
            </n-tab-pane>
            <n-tab-pane name="result" tab="查询结果">
              <n-empty v-if="!resultPage" description="暂无查询结果，请运行 SQL 后查看" />
              <div v-else class="result-table-wrap">
                <div class="result-summary">
                  查询成功，共 {{ resultPage.totalRows }} 行数据。排序和搜索只作用于结果存储，不重新执行 SQL。
                </div>
                <table class="data-table">
                  <thead>
                    <tr>
                      <th v-for="column in resultPage.columns" :key="column.name">
                        <div class="column-head">
                          <span>{{ column.name }}</span>
                          <small>{{ column.type }}</small>
                          <n-button size="tiny" quaternary @click="toggleSort(column)">
                            {{ resultQuery.sortColumn === column.name ? (resultQuery.sortOrder === 'asc' ? '升序' : '降序') : '排序' }}
                          </n-button>
                          <n-button size="tiny" quaternary @click="openColumnSearch(column)">搜索</n-button>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="!resultPage.rows.length">
                      <td :colspan="resultPage.columns.length">查询成功，共 0 行数据。下载 CSV 时仍会包含表头。</td>
                    </tr>
                    <tr v-for="(row, index) in resultPage.rows" v-else :key="index">
                      <td v-for="column in resultPage.columns" :key="column.name">{{ formatCell(row[column.name]) }}</td>
                    </tr>
                  </tbody>
                </table>
                <div class="pagination-bar">
                  <n-select v-model:value="resultQuery.pageSize" :options="pageSizeOptions" style="width: 140px" />
                  <n-pagination v-model:page="resultQuery.page" :page-size="resultQuery.pageSize" :item-count="resultPage.totalRows" />
                </div>
              </div>
            </n-tab-pane>
            <n-tab-pane name="logs" tab="查询日志">
              <n-empty v-if="!currentLogs.length" description="暂无查询日志" />
              <table v-else class="data-table compact">
                <thead><tr><th>时间</th><th>级别</th><th>内容</th><th>操作</th></tr></thead>
                <tbody>
                  <tr v-for="log in currentLogs" :key="log.id" :class="`log-${log.level.toLowerCase()}`">
                    <td>{{ log.timestamp }}</td>
                    <td>{{ log.level }}</td>
                    <td>{{ log.message }}</td>
                    <td><n-button size="tiny" secondary @click="copyText(log.message, '日志已复制')">复制</n-button></td>
                  </tr>
                </tbody>
              </table>
            </n-tab-pane>
          </n-tabs>
        </section>
      </main>
    </div>

    <n-modal v-model:show="folderModalVisible" preset="dialog" :title="folderModalMode === 'create' ? '新建文件夹' : '重命名文件夹'" positive-text="确定" negative-text="取消" @positive-click="submitFolderModal">
      <n-input v-model:value="folderModalName" placeholder="文件夹名称，1-64 个字符" />
    </n-modal>

    <n-modal v-model:show="saveModalVisible" preset="card" title="保存查询" style="width: 520px">
      <n-form label-placement="top">
        <n-form-item label="查询名称" required>
          <n-input v-model:value="saveDraft.name" placeholder="例如：订单明细查询" />
        </n-form-item>
        <n-form-item label="保存文件夹" required>
          <n-select v-model:value="saveDraft.folderId" :options="folderOptions" />
        </n-form-item>
        <n-form-item label="描述">
          <n-input v-model:value="saveDraft.description" type="textarea" placeholder="0-500 字符" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="saveModalVisible = false">取消</n-button>
          <n-button type="primary" @click="submitSaveModal">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="moveModalVisible" preset="dialog" title="移动到" positive-text="移动" negative-text="取消" @positive-click="submitMoveWorkbook">
      <n-select v-model:value="moveFolderId" :options="folderOptions" />
    </n-modal>

    <n-modal v-model:show="variableModalVisible" preset="card" title="变量设置" style="width: 560px">
      <n-form label-placement="top">
        <n-form-item label="变量名">
          <n-input :value="variableDraft.name" readonly />
        </n-form-item>
        <n-form-item label="类型" required>
          <n-select v-model:value="variableDraft.type" :options="variableTypeOptions" />
        </n-form-item>
        <n-form-item label="是否必填">
          <n-switch v-model:value="variableDraft.required" />
        </n-form-item>
        <n-form-item v-if="variableDraft.type === 'dropdown'" label="选项内容，每行一个选项" required>
          <n-input
            type="textarea"
            :value="(variableDraft.options ?? []).join('\n')"
            @update:value="(value) => (variableDraft.options = value.split('\n'))"
          />
        </n-form-item>
        <n-form-item v-if="dateFormatOptions[variableDraft.type].length" label="日期格式" required>
          <n-select v-model:value="variableDraft.dateFormat" :options="dateFormatOptions[variableDraft.type]" />
        </n-form-item>
        <n-form-item label="默认值">
          <n-input v-model:value="variableDraft.defaultValue" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="variableModalVisible = false">取消</n-button>
          <n-button type="primary" @click="saveVariableConfig">确定</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="searchModalVisible" preset="dialog" title="单列值搜索" positive-text="搜索" negative-text="取消" @positive-click="applyColumnSearch">
      <n-form label-placement="top">
        <n-form-item label="搜索字段">
          <n-input :value="searchDraft.column" readonly />
        </n-form-item>
        <n-form-item label="搜索值">
          <n-input v-model:value="searchDraft.value" placeholder="输入要匹配的值；留空则清除搜索" />
        </n-form-item>
        <n-form-item label="匹配方式">
          <n-select v-model:value="searchDraft.mode" :options="[{ label: 'contains', value: 'contains' }, { label: 'equals', value: 'equals' }]" />
        </n-form-item>
      </n-form>
    </n-modal>

    <n-modal v-model:show="shortcutModalVisible" preset="card" title="快捷键" style="width: 560px">
      <table class="mini-table">
        <tbody>
          <tr><td>运行</td><td>Shift + Enter</td></tr>
          <tr><td>格式化</td><td>Mac Option + Shift + F / Windows Alt + Shift + F</td></tr>
          <tr><td>解析</td><td>Mac Command + Shift + P / Windows Ctrl + Shift + P</td></tr>
          <tr><td>保存</td><td>Mac Command + S / Windows Ctrl + S</td></tr>
        </tbody>
      </table>
    </n-modal>
  </div>
</template>

<style scoped lang="scss">
.sql-query-page {
  min-height: 100%;
  padding: 16px 20px 24px;
  color: #1f2937;
}

.sql-page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;

  h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 700;
  }

  p {
    margin: 6px 0 0;
    color: #667085;
  }
}

.sql-feedback {
  margin-bottom: 12px;
}

.sql-workbench {
  display: grid;
  grid-template-columns: 360px minmax(780px, 1fr);
  gap: 12px;
  min-height: calc(100vh - 156px);
}

.sql-left-panel,
.sql-main-panel,
.variable-panel,
.result-panel,
.editor-config {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.sql-left-panel {
  overflow: hidden;
}

.left-panel-tabs {
  width: 100%;
  padding: 12px;
}

.left-panel-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: calc(100vh - 230px);
  padding: 0 12px 12px;
  overflow: auto;
}

.panel-actions,
.folder-title,
.history-title,
.pagination-bar,
.result-header,
.section-title,
.variable-label,
.editor-status {
  display: flex;
  align-items: center;
}

.panel-actions,
.pagination-bar,
.result-header {
  justify-content: space-between;
}

.folder-tree,
.table-list,
.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.folder-node,
.history-card,
.table-node {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
}

.folder-node {
  padding: 8px;

  &.selected {
    border-color: #18a058;
    background: #f0fbf5;
  }
}

.folder-title {
  gap: 8px;
  font-weight: 650;
}

.node-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

.workbook-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}

.workbook-node {
  padding: 7px;
  border-radius: 6px;
  background: #f8fafc;
}

.workbook-open {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: #1f2937;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.history-card {
  padding: 10px;

  pre {
    max-height: 90px;
    margin: 8px 0;
    overflow: auto;
    color: #344054;
    font-family: 'SFMono-Regular', Consolas, monospace;
    font-size: 12px;
    white-space: pre-wrap;
  }
}

.history-title {
  gap: 8px;
  font-weight: 650;
}

.history-meta {
  margin-bottom: 8px;
  color: #667085;
  font-size: 12px;
}

.metadata-panel {
  gap: 10px;
}

.table-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px;

  strong,
  span {
    display: block;
  }

  span {
    margin-top: 2px;
    color: #667085;
    font-size: 12px;
  }

  &.denied {
    color: #9ca3af;
    background: #f8fafc;
  }
}

.sql-main-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  overflow: hidden;
}

.editor-tabs {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;

  button {
    min-width: 120px;
    height: 34px;
    padding: 0 10px;
    border: 1px solid #d0d5dd;
    border-radius: 6px;
    background: #f8fafc;
    color: #344054;
    cursor: pointer;

    &.active {
      border-color: #2563eb;
      background: #eff6ff;
      color: #1d4ed8;
      font-weight: 650;
    }
  }
}

.tab-close {
  margin-left: 8px;
  color: #667085;
}

.editor-config {
  padding: 12px;
}

.sql-editor-shell {
  position: relative;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  height: 300px;
  overflow: hidden;
  border: 1px solid #d0d5dd;
  border-radius: 8px;
  background: #0f172a;
}

.line-gutter {
  padding: 52px 8px 28px;
  overflow: hidden;
  background: #111827;
  color: #94a3b8;
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 13px;
  line-height: 22px;
  text-align: right;

  span {
    display: block;
    height: 22px;

    &.current {
      color: #60a5fa;
      font-weight: 700;
    }
  }
}

.sql-textarea {
  width: 100%;
  height: 100%;
  padding: 52px 16px 34px;
  border: 0;
  outline: 0;
  resize: none;
  background: #0f172a;
  color: #e5e7eb;
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 13px;
  line-height: 22px;
}

.floating-toolbar {
  position: absolute;
  z-index: 4;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px;
  border: 1px solid #d0d5dd;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.16);
}

.drag-handle {
  padding: 0 8px;
  color: #475467;
  cursor: grab;
  user-select: none;
}

.suggestion-panel {
  position: absolute;
  z-index: 6;
  top: 58px;
  left: 88px;
  width: 320px;
  overflow: hidden;
  border: 1px solid #d0d5dd;
  border-radius: 6px;
  background: white;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.18);
}

.find-panel {
  position: absolute;
  z-index: 7;
  top: 12px;
  right: 12px;
  display: grid;
  grid-template-columns: 160px 160px auto auto auto auto auto auto;
  align-items: center;
  gap: 6px;
  padding: 8px;
  border: 1px solid #d0d5dd;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.18);

  span {
    min-width: 48px;
    color: #475467;
    font-size: 12px;
    text-align: center;
  }
}

.suggestion-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  cursor: pointer;

  &:hover {
    background: #eff6ff;
  }

  span {
    color: #667085;
    font-size: 12px;
  }
}

.editor-status {
  position: absolute;
  right: 12px;
  bottom: 6px;
  gap: 12px;
  color: #94a3b8;
  font-size: 12px;
}

.variable-panel,
.result-panel {
  padding: 12px;
}

.section-title {
  justify-content: space-between;
  margin-bottom: 12px;

  span {
    color: #667085;
    font-size: 12px;
  }
}

.variable-item {
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.variable-label {
  justify-content: space-between;
  margin-bottom: 8px;
}

.result-panel {
  min-height: 280px;
}

.result-header {
  margin-bottom: 8px;
}

.result-error {
  margin-bottom: 8px;
}

.result-summary {
  margin-bottom: 10px;
  color: #667085;
  font-size: 13px;
}

.result-table-wrap {
  overflow: auto;
}

.data-table,
.mini-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;

  th,
  td {
    padding: 8px 10px;
    border-bottom: 1px solid #e5e7eb;
    text-align: left;
    vertical-align: top;
  }

  th {
    background: #f8fafc;
    color: #475467;
    font-weight: 650;
  }

  &.compact {
    font-size: 12px;
  }
}

.column-head {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 4px;
  min-width: 168px;

  small {
    grid-column: 1 / 4;
    color: #98a2b3;
  }
}

.pagination-bar {
  margin-top: 12px;
}

.log-error td {
  color: #b42318;
}

.log-warn td {
  color: #b54708;
}

.table-popover {
  max-height: 440px;
  overflow: auto;
}

.info-grid {
  display: grid;
  grid-template-columns: 90px 1fr;
  gap: 8px 12px;

  span {
    color: #667085;
  }
}
</style>
