export type PermissionAction =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'enable'
  | 'disable'
  | 'export'
  | 'verify'
  | 'approve'
  | 'manage'

export type PermissionResource =
  | 'metadata.event'
  | 'metadata.eventProperty'
  | 'metadata.userProperty'
  | 'metadata.virtualEvent'
  | 'metadata.virtualProperty'
  | 'metadata.visualEvent'
  | 'metadata.session'
  | 'dataIntegration.task'
  | 'tracking.realtimeVerify'
  | 'tracking.verifyReport'
  | 'governance.dashboard'
  | 'governance.ingestionDetail'
  | 'governance.rule'
  | 'governance.alert'
  | 'governance.cost'
  | 'efficiency.eventCategory'
  | 'efficiency.dimensionDictionary'
  | 'efficiency.lineage'

export interface Permission {
  projectId: string
  appId?: string
  resource: PermissionResource
  actions: PermissionAction[]
}

export type EnvironmentType = 'saas_cloud_native' | 'saas_non_cloud_native' | 'private_deployment'
export type Region = 'cn_beijing' | 'cn_guangzhou' | 'ap_southeast_johor' | 'custom'

export type Platform =
  | 'android'
  | 'ios'
  | 'harmonyos'
  | 'web_js'
  | 'wechat_mp'
  | 'mini_game'
  | 'quick_app'
  | 'windows'
  | 'linux'
  | 'macos'
  | 'wechat_official_account'
  | 'flutter'
  | 'server_java'
  | 'server_php'
  | 'server_golang'
  | 'http_api'

export interface SdkSettings {
  autoTrackEnabled: boolean
  ingestionValidationMode: boolean
  aiCostGovernanceEnabled: boolean
  screenshotCaptureEnabled: boolean
}

export interface AppContext {
  orgId: string
  projectId: string
  appId: string
  appName: string
  environmentType: EnvironmentType
  region: Region
  timezone: string
  sdkSettings: SdkSettings
}

export type MetadataStatus = 'over_limit' | 'disabled' | 'enabled' | 'hidden' | 'pending_approval' | 'blacklist'

export type MetadataManagementKind =
  | 'event'
  | 'event_property'
  | 'user_property'
  | 'virtual_event'
  | 'virtual_property'
  | 'visual_event'
  | 'relation_event'
  | 'session'
  | 'custom_session'

export type MetadataRegistrationSource =
  | 'manual'
  | 'batch_import'
  | 'sdk_detected'
  | 'system_preset'
  | 'integration'
  | 'visual_selection'
  | 'relation_generated'

export type MetadataSensitiveLevel = 'public' | 'internal' | 'sensitive' | 'restricted'

export type MetadataEditableField =
  | 'displayName'
  | 'description'
  | 'categoryId'
  | 'tags'
  | 'owner'
  | 'unit'
  | 'businessDefinition'
  | 'sensitiveLevel'
  | 'status'
  | 'associatedProperties'
  | 'pageConfig'
  | 'sessionRule'

export interface MetadataProductionFields {
  owner?: string
  tags?: string[]
  reportingPlatforms?: Platform[]
  hasIngestedData?: boolean
  registrationSource?: MetadataRegistrationSource
  sensitiveLevel?: MetadataSensitiveLevel
  unit?: string
  businessDefinition?: string
  editableFields?: MetadataEditableField[]
  deleteAllowed?: boolean
}

export interface MetadataStatusRule {
  status: MetadataStatus
  visibleInManagement: boolean
  countQuota: boolean
  buildStorage: boolean
  availableInAnalysis: boolean
  billable: boolean
  exportable: boolean
}

export type PropertyDataType = 'int' | 'float' | 'string' | 'datetime' | 'list' | 'version'

export interface DataTypeRule {
  type: PropertyDataType
  uploadRequirement: string
  analysisRequirement: string
  jsonType: 'number' | 'string' | 'array' | 'object' | 'boolean'
  dbType: string
  constraints: {
    min?: number
    max?: number
    maxLength?: number
    maxElements?: number
    datetimeFormats?: string[]
    versionRegex?: string
  }
}

