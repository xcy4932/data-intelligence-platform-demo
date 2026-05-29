import type { EntityId, ISODateString, ISODateTimeString, Owner } from './common'
import type { ProfileSubjectType } from './profile'

export type GroupProfileReportType = 'label' | 'metric' | 'mixed'
export type GroupProfileUpdateMode = 'manual' | 'daily'
export type GroupProfileStatus = 'draft' | 'pending_query' | 'running' | 'success' | 'failed' | 'partial_success' | 'deleted' | 'invalid'
export type GroupProfileSegmentRole = 'target' | 'compare'
export type GroupProfileSegmentSourceType = 'existing' | 'custom_rule'
export type GroupProfileChartType = 'column' | 'bar' | 'pie' | 'donut' | 'table' | 'line' | 'card'
export type GroupProfileAnalysisType = 'label' | 'metric'
export type GroupProfileRatioMode = 'population' | 'effective'
export type GroupProfileSortMode = 'taxonomy' | 'value_asc' | 'value_desc' | 'uv_ratio_asc' | 'uv_ratio_desc' | 'tgi_asc' | 'tgi_desc'
export type GroupProfileGroupMode = 'taxonomy' | 'custom'
export type GroupProfileTemplateType = 'label' | 'metric'
export type GroupProfileTemplateScope = 'personal' | 'project' | 'shared'
export type GroupProfilePermissionLevel = 'view' | 'edit'
export type GroupProfilePrincipalType = 'user' | 'group' | 'role' | 'department'
export type GroupProfileDownloadFormat = 'excel' | 'png'
export type GroupProfileTaskStatus = 'created' | 'queued' | 'running' | 'completed' | 'failed' | 'skipped'
export type GroupProfileMetricChartStatus = 'pending_query' | 'success' | 'failed'
export type GroupProfileMetricDimensionType = 'time' | 'tag' | 'segment' | 'attribute' | 'detail' | 'behavior'
export type GroupProfileMetricSourceType = 'tag' | 'defined_metric' | 'new_metric'
export type GroupProfileMetricBuildType = 'single' | 'formula'
export type GroupProfileMetricConditionSource = 'behavior' | 'detail' | 'tag' | 'attribute'
export type GroupProfileDateRangeMode = 'single' | 'fixed' | 'dynamic'
export type GroupProfileTgiCalculationType = 'label_ratio' | 'label_effective_ratio'
export type GroupProfileTgiScope = 'project' | 'report' | 'template'
export type GroupProfileTgiStatus = 'enabled' | 'disabled' | 'invalid'
export type GroupProfileTgiBaseType = 'segment' | 'tag'
export type GroupProfileSaveSegmentMode = 'selected_tags' | 'report_segment'
export type GroupProfileConditionLogic = 'all' | 'any'
export type GroupProfileResourceType = 'tag' | 'segment' | 'behavior' | 'detail' | 'attribute'
export type GroupProfileQueryTaskType = 'manual' | 'scheduled'
export type GroupProfileAuditAction =
  | 'create_report'
  | 'edit_report'
  | 'delete_report'
  | 'download_report'
  | 'copy_embed_link'
  | 'grant_report'
  | 'revoke_report'
  | 'save_segment'
  | 'create_template'
  | 'share_template'
  | 'update_tgi'
  | 'query_report'
  | 'copy_report'

export interface GroupProfilePermissionSet {
  viewReport: boolean
  createManualReport: boolean
  createDailyReport: boolean
  viewTemplate: boolean
  manageTemplate: boolean
  metricAnalysis: boolean
  downloadReport: boolean
  embedReport: boolean
  managePermission: boolean
  manageTgi: boolean
  projectAdmin: boolean
}

export interface GroupProfileFeatureFlags {
  customTgiEnabled: boolean
  metricAnalysisPurchased: boolean
  aiSummaryPurchased: boolean
  anonymousEmbedEnabled: boolean
  dataPermissionEnabled: boolean
}

export interface GroupProfileSubject {
  type: ProfileSubjectType
  name: string
  description: string
  default: boolean
}

export interface GroupProfileReportGroup {
  id: EntityId
  name: string
  description: string
}

