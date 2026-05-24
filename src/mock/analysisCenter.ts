import type {
  AnalysisCenterAssetItem,
  AnalysisCenterSpace,
  DashboardAsset,
  DashboardGlobalFilter,
  DashboardLayoutItem,
  DashboardLayoutTemplate,
  DashboardWidgetAsset,
  SavedAnalysisAsset,
} from '@/types/analysisCenter'
import type {
  AnalysisChartConfig,
  AnalysisInteractionState,
  AnalysisQueryConfig,
  AnalysisTableConfig,
  SavedAnalysisType,
  SavedAnalysisVisibility,
} from '@/types/eventAnalysis'
import {
  mockComparisonGroups,
  mockDefaultFilters,
  mockFormulaMetrics,
  mockGroupByConfigs,
  mockMetricConfigs,
} from './eventAnalysis'

const now = '2026-05-18T14:30:00+02:00'

const createEventQueryConfig = (): AnalysisQueryConfig => ({
  analysisType: 'event',
  timeRange: {
    preset: 'last_14_days',
    startDate: '2026-05-02',
    endDate: '2026-05-15',
    granularity: 'day',
    comparisonType: 'previous_period',
  },
  timezone: 'UTC+8',
  subjectType: 'app_user',
  statisticUnit: 'user',
  moduleConfig: {
    metrics: mockMetricConfigs,
    formulaMetrics: mockFormulaMetrics,
    filters: mockDefaultFilters,
    groupBys: mockGroupByConfigs,
    comparisonGroups: mockComparisonGroups,
    anomalyConfig: {
      confidenceInterval: 95,
      lookbackDays: 60,
    },
  },
})

const baseChartConfig: AnalysisChartConfig = {
  chartType: 'line',
  selectedMetricIds: ['metric_ad_watch_pv'],
  selectedGroupByIds: ['group-coin-balance-level'],
  topN: 10,
  mergeOthers: true,
  showLegend: true,
  showTooltip: true,
  showDataLabel: false,
  showCompareLine: true,
  showAnomalyPoint: true,
  showPredictionBand: true,
  displayMode: 'value',
}

const baseTableConfig: AnalysisTableConfig = {
  tableMode: 'hierarchy',
  visibleColumns: ['userId', 'attr:user_level', 'tag:churn_risk'],
  pageSize: 10,
}

const baseInteractionState: AnalysisInteractionState = {
  selectedMetricId: 'metric_ad_watch_pv',
  activeTab: 'detail',
}

const createAsset = (
  id: string,
  name: string,
  analysisType: SavedAnalysisType,
  visibility: SavedAnalysisVisibility,
  updatedAt: string,
  overrides: Partial<SavedAnalysisAsset> = {},
): SavedAnalysisAsset => ({
  id,
  name,
  description: overrides.description ?? '保存的分析配置，可恢复筛选、指标、图表和表格状态。',
  analysisType,
  ownerId: overrides.ownerId ?? 'u_chaoyang',
  ownerName: overrides.ownerName ?? 'Chaoyang Xu',
  visibility,
  folderId: overrides.folderId ?? 'personal-my-analysis',
  folderName: overrides.folderName ?? '我的分析',
  spaceId: overrides.spaceId ?? (visibility === 'team' ? 'space-team-operation' : visibility === 'public' ? 'space-public' : 'space-personal'),
  spaceName: overrides.spaceName ?? (visibility === 'team' ? '运营团队空间' : visibility === 'public' ? '公共空间' : '个人空间'),
  tags: overrides.tags ?? ['广告', '事件分析'],
  version: overrides.version ?? 1,
  queryConfig: overrides.queryConfig ?? createEventQueryConfig(),
  chartConfig: overrides.chartConfig ?? baseChartConfig,
  tableConfig: overrides.tableConfig ?? baseTableConfig,
  interactionState: overrides.interactionState ?? baseInteractionState,
  createdAt: overrides.createdAt ?? '2026-05-12T10:00:00+02:00',
  updatedAt,
  status: overrides.status ?? 'normal',
  summary: overrides.summary ?? '过去 14 天，分析广告观看完成事件，按金币余额等级、广告位、游戏类型分组。',
  metricSummary: overrides.metricSummary ?? ['广告观看次数', '广告观看人数', '广告完成率'],
  filterSummary: overrides.filterSummary ?? ['低金币高活跃用户'],
  chartSummary: overrides.chartSummary ?? '折线图',
  favorite: overrides.favorite ?? false,
  invalidReasons: overrides.invalidReasons,
})

