import type { EntityId, ISODateString, ISODateTimeString, Owner } from './common'

export type AbExperimentType =
  | 'CLIENT_CODE'
  | 'SERVER_CODE'
  | 'VISUAL'
  | 'SPLIT_URL'
  | 'PUSH'
  | 'MAB'
  | 'MVT'
  | 'PERSONALIZATION_WEB'
  | 'PERSONALIZATION_CODE'
  | 'PARENT_CHILD'
  | 'REVERSE'
  | 'AD'

export type AbExperimentStatus =
  | 'DRAFT'
  | 'DEBUGGING'
  | 'READY'
  | 'RUNNING'
  | 'PAUSING'
  | 'PAUSED'
  | 'FROZEN'
  | 'STOPPING'
  | 'STOPPED'
  | 'ENDED'
  | 'ARCHIVED'

export type AbExperimentAction =
  | 'save_draft'
  | 'submit_debug'
  | 'start'
  | 'pause'
  | 'freeze'
  | 'resume'
  | 'stop'
  | 'restart'
  | 'archive'
  | 'edit'
  | 'solidify_feature'
  | 'manage_permission'

export type AbExperimentVisibility = 'PUBLIC' | 'PRIVATE'
export type AbExperimentParamType = 'NUMBER' | 'STRING' | 'BOOLEAN' | 'JSON'
export type AbTerminalType = 'CLIENT' | 'SERVER'
export type AbPermissionLevel = 'none' | 'view' | 'collaborate' | 'admin'
export type AbReportTab = 'conclusion' | 'metrics' | 'advanced' | 'heatmap' | 'mab' | 'sensitive'
export type AbSignificance = 'baseline' | 'positive' | 'negative' | 'neutral' | 'insufficient' | 'error'

export interface AbUserPermissionContext {
  userId: EntityId
  roles: Array<'SUPER_ADMIN' | 'APP_ADMIN' | 'EXPERIMENT_OWNER' | 'COLLABORATOR' | 'VIEWER'>
  permissions: Record<string, boolean>
}

export interface Experiment {
  id: EntityId
  appId: EntityId
  name: string
  description?: string
  type: AbExperimentType
  status: AbExperimentStatus
  ownerId: EntityId
  owner: Owner
  collaboratorIds: EntityId[]
  visibility: AbExperimentVisibility
  businessLineId?: EntityId
  goal: string
  riskNote?: string
  tags: string[]
  durationDays: number
  trafficRatio: number
  coreMetricId?: EntityId | null
  focusMetricIds?: EntityId[]
  metricIds: EntityId[]
  featureIds: EntityId[]
  startedAt?: ISODateTimeString
  endedAt?: ISODateTimeString
  createdAt: ISODateTimeString
  updatedAt: ISODateTimeString
}

export interface ExperimentVariant {
  id: EntityId
  experimentId: EntityId
  name: string
  description?: string
  isControl: boolean
  status: 'ACTIVE' | 'CLOSED'
  trafficRatio: number
  params: Record<string, unknown>
  testUserIds: string[]
  createdAt: ISODateTimeString
  updatedAt: ISODateTimeString
}

export interface ExperimentParamSchema {
  id: EntityId
  experimentId: EntityId
  key: string
  name: string
  type: AbExperimentParamType
  required: boolean
  defaultValue?: unknown
  description?: string
}

export interface ExperimentDraftVariant {
  tempId: EntityId
  name: string
  description?: string
  isControl: boolean
  trafficRatio: number
  params: Record<string, unknown>
  testUserIds: string[]
}

export type TestUserAudienceRequirement = 'IGNORE_AUDIENCE' | 'REQUIRE_AUDIENCE'

export interface ExperimentDraftParamSchema {
  tempId: EntityId
  key: string
  name: string
  type: AbExperimentParamType
  required: boolean
  defaultValue?: unknown
  description?: string
}

export type AudienceConditionSource = 'user' | 'device' | 'event' | 'server'
export type AudienceOperator =
  | 'eq'
  | 'neq'
  | 'in'
  | 'not_in'
  | 'contains'
  | 'not_contains'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'is_null'
  | 'is_not_null'

export interface AudienceCondition {
  id: EntityId
  source: AudienceConditionSource
  field: string
  operator: AudienceOperator
  value?: unknown
  requiredInRequest: boolean
}

export interface AudienceConditionGroup {
  id: EntityId
  relation: 'AND' | 'OR'
  conditions: AudienceCondition[]
}

export interface AudienceFilter {
  relation: 'AND' | 'OR'
  groups: AudienceConditionGroup[]
}

export interface DiversionConfig {
  experimentId: EntityId
  decisionIdType: 'uuid' | 'did' | 'uid' | 'device_id' | 'custom'
  decisionIdField: string
  appKey: string
  exposureMode: 'AUTO' | 'MANUAL'
  filter: AudienceFilter
}

export interface TrafficLayer {
  id: EntityId
  appId: EntityId
  name: string
  description?: string
  ownerId: EntityId
  experimentType: AbTerminalType
  totalTrafficRatio: number
  usedTrafficRatio: number
  availableTrafficRatio: number
  boundMutexDomainId?: EntityId
  usingExperimentIds: EntityId[]
  createdAt: ISODateTimeString
  updatedAt: ISODateTimeString
}