export interface GroupProfileSegmentOption {
  id: EntityId
  name: string
  subjectType: ProfileSubjectType
  subjectName: string
  outputIdType: string
  groupId: EntityId
  groupName: string
  count: number
  status: 'available' | 'empty' | 'invalid'
  creator: Owner
  updatedAt: ISODateTimeString
  permission: boolean
}

export interface GroupProfileCondition {
  id: EntityId
  source: GroupProfileMetricConditionSource | 'segment'
  sourceName: string
  field: string
  label: string
  operator: string
  value: string | number | boolean | Array<string | number>
  relation: 'include' | 'exclude'
}

export interface GroupProfileRuleConfig {
  satisfyLogic: GroupProfileConditionLogic
  satisfyConditions: GroupProfileCondition[]
  excludeLogic: GroupProfileConditionLogic
  excludeConditions: GroupProfileCondition[]
  version: number
}

export interface GroupProfileReportSegment {
  id: EntityId
  segmentId?: EntityId
  reportId: EntityId
  segmentName: string
  originalName: string
  role: GroupProfileSegmentRole
  sourceType: GroupProfileSegmentSourceType
  subjectType: ProfileSubjectType
  subjectName: string
  outputIdType: string
  ruleConfig?: GroupProfileRuleConfig
  estimatedCount: number
  estimateStatus: 'success' | 'failed' | 'running' | 'pending'
  failedReason?: string
}

export interface GroupProfileLabelValueInsight {
  id: EntityId
  tagId: EntityId
  tagName: string
  tagGroup: string
  value: string
  taxonomyOrder: number
  uv: number
  segmentTotal: number
  tagValidUv: number
  projectValueUv: number
  projectTotalUv: number
  projectTagValidUv: number
  labelRatio: number
  labelEffectiveRatio: number
  marketTgi: number
  labelTgi: number
  dataUpdatedAt: ISODateString
  permission: boolean
  selected: boolean
}

export interface GroupProfileLabelChartConfig {
  tagId: EntityId
  tagName: string
  tagGroup: string
  selectedValues: string[]
  topN: number
  sortMode?: GroupProfileSortMode
  showTgi?: boolean
  linkageTagIds: EntityId[]
}

export interface GroupProfileMetricDefinition {
  id: EntityId
  name: string
  description: string
  groupName: string
  buildType: GroupProfileMetricBuildType
  conditionSource?: GroupProfileMetricConditionSource
  conditionResourceId?: EntityId
  displayFormat: 'integer' | 'decimal' | 'percent_integer' | 'percent_decimal'
  idType: string
  formula?: string
}

export interface GroupProfileResourcePermission {
  id: EntityId
  resourceType: GroupProfileResourceType
  resourceId: EntityId
  resourceName: string
  groupName: string
  permission: boolean
  reason?: string
}

export interface GroupProfileMetricDimensionOption {
  id: EntityId
  dimensionType: GroupProfileMetricDimensionType
  field: string
  name: string
  groupName: string
  valueType: 'text' | 'number' | 'date' | 'boolean'
  permission: boolean
  reason?: string
}

export interface GroupProfileDateRange {
  mode: GroupProfileDateRangeMode
  singleDate?: ISODateString
  startDate?: ISODateString
  endDate?: ISODateString
  dynamicValue?: 'last_7_days' | 'last_30_days' | 'this_week' | 'this_month' | 'last_month'
}

export interface GroupProfileMetricPoint {
  dimension: string
  segmentName: string
  value: number
  formattedValue: string
  ratio?: number
}

export interface GroupProfileMetricChartConfig {
  chartType: Extract<GroupProfileChartType, 'line' | 'column' | 'card' | 'table'>
  xAxisType: GroupProfileMetricDimensionType
  xAxisField: string
  yAxisSourceType: GroupProfileMetricSourceType
  yAxisMetricId: EntityId
  metric?: GroupProfileMetricDefinition
  dateRange: GroupProfileDateRange
  displayFormat: GroupProfileMetricDefinition['displayFormat']
}

export interface GroupProfileChartGroup {
  id: EntityId
  name: string
  orderIndex: number
}