export interface PresetProperty {
  id: string
  name: string
  displayName: string
  propertyType: 'preset_event_common_property' | 'preset_event_property' | 'preset_user_property'
  platformScope: Platform[] | 'cross_platform'
  dataType: PropertyDataType
  dataSource: 'system_api' | 'fixed_value' | 'user_input' | 'sdk_generated'
  autoCollected: boolean
  switchControlled: boolean
  description: string
  supportedEnvironment: EnvironmentType[]
}

export interface BehaviorUploadPayload {
  user?: {
    user_unique_id?: string
    web_id?: string | number
    device_id?: string | number
    ssid?: string
    [key: string]: unknown
  }
  header: Record<string, unknown>
  events: UploadEvent[]
  local_time?: number
  magic_tag?: string
}

export interface UploadEvent {
  event: string
  params?: Record<string, unknown> | string
  local_time_ms: number
  session_id?: string
  datetime?: string
  [key: string]: unknown
}

export interface UploadValidationStep {
  name: string
  status: 'success' | 'warning' | 'error'
  message: string
}

export interface UploadValidationResult {
  accepted: boolean
  receivedCount: number
  storedCount: number
  discardedCount: number
  abnormalPropertyCount: number
  steps: UploadValidationStep[]
  errors: ErrorLog[]
  normalizedPayload?: BehaviorUploadPayload
}

export interface RecentIngestionHealth {
  receivedEventCount: number
  interceptedEventCount: number
  abnormalPropertyCount: number
  delayRate: number
  healthyScore: number
}

export interface ReportEndpoint {
  platform: Platform
  environmentType: EnvironmentType
  region: Region
  endpointType: 'client' | 'server' | 'http_single' | 'http_batch' | 'openapi' | 'user_profile_api' | 'item_api'
  url: string
  sdkConfigHint?: string
  whitelistHint?: string[]
  supported: boolean
  unsupportedReason?: string
}

export interface DataIntegrationTask {
  id: string
  appId: string
  taskName: string
  description?: string
  sourceType: 'uba_event_data' | 'user_profile_data'
  configMode: 'visual_mapping' | 'custom_upload'
  kafkaConfig?: KafkaConfig
  fieldMappings: FieldMapping[]
  status: 'draft' | 'testing' | 'running' | 'paused' | 'failed' | 'completed'
  lastRunAt?: string
  syncedCount: number
  failedCount: number
  latestError?: string
  latencySeconds: number
  createdBy: string
  createdAt: string
}

export interface KafkaConfig {
  consumerGroup: string
  bootstrapServers: string[]
  topic: string
  authType: 'none' | 'sasl_plaintext' | 'sasl_ssl'
  username?: string
  password?: string
}

export interface FieldMapping {
  sourceField: string
  targetField: string
  targetType: 'header' | 'user' | 'event' | 'event_param' | 'user_profile'
  dataType: PropertyDataType
  required: boolean
  transformExpression?: string
}

export interface EventMetadata extends MetadataProductionFields {
  id: string
  appId: string
  eventName: string
  displayName?: string
  description?: string
  categoryId?: string
  sourceType: 'preset' | 'custom' | 'integrated' | 'relation_generated'
  status: MetadataStatus
  isPreset: boolean
  isRelationEvent?: boolean
  isPassiveEvent?: boolean
  propertyCount: number
  commonPropertyCount: number
  screenshotCount: number
  recent30dQueryCount: number
  recent30dQueryUserCount: number
  yesterdayIngestCount: number
  createdAt: string
  updatedAt: string
  createdBy: string
  associatedPropertyIds: string[]
}

export interface PendingEvent {
  id: string
  eventName: string
  firstSeenAt: string
  sampleCount: number
  sampleProperties: string[]
}

export interface PendingEventProperty {
  id: string
  propertyName: string
  eventName: string
  detectedType: PropertyDataType
  sampleValue: string
  firstSeenAt: string
  sampleCount: number
}