export interface MutexDomainGroup {
  id: EntityId
  appId: EntityId
  name: string
  description?: string
  ownerId: EntityId
  experimentType: AbTerminalType
  domains: MutexDomain[]
  createdAt: ISODateTimeString
  updatedAt: ISODateTimeString
}

export interface MutexDomain {
  id: EntityId
  groupId: EntityId
  name: string
  description?: string
  trafficRatio: number
  parentDomainId?: EntityId
  childDomainIds: EntityId[]
  trafficLayerIds: EntityId[]
  runningExperimentIds: EntityId[]
  createdAt: ISODateTimeString
  updatedAt: ISODateTimeString
}

export interface ExperimentTrafficConfig {
  experimentId: EntityId
  useMutex: boolean
  trafficLayerId?: EntityId
  mutexDomainId?: EntityId
  experimentTrafficRatio: number
  variantTrafficRatios: Record<EntityId, number>
  effectiveMode: 'IMMEDIATE' | 'SMOOTH'
  smoothDurationMinutes?: number
  experienceConsistencyEnabled: boolean
}

export interface ExperimentDraftTrafficConfig {
  useMutex: boolean
  trafficLayerId?: EntityId
  mutexDomainId?: EntityId
  experimentTrafficRatio: number
  variantTrafficRatios: Record<EntityId, number>
  effectiveMode: 'IMMEDIATE' | 'SMOOTH'
  smoothDurationMinutes?: number
  experienceConsistencyEnabled: boolean
  planningEstimatedUsers?: number
  planningMdeValue?: number
  planningPower?: number
  planningAlpha?: number
  planningTrafficFilterRatio?: number
  planningRecommendedTrafficRatio?: number
  multiComparisonCorrection?: boolean
  uniformDiversionEnabled: boolean
  uniformDiversionMode?: 'METRIC' | 'SEGMENT'
  uniformMetricIds: EntityId[]
  uniformSegmentIds: EntityId[]
  uniformDateRange: {
    startDate: ISODateString
    endDate: ISODateString
  }
  uniformMaxRunTimes: number
  uniformPValueThreshold: number
  uniformStatus: RerandomizationStatus
  uniformTaskId?: EntityId
  uniformResultApplied?: boolean
  uniformConfigLocked?: boolean
  uniformFailureReason?: string
}

export interface ExperimentDraftSpecialConfig {
  splitUrl: {
    matchMode: 'SIMPLE' | 'PRECISE'
    preserveQueryString: boolean
    fallbackUrl?: string
    urls: Record<EntityId, string>
    rules: Record<
      EntityId,
      {
        matchType: 'path' | 'full_url' | 'regex'
        pattern: string
        caseSensitive: boolean
      }
    >
  }
  push: {
    channel: string
    touchRange: string
    sendMode: 'SCHEDULED' | 'TRIGGER'
    sendTime: string
    triggerCondition: string
    frequencyCapPerUser: number
    quietHours: {
      enabled: boolean
      start: string
      end: string
    }
    approvalStatus: 'DRAFT' | 'REVIEWING' | 'APPROVED'
    rehearsalChecked: boolean
    titles: Record<EntityId, string>
    contents: Record<EntityId, string>
    actionUrls: Record<EntityId, string>
  }
  mvt: {
    trafficAllocationMode: 'COMBINATION_EQUAL' | 'MANUAL'
    autoGenerateCombinations: boolean
    primaryElementId?: EntityId
    elements: Array<{
      id: EntityId
      name: string
      variants: string[]
    }>
  }
  personalization: {
    audiences: Array<{
      id: EntityId
      name: string
      rule: string
      variantTempId?: EntityId
      priority: number
      holdoutRatio: number
    }>
    conflictStrategy: 'PRIORITY' | 'FIRST_MATCH'
    defaultVariantTempId?: EntityId
    fallbackContent: string
  }
  parentChild: {
    parentExperimentId?: EntityId
    parentVariantId?: EntityId
    childTrafficRatio: number
    inheritAudience: boolean
    trafficInheritanceMode: 'LOCK_PARENT_BUCKET' | 'REHASH_IN_PARENT'
    stopPolicy: 'PAUSE' | 'STOP'
  }
  reverse: {
    sourceExperimentId?: EntityId
    sourceControlVariantId?: EntityId
    suggestedTrafficRatio: number
    holdoutSource: 'ORIGINAL_CONTROL' | 'UNEXPOSED_USERS'
    observationDays: number
    rollbackPolicy: 'AUTO_ROLLBACK' | 'MANUAL_CONFIRM'
  }
  ad: {
    accountId?: EntityId
    projectId?: EntityId
    authorizationChecked: boolean
    strategy: string
    accounts: Array<{
      id: EntityId
      name: string
      platform: 'OCEAN_ENGINE' | 'TENCENT_ADS' | 'META'
      status: 'AUTHORIZED' | 'EXPIRED' | 'PENDING'
    }>
    assets: Array<{
      id: EntityId
      name: string
      type: 'IMAGE' | 'VIDEO' | 'COPY'
      reviewStatus: 'DRAFT' | 'REVIEWING' | 'APPROVED' | 'REJECTED'
    }>
    deliveryConfig: {
      objective: 'CONVERSION' | 'CLICK' | 'RETENTION'
      dailyBudget: number
      bidStrategy: 'LOWEST_COST' | 'COST_CAP'
      placements: string[]
      startAt: string
      endAt: string
    }
    reviewSchedule: {
      auditStatus: 'NOT_SUBMITTED' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'
      reviewer: string
      scheduledAt: string
      note: string
    }
  }
  mab: {
    optimizationMetricId?: EntityId
    explorationTrafficRatio: number
    algorithm: 'EPSILON_GREEDY' | 'THOMPSON_SAMPLING' | 'UCB'
    rewardWindowHours: number
    minSamplePerArm: number
    guardrailMetricIds: EntityId[]
    autoStopEnabled: boolean
  }
  visual: {
    pageUrl: string
    editorStatus: 'NOT_CONFIGURED' | 'CONFIGURED'
    extensionDetected: boolean
    heatmapEnabled: boolean
    selectedElementId?: EntityId
    elements: Array<{
      id: EntityId
      name: string
      selector: string
      variantTempId: EntityId
      property: 'text' | 'color' | 'image' | 'visibility' | 'position'
      originalValue: string
      newValue: string
    }>
  }
}