export interface GroupProfileChart {
  id: EntityId
  reportId: EntityId
  chartType: GroupProfileChartType
  analysisType: GroupProfileAnalysisType
  title: string
  labelConfig?: GroupProfileLabelChartConfig
  metricConfig?: GroupProfileMetricChartConfig
  labelValues: GroupProfileLabelValueInsight[]
  metricPoints: GroupProfileMetricPoint[]
  sortConfig: GroupProfileSortMode
  displayConfig: {
    visibleValues: string[]
    topN: number
    ratioMode: GroupProfileRatioMode
    showTgi: boolean
  }
  linkageConfig: {
    enabled: boolean
    selectedValue?: string
    linkedChartIds: EntityId[]
    linkedTagIds: EntityId[]
  }
  groupName: string
  orderIndex: number
  status: GroupProfileMetricChartStatus
  errorMessage?: string
}

export interface GroupProfileInterpretationFeature {
  id: EntityId
  tagName: string
  tagValue: string
  uv: number
  ratio: number
  tgi: number
  score: number
}

export interface GroupProfileScatterPoint {
  id: EntityId
  tagName: string
  tagValue: string
  uv: number
  ratio: number
  tgi: number
}

export interface GroupProfileReportPermission {
  id: EntityId
  reportId: EntityId
  principalType: GroupProfilePrincipalType
  principalId: EntityId
  principalName: string
  permission: GroupProfilePermissionLevel
  createdBy: Owner
  createdAt: ISODateTimeString
}

export interface GroupProfileRuntimePermission {
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  canDownload: boolean
  canAuthorize: boolean
  canEmbed: boolean
  canCopy: boolean
}

export interface GroupProfileScheduleConfig {
  updateMode: GroupProfileUpdateMode
  executeTime?: string
  startDate?: ISODateString
  endDate?: ISODateString
  queuePolicy?: 'queue' | 'skip'
  nextRunAt?: ISODateTimeString
}

export interface GroupProfileDataPermissionSnapshot {
  ownerId: EntityId
  ownerName: string
  calculatedAt: ISODateTimeString
  resourceSummary: string
}

export interface GroupProfileReport {
  id: EntityId
  name: string
  description: string
  subjectType: ProfileSubjectType
  subjectName: string
  reportType: GroupProfileReportType
  groupId: EntityId
  groupName: string
  updateMode: GroupProfileUpdateMode
  scheduleConfig: GroupProfileScheduleConfig
  status: GroupProfileStatus
  creator: Owner
  createdAt: ISODateTimeString
  updatedAt: ISODateTimeString
  dataUpdatedAt: ISODateString
  deletedAt?: ISODateTimeString
  favorite: boolean
  segments: GroupProfileReportSegment[]
  charts: GroupProfileChart[]
  chartGroups: GroupProfileChartGroup[]
  globalSortMode: GroupProfileSortMode
  groupMode: GroupProfileGroupMode
  ratioMode: GroupProfileRatioMode
  showTgi: boolean
  permissions: GroupProfileReportPermission[]
  runtimePermission: GroupProfileRuntimePermission
  dataPermissionSnapshot?: GroupProfileDataPermissionSnapshot
  tgiConfigId?: EntityId
  invalidReason?: string
}

export interface GroupProfileReportSearchFilters {
  keyword: string
  groupIds: EntityId[]
  subjectTypes: ProfileSubjectType[]
  reportTypes: GroupProfileReportType[]
  creatorIds: EntityId[]
  updateModes: GroupProfileUpdateMode[]
  favoriteState: 'all' | 'favorite' | 'not_favorite'
  createdRange?: [number, number] | null
  updatedRange?: [number, number] | null
  page: number
  pageSize: number
}

export interface GroupProfileReportSearchResult {
  rows: GroupProfileReport[]
  total: number
  page: number
  pageSize: number
}

export interface GroupProfileTemplate {
  id: EntityId
  name: string
  description: string
  templateType: GroupProfileTemplateType
  scope: GroupProfileTemplateScope
  config: {
    chartIds: EntityId[]
    labels: EntityId[]
    metrics: EntityId[]
    groupMode: GroupProfileGroupMode
    sortMode: GroupProfileSortMode
    charts?: GroupProfileChart[]
    chartGroups?: GroupProfileChartGroup[]
  }
  creator: Owner
  createdAt: ISODateTimeString
  updatedAt: ISODateTimeString
  sharedWith: GroupProfileReportPermission[]
  runtimePermission: {
    canUse: boolean
    canEdit: boolean
    canDelete: boolean
    canShare: boolean
  }
}

