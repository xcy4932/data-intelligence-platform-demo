<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useMessage } from 'naive-ui'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import {
  defaultComponentCategories,
  defaultComponentRegistry,
  type DefaultComponentRegistryItem,
} from '@/components/big-screen/defaultComponentRegistry'
import {
  applyBigScreenAutoLayout,
  snapBigScreenComponentsToGrid,
} from '@/components/big-screen/autoLayoutEngine'
import BigScreenChartRenderer from '@/components/big-screen/BigScreenChartRenderer.vue'
import BigScreenThreeDRenderer from '@/components/big-screen/BigScreenThreeDRenderer.vue'
import {
  getBigScreenChartSlotRequirements,
} from '@/components/big-screen/chartDataAdapter'
import { chartComponentTypes } from '@/components/big-screen/chartComponentRegistry'
import {
  getBigScreenComponentConfigSchema,
  type BigScreenConfigFieldSchema,
} from '@/components/big-screen/componentConfigSchema'
import {
  createDefaultThreeDLayer,
  earth3DLayerTypes,
  map3DLayerTypes,
  threeDComponentTypes,
} from '@/components/big-screen/threeDComponentRegistry'
import {
  applyDataPipeline,
  getComponentDataRows,
  inferTableSchema,
  normalizeRawRows,
  resolveFieldName,
} from '@/components/big-screen/dataEngine'
import { bigScreenService } from '@/services/bigScreenService'
import type {
  BigScreen,
  BigScreenAutoLayoutResult,
  BigScreenComponent,
  BigScreenComponentLayout,
  BigScreenDevIssue,
  BigScreenDevToolsCheckResult,
  BigScreenDataBindingConfig,
  BigScreenDeviceMode,
  BigScreenGroup,
  BigScreenInteractionActionType,
  BigScreenInteractionEvent,
  BigScreenPage,
  BigScreenSmartVJob,
  BigScreenSmartVJobType,
  BigScreenSnapshot,
  BigScreenTableSchema,
  BigScreenThreeDLayer,
  BigScreenThreeDLayerType,
  BigScreenVersion,
  CreateBigScreenTemplateRequest,
  EditorDirtyState,
  PublishBigScreenRequest,
} from '@/types/bigScreen'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const screenId = computed(() => String(route.params.screenId))
const loading = ref(false)
const screen = ref<BigScreen | null>(null)
const draftSnapshot = ref<BigScreenSnapshot | null>(null)
const nameDraft = ref('')
const descriptionDraft = ref('')
const deviceModeDraft = ref<BigScreenDeviceMode>('pc')
const homePageIdDraft = ref('')
const activePageId = ref('')
const dirtyState = ref<EditorDirtyState>('clean')
const selectedComponentIds = ref<string[]>([])
const copiedComponents = ref<BigScreenComponent[]>([])
const zoom = ref(0.58)
const dragState = ref<{
  mode: 'move' | 'resize'
  startX: number
  startY: number
  componentIds: string[]
  originalLayouts: Record<string, BigScreenComponentLayout>
  resizeComponentId?: string
} | null>(null)
const lastLayoutResult = ref<BigScreenAutoLayoutResult | null>(null)
const historyPast = ref<BigScreenSnapshot[]>([])
const historyFuture = ref<BigScreenSnapshot[]>([])
const layerDragComponentId = ref('')
const publishModalVisible = ref(false)
const publishVersions = ref<BigScreenVersion[]>([])
const publishDraft = ref<PublishBigScreenRequest>({
  publishType: 'latest',
  accessMode: 'public',
  tokenExpireSeconds: 8400,
})
const publishResult = ref('')
const publishSecretKey = ref('')
const publishViewUrl = ref('')
const sharingTokenUrl = ref('')
const publishCheckLoading = ref(false)
const publishCheckResult = ref<BigScreenDevToolsCheckResult | null>(null)
const previewMenuVisible = ref(false)
const versionModalVisible = ref(false)
const versions = ref<BigScreenVersion[]>([])
const versionNameDraft = ref('')
const renameVersionId = ref('')
const renameVersionValue = ref('')
const shareTemplateVisible = ref(false)
const shareTemplateDraft = ref<CreateBigScreenTemplateRequest>({
  name: '',
  description: '',
  scope: 'project',
  isDesensitized: true,
  coverUrl: '',
})
const devToolsVisible = ref(false)
const devToolsResult = ref<BigScreenDevToolsCheckResult>({
  status: 'unknown',
  checkedAt: '',
  issues: [],
})
const smartVVisible = ref(false)
const smartVInput = ref('')
const smartVCurrentJob = ref<BigScreenSmartVJob | null>(null)
const smartVMetricRows = ref([
  { position: '顶部', section: '核心指标', metric: '活跃用户', dimension: '日期', chartType: '指标卡', queryName: '' },
  { position: '中间', section: '趋势分析', metric: '广告观看次数', dimension: '日期', chartType: '折线图', queryName: '' },
  { position: '左边', section: '区域排行', metric: '播放完成率', dimension: '地区', chartType: '排行榜', queryName: '' },
  { position: '右边', section: '渠道结构', metric: '转化率', dimension: '渠道', chartType: '饼图', queryName: '' },
])
const smartVThemeKey = ref('techBlue')
const smartVDeviceWidth = ref(375)
const smartVMessages = ref<Array<{
  id: string
  role: 'assistant' | 'user'
  text: string
  createdAt: string
}>>([
  {
    id: 'smart-v-welcome',
    role: 'assistant',
    text: '我可以帮你转换移动端布局、根据指标体系生成大屏、切换主题风格，也可以检索数字大屏使用文档。',
    createdAt: new Date().toISOString(),
  },
])
const now = ref(dayjs())
const dataPanelTab = ref<'fields' | 'table' | 'analysis' | 'filters'>('fields')
const pasteTableDraft = ref('')
const sceneEditingComponentId = ref('')
const selectedSceneLayerId = ref('')
const draggedLibraryItem = ref<DefaultComponentRegistryItem | null>(null)
const editingTextComponentId = ref('')
const editingTextDraft = ref('')
let clockTimer: number | undefined
let smartVPollTimer: number | undefined

const componentLibraryDragType = 'application/x-big-screen-component-type'
const editableTextComponentTypes = new Set(['title', 'singleText', 'multiText'])
const timeComponentTypes = new Set(['datetime', 'date', 'time', 'weekday'])

const dirtyLabelMap: Record<EditorDirtyState, string> = {
  clean: '已保存',
  dirty: '有未保存修改',
  saving: '保存中',
  saved: '已保存',
  save_failed: '保存失败',
}

const devToolsIssueCounts = computed(() => ({
  error: devToolsResult.value.issues.filter((issue) => issue.severity === 'error').length,
  warning: devToolsResult.value.issues.filter((issue) => issue.severity === 'warning').length,
  resolved: devToolsResult.value.issues.filter((issue) => issue.severity === 'resolved').length,
}))

const publishBlockingIssues = computed(() =>
  (publishCheckResult.value?.issues ?? []).filter((issue) => issue.severity === 'error'),
)

const publishWarningIssues = computed(() =>
  (publishCheckResult.value?.issues ?? []).filter((issue) => issue.severity === 'warning'),
)

const layoutReportCounts = computed(() => ({
  moved: lastLayoutResult.value?.movedComponentIds.length ?? 0,
  skipped: lastLayoutResult.value?.skippedComponentIds.length ?? 0,
  warnings: lastLayoutResult.value?.issues.filter((issue) => issue.severity === 'warning').length ?? 0,
  errors: lastLayoutResult.value?.issues.filter((issue) => issue.severity === 'error').length ?? 0,
}))

const smartVJobTitle = computed(() => {
  const type = smartVCurrentJob.value?.type
  if (type === 'mobile-layout-conversion') {
    return '转换移动端布局'
  }
  if (type === 'metric-system-generation') {
    return '指标体系生成大屏'
  }
  if (type === 'theme-switch') {
    return '一键切换主题风格'
  }
  if (type === 'doc-search') {
    return '智能文档检索'
  }
  return '暂无任务'
})

const publishTypeOptions = computed(() => [
  { label: '当前画板最新内容', value: 'latest' },
  ...publishVersions.value.map((version) => ({
    label: `${version.name} · V${version.versionNo}${version.status === 'published' ? ' · 已发布' : ''}`,
    value: version.id,
  })),
])

const pageOptions = computed(() =>
  (draftSnapshot.value?.pages ?? []).map((page) => ({
    label: page.name,
    value: page.id,
  })),
)

const componentOptions = computed(() =>
  (activeSnapshot.value?.components ?? []).map((component) => ({
    label: `${component.name}（${component.type}）`,
    value: component.id,
  })),
)

const chartTargetOptions = computed(() =>
  (activeSnapshot.value?.components ?? [])
    .filter((component) => isChartComponent(component))
    .map((component) => ({
      label: component.name,
      value: component.id,
    })),
)

const activeSnapshot = computed<BigScreenSnapshot | null>(() => {
  if (!draftSnapshot.value) {
    return null
  }

  const snapshot = {
    ...draftSnapshot.value,
    name: nameDraft.value,
    deviceMode: deviceModeDraft.value,
    homePageId: homePageIdDraft.value,
    pages: draftSnapshot.value.pages.map((page) => ({
      ...page,
      isHomePage: page.id === homePageIdDraft.value,
    })),
  }

  return snapshot
})

const accessModeOptions = [
  { label: '公开访问', value: 'public' },
  { label: '密码验证', value: 'password' },
  { label: 'Token 验证', value: 'token' },
]

const templateScopeOptions = [
  { label: '私有', value: 'private' },
  { label: '项目内', value: 'project' },
  { label: '共享', value: 'shared' },
]

const smartVThemeOptions = [
  { label: '科技蓝', value: 'techBlue' },
  { label: '冷绿监控', value: 'emerald' },
  { label: '金色经营', value: 'amber' },
]

const smartVChartTypeOptions = [
  { label: '指标卡', value: '指标卡' },
  { label: '翻牌器', value: '翻牌器' },
  { label: '柱状图', value: '柱状图' },
  { label: '折线图', value: '折线图' },
  { label: '饼图', value: '饼图' },
  { label: '排行榜', value: '排行榜' },
  { label: '表格', value: '表格' },
  { label: '地图', value: '地图' },
]

const dataSourceOptions = [
  { label: 'Static 静态数据', value: 'static' },
  { label: 'Dataset 数据集', value: 'dataset' },
  { label: 'API 接口', value: 'api' },
  { label: 'JavaScript 脚本', value: 'javascript' },
  { label: 'MySQL', value: 'mysql' },
  { label: '飞书表格', value: 'feishu-sheet' },
  { label: '飞书多维表格', value: 'feishu-bitable' },
]

const getDefaultSourceConfig = (sourceType: BigScreenDataBindingConfig['sourceType']): Record<string, unknown> => {
  if (sourceType === 'api') {
    return {
      method: 'GET',
      headers: [],
      body: '',
      transformer: 'function transform(data) { return data }',
      timeoutMs: 5000,
      proxyEnabled: false,
    }
  }

  if (sourceType === 'javascript') {
    return {
      timeoutMs: 5000,
      script: 'function transform(rows) { return rows }',
    }
  }

  if (sourceType === 'mysql') {
    return {
      connectionId: '',
      mode: 'sql',
      sql: 'select category, series, value, compareValue, target from demo_big_screen_metrics',
    }
  }

  if (sourceType === 'feishu-sheet') {
    return {
      spreadsheetToken: '',
      sheetId: '',
      range: 'A1:Z100',
      firstRowAsHeader: true,
    }
  }

  if (sourceType === 'feishu-bitable') {
    return {
      appToken: '',
      tableId: '',
      viewId: '',
      complexFieldMode: 'string',
    }
  }

  if (sourceType === 'dataset') {
    return {
      datasetId: '',
      queryMode: 'field-slot',
      permissionChecked: true,
    }
  }

  return {}
}

const componentLibrary = defaultComponentRegistry

const formatDateTime = (value?: string): string => value ? new Date(value).toLocaleString('zh-CN') : '-'

const createId = (prefix: string): string => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const activePage = computed<BigScreenPage | null>(() =>
  activeSnapshot.value?.pages.find((page) => page.id === activePageId.value)
  ?? activeSnapshot.value?.pages.find((page) => page.id === homePageIdDraft.value)
  ?? activeSnapshot.value?.pages[0]
  ?? null,
)

const activePageComponents = computed(() => {
  const page = activePage.value

  if (!page || !activeSnapshot.value) {
    return []
  }

  return activeSnapshot.value.components
    .filter((component) => component.pageId === page.id)
    .sort((left, right) => left.zIndex - right.zIndex)
})

const selectedComponents = computed(() =>
  activeSnapshot.value?.components.filter((component) => selectedComponentIds.value.includes(component.id)) ?? [],
)

const selectedComponent = computed(() => selectedComponents.value.length === 1 ? selectedComponents.value[0] : null)

const selectedComponentConfigSchema = computed(() =>
  selectedComponent.value ? getBigScreenComponentConfigSchema(selectedComponent.value.type) : null,
)

const queryColumnOptions = computed(() =>
  queryColumns.value.map((column) => ({
    label: `${column.displayName} · ${column.role === 'measure' ? '指标' : column.role === 'dimension' ? '维度' : '未知'}`,
    value: column.name,
  })),
)

const queryMeasureOptions = computed(() =>
  queryColumns.value
    .filter((column) => column.role === 'measure')
    .map((column) => ({
      label: column.displayName,
      value: column.name,
    })),
)

const filterOperatorOptions = [
  { label: '等于', value: 'eq' },
  { label: '不等于', value: 'neq' },
  { label: '包含', value: 'contains' },
  { label: '大于', value: 'gt' },
  { label: '大于等于', value: 'gte' },
  { label: '小于', value: 'lt' },
  { label: '小于等于', value: 'lte' },
]

const topNModeOptions = [
  { label: '全部', value: 'all' },
  { label: 'Top', value: 'top' },
  { label: 'Bottom', value: 'bottom' },
]

const referenceLineValueOptions = [
  { label: '平均值', value: 'avg' },
  { label: '最大值', value: 'max' },
  { label: '最小值', value: 'min' },
]

const selectedSceneComponent = computed(() =>
  activeSnapshot.value?.components.find((component) => component.id === sceneEditingComponentId.value) ?? null,
)

const selectedSceneLayers = computed<BigScreenThreeDLayer[]>(() =>
  Array.isArray(selectedSceneComponent.value?.style.layers)
    ? selectedSceneComponent.value?.style.layers as BigScreenThreeDLayer[]
    : [],
)

const selectedSceneLayer = computed(() =>
  selectedSceneLayers.value.find((layer) => layer.id === selectedSceneLayerId.value) ?? null,
)

const supportedSceneLayerTypes = computed(() =>
  selectedSceneComponent.value?.type === 'earth3d' ? earth3DLayerTypes : map3DLayerTypes,
)

const queryTableSchema = computed(() =>
  selectedComponent.value
    ? inferTableSchema(getComponentDataRows(selectedComponent.value))
    : inferTableSchema([]),
)

const queryColumns = computed(() => queryTableSchema.value.columns)

const queryRows = computed(() => queryTableSchema.value.rows)

const sceneLayerTableSchema = computed(() => {
  const dataBinding = selectedSceneLayer.value?.dataBinding
  const rawRows = dataBinding?.lastQueryState?.parsedTable?.rows.map((row) => row.values) ?? dataBinding?.staticRows ?? []

  return inferTableSchema(applyDataPipeline(rawRows, dataBinding))
})

const sceneLayerColumns = computed(() => sceneLayerTableSchema.value.columns)

const sceneLayerRows = computed(() => sceneLayerTableSchema.value.rows)

const componentGroups = computed(() => activeSnapshot.value?.groups.filter((group) => group.pageId === activePageId.value) ?? [])

const ungroupedLayerComponents = computed(() =>
  activePageComponents.value
    .filter((component) => !component.parentGroupId)
    .sort((left, right) => right.zIndex - left.zIndex),
)

const groupedLayerNodes = computed(() =>
  componentGroups.value
    .map((group) => ({
      group,
      components: activePageComponents.value
        .filter((component) => component.parentGroupId === group.id)
        .sort((left, right) => right.zIndex - left.zIndex),
    }))
    .filter((node) => node.components.length > 0),
)

const maxZIndex = computed(() =>
  Math.max(0, ...((activeSnapshot.value?.components ?? []).map((component) => component.zIndex))),
)

const canGroup = computed(() => selectedComponentIds.value.length > 1)

const canUngroup = computed(() => selectedComponents.value.some((component) => component.parentGroupId))

const canUndo = computed(() => historyPast.value.length > 0)

const canRedo = computed(() => historyFuture.value.length > 0)

const componentCategoryGroups = computed(() =>
  defaultComponentCategories.map((category) => ({
    category,
    items: componentLibrary.filter((component) => component.category === category),
  })),
)

const pageCanvasStyle = computed(() => {
  const page = activePage.value

  if (!page) {
    return {}
  }

  return {
    width: `${page.width * zoom.value}px`,
    height: `${page.height * zoom.value}px`,
    backgroundColor: page.background.color ?? '#08111f',
    backgroundImage: page.background.imageUrl ? `url(${page.background.imageUrl})` : undefined,
    backgroundSize: page.background.imageFit === 'stretch' ? '100% 100%' : page.background.imageFit ?? 'cover',
  }
})

const markDirty = (): void => {
  if (dirtyState.value !== 'saving') {
    dirtyState.value = 'dirty'
  }
}

const recordHistory = (): void => {
  if (!draftSnapshot.value) {
    return
  }

  historyPast.value = [...historyPast.value.slice(-29), JSON.parse(JSON.stringify(draftSnapshot.value)) as BigScreenSnapshot]
  historyFuture.value = []
}

const replaceSnapshot = (snapshot: BigScreenSnapshot, shouldRecord = true): void => {
  if (shouldRecord) {
    recordHistory()
  }

  draftSnapshot.value = snapshot
  markDirty()
}

const updateSnapshot = (updater: (snapshot: BigScreenSnapshot) => BigScreenSnapshot): void => {
  if (!draftSnapshot.value) {
    return
  }

  replaceSnapshot(updater(JSON.parse(JSON.stringify(draftSnapshot.value)) as BigScreenSnapshot))
}

const getComponentRenderStyle = (component: BigScreenComponent): Record<string, string | number> => ({
  left: `${component.layout.x * zoom.value}px`,
  top: `${component.layout.y * zoom.value}px`,
  width: `${component.layout.width * zoom.value}px`,
  height: `${component.layout.height * zoom.value}px`,
  opacity: component.layout.opacity / 100,
  transform: `rotate(${component.layout.rotate}deg)`,
  zIndex: component.zIndex,
  overflow: component.layout.overflowHidden ? 'hidden' : 'visible',
})

const getTextRenderStyle = (component: BigScreenComponent): Record<string, string | number> => ({
  color: String(component.style.color ?? '#f8fafc'),
  fontSize: `${Number(component.style.fontSize ?? 20) * zoom.value}px`,
  fontWeight: Number(component.style.fontWeight ?? 500),
  lineHeight: Number(component.style.lineHeight ?? 1.2),
  textAlign: String(component.style.textAlign ?? 'left'),
  letterSpacing: `${Number(component.style.letterSpacing ?? 0) * zoom.value}px`,
})

const getShapeRenderStyle = (component: BigScreenComponent): Record<string, string> => ({
  background: String(component.style.backgroundColor ?? 'rgba(15, 47, 81, 0.72)'),
  border: `${Number(component.style.borderWidth ?? 1) * zoom.value}px solid ${String(component.style.borderColor ?? '#38bdf8')}`,
  borderRadius: component.type === 'circle' ? '50%' : `${Number(component.style.borderRadius ?? 8) * zoom.value}px`,
})

const getMediaBoxRenderStyle = (component: BigScreenComponent): Record<string, string> => ({
  borderColor: String(component.style.borderColor ?? '#38bdf8'),
  color: String(component.style.color ?? '#dbeafe'),
})

const getImageRenderStyle = (component: BigScreenComponent): Record<string, string> => ({
  objectFit: String(component.style.objectFit ?? 'cover'),
})

const getTimeText = (component: BigScreenComponent): string => {
  if (component.type === 'weekday') {
    return ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][now.value.day()] ?? ''
  }

  return now.value.format(String(component.style.format ?? 'YYYY-MM-DD HH:mm:ss'))
}

const getComponentRows = (component: BigScreenComponent): Array<Record<string, unknown>> => getComponentDataRows(component)

const getOptions = (component: BigScreenComponent): Array<{ label: string, value: string }> => {
  const rows = getComponentRows(component)

  if (rows.length) {
    return rows.map((row) => ({
      label: String(row.label ?? row.name ?? row.title ?? row.value ?? '选项'),
      value: String(row.value ?? row.id ?? row.label ?? row.name ?? ''),
    }))
  }

  return Array.isArray(component.style.options)
    ? component.style.options as Array<{ label: string, value: string }>
    : []
}

const getPanels = (component: BigScreenComponent): Array<Record<string, string>> =>
  getComponentRows(component).length
    ? getComponentRows(component).map((row, index) => ({
        id: String(row.id ?? row.value ?? `panel-${index + 1}`),
        name: String(row.name ?? row.label ?? `Panel ${index + 1}`),
        title: String(row.title ?? row.name ?? row.label ?? `Panel ${index + 1}`),
        description: String(row.description ?? row.content ?? ''),
      }))
    : Array.isArray(component.style.panels)
      ? component.style.panels as Array<Record<string, string>>
      : []

const getSampleRows = (component: BigScreenComponent): Array<Record<string, string>> =>
  getComponentRows(component).length
    ? getComponentRows(component).map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, String(value ?? '')])))
    : Array.isArray(component.style.sampleRows)
      ? component.style.sampleRows as Array<Record<string, string>>
      : []

const getRepeaterRows = (component: BigScreenComponent): Array<Record<string, string>> => {
  const rows = getSampleRows(component)
  const pageSize = Math.max(1, Number((component.style.pageSize ?? rows.length) || 1))
  return rows.slice(0, pageSize)
}

const flattenTreeOptions = (component: BigScreenComponent): Array<{ label: string, value: string }> => {
  const rows = getComponentRows(component)

  if (rows.length) {
    return rows.map((row) => ({
      label: String(row.label ?? row.name ?? row.value ?? '节点'),
      value: String(row.value ?? row.id ?? row.label ?? ''),
    }))
  }

  const treeData = Array.isArray(component.style.treeData)
    ? component.style.treeData as Array<{ label: string, value?: string, children?: Array<{ label: string, value?: string }> }>
    : []

  return treeData.flatMap((node) => [
    { label: node.label, value: String(node.value ?? node.label) },
    ...(node.children?.map((child) => ({ label: `${node.label} / ${child.label}`, value: String(child.value ?? child.label) })) ?? []),
  ])
}

const getActivePanel = (component: BigScreenComponent): Record<string, string> | undefined => {
  const panels = getPanels(component)
  const activeId = component.type === 'tabs' ? component.style.activeTabId : component.style.activePanelId

  return panels.find((panel) => panel.id === activeId) ?? panels[0]
}

const getFirstTextValue = (...values: unknown[]): string =>
  values.map((value) => String(value ?? '').trim()).find(Boolean) ?? ''

const getStreamUrl = (component: BigScreenComponent): string => {
  const rows = getComponentRows(component)
  const fieldName = resolveFieldName(component.dataBinding, ['videoUrl', 'streamUrl', 'url'], ['videoUrl', 'streamUrl', 'url'])

  return getFirstTextValue(
    component.style.streamUrl,
    component.style.stylePanelUrl,
    rows[0]?.[fieldName],
    rows[0]?.videoUrl,
    rows[0]?.streamUrl,
    rows[0]?.url,
    component.dataBinding?.sourceId,
  )
}

const isChartComponent = (component: BigScreenComponent): boolean => chartComponentTypes.has(component.type)

const isThreeDComponent = (component: BigScreenComponent): boolean => threeDComponentTypes.has(component.type)

const isEditableTextComponent = (component: BigScreenComponent): boolean =>
  editableTextComponentTypes.has(component.type)

const isTimeComponent = (component: BigScreenComponent): boolean =>
  timeComponentTypes.has(component.type)

const getThreeDLayers = (component: BigScreenComponent | null): BigScreenThreeDLayer[] =>
  Array.isArray(component?.style.layers) ? component.style.layers as BigScreenThreeDLayer[] : []

const enterSceneEdit = (component: BigScreenComponent): void => {
  if (!isThreeDComponent(component)) {
    return
  }

  sceneEditingComponentId.value = component.id
  selectedComponentIds.value = [component.id]
  selectedSceneLayerId.value = getThreeDLayers(component)[0]?.id ?? ''
  dataPanelTab.value = 'fields'
}

const exitSceneEdit = (): void => {
  sceneEditingComponentId.value = ''
  selectedSceneLayerId.value = ''
}

const updateThreeDComponentStyle = (componentId: string, patch: Record<string, unknown>): void => {
  updateSnapshot((snapshot) => ({
    ...snapshot,
    components: snapshot.components.map((component) => component.id === componentId
      ? {
          ...component,
          style: {
            ...component.style,
            ...patch,
          },
          updatedAt: new Date().toISOString(),
        }
      : component),
  }))
}

const updateThreeDLayers = (componentId: string, layers: BigScreenThreeDLayer[]): void => {
  updateThreeDComponentStyle(componentId, { layers: layers.map((layer, index) => ({ ...layer, zIndex: index + 1 })) })
}

const addThreeDLayer = (type: BigScreenThreeDLayerType): void => {
  const component = selectedSceneComponent.value

  if (!component) {
    return
  }

  const layers = getThreeDLayers(component)
  const layer = createDefaultThreeDLayer(component.id, type, layers.length)
  updateThreeDLayers(component.id, [...layers, layer])
  selectedSceneLayerId.value = layer.id
}

const copyThreeDLayer = (layer: BigScreenThreeDLayer): void => {
  const component = selectedSceneComponent.value

  if (!component) {
    return
  }

  const layers = getThreeDLayers(component)
  const nextLayer = {
    ...JSON.parse(JSON.stringify(layer)) as BigScreenThreeDLayer,
    id: createId('scene-layer'),
    name: `${layer.name} 副本`,
    locked: false,
  }
  updateThreeDLayers(component.id, [...layers, nextLayer])
  selectedSceneLayerId.value = nextLayer.id
}

const deleteThreeDLayer = (layer: BigScreenThreeDLayer): void => {
  const component = selectedSceneComponent.value

  if (!component || layer.locked) {
    return
  }

  if (!window.confirm('删除后该图层的样式、数据绑定和交互配置将不可恢复')) {
    return
  }

  const layers = getThreeDLayers(component).filter((item) => item.id !== layer.id)
  updateThreeDLayers(component.id, layers)
  selectedSceneLayerId.value = layers[0]?.id ?? ''
}

