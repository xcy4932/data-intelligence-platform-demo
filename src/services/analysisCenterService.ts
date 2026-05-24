import {
  mockAnalysisCenterSpaces,
  mockDashboardAssets,
  mockRecentVisitItems,
  mockRecycleBinItems,
  mockSavedAnalysisAssets,
} from '@/mock/analysisCenter'
import type {
  AnalysisCenterAssetItem,
  AnalysisCenterSpace,
  DashboardComponent,
  DashboardAsset,
  DashboardCopyPayload,
  DashboardCreatePayload,
  DashboardFilters,
  DashboardFolder,
  DashboardFolderCreatePayload,
  DashboardGlobalFilter,
  DashboardEditLock,
  DashboardListResult,
  DashboardPage,
  DashboardSettings,
  DashboardTemplate,
  DashboardTemplateApplyPayload,
  DashboardTemplateExportPayload,
  DashboardTemplateImportPayload,
  DashboardWebConfig,
  DashboardWidgetAsset,
  SavedAnalysisAsset,
  SavedAnalysisFilters,
  SavedAnalysisListResult,
  SavedAnalysisStats,
  ShareAssetPayload,
  ShareOptions,
  SharePrincipal,
  ShareAssetResult,
  SpaceCreatePayload,
} from '@/types/analysisCenter'

const MOCK_DELAY = 250
let savedAnalysisAssets = [...mockSavedAnalysisAssets]
let dashboardAssets = [...mockDashboardAssets]
let recentVisitItems = [...mockRecentVisitItems]
let recycleBinItems = [...mockRecycleBinItems]
let spaces = [...mockAnalysisCenterSpaces]
let defaultDashboardId = 'dash-ad-operation'
let deletedDashboardMap: Record<string, DashboardAsset> = {}
let dashboardEditLocks: Record<string, DashboardEditLock> = {}
let dashboardFolders: DashboardFolder[] = [
  {
    id: 'folder-personal-growth',
    name: '个人增长复盘',
    groupType: 'personal',
    canWrite: true,
    createdAt: '2026-05-12T10:00:00+02:00',
  },
  {
    id: 'folder-public-operation',
    name: '公共经营仪表盘',
    groupType: 'public',
    canWrite: true,
    createdAt: '2026-05-10T10:00:00+02:00',
  },
]
let dashboardTemplates: DashboardTemplate[] = [
  {
    id: 'tpl-official-operation',
    projectId: 'project-dataops-demo',
    name: '运营监控标准模板',
    description: '内置指标卡、趋势图、分布图和明细表，适合日常经营监控。',
    scope: 'official',
    resourcePackageUrl: '/template-packages/operation-monitoring.dashboard-template.zip',
    layoutTemplate: 'operation_monitoring',
    requiresDatasetMapping: true,
    createdBy: '系统模板',
    createdAt: '2026-05-01T09:00:00+02:00',
  },
  {
    id: 'tpl-project-retention',
    projectId: 'project-dataops-demo',
    name: '新用户留存复盘模板',
    description: '面向新用户留存和激励实验复盘，包含留存趋势、分群和结论区。',
    scope: 'project',
    resourcePackageUrl: '/template-packages/user-retention.dashboard-template.zip',
    layoutTemplate: 'retention_analysis',
    requiresDatasetMapping: true,
    createdBy: 'Mia Chen',
    createdAt: '2026-05-12T11:00:00+02:00',
  },
]
const shareMembers: SharePrincipal[] = [
  { id: 'u_chaoyang', name: 'Chaoyang Xu', description: '数据产品负责人' },
  { id: 'u_mia', name: 'Mia Chen', description: '运营分析师' },
  { id: 'u_yuki', name: 'Yuki Tan', description: '增长运营' },
  { id: 'u_alan', name: 'Alan Zhou', description: '数据工程师' },
]
const shareTeams: SharePrincipal[] = [
  { id: 'team-operation', name: '运营团队', description: '负责活动、分群和任务触达' },
  { id: 'team-data', name: '数据分析团队', description: '负责分析模型和指标体系' },
  { id: 'team-growth', name: '增长团队', description: '负责新用户和付费转化' },
]
let shareGrantMap: Record<string, { memberIds: string[], teamIds: string[] }> = {
  'saved_analysis:analysis-ad-watch-drop': {
    memberIds: ['u_mia'],
    teamIds: ['team-operation'],
  },
  'dashboard:dash-ad-operation': {
    memberIds: ['u_mia', 'u_yuki'],
    teamIds: ['team-operation'],
  },
}

const resolveMock = <T>(payload: T): Promise<T> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(payload), MOCK_DELAY)
  })

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const currentEditorUser = {
  userId: 'u_chaoyang',
  userName: 'Chaoyang Xu',
}

const buildEditLock = (dashboardId: string): DashboardEditLock => {
  const now = new Date()
  const expireAt = new Date(now.getTime() + 90_000).toISOString()

  return {
    dashboardId,
    userId: currentEditorUser.userId,
    userName: currentEditorUser.userName,
    lockedAt: now.toISOString(),
    heartbeatAt: now.toISOString(),
    expireAt,
    lockExpireAt: expireAt,
  }
}

const getDefaultSettings = (): DashboardSettings => ({
  themeId: 'light',
  layoutMode: 'tile',
  canvasBackground: {
    color: '#f7f9fc',
    opacity: 100,
  },
  canvasSize: {
    mode: 'adaptive',
    width: 1440,
    height: 900,
  },
  viewMode: {
    anchorDefaultExpanded: true,
    toolbarGlobalControlEnabled: true,
    tooltipIconGlobalControlEnabled: true,
    toolbarDefaultCollapsed: false,
    visibleToolbarActions: ['refresh', 'fullscreen', 'bookmark', 'export', 'embed'],
    visibleTooltipIcons: ['comment', 'quick_query', 'monitor', 'linkage'],
    adaptiveWidthMode: 'scale_width_only',
  },
  autoRefresh: {
    enabled: false,
    intervalSeconds: 300,
  },
  commentAdvanced: {
    enabled: true,
  },
  mobileLayout: {
    enabled: false,
  },
  padding: {
    top: 16,
    right: 16,
    bottom: 16,
    left: 16,
  },
  appearance: {
    fillColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 8,
    autoAdaptComponentColor: true,
  },
})

const inferWebUrlType = (url: string): DashboardWebConfig['urlType'] => {
  if (url.includes('/analysis-center/dashboards/') || url.includes('/dashboard/')) {
    return 'dashboard_embed'
  }

  if (/feishu|larksuite|docs\.qq|yuque|notion/i.test(url)) {
    return 'cloud_doc'
  }

  return 'external_web'
}

const assertValidWebUrl = (url: string): void => {
  try {
    const nextUrl = new URL(url)

    if (!['http:', 'https:'].includes(nextUrl.protocol)) {
      throw new Error('invalid protocol')
    }
  } catch {
    throw new Error('请输入合法的网页地址')
  }
}

