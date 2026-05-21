export type HeatmapPlatform = 'web' | 'mobile'

export type HeatmapAnalysisType =
  | 'click_heatmap'
  | 'point_heatmap'
  | 'reach_heatmap'
  | 'comparison'
  | 'clicked_users'

export type HeatmapStatus = 'draft' | 'active' | 'disabled' | 'deleted'

export type HeatmapMode = 'click_heatmap' | 'point_heatmap' | 'reach_heatmap' | 'comparison'

export type HeatmapDefinitionType = 'url' | 'title'

export type HeatmapPreviewStatus = 'not_checked' | 'matched' | 'no_data' | 'invalid'

export type HeatmapSortMetric =
  | 'updated_at_desc'
  | 'created_at_desc'
  | 'yesterday_pv_desc'
  | 'yesterday_click_desc'
  | 'bounce_rate_desc'

export type HeatmapElementSortMetric =
  | 'click_count'
  | 'click_user_count'
  | 'click_rate'
  | 'click_share'
  | 'exposure_click_rate'

export type HeatmapReachSectionType = 'screen' | 'percent'

export type HeatmapPointGranularity = 'fine' | 'standard' | 'coarse'

export type HeatmapShareScope = 'private' | 'project' | 'specified' | 'public'

export type HeatmapMobileSessionStatus =
  | 'waiting_scan'
  | 'opening_app'
  | 'connected'
  | 'page_changed'
  | 'expired'
  | 'error'

export interface HeatmapDateRange {
  type: 'relative' | 'absolute'
  value: 'yesterday' | 'last_7_days' | 'last_14_days' | 'custom'
  startDate: string
  endDate: string
}

export interface HeatmapUrlRule {
  pathOperator: 'equals' | 'contains' | 'regex'
  pagePath: string
  queryOperator: 'empty' | 'any' | 'equals' | 'contains' | 'regex'
  queryValue: string
  includeSubPath: boolean
}

export interface HeatmapTitleRule {
  titleOperator: 'equals' | 'contains' | 'regex'
  pageTitle: string
}

export interface HeatmapHashRule {
  hashEnabled: boolean
  hashPathOperator: 'equals' | 'contains' | 'regex'
  hashPath: string
  hashQueryOperator: 'empty' | 'any' | 'equals' | 'contains' | 'regex'
  hashQueryValue: string
}

export interface HeatmapPageGroup {
  id: string
  name: string
  baseUrl: string
  domain: string
  definitionType: HeatmapDefinitionType
  urlRule: HeatmapUrlRule
  titleRule: HeatmapTitleRule
  hashRule: HeatmapHashRule
  previewStatus: HeatmapPreviewStatus
  matchedPageCount: number
}

export interface HeatmapVersion {
  id: string
  heatmapId: string
  versionName: string
  versionDesc: string
  baseUrl: string
  snapshotUrl?: string
  validStartTime?: string
  validEndTime?: string
  isDefault: boolean
  archived: boolean
  createdBy: string
  createdAt: string
}

export interface HeatmapMetricSnapshot {
  pv: number
  uv: number
  clickCount: number
  bounceRate: number
  avgStaySeconds: number
  avgReachDepth: number
  pageClickRate: number
  firstScreenVisibleSeconds: number
}

export interface HeatmapTrendPoint {
  date: string
  pv: number
  uv: number
  clickCount: number
}

export interface HeatmapListItem {
  id: string
  name: string
  platform: HeatmapPlatform
  analysisTypes: HeatmapAnalysisType[]
  status: HeatmapStatus
  pageGroup?: HeatmapPageGroup
  currentVersionId: string
  currentVersionName: string
  createdBy: string
  createdAt: string
  updatedAt: string
  lastViewedAt?: string
  description: string
  yesterday: HeatmapMetricSnapshot
  previousDay: HeatmapMetricSnapshot
  trend: HeatmapTrendPoint[]
  dashboardReferenced: boolean
}

export interface HeatmapListFilter {
  keyword: string
  platform: 'all' | HeatmapPlatform
  analysisType: 'all' | HeatmapAnalysisType
  creator: 'all' | string
  sortBy: HeatmapSortMetric
}