export interface ExperimentTemplate {
  id: EntityId
  name: string
  description: string
  type: AbExperimentType
  tags: string[]
  metricIds: EntityId[]
  lockedFields: Array<'type' | 'metrics' | 'trafficLayer' | 'specialConfig'>
  defaultDurationDays: number
  defaultTrafficRatio: number
  specialConfigPatch?: Partial<ExperimentDraftSpecialConfig>
  createdBy: EntityId
  updatedAt: ISODateTimeString
}

export type RerandomizationStatus = 'NOT_STARTED' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELED'

export interface UniformDiversionConfig {
  experimentId: EntityId
  enabled: boolean
  mode?: 'METRIC' | 'SEGMENT'
  metricIds?: EntityId[]
  segmentIds?: EntityId[]
  dateRange?: {
    startDate: ISODateString
    endDate: ISODateString
  }
  maxRunTimes?: number
  pValueThreshold?: number
  status: RerandomizationStatus
  taskId?: EntityId
}

export interface UniformDiversionTaskDetail {
  taskId?: EntityId
  status: RerandomizationStatus
  progress: number
  runTimes: number
  maxRunTimes: number
  pValueThreshold: number
  minPValue?: number
  balanceScore?: number
  metricResults: Array<{
    metricId: EntityId
    metricName: string
    pValue: number
    passed: boolean
  }>
  segmentResults: Array<{
    segmentId: EntityId
    segmentName: string
    sampleSize: number
    pValue: number
    passed: boolean
  }>
  logs: Array<{
    id: EntityId
    message: string
    createdAt: ISODateTimeString
  }>
  failureReason?: string
  appliedAt?: ISODateTimeString
  locked: boolean
}

export type SmoothEffectTaskOperation = 'pause' | 'rollback' | 'skip' | 'refresh' | 'retry'

export interface SmoothEffectTask {
  id: EntityId
  experimentId: EntityId
  action: 'START' | 'EXPAND' | 'PAUSE' | 'STOP'
  startTrafficRatio: number
  targetTrafficRatio: number
  currentTrafficRatio: number
  durationMinutes: number
  startedAt: ISODateTimeString
  expectedFinishedAt: ISODateTimeString
  status: 'RUNNING' | 'PAUSED' | 'ROLLED_BACK' | 'SKIPPED' | 'FINISHED' | 'FAILED'
  failureReason?: string
}

export interface BackendIntegrationCapability {
  id: EntityId
  label: string
  status: 'mocked' | 'api_contract' | 'backend_required' | 'ready'
  apiPath?: string
  note: string
}

export interface BackendIntegrationStatus {
  mode: 'mock' | 'api'
  persistence: 'localStorage' | 'backend'
  baseUrl: string
  permissionGuard: 'mock' | 'backend'
  operationLogStore: 'localStorage' | 'backend'
  capabilities: BackendIntegrationCapability[]
  requiredBackends: string[]
}

export interface ExperimentDraft {
  appId: EntityId
  name: string
  description?: string
  type: AbExperimentType
  ownerId: EntityId
  collaboratorIds: EntityId[]
  visibility: AbExperimentVisibility
  businessLineId?: EntityId
  goal: string
  riskNote?: string
  tags: string[]
  durationDays: number
  trafficRatio: number
  coreMetricId?: EntityId | null
  focusMetricIds: EntityId[]
  metricIds: EntityId[]
  featureIds: EntityId[]
  variants: ExperimentDraftVariant[]
  paramSchemas: ExperimentDraftParamSchema[]
  testUserAudienceRequirement: TestUserAudienceRequirement
  diversionConfig: Omit<DiversionConfig, 'experimentId'>
  trafficConfig: ExperimentDraftTrafficConfig
  specialConfig: ExperimentDraftSpecialConfig
}

