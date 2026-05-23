<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from 'vue'
import type { VNodeChild } from 'vue'
import { useRouter } from 'vue-router'
import {
  NAlert,
  NButton,
  NCard,
  NCheckbox,
  NDataTable,
  NDropdown,
  NEmpty,
  NInput,
  NInputNumber,
  NModal,
  NPagination,
  NSelect,
  NSpace,
  NTag,
  NTooltip,
} from 'naive-ui'
import type { DataTableColumns, DataTableRowKey, DropdownOption, SelectOption, TagProps } from 'naive-ui'
import { datasetService } from '@/services/datasetService'
import type {
  Dataset,
  DatasetCategory,
  DatasetFolder,
  DatasetListConnectionMode,
  DatasetListSourceType,
  DatasetListSyncStatus,
  DatasetPermission,
  DatasetPriority,
  DatasetRunFrequency,
  SensitivityChoice,
  DatasetSensitivityLevel,
  DatasetStatus,
  DatasetStorageEngine,
  DatasetType,
} from '@/types/dataset'

type StatusFilterValue = 'all' | DatasetListSyncStatus | 'deleted'
type ModalName =
  | 'basic'
  | 'move'
  | 'copy'
  | 'delete'
  | 'usage'
  | 'visual'
  | 'tags'
  | 'permission'
  | 'tagManage'
  | 'parameterManage'
  | 'categoryManage'
  | 'create'
  | 'permanentDelete'
  | 'deletedModel'
  | null

type RecycleMode = 'restore' | 'rebuild'
type CreateAssetType = 'normal' | 'associated' | 'folder'

interface CreateFormState {
  type: CreateAssetType
  name: string
  folderId: string
  sensitivityChoice: SensitivityChoice | null
  sourceDatasetIds: string[]
}

interface DatasetListRow extends Dataset {
  category: DatasetCategory
  sourceTypeForList: DatasetListSourceType
  connectionModeForList: DatasetListConnectionMode
  syncStatusForList: DatasetListSyncStatus
  sensitivityForList: DatasetSensitivityLevel
  alarmOwnerForList: string
  priorityForList: DatasetPriority
  queueNameForList: string
  runFrequencyForList: DatasetRunFrequency
  dataSizeForList: number
  latestAccessTimeForList: string
  folderPath: string
  sourceLabel: string
}

interface ProjectTag {
  id: string
  name: string
  color: TagProps['type']
  inheritToChartTitle: boolean
}

interface DatasetParameter {
  id: string
  scope: 'public' | 'personal'
  name: string
  valueType: 'integer' | 'decimal' | 'text' | 'date' | 'datetime' | 'boolean'
  defaultValue: string
  inputStyle: 'input' | 'dropdown' | 'multi_select' | 'date_picker' | 'date_range_picker'
  appliedDatasetIds: string[]
}

interface DeletedModelSnapshot {
  id: string
  datasetId?: string
  name: string
  deletedAt: string
  deletedBy: string
  sourceType: DatasetListSourceType
  fieldCount: number
  nodeCount: number
  relationCount: number
  recoverable: boolean
  reason: string
}

const router = useRouter()

const loading = ref(false)
const datasets = ref<Dataset[]>([])
const folders = ref<DatasetFolder[]>([])
const keywordInput = ref('')
const keyword = ref('')
const showAdvancedFilters = ref(false)
const selectedRowKeys = ref<DataTableRowKey[]>([])
const selectedDatasetId = ref<string>('')
const pageNo = ref(1)
const pageSize = ref(20)
const activeModal = ref<ModalName>(null)
const feedback = ref('已加载数据集列表。')
const feedbackType = ref<'success' | 'warning' | 'error'>('success')
const recycleMode = ref<RecycleMode>('restore')
const deletedModelKeyword = ref('')

const sourceFilter = ref<'all' | DatasetListSourceType>('all')
const typeFilter = ref<'all' | DatasetType>('all')
const statusFilter = ref<StatusFilterValue>('all')
const categoryFilter = ref<'all' | DatasetCategory>('all')
const sensitivityFilter = ref<'all' | DatasetSensitivityLevel>('all')
const storageFilter = ref<'all' | DatasetStorageEngine>('all')
const alarmOwnerFilter = ref('all')
const priorityFilter = ref<'all' | DatasetPriority>('all')
const queueFilter = ref('all')
const runFrequencyFilter = ref<'all' | DatasetRunFrequency>('all')
const tagFilter = ref<string[]>([])

const currentDataset = computed(() => rowItems.value.find((item) => item.id === selectedDatasetId.value))
const modalDataset = ref<DatasetListRow | null>(null)
const selectedDeletedModel = ref<DeletedModelSnapshot | null>(null)

const basicForm = ref({ name: '', description: '', folderId: '' })
const moveTargetFolderId = ref('')
const copyForm = ref({
  name: '',
  folderId: '',
  copyFieldConfig: true,
  copySyncConfig: true,
  copyVisualQueryConfig: true,
  copyUsageInstruction: false,
})
const deleteConfirmName = ref('')
const usageForm = ref({ url: '' })
const visualForm = ref({
  allowSubscription: true,
  allowMonitoring: true,
  allowAutoQuery: true,
  allowFilterSearchOptimization: true,
  maxQueryDaysEnabled: true,
  maxQueryDays: 30,
  defaultVisualQueryUrl: '',
  allowDropTimeoutNode: false,
  detailFieldIds: [] as string[],
  timeoutAccuracyLossThreshold: 5,
})
const visualFieldOptions = ref<SelectOption[]>([])
const tagSetting = ref<string[]>([])
const permissionForm = ref({
  subjectType: 'user' as 'user' | 'team' | 'role',
  subjectName: '',
  permissions: ['view'] as DatasetPermission[],
})
const createForm = ref<CreateFormState>({
  type: 'normal',
  name: '',
  folderId: 'folder_ad',
  sensitivityChoice: null,
  sourceDatasetIds: [],
})

const permissionLevelOptions: SelectOption[] = [
  { label: '预览', value: 'read_preview' },
  { label: '查看', value: 'view' },
  { label: '编辑', value: 'edit' },
  { label: '管理', value: 'admin' },
]

const projectTags = ref<ProjectTag[]>([
  { id: 'tag_ad', name: '广告', color: 'success', inheritToChartTitle: true },
  { id: 'tag_core', name: '核心数据集', color: 'error', inheritToChartTitle: true },
  { id: 'tag_ltv', name: 'LTV', color: 'info', inheritToChartTitle: false },
  { id: 'tag_low_coin', name: '低金币', color: 'warning', inheritToChartTitle: true },
  { id: 'tag_deprecated', name: '已废弃', color: 'default', inheritToChartTitle: false },
])
const newTagForm = ref({ name: '', color: 'success' as TagProps['type'], inheritToChartTitle: false })
const editingTagId = ref<string | null>(null)
const editTagForm = ref({ name: '', color: 'success' as TagProps['type'], inheritToChartTitle: false })
const parameters = ref<DatasetParameter[]>([
  {
    id: 'param_target_ltv',
    scope: 'public',
    name: '目标 LTV',
    valueType: 'decimal',
    defaultValue: '0.58',
    inputStyle: 'input',
    appliedDatasetIds: ['ds_payment_success'],
  },
  {
    id: 'param_experiment_group',
    scope: 'personal',
    name: '实验组',
    valueType: 'text',
    defaultValue: 'B',
    inputStyle: 'dropdown',
    appliedDatasetIds: ['ds_ad_watch_detail', 'ds_low_coin_behavior_assoc'],
  },
])
const newParameterForm = ref({
  name: '',
  scope: 'personal' as DatasetParameter['scope'],
  valueType: 'text' as DatasetParameter['valueType'],
  defaultValue: '',
  inputStyle: 'input' as DatasetParameter['inputStyle'],
})
const editingParameterId = ref<string | null>(null)
const editParameterForm = ref({
  name: '',
  scope: 'personal' as DatasetParameter['scope'],
  valueType: 'text' as DatasetParameter['valueType'],
  defaultValue: '',
  inputStyle: 'input' as DatasetParameter['inputStyle'],
})
const fieldCategories = ref([
  { id: 'cat_user', name: '用户属性', allowDatasetCustomCategory: true },
  { id: 'cat_trade', name: '交易指标', allowDatasetCustomCategory: false },
  { id: 'cat_ad', name: '广告行为', allowDatasetCustomCategory: true },
])
const newCategoryForm = ref({ name: '', allowDatasetCustomCategory: true })
const editingCategoryId = ref<string | null>(null)
const editCategoryForm = ref({ name: '', allowDatasetCustomCategory: true })

let keywordTimer: number | undefined

