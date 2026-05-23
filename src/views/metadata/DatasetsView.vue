<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NAlert,
  NButton,
  NCard,
  NCheckbox,
  NDataTable,
  NDropdown,
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
import type { DataTableColumns, DropdownOption, SelectOption } from 'naive-ui'
import { datasetService } from '@/services/datasetService'
import type {
  AggregationType,
  DataMaskRule,
  Dataset,
  DatasetField,
  DatasetFolder,
  DatasetLineageEdge,
  DatasetLineageNode,
  DatasetModel,
  DatasetPermission,
  DatasetPermissionRule,
  DatasetPreviewRow,
  DatasetTreeSection,
  FieldType,
  FilterCondition,
  FilterOperator,
  JoinCondition,
  JoinType,
  ModelEdge,
  ModelNode,
  PreviewResult,
  SemanticType,
  SensitivityChoice,
  SourceField,
  SourceTableItem,
  SyncConfig,
  SyncFrequency,
  SyncTask,
  UnionType,
} from '@/types/dataset'

type ViewMode = 'list' | 'editor'
type DetailTab = 'basic' | 'preview' | 'schema' | 'sync' | 'model' | 'lineage' | 'permission' | 'mask'
type EditorStep = 'source' | 'model' | 'filter' | 'field' | 'sync' | 'preview'
type NoticeType = 'success' | 'info' | 'warning' | 'error'
type SourceCreateType = 'database' | 'las' | 'file' | 'kafka' | 'theme'

interface NoticeState {
  type: NoticeType
  text: string
}

interface FieldDraft {
  name: string
  displayName: string
  fieldType: FieldType
  expression: string
}

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const viewMode = ref<ViewMode>('list')
const section = ref<DatasetTreeSection>('custom')
const activeDetailTab = ref<DetailTab>('basic')
const activeEditorStep = ref<EditorStep>('source')
const keyword = ref('')
const statusFilter = ref('all')
const typeFilter = ref('all')
const ownerFilter = ref('all')
const selectedDatasetId = ref('ds_ad_watch_detail')
const selectedNodeId = ref('')
const selectedEdgeId = ref('')
const collapsedCanvasNodeIds = ref<string[]>([])
const fieldLinkDraft = ref<{ nodeId: string; fieldName: string } | null>(null)
const notice = ref<NoticeState>({ type: 'success', text: '已加载数据集列表，可从左侧选择或新建数据集。' })

const datasets = ref<Dataset[]>([])
const folders = ref<DatasetFolder[]>([])
const sourceTables = ref<SourceTableItem[]>([])
const model = ref<DatasetModel | null>(null)
const editorDataset = ref<Dataset | null>(null)
const syncConfig = ref<SyncConfig | null>(null)
const syncTasks = ref<SyncTask[]>([])
const previewResult = ref<PreviewResult | null>(null)
const lineageNodes = ref<DatasetLineageNode[]>([])
const lineageEdges = ref<DatasetLineageEdge[]>([])
const permissionRules = ref<DatasetPermissionRule[]>([])
const maskRules = ref<DataMaskRule[]>([])

const showCreateModal = ref(false)
const showFolderModal = ref(false)
const showJoinModal = ref(false)
const showUnionModal = ref(false)
const showCalcFieldModal = ref(false)
const showDeleteModal = ref(false)
const showPermissionModal = ref(false)
const showLogModal = ref(false)
const showMoveModal = ref(false)

const createType = ref<'normal' | 'associated'>('normal')
const createSourceType = ref<SourceCreateType>('database')
const createName = ref('')
const createSourceMode = ref<'direct' | 'extract'>('extract')
const createSensitivityChoice = ref<SensitivityChoice | null>(null)
const createSourceId = ref('source_event_di')
const selectedSourceConnectionIds = ref<string[]>([])
const selectedSourceDatabases = ref<string[]>([])
const selectedSourceTableIds = ref<string[]>([])
const selectedAssociatedDatasetIds = ref<string[]>([])
const showSqlBuilder = ref(false)
const folderName = ref('')
const folderParentId = ref('folder_custom_root')
const moveFolderId = ref('folder_ad')
const canvasAreaRef = ref<HTMLElement | null>(null)
const outputNodeLayout = ref<{ x: number; y: number; initialized: boolean }>({ x: 560, y: 80, initialized: false })
const outputNodeCollapsed = ref(false)
const draggingCanvasNode = ref<
  | { type: 'source'; nodeId: string; offsetX: number; offsetY: number }
  | { type: 'output'; offsetX: number; offsetY: number }
  | null
>(null)
const draggingCanvasField = ref<{ nodeId: string; fieldName: string } | null>(null)
const canvasFieldKeywords = ref<Record<string, string>>({})
const fieldSortMode = ref<'source' | 'semantic' | 'custom'>('source')
const sqlDraft = ref('select user_id, ad_position, count(*) as watch_count, sum(revenue) as revenue from dwd_user_event_di where event_name = "ad_watch_complete" group by user_id, ad_position')
const sqlValidationMessage = ref('尚未校验 SQL。')
const joinTypeDraft = ref<JoinType>('left')
const joinSourceNodeId = ref('')
const joinTargetNodeId = ref('')
const joinLeftField = ref('user_id')
const joinRightField = ref('user_id')
const joinUseIdMapping = ref(true)
const unionTypeDraft = ref<UnionType>('union_all')
const unionNodeIds = ref<string[]>([])
const calcFieldDraft = ref<FieldDraft>({
  name: 'ad_watch_value',
  displayName: '广告观看价值分',
  fieldType: 'decimal',
  expression: 'revenue * 100',
})
const selectedTaskLog = ref<SyncTask | null>(null)
const permissionSubjectType = ref<DatasetPermissionRule['subjectType']>('team')
const permissionSubjectName = ref('运营分析团队')
const permissionLevel = ref<DatasetPermission>('view')
const runtimeParamKey = ref('spark.sql.shuffle.partitions')
const runtimeParamValue = ref('400')
const hasProjectEditPermission = ref(true)

const sectionOptions: Array<{ key: DatasetTreeSection; label: string }> = [
  { key: 'custom', label: '自定义数据集' },
  { key: 'theme', label: '主题数据集' },
  { key: 'recycle', label: '回收站' },
]

const createOptions = computed<DropdownOption[]>(() => [
  {
    label: hasProjectEditPermission.value ? '新建数据集' : '新建数据集（无项目编辑权限）',
    key: 'normal',
    disabled: !hasProjectEditPermission.value,
  },
  {
    label: hasProjectEditPermission.value ? '新建关联数据集' : '新建关联数据集（无项目编辑权限）',
    key: 'associated',
    disabled: !hasProjectEditPermission.value,
  },
  {
    label: hasProjectEditPermission.value ? '新建文件夹' : '新建文件夹（无项目编辑权限）',
    key: 'folder',
    disabled: !hasProjectEditPermission.value,
  },
])

const sourceTypeOptions: Array<{ label: string; value: SourceCreateType; description: string }> = [
  { label: '数据库连接', value: 'database', description: 'ClickHouse、Hive、MySQL 等结构化表。' },
  { label: 'LAS', value: 'las', description: 'LAS 行为宽表和分区表，支持推荐依赖。' },
  { label: '文件', value: 'file', description: 'CSV、Excel、OSS 文件等离线导入。' },
  { label: 'Kafka', value: 'kafka', description: '实时 Topic，可用于抽取模式建模。' },
  { label: '主题数据', value: 'theme', description: 'CDP、数据洞察、GMP 预置主题资产。' },
]

const sensitivityChoiceOptions: Array<SelectOption & { value: SensitivityChoice }> = [
  { label: '涉敏', value: 'sensitive' },
  { label: '不涉敏', value: 'non_sensitive' },
]

const datasetTypeOptions: SelectOption[] = [
  { label: '全部类型', value: 'all' },
  { label: '普通数据集', value: 'normal' },
  { label: '关联数据集', value: 'associated' },
  { label: 'CDP 主题数据集', value: 'theme_cdp' },
  { label: '数据洞察主题数据集', value: 'theme_data_insight' },
  { label: 'GMP 主题数据集', value: 'theme_gmp' },
  { label: 'LAS 数据集', value: 'las' },
]

const statusOptions: SelectOption[] = [
  { label: '全部状态', value: 'all' },
  { label: '草稿', value: 'draft' },
  { label: '已保存', value: 'saved' },
  { label: '同步成功', value: 'sync_success' },
  { label: '同步失败', value: 'sync_failed' },
  { label: '已删除', value: 'deleted' },
]

const ownerOptions = computed<SelectOption[]>(() => {
  const owners = [...new Set(datasets.value.map((item) => item.owner))]
  return [{ label: '全部负责人', value: 'all' }, ...owners.map((owner) => ({ label: owner, value: owner }))]
})

const sourceOptions = computed<SelectOption[]>(() =>
  scopedSourceTables.value.map((table) => ({
    label: `${table.displayName} ${table.tableName}`,
    value: table.id,
    disabled: !table.hasPermission,
  })),
)

const sourceTypeSelectOptions = computed<SelectOption[]>(() =>
  sourceTypeOptions.map((item) => ({
    label: item.label,
    value: item.value,
  })),
)

const availableSourceTables = computed(() =>
  sourceTables.value.filter((table) => sourceCategory(table) === createSourceType.value),
)

const sourceConnectionGroups = computed(() => {
  const mapper = new Map<
    string,
    { connectionId: string; connectionName: string; storageEngine: string; tableCount: number; hasPermission: boolean }
  >()
  availableSourceTables.value.forEach((table) => {
    const current = mapper.get(table.connectionId)
    if (current) {
      current.tableCount += 1
      current.hasPermission = current.hasPermission || table.hasPermission
      return
    }
    mapper.set(table.connectionId, {
      connectionId: table.connectionId,
      connectionName: table.connectionName,
      storageEngine: table.storageEngine,
      tableCount: 1,
      hasPermission: table.hasPermission,
    })
  })
  return [...mapper.values()]
})

const sourceConnectionOptions = computed<SelectOption[]>(() =>
  sourceConnectionGroups.value.map((connection) => ({
    label: `${connection.connectionName} · ${connection.storageEngine} · ${connection.tableCount} 个对象`,
    value: connection.connectionId,
    disabled: !connection.hasPermission,
  })),
)

const sourceDatabaseOptions = computed<SelectOption[]>(() => {
  const selectedConnections = selectedSourceConnectionIds.value.length
    ? selectedSourceConnectionIds.value
    : sourceConnectionGroups.value.map((connection) => connection.connectionId)
  const databases = new Map<string, { label: string; value: string; count: number }>()
  availableSourceTables.value
    .filter((table) => selectedConnections.includes(table.connectionId))
    .forEach((table) => {
      const current = databases.get(table.databaseName)
      if (current) {
        current.count += 1
        return
      }
      databases.set(table.databaseName, {
        label: table.databaseName,
        value: table.databaseName,
        count: 1,
      })
    })
  return [...databases.values()].map((database) => ({
    label: `${database.label} · ${database.count} 个对象`,
    value: database.value,
  }))
})

const scopedSourceTables = computed(() => {
  const selectedConnections = selectedSourceConnectionIds.value.length
    ? selectedSourceConnectionIds.value
    : sourceConnectionGroups.value.map((connection) => connection.connectionId)
  const selectedDatabases = selectedSourceDatabases.value.length
    ? selectedSourceDatabases.value
    : sourceDatabaseOptions.value.map((database) => String(database.value))
  return availableSourceTables.value.filter(
    (table) => selectedConnections.includes(table.connectionId) && selectedDatabases.includes(table.databaseName),
  )
})

const selectedSourceTables = computed(() =>
  selectedSourceTableIds.value.map((sourceId) => sourceTables.value.find((table) => table.id === sourceId)).filter((table): table is SourceTableItem => Boolean(table)),
)

const associationDatasetOptions = computed(() =>
  datasets.value.filter(
    (dataset) =>
      dataset.status !== 'deleted' &&
      dataset.permission !== 'none' &&
      dataset.id !== editorDataset.value?.id &&
      !dataset.readonly,
  ),
)

const associationDatasetSelectOptions = computed<SelectOption[]>(() =>
  associationDatasetOptions.value.map((dataset) => ({
    label: `${dataset.name} · ${datasetTypeText(dataset.datasetType)} · ${dataset.fieldCount} 字段`,
    value: dataset.id,
    disabled: dataset.permission === 'none',
  })),
)

const selectedAssociatedDatasets = computed(() =>
  selectedAssociatedDatasetIds.value
    .map((datasetId) => associationDatasetOptions.value.find((dataset) => dataset.id === datasetId))
    .filter((dataset): dataset is Dataset => Boolean(dataset)),
)

const folderOptions = computed<SelectOption[]>(() =>
  folders.value
    .filter((folder) => folder.section === 'custom')
    .map((folder) => ({
      label: folder.name,
      value: folder.id,
      disabled: folder.readonly,
    })),
)

const dependencyDatasetOptions = computed<SelectOption[]>(() =>
  datasets.value
    .filter((dataset) => dataset.status !== 'deleted' && dataset.id !== (editorDataset.value?.id ?? selectedDataset.value?.id))
    .map((dataset) => ({
      label: dataset.name,
      value: dataset.id,
    })),
)

const semanticOptions: SelectOption[] = [
  { label: '维度', value: 'dimension' },
  { label: '指标', value: 'measure' },
  { label: '时间', value: 'time' },
  { label: '地理', value: 'geo' },
  { label: 'ID', value: 'id' },
]

const aggregationOptions: SelectOption[] = [
  { label: '不聚合', value: 'none' },
  { label: '求和', value: 'sum' },
  { label: '平均值', value: 'avg' },
  { label: '计数', value: 'count' },
  { label: '去重计数', value: 'count_distinct' },
  { label: '最大值', value: 'max' },
  { label: '最小值', value: 'min' },
]

const fieldTypeOptions: SelectOption[] = [
  { label: '字符串', value: 'string' },
  { label: '整数', value: 'integer' },
  { label: '小数', value: 'decimal' },
  { label: '日期', value: 'date' },
  { label: '时间', value: 'datetime' },
  { label: '布尔', value: 'boolean' },
  { label: 'JSON', value: 'json' },
]

const filterOperatorOptions: SelectOption[] = [
  { label: '等于', value: 'equals' },
  { label: '不等于', value: 'not_equals' },
  { label: '包含', value: 'contains' },
  { label: '属于', value: 'in' },
  { label: '大于', value: 'gt' },
  { label: '大于等于', value: 'gte' },
  { label: '小于', value: 'lt' },
  { label: '小于等于', value: 'lte' },
  { label: '区间', value: 'between' },
  { label: '过去 N 天', value: 'last_n_days' },
]

const frequencyOptions: SelectOption[] = [
  { label: '手动同步', value: 'manual' },
  { label: '每小时', value: 'hourly' },
  { label: '每天', value: 'daily' },
  { label: '每周', value: 'weekly' },
  { label: '每月', value: 'monthly' },
  { label: 'Cron 表达式', value: 'cron' },
]

const permissionSubjectTypeOptions: SelectOption[] = [
  { label: '用户', value: 'user' },
  { label: '团队', value: 'team' },
  { label: '角色', value: 'role' },
]

const permissionLevelOptions: SelectOption[] = [
  { label: '预览', value: 'read_preview' },
  { label: '查看', value: 'view' },
  { label: '编辑', value: 'edit' },
  { label: '管理', value: 'admin' },
]

const fieldSortOptions: SelectOption[] = [
  { label: '数据源顺序', value: 'source' },
  { label: '先维度后指标', value: 'semantic' },
  { label: '自定义顺序', value: 'custom' },
]

const filteredDatasets = computed(() =>
  datasets.value.filter((dataset) => {
    if (dataset.section !== section.value) {
      return false
    }
    if (typeFilter.value !== 'all' && dataset.datasetType !== typeFilter.value) {
      return false
    }
    if (statusFilter.value !== 'all' && dataset.status !== statusFilter.value) {
      return false
    }
    if (ownerFilter.value !== 'all' && dataset.owner !== ownerFilter.value) {
      return false
    }
    const normalized = keyword.value.trim().toLowerCase()
    if (!normalized) {
      return true
    }
    return [dataset.name, dataset.description, dataset.owner, ...dataset.tags].some((item) =>
      item.toLowerCase().includes(normalized),
    )
  }),
)

const selectedDataset = computed(() => datasets.value.find((dataset) => dataset.id === selectedDatasetId.value) ?? null)