export type ExperimentPermissionSubjectType = 'USER' | 'ROLE'
export type ExperimentPermissionType = 'view' | 'collaborate'

export interface ExperimentPermissionGrant {
  id: EntityId
  experimentId: EntityId
  subjectType: ExperimentPermissionSubjectType
  subjectId: EntityId
  subjectName: string
  permissionType: ExperimentPermissionType
  expiresAt?: ISODateString
  remark?: string
  createdAt: ISODateTimeString
  updatedAt: ISODateTimeString
}

export interface ExperimentPermissionUpdatePayload {
  visibility: AbExperimentVisibility
  grants: ExperimentPermissionGrant[]
}

export interface ExperimentDraftValidationItem {
  level: 'PASS' | 'WARN' | 'ERROR'
  code: string
  message: string
  step: number
}

export interface ExperimentDraftValidationResult {
  passed: boolean
  items: ExperimentDraftValidationItem[]
}

export type MetricGroupType = 'event' | 'retention' | 'funnel'
export type MetricGroupStatus = 'active' | 'offline'
export type MetricPermissionType = 'public' | 'private'
export type MetricRole = 'core' | 'focus' | 'must_see'
export type MetricNumberFormat = 'number' | 'percent'

export interface MetricDirectoryGroup {
  id: EntityId
  appId: EntityId
  name: string
  description: string
  createdBy: EntityId
  createdAt: ISODateTimeString
  updatedAt: ISODateTimeString
}

export interface MetricGroup {
  id: EntityId
  appId: EntityId
  name: string
  description: string
  type: MetricGroupType
  status: MetricGroupStatus
  ownerId: EntityId
  owner: Owner
  creatorId: EntityId
  permissionType: MetricPermissionType
  authorizedUserIds: EntityId[]
  directoryGroupId?: EntityId
  metricIds: EntityId[]
  relatedExperimentIds: EntityId[]
  createdAt: ISODateTimeString
  updatedAt: ISODateTimeString
}

export interface Metric {
  id: EntityId
  metricGroupId: EntityId
  name: string
  description: string
  metricCategory: MetricGroupType
  metricKind: 'single' | 'composite'
  definition:
    | EventMetricDefinition
    | RetentionMetricDefinition
    | FunnelMetricDefinition
  numberFormat: {
    type: MetricNumberFormat
    decimalPlaces: number
  }
  isMustSee: boolean
  confidenceSupported: boolean
  status: MetricGroupStatus
  createdAt: ISODateTimeString
  updatedAt: ISODateTimeString
}

export interface MetricGroupEditorPayload {
  mode: 'create' | 'edit' | 'copy'
  groupId?: EntityId
  appId: EntityId
  name: string
  description: string
  type: MetricGroupType
  ownerId: EntityId
  permissionType: MetricPermissionType
  authorizedUserIds: EntityId[]
  directoryGroupId?: EntityId
  metrics: Metric[]
}

export interface MetricFilter {
  id: EntityId
  propertyId: string
  propertySource: 'event' | 'public' | 'user' | 'custom'
  operator: string
  value?: unknown
}

export interface MetricFilterGroup {
  id: EntityId
  relation: 'AND' | 'OR'
  conditions: MetricFilter[]
  groups: MetricFilterGroup[]
}

export interface EventMetricEvent {
  code: string
  eventId: EntityId
  eventName: string
  eventType: 'normal' | 'virtual' | 'visual'
  operator:
    | 'pv/au'
    | 'uv/au'
    | 'sum/au'
    | 'sum/sum(dau)'
    | 'pv/sum(dau)'
    | 'pv/uv'
    | 'sum/uv'
    | 'sum/pv'
    | 'pv'
    | 'uv'
    | 'sum'
    | 'count_distinct'
  propertyId?: string | null
  filters: MetricFilter[]
  filterTree?: MetricFilterGroup
  aggregationFilter?: {
    enabled: boolean
    dimensionType: 'user' | 'event_property' | 'public_property' | 'custom_property'
    propertyId?: string | null
  }
}

export interface FlexibleProperty {
  id: EntityId
  scope: string
  propertyId: string
  propertyName: string
  defaultOperator?: string
  defaultValue?: unknown
}

export interface EventMetricDefinition {
  metricId: EntityId
  metricKind: 'single' | 'composite'
  events: EventMetricEvent[]
  formula?: string | null
  flexibleProperties: FlexibleProperty[]
}

export interface RetentionMetricDefinition {
  metricId: EntityId
  startEvent: EventMetricEvent
  returnEvent: EventMetricEvent
  retentionDays: number
  flexibleProperties: FlexibleProperty[]
}

export interface FunnelMetricDefinition {
  metricId: EntityId
  conversionWindow: {
    value: number
    unit: 'minute' | 'hour' | 'day'
  }
  steps: EventMetricEvent[]
  globalFilters: MetricFilter[]
  globalFilterTree?: MetricFilterGroup
}