export interface HeatmapQueryConfig {
  heatmapId: string
  mode: HeatmapMode
  versionId: string
  dateRange: HeatmapDateRange
  deviceType: 'all' | 'pc' | 'mobile' | 'tablet'
  browser: 'all' | 'Chrome' | 'Safari' | 'Firefox' | 'Edge'
  os: 'all' | 'Windows' | 'macOS' | 'iOS' | 'Android'
  userFilterText: string
  sortMetric: HeatmapElementSortMetric
  topN: number
  selectedElementKey?: string
  selectedPointId?: string
  overlayOpacity: number
  showClickableElements: boolean
  hideHeatLayer: boolean
  pointGranularity: HeatmapPointGranularity
  reachSectionType: HeatmapReachSectionType
  comparison: {
    leftVersionId: string
    rightVersionId: string
    viewMode: 'side_by_side' | 'overlay_diff' | 'metric_table' | 'rank_change'
    leftDateRange?: {
      startDate: string
      endDate: string
    }
    rightDateRange?: {
      startDate: string
      endDate: string
    }
    leftDevice?: HeatmapQueryConfig['deviceType']
    rightDevice?: HeatmapQueryConfig['deviceType']
    leftUserFilterText?: string
    rightUserFilterText?: string
  }
}

export interface HeatmapElementStat {
  elementKey: string
  elementText: string
  elementType: string
  eventDesc: string
  clickCount: number
  clickUserCount: number
  clickRate: number
  clickShare: number
  exposureCount: number
  exposureUserCount: number
  exposureClickRate: number
  x: number
  y: number
  width: number
  height: number
  visible: boolean
  isClickable: boolean
  rank: number
}

export interface HeatmapClickPoint {
  id: string
  x: number
  y: number
  count: number
  userCount: number
  elementKey?: string
  elementText?: string
  isClickable: boolean
  avgClickSecond: number
  anomalyType?: 'single_point' | 'same_coordinate' | 'non_clickable' | 'blank_area' | 'machine_like'
}

export interface HeatmapReachSection {
  sectionIndex: number
  startY: number
  endY: number
  reachUserCount: number
  reachRate: number
  avgStayMs: number
  clickCount: number
  sectionName: string
}

export interface HeatmapComparisonRow {
  elementKey: string
  elementText: string
  leftClickCount: number
  rightClickCount: number
  clickDelta: number
  clickDeltaRateLabel: string
  clickRateDelta: number
  rankChange: string
  status: 'new' | 'disappeared' | 'up' | 'down' | 'flat'
}

export interface HeatmapQueryResult {
  heatmap: HeatmapListItem
  versions: HeatmapVersion[]
  currentVersion: HeatmapVersion
  summary: HeatmapMetricSnapshot
  elements: HeatmapElementStat[]
  points: HeatmapClickPoint[]
  reachSections: HeatmapReachSection[]
  comparisonRows: HeatmapComparisonRow[]
  warnings: string[]
  queriedAt: string
}

export interface HeatmapClickedUser {
  userId: string
  firstClickTime: string
  lastClickTime: string
  clickCount: number
  device: 'PC' | 'Mobile' | 'Tablet'
  browser: string
  os: string
  city: string
  userAttributes: string[]
  anomalyTypes: string[]
}

export interface HeatmapCreatePayload {
  name: string
  platform: HeatmapPlatform
  analysisTypes: HeatmapAnalysisType[]
  description: string
  pageGroup: HeatmapPageGroup
  version: Omit<HeatmapVersion, 'id' | 'heatmapId' | 'isDefault' | 'archived' | 'createdBy' | 'createdAt'>
}

export interface HeatmapSaveAnalysisPayload {
  name: string
  folder: string
  description: string
  favorite: boolean
  config: HeatmapQueryConfig
}

export interface HeatmapDashboardPayload {
  title: string
  dashboard: string
  widgetType:
    | 'heatmap_metric'
    | 'heatmap_snapshot'
    | 'heatmap_rank'
    | 'heatmap_reach'
    | 'heatmap_comparison'
    | 'heatmap_trend'
  refreshPolicy: 'open' | 'hourly' | 'manual' | 'snapshot'
  timeRangePolicy: 'follow_current' | 'fixed'
  size: 'medium' | 'large'
  config: HeatmapQueryConfig
}

export interface HeatmapSharePayload {
  shareName: string
  scope: HeatmapShareScope
  specifiedTargets?: string[]
  expiresInDays: number
  allowUserList: boolean
  allowCopy: boolean
  passwordEnabled: boolean
  password?: string
  config: HeatmapQueryConfig
}

export interface HeatmapActionResult {
  success: boolean
  id: string
  message: string
  shareUrl?: string
  qrCodeText?: string
}
