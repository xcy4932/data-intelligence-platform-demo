<script setup lang="ts">
import { computed, h, onMounted, reactive, ref, watch } from 'vue'
import type { Component } from 'vue'
import {
  NAlert,
  NButton,
  NCheckbox,
  NColorPicker,
  NEmpty,
  NForm,
  NFormItem,
  NGi,
  NGrid,
  NIcon,
  NInput,
  NInputNumber,
  NModal,
  NRadio,
  NRadioGroup,
  NSelect,
  NSpace,
  NSwitch,
  NTabPane,
  NTabs,
  NTag,
} from 'naive-ui'
import type { SelectOption } from 'naive-ui'
import {
  AddOutline,
  AlbumsOutline,
  ArrowRedoOutline,
  ArrowUndoOutline,
  CloudUploadOutline,
  ColorPaletteOutline,
  CopyOutline,
  CreateOutline,
  DuplicateOutline,
  DownloadOutline,
  FilterOutline,
  PlayOutline,
  RefreshOutline,
  SaveOutline,
  SettingsOutline,
  ShareSocialOutline,
  TimeOutline,
  TrashBinOutline,
} from '@vicons/ionicons5'
import VisualChartRenderer from '@/components/visual-query/VisualChartRenderer.vue'
import {
  canDropField,
  chartDefinitions,
  chartRegistry,
  createDefaultChartConfig,
  createEmptySlots,
  pruneSlotsForChart,
  slotLabels,
  validateChartSlots,
} from '@/components/visual-query/chartRegistry'
import {
  addSavedAnalysisToDashboard,
  createDefaultVisualState,
  createLocalFileDataset,
  deleteSavedVisualAnalysis,
  executeVisualQuery,
  flattenFields,
  getAnnouncement,
  getFieldsForSource,
  getRowsForSource,
  listDatasetOptions,
  listPalettes,
  listQueryHistory,
  listSavedVisualAnalyses,
  saveAnnouncement,
  saveCurrentVisualAnalysis,
  savePalette,
  shareSavedVisualAnalysis,
  updateFieldInRegistry,
  validateExpression,
} from '@/services/visualAnalysisService'
import type {
  AnnouncementConfig,
  DatasetOption,
  ExpressionValidationResult,
  FieldRegistry,
  FilterConfig,
  PaletteConfig,
  QueryHistoryItem,
  QueryResult,
  SavedVisualAnalysis,
  SlotField,
  VisualChartType,
  VisualField,
  VisualFieldSlotKey,
  VisualQueryState,
} from '@/types/visualAnalysis'

type NoticeType = 'success' | 'warning' | 'error' | 'info'

const state = ref<VisualQueryState>(createDefaultVisualState())
const result = ref<QueryResult | null>(null)
const datasets = ref<DatasetOption[]>([])
const queryHistory = ref<QueryHistoryItem[]>([])
const savedAnalyses = ref<SavedVisualAnalysis[]>([])
const palettes = ref<PaletteConfig[]>([])
const announcement = ref<AnnouncementConfig | null>(null)
const datasetKeyword = ref('')
const fieldKeyword = ref('')
const draggedFieldId = ref('')
const loading = ref(false)
const notice = reactive<{ type: NoticeType, message: string }>({
  type: 'info',
  message: '选择字段并点击查询，生成可交互图表。',
})

const datasetModalVisible = ref(false)
const downloadModalVisible = ref(false)
const queryConfigModalVisible = ref(false)
const saveAsModalVisible = ref(false)
const shareModalVisible = ref(false)
const calculatedFieldModalVisible = ref(false)
const aliasModalVisible = ref(false)
const groupModalVisible = ref(false)
const hierarchyModalVisible = ref(false)
const geoModalVisible = ref(false)
const announcementModalVisible = ref(false)
const annotationModalVisible = ref(false)
const selectedDatasetId = ref('')
const selectedSavedAnalysisId = ref('')
const selectedField = ref<VisualField | null>(null)
const undoStack = ref<VisualQueryState[]>([])
const redoStack = ref<VisualQueryState[]>([])
const autoQueryTimer = ref<number | undefined>()
const fileInput = ref<HTMLInputElement | null>(null)
const shareLink = ref('')

const downloadDraft = reactive({
  fileName: '可视化查询结果',
  format: 'csv' as 'csv' | 'xlsx' | 'image',
  rowLimit: 1000,
  scientificNotationAsText: true,
  sampleDownload: false,
  sampleRows: 100,
  includeFormattedValue: true,
})

const saveAsDraft = reactive({
  name: '',
})

const calculatedDraft = reactive({
  displayName: '',
  fieldType: 'measure' as VisualField['fieldType'],
  dataType: 'number' as VisualField['dataType'],
  expression: '',
  description: '',
  saveScope: 'personal' as 'personal' | 'dataset',
})
const expressionResult = ref<ExpressionValidationResult | null>(null)

const aliasDraft = ref<Array<{ rawValue: string, aliasValue: string }>>([])
const groupDraft = reactive({
  mode: 'text_group' as 'text_group' | 'numeric_bin',
  newFieldName: '',
  groupName: '核心分组',
  values: '',
  binName: '高价值',
  min: 0,
  max: 10000,
  unmatchedStrategy: 'keep_original' as 'keep_original' | 'set_null' | 'set_other',
})
const hierarchyDraft = reactive({
  name: '',
  fieldIds: [] as string[],
})
const geoDraft = reactive({
  role: 'city' as NonNullable<VisualField['geoRole']>['role'],
  mappingMode: 'auto' as 'auto' | 'manual',
})
const paletteDraft = reactive({
  name: '',
  scope: 'personal' as PaletteConfig['scope'],
  colors: ['#2563eb', '#16a34a', '#f59e0b'],
})
const announcementDraft = reactive({
  title: '',
  content: '',
  enabled: true,
})
const annotationDraft = reactive({
  id: '',
  type: 'point' as 'point' | 'range',
  fieldId: '',
  value: '',
  startDate: '2026-05-01',
  endDate: '2026-05-07',
  content: '',
  x: 62,
  y: 22,
})

const functionGroups = [
  { label: '聚合函数', items: ['count', 'count_distinct', 'sum', 'avg', 'max', 'min'] },
  { label: '数值函数', items: ['abs', 'round', 'ceil', 'floor'] },
  { label: '文本函数', items: ['concat', 'substring', 'replace', 'length', 'extractAll'] },
  { label: '日期函数', items: ['toDate', 'toStartOfMonth', 'dateDiff', 'now'] },
  { label: '条件函数', items: ['if', 'multiIf', 'case'] },
  { label: 'LOD / 表计算', items: ['fixed', 'include', 'exclude', 'TOTAL', 'RUNNING_SUM', 'RANK', 'LOOKUP'] },
]

function icon(iconComponent: Component) {
  return () => h(NIcon, null, { default: () => h(iconComponent) })
}

function setNotice(type: NoticeType, message: string): void {
  notice.type = type
  notice.message = message
}

function cloneState(value = state.value): VisualQueryState {
  return JSON.parse(JSON.stringify(value)) as VisualQueryState
}

function pushUndo(): void {
  undoStack.value.push(cloneState())
  redoStack.value = []
}

function replaceState(next: VisualQueryState): void {
  state.value = cloneState(next)
}

function markDirty(message = '配置已更新，点击查询后刷新结果。'): void {
  state.value.uiState.queryStatus = 'dirty'
  state.value.uiState.errorMessage = ''
  state.value.updatedAt = new Date().toISOString()
  setNotice('info', message)
  if (state.value.queryConfig.autoQuery) {
    window.clearTimeout(autoQueryTimer.value)
    autoQueryTimer.value = window.setTimeout(() => {
      void runQuery()
    }, 500)
  }
}

function undo(): void {
  const previous = undoStack.value.pop()
  if (!previous) return
  redoStack.value.push(cloneState())
  replaceState(previous)
  markDirty('已撤销上一步配置。')
}

function redo(): void {
  const next = redoStack.value.pop()
  if (!next) return
  undoStack.value.push(cloneState())
  replaceState(next)
  markDirty('已重做配置。')
}

function resetState(): void {
  if (!window.confirm('重置后会清空当前字段配置、筛选和分析设置，是否继续？')) return
  pushUndo()
  const source = state.value.source
  state.value = createDefaultVisualState(source.sourceType === 'dataset' ? source.datasetId : 'ds_ad_watch_detail')
  if (source.sourceType === 'local_file') {
    state.value.source = source
  }
  result.value = null
  selectedSavedAnalysisId.value = ''
  markDirty('页面已重置。')
}

const chartGroups = computed(() => {
  const groups = new Map<string, typeof chartDefinitions>()
  chartDefinitions.forEach((chart) => {
    groups.set(chart.group, [...(groups.get(chart.group) ?? []), chart])
  })
  return Array.from(groups.entries()).map(([name, charts]) => ({ name, charts }))
})
const activeChart = computed(() => chartRegistry[state.value.chart.type])
const allFields = computed(() => flattenFields(state.value.fields))
const dimensionFields = computed(() => allFields.value.filter((field) => field.fieldType === 'dimension'))
const measureFields = computed(() => allFields.value.filter((field) => field.fieldType === 'measure'))
const dateFields = computed(() => dimensionFields.value.filter((field) => field.dataType === 'date' || field.dataType === 'datetime'))
const visibleSlots = computed(() => Object.keys(activeChart.value.slots) as VisualFieldSlotKey[])
const slotErrors = computed(() => validateChartSlots(state.value.chart.type, state.value.fieldSlots))
const currentDatasetLabel = computed(() => {
  if (state.value.source.sourceType === 'dataset') return state.value.source.datasetName
  return state.value.source.fileName
})
const datasetIdForHistory = computed(() => state.value.source.sourceType === 'dataset' ? state.value.source.datasetId : state.value.source.tempDatasetId)
const fieldOptions = computed<SelectOption[]>(() =>
  allFields.value.map((field) => ({ label: `${field.displayName} · ${field.dataType}`, value: field.id })),
)
const dimensionOptions = computed<SelectOption[]>(() => dimensionFields.value.map((field) => ({ label: field.displayName, value: field.id })))
const measureOptions = computed<SelectOption[]>(() => measureFields.value.map((field) => ({ label: field.displayName, value: field.id })))
const dateOptions = computed<SelectOption[]>(() => dateFields.value.map((field) => ({ label: field.displayName, value: field.id })))
const paletteOptions = computed<SelectOption[]>(() => palettes.value.map((palette) => ({ label: `${palette.name} · ${palette.scope}`, value: palette.id })))
const savedAnalysisOptions = computed<SelectOption[]>(() =>
  savedAnalyses.value.map((analysis) => ({
    label: `${analysis.name} · ${chartRegistry[analysis.chartType].label} · ${analysis.featureTags.join('/')}`,
    value: analysis.id,
  })),
)
const selectedSavedAnalysis = computed(() =>
  savedAnalyses.value.find((analysis) => analysis.id === selectedSavedAnalysisId.value) ?? null,
)
const filteredDatasets = computed(() => {
  const keyword = datasetKeyword.value.trim().toLowerCase()
  return datasets.value.filter((dataset) => !keyword || dataset.name.toLowerCase().includes(keyword))
})
const fieldGroups = computed(() => {
  const keyword = fieldKeyword.value.trim().toLowerCase()
  const filterFields = (fields: VisualField[]) =>
    fields.filter((field) => !keyword || field.name.toLowerCase().includes(keyword) || field.displayName.toLowerCase().includes(keyword))
  return [
    { key: 'datasetFields', label: '数据集字段', fields: filterFields(state.value.fields.datasetFields) },
    { key: 'personalFields', label: '个人字段', fields: filterFields(state.value.fields.personalFields) },
    { key: 'hierarchyFields', label: '层级字段', fields: filterFields(state.value.fields.hierarchyFields) },
    { key: 'groupFields', label: '分组字段', fields: filterFields(state.value.fields.groupFields) },
    { key: 'dynamicFields', label: '动态字段', fields: filterFields(state.value.fields.dynamicFields) },
  ].filter((group) => group.fields.length || !keyword)
})
const selectedDataset = computed(() => datasets.value.find((dataset) => dataset.id === selectedDatasetId.value) ?? datasets.value[0])
const hasCascadeCycle = computed(() => {
  const links = state.value.filters
    .filter((filter) => filter.type === 'cascade' && filter.parentFieldId && filter.fieldId)
    .map((filter) => ({ parent: filter.parentFieldId ?? '', child: filter.fieldId }))
  return links.some((link) => {
    const seen = new Set<string>()
    let cursor = link.parent
    while (cursor) {
      if (cursor === link.child) return true
      if (seen.has(cursor)) return true
      seen.add(cursor)
      cursor = links.find((item) => item.child === cursor)?.parent ?? ''
    }
    return false
  })
})