const buildWebConfig = (url: string, previousConfig?: DashboardWebConfig): DashboardWebConfig => {
  const urlType = inferWebUrlType(url)

  return {
    url,
    urlType,
    carryToken: urlType === 'dashboard_embed',
    iframeSandbox: previousConfig?.iframeSandbox ?? ['allow-scripts', 'allow-same-origin', 'allow-forms'],
    originalDashboardId: url.match(/dash-[a-z0-9-]+/i)?.[0],
    allowInteraction: previousConfig?.allowInteraction ?? true,
    allowEditEmbeddedContent: false,
  }
}

const getFolderSpace = (folderId?: string): AnalysisCenterSpace | undefined => {
  const folder = dashboardFolders.find((item) => item.id === folderId)

  if (!folder) {
    return undefined
  }

  return folder.groupType === 'public' ? findSpace('space-public') : findSpace('space-personal')
}

const assertDashboardNameAvailable = (name: string, folderId?: string, ignoredId?: string): void => {
  const hasDuplicate = dashboardAssets.some(
    (dashboard) =>
      dashboard.id !== ignoredId &&
      dashboard.status !== 'deleted' &&
      (dashboard.folderId ?? '') === (folderId ?? '') &&
      dashboard.name === name,
  )

  if (hasDuplicate) {
    throw new Error('同目录下已存在同名仪表盘')
  }
}

const widgetToComponent = (
  dashboardId: string,
  pageId: string,
  widget: DashboardWidgetAsset,
  index: number,
): DashboardComponent => ({
  id: `${widget.id}_component`,
  dashboardId,
  pageId,
  type: widget.widgetType === 'table' ? 'stitched_table' : 'chart',
  name: widget.title,
  order: index,
  zIndex: index + 1,
  layout: {
    x: index % 2,
    y: Math.floor(index / 2),
    width: widget.widgetType === 'table' || widget.widgetType === 'line' ? 2 : 1,
    height: widget.widgetType === 'metric_card' ? 1 : 2,
    floating: false,
    minWidth: 1,
    minHeight: 1,
  },
  visible: true,
  props: {
    description: widget.description ?? '',
    chartType: widget.widgetType,
    datasetId: index % 2 === 0 ? 'ds_ad_watch_detail' : 'ds_user_retention',
    drillPath: ['大区', '省份', '城市'],
    linkageTargets: [],
    jumpTemplate: 'https://www.baidu.com/s?wd={省份}',
    monitorable: widget.widgetType === 'line' || widget.widgetType === 'bar' || widget.widgetType === 'table',
  },
  widget,
  createdAt: widget.lastRefreshAt ?? new Date().toISOString(),
  updatedAt: widget.lastRefreshAt ?? new Date().toISOString(),
})

const ensureDashboardRuntime = (dashboard: DashboardAsset): DashboardAsset => {
  const now = new Date().toISOString()
  dashboard.projectId = dashboard.projectId ?? 'project-dataops-demo'
  dashboard.type = dashboard.type ?? 'normal'
  dashboard.groupType = dashboard.groupType ?? (dashboard.spaceType === 'public' ? 'public' : dashboard.ownerId === 'u_chaoyang' ? 'personal' : 'shared')
  dashboard.folderId = dashboard.folderId ?? (dashboard.groupType === 'public' ? 'folder-public-operation' : 'folder-personal-growth')
  dashboard.publishMode = dashboard.publishMode ?? (dashboard.id === 'dash-experiment-review' ? 'versioned' : 'realtime')
  dashboard.isDefaultForCurrentUser = dashboard.id === defaultDashboardId
  dashboard.settings = dashboard.settings ?? getDefaultSettings()
  dashboard.bookmarks = dashboard.bookmarks ?? [
    {
      id: `${dashboard.id}_bookmark_default`,
      name: '低金币用户筛选',
      scope: 'private',
      filterState: { time_range: 'last_14_days', user_segment: 'low_coin' },
      activePageId: `${dashboard.id}_page_main`,
      createdBy: 'Chaoyang Xu',
      createdAt: now,
    },
  ]
  dashboard.comments = dashboard.comments ?? []
  dashboard.subscriptions = dashboard.subscriptions ?? []
  dashboard.monitors = dashboard.monitors ?? []
  dashboard.versions = dashboard.versions ?? []
  dashboard.announcementConfig = dashboard.announcementConfig ?? {
    enabled: dashboard.id === 'dash-ad-operation',
    content: '广告观看次数连续下滑，运营团队已进入定位阶段。',
  }
  dashboard.multiLangConfig = dashboard.multiLangConfig ?? {
    enabled: false,
    locale: 'zh-CN',
    names: {
      'zh-CN': dashboard.name,
      'en-US': dashboard.name,
    },
  }

  if (!dashboard.pages?.length) {
    const pageId = `${dashboard.id}_page_main`
    dashboard.pages = [
      {
        id: pageId,
        dashboardId: dashboard.id,
        name: '总览',
        order: 0,
        visibleInViewMode: true,
        layoutMode: 'inherit',
        components: dashboard.widgets.map((widget, index) => widgetToComponent(dashboard.id, pageId, widget, index)),
        createdAt: dashboard.createdAt,
        updatedAt: dashboard.updatedAt,
      },
      {
        id: `${dashboard.id}_page_detail`,
        dashboardId: dashboard.id,
        name: '明细',
        order: 1,
        visibleInViewMode: true,
        layoutMode: 'inherit',
        components: [],
        createdAt: dashboard.createdAt,
        updatedAt: dashboard.updatedAt,
      },
    ]
  }

  if (!dashboard.publishedPages?.length) {
    dashboard.publishedPages = clone(dashboard.pages)
  }

  return dashboard
}

dashboardAssets = dashboardAssets.map((dashboard, index) => {
  const enriched = ensureDashboardRuntime(dashboard)
  if (index === 1) {
    enriched.groupType = 'shared'
    enriched.spaceType = 'team'
    enriched.visibility = 'team'
  }
  return enriched
})

const getStats = (items: SavedAnalysisAsset[]): SavedAnalysisStats => ({
  total: items.length,
  event: items.filter((item) => item.analysisType === 'event').length,
  retention: items.filter((item) => item.analysisType === 'retention').length,
  funnel: items.filter((item) => item.analysisType === 'funnel').length,
  invalid: items.filter((item) => item.status === 'invalid').length,
})

const findSpace = (spaceId: string): AnalysisCenterSpace | undefined => spaces.find((space) => space.id === spaceId)

const refreshSpaceAssetCounts = (): void => {
  spaces = spaces.map((space) => ({
    ...space,
    assetCount:
      savedAnalysisAssets.filter((item) => item.spaceId === space.id).length +
      dashboardAssets.filter((item) => item.spaceId === space.id).length,
  }))
}

const isWithinUpdatedRange = (updatedAt: string, filter: SavedAnalysisFilters['updatedAt']): boolean => {
  if (filter === 'all') {
    return true
  }

  const updatedDate = new Date(updatedAt).getTime()
  const currentDate = new Date('2026-05-18T23:59:59+02:00').getTime()
  const days = Math.floor((currentDate - updatedDate) / 86400000)

  if (filter === 'today') {
    return days <= 0
  }

  if (filter === 'last_7_days') {
    return days <= 7
  }

  return days <= 30
}