const selectedFolder = computed(() =>
  selectedDataset.value ? folders.value.find((folder) => folder.id === selectedDataset.value?.folderId) : null,
)

const selectedEdge = computed(() => model.value?.edges.find((edge) => edge.id === selectedEdgeId.value) ?? null)

const modelNodeOptions = computed<SelectOption[]>(() =>
  (model.value?.nodes ?? []).map((node) => ({
    label: `${node.alias} ${node.tableName ?? node.datasetId ?? ''}`,
    value: node.id,
  })),
)

const leftJoinFieldOptions = computed<SelectOption[]>(() => {
  const edge = selectedEdge.value
  const nodeId = edge?.sourceNodeId ?? joinSourceNodeId.value
  const node = nodeId ? model.value?.nodes.find((item) => item.id === nodeId) : model.value?.nodes[0]
  return nodeFieldOptions(node)
})

const rightJoinFieldOptions = computed<SelectOption[]>(() => {
  const edge = selectedEdge.value
  const nodeId = edge?.targetNodeId ?? joinTargetNodeId.value
  const node = nodeId ? model.value?.nodes.find((item) => item.id === nodeId) : model.value?.nodes[1]
  return nodeFieldOptions(node)
})

const outputFieldOptions = computed<SelectOption[]>(() =>
  (model.value?.outputFields ?? []).map((field) => ({
    label: `${field.displayName} ${field.name}`,
    value: field.name,
  })),
)

const selectedUnionNodes = computed(() =>
  unionNodeIds.value.map((nodeId) => nodeById(nodeId)).filter((node): node is ModelNode => Boolean(node)),
)

const modelValidationItems = computed(() => {
  const items: Array<{ type: NoticeType; text: string }> = []
  if (!editorDataset.value?.name.trim()) {
    items.push({ type: 'error', text: '数据集名称不能为空。' })
  }
  if (!model.value || model.value.nodes.length === 0) {
    items.push({ type: 'error', text: '至少需要加入一个来源节点。' })
  }
  const fields = model.value?.outputFields ?? []
  if (fields.filter((field) => field.visible).length === 0) {
    items.push({ type: 'error', text: '至少需要保留一个可展示字段。' })
  }
  if (new Set(fields.map((field) => field.name)).size !== fields.length) {
    items.push({ type: 'error', text: '输出字段名不能重复。' })
  }
  ;(model.value?.edges ?? []).forEach((edge) => {
    if (edge.relationType === 'join' && !edge.joinConfig?.conditions.length) {
      items.push({ type: 'error', text: '存在未配置 Join 条件的关联关系。' })
    }
    if (
      edge.relationType === 'union' &&
      (edge.unionConfig?.fieldMappings.some((mapping) => Object.values(mapping.sourceFieldMap).every((value) => !value)) ?? true)
    ) {
      items.push({ type: 'error', text: 'Union 输出字段至少需要一个来源字段。' })
    }
    if (edge.relationType === 'union' && edge.unionConfig?.fieldMappings.some((mapping) => !mapping.compatible)) {
      items.push({ type: 'warning', text: 'Union 存在类型不完全一致的字段映射，请确认是否允许按目标类型转换。' })
    }
  })
  ;(model.value?.nodes ?? []).forEach((node) => {
    if (node.type === 'custom_sql' && !node.sqlConfig?.validated) {
      items.push({ type: 'error', text: `SQL 节点「${node.alias}」尚未校验通过。` })
    }
    if (node.status === 'permission_denied') {
      items.push({ type: 'error', text: `来源「${node.alias}」缺少数据权限。` })
    }
  })
  if ((model.value?.nodes ?? []).some((node) => node.selectedFields.some((field) => field.isPartitionField))) {
    items.push({ type: 'info', text: '检测到分区字段，可在同步设置中启用系统推荐依赖。' })
  }
  if (items.length === 0) {
    items.push({ type: 'success', text: '模型配置完整，可以预览或保存。' })
  }
  return items
})

const visiblePreviewColumns = computed<DataTableColumns<DatasetPreviewRow>>(() => {
  const fields = previewResult.value?.fields ?? model.value?.outputFields ?? []
  return fields
    .filter((field) => field.visible)
    .slice(0, 8)
    .map((field) => ({
      title: field.displayName,
      key: field.name,
      minWidth: 130,
      ellipsis: { tooltip: true },
    }))
})

function sourceCategory(source: SourceTableItem): SourceCreateType {
  if (source.storageEngine === 'las') {
    return 'las'
  }
  if (source.tableType === 'file') {
    return 'file'
  }
  if (source.tableType === 'topic' || source.storageEngine === 'kafka') {
    return 'kafka'
  }
  return 'database'
}

function resetSourceScope(): void {
  const connections = sourceConnectionGroups.value.filter((connection) => connection.hasPermission)
  selectedSourceConnectionIds.value = connections.slice(0, 2).map((connection) => connection.connectionId)
  if (selectedSourceConnectionIds.value.length === 0) {
    selectedSourceConnectionIds.value = sourceConnectionGroups.value.slice(0, 1).map((connection) => connection.connectionId)
  }
  selectedSourceDatabases.value = sourceDatabaseOptions.value.slice(0, 2).map((database) => String(database.value))
  const nextTables = scopedSourceTables.value.filter((source) => source.hasPermission)
  selectedSourceTableIds.value = nextTables.slice(0, 2).map((source) => source.id)
  createSourceId.value = selectedSourceTableIds.value[0] ?? nextTables[0]?.id ?? scopedSourceTables.value[0]?.id ?? ''
}

function updateSourceConnections(value: Array<string | number>): void {
  selectedSourceConnectionIds.value = value.map(String)
  const availableDatabases = new Set(sourceDatabaseOptions.value.map((database) => String(database.value)))
  selectedSourceDatabases.value = selectedSourceDatabases.value.filter((database) => availableDatabases.has(database))
  if (selectedSourceDatabases.value.length === 0) {
    selectedSourceDatabases.value = sourceDatabaseOptions.value.slice(0, 2).map((database) => String(database.value))
  }
  syncSelectedSourceTables()
}

function updateSourceDatabases(value: Array<string | number>): void {
  selectedSourceDatabases.value = value.map(String)
  syncSelectedSourceTables()
}

function updateSelectedSourceTables(value: Array<string | number>): void {
  selectedSourceTableIds.value = value.map(String)
  createSourceId.value = selectedSourceTableIds.value[0] ?? ''
  syncSourceSelectionToCanvas()
}

async function updateSelectedAssociatedDatasets(value: Array<string | number>): Promise<void> {
  selectedAssociatedDatasetIds.value = value.map(String)
  await syncAssociatedDatasetSelectionToCanvas()
}

function updateSourceType(value: string | number): void {
  selectCreateSourceType(String(value) as SourceCreateType)
}

function syncSelectedSourceTables(): void {
  const availableIds = new Set(scopedSourceTables.value.map((table) => table.id))
  selectedSourceTableIds.value = selectedSourceTableIds.value.filter((sourceId) => availableIds.has(sourceId))
  if (selectedSourceTableIds.value.length === 0) {
    selectedSourceTableIds.value = scopedSourceTables.value.filter((source) => source.hasPermission).slice(0, 2).map((source) => source.id)
  }
  createSourceId.value = selectedSourceTableIds.value[0] ?? scopedSourceTables.value[0]?.id ?? ''
  syncSourceSelectionToCanvas()
}

function sourceTableKey(source: SourceTableItem): string {
  return `${source.connectionId}::${source.databaseName}::${source.tableName}`
}

function nodeSourceTableKey(node: ModelNode): string {
  return node.type === 'table' && node.connectionId && node.databaseName && node.tableName
    ? `${node.connectionId}::${node.databaseName}::${node.tableName}`
    : ''
}

function removeCanvasNodes(nodeIds: string[]): void {
  if (!model.value || nodeIds.length === 0) {
    return
  }
  const removedIds = new Set(nodeIds)
  model.value.nodes = model.value.nodes.filter((node) => !removedIds.has(node.id))
  model.value.edges = model.value.edges.filter((edge) => !removedIds.has(edge.sourceNodeId) && !removedIds.has(edge.targetNodeId))
  model.value.outputFields = model.value.outputFields.filter((field) => !removedIds.has(field.sourceNodeId ?? ''))
  if (selectedNodeId.value && removedIds.has(selectedNodeId.value)) {
    selectedNodeId.value = model.value.nodes[0]?.id ?? ''
  }
  if (selectedEdgeId.value && !model.value.edges.some((edge) => edge.id === selectedEdgeId.value)) {
    selectedEdgeId.value = model.value.edges[0]?.id ?? ''
  }
}

function syncSourceSelectionToCanvas(): void {
  if (viewMode.value !== 'editor' || !model.value || editorDataset.value?.sourceMode === 'associated') {
    return
  }
  const selectedSources = selectedSourceTables.value
  const selectedKeys = new Set(selectedSources.map(sourceTableKey))
  const tableNodes = model.value.nodes.filter((node) => node.type === 'table')
  removeCanvasNodes(tableNodes.filter((node) => !selectedKeys.has(nodeSourceTableKey(node))).map((node) => node.id))

  const existingKeys = new Set(model.value.nodes.map(nodeSourceTableKey).filter(Boolean))
  let addedCount = 0
  let deniedCount = 0
  selectedSources.forEach((source) => {
    if (!source.hasPermission) {
      deniedCount += 1
      return
    }
    if (!existingKeys.has(sourceTableKey(source))) {
      addSourceNode(source, { silent: true })
      existingKeys.add(sourceTableKey(source))
      addedCount += 1
    }
  })
  if (addedCount > 0 && model.value.nodes.filter((node) => node.type === 'table').length > 1) {
    autoJoinSameNameFields()
  }
  if (deniedCount > 0) {
    setNotice('warning', `有 ${deniedCount} 个对象没有可用权限，未加入画布。`)
    return
  }
  setNotice('success', selectedSources.length > 0 ? '数据来源已同步到模型画布。' : '已清空数据来源，模型画布同步移除来源节点。')
}

async function syncAssociatedDatasetSelectionToCanvas(): Promise<void> {
  if (viewMode.value !== 'editor' || !model.value || editorDataset.value?.sourceMode !== 'associated') {
    return
  }
  const selectedDatasets = selectedAssociatedDatasets.value
  const selectedIds = new Set(selectedDatasets.map((dataset) => dataset.id))
  const datasetNodes = model.value.nodes.filter((node) => node.type === 'dataset' || node.type === 'theme_dataset')
  removeCanvasNodes(datasetNodes.filter((node) => !selectedIds.has(node.datasetId ?? '')).map((node) => node.id))

  const existingIds = new Set(model.value.nodes.map((node) => node.datasetId).filter((datasetId): datasetId is string => Boolean(datasetId)))
  for (const dataset of selectedDatasets) {
    if (!existingIds.has(dataset.id)) {
      await addDatasetNode(dataset, { silent: true })
      existingIds.add(dataset.id)
    }
  }
  if (selectedDatasets.length > 1) {
    autoJoinSameNameFields()
  }
  setNotice('success', selectedDatasets.length > 0 ? '关联数据集已同步到模型画布。' : '已清空关联数据集，模型画布同步移除关联节点。')
}

function syncSourceSelectionFromCanvas(): void {
  const nodes = model.value?.nodes ?? []
  const tableSourceIds = nodes
    .filter((node) => node.type === 'table')
    .map((node) => sourceTables.value.find((source) => nodeSourceTableKey(node) === sourceTableKey(source))?.id)
    .filter((sourceId): sourceId is string => Boolean(sourceId))
  if (tableSourceIds.length > 0) {
    selectedSourceTableIds.value = tableSourceIds
    const selectedSources = selectedSourceTables.value
    selectedSourceConnectionIds.value = [...new Set(selectedSources.map((source) => source.connectionId))]
    selectedSourceDatabases.value = [...new Set(selectedSources.map((source) => source.databaseName))]
    createSourceId.value = tableSourceIds[0] ?? ''
  }
  selectedAssociatedDatasetIds.value = nodes
    .map((node) => node.datasetId)
    .filter((datasetId): datasetId is string => Boolean(datasetId))
}

function nodeFieldOptions(node?: ModelNode): SelectOption[] {
  return (node?.selectedFields ?? []).map((field) => ({
    label: `${field.displayName} ${field.name}`,
    value: field.name,
  }))
}

function nodeAvailableFields(node: ModelNode): SourceField[] {
  const source = sourceTables.value.find((table) => table.tableName === node.tableName && table.connectionId === node.connectionId)
  return source?.fields ?? node.selectedFields
}

function nodeById(nodeId: string): ModelNode | undefined {
  return model.value?.nodes.find((node) => node.id === nodeId)
}

function nodeLabel(nodeId: string): string {
  return nodeById(nodeId)?.alias ?? '未知节点'
}

function fieldLabel(nodeId: string, fieldName: string): string {
  const field = nodeById(nodeId)?.selectedFields.find((item) => item.name === fieldName)
  return field ? `${field.displayName} ${field.name}` : fieldName
}

function isCanvasNodeExpanded(nodeId: string): boolean {
  return !collapsedCanvasNodeIds.value.includes(nodeId)
}

function toggleCanvasNodeFields(nodeId: string): void {
  if (collapsedCanvasNodeIds.value.includes(nodeId)) {
    collapsedCanvasNodeIds.value = collapsedCanvasNodeIds.value.filter((id) => id !== nodeId)
    return
  }
  collapsedCanvasNodeIds.value = [...collapsedCanvasNodeIds.value, nodeId]
}

function isFieldLinkDraft(nodeId: string, fieldName: string): boolean {
  return fieldLinkDraft.value?.nodeId === nodeId && fieldLinkDraft.value.fieldName === fieldName
}

function canvasNodeFields(node: ModelNode): SourceField[] {
  const normalized = (canvasFieldKeywords.value[node.id] ?? '').trim().toLowerCase()
  if (!normalized) {
    return node.selectedFields
  }
  return node.selectedFields.filter((field) =>
    [field.name, field.displayName, field.fieldType].some((value) => value.toLowerCase().includes(normalized)),
  )
}

function fieldPortY(node: ModelNode, fieldName: string): number {
  const fields = canvasNodeFields(node)
  const index = Math.max(
    0,
    fields.findIndex((field) => field.name === fieldName),
  )
  return node.position.y + (isCanvasNodeExpanded(node.id) ? 126 + index * 35 : 58)
}

const visibleOutputFields = computed(() => (model.value?.outputFields ?? []).filter((field) => field.visible))

function defaultOutputNodePosition(): { x: number; y: number } {
  const nodes = model.value?.nodes ?? []
  if (nodes.length === 0) {
    return { x: 440, y: 112 }
  }
  const maxX = Math.max(...nodes.map((node) => node.position.x))
  const minY = Math.min(...nodes.map((node) => node.position.y))
  return { x: Math.max(maxX + 360, 560), y: Math.max(minY, 80) }
}

function resetOutputNodeLayout(): void {
  const position = defaultOutputNodePosition()
  outputNodeLayout.value = { ...position, initialized: true }
  outputNodeCollapsed.value = false
}

function outputNodePosition(): { x: number; y: number } {
  if (!outputNodeLayout.value.initialized) {
    return defaultOutputNodePosition()
  }
  return { x: outputNodeLayout.value.x, y: outputNodeLayout.value.y }
}

function isOutputNodeExpanded(): boolean {
  return !outputNodeCollapsed.value
}

function toggleOutputNodeFields(): void {
  outputNodeCollapsed.value = !outputNodeCollapsed.value
}

function nextCanvasNodePosition(index: number): { x: number; y: number } {
  const column = index % 3
  const row = Math.floor(index / 3)
  return {
    x: 80 + column * 360,
    y: 96 + row * 300,
  }
}

const joinLineSegments = computed(() => {
  const segments: Array<{
    id: string
    edgeId: string
    label: string
    x1: number
    y1: number
    x2: number
    y2: number
  }> = []
  ;(model.value?.edges ?? []).forEach((edge) => {
    if (edge.relationType !== 'join' || !edge.joinConfig) {
      return
    }
    const source = nodeById(edge.sourceNodeId)
    const target = nodeById(edge.targetNodeId)
    if (!source || !target) {
      return
    }
    edge.joinConfig.conditions.forEach((condition) => {
      segments.push({
        id: condition.id,
        edgeId: edge.id,
        label: `${condition.leftField} = ${condition.rightField}`,
        x1: source.position.x + 284,
        y1: fieldPortY(source, condition.leftField),
        x2: target.position.x,
        y2: fieldPortY(target, condition.rightField),
      })
    })
  })
  return segments
})

