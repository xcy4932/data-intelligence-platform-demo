import type {
  SavedAnalysis,
  SavedAnalysisType,
  SavedAnalysisVisibility,
} from './eventAnalysis'

export type AnalysisAssetStatus = 'normal' | 'invalid' | 'no_permission' | 'archived'

export type SavedAnalysisViewMode = 'card' | 'table'

export type SavedAnalysisOwnerFilter = 'all' | 'me' | 'team'

export type SavedAnalysisUpdatedFilter = 'all' | 'today' | 'last_7_days' | 'last_30_days'

export type SavedAnalysisSortMode = 'updated_desc' | 'updated_asc' | 'name_asc'

export interface SavedAnalysisAsset extends SavedAnalysis {
  status: AnalysisAssetStatus
  spaceId: string
  folderName: string
  spaceName: string
  summary: string
  metricSummary: string[]
  filterSummary: string[]
  chartSummary: string
  favorite: boolean
  invalidReasons?: string[]
}

export interface SavedAnalysisFilters {
  keyword: string
  analysisType: SavedAnalysisType | 'all'
  visibility: SavedAnalysisVisibility | 'all'
  owner: SavedAnalysisOwnerFilter
  tags: string[]
  updatedAt: SavedAnalysisUpdatedFilter
  status: AnalysisAssetStatus | 'all'
  sortMode: SavedAnalysisSortMode
}

export interface SavedAnalysisStats {
  total: number
  event: number
  retention: number
  funnel: number
  invalid: number
}

export interface SavedAnalysisListResult {
  stats: SavedAnalysisStats
  items: SavedAnalysisAsset[]
  tags: string[]
}

export type DashboardAssetStatus =
  | 'normal'
  | 'has_error_widget'
  | 'no_permission'
  | 'archived'
  | 'draft'
  | 'published'
  | 'unpublished'
  | 'deleted'

export type DashboardType = 'normal' | 'web'

export type DashboardPublishMode = 'realtime' | 'versioned'

export type DashboardSpaceFilter = 'all' | 'personal' | 'team' | 'public'

export type DashboardOwnerFilter = 'all' | 'me' | 'team'

export type DashboardUpdatedFilter = 'all' | 'today' | 'last_7_days' | 'last_30_days'

export type DashboardSortMode = 'updated_desc' | 'updated_asc' | 'name_asc'

export type DashboardPermissionRole = 'viewer' | 'editor' | 'admin'

export type DashboardLayoutTemplate =
  | 'blank'
  | 'operation_monitoring'
  | 'retention_analysis'
  | 'experiment_review'
  | 'executive_overview'

export type DashboardComponentType =
  | 'chart'
  | 'global_filter'
  | 'dynamic_field'
  | 'global_parameter'
  | 'query_container'
  | 'tabs'
  | 'text'
  | 'web'
  | 'image'
  | 'header_image'
  | 'title_image'
  | 'divider'
  | 'relation_graph'
  | 'stitched_table'
  | 'tooltip'
  | 'analysis_tree'
  | 'plugin'
  | 'top_container'

export type DashboardLayoutMode = 'tile' | 'free'

export interface DashboardTheme {
  id: string
  name: string
  scope: 'personal' | 'project' | 'system'
  dashboardConfig: {
    layoutMode?: DashboardLayoutMode
    canvasBackground?: DashboardSettings['canvasBackground']
    padding?: {
      top: number
      right: number
      bottom: number
      left: number
    }
    appearance?: Record<string, unknown>
    adaptiveComponentColors?: boolean
  }
  chartConfig: {
    title?: Record<string, unknown>
    discreteColorScheme?: string[]
    continuousColorScheme?: string[]
    lineStyle?: Record<string, unknown>
    legendStyle?: Record<string, unknown>
    tableStyle?: Record<string, unknown>
    metricCardStyle?: Record<string, unknown>
  }
}

export interface DashboardWebConfig {
  url: string
  urlType: 'dashboard_embed' | 'external_web' | 'cloud_doc'
  carryToken: boolean
  iframeSandbox?: string[]
  originalDashboardId?: string
  allowInteraction: boolean
  allowEditEmbeddedContent: boolean
}

export interface DashboardEditLock {
  dashboardId: string
  userId: string
  userName: string
  lockedAt: string
  expireAt: string
  lockExpireAt: string
  heartbeatAt: string
}