const updateThreeDLayerPatch = (layerId: string, patch: Partial<BigScreenThreeDLayer>): void => {
  const component = selectedSceneComponent.value

  if (!component) {
    return
  }

  updateThreeDLayers(component.id, getThreeDLayers(component).map((layer) => layer.id === layerId ? { ...layer, ...patch } : layer))
}

const updateThreeDLayerJson = (layerId: string, key: 'styleConfig' | 'animationConfig' | 'interactions' | 'dataBinding', value: string): void => {
  try {
    updateThreeDLayerPatch(layerId, { [key]: JSON.parse(value) as unknown })
  } catch {
    message.error('JSON 格式不正确')
  }
}

const updateThreeDLayerDataBindingPatch = (layer: BigScreenThreeDLayer, patch: Partial<BigScreenDataBindingConfig>): void => {
  if (!layer.dataBinding) {
    return
  }

  updateThreeDLayerPatch(layer.id, {
    dataBinding: {
      ...layer.dataBinding,
      ...patch,
    },
  })
}

const updateThreeDLayerDataBindingJson = (
  layer: BigScreenThreeDLayer,
  key: keyof BigScreenDataBindingConfig,
  value: string,
): void => {
  try {
    updateThreeDLayerDataBindingPatch(layer, { [key]: JSON.parse(value) as unknown })
  } catch {
    message.error('JSON 格式不正确')
  }
}

const updateThreeDLayerSourceType = (layer: BigScreenThreeDLayer, value: string): void => {
  const sourceType = value as BigScreenDataBindingConfig['sourceType']

  updateThreeDLayerDataBindingPatch(layer, {
    sourceType,
    sourceConfig: getDefaultSourceConfig(sourceType),
    lastQueryState: { status: 'idle' },
  })
}

const bindSceneLayerFieldToSlot = (
  layer: BigScreenThreeDLayer,
  column: BigScreenTableSchema['columns'][number],
  slot: string,
): void => {
  if (!layer.dataBinding) {
    return
  }

  updateThreeDLayerDataBindingPatch(layer, {
    fields: [
      ...layer.dataBinding.fields.filter((field) => !(field.slot === slot && field.fieldName === column.name)),
      {
        slot,
        fieldName: column.name,
        fieldType: column.role === 'measure' ? 'measure' : column.dataType === 'date' || column.dataType === 'datetime' ? 'date' : 'dimension',
        aggregation: column.role === 'measure' ? 'sum' : undefined,
      },
    ],
    fieldSlots: {
      ...(layer.dataBinding.fieldSlots ?? {}),
      [slot]: [column.name],
    },
  })
}

const addSceneLayerSortRuleFromColumn = (
  layer: BigScreenThreeDLayer,
  column: BigScreenTableSchema['columns'][number],
): void => {
  if (!layer.dataBinding) {
    return
  }

  updateThreeDLayerDataBindingPatch(layer, {
    sortRules: [
      ...(layer.dataBinding.sortRules ?? []),
      { fieldName: column.name, order: column.role === 'measure' ? 'desc' : 'asc' },
    ],
  })
}

const addSceneLayerFilterRuleFromColumn = (
  layer: BigScreenThreeDLayer,
  column: BigScreenTableSchema['columns'][number],
): void => {
  if (!layer.dataBinding) {
    return
  }

  const firstValue = sceneLayerRows.value[0]?.values[column.name]
  updateThreeDLayerDataBindingPatch(layer, {
    filterRules: [
      ...(layer.dataBinding.filterRules ?? []),
      {
        fieldName: column.name,
        operator: column.role === 'measure' ? 'gte' : 'eq',
        value: column.role === 'measure' ? Number(firstValue ?? 0) : firstValue ?? '',
      },
    ],
  })
}

const setSceneLayerTopNFromColumn = (
  layer: BigScreenThreeDLayer,
  column: BigScreenTableSchema['columns'][number],
): void => {
  updateThreeDLayerDataBindingPatch(layer, {
    topN: {
      enabled: true,
      mode: 'top',
      count: 10,
      measureField: column.name,
    },
  })
}

const moveThreeDLayer = (layerId: string, direction: 'up' | 'down'): void => {
  const component = selectedSceneComponent.value

  if (!component) {
    return
  }

  const layers = [...getThreeDLayers(component)]
  const index = layers.findIndex((layer) => layer.id === layerId)
  const nextIndex = direction === 'up' ? index - 1 : index + 1

  if (index < 0 || nextIndex < 0 || nextIndex >= layers.length) {
    return
  }

  const current = layers[index]
  const next = layers[nextIndex]
  if (!current || !next) {
    return
  }

  layers[index] = next
  layers[nextIndex] = current
  updateThreeDLayers(component.id, layers)
}

const updateThreeDContainerConfigJson = (component: BigScreenComponent, value: string): void => {
  try {
    updateThreeDComponentStyle(component.id, { containerConfig: JSON.parse(value) as unknown })
  } catch {
    message.error('JSON 格式不正确')
  }
}

const getComponentById = (componentId: string): BigScreenComponent | undefined =>
  draftSnapshot.value?.components.find((component) => component.id === componentId)

const createDefaultAnimation = () => ({
  enter: {
    enabled: false,
    type: 'none' as const,
    durationMs: 0,
    startTimeMs: 0,
    easing: 'linear' as const,
  },
  exit: {
    enabled: false,
    type: 'none' as const,
    durationMs: 0,
    startTimeMs: 0,
    easing: 'linear' as const,
  },
})

const getClampedComponentPosition = (
  page: BigScreenPage,
  item: DefaultComponentRegistryItem,
  position?: { x: number, y: number },
): { x: number, y: number } => {
  const maxX = Math.max(0, page.width - item.width)
  const maxY = Math.max(0, page.height - item.height)
  const x = position ? position.x : (page.width - item.width) / 2
  const y = position ? position.y : (page.height - item.height) / 2

  return {
    x: Math.min(maxX, Math.max(0, Math.round(x))),
    y: Math.min(maxY, Math.max(0, Math.round(y))),
  }
}

const createComponentFromLibrary = (
  item: DefaultComponentRegistryItem,
  position?: { x: number, y: number },
): BigScreenComponent | null => {
  const page = activePage.value
  const currentScreen = screen.value

  if (!page || !currentScreen) {
    return null
  }

  const createdAt = new Date().toISOString()
  const componentId = createId('cmp')
  const style = JSON.parse(JSON.stringify(item.style)) as Record<string, unknown>

  if (Array.isArray(style.layers)) {
    style.layers = (style.layers as BigScreenThreeDLayer[]).map((layer, index) => ({
      ...layer,
      id: `${componentId}-layer-${layer.type}-${index + 1}`,
      parentComponentId: componentId,
      zIndex: index + 1,
    }))
  }

  const initialPosition = getClampedComponentPosition(page, item, position)

  return {
    id: componentId,
    pageId: page.id,
    screenId: currentScreen.id,
    type: item.type,
    name: item.name,
    layout: {
      x: initialPosition.x,
      y: initialPosition.y,
      width: item.width,
      height: item.height,
      rotate: 0,
      opacity: 100,
      lockAspectRatio: false,
      overflowHidden: false,
    },
    style,
    dataBinding: item.dataBinding
      ? JSON.parse(JSON.stringify(item.dataBinding)) as BigScreenComponent['dataBinding']
      : undefined,
    interactions: [],
    animations: createDefaultAnimation(),
    visible: true,
    locked: false,
    zIndex: maxZIndex.value + 1,
    marker: '',
    createdAt,
    updatedAt: createdAt,
  }
}

const addComponent = (item: DefaultComponentRegistryItem, position?: { x: number, y: number }): void => {
  const component = createComponentFromLibrary(item, position)

  if (!component) {
    return
  }

  updateSnapshot((snapshot) => ({
    ...snapshot,
    components: [...snapshot.components, component],
    pages: snapshot.pages.map((page) => page.id === component.pageId
      ? { ...page, componentIds: [...page.componentIds, component.id] }
      : page),
  }))
  selectedComponentIds.value = [component.id]
}

const handleComponentCardDragStart = (event: DragEvent, item: DefaultComponentRegistryItem): void => {
  draggedLibraryItem.value = item

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData(componentLibraryDragType, item.type)
  }
}

const handleComponentCardDragEnd = (): void => {
  draggedLibraryItem.value = null
}

const resolveDraggedLibraryItem = (event: DragEvent): DefaultComponentRegistryItem | null => {
  const draggedType = event.dataTransfer?.getData(componentLibraryDragType)

  return draggedLibraryItem.value
    ?? componentLibrary.find((item) => item.type === draggedType)
    ?? null
}

const getCanvasDropPosition = (event: DragEvent): { x: number, y: number } => {
  const canvas = event.currentTarget as HTMLElement
  const rect = canvas.getBoundingClientRect()

  return {
    x: (event.clientX - rect.left) / zoom.value,
    y: (event.clientY - rect.top) / zoom.value,
  }
}

const handleCanvasDragOver = (event: DragEvent): void => {
  const hasComponentPayload = Array.from(event.dataTransfer?.types ?? []).includes(componentLibraryDragType)

  if (!draggedLibraryItem.value && !hasComponentPayload) {
    return
  }

  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy'
  }
}

const handleCanvasDrop = (event: DragEvent): void => {
  const item = resolveDraggedLibraryItem(event)

  if (!item) {
    return
  }

  event.preventDefault()
  addComponent(item, getCanvasDropPosition(event))
  draggedLibraryItem.value = null
}

const addPage = (): void => {
  const currentScreen = screen.value

  if (!currentScreen || !activeSnapshot.value) {
    return
  }

  const firstPage = activeSnapshot.value.pages[0]
  const width = firstPage?.width ?? (deviceModeDraft.value === 'mobile' ? 375 : 1920)
  const height = firstPage?.height ?? (deviceModeDraft.value === 'mobile' ? 812 : 1080)
  const pageId = createId('page')
  const page: BigScreenPage = {
    id: pageId,
    screenId: currentScreen.id,
    name: `页面${activeSnapshot.value.pages.length + 1}`,
    width,
    height,
    background: {
      type: 'color',
      color: '#08111f',
      opacity: 100,
    },
    componentIds: [],
    interactionEvents: [],
    sortIndex: activeSnapshot.value.pages.length,
    isHomePage: false,
  }

  updateSnapshot((snapshot) => ({
    ...snapshot,
    pages: [...snapshot.pages, page],
  }))
  activePageId.value = pageId
}

const renamePage = (page: BigScreenPage): void => {
  const name = window.prompt('请输入页面名称', page.name)?.trim()

  if (!name) {
    return
  }

  updateSnapshot((snapshot) => ({
    ...snapshot,
    pages: snapshot.pages.map((item) => item.id === page.id ? { ...item, name } : item),
  }))
}

const deletePage = (page: BigScreenPage): void => {
  if (!activeSnapshot.value || activeSnapshot.value.pages.length <= 1) {
    message.warning('每个大屏至少保留一个页面')
    return
  }

  if (!window.confirm(`确认删除「${page.name}」？页面内组件会一并删除。`)) {
    return
  }

  updateSnapshot((snapshot) => {
    const pages = snapshot.pages
      .filter((item) => item.id !== page.id)
      .map((item, index) => ({
        ...item,
        sortIndex: index,
        isHomePage: page.id === snapshot.homePageId && index === 0 ? true : item.isHomePage,
      }))
    const homePageId = page.id === snapshot.homePageId ? pages[0]!.id : snapshot.homePageId
    const removedComponentIds = new Set(page.componentIds)

    return {
      ...snapshot,
      homePageId,
      pages: pages.map((item) => ({ ...item, isHomePage: item.id === homePageId })),
      components: snapshot.components.filter((component) => !removedComponentIds.has(component.id)),
      groups: snapshot.groups.filter((group) => group.pageId !== page.id),
    }
  })
  activePageId.value = activeSnapshot.value?.homePageId ?? ''
  selectedComponentIds.value = []
}

const setHomePage = (pageId: string): void => {
  homePageIdDraft.value = pageId
  updateSnapshot((snapshot) => ({
    ...snapshot,
    homePageId: pageId,
    pages: snapshot.pages.map((page) => ({
      ...page,
      isHomePage: page.id === pageId,
    })),
  }))
}

const updatePagePatch = (patch: Partial<BigScreenPage>): void => {
  const page = activePage.value

  if (!page) {
    return
  }

  updateSnapshot((snapshot) => ({
    ...snapshot,
    pages: snapshot.pages.map((item) => item.id === page.id ? { ...item, ...patch } : item),
  }))
}

const updatePageBackgroundColor = (color: string): void => {
  const page = activePage.value

  if (!page) {
    return
  }

  updateSnapshot((snapshot) => ({
    ...snapshot,
    pages: snapshot.pages.map((item) => item.id === page.id
      ? {
          ...item,
          background: {
            ...item.background,
            type: item.background.imageUrl ? 'color-image' : 'color',
            color,
          },
        }
      : item),
  }))
}

const selectComponent = (componentId: string, event?: MouseEvent): void => {
  const component = getComponentById(componentId)

  if (!component || component.locked) {
    selectedComponentIds.value = [componentId]
    return
  }

  if (event?.shiftKey || event?.metaKey) {
    selectedComponentIds.value = selectedComponentIds.value.includes(componentId)
      ? selectedComponentIds.value.filter((id) => id !== componentId)
      : [...selectedComponentIds.value, componentId]
    return
  }

  selectedComponentIds.value = [componentId]
}

const clearSelection = (): void => {
  selectedComponentIds.value = []
}

const updateComponentPatch = (componentId: string, patch: Partial<BigScreenComponent>): void => {
  updateSnapshot((snapshot) => ({
    ...snapshot,
    components: snapshot.components.map((component) => component.id === componentId
      ? {
          ...component,
          ...patch,
          updatedAt: new Date().toISOString(),
        }
      : component),
  }))
}

const updateComponentLayout = (componentId: string, patch: Partial<BigScreenComponentLayout>): void => {
  updateSnapshot((snapshot) => ({
    ...snapshot,
    components: snapshot.components.map((component) => component.id === componentId
      ? {
          ...component,
          layout: {
            ...component.layout,
            ...patch,
          },
          updatedAt: new Date().toISOString(),
        }
      : component),
  }))
}

const updateComponentStyle = (componentId: string, key: string, value: unknown): void => {
  updateSnapshot((snapshot) => ({
    ...snapshot,
    components: snapshot.components.map((component) => component.id === componentId
      ? {
          ...component,
          style: {
            ...component.style,
            [key]: value,
          },
          updatedAt: new Date().toISOString(),
        }
      : component),
  }))
}

const updateComponentStyleJson = (componentId: string, key: string, value: string): void => {
  try {
    updateComponentStyle(componentId, key, JSON.parse(value) as unknown)
  } catch {
    message.error('JSON 格式不正确')
  }
}

const getConfigFieldValue = (
  component: BigScreenComponent,
  field: BigScreenConfigFieldSchema,
): unknown => {
  if (field.scope === 'layout') {
    return component.layout[field.key as keyof BigScreenComponentLayout] ?? field.defaultValue
  }

  if (field.scope === 'component') {
    return component[field.key as keyof BigScreenComponent] ?? field.defaultValue
  }

  if (field.scope === 'dataBinding') {
    return component.dataBinding?.[field.key as keyof BigScreenDataBindingConfig] ?? field.defaultValue
  }

  return component.style[field.key] ?? field.defaultValue
}

const updateConfigFieldValue = (
  component: BigScreenComponent,
  field: BigScreenConfigFieldSchema,
  value: unknown,
): void => {
  if (field.scope === 'layout') {
    updateComponentLayout(component.id, { [field.key]: value } as Partial<BigScreenComponentLayout>)
    return
  }

  if (field.scope === 'component') {
    updateComponentPatch(component.id, { [field.key]: value } as Partial<BigScreenComponent>)
    return
  }

  if (field.scope === 'dataBinding') {
    updateComponentDataBinding(component.id, field.key, value)
    return
  }

  updateComponentStyle(component.id, field.key, value)
}

const updateConfigFieldJson = (
  component: BigScreenComponent,
  field: BigScreenConfigFieldSchema,
  value: string,
): void => {
  try {
    updateConfigFieldValue(component, field, JSON.parse(value) as unknown)
  } catch {
    message.error('JSON 格式不正确')
  }
}

const startInlineTextEdit = (component: BigScreenComponent): void => {
  if (!isEditableTextComponent(component) || component.locked) {
    return
  }

  selectedComponentIds.value = [component.id]
  editingTextComponentId.value = component.id
  editingTextDraft.value = String(component.style.text ?? component.name)
}

const commitInlineTextEdit = (): void => {
  const componentId = editingTextComponentId.value

  if (!componentId) {
    return
  }

  updateComponentStyle(componentId, 'text', editingTextDraft.value)
  editingTextComponentId.value = ''
  editingTextDraft.value = ''
}

const cancelInlineTextEdit = (): void => {
  editingTextComponentId.value = ''
  editingTextDraft.value = ''
}

const handleComponentDoubleClick = (component: BigScreenComponent): void => {
  if (isEditableTextComponent(component)) {
    startInlineTextEdit(component)
    return
  }

  enterSceneEdit(component)
}

const updateComponentDataBinding = (componentId: string, key: string, value: unknown): void => {
  updateSnapshot((snapshot) => ({
    ...snapshot,
    components: snapshot.components.map((component) => component.id === componentId
      ? {
          ...component,
          dataBinding: {
            sourceType: 'static',
            fields: [],
            updateMode: 'manual',
            ...component.dataBinding,
            [key]: value,
          },
          updatedAt: new Date().toISOString(),
        }
      : component),
  }))
}

const updateComponentDataBindingJson = (componentId: string, key: string, value: string): void => {
  try {
    updateComponentDataBinding(componentId, key, JSON.parse(value) as unknown)
  } catch {
    message.error('JSON 格式不正确')
  }
}

const updateComponentSourceType = (
  componentId: string,
  sourceType: BigScreenDataBindingConfig['sourceType'],
): void => {
  updateSnapshot((snapshot) => ({
    ...snapshot,
    components: snapshot.components.map((component) => component.id === componentId
      ? {
          ...component,
	          dataBinding: {
	            sourceType,
	            sourceId: component.dataBinding?.sourceId ?? '',
	            fields: component.dataBinding?.fields ?? [],
	            fieldSlots: component.dataBinding?.fieldSlots ?? {},
	            updateMode: component.dataBinding?.updateMode ?? 'manual',
	            refreshIntervalSeconds: component.dataBinding?.refreshIntervalSeconds ?? 60,
	            sortRules: component.dataBinding?.sortRules ?? [],
	            filterRules: component.dataBinding?.filterRules ?? [],
	            topN: component.dataBinding?.topN ?? { enabled: false, mode: 'all', count: 10 },
	            globalFilterBindings: component.dataBinding?.globalFilterBindings ?? [],
	            referenceLines: component.dataBinding?.referenceLines ?? [],
	            extraFields: component.dataBinding?.extraFields ?? [],
	            staticRows: component.dataBinding?.staticRows ?? [],
	            sourceConfig: getDefaultSourceConfig(sourceType),
	            lastQueryState: { status: 'idle' },
          },
          updatedAt: new Date().toISOString(),
        }
      : component),
  }))
}

const upsertFieldMapping = (
  component: BigScreenComponent,
  column: BigScreenTableSchema['columns'][number],
  slot: string,
): BigScreenDataBindingConfig | null => {
  const dataBinding = component.dataBinding

  if (!dataBinding) {
    return null
  }

  const nextFields = [
    ...dataBinding.fields.filter((field) => !(field.slot === slot && field.fieldName === column.name)),
    {
      slot,
      fieldName: column.name,
      fieldType: column.role === 'measure' ? 'measure' as const : column.dataType === 'date' || column.dataType === 'datetime' ? 'date' as const : 'dimension' as const,
      aggregation: column.role === 'measure' ? 'sum' as const : undefined,
    },
  ]

  return {
    ...dataBinding,
    fields: nextFields,
    fieldSlots: {
      ...(dataBinding.fieldSlots ?? {}),
      [slot]: [column.name],
    },
  }
}

const bindFieldToSlot = (
  component: BigScreenComponent,
  column: BigScreenTableSchema['columns'][number],
  slot: string,
): void => {
  const nextDataBinding = upsertFieldMapping(component, column, slot)

  if (!nextDataBinding) {
    return
  }

  updateComponentPatch(component.id, { dataBinding: nextDataBinding })
}

const addSortRuleFromColumn = (
  component: BigScreenComponent,
  column: BigScreenTableSchema['columns'][number],
): void => {
  if (!component.dataBinding) {
    return
  }

  updateComponentDataBinding(component.id, 'sortRules', [
    ...(component.dataBinding.sortRules ?? []),
    { fieldName: column.name, order: column.role === 'measure' ? 'desc' : 'asc' },
  ])
}

const addFilterRuleFromColumn = (
  component: BigScreenComponent,
  column: BigScreenTableSchema['columns'][number],
): void => {
  if (!component.dataBinding) {
    return
  }

  const firstValue = queryRows.value[0]?.values[column.name]
  updateComponentDataBinding(component.id, 'filterRules', [
    ...(component.dataBinding.filterRules ?? []),
    {
      fieldName: column.name,
      operator: column.role === 'measure' ? 'gte' : 'eq',
      value: column.role === 'measure' ? Number(firstValue ?? 0) : firstValue ?? '',
    },
  ])
}

const setTopNFromColumn = (
  component: BigScreenComponent,
  column: BigScreenTableSchema['columns'][number],
): void => {
  updateComponentDataBinding(component.id, 'topN', {
    enabled: true,
    mode: 'top',
    count: 10,
    measureField: column.name,
  })
}

const addReferenceLineFromColumn = (
  component: BigScreenComponent,
  column: BigScreenTableSchema['columns'][number],
): void => {
  if (!component.dataBinding) {
    return
  }

  updateComponentDataBinding(component.id, 'referenceLines', [
    ...(component.dataBinding.referenceLines ?? []),
    {
      id: createId('reference-line'),
      name: `${column.displayName}平均线`,
      fieldName: column.name,
      value: 'avg',
      color: '#f59e0b',
      visible: true,
    },
  ])
}

const addExtraFieldFromColumn = (
  component: BigScreenComponent,
  column: BigScreenTableSchema['columns'][number],
): void => {
  if (!component.dataBinding) {
    return
  }

  updateComponentDataBinding(component.id, 'extraFields', [
    ...(component.dataBinding.extraFields ?? []),
    {
      id: createId('extra-field'),
      name: `${column.name}_display`,
      expression: '${' + column.name + '}',
      dataType: 'string',
      enabled: true,
    },
  ])
}

const addVisualFilterRule = (component: BigScreenComponent): void => {
  if (!component.dataBinding) {
    return
  }

  const column = queryColumns.value[0]
  updateComponentDataBinding(component.id, 'filterRules', [
    ...(component.dataBinding.filterRules ?? []),
    {
      fieldName: column?.name ?? 'category',
      operator: column?.role === 'measure' ? 'gte' : 'eq',
      value: column?.role === 'measure' ? 0 : '',
    },
  ])
}

const updateVisualFilterRule = (
  component: BigScreenComponent,
  index: number,
  patch: Record<string, unknown>,
): void => {
  if (!component.dataBinding) {
    return
  }

  updateComponentDataBinding(component.id, 'filterRules', (component.dataBinding.filterRules ?? []).map((rule, ruleIndex) =>
    ruleIndex === index ? { ...rule, ...patch } : rule,
  ))
}

const deleteVisualFilterRule = (component: BigScreenComponent, index: number): void => {
  if (!component.dataBinding) {
    return
  }

  updateComponentDataBinding(component.id, 'filterRules', (component.dataBinding.filterRules ?? []).filter((_, ruleIndex) => ruleIndex !== index))
}

const updateVisualTopN = (
  component: BigScreenComponent,
  patch: Record<string, unknown>,
): void => {
  if (!component.dataBinding) {
    return
  }

  updateComponentDataBinding(component.id, 'topN', {
    enabled: false,
    mode: 'all',
    count: 10,
    ...component.dataBinding.topN,
    ...patch,
  })
}

const addVisualReferenceLine = (component: BigScreenComponent): void => {
  if (!component.dataBinding) {
    return
  }

  const measureField = queryMeasureOptions.value[0]?.value ?? 'value'
  updateComponentDataBinding(component.id, 'referenceLines', [
    ...(component.dataBinding.referenceLines ?? []),
    {
      id: createId('reference-line'),
      name: '平均线',
      fieldName: measureField,
      value: 'avg',
      color: '#f59e0b',
      visible: true,
    },
  ])
}

const updateVisualReferenceLine = (
  component: BigScreenComponent,
  index: number,
  patch: Record<string, unknown>,
): void => {
  if (!component.dataBinding) {
    return
  }

  updateComponentDataBinding(component.id, 'referenceLines', (component.dataBinding.referenceLines ?? []).map((line, lineIndex) =>
    lineIndex === index ? { ...line, ...patch } : line,
  ))
}

const deleteVisualReferenceLine = (component: BigScreenComponent, index: number): void => {
  if (!component.dataBinding) {
    return
  }

  updateComponentDataBinding(component.id, 'referenceLines', (component.dataBinding.referenceLines ?? []).filter((_, lineIndex) => lineIndex !== index))
}

const repairChartFieldMappings = (component: BigScreenComponent): void => {
  if (!component.dataBinding) {
    return
  }

  const columns = queryColumns.value
  const firstDimension = columns.find((column) => column.role === 'dimension')?.name ?? columns[0]?.name ?? 'category'
  const firstMeasure = columns.find((column) => column.role === 'measure')?.name ?? columns[0]?.name ?? 'value'
  const nextFields = [...component.dataBinding.fields]
  const nextFieldSlots = { ...(component.dataBinding.fieldSlots ?? {}) }

  getBigScreenChartSlotRequirements(component.type).forEach((requirement) => {
    const existing = nextFieldSlots[requirement.slot]?.[0]
      ?? nextFields.find((field) => field.slot === requirement.slot)?.fieldName
    if (existing) {
      return
    }

    const fieldName = requirement.slot.toLowerCase().includes('measure')
      || ['value', 'x', 'y', 'size', 'max'].includes(requirement.slot)
      ? firstMeasure
      : firstDimension
    nextFieldSlots[requirement.slot] = [fieldName]
    nextFields.push({
      slot: requirement.slot,
      fieldName,
      fieldType: fieldName === firstMeasure ? 'measure' : 'dimension',
      aggregation: fieldName === firstMeasure ? 'sum' : undefined,
    })
  })

  updateComponentPatch(component.id, {
    dataBinding: {
      ...component.dataBinding,
      fields: nextFields,
      fieldSlots: nextFieldSlots,
    },
  })
  message.success('已补齐图表默认字段映射')
}