function makeRegistry(fields: VisualField[]): FieldRegistry {
  return {
    datasetFields: fields.filter((field) => field.source === 'dataset'),
    personalFields: fields.filter((field) => field.source === 'personal' || field.source === 'calculated' || field.source === 'lod'),
    hierarchyFields: fields.filter((field) => field.source === 'dynamic' && Boolean(field.hierarchyId)),
    groupFields: fields.filter((field) => field.source === 'group'),
    dynamicFields: fields.filter((field) => field.source === 'dynamic' && !field.hierarchyId),
  }
}

function fieldIconLabel(field: VisualField): string {
  if (field.fieldType === 'measure') return '#'
  if (field.dataType === 'date' || field.dataType === 'datetime') return 'Cal'
  if (field.dataType === 'geo') return 'Map'
  return 'Abc'
}

function fieldTypeText(field: VisualField): string {
  return field.fieldType === 'measure' ? '指标' : field.dataType === 'geo' ? '地理维度' : '维度'
}

function slotFieldName(slotField: SlotField): string {
  return allFields.value.find((field) => field.id === slotField.fieldId)?.displayName ?? slotField.displayName
}

function quickAddField(field: VisualField): void {
  const chart = activeChart.value
  const preferredSlot = field.fieldType === 'measure' ? chart.defaultMeasureSlot : chart.defaultDimensionSlot
  const candidateSlots = [preferredSlot, ...visibleSlots.value.filter((slotKey) => slotKey !== preferredSlot)]
  const target = candidateSlots.find((slotKey) => canDropField(field, slotKey, state.value.chart.type, state.value.fieldSlots).ok)
  if (!target) {
    setNotice('warning', '当前图表该区域已达到字段数量上限')
    return
  }
  pushUndo()
  state.value.fieldSlots[target].push({
    fieldId: field.id,
    displayName: field.displayName,
    aggregation: field.aggregation,
    dateGranularity: field.dateGranularity,
    visible: true,
  })
  if (field.fieldType === 'measure') {
    state.value.analysis.topN.orderByMeasureId ||= field.id
    state.value.analysis.percentage.measureId ||= field.id
    state.value.analysis.tableCalculation.measureId ||= field.id
    state.value.analysis.compare.measureIds = state.value.analysis.compare.measureIds.length ? state.value.analysis.compare.measureIds : [field.id]
    state.value.analysis.periodCompare.measureIds = state.value.analysis.periodCompare.measureIds.length ? state.value.analysis.periodCompare.measureIds : [field.id]
  }
  if ((field.dataType === 'date' || field.dataType === 'datetime') && field.fieldType === 'dimension') {
    state.value.analysis.periodCompare.dateFieldId ||= field.id
  }
  markDirty(`${field.displayName} 已加入${slotLabels[target]}。`)
}

function startDrag(field: VisualField): void {
  draggedFieldId.value = field.id
}

function dropToSlot(slotKey: VisualFieldSlotKey): void {
  const field = allFields.value.find((item) => item.id === draggedFieldId.value)
  draggedFieldId.value = ''
  if (!field) return
  const verdict = canDropField(field, slotKey, state.value.chart.type, state.value.fieldSlots)
  if (!verdict.ok) {
    setNotice('warning', verdict.reason ?? '当前字段类型不支持放入该区域')
    return
  }
  pushUndo()
  state.value.fieldSlots[slotKey].push({
    fieldId: field.id,
    displayName: field.displayName,
    aggregation: field.aggregation,
    dateGranularity: field.dateGranularity,
    visible: true,
  })
  if (field.fieldType === 'measure') {
    state.value.analysis.topN.orderByMeasureId ||= field.id
    state.value.analysis.percentage.measureId ||= field.id
    state.value.analysis.tableCalculation.measureId ||= field.id
    state.value.analysis.compare.measureIds = state.value.analysis.compare.measureIds.length ? state.value.analysis.compare.measureIds : [field.id]
    state.value.analysis.periodCompare.measureIds = state.value.analysis.periodCompare.measureIds.length ? state.value.analysis.periodCompare.measureIds : [field.id]
  }
  if ((field.dataType === 'date' || field.dataType === 'datetime') && field.fieldType === 'dimension') {
    state.value.analysis.periodCompare.dateFieldId ||= field.id
  }
  markDirty(`${field.displayName} 已放入${slotLabels[slotKey]}。`)
}

function removeSlotField(slotKey: VisualFieldSlotKey, fieldId: string): void {
  pushUndo()
  state.value.fieldSlots[slotKey] = state.value.fieldSlots[slotKey].filter((field) => field.fieldId !== fieldId)
  markDirty('字段已移除。')
}

function changeChartType(type: VisualChartType): void {
  if (state.value.chart.type === type) return
  pushUndo()
  state.value.chart = { ...createDefaultChartConfig(type), title: state.value.chart.title }
  state.value.fieldSlots = pruneSlotsForChart(type, state.value.fieldSlots)
  markDirty(`已切换为${chartRegistry[type].label}，字段槽位已重新校验。`)
}

async function applySavedAnalysis(value: string | number | null): Promise<void> {
  const savedId = String(value ?? '')
  selectedSavedAnalysisId.value = savedId
  if (!savedId) return
  const analysis = savedAnalyses.value.find((item) => item.id === savedId)
  if (!analysis) {
    setNotice('warning', '未找到对应的保存分析。')
    return
  }
  pushUndo()
  replaceState(analysis.state)
  result.value = null
  if (state.value.source.sourceType === 'dataset') {
    announcement.value = await getAnnouncement(state.value.source.datasetId)
  }
  setNotice('info', `已打开保存分析：${analysis.name}，正在查询。`)
  await runQuery()
}

async function refreshSavedAnalyses(selectedId = selectedSavedAnalysisId.value): Promise<void> {
  savedAnalyses.value = await listSavedVisualAnalyses()
  selectedSavedAnalysisId.value = savedAnalyses.value.some((analysis) => analysis.id === selectedId) ? selectedId : ''
}

function defaultSaveName(): string {
  const currentName = state.value.name?.trim()
  if (currentName && currentName !== '未命名分析') return currentName
  const title = state.value.chart.title?.trim()
  if (title && title !== '未命名图表') return title
  return `${activeChart.value.label}保存分析`
}

async function saveCurrentAnalysis(): Promise<SavedVisualAnalysis | null> {
  try {
    const overwrite = Boolean(selectedSavedAnalysisId.value)
    const saved = await saveCurrentVisualAnalysis({
      analysisId: selectedSavedAnalysisId.value || undefined,
      name: selectedSavedAnalysis.value?.name ?? defaultSaveName(),
      state: state.value,
      overwrite,
    })
    await refreshSavedAnalyses(saved.id)
    state.value.id = saved.id
    state.value.name = saved.name
    setNotice('success', overwrite ? '保存分析已更新。' : '保存分析已创建。')
    return saved
  } catch (error) {
    setNotice('error', error instanceof Error ? error.message : '保存分析失败')
    return null
  }
}

function openSaveAs(): void {
  saveAsDraft.name = `${defaultSaveName()} 副本`
  saveAsModalVisible.value = true
}

async function saveAnalysisAs(): Promise<void> {
  try {
    const saved = await saveCurrentVisualAnalysis({
      name: saveAsDraft.name,
      state: state.value,
      overwrite: false,
    })
    await refreshSavedAnalyses(saved.id)
    state.value.id = saved.id
    state.value.name = saved.name
    saveAsModalVisible.value = false
    setNotice('success', `已另存为：${saved.name}`)
  } catch (error) {
    setNotice('error', error instanceof Error ? error.message : '另存为失败')
  }
}

async function ensureSavedAnalysis(): Promise<SavedVisualAnalysis | null> {
  if (selectedSavedAnalysis.value) return selectedSavedAnalysis.value
  return saveCurrentAnalysis()
}

async function deleteCurrentSavedAnalysis(): Promise<void> {
  const analysis = selectedSavedAnalysis.value
  if (!analysis) {
    setNotice('warning', '请先从保存分析列表中选择要删除的分析。')
    return
  }
  if (!window.confirm(`删除保存分析「${analysis.name}」后，将从下拉列表中移除。是否继续？`)) return
  try {
    const response = await deleteSavedVisualAnalysis(analysis.id)
    await refreshSavedAnalyses('')
    selectedSavedAnalysisId.value = ''
    setNotice('success', response.message)
  } catch (error) {
    setNotice('error', error instanceof Error ? error.message : '删除失败')
  }
}

async function shareCurrentAnalysis(): Promise<void> {
  const analysis = await ensureSavedAnalysis()
  if (!analysis) return
  try {
    const response = await shareSavedVisualAnalysis(analysis.id)
    shareLink.value = response.shareUrl
    shareModalVisible.value = true
    setNotice('success', response.message)
  } catch (error) {
    setNotice('error', error instanceof Error ? error.message : '分享失败')
  }
}