const sourceTypeOptions: SelectOption[] = [
  { label: '全部来源', value: 'all' },
  { label: '数据连接', value: 'data_connection' },
  { label: '可视化建模', value: 'visual_model' },
  { label: '主题数据集', value: 'theme_dataset' },
  { label: '镜像数据集', value: 'mirror_dataset' },
  { label: '文件上传', value: 'file_upload' },
  { label: '自定义 SQL', value: 'custom_sql' },
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
const syncStatusOptions: SelectOption[] = [
  { label: '全部状态', value: 'all' },
  { label: '无同步', value: 'none' },
  { label: '等待中', value: 'waiting' },
  { label: '同步中', value: 'running' },
  { label: '同步成功', value: 'success' },
  { label: '同步失败', value: 'failed' },
  { label: '部分成功', value: 'partial_success' },
  { label: '已禁用', value: 'disabled' },
  { label: '回收站', value: 'deleted' },
]
const categoryOptions: SelectOption[] = [
  { label: '全部分类', value: 'all' },
  { label: '个人数据集', value: 'personal' },
  { label: '共享数据集', value: 'shared' },
  { label: '公共数据集', value: 'public' },
]
const sensitivityOptions: SelectOption[] = [
  { label: '全部涉敏定级', value: 'all' },
  { label: '未定级', value: 'unclassified' },
  { label: '涉敏未脱敏', value: 'sensitive_unmasked' },
  { label: '涉敏已脱敏', value: 'sensitive_masked' },
  { label: '非敏感', value: 'non_sensitive' },
]
const createSensitivityOptions: Array<SelectOption & { value: SensitivityChoice }> = [
  { label: '涉敏', value: 'sensitive' },
  { label: '不涉敏', value: 'non_sensitive' },
]
const priorityOptions: SelectOption[] = [
  { label: '全部优先级', value: 'all' },
  { label: '普通', value: 'normal' },
  { label: '高', value: 'high' },
  { label: '非常高', value: 'very_high' },
]
const runFrequencyOptions: SelectOption[] = [
  { label: '全部运行频率', value: 'all' },
  { label: '无调度', value: 'none' },
  { label: '手动', value: 'manual' },
  { label: '分钟级', value: 'minute' },
  { label: '小时级', value: 'hour' },
  { label: '天级', value: 'day' },
  { label: '周级', value: 'week' },
  { label: '月级', value: 'month' },
]
const storageOptions = computed<SelectOption[]>(() => [
  { label: '全部存储', value: 'all' },
  ...Array.from(new Set(rowItems.value.map((item) => item.storageEngine))).map((storage) => ({
    label: storage.toUpperCase(),
    value: storage,
  })),
])
const alarmOwnerOptions = computed<SelectOption[]>(() => [
  { label: '全部告警人', value: 'all' },
  ...Array.from(new Set(rowItems.value.map((item) => item.alarmOwnerForList))).map((owner) => ({
    label: owner,
    value: owner,
  })),
])
const queueOptions = computed<SelectOption[]>(() => [
  { label: '全部队列', value: 'all' },
  ...Array.from(new Set(rowItems.value.map((item) => item.queueNameForList))).map((queue) => ({
    label: queue,
    value: queue,
  })),
])
const tagOptions = computed<SelectOption[]>(() =>
  projectTags.value.map((tag) => ({
    label: tag.name,
    value: tag.name,
  })),
)
const folderOptions = computed<SelectOption[]>(() =>
  folders.value
    .filter((folder) => folder.section === 'custom' && !folder.readonly)
    .map((folder) => ({
      label: folderPath(folder.id),
      value: folder.id,
    })),
)

const associationDatasetOptions = computed<SelectOption[]>(() =>
  rowItems.value
    .filter((item) => item.status !== 'deleted' && item.datasetType !== 'theme_gmp')
    .map((item) => ({
      label: `${item.name} · ${sensitivityLabel(item.sensitivityForList)}`,
      value: item.id,
    })),
)

function normalizeText(value: string | undefined): string {
  return String(value ?? '').trim().toLowerCase()
}

function folderPath(folderId: string | undefined): string {
  const folder = folders.value.find((item) => item.id === folderId)
  if (!folder) {
    return '未归档'
  }
  if (!folder.parentId) {
    return folder.name
  }
  return `${folderPath(folder.parentId)} / ${folder.name}`
}

function inferCategory(dataset: Dataset): DatasetCategory {
  if (dataset.datasetCategory) {
    return dataset.datasetCategory
  }
  if (dataset.visibility === 'private') {
    return 'personal'
  }
  if (dataset.visibility === 'public' || dataset.section === 'theme') {
    return 'public'
  }
  return dataset.owner === 'Chaoyang Xu' ? 'personal' : 'shared'
}

function inferSourceType(dataset: Dataset): DatasetListSourceType {
  if (dataset.sourceType) {
    return dataset.sourceType
  }
  if (dataset.sourceMode === 'theme') {
    return 'theme_dataset'
  }
  if (dataset.datasetType === 'associated') {
    return 'visual_model'
  }
  if (dataset.storageEngine === 'unknown') {
    return 'file_upload'
  }
  return dataset.tableName?.includes('sql') ? 'custom_sql' : 'data_connection'
}

function inferConnectionMode(dataset: Dataset): DatasetListConnectionMode {
  if (dataset.connectionMode) {
    return dataset.connectionMode
  }
  if (dataset.sourceMode === 'theme') {
    return 'theme'
  }
  return dataset.sourceMode === 'direct' ? 'direct' : 'extract'
}

function inferSyncStatus(dataset: Dataset): DatasetListSyncStatus {
  if (dataset.syncStatus) {
    return dataset.syncStatus
  }
  const statusMap: Record<DatasetStatus, DatasetListSyncStatus> = {
    draft: 'none',
    editing: 'none',
    validating: 'waiting',
    saved: 'none',
    syncing: 'running',
    sync_success: 'success',
    sync_failed: 'failed',
    disabled: 'disabled',
    deleted: 'disabled',
  }
  return statusMap[dataset.status]
}

function inferSensitivity(dataset: Dataset): DatasetSensitivityLevel {
  if (dataset.sensitivityLevel) {
    return dataset.sensitivityLevel
  }
  if (dataset.tags.some((tag) => ['用户', '画像', '低金币'].includes(tag))) {
    return 'sensitive_masked'
  }
  if (dataset.tags.includes('交易')) {
    return 'sensitive_unmasked'
  }
  return dataset.tags.includes('公开') ? 'non_sensitive' : 'unclassified'
}

function inferRunFrequency(dataset: Dataset): DatasetRunFrequency {
  if (dataset.runFrequency) {
    return dataset.runFrequency
  }
  if (dataset.status === 'sync_failed') {
    return 'hour'
  }
  if (dataset.sourceMode === 'extract') {
    return 'day'
  }
  return dataset.sourceMode === 'direct' ? 'none' : 'manual'
}

function toRow(dataset: Dataset): DatasetListRow {
  const category = inferCategory(dataset)
  const sourceTypeForList = inferSourceType(dataset)
  const connectionModeForList = inferConnectionMode(dataset)
  return {
    ...dataset,
    category,
    sourceTypeForList,
    connectionModeForList,
    syncStatusForList: inferSyncStatus(dataset),
    sensitivityForList: inferSensitivity(dataset),
    alarmOwnerForList: dataset.alarmOwner ?? (dataset.tags.includes('交易') ? '交易分析组' : '运营分析组'),
    priorityForList: dataset.priority ?? (dataset.tags.includes('核心数据集') ? 'very_high' : dataset.status === 'sync_failed' ? 'high' : 'normal'),
    queueNameForList: dataset.queueName ?? (dataset.storageEngine === 'hive' ? 'offline_prod' : 'interactive_default'),
    runFrequencyForList: inferRunFrequency(dataset),
    dataSizeForList: dataset.dataSizeBytes ?? Math.max(dataset.rowCount * Math.max(dataset.fieldCount, 1) * 12, 128_000),
    latestAccessTimeForList: dataset.latestAccessTime ?? dataset.updatedAt,
    folderPath: folderPath(dataset.folderId),
    sourceLabel: dataset.connectionName ?? (dataset.sourceMode === 'theme' ? '主题数据集' : '可视化建模'),
  }
}

const rowItems = computed<DatasetListRow[]>(() => datasets.value.map((dataset) => toRow(dataset)))

const filteredRows = computed(() => {
  const kw = normalizeText(keyword.value)
  return rowItems.value
    .filter((item) => {
      if (statusFilter.value === 'deleted') {
        return item.status === 'deleted'
      }
      if (item.status === 'deleted') {
        return false
      }
      return true
    })
    .filter((item) => {
      if (!kw) {
        return true
      }
      return [
        item.name,
        item.description,
        item.sourceLabel,
        item.tableName,
        item.owner,
        item.permission,
        item.folderPath,
        ...item.tags,
      ].some((field) => normalizeText(field).includes(kw))
    })
    .filter((item) => sourceFilter.value === 'all' || item.sourceTypeForList === sourceFilter.value)
    .filter((item) => typeFilter.value === 'all' || item.datasetType === typeFilter.value)
    .filter((item) => statusFilter.value === 'all' || statusFilter.value === 'deleted' || item.syncStatusForList === statusFilter.value)
    .filter((item) => categoryFilter.value === 'all' || item.category === categoryFilter.value)
    .filter((item) => sensitivityFilter.value === 'all' || item.sensitivityForList === sensitivityFilter.value)
    .filter((item) => storageFilter.value === 'all' || item.storageEngine === storageFilter.value)
    .filter((item) => alarmOwnerFilter.value === 'all' || item.alarmOwnerForList === alarmOwnerFilter.value)
    .filter((item) => priorityFilter.value === 'all' || item.priorityForList === priorityFilter.value)
    .filter((item) => queueFilter.value === 'all' || item.queueNameForList === queueFilter.value)
    .filter((item) => runFrequencyFilter.value === 'all' || item.runFrequencyForList === runFrequencyFilter.value)
    .filter((item) => tagFilter.value.length === 0 || tagFilter.value.every((tag) => item.tags.includes(tag)))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
})

const pagedRows = computed(() => {
  const start = (pageNo.value - 1) * pageSize.value
  return filteredRows.value.slice(start, start + pageSize.value)
})

const selectedRows = computed(() =>
  rowItems.value.filter((item) => selectedRowKeys.value.includes(item.id)),
)

const deletedModelSnapshots = computed<DeletedModelSnapshot[]>(() => {
  const deletedRows = rowItems.value
    .filter((item) => item.status === 'deleted')
    .map((item, index) => ({
      id: `snapshot_${item.id}`,
      datasetId: item.id,
      name: item.name,
      deletedAt: item.deletedAt ?? item.updatedAt,
      deletedBy: item.owner,
      sourceType: item.sourceTypeForList,
      fieldCount: item.fieldCount,
      nodeCount: item.datasetType === 'associated' ? 2 : 1,
      relationCount: item.datasetType === 'associated' ? 1 : 0,
      recoverable: index < 7,
      reason: item.deletedAt ? '15 天内可直接恢复，模型结构可用于重建。' : '历史删除记录，可基于模型快照重建。',
    }))
  const historyRows: DeletedModelSnapshot[] = [
    {
      id: 'snapshot_old_low_coin_ad_model',
      name: '低金币广告行为宽表模型',
      deletedAt: '2026-05-12 18:40:00',
      deletedBy: 'Mia Chen',
      sourceType: 'visual_model',
      fieldCount: 36,
      nodeCount: 3,
      relationCount: 2,
      recoverable: false,
      reason: '数据集已超过直接恢复窗口，仅保留模型结构和字段映射。',
    },
    {
      id: 'snapshot_old_campaign_roi',
      name: '运营活动 ROI 复盘模型',
      deletedAt: '2026-05-08 09:10:00',
      deletedBy: 'Chaoyang Xu',
      sourceType: 'custom_sql',
      fieldCount: 24,
      nodeCount: 1,
      relationCount: 0,
      recoverable: false,
      reason: '原 SQL 仍可查看，底表权限需重新校验。',
    },
  ]
  const kw = normalizeText(deletedModelKeyword.value)
  return [...deletedRows, ...historyRows].filter((item) => !kw || normalizeText(item.name).includes(kw))
})

function highlightedText(text: string): VNodeChild[] {
  const kw = keyword.value.trim()
  if (!kw) {
    return [text]
  }
  const lowerText = text.toLowerCase()
  const lowerKw = kw.toLowerCase()
  const index = lowerText.indexOf(lowerKw)
  if (index < 0) {
    return [text]
  }
  return [
    text.slice(0, index),
    h('mark', { class: 'dataset-highlight' }, text.slice(index, index + kw.length)),
    text.slice(index + kw.length),
  ]
}

function tagType(tagName: string): TagProps['type'] {
  return projectTags.value.find((tag) => tag.name === tagName)?.color ?? 'default'
}

function statusMeta(status: DatasetListSyncStatus): { label: string; type: TagProps['type'] } {
  const map: Record<DatasetListSyncStatus, { label: string; type: TagProps['type'] }> = {
    none: { label: '无同步', type: 'default' },
    waiting: { label: '等待中', type: 'info' },
    running: { label: '同步中', type: 'info' },
    success: { label: '同步成功', type: 'success' },
    failed: { label: '同步失败', type: 'error' },
    partial_success: { label: '部分成功', type: 'warning' },
    disabled: { label: '已禁用', type: 'default' },
  }
  return map[status]
}

function categoryLabel(category: DatasetCategory): string {
  const map: Record<DatasetCategory, string> = {
    personal: '个人',
    shared: '共享',
    public: '公共',
  }
  return map[category]
}

function sensitivityLabel(level: DatasetSensitivityLevel): string {
  const option = sensitivityOptions.find((item) => item.value === level)
  return typeof option?.label === 'string' ? option.label : level
}

function datasetTypeLabel(type: DatasetType): string {
  const map: Record<DatasetType, string> = {
    normal: '普通',
    associated: '关联',
    theme_cdp: 'CDP 主题',
    theme_data_insight: '洞察主题',
    theme_gmp: 'GMP 主题',
    las: 'LAS',
  }
  return map[type]
}

function sourceTypeLabel(type: DatasetListSourceType): string {
  const map: Record<DatasetListSourceType, string> = {
    data_connection: '数据连接',
    visual_model: '可视化建模',
    theme_dataset: '主题数据集',
    mirror_dataset: '镜像数据集',
    file_upload: '文件上传',
    custom_sql: '自定义 SQL',
  }
  return map[type]
}

function permissionLabel(permission: DatasetPermission): string {
  const map: Record<DatasetPermission, string> = {
    none: '无权限',
    read_preview: '预览',
    view: '查看',
    edit: '编辑',
    admin: '管理',
  }
  return map[permission]
}

function normalizePermissions(permissions: DatasetPermission[]): DatasetPermission[] {
  const order: DatasetPermission[] = ['read_preview', 'view', 'edit', 'admin']
  const selected = new Set<DatasetPermission>(permissions.filter((permission) => permission !== 'none'))
  return order.filter((permission) => selected.has(permission))
}

function highestPermission(permissions: DatasetPermission[]): DatasetPermission {
  return normalizePermissions(permissions).at(-1) ?? 'none'
}

function resetPage() {
  pageNo.value = 1
}

function clearFilters() {
  keywordInput.value = ''
  keyword.value = ''
  sourceFilter.value = 'all'
  typeFilter.value = 'all'
  statusFilter.value = 'all'
  categoryFilter.value = 'all'
  sensitivityFilter.value = 'all'
  storageFilter.value = 'all'
  alarmOwnerFilter.value = 'all'
  priorityFilter.value = 'all'
  queueFilter.value = 'all'
  runFrequencyFilter.value = 'all'
  tagFilter.value = []
  feedback.value = '已清空筛选条件。'
  feedbackType.value = 'success'
}

function activeFilterLabels(): { label: string; clear: () => void }[] {
  const labels: { label: string; clear: () => void }[] = []
  if (keyword.value) {
    labels.push({ label: `搜索：${keyword.value}`, clear: () => { keywordInput.value = ''; keyword.value = '' } })
  }
  const optionLabel = (options: SelectOption[], value: string): string =>
    String(options.find((option) => option.value === value)?.label ?? value)
  if (sourceFilter.value !== 'all') {
    labels.push({ label: `来源：${optionLabel(sourceTypeOptions, sourceFilter.value)}`, clear: () => { sourceFilter.value = 'all' } })
  }
  if (typeFilter.value !== 'all') {
    labels.push({ label: `类型：${optionLabel(datasetTypeOptions, typeFilter.value)}`, clear: () => { typeFilter.value = 'all' } })
  }
  if (statusFilter.value !== 'all') {
    labels.push({ label: `状态：${optionLabel(syncStatusOptions, statusFilter.value)}`, clear: () => { statusFilter.value = 'all' } })
  }
  if (categoryFilter.value !== 'all') {
    labels.push({ label: `分类：${optionLabel(categoryOptions, categoryFilter.value)}`, clear: () => { categoryFilter.value = 'all' } })
  }
  if (tagFilter.value.length > 0) {
    labels.push({ label: `标签：${tagFilter.value.join('、')}`, clear: () => { tagFilter.value = [] } })
  }
  return labels
}

const activeFilters = computed(() => activeFilterLabels())

function rowActions(row: DatasetListRow): DropdownOption[] {
  if (row.status === 'deleted') {
    return [
      { label: '恢复', key: 'restore' },
      { label: '彻底删除', key: 'permanentDelete' },
      { label: '查看模型', key: 'showDeletedModel' },
    ]
  }
  return [
    { label: '基础信息', key: 'basic', disabled: row.readonly || row.sourceMode === 'theme' },
    { label: '移动', key: 'move', disabled: row.readonly || row.sourceMode === 'theme' },
    { label: '复制', key: 'copy', disabled: row.sourceMode === 'theme' },
    { label: '删除', key: 'delete', disabled: row.sourceMode === 'theme' || row.status === 'syncing' },
    { type: 'divider', key: 'divider-1' },
    { label: '创建使用说明', key: 'usage', disabled: row.permission === 'view' },
    { label: '可视化查询配置', key: 'visual', disabled: row.permission === 'view' },
    { label: '设置标签', key: 'tags', disabled: row.readonly || row.sourceMode === 'theme' },
    { label: '授权', key: 'permission', disabled: row.permission === 'view' },
    { type: 'divider', key: 'divider-2' },
    { label: '可视化查询', key: 'query' },
    { label: '查看详情', key: 'detail' },
  ]
}

function setFeedback(message: string, type: typeof feedbackType.value = 'success') {
  feedback.value = message
  feedbackType.value = type
}

async function loadData() {
  loading.value = true
  try {
    const [datasetList, folderList] = await Promise.all([datasetService.listDatasets(), datasetService.listFolders()])
    datasets.value = datasetList
    folders.value = folderList
    if (!selectedDatasetId.value && datasetList[0]) {
      selectedDatasetId.value = datasetList.find((item) => item.status !== 'deleted')?.id ?? datasetList[0].id
    }
  } catch {
    setFeedback('数据集列表加载失败，请稍后重试。', 'error')
  } finally {
    loading.value = false
  }
}

function selectDataset(row: DatasetListRow) {
  selectedDatasetId.value = row.id
  void router.push(`/metadata/datasets/${row.id}`)
}

function openModal(name: ModalName, row?: DatasetListRow) {
  modalDataset.value = row ?? currentDataset.value ?? null
  if (name === 'basic' && modalDataset.value) {
    basicForm.value = {
      name: modalDataset.value.name,
      description: modalDataset.value.description,
      folderId: modalDataset.value.folderId,
    }
  }
  if (name === 'move' && modalDataset.value) {
    moveTargetFolderId.value = modalDataset.value.folderId
  }
  if (name === 'copy' && modalDataset.value) {
    copyForm.value = {
      name: `${modalDataset.value.name} 副本`,
      folderId: modalDataset.value.folderId,
      copyFieldConfig: true,
      copySyncConfig: modalDataset.value.sourceMode === 'extract',
      copyVisualQueryConfig: true,
      copyUsageInstruction: Boolean(modalDataset.value.usageInstructionUrl),
    }
  }
  if (name === 'delete' && modalDataset.value) {
    deleteConfirmName.value = ''
  }
  if (name === 'usage' && modalDataset.value) {
    usageForm.value = { url: modalDataset.value.usageInstructionUrl ?? 'https://docs.example.com/dataset/usage' }
  }
  if (name === 'visual' && modalDataset.value) {
    visualForm.value = {
      allowSubscription: modalDataset.value.visualQueryConfig?.allowSubscription ?? true,
      allowMonitoring: modalDataset.value.visualQueryConfig?.allowMonitoring ?? true,
      allowAutoQuery: modalDataset.value.visualQueryConfig?.allowAutoQuery ?? true,
      allowFilterSearchOptimization: modalDataset.value.visualQueryConfig?.allowFilterSearchOptimization ?? true,
      maxQueryDaysEnabled: modalDataset.value.visualQueryConfig?.maxQueryDaysEnabled ?? true,
      maxQueryDays: modalDataset.value.visualQueryConfig?.maxQueryDays ?? 30,
      defaultVisualQueryUrl: modalDataset.value.defaultVisualQueryUrl ?? '',
      allowDropTimeoutNode: modalDataset.value.visualQueryConfig?.allowDropTimeoutNode ?? false,
      detailFieldIds: modalDataset.value.visualQueryConfig?.detailFieldIds ?? [],
      timeoutAccuracyLossThreshold: modalDataset.value.visualQueryConfig?.timeoutAccuracyLossThreshold ?? 5,
    }
    void loadVisualFieldOptions(modalDataset.value.id)
  }
  if (name === 'tags' && modalDataset.value) {
    tagSetting.value = [...modalDataset.value.tags]
  }
  if (name === 'permission') {
    permissionForm.value = { subjectType: 'user', subjectName: 'Mia Chen', permissions: ['view'] }
  }
  if (name === 'create') {
    createForm.value = {
      type: 'normal',
      name: '',
      folderId: 'folder_ad',
      sensitivityChoice: null,
      sourceDatasetIds: [],
    }
  }
  activeModal.value = name
}

async function loadVisualFieldOptions(datasetId: string) {
  visualFieldOptions.value = []
  try {
    const model = await datasetService.getDatasetModel(datasetId)
    visualFieldOptions.value = model.outputFields.map((field) => ({
      label: `${field.displayName} ${field.name}`,
      value: field.id,
    }))
    if (visualForm.value.detailFieldIds.length === 0) {
      visualForm.value.detailFieldIds = model.outputFields.slice(0, 6).map((field) => field.id)
    }
  } catch {
    setFeedback('字段明细加载失败，可稍后重新打开配置。', 'warning')
  }
}

function openCreateModal(type: string) {
  const normalizedType: CreateAssetType = type === 'associated' || type === 'folder' ? type : 'normal'
  createForm.value = {
    type: normalizedType,
    name: '',
    folderId: 'folder_ad',
    sensitivityChoice: null,
    sourceDatasetIds:
      normalizedType === 'associated'
        ? associationDatasetOptions.value.slice(0, 2).map((option) => String(option.value))
        : [],
  }
  activeModal.value = 'create'
}

async function refreshRow(dataset: Dataset) {
  const index = datasets.value.findIndex((item) => item.id === dataset.id)
  if (index >= 0) {
    datasets.value.splice(index, 1, dataset)
  } else {
    datasets.value.unshift(dataset)
  }
  selectedDatasetId.value = dataset.id
}

async function saveBasicInfo() {
  if (!modalDataset.value) return
  const name = basicForm.value.name.trim()
  if (!name) {
    setFeedback('请输入数据集名称。', 'warning')
    return
  }
  if (name.length > 64) {
    setFeedback('数据集名称不能超过 64 个字符。', 'warning')
    return
  }
  try {
    const dataset = await datasetService.updateDatasetBasicInfo(modalDataset.value.id, {
      name,
      description: basicForm.value.description,
      folderId: basicForm.value.folderId,
    })
    await refreshRow(dataset)
    activeModal.value = null
    setFeedback('数据集基础信息已更新。')
  } catch (error) {
    setFeedback(error instanceof Error ? error.message : '保存基础信息失败。', 'error')
  }
}

async function saveMove(singleDatasetId?: string) {
  const targetFolderId = moveTargetFolderId.value
  const ids = singleDatasetId ? [singleDatasetId] : selectedRows.value.map((item) => item.id)
  if (!targetFolderId || ids.length === 0) {
    setFeedback('请选择目标文件夹。', 'warning')
    return
  }
  let successCount = 0
  for (const id of ids) {
    try {
      const dataset = await datasetService.moveDataset(id, targetFolderId)
      await refreshRow(dataset)
      successCount += 1
    } catch {
      // Keep the batch moving and show a summary below.
    }
  }
  activeModal.value = null
  selectedRowKeys.value = []
  setFeedback(`移动完成，成功 ${successCount} 个，失败 ${ids.length - successCount} 个。`, successCount === ids.length ? 'success' : 'warning')
}

async function saveCopy() {
  if (!modalDataset.value) return
  if (!copyForm.value.name.trim()) {
    setFeedback('请输入复制后的数据集名称。', 'warning')
    return
  }
  const copied = await datasetService.copyDataset(modalDataset.value.id)
  const updated = await datasetService.updateDatasetBasicInfo(copied.id, {
    name: copyForm.value.name.trim(),
    description: copyForm.value.copyUsageInstruction ? copied.description : `${modalDataset.value.name} 的复制草稿，请检查模型配置后保存。`,
    folderId: copyForm.value.folderId,
  })
  await refreshRow(updated)
  activeModal.value = null
  setFeedback('数据集已复制为新草稿，请检查模型配置后保存。')
}

async function saveDelete(batch = false) {
  const rows = batch ? selectedRows.value : modalDataset.value ? [modalDataset.value] : []
  if (rows.length === 0) {
    return
  }
  const highRisk = rows.some((item) => item.tags.some((tag) => ['核心数据集', '生产', '不可删除'].includes(tag)) || item.visibility === 'public')
  if (!batch && highRisk && deleteConfirmName.value !== rows[0]?.name) {
    setFeedback('高风险数据集需要输入完整名称确认删除。', 'warning')
    return
  }
  let successCount = 0
  for (const row of rows) {
    try {
      const dataset = await datasetService.deleteDataset(row.id)
      await refreshRow(dataset)
      successCount += 1
    } catch {
      // Skip and summarize.
    }
  }
  activeModal.value = null
  selectedRowKeys.value = []
  if (rows.length === pagedRows.value.length && pageNo.value > 1) {
    pageNo.value -= 1
  }
  setFeedback(`删除完成，${successCount} 个数据集已进入回收站。`, successCount === rows.length ? 'success' : 'warning')
}

async function restoreDataset(row: DatasetListRow) {
  const dataset = await datasetService.restoreDataset(row.id)
  await refreshRow(dataset)
  statusFilter.value = 'all'
  setFeedback('数据集已恢复。')
}

async function savePermanentDelete() {
  if (!modalDataset.value) return
  if (deleteConfirmName.value !== modalDataset.value.name) {
    setFeedback('请输入完整数据集名称确认彻底删除。', 'warning')
    return
  }
  await datasetService.permanentDeleteDataset(modalDataset.value.id)
  datasets.value = datasets.value.filter((item) => item.id !== modalDataset.value?.id)
  activeModal.value = null
  setFeedback('数据集已彻底删除，仅可通过历史模型信息人工重建。', 'warning')
}

async function saveTags(batch = false) {
  const rows = batch ? selectedRows.value : modalDataset.value ? [modalDataset.value] : []
  let successCount = 0
  for (const row of rows) {
    try {
      const dataset = await datasetService.updateDatasetTags(row.id, tagSetting.value)
      await refreshRow(dataset)
      successCount += 1
    } catch {
      // Skip and summarize.
    }
  }
  activeModal.value = null
  selectedRowKeys.value = []
  setFeedback(`标签设置完成，成功 ${successCount} 个。`, successCount === rows.length ? 'success' : 'warning')
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

async function saveUsageInstruction() {
  if (!modalDataset.value) return
  if (!isValidUrl(usageForm.value.url)) {
    setFeedback('使用说明 URL 必须以 http:// 或 https:// 开头。', 'warning')
    return
  }
  const dataset = await datasetService.saveUsageInstruction(modalDataset.value.id, usageForm.value.url)
  await refreshRow(dataset)
  activeModal.value = null
  setFeedback('使用说明已保存。')
}

async function saveVisualQueryConfig() {
  if (!modalDataset.value) return
  if (visualForm.value.defaultVisualQueryUrl && !visualForm.value.defaultVisualQueryUrl.startsWith('/')) {
    setFeedback('默认可视化查询链接需要是系统内部链接。', 'warning')
    return
  }
  if (visualForm.value.maxQueryDaysEnabled && (!visualForm.value.maxQueryDays || visualForm.value.maxQueryDays < 1)) {
    setFeedback('最大查询天数需要大于 0。', 'warning')
    return
  }
  if (visualForm.value.timeoutAccuracyLossThreshold < 0 || visualForm.value.timeoutAccuracyLossThreshold > 50) {
    setFeedback('超时舍弃节点的精度损失阈值需要在 0% 到 50% 之间。', 'warning')
    return
  }
  const dataset = await datasetService.saveVisualQueryConfig(modalDataset.value.id, visualForm.value)
  await refreshRow(dataset)
  activeModal.value = null
  setFeedback('可视化查询配置已保存，后续查询立即生效。')
}

function showDeletedModel(snapshot: DeletedModelSnapshot) {
  selectedDeletedModel.value = snapshot
  activeModal.value = 'deletedModel'
}

async function rebuildFromDeletedModel(snapshot: DeletedModelSnapshot) {
  const result = await datasetService.createDraft({
    name: `${snapshot.name} 重建`,
    datasetType: snapshot.relationCount > 0 ? 'associated' : 'normal',
    sourceMode: snapshot.sourceType === 'visual_model' ? 'associated' : 'extract',
    folderId: 'folder_ad',
  })
  await refreshRow(result.dataset)
  statusFilter.value = 'all'
  activeModal.value = null
  setFeedback('已基于删除前模型创建重建草稿，请检查字段、权限和同步配置。')
}

async function restoreSelectedDeletedModel() {
  if (!selectedDeletedModel.value?.datasetId) {
    return
  }
  const row = rowItems.value.find((item) => item.id === selectedDeletedModel.value?.datasetId)
  if (!row) {
    setFeedback('该模型已超过直接恢复窗口，请使用模型重建。', 'warning')
    return
  }
  await restoreDataset(row)
  activeModal.value = null
}

async function savePermission() {
  if (!modalDataset.value || !permissionForm.value.subjectName.trim()) {
    setFeedback('请输入授权对象。', 'warning')
    return
  }
  const selectedPermissions = normalizePermissions(permissionForm.value.permissions)
  if (!selectedPermissions.length) {
    setFeedback('请至少选择一项权限。', 'warning')
    return
  }
  await datasetService.savePermissionRule({
    id: `perm_${Date.now()}`,
    datasetId: modalDataset.value.id,
    subjectType: permissionForm.value.subjectType,
    subjectName: permissionForm.value.subjectName.trim(),
    permission: highestPermission(selectedPermissions),
    permissions: selectedPermissions,
  })
  activeModal.value = null
  setFeedback(`授权已保存：${selectedPermissions.map(permissionLabel).join('、')}。`)
}

async function createDatasetOrFolder() {
  if (!createForm.value.name.trim()) {
    setFeedback('请输入名称。', 'warning')
    return
  }
  if (createForm.value.type === 'folder') {
    const folder = await datasetService.createFolder(createForm.value.name.trim(), 'custom', 'folder_custom_root')
    folders.value.push(folder)
    activeModal.value = null
    setFeedback('文件夹已创建。')
    return
  }
  if (createForm.value.type === 'normal' && !createForm.value.sensitivityChoice) {
    setFeedback('新建数据集前必须选择涉敏或不涉敏。', 'warning')
    return
  }
  if (createForm.value.type === 'associated' && createForm.value.sourceDatasetIds.length === 0) {
    setFeedback('请选择需要继承的来源数据集。', 'warning')
    return
  }
  const result = await datasetService.createDraft({
    name: createForm.value.name.trim(),
    datasetType: createForm.value.type === 'associated' ? 'associated' : 'normal',
    sourceMode: createForm.value.type === 'associated' ? 'associated' : 'extract',
    folderId: createForm.value.folderId,
    sensitivityChoice: createForm.value.type === 'normal' ? createForm.value.sensitivityChoice ?? undefined : undefined,
    sourceDatasetIds: createForm.value.type === 'associated' ? createForm.value.sourceDatasetIds : undefined,
  })
  await refreshRow(result.dataset)
  activeModal.value = null
  setFeedback('已创建数据集草稿，正在进入建模配置。')
  await router.push(`/metadata/datasets/create?datasetId=${result.dataset.id}`)
}

function saveProjectTag() {
  const name = newTagForm.value.name.trim()
  if (!name) {
    setFeedback('请输入标签名称。', 'warning')
    return
  }
  if (projectTags.value.some((tag) => tag.name === name)) {
    setFeedback('项目内已存在同名标签。', 'warning')
    return
  }
  projectTags.value.push({
    id: `tag_${Date.now()}`,
    name,
    color: newTagForm.value.color,
    inheritToChartTitle: newTagForm.value.inheritToChartTitle,
  })
  newTagForm.value = { name: '', color: 'success', inheritToChartTitle: false }
  setFeedback('项目标签已创建。')
}

function startEditProjectTag(tag: ProjectTag) {
  editingTagId.value = tag.id
  editTagForm.value = {
    name: tag.name,
    color: tag.color,
    inheritToChartTitle: tag.inheritToChartTitle,
  }
}

function saveProjectTagEdit(tagId: string) {
  const tag = projectTags.value.find((item) => item.id === tagId)
  const nextName = editTagForm.value.name.trim()
  if (!tag || !nextName) {
    setFeedback('请输入标签名称。', 'warning')
    return
  }
  if (projectTags.value.some((item) => item.id !== tagId && item.name === nextName)) {
    setFeedback('项目内已存在同名标签。', 'warning')
    return
  }
  const previousName = tag.name
  tag.name = nextName
  tag.color = editTagForm.value.color
  tag.inheritToChartTitle = editTagForm.value.inheritToChartTitle
  datasets.value = datasets.value.map((dataset) => ({
    ...dataset,
    tags: dataset.tags.map((name) => (name === previousName ? nextName : name)),
  }))
  editingTagId.value = null
  setFeedback('项目标签已更新。')
}

function deleteProjectTag(tagId: string) {
  const tag = projectTags.value.find((item) => item.id === tagId)
  projectTags.value = projectTags.value.filter((item) => item.id !== tagId)
  if (tag) {
    datasets.value = datasets.value.map((dataset) => ({
      ...dataset,
      tags: dataset.tags.filter((name) => name !== tag.name),
    }))
  }
  setFeedback('标签已删除，相关数据集不再展示该标签。')
}

function saveParameter() {
  const name = newParameterForm.value.name.trim()
  if (!name) {
    setFeedback('请输入参数名称。', 'warning')
    return
  }
  parameters.value.push({
    id: `param_${Date.now()}`,
    scope: newParameterForm.value.scope,
    name,
    valueType: newParameterForm.value.valueType,
    defaultValue: newParameterForm.value.defaultValue,
    inputStyle: newParameterForm.value.inputStyle,
    appliedDatasetIds: selectedDatasetId.value ? [selectedDatasetId.value] : [],
  })
  newParameterForm.value.name = ''
  setFeedback('参数已创建，可在计算字段中引用。')
}

function startEditParameter(parameter: DatasetParameter) {
  editingParameterId.value = parameter.id
  editParameterForm.value = {
    name: parameter.name,
    scope: parameter.scope,
    valueType: parameter.valueType,
    defaultValue: parameter.defaultValue,
    inputStyle: parameter.inputStyle,
  }
}

function saveParameterEdit(parameterId: string) {
  const parameter = parameters.value.find((item) => item.id === parameterId)
  const nextName = editParameterForm.value.name.trim()
  if (!parameter || !nextName) {
    setFeedback('请输入参数名称。', 'warning')
    return
  }
  parameter.name = nextName
  parameter.scope = editParameterForm.value.scope
  parameter.valueType = editParameterForm.value.valueType
  parameter.defaultValue = editParameterForm.value.defaultValue
  parameter.inputStyle = editParameterForm.value.inputStyle
  editingParameterId.value = null
  setFeedback('参数已更新。')
}

function saveCategory() {
  const name = newCategoryForm.value.name.trim()
  if (!name) {
    setFeedback('请输入类目名称。', 'warning')
    return
  }
  fieldCategories.value.push({
    id: `cat_${Date.now()}`,
    name,
    allowDatasetCustomCategory: newCategoryForm.value.allowDatasetCustomCategory,
  })
  newCategoryForm.value.name = ''
  setFeedback('字段类目已创建。')
}

function startEditCategory(category: { id: string; name: string; allowDatasetCustomCategory: boolean }) {
  editingCategoryId.value = category.id
  editCategoryForm.value = {
    name: category.name,
    allowDatasetCustomCategory: category.allowDatasetCustomCategory,
  }
}

function saveCategoryEdit(categoryId: string) {
  const category = fieldCategories.value.find((item) => item.id === categoryId)
  const nextName = editCategoryForm.value.name.trim()
  if (!category || !nextName) {
    setFeedback('请输入类目名称。', 'warning')
    return
  }
  category.name = nextName
  category.allowDatasetCustomCategory = editCategoryForm.value.allowDatasetCustomCategory
  editingCategoryId.value = null
  setFeedback('字段类目已更新。')
}

function handleRowAction(key: string, row: DatasetListRow) {
  if (key === 'restore') {
    void restoreDataset(row)
    return
  }
  if (key === 'permanentDelete') {
    deleteConfirmName.value = ''
    openModal('permanentDelete', row)
    return
  }
  if (key === 'query') {
    void router.push(row.defaultVisualQueryUrl || '/data-insight/event-analysis')
    return
  }
  if (key === 'detail') {
    void router.push(`/metadata/datasets/${row.id}`)
    return
  }
  if (key === 'showDeletedModel') {
    showDeletedModel({
      id: `snapshot_${row.id}`,
      datasetId: row.id,
      name: row.name,
      deletedAt: row.deletedAt ?? row.updatedAt,
      deletedBy: row.owner,
      sourceType: row.sourceTypeForList,
      fieldCount: row.fieldCount,
      nodeCount: row.datasetType === 'associated' ? 2 : 1,
      relationCount: row.datasetType === 'associated' ? 1 : 0,
      recoverable: true,
      reason: '15 天内可恢复，也可查看删除前模型并重建。',
    })
    return
  }
  openModal(key as ModalName, row)
}

function runBatch(action: 'tags' | 'move' | 'delete') {
  if (selectedRows.value.length === 0) {
    setFeedback('请先选择数据集。', 'warning')
    return
  }
  modalDataset.value = null
  if (action === 'tags') {
    tagSetting.value = []
    activeModal.value = 'tags'
    return
  }
  if (action === 'move') {
    moveTargetFolderId.value = folderOptions.value[0]?.value as string
    activeModal.value = 'move'
    return
  }
  activeModal.value = 'delete'
}

function rowKey(row: DatasetListRow): string {
  return row.id
}

function rowProps(row: DatasetListRow) {
  return {
    onClick: () => selectDataset(row),
  }
}

function closeModal(show: boolean) {
  if (!show) {
    activeModal.value = null
  }
}

function deleteParameter(parameterId: string) {
  parameters.value = parameters.value.filter((item) => item.id !== parameterId)
  setFeedback('参数已删除。')
}

function deleteCategory(categoryId: string) {
  fieldCategories.value = fieldCategories.value.filter((item) => item.id !== categoryId)
  setFeedback('类目已删除。')
}

const columns = computed<DataTableColumns<DatasetListRow>>(() => [
  { type: 'selection', fixed: 'left', width: 48 },
  {
    title: '数据集名称',
    key: 'name',
    minWidth: 310,
    sorter: (a, b) => a.name.localeCompare(b.name),
    render(row) {
      const visibleTags = row.tags.slice(0, 3)
      const extraCount = Math.max(row.tags.length - visibleTags.length, 0)
      return h('div', { class: 'dataset-name-cell' }, [
        h(
          'button',
          {
            class: 'link-like dataset-title-button',
            onClick: (event: MouseEvent) => {
              event.stopPropagation()
              selectDataset(row)
            },
          },
          highlightedText(row.name),
        ),
        h('div', { class: 'dataset-desc' }, row.description),
        h('div', { class: 'dataset-subline' }, `${row.sourceLabel} · ${row.databaseName ?? '-'} / ${row.tableName ?? '可视化模型'} · ${row.folderPath}`),
        h(
          NSpace,
          { size: 6, class: 'dataset-tag-line' },
          {
            default: () => [
              h(NTag, { size: 'small', type: row.category === 'public' ? 'info' : row.category === 'personal' ? 'success' : 'warning' }, { default: () => categoryLabel(row.category) }),
              row.sourceMode === 'theme'
                ? h(NTag, { size: 'small', type: 'info' }, { default: () => '主题' })
                : null,
              ...visibleTags.map((tag) => h(NTag, { size: 'small', type: tagType(tag) }, { default: () => tag })),
              extraCount > 0
                ? h(
                    NTooltip,
                    null,
                    {
                      trigger: () => h(NTag, { size: 'small' }, { default: () => `+${extraCount}` }),
                      default: () => row.tags.slice(3).join('、'),
                    },
                  )
                : null,
              row.usageInstructionUrl
                ? h(NTag, { size: 'small', type: 'success' }, { default: () => '有说明' })
                : null,
            ].filter(Boolean),
          },
        ),
      ])
    },
  },
  {
    title: '来源',
    key: 'source',
    width: 130,
    render(row) {
      return h('div', [h('strong', sourceTypeLabel(row.sourceTypeForList)), h('div', { class: 'muted' }, row.connectionModeForList)])
    },
  },
  {
    title: '类型',
    key: 'datasetType',
    width: 130,
    render(row) {
      return h(NTag, { size: 'small' }, { default: () => datasetTypeLabel(row.datasetType) })
    },
  },
  {
    title: '状态',
    key: 'syncStatusForList',
    width: 120,
    render(row) {
      const meta = statusMeta(row.syncStatusForList)
      return h(
        NButton,
        {
          text: true,
          onClick: (event: MouseEvent) => {
            event.stopPropagation()
            void router.push({ path: `/metadata/datasets/${row.id}`, query: { tab: 'sync' } })
          },
        },
        { default: () => h(NTag, { type: meta.type, size: 'small' }, { default: () => meta.label }) },
      )
    },
  },
  {
    title: '所有者',
    key: 'owner',
    width: 150,
    sorter: (a, b) => a.owner.localeCompare(b.owner),
    render(row) {
      return h('div', [row.owner, h('div', { class: 'muted' }, `告警：${row.alarmOwnerForList}`)])
    },
  },
  {
    title: '最近同步',
    key: 'lastSyncAt',
    width: 150,
    sorter: (a, b) => String(a.lastSyncAt ?? '').localeCompare(String(b.lastSyncAt ?? '')),
    render(row) {
      return row.lastSyncAt ?? '无同步'
    },
  },
  {
    title: '更新时间',
    key: 'updatedAt',
    width: 150,
    sorter: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
  },
  {
    title: '操作',
    key: 'actions',
    width: 128,
    fixed: 'right',
    render(row) {
      return h(
        NSpace,
        { size: 8 },
        {
          default: () => [
            h(
              NButton,
              {
                text: true,
                type: 'primary',
                size: 'small',
                onClick: (event: MouseEvent) => {
                  event.stopPropagation()
                  void router.push(row.defaultVisualQueryUrl || '/data-insight/event-analysis')
                },
              },
              { default: () => '查询' },
            ),
            h(
              NDropdown,
              {
                trigger: 'click',
                options: rowActions(row),
                onSelect: (key: string) => handleRowAction(key, row),
              },
              {
                default: () =>
                  h(
                    NButton,
                    {
                      size: 'small',
                      onClick: (event: MouseEvent) => event.stopPropagation(),
                    },
                    { default: () => '更多' },
                  ),
              },
            ),
          ],
        },
      )
    },
  },
])

watch(keywordInput, (value) => {
  if (keywordTimer) {
    window.clearTimeout(keywordTimer)
  }
  keywordTimer = window.setTimeout(() => {
    keyword.value = value
    resetPage()
  }, 300)
})

watch(
  [
    sourceFilter,
    typeFilter,
    statusFilter,
    categoryFilter,
    sensitivityFilter,
    storageFilter,
    alarmOwnerFilter,
    priorityFilter,
    queueFilter,
    runFrequencyFilter,
    tagFilter,
  ],
  resetPage,
)

onMounted(() => {
  void loadData()
})
</script>

<template>
  <div class="dataset-list-page">
    <div class="page-header">
      <div>
        <h1>数据集</h1>
        <p>统一管理项目内个人、共享、公共和回收站数据集，支持搜索、筛选、授权、标签和轻量运维操作。</p>
      </div>
      <n-space>
        <n-dropdown
          trigger="click"
          :options="[
            { label: '新建数据集', key: 'normal' },
            { label: '新建关联数据集', key: 'associated' },
            { label: '新建文件夹', key: 'folder' },
          ]"
          @select="openCreateModal"
        >
          <n-button type="primary">新建</n-button>
        </n-dropdown>
        <n-button @click="openModal('tagManage')">标签管理</n-button>
        <n-button @click="openModal('parameterManage')">参数管理</n-button>
        <n-button @click="openModal('categoryManage')">类目管理</n-button>
        <n-button :loading="loading" @click="loadData">刷新</n-button>
      </n-space>
    </div>

    <n-alert :type="feedbackType" closable class="feedback-alert">
      {{ feedback }}
    </n-alert>

    <div class="dataset-layout">
      <main class="dataset-main">
        <n-card class="filter-card" :bordered="false">
          <div class="filter-row">
            <n-input
              v-model:value="keywordInput"
              clearable
              placeholder="搜索数据集名称、数据源、底表、所有者、权限、描述或标签"
            />
            <n-select v-model:value="sourceFilter" :options="sourceTypeOptions" />
            <n-select v-model:value="typeFilter" :options="datasetTypeOptions" />
            <n-select v-model:value="statusFilter" :options="syncStatusOptions" />
            <n-button @click="showAdvancedFilters = !showAdvancedFilters">
              {{ showAdvancedFilters ? '收起筛选' : '展开筛选' }}
            </n-button>
          </div>
          <div v-if="showAdvancedFilters" class="advanced-filter-grid">
            <n-select v-model:value="categoryFilter" :options="categoryOptions" />
            <n-select v-model:value="sensitivityFilter" :options="sensitivityOptions" />
            <n-select v-model:value="storageFilter" :options="storageOptions" />
            <n-select v-model:value="alarmOwnerFilter" :options="alarmOwnerOptions" />
            <n-select v-model:value="priorityFilter" :options="priorityOptions" />
            <n-select v-model:value="queueFilter" :options="queueOptions" />
            <n-select v-model:value="runFrequencyFilter" :options="runFrequencyOptions" />
            <n-select v-model:value="tagFilter" multiple clearable :options="tagOptions" placeholder="标签筛选" />
          </div>
          <div v-if="activeFilters.length" class="filter-tags">
            <n-tag
              v-for="item in activeFilters"
              :key="item.label"
              closable
              @close="item.clear"
            >
              {{ item.label }}
            </n-tag>
            <n-button text type="primary" @click="clearFilters">清空全部</n-button>
          </div>
        </n-card>

        <div v-if="statusFilter === 'deleted'" class="recycle-mode-bar">
          <n-button
            :type="recycleMode === 'restore' ? 'primary' : 'default'"
            @click="recycleMode = 'restore'"
          >
            回收站恢复
          </n-button>
          <n-button
            :type="recycleMode === 'rebuild' ? 'primary' : 'default'"
            @click="recycleMode = 'rebuild'"
          >
            查询数据模型重建
          </n-button>
        </div>

        <template v-if="statusFilter === 'deleted' && recycleMode === 'rebuild'">
          <n-card class="deleted-model-card" :bordered="false">
            <div class="table-toolbar">
              <div>
                <strong>{{ deletedModelSnapshots.length }}</strong>
                个删除前模型快照
              </div>
              <n-input v-model:value="deletedModelKeyword" clearable placeholder="搜索删除前模型名称" />
            </div>
            <div class="deleted-model-grid">
              <div v-for="snapshot in deletedModelSnapshots" :key="snapshot.id" class="deleted-model-item">
                <div>
                  <strong>{{ snapshot.name }}</strong>
                  <p>{{ snapshot.reason }}</p>
                  <span>{{ snapshot.deletedAt }} · {{ snapshot.deletedBy }} · {{ sourceTypeLabel(snapshot.sourceType) }}</span>
                </div>
                <div class="snapshot-stats">
                  <span>{{ snapshot.fieldCount }} 字段</span>
                  <span>{{ snapshot.nodeCount }} 节点</span>
                  <span>{{ snapshot.relationCount }} 关系</span>
                </div>
                <n-space>
                  <n-button size="small" @click="showDeletedModel(snapshot)">查看模型</n-button>
                  <n-button size="small" type="primary" @click="rebuildFromDeletedModel(snapshot)">
                    基于模型重建
                  </n-button>
                </n-space>
              </div>
            </div>
            <n-empty v-if="deletedModelSnapshots.length === 0" description="未找到可重建的删除前模型。" />
          </n-card>
        </template>

        <template v-else>
          <div class="table-toolbar">
            <div>
              <strong>{{ filteredRows.length }}</strong>
              个数据集
              <span v-if="selectedRows.length">，已选 {{ selectedRows.length }} 个</span>
            </div>
            <n-space>
              <n-button :disabled="!selectedRows.length" @click="runBatch('tags')">批量打标签</n-button>
              <n-button :disabled="!selectedRows.length" @click="runBatch('move')">批量移动</n-button>
              <n-button :disabled="!selectedRows.length" @click="runBatch('delete')">批量删除</n-button>
            </n-space>
          </div>

          <n-data-table
            v-model:checked-row-keys="selectedRowKeys"
            :columns="columns"
            :data="pagedRows"
            :loading="loading"
            :row-key="rowKey"
            :row-props="rowProps"
            :scroll-x="1320"
            :max-height="560"
          />

          <div v-if="!loading && filteredRows.length === 0" class="empty-wrap">
            <n-empty description="当前条件下未找到数据集，请调整搜索或筛选条件。" />
          </div>

          <div class="pagination-row">
            <n-pagination
              v-model:page="pageNo"
              v-model:page-size="pageSize"
              :item-count="filteredRows.length"
              :page-sizes="[20, 50, 100]"
              show-size-picker
            />
          </div>
        </template>
      </main>

    </div>

    <n-modal
      v-if="activeModal === 'create'"
      :show="activeModal === 'create'"
      preset="card"
      title="新建"
      class="dataset-modal"
      :mask-closable="false"
      @update:show="closeModal"
    >
      <div class="modal-form">
        <label>类型</label>
        <n-select
          v-model:value="createForm.type"
          :options="[
            { label: '新建数据集', value: 'normal' },
            { label: '新建关联数据集', value: 'associated' },
            { label: '新建文件夹', value: 'folder' },
          ]"
        />
        <label>名称</label>
        <n-input v-model:value="createForm.name" placeholder="请输入名称" />
        <template v-if="createForm.type === 'normal'">
          <label>涉敏定级</label>
          <n-select
            v-model:value="createForm.sensitivityChoice"
            :options="createSensitivityOptions"
            placeholder="保存前必须选择涉敏或不涉敏"
          />
        </template>
        <template v-if="createForm.type === 'associated'">
          <n-alert type="info">
            关联数据集会继承来源数据集的涉敏状态与已配置脱敏字段，保存后自动重算脱敏状态。
          </n-alert>
          <label>继承来源数据集</label>
          <n-select
            v-model:value="createForm.sourceDatasetIds"
            multiple
            filterable
            :options="associationDatasetOptions"
            placeholder="选择需要继承的来源数据集"
          />
        </template>
        <label v-if="createForm.type !== 'folder'">保存路径</label>
        <n-select v-if="createForm.type !== 'folder'" v-model:value="createForm.folderId" :options="folderOptions" />
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="activeModal = null">取消</n-button>
          <n-button type="primary" @click="createDatasetOrFolder">确定</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal
      v-if="activeModal === 'basic'"
      :show="activeModal === 'basic'"
      preset="card"
      title="设置数据集信息"
      class="dataset-modal"
      @update:show="closeModal"
    >
      <div class="modal-form">
        <label>数据集名称</label>
        <n-input v-model:value="basicForm.name" maxlength="64" show-count />
        <label>添加描述</label>
        <n-input v-model:value="basicForm.description" type="textarea" maxlength="500" show-count />
        <label>保存路径</label>
        <n-select v-model:value="basicForm.folderId" :options="folderOptions" />
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="activeModal = null">取消</n-button>
          <n-button type="primary" @click="saveBasicInfo">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal
      v-if="activeModal === 'move'"
      :show="activeModal === 'move'"
      preset="card"
      title="移动数据集"
      class="dataset-modal"
      @update:show="closeModal"
    >
      <div class="modal-form">
        <label>当前路径</label>
        <div class="readonly-box">{{ modalDataset?.folderPath ?? `批量移动 ${selectedRows.length} 个数据集` }}</div>
        <label>目标路径</label>
        <n-select v-model:value="moveTargetFolderId" :options="folderOptions" />
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="activeModal = null">取消</n-button>
          <n-button type="primary" @click="saveMove(modalDataset?.id)">确定移动</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal
      v-if="activeModal === 'copy'"
      :show="activeModal === 'copy'"
      preset="card"
      title="复制数据集"
      class="dataset-modal"
      @update:show="closeModal"
    >
      <div class="modal-form">
        <label>新数据集名称</label>
        <n-input v-model:value="copyForm.name" />
        <label>保存路径</label>
        <n-select v-model:value="copyForm.folderId" :options="folderOptions" />
        <div class="checkbox-grid">
          <n-checkbox v-model:checked="copyForm.copyFieldConfig">复制字段配置</n-checkbox>
          <n-checkbox v-model:checked="copyForm.copySyncConfig">复制同步配置</n-checkbox>
          <n-checkbox v-model:checked="copyForm.copyVisualQueryConfig">复制可视化查询配置</n-checkbox>
          <n-checkbox v-model:checked="copyForm.copyUsageInstruction">复制使用说明</n-checkbox>
        </div>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="activeModal = null">取消</n-button>
          <n-button type="primary" @click="saveCopy">复制</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal
      v-if="activeModal === 'delete'"
      :show="activeModal === 'delete'"
      preset="card"
      title="删除数据集"
      class="dataset-modal"
      @update:show="closeModal"
    >
      <n-alert type="warning">
        删除后数据集会进入回收站，15 天内可恢复。受影响图表 3 个、仪表盘 1 个、近 30 天访问量 2,480 次。
      </n-alert>
      <div v-if="modalDataset?.visibility === 'public' || modalDataset?.tags.includes('核心数据集')" class="modal-form">
        <label>高风险确认：请输入数据集名称</label>
        <n-input v-model:value="deleteConfirmName" :placeholder="modalDataset?.name" />
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="activeModal = null">取消</n-button>
          <n-button type="error" @click="saveDelete(Boolean(selectedRows.length && !modalDataset))">确认删除</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal
      v-if="activeModal === 'permanentDelete'"
      :show="activeModal === 'permanentDelete'"
      preset="card"
      title="彻底删除"
      class="dataset-modal"
      @update:show="closeModal"
    >
      <n-alert type="error">彻底删除后无法恢复，只能查询历史模型信息人工重建。</n-alert>
      <div class="modal-form">
        <label>请输入数据集名称确认</label>
        <n-input v-model:value="deleteConfirmName" :placeholder="modalDataset?.name" />
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="activeModal = null">取消</n-button>
          <n-button type="error" @click="savePermanentDelete">彻底删除</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal
      v-if="activeModal === 'usage'"
      :show="activeModal === 'usage'"
      preset="card"
      title="创建使用说明"
      class="dataset-modal"
      @update:show="closeModal"
    >
      <div class="modal-form">
        <label>使用说明地址</label>
        <n-input v-model:value="usageForm.url" placeholder="https://docs.example.com/dataset/usage" />
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="activeModal = null">取消</n-button>
          <n-button type="primary" @click="saveUsageInstruction">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal
      v-if="activeModal === 'visual'"
      :show="activeModal === 'visual'"
      preset="card"
      title="可视化查询配置"
      class="dataset-modal wide"
      @update:show="closeModal"
    >
      <div class="checkbox-grid">
        <n-checkbox v-model:checked="visualForm.allowSubscription">允许订阅推送</n-checkbox>
        <n-checkbox v-model:checked="visualForm.allowMonitoring">允许新建监控</n-checkbox>
        <n-checkbox v-model:checked="visualForm.allowAutoQuery">允许自动查询</n-checkbox>
        <n-checkbox v-model:checked="visualForm.allowFilterSearchOptimization">允许筛选搜索优化</n-checkbox>
        <n-checkbox v-model:checked="visualForm.maxQueryDaysEnabled">限制最大查询天数</n-checkbox>
        <n-checkbox v-model:checked="visualForm.allowDropTimeoutNode">允许舍弃超时节点</n-checkbox>
      </div>
      <div class="modal-form two">
        <label>最大查询天数</label>
        <n-input-number v-model:value="visualForm.maxQueryDays" :min="1" :max="365" />
        <label>默认可视化查询链接</label>
        <n-input v-model:value="visualForm.defaultVisualQueryUrl" placeholder="/data-insight/event-analysis?datasetId=..." />
        <label>明细字段</label>
        <n-select
          v-model:value="visualForm.detailFieldIds"
          multiple
          filterable
          :options="visualFieldOptions"
          placeholder="选择详情页、下载和查询结果中默认展示的字段"
        />
        <label>超时精度损失阈值</label>
        <n-input-number
          v-model:value="visualForm.timeoutAccuracyLossThreshold"
          :min="0"
          :max="50"
          :precision="0"
        >
          <template #suffix>%</template>
        </n-input-number>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="activeModal = null">取消</n-button>
          <n-button type="primary" @click="saveVisualQueryConfig">保存配置</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal
      v-if="activeModal === 'tags'"
      :show="activeModal === 'tags'"
      preset="card"
      title="设置标签"
      class="dataset-modal"
      @update:show="closeModal"
    >
      <n-select v-model:value="tagSetting" multiple filterable :options="tagOptions" placeholder="搜索并选择标签" />
      <template #footer>
        <n-space justify="end">
          <n-button @click="activeModal = null">取消</n-button>
          <n-button type="primary" @click="saveTags(Boolean(selectedRows.length && !modalDataset))">保存标签</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal
      v-if="activeModal === 'permission'"
      :show="activeModal === 'permission'"
      preset="card"
      title="授权"
      class="dataset-modal"
      @update:show="closeModal"
    >
      <div class="modal-form">
        <label>授权对象类型</label>
        <n-select
          v-model:value="permissionForm.subjectType"
          :options="[
            { label: '用户', value: 'user' },
            { label: '用户组', value: 'team' },
            { label: '角色', value: 'role' },
          ]"
        />
        <label>授权对象</label>
        <n-input v-model:value="permissionForm.subjectName" placeholder="输入用户、用户组或角色名称" />
        <label>权限</label>
        <n-select
          v-model:value="permissionForm.permissions"
          multiple
          filterable
          :max-tag-count="3"
          :options="permissionLevelOptions"
          placeholder="可同时选择预览、查看、编辑、管理"
        />
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="activeModal = null">取消</n-button>
          <n-button type="primary" @click="savePermission">保存授权</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal
      v-if="activeModal === 'tagManage'"
      :show="activeModal === 'tagManage'"
      preset="card"
      title="标签管理"
      class="dataset-modal wide"
      @update:show="closeModal"
    >
      <div class="management-list">
        <div v-for="tag in projectTags" :key="tag.id" class="management-row">
          <template v-if="editingTagId === tag.id">
            <n-input v-model:value="editTagForm.name" />
            <n-select
              v-model:value="editTagForm.color"
              :options="[
                { label: '绿色', value: 'success' },
                { label: '蓝色', value: 'info' },
                { label: '橙色', value: 'warning' },
                { label: '红色', value: 'error' },
                { label: '灰色', value: 'default' },
              ]"
            />
            <n-checkbox v-model:checked="editTagForm.inheritToChartTitle">继承标题</n-checkbox>
            <n-space>
              <n-button size="small" type="primary" @click="saveProjectTagEdit(tag.id)">保存</n-button>
              <n-button size="small" @click="editingTagId = null">取消</n-button>
            </n-space>
          </template>
          <template v-else>
            <n-tag :type="tag.color">{{ tag.name }}</n-tag>
            <span>{{ tag.inheritToChartTitle ? '继承到图表标题' : '不继承图表标题' }}</span>
            <n-space>
              <n-button text type="primary" @click="startEditProjectTag(tag)">编辑</n-button>
              <n-button text type="error" @click="deleteProjectTag(tag.id)">删除</n-button>
            </n-space>
          </template>
        </div>
      </div>
      <div class="modal-form two">
        <label>新标签名称</label>
        <n-input v-model:value="newTagForm.name" />
        <label>颜色</label>
        <n-select
          v-model:value="newTagForm.color"
          :options="[
            { label: '绿色', value: 'success' },
            { label: '蓝色', value: 'info' },
            { label: '橙色', value: 'warning' },
            { label: '红色', value: 'error' },
            { label: '灰色', value: 'default' },
          ]"
        />
        <n-checkbox v-model:checked="newTagForm.inheritToChartTitle">图表标题继承此标签</n-checkbox>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="activeModal = null">关闭</n-button>
          <n-button type="primary" @click="saveProjectTag">新建标签</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal
      v-if="activeModal === 'parameterManage'"
      :show="activeModal === 'parameterManage'"
      preset="card"
      title="参数管理"
      class="dataset-modal wide"
      @update:show="closeModal"
    >
      <div class="management-list">
        <div v-for="parameter in parameters" :key="parameter.id" class="management-row">
          <template v-if="editingParameterId === parameter.id">
            <n-input v-model:value="editParameterForm.name" />
            <n-input v-model:value="editParameterForm.defaultValue" placeholder="默认值" />
            <n-space>
              <n-button size="small" type="primary" @click="saveParameterEdit(parameter.id)">保存</n-button>
              <n-button size="small" @click="editingParameterId = null">取消</n-button>
            </n-space>
          </template>
          <template v-else>
            <strong>{{ parameter.name }}</strong>
            <span>{{ parameter.scope === 'public' ? '公共参数' : '个人参数' }} · {{ parameter.valueType }} · 默认值 {{ parameter.defaultValue }}</span>
            <n-space>
              <n-button text type="primary" @click="startEditParameter(parameter)">编辑</n-button>
              <n-button text type="error" @click="deleteParameter(parameter.id)">删除</n-button>
            </n-space>
          </template>
        </div>
      </div>
      <div class="modal-form two">
        <label>参数名称</label>
        <n-input v-model:value="newParameterForm.name" />
        <label>作用域</label>
        <n-select
          v-model:value="newParameterForm.scope"
          :options="[
            { label: '个人参数', value: 'personal' },
            { label: '公共参数', value: 'public' },
          ]"
        />
        <label>类型</label>
        <n-select
          v-model:value="newParameterForm.valueType"
          :options="[
            { label: '文本', value: 'text' },
            { label: '整数', value: 'integer' },
            { label: '小数', value: 'decimal' },
            { label: '日期', value: 'date' },
            { label: '布尔', value: 'boolean' },
          ]"
        />
        <label>默认值</label>
        <n-input v-model:value="newParameterForm.defaultValue" />
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="activeModal = null">关闭</n-button>
          <n-button type="primary" @click="saveParameter">创建参数</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal
      v-if="activeModal === 'categoryManage'"
      :show="activeModal === 'categoryManage'"
      preset="card"
      title="类目管理"
      class="dataset-modal"
      @update:show="closeModal"
    >
      <div class="management-list">
        <div v-for="category in fieldCategories" :key="category.id" class="management-row">
          <template v-if="editingCategoryId === category.id">
            <n-input v-model:value="editCategoryForm.name" />
            <n-checkbox v-model:checked="editCategoryForm.allowDatasetCustomCategory">允许自定义</n-checkbox>
            <n-space>
              <n-button size="small" type="primary" @click="saveCategoryEdit(category.id)">保存</n-button>
              <n-button size="small" @click="editingCategoryId = null">取消</n-button>
            </n-space>
          </template>
          <template v-else>
            <strong>{{ category.name }}</strong>
            <span>{{ category.allowDatasetCustomCategory ? '允许数据集自定义类目' : '仅项目级类目' }}</span>
            <n-space>
              <n-button text type="primary" @click="startEditCategory(category)">编辑</n-button>
              <n-button text type="error" @click="deleteCategory(category.id)">删除</n-button>
            </n-space>
          </template>
        </div>
      </div>
      <div class="modal-form">
        <label>类目名称</label>
        <n-input v-model:value="newCategoryForm.name" />
        <n-checkbox v-model:checked="newCategoryForm.allowDatasetCustomCategory">允许用户在数据集中自定义类目</n-checkbox>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="activeModal = null">关闭</n-button>
          <n-button type="primary" @click="saveCategory">创建类目</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal
      v-if="activeModal === 'deletedModel'"
      :show="activeModal === 'deletedModel'"
      preset="card"
      title="删除前模型信息"
      class="dataset-modal"
      @update:show="closeModal"
    >
      <div v-if="selectedDeletedModel" class="deleted-model-detail">
        <strong>{{ selectedDeletedModel.name }}</strong>
        <p>{{ selectedDeletedModel.reason }}</p>
        <div class="detail-grid">
          <div>
            <span>删除时间</span>
            <strong>{{ selectedDeletedModel.deletedAt }}</strong>
          </div>
          <div>
            <span>删除人</span>
            <strong>{{ selectedDeletedModel.deletedBy }}</strong>
          </div>
          <div>
            <span>来源</span>
            <strong>{{ sourceTypeLabel(selectedDeletedModel.sourceType) }}</strong>
          </div>
          <div>
            <span>模型结构</span>
            <strong>{{ selectedDeletedModel.nodeCount }} 节点 / {{ selectedDeletedModel.relationCount }} 关系</strong>
          </div>
        </div>
        <n-alert type="warning" class="modal-alert">
          重建会创建一个新的数据集草稿，字段映射、权限和同步配置需要重新确认后再发布。
        </n-alert>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="activeModal = null">关闭</n-button>
          <n-button
            v-if="selectedDeletedModel?.datasetId && selectedDeletedModel.recoverable"
            @click="restoreSelectedDeletedModel"
          >
            直接恢复
          </n-button>
          <n-button
            v-if="selectedDeletedModel"
            type="primary"
            @click="rebuildFromDeletedModel(selectedDeletedModel)"
          >
            基于模型重建
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<style scoped>
.dataset-list-page {
  min-height: 100%;
  padding: 28px;
  background: #f3f6fb;
  color: #1f2937;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 18px;
}