const sortItems = (
  items: SavedAnalysisAsset[],
  sortMode: SavedAnalysisFilters['sortMode'],
): SavedAnalysisAsset[] => {
  const nextItems = [...items]

  if (sortMode === 'updated_asc') {
    return nextItems.sort((itemA, itemB) => itemA.updatedAt.localeCompare(itemB.updatedAt))
  }

  if (sortMode === 'name_asc') {
    return nextItems.sort((itemA, itemB) => itemA.name.localeCompare(itemB.name, 'zh-CN'))
  }

  return nextItems.sort((itemA, itemB) => itemB.updatedAt.localeCompare(itemA.updatedAt))
}

export const getSavedAnalysisList = (filters: SavedAnalysisFilters): Promise<SavedAnalysisListResult> => {
  const keyword = filters.keyword.trim().toLowerCase()
  const filteredItems = savedAnalysisAssets.filter((item) => {
    const matchesKeyword =
      !keyword ||
      item.name.toLowerCase().includes(keyword) ||
      item.description?.toLowerCase().includes(keyword) ||
      item.ownerName.toLowerCase().includes(keyword) ||
      item.tags.some((tag) => tag.toLowerCase().includes(keyword))
    const matchesType = filters.analysisType === 'all' || item.analysisType === filters.analysisType
    const matchesVisibility = filters.visibility === 'all' || item.visibility === filters.visibility
    const matchesOwner =
      filters.owner === 'all' ||
      (filters.owner === 'me' && item.ownerId === 'u_chaoyang') ||
      (filters.owner === 'team' && item.ownerId !== 'u_chaoyang')
    const matchesTags =
      filters.tags.length === 0 || filters.tags.some((tag) => item.tags.includes(tag))
    const matchesUpdatedAt = isWithinUpdatedRange(item.updatedAt, filters.updatedAt)
    const matchesStatus = filters.status === 'all' || item.status === filters.status

    return (
      matchesKeyword &&
      matchesType &&
      matchesVisibility &&
      matchesOwner &&
      matchesTags &&
      matchesUpdatedAt &&
      matchesStatus
    )
  })

  const tags = Array.from(new Set(savedAnalysisAssets.flatMap((item) => item.tags)))

  return resolveMock({
    stats: getStats(savedAnalysisAssets),
    items: sortItems(filteredItems, filters.sortMode),
    tags,
  })
}

export const duplicateSavedAnalysis = async (id: string): Promise<SavedAnalysisAsset> => {
  const source = savedAnalysisAssets.find((item) => item.id === id)

  if (!source) {
    throw new Error('保存分析不存在')
  }

  const duplicated: SavedAnalysisAsset = {
    ...source,
    id: `${source.id}_copy_${Date.now()}`,
    name: `${source.name} 副本`,
    ownerId: 'u_chaoyang',
    ownerName: 'Chaoyang Xu',
    visibility: 'private',
    spaceId: 'space-personal',
    spaceName: '个人空间',
    favorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  }
  savedAnalysisAssets = [duplicated, ...savedAnalysisAssets]

  return resolveMock(duplicated)
}

export const deleteSavedAnalysis = async (id: string): Promise<{ success: boolean, message: string }> => {
  const target = savedAnalysisAssets.find((item) => item.id === id)
  savedAnalysisAssets = savedAnalysisAssets.filter((item) => item.id !== id)

  if (target) {
    recycleBinItems = [
      {
        id: `recycle_${target.id}_${Date.now()}`,
        assetId: target.id,
        assetName: target.name,
        assetType: 'saved_analysis',
        moduleName: target.analysisType === 'event' ? '事件分析' : '分析模块',
        description: target.description ?? target.summary,
        ownerName: target.ownerName,
        tags: target.tags,
        deletedAt: new Date().toISOString(),
        expireAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        originalLocation: `${target.spaceName} / ${target.folderName}`,
        deletedByName: 'Chaoyang Xu',
      },
      ...recycleBinItems,
    ]
  }

  return resolveMock({
    success: true,
    message: target ? `已删除「${target.name}」` : '已删除保存分析',
  })
}

export const toggleSavedAnalysisFavorite = async (id: string): Promise<SavedAnalysisAsset> => {
  const target = savedAnalysisAssets.find((item) => item.id === id)

  if (!target) {
    throw new Error('保存分析不存在')
  }

  target.favorite = !target.favorite

  return resolveMock(target)
}

export const renameSavedAnalysis = async (
  id: string,
  name: string,
): Promise<SavedAnalysisAsset> => {
  const target = savedAnalysisAssets.find((item) => item.id === id)

  if (!target) {
    throw new Error('保存分析不存在')
  }

  target.name = name
  target.updatedAt = new Date().toISOString()

  return resolveMock(target)
}

export const moveSavedAnalysisToSpace = async (
  id: string,
  spaceId: string,
): Promise<SavedAnalysisAsset> => {
  const target = savedAnalysisAssets.find((item) => item.id === id)
  const space = findSpace(spaceId)

  if (!target || !space) {
    throw new Error('保存分析或空间不存在')
  }

  target.spaceId = space.id
  target.spaceName = space.name
  target.visibility = space.type === 'team' ? 'team' : space.type === 'public' ? 'public' : 'private'
  target.updatedAt = new Date().toISOString()
  refreshSpaceAssetCounts()

  return resolveMock(target)
}

const isDashboardWithinUpdatedRange = (updatedAt: string, filter: DashboardFilters['updatedAt']): boolean => {
  if (filter === 'all') {
    return true
  }

  const updatedDate = new Date(updatedAt).getTime()
  const currentDate = new Date('2026-05-18T23:59:59+02:00').getTime()
  const days = Math.floor((currentDate - updatedDate) / 86400000)

  if (filter === 'today') {
    return days <= 0
  }

  if (filter === 'last_7_days') {
    return days <= 7
  }

  return days <= 30
}

const sortDashboards = (items: DashboardAsset[], sortMode: DashboardFilters['sortMode']): DashboardAsset[] => {
  const nextItems = [...items]

  if (sortMode === 'updated_asc') {
    return nextItems.sort((itemA, itemB) => itemA.updatedAt.localeCompare(itemB.updatedAt))
  }

  if (sortMode === 'name_asc') {
    return nextItems.sort((itemA, itemB) => itemA.name.localeCompare(itemB.name, 'zh-CN'))
  }

  return nextItems.sort((itemA, itemB) => itemB.updatedAt.localeCompare(itemA.updatedAt))
}