export interface MetricTemplate {
  id: EntityId
  appId: EntityId
  name: string
  description: string
  ownerId: EntityId
  templateType: 'personal' | 'common'
  availableUserIds: EntityId[]
  metricGroupIds: EntityId[]
  createdAt: ISODateTimeString
  updatedAt: ISODateTimeString
}

export type MetricPermissionCapability =
  | 'list'
  | 'view_detail'
  | 'view_statistic'
  | 'use_in_experiment'
  | 'edit'
  | 'offline'
  | 'copy'
  | 'grant'
  | 'set_must_see'
  | 'manage_template'
  | 'manage_alarm'

export interface MetricPermissionRoleMatrix {
  id: EntityId
  role: 'SUPER_ADMIN' | 'APP_ADMIN' | 'METRIC_OWNER' | 'TEMPLATE_OWNER' | 'MEMBER' | 'AUTHORIZED_USER'
  roleName: string
  description: string
  capabilities: MetricPermissionCapability[]
  updatedAt: ISODateTimeString
}

export interface MetricBindingSnapshot {
  id: EntityId
  experimentId: EntityId
  metricId: EntityId
  metricGroupId: EntityId
  metricName: string
  metricGroupName: string
  metricRole: 'core' | 'focus'
  metricCategory: MetricGroupType
  definition: Metric['definition']
  numberFormat: Metric['numberFormat']
  flexibleValues: Array<{
    propertyId: string
    propertyName: string
    scope: string
    operator?: string
    value?: unknown
    source: 'experiment_value' | 'metric_default'
  }>
  statusAtBinding: MetricGroupStatus
  snapshotVersion: number
  source: 'experiment_create' | 'experiment_edit' | 'metric_edit'
  capturedAt: ISODateTimeString
}

export interface AlarmTask {
  id: EntityId
  appId: EntityId
  name: string
  description: string
  alarmType: 'dashboard' | 'experiment'
  level: 'notice' | 'warning' | 'critical'
  interval: '1h' | '24h'
  enabled: boolean
  ruleRelation: 'all' | 'any'
  scene: {
    experimentId?: EntityId
    dashboardId?: EntityId
  }
  strategies: Array<{
    id: EntityId
    metricId: EntityId
    strategyType?: 'absolute' | 'yoy' | 'mom' | 'control'
    compareTo?: 'control'
    direction: 'increase' | 'decrease' | 'any'
    thresholdPercent: number
    requireSignificance: boolean
  }>
  notification: {
    channels: Array<'feishu' | 'dingtalk' | 'wecom' | 'email'>
    maskedWebhooks: Partial<Record<'feishu' | 'dingtalk' | 'wecom', string>>
    receiverGroupIds: EntityId[]
    timeRanges: Array<{ start: string; end: string }>
  }
  triggerCount: number
  createdBy: EntityId
  createdAt: ISODateTimeString
}

export interface AlarmTriggerRecord {
  id: EntityId
  alarmTaskId: EntityId
  alarmTaskName: string
  alarmType: AlarmTask['alarmType']
  experimentId?: EntityId
  dashboardId?: EntityId
  metricId: EntityId
  metricName: string
  strategyType: NonNullable<AlarmTask['strategies'][number]['strategyType']>
  level: AlarmTask['level']
  triggeredAt: ISODateTimeString
  metricValue: number
  baselineValue?: number
  diffPercent: number
  thresholdPercent: number
  requireSignificance: boolean
  pValue?: number
  status: 'sent' | 'suppressed' | 'failed'
  notificationChannels: AlarmTask['notification']['channels']
  receiverGroupNames: string[]
  message: string
}

export interface ReceiverGroup {
  id: EntityId
  appId: EntityId
  name: string
  memberIds: EntityId[]
  memberNames: string[]
  usedByAlarmTaskIds: EntityId[]
  createdBy: EntityId
  updatedAt: ISODateTimeString
}

export interface MustSeeMetricTrend {
  metricId: EntityId
  metricName: string
  metricGroupName: string
  currentValue: number
  points: Array<{
    time: string
    value: number
    dayOverDay?: number | null
    weekOverWeek?: number | null
    relatedNewExperimentIds: EntityId[]
    relatedRunningExperimentIds: EntityId[]
  }>
}

export type FeatureVariantType = 'boolean' | 'string' | 'number' | 'json'
export type FeatureStatus = 'enabled' | 'disabled' | 'deleted'
export type FeaturePublishStatus =
  | 'unpublished'
  | 'pending_publish'
  | 'gray'
  | 'publish_confirm'
  | 'full'
  | 'rolled_back'
  | 'disabled'
  | 'canceled'

export interface FeatureFlag {
  featureId: EntityId
  appId: EntityId
  key: string
  name: string
  description: string
  imageUrl?: string
  terminalType: 'client' | 'server'
  featureType: 'public' | 'private'
  status: FeatureStatus
  publishStatus: FeaturePublishStatus
  currentVersionId?: EntityId
  owners: EntityId[]
  tags: string[]
  relatedExperimentIds: EntityId[]
  createdBy: EntityId
  createdAt: ISODateTimeString
  updatedAt: ISODateTimeString
}