.page-header h1 {
  margin: 0;
  font-size: 30px;
  line-height: 1.25;
}

.page-header p {
  margin: 12px 0 0;
  color: #667085;
  font-size: 15px;
}

.feedback-alert {
  margin-bottom: 18px;
}

.dataset-layout {
  display: block;
}

.dataset-main {
  min-width: 0;
}

.filter-card {
  margin-bottom: 14px;
}

.filter-row,
.advanced-filter-grid {
  display: grid;
  grid-template-columns: minmax(260px, 1.6fr) repeat(3, minmax(150px, 0.8fr)) auto;
  gap: 10px;
  align-items: center;
}

.advanced-filter-grid {
  grid-template-columns: repeat(4, minmax(160px, 1fr));
  margin-top: 12px;
}

.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-top: 12px;
}

.table-toolbar,
.pagination-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 12px 0;
}

.recycle-mode-bar {
  display: flex;
  gap: 10px;
  margin: 12px 0;
}

.deleted-model-card {
  margin-top: 12px;
}

.deleted-model-card .table-toolbar {
  gap: 16px;
}

.deleted-model-card .n-input {
  max-width: 360px;
}

.deleted-model-grid {
  display: grid;
  gap: 12px;
}

.deleted-model-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 14px;
  align-items: center;
  padding: 14px;
  border: 1px solid #eaecf0;
  border-radius: 8px;
  background: #fff;
}