export const mockSavedAnalysisAssets: SavedAnalysisAsset[] = [
  createAsset('analysis-ad-watch-drop', '广告观看下降分析', 'event', 'private', now, {
    favorite: true,
    tags: ['广告', '低金币', '运营监控'],
  }),
  createAsset('analysis-low-coin-ad', '低金币用户广告行为复盘', 'event', 'team', '2026-05-17T19:20:00+02:00', {
    ownerName: 'Mia Chen',
    ownerId: 'u_mia',
    folderName: '广告分析',
    tags: ['广告', '低金币', '实验复盘'],
  }),
  createAsset('analysis-new-user-retention', '新用户次日留存分析', 'retention', 'team', '2026-05-16T16:10:00+02:00', {
    summary: '按渠道和新手任务完成状态拆解新用户次日留存。',
    metricSummary: ['次日留存率', '3 日留存率'],
    filterSummary: ['新注册用户'],
    chartSummary: '留存矩阵',
    tags: ['留存', '新用户'],
  }),
  createAsset('analysis-register-pay-funnel', '注册到付费转化漏斗', 'funnel', 'private', '2026-05-15T11:45:00+02:00', {
    summary: '注册、完成新手局、首看广告、首充支付的转化漏斗。',
    metricSummary: ['步骤转化率', '整体转化率'],
    filterSummary: ['自然量用户'],
    chartSummary: '漏斗图',
    tags: ['付费', '新用户'],
  }),
  createAsset('analysis-ad-event-invalid', '旧版广告入口事件分析', 'event', 'private', '2026-05-14T09:10:00+02:00', {
    status: 'invalid',
    tags: ['广告'],
    invalidReasons: ['事件 old_ad_entry_click 已下线', '属性 old_ad_slot 已不存在'],
  }),
  createAsset('analysis-gold-distribution', '用户金币余额分布', 'distribution', 'team', '2026-05-13T18:00:00+02:00', {
    summary: '按金币余额分桶观察低金币用户占比变化。',
    metricSummary: ['用户数', '占比'],
    filterSummary: ['近 7 日活跃用户'],
    chartSummary: '分布柱形图',
    tags: ['低金币', '运营监控'],
  }),
]

export const mockAnalysisCenterSpaces: AnalysisCenterSpace[] = [
  {
    id: 'space-personal',
    name: '个人空间',
    type: 'personal',
    description: '仅个人可见的分析资产空间。',
    ownerName: 'Chaoyang Xu',
    assetCount: 4,
    canWrite: true,
    canDelete: false,
    createdAt: '2026-05-01T10:00:00+02:00',
    updatedAt: '2026-05-18T14:30:00+02:00',
  },
  {
    id: 'space-team-operation',
    name: '运营团队空间',
    type: 'team',
    description: '运营团队共享保存分析和仪表盘。',
    ownerName: 'Mia Chen',
    assetCount: 6,
    canWrite: true,
    canDelete: false,
    createdAt: '2026-05-02T10:00:00+02:00',
    updatedAt: '2026-05-17T19:20:00+02:00',
  },
  {
    id: 'space-team-data',
    name: '数据分析团队',
    type: 'team',
    description: '数据分析团队沉淀复盘仪表盘和专题分析。',
    ownerName: 'Chaoyang Xu',
    assetCount: 3,
    canWrite: true,
    canDelete: true,
    createdAt: '2026-05-03T10:00:00+02:00',
    updatedAt: '2026-05-16T12:30:00+02:00',
  },
  {
    id: 'space-public',
    name: '公共空间',
    type: 'public',
    description: '面向所有成员开放的经营概览资产。',
    ownerName: 'DataOps Admin',
    assetCount: 2,
    canWrite: false,
    canDelete: false,
    createdAt: '2026-05-01T10:00:00+02:00',
    updatedAt: '2026-05-15T09:40:00+02:00',
  },
]