async function copyShareLink(): Promise<void> {
  if (!shareLink.value) return
  try {
    await navigator.clipboard?.writeText(shareLink.value)
    setNotice('success', '分享链接已复制。')
  } catch {
    setNotice('info', '当前环境不支持自动复制，可直接选中链接。')
  }
}

async function addCurrentAnalysisToDashboard(): Promise<void> {
  const analysis = await ensureSavedAnalysis()
  if (!analysis) return
  try {
    const response = await addSavedAnalysisToDashboard(analysis.id)
    setNotice('success', response.message)
  } catch (error) {
    setNotice('error', error instanceof Error ? error.message : '添加到仪表盘失败')
  }
}

function openDatasetSelector(): void {
  selectedDatasetId.value = state.value.source.sourceType === 'dataset' ? state.value.source.datasetId : (datasets.value[0]?.id ?? '')
  datasetModalVisible.value = true
}

async function applyDataset(): Promise<void> {
  const dataset = selectedDataset.value
  if (!dataset) return
  const hasConfig = Object.values(state.value.fieldSlots).some((items) => items.length) || state.value.filters.length
  if (hasConfig && !window.confirm('切换后将清空当前字段配置、筛选、图表配置和分析设置，是否继续？')) return
  pushUndo()
  const next = createDefaultVisualState(dataset.id)
  replaceState(next)
  result.value = null
  selectedSavedAnalysisId.value = ''
  datasetModalVisible.value = false
  announcement.value = await getAnnouncement(dataset.id)
  if (announcement.value) {
    announcementDraft.title = announcement.value.title
    announcementDraft.content = announcement.value.content
    announcementDraft.enabled = announcement.value.enabled
    announcementModalVisible.value = true
  }
  markDirty(`已切换到数据集：${dataset.name}。`)
}

async function handleLocalFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    const text = ext === 'csv' ? await file.text() : undefined
    const temp = await createLocalFileDataset(file, text)
    pushUndo()
    state.value.source = temp.source
    state.value.fields = makeRegistry(temp.fields)
    state.value.fieldSlots = createEmptySlots()
    state.value.filters = []
    state.value.chart = createDefaultChartConfig('table')
    result.value = null
    selectedSavedAnalysisId.value = ''
    markDirty('本地文件已解析为临时数据集，有效期 24 小时。')
  } catch (error) {
    setNotice('error', error instanceof Error ? error.message : '本地文件上传失败')
  } finally {
    input.value = ''
  }
}

async function runQuery(): Promise<void> {
  if (slotErrors.value.length) {
    state.value.uiState.queryStatus = 'failed'
    state.value.uiState.errorMessage = slotErrors.value[0]
    setNotice('error', slotErrors.value[0] ?? '字段不足时无法查询')
    return
  }
  if (hasCascadeCycle.value) {
    setNotice('error', '级联筛选不能形成循环依赖')
    return
  }
  loading.value = true
  state.value.uiState.queryStatus = 'validating'
  try {
    state.value.uiState.queryStatus = 'querying'
    const queryResult = await executeVisualQuery(state.value)
    result.value = queryResult
    state.value.uiState.queryStatus = 'success'
    state.value.uiState.cacheHit = queryResult.cacheHit
    state.value.uiState.sampled = queryResult.sampled
    state.value.uiState.activeBottomTab = 'result'
    queryHistory.value = await listQueryHistory(datasetIdForHistory.value)
    setNotice(queryResult.cacheHit ? 'success' : 'success', queryResult.cacheHit ? '查询成功，已命中缓存。' : '查询成功，图表已刷新。')
  } catch (error) {
    state.value.uiState.queryStatus = 'failed'
    state.value.uiState.errorMessage = error instanceof Error ? error.message : '查询失败后显示错误信息'
    setNotice('error', state.value.uiState.errorMessage)
  } finally {
    loading.value = false
  }
}

function addFilter(type: FilterConfig['type']): void {
  const field = type === 'metric' ? measureFields.value[0] : dimensionFields.value[0]
  if (!field && type !== 'combined') {
    setNotice('warning', '请先添加可筛选字段。')
    return
  }
  pushUndo()
  const filter: FilterConfig = {
    id: `filter_${Date.now()}`,
    type,
    fieldId: field?.id ?? '',
    inputMode: type === 'dimension' || type === 'cascade' ? 'exact' : undefined,
    metricScope: type === 'metric' ? 'result' : undefined,
    dateMode: type === 'date' ? 'dynamic' : undefined,
    operator: type === 'date' ? 'last_n_days' : type === 'metric' ? 'gte' : 'equals',
    value: type === 'date' ? 7 : type === 'metric' ? 1000 : '',
    logic: 'AND',
    children: type === 'combined'
      ? [
        { id: `filter_child_${Date.now()}`, type: 'dimension', fieldId: dimensionFields.value[0]?.id ?? '', operator: 'contains', value: '', logic: 'AND' },
      ]
      : undefined,
    parentFieldId: type === 'cascade' ? dimensionFields.value[1]?.id : undefined,
  }
  state.value.filters.push(filter)
  markDirty('筛选条件已添加。')
}

function addCombinedChild(filter: FilterConfig): void {
  pushUndo()
  const field = dimensionFields.value[0]
  filter.children = [
    ...(filter.children ?? []),
    {
      id: `filter_child_${Date.now()}`,
      type: 'dimension',
      fieldId: field?.id ?? '',
      inputMode: 'condition',
      operator: 'contains',
      value: '',
      logic: 'AND',
    },
  ]
  markDirty('组合筛选条件已添加。')
}

function removeCombinedChild(filter: FilterConfig, childId: string): void {
  pushUndo()
  filter.children = filter.children?.filter((child) => child.id !== childId) ?? []
  markDirty('组合筛选条件已移除。')
}

function removeFilter(filterId: string): void {
  pushUndo()
  state.value.filters = state.value.filters.filter((filter) => filter.id !== filterId)
  markDirty('筛选条件已移除。')
}

function addDynamicControl(type: 'dimension' | 'measure'): void {
  const candidates = type === 'measure' ? measureFields.value : dimensionFields.value
  const first = candidates[0]
  if (!first) return
  pushUndo()
  const field: VisualField = {
    ...first,
    id: `dynamic_${Date.now()}`,
    displayName: type === 'measure' ? '动态指标' : '动态维度',
    source: 'dynamic',
    permission: { editable: true, deletable: true, canSetAlias: true, canSetGeoRole: false },
  }
  state.value.fields.dynamicFields.push(field)
  state.value.dynamicControls.push({
    id: field.id,
    type,
    label: field.displayName,
    candidateFieldIds: candidates.map((item) => item.id),
    selectedFieldId: first.id,
  })
  markDirty(`${field.displayName}已创建。`)
}

function openCalculatedField(): void {
  calculatedDraft.displayName = ''
  calculatedDraft.fieldType = 'measure'
  calculatedDraft.dataType = 'number'
  calculatedDraft.expression = ''
  calculatedDraft.description = ''
  calculatedDraft.saveScope = state.value.source.sourceType === 'local_file' ? 'personal' : 'personal'
  expressionResult.value = null
  calculatedFieldModalVisible.value = true
}

function insertFunction(name: string): void {
  const snippets: Record<string, string> = {
    sum: 'sum([字段])',
    avg: 'avg([字段])',
    count: 'count([字段])',
    count_distinct: 'count_distinct([字段])',
    if: 'if(条件, 真值, 假值)',
    fixed: '{ FIXED [维度] : sum([指标]) }',
    include: '{ INCLUDE [维度] : sum([指标]) }',
    exclude: '{ EXCLUDE [维度] : sum([指标]) }',
    TOTAL: 'TOTAL(sum([指标]))',
    RUNNING_SUM: 'RUNNING_SUM(sum([指标]))',
    RANK: 'RANK(sum([指标]))',
    LOOKUP: 'LOOKUP(sum([指标]), -1)',
  }
  calculatedDraft.expression += calculatedDraft.expression ? ` ${snippets[name] ?? `${name}()`}` : (snippets[name] ?? `${name}()`)
  expressionResult.value = validateExpression(calculatedDraft.expression, allFields.value)
}

function validateCalculatedExpression(): void {
  expressionResult.value = validateExpression(calculatedDraft.expression, allFields.value)
}

function saveCalculatedField(): void {
  validateCalculatedExpression()
  if (!expressionResult.value?.valid) return
  if (!calculatedDraft.displayName.trim()) {
    expressionResult.value = { valid: false, errorMessage: '字段名称不能为空' }
    return
  }
  pushUndo()
  const datasetId = state.value.source.sourceType === 'dataset' ? state.value.source.datasetId : state.value.source.tempDatasetId
  const field: VisualField = {
    id: `calc_${Date.now()}`,
    datasetId,
    name: calculatedDraft.displayName,
    displayName: calculatedDraft.displayName,
    fieldType: calculatedDraft.fieldType,
    dataType: expressionResult.value.dataType ?? calculatedDraft.dataType,
    source: calculatedDraft.expression.includes('FIXED') || calculatedDraft.expression.includes('INCLUDE') || calculatedDraft.expression.includes('EXCLUDE') ? 'lod' : 'calculated',
    expression: calculatedDraft.expression,
    aggregation: calculatedDraft.fieldType === 'measure' ? 'sum' : undefined,
    permission: { editable: true, deletable: true, canSetAlias: calculatedDraft.fieldType === 'dimension', canSetGeoRole: false },
  }
  state.value.fields.personalFields.push(field)
  calculatedFieldModalVisible.value = false
  markDirty('计算字段已添加。')
}

async function openAlias(field: VisualField): Promise<void> {
  if (field.fieldType !== 'dimension') {
    setNotice('warning', '指标字段不支持字段值别名。')
    return
  }
  selectedField.value = field
  const values = (await distinctValues(field)).slice(0, 8)
  aliasDraft.value = values.map((value) => ({ rawValue: value, aliasValue: field.aliasConfig?.mappings?.find((item) => item.rawValue === value)?.aliasValue ?? '' }))
  aliasModalVisible.value = true
}

async function distinctValues(field: VisualField): Promise<string[]> {
  const rows = result.value?.rows.length ? result.value.rows : await getRowsForSource(state.value.source)
  return Array.from(new Set(rows.map((row) => String(row[field.name] ?? '')).filter(Boolean)))
}

function saveAlias(): void {
  if (!selectedField.value) return
  pushUndo()
  const updated: VisualField = {
    ...selectedField.value,
    aliasConfig: {
      mode: 'manual',
      mappings: aliasDraft.value.filter((item) => item.rawValue),
    },
  }
  state.value.fields = updateFieldInRegistry(state.value.fields, updated)
  aliasModalVisible.value = false
  markDirty('字段值别名已保存。')
}