const setComponentQueryState = (
  componentId: string,
  status: NonNullable<BigScreenDataBindingConfig['lastQueryState']>['status'],
  patch: Partial<NonNullable<BigScreenDataBindingConfig['lastQueryState']>> = {},
): void => {
  updateSnapshot((snapshot) => ({
    ...snapshot,
    components: snapshot.components.map((component) => {
      if (component.id !== componentId || !component.dataBinding) {
        return component
      }

      return {
        ...component,
        dataBinding: {
          ...component.dataBinding,
          lastQueryState: {
            status,
            ...component.dataBinding.lastQueryState,
            ...patch,
          },
        },
        updatedAt: new Date().toISOString(),
      }
    }),
  }))
}

const getVariableContext = (): Record<string, unknown> =>
  Object.fromEntries((activeSnapshot.value?.globalVariables ?? []).map((variable) => [variable.key, variable.value]))

const withTimeout = async <T,>(task: Promise<T>, timeoutMs: number, messageText: string): Promise<T> => {
  let timeoutId: number | undefined
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(messageText)), timeoutMs)
  })

  try {
    return await Promise.race([task, timeout])
  } finally {
    if (timeoutId) {
      window.clearTimeout(timeoutId)
    }
  }
}

const getConfiguredRows = (dataBinding: BigScreenDataBindingConfig): Array<Record<string, unknown>> => {
  const configuredRows = dataBinding.sourceConfig?.mockRows ?? dataBinding.sourceConfig?.rows

  return Array.isArray(configuredRows)
    ? normalizeRawRows(configuredRows)
    : dataBinding.staticRows ?? []
}

const buildMockRowsForSource = (dataBinding: BigScreenDataBindingConfig): Array<Record<string, unknown>> => {
  const rows = getConfiguredRows(dataBinding)

  if (rows.length) {
    return rows
  }

  const sourceNameMap: Record<string, string> = {
    dataset: '数据集',
    mysql: 'MySQL',
    'feishu-sheet': '飞书表格',
    'feishu-bitable': '飞书多维表格',
  }

  return [
    { category: '华东', series: sourceNameMap[dataBinding.sourceType] ?? '模拟返回', value: 12860, compareValue: 9600, target: 15000 },
    { category: '华南', series: sourceNameMap[dataBinding.sourceType] ?? '模拟返回', value: 9420, compareValue: 7600, target: 12000 },
    { category: '西南', series: sourceNameMap[dataBinding.sourceType] ?? '模拟返回', value: 6210, compareValue: 5300, target: 8000 },
  ]
}

const runTransformer = async (data: unknown, dataBinding: BigScreenDataBindingConfig): Promise<unknown> => {
  const transformer = String(dataBinding.sourceConfig?.transformer ?? dataBinding.sourceConfig?.transformerScript ?? '').trim()

  if (!transformer) {
    return data
  }

  if (/\bwindow\b|\bdocument\b|\blocalStorage\b|\bsessionStorage\b/.test(transformer)) {
    throw new Error('Transformer 不允许访问浏览器全局对象')
  }

  const runner = new Function('data', `"use strict"; ${transformer}; return typeof transform === 'function' ? transform(data) : data`)
  const result = await withTimeout(Promise.resolve(runner(data)), Number(dataBinding.sourceConfig?.timeoutMs ?? 5000), 'Transformer 执行超时')

  if (result === undefined) {
    throw new Error('Transformer 返回 undefined')
  }

  return result
}

const runJavaScriptSource = async (dataBinding: BigScreenDataBindingConfig): Promise<unknown> => {
  const script = String(dataBinding.sourceConfig?.script ?? '')

  if (!script.trim()) {
    throw new Error('请填写 JavaScript 数据脚本')
  }

  if (/\bwindow\b|\bdocument\b|\blocalStorage\b|\bsessionStorage\b/.test(script)) {
    throw new Error('JavaScript 数据源不允许访问浏览器全局对象')
  }

  const runner = new Function(
    'rows',
    'sourceConfig',
    'variables',
    `"use strict"; return (async () => { ${script}; if (typeof query === 'function') return await query(sourceConfig, variables); if (typeof transform === 'function') return await transform(rows, sourceConfig, variables); return rows; })()`,
  )
  const result = await withTimeout(
    Promise.resolve(runner(dataBinding.staticRows ?? [], dataBinding.sourceConfig ?? {}, getVariableContext())),
    Number(dataBinding.sourceConfig?.timeoutMs ?? 5000),
    'JavaScript 数据源执行超时',
  )

  if (result === undefined || result === null) {
    throw new Error('JavaScript 数据源返回为空')
  }

  return result
}

const executeComponentQuery = async (component: BigScreenComponent): Promise<Array<Record<string, unknown>>> => {
  const dataBinding = component.dataBinding

  if (!dataBinding) {
    return []
  }

  if (dataBinding.sourceType === 'static') {
    return normalizeRawRows(dataBinding.staticRows ?? [])
  }

  if (dataBinding.sourceType === 'api') {
    const url = dataBinding.sourceId?.trim()

    if (!url) {
      throw new Error('请填写 API URL')
    }

    const method = String(dataBinding.sourceConfig?.method ?? 'GET').toUpperCase()
    const configuredHeaders = dataBinding.sourceConfig?.headers
    const headers = Array.isArray(configuredHeaders)
      ? Object.fromEntries(configuredHeaders
          .filter((item) => item && typeof item === 'object' && (item as Record<string, unknown>).enabled !== false)
          .map((item) => [String((item as Record<string, unknown>).key ?? ''), String((item as Record<string, unknown>).value ?? '')])
          .filter(([key]) => key))
      : configuredHeaders && typeof configuredHeaders === 'object'
        ? configuredHeaders as Record<string, string>
        : undefined
    const response = await window.fetch(url, {
      method,
      headers,
      body: method === 'GET' ? undefined : String(dataBinding.sourceConfig?.body ?? ''),
    })

    if (!response.ok) {
      throw new Error(`API 请求失败：${response.status}`)
    }

    const payload = await response.json() as unknown
    const transformedPayload = await runTransformer(payload, dataBinding)
    return normalizeRawRows(transformedPayload)
  }

  if (dataBinding.sourceType === 'javascript') {
    return normalizeRawRows(await runJavaScriptSource(dataBinding))
  }

  if (dataBinding.sourceType === 'mysql') {
    const sql = String(dataBinding.sourceConfig?.sql ?? '').trim()

    if (sql && !/^select\b/i.test(sql)) {
      throw new Error('MySQL SQL 仅允许查询语句')
    }
  }

  return normalizeRawRows(buildMockRowsForSource(dataBinding))
}

const runComponentQuery = async (component: BigScreenComponent): Promise<void> => {
  if (!component.dataBinding) {
    return
  }

  setComponentQueryState(component.id, 'loading', { startedAt: new Date().toISOString(), errorMessage: undefined })

  try {
    const rows = await executeComponentQuery(component)
    const tableSchema = inferTableSchema(rows)

    updateSnapshot((snapshot) => ({
      ...snapshot,
      components: snapshot.components.map((item) => item.id === component.id && item.dataBinding
        ? {
            ...item,
            dataBinding: {
              ...item.dataBinding,
              staticRows: item.dataBinding.sourceType === 'static' ? rows : item.dataBinding.staticRows,
              lastQueryState: {
                status: 'success',
                startedAt: item.dataBinding.lastQueryState?.startedAt ?? new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                rawDataPreview: rows.slice(0, 20),
                parsedTable: tableSchema,
              },
            },
            updatedAt: new Date().toISOString(),
          }
        : item),
    }))
    message.success('数据查询完成')
  } catch (error) {
    setComponentQueryState(component.id, 'error', {
      finishedAt: new Date().toISOString(),
      errorMessage: error instanceof Error ? error.message : '返回结果无法转换为二维表',
    })
    message.error(error instanceof Error ? error.message : '数据查询失败')
  }
}

const runSelectedComponentQuery = async (): Promise<void> => {
  const component = selectedComponent.value

  if (component) {
    await runComponentQuery(component)
  }
}

const updateStaticRows = (componentId: string, rows: Array<Record<string, unknown>>): void => {
  const tableSchema = inferTableSchema(rows)

  updateSnapshot((snapshot) => ({
    ...snapshot,
    components: snapshot.components.map((component) => component.id === componentId && component.dataBinding
      ? {
          ...component,
          dataBinding: {
            ...component.dataBinding,
            staticRows: rows,
            lastQueryState: {
              status: 'success',
              finishedAt: new Date().toISOString(),
              rawDataPreview: rows.slice(0, 20),
              parsedTable: tableSchema,
            },
          },
          updatedAt: new Date().toISOString(),
        }
      : component),
  }))
}

const renameFieldReferences = (
  dataBinding: BigScreenDataBindingConfig,
  oldFieldName: string,
  nextFieldName: string,
): BigScreenDataBindingConfig => ({
  ...dataBinding,
  fields: dataBinding.fields.map((field) => field.fieldName === oldFieldName ? { ...field, fieldName: nextFieldName } : field),
  fieldSlots: dataBinding.fieldSlots
    ? Object.fromEntries(Object.entries(dataBinding.fieldSlots).map(([slot, fields]) => [
        slot,
        fields.map((field) => field === oldFieldName ? nextFieldName : field),
      ]))
    : dataBinding.fieldSlots,
  sortRules: dataBinding.sortRules?.map((rule) => rule.fieldName === oldFieldName ? { ...rule, fieldName: nextFieldName } : rule),
  filterRules: dataBinding.filterRules?.map((rule) => rule.fieldName === oldFieldName ? { ...rule, fieldName: nextFieldName } : rule),
  topN: dataBinding.topN?.measureField === oldFieldName ? { ...dataBinding.topN, measureField: nextFieldName } : dataBinding.topN,
  referenceLines: dataBinding.referenceLines?.map((line) => line.fieldName === oldFieldName ? { ...line, fieldName: nextFieldName } : line),
  globalFilterBindings: dataBinding.globalFilterBindings?.map((binding) => ({
    ...binding,
    sourceFieldName: binding.sourceFieldName === oldFieldName ? nextFieldName : binding.sourceFieldName,
    targetFieldName: binding.targetFieldName === oldFieldName ? nextFieldName : binding.targetFieldName,
  })),
})

const updateStaticCell = (rowIndex: number, fieldName: string, value: string): void => {
  const component = selectedComponent.value

  if (!component?.dataBinding) {
    return
  }

  const rows = [...(component.dataBinding.staticRows ?? [])]
  rows[rowIndex] = {
    ...(rows[rowIndex] ?? {}),
    [fieldName]: Number.isFinite(Number(value)) && value.trim() !== '' ? Number(value) : value,
  }
  updateStaticRows(component.id, rows)
}

const renameStaticColumn = (oldFieldName: string, nextFieldName: string): void => {
  const component = selectedComponent.value
  const name = nextFieldName.trim()

  if (!component?.dataBinding) {
    return
  }

  if (!name) {
    message.error('表头不能为空')
    return
  }

  if (queryColumns.value.some((column) => column.name !== oldFieldName && column.name === name)) {
    message.error('字段名已存在，请修改')
    return
  }

  const rows = (component.dataBinding.staticRows ?? []).map((row) => {
    const nextRow = { ...row, [name]: row[oldFieldName] }
    delete nextRow[oldFieldName]
    return nextRow
  })
  const tableSchema = inferTableSchema(rows)

  updateSnapshot((snapshot) => ({
    ...snapshot,
    components: snapshot.components.map((item) => item.id === component.id && item.dataBinding
      ? {
          ...item,
          dataBinding: {
            ...renameFieldReferences(item.dataBinding, oldFieldName, name),
            staticRows: rows,
            lastQueryState: {
              status: 'success',
              finishedAt: new Date().toISOString(),
              rawDataPreview: rows.slice(0, 20),
              parsedTable: tableSchema,
            },
          },
          updatedAt: new Date().toISOString(),
        }
      : item),
  }))
}

const addStaticRow = (): void => {
  const component = selectedComponent.value

  if (!component?.dataBinding) {
    return
  }

  const row = Object.fromEntries(queryColumns.value.map((column) => [column.name, '']))
  updateStaticRows(component.id, [...(component.dataBinding.staticRows ?? []), row])
}

const addStaticColumn = (): void => {
  const component = selectedComponent.value

  if (!component?.dataBinding) {
    return
  }

  const nextName = `field_${queryColumns.value.length + 1}`
  const rows = (component.dataBinding.staticRows?.length ? component.dataBinding.staticRows : [{}])
    .map((row) => ({ ...row, [nextName]: '' }))
  updateStaticRows(component.id, rows)
}

const deleteStaticRow = (rowIndex: number): void => {
  const component = selectedComponent.value

  if (!component?.dataBinding) {
    return
  }

  updateStaticRows(component.id, (component.dataBinding.staticRows ?? []).filter((_, index) => index !== rowIndex))
}

const pasteStaticTable = (): void => {
  const component = selectedComponent.value

  if (!component?.dataBinding || !pasteTableDraft.value.trim()) {
    return
  }

  const columns = queryColumns.value.map((column) => column.name)
  const pastedRows = pasteTableDraft.value.trim().split('\n').map((line) => {
    const cells = line.split('\t')
    return Object.fromEntries(columns.map((column, index) => [column, cells[index] ?? '']))
  })

  updateStaticRows(component.id, [...(component.dataBinding.staticRows ?? []), ...pastedRows])
  pasteTableDraft.value = ''
}

const updateComponentAnimation = (
  componentId: string,
  phase: 'enter' | 'exit',
  key: string,
  value: unknown,
): void => {
  updateSnapshot((snapshot) => ({
    ...snapshot,
    components: snapshot.components.map((component) => component.id === componentId
      ? {
          ...component,
          animations: {
            ...component.animations,
            [phase]: {
              ...component.animations[phase],
              [key]: value,
            },
          },
          updatedAt: new Date().toISOString(),
        }
      : component),
  }))
}

const updateComponentInteractionsJson = (componentId: string, value: string): void => {
  try {
    const interactions = JSON.parse(value) as BigScreenComponent['interactions']
    updateComponentPatch(componentId, { interactions })
  } catch {
    message.error('JSON 格式不正确')
  }
}

const addInteractionEvent = (component: BigScreenComponent): void => {
  const event: BigScreenInteractionEvent = {
    id: createId('interaction'),
    name: '点击响应',
    trigger: 'click',
    enabled: true,
    conditions: [],
    actions: [
      {
        id: createId('action'),
        type: 'switch-page',
        targetId: activeSnapshot.value?.homePageId,
        payload: {},
      },
    ],
  }

  updateComponentPatch(component.id, {
    interactions: [...(component.interactions ?? []), event],
  })
}

const createDefaultInteractionAction = (
  type: BigScreenInteractionActionType,
  component: BigScreenComponent,
): BigScreenInteractionEvent['actions'][number] => {
  const firstPageId = activeSnapshot.value?.pages.find((page) => page.id !== component.pageId)?.id ?? activeSnapshot.value?.homePageId
  const firstChartId = chartTargetOptions.value[0]?.value

  const payloadMap: Record<BigScreenInteractionActionType, Record<string, unknown>> = {
    'open-link': { url: 'https://example.com', target: '_blank' },
    'switch-page': { pageId: firstPageId },
    'set-element-property': { propertyName: 'text', value: '已触发交互' },
    'switch-panel-state': { mode: 'next' },
    'change-carousel-state': { mode: 'next' },
    'gis-drill': { region: '华东' },
    'set-filter': { fieldName: 'category', operator: 'eq', valueSource: 'event', eventKey: 'value' },
    wait: { durationMs: 300 },
    'emit-event': { eventName: 'custom-event' },
    'trigger-3d-model-event': { eventName: 'focus' },
    'set-variable': { key: 'selectedValue', valueSource: 'event', eventKey: 'value' },
    'refresh-data': {},
    'refresh-all-visuals': {},
    'trigger-ue-action': { actionName: 'play' },
  }

  return {
    id: createId('action'),
    type,
    targetId: type === 'switch-page'
      ? firstPageId
      : type === 'set-filter'
        ? firstChartId
        : component.id,
    payload: payloadMap[type] ?? {},
  }
}

const addInteractionAction = (
  component: BigScreenComponent,
  interactionId: string,
  type: BigScreenInteractionActionType,
): void => {
  const interaction = component.interactions.find((item) => item.id === interactionId)

  if (!interaction) {
    return
  }

  updateInteractionPatch(component, interactionId, {
    actions: [...interaction.actions, createDefaultInteractionAction(type, component)],
  })
}

const updateInteractionPatch = (
  component: BigScreenComponent,
  interactionId: string,
  patch: Partial<BigScreenInteractionEvent>,
): void => {
  updateComponentPatch(component.id, {
    interactions: component.interactions.map((interaction) => interaction.id === interactionId
      ? { ...interaction, ...patch }
      : interaction),
  })
}

const updateInteractionActionsJson = (component: BigScreenComponent, interactionId: string, value: string): void => {
  try {
    const actions = JSON.parse(value) as BigScreenInteractionEvent['actions']
    updateInteractionPatch(component, interactionId, { actions })
  } catch {
    message.error('JSON 格式不正确')
  }
}

const updateInteractionConditionsJson = (component: BigScreenComponent, interactionId: string, value: string): void => {
  try {
    const conditions = JSON.parse(value) as BigScreenInteractionEvent['conditions']
    updateInteractionPatch(component, interactionId, { conditions })
  } catch {
    message.error('JSON 格式不正确')
  }
}

const deleteInteractionEvent = (component: BigScreenComponent, interactionId: string): void => {
  updateComponentPatch(component.id, {
    interactions: component.interactions.filter((interaction) => interaction.id !== interactionId),
  })
}

const getPointerDelta = (event: PointerEvent): { dx: number, dy: number } => {
  const state = dragState.value

  if (!state) {
    return { dx: 0, dy: 0 }
  }

  return {
    dx: (event.clientX - state.startX) / zoom.value,
    dy: (event.clientY - state.startY) / zoom.value,
  }
}

const handleComponentPointerDown = (event: PointerEvent, component: BigScreenComponent): void => {
  event.stopPropagation()

  if (sceneEditingComponentId.value && component.id !== sceneEditingComponentId.value) {
    return
  }

  selectComponent(component.id, event)

  if (component.locked) {
    return
  }

  const componentIds = (event.shiftKey || event.metaKey)
    ? [...new Set([...selectedComponentIds.value, component.id])]
    : selectedComponentIds.value.includes(component.id) ? selectedComponentIds.value : [component.id]
  const originalLayouts = Object.fromEntries(
    componentIds
      .map((id) => getComponentById(id))
      .filter((item): item is BigScreenComponent => Boolean(item))
      .map((item) => [item.id, { ...item.layout }]),
  )

  recordHistory()
  dragState.value = {
    mode: 'move',
    startX: event.clientX,
    startY: event.clientY,
    componentIds,
    originalLayouts,
  }
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp)
}

const handleResizePointerDown = (event: PointerEvent, component: BigScreenComponent): void => {
  event.stopPropagation()

  if (component.locked) {
    return
  }

  selectedComponentIds.value = [component.id]
  recordHistory()
  dragState.value = {
    mode: 'resize',
    startX: event.clientX,
    startY: event.clientY,
    componentIds: [component.id],
    originalLayouts: {
      [component.id]: { ...component.layout },
    },
    resizeComponentId: component.id,
  }
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp)
}

const handlePointerMove = (event: PointerEvent): void => {
  const state = dragState.value

  if (!state || !draftSnapshot.value) {
    return
  }

  const { dx, dy } = getPointerDelta(event)

  draftSnapshot.value = {
    ...draftSnapshot.value,
    components: draftSnapshot.value.components.map((component) => {
      const originalLayout = state.originalLayouts[component.id]

      if (!originalLayout) {
        return component
      }

      if (state.mode === 'resize') {
        return {
          ...component,
          layout: {
            ...component.layout,
            width: Math.max(24, Math.round(originalLayout.width + dx)),
            height: Math.max(24, Math.round(originalLayout.height + dy)),
          },
        }
      }

      return {
        ...component,
        layout: {
          ...component.layout,
          x: Math.round(originalLayout.x + dx),
          y: Math.round(originalLayout.y + dy),
        },
      }
    }),
  }
  markDirty()
}

const handlePointerUp = (): void => {
  dragState.value = null
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerUp)
}

const deleteSelectedComponents = (): void => {
  if (!selectedComponentIds.value.length) {
    return
  }

  const ids = new Set(selectedComponentIds.value)

  updateSnapshot((snapshot) => ({
    ...snapshot,
    components: snapshot.components.filter((component) => !ids.has(component.id)),
    pages: snapshot.pages.map((page) => ({
      ...page,
      componentIds: page.componentIds.filter((id) => !ids.has(id)),
    })),
    groups: snapshot.groups
      .map((group) => ({
        ...group,
        componentIds: group.componentIds.filter((id) => !ids.has(id)),
      }))
      .filter((group) => group.componentIds.length > 0),
  }))
  selectedComponentIds.value = []
}

const copySelectedComponents = (): void => {
  copiedComponents.value = JSON.parse(JSON.stringify(selectedComponents.value)) as BigScreenComponent[]
}