export interface DashboardWidgetAsset {
  id: string
  title: string
  description?: string
  widgetType:
    | 'metric_card'
    | 'line'
    | 'stacked'
    | 'bar'
    | 'dual_axis'
    | 'donut'
    | 'pie'
    | 'percentage'
    | 'cumulative'
    | 'table'
    | 'retention_heatmap'
    | 'funnel'
    | 'distribution'
  chartType?: string
  sourceAnalysisId?: string
  sourceAnalysisType?: SavedAnalysisType
  acceptGlobalTime: boolean
  acceptGlobalFilters: boolean
  status: 'normal' | 'loading' | 'empty' | 'error' | 'invalid'
  refreshStatus: 'normal' | 'failed' | 'stale'
  errorMessage?: string
  lastRefreshAt?: string
  metricValue?: string
  metricChange?: string
  tableRows?: DashboardWidgetTableRow[]
  chartData: DashboardWidgetDataPoint[]
}

export interface DashboardWidgetDataPoint {
  name: string
  value: number
  compareValue?: number
  category?: string
}

export interface DashboardWidgetTableRow {
  dimension: string
  metric: string
  value: string
  change: string
}

export interface DashboardGlobalFilter {
  id: string
  label: string
  value: string
  options: Array<{
    label: string
    value: string
  }>
}

export interface DashboardLayoutItem {
  widgetId: string
  x: number
  y: number
  w: number
  h: number
}

export interface DashboardComponentLayout {
  x: number
  y: number
  width: number
  height: number
  floating: boolean
  minWidth?: number
  minHeight?: number
}

export interface DashboardComponent {
  id: string
  dashboardId: string
  pageId: string
  type: DashboardComponentType
  name: string
  order: number
  zIndex: number
  layout: DashboardComponentLayout
  visible: boolean
  locked?: boolean
  groupId?: string
  props: Record<string, unknown>
  widget?: DashboardWidgetAsset
  createdAt: string
  updatedAt: string
}

export interface DashboardPage {
  id: string
  dashboardId: string
  name: string
  order: number
  visibleInViewMode: boolean
  layoutMode?: 'inherit' | DashboardLayoutMode
  components: DashboardComponent[]
  createdAt: string
  updatedAt: string
}

export interface DashboardSettings {
  themeId?: string
  customThemes?: DashboardTheme[]
  layoutMode: DashboardLayoutMode
  canvasBackground: {
    color?: string
    opacity?: number
    imageUrl?: string
  }
  canvasSize: {
    mode: 'preset' | 'custom' | 'adaptive'
    width?: number
    height?: number
  }
  viewMode: {
    anchorDefaultExpanded: boolean
    toolbarGlobalControlEnabled: boolean
    tooltipIconGlobalControlEnabled: boolean
    toolbarDefaultCollapsed: boolean
    visibleToolbarActions: string[]
    visibleTooltipIcons: string[]
    adaptiveWidthMode?: 'none' | 'scale_both' | 'scale_width_only'
  }
  autoRefresh?: {
    enabled: boolean
    intervalSeconds: number
  }
  commentAdvanced?: {
    enabled: boolean
  }
  mobileLayout?: {
    enabled: boolean
    configId?: string
  }
  padding?: {
    top: number
    right: number
    bottom: number
    left: number
  }
  appearance?: {
    fillColor?: string
    borderColor?: string
    borderWidth?: number
    borderRadius?: number
    autoAdaptComponentColor?: boolean
  }
}

export interface DashboardBookmark {
  id: string
  name: string
  scope: 'private' | 'public'
  filterState: Record<string, string>
  activePageId: string
  createdBy: string
  createdAt: string
}

export interface DashboardComment {
  id: string
  dashboardId: string
  pageId: string
  componentId: string
  chartId?: string
  parentCommentId?: string
  content: string
  mentions: string[]
  locator?: CommentLocator
  createdBy: string
  createdAt: string
  updatedAt?: string
  deletedAt?: string
}

export interface CommentLocator {
  type: 'chart' | 'table_cell'
  rowKey?: string
  columnKey?: string
  pageIndex?: number
  filterState?: Record<string, string>
}

export interface DashboardVersion {
  id: string
  dashboardId: string
  versionNo: number
  description?: string
  snapshot: DashboardPage[]
  status: 'published' | 'history'
  createdBy: string
  createdAt: string
}