async function openGroup(field: VisualField): Promise<void> {
  selectedField.value = field
  groupDraft.newFieldName = `${field.displayName}分组`
  groupDraft.mode = field.fieldType === 'measure' ? 'numeric_bin' : 'text_group'
  groupDraft.values = (await distinctValues(field)).slice(0, 4).join(',')
  groupModalVisible.value = true
}

function saveGroup(): void {
  if (!selectedField.value || !groupDraft.newFieldName.trim()) return
  pushUndo()
  const datasetId = state.value.source.sourceType === 'dataset' ? state.value.source.datasetId : state.value.source.tempDatasetId
  const groupedField: VisualField = {
    id: `group_${Date.now()}`,
    datasetId,
    name: groupDraft.newFieldName,
    displayName: groupDraft.newFieldName,
    fieldType: 'dimension',
    dataType: 'string',
    source: 'group',
    groupConfig: groupDraft.mode === 'text_group'
      ? {
        mode: 'text_group',
        sourceFieldId: selectedField.value.id,
        groups: [{ groupName: groupDraft.groupName, values: groupDraft.values.split(',').map((item) => item.trim()).filter(Boolean) }],
        unmatchedStrategy: groupDraft.unmatchedStrategy,
        otherGroupName: '其他',
      }
      : {
        mode: 'numeric_bin',
        sourceFieldId: selectedField.value.id,
        bins: [{ name: groupDraft.binName, min: groupDraft.min, max: groupDraft.max, includeMin: true, includeMax: false }],
        unmatchedStrategy: 'set_other',
        otherGroupName: '其他',
      },
    permission: { editable: true, deletable: true, canSetAlias: true, canSetGeoRole: false },
  }
  state.value.fields.groupFields.push(groupedField)
  groupModalVisible.value = false
  markDirty('分组字段已创建。')
}

function openHierarchy(field: VisualField): void {
  if (field.fieldType !== 'dimension') return
  selectedField.value = field
  hierarchyDraft.name = `${field.displayName}层级`
  hierarchyDraft.fieldIds = [field.id, ...dimensionFields.value.filter((item) => item.id !== field.id).slice(0, 1).map((item) => item.id)]
  hierarchyModalVisible.value = true
}

function saveHierarchy(): void {
  if (!hierarchyDraft.name.trim() || hierarchyDraft.fieldIds.length < 2) {
    setNotice('error', '层级名称必填，且至少包含 2 个维度字段。')
    return
  }
  pushUndo()
  const datasetId = state.value.source.sourceType === 'dataset' ? state.value.source.datasetId : state.value.source.tempDatasetId
  const hierarchyField: VisualField = {
    id: `hierarchy_${Date.now()}`,
    datasetId,
    name: hierarchyDraft.name,
    displayName: hierarchyDraft.name,
    fieldType: 'dimension',
    dataType: 'string',
    source: 'dynamic',
    hierarchyId: `h_${Date.now()}`,
    expression: hierarchyDraft.fieldIds.join(' > '),
    permission: { editable: true, deletable: true, canSetAlias: false, canSetGeoRole: false },
  }
  state.value.fields.hierarchyFields.push(hierarchyField)
  hierarchyModalVisible.value = false
  markDirty('层级字段已创建，可用于下钻路径。')
}

function openGeo(field: VisualField): void {
  if (!field.permission.canSetGeoRole) {
    setNotice('warning', '当前字段无地理角色配置权限。')
    return
  }
  selectedField.value = field
  geoDraft.role = field.geoRole?.role ?? 'city'
  geoDraft.mappingMode = field.geoRole?.mappingMode ?? 'auto'
  geoModalVisible.value = true
}

async function saveGeo(): Promise<void> {
  if (!selectedField.value) return
  pushUndo()
  const values = await distinctValues(selectedField.value)
  const updated: VisualField = {
    ...selectedField.value,
    dataType: 'geo',
    semanticType: 'geo',
    geoRole: {
      role: geoDraft.role,
      mappingMode: geoDraft.mappingMode,
      mappings: values.slice(0, 6).map((value, index) => ({
        rawValue: value,
        matchedGeoId: `geo_${index}`,
        matchedName: value,
      })),
    },
  }
  state.value.fields = updateFieldInRegistry(state.value.fields, updated)
  geoModalVisible.value = false
  markDirty('地理角色已保存，地图将使用匹配结果渲染。')
}

function openAnnotation(payload?: { label: string, value: string | number }): void {
  annotationDraft.id = ''
  annotationDraft.type = 'point'
  annotationDraft.fieldId = primaryResultFieldId()
  annotationDraft.value = payload ? `${payload.label}: ${payload.value}` : ''
  annotationDraft.content = payload ? `${payload.label} 标注` : ''
  annotationDraft.x = 58
  annotationDraft.y = 24
  annotationModalVisible.value = true
}

function editAnnotation(id: string): void {
  const annotation = state.value.annotations.find((item) => item.id === id)
  if (!annotation) return
  annotationDraft.id = annotation.id
  annotationDraft.type = annotation.type
  annotationDraft.content = annotation.content
  annotationDraft.x = annotation.position.x
  annotationDraft.y = annotation.position.y
  if (annotation.type === 'point') {
    annotationDraft.fieldId = annotation.fieldId
    annotationDraft.value = String(annotation.value)
  } else {
    annotationDraft.fieldId = annotation.dateFieldId
    annotationDraft.startDate = annotation.startDate
    annotationDraft.endDate = annotation.endDate
  }
  annotationModalVisible.value = true
}

function moveAnnotation(payload: { id: string, x: number, y: number }): void {
  const annotation = state.value.annotations.find((item) => item.id === payload.id)
  if (!annotation) return
  pushUndo()
  annotation.position = { x: payload.x, y: payload.y }
  markDirty('标注位置已更新。')
}

function primaryResultFieldId(): string {
  return result.value?.columns[0]?.fieldId ?? allFields.value[0]?.id ?? ''
}

function saveAnnotation(): void {
  if (!annotationDraft.content.trim()) {
    setNotice('error', '标注内容不能为空')
    return
  }
  if (annotationDraft.type === 'range' && annotationDraft.startDate > annotationDraft.endDate) {
    setNotice('error', '时间段标注开始时间不能晚于结束时间')
    return
  }
  pushUndo()
  const id = annotationDraft.id || `ann_${Date.now()}`
  state.value.annotations = [
    ...state.value.annotations.filter((item) => item.id !== id),
    annotationDraft.type === 'point'
      ? {
        id,
        type: 'point',
        fieldId: annotationDraft.fieldId,
        value: annotationDraft.value,
        content: annotationDraft.content,
        position: { x: annotationDraft.x, y: annotationDraft.y },
      }
      : {
        id,
        type: 'range',
        dateFieldId: annotationDraft.fieldId,
        startDate: annotationDraft.startDate,
        endDate: annotationDraft.endDate,
        content: annotationDraft.content,
        position: { x: annotationDraft.x, y: annotationDraft.y },
      },
  ]
  annotationModalVisible.value = false
  markDirty('标注已保存。')
}

function deleteAnnotation(id: string): void {
  pushUndo()
  state.value.annotations = state.value.annotations.filter((item) => item.id !== id)
  markDirty('标注已删除。')
}

async function savePaletteDraft(): Promise<void> {
  try {
    const palette = await savePalette({
      name: paletteDraft.name,
      scope: paletteDraft.scope,
      colors: paletteDraft.colors,
    })
    palettes.value = await listPalettes()
    state.value.palette = palette
    paletteDraft.name = ''
    markDirty('配色方案已保存并应用。')
  } catch (error) {
    setNotice('error', error instanceof Error ? error.message : '配色保存失败')
  }
}

function applyPalette(paletteId: string): void {
  const palette = palettes.value.find((item) => item.id === paletteId)
  if (!palette) return
  pushUndo()
  state.value.palette = palette
  markDirty(`已应用配色：${palette.name}。`)
}

