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

export type DashboardAssetStatus = 'normal' | 'has_error_widget' | 'no_permission' | 'archived'

export type DashboardSpaceFilter = 'all' | 'personal' | 'team' | 'public'

export type DashboardOwnerFilter = 'all' | 'me' | 'team'

export type DashboardUpdatedFilter = 'all' | 'today' | 'last_7_days' | 'last_30_days'

export type DashboardSortMode = 'updated_desc' | 'updated_asc' | 'name_asc'

export type DashboardLayoutTemplate =
  | 'blank'
  | 'operation_monitoring'
  | 'retention_analysis'
  | 'experiment_review'
  | 'executive_overview'

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

export interface DashboardAsset {
  id: string
  name: string
  description?: string
  spaceType: 'personal' | 'team' | 'public'
  spaceId: string
  spaceName: string
  visibility: 'private' | 'team' | 'public'
  ownerId: string
  ownerName: string
  tags: string[]
  status: DashboardAssetStatus
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
  tags: string[]
  updatedAt: DashboardUpdatedFilter
  status: DashboardAssetStatus | 'all'
  sortMode: DashboardSortMode
}

export interface DashboardCreatePayload {
  name: string
  description?: string
  spaceType: 'personal' | 'team' | 'public'
  spaceId: string
  visibility: 'private' | 'team' | 'public'
  layoutTemplate: DashboardLayoutTemplate
  tags: string[]
}

export interface DashboardListResult {
  items: DashboardAsset[]
  tags: string[]
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