export const getDashboardList = (filters: DashboardFilters): Promise<DashboardListResult> => {
  const keyword = filters.keyword.trim().toLowerCase()
  dashboardAssets = dashboardAssets.map(ensureDashboardRuntime)
  if (defaultDashboardId && !dashboardAssets.some((item) => item.id === defaultDashboardId && item.status !== 'deleted' && item.status !== 'no_permission')) {
    defaultDashboardId = ''
  }
  const filteredItems = dashboardAssets.filter((item) => {
    const matchesKeyword =
      !keyword ||
      item.name.toLowerCase().includes(keyword) ||
      item.description?.toLowerCase().includes(keyword) ||
      item.ownerName.toLowerCase().includes(keyword) ||
      item.tags.some((tag) => tag.toLowerCase().includes(keyword))
    const matchesFavorite = !filters.favoriteOnly || item.favorite || item.isDefaultForCurrentUser
    const matchesSpace = filters.spaceType === 'all' || item.spaceType === filters.spaceType
    const matchesVisibility = filters.visibility === 'all' || item.visibility === filters.visibility
    const matchesOwner =
      filters.owner === 'all' ||
      (filters.owner === 'me' && item.ownerId === 'u_chaoyang') ||
      (filters.owner === 'team' && item.ownerId !== 'u_chaoyang')
    const matchesTags = filters.tags.length === 0 || filters.tags.some((tag) => item.tags.includes(tag))
    const matchesUpdatedAt = isDashboardWithinUpdatedRange(item.updatedAt, filters.updatedAt)
    const matchesStatus = filters.status === 'all' || item.status === filters.status

    return (
      item.status !== 'deleted' &&
      matchesKeyword &&
      matchesFavorite &&
      matchesSpace &&
      matchesVisibility &&
      matchesOwner &&
      matchesTags &&
      matchesUpdatedAt &&
      matchesStatus
    )
  })
  const tags = Array.from(new Set(dashboardAssets.flatMap((item) => item.tags)))

  return resolveMock({
    items: sortDashboards(filteredItems, filters.sortMode),
    tags,
    folders: dashboardFolders,
    defaultDashboardId,
  })
}

export const createDashboard = async (payload: DashboardCreatePayload): Promise<DashboardAsset> => {
  const now = new Date().toISOString()
  const name = payload.name.trim()
  const folderSpace = getFolderSpace(payload.folderId)
  const space = folderSpace ?? findSpace(payload.spaceId) ?? findSpace('space-personal')
  const isWebDashboard = payload.type === 'web'
  const webUrl = payload.webUrl?.trim() ?? ''

  if (!name) {
    throw new Error('仪表盘名称不能为空')
  }

  if (name.length > 50) {
    throw new Error('仪表盘名称不能超过 50 个字符')
  }

  if (payload.folderId && !dashboardFolders.some((folder) => folder.id === payload.folderId && folder.canWrite)) {
    throw new Error('目标路径不可写')
  }

  assertDashboardNameAvailable(name, payload.folderId)

  if (isWebDashboard) {
    assertValidWebUrl(webUrl)
  }

  const widgets: DashboardWidgetAsset[] = payload.layoutTemplate === 'blank' || isWebDashboard
    ? []
    : [
        {
          id: `dash_${Date.now()}_w1`,
          title: '广告观看次数趋势',
          description: '新建仪表盘模板组件。',
          widgetType: 'line',
          chartType: 'line',
          sourceAnalysisId: 'analysis-ad-watch-drop',
          sourceAnalysisType: 'event',
          acceptGlobalTime: true,
          acceptGlobalFilters: true,
          status: 'normal',
          refreshStatus: 'normal',
          lastRefreshAt: now,
          chartData: [
            { name: '05-13', value: 386200, compareValue: 410500 },
            { name: '05-14', value: 372400, compareValue: 408200 },
            { name: '05-15', value: 356920, compareValue: 407800 },
          ],
        },
      ]
  const dashboard: DashboardAsset = {
    id: `dash_${Date.now()}`,
    projectId: 'project-dataops-demo',
    type: payload.type ?? 'normal',
    name,
    description: payload.description,
    folderId: payload.folderId,
    spaceType: space?.type ?? payload.spaceType,
    spaceId: space?.id ?? 'space-personal',
    spaceName: space?.name ?? '个人空间',
    groupType: space?.type === 'public' ? 'public' : 'personal',
    visibility: space?.type === 'public' ? 'public' : payload.visibility,
    ownerId: 'u_chaoyang',
    ownerName: 'Chaoyang Xu',
    tags: payload.tags,
    status: 'published',
    publishMode: 'realtime',
    isDefaultForCurrentUser: false,
    webConfig: isWebDashboard
      ? buildWebConfig(webUrl)
      : undefined,
    settings: getDefaultSettings(),
    widgetCount: widgets.length,
    errorWidgetCount: 0,
    lastRefreshedAt: now,
    createdAt: now,
    updatedAt: now,
    widgets,
    globalFilters: [
      {
        id: 'time_range',
        label: '时间范围',
        value: 'last_14_days',
        options: [
          { label: '过去 7 天', value: 'last_7_days' },
          { label: '过去 14 天', value: 'last_14_days' },
          { label: '过去 30 天', value: 'last_30_days' },
        ],
      },
    ],
    layout: widgets.map((widget, index) => ({ widgetId: widget.id, x: index, y: 0, w: 1, h: 2 })),
    layoutTemplate: payload.layoutTemplate,
    favorite: false,
  }
  ensureDashboardRuntime(dashboard)
  dashboard.publishedPages = clone(dashboard.pages ?? [])
  dashboardAssets = [dashboard, ...dashboardAssets]

  return resolveMock(dashboard)
}

export const createWebDashboard = async (payload: DashboardCreatePayload): Promise<DashboardAsset> => {
  const url = payload.webUrl?.trim() ?? ''

  assertValidWebUrl(url)

  return createDashboard({
    ...payload,
    type: 'web',
    webUrl: url,
    layoutTemplate: 'blank',
  })
}

export const createDashboardFolder = async (
  payload: DashboardFolderCreatePayload,
): Promise<DashboardFolder> => {
  const name = payload.name.trim()

  if (!name) {
    throw new Error('文件夹名称不能为空')
  }

  const duplicate = dashboardFolders.some(
    (folder) => folder.name === name && folder.groupType === payload.groupType && folder.parentId === payload.parentId,
  )

  if (duplicate) {
    throw new Error('同级目录下已存在同名文件夹')
  }

  const folder: DashboardFolder = {
    id: `folder_${Date.now()}`,
    name,
    parentId: payload.parentId,
    groupType: payload.groupType,
    canWrite: true,
    createdAt: new Date().toISOString(),
  }
  dashboardFolders = [folder, ...dashboardFolders]

  return resolveMock(folder)
}

