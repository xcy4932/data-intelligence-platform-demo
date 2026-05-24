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
  NModal,
  NSelect,
  NSpace,
  NSpin,
  NTag,
} from 'naive-ui'
import type { DataTableColumns, DropdownOption, SelectOption, TagProps } from 'naive-ui'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import VChart from 'vue-echarts'
import { analysisCenterService } from '@/services/analysisCenterService'
import type {
  AnalysisCenterSpace,
  DashboardAsset,
  DashboardAssetStatus,
  DashboardComponent,
  DashboardCopyPayload,
  DashboardCreatePayload,
  DashboardFilters,
  DashboardFolder,
  DashboardFolderCreatePayload,
  DashboardLayoutTemplate,
  DashboardTemplate,
  DashboardWidgetTableRow,
  ShareAssetPayload,
  SharePrincipal,
  SpaceCreatePayload,
} from '@/types/analysisCenter'

type CreateMode = 'normal' | 'web' | 'folder' | 'template'
type DirectoryGroup = 'personal' | 'shared' | 'public'

const router = useRouter()
const loading = ref(false)
const actionNotice = ref('')
const dashboards = ref<DashboardAsset[]>([])
const folders = ref<DashboardFolder[]>([])
const defaultDashboardId = ref('')
const availableTags = ref<string[]>([])
const activeDashboardId = ref('')
const createModalVisible = ref(false)
const createMode = ref<CreateMode>('normal')
const renameModalVisible = ref(false)
const copyModalVisible = ref(false)
const moveModalVisible = ref(false)
const deleteConfirmVisible = ref(false)
const tagManagerModalVisible = ref(false)
const templateLibraryVisible = ref(false)
const importTemplateModalVisible = ref(false)
const exportTemplateModalVisible = ref(false)
const applyTemplateModalVisible = ref(false)
const spaceModalVisible = ref(false)
const shareModalVisible = ref(false)
const statisticsModalVisible = ref(false)
const redirectModalVisible = ref(false)
const transferModalVisible = ref(false)
const renamingDashboard = ref<DashboardAsset | null>(null)
const copyingDashboard = ref<DashboardAsset | null>(null)
const movingDashboard = ref<DashboardAsset | null>(null)
const deletingDashboard = ref<DashboardAsset | null>(null)
const exportingDashboard = ref<DashboardAsset | null>(null)
const applyingTemplate = ref<DashboardTemplate | null>(null)
const sharingDashboard = ref<DashboardAsset | null>(null)
const currentStatisticsDashboard = ref<DashboardAsset | null>(null)
const redirectDashboard = ref<DashboardAsset | null>(null)
const transferDashboard = ref<DashboardAsset | null>(null)
const renameValue = ref('')
const webUrlValue = ref('')
const webPreviewError = ref(false)
const folderIdValue = ref('')
const moveFolderId = ref('')
const newTagName = ref('')
const selectedDashboardIds = ref<string[]>([])
const templates = ref<DashboardTemplate[]>([])
const spaces = ref<AnalysisCenterSpace[]>([])
const shareMembers = ref<SharePrincipal[]>([])
const shareTeams = ref<SharePrincipal[]>([])
const sharedMembers = ref<SharePrincipal[]>([])
const sharedTeams = ref<SharePrincipal[]>([])
const createDraft = ref<DashboardCreatePayload>({
  name: '',
  description: '',
  type: 'normal',
  folderId: 'folder-personal-growth',
  webUrl: '',
  spaceType: 'personal',
  spaceId: 'space-personal',
  visibility: 'private',
  layoutTemplate: 'blank',
  tags: [],
})
const folderDraft = ref<DashboardFolderCreatePayload>({
  name: '',
  groupType: 'personal',
})
const copyDraft = ref<DashboardCopyPayload>({
  name: '',
  targetSpaceId: 'space-personal',
  targetFolderId: 'folder-personal-growth',
  copyChartResources: false,
})
const templateImportDraft = ref({
  packageName: '',
  targetFolderId: 'folder-personal-growth',
})
const templateExportDraft = ref({
  name: '',
  description: '',
  desensitizeSampleData: true,
  saveToLibrary: true,
})
const templateApplyDraft = ref({
  name: '',
  targetFolderId: 'folder-personal-growth',
  datasetId: 'ds_ad_watch_detail',
})
const redirectDraft = ref({
  enabled: false,
  url: '',
})
const transferOwnerId = ref('u_mia')
const spaceDraft = ref<SpaceCreatePayload>({
  name: '',
  type: 'team',
  description: '',
})
const editingSpaceId = ref('')
const editingSpaceName = ref('')
const shareDraft = ref<ShareAssetPayload>({
  assetId: '',
  assetType: 'dashboard',
  visibility: 'team',
  targetSpaceId: 'space-team-operation',
  allowCopy: true,
  permissionRole: 'viewer',
  notifyEnabled: true,
  addMemberIds: [],
  addTeamIds: [],
  removeMemberIds: [],
  removeTeamIds: [],
})
const shareLink = ref('')
const filters = ref<DashboardFilters>({
  keyword: '',
  spaceType: 'all',
  visibility: 'all',
  owner: 'all',
  favoriteOnly: false,
  tags: [],
  updatedAt: 'all',
  status: 'all',
  sortMode: 'updated_desc',
})

let searchTimer: number | undefined

const groupLabels: Record<DirectoryGroup, string> = {
  personal: '个人仪表盘',
  shared: '与我共享',
  public: '公共仪表盘',
}

const groupHelp: Record<DirectoryGroup, string> = {
  personal: '默认仅自己可见，可分享给成员查看。',
  shared: '其他人授权给你的仪表盘，当前仅允许查看。',
  public: '适合多人协作和体系化经营报表。',
}

const spaceTypeLabelMap: Record<DashboardAsset['spaceType'], string> = {
  personal: '个人空间',
  team: '团队空间',
  public: '公共空间',
}

const visibilityLabelMap: Record<DashboardAsset['visibility'], string> = {
  private: '仅自己可见',
  team: '团队可见',
  public: '公开',
}

const statusLabelMap: Record<DashboardAssetStatus, string> = {
  normal: '正常',
  has_error_widget: '组件异常',
  no_permission: '无权限',
  archived: '已归档',
  draft: '草稿',
  published: '已发布',
  unpublished: '未发布',
  deleted: '已删除',
}

const layoutTemplateLabelMap: Record<DashboardLayoutTemplate, string> = {
  blank: '空白仪表盘',
  operation_monitoring: '运营监控模板',
  retention_analysis: '留存分析模板',
  experiment_review: '实验复盘模板',
  executive_overview: '管理层概览模板',
}

const createModeOptions: DropdownOption[] = [
  { label: '新建仪表盘', key: 'normal' },
  { label: '新建网页仪表盘', key: 'web' },
  { label: '新建文件夹', key: 'folder' },
  { label: '仪表盘模板', key: 'template' },
]

const dashboardActionOptions: DropdownOption[] = [
  { label: '阅览', key: 'view' },
  { label: '编辑 / 网页信息', key: 'edit' },
  { label: '基础信息', key: 'base' },
  { label: '移动', key: 'move' },
  { label: '复制仪表盘', key: 'copy' },
  { label: '授权', key: 'share' },
  { label: '转移所有者', key: 'transfer' },
  { label: '访问统计', key: 'stats' },
  { label: '设置重定向', key: 'redirect' },
  { label: '导出为模板', key: 'export_template' },
  { label: '删除', key: 'delete' },
]

const spaceTypeOptions: SelectOption[] = [
  { label: '全部空间', value: 'all' },
  { label: '个人空间', value: 'personal' },
  { label: '团队空间', value: 'team' },
  { label: '公共空间', value: 'public' },
]

const visibilityOptions: SelectOption[] = [
  { label: '全部可见范围', value: 'all' },
  { label: '仅自己', value: 'private' },
  { label: '团队可见', value: 'team' },
  { label: '公开', value: 'public' },
]

const createVisibilityOptions: SelectOption[] = [
  { label: '仅自己可见', value: 'private' },
  { label: '团队成员可见', value: 'team' },
  { label: '公开访问', value: 'public' },
]

const permissionRoleOptions: SelectOption[] = [
  { label: '可查看', value: 'viewer' },
  { label: '可编辑', value: 'editor' },
  { label: '管理员', value: 'admin' },
]

const datasetReplacementOptions: SelectOption[] = [
  { label: '广告观看明细数据集', value: 'ds_ad_watch_detail' },
  { label: '用户留存数据集', value: 'ds_user_retention' },
  { label: '低金币用户分群数据集', value: 'ds_low_coin_segment' },
]