const pasteComponents = (): void => {
  if (!copiedComponents.value.length || !activePage.value || !screen.value) {
    return
  }

  const idMap = new Map<string, string>()
  const pastedComponents = copiedComponents.value.map((component, index) => {
    const nextId = createId('cmp')
    idMap.set(component.id, nextId)

    return {
      ...component,
      id: nextId,
      screenId: screen.value!.id,
      pageId: activePage.value!.id,
      parentGroupId: undefined,
      layout: {
        ...component.layout,
        x: component.layout.x + 32 + index * 8,
        y: component.layout.y + 32 + index * 8,
      },
      zIndex: maxZIndex.value + index + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  })

  updateSnapshot((snapshot) => ({
    ...snapshot,
    components: [...snapshot.components, ...pastedComponents],
    pages: snapshot.pages.map((page) => page.id === activePage.value?.id
      ? { ...page, componentIds: [...page.componentIds, ...pastedComponents.map((component) => component.id)] }
      : page),
  }))
  selectedComponentIds.value = pastedComponents.map((component) => component.id)
}

const cutSelectedComponents = (): void => {
  copySelectedComponents()
  deleteSelectedComponents()
}

const selectAllComponents = (): void => {
  selectedComponentIds.value = activePageComponents.value.map((component) => component.id)
}

const groupSelectedComponents = (): void => {
  if (!canGroup.value || !activePage.value || !screen.value) {
    return
  }

  const groupId = createId('group')
  const group: BigScreenGroup = {
    id: groupId,
    screenId: screen.value.id,
    pageId: activePage.value.id,
    name: `组${(activeSnapshot.value?.groups.length ?? 0) + 1}`,
    componentIds: [...selectedComponentIds.value],
    visible: true,
    locked: false,
    zIndex: maxZIndex.value + 1,
  }
  const ids = new Set(selectedComponentIds.value)

  updateSnapshot((snapshot) => ({
    ...snapshot,
    groups: [...snapshot.groups, group],
    components: snapshot.components.map((component) => ids.has(component.id)
      ? { ...component, parentGroupId: groupId }
      : component),
  }))
}

const ungroupSelectedComponents = (): void => {
  if (!canUngroup.value) {
    return
  }

  const groupIds = new Set(selectedComponents.value.map((component) => component.parentGroupId).filter(Boolean) as string[])

  updateSnapshot((snapshot) => ({
    ...snapshot,
    groups: snapshot.groups.filter((group) => !groupIds.has(group.id)),
    components: snapshot.components.map((component) => groupIds.has(component.parentGroupId ?? '')
      ? { ...component, parentGroupId: undefined }
      : component),
  }))
}

const changeSelectedZIndex = (direction: 'up' | 'down' | 'top' | 'bottom'): void => {
  if (!selectedComponentIds.value.length) {
    return
  }

  const ids = new Set(selectedComponentIds.value)

  updateSnapshot((snapshot) => ({
    ...snapshot,
    components: snapshot.components.map((component) => {
      if (!ids.has(component.id)) {
        return component
      }

      if (direction === 'top') {
        return { ...component, zIndex: maxZIndex.value + 1 }
      }

      if (direction === 'bottom') {
        return { ...component, zIndex: 1 }
      }

      return {
        ...component,
        zIndex: Math.max(1, component.zIndex + (direction === 'up' ? 1 : -1)),
      }
    }),
  }))
}

const toggleComponentVisible = (component: BigScreenComponent): void => {
  updateComponentPatch(component.id, { visible: !component.visible })
}

const toggleComponentLocked = (component: BigScreenComponent): void => {
  updateComponentPatch(component.id, { locked: !component.locked })
}

const renameComponent = (component: BigScreenComponent): void => {
  const name = window.prompt('请输入图层名称', component.name)?.trim()

  if (!name) {
    return
  }

  updateComponentPatch(component.id, { name })
}

const handleLayerDragStart = (component: BigScreenComponent): void => {
  layerDragComponentId.value = component.id
}

const handleLayerDrop = (target: BigScreenComponent): void => {
  const sourceId = layerDragComponentId.value

  if (!sourceId || sourceId === target.id) {
    return
  }

  const source = getComponentById(sourceId)

  if (!source) {
    return
  }

  updateSnapshot((snapshot) => ({
    ...snapshot,
    components: snapshot.components.map((component) => {
      if (component.id === source.id) {
        return { ...component, zIndex: target.zIndex }
      }

      if (component.id === target.id) {
        return { ...component, zIndex: source.zIndex }
      }

      return component
    }),
  }))
  layerDragComponentId.value = ''
}

const undo = (): void => {
  const previous = historyPast.value.at(-1)

  if (!previous || !draftSnapshot.value) {
    return
  }

  historyPast.value = historyPast.value.slice(0, -1)
  historyFuture.value = [JSON.parse(JSON.stringify(draftSnapshot.value)) as BigScreenSnapshot, ...historyFuture.value]
  draftSnapshot.value = previous
  selectedComponentIds.value = []
  markDirty()
}

const redo = (): void => {
  const next = historyFuture.value[0]

  if (!next || !draftSnapshot.value) {
    return
  }

  historyFuture.value = historyFuture.value.slice(1)
  historyPast.value = [...historyPast.value, JSON.parse(JSON.stringify(draftSnapshot.value)) as BigScreenSnapshot]
  draftSnapshot.value = next
  selectedComponentIds.value = []
  markDirty()
}

const applyLayoutResult = (
  mode: 'page' | 'selection' | 'mobile',
  selectedIds: string[] = [],
): void => {
  if (!activeSnapshot.value || !activePage.value) {
    return
  }

  const result = applyBigScreenAutoLayout(activeSnapshot.value, {
    pageId: activePage.value.id,
    mode,
    selectedComponentIds: selectedIds,
  })

  replaceSnapshot(result.snapshot)
  lastLayoutResult.value = result
  selectedComponentIds.value = selectedIds.length ? selectedIds : result.movedComponentIds
  const skippedText = result.skippedComponentIds.length ? `，跳过 ${result.skippedComponentIds.length} 个锁定组件` : ''
  message.success(`已优化 ${result.movedComponentIds.length} 个组件${skippedText}`)
}

const optimizeCurrentPageLayout = (): void => {
  applyLayoutResult('page')
}

const optimizeSelectedLayout = (): void => {
  if (!selectedComponentIds.value.length) {
    message.warning('请先选择要优化的组件')
    return
  }

  applyLayoutResult('selection', selectedComponentIds.value)
}

const convertCurrentPageToMobileLayout = (): void => {
  applyLayoutResult('mobile')
}

const snapSelectedComponentsToGrid = (): void => {
  if (!activeSnapshot.value || !activePage.value || !selectedComponentIds.value.length) {
    message.warning('请先选择要吸附的组件')
    return
  }

  const result = snapBigScreenComponentsToGrid(activeSnapshot.value, activePage.value.id, selectedComponentIds.value, 8)
  replaceSnapshot(result.snapshot)
  lastLayoutResult.value = result
  message.success(`已吸附 ${result.movedComponentIds.length} 个组件到网格`)
}

const alignSelectedComponents = (direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'): void => {
  if (selectedComponents.value.length < 2) {
    message.warning('请至少选择两个组件')
    return
  }

  const components = selectedComponents.value.filter((component) => !component.locked)
  if (components.length < 2) {
    message.warning('选中的组件已锁定')
    return
  }

  const minX = Math.min(...components.map((component) => component.layout.x))
  const maxX = Math.max(...components.map((component) => component.layout.x + component.layout.width))
  const minY = Math.min(...components.map((component) => component.layout.y))
  const maxY = Math.max(...components.map((component) => component.layout.y + component.layout.height))
  const ids = new Set(components.map((component) => component.id))

  updateSnapshot((snapshot) => ({
    ...snapshot,
    components: snapshot.components.map((component) => {
      if (!ids.has(component.id)) {
        return component
      }

      const patch: Partial<BigScreenComponentLayout> = {}
      if (direction === 'left') {
        patch.x = minX
      } else if (direction === 'center') {
        patch.x = Math.round((minX + maxX - component.layout.width) / 2)
      } else if (direction === 'right') {
        patch.x = maxX - component.layout.width
      } else if (direction === 'top') {
        patch.y = minY
      } else if (direction === 'middle') {
        patch.y = Math.round((minY + maxY - component.layout.height) / 2)
      } else {
        patch.y = maxY - component.layout.height
      }

      return {
        ...component,
        layout: { ...component.layout, ...patch },
        updatedAt: new Date().toISOString(),
      }
    }),
  }))
}

const distributeSelectedComponents = (direction: 'horizontal' | 'vertical'): void => {
  const components = selectedComponents.value
    .filter((component) => !component.locked)
    .sort((left, right) => direction === 'horizontal' ? left.layout.x - right.layout.x : left.layout.y - right.layout.y)

  if (components.length < 3) {
    message.warning('请至少选择三个未锁定组件')
    return
  }

  const ids = new Set(components.map((component) => component.id))
  const first = components[0]!
  const last = components[components.length - 1]!
  const totalSize = components.reduce((sum, component) => sum + (direction === 'horizontal' ? component.layout.width : component.layout.height), 0)
  const span = direction === 'horizontal'
    ? last.layout.x + last.layout.width - first.layout.x
    : last.layout.y + last.layout.height - first.layout.y
  const gap = Math.max(0, (span - totalSize) / (components.length - 1))
  let cursor = direction === 'horizontal' ? first.layout.x : first.layout.y
  const positions = new Map<string, number>()

  components.forEach((component) => {
    positions.set(component.id, Math.round(cursor))
    cursor += (direction === 'horizontal' ? component.layout.width : component.layout.height) + gap
  })

  updateSnapshot((snapshot) => ({
    ...snapshot,
    components: snapshot.components.map((component) => {
      if (!ids.has(component.id)) {
        return component
      }

      return {
        ...component,
        layout: {
          ...component.layout,
          [direction === 'horizontal' ? 'x' : 'y']: positions.get(component.id) ?? component.layout[direction === 'horizontal' ? 'x' : 'y'],
        },
        updatedAt: new Date().toISOString(),
      }
    }),
  }))
}

const handleDeepSelect = (event: MouseEvent): void => {
  const page = activePage.value
  const canvas = event.currentTarget as HTMLElement

  if (!page) {
    return
  }

  const rect = canvas.getBoundingClientRect()
  const x = (event.clientX - rect.left) / zoom.value
  const y = (event.clientY - rect.top) / zoom.value
  const candidates = activePageComponents.value
    .filter((component) =>
      x >= component.layout.x &&
      x <= component.layout.x + component.layout.width &&
      y >= component.layout.y &&
      y <= component.layout.y + component.layout.height,
    )
    .sort((left, right) => right.zIndex - left.zIndex)

  if (!candidates.length) {
    return
  }

  const currentIndex = candidates.findIndex((component) => selectedComponentIds.value.includes(component.id))
  const nextComponent = candidates[(currentIndex + 1) % candidates.length]

  if (nextComponent) {
    selectedComponentIds.value = [nextComponent.id]
  }
}

const loadScreen = async (): Promise<void> => {
  loading.value = true

  try {
    const result = await bigScreenService.getBigScreen(screenId.value)
    screen.value = result
    draftSnapshot.value = result.draftSnapshot
    nameDraft.value = result.name
    descriptionDraft.value = result.description ?? ''
    deviceModeDraft.value = result.deviceMode
    homePageIdDraft.value = result.homePageId
    activePageId.value = result.homePageId
    selectedComponentIds.value = []
    sceneEditingComponentId.value = ''
    selectedSceneLayerId.value = ''
    historyPast.value = []
    historyFuture.value = []
    dirtyState.value = 'clean'
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载数字大屏失败')
    router.push('/analysis-center/big-screens')
  } finally {
    loading.value = false
  }
}

const loadVersions = async (): Promise<void> => {
  versions.value = await bigScreenService.listBigScreenVersions(screenId.value)
}

const loadPublishVersions = async (): Promise<void> => {
  publishVersions.value = await bigScreenService.listBigScreenVersions(screenId.value)
}

const handleBack = (): void => {
  if ((dirtyState.value === 'dirty' || dirtyState.value === 'save_failed') && !window.confirm('当前有未保存修改，确认离开并丢弃修改？')) {
    return
  }

  if (dirtyState.value === 'saving') {
    message.warning('正在保存，请稍后')
    return
  }

  router.push('/analysis-center/big-screens')
}

const handleSave = async (): Promise<void> => {
  if (!activeSnapshot.value) {
    return
  }

  dirtyState.value = 'saving'

  try {
    const result = await bigScreenService.saveBigScreen(screenId.value, {
      name: nameDraft.value,
      description: descriptionDraft.value,
      deviceMode: deviceModeDraft.value,
      homePageId: homePageIdDraft.value,
      draftSnapshot: activeSnapshot.value,
    })
    screen.value = result
    draftSnapshot.value = result.draftSnapshot
    dirtyState.value = 'saved'
    message.success('保存成功')
    setTimeout(() => {
      if (dirtyState.value === 'saved') {
        dirtyState.value = 'clean'
      }
    }, 800)
  } catch (error) {
    dirtyState.value = 'save_failed'
    message.error(error instanceof Error ? error.message : '保存失败')
  }
}

const handlePreview = async (mode: 'current' | 'home'): Promise<void> => {
  if (!activeSnapshot.value) {
    return
  }

  previewMenuVisible.value = false
  const startPageId = mode === 'home' ? homePageIdDraft.value : activePageId.value

  try {
    const session = await bigScreenService.createBigScreenPreview(screenId.value, {
      startPageId,
      snapshot: activeSnapshot.value,
      sourceType: 'draft',
    })
    router.push(`/big-screen-previews/${session.id}`)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '生成预览失败')
  }
}

const openPublishModal = async (versionId?: string): Promise<void> => {
  if (dirtyState.value === 'dirty' || dirtyState.value === 'save_failed') {
    message.warning('发布前请先保存当前修改')
    return
  }

  publishResult.value = ''
  publishCheckResult.value = null
  publishSecretKey.value = screen.value?.publishConfig?.tokenSecretKey ?? ''
  publishViewUrl.value = screen.value?.publishConfig?.viewUrl ?? ''
  sharingTokenUrl.value = ''
  publishDraft.value = {
    publishType: versionId ? 'version' : 'latest',
    versionId,
    accessMode: screen.value?.publishConfig?.accessMode ?? 'public',
    tokenExpireSeconds: screen.value?.publishConfig?.tokenExpireSeconds ?? 8400,
  }
  await loadPublishVersions()
  await runPublishPreflightCheck()
  publishModalVisible.value = true
}

const getPublishCheckSnapshot = (): BigScreenSnapshot | null => {
  if (publishDraft.value.publishType === 'version' && publishDraft.value.versionId) {
    return publishVersions.value.find((version) => version.id === publishDraft.value.versionId)?.snapshot ?? null
  }

  return activeSnapshot.value
}

const runPublishPreflightCheck = async (): Promise<void> => {
  const snapshot = getPublishCheckSnapshot()

  if (!snapshot) {
    return
  }

  publishCheckLoading.value = true

  try {
    const result = await bigScreenService.runBigScreenDevToolsCheck(screenId.value, snapshot)
    publishCheckResult.value = result
    devToolsResult.value = result
  } catch (error) {
    message.error(error instanceof Error ? error.message : '发布前检查失败')
  } finally {
    publishCheckLoading.value = false
  }
}

const handlePublishTypeChange = async (value: string): Promise<void> => {
  if (value === 'latest') {
    publishDraft.value.publishType = 'latest'
    publishDraft.value.versionId = undefined
    await runPublishPreflightCheck()
    return
  }

  publishDraft.value.publishType = 'version'
  publishDraft.value.versionId = value
  await runPublishPreflightCheck()
}

const handlePublish = async (): Promise<void> => {
  if (publishBlockingIssues.value.length) {
    devToolsVisible.value = true
    message.error(`发布前需先处理 ${publishBlockingIssues.value.length} 个阻断问题`)
    return
  }

  const confirmText = publishWarningIssues.value.length
    ? `检测到 ${publishWarningIssues.value.length} 个建议项，确认继续发布？`
    : '确认发布该数字大屏？发布后线上链接会展示所选版本内容。'

  if (!window.confirm(confirmText)) {
    return
  }

  try {
    const result = await bigScreenService.publishBigScreen(screenId.value, publishDraft.value)
    publishSecretKey.value = result.secretKey ?? publishSecretKey.value
    publishViewUrl.value = result.viewUrl
    sharingTokenUrl.value = ''
    publishResult.value = result.secretKey
      ? `发布成功。访问地址：${result.viewUrl}，Token SecretKey：${result.secretKey}`
      : `发布成功。访问地址：${result.viewUrl}`
    message.success('发布成功')
    await loadScreen()
    await loadVersions()
    await loadPublishVersions()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '发布失败')
  }
}

const appendAccessToken = (url: string, token: string): string =>
  `${url}${url.includes('?') ? '&' : '?'}accessToken=${encodeURIComponent(token)}`

const handleCreateSharingToken = async (): Promise<void> => {
  if (!publishSecretKey.value) {
    message.warning('当前发布配置还没有 SecretKey')
    return
  }

  try {
    const result = await bigScreenService.createSharingToken(publishSecretKey.value, Number(publishDraft.value.tokenExpireSeconds ?? 8400))
    sharingTokenUrl.value = appendAccessToken(publishViewUrl.value, result.data)
    message.success('Token 访问链接已生成')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '生成 Token 失败')
  }
}

const handleOffline = async (): Promise<void> => {
  if (!window.confirm('确认下线该大屏？下线后，访问链接将无法继续查看当前大屏内容。')) {
    return
  }

  try {
    await bigScreenService.offlineBigScreen(screenId.value)
    message.success('数字大屏已下线')
    await loadScreen()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '下线失败')
  }
}

const openShareTemplateModal = (): void => {
  shareTemplateDraft.value = {
    name: `${nameDraft.value || screen.value?.name || '数字大屏'}模板`,
    description: descriptionDraft.value,
    scope: 'project',
    isDesensitized: true,
    coverUrl: '',
    snapshot: activeSnapshot.value ?? undefined,
  }
  shareTemplateVisible.value = true
}

const handleShareTemplate = async (): Promise<void> => {
  if (!activeSnapshot.value) {
    return
  }

  try {
    await bigScreenService.createBigScreenTemplate(screenId.value, {
      ...shareTemplateDraft.value,
      snapshot: activeSnapshot.value,
    })
    message.success('已共享为模板')
    shareTemplateVisible.value = false
  } catch (error) {
    message.error(error instanceof Error ? error.message : '共享模板失败')
  }
}

const runDevToolsCheck = async (): Promise<void> => {
  if (!activeSnapshot.value) {
    return
  }

  try {
    devToolsResult.value = await bigScreenService.runBigScreenDevToolsCheck(screenId.value, activeSnapshot.value)
  } catch (error) {
    message.error(error instanceof Error ? error.message : 'DevTools 检测失败')
  }
}

const openDevTools = async (): Promise<void> => {
  await runDevToolsCheck()
  devToolsVisible.value = true
}

const locateDevIssue = (issue: BigScreenDevIssue): void => {
  if (issue.pageId) {
    activePageId.value = issue.pageId
  }

  if (issue.componentId) {
    selectedComponentIds.value = [issue.componentId]
  }
}

const handleDevIssueAction = async (
  issue: BigScreenDevIssue,
  action: BigScreenDevIssue['quickActions'][number],
): Promise<void> => {
  locateDevIssue(issue)

  if (action.actionType === 'open-data-panel') {
    dataPanelTab.value = 'fields'
    message.info('已定位到组件，请在画布下方数据配置区查看')
    return
  }

  if (action.actionType === 'retry-query' && issue.componentId) {
    const component = activeSnapshot.value?.components.find((item) => item.id === issue.componentId)
    if (component) {
      await runComponentQuery(component)
      await runDevToolsCheck()
    }
    return
  }

  if (action.actionType === 'auto-align') {
    optimizeCurrentPageLayout()
    await runDevToolsCheck()
    return
  }

  if (action.actionType === 'repair-chart-fields' && issue.componentId) {
    const component = activeSnapshot.value?.components.find((item) => item.id === issue.componentId)
    if (component) {
      repairChartFieldMappings(component)
      await runDevToolsCheck()
    }
    return
  }

  if (action.actionType === 'increase-refresh-interval' && issue.componentId) {
    updateComponentDataBinding(issue.componentId, 'refreshIntervalSeconds', Number(action.payload?.seconds ?? 5))
    await runDevToolsCheck()
    return
  }

  if (action.actionType === 'unify-font' && issue.pageId) {
    updateSnapshot((snapshot) => ({
      ...snapshot,
      components: snapshot.components.map((component) => component.pageId === issue.pageId
        ? { ...component, style: { ...component.style, fontFamily: 'SourceHanSansCN' }, updatedAt: new Date().toISOString() }
        : component),
    }))
    await runDevToolsCheck()
    return
  }

  if (action.actionType === 'save-screen') {
    await handleSave()
    await runDevToolsCheck()
    return
  }

  if (action.actionType === 'ignore') {
    devToolsResult.value = {
      ...devToolsResult.value,
      issues: devToolsResult.value.issues.map((item) => item.id === issue.id
        ? { ...item, severity: 'resolved', resolvedAt: new Date().toISOString() }
        : item),
    }
  }
}

const addSmartVMessage = (role: 'assistant' | 'user', text: string): void => {
  smartVMessages.value = [
    ...smartVMessages.value,
    {
      id: createId('smart-v-message'),
      role,
      text,
      createdAt: new Date().toISOString(),
    },
  ]
}

const clearSmartVPollTimer = (): void => {
  if (smartVPollTimer) {
    window.clearInterval(smartVPollTimer)
    smartVPollTimer = undefined
  }
}

const handleSmartVJobFinished = (job: BigScreenSmartVJob): void => {
  if (job.status === 'success') {
    addSmartVMessage('assistant', job.output?.operationSummary ?? job.output?.answer ?? '任务已完成。')
    return
  }

  if (job.status === 'failed') {
    addSmartVMessage('assistant', job.errorMessage ?? '任务执行失败，可以调整输入后重新生成。')
  }
}

const pollSmartVJob = (jobId: string): void => {
  clearSmartVPollTimer()
  smartVPollTimer = window.setInterval(async () => {
    try {
      const job = await bigScreenService.getBigScreenSmartVJob(jobId)
      smartVCurrentJob.value = job

      if (job.status !== 'running' && job.status !== 'pending') {
        clearSmartVPollTimer()
        handleSmartVJobFinished(job)
      }
    } catch (error) {
      clearSmartVPollTimer()
      message.error(error instanceof Error ? error.message : '智能小助手任务轮询失败')
    }
  }, 700)
}

const startSmartVJob = async (
  type: BigScreenSmartVJobType,
  input: Record<string, unknown>,
  promptText: string,
): Promise<void> => {
  if (!activeSnapshot.value) {
    return
  }

  addSmartVMessage('user', promptText)

  try {
    const job = await bigScreenService.createBigScreenSmartVJob(screenId.value, {
      type,
      input,
      snapshot: activeSnapshot.value,
    })
    smartVCurrentJob.value = job
    addSmartVMessage('assistant', `已创建任务「${smartVJobTitle.value}」，我会按步骤生成结果。`)
    pollSmartVJob(job.id)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '创建智能小助手任务失败')
  }
}

const startMobileLayoutConversion = (): Promise<void> =>
  startSmartVJob(
    'mobile-layout-conversion',
    {
      deviceWidth: smartVDeviceWidth.value,
      instruction: smartVInput.value,
    },
    `转换移动端布局，设备宽度 ${smartVDeviceWidth.value}px`,
  )

const startMetricSystemGeneration = (): Promise<void> =>
  startSmartVJob(
    'metric-system-generation',
    {
      screenName: nameDraft.value,
      templatePreset: 'dense-center',
      metricRows: smartVMetricRows.value,
      themeKey: smartVThemeKey.value,
    },
    '根据指标体系生成一个大屏',
  )

const startThemeSwitch = (): Promise<void> =>
  startSmartVJob(
    'theme-switch',
    {
      themeKey: smartVThemeKey.value,
    },
    `切换主题风格为 ${smartVThemeOptions.find((item) => item.value === smartVThemeKey.value)?.label ?? smartVThemeKey.value}`,
  )

const startDocSearch = (question?: string): Promise<void> =>
  startSmartVJob(
    'doc-search',
    {
      question: question ?? smartVInput.value,
    },
    question ?? smartVInput.value,
  )

const handleSmartVSend = async (): Promise<void> => {
  const text = smartVInput.value.trim()

  if (!text) {
    return
  }

  smartVInput.value = ''

  if (text.includes('移动')) {
    await startSmartVJob('mobile-layout-conversion', { deviceWidth: smartVDeviceWidth.value, instruction: text }, text)
    return
  }

  if (text.includes('指标') || text.includes('生成大屏')) {
    await startSmartVJob('metric-system-generation', {
      screenName: nameDraft.value,
      templatePreset: 'dense-center',
      metricRows: smartVMetricRows.value,
      instruction: text,
    }, text)
    return
  }

  if (text.includes('主题') || text.includes('风格')) {
    await startSmartVJob('theme-switch', { themeKey: smartVThemeKey.value, instruction: text }, text)
    return
  }

  await startDocSearch(text)
}

const addSmartVMetricRow = (): void => {
  smartVMetricRows.value = [
    ...smartVMetricRows.value,
    { position: '中间', section: '新板块', metric: '新指标', dimension: '日期', chartType: '柱状图', queryName: '' },
  ]
}

const removeSmartVMetricRow = (index: number): void => {
  smartVMetricRows.value = smartVMetricRows.value.filter((_, rowIndex) => rowIndex !== index)
}

const applySmartVSnapshot = (): void => {
  const snapshot = smartVCurrentJob.value?.output?.snapshot

  if (!snapshot) {
    message.warning('当前任务没有可应用到画布的结果')
    return
  }

  replaceSnapshot(snapshot)
  nameDraft.value = snapshot.name
  deviceModeDraft.value = snapshot.deviceMode
  homePageIdDraft.value = snapshot.homePageId
  activePageId.value = snapshot.homePageId
  selectedComponentIds.value = []
  message.success('智能小助手结果已应用到画布')
}

const cancelSmartVJob = async (): Promise<void> => {
  if (!smartVCurrentJob.value) {
    return
  }

  try {
    smartVCurrentJob.value = await bigScreenService.cancelBigScreenSmartVJob(smartVCurrentJob.value.id)
    clearSmartVPollTimer()
    addSmartVMessage('assistant', '任务已取消。')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '取消任务失败')
  }
}

const rerunSmartVCurrentJob = async (): Promise<void> => {
  const job = smartVCurrentJob.value
  if (!job) {
    return
  }

  await startSmartVJob(job.type, {
    ...job.input,
    regenerateAt: new Date().toISOString(),
  }, `重新生成：${smartVJobTitle.value}`)
}

const continueSmartVAdjustment = async (): Promise<void> => {
  const job = smartVCurrentJob.value
  const instruction = smartVInput.value.trim()

  if (!job || !instruction) {
    message.warning('请输入继续调整的要求')
    return
  }

  smartVInput.value = ''
  await startSmartVJob(job.type, {
    ...job.input,
    instruction,
  }, instruction)
}

const openPublished = (): void => {
  if (!screen.value?.publishConfig?.viewUrl) {
    message.warning('该大屏尚未生成发布链接')
    return
  }

  router.push(screen.value.publishConfig.viewUrl)
}

const openVersionModal = async (): Promise<void> => {
  await loadVersions()
  versionModalVisible.value = true
}

const handleCreateVersion = async (): Promise<void> => {
  try {
    if (dirtyState.value === 'dirty') {
      await handleSave()
    }

    await bigScreenService.createBigScreenVersion(screenId.value, versionNameDraft.value)
    versionNameDraft.value = ''
    message.success('版本已创建')
    await loadVersions()
    await loadScreen()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '创建版本失败')
  }
}

const handlePreviewVersion = async (version: BigScreenVersion): Promise<void> => {
  try {
    const session = await bigScreenService.createBigScreenPreview(version.screenId, {
      startPageId: version.snapshot.homePageId,
      snapshot: version.snapshot,
      sourceType: 'version',
      sourceVersionId: version.id,
    })
    router.push(`/big-screen-previews/${session.id}`)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '生成版本预览失败')
  }
}

const startRenameVersion = (version: BigScreenVersion): void => {
  renameVersionId.value = version.id
  renameVersionValue.value = version.name
}

const handleRenameVersion = async (version: BigScreenVersion): Promise<void> => {
  try {
    await bigScreenService.renameBigScreenVersion(version.screenId, version.id, renameVersionValue.value)
    renameVersionId.value = ''
    renameVersionValue.value = ''
    message.success('版本名称已更新')
    await loadVersions()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '版本改名失败')
  }
}

const handleToggleVersionLock = async (version: BigScreenVersion): Promise<void> => {
  try {
    await bigScreenService.toggleBigScreenVersionLock(version.screenId, version.id)
    await loadVersions()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '版本锁定状态更新失败')
  }
}

const handleRestoreVersion = async (version: BigScreenVersion): Promise<void> => {
  if (!window.confirm('确认回滚到该版本吗？当前未保存的画板内容将被覆盖。')) {
    return
  }

  try {
    const result = await bigScreenService.restoreBigScreenVersion(version.screenId, version.id)
    screen.value = result
    draftSnapshot.value = result.draftSnapshot
    nameDraft.value = result.name
    descriptionDraft.value = result.description ?? ''
    deviceModeDraft.value = result.deviceMode
    homePageIdDraft.value = result.homePageId
    activePageId.value = result.homePageId
    dirtyState.value = 'dirty'
    message.success('已回滚到指定版本，请保存后持久化草稿')
    await loadVersions()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '版本回滚失败')
  }
}

const handleDeleteVersion = async (version: BigScreenVersion): Promise<void> => {
  if (!window.confirm('确认删除该版本？删除后不可恢复。')) {
    return
  }

  try {
    await bigScreenService.deleteBigScreenVersion(version.screenId, version.id)
    message.success('版本已删除')
    await loadVersions()
    await loadScreen()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '版本删除失败')
  }
}

const handleKeydown = (event: KeyboardEvent): void => {
  const target = event.target as HTMLElement | null
  const isEditableTarget = ['INPUT', 'TEXTAREA'].includes(target?.tagName ?? '') || target?.isContentEditable
  const meta = event.metaKey || event.ctrlKey

  if (meta && event.key.toLowerCase() === 's') {
    event.preventDefault()
    handleSave()
    return
  }

  if (isEditableTarget) {
    return
  }

  if (meta && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    if (event.shiftKey) {
      redo()
    } else {
      undo()
    }
    return
  }

  if (meta && event.key.toLowerCase() === 'y') {
    event.preventDefault()
    redo()
    return
  }

  if (meta && event.key.toLowerCase() === 'c') {
    event.preventDefault()
    copySelectedComponents()
    return
  }

  if (meta && event.key.toLowerCase() === 'v') {
    event.preventDefault()
    pasteComponents()
    return
  }

  if (meta && event.key.toLowerCase() === 'x') {
    event.preventDefault()
    cutSelectedComponents()
    return
  }

  if (meta && event.key.toLowerCase() === 'a') {
    event.preventDefault()
    selectAllComponents()
    return
  }

  if (meta && event.key.toLowerCase() === 'g') {
    event.preventDefault()
    if (event.shiftKey) {
      ungroupSelectedComponents()
    } else {
      groupSelectedComponents()
    }
    return
  }

  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault()
    deleteSelectedComponents()
  }
}

onMounted(async () => {
  await loadScreen()
  await loadVersions()
  clockTimer = window.setInterval(() => {
    now.value = dayjs()
  }, 1000)
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  if (clockTimer) {
    window.clearInterval(clockTimer)
  }
  clearSmartVPollTimer()
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerUp)
})
</script>