export interface DashboardSubscription {
  id: string
  title: string
  description?: string
  scope: 'all_pages' | 'selected_pages' | 'bookmark' | 'quick_bookmark'
  sheetIds: string[]
  bookmarkId?: string
  quickBookmarkState?: Record<string, string>
  triggerType: 'schedule' | 'data_ready'
  schedule: string
  language?: 'auto' | 'zh-CN' | 'en-US'
  appendDate?: boolean
  interpretationEnabled?: boolean
  contentConfig: {
    includeLink: boolean
    screenshotMode: 'flat' | 'thumbnail' | 'none'
    includePdf: boolean
    includeScreenshotTime: boolean
    includeManageLink: boolean
    remark?: string
  }
  pushChannel:
    | 'feishu'
    | 'feishu_group'
    | 'wechat_work'
    | 'wechat_work_group'
    | 'webex'
    | 'webex_group'
    | 'email'
    | 'email_group'
    | 'dingtalk'
    | 'dingtalk_group'
    | 'dingtalk_normal_group'
    | 'generic_im'
    | 'webhook'
  receiverIds?: string[]
  webhookConfigId?: string
  permissionPrincipal?: string
  lastStatus: 'pending' | 'success' | 'failed' | 'retry_scheduled'
  failureReason?: string
  notifyOnChange?: boolean
  notifyTarget?: 'receivers' | 'creator'
  createdAt: string
}

export interface DashboardMonitor {
  id: string
  name: string
  componentId: string
  dateField?: string
  timeRangeMode?: 'latest_one' | 'latest_n' | 'selected_range'
  recentPointCount?: number
  triggerFactor: 'metric_change' | 'dimension_change' | 'smart_detection'
  compareRange: string
  compareMethod?: 'fluctuation' | 'increase' | 'decrease' | 'gt' | 'gte' | 'lt' | 'lte' | 'eq'
  compareValueType?: 'number' | 'percent' | 'other_metric'
  metricConditionMode?: 'any_condition' | 'all_conditions' | 'all_data' | 'any_data'
  ruleRelation?: 'AND' | 'OR'
  dimensionLogic?: 'AND' | 'OR'
  dimensionFilters?: string
  rule: string
  scheduleMode?: 'schedule' | 'data_ready'
  schedule: string
  timezone?: string
  earliestTriggerTime?: string
  pushChannel: 'feishu' | 'email' | 'wechat_work' | 'webex' | 'dingtalk' | 'webhook'
  receiver?: string
  groupIds?: string
  webhookConfigId?: string
  suggestionText?: string
  suggestionUrl?: string
  showConditionInAlert?: boolean
  lastAlertStatus?: 'idle' | 'success' | 'failed'
  failureLog?: string
  testSent: boolean
  createdAt: string
}

export type DashboardWebhookInterfaceType =
  | 'api'
  | 'generic_im_robot'
  | 'dingtalk_robot'
  | 'wechat_work_robot'
  | 'feishu_external_robot'

export type DashboardWebhookSubscribedEvent = 'subscription_push' | 'comment' | 'monitor_alert'

export interface DashboardWebhookConfig {
  id: string
  projectId: string
  name: string
  url: string
  secretType?: 'none' | 'static_token' | 'dynamic_token'
  staticToken?: string
  dynamicTokenConfig?: {
    tokenApiUrl: string
    tokenParamName: string
  }
  remark?: string
  interfaceType: DashboardWebhookInterfaceType
  subscribedEvents: DashboardWebhookSubscribedEvent[]
  createdBy: string
  createdAt: string
  lastTestStatus?: 'not_tested' | 'success' | 'failed'
  failureLog?: string
}

export interface DashboardFolder {
  id: string
  name: string
  parentId?: string
  groupType: 'personal' | 'shared' | 'public'
  canWrite: boolean
  createdAt: string
}

export interface DashboardAsset {
  id: string
  projectId?: string
  type?: DashboardType
  name: string
  description?: string
  folderId?: string
  spaceType: 'personal' | 'team' | 'public'
  spaceId: string
  spaceName: string
  groupType?: 'personal' | 'shared' | 'public'
  visibility: 'private' | 'team' | 'public'
  ownerId: string
  ownerName: string
  tags: string[]
  status: DashboardAssetStatus
  publishMode?: DashboardPublishMode
  currentPublishedVersionId?: string
  isDefaultForCurrentUser?: boolean
  webConfig?: DashboardWebConfig
  settings?: DashboardSettings
  pages?: DashboardPage[]
  publishedPages?: DashboardPage[]
  bookmarks?: DashboardBookmark[]
  comments?: DashboardComment[]
  versions?: DashboardVersion[]
  subscriptions?: DashboardSubscription[]
  monitors?: DashboardMonitor[]
  editingLock?: DashboardEditLock
  redirectConfig?: {
    enabled: boolean
    url: string
  }
  announcementConfig?: {
    enabled: boolean
    content: string
  }
  multiLangConfig?: {
    enabled: boolean
    locale: 'zh-CN' | 'en-US'
    names: Record<string, string>
  }
  widgetCount: number
  errorWidgetCount: number
  lastRefreshedAt: string
  createdAt: string
  updatedAt: string
  widgets: DashboardWidgetAsset[]
  layoutTemplate: DashboardLayoutTemplate
  favorite: boolean
  globalFilters?: DashboardGlobalFilter[]
  layout?: DashboardLayoutItem[]
}