async function saveAnnouncementDraft(): Promise<void> {
  if (state.value.source.sourceType !== 'dataset') return
  announcement.value = await saveAnnouncement({
    datasetId: state.value.source.datasetId,
    title: announcementDraft.title,
    content: announcementDraft.content,
    enabled: announcementDraft.enabled,
  })
  announcementModalVisible.value = false
  setNotice('success', '公告已保存。')
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

function makeDownloadText(): string {
  if (!result.value) return ''
  const columns = result.value.columns
  const rows = result.value.rows.slice(0, downloadDraft.sampleDownload ? downloadDraft.sampleRows : downloadDraft.rowLimit)
  const header = columns.map((column) => column.displayName).join(',')
  const body = rows.map((row) =>
    columns.map((column) => {
      const raw = formatValue(row[column.name])
      const safe = downloadDraft.scientificNotationAsText && /^\d{12,}$/.test(raw) ? `="${raw}"` : raw
      return `"${safe.replaceAll('"', '""')}"`
    }).join(','),
  )
  return [header, ...body].join('\n')
}

function downloadBlob(content: string, fileName: string, type: string): void {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

function performDownload(): void {
  if (!result.value) {
    setNotice('warning', '请先执行查询。')
    return
  }
  if (downloadDraft.format === 'image') {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540"><rect width="100%" height="100%" fill="#ffffff"/><text x="40" y="72" font-size="28" fill="#101828">${state.value.chart.title ?? '可视化图表'}</text><text x="40" y="124" font-size="18" fill="#475467">图表类型：${activeChart.value.label}</text><text x="40" y="168" font-size="18" fill="#475467">查询行数：${result.value.totalRows}</text></svg>`
    downloadBlob(svg, `${downloadDraft.fileName}.svg`, 'image/svg+xml')
  } else {
    const text = makeDownloadText()
    downloadBlob(text, `${downloadDraft.fileName}.${downloadDraft.format}`, downloadDraft.format === 'csv' ? 'text/csv;charset=utf-8' : 'application/vnd.ms-excel;charset=utf-8')
  }
  downloadModalVisible.value = false
  setNotice('success', '下载任务已生成。')
}

function restoreHistory(history: QueryHistoryItem): void {
  pushUndo()
  replaceState(history.configSnapshot)
  result.value = null
  markDirty('历史配置已恢复，请点击查询刷新结果。')
}

async function refreshHistory(): Promise<void> {
  queryHistory.value = await listQueryHistory(datasetIdForHistory.value)
}

watch(
  () => state.value.queryConfig.autoQuery,
  (enabled) => {
    if (enabled && state.value.uiState.queryStatus === 'dirty') {
      void runQuery()
    }
  },
)

async function initialize(): Promise<void> {
  datasets.value = await listDatasetOptions()
  palettes.value = await listPalettes()
  savedAnalyses.value = await listSavedVisualAnalyses()
  const sharedAnalysisId = new URLSearchParams(window.location.search).get('analysis')
  if (sharedAnalysisId && savedAnalyses.value.some((analysis) => analysis.id === sharedAnalysisId)) {
    await applySavedAnalysis(sharedAnalysisId)
    return
  }
  queryHistory.value = await listQueryHistory(datasetIdForHistory.value)
  if (state.value.source.sourceType === 'dataset') {
    announcement.value = await getAnnouncement(state.value.source.datasetId)
    if (announcement.value) {
      announcementDraft.title = announcement.value.title
      announcementDraft.content = announcement.value.content
      announcementDraft.enabled = announcement.value.enabled
      announcementModalVisible.value = true
    }
  }
  const fields = await getFieldsForSource(state.value.source)
  state.value.fields = makeRegistry(fields)
}

onMounted(() => {
  void initialize()
})
</script>

<template>
  <div class="visual-query-page">
    <header class="page-header">
      <div>
        <h1>数据可视化</h1>
        <p>选择数据集、拖拽字段、配置分析规则并生成图表。</p>
      </div>
      <n-space align="center">
        <n-tag :type="state.uiState.queryStatus === 'success' ? 'success' : state.uiState.queryStatus === 'failed' ? 'error' : 'info'" :bordered="false">
          {{ state.uiState.queryStatus }}
        </n-tag>
        <n-button type="primary" :loading="loading" :disabled="Boolean(slotErrors.length)" :render-icon="icon(PlayOutline)" @click="runQuery">查询</n-button>
      </n-space>
    </header>

    <section class="top-toolbar">
      <div class="toolbar-line">
        <div class="toolbar-group icon-actions">
          <n-button size="small" secondary :disabled="!undoStack.length" :render-icon="icon(ArrowUndoOutline)" title="撤销" @click="undo" />
          <n-button size="small" secondary :disabled="!redoStack.length" :render-icon="icon(ArrowRedoOutline)" title="重做" @click="redo" />
          <n-button size="small" secondary :render-icon="icon(RefreshOutline)" title="重置" @click="resetState" />
        </div>
        <div class="toolbar-group query-actions">
          <n-button size="small" secondary :render-icon="icon(TimeOutline)" @click="refreshHistory(); state.uiState.activeBottomTab = 'history'">查询历史</n-button>
          <n-button size="small" secondary :render-icon="icon(DownloadOutline)" @click="downloadModalVisible = true">下载</n-button>
          <n-button size="small" secondary :render-icon="icon(SettingsOutline)" @click="queryConfigModalVisible = true">查询配置</n-button>
        </div>
        <div class="saved-analysis-picker">
          <span>保存分析</span>
          <n-select
            v-model:value="selectedSavedAnalysisId"
            class="saved-analysis-select"
            size="small"
            filterable
            clearable
            :options="savedAnalysisOptions"
            placeholder="搜索名称或图表类型"
            @update:value="applySavedAnalysis"
          />
        </div>
        <div class="management-actions">
          <n-button size="small" secondary :render-icon="icon(SaveOutline)" @click="saveCurrentAnalysis">保存</n-button>
          <n-button size="small" secondary :render-icon="icon(DuplicateOutline)" @click="openSaveAs">另存为</n-button>
          <n-button size="small" secondary :disabled="!selectedSavedAnalysisId" :render-icon="icon(TrashBinOutline)" @click="deleteCurrentSavedAnalysis">删除</n-button>
          <n-button size="small" secondary :render-icon="icon(ShareSocialOutline)" @click="shareCurrentAnalysis">分享</n-button>
          <n-button size="small" secondary :render-icon="icon(AlbumsOutline)" @click="addCurrentAnalysisToDashboard">添加到仪表盘</n-button>
        </div>
        <n-button class="upload-action" size="small" secondary :render-icon="icon(CloudUploadOutline)" @click="fileInput?.click()">上传本地文件</n-button>
        <input ref="fileInput" class="hidden-input" type="file" accept=".csv,.xlsx,.xls" @change="handleLocalFile">
      </div>
    </section>

    <n-alert :type="notice.type" :show-icon="false" class="notice">{{ notice.message }}</n-alert>
    <n-alert v-if="announcement?.enabled" type="info" :show-icon="false" class="notice">
      {{ announcement.title }}：{{ announcement.content }}
    </n-alert>
    <main class="workbench-grid">
      <aside class="panel field-panel">
        <div class="panel-title">
          <strong>数据源</strong>
          <n-button size="small" secondary @click="openDatasetSelector">切换</n-button>
        </div>
        <div class="source-card">
          <strong>{{ currentDatasetLabel }}</strong>
          <span>{{ state.source.sourceType === 'dataset' ? state.source.accessMode : 'local_file' }} · {{ allFields.length }} 字段</span>
        </div>
        <div class="field-actions">
          <n-input v-model:value="fieldKeyword" size="small" clearable placeholder="搜索字段名称" />
          <n-button size="small" secondary :render-icon="icon(AddOutline)" @click="openCalculatedField">计算字段</n-button>
        </div>
        <div class="field-groups">
          <section v-for="group in fieldGroups" :key="group.key" class="field-group">
            <div class="group-title">{{ group.label }}</div>
            <n-empty v-if="!group.fields.length" size="small" description="未找到匹配字段" />
            <div v-for="field in group.fields" :key="field.id" class="field-row">
              <div
                class="field-item"
                draggable="true"
                @dragstart="startDrag(field)"
              >
                <i>{{ fieldIconLabel(field) }}</i>
                <span><strong>{{ field.displayName }}</strong><em>{{ field.name }} · {{ fieldTypeText(field) }}</em></span>
                <b>{{ field.source }}</b>
                <button type="button" class="field-add" title="添加到当前图表" @click="quickAddField(field)">+</button>
              </div>
              <div class="field-mini-actions">
                <n-button size="tiny" quaternary @click="openAlias(field)">别名</n-button>
                <n-button size="tiny" quaternary @click="openGroup(field)">分组</n-button>
                <n-button size="tiny" quaternary @click="openHierarchy(field)">层级</n-button>
                <n-button size="tiny" quaternary @click="openGeo(field)">地理</n-button>
              </div>
            </div>
          </section>
        </div>
      </aside>

      <section class="center-stack">
        <section class="panel">
          <div class="chart-topline">
            <div>
              <strong>{{ activeChart.label }}</strong>
              <span>{{ activeChart.description }}</span>
            </div>
            <n-space>
              <n-tag v-for="error in slotErrors" :key="error" type="warning" :bordered="false">{{ error }}</n-tag>
            </n-space>
          </div>
          <VisualChartRenderer
            :state="state"
            :result="result"
            @annotate="openAnnotation"
            @edit-annotation="editAnnotation"
            @move-annotation="moveAnnotation"
          />
        </section>

        <section class="panel slot-panel">
          <div class="panel-title">
            <strong>字段槽位</strong>
            <span>拖拽字段到目标区域，规则由 chartRegistry 校验。</span>
          </div>
          <div class="slot-grid">
            <div
              v-for="slotKey in visibleSlots"
              :key="slotKey"
              class="slot-box"
              @dragover.prevent
              @drop="dropToSlot(slotKey)"
            >
              <div class="slot-title">
                <strong>{{ slotLabels[slotKey] }}</strong>
                <span>{{ activeChart.slots[slotKey]?.min ?? 0 }}-{{ activeChart.slots[slotKey]?.max ?? 0 }}</span>
              </div>
              <button
                v-for="slotField in state.fieldSlots[slotKey]"
                :key="slotField.fieldId"
                type="button"
                class="slot-pill"
                @click="removeSlotField(slotKey, slotField.fieldId)"
              >
                {{ slotFieldName(slotField) }}
              </button>
              <span v-if="!state.fieldSlots[slotKey].length" class="slot-empty">拖入字段</span>
            </div>
          </div>
        </section>

        <section class="panel">
          <n-tabs v-model:value="state.uiState.activeBottomTab" type="line" animated>
            <n-tab-pane name="result" tab="查询结果">
              <n-empty v-if="!result" description="执行查询后展示结果明细" />
              <table v-else class="data-table">
                <thead>
                  <tr><th v-for="column in result.columns" :key="column.name">{{ column.displayName }}</th></tr>
                </thead>
                <tbody>
                  <tr v-for="(row, index) in result.rows.slice(0, 12)" :key="index">
                    <td v-for="column in result.columns" :key="column.name">{{ formatValue(row[column.name]) }}</td>
                  </tr>
                </tbody>
              </table>
            </n-tab-pane>
            <n-tab-pane name="history" tab="查询历史">
              <div class="history-list">
                <button v-for="history in queryHistory" :key="history.id" type="button" @click="restoreHistory(history)">
                  <strong>{{ chartRegistry[history.chartType].label }} · {{ history.status }}</strong>
                  <span>{{ history.queryTime }} · {{ history.durationMs ?? '-' }} ms</span>
                </button>
                <n-empty v-if="!queryHistory.length" description="暂无查询历史" />
              </div>
            </n-tab-pane>
            <n-tab-pane name="sql" tab="SQL">
              <pre class="sql-preview">{{ result?.executedSql ?? '查询后展示结构化配置编译出的 SQL' }}</pre>
            </n-tab-pane>
          </n-tabs>
        </section>
      </section>

      <aside class="panel config-panel">
        <n-tabs v-model:value="state.uiState.activeRightTab" type="segment" animated>
          <n-tab-pane name="chart" tab="图表">
            <div class="config-section">
              <div class="section-heading"><strong>图表类型</strong><span>{{ chartDefinitions.length }} 种</span></div>
              <div v-for="group in chartGroups" :key="group.name" class="chart-type-group">
                <p>{{ group.name }}</p>
                <div>
                  <button
                    v-for="chart in group.charts"
                    :key="chart.type"
                    type="button"
                    :class="{ active: chart.type === state.chart.type }"
                    @click="changeChartType(chart.type)"
                  >
                    {{ chart.label }}
                  </button>
                </div>
              </div>
            </div>
            <div class="config-section">
              <div class="section-heading"><strong>样式</strong></div>
              <n-form label-placement="left" label-width="88">
                <n-form-item label="标题"><n-input v-model:value="state.chart.title" @update:value="markDirty()" /></n-form-item>
                <n-form-item label="图例"><n-switch v-model:value="state.chart.style.showLegend" @update:value="markDirty()" /></n-form-item>
                <n-form-item label="数据标签"><n-switch v-model:value="state.chart.style.showLabel" @update:value="markDirty()" /></n-form-item>
                <n-form-item label="堆叠"><n-switch v-model:value="state.chart.style.stack" @update:value="markDirty()" /></n-form-item>
                <n-form-item label="平滑线"><n-switch v-model:value="state.chart.style.smooth" @update:value="markDirty()" /></n-form-item>
                <n-form-item v-if="state.chart.type === 'gauge' || state.chart.type === 'progress'" label="目标值">
                  <n-input-number v-model:value="state.chart.gauge!.targetValue" :min="1" @update:value="markDirty()" />
                </n-form-item>
                <n-form-item v-if="state.chart.type === 'waterfall'" label="模式">
                  <n-radio-group v-model:value="state.chart.waterfall!.mode" @update:value="markDirty()">
                    <n-radio value="structure">结构</n-radio>
                    <n-radio value="change">变化</n-radio>
                  </n-radio-group>
                </n-form-item>
              </n-form>
            </div>
          </n-tab-pane>

          <n-tab-pane name="filter" tab="筛选">
            <div class="config-section">
              <div class="action-grid">
                <n-button secondary :render-icon="icon(FilterOutline)" @click="addFilter('dimension')">维度筛选</n-button>
                <n-button secondary @click="addFilter('metric')">指标筛选</n-button>
                <n-button secondary @click="addFilter('date')">日期筛选</n-button>
                <n-button secondary @click="addFilter('combined')">组合筛选</n-button>
                <n-button secondary @click="addFilter('cascade')">级联筛选</n-button>
              </div>
              <n-alert v-if="hasCascadeCycle" type="error" :show-icon="false">级联筛选不能形成循环依赖</n-alert>
              <div class="filter-list">
                <div v-for="filter in state.filters" :key="filter.id" class="filter-card">
                  <div class="filter-card-title">
                    <strong>{{ filter.type }}</strong>
                    <n-button size="tiny" quaternary :render-icon="icon(TrashBinOutline)" @click="removeFilter(filter.id)" />
                  </div>
                  <n-select v-if="filter.type !== 'combined'" v-model:value="filter.fieldId" size="small" :options="filter.type === 'metric' ? measureOptions : fieldOptions" @update:value="markDirty()" />
                  <n-radio-group v-if="filter.type === 'dimension' || filter.type === 'cascade'" v-model:value="filter.inputMode" class="inline-radios" @update:value="markDirty()">
                    <n-radio value="exact">精确</n-radio>
                    <n-radio value="condition">条件</n-radio>
                    <n-radio value="manual">手动输入</n-radio>
                    <n-radio value="sub_query">子查询</n-radio>
                  </n-radio-group>
                  <n-radio-group v-if="filter.type === 'metric'" v-model:value="filter.metricScope" class="inline-radios" @update:value="markDirty()">
                    <n-radio value="result">结果筛选</n-radio>
                    <n-radio value="detail">明细筛选</n-radio>
                  </n-radio-group>
                  <n-radio-group v-if="filter.type === 'date'" v-model:value="filter.dateMode" class="inline-radios" @update:value="markDirty()">
                    <n-radio value="dynamic">动态日期</n-radio>
                    <n-radio value="fixed">固定日期</n-radio>
                  </n-radio-group>
                  <n-select v-if="filter.type === 'cascade'" v-model:value="filter.parentFieldId" size="small" :options="dimensionOptions" placeholder="上级字段" @update:value="markDirty()" />
                  <n-select v-model:value="filter.operator" size="small" :options="[
                    { label: '精确匹配', value: 'equals' },
                    { label: '不等于', value: 'not_equals' },
                    { label: '包含', value: 'contains' },
                    { label: '包含于列表', value: 'in' },
                    { label: '大于', value: 'gt' },
                    { label: '大于等于', value: 'gte' },
                    { label: '小于', value: 'lt' },
                    { label: '小于等于', value: 'lte' },
                    { label: '区间', value: 'between' },
                    { label: '最近 N 天', value: 'last_n_days' },
                  ]" @update:value="markDirty()" />
                  <n-grid v-if="filter.operator === 'between' || filter.dateMode === 'fixed'" :cols="2" :x-gap="8">
                    <n-gi>
                      <n-input :value="String(filter.startValue ?? '')" size="small" placeholder="开始值 / 日期" @update:value="(value) => { filter.startValue = value; markDirty() }" />
                    </n-gi>
                    <n-gi>
                      <n-input :value="String(filter.endValue ?? '')" size="small" placeholder="结束值 / 日期" @update:value="(value) => { filter.endValue = value; markDirty() }" />
                    </n-gi>
                  </n-grid>
                  <n-input
                    v-if="filter.inputMode !== 'sub_query'"
                    :value="String(filter.value ?? '')"
                    size="small"
                    placeholder="筛选值 / N"
                    @update:value="(value) => { filter.value = value; markDirty() }"
                  />
                  <n-input
                    v-else
                    :value="String(filter.subQueryText ?? '')"
                    size="small"
                    type="textarea"
                    placeholder="子查询返回值，可用逗号或换行分隔"
                    @update:value="(value) => { filter.subQueryText = value; markDirty() }"
                  />
                  <div v-if="filter.type === 'combined'" class="combined-children">
                    <div class="filter-card-title">
                      <span>组合逻辑</span>
                      <n-radio-group v-model:value="filter.logic" size="small" @update:value="markDirty()">
                        <n-radio value="AND">AND</n-radio>
                        <n-radio value="OR">OR</n-radio>
                      </n-radio-group>
                    </div>
                    <div v-for="child in filter.children" :key="child.id" class="combined-child">
                      <n-select v-model:value="child.fieldId" size="small" :options="fieldOptions" @update:value="markDirty()" />
                      <n-select v-model:value="child.operator" size="small" :options="[
                        { label: '精确', value: 'equals' },
                        { label: '包含', value: 'contains' },
                        { label: '列表', value: 'in' },
                        { label: '大于等于', value: 'gte' },
                      ]" @update:value="markDirty()" />
                      <n-input :value="String(child.value ?? child.subQueryText ?? '')" size="small" placeholder="值" @update:value="(value) => { child.value = value; markDirty() }" />
                      <n-button size="tiny" quaternary :render-icon="icon(TrashBinOutline)" @click="removeCombinedChild(filter, child.id)" />
                    </div>
                    <n-button size="small" secondary @click="addCombinedChild(filter)">添加子条件</n-button>
                  </div>
                </div>
              </div>
            </div>
          </n-tab-pane>

          <n-tab-pane name="analysis" tab="分析">
            <div class="config-section">
              <div class="section-heading"><strong>排序</strong><n-switch v-model:value="state.analysis.sort.enabled" @update:value="markDirty()" /></div>
              <n-select v-model:value="state.analysis.sort.fieldId" size="small" :options="fieldOptions" placeholder="排序字段" @update:value="markDirty()" />
              <n-radio-group v-model:value="state.analysis.sort.order" class="inline-radios" @update:value="markDirty()">
                <n-radio value="asc">升序</n-radio>
                <n-radio value="desc">降序</n-radio>
                <n-radio value="manual">手动</n-radio>
              </n-radio-group>
              <n-input
                v-if="state.analysis.sort.order === 'manual'"
                :value="state.analysis.sort.manualOrder.join(',')"
                size="small"
                placeholder="手动顺序，逗号分隔"
                @update:value="(value) => { state.analysis.sort.manualOrder = value.split(/[,，]/).map((item) => item.trim()).filter(Boolean); markDirty() }"
              />
            </div>
            <div class="config-section">
              <div class="section-heading"><strong>Top N</strong><n-switch v-model:value="state.analysis.topN.enabled" @update:value="markDirty()" /></div>
              <n-radio-group v-model:value="state.analysis.topN.mode" class="inline-radios" @update:value="markDirty()">
                <n-radio value="result_rows">结果行</n-radio>
                <n-radio value="dimension_items">维度项</n-radio>
              </n-radio-group>
              <n-radio-group v-model:value="state.analysis.topN.direction" class="inline-radios" @update:value="markDirty()">
                <n-radio value="top">前 N</n-radio>
                <n-radio value="bottom">后 N</n-radio>
              </n-radio-group>
              <n-grid :cols="2" :x-gap="8">
                <n-gi><n-input-number v-model:value="state.analysis.topN.n" :min="1" size="small" @update:value="markDirty()" /></n-gi>
                <n-gi><n-select v-model:value="state.analysis.topN.orderByMeasureId" size="small" :options="measureOptions" placeholder="依据指标" @update:value="markDirty()" /></n-gi>
              </n-grid>
              <n-select v-if="state.analysis.topN.mode === 'dimension_items'" v-model:value="state.analysis.topN.dimensionFieldId" size="small" :options="dimensionOptions" placeholder="Top N 维度" @update:value="markDirty()" />
              <n-checkbox v-model:checked="state.analysis.topN.includeOthers" @update:checked="markDirty()">包含其他</n-checkbox>
            </div>
            <div class="config-section compact-switches">
              <label><span>合计</span><n-switch v-model:value="state.analysis.total.enabled" @update:value="markDirty()" /></label>
              <label><span>百分比</span><n-switch v-model:value="state.analysis.percentage.enabled" @update:value="markDirty()" /></label>
              <label><span>对比</span><n-switch v-model:value="state.analysis.compare.enabled" @update:value="markDirty()" /></label>
              <label><span>同环比</span><n-switch v-model:value="state.analysis.periodCompare.enabled" :disabled="!dateOptions.length" @update:value="markDirty()" /></label>
              <label><span>参考线</span><n-switch v-model:value="state.analysis.referenceLines[0]!.enabled" @update:value="markDirty()" /></label>
              <label><span>表计算</span><n-switch v-model:value="state.analysis.tableCalculation.enabled" @update:value="markDirty()" /></label>
            </div>
            <div class="config-section">
              <n-grid :cols="2" :x-gap="8">
                <n-gi>
                  <n-select v-model:value="state.analysis.total.basis" size="small" :options="[
                    { label: '全量数据', value: 'full_data' },
                    { label: '当前展示', value: 'displayed_data' },
                  ]" placeholder="合计依据" @update:value="markDirty()" />
                </n-gi>
                <n-gi>
                  <n-select v-model:value="state.analysis.total.calculation" size="small" :options="[
                    { label: '自动', value: 'auto' },
                    { label: '求和', value: 'sum' },
                    { label: '平均', value: 'avg' },
                    { label: '最大', value: 'max' },
                    { label: '最小', value: 'min' },
                  ]" placeholder="合计方式" @update:value="markDirty()" />
                </n-gi>
              </n-grid>
              <n-select v-model:value="state.analysis.percentage.measureId" size="small" :options="measureOptions" placeholder="百分比指标" @update:value="markDirty()" />
              <n-select v-model:value="state.analysis.periodCompare.dateFieldId" size="small" :options="dateOptions" placeholder="同环比日期字段" @update:value="markDirty()" />
              <n-select v-model:value="state.analysis.tableCalculation.measureId" size="small" :options="measureOptions" placeholder="表计算指标" @update:value="markDirty()" />
              <n-select v-model:value="state.analysis.tableCalculation.calculationType" size="small" :options="[
                { label: '总额百分比', value: 'total_percent' },
                { label: '累计求和', value: 'running_sum' },
                { label: '差值', value: 'difference' },
                { label: '差异百分比', value: 'percent_difference' },
                { label: '排名', value: 'rank' },
                { label: '移动平均', value: 'moving_average' },
              ]" placeholder="表计算类型" @update:value="markDirty()" />
            </div>
          </n-tab-pane>

          <n-tab-pane name="enhance" tab="增强">
            <div class="config-section">
              <div class="section-heading"><strong>动态字段</strong></div>
              <n-space>
                <n-button secondary size="small" @click="addDynamicControl('dimension')">动态维度</n-button>
                <n-button secondary size="small" @click="addDynamicControl('measure')">动态指标</n-button>
              </n-space>
              <div v-for="control in state.dynamicControls" :key="control.id" class="dynamic-control">
                <span>{{ control.label }}</span>
                <n-select v-model:value="control.selectedFieldId" size="small" :options="control.type === 'measure' ? measureOptions : dimensionOptions" @update:value="markDirty()" />
              </div>
            </div>
            <div class="config-section">
              <div class="section-heading"><strong>标注</strong><n-button size="small" secondary :render-icon="icon(CreateOutline)" @click="openAnnotation()">添加</n-button></div>
              <div class="annotation-list">
                <button v-for="item in state.annotations" :key="item.id" type="button" @click="deleteAnnotation(item.id)">
                  {{ item.content }}
                </button>
                <n-empty v-if="!state.annotations.length" size="small" description="暂无标注" />
              </div>
            </div>
            <div class="config-section">
              <div class="section-heading"><strong>Tooltip</strong><n-switch v-model:value="state.tooltip.enabled" @update:value="markDirty()" /></div>
              <n-radio-group v-model:value="state.tooltip.trigger" class="inline-radios" @update:value="markDirty()">
                <n-radio value="dimension">维度</n-radio>
                <n-radio value="item">项</n-radio>
                <n-radio value="measure">指标</n-radio>
              </n-radio-group>
              <n-select v-model:value="state.tooltip.displayFields" multiple size="small" :options="fieldOptions" placeholder="展示字段" @update:value="markDirty()" />
              <n-input v-model:value="state.tooltip.customText" size="small" placeholder="自定义提示文本" @update:value="markDirty()" />
            </div>
            <div class="config-section">
              <div class="section-heading"><strong>配色</strong><n-button size="small" secondary :render-icon="icon(ColorPaletteOutline)" @click="savePaletteDraft">保存</n-button></div>
              <n-select :value="state.palette?.id" size="small" :options="paletteOptions" placeholder="选择配色" @update:value="applyPalette" />
              <n-input v-model:value="paletteDraft.name" size="small" placeholder="新配色名称" />
              <div class="color-row">
                <n-color-picker v-for="(_, index) in paletteDraft.colors" :key="index" v-model:value="paletteDraft.colors[index]" size="small" :modes="['hex']" />
              </div>
            </div>
          </n-tab-pane>
        </n-tabs>
      </aside>
    </main>

    <n-modal v-model:show="datasetModalVisible" preset="card" title="选择数据集" style="width: 860px">
      <n-grid :cols="24" :x-gap="16">
        <n-gi :span="10">
          <n-input v-model:value="datasetKeyword" clearable placeholder="搜索数据集名称" />
          <div class="dataset-list">
            <button v-for="dataset in filteredDatasets" :key="dataset.id" type="button" :class="{ active: selectedDatasetId === dataset.id }" @click="selectedDatasetId = dataset.id">
              <strong>{{ dataset.name }}</strong>
              <span>{{ dataset.ownerName }} · {{ dataset.accessMode }} · {{ dataset.fieldCount }} 字段</span>
            </button>
          </div>
        </n-gi>
        <n-gi :span="14">
          <div v-if="selectedDataset" class="dataset-detail">
            <h3>{{ selectedDataset.name }}</h3>
            <p>{{ selectedDataset.description }}</p>
            <div><span>更新</span><strong>{{ selectedDataset.updatedAt }}</strong></div>
            <div><span>行数</span><strong>{{ selectedDataset.rowCount?.toLocaleString('zh-CN') }}</strong></div>
            <div><span>权限</span><strong>{{ selectedDataset.permission }}</strong></div>
          </div>
          <n-empty v-else description="暂无可查询的数据集，请联系管理员授权或先创建数据集。" />
        </n-gi>
      </n-grid>
      <template #footer>
        <n-space justify="end">
          <n-button @click="datasetModalVisible = false">取消</n-button>
          <n-button type="primary" @click="applyDataset">确定</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="saveAsModalVisible" preset="card" title="另存为保存分析" style="width: 520px">
      <n-form label-placement="top">
        <n-form-item label="分析名称"><n-input v-model:value="saveAsDraft.name" placeholder="请输入保存分析名称" /></n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="saveAsModalVisible = false">取消</n-button>
          <n-button type="primary" :render-icon="icon(SaveOutline)" @click="saveAnalysisAs">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="shareModalVisible" preset="card" title="分享保存分析" style="width: 620px">
      <n-form label-placement="top">
        <n-form-item label="分享链接"><n-input v-model:value="shareLink" readonly /></n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="shareModalVisible = false">关闭</n-button>
          <n-button type="primary" :render-icon="icon(CopyOutline)" @click="copyShareLink">复制链接</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="downloadModalVisible" preset="card" title="下载数据" style="width: 560px">
      <n-form label-placement="top">
        <n-form-item label="文件名"><n-input v-model:value="downloadDraft.fileName" /></n-form-item>
        <n-form-item label="格式">
          <n-radio-group v-model:value="downloadDraft.format">
            <n-radio value="csv">CSV</n-radio>
            <n-radio value="xlsx">XLSX</n-radio>
            <n-radio value="image">图片</n-radio>
          </n-radio-group>
        </n-form-item>
        <n-grid :cols="2" :x-gap="12">
          <n-gi><n-form-item label="行数"><n-input-number v-model:value="downloadDraft.rowLimit" :min="1" /></n-form-item></n-gi>
          <n-gi><n-form-item label="抽样行数"><n-input-number v-model:value="downloadDraft.sampleRows" :min="1" :disabled="!downloadDraft.sampleDownload" /></n-form-item></n-gi>
        </n-grid>
        <n-checkbox v-model:checked="downloadDraft.scientificNotationAsText">科学计数法转文本</n-checkbox>
        <n-checkbox v-model:checked="downloadDraft.sampleDownload">抽样下载</n-checkbox>
        <n-checkbox v-model:checked="downloadDraft.includeFormattedValue">包含格式化值</n-checkbox>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="downloadModalVisible = false">取消</n-button>
          <n-button type="primary" @click="performDownload">下载</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="queryConfigModalVisible" preset="card" title="查询配置" style="width: 620px">
      <n-form label-placement="left" label-width="120">
        <n-form-item label="自动查询"><n-switch v-model:value="state.queryConfig.autoQuery" /></n-form-item>
        <n-form-item label="缓存"><n-switch v-model:value="state.queryConfig.cacheEnabled" /></n-form-item>
        <n-form-item label="抽样"><n-switch v-model:value="state.queryConfig.samplingEnabled" /></n-form-item>
        <n-form-item label="抽样行数"><n-input-number v-model:value="state.queryConfig.samplingRows" :min="1" :disabled="!state.queryConfig.samplingEnabled" /></n-form-item>
        <n-form-item label="Limit"><n-input-number v-model:value="state.queryConfig.limit" :min="1" /></n-form-item>
        <n-form-item label="超时 ms"><n-input-number v-model:value="state.queryConfig.timeoutMs" :min="1000" /></n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="space-between">
          <n-button v-if="state.source.sourceType === 'dataset'" secondary @click="announcementModalVisible = true">公告配置</n-button>
          <n-button type="primary" @click="queryConfigModalVisible = false; markDirty('查询配置已更新。')">完成</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="calculatedFieldModalVisible" preset="card" title="添加字段" style="width: 760px">
      <n-grid :cols="24" :x-gap="16">
        <n-gi :span="15">
          <n-form label-placement="top">
            <n-form-item label="字段名"><n-input v-model:value="calculatedDraft.displayName" /></n-form-item>
            <n-form-item label="类型">
              <n-radio-group v-model:value="calculatedDraft.fieldType">
                <n-radio value="dimension">维度</n-radio>
                <n-radio value="measure">指标</n-radio>
              </n-radio-group>
            </n-form-item>
            <n-form-item label="表达式">
              <n-input v-model:value="calculatedDraft.expression" type="textarea" :rows="7" placeholder="例如 sum([广告收益]) / sum([广告观看次数])" @blur="validateCalculatedExpression" />
            </n-form-item>
            <n-alert v-if="expressionResult" :type="expressionResult.valid ? 'success' : 'error'" :show-icon="false">
              {{ expressionResult.valid ? `校验通过，返回类型：${expressionResult.dataType}` : expressionResult.errorMessage }}
            </n-alert>
          </n-form>
        </n-gi>
        <n-gi :span="9">
          <div class="function-panel">
            <section v-for="group in functionGroups" :key="group.label">
              <strong>{{ group.label }}</strong>
              <button v-for="fn in group.items" :key="fn" type="button" @click="insertFunction(fn)">{{ fn }}</button>
            </section>
          </div>
        </n-gi>
      </n-grid>
      <template #footer>
        <n-space justify="end">
          <n-button @click="calculatedFieldModalVisible = false">取消</n-button>
          <n-button secondary @click="validateCalculatedExpression">校验</n-button>
          <n-button type="primary" @click="saveCalculatedField">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="aliasModalVisible" preset="card" title="字段值别名" style="width: 600px">
      <table class="data-table">
        <thead><tr><th>原始值</th><th>别名</th></tr></thead>
        <tbody>
          <tr v-for="item in aliasDraft" :key="item.rawValue">
            <td>{{ item.rawValue }}</td>
            <td><n-input v-model:value="item.aliasValue" size="small" placeholder="为空时展示原始值" /></td>
          </tr>
        </tbody>
      </table>
      <template #footer><n-space justify="end"><n-button @click="aliasModalVisible = false">取消</n-button><n-button type="primary" @click="saveAlias">保存</n-button></n-space></template>
    </n-modal>

    <n-modal v-model:show="groupModalVisible" preset="card" title="创建组" style="width: 620px">
      <n-form label-placement="top">
        <n-form-item label="新字段名称"><n-input v-model:value="groupDraft.newFieldName" /></n-form-item>
        <n-radio-group v-model:value="groupDraft.mode">
          <n-radio value="text_group">手动分组</n-radio>
          <n-radio value="numeric_bin">数值区间</n-radio>
        </n-radio-group>
        <template v-if="groupDraft.mode === 'text_group'">
          <n-form-item label="组名"><n-input v-model:value="groupDraft.groupName" /></n-form-item>
          <n-form-item label="字段值，逗号分隔"><n-input v-model:value="groupDraft.values" type="textarea" /></n-form-item>
        </template>
        <template v-else>
          <n-form-item label="区间名"><n-input v-model:value="groupDraft.binName" /></n-form-item>
          <n-grid :cols="2" :x-gap="12">
            <n-gi><n-form-item label="最小"><n-input-number v-model:value="groupDraft.min" /></n-form-item></n-gi>
            <n-gi><n-form-item label="最大"><n-input-number v-model:value="groupDraft.max" /></n-form-item></n-gi>
          </n-grid>
        </template>
      </n-form>
      <template #footer><n-space justify="end"><n-button @click="groupModalVisible = false">取消</n-button><n-button type="primary" @click="saveGroup">保存</n-button></n-space></template>
    </n-modal>

    <n-modal v-model:show="hierarchyModalVisible" preset="card" title="创建层级" style="width: 560px">
      <n-form label-placement="top">
        <n-form-item label="层级名称"><n-input v-model:value="hierarchyDraft.name" /></n-form-item>
        <n-form-item label="维度字段"><n-select v-model:value="hierarchyDraft.fieldIds" multiple :options="dimensionOptions" /></n-form-item>
      </n-form>
      <template #footer><n-space justify="end"><n-button @click="hierarchyModalVisible = false">取消</n-button><n-button type="primary" @click="saveHierarchy">保存</n-button></n-space></template>
    </n-modal>

    <n-modal v-model:show="geoModalVisible" preset="card" title="地理角色" style="width: 520px">
      <n-form label-placement="top">
        <n-form-item label="角色">
          <n-select v-model:value="geoDraft.role" :options="[
            { label: '国家 / 地区', value: 'country' },
            { label: '省 / 自治区', value: 'province' },
            { label: '城市', value: 'city' },
            { label: '区 / 县', value: 'district' },
            { label: '纬度', value: 'latitude' },
            { label: '经度', value: 'longitude' },
            { label: '经纬度', value: 'latlng' },
          ]" />
        </n-form-item>
        <n-form-item label="匹配方式">
          <n-radio-group v-model:value="geoDraft.mappingMode">
            <n-radio value="auto">自动匹配</n-radio>
            <n-radio value="manual">手动映射</n-radio>
          </n-radio-group>
        </n-form-item>
      </n-form>
      <template #footer><n-space justify="end"><n-button @click="geoModalVisible = false">取消</n-button><n-button type="primary" @click="saveGeo">保存</n-button></n-space></template>
    </n-modal>

    <n-modal v-model:show="announcementModalVisible" preset="card" title="公告配置" style="width: 560px">
      <n-form label-placement="top">
        <n-form-item label="标题"><n-input v-model:value="announcementDraft.title" /></n-form-item>
        <n-form-item label="内容"><n-input v-model:value="announcementDraft.content" type="textarea" /></n-form-item>
        <n-checkbox v-model:checked="announcementDraft.enabled">启用公告</n-checkbox>
      </n-form>
      <template #footer><n-space justify="end"><n-button @click="announcementModalVisible = false">关闭</n-button><n-button type="primary" @click="saveAnnouncementDraft">保存</n-button></n-space></template>
    </n-modal>

    <n-modal v-model:show="annotationModalVisible" preset="card" title="数据标注" style="width: 560px">
      <n-form label-placement="top">
        <n-radio-group v-model:value="annotationDraft.type">
          <n-radio value="point">数据点标注</n-radio>
          <n-radio value="range">时间段标注</n-radio>
        </n-radio-group>
        <n-form-item label="绑定字段"><n-select v-model:value="annotationDraft.fieldId" :options="fieldOptions" /></n-form-item>
        <n-form-item v-if="annotationDraft.type === 'point'" label="值"><n-input v-model:value="annotationDraft.value" /></n-form-item>
        <n-grid v-else :cols="2" :x-gap="12">
          <n-gi><n-form-item label="开始日期"><n-input v-model:value="annotationDraft.startDate" /></n-form-item></n-gi>
          <n-gi><n-form-item label="结束日期"><n-input v-model:value="annotationDraft.endDate" /></n-form-item></n-gi>
        </n-grid>
        <n-form-item label="内容"><n-input v-model:value="annotationDraft.content" type="textarea" /></n-form-item>
      </n-form>
      <template #footer><n-space justify="end"><n-button @click="annotationModalVisible = false">取消</n-button><n-button type="primary" @click="saveAnnotation">保存</n-button></n-space></template>
    </n-modal>
  </div>