<template>
  <div class="big-screen-editor-page">
    <header class="editor-topbar">
      <n-space align="center">
        <n-button quaternary @click="handleBack">返回</n-button>
        <div class="title-block">
          <n-input v-model:value="nameDraft" class="title-input" maxlength="50" @update:value="markDirty" />
          <span :class="['dirty-state', dirtyState]">{{ dirtyLabelMap[dirtyState] }}</span>
        </div>
      </n-space>
      <n-space align="center">
        <n-button secondary :loading="dirtyState === 'saving'" :disabled="dirtyState === 'clean'" @click="handleSave">保存</n-button>
        <div class="preview-dropdown">
          <n-button @click="previewMenuVisible = !previewMenuVisible">预览</n-button>
          <div v-if="previewMenuVisible" class="preview-menu">
            <button type="button" @click="handlePreview('current')">从当前页预览</button>
            <button type="button" @click="handlePreview('home')">从首页预览</button>
          </div>
	        </div>
	        <n-button @click="openVersionModal">版本管理</n-button>
	        <n-button @click="openDevTools">
	          <span :class="['devtools-dot', devToolsResult.status]" />
	          DevTools
	        </n-button>
	        <n-button @click="openShareTemplateModal">共享为模板</n-button>
	        <n-button v-if="screen?.status === 'published'" @click="openPublished">查看发布页</n-button>
        <n-button v-if="screen?.status === 'published'" tertiary type="warning" @click="handleOffline">一键下线</n-button>
        <n-button type="primary" @click="openPublishModal()">{{ screen?.status === 'published' ? '重新发布' : '发布' }}</n-button>
      </n-space>
    </header>

    <n-spin :show="loading">
      <main v-if="screen && activeSnapshot" class="editor-shell">
        <aside class="editor-left">
          <section class="left-panel collapsible-panel">
            <details open>
            <summary class="panel-title collapse-summary">
              <span>页面</span>
              <span class="collapse-actions">
                <n-button size="tiny" @click.stop="addPage">新增</n-button>
                <span class="collapse-indicator">⌄</span>
              </span>
            </summary>
            <div class="collapsible-body">
              <button
                v-for="page in activeSnapshot.pages"
                :key="page.id"
                class="page-item"
                :class="{ active: page.id === activePageId }"
                @click="activePageId = page.id"
              >
                <span>{{ page.name }}</span>
                <small>{{ page.width }} x {{ page.height }}</small>
                <n-space size="small">
                  <n-tag v-if="page.id === homePageIdDraft" size="small" type="success">首页</n-tag>
                  <n-button size="tiny" quaternary @click.stop="renamePage(page)">改名</n-button>
                  <n-button size="tiny" quaternary @click.stop="setHomePage(page.id)">首页</n-button>
                  <n-button size="tiny" quaternary type="error" @click.stop="deletePage(page)">删除</n-button>
                </n-space>
              </button>
            </div>
            </details>
          </section>

          <section class="left-panel collapsible-panel">
            <details open>
            <summary class="panel-title collapse-summary">
              <span>{{ sceneEditingComponentId ? '子图层' : '组件' }}</span>
              <span class="collapse-indicator">⌄</span>
            </summary>
            <div class="collapsible-body component-scroll">
              <template v-if="sceneEditingComponentId">
              <div class="scene-edit-hint">
                <strong>{{ selectedSceneComponent?.name }}</strong>
                <span>当前处于 3D 子图层编辑模式</span>
              </div>
              <details class="component-category" open>
                <summary class="category-title collapse-summary">支持图层 <span class="collapse-indicator">⌄</span></summary>
                <div class="component-card-grid">
                  <button v-for="item in supportedSceneLayerTypes" :key="item.type" class="component-card" @click="addThreeDLayer(item.type)">
                    {{ item.name }}
                  </button>
                </div>
              </details>
            </template>
            <template v-else>
              <details v-for="group in componentCategoryGroups" :key="group.category" class="component-category" open>
                <summary class="category-title collapse-summary">{{ group.category }} <span class="collapse-indicator">⌄</span></summary>
                <div class="component-card-grid">
                  <button
                    v-for="item in group.items"
                    :key="item.type"
                    class="component-card"
                    draggable="true"
                    title="双击添加到画布中心，也可以拖入画布"
                    @dblclick="addComponent(item)"
                    @dragstart="handleComponentCardDragStart($event, item)"
                    @dragend="handleComponentCardDragEnd"
                  >
                    {{ item.name }}
                  </button>
                </div>
              </details>
            </template>
            </div>
            </details>
          </section>

          <section class="left-panel collapsible-panel">
            <details open>
            <summary class="panel-title collapse-summary">
              <span>{{ sceneEditingComponentId ? '场景树' : '图层' }}</span>
              <span class="collapse-indicator">⌄</span>
            </summary>
            <div class="collapsible-body layer-list">
              <template v-if="sceneEditingComponentId && selectedSceneComponent">
                <button class="layer-item active">
                  <span>地图容器</span>
                  <small>{{ selectedSceneComponent.type === 'earth3d' ? 'Earth Container' : 'Map Container' }}</small>
                </button>
                <button
                  v-for="layer in selectedSceneLayers"
                  :key="layer.id"
                  class="layer-item child"
                  :class="{ active: selectedSceneLayerId === layer.id, hidden: !layer.visible }"
                  @click="selectedSceneLayerId = layer.id"
                >
                  <span>{{ layer.name }}</span>
                  <n-space size="small" :wrap="false">
                    <n-button size="tiny" quaternary @click.stop="updateThreeDLayerPatch(layer.id, { visible: !layer.visible })">{{ layer.visible ? '显' : '隐' }}</n-button>
                    <n-button size="tiny" quaternary @click.stop="copyThreeDLayer(layer)">复</n-button>
                    <n-button size="tiny" quaternary @click.stop="moveThreeDLayer(layer.id, 'up')">上</n-button>
                    <n-button size="tiny" quaternary @click.stop="moveThreeDLayer(layer.id, 'down')">下</n-button>
                    <n-button size="tiny" quaternary type="error" @click.stop="deleteThreeDLayer(layer)">删</n-button>
                  </n-space>
                </button>
              </template>
              <template v-else>
              <details v-for="node in groupedLayerNodes" :key="node.group.id" class="layer-group" open>
                <summary class="layer-group-title collapse-summary">{{ node.group.name }} <span class="collapse-indicator">⌄</span></summary>
                <div class="layer-group-body">
                  <button
                    v-for="component in node.components"
                    :key="component.id"
                    class="layer-item child"
                    :class="{ active: selectedComponentIds.includes(component.id), hidden: !component.visible }"
                    draggable="true"
                    @dragstart="handleLayerDragStart(component)"
                    @dragover.prevent
                    @drop="handleLayerDrop(component)"
                    @click="selectComponent(component.id, $event)"
                  >
                    <span>{{ component.name }}</span>
                    <n-space size="small" :wrap="false">
                      <n-button size="tiny" quaternary @click.stop="toggleComponentVisible(component)">{{ component.visible ? '显' : '隐' }}</n-button>
                      <n-button size="tiny" quaternary @click.stop="toggleComponentLocked(component)">{{ component.locked ? '锁' : '开' }}</n-button>
                    </n-space>
                  </button>
                </div>
              </details>
              <button
                v-for="component in ungroupedLayerComponents"
                :key="component.id"
                class="layer-item"
                :class="{ active: selectedComponentIds.includes(component.id), hidden: !component.visible }"
                draggable="true"
                @dragstart="handleLayerDragStart(component)"
                @dragover.prevent
                @drop="handleLayerDrop(component)"
                @click="selectComponent(component.id, $event)"
              >
                <span>{{ component.name }}</span>
                <n-space size="small" :wrap="false">
                  <n-button size="tiny" quaternary @click.stop="renameComponent(component)">名</n-button>
                  <n-button size="tiny" quaternary @click.stop="toggleComponentVisible(component)">{{ component.visible ? '显' : '隐' }}</n-button>
                  <n-button size="tiny" quaternary @click.stop="toggleComponentLocked(component)">{{ component.locked ? '锁' : '开' }}</n-button>
                </n-space>
              </button>
              </template>
            </div>
            </details>
          </section>

          <section class="smart-v-entry">
            <button type="button" class="smart-v-launch" @click="smartVVisible = true">
              <strong>智能小助手</strong>
              <span>移动布局 · 指标体系 · 主题 · 文档</span>
            </button>
          </section>
        </aside>

        <section class="canvas-shell">
          <div class="canvas-toolbar">
            <n-space size="small">
              <n-button v-if="sceneEditingComponentId" size="small" type="primary" @click="exitSceneEdit">Page</n-button>
              <n-button size="small" :disabled="!canUndo" @click="undo">撤销</n-button>
              <n-button size="small" :disabled="!canRedo" @click="redo">重做</n-button>
              <n-button size="small" :disabled="!canGroup" @click="groupSelectedComponents">编组</n-button>
              <n-button size="small" :disabled="!canUngroup" @click="ungroupSelectedComponents">解组</n-button>
              <n-button size="small" @click="optimizeCurrentPageLayout">优化当前页</n-button>
              <n-button size="small" :disabled="!selectedComponentIds.length" @click="optimizeSelectedLayout">优化选中</n-button>
              <n-button size="small" @click="convertCurrentPageToMobileLayout">移动端重排</n-button>
              <n-button size="small" :disabled="!selectedComponentIds.length" @click="snapSelectedComponentsToGrid">吸附网格</n-button>
              <n-button size="small" :disabled="!selectedComponentIds.length" @click="changeSelectedZIndex('up')">上移</n-button>
              <n-button size="small" :disabled="!selectedComponentIds.length" @click="changeSelectedZIndex('down')">下移</n-button>
              <n-button size="small" :disabled="!selectedComponentIds.length" @click="deleteSelectedComponents">删除</n-button>
            </n-space>
            <n-space size="small" v-if="selectedComponentIds.length > 1">
              <n-button size="small" @click="alignSelectedComponents('left')">左对齐</n-button>
              <n-button size="small" @click="alignSelectedComponents('center')">水平居中</n-button>
              <n-button size="small" @click="alignSelectedComponents('right')">右对齐</n-button>
              <n-button size="small" @click="alignSelectedComponents('top')">顶对齐</n-button>
              <n-button size="small" @click="alignSelectedComponents('middle')">垂直居中</n-button>
              <n-button size="small" @click="alignSelectedComponents('bottom')">底对齐</n-button>
              <n-button size="small" @click="distributeSelectedComponents('horizontal')">横向分布</n-button>
              <n-button size="small" @click="distributeSelectedComponents('vertical')">纵向分布</n-button>
            </n-space>
            <n-space size="small" align="center">
              <n-button size="small" @click="zoom = Math.max(0.2, Number((zoom - 0.1).toFixed(2)))">-</n-button>
              <span>{{ Math.round(zoom * 100) }}%</span>
              <n-button size="small" @click="zoom = Math.min(1.4, Number((zoom + 0.1).toFixed(2)))">+</n-button>
            </n-space>
          </div>
          <div v-if="lastLayoutResult" class="layout-report-bar">
            <strong>布局报告</strong>
            <span>移动 {{ layoutReportCounts.moved }} 个</span>
            <span>跳过锁定 {{ layoutReportCounts.skipped }} 个</span>
            <span>警告 {{ layoutReportCounts.warnings }} 个</span>
            <span>错误 {{ layoutReportCounts.errors }} 个</span>
            <n-button size="tiny" quaternary @click="lastLayoutResult = null">收起</n-button>
          </div>
          <div class="canvas-stage">
            <div
              v-if="activePage"
              class="interactive-canvas"
              :style="pageCanvasStyle"
              @click.self="clearSelection"
              @dblclick.self="handleDeepSelect"
              @dragover="handleCanvasDragOver"
              @drop="handleCanvasDrop"
            >
              <div
                v-for="component in activePageComponents"
                :key="component.id"
                class="editable-component"
                :class="{
                  selected: selectedComponentIds.includes(component.id),
                  locked: component.locked,
                  hidden: !component.visible,
                  'scene-muted': Boolean(sceneEditingComponentId && component.id !== sceneEditingComponentId),
                }"
                :style="getComponentRenderStyle(component)"
                @pointerdown="handleComponentPointerDown($event, component)"
                @dblclick.stop="handleComponentDoubleClick(component)"
              >
                <template v-if="['title', 'singleText', 'multiText'].includes(component.type)">
                  <textarea
                    v-if="editingTextComponentId === component.id"
                    v-model="editingTextDraft"
                    class="editable-text editable-text-input"
                    :style="getTextRenderStyle(component)"
                    autofocus
                    @blur="commitInlineTextEdit"
                    @pointerdown.stop
                    @dblclick.stop
                    @keydown.stop
                    @keydown.esc.prevent="cancelInlineTextEdit"
                    @keydown.ctrl.enter.prevent="commitInlineTextEdit"
                    @keydown.meta.enter.prevent="commitInlineTextEdit"
                  />
                  <div v-else class="editable-text" :style="getTextRenderStyle(component)">
                    {{ component.style.text ?? component.name }}
                  </div>
                </template>
                <template v-else-if="component.type === 'rectangle' || component.type === 'circle'">
                  <div class="editable-shape" :style="getShapeRenderStyle(component)" />
                </template>
                <template v-else-if="component.type === 'image'">
                  <img
                    v-if="component.style.imageUrl"
                    class="editable-image"
                    :style="getImageRenderStyle(component)"
                    :src="String(component.style.imageUrl)"
                    :alt="component.name"
                  >
                  <div v-else class="editable-media">{{ component.style.placeholderText ?? '图片占位' }}</div>
                </template>
                <template v-else-if="component.type === 'video'">
                  <div class="editable-media" :style="getMediaBoxRenderStyle(component)">
                    {{ component.style.videoUrl ? '普通视频' : '普通视频 URL 未配置' }}
                  </div>
                </template>
                <template v-else-if="component.type === 'videoStream'">
                  <div class="editable-media stream" :style="getMediaBoxRenderStyle(component)">
                    <strong>{{ component.name }}</strong>
                    <span>{{ component.style.streamType === 'flv' ? 'FLV' : 'HLS' }} · {{ getStreamUrl(component) ? '已配置地址' : component.style.errorText }}</span>
                  </div>
                </template>
                <template v-else-if="component.type === 'iframe'">
                  <div class="editable-media" :style="getMediaBoxRenderStyle(component)">网页 · {{ component.style.url }}</div>
                </template>
                <template v-else-if="component.type === 'hotspot'">
                  <div class="editable-hotspot">{{ component.style.actionLabel ?? '点击热区' }}</div>
                </template>
                <template v-else-if="['datetime', 'date', 'time', 'weekday'].includes(component.type)">
                  <div class="editable-text" :style="getTextRenderStyle(component)">
                    {{ getTimeText(component) }}
                  </div>
                </template>
                <template v-else-if="component.type === 'repeater'">
                  <div
                    class="editable-repeater"
                    :style="{ gridTemplateColumns: `repeat(${Number(component.style.itemsPerLine ?? 3)}, minmax(0, 1fr))` }"
                  >
                    <div v-for="(row, index) in getRepeaterRows(component)" :key="index" class="editable-repeater-item">
                      <strong>{{ row.title ?? `数据项${index + 1}` }}</strong>
                      <span>{{ row.value ?? '--' }}</span>
                      <small>{{ row.status ?? '' }}</small>
                    </div>
                  </div>
                </template>
                <template v-else-if="component.type === 'carousel'">
                  <div class="editable-container">
                    <strong>{{ getActivePanel(component)?.title ?? 'Panel' }}</strong>
                    <span>{{ getActivePanel(component)?.description ?? getActivePanel(component)?.name }}</span>
                  </div>
                </template>
                <template v-else-if="component.type === 'tabs'">
                  <div class="editable-tabs">
                    <div class="editable-tabs-header">
                      <span v-for="panel in getPanels(component)" :key="panel.id" :class="{ active: panel.id === getActivePanel(component)?.id }">
                        {{ panel.name }}
                      </span>
                    </div>
                    <div class="editable-tabs-body">{{ getActivePanel(component)?.title ?? '标签页内容' }}</div>
                  </div>
                </template>
                <template v-else-if="['select', 'multiSelect', 'treeSelect', 'treeMultiSelect', 'datePicker'].includes(component.type)">
                  <div class="editable-control" :style="getMediaBoxRenderStyle(component)">
                    <span>{{ component.style.placeholder ?? component.name }}</span>
                    <select v-if="component.type === 'select'" disabled :value="String(component.style.value ?? '')">
                      <option v-for="option in getOptions(component)" :key="option.value" :value="option.value">{{ option.label }}</option>
                    </select>
                    <select v-else-if="component.type === 'multiSelect'" disabled multiple>
                      <option
                        v-for="option in getOptions(component)"
                        :key="option.value"
                        :value="option.value"
                        :selected="Array.isArray(component.style.value) && component.style.value.includes(option.value)"
                      >
                        {{ option.label }}
                      </option>
                    </select>
                    <select v-else-if="component.type === 'treeSelect'" disabled :value="String(component.style.value ?? '')">
                      <option v-for="option in flattenTreeOptions(component)" :key="option.value" :value="option.value">{{ option.label }}</option>
                    </select>
                    <select v-else-if="component.type === 'treeMultiSelect'" disabled multiple>
                      <option
                        v-for="option in flattenTreeOptions(component)"
                        :key="option.value"
                        :value="option.value"
                        :selected="Array.isArray(component.style.value) && component.style.value.includes(option.value)"
                      >
                        {{ option.label }}
                      </option>
                    </select>
                    <input v-else disabled type="date" :value="String(component.style.value ?? '')">
                  </div>
                </template>
                <template v-else-if="isChartComponent(component)">
                  <BigScreenChartRenderer :component="component" :scale="zoom" />
                </template>
                <template v-else-if="isThreeDComponent(component)">
                  <BigScreenThreeDRenderer
                    :component="component"
                    :focused-layer-id="component.id === sceneEditingComponentId ? selectedSceneLayerId : ''"
                    :edit-mode="component.id === sceneEditingComponentId"
                  />
                </template>
                <template v-else>
                  <div class="editable-chart">
                    <span>{{ component.name }}</span>
                    <small>{{ component.type }}</small>
                  </div>
                </template>
                <button
                  v-if="selectedComponentIds.includes(component.id) && !component.locked"
                  class="resize-handle"
                  type="button"
                  @pointerdown="handleResizePointerDown($event, component)"
                />
              </div>
            </div>
          </div>
          <div v-if="selectedComponent?.dataBinding && !isTimeComponent(selectedComponent)" class="data-config-panel">
            <div class="data-query-bar">
              <div>
                <strong>数据配置</strong>
                <span>{{ selectedComponent.name }} · {{ selectedComponent.type }}</span>
              </div>
              <n-space align="center" :wrap="false">
                <n-select
                  :value="selectedComponent.dataBinding.sourceType"
	                  :options="dataSourceOptions"
	                  size="small"
	                  class="data-source-select"
	                  @update:value="(value: string) => updateComponentSourceType(selectedComponent!.id, value as BigScreenDataBindingConfig['sourceType'])"
	                />
                <n-input
                  :value="String(selectedComponent.dataBinding.sourceId ?? '')"
                  size="small"
                  placeholder="数据集 ID / API URL / 表格地址 / 连接标识"
                  class="data-source-input"
                  @update:value="(value: string) => updateComponentDataBinding(selectedComponent!.id, 'sourceId', value)"
                />
                <n-radio-group :value="selectedComponent.dataBinding.updateMode" size="small" @update:value="(value: string) => updateComponentDataBinding(selectedComponent!.id, 'updateMode', value)">
                  <n-radio-button value="once">只请求一次</n-radio-button>
                  <n-radio-button value="auto">自动更新</n-radio-button>
                  <n-radio-button value="manual">不自动请求</n-radio-button>
                </n-radio-group>
                <n-input-number
                  v-if="selectedComponent.dataBinding.updateMode === 'auto'"
                  :value="selectedComponent.dataBinding.refreshIntervalSeconds ?? 60"
                  size="small"
                  :min="5"
                  :max="10000"
                  @update:value="(value: number | null) => updateComponentDataBinding(selectedComponent!.id, 'refreshIntervalSeconds', Number(value ?? 60))"
                />
                <n-button size="small" type="primary" :loading="selectedComponent.dataBinding.lastQueryState?.status === 'loading'" @click="runSelectedComponentQuery">
                  查询 / 获取数据
                </n-button>
              </n-space>
            </div>
            <div class="query-state-row">
              <n-tag :type="selectedComponent.dataBinding.lastQueryState?.status === 'error' ? 'error' : selectedComponent.dataBinding.lastQueryState?.status === 'success' ? 'success' : selectedComponent.dataBinding.lastQueryState?.status === 'loading' ? 'info' : 'default'" size="small">
                {{ selectedComponent.dataBinding.lastQueryState?.status === 'error' ? '查询失败' : selectedComponent.dataBinding.lastQueryState?.status === 'success' ? '查询成功' : selectedComponent.dataBinding.lastQueryState?.status === 'loading' ? '查询中' : '未查询' }}
              </n-tag>
              <span v-if="selectedComponent.dataBinding.lastQueryState?.errorMessage">{{ selectedComponent.dataBinding.lastQueryState.errorMessage }}</span>
	              <span v-else>二维表：{{ queryColumns.length }} 列 / {{ queryRows.length }} 行</span>
	            </div>
	            <div v-if="selectedComponent.dataBinding.sourceType !== 'static'" class="source-config-row">
	              <n-form-item label="数据源参数 JSON">
	                <n-input
	                  :value="JSON.stringify(selectedComponent.dataBinding.sourceConfig ?? getDefaultSourceConfig(selectedComponent.dataBinding.sourceType), null, 2)"
	                  type="textarea"
	                  :autosize="{ minRows: 3, maxRows: 8 }"
	                  @update:value="(value: string) => updateComponentDataBindingJson(selectedComponent!.id, 'sourceConfig', value)"
	                />
	              </n-form-item>
	            </div>
	            <div class="data-tabs">
              <button type="button" :class="{ active: dataPanelTab === 'fields' }" @click="dataPanelTab = 'fields'">字段胶囊</button>
              <button type="button" :class="{ active: dataPanelTab === 'table' }" @click="dataPanelTab = 'table'">查看数据</button>
              <button type="button" :class="{ active: dataPanelTab === 'analysis' }" @click="dataPanelTab = 'analysis'">分析</button>
              <button type="button" :class="{ active: dataPanelTab === 'filters' }" @click="dataPanelTab = 'filters'">筛选联动</button>
            </div>
	            <div v-if="dataPanelTab === 'fields'" class="data-tab-body">
	              <div class="field-capsules">
	                <span v-for="column in queryColumns" :key="column.id" :class="['field-capsule', column.role]">
	                  <span class="field-capsule-main">
	                    <strong>{{ column.displayName }}</strong>
	                    <small>{{ column.dataType }} · {{ column.role === 'measure' ? '指标' : column.role === 'dimension' ? '维度' : '未知' }}</small>
	                  </span>
	                  <span class="field-capsule-actions">
	                    <button type="button" title="绑定到轴/维度" @click="bindFieldToSlot(selectedComponent!, column, 'dimension')">轴</button>
	                    <button type="button" title="绑定到分拆/系列" @click="bindFieldToSlot(selectedComponent!, column, 'series')">分拆</button>
	                    <button type="button" title="绑定到值/指标" @click="bindFieldToSlot(selectedComponent!, column, 'measure')">值</button>
	                    <button type="button" title="加入排序" @click="addSortRuleFromColumn(selectedComponent!, column)">排序</button>
	                    <button type="button" title="加入筛选" @click="addFilterRuleFromColumn(selectedComponent!, column)">筛选</button>
	                    <button v-if="column.role === 'measure'" type="button" title="设为 TopN 指标" @click="setTopNFromColumn(selectedComponent!, column)">TopN</button>
	                    <button v-if="column.role === 'measure'" type="button" title="添加参考线" @click="addReferenceLineFromColumn(selectedComponent!, column)">参考线</button>
	                    <button type="button" title="添加额外字段" @click="addExtraFieldFromColumn(selectedComponent!, column)">额外字段</button>
	                  </span>
	                </span>
	              </div>
              <n-button v-if="isChartComponent(selectedComponent)" size="tiny" @click="repairChartFieldMappings(selectedComponent!)">
                补齐图表默认字段
              </n-button>
              <div class="data-json-grid">
                <n-form-item label="字段映射 JSON">
                  <n-input
                    :value="JSON.stringify(selectedComponent.dataBinding.fields ?? [], null, 2)"
                    type="textarea"
                    @update:value="(value: string) => updateComponentDataBindingJson(selectedComponent!.id, 'fields', value)"
                  />
                </n-form-item>
                <n-form-item label="字段槽位 JSON">
                  <n-input
                    :value="JSON.stringify(selectedComponent.dataBinding.fieldSlots ?? {}, null, 2)"
                    type="textarea"
                    @update:value="(value: string) => updateComponentDataBindingJson(selectedComponent!.id, 'fieldSlots', value)"
                  />
                </n-form-item>
              </div>
            </div>
            <div v-else-if="dataPanelTab === 'table'" class="data-tab-body">
              <div class="static-table-toolbar">
                <n-button size="tiny" @click="addStaticRow">新增行</n-button>
                <n-button size="tiny" @click="addStaticColumn">新增列</n-button>
                <n-input v-model:value="pasteTableDraft" size="small" placeholder="从 Excel 复制后粘贴 TSV 文本" />
                <n-button size="tiny" @click="pasteStaticTable">粘贴追加</n-button>
              </div>
              <div class="static-table-wrap">
                <table class="static-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th v-for="column in queryColumns" :key="column.id">
                        <input :value="column.displayName" @change="(event) => renameStaticColumn(column.name, (event.target as HTMLInputElement).value)" />
                      </th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, rowIndex) in queryRows" :key="row.id">
                      <td>{{ rowIndex + 1 }}</td>
                      <td v-for="column in queryColumns" :key="column.id">
                        <input :value="String(row.values[column.name] ?? '')" @change="(event) => updateStaticCell(rowIndex, column.name, (event.target as HTMLInputElement).value)" />
                      </td>
                      <td><button type="button" @click="deleteStaticRow(rowIndex)">删除</button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div v-else-if="dataPanelTab === 'analysis'" class="data-tab-body">
              <div class="visual-rule-builder">
                <div class="visual-rule-head">
                  <strong>参考线</strong>
                  <n-button size="tiny" @click="addVisualReferenceLine(selectedComponent!)">新增参考线</n-button>
                </div>
                <div v-for="(line, index) in selectedComponent.dataBinding.referenceLines ?? []" :key="line.id" class="reference-rule-row">
                  <n-input :value="line.name" size="small" @update:value="(value: string) => updateVisualReferenceLine(selectedComponent!, index, { name: value })" />
                  <n-select :value="line.fieldName" size="small" :options="queryMeasureOptions" @update:value="(value: string) => updateVisualReferenceLine(selectedComponent!, index, { fieldName: value })" />
                  <n-select :value="typeof line.value === 'number' ? 'custom' : line.value" size="small" :options="[...referenceLineValueOptions, { label: '固定值', value: 'custom' }]" @update:value="(value: string) => updateVisualReferenceLine(selectedComponent!, index, { value: value === 'custom' ? 0 : value })" />
                  <n-input-number v-if="typeof line.value === 'number'" :value="line.value" size="small" @update:value="(value: number | null) => updateVisualReferenceLine(selectedComponent!, index, { value: Number(value ?? 0) })" />
                  <n-color-picker :value="line.color" size="small" @update:value="(value: string) => updateVisualReferenceLine(selectedComponent!, index, { color: value })" />
                  <n-checkbox :checked="line.visible" @update:checked="(value: boolean) => updateVisualReferenceLine(selectedComponent!, index, { visible: value })">显示</n-checkbox>
                  <n-button size="tiny" quaternary type="error" @click="deleteVisualReferenceLine(selectedComponent!, index)">删除</n-button>
                </div>
              </div>
              <div class="data-json-grid">
                <n-form-item label="参考线 JSON">
                  <n-input
                    :value="JSON.stringify(selectedComponent.dataBinding.referenceLines ?? [], null, 2)"
                    type="textarea"
                    @update:value="(value: string) => updateComponentDataBindingJson(selectedComponent!.id, 'referenceLines', value)"
                  />
                </n-form-item>
                <n-form-item label="额外字段 JSON">
                  <n-input
                    :value="JSON.stringify(selectedComponent.dataBinding.extraFields ?? [], null, 2)"
                    type="textarea"
                    @update:value="(value: string) => updateComponentDataBindingJson(selectedComponent!.id, 'extraFields', value)"
                  />
                </n-form-item>
              </div>
            </div>
            <div v-else class="data-tab-body">
              <div class="visual-rule-builder">
                <div class="visual-rule-head">
                  <strong>筛选条件</strong>
                  <n-button size="tiny" @click="addVisualFilterRule(selectedComponent!)">新增筛选</n-button>
                </div>
                <div v-for="(rule, index) in selectedComponent.dataBinding.filterRules ?? []" :key="`${rule.fieldName}-${index}`" class="visual-rule-row">
                  <n-select :value="rule.fieldName" size="small" :options="queryColumnOptions" @update:value="(value: string) => updateVisualFilterRule(selectedComponent!, index, { fieldName: value })" />
                  <n-select :value="rule.operator" size="small" :options="filterOperatorOptions" @update:value="(value: string) => updateVisualFilterRule(selectedComponent!, index, { operator: value })" />
                  <n-input :value="String(rule.value ?? '')" size="small" @update:value="(value: string) => updateVisualFilterRule(selectedComponent!, index, { value })" />
                  <n-button size="tiny" quaternary type="error" @click="deleteVisualFilterRule(selectedComponent!, index)">删除</n-button>
                </div>
                <div class="topn-rule-row">
                  <n-checkbox :checked="Boolean(selectedComponent.dataBinding.topN?.enabled)" @update:checked="(value: boolean) => updateVisualTopN(selectedComponent!, { enabled: value })">启用 TopN</n-checkbox>
                  <n-select :value="selectedComponent.dataBinding.topN?.mode ?? 'all'" size="small" :options="topNModeOptions" @update:value="(value: string) => updateVisualTopN(selectedComponent!, { mode: value })" />
                  <n-select :value="selectedComponent.dataBinding.topN?.measureField ?? queryMeasureOptions[0]?.value" size="small" :options="queryMeasureOptions" @update:value="(value: string) => updateVisualTopN(selectedComponent!, { measureField: value })" />
                  <n-input-number :value="selectedComponent.dataBinding.topN?.count ?? 10" size="small" :min="1" :max="100" @update:value="(value: number | null) => updateVisualTopN(selectedComponent!, { count: Number(value ?? 10) })" />
                </div>
              </div>
              <div class="data-json-grid three">
                <n-form-item label="筛选 JSON">
                  <n-input
                    :value="JSON.stringify(selectedComponent.dataBinding.filterRules ?? [], null, 2)"
                    type="textarea"
                    @update:value="(value: string) => updateComponentDataBindingJson(selectedComponent!.id, 'filterRules', value)"
                  />
                </n-form-item>
                <n-form-item label="TopN JSON">
                  <n-input
                    :value="JSON.stringify(selectedComponent.dataBinding.topN ?? { enabled: false, mode: 'all', count: 10 }, null, 2)"
                    type="textarea"
                    @update:value="(value: string) => updateComponentDataBindingJson(selectedComponent!.id, 'topN', value)"
                  />
                </n-form-item>
                <n-form-item label="图表联动 JSON">
                  <n-input
                    :value="JSON.stringify(selectedComponent.dataBinding.globalFilterBindings ?? [], null, 2)"
                    type="textarea"
                    @update:value="(value: string) => updateComponentDataBindingJson(selectedComponent!.id, 'globalFilterBindings', value)"
                  />
                </n-form-item>
              </div>
            </div>
          </div>
          <div v-else-if="sceneEditingComponentId && selectedSceneLayer?.dataBinding" class="data-config-panel">
            <div class="data-query-bar">
              <div>
                <strong>子图层数据配置</strong>
                <span>{{ selectedSceneLayer.name }} · {{ selectedSceneLayer.type }}</span>
              </div>
              <n-space align="center" :wrap="false">
                <n-select
                  :value="selectedSceneLayer.dataBinding.sourceType"
                  :options="dataSourceOptions"
                  size="small"
                  class="data-source-select"
                  @update:value="(value: string) => updateThreeDLayerSourceType(selectedSceneLayer!, value)"
                />
                <n-input
                  :value="String(selectedSceneLayer.dataBinding.sourceId ?? '')"
                  size="small"
                  placeholder="图层数据源标识"
                  class="data-source-input"
                  @update:value="(value: string) => updateThreeDLayerDataBindingPatch(selectedSceneLayer!, { sourceId: value })"
                />
              </n-space>
            </div>
	            <div class="query-state-row">
	              <n-tag size="small" type="info">二维表</n-tag>
	              <span>{{ sceneLayerColumns.length }} 列 / {{ sceneLayerRows.length }} 行</span>
	            </div>
	            <div v-if="selectedSceneLayer.dataBinding.sourceType !== 'static'" class="source-config-row">
	              <n-form-item label="图层数据源参数 JSON">
	                <n-input
	                  :value="JSON.stringify(selectedSceneLayer.dataBinding.sourceConfig ?? getDefaultSourceConfig(selectedSceneLayer.dataBinding.sourceType), null, 2)"
	                  type="textarea"
	                  :autosize="{ minRows: 3, maxRows: 8 }"
	                  @update:value="(value: string) => updateThreeDLayerDataBindingJson(selectedSceneLayer!, 'sourceConfig', value)"
	                />
	              </n-form-item>
	            </div>
	            <div class="data-tabs">
              <button type="button" :class="{ active: dataPanelTab === 'fields' }" @click="dataPanelTab = 'fields'">字段胶囊</button>
              <button type="button" :class="{ active: dataPanelTab === 'table' }" @click="dataPanelTab = 'table'">查看数据</button>
              <button type="button" :class="{ active: dataPanelTab === 'analysis' }" @click="dataPanelTab = 'analysis'">分析</button>
              <button type="button" :class="{ active: dataPanelTab === 'filters' }" @click="dataPanelTab = 'filters'">筛选联动</button>
            </div>
	            <div v-if="dataPanelTab === 'fields'" class="data-tab-body">
	              <div class="field-capsules">
	                <span v-for="column in sceneLayerColumns" :key="column.id" :class="['field-capsule', column.role]">
	                  <span class="field-capsule-main">
	                    <strong>{{ column.displayName }}</strong>
	                    <small>{{ column.dataType }} · {{ column.role === 'measure' ? '指标' : column.role === 'dimension' ? '维度' : '未知' }}</small>
	                  </span>
	                  <span class="field-capsule-actions">
	                    <button type="button" title="绑定经度" @click="bindSceneLayerFieldToSlot(selectedSceneLayer!, column, 'lng')">经度</button>
	                    <button type="button" title="绑定纬度" @click="bindSceneLayerFieldToSlot(selectedSceneLayer!, column, 'lat')">纬度</button>
	                    <button type="button" title="绑定数值" @click="bindSceneLayerFieldToSlot(selectedSceneLayer!, column, 'value')">值</button>
	                    <button type="button" title="绑定名称" @click="bindSceneLayerFieldToSlot(selectedSceneLayer!, column, 'name')">名称</button>
	                    <button type="button" title="加入排序" @click="addSceneLayerSortRuleFromColumn(selectedSceneLayer!, column)">排序</button>
	                    <button type="button" title="加入筛选" @click="addSceneLayerFilterRuleFromColumn(selectedSceneLayer!, column)">筛选</button>
	                    <button v-if="column.role === 'measure'" type="button" title="设为 TopN 指标" @click="setSceneLayerTopNFromColumn(selectedSceneLayer!, column)">TopN</button>
	                  </span>
	                </span>
	              </div>
              <n-form-item label="字段槽位 JSON">
                <n-input
                  :value="JSON.stringify(selectedSceneLayer.dataBinding.fieldSlots ?? {}, null, 2)"
                  type="textarea"
                  @update:value="(value: string) => updateThreeDLayerDataBindingJson(selectedSceneLayer!, 'fieldSlots', value)"
                />
              </n-form-item>
            </div>
            <div v-else-if="dataPanelTab === 'table'" class="data-tab-body">
              <div class="static-table-wrap">
                <table class="static-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th v-for="column in sceneLayerColumns" :key="column.id">{{ column.displayName }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, rowIndex) in sceneLayerRows" :key="row.id">
                      <td>{{ rowIndex + 1 }}</td>
                      <td v-for="column in sceneLayerColumns" :key="column.id">{{ row.values[column.name] }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div v-else class="data-tab-body">
              <div class="data-json-grid three">
                <n-form-item label="排序 JSON">
                  <n-input
                    :value="JSON.stringify(selectedSceneLayer.dataBinding.sortRules ?? [], null, 2)"
                    type="textarea"
                    @update:value="(value: string) => updateThreeDLayerDataBindingJson(selectedSceneLayer!, 'sortRules', value)"
                  />
                </n-form-item>
                <n-form-item label="筛选 JSON">
                  <n-input
                    :value="JSON.stringify(selectedSceneLayer.dataBinding.filterRules ?? [], null, 2)"
                    type="textarea"
                    @update:value="(value: string) => updateThreeDLayerDataBindingJson(selectedSceneLayer!, 'filterRules', value)"
                  />
                </n-form-item>
                <n-form-item label="TopN JSON">
                  <n-input
                    :value="JSON.stringify(selectedSceneLayer.dataBinding.topN ?? { enabled: false, mode: 'all', count: 10 }, null, 2)"
                    type="textarea"
                    @update:value="(value: string) => updateThreeDLayerDataBindingJson(selectedSceneLayer!, 'topN', value)"
                  />
                </n-form-item>
              </div>
            </div>
          </div>
        </section>

        <aside class="editor-right">
          <template v-if="selectedComponent">
            <section class="right-config-panel">
            <div class="panel-title">
              <span>组件样式</span>
            </div>
            <n-form label-placement="top">
              <details class="config-section" open>
                <summary class="config-section-title collapse-summary">
                  <span>基础布局</span>
                  <span class="collapse-indicator">⌄</span>
                </summary>
              <n-form-item label="图层名称">
                <n-input :value="selectedComponent.name" @update:value="(value: string) => updateComponentPatch(selectedComponent!.id, { name: value })" />
              </n-form-item>
              <div class="form-grid">
                <n-form-item label="X">
                  <n-input-number :value="selectedComponent.layout.x" @update:value="(value: number | null) => updateComponentLayout(selectedComponent!.id, { x: Number(value ?? 0) })" />
                </n-form-item>
                <n-form-item label="Y">
                  <n-input-number :value="selectedComponent.layout.y" @update:value="(value: number | null) => updateComponentLayout(selectedComponent!.id, { y: Number(value ?? 0) })" />
                </n-form-item>
                <n-form-item label="W">
                  <n-input-number :value="selectedComponent.layout.width" :min="1" @update:value="(value: number | null) => updateComponentLayout(selectedComponent!.id, { width: Number(value ?? 1) })" />
                </n-form-item>
                <n-form-item label="H">
                  <n-input-number :value="selectedComponent.layout.height" :min="1" @update:value="(value: number | null) => updateComponentLayout(selectedComponent!.id, { height: Number(value ?? 1) })" />
                </n-form-item>
              </div>
              <n-form-item label="不透明度">
                <n-slider :value="selectedComponent.layout.opacity" :min="0" :max="100" @update:value="(value: number) => updateComponentLayout(selectedComponent!.id, { opacity: value })" />
              </n-form-item>
              <n-form-item label="标记">
                <n-input :value="selectedComponent.marker" placeholder="用于搜索、交互和识别" @update:value="(value: string) => updateComponentPatch(selectedComponent!.id, { marker: value })" />
              </n-form-item>
              </details>
              <details v-if="selectedComponentConfigSchema" class="config-section" open>
                <summary class="config-section-title collapse-summary">
                  <span>组件配置</span>
                  <span class="collapse-indicator">⌄</span>
                </summary>
              <template v-if="selectedComponentConfigSchema">
                <div class="schema-config">
                  <div class="schema-config-head">
                    <strong>{{ selectedComponentConfigSchema.title }}</strong>
                    <span>按组件类型生成常用配置项，高级项仍保留 JSON 编辑</span>
                  </div>
                  <template v-for="section in selectedComponentConfigSchema.sections" :key="section.title">
                    <div class="subsection-title">{{ section.title }}</div>
                    <template v-for="field in section.fields" :key="`${section.title}-${field.key}`">
                      <n-form-item :label="field.label">
                        <n-input
                          v-if="field.control === 'text'"
                          :value="String(getConfigFieldValue(selectedComponent!, field) ?? '')"
                          :placeholder="field.placeholder"
                          @update:value="(value: string) => updateConfigFieldValue(selectedComponent!, field, value)"
                        />
                        <n-input
                          v-else-if="field.control === 'textarea'"
                          :value="String(getConfigFieldValue(selectedComponent!, field) ?? '')"
                          type="textarea"
                          :placeholder="field.placeholder"
                          @update:value="(value: string) => updateConfigFieldValue(selectedComponent!, field, value)"
                        />
                        <n-input-number
                          v-else-if="field.control === 'number'"
                          :value="Number(getConfigFieldValue(selectedComponent!, field) ?? field.defaultValue ?? 0)"
                          :min="field.min"
                          :max="field.max"
                          :step="field.step ?? 1"
                          @update:value="(value: number | null) => updateConfigFieldValue(selectedComponent!, field, Number(value ?? field.defaultValue ?? 0))"
                        />
                        <n-slider
                          v-else-if="field.control === 'slider'"
                          :value="Number(getConfigFieldValue(selectedComponent!, field) ?? field.defaultValue ?? 0)"
                          :min="field.min ?? 0"
                          :max="field.max ?? 100"
                          :step="field.step ?? 1"
                          @update:value="(value: number) => updateConfigFieldValue(selectedComponent!, field, value)"
                        />
                        <n-color-picker
                          v-else-if="field.control === 'color'"
                          :value="String(getConfigFieldValue(selectedComponent!, field) ?? field.defaultValue ?? '#38bdf8')"
                          @update:value="(value: string) => updateConfigFieldValue(selectedComponent!, field, value)"
                        />
                        <n-checkbox
                          v-else-if="field.control === 'boolean'"
                          :checked="Boolean(getConfigFieldValue(selectedComponent!, field) ?? field.defaultValue)"
                          @update:checked="(value: boolean) => updateConfigFieldValue(selectedComponent!, field, value)"
                        >
                          开启
                        </n-checkbox>
                        <n-select
                          v-else-if="field.control === 'select'"
                          :value="getConfigFieldValue(selectedComponent!, field) as string | number | boolean | null"
                          :options="field.options ?? []"
                          @update:value="(value: string | number | boolean) => updateConfigFieldValue(selectedComponent!, field, value)"
                        />
                        <n-input
                          v-else
                          :value="JSON.stringify(getConfigFieldValue(selectedComponent!, field) ?? field.defaultValue ?? {}, null, 2)"
                          type="textarea"
                          :autosize="{ minRows: field.advanced ? 5 : 3, maxRows: field.advanced ? 12 : 8 }"
                          @update:value="(value: string) => updateConfigFieldJson(selectedComponent!, field, value)"
                        />
                      </n-form-item>
                    </template>
                  </template>
                </div>
              </template>
              </details>
              <details class="config-section">
                <summary class="config-section-title collapse-summary">
                  <span>基础开关</span>
                  <span class="collapse-indicator">⌄</span>
                </summary>
              <n-form-item label="基础开关">
                <n-space vertical>
                  <n-checkbox :checked="selectedComponent.layout.lockAspectRatio" @update:checked="(value: boolean) => updateComponentLayout(selectedComponent!.id, { lockAspectRatio: value })">
                    锁定宽高比例
                  </n-checkbox>
                  <n-checkbox :checked="selectedComponent.layout.overflowHidden" @update:checked="(value: boolean) => updateComponentLayout(selectedComponent!.id, { overflowHidden: value })">
                    超出区块部分不显示
                  </n-checkbox>
                  <n-checkbox :checked="selectedComponent.locked" @update:checked="() => toggleComponentLocked(selectedComponent!)">
                    锁定组件
                  </n-checkbox>
                </n-space>
              </n-form-item>
              </details>
              <details class="config-section" open>
                <summary class="config-section-title collapse-summary">
                  <span>类型样式</span>
                  <span class="collapse-indicator">⌄</span>
                </summary>
              <n-form-item v-if="['title', 'singleText', 'multiText'].includes(selectedComponent.type)" label="文本内容">
                <n-input
                  :value="String(selectedComponent.style.text ?? '')"
                  type="textarea"
                  @update:value="(value: string) => updateComponentStyle(selectedComponent!.id, 'text', value)"
                />
              </n-form-item>
              <n-form-item v-if="['title', 'singleText', 'multiText'].includes(selectedComponent.type)" label="文字颜色">
                <n-color-picker :value="String(selectedComponent.style.color ?? '#f8fafc')" @update:value="(value: string) => updateComponentStyle(selectedComponent!.id, 'color', value)" />
              </n-form-item>
              <n-form-item v-if="selectedComponent.type === 'rectangle' || selectedComponent.type === 'circle'" label="填充颜色">
                <n-color-picker :value="String(selectedComponent.style.backgroundColor ?? '#0f2f51')" @update:value="(value: string) => updateComponentStyle(selectedComponent!.id, 'backgroundColor', value)" />
              </n-form-item>
              <template v-if="selectedComponent.type === 'rectangle' || selectedComponent.type === 'circle'">
                <n-form-item label="边框颜色">
                  <n-color-picker :value="String(selectedComponent.style.borderColor ?? '#38bdf8')" @update:value="(value: string) => updateComponentStyle(selectedComponent!.id, 'borderColor', value)" />
                </n-form-item>
                <div class="form-grid">
                  <n-form-item label="边框宽度">
                    <n-input-number :value="Number(selectedComponent.style.borderWidth ?? 1)" :min="0" @update:value="(value: number | null) => updateComponentStyle(selectedComponent!.id, 'borderWidth', Number(value ?? 0))" />
                  </n-form-item>
                  <n-form-item v-if="selectedComponent.type === 'rectangle'" label="圆角">
                    <n-input-number :value="Number(selectedComponent.style.borderRadius ?? 8)" :min="0" @update:value="(value: number | null) => updateComponentStyle(selectedComponent!.id, 'borderRadius', Number(value ?? 0))" />
                  </n-form-item>
                </div>
              </template>
              <template v-if="selectedComponent.type === 'image'">
                <n-form-item label="图片 URL">
                  <n-input :value="String(selectedComponent.style.imageUrl ?? '')" placeholder="输入图片地址" @update:value="(value: string) => updateComponentStyle(selectedComponent!.id, 'imageUrl', value)" />
                </n-form-item>
                <n-form-item label="填充方式">
                  <n-radio-group :value="String(selectedComponent.style.objectFit ?? 'cover')" @update:value="(value: string) => updateComponentStyle(selectedComponent!.id, 'objectFit', value)">
                    <n-space>
                      <n-radio value="cover">裁切</n-radio>
                      <n-radio value="contain">包含</n-radio>
                      <n-radio value="fill">拉伸</n-radio>
                    </n-space>
                  </n-radio-group>
                </n-form-item>
              </template>
              <template v-if="selectedComponent.type === 'video'">
                <n-form-item label="视频 URL">
                  <n-input :value="String(selectedComponent.style.videoUrl ?? '')" placeholder="支持普通视频 URL" @update:value="(value: string) => updateComponentStyle(selectedComponent!.id, 'videoUrl', value)" />
                </n-form-item>
                <n-form-item label="播放设置">
                  <n-space vertical>
                    <n-checkbox :checked="Boolean(selectedComponent.style.autoplay)" @update:checked="(value: boolean) => updateComponentStyle(selectedComponent!.id, 'autoplay', value)">自动播放</n-checkbox>
                    <n-checkbox :checked="Boolean(selectedComponent.style.loop)" @update:checked="(value: boolean) => updateComponentStyle(selectedComponent!.id, 'loop', value)">循环播放</n-checkbox>
                    <n-checkbox :checked="Boolean(selectedComponent.style.controls)" @update:checked="(value: boolean) => updateComponentStyle(selectedComponent!.id, 'controls', value)">显示控件</n-checkbox>
                  </n-space>
                </n-form-item>
              </template>
              <template v-if="selectedComponent.type === 'iframe'">
                <n-form-item label="网页 URL">
                  <n-input :value="String(selectedComponent.style.url ?? '')" placeholder="输入合法网页地址" @update:value="(value: string) => updateComponentStyle(selectedComponent!.id, 'url', value)" />
                </n-form-item>
                <n-form-item label="Sandbox">
                  <n-input :value="String(selectedComponent.style.sandbox ?? '')" @update:value="(value: string) => updateComponentStyle(selectedComponent!.id, 'sandbox', value)" />
                </n-form-item>
              </template>
              <template v-if="selectedComponent.type === 'hotspot'">
                <n-form-item label="热区说明">
                  <n-input :value="String(selectedComponent.style.actionLabel ?? '')" @update:value="(value: string) => updateComponentStyle(selectedComponent!.id, 'actionLabel', value)" />
                </n-form-item>
              </template>
              <template v-if="selectedComponent.type === 'videoStream'">
                <n-form-item label="视频流地址">
                  <n-input :value="String(selectedComponent.style.streamUrl ?? '')" placeholder="HLS 或 FLV 地址" @update:value="(value: string) => updateComponentStyle(selectedComponent!.id, 'streamUrl', value)" />
                </n-form-item>
                <n-form-item label="视频流类型">
                  <n-radio-group :value="String(selectedComponent.style.streamType ?? 'hls')" @update:value="(value: string) => updateComponentStyle(selectedComponent!.id, 'streamType', value)">
                    <n-space>
                      <n-radio value="hls">HLS</n-radio>
                      <n-radio value="flv">FLV</n-radio>
                    </n-space>
                  </n-radio-group>
                </n-form-item>
                <n-form-item label="断流与隐藏">
                  <n-space vertical>
                    <n-checkbox :checked="Boolean(selectedComponent.style.reconnectEnabled)" @update:checked="(value: boolean) => updateComponentStyle(selectedComponent!.id, 'reconnectEnabled', value)">断流重连</n-checkbox>
                    <n-checkbox :checked="Boolean(selectedComponent.style.hiddenUnmount)" @update:checked="(value: boolean) => updateComponentStyle(selectedComponent!.id, 'hiddenUnmount', value)">隐藏卸载</n-checkbox>
                  </n-space>
                </n-form-item>
              </template>
              <template v-if="['datetime', 'date', 'time', 'weekday'].includes(selectedComponent.type)">
                <n-form-item label="时间格式">
                  <n-input :value="String(selectedComponent.style.format ?? '')" @update:value="(value: string) => updateComponentStyle(selectedComponent!.id, 'format', value)" />
                </n-form-item>
                <n-form-item label="字体颜色">
                  <n-color-picker :value="String(selectedComponent.style.color ?? '#e2e8f0')" @update:value="(value: string) => updateComponentStyle(selectedComponent!.id, 'color', value)" />
                </n-form-item>
              </template>
              <template v-if="selectedComponent.type === 'repeater'">
                <div class="form-grid">
                  <n-form-item label="行内个数">
                    <n-input-number :value="Number(selectedComponent.style.itemsPerLine ?? 3)" :min="1" @update:value="(value: number | null) => updateComponentStyle(selectedComponent!.id, 'itemsPerLine', Number(value ?? 1))" />
                  </n-form-item>
                  <n-form-item label="分页大小">
                    <n-input-number :value="Number(selectedComponent.style.pageSize ?? 6)" :min="1" @update:value="(value: number | null) => updateComponentStyle(selectedComponent!.id, 'pageSize', Number(value ?? 1))" />
                  </n-form-item>
                </div>
                <n-form-item label="示例数据 JSON">
                  <n-input
                    :value="JSON.stringify(selectedComponent.style.sampleRows ?? [], null, 2)"
                    type="textarea"
                    @update:value="(value: string) => updateComponentStyleJson(selectedComponent!.id, 'sampleRows', value)"
                  />
                </n-form-item>
              </template>
              <template v-if="selectedComponent.type === 'carousel' || selectedComponent.type === 'tabs'">
                <n-form-item label="Panel 配置 JSON">
                  <n-input
                    :value="JSON.stringify(selectedComponent.style.panels ?? [], null, 2)"
                    type="textarea"
                    @update:value="(value: string) => updateComponentStyleJson(selectedComponent!.id, 'panels', value)"
                  />
                </n-form-item>
                <n-form-item label="自动轮播">
                  <n-checkbox
                    :checked="Boolean(selectedComponent.type === 'tabs' ? selectedComponent.style.autoPlay : selectedComponent.style.autoplay)"
                    @update:checked="(value: boolean) => updateComponentStyle(selectedComponent!.id, selectedComponent!.type === 'tabs' ? 'autoPlay' : 'autoplay', value)"
                  >
                    开启
                  </n-checkbox>
                </n-form-item>
              </template>
              <template v-if="['select', 'multiSelect'].includes(selectedComponent.type)">
                <n-form-item label="选项 JSON">
                  <n-input
                    :value="JSON.stringify(selectedComponent.style.options ?? [], null, 2)"
                    type="textarea"
                    @update:value="(value: string) => updateComponentStyleJson(selectedComponent!.id, 'options', value)"
                  />
                </n-form-item>
              </template>
              <template v-if="['treeSelect', 'treeMultiSelect'].includes(selectedComponent.type)">
                <n-form-item label="树数据 JSON">
                  <n-input
                    :value="JSON.stringify(selectedComponent.style.treeData ?? [], null, 2)"
                    type="textarea"
                    @update:value="(value: string) => updateComponentStyleJson(selectedComponent!.id, 'treeData', value)"
                  />
                </n-form-item>
              </template>
              <template v-if="selectedComponent.type === 'datePicker'">
                <n-form-item label="日期值">
                  <n-input :value="String(selectedComponent.style.value ?? '')" @update:value="(value: string) => updateComponentStyle(selectedComponent!.id, 'value', value)" />
                </n-form-item>
              </template>
              <template v-if="isThreeDComponent(selectedComponent)">
                <div class="subsection-title">3D 场景容器</div>
                <n-alert type="info" :bordered="false">
                  双击画布中的 3D 组件进入子图层编辑模式；3D 地球仅开放气泡层与飞线层入口。
                </n-alert>
                <n-form-item label="容器配置 JSON">
                  <n-input
                    :value="JSON.stringify(selectedComponent.style.containerConfig ?? {}, null, 2)"
                    type="textarea"
                    @update:value="(value: string) => updateThreeDContainerConfigJson(selectedComponent!, value)"
                  />
                </n-form-item>
                <n-form-item label="异常诊断">
                  <n-input
                    :value="JSON.stringify(selectedComponent.style.diagnostics ?? {}, null, 2)"
                    type="textarea"
                    @update:value="(value: string) => updateComponentStyleJson(selectedComponent!.id, 'diagnostics', value)"
                  />
                </n-form-item>
                <template v-if="sceneEditingComponentId === selectedComponent.id && selectedSceneLayer">
                  <div class="subsection-title">子图层配置</div>
                  <n-form-item label="图层名称">
                    <n-input :value="selectedSceneLayer.name" @update:value="(value: string) => updateThreeDLayerPatch(selectedSceneLayer!.id, { name: value })" />
                  </n-form-item>
                  <n-form-item label="图层开关">
                    <n-space vertical>
                      <n-checkbox :checked="selectedSceneLayer.visible" @update:checked="(value: boolean) => updateThreeDLayerPatch(selectedSceneLayer!.id, { visible: value })">参与渲染与拾取</n-checkbox>
                      <n-checkbox :checked="selectedSceneLayer.locked" @update:checked="(value: boolean) => updateThreeDLayerPatch(selectedSceneLayer!.id, { locked: value })">锁定图层</n-checkbox>
                    </n-space>
                  </n-form-item>
                  <div class="form-grid">
                    <n-form-item label="最小缩放">
                      <n-input-number :value="selectedSceneLayer.minZoom ?? 0" @update:value="(value: number | null) => updateThreeDLayerPatch(selectedSceneLayer!.id, { minZoom: Number(value ?? 0) })" />
                    </n-form-item>
                    <n-form-item label="最大缩放">
                      <n-input-number :value="selectedSceneLayer.maxZoom ?? 22" @update:value="(value: number | null) => updateThreeDLayerPatch(selectedSceneLayer!.id, { maxZoom: Number(value ?? 22) })" />
                    </n-form-item>
                  </div>
                  <n-form-item label="样式 JSON">
                    <n-input
                      :value="JSON.stringify(selectedSceneLayer.styleConfig ?? {}, null, 2)"
                      type="textarea"
                      @update:value="(value: string) => updateThreeDLayerJson(selectedSceneLayer!.id, 'styleConfig', value)"
                    />
                  </n-form-item>
                  <n-form-item label="动画 JSON">
                    <n-input
                      :value="JSON.stringify(selectedSceneLayer.animationConfig ?? {}, null, 2)"
                      type="textarea"
                      @update:value="(value: string) => updateThreeDLayerJson(selectedSceneLayer!.id, 'animationConfig', value)"
                    />
                  </n-form-item>
                  <n-form-item label="交互 JSON">
                    <n-input
                      :value="JSON.stringify(selectedSceneLayer.interactions ?? [], null, 2)"
                      type="textarea"
                      @update:value="(value: string) => updateThreeDLayerJson(selectedSceneLayer!.id, 'interactions', value)"
                    />
                  </n-form-item>
                </template>
              </template>
              </details>
              <details v-if="isChartComponent(selectedComponent)" class="config-section" open>
                <summary class="config-section-title collapse-summary">
                  <span>图表样式</span>
                  <span class="collapse-indicator">⌄</span>
                </summary>
              <template v-if="isChartComponent(selectedComponent)">
                <n-form-item label="图表标题">
                  <n-input :value="String(selectedComponent.style.title ?? selectedComponent.name)" @update:value="(value: string) => updateComponentStyle(selectedComponent!.id, 'title', value)" />
                </n-form-item>
                <n-form-item label="配色 JSON">
                  <n-input
                    :value="JSON.stringify(selectedComponent.style.colorScheme ?? [], null, 2)"
                    type="textarea"
                    @update:value="(value: string) => updateComponentStyleJson(selectedComponent!.id, 'colorScheme', value)"
                  />
                </n-form-item>
                <n-form-item label="展示开关">
                  <n-space vertical>
                    <n-checkbox :checked="Boolean(selectedComponent.style.legendVisible)" @update:checked="(value: boolean) => updateComponentStyle(selectedComponent!.id, 'legendVisible', value)">显示图例</n-checkbox>
                    <n-checkbox :checked="Boolean(selectedComponent.style.valueLabelVisible)" @update:checked="(value: boolean) => updateComponentStyle(selectedComponent!.id, 'valueLabelVisible', value)">显示数值标签</n-checkbox>
                    <n-checkbox :checked="Boolean(selectedComponent.style.xAxisVisible)" @update:checked="(value: boolean) => updateComponentStyle(selectedComponent!.id, 'xAxisVisible', value)">显示 X 轴</n-checkbox>
                    <n-checkbox :checked="Boolean(selectedComponent.style.yAxisVisible)" @update:checked="(value: boolean) => updateComponentStyle(selectedComponent!.id, 'yAxisVisible', value)">显示 Y 轴</n-checkbox>
                  </n-space>
                </n-form-item>
                <n-form-item label="图表动画">
                  <n-space vertical>
                    <n-checkbox :checked="Boolean(selectedComponent.style.animationEnabled)" @update:checked="(value: boolean) => updateComponentStyle(selectedComponent!.id, 'animationEnabled', value)">启用图表动画</n-checkbox>
                    <div class="form-grid">
                      <n-input-number :value="Number(selectedComponent.style.animationDurationMs ?? 800)" :min="0" @update:value="(value: number | null) => updateComponentStyle(selectedComponent!.id, 'animationDurationMs', Number(value ?? 0))" />
                      <n-input :value="String(selectedComponent.style.animationEasing ?? 'ease-out')" @update:value="(value: string) => updateComponentStyle(selectedComponent!.id, 'animationEasing', value)" />
                    </div>
                  </n-space>
                </n-form-item>
                <template v-if="['metricCard', 'flipNumber'].includes(selectedComponent.type)">
                  <div class="form-grid">
                    <n-form-item label="前缀">
                      <n-input :value="String(selectedComponent.style.prefix ?? '')" @update:value="(value: string) => updateComponentStyle(selectedComponent!.id, 'prefix', value)" />
                    </n-form-item>
                    <n-form-item label="后缀">
                      <n-input :value="String(selectedComponent.style.suffix ?? '')" @update:value="(value: string) => updateComponentStyle(selectedComponent!.id, 'suffix', value)" />
                    </n-form-item>
                  </div>
                  <n-form-item v-if="selectedComponent.type === 'metricCard'" label="趋势说明">
                    <n-input :value="String(selectedComponent.style.trendLabel ?? '')" @update:value="(value: string) => updateComponentStyle(selectedComponent!.id, 'trendLabel', value)" />
                  </n-form-item>
                </template>
                <template v-if="['line', 'area', 'percentArea'].includes(selectedComponent.type)">
                  <n-form-item label="趋势样式">
                    <n-space vertical>
                      <n-checkbox :checked="Boolean(selectedComponent.style.smooth)" @update:checked="(value: boolean) => updateComponentStyle(selectedComponent!.id, 'smooth', value)">平滑曲线</n-checkbox>
                      <n-input-number :value="Number(selectedComponent.style.areaOpacity ?? 0.24)" :min="0" :max="1" :step="0.01" @update:value="(value: number | null) => updateComponentStyle(selectedComponent!.id, 'areaOpacity', Number(value ?? 0))" />
                    </n-space>
                  </n-form-item>
                </template>
                <template v-if="['gauge', 'waterWave', 'singleValueDonut'].includes(selectedComponent.type)">
                  <div class="form-grid">
                    <n-form-item label="最小值">
                      <n-input-number :value="Number(selectedComponent.style.min ?? 0)" @update:value="(value: number | null) => updateComponentStyle(selectedComponent!.id, 'min', Number(value ?? 0))" />
                    </n-form-item>
                    <n-form-item label="最大值">
                      <n-input-number :value="Number(selectedComponent.style.max ?? 100)" :min="1" @update:value="(value: number | null) => updateComponentStyle(selectedComponent!.id, 'max', Number(value ?? 1))" />
                    </n-form-item>
                  </div>
                  <n-form-item label="单位">
                    <n-input :value="String(selectedComponent.style.unit ?? selectedComponent.style.suffix ?? '')" @update:value="(value: string) => updateComponentStyle(selectedComponent!.id, 'unit', value)" />
                  </n-form-item>
                  <n-form-item v-if="selectedComponent.type === 'singleValueDonut'" label="中心标签">
                    <n-input :value="String(selectedComponent.style.centerLabel ?? '')" @update:value="(value: string) => updateComponentStyle(selectedComponent!.id, 'centerLabel', value)" />
                  </n-form-item>
                </template>
                <template v-if="selectedComponent.type === 'table'">
                  <div class="form-grid">
                    <n-form-item label="滚动行数">
                      <n-input-number :value="Number(selectedComponent.style.scrollRows ?? 6)" :min="1" @update:value="(value: number | null) => updateComponentStyle(selectedComponent!.id, 'scrollRows', Number(value ?? 1))" />
                    </n-form-item>
                    <n-form-item label="滚动间隔秒">
                      <n-input-number :value="Number(selectedComponent.style.scrollIntervalSeconds ?? 3)" :min="1" @update:value="(value: number | null) => updateComponentStyle(selectedComponent!.id, 'scrollIntervalSeconds', Number(value ?? 1))" />
                    </n-form-item>
                  </div>
                  <n-form-item label="表格开关">
                    <n-space vertical>
                      <n-checkbox :checked="Boolean(selectedComponent.style.rowNumberVisible)" @update:checked="(value: boolean) => updateComponentStyle(selectedComponent!.id, 'rowNumberVisible', value)">显示序号</n-checkbox>
                      <n-checkbox :checked="Boolean(selectedComponent.style.stripe)" @update:checked="(value: boolean) => updateComponentStyle(selectedComponent!.id, 'stripe', value)">斑马纹</n-checkbox>
                    </n-space>
                  </n-form-item>
                </template>
              </template>
              </details>
              <details class="config-section">
                <summary class="config-section-title collapse-summary">
                  <span>出入场动画</span>
                  <span class="collapse-indicator">⌄</span>
                </summary>
              <n-form-item label="入场动画">
                <n-space vertical>
                  <n-checkbox :checked="selectedComponent.animations.enter.enabled" @update:checked="(value: boolean) => updateComponentAnimation(selectedComponent!.id, 'enter', 'enabled', value)">启用入场动画</n-checkbox>
                  <n-radio-group :value="selectedComponent.animations.enter.type" @update:value="(value: string) => updateComponentAnimation(selectedComponent!.id, 'enter', 'type', value)">
                    <n-space>
                      <n-radio value="none">无</n-radio>
                      <n-radio value="fade">淡入</n-radio>
                      <n-radio value="drawer">抽屉</n-radio>
                      <n-radio value="scale">缩放</n-radio>
                      <n-radio value="scroll">卷轴</n-radio>
                      <n-radio value="fly">飞入</n-radio>
                      <n-radio value="float">浮动</n-radio>
                    </n-space>
                  </n-radio-group>
                </n-space>
              </n-form-item>
              <div class="form-grid">
                <n-form-item label="入场时长 ms">
                  <n-input-number :value="selectedComponent.animations.enter.durationMs" :min="0" @update:value="(value: number | null) => updateComponentAnimation(selectedComponent!.id, 'enter', 'durationMs', Number(value ?? 0))" />
                </n-form-item>
                <n-form-item label="入场延迟 ms">
                  <n-input-number :value="selectedComponent.animations.enter.startTimeMs" :min="0" @update:value="(value: number | null) => updateComponentAnimation(selectedComponent!.id, 'enter', 'startTimeMs', Number(value ?? 0))" />
                </n-form-item>
              </div>
              <n-form-item label="出场动画">
                <n-space vertical>
                  <n-checkbox :checked="selectedComponent.animations.exit.enabled" @update:checked="(value: boolean) => updateComponentAnimation(selectedComponent!.id, 'exit', 'enabled', value)">启用出场动画</n-checkbox>
                  <n-radio-group :value="selectedComponent.animations.exit.type" @update:value="(value: string) => updateComponentAnimation(selectedComponent!.id, 'exit', 'type', value)">
                    <n-space>
                      <n-radio value="none">无</n-radio>
                      <n-radio value="fade">淡出</n-radio>
                      <n-radio value="drawer">抽屉</n-radio>
                      <n-radio value="scale">缩放</n-radio>
                      <n-radio value="scroll">卷轴</n-radio>
                      <n-radio value="fly">飞出</n-radio>
                      <n-radio value="float">浮动</n-radio>
                    </n-space>
                  </n-radio-group>
                </n-space>
              </n-form-item>
              <div class="form-grid">
                <n-form-item label="出场时长 ms">
                  <n-input-number :value="selectedComponent.animations.exit.durationMs" :min="0" @update:value="(value: number | null) => updateComponentAnimation(selectedComponent!.id, 'exit', 'durationMs', Number(value ?? 0))" />
                </n-form-item>
                <n-form-item label="出场延迟 ms">
                  <n-input-number :value="selectedComponent.animations.exit.startTimeMs" :min="0" @update:value="(value: number | null) => updateComponentAnimation(selectedComponent!.id, 'exit', 'startTimeMs', Number(value ?? 0))" />
                </n-form-item>
              </div>
              </details>
              <details class="config-section">
                <summary class="config-section-title collapse-summary">
                  <span>交互事件</span>
                  <span class="collapse-indicator">⌄</span>
                </summary>
              <div class="interaction-toolbar">
                <n-button size="small" @click="addInteractionEvent(selectedComponent)">新增事件</n-button>
              </div>
              <div v-for="interaction in selectedComponent.interactions" :key="interaction.id" class="interaction-card">
                <div class="interaction-card-head">
                  <n-input :value="interaction.name" size="small" @update:value="(value: string) => updateInteractionPatch(selectedComponent!, interaction.id, { name: value })" />
                  <n-checkbox :checked="interaction.enabled" @update:checked="(value: boolean) => updateInteractionPatch(selectedComponent!, interaction.id, { enabled: value })">启用</n-checkbox>
                  <n-button size="tiny" tertiary type="error" @click="deleteInteractionEvent(selectedComponent!, interaction.id)">删除</n-button>
                </div>
                <n-form-item label="触发条件">
                  <n-radio-group :value="interaction.trigger" @update:value="(value: string) => updateInteractionPatch(selectedComponent!, interaction.id, { trigger: value as BigScreenInteractionEvent['trigger'] })">
                    <n-space>
                      <n-radio value="click">点击</n-radio>
                      <n-radio value="double-click">双击</n-radio>
                      <n-radio value="change">值变化</n-radio>
                      <n-radio value="mouseenter">移入</n-radio>
                      <n-radio value="mouseleave">移出</n-radio>
                      <n-radio value="page-load">页面加载</n-radio>
                      <n-radio value="data-loaded">数据更新完成</n-radio>
                      <n-radio value="custom">自定义</n-radio>
                    </n-space>
                  </n-radio-group>
                </n-form-item>
                <n-form-item label="条件 JSON">
                  <n-input
                    :value="JSON.stringify(interaction.conditions ?? [], null, 2)"
                    type="textarea"
                    placeholder="事件条件，例如变量、组件值、事件值满足后才执行动作"
                    @update:value="(value: string) => updateInteractionConditionsJson(selectedComponent!, interaction.id, value)"
                  />
                </n-form-item>
                <n-form-item label="快速添加响应">
                  <n-space size="small">
                    <n-button size="tiny" @click="addInteractionAction(selectedComponent!, interaction.id, 'switch-page')">切换页面</n-button>
                    <n-button size="tiny" @click="addInteractionAction(selectedComponent!, interaction.id, 'set-element-property')">改组件属性</n-button>
                    <n-button size="tiny" @click="addInteractionAction(selectedComponent!, interaction.id, 'set-filter')">设置筛选</n-button>
                    <n-button size="tiny" @click="addInteractionAction(selectedComponent!, interaction.id, 'set-variable')">修改变量</n-button>
                    <n-button size="tiny" @click="addInteractionAction(selectedComponent!, interaction.id, 'refresh-data')">刷新数据</n-button>
                    <n-button size="tiny" @click="addInteractionAction(selectedComponent!, interaction.id, 'open-link')">打开链接</n-button>
                    <n-button size="tiny" @click="addInteractionAction(selectedComponent!, interaction.id, 'wait')">等待</n-button>
                    <n-button size="tiny" @click="addInteractionAction(selectedComponent!, interaction.id, 'gis-drill')">GIS 下钻</n-button>
                  </n-space>
                </n-form-item>
                <n-alert type="info" :bordered="false">
                  当前画板可作为目标的组件 {{ componentOptions.length }} 个，图表联动目标 {{ chartTargetOptions.length }} 个；筛选动作支持使用事件值、组件值或变量值。
                </n-alert>
                <n-form-item label="响应动作 JSON">
                  <n-input
                    :value="JSON.stringify(interaction.actions ?? [], null, 2)"
                    type="textarea"
                    @update:value="(value: string) => updateInteractionActionsJson(selectedComponent!, interaction.id, value)"
                  />
                </n-form-item>
              </div>
              <n-form-item label="事件 JSON">
                <n-input
                  :value="JSON.stringify(selectedComponent.interactions ?? [], null, 2)"
                  type="textarea"
                  @update:value="(value: string) => updateComponentInteractionsJson(selectedComponent!.id, value)"
                />
              </n-form-item>
              </details>
            </n-form>
            </section>
          </template>

          <template v-else>
            <details class="right-config-panel" open>
            <summary class="panel-title collapse-summary">
              <span>页面设置</span>
              <span class="collapse-indicator">⌄</span>
            </summary>
            <n-form label-placement="top">
              <n-form-item label="说明">
                <n-input v-model:value="descriptionDraft" type="textarea" placeholder="描述展示场景、受众和发布用途" @update:value="markDirty" />
              </n-form-item>
              <n-form-item label="设备模式">
                <n-radio-group v-model:value="deviceModeDraft" @update:value="markDirty">
                  <n-space>
                    <n-radio value="pc">PC</n-radio>
                    <n-radio value="mobile">移动端</n-radio>
                  </n-space>
                </n-radio-group>
              </n-form-item>
              <n-form-item label="访问首页">
                <n-select v-model:value="homePageIdDraft" :options="pageOptions" @update:value="(value: string) => setHomePage(value)" />
              </n-form-item>
              <div v-if="activePage" class="form-grid">
                <n-form-item label="页面宽">
                  <n-input-number :value="activePage.width" :min="1" @update:value="(value: number | null) => updatePagePatch({ width: Number(value ?? 1) })" />
                </n-form-item>
                <n-form-item label="页面高">
                  <n-input-number :value="activePage.height" :min="1" @update:value="(value: number | null) => updatePagePatch({ height: Number(value ?? 1) })" />
                </n-form-item>
              </div>
              <n-form-item v-if="activePage" label="背景色">
                <n-color-picker :value="activePage.background.color ?? '#08111f'" @update:value="updatePageBackgroundColor" />
              </n-form-item>
            </n-form>
            </details>
          </template>

          <details class="right-config-panel meta-panel">
            <summary class="panel-title collapse-summary">
              <span>大屏信息</span>
              <span class="collapse-indicator">⌄</span>
            </summary>
            <div class="meta-list">
              <div><span>状态</span><strong>{{ screen.status === 'published' ? '已发布' : screen.status === 'offline' ? '已下线' : '草稿' }}</strong></div>
              <div><span>版本</span><strong>{{ versions.length }} / 20</strong></div>
              <div><span>创建人</span><strong>{{ screen.createdBy }}</strong></div>
              <div><span>更新时间</span><strong>{{ formatDateTime(screen.updatedAt) }}</strong></div>
              <div v-if="screen.publishedAt"><span>发布时间</span><strong>{{ formatDateTime(screen.publishedAt) }}</strong></div>
            </div>
          </details>
        </aside>
      </main>
    </n-spin>

    <n-modal v-model:show="publishModalVisible" preset="card" title="发布设置" class="screen-modal">
      <n-alert
        :type="publishBlockingIssues.length ? 'error' : publishWarningIssues.length ? 'warning' : 'success'"
        :bordered="false"
        class="publish-check-alert"
      >
        <template v-if="publishCheckLoading">
          正在执行发布前检查...
        </template>
        <template v-else-if="publishBlockingIssues.length">
          发现 {{ publishBlockingIssues.length }} 个阻断问题，请先在 DevTools 中处理后再发布。
        </template>
        <template v-else-if="publishWarningIssues.length">
          发现 {{ publishWarningIssues.length }} 个建议项，可以继续发布，但建议上线前处理。
        </template>
        <template v-else>
          发布前检查通过，当前内容可以发布。
        </template>
      </n-alert>
      <div v-if="publishCheckResult?.issues.length" class="publish-check-list">
        <button
          v-for="issue in publishCheckResult.issues.slice(0, 4)"
          :key="issue.id"
          type="button"
          :class="['publish-check-item', issue.severity]"
          @click="locateDevIssue(issue)"
        >
          <strong>{{ issue.title }}</strong>
          <span>{{ issue.description }}</span>
        </button>
      </div>
      <n-form label-placement="top">
        <n-form-item label="版本选择">
          <n-select
            :value="publishDraft.publishType === 'latest' ? 'latest' : publishDraft.versionId"
            :options="publishTypeOptions"
            @update:value="handlePublishTypeChange"
          />
        </n-form-item>
        <n-form-item label="访问加密">
          <n-radio-group v-model:value="publishDraft.accessMode">
            <n-space>
              <n-radio v-for="item in accessModeOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </n-radio>
            </n-space>
          </n-radio-group>
        </n-form-item>
        <n-form-item v-if="publishDraft.accessMode === 'password'" label="访问密码">
          <n-input v-model:value="publishDraft.password" type="password" placeholder="请输入 6-32 位密码" show-password-on="click" />
        </n-form-item>
        <n-form-item v-if="publishDraft.accessMode === 'token'" label="Token 过期时间">
          <n-input-number v-model:value="publishDraft.tokenExpireSeconds" :min="1" :max="86400" />
        </n-form-item>
	      </n-form>
	      <n-alert v-if="publishResult" type="success" :bordered="false">{{ publishResult }}</n-alert>
	      <div v-if="publishDraft.accessMode === 'token' && publishSecretKey" class="token-tool">
	        <n-button size="small" @click="handleCreateSharingToken">生成 Token 访问链接</n-button>
	        <n-input v-if="sharingTokenUrl" :value="sharingTokenUrl" readonly />
	      </div>
	      <template #footer>
        <n-space justify="end">
          <n-button @click="publishModalVisible = false">取消</n-button>
          <n-button
            type="primary"
            :loading="publishCheckLoading"
            :disabled="Boolean(publishBlockingIssues.length)"
            @click="handlePublish"
          >
            发布
          </n-button>
        </n-space>
	      </template>
	    </n-modal>

	    <n-modal v-model:show="shareTemplateVisible" preset="card" title="共享为模板" class="screen-modal">
	      <n-alert type="info" :bordered="false">
	        开启脱敏后，非静态数据源会转换成示例静态数据，数据库连接、API 密钥、Token 与 SQL 不会进入模板。
	      </n-alert>
	      <n-form label-placement="top" class="modal-form">
	        <n-form-item label="模板名称">
	          <n-input v-model:value="shareTemplateDraft.name" maxlength="50" show-count />
	        </n-form-item>
	        <n-form-item label="范围">
	          <n-select v-model:value="shareTemplateDraft.scope" :options="templateScopeOptions" />
	        </n-form-item>
	        <n-form-item label="封面地址或渐变">
	          <n-input v-model:value="shareTemplateDraft.coverUrl" placeholder="未填写时自动使用默认封面" />
	        </n-form-item>
	        <n-form-item label="描述">
	          <n-input v-model:value="shareTemplateDraft.description" type="textarea" />
	        </n-form-item>
	        <n-checkbox v-model:checked="shareTemplateDraft.isDesensitized">生成模板时脱敏数据</n-checkbox>
	      </n-form>
	      <template #footer>
	        <n-space justify="end">
	          <n-button @click="shareTemplateVisible = false">取消</n-button>
	          <n-button type="primary" @click="handleShareTemplate">生成模板</n-button>
	        </n-space>
	      </template>
	    </n-modal>

	    <n-modal v-model:show="devToolsVisible" preset="card" title="DevTools 搭建助手" class="devtools-modal">
	      <div class="devtools-summary">
	        <div :class="['devtools-status', devToolsResult.status]">
	          {{ devToolsResult.status === 'red' ? '红点' : devToolsResult.status === 'yellow' ? '黄点' : devToolsResult.status === 'green' ? '绿点' : '未检测' }}
	        </div>
	        <span>错误 {{ devToolsIssueCounts.error }} · 警告 {{ devToolsIssueCounts.warning }} · 已解决 {{ devToolsIssueCounts.resolved }}</span>
	        <n-button size="small" @click="runDevToolsCheck">重新检测</n-button>
	      </div>
	      <div class="devtools-list">
	        <div v-for="issue in devToolsResult.issues" :key="issue.id" :class="['devtools-issue', issue.severity]">
	          <div>
	            <strong>{{ issue.title }}</strong>
	            <n-tag size="small" :type="issue.severity === 'error' ? 'error' : issue.severity === 'warning' ? 'warning' : 'success'">
	              {{ issue.severity === 'error' ? '严重' : issue.severity === 'warning' ? '风险' : '已解决' }}
	            </n-tag>
	          </div>
	          <p>{{ issue.description }}</p>
	          <small>{{ issue.solution }}</small>
	          <n-space>
	            <n-button v-for="action in issue.quickActions" :key="action.id" size="tiny" @click="handleDevIssueAction(issue, action)">
	              {{ action.label }}
	            </n-button>
	          </n-space>
	        </div>
	        <n-empty v-if="!devToolsResult.issues.length" description="您的画板当前搭建合理，暂无问题" />
	      </div>
	    </n-modal>

    <n-modal v-model:show="versionModalVisible" preset="card" title="版本管理" class="version-modal">
      <div class="version-toolbar">
        <div>
          <strong>{{ screen?.name }}</strong>
          <span>新增版本保存当前草稿快照；回滚后需要再次保存。</span>
        </div>
        <n-space>
          <n-input v-model:value="versionNameDraft" placeholder="版本名称，默认版本N" />
          <n-button type="primary" :disabled="versions.length >= 20" @click="handleCreateVersion">新增版本</n-button>
        </n-space>
      </div>
      <div class="version-table">
        <div class="version-head">
          <span>版本</span>
          <span>创建信息</span>
          <span>状态</span>
          <span>锁定</span>
          <span>操作</span>
        </div>
        <div v-for="version in versions" :key="version.id" class="version-row">
          <div>
            <template v-if="renameVersionId === version.id">
              <n-input v-model:value="renameVersionValue" size="small" />
            </template>
            <template v-else>
              <strong>{{ version.name }}</strong>
            </template>
            <small>V{{ version.versionNo }}</small>
          </div>
          <div>
            <div>{{ formatDateTime(version.createdAt) }}</div>
            <small>{{ version.createdBy }}</small>
          </div>
          <div>
            <n-tag :type="version.status === 'published' ? 'success' : 'default'">
              {{ version.status === 'published' ? '已发布' : '历史版本' }}
            </n-tag>
          </div>
          <div>{{ version.locked ? '已锁定' : '未锁定' }}</div>
          <n-space :wrap="false">
            <n-button size="small" @click="handlePreviewVersion(version)">查看</n-button>
            <n-button size="small" @click="openPublishModal(version.id)">发布设置</n-button>
            <n-button size="small" @click="handleRestoreVersion(version)">回滚</n-button>
            <n-button v-if="renameVersionId === version.id" size="small" type="primary" @click="handleRenameVersion(version)">保存名称</n-button>
            <n-button v-else size="small" :disabled="version.locked" @click="startRenameVersion(version)">改名</n-button>
            <n-button size="small" @click="handleToggleVersionLock(version)">{{ version.locked ? '解锁' : '锁定' }}</n-button>
            <n-button size="small" tertiary type="error" :disabled="version.locked || version.status === 'published'" @click="handleDeleteVersion(version)">
              删除
            </n-button>
          </n-space>
        </div>
        <n-empty v-if="!versions.length" description="暂无版本，点击新增版本保存当前草稿快照" />
      </div>
    </n-modal>

    <n-drawer v-model:show="smartVVisible" :width="520" placement="right">
      <n-drawer-content title="智能小助手" closable>
        <div class="smart-v-drawer">
          <section class="smart-v-cards">
            <button type="button" class="smart-v-card" @click="startMobileLayoutConversion">
              <strong>移动端布局转换</strong>
              <span>{{ smartVDeviceWidth }}px · 自动重排</span>
            </button>
            <button type="button" class="smart-v-card" @click="startMetricSystemGeneration">
              <strong>指标体系生成大屏</strong>
              <span>{{ smartVMetricRows.length }} 行指标</span>
            </button>
            <button type="button" class="smart-v-card" @click="startThemeSwitch">
              <strong>主题切换</strong>
              <span>{{ smartVThemeOptions.find((item) => item.value === smartVThemeKey)?.label }}</span>
            </button>
            <button type="button" class="smart-v-card" @click="() => startDocSearch()">
              <strong>文档检索</strong>
              <span>按当前输入查询</span>
            </button>
          </section>

          <section class="smart-v-config">
            <div class="smart-v-inline">
              <label>移动宽度</label>
              <n-input-number v-model:value="smartVDeviceWidth" size="small" :min="320" :max="768" />
            </div>
            <div class="smart-v-inline">
              <label>主题</label>
              <n-select v-model:value="smartVThemeKey" size="small" :options="smartVThemeOptions" />
            </div>
          </section>

          <section class="smart-v-metric-table">
            <div class="smart-v-section-head">
              <strong>指标体系表</strong>
              <n-button size="tiny" @click="addSmartVMetricRow">新增行</n-button>
            </div>
            <div class="smart-v-metric-head">
              <span>位置</span>
              <span>板块</span>
              <span>指标</span>
              <span>维度</span>
              <span>图表</span>
              <span>数据查询</span>
              <span />
            </div>
            <div v-for="(row, index) in smartVMetricRows" :key="index" class="smart-v-metric-row">
              <n-input v-model:value="row.position" size="small" />
              <n-input v-model:value="row.section" size="small" />
              <n-input v-model:value="row.metric" size="small" />
              <n-input v-model:value="row.dimension" size="small" />
              <n-select v-model:value="row.chartType" size="small" :options="smartVChartTypeOptions" />
              <n-input v-model:value="row.queryName" size="small" placeholder="可空" />
              <n-button size="tiny" quaternary type="error" :disabled="smartVMetricRows.length <= 1" @click="removeSmartVMetricRow(index)">删</n-button>
            </div>
          </section>

          <section v-if="smartVCurrentJob" class="smart-v-job">
            <div class="smart-v-job-head">
              <div>
                <strong>{{ smartVJobTitle }}</strong>
                <span>{{ smartVCurrentJob.status === 'success' ? '已完成' : smartVCurrentJob.status === 'failed' ? '失败' : smartVCurrentJob.status === 'cancelled' ? '已取消' : '运行中' }}</span>
              </div>
              <n-space size="small">
                <n-button v-if="smartVCurrentJob.status === 'running'" size="small" @click="cancelSmartVJob">取消</n-button>
                <n-button
                  v-if="smartVCurrentJob.status === 'success' && smartVCurrentJob.output?.snapshot"
                  size="small"
                  @click="rerunSmartVCurrentJob"
                >
                  重新生成
                </n-button>
                <n-button
                  v-if="smartVCurrentJob.status === 'success' && smartVCurrentJob.output?.snapshot"
                  size="small"
                  @click="continueSmartVAdjustment"
                >
                  继续调整
                </n-button>
                <n-button
                  v-if="smartVCurrentJob.status === 'success' && smartVCurrentJob.output?.snapshot"
                  size="small"
                  type="primary"
                  @click="applySmartVSnapshot"
                >
                  应用到画布
                </n-button>
              </n-space>
            </div>
            <div class="smart-v-progress">
              <div v-for="step in smartVCurrentJob.progress" :key="step.stepName" :class="['smart-v-step', step.status]">
                <span />
                <div>
                  <strong>{{ step.stepName }}</strong>
                  <small>{{ step.message }}</small>
                </div>
              </div>
            </div>
            <div v-if="smartVCurrentJob.output?.answer" class="smart-v-answer">
              {{ smartVCurrentJob.output.answer }}
            </div>
            <div v-if="smartVCurrentJob.errorMessage" class="smart-v-error">
              {{ smartVCurrentJob.errorMessage }}
            </div>
          </section>

          <section class="smart-v-chat">
            <div v-for="message in smartVMessages" :key="message.id" :class="['smart-v-message', message.role]">
              <span>{{ message.text }}</span>
              <small>{{ formatDateTime(message.createdAt) }}</small>
            </div>
          </section>

          <div class="smart-v-input-row">
            <n-input
              v-model:value="smartVInput"
              placeholder="输入诉求或文档问题"
              @keyup.enter="handleSmartVSend"
            />
            <n-button type="primary" @click="handleSmartVSend">发送</n-button>
          </div>
        </div>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<style scoped lang="scss">
.big-screen-editor-page {
  height: calc(100vh - 64px);
  display: flex;
  flex-direction: column;
  background: #eef2f7;
}

.editor-topbar {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 18px;
  border-bottom: 1px solid #dbe3ef;
  background: #fff;
}

.title-block {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-input {
  width: 320px;
  font-weight: 700;
}

.preview-dropdown {
  position: relative;
}

.preview-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 20;
  width: 150px;
  padding: 6px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 16px 38px rgba(15, 23, 42, 0.16);
}

.preview-menu button {
  width: 100%;
  display: block;
  padding: 8px 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #111827;
  text-align: left;
  cursor: pointer;
}

.preview-menu button:hover {
  background: #eff6ff;
  color: #2563eb;
}

.dirty-state {
  font-size: 12px;
  color: #64748b;
}

.dirty-state.dirty,
.dirty-state.save_failed {
  color: #f97316;
}

.dirty-state.saving {
  color: #2563eb;
}

.devtools-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 6px;
  border-radius: 50%;
  background: #cbd5e1;
}