export interface DashboardFilters {
  keyword: string
  spaceType: DashboardSpaceFilter
  visibility: 'all' | 'private' | 'team' | 'public'
  owner: DashboardOwnerFilter
  favoriteOnly?: boolean
  tags: string[]
  updatedAt: DashboardUpdatedFilter
  status: DashboardAssetStatus | 'all'
  sortMode: DashboardSortMode
}

export interface DashboardCreatePayload {
  name: string
  description?: string
  type?: DashboardType
  folderId?: string
  webUrl?: string
  spaceType: 'personal' | 'team' | 'public'
  spaceId: string
  visibility: 'private' | 'team' | 'public'
  layoutTemplate: DashboardLayoutTemplate
  tags: string[]
}

export interface DashboardListResult {
  items: DashboardAsset[]
  tags: string[]
  folders?: DashboardFolder[]
  defaultDashboardId?: string
}

export interface DashboardCopyPayload {
  name: string
  targetSpaceId: string
  targetFolderId?: string
  copyChartResources: boolean
}

export interface DashboardFolderCreatePayload {
  name: string
  groupType: 'personal' | 'public'
  parentId?: string
}

export interface DashboardTemplate {
  id: string
  projectId?: string
  name: string
  description?: string
  coverImageUrl?: string
  sourceDashboardId?: string
  scope: 'official' | 'project' | 'personal'
  resourcePackageUrl: string
  layoutTemplate?: DashboardLayoutTemplate
  requiresDatasetMapping?: boolean
  createdBy: string
  createdAt: string
}

export interface DashboardTemplateImportPayload {
  packageName: string
  targetFolderId: string
}

export interface DashboardTemplateExportPayload {
  dashboardId: string
  name: string
  description?: string
  desensitizeSampleData: boolean
  saveToLibrary: boolean
}

export interface DashboardTemplateApplyPayload {
  templateId: string
  name: string
  targetFolderId: string
  datasetMappings?: Record<string, string>
}

export type AnalysisCenterAssetType = 'saved_analysis' | 'dashboard' | 'dashboard_widget' | 'temporary_query'

export interface AnalysisCenterAssetItem {
  id: string
  assetId: string
  assetName: string
  assetType: AnalysisCenterAssetType
  moduleName: string
  description: string
  ownerName: string
  tags: string[]
  visitedAt?: string
  favoritedAt?: string
  deletedAt?: string
  expireAt?: string
  originalLocation?: string
  deletedByName?: string
}

export type AnalysisCenterSpaceType = 'personal' | 'team' | 'public'

export interface AnalysisCenterSpace {
  id: string
  name: string
  type: AnalysisCenterSpaceType
  description?: string
  ownerName: string
  assetCount: number
  canWrite: boolean
  canDelete: boolean
  createdAt: string
  updatedAt: string
}

export interface SpaceCreatePayload {
  name: string
  type: AnalysisCenterSpaceType
  description?: string
}

export interface ShareAssetPayload {
  assetId: string
  assetType: 'saved_analysis' | 'dashboard'
  visibility: 'private' | 'team' | 'public'
  targetSpaceId?: string
  allowCopy: boolean
  permissionRole?: DashboardPermissionRole
  notifyEnabled?: boolean
  addMemberIds: string[]
  addTeamIds: string[]
  removeMemberIds: string[]
  removeTeamIds: string[]
}

export interface ShareAssetResult {
  success: boolean
  message: string
  shareLink: string
  sharedMembers: SharePrincipal[]
  sharedTeams: SharePrincipal[]
}

export interface SharePrincipal {
  id: string
  name: string
  description?: string
}

export interface ShareOptions {
  members: SharePrincipal[]
  teams: SharePrincipal[]
}