const defaultGlobalFilters: DashboardGlobalFilter[] = [
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
  {
    id: 'channel',
    label: '渠道',
    value: 'all',
    options: [
      { label: '全部渠道', value: 'all' },
      { label: '自然量', value: 'organic' },
      { label: '买量渠道', value: 'paid' },
    ],
  },
  {
    id: 'user_type',
    label: '用户类型',
    value: 'active',
    options: [
      { label: '活跃用户', value: 'active' },
      { label: '低金币用户', value: 'low_coin' },
      { label: '新用户', value: 'new_user' },
    ],
  },
  {
    id: 'app_version',
    label: 'App 版本',
    value: 'all',
    options: [
      { label: '全部版本', value: 'all' },
      { label: '1.8.3', value: '1.8.3' },
      { label: '1.8.2', value: '1.8.2' },
    ],
  },
]

const trendData = [
  { name: '05-10', value: 412600, compareValue: 428100 },
  { name: '05-11', value: 410820, compareValue: 421400 },
  { name: '05-12', value: 397430, compareValue: 416900 },
  { name: '05-13', value: 386200, compareValue: 410500 },
  { name: '05-14', value: 372400, compareValue: 408200 },
  { name: '05-15', value: 356920, compareValue: 407800 },
]

const createWidgets = (dashboardId: string, template: DashboardLayoutTemplate): DashboardWidgetAsset[] => {
  const baseWidgets: DashboardWidgetAsset[] = [
    {
      id: `${dashboardId}-w1`,
      title: '广告观看次数趋势',
      description: '保存自事件分析，用于日常监控广告观看下降。',
      widgetType: 'line',
      chartType: 'line',
      sourceAnalysisId: 'analysis-ad-watch-drop',
      sourceAnalysisType: 'event',
      acceptGlobalTime: true,
      acceptGlobalFilters: true,
      status: 'normal',
      refreshStatus: 'normal',
      lastRefreshAt: '2026-05-18T15:10:00+02:00',
      chartData: trendData,
    },
    {
      id: `${dashboardId}-w2`,
      title: '广告完成率指标卡',
      description: '广告观看完成次数 / 广告开始播放次数。',
      widgetType: 'metric_card',
      chartType: 'metric',
      sourceAnalysisId: 'analysis-ad-watch-drop',
      sourceAnalysisType: 'event',
      acceptGlobalTime: true,
      acceptGlobalFilters: true,
      status: 'normal',
      refreshStatus: 'normal',
      lastRefreshAt: '2026-05-18T15:10:00+02:00',
      metricValue: '72.6%',
      metricChange: '-6.3%',
      chartData: [],
    },
    {
      id: `${dashboardId}-w3`,
      title: '低金币用户分布',
      description: '按金币余额等级拆解广告观看用户。',
      widgetType: 'bar',
      chartType: 'bar',
      sourceAnalysisId: 'analysis-gold-distribution',
      sourceAnalysisType: 'distribution',
      acceptGlobalTime: true,
      acceptGlobalFilters: true,
      status: template === 'operation_monitoring' ? 'error' : 'normal',
      refreshStatus: template === 'operation_monitoring' ? 'failed' : 'normal',
      errorMessage: template === 'operation_monitoring' ? '引用的分布分析配置刷新失败。' : undefined,
      lastRefreshAt: '2026-05-18T15:10:00+02:00',
      chartData: [
        { name: '低金币', value: 42860 },
        { name: '正常金币', value: 32540 },
        { name: '高金币', value: 13940 },
      ],
    },
    {
      id: `${dashboardId}-w4`,
      title: '广告位观看占比',
      description: '不同广告位贡献占比。',
      widgetType: 'donut',
      chartType: 'donut',
      sourceAnalysisId: 'analysis-ad-watch-drop',
      sourceAnalysisType: 'event',
      acceptGlobalTime: true,
      acceptGlobalFilters: false,
      status: 'normal',
      refreshStatus: 'normal',
      lastRefreshAt: '2026-05-18T15:10:00+02:00',
      chartData: [
        { name: '金币不足弹窗', value: 46 },
        { name: '任务中心', value: 28 },
        { name: '结算页', value: 18 },
        { name: '首页入口', value: 8 },
      ],
    },
    {
      id: `${dashboardId}-w5`,
      title: '广告明细 Top 分组',
      description: '仪表盘明细表组件，保存自事件分析表格。',
      widgetType: 'table',
      chartType: 'table',
      sourceAnalysisId: 'analysis-ad-watch-drop',
      sourceAnalysisType: 'event',
      acceptGlobalTime: true,
      acceptGlobalFilters: true,
      status: 'normal',
      refreshStatus: 'normal',
      lastRefreshAt: '2026-05-18T15:10:00+02:00',
      chartData: [],
      tableRows: [
        { dimension: '低金币 / 金币不足弹窗', metric: '广告观看次数', value: '128,420', change: '-18.6%' },
        { dimension: '低金币 / 任务中心', metric: '广告观看次数', value: '82,310', change: '-9.4%' },
        { dimension: '正常金币 / 结算页', metric: '广告观看次数', value: '64,880', change: '-3.2%' },
      ],
    },
  ]

  if (template === 'blank') {
    return []
  }

  return baseWidgets
}