.devtools-dot.green {
  background: #22c55e;
}

.devtools-dot.yellow {
  background: #f59e0b;
}

.devtools-dot.red {
  background: #ef4444;
}

.editor-shell {
  min-height: 0;
  height: 100%;
  flex: 1;
  display: grid;
  grid-template-columns: 280px minmax(560px, 1fr) 360px;
  overflow: hidden;
}

.editor-left,
.editor-right {
  min-height: 0;
  max-height: 100%;
  padding: 16px;
  overflow: auto;
  background: #fff;
}

.editor-left {
  border-right: 1px solid #dbe3ef;
}

.editor-right {
  border-left: 1px solid #dbe3ef;
}

.panel-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  color: #0f172a;
  font-weight: 700;
}

.collapse-summary {
  cursor: pointer;
  list-style: none;
}

.collapse-summary::-webkit-details-marker {
  display: none;
}

.collapse-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.collapse-indicator {
  color: #64748b;
  font-size: 12px;
  transition: transform 0.18s ease;
}

details:not([open]) > .collapse-summary .collapse-indicator {
  transform: rotate(-90deg);
}

.collapsible-panel > details:not([open]) .panel-title,
.right-config-panel:not([open]) .panel-title {
  margin-bottom: 0;
}

.collapsible-body {
  min-height: 0;
}