const outputLineSegments = computed(() => {
  const output = outputNodePosition()
  const outputPortY = output.y + (isOutputNodeExpanded() ? 62 : 52)
  return (model.value?.nodes ?? []).map((node) => ({
    id: `output_${node.id}`,
    x1: node.position.x + 284,
    y1: node.position.y + 54,
    x2: output.x,
    y2: outputPortY,
  }))
})

function edgeSummary(edge: ModelEdge): string {
  if (edge.relationType === 'join') {
    const condition = edge.joinConfig?.conditions[0]
    return condition
      ? `${nodeLabel(edge.sourceNodeId)}.${condition.leftField} = ${nodeLabel(edge.targetNodeId)}.${condition.rightField}`
      : '未配置 Join 条件'
  }
  const mappingCount = edge.unionConfig?.fieldMappings.length ?? 0
  return `${nodeLabel(edge.sourceNodeId)} + ${nodeLabel(edge.targetNodeId)} · ${mappingCount} 个字段映射`
}

function uniqueNodeAlias(baseName: string): string {
  const base = baseName.trim() || '未命名节点'
  const usedAliases = new Set((model.value?.nodes ?? []).map((node) => node.alias))
  if (!usedAliases.has(base)) {
    return base
  }
  let index = 2
  while (usedAliases.has(`${base}_${index}`)) {
    index += 1
  }
  return `${base}_${index}`
}

function datasetFieldToSourceField(field: DatasetField): SourceField {
  return {
    id: field.id,
    name: field.name,
    displayName: field.displayName,
    fieldType: field.fieldType,
    description: field.description,
    isPrimaryKey: field.isPrimaryKey,
    isPartitionField: field.isPartitionField,
  }
}

async function datasetToNode(dataset: Dataset, index: number): Promise<ModelNode> {
  const datasetModel = await datasetService.getDatasetModel(dataset.id)
  const selectedFields = datasetModel.outputFields.map(datasetFieldToSourceField)
  return {
    id: `node_dataset_${dataset.id}_${Date.now()}`,
    type: dataset.section === 'theme' ? 'theme_dataset' : 'dataset',
    alias: uniqueNodeAlias(dataset.name),
    sourceMode: dataset.sourceMode,
    connectionId: dataset.connectionId,
    connectionName: dataset.connectionName,
    databaseName: dataset.databaseName,
    tableName: dataset.tableName,
    datasetId: dataset.id,
    selectedFields,
    preFilters: [createDefaultFilterForFields(selectedFields)],
    position: nextCanvasNodePosition(index),
    status: dataset.permission === 'none' ? 'permission_denied' : 'normal',
  }
}

function setNotice(type: NoticeType, text: string): void {
  notice.value = { type, text }
}

function statusText(status: Dataset['status']): string {
  const mapper: Record<Dataset['status'], string> = {
    draft: '草稿',
    editing: '编辑中',
    validating: '校验中',
    saved: '已保存',
    syncing: '同步中',
    sync_success: '同步成功',
    sync_failed: '同步失败',
    disabled: '已停用',
    deleted: '已删除',
  }
  return mapper[status]
}

function statusTagType(status: Dataset['status']): 'default' | 'info' | 'success' | 'warning' | 'error' {
  if (status === 'sync_success' || status === 'saved') {
    return 'success'
  }
  if (status === 'sync_failed' || status === 'deleted') {
    return 'error'
  }
  if (status === 'draft' || status === 'syncing') {
    return 'warning'
  }
  return 'default'
}

function datasetTypeText(type: Dataset['datasetType']): string {
  const mapper: Record<Dataset['datasetType'], string> = {
    normal: '普通数据集',
    associated: '关联数据集',
    theme_cdp: 'CDP 主题',
    theme_data_insight: '数据洞察主题',
    theme_gmp: 'GMP 主题',
    las: 'LAS 数据集',
  }
  return mapper[type]
}

function formatNumber(value: number): string {
  return value.toLocaleString('zh-CN')
}

async function loadBaseData(): Promise<void> {
  loading.value = true
  try {
    const [folderList, datasetList, sourceList] = await Promise.all([
      datasetService.listFolders(),
      datasetService.listDatasets(),
      datasetService.listSourceTables(),
    ])
    folders.value = folderList
    datasets.value = datasetList
    sourceTables.value = sourceList
    resetSourceScope()
    if (!selectedDataset.value && datasetList.length > 0) {
      const firstDataset = datasetList[0]
      if (firstDataset) {
        selectedDatasetId.value = firstDataset.id
      }
    }
    const routeDatasetId = typeof route.query.datasetId === 'string' ? route.query.datasetId : ''
    if (routeDatasetId && datasetList.some((dataset) => dataset.id === routeDatasetId)) {
      selectedDatasetId.value = routeDatasetId
    }
    await loadSelectedDataset()
    if (routeDatasetId) {
      const dataset = datasets.value.find((item) => item.id === routeDatasetId)
      if (dataset) {
        await openEditor(dataset)
      }
    } else if (route.path.endsWith('/create')) {
      showCreateModal.value = true
    }
  } finally {
    loading.value = false
  }
}

async function loadSelectedDataset(): Promise<void> {
  if (!selectedDatasetId.value) {
    return
  }
  const datasetId = selectedDatasetId.value
  const [datasetModel, config, tasks, permissions, masks, lineage] = await Promise.all([
    datasetService.getDatasetModel(datasetId),
    datasetService.getSyncConfig(datasetId),
    datasetService.listSyncTasks(datasetId),
    datasetService.listPermissionRules(datasetId),
    datasetService.listMaskRules(datasetId),
    datasetService.getLineage(),
  ])
  model.value = datasetModel
  resetOutputNodeLayout()
  syncConfig.value = config
  syncTasks.value = tasks
  permissionRules.value = permissions
  maskRules.value = masks
  lineageNodes.value = lineage.nodes
  lineageEdges.value = lineage.edges
  previewResult.value = await datasetService.previewModel(datasetModel)
}

async function selectDataset(dataset: Dataset): Promise<void> {
  selectedDatasetId.value = dataset.id
  activeDetailTab.value = dataset.status === 'deleted' ? 'basic' : 'preview'
  await loadSelectedDataset()
}

async function refreshList(): Promise<void> {
  datasets.value = await datasetService.listDatasets()
  await loadSelectedDataset()
  setNotice('success', '数据集列表已刷新。')
}

function handleCreateOption(key: string | number): void {
  if (!hasProjectEditPermission.value) {
    setNotice('warning', '当前账号没有项目编辑权限，不能新建数据集。')
    return
  }
  if (key === 'folder') {
    showFolderModal.value = true
    return
  }
  createType.value = key === 'associated' ? 'associated' : 'normal'
  createName.value = createType.value === 'associated' ? '低金币行为关联数据集' : '广告观看明细数据集'
  createSensitivityChoice.value = null
  createSourceType.value = 'database'
  selectedAssociatedDatasetIds.value =
    createType.value === 'associated' ? associationDatasetOptions.value.slice(0, 2).map((dataset) => dataset.id) : []
  resetSourceScope()
  showCreateModal.value = true
}

async function confirmCreate(): Promise<void> {
  const source = sourceTables.value.find((item) => item.id === createSourceId.value)
  const normalSources = selectedSourceTables.value.length ? selectedSourceTables.value : source ? [source] : []
  if (!createName.value.trim()) {
    setNotice('warning', '请输入数据集名称。')
    return
  }
  if (createType.value === 'normal' && !createSensitivityChoice.value) {
    setNotice('warning', '保存数据集前必须选择涉敏或不涉敏。')
    return
  }
  if (createType.value === 'normal') {
    if (normalSources.length === 0) {
      setNotice('warning', '请选择一个可用数据来源。')
      return
    }
    const deniedSource = normalSources.find((item) => !item.hasPermission)
    if (deniedSource) {
      openPermissionModal(deniedSource.displayName)
      return
    }
  }
  const result = await datasetService.createDraft({
    name: createName.value,
    datasetType: createType.value,
    sourceMode: createType.value === 'associated' ? 'associated' : createSourceMode.value,
    connectionId: source?.connectionId,
    folderId: 'folder_ad',
    sensitivityChoice: createType.value === 'normal' ? createSensitivityChoice.value ?? undefined : undefined,
    sourceDatasetIds: createType.value === 'associated' ? selectedAssociatedDatasetIds.value : undefined,
  })
  editorDataset.value = result.dataset
  if (createType.value === 'associated') {
    const relatedDatasets = selectedAssociatedDatasets.value.length
      ? selectedAssociatedDatasets.value
      : associationDatasetOptions.value.slice(0, 2)
    const datasetNodes = await Promise.all(relatedDatasets.map((dataset, index) => datasetToNode(dataset, index)))
    if (datasetNodes.length >= 2) {
      const [leftNode, rightNode] = datasetNodes
      model.value = {
        ...result.model,
        nodes: datasetNodes,
        edges:
          leftNode && rightNode
            ? [
                {
                  id: `edge_associated_${Date.now()}`,
                  sourceNodeId: leftNode.id,
                  targetNodeId: rightNode.id,
                  relationType: 'join',
                  status: 'normal',
                  joinConfig: {
                    joinType: 'left',
                    conditions: [
                      {
                        id: `join_associated_${Date.now()}`,
                        leftField: 'user_id',
                        rightField: 'user_id',
                        operator: 'equals',
                        useIdMapping: true,
                      },
                    ],
                    expression: `${leftNode.alias}.user_id = ${rightNode.alias}.user_id`,
                    idMappingEnabled: true,
                  },
                },
              ]
            : [],
        outputFields: datasetNodes.flatMap((node) => node.selectedFields.map((field) => sourceFieldToOutput(field, node.id))),
      }
    } else {
      model.value = result.model
    }
  } else {
    model.value = {
      ...result.model,
      nodes: [],
      edges: [],
      outputFields: [],
    }
    normalSources.forEach((item) => addSourceNode(item))
    if (normalSources.length > 1) {
      autoJoinSameNameFields()
    }
  }
  syncConfig.value = await datasetService.getSyncConfig(result.dataset.id)
  resetOutputNodeLayout()
  previewResult.value = await datasetService.previewModel(model.value)
  selectedDatasetId.value = result.dataset.id
  selectedNodeId.value = model.value.nodes[0]?.id ?? ''
  activeEditorStep.value = 'source'
  viewMode.value = 'editor'
  showCreateModal.value = false
  await refreshList()
  setNotice('success', '已创建数据集草稿，可以继续配置模型、字段和同步规则。')
}

async function confirmCreateFolder(): Promise<void> {
  if (!folderName.value.trim()) {
    setNotice('warning', '请输入文件夹名称。')
    return
  }
  await datasetService.createFolder(folderName.value.trim(), 'custom', folderParentId.value)
  folders.value = await datasetService.listFolders()
  folderName.value = ''
  showFolderModal.value = false
  setNotice('success', '文件夹已创建。')
}

async function openEditor(dataset?: Dataset): Promise<void> {
  const target = dataset ?? selectedDataset.value
  if (!target) {
    return
  }
  if (target.readonly) {
    setNotice('warning', '主题数据集为系统只读资产，不能编辑，可用于关联数据集建模。')
    return
  }
  editorDataset.value = { ...target, status: 'editing' }
  model.value = await datasetService.getDatasetModel(target.id)
  ensureInitialNodePreFilters()
  resetOutputNodeLayout()
  syncSourceSelectionFromCanvas()
  syncConfig.value = await datasetService.getSyncConfig(target.id)
  previewResult.value = await datasetService.previewModel(model.value)
  selectedNodeId.value = model.value.nodes[0]?.id ?? ''
  selectedEdgeId.value = model.value.edges[0]?.id ?? ''
  activeEditorStep.value = 'source'
  viewMode.value = 'editor'
  setNotice('info', '已进入数据集编辑器，修改后请预览并保存。')
}

function closeEditor(): void {
  if (route.path.endsWith('/create')) {
    void router.push('/metadata/datasets')
    return
  }
  viewMode.value = 'list'
  editorDataset.value = null
  loadSelectedDataset()
}

async function saveEditor(): Promise<void> {
  if (!editorDataset.value || !model.value) {
    return
  }
  const validationError = validateEditor()
  if (validationError) {
    setNotice('warning', validationError)
    return
  }
  const saved = await datasetService.saveDataset(editorDataset.value, model.value, syncConfig.value ?? undefined)
  selectedDatasetId.value = saved.id
  await refreshList()
  if (route.path.endsWith('/create')) {
    await router.push('/metadata/datasets')
  } else {
    viewMode.value = 'list'
  }
  setNotice('success', `数据集「${saved.name}」已保存，并生成可预览结果。`)
}

function validateEditor(): string {
  if (!editorDataset.value?.name.trim()) {
    return '数据集名称不能为空。'
  }
  if (
    editorDataset.value.sourceMode !== 'associated' &&
    (!editorDataset.value.sensitivityLevel || editorDataset.value.sensitivityLevel === 'unclassified')
  ) {
    return '请先完成涉敏定级。'
  }
  if (!model.value || model.value.nodes.length === 0) {
    return '请至少添加一个来源节点。'
  }
  const visibleFields = model.value.outputFields.filter((field) => field.visible)
  if (visibleFields.length === 0) {
    return '请至少保留一个输出字段。'
  }
  const fieldNames = model.value.outputFields.map((field) => field.name)
  if (new Set(fieldNames).size !== fieldNames.length) {
    return '输出字段名不能重复。'
  }
  const invalidJoin = model.value.edges.find(
    (edge) =>
      edge.relationType === 'join' &&
      (!edge.joinConfig?.conditions.length ||
        edge.joinConfig.conditions.some((condition) => !condition.leftField || !condition.rightField)),
  )
  if (invalidJoin) {
    return '所有 Join 关系都必须配置完整关联字段。'
  }
  const invalidUnion = model.value.edges.find(
    (edge) =>
      edge.relationType === 'union' &&
      (edge.unionConfig?.fieldMappings.some((mapping) => Object.values(mapping.sourceFieldMap).every((value) => !value)) ?? true),
  )
  if (invalidUnion) {
    return 'Union 输出字段至少需要一个来源字段。'
  }
  const invalidSqlNode = model.value.nodes.find((node) => node.type === 'custom_sql' && !node.sqlConfig?.validated)
  if (invalidSqlNode) {
    return `SQL 节点「${invalidSqlNode.alias}」尚未校验通过。`
  }
  const noPermissionNode = model.value.nodes.find((node) => node.status === 'permission_denied')
  if (noPermissionNode) {
    return `来源「${noPermissionNode.alias}」缺少数据权限。`
  }
  if (editorDataset.value.sourceMode === 'extract' && !syncConfig.value?.enabled) {
    return '抽取数据集必须配置同步策略。'
  }
  return ''
}

async function copySelectedDataset(dataset?: Dataset): Promise<void> {
  const target = dataset ?? selectedDataset.value
  if (!target) {
    return
  }
  if (target.readonly) {
    setNotice('warning', '主题数据集不能复制为自定义资产，请使用“新建关联数据集”。')
    return
  }
  const copied = await datasetService.copyDataset(target.id)
  selectedDatasetId.value = copied.id
  await refreshList()
  setNotice('success', `已复制为「${copied.name}」。`)
}

async function confirmDelete(): Promise<void> {
  const dataset = selectedDataset.value
  if (!dataset) {
    return
  }
  if (dataset.status === 'deleted') {
    await datasetService.permanentDeleteDataset(dataset.id)
    setNotice('success', '数据集已彻底删除。')
  } else {
    await datasetService.deleteDataset(dataset.id)
    setNotice('success', `已将「${dataset.name}」移入回收站。`)
  }
  showDeleteModal.value = false
  await refreshList()
}

async function restoreSelectedDataset(): Promise<void> {
  const dataset = selectedDataset.value
  if (!dataset) {
    return
  }
  await datasetService.restoreDataset(dataset.id)
  section.value = 'custom'
  await refreshList()
  setNotice('success', `已恢复「${dataset.name}」。`)
}

function openMoveDataset(): void {
  const dataset = selectedDataset.value
  if (!dataset) {
    return
  }
  if (dataset.readonly || dataset.status === 'deleted') {
    setNotice('warning', '当前数据集不能移动。')
    return
  }
  moveFolderId.value = dataset.folderId
  showMoveModal.value = true
}

async function confirmMoveDataset(): Promise<void> {
  const dataset = selectedDataset.value
  if (!dataset) {
    return
  }
  const moved = await datasetService.moveDataset(dataset.id, moveFolderId.value)
  selectedDatasetId.value = moved.id
  showMoveModal.value = false
  await refreshList()
  setNotice('success', `已将「${moved.name}」移动到新的文件夹。`)
}