const createLayout = (widgets: DashboardWidgetAsset[]): DashboardLayoutItem[] =>
  widgets.map((widget, index) => ({
    widgetId: widget.id,
    x: index % 2,
    y: Math.floor(index / 2),
    w: widget.widgetType === 'line' || widget.widgetType === 'table' ? 2 : 1,
    h: widget.widgetType === 'metric_card' ? 1 : 2,
  }))

const createDashboard = (
  id: string,
  name: string,
  spaceType: DashboardAsset['spaceType'],
  visibility: DashboardAsset['visibility'],
  layoutTemplate: DashboardLayoutTemplate,
  updatedAt: string,
  overrides: Partial<DashboardAsset> = {},
): DashboardAsset => {
  const widgets = overrides.widgets ?? createWidgets(id, layoutTemplate)
  const errorWidgetCount = widgets.filter((widget) => widget.refreshStatus === 'failed').length

  return {
    id,
    type: overrides.type ?? 'normal',
    name,
    description: overrides.description ?? '保存到仪表盘的数据概览，用于日常监控和复盘。',
    folderId: overrides.folderId,
    spaceType,
    spaceId: overrides.spaceId ?? (spaceType === 'team' ? 'space-team-operation' : spaceType === 'public' ? 'space-public' : 'space-personal'),
    spaceName: overrides.spaceName ?? (spaceType === 'team' ? '运营团队空间' : spaceType === 'public' ? '公共空间' : '个人空间'),
    visibility,
    ownerId: overrides.ownerId ?? 'u_chaoyang',
    ownerName: overrides.ownerName ?? 'Chaoyang Xu',
    tags: overrides.tags ?? ['广告', '运营监控'],
    status: overrides.status ?? (errorWidgetCount > 0 ? 'has_error_widget' : 'normal'),
    groupType: overrides.groupType,
    webConfig: overrides.webConfig,
    widgetCount: widgets.length,
    errorWidgetCount,
    lastRefreshedAt: overrides.lastRefreshedAt ?? updatedAt,
    createdAt: overrides.createdAt ?? '2026-05-10T10:00:00+02:00',
    updatedAt,
    widgets,
    globalFilters: overrides.globalFilters ?? defaultGlobalFilters,
    layout: overrides.layout ?? createLayout(widgets),
    layoutTemplate,
    favorite: overrides.favorite ?? false,
  }
}