export const duplicateDashboard = async (
  id: string,
  payload?: DashboardCopyPayload,
): Promise<DashboardAsset> => {
  const source = dashboardAssets.find((item) => item.id === id)

  if (!source) {
    throw new Error('仪表盘不存在')
  }

  ensureDashboardRuntime(source)
  const targetName = payload?.name.trim() || `${source.name} 副本`
  const targetFolderId = payload?.targetFolderId ?? source.folderId
  const targetSpace = getFolderSpace(targetFolderId) ?? (payload?.targetSpaceId ? findSpace(payload.targetSpaceId) : findSpace('space-personal'))
  const now = new Date().toISOString()
  assertDashboardNameAvailable(targetName, targetFolderId)
  const pages = clone(source.pages ?? []).map((page, pageIndex) => ({
    ...page,
    id: `${page.id}_copy_${Date.now()}_${pageIndex}`,
    dashboardId: `${source.id}_copy_${Date.now()}`,
    components: page.components.map((component, componentIndex) => ({
      ...component,
      id: `${component.id}_copy_${Date.now()}_${componentIndex}`,
      dashboardId: `${source.id}_copy_${Date.now()}`,
      widget: component.widget
        ? {
            ...component.widget,
            id: payload?.copyChartResources
              ? `${component.widget.id}_chart_copy_${Date.now()}_${componentIndex}`
              : component.widget.id,
            title: payload?.copyChartResources ? `${component.widget.title} 副本` : component.widget.title,
          }
        : component.widget,
      updatedAt: now,
    })),
    updatedAt: now,
  }))
  const duplicatedId = `${source.id}_copy_${Date.now()}`
  const duplicated: DashboardAsset = {
    ...source,
    id: duplicatedId,
    name: targetName,
    folderId: targetFolderId,
    ownerId: 'u_chaoyang',
    ownerName: 'Chaoyang Xu',
    visibility: 'private',
    spaceType: targetSpace?.type ?? 'personal',
    spaceId: targetSpace?.id ?? 'space-personal',
    spaceName: targetSpace?.name ?? '个人空间',
    groupType: targetSpace?.type === 'public' ? 'public' : 'personal',
    pages: pages.map((page) => ({
      ...page,
      dashboardId: duplicatedId,
      components: page.components.map((component) => ({
        ...component,
        dashboardId: duplicatedId,
        pageId: page.id,
      })),
    })),
    favorite: false,
    isDefaultForCurrentUser: false,
    createdAt: now,
    updatedAt: now,
  }
  duplicated.publishedPages = clone(duplicated.pages ?? [])
  dashboardAssets = [duplicated, ...dashboardAssets]

  return resolveMock(duplicated)
}

export const deleteDashboard = async (id: string): Promise<{ success: boolean, message: string }> => {
  const target = dashboardAssets.find((item) => item.id === id)
  dashboardAssets = dashboardAssets.filter((item) => item.id !== id)

  if (target) {
    target.status = 'deleted'
    if (defaultDashboardId === id) {
      defaultDashboardId = ''
    }
    deletedDashboardMap = {
      ...deletedDashboardMap,
      [id]: target,
    }
    recycleBinItems = [
      {
        id: `recycle_${target.id}_${Date.now()}`,
        assetId: target.id,
        assetName: target.name,
        assetType: 'dashboard',
        moduleName: '仪表盘',
        description: target.description ?? '已删除的仪表盘。',
        ownerName: target.ownerName,
        tags: target.tags,
        deletedAt: new Date().toISOString(),
        expireAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        originalLocation: `${target.spaceType === 'team' ? '团队空间' : target.spaceType === 'public' ? '公共空间' : '个人空间'}`,
        deletedByName: 'Chaoyang Xu',
      },
      ...recycleBinItems,
    ]
  }

  return resolveMock({
    success: true,
    message: target ? `已删除「${target.name}」` : '已删除仪表盘',
  })
}

export const renameDashboard = async (id: string, name: string): Promise<DashboardAsset> => {
  const target = dashboardAssets.find((item) => item.id === id)
  const nextName = name.trim()

  if (!target) {
    throw new Error('仪表盘不存在')
  }

  if (!nextName) {
    throw new Error('仪表盘名称不能为空')
  }

  assertDashboardNameAvailable(nextName, target.folderId, target.id)
  target.name = nextName
  if (target.multiLangConfig) {
    target.multiLangConfig.names['zh-CN'] = nextName
  }
  target.updatedAt = new Date().toISOString()

  return resolveMock(target)
}

export const moveDashboardToSpace = async (
  id: string,
  spaceId: string,
): Promise<DashboardAsset> => {
  const target = dashboardAssets.find((item) => item.id === id)
  const space = findSpace(spaceId)

  if (!target || !space) {
    throw new Error('仪表盘或空间不存在')
  }

  target.spaceId = space.id
  target.spaceName = space.name
  target.spaceType = space.type
  target.visibility = space.type === 'team' ? 'team' : space.type === 'public' ? 'public' : 'private'
  target.updatedAt = new Date().toISOString()
  refreshSpaceAssetCounts()

  return resolveMock(target)
}

export const moveDashboardToFolder = async (
  id: string,
  folderId: string,
): Promise<DashboardAsset> => {
  const target = dashboardAssets.find((item) => item.id === id)
  const folder = dashboardFolders.find((item) => item.id === folderId)
  const space = getFolderSpace(folderId)

  if (!target || !folder || !space) {
    throw new Error('仪表盘或目标文件夹不存在')
  }

  if (!folder.canWrite) {
    throw new Error('目标路径不可写')
  }

  assertDashboardNameAvailable(target.name, folderId, target.id)
  target.folderId = folderId
  target.spaceId = space.id
  target.spaceName = space.name
  target.spaceType = space.type
  target.groupType = folder.groupType
  target.visibility = space.type === 'public' ? 'public' : target.visibility === 'public' ? 'team' : target.visibility
  target.updatedAt = new Date().toISOString()
  refreshSpaceAssetCounts()

  return resolveMock(target)
}

export const updateWebDashboard = async (
  id: string,
  payload: { url: string, folderId?: string, tags?: string[] },
): Promise<DashboardAsset> => {
  const target = dashboardAssets.find((item) => item.id === id)
  const url = payload.url.trim()

  if (!target || target.type !== 'web') {
    throw new Error('网页仪表盘不存在')
  }

  assertValidWebUrl(url)
  if (payload.folderId && payload.folderId !== target.folderId) {
    await moveDashboardToFolder(id, payload.folderId)
  }
  target.webConfig = buildWebConfig(url, target.webConfig)
  target.tags = payload.tags ?? target.tags
  target.updatedAt = new Date().toISOString()

  return resolveMock(target)
}

export const getDashboard = (id: string): Promise<DashboardAsset> => {
  const target = dashboardAssets.find((item) => item.id === id)

  if (!target) {
    const deletedTarget = deletedDashboardMap[id]

    if (deletedTarget) {
      return resolveMock(ensureDashboardRuntime(deletedTarget))
    }

    throw new Error('仪表盘不存在')
  }

  ensureDashboardRuntime(target)
  recentVisitItems = [
    {
      id: `recent_${target.id}_${Date.now()}`,
      assetId: target.id,
      assetName: target.name,
      assetType: 'dashboard',
      moduleName: '仪表盘',
      description: target.description ?? '仪表盘',
      ownerName: target.ownerName,
      tags: target.tags,
      visitedAt: new Date().toISOString(),
    },
    ...recentVisitItems.filter((item) => item.assetId !== target.id),
  ]

  return resolveMock(target)
}

export const acquireDashboardEditLock = async (id: string, force = false): Promise<DashboardEditLock> => {
  const target = dashboardAssets.find((item) => item.id === id)

  if (!target) {
    throw new Error('仪表盘不存在')
  }

  const existingLock = dashboardEditLocks[id]
  const now = Date.now()

  if (
    existingLock &&
    existingLock.userId !== currentEditorUser.userId &&
    new Date(existingLock.expireAt || existingLock.lockExpireAt).getTime() > now &&
    !force
  ) {
    target.editingLock = existingLock
    throw new Error(`${existingLock.userName} 正在编辑该仪表盘`)
  }

  const lock = buildEditLock(id)
  dashboardEditLocks[id] = lock
  target.editingLock = lock

  return resolveMock(lock)
}