const layoutTemplateOptions: SelectOption[] = Object.entries(layoutTemplateLabelMap).map(([value, label]) => ({
  label,
  value,
}))

const folderOptions = computed<SelectOption[]>(() =>
  folders.value
    .filter((folder) => folder.groupType !== 'shared')
    .map((folder) => ({
      label: `${groupLabels[folder.groupType]} / ${folder.name}`,
      value: folder.id,
      disabled: !folder.canWrite,
    })),
)
const tagOptions = computed<SelectOption[]>(() =>
  availableTags.value.map((tag) => ({
    label: tag,
    value: tag,
  })),
)
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
const selectedDashboard = computed(() =>
  dashboards.value.find((dashboard) => dashboard.id === activeDashboardId.value) ?? dashboards.value[0] ?? null,
)
const selectedVisiblePages = computed(() =>
  (selectedDashboard.value?.pages ?? []).filter((page) => page.visibleInViewMode),
)
const previewActionOptions = computed<DropdownOption[]>(() => {
  const dashboard = selectedDashboard.value

  return [
    { label: dashboard?.isDefaultForCurrentUser ? '取消默认' : '设为默认', key: 'toggle_default' },
    { label: dashboard?.favorite ? '取消收藏' : '收藏', key: 'toggle_favorite' },
    { label: '基础信息', key: 'base' },
    { label: '移动', key: 'move' },
    { label: '复制', key: 'copy' },
    { label: '授权分享', key: 'share' },
    { label: '转移所有者', key: 'transfer' },
    { label: '访问统计', key: 'stats' },
    { label: '重定向', key: 'redirect' },
    { label: '导出为模板', key: 'export_template' },
    { label: '删除', key: 'delete' },
  ]
})
const selectedDashboards = computed(() =>
  dashboards.value.filter((dashboard) => selectedDashboardIds.value.includes(dashboard.id)),
)
const directoryGroups = computed(() =>
  (['personal', 'shared', 'public'] as DirectoryGroup[]).map((group) => ({
    key: group,
    label: groupLabels[group],
    help: groupHelp[group],
    folders: folders.value.filter((folder) => folder.groupType === group),
    dashboards: dashboards.value.filter((dashboard) => (dashboard.groupType ?? (dashboard.spaceType === 'public' ? 'public' : 'personal')) === group),
  })),
)
const folderById = computed(() => Object.fromEntries(folders.value.map((folder) => [folder.id, folder])))
const getGroupRootDashboards = (group: { key: DirectoryGroup, dashboards: DashboardAsset[] }): DashboardAsset[] =>
  group.dashboards.filter((dashboard) => !dashboard.folderId || !folderById.value[dashboard.folderId])
const getFolderDashboards = (group: { key: DirectoryGroup, dashboards: DashboardAsset[] }, folderId: string): DashboardAsset[] =>
  group.dashboards.filter((dashboard) => dashboard.folderId === folderId)
const getFolderSpacePatch = (folderId: string): Partial<DashboardAsset> => {
  const folder = folderById.value[folderId]

  if (folder?.groupType === 'public') {
    return {
      folderId,
      groupType: 'public',
      spaceType: 'public',
      spaceId: 'space-public',
      spaceName: '公共空间',
      visibility: 'public',
    }
  }

  return {
    folderId,
    groupType: 'personal',
    spaceType: 'personal',
    spaceId: 'space-personal',
    spaceName: '个人空间',
  }
}

