export type AdModuleGateReason =
  | 'version_closed'
  | 'not_purchased'
  | 'not_deployed'
  | 'no_permission'
  | 'data_not_ready'
  | 'id_mapping_not_ready'
  | 'monitoring_data_not_ready'
  | 'iad_required'

export type AdReportType = 'effect' | 'media_channel'

export type AdTemplateStatus = 'enabled' | 'disabled' | 'deleted'

export type AdReportStatus = 'enabled' | 'deleted'

export type AdMetricType = 'single' | 'composite'

export type AdMetricDisplayFormat = 'integer' | 'decimal' | 'percent_integer' | 'percent_decimal'

export type AdMetricCreatorType = 'system' | 'user'

export type AdBehaviorSemantic = 'impression' | 'click' | 'lead' | 'test_drive' | 'deal'

export type AdMetricConditionSource = 'media_monitor' | 'behavior' | 'detail' | 'tag' | 'property'

export type AdMetricStatistic = 'users' | 'times' | 'sum' | 'avg' | 'max' | 'min'

export type AdMetricCalculationObject = 'user' | 'event' | 'field' | 'tag' | 'property'

export type AdMetricAggregationMethod = 'none' | 'distinct_count' | 'sum' | 'avg' | 'max' | 'min'

export type AdFilterRelation = 'AND' | 'OR'

export type AdAudienceFilterType = 'tag' | 'behavior' | 'segment'

export type AdAudienceConditionFieldType = 'tag' | 'behavior' | 'segment' | 'property' | 'detail'

export type AdAudienceConditionOperator =
  | 'eq'
  | 'neq'
  | 'in'
  | 'not_in'
  | 'contains'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'between'

export type AdExportSourceType = 'detail' | 'funnel' | 'path_node' | 'path_link' | 'frequency' | 'overlap'

export type AdOutputIdType = 'base_id' | 'mobile' | 'device_id' | 'one_id'

export type AdTrendMetric = 'impressions' | 'clicks' | 'cost' | 'ctr' | 'avgCpc'

export type AdQueryFailureReason =
  | 'data_source_unavailable'
  | 'metric_formula_error'
  | 'permission_denied'
  | 'post_event_missing'
  | 'data_ingestion_incomplete'
  | 'ad_report_not_purchased'
  | 'no_data'

export interface AdQueryFailureState {
  reason: AdQueryFailureReason
  title: string
  message: string
  action: string
}

export interface AdPermissionSet {
  viewAnalysis: boolean
  manageReport: boolean
  manageTemplate: boolean
  viewAdReport: boolean
  downloadData: boolean
  createSegment: boolean
}

export interface AdDataPermission {
  channelIds: string[]
  advertiserIds: string[]
  adGroupIds: string[]
  adPlanIds: string[]
  adCreativeIds: string[]
  reportIds: string[]
  subjectTypes: string[]
  tagIds: string[]
  behaviorIds: string[]
  segmentIds: string[]
}

export interface AdAccessContext {
  projectId: string
  userId: string
  userName: string
  currentVersion: string
  isNewUser: boolean
  modulePurchased: boolean
  moduleDeployed: boolean
  dataFusionReady: boolean
  idMappingReady: boolean
  monitoringDataReady: boolean
  dataSourceAvailable: boolean
  vecdpPurchased: boolean
  iadPurchased: boolean
  monitoringLinkSource: 'iad' | 'external'
  permissions: AdPermissionSet
  dataPermission: AdDataPermission
}

export type AdAccessContextPatch = Partial<Omit<AdAccessContext, 'permissions' | 'dataPermission'>> & {
  permissions?: Partial<AdPermissionSet>
  dataPermission?: Partial<AdDataPermission>
}

export interface AdAccessDecision {
  available: boolean
  reasons: AdModuleGateReason[]
  message?: string
}

export interface AdSubjectOption {
  label: string
  value: string
}

export interface AdBehaviorOption {
  label: string
  value: AdBehaviorSemantic
  defaultEventName: string
}

export interface AdEventOption {
  label: string
  value: string
  subjectType: string
}

export interface AdTaxonomyNode {
  id: string
  name: string
  channelId?: string
  advertiserId?: string
  adGroupId?: string
  adPlanId?: string
}