export const heartbeatDashboardEditLock = async (id: string): Promise<DashboardEditLock> => {
  const target = dashboardAssets.find((item) => item.id === id)
  const existingLock = dashboardEditLocks[id]

  if (!target || !existingLock || existingLock.userId !== currentEditorUser.userId) {
    throw new Error('编辑锁不存在或已失效')
  }

  const heartbeatAt = new Date()
  const expireAt = new Date(heartbeatAt.getTime() + 90_000).toISOString()
  const lock: DashboardEditLock = {
    ...existingLock,
    heartbeatAt: heartbeatAt.toISOString(),
    expireAt,
    lockExpireAt: expireAt,
  }
  dashboardEditLocks[id] = lock
  target.editingLock = lock

  return resolveMock(lock)
}

export const releaseDashboardEditLock = async (id: string): Promise<{ success: boolean }> => {
  const target = dashboardAssets.find((item) => item.id === id)
  const existingLock = dashboardEditLocks[id]

  if (existingLock?.userId === currentEditorUser.userId) {
    delete dashboardEditLocks[id]
  }

  if (target?.editingLock?.userId === currentEditorUser.userId) {
    delete target.editingLock
  }

  return resolveMock({ success: true })
}

export const forceReleaseDashboardEditLock = async (id: string): Promise<{ success: boolean, auditLog: string }> => {
  const target = dashboardAssets.find((item) => item.id === id)
  const previousLock = dashboardEditLocks[id] ?? target?.editingLock

  delete dashboardEditLocks[id]
  if (target) {
    delete target.editingLock
  }

  return resolveMock({
    success: true,
    auditLog: `项目管理员 ${currentEditorUser.userName} 已强制释放 ${previousLock?.userName ?? '未知用户'} 的编辑锁。`,
  })
}

export const updateDashboardState = async (
  id: string,
  patch: Partial<DashboardAsset>,
): Promise<DashboardAsset> => {
  const target = dashboardAssets.find((item) => item.id === id)

  if (!target) {
    throw new Error('仪表盘不存在')
  }

  Object.assign(target, patch, { updatedAt: new Date().toISOString() })
  target.widgetCount = target.pages?.reduce((count, page) => count + page.components.length, 0) ?? target.widgetCount
  target.errorWidgetCount = target.widgets.filter((widget) => widget.status === 'error' || widget.status === 'invalid').length
  ensureDashboardRuntime(target)

  return resolveMock(target)
}

export const setDefaultDashboard = async (id: string): Promise<DashboardAsset> => {
  const target = dashboardAssets.find((item) => item.id === id)

  if (!target) {
    throw new Error('仪表盘不存在')
  }

  defaultDashboardId = id
  dashboardAssets.forEach((dashboard) => {
    dashboard.isDefaultForCurrentUser = dashboard.id === id
  })

  return resolveMock(target)
}

export const clearDefaultDashboard = async (): Promise<{ success: boolean }> => {
  defaultDashboardId = ''
  dashboardAssets.forEach((dashboard) => {
    dashboard.isDefaultForCurrentUser = false
  })

  return resolveMock({ success: true })
}

export const publishDashboard = async (
  id: string,
  description: string,
  deleteVersionId?: string,
): Promise<DashboardAsset> => {
  const target = dashboardAssets.find((item) => item.id === id)

  if (!target) {
    throw new Error('仪表盘不存在')
  }

  ensureDashboardRuntime(target)
  const versions = deleteVersionId
    ? (target.versions ?? []).filter((item) => item.id !== deleteVersionId)
    : target.versions ?? []
  const maxVersion = versions.reduce((versionNo, version) => Math.max(versionNo, version.versionNo), 0)
  const version = {
    id: `version_${id}_${Date.now()}`,
    dashboardId: id,
    versionNo: maxVersion + 1,
    description: description.trim() || '无描述',
    snapshot: clone(target.pages ?? []),
    status: 'published' as const,
    createdBy: 'Chaoyang Xu',
    createdAt: new Date().toISOString(),
  }
  target.versions = [
    version,
    ...versions.map((item) => ({ ...item, status: 'history' as const })).slice(0, 2),
  ]
  target.publishedPages = clone(target.pages ?? [])
  target.currentPublishedVersionId = version.id
  target.status = 'published'
  target.updatedAt = version.createdAt

  return resolveMock(target)
}

export const refreshDashboard = async (
  id: string,
  filters: DashboardGlobalFilter[],
): Promise<DashboardAsset> => {
  const target = dashboardAssets.find((item) => item.id === id)

  if (!target) {
    throw new Error('仪表盘不存在')
  }

  const now = new Date().toISOString()
  target.globalFilters = filters
  target.lastRefreshedAt = now
  target.updatedAt = now
  target.widgets = target.widgets.map((widget) => ({
    ...widget,
    status: widget.status === 'invalid' ? 'invalid' : widget.status === 'error' ? 'error' : 'normal',
    lastRefreshAt: now,
  }))
  target.errorWidgetCount = target.widgets.filter((widget) => widget.status === 'error' || widget.status === 'invalid').length
  target.widgetCount = target.widgets.length
  target.status = target.errorWidgetCount > 0 ? 'has_error_widget' : 'normal'

  return resolveMock(target)
}

export const refreshWidget = async (dashboardId: string, widgetId: string): Promise<DashboardWidgetAsset> => {
  const dashboard = dashboardAssets.find((item) => item.id === dashboardId)
  const widget = dashboard?.widgets.find((item) => item.id === widgetId)

  if (!dashboard || !widget) {
    throw new Error('组件不存在')
  }

  widget.lastRefreshAt = new Date().toISOString()
  widget.status = widget.status === 'invalid' ? 'invalid' : 'normal'
  widget.refreshStatus = widget.status === 'normal' ? 'normal' : widget.refreshStatus
  dashboard.lastRefreshedAt = widget.lastRefreshAt

  return resolveMock(widget)
}

export const deleteWidget = async (dashboardId: string, widgetId: string): Promise<{ success: boolean, message: string }> => {
  const dashboard = dashboardAssets.find((item) => item.id === dashboardId)
  const widget = dashboard?.widgets.find((item) => item.id === widgetId)

  if (!dashboard) {
    throw new Error('仪表盘不存在')
  }

  dashboard.widgets = dashboard.widgets.filter((item) => item.id !== widgetId)
  dashboard.widgetCount = dashboard.widgets.length
  dashboard.errorWidgetCount = dashboard.widgets.filter((item) => item.status === 'error' || item.status === 'invalid').length
  dashboard.status = dashboard.errorWidgetCount > 0 ? 'has_error_widget' : 'normal'

  if (widget) {
    recycleBinItems = [
      {
        id: `recycle_${widget.id}_${Date.now()}`,
        assetId: widget.id,
        assetName: widget.title,
        assetType: 'dashboard_widget',
        moduleName: '仪表盘组件',
        description: widget.description ?? '已删除的仪表盘组件。',
        ownerName: dashboard.ownerName,
        tags: dashboard.tags,
        deletedAt: new Date().toISOString(),
        expireAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        originalLocation: dashboard.name,
        deletedByName: 'Chaoyang Xu',
      },
      ...recycleBinItems,
    ]
  }

  return resolveMock({ success: true, message: widget ? `组件「${widget.title}」已删除。` : '组件已删除。' })
}