</template>

<style scoped lang="scss">
.visual-query-page {
  min-height: 100%;
  padding: 16px;
}

.page-header,
.top-toolbar,
.panel-title,
.chart-topline,
.section-heading,
.filter-card-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.page-header {
  margin-bottom: 12px;

  h1 {
    margin: 0;
    font-size: 24px;
  }

  p {
    margin: 5px 0 0;
    color: #667085;
  }
}

.top-toolbar {
  overflow-x: auto;
  margin-bottom: 12px;
  padding: 8px 10px;
  border: 1px solid #d0d5dd;
  border-radius: 8px;
  background: #fff;
}

.toolbar-line {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 1420px;
}

.toolbar-group,
.management-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
}

.saved-analysis-picker {
  display: flex;
  flex: 1 1 520px;
  gap: 8px;
  align-items: center;
  min-width: 360px;

  span {
    flex: 0 0 auto;
    color: #475467;
    font-size: 13px;
    font-weight: 700;
  }
}

.saved-analysis-select {
  flex: 1 1 auto;
  width: 100%;
  min-width: 280px;
}

.management-actions {
  white-space: nowrap;
}

.upload-action {
  flex: 0 0 auto;
}

.hidden-input {
  display: none;
}

.notice {
  margin-bottom: 12px;
}