.component-scroll,
.layer-list {
  max-height: min(45vh, 520px);
  overflow: auto;
  padding-right: 2px;
}

.right-config-panel + .right-config-panel {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
}

.right-config-panel .panel-title {
  position: sticky;
  top: -16px;
  z-index: 2;
  padding: 8px 0;
  background: #fff;
}

.config-section {
  margin-bottom: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
}

.config-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  background: #f8fafc;
  color: #0f172a;
  font-size: 13px;
  font-weight: 700;
}

.config-section[open] > .config-section-title {
  border-bottom: 1px solid #edf2f7;
}

.config-section > :not(summary) {
  margin-right: 12px;
  margin-left: 12px;
}

.config-section > :last-child {
  margin-bottom: 12px;
}

.config-section > .schema-config {
  margin-top: 12px;
}

.right-config-panel :deep(.n-form-item) {
  margin-bottom: 14px;
}

.editor-right :deep(.n-input),
.editor-right :deep(.n-input-number),
.editor-right :deep(.n-select),
.editor-right :deep(.n-form-item),
.editor-right :deep(textarea) {
  max-width: 100%;
}

.left-panel + .left-panel {
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid #e5e7eb;
}

.page-item {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  margin-bottom: 10px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  color: #111827;
  cursor: pointer;
}