export const updateWidgetTitle = async (
  dashboardId: string,
  widgetId: string,
  title: string,
): Promise<DashboardWidgetAsset> => {
  const dashboard = dashboardAssets.find((item) => item.id === dashboardId)
  const widget = dashboard?.widgets.find((item) => item.id === widgetId)

  if (!dashboard || !widget) {
    throw new Error('组件不存在')
  }

  widget.title = title
  dashboard.updatedAt = new Date().toISOString()

  return resolveMock(widget)
}

export const toggleDashboardFavorite = async (id: string): Promise<DashboardAsset> => {
  const dashboard = dashboardAssets.find((item) => item.id === id)

  if (!dashboard) {
    throw new Error('仪表盘不存在')
  }

  dashboard.favorite = !dashboard.favorite

  return resolveMock(dashboard)
}

export const getRecentVisits = (): Promise<AnalysisCenterAssetItem[]> =>
  resolveMock([...recentVisitItems].sort((itemA, itemB) => (itemB.visitedAt ?? '').localeCompare(itemA.visitedAt ?? '')))

export const removeRecentVisit = async (id: string): Promise<{ success: boolean, message: string }> => {
  recentVisitItems = recentVisitItems.filter((item) => item.id !== id)

  return resolveMock({ success: true, message: '已移除最近访问记录。' })
}

export const clearRecentVisits = async (): Promise<{ success: boolean, message: string }> => {
  recentVisitItems = []

  return resolveMock({ success: true, message: '已清空最近访问。' })
}

export const getFavorites = (): Promise<AnalysisCenterAssetItem[]> => {
  const favoriteSavedAnalyses: AnalysisCenterAssetItem[] = savedAnalysisAssets
    .filter((item) => item.favorite)
    .map((item) => ({
      id: `favorite_${item.id}`,
      assetId: item.id,
      assetName: item.name,
      assetType: 'saved_analysis',
      moduleName: item.analysisType === 'event' ? '事件分析' : '分析模块',
      description: item.description ?? item.summary,
      ownerName: item.ownerName,
      tags: item.tags,
      favoritedAt: item.updatedAt,
    }))
  const favoriteDashboards: AnalysisCenterAssetItem[] = dashboardAssets
    .filter((item) => item.favorite)
    .map((item) => ({
      id: `favorite_${item.id}`,
      assetId: item.id,
      assetName: item.name,
      assetType: 'dashboard',
      moduleName: '仪表盘',
      description: item.description ?? '仪表盘',
      ownerName: item.ownerName,
      tags: item.tags,
      favoritedAt: item.updatedAt,
    }))

  return resolveMock([...favoriteSavedAnalyses, ...favoriteDashboards])
}

export const getRecycleBin = (): Promise<AnalysisCenterAssetItem[]> =>
  resolveMock([...recycleBinItems].sort((itemA, itemB) => (itemB.deletedAt ?? '').localeCompare(itemA.deletedAt ?? '')))

export const restoreRecycleItem = async (id: string): Promise<{ success: boolean, message: string }> => {
  const item = recycleBinItems.find((entry) => entry.id === id)
  recycleBinItems = recycleBinItems.filter((entry) => entry.id !== id)

  return resolveMock({ success: true, message: item ? `已恢复「${item.assetName}」。` : '已恢复资产。' })
}

export const permanentlyDeleteRecycleItem = async (id: string): Promise<{ success: boolean, message: string }> => {
  const item = recycleBinItems.find((entry) => entry.id === id)
  recycleBinItems = recycleBinItems.filter((entry) => entry.id !== id)

  return resolveMock({ success: true, message: item ? `已永久删除「${item.assetName}」。` : '已永久删除资产。' })
}

export const getSpaces = (): Promise<AnalysisCenterSpace[]> => {
  refreshSpaceAssetCounts()

  return resolveMock(spaces)
}

export const createSpace = async (payload: SpaceCreatePayload): Promise<AnalysisCenterSpace> => {
  const name = payload.name.trim()

  if (!name) {
    throw new Error('空间名称不能为空')
  }

  const now = new Date().toISOString()
  const space: AnalysisCenterSpace = {
    id: `space_${Date.now()}`,
    name,
    type: payload.type,
    description: payload.description,
    ownerName: 'Chaoyang Xu',
    assetCount: 0,
    canWrite: true,
    canDelete: true,
    createdAt: now,
    updatedAt: now,
  }
  spaces = [space, ...spaces]

  return resolveMock(space)
}

export const renameSpace = async (spaceId: string, name: string): Promise<AnalysisCenterSpace> => {
  const space = findSpace(spaceId)

  if (!space) {
    throw new Error('空间不存在')
  }

  space.name = name
  space.updatedAt = new Date().toISOString()
  savedAnalysisAssets.forEach((item) => {
    if (item.spaceId === space.id) {
      item.spaceName = space.name
    }
  })
  dashboardAssets.forEach((item) => {
    if (item.spaceId === space.id) {
      item.spaceName = space.name
    }
  })

  return resolveMock(space)
}

export const deleteSpace = async (spaceId: string): Promise<{ success: boolean, message: string }> => {
  const space = findSpace(spaceId)

  if (!space) {
    throw new Error('空间不存在')
  }

  if (!space.canDelete || space.assetCount > 0) {
    return resolveMock({ success: false, message: '该空间仍包含资产或无删除权限，无法删除。' })
  }

  spaces = spaces.filter((item) => item.id !== spaceId)

  return resolveMock({ success: true, message: `已删除空间「${space.name}」。` })
}

export const shareAsset = async (payload: ShareAssetPayload): Promise<ShareAssetResult> => {
  const grantKey = `${payload.assetType}:${payload.assetId}`
  const currentGrant = shareGrantMap[grantKey] ?? { memberIds: [], teamIds: [] }
  const memberIds = Array.from(
    new Set([...currentGrant.memberIds, ...payload.addMemberIds]),
  ).filter((memberId) => !payload.removeMemberIds.includes(memberId))
  const teamIds = Array.from(
    new Set([...currentGrant.teamIds, ...payload.addTeamIds]),
  ).filter((teamId) => !payload.removeTeamIds.includes(teamId))

  shareGrantMap = {
    ...shareGrantMap,
    [grantKey]: { memberIds, teamIds },
  }

  const shareLink =
    payload.assetType === 'dashboard'
      ? `${window.location.origin}/analysis-center/dashboards/${payload.assetId}`
      : `${window.location.origin}/data-insight/event-analysis?savedAnalysisId=${payload.assetId}`

  if (payload.assetType === 'dashboard') {
    const dashboard = dashboardAssets.find((item) => item.id === payload.assetId)

    if (dashboard) {
      dashboard.visibility = payload.visibility
      dashboard.updatedAt = new Date().toISOString()
    }
  } else {
    const savedAnalysis = savedAnalysisAssets.find((item) => item.id === payload.assetId)

    if (savedAnalysis) {
      savedAnalysis.visibility = payload.visibility
      savedAnalysis.updatedAt = new Date().toISOString()
    }
  }

  return resolveMock({
    success: true,
    message: `分享设置已更新，当前已分享给 ${memberIds.length} 位成员、${teamIds.length} 个团队。`,
    shareLink,
    sharedMembers: shareMembers.filter((member) => memberIds.includes(member.id)),
    sharedTeams: shareTeams.filter((team) => teamIds.includes(team.id)),
  })
}