const inferWebUrlType = (url: string): 'dashboard_embed' | 'external_web' | 'cloud_doc' => {
  if (url.includes('/analysis-center/dashboards/') || url.includes('/dashboard/')) {
    return 'dashboard_embed'
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
const getWebUrlTypeLabel = (url?: string): string => {
  if (!url) {
    return '未配置'
  }

  const urlType = inferWebUrlType(url)
  if (urlType === 'dashboard_embed') {
    return '仪表盘嵌出'
  }

  return urlType === 'cloud_doc' ? '云文档' : '外部网页'
}
const getTemplateScopeLabel = (scope: DashboardTemplate['scope']): string => {
  if (scope === 'official') {
    return '官方'
  }

  return scope === 'project' ? '项目' : '个人'
}

const tableColumns: DataTableColumns<DashboardWidgetTableRow> = [
  { title: '维度', key: 'dimension', minWidth: 160 },
  { title: '指标', key: 'metric', width: 140 },
  { title: '值', key: 'value', width: 120 },
  { title: '变化', key: 'change', width: 100 },
]

const componentTypeLabels: Record<string, string> = {
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

const getDashboardThemeColor = (dashboard: DashboardAsset): string => {
  if (dashboard.settings?.themeId === 'dark' || dashboard.settings?.themeId === 'dark_screen') {
    return '#38bdf8'
  }

  if (dashboard.settings?.themeId === 'tech_blue') {
    return '#0ea5e9'
  }

  if (dashboard.settings?.themeId === 'elegant_purple') {
    return '#8b5cf6'
  }

  return '#2563eb'
}

const buildChartOption = (component: DashboardComponent, dashboard: DashboardAsset): EChartsOption => {
  const widget = component.widget
  const chartData = widget?.chartData?.length
    ? widget.chartData
    : [
        { name: '05-20', value: 386200, compareValue: 410500 },
        { name: '05-21', value: 372400, compareValue: 408200 },
        { name: '05-22', value: 356920, compareValue: 407800 },
      ]
  const names = chartData.map((item) => item.name)
  const color = getDashboardThemeColor(dashboard)

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

  if (widget?.widgetType === 'bar' || widget?.widgetType === 'distribution') {
    return {
      color: [color],
      grid: { top: 24, right: 16, bottom: 32, left: 56 },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: names },
      yAxis: { type: 'value' },
      series: [{ name: component.name, type: 'bar', data: chartData.map((item) => item.value) }],
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
        name: '当前值',
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

const getComponentStyle = (component: DashboardComponent): Record<string, string> => ({
  gridColumn: `span ${Math.min(component.layout.width, 2)}`,
  minHeight: `${Math.max(component.layout.height, 1) * 132}px`,
})

const getComponentRows = (component: DashboardComponent): DashboardWidgetTableRow[] =>
  component.widget?.tableRows ?? [
    { dimension: '低金币用户', metric: '广告观看次数', value: '128,420', change: '-18.6%' },
    { dimension: '任务中心', metric: '完成率', value: '34.8%', change: '-12.3%' },
  ]

const getMetricValue = (component: DashboardComponent): string =>
  component.widget?.metricValue ?? String(component.widget?.chartData?.[0]?.value ?? '128,430')

const getMetricChange = (component: DashboardComponent): string =>
  component.widget?.metricChange ?? '+8.6%'

const handleWebPreviewLoad = (): void => {
  webPreviewError.value = false
}

const handleWebPreviewError = (): void => {
  webPreviewError.value = true
}

const openWebPreviewUrl = (url?: string): void => {
  if (!url) {
    return
  }

  window.open(url, '_blank', 'noopener,noreferrer')
}
const loadList = async (): Promise<void> => {
  loading.value = true

  try {
    const result = await analysisCenterService.getDashboardList(filters.value)
    dashboards.value = result.items
    folders.value = result.folders ?? []
    defaultDashboardId.value = result.defaultDashboardId ?? ''
    availableTags.value = result.tags

    if (!activeDashboardId.value || !dashboards.value.some((dashboard) => dashboard.id === activeDashboardId.value)) {
      activeDashboardId.value = result.defaultDashboardId && dashboards.value.some((dashboard) => dashboard.id === result.defaultDashboardId)
        ? result.defaultDashboardId
        : dashboards.value[0]?.id ?? ''
    }
  } finally {
    loading.value = false
  }
}

const loadSpaces = async (): Promise<void> => {
  spaces.value = await analysisCenterService.getSpaces()
}

const loadTemplates = async (): Promise<void> => {
  templates.value = await analysisCenterService.getDashboardTemplates()
}

const scheduleLoad = (): void => {
  window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    void loadList()
  }, 300)
}

watch(
  filters,
  () => scheduleLoad(),
  { deep: true },
)

const formatTime = (value: string): string => value.replace('T', ' ').slice(0, 16)

const getStatusTagType = (status: DashboardAssetStatus): TagProps['type'] => {
  if (status === 'has_error_widget' || status === 'deleted') {
    return 'error'
  }

  if (status === 'no_permission' || status === 'unpublished' || status === 'draft') {
    return 'warning'
  }

  if (status === 'archived') {
    return 'default'
  }

  return 'success'
}

const getVisibilityTagType = (visibility: DashboardAsset['visibility']): TagProps['type'] => {
  if (visibility === 'public') {
    return 'warning'
  }

  if (visibility === 'team') {
    return 'info'
  }

  return 'default'
}

const canEditDashboard = (dashboard: DashboardAsset): boolean =>
  dashboard.status !== 'no_permission' &&
  dashboard.status !== 'deleted' &&
  dashboard.groupType !== 'shared' &&
  dashboard.editingLock?.userId !== 'u_mia'

const openCreateModal = (mode: CreateMode): void => {
  createMode.value = mode

  if (mode === 'template') {
    void openTemplateLibrary()
    return
  }

  createDraft.value = {
    name: '',
    description: '',
    type: mode === 'web' ? 'web' : 'normal',
    folderId: folderOptions.value[0]?.value ? String(folderOptions.value[0].value) : 'folder-personal-growth',
    webUrl: '',
    spaceType: 'personal',
    spaceId: 'space-personal',
    visibility: 'private',
    layoutTemplate: mode === 'web' ? 'blank' : 'operation_monitoring',
    tags: [],
  }
  folderDraft.value = { name: '', groupType: 'personal' }
  createModalVisible.value = true
}

const openDashboard = (dashboard: DashboardAsset, mode?: 'edit'): void => {
  if (mode === 'edit' && !canEditDashboard(dashboard)) {
    actionNotice.value = '当前用户只有阅览权限，编辑入口已置灰。'
    return
  }

  void router.push({
    path: `/analysis-center/dashboards/${dashboard.id}`,
    query: mode ? { mode } : undefined,
  })
}

const editSelectedDashboard = (dashboard: DashboardAsset): void => {
  if (dashboard.type === 'web') {
    requestRename(dashboard)
    actionNotice.value = '网页仪表盘不进入普通编辑器，可在基础信息中维护名称、路径和 URL。'
    return
  }

  openDashboard(dashboard, 'edit')
}

const toggleFavorite = async (dashboard: DashboardAsset): Promise<void> => {
  await analysisCenterService.toggleDashboardFavorite(dashboard.id)
  actionNotice.value = dashboard.favorite ? '已取消收藏。' : '已加入我的收藏。'
  await loadList()
}

const toggleDefaultDashboard = async (dashboard: DashboardAsset): Promise<void> => {
  if (dashboard.isDefaultForCurrentUser) {
    await analysisCenterService.clearDefaultDashboard()
    actionNotice.value = '已取消默认仪表盘。'
  } else {
    await analysisCenterService.setDefaultDashboard(dashboard.id)
    actionNotice.value = `已将「${dashboard.name}」设为默认仪表盘。`
  }
  await loadList()
}

const requestCopy = (dashboard: DashboardAsset): void => {
  copyingDashboard.value = dashboard
  copyDraft.value = {
    name: `${dashboard.name} 副本`,
    targetSpaceId: 'space-personal',
    targetFolderId: dashboard.folderId ?? 'folder-personal-growth',
    copyChartResources: false,
  }
  copyModalVisible.value = true
}

const submitCopy = async (): Promise<void> => {
  if (!copyingDashboard.value || !copyDraft.value.name.trim()) {
    return
  }

  try {
    const duplicated = await analysisCenterService.duplicateDashboard(copyingDashboard.value.id, {
      ...copyDraft.value,
      name: copyDraft.value.name.trim(),
    })
    actionNotice.value = copyDraft.value.copyChartResources
      ? `已复制为「${duplicated.name}」，图表资源已生成副本。`
      : `已复制为「${duplicated.name}」，图表仍引用原资源。`
    copyModalVisible.value = false
    await loadList()
    void router.push(duplicated.type === 'web'
      ? `/analysis-center/dashboards/${duplicated.id}`
      : `/analysis-center/dashboards/${duplicated.id}?mode=edit`)
  } catch (error) {
    actionNotice.value = error instanceof Error ? error.message : '复制仪表盘失败。'
  }
}

const requestMove = (dashboard: DashboardAsset): void => {
  movingDashboard.value = dashboard
  moveFolderId.value = dashboard.folderId ?? 'folder-personal-growth'
  moveModalVisible.value = true
}

const submitMove = async (): Promise<void> => {
  if (!movingDashboard.value || !moveFolderId.value) {
    return
  }

  try {
    const moved = await analysisCenterService.moveDashboardToFolder(movingDashboard.value.id, moveFolderId.value)
    actionNotice.value = `已移动「${moved.name}」，原访问链接保持不变。`
    activeDashboardId.value = moved.id
    moveModalVisible.value = false
    await loadList()
  } catch (error) {
    actionNotice.value = error instanceof Error ? error.message : '移动仪表盘失败。'
  }
}

const requestDelete = (dashboard: DashboardAsset): void => {
  deletingDashboard.value = dashboard
  deleteConfirmVisible.value = true
}

const submitDelete = async (): Promise<void> => {
  if (!deletingDashboard.value) {
    return
  }

  const result = await analysisCenterService.deleteDashboard(deletingDashboard.value.id)
  actionNotice.value = `${result.message} 原链接将展示资源已删除状态。`
  deleteConfirmVisible.value = false
  await loadList()
}

const requestRename = (dashboard: DashboardAsset): void => {
  renamingDashboard.value = dashboard
  renameValue.value = dashboard.name
  webUrlValue.value = dashboard.webConfig?.url ?? ''
  folderIdValue.value = dashboard.folderId ?? 'folder-personal-growth'
  renameModalVisible.value = true
}

const requestShare = (dashboard: DashboardAsset): void => {
  void loadShareMeta('dashboard', dashboard.id)
  sharingDashboard.value = dashboard
  shareLink.value = ''
  shareDraft.value = {
    assetId: dashboard.id,
    assetType: 'dashboard',
    visibility: dashboard.visibility,
    targetSpaceId: dashboard.spaceId,
    allowCopy: true,
    permissionRole: 'viewer',
    notifyEnabled: true,
    addMemberIds: [],
    addTeamIds: [],
    removeMemberIds: [],
    removeTeamIds: [],
  }
  shareModalVisible.value = true
}

const requestStatistics = (dashboard: DashboardAsset): void => {
  currentStatisticsDashboard.value = dashboard
  statisticsModalVisible.value = true
}

const requestRedirect = (dashboard: DashboardAsset): void => {
  redirectDashboard.value = dashboard
  redirectDraft.value = {
    enabled: Boolean(dashboard.redirectConfig?.enabled),
    url: dashboard.redirectConfig?.url ?? '',
  }
  redirectModalVisible.value = true
}

const requestTransfer = (dashboard: DashboardAsset): void => {
  transferDashboard.value = dashboard
  transferOwnerId.value = 'u_mia'
  transferModalVisible.value = true
}

const requestExportTemplate = (dashboard: DashboardAsset): void => {
  exportingDashboard.value = dashboard
  templateExportDraft.value = {
    name: `${dashboard.name} 模板`,
    description: dashboard.description ?? '',
    desensitizeSampleData: true,
    saveToLibrary: true,
  }
  exportTemplateModalVisible.value = true
}

const openTemplateLibrary = async (): Promise<void> => {
  await loadTemplates()
  templateLibraryVisible.value = true
}

const openImportTemplate = (): void => {
  templateImportDraft.value = {
    packageName: 'operation-monitoring.dashboard-template.zip',
    targetFolderId: folderOptions.value[0]?.value ? String(folderOptions.value[0].value) : 'folder-personal-growth',
  }
  importTemplateModalVisible.value = true
}

const requestApplyTemplate = (template: DashboardTemplate): void => {
  applyingTemplate.value = template
  templateApplyDraft.value = {
    name: `${template.name} 应用`,
    targetFolderId: folderOptions.value[0]?.value ? String(folderOptions.value[0].value) : 'folder-personal-growth',
    datasetId: 'ds_ad_watch_detail',
  }
  applyTemplateModalVisible.value = true
}

const submitImportTemplate = async (): Promise<void> => {
  try {
    const template = await analysisCenterService.importDashboardTemplate(templateImportDraft.value)
    actionNotice.value = `模板「${template.name}」已导入模板库。`
    importTemplateModalVisible.value = false
    await loadTemplates()
  } catch (error) {
    actionNotice.value = error instanceof Error ? error.message : '模板导入失败。'
  }
}

const submitExportTemplate = async (): Promise<void> => {
  if (!exportingDashboard.value) {
    return
  }

  try {
    const template = await analysisCenterService.exportDashboardTemplate({
      dashboardId: exportingDashboard.value.id,
      ...templateExportDraft.value,
    })
    actionNotice.value = `模板「${template.name}」已生成，资源包可用于复用结构和样式。`
    exportTemplateModalVisible.value = false
    await loadTemplates()
  } catch (error) {
    actionNotice.value = error instanceof Error ? error.message : '模板导出失败。'
  }
}

const submitApplyTemplate = async (): Promise<void> => {
  if (!applyingTemplate.value) {
    return
  }

  try {
    const dashboard = await analysisCenterService.applyDashboardTemplate({
      templateId: applyingTemplate.value.id,
      name: templateApplyDraft.value.name,
      targetFolderId: templateApplyDraft.value.targetFolderId,
      datasetMappings: {
        default: templateApplyDraft.value.datasetId,
      },
    })
    actionNotice.value = `已基于模板创建「${dashboard.name}」。`
    applyTemplateModalVisible.value = false
    templateLibraryVisible.value = false
    await loadList()
    void router.push(`/analysis-center/dashboards/${dashboard.id}?mode=edit`)
  } catch (error) {
    actionNotice.value = error instanceof Error ? error.message : '应用模板失败。'
  }
}

const openTagManager = (): void => {
  newTagName.value = ''
  tagManagerModalVisible.value = true
}

const submitCreateTag = async (): Promise<void> => {
  try {
    availableTags.value = await analysisCenterService.createDashboardTag(newTagName.value)
    actionNotice.value = `标签「${newTagName.value.trim()}」已创建。`
    newTagName.value = ''
  } catch (error) {
    actionNotice.value = error instanceof Error ? error.message : '标签创建失败。'
  }
}

const submitDeleteTag = async (tag: string): Promise<void> => {
  availableTags.value = await analysisCenterService.deleteDashboardTag(tag)
  actionNotice.value = `已删除标签「${tag}」，并解除所有仪表盘绑定。`
  await loadList()
}

const toggleDashboardSelection = (dashboard: DashboardAsset, checked: boolean): void => {
  selectedDashboardIds.value = checked
    ? Array.from(new Set([...selectedDashboardIds.value, dashboard.id]))
    : selectedDashboardIds.value.filter((id) => id !== dashboard.id)
}

const transferSelectedDashboards = (): void => {
  if (!selectedDashboards.value.length) {
    actionNotice.value = '请先选择要转移的仪表盘。'
    return
  }

  const firstDashboard = selectedDashboards.value[0]
  if (!firstDashboard) {
    return
  }

  requestTransfer(firstDashboard)
  actionNotice.value = `已选择 ${selectedDashboards.value.length} 个仪表盘，本次演示将统一转移给同一位新 Owner。`
}

const handleDashboardAction = (action: string, dashboard: DashboardAsset): void => {
  activeDashboardId.value = dashboard.id
  const editActions = ['edit', 'base', 'move', 'transfer', 'redirect', 'delete', 'export_template']

  if (editActions.includes(action) && !canEditDashboard(dashboard)) {
    actionNotice.value = dashboard.editingLock
      ? `${dashboard.editingLock.userName} 正在编辑仪表盘，入口已置灰。`
      : '当前用户只有阅览权限，该操作已置灰。'
    return
  }

  if (action === 'view') {
    openDashboard(dashboard)
  } else if (action === 'edit') {
    editSelectedDashboard(dashboard)
  } else if (action === 'base') {
    requestRename(dashboard)
  } else if (action === 'move') {
    requestMove(dashboard)
  } else if (action === 'copy') {
    requestCopy(dashboard)
  } else if (action === 'share') {
    requestShare(dashboard)
  } else if (action === 'transfer') {
    requestTransfer(dashboard)
  } else if (action === 'stats') {
    requestStatistics(dashboard)
  } else if (action === 'redirect') {
    requestRedirect(dashboard)
  } else if (action === 'export_template') {
    requestExportTemplate(dashboard)
  } else if (action === 'delete') {
    requestDelete(dashboard)
  }
}

const handleSelectedDashboardAction = (action: string): void => {
  const dashboard = selectedDashboard.value

  if (!dashboard) {
    return
  }

  if (action === 'toggle_default') {
    void toggleDefaultDashboard(dashboard)
    return
  }

  if (action === 'toggle_favorite') {
    void toggleFavorite(dashboard)
    return
  }

  handleDashboardAction(action, dashboard)
}

const submitRedirect = async (): Promise<void> => {
  if (!redirectDashboard.value) {
    return
  }

  await analysisCenterService.updateDashboardState(redirectDashboard.value.id, {
    redirectConfig: { ...redirectDraft.value },
  })
  actionNotice.value = redirectDraft.value.enabled ? '查看态重定向已启用，编辑态和嵌出态不受影响。' : '已关闭重定向。'
  redirectModalVisible.value = false
  await loadList()
}

const submitTransfer = async (): Promise<void> => {
  if (!transferDashboard.value) {
    return
  }

  const member = shareMembers.value.find((item) => item.id === transferOwnerId.value)
  const targets = selectedDashboards.value.length > 1 ? selectedDashboards.value : [transferDashboard.value]
  await Promise.all(targets.map((dashboard) =>
    analysisCenterService.updateDashboardState(dashboard.id, {
      ownerId: transferOwnerId.value,
      ownerName: member?.name ?? 'Mia Chen',
    }),
  ))
  actionNotice.value = `已转移 ${targets.length} 个仪表盘的所有者，原 Owner 保留管理员权限。`
  selectedDashboardIds.value = []
  transferModalVisible.value = false
  await loadList()
}

const loadShareMeta = async (assetType: ShareAssetPayload['assetType'], assetId: string): Promise<void> => {
  const [options, grants] = await Promise.all([
    analysisCenterService.getShareOptions(),
    analysisCenterService.getAssetShareGrants(assetType, assetId),
  ])
  shareMembers.value = options.members
  shareTeams.value = options.teams
  sharedMembers.value = grants.sharedMembers
  sharedTeams.value = grants.sharedTeams
}

const submitShare = async (): Promise<void> => {
  if (!sharingDashboard.value) {
    return
  }

  const result = await analysisCenterService.shareAsset(shareDraft.value)
  if (shareDraft.value.targetSpaceId && shareDraft.value.targetSpaceId !== sharingDashboard.value.spaceId) {
    await analysisCenterService.moveDashboardToSpace(sharingDashboard.value.id, shareDraft.value.targetSpaceId)
  }
  shareLink.value = result.shareLink
  sharedMembers.value = result.sharedMembers
  sharedTeams.value = result.sharedTeams
  shareDraft.value.addMemberIds = []
  shareDraft.value.addTeamIds = []
  shareDraft.value.removeMemberIds = []
  shareDraft.value.removeTeamIds = []
  actionNotice.value = result.message
  await loadList()
}

const openSpaceModal = async (): Promise<void> => {
  await loadSpaces()
  spaceModalVisible.value = true
}

const submitCreateSpace = async (): Promise<void> => {
  if (!spaceDraft.value.name.trim()) {
    actionNotice.value = '请输入空间名称。'
    return
  }

  const space = await analysisCenterService.createSpace({
    ...spaceDraft.value,
    name: spaceDraft.value.name.trim(),
  })
  actionNotice.value = `已创建空间「${space.name}」。`
  spaceDraft.value = { name: '', type: 'team', description: '' }
  await loadSpaces()
}

const startRenameSpace = (space: AnalysisCenterSpace): void => {
  editingSpaceId.value = space.id
  editingSpaceName.value = space.name
}

const submitRenameSpace = async (): Promise<void> => {
  if (!editingSpaceId.value || !editingSpaceName.value.trim()) {
    return
  }

  const space = await analysisCenterService.renameSpace(editingSpaceId.value, editingSpaceName.value.trim())
  actionNotice.value = `已重命名空间为「${space.name}」。`
  editingSpaceId.value = ''
  editingSpaceName.value = ''
  await Promise.all([loadSpaces(), loadList()])
}

const deleteSpace = async (space: AnalysisCenterSpace): Promise<void> => {
  const result = await analysisCenterService.deleteSpace(space.id)
  actionNotice.value = result.message
  await loadSpaces()
}

const submitRename = async (): Promise<void> => {
  if (!renamingDashboard.value || !renameValue.value.trim()) {
    return
  }

  if (renamingDashboard.value.type === 'web' && !isValidWebUrl(webUrlValue.value.trim())) {
    actionNotice.value = '请输入合法的网页地址。'
    return
  }

  try {
    const renamed = await analysisCenterService.renameDashboard(renamingDashboard.value.id, renameValue.value.trim())
    if (folderIdValue.value && folderIdValue.value !== renamingDashboard.value.folderId) {
      await analysisCenterService.moveDashboardToFolder(renamingDashboard.value.id, folderIdValue.value)
    }
    if (renamingDashboard.value.type === 'web') {
      await analysisCenterService.updateWebDashboard(renamingDashboard.value.id, {
        url: webUrlValue.value.trim(),
        folderId: folderIdValue.value,
        tags: renamingDashboard.value.tags,
      })
    } else {
      await analysisCenterService.updateDashboardState(renamingDashboard.value.id, {
        tags: renamingDashboard.value.tags,
        ...getFolderSpacePatch(folderIdValue.value),
      })
    }
    actionNotice.value = `已重命名为「${renamed.name}」，目录与标题已同步。`
    activeDashboardId.value = renamed.id
    renameModalVisible.value = false
    await loadList()
  } catch (error) {
    actionNotice.value = error instanceof Error ? error.message : '保存基础信息失败。'
  }
}

const submitCreate = async (): Promise<void> => {
  if (createMode.value === 'folder') {
    try {
      const folder = await analysisCenterService.createDashboardFolder(folderDraft.value)
      actionNotice.value = `已创建文件夹「${folder.name}」。`
      createModalVisible.value = false
      await loadList()
    } catch (error) {
      actionNotice.value = error instanceof Error ? error.message : '创建文件夹失败。'
    }
    return
  }

  if (!createDraft.value.name.trim()) {
    actionNotice.value = '请输入仪表盘名称'
    return
  }

  if (createDraft.value.name.trim().length > 50) {
    actionNotice.value = '仪表盘名称不能超过 50 个字符'
    return
  }

  const createPayload = {
    ...createDraft.value,
    name: createDraft.value.name.trim(),
  }
  if (createMode.value === 'web' && !isValidWebUrl(createDraft.value.webUrl ?? '')) {
    actionNotice.value = '请输入合法的网页地址。'
    return
  }

  try {
    const dashboard = createMode.value === 'web'
      ? await analysisCenterService.createWebDashboard(createPayload)
      : await analysisCenterService.createDashboard(createPayload)
    createModalVisible.value = false
    actionNotice.value = createMode.value === 'web'
      ? `网页仪表盘「${dashboard.name}」已创建。`
      : `仪表盘「${dashboard.name}」已创建。`
    void router.push(createMode.value === 'web'
      ? `/analysis-center/dashboards/${dashboard.id}`
      : `/analysis-center/dashboards/${dashboard.id}?mode=edit`)
  } catch (error) {
    actionNotice.value = error instanceof Error ? error.message : '创建仪表盘失败。'
  }
}

const updateCreateSpace = (spaceId: string): void => {
  const space = spaces.value.find((item) => item.id === spaceId)

  createDraft.value.spaceId = spaceId
  createDraft.value.spaceType = space?.type ?? 'personal'
  createDraft.value.visibility = space?.type === 'team' ? 'team' : space?.type === 'public' ? 'public' : 'private'
}

onMounted(() => {
  void loadList()
  void loadSpaces()
  void loadTemplates()
  void loadShareMeta('dashboard', 'dash-ad-operation')
})
</script>

<template>
  <div class="page-container dashboard-home-page">
    <div class="dashboard-directory">
      <div class="directory-header">
        <div class="directory-title-block">
          <div class="directory-title-row">
            <h1>仪表盘</h1>
            <n-dropdown trigger="click" :options="createModeOptions" @select="(key) => openCreateModal(key as CreateMode)">
              <n-button size="small" type="primary" class="create-select">+ 新建</n-button>
            </n-dropdown>
          </div>
          <span>目录、文件夹、模板和默认入口</span>
        </div>
        <n-button size="small" class="template-entry-button" @click="openTemplateLibrary">模板库</n-button>
      </div>

      <n-input v-model:value="filters.keyword" clearable placeholder="搜索仪表盘 / 文件夹 / 标签" />
      <div class="directory-filters">
        <n-checkbox v-model:checked="filters.favoriteOnly">我的收藏</n-checkbox>
        <n-select v-model:value="filters.spaceType" :options="spaceTypeOptions" size="small" />
        <n-select v-model:value="filters.visibility" :options="visibilityOptions" size="small" />
      </div>

      <n-alert type="info" :show-icon="false" class="permission-tip">
        与我共享中的资源默认仅可阅览；无权限资源会自动置灰。
      </n-alert>

      <n-spin :show="loading">
        <div class="directory-sections">
          <section v-for="group in directoryGroups" :key="group.key" class="directory-section">
            <div class="section-title">
              <strong>{{ group.label }}</strong>
              <span>{{ group.help }}</span>
            </div>
            <div v-if="selectedDashboardIds.length" class="batch-bar">
              <span>已选 {{ selectedDashboardIds.length }} 个</span>
              <n-button size="tiny" @click="transferSelectedDashboards">批量转移所有者</n-button>
            </div>
            <div v-for="folder in group.folders" :key="folder.id" class="folder-node">
              <div class="folder-row">
                <span>▾ {{ folder.name }}</span>
                <n-tag size="small" :type="folder.canWrite ? 'success' : 'warning'">{{ folder.canWrite ? '可写' : '只读' }}</n-tag>
              </div>
              <div
                v-for="dashboard in getFolderDashboards(group, folder.id)"
                :key="dashboard.id"
                class="dashboard-row nested"
                :class="{ active: selectedDashboard?.id === dashboard.id, disabled: dashboard.status === 'no_permission' }"
                role="button"
                tabindex="0"
                @click="activeDashboardId = dashboard.id"
              >
                <n-checkbox
                  :checked="selectedDashboardIds.includes(dashboard.id)"
                  :disabled="!canEditDashboard(dashboard)"
                  @click.stop
                  @update:checked="(checked) => toggleDashboardSelection(dashboard, checked)"
                />
                <span class="favorite-mark" @click.stop="toggleFavorite(dashboard)">{{ dashboard.favorite ? '★' : '☆' }}</span>
                <span class="row-main">
                  <strong>{{ dashboard.name }}</strong>
                  <small>{{ dashboard.type === 'web' ? '网页仪表盘' : dashboard.publishMode === 'versioned' ? '版本发布' : '实时发布' }} · {{ dashboard.ownerName }}</small>
                </span>
                <n-tag size="small" :type="getStatusTagType(dashboard.status)">
                  {{ statusLabelMap[dashboard.status] }}
                </n-tag>
                <n-dropdown trigger="click" :options="dashboardActionOptions" @select="(key) => handleDashboardAction(String(key), dashboard)">
                  <n-button size="tiny" @click.stop>更多</n-button>
                </n-dropdown>
              </div>
            </div>
            <div
              v-for="dashboard in getGroupRootDashboards(group)"
              :key="dashboard.id"
              class="dashboard-row"
              :class="{ active: selectedDashboard?.id === dashboard.id, disabled: dashboard.status === 'no_permission' }"
              role="button"
              tabindex="0"
              @click="activeDashboardId = dashboard.id"
            >
              <n-checkbox
                :checked="selectedDashboardIds.includes(dashboard.id)"
                :disabled="!canEditDashboard(dashboard)"
                @click.stop
                @update:checked="(checked) => toggleDashboardSelection(dashboard, checked)"
              />
              <span class="favorite-mark" @click.stop="toggleFavorite(dashboard)">{{ dashboard.favorite ? '★' : '☆' }}</span>
              <span class="row-main">
                <strong>{{ dashboard.name }}</strong>
                <small>{{ dashboard.type === 'web' ? '网页仪表盘' : dashboard.publishMode === 'versioned' ? '版本发布' : '实时发布' }} · {{ dashboard.ownerName }}</small>
              </span>
              <n-tag size="small" :type="getStatusTagType(dashboard.status)">
                {{ statusLabelMap[dashboard.status] }}
              </n-tag>
              <n-dropdown trigger="click" :options="dashboardActionOptions" @select="(key) => handleDashboardAction(String(key), dashboard)">
                <n-button size="tiny" @click.stop>更多</n-button>
              </n-dropdown>
            </div>
            <n-empty v-if="!group.dashboards.length" description="暂无资源" size="small" />
          </section>
        </div>
      </n-spin>
    </div>

    <main class="dashboard-preview-pane">
      <n-alert v-if="actionNotice" type="success" :show-icon="false" class="notice-alert">
        {{ actionNotice }}
      </n-alert>

      <template v-if="selectedDashboard">
        <div class="preview-header">
          <div class="preview-title-block">
            <div class="title-row">
              <h2>{{ selectedDashboard.name }}</h2>
              <n-tag v-if="selectedDashboard.isDefaultForCurrentUser" size="small" type="success">默认</n-tag>
              <n-tag size="small" :type="getVisibilityTagType(selectedDashboard.visibility)">
                {{ visibilityLabelMap[selectedDashboard.visibility] }}
              </n-tag>
              <n-tag size="small">{{ selectedDashboard.type === 'web' ? '网页仪表盘' : '普通仪表盘' }}</n-tag>
            </div>
            <p>{{ selectedDashboard.description || '暂无描述' }}</p>
          </div>
          <div class="header-actions">
            <n-button size="small" @click="openDashboard(selectedDashboard)">阅览</n-button>
            <n-button size="small" type="primary" :disabled="!canEditDashboard(selectedDashboard)" @click="editSelectedDashboard(selectedDashboard)">
              {{ selectedDashboard.type === 'web' ? '编辑网页信息' : '编辑' }}
            </n-button>
            <n-dropdown trigger="click" :options="previewActionOptions" @select="(key) => handleSelectedDashboardAction(String(key))">
              <n-button size="small">更多操作</n-button>
            </n-dropdown>
          </div>
        </div>

        <div v-if="selectedDashboard.status === 'no_permission'" class="state-panel">
          <strong>暂无权限</strong>
          <span>该仪表盘已出现在目录中，但当前账号不能编辑或复制。请联系资源管理员授权。</span>
        </div>
        <div v-else-if="selectedDashboard.type === 'web'" class="web-preview">
          <div class="web-frame-toolbar">
            <div>
              <strong>{{ getWebUrlTypeLabel(selectedDashboard.webConfig?.url) }}</strong>
              <span>{{ selectedDashboard.webConfig?.url }}</span>
            </div>
            <code>{{ selectedDashboard.webConfig?.url }}</code>
            <n-space :size="6">
              <n-button size="small" @click="openWebPreviewUrl(selectedDashboard.webConfig?.url)">打开原网页</n-button>
              <n-tag size="small" type="warning">禁止再次嵌出</n-tag>
            </n-space>
          </div>
          <div v-if="!selectedDashboard.webConfig?.url || !isValidWebUrl(selectedDashboard.webConfig.url)" class="state-panel">
            <strong>配置错误</strong>
            <span>网页地址为空或非法，请在基础信息中重新配置。</span>
          </div>
          <div v-else class="web-frame-wrap">
            <n-alert v-if="webPreviewError" type="error" :show-icon="false" class="web-frame-warning">
              目标网页不允许嵌入或加载失败，已保留原网页打开入口。
            </n-alert>
            <iframe
              :key="selectedDashboard.webConfig.url"
              :src="selectedDashboard.webConfig.url"
              title="网页仪表盘预览"
              @load="handleWebPreviewLoad"
              @error="handleWebPreviewError"
            />
          </div>
        </div>
        <template v-else>
          <div class="inline-dashboard-viewer">
            <div class="inline-viewer-toolbar">
              <n-space>
                <n-tag size="small">阅览态</n-tag>
                <n-tag size="small">{{ selectedDashboard.publishMode === 'versioned' ? '线上发布版本' : '实时发布' }}</n-tag>
                <n-tag size="small">最近刷新 {{ formatTime(selectedDashboard.lastRefreshedAt) }}</n-tag>
              </n-space>
            </div>
            <section v-for="page in selectedVisiblePages" :key="page.id" class="inline-dashboard-page">
              <div class="inline-page-title">
                <strong>{{ page.name }}</strong>
                <n-tag size="small" type="success">当前选中仪表盘内容</n-tag>
              </div>
              <div class="inline-component-grid">
                <article
                  v-for="component in page.components"
                  :key="component.id"
                  class="inline-component"
                  :style="getComponentStyle(component)"
                >
                  <div class="inline-component-title">
                    <strong>{{ component.name }}</strong>
                    <n-tag size="small">{{ componentTypeLabels[component.type] ?? component.type }}</n-tag>
                  </div>
                  <v-chart v-if="component.type === 'chart'" class="inline-chart" :option="buildChartOption(component, selectedDashboard)" autoresize />
                  <n-data-table v-else-if="component.type === 'stitched_table'" size="small" :pagination="false" :columns="tableColumns" :data="getComponentRows(component)" />
                  <iframe v-else-if="component.type === 'web'" :src="String(component.props.url ?? 'https://example.com')" title="网页控件" />
                  <div v-else-if="component.widget?.widgetType === 'metric_card'" class="inline-metric">
                    <strong>{{ getMetricValue(component) }}</strong>
                    <span>{{ getMetricChange(component) }}</span>
                  </div>
                  <div v-else class="inline-generic-component">{{ componentTypeLabels[component.type] ?? '组件' }}</div>
                </article>
                <n-empty v-if="!page.components.length" description="当前页面暂无组件" />
              </div>
            </section>
            <n-empty v-if="!selectedVisiblePages.length" description="该仪表盘暂无可见页面" />
          </div>
        </template>

      </template>

      <n-empty v-else description="未找到匹配的仪表盘。" />
    </main>

    <n-modal v-model:show="createModalVisible" preset="card" :title="createMode === 'folder' ? '新建文件夹' : createMode === 'web' ? '新建网页仪表盘' : '新建仪表盘'" class="small-modal">
      <n-space v-if="createMode !== 'folder'" vertical>
        <n-input v-model:value="createDraft.name" maxlength="50" show-count placeholder="仪表盘名称" />
        <n-input v-model:value="createDraft.description" type="textarea" placeholder="仪表盘描述" />
        <n-select v-model:value="createDraft.folderId" :options="folderOptions" placeholder="保存路径" />
        <n-select :value="createDraft.spaceId" :options="writableSpaceOptions" placeholder="所属空间" @update:value="(value) => updateCreateSpace(String(value))" />
        <n-input v-if="createMode === 'web'" v-model:value="createDraft.webUrl" placeholder="https://example.com/report 或平台嵌出链接" />
        <n-alert v-if="createMode === 'web' && createDraft.webUrl" type="info" :show-icon="false">
          URL 类型：{{ getWebUrlTypeLabel(createDraft.webUrl) }}；创建后直接进入网页仪表盘阅览页。
        </n-alert>
        <n-select v-if="createMode !== 'web'" v-model:value="createDraft.layoutTemplate" :options="layoutTemplateOptions" placeholder="布局模板" />
        <n-select v-model:value="createDraft.visibility" :options="createVisibilityOptions" placeholder="可见范围" />
        <n-select v-model:value="createDraft.tags" :options="tagOptions" multiple tag filterable placeholder="标签" />
      </n-space>
      <n-space v-else vertical>
        <n-input v-model:value="folderDraft.name" maxlength="50" show-count placeholder="文件夹名称" />
        <n-select
          v-model:value="folderDraft.groupType"
          :options="[
            { label: '个人仪表盘', value: 'personal' },
            { label: '公共仪表盘', value: 'public' },
          ]"
        />
      </n-space>
      <template #action>
        <n-space justify="end">
          <n-button @click="createModalVisible = false">取消</n-button>
          <n-button type="primary" @click="submitCreate">创建</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="copyModalVisible" preset="card" title="复制仪表盘" class="small-modal">
      <n-space vertical>
        <n-input v-model:value="copyDraft.name" maxlength="50" show-count placeholder="副本名称" />
        <n-select v-model:value="copyDraft.targetFolderId" :options="folderOptions" placeholder="目标目录" />
        <n-select v-model:value="copyDraft.targetSpaceId" :options="writableSpaceOptions" placeholder="目标路径" />
        <n-checkbox v-model:checked="copyDraft.copyChartResources">粘贴的图表创建为新图表副本</n-checkbox>
        <n-alert type="info" :show-icon="false">
          未勾选时组件继续引用原图表；勾选后会复制图表资源，源图表变化不再影响副本。
        </n-alert>
      </n-space>
      <template #action>
        <n-space justify="end">
          <n-button @click="copyModalVisible = false">取消</n-button>
          <n-button type="primary" @click="submitCopy">复制</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="renameModalVisible" preset="card" title="基础信息 / 重命名" class="small-modal">
      <n-space vertical>
        <n-input v-model:value="renameValue" maxlength="50" show-count placeholder="请输入新名称" />
        <n-select v-model:value="folderIdValue" :options="folderOptions" placeholder="保存路径" />
        <n-input v-if="renamingDashboard?.type === 'web'" v-model:value="webUrlValue" placeholder="网页地址 URL" />
        <n-alert v-if="renamingDashboard?.type === 'web' && webUrlValue" type="info" :show-icon="false">
          URL 类型：{{ getWebUrlTypeLabel(webUrlValue) }}；网页仪表盘不会进入普通编辑器。
        </n-alert>
        <n-select v-if="renamingDashboard" v-model:value="renamingDashboard.tags" :options="tagOptions" multiple tag filterable placeholder="标签" />
        <div class="modal-inline-action">
          <n-alert type="info" :show-icon="false">标签用于分类和识别；项目管理员可在标签管理中维护标签。</n-alert>
          <n-button size="small" @click="openTagManager">标签管理</n-button>
        </div>
      </n-space>
      <template #action>
        <n-space justify="end">
          <n-button @click="renameModalVisible = false">取消</n-button>
          <n-button type="primary" @click="submitRename">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="statisticsModalVisible" preset="card" title="访问统计" class="medium-modal">
      <div class="stats-modal-grid">
        <div><span>访问次数</span><strong>1,284</strong></div>
        <div><span>访问用户数</span><strong>86</strong></div>
        <div><span>最近访问</span><strong>{{ currentStatisticsDashboard ? formatTime(currentStatisticsDashboard.updatedAt) : '-' }}</strong></div>
      </div>
      <n-data-table
        size="small"
        :pagination="false"
        :columns="[
          { title: '访问用户', key: 'user' },
          { title: '访问时间', key: 'time' },
          { title: '来源', key: 'source' },
        ]"
        :data="[
          { user: 'Mia Chen', time: '2026-05-24 10:20', source: '分享链接' },
          { user: 'Yuki Tan', time: '2026-05-24 09:42', source: '订阅消息' },
          { user: 'Chaoyang Xu', time: '2026-05-23 18:15', source: '目录打开' },
        ]"
      />
      <template #action>
        <n-space justify="end">
          <n-button @click="currentStatisticsDashboard && requestMove(currentStatisticsDashboard)">移动资源</n-button>
          <n-button type="error" secondary @click="currentStatisticsDashboard && requestDelete(currentStatisticsDashboard)">删除资源</n-button>
          <n-button>下载访问数据</n-button>
          <n-button @click="statisticsModalVisible = false">关闭</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="redirectModalVisible" preset="card" title="设置重定向" class="small-modal">
      <n-space vertical>
        <n-checkbox v-model:checked="redirectDraft.enabled">启用查看态重定向</n-checkbox>
        <n-input v-model:value="redirectDraft.url" placeholder="https://example.com/new-dashboard" />
        <n-alert type="warning" :show-icon="false">只对查看态 URL 生效，编辑态、三方嵌出和移动端访问不会重定向。</n-alert>
      </n-space>
      <template #action>
        <n-space justify="end">
          <n-button @click="redirectModalVisible = false">取消</n-button>
          <n-button type="primary" @click="submitRedirect">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="transferModalVisible" preset="card" title="转移所有者" class="small-modal">
      <n-space vertical>
        <n-select v-model:value="transferOwnerId" :options="shareMemberOptions" filterable placeholder="搜索用户名、姓名或邮箱" />
        <n-alert type="info" :show-icon="false">转移后新 Owner 拥有管理权限，原 Owner 默认保留管理员权限。</n-alert>
      </n-space>
      <template #action>
        <n-space justify="end">
          <n-button @click="transferModalVisible = false">取消</n-button>
          <n-button type="primary" @click="submitTransfer">确认转移</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="moveModalVisible" preset="card" title="移动仪表盘" class="small-modal">
      <n-space vertical>
        <n-alert type="info" :show-icon="false">资源 ID 和原访问链接保持不变；与我共享资源不可移动。</n-alert>
        <n-input :value="movingDashboard?.name" readonly />
        <n-select v-model:value="moveFolderId" :options="folderOptions" placeholder="目标文件夹" />
      </n-space>
      <template #action>
        <n-space justify="end">
          <n-button @click="moveModalVisible = false">取消</n-button>
          <n-button type="primary" @click="submitMove">确认移动</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="deleteConfirmVisible" preset="card" title="删除确认" class="small-modal">
      <n-space vertical>
        <n-alert type="warning" :show-icon="false">
          确认删除「{{ deletingDashboard?.name }}」？删除后进入回收站，原链接展示“资源已删除或已回收”，引用图表资源不会被删除。
        </n-alert>
      </n-space>
      <template #action>
        <n-space justify="end">
          <n-button @click="deleteConfirmVisible = false">取消</n-button>
          <n-button type="error" @click="submitDelete">确认删除</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="tagManagerModalVisible" preset="card" title="标签管理" class="small-modal">
      <n-space vertical>
        <div class="tag-create-row">
          <n-input v-model:value="newTagName" placeholder="新标签名称" />
          <n-button type="primary" @click="submitCreateTag">新建标签</n-button>
        </div>
        <div class="tag-manager-list">
          <div v-for="tag in availableTags" :key="tag" class="tag-manager-row">
            <n-tag>{{ tag }}</n-tag>
            <n-button size="small" type="error" secondary @click="submitDeleteTag(tag)">删除并解绑</n-button>
          </div>
        </div>
      </n-space>
      <template #action>
        <n-space justify="end">
          <n-button @click="tagManagerModalVisible = false">关闭</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="templateLibraryVisible" preset="card" title="仪表盘模板" class="large-modal">
      <div class="template-library-head">
        <span>导入、导出和应用模板会复用仪表盘结构、布局、样式与部分配置。</span>
        <n-button type="primary" @click="openImportTemplate">导入模板</n-button>
      </div>
      <div class="template-grid">
        <article v-for="template in templates" :key="template.id" class="template-card">
          <div class="template-cover">
            {{ getTemplateScopeLabel(template.scope) }}
          </div>
          <div class="template-body">
            <div class="template-title-row">
              <strong>{{ template.name }}</strong>
              <n-tag size="small">{{ getTemplateScopeLabel(template.scope) }}</n-tag>
            </div>
            <p>{{ template.description }}</p>
            <small>{{ template.createdBy }} · {{ formatTime(template.createdAt) }}</small>
            <code>{{ template.resourcePackageUrl }}</code>
          </div>
          <n-button type="primary" secondary @click="requestApplyTemplate(template)">应用模板</n-button>
        </article>
      </div>
      <template #action>
        <n-space justify="end">
          <n-button @click="templateLibraryVisible = false">关闭</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="importTemplateModalVisible" preset="card" title="导入模板" class="small-modal">
      <n-space vertical>
        <n-input v-model:value="templateImportDraft.packageName" placeholder="模板资源包，例如 operation.dashboard-template.zip" />
        <n-select v-model:value="templateImportDraft.targetFolderId" :options="folderOptions" placeholder="目标目录" />
        <n-alert type="info" :show-icon="false">系统会校验模板包格式、仪表盘结构描述以及图表、图片、主题等资源完整性。</n-alert>
      </n-space>
      <template #action>
        <n-space justify="end">
          <n-button @click="importTemplateModalVisible = false">取消</n-button>
          <n-button type="primary" @click="submitImportTemplate">确认导入</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="exportTemplateModalVisible" preset="card" title="导出为模板" class="small-modal">
      <n-space vertical>
        <n-alert type="info" :show-icon="false">导出对象：{{ exportingDashboard?.name }}</n-alert>
        <n-input v-model:value="templateExportDraft.name" maxlength="50" show-count placeholder="模板名称" />
        <n-input v-model:value="templateExportDraft.description" type="textarea" placeholder="模板描述" />
        <n-checkbox v-model:checked="templateExportDraft.desensitizeSampleData">对数据样例进行脱敏</n-checkbox>
        <n-checkbox v-model:checked="templateExportDraft.saveToLibrary">保存到项目模板库</n-checkbox>
      </n-space>
      <template #action>
        <n-space justify="end">
          <n-button @click="exportTemplateModalVisible = false">取消</n-button>
          <n-button type="primary" @click="submitExportTemplate">导出</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="applyTemplateModalVisible" preset="card" title="应用模板" class="small-modal">
      <n-space vertical>
        <n-alert type="info" :show-icon="false">模板：{{ applyingTemplate?.name }}。应用后会生成新的独立仪表盘。</n-alert>
        <n-input v-model:value="templateApplyDraft.name" maxlength="50" show-count placeholder="新仪表盘名称" />
        <n-select v-model:value="templateApplyDraft.targetFolderId" :options="folderOptions" placeholder="目标目录" />
        <n-select v-model:value="templateApplyDraft.datasetId" :options="datasetReplacementOptions" placeholder="替换数据集占位符" />
      </n-space>
      <template #action>
        <n-space justify="end">
          <n-button @click="applyTemplateModalVisible = false">取消</n-button>
          <n-button type="primary" @click="submitApplyTemplate">应用模板</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="spaceModalVisible" preset="card" title="空间管理" class="space-modal">
      <n-space vertical>
        <div class="space-create-grid">
          <n-input v-model:value="spaceDraft.name" placeholder="空间名称" />
          <n-select
            v-model:value="spaceDraft.type"
            :options="[
              { label: '个人空间', value: 'personal' },
              { label: '团队空间', value: 'team' },
              { label: '公共空间', value: 'public', disabled: true },
            ]"
          />
          <n-button type="primary" block @click="submitCreateSpace">创建空间</n-button>
          <n-input v-model:value="spaceDraft.description" placeholder="空间说明" />
        </div>

        <div v-for="space in spaces" :key="space.id" class="space-row">
          <div>
            <strong>{{ space.name }}</strong>
            <span>{{ space.type === 'team' ? '团队空间' : space.type === 'public' ? '公共空间' : '个人空间' }} · {{ space.assetCount }} 个资产 · {{ space.ownerName }}</span>
          </div>
          <n-space>
            <n-input v-if="editingSpaceId === space.id" v-model:value="editingSpaceName" size="small" placeholder="新空间名称" />
            <n-button v-if="editingSpaceId === space.id" size="small" type="primary" @click="submitRenameSpace">保存</n-button>
            <n-button v-else size="small" :disabled="!space.canWrite" @click="startRenameSpace(space)">重命名</n-button>
            <n-button size="small" type="error" secondary :disabled="!space.canDelete || space.assetCount > 0" @click="deleteSpace(space)">删除</n-button>
          </n-space>
        </div>
      </n-space>
    </n-modal>

    <n-modal v-model:show="shareModalVisible" preset="card" title="授权分享" class="small-modal">
      <n-space vertical>
        <n-alert type="info" :show-icon="false">
          分享对象：{{ sharingDashboard?.name }}
        </n-alert>
        <n-select v-model:value="shareDraft.visibility" :options="createVisibilityOptions" placeholder="可见范围" />
        <n-select v-model:value="shareDraft.targetSpaceId" :options="writableSpaceOptions" placeholder="目标空间" />
        <n-select v-model:value="shareDraft.permissionRole" :options="permissionRoleOptions" placeholder="权限级别" />
        <n-checkbox v-model:checked="shareDraft.notifyEnabled">发送飞书通知</n-checkbox>
        <n-select v-model:value="shareDraft.addMemberIds" :options="shareMemberOptions" multiple filterable clearable placeholder="添加成员" />
        <n-select v-model:value="shareDraft.addTeamIds" :options="shareTeamOptions" multiple filterable clearable placeholder="添加团队" />
        <div class="share-current">
          <span>当前授权</span>
          <n-tag v-for="member in sharedMembers" :key="member.id" size="small">{{ member.name }}</n-tag>
          <n-tag v-for="team in sharedTeams" :key="team.id" size="small" type="info">{{ team.name }}</n-tag>
        </div>
        <n-select v-model:value="shareDraft.removeMemberIds" :options="currentSharedMemberOptions" multiple clearable placeholder="移除成员授权" />
        <n-select v-model:value="shareDraft.removeTeamIds" :options="currentSharedTeamOptions" multiple clearable placeholder="移除团队授权" />
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
.dashboard-home-page {
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  gap: 16px;
  min-height: calc(100vh - 100px);
}