export interface AdReferenceData {
  subjects: AdSubjectOption[]
  behaviorOptions: AdBehaviorOption[]
  eventOptions: AdEventOption[]
  channels: AdTaxonomyNode[]
  advertisers: AdTaxonomyNode[]
  adGroups: AdTaxonomyNode[]
  adPlans: AdTaxonomyNode[]
  adCreatives: AdTaxonomyNode[]
}

export interface AdMetadataTemplate {
  id: string
  name: string
  subjectType: string
  description: string
  status: AdTemplateStatus
  creatorId: string
  creatorName: string
  createdAt: string
  updatedAt: string
  behaviorEventConfig: AdBehaviorEventConfig[]
  metricConfig: AdMetricConfig[]
}

export interface AdBehaviorEventConfig {
  id: string
  templateId: string
  adBehavior: AdBehaviorSemantic | ''
  eventName: string
  displayName: string
  orderIndex: number
}

export interface AdMetricCondition {
  variable: string
  source: AdMetricConditionSource
  calculationObject?: AdMetricCalculationObject
  eventName?: string
  fieldName?: string
  fieldDisplayName?: string
  idType?: AdOutputIdType
  statistic: AdMetricStatistic
  aggregationMethod?: AdMetricAggregationMethod
  filters: AdMetricFilterCondition[]
}

export interface AdMetricFilterCondition {
  id: string
  fieldType: 'behavior_property' | 'tag' | 'property' | 'detail_field'
  fieldName: string
  operator: 'eq' | 'neq' | 'in' | 'not_in' | 'contains' | 'gt' | 'gte' | 'lt' | 'between'
  value: string
}

export interface AdMetricConfig {
  id: string
  templateId: string
  name: string
  description: string
  group?: string
  metricType: AdMetricType
  formula: string
  conditions: AdMetricCondition[]
  displayFormat: AdMetricDisplayFormat
  creatorId: string
  creatorName: string
  creatorType: AdMetricCreatorType
  isRemovable: boolean
}

export interface AdAnalysisReport {
  id: string
  name: string
  templateId: string
  templateName: string
  reportType: AdReportType
  defaultTimeRange?: [string, string]
  channelIds: string[]
  creatorId: string
  creatorName: string
  authorizedUserIds: string[]
  editableUserIds: string[]
  downloadableUserIds: string[]
  exportableUserIds: string[]
  createdAt: string
  updatedAt: string
  status: AdReportStatus
}

export interface AdReportSearchRequest {
  keyword: string
  reportType: AdReportType | 'all'
  creatorId?: string
  page: number
  pageSize: number
}

export interface AdReportSearchResponse {
  list: AdAnalysisReport[]
  total: number
  permissions: AdPermissionSet
}

export interface AdReportSavePayload {
  id?: string
  name: string
  templateId: string
  reportType: AdReportType
  defaultTimeRange?: [string, string]
}

export interface AdTemplateSavePayload {
  id?: string
  name: string
  subjectType: string
  description: string
  behaviorEventConfig: AdBehaviorEventConfig[]
  metricConfig: AdMetricConfig[]
}

export interface AdAudienceFilter {
  id: string
  type: AdAudienceFilterType
  name: string
  operator: 'include' | 'exclude'
  relation?: AdFilterRelation
  conditions?: AdAudienceCondition[]
}

export interface AdAudienceCondition {
  id: string
  fieldType: AdAudienceConditionFieldType
  fieldName: string
  operator: AdAudienceConditionOperator
  value: string
  timeRange?: string
}

export interface AdTimeRangeQuery {
  start: string
  end: string
}

export interface AdEffectQueryRequest {
  reportId: string
  aggregateDimensions: string[]
  channels: string[]
  advertisers: string[]
  adGroups: string[]
  adPlans: string[]
  adCreatives: string[]
  timeRange: AdTimeRangeQuery
  crowdFilter: AdAudienceFilter[]
  selectedMetricIds: string[]
}

export interface AdEffectResult {
  queryId: string
  summary: AdSummaryMetric[]
  detailRows: AdEffectDetailRow[]
  funnel: AdFunnelStage[]
  channelDistribution: Record<string, AdChannelDistribution[]>
}

export interface AdSummaryMetric {
  key: string
  label: string
  value: number
  unit?: string
  change: number
}