export interface PendingUserProperty {
  id: string
  propertyName: string
  detectedType: PropertyDataType
  sampleValue: string
  firstSeenAt: string
  sampleCount: number
}

export interface EventPropertyMetadata extends MetadataProductionFields {
  id: string
  appId: string
  propertyName: string
  displayName?: string
  description?: string
  dataType: PropertyDataType
  propertyScope: 'event_param' | 'event_common_header'
  associatedEventIds: string[]
  isPreset: boolean
  status: MetadataStatus
  dictionaryStatus: DictionaryStatus
  createdAt: string
  updatedAt: string
}

export interface UserPropertyMetadata extends MetadataProductionFields {
  id: string
  appId: string
  propertyName: string
  displayName?: string
  description?: string
  dataType: PropertyDataType
  calculationLogic: 'all_values' | 'latest_value'
  isPreset: boolean
  status: MetadataStatus
  dictionaryStatus: DictionaryStatus
  createdAt: string
  updatedAt: string
}

export type DictionaryStatus = 'none' | 'uploaded' | 'processing' | 'effective' | 'failed'

export interface DictionaryFile {
  id: string
  propertyId: string
  propertyKind: 'event' | 'user' | 'virtual'
  fileName: string
  status: DictionaryStatus
  rowCount: number
  content?: string
  previewRows: Array<{ rawValue: string, translatedValue: string }>
  uploadedAt: string
}

export interface FilterCondition {
  field: string
  operator: '=' | '!=' | 'contains' | 'regex' | '>' | '<' | '>=' | '<=' | 'in'
  value: string
}