export interface FeatureVariant {
  variantId: EntityId
  name: string
  value: unknown
  description: string
  imageUrl?: string
}

export type FeatureDeliveryType = 'single_variant' | 'multi_variant' | 'no_value'

export interface AudienceRule {
  ruleId: EntityId
  name: string
  order: number
  conditions: Array<{
    fieldSource: 'user_property' | 'device_property' | 'event_property' | 'custom_variable' | 'segment'
    fieldName: string
    operator: AudienceOperator
    value?: unknown
  }>
  deliveryType: FeatureDeliveryType
  variantId?: EntityId
  variantWeights?: Array<{ variantId: EntityId; weight: number }>
}

export interface FeatureVersion {
  versionId: EntityId
  featureId: EntityId
  versionNo: string
  versionStatus: FeaturePublishStatus
  variantType: FeatureVariantType
  variants: FeatureVariant[]
  audienceRules: AudienceRule[]
  defaultRule: AudienceRule
  publishTraffic: number
  createdBy: EntityId
  createdAt: ISODateTimeString
}

export interface PublishPlan {
  publishId: EntityId
  featureId: EntityId
  versionId: EntityId
  publishType: 'manual' | 'scheduled'
  status?: 'pending' | 'running' | 'completed' | 'canceled' | 'rolled_back' | 'failed'
  description: string
  steps: Array<{
    stepNo: number
    publishTime: ISODateTimeString
    traffic: number
  }>
  rollbackAt?: ISODateTimeString | null
  createdBy: EntityId
}

export interface WhitelistTest {
  id: EntityId
  featureId: EntityId
  name: string
  versionMode?: 'existing' | 'custom'
  versionId?: EntityId
  status: 'active' | 'expired' | 'terminated'
  expiresAt: ISODateTimeString
  customVariants?: FeatureVariant[]
  customAudienceRules?: AudienceRule[]
  ruleUserIds: Record<EntityId, string[]>
  createdBy: EntityId
  createdAt: ISODateTimeString
}

export interface FeatureDecisionResult {
  featureKey: string
  value?: unknown
  variantId?: EntityId
  variantName?: string
  versionId?: EntityId
  decisionSource: 'whitelist' | 'experiment' | 'feature' | 'local_default'
  decisionReason:
    | 'matched_whitelist'
    | 'matched_experiment'
    | 'matched_audience_rule'
    | 'matched_default_rule'
    | 'feature_disabled'
    | 'feature_missing'
    | 'no_value_by_rule'
    | 'traffic_not_hit'
  ruleId?: EntityId
  isDefaultValue: boolean
}

export interface FeatureFlagDraft {
  appId: EntityId
  key: string
  name: string
  description: string
  imageUrl?: string
  terminalType: FeatureFlag['terminalType']
  featureType: FeatureFlag['featureType']
  owners: EntityId[]
  tags: string[]
  variantType: FeatureVariantType
  variants: FeatureVariant[]
  defaultVariantId?: EntityId
  audienceRules?: AudienceRule[]
  defaultRule?: AudienceRule
  publishTraffic?: number
}

export interface FeatureVersionDraft {
  variantType: FeatureVariantType
  variants: FeatureVariant[]
  audienceRules: AudienceRule[]
  defaultRule: AudienceRule
  publishTraffic: number
  expectedFeatureUpdatedAt?: ISODateTimeString
}

export interface FeaturePublishRequest {
  versionId: EntityId
  publishType: PublishPlan['publishType']
  publishTraffic: number
  scheduledAt?: ISODateTimeString
  scheduleSteps?: PublishPlan['steps']
  rollbackAt?: ISODateTimeString | null
  requireConfirmation?: boolean
  description: string
}

export interface WhitelistTestDraft {
  name: string
  versionMode?: WhitelistTest['versionMode']
  versionId?: EntityId
  expiresAt: ISODateTimeString
  customVariants?: FeatureVariant[]
  customAudienceRules?: AudienceRule[]
  ruleUserIds: Record<EntityId, string[]>
}

export type FeatureLifecycleAction = 'enable' | 'disable' | 'delete'

export interface FeatureSolidifyRequest {
  experimentId: EntityId
  featureKey: string
  featureName: string
  description?: string
  ownerIds?: EntityId[]
  tags?: string[]
  appId?: EntityId
  terminalType?: FeatureFlag['terminalType']
  featureType?: FeatureFlag['featureType']
  winnerVariantId: EntityId
  variantRollouts?: Array<{ experimentVariantId: EntityId; traffic: number }>
  variantOverrides?: Array<{ experimentVariantId: EntityId; name: string; description?: string }>
  rolloutTraffic: number
}

export interface PermissionAuditItem {
  id: EntityId
  domain: 'experiment' | 'metric' | 'feature' | 'report' | 'system'
  action: string
  objectName: string
  requiredLevel: AbPermissionLevel
  grantedLevel: AbPermissionLevel
  passed: boolean
  reason: string
}