.workbench-grid {
  display: grid;
  grid-template-columns: 330px minmax(0, 1fr) 360px;
  gap: 12px;
  align-items: start;
}

.center-stack {
  display: grid;
  gap: 12px;
}

.panel {
  padding: 14px;
  border: 1px solid #d0d5dd;
  border-radius: 8px;
  background: #fff;
}

.field-panel,
.config-panel {
  position: sticky;
  top: 12px;
  max-height: calc(100vh - 96px);
  overflow: auto;
}

.source-card {
  display: grid;
  gap: 4px;
  margin: 12px 0;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;

  span {
    color: #667085;
    font-size: 12px;
  }
}

.field-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  margin-bottom: 12px;
}

.field-groups {
  display: grid;
  gap: 14px;
}

.group-title {
  margin-bottom: 8px;
  color: #475467;
  font-size: 12px;
  font-weight: 700;
}

.field-row {
  margin-bottom: 8px;
}

.field-item {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto 28px;
  gap: 8px;
  align-items: center;
  width: 100%;
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  text-align: left;
  cursor: grab;

  i {
    display: grid;
    place-items: center;
    height: 28px;
    border-radius: 6px;
    background: #eef2ff;
    color: #1d4ed8;
    font-size: 11px;
    font-style: normal;
    font-weight: 800;
  }

  strong,
  em {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  em {
    margin-top: 2px;
    color: #667085;
    font-size: 12px;
    font-style: normal;
  }

  b {
    color: #667085;
    font-size: 11px;
    font-weight: 500;
  }
}

.field-add {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border: 1px solid #bfdbfe;
  border-radius: 50%;
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 800;
  cursor: pointer;
}

.field-mini-actions {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
  margin-top: 2px;
}

.chart-topline {
  margin-bottom: 12px;

  strong,
  span {
    display: block;
  }

  span {
    margin-top: 3px;
    color: #667085;
    font-size: 12px;
  }
}

.slot-panel .panel-title span {
  color: #667085;
  font-size: 12px;
}

.slot-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.slot-box {
  min-height: 92px;
  padding: 10px;
  border: 1px dashed #98a2b3;
  border-radius: 8px;
  background: #f8fafc;
}

.slot-title {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #475467;
  font-size: 12px;
}

.slot-pill {
  display: inline-flex;
  max-width: 100%;
  margin: 0 6px 6px 0;
  padding: 4px 8px;
  border: 1px solid #bfdbfe;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  cursor: pointer;
}

.slot-empty {
  color: #98a2b3;
  font-size: 12px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;

  th,
  td {
    padding: 8px 10px;
    border-bottom: 1px solid #eef2f7;
    text-align: left;
    vertical-align: top;
  }

  th {
    background: #f8fafc;
    color: #475467;
    font-weight: 700;
  }
}

.history-list,
.dataset-list,
.filter-list,
.annotation-list {
  display: grid;
  gap: 8px;
}

.history-list button,
.dataset-list button,
.annotation-list button {
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  text-align: left;
  cursor: pointer;

  &.active {
    border-color: #2563eb;
    background: #eff6ff;
  }

  strong,
  span {
    display: block;
  }

  span {
    margin-top: 3px;
    color: #667085;
    font-size: 12px;
  }
}

.sql-preview {
  overflow: auto;
  min-height: 140px;
  margin: 0;
  padding: 12px;
  border-radius: 8px;
  background: #101828;
  color: #d1fadf;
}

.config-section {
  display: grid;
  gap: 10px;
  padding: 12px 0;
  border-bottom: 1px solid #eef2f7;
}

.section-heading span {
  color: #667085;
  font-size: 12px;
}

.chart-type-group {
  p {
    margin: 8px 0 6px;
    color: #667085;
    font-size: 12px;
    font-weight: 700;
  }

  div {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  button {
    padding: 5px 8px;
    border: 1px solid #d0d5dd;
    border-radius: 6px;
    background: #fff;
    color: #344054;
    font-size: 12px;
    cursor: pointer;

    &.active {
      border-color: #2563eb;
      background: #eff6ff;
      color: #1d4ed8;
      font-weight: 700;
    }
  }
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.filter-card {
  display: grid;
  gap: 8px;
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}

.combined-children {
  display: grid;
  gap: 8px;
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.combined-child {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 96px minmax(0, 1fr) 28px;
  gap: 6px;
  align-items: center;
}

.inline-radios {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.compact-switches {
  label {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
}

.dynamic-control {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
}

.color-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.dataset-detail {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;

  h3,
  p {
    margin: 0;
  }

  div {
    display: flex;
    justify-content: space-between;
  }
}

.function-panel {
  display: grid;
  gap: 10px;

  section {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  strong {
    flex-basis: 100%;
    color: #475467;
  }

  button {
    padding: 5px 8px;
    border: 1px solid #d0d5dd;
    border-radius: 6px;
    background: #fff;
    cursor: pointer;
  }
}

@media (max-width: 1280px) {
  .acceptance-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .workbench-grid {
    grid-template-columns: 300px minmax(0, 1fr);
  }

  .config-panel {
    grid-column: 1 / -1;
    position: static;
    max-height: none;
  }
}
</style>