export interface GroupProfileTgiConfig {
  id: EntityId
  name: string
  subjectType: ProfileSubjectType
  subjectName: string
  calculationType: GroupProfileTgiCalculationType
  baseType: GroupProfileTgiBaseType
  baseSegmentId: EntityId
  baseSegmentName: string
  baseSegmentCount: number
  baseTagId?: EntityId
  baseTagName?: string
  scope: GroupProfileTgiScope
  scopeTargetName: string
  status: GroupProfileTgiStatus
  formulaPreview: string
  creator: Owner
  updatedAt: ISODateTimeString
}

export interface GroupProfileDownloadTask {
  id: EntityId
  reportId: EntityId
  format: GroupProfileDownloadFormat
  status: GroupProfileTaskStatus
  fileName: string
  includeAiSummary: boolean
  createdAt: ISODateTimeString
  message: string
}

export interface GroupProfileQueryTaskChartResult {
  chartId: EntityId
  chartTitle: string
  status: GroupProfileMetricChartStatus | 'running'
  errorMessage?: string
}

export interface GroupProfileQueryTask {
  id: EntityId
  reportId: EntityId
  taskType: GroupProfileQueryTaskType
  status: GroupProfileTaskStatus
  stage: 'created' | 'validating' | 'calculating' | 'writing' | 'done'
  createdAt: ISODateTimeString
  updatedAt: ISODateTimeString
  completedAt?: ISODateTimeString
  pollCount: number
  chartResults: GroupProfileQueryTaskChartResult[]
  message: string
}

export interface GroupProfileScheduleTask {
  id: EntityId
  reportId: EntityId
  reportName: string
  scheduledAt: ISODateTimeString
  status: GroupProfileTaskStatus
  queuePolicy: 'queue' | 'skip'
  queryTaskId?: EntityId
  message: string
  createdAt: ISODateTimeString
  updatedAt: ISODateTimeString
}

export interface GroupProfileAuditLog {
  id: EntityId
  userId: EntityId
  userName: string
  action: GroupProfileAuditAction
  reportId?: EntityId
  resourceType: 'report' | 'template' | 'tgi'
  resourceId?: EntityId
  resourceName?: string
  before?: string
  after?: string
  metadata?: Record<string, string | number | boolean | undefined>
  requestId: string
  ip: string
  createdAt: ISODateTimeString
}

export interface GroupProfileWorkbenchData {
  permissions: GroupProfilePermissionSet
  featureFlags: GroupProfileFeatureFlags
  subjects: GroupProfileSubject[]
  groups: GroupProfileReportGroup[]
  segmentOptions: GroupProfileSegmentOption[]
  labels: Array<{ id: EntityId; name: string; groupName: string; valueType: 'single' | 'multi' | 'number'; realtime: boolean; permission: boolean; values: string[] }>
  resourcePermissions: GroupProfileResourcePermission[]
  metricDimensionOptions: GroupProfileMetricDimensionOption[]
  metricDefinitions: GroupProfileMetricDefinition[]
  reports: GroupProfileReport[]
  templates: GroupProfileTemplate[]
  tgiConfigs: GroupProfileTgiConfig[]
  queryTasks: GroupProfileQueryTask[]
  scheduleTasks: GroupProfileScheduleTask[]
  auditLogs: GroupProfileAuditLog[]
}

export interface GroupProfileSaveReportPayload {
  report: GroupProfileReport
  firstSave: boolean
}

export interface GroupProfileDuplicateReportOptions {
  keepDailySchedule?: boolean
}

export interface GroupProfileSaveSegmentPayload {
  mode: GroupProfileSaveSegmentMode
  reportId: EntityId
  selectedTagValueIds: EntityId[]
  segmentIds: EntityId[]
  conditionLogic: GroupProfileConditionLogic
  outputIdType: string
  name: string
  description: string
  authorizedTo: string[]
  groupId: EntityId
}

export interface GroupProfileDownloadPayload {
  reportId: EntityId
  format: GroupProfileDownloadFormat
  includeAiSummary: boolean
  currentRatioMode: GroupProfileRatioMode
  currentSortMode: GroupProfileSortMode
  visibleValueSnapshot: Record<EntityId, string[]>
}

export interface GroupProfileActionResult {
  ok: boolean
  id?: EntityId
  message: string
}