export interface PerformanceBudgetItem {
  id: EntityId
  scope: string
  budgetMs: number
  measuredMs: number
  status: 'pass' | 'warning' | 'fail'
  recoveryAction: string
}

export interface E2EAcceptanceCase {
  id: EntityId
  module: string
  scenario: string
  status: 'passed' | 'covered_by_unit' | 'manual_required' | 'backend_required'
  evidence: string
}

export interface MetricStatisticResult {
  metricId: EntityId
  metricName: string
  metricType: MetricGroupType
  versionResults: Array<{
    versionId: EntityId
    sampleSize: number
    metricValue: number | null
    diffAbs: number | null
    diffRel: number | null
    pValue: number | null
    mde: number | null
    confidenceInterval: [number, number] | null
    significance: AbSignificance
  }>
}

export interface ReportFilter {
  timeGranularity: 'day' | 'hour' | '5m'
  startTime: string
  endTime: string
  filters: Array<{
    fieldType: 'user_property' | 'event_property' | 'device_property' | 'channel_property'
    fieldName: string
    operator: AudienceOperator
    value?: unknown
  }>
  cohorts: Array<{
    cohortId: EntityId
    cohortName: string
  }>
  dataMode: 'after_experiment' | 'pre_aa'
}

export interface FilterTemplate {
  templateId: EntityId
  templateName: string
  templateDesc: string
  scope: 'experiment' | 'app'
  experimentId?: EntityId
  appId: EntityId
  creator: EntityId
  filters: ReportFilter['filters']
  createdAt: ISODateTimeString
}

export interface HitQueryTemplate {
  id: EntityId
  name: string
  description: string
  subjectType: 'uid' | 'did' | 'ssid'
  filters: {
    experimentId?: EntityId
    hitStatus?: 'all' | 'hit' | 'not_hit' | 'whitelist' | 'excluded'
  }
  sortBy: 'queriedAt' | 'experimentName' | 'hitStatus'
  sortOrder: 'asc' | 'desc'
}

export interface HitQueryRequest {
  subjectId: string
  subjectType: 'uid' | 'did' | 'ssid'
  experimentId?: EntityId
  hitStatus?: 'all' | 'hit' | 'not_hit' | 'whitelist' | 'excluded'
  sortBy: 'queriedAt' | 'experimentName' | 'hitStatus'
  sortOrder: 'asc' | 'desc'
}

export interface HitQueryResult {
  id: EntityId
  subjectId: string
  subjectType: HitQueryRequest['subjectType']
  experimentId: EntityId
  experimentName: string
  hitStatus: 'hit' | 'not_hit' | 'whitelist' | 'excluded'
  variantName: string
  decisionSource: 'whitelist' | 'audience' | 'traffic' | 'feature_default'
  audiencePassed: boolean
  trafficBucket: number
  reason: string
  queriedAt: ISODateTimeString
}

export interface HitDiagnosisResult {
  id: EntityId
  subjectId: string
  experimentId: EntityId
  experimentName: string
  finalDecision: string
  createdAt: ISODateTimeString
  stages: Array<{
    stage: 'identity' | 'permission' | 'audience' | 'whitelist' | 'traffic' | 'variant' | 'exposure'
    status: 'pass' | 'warning' | 'blocked'
    message: string
  }>
}

export interface DataDedupTask {
  id: EntityId
  name: string
  experimentId?: EntityId
  scope: 'decision' | 'exposure' | 'metric'
  schedule: 'manual' | 'daily'
  windowMinutes: number
  status: 'queued' | 'running' | 'success' | 'failed'
  duplicateRate: number
  duplicateRows: number
  downloadUrl?: string
  createdBy: EntityId
  createdAt: ISODateTimeString
  updatedAt: ISODateTimeString
  lastRunAt?: ISODateTimeString
}

export interface DataDedupTaskDraft {
  name: string
  experimentId?: EntityId
  scope: DataDedupTask['scope']
  schedule: DataDedupTask['schedule']
  windowMinutes: number
}

export interface ExperimentBoardWidget {
  id: EntityId
  type: 'metric' | 'experiment_health' | 'alarm' | 'text' | 'diff'
  title: string
  dataSource: 'must_see' | 'experiment' | 'alarm' | 'custom'
  metricId?: EntityId
  experimentId?: EntityId
  text?: string
  order: number
}

export interface ExperimentBoard {
  id: EntityId
  name: string
  description: string
  ownerId: EntityId
  visibility: AbExperimentVisibility
  authorizedUserIds: EntityId[]
  timeConfig: {
    mode: 'relative' | 'absolute'
    range: '24h' | '7d' | '14d' | '30d' | 'custom'
    startTime?: ISODateTimeString
    endTime?: ISODateTimeString
    granularity: 'hour' | 'day'
  }
  widgets: ExperimentBoardWidget[]
  shareToken: string
  createdAt: ISODateTimeString
  updatedAt: ISODateTimeString
}

export interface ExperimentBoardDraft {
  name: string
  description: string
  visibility: AbExperimentVisibility
  authorizedUserIds: EntityId[]
  timeConfig: ExperimentBoard['timeConfig']
}