.dashboard-directory,
.dashboard-preview-pane {
  min-width: 0;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.dashboard-directory {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.directory-header,
.preview-header,
.page-preview-title,
.space-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.directory-title-block,
.preview-title-block {
  display: grid;
  min-width: 0;
  gap: 8px;
}

.directory-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.directory-header h1,
.preview-header h2 {
  margin: 0;
  color: #111827;
  font-size: 22px;
  line-height: 1.25;
}

.directory-header span,
.preview-header p,
.section-title span,
.space-row span {
  color: #6b7280;
  font-size: 12px;
}

.header-actions {
  display: flex;
  flex-wrap: nowrap;
  justify-content: flex-end;
  gap: 8px;
  min-width: max-content;
}

.create-select {
  min-width: 112px;
}

.template-entry-button {
  flex: none;
}

.directory-filters {
  display: grid;
  grid-template-columns: 96px 1fr 1fr;
  gap: 8px;
  align-items: center;
}

.permission-tip {
  margin: 0;
}

.directory-sections {
  display: grid;
  gap: 14px;
  overflow: auto;
  padding-right: 2px;
}

.directory-section {
  display: grid;
  gap: 8px;
}

.section-title {
  display: grid;
  gap: 3px;
  padding-top: 6px;
}

.folder-row,
.dashboard-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 42px;
  padding: 8px 10px;
  border: 1px solid #eef2f7;
  border-radius: 8px;
  background: #f8fafc;
}

.folder-node {
  display: grid;
  gap: 6px;
}

.batch-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 12px;
}