export const mockDashboardAssets: DashboardAsset[] = [
  createDashboard('dash-ad-operation', '广告运营监控仪表盘', 'personal', 'private', 'operation_monitoring', '2026-05-18T15:10:00+02:00', {
    description: '包含广告观看次数趋势、广告完成率、广告收益和低金币用户分布等组件。',
    favorite: true,
    tags: ['广告', '运营监控', '低金币'],
  }),
  createDashboard('dash-team-retention', '新用户留存仪表盘', 'team', 'team', 'retention_analysis', '2026-05-17T18:20:00+02:00', {
    ownerName: 'Mia Chen',
    ownerId: 'u_mia',
    tags: ['留存', '新用户'],
  }),
  createDashboard('dash-experiment-review', '低金币激励实验复盘', 'team', 'team', 'experiment_review', '2026-05-16T12:30:00+02:00', {
    tags: ['实验复盘', '低金币'],
  }),
  createDashboard('dash-executive', '经营管理层概览', 'public', 'public', 'executive_overview', '2026-05-15T09:40:00+02:00', {
    tags: ['管理层', '运营监控'],
  }),
  createDashboard('dash-empty-draft', '临时分析仪表盘草稿', 'personal', 'private', 'blank', '2026-05-14T20:00:00+02:00', {
    description: '空白仪表盘，用于临时拖拽组件。',
    tags: ['草稿'],
  }),
  createDashboard('dash-web-weekly-doc', '运营周报网页仪表盘', 'personal', 'private', 'blank', '2026-05-13T16:00:00+02:00', {
    type: 'web',
    description: '嵌入外部网页或云文档，用于集中查看运营周报。',
    tags: ['网页仪表盘', '云文档'],
    widgets: [],
    webConfig: {
      url: 'https://example.com',
      urlType: 'external_web',
      carryToken: false,
      iframeSandbox: ['allow-scripts', 'allow-same-origin', 'allow-forms'],
      allowInteraction: true,
      allowEditEmbeddedContent: false,
    },
  }),
]

export const mockRecentVisitItems: AnalysisCenterAssetItem[] = [
  {
    id: 'recent-analysis-ad-watch',
    assetId: 'analysis-ad-watch-drop',
    assetName: '广告观看下降分析',
    assetType: 'saved_analysis',
    moduleName: '事件分析',
    description: '最近打开的保存分析配置。',
    ownerName: 'Chaoyang Xu',
    tags: ['广告', '低金币'],
    visitedAt: '2026-05-18T16:05:00+02:00',
  },
  {
    id: 'recent-dashboard-ad',
    assetId: 'dash-ad-operation',
    assetName: '广告运营监控仪表盘',
    assetType: 'dashboard',
    moduleName: '仪表盘',
    description: '最近查看的运营监控仪表盘。',
    ownerName: 'Chaoyang Xu',
    tags: ['运营监控'],
    visitedAt: '2026-05-18T15:50:00+02:00',
  },
  {
    id: 'recent-dashboard-exp',
    assetId: 'dash-experiment-review',
    assetName: '低金币激励实验复盘',
    assetType: 'dashboard',
    moduleName: '仪表盘',
    description: '团队实验复盘仪表盘。',
    ownerName: 'Mia Chen',
    tags: ['实验复盘'],
    visitedAt: '2026-05-17T20:10:00+02:00',
  },
]

export const mockRecycleBinItems: AnalysisCenterAssetItem[] = [
  {
    id: 'recycle-analysis-1',
    assetId: 'analysis-old-event',
    assetName: '旧版广告入口分析',
    assetType: 'saved_analysis',
    moduleName: '事件分析',
    description: '引用旧版广告入口事件的保存分析。',
    ownerName: 'Chaoyang Xu',
    tags: ['广告'],
    deletedAt: '2026-05-18T10:20:00+02:00',
    expireAt: '2026-06-17T10:20:00+02:00',
    originalLocation: '个人空间 / 我的分析',
    deletedByName: 'Chaoyang Xu',
  },
  {
    id: 'recycle-dashboard-1',
    assetId: 'dash-quality-old',
    assetName: '旧版数据质量监控仪表盘',
    assetType: 'dashboard',
    moduleName: '仪表盘',
    description: '已删除的数据质量监控仪表盘。',
    ownerName: 'Chaoyang Xu',
    tags: ['数据质量'],
    deletedAt: '2026-05-17T18:40:00+02:00',
    expireAt: '2026-06-16T18:40:00+02:00',
    originalLocation: '团队空间 / 数据分析团队',
    deletedByName: 'Chaoyang Xu',
  },
  {
    id: 'recycle-widget-1',
    assetId: 'dash-ad-operation-w-old',
    assetName: '旧版广告收益表格',
    assetType: 'dashboard_widget',
    moduleName: '仪表盘组件',
    description: '从广告运营监控仪表盘删除的表格组件。',
    ownerName: 'Chaoyang Xu',
    tags: ['广告'],
    deletedAt: '2026-05-16T12:15:00+02:00',
    expireAt: '2026-06-15T12:15:00+02:00',
    originalLocation: '广告运营监控仪表盘',
    deletedByName: 'Mia Chen',
  },
]