.deleted-model-item p {
  margin: 6px 0;
  color: #667085;
}

.deleted-model-item span {
  color: #667085;
  font-size: 12px;
}

.snapshot-stats {
  display: flex;
  gap: 8px;
}

.snapshot-stats span {
  padding: 4px 8px;
  border-radius: 999px;
  background: #f2f4f7;
  color: #344054;
}

.empty-wrap {
  padding: 48px;
  background: #fff;
}

.dataset-name-cell {
  min-width: 0;
}

.dataset-title-button {
  padding: 0;
  border: 0;
  background: transparent;
  color: #099250;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
}

.dataset-desc,
.dataset-subline,
.muted {
  color: #667085;
  font-size: 12px;
  line-height: 1.6;
}

.dataset-desc {
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dataset-tag-line {
  margin-top: 6px;
}

:deep(.dataset-highlight) {
  padding: 0 2px;
  border-radius: 3px;
  background: #fff2cc;
  color: inherit;
}

.link-like {
  font-family: inherit;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.detail-grid.single {
  grid-template-columns: 1fr;
}

.detail-grid div,
.readonly-box {
  padding: 12px;
  border-radius: 6px;
  background: #f8fafc;
}

.detail-grid span,
.deleted-model-detail span {
  display: block;
  color: #667085;
  font-size: 12px;
  margin-bottom: 5px;
}

.detail-grid strong {
  font-size: 14px;
}

.dataset-modal {
  width: 560px;
}

.dataset-modal.wide {
  width: 760px;
}

.modal-form {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
}

.modal-form.two {
  grid-template-columns: 150px minmax(0, 1fr);
  margin-top: 16px;
}

.modal-form label {
  color: #344054;
  font-weight: 700;
}

.checkbox-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.management-list {
  display: grid;
  gap: 8px;
  margin-bottom: 16px;
  max-height: 260px;
  overflow: auto;
}

.management-row {
  display: grid;
  grid-template-columns: 160px 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 10px;
  border: 1px solid #eaecf0;
  border-radius: 6px;
}

.deleted-model-detail > strong {
  display: block;
  margin-bottom: 8px;
  font-size: 18px;
}

.deleted-model-detail > p {
  color: #667085;
}

.modal-alert {
  margin-top: 14px;
}

</style>
