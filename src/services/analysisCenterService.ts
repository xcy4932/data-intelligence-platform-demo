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
  DashboardAsset,
  DashboardCreatePayload,
  DashboardFilters,
  DashboardGlobalFilter,
  DashboardListResult,
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
  const filteredItems = dashboardAssets.filter((item) => {
    const matchesKeyword =
      !keyword ||
      item.name.toLowerCase().includes(keyword) ||
      item.description?.toLowerCase().includes(keyword) ||
      item.ownerName.toLowerCase().includes(keyword) ||
      item.tags.some((tag) => tag.toLowerCase().includes(keyword))
    const matchesSpace = filters.spaceType === 'all' || item.spaceType === filters.spaceType
    const matchesVisibility = filters.visibility === 'all' || item.visibility === filters.visibility
    const matchesOwner =
      filters.owner === 'all' ||
      (filters.owner === 'me' && item.ownerId === 'u_chaoyang') ||
      (filters.owner === 'team' && item.ownerId !== 'u_chaoyang')
    const matchesTags = filters.tags.length === 0 || filters.tags.some((tag) => item.tags.includes(tag))
    const matchesUpdatedAt = isDashboardWithinUpdatedRange(item.updatedAt, filters.updatedAt)
    const matchesStatus = filters.status === 'all' || item.status === filters.status

    return matchesKeyword && matchesSpace && matchesVisibility && matchesOwner && matchesTags && matchesUpdatedAt && matchesStatus
  })
  const tags = Array.from(new Set(dashboardAssets.flatMap((item) => item.tags)))

  return resolveMock({
    items: sortDashboards(filteredItems, filters.sortMode),
    tags,
  })
}

export const createDashboard = async (payload: DashboardCreatePayload): Promise<DashboardAsset> => {
  const now = new Date().toISOString()
  const space = findSpace(payload.spaceId) ?? findSpace('space-personal')
  const widgets: DashboardWidgetAsset[] = payload.layoutTemplate === 'blank'
    ? []
    : [
        {
          id: `dash_${Date.now()}_w1`,
          title: '广告观看次数趋势',
          description: '新建看板模板组件。',
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
    name: payload.name,
    description: payload.description,
    spaceType: payload.spaceType,
    spaceId: space?.id ?? 'space-personal',
    spaceName: space?.name ?? '个人空间',
    visibility: payload.visibility,
    ownerId: 'u_chaoyang',
    ownerName: 'Chaoyang Xu',
    tags: payload.tags,
    status: 'normal',
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
  dashboardAssets = [dashboard, ...dashboardAssets]

  return resolveMock(dashboard)
}

export const duplicateDashboard = async (id: string): Promise<DashboardAsset> => {
  const source = dashboardAssets.find((item) => item.id === id)

  if (!source) {
    throw new Error('看板不存在')
  }

  const duplicated: DashboardAsset = {
    ...source,
    id: `${source.id}_copy_${Date.now()}`,
    name: `${source.name} 副本`,
    ownerId: 'u_chaoyang',
    ownerName: 'Chaoyang Xu',
    visibility: 'private',
    spaceType: 'personal',
    spaceId: 'space-personal',
    spaceName: '个人空间',
    favorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  dashboardAssets = [duplicated, ...dashboardAssets]

  return resolveMock(duplicated)
}

export const deleteDashboard = async (id: string): Promise<{ success: boolean, message: string }> => {
  const target = dashboardAssets.find((item) => item.id === id)
  dashboardAssets = dashboardAssets.filter((item) => item.id !== id)

  if (target) {
    recycleBinItems = [
      {
        id: `recycle_${target.id}_${Date.now()}`,
        assetId: target.id,
        assetName: target.name,
        assetType: 'dashboard',
        moduleName: '数据看板',
        description: target.description ?? '已删除的数据看板。',
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
    message: target ? `已删除「${target.name}」` : '已删除看板',
  })
}

export const renameDashboard = async (id: string, name: string): Promise<DashboardAsset> => {
  const target = dashboardAssets.find((item) => item.id === id)

  if (!target) {
    throw new Error('看板不存在')
  }

  target.name = name
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
    throw new Error('看板或空间不存在')
  }

  target.spaceId = space.id
  target.spaceName = space.name
  target.spaceType = space.type
  target.visibility = space.type === 'team' ? 'team' : space.type === 'public' ? 'public' : 'private'
  target.updatedAt = new Date().toISOString()
  refreshSpaceAssetCounts()

  return resolveMock(target)
}

export const getDashboard = (id: string): Promise<DashboardAsset> => {
  const target = dashboardAssets.find((item) => item.id === id)

  if (!target) {
    throw new Error('看板不存在')
  }

  recentVisitItems = [
    {
      id: `recent_${target.id}_${Date.now()}`,
      assetId: target.id,
      assetName: target.name,
      assetType: 'dashboard',
      moduleName: '数据看板',
      description: target.description ?? '数据看板',
      ownerName: target.ownerName,
      tags: target.tags,
      visitedAt: new Date().toISOString(),
    },
    ...recentVisitItems.filter((item) => item.assetId !== target.id),
  ]

  return resolveMock(target)
}

export const refreshDashboard = async (
  id: string,
  filters: DashboardGlobalFilter[],
): Promise<DashboardAsset> => {
  const target = dashboardAssets.find((item) => item.id === id)

  if (!target) {
    throw new Error('看板不存在')
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
    throw new Error('看板不存在')
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
        moduleName: '看板组件',
        description: widget.description ?? '已删除的看板组件。',
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
    throw new Error('看板不存在')
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
      moduleName: '数据看板',
      description: item.description ?? '数据看板',
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

export const analysisCenterService = {
  getSavedAnalysisList,
  duplicateSavedAnalysis,
  deleteSavedAnalysis,
  toggleSavedAnalysisFavorite,
  renameSavedAnalysis,
  moveSavedAnalysisToSpace,
  getDashboardList,
  createDashboard,
  getDashboard,
  duplicateDashboard,
  deleteDashboard,
  renameDashboard,
  moveDashboardToSpace,
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
}