.page-item.active {
  border-color: #2563eb;
  background: #eff6ff;
}

.page-item small {
  color: #64748b;
}

.component-category + .component-category {
  margin-top: 12px;
}

.category-title {
  margin-bottom: 8px;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.component-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.component-card {
  width: 100%;
  min-height: 38px;
  padding: 10px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
  color: #111827;
  cursor: pointer;
}

.component-card:hover {
  border-color: #2563eb;
  background: #eff6ff;
  color: #2563eb;
}

.layer-list {
  display: grid;
  gap: 8px;
}

.layer-group {
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}

.layer-group-title {
  color: #475569;
  font-size: 12px;
  font-weight: 700;
}

.layer-group-body {
  margin-top: 6px;
}

.layer-item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  color: #111827;
  cursor: pointer;
}

.layer-item.child {
  margin-top: 6px;
}

.layer-item.active {
  border-color: #2563eb;
  background: #eff6ff;
}

.layer-item.hidden {
  opacity: 0.52;
}

.scene-edit-hint {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
  color: #1e3a8a;
}

.scene-edit-hint strong {
  font-size: 13px;
}

.scene-edit-hint span,
.layer-item small {
  color: #64748b;
  font-size: 12px;
}

.smart-v-entry {
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid #e5e7eb;
}

.smart-v-launch {
  width: 100%;
  display: grid;
  gap: 4px;
  padding: 12px;
  border: 1px solid #c7d2fe;
  border-radius: 8px;
  background: #eef2ff;
  color: #312e81;
  text-align: left;
  cursor: pointer;
}

.smart-v-launch:hover {
  border-color: #4f46e5;
  background: #e0e7ff;
}

.smart-v-launch strong {
  font-size: 14px;
}

.smart-v-launch span {
  color: #6366f1;
  font-size: 12px;
}

.canvas-shell {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.canvas-toolbar {
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 8px 16px;
  color: #64748b;
  font-size: 13px;
  border-bottom: 1px solid #dbe3ef;
  background: #f8fafc;
}

.layout-report-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 8px 16px;
  border-bottom: 1px solid #dbe3ef;
  background: #fff;
  color: #64748b;
  font-size: 12px;
}

.layout-report-bar strong {
  color: #0f172a;
  font-size: 13px;
}

.canvas-stage {
  min-height: 0;
  flex: 1;
  padding: 24px;
  overflow: auto;
}

.interactive-canvas {
  position: relative;
  margin: 0 auto;
  overflow: hidden;
  box-shadow:
    0 24px 80px rgba(15, 23, 42, 0.24),
    0 0 0 1px rgba(148, 163, 184, 0.28);
  transform-origin: center top;
}

.editable-component {
  position: absolute;
  box-sizing: border-box;
  outline: 1px solid transparent;
  user-select: none;
  cursor: move;
}

.editable-component.hidden {
  opacity: 0.25 !important;
}

.editable-component.scene-muted {
  opacity: 0.18 !important;
  pointer-events: none;
}

.editable-component.locked {
  cursor: not-allowed;
}

.editable-component.selected {
  outline: 2px solid #38bdf8;
}

.editable-text {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  white-space: pre-wrap;
}

.editable-text-input {
  box-sizing: border-box;
  display: block;
  padding: 0;
  border: 1px solid rgba(56, 189, 248, 0.72);
  outline: 0;
  background: rgba(2, 6, 23, 0.24);
  resize: none;
}

.editable-shape,
.editable-image,
.editable-media,
.editable-chart,
.editable-metric {
  width: 100%;
  height: 100%;
}

.editable-image {
  display: block;
}

.editable-shape {
  box-sizing: border-box;
}

.editable-media,
.editable-chart {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px dashed rgba(125, 211, 252, 0.68);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.72);
  color: #dbeafe;
}

.editable-media.stream {
  gap: 6px;
}

.editable-media.stream span {
  color: #93c5fd;
}

.editable-hotspot {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed #38bdf8;
  border-radius: 8px;
  background: rgba(56, 189, 248, 0.18);
  color: #bae6fd;
}

.editable-chart small {
  margin-top: 6px;
  color: #93c5fd;
}

.editable-repeater {
  width: 100%;
  height: 100%;
  display: grid;
  gap: 10px;
}

.editable-repeater-item {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  padding: 12px;
  border: 1px solid #38bdf8;
  border-radius: 8px;
  background: rgba(15, 47, 81, 0.72);
  color: #e2e8f0;
}

.editable-repeater-item span {
  color: #f8fafc;
  font-weight: 700;
}

.editable-repeater-item small {
  color: #93c5fd;
}

.editable-container,
.editable-control {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid #38bdf8;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.78);
  color: #dbeafe;
}

.editable-control {
  align-items: flex-start;
  padding: 10px 14px;
}

.editable-control span {
  color: #94a3b8;
  font-size: 12px;
}

.editable-control select,
.editable-control input {
  width: 100%;
  min-height: 30px;
  box-sizing: border-box;
  border: 1px solid rgba(56, 189, 248, 0.45);
  border-radius: 6px;
  background: rgba(2, 6, 23, 0.68);
  color: #f8fafc;
}

.editable-control select[multiple] {
  min-height: 68px;
}

.editable-tabs {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(56, 189, 248, 0.5);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.78);
  color: #e2e8f0;
}

.editable-tabs-header {
  display: flex;
  background: rgba(15, 23, 42, 0.9);
}

.editable-tabs-header span {
  padding: 8px 14px;
  color: #94a3b8;
}

.editable-tabs-header span.active {
  color: #38bdf8;
  box-shadow: inset 0 -2px 0 #38bdf8;
}

.editable-tabs-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.editable-metric {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  border: 1px solid;
  border-radius: 8px;
  background: rgba(8, 17, 31, 0.82);
  color: #f8fafc;
}

.editable-metric span,
.editable-metric small {
  color: #9fb7d1;
}

.editable-metric strong {
  font-size: 30px;
}

.resize-handle {
  position: absolute;
  right: -6px;
  bottom: -6px;
  width: 12px;
  height: 12px;
  border: 2px solid #fff;
  border-radius: 50%;
  background: #38bdf8;
  cursor: nwse-resize;
}

.data-config-panel {
  max-height: min(36vh, 360px);
  min-height: 210px;
  display: flex;
  flex-direction: column;
  border-top: 1px solid #dbe3ef;
  background: #fff;
  overflow: hidden;
}

.data-query-bar {
  display: grid;
  grid-template-columns: minmax(128px, 180px) minmax(0, 1fr);
  align-items: start;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid #e5e7eb;
}

.data-query-bar > div:first-child {
  display: grid;
  gap: 2px;
}

.data-query-bar strong {
  color: #0f172a;
  font-size: 14px;
}

.data-query-bar span,
.query-state-row {
  color: #64748b;
  font-size: 12px;
}

.data-query-bar :deep(.n-space) {
  min-width: 0;
  flex-wrap: wrap !important;
  justify-content: flex-start !important;
}

.data-source-select {
  width: 150px;
}

.data-source-input {
  width: min(260px, 100%);
}

.query-state-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-bottom: 1px solid #edf2f7;
}

.source-config-row {
  padding: 10px 14px 0;
  border-bottom: 1px solid #edf2f7;
}

.data-tabs {
  display: flex;
  gap: 4px;
  padding: 8px 14px 0;
}

.data-tabs button {
  padding: 7px 12px;
  border: 0;
  border-radius: 6px 6px 0 0;
  background: transparent;
  color: #64748b;
  cursor: pointer;
}

.data-tabs button.active {
  background: #eef6ff;
  color: #2563eb;
  font-weight: 700;
}

.data-tab-body {
  min-height: 0;
  flex: 1;
  padding: 12px 14px 14px;
  overflow: auto;
}

.field-capsules {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.field-capsule {
  display: inline-flex;
  align-items: flex-start;
  gap: 8px;
  max-width: min(100%, 560px);
  padding: 8px 10px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 12px;
}

.field-capsule-main {
  display: grid;
  gap: 2px;
  min-width: 90px;
}

.field-capsule-main strong,
.field-capsule-main small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.field-capsule.measure {
  border-color: #bbf7d0;
  background: #f0fdf4;
  color: #15803d;
}

.field-capsule.unknown {
  border-color: #e5e7eb;
  background: #f8fafc;
  color: #64748b;
}

.field-capsule small {
  color: currentColor;
  opacity: 0.7;
}

.field-capsule-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.field-capsule-actions button {
  height: 22px;
  padding: 0 6px;
  border: 1px solid currentColor;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.72);
  color: inherit;
  font-size: 11px;
  line-height: 20px;
  cursor: pointer;
}

.field-capsule-actions button:hover {
  background: #fff;
}

.data-json-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.data-json-grid.three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.visual-rule-builder {
  display: grid;
  gap: 12px;
  margin-bottom: 14px;
  padding: 12px;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: #f8fafc;
}

.visual-rule-head,
.visual-rule-row,
.topn-rule-row {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) minmax(100px, 0.7fr) minmax(120px, 1fr) auto;
  align-items: center;
  gap: 8px;
}

.topn-rule-row {
  grid-template-columns: auto minmax(100px, 0.8fr) minmax(120px, 1fr) minmax(90px, 0.6fr);
}

.visual-rule-head {
  grid-template-columns: minmax(0, 1fr) auto;
  color: #334155;
  font-weight: 700;
}

.reference-rule-row {
  display: grid;
  grid-template-columns: minmax(110px, 1fr) minmax(110px, 1fr) minmax(90px, 0.8fr) 90px auto auto;
  align-items: center;
  gap: 8px;
}

.static-table-toolbar {
  display: grid;
  grid-template-columns: auto auto minmax(220px, 1fr) auto;
  gap: 8px;
  margin-bottom: 10px;
}

.static-table-wrap {
  overflow: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.static-table {
  width: 100%;
  min-width: 720px;
  border-collapse: collapse;
  font-size: 12px;
}

.static-table th,
.static-table td {
  padding: 6px;
  border-bottom: 1px solid #e5e7eb;
  border-right: 1px solid #eef2f7;
}

.static-table th {
  background: #f8fafc;
  color: #334155;
  text-align: left;
}

.static-table input {
  width: 100%;
  min-width: 92px;
  box-sizing: border-box;
  padding: 5px 6px;
  border: 1px solid #dbe3ef;
  border-radius: 5px;
}

.static-table button {
  border: 0;
  background: transparent;
  color: #dc2626;
  cursor: pointer;
}

.interaction-toolbar {
  margin-bottom: 10px;
}

.interaction-card {
  padding: 10px;
  margin-bottom: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}

.interaction-card-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.schema-config {
  margin: 12px 0 14px;
  padding: 12px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #f8fbff;
}

.schema-config-head {
  display: grid;
  gap: 3px;
  margin-bottom: 8px;
}

.schema-config-head strong {
  color: #0f172a;
}

.schema-config-head span {
  color: #64748b;
  font-size: 12px;
}

.subsection-title {
  margin: 18px 0 10px;
  padding-top: 14px;
  border-top: 1px solid #e5e7eb;
  color: #0f172a;
  font-size: 13px;
  font-weight: 700;
}

.meta-list {
  display: grid;
  gap: 10px;
  padding-top: 14px;
  border-top: 1px solid #e5e7eb;
}

.meta-list div {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  color: #64748b;
  font-size: 13px;
}

.meta-list strong {
  color: #111827;
  text-align: right;
}

.screen-modal {
  width: min(640px, calc(100vw - 48px));
}

.publish-check-alert {
  margin-bottom: 12px;
}

.publish-check-list {
  display: grid;
  gap: 8px;
  margin-bottom: 14px;
}

.publish-check-item {
  display: grid;
  gap: 3px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-left: 3px solid #94a3b8;
  border-radius: 8px;
  background: #fff;
  text-align: left;
  cursor: pointer;
}

.publish-check-item.error {
  border-left-color: #ef4444;
}

.publish-check-item.warning {
  border-left-color: #f59e0b;
}

.publish-check-item strong {
  color: #111827;
  font-size: 13px;
}

.publish-check-item span {
  color: #64748b;
  font-size: 12px;
  line-height: 1.45;
}

.token-tool {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.version-modal {
  width: min(1080px, calc(100vw - 48px));
}

.devtools-modal {
  width: min(860px, calc(100vw - 48px));
}

.devtools-summary {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  margin-bottom: 14px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}

.devtools-status {
  padding: 5px 10px;
  border-radius: 6px;
  background: #e2e8f0;
  color: #475569;
  font-weight: 700;
}

.devtools-status.green {
  background: #dcfce7;
  color: #15803d;
}

.devtools-status.yellow {
  background: #fef3c7;
  color: #b45309;
}

.devtools-status.red {
  background: #fee2e2;
  color: #b91c1c;
}

.devtools-list {
  display: grid;
  gap: 10px;
  max-height: min(58vh, 560px);
  overflow: auto;
}

.devtools-issue {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.devtools-issue.error {
  border-color: #fecaca;
  background: #fff7f7;
}

.devtools-issue.warning {
  border-color: #fde68a;
  background: #fffbeb;
}

.devtools-issue.resolved {
  opacity: 0.68;
}

.devtools-issue > div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.devtools-issue p {
  margin: 0;
  color: #334155;
}

.smart-v-drawer {
  min-height: calc(100vh - 120px);
  display: grid;
  grid-template-rows: auto auto auto auto minmax(180px, 1fr) auto;
  gap: 14px;
}

.smart-v-cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.smart-v-card {
  min-height: 72px;
  display: grid;
  align-content: center;
  gap: 5px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
  color: #0f172a;
  text-align: left;
  cursor: pointer;
}

.smart-v-card:hover {
  border-color: #2563eb;
  background: #eff6ff;
}

.smart-v-card span {
  color: #64748b;
  font-size: 12px;
}

.smart-v-config {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.smart-v-inline {
  display: grid;
  gap: 6px;
}

.smart-v-inline label,
.smart-v-section-head {
  color: #475569;
  font-size: 12px;
  font-weight: 700;
}

.smart-v-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.smart-v-metric-table {
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.smart-v-metric-head,
.smart-v-metric-row {
  display: grid;
  grid-template-columns: 58px 74px 84px 74px 84px minmax(86px, 1fr) 34px;
  gap: 6px;
  align-items: center;
}

.smart-v-metric-head {
  margin-bottom: 6px;
  color: #64748b;
  font-size: 12px;
}

.smart-v-metric-row + .smart-v-metric-row {
  margin-top: 6px;
}

.smart-v-job {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
}

.smart-v-job-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.smart-v-job-head > div {
  display: grid;
  gap: 4px;
}

.smart-v-job-head span {
  color: #2563eb;
  font-size: 12px;
}

.smart-v-progress {
  display: grid;
  gap: 8px;
}

.smart-v-step {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr);
  gap: 8px;
  align-items: start;
}

.smart-v-step > span {
  width: 10px;
  height: 10px;
  margin-top: 4px;
  border-radius: 999px;
  background: #cbd5e1;
}

.smart-v-step.success > span {
  background: #22c55e;
}

.smart-v-step.running > span {
  background: #2563eb;
}

.smart-v-step.failed > span {
  background: #ef4444;
}

.smart-v-step strong {
  display: block;
  color: #0f172a;
  font-size: 13px;
}

.smart-v-step small {
  color: #64748b;
}

.smart-v-answer,
.smart-v-error {
  padding: 10px;
  border-radius: 8px;
  white-space: pre-wrap;
  line-height: 1.6;
}

.smart-v-answer {
  background: #fff;
  color: #334155;
}

.smart-v-error {
  background: #fef2f2;
  color: #b91c1c;
}

.smart-v-chat {
  min-height: 0;
  display: grid;
  align-content: start;
  gap: 10px;
  overflow: auto;
}

.smart-v-message {
  max-width: 88%;
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 8px;
  line-height: 1.5;
}

.smart-v-message.assistant {
  justify-self: start;
  background: #f1f5f9;
  color: #334155;
}

.smart-v-message.user {
  justify-self: end;
  background: #2563eb;
  color: #fff;
}

.smart-v-message small {
  color: currentColor;
  font-size: 11px;
  opacity: 0.72;
}

.smart-v-input-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
}

.version-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.version-toolbar div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.version-toolbar span,
small {
  color: #64748b;
}

.version-table {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.version-head,
.version-row {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) 180px 110px 90px minmax(520px, 2fr);
  gap: 14px;
  align-items: center;
  padding: 12px 14px;
}

.version-head {
  background: #f8fafc;
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
}

.version-row {
  border-top: 1px solid #eef2f7;
}

.version-row > div:first-child {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

@media (max-width: 1500px) {
  .editor-shell {
    grid-template-columns: 260px minmax(480px, 1fr) 320px;
  }

  .component-card-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1180px) {
  .editor-shell {
    grid-template-columns: 1fr;
    overflow: auto;
  }

  .editor-left,
  .editor-right {
    max-height: none;
    border: 0;
    border-bottom: 1px solid #dbe3ef;
  }

  .version-head,
  .version-row {
    grid-template-columns: 1fr;
  }
}
</style>