async function requestDatasetPermission(): Promise<void> {
  const dataset = selectedDataset.value
  if (!dataset) {
    return
  }
  await datasetService.requestPermission(dataset.id)
  showPermissionModal.value = false
  await refreshList()
  setNotice('success', '权限申请已提交，Demo 中已临时授予预览权限。')
}

async function addPermissionRule(): Promise<void> {
  const dataset = selectedDataset.value
  if (!dataset) {
    return
  }
  const subjectName = permissionSubjectName.value.trim()
  if (!subjectName) {
    setNotice('warning', '请输入授权对象。')
    return
  }
  await datasetService.savePermissionRule({
    id: `perm_${Date.now()}`,
    datasetId: dataset.id,
    subjectType: permissionSubjectType.value,
    subjectName,
    permission: permissionLevel.value,
    rowRule: 'coin_balance_level = low',
    columnRule: '手机号、支付金额脱敏',
  })
  permissionRules.value = await datasetService.listPermissionRules(dataset.id)
  setNotice('success', `已为「${subjectName}」新增数据集权限。`)
}

function openPermissionModal(sourceName?: string): void {
  setNotice('warning', sourceName ? `当前没有「${sourceName}」权限，可发起申请。` : '当前没有操作权限，可发起申请。')
  showPermissionModal.value = true
}

async function previewCurrentModel(): Promise<void> {
  if (!model.value) {
    return
  }
  previewResult.value = await datasetService.previewModel(model.value)
  activeEditorStep.value = 'preview'
  setNotice('success', `预览已生成，共 ${previewResult.value.sampleSize} 条抽样记录。`)
}

function addSourceNode(source: SourceTableItem, options?: { silent?: boolean }): void {
  if (!model.value) {
    return
  }
  if (!source.hasPermission) {
    openPermissionModal(source.displayName)
    return
  }
  const node: ModelNode = {
    id: `node_${source.id}_${Date.now()}`,
    type: 'table',
    alias: uniqueNodeAlias(source.displayName),
    sourceMode: source.sourceMode,
    connectionId: source.connectionId,
    connectionName: source.connectionName,
    databaseName: source.databaseName,
    tableName: source.tableName,
    selectedFields: [...source.fields],
    preFilters: [createDefaultFilterForFields(source.fields)],
    position: nextCanvasNodePosition(model.value.nodes.length),
    status: 'normal',
  }
  model.value.nodes.push(node)
  model.value.outputFields.push(...source.fields.map((field) => sourceFieldToOutput(field, node.id)))
  selectedNodeId.value = node.id
  if (!options?.silent) {
    setNotice('success', `已将「${source.displayName}」加入模型画布。`)
  }
}

async function addDatasetNode(dataset: Dataset, options?: { silent?: boolean }): Promise<void> {
  if (!model.value) {
    return
  }
  if (dataset.permission === 'none') {
    openPermissionModal(dataset.name)
    return
  }
  const node = await datasetToNode(dataset, model.value.nodes.length)
  model.value.nodes.push(node)
  model.value.outputFields.push(...node.selectedFields.map((field) => sourceFieldToOutput(field, node.id)))
  selectedNodeId.value = node.id
  if (!options?.silent) {
    setNotice('success', `已将「${dataset.name}」作为关联节点加入画布。`)
  }
}

function selectCreateSourceType(type: SourceCreateType): void {
  createSourceType.value = type
  resetSourceScope()
}

function normalizeNodeAlias(node: ModelNode): void {
  const normalized = node.alias.trim()
  const isValid = /^[\u4e00-\u9fa5A-Za-z0-9_]{1,64}$/.test(normalized)
  if (!isValid) {
    node.alias = uniqueNodeAlias(node.tableName ?? node.datasetId ?? '未命名节点')
    setNotice('warning', '节点别名仅支持中英文、数字和下划线，长度 1-64。已自动恢复为可用名称。')
    return
  }
  const duplicated = (model.value?.nodes ?? []).some((item) => item.id !== node.id && item.alias === normalized)
  if (duplicated) {
    node.alias = uniqueNodeAlias(normalized)
    setNotice('warning', `节点别名重复，已调整为「${node.alias}」。`)
    return
  }
  node.alias = normalized
}

function toggleNodeField(node: ModelNode, field: SourceField, checked: boolean): void {
  if (!model.value) {
    return
  }
  if (!checked) {
    if (node.selectedFields.length <= 1) {
      setNotice('warning', '每个节点至少需要保留一个字段。')
      return
    }
    if (isFieldReferenced(node.id, field.name)) {
      setNotice('warning', `字段「${field.displayName}」已被 Join、筛选或计算字段引用，不能取消。`)
      return
    }
    node.selectedFields = node.selectedFields.filter((item) => item.name !== field.name)
    model.value.outputFields = model.value.outputFields.filter(
      (item) => !(item.sourceNodeId === node.id && item.sourceFieldName === field.name),
    )
    return
  }
  if (node.selectedFields.some((item) => item.name === field.name)) {
    return
  }
  node.selectedFields.push(field)
  model.value.outputFields.push(sourceFieldToOutput(field, node.id))
}

function flattenFilters(filters: FilterCondition[]): FilterCondition[] {
  return filters.flatMap((filter) => [filter, ...flattenFilters(filter.children ?? [])])
}

function isFieldReferenced(nodeId: string, fieldName: string): boolean {
  if (!model.value) {
    return false
  }
  const edgeReference = model.value.edges.some((edge) => {
    if (edge.sourceNodeId !== nodeId && edge.targetNodeId !== nodeId) {
      return false
    }
    return edge.joinConfig?.conditions.some((condition) =>
      edge.sourceNodeId === nodeId ? condition.leftField === fieldName : condition.rightField === fieldName,
    )
  })
  const node = model.value.nodes.find((item) => item.id === nodeId)
  const filterReference = node ? flattenFilters(node.preFilters).some((filter) => filter.fieldName === fieldName || filter.fieldId === fieldName) : false
  const calcReference = model.value.outputFields.some((field) => field.expression?.includes(fieldName))
  return edgeReference || filterReference || calcReference
}

function linkCanvasField(node: ModelNode, field: SourceField): void {
  if (!model.value) {
    return
  }
  if (!node.selectedFields.some((item) => item.name === field.name)) {
    setNotice('warning', '只能关联已勾选输出的字段。')
    return
  }
  if (!fieldLinkDraft.value) {
    fieldLinkDraft.value = { nodeId: node.id, fieldName: field.name }
    selectedNodeId.value = node.id
    setNotice('info', `已选择「${node.alias}.${field.displayName}」，请点击另一张表的字段完成关联。`)
    return
  }
  const draft = fieldLinkDraft.value
  fieldLinkDraft.value = null
  if (draft.nodeId === node.id) {
    setNotice('warning', '字段关联需要选择两张不同表。')
    return
  }
  createJoinByFields(draft.nodeId, draft.fieldName, node.id, field.name)
}

function startCanvasNodeDrag(event: MouseEvent, node: ModelNode): void {
  const rect = canvasAreaRef.value?.getBoundingClientRect()
  draggingCanvasNode.value = {
    type: 'source',
    nodeId: node.id,
    offsetX: rect ? event.clientX - rect.left - node.position.x : event.offsetX,
    offsetY: rect ? event.clientY - rect.top - node.position.y : event.offsetY,
  }
  selectedNodeId.value = node.id
}

function startOutputNodeDrag(event: MouseEvent): void {
  const rect = canvasAreaRef.value?.getBoundingClientRect()
  const position = outputNodePosition()
  draggingCanvasNode.value = {
    type: 'output',
    offsetX: rect ? event.clientX - rect.left - position.x : event.offsetX,
    offsetY: rect ? event.clientY - rect.top - position.y : event.offsetY,
  }
}

function moveCanvasNode(event: MouseEvent): void {
  const dragging = draggingCanvasNode.value
  if (!dragging || !canvasAreaRef.value) {
    return
  }
  const rect = canvasAreaRef.value.getBoundingClientRect()
  if (dragging.type === 'output') {
    outputNodeLayout.value = {
      x: Math.max(24, Math.round(event.clientX - rect.left - dragging.offsetX)),
      y: Math.max(24, Math.round(event.clientY - rect.top - dragging.offsetY)),
      initialized: true,
    }
    return
  }
  const node = nodeById(dragging.nodeId)
  if (!node) {
    return
  }
  node.position = {
    x: Math.max(24, Math.round(event.clientX - rect.left - dragging.offsetX)),
    y: Math.max(24, Math.round(event.clientY - rect.top - dragging.offsetY)),
  }
}

function stopCanvasNodeDrag(): void {
  draggingCanvasNode.value = null
}

function startCanvasFieldDrag(event: DragEvent, node: ModelNode, field: SourceField): void {
  draggingCanvasField.value = { nodeId: node.id, fieldName: field.name }
  event.dataTransfer?.setData('text/plain', `${node.id}.${field.name}`)
}

function dropCanvasFieldLink(node: ModelNode, field: SourceField): void {
  const dragging = draggingCanvasField.value
  draggingCanvasField.value = null
  if (!dragging) {
    return
  }
  if (dragging.nodeId === node.id) {
    setNotice('warning', '字段关联需要选择两张不同表。')
    return
  }
  createJoinByFields(dragging.nodeId, dragging.fieldName, node.id, field.name)
}

function openEdgeById(edgeId: string): void {
  const edge = model.value?.edges.find((item) => item.id === edgeId)
  if (edge) {
    openEdgeConfig(edge)
  }
}