export interface AdEffectDetailRow {
  rowId: string
  dimensionKey: string
  dimensionName: string
  channelId: string
  channelName: string
  advertiserName: string
  adGroupName: string
  adPlanName: string
  adCreativeName: string
  impressionsUsers: number
  impressions: number
  clickUsers: number
  clicks: number
  leadUsers: number
  testDriveUsers: number
  dealUsers: number
  ctr: number
  leadRate: number
  conversionRate: number
  cost: number
  avgCpc: number
  customMetrics: Record<string, number>
}

export interface AdFunnelStage {
  id: string
  eventName: string
  name: string
  users: number
  times: number
  conversionRate: number
}

export interface AdChannelDistribution {
  channelId: string
  channelName: string
  value: number
  rate: number
}

export interface AdMediaQueryRequest {
  reportId: string
  channels: string[]
  timeRange: AdTimeRangeQuery
  startEvent: string
  endEvent: string
  middleEvents: string[]
  crowdFilter: AdAudienceFilter[]
  conversionSteps: number
  frequencyEvent?: string
  overlapEvent?: string
}

export interface AdMediaResult {
  queryId: string
  path: AdPathResult
  frequency: AdFrequencyRow[]
  overlap: AdOverlapResult
}

export interface AdPathNode {
  id: string
  name: string
  depth: number
  value: number
  rate: number
  channelId?: string
}

export interface AdPathLink {
  source: string
  target: string
  value: number
  rate: number
  channelId: string
  pathLevel: number
  description: string
}

export interface AdPathResult {
  nodes: AdPathNode[]
  links: AdPathLink[]
}

export interface AdFrequencyRow {
  channelId: string
  channelName: string
  onceUsers: number
  twiceUsers: number
  threeUsers: number
  fourUsers: number
  fiveUsers: number
  moreThanFiveUsers: number
  convertedUsers: number
  conversionRate: number
}

export interface AdOverlapCell {
  rowChannelId: string
  columnChannelId: string
  users: number
  percentage: number
}

export interface AdOverlapResult {
  channels: AdTaxonomyNode[]
  cells: AdOverlapCell[]
}

export interface AdReportQueryRequest {
  mediaChannels: string[]
  advertisers: string[]
  adGroups: string[]
  adCreatives: string[]
  timeRange: AdTimeRangeQuery
  metric: AdTrendMetric
}

export interface AdDailyTrendPoint {
  date: string
  impressions: number
  clicks: number
  cost: number
  ctr: number
  avgCpc: number
}

export interface AdReportResult {
  queryId: string
  trend: AdDailyTrendPoint[]
  detailRows: AdReportDetailRow[]
}

export interface AdReportDetailRow {
  rowId: string
  channelId: string
  channelName: string
  advertiserName: string
  adGroupName: string
  adCreativeName: string
  impressions: number
  clicks: number
  cost: number
  ctr: number
  avgCpc: number
  conversionUsers: number
  conversionRate: number
}

export interface AdExportSegmentPayload {
  reportId?: string
  sourceType: AdExportSourceType
  sourceName: string
  sourceConfig: Record<string, unknown>
  outputIdType: AdOutputIdType | ''
  segmentName: string
  description: string
  authTargets: string[]
  groupIds: string[]
  estimatedUsers: number
}

export interface AdExportSegmentResult {
  segmentId: string
  segmentName: string
  createdAt: string
}

export interface AdDownloadRequest {
  source: string
  reportId?: string
  sourceConfig: Record<string, unknown>
  rows: Array<Record<string, unknown>>
}

export interface AdDownloadResult {
  taskId: string
  fileName: string
  fileUrl: string
  mimeType: string
  rowCount: number
  createdAt: string
  expiresAt?: string
}

export interface AdAuditLog {
  id: string
  userId: string
  userName: string
  action: string
  actionLabel: string
  reportId?: string
  templateId?: string
  entityId?: string
  entityName?: string
  sourceType?: string
  sourceConfig: Record<string, unknown>
  requestId?: string
  ip: string
  createdAt: string
}

export interface AdValidationResult {
  valid: boolean
  message?: string
}

export interface AdDataPrerequisiteStatus {
  projectId: string
  dataFusionReady: boolean
  idMappingReady: boolean
  monitoringDataReady: boolean
  missingItems: Array<'data_fusion' | 'id_mapping' | 'monitoring_data'>
}

export interface AdApiMutationResult {
  success: boolean
  message?: string
}