export interface BoardDiffResult {
  id: EntityId
  widgetId: EntityId
  title: string
  baselineValue: number
  currentValue: number
  diffAbs: number
  diffRel: number
  status: 'up' | 'down' | 'flat'
}

export interface ExperimentReportOverview {
  experimentId: EntityId
  experimentName: string
  experimentType: AbExperimentType
  status: AbExperimentStatus
  startTime: ISODateTimeString
  endTime?: ISODateTimeString | null
  trafficRatio: number
  confidenceLevel: number
  dataUpdatedAt: ISODateTimeString
  conclusionStatus: AbSignificance
  conclusionText: string
  recommendation: string
  versions: Array<{
    versionId: EntityId
    versionName: string
    isControl: boolean
  }>
  entryUsers: number
  coreMetricResults: MetricStatisticResult[]
}

export interface TrendPoint {
  time: string
  versionId: EntityId
  value: number
  lowerBound?: number
  upperBound?: number
  pValue?: number
}

export interface FunnelReport {
  metricId: EntityId
  compareVersionId: EntityId
  baselineVersionId?: EntityId
  steps: Array<{
    stepNo: number
    stepName: string
    reachedUsers: number
    overallConversionRate: number
    previousStepConversionRate: number
    lostUsers: number
    significance: AbSignificance
  }>
}

export interface CohortReport {
  metricId: EntityId
  retentionDays: number[]
  rows: Array<{
    versionId: EntityId
    cohortDate: ISODateString
    newUsers: number
    values: number[]
  }>
}

export interface TemporaryRetentionQueryPayload {
  experimentId: EntityId
  metricId?: EntityId | null
  startEventId: EntityId
  returnEventId: EntityId
  startDate: ISODateString
  endDate: ISODateString
  startFilterTree: MetricFilterGroup
  returnFilterTree: MetricFilterGroup
}

export interface TemporaryRetentionQueryResult extends CohortReport {
  id: EntityId
  experimentId: EntityId
  sourceMetricId?: EntityId | null
  startEventId: EntityId
  returnEventId: EntityId
  startFilterTree: MetricFilterGroup
  returnFilterTree: MetricFilterGroup
  queriedAt: ISODateTimeString
  summary: {
    startFilterCount: number
    returnFilterCount: number
    versionCount: number
    cohortCount: number
  }
}

export interface HeatmapReport {
  pageUrl: string
  type: 'click' | 'element'
  versions: Array<{
    versionId: EntityId
    screenshotUrl: string
    clickCount: number
    clickUsers: number
    bounceRate: number
    averageStaySeconds: number
    topElements: Array<{ name: string; clicks: number; share: number }>
  }>
  anomalyHints: string[]
}

export interface MabReport {
  experimentId: EntityId
  cumulativeLift: number
  optimizationMetric: string
  rounds: Array<{
    roundNo: number
    optimizedAt: ISODateTimeString
    incrementalLift: number
    cumulativeLift: number
  }>
  arms: Array<{
    armId: EntityId
    name: string
    metricValue: number
    entryUsers: number
    p2ba: number
    distribution: [number, number, number]
    trafficRatio: number
    status: 'online' | 'offline'
  }>
}

export interface SensitiveInsightTask {
  id: EntityId
  experimentId: EntityId
  metricId: EntityId
  treatmentVariantId: EntityId
  controlVariantId: EntityId
  name: string
  direction: 'positive' | 'negative'
  status: 'running' | 'completed' | 'failed' | 'terminated'
  stage: 'data_preparing' | 'model_training' | 'model_predicting' | 'result_output'
  progress: number
  createdAt: ISODateTimeString
  result?: {
    discovered: boolean
    sensitiveUsers: number
    totalUsers: number
    topFeatures: string[]
    segments: Array<{
      condition: string
      users: number
      liftRel: number
      pValue: number
      significance: AbSignificance
    }>
  }
}

export interface ReportExportTask {
  id: EntityId
  experimentId: EntityId
  reportType: 'overview' | 'metrics' | 'funnel' | 'cohort' | 'heatmap' | 'mab' | 'sensitive' | 'group_users'
  fileName: string
  status: 'queued' | 'running' | 'success' | 'failed' | 'canceled'
  progress: number
  downloadUrl?: string
  failureReason?: string
  createdBy: EntityId
  createdAt: ISODateTimeString
  updatedAt: ISODateTimeString
}

export interface OperationLog {
  id: EntityId
  objectType:
    | 'EXPERIMENT'
    | 'METRIC_GROUP'
    | 'METRIC_TEMPLATE'
    | 'FEATURE'
    | 'FEATURE_VERSION'
    | 'ALARM_TASK'
    | 'BOARD'
    | 'AD_ACCOUNT'
    | 'ASSET'
  objectId: EntityId
  action: string
  operatorId: EntityId
  operatorName: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  createdAt: ISODateTimeString
}

export interface AbCoverageItem {
  prd: string
  section: string
  implementation: string
  status: 'done' | 'partial' | 'backend_required'
}