function createJoinByFields(sourceNodeId: string, leftField: string, targetNodeId: string, rightField: string): void {
  if (!model.value) {
    return
  }
  const source = nodeById(sourceNodeId)
  const target = nodeById(targetNodeId)
  if (!source || !target) {
    setNotice('warning', '字段关联失败，请确认两张表仍在画布中。')
    return
  }
  const left = source.selectedFields.find((field) => field.name === leftField)
  const right = target.selectedFields.find((field) => field.name === rightField)
  const useIdMapping = Boolean(left && right && left.fieldType !== right.fieldType)
  const existingEdge = model.value.edges.find(
    (edge) =>
      edge.relationType === 'join' &&
      ((edge.sourceNodeId === sourceNodeId && edge.targetNodeId === targetNodeId) ||
        (edge.sourceNodeId === targetNodeId && edge.targetNodeId === sourceNodeId)),
  )
  const condition: JoinCondition = {
    id: `join_condition_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    leftField,
    rightField,
    operator: 'equals',
    useIdMapping,
  }
  if (existingEdge?.joinConfig) {
    const conditionExists = existingEdge.joinConfig.conditions.some(
      (item) => item.leftField === leftField && item.rightField === rightField,
    )
    if (conditionExists) {
      selectedEdgeId.value = existingEdge.id
      setNotice('info', '该字段关联已存在。')
      return
    }
    existingEdge.joinConfig.conditions.push(condition)
    existingEdge.joinConfig.idMappingEnabled = existingEdge.joinConfig.idMappingEnabled || useIdMapping
    existingEdge.joinConfig.expression = existingEdge.joinConfig.conditions
      .map((item) => `${source.alias}.${item.leftField} = ${target.alias}.${item.rightField}`)
      .join(' AND ')
    selectedEdgeId.value = existingEdge.id
    setNotice('success', '已在现有 Join 上追加字段关联。')
    return
  }
  const edge: ModelEdge = {
    id: `edge_join_${Date.now()}`,
    sourceNodeId,
    targetNodeId,
    relationType: 'join',
    status: 'normal',
    joinConfig: {
      joinType: 'left',
      conditions: [condition],
      expression: `${source.alias}.${leftField} = ${target.alias}.${rightField}`,
      idMappingEnabled: useIdMapping,
    },
  }
  model.value.edges.push(edge)
  selectedEdgeId.value = edge.id
  setNotice('success', '已通过画布字段创建 Join 关联。')
}

function autoJoinSameNameFields(): void {
  if (!model.value || model.value.nodes.length < 2) {
    setNotice('warning', '至少需要两张表才能自动创建 Join。')
    return
  }
  let created = 0
  for (let index = 1; index < model.value.nodes.length; index += 1) {
    const left = model.value.nodes[index - 1]
    const right = model.value.nodes[index]
    if (!left || !right) {
      continue
    }
    const matchedField =
      left.selectedFields.find((field) =>
        right.selectedFields.some((rightField) => rightField.name === field.name && rightField.fieldType === field.fieldType),
      ) ?? left.selectedFields.find((field) => right.selectedFields.some((rightField) => rightField.name === field.name))
    if (!matchedField) {
      continue
    }
    createJoinByFields(left.id, matchedField.name, right.id, matchedField.name)
    created += 1
  }
  setNotice(
    created > 0 ? 'success' : 'warning',
    created > 0 ? `已自动创建 ${created} 条多表 Join 关联。` : '未找到可自动关联的同名字段，可直接拖拽字段手动连线。',
  )
}

function sourceFieldToOutput(field: SourceField, nodeId: string): DatasetField {
  const numberLike = ['integer', 'number', 'decimal'].includes(field.fieldType)
  return {
    id: `out_${nodeId}_${field.name}`,
    name: field.name,
    displayName: field.displayName,
    fieldType: field.fieldType,
    semanticType: field.isPrimaryKey ? 'id' : numberLike ? 'measure' : field.fieldType === 'datetime' ? 'time' : 'dimension',
    aggregation: numberLike ? 'sum' : field.isPrimaryKey ? 'count_distinct' : 'none',
    visible: true,
    sortable: true,
    sourceNodeId: nodeId,
    sourceFieldName: field.name,
    isPrimaryKey: field.isPrimaryKey,
    isPartitionField: field.isPartitionField,
  }
}

function removeNode(nodeId: string): void {
  if (!model.value) {
    return
  }
  model.value.nodes = model.value.nodes.filter((node) => node.id !== nodeId)
  model.value.edges = model.value.edges.filter((edge) => edge.sourceNodeId !== nodeId && edge.targetNodeId !== nodeId)
  model.value.outputFields = model.value.outputFields.filter((field) => field.sourceNodeId !== nodeId)
  selectedNodeId.value = model.value.nodes[0]?.id ?? ''
  setNotice('success', '节点已移除，相关字段和关系也已同步删除。')
}

function removeEdge(edgeId: string): void {
  if (!model.value) {
    return
  }
  model.value.edges = model.value.edges.filter((edge) => edge.id !== edgeId)
  if (selectedEdgeId.value === edgeId) {
    selectedEdgeId.value = model.value.edges[0]?.id ?? ''
  }
  setNotice('success', '关系已从画布移除。')
}

function openEdgeConfig(edge: ModelEdge): void {
  selectedEdgeId.value = edge.id
  if (edge.relationType === 'join') {
    openJoinModal(edge)
    return
  }
  openUnionModal(edge)
}

async function validateSql(): Promise<void> {
  if (!sqlDraft.value.trim()) {
    sqlValidationMessage.value = 'SQL 不能为空。'
    setNotice('warning', sqlValidationMessage.value)
    return
  }
  const result = await datasetService.validateSql(sqlDraft.value)
  sqlValidationMessage.value = result.message
  if (result.success && model.value) {
    const node: ModelNode = {
      id: `node_sql_${Date.now()}`,
      type: 'custom_sql',
      alias: uniqueNodeAlias('自定义 SQL 节点'),
      sourceMode: 'extract',
      connectionId: 'conn_clickhouse_ad',
      connectionName: '行为数仓 ClickHouse',
      databaseName: 'dwd',
      selectedFields: result.fields,
      preFilters: [createDefaultFilterForFields(result.fields)],
      sqlConfig: {
        sql: sqlDraft.value,
        formattedSql: sqlDraft.value,
        validated: true,
        validationMessage: result.message,
        previewFields: result.fields,
      },
      position: nextCanvasNodePosition(model.value.nodes.length),
      status: 'normal',
    }
    model.value.nodes.push(node)
    model.value.outputFields.push(...result.fields.map((field) => sourceFieldToOutput(field, node.id)))
    selectedNodeId.value = node.id
    setNotice('success', 'SQL 校验通过，已生成自定义 SQL 节点。')
  } else {
    setNotice('error', result.message)
  }
}

async function formatSql(): Promise<void> {
  sqlDraft.value = await datasetService.formatSql(sqlDraft.value)
  setNotice('info', 'SQL 已格式化。')
}

function insertSelectSql(): void {
  const source = sourceTables.value.find((table) => table.id === createSourceId.value)
  if (!source) {
    setNotice('warning', '请先选择一个来源表。')
    return
  }
  sqlDraft.value = `select * from ${source.databaseName}.${source.tableName} limit 100`
  setNotice('info', `已插入「${source.displayName}」的查询语句。`)
}

function addJoinEdge(): void {
  if (!model.value || model.value.nodes.length < 2) {
    setNotice('warning', '至少需要两个模型节点才能配置 Join。')
    return
  }
  const source = nodeById(joinSourceNodeId.value) ?? model.value.nodes[0]
  const target = nodeById(joinTargetNodeId.value) ?? model.value.nodes.find((node) => node.id !== source?.id)
  if (!source || !target) {
    return
  }
  if (source.id === target.id) {
    setNotice('warning', 'Join 左右节点不能相同。')
    return
  }
  const edge: ModelEdge = {
    id: `edge_join_${Date.now()}`,
    sourceNodeId: source.id,
    targetNodeId: target.id,
    relationType: 'join',
    status: 'normal',
    joinConfig: {
      joinType: joinTypeDraft.value,
      conditions: [
        {
          id: `join_condition_${Date.now()}`,
          leftField: joinLeftField.value,
          rightField: joinRightField.value,
          operator: 'equals',
          useIdMapping: joinUseIdMapping.value,
        },
      ],
      expression: `${source.alias}.${joinLeftField.value} = ${target.alias}.${joinRightField.value}`,
      idMappingEnabled: joinUseIdMapping.value,
    },
  }
  model.value.edges.push(edge)
  selectedEdgeId.value = edge.id
  setNotice('success', 'Join 关系已创建。')
}

function openJoinModal(edge?: ModelEdge): void {
  if (edge?.joinConfig) {
    selectedEdgeId.value = edge.id
    joinSourceNodeId.value = edge.sourceNodeId
    joinTargetNodeId.value = edge.targetNodeId
    joinTypeDraft.value = edge.joinConfig.joinType
    joinLeftField.value = edge.joinConfig.conditions[0]?.leftField ?? 'user_id'
    joinRightField.value = edge.joinConfig.conditions[0]?.rightField ?? 'user_id'
    joinUseIdMapping.value = edge.joinConfig.idMappingEnabled
  } else {
    selectedEdgeId.value = ''
    const [sourceNode, targetNode] = model.value?.nodes ?? []
    joinSourceNodeId.value = sourceNode?.id ?? ''
    joinTargetNodeId.value = targetNode?.id ?? ''
    joinLeftField.value = String(sourceNode?.selectedFields[0]?.name ?? 'user_id')
    joinRightField.value = String(targetNode?.selectedFields[0]?.name ?? 'user_id')
    joinUseIdMapping.value = true
  }
  showJoinModal.value = true
}

function updateJoinSourceNode(nodeId: string): void {
  joinSourceNodeId.value = nodeId
  const node = nodeById(nodeId)
  joinLeftField.value = node?.selectedFields[0]?.name ?? ''
}

function updateJoinTargetNode(nodeId: string): void {
  joinTargetNodeId.value = nodeId
  const node = nodeById(nodeId)
  joinRightField.value = node?.selectedFields[0]?.name ?? ''
}

function saveJoinConfig(): void {
  if (!model.value) {
    return
  }
  if (!joinLeftField.value || !joinRightField.value) {
    setNotice('warning', 'Join 条件必须包含左字段和右字段。')
    return
  }
  const edge = selectedEdge.value
  if (!edge || edge.relationType !== 'join') {
    addJoinEdge()
    showJoinModal.value = false
    return
  }
  if (!joinSourceNodeId.value || !joinTargetNodeId.value || joinSourceNodeId.value === joinTargetNodeId.value) {
    setNotice('warning', '请选择两张不同的 Join 节点。')
    return
  }
  const source = model.value.nodes.find((node) => node.id === joinSourceNodeId.value)
  const target = model.value.nodes.find((node) => node.id === joinTargetNodeId.value)
  const leftField = source?.selectedFields.find((field) => field.name === joinLeftField.value)
  const rightField = target?.selectedFields.find((field) => field.name === joinRightField.value)
  if (leftField && rightField && leftField.fieldType !== rightField.fieldType && !joinUseIdMapping.value) {
    setNotice('warning', '当前关联字段类型不一致，建议更换字段、使用表达式或启用 ID-Mapping。')
  }
  edge.joinConfig = {
    joinType: joinTypeDraft.value,
    idMappingEnabled: joinUseIdMapping.value,
    expression: `${source?.alias ?? '左表'}.${joinLeftField.value} = ${target?.alias ?? '右表'}.${joinRightField.value}`,
    conditions: [
      {
        id: edge.joinConfig?.conditions[0]?.id ?? `join_condition_${Date.now()}`,
        leftField: joinLeftField.value,
        rightField: joinRightField.value,
        operator: 'equals',
        useIdMapping: joinUseIdMapping.value,
      },
    ],
  }
  edge.sourceNodeId = joinSourceNodeId.value
  edge.targetNodeId = joinTargetNodeId.value
  showJoinModal.value = false
  setNotice('success', 'Join 配置已更新。')
}

function removeJoinCondition(edge: ModelEdge, conditionId: string): void {
  if (!edge.joinConfig) {
    return
  }
  if (edge.joinConfig.conditions.length <= 1) {
    setNotice('warning', 'Join 至少需要保留一个关联条件。')
    return
  }
  edge.joinConfig.conditions = edge.joinConfig.conditions.filter((condition) => condition.id !== conditionId)
  const source = nodeById(edge.sourceNodeId)
  const target = nodeById(edge.targetNodeId)
  edge.joinConfig.expression = edge.joinConfig.conditions
    .map((condition) => `${source?.alias ?? '左表'}.${condition.leftField} = ${target?.alias ?? '右表'}.${condition.rightField}`)
    .join(' AND ')
}

function openUnionModal(edge?: ModelEdge): void {
  if (!model.value || model.value.nodes.length < 2) {
    setNotice('warning', '至少需要两个模型节点才能配置 Union。')
    return
  }
  if (edge?.unionConfig) {
    selectedEdgeId.value = edge.id
    unionTypeDraft.value = edge.unionConfig.unionType
    unionNodeIds.value = [...new Set([edge.sourceNodeId, edge.targetNodeId])]
  } else {
    selectedEdgeId.value = ''
    unionNodeIds.value = model.value.nodes.slice(0, 2).map((node) => node.id)
  }
  showUnionModal.value = true
}

function buildUnionMappings(nodes: ModelNode[]) {
  const [firstNode] = nodes
  if (!firstNode) {
    return []
  }
  return firstNode.selectedFields.slice(0, 6).map((field) => ({
    id: `union_${field.name}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    outputFieldName: field.name,
    outputFieldType: field.fieldType,
    sourceFieldMap: Object.fromEntries(
      nodes.map((node) => [node.id, node.selectedFields.find((nodeField) => nodeField.name === field.name)?.name ?? '']),
    ),
    compatible: nodes.every((node) => {
      const targetField = node.selectedFields.find((nodeField) => nodeField.name === field.name)
      return !targetField || targetField.fieldType === field.fieldType
    }),
  }))
}

function saveUnionConfig(): void {
  if (!model.value || model.value.nodes.length < 2) {
    setNotice('warning', '至少需要两个模型节点才能配置 Union。')
    return
  }
  const unionNodes = unionNodeIds.value.map((nodeId) => nodeById(nodeId)).filter((node): node is ModelNode => Boolean(node))
  if (unionNodes.length < 2) {
    setNotice('warning', 'Union 至少需要选择两张表。')
    return
  }
  const [source, target] = unionNodes
  if (!source || !target) {
    return
  }
  const mappings = buildUnionMappings(unionNodes)
  const edge = selectedEdge.value
  if (edge?.relationType === 'union') {
    edge.sourceNodeId = source.id
    edge.targetNodeId = target.id
    edge.unionConfig = {
      unionType: unionTypeDraft.value,
      fieldMappings: mappings,
      mergeDuplicatedRows: unionTypeDraft.value === 'union_distinct',
    }
    showUnionModal.value = false
    setNotice('success', 'Union 配置已更新。')
    return
  }
  model.value.edges.push({
    id: `edge_union_${Date.now()}`,
    sourceNodeId: source.id,
    targetNodeId: target.id,
    relationType: 'union',
    status: 'normal',
    unionConfig: {
      unionType: unionTypeDraft.value,
      fieldMappings: mappings,
      mergeDuplicatedRows: unionTypeDraft.value === 'union_distinct',
    },
  })
  showUnionModal.value = false
  setNotice('success', 'Union 关系已创建，可在画布中查看字段映射。')
}

function addNodeFilter(node: ModelNode): void {
  node.preFilters.push(createDefaultFilterForFields(node.selectedFields))
  setNotice('info', '已添加节点前置过滤。')
}

function addModelFilter(): void {
  if (!model.value) {
    return
  }
  model.value.modelFilter.conditions.push(createDefaultFilterForFields(model.value.outputFields))
  setNotice('info', '已添加模型后置过滤。')
}

function pickDefaultFilterField(fields: Array<SourceField | DatasetField>): SourceField | DatasetField | undefined {
  return (
    fields.find((field) => field.isPartitionField) ??
    fields.find((field) => field.name === 'event_name') ??
    fields.find((field) => field.name === 'coin_balance_level') ??
    fields.find((field) => field.fieldType === 'datetime') ??
    fields[0]
  )
}

function createDefaultFilterForFields(fields: Array<SourceField | DatasetField>): FilterCondition {
  const field = pickDefaultFilterField(fields)
  if (!field) {
    return createFilter('event_time', 'datetime', 'partition')
  }
  return createFilter(field.name, field.fieldType, field.isPartitionField ? 'partition' : 'normal')
}

function ensureInitialNodePreFilters(): void {
  ;(model.value?.nodes ?? []).forEach((node) => {
    node.preFilters = node.preFilters ?? []
    if (node.preFilters.length === 0) {
      node.preFilters.push(createDefaultFilterForFields(node.selectedFields))
    }
  })
}