.dashboard-row {
  cursor: pointer;
  color: #1f2937;
  text-align: left;
}

.dashboard-row.nested {
  margin-left: 14px;
  width: calc(100% - 14px);
  background: #fff;
}

.dashboard-row.active {
  border-color: #18a058;
  background: #ecfdf3;
}

.dashboard-row.disabled {
  opacity: 0.58;
}

.favorite-mark {
  width: 18px;
  color: #f59e0b;
  font-size: 16px;
}

.row-main {
  display: grid;
  flex: 1;
  min-width: 0;
  gap: 3px;
}

.row-main strong,
.row-main small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-main small {
  color: #6b7280;
}

.dashboard-preview-pane {
  display: grid;
  align-content: start;
  gap: 16px;
  padding: 18px;
}

.notice-alert {
  margin: 0;
}

.title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.state-panel {
  display: grid;
  gap: 8px;
  min-height: 220px;
  place-content: center;
  border: 1px dashed #f59e0b;
  border-radius: 8px;
  background: #fffbeb;
  color: #92400e;
  text-align: center;
}

.web-preview {
  display: grid;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.web-frame-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  background: #f8fafc;
  color: #4b5563;
  font-size: 12px;
}

.web-frame-toolbar > div:first-child {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.web-frame-toolbar > div:first-child span {
  overflow: hidden;
  color: #6b7280;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.web-frame-toolbar code {
  overflow: hidden;
  max-width: 560px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.web-frame-wrap {
  position: relative;
  min-height: 680px;
  background: #fff;
}

.web-frame-warning {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 1;
  width: min(520px, calc(100% - 24px));
}

.web-preview iframe,
.web-frame-wrap iframe {
  width: 100%;
  height: 680px;
  border: 0;
  background: #fff;
}

.stats-modal-grid div {
  display: grid;
  gap: 6px;
  padding: 12px;
  border: 1px solid #edf0f5;
  border-radius: 8px;
  background: #f8fafc;
}

.stats-modal-grid span {
  color: #6b7280;
  font-size: 12px;
}

.stats-modal-grid strong {
  color: #111827;
  font-size: 18px;
}

.inline-dashboard-viewer {
  display: grid;
  gap: 14px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}

.inline-viewer-toolbar,
.inline-page-title,
.inline-component-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.inline-dashboard-page {
  display: grid;
  gap: 12px;
}

.inline-component-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.inline-component {
  display: grid;
  gap: 10px;
  min-height: 220px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.inline-chart {
  min-height: 220px;
}

.inline-component iframe {
  width: 100%;
  min-height: 220px;
  border: 0;
}

.inline-metric {
  display: grid;
  align-content: center;
  gap: 8px;
  min-height: 170px;
}

.inline-metric strong {
  color: #111827;
  font-size: 34px;
}

.inline-metric span {
  width: fit-content;
  padding: 5px 8px;
  border-radius: 6px;
  background: #ecfdf3;
  color: #16a34a;
  font-weight: 700;
}

.inline-generic-component {
  display: grid;
  min-height: 170px;
  place-content: center;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  color: #64748b;
}

.stats-modal-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.modal-inline-action {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: start;
}

.tag-create-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.tag-manager-list {
  display: grid;
  gap: 8px;
}

.tag-manager-row,
.template-library-head,
.template-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.large-modal {
  width: 980px;
}

.template-library-head {
  margin-bottom: 14px;
  color: #6b7280;
  font-size: 13px;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.template-card {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr);
  gap: 12px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.template-card > button {
  grid-column: 1 / -1;
}

.template-cover {
  display: grid;
  min-height: 132px;
  place-items: center;
  border-radius: 8px;
  background: #eef7f1;
  color: #166534;
  font-weight: 700;
}

.template-body {
  display: grid;
  gap: 7px;
  min-width: 0;
}

.template-body p,
.template-body small,
.template-body code {
  margin: 0;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.6;
}

.template-body code {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.space-create-grid {
  display: grid;
  grid-template-columns: 1fr 160px 120px;
  gap: 10px;
}

.space-create-grid > :last-child {
  grid-column: 1 / -1;
}

.space-modal {
  width: 720px;
}

.medium-modal {
  width: 780px;
}

.space-row {
  align-items: center;
  padding: 12px;
  border: 1px solid #edf0f5;
  border-radius: 8px;
}

.space-row div:first-child {
  display: grid;
  gap: 4px;
}

.share-current {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  color: #6b7280;
  font-size: 12px;
}
</style>