export interface VirtualEvent extends MetadataProductionFields {
  id: string
  appId: string
  eventName: string
  displayName: string
  description?: string
  combinedEvents: VirtualEventComponent[]
  status: 'enabled' | 'disabled'
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface VirtualEventComponent {
  eventId: string
  eventName: string
  filters: FilterCondition[]
}

export interface ReferencedProperty {
  propertyId: string
  propertyName: string
  propertyKind: 'event_property' | 'user_property'
}

export interface VirtualProperty extends MetadataProductionFields {
  id: string
  appId: string
  propertyType: 'event_virtual_property' | 'user_virtual_property'
  propertyName: string
  displayName?: string
  description?: string
  dataType: Exclude<PropertyDataType, 'version'>
  sqlExpression: string
  associationMode?: 'any_referenced_property_has_value' | 'all_referenced_properties_have_value'
  referencedProperties: ReferencedProperty[]
  status: 'valid' | 'invalid' | 'deleted'
  invalidReason?: string
  dictionaryStatus?: DictionaryStatus
  createdAt: string
  updatedAt: string
}

export interface SqlValidationResult {
  valid: boolean
  outputType?: PropertyDataType
  referencedProperties: ReferencedProperty[]
  errors: Array<{ code: string, message: string, start?: number, end?: number }>
}

export interface VisualEvent extends MetadataProductionFields {
  id: string
  eventName: string
  description?: string
  platform: 'web' | 'app'
  pageName: string
  pageRule: string
  elementName: string
  recent48hTriggerCount: number
  recent48hUserCount: number
  status: 'enabled' | 'disabled'
  createdAt: string
}

export interface VisualSelectionSession {
  id: string
  platform: VisualEvent['platform']
  targetUrl?: string
  qrCodeUrl?: string
  toolMode: 'browse' | 'select' | 'heatmap'
  highlightDefined: boolean
  status: 'created' | 'active' | 'failed'
  message: string
  createdAt: string
}

export interface RelationEventPreview {
  activeEventName: string
  passiveEventName: string
  targetUserCount: number
  generatedCount: number
  inactiveParam: string
  inlineParam: string
  sourceUuid: string
}

export interface WebSessionConfig {
  appId: string
  intervalMinutes: number
  updatedBy: string
  updatedAt: string
}

export interface CustomSession extends MetadataProductionFields {
  id: string
  appId: string
  sessionName: string
  displayName: string
  description?: string
  platformScope: Platform[]
  eventScope: {
    mode: 'all_events' | 'selected_events'
    eventIds: string[]
    filters?: FilterCondition[]
  }
  cutRule: {
    type: 'time_gap' | 'start_end_event'
    gapMinutes?: number
  }
  startEventId?: string
  endEventId?: string
  status: 'enabled' | 'disabled'
  createdAt: string
  updatedAt: string
}

export interface EventCategory {
  id: string
  appId: string
  scope: 'public' | 'private'
  ownerUserId?: string
  name: string
  description?: string
  isDefault?: boolean
  sortOrder: number
  eventIds: string[]
  createdAt: string
  updatedAt: string
}

export interface LineageItem {
  id: string
  objectType: 'event' | 'event_property' | 'user_property' | 'dictionary_value'
  objectId: string
  usageType: 'chart' | 'dashboard' | 'segment'
  name: string
  containerName?: string
  analysisToolType?: string
  referenceMode: 'direct' | 'indirect'
  referencePath: string
  recentQueryAt?: string
  queryCount30d?: number
  creator: string
  updatedAt: string
}

export interface RealtimeVerifySession {
  id: string
  appId: string
  platform: 'android' | 'ios' | 'web_js' | 'wechat_mp' | 'server_java'
  verifyMode: 'quick' | 'metadata' | 'requirement'
  status: 'created' | 'connected' | 'verifying' | 'paused' | 'ended' | 'expired'
  targetUrl?: string
  userUniqueId?: string
  qrCodeUrl?: string
  testUrl?: string
  startedAt?: string
  endedAt?: string
}

export interface VerifyEventLog {
  id: string
  eventName: string
  triggerTime: string
  rawPayload: unknown
  validationResult: 'success' | 'failed' | 'manual_success' | 'manual_failed' | 'pending'
  validationMessages: string[]
  remark?: string
  screenshots?: string[]
}

export interface VerifyReport {
  id: string
  appId: string
  reportName: string
  verifySessionId: string
  platform: Platform
  verifyMode: 'metadata' | 'requirement'
  summary: {
    totalEvents: number
    successEvents: number
    failedEvents: number
    manualCorrectedEvents: number
  }
  eventLogs: VerifyEventLog[]
  createdBy: string
  createdAt: string
}

export interface MetadataUsageSummary {
  eventCount: number
  eventPropertyCount: number
  userPropertyCount: number
  virtualEventCount: number
  virtualPropertyCount: number
  visualEventCount: number
}

export interface GovernanceDashboardMetrics {
  eventInterceptRate: number
  dataErrorRate: number
  delayRate: number
  receivedEventCount: number
  interceptedEventCount: number
  abnormalPropertyCount: number
  metadataUsage: MetadataUsageSummary
}

export interface IngestionDetail {
  id: string
  eventName: string
  sdkType?: 'web' | 'mp' | 'app'
  sdkVersion?: string
  errorType: 'event_error' | 'property_error'
  receivedCount: number
  discardedCount: number
  storedCount: number
  abnormalPropertyCount: number
  latestErrorAt?: string
}

export interface ErrorLog {
  id: string
  eventName: string
  errorType: 'event_error' | 'property_error' | 'user_error'
  errorCode: string
  message: string
  rawPayload: string
  receivedAt: string
}

export type ValidationRuleType = 'event_volume' | 'event_property' | 'user_property'

export interface ValidationRule {
  id: string
  ruleName: string
  ruleType: ValidationRuleType
  targetName: string
  conditions: string[]
  intervalMinutes?: number
  alertEnabled: boolean
  interceptEnabled: boolean
  status: 'enabled' | 'disabled'
  createdAt: string
}

export interface AlertRecord {
  id: string
  appId: string
  source: 'custom_validation_rule' | 'ingestion_detail_monitor'
  monitorName: string
  objectType: 'event' | 'event_property' | 'user_property' | 'event_volume'
  targetName?: string
  alertCount: number
  abnormalDataCount: number
  status: 'enabled' | 'disabled'
  lastTriggeredAt?: string
  createdAt: string
  channels: Array<'email' | 'wechat_work'>
  recipients: string[]
  webhook?: string
}

export interface CostGovernanceEvent {
  eventId: string
  eventName: string
  ingestCount30d: number
  queryCount30d: number
  queryUserCount30d: number
  relatedChartCount: number
  costEstimate: number
  roiScore: number
  recommendation: 'keep' | 'disable' | 'merge'
}

export interface CostGovernanceSnapshot {
  consumedEventCount: number
  monthlyAverageEventUsage: number
  aiDiagnostics: Array<{ priority: 'P0' | 'P1' | 'P2', title: string, description: string, action: string }>
  lowRoiEvents: CostGovernanceEvent[]
}

export interface AuditLog {
  id: string
  appId: string
  resourceType: string
  resourceId: string
  action: string
  before?: unknown
  after?: unknown
  operator: string
  operatedAt: string
  ip?: string
}

export interface MetadataTableQuery {
  kind: MetadataManagementKind
  keyword?: string
  status?: MetadataStatus | VirtualEvent['status'] | VirtualProperty['status'] | VisualEvent['status'] | CustomSession['status'] | 'all'
  page?: number
  pageSize?: number
  sortBy?: 'name' | 'displayName' | 'status' | 'owner' | 'updatedAt' | 'recent30dQueryCount' | 'yesterdayIngestCount'
  sortOrder?: 'asc' | 'desc'
  onlyMissingInfo?: boolean
  tags?: string[]
}

export interface MetadataTableRow extends MetadataProductionFields {
  id: string
  kind: MetadataManagementKind
  name: string
  displayName?: string
  description?: string
  status: string
  dataType?: PropertyDataType | Exclude<PropertyDataType, 'version'>
  categoryId?: string
  sourceType?: string
  createdBy?: string
  createdAt?: string
  updatedAt: string
  recent30dQueryCount: number
  recent30dQueryUserCount: number
  yesterdayIngestCount: number
  relatedAssetCount: number
  dictionaryStatus?: DictionaryStatus
}

export interface MetadataTableResult {
  rows: MetadataTableRow[]
  total: number
  page: number
  pageSize: number
}

export type MetadataBatchAction = 'export' | 'enable' | 'hide' | 'disable' | 'delete' | 'update_display' | 'update_owner'

export interface MetadataBatchPayload {
  action: MetadataBatchAction
  kind: MetadataManagementKind
  ids: string[]
  confirmedImpact?: boolean
  patch?: Partial<MetadataProductionFields & {
    displayName: string
    description: string
    categoryId: string
  }>
}

export interface MetadataBatchPreview {
  action: MetadataBatchAction
  kind: MetadataManagementKind
  total: number
  executableCount: number
  blockedCount: number
  blockers: Array<{ id: string, name: string, reason: string }>
  warnings: string[]
}

export interface MetadataBatchResult extends MetadataBatchPreview {
  updatedCount: number
  deletedCount: number
  exportedCsv?: string
}

export interface MetadataDisplayImportRow {
  rowNumber: number
  name: string
  displayName?: string
  description?: string
  categoryId?: string
  owner?: string
  tags?: string[]
  unit?: string
  businessDefinition?: string
  sensitiveLevel?: MetadataSensitiveLevel
}

export interface MetadataDisplayImportResult {
  total: number
  updated: number
  ignored: number
  failed: number
  errors: Array<{ rowNumber: number, name: string, reason: string }>
}

export interface MetadataImpactPreview {
  kind: MetadataManagementKind
  id: string
  name: string
  action: MetadataBatchAction | 'change_type' | 'edit_sql'
  canProceed: boolean
  reason?: string
  recent30dQueryCount: number
  yesterdayIngestCount: number
  relatedCharts: number
  relatedSegments: number
  relatedVirtualAssets: number
  affectedLineage: LineageItem[]
}

export interface ErrorCodeRule {
  code: string
  level: 'event' | 'event_property' | 'event_common_property' | 'user_property' | 'user'
  description: string
  handling: string
}