function createFilter(fieldName: string, fieldType: FieldType, filterType: FilterCondition['filterType']): FilterCondition {
  return {
    id: `filter_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    logic: 'AND',
    fieldId: fieldName,
    fieldName,
    fieldType,
    operator: fieldType === 'datetime' ? 'last_n_days' : 'equals',
    value: fieldType === 'datetime' ? 30 : 'low',
    filterType,
    children: [],
  }
}

function removeFilter(collection: FilterCondition[], filterId: string): boolean {
  const index = collection.findIndex((filter) => filter.id === filterId)
  if (index >= 0) {
    collection.splice(index, 1)
    setNotice('success', '筛选条件已删除。')
    return true
  }
  for (const filter of collection) {
    if (filter.children && removeFilter(filter.children, filterId)) {
      return true
    }
  }
  return false
}

function addChildFilter(parent: FilterCondition, fields: SourceField[] | DatasetField[]): void {
  const fallbackField = pickDefaultFilterField(fields)
  const fieldName = fallbackField?.name ?? parent.fieldName
  const fieldType = fallbackField?.fieldType ?? parent.fieldType
  parent.children = parent.children ?? []
  parent.children.push(createFilter(fieldName, fieldType, fieldType === 'datetime' ? 'partition' : 'normal'))
  setNotice('info', '已添加二级筛选条件。')
}

function addCalculatedField(): void {
  if (!model.value) {
    return
  }
  const name = calcFieldDraft.value.name.trim()
  if (!name || model.value.outputFields.some((field) => field.name === name)) {
    setNotice('warning', '字段名不能为空，也不能和已有字段重复。')
    return
  }
  model.value.outputFields.push({
    id: `calc_${Date.now()}`,
    name,
    displayName: calcFieldDraft.value.displayName,
    fieldType: calcFieldDraft.value.fieldType,
    semanticType: 'measure',
    aggregation: 'avg',
    visible: true,
    sortable: true,
    expression: calcFieldDraft.value.expression,
    description: '由字段配置区创建的计算字段。',
  })
  showCalcFieldModal.value = false
  setNotice('success', `计算字段「${calcFieldDraft.value.displayName}」已添加。`)
}

function batchSetFields(visible: boolean): void {
  if (!model.value) {
    return
  }
  model.value.outputFields.forEach((field) => {
    field.visible = visible
  })
}

function batchSetFieldSemantic(semanticType: 'dimension' | 'measure'): void {
  if (!model.value) {
    return
  }
  model.value.outputFields.forEach((field) => {
    if (semanticType === 'measure' && !['number', 'integer', 'decimal'].includes(field.fieldType)) {
      return
    }
    field.semanticType = semanticType
    field.aggregation = semanticType === 'measure' ? 'sum' : 'none'
  })
  setNotice('success', semanticType === 'measure' ? '数值字段已批量设置为指标。' : '字段已批量设置为维度。')
}

function deleteCalculatedFields(): void {
  if (!model.value) {
    return
  }
  const before = model.value.outputFields.length
  model.value.outputFields = model.value.outputFields.filter((field) => !field.expression)
  const removed = before - model.value.outputFields.length
  setNotice(removed > 0 ? 'success' : 'info', removed > 0 ? `已删除 ${removed} 个计算字段。` : '当前没有可删除的计算字段。')
}

function applyFieldSort(value: string): void {
  fieldSortMode.value = value as 'source' | 'semantic' | 'custom'
  if (!model.value || fieldSortMode.value !== 'semantic') {
    return
  }
  const priority: Record<SemanticType, number> = {
    dimension: 1,
    time: 2,
    geo: 3,
    id: 4,
    measure: 5,
    unknown: 6,
  }
  model.value.outputFields = [...model.value.outputFields].sort(
    (left, right) => priority[left.semanticType] - priority[right.semanticType],
  )
}

function updateSemantic(field: DatasetField, value: string): void {
  field.semanticType = value as SemanticType
}

function updateAggregation(field: DatasetField, value: string): void {
  field.aggregation = value as AggregationType
}

function updateFilterOperator(filter: FilterCondition, value: string): void {
  filter.operator = value as FilterOperator
}

function updateFilterField(filter: FilterCondition, value: string | number, fields?: Array<SourceField | DatasetField>): void {
  const fieldName = String(value)
  const field = fields?.find((item) => item.name === fieldName) ?? model.value?.outputFields.find((item) => item.name === fieldName)
  filter.fieldName = fieldName
  filter.fieldId = fieldName
  filter.fieldType = field?.fieldType ?? filter.fieldType
  filter.filterType = field?.isPartitionField ? 'partition' : 'normal'
}

function updateSyncFrequency(value: string): void {
  if (!syncConfig.value) {
    return
  }
  syncConfig.value.frequency = value as SyncFrequency
}

function addAdvancedParam(): void {
  if (!syncConfig.value) {
    return
  }
  const key = runtimeParamKey.value.trim()
  if (!key) {
    setNotice('warning', '请输入运行参数名称。')
    return
  }
  const numericValue = Number(runtimeParamValue.value)
  syncConfig.value.advancedParams[key] = Number.isNaN(numericValue) ? runtimeParamValue.value : numericValue
  setNotice('success', `运行参数「${key}」已更新。`)
}

function removeAdvancedParam(key: string): void {
  if (!syncConfig.value) {
    return
  }
  const nextParams = { ...syncConfig.value.advancedParams }
  delete nextParams[key]
  syncConfig.value.advancedParams = nextParams
}

function filterInputValue(filter: FilterCondition): string {
  return filter.value === undefined || filter.value === null ? '' : String(filter.value)
}

function updateFilterInputValue(filter: FilterCondition, value: string): void {
  filter.value = value
}

async function triggerSync(): Promise<void> {
  const dataset = editorDataset.value ?? selectedDataset.value
  if (!dataset) {
    return
  }
  const task = await datasetService.triggerSync(dataset.id)
  syncTasks.value = await datasetService.listSyncTasks(dataset.id)
  setNotice('success', `已提交同步任务「${task.taskName}」。`)
}

async function rerunTask(task: SyncTask): Promise<void> {
  await datasetService.rerunSyncTask(task.id)
  syncTasks.value = await datasetService.listSyncTasks(task.datasetId)
  setNotice('success', '同步任务已重新运行。')
}

async function cancelTask(task: SyncTask): Promise<void> {
  await datasetService.cancelSyncTask(task.id)
  syncTasks.value = await datasetService.listSyncTasks(task.datasetId)
  setNotice('success', '同步任务已取消。')
}

function openTaskLog(task: SyncTask): void {
  selectedTaskLog.value = task
  showLogModal.value = true
}

async function toggleMask(rule: DataMaskRule): Promise<void> {
  await datasetService.toggleMaskRule(rule.id)
  if (selectedDataset.value) {
    maskRules.value = await datasetService.listMaskRules(selectedDataset.value.id)
  }
  setNotice('success', '脱敏规则状态已更新。')
}

function visualQuery(): void {
  router.push('/data-insight/event-analysis')
}

function saveToDashboard(): void {
  setNotice('success', '已将当前数据集预览配置保存到“广告监控看板”演示位置。')
}

function openDatasetDelete(): void {
  const dataset = selectedDataset.value
  if (!dataset) {
    return
  }
  if (dataset.readonly) {
    setNotice('warning', '主题数据集由系统托管，不能删除。')
    return
  }
  showDeleteModal.value = true
}

onMounted(() => {
  loadBaseData()
})
</script>

<template>
  <div class="dataset-page">
    <div class="dataset-hero">
      <div>
        <h1>数据集</h1>
        <p>创建自定义数据集、关联数据集和主题数据集引用，统一配置模型、字段、同步、权限与脱敏。</p>
      </div>
      <n-space v-if="viewMode === 'list'">
        <n-dropdown trigger="click" :options="createOptions" @select="handleCreateOption">
          <n-button type="primary">新建</n-button>
        </n-dropdown>
        <n-button @click="refreshList">刷新</n-button>
      </n-space>
      <n-space v-else>
        <n-button @click="closeEditor">返回列表</n-button>
        <n-button @click="previewCurrentModel">预览</n-button>
        <n-button type="primary" @click="saveEditor">保存数据集</n-button>
      </n-space>
    </div>

    <n-alert :type="notice.type" closable class="dataset-notice">
      {{ notice.text }}
    </n-alert>

    <template v-if="viewMode === 'list'">
      <div class="dataset-toolbar">
        <n-input v-model:value="keyword" clearable placeholder="搜索数据集名称、描述、标签或负责人" />
        <n-select v-model:value="typeFilter" :options="datasetTypeOptions" />
        <n-select v-model:value="statusFilter" :options="statusOptions" />
        <n-select v-model:value="ownerFilter" :options="ownerOptions" />
      </div>

      <div class="dataset-layout">
        <n-card class="dataset-tree" :bordered="false">
          <div class="section-switch">
            <button
              v-for="item in sectionOptions"
              :key="item.key"
              type="button"
              :class="{ active: section === item.key }"
              @click="section = item.key"
            >
              {{ item.label }}
            </button>
          </div>

          <div class="folder-list">
            <div v-for="folder in folders.filter((item) => item.section === section)" :key="folder.id" class="folder-block">
              <div class="folder-name">
                {{ folder.parentId ? '└ ' : '' }}{{ folder.name }}
              </div>
              <button
                v-for="dataset in filteredDatasets.filter((item) => item.folderId === folder.id)"
                :key="dataset.id"
                type="button"
                class="dataset-item"
                :class="{ selected: dataset.id === selectedDatasetId }"
                @click="selectDataset(dataset)"
              >
                <span>{{ dataset.name }}</span>
                <n-tag size="small" :type="statusTagType(dataset.status)">{{ statusText(dataset.status) }}</n-tag>
              </button>
            </div>
          </div>
        </n-card>

        <n-card v-if="selectedDataset" class="dataset-detail" :bordered="false">
          <div class="detail-header">
            <div>
              <div class="detail-title-row">
                <h2>{{ selectedDataset.name }}</h2>
                <n-tag :type="statusTagType(selectedDataset.status)">{{ statusText(selectedDataset.status) }}</n-tag>
                <n-tag>{{ datasetTypeText(selectedDataset.datasetType) }}</n-tag>
                <n-tag v-if="selectedDataset.readonly" type="info">只读</n-tag>
              </div>
              <p>{{ selectedDataset.description }}</p>
            </div>
            <n-space>
              <n-button v-if="selectedDataset.permission === 'none'" @click="showPermissionModal = true">申请权限</n-button>
              <n-button v-if="selectedDataset.status === 'deleted'" @click="restoreSelectedDataset">恢复</n-button>
              <n-button v-if="selectedDataset.status !== 'deleted'" @click="visualQuery">可视化查询</n-button>
              <n-button v-if="selectedDataset.status !== 'deleted'" @click="saveToDashboard">保存到看板</n-button>
              <n-button v-if="!selectedDataset.readonly && selectedDataset.status !== 'deleted'" @click="openMoveDataset">
                移动
              </n-button>
              <n-button v-if="!selectedDataset.readonly && selectedDataset.status !== 'deleted'" @click="openEditor(selectedDataset)">
                编辑
              </n-button>
              <n-button v-if="!selectedDataset.readonly && selectedDataset.status !== 'deleted'" @click="copySelectedDataset(selectedDataset)">
                复制
              </n-button>
              <n-button
                v-if="!selectedDataset.readonly"
                type="error"
                secondary
                @click="openDatasetDelete"
              >
                删除
              </n-button>
            </n-space>
          </div>

          <n-tabs v-model:value="activeDetailTab" type="line" animated>
            <n-tab-pane name="basic" tab="基础信息">
              <div class="stat-grid">
                <div class="stat-card">
                  <span>行数</span>
                  <strong>{{ formatNumber(selectedDataset.rowCount) }}</strong>
                </div>
                <div class="stat-card">
                  <span>字段数</span>
                  <strong>{{ selectedDataset.fieldCount }}</strong>
                </div>
                <div class="stat-card">
                  <span>负责人</span>
                  <strong>{{ selectedDataset.owner }}</strong>
                </div>
                <div class="stat-card">
                  <span>所属文件夹</span>
                  <strong>{{ selectedFolder?.name ?? '-' }}</strong>
                </div>
                <div class="stat-card">
                  <span>存储引擎</span>
                  <strong>{{ selectedDataset.storageEngine }}</strong>
                </div>
                <div class="stat-card">
                  <span>最近更新</span>
                  <strong>{{ selectedDataset.updatedAt }}</strong>
                </div>
              </div>
              <div class="tag-row">
                <n-tag v-for="tag in selectedDataset.tags" :key="tag">{{ tag }}</n-tag>
              </div>
            </n-tab-pane>

            <n-tab-pane name="preview" tab="明细数据">
              <div class="pane-actions">
                <n-button @click="previewCurrentModel">刷新预览</n-button>
                <n-button @click="setNotice('success', '预览数据已导出为 CSV 演示文件。')">下载页面结果</n-button>
              </div>
              <n-data-table
                :columns="visiblePreviewColumns"
                :data="previewResult?.rows ?? []"
                :pagination="{ pageSize: 5 }"
                :scroll-x="900"
              />
            </n-tab-pane>

            <n-tab-pane name="schema" tab="表结构">
              <div class="schema-list">
                <div v-for="field in model?.outputFields ?? []" :key="field.id" class="schema-row">
                  <div>
                    <strong>{{ field.displayName }}</strong>
                    <span>{{ field.name }} · {{ field.fieldType }}</span>
                  </div>
                  <n-tag>{{ field.semanticType }}</n-tag>
                  <n-tag>{{ field.aggregation }}</n-tag>
                  <n-tag :type="field.visible ? 'success' : 'default'">{{ field.visible ? '展示' : '隐藏' }}</n-tag>
                </div>
              </div>
            </n-tab-pane>

            <n-tab-pane name="sync" tab="同步状态">
              <div v-if="syncConfig" class="sync-config">
                <div>同步方式：{{ syncConfig.frequency }} · {{ syncConfig.scheduleText }}</div>
                <div>依赖策略：{{ syncConfig.dependencyStrategy }}</div>
                <div>失败告警：{{ syncConfig.alertOnFailure ? syncConfig.alertReceivers.join('、') : '关闭' }}</div>
                <n-button type="primary" @click="triggerSync">手动同步</n-button>
              </div>
              <div class="task-list">
                <div v-for="task in syncTasks" :key="task.id" class="task-row">
                  <div>
                    <strong>{{ task.taskName }}</strong>
                    <span>{{ task.startedAt }} · {{ task.durationSeconds ?? '-' }} 秒</span>
                  </div>
                  <n-tag :type="task.status === 'success' ? 'success' : task.status === 'failed' ? 'error' : 'warning'">
                    {{ task.status }}
                  </n-tag>
                  <n-button text type="primary" @click="openTaskLog(task)">日志</n-button>
                  <n-button text @click="rerunTask(task)">重跑</n-button>
                  <n-button v-if="task.status === 'running'" text type="error" @click="cancelTask(task)">取消</n-button>
                </div>
              </div>
            </n-tab-pane>

            <n-tab-pane name="model" tab="模型信息">
              <div class="model-summary">
                <div class="model-column">
                  <h3>节点</h3>
                  <div v-for="node in model?.nodes ?? []" :key="node.id" class="model-box">
                    <strong>{{ node.alias }}</strong>
                    <span>{{ node.connectionName ?? '主题/关联数据集' }} · {{ node.tableName ?? node.datasetId }}</span>
                  </div>
                </div>
                <div class="model-column">
                  <h3>关系</h3>
                  <div v-for="edge in model?.edges ?? []" :key="edge.id" class="model-box">
                    <strong>{{ edge.relationType.toUpperCase() }}</strong>
                    <span>{{ edge.joinConfig?.expression ?? `${edge.unionConfig?.fieldMappings.length ?? 0} 个字段映射` }}</span>
                  </div>
                </div>
              </div>
            </n-tab-pane>

            <n-tab-pane name="lineage" tab="血缘视图">
              <div class="lineage-grid">
                <div v-for="node in lineageNodes" :key="node.id" class="lineage-node" :class="node.level">
                  <strong>{{ node.name }}</strong>
                  <span>{{ node.nodeType }} · {{ node.level }}</span>
                </div>
              </div>
              <div class="lineage-edges">
                <div v-for="edge in lineageEdges" :key="edge.id">
                  {{ edge.source }} → {{ edge.target }} · {{ edge.relation }}
                </div>
              </div>
            </n-tab-pane>

            <n-tab-pane name="permission" tab="行列权限">
              <div class="rule-list">
                <div v-for="rule in permissionRules" :key="rule.id" class="rule-card">
                  <strong>{{ rule.subjectName }}</strong>
                  <span>{{ rule.subjectType }} · {{ rule.permission }}</span>
                  <span>行规则：{{ rule.rowRule ?? '无' }}</span>
                  <span>列规则：{{ rule.columnRule ?? '无' }}</span>
                </div>
              </div>
              <div class="permission-editor">
                <n-select v-model:value="permissionSubjectType" :options="permissionSubjectTypeOptions" />
                <n-input v-model:value="permissionSubjectName" placeholder="输入用户、团队或角色名称" />
                <n-select v-model:value="permissionLevel" :options="permissionLevelOptions" />
                <n-button type="primary" @click="addPermissionRule">新增权限规则</n-button>
              </div>
            </n-tab-pane>

            <n-tab-pane name="mask" tab="数据脱敏">
              <div class="rule-list">
                <div v-for="rule in maskRules" :key="rule.id" class="rule-card">
                  <strong>{{ rule.fieldName }}</strong>
                  <span>方式：{{ rule.method }} · 示例：{{ rule.example }}</span>
                  <n-switch :value="rule.enabled" @update:value="toggleMask(rule)" />
                </div>
              </div>
            </n-tab-pane>
          </n-tabs>
        </n-card>
      </div>
    </template>

    <template v-else>
      <div class="editor-layout">
        <n-card class="editor-sidebar" :bordered="false">
          <n-tabs v-model:value="activeEditorStep" type="segment" animated>
            <n-tab-pane name="source" tab="1 基础配置">
              <div class="editor-form">
                <div class="basic-config-section">
                  <div class="basic-section-title">
                    <strong>基础信息</strong>
                    <span>只保留数据集自身属性，不混入来源选择。</span>
                  </div>
                  <label>数据集名称</label>
                  <n-input v-if="editorDataset" v-model:value="editorDataset.name" />
                  <label>说明</label>
                  <n-input v-if="editorDataset" v-model:value="editorDataset.description" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" />
                  <label>保存文件夹</label>
                  <n-select v-if="editorDataset" v-model:value="editorDataset.folderId" :options="folderOptions" />
                </div>
                <template v-if="editorDataset?.sourceMode === 'associated'">
                  <div class="basic-config-section">
                    <div class="basic-section-title">
                      <strong>关联数据集</strong>
                      <span>选择已有数据集作为模型节点，选择或删除后会立即同步画布。</span>
                    </div>
                    <label>可关联数据集</label>
                    <n-select
                      :value="selectedAssociatedDatasetIds"
                      multiple
                      filterable
                      clearable
                      :options="associationDatasetSelectOptions"
                      placeholder="搜索并选择一个或多个数据集"
                      @update:value="updateSelectedAssociatedDatasets"
                    />
                  </div>
                </template>
                <template v-else>
                  <div class="basic-config-section">
                    <div class="basic-section-title">
                      <strong>数据来源</strong>
                      <span>按来源类型、连接、库/空间、对象逐级选择；对象变更会直接同步模型画布。</span>
                    </div>
                    <label>来源类型</label>
                    <n-select
                      :value="createSourceType"
                      :options="sourceTypeSelectOptions"
                      placeholder="选择来源类型"
                      @update:value="updateSourceType"
                    />
                    <label>数据源连接</label>
                    <n-select
                      :value="selectedSourceConnectionIds"
                      multiple
                      filterable
                      clearable
                      :options="sourceConnectionOptions"
                      placeholder="先选择一个或多个已接入连接"
                      @update:value="updateSourceConnections"
                    />
                    <label>数据库 / 空间 / Topic 分组</label>
                    <n-select
                      :value="selectedSourceDatabases"
                      multiple
                      filterable
                      clearable
                      :options="sourceDatabaseOptions"
                      placeholder="再选择连接下的库、空间或目录"
                      @update:value="updateSourceDatabases"
                    />
                    <label>表 / 文件 / Topic</label>
                    <n-select
                      :value="selectedSourceTableIds"
                      multiple
                      filterable
                      clearable
                      :options="sourceOptions"
                      placeholder="最后选择要加入模型的具体对象"
                      @update:value="updateSelectedSourceTables"
                    />
                  </div>
                  <div class="basic-config-section">
                    <div class="basic-section-title">
                      <strong>自定义 SQL</strong>
                      <span>高级入口，默认收起，避免干扰常规建模流程。</span>
                    </div>
                    <n-button tertiary @click="showSqlBuilder = !showSqlBuilder">
                      {{ showSqlBuilder ? '收起 SQL 配置' : '展开 SQL 配置' }}
                    </n-button>
                    <template v-if="showSqlBuilder">
                      <n-input v-model:value="sqlDraft" type="textarea" :autosize="{ minRows: 5, maxRows: 8 }" />
                      <n-space>
                        <n-button @click="insertSelectSql">插入表查询语句</n-button>
                        <n-button @click="formatSql">格式化</n-button>
                        <n-button type="primary" @click="validateSql">校验并加入画布</n-button>
                      </n-space>
                      <n-alert type="info">{{ sqlValidationMessage }}</n-alert>
                    </template>
                  </div>
                </template>
              </div>
            </n-tab-pane>

            <n-tab-pane name="model" tab="2 模型配置">
              <div class="editor-form">
                <n-space>
                  <n-button @click="openJoinModal()">配置 Join</n-button>
                  <n-button @click="autoJoinSameNameFields">自动关联同名字段</n-button>
                  <n-button @click="openUnionModal()">配置 Union</n-button>
                  <n-button @click="previewCurrentModel">模型预览</n-button>
                </n-space>
                <div v-for="node in model?.nodes ?? []" :key="node.id" class="node-config" :class="{ selected: node.id === selectedNodeId }">
                  <div class="node-config-main">
                    <n-input v-model:value="node.alias" @blur="normalizeNodeAlias(node)" />
                    <span>{{ node.tableName ?? node.datasetId }} · {{ node.selectedFields.length }} 字段</span>
                  </div>
                  <div class="node-field-list">
                    <n-checkbox
                      v-for="field in nodeAvailableFields(node)"
                      :key="field.id"
                      :checked="node.selectedFields.some((item) => item.name === field.name)"
                      @update:checked="toggleNodeField(node, field, $event)"
                    >
                      {{ field.displayName }}
                    </n-checkbox>
                  </div>
                  <n-space>
                    <n-button text type="primary" @click="selectedNodeId = node.id">选择</n-button>
                    <n-button text type="error" @click="removeNode(node.id)">移除</n-button>
                  </n-space>
                </div>
                <div v-for="edge in model?.edges ?? []" :key="edge.id" class="edge-config">
                  <strong>{{ edge.relationType.toUpperCase() }}</strong>
                  <span>{{ edgeSummary(edge) }}</span>
                  <n-space justify="end">
                    <n-button text type="primary" @click="openEdgeConfig(edge)">编辑</n-button>
                    <n-button text type="error" @click="removeEdge(edge.id)">删除</n-button>
                  </n-space>
                </div>
              </div>
            </n-tab-pane>

            <n-tab-pane name="filter" tab="3 数据筛选">
              <div class="editor-form">
                <h3>节点前置筛选</h3>
                <div v-for="node in model?.nodes ?? []" :key="node.id" class="filter-group">
                  <div class="filter-title">
                    <strong>{{ node.alias }}</strong>
                    <n-button size="small" @click="addNodeFilter(node)">+ 筛选</n-button>
                  </div>
                  <n-empty v-if="node.preFilters.length === 0" size="small" description="暂无前置筛选，可为该节点添加过滤条件。" />
                  <div v-for="(filter, filterIndex) in node.preFilters" :key="filter.id" class="filter-block">
                    <div class="filter-row">
                      <n-select
                        v-if="filterIndex > 0"
                        v-model:value="filter.logic"
                        :options="[{ label: 'AND', value: 'AND' }, { label: 'OR', value: 'OR' }]"
                      />
                      <div v-else class="filter-logic-placeholder">一级</div>
                      <n-select
                        :value="filter.fieldName"
                        filterable
                        :options="nodeAvailableFields(node).map((field) => ({ label: `${field.displayName} ${field.name}`, value: field.name }))"
                        @update:value="updateFilterField(filter, $event, nodeAvailableFields(node))"
                      />
                      <n-select :value="filter.operator" :options="filterOperatorOptions" @update:value="updateFilterOperator(filter, $event)" />
                      <n-input :value="filterInputValue(filter)" @update:value="updateFilterInputValue(filter, $event)" />
                      <div class="filter-actions">
                        <n-button text type="primary" @click="addChildFilter(filter, nodeAvailableFields(node))">+ 二级</n-button>
                        <n-button text type="error" @click="removeFilter(node.preFilters, filter.id)">删除</n-button>
                      </div>
                    </div>
                    <div v-if="filter.children?.length" class="filter-children">
                      <div v-for="child in filter.children" :key="child.id" class="filter-row child">
                        <n-select v-model:value="child.logic" :options="[{ label: 'AND', value: 'AND' }, { label: 'OR', value: 'OR' }]" />
                        <n-select
                          :value="child.fieldName"
                          filterable
                          :options="nodeAvailableFields(node).map((field) => ({ label: `${field.displayName} ${field.name}`, value: field.name }))"
                          @update:value="updateFilterField(child, $event, nodeAvailableFields(node))"
                        />
                        <n-select :value="child.operator" :options="filterOperatorOptions" @update:value="updateFilterOperator(child, $event)" />
                        <n-input :value="filterInputValue(child)" @update:value="updateFilterInputValue(child, $event)" />
                        <div class="filter-actions">
                          <n-button text type="error" @click="filter.children && removeFilter(filter.children, child.id)">删除</n-button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <h3>模型后置筛选</h3>
                <n-button @click="addModelFilter">+ 后置筛选</n-button>
                <div v-for="(filter, filterIndex) in model?.modelFilter.conditions ?? []" :key="filter.id" class="filter-block">
                  <div class="filter-row">
                    <n-select
                      v-if="filterIndex > 0"
                      v-model:value="filter.logic"
                      :options="[{ label: 'AND', value: 'AND' }, { label: 'OR', value: 'OR' }]"
                    />
                    <div v-else class="filter-logic-placeholder">一级</div>
                    <n-select
                      :value="filter.fieldName"
                      filterable
                      :options="outputFieldOptions"
                      @update:value="updateFilterField(filter, $event)"
                    />
                    <n-select :value="filter.operator" :options="filterOperatorOptions" @update:value="updateFilterOperator(filter, $event)" />
                  <n-input :value="filterInputValue(filter)" @update:value="updateFilterInputValue(filter, $event)" />
                    <div class="filter-actions">
                      <n-button text type="primary" @click="addChildFilter(filter, model?.outputFields ?? [])">+ 二级</n-button>
                      <n-button text type="error" @click="model && removeFilter(model.modelFilter.conditions, filter.id)">删除</n-button>
                    </div>
                  </div>
                  <div v-if="filter.children?.length" class="filter-children">
                    <div v-for="child in filter.children" :key="child.id" class="filter-row child">
                      <n-select v-model:value="child.logic" :options="[{ label: 'AND', value: 'AND' }, { label: 'OR', value: 'OR' }]" />
                      <n-select
                        :value="child.fieldName"
                        filterable
                        :options="outputFieldOptions"
                        @update:value="updateFilterField(child, $event)"
                      />
                      <n-select :value="child.operator" :options="filterOperatorOptions" @update:value="updateFilterOperator(child, $event)" />
                      <n-input :value="filterInputValue(child)" @update:value="updateFilterInputValue(child, $event)" />
                      <div class="filter-actions">
                        <n-button text type="error" @click="filter.children && removeFilter(filter.children, child.id)">删除</n-button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </n-tab-pane>

            <n-tab-pane name="field" tab="4 字段">
              <div class="editor-form">
                <n-space>
                  <n-button @click="showCalcFieldModal = true">+ 计算字段</n-button>
                  <n-button @click="batchSetFields(true)">全部展示</n-button>
                  <n-button @click="batchSetFields(false)">全部隐藏</n-button>
                  <n-button @click="batchSetFieldSemantic('dimension')">批量设为维度</n-button>
                  <n-button @click="batchSetFieldSemantic('measure')">数值设为指标</n-button>
                  <n-button @click="deleteCalculatedFields">删除计算字段</n-button>
                  <n-select
                    :value="fieldSortMode"
                    :options="fieldSortOptions"
                    class="field-sort-select"
                    @update:value="applyFieldSort"
                  />
                </n-space>
                <div v-for="field in model?.outputFields ?? []" :key="field.id" class="field-config">
                  <n-checkbox v-model:checked="field.visible" />
                  <n-input v-model:value="field.displayName" />
                  <n-tag>{{ field.name }}</n-tag>
                  <n-select :value="field.semanticType" :options="semanticOptions" @update:value="updateSemantic(field, $event)" />
                  <n-select :value="field.aggregation" :options="aggregationOptions" @update:value="updateAggregation(field, $event)" />
                </div>
              </div>
            </n-tab-pane>

            <n-tab-pane name="sync" tab="5 同步">
              <div v-if="syncConfig" class="editor-form">
                <label>启用同步</label>
                <n-switch v-model:value="syncConfig.enabled" />
                <label>同步频率</label>
                <n-select :value="syncConfig.frequency" :options="frequencyOptions" @update:value="updateSyncFrequency" />
                <label>调度说明</label>
                <n-input v-model:value="syncConfig.scheduleText" />
                <label>依赖策略</label>
                <n-select
                  v-model:value="syncConfig.dependencyStrategy"
                  :options="[
                    { label: '无依赖', value: 'none' },
                    { label: '全部成功', value: 'all_success' },
                    { label: '任一成功', value: 'any_success' },
                  ]"
                />
                <label>上游依赖</label>
                <n-select
                  v-model:value="syncConfig.dependencyDatasetIds"
                  multiple
                  filterable
                  clearable
                  :options="dependencyDatasetOptions"
                  placeholder="选择上游数据集或分区 Sensor"
                />
                <label>失败监控</label>
                <n-switch v-model:value="syncConfig.alertOnFailure" />
                <label>告警接收人</label>
                <n-select
                  v-model:value="syncConfig.alertReceivers"
                  multiple
                  filterable
                  tag
                  :options="[
                    { label: '运营分析组', value: '运营分析组' },
                    { label: '交易分析组', value: '交易分析组' },
                    { label: 'Chaoyang Xu', value: 'Chaoyang Xu' },
                    { label: 'Mia Chen', value: 'Mia Chen' },
                  ]"
                />
                <label>并发度 / 内存 / 超时</label>
                <div class="three-inputs">
                  <n-input-number v-model:value="syncConfig.performance.parallelism" />
                  <n-input-number v-model:value="syncConfig.performance.memoryGb" />
                  <n-input-number v-model:value="syncConfig.performance.timeoutMinutes" />
                </div>
                <label>高级运行参数</label>
                <div class="runtime-param-editor">
                  <n-input v-model:value="runtimeParamKey" placeholder="参数名，例如 spark.executor.memory" />
                  <n-input v-model:value="runtimeParamValue" placeholder="参数值" />
                  <n-button @click="addAdvancedParam">添加/更新</n-button>
                </div>
                <div class="runtime-param-list">
                  <div v-for="[key, value] in Object.entries(syncConfig.advancedParams)" :key="key" class="runtime-param-row">
                    <span>{{ key }} = {{ value }}</span>
                    <n-button text type="error" @click="removeAdvancedParam(key)">删除</n-button>
                  </div>
                </div>
                <n-button type="primary" @click="triggerSync">立即同步</n-button>
              </div>
            </n-tab-pane>

            <n-tab-pane name="preview" tab="6 预览">
              <div class="editor-form">
                <n-alert v-if="previewResult?.warning" type="warning">{{ previewResult.warning }}</n-alert>
                <n-data-table
                  :columns="visiblePreviewColumns"
                  :data="previewResult?.rows ?? []"
                  :pagination="{ pageSize: 5 }"
                  :scroll-x="900"
                />
              </div>
            </n-tab-pane>
          </n-tabs>
        </n-card>

        <n-card class="editor-main" :bordered="false">
          <div class="canvas-header">
            <div>
              <h2>模型画布</h2>
              <p>拖拽表节点调整布局，拖拽字段到另一张表字段可直接建立 Join 关联。</p>
            </div>
            <n-space>
              <n-tag>{{ model?.nodes.length ?? 0 }} 个节点</n-tag>
              <n-tag>{{ model?.edges.length ?? 0 }} 条关系</n-tag>
              <n-tag>{{ visibleOutputFields.length }} 个展示字段</n-tag>
            </n-space>
          </div>
          <div
            ref="canvasAreaRef"
            class="canvas-area"
            @dragover.prevent
            @mousemove="moveCanvasNode"
            @mouseup="stopCanvasNodeDrag"
            @mouseleave="stopCanvasNodeDrag"
          >
            <svg class="canvas-relations-svg" width="1600" height="900" aria-hidden="true">
              <line
                v-for="line in outputLineSegments"
                :key="line.id"
                class="canvas-output-line"
                :x1="line.x1"
                :y1="line.y1"
                :x2="line.x2"
                :y2="line.y2"
              />
              <g
                v-for="line in joinLineSegments"
                :key="line.id"
                class="canvas-relation-group"
                @click.stop="openEdgeById(line.edgeId)"
              >
                <line
                  class="canvas-join-line"
                  :class="{ selected: line.edgeId === selectedEdgeId }"
                  :x1="line.x1"
                  :y1="line.y1"
                  :x2="line.x2"
                  :y2="line.y2"
                />
                <text class="canvas-line-label" :x="(line.x1 + line.x2) / 2" :y="(line.y1 + line.y2) / 2 - 6">
                  {{ line.label }}
                </text>
              </g>
            </svg>
            <div
              v-for="node in model?.nodes ?? []"
              :key="node.id"
              class="canvas-node"
              :class="{
                selected: node.id === selectedNodeId,
                invalid: node.status !== 'normal',
                collapsed: !isCanvasNodeExpanded(node.id),
              }"
              :style="{ left: `${node.position.x}px`, top: `${node.position.y}px` }"
              @click="selectedNodeId = node.id"
            >
              <div class="canvas-node-title" @mousedown.stop="startCanvasNodeDrag($event, node)">
                <div>
                  <strong>{{ node.alias }}</strong>
                  <span>{{ node.tableName ?? node.datasetId }}</span>
                </div>
                <n-button size="tiny" text @mousedown.stop @click.stop="toggleCanvasNodeFields(node.id)">
                  {{ isCanvasNodeExpanded(node.id) ? '折叠' : '展开' }}
                </n-button>
              </div>
              <small>{{ node.sourceMode }} · {{ node.selectedFields.length }} / {{ nodeAvailableFields(node).length }} 字段</small>
              <div v-if="isCanvasNodeExpanded(node.id)" class="canvas-node-fields">
                <n-input
                  v-model:value="canvasFieldKeywords[node.id]"
                  size="small"
                  clearable
                  placeholder="搜索字段"
                  @click.stop
                />
                <button
                  v-for="field in canvasNodeFields(node)"
                  :key="field.id"
                  type="button"
                  class="canvas-field-chip"
                  :class="{ linking: isFieldLinkDraft(node.id, field.name) }"
                  draggable="true"
                  @dragstart.stop="startCanvasFieldDrag($event, node, field)"
                  @dragover.prevent
                  @drop.stop="dropCanvasFieldLink(node, field)"
                  @click.stop="linkCanvasField(node, field)"
                >
                  <span>{{ field.displayName }}</span>
                  <small>{{ field.fieldType }}</small>
                </button>
              </div>
            </div>
            <div
              class="canvas-output-node"
              :class="{ collapsed: !isOutputNodeExpanded() }"
              :style="{ left: `${outputNodePosition().x}px`, top: `${outputNodePosition().y}px` }"
            >
              <div class="canvas-node-title" @mousedown.stop="startOutputNodeDrag">
                <div>
                  <strong>最终输出</strong>
                  <span>{{ visibleOutputFields.length }} 个可见字段</span>
                </div>
                <n-button size="tiny" text @mousedown.stop @click.stop="toggleOutputNodeFields">
                  {{ isOutputNodeExpanded() ? '折叠' : '展开' }}
                </n-button>
              </div>
              <small>output · {{ visibleOutputFields.length }} / {{ model?.outputFields.length ?? 0 }} 字段</small>
              <div v-if="isOutputNodeExpanded()" class="canvas-output-fields">
                <span v-for="field in visibleOutputFields.slice(0, 8)" :key="field.id">
                  {{ field.displayName }}
                </span>
              </div>
            </div>
          </div>
          <div class="canvas-validation-strip">
            <n-alert v-if="fieldLinkDraft" type="info" class="validation-alert">
              正在关联字段：{{ nodeLabel(fieldLinkDraft.nodeId) }}.{{ fieldLabel(fieldLinkDraft.nodeId, fieldLinkDraft.fieldName) }}。
              再点击另一张表字段即可创建 Join。
            </n-alert>
            <n-alert
              v-for="item in modelValidationItems"
              :key="item.text"
              :type="item.type"
              class="validation-alert"
            >
              {{ item.text }}
            </n-alert>
          </div>
        </n-card>
      </div>
    </template>

    <n-modal v-model:show="showCreateModal" preset="card" title="新建数据集" class="dataset-modal">
      <div class="modal-form">
        <label>创建类型</label>
        <n-select
          v-model:value="createType"
          :options="[
            { label: '新建数据集', value: 'normal' },
            { label: '新建关联数据集', value: 'associated' },
          ]"
        />
        <label>数据集名称</label>
        <n-input v-model:value="createName" />
        <template v-if="createType === 'normal'">
          <label>涉敏定级</label>
          <n-select
            v-model:value="createSensitivityChoice"
            :options="sensitivityChoiceOptions"
            placeholder="保存前必须选择涉敏或不涉敏"
          />
        </template>
        <template v-if="createType === 'normal'">
          <label>数据读取方式</label>
          <n-select
            v-model:value="createSourceMode"
            :options="[
              { label: '抽取模式', value: 'extract' },
              { label: '直连模式', value: 'direct' },
            ]"
          />
          <label>来源类型</label>
          <n-select
            :value="createSourceType"
            :options="sourceTypeSelectOptions"
            placeholder="选择来源类型"
            @update:value="updateSourceType"
          />
          <label>数据源连接</label>
          <n-select
            :value="selectedSourceConnectionIds"
            multiple
            filterable
            clearable
            :options="sourceConnectionOptions"
            placeholder="选择一个或多个数据源连接"
            @update:value="updateSourceConnections"
          />
          <label>数据库 / 空间 / Topic 分组</label>
          <n-select
            :value="selectedSourceDatabases"
            multiple
            filterable
            clearable
            :options="sourceDatabaseOptions"
            placeholder="选择连接下的库、空间或目录"
            @update:value="updateSourceDatabases"
          />
          <label>默认表 / 文件 / Topic</label>
          <n-select
            :value="selectedSourceTableIds"
            multiple
            filterable
            clearable
            :options="sourceOptions"
            placeholder="选择创建草稿时默认加入的对象"
            @update:value="updateSelectedSourceTables"
          />
        </template>
        <template v-else>
          <n-alert type="info">关联数据集会按子数据集继承涉敏状态和脱敏字段合集；后续可在编辑器中继续增删关联节点。</n-alert>
          <label>关联数据集</label>
          <n-select
            :value="selectedAssociatedDatasetIds"
            multiple
            filterable
            clearable
            :options="associationDatasetSelectOptions"
            placeholder="搜索并选择一个或多个已有数据集"
            @update:value="updateSelectedAssociatedDatasets"
          />
        </template>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showCreateModal = false">取消</n-button>
          <n-button type="primary" @click="confirmCreate">开始配置</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showFolderModal" preset="card" title="新建文件夹" class="small-modal">
      <div class="modal-form">
        <label>父级目录</label>
        <n-select v-model:value="folderParentId" :options="folderOptions" />
        <label>文件夹名称</label>
        <n-input v-model:value="folderName" placeholder="例如：广告分析" />
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showFolderModal = false">取消</n-button>
          <n-button type="primary" @click="confirmCreateFolder">创建</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showMoveModal" preset="card" title="移动数据集" class="small-modal">
      <div class="modal-form">
        <label>目标文件夹</label>
        <n-select v-model:value="moveFolderId" :options="folderOptions" />
        <n-alert type="info">移动只改变目录位置，不影响模型、同步任务、权限和血缘关系。</n-alert>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showMoveModal = false">取消</n-button>
          <n-button type="primary" @click="confirmMoveDataset">确认移动</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showJoinModal" preset="card" title="Join 配置" class="dataset-modal">
      <div class="modal-form">
        <label>Join 类型</label>
        <n-select
          v-model:value="joinTypeDraft"
          :options="[
            { label: 'Left Join', value: 'left' },
            { label: 'Inner Join', value: 'inner' },
            { label: 'Right Join', value: 'right' },
            { label: 'Full Join', value: 'full' },
          ]"
        />
        <label>左节点</label>
        <n-select :value="joinSourceNodeId" filterable :options="modelNodeOptions" @update:value="updateJoinSourceNode" />
        <label>右节点</label>
        <n-select :value="joinTargetNodeId" filterable :options="modelNodeOptions" @update:value="updateJoinTargetNode" />
        <label>左字段</label>
        <n-select v-model:value="joinLeftField" filterable :options="leftJoinFieldOptions" />
        <label>右字段</label>
        <n-select v-model:value="joinRightField" filterable :options="rightJoinFieldOptions" />
        <n-checkbox v-model:checked="joinUseIdMapping">启用 ID-Mapping 进行跨主体关联</n-checkbox>
        <div v-if="selectedEdge?.relationType === 'join' && selectedEdge.joinConfig" class="join-condition-list">
          <strong>已有字段关联</strong>
          <div v-for="condition in selectedEdge.joinConfig.conditions" :key="condition.id">
            <span>
              {{ nodeLabel(selectedEdge.sourceNodeId) }}.{{ condition.leftField }}
              =
              {{ nodeLabel(selectedEdge.targetNodeId) }}.{{ condition.rightField }}
            </span>
            <n-tag v-if="condition.useIdMapping" size="small" type="info">ID-Mapping</n-tag>
            <n-button size="tiny" text type="error" @click="removeJoinCondition(selectedEdge, condition.id)">删除</n-button>
          </div>
        </div>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showJoinModal = false">取消</n-button>
          <n-button type="primary" @click="saveJoinConfig">保存 Join</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showUnionModal" preset="card" title="Union 多表合并" class="dataset-modal">
      <div class="modal-form">
        <label>参与合并的节点</label>
        <n-select
          v-model:value="unionNodeIds"
          multiple
          filterable
          :options="modelNodeOptions"
          placeholder="请选择至少两张表或数据集节点"
        />
        <label>合并方式</label>
        <n-select
          v-model:value="unionTypeDraft"
          :options="[
            { label: 'Union All：保留重复行', value: 'union_all' },
            { label: 'Union Distinct：合并重复行', value: 'union_distinct' },
          ]"
        />
        <n-alert type="info">
          会根据第一个节点的字段生成输出字段映射；同名字段自动匹配，不存在的字段按 NULL 处理，字段类型不一致会在画布校验中提示。
        </n-alert>
        <div class="union-preview">
          <div v-for="node in selectedUnionNodes" :key="node.id">
            <strong>{{ node.alias }}</strong>
            <span>{{ node.selectedFields.map((field) => field.name).slice(0, 5).join('、') }}</span>
          </div>
        </div>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showUnionModal = false">取消</n-button>
          <n-button type="primary" @click="saveUnionConfig">保存 Union</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showCalcFieldModal" preset="card" title="新增计算字段" class="dataset-modal">
      <div class="modal-form">
        <label>字段名</label>
        <n-input v-model:value="calcFieldDraft.name" />
        <label>显示名</label>
        <n-input v-model:value="calcFieldDraft.displayName" />
        <label>字段类型</label>
        <n-select v-model:value="calcFieldDraft.fieldType" :options="fieldTypeOptions" />
        <label>表达式</label>
        <n-input v-model:value="calcFieldDraft.expression" type="textarea" />
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showCalcFieldModal = false">取消</n-button>
          <n-button type="primary" @click="addCalculatedField">添加字段</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showDeleteModal" preset="card" title="删除确认" class="small-modal">
      <n-alert type="warning">
        {{ selectedDataset?.status === 'deleted' ? '彻底删除后无法恢复。' : '删除后会进入回收站，可在回收站恢复。' }}
      </n-alert>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showDeleteModal = false">取消</n-button>
          <n-button type="error" @click="confirmDelete">确认删除</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showPermissionModal" preset="card" title="申请数据权限" class="small-modal">
      <div class="modal-form">
        <label>申请原因</label>
        <n-input type="textarea" value="需要用于广告观看下降分析与运营联动演示。" />
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showPermissionModal = false">取消</n-button>
          <n-button type="primary" @click="requestDatasetPermission">提交申请</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showLogModal" preset="card" title="同步日志" class="dataset-modal">
      <pre class="log-box">{{ selectedTaskLog?.logLines.join('\n') }}</pre>
    </n-modal>
  </div>
</template>

<style scoped lang="scss">
.dataset-page {
  min-height: 100%;
  padding: 32px;
  background: #f3f6fb;
  color: #111827;
}

.dataset-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 20px;

  h1 {
    margin: 0;
    font-size: 30px;
    line-height: 1.2;
  }

  p {
    margin: 12px 0 0;
    color: #667085;
    font-weight: 600;
  }
}

.dataset-notice {
  margin-bottom: 16px;
}

.dataset-toolbar {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) 180px 180px 180px;
  gap: 12px;
  padding: 16px;
  margin-bottom: 16px;
  background: white;
  border-radius: 6px;
}

.dataset-layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 16px;
  min-height: 680px;
}

.dataset-tree,
.dataset-detail,
.editor-sidebar,
.editor-main {
  border-radius: 6px;
}

.section-switch {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-bottom: 16px;

  button {
    border: 1px solid #d9dee8;
    background: #f8fafc;
    border-radius: 4px;
    padding: 8px;
    cursor: pointer;
    font-weight: 700;
  }

  .active {
    color: #16a05d;
    border-color: #16a05d;
    background: #ecfdf3;
  }
}

.folder-list {
  max-height: 700px;
  overflow: auto;
}

.folder-block {
  margin-bottom: 14px;
}

.folder-name {
  color: #667085;
  font-weight: 800;
  margin: 10px 0 8px;
}

.dataset-item {
  width: 100%;
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  text-align: left;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 700;
  }

  &.selected,
  &:hover {
    border-color: #16a05d;
    background: #f0fdf4;
  }
}

.detail-header {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 12px;

  p {
    margin: 8px 0 0;
    color: #667085;
  }
}

.detail-title-row {
  display: flex;
  align-items: center;
  gap: 10px;

  h2 {
    margin: 0;
  }
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
}

.stat-card {
  background: #f8fafc;
  border-radius: 6px;
  padding: 16px;

  span {
    display: block;
    color: #667085;
    font-weight: 700;
  }

  strong {
    display: block;
    margin-top: 10px;
    font-size: 22px;
  }
}

.tag-row,
.pane-actions,
.sync-config,
.task-row,
.schema-row,
.model-summary,
.lineage-edges,
.rule-list {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 16px;
}

.schema-list,
.task-list {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.schema-row,
.task-row,
.rule-card,
.model-box,
.node-config,
.edge-config,
.filter-group {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  padding: 12px;
}

.schema-row,
.task-row,
.node-config,
.edge-config {
  align-items: center;
  justify-content: space-between;
}

.schema-row span,
.task-row span,
.model-box span,
.node-config span {
  color: #667085;
}

.model-column {
  flex: 1;
  min-width: 260px;
}

.lineage-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(160px, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.lineage-node {
  border: 1px solid #d9dee8;
  border-radius: 6px;
  padding: 14px;

  span {
    display: block;
    margin-top: 6px;
    color: #667085;
  }

  &.current {
    border-color: #16a05d;
    background: #ecfdf3;
  }
}

.rule-card {
  display: grid;
  gap: 8px;
  min-width: 260px;
}

.permission-editor,
.runtime-param-editor {
  display: grid;
  grid-template-columns: 140px minmax(180px, 1fr) 140px auto;
  gap: 10px;
  align-items: center;
  margin-top: 16px;
}

.runtime-param-list {
  display: grid;
  gap: 8px;
}

.runtime-param-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #f8fafc;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.editor-layout {
  display: grid;
  grid-template-columns: minmax(520px, 44%) minmax(0, 1fr);
  gap: 16px;
}

.editor-sidebar {
  max-height: calc(100vh - 210px);
  overflow: auto;
}

.editor-main {
  min-height: calc(100vh - 210px);
}

.editor-form {
  display: grid;
  gap: 12px;

  label {
    color: #344054;
    font-weight: 800;
  }
}

.node-config.selected,
.canvas-node.selected {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.12);
}

.basic-config-section {
  display: grid;
  gap: 10px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.basic-section-title {
  display: grid;
  gap: 4px;
  margin-bottom: 2px;

  strong {
    color: #101828;
    font-size: 16px;
  }

  span {
    color: #667085;
    font-size: 13px;
    line-height: 1.5;
  }
}

.associated-preview-list,
.union-preview {
  display: grid;
  gap: 8px;

  > div {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
    align-items: center;
    padding: 10px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: #f8fafc;
  }

  strong,
  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span {
    color: #667085;
    font-size: 13px;
  }
}

.associated-preview-list,
.union-preview {
  > div {
    grid-template-columns: minmax(0, 1fr);
  }
}

.join-condition-list {
  display: grid;
  gap: 8px;
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #f8fafc;

  > div {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: 8px;
    align-items: center;
  }

  span {
    overflow: hidden;
    color: #344054;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.edge-config {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #f8fafc;

  span {
    overflow: hidden;
    color: #667085;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.filter-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.filter-row {
  display: grid;
  grid-template-columns: minmax(72px, 88px) minmax(0, 1.25fr) minmax(108px, 0.72fr) minmax(0, 1fr) max-content;
  gap: 10px;
  align-items: center;
  margin-top: 8px;

  > * {
    min-width: 0;
  }
}

.filter-block {
  display: grid;
  gap: 8px;
}

.filter-row.child {
  grid-template-columns: minmax(72px, 88px) minmax(0, 1.25fr) minmax(108px, 0.72fr) minmax(0, 1fr) max-content;
}

.filter-logic-placeholder {
  color: #98a2b3;
  font-weight: 700;
  text-align: center;
}

.filter-actions {
  display: flex;
  flex-wrap: nowrap;
  gap: 12px;
  justify-content: flex-end;
  white-space: nowrap;
}

.filter-children {
  display: grid;
  gap: 8px;
  padding: 8px 0 0 18px;
  margin-left: 28px;
  border-left: 2px solid #bbf7d0;
}

.field-config {
  display: grid;
  grid-template-columns: 36px minmax(150px, 1fr) 110px 130px 130px;
  gap: 8px;
  align-items: center;
}

.field-sort-select {
  width: 160px;
}

.three-inputs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.canvas-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;

  h2 {
    margin: 0;
  }

  p {
    margin: 6px 0 0;
    color: #667085;
  }
}

.canvas-area {
  position: relative;
  height: 620px;
  min-height: 620px;
  border: 1px dashed #cbd5e1;
  border-radius: 6px;
  background:
    linear-gradient(90deg, rgba(148, 163, 184, 0.12) 1px, transparent 1px),
    linear-gradient(rgba(148, 163, 184, 0.12) 1px, transparent 1px);
  background-size: 32px 32px;
  overflow: auto;
}

.canvas-relations-svg {
  position: absolute;
  inset: 0;
  z-index: 1;
  min-width: 1600px;
  min-height: 900px;
  pointer-events: none;
}

.canvas-relation-group {
  pointer-events: auto;
  cursor: pointer;
}

.canvas-join-line {
  stroke: #16a05d;
  stroke-width: 2.5;
  fill: none;

  &.selected {
    stroke: #2563eb;
    stroke-width: 3.5;
  }
}

.canvas-output-line {
  stroke: #94a3b8;
  stroke-dasharray: 6 6;
  stroke-width: 1.6;
}

.canvas-line-label {
  fill: #166534;
  font-size: 12px;
  font-weight: 800;
  paint-order: stroke;
  stroke: #fff;
  stroke-width: 4;
}

.canvas-node {
  position: absolute;
  z-index: 2;
  width: 284px;
  height: 250px;
  border: 1px solid #d9dee8;
  border-radius: 6px;
  padding: 12px;
  background: white;
  cursor: pointer;

  strong,
  span,
  small {
    display: block;
  }

  span,
  small {
    color: #667085;
    margin-top: 6px;
  }

  &.collapsed {
    width: 240px;
    height: 104px;
  }

  &.invalid {
    border-color: #f59e0b;
    background: #fffbeb;
  }

  &.selected {
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.14);
  }
}

.canvas-node-title {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: flex-start;
  cursor: grab;
  user-select: none;

  strong,
  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.canvas-node-fields {
  display: grid;
  gap: 6px;
  max-height: 166px;
  margin-top: 10px;
  overflow: auto;
}

.canvas-field-chip {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background: #f8fafc;
  color: #111827;
  text-align: left;
  cursor: pointer;

  span {
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    margin: 0;
    color: #667085;
  }

  &:hover,
  &.linking {
    border-color: #16a05d;
    background: #ecfdf3;
  }
}

.canvas-output-node {
  position: absolute;
  z-index: 2;
  width: 292px;
  height: 250px;
  padding: 12px;
  border: 1px solid #16a05d;
  border-radius: 6px;
  background: #f0fdf4;
  cursor: pointer;

  strong,
  span,
  small {
    display: block;
  }

  span,
  small {
    color: #667085;
    margin-top: 6px;
  }

  small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &.collapsed {
    width: 240px;
    height: 104px;
  }
}

.canvas-output-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;

  span {
    max-width: 122px;
    padding: 4px 8px;
    overflow: hidden;
    border-radius: 999px;
    background: white;
    color: #166534;
    font-size: 12px;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.canvas-validation-strip {
  display: grid;
  gap: 8px;
  margin-top: 12px;

  span {
    color: #667085;
  }
}

.node-config {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
}

.node-config-main {
  display: grid;
  grid-template-columns: minmax(180px, 1fr);
  gap: 6px;
}

.node-field-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  max-height: 112px;
  overflow: auto;
  padding: 8px;
  border-radius: 6px;
  background: #f8fafc;
}

.validation-alert {
  margin-top: 8px;
}

.dataset-modal {
  width: 720px;
}

.small-modal {
  width: 460px;
}

.modal-form {
  display: grid;
  gap: 12px;
}

.log-box {
  margin: 0;
  padding: 16px;
  border-radius: 6px;
  background: #0f172a;
  color: #e2e8f0;
  white-space: pre-wrap;
}

@media (max-width: 1280px) {
  .dataset-layout,
  .editor-layout {
    grid-template-columns: 1fr;
  }

  .stat-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .permission-editor,
  .runtime-param-editor {
    grid-template-columns: 1fr;
  }
}
</style>
