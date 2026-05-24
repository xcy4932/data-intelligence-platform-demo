<script setup lang="ts">
import '@/components/charts/chartRegister'
import type { EChartsOption } from 'echarts'
import {
  NAlert,
  NButton,
  NCheckbox,
  NDataTable,
  NDropdown,
  NEmpty,
  NInput,
  NInputNumber,
  NModal,
  NPopconfirm,
  NSelect,
  NSpace,
  NSpin,
  NSwitch,
  NTag,
} from 'naive-ui'
import type { DataTableColumns, DropdownOption, SelectOption, TagProps } from 'naive-ui'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import VChart from 'vue-echarts'
import { analysisCenterService } from '@/services/analysisCenterService'
import type {
  AnalysisCenterSpace,
  DashboardAsset,
  DashboardBookmark,
  DashboardComment,
  DashboardComponent,
  DashboardComponentType,
  DashboardEditLock,
  DashboardGlobalFilter,
  DashboardMonitor,
  DashboardPage,
  DashboardPermissionRole,
  DashboardSettings,
  DashboardSubscription,
  DashboardTheme,
  DashboardVersion,
  DashboardWebhookConfig,
  DashboardWidgetAsset,
  DashboardWidgetTableRow,
  ShareAssetPayload,
  SharePrincipal,
} from '@/types/analysisCenter'

type EditorSnapshot = {
  pages: DashboardPage[]
  settings: DashboardSettings
  dashboardName: string
}

type LinkageMode = 'single' | 'multi' | ''

type PageAction = 'rename' | 'copy' | 'copy_to_dashboard' | 'toggle_visible' | 'delete'

type ViewerComponentAction =
  | 'refresh'
  | 'embed_chart'
  | 'comment'
  | 'edit_chart'
  | 'export_image'
  | 'copy_data'
  | 'copy_to_dashboard'
  | 'contact_owner'
  | 'drill_down'
  | 'drill_up'
  | 'toggle_internal_filter'
  | 'toggle_filter_visible'
  | 'linkage_single'
  | 'linkage_multi'
  | 'linkage_clear'
  | 'jump_dashboard'
  | 'jump_web'
  | 'attribution'
  | 'interaction_event'
  | 'table_config'

type ComponentClipboard = {
  mode: 'copy' | 'cut'
  sourcePageId: string
  components: DashboardComponent[]
}

type ThemeDraft = {
  name: string
  scope: DashboardTheme['scope']
  layoutMode: DashboardSettings['layoutMode']
  canvasColor: string
  componentFillColor: string
  chartColor: string
  adaptiveComponentColors: boolean
}

type FilterItemDraft = {
  id: string
  type: 'normal' | 'tree' | 'composite' | 'deadline'
  name: string
  displayName: string
  operator: string
  defaultValue: string
  value: string
  multiple: boolean
  visible: boolean
  childFilters?: FilterItemDraft[]
}

type GlobalFilterProps = {
  filters: FilterItemDraft[]
  linkedChartIds: string[]
  pinned: boolean
  showQueryButton: boolean
  layoutStyle: string
  relation: 'AND' | 'OR'
  fieldBindings: Array<{
    chartId: string
    datasetId: string
    sourceFieldId: string
    targetFilterFieldId: string
    fieldType: 'text' | 'number' | 'date' | 'datetime'
  }>
}

type TopContainerProps = {
  height: number
  childrenComponentIds: string[]
}

type QueryContainerProps = {
  pinned: boolean
  showQueryButton: boolean
  childControlTypes: Array<'global_filter' | 'dynamic_field' | 'global_parameter'>
  childComponentIds: string[]
}

type WebComponentProps = {
  url: string
  urlType: 'dashboard_embed' | 'external_web' | 'cloud_doc' | 'chart_embed'
  carryToken: boolean
  safeUrl: string
  overridePinnedFilters: boolean
  iframeSandbox: string[]
  allowInteraction: boolean
  allowEditEmbeddedContent: boolean
  loadStatus: 'idle' | 'loading' | 'loaded' | 'error'
  errorMessage: string
}

type DatasetReplaceFieldMapping = {
  oldFieldId: string
  oldFieldName: string
  oldFieldType: 'text' | 'number' | 'date' | 'datetime'
  newFieldId: string
  newFieldName: string
  newFieldType: 'text' | 'number' | 'date' | 'datetime'
  status: 'matched' | 'manual_required' | 'type_mismatch'
}

type DatasetReplaceDraft = {
  sourceDatasetId: string
  targetDatasetId: string
  chartIds: string[]
  mappingMode: 'source_field' | 'dataset_field'
  fieldMappings: DatasetReplaceFieldMapping[]
  parameterMappings: Array<{ oldParameter: string, newParameter: string, status: 'matched' | 'manual_required' }>
  hierarchyRemapRequired: boolean
  categoryRemapRequired: boolean
}

type QuickQueryDraft = {
  filter: string
  chartStyle: string
  granularity: string
  dimension: string
  metric: string
  aggregation: string
}

type CopyChartDraft = {
  name: string
  targetDashboardId: string
  followTheme: boolean
}

type DrillConfig = {
  enabled: boolean
  mode: 'dataset_hierarchy' | 'chart_setting'
  hierarchyFields: string[]
  drillableFields: string[]
  datasetEditPermission: boolean
  datasetViewPermission: boolean
}

type DrillState = {
  componentId: string
  source: DrillConfig['mode']
  path: Array<{ field: string, value: string }>
}

type LinkageFieldMapping = {
  sourceField: string
  targetField: string
  sourceType: 'text' | 'number' | 'date'
  targetType: 'text' | 'number' | 'date'
  status: 'valid' | 'missing' | 'type_mismatch'
}

type LinkageConfig = {
  enabled: boolean
  targetComponentIds: string[]
  fieldMappings: LinkageFieldMapping[]
  includeDrillFields: boolean
}

type LinkageState = {
  sourceId: string
  mode: LinkageMode
  targetComponentIds: string[]
  fieldMappings: LinkageFieldMapping[]
  values: string[]
  row: Record<string, string>
}

type JumpOpenMode = 'new_window' | 'current_window' | 'center_modal' | 'side_modal'

type JumpRule = {
  id: string
  fieldName: string
  jumpType: 'dashboard' | 'web'
  targetDashboardId: string
  passFilters: boolean
  fieldMappings: Array<{ sourceField: string, targetFilter: string }>
  urlTemplate: string
  includeGlobalFilters: boolean
  openMode: JumpOpenMode
  priority: 'dashboard_level' | 'template_link'
}

type JumpConfig = {
  enabled: boolean
  rules: JumpRule[]
}

type ClickedDataPoint = {
  componentId: string
  field: string
  value: string
  row: Record<string, string>
}

type AttributionRule = {
  anomalyJudgeType: 'time_series_prediction' | 'change_rate_threshold'
  threshold?: number
  dimensionLimit: {
    enabled: boolean
    maxCardinality?: number
    excludedDimensionIds: string[]
  }
  resultLimit: {
    enabled: boolean
    maxDimensions: number
  }
}

type AttributionConfig = {
  datasetId: string
  globalConfig: AttributionRule
  metricSpecificConfigs: Record<string, AttributionRule>
}

type AttributionTask = {
  mode: 'default' | 'custom'
  granularity: 'day' | 'week' | 'month'
  currentPoint: string
  comparePoint: string
  status: 'idle' | 'validating' | 'running' | 'finished' | 'failed'
  reportVisible: boolean
}

type InteractionEventRule = {
  id: string
  fieldName: string
  eventName: string
  eventType: 'post_message'
  chartScope: 'table' | 'pivot' | 'histogram' | 'chart'
}

type InteractionEventConfig = {
  enabled: boolean
  privateDeploymentEnabled: boolean
  allowOrigins: string[]
  rules: InteractionEventRule[]
}

type ShareGrantRow = {
  id: string
  principalId: string
  principalName: string
  principalType: 'member' | 'team'
  role: DashboardPermissionRole
  description?: string
  isSelf?: boolean
}

type WebhookDraft = Omit<DashboardWebhookConfig, 'id' | 'projectId' | 'createdBy' | 'createdAt' | 'lastTestStatus' | 'failureLog' | 'dynamicTokenConfig'> & {
  dynamicTokenConfig: {
    tokenApiUrl: string
    tokenParamName: string
  }
}

const route = useRoute()
const router = useRouter()
const dashboard = ref<DashboardAsset | null>(null)
const pages = ref<DashboardPage[]>([])
const settings = ref<DashboardSettings | null>(null)
const loading = ref(false)
const refreshing = ref(false)
const editMode = ref(route.query.mode === 'edit')
const previewMode = ref(route.query.mode === 'preview')
const actionNotice = ref('')
const activePageId = ref('')
const selectedComponentId = ref('')
const selectedComponentIds = ref<string[]>([])
const draggingComponentId = ref('')
const undoStack = ref<EditorSnapshot[]>([])
const redoStack = ref<EditorSnapshot[]>([])
const dirty = ref(false)
const zoom = ref(100)
const isFullscreen = ref(false)
const queryButtonEnabled = ref(false)
const pendingQuery = ref(false)
const filterState = ref<Record<string, string>>({})
const appliedFilterState = ref<Record<string, string>>({})
const treeFilter = ref({
  region: '华东',
  province: '山东',
  city: '青岛',
  logic: 'AND',
})
const dynamicField = ref('广告观看次数')
const globalParameter = ref('low_coin')
const activeLinkage = ref<LinkageState | null>(null)
const activeDrill = ref<DrillState | null>(null)
const drillTrail = ref<string[]>(['大区'])
const commentPanelVisible = ref(false)
const bookmarkModalVisible = ref(false)
const subscriptionModalVisible = ref(false)
const monitorModalVisible = ref(false)
const embedModalVisible = ref(false)
const shareModalVisible = ref(false)
const publishModalVisible = ref(false)
const versionModalVisible = ref(false)
const attributionModalVisible = ref(false)
const attributionConfigModalVisible = ref(false)
const announcementModalVisible = ref(false)
const languageModalVisible = ref(false)
const webhookModalVisible = ref(false)
const datasetReplaceModalVisible = ref(false)
const quickQueryModalVisible = ref(false)
const copyChartModalVisible = ref(false)
const drillConfigModalVisible = ref(false)
const linkageConfigModalVisible = ref(false)
const jumpConfigModalVisible = ref(false)
const tableConfigModalVisible = ref(false)
const interactionModalVisible = ref(false)
const interactionConfigModalVisible = ref(false)
const jumpPreviewModalVisible = ref(false)
const selectedTableComponentId = ref('')
const attributionComponent = ref<DashboardComponent | null>(null)
const quickQueryComponent = ref<DashboardComponent | null>(null)
const copyChartComponent = ref<DashboardComponent | null>(null)
const configuringComponent = ref<DashboardComponent | null>(null)
const interactionPayload = ref('')
const interactionValidationError = ref('')
const jumpPreviewUrl = ref('')
const jumpPreviewOpenMode = ref<JumpOpenMode>('center_modal')
const jumpPreviewError = ref('')
const viewerShareLink = ref('')
const viewerDownloadPermissionCheck = ref(true)
const viewerScrollTopBeforeFullscreen = ref(0)
const fullscreenSizeMode = ref<'adaptive' | 'actual'>('adaptive')
const recentChartSearch = ref('')
const pluginMarketVisible = ref(false)
const helpModalVisible = ref(false)
const customThemeModalVisible = ref(false)
const customThemeError = ref('')
const customThemeDraft = ref<ThemeDraft>({
  name: '项目运营主题',
  scope: 'project',
  layoutMode: 'tile',
  canvasColor: '#f7f9fc',
  componentFillColor: '#ffffff',
  chartColor: '#2563eb',
  adaptiveComponentColors: true,
})
const targetPageForAction = ref<DashboardPage | null>(null)
const pageRenameDraft = ref('')
const editingPageId = ref('')
const pageNameError = ref('')
const pageDeleteConfirmVisible = ref(false)
const crossDashboardPageModalVisible = ref(false)
const crossDashboardPageDraft = ref({
  name: '',
  targetDashboardId: 'dash-team-retention',
  copyChartResources: true,
})
const datasetReplaceError = ref('')
const datasetReplaceDraft = ref<DatasetReplaceDraft>({
  sourceDatasetId: '',
  targetDatasetId: '',
  chartIds: [],
  mappingMode: 'source_field',
  fieldMappings: [],
  parameterMappings: [],
  hierarchyRemapRequired: false,
  categoryRemapRequired: false,
})
const quickQueryDraft = ref<QuickQueryDraft>({
  filter: '省份 = 山东',
  chartStyle: 'line',
  granularity: 'day',
  dimension: '城市',
  metric: '广告观看次数',
  aggregation: 'sum',
})
const quickQueryApplied = ref<Record<string, QuickQueryDraft>>({})
const copyChartDraft = ref<CopyChartDraft>({
  name: '',
  targetDashboardId: 'dash-team-retention',
  followTheme: true,
})
const attributionTask = ref<AttributionTask>({
  mode: 'default',
  granularity: 'day',
  currentPoint: '2026-05-22',
  comparePoint: '2026-05-15',
  status: 'idle',
  reportVisible: false,
})
const attributionConfigDraft = ref<AttributionConfig>({
  datasetId: 'ds_ad_watch_detail',
  globalConfig: {
    anomalyJudgeType: 'change_rate_threshold',
    threshold: 10,
    dimensionLimit: {
      enabled: true,
      maxCardinality: 500,
      excludedDimensionIds: ['user_id', 'event_date', 'device_id'],
    },
    resultLimit: {
      enabled: true,
      maxDimensions: 8,
    },
  },
  metricSpecificConfigs: {
    广告观看次数: {
      anomalyJudgeType: 'time_series_prediction',
      threshold: 12,
      dimensionLimit: {
        enabled: true,
        maxCardinality: 300,
        excludedDimensionIds: ['user_id', 'partition_date'],
      },
      resultLimit: {
        enabled: true,
        maxDimensions: 6,
      },
    },
  },
})
const attributionValidationErrors = ref<string[]>([])
const interactionDraft = ref<InteractionEventConfig>({
  enabled: true,
  privateDeploymentEnabled: true,
  allowOrigins: ['https://ops.example.com'],
  rules: [
    {
      id: 'interaction_default',
      fieldName: '省份',
      eventName: 'dashboard_component_click',
      eventType: 'post_message',
      chartScope: 'chart',
    },
  ],
})
const drillDraft = ref<DrillConfig>({
  enabled: true,
  mode: 'dataset_hierarchy',
  hierarchyFields: ['大区', '省份', '城市'],
  drillableFields: ['大区', '省份'],
  datasetEditPermission: true,
  datasetViewPermission: true,
})
const linkageDraft = ref<LinkageConfig>({
  enabled: true,
  targetComponentIds: [],
  fieldMappings: [
    { sourceField: '省份', targetField: '省份', sourceType: 'text', targetType: 'text', status: 'valid' },
  ],
  includeDrillFields: true,
})
const linkageValidationError = ref('')
const jumpDraft = ref<JumpConfig>({
  enabled: true,
  rules: [],
})
const clickedDataPoint = ref<ClickedDataPoint | null>(null)
const componentClipboard = ref<ComponentClipboard | null>(null)
const draggedPageId = ref('')
const bookmarkDraft = ref({
  name: '',
  scope: 'private' as DashboardBookmark['scope'],
})
const commentDraft = ref('')
const replyDrafts = ref<Record<string, string>>({})
const subscriptionDraft = ref<Omit<DashboardSubscription, 'id' | 'createdAt' | 'lastStatus'>>({
  title: '每日广告运营仪表盘',
  description: '每日推送广告运营核心页面，含截图、访问链接和订阅管理入口。',
  scope: 'all_pages',
  sheetIds: [],
  quickBookmarkState: {},
  triggerType: 'schedule',
  schedule: '每天 09:00',
  language: 'auto',
  appendDate: true,
  interpretationEnabled: false,
  contentConfig: {
    includeLink: true,
    screenshotMode: 'flat',
    includePdf: true,
    includeScreenshotTime: true,
    includeManageLink: true,
    remark: '如遇截图为空或查询失败，本次推送会自动暂停并记录失败原因。',
  },
  pushChannel: 'feishu',
  receiverIds: ['u_chaoyang'],
  permissionPrincipal: 'u_chaoyang',
  notifyOnChange: true,
  notifyTarget: 'receivers',
})
const monitorDraft = ref<Omit<DashboardMonitor, 'id' | 'createdAt' | 'testSent'>>({
  name: '广告观看次数异常监控',
  componentId: '',
  dateField: '事件日期',
  timeRangeMode: 'latest_one',
  recentPointCount: 1,
  triggerFactor: 'metric_change',
  compareRange: '比 7 天前',
  compareMethod: 'decrease',
  compareValueType: 'percent',
  metricConditionMode: 'any_condition',
  ruleRelation: 'OR',
  dimensionLogic: 'AND',
  dimensionFilters: '用户金币分层 = 低金币用户',
  rule: '下降超过 10%',
  scheduleMode: 'schedule',
  schedule: '每 30 分钟',
  timezone: 'UTC+08:00',
  earliestTriggerTime: '09:00',
  pushChannel: 'feishu',
  receiver: 'u_chaoyang',
  groupIds: '',
  suggestionText: '优先检查金币不足弹窗入口和任务中心激励链路。',
  suggestionUrl: 'https://ops.example.com/playbook/ad-watch-drop',
  showConditionInAlert: true,
  lastAlertStatus: 'idle',
})
const subscriptionValidationError = ref('')
const subscriptionTestPreview = ref('')
const monitorValidationError = ref('')
const monitorTestPreview = ref('')
const webhookConfigs = ref<DashboardWebhookConfig[]>([
  {
    id: 'webhook_ops_default',
    projectId: 'project-dataops-demo',
    name: '运营 IM 机器人',
    url: 'https://ops.example.com/webhook/dashboard',
    secretType: 'static_token',
    staticToken: 'demo-token',
    remark: '用于订阅和监控报警演示',
    interfaceType: 'generic_im_robot',
    subscribedEvents: ['subscription_push', 'monitor_alert'],
    createdBy: 'Chaoyang Xu',
    createdAt: '2026-05-18T10:00:00+02:00',
    lastTestStatus: 'success',
  },
])
const webhookDraft = ref<WebhookDraft>({
  name: '企业微信群机器人',
  url: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=demo',
  secretType: 'none',
  staticToken: '',
  dynamicTokenConfig: {
    tokenApiUrl: '',
    tokenParamName: 'access_token',
  },
  remark: '用于仪表盘订阅消息推送',
  interfaceType: 'wechat_work_robot',
  subscribedEvents: ['subscription_push', 'monitor_alert'],
})
const webhookValidationError = ref('')
const webhookTestStatus = ref<'not_tested' | 'success' | 'failed'>('not_tested')
const embedDraft = ref({
  showDashboardName: true,
  showOwner: true,
  showActions: true,
  showChartName: true,
  showTooltipIcons: true,
  showToolbarIcons: true,
  includeFilters: true,
  showFilterControls: true,
  pageScope: 'all',
})
const embedLink = ref('')
const embedTargetComponentId = ref('')
const publishDescription = ref('')
const publishValidationError = ref('')
const publishVersionToDeleteId = ref('')
const selectedVersionId = ref('')
const versionPreviewLink = ref('')
const editingVersionDescriptionId = ref('')
const versionDescriptionDraft = ref('')
const shareDraft = ref<ShareAssetPayload>({
  assetId: '',
  assetType: 'dashboard',
  visibility: 'team',
  targetSpaceId: 'space-team-operation',
  allowCopy: true,
  addMemberIds: [],
  addTeamIds: [],
  removeMemberIds: [],
  removeTeamIds: [],
})
const shareLink = ref('')
const spaces = ref<AnalysisCenterSpace[]>([])
const shareMembers = ref<SharePrincipal[]>([])
const shareTeams = ref<SharePrincipal[]>([])
const sharedMembers = ref<SharePrincipal[]>([])
const sharedTeams = ref<SharePrincipal[]>([])
const shareGrantRows = ref<ShareGrantRow[]>([])
const quickGrantPrincipalId = ref('')
const quickGrantRole = ref<DashboardPermissionRole>('viewer')
const shareSearchKeyword = ref('')
const shareValidationError = ref('')
const currentUserPermissionRole = ref<DashboardPermissionRole>('admin')
const isProjectAdmin = ref(true)
const selfAdminRevoked = ref(false)
const tableVisibleFields = ref<Record<string, boolean>>({
  dimension: true,
  metric: true,
  value: true,
  change: true,
})
const frozenColumn = ref('')
const tableSortMode = ref<'none' | 'value_desc' | 'change_desc'>('none')
const mobileLayoutPreview = ref(false)
const webSourceRecovered = ref(false)
const webFrameLoading = ref(false)
const webFrameError = ref(false)
const webFrameReloadKey = ref(0)
const dashboardNameDraft = ref('')
const nameValidationError = ref('')
const editorLock = ref<DashboardEditLock | null>(null)
const lockNotice = ref('')
const cacheRestoreVisible = ref(false)
const cachedEditorSnapshot = ref<EditorSnapshot | null>(null)
const previewLink = ref('')
const editorNotice = ref('')
const selectionBox = ref<{ x: number, y: number, width: number, height: number } | null>(null)
const selectionStart = ref<{ x: number, y: number } | null>(null)
const dragGuide = ref<{ x: number, y: number, centerX: boolean, centerY: boolean } | null>(null)
const chartFilterOverrides = ref<Record<string, { internalActive: boolean, hidden: boolean }>>({})

let editHeartbeatTimer: number | undefined

const setEditorNotice = (message: string): void => {
  actionNotice.value = message
  editorNotice.value = message
  lockNotice.value = editorLock.value ? `${message}（编辑锁仍在后台续约）` : message
}

const dashboardId = computed(() => String(route.params.dashboardId ?? ''))
const webUrlValid = computed(() => {
  const url = dashboard.value?.webConfig?.url

  if (!url) {
    return false
  }

  try {
    const nextUrl = new URL(url)
    return ['http:', 'https:'].includes(nextUrl.protocol)
  } catch {
    return false
  }
})
const globalFilters = computed<DashboardGlobalFilter[]>(() => dashboard.value?.globalFilters ?? [])
const activePage = computed(() => pages.value.find((page) => page.id === activePageId.value) ?? pages.value[0] ?? null)
const selectedComponent = computed(() => {
  const page = activePage.value

  if (!page) {
    return null
  }

  return page.components.find((component) => component.id === selectedComponentId.value) ?? null
})
const selectedComponents = computed(() => {
  const page = activePage.value
  const selectedIds = selectedComponentIds.value.length ? selectedComponentIds.value : selectedComponentId.value ? [selectedComponentId.value] : []

  if (!page) {
    return []
  }

  return page.components.filter((component) => selectedIds.includes(component.id))
})
const isBatchConfigMode = computed(() => selectedComponents.value.length > 1)
const canGroupSelection = computed(() => selectedComponents.value.length >= 2 && selectedComponents.value.every((component) => component.type !== 'top_container'))
const canUngroupSelection = computed(() => selectedComponents.value.some((component) => Boolean(component.groupId)))
const cacheKey = computed(() => `dashboard-editor-cache:${dashboardId.value}`)
const currentPreviewLink = computed(() =>
  previewLink.value || `${window.location.origin}/analysis-center/dashboards/${dashboardId.value}?mode=preview`,
)
const canvasBackgroundStyle = computed(() => {
  const background = settings.value?.canvasBackground
  const color = background?.color ?? '#f7f9fc'
  const opacity = Math.min(Math.max(Number(background?.opacity ?? 100), 0), 100) / 100

  return {
    transform: `scale(${zoom.value / 100})`,
    backgroundColor: color,
    backgroundImage: background?.imageUrl ? `linear-gradient(rgba(255,255,255,${1 - opacity}), rgba(255,255,255,${1 - opacity})), url(${background.imageUrl})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  }
})
const officialThemes = computed<DashboardTheme[]>(() => [
  {
    id: 'classic',
    name: '经典',
    scope: 'system',
    dashboardConfig: { canvasBackground: { color: '#ffffff', opacity: 100 }, appearance: { fillColor: '#ffffff', borderColor: '#e5e7eb' } },
    chartConfig: { discreteColorScheme: ['#2563eb', '#f59e0b', '#10b981', '#ef4444'] },
  },
  {
    id: 'light',
    name: '浅色',
    scope: 'system',
    dashboardConfig: { canvasBackground: { color: '#f7f9fc', opacity: 100 }, appearance: { fillColor: '#ffffff', borderColor: '#e2e8f0' } },
    chartConfig: { discreteColorScheme: ['#3b82f6', '#14b8a6', '#f97316', '#8b5cf6'] },
  },
  {
    id: 'dark',
    name: '深色',
    scope: 'system',
    dashboardConfig: { canvasBackground: { color: '#111827', opacity: 100 }, appearance: { fillColor: '#1f2937', borderColor: '#334155' } },
    chartConfig: { discreteColorScheme: ['#38bdf8', '#a78bfa', '#34d399', '#f97316'] },
  },
  {
    id: 'tech_blue',
    name: '科技蓝',
    scope: 'system',
    dashboardConfig: { canvasBackground: { color: '#eef6ff', opacity: 100 }, appearance: { fillColor: '#ffffff', borderColor: '#bfdbfe' } },
    chartConfig: { discreteColorScheme: ['#0ea5e9', '#2563eb', '#22c55e', '#f59e0b'] },
  },
  {
    id: 'elegant_purple',
    name: '淡雅紫',
    scope: 'system',
    dashboardConfig: { canvasBackground: { color: '#faf5ff', opacity: 100 }, appearance: { fillColor: '#ffffff', borderColor: '#e9d5ff' } },
    chartConfig: { discreteColorScheme: ['#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b'] },
  },
])
const currentTheme = computed<DashboardTheme | null>(() => {
  const themeId = settings.value?.themeId

  if (!themeId) {
    return null
  }

  return [...officialThemes.value, ...(settings.value?.customThemes ?? [])].find((theme) => theme.id === themeId) ?? null
})
const hasDashboardTheme = computed(() => Boolean(settings.value?.themeId))
const topContainerComponent = computed(() => activePage.value?.components.find((component) => component.type === 'top_container') ?? null)
const pinnedControlComponents = computed(() =>
  (activePage.value?.components ?? []).filter((component) =>
    ['global_filter', 'dynamic_field', 'global_parameter', 'query_container'].includes(component.type)
    && Boolean(component.props.pinned || (component.props.globalFilter as GlobalFilterProps | undefined)?.pinned || (component.props.queryContainer as QueryContainerProps | undefined)?.pinned),
  ),
)
const topContainerChildIds = computed(() =>
  new Set((topContainerComponent.value?.props.topContainer as TopContainerProps | undefined)?.childrenComponentIds ?? []),
)
const viewerCanvasComponents = computed(() =>
  (activePage.value?.components ?? []).filter((component) =>
    component.type !== 'top_container' && !topContainerChildIds.value.has(component.id) && !pinnedControlComponents.value.some((item) => item.id === component.id),
  ),
)
const visiblePages = computed(() => editMode.value ? pages.value : pages.value.filter((page) => page.visibleInViewMode))
const currentPagesForView = computed(() =>
  dashboard.value?.publishMode === 'versioned' && !editMode.value && !previewMode.value
    ? dashboard.value.publishedPages ?? pages.value
    : pages.value,
)
const activeComments = computed(() =>
  (dashboard.value?.comments ?? []).filter((comment) => comment.pageId === activePageId.value),
)
const rootComments = computed(() => activeComments.value.filter((comment) => !comment.parentCommentId))
const getComponentCommentCount = (componentId: string): number =>
  activeComments.value.filter((comment) => comment.componentId === componentId && !comment.deletedAt).length
const writableSpaceOptions = computed<SelectOption[]>(() =>
  spaces.value.map((space) => ({
    label: `${space.name} · ${space.type === 'team' ? '团队' : space.type === 'public' ? '公共' : '个人'}`,
    value: space.id,
    disabled: !space.canWrite,
  })),
)
const shareMemberOptions = computed<SelectOption[]>(() =>
  shareMembers.value.map((member) => ({
    label: `${member.name} · ${member.description ?? '成员'}`,
    value: member.id,
  })),
)
const shareTeamOptions = computed<SelectOption[]>(() =>
  shareTeams.value.map((team) => ({
    label: `${team.name} · ${team.description ?? '团队'}`,
    value: team.id,
  })),
)
const currentSharedMemberOptions = computed<SelectOption[]>(() =>
  sharedMembers.value.map((member) => ({ label: member.name, value: member.id })),
)
const currentSharedTeamOptions = computed<SelectOption[]>(() =>
  sharedTeams.value.map((team) => ({ label: team.name, value: team.id })),
)
const permissionRoleOptions: SelectOption[] = [
  { label: '阅览', value: 'viewer' },
  { label: '编辑', value: 'editor' },
  { label: '管理', value: 'admin' },
]
const permissionRoleLabelMap: Record<DashboardPermissionRole, string> = {
  viewer: '阅览',
  editor: '编辑',
  admin: '管理',
}
const permissionRoleLevel: Record<DashboardPermissionRole, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
}
const canGrantPermissionRole = (role: DashboardPermissionRole): boolean =>
  permissionRoleLevel[role] <= permissionRoleLevel[currentUserPermissionRole.value]
const getPermissionRoleLabel = (role: DashboardPermissionRole): string =>
  permissionRoleLabelMap[role]
const grantablePermissionRoleOptions = computed<SelectOption[]>(() =>
  permissionRoleOptions.map((option) => ({
    ...option,
    disabled: !canGrantPermissionRole(option.value as DashboardPermissionRole),
  })),
)
const quickGrantPrincipalOptions = computed<SelectOption[]>(() => {
  const keyword = shareSearchKeyword.value.trim().toLowerCase()
  const rows = [
    ...shareMembers.value.map((member) => ({
      label: `${member.name} · 用户 · ${member.description ?? ''}`,
      value: `member:${member.id}`,
      rawName: member.name,
    })),
    ...shareTeams.value.map((team) => ({
      label: `${team.name} · 用户组 · ${team.description ?? ''}`,
      value: `team:${team.id}`,
      rawName: team.name,
    })),
  ]

  return rows
    .filter((row) => !keyword || row.label.toLowerCase().includes(keyword) || row.rawName.toLowerCase().includes(keyword))
    .map(({ label, value }) => ({ label, value }))
})
const filteredShareGrantRows = computed(() => {
  const keyword = shareSearchKeyword.value.trim().toLowerCase()

  return shareGrantRows.value.filter((row) =>
    !keyword
    || row.principalName.toLowerCase().includes(keyword)
    || (row.description ?? '').toLowerCase().includes(keyword)
    || row.principalType.includes(keyword),
  )
})
const viewerMoreActionOptions: DropdownOption[] = [
  { label: '授权', key: 'share' },
  { label: '分享链接', key: 'viewer_share' },
  { label: '书签', key: 'bookmark' },
  { label: '新建订阅', key: 'subscription' },
  { label: '监控', key: 'monitor' },
  { label: 'Webhook 配置', key: 'webhook' },
  { label: '嵌出', key: 'embed' },
  { label: '评论', key: 'comment' },
  { label: '导出当前页 PNG', key: 'export_current' },
  { label: '导出全部页 PNG', key: 'export_all' },
  { label: '设为默认', key: 'set_default' },
  { label: '公告', key: 'announcement' },
  { label: '多语言', key: 'language' },
]
const layerActionOptions: DropdownOption[] = [
  { label: '置于顶层', key: 'top' },
  { label: '上移一层', key: 'up' },
  { label: '下移一层', key: 'down' },
  { label: '置于底层', key: 'bottom' },
]
const alignActionOptions: DropdownOption[] = [
  { label: '左对齐', key: 'left' },
  { label: '水平居中', key: 'center' },
  { label: '右对齐', key: 'right' },
  { label: '顶部对齐', key: 'top' },
  { label: '垂直居中', key: 'middle' },
  { label: '底部对齐', key: 'bottom' },
  { label: '水平等距', key: 'distribute_horizontal' },
  { label: '垂直等距', key: 'distribute_vertical' },
]
const zoomOptions: SelectOption[] = [
  { label: '50%', value: 50 },
  { label: '75%', value: 75 },
  { label: '100%', value: 100 },
  { label: '125%', value: 125 },
  { label: '150%', value: 150 },
]
const subscriptionScopeOptions = computed<SelectOption[]>(() => [
  { label: '全部页面', value: 'all_pages' },
  { label: '指定 sheet', value: 'selected_pages' },
  { label: '依据书签', value: 'bookmark', disabled: !(dashboard.value?.bookmarks?.length) },
  { label: '快捷书签', value: 'quick_bookmark' },
])
const subscriptionPushChannelOptions = computed<SelectOption[]>(() => [
  { label: '飞书', value: 'feishu' },
  { label: '飞书群', value: 'feishu_group', disabled: currentUserPermissionRole.value !== 'admin' },
  { label: '企业微信', value: 'wechat_work' },
  { label: '企业微信群', value: 'wechat_work_group', disabled: currentUserPermissionRole.value !== 'admin' },
  { label: 'Webex', value: 'webex' },
  { label: 'Webex 群', value: 'webex_group', disabled: currentUserPermissionRole.value !== 'admin' },
  { label: '邮件', value: 'email' },
  { label: '邮件组', value: 'email_group', disabled: currentUserPermissionRole.value !== 'admin' },
  { label: '钉钉', value: 'dingtalk' },
  { label: '钉钉群', value: 'dingtalk_group', disabled: currentUserPermissionRole.value !== 'admin' },
  { label: '钉钉普通群', value: 'dingtalk_normal_group', disabled: currentUserPermissionRole.value !== 'admin' },
  { label: '通用 IM', value: 'generic_im' },
  { label: 'Webhook', value: 'webhook' },
])
const subscriptionLanguageOptions: SelectOption[] = [
  { label: '自动', value: 'auto' },
  { label: '中文', value: 'zh-CN' },
  { label: '英文', value: 'en-US' },
]
const subscriptionContentOptions: SelectOption[] = [
  { label: '平铺大图', value: 'flat' },
  { label: '缩略小图', value: 'thumbnail' },
  { label: '不发送截图', value: 'none' },
]
const pageOptions = computed<SelectOption[]>(() =>
  pages.value.map((page) => ({ label: page.name, value: page.id })),
)
const bookmarkOptions = computed<SelectOption[]>(() =>
  (dashboard.value?.bookmarks ?? []).map((bookmark) => ({ label: bookmark.name, value: bookmark.id })),
)
const webhookConfigOptions = computed<SelectOption[]>(() =>
  webhookConfigs.value.map((config) => ({
    label: `${config.name} · ${config.interfaceType === 'api' ? 'API' : '机器人'}`,
    value: config.id,
  })),
)
const monitorTriggerFactorOptions: SelectOption[] = [
  { label: '指标值变化', value: 'metric_change' },
  { label: '维度值变化', value: 'dimension_change' },
  { label: '智能波动检测', value: 'smart_detection' },
]
const monitorTimeRangeOptions: SelectOption[] = [
  { label: '最近 1 个时间点', value: 'latest_one' },
  { label: '最近 N 个时间点', value: 'latest_n' },
  { label: '已选择时间范围', value: 'selected_range' },
]
const monitorCompareRangeOptions: SelectOption[] = [
  { label: '比 1 天前', value: '比 1 天前' },
  { label: '比 7 天前', value: '比 7 天前' },
  { label: '比 30 天前', value: '比 30 天前' },
  { label: '绝对值', value: '绝对值' },
  { label: '原始值', value: '原始值' },
  { label: '前一时间点', value: '前一时间点' },
  { label: '比前 7 天均值', value: '比前 7 天均值' },
  { label: '比前 30 天均值', value: '比前 30 天均值' },
]
const monitorCompareMethodOptions: SelectOption[] = [
  { label: '波动超过', value: 'fluctuation' },
  { label: '上升超过', value: 'increase' },
  { label: '下降超过', value: 'decrease' },
  { label: '大于', value: 'gt' },
  { label: '大于等于', value: 'gte' },
  { label: '小于', value: 'lt' },
  { label: '小于等于', value: 'lte' },
  { label: '等于', value: 'eq' },
]
const monitorValueTypeOptions: SelectOption[] = [
  { label: '固定数值', value: 'number' },
  { label: '百分比', value: 'percent' },
  { label: '其他指标', value: 'other_metric' },
]
const monitorPushChannelOptions: SelectOption[] = [
  { label: '飞书', value: 'feishu' },
  { label: '邮件', value: 'email' },
  { label: '企业微信', value: 'wechat_work' },
  { label: 'Webex', value: 'webex' },
  { label: '钉钉', value: 'dingtalk' },
  { label: 'Webhook', value: 'webhook' },
]
const webhookInterfaceTypeOptions: SelectOption[] = [
  { label: '系统 API', value: 'api' },
  { label: '通用 IM 机器人', value: 'generic_im_robot' },
  { label: '钉钉群机器人', value: 'dingtalk_robot' },
  { label: '企业微信群机器人', value: 'wechat_work_robot' },
  { label: '飞书外部群机器人', value: 'feishu_external_robot' },
]
const webhookSecretTypeOptions: SelectOption[] = [
  { label: '无 Secret', value: 'none' },
  { label: '静态 Token', value: 'static_token' },
  { label: '动态 Token', value: 'dynamic_token' },
]
const webhookEventOptions: SelectOption[] = [
  { label: '订阅推送', value: 'subscription_push' },
  { label: '评论事件', value: 'comment' },
  { label: '监控报警', value: 'monitor_alert' },
]
const groupSubscriptionChannels = new Set([
  'feishu_group',
  'wechat_work_group',
  'webex_group',
  'email_group',
  'dingtalk_group',
  'dingtalk_normal_group',
])
const subscriptionNeedsPermissionPrincipal = computed(() =>
  groupSubscriptionChannels.has(subscriptionDraft.value.pushChannel),
)
const subscriptionUsesWebhook = computed(() => subscriptionDraft.value.pushChannel === 'webhook')
const subscriptionReadinessIssues = computed(() =>
  pages.value
    .flatMap((page) => page.components)
    .filter((component) => component.widget && (component.widget.status === 'empty' || component.widget.status === 'error' || !component.widget.chartData.length))
    .map((component) => `${component.name}：${component.widget?.errorMessage ?? '暂无可推送数据'}`),
)
const componentOptions = computed<SelectOption[]>(() =>
  pages.value.flatMap((page) =>
    page.components
      .filter((component) => component.type === 'chart' || component.type === 'stitched_table')
      .map((component) => ({ label: `${page.name} / ${component.name}`, value: component.id })),
  ),
)
const embedTargetOptions = computed<SelectOption[]>(() => [
  { label: '整个仪表盘', value: 'dashboard' },
  ...currentPagesForView.value.flatMap((page) =>
    page.components
      .filter((component) => component.widget)
      .map((component) => ({ label: `${page.name} / ${component.name}`, value: component.id })),
  ),
])
const selectedEmbedComponent = computed(() =>
  currentPagesForView.value.flatMap((page) => page.components).find((component) => component.id === embedTargetComponentId.value) ?? null,
)
const monitorSelectedComponent = computed(() =>
  pages.value.flatMap((page) => page.components).find((component) => component.id === monitorDraft.value.componentId) ?? null,
)
const webhookTestStatusLabel = computed(() =>
  webhookTestStatus.value === 'success' ? '测试成功' : webhookTestStatus.value === 'failed' ? '测试失败' : '未测试',
)
const recentChartOptions = computed(() => {
  const keyword = recentChartSearch.value.trim().toLowerCase()
  const charts = pages.value
    .flatMap((page) => page.components)
    .filter((component) => component.widget)
    .map((component) => ({
      id: component.widget?.id ?? component.id,
      title: component.widget?.title ?? component.name,
      description: component.widget?.description ?? '当前用户可管理图表',
      chartType: component.widget?.chartType ?? component.widget?.widgetType ?? 'line',
      sourceAnalysisId: component.widget?.sourceAnalysisId ?? 'analysis-ad-watch-drop',
      updatedAt: component.updatedAt,
      widget: component.widget as DashboardWidgetAsset,
    }))
    .sort((chartA, chartB) => chartB.updatedAt.localeCompare(chartA.updatedAt))

  return charts
    .filter((chart) => !keyword || chart.title.toLowerCase().includes(keyword))
    .slice(0, 8)
})
const selectedProps = computed<Record<string, unknown>>(() => selectedComponent.value?.props ?? {})
const draftIntegrityIssues = computed(() =>
  pages.value
    .flatMap((page) => page.components.map((component) => ({ page, component })))
    .filter(({ component }) =>
      component.widget?.status === 'invalid'
      || component.widget?.status === 'error'
      || Boolean(component.props.datasetPermissionDenied)
      || String(component.props.datasetId ?? '').includes('deleted'),
    )
    .map(({ page, component }) => `${page.name} / ${component.name}：${component.widget?.errorMessage ?? '组件或数据集引用异常'}`),
)
const versionDeleteOptions = computed<SelectOption[]>(() =>
  (dashboard.value?.versions ?? [])
    .filter((version) => version.status === 'history')
    .map((version) => ({
      label: `V${version.versionNo} · ${version.description || '无描述'} · ${formatTime(version.createdAt)}`,
      value: version.id,
    })),
)
const consistencySourceLabel = computed(() =>
  dashboard.value?.publishMode === 'versioned'
    ? '消费侧读取当前已发布版本；编辑器、复制、替换数据集和预览读取最近保存草稿。'
    : '实时发布模式下保存即发布，消费侧读取最新保存内容。',
)
const selectedAppearance = computed<Record<string, unknown>>(() => ({
  fillColor: '#ffffff',
  borderColor: '#e5e7eb',
  borderWidth: 1,
  borderRadius: 8,
  ...((selectedProps.value.appearance as Record<string, unknown> | undefined) ?? {}),
}))
const selectedPadding = computed<Record<'top' | 'right' | 'bottom' | 'left', number>>(() => {
  const padding = (selectedProps.value.padding as Record<string, unknown> | undefined) ?? {}

  return {
    top: Number(padding.top ?? 12),
    right: Number(padding.right ?? 12),
    bottom: Number(padding.bottom ?? 12),
    left: Number(padding.left ?? 12),
  }
})
const selectedChartTitle = computed<Record<string, unknown>>(() => ({
  mode: 'global',
  customText: '',
  fontSize: 16,
  color: '#111827',
  ...((selectedProps.value.chartTitle as Record<string, unknown> | undefined) ?? {}),
}))
const selectedAnchor = computed<Record<string, unknown>>(() => ({
  enabled: false,
  name: '',
  order: 1,
  ...((selectedProps.value.anchor as Record<string, unknown> | undefined) ?? {}),
}))
const selectedTabs = computed<Array<{ id: string, name: string, order: number, layoutMode: string, componentIds: string[] }>>(() =>
  (selectedProps.value.tabs as Array<{ id: string, name: string, order: number, layoutMode: string, componentIds: string[] }> | undefined) ?? [],
)
const selectedRelationGraph = computed<{ nodes: unknown[], edges: unknown[] }>(() => {
  const relationGraph = (selectedProps.value.relationGraph as { nodes?: unknown[], edges?: unknown[] } | undefined) ?? {}

  return {
    nodes: relationGraph.nodes ?? [],
    edges: relationGraph.edges ?? [],
  }
})
const selectedStitchedTable = computed<{ mode: string, tableItems: unknown[] }>(() => {
  const stitchedTable = (selectedProps.value.stitchedTable as { mode?: string, tableItems?: unknown[] } | undefined) ?? {}

  return {
    mode: stitchedTable.mode ?? 'vertical',
    tableItems: stitchedTable.tableItems ?? [],
  }
})
const selectedTooltip = computed<Record<string, unknown>>(() => ({
  iconType: 'system',
  content: '',
  iconColor: '#2563eb',
  iconSize: 16,
  ...((selectedProps.value.tooltip as Record<string, unknown> | undefined) ?? {}),
}))
const selectedAnalysisTree = computed<Record<string, unknown>>(() => ({
  analysisTreeId: '',
  titleMode: 'global',
  visibleSections: { title: true, dateSelector: true, customCalculation: false, conclusion: true, nodeTree: true, nodeDetail: true },
  toolbarIcons: { comment: true, fullscreen: true, refresh: true, viewReport: true },
  ...((selectedProps.value.analysisTree as Record<string, unknown> | undefined) ?? {}),
}))
const selectedPlugin = computed<Record<string, unknown>>(() => ({
  enabled: false,
  pluginId: '',
  schemaState: {},
  ...((selectedProps.value.plugin as Record<string, unknown> | undefined) ?? {}),
}))
const selectedTopContainer = computed<TopContainerProps>(() => ({
  height: 120,
  childrenComponentIds: [],
  ...((selectedProps.value.topContainer as TopContainerProps | undefined) ?? {}),
}))
const selectedGlobalFilter = computed<GlobalFilterProps>(() => ({
  filters: [],
  linkedChartIds: [],
  pinned: false,
  showQueryButton: false,
  layoutStyle: 'inline',
  relation: 'AND',
  fieldBindings: [],
  ...((selectedProps.value.globalFilter as GlobalFilterProps | undefined) ?? {}),
}))
const selectedQueryContainer = computed<QueryContainerProps>(() => ({
  pinned: false,
  showQueryButton: true,
  childControlTypes: [],
  childComponentIds: [],
  ...((selectedProps.value.queryContainer as QueryContainerProps | undefined) ?? {}),
}))
const selectedDrillConfig = computed<DrillConfig>(() => ({
  ...createDefaultDrillConfig(),
  ...((selectedProps.value.drillConfig as DrillConfig | undefined) ?? {}),
}))
const selectedLinkageConfig = computed<LinkageConfig>(() => ({
  ...createDefaultLinkageConfig(),
  ...((selectedProps.value.linkageConfig as LinkageConfig | undefined) ?? {}),
}))
const selectedJumpConfig = computed<JumpConfig>(() => ({
  ...createDefaultJumpConfig(),
  ...((selectedProps.value.jumpConfig as JumpConfig | undefined) ?? {}),
}))
const selectedInteractionConfig = computed<InteractionEventConfig>(() => ({
  ...createDefaultInteractionConfig(),
  ...((selectedProps.value.interactionEventConfig as InteractionEventConfig | undefined) ?? {}),
}))
const selectedWebConfig = computed<WebComponentProps>(() => ({
  url: String(selectedProps.value.url ?? 'https://example.com'),
  urlType: 'external_web',
  carryToken: Boolean(selectedProps.value.carryToken),
  safeUrl: '',
  overridePinnedFilters: true,
  iframeSandbox: ['allow-scripts', 'allow-same-origin', 'allow-forms'],
  allowInteraction: true,
  allowEditEmbeddedContent: false,
  loadStatus: 'idle',
  errorMessage: '',
  ...((selectedProps.value.webConfig as WebComponentProps | undefined) ?? {}),
}))
const inferComponentWebUrlType = (url: string): WebComponentProps['urlType'] => {
  if (url.includes('/analysis-center/dashboards/') || url.includes('/dashboard/')) {
    return 'dashboard_embed'
  }

  if (url.includes('/embed/chart') || url.includes('chartId=')) {
    return 'chart_embed'
  }

  if (/feishu|larksuite|docs\.qq|yuque|notion/i.test(url)) {
    return 'cloud_doc'
  }

  return 'external_web'
}
const isValidWebUrl = (url: string): boolean => {
  try {
    const nextUrl = new URL(url)
    return ['http:', 'https:'].includes(nextUrl.protocol)
  } catch {
    return false
  }
}
const pinnedFilterQueryParams = computed(() => {
  const params = new URLSearchParams()

  Object.entries(filterState.value).forEach(([key, value]) => {
    if (value) {
      params.set(key, value)
    }
  })
  params.set('dynamic_field', dynamicField.value)
  params.set('global_parameter', globalParameter.value)

  return params
})
const drillBreadcrumbItems = computed(() => {
  if (!activeDrill.value) {
    return drillTrail.value.map((field, index) => ({ field, value: index === 0 ? '默认层级' : '' }))
  }

  return drillTrail.value.map((field, index) => ({
    field,
    value: activeDrill.value?.path[index]?.value ?? (index === 0 ? '默认层级' : ''),
  }))
})

const statusLabelMap: Record<DashboardWidgetAsset['status'], string> = {
  normal: '正常',
  loading: '刷新中',
  empty: '暂无数据',
  error: '查询失败',
  invalid: '配置失效',
}

const widgetTypeLabelMap: Record<DashboardWidgetAsset['widgetType'], string> = {
  metric_card: '指标卡',
  line: '折线图',
  stacked: '堆叠图',
  bar: '柱形图',
  dual_axis: '双轴图',
  donut: '环形图',
  pie: '饼图',
  percentage: '百分比图',
  cumulative: '累积图',
  table: '表格',
  retention_heatmap: '留存热力图',
  funnel: '漏斗图',
  distribution: '分布图',
}

const componentTypeLabels: Record<DashboardComponentType, string> = {
  chart: '图表',
  global_filter: '全局筛选器',
  dynamic_field: '维度/指标',
  global_parameter: '全局参数',
  query_container: '查询容器',
  tabs: '标签页',
  text: '文本',
  web: '网页',
  image: '图片',
  header_image: '头图',
  title_image: '标题图',
  divider: '分割线',
  relation_graph: '关系图',
  stitched_table: '拼接表格',
  tooltip: '提示框',
  analysis_tree: '分析树',
  plugin: '插件',
  top_container: '置顶容器',
}

const componentPalette: Array<{ type: DashboardComponentType, label: string }> = [
  { type: 'chart', label: '添加图表' },
  { type: 'global_filter', label: '全局筛选器' },
  { type: 'dynamic_field', label: '维度/指标' },
  { type: 'global_parameter', label: '全局参数' },
  { type: 'query_container', label: '查询容器' },
  { type: 'tabs', label: '标签页' },
  { type: 'text', label: '文本' },
  { type: 'web', label: '网页' },
  { type: 'image', label: '图片' },
  { type: 'header_image', label: '头图' },
  { type: 'title_image', label: '标题图' },
  { type: 'divider', label: '分割线' },
  { type: 'relation_graph', label: '关系图' },
  { type: 'stitched_table', label: '拼接表格' },
  { type: 'tooltip', label: '提示框' },
  { type: 'analysis_tree', label: '分析树' },
  { type: 'plugin', label: '插件' },
  { type: 'top_container', label: '置顶容器' },
]

const componentPaletteHelp: Record<DashboardComponentType, string> = {
  chart: '选择已有图表或新建图表。',
  global_filter: '统一控制多个图表筛选。',
  dynamic_field: '切换图表维度或指标。',
  global_parameter: '同步调整多个图表的公共参数。',
  query_container: '收纳筛选器和参数。',
  tabs: '在组件内组织多页内容。',
  text: '说明文字与链接。',
  web: '嵌入网页或嵌出链接。',
  image: '上传或引用图片。',
  header_image: '页面头图。',
  title_image: '标题视觉图。',
  divider: '分隔内容区域。',
  relation_graph: '用运算关系连接指标。',
  stitched_table: '拼接多张表格。',
  tooltip: '指标口径说明。',
  analysis_tree: '嵌入指标分析树。',
  plugin: '私有化插件市场能力。',
  top_container: '固定在页面顶部。',
}

const getPageActionOptions = (page: DashboardPage): DropdownOption[] => [
  { label: '重命名', key: 'rename' },
  { label: '复制', key: 'copy' },
  { label: '复制到其他仪表盘', key: 'copy_to_dashboard' },
  { label: page.visibleInViewMode ? '隐藏页面' : '取消隐藏', key: 'toggle_visible' },
  { label: '删除', key: 'delete' },
]

const getComponentHeaderActionOptions = (component: DashboardComponent): DropdownOption[] => [
  { label: '刷新', key: 'refresh' },
  { label: component.widget ? '嵌出图表' : '嵌出组件', key: 'embed_chart' },
  { label: '评论', key: 'comment' },
]

const getComponentMoreActionOptions = (component: DashboardComponent): DropdownOption[] => {
  const options: DropdownOption[] = [
    { label: '导出图片', key: 'export_image', disabled: !component.widget },
    { label: '复制数据', key: 'copy_data', disabled: !component.widget },
    { label: '复制到仪表盘', key: 'copy_to_dashboard', disabled: !component.widget },
    { label: '联系 Owner', key: 'contact_owner', disabled: !component.widget },
    { label: '聚焦下钻', key: 'drill_down', disabled: !component.widget },
    { label: '上钻', key: 'drill_up', disabled: !component.widget },
    { label: getChartFilterOverride(component.id).internalActive ? '恢复公共筛选' : '激活图内筛选', key: 'toggle_internal_filter', disabled: !component.widget },
    { label: getChartFilterOverride(component.id).hidden ? '显示图内控件' : '隐藏图内控件', key: 'toggle_filter_visible', disabled: !component.widget },
    { label: '单点联动', key: 'linkage_single' },
    { label: '多点联动', key: 'linkage_multi' },
    { label: '取消联动', key: 'linkage_clear' },
    { label: '跳转仪表盘', key: 'jump_dashboard' },
    { label: '跳转网页', key: 'jump_web' },
    { label: '智能归因', key: 'attribution' },
    { label: '交互事件', key: 'interaction_event' },
  ]

  if (component.type === 'stitched_table') {
    options.push({ label: '表格设置', key: 'table_config' })
  }

  return options
}

const themeOptions = computed<SelectOption[]>(() => [
  ...officialThemes.value.map((theme) => ({
    label: `${theme.name}${theme.id === 'classic' ? ' · 2026.05+' : ''}`,
    value: theme.id,
  })),
  ...(settings.value?.customThemes ?? []).map((theme) => ({
    label: `${theme.name} · ${theme.scope === 'project' ? '项目' : theme.scope === 'personal' ? '个人' : '系统'}`,
    value: theme.id,
  })),
])

const layoutModeOptions: SelectOption[] = [
  { label: '磁贴布局', value: 'tile' },
  { label: '自由布局', value: 'free' },
]

const adaptiveModeOptions: SelectOption[] = [
  { label: '不缩放', value: 'none' },
  { label: '宽高等比缩放', value: 'scale_both' },
  { label: '仅宽度自适应', value: 'scale_width_only' },
]
const canvasColorOptions: SelectOption[] = [
  { label: '浅灰', value: '#f7f9fc' },
  { label: '纯白', value: '#ffffff' },
  { label: '淡绿', value: '#f0fdf4' },
  { label: '深色', value: '#0f172a' },
]
const canvasSizeModeOptions: SelectOption[] = [
  { label: '预设尺寸', value: 'preset' },
  { label: '自定义尺寸', value: 'custom' },
  { label: '自适应容器', value: 'adaptive' },
]
const dashboardTargetOptions: SelectOption[] = [
  { label: '团队留存复盘仪表盘', value: 'dash-team-retention' },
  { label: '公共经营仪表盘', value: 'dash-public-operation' },
]
const imageSourceOptions: SelectOption[] = [
  { label: '官方图库', value: 'official' },
  { label: '本地上传', value: 'local_upload' },
  { label: 'URL 引用', value: 'url' },
]
const chartTitleModeOptions: SelectOption[] = [
  { label: '跟随图表标题', value: 'global' },
  { label: '自定义标题', value: 'custom' },
  { label: '隐藏标题', value: 'hidden' },
]
const descriptionModeOptions: SelectOption[] = [
  { label: '基础信息', value: 'basic' },
  { label: '字段说明', value: 'field' },
  { label: '口径说明', value: 'metric_definition' },
  { label: '更新时间', value: 'refresh_time' },
]
const toolbarIconOptions: SelectOption[] = [
  { label: '刷新', value: 'refresh' },
  { label: '下载', value: 'download' },
  { label: '评论', value: 'comment' },
  { label: '全屏', value: 'fullscreen' },
  { label: '嵌出', value: 'embed' },
]
const tooltipIconOptions: SelectOption[] = [
  { label: '评论', value: 'comment' },
  { label: '监控', value: 'monitor' },
  { label: '联动', value: 'linkage' },
  { label: '快捷查询', value: 'quick_query' },
]
const dividerLineOptions: SelectOption[] = [
  { label: '实线', value: 'solid' },
  { label: '虚线', value: 'dashed' },
  { label: '点线', value: 'dotted' },
]
const tableStitchModeOptions: SelectOption[] = [
  { label: '纵向拼接', value: 'vertical' },
  { label: '横向拼接', value: 'horizontal' },
]
const webUrlTypeOptions: SelectOption[] = [
  { label: '普通网页', value: 'external_web' },
  { label: '图表嵌出', value: 'chart_embed' },
  { label: '仪表盘嵌出', value: 'dashboard_embed' },
  { label: '云文档', value: 'cloud_doc' },
]
const targetDatasetOptions: SelectOption[] = [
  { label: '广告行为明细数据集 · 兼容', value: 'ds_ad_watch_detail_v2' },
  { label: '用户留存宽表 · 兼容', value: 'ds_user_retention' },
  { label: '财务订单明细 · 类型不兼容', value: 'ds_finance_order' },
]
const datasetMappingModeOptions: SelectOption[] = [
  { label: '数据源字段匹配', value: 'source_field' },
  { label: '数据集字段匹配', value: 'dataset_field' },
]
const datasetFieldTypeOptions: SelectOption[] = [
  { label: '文本', value: 'text' },
  { label: '数值', value: 'number' },
  { label: '日期', value: 'date' },
  { label: '时间', value: 'datetime' },
]
const quickQueryChartStyleOptions: SelectOption[] = [
  { label: '折线图', value: 'line' },
  { label: '柱状图', value: 'bar' },
  { label: '表格', value: 'table' },
]
const quickQueryGranularityOptions: SelectOption[] = [
  { label: '按日', value: 'day' },
  { label: '按周', value: 'week' },
  { label: '按月', value: 'month' },
]
const quickQueryAggregationOptions: SelectOption[] = [
  { label: '求和', value: 'sum' },
  { label: '平均', value: 'avg' },
  { label: '去重计数', value: 'count_distinct' },
]
const drillModeOptions: SelectOption[] = [
  { label: '数据集字段层级', value: 'dataset_hierarchy' },
  { label: '图表钻取设置', value: 'chart_setting' },
]
const drillFieldOptions: SelectOption[] = [
  { label: '大区', value: '大区' },
  { label: '省份', value: '省份' },
  { label: '城市', value: '城市' },
  { label: '广告位', value: '广告位' },
  { label: '用户金币分层', value: '用户金币分层' },
]
const linkageFieldOptions: SelectOption[] = [
  { label: '大区', value: '大区' },
  { label: '省份', value: '省份' },
  { label: '城市', value: '城市' },
  { label: '用户类型', value: '用户类型' },
  { label: '广告位', value: '广告位' },
]
const fieldTypeOptions: SelectOption[] = [
  { label: '文本', value: 'text' },
  { label: '数值', value: 'number' },
  { label: '日期', value: 'date' },
]
const jumpTypeOptions: SelectOption[] = [
  { label: '跳转至仪表盘', value: 'dashboard' },
  { label: '跳转至网页', value: 'web' },
]
const jumpOpenModeOptions: SelectOption[] = [
  { label: '新开窗口', value: 'new_window' },
  { label: '当前窗口', value: 'current_window' },
  { label: '居中弹窗', value: 'center_modal' },
  { label: '右侧弹窗', value: 'side_modal' },
]
const attributionGranularityOptions: SelectOption[] = [
  { label: '按日', value: 'day' },
  { label: '按周', value: 'week' },
  { label: '按月', value: 'month' },
]
const attributionModeOptions: SelectOption[] = [
  { label: '默认归因分析', value: 'default' },
  { label: '自定义归因分析', value: 'custom' },
]
const attributionJudgeOptions: SelectOption[] = [
  { label: '时序预测', value: 'time_series_prediction' },
  { label: '波动大于阈值', value: 'change_rate_threshold' },
]
const interactionChartScopeOptions: SelectOption[] = [
  { label: '普通图表', value: 'chart' },
  { label: '表格 / 明细表', value: 'table' },
  { label: '透视表', value: 'pivot' },
  { label: '直方图', value: 'histogram' },
]
const themeScopeOptions: SelectOption[] = [
  { label: '个人', value: 'personal' },
  { label: '项目', value: 'project' },
  { label: '系统', value: 'system' },
]
const filterTypeOptions: SelectOption[] = [
  { label: '普通筛选器', value: 'normal' },
  { label: '树状筛选器', value: 'tree' },
  { label: '组合筛选器', value: 'composite' },
  { label: '截止日期筛选器', value: 'deadline' },
]
const filterOperatorOptions: SelectOption[] = [
  { label: '等于', value: '=' },
  { label: '包含于', value: 'in' },
  { label: '大于等于', value: '>=' },
  { label: '小于等于', value: '<=' },
]
const filterLayoutStyleOptions: SelectOption[] = [
  { label: '横向排列', value: 'inline' },
  { label: '纵向排列', value: 'stacked' },
  { label: '紧凑模式', value: 'compact' },
]
const filterRelationOptions: SelectOption[] = [
  { label: 'AND', value: 'AND' },
  { label: 'OR', value: 'OR' },
]

const tableColumns = computed<DataTableColumns<DashboardWidgetTableRow>>(() => {
  const baseColumns: DataTableColumns<DashboardWidgetTableRow> = []

  if (tableVisibleFields.value.dimension) {
    baseColumns.push({ title: frozenColumn.value === 'dimension' ? '维度 📌' : '维度', key: 'dimension', minWidth: 160 })
  }

  if (tableVisibleFields.value.metric) {
    baseColumns.push({ title: frozenColumn.value === 'metric' ? '指标 📌' : '指标', key: 'metric', width: 130 })
  }

  if (tableVisibleFields.value.value) {
    baseColumns.push({ title: '值', key: 'value', width: 110 })
  }

  if (tableVisibleFields.value.change) {
    baseColumns.push({ title: '变化', key: 'change', width: 100 })
  }

  return baseColumns
})

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const formatTime = (value?: string): string => value ? value.replace('T', ' ').slice(0, 16) : '-'

const getWidgetStatusType = (status: DashboardWidgetAsset['status']): TagProps['type'] => {
  if (status === 'normal') {
    return 'success'
  }

  if (status === 'error' || status === 'invalid') {
    return 'error'
  }

  if (status === 'empty') {
    return 'warning'
  }

  return 'info'
}

const getThemeColor = (): string => {
  const themeColor = currentTheme.value?.chartConfig.discreteColorScheme?.[0]

  if (themeColor) {
    return themeColor
  }

  if (settings.value?.themeId === 'growth_green') {
    return '#18a058'
  }

  if (settings.value?.themeId === 'dark_screen') {
    return '#38bdf8'
  }

  if (settings.value?.themeId === 'operation_gray') {
    return '#64748b'
  }

  return '#2563eb'
}

const buildChartOption = (component: DashboardComponent): EChartsOption => {
  const widget = component.widget
  const quickQuery = quickQueryApplied.value[component.id]
  const chartData = widget?.chartData?.length
    ? widget.chartData
    : [
        { name: '05-20', value: 386200, compareValue: 410500 },
        { name: '05-21', value: 372400, compareValue: 408200 },
        { name: '05-22', value: 356920, compareValue: 407800 },
      ]
  const names = chartData.map((item) => item.name)
  const color = getThemeColor()

  if (widget?.widgetType === 'donut' || widget?.widgetType === 'pie') {
    return {
      color: [color, '#f59e0b', '#10b981', '#ef4444'],
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      series: [
        {
          name: component.name,
          type: 'pie',
          radius: widget.widgetType === 'donut' ? ['48%', '72%'] : '68%',
          data: chartData.map((item) => ({ name: item.name, value: item.value })),
        },
      ],
    }
  }

  if (quickQuery?.chartStyle === 'bar' || widget?.widgetType === 'bar' || widget?.widgetType === 'distribution') {
    return {
      color: [color],
      grid: { top: 24, right: 16, bottom: 32, left: 56 },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: names },
      yAxis: { type: 'value' },
      series: [{ name: quickQuery?.metric ?? component.name, type: 'bar', data: chartData.map((item) => item.value) }],
    }
  }

  return {
    color: [color, '#94a3b8'],
    grid: { top: 28, right: 16, bottom: 32, left: 56 },
    tooltip: { trigger: 'axis' },
    legend: { top: 0, right: 0 },
    xAxis: { type: 'category', boundaryGap: false, data: names },
    yAxis: { type: 'value' },
    series: [
      {
        name: quickQuery?.metric ?? '当前值',
        type: 'line',
        smooth: true,
        data: chartData.map((item) => item.value),
      },
      {
        name: '对比值',
        type: 'line',
        smooth: true,
        data: chartData.map((item) => item.compareValue ?? null),
      },
    ],
  }
}

const readEditorCache = (): EditorSnapshot | null => {
  try {
    const rawCache = window.localStorage.getItem(cacheKey.value)
    const parsed = rawCache ? JSON.parse(rawCache) as Partial<EditorSnapshot> : null

    if (parsed?.pages?.length && parsed.settings && typeof parsed.dashboardName === 'string') {
      return {
        pages: parsed.pages,
        settings: parsed.settings,
        dashboardName: parsed.dashboardName,
      }
    }
  } catch {
    window.localStorage.removeItem(cacheKey.value)
  }

  return null
}

const persistEditorCache = (): void => {
  if (!editMode.value || !dirty.value || !settings.value) {
    return
  }

  window.localStorage.setItem(cacheKey.value, JSON.stringify({
    ...snapshot(),
    updatedAt: new Date().toISOString(),
  }))
}

const clearEditorCache = (): void => {
  window.localStorage.removeItem(cacheKey.value)
}

const restoreCachedDraft = (): void => {
  if (!cachedEditorSnapshot.value) {
    return
  }

  restoreSnapshot(cachedEditorSnapshot.value)
  cacheRestoreVisible.value = false
  actionNotice.value = '已恢复本地编辑缓存，保存前不会影响线上版本。'
}

const discardCachedDraft = (): void => {
  clearEditorCache()
  cachedEditorSnapshot.value = null
  cacheRestoreVisible.value = false
  actionNotice.value = '已忽略本地缓存，继续使用服务端最新结构。'
}

const stopEditHeartbeat = (): void => {
  if (editHeartbeatTimer) {
    window.clearInterval(editHeartbeatTimer)
    editHeartbeatTimer = undefined
  }
}

const startEditHeartbeat = (): void => {
  stopEditHeartbeat()
  editHeartbeatTimer = window.setInterval(() => {
    if (!dashboard.value || !editMode.value) {
      return
    }

    void analysisCenterService.heartbeatDashboardEditLock(dashboard.value.id)
      .then((lock) => {
        editorLock.value = lock
        lockNotice.value = `编辑锁已续约至 ${formatTime(lock.expireAt)}`
      })
      .catch((error) => {
        lockNotice.value = error instanceof Error ? error.message : '编辑锁已失效'
      })
  }, 30_000)
}

const prepareEditSession = async (): Promise<void> => {
  if (!dashboard.value || dashboard.value.type === 'web') {
    return
  }

  try {
    editorLock.value = await analysisCenterService.acquireDashboardEditLock(dashboard.value.id)
    lockNotice.value = `编辑锁已获取，正在以 30 秒心跳续约。`
    startEditHeartbeat()
    undoStack.value = []
    redoStack.value = []
    cachedEditorSnapshot.value = readEditorCache()
    cacheRestoreVisible.value = Boolean(cachedEditorSnapshot.value)
  } catch (error) {
    editMode.value = false
    lockNotice.value = error instanceof Error ? error.message : '获取编辑锁失败'
    actionNotice.value = `${lockNotice.value}，已切换为阅览态。`
  }
}

const loadDashboard = async (): Promise<void> => {
  loading.value = true

  try {
    const result = await analysisCenterService.getDashboard(dashboardId.value)
    dashboard.value = result
    dashboardNameDraft.value = result.name
    if (result.type === 'web') {
      webFrameLoading.value = true
      webFrameError.value = false
      if (editMode.value) {
        editMode.value = false
        actionNotice.value = '网页仪表盘不允许进入普通编辑器，只能在列表页基础信息中维护名称、路径和 URL。'
      }
    }
    settings.value = clone(result.settings ?? {
      themeId: 'light',
      layoutMode: 'tile',
      canvasBackground: { color: '#f7f9fc', opacity: 100 },
      canvasSize: { mode: 'adaptive', width: 1440, height: 900 },
      viewMode: {
        anchorDefaultExpanded: true,
        toolbarGlobalControlEnabled: true,
        tooltipIconGlobalControlEnabled: true,
        toolbarDefaultCollapsed: false,
        visibleToolbarActions: ['refresh', 'fullscreen', 'bookmark', 'export', 'embed'],
        visibleTooltipIcons: ['comment', 'quick_query', 'monitor', 'linkage'],
        adaptiveWidthMode: 'scale_width_only',
      },
    })
    pages.value = clone(
      result.publishMode === 'versioned' && !editMode.value && !previewMode.value
        ? result.publishedPages ?? result.pages ?? []
        : result.pages ?? [],
    )
    activePageId.value = pages.value.find((page) => page.visibleInViewMode)?.id ?? pages.value[0]?.id ?? ''
    filterState.value = Object.fromEntries((result.globalFilters ?? []).map((filter) => [filter.id, filter.value]))
    appliedFilterState.value = { ...filterState.value }
    monitorDraft.value.componentId = componentOptions.value[0]?.value ? String(componentOptions.value[0].value) : ''
    if (editMode.value) {
      await prepareEditSession()
    }
  } finally {
    loading.value = false
  }
}

const loadSpaces = async (): Promise<void> => {
  spaces.value = await analysisCenterService.getSpaces()
}

const loadShareMeta = async (): Promise<void> => {
  if (!dashboard.value) {
    return
  }

  const [options, grants] = await Promise.all([
    analysisCenterService.getShareOptions(),
    analysisCenterService.getAssetShareGrants('dashboard', dashboard.value.id),
  ])
  shareMembers.value = options.members
  shareTeams.value = options.teams
  sharedMembers.value = grants.sharedMembers
  sharedTeams.value = grants.sharedTeams
}

const buildShareGrantRows = (): void => {
  const rows: ShareGrantRow[] = [
    ...sharedMembers.value.map((member) => ({
      id: `member:${member.id}`,
      principalId: member.id,
      principalName: member.name,
      principalType: 'member' as const,
      role: (member.id === 'u_mia' ? 'editor' : 'viewer') as DashboardPermissionRole,
      description: member.description,
      isSelf: member.id === 'u_chaoyang',
    })),
    ...sharedTeams.value.map((team) => ({
      id: `team:${team.id}`,
      principalId: team.id,
      principalName: team.name,
      principalType: 'team' as const,
      role: 'viewer' as DashboardPermissionRole,
      description: team.description,
      isSelf: false,
    })),
  ]

  const hasSelfAdmin = rows.some((row) => row.isSelf && row.role === 'admin')
  shareGrantRows.value = hasSelfAdmin || selfAdminRevoked.value
    ? rows
    : [
        {
          id: 'member:u_chaoyang',
          principalId: 'u_chaoyang',
          principalName: 'Chaoyang Xu',
          principalType: 'member',
          role: 'admin',
          description: '当前管理员',
          isSelf: true,
        },
        ...rows.filter((row) => row.principalId !== 'u_chaoyang'),
      ]
}

const addQuickShareGrant = (): void => {
  if (!quickGrantPrincipalId.value) {
    shareValidationError.value = '请选择要授权的用户或用户组。'
    return
  }

  if (!canGrantPermissionRole(quickGrantRole.value)) {
    shareValidationError.value = `当前角色只能授予不高于「${getPermissionRoleLabel(currentUserPermissionRole.value)}」的权限。`
    return
  }

  const [principalType, principalId] = quickGrantPrincipalId.value.split(':') as ['member' | 'team', string]
  const principal = principalType === 'member'
    ? shareMembers.value.find((member) => member.id === principalId)
    : shareTeams.value.find((team) => team.id === principalId)

  if (!principal) {
    shareValidationError.value = '未找到授权对象。'
    return
  }

  const nextRow: ShareGrantRow = {
    id: `${principalType}:${principalId}`,
    principalId,
    principalName: principal.name,
    principalType,
    role: quickGrantRole.value,
    description: principal.description,
    isSelf: principalId === 'u_chaoyang',
  }
  shareGrantRows.value = [
    nextRow,
    ...shareGrantRows.value.filter((row) => row.id !== nextRow.id),
  ]
  if (nextRow.isSelf) {
    selfAdminRevoked.value = nextRow.role !== 'admin'
  }
  if (principalType === 'member') {
    shareDraft.value.removeMemberIds = shareDraft.value.removeMemberIds.filter((memberId) => memberId !== principalId)
  } else {
    shareDraft.value.removeTeamIds = shareDraft.value.removeTeamIds.filter((teamId) => teamId !== principalId)
  }
  shareValidationError.value = ''
  quickGrantPrincipalId.value = ''
}

const updateShareGrantRole = (rowId: string, role: DashboardPermissionRole): void => {
  if (!canGrantPermissionRole(role)) {
    shareValidationError.value = `当前角色只能授予不高于「${getPermissionRoleLabel(currentUserPermissionRole.value)}」的权限。`
    return
  }

  shareGrantRows.value = shareGrantRows.value.map((row) => row.id === rowId ? { ...row, role } : row)
  const updatedRow = shareGrantRows.value.find((row) => row.id === rowId)
  if (updatedRow?.isSelf) {
    selfAdminRevoked.value = updatedRow.role !== 'admin'
  }
  shareValidationError.value = ''
}

const removeShareGrantRowDirectly = (row: ShareGrantRow): void => {
  const adminRows = shareGrantRows.value.filter((item) => item.role === 'admin')

  if (row.role === 'admin' && adminRows.length <= 1 && !isProjectAdmin.value) {
    shareValidationError.value = '最后一个管理员不可被移除，除非项目管理员操作。'
    return
  }

  shareGrantRows.value = shareGrantRows.value.filter((item) => item.id !== row.id)
  if (row.isSelf && row.role === 'admin') {
    selfAdminRevoked.value = true
  }
  if (row.principalType === 'member') {
    shareDraft.value.removeMemberIds = Array.from(new Set([...shareDraft.value.removeMemberIds, row.principalId]))
  } else {
    shareDraft.value.removeTeamIds = Array.from(new Set([...shareDraft.value.removeTeamIds, row.principalId]))
  }
  shareValidationError.value = ''
}

const removeShareGrantRow = (row: ShareGrantRow): void => {
  if (row.isSelf && row.role === 'admin') {
    shareValidationError.value = '移除自身管理权限需要二次确认，请在该行移除按钮的确认气泡中确认。'
    return
  }

  removeShareGrantRowDirectly(row)
}

const reloadWebFrame = (): void => {
  webFrameReloadKey.value += 1
  webFrameLoading.value = true
  webFrameError.value = false
}

const handleWebFrameLoad = (): void => {
  webFrameLoading.value = false
  webFrameError.value = false
}

const handleWebFrameError = (): void => {
  webFrameLoading.value = false
  webFrameError.value = true
}

const syncDashboardPatch = async (patch: Partial<DashboardAsset>): Promise<void> => {
  if (!dashboard.value) {
    return
  }

  dashboard.value = await analysisCenterService.updateDashboardState(dashboard.value.id, patch)
}

const snapshot = (): EditorSnapshot => ({
  pages: clone(pages.value),
  settings: clone(settings.value as DashboardSettings),
  dashboardName: dashboardNameDraft.value || dashboard.value?.name || '',
})

const restoreSnapshot = (nextSnapshot: EditorSnapshot): void => {
  pages.value = clone(nextSnapshot.pages)
  settings.value = clone(nextSnapshot.settings)
  dashboardNameDraft.value = nextSnapshot.dashboardName
  if (dashboard.value) {
    dashboard.value.name = nextSnapshot.dashboardName
  }
  activePageId.value = pages.value[0]?.id ?? ''
  selectedComponentId.value = ''
  selectedComponentIds.value = []
  dirty.value = true
}

const pushUndo = (): void => {
  if (!settings.value) {
    return
  }

  undoStack.value = [...undoStack.value.slice(-19), snapshot()]
  redoStack.value = []
}

const normalizeTileLayout = (): void => {
  const page = activePage.value

  if (!page || settings.value?.layoutMode !== 'tile') {
    return
  }

  let tileIndex = 0
  page.components = page.components.map((component) => {
    if (component.layout.floating) {
      return component
    }

    const nextComponent = {
      ...component,
      layout: {
        ...component.layout,
        x: tileIndex % 2,
        y: Math.floor(tileIndex / 2),
        width: component.layout.width > 2 ? 2 : Math.max(component.layout.width, 1),
        height: Math.max(component.layout.height, 1),
      },
    }
    tileIndex += 1
    return nextComponent
  })
}

const markDirty = (): void => {
  dirty.value = true
  normalizeTileLayout()
}

const createSampleWidget = (type: DashboardComponentType, id: string): DashboardWidgetAsset | undefined => {
  if (type !== 'chart' && type !== 'stitched_table') {
    return undefined
  }

  return {
    id: `${id}_widget`,
    title: type === 'stitched_table' ? '广告明细表' : '广告观看趋势',
    description: '来自可视化查询的保存图表。',
    widgetType: type === 'stitched_table' ? 'table' : 'line',
    chartType: type === 'stitched_table' ? 'table' : 'line',
    sourceAnalysisId: 'analysis-ad-watch-drop',
    sourceAnalysisType: 'event',
    acceptGlobalTime: true,
    acceptGlobalFilters: true,
    status: 'normal',
    refreshStatus: 'normal',
    lastRefreshAt: new Date().toISOString(),
    tableRows: [
      { dimension: '低金币用户', metric: '广告观看次数', value: '356,920', change: '-12.4%' },
      { dimension: '高金币用户', metric: '广告观看次数', value: '183,450', change: '+2.1%' },
      { dimension: '新用户', metric: '广告观看次数', value: '92,180', change: '-4.8%' },
    ],
    chartData: [
      { name: '05-20', value: 386200, compareValue: 410500 },
      { name: '05-21', value: 372400, compareValue: 408200 },
      { name: '05-22', value: 356920, compareValue: 407800 },
    ],
  }
}

const createFilterItem = (type: FilterItemDraft['type'] = 'normal', index = 1): FilterItemDraft => ({
  id: `filter_${type}_${Date.now()}_${index}`,
  type,
  name: type === 'tree' ? 'region_tree' : type === 'deadline' ? 'okr_deadline' : type === 'composite' ? 'composite_condition' : 'user_segment',
  displayName: type === 'tree' ? '地区树' : type === 'deadline' ? '截止日期' : type === 'composite' ? '组合条件' : '用户分群',
  operator: type === 'deadline' ? '<=' : 'in',
  defaultValue: type === 'deadline' ? 'T-1' : '低金币用户',
  value: type === 'deadline' ? 'T-1' : '低金币用户',
  multiple: type !== 'deadline',
  visible: true,
  childFilters: [],
})

const createDefaultDrillConfig = (): DrillConfig => ({
  enabled: true,
  mode: 'dataset_hierarchy',
  hierarchyFields: ['大区', '省份', '城市'],
  drillableFields: ['大区', '省份'],
  datasetEditPermission: true,
  datasetViewPermission: true,
})

const createDefaultLinkageConfig = (): LinkageConfig => ({
  enabled: true,
  targetComponentIds: [],
  fieldMappings: [
    { sourceField: '省份', targetField: '省份', sourceType: 'text', targetType: 'text', status: 'valid' },
  ],
  includeDrillFields: true,
})

const createDefaultJumpConfig = (): JumpConfig => ({
  enabled: true,
  rules: [
    {
      id: 'jump_dashboard_default',
      fieldName: '省份',
      jumpType: 'dashboard',
      targetDashboardId: 'dash-team-retention',
      passFilters: true,
      fieldMappings: [{ sourceField: '省份', targetFilter: 'province' }],
      urlTemplate: 'https://www.baidu.com/s?wd={省份}',
      includeGlobalFilters: true,
      openMode: 'center_modal',
      priority: 'dashboard_level',
    },
    {
      id: 'jump_web_default',
      fieldName: '省份',
      jumpType: 'web',
      targetDashboardId: '',
      passFilters: false,
      fieldMappings: [],
      urlTemplate: 'https://www.baidu.com/s?wd={省份}',
      includeGlobalFilters: true,
      openMode: 'center_modal',
      priority: 'template_link',
    },
  ],
})

const createDefaultInteractionConfig = (): InteractionEventConfig => ({
  enabled: true,
  privateDeploymentEnabled: true,
  allowOrigins: ['https://ops.example.com'],
  rules: [
    {
      id: 'interaction_default',
      fieldName: '省份',
      eventName: 'dashboard_component_click',
      eventType: 'post_message',
      chartScope: 'chart',
    },
  ],
})

const createDefaultComponentProps = (type: DashboardComponentType): Record<string, unknown> => ({
  text: type === 'text' ? '请输入说明文字' : '核心指标说明',
  richText: [],
  textStyle: { color: '#374151', fontSize: 14, fontWeight: 400, lineHeight: 1.6, letterSpacing: 0 },
  url: type === 'web' ? 'https://example.com' : '',
  carryToken: false,
  showToolbarIcon: true,
  webConfig: {
    url: type === 'web' ? 'https://example.com' : '',
    urlType: 'external_web',
    carryToken: false,
    safeUrl: type === 'web' ? 'https://example.com' : '',
    overridePinnedFilters: true,
    iframeSandbox: ['allow-scripts', 'allow-same-origin', 'allow-forms'],
    allowInteraction: true,
    allowEditEmbeddedContent: false,
    loadStatus: 'idle',
    errorMessage: '',
  } satisfies WebComponentProps,
  sourceType: 'official',
  imageUrl: type === 'header_image' ? 'https://images.unsplash.com/photo-1497366754035-f200968a6e72' : 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee',
  padding: { top: 12, right: 12, bottom: 12, left: 12 },
  appearance: { fillColor: '#ffffff', borderColor: '#e5e7eb', borderWidth: 1, borderRadius: 8 },
  chartTitle: { mode: 'global', customText: '', fontSize: 16, color: '#111827', fontWeight: 600, italic: false, underline: false },
  descriptionMode: ['basic', 'field'],
  visibleToolbarIcons: ['refresh', 'download', 'comment'],
  visibleTooltipIcons: ['comment', 'monitor', 'linkage'],
  anchor: { enabled: false, name: '', order: 1 },
  loadingAnimation: true,
  updateAnimation: true,
  followDashboardTheme: true,
  pinned: false,
  topContainer: {
    height: 120,
    childrenComponentIds: [],
  },
  globalFilter: {
    filters: [createFilterItem('normal', 1), createFilterItem('tree', 2)],
    linkedChartIds: [],
    pinned: false,
    showQueryButton: false,
    layoutStyle: 'inline',
    relation: 'AND',
    fieldBindings: [
      {
        chartId: 'all',
        datasetId: 'ds_ad_watch_detail',
        sourceFieldId: 'city',
        targetFilterFieldId: 'city_name',
        fieldType: 'text',
      },
    ],
  } satisfies GlobalFilterProps,
  dynamicFieldConfig: {
    linkedChartIds: [],
    defaultField: 'city',
    fieldOptions: ['城市', '用户金币分层', '广告位', '入口来源'],
    crossDatasetMapping: '数据集 A「城市」= 数据集 B「地点」',
    style: 'segmented',
  },
  globalParameterConfig: {
    parameters: [
      { id: 'param_user_segment', name: '用户分群', defaultValue: '低金币用户', visible: true },
    ],
    linkedChartIds: [],
    style: 'select',
  },
  queryContainer: {
    pinned: false,
    showQueryButton: true,
    childControlTypes: ['global_filter', 'dynamic_field', 'global_parameter'],
    childComponentIds: [],
  } satisfies QueryContainerProps,
  datasetId: type === 'chart' ? '' : 'ds_user_retention',
  mapping: '用户 ID -> user_id，城市 -> city_name',
  queryButtonEnabled: queryButtonEnabled.value,
  jumpTemplate: 'https://www.baidu.com/s?wd={省份}',
  drillPath: ['大区', '省份', '城市'],
  drillConfig: createDefaultDrillConfig(),
  linkageConfig: createDefaultLinkageConfig(),
  jumpConfig: createDefaultJumpConfig(),
  interactionEventConfig: createDefaultInteractionConfig(),
  divider: { lineType: 'solid', thickness: 2, color: '#94a3b8' },
  tabs: [
    { id: 'tab_default', name: '默认标签', order: 0, layoutMode: 'inherit', componentIds: [] },
  ],
  activeTabId: 'tab_default',
  relationGraph: {
    nodes: [
      { id: 'node_revenue', type: 'metric_card', label: '广告收益', value: 128430 },
      { id: 'node_cost', type: 'constant', label: '成本', value: 35690 },
    ],
    edges: [{ id: 'edge_1', sourceNodeId: 'node_revenue', targetNodeId: 'node_cost', operator: '-' }],
  },
  stitchedTable: {
    mode: 'vertical',
    tableItems: [{ id: 'table_1', chartId: 'chart_ad_table', order: 0, alias: '广告明细' }],
  },
  tooltip: { iconType: 'system', content: '指标口径说明', iconColor: '#2563eb', iconSize: 16 },
  analysisTree: {
    analysisTreeId: 'tree_ad_attribution',
    titleMode: 'global',
    visibleSections: { title: true, dateSelector: true, customCalculation: false, conclusion: true, nodeTree: true, nodeDetail: true },
    linkedGlobalDateFilterId: 'time_range',
    toolbarIcons: { comment: true, fullscreen: true, refresh: true, viewReport: true },
  },
  plugin: { enabled: false, pluginId: '', schemaState: {} },
})

const createComponent = (type: DashboardComponentType): DashboardComponent | null => {
  const page = activePage.value
  const currentDashboard = dashboard.value

  if (!page || !currentDashboard) {
    return null
  }

  const id = `component_${type}_${Date.now()}`
  const order = page.components.length
  const widget = type === 'chart' ? undefined : createSampleWidget(type, id)

  return {
    id,
    dashboardId: currentDashboard.id,
    pageId: page.id,
    type,
    name: type === 'chart' ? '空图表' : componentTypeLabels[type],
    order,
    zIndex: order + 1,
    layout: {
      x: type === 'top_container' ? 0 : settings.value?.layoutMode === 'free' ? order % 4 : order % 2,
      y: type === 'top_container' ? 0 : settings.value?.layoutMode === 'free' ? order % 3 : Math.floor(order / 2),
      width: type === 'top_container' ? 2 : type === 'chart' || type === 'stitched_table' || type === 'web' ? 2 : 1,
      height: type === 'top_container' ? 1 : type === 'text' || type === 'divider' ? 1 : 2,
      floating: type === 'top_container' ? false : settings.value?.layoutMode === 'free',
      minWidth: 1,
      minHeight: 1,
    },
    visible: true,
    props: createDefaultComponentProps(type),
    widget,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

const addComponent = (type: DashboardComponentType): void => {
  const page = activePage.value

  if (type === 'plugin') {
    pluginMarketVisible.value = true
    return
  }

  if (
    type === 'top_container'
    && page?.components.some((component) =>
      component.type === 'top_container'
      || Boolean(component.props.pinned)
      || Boolean((component.props.globalFilter as GlobalFilterProps | undefined)?.pinned)
      || Boolean((component.props.queryContainer as QueryContainerProps | undefined)?.pinned),
    )
  ) {
    actionNotice.value = '当前页面已有置顶容器类能力，请先取消已有置顶控件或删除后再添加。'
    return
  }

  const component = createComponent(type)

  if (!page || !component) {
    return
  }

  pushUndo()
  page.components = [...page.components, component]
  selectedComponentId.value = component.id
  markDirty()
}

const updateComponent = (componentId: string, patch: Partial<DashboardComponent>): void => {
  const page = activePage.value

  if (!page) {
    return
  }

  page.components = page.components.map((component) =>
    component.id === componentId ? { ...component, ...patch, updatedAt: new Date().toISOString() } : component,
  )
  markDirty()
}

const updateSelectedComponentProps = (patch: Record<string, unknown>): void => {
  const component = selectedComponent.value

  if (!component) {
    return
  }

  pushUndo()
  updateComponent(component.id, {
    props: {
      ...component.props,
      ...patch,
    },
  })
}

const updateSelectedAppearance = (patch: Record<string, unknown>): void => {
  const component = selectedComponent.value

  if (!component) {
    return
  }

  updateSelectedComponentProps({
    appearance: {
      ...((component.props.appearance as Record<string, unknown>) ?? {}),
      ...patch,
    },
  })
}

const updateSelectedPadding = (side: 'top' | 'right' | 'bottom' | 'left', value: number | null): void => {
  const component = selectedComponent.value

  if (!component) {
    return
  }

  updateSelectedComponentProps({
    padding: {
      ...((component.props.padding as Record<string, unknown>) ?? {}),
      [side]: Math.max(Number(value ?? 0), 0),
    },
  })
}

const updateSelectedTopContainer = (patch: Partial<TopContainerProps>): void => {
  const current = (selectedProps.value.topContainer as TopContainerProps | undefined) ?? { height: 120, childrenComponentIds: [] }

  updateSelectedComponentProps({
    topContainer: {
      ...current,
      ...patch,
      height: Math.max(Number(patch.height ?? current.height), 72),
    },
  })
}

const updateSelectedGlobalFilter = (patch: Partial<GlobalFilterProps>): void => {
  const current = (selectedProps.value.globalFilter as GlobalFilterProps | undefined) ?? {
    filters: [],
    linkedChartIds: [],
    pinned: false,
    showQueryButton: false,
    layoutStyle: 'inline',
    relation: 'AND',
    fieldBindings: [],
  }

  updateSelectedComponentProps({
    globalFilter: {
      ...current,
      ...patch,
    },
    pinned: patch.pinned ?? selectedProps.value.pinned,
  })
}

const updateSelectedQueryContainer = (patch: Partial<QueryContainerProps>): void => {
  const current = (selectedProps.value.queryContainer as QueryContainerProps | undefined) ?? {
    pinned: false,
    showQueryButton: true,
    childControlTypes: [],
    childComponentIds: [],
  }

  updateSelectedComponentProps({
    queryContainer: {
      ...current,
      ...patch,
    },
    pinned: patch.pinned ?? selectedProps.value.pinned,
  })
}

const setSelectedPinned = (value: boolean): void => {
  const component = selectedComponent.value

  if (!component) {
    return
  }

  const hasOtherTopCapability = (activePage.value?.components ?? []).some((item) => {
    if (item.id === component.id) {
      return false
    }

    return item.type === 'top_container'
      || Boolean(item.props.pinned)
      || Boolean((item.props.globalFilter as GlobalFilterProps | undefined)?.pinned)
      || Boolean((item.props.queryContainer as QueryContainerProps | undefined)?.pinned)
  })

  if (value && hasOtherTopCapability) {
    actionNotice.value = '同页面只允许一个置顶容器类能力，请先取消已有置顶。'
    return
  }

  if (component.type === 'global_filter') {
    updateSelectedGlobalFilter({ pinned: value })
    return
  }

  if (component.type === 'query_container') {
    updateSelectedQueryContainer({ pinned: value })
    return
  }

  updateSelectedComponentProps({ pinned: value })
}

const addSelectedToTopContainer = (): void => {
  const page = activePage.value
  const container = topContainerComponent.value
  const component = selectedComponent.value

  if (!page || !container || !component || component.type === 'top_container') {
    actionNotice.value = '请先选中一个普通控件，并确保页面已有置顶容器。'
    return
  }

  const topContainer = (container.props.topContainer as TopContainerProps | undefined) ?? { height: 120, childrenComponentIds: [] }
  if (topContainer.childrenComponentIds.includes(component.id)) {
    actionNotice.value = '该控件已经在置顶容器内。'
    return
  }

  pushUndo()
  page.components = page.components.map((item) => {
    if (item.id === container.id) {
      return {
        ...item,
        props: {
          ...item.props,
          topContainer: {
            ...topContainer,
            childrenComponentIds: [...topContainer.childrenComponentIds, component.id],
          },
        },
        updatedAt: new Date().toISOString(),
      }
    }

    if (item.id === component.id) {
      return {
        ...item,
        props: {
          ...item.props,
          topContainerId: container.id,
        },
        updatedAt: new Date().toISOString(),
      }
    }

    return item
  })
  markDirty()
  actionNotice.value = `已将「${component.name}」放入置顶容器。`
}

const removeComponentFromTopContainer = (componentId: string): void => {
  const page = activePage.value
  const container = topContainerComponent.value

  if (!page || !container) {
    return
  }

  const topContainer = (container.props.topContainer as TopContainerProps | undefined) ?? { height: 120, childrenComponentIds: [] }
  pushUndo()
  page.components = page.components.map((item) => {
    if (item.id === container.id) {
      return {
        ...item,
        props: {
          ...item.props,
          topContainer: {
            ...topContainer,
            childrenComponentIds: topContainer.childrenComponentIds.filter((id) => id !== componentId),
          },
        },
        updatedAt: new Date().toISOString(),
      }
    }

    if (item.id === componentId) {
      const nextProps = { ...item.props }
      delete nextProps.topContainerId
      return { ...item, props: nextProps, updatedAt: new Date().toISOString() }
    }

    return item
  })
  markDirty()
}

const addGlobalFilterItem = (type: FilterItemDraft['type'] = 'normal'): void => {
  const current = (selectedProps.value.globalFilter as GlobalFilterProps | undefined)

  if (!current) {
    return
  }

  updateSelectedGlobalFilter({
    filters: [...current.filters, createFilterItem(type, current.filters.length + 1)],
  })
}

const updateGlobalFilterItem = (filterId: string, patch: Partial<FilterItemDraft>): void => {
  const current = (selectedProps.value.globalFilter as GlobalFilterProps | undefined)

  if (!current) {
    return
  }

  updateSelectedGlobalFilter({
    filters: current.filters.map((filter) => filter.id === filterId ? { ...filter, ...patch } : filter),
  })
}

const addChildFilterItem = (filterId: string): void => {
  const current = (selectedProps.value.globalFilter as GlobalFilterProps | undefined)

  if (!current) {
    return
  }

  updateSelectedGlobalFilter({
    filters: current.filters.map((filter) =>
      filter.id === filterId
        ? {
            ...filter,
            childFilters: [...(filter.childFilters ?? []), createFilterItem('normal', (filter.childFilters ?? []).length + 1)],
          }
        : filter,
    ),
  })
}

const addControlToQueryContainer = (type: 'global_filter' | 'dynamic_field' | 'global_parameter'): void => {
  const component = selectedComponent.value
  const queryContainer = (selectedProps.value.queryContainer as QueryContainerProps | undefined)

  if (!component || component.type !== 'query_container' || !queryContainer) {
    return
  }

  updateSelectedQueryContainer({
    childControlTypes: [...queryContainer.childControlTypes, type],
  })
}

const buildWebSafeUrl = (webConfig: WebComponentProps): string => {
  if (!isValidWebUrl(webConfig.url)) {
    return ''
  }

  const nextUrl = new URL(webConfig.url)

  if (webConfig.carryToken) {
    nextUrl.searchParams.set('access_token', 'demo-secure-token')
  }

  if (webConfig.overridePinnedFilters) {
    pinnedFilterQueryParams.value.forEach((value, key) => {
      if (value) {
        nextUrl.searchParams.set(key, value)
      }
    })
  }

  return nextUrl.toString()
}

const selectedWebSafeUrl = computed(() => {
  const safeUrl = buildWebSafeUrl(selectedWebConfig.value)

  if (!safeUrl || !selectedWebConfig.value.overridePinnedFilters) {
    return safeUrl
  }

  const nextUrl = new URL(safeUrl)
  nextUrl.searchParams.set('dynamic_field', dynamicField.value || '广告观看次数')
  nextUrl.searchParams.set('global_parameter', globalParameter.value || 'low_coin')
  return nextUrl.toString()
})
const selectedWebErrorMessage = computed(() => selectedWebSafeUrl.value ? selectedWebConfig.value.errorMessage : 'URL 必须是合法的 http/https 地址。')

const getComponentWebConfig = (component: DashboardComponent): WebComponentProps => {
  const propsConfig = component.props.webConfig as WebComponentProps | undefined
  const url = String(propsConfig?.url ?? component.props.url ?? 'https://example.com')
  const nextConfig: WebComponentProps = {
    url,
    urlType: propsConfig?.urlType ?? inferComponentWebUrlType(url),
    carryToken: Boolean(propsConfig?.carryToken ?? component.props.carryToken),
    safeUrl: '',
    overridePinnedFilters: propsConfig?.overridePinnedFilters ?? true,
    iframeSandbox: propsConfig?.iframeSandbox ?? ['allow-scripts', 'allow-same-origin', 'allow-forms'],
    allowInteraction: propsConfig?.allowInteraction ?? true,
    allowEditEmbeddedContent: propsConfig?.allowEditEmbeddedContent ?? false,
    loadStatus: propsConfig?.loadStatus ?? 'idle',
    errorMessage: propsConfig?.errorMessage ?? '',
  }
  nextConfig.allowEditEmbeddedContent = nextConfig.urlType === 'dashboard_embed' ? false : nextConfig.allowEditEmbeddedContent
  nextConfig.safeUrl = buildWebSafeUrl(nextConfig)
  nextConfig.errorMessage = nextConfig.safeUrl ? nextConfig.errorMessage : 'URL 必须是合法的 http/https 地址。'

  return nextConfig
}

const updateSelectedWebConfig = (patch: Partial<WebComponentProps>): void => {
  const current = selectedWebConfig.value
  const nextConfig: WebComponentProps = {
    ...current,
    ...patch,
  }
  nextConfig.urlType = patch.urlType ?? inferComponentWebUrlType(nextConfig.url)
  nextConfig.allowEditEmbeddedContent = nextConfig.urlType === 'dashboard_embed' ? false : nextConfig.allowEditEmbeddedContent
  nextConfig.safeUrl = buildWebSafeUrl(nextConfig)
  nextConfig.loadStatus = nextConfig.safeUrl ? 'loading' : 'error'
  nextConfig.errorMessage = nextConfig.safeUrl ? '' : 'URL 必须是合法的 http/https 地址。'

  updateSelectedComponentProps({
    url: nextConfig.url,
    carryToken: nextConfig.carryToken,
    webConfig: nextConfig,
  })
}

const setComponentWebStatus = (component: DashboardComponent, status: WebComponentProps['loadStatus'], errorMessage = ''): void => {
  const page = activePage.value

  if (!page) {
    return
  }

  page.components = page.components.map((item) => {
    if (item.id !== component.id) {
      return item
    }

    const currentConfig = getComponentWebConfig(item)
    return {
      ...item,
      props: {
        ...item.props,
        webConfig: {
          ...currentConfig,
          loadStatus: status,
          errorMessage,
        },
      },
      updatedAt: new Date().toISOString(),
    }
  })
}

const handleComponentWebLoad = (component: DashboardComponent): void => {
  setComponentWebStatus(component, 'loaded')
}

const handleComponentWebError = (component: DashboardComponent): void => {
  setComponentWebStatus(component, 'error', '目标网页不允许 iframe 嵌入或加载失败。')
}

const updateSelectedChartTitle = (patch: Record<string, unknown>): void => {
  updateSelectedComponentProps({
    chartTitle: {
      ...selectedChartTitle.value,
      ...patch,
    },
  })
}

const updateSelectedAnchor = (patch: Record<string, unknown>): void => {
  updateSelectedComponentProps({
    anchor: {
      ...selectedAnchor.value,
      ...patch,
    },
  })
}

const updateSelectedDivider = (patch: Record<string, unknown>): void => {
  const divider = (selectedProps.value.divider as Record<string, unknown> | undefined) ?? {}

  updateSelectedComponentProps({
    divider: {
      ...divider,
      ...patch,
    },
  })
}

const updateSelectedTooltip = (patch: Record<string, unknown>): void => {
  updateSelectedComponentProps({
    tooltip: {
      ...selectedTooltip.value,
      ...patch,
    },
  })
}

const updateSelectedAnalysisTree = (patch: Record<string, unknown>): void => {
  updateSelectedComponentProps({
    analysisTree: {
      ...selectedAnalysisTree.value,
      ...patch,
    },
  })
}

const updateSelectedAnalysisTreeSections = (patch: Record<string, boolean>): void => {
  const sections = (selectedAnalysisTree.value.visibleSections as Record<string, boolean> | undefined) ?? {}

  updateSelectedAnalysisTree({
    visibleSections: {
      ...sections,
      ...patch,
    },
  })
}

const updateSelectedPlugin = (patch: Record<string, unknown>): void => {
  updateSelectedComponentProps({
    plugin: {
      ...selectedPlugin.value,
      ...patch,
    },
  })
}

const updateSelectedComponentsCommon = (updater: (component: DashboardComponent) => DashboardComponent): void => {
  const page = activePage.value
  const targets = selectedComponents.value

  if (!page || !targets.length) {
    return
  }

  pushUndo()
  const targetIds = new Set(targets.map((component) => component.id))
  page.components = page.components.map((component) => targetIds.has(component.id) ? updater(component) : component)
  markDirty()
}

const updateBatchVisible = (value: boolean): void => {
  updateSelectedComponentsCommon((component) => ({ ...component, visible: value, updatedAt: new Date().toISOString() }))
}

const updateBatchFloating = (value: boolean): void => {
  updateSelectedComponentsCommon((component) => ({
    ...component,
    layout: {
      ...component.layout,
      floating: value,
    },
    updatedAt: new Date().toISOString(),
  }))
}

const updateBatchAppearance = (patch: Record<string, unknown>): void => {
  updateSelectedComponentsCommon((component) => ({
    ...component,
    props: {
      ...component.props,
      appearance: {
        ...((component.props.appearance as Record<string, unknown> | undefined) ?? {}),
        ...patch,
      },
    },
    updatedAt: new Date().toISOString(),
  }))
}

const addTabToSelectedComponent = (): void => {
  const component = selectedComponent.value
  const tabs = (component?.props.tabs as Array<{ id: string, name: string, order: number, layoutMode: string, componentIds: string[] }> | undefined) ?? []

  if (!component || component.type !== 'tabs') {
    return
  }

  updateSelectedComponentProps({
    tabs: [
      ...tabs,
      {
        id: `tab_${Date.now()}`,
        name: `标签 ${tabs.length + 1}`,
        order: tabs.length,
        layoutMode: 'inherit',
        componentIds: [],
      },
    ],
  })
}

const renameSelectedTab = (tabId: string, name: string): void => {
  const component = selectedComponent.value
  const tabs = (component?.props.tabs as Array<{ id: string, name: string, order: number, layoutMode: string, componentIds: string[] }> | undefined) ?? []

  if (!component || component.type !== 'tabs' || !name.trim()) {
    return
  }

  updateSelectedComponentProps({
    tabs: tabs.map((tab) => tab.id === tabId ? { ...tab, name: name.trim() } : tab),
  })
}

const deleteSelectedTab = (tabId: string): void => {
  const component = selectedComponent.value
  const tabs = (component?.props.tabs as Array<{ id: string, name: string, order: number, layoutMode: string, componentIds: string[] }> | undefined) ?? []

  if (!component || component.type !== 'tabs' || tabs.length <= 1) {
    actionNotice.value = '标签页至少保留一个标签。'
    return
  }

  const nextTabs = tabs.filter((tab) => tab.id !== tabId).map((tab, index) => ({ ...tab, order: index }))
  updateSelectedComponentProps({
    tabs: nextTabs,
    activeTabId: nextTabs[0]?.id,
  })
}

const addRelationNode = (): void => {
  const component = selectedComponent.value
  const relationGraph = (component?.props.relationGraph as { nodes?: unknown[], edges?: unknown[] } | undefined) ?? {}
  const nodes = relationGraph.nodes ?? []

  if (!component) {
    return
  }

  updateSelectedComponentProps({
    relationGraph: {
      ...relationGraph,
      nodes: [...nodes, { id: `node_${Date.now()}`, type: 'constant', label: `常数 ${nodes.length + 1}`, value: 1 }],
    },
  })
}

const addStitchedTableItem = (): void => {
  const component = selectedComponent.value
  const stitchedTable = (component?.props.stitchedTable as { tableItems?: unknown[] } | undefined) ?? {}
  const tableItems = stitchedTable.tableItems ?? []

  if (!component) {
    return
  }

  updateSelectedComponentProps({
    stitchedTable: {
      ...stitchedTable,
      tableItems: [...tableItems, { id: `table_${Date.now()}`, chartId: `chart_table_${Date.now()}`, order: tableItems.length, alias: `表格 ${tableItems.length + 1}` }],
    },
  })
}

const simulateImageUpload = (success: boolean): void => {
  if (!success) {
    actionNotice.value = '图片上传失败，请检查文件格式和大小。'
    return
  }

  updateSelectedComponentProps({
    sourceType: 'local_upload',
    imageUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d',
  })
  actionNotice.value = '图片已上传并转换为平台资源 URL。'
}

const updateSelectedLayout = (patch: Partial<DashboardComponent['layout']>): void => {
  const component = selectedComponent.value

  if (!component) {
    return
  }

  pushUndo()
  updateComponent(component.id, {
    layout: {
      ...component.layout,
      ...patch,
      width: Math.max(Number(patch.width ?? component.layout.width), component.layout.minWidth ?? 1),
      height: Math.max(Number(patch.height ?? component.layout.height), component.layout.minHeight ?? 1),
    },
  })
}

const selectRecentChart = (chartId: string): void => {
  const component = selectedComponent.value
  const chart = recentChartOptions.value.find((item) => item.id === chartId)

  if (!component || !chart) {
    return
  }

  pushUndo()
  updateComponent(component.id, {
    name: chart.title,
    widget: {
      ...clone(chart.widget),
      id: chart.id,
      title: chart.title,
      description: chart.description,
    },
    props: {
      ...component.props,
      datasetId: 'ds_ad_watch_detail',
      chartId: chart.id,
      sourceAnalysisId: chart.sourceAnalysisId,
    },
  })
  actionNotice.value = `已绑定已有图表「${chart.title}」。`
}

const createChartForComponent = (): void => {
  const component = selectedComponent.value

  if (!component) {
    return
  }

  const widget = createSampleWidget('chart', component.id)
  if (!widget) {
    return
  }

  pushUndo()
  updateComponent(component.id, {
    name: '新建图表',
    widget: {
      ...widget,
      title: '新建图表',
      id: `chart_${Date.now()}`,
    },
    props: {
      ...component.props,
      chartId: `chart_${Date.now()}`,
      datasetId: 'ds_ad_watch_detail',
      mapping: '维度与指标已从右侧配置生成。',
    },
  })
  actionNotice.value = '已生成新图表并绑定到当前组件。'
}

const installPluginComponent = (pluginId: string): void => {
  const page = activePage.value
  const component = createComponent('plugin')

  if (!page || !component) {
    return
  }

  component.name = pluginId === 'kpi_narrative' ? 'KPI 解读插件' : '运营动作插件'
  component.props = {
    ...component.props,
    plugin: { enabled: true, pluginId, schemaState: { title: component.name, theme: 'light' } },
  }
  pushUndo()
  page.components = [...page.components, component]
  selectedComponentId.value = component.id
  selectedComponentIds.value = [component.id]
  pluginMarketVisible.value = false
  markDirty()
}

const validateDashboardName = (name: string): boolean => {
  const nextName = name.trim()

  if (!nextName) {
    nameValidationError.value = '仪表盘名称不能为空。'
    return false
  }

  if (nextName.length > 50) {
    nameValidationError.value = '仪表盘名称不能超过 50 字符。'
    return false
  }

  nameValidationError.value = ''
  return true
}

const updateDashboardName = (name: string): void => {
  if (!dashboard.value) {
    return
  }

  dashboardNameDraft.value = name
  validateDashboardName(name)
}

const commitDashboardName = (): void => {
  if (!dashboard.value || !validateDashboardName(dashboardNameDraft.value)) {
    return
  }

  if (dashboard.value.name !== dashboardNameDraft.value.trim()) {
    pushUndo()
    dashboard.value.name = dashboardNameDraft.value.trim()
    dirty.value = true
  }
}

const updateSelectedComponentName = (name: string): void => {
  const component = selectedComponent.value

  if (!component) {
    return
  }

  pushUndo()
  updateComponent(component.id, {
    name,
    widget: component.widget ? { ...component.widget, title: name } : component.widget,
  })
}

const selectComponent = (component: DashboardComponent, event?: MouseEvent): void => {
  const multiSelect = Boolean(event?.metaKey || event?.ctrlKey)

  if (!multiSelect) {
    selectedComponentIds.value = [component.id]
    selectedComponentId.value = component.id
    return
  }

  const alreadySelected = selectedComponentIds.value.includes(component.id)
  const nextIds = alreadySelected
    ? selectedComponentIds.value.filter((id) => id !== component.id)
    : [...selectedComponentIds.value, component.id]

  selectedComponentIds.value = nextIds
  selectedComponentId.value = nextIds.at(-1) ?? ''
}

const clearSelection = (): void => {
  selectedComponentId.value = ''
  selectedComponentIds.value = []
}

const activatePageConfig = (): void => {
  clearSelection()
  setEditorNotice('右侧已切换到页面配置。')
}

const toggleSelectedVisible = (value: boolean): void => {
  const component = selectedComponent.value

  if (component) {
    updateComponent(component.id, { visible: value })
  }
}

const toggleSelectedLocked = (value: boolean): void => {
  const component = selectedComponent.value

  if (component) {
    updateComponent(component.id, { locked: value })
  }
}

const toggleSelectedFloating = (value: boolean): void => {
  const component = selectedComponent.value

  if (component) {
    if (!value && component.layout.floating && !window.confirm('关闭悬浮后组件会就近回到磁贴布局，是否继续？')) {
      return
    }
    updateComponent(component.id, {
      layout: {
        ...component.layout,
        floating: value,
      },
    })
  }
}

const moveSelectedComponent = (dx: number, dy: number): void => {
  const page = activePage.value
  const targets = selectedComponents.value

  if (!page || !targets.length) {
    return
  }

  pushUndo()
  const groupIds = new Set(targets.map((component) => component.groupId).filter(Boolean))
  const targetIds = new Set(targets.map((component) => component.id))
  page.components = page.components.map((component) => {
    const shouldMove = targetIds.has(component.id) || Boolean(component.groupId && groupIds.has(component.groupId))

    if (!shouldMove) {
      return component
    }

    return {
      ...component,
      layout: {
        ...component.layout,
        x: Math.max(component.layout.x + dx, 0),
        y: Math.max(component.layout.y + dy, 0),
      },
      updatedAt: new Date().toISOString(),
    }
  })
  markDirty()
}

const resizeSelectedComponent = (dw: number, dh: number): void => {
  const component = selectedComponent.value

  if (!component) {
    return
  }

  pushUndo()
  updateComponent(component.id, {
    layout: {
      ...component.layout,
      width: Math.max(component.layout.width + dw, component.layout.minWidth ?? 1),
      height: Math.max(component.layout.height + dh, component.layout.minHeight ?? 1),
    },
  })
}

const deleteSelectedComponent = (): void => {
  const page = activePage.value
  const targets = selectedComponents.value

  if (!page || !targets.length) {
    return
  }

  pushUndo()
  const targetIds = new Set(targets.map((component) => component.id))
  page.components = page.components.filter((item) => !targetIds.has(item.id))
  clearSelection()
  markDirty()
}

const duplicateSelectedComponent = (): void => {
  const page = activePage.value
  const targets = selectedComponents.value

  if (!page || !targets.length) {
    return
  }

  pushUndo()
  const duplicatedComponents = targets.map((component, index): DashboardComponent => ({
    ...clone(component),
    id: `${component.id}_copy_${Date.now()}`,
    name: `${component.name} 副本`,
    order: page.components.length + index,
    zIndex: page.components.length + index + 1,
    groupId: component.groupId ? `${component.groupId}_copy_${Date.now()}` : undefined,
    layout: {
      ...component.layout,
      x: component.layout.x + 1,
      y: component.layout.y + 1,
    },
    widget: component.widget
      ? {
          ...component.widget,
          id: `${component.widget.id}_copy_${Date.now()}`,
          title: `${component.widget.title} 副本`,
        }
      : component.widget,
    updatedAt: new Date().toISOString(),
  }))
  page.components = [...page.components, ...duplicatedComponents]
  selectedComponentIds.value = duplicatedComponents.map((component) => component.id)
  selectedComponentId.value = duplicatedComponents.at(-1)?.id ?? ''
  markDirty()
}

const changeLayer = (direction: 'top' | 'bottom' | 'up' | 'down'): void => {
  const page = activePage.value
  const targets = selectedComponents.value

  if (!page || !targets.length) {
    return
  }

  pushUndo()
  const maxZ = Math.max(...page.components.map((component) => component.zIndex), 1)
  const minZ = Math.min(...page.components.map((component) => component.zIndex), 1)
  const targetIds = new Set(targets.map((component) => component.id))

  page.components = page.components.map((component) => {
    if (!targetIds.has(component.id)) {
      return component
    }

    const nextZIndex =
      direction === 'top'
        ? maxZ + 1
        : direction === 'bottom'
          ? Math.max(minZ - 1, 1)
          : Math.max(component.zIndex + (direction === 'up' ? 1 : -1), 1)

    return { ...component, zIndex: nextZIndex, updatedAt: new Date().toISOString() }
  })
  markDirty()
}

const groupSelectedComponents = (): void => {
  if (!activePage.value || !canGroupSelection.value) {
    actionNotice.value = '请选择至少 2 个同页普通组件后再组合。'
    return
  }

  pushUndo()
  const groupId = `group_${Date.now()}`
  const targetIds = new Set(selectedComponents.value.map((component) => component.id))
  activePage.value.components = activePage.value.components.map((component) =>
    targetIds.has(component.id) ? { ...component, groupId, updatedAt: new Date().toISOString() } : component,
  )
  setEditorNotice(`已组合 ${targetIds.size} 个组件，移动任一成员会带动整组。`)
  markDirty()
}

const ungroupSelectedComponents = (): void => {
  if (!activePage.value || !canUngroupSelection.value) {
    return
  }

  pushUndo()
  const selectedGroupIds = new Set(selectedComponents.value.map((component) => component.groupId).filter(Boolean))
  activePage.value.components = activePage.value.components.map((component) => {
    if (!component.groupId || !selectedGroupIds.has(component.groupId)) {
      return component
    }

    const { groupId: _groupId, ...nextComponent } = component
    return { ...nextComponent, updatedAt: new Date().toISOString() }
  })
  setEditorNotice('已取消所选组件组合。')
  markDirty()
}

const alignSelectedComponents = (direction: string): void => {
  const page = activePage.value
  const targets = selectedComponents.value

  if (!page || targets.length < 2) {
    actionNotice.value = '请选择至少 2 个组件后再对齐。'
    return
  }

  pushUndo()
  const targetIds = new Set(targets.map((component) => component.id))
  const minX = Math.min(...targets.map((component) => component.layout.x))
  const minY = Math.min(...targets.map((component) => component.layout.y))
  const maxRight = Math.max(...targets.map((component) => component.layout.x + component.layout.width))
  const maxBottom = Math.max(...targets.map((component) => component.layout.y + component.layout.height))
  const centerX = (minX + maxRight) / 2
  const centerY = (minY + maxBottom) / 2

  const distributedLayouts = new Map<string, { x: number, y: number }>()
  if (direction === 'distribute_horizontal' && targets.length >= 3) {
    const sorted = [...targets].sort((a, b) => a.layout.x - b.layout.x)
    const first = sorted[0]
    const last = sorted.at(-1)
    if (first && last) {
      const gap = (last.layout.x - first.layout.x) / (sorted.length - 1)
      sorted.forEach((component, index) => distributedLayouts.set(component.id, { x: Math.round(first.layout.x + gap * index), y: component.layout.y }))
    }
  }
  if (direction === 'distribute_vertical' && targets.length >= 3) {
    const sorted = [...targets].sort((a, b) => a.layout.y - b.layout.y)
    const first = sorted[0]
    const last = sorted.at(-1)
    if (first && last) {
      const gap = (last.layout.y - first.layout.y) / (sorted.length - 1)
      sorted.forEach((component, index) => distributedLayouts.set(component.id, { x: component.layout.x, y: Math.round(first.layout.y + gap * index) }))
    }
  }

  page.components = page.components.map((component) => {
    if (!targetIds.has(component.id)) {
      return component
    }

    const distributed = distributedLayouts.get(component.id)
    const nextLayout = distributed
      ? { ...component.layout, ...distributed }
      : {
          ...component.layout,
          x:
            direction === 'left'
              ? minX
              : direction === 'right'
                ? maxRight - component.layout.width
                : direction === 'center'
                  ? Math.round(centerX - component.layout.width / 2)
                  : component.layout.x,
          y:
            direction === 'top'
              ? minY
              : direction === 'bottom'
                ? maxBottom - component.layout.height
                : direction === 'middle'
                  ? Math.round(centerY - component.layout.height / 2)
                  : component.layout.y,
        }

    return { ...component, layout: nextLayout, updatedAt: new Date().toISOString() }
  })
  markDirty()
}

const setLayoutMode = (value: string): void => {
  if (!settings.value) {
    return
  }

  if (settings.value.layoutMode === 'free' && value === 'tile' && !window.confirm('切换到磁贴布局会自动整理组件位置，是否继续？')) {
    return
  }

  pushUndo()
  settings.value.layoutMode = value === 'free' ? 'free' : 'tile'
  markDirty()
}

const setZoom = (value: number): void => {
  zoom.value = Math.min(Math.max(value, 50), 150)
}

const fitCanvasToView = (): void => {
  zoom.value = mobileLayoutPreview.value ? 75 : 85
  setEditorNotice('画布已适应当前编辑视窗，真实组件坐标未变化。')
}

const openPreview = (): void => {
  if (!validateDashboardName(dashboardNameDraft.value)) {
    return
  }

  commitDashboardName()
  editMode.value = false
  previewMode.value = true
  previewLink.value = `${window.location.origin}/analysis-center/dashboards/${dashboardId.value}?mode=preview&draft=local`
  setEditorNotice('已打开预览态，展示当前编辑状态，不影响线上已发布版本。')
}

const returnToEditorFromPreview = async (): Promise<void> => {
  previewMode.value = false
  editMode.value = true
  await prepareEditSession()
}

const copyPreviewLink = async (): Promise<void> => {
  try {
    await navigator.clipboard.writeText(currentPreviewLink.value)
    actionNotice.value = '预览链接已复制，有权限用户可查看当前预览内容。'
  } catch {
    actionNotice.value = `预览链接：${currentPreviewLink.value}`
  }
}

const applyThemeToFollowedComponents = (theme: DashboardTheme): void => {
  const appearance = theme.dashboardConfig.appearance ?? {}

  if (!Object.keys(appearance).length) {
    return
  }

  pages.value = pages.value.map((page) => ({
    ...page,
    components: page.components.map((component) => {
      if (component.props.followDashboardTheme === false) {
        return component
      }

      return {
        ...component,
        props: {
          ...component.props,
          appearance: {
            ...((component.props.appearance as Record<string, unknown> | undefined) ?? {}),
            ...appearance,
          },
        },
        updatedAt: new Date().toISOString(),
      }
    }),
  }))
}

const updateTheme = (value: string): void => {
  if (!settings.value) {
    return
  }

  const theme = [...officialThemes.value, ...(settings.value.customThemes ?? [])].find((item) => item.id === value)

  pushUndo()
  settings.value.themeId = value
  if (theme?.dashboardConfig.layoutMode) {
    settings.value.layoutMode = theme.dashboardConfig.layoutMode
  }
  if (theme?.dashboardConfig.canvasBackground) {
    settings.value.canvasBackground = {
      ...settings.value.canvasBackground,
      ...theme.dashboardConfig.canvasBackground,
    }
  }
  if (theme) {
    applyThemeToFollowedComponents(theme)
  }
  actionNotice.value = '主题已应用，图表配色将跟随主题同步变化。'
  markDirty()
}

const resetTheme = (): void => {
  if (!settings.value) {
    return
  }

  pushUndo()
  settings.value.themeId = undefined
  markDirty()
  actionNotice.value = '已重置主题，未跟随主题的组件保留自身样式。'
}

const createCustomTheme = (): void => {
  if (!settings.value) {
    return
  }

  const name = customThemeDraft.value.name.trim()
  if (!name) {
    customThemeError.value = '主题名称不能为空。'
    return
  }

  if (name.length > 15) {
    customThemeError.value = '主题名称最长 15 个字符。'
    return
  }

  if (customThemeDraft.value.scope === 'system') {
    customThemeError.value = '系统主题仅系统管理员可创建。'
    return
  }

  const theme: DashboardTheme = {
    id: `custom_theme_${Date.now()}`,
    name,
    scope: customThemeDraft.value.scope,
    dashboardConfig: {
      layoutMode: customThemeDraft.value.layoutMode,
      canvasBackground: { color: customThemeDraft.value.canvasColor, opacity: 100 },
      padding: { top: 12, right: 12, bottom: 12, left: 12 },
      appearance: { fillColor: customThemeDraft.value.componentFillColor, borderColor: '#d8e2f0', borderRadius: 8 },
      adaptiveComponentColors: customThemeDraft.value.adaptiveComponentColors,
    },
    chartConfig: {
      title: { color: '#111827', fontSize: 16 },
      discreteColorScheme: [customThemeDraft.value.chartColor, '#14b8a6', '#f59e0b', '#8b5cf6'],
      continuousColorScheme: [customThemeDraft.value.chartColor, '#e0f2fe'],
      lineStyle: { width: 2, smooth: true },
      legendStyle: { position: 'top' },
      tableStyle: { headerFillColor: '#f8fafc' },
      metricCardStyle: { valueColor: customThemeDraft.value.chartColor },
    },
  }

  pushUndo()
  settings.value.customThemes = [...(settings.value.customThemes ?? []), theme]
  customThemeError.value = ''
  customThemeModalVisible.value = false
  updateTheme(theme.id)
}

const updateCanvasOpacity = (value: number | null): void => {
  if (!settings.value) {
    return
  }

  settings.value.canvasBackground.opacity = Math.min(Math.max(Number(value ?? 100), 0), 100)
  markDirty()
}

const updateCanvasImage = (value: string): void => {
  if (!settings.value) {
    return
  }

  settings.value.canvasBackground.imageUrl = value.trim()
  markDirty()
}

const updateCanvasSize = (patch: Partial<DashboardSettings['canvasSize']>): void => {
  if (!settings.value) {
    return
  }

  settings.value.canvasSize = {
    ...settings.value.canvasSize,
    ...patch,
  }
  markDirty()
}

const updateViewModeSettings = (patch: Partial<DashboardSettings['viewMode']>): void => {
  if (!settings.value) {
    return
  }

  settings.value.viewMode = {
    ...settings.value.viewMode,
    ...patch,
  }
  markDirty()
}

const updateAutoRefreshInterval = (value: number | null): void => {
  if (!settings.value) {
    return
  }

  settings.value.autoRefresh = {
    enabled: Boolean(settings.value.autoRefresh?.enabled),
    intervalSeconds: Math.max(Number(value ?? 300), 60),
  }
  markDirty()
}

const addPage = (): void => {
  const currentDashboard = dashboard.value
  const currentIndex = pages.value.findIndex((page) => page.id === activePageId.value)
  const insertIndex = currentIndex >= 0 ? currentIndex + 1 : pages.value.length

  if (!currentDashboard) {
    return
  }

  pushUndo()
  const page: DashboardPage = {
    id: `page_${Date.now()}`,
    dashboardId: currentDashboard.id,
    name: `页面 ${pages.value.length + 1}`,
    order: insertIndex,
    visibleInViewMode: true,
    layoutMode: 'inherit',
    components: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  const nextPages = [...pages.value]
  nextPages.splice(insertIndex, 0, page)
  pages.value = nextPages.map((item, index) => ({ ...item, order: index }))
  activePageId.value = page.id
  markDirty()
}

const copyPage = (): void => {
  const page = activePage.value
  const currentIndex = pages.value.findIndex((item) => item.id === page?.id)

  if (!page) {
    return
  }

  pushUndo()
  const copiedPage: DashboardPage = {
    ...clone(page),
    id: `${page.id}_copy_${Date.now()}`,
    name: `${page.name} 副本`,
    order: currentIndex + 1,
    components: page.components.map((component, index) => ({
      ...component,
      id: `${component.id}_copy_${Date.now()}_${index}`,
      pageId: `${page.id}_copy_${Date.now()}`,
    })),
    updatedAt: new Date().toISOString(),
  }
  copiedPage.components = copiedPage.components.map((component) => ({ ...component, pageId: copiedPage.id }))
  const nextPages = [...pages.value]
  nextPages.splice(currentIndex + 1, 0, copiedPage)
  pages.value = nextPages.map((item, index) => ({ ...item, order: index }))
  activePageId.value = copiedPage.id
  markDirty()
}

const requestDeletePage = (page = activePage.value): void => {
  if (!page) {
    return
  }

  targetPageForAction.value = page
  pageDeleteConfirmVisible.value = true
}

const deletePage = (page = targetPageForAction.value ?? activePage.value): void => {

  if (!page || pages.value.length <= 1) {
    actionNotice.value = '仪表盘至少需要保留一个页面。'
    return
  }

  pushUndo()
  const deletedIndex = pages.value.findIndex((item) => item.id === page.id)
  pages.value = pages.value.filter((item) => item.id !== page.id).map((item, index) => ({ ...item, order: index }))
  activePageId.value = pages.value[Math.max(deletedIndex - 1, 0)]?.id ?? pages.value[0]?.id ?? ''
  selectedComponentId.value = ''
  pageDeleteConfirmVisible.value = false
  targetPageForAction.value = null
  markDirty()
}

const validatePageName = (name: string, pageId?: string): boolean => {
  const nextName = name.trim()

  if (!nextName) {
    pageNameError.value = '页面名称不能为空。'
    return false
  }

  const duplicate = pages.value.some((page) => page.id !== pageId && page.name === nextName)
  if (duplicate) {
    pageNameError.value = '同一仪表盘内页面名称不可重复。'
    return false
  }

  pageNameError.value = ''
  return true
}

const startRenamePage = (page: DashboardPage): void => {
  editingPageId.value = page.id
  pageRenameDraft.value = page.name
  pageNameError.value = ''
}

const cancelRenamePage = (): void => {
  editingPageId.value = ''
  pageRenameDraft.value = ''
  pageNameError.value = ''
}

const updatePageName = (name: string, page = activePage.value): void => {

  if (!page) {
    return
  }

  if (!validatePageName(name, page.id)) {
    return
  }

  pushUndo()
  page.name = name.trim()
  page.updatedAt = new Date().toISOString()
  editingPageId.value = ''
  markDirty()
}

const togglePageVisible = (page = activePage.value): void => {

  if (!page) {
    return
  }

  pushUndo()
  page.visibleInViewMode = !page.visibleInViewMode
  markDirty()
}

const activatePage = (pageId: string): void => {
  activePageId.value = pageId
  clearSelection()
}

const handlePageAction = (action: PageAction | string, page: DashboardPage): void => {
  activePageId.value = page.id
  targetPageForAction.value = page

  if (action === 'rename') {
    startRenamePage(page)
  } else if (action === 'copy') {
    copyPage()
  } else if (action === 'copy_to_dashboard') {
    crossDashboardPageDraft.value = {
      name: `${page.name} 副本`,
      targetDashboardId: 'dash-team-retention',
      copyChartResources: true,
    }
    crossDashboardPageModalVisible.value = true
  } else if (action === 'toggle_visible') {
    togglePageVisible(page)
  } else if (action === 'delete') {
    requestDeletePage(page)
  }
}

const submitCrossDashboardPageCopy = (): void => {
  if (!targetPageForAction.value || !validatePageName(crossDashboardPageDraft.value.name)) {
    return
  }

  crossDashboardPageModalVisible.value = false
  actionNotice.value = `已将页面「${targetPageForAction.value.name}」复制到目标仪表盘，图表${crossDashboardPageDraft.value.copyChartResources ? '已生成副本' : '保持引用原图表'}。`
}

const startPageDrag = (page: DashboardPage): void => {
  draggedPageId.value = page.id
}

const dropPage = (targetPage: DashboardPage): void => {
  const sourceIndex = pages.value.findIndex((page) => page.id === draggedPageId.value)
  const targetIndex = pages.value.findIndex((page) => page.id === targetPage.id)

  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    draggedPageId.value = ''
    return
  }

  pushUndo()
  const nextPages = [...pages.value]
  const sourcePage = nextPages.splice(sourceIndex, 1)[0]
  if (sourcePage) {
    nextPages.splice(targetIndex, 0, sourcePage)
  }
  pages.value = nextPages.map((page, index) => ({ ...page, order: index }))
  draggedPageId.value = ''
  markDirty()
}

const copySelectedComponentsToClipboard = (mode: 'copy' | 'cut'): void => {
  const selected = selectedComponents.value
  const page = activePage.value

  if (!page || !selected.length) {
    actionNotice.value = '请先选择要复制或剪切的组件。'
    return
  }

  componentClipboard.value = {
    mode,
    sourcePageId: page.id,
    components: clone(selected),
  }

  if (mode === 'cut') {
    pushUndo()
    const selectedIds = new Set(selected.map((component) => component.id))
    page.components = page.components.filter((component) => !selectedIds.has(component.id))
    clearSelection()
    markDirty()
    actionNotice.value = `已剪切 ${selected.length} 个组件，切换页面后可粘贴。`
  } else {
    actionNotice.value = `已复制 ${selected.length} 个组件，切换页面后可粘贴。`
  }
}

const pasteComponentsToCurrentPage = (): void => {
  const page = activePage.value
  const clipboard = componentClipboard.value

  if (!page || !clipboard?.components.length) {
    actionNotice.value = '暂无可粘贴组件。'
    return
  }

  pushUndo()
  const pasted = clipboard.components.map((component, index) => ({
    ...clone(component),
    id: `${component.id}_${clipboard.mode}_${Date.now()}_${index}`,
    pageId: page.id,
    order: page.components.length + index,
    layout: {
      ...component.layout,
      x: component.layout.x + 1,
      y: component.layout.y + 1,
    },
    updatedAt: new Date().toISOString(),
  }))
  page.components = [...page.components, ...pasted]
  selectedComponentIds.value = pasted.map((component) => component.id)
  selectedComponentId.value = pasted.at(-1)?.id ?? ''
  if (clipboard.mode === 'cut') {
    componentClipboard.value = null
  }
  markDirty()
}

const movePage = (direction: 'left' | 'right'): void => {
  const index = pages.value.findIndex((page) => page.id === activePageId.value)
  const nextIndex = direction === 'left' ? index - 1 : index + 1

  if (index < 0 || nextIndex < 0 || nextIndex >= pages.value.length) {
    return
  }

  pushUndo()
  const nextPages = [...pages.value]
  const current = nextPages[index]
  const target = nextPages[nextIndex]

  if (!current || !target) {
    return
  }

  nextPages[index] = target
  nextPages[nextIndex] = current
  pages.value = nextPages.map((page, pageIndex) => ({ ...page, order: pageIndex }))
  markDirty()
}

const undo = (): void => {
  const previous = undoStack.value.at(-1)

  if (!previous || !settings.value) {
    return
  }

  redoStack.value = [...redoStack.value, snapshot()]
  undoStack.value = undoStack.value.slice(0, -1)
  restoreSnapshot(previous)
}

const redo = (): void => {
  const next = redoStack.value.at(-1)

  if (!next || !settings.value) {
    return
  }

  undoStack.value = [...undoStack.value, snapshot()]
  redoStack.value = redoStack.value.slice(0, -1)
  restoreSnapshot(next)
}

const saveDraft = async (): Promise<void> => {
  if (!dashboard.value || !settings.value) {
    return
  }

  if (!validateDashboardName(dashboardNameDraft.value)) {
    actionNotice.value = nameValidationError.value
    return
  }

  dashboard.value.name = dashboardNameDraft.value.trim()
  const patch: Partial<DashboardAsset> = {
    name: dashboard.value.name,
    pages: clone(pages.value),
    settings: clone(settings.value),
  }

  if (dashboard.value.publishMode !== 'versioned') {
    patch.publishedPages = clone(pages.value)
  }

  await syncDashboardPatch(patch)
  dirty.value = false
  clearEditorCache()
  setEditorNotice(dashboard.value.publishMode === 'versioned'
    ? '草稿已保存，阅览页仍展示当前已发布版本。'
    : '已保存并实时发布，阅览页会展示最新内容。')
}

const validatePublishIntegrity = (): string[] => {
  if (!dashboard.value || dashboard.value.publishMode !== 'versioned') {
    return []
  }

  return draftIntegrityIssues.value
}

const submitPublish = async (): Promise<void> => {
  if (!dashboard.value) {
    return
  }

  const integrityIssues = validatePublishIntegrity()
  if (integrityIssues.length) {
    publishValidationError.value = `发布前完整性检查未通过：${integrityIssues.join('；')}`
    return
  }

  if ((dashboard.value.versions ?? []).length >= 3 && !publishVersionToDeleteId.value && versionDeleteOptions.value.length) {
    publishValidationError.value = '历史版本已达 3 个，请先选择一个历史版本删除后再发布。'
    return
  }

  dashboard.value = await analysisCenterService.publishDashboard(
    dashboard.value.id,
    publishDescription.value,
    publishVersionToDeleteId.value || undefined,
  )
  publishDescription.value = ''
  publishValidationError.value = ''
  publishVersionToDeleteId.value = ''
  publishModalVisible.value = false
  dirty.value = false
  clearEditorCache()
  actionNotice.value = '已保存并发布，订阅、监控、下载和嵌出将读取新版本。'
}

const rollbackVersion = (version: DashboardVersion): void => {
  pushUndo()
  pages.value = clone(version.snapshot)
  activePageId.value = pages.value[0]?.id ?? ''
  selectedVersionId.value = version.id
  dirty.value = true
  actionNotice.value = `已回滚到 V${version.versionNo} 草稿，请确认后保存并发布。`
}

const previewVersion = (version: DashboardVersion): void => {
  selectedVersionId.value = version.id
  versionPreviewLink.value = `${window.location.origin}/analysis-center/dashboards/${dashboardId.value}?mode=preview&version=${version.id}`
  actionNotice.value = `已生成 V${version.versionNo} 预览链接；预览不影响线上版本。`
}

const startEditVersionDescription = (version: DashboardVersion): void => {
  editingVersionDescriptionId.value = version.id
  versionDescriptionDraft.value = version.description ?? ''
}

const saveVersionDescription = async (version: DashboardVersion): Promise<void> => {
  if (!dashboard.value) {
    return
  }

  dashboard.value.versions = (dashboard.value.versions ?? []).map((item) =>
    item.id === version.id ? { ...item, description: versionDescriptionDraft.value.trim() || '无描述' } : item,
  )
  await syncDashboardPatch({ versions: dashboard.value.versions })
  editingVersionDescriptionId.value = ''
  versionDescriptionDraft.value = ''
  actionNotice.value = `V${version.versionNo} 描述已更新。`
}

const enterEditMode = async (): Promise<void> => {
  if (!dashboard.value || dashboard.value.type === 'web') {
    actionNotice.value = '网页仪表盘不允许进入普通编辑器，只能编辑名称、路径和 URL。'
    return
  }

  editMode.value = true
  previewMode.value = false
  pages.value = clone(dashboard.value.pages ?? [])
  dashboardNameDraft.value = dashboard.value.name
  activePageId.value = pages.value[0]?.id ?? ''
  await prepareEditSession()
}

const exitEditMode = async (): Promise<void> => {
  if (dashboard.value) {
    await analysisCenterService.releaseDashboardEditLock(dashboard.value.id)
  }
  stopEditHeartbeat()
  editorLock.value = null
  lockNotice.value = ''
  editMode.value = false
  pages.value = clone(
    dashboard.value?.publishMode === 'versioned'
      ? dashboard.value.publishedPages ?? dashboard.value.pages ?? []
      : dashboard.value?.pages ?? [],
  )
  activePageId.value = pages.value.find((page) => page.visibleInViewMode)?.id ?? pages.value[0]?.id ?? ''
  clearSelection()
}

const updateGlobalFilter = (filterId: string, value: string): void => {
  filterState.value = { ...filterState.value, [filterId]: value }
  if (queryButtonEnabled.value) {
    pendingQuery.value = true
    actionNotice.value = '已变更筛选条件，点击“查询”后才会触发图表查询。'
    return
  }

  appliedFilterState.value = { ...filterState.value }
  actionNotice.value = '全局筛选器已应用到多个图表。'
}

const runQuery = (): void => {
  appliedFilterState.value = { ...filterState.value }
  pendingQuery.value = false
  actionNotice.value = '查询已触发，筛选条件已编译到所有受控图表。'
}

const getChartFilterOverride = (componentId: string): { internalActive: boolean, hidden: boolean } =>
  chartFilterOverrides.value[componentId] ?? { internalActive: false, hidden: false }

const hasPublicFilterImpact = (component: DashboardComponent): boolean => {
  if (!component.widget || getChartFilterOverride(component.id).internalActive) {
    return false
  }

  return Object.keys(appliedFilterState.value).length > 0
}

const hasLinkageImpact = (component: DashboardComponent): boolean =>
  Boolean(activeLinkage.value?.targetComponentIds.includes(component.id))

const getComponentDrillConfig = (component: DashboardComponent): DrillConfig => ({
  ...createDefaultDrillConfig(),
  ...((component.props.drillConfig as DrillConfig | undefined) ?? {}),
})

const getComponentLinkageConfig = (component: DashboardComponent): LinkageConfig => ({
  ...createDefaultLinkageConfig(),
  ...((component.props.linkageConfig as LinkageConfig | undefined) ?? {}),
})

const getComponentJumpConfig = (component: DashboardComponent): JumpConfig => ({
  ...createDefaultJumpConfig(),
  ...((component.props.jumpConfig as JumpConfig | undefined) ?? {}),
})

const getComponentInteractionConfig = (component: DashboardComponent): InteractionEventConfig => ({
  ...createDefaultInteractionConfig(),
  ...((component.props.interactionEventConfig as InteractionEventConfig | undefined) ?? {}),
})

const getCompatibleChartTargets = (sourceComponentId: string): string[] =>
  viewerCanvasComponents.value
    .filter((component) => component.id !== sourceComponentId && Boolean(component.widget))
    .map((component) => component.id)

const updateComponentConfig = (componentId: string, patch: Record<string, unknown>): void => {
  const page = activePage.value

  if (!page) {
    return
  }

  pushUndo()
  page.components = page.components.map((component) =>
    component.id === componentId
      ? {
          ...component,
          props: {
            ...component.props,
            ...patch,
          },
          updatedAt: new Date().toISOString(),
        }
      : component,
  )
  markDirty()
}

const getCurrentDataRow = (): Record<string, string> => ({
  大区: treeFilter.value.region,
  省份: treeFilter.value.province,
  城市: treeFilter.value.city,
  用户类型: filterState.value.user_type ?? '活跃用户',
  广告位: '金币不足弹窗',
  指标: dynamicField.value,
})

const getCurrentClickedDataPoint = (component: DashboardComponent): ClickedDataPoint => {
  if (clickedDataPoint.value?.componentId === component.id) {
    return clickedDataPoint.value
  }

  return {
    componentId: component.id,
    field: '省份',
    value: treeFilter.value.province,
    row: getCurrentDataRow(),
  }
}

const handleChartDataClick = (component: DashboardComponent, params: unknown): void => {
  const payload = params as { name?: string, data?: { name?: string, value?: string | number | null } }
  const value = String(payload?.name ?? payload?.data?.name ?? treeFilter.value.province)

  if (!value || value === 'null') {
    actionNotice.value = '当前数据点字段值为空，联动、下钻和跳转不生效。'
    return
  }

  clickedDataPoint.value = {
    componentId: component.id,
    field: drillTrail.value.at(-1) ?? '省份',
    value,
    row: {
      ...getCurrentDataRow(),
      [drillTrail.value.at(-1) ?? '省份']: value,
    },
  }
  actionNotice.value = `已选中「${component.name}」数据点 ${value}，可继续聚焦下钻、联动或跳转。`
}

const toggleChartInternalFilter = (component: DashboardComponent): void => {
  const current = getChartFilterOverride(component.id)
  chartFilterOverrides.value = {
    ...chartFilterOverrides.value,
    [component.id]: {
      ...current,
      internalActive: !current.internalActive,
    },
  }
  actionNotice.value = !current.internalActive
    ? `「${component.name}」已激活图表内部筛选，屏蔽公共筛选器。`
    : `「${component.name}」已恢复公共筛选器优先。`
}

const toggleChartFilterVisible = (component: DashboardComponent): void => {
  const current = getChartFilterOverride(component.id)
  chartFilterOverrides.value = {
    ...chartFilterOverrides.value,
    [component.id]: {
      ...current,
      hidden: !current.hidden,
    },
  }
  actionNotice.value = !current.hidden ? '图内控件已隐藏，筛选条件仍保留。' : '图内控件已恢复显示。'
}

const refreshDashboard = async (): Promise<void> => {
  if (!dashboard.value) {
    return
  }

  refreshing.value = true

  try {
    dashboard.value = await analysisCenterService.refreshDashboard(dashboard.value.id, globalFilters.value)
    actionNotice.value = '刷新完成；当前 sheet、筛选、书签、快捷查询和下钻状态保持不变，失败图表会单独保留错误态。'
  } finally {
    refreshing.value = false
  }
}

const toggleFullscreen = (): void => {
  if (!isFullscreen.value) {
    viewerScrollTopBeforeFullscreen.value = window.scrollY
    isFullscreen.value = true
    return
  }

  isFullscreen.value = false
  window.requestAnimationFrame(() => {
    window.scrollTo({ top: viewerScrollTopBeforeFullscreen.value })
  })
}

const handleEscapeFullscreen = (event: KeyboardEvent): void => {
  if (event.key === 'Escape' && isFullscreen.value) {
    toggleFullscreen()
  }
}

const refreshWidget = (component: DashboardComponent): void => {
  if (component.widget) {
    component.widget.lastRefreshAt = new Date().toISOString()
  }
  actionNotice.value = `组件「${component.name}」已刷新。`
}

const openSourceAnalysis = (component: DashboardComponent): void => {
  if (component.widget?.sourceAnalysisId) {
    void router.push(`/data-insight/event-analysis?savedAnalysisId=${component.widget.sourceAnalysisId}`)
  }
}

const openQuickQuery = (component: DashboardComponent): void => {
  quickQueryComponent.value = component
  quickQueryDraft.value = {
    ...(quickQueryApplied.value[component.id] ?? {
      filter: '省份 = 山东',
      chartStyle: component.widget?.widgetType === 'bar' ? 'bar' : 'line',
      granularity: 'day',
      dimension: '城市',
      metric: dynamicField.value,
      aggregation: 'sum',
    }),
  }
  quickQueryModalVisible.value = true
}

const applyQuickQuery = (): void => {
  const component = quickQueryComponent.value

  if (!component) {
    return
  }

  quickQueryApplied.value = {
    ...quickQueryApplied.value,
    [component.id]: { ...quickQueryDraft.value },
  }
  quickQueryModalVisible.value = false
  actionNotice.value = `快捷查询已临时应用到「${component.name}」，不会写回原图表配置。`
}

const cancelQuickQuery = (): void => {
  const component = quickQueryComponent.value

  if (component) {
    const nextState = { ...quickQueryApplied.value }
    delete nextState[component.id]
    quickQueryApplied.value = nextState
    actionNotice.value = `已恢复「${component.name}」原查询。`
  }

  quickQueryModalVisible.value = false
}

const exportComponentImage = (component: DashboardComponent): void => {
  actionNotice.value = `已按${dashboard.value?.publishMode === 'versioned' ? '当前发布版本' : '最新保存内容'}导出「${component.name}」图片；若组件加载失败，导出图会保留错误占位。`
}

const downloadComponentData = (component: DashboardComponent): void => {
  if (viewerDownloadPermissionCheck.value && Boolean(component.props.datasetPermissionDenied)) {
    actionNotice.value = `「${component.name}」底层数据集无权限，无法下载。`
    return
  }

  actionNotice.value = `已按${dashboard.value?.publishMode === 'versioned' ? '当前发布版本' : '最新保存内容'}下载「${component.name}」展示数据，并记录下载审计日志。`
}

const copyComponentData = (component: DashboardComponent): void => {
  if (viewerDownloadPermissionCheck.value && Boolean(component.props.datasetPermissionDenied)) {
    actionNotice.value = `「${component.name}」底层数据集无权限，无法复制。`
    return
  }

  actionNotice.value = `已按${dashboard.value?.publishMode === 'versioned' ? '当前发布版本' : '最新保存内容'}复制「${component.name}」展示数据，并记录复制审计日志。`
}

const handleComponentAction = (key: string, component: DashboardComponent): void => {
  const action = key as ViewerComponentAction

  if (action === 'refresh') {
    refreshWidget(component)
  } else if (action === 'embed_chart') {
    openEmbedModal(component)
  } else if (action === 'comment') {
    commentPanelVisible.value = true
    selectedComponentId.value = component.id
  } else if (action === 'edit_chart') {
    openSourceAnalysis(component)
  } else if (action === 'export_image') {
    exportComponentImage(component)
  } else if (action === 'copy_data') {
    copyComponentData(component)
  } else if (action === 'copy_to_dashboard') {
    openCopyChart(component)
  } else if (action === 'contact_owner') {
    contactChartOwner(component)
  } else if (action === 'drill_down') {
    drillDown(component)
  } else if (action === 'drill_up') {
    drillUp(Math.max(drillTrail.value.length - 2, 0))
  } else if (action === 'toggle_internal_filter') {
    toggleChartInternalFilter(component)
  } else if (action === 'toggle_filter_visible') {
    toggleChartFilterVisible(component)
  } else if (action === 'linkage_single') {
    activateLinkage(component, 'single')
  } else if (action === 'linkage_multi') {
    activateLinkage(component, 'multi')
  } else if (action === 'linkage_clear') {
    activateLinkage(component, '')
  } else if (action === 'jump_dashboard') {
    jumpToDashboard(component)
  } else if (action === 'jump_web') {
    jumpToWeb(component)
  } else if (action === 'attribution') {
    runAttribution(component)
  } else if (action === 'interaction_event') {
    sendInteractionEvent(component)
  } else if (action === 'table_config') {
    selectedTableComponentId.value = component.id
    tableConfigModalVisible.value = true
  }
}

const openCopyChart = (component: DashboardComponent): void => {
  copyChartComponent.value = component
  copyChartDraft.value = {
    name: `${component.name} 副本`,
    targetDashboardId: 'dash-team-retention',
    followTheme: true,
  }
  copyChartModalVisible.value = true
}

const submitCopyChart = (): void => {
  const component = copyChartComponent.value

  if (!component || !copyChartDraft.value.name.trim()) {
    actionNotice.value = '请输入新图表名称。'
    return
  }

  copyChartModalVisible.value = false
  actionNotice.value = `已将「${component.name}」复制到目标仪表盘，并按目标仪表盘主题应用样式。`
}

const openMonitorModal = async (component?: DashboardComponent): Promise<void> => {
  if (component) {
    monitorDraft.value.componentId = component.id
    monitorDraft.value.name = `${component.name} 监控`
  } else if (!monitorDraft.value.componentId && componentOptions.value[0]?.value) {
    monitorDraft.value.componentId = String(componentOptions.value[0].value)
  }

  if (!shareMembers.value.length) {
    await loadShareMeta()
  }

  monitorValidationError.value = ''
  monitorTestPreview.value = ''
  monitorModalVisible.value = true
}

const openChartMonitor = (component: DashboardComponent): void => {
  void openMonitorModal(component)
}

const contactChartOwner = (component: DashboardComponent): void => {
  actionNotice.value = `已打开「${component.name}」Owner 联系入口。`
}

const validateAttributionTask = (component: DashboardComponent): string[] => {
  const widget = component.widget
  const errors: string[] = []
  const granularity = attributionTask.value.granularity
  const minContinuousPoints = granularity === 'day' ? 14 : granularity === 'week' ? 8 : 24
  const pointCount = granularity === 'day' ? 14 : granularity === 'week' ? 10 : 24

  if (String(component.props.datasetMode ?? 'extract') !== 'extract') {
    errors.push('仅支持抽取数据集，直连数据集暂不支持智能归因。')
  }

  if (widget?.chartType !== 'line' && widget?.widgetType !== 'line') {
    errors.push('智能归因入口仅对日期 X 轴的折线图开放。')
  }

  if (!['day', 'week', 'month'].includes(granularity)) {
    errors.push('日期聚合粒度仅支持日、周、月。')
  }

  if (!widget?.chartData?.length || pointCount < minContinuousPoints) {
    errors.push(`${granularity === 'day' ? '天' : granularity === 'week' ? '周' : '月'}级归因需要至少 ${minContinuousPoints} 个连续数据点。`)
  }

  if (!attributionTask.value.currentPoint || !attributionTask.value.comparePoint) {
    errors.push('当前分析点和对比时间点不能为空。')
  }

  if (attributionTask.value.currentPoint === attributionTask.value.comparePoint) {
    errors.push('当前分析点和对比时间点不能相同。')
  }

  return errors
}

const openAttributionConfig = (): void => {
  attributionConfigModalVisible.value = true
}

const runAttribution = (component: DashboardComponent): void => {
  attributionComponent.value = component
  attributionTask.value = {
    ...attributionTask.value,
    mode: 'default',
    granularity: 'day',
    currentPoint: '2026-05-22',
    comparePoint: '2026-05-15',
    status: 'idle',
    reportVisible: false,
  }
  attributionValidationErrors.value = validateAttributionTask(component)
  attributionModalVisible.value = true
}

const updateAttributionMode = (mode: AttributionTask['mode']): void => {
  attributionTask.value = {
    ...attributionTask.value,
    mode,
    comparePoint: mode === 'default'
      ? attributionTask.value.granularity === 'day'
        ? '2026-05-15'
        : attributionTask.value.granularity === 'week'
          ? '2026-W20'
          : '2026-04'
      : attributionTask.value.comparePoint,
  }
}

const updateAttributionGranularity = (granularity: AttributionTask['granularity']): void => {
  attributionTask.value = {
    ...attributionTask.value,
    granularity,
    comparePoint: attributionTask.value.mode === 'default'
      ? granularity === 'day'
        ? '2026-05-15'
        : granularity === 'week'
          ? '2026-W20'
          : '2026-04'
      : attributionTask.value.comparePoint,
  }

  if (attributionComponent.value) {
    attributionValidationErrors.value = validateAttributionTask(attributionComponent.value)
  }
}

const submitAttributionTask = (): void => {
  const component = attributionComponent.value

  if (!component) {
    return
  }

  attributionValidationErrors.value = validateAttributionTask(component)
  if (attributionValidationErrors.value.length) {
    attributionTask.value.status = 'failed'
    return
  }

  attributionTask.value.status = 'running'
  window.setTimeout(() => {
    attributionTask.value.status = 'finished'
    attributionTask.value.reportVisible = true
    actionNotice.value = `「${component.name}」归因任务计算完成，可查看归因结果。`
  }, 300)
}

const getAdWatchAttributionRule = (): AttributionRule =>
  attributionConfigDraft.value.metricSpecificConfigs['广告观看次数'] ?? attributionConfigDraft.value.globalConfig

const updateAdWatchAttributionJudge = (value: AttributionRule['anomalyJudgeType']): void => {
  const currentRule = getAdWatchAttributionRule()
  attributionConfigDraft.value = {
    ...attributionConfigDraft.value,
    metricSpecificConfigs: {
      ...attributionConfigDraft.value.metricSpecificConfigs,
      广告观看次数: {
        ...currentRule,
        anomalyJudgeType: value,
      },
    },
  }
}

const updateAdWatchAttributionResultLimit = (maxDimensions: number): void => {
  const currentRule = getAdWatchAttributionRule()
  attributionConfigDraft.value = {
    ...attributionConfigDraft.value,
    metricSpecificConfigs: {
      ...attributionConfigDraft.value.metricSpecificConfigs,
      广告观看次数: {
        ...currentRule,
        resultLimit: {
          ...currentRule.resultLimit,
          maxDimensions,
        },
      },
    },
  }
}

const saveAttributionConfig = (): void => {
  attributionConfigModalVisible.value = false
  actionNotice.value = '归因分析配置已保存；个性配置优先级高于全局配置。'
}

const openInteractionConfig = (component: DashboardComponent): void => {
  configuringComponent.value = component
  interactionDraft.value = clone(getComponentInteractionConfig(component))
  interactionValidationError.value = ''
  interactionConfigModalVisible.value = true
}

const addInteractionRule = (): void => {
  interactionDraft.value = {
    ...interactionDraft.value,
    rules: [
      ...interactionDraft.value.rules,
      {
        id: `interaction_${Date.now()}`,
        fieldName: '省份',
        eventName: 'dashboard_component_click',
        eventType: 'post_message',
        chartScope: 'chart',
      },
    ],
  }
}

const updateInteractionRule = (ruleId: string, patch: Partial<InteractionEventRule>): void => {
  interactionDraft.value = {
    ...interactionDraft.value,
    rules: interactionDraft.value.rules.map((rule) => rule.id === ruleId ? { ...rule, ...patch } : rule),
  }
}

const removeInteractionRule = (ruleId: string): void => {
  interactionDraft.value = {
    ...interactionDraft.value,
    rules: interactionDraft.value.rules.filter((rule) => rule.id !== ruleId),
  }
}

const updateInteractionOrigins = (value: string): void => {
  interactionDraft.value = {
    ...interactionDraft.value,
    allowOrigins: value.split(',').map((origin) => origin.trim()).filter(Boolean),
  }
}

const saveInteractionConfig = (): void => {
  const component = configuringComponent.value

  if (!component) {
    return
  }

  if (interactionDraft.value.enabled && !interactionDraft.value.privateDeploymentEnabled) {
    interactionValidationError.value = '交互事件仅私有化部署支持，需要先开启功能。'
    return
  }

  if (interactionDraft.value.enabled && !interactionDraft.value.allowOrigins.length) {
    interactionValidationError.value = '请至少配置一个父页面 Origin 白名单。'
    return
  }

  if (interactionDraft.value.enabled && !interactionDraft.value.rules.every((rule) => rule.eventName.trim())) {
    interactionValidationError.value = '事件名称不能为空。'
    return
  }

  updateComponentConfig(component.id, { interactionEventConfig: clone(interactionDraft.value) })
  interactionConfigModalVisible.value = false
  actionNotice.value = `「${component.name}」交互事件配置已保存，保存仪表盘并返回查看页后生效。`
}

const cancelInteractionConfig = (): void => {
  const component = configuringComponent.value

  if (!component) {
    return
  }

  updateComponentConfig(component.id, {
    interactionEventConfig: {
      ...createDefaultInteractionConfig(),
      enabled: false,
      rules: [],
    },
  })
  interactionConfigModalVisible.value = false
  actionNotice.value = `「${component.name}」交互事件已取消，保存仪表盘后生效。`
}

const toggleFavorite = async (): Promise<void> => {
  if (!dashboard.value) {
    return
  }

  dashboard.value = await analysisCenterService.toggleDashboardFavorite(dashboard.value.id)
  actionNotice.value = dashboard.value.favorite ? '已加入收藏夹。' : '已取消收藏。'
}

const setDefaultDashboard = async (): Promise<void> => {
  if (!dashboard.value) {
    return
  }

  dashboard.value = await analysisCenterService.setDefaultDashboard(dashboard.value.id)
  actionNotice.value = '已设为默认仪表盘，下次进入模块会默认打开它。'
}

const createViewerShareLink = (): void => {
  if (!dashboard.value) {
    return
  }

  const params = new URLSearchParams({
    source: dashboard.value.publishMode === 'versioned' ? 'published' : 'latest',
    page: activePageId.value,
    tree: `${treeFilter.value.region}/${treeFilter.value.province}/${treeFilter.value.city}`,
    dynamic_field: dynamicField.value,
    global_parameter: globalParameter.value,
  })

  Object.entries(filterState.value).forEach(([key, value]) => {
    if (value) {
      params.set(`filter_${key}`, value)
    }
  })

  viewerShareLink.value = `${window.location.origin}/analysis-center/dashboards/${dashboard.value.id}?${params.toString()}`
  actionNotice.value = '分享链接已生成，保留当前筛选状态；链接不会提升被分享者权限。'
}

const openEmbedModal = (component?: DashboardComponent): void => {
  embedTargetComponentId.value = component?.id ?? 'dashboard'
  embedLink.value = ''
  embedModalVisible.value = true
}

const openSubscription = async (): Promise<void> => {
  if (!shareMembers.value.length) {
    await loadShareMeta()
  }

  subscriptionDraft.value = {
    ...subscriptionDraft.value,
    sheetIds: subscriptionDraft.value.sheetIds.length ? subscriptionDraft.value.sheetIds : pages.value.map((page) => page.id),
    receiverIds: subscriptionDraft.value.receiverIds?.length ? subscriptionDraft.value.receiverIds : ['u_chaoyang'],
    webhookConfigId: subscriptionDraft.value.webhookConfigId ?? webhookConfigs.value[0]?.id,
  }
  subscriptionValidationError.value = ''
  subscriptionTestPreview.value = ''
  subscriptionModalVisible.value = true
}

const handleViewerMoreAction = (action: string): void => {
  if (action === 'share') {
    void openShare()
  } else if (action === 'viewer_share') {
    createViewerShareLink()
  } else if (action === 'bookmark') {
    bookmarkModalVisible.value = true
  } else if (action === 'subscription') {
    void openSubscription()
  } else if (action === 'monitor') {
    void openMonitorModal()
  } else if (action === 'webhook') {
    webhookValidationError.value = ''
    webhookTestStatus.value = 'not_tested'
    webhookModalVisible.value = true
  } else if (action === 'embed') {
    openEmbedModal()
  } else if (action === 'comment') {
    commentPanelVisible.value = !commentPanelVisible.value
  } else if (action === 'export_current') {
    exportPng('current')
  } else if (action === 'export_all') {
    exportPng('all')
  } else if (action === 'set_default') {
    void setDefaultDashboard()
  } else if (action === 'announcement') {
    announcementModalVisible.value = true
  } else if (action === 'language') {
    languageModalVisible.value = true
  }
}

const createBookmark = async (): Promise<void> => {
  if (!dashboard.value || !bookmarkDraft.value.name.trim()) {
    return
  }

  const bookmarkFilterState = {
    ...filterState.value,
    __tree: `${treeFilter.value.region}/${treeFilter.value.province}/${treeFilter.value.city}`,
    __dynamicField: dynamicField.value,
    __globalParameter: globalParameter.value,
    __tableSortMode: tableSortMode.value,
    __frozenColumn: frozenColumn.value,
    __visibleFields: JSON.stringify(tableVisibleFields.value),
    __drillTrail: JSON.stringify(drillTrail.value),
    __activeDrill: JSON.stringify(activeDrill.value),
  }
  const bookmark: DashboardBookmark = {
    id: `bookmark_${Date.now()}`,
    name: bookmarkDraft.value.name.trim(),
    scope: bookmarkDraft.value.scope,
    filterState: bookmarkFilterState,
    activePageId: activePageId.value,
    createdBy: 'Chaoyang Xu',
    createdAt: new Date().toISOString(),
  }
  dashboard.value.bookmarks = [bookmark, ...(dashboard.value.bookmarks ?? [])]
  await syncDashboardPatch({ bookmarks: dashboard.value.bookmarks })
  bookmarkDraft.value = { name: '', scope: 'private' }
  bookmarkModalVisible.value = false
  actionNotice.value = bookmark.scope === 'public' ? '公共书签已创建，权限按仪表盘阅览权限校验。' : '个人书签已创建。'
}

const applyBookmark = (bookmarkId: string): void => {
  const bookmark = dashboard.value?.bookmarks?.find((item) => item.id === bookmarkId)

  if (!bookmark) {
    return
  }

  const nextFilterState = Object.fromEntries(Object.entries(bookmark.filterState).filter(([key]) => !key.startsWith('__')))
  filterState.value = { ...nextFilterState }
  appliedFilterState.value = { ...nextFilterState }
  activePageId.value = bookmark.activePageId
  const [region, province, city] = (bookmark.filterState.__tree ?? '').split('/')
  if (region && province && city) {
    treeFilter.value = { ...treeFilter.value, region, province, city }
  }
  dynamicField.value = bookmark.filterState.__dynamicField ?? dynamicField.value
  globalParameter.value = bookmark.filterState.__globalParameter ?? globalParameter.value
  tableSortMode.value = (bookmark.filterState.__tableSortMode as typeof tableSortMode.value) ?? tableSortMode.value
  frozenColumn.value = bookmark.filterState.__frozenColumn ?? frozenColumn.value
  try {
    drillTrail.value = bookmark.filterState.__drillTrail ? JSON.parse(bookmark.filterState.__drillTrail) as string[] : drillTrail.value
    activeDrill.value = bookmark.filterState.__activeDrill ? JSON.parse(bookmark.filterState.__activeDrill) as DrillState | null : activeDrill.value
  } catch {
    drillTrail.value = ['大区']
    activeDrill.value = null
  }
  try {
    tableVisibleFields.value = bookmark.filterState.__visibleFields ? JSON.parse(bookmark.filterState.__visibleFields) as Record<string, boolean> : tableVisibleFields.value
  } catch {
    actionNotice.value = '书签应用成功，但字段显示状态已失效。'
    return
  }
  actionNotice.value = `已恢复书签「${bookmark.name}」保存的筛选状态。`
}

const addComment = async (componentId: string, parentCommentId?: string): Promise<void> => {
  if (!dashboard.value || !commentDraft.value.trim()) {
    return
  }

  const component = currentPagesForView.value.flatMap((page) => page.components).find((item) => item.id === componentId)
  const point = component ? getCurrentClickedDataPoint(component) : null
  const comment: DashboardComment = {
    id: `comment_${Date.now()}`,
    dashboardId: dashboard.value.id,
    pageId: activePageId.value,
    componentId,
    chartId: component?.widget?.id,
    parentCommentId,
    content: commentDraft.value.trim(),
    mentions: commentDraft.value.match(/@[\w\u4e00-\u9fa5]+/g) ?? [],
    locator: component?.type === 'stitched_table'
      ? {
          type: 'table_cell',
          rowKey: sortedTableRows(component)[0]?.dimension,
          columnKey: 'value',
          pageIndex: 1,
          filterState: { ...appliedFilterState.value },
        }
      : {
          type: 'chart',
          rowKey: point?.value,
          columnKey: point?.field,
          filterState: { ...appliedFilterState.value, dynamic_field: dynamicField.value },
        },
    createdBy: 'Chaoyang Xu',
    createdAt: new Date().toISOString(),
  }
  dashboard.value.comments = [...(dashboard.value.comments ?? []), comment]
  await syncDashboardPatch({ comments: dashboard.value.comments })
  commentDraft.value = ''
  actionNotice.value = comment.mentions.length
    ? `评论已发送；通知包含「${dashboard.value.name} / ${component?.name ?? '组件'}」和评论摘要。办公平台未集成时只保存评论。`
    : '评论已发送，图表上已展示评论标记。'
}

const replyComment = async (comment: DashboardComment): Promise<void> => {
  const replyContent = replyDrafts.value[comment.id]?.trim()

  if (!replyContent || !dashboard.value) {
    return
  }

  const reply: DashboardComment = {
    id: `comment_reply_${Date.now()}`,
    dashboardId: dashboard.value.id,
    pageId: comment.pageId,
    componentId: comment.componentId,
    chartId: comment.chartId,
    parentCommentId: comment.id,
    content: replyContent,
    mentions: replyContent.match(/@[\w\u4e00-\u9fa5]+/g) ?? [],
    locator: comment.locator,
    createdBy: 'Chaoyang Xu',
    createdAt: new Date().toISOString(),
  }
  dashboard.value.comments = [...(dashboard.value.comments ?? []), reply]
  replyDrafts.value = { ...replyDrafts.value, [comment.id]: '' }
  await syncDashboardPatch({ comments: dashboard.value.comments })
  actionNotice.value = `回复已保存；将通知原评论创建人 ${comment.createdBy}（若办公平台已集成）。`
}

const deleteComment = async (comment: DashboardComment): Promise<void> => {
  if (!dashboard.value) {
    return
  }

  dashboard.value.comments = (dashboard.value.comments ?? []).map((item) =>
    item.id === comment.id ? { ...item, content: '该评论已删除', deletedAt: new Date().toISOString() } : item,
  )
  await syncDashboardPatch({ comments: dashboard.value.comments })
  actionNotice.value = '评论已删除，回复关系保留。'
}

const isValidHttpUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

const validateSubscription = (): string => {
  const draft = subscriptionDraft.value

  if (!draft.title.trim()) {
    return '请填写订阅标题。'
  }

  if (draft.scope === 'selected_pages' && !draft.sheetIds.length) {
    return '指定 sheet 订阅至少选择一个页面。'
  }

  if (draft.scope === 'bookmark' && !draft.bookmarkId) {
    return '依据书签订阅需要选择一个已有书签。'
  }

  if (draft.scope === 'bookmark' && draft.bookmarkId && !(dashboard.value?.bookmarks ?? []).some((bookmark) => bookmark.id === draft.bookmarkId)) {
    return '所选书签已不存在，请重新配置订阅范围。'
  }

  if (subscriptionNeedsPermissionPrincipal.value && !draft.permissionPrincipal) {
    return '群组和邮件组推送必须指定权限依据人。'
  }

  if (subscriptionNeedsPermissionPrincipal.value && currentUserPermissionRole.value !== 'admin') {
    return '群组推送和邮件组推送仅管理员可配置。'
  }

  if (subscriptionUsesWebhook.value && !draft.webhookConfigId) {
    return 'Webhook 推送需要先选择一个 Webhook 配置。'
  }

  if (draft.interpretationEnabled && draft.pushChannel !== 'feishu') {
    return '订阅总结/解读当前仅支持飞书推送。'
  }

  return ''
}

const sendSubscriptionTest = (): void => {
  const error = validateSubscription()
  if (error) {
    subscriptionValidationError.value = error
    return
  }

  subscriptionValidationError.value = ''
  subscriptionTestPreview.value = [
    subscriptionDraft.value.appendDate ? '2026-05-25 每日广告运营仪表盘' : subscriptionDraft.value.title,
    `范围：${subscriptionDraft.value.scope === 'selected_pages' ? `${subscriptionDraft.value.sheetIds.length} 个 sheet` : subscriptionDraft.value.scope === 'bookmark' ? '依据书签' : subscriptionDraft.value.scope === 'quick_bookmark' ? '快捷书签' : '全部页面'}`,
    `内容：访问链接${subscriptionDraft.value.contentConfig.includeLink ? '开启' : '关闭'}，截图 ${subscriptionDraft.value.contentConfig.screenshotMode}，PDF ${subscriptionDraft.value.contentConfig.includePdf ? '开启' : '关闭'}`,
    `推送方式：${subscriptionPushChannelOptions.value.find((option) => option.value === subscriptionDraft.value.pushChannel)?.label ?? subscriptionDraft.value.pushChannel}`,
  ].join('\n')
  actionNotice.value = '测试订阅已发送；测试不会创建订阅记录。'
}

const saveSubscription = async (): Promise<void> => {
  if (!dashboard.value) {
    return
  }

  const error = validateSubscription()
  if (error) {
    subscriptionValidationError.value = error
    return
  }

  const selectedSheetIds = subscriptionDraft.value.scope === 'selected_pages'
    ? subscriptionDraft.value.sheetIds
    : subscriptionDraft.value.scope === 'quick_bookmark'
      ? [activePageId.value]
      : pages.value.map((page) => page.id)
  const hasBlockingScreenshotIssue = subscriptionReadinessIssues.value.length > 0
    && (subscriptionDraft.value.contentConfig.screenshotMode !== 'none' || subscriptionDraft.value.contentConfig.includePdf)
  const subscription: DashboardSubscription = {
    ...subscriptionDraft.value,
    quickBookmarkState: subscriptionDraft.value.scope === 'quick_bookmark'
      ? { ...appliedFilterState.value, dynamic_field: dynamicField.value, global_parameter: globalParameter.value }
      : subscriptionDraft.value.quickBookmarkState,
    id: `subscription_${Date.now()}`,
    sheetIds: selectedSheetIds,
    lastStatus: hasBlockingScreenshotIssue
      ? 'retry_scheduled'
      : subscriptionDraft.value.triggerType === 'data_ready'
        ? 'pending'
        : 'success',
    failureReason: hasBlockingScreenshotIssue ? subscriptionReadinessIssues.value.join('；') : undefined,
    createdAt: new Date().toISOString(),
  }
  dashboard.value.subscriptions = [subscription, ...(dashboard.value.subscriptions ?? [])]
  await syncDashboardPatch({ subscriptions: dashboard.value.subscriptions })
  subscriptionModalVisible.value = false
  subscriptionValidationError.value = ''
  actionNotice.value = hasBlockingScreenshotIssue
    ? '订阅已创建；当前存在空数据或查询失败图表，截图/PDF 推送会暂停并在 1 小时后重试。'
    : subscription.triggerType === 'data_ready'
      ? '订阅已创建，将在数据同步完成且到达推送时间后触发。'
      : '订阅已创建，定时推送失败时会在 1 小时后自动重试一次。'
}

const validateWebhookDraft = (): string => {
  if (!isProjectAdmin.value) {
    return '仅项目管理员可创建 Webhook 配置。'
  }

  if (!webhookDraft.value.name.trim()) {
    return '请填写 Webhook 名称。'
  }

  if (webhookDraft.value.name.trim().length > 30) {
    return 'Webhook 名称建议不超过 30 字。'
  }

  if (!isValidHttpUrl(webhookDraft.value.url)) {
    return '请输入合法的 Webhook URL。'
  }

  if (!webhookDraft.value.interfaceType) {
    return '请选择接口类型。'
  }

  if (webhookDraft.value.secretType === 'static_token' && !webhookDraft.value.staticToken?.trim()) {
    return '静态 Token 模式必须填写 Token。'
  }

  if (webhookDraft.value.secretType === 'dynamic_token') {
    if (!webhookDraft.value.dynamicTokenConfig?.tokenApiUrl || !isValidHttpUrl(webhookDraft.value.dynamicTokenConfig.tokenApiUrl)) {
      return '动态 Token 模式必须填写合法的获取 Token 接口。'
    }

    if (!webhookDraft.value.dynamicTokenConfig?.tokenParamName) {
      return '动态 Token 模式必须填写 token 参数名。'
    }
  }

  if (!webhookDraft.value.subscribedEvents.length) {
    return '请至少选择一个订阅事件。'
  }

  return ''
}

const testWebhook = (): void => {
  const error = validateWebhookDraft()
  if (error) {
    webhookValidationError.value = error
    webhookTestStatus.value = 'failed'
    return
  }

  webhookValidationError.value = ''
  webhookTestStatus.value = 'success'
  actionNotice.value = 'Webhook 测试请求已发送并记录日志；2xx 响应视为成功。'
}

const saveWebhookConfig = (): void => {
  const error = validateWebhookDraft()
  if (error) {
    webhookValidationError.value = error
    webhookTestStatus.value = 'failed'
    return
  }

  const config: DashboardWebhookConfig = {
    ...clone(webhookDraft.value),
    id: `webhook_${Date.now()}`,
    projectId: dashboard.value?.projectId ?? 'project-dataops-demo',
    createdBy: 'Chaoyang Xu',
    createdAt: new Date().toISOString(),
    lastTestStatus: webhookTestStatus.value,
    failureLog: webhookTestStatus.value === 'failed' ? '测试请求未通过。' : undefined,
  }
  webhookConfigs.value = [config, ...webhookConfigs.value]
  subscriptionDraft.value.webhookConfigId = config.id
  monitorDraft.value.webhookConfigId = config.id
  webhookValidationError.value = ''
  webhookModalVisible.value = false
  actionNotice.value = 'Webhook 配置已保存，可在订阅和监控推送方式中选择。'
}

const validateMonitor = (): string => {
  const component = monitorSelectedComponent.value

  if (!monitorDraft.value.name.trim()) {
    return '请填写监控名称。'
  }

  if (!component?.widget) {
    return '请选择已保存的图表组件。'
  }

  if (!monitorDraft.value.dateField) {
    return '请选择日期维度。'
  }

  if (monitorDraft.value.timeRangeMode === 'latest_n' && Number(monitorDraft.value.recentPointCount ?? 0) < 2) {
    return '最近 N 个时间点至少需要填写 2。'
  }

  if (monitorDraft.value.triggerFactor === 'smart_detection') {
    if (component.widget.widgetType !== 'line' && component.widget.chartType !== 'line') {
      return '智能波动检测仅支持折线图。'
    }

    if ((component.widget.chartData?.length ?? 0) < 15) {
      return '智能波动检测至少需要 15 个时间点。'
    }
  }

  if (!monitorDraft.value.rule.trim()) {
    return '请填写报警规则。'
  }

  const schedule = monitorDraft.value.schedule
  const minuteMatch = schedule.match(/每\s*(\d+)\s*分钟/)
  if (minuteMatch && Number(minuteMatch[1]) < 10) {
    return '监控最小间隔为 10 分钟。'
  }

  if (monitorDraft.value.pushChannel === 'webhook' && !monitorDraft.value.webhookConfigId) {
    return 'Webhook 报警需要选择一个 Webhook 配置。'
  }

  return ''
}

const sendMonitorTest = (): void => {
  const error = validateMonitor()
  if (error) {
    monitorValidationError.value = error
    return
  }

  monitorValidationError.value = ''
  monitorTestPreview.value = [
    `监控：${monitorDraft.value.name}`,
    `触发因素：${monitorTriggerFactorOptions.find((option) => option.value === monitorDraft.value.triggerFactor)?.label}`,
    `规则：${monitorDraft.value.compareRange} ${monitorCompareMethodOptions.find((option) => option.value === monitorDraft.value.compareMethod)?.label ?? ''} ${monitorDraft.value.rule}`,
    `处理建议：${monitorDraft.value.suggestionText}`,
  ].join('\n')
  actionNotice.value = '监控测试消息已发送；测试不会发送到群，也不会创建监控记录。'
}

const saveMonitor = async (): Promise<void> => {
  if (!dashboard.value) {
    return
  }

  const error = validateMonitor()
  if (error) {
    monitorValidationError.value = error
    return
  }

  const monitor: DashboardMonitor = {
    ...monitorDraft.value,
    id: `monitor_${Date.now()}`,
    testSent: Boolean(monitorTestPreview.value),
    lastAlertStatus: 'idle',
    failureLog: monitorDraft.value.pushChannel === 'webhook' ? 'Webhook 请求失败会记录失败日志并进入重试。' : undefined,
    createdAt: new Date().toISOString(),
  }
  dashboard.value.monitors = [monitor, ...(dashboard.value.monitors ?? [])]
  await syncDashboardPatch({ monitors: dashboard.value.monitors })
  monitorModalVisible.value = false
  monitorValidationError.value = ''
  actionNotice.value = '监控已创建，可在监控列表按权限范围查看和管理。'
}

const createEmbedLink = (component?: DashboardComponent): void => {
  const targetComponent = component ?? selectedEmbedComponent.value
  const baseUrl = `${window.location.origin}/analysis-center/dashboards/${dashboardId.value}/embed`
  const params = new URLSearchParams({
    target: targetComponent ? targetComponent.id : 'dashboard',
    source: dashboard.value?.publishMode === 'versioned' ? 'published' : 'latest',
    pages: embedDraft.value.pageScope,
    showDashboardName: String(embedDraft.value.showDashboardName),
    showOwner: String(embedDraft.value.showOwner),
    showActions: String(embedDraft.value.showActions),
    showChartName: String(embedDraft.value.showChartName),
    showTooltipIcons: String(embedDraft.value.showTooltipIcons),
    showToolbarIcons: String(embedDraft.value.showToolbarIcons),
    showFilterControls: String(embedDraft.value.showFilterControls),
    includeFilters: String(embedDraft.value.includeFilters),
  })
  if (embedDraft.value.includeFilters) {
    params.set('page', activePageId.value)
    params.set('dynamic_field', dynamicField.value)
    params.set('global_parameter', globalParameter.value)
    Object.entries(filterState.value).forEach(([key, value]) => {
      if (value) {
        params.set(`filter_${key}`, value)
      }
    })
  }
  embedLink.value = `${baseUrl}?${params.toString()}`
  actionNotice.value = targetComponent
    ? `图表「${targetComponent.name}」嵌出链接已生成，下载数据仍按平台权限校验。`
    : '仪表盘嵌出链接已生成，访问仍需平台鉴权并读取已发布版本。'
}

const exportPng = (scope: 'current' | 'all'): void => {
  actionNotice.value = scope === 'current'
    ? '已按当前发布版本导出当前页 PNG；错误和无权限组件保留占位。'
    : '已按当前发布版本导出全部页面 PNG；多 sheet 已合并，错误和无权限组件保留占位。'
}

const openDrillConfig = (component: DashboardComponent): void => {
  configuringComponent.value = component
  drillDraft.value = clone(getComponentDrillConfig(component))
  drillConfigModalVisible.value = true
}

const saveDrillConfig = (): void => {
  const component = configuringComponent.value

  if (!component) {
    return
  }

  updateComponentConfig(component.id, { drillConfig: clone(drillDraft.value), drillPath: drillDraft.value.hierarchyFields })
  drillConfigModalVisible.value = false
  actionNotice.value = `「${component.name}」下钻设置已保存；阅览态下钻为临时状态，可由书签保存。`
}

const openLinkageConfig = (component: DashboardComponent): void => {
  configuringComponent.value = component
  const currentConfig = getComponentLinkageConfig(component)
  linkageDraft.value = {
    ...clone(currentConfig),
    targetComponentIds: currentConfig.targetComponentIds.length ? currentConfig.targetComponentIds : getCompatibleChartTargets(component.id),
  }
  linkageValidationError.value = ''
  linkageConfigModalVisible.value = true
}

const updateLinkageMappingStatus = (mapping: LinkageFieldMapping): LinkageFieldMapping => {
  if (!mapping.sourceField || !mapping.targetField) {
    return { ...mapping, status: 'missing' }
  }

  if (mapping.sourceType !== mapping.targetType) {
    return { ...mapping, status: 'type_mismatch' }
  }

  return { ...mapping, status: 'valid' }
}

const updateLinkageFieldMapping = (index: number, patch: Partial<LinkageFieldMapping>): void => {
  linkageDraft.value = {
    ...linkageDraft.value,
    fieldMappings: linkageDraft.value.fieldMappings.map((mapping, mappingIndex) =>
      mappingIndex === index ? updateLinkageMappingStatus({ ...mapping, ...patch }) : mapping,
    ),
  }
}

const addLinkageFieldMapping = (): void => {
  linkageDraft.value = {
    ...linkageDraft.value,
    fieldMappings: [
      ...linkageDraft.value.fieldMappings,
      { sourceField: '', targetField: '', sourceType: 'text', targetType: 'text', status: 'missing' },
    ],
  }
}

const validateLinkageConfig = (): boolean => {
  if (!linkageDraft.value.targetComponentIds.length) {
    linkageValidationError.value = '至少选择一个被联动图表。'
    return false
  }

  const invalidMapping = linkageDraft.value.fieldMappings.find((mapping) => mapping.status !== 'valid')
  if (invalidMapping) {
    linkageValidationError.value = invalidMapping.status === 'type_mismatch'
      ? `字段「${invalidMapping.sourceField || '-'}」类型不兼容，请配置同类型字段。`
      : '至少关联一个完整字段，字段配置完成后状态会变为绿色。'
    return false
  }

  linkageValidationError.value = ''
  return true
}

const saveLinkageConfig = (): void => {
  const component = configuringComponent.value

  if (!component || !validateLinkageConfig()) {
    return
  }

  updateComponentConfig(component.id, { linkageConfig: clone(linkageDraft.value) })
  linkageConfigModalVisible.value = false
  actionNotice.value = `「${component.name}」联动配置已保存，支持单点、多点和下钻字段联动。`
}

const deleteLinkageConfig = (): void => {
  const component = configuringComponent.value

  if (!component) {
    return
  }

  updateComponentConfig(component.id, {
    linkageConfig: {
      ...createDefaultLinkageConfig(),
      enabled: false,
      targetComponentIds: [],
    },
  })
  activeLinkage.value = activeLinkage.value?.sourceId === component.id ? null : activeLinkage.value
  linkageConfigModalVisible.value = false
  actionNotice.value = `「${component.name}」联动配置已删除，保存后阅览态不再响应。`
}

const openJumpConfig = (component: DashboardComponent): void => {
  configuringComponent.value = component
  jumpDraft.value = clone(getComponentJumpConfig(component))
  jumpConfigModalVisible.value = true
}

const updateJumpRule = (ruleId: string, patch: Partial<JumpRule>): void => {
  jumpDraft.value = {
    ...jumpDraft.value,
    rules: jumpDraft.value.rules.map((rule) => rule.id === ruleId ? { ...rule, ...patch } : rule),
  }
}

const saveJumpConfig = (): void => {
  const component = configuringComponent.value
  const invalidRule = jumpDraft.value.rules.find((rule) =>
    rule.jumpType === 'dashboard'
      ? !rule.targetDashboardId
      : !rule.urlTemplate.includes('{') || !rule.urlTemplate.includes('}'),
  )

  if (!component) {
    return
  }

  if (invalidRule) {
    actionNotice.value = invalidRule.jumpType === 'dashboard'
      ? '仪表盘跳转必须选择当前项目下目标仪表盘。'
      : '网页跳转 URL 需要包含字段参数模板，例如 {省份}。'
    return
  }

  updateComponentConfig(component.id, { jumpConfig: clone(jumpDraft.value), jumpTemplate: jumpDraft.value.rules[1]?.urlTemplate })
  jumpConfigModalVisible.value = false
  actionNotice.value = `「${component.name}」跳转配置已保存；仪表盘级配置优先于图表模板链接。`
}

const activateLinkage = (component: DashboardComponent, mode: LinkageMode): void => {
  if (!mode) {
    activeLinkage.value = null
    actionNotice.value = '已取消图表联动，目标图表恢复原筛选。'
    return
  }

  const config = getComponentLinkageConfig(component)
  if (!config.enabled) {
    actionNotice.value = '该图表联动配置已删除，阅览态不再响应联动。'
    return
  }

  const invalidMapping = config.fieldMappings.find((mapping) => mapping.status !== 'valid')
  if (invalidMapping) {
    actionNotice.value = '联动字段配置未完成，目标图表不会重新查询。'
    return
  }

  const point = getCurrentClickedDataPoint(component)
  if (!point.value) {
    actionNotice.value = '字段值为空，联动不生效。'
    return
  }

  const targetComponentIds = config.targetComponentIds.length ? config.targetComponentIds : getCompatibleChartTargets(component.id)
  activeLinkage.value = {
    sourceId: component.id,
    mode,
    targetComponentIds,
    fieldMappings: config.fieldMappings,
    values: mode === 'single' ? [point.value] : [point.value, '浙江'],
    row: point.row,
  }
  actionNotice.value = mode === 'single'
    ? `单点联动已生效，${targetComponentIds.length} 个目标图表已按「${point.value}」过滤。`
    : `多点联动已生效，同字段多值已按 in 条件合并，不同字段按映射关系组合。`
}

const drillDown = (component?: DashboardComponent): void => {
  const targetComponent = component ?? viewerCanvasComponents.value.find((item) => Boolean(item.widget))
  const config = targetComponent ? getComponentDrillConfig(targetComponent) : createDefaultDrillConfig()
  const levels = config.hierarchyFields.length ? config.hierarchyFields : ['大区', '省份', '城市']
  const nextLevel = levels[drillTrail.value.length]

  if (!targetComponent) {
    actionNotice.value = '当前页面没有可下钻图表。'
    return
  }

  if (!config.enabled) {
    actionNotice.value = '当前图表未开启下钻能力。'
    return
  }

  if (config.mode === 'dataset_hierarchy' && !config.datasetEditPermission) {
    actionNotice.value = '通过数据集字段层级下钻需要数据集编辑权限。'
    return
  }

  if (config.mode === 'chart_setting' && !config.datasetViewPermission) {
    actionNotice.value = '通过图表钻取设置下钻需要数据集查看权限。'
    return
  }

  if (!nextLevel) {
    actionNotice.value = '已到达最末层级，无法继续下钻。'
    return
  }

  const currentLevel = drillTrail.value.at(-1) ?? levels[0] ?? '大区'
  const point = getCurrentClickedDataPoint(targetComponent)
  const nextPath = [...(activeDrill.value?.path ?? []), { field: currentLevel, value: point.value }]
  drillTrail.value = [...drillTrail.value, nextLevel]
  activeDrill.value = {
    componentId: targetComponent.id,
    source: config.mode,
    path: nextPath,
  }
  actionNotice.value = `已聚焦下钻到「${nextLevel}」，查询条件加入 ${currentLevel}=${point.value}。`
}

const drillUp = (index: number): void => {
  drillTrail.value = drillTrail.value.slice(0, index + 1)
  if (index === 0) {
    activeDrill.value = null
  } else if (activeDrill.value) {
    activeDrill.value = {
      ...activeDrill.value,
      path: activeDrill.value.path.slice(0, index),
    }
  }
  actionNotice.value = `已返回「${drillTrail.value.at(-1) ?? '大区'}」层级。`
}

const clearDrill = (): void => {
  activeDrill.value = null
  drillTrail.value = ['大区']
  actionNotice.value = '已清除下钻状态，图表恢复默认层级。'
}

const replaceJumpTemplate = (template: string, row: Record<string, string>): string =>
  template.replace(/\{([^}]+)\}/g, (_, fieldName: string) => encodeURIComponent(row[fieldName] ?? ''))

const appendGlobalFiltersToUrl = (url: string): string => {
  const nextUrl = new URL(url)
  Object.entries(appliedFilterState.value).forEach(([key, value]) => {
    if (!value) {
      return
    }

    nextUrl.searchParams.set(`filter_${key}`, value.includes(',') ? `in(${value})` : value)
  })
  return nextUrl.toString()
}

const getJumpRule = (component: DashboardComponent, jumpType: JumpRule['jumpType']): JumpRule | null => {
  const config = getComponentJumpConfig(component)

  if (!config.enabled) {
    return null
  }

  return config.rules.find((rule) => rule.jumpType === jumpType) ?? null
}

const jumpToDashboard = (component?: DashboardComponent): void => {
  const targetComponent = component ?? viewerCanvasComponents.value.find((item) => Boolean(item.widget))

  if (!targetComponent) {
    return
  }

  const rule = getJumpRule(targetComponent, 'dashboard')
  if (!rule) {
    actionNotice.value = '当前图表没有启用仪表盘跳转配置。'
    return
  }

  const point = getCurrentClickedDataPoint(targetComponent)
  const query = Object.fromEntries(rule.fieldMappings.map((mapping) => [mapping.targetFilter, point.row[mapping.sourceField] ?? point.value]))
  if (rule.passFilters) {
    Object.entries(appliedFilterState.value).forEach(([key, value]) => {
      query[`filter_${key}`] = value
    })
  }
  query.locale = dashboard.value?.multiLangConfig?.locale ?? 'zh-CN'
  actionNotice.value = '已将当前字段筛选条件传递到目标仪表盘。'
  void router.push({
    path: `/analysis-center/dashboards/${rule.targetDashboardId}`,
    query,
  })
}

const jumpToWeb = (component?: DashboardComponent): void => {
  const targetComponent = component ?? viewerCanvasComponents.value.find((item) => Boolean(item.widget))

  if (!targetComponent) {
    return
  }

  const rule = getJumpRule(targetComponent, 'web')
  if (!rule) {
    actionNotice.value = '当前图表没有启用网页跳转配置。'
    return
  }

  const point = getCurrentClickedDataPoint(targetComponent)
  let url = replaceJumpTemplate(rule.urlTemplate, point.row)
  if (rule.includeGlobalFilters) {
    url = appendGlobalFiltersToUrl(url)
  }
  jumpPreviewUrl.value = url
  jumpPreviewOpenMode.value = rule.openMode
  jumpPreviewError.value = ''
  jumpPreviewModalVisible.value = true
}

const sendInteractionEvent = (component: DashboardComponent): void => {
  const config = getComponentInteractionConfig(component)
  const rule = config.rules[0]

  if (!config.enabled) {
    actionNotice.value = '当前图表未启用交互事件，请先在编辑态配置并保存。'
    return
  }

  if (!config.privateDeploymentEnabled) {
    actionNotice.value = '交互事件仅私有化部署支持，需要先开启功能。'
    return
  }

  if (!rule) {
    actionNotice.value = '当前图表没有可触发的交互事件规则。'
    return
  }

  const row = getCurrentDataRow()
  const fields = rule.chartScope === 'histogram'
    ? [
        { name: '区间', displayName: '区间', rawValue: '300k-400k', displayValue: '300k-400k' },
        { name: dynamicField.value, displayName: dynamicField.value, rawValue: '356920', displayValue: '356,920' },
        { name: '占比', displayName: '占比', rawValue: '34.8%', displayValue: '34.8%' },
      ]
    : [
        { name: rule.fieldName, displayName: rule.fieldName, rawValue: row[rule.fieldName] ?? treeFilter.value.province, displayValue: row[rule.fieldName] ?? treeFilter.value.province },
        { name: '城市', displayName: '城市', rawValue: treeFilter.value.city, displayValue: treeFilter.value.city },
        { name: dynamicField.value, displayName: dynamicField.value, rawValue: '356920', displayValue: '356,920' },
      ]
  const message = {
    version: 0,
    event: rule.eventName,
    payload: {
      row: fields.map((field) => ({
        triggered: rule.chartScope === 'histogram' ? field.name === '区间' : field.name === rule.fieldName,
        ...field,
      })),
    },
  }
  window.parent.postMessage(message, config.allowOrigins[0] ?? '*')
  interactionPayload.value = JSON.stringify(message, null, 2)
  interactionModalVisible.value = true
  actionNotice.value = `组件「${component.name}」已向父页面发送 postMessage 事件。`
}

const startDrag = (component: DashboardComponent): void => {
  if (!selectedComponentIds.value.includes(component.id)) {
    selectComponent(component)
  }
  draggingComponentId.value = component.id
}

const updateDragGuide = (event: DragEvent): void => {
  const target = event.currentTarget

  if (!draggingComponentId.value || !(target instanceof HTMLElement)) {
    return
  }

  const rect = target.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  dragGuide.value = {
    x,
    y,
    centerX: Math.abs(x - rect.width / 2) < 18,
    centerY: Math.abs(y - rect.height / 2) < 18,
  }
}

const dropComponent = (event: DragEvent): void => {
  const componentId = draggingComponentId.value
  const component = activePage.value?.components.find((item) => item.id === componentId)
  const target = event.currentTarget

  if (!component || !(target instanceof HTMLElement)) {
    return
  }

  const rect = target.getBoundingClientRect()
  const x = Math.max(Math.round((event.clientX - rect.left) / 160), 0)
  const y = Math.max(Math.round((event.clientY - rect.top) / 120), 0)
  const dx = x - component.layout.x
  const dy = y - component.layout.y
  const selectedIds = new Set(selectedComponentIds.value)
  const groupId = component.groupId
  const movingIds = new Set(
    activePage.value?.components
      .filter((item) =>
        selectedIds.size > 1
          ? selectedIds.has(item.id)
          : Boolean(groupId && item.groupId === groupId) || item.id === component.id,
      )
      .map((item) => item.id) ?? [component.id],
  )
  pushUndo()
  if (activePage.value) {
    activePage.value.components = activePage.value.components.map((item) =>
      movingIds.has(item.id)
        ? {
            ...item,
            layout: {
              ...item.layout,
              x: Math.max(item.layout.x + dx, 0),
              y: Math.max(item.layout.y + dy, 0),
              floating: settings.value?.layoutMode === 'free' || item.layout.floating,
            },
            updatedAt: new Date().toISOString(),
          }
        : item,
    )
    markDirty()
  }
  draggingComponentId.value = ''
  dragGuide.value = null
}

const getCanvasPoint = (event: MouseEvent): { x: number, y: number } | null => {
  const target = event.currentTarget

  if (!(target instanceof HTMLElement)) {
    return null
  }

  const rect = target.getBoundingClientRect()
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }
}

const startCanvasSelection = (event: MouseEvent): void => {
  const point = getCanvasPoint(event)

  if (!point) {
    return
  }

  if (!event.metaKey && !event.ctrlKey) {
    clearSelection()
  }
  selectionStart.value = point
  selectionBox.value = { ...point, width: 0, height: 0 }
}

const updateCanvasSelection = (event: MouseEvent): void => {
  const point = getCanvasPoint(event)
  const start = selectionStart.value

  if (!point || !start) {
    return
  }

  selectionBox.value = {
    x: Math.min(point.x, start.x),
    y: Math.min(point.y, start.y),
    width: Math.abs(point.x - start.x),
    height: Math.abs(point.y - start.y),
  }
}

const finishCanvasSelection = (): void => {
  const box = selectionBox.value
  const page = activePage.value

  if (!box || !page) {
    return
  }

  if (box.width < 8 && box.height < 8) {
    clearSelection()
  } else {
    const selectedIds = page.components
      .filter((component) => {
        const centerX = settings.value?.layoutMode === 'free'
          ? component.layout.x * 132 + 16 + component.layout.width * 90
          : (component.layout.x % 2) * 320 + 160
        const centerY = settings.value?.layoutMode === 'free'
          ? component.layout.y * 96 + 16 + component.layout.height * 60
          : component.layout.y * 150 + 80

        return centerX >= box.x && centerX <= box.x + box.width && centerY >= box.y && centerY <= box.y + box.height
      })
      .map((component) => component.id)

    selectedComponentIds.value = selectedIds
    selectedComponentId.value = selectedIds.at(-1) ?? ''
  }

  selectionStart.value = null
  selectionBox.value = null
}

const getComponentStyle = (component: DashboardComponent): Record<string, string> => {
  const appearance = (component.props.appearance as Record<string, unknown> | undefined) ?? {}
  const baseStyle: Record<string, string> = {
    backgroundColor: String(appearance.fillColor ?? currentTheme.value?.dashboardConfig.appearance?.fillColor ?? '#ffffff'),
    borderColor: String(appearance.borderColor ?? currentTheme.value?.dashboardConfig.appearance?.borderColor ?? '#e5e7eb'),
    borderRadius: `${Number(appearance.borderRadius ?? 8)}px`,
  }

  if (settings.value?.layoutMode === 'free' || component.layout.floating) {
    return {
      ...baseStyle,
      position: 'absolute',
      left: `${component.type === 'top_container' ? 16 : component.layout.x * 132 + 16}px`,
      top: `${component.layout.y * 96 + 16}px`,
      width: component.type === 'top_container' ? 'calc(100% - 32px)' : `${component.layout.width * 180}px`,
      minHeight: component.type === 'top_container' ? `${Number((component.props.topContainer as TopContainerProps | undefined)?.height ?? 120)}px` : `${component.layout.height * 120}px`,
      zIndex: String(component.zIndex),
    }
  }

  return {
    ...baseStyle,
    gridColumn: component.type === 'top_container' ? '1 / -1' : `span ${Math.min(component.layout.width, 2)}`,
    minHeight: component.type === 'top_container' ? `${Number((component.props.topContainer as TopContainerProps | undefined)?.height ?? 120)}px` : `${component.layout.height * 132}px`,
  }
}

const getDividerInlineStyle = (component: DashboardComponent): string => {
  const divider = (component.props.divider as Record<string, unknown> | undefined) ?? {}
  const lineType = String(divider.lineType ?? 'solid')
  const thickness = Number(divider.thickness ?? 2)
  const color = String(divider.color ?? '#94a3b8')

  return `border-top-style: ${lineType}; border-top-width: ${thickness}px; border-top-color: ${color};`
}

const getTopContainerChildren = (component: DashboardComponent): DashboardComponent[] => {
  const childIds = ((component.props.topContainer as TopContainerProps | undefined)?.childrenComponentIds ?? [])
  const page = activePage.value

  if (!page) {
    return []
  }

  return childIds
    .map((id) => page.components.find((item) => item.id === id))
    .filter((item): item is DashboardComponent => Boolean(item))
}

const updateCanvasBackground = (value: string): void => {
  if (!settings.value) {
    return
  }

  settings.value.canvasBackground.color = value
  markDirty()
}

const toggleAutoRefresh = (value: boolean): void => {
  if (!settings.value) {
    return
  }

  settings.value.autoRefresh = {
    enabled: value,
    intervalSeconds: settings.value.autoRefresh?.intervalSeconds ?? 300,
  }
  markDirty()
}

const getDashboardChartComponents = (): DashboardComponent[] =>
  pages.value.flatMap((page) => page.components.filter((component) => Boolean(component.widget)))

const buildDatasetReplaceMappings = (targetDatasetId: string): DatasetReplaceFieldMapping[] => {
  const typeMismatch = targetDatasetId === 'ds_finance_order'

  return [
    {
      oldFieldId: 'city',
      oldFieldName: '城市',
      oldFieldType: 'text',
      newFieldId: typeMismatch ? 'amount' : 'city_name',
      newFieldName: typeMismatch ? '订单金额' : '城市名称',
      newFieldType: typeMismatch ? 'number' : 'text',
      status: typeMismatch ? 'type_mismatch' : 'matched',
    },
    {
      oldFieldId: 'ad_watch_count',
      oldFieldName: '广告观看次数',
      oldFieldType: 'number',
      newFieldId: typeMismatch ? 'order_date' : 'ad_watch_count_v2',
      newFieldName: typeMismatch ? '订单日期' : '广告观看次数',
      newFieldType: typeMismatch ? 'date' : 'number',
      status: typeMismatch ? 'type_mismatch' : 'matched',
    },
    {
      oldFieldId: 'event_date',
      oldFieldName: '事件日期',
      oldFieldType: 'date',
      newFieldId: typeMismatch ? 'buyer_name' : 'event_date',
      newFieldName: typeMismatch ? '买家姓名' : '事件日期',
      newFieldType: typeMismatch ? 'text' : 'date',
      status: typeMismatch ? 'type_mismatch' : 'matched',
    },
  ]
}

const replaceDataset = (): void => {
  const chartComponents = getDashboardChartComponents()

  if (!chartComponents.length) {
    actionNotice.value = '当前仪表盘没有可替换数据集的图表。'
    return
  }

  const sourceDatasetIds = Array.from(new Set(chartComponents.map((component) => String(component.props.datasetId ?? 'ds_ad_watch_detail'))))
  if (sourceDatasetIds.length > 1) {
    datasetReplaceError.value = `批量替换仅支持单一源数据集，当前包含 ${sourceDatasetIds.join('、')}。`
  } else {
    datasetReplaceError.value = ''
  }

  datasetReplaceDraft.value = {
    sourceDatasetId: sourceDatasetIds[0] ?? 'ds_ad_watch_detail',
    targetDatasetId: 'ds_ad_watch_detail_v2',
    chartIds: chartComponents.map((component) => component.id),
    mappingMode: 'source_field',
    fieldMappings: buildDatasetReplaceMappings('ds_ad_watch_detail_v2'),
    parameterMappings: [{ oldParameter: 'low_coin', newParameter: 'low_coin', status: 'matched' }],
    hierarchyRemapRequired: true,
    categoryRemapRequired: true,
  }
  datasetReplaceModalVisible.value = true
}

const updateDatasetReplaceTarget = (targetDatasetId: string): void => {
  datasetReplaceDraft.value = {
    ...datasetReplaceDraft.value,
    targetDatasetId,
    fieldMappings: buildDatasetReplaceMappings(targetDatasetId),
  }
  datasetReplaceError.value = ''
}

const updateDatasetFieldMapping = (oldFieldId: string, patch: Partial<DatasetReplaceFieldMapping>): void => {
  datasetReplaceDraft.value = {
    ...datasetReplaceDraft.value,
    fieldMappings: datasetReplaceDraft.value.fieldMappings.map((mapping) => {
      if (mapping.oldFieldId !== oldFieldId) {
        return mapping
      }

      const nextMapping = { ...mapping, ...patch }
      nextMapping.status = nextMapping.newFieldType === nextMapping.oldFieldType ? 'matched' : 'type_mismatch'
      return nextMapping
    }),
  }
}

const validateDatasetReplace = (): boolean => {
  const draft = datasetReplaceDraft.value

  if (datasetReplaceError.value) {
    return false
  }

  if (!draft.targetDatasetId) {
    datasetReplaceError.value = '必须选择一个目标数据集。'
    return false
  }

  const invalidMapping = draft.fieldMappings.find((mapping) => mapping.status !== 'matched' || !mapping.newFieldId)
  if (invalidMapping) {
    datasetReplaceError.value = invalidMapping.status === 'type_mismatch'
      ? `字段「${invalidMapping.oldFieldName}」类型不匹配：源字段类型为 ${invalidMapping.oldFieldType}，目标字段类型为 ${invalidMapping.newFieldType}。请选择相同类型字段。`
      : `字段「${invalidMapping.oldFieldName}」需要手动完成映射。`
    return false
  }

  const invalidParameter = draft.parameterMappings.find((mapping) => mapping.status !== 'matched')
  if (invalidParameter) {
    datasetReplaceError.value = `参数「${invalidParameter.oldParameter}」未完成映射，替换后可能查询失败。`
    return false
  }

  return true
}

const submitDatasetReplace = (): void => {
  if (!validateDatasetReplace()) {
    return
  }

  const draft = datasetReplaceDraft.value
  const chartIds = new Set(draft.chartIds)
  pushUndo()
  pages.value = pages.value.map((page) => ({
    ...page,
    components: page.components.map((component) => {
      if (!chartIds.has(component.id)) {
        return component
      }

      return {
        ...component,
        props: {
          ...component.props,
          datasetId: draft.targetDatasetId,
          datasetReplaceTask: clone(draft),
          mapping: draft.fieldMappings.map((mapping) => `${mapping.oldFieldName} -> ${mapping.newFieldName}`).join('，'),
        },
        updatedAt: new Date().toISOString(),
      }
    }),
  }))
  datasetReplaceModalVisible.value = false
  markDirty()
  actionNotice.value = '数据集批量替换完成；布局、图表样式保持不变，公共筛选器、联动、跳转和钻取字段已重新校验。'
}

const simulateDatasetFieldLoadFailure = (): void => {
  datasetReplaceError.value = '目标数据集字段信息获取失败，请刷新后重试；若仍失败，请检查数据集权限或数据集状态。'
  datasetReplaceDraft.value = {
    ...datasetReplaceDraft.value,
    fieldMappings: datasetReplaceDraft.value.fieldMappings.map((mapping) => ({ ...mapping, status: 'manual_required' })),
  }
}

const fixDatasetMappings = (): void => {
  datasetReplaceDraft.value = {
    ...datasetReplaceDraft.value,
    targetDatasetId: datasetReplaceDraft.value.targetDatasetId === 'ds_finance_order' ? 'ds_ad_watch_detail_v2' : datasetReplaceDraft.value.targetDatasetId,
    fieldMappings: buildDatasetReplaceMappings('ds_ad_watch_detail_v2'),
  }
  datasetReplaceError.value = ''
}

const openShare = async (): Promise<void> => {
  if (!dashboard.value) {
    return
  }

  await Promise.all([loadSpaces(), loadShareMeta()])
  shareLink.value = ''
  shareDraft.value = {
    assetId: dashboard.value.id,
    assetType: 'dashboard',
    visibility: dashboard.value.visibility,
    targetSpaceId: dashboard.value.spaceId,
    allowCopy: true,
    permissionRole: 'viewer',
    notifyEnabled: true,
    addMemberIds: [],
    addTeamIds: [],
    removeMemberIds: [],
    removeTeamIds: [],
  }
  quickGrantPrincipalId.value = ''
  quickGrantRole.value = 'viewer'
  shareSearchKeyword.value = ''
  shareValidationError.value = ''
  selfAdminRevoked.value = false
  buildShareGrantRows()
  shareModalVisible.value = true
}

const submitShare = async (): Promise<void> => {
  if (!dashboard.value) {
    return
  }

  const overGrantRow = shareGrantRows.value.find((row) => !canGrantPermissionRole(row.role))
  const adminRows = shareGrantRows.value.filter((row) => row.role === 'admin')
  if (overGrantRow) {
    shareValidationError.value = `「${overGrantRow.principalName}」权限高于当前用户可授予范围。`
    return
  }

  if (!adminRows.length && !isProjectAdmin.value) {
    shareValidationError.value = '至少需要保留一个管理员，除非项目管理员操作。'
    return
  }

  const nextMemberIds = shareGrantRows.value
    .filter((row) => row.principalType === 'member' && !row.isSelf)
    .map((row) => row.principalId)
  const nextTeamIds = shareGrantRows.value
    .filter((row) => row.principalType === 'team')
    .map((row) => row.principalId)
  shareDraft.value.addMemberIds = Array.from(new Set(nextMemberIds))
  shareDraft.value.addTeamIds = Array.from(new Set(nextTeamIds))
  shareDraft.value.permissionRole = quickGrantRole.value

  const roleById = new Map(shareGrantRows.value.map((row) => [row.id, row.role]))
  const result = await analysisCenterService.shareAsset(shareDraft.value)
  if (shareDraft.value.targetSpaceId && shareDraft.value.targetSpaceId !== dashboard.value.spaceId) {
    dashboard.value = await analysisCenterService.moveDashboardToSpace(dashboard.value.id, shareDraft.value.targetSpaceId)
  } else {
    dashboard.value.visibility = shareDraft.value.visibility as DashboardAsset['visibility']
  }
  shareLink.value = result.shareLink
  sharedMembers.value = result.sharedMembers
  sharedTeams.value = result.sharedTeams
  buildShareGrantRows()
  shareGrantRows.value = shareGrantRows.value.map((row) => ({
    ...row,
    role: roleById.get(row.id) ?? row.role,
  }))
  shareDraft.value.addMemberIds = []
  shareDraft.value.addTeamIds = []
  shareDraft.value.removeMemberIds = []
  shareDraft.value.removeTeamIds = []
  shareValidationError.value = ''
  actionNotice.value = `${result.message}${shareDraft.value.notifyEnabled ? ' 已发送飞书通知。' : ''}`
}

const updateAnnouncement = async (): Promise<void> => {
  if (!dashboard.value) {
    return
  }

  await syncDashboardPatch({ announcementConfig: dashboard.value.announcementConfig })
  announcementModalVisible.value = false
  actionNotice.value = '公告配置已保存，阅览态顶部将展示公告。'
}

const updateLanguage = async (): Promise<void> => {
  if (!dashboard.value) {
    return
  }

  await syncDashboardPatch({ multiLangConfig: dashboard.value.multiLangConfig })
  languageModalVisible.value = false
  actionNotice.value = '多语言配置已保存，默认语言名称同步更新。'
}

const sortedTableRows = (component: DashboardComponent): DashboardWidgetTableRow[] => {
  const rows = [...(component.widget?.tableRows ?? [])]

  if (tableSortMode.value === 'value_desc') {
    return rows.sort((rowA, rowB) => Number(rowB.value.replace(/[,%]/g, '')) - Number(rowA.value.replace(/[,%]/g, '')))
  }

  if (tableSortMode.value === 'change_desc') {
    return rows.sort((rowA, rowB) => Number(rowB.change.replace('%', '')) - Number(rowA.change.replace('%', '')))
  }

  return rows
}

watch(activePageId, () => {
  clearSelection()
})

watch(
  [pages, settings, dashboardNameDraft],
  () => {
    persistEditorCache()
  },
  { deep: true },
)

onMounted(() => {
  void loadDashboard()
  void loadSpaces()
  void loadShareMeta()
  window.addEventListener('keydown', handleEscapeFullscreen)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleEscapeFullscreen)
  stopEditHeartbeat()
  if (dashboard.value && editMode.value) {
    void analysisCenterService.releaseDashboardEditLock(dashboard.value.id)
  }
})
</script>

<template>
  <div class="page-container dashboard-detail-page" :class="{ 'is-fullscreen': isFullscreen }">
    <n-spin :show="loading">
      <template v-if="dashboard">
        <div v-if="dashboard.status === 'deleted'" class="deleted-state">
          <strong>资源已删除或已回收</strong>
          <span>该仪表盘已进入回收站，普通阅览链接不再展示内容。</span>
          <n-button @click="router.push('/analysis-center/dashboards')">返回目录</n-button>
        </div>

        <template v-else-if="dashboard.type === 'web' && !editMode">
          <div class="viewer-shell">
            <div class="viewer-header web-header">
              <div>
                <h1 class="page-title">{{ dashboard.name }}</h1>
                <p class="page-description">{{ dashboard.description }}</p>
                <n-space>
                  <n-tag size="small">网页仪表盘</n-tag>
                  <n-tag size="small" type="info">{{ dashboard.webConfig?.urlType === 'cloud_doc' ? '云文档' : dashboard.webConfig?.urlType === 'dashboard_embed' ? '仪表盘嵌出' : '外部网页' }}</n-tag>
                  <n-tag size="small" :type="dashboard.webConfig?.allowInteraction ? 'success' : 'warning'">{{ dashboard.webConfig?.allowInteraction ? '允许交互' : '只读' }}</n-tag>
                </n-space>
              </div>
              <n-space>
                <n-button size="small" @click="router.push('/analysis-center/dashboards')">返回列表</n-button>
                <n-button size="small" @click="webSourceRecovered = !webSourceRecovered">模拟源仪表盘回收</n-button>
                <n-button size="small" @click="openShare">授权</n-button>
                <n-button size="small" :disabled="true">禁止普通编辑器</n-button>
              </n-space>
            </div>

            <div v-if="webSourceRecovered && dashboard.webConfig?.urlType === 'dashboard_embed'" class="deleted-state">
              <strong>仪表盘已回收</strong>
              <span>源仪表盘被删除后，网页仪表盘展示回收状态，且不允许编辑嵌入内容。</span>
            </div>
            <div v-else-if="!webUrlValid" class="deleted-state">
              <strong>配置错误</strong>
              <span>网页地址为空或非法，请返回列表页在基础信息中重新配置 URL。</span>
            </div>
            <div v-else class="web-viewer">
              <div class="web-viewer-toolbar">
                <span>{{ dashboard.webConfig?.url }}</span>
                <n-space :size="6">
                  <n-tag v-if="webFrameLoading" size="small" type="info">加载中</n-tag>
                  <n-tag v-if="webFrameError" size="small" type="error">目标网页不允许嵌入或加载失败</n-tag>
                  <n-tag size="small" type="warning">不允许再次嵌出</n-tag>
                  <n-button size="tiny" @click="reloadWebFrame">重新加载</n-button>
                </n-space>
              </div>
              <div class="web-frame-wrap">
                <div v-if="webFrameLoading" class="web-frame-state">网页内容加载中</div>
                <div v-if="webFrameError" class="web-frame-state error">目标网页不允许嵌入</div>
                <iframe
                  :key="`${dashboard.webConfig?.url}-${webFrameReloadKey}`"
                  :src="dashboard.webConfig?.url"
                  title="网页仪表盘"
                  @load="handleWebFrameLoad"
                  @error="handleWebFrameError"
                />
              </div>
            </div>
          </div>
        </template>

        <template v-else>
          <div v-if="editMode" class="editor-shell">
            <header class="editor-topbar">
              <div class="topbar-title">
                <n-button size="small" @click="router.push('/analysis-center/dashboards')">返回</n-button>
                <n-input
                  :value="dashboardNameDraft"
                  size="small"
                  class="title-input"
                  :status="nameValidationError ? 'error' : undefined"
                  @update:value="updateDashboardName"
                  @blur="commitDashboardName"
                  @keydown.enter="commitDashboardName"
                />
                <n-tag size="small" :type="dirty ? 'warning' : 'success'">{{ dirty ? '有未保存修改' : '已保存' }}</n-tag>
                <n-tag size="small">{{ dashboard.publishMode === 'versioned' ? '版本发布' : '实时发布' }}</n-tag>
                <n-tag v-if="editorLock" size="small" type="info">编辑锁</n-tag>
              </div>
              <div class="editor-toolbar">
                <div class="toolbar-group">
                  <n-button size="small" :disabled="!undoStack.length" @click="undo">撤销</n-button>
                  <n-button size="small" :disabled="!redoStack.length" @click="redo">重做</n-button>
                </div>
                <div class="toolbar-group">
                  <n-dropdown trigger="click" :options="layerActionOptions" @select="(key) => changeLayer(String(key) as 'top' | 'bottom' | 'up' | 'down')">
                    <n-button size="small" :disabled="!selectedComponents.length">图层顺序</n-button>
                  </n-dropdown>
                  <n-button size="small" :disabled="!canGroupSelection" @click="groupSelectedComponents">组合</n-button>
                  <n-button size="small" :disabled="!canUngroupSelection" @click="ungroupSelectedComponents">取消组合</n-button>
                  <n-dropdown trigger="click" :options="alignActionOptions" @select="(key) => alignSelectedComponents(String(key))">
                    <n-button size="small" :disabled="selectedComponents.length < 2">对齐方式</n-button>
                  </n-dropdown>
                </div>
                <div class="toolbar-group">
                  <n-button size="small" @click="setZoom(zoom - 25)">缩小</n-button>
                  <n-select :value="zoom" size="small" class="zoom-select" :options="zoomOptions" @update:value="(value) => setZoom(Number(value))" />
                  <n-button size="small" @click="setZoom(zoom + 25)">放大</n-button>
                  <n-button size="small" @click="fitCanvasToView">适应视窗</n-button>
                  <n-button size="small" @click="setZoom(100)">实际大小</n-button>
                </div>
                <div class="toolbar-group">
                  <n-button size="small" @click="replaceDataset">替换数据集</n-button>
                  <n-button size="small" @click="activatePageConfig">页面配置</n-button>
                  <n-button size="small" @click="mobileLayoutPreview = !mobileLayoutPreview">移动端布局</n-button>
                  <n-button size="small" @click="openPreview">预览</n-button>
                  <n-button size="small" @click="versionModalVisible = true">历史版本</n-button>
                  <n-button size="small" type="primary" @click="saveDraft">保存</n-button>
                  <n-button v-if="dashboard.publishMode === 'versioned'" size="small" type="primary" secondary @click="publishModalVisible = true">保存并发布</n-button>
                  <n-button size="small" @click="exitEditMode">退出编辑</n-button>
                </div>
              </div>
            </header>

            <n-alert v-if="nameValidationError" type="error" :show-icon="false" class="notice-alert">
              {{ nameValidationError }}
            </n-alert>
            <n-alert v-if="lockNotice" type="info" :show-icon="false" class="notice-alert">
              {{ lockNotice }}
            </n-alert>
            <n-alert v-if="editorNotice || actionNotice" type="success" :show-icon="false" class="notice-alert">
              {{ editorNotice || actionNotice }}
            </n-alert>
            <n-alert v-if="dashboard.publishMode === 'versioned'" type="info" :show-icon="false" class="notice-alert">
              {{ consistencySourceLabel }}
            </n-alert>
            <n-alert v-if="draftIntegrityIssues.length" type="warning" :show-icon="false" class="notice-alert">
              草稿存在 {{ draftIntegrityIssues.length }} 个异常引用，发布前必须处理：{{ draftIntegrityIssues.join('；') }}
            </n-alert>

            <aside class="editor-left">
              <div class="panel-heading">
                <h3>控件库</h3>
                <n-button size="tiny" @click="helpModalVisible = true">帮助</n-button>
              </div>
              <div class="control-grid">
                <button
                  v-for="control in componentPalette"
                  :key="control.type"
                  class="control-card"
                  @click="addComponent(control.type)"
                >
                  <strong>{{ control.label }}</strong>
                  <small>{{ componentPaletteHelp[control.type] }}</small>
                </button>
              </div>
              <div class="panel-heading">
                <h3>图层列表</h3>
                <n-button size="tiny" :disabled="!selectedComponents.length" @click="copySelectedComponentsToClipboard('copy')">复制</n-button>
              </div>
              <button
                v-for="component in activePage?.components ?? []"
                :key="component.id"
                class="layer-row"
                :class="{ active: selectedComponentIds.includes(component.id) || selectedComponentId === component.id }"
                @click="(event) => selectComponent(component, event)"
              >
                <span>{{ component.name }}</span>
                <small>{{ component.visible ? '可见' : '隐藏' }} · {{ component.groupId ? '组 · ' : '' }}z{{ component.zIndex }}</small>
              </button>
              <n-alert type="info" :show-icon="false">
                图层列表支持定位控件、隐藏检查和图层顺序核查；多选后可复制或剪切到其他页面。
              </n-alert>
            </aside>

            <main class="editor-canvas-wrap" :class="{ mobile: mobileLayoutPreview }">
              <div class="canvas-toolbar">
                <n-space>
                  <n-select :value="settings?.layoutMode" :options="layoutModeOptions" size="small" class="layout-select" @update:value="setLayoutMode" />
                  <n-tag size="small">{{ settings?.layoutMode === 'tile' ? '磁贴布局自动防重叠' : '自由布局允许重叠' }}</n-tag>
                  <n-tag size="small">缩放 {{ zoom }}%</n-tag>
                </n-space>
              </div>
              <div
                class="dashboard-canvas"
                :class="settings?.layoutMode"
                :style="canvasBackgroundStyle"
                @mousedown.self="startCanvasSelection"
                @mousemove.self="updateCanvasSelection"
                @mouseup.self="finishCanvasSelection"
                @mouseleave="finishCanvasSelection"
                @dragover.prevent
                @dragover="updateDragGuide"
                @drop="dropComponent"
              >
                <div v-if="selectionBox" class="selection-box" :style="{ left: `${selectionBox.x}px`, top: `${selectionBox.y}px`, width: `${selectionBox.width}px`, height: `${selectionBox.height}px` }"></div>
                <div v-if="dragGuide?.centerX" class="alignment-guide vertical"></div>
                <div v-if="dragGuide?.centerY" class="alignment-guide horizontal"></div>
                <div
                  v-for="component in activePage?.components ?? []"
                  :key="component.id"
                  draggable="true"
                  class="canvas-component"
                  :class="{ selected: selectedComponentIds.includes(component.id) || selectedComponentId === component.id, hidden: !component.visible, grouped: Boolean(component.groupId), floating: component.layout.floating }"
                  :style="getComponentStyle(component)"
                  @click.stop="(event) => selectComponent(component, event)"
                  @dragstart="startDrag(component)"
                >
                  <div class="component-title">
                    <strong>{{ component.name }}</strong>
                    <n-space :size="6" class="component-status-row">
                      <n-tag v-if="component.groupId" size="small" type="info">组合</n-tag>
                      <n-tag v-if="component.layout.floating" size="small" type="warning">悬浮</n-tag>
                      <n-tag size="small">{{ componentTypeLabels[component.type] }}</n-tag>
                    </n-space>
                  </div>
                  <div class="component-body">
                    <div v-if="component.type === 'chart' && !component.widget" class="empty-chart-card">
                      <strong>空图表</strong>
                      <span>从右侧选择已有图表，或新建一个图表绑定到当前控件。</span>
                      <n-space>
                        <n-button size="tiny" type="primary" @click.stop="selectComponent(component)">选择已有图表</n-button>
                        <n-button size="tiny" @click.stop="selectComponent(component); createChartForComponent()">新建图表</n-button>
                      </n-space>
                    </div>
                    <v-chart v-else-if="component.type === 'chart'" class="component-chart" :option="buildChartOption(component)" autoresize />
                    <n-data-table v-else-if="component.type === 'stitched_table'" size="small" :pagination="false" :columns="tableColumns" :data="sortedTableRows(component)" />
                    <div v-else-if="component.type === 'web'" class="web-component-preview">
                      <div class="web-component-toolbar">
                        <span>{{ getComponentWebConfig(component).url }}</span>
                        <n-space :size="6">
                          <n-tag size="small" type="info">{{ webUrlTypeOptions.find((item) => item.value === getComponentWebConfig(component).urlType)?.label }}</n-tag>
                          <n-tag v-if="getComponentWebConfig(component).carryToken" size="small" type="success">安全 URL</n-tag>
                          <n-tag v-if="getComponentWebConfig(component).overridePinnedFilters" size="small" type="warning">覆盖筛选器</n-tag>
                        </n-space>
                      </div>
                      <div v-if="getComponentWebConfig(component).errorMessage" class="web-component-state error">
                        {{ getComponentWebConfig(component).errorMessage }}
                      </div>
                      <div v-else-if="getComponentWebConfig(component).urlType === 'dashboard_embed'" class="web-component-state">
                        嵌入仪表盘不允许进入编辑状态，避免手势冲突。
                      </div>
                      <iframe
                        v-if="getComponentWebConfig(component).safeUrl"
                        :src="getComponentWebConfig(component).safeUrl"
                        :sandbox="getComponentWebConfig(component).iframeSandbox.join(' ')"
                        title="网页控件"
                        @load="handleComponentWebLoad(component)"
                        @error="handleComponentWebError(component)"
                      />
                    </div>
                    <div v-else-if="component.type === 'text'" class="text-component" :style="component.props.textStyle as Record<string, string | number>">{{ component.props.text }}</div>
                    <img v-else-if="component.type === 'image' || component.type === 'header_image' || component.type === 'title_image'" class="image-component" :src="String(component.props.imageUrl ?? '')" alt="" />
                    <div v-else-if="component.type === 'global_filter'" class="filter-component-preview">
                      <n-tag v-if="(component.props.globalFilter as GlobalFilterProps | undefined)?.pinned" size="small" type="warning">置顶</n-tag>
                      <span v-for="filter in ((component.props.globalFilter as GlobalFilterProps | undefined)?.filters ?? [])" :key="filter.id">{{ filter.displayName }}</span>
                      <n-button v-if="(component.props.globalFilter as GlobalFilterProps | undefined)?.showQueryButton" size="tiny">查询</n-button>
                    </div>
                    <div v-else-if="component.type === 'dynamic_field'" class="pill-list"><span>维度：城市</span><span>指标：广告观看次数</span><n-tag v-if="component.props.pinned" size="small" type="warning">置顶</n-tag></div>
                    <div v-else-if="component.type === 'global_parameter'" class="pill-list"><span>参数：低金币用户</span><span>全局同步</span><n-tag v-if="component.props.pinned" size="small" type="warning">置顶</n-tag></div>
                    <div v-else-if="component.type === 'query_container'" class="query-container-preview">
                      <n-tag v-if="(component.props.queryContainer as QueryContainerProps | undefined)?.pinned" size="small" type="warning">置顶</n-tag>
                      <span v-for="controlType in ((component.props.queryContainer as QueryContainerProps | undefined)?.childControlTypes ?? [])" :key="controlType">{{ componentTypeLabels[controlType] }}</span>
                      <n-button v-if="(component.props.queryContainer as QueryContainerProps | undefined)?.showQueryButton" size="tiny">查询</n-button>
                    </div>
                    <div v-else-if="component.type === 'tabs'" class="tab-component-preview">
                      <n-button v-for="tab in (component.props.tabs as Array<{ id: string, name: string }> | undefined) ?? []" :key="tab.id" size="tiny">{{ tab.name }}</n-button>
                    </div>
                    <div v-else-if="component.type === 'relation_graph'" class="relation-graph"><span>数据集</span><span>图表</span><span>订阅</span></div>
                    <div v-else-if="component.type === 'analysis_tree'" class="analysis-tree"><span>指标异常</span><span>渠道拆解</span><span>人群定位</span></div>
                    <div v-else-if="component.type === 'divider'" class="divider-component" :style="getDividerInlineStyle(component)"></div>
                    <div v-else-if="component.type === 'tooltip'" class="tooltip-preview"><strong>?</strong><span>{{ (component.props.tooltip as Record<string, unknown> | undefined)?.content ?? '指标口径说明' }}</span></div>
                    <div v-else-if="component.type === 'plugin'" class="plugin-preview"><span>插件</span><strong>{{ (component.props.plugin as Record<string, unknown> | undefined)?.pluginId || '未安装插件' }}</strong></div>
                    <div v-else-if="component.type === 'top_container'" class="top-container-preview" :style="{ maxHeight: `${Number((component.props.topContainer as TopContainerProps | undefined)?.height ?? 120)}px` }">
                      <strong>置顶容器</strong>
                      <span>高度 {{ Number((component.props.topContainer as TopContainerProps | undefined)?.height ?? 120) }}px</span>
                      <n-tag v-for="child in getTopContainerChildren(component)" :key="child.id" size="small">{{ child.name }}</n-tag>
                      <span v-if="!getTopContainerChildren(component).length">可从右侧将已有控件放入容器</span>
                    </div>
                    <div v-else class="generic-component">{{ componentTypeLabels[component.type] }}</div>
                  </div>
                  <div v-if="component.type === 'chart'" class="component-actions">
                    <n-button size="tiny" @click.stop="openSourceAnalysis(component)">编辑图表</n-button>
                    <n-button size="tiny" @click.stop="openDrillConfig(component)">下钻设置</n-button>
                    <n-button size="tiny" @click.stop="openLinkageConfig(component)">联动设置</n-button>
                    <n-button size="tiny" @click.stop="openJumpConfig(component)">跳转设置</n-button>
                    <n-button size="tiny" @click.stop="openInteractionConfig(component)">交互事件</n-button>
                    <n-button size="tiny" @click.stop="openAttributionConfig">归因配置</n-button>
                    <n-button size="tiny" @click.stop="duplicateSelectedComponent">复制实例</n-button>
                    <n-button size="tiny" type="error" secondary @click.stop="deleteSelectedComponent">删除实例</n-button>
                  </div>
                </div>
                <n-empty v-if="!(activePage?.components.length)" description="从左侧添加控件" />
              </div>
            </main>

            <aside class="editor-right">
              <template v-if="isBatchConfigMode">
                <h3>批量配置</h3>
                <n-alert type="info" :show-icon="false">已选中 {{ selectedComponents.length }} 个组件，可统一调整可见性、悬浮和外观。</n-alert>
                <section class="config-section">
                  <label>位置与尺寸</label>
                  <div class="step-grid">
                    <n-button size="small" @click="moveSelectedComponent(-1, 0)">左移</n-button>
                    <n-button size="small" @click="moveSelectedComponent(1, 0)">右移</n-button>
                    <n-button size="small" @click="moveSelectedComponent(0, -1)">上移</n-button>
                    <n-button size="small" @click="moveSelectedComponent(0, 1)">下移</n-button>
                  </div>
                </section>
                <section class="config-section">
                  <n-checkbox :checked="selectedComponents.every((component) => component.visible)" @update:checked="(value) => updateBatchVisible(Boolean(value))">阅览态可见</n-checkbox>
                  <n-checkbox :checked="selectedComponents.every((component) => component.layout.floating)" @update:checked="(value) => updateBatchFloating(Boolean(value))">设置为悬浮</n-checkbox>
                  <div class="inline-config-grid">
                    <label>填充色</label>
                    <n-input :value="String(selectedAppearance.fillColor ?? '#ffffff')" size="small" @update:value="(value) => updateBatchAppearance({ fillColor: value })" />
                    <label>边框色</label>
                    <n-input :value="String(selectedAppearance.borderColor ?? '#e5e7eb')" size="small" @update:value="(value) => updateBatchAppearance({ borderColor: value })" />
                    <label>圆角</label>
                    <n-input-number :value="Number(selectedAppearance.borderRadius ?? 8)" size="small" :min="0" @update:value="(value) => updateBatchAppearance({ borderRadius: value ?? 0 })" />
                  </div>
                </section>
                <n-space vertical>
                  <n-button size="small" @click="groupSelectedComponents">组合</n-button>
                  <n-button size="small" @click="ungroupSelectedComponents">取消组合</n-button>
                  <n-button size="small" @click="copySelectedComponentsToClipboard('copy')">复制到剪贴板</n-button>
                  <n-button size="small" @click="copySelectedComponentsToClipboard('cut')">剪切到剪贴板</n-button>
                </n-space>
              </template>
              <template v-else-if="selectedComponent">
                <h3>组件配置</h3>
                <section class="config-section">
                  <label>名称</label>
                  <n-input :value="selectedComponent.name" size="small" @update:value="updateSelectedComponentName" />
                  <n-tag size="small">{{ componentTypeLabels[selectedComponent.type] }}</n-tag>
                </section>
                <section v-if="selectedComponent.type === 'chart' && !selectedComponent.widget" class="config-section">
                  <label>选择已有图表</label>
                  <n-input v-model:value="recentChartSearch" size="small" placeholder="搜索图表名称" />
                  <div class="recent-chart-list">
                    <button v-for="chart in recentChartOptions" :key="chart.id" class="recent-chart-row" @click="selectRecentChart(chart.id)">
                      <strong>{{ chart.title }}</strong>
                      <small>{{ chart.description }}</small>
                    </button>
                    <n-empty v-if="!recentChartOptions.length" description="没有匹配图表" />
                  </div>
                  <n-button size="small" type="primary" @click="createChartForComponent">新建图表</n-button>
                </section>
                <section class="config-section">
                  <label>位置与尺寸</label>
                  <div class="inline-config-grid">
                    <label>X</label>
                    <n-input-number :value="selectedComponent.layout.x" size="small" :min="0" @update:value="(value) => updateSelectedLayout({ x: Number(value ?? 0) })" />
                    <label>Y</label>
                    <n-input-number :value="selectedComponent.layout.y" size="small" :min="0" @update:value="(value) => updateSelectedLayout({ y: Number(value ?? 0) })" />
                    <label>宽</label>
                    <n-input-number :value="selectedComponent.layout.width" size="small" :min="selectedComponent.layout.minWidth ?? 1" @update:value="(value) => updateSelectedLayout({ width: Number(value ?? 1) })" />
                    <label>高</label>
                    <n-input-number :value="selectedComponent.layout.height" size="small" :min="selectedComponent.layout.minHeight ?? 1" @update:value="(value) => updateSelectedLayout({ height: Number(value ?? 1) })" />
                  </div>
                  <div class="step-grid">
                    <n-button size="small" @click="moveSelectedComponent(-1, 0)">左移</n-button>
                    <n-button size="small" @click="moveSelectedComponent(1, 0)">右移</n-button>
                    <n-button size="small" @click="moveSelectedComponent(0, -1)">上移</n-button>
                    <n-button size="small" @click="moveSelectedComponent(0, 1)">下移</n-button>
                    <n-button size="small" @click="resizeSelectedComponent(1, 0)">加宽</n-button>
                    <n-button size="small" @click="resizeSelectedComponent(-1, 0)">减宽</n-button>
                    <n-button size="small" @click="resizeSelectedComponent(0, 1)">增高</n-button>
                    <n-button size="small" @click="resizeSelectedComponent(0, -1)">减高</n-button>
                  </div>
                </section>
                <section class="config-section">
                  <n-checkbox :checked="selectedComponent.visible" @update:checked="(value) => toggleSelectedVisible(Boolean(value))">阅览态可见</n-checkbox>
                  <n-checkbox :checked="Boolean(selectedComponent.locked)" @update:checked="(value) => toggleSelectedLocked(Boolean(value))">锁定组件</n-checkbox>
                  <n-checkbox :checked="selectedComponent.layout.floating" @update:checked="(value) => toggleSelectedFloating(Boolean(value))">设置为悬浮</n-checkbox>
                  <n-checkbox v-if="hasDashboardTheme" :checked="Boolean(selectedProps.followDashboardTheme)" @update:checked="(value) => updateSelectedComponentProps({ followDashboardTheme: Boolean(value) })">元素样式跟随仪表盘主题</n-checkbox>
                  <n-checkbox :checked="Boolean(selectedProps.loadingAnimation)" @update:checked="(value) => updateSelectedComponentProps({ loadingAnimation: Boolean(value) })">加载动画</n-checkbox>
                  <n-checkbox :checked="Boolean(selectedProps.updateAnimation)" @update:checked="(value) => updateSelectedComponentProps({ updateAnimation: Boolean(value) })">更新动画</n-checkbox>
                  <n-button v-if="topContainerComponent && selectedComponent.type !== 'top_container'" size="small" @click="addSelectedToTopContainer">放入置顶容器</n-button>
                </section>
                <section class="config-section">
                  <label>锚点</label>
                  <n-checkbox :checked="Boolean(selectedAnchor.enabled)" @update:checked="(value) => updateSelectedAnchor({ enabled: Boolean(value) })">加入页面锚点</n-checkbox>
                  <n-input :value="String(selectedAnchor.name ?? '')" size="small" placeholder="锚点名称" @update:value="(value) => updateSelectedAnchor({ name: value })" />
                  <n-input-number :value="Number(selectedAnchor.order ?? 1)" size="small" :min="1" @update:value="(value) => updateSelectedAnchor({ order: value ?? 1 })" />
                </section>
                <section v-if="selectedComponent.type === 'chart' || selectedComponent.widget" class="config-section">
                  <label>图表标题</label>
                  <n-select :value="String(selectedChartTitle.mode)" :options="chartTitleModeOptions" size="small" @update:value="(value) => updateSelectedChartTitle({ mode: value })" />
                  <n-input :value="String(selectedChartTitle.customText ?? '')" size="small" placeholder="自定义标题" @update:value="(value) => updateSelectedChartTitle({ customText: value })" />
                  <div class="inline-config-grid">
                    <label>字号</label>
                    <n-input-number :value="Number(selectedChartTitle.fontSize ?? 16)" size="small" :min="10" @update:value="(value) => updateSelectedChartTitle({ fontSize: value ?? 16 })" />
                    <label>颜色</label>
                    <n-input :value="String(selectedChartTitle.color ?? '#111827')" size="small" @update:value="(value) => updateSelectedChartTitle({ color: value })" />
                  </div>
                  <label>描述信息</label>
                  <n-select :value="selectedProps.descriptionMode as string[]" :options="descriptionModeOptions" size="small" multiple @update:value="(value) => updateSelectedComponentProps({ descriptionMode: value })" />
                  <label>工具图标</label>
                  <n-select :value="selectedProps.visibleToolbarIcons as string[]" :options="toolbarIconOptions" size="small" multiple @update:value="(value) => updateSelectedComponentProps({ visibleToolbarIcons: value })" />
                  <label>提示图标</label>
                  <n-select :value="selectedProps.visibleTooltipIcons as string[]" :options="tooltipIconOptions" size="small" multiple @update:value="(value) => updateSelectedComponentProps({ visibleTooltipIcons: value })" />
                  <n-alert type="info" :show-icon="false">字段映射：{{ selectedComponent.props.mapping ?? '同数据集字段自动映射' }}</n-alert>
                  <div class="config-action-grid">
                    <n-button size="small" @click="openDrillConfig(selectedComponent)">下钻设置</n-button>
                    <n-button size="small" @click="openLinkageConfig(selectedComponent)">联动设置</n-button>
                    <n-button size="small" @click="openJumpConfig(selectedComponent)">跳转设置</n-button>
                    <n-button size="small" @click="openInteractionConfig(selectedComponent)">交互事件</n-button>
                    <n-button size="small" @click="openAttributionConfig">归因配置</n-button>
                  </div>
                  <n-alert type="info" :show-icon="false">
                    下钻字段、联动映射、跳转规则、交互事件仅作用于当前仪表盘实例；保存后阅览态生效。
                  </n-alert>
                </section>
                <section v-if="selectedComponent.type === 'top_container'" class="config-section">
                  <label>置顶容器</label>
                  <n-input-number :value="selectedTopContainer.height" size="small" :min="72" :step="12" @update:value="(value) => updateSelectedTopContainer({ height: Number(value ?? 120) })" />
                  <n-alert type="info" :show-icon="false">宽度跟随画布，内容超出高度后纵向滚动；同页面仅允许一个置顶容器类能力。</n-alert>
                  <div v-for="child in getTopContainerChildren(selectedComponent)" :key="child.id" class="top-child-row">
                    <span>{{ child.name }}</span>
                    <n-button size="tiny" @click="removeComponentFromTopContainer(child.id)">移出</n-button>
                  </div>
                </section>
                <section v-if="selectedComponent.type === 'global_filter'" class="config-section">
                  <label>全局筛选器</label>
                  <n-checkbox :checked="selectedGlobalFilter.pinned" @update:checked="(value) => setSelectedPinned(Boolean(value))">置顶筛选器</n-checkbox>
                  <n-checkbox :checked="selectedGlobalFilter.showQueryButton" @update:checked="(value) => updateSelectedGlobalFilter({ showQueryButton: Boolean(value) })">显示查询按钮</n-checkbox>
                  <n-select :value="selectedGlobalFilter.layoutStyle" :options="filterLayoutStyleOptions" size="small" @update:value="(value) => updateSelectedGlobalFilter({ layoutStyle: String(value) })" />
                  <n-select :value="selectedGlobalFilter.linkedChartIds" :options="componentOptions" size="small" multiple placeholder="关联图表" @update:value="(value) => updateSelectedGlobalFilter({ linkedChartIds: value as string[] })" />
                  <n-select :value="selectedGlobalFilter.relation" :options="filterRelationOptions" size="small" @update:value="(value) => updateSelectedGlobalFilter({ relation: value as 'AND' | 'OR' })" />
                  <div v-for="filter in selectedGlobalFilter.filters" :key="filter.id" class="filter-config-card">
                    <n-select :value="filter.type" :options="filterTypeOptions" size="small" @update:value="(value) => updateGlobalFilterItem(filter.id, { type: value as FilterItemDraft['type'] })" />
                    <n-input :value="filter.displayName" size="small" placeholder="显示名称" @update:value="(value) => updateGlobalFilterItem(filter.id, { displayName: value })" />
                    <n-select :value="filter.operator" :options="filterOperatorOptions" size="small" @update:value="(value) => updateGlobalFilterItem(filter.id, { operator: String(value) })" />
                    <n-input :value="filter.defaultValue" size="small" placeholder="默认值" @update:value="(value) => updateGlobalFilterItem(filter.id, { defaultValue: value, value })" />
                    <n-checkbox :checked="filter.multiple" @update:checked="(value) => updateGlobalFilterItem(filter.id, { multiple: Boolean(value) })">多选</n-checkbox>
                    <n-checkbox :checked="filter.visible" @update:checked="(value) => updateGlobalFilterItem(filter.id, { visible: Boolean(value) })">控件可见</n-checkbox>
                    <n-alert v-if="filter.type === 'tree'" type="info" :show-icon="false">树状筛选将按多层级字段生成 AND/OR 条件，并支持父级联动清空子级。</n-alert>
                    <n-alert v-if="filter.type === 'composite'" type="info" :show-icon="false">组合筛选器至少包含一个条件，字段间关系由上方 AND/OR 控制。</n-alert>
                    <n-alert v-if="filter.type === 'deadline'" type="info" :show-icon="false">截止日期仅覆盖 OKR 类图表的截止日期参数。</n-alert>
                    <n-button size="tiny" @click="addChildFilterItem(filter.id)">添加子筛选器</n-button>
                    <div v-for="childFilter in filter.childFilters ?? []" :key="childFilter.id" class="child-filter-row">
                      {{ childFilter.displayName }} · {{ childFilter.operator }} · {{ childFilter.defaultValue }}
                    </div>
                  </div>
                  <n-space>
                    <n-button size="small" @click="addGlobalFilterItem('normal')">新增普通</n-button>
                    <n-button size="small" @click="addGlobalFilterItem('tree')">新增树状</n-button>
                    <n-button size="small" @click="addGlobalFilterItem('composite')">新增组合</n-button>
                    <n-button size="small" @click="addGlobalFilterItem('deadline')">新增截止日期</n-button>
                  </n-space>
                  <n-alert type="info" :show-icon="false">字段绑定已校验为文本类型；跨数据集时按字段映射生成各图表查询条件。</n-alert>
                </section>
                <section v-if="selectedComponent.type === 'dynamic_field'" class="config-section">
                  <label>维度/指标</label>
                  <n-checkbox :checked="Boolean(selectedProps.pinned)" @update:checked="(value) => setSelectedPinned(Boolean(value))">置顶动态维度指标</n-checkbox>
                  <n-select :value="(selectedProps.dynamicFieldConfig as Record<string, unknown> | undefined)?.linkedChartIds as string[]" :options="componentOptions" size="small" multiple placeholder="关联图表" @update:value="(value) => updateSelectedComponentProps({ dynamicFieldConfig: { ...((selectedProps.dynamicFieldConfig as Record<string, unknown> | undefined) ?? {}), linkedChartIds: value } })" />
                  <n-input :value="String((selectedProps.dynamicFieldConfig as Record<string, unknown> | undefined)?.defaultField ?? 'city')" size="small" placeholder="默认维度或指标" @update:value="(value) => updateSelectedComponentProps({ dynamicFieldConfig: { ...((selectedProps.dynamicFieldConfig as Record<string, unknown> | undefined) ?? {}), defaultField: value } })" />
                  <n-input :value="String((selectedProps.dynamicFieldConfig as Record<string, unknown> | undefined)?.crossDatasetMapping ?? '')" size="small" placeholder="跨数据集字段映射" @update:value="(value) => updateSelectedComponentProps({ dynamicFieldConfig: { ...((selectedProps.dynamicFieldConfig as Record<string, unknown> | undefined) ?? {}), crossDatasetMapping: value } })" />
                  <n-alert type="info" :show-icon="false">不同数据集字段业务含义一致时，可配置字段关联后同步切换。</n-alert>
                </section>
                <section v-if="selectedComponent.type === 'global_parameter'" class="config-section">
                  <label>全局参数</label>
                  <n-checkbox :checked="Boolean(selectedProps.pinned)" @update:checked="(value) => setSelectedPinned(Boolean(value))">置顶参数</n-checkbox>
                  <n-select :value="(selectedProps.globalParameterConfig as Record<string, unknown> | undefined)?.linkedChartIds as string[]" :options="componentOptions" size="small" multiple placeholder="绑定相同参数的图表" @update:value="(value) => updateSelectedComponentProps({ globalParameterConfig: { ...((selectedProps.globalParameterConfig as Record<string, unknown> | undefined) ?? {}), linkedChartIds: value } })" />
                  <n-alert type="info" :show-icon="false">多个图表关联的参数必须是同一个参数，值变化后统一重新查询。</n-alert>
                </section>
                <section v-if="selectedComponent.type === 'query_container'" class="config-section">
                  <label>查询容器</label>
                  <n-checkbox :checked="selectedQueryContainer.pinned" @update:checked="(value) => setSelectedPinned(Boolean(value))">置顶查询容器</n-checkbox>
                  <n-checkbox :checked="selectedQueryContainer.showQueryButton" @update:checked="(value) => updateSelectedQueryContainer({ showQueryButton: Boolean(value) })">显示统一查询按钮</n-checkbox>
                  <div class="query-child-list">
                    <n-tag v-for="controlType in selectedQueryContainer.childControlTypes" :key="controlType" size="small">{{ componentTypeLabels[controlType] }}</n-tag>
                  </div>
                  <n-space>
                    <n-button size="small" @click="addControlToQueryContainer('global_filter')">添加筛选器</n-button>
                    <n-button size="small" @click="addControlToQueryContainer('dynamic_field')">添加维度/指标</n-button>
                    <n-button size="small" @click="addControlToQueryContainer('global_parameter')">添加参数</n-button>
                  </n-space>
                  <n-alert type="info" :show-icon="false">容器内多个条件会在点击查询后统一提交。</n-alert>
                </section>
                <section v-if="selectedComponent.type === 'text'" class="config-section">
                  <label>文本内容</label>
                  <n-input :value="String(selectedProps.text ?? '')" type="textarea" size="small" @update:value="(value) => updateSelectedComponentProps({ text: value })" />
                  <div class="inline-config-grid">
                    <label>字号</label>
                    <n-input-number :value="Number((selectedProps.textStyle as Record<string, unknown> | undefined)?.fontSize ?? 14)" size="small" :min="10" @update:value="(value) => updateSelectedComponentProps({ textStyle: { ...((selectedProps.textStyle as Record<string, unknown> | undefined) ?? {}), fontSize: value ?? 14 } })" />
                    <label>颜色</label>
                    <n-input :value="String((selectedProps.textStyle as Record<string, unknown> | undefined)?.color ?? '#374151')" size="small" @update:value="(value) => updateSelectedComponentProps({ textStyle: { ...((selectedProps.textStyle as Record<string, unknown> | undefined) ?? {}), color: value } })" />
                  </div>
                </section>
                <section v-if="selectedComponent.type === 'web'" class="config-section">
                  <label>网页地址</label>
                  <n-input :value="selectedWebConfig.url" size="small" placeholder="https://example.com" @update:value="(value) => updateSelectedWebConfig({ url: value })" />
                  <label>URL 类型</label>
                  <n-select :value="selectedWebConfig.urlType" :options="webUrlTypeOptions" size="small" @update:value="(value) => updateSelectedWebConfig({ urlType: value as WebComponentProps['urlType'] })" />
                  <n-checkbox :checked="selectedWebConfig.carryToken" @update:checked="(value) => updateSelectedWebConfig({ carryToken: Boolean(value) })">携带登录态 Token</n-checkbox>
                  <n-checkbox :checked="selectedWebConfig.overridePinnedFilters" @update:checked="(value) => updateSelectedWebConfig({ overridePinnedFilters: Boolean(value) })">覆盖置顶筛选器到 URL 参数</n-checkbox>
                  <n-checkbox :checked="selectedWebConfig.allowInteraction" @update:checked="(value) => updateSelectedWebConfig({ allowInteraction: Boolean(value) })">允许 iframe 内交互</n-checkbox>
                  <n-checkbox
                    :checked="selectedWebConfig.allowEditEmbeddedContent"
                    :disabled="selectedWebConfig.urlType === 'dashboard_embed'"
                    @update:checked="(value) => updateSelectedWebConfig({ allowEditEmbeddedContent: Boolean(value) })"
                  >
                    允许进入嵌入内容编辑
                  </n-checkbox>
                  <n-checkbox :checked="Boolean(selectedProps.showToolbarIcon)" @update:checked="(value) => updateSelectedComponentProps({ showToolbarIcon: Boolean(value) })">显示工具条入口</n-checkbox>
                  <n-input :value="selectedWebSafeUrl" size="small" readonly placeholder="安全访问 URL 将自动生成" />
                  <n-alert v-if="selectedWebErrorMessage" type="error" :show-icon="false">{{ selectedWebErrorMessage }}</n-alert>
                  <n-alert v-else type="info" :show-icon="false">
                    当前 iframe sandbox：{{ selectedWebConfig.iframeSandbox.join(' / ') }}；筛选值变化后会重新生成 URL 并触发 iframe 重新加载。
                  </n-alert>
                  <n-button size="small" @click="updateSelectedWebConfig({ loadStatus: 'loading' })">重新加载 iframe</n-button>
                </section>
                <section v-if="['image', 'header_image', 'title_image'].includes(selectedComponent.type)" class="config-section">
                  <label>图片来源</label>
                  <n-select :value="String(selectedProps.sourceType ?? 'official')" :options="imageSourceOptions" size="small" @update:value="(value) => updateSelectedComponentProps({ sourceType: value })" />
                  <n-input :value="String(selectedProps.imageUrl ?? '')" size="small" placeholder="图片 URL" @update:value="(value) => updateSelectedComponentProps({ imageUrl: value })" />
                  <n-space>
                    <n-button size="small" @click="simulateImageUpload(true)">模拟上传成功</n-button>
                    <n-button size="small" @click="simulateImageUpload(false)">模拟上传失败</n-button>
                  </n-space>
                </section>
                <section v-if="selectedComponent.type === 'divider'" class="config-section">
                  <label>分割线</label>
                  <n-select :value="String((selectedProps.divider as Record<string, unknown> | undefined)?.lineType ?? 'solid')" :options="dividerLineOptions" size="small" @update:value="(value) => updateSelectedDivider({ lineType: value })" />
                  <div class="inline-config-grid">
                    <label>粗细</label>
                    <n-input-number :value="Number((selectedProps.divider as Record<string, unknown> | undefined)?.thickness ?? 2)" size="small" :min="1" @update:value="(value) => updateSelectedDivider({ thickness: value ?? 1 })" />
                    <label>颜色</label>
                    <n-input :value="String((selectedProps.divider as Record<string, unknown> | undefined)?.color ?? '#94a3b8')" size="small" @update:value="(value) => updateSelectedDivider({ color: value })" />
                  </div>
                </section>
                <section v-if="selectedComponent.type === 'tabs'" class="config-section">
                  <label>标签页</label>
                  <div v-for="tab in selectedTabs" :key="tab.id" class="tab-config-row">
                    <n-input :value="tab.name" size="small" @update:value="(value) => renameSelectedTab(tab.id, value)" />
                    <n-button size="tiny" :disabled="selectedTabs.length <= 1" @click="deleteSelectedTab(tab.id)">删除</n-button>
                  </div>
                  <n-button size="small" @click="addTabToSelectedComponent">新增标签</n-button>
                </section>
                <section v-if="selectedComponent.type === 'relation_graph'" class="config-section">
                  <label>关系图</label>
                  <n-alert type="info" :show-icon="false">节点 {{ selectedRelationGraph.nodes.length }} 个，连线 {{ selectedRelationGraph.edges.length }} 条。</n-alert>
                  <n-button size="small" @click="addRelationNode">新增节点</n-button>
                </section>
                <section v-if="selectedComponent.type === 'stitched_table'" class="config-section">
                  <label>拼接表格</label>
                  <n-select :value="selectedStitchedTable.mode" :options="tableStitchModeOptions" size="small" @update:value="(value) => updateSelectedComponentProps({ stitchedTable: { ...selectedStitchedTable, mode: value } })" />
                  <n-alert type="info" :show-icon="false">已拼接 {{ selectedStitchedTable.tableItems.length }} 张表格。</n-alert>
                  <n-button size="small" @click="addStitchedTableItem">追加表格</n-button>
                </section>
                <section v-if="selectedComponent.type === 'tooltip'" class="config-section">
                  <label>提示框</label>
                  <n-input :value="String(selectedTooltip.content ?? '')" type="textarea" size="small" @update:value="(value) => updateSelectedTooltip({ content: value })" />
                  <div class="inline-config-grid">
                    <label>颜色</label>
                    <n-input :value="String(selectedTooltip.iconColor ?? '#2563eb')" size="small" @update:value="(value) => updateSelectedTooltip({ iconColor: value })" />
                    <label>大小</label>
                    <n-input-number :value="Number(selectedTooltip.iconSize ?? 16)" size="small" :min="12" @update:value="(value) => updateSelectedTooltip({ iconSize: value ?? 16 })" />
                  </div>
                </section>
                <section v-if="selectedComponent.type === 'analysis_tree'" class="config-section">
                  <label>分析树</label>
                  <n-input :value="String(selectedAnalysisTree.analysisTreeId ?? '')" size="small" @update:value="(value) => updateSelectedAnalysisTree({ analysisTreeId: value })" />
                  <n-select :value="String(selectedAnalysisTree.titleMode ?? 'global')" :options="chartTitleModeOptions" size="small" @update:value="(value) => updateSelectedAnalysisTree({ titleMode: value })" />
                  <n-checkbox :checked="Boolean((selectedAnalysisTree.visibleSections as Record<string, boolean>).conclusion)" @update:checked="(value) => updateSelectedAnalysisTreeSections({ conclusion: Boolean(value) })">展示结论</n-checkbox>
                  <n-checkbox :checked="Boolean((selectedAnalysisTree.visibleSections as Record<string, boolean>).nodeTree)" @update:checked="(value) => updateSelectedAnalysisTreeSections({ nodeTree: Boolean(value) })">展示节点树</n-checkbox>
                </section>
                <section v-if="selectedComponent.type === 'plugin'" class="config-section">
                  <label>插件</label>
                  <n-alert type="info" :show-icon="false">当前插件：{{ selectedPlugin.pluginId || '未安装' }}</n-alert>
                  <n-button size="small" @click="pluginMarketVisible = true">打开插件市场</n-button>
                  <n-checkbox :checked="Boolean(selectedPlugin.enabled)" @update:checked="(value) => updateSelectedPlugin({ enabled: Boolean(value) })">启用插件</n-checkbox>
                </section>
                <section class="config-section">
                  <label>外观</label>
                  <div class="inline-config-grid">
                    <label>填充色</label>
                    <n-input :value="String(selectedAppearance.fillColor ?? '#ffffff')" size="small" @update:value="(value) => updateSelectedAppearance({ fillColor: value })" />
                    <label>边框色</label>
                    <n-input :value="String(selectedAppearance.borderColor ?? '#e5e7eb')" size="small" @update:value="(value) => updateSelectedAppearance({ borderColor: value })" />
                    <label>边框</label>
                    <n-input-number :value="Number(selectedAppearance.borderWidth ?? 1)" size="small" :min="0" @update:value="(value) => updateSelectedAppearance({ borderWidth: value ?? 0 })" />
                    <label>圆角</label>
                    <n-input-number :value="Number(selectedAppearance.borderRadius ?? 8)" size="small" :min="0" @update:value="(value) => updateSelectedAppearance({ borderRadius: value ?? 0 })" />
                    <label>上边距</label>
                    <n-input-number :value="selectedPadding.top" size="small" :min="0" @update:value="(value) => updateSelectedPadding('top', value)" />
                    <label>右边距</label>
                    <n-input-number :value="selectedPadding.right" size="small" :min="0" @update:value="(value) => updateSelectedPadding('right', value)" />
                    <label>下边距</label>
                    <n-input-number :value="selectedPadding.bottom" size="small" :min="0" @update:value="(value) => updateSelectedPadding('bottom', value)" />
                    <label>左边距</label>
                    <n-input-number :value="selectedPadding.left" size="small" :min="0" @update:value="(value) => updateSelectedPadding('left', value)" />
                  </div>
                </section>
                <n-space vertical>
                  <n-button size="small" @click="copySelectedComponentsToClipboard('copy')">复制到剪贴板</n-button>
                  <n-button size="small" @click="copySelectedComponentsToClipboard('cut')">剪切到剪贴板</n-button>
                  <n-button size="small" @click="duplicateSelectedComponent">复制组件</n-button>
                  <n-popconfirm @positive-click="deleteSelectedComponent">
                    <template #trigger>
                      <n-button size="small" type="error" secondary>删除组件</n-button>
                    </template>
                    确认删除所选组件？
                  </n-popconfirm>
                </n-space>
              </template>
              <template v-else>
                <h3>页面配置</h3>
                <section class="config-section">
                  <label>主题</label>
                  <n-select :value="settings?.themeId" :options="themeOptions" size="small" @update:value="updateTheme" />
                  <n-space>
                    <n-button size="small" @click="customThemeModalVisible = true">新建自定义主题</n-button>
                    <n-button size="small" @click="resetTheme">重置主题</n-button>
                  </n-space>
                  <n-alert type="info" :show-icon="false">
                    当前主题：{{ currentTheme?.name ?? '未设置' }}；跟随主题的组件会同步控件样式和图表配色。
                  </n-alert>
                </section>
                <section class="config-section">
                  <label>画布背景</label>
                  <n-select :value="settings?.canvasBackground.color" :options="canvasColorOptions" size="small" @update:value="(value) => updateCanvasBackground(String(value))" />
                  <label>透明度</label>
                  <n-input-number :value="settings?.canvasBackground.opacity ?? 100" size="small" :min="0" :max="100" @update:value="updateCanvasOpacity" />
                  <label>背景图片</label>
                  <n-input :value="settings?.canvasBackground.imageUrl ?? ''" size="small" placeholder="图片 URL" @update:value="updateCanvasImage" />
                </section>
                <section class="config-section">
                  <label>画布尺寸</label>
                  <n-select :value="settings?.canvasSize.mode" :options="canvasSizeModeOptions" size="small" @update:value="(value) => updateCanvasSize({ mode: value as DashboardSettings['canvasSize']['mode'] })" />
                  <div class="inline-config-grid">
                    <label>宽度</label>
                    <n-input-number :value="settings?.canvasSize.width ?? 1440" size="small" :min="320" :disabled="settings?.canvasSize.mode !== 'custom'" @update:value="(value) => updateCanvasSize({ width: Number(value ?? 1440) })" />
                    <label>高度</label>
                    <n-input-number :value="settings?.canvasSize.height ?? 900" size="small" :min="320" :disabled="settings?.canvasSize.mode !== 'custom'" @update:value="(value) => updateCanvasSize({ height: Number(value ?? 900) })" />
                  </div>
                </section>
                <section class="config-section">
                  <label>查看态</label>
                  <n-select :value="settings?.viewMode.adaptiveWidthMode" :options="adaptiveModeOptions" size="small" @update:value="(value) => updateViewModeSettings({ adaptiveWidthMode: value as DashboardSettings['viewMode']['adaptiveWidthMode'] })" />
                  <n-checkbox :checked="Boolean(settings?.viewMode.anchorDefaultExpanded)" @update:checked="(value) => updateViewModeSettings({ anchorDefaultExpanded: Boolean(value) })">锚点默认展开</n-checkbox>
                  <n-checkbox :checked="Boolean(settings?.viewMode.toolbarGlobalControlEnabled)" @update:checked="(value) => updateViewModeSettings({ toolbarGlobalControlEnabled: Boolean(value) })">全局控制工具条</n-checkbox>
                  <n-checkbox :checked="Boolean(settings?.viewMode.tooltipIconGlobalControlEnabled)" @update:checked="(value) => updateViewModeSettings({ tooltipIconGlobalControlEnabled: Boolean(value) })">全局控制提示图标</n-checkbox>
                  <n-checkbox :checked="Boolean(settings?.viewMode.toolbarDefaultCollapsed)" @update:checked="(value) => updateViewModeSettings({ toolbarDefaultCollapsed: Boolean(value) })">工具条默认收起</n-checkbox>
                  <label>工具条动作</label>
                  <n-select :value="settings?.viewMode.visibleToolbarActions" :options="toolbarIconOptions" size="small" multiple @update:value="(value) => updateViewModeSettings({ visibleToolbarActions: value as string[] })" />
                  <label>提示图标</label>
                  <n-select :value="settings?.viewMode.visibleTooltipIcons" :options="tooltipIconOptions" size="small" multiple @update:value="(value) => updateViewModeSettings({ visibleTooltipIcons: value as string[] })" />
                </section>
                <section class="config-section">
                  <label>定时刷新</label>
                  <n-switch :value="Boolean(settings?.autoRefresh?.enabled)" @update:value="toggleAutoRefresh" />
                  <n-input-number :value="settings?.autoRefresh?.intervalSeconds ?? 300" size="small" :min="60" :step="30" @update:value="updateAutoRefreshInterval" />
                  <label>评论高级功能</label>
                  <n-switch :value="Boolean(settings?.commentAdvanced?.enabled)" @update:value="(value) => { if (settings?.commentAdvanced) { settings.commentAdvanced.enabled = value; markDirty() } }" />
                </section>
              </template>
            </aside>

            <footer class="editor-bottom">
              <div class="page-tabs">
                <div
                  v-for="page in pages"
                  :key="page.id"
                  class="page-tab"
                  :class="{ active: activePageId === page.id, hidden: !page.visibleInViewMode, dragging: draggedPageId === page.id }"
                  draggable="true"
                  @click="activatePage(page.id)"
                  @dblclick="startRenamePage(page)"
                  @dragstart="startPageDrag(page)"
                  @dragover.prevent
                  @drop="dropPage(page)"
                >
                  <n-input
                    v-if="editingPageId === page.id"
                    v-model:value="pageRenameDraft"
                    size="tiny"
                    class="page-tab-input"
                    @click.stop
                    @keyup.enter="updatePageName(pageRenameDraft, page)"
                    @keyup.esc="cancelRenamePage"
                    @blur="updatePageName(pageRenameDraft, page)"
                  />
                  <template v-else>
                    <span>{{ page.name }}</span>
                    <n-tag v-if="!page.visibleInViewMode" size="small" type="warning">隐藏</n-tag>
                  </template>
                  <n-dropdown trigger="click" :options="getPageActionOptions(page)" @select="(key) => handlePageAction(String(key), page)">
                    <n-button size="tiny" quaternary @click.stop>更多</n-button>
                  </n-dropdown>
                </div>
                <n-button size="small" @click="addPage">+ 页面</n-button>
              </div>
              <div class="bottom-actions">
                <n-alert v-if="pageNameError" type="error" :show-icon="false">{{ pageNameError }}</n-alert>
                <n-button size="small" :disabled="!componentClipboard" @click="pasteComponentsToCurrentPage">粘贴组件</n-button>
                <n-button size="small" :disabled="!selectedComponents.length" @click="copySelectedComponentsToClipboard('copy')">复制组件</n-button>
                <n-button size="small" :disabled="!selectedComponents.length" @click="copySelectedComponentsToClipboard('cut')">剪切组件</n-button>
              </div>
            </footer>
          </div>

          <div v-else class="viewer-shell" :class="{ fullscreen: isFullscreen }">
            <div class="viewer-header">
              <div class="viewer-title-block">
                <h1 class="page-title">{{ dashboard.name }}</h1>
                <p class="page-description">{{ dashboard.description }}</p>
                <n-space :size="8">
                  <n-tag size="small">{{ dashboard.spaceType === 'team' ? '团队空间' : dashboard.spaceType === 'public' ? '公共空间' : '个人空间' }}</n-tag>
                  <n-tag size="small">{{ dashboard.spaceName }}</n-tag>
                  <n-tag size="small" type="info">{{ pages.reduce((count, page) => count + page.components.length, 0) }} 个组件</n-tag>
                  <n-tag v-if="dashboard.publishMode === 'versioned'" size="small" type="warning">线上版本</n-tag>
                  <n-tag v-if="previewMode" size="small" type="info">预览态</n-tag>
                </n-space>
              </div>
              <div class="viewer-actions">
                <n-button size="small" @click="router.push('/analysis-center/dashboards')">返回列表</n-button>
                <n-button v-if="previewMode" size="small" @click="copyPreviewLink">复制预览链接</n-button>
                <n-button v-if="previewMode" size="small" type="primary" @click="returnToEditorFromPreview">返回编辑</n-button>
                <n-button size="small" :loading="refreshing" @click="refreshDashboard">刷新</n-button>
                <n-button size="small" @click="toggleFullscreen">{{ isFullscreen ? '退出全屏' : '全屏' }}</n-button>
                <n-button size="small" @click="openShare">授权</n-button>
                <n-button size="small" @click="createViewerShareLink">分享</n-button>
                <n-button v-if="!previewMode" size="small" type="primary" @click="enterEditMode">编辑仪表盘</n-button>
                <n-dropdown trigger="click" :options="viewerMoreActionOptions" @select="(key) => handleViewerMoreAction(String(key))">
                  <n-button size="small">更多操作</n-button>
                </n-dropdown>
              </div>
            </div>

            <n-alert v-if="dashboard.announcementConfig?.enabled" type="warning" :show-icon="false" class="notice-alert">
              {{ dashboard.announcementConfig.content }}
            </n-alert>
            <n-alert v-if="actionNotice" type="success" :show-icon="false" class="notice-alert">
              {{ actionNotice }}
            </n-alert>
            <n-alert v-if="viewerShareLink" type="info" :show-icon="false" class="notice-alert">
              <div class="share-link-alert">
                <span>当前分享链接保留筛选状态，但不会提升访问权限。</span>
                <n-input :value="viewerShareLink" size="small" readonly />
              </div>
            </n-alert>
            <n-alert v-if="dashboard.publishMode === 'versioned' && !previewMode" type="info" :show-icon="false" class="notice-alert">
              {{ consistencySourceLabel }}
            </n-alert>

            <div v-if="isFullscreen" class="fullscreen-size-toggle">
              <n-button size="tiny" :type="fullscreenSizeMode === 'adaptive' ? 'primary' : 'default'" @click="fullscreenSizeMode = 'adaptive'">自适应宽度</n-button>
              <n-button size="tiny" :type="fullscreenSizeMode === 'actual' ? 'primary' : 'default'" @click="fullscreenSizeMode = 'actual'">实际大小</n-button>
            </div>

            <div class="viewer-filter-bar">
              <div v-for="filter in globalFilters" :key="filter.id" class="filter-item">
                <span>{{ filter.label }}</span>
                <n-select :value="filterState[filter.id]" :options="filter.options" size="small" @update:value="(value) => updateGlobalFilter(filter.id, String(value))" />
              </div>
              <div class="filter-item">
                <span>树状筛选</span>
                <n-space>
                  <n-select v-model:value="treeFilter.region" size="small" :options="[{ label: '华东', value: '华东' }, { label: '华南', value: '华南' }]" />
                  <n-select v-model:value="treeFilter.province" size="small" :options="[{ label: '山东', value: '山东' }, { label: '浙江', value: '浙江' }]" />
                  <n-select v-model:value="treeFilter.city" size="small" :options="[{ label: '青岛', value: '青岛' }, { label: '杭州', value: '杭州' }]" />
                </n-space>
              </div>
              <div class="filter-item">
                <span>动态指标</span>
                <n-select v-model:value="dynamicField" size="small" :options="[{ label: '广告观看次数', value: '广告观看次数' }, { label: '次日留存率', value: '次日留存率' }]" />
              </div>
              <div class="filter-item">
                <span>全局参数</span>
                <n-select v-model:value="globalParameter" size="small" :options="[{ label: '低金币用户', value: 'low_coin' }, { label: '新用户', value: 'new_user' }]" />
              </div>
              <n-checkbox v-model:checked="queryButtonEnabled">显示查询按钮</n-checkbox>
              <n-button v-if="queryButtonEnabled" size="small" type="primary" :disabled="!pendingQuery" @click="runQuery">查询</n-button>
              <n-checkbox v-model:checked="viewerDownloadPermissionCheck">下载复制校验数据集权限</n-checkbox>
            </div>

            <div class="viewer-tabs">
              <n-button v-for="page in visiblePages" :key="page.id" size="small" :type="activePageId === page.id ? 'primary' : 'default'" @click="activePageId = page.id">
                {{ page.name }}
              </n-button>
            </div>

            <div class="drill-breadcrumb">
              <span>下钻：</span>
              <n-button v-for="(item, index) in drillBreadcrumbItems" :key="`${item.field}-${index}`" text type="primary" @click="drillUp(index)">
                {{ item.field }}{{ item.value ? `(${item.value})` : '' }}
              </n-button>
              <n-tag v-if="activeDrill" size="small" type="info">{{ activeDrill.source === 'dataset_hierarchy' ? '数据集层级' : '图表钻取设置' }}</n-tag>
              <n-button size="tiny" @click="drillDown()">聚焦下钻</n-button>
              <n-button size="tiny" @click="clearDrill">清除下钻</n-button>
            </div>

            <section v-if="topContainerComponent || pinnedControlComponents.length" class="viewer-top-container" :style="{ maxHeight: `${Number((topContainerComponent?.props.topContainer as TopContainerProps | undefined)?.height ?? 120)}px` }">
              <strong>{{ topContainerComponent ? '置顶容器' : '置顶筛选区' }}</strong>
              <div class="viewer-top-items">
                <n-tag v-for="child in topContainerComponent ? getTopContainerChildren(topContainerComponent) : pinnedControlComponents" :key="child.id" size="small" type="info">
                  {{ child.name }}
                </n-tag>
                <n-tag v-for="filter in globalFilters" :key="filter.id" size="small">
                  {{ filter.label }}：{{ filterState[filter.id] }}
                </n-tag>
                <n-tag size="small">维度/指标：{{ dynamicField }}</n-tag>
                <n-tag size="small">全局参数：{{ globalParameter }}</n-tag>
              </div>
            </section>

            <div class="viewer-content" :class="{ 'with-comments': commentPanelVisible }">
              <section class="viewer-canvas" :class="{ actual: isFullscreen && fullscreenSizeMode === 'actual' }" @click.self="activeLinkage = null">
                <article
                  v-for="component in viewerCanvasComponents"
                  :key="component.id"
                  class="viewer-component"
                  :class="{ hidden: !component.visible, linked: activeLinkage?.sourceId === component.id, 'linkage-target': hasLinkageImpact(component), drilling: activeDrill?.componentId === component.id }"
                  @click.self="activeLinkage = null"
                >
                  <div class="component-title">
                    <div>
                      <strong>{{ component.name }}</strong>
                      <small>{{ component.widget?.description ?? componentTypeLabels[component.type] }}</small>
                    </div>
                    <n-space :size="6" class="component-status-row">
                      <n-tag v-if="hasPublicFilterImpact(component)" size="small" type="info">公共筛选生效</n-tag>
                      <n-tag v-if="hasLinkageImpact(component)" size="small" type="warning">联动筛选</n-tag>
                      <n-tag v-if="activeDrill?.componentId === component.id" size="small" type="success">下钻中</n-tag>
                      <n-tag v-if="component.widget && getComponentDrillConfig(component).enabled" size="small" type="info">+ 可下钻</n-tag>
                      <n-tag v-if="getChartFilterOverride(component.id).internalActive" size="small" type="warning">图内筛选</n-tag>
                      <n-tag v-if="quickQueryApplied[component.id]" size="small" type="success">快捷查询生效</n-tag>
                      <n-tag v-if="getComponentCommentCount(component.id)" size="small" type="info">{{ getComponentCommentCount(component.id) }} 条评论</n-tag>
                      <n-tag v-if="component.widget" size="small" :type="getWidgetStatusType(component.widget.status)">{{ statusLabelMap[component.widget.status] }}</n-tag>
                      <n-dropdown trigger="click" :options="getComponentHeaderActionOptions(component)" @select="(key) => handleComponentAction(String(key), component)">
                        <n-button size="tiny" quaternary>更多</n-button>
                      </n-dropdown>
                    </n-space>
                  </div>

                  <v-chart v-if="component.type === 'chart'" class="viewer-chart" :option="buildChartOption(component)" autoresize @click="(params) => handleChartDataClick(component, params)" />
                  <n-data-table v-else-if="component.type === 'stitched_table'" size="small" :pagination="false" :columns="tableColumns" :data="sortedTableRows(component)" />
                  <div v-else-if="component.type === 'web'" class="web-component-preview viewer-web-component">
                    <div class="web-component-toolbar">
                      <span>{{ getComponentWebConfig(component).safeUrl || getComponentWebConfig(component).url }}</span>
                      <n-space :size="6">
                        <n-tag size="small" type="info">{{ webUrlTypeOptions.find((item) => item.value === getComponentWebConfig(component).urlType)?.label }}</n-tag>
                        <n-tag v-if="getComponentWebConfig(component).urlType === 'dashboard_embed'" size="small" type="warning">禁止编辑</n-tag>
                      </n-space>
                    </div>
                    <div v-if="getComponentWebConfig(component).errorMessage" class="web-component-state error">
                      {{ getComponentWebConfig(component).errorMessage }}
                    </div>
                    <iframe
                      v-if="getComponentWebConfig(component).safeUrl"
                      :src="getComponentWebConfig(component).safeUrl"
                      :sandbox="getComponentWebConfig(component).iframeSandbox.join(' ')"
                      title="网页控件"
                      @load="handleComponentWebLoad(component)"
                      @error="handleComponentWebError(component)"
                    />
                  </div>
                  <div v-else-if="component.type === 'text'" class="text-component">{{ component.props.text }}</div>
                  <div v-else-if="component.type === 'global_filter'" class="pill-list"><span>筛选已影响 {{ Object.keys(appliedFilterState).length }} 个条件</span><span>{{ component.props.mapping }}</span></div>
                  <div v-else-if="component.type === 'dynamic_field'" class="pill-list"><span>当前维度/指标：{{ dynamicField }}</span><span>{{ component.props.mapping }}</span></div>
                  <div v-else-if="component.type === 'global_parameter'" class="pill-list"><span>参数值：{{ globalParameter }}</span><span>绑定图表重新查询</span></div>
                  <div v-else-if="component.type === 'query_container'" class="query-container-preview"><span>容器条件已收纳</span><span>{{ (component.props.queryContainer as QueryContainerProps | undefined)?.childControlTypes.length ?? 0 }} 个控件</span></div>
                  <div v-else class="generic-component">{{ componentTypeLabels[component.type] }}</div>

                  <div class="component-actions">
                    <n-button size="tiny" @click="openQuickQuery(component)">快捷查询</n-button>
                    <n-button v-if="component.widget" size="tiny" @click="openSourceAnalysis(component)">编辑图表</n-button>
                    <n-button v-if="component.widget" size="tiny" @click="downloadComponentData(component)">下载数据</n-button>
                    <n-button v-if="component.widget" size="tiny" @click="openChartMonitor(component)">新建监控</n-button>
                    <n-dropdown trigger="click" :options="getComponentMoreActionOptions(component)" @select="(key) => handleComponentAction(String(key), component)">
                      <n-button size="tiny">更多分析</n-button>
                    </n-dropdown>
                  </div>
                </article>
                <n-empty v-if="!viewerCanvasComponents.length" description="当前页面暂无组件" />
              </section>

              <aside v-if="commentPanelVisible" class="comment-panel">
                <div class="comment-header">
                  <strong>评论</strong>
                  <n-button size="tiny" text @click="commentPanelVisible = false">关闭</n-button>
                </div>
                <n-input v-model:value="commentDraft" type="textarea" placeholder="输入评论，可 @ 同事" />
                <n-button size="small" type="primary" :disabled="!(activePage?.components[0])" @click="addComment(selectedComponentId || activePage?.components[0]?.id || '')">发送评论</n-button>
                <div v-for="comment in rootComments" :key="comment.id" class="comment-card">
                  <strong>{{ comment.createdBy }}</strong>
                  <p :class="{ deleted: Boolean(comment.deletedAt) }">{{ comment.deletedAt ? '该评论已删除' : comment.content }}</p>
                  <small>{{ formatTime(comment.createdAt) }} · {{ comment.locator?.type === 'table_cell' ? '表格单元格' : '图表' }} · {{ comment.locator?.columnKey ?? '当前状态' }}</small>
                  <template v-if="!comment.deletedAt">
                    <n-input v-model:value="replyDrafts[comment.id]" size="small" placeholder="回复" />
                    <n-space>
                      <n-button size="tiny" @click="replyComment(comment)">回复</n-button>
                      <n-button size="tiny" type="error" secondary @click="deleteComment(comment)">删除</n-button>
                    </n-space>
                  </template>
                  <div v-for="reply in activeComments.filter((item) => item.parentCommentId === comment.id)" :key="reply.id" class="reply-card">
                    {{ reply.createdBy }}：{{ reply.deletedAt ? '该评论已删除' : reply.content }}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </template>
      </template>
      <n-empty v-else description="未找到仪表盘。" />
    </n-spin>

    <n-modal v-model:show="cacheRestoreVisible" preset="card" title="恢复本地编辑缓存" class="small-modal">
      <n-space vertical>
        <n-alert type="warning" :show-icon="false">
          检测到上次未保存的本地编辑缓存，可恢复到画布继续编辑；恢复不会影响线上版本，只有点击保存后才会提交。
        </n-alert>
      </n-space>
      <template #action>
        <n-space justify="end">
          <n-button @click="discardCachedDraft">忽略缓存</n-button>
          <n-button type="primary" @click="restoreCachedDraft">恢复编辑</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="pluginMarketVisible" preset="card" title="插件市场" class="small-modal">
      <div class="plugin-market">
        <button class="plugin-card" @click="installPluginComponent('kpi_narrative')">
          <strong>KPI 解读插件</strong>
          <span>自动生成指标口径、异常解释和运营建议。</span>
        </button>
        <button class="plugin-card" @click="installPluginComponent('operation_action')">
          <strong>运营动作插件</strong>
          <span>联动人群、实验和触达动作。</span>
        </button>
      </div>
    </n-modal>

    <n-modal v-model:show="helpModalVisible" preset="card" title="控件帮助" class="medium-modal">
      <div class="help-grid">
        <div v-for="control in componentPalette" :key="control.type">
          <strong>{{ control.label }}</strong>
          <span>{{ componentPaletteHelp[control.type] }}</span>
        </div>
      </div>
    </n-modal>

    <n-modal v-model:show="customThemeModalVisible" preset="card" title="新建自定义主题" class="small-modal">
      <n-space vertical>
        <n-input v-model:value="customThemeDraft.name" maxlength="15" show-count placeholder="主题名称，最多 15 个字符" />
        <n-select v-model:value="customThemeDraft.scope" :options="themeScopeOptions" />
        <n-select v-model:value="customThemeDraft.layoutMode" :options="layoutModeOptions" />
        <n-input v-model:value="customThemeDraft.canvasColor" placeholder="画布背景色，例如 #f7f9fc" />
        <n-input v-model:value="customThemeDraft.componentFillColor" placeholder="组件背景色，例如 #ffffff" />
        <n-input v-model:value="customThemeDraft.chartColor" placeholder="主图表色，例如 #2563eb" />
        <n-checkbox v-model:checked="customThemeDraft.adaptiveComponentColors">控件颜色自适应</n-checkbox>
        <n-alert v-if="customThemeError" type="error" :show-icon="false">{{ customThemeError }}</n-alert>
        <n-alert type="info" :show-icon="false">项目主题按项目权限使用；个人主题仅自己可见；系统主题仅系统管理员可创建。</n-alert>
      </n-space>
      <template #action>
        <n-space justify="end">
          <n-button @click="customThemeModalVisible = false">取消</n-button>
          <n-button type="primary" @click="createCustomTheme">创建并应用</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="pageDeleteConfirmVisible" preset="card" title="删除页面" class="small-modal">
      <n-alert type="warning" :show-icon="false">
        确认删除页面「{{ targetPageForAction?.name }}」？删除后会切换到相邻页面，仪表盘至少保留一个页面。
      </n-alert>
      <template #action>
        <n-space justify="end">
          <n-button @click="pageDeleteConfirmVisible = false">取消</n-button>
          <n-button type="error" @click="deletePage()">删除</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="crossDashboardPageModalVisible" preset="card" title="复制到其他仪表盘" class="small-modal">
      <n-space vertical>
        <n-select v-model:value="crossDashboardPageDraft.targetDashboardId" :options="dashboardTargetOptions" />
        <n-input v-model:value="crossDashboardPageDraft.name" placeholder="新页面名称" />
        <n-checkbox v-model:checked="crossDashboardPageDraft.copyChartResources">同时复制图表资源</n-checkbox>
        <n-alert type="info" :show-icon="false">复制会保留页面布局、组件配置和可见状态。</n-alert>
      </n-space>
      <template #action>
        <n-space justify="end">
          <n-button @click="crossDashboardPageModalVisible = false">取消</n-button>
          <n-button type="primary" @click="submitCrossDashboardPageCopy">复制</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="datasetReplaceModalVisible" preset="card" title="替换数据集" class="medium-modal">
      <n-space vertical>
        <n-alert type="info" :show-icon="false">
          仪表盘编辑页仅支持批量替换当前仪表盘内图表数据集；布局、图表样式和页面结构会保持不变。
        </n-alert>
        <n-alert v-if="datasetReplaceError" type="error" :show-icon="false">{{ datasetReplaceError }}</n-alert>
        <div class="dataset-summary-grid">
          <div>
            <span>源数据集</span>
            <strong>{{ datasetReplaceDraft.sourceDatasetId }}</strong>
          </div>
          <div>
            <span>影响图表</span>
            <strong>{{ datasetReplaceDraft.chartIds.length }} 个</strong>
          </div>
          <div>
            <span>匹配模式</span>
            <n-select v-model:value="datasetReplaceDraft.mappingMode" size="small" :options="datasetMappingModeOptions" />
          </div>
          <div>
            <span>目标数据集</span>
            <n-select
              :value="datasetReplaceDraft.targetDatasetId"
              size="small"
              :options="targetDatasetOptions"
              @update:value="(value) => updateDatasetReplaceTarget(String(value))"
            />
          </div>
        </div>
        <div class="dataset-mapping-list">
          <div class="dataset-mapping-head">
            <strong>字段映射</strong>
            <n-tag size="small" type="info">{{ datasetReplaceDraft.mappingMode === 'source_field' ? '表达式源字段替换' : '数据集字段整体替换' }}</n-tag>
          </div>
          <div v-for="mapping in datasetReplaceDraft.fieldMappings" :key="mapping.oldFieldId" class="dataset-mapping-row">
            <div>
              <strong>{{ mapping.oldFieldName }}</strong>
              <small>{{ mapping.oldFieldType }}</small>
            </div>
            <span>→</span>
            <n-input
              :value="mapping.newFieldName"
              size="small"
              placeholder="目标字段"
              @update:value="(value) => updateDatasetFieldMapping(mapping.oldFieldId, { newFieldName: value, newFieldId: value ? `${mapping.oldFieldId}_manual` : '' })"
            />
            <n-select
              :value="mapping.newFieldType"
              size="small"
              :options="datasetFieldTypeOptions"
              @update:value="(value) => updateDatasetFieldMapping(mapping.oldFieldId, { newFieldType: value as DatasetReplaceFieldMapping['newFieldType'] })"
            />
            <n-tag size="small" :type="mapping.status === 'matched' ? 'success' : mapping.status === 'type_mismatch' ? 'error' : 'warning'">
              {{ mapping.status === 'matched' ? '已匹配' : mapping.status === 'type_mismatch' ? '类型不匹配' : '需手动' }}
            </n-tag>
          </div>
        </div>
        <div class="dataset-param-list">
          <strong>参数、层级和类目校验</strong>
          <n-tag v-for="parameter in datasetReplaceDraft.parameterMappings" :key="parameter.oldParameter" size="small" :type="parameter.status === 'matched' ? 'success' : 'warning'">
            {{ parameter.oldParameter }} → {{ parameter.newParameter || '待选择' }}
          </n-tag>
          <n-alert type="warning" :show-icon="false">
            依赖层级结构和类目配置的图表已标记为需复核；公共筛选器、联动、跳转、钻取字段将在提交时重新校验。
          </n-alert>
        </div>
      </n-space>
      <template #action>
        <n-space justify="end">
          <n-button @click="simulateDatasetFieldLoadFailure">模拟字段获取失败</n-button>
          <n-button @click="fixDatasetMappings">自动修复映射</n-button>
          <n-button @click="datasetReplaceModalVisible = false">取消</n-button>
          <n-button type="primary" :disabled="Boolean(datasetReplaceError)" @click="submitDatasetReplace">提交替换</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="bookmarkModalVisible" preset="card" title="书签" class="small-modal">
      <n-space vertical>
        <n-input v-model:value="bookmarkDraft.name" placeholder="书签名称" />
        <n-select v-model:value="bookmarkDraft.scope" :options="[{ label: '个人书签', value: 'private' }, { label: '公共书签', value: 'public' }]" />
        <n-select :options="bookmarkOptions" placeholder="应用已有书签" @update:value="(value) => applyBookmark(String(value))" />
        <n-alert type="info" :show-icon="false">书签会保存筛选、树状筛选、动态指标、全局参数、下钻与表格状态。</n-alert>
      </n-space>
      <template #action>
        <n-space justify="end">
          <n-button @click="bookmarkModalVisible = false">关闭</n-button>
          <n-button type="primary" @click="createBookmark">保存书签</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="subscriptionModalVisible" preset="card" title="新建订阅" class="medium-modal">
      <n-space vertical>
        <n-alert type="info" :show-icon="false">订阅会按页面、书签或当前快捷书签状态生成截图、链接或 PDF，并在定时或数据同步完成后推送。</n-alert>
        <div class="subscription-grid">
          <n-input v-model:value="subscriptionDraft.title" placeholder="订阅标题" />
          <n-select v-model:value="subscriptionDraft.scope" :options="subscriptionScopeOptions" />
          <n-input v-model:value="subscriptionDraft.description" type="textarea" placeholder="订阅说明，可写文本、链接或 @ 接收人" />
          <n-select v-model:value="subscriptionDraft.language" :options="subscriptionLanguageOptions" placeholder="推送语言" />
        </div>
        <div class="subscription-grid">
          <n-select v-if="subscriptionDraft.scope === 'selected_pages'" v-model:value="subscriptionDraft.sheetIds" :options="pageOptions" multiple placeholder="选择 sheet" />
          <n-select v-if="subscriptionDraft.scope === 'bookmark'" v-model:value="subscriptionDraft.bookmarkId" :options="bookmarkOptions" placeholder="选择书签" />
          <n-alert v-if="subscriptionDraft.scope === 'quick_bookmark'" type="success" :show-icon="false">将保存当前筛选、动态维度和全局参数，仅用于本订阅。</n-alert>
          <n-checkbox v-model:checked="subscriptionDraft.appendDate">标题附加日期</n-checkbox>
        </div>
        <section class="subscription-panel">
          <strong>推送内容</strong>
          <div class="subscription-checks">
            <n-checkbox v-model:checked="subscriptionDraft.contentConfig.includeLink">访问链接</n-checkbox>
            <n-checkbox v-model:checked="subscriptionDraft.contentConfig.includePdf">PDF 下载链接</n-checkbox>
            <n-checkbox v-model:checked="subscriptionDraft.contentConfig.includeScreenshotTime">截图时间</n-checkbox>
            <n-checkbox v-model:checked="subscriptionDraft.contentConfig.includeManageLink">订阅管理链接</n-checkbox>
          </div>
          <n-select v-model:value="subscriptionDraft.contentConfig.screenshotMode" :options="subscriptionContentOptions" placeholder="截图类型" />
          <n-input v-model:value="subscriptionDraft.contentConfig.remark" type="textarea" placeholder="备注，展示在推送消息结尾" />
          <n-checkbox v-model:checked="subscriptionDraft.interpretationEnabled" :disabled="subscriptionDraft.pushChannel !== 'feishu'">订阅总结/解读</n-checkbox>
          <n-alert v-if="subscriptionDraft.pushChannel !== 'feishu'" type="warning" :show-icon="false">订阅总结/解读当前仅支持飞书推送。</n-alert>
        </section>
        <section class="subscription-panel">
          <strong>推送时间与接收</strong>
          <div class="subscription-grid">
            <n-select v-model:value="subscriptionDraft.triggerType" :options="[{ label: '定时推送', value: 'schedule' }, { label: '数据同步完成时触发', value: 'data_ready' }]" />
            <n-input v-model:value="subscriptionDraft.schedule" placeholder="每天 09:00 / 每周一 09:00 / 数据完成后 30 分钟" />
            <n-select v-model:value="subscriptionDraft.pushChannel" :options="subscriptionPushChannelOptions" />
            <n-select v-model:value="subscriptionDraft.receiverIds" :options="shareMemberOptions" multiple filterable placeholder="接收人" />
            <n-select v-if="subscriptionNeedsPermissionPrincipal" v-model:value="subscriptionDraft.permissionPrincipal" :options="shareMemberOptions" filterable placeholder="权限依据人" />
            <n-select v-if="subscriptionUsesWebhook" v-model:value="subscriptionDraft.webhookConfigId" :options="webhookConfigOptions" placeholder="Webhook 配置" />
          </div>
          <n-space v-if="subscriptionUsesWebhook">
            <n-button size="small" @click="webhookModalVisible = true">新建 Webhook</n-button>
            <n-tag size="small" :type="webhookConfigOptions.length ? 'success' : 'error'">{{ webhookConfigOptions.length ? '已配置 Webhook' : '暂无 Webhook 配置' }}</n-tag>
          </n-space>
          <n-alert v-if="subscriptionNeedsPermissionPrincipal" type="warning" :show-icon="false">群组订阅不会对群成员逐个鉴权，新增群成员可能查看历史订阅消息，必须指定权限依据人。</n-alert>
        </section>
        <n-alert v-if="subscriptionReadinessIssues.length" type="warning" :show-icon="false">
          存在 {{ subscriptionReadinessIssues.length }} 个图表为空或查询失败，截图/PDF 推送会暂停并进入 1 小时重试：{{ subscriptionReadinessIssues.join('；') }}
        </n-alert>
        <n-alert v-if="subscriptionValidationError" type="error" :show-icon="false">{{ subscriptionValidationError }}</n-alert>
        <n-input v-if="subscriptionTestPreview" :value="subscriptionTestPreview" type="textarea" readonly />
        <section class="subscription-panel">
          <div class="share-grant-head">
            <strong>订阅管理</strong>
            <span>{{ dashboard?.subscriptions?.length ?? 0 }} 条记录</span>
          </div>
          <div v-for="subscription in dashboard?.subscriptions ?? []" :key="subscription.id" class="management-row">
            <div>
              <strong>{{ subscription.title }}</strong>
              <span>{{ subscription.schedule }} · {{ subscription.lastStatus === 'success' ? '最近推送成功' : subscription.lastStatus === 'pending' ? '等待数据同步' : subscription.lastStatus === 'retry_scheduled' ? '已安排重试' : '推送失败' }}</span>
            </div>
            <n-tag size="small" :type="subscription.lastStatus === 'success' ? 'success' : subscription.lastStatus === 'failed' ? 'error' : 'warning'">{{ subscription.lastStatus }}</n-tag>
          </div>
        </section>
      </n-space>
      <template #action>
        <n-space justify="end">
          <n-button @click="subscriptionModalVisible = false">关闭</n-button>
          <n-button @click="sendSubscriptionTest">发送测试</n-button>
          <n-button type="primary" @click="saveSubscription">保存订阅</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="monitorModalVisible" preset="card" title="新建监控" class="medium-modal">
      <n-space vertical>
        <n-alert type="info" :show-icon="false">监控用于发现图表指标或维度异常；图表需已保存，日期筛选需为最近或最近有数。</n-alert>
        <div class="subscription-grid">
          <n-input v-model:value="monitorDraft.name" placeholder="监控名称" />
          <n-select v-model:value="monitorDraft.componentId" :options="componentOptions" placeholder="监控图表" />
          <n-input v-model:value="monitorDraft.dateField" placeholder="日期维度，例如 事件日期" />
          <n-select v-model:value="monitorDraft.timeRangeMode" :options="monitorTimeRangeOptions" />
          <n-input-number v-if="monitorDraft.timeRangeMode === 'latest_n'" v-model:value="monitorDraft.recentPointCount" :min="2" placeholder="最近 N 个时间点" />
          <n-select v-model:value="monitorDraft.triggerFactor" :options="monitorTriggerFactorOptions" />
        </div>
        <section class="subscription-panel">
          <strong>报警规则</strong>
          <div class="subscription-grid">
            <n-select v-model:value="monitorDraft.metricConditionMode" :options="[{ label: '任一条件', value: 'any_condition' }, { label: '全部条件', value: 'all_conditions' }, { label: '全部数据', value: 'all_data' }, { label: '任一数据', value: 'any_data' }]" />
            <n-select v-model:value="monitorDraft.ruleRelation" :options="[{ label: '满足任一规则报警', value: 'OR' }, { label: '满足全部规则报警', value: 'AND' }]" />
            <n-select v-model:value="monitorDraft.compareRange" :options="monitorCompareRangeOptions" />
            <n-select v-model:value="monitorDraft.compareMethod" :options="monitorCompareMethodOptions" />
            <n-select v-model:value="monitorDraft.compareValueType" :options="monitorValueTypeOptions" />
            <n-input v-model:value="monitorDraft.rule" placeholder="下降超过 10% / 新增维度项 / 智能异常" />
          </div>
          <div class="subscription-grid">
            <n-input v-model:value="monitorDraft.dimensionFilters" placeholder="维度筛选，例如 城市 = 青岛" />
            <n-select v-model:value="monitorDraft.dimensionLogic" :options="[{ label: '维度条件 AND', value: 'AND' }, { label: '维度条件 OR', value: 'OR' }]" />
          </div>
          <n-alert v-if="monitorDraft.triggerFactor === 'dimension_change'" type="info" :show-icon="false">维度值变化将监控枚举值新增或消失，支持隐藏维度和 1/7/30 天对比。</n-alert>
          <n-alert v-if="monitorDraft.triggerFactor === 'smart_detection'" type="warning" :show-icon="false">智能波动检测仅支持折线图，且至少需要 15 个时间点。</n-alert>
        </section>
        <section class="subscription-panel">
          <strong>监控时间与推送</strong>
          <div class="subscription-grid">
            <n-select v-model:value="monitorDraft.scheduleMode" :options="[{ label: '定时触发', value: 'schedule' }, { label: '数据完成同步时触发', value: 'data_ready' }]" />
            <n-input v-model:value="monitorDraft.schedule" placeholder="每 10/15/30 分钟，或每天 09:00" />
            <n-input v-model:value="monitorDraft.earliestTriggerTime" placeholder="最早触发时间，例如 09:00" />
            <n-select v-model:value="monitorDraft.timezone" :options="[{ label: 'UTC+08:00', value: 'UTC+08:00' }, { label: 'UTC+00:00', value: 'UTC+00:00' }, { label: 'Europe/Zurich', value: 'Europe/Zurich' }]" />
            <n-select v-model:value="monitorDraft.pushChannel" :options="monitorPushChannelOptions" />
            <n-select v-model:value="monitorDraft.receiver" :options="shareMemberOptions" filterable placeholder="接收人" />
            <n-input v-if="['feishu', 'wechat_work', 'webex', 'dingtalk'].includes(monitorDraft.pushChannel)" v-model:value="monitorDraft.groupIds" placeholder="IM 群号，多个用英文逗号分隔" />
            <n-select v-if="monitorDraft.pushChannel === 'webhook'" v-model:value="monitorDraft.webhookConfigId" :options="webhookConfigOptions" placeholder="Webhook 配置" />
          </div>
          <n-space v-if="monitorDraft.pushChannel === 'webhook'">
            <n-button size="small" @click="webhookModalVisible = true">新建 Webhook</n-button>
            <n-tag size="small" type="warning">Webhook 请求失败会记录失败日志</n-tag>
          </n-space>
        </section>
        <section class="subscription-panel">
          <strong>处理建议与报警结果</strong>
          <n-input v-model:value="monitorDraft.suggestionText" type="textarea" placeholder="处理建议，展示在报警消息中" />
          <n-input v-model:value="monitorDraft.suggestionUrl" placeholder="处理建议 URL" />
          <n-checkbox v-model:checked="monitorDraft.showConditionInAlert">警报中显示监控条件</n-checkbox>
        </section>
        <n-alert v-if="monitorValidationError" type="error" :show-icon="false">{{ monitorValidationError }}</n-alert>
        <n-input v-if="monitorTestPreview" :value="monitorTestPreview" type="textarea" readonly />
        <section class="subscription-panel">
          <div class="share-grant-head">
            <strong>监控列表</strong>
            <span>{{ dashboard?.monitors?.length ?? 0 }} 条记录</span>
          </div>
          <div v-for="monitor in dashboard?.monitors ?? []" :key="monitor.id" class="management-row">
            <div>
              <strong>{{ monitor.name }}</strong>
              <span>{{ monitor.schedule }} · {{ monitor.triggerFactor }} · {{ monitor.lastAlertStatus ?? 'idle' }}</span>
            </div>
            <n-tag size="small" :type="monitor.failureLog ? 'warning' : 'success'">{{ monitor.testSent ? '已测试' : '未测试' }}</n-tag>
          </div>
        </section>
        <n-alert type="info" :show-icon="false">测试不会推送到群；保存后可在监控列表按权限范围查看。</n-alert>
      </n-space>
      <template #action>
        <n-space justify="end">
          <n-button @click="monitorModalVisible = false">关闭</n-button>
          <n-button @click="sendMonitorTest">发送测试</n-button>
          <n-button type="primary" @click="saveMonitor">保存监控</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="embedModalVisible" preset="card" title="嵌出配置" class="medium-modal">
      <n-space vertical>
        <n-alert type="info" :show-icon="false">嵌出链接不代表公开访问，iframe 加载前仍需平台鉴权；版本发布模式下读取当前已发布版本。</n-alert>
        <n-select v-model:value="embedTargetComponentId" :options="embedTargetOptions" placeholder="嵌出对象" />
        <div class="embed-grid">
          <n-checkbox v-model:checked="embedDraft.showDashboardName">显示仪表盘名称</n-checkbox>
          <n-checkbox v-model:checked="embedDraft.showOwner">显示所有者</n-checkbox>
          <n-checkbox v-model:checked="embedDraft.showActions">显示操作按钮</n-checkbox>
          <n-checkbox v-model:checked="embedDraft.showChartName">显示图表名称</n-checkbox>
          <n-checkbox v-model:checked="embedDraft.showTooltipIcons">显示提示图标</n-checkbox>
          <n-checkbox v-model:checked="embedDraft.showToolbarIcons">显示工具条图标</n-checkbox>
          <n-checkbox v-model:checked="embedDraft.includeFilters">带当前筛选条件</n-checkbox>
          <n-checkbox v-model:checked="embedDraft.showFilterControls">显示筛选器控件</n-checkbox>
        </div>
        <n-select v-model:value="embedDraft.pageScope" :options="[{ label: '全部页面', value: 'all' }, { label: '当前 sheet', value: activePageId }]" />
        <n-alert type="warning" :show-icon="false">嵌出图表支持下载数据，但下载权限仍按访问用户的数据集权限校验。</n-alert>
        <n-input v-if="embedLink" :value="embedLink" readonly />
      </n-space>
      <template #action>
        <n-space justify="end">
          <n-button @click="createEmbedLink()">复制嵌出链接</n-button>
          <n-button @click="embedModalVisible = false">关闭</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="publishModalVisible" preset="card" title="保存并发布" class="small-modal">
      <n-space vertical>
        <n-input v-model:value="publishDescription" type="textarea" placeholder="版本描述，可为空" />
        <n-select
          v-if="(dashboard?.versions?.length ?? 0) >= 3 && versionDeleteOptions.length"
          v-model:value="publishVersionToDeleteId"
          :options="versionDeleteOptions"
          placeholder="历史版本已满，请选择删除一个历史版本"
        />
        <n-alert v-if="draftIntegrityIssues.length" type="error" :show-icon="false">
          发布前完整性检查未通过：{{ draftIntegrityIssues.join('；') }}
        </n-alert>
        <n-alert v-if="publishValidationError" type="error" :show-icon="false">{{ publishValidationError }}</n-alert>
        <n-alert type="info" :show-icon="false">最多保留 3 个历史版本；发布后阅览页、订阅、监控、下载和嵌出统一读取新发布版本。</n-alert>
      </n-space>
      <template #action>
        <n-space justify="end">
          <n-button @click="publishModalVisible = false">取消</n-button>
          <n-button type="primary" @click="submitPublish">发布</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="versionModalVisible" preset="card" title="历史版本" class="medium-modal">
      <n-space vertical>
        <n-alert type="info" :show-icon="false">预览链接展示指定版本，不影响线上版本；回滚会恢复为草稿，确认后需要再次保存并发布。</n-alert>
        <n-input v-if="versionPreviewLink" :value="versionPreviewLink" readonly />
        <div class="version-list">
          <div v-for="version in dashboard?.versions ?? []" :key="version.id" class="version-row">
            <div>
              <strong>V{{ version.versionNo }} · {{ version.status === 'published' ? '已发布' : '历史' }}</strong>
              <template v-if="editingVersionDescriptionId === version.id">
                <n-input v-model:value="versionDescriptionDraft" size="small" placeholder="版本描述" />
              </template>
              <span v-else>{{ version.description || '无描述' }} · {{ formatTime(version.createdAt) }}</span>
            </div>
            <n-space>
              <n-button v-if="editingVersionDescriptionId === version.id" size="small" type="primary" @click="saveVersionDescription(version)">保存描述</n-button>
              <n-button v-else size="small" @click="startEditVersionDescription(version)">改描述</n-button>
              <n-button size="small" @click="previewVersion(version)">预览</n-button>
              <n-button size="small" type="primary" @click="rollbackVersion(version)">回滚</n-button>
            </n-space>
          </div>
          <n-empty v-if="!(dashboard?.versions?.length)" description="暂无历史版本" />
        </div>
      </n-space>
    </n-modal>

    <n-modal v-model:show="attributionModalVisible" preset="card" title="智能归因" class="medium-modal">
      <n-space vertical>
        <n-alert type="info" :show-icon="false">
          从折线图异常点发起归因，系统会校验抽取数据集、日期粒度、连续数据点和对比点，再生成维度贡献报告。
        </n-alert>
        <div class="attribution-task-grid">
          <label>归因方式</label>
          <n-select :value="attributionTask.mode" :options="attributionModeOptions" @update:value="(value) => updateAttributionMode(value as AttributionTask['mode'])" />
          <label>日期粒度</label>
          <n-select :value="attributionTask.granularity" :options="attributionGranularityOptions" @update:value="(value) => updateAttributionGranularity(value as AttributionTask['granularity'])" />
          <label>当前点</label>
          <n-input v-model:value="attributionTask.currentPoint" placeholder="例如 2026-05-22" />
          <label>对比点</label>
          <n-input v-model:value="attributionTask.comparePoint" :disabled="attributionTask.mode === 'default'" placeholder="默认按粒度自动选择" />
        </div>
        <n-alert v-if="attributionValidationErrors.length" type="error" :show-icon="false">
          <div v-for="error in attributionValidationErrors" :key="error">{{ error }}</div>
        </n-alert>
        <div class="config-state-grid">
          <n-tag size="small" type="success">抽取数据集</n-tag>
          <n-tag size="small" type="success">日期 X 轴</n-tag>
          <n-tag size="small" type="info">{{ attributionConfigDraft.datasetId }}</n-tag>
          <n-tag size="small" :type="attributionTask.status === 'finished' ? 'success' : attributionTask.status === 'running' ? 'warning' : attributionTask.status === 'failed' ? 'error' : 'default'">
            {{ attributionTask.status === 'finished' ? '计算完成' : attributionTask.status === 'running' ? '计算中' : attributionTask.status === 'failed' ? '校验失败' : '待提交' }}
          </n-tag>
        </div>
        <template v-if="attributionTask.reportVisible">
          <div class="attribution-report">
            <div><span>波动状态</span><strong>异常下降</strong></div>
            <div><span>指标变化</span><strong>-12.4%</strong></div>
            <div><span>贡献 TOP1</span><strong>低金币用户 47%</strong></div>
          </div>
          <n-data-table
            size="small"
            :pagination="false"
            :columns="[{ title: '维度', key: 'dimension' }, { title: '基尼系数', key: 'gini' }, { title: 'TOP3 维度项', key: 'items' }, { title: '贡献说明', key: 'reason' }]"
            :data="[
              { dimension: '用户金币分层', gini: '0.74', items: '低金币 / 中低金币 / 新用户', reason: '低金币用户贡献 47% 的观看损失' },
              { dimension: '入口来源', gini: '0.62', items: '弹窗 / 任务页 / 首页', reason: '金币不足弹窗曝光下降明显' },
              { dimension: '广告位', gini: '0.51', items: '激励视频 / 任务弹窗 / 结算页', reason: '激励视频链路转化低于基线' },
            ]"
          />
          <div class="attribution-detail-grid">
            <section>
              <strong>维度项分析</strong>
              <p>低金币用户在 05-22 较 7 天前减少 50,880 次观看，主要集中在金币不足弹窗和任务中心入口。</p>
            </section>
            <section>
              <strong>过滤规则</strong>
              <p>已排除 ID、日期表达式、分区字段和 TOP1 贡献小于 1% 的维度项。</p>
            </section>
          </div>
        </template>
      </n-space>
      <template #action>
        <n-space justify="end">
          <n-button @click="openAttributionConfig">归因配置</n-button>
          <n-button v-if="attributionTask.reportVisible" @click="actionNotice = '已基于低金币用户贡献项发起人群创建流程。'">新建人群</n-button>
          <n-button v-if="attributionTask.status === 'finished'" type="primary" secondary @click="attributionTask.reportVisible = true">查看归因结果</n-button>
          <n-button :loading="attributionTask.status === 'running'" type="primary" @click="submitAttributionTask">提交归因任务</n-button>
          <n-button @click="attributionModalVisible = false">关闭</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="attributionConfigModalVisible" preset="card" title="归因分析配置" class="medium-modal">
      <n-space vertical>
        <n-alert type="info" :show-icon="false">全局规则适用于数据集全部指标；指标个性规则优先级更高。</n-alert>
        <div class="attribution-task-grid">
          <label>数据集</label>
          <n-input v-model:value="attributionConfigDraft.datasetId" />
          <label>全局判异</label>
          <n-select v-model:value="attributionConfigDraft.globalConfig.anomalyJudgeType" :options="attributionJudgeOptions" />
          <label>波动阈值</label>
          <n-input-number v-model:value="attributionConfigDraft.globalConfig.threshold" :min="1" :max="100" />
          <label>维度上限</label>
          <n-input-number v-model:value="attributionConfigDraft.globalConfig.dimensionLimit.maxCardinality" :min="1" />
          <label>结果维度数</label>
          <n-input-number v-model:value="attributionConfigDraft.globalConfig.resultLimit.maxDimensions" :min="1" :max="20" />
          <label>排除维度</label>
          <n-input
            :value="attributionConfigDraft.globalConfig.dimensionLimit.excludedDimensionIds.join(',')"
            placeholder="用英文逗号分隔"
            @update:value="(value) => attributionConfigDraft.globalConfig.dimensionLimit.excludedDimensionIds = value.split(',').map((item) => item.trim()).filter(Boolean)"
          />
        </div>
        <section class="attribution-rule-card">
          <div>
            <strong>广告观看次数个性规则</strong>
            <span>覆盖全局判异和结果限制</span>
          </div>
          <n-select :value="getAdWatchAttributionRule().anomalyJudgeType" :options="attributionJudgeOptions" @update:value="(value) => updateAdWatchAttributionJudge(value as AttributionRule['anomalyJudgeType'])" />
          <n-input-number :value="getAdWatchAttributionRule().resultLimit.maxDimensions" :min="1" :max="20" placeholder="输出维度数" @update:value="(value) => updateAdWatchAttributionResultLimit(Number(value ?? 6))" />
        </section>
        <n-alert type="warning" :show-icon="false">不会展示 ID、日期表达式、分区字段、空维度、维度项过多或贡献过低的维度结果。</n-alert>
      </n-space>
      <template #action>
        <n-space justify="end">
          <n-button @click="attributionConfigModalVisible = false">取消</n-button>
          <n-button type="primary" @click="saveAttributionConfig">保存配置</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="drillConfigModalVisible" preset="card" title="下钻设置" class="medium-modal">
      <n-space vertical>
        <n-alert type="info" :show-icon="false">
          支持数据集字段层级和图表钻取设置两种方式；保存到仪表盘后，阅览态可通过数据点聚焦下钻。
        </n-alert>
        <n-checkbox v-model:checked="drillDraft.enabled">启用下钻能力</n-checkbox>
        <n-select v-model:value="drillDraft.mode" :options="drillModeOptions" placeholder="下钻来源" />
        <n-select v-model:value="drillDraft.hierarchyFields" :options="drillFieldOptions" multiple placeholder="层级字段顺序" />
        <n-select v-model:value="drillDraft.drillableFields" :options="drillFieldOptions" multiple placeholder="可下钻字段" />
        <div class="config-state-grid">
          <n-tag :type="drillDraft.mode === 'dataset_hierarchy' && !drillDraft.datasetEditPermission ? 'error' : 'success'">
            数据集编辑权限
          </n-tag>
          <n-tag :type="drillDraft.mode === 'chart_setting' && !drillDraft.datasetViewPermission ? 'error' : 'success'">
            数据集查看权限
          </n-tag>
          <n-tag type="info">{{ drillDraft.hierarchyFields.join(' -> ') }}</n-tag>
        </div>
        <n-alert type="warning" :show-icon="false">下钻状态默认是临时状态；保存书签时会保存当前 sheet、面包屑和表格状态。</n-alert>
      </n-space>
      <template #action>
        <n-space justify="end">
          <n-button @click="drillConfigModalVisible = false">取消</n-button>
          <n-button type="primary" @click="saveDrillConfig">保存下钻设置</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="linkageConfigModalVisible" preset="card" title="联动设置" class="medium-modal">
      <n-space vertical>
        <n-alert type="info" :show-icon="false">
          选择源图表的目标图表，并配置同数据集或跨数据集字段映射；配置完整后状态为绿色。
        </n-alert>
        <n-checkbox v-model:checked="linkageDraft.enabled">启用图表联动</n-checkbox>
        <n-select v-model:value="linkageDraft.targetComponentIds" :options="componentOptions" multiple placeholder="被联动目标图表" />
        <n-checkbox v-model:checked="linkageDraft.includeDrillFields">下钻字段也参与联动配置</n-checkbox>
        <div class="linkage-mapping-list">
          <div v-for="(mapping, index) in linkageDraft.fieldMappings" :key="index" class="linkage-mapping-row" :class="mapping.status">
            <n-select :value="mapping.sourceField" :options="linkageFieldOptions" size="small" placeholder="源字段" @update:value="(value) => updateLinkageFieldMapping(index, { sourceField: String(value) })" />
            <n-select :value="mapping.sourceType" :options="fieldTypeOptions" size="small" @update:value="(value) => updateLinkageFieldMapping(index, { sourceType: value as LinkageFieldMapping['sourceType'] })" />
            <span>→</span>
            <n-select :value="mapping.targetField" :options="linkageFieldOptions" size="small" placeholder="目标字段" @update:value="(value) => updateLinkageFieldMapping(index, { targetField: String(value) })" />
            <n-select :value="mapping.targetType" :options="fieldTypeOptions" size="small" @update:value="(value) => updateLinkageFieldMapping(index, { targetType: value as LinkageFieldMapping['targetType'] })" />
            <n-tag size="small" :type="mapping.status === 'valid' ? 'success' : 'error'">{{ mapping.status === 'valid' ? '配置有效' : mapping.status === 'type_mismatch' ? '类型不兼容' : '待补充' }}</n-tag>
          </div>
        </div>
        <n-alert v-if="linkageValidationError" type="error" :show-icon="false">{{ linkageValidationError }}</n-alert>
        <n-alert type="warning" :show-icon="false">字段值为 null 时联动不会生效；点击空白处或再次取消联动会恢复目标图表原筛选。</n-alert>
      </n-space>
      <template #action>
        <n-space justify="end">
          <n-button @click="addLinkageFieldMapping">添加字段映射</n-button>
          <n-button type="error" secondary @click="deleteLinkageConfig">删除联动配置</n-button>
          <n-button @click="linkageConfigModalVisible = false">取消</n-button>
          <n-button type="primary" @click="saveLinkageConfig">保存联动设置</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="jumpConfigModalVisible" preset="card" title="跳转设置" class="medium-modal">
      <n-space vertical>
        <n-alert type="info" :show-icon="false">
          仪表盘级跳转仅作用于当前仪表盘实例，优先级高于可视化查询里的模板链接。
        </n-alert>
        <n-checkbox v-model:checked="jumpDraft.enabled">启用图表跳转</n-checkbox>
        <div v-for="rule in jumpDraft.rules" :key="rule.id" class="jump-rule-card">
          <div class="jump-rule-head">
            <strong>{{ rule.jumpType === 'dashboard' ? '仪表盘跳转' : '网页跳转' }}</strong>
            <n-tag size="small" :type="rule.priority === 'dashboard_level' ? 'success' : 'info'">
              {{ rule.priority === 'dashboard_level' ? '仪表盘级优先' : '模板链接' }}
            </n-tag>
          </div>
          <n-select :value="rule.jumpType" :options="jumpTypeOptions" size="small" @update:value="(value) => updateJumpRule(rule.id, { jumpType: value as JumpRule['jumpType'] })" />
          <n-select :value="rule.fieldName" :options="linkageFieldOptions" size="small" placeholder="绑定字段" @update:value="(value) => updateJumpRule(rule.id, { fieldName: String(value) })" />
          <template v-if="rule.jumpType === 'dashboard'">
            <n-select :value="rule.targetDashboardId" :options="dashboardTargetOptions" size="small" placeholder="目标仪表盘" @update:value="(value) => updateJumpRule(rule.id, { targetDashboardId: String(value) })" />
            <n-checkbox :checked="rule.passFilters" @update:checked="(value) => updateJumpRule(rule.id, { passFilters: Boolean(value) })">带筛选条件跳转</n-checkbox>
            <n-alert type="info" :show-icon="false">字段匹配：{{ rule.fieldMappings.map((mapping) => `${mapping.sourceField} -> ${mapping.targetFilter}`).join('，') }}</n-alert>
          </template>
          <template v-else>
            <n-input :value="rule.urlTemplate" size="small" placeholder="https://www.baidu.com/s?wd={省份}" @update:value="(value) => updateJumpRule(rule.id, { urlTemplate: value })" />
            <n-checkbox :checked="rule.includeGlobalFilters" @update:checked="(value) => updateJumpRule(rule.id, { includeGlobalFilters: Boolean(value) })">附加全局筛选条件</n-checkbox>
            <n-select :value="rule.openMode" :options="jumpOpenModeOptions" size="small" placeholder="打开方式" @update:value="(value) => updateJumpRule(rule.id, { openMode: value as JumpOpenMode })" />
          </template>
        </div>
      </n-space>
      <template #action>
        <n-space justify="end">
          <n-button @click="jumpConfigModalVisible = false">取消</n-button>
          <n-button type="primary" @click="saveJumpConfig">保存跳转设置</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="tableConfigModalVisible" preset="card" title="表格设置" class="small-modal">
      <n-space vertical>
        <n-select v-model:value="tableSortMode" :options="[{ label: '默认排序', value: 'none' }, { label: '值降序', value: 'value_desc' }, { label: '变化降序', value: 'change_desc' }]" />
        <n-select v-model:value="frozenColumn" :options="[{ label: '不冻结', value: '' }, { label: '冻结维度列', value: 'dimension' }, { label: '冻结指标列', value: 'metric' }]" />
        <n-checkbox v-model:checked="tableVisibleFields.dimension">显示维度</n-checkbox>
        <n-checkbox v-model:checked="tableVisibleFields.metric">显示指标</n-checkbox>
        <n-checkbox v-model:checked="tableVisibleFields.value">显示值</n-checkbox>
        <n-checkbox v-model:checked="tableVisibleFields.change">显示变化</n-checkbox>
      </n-space>
    </n-modal>

    <n-modal v-model:show="quickQueryModalVisible" preset="card" title="快捷查询" class="small-modal">
      <n-space vertical>
        <n-alert type="info" :show-icon="false">快捷查询仅当前页面临时生效，不写回原图表配置；可应用或取消恢复。</n-alert>
        <n-input v-model:value="quickQueryDraft.filter" placeholder="筛选条件，例如 省份 = 山东" />
        <n-select v-model:value="quickQueryDraft.chartStyle" :options="quickQueryChartStyleOptions" placeholder="图表样式" />
        <n-select v-model:value="quickQueryDraft.granularity" :options="quickQueryGranularityOptions" placeholder="日期粒度" />
        <n-input v-model:value="quickQueryDraft.dimension" placeholder="维度，例如 城市" />
        <n-input v-model:value="quickQueryDraft.metric" placeholder="指标，例如 广告观看次数" />
        <n-select v-model:value="quickQueryDraft.aggregation" :options="quickQueryAggregationOptions" placeholder="聚合方式" />
        <div class="quick-query-summary">
          <n-tag size="small">下钻路径：{{ drillTrail.join(' / ') }}</n-tag>
          <n-tag size="small" type="info">{{ quickQueryDraft.dimension }} · {{ quickQueryDraft.metric }} · {{ quickQueryDraft.aggregation }}</n-tag>
        </div>
      </n-space>
      <template #action>
        <n-space justify="end">
          <n-button @click="cancelQuickQuery">取消并恢复</n-button>
          <n-button type="primary" @click="applyQuickQuery">应用到当前页</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="copyChartModalVisible" preset="card" title="复制到仪表盘" class="small-modal">
      <n-space vertical>
        <n-alert type="info" :show-icon="false">复制前会校验原图表数据集查看权限和目标仪表盘编辑权限。</n-alert>
        <n-input v-model:value="copyChartDraft.name" placeholder="新图表名称" />
        <n-select v-model:value="copyChartDraft.targetDashboardId" :options="dashboardTargetOptions" placeholder="目标仪表盘" />
        <n-checkbox v-model:checked="copyChartDraft.followTheme">图表样式跟随目标仪表盘主题</n-checkbox>
      </n-space>
      <template #action>
        <n-space justify="end">
          <n-button @click="copyChartModalVisible = false">取消</n-button>
          <n-button type="primary" @click="submitCopyChart">确认复制</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="interactionConfigModalVisible" preset="card" title="交互事件配置" class="medium-modal">
      <n-space vertical>
        <n-alert type="info" :show-icon="false">
          配置保存到当前仪表盘实例；保存仪表盘并返回阅览页后，点击绑定字段会向父页面发送 postMessage。
        </n-alert>
        <div class="interaction-config-head">
          <n-checkbox v-model:checked="interactionDraft.enabled">启用交互事件</n-checkbox>
          <n-checkbox v-model:checked="interactionDraft.privateDeploymentEnabled">私有化部署已开启</n-checkbox>
        </div>
        <n-input
          :value="interactionDraft.allowOrigins.join(',')"
          placeholder="父页面 Origin 白名单，例如 https://ops.example.com"
          @update:value="updateInteractionOrigins"
        />
        <div v-for="rule in interactionDraft.rules" :key="rule.id" class="interaction-rule-card">
          <n-select :value="rule.chartScope" :options="interactionChartScopeOptions" size="small" @update:value="(value) => updateInteractionRule(rule.id, { chartScope: value as InteractionEventRule['chartScope'] })" />
          <n-select :value="rule.fieldName" :options="linkageFieldOptions" size="small" :disabled="rule.chartScope === 'histogram'" placeholder="绑定字段" @update:value="(value) => updateInteractionRule(rule.id, { fieldName: String(value) })" />
          <n-input :value="rule.eventName" size="small" placeholder="事件名称" @update:value="(value) => updateInteractionRule(rule.id, { eventName: value })" />
          <n-tag size="small" type="info">postMessage</n-tag>
          <n-button size="tiny" type="error" secondary @click="removeInteractionRule(rule.id)">删除</n-button>
        </div>
        <n-alert v-if="interactionValidationError" type="error" :show-icon="false">{{ interactionValidationError }}</n-alert>
        <n-alert type="warning" :show-icon="false">生产环境需要父页面校验 origin；表格发送整行字段，直方图发送区间、值和占比。</n-alert>
      </n-space>
      <template #action>
        <n-space justify="end">
          <n-button @click="addInteractionRule">添加事件</n-button>
          <n-button type="error" secondary @click="cancelInteractionConfig">取消交互事件</n-button>
          <n-button @click="interactionConfigModalVisible = false">关闭</n-button>
          <n-button type="primary" @click="saveInteractionConfig">保存配置</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="interactionModalVisible" preset="card" title="交互事件消息" class="small-modal">
      <n-space vertical>
        <n-alert type="success" :show-icon="false">已按当前图表事件规则向父页面发送消息。</n-alert>
        <n-input :value="interactionPayload" type="textarea" readonly />
      </n-space>
      <template #action>
        <n-space justify="end">
          <n-button @click="interactionModalVisible = false">关闭</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="jumpPreviewModalVisible" preset="card" title="网页跳转预览" class="small-modal">
      <n-space vertical>
        <n-input :value="jumpPreviewUrl" readonly />
        <n-tag size="small" type="info">打开方式：{{ jumpOpenModeOptions.find((item) => item.value === jumpPreviewOpenMode)?.label }}</n-tag>
        <n-alert v-if="jumpPreviewError" type="error" :show-icon="false">{{ jumpPreviewError }}</n-alert>
        <n-alert v-else type="success" :show-icon="false">字段参数已 URL encode，并按配置附加全局筛选条件；弹窗模式可关闭，加载失败会展示错误。</n-alert>
      </n-space>
      <template #action>
        <n-space justify="end">
          <n-button @click="jumpPreviewError = '弹窗 URL 加载失败，请检查目标网页是否允许访问。'">模拟加载失败</n-button>
          <n-button @click="jumpPreviewModalVisible = false">关闭</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="announcementModalVisible" preset="card" title="公告配置" class="small-modal">
      <n-space v-if="dashboard?.announcementConfig" vertical>
        <n-checkbox v-model:checked="dashboard.announcementConfig.enabled">启用公告</n-checkbox>
        <n-input v-model:value="dashboard.announcementConfig.content" type="textarea" placeholder="公告内容" />
      </n-space>
      <template #action>
        <n-space justify="end">
          <n-button @click="announcementModalVisible = false">取消</n-button>
          <n-button type="primary" @click="updateAnnouncement">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="languageModalVisible" preset="card" title="多语言配置" class="small-modal">
      <n-space v-if="dashboard?.multiLangConfig" vertical>
        <n-checkbox v-model:checked="dashboard.multiLangConfig.enabled">启用多语言</n-checkbox>
        <n-select v-model:value="dashboard.multiLangConfig.locale" :options="[{ label: '中文', value: 'zh-CN' }, { label: 'English', value: 'en-US' }]" />
        <n-input v-model:value="dashboard.multiLangConfig.names['zh-CN']" placeholder="中文名称" />
        <n-input v-model:value="dashboard.multiLangConfig.names['en-US']" placeholder="英文名称" />
      </n-space>
      <template #action>
        <n-space justify="end">
          <n-button @click="languageModalVisible = false">取消</n-button>
          <n-button type="primary" @click="updateLanguage">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="webhookModalVisible" preset="card" title="Webhook 推送配置" class="medium-modal">
      <n-space vertical>
        <n-alert :type="isProjectAdmin ? 'info' : 'error'" :show-icon="false">
          {{ isProjectAdmin ? 'Webhook 创建后可在订阅和监控推送中选择；接口返回 2xx 视为成功，非 2xx 或超时进入重试机制。' : '仅项目管理员可进入并创建 Webhook 配置。' }}
        </n-alert>
        <div class="subscription-grid">
          <n-input v-model:value="webhookDraft.name" placeholder="Webhook 名称，建议不超过 30 字" />
          <n-input v-model:value="webhookDraft.url" placeholder="https://example.com/webhook" />
          <n-select v-model:value="webhookDraft.interfaceType" :options="webhookInterfaceTypeOptions" placeholder="接口类型" />
          <n-select v-model:value="webhookDraft.secretType" :options="webhookSecretTypeOptions" placeholder="Secret 类型" />
          <n-input v-if="webhookDraft.secretType === 'static_token'" v-model:value="webhookDraft.staticToken" placeholder="静态 Token" />
          <template v-if="webhookDraft.secretType === 'dynamic_token'">
            <n-input v-model:value="webhookDraft.dynamicTokenConfig.tokenApiUrl" placeholder="获取 Token 的接口" />
            <n-input v-model:value="webhookDraft.dynamicTokenConfig.tokenParamName" placeholder="Token 参数名" />
          </template>
          <n-select v-model:value="webhookDraft.subscribedEvents" :options="webhookEventOptions" multiple placeholder="订阅事件" />
        </div>
        <n-input v-model:value="webhookDraft.remark" type="textarea" placeholder="备注" />
        <n-alert v-if="webhookValidationError" type="error" :show-icon="false">{{ webhookValidationError }}</n-alert>
        <div class="config-state-grid">
          <n-tag size="small" :type="webhookTestStatus === 'success' ? 'success' : webhookTestStatus === 'failed' ? 'error' : 'default'">{{ webhookTestStatusLabel }}</n-tag>
          <n-tag size="small" type="info">{{ webhookDraft.interfaceType }}</n-tag>
        </div>
        <section class="subscription-panel">
          <div class="share-grant-head">
            <strong>已有 Webhook</strong>
            <span>{{ webhookConfigs.length }} 个配置</span>
          </div>
          <div v-for="config in webhookConfigs" :key="config.id" class="management-row">
            <div>
              <strong>{{ config.name }}</strong>
              <span>{{ config.url }} · {{ config.subscribedEvents.join(' / ') }}</span>
            </div>
            <n-tag size="small" :type="config.lastTestStatus === 'success' ? 'success' : config.lastTestStatus === 'failed' ? 'error' : 'default'">{{ config.lastTestStatus ?? 'not_tested' }}</n-tag>
          </div>
        </section>
      </n-space>
      <template #action>
        <n-space justify="end">
          <n-button @click="webhookModalVisible = false">关闭</n-button>
          <n-button @click="testWebhook">发送测试</n-button>
          <n-button type="primary" @click="saveWebhookConfig">保存配置</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="shareModalVisible" preset="card" title="授权分享" class="medium-modal">
      <n-space vertical>
        <div class="share-settings-grid">
          <n-select v-model:value="shareDraft.visibility" :options="[{ label: '仅自己可见', value: 'private' }, { label: '团队成员可见', value: 'team' }, { label: '公开访问', value: 'public' }]" placeholder="可见范围" />
          <n-select v-model:value="shareDraft.targetSpaceId" :options="writableSpaceOptions" placeholder="目标空间" />
          <n-checkbox v-model:checked="shareDraft.allowCopy">允许复制为副本</n-checkbox>
          <n-checkbox v-model:checked="shareDraft.notifyEnabled">发送飞书通知</n-checkbox>
        </div>
        <section class="quick-grant-panel">
          <div>
            <strong>一键授权</strong>
            <span>搜索用户或用户组后选择权限，管理员权限需显式选择。</span>
          </div>
          <n-input v-model:value="shareSearchKeyword" placeholder="搜索授权对象或已授权对象" />
          <div class="quick-grant-row">
            <n-select v-model:value="quickGrantPrincipalId" :options="quickGrantPrincipalOptions" filterable clearable placeholder="用户 / 用户组" />
            <n-select v-model:value="quickGrantRole" :options="grantablePermissionRoleOptions" placeholder="权限" />
            <n-button type="primary" @click="addQuickShareGrant">添加授权</n-button>
          </div>
        </section>
        <n-alert v-if="shareValidationError" type="error" :show-icon="false">{{ shareValidationError }}</n-alert>
        <div class="share-grant-list">
          <div class="share-grant-head">
            <strong>授权对象</strong>
            <span>{{ filteredShareGrantRows.length }} 个对象</span>
          </div>
          <div v-for="row in filteredShareGrantRows" :key="row.id" class="share-grant-row">
            <div>
              <strong>{{ row.principalName }}</strong>
              <span>{{ row.description || (row.principalType === 'member' ? '用户' : '用户组') }}</span>
            </div>
            <n-tag size="small" :type="row.principalType === 'member' ? 'default' : 'info'">{{ row.principalType === 'member' ? '用户' : '用户组' }}</n-tag>
            <n-select :value="row.role" :options="grantablePermissionRoleOptions" size="small" @update:value="(value) => updateShareGrantRole(row.id, value as DashboardPermissionRole)" />
            <n-popconfirm v-if="row.isSelf && row.role === 'admin'" @positive-click="removeShareGrantRowDirectly(row)">
              <template #trigger>
                <n-button size="tiny" type="error" secondary>移除</n-button>
              </template>
              移除自身管理权限需要二次确认，确认继续？
            </n-popconfirm>
            <n-button v-else size="tiny" type="error" secondary @click="removeShareGrantRow(row)">移除</n-button>
          </div>
          <n-empty v-if="!filteredShareGrantRows.length" description="没有匹配的授权对象" />
        </div>
        <n-input v-if="shareLink" :value="shareLink" readonly />
      </n-space>
      <template #action>
        <n-space justify="end">
          <n-button @click="shareModalVisible = false">关闭</n-button>
          <n-button type="primary" @click="submitShare">保存授权</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<style scoped lang="scss">
.dashboard-detail-page {
  display: grid;
  gap: 16px;
}

.is-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 20;
  overflow: auto;
  background: #f5f7fb;
}

.deleted-state {
  display: grid;
  gap: 10px;
  min-height: 360px;
  place-content: center;
  border: 1px dashed #f59e0b;
  border-radius: 8px;
  background: #fffbeb;
  color: #92400e;
  text-align: center;
}

.viewer-shell,
.editor-shell {
  display: grid;
  gap: 16px;
}

.viewer-header,
.editor-topbar,
.component-title,
.comment-header,
.version-row,
.editor-bottom {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.viewer-header,
.editor-topbar,
.editor-left,
.editor-right,
.editor-bottom,
.viewer-filter-bar,
.viewer-tabs,
.drill-breadcrumb,
.viewer-canvas,
.comment-panel,
.web-viewer,
.dashboard-canvas {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.editor-shell {
  grid-template-columns: 270px minmax(0, 1fr) 340px;
  grid-template-areas:
    "top top top"
    "left canvas right"
    "bottom bottom bottom";
}

.editor-topbar {
  grid-area: top;
  align-items: center;
  padding: 12px;
}

.topbar-title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.title-input {
  width: 260px;
}

.editor-toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-left: 8px;
  border-left: 1px solid #edf0f5;
}

.toolbar-group:first-child {
  padding-left: 0;
  border-left: 0;
}

.zoom-select,
.layout-select {
  width: 120px;
}

.editor-left,
.editor-right {
  display: grid;
  align-content: start;
  gap: 12px;
  padding: 12px;
  max-height: calc(100vh - 220px);
  overflow: auto;
}

.editor-left {
  grid-area: left;
}

.editor-right {
  grid-area: right;
}

.panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.editor-left h3,
.editor-right h3 {
  margin: 0;
  font-size: 15px;
}

.control-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.control-card {
  display: grid;
  min-height: 74px;
  gap: 5px;
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
  color: #111827;
  text-align: left;
  cursor: pointer;
}

.control-card:hover {
  border-color: #18a058;
  background: #f0fdf4;
}

.control-card small {
  color: #6b7280;
  font-size: 11px;
  line-height: 1.4;
}

.layer-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 8px;
  border: 1px solid #edf0f5;
  border-radius: 6px;
  background: #f8fafc;
  color: #1f2937;
  cursor: pointer;
}

.layer-row.active {
  border-color: #18a058;
  background: #ecfdf3;
}

.editor-canvas-wrap {
  grid-area: canvas;
  display: grid;
  gap: 10px;
  min-width: 0;
}

.editor-canvas-wrap.mobile {
  max-width: 440px;
  justify-self: center;
}

.canvas-toolbar {
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.dashboard-canvas {
  position: relative;
  min-height: 620px;
  padding: 16px;
  transform-origin: top left;
}

.dashboard-canvas.tile {
  display: grid;
  grid-template-columns: repeat(2, minmax(260px, 1fr));
  gap: 12px;
  align-content: start;
}

.dashboard-canvas.free {
  min-height: 760px;
}

.canvas-component,
.viewer-component {
  overflow: hidden;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.canvas-component {
  cursor: grab;
}

.canvas-component.selected {
  border-color: #18a058;
  box-shadow: 0 0 0 2px rgba(24, 160, 88, 0.14);
}

.canvas-component.grouped {
  border-style: dashed;
}

.canvas-component.floating {
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
}

.canvas-component.hidden,
.viewer-component.hidden {
  opacity: 0.45;
}

.selection-box {
  position: absolute;
  z-index: 30;
  border: 1px dashed #2563eb;
  background: rgba(37, 99, 235, 0.08);
  pointer-events: none;
}

.alignment-guide {
  position: absolute;
  z-index: 25;
  pointer-events: none;
}

.alignment-guide.vertical {
  top: 0;
  bottom: 0;
  left: 50%;
  border-left: 1px dashed #ef4444;
}

.alignment-guide.horizontal {
  right: 0;
  left: 0;
  top: 50%;
  border-top: 1px dashed #ef4444;
}

.component-title strong {
  color: #111827;
}

.component-title > div:first-child {
  min-width: 0;
}

.component-status-row {
  flex: 0 1 58%;
  justify-content: flex-end;
}

.component-title small {
  display: block;
  margin-top: 3px;
  color: #6b7280;
  font-size: 12px;
}

.component-body,
.component-chart,
.viewer-chart {
  width: 100%;
  height: 220px;
}

.component-body iframe,
.viewer-component iframe,
.web-viewer iframe {
  width: 100%;
  height: 220px;
  border: 0;
}

.text-component,
.generic-component,
.relation-graph,
.analysis-tree,
.pill-list,
.filter-component-preview,
.query-container-preview,
.tab-component-preview,
.tooltip-preview,
.plugin-preview,
.top-container-preview {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-height: 120px;
  color: #374151;
}

.pill-list span,
.filter-component-preview span,
.relation-graph span,
.analysis-tree span,
.query-container-preview span,
.tab-component-preview span {
  padding: 6px 10px;
  border-radius: 6px;
  background: #eef2ff;
  color: #3730a3;
  font-size: 12px;
}

.divider-component {
  height: 0;
  margin-top: 56px;
  border-top: 2px solid #94a3b8;
}

.empty-chart-card {
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 8px;
  height: 100%;
  min-height: 180px;
  border: 1px dashed #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
  color: #1e40af;
  text-align: center;
}

.empty-chart-card span {
  max-width: 260px;
  color: #64748b;
  font-size: 12px;
}

.image-component {
  width: 100%;
  height: 100%;
  min-height: 180px;
  border-radius: 8px;
  object-fit: cover;
}

.query-container-preview {
  padding: 10px;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
}

.filter-component-preview {
  padding: 10px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #eff6ff;
}

.tooltip-preview strong {
  display: grid;
  width: 28px;
  height: 28px;
  place-content: center;
  border-radius: 50%;
  background: #dbeafe;
  color: #2563eb;
}

.plugin-preview,
.top-container-preview {
  justify-content: center;
  overflow: auto;
  border-radius: 8px;
  background: #f8fafc;
}

.config-section {
  display: grid;
  gap: 8px;
  padding-bottom: 12px;
  border-bottom: 1px solid #edf0f5;
}

.config-section:last-child {
  border-bottom: 0;
}

.inline-config-grid {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
}

.step-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.recent-chart-list,
.plugin-market,
.help-grid {
  display: grid;
  gap: 8px;
}

.recent-chart-row,
.plugin-card,
.help-grid div {
  display: grid;
  gap: 4px;
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  color: #111827;
  text-align: left;
}

.recent-chart-row {
  cursor: pointer;
}

.recent-chart-row:hover,
.plugin-card:hover {
  border-color: #18a058;
  background: #f0fdf4;
}

.recent-chart-row small,
.plugin-card span,
.help-grid span {
  color: #6b7280;
  font-size: 12px;
}

.tab-config-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.filter-config-card {
  display: grid;
  gap: 8px;
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}

.child-filter-row,
.top-child-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  background: #fff;
  color: #4b5563;
  font-size: 12px;
}

.query-child-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.config-action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
  gap: 8px;
}

.editor-right label {
  color: #6b7280;
  font-size: 12px;
}

.editor-bottom {
  grid-area: bottom;
  align-items: stretch;
  padding: 12px;
}

.page-tabs {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-wrap: wrap;
  gap: 8px;
}

.page-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  max-width: 260px;
  padding: 4px 6px 4px 10px;
  border: 1px solid #d9dee8;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}

.page-tab.active {
  border-color: #18a058;
  background: #ecfdf3;
}

.page-tab.hidden {
  color: #6b7280;
}

.page-tab.dragging {
  opacity: 0.55;
}

.page-tab span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.page-tab-input {
  width: 140px;
}

.bottom-actions {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.viewer-header {
  padding: 16px;
}

.viewer-title-block {
  display: grid;
  min-width: 0;
  gap: 10px;
}

.viewer-title-block .page-title,
.viewer-title-block .page-description {
  margin: 0;
}

.viewer-actions {
  display: flex;
  flex: none;
  flex-wrap: nowrap;
  justify-content: flex-end;
  gap: 8px;
}

.notice-alert {
  margin: 0;
}

.viewer-filter-bar {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr)) auto auto auto;
  gap: 10px;
  align-items: end;
  padding: 12px;
}

.share-link-alert {
  display: grid;
  gap: 8px;
}

.fullscreen-size-toggle {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.viewer-top-container {
  position: sticky;
  top: 0;
  z-index: 10;
  display: grid;
  gap: 8px;
  overflow: auto;
  padding: 10px 12px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
}

.viewer-top-items {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.filter-item {
  display: grid;
  gap: 6px;
  color: #6b7280;
  font-size: 12px;
}

.viewer-tabs,
.drill-breadcrumb {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
}

.viewer-content {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
}

.viewer-content.with-comments {
  grid-template-columns: minmax(0, 1fr) 320px;
}

.viewer-canvas {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  align-content: start;
  padding: 12px;
}

.viewer-canvas.actual {
  width: 1440px;
  max-width: none;
}

.viewer-component.linked {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.14);
}

.viewer-component.linkage-target {
  border-color: #f59e0b;
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.14);
}

.viewer-component.drilling {
  border-color: #18a058;
  box-shadow: 0 0 0 2px rgba(24, 160, 88, 0.14);
}

.component-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #edf0f5;
}

.comment-panel {
  display: grid;
  align-content: start;
  gap: 10px;
  padding: 12px;
}

.comment-card {
  display: grid;
  gap: 6px;
  padding: 10px;
  border: 1px solid #edf0f5;
  border-radius: 8px;
}

.comment-card p {
  margin: 0;
}

.comment-card p.deleted {
  color: #9ca3af;
  font-style: italic;
}

.comment-card small,
.version-row span {
  color: #6b7280;
  font-size: 12px;
}

.reply-card {
  padding: 6px 8px;
  border-radius: 6px;
  background: #f8fafc;
  font-size: 12px;
}

.web-viewer {
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.web-viewer-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  background: #f8fafc;
  color: #4b5563;
  font-size: 12px;
}

.web-frame-wrap {
  position: relative;
  min-height: 640px;
  background: #fff;
}

.web-frame-state {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 1;
  padding: 8px 10px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 12px;
}

.web-frame-state.error {
  border-color: #fecaca;
  background: #fef2f2;
  color: #b91c1c;
}

.web-viewer iframe {
  height: 640px;
}

.web-component-preview {
  display: grid;
  gap: 8px;
  min-height: 100%;
}

.web-component-toolbar {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #f8fafc;
  color: #4b5563;
  font-size: 12px;
}

.web-component-toolbar span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.web-component-state {
  padding: 8px;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 12px;
}

.web-component-state.error {
  border-color: #fecaca;
  background: #fef2f2;
  color: #b91c1c;
}

.viewer-web-component iframe,
.web-component-preview iframe {
  min-height: 280px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.dataset-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.dataset-summary-grid > div,
.dataset-param-list {
  display: grid;
  gap: 6px;
  padding: 10px;
  border: 1px solid #edf0f5;
  border-radius: 8px;
  background: #f8fafc;
}

.dataset-summary-grid span,
.dataset-mapping-row small {
  color: #6b7280;
  font-size: 12px;
}

.dataset-mapping-list {
  display: grid;
  gap: 8px;
}

.dataset-mapping-head,
.dataset-mapping-row {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) auto minmax(160px, 1.2fr) 120px auto;
  gap: 8px;
  align-items: center;
}

.dataset-mapping-head {
  grid-template-columns: 1fr auto;
}

.dataset-mapping-row {
  padding: 8px;
  border: 1px solid #edf0f5;
  border-radius: 8px;
}

.dataset-mapping-row > div {
  display: grid;
  gap: 2px;
}

.dataset-param-list {
  align-items: start;
}

.quick-query-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.config-state-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.linkage-mapping-list {
  display: grid;
  gap: 8px;
}

.linkage-mapping-row {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) 96px auto minmax(120px, 1fr) 96px auto;
  gap: 8px;
  align-items: center;
  padding: 8px;
  border: 1px solid #fecaca;
  border-radius: 8px;
  background: #fef2f2;
}

.linkage-mapping-row.valid {
  border-color: #bbf7d0;
  background: #f0fdf4;
}

.jump-rule-card {
  display: grid;
  gap: 8px;
  padding: 10px;
  border: 1px solid #edf0f5;
  border-radius: 8px;
  background: #f8fafc;
}

.jump-rule-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.attribution-task-grid {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr) 88px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
}

.attribution-task-grid label {
  color: #6b7280;
  font-size: 13px;
}

.attribution-rule-card,
.interaction-rule-card,
.quick-grant-panel,
.share-grant-list {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid #edf0f5;
  border-radius: 8px;
  background: #f8fafc;
}

.attribution-rule-card > div,
.quick-grant-panel > div:first-child,
.share-grant-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.attribution-rule-card span,
.quick-grant-panel span,
.share-grant-head span,
.share-grant-row span {
  color: #6b7280;
  font-size: 12px;
}

.attribution-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.attribution-detail-grid section {
  padding: 12px;
  border: 1px solid #edf0f5;
  border-radius: 8px;
  background: #fff;
}

.attribution-detail-grid p {
  margin: 6px 0 0;
  color: #4b5563;
  line-height: 1.6;
}

.interaction-config-head,
.share-settings-grid,
.quick-grant-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  align-items: center;
}

.interaction-rule-card {
  grid-template-columns: 130px 130px minmax(0, 1fr) auto auto;
  align-items: center;
  background: #fff;
}

.quick-grant-row {
  grid-template-columns: minmax(0, 1.4fr) 120px auto;
}

.subscription-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  align-items: center;
}

.subscription-panel {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid #edf0f5;
  border-radius: 8px;
  background: #f8fafc;
}

.subscription-checks {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.management-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 10px;
  border: 1px solid #edf0f5;
  border-radius: 8px;
  background: #fff;
}

.management-row > div {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.management-row span {
  overflow: hidden;
  color: #6b7280;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.share-grant-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 132px auto;
  gap: 10px;
  align-items: center;
  padding: 10px;
  border: 1px solid #edf0f5;
  border-radius: 8px;
  background: #fff;
}

.share-grant-row > div {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.embed-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.version-list {
  display: grid;
  gap: 10px;
}

.version-row {
  align-items: center;
  padding: 10px;
  border: 1px solid #edf0f5;
  border-radius: 8px;
}

.version-row div {
  display: grid;
  gap: 4px;
}

.attribution-report {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.attribution-report div {
  display: grid;
  gap: 6px;
  padding: 12px;
  border-radius: 8px;
  background: #f8fafc;
}

.attribution-report span {
  color: #6b7280;
  font-size: 12px;
}

.attribution-report strong {
  color: #111827;
  font-size: 18px;
}

.share-current {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  color: #6b7280;
  font-size: 12px;
}

@media (max-width: 960px) {
  .attribution-task-grid,
  .attribution-detail-grid,
  .interaction-config-head,
  .share-settings-grid,
  .quick-grant-row,
  .subscription-grid,
  .interaction-rule-card,
  .management-row,
  .share-grant-row {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