export const getShareOptions = (): Promise<ShareOptions> =>
  resolveMock({
    members: shareMembers,
    teams: shareTeams,
  })

export const getAssetShareGrants = (
  assetType: ShareAssetPayload['assetType'],
  assetId: string,
): Promise<Pick<ShareAssetResult, 'sharedMembers' | 'sharedTeams'>> => {
  const grant = shareGrantMap[`${assetType}:${assetId}`] ?? { memberIds: [], teamIds: [] }

  return resolveMock({
    sharedMembers: shareMembers.filter((member) => grant.memberIds.includes(member.id)),
    sharedTeams: shareTeams.filter((team) => grant.teamIds.includes(team.id)),
  })
}

export const createDashboardTag = async (name: string): Promise<string[]> => {
  const nextName = name.trim()

  if (!nextName) {
    throw new Error('标签名不能为空')
  }

  const tags = Array.from(new Set(dashboardAssets.flatMap((item) => item.tags)))

  if (tags.includes(nextName)) {
    throw new Error('同项目标签名不可重复')
  }

  return resolveMock([...tags, nextName])
}

export const deleteDashboardTag = async (name: string): Promise<string[]> => {
  dashboardAssets = dashboardAssets.map((dashboard) => ({
    ...dashboard,
    tags: dashboard.tags.filter((tag) => tag !== name),
  }))

  return resolveMock(Array.from(new Set(dashboardAssets.flatMap((item) => item.tags))))
}

export const getDashboardTemplates = (): Promise<DashboardTemplate[]> =>
  resolveMock(clone(dashboardTemplates))

export const importDashboardTemplate = async (
  payload: DashboardTemplateImportPayload,
): Promise<DashboardTemplate> => {
  const packageName = payload.packageName.trim()

  if (!/\.(dashboard-template|zip)$/i.test(packageName)) {
    throw new Error('文件格式必须是系统支持的模板包格式')
  }

  if (/missing|缺失/i.test(packageName)) {
    throw new Error('模板包中的图表、图片或主题资源缺失')
  }

  if (!dashboardFolders.some((folder) => folder.id === payload.targetFolderId && folder.canWrite)) {
    throw new Error('目标目录不可写')
  }

  const now = new Date().toISOString()
  const template: DashboardTemplate = {
    id: `tpl_import_${Date.now()}`,
    projectId: 'project-dataops-demo',
    name: packageName.replace(/\.(dashboard-template|zip)$/i, ''),
    description: '从模板资源包导入，包含仪表盘结构描述、布局和主题。',
    scope: 'project',
    resourcePackageUrl: `/template-packages/${encodeURIComponent(packageName)}`,
    layoutTemplate: 'operation_monitoring',
    requiresDatasetMapping: true,
    createdBy: 'Chaoyang Xu',
    createdAt: now,
  }
  dashboardTemplates = [template, ...dashboardTemplates]

  return resolveMock(template)
}

export const exportDashboardTemplate = async (
  payload: DashboardTemplateExportPayload,
): Promise<DashboardTemplate> => {
  const source = dashboardAssets.find((item) => item.id === payload.dashboardId)
  const name = payload.name.trim()

  if (!source) {
    throw new Error('仪表盘不存在')
  }

  if (!name) {
    throw new Error('模板名称不能为空')
  }

  const now = new Date().toISOString()
  const template: DashboardTemplate = {
    id: `tpl_export_${Date.now()}`,
    projectId: 'project-dataops-demo',
    name,
    description: payload.description || `${source.name} 导出的模板${payload.desensitizeSampleData ? '，示例数据已脱敏。' : '。'}`,
    sourceDashboardId: source.id,
    scope: 'project',
    resourcePackageUrl: `/template-packages/${source.id}-${Date.now()}.dashboard-template.zip`,
    layoutTemplate: source.layoutTemplate,
    requiresDatasetMapping: true,
    createdBy: 'Chaoyang Xu',
    createdAt: now,
  }

  if (payload.saveToLibrary) {
    dashboardTemplates = [template, ...dashboardTemplates]
  }

  return resolveMock(template)
}

export const applyDashboardTemplate = async (
  payload: DashboardTemplateApplyPayload,
): Promise<DashboardAsset> => {
  const template = dashboardTemplates.find((item) => item.id === payload.templateId)

  if (!template) {
    throw new Error('模板不存在')
  }

  const folderSpace = getFolderSpace(payload.targetFolderId)
  const dashboard = await createDashboard({
    name: payload.name.trim() || `${template.name} 应用`,
    description: template.description,
    type: 'normal',
    folderId: payload.targetFolderId,
    spaceType: folderSpace?.type ?? 'personal',
    spaceId: folderSpace?.id ?? 'space-personal',
    visibility: folderSpace?.type === 'public' ? 'public' : 'private',
    layoutTemplate: template.layoutTemplate ?? 'operation_monitoring',
    tags: ['模板应用'],
  })
  dashboard.description = `${template.name} 应用生成；模板修改不会影响该仪表盘。`

  return resolveMock(dashboard)
}

export const analysisCenterService = {
  getSavedAnalysisList,
  duplicateSavedAnalysis,
  deleteSavedAnalysis,
  toggleSavedAnalysisFavorite,
  renameSavedAnalysis,
  moveSavedAnalysisToSpace,
  getDashboardList,
  createDashboard,
  createWebDashboard,
  createDashboardFolder,
  getDashboard,
  duplicateDashboard,
  deleteDashboard,
  renameDashboard,
  moveDashboardToSpace,
  moveDashboardToFolder,
  updateWebDashboard,
  updateDashboardState,
  acquireDashboardEditLock,
  heartbeatDashboardEditLock,
  releaseDashboardEditLock,
  forceReleaseDashboardEditLock,
  setDefaultDashboard,
  clearDefaultDashboard,
  publishDashboard,
  refreshDashboard,
  refreshWidget,
  deleteWidget,
  updateWidgetTitle,
  toggleDashboardFavorite,
  getRecentVisits,
  removeRecentVisit,
  clearRecentVisits,
  getFavorites,
  getRecycleBin,
  restoreRecycleItem,
  permanentlyDeleteRecycleItem,
  getSpaces,
  createSpace,
  renameSpace,
  deleteSpace,
  shareAsset,
  getShareOptions,
  getAssetShareGrants,
  createDashboardTag,
  deleteDashboardTag,
  getDashboardTemplates,
  importDashboardTemplate,
  exportDashboardTemplate,
  applyDashboardTemplate,
}
