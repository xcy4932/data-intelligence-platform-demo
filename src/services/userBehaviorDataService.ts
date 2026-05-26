import {
  mockAlerts,
  mockAppContext,
  mockAuditLogs,
  mockCostGovernance,
  mockCustomSessions,
  mockDataTypeRules,
  mockDictionaries,
  mockErrorCodeRules,
  mockErrorLogs,
  mockEventCategories,
  mockEventProperties,
  mockEvents,
  mockGovernanceMetrics,
  mockIngestionDetails,
  mockIntegrationTasks,
  mockLineageItems,
  mockMetadataStatusRules,
  mockPendingEvents,
  mockPermissions,
  mockPresetProperties,
  mockRecentIngestionHealth,
  mockRealtimeSession,
  mockRelationPreview,
  mockReportEndpoints,
  mockSdkVersions,
  mockUserProperties,
  mockValidationRules,
  mockVerifyLogs,
  mockVerifyReports,
  mockVirtualEvents,
  mockVirtualProperties,
  mockVisualEvents,
  mockWebSessionConfig,
} from '@/mock/userBehaviorData'
import type {
  AlertRecord,
  AppContext,
  AuditLog,
  BehaviorUploadPayload,
  CostGovernanceSnapshot,
  CustomSession,
  DataIntegrationTask,
  DictionaryFile,
  ErrorLog,
  EventCategory,
  EventMetadata,
  EventPropertyMetadata,
  FieldMapping,
  FilterCondition,
  GovernanceDashboardMetrics,
  IngestionDetail,
  KafkaConfig,
  LineageItem,
  MetadataBatchPayload,
  MetadataBatchPreview,
  MetadataBatchResult,
  MetadataDisplayImportResult,
  MetadataDisplayImportRow,
  MetadataImpactPreview,
  MetadataManagementKind,
  MetadataProductionFields,
  MetadataRegistrationSource,
  MetadataSensitiveLevel,
  MetadataStatus,
  MetadataTableQuery,
  MetadataTableResult,
  MetadataTableRow,
  PendingEvent,
  PendingEventProperty,
  PendingUserProperty,
  Permission,
  PermissionResource,
  Platform,
  PropertyDataType,
  RealtimeVerifySession,
  ReportEndpoint,
  SqlValidationResult,
  UploadValidationResult,
  UploadValidationStep,
  UserPropertyMetadata,
  ValidationRule,
  VerifyEventLog,
  VerifyReport,
  VirtualEvent,
  VirtualProperty,
  VisualEvent,
  VisualSelectionSession,
  WebSessionConfig,
} from '@/types/userBehaviorData'

const EVENT_NAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_ .-]{0,254}$/
const PROPERTY_NAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_ .-]{0,63}$/
const VIRTUAL_PROPERTY_REGEX = /^[a-zA-Z_][0-9a-zA-Z_]{0,99}$/
const VERSION_REGEX = /^[0-9]{1,5}(\.[0-9]{1,5}){1,5}$/

type EventFilter = {
  keyword?: string
  status?: MetadataStatus | 'all'
  sourceType?: EventMetadata['sourceType'] | 'all'
  categoryId?: string | 'all'
  isPreset?: 'all' | 'yes' | 'no'
  hasScreenshot?: 'all' | 'yes' | 'no'
  queried30d?: 'all' | 'yes' | 'no'
}

type PropertyFilter = {
  keyword?: string
  status?: MetadataStatus | 'all'
  dataType?: PropertyDataType | 'all'
  scope?: EventPropertyMetadata['propertyScope'] | 'all'
  emptyInfoOnly?: boolean
}

type ReportEndpointFilter = {
  environmentType?: ReportEndpoint['environmentType']
  region?: ReportEndpoint['region']
  platforms?: Platform[]
  platformGroup?: 'all' | 'client' | 'server' | 'http_api'
  customDomain?: string
}

type IntegrationTaskPayload = {
  taskName: string
  description?: string
  sourceType: DataIntegrationTask['sourceType']
  configMode: DataIntegrationTask['configMode']
  kafkaConfig: KafkaConfig
  fieldMappings: FieldMapping[]
}

type CreateEventPayload = {
  eventName: string
  displayName?: string
  description?: string
  categoryId?: string
  associatedPropertyIds?: string[]
}

type CreateEventPropertyPayload = {
  propertyName: string
  displayName?: string
  description?: string
  dataType: PropertyDataType
  propertyScope: EventPropertyMetadata['propertyScope']
  associatedEventIds: string[]
}

type CreateUserPropertyPayload = {
  propertyName: string
  displayName?: string
  description?: string
  dataType: PropertyDataType
  calculationLogic: UserPropertyMetadata['calculationLogic']
}

type CreateVirtualEventPayload = {
  eventName: string
  displayName: string
  description?: string
  components: Array<{ eventId: string, filters: FilterCondition[] }>
}

type CreateVirtualPropertyPayload = {
  propertyType: VirtualProperty['propertyType']
  propertyName: string
  displayName?: string
  description?: string
  dataType: VirtualProperty['dataType']
  sqlExpression: string
  associationMode?: VirtualProperty['associationMode']
}

type CreateVisualEventPayload = {
  eventName: string
  description?: string
  platform: VisualEvent['platform']
  pageName: string
  pageRule: string
  elementName: string
}

type UpdateVirtualPropertyPayload = Pick<
  CreateVirtualPropertyPayload,
  'displayName' | 'description' | 'dataType' | 'sqlExpression' | 'associationMode' | 'propertyType'
> & {
  confirmedDictionaryDelete?: boolean
}

type CreateCustomSessionPayload = {
  sessionName: string
  displayName: string
  description?: string
  platformScope: Platform[]
  eventIds: string[]
  cutRuleType: CustomSession['cutRule']['type']
  gapMinutes?: number
  startEventId?: string
  endEventId?: string
}

type CreateCategoryPayload = {
  name: string
  scope: EventCategory['scope']
  description?: string
}

type UpdateCategoryPayload = {
  name?: string
  description?: string
  isDefault?: boolean
}

type CreateRulePayload = {
  ruleName: string
  ruleType: ValidationRule['ruleType']
  targetName: string
  conditions: string[]
  intervalMinutes?: number
  alertEnabled: boolean
  interceptEnabled: boolean
}

type CreateMonitorPayload = {
  monitorName: string
  objectType: AlertRecord['objectType']
  targetName: string
  channels: AlertRecord['channels']
  recipients: string[]
  webhook?: string
}

type ErrorLogFilter = {
  eventName?: string
  errorType?: ErrorLog['errorType'] | 'all'
  errorCode?: string
}

const delay = async (ms = 160): Promise<void> => {
  await new Promise((resolve) => window.setTimeout(resolve, ms))
}

const clone = <T>(value: T): T => {
  try {
    return structuredClone(value)
  } catch {
    return JSON.parse(JSON.stringify(value)) as T
  }
}

let appContext = clone(mockAppContext)
let events = clone(mockEvents)
let pendingEvents = clone(mockPendingEvents)
let pendingEventProperties: PendingEventProperty[] = [
  {
    id: 'pending_prop_order_source',
    propertyName: 'order_source',
    eventName: 'pay_success',
    detectedType: 'string',
    sampleValue: 'campaign_2026_spring',
    firstSeenAt: '2026-05-26 08:40:00',
    sampleCount: 96,
  },
  {
    id: 'pending_prop_button_index',
    propertyName: 'button_index',
    eventName: 'autotrack_click_button',
    detectedType: 'int',
    sampleValue: '3',
    firstSeenAt: '2026-05-26 09:18:00',
    sampleCount: 31,
  },
]
let pendingUserProperties: PendingUserProperty[] = [
  {
    id: 'pending_up_last_pay_time',
    propertyName: 'last_pay_time',
    detectedType: 'datetime',
    sampleValue: '2026-05-26 09:21:00',
    firstSeenAt: '2026-05-26 09:22:00',
    sampleCount: 44,
  },
]
let eventProperties = clone(mockEventProperties)
let userProperties = clone(mockUserProperties)
let virtualEvents = clone(mockVirtualEvents)
let virtualProperties = clone(mockVirtualProperties)
let visualEvents = clone(mockVisualEvents)
let webSessionConfig = clone(mockWebSessionConfig)
let customSessions = clone(mockCustomSessions)
let eventCategories = clone(mockEventCategories)
let dictionaries = clone(mockDictionaries)
let realtimeSession = clone(mockRealtimeSession)
let verifyLogs = clone(mockVerifyLogs)
let verifyReports = clone(mockVerifyReports)
let ingestionDetails = clone(mockIngestionDetails)
let errorLogs = clone(mockErrorLogs)
let validationRules = clone(mockValidationRules)
let alerts = clone(mockAlerts)
let costGovernance = clone(mockCostGovernance)
let integrationTasks = clone(mockIntegrationTasks)
let auditLogs = clone(mockAuditLogs)
let visualSelectionSession: VisualSelectionSession | null = null

type PersistedUserBehaviorState = {
  appContext: AppContext
  events: EventMetadata[]
  pendingEvents: PendingEvent[]
  pendingEventProperties: PendingEventProperty[]
  pendingUserProperties: PendingUserProperty[]
  eventProperties: EventPropertyMetadata[]
  userProperties: UserPropertyMetadata[]
  virtualEvents: VirtualEvent[]
  virtualProperties: VirtualProperty[]
  visualEvents: VisualEvent[]
  webSessionConfig: WebSessionConfig
  customSessions: CustomSession[]
  eventCategories: EventCategory[]
  dictionaries: DictionaryFile[]
  realtimeSession: RealtimeVerifySession
  verifyLogs: VerifyEventLog[]
  verifyReports: VerifyReport[]
  ingestionDetails: IngestionDetail[]
  errorLogs: ErrorLog[]
  validationRules: ValidationRule[]
  alerts: AlertRecord[]
  costGovernance: CostGovernanceSnapshot
  integrationTasks: DataIntegrationTask[]
  auditLogs: AuditLog[]
  visualSelectionSession: VisualSelectionSession | null
}

const STORAGE_KEY = 'ubdm-demo-state-v1'

function saveState(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return
    }
    const state: PersistedUserBehaviorState = {
      appContext,
      events,
      pendingEvents,
      pendingEventProperties,
      pendingUserProperties,
      eventProperties,
      userProperties,
      virtualEvents,
      virtualProperties,
      visualEvents,
      webSessionConfig,
      customSessions,
      eventCategories,
      dictionaries,
      realtimeSession,
      verifyLogs,
      verifyReports,
      ingestionDetails,
      errorLogs,
      validationRules,
      alerts,
      costGovernance,
      integrationTasks,
      auditLogs,
      visualSelectionSession,
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Embedded preview browsers can block localStorage; in-memory state still keeps the demo fully usable.
  }
}

function restoreState(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return
    }
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return
    }
    const state = JSON.parse(raw) as Partial<PersistedUserBehaviorState>
    appContext = state.appContext ?? appContext
    events = state.events ?? events
    pendingEvents = state.pendingEvents ?? pendingEvents
    pendingEventProperties = state.pendingEventProperties ?? pendingEventProperties
    pendingUserProperties = state.pendingUserProperties ?? pendingUserProperties
    eventProperties = state.eventProperties ?? eventProperties
    userProperties = state.userProperties ?? userProperties
    virtualEvents = state.virtualEvents ?? virtualEvents
    virtualProperties = state.virtualProperties ?? virtualProperties
    visualEvents = state.visualEvents ?? visualEvents
    webSessionConfig = state.webSessionConfig ?? webSessionConfig
    customSessions = state.customSessions ?? customSessions
    eventCategories = state.eventCategories ?? eventCategories
    dictionaries = state.dictionaries ?? dictionaries
    realtimeSession = state.realtimeSession ?? realtimeSession
    verifyLogs = state.verifyLogs ?? verifyLogs
    verifyReports = state.verifyReports ?? verifyReports
    ingestionDetails = state.ingestionDetails ?? ingestionDetails
    errorLogs = state.errorLogs ?? errorLogs
    validationRules = state.validationRules ?? validationRules
    alerts = state.alerts ?? alerts
    costGovernance = state.costGovernance ?? costGovernance
    integrationTasks = state.integrationTasks ?? integrationTasks
    auditLogs = state.auditLogs ?? auditLogs
    visualSelectionSession = state.visualSelectionSession ?? visualSelectionSession
  } catch {
    try {
      window.localStorage?.removeItem(STORAGE_KEY)
    } catch {
      // Ignore storage cleanup failures in restricted browser contexts.
    }
  }
}

restoreState()

function nowText(): string {
  const value = new Date()
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.round(Math.random() * 1000)}`
}

function createAudit(resourceType: string, resourceId: string, action: string, before?: unknown, after?: unknown): void {
  auditLogs.unshift({
    id: createId('audit'),
    appId: appContext.appId,
    resourceType,
    resourceId,
    action,
    before,
    after,
    operator: 'Chaoyang Xu',
    operatedAt: nowText(),
    ip: '127.0.0.1',
  })
  saveState()
}

function includesKeyword(values: Array<string | undefined>, keyword?: string): boolean {
  if (!keyword) {
    return true
  }
  const normalized = keyword.trim().toLowerCase()
  return values.some((value) => String(value ?? '').toLowerCase().includes(normalized))
}

function stringifyValue(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }
  if (value === null || value === undefined) {
    return ''
  }
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

function inferDataType(value: unknown): PropertyDataType {
  if (Array.isArray(value)) {
    return 'list'
  }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'int' : 'float'
  }
  const text = stringifyValue(value)
  if (VERSION_REGEX.test(text)) {
    return 'version'
  }
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(text)) {
    return 'datetime'
  }
  return 'string'
}

function isValueCompatible(value: unknown, dataType: PropertyDataType): boolean {
  if (value === null || value === undefined) {
    return false
  }
  if (dataType === 'int') {
    return typeof value === 'number' ? Number.isInteger(value) : /^-?\d+$/.test(String(value))
  }
  if (dataType === 'float') {
    return typeof value === 'number' || /^-?\d+(\.\d+)?$/.test(String(value))
  }
  if (dataType === 'list') {
    return Array.isArray(value) && value.every((item) => typeof item === 'string') && value.length <= 500
  }
  if (dataType === 'datetime') {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(value)
  }
  if (dataType === 'version') {
    return typeof value === 'string' && VERSION_REGEX.test(value)
  }
  return stringifyValue(value).length <= (appContext.environmentType === 'saas_cloud_native' ? 2048 : 1024)
}

function normalizeParams(params: unknown): Record<string, unknown> {
  if (!params) {
    return {}
  }
  if (typeof params === 'string') {
    try {
      const parsed = JSON.parse(params) as unknown
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {}
    } catch {
      return {}
    }
  }
  return typeof params === 'object' && !Array.isArray(params) ? (params as Record<string, unknown>) : {}
}

function appendError(errors: ErrorLog[], eventName: string, errorType: ErrorLog['errorType'], errorCode: string, message: string, rawPayload: unknown): void {
  errors.push({
    id: createId('err'),
    eventName,
    errorType,
    errorCode,
    message,
    rawPayload: JSON.stringify(rawPayload),
    receivedAt: nowText(),
  })
}

function upsertIngestionDetail(eventName: string, received: number, discarded: number, abnormalPropertyCount: number, errorType: IngestionDetail['errorType']): void {
  const index = ingestionDetails.findIndex((detail) => detail.eventName === eventName)
  if (index >= 0) {
    const detail = ingestionDetails[index] as IngestionDetail
    ingestionDetails[index] = {
      ...detail,
      errorType,
      receivedCount: detail.receivedCount + received,
      discardedCount: detail.discardedCount + discarded,
      storedCount: detail.storedCount + Math.max(received - discarded, 0),
      abnormalPropertyCount: detail.abnormalPropertyCount + abnormalPropertyCount,
    }
    return
  }
  ingestionDetails.unshift({
    id: createId('ing'),
    eventName,
    sdkType: undefined,
    sdkVersion: undefined,
    errorType,
    receivedCount: received,
    discardedCount: discarded,
    storedCount: Math.max(received - discarded, 0),
    abnormalPropertyCount,
  })
}

function trackPendingEvent(eventName: string, params: Record<string, unknown>): void {
  const index = pendingEvents.findIndex((event) => event.eventName === eventName)
  if (index >= 0) {
    const current = pendingEvents[index] as PendingEvent
    pendingEvents[index] = {
      ...current,
      sampleCount: current.sampleCount + 1,
      sampleProperties: [...new Set([...current.sampleProperties, ...Object.keys(params)])].slice(0, 20),
    }
    return
  }
  pendingEvents.unshift({
    id: createId('pending'),
    eventName,
    firstSeenAt: nowText(),
    sampleCount: 1,
    sampleProperties: Object.keys(params).slice(0, 20),
  })
}

function trackPendingEventProperty(propertyName: string, eventName: string, value: unknown): void {
  const index = pendingEventProperties.findIndex((property) => property.propertyName === propertyName && property.eventName === eventName)
  if (index >= 0) {
    const current = pendingEventProperties[index] as PendingEventProperty
    pendingEventProperties[index] = {
      ...current,
      sampleCount: current.sampleCount + 1,
      sampleValue: stringifyValue(value).slice(0, 160),
    }
    return
  }
  pendingEventProperties.unshift({
    id: createId('pending_prop'),
    propertyName,
    eventName,
    detectedType: inferDataType(value),
    sampleValue: stringifyValue(value).slice(0, 160),
    firstSeenAt: nowText(),
    sampleCount: 1,
  })
}

function trackPendingUserProperty(propertyName: string, value: unknown): void {
  const index = pendingUserProperties.findIndex((property) => property.propertyName === propertyName)
  if (index >= 0) {
    const current = pendingUserProperties[index] as PendingUserProperty
    pendingUserProperties[index] = {
      ...current,
      sampleCount: current.sampleCount + 1,
      sampleValue: stringifyValue(value).slice(0, 160),
    }
    return
  }
  pendingUserProperties.unshift({
    id: createId('pending_up'),
    propertyName,
    detectedType: inferDataType(value),
    sampleValue: stringifyValue(value).slice(0, 160),
    firstSeenAt: nowText(),
    sampleCount: 1,
  })
}

function createAutoEvent(eventName: string, params: Record<string, unknown>, sourceType: EventMetadata['sourceType'] = 'custom'): EventMetadata {
  const event: EventMetadata = {
    id: createId('event'),
    appId: appContext.appId,
    eventName,
    displayName: eventName,
    description: '入库校验关闭时由上报数据自动登记。',
    sourceType,
    status: 'enabled',
    isPreset: false,
    isRelationEvent: eventName.startsWith('$inactive_'),
    isPassiveEvent: eventName.startsWith('$inactive_'),
    propertyCount: 0,
    commonPropertyCount: eventProperties.filter((property) => property.propertyScope === 'event_common_header').length,
    screenshotCount: 0,
    recent30dQueryCount: 0,
    recent30dQueryUserCount: 0,
    yesterdayIngestCount: 0,
    createdAt: nowText(),
    updatedAt: nowText(),
    createdBy: '系统自动',
    associatedPropertyIds: [],
  }
  events.unshift(event)
  Object.entries(params).forEach(([propertyName, value]) => {
    if (!PROPERTY_NAME_REGEX.test(propertyName)) {
      return
    }
    if (!eventProperties.some((property) => property.propertyName === propertyName && property.associatedEventIds.includes(event.id))) {
      eventProperties.unshift({
        id: createId('prop'),
        appId: appContext.appId,
        propertyName,
        displayName: propertyName,
        description: '入库校验关闭时由上报数据自动登记。',
        dataType: inferDataType(value),
        propertyScope: 'event_param',
        associatedEventIds: [event.id],
        isPreset: false,
        status: 'enabled',
        dictionaryStatus: 'none',
        createdAt: nowText(),
        updatedAt: nowText(),
      })
    }
  })
  refreshEventPropertyCounts()
  refreshGovernanceUsage()
  return event
}

function parseCsvRows(csvText: string): string[][] {
  return csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, '').replaceAll('""', '"')))
}

function sourceToRegistrationSource(source?: string, isPreset = false): MetadataRegistrationSource {
  if (isPreset || source === 'preset') {
    return 'system_preset'
  }
  if (source === 'integrated') {
    return 'integration'
  }
  if (source === 'relation_generated') {
    return 'relation_generated'
  }
  return 'manual'
}

function defaultPlatforms(seed: string): Platform[] {
  if (seed.includes('web') || seed.includes('page') || seed.includes('click')) {
    return ['web_js']
  }
  if (seed.includes('mp') || seed.includes('wechat')) {
    return ['wechat_mp']
  }
  if (seed.includes('server') || seed.includes('api')) {
    return ['server_java', 'http_api']
  }
  return ['android', 'ios', 'web_js']
}

function defaultTags(seed: string, source?: string): string[] {
  if (source === 'relation_generated' || seed.startsWith('$inactive_')) {
    return ['关系事件']
  }
  if (seed.includes('pay') || seed.includes('order')) {
    return ['交易']
  }
  if (seed.includes('product') || seed.includes('page')) {
    return ['内容']
  }
  if (seed.includes('auto') || seed.includes('element')) {
    return ['全埋点']
  }
  return ['核心埋点']
}

function eventDefaults(event: EventMetadata): EventMetadata {
  return {
    ...event,
    owner: event.owner ?? event.createdBy ?? '数据管理员',
    tags: event.tags ?? defaultTags(event.eventName, event.sourceType),
    reportingPlatforms: event.reportingPlatforms ?? defaultPlatforms(event.eventName),
    hasIngestedData: event.hasIngestedData ?? event.yesterdayIngestCount > 0,
    registrationSource: event.registrationSource ?? sourceToRegistrationSource(event.sourceType, event.isPreset),
    sensitiveLevel: event.sensitiveLevel ?? 'internal',
    businessDefinition: event.businessDefinition ?? event.description ?? '',
    editableFields: event.editableFields ?? ['displayName', 'description', 'categoryId', 'tags', 'owner', 'businessDefinition', 'sensitiveLevel', 'status', 'associatedProperties'],
    deleteAllowed: event.deleteAllowed ?? (!event.isPreset && event.yesterdayIngestCount === 0 && event.recent30dQueryCount === 0),
  }
}

function eventPropertyDefaults(property: EventPropertyMetadata): EventPropertyMetadata {
  const relatedEvents = events.filter((event) => property.associatedEventIds.includes(event.id))
  const yesterdayIngest = relatedEvents.reduce((sum, event) => sum + Math.round(event.yesterdayIngestCount / Math.max(event.propertyCount, 1)), 0)
  const hasData = property.hasIngestedData ?? yesterdayIngest > 0
  return {
    ...property,
    owner: property.owner ?? (property.isPreset ? '系统预置' : '数据管理员'),
    tags: property.tags ?? defaultTags(property.propertyName, property.isPreset ? 'preset' : 'custom'),
    reportingPlatforms: property.reportingPlatforms ?? [...new Set(relatedEvents.flatMap((event) => event.reportingPlatforms ?? defaultPlatforms(event.eventName)))],
    hasIngestedData: hasData,
    registrationSource: property.registrationSource ?? sourceToRegistrationSource(property.isPreset ? 'preset' : 'manual', property.isPreset),
    sensitiveLevel: property.sensitiveLevel ?? (['user_id', 'phone', 'email', 'device_id'].some((key) => property.propertyName.includes(key)) ? 'sensitive' : 'internal'),
    unit: property.unit ?? (['int', 'float'].includes(property.dataType) && property.propertyName.includes('amount') ? '元' : undefined),
    businessDefinition: property.businessDefinition ?? property.description ?? '',
    editableFields: property.editableFields ?? ['displayName', 'description', 'tags', 'owner', 'unit', 'businessDefinition', 'sensitiveLevel', 'status'],
    deleteAllowed: property.deleteAllowed ?? (!property.isPreset && !hasData && property.associatedEventIds.length === 0),
  }
}

function userPropertyDefaults(property: UserPropertyMetadata): UserPropertyMetadata {
  const hasData = property.hasIngestedData ?? property.status === 'enabled'
  return {
    ...property,
    owner: property.owner ?? (property.isPreset ? '系统预置' : '用户增长团队'),
    tags: property.tags ?? defaultTags(property.propertyName, property.isPreset ? 'preset' : 'manual'),
    reportingPlatforms: property.reportingPlatforms ?? ['android', 'ios', 'web_js'],
    hasIngestedData: hasData,
    registrationSource: property.registrationSource ?? sourceToRegistrationSource(property.isPreset ? 'preset' : 'manual', property.isPreset),
    sensitiveLevel: property.sensitiveLevel ?? (['gender', 'age', 'vip'].some((key) => property.propertyName.includes(key)) ? 'internal' : 'sensitive'),
    unit: property.unit ?? (['int', 'float'].includes(property.dataType) && property.propertyName.includes('cost') ? '元' : undefined),
    businessDefinition: property.businessDefinition ?? property.description ?? '',
    editableFields: property.editableFields ?? ['displayName', 'description', 'tags', 'owner', 'unit', 'businessDefinition', 'sensitiveLevel', 'status'],
    deleteAllowed: property.deleteAllowed ?? (!property.isPreset && !hasData),
  }
}

function normalizeMetadataCollections(): void {
  events = events.map(eventDefaults)
  eventProperties = eventProperties.map(eventPropertyDefaults)
  userProperties = userProperties.map(userPropertyDefaults)
  virtualEvents = virtualEvents.map((event) => ({
    ...event,
    owner: event.owner ?? event.createdBy ?? '分析师',
    tags: event.tags ?? ['虚拟事件'],
    reportingPlatforms: event.reportingPlatforms ?? ['web_js', 'android', 'ios'],
    hasIngestedData: false,
    registrationSource: event.registrationSource ?? 'manual',
    sensitiveLevel: event.sensitiveLevel ?? 'internal',
    businessDefinition: event.businessDefinition ?? event.description ?? '',
    editableFields: event.editableFields ?? ['displayName', 'description', 'tags', 'owner', 'businessDefinition', 'status'],
    deleteAllowed: event.deleteAllowed ?? true,
  }))
  virtualProperties = virtualProperties.map((property) => ({
    ...property,
    owner: property.owner ?? '分析师',
    tags: property.tags ?? ['虚拟属性'],
    reportingPlatforms: property.reportingPlatforms ?? ['web_js', 'android', 'ios'],
    hasIngestedData: false,
    registrationSource: property.registrationSource ?? 'manual',
    sensitiveLevel: property.sensitiveLevel ?? 'internal',
    businessDefinition: property.businessDefinition ?? property.description ?? '',
    editableFields: property.editableFields ?? ['displayName', 'description', 'tags', 'owner', 'businessDefinition'],
    deleteAllowed: property.deleteAllowed ?? property.status !== 'deleted',
  }))
  visualEvents = visualEvents.map((event) => ({
    ...event,
    owner: event.owner ?? '产品运营',
    tags: event.tags ?? ['圈选事件'],
    reportingPlatforms: event.reportingPlatforms ?? (event.platform === 'web' ? ['web_js'] : ['android', 'ios']),
    hasIngestedData: event.hasIngestedData ?? event.recent48hTriggerCount > 0,
    registrationSource: event.registrationSource ?? 'visual_selection',
    sensitiveLevel: event.sensitiveLevel ?? 'internal',
    businessDefinition: event.businessDefinition ?? event.description ?? '',
    editableFields: event.editableFields ?? ['description', 'tags', 'owner', 'businessDefinition', 'pageConfig', 'status'],
    deleteAllowed: event.deleteAllowed ?? event.recent48hTriggerCount === 0,
  }))
  customSessions = customSessions.map((session) => ({
    ...session,
    owner: session.owner ?? '分析师',
    tags: session.tags ?? ['Session'],
    reportingPlatforms: session.reportingPlatforms ?? session.platformScope,
    hasIngestedData: session.hasIngestedData ?? session.status === 'enabled',
    registrationSource: session.registrationSource ?? 'manual',
    sensitiveLevel: session.sensitiveLevel ?? 'internal',
    businessDefinition: session.businessDefinition ?? session.description ?? '',
    editableFields: session.editableFields ?? ['displayName', 'description', 'tags', 'owner', 'businessDefinition', 'sessionRule', 'status'],
    deleteAllowed: session.deleteAllowed ?? true,
  }))
}

normalizeMetadataCollections()

function ensureEventNameValid(eventName: string): void {
  const name = eventName.trim()
  if (!EVENT_NAME_REGEX.test(name)) {
    throw new Error('事件名称需 1-255 字符，以英文或数字开头，只能包含英文、数字、下划线、空格、点、横线')
  }
  if (name.startsWith('$') || name.startsWith('__')) {
    throw new Error('事件名不得以 $ 或 __ 开头，系统白名单除外')
  }
  if (events.some((event) => event.eventName === name) || virtualEvents.some((event) => event.eventName === name) || visualEvents.some((event) => event.eventName === name)) {
    throw new Error('事件名不得与一般事件、虚拟事件或圈选事件重复')
  }
}

function ensurePropertyNameValid(propertyName: string): void {
  const name = propertyName.trim()
  if (!PROPERTY_NAME_REGEX.test(name)) {
    throw new Error('属性名称需 1-64 字符，以英文或数字开头，只能包含英文、数字、下划线、空格、点、横线')
  }
  if (['user_unique_id', 'ssid', 'event_id'].includes(name)) {
    throw new Error('属性名不得为 user_unique_id、ssid、event_id')
  }
  if (mockPresetProperties.some((property) => property.name === name)) {
    throw new Error('属性名不得与预置属性名称冲突')
  }
}

function ensureVirtualPropertyNameValid(propertyName: string): string {
  const rawName = propertyName.trim()
  const normalized = rawName.startsWith('$vp') ? rawName : `$vp_${rawName}`
  const nameWithoutPrefix = normalized.replace(/^\$vp_?/, '')
  if (!VIRTUAL_PROPERTY_REGEX.test(nameWithoutPrefix)) {
    throw new Error('虚拟属性名称仅支持英文、数字、下划线，以字母或下划线开头，长度 100 以内')
  }
  if (virtualProperties.some((property) => property.propertyName === normalized && property.status !== 'deleted')) {
    throw new Error('虚拟属性名称已存在')
  }
  return normalized
}

function propertyExists(name: string, kind: 'event' | 'user'): boolean {
  return kind === 'event'
    ? eventProperties.some((property) => property.propertyName === name && property.status !== 'disabled')
    : userProperties.some((property) => property.propertyName === name && property.status !== 'disabled')
}

function referencedPropertiesFromSql(sql: string): SqlValidationResult['referencedProperties'] {
  const references: SqlValidationResult['referencedProperties'] = []
  const eventMatches = [...sql.matchAll(/event_params\.(`[^`]+`|[a-zA-Z0-9_.$-]+)/g)]
  const userMatches = [...sql.matchAll(/user_profiles\.(`[^`]+`|[a-zA-Z0-9_.$-]+)/g)]

  eventMatches.forEach((match) => {
    const propertyName = (match[1] ?? '').replaceAll('`', '')
    const property = eventProperties.find((item) => item.propertyName === propertyName)
    references.push({
      propertyId: property?.id ?? `missing_${propertyName}`,
      propertyName,
      propertyKind: 'event_property',
    })
  })

  userMatches.forEach((match) => {
    const propertyName = (match[1] ?? '').replaceAll('`', '')
    const property = userProperties.find((item) => item.propertyName === propertyName)
    references.push({
      propertyId: property?.id ?? `missing_${propertyName}`,
      propertyName,
      propertyKind: 'user_property',
    })
  })

  return references
}

function refreshEventPropertyCounts(): void {
  events = events.map((event) => ({
    ...event,
    propertyCount: eventProperties.filter((property) => property.propertyScope === 'event_param' && property.associatedEventIds.includes(event.id)).length,
    commonPropertyCount: eventProperties.filter((property) => property.propertyScope === 'event_common_header').length,
    associatedPropertyIds: eventProperties.filter((property) => property.associatedEventIds.includes(event.id)).map((property) => property.id),
  }))
}

function refreshGovernanceUsage(): void {
  mockGovernanceMetrics.metadataUsage.eventCount = events.length
  mockGovernanceMetrics.metadataUsage.eventPropertyCount = eventProperties.length
  mockGovernanceMetrics.metadataUsage.userPropertyCount = userProperties.length
  mockGovernanceMetrics.metadataUsage.virtualEventCount = virtualEvents.length
  mockGovernanceMetrics.metadataUsage.virtualPropertyCount = virtualProperties.filter((property) => property.status !== 'deleted').length
  mockGovernanceMetrics.metadataUsage.visualEventCount = visualEvents.length
}

function toCsv(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? '')
          return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
        })
        .join(','),
    )
    .join('\n')
}

function resolveCategoryId(category?: string): string | undefined {
  const value = category?.trim()
  if (!value) {
    return undefined
  }
  const matched = eventCategories.find((item) => item.id === value || item.name === value)
  return matched?.id ?? value
}

function normalizeSensitiveLevel(level?: string): MetadataSensitiveLevel | undefined {
  const value = level?.trim().toLowerCase()
  const map: Record<string, MetadataSensitiveLevel> = {
    public: 'public',
    internal: 'internal',
    sensitive: 'sensitive',
    restricted: 'restricted',
    公开: 'public',
    内部: 'internal',
    敏感: 'sensitive',
    受限: 'restricted',
  }
  return value ? map[value] : undefined
}

function createImportPatch(row: MetadataDisplayImportRow, includeCategory = false): Partial<MetadataProductionFields & { displayName: string, description: string, categoryId: string }> {
  const patch: Partial<MetadataProductionFields & { displayName: string, description: string, categoryId: string }> = {}
  if (row.displayName !== undefined) {
    patch.displayName = row.displayName.slice(0, 100)
  }
  if (row.description !== undefined) {
    patch.description = row.description.slice(0, 1000)
  }
  if (includeCategory && row.categoryId !== undefined) {
    patch.categoryId = resolveCategoryId(row.categoryId)
  }
  if (row.owner !== undefined) {
    patch.owner = row.owner
  }
  if (row.tags !== undefined) {
    patch.tags = row.tags
  }
  if (row.unit !== undefined) {
    patch.unit = row.unit
  }
  if (row.businessDefinition !== undefined) {
    patch.businessDefinition = row.businessDefinition
  }
  if (row.sensitiveLevel !== undefined) {
    patch.sensitiveLevel = row.sensitiveLevel
  }
  return patch
}

function pushImportError(errors: MetadataDisplayImportResult['errors'], row: MetadataDisplayImportRow, reason: string): void {
  if (errors.length < 50) {
    errors.push({ rowNumber: row.rowNumber, name: row.name || '-', reason })
  }
}

function rowFromEvent(eventInput: EventMetadata): MetadataTableRow {
  const event = eventDefaults(eventInput)
  return {
    id: event.id,
    kind: event.isRelationEvent || event.isPassiveEvent ? 'relation_event' : 'event',
    name: event.eventName,
    displayName: event.displayName,
    description: event.description,
    status: event.status,
    categoryId: event.categoryId,
    sourceType: event.sourceType,
    createdBy: event.createdBy,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
    recent30dQueryCount: event.recent30dQueryCount,
    recent30dQueryUserCount: event.recent30dQueryUserCount,
    yesterdayIngestCount: event.yesterdayIngestCount,
    relatedAssetCount: mockLineageItems.filter((item) => item.objectType === 'event' && item.objectId === event.id).length,
    owner: event.owner,
    tags: event.tags,
    reportingPlatforms: event.reportingPlatforms,
    hasIngestedData: event.hasIngestedData,
    registrationSource: event.registrationSource,
    sensitiveLevel: event.sensitiveLevel,
    unit: event.unit,
    businessDefinition: event.businessDefinition,
    editableFields: event.editableFields,
    deleteAllowed: event.deleteAllowed,
  }
}

function propertyQueryCount(propertyId: string): number {
  const lineageCount = mockLineageItems.filter((item) => item.objectId === propertyId).reduce((sum, item) => sum + (item.queryCount30d ?? 0), 0)
  return lineageCount || Math.max(0, eventProperties.find((property) => property.id === propertyId)?.associatedEventIds.length ?? 0) * 12
}

function rowFromEventProperty(propertyInput: EventPropertyMetadata): MetadataTableRow {
  const property = eventPropertyDefaults(propertyInput)
  const relatedEvents = events.filter((event) => property.associatedEventIds.includes(event.id))
  const yesterdayIngestCount = relatedEvents.reduce((sum, event) => sum + Math.round(event.yesterdayIngestCount / Math.max(event.propertyCount, 1)), 0)
  return {
    id: property.id,
    kind: 'event_property',
    name: property.propertyName,
    displayName: property.displayName,
    description: property.description,
    status: property.status,
    dataType: property.dataType,
    sourceType: property.propertyScope,
    createdAt: property.createdAt,
    updatedAt: property.updatedAt,
    recent30dQueryCount: propertyQueryCount(property.id),
    recent30dQueryUserCount: Math.round(propertyQueryCount(property.id) / 4),
    yesterdayIngestCount,
    relatedAssetCount: mockLineageItems.filter((item) => item.objectType === 'event_property' && item.objectId === property.id).length,
    owner: property.owner,
    tags: property.tags,
    reportingPlatforms: property.reportingPlatforms,
    hasIngestedData: property.hasIngestedData,
    registrationSource: property.registrationSource,
    sensitiveLevel: property.sensitiveLevel,
    unit: property.unit,
    businessDefinition: property.businessDefinition,
    editableFields: property.editableFields,
    deleteAllowed: property.deleteAllowed,
    dictionaryStatus: property.dictionaryStatus,
  }
}

function rowFromUserProperty(propertyInput: UserPropertyMetadata): MetadataTableRow {
  const property = userPropertyDefaults(propertyInput)
  return {
    id: property.id,
    kind: 'user_property',
    name: property.propertyName,
    displayName: property.displayName,
    description: property.description,
    status: property.status,
    dataType: property.dataType,
    sourceType: property.calculationLogic,
    createdAt: property.createdAt,
    updatedAt: property.updatedAt,
    recent30dQueryCount: propertyQueryCount(property.id),
    recent30dQueryUserCount: Math.round(propertyQueryCount(property.id) / 5),
    yesterdayIngestCount: property.hasIngestedData ? 3000 : 0,
    relatedAssetCount: mockLineageItems.filter((item) => item.objectType === 'user_property' && item.objectId === property.id).length,
    owner: property.owner,
    tags: property.tags,
    reportingPlatforms: property.reportingPlatforms,
    hasIngestedData: property.hasIngestedData,
    registrationSource: property.registrationSource,
    sensitiveLevel: property.sensitiveLevel,
    unit: property.unit,
    businessDefinition: property.businessDefinition,
    editableFields: property.editableFields,
    deleteAllowed: property.deleteAllowed,
    dictionaryStatus: property.dictionaryStatus,
  }
}

function rowFromVirtualEvent(event: VirtualEvent): MetadataTableRow {
  return {
    id: event.id,
    kind: 'virtual_event',
    name: event.eventName,
    displayName: event.displayName,
    description: event.description,
    status: event.status,
    sourceType: 'virtual',
    createdBy: event.createdBy,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
    recent30dQueryCount: event.combinedEvents.length * 18,
    recent30dQueryUserCount: event.combinedEvents.length * 5,
    yesterdayIngestCount: 0,
    relatedAssetCount: event.combinedEvents.length,
    owner: event.owner,
    tags: event.tags,
    reportingPlatforms: event.reportingPlatforms,
    hasIngestedData: event.hasIngestedData,
    registrationSource: event.registrationSource,
    sensitiveLevel: event.sensitiveLevel,
    businessDefinition: event.businessDefinition,
    editableFields: event.editableFields,
    deleteAllowed: event.deleteAllowed,
  }
}

function rowFromVirtualProperty(property: VirtualProperty): MetadataTableRow {
  return {
    id: property.id,
    kind: 'virtual_property',
    name: property.propertyName,
    displayName: property.displayName,
    description: property.description,
    status: property.status,
    dataType: property.dataType,
    sourceType: property.propertyType,
    createdAt: property.createdAt,
    updatedAt: property.updatedAt,
    recent30dQueryCount: property.referencedProperties.length * 16,
    recent30dQueryUserCount: property.referencedProperties.length * 4,
    yesterdayIngestCount: 0,
    relatedAssetCount: property.referencedProperties.length,
    owner: property.owner,
    tags: property.tags,
    reportingPlatforms: property.reportingPlatforms,
    hasIngestedData: property.hasIngestedData,
    registrationSource: property.registrationSource,
    sensitiveLevel: property.sensitiveLevel,
    businessDefinition: property.businessDefinition,
    editableFields: property.editableFields,
    deleteAllowed: property.deleteAllowed,
  }
}

function rowFromVisualEvent(event: VisualEvent): MetadataTableRow {
  return {
    id: event.id,
    kind: 'visual_event',
    name: event.eventName,
    displayName: event.description || event.eventName,
    description: event.description,
    status: event.status,
    sourceType: event.platform,
    createdAt: event.createdAt,
    updatedAt: event.createdAt,
    recent30dQueryCount: event.recent48hTriggerCount,
    recent30dQueryUserCount: event.recent48hUserCount,
    yesterdayIngestCount: event.recent48hTriggerCount,
    relatedAssetCount: 1,
    owner: event.owner,
    tags: event.tags,
    reportingPlatforms: event.reportingPlatforms,
    hasIngestedData: event.hasIngestedData,
    registrationSource: event.registrationSource,
    sensitiveLevel: event.sensitiveLevel,
    businessDefinition: event.businessDefinition,
    editableFields: event.editableFields,
    deleteAllowed: event.deleteAllowed,
  }
}

function rowFromCustomSession(session: CustomSession): MetadataTableRow {
  return {
    id: session.id,
    kind: 'custom_session',
    name: session.sessionName,
    displayName: session.displayName,
    description: session.description,
    status: session.status,
    sourceType: session.cutRule.type,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    recent30dQueryCount: session.eventScope.eventIds.length * 11,
    recent30dQueryUserCount: session.eventScope.eventIds.length * 3,
    yesterdayIngestCount: session.status === 'enabled' ? 1024 : 0,
    relatedAssetCount: session.eventScope.eventIds.length,
    owner: session.owner,
    tags: session.tags,
    reportingPlatforms: session.reportingPlatforms,
    hasIngestedData: session.hasIngestedData,
    registrationSource: session.registrationSource,
    sensitiveLevel: session.sensitiveLevel,
    businessDefinition: session.businessDefinition,
    editableFields: session.editableFields,
    deleteAllowed: session.deleteAllowed,
  }
}

function metadataRowsForKind(kind: MetadataManagementKind): MetadataTableRow[] {
  normalizeMetadataCollections()
  if (kind === 'event') {
    return events.filter((event) => !event.isRelationEvent && !event.isPassiveEvent).map(rowFromEvent)
  }
  if (kind === 'relation_event') {
    return events.filter((event) => event.isRelationEvent || event.isPassiveEvent).map(rowFromEvent)
  }
  if (kind === 'event_property') {
    return eventProperties.map(rowFromEventProperty)
  }
  if (kind === 'user_property') {
    return userProperties.map(rowFromUserProperty)
  }
  if (kind === 'virtual_event') {
    return virtualEvents.map(rowFromVirtualEvent)
  }
  if (kind === 'virtual_property') {
    return virtualProperties.filter((property) => property.status !== 'deleted').map(rowFromVirtualProperty)
  }
  if (kind === 'visual_event') {
    return visualEvents.map(rowFromVisualEvent)
  }
  if (kind === 'custom_session') {
    return customSessions.map(rowFromCustomSession)
  }
  return []
}

function matchesMetadataQuery(row: MetadataTableRow, query: MetadataTableQuery): boolean {
  const keyword = query.keyword?.trim().toLowerCase()
  const matchKeyword =
    !keyword ||
    [row.name, row.displayName, row.description, row.owner, row.businessDefinition, ...(row.tags ?? [])]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword))
  const matchStatus = !query.status || query.status === 'all' || row.status === query.status
  const matchMissing = !query.onlyMissingInfo || !row.displayName || !row.description || !row.owner
  const matchTags = !query.tags?.length || query.tags.every((tag) => row.tags?.includes(tag))
  return matchKeyword && matchStatus && matchMissing && matchTags
}

function sortMetadataRows(rows: MetadataTableRow[], query: MetadataTableQuery): MetadataTableRow[] {
  const sortBy = query.sortBy ?? 'updatedAt'
  const direction = query.sortOrder === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const left = a[sortBy] ?? ''
    const right = b[sortBy] ?? ''
    if (typeof left === 'number' && typeof right === 'number') {
      return (left - right) * direction
    }
    return String(left).localeCompare(String(right), 'zh-Hans-CN') * direction
  })
}

function findMetadataRow(kind: MetadataManagementKind, id: string): MetadataTableRow | undefined {
  return metadataRowsForKind(kind).find((row) => row.id === id)
}

function metadataAuditResource(kind: MetadataManagementKind): string {
  const map: Record<MetadataManagementKind, string> = {
    event: 'metadata.event',
    relation_event: 'metadata.event',
    event_property: 'metadata.eventProperty',
    user_property: 'metadata.userProperty',
    virtual_event: 'metadata.virtualEvent',
    virtual_property: 'metadata.virtualProperty',
    visual_event: 'metadata.visualEvent',
    session: 'metadata.session',
    custom_session: 'metadata.session',
  }
  return map[kind]
}

function updateEventProductionFields(eventId: string, patch: Partial<MetadataProductionFields & Pick<EventMetadata, 'displayName' | 'description' | 'categoryId'>>): void {
  events = events.map((event) => (event.id === eventId ? { ...event, ...patch, updatedAt: nowText() } : event))
}

function updateEventPropertyProductionFields(propertyId: string, patch: Partial<MetadataProductionFields & Pick<EventPropertyMetadata, 'displayName' | 'description'>>): void {
  eventProperties = eventProperties.map((property) => (property.id === propertyId ? { ...property, ...patch, updatedAt: nowText() } : property))
}

function updateUserPropertyProductionFields(propertyId: string, patch: Partial<MetadataProductionFields & Pick<UserPropertyMetadata, 'displayName' | 'description'>>): void {
  userProperties = userProperties.map((property) => (property.id === propertyId ? { ...property, ...patch, updatedAt: nowText() } : property))
}

function updateVirtualEventProductionFields(eventId: string, patch: Partial<MetadataProductionFields & Pick<VirtualEvent, 'displayName' | 'description'>>): void {
  virtualEvents = virtualEvents.map((event) => (event.id === eventId ? { ...event, ...patch, updatedAt: nowText() } : event))
}

function updateVirtualPropertyProductionFields(propertyId: string, patch: Partial<MetadataProductionFields & Pick<VirtualProperty, 'displayName' | 'description'>>): void {
  virtualProperties = virtualProperties.map((property) => (property.id === propertyId ? { ...property, ...patch, updatedAt: nowText() } : property))
}

function updateVisualEventProductionFields(eventId: string, patch: Partial<MetadataProductionFields & Pick<VisualEvent, 'description'>> & { displayName?: string }): void {
  visualEvents = visualEvents.map((event) => (event.id === eventId ? { ...event, ...patch, description: patch.description ?? patch.displayName ?? event.description } : event))
}

function updateCustomSessionProductionFields(sessionId: string, patch: Partial<MetadataProductionFields & Pick<CustomSession, 'displayName' | 'description'>>): void {
  customSessions = customSessions.map((session) => (session.id === sessionId ? { ...session, ...patch, updatedAt: nowText() } : session))
}

function applyMetadataPatch(kind: MetadataManagementKind, id: string, patch: Partial<MetadataProductionFields & { displayName: string, description: string, categoryId: string }>): void {
  if (kind === 'event' || kind === 'relation_event') {
    updateEventProductionFields(id, patch)
  } else if (kind === 'event_property') {
    updateEventPropertyProductionFields(id, patch)
  } else if (kind === 'user_property') {
    updateUserPropertyProductionFields(id, patch)
  } else if (kind === 'virtual_event') {
    updateVirtualEventProductionFields(id, patch)
  } else if (kind === 'virtual_property') {
    updateVirtualPropertyProductionFields(id, patch)
  } else if (kind === 'visual_event') {
    updateVisualEventProductionFields(id, patch)
  } else if (kind === 'custom_session') {
    updateCustomSessionProductionFields(id, patch)
  }
}

function setMetadataStatus(kind: MetadataManagementKind, id: string, status: string): void {
  if (kind === 'event' || kind === 'relation_event') {
    events = events.map((event) => (event.id === id ? { ...event, status: status as MetadataStatus, updatedAt: nowText() } : event))
  } else if (kind === 'event_property') {
    eventProperties = eventProperties.map((property) => (property.id === id ? { ...property, status: status as MetadataStatus, updatedAt: nowText() } : property))
  } else if (kind === 'user_property') {
    userProperties = userProperties.map((property) => (property.id === id ? { ...property, status: status as MetadataStatus, updatedAt: nowText() } : property))
  } else if (kind === 'virtual_event') {
    virtualEvents = virtualEvents.map((event) => (event.id === id ? { ...event, status: status as VirtualEvent['status'], updatedAt: nowText() } : event))
  } else if (kind === 'virtual_property') {
    virtualProperties = virtualProperties.map((property) => (property.id === id ? { ...property, status: status as VirtualProperty['status'], updatedAt: nowText() } : property))
  } else if (kind === 'visual_event') {
    visualEvents = visualEvents.map((event) => (event.id === id ? { ...event, status: status as VisualEvent['status'] } : event))
  } else if (kind === 'custom_session') {
    customSessions = customSessions.map((session) => (session.id === id ? { ...session, status: status as CustomSession['status'], updatedAt: nowText() } : session))
  }
}

function deleteMetadataItem(kind: MetadataManagementKind, id: string): void {
  if (kind === 'event' || kind === 'relation_event') {
    events = events.filter((event) => event.id !== id)
    eventProperties = eventProperties.map((property) => ({ ...property, associatedEventIds: property.associatedEventIds.filter((eventId) => eventId !== id) }))
  } else if (kind === 'event_property') {
    eventProperties = eventProperties.filter((property) => property.id !== id)
    refreshEventPropertyCounts()
  } else if (kind === 'user_property') {
    userProperties = userProperties.filter((property) => property.id !== id)
  } else if (kind === 'virtual_event') {
    virtualEvents = virtualEvents.filter((event) => event.id !== id)
  } else if (kind === 'virtual_property') {
    virtualProperties = virtualProperties.map((property) => (property.id === id ? { ...property, status: 'deleted', updatedAt: nowText() } : property))
  } else if (kind === 'visual_event') {
    visualEvents = visualEvents.filter((event) => event.id !== id)
  } else if (kind === 'custom_session') {
    customSessions = customSessions.filter((session) => session.id !== id)
  }
}

async function listMetadataTable(query: MetadataTableQuery): Promise<MetadataTableResult> {
  await delay()
  const page = Math.max(1, query.page ?? 1)
  const pageSize = Math.max(5, query.pageSize ?? 10)
  const filtered = sortMetadataRows(metadataRowsForKind(query.kind).filter((row) => matchesMetadataQuery(row, query)), query)
  const start = (page - 1) * pageSize
  return clone({
    rows: filtered.slice(start, start + pageSize),
    total: filtered.length,
    page,
    pageSize,
  })
}

async function getMetadataImpactPreview(kind: MetadataManagementKind, id: string, action: MetadataImpactPreview['action']): Promise<MetadataImpactPreview> {
  await delay()
  const row = findMetadataRow(kind, id)
  if (!row) {
    throw new Error('元数据不存在')
  }
  const lineageKind = kind === 'event' || kind === 'relation_event' ? 'event' : kind === 'event_property' ? 'event_property' : kind === 'user_property' ? 'user_property' : undefined
  const affectedLineage = lineageKind ? mockLineageItems.filter((item) => item.objectType === lineageKind && item.objectId === id) : []
  const relatedCharts = affectedLineage.filter((item) => item.usageType === 'chart' || item.usageType === 'dashboard').length + row.relatedAssetCount
  const relatedSegments = affectedLineage.filter((item) => item.usageType === 'segment').length
  const relatedVirtualAssets =
    virtualEvents.filter((event) => event.combinedEvents.some((component) => component.eventId === id)).length +
    virtualProperties.filter((property) => property.referencedProperties.some((reference) => reference.propertyId === id)).length
  const canProceed = action !== 'delete' || Boolean(row.deleteAllowed)
  return clone({
    kind,
    id,
    name: row.name,
    action,
    canProceed,
    reason: canProceed ? undefined : '已有上报数据、查询或系统预置，不能删除；可改为禁用或不显示',
    recent30dQueryCount: row.recent30dQueryCount,
    yesterdayIngestCount: row.yesterdayIngestCount,
    relatedCharts,
    relatedSegments,
    relatedVirtualAssets,
    affectedLineage,
  })
}

async function getMetadataAuditTimeline(kind: MetadataManagementKind, id: string): Promise<AuditLog[]> {
  await delay()
  const resourceType = metadataAuditResource(kind)
  return clone(auditLogs.filter((log) => log.resourceType === resourceType && (log.resourceId === id || log.resourceId === 'batch')).slice(0, 50))
}

async function previewBatchMetadataAction(payload: MetadataBatchPayload): Promise<MetadataBatchPreview> {
  await delay()
  const rows = payload.ids.map((id) => findMetadataRow(payload.kind, id)).filter(Boolean) as MetadataTableRow[]
  const blockers: MetadataBatchPreview['blockers'] = []
  rows.forEach((row) => {
    if (payload.action === 'delete' && !row.deleteAllowed) {
      blockers.push({ id: row.id, name: row.name, reason: '已有上报/查询/预置或存在引用，生产环境仅允许禁用或不显示' })
    }
    if (payload.action === 'disable' && row.recent30dQueryCount > 100 && !payload.confirmedImpact) {
      blockers.push({ id: row.id, name: row.name, reason: '近 30 天查询量较高，需先确认影响预览' })
    }
  })
  return clone({
    action: payload.action,
    kind: payload.kind,
    total: payload.ids.length,
    executableCount: Math.max(rows.length - blockers.length, 0),
    blockedCount: blockers.length,
    blockers,
    warnings: rows.length === 0 ? ['未选择元数据'] : [`将影响 ${rows.reduce((sum, row) => sum + row.relatedAssetCount, 0)} 个关联资产`],
  })
}

async function executeBatchMetadataAction(payload: MetadataBatchPayload): Promise<MetadataBatchResult> {
  const preview = await previewBatchMetadataAction(payload)
  if (preview.blockedCount > 0) {
    throw new Error(preview.blockers.map((blocker) => `${blocker.name}：${blocker.reason}`).join('；'))
  }
  const rows = payload.ids.map((id) => findMetadataRow(payload.kind, id)).filter(Boolean) as MetadataTableRow[]
  let updatedCount = 0
  let deletedCount = 0
  let exportedCsv: string | undefined
  if (payload.action === 'export') {
    exportedCsv = toCsv([
      ['类型', '名称', '展示名', '状态', '负责人', '标签', '上报平台', '是否有数据', '登记来源', '业务口径', '更新时间'],
      ...rows.map((row) => [
        row.kind,
        row.name,
        row.displayName ?? '',
        row.status,
        row.owner ?? '',
        row.tags?.join('|') ?? '',
        row.reportingPlatforms?.join('|') ?? '',
        row.hasIngestedData ? '是' : '否',
        row.registrationSource ?? '',
        row.businessDefinition ?? '',
        row.updatedAt,
      ]),
    ])
  } else {
    rows.forEach((row) => {
      if (payload.action === 'enable') {
        setMetadataStatus(payload.kind, row.id, 'enabled')
        updatedCount += 1
      } else if (payload.action === 'hide') {
        setMetadataStatus(payload.kind, row.id, 'hidden')
        updatedCount += 1
      } else if (payload.action === 'disable') {
        setMetadataStatus(payload.kind, row.id, 'disabled')
        updatedCount += 1
      } else if (payload.action === 'delete') {
        deleteMetadataItem(payload.kind, row.id)
        deletedCount += 1
      } else if (payload.action === 'update_display' || payload.action === 'update_owner') {
        applyMetadataPatch(payload.kind, row.id, payload.patch ?? {})
        updatedCount += 1
      }
    })
  }
  refreshEventPropertyCounts()
  refreshGovernanceUsage()
  createAudit(metadataAuditResource(payload.kind), 'batch', `metadata.batch.${payload.action}`, undefined, { ...payload, updatedCount, deletedCount })
  return clone({ ...preview, updatedCount, deletedCount, exportedCsv })
}

async function updateMetadataDisplayInfo(
  kind: MetadataManagementKind,
  id: string,
  patch: Partial<MetadataProductionFields & { displayName: string, description: string, categoryId: string }>,
): Promise<MetadataTableRow> {
  await delay()
  const before = findMetadataRow(kind, id)
  if (!before) {
    throw new Error('元数据不存在')
  }
  applyMetadataPatch(kind, id, patch)
  const after = findMetadataRow(kind, id)
  createAudit(metadataAuditResource(kind), id, 'metadata.displayInfo.update', before, after)
  return clone(after as MetadataTableRow)
}

async function updateMetadataOwnership(
  kind: MetadataManagementKind,
  id: string,
  patch: Partial<Pick<MetadataProductionFields, 'owner' | 'tags' | 'unit' | 'businessDefinition' | 'sensitiveLevel'>>,
): Promise<MetadataTableRow> {
  await delay()
  const before = findMetadataRow(kind, id)
  if (!before) {
    throw new Error('元数据不存在')
  }
  applyMetadataPatch(kind, id, patch)
  const after = findMetadataRow(kind, id)
  createAudit(metadataAuditResource(kind), id, 'metadata.ownership.update', before, after)
  return clone(after as MetadataTableRow)
}

async function getAppContext(): Promise<AppContext> {
  await delay()
  return clone(appContext)
}

async function getPermissions(): Promise<Permission[]> {
  await delay()
  return clone(mockPermissions)
}

async function getPermission(resource: PermissionResource): Promise<Permission | undefined> {
  await delay()
  return clone(mockPermissions.find((permission) => permission.resource === resource))
}

async function getAccessOverview() {
  await delay()
  return clone({
    app: appContext,
    sdkVersions: mockSdkVersions,
    sdkSettings: appContext.sdkSettings,
    recentHealth: mockRecentIngestionHealth,
  })
}

async function updateSdkSettings(settings: Partial<AppContext['sdkSettings']>): Promise<AppContext> {
  await delay()
  const before = clone(appContext)
  appContext = {
    ...appContext,
    sdkSettings: {
      ...appContext.sdkSettings,
      ...settings,
    },
  }
  createAudit('metadata.app', appContext.appId, 'metadata.app.updateSdkSettings', before, appContext)
  return clone(appContext)
}

async function validateBehaviorUpload(jsonText: string): Promise<UploadValidationResult> {
  await delay()
  const steps: UploadValidationStep[] = []
  const newErrors: ErrorLog[] = []
  let payload: BehaviorUploadPayload

  try {
    payload = JSON.parse(jsonText) as BehaviorUploadPayload
    steps.push({ name: '接收请求', status: 'success', message: 'JSON 已解析' })
  } catch {
    appendError(newErrors, 'unknown', 'event_error', '1010001', 'JSON 格式不合法，无法解析 header/user/events', jsonText)
    steps.push({ name: '接收请求', status: 'error', message: 'JSON 格式不合法' })
    errorLogs.unshift(...newErrors)
    saveState()
    return {
      accepted: false,
      receivedCount: 0,
      storedCount: 0,
      discardedCount: 0,
      abnormalPropertyCount: 0,
      steps,
      errors: clone(newErrors),
    }
  }

  const header = payload.header && typeof payload.header === 'object' && !Array.isArray(payload.header) ? payload.header : undefined
  const uploadEvents = Array.isArray(payload.events) ? payload.events : []
  const normalizedPayload: BehaviorUploadPayload = {
    ...payload,
    header: header ?? {},
    events: [],
  }

  if (!header) {
    appendError(newErrors, 'unknown', 'event_error', '1010001', 'header 必须为对象', payload)
  }
  if (uploadEvents.length === 0) {
    appendError(newErrors, 'unknown', 'event_error', '1010004', 'events 必须为非空数组', payload)
  }
  if (uploadEvents.length > 50) {
    appendError(newErrors, 'unknown', 'event_error', '1010004', 'HTTP API 批量上传每批次最多 50 条事件', payload)
  }
  steps.push({
    name: '解析 header/user/events',
    status: header && uploadEvents.length > 0 && uploadEvents.length <= 50 ? 'success' : 'error',
    message: `解析到 ${uploadEvents.length} 条事件`,
  })

  let storedCount = 0
  let discardedCount = 0
  let abnormalPropertyCount = 0
  const now = Date.now()
  const minTime = now - 7 * 24 * 60 * 60 * 1000
  const maxTime = now + 24 * 60 * 60 * 1000

  uploadEvents.slice(0, 50).forEach((uploadEvent) => {
    const params = normalizeParams(uploadEvent.params)
    const eventName = typeof uploadEvent.event === 'string' ? uploadEvent.event.trim() : ''
    let discarded = false
    let eventPropertyErrors = 0

    const appendEventError = (code: string, message: string): void => {
      appendError(newErrors, eventName || 'unknown', 'event_error', code, message, uploadEvent)
      discarded = true
    }
    const appendPropertyError = (code: string, message: string, rawPayload: unknown = uploadEvent): void => {
      appendError(newErrors, eventName || 'unknown', 'property_error', code, message, rawPayload)
      eventPropertyErrors += 1
      abnormalPropertyCount += 1
    }

    if (!EVENT_NAME_REGEX.test(eventName) && !events.some((event) => event.eventName === eventName)) {
      appendEventError('1010001', '事件名不符合正则或为空')
    }
    if ((eventName.startsWith('$') && !eventName.startsWith('$inactive_') && !events.some((event) => event.eventName === eventName)) || eventName.startsWith('__')) {
      appendEventError('1010002', '事件名命中系统保留规则')
    }
    if (virtualEvents.some((event) => event.eventName === eventName)) {
      appendEventError('1010003', '事件名与虚拟事件冲突，虚拟事件不能真实上报')
    }
    if (typeof uploadEvent.local_time_ms !== 'number' || uploadEvent.local_time_ms < minTime || uploadEvent.local_time_ms > maxTime) {
      appendEventError('1010006', '事件发生时间超出有效窗口期')
    }

    let eventMeta = events.find((event) => event.eventName === eventName)
    if (!eventMeta && eventName && !discarded) {
      trackPendingEvent(eventName, params)
      if (appContext.sdkSettings.ingestionValidationMode) {
        appendEventError('1010008', '事件元数据不存在，开启入库校验后需先验收')
      } else {
        eventMeta = createAutoEvent(eventName, params, eventName.startsWith('$inactive_') ? 'relation_generated' : 'custom')
      }
    }

    if (eventMeta?.status === 'disabled') {
      appendEventError('1010005', '事件已禁用，后续上报不构建入库')
    }
    if (eventMeta && ['pending_approval', 'blacklist', 'over_limit'].includes(eventMeta.status)) {
      appendEventError('1010007', '事件未验收、在黑名单或超限，不能入库')
    }

    Object.entries(header ?? {}).forEach(([propertyName, value]) => {
      const property = eventProperties.find((item) => item.propertyName === propertyName && item.propertyScope === 'event_common_header')
      const preset = mockPresetProperties.find((item) => item.name === propertyName && item.propertyType === 'preset_event_common_property')
      if (!PROPERTY_NAME_REGEX.test(propertyName) && !property && !preset) {
        appendPropertyError('1030001', `事件公共属性名不合法：${propertyName}`, { propertyName, value })
        return
      }
      if (!property && !preset) {
        trackPendingEventProperty(propertyName, 'event_common_header', value)
        if (appContext.sdkSettings.ingestionValidationMode) {
          appendPropertyError('1030007', `事件公共属性元数据不存在：${propertyName}`, { propertyName, value })
          return
        }
        eventProperties.unshift({
          id: createId('prop'),
          appId: appContext.appId,
          propertyName,
          displayName: propertyName,
          description: '入库校验关闭时由 header 自动登记。',
          dataType: inferDataType(value),
          propertyScope: 'event_common_header',
          associatedEventIds: [],
          isPreset: false,
          status: 'enabled',
          dictionaryStatus: 'none',
          createdAt: nowText(),
          updatedAt: nowText(),
        })
      }
      const dataType = property?.dataType ?? preset?.dataType ?? inferDataType(value)
      if (property?.status === 'disabled') {
        appendPropertyError('1030008', `事件公共属性已禁用：${propertyName}`, { propertyName, value })
      } else if (!isValueCompatible(value, dataType)) {
        appendPropertyError('1030004', `事件公共属性类型不匹配：${propertyName} 应为 ${dataType}`, { propertyName, value })
      }
    })

    Object.entries(params).forEach(([propertyName, value]) => {
      const property = eventProperties.find(
        (item) =>
          item.propertyName === propertyName &&
          item.propertyScope === 'event_param' &&
          (!eventMeta || item.associatedEventIds.includes(eventMeta.id)),
      )
      const existingSystemProperty = eventProperties.find((item) => item.propertyName === propertyName && item.propertyScope === 'event_param')
      if (!PROPERTY_NAME_REGEX.test(propertyName) && !existingSystemProperty) {
        appendPropertyError(propertyName.startsWith('$') ? '1020002' : '1020001', `事件属性名不合法或命中系统保留规则：${propertyName}`, { propertyName, value })
        return
      }
      if (!property) {
        trackPendingEventProperty(propertyName, eventName, value)
        if (appContext.sdkSettings.ingestionValidationMode) {
          appendPropertyError('1020007', `事件属性元数据不存在：${propertyName}`, { propertyName, value })
          return
        }
        if (eventMeta && !eventProperties.some((item) => item.propertyName === propertyName && item.associatedEventIds.includes(eventMeta.id))) {
          eventProperties.unshift({
            id: createId('prop'),
            appId: appContext.appId,
            propertyName,
            displayName: propertyName,
            description: '入库校验关闭时由 params 自动登记。',
            dataType: inferDataType(value),
            propertyScope: 'event_param',
            associatedEventIds: [eventMeta.id],
            isPreset: false,
            status: 'enabled',
            dictionaryStatus: 'none',
            createdAt: nowText(),
            updatedAt: nowText(),
          })
        }
        return
      }
      if (property.status === 'disabled') {
        appendPropertyError('1020008', `事件属性已禁用：${propertyName}`, { propertyName, value })
        return
      }
      if (['pending_approval', 'blacklist', 'over_limit'].includes(property.status)) {
        appendPropertyError('1020006', `事件属性未验收、黑名单或超限：${propertyName}`, { propertyName, value })
        return
      }
      if (!isValueCompatible(value, property.dataType)) {
        appendPropertyError('1020004', `事件属性类型不匹配：${propertyName} 应为 ${property.dataType}`, { propertyName, value })
      }
    })

    Object.entries(payload.user ?? {}).forEach(([propertyName, value]) => {
      if (['user_unique_id', 'web_id', 'device_id', 'ssid'].includes(propertyName)) {
        return
      }
      const property = userProperties.find((item) => item.propertyName === propertyName)
      if (!PROPERTY_NAME_REGEX.test(propertyName)) {
        appendError(newErrors, eventName || 'unknown', 'user_error', '1040001', `用户属性名不合法：${propertyName}`, { propertyName, value })
        abnormalPropertyCount += 1
        return
      }
      if (!property) {
        trackPendingUserProperty(propertyName, value)
        if (appContext.sdkSettings.ingestionValidationMode) {
          appendError(newErrors, eventName || 'unknown', 'user_error', '1040007', `用户属性元数据不存在：${propertyName}`, { propertyName, value })
          abnormalPropertyCount += 1
          return
        }
        userProperties.unshift({
          id: createId('up'),
          appId: appContext.appId,
          propertyName,
          displayName: propertyName,
          description: '入库校验关闭时由用户属性自动登记。',
          dataType: inferDataType(value),
          calculationLogic: 'latest_value',
          isPreset: false,
          status: 'enabled',
          dictionaryStatus: 'none',
          createdAt: nowText(),
          updatedAt: nowText(),
        })
        return
      }
      if (property.status === 'disabled' || ['pending_approval', 'blacklist', 'over_limit'].includes(property.status)) {
        appendError(newErrors, eventName || 'unknown', 'user_error', '1040005', `用户属性未验收、禁用或黑名单：${propertyName}`, { propertyName, value })
        abnormalPropertyCount += 1
      } else if (!isValueCompatible(value, property.dataType)) {
        appendError(newErrors, eventName || 'unknown', 'user_error', '1040003', `用户属性类型不匹配：${propertyName} 应为 ${property.dataType}`, { propertyName, value })
        abnormalPropertyCount += 1
      }
    })

    if (discarded) {
      discardedCount += 1
    } else if (eventMeta) {
      storedCount += 1
      events = events.map((event) =>
        event.id === eventMeta?.id
          ? { ...event, yesterdayIngestCount: event.yesterdayIngestCount + 1, updatedAt: nowText() }
          : event,
      )
      normalizedPayload.events.push({ ...uploadEvent, event: eventName, params })
    }

    upsertIngestionDetail(eventName || 'unknown', 1, discarded ? 1 : 0, eventPropertyErrors, discarded ? 'event_error' : 'property_error')
  })

  refreshEventPropertyCounts()
  refreshGovernanceUsage()
  mockGovernanceMetrics.receivedEventCount += uploadEvents.length
  mockGovernanceMetrics.interceptedEventCount += discardedCount
  mockGovernanceMetrics.abnormalPropertyCount += abnormalPropertyCount
  mockGovernanceMetrics.eventInterceptRate = mockGovernanceMetrics.receivedEventCount
    ? mockGovernanceMetrics.interceptedEventCount / mockGovernanceMetrics.receivedEventCount
    : 0
  mockGovernanceMetrics.dataErrorRate = mockGovernanceMetrics.receivedEventCount
    ? mockGovernanceMetrics.abnormalPropertyCount / mockGovernanceMetrics.receivedEventCount
    : 0
  errorLogs.unshift(...newErrors)
  steps.push({
    name: '基础格式校验',
    status: newErrors.some((error) => error.errorCode.startsWith('1010001') || error.errorCode === '1010004') ? 'error' : 'success',
    message: '已校验事件数量、命名和时间窗口',
  })
  steps.push({
    name: '元数据匹配',
    status: newErrors.some((error) => ['1010008', '1020007', '1030007', '1040007'].includes(error.errorCode)) ? 'warning' : 'success',
    message: appContext.sdkSettings.ingestionValidationMode ? '未知元数据已进入待验收或被拦截' : '未知元数据已自动登记',
  })
  steps.push({
    name: '数据类型校验和强转',
    status: newErrors.some((error) => ['1020004', '1030004', '1040003'].includes(error.errorCode)) ? 'warning' : 'success',
    message: `异常属性 ${abnormalPropertyCount} 个`,
  })
  steps.push({
    name: '入库构建与治理统计',
    status: discardedCount > 0 ? 'warning' : 'success',
    message: `接收 ${uploadEvents.length} 条，入库 ${storedCount} 条，丢弃 ${discardedCount} 条`,
  })
  createAudit('ingestion.upload', appContext.appId, 'ingestion.upload.validate', undefined, {
    receivedCount: uploadEvents.length,
    storedCount,
    discardedCount,
    abnormalPropertyCount,
  })
  saveState()
  return clone({
    accepted: storedCount > 0 && discardedCount === 0,
    receivedCount: uploadEvents.length,
    storedCount,
    discardedCount,
    abnormalPropertyCount,
    steps,
    errors: newErrors,
    normalizedPayload,
  })
}

async function listReportEndpoints(filter: ReportEndpointFilter): Promise<ReportEndpoint[]> {
  await delay()
  const platforms = filter.platforms ?? []
  const endpointRows = mockReportEndpoints
    .filter((endpoint) => {
      const matchEnv = !filter.environmentType || endpoint.environmentType === filter.environmentType
      const matchRegion = filter.environmentType === 'private_deployment' || !filter.region || endpoint.region === filter.region
      const matchPlatform = platforms.length === 0 || platforms.includes(endpoint.platform)
      const matchGroup =
        !filter.platformGroup ||
        filter.platformGroup === 'all' ||
        (filter.platformGroup === 'client' && ['android', 'ios', 'harmonyos', 'web_js', 'wechat_mp', 'mini_game', 'quick_app', 'wechat_official_account'].includes(endpoint.platform)) ||
        (filter.platformGroup === 'server' && ['server_java', 'server_php', 'server_golang'].includes(endpoint.platform)) ||
        (filter.platformGroup === 'http_api' && endpoint.platform === 'http_api')
      return matchEnv && matchRegion && matchPlatform && matchGroup
    })
    .map((endpoint) => {
      if (filter.environmentType === 'private_deployment' && filter.customDomain?.trim()) {
        return {
          ...endpoint,
          url: endpoint.url.replace(/^https?:\/\/[^/]+/, filter.customDomain.trim().replace(/\/$/, '')),
          sdkConfigHint: `${endpoint.sdkConfigHint ?? ''} 当前使用私有化自定义采集域名。`.trim(),
        }
      }
      return endpoint
    })
  return clone(endpointRows)
}

async function getSchemaCatalog() {
  await delay()
  return clone({
    dataTypeRules: mockDataTypeRules,
    presetProperties: mockPresetProperties,
    statusRules: mockMetadataStatusRules,
    errorCodeRules: mockErrorCodeRules,
    validationRegex: {
      eventName: EVENT_NAME_REGEX.source,
      propertyName: PROPERTY_NAME_REGEX.source,
      virtualPropertyName: VIRTUAL_PROPERTY_REGEX.source,
      version: VERSION_REGEX.source,
    },
    dataCategories: [
      { type: '系统预置', items: ['预置事件公共属性', '预置事件及事件属性', '预置用户属性'] },
      { type: '自定义', items: ['自定义事件公共属性', '自定义事件及事件属性', '自定义用户属性'] },
      { type: '业务对象', items: ['Item 属性', '事件与 Item 的关联关系'] },
      { type: '伪事件', items: ['any_event', 'any_active_event'] },
    ],
    typeRecommendations: [
      { scene: '年龄、次数、整数金额', dataType: 'int', description: '需要数值计算且无小数' },
      { scene: '时长、折扣、金额小数', dataType: 'float', description: '需要求和、均值、分位数' },
      { scene: '页面标题、按钮名称、商品 ID', dataType: 'string', description: '文本、ID、不参与数值计算' },
      { scene: '标签集合、多个分类', dataType: 'list', description: '一个属性有多个值，按单个值筛选' },
      { scene: '注册时间、支付时间', dataType: 'datetime', description: '需要时间范围筛选' },
      { scene: 'app 版本、系统版本', dataType: 'version', description: '需要版本排序或版本比较' },
    ],
  })
}

async function listIntegrationTasks(): Promise<DataIntegrationTask[]> {
  await delay()
  return clone(integrationTasks)
}

async function testKafkaConnection(config: KafkaConfig): Promise<{ success: boolean, message: string }> {
  await delay(420)
  if (!config.consumerGroup.trim()) {
    return { success: false, message: '消费者组不能为空' }
  }
  if (config.bootstrapServers.length === 0 || config.bootstrapServers.some((server) => !server.trim())) {
    return { success: false, message: 'Kafka Server 不能为空' }
  }
  if (!config.topic.trim()) {
    return { success: false, message: 'Topic 不存在或未填写' }
  }
  const joined = `${config.bootstrapServers.join(',')},${config.topic}`.toLowerCase()
  if (joined.includes('fail') || joined.includes('denied')) {
    return { success: false, message: '连接失败：网络不可达、认证失败或无消费权限' }
  }
  if (config.authType !== 'none' && (!config.username || !config.password)) {
    return { success: false, message: '启用认证时必须填写用户名和密码' }
  }
  return { success: true, message: '连接成功，已读取 Topic 样例消息' }
}

async function parseKafkaSample(sourceType: DataIntegrationTask['sourceType']) {
  await delay()
  const fields =
    sourceType === 'uba_event_data'
      ? ['$.event', '$.ts', '$.uid', '$.device_id', '$.params.product_id', '$.params.order_amount']
      : ['$.uid', '$.profile.vip_level', '$.profile.register_time', '$.profile.total_cost']
  const preview =
    sourceType === 'uba_event_data'
      ? {
          header: { app_id: appContext.appId, sdk_type: 'kafka' },
          user: { user_unique_id: 'uid_900001' },
          events: [{ event: 'pay_success', local_time_ms: 1779778800000, params: { product_id: 'sku_1001', order_amount: 99.9 } }],
        }
      : {
          user: { user_unique_id: 'uid_900001' },
          profiles: { vip_level: 'A', register_time: '2026-05-01 09:00:00', total_cost: 1200.5 },
        }
  return clone({ fields, rawMessage: JSON.stringify(preview, null, 2), preview })
}

async function validateCustomUploadConfig(configText: string): Promise<{ success: boolean, message: string, mappingText?: string }> {
  await delay()
  let config: Partial<IntegrationTaskPayload> & { fieldMappings?: FieldMapping[], kafkaConfig?: KafkaConfig }
  try {
    config = JSON.parse(configText) as Partial<IntegrationTaskPayload> & { fieldMappings?: FieldMapping[], kafkaConfig?: KafkaConfig }
  } catch {
    return { success: false, message: '自定义配置必须是合法 JSON' }
  }
  if (!config.kafkaConfig || !Array.isArray(config.kafkaConfig.bootstrapServers) || !config.kafkaConfig.topic || !config.kafkaConfig.consumerGroup) {
    return { success: false, message: '配置中必须包含 kafkaConfig.consumerGroup、bootstrapServers、topic' }
  }
  if (!Array.isArray(config.fieldMappings) || config.fieldMappings.length === 0) {
    return { success: false, message: '配置中必须包含 fieldMappings 数组' }
  }
  const invalidMapping = config.fieldMappings.find(
    (mapping) => !mapping.sourceField || !mapping.targetField || !mapping.targetType || !mapping.dataType || !['header', 'user', 'event', 'event_param', 'user_profile'].includes(mapping.targetType),
  )
  if (invalidMapping) {
    return { success: false, message: `字段映射不完整或目标类型非法：${invalidMapping.sourceField || '(空源字段)'}` }
  }
  const connection = await testKafkaConnection(config.kafkaConfig)
  if (!connection.success) {
    return connection
  }
  return {
    success: true,
    message: '自定义上传配置校验通过，已生成字段映射预览',
    mappingText: config.fieldMappings
      .map((mapping) => `${mapping.sourceField},${mapping.targetField},${mapping.targetType},${mapping.dataType},${mapping.required ? 'true' : 'false'}`)
      .join('\n'),
  }
}

async function createIntegrationTask(payload: IntegrationTaskPayload): Promise<DataIntegrationTask> {
  await delay()
  if (payload.taskName.trim().length < 1 || payload.taskName.trim().length > 64) {
    throw new Error('任务名称必填，长度 1-64')
  }
  if ((payload.description ?? '').length > 500) {
    throw new Error('描述最多 500 字')
  }
  const connection = await testKafkaConnection(payload.kafkaConfig)
  if (!connection.success) {
    throw new Error(connection.message)
  }
  const requiredTargets =
    payload.sourceType === 'uba_event_data'
      ? ['events[].event', 'events[].local_time_ms', 'user.user_unique_id']
      : ['user.user_unique_id']
  const missing = requiredTargets.filter((target) => !payload.fieldMappings.some((mapping) => mapping.targetField === target))
  if (missing.length > 0) {
    throw new Error(`字段映射缺少必填目标字段：${missing.join('、')}`)
  }

  const task: DataIntegrationTask = {
    id: createId('task'),
    appId: appContext.appId,
    taskName: payload.taskName.trim(),
    description: payload.description,
    sourceType: payload.sourceType,
    configMode: payload.configMode,
    kafkaConfig: {
      ...payload.kafkaConfig,
      password: payload.kafkaConfig.password ? '******' : undefined,
    },
    fieldMappings: clone(payload.fieldMappings),
    status: 'running',
    lastRunAt: nowText(),
    syncedCount: payload.configMode === 'custom_upload' ? 320 : 1280,
    failedCount: 0,
    latencySeconds: 0,
    createdBy: 'Chaoyang Xu',
    createdAt: nowText(),
  }
  integrationTasks.unshift(task)

  if (payload.sourceType === 'uba_event_data' && !events.some((event) => event.eventName === 'kafka_import_event')) {
    events.unshift({
      id: createId('event'),
      appId: appContext.appId,
      eventName: 'kafka_import_event',
      displayName: 'Kafka 导入事件',
      description: '由可视化数据集成任务自动登记。',
      sourceType: 'integrated',
      status: appContext.sdkSettings.ingestionValidationMode ? 'pending_approval' : 'enabled',
      isPreset: false,
      propertyCount: 0,
      commonPropertyCount: eventProperties.filter((property) => property.propertyScope === 'event_common_header').length,
      screenshotCount: 0,
      recent30dQueryCount: 0,
      recent30dQueryUserCount: 0,
      yesterdayIngestCount: 0,
      createdAt: nowText(),
      updatedAt: nowText(),
      createdBy: '系统自动',
      associatedPropertyIds: [],
    })
  }
  if (payload.sourceType === 'user_profile_data') {
    payload.fieldMappings
      .filter((mapping) => mapping.targetType === 'user_profile')
      .forEach((mapping) => {
        const propertyName = mapping.targetField.split('.').pop() || mapping.sourceField.split('.').pop() || ''
        if (propertyName && PROPERTY_NAME_REGEX.test(propertyName) && !userProperties.some((property) => property.propertyName === propertyName)) {
          userProperties.unshift({
            id: createId('up'),
            appId: appContext.appId,
            propertyName,
            displayName: propertyName,
            description: '由可视化数据集成任务自动登记。',
            dataType: mapping.dataType,
            calculationLogic: 'latest_value',
            isPreset: false,
            status: appContext.sdkSettings.ingestionValidationMode ? 'pending_approval' : 'enabled',
            dictionaryStatus: 'none',
            createdAt: nowText(),
            updatedAt: nowText(),
          })
        }
      })
  }

  createAudit('dataIntegration.task', task.id, 'dataIntegration.task.create', undefined, task)
  return clone(task)
}

async function updateIntegrationTaskStatus(taskId: string, status: DataIntegrationTask['status']): Promise<DataIntegrationTask> {
  await delay()
  const index = integrationTasks.findIndex((task) => task.id === taskId)
  if (index < 0) {
    throw new Error('任务不存在')
  }
  const before = clone(integrationTasks[index])
  integrationTasks[index] = {
    ...integrationTasks[index],
    status,
    lastRunAt: status === 'running' ? nowText() : integrationTasks[index]?.lastRunAt,
    latestError: status === 'failed' ? '用户手动标记失败，请检查 Kafka 消费权限' : undefined,
  } as DataIntegrationTask
  createAudit('dataIntegration.task', taskId, `dataIntegration.task.${status}`, before, integrationTasks[index])
  return clone(integrationTasks[index] as DataIntegrationTask)
}

async function listEvents(filter: EventFilter = {}): Promise<EventMetadata[]> {
  await delay()
  events = events.map(eventDefaults)
  const result = events.filter((event) => {
    const matchKeyword = includesKeyword([event.eventName, event.displayName, event.description], filter.keyword)
    const matchStatus = !filter.status || filter.status === 'all' || event.status === filter.status
    const matchSource = !filter.sourceType || filter.sourceType === 'all' || event.sourceType === filter.sourceType
    const matchCategory = !filter.categoryId || filter.categoryId === 'all' || event.categoryId === filter.categoryId
    const matchPreset = !filter.isPreset || filter.isPreset === 'all' || (filter.isPreset === 'yes' ? event.isPreset : !event.isPreset)
    const matchScreenshot =
      !filter.hasScreenshot || filter.hasScreenshot === 'all' || (filter.hasScreenshot === 'yes' ? event.screenshotCount > 0 : event.screenshotCount === 0)
    const matchQuery =
      !filter.queried30d || filter.queried30d === 'all' || (filter.queried30d === 'yes' ? event.recent30dQueryCount > 0 : event.recent30dQueryCount === 0)
    return matchKeyword && matchStatus && matchSource && matchCategory && matchPreset && matchScreenshot && matchQuery
  })
  return clone(result.map(eventDefaults))
}

async function getEvent(eventId: string): Promise<EventMetadata | undefined> {
  await delay()
  return clone(events.find((event) => event.id === eventId))
}

async function createEvent(payload: CreateEventPayload): Promise<EventMetadata> {
  await delay()
  ensureEventNameValid(payload.eventName)
  if ((payload.displayName ?? '').length > 100) {
    throw new Error('展示名最多 100 字')
  }
  if ((payload.description ?? '').length > 1000) {
    throw new Error('事件描述最多 1000 字')
  }
  const event: EventMetadata = {
    id: createId('event'),
    appId: appContext.appId,
    eventName: payload.eventName.trim(),
    displayName: payload.displayName?.trim(),
    description: payload.description?.trim(),
    categoryId: payload.categoryId,
    sourceType: 'custom',
    status: 'enabled',
    isPreset: false,
    propertyCount: 0,
    commonPropertyCount: eventProperties.filter((property) => property.propertyScope === 'event_common_header').length,
    screenshotCount: 0,
    recent30dQueryCount: 0,
    recent30dQueryUserCount: 0,
    yesterdayIngestCount: 0,
    createdAt: nowText(),
    updatedAt: nowText(),
    createdBy: 'Chaoyang Xu',
    associatedPropertyIds: payload.associatedPropertyIds ?? [],
  }
  events.unshift(event)
  eventProperties = eventProperties.map((property) =>
    payload.associatedPropertyIds?.includes(property.id)
      ? { ...property, associatedEventIds: [...new Set([...property.associatedEventIds, event.id])], updatedAt: nowText() }
      : property,
  )
  refreshEventPropertyCounts()
  refreshGovernanceUsage()
  createAudit('metadata.event', event.id, 'metadata.event.create', undefined, event)
  return clone(event)
}

async function updateEvent(eventId: string, payload: Pick<CreateEventPayload, 'displayName' | 'description' | 'categoryId'>): Promise<EventMetadata> {
  await delay()
  const index = events.findIndex((event) => event.id === eventId)
  if (index < 0) {
    throw new Error('事件不存在')
  }
  const before = clone(events[index])
  events[index] = {
    ...events[index],
    displayName: payload.displayName,
    description: payload.description,
    categoryId: payload.categoryId,
    updatedAt: nowText(),
  } as EventMetadata
  createAudit('metadata.event', eventId, 'metadata.event.edit', before, events[index])
  return clone(events[index] as EventMetadata)
}

async function updateEventStatus(eventId: string, status: MetadataStatus, confirmedImpact = false): Promise<EventMetadata> {
  await delay()
  const index = events.findIndex((event) => event.id === eventId)
  if (index < 0) {
    throw new Error('事件不存在')
  }
  if (status === 'disabled' && !confirmedImpact) {
    throw new Error('禁用前必须确认血缘影响、最近查询、昨日入库、关联图表、分群和虚拟引用')
  }
  const before = clone(events[index])
  events[index] = { ...events[index], status, updatedAt: nowText() } as EventMetadata
  createAudit('metadata.event', eventId, `metadata.event.${status}`, before, events[index])
  return clone(events[index] as EventMetadata)
}

async function previewBatchEvents(csvText: string, mode: 'skip' | 'overwrite') {
  await delay()
  const rawRows = parseCsvRows(csvText)
  const hasHeader = ['event_name', 'eventname', '事件名称', '事件名'].includes(String(rawRows[0]?.[0] ?? '').trim().toLowerCase())
  const rows = hasHeader ? rawRows.slice(1) : rawRows
  const errors: Array<{ rowNumber: number, eventName: string, errorType: string, message: string }> = []
  const seen = new Set<string>()
  const pushError = (error: { rowNumber: number, eventName: string, errorType: string, message: string }): void => {
    if (errors.length < 100) {
      errors.push(error)
    }
  }
  rows.forEach((row, index) => {
    const [eventName = '', displayName = '', description = ''] = row.map((item) => item.trim())
    const rowNumber = index + (hasHeader ? 2 : 1)
    if (!EVENT_NAME_REGEX.test(eventName) || eventName.startsWith('$') || eventName.startsWith('__')) {
      pushError({ rowNumber, eventName, errorType: '事件名不合法', message: '不符合事件名规则或使用系统保留前缀' })
    }
    if (seen.has(eventName)) {
      pushError({ rowNumber, eventName, errorType: '文件内重复', message: '同一导入文件内事件名重复' })
    }
    seen.add(eventName)
    const existing = events.find((event) => event.eventName === eventName)
    if (existing && mode === 'skip') {
      pushError({ rowNumber, eventName, errorType: '已存在', message: '已存在项将被跳过；可切换为覆盖展示信息' })
    }
    if (displayName.length > 100 || description.length > 1000) {
      pushError({ rowNumber, eventName, errorType: '字段超长', message: '展示名最多 100 字，描述最多 1000 字' })
    }
  })
  const blockingErrors = errors.filter((row) => row.errorType !== '已存在')
  return { rows: errors, canImport: blockingErrors.length === 0, total: rows.length }
}

async function importBatchEvents(csvText: string, mode: 'skip' | 'overwrite') {
  const preview = await previewBatchEvents(csvText, mode)
  const blockingErrors = preview.rows.filter((row) => row.errorType !== '已存在')
  if (blockingErrors.length > 0) {
    throw new Error('仍存在行级错误，不能导入')
  }
  const rawRows = parseCsvRows(csvText)
  const hasHeader = ['event_name', 'eventname', '事件名称', '事件名'].includes(String(rawRows[0]?.[0] ?? '').trim().toLowerCase())
  const rows = hasHeader ? rawRows.slice(1) : rawRows
  let created = 0
  let updated = 0
  rows.forEach((row) => {
    const [eventName = '', displayName = '', description = ''] = row.map((item) => item.trim())
    const existingIndex = events.findIndex((event) => event.eventName === eventName)
    if (existingIndex >= 0) {
      if (mode === 'overwrite') {
        events[existingIndex] = { ...events[existingIndex], displayName, description, updatedAt: nowText() } as EventMetadata
        updated += 1
      }
      return
    }
    events.unshift({
      id: createId('event'),
      appId: appContext.appId,
      eventName,
      displayName,
      description,
      sourceType: 'custom',
      status: 'enabled',
      isPreset: false,
      propertyCount: 0,
      commonPropertyCount: eventProperties.filter((property) => property.propertyScope === 'event_common_header').length,
      screenshotCount: 0,
      recent30dQueryCount: 0,
      recent30dQueryUserCount: 0,
      yesterdayIngestCount: 0,
      createdAt: nowText(),
      updatedAt: nowText(),
      createdBy: 'Chaoyang Xu',
      associatedPropertyIds: [],
    })
    created += 1
  })
  refreshGovernanceUsage()
  createAudit('metadata.event', 'batch', 'metadata.event.batchCreate', undefined, { created, updated })
  return { created, updated }
}

async function downloadEventTemplate(): Promise<string> {
  await delay()
  return toCsv([
    ['事件名称', '展示名', '描述'],
    ['checkout_start', '发起结算', '用户点击结算按钮，需包含 order_id、sku_count、source_page'],
  ])
}

async function exportEventDisplayCsv(filter: EventFilter = {}): Promise<string> {
  const rows = await listEvents(filter)
  createAudit('metadata.event', 'batch', 'metadata.event.exportDisplay', undefined, { rowCount: rows.length })
  return toCsv([
    ['事件名称', '展示名', '描述'],
    ...rows.map((event) => [event.eventName, event.displayName ?? '', event.description ?? '']),
  ])
}

async function importEventDisplayCsv(csvText: string): Promise<{ updated: number, ignored: number }> {
  await delay()
  const rows = parseCsvRows(csvText)
  const dataRows = rows[0]?.[0]?.includes('事件') ? rows.slice(1) : rows
  const result = await importEventDisplayRows(
    dataRows.map(([eventName = '', displayName = '', description = ''], index) => ({
      rowNumber: index + 2,
      name: eventName,
      displayName,
      description,
    })),
  )
  return { updated: result.updated, ignored: result.ignored + result.failed }
}

async function importEventDisplayRows(rows: MetadataDisplayImportRow[]): Promise<MetadataDisplayImportResult> {
  await delay()
  const errors: MetadataDisplayImportResult['errors'] = []
  let updated = 0
  let ignored = 0
  let failed = 0
  rows.forEach((row) => {
    const eventName = row.name.trim()
    if (!eventName) {
      failed += 1
      pushImportError(errors, row, '事件名称不能为空')
      return
    }
    const index = events.findIndex((event) => event.eventName === eventName)
    if (index < 0) {
      ignored += 1
      pushImportError(errors, row, '事件不存在，已忽略')
      return
    }
    events[index] = eventDefaults({
      ...events[index],
      ...createImportPatch(row, true),
      updatedAt: nowText(),
    } as EventMetadata)
    updated += 1
  })
  refreshGovernanceUsage()
  createAudit('metadata.event', 'batch', 'metadata.event.importDisplayExcel', undefined, {
    total: rows.length,
    updated,
    ignored,
    failed,
    errors,
  })
  saveState()
  return clone({ total: rows.length, updated, ignored, failed, errors })
}

async function attachPropertiesToEvent(eventId: string, propertyIds: string[]): Promise<EventMetadata> {
  await delay()
  const event = events.find((item) => item.id === eventId)
  if (!event) {
    throw new Error('事件不存在')
  }
  const invalid = propertyIds.find((propertyId) => {
    const property = eventProperties.find((item) => item.id === propertyId)
    return !property || (property.propertyScope === 'event_param' && property.isPreset)
  })
  if (invalid) {
    throw new Error('只能添加已有自定义事件属性或公共属性')
  }
  const before = clone(eventProperties.filter((property) => propertyIds.includes(property.id)))
  const customPropertyIds = eventProperties
    .filter((property) => propertyIds.includes(property.id) && property.propertyScope === 'event_param')
    .map((property) => property.id)
  const commonPropertyIds = eventProperties
    .filter((property) => propertyIds.includes(property.id) && property.propertyScope === 'event_common_header')
    .map((property) => property.id)
  eventProperties = eventProperties.map((property) =>
    customPropertyIds.includes(property.id)
      ? { ...property, associatedEventIds: [...new Set([...property.associatedEventIds, eventId])], updatedAt: nowText() }
      : property,
  )
  refreshEventPropertyCounts()
  createAudit('metadata.event', eventId, 'metadata.event.attachProperties', before, { propertyIds, customPropertyIds, commonPropertyIds })
  return clone(events.find((item) => item.id === eventId) as EventMetadata)
}

async function detachPropertyFromEvent(eventId: string, propertyId: string, confirmedImpact = false): Promise<EventMetadata> {
  await delay()
  if (!confirmedImpact) {
    throw new Error('删除事件属性前必须确认入库、分析、图表、分群和虚拟属性影响')
  }
  const property = eventProperties.find((item) => item.id === propertyId)
  if (!property) {
    throw new Error('事件属性不存在')
  }
  if (property.propertyScope !== 'event_param' || property.isPreset) {
    throw new Error('事件公共属性和预置属性不能从单个事件删除')
  }
  const before = clone(property)
  eventProperties = eventProperties.map((item) =>
    item.id === propertyId ? { ...item, associatedEventIds: item.associatedEventIds.filter((id) => id !== eventId), updatedAt: nowText() } : item,
  )
  refreshEventPropertyCounts()
  createAudit('metadata.event', eventId, 'metadata.event.detachProperty', before, { propertyId })
  return clone(events.find((event) => event.id === eventId) as EventMetadata)
}

async function deleteEventPropertyFromEvent(eventId: string, propertyId: string): Promise<EventMetadata> {
  await delay()
  const event = events.find((item) => item.id === eventId)
  if (!event) {
    throw new Error('事件不存在')
  }
  const property = eventProperties.find((item) => item.id === propertyId)
  if (!property) {
    throw new Error('事件属性不存在')
  }
  const normalizedProperty = eventPropertyDefaults(property)
  if (normalizedProperty.propertyScope !== 'event_param' || normalizedProperty.isPreset) {
    throw new Error('公共属性、预置属性不能从事件属性列表删除')
  }
  if (!normalizedProperty.associatedEventIds.includes(eventId)) {
    throw new Error('该属性未关联当前事件')
  }
  if (normalizedProperty.hasIngestedData) {
    throw new Error('该属性已有上报数据，不能删除；可改为不显示')
  }
  const before = clone(normalizedProperty)
  if (normalizedProperty.associatedEventIds.length <= 1) {
    eventProperties = eventProperties.filter((item) => item.id !== propertyId)
  } else {
    eventProperties = eventProperties.map((item) =>
      item.id === propertyId ? { ...item, associatedEventIds: item.associatedEventIds.filter((id) => id !== eventId), updatedAt: nowText() } : item,
    )
  }
  refreshEventPropertyCounts()
  refreshGovernanceUsage()
  createAudit('metadata.eventProperty', propertyId, 'metadata.eventProperty.deleteFromEvent', before, {
    eventId,
    deleted: normalizedProperty.associatedEventIds.length <= 1,
  })
  return clone(events.find((item) => item.id === eventId) as EventMetadata)
}

async function listPendingEvents(): Promise<PendingEvent[]> {
  await delay()
  return clone(pendingEvents)
}

async function approvePendingEvent(pendingId: string, displayName: string, status: 'enabled' | 'hidden'): Promise<EventMetadata> {
  await delay()
  const pending = pendingEvents.find((item) => item.id === pendingId)
  if (!pending) {
    throw new Error('待验收事件不存在')
  }
  ensureEventNameValid(pending.eventName)
  const event: EventMetadata = {
    id: createId('event'),
    appId: appContext.appId,
    eventName: pending.eventName,
    displayName,
    description: `由待验收数据转正，样例属性：${pending.sampleProperties.join('、')}`,
    sourceType: 'custom',
    status,
    isPreset: false,
    propertyCount: 0,
    commonPropertyCount: eventProperties.filter((property) => property.propertyScope === 'event_common_header').length,
    screenshotCount: 0,
    recent30dQueryCount: 0,
    recent30dQueryUserCount: 0,
    yesterdayIngestCount: pending.sampleCount,
    createdAt: nowText(),
    updatedAt: nowText(),
    createdBy: 'Chaoyang Xu',
    associatedPropertyIds: [],
  }
  events.unshift(event)
  pendingEvents = pendingEvents.filter((item) => item.id !== pendingId)
  createAudit('metadata.event', event.id, 'metadata.event.approve', pending, event)
  return clone(event)
}

async function blacklistPendingEvent(pendingId: string): Promise<void> {
  await delay()
  const pending = pendingEvents.find((item) => item.id === pendingId)
  if (!pending) {
    throw new Error('待验收事件不存在')
  }
  pendingEvents = pendingEvents.filter((item) => item.id !== pendingId)
  createAudit('metadata.event', pendingId, 'metadata.event.blacklist', pending, { status: 'blacklist' })
}

async function listEventProperties(filter: PropertyFilter = {}): Promise<EventPropertyMetadata[]> {
  await delay()
  eventProperties = eventProperties.map(eventPropertyDefaults)
  const result = eventProperties.filter((property) => {
    const matchKeyword = includesKeyword([property.propertyName, property.displayName, property.description], filter.keyword)
    const matchStatus = !filter.status || filter.status === 'all' || property.status === filter.status
    const matchType = !filter.dataType || filter.dataType === 'all' || property.dataType === filter.dataType
    const matchScope = !filter.scope || filter.scope === 'all' || property.propertyScope === filter.scope
    const emptyInfo = !filter.emptyInfoOnly || !property.displayName || !property.description
    return matchKeyword && matchStatus && matchType && matchScope && emptyInfo
  })
  return clone(result.map(eventPropertyDefaults))
}

async function exportPropertyDisplayCsv(kind: 'event' | 'user', filter: PropertyFilter = {}): Promise<string> {
  await delay()
  const rows =
    kind === 'event'
      ? await listEventProperties(filter)
      : await listUserProperties({
          keyword: filter.keyword,
          status: filter.status,
          dataType: filter.dataType,
          emptyInfoOnly: filter.emptyInfoOnly,
        })
  createAudit(`metadata.${kind}Property`, 'batch', `metadata.${kind}Property.exportDisplay`, undefined, { rowCount: rows.length })
  return toCsv([
    ['属性名称', '展示名', '描述'],
    ...rows.map((property) => [property.propertyName, property.displayName ?? '', property.description ?? '']),
  ])
}

async function importPropertyDisplayCsv(kind: 'event' | 'user', csvText: string): Promise<{ updated: number, ignored: number }> {
  await delay()
  const rows = parseCsvRows(csvText)
  const dataRows = rows[0]?.[0]?.includes('属性') ? rows.slice(1) : rows
  const result = await importPropertyDisplayRows(
    kind,
    dataRows.map(([propertyName = '', displayName = '', description = ''], index) => ({
      rowNumber: index + 2,
      name: propertyName,
      displayName,
      description,
    })),
  )
  return { updated: result.updated, ignored: result.ignored + result.failed }
}

async function importPropertyDisplayRows(kind: 'event' | 'user', rows: MetadataDisplayImportRow[]): Promise<MetadataDisplayImportResult> {
  await delay()
  const errors: MetadataDisplayImportResult['errors'] = []
  let updated = 0
  let ignored = 0
  let failed = 0
  rows.forEach((row) => {
    const propertyName = row.name.trim()
    if (!propertyName) {
      failed += 1
      pushImportError(errors, row, '属性名称不能为空')
      return
    }
    if (kind === 'event') {
      const index = eventProperties.findIndex((property) => property.propertyName === propertyName)
      if (index < 0) {
        ignored += 1
        pushImportError(errors, row, '事件属性不存在，已忽略')
        return
      }
      eventProperties[index] = eventPropertyDefaults({
        ...eventProperties[index],
        ...createImportPatch(row),
        updatedAt: nowText(),
      } as EventPropertyMetadata)
      updated += 1
      return
    }
    const index = userProperties.findIndex((property) => property.propertyName === propertyName)
    if (index < 0) {
      ignored += 1
      pushImportError(errors, row, '用户属性不存在，已忽略')
      return
    }
    userProperties[index] = userPropertyDefaults({
      ...userProperties[index],
      ...createImportPatch(row),
      updatedAt: nowText(),
    } as UserPropertyMetadata)
    updated += 1
  })
  refreshEventPropertyCounts()
  refreshGovernanceUsage()
  createAudit(kind === 'event' ? 'metadata.eventProperty' : 'metadata.userProperty', 'batch', `metadata.${kind}Property.importDisplayExcel`, undefined, {
    total: rows.length,
    updated,
    ignored,
    failed,
    errors,
  })
  saveState()
  return clone({ total: rows.length, updated, ignored, failed, errors })
}

async function createEventProperty(payload: CreateEventPropertyPayload): Promise<EventPropertyMetadata> {
  await delay()
  ensurePropertyNameValid(payload.propertyName)
  if (eventProperties.some((property) => property.propertyName === payload.propertyName.trim())) {
    throw new Error('事件属性名称已存在')
  }
  if (payload.propertyScope === 'event_param' && payload.associatedEventIds.length === 0) {
    throw new Error('一般事件属性必须至少选择一个关联事件')
  }
  const property: EventPropertyMetadata = {
    id: createId('prop'),
    appId: appContext.appId,
    propertyName: payload.propertyName.trim(),
    displayName: payload.displayName,
    description: payload.description,
    dataType: payload.dataType,
    propertyScope: payload.propertyScope,
    associatedEventIds: payload.propertyScope === 'event_param' ? payload.associatedEventIds : [],
    isPreset: false,
    status: 'enabled',
    dictionaryStatus: 'none',
    hasIngestedData: false,
    createdAt: nowText(),
    updatedAt: nowText(),
  }
  eventProperties.unshift(property)
  refreshEventPropertyCounts()
  refreshGovernanceUsage()
  createAudit('metadata.eventProperty', property.id, 'metadata.eventProperty.create', undefined, property)
  return clone(property)
}

async function listPendingEventProperties(): Promise<PendingEventProperty[]> {
  await delay()
  return clone(pendingEventProperties)
}

async function approvePendingEventProperty(pendingId: string, displayName = '', status: 'enabled' | 'hidden' = 'enabled'): Promise<EventPropertyMetadata> {
  await delay()
  const pending = pendingEventProperties.find((item) => item.id === pendingId)
  if (!pending) {
    throw new Error('待验收事件属性不存在')
  }
  const scope: EventPropertyMetadata['propertyScope'] = pending.eventName === 'event_common_header' ? 'event_common_header' : 'event_param'
  const event = scope === 'event_param' ? events.find((item) => item.eventName === pending.eventName) : undefined
  if (scope === 'event_param' && !event) {
    throw new Error('需先验收或创建关联事件，再验收事件属性')
  }
  if (eventProperties.some((property) => property.propertyName === pending.propertyName && property.propertyScope === scope)) {
    eventProperties = eventProperties.map((property) =>
      property.propertyName === pending.propertyName && property.propertyScope === scope && event
        ? { ...property, associatedEventIds: [...new Set([...property.associatedEventIds, event.id])], status, updatedAt: nowText() }
        : property,
    )
    pendingEventProperties = pendingEventProperties.filter((item) => item.id !== pendingId)
    refreshEventPropertyCounts()
    const existing = eventProperties.find((property) => property.propertyName === pending.propertyName && property.propertyScope === scope) as EventPropertyMetadata
    createAudit('metadata.eventProperty', existing.id, 'metadata.eventProperty.approvePending', pending, existing)
    return clone(existing)
  }
  if (!PROPERTY_NAME_REGEX.test(pending.propertyName)) {
    throw new Error('待验收属性名不合法，不能转正')
  }
  const property: EventPropertyMetadata = {
    id: createId('prop'),
    appId: appContext.appId,
    propertyName: pending.propertyName,
    displayName: displayName || pending.propertyName,
    description: `由待验收数据转正，样例值：${pending.sampleValue}`,
    dataType: pending.detectedType,
    propertyScope: scope,
    associatedEventIds: event ? [event.id] : [],
    isPreset: false,
    status,
    dictionaryStatus: 'none',
    createdAt: nowText(),
    updatedAt: nowText(),
  }
  eventProperties.unshift(property)
  pendingEventProperties = pendingEventProperties.filter((item) => item.id !== pendingId)
  refreshEventPropertyCounts()
  refreshGovernanceUsage()
  createAudit('metadata.eventProperty', property.id, 'metadata.eventProperty.approvePending', pending, property)
  return clone(property)
}

async function blacklistPendingEventProperty(pendingId: string): Promise<void> {
  await delay()
  const pending = pendingEventProperties.find((item) => item.id === pendingId)
  if (!pending) {
    throw new Error('待验收事件属性不存在')
  }
  pendingEventProperties = pendingEventProperties.filter((item) => item.id !== pendingId)
  createAudit('metadata.eventProperty', pendingId, 'metadata.eventProperty.blacklistPending', pending, { status: 'blacklist' })
}

async function updateEventPropertyStatus(propertyId: string, status: MetadataStatus, confirmedImpact = false): Promise<EventPropertyMetadata> {
  await delay()
  const index = eventProperties.findIndex((property) => property.id === propertyId)
  if (index < 0) {
    throw new Error('事件属性不存在')
  }
  if (status === 'disabled' && !confirmedImpact) {
    throw new Error('禁用前必须确认属性血缘影响')
  }
  const before = clone(eventProperties[index])
  eventProperties[index] = { ...eventProperties[index], status, updatedAt: nowText() } as EventPropertyMetadata
  virtualProperties = virtualProperties.map((property) =>
    property.referencedProperties.some((reference) => reference.propertyId === propertyId)
      ? { ...property, status: 'invalid', invalidReason: '引用属性被禁用或修改' }
      : property,
  )
  createAudit('metadata.eventProperty', propertyId, `metadata.eventProperty.${status}`, before, eventProperties[index])
  return clone(eventProperties[index] as EventPropertyMetadata)
}

async function changeEventPropertyType(propertyId: string, dataType: PropertyDataType, confirmedImpact = false): Promise<EventPropertyMetadata> {
  await delay()
  const index = eventProperties.findIndex((property) => property.id === propertyId)
  if (index < 0) {
    throw new Error('事件属性不存在')
  }
  if (!confirmedImpact) {
    throw new Error('修改数据类型前必须确认历史数据影响和 SDK 上报代码同步')
  }
  const before = clone(eventProperties[index])
  eventProperties[index] = { ...eventProperties[index], dataType, updatedAt: nowText() } as EventPropertyMetadata
  virtualProperties = virtualProperties.map((property) =>
    property.referencedProperties.some((reference) => reference.propertyId === propertyId)
      ? { ...property, status: 'invalid', invalidReason: '引用属性类型已修改，需要重新评估 SQL 输出类型' }
      : property,
  )
  createAudit('metadata.eventProperty', propertyId, 'metadata.eventProperty.changeType', before, eventProperties[index])
  return clone(eventProperties[index] as EventPropertyMetadata)
}

async function listUserProperties(filter: Omit<PropertyFilter, 'scope'> = {}): Promise<UserPropertyMetadata[]> {
  await delay()
  userProperties = userProperties.map(userPropertyDefaults)
  const result = userProperties.filter((property) => {
    const matchKeyword = includesKeyword([property.propertyName, property.displayName, property.description], filter.keyword)
    const matchStatus = !filter.status || filter.status === 'all' || property.status === filter.status
    const matchType = !filter.dataType || filter.dataType === 'all' || property.dataType === filter.dataType
    const emptyInfo = !filter.emptyInfoOnly || !property.displayName || !property.description
    return matchKeyword && matchStatus && matchType && emptyInfo
  })
  return clone(result.map(userPropertyDefaults))
}

async function createUserProperty(payload: CreateUserPropertyPayload): Promise<UserPropertyMetadata> {
  await delay()
  ensurePropertyNameValid(payload.propertyName)
  if (userProperties.some((property) => property.propertyName === payload.propertyName.trim())) {
    throw new Error('用户属性名称已存在')
  }
  const property: UserPropertyMetadata = {
    id: createId('up'),
    appId: appContext.appId,
    propertyName: payload.propertyName.trim(),
    displayName: payload.displayName,
    description: payload.description,
    dataType: payload.dataType,
    calculationLogic: payload.calculationLogic,
    isPreset: false,
    status: 'enabled',
    dictionaryStatus: 'none',
    createdAt: nowText(),
    updatedAt: nowText(),
  }
  userProperties.unshift(property)
  refreshGovernanceUsage()
  createAudit('metadata.userProperty', property.id, 'metadata.userProperty.create', undefined, property)
  return clone(property)
}

async function listPendingUserProperties(): Promise<PendingUserProperty[]> {
  await delay()
  return clone(pendingUserProperties)
}

async function approvePendingUserProperty(
  pendingId: string,
  displayName = '',
  calculationLogic: UserPropertyMetadata['calculationLogic'] = 'latest_value',
  status: 'enabled' | 'hidden' = 'enabled',
): Promise<UserPropertyMetadata> {
  await delay()
  const pending = pendingUserProperties.find((item) => item.id === pendingId)
  if (!pending) {
    throw new Error('待验收用户属性不存在')
  }
  ensurePropertyNameValid(pending.propertyName)
  if (userProperties.some((property) => property.propertyName === pending.propertyName)) {
    throw new Error('用户属性名称已存在')
  }
  const property: UserPropertyMetadata = {
    id: createId('up'),
    appId: appContext.appId,
    propertyName: pending.propertyName,
    displayName: displayName || pending.propertyName,
    description: `由待验收用户数据转正，样例值：${pending.sampleValue}`,
    dataType: pending.detectedType,
    calculationLogic,
    isPreset: false,
    status,
    dictionaryStatus: 'none',
    createdAt: nowText(),
    updatedAt: nowText(),
  }
  userProperties.unshift(property)
  pendingUserProperties = pendingUserProperties.filter((item) => item.id !== pendingId)
  refreshGovernanceUsage()
  createAudit('metadata.userProperty', property.id, 'metadata.userProperty.approvePending', pending, property)
  return clone(property)
}

async function blacklistPendingUserProperty(pendingId: string): Promise<void> {
  await delay()
  const pending = pendingUserProperties.find((item) => item.id === pendingId)
  if (!pending) {
    throw new Error('待验收用户属性不存在')
  }
  pendingUserProperties = pendingUserProperties.filter((item) => item.id !== pendingId)
  createAudit('metadata.userProperty', pendingId, 'metadata.userProperty.blacklistPending', pending, { status: 'blacklist' })
}

async function updateUserPropertyStatus(propertyId: string, status: MetadataStatus, confirmedImpact = false): Promise<UserPropertyMetadata> {
  await delay()
  const index = userProperties.findIndex((property) => property.id === propertyId)
  if (index < 0) {
    throw new Error('用户属性不存在')
  }
  if (status === 'disabled' && !confirmedImpact) {
    throw new Error('禁用前必须确认用户属性血缘影响')
  }
  const before = clone(userProperties[index])
  userProperties[index] = { ...userProperties[index], status, updatedAt: nowText() } as UserPropertyMetadata
  createAudit('metadata.userProperty', propertyId, `metadata.userProperty.${status}`, before, userProperties[index])
  return clone(userProperties[index] as UserPropertyMetadata)
}

async function changeUserPropertyType(propertyId: string, dataType: PropertyDataType, confirmedImpact = false): Promise<UserPropertyMetadata> {
  await delay()
  const index = userProperties.findIndex((property) => property.id === propertyId)
  if (index < 0) {
    throw new Error('用户属性不存在')
  }
  if (!confirmedImpact) {
    throw new Error('修改用户属性类型前必须确认历史归属计算和 SDK 上报影响')
  }
  const before = clone(userProperties[index])
  userProperties[index] = { ...userProperties[index], dataType, updatedAt: nowText() } as UserPropertyMetadata
  createAudit('metadata.userProperty', propertyId, 'metadata.userProperty.changeType', before, userProperties[index])
  return clone(userProperties[index] as UserPropertyMetadata)
}

async function listVirtualEvents(): Promise<VirtualEvent[]> {
  await delay()
  return clone(virtualEvents)
}

async function createVirtualEvent(payload: CreateVirtualEventPayload): Promise<VirtualEvent> {
  await delay()
  ensureEventNameValid(payload.eventName)
  if (!payload.displayName.trim()) {
    throw new Error('展示名必填')
  }
  if (payload.components.length === 0) {
    throw new Error('至少选择一个一般事件')
  }
  const combinedEvents = payload.components.map((component) => {
    const event = events.find((item) => item.id === component.eventId)
    if (!event) {
      throw new Error('组合事件不存在')
    }
    return { eventId: event.id, eventName: event.eventName, filters: component.filters }
  })
  const event: VirtualEvent = {
    id: createId('ve'),
    appId: appContext.appId,
    eventName: payload.eventName.trim(),
    displayName: payload.displayName.trim(),
    description: payload.description,
    combinedEvents,
    status: 'enabled',
    createdBy: 'Chaoyang Xu',
    createdAt: nowText(),
    updatedAt: nowText(),
  }
  virtualEvents.unshift(event)
  refreshGovernanceUsage()
  createAudit('metadata.virtualEvent', event.id, 'metadata.virtualEvent.create', undefined, event)
  return clone(event)
}

async function updateVirtualEventStatus(eventId: string, status: VirtualEvent['status']): Promise<VirtualEvent> {
  await delay()
  const index = virtualEvents.findIndex((event) => event.id === eventId)
  if (index < 0) {
    throw new Error('虚拟事件不存在')
  }
  const before = clone(virtualEvents[index])
  virtualEvents[index] = { ...virtualEvents[index], status, updatedAt: nowText() } as VirtualEvent
  createAudit('metadata.virtualEvent', eventId, `metadata.virtualEvent.${status}`, before, virtualEvents[index])
  return clone(virtualEvents[index] as VirtualEvent)
}

async function deleteVirtualEvent(eventId: string): Promise<void> {
  await delay()
  const before = virtualEvents.find((event) => event.id === eventId)
  virtualEvents = virtualEvents.filter((event) => event.id !== eventId)
  refreshGovernanceUsage()
  createAudit('metadata.virtualEvent', eventId, 'metadata.virtualEvent.delete', before, undefined)
}

async function listVirtualProperties(): Promise<VirtualProperty[]> {
  await delay()
  return clone(virtualProperties.filter((property) => property.status !== 'deleted'))
}

async function validateSqlExpression(payload: Pick<CreateVirtualPropertyPayload, 'propertyType' | 'dataType' | 'sqlExpression'>): Promise<SqlValidationResult> {
  await delay()
  const errors: SqlValidationResult['errors'] = []
  const expression = payload.sqlExpression.trim()
  if (!expression) {
    errors.push({ code: 'SQL_EMPTY', message: 'SQL 表达式不能为空' })
  }
  if (expression.includes(';')) {
    errors.push({ code: 'SQL_MULTI_STATEMENT', message: '只允许 SQL 片段，不允许多语句' })
  }
  if (/\b(drop|delete|insert|update|alter)\b/i.test(expression)) {
    errors.push({ code: 'SQL_UNSAFE', message: 'SQL 片段不能包含写入或结构变更语句' })
  }
  if (/\$vp_|event_virtual_property|user_virtual_property/.test(expression)) {
    errors.push({ code: 'SQL_NESTED_VIRTUAL_PROPERTY', message: '不允许基于虚拟属性再次创建虚拟属性' })
  }
  const referencedProperties = referencedPropertiesFromSql(expression)
  referencedProperties.forEach((reference) => {
    const exists = reference.propertyKind === 'event_property' ? propertyExists(reference.propertyName, 'event') : propertyExists(reference.propertyName, 'user')
    if (!exists) {
      errors.push({ code: 'SQL_REFERENCE_MISSING', message: `引用属性不存在或已禁用：${reference.propertyName}` })
    }
  })
  if (payload.propertyType === 'user_virtual_property' && referencedProperties.some((reference) => reference.propertyKind === 'event_property')) {
    errors.push({ code: 'SQL_USER_SCOPE_INVALID', message: '用户虚拟属性表达式中不能包含事件属性' })
  }
  const outputType = /\+|-|\*|\/|round|pow|toFloat|toInt|cast/i.test(expression)
    ? 'float'
    : /JSONExtract|domain|concat|multiIf|toString/i.test(expression)
      ? 'string'
      : payload.dataType
  if (payload.dataType !== outputType && !(payload.dataType === 'int' && outputType === 'float')) {
    errors.push({ code: 'SQL_OUTPUT_TYPE_MISMATCH', message: `表达式推断输出为 ${outputType}，与选择类型 ${payload.dataType} 不兼容` })
  }
  return clone({ valid: errors.length === 0, outputType, referencedProperties, errors })
}

async function createVirtualProperty(payload: CreateVirtualPropertyPayload): Promise<VirtualProperty> {
  await delay()
  const activeCount = virtualProperties.filter((property) => property.status !== 'deleted').length
  const limit = appContext.environmentType === 'private_deployment' ? 5000 : 200
  if (activeCount >= limit) {
    throw new Error(`当前环境每个应用最多创建 ${limit} 个虚拟属性`)
  }
  const propertyName = ensureVirtualPropertyNameValid(payload.propertyName)
  const validation = await validateSqlExpression(payload)
  if (!validation.valid) {
    throw new Error(validation.errors.map((error) => error.message).join('；'))
  }
  const property: VirtualProperty = {
    id: createId('vp'),
    appId: appContext.appId,
    propertyType: payload.propertyType,
    propertyName,
    displayName: payload.displayName,
    description: payload.description,
    dataType: payload.dataType,
    sqlExpression: payload.sqlExpression.trim(),
    associationMode: payload.propertyType === 'event_virtual_property' ? payload.associationMode : undefined,
    referencedProperties: validation.referencedProperties,
    status: 'valid',
    dictionaryStatus: 'none',
    createdAt: nowText(),
    updatedAt: nowText(),
  }
  virtualProperties.unshift(property)
  refreshGovernanceUsage()
  createAudit('metadata.virtualProperty', property.id, 'metadata.virtualProperty.create', undefined, property)
  return clone(property)
}

async function updateVirtualProperty(propertyId: string, payload: UpdateVirtualPropertyPayload): Promise<VirtualProperty> {
  await delay()
  const index = virtualProperties.findIndex((property) => property.id === propertyId)
  if (index < 0) {
    throw new Error('虚拟属性不存在')
  }
  const current = virtualProperties[index] as VirtualProperty
  if (current.status === 'invalid') {
    throw new Error('失效虚拟属性不支持字段编辑，只能查看失效原因或删除')
  }
  if (current.status === 'deleted') {
    throw new Error('已删除虚拟属性不能编辑')
  }
  const sqlChanged = current.sqlExpression.trim() !== payload.sqlExpression.trim()
  if (sqlChanged && current.dictionaryStatus && current.dictionaryStatus !== 'none' && !payload.confirmedDictionaryDelete) {
    throw new Error('SQL 表达式修改后已有字典会自动删除，请确认影响后再提交')
  }
  const validation = await validateSqlExpression({
    propertyType: payload.propertyType,
    dataType: payload.dataType,
    sqlExpression: payload.sqlExpression,
  })
  if (!validation.valid) {
    throw new Error(validation.errors.map((error) => error.message).join('；'))
  }
  const before = clone(current)
  virtualProperties[index] = {
    ...current,
    propertyType: payload.propertyType,
    displayName: payload.displayName,
    description: payload.description,
    dataType: payload.dataType,
    sqlExpression: payload.sqlExpression.trim(),
    associationMode: payload.propertyType === 'event_virtual_property' ? payload.associationMode : undefined,
    referencedProperties: validation.referencedProperties,
    dictionaryStatus: sqlChanged ? 'none' : current.dictionaryStatus,
    status: 'valid',
    invalidReason: undefined,
    updatedAt: nowText(),
  } as VirtualProperty
  if (sqlChanged) {
    dictionaries = dictionaries.filter((dictionary) => dictionary.propertyId !== propertyId)
  }
  createAudit('metadata.virtualProperty', propertyId, 'metadata.virtualProperty.update', before, virtualProperties[index])
  return clone(virtualProperties[index] as VirtualProperty)
}

async function deleteVirtualProperty(propertyId: string): Promise<void> {
  await delay()
  const index = virtualProperties.findIndex((property) => property.id === propertyId)
  if (index < 0) {
    throw new Error('虚拟属性不存在')
  }
  const before = clone(virtualProperties[index])
  virtualProperties[index] = { ...virtualProperties[index], status: 'deleted', updatedAt: nowText() } as VirtualProperty
  refreshGovernanceUsage()
  createAudit('metadata.virtualProperty', propertyId, 'metadata.virtualProperty.delete', before, virtualProperties[index])
}

async function listVisualEvents(): Promise<VisualEvent[]> {
  await delay()
  return clone(visualEvents)
}

async function getVisualSelectionSession(): Promise<VisualSelectionSession | null> {
  await delay()
  return clone(visualSelectionSession)
}

async function createVisualSelectionSession(platform: VisualEvent['platform'], targetUrl?: string): Promise<VisualSelectionSession> {
  await delay()
  if (!appContext.sdkSettings.autoTrackEnabled) {
    visualSelectionSession = {
      id: createId('visual_session'),
      platform,
      targetUrl,
      toolMode: 'select',
      highlightDefined: false,
      status: 'failed',
      message: '未检测到全埋点能力，请确认 SDK 配置',
      createdAt: nowText(),
    }
    saveState()
    return clone(visualSelectionSession)
  }
  if (platform === 'web' && !targetUrl?.trim()) {
    throw new Error('网页端圈选必须输入圈选网址')
  }
  if (platform === 'web' && targetUrl?.includes('no-sdk')) {
    visualSelectionSession = {
      id: createId('visual_session'),
      platform,
      targetUrl,
      toolMode: 'select',
      highlightDefined: false,
      status: 'failed',
      message: '未出现圈选工具条，请检查页面是否接入圈选埋点 SDK 或开启全埋点',
      createdAt: nowText(),
    }
    saveState()
    return clone(visualSelectionSession)
  }
  visualSelectionSession = {
    id: createId('visual_session'),
    platform,
    targetUrl,
    qrCodeUrl: platform === 'app' ? 'https://dummyimage.com/160x160/ecfdf5/059669&text=APP+QR' : undefined,
    toolMode: 'select',
    highlightDefined: false,
    status: 'active',
    message:
      platform === 'app'
        ? '移动端圈选已生成二维码，扫码后 PC 页面进入可圈选状态'
        : '网页端圈选会话已创建，工具条默认处于圈选模式',
    createdAt: nowText(),
  }
  createAudit('metadata.visualEvent', visualSelectionSession.id, 'metadata.visualSelection.createSession', undefined, visualSelectionSession)
  return clone(visualSelectionSession)
}

async function updateVisualSelectionToolMode(
  toolMode: VisualSelectionSession['toolMode'],
  highlightDefined: boolean,
): Promise<VisualSelectionSession> {
  await delay()
  if (!visualSelectionSession) {
    throw new Error('请先创建圈选会话')
  }
  if (visualSelectionSession.status !== 'active') {
    throw new Error(visualSelectionSession.message)
  }
  const before = clone(visualSelectionSession)
  visualSelectionSession = {
    ...visualSelectionSession,
    toolMode,
    highlightDefined,
    message: toolMode === 'browse' ? '浏览模式下禁用圈选功能' : toolMode === 'heatmap' ? '热力图模式需选择页面或页面组' : '圈选模式已开启，鼠标移动时展示绿色浮层',
  }
  createAudit('metadata.visualEvent', visualSelectionSession.id, 'metadata.visualSelection.updateToolbar', before, visualSelectionSession)
  return clone(visualSelectionSession)
}

async function createVisualEvent(payload: CreateVisualEventPayload): Promise<VisualEvent> {
  await delay()
  if (!appContext.sdkSettings.autoTrackEnabled) {
    throw new Error('未检测到全埋点能力，请确认 SDK 配置')
  }
  ensureEventNameValid(payload.eventName)
  if (!payload.pageName.trim() || !payload.pageRule.trim() || !payload.elementName.trim()) {
    throw new Error('页面名称、页面规则和元素名称均必填')
  }
  const event: VisualEvent = {
    id: createId('visual'),
    eventName: payload.eventName.trim(),
    description: payload.description,
    platform: payload.platform,
    pageName: payload.pageName.trim(),
    pageRule: payload.pageRule.trim(),
    elementName: payload.elementName.trim(),
    recent48hTriggerCount: 0,
    recent48hUserCount: 0,
    status: 'enabled',
    createdAt: nowText(),
  }
  visualEvents.unshift(event)
  events.unshift({
    id: createId('event'),
    appId: appContext.appId,
    eventName: event.eventName,
    displayName: event.description || event.eventName,
    description: `圈选事件：${event.pageName} / ${event.elementName}`,
    sourceType: 'custom',
    status: 'enabled',
    isPreset: false,
    propertyCount: 0,
    commonPropertyCount: eventProperties.filter((property) => property.propertyScope === 'event_common_header').length,
    screenshotCount: 1,
    recent30dQueryCount: 0,
    recent30dQueryUserCount: 0,
    yesterdayIngestCount: 0,
    createdAt: nowText(),
    updatedAt: nowText(),
    createdBy: '圈选工具',
    associatedPropertyIds: [],
  })
  refreshGovernanceUsage()
  createAudit('metadata.visualEvent', event.id, 'metadata.visualEvent.create', undefined, event)
  return clone(event)
}

async function updateVisualEventStatus(eventId: string, status: VisualEvent['status']): Promise<VisualEvent> {
  await delay()
  const index = visualEvents.findIndex((event) => event.id === eventId)
  if (index < 0) {
    throw new Error('圈选事件不存在')
  }
  const before = clone(visualEvents[index])
  visualEvents[index] = { ...visualEvents[index], status } as VisualEvent
  createAudit('metadata.visualEvent', eventId, `metadata.visualEvent.${status}`, before, visualEvents[index])
  return clone(visualEvents[index] as VisualEvent)
}

async function generateRelationEvents(activeEventName: string, targetUuidText: string) {
  await delay()
  const targetIds = targetUuidText
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
  if (!activeEventName.trim() || targetIds.length === 0) {
    throw new Error('主动事件和目标用户列表必填')
  }
  const passiveName = `$inactive_${activeEventName.replace(/^\$inactive_/, '')}`
  if (!events.some((event) => event.eventName === passiveName)) {
    events.unshift({
      id: createId('event'),
      appId: appContext.appId,
      eventName: passiveName,
      displayName: `被动事件：${activeEventName}`,
      description: '由 $inline=true 且 $target_uuid_list 自动生成。',
      sourceType: 'relation_generated',
      status: 'enabled',
      isPreset: false,
      isRelationEvent: true,
      isPassiveEvent: true,
      propertyCount: 4,
      commonPropertyCount: eventProperties.filter((property) => property.propertyScope === 'event_common_header').length,
      screenshotCount: 0,
      recent30dQueryCount: 0,
      recent30dQueryUserCount: 0,
      yesterdayIngestCount: targetIds.length,
      createdAt: nowText(),
      updatedAt: nowText(),
      createdBy: '系统自动',
      associatedPropertyIds: ['prop_source_uuid', 'prop_target_uuid_list'],
    })
  }
  createAudit('metadata.event', passiveName, 'metadata.relationEvent.generate', undefined, { activeEventName, targetIds })
  return clone({
    ...mockRelationPreview,
    activeEventName,
    passiveEventName: passiveName,
    targetUserCount: targetIds.length,
    generatedCount: targetIds.length,
  })
}

async function getWebSessionConfig(): Promise<WebSessionConfig> {
  await delay()
  return clone(webSessionConfig)
}

async function updateWebSessionConfig(intervalMinutes: number): Promise<WebSessionConfig> {
  await delay()
  if (intervalMinutes < 1 || intervalMinutes > 1440) {
    throw new Error('会话间隔需在 1-1440 分钟之间')
  }
  const before = clone(webSessionConfig)
  webSessionConfig = {
    ...webSessionConfig,
    intervalMinutes,
    updatedBy: 'Chaoyang Xu',
    updatedAt: nowText(),
  }
  createAudit('metadata.session', appContext.appId, 'metadata.session.updateInterval', before, webSessionConfig)
  return clone(webSessionConfig)
}

async function listCustomSessions(): Promise<CustomSession[]> {
  await delay()
  return clone(customSessions)
}

async function createCustomSession(payload: CreateCustomSessionPayload): Promise<CustomSession> {
  await delay()
  if (!payload.sessionName.trim() || !payload.displayName.trim()) {
    throw new Error('Session 名称和展示名必填')
  }
  if (payload.platformScope.length === 0) {
    throw new Error('至少选择一个端类型')
  }
  if (payload.cutRuleType === 'time_gap' && (!payload.gapMinutes || payload.gapMinutes < 1)) {
    throw new Error('切割时长需大于 0 分钟')
  }
  if (payload.cutRuleType === 'start_end_event') {
    if (!payload.startEventId || !payload.endEventId) {
      throw new Error('事件切割需要选择开始事件和结束事件')
    }
    if (payload.startEventId === payload.endEventId) {
      throw new Error('开始事件和结束事件不能相同')
    }
  }
  const session: CustomSession = {
    id: createId('session'),
    appId: appContext.appId,
    sessionName: payload.sessionName.trim(),
    displayName: payload.displayName.trim(),
    description: payload.description,
    platformScope: payload.platformScope,
    eventScope: {
      mode: payload.eventIds.length > 0 ? 'selected_events' : 'all_events',
      eventIds: payload.eventIds,
    },
    cutRule:
      payload.cutRuleType === 'start_end_event'
        ? { type: 'start_end_event' }
        : { type: 'time_gap', gapMinutes: payload.gapMinutes },
    startEventId: payload.cutRuleType === 'start_end_event' ? payload.startEventId : undefined,
    endEventId: payload.cutRuleType === 'start_end_event' ? payload.endEventId : undefined,
    status: 'enabled',
    createdAt: nowText(),
    updatedAt: nowText(),
  }
  customSessions.unshift(session)
  createAudit('metadata.session', session.id, 'metadata.customSession.create', undefined, session)
  return clone(session)
}

async function updateCustomSessionStatus(sessionId: string, status: CustomSession['status']): Promise<CustomSession> {
  await delay()
  const index = customSessions.findIndex((session) => session.id === sessionId)
  if (index < 0) {
    throw new Error('自定义 Session 不存在')
  }
  const before = clone(customSessions[index])
  customSessions[index] = { ...customSessions[index], status, updatedAt: nowText() } as CustomSession
  createAudit('metadata.session', sessionId, `metadata.customSession.${status}`, before, customSessions[index])
  return clone(customSessions[index] as CustomSession)
}

async function deleteCustomSession(sessionId: string): Promise<void> {
  await delay()
  const before = customSessions.find((session) => session.id === sessionId)
  customSessions = customSessions.filter((session) => session.id !== sessionId)
  createAudit('metadata.session', sessionId, 'metadata.customSession.delete', before, undefined)
}

async function listCategories(): Promise<EventCategory[]> {
  await delay()
  return clone([...eventCategories].sort((a, b) => a.sortOrder - b.sortOrder))
}

async function createCategory(payload: CreateCategoryPayload): Promise<EventCategory> {
  await delay()
  if (!payload.name.trim()) {
    throw new Error('分类名称必填')
  }
  if (eventCategories.some((category) => category.scope === payload.scope && category.name === payload.name.trim())) {
    throw new Error('同一分类页下分类名称不能重复')
  }
  const scopedCount = eventCategories.filter((category) => category.scope === payload.scope).length
  if (scopedCount >= 20) {
    throw new Error('不考虑未分类，每个分类页最多 20 个分类标签')
  }
  const category: EventCategory = {
    id: createId('cat'),
    appId: appContext.appId,
    scope: payload.scope,
    ownerUserId: payload.scope === 'private' ? 'user_xcy' : undefined,
    name: payload.name.trim(),
    description: payload.description?.trim(),
    isDefault: false,
    sortOrder: Math.max(0, ...eventCategories.map((item) => item.sortOrder)) + 1,
    eventIds: [],
    createdAt: nowText(),
    updatedAt: nowText(),
  }
  eventCategories.push(category)
  createAudit('efficiency.eventCategory', category.id, 'efficiency.eventCategory.create', undefined, category)
  return clone(category)
}

async function updateCategory(categoryId: string, payload: UpdateCategoryPayload): Promise<EventCategory> {
  await delay()
  const index = eventCategories.findIndex((category) => category.id === categoryId)
  if (index < 0) {
    throw new Error('分类不存在')
  }
  const before = clone(eventCategories[index])
  const current = eventCategories[index] as EventCategory
  const nextName = payload.name?.trim() ?? current.name
  if (!nextName) {
    throw new Error('分类名称必填')
  }
  if (eventCategories.some((category) => category.id !== categoryId && category.scope === current.scope && category.name === nextName)) {
    throw new Error('同一分类页下分类名称不能重复')
  }
  eventCategories = eventCategories.map((category) => {
    if (category.id === categoryId) {
      return {
        ...category,
        name: nextName,
        description: payload.description?.trim() ?? category.description,
        isDefault: payload.isDefault ?? category.isDefault,
        updatedAt: nowText(),
      }
    }
    if (payload.isDefault && category.scope === current.scope) {
      return { ...category, isDefault: false, updatedAt: nowText() }
    }
    return category
  })
  createAudit('efficiency.eventCategory', categoryId, 'efficiency.eventCategory.update', before, eventCategories.find((category) => category.id === categoryId))
  return clone(eventCategories.find((category) => category.id === categoryId) as EventCategory)
}

async function assignEventToCategory(eventId: string, categoryId: string): Promise<void> {
  await delay()
  if (!events.some((event) => event.id === eventId)) {
    throw new Error('事件不存在')
  }
  const category = eventCategories.find((item) => item.id === categoryId)
  if (!category) {
    throw new Error('分类不存在')
  }
  eventCategories = eventCategories.map((item) => ({
    ...item,
    eventIds: item.id === categoryId ? [...new Set([...item.eventIds, eventId])] : item.scope === category.scope ? item.eventIds.filter((id) => id !== eventId) : item.eventIds,
    updatedAt: item.id === categoryId || item.scope === category.scope ? nowText() : item.updatedAt,
  }))
  events = events.map((event) => (event.id === eventId ? { ...event, categoryId, updatedAt: nowText() } : event))
  createAudit('efficiency.eventCategory', categoryId, 'efficiency.eventCategory.assignEvent', undefined, { eventId })
}

async function removeEventFromCategory(eventId: string, categoryId: string): Promise<void> {
  await delay()
  const before = eventCategories.find((category) => category.id === categoryId)
  eventCategories = eventCategories.map((category) => (category.id === categoryId ? { ...category, eventIds: category.eventIds.filter((id) => id !== eventId), updatedAt: nowText() } : category))
  events = events.map((event) => (event.id === eventId && event.categoryId === categoryId ? { ...event, categoryId: undefined, updatedAt: nowText() } : event))
  createAudit('efficiency.eventCategory', categoryId, 'efficiency.eventCategory.removeEvent', before, { eventId })
}

async function moveCategory(categoryId: string, direction: 'up' | 'down'): Promise<EventCategory[]> {
  await delay()
  const current = eventCategories.find((category) => category.id === categoryId)
  if (!current) {
    throw new Error('分类不存在')
  }
  const scoped = eventCategories.filter((category) => category.scope === current.scope).sort((a, b) => a.sortOrder - b.sortOrder)
  const index = scoped.findIndex((category) => category.id === categoryId)
  const target = scoped[index + (direction === 'up' ? -1 : 1)]
  if (!target) {
    return clone([...eventCategories].sort((a, b) => a.sortOrder - b.sortOrder))
  }
  const before = clone([current, target])
  eventCategories = eventCategories.map((category) => {
    if (category.id === current.id) {
      return { ...category, sortOrder: target.sortOrder, updatedAt: nowText() }
    }
    if (category.id === target.id) {
      return { ...category, sortOrder: current.sortOrder, updatedAt: nowText() }
    }
    return category
  })
  createAudit('efficiency.eventCategory', categoryId, `efficiency.eventCategory.move.${direction}`, before, [current.id, target.id])
  return clone([...eventCategories].sort((a, b) => a.sortOrder - b.sortOrder))
}

async function deleteCategory(categoryId: string): Promise<void> {
  await delay()
  const before = eventCategories.find((category) => category.id === categoryId)
  if (!before) {
    throw new Error('分类不存在')
  }
  eventCategories = eventCategories.filter((category) => category.id !== categoryId)
  events = events.map((event) => (event.categoryId === categoryId ? { ...event, categoryId: undefined } : event))
  createAudit('efficiency.eventCategory', categoryId, 'efficiency.eventCategory.delete', before, undefined)
}

async function getLineage(objectType: LineageItem['objectType'], objectId: string): Promise<LineageItem[]> {
  await delay()
  return clone(mockLineageItems.filter((item) => item.objectType === objectType && item.objectId === objectId))
}

async function listDictionaries(): Promise<DictionaryFile[]> {
  await delay()
  return clone(dictionaries)
}

async function uploadDictionary(propertyKind: DictionaryFile['propertyKind'], propertyId: string, fileName: string, content: string): Promise<DictionaryFile> {
  await delay()
  if (!/\.(csv|txt)$/i.test(fileName)) {
    throw new Error('字典文件后缀必须为 csv 或 txt')
  }
  const targetProperty =
    propertyKind === 'event'
      ? eventProperties.find((property) => property.id === propertyId)
      : propertyKind === 'user'
        ? userProperties.find((property) => property.id === propertyId)
        : virtualProperties.find((property) => property.id === propertyId)
  if (!targetProperty) {
    throw new Error('属性不存在')
  }
  if ('isPreset' in targetProperty && targetProperty.isPreset && !['string', 'version'].includes(targetProperty.dataType)) {
    throw new Error('当前预置属性不支持上传维度字典')
  }
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length === 0) {
    throw new Error('字典文件不能为空')
  }
  if (lines.length > 100000) {
    throw new Error('文件内容必须小于 10 万行')
  }
  if (new Blob([content]).size > 10 * 1024 * 1024) {
    throw new Error('文件整体必须小于 10MB')
  }
  const previewRows = lines.slice(0, 100).map((line) => {
    const [rawValue = '', translatedValue = ''] = line.split(',')
    if (rawValue.length > 1024 || translatedValue.length > 1024) {
      throw new Error('原始值和翻译值长度均不超过 1024 字符')
    }
    return { rawValue: rawValue.trim(), translatedValue: translatedValue.trim() }
  })
  const dictionary: DictionaryFile = {
    id: createId('dict'),
    propertyId,
    propertyKind,
    fileName,
    status: 'processing',
    rowCount: lines.length,
    content,
    previewRows,
    uploadedAt: nowText(),
  }
  dictionaries = dictionaries.filter((item) => item.propertyId !== propertyId)
  dictionaries.unshift(dictionary)
  if (propertyKind === 'event') {
    eventProperties = eventProperties.map((property) => (property.id === propertyId ? { ...property, dictionaryStatus: 'processing' } : property))
  }
  if (propertyKind === 'user') {
    userProperties = userProperties.map((property) => (property.id === propertyId ? { ...property, dictionaryStatus: 'processing' } : property))
  }
  window.setTimeout(() => {
    dictionaries = dictionaries.map((item) => (item.id === dictionary.id ? { ...item, status: 'effective' } : item))
    eventProperties = eventProperties.map((property) => (property.id === propertyId ? { ...property, dictionaryStatus: 'effective' } : property))
    userProperties = userProperties.map((property) => (property.id === propertyId ? { ...property, dictionaryStatus: 'effective' } : property))
    saveState()
  }, 1800)
  createAudit('efficiency.dimensionDictionary', propertyId, 'efficiency.dimensionDictionary.upload', undefined, dictionary)
  return clone(dictionary)
}

async function downloadDictionary(propertyId: string): Promise<string> {
  await delay()
  const dictionary = dictionaries.find((item) => item.propertyId === propertyId)
  if (!dictionary) {
    throw new Error('字典文件不存在')
  }
  createAudit('efficiency.dimensionDictionary', propertyId, 'efficiency.dimensionDictionary.download', undefined, { fileName: dictionary.fileName })
  return dictionary.content ?? toCsv(dictionary.previewRows.map((row) => [row.rawValue, row.translatedValue]))
}

async function previewDictionaryDeleteImpact(propertyId: string): Promise<LineageItem[]> {
  await delay()
  const dictionary = dictionaries.find((item) => item.propertyId === propertyId)
  if (!dictionary) {
    throw new Error('字典文件不存在')
  }
  const valueLineage = dictionary.previewRows.flatMap((row) => mockLineageItems.filter((item) => item.objectType === 'dictionary_value' && item.objectId === `${propertyId}:${row.rawValue}`))
  const propertyLineage = mockLineageItems.filter((item) => ['event_property', 'user_property'].includes(item.objectType) && item.objectId === propertyId)
  return clone([...valueLineage, ...propertyLineage])
}

async function deleteDictionary(propertyKind: DictionaryFile['propertyKind'], propertyId: string, confirmedImpact = false): Promise<void> {
  await delay()
  if (!confirmedImpact) {
    throw new Error('删除字典前必须确认字典 value 的图表和分群影响范围')
  }
  const before = dictionaries.find((item) => item.propertyId === propertyId)
  dictionaries = dictionaries.filter((item) => item.propertyId !== propertyId)
  if (propertyKind === 'event') {
    eventProperties = eventProperties.map((property) => (property.id === propertyId ? { ...property, dictionaryStatus: 'none' } : property))
  }
  if (propertyKind === 'user') {
    userProperties = userProperties.map((property) => (property.id === propertyId ? { ...property, dictionaryStatus: 'none' } : property))
  }
  createAudit('efficiency.dimensionDictionary', propertyId, 'efficiency.dimensionDictionary.delete', before, undefined)
}

async function getRealtimeSession(): Promise<{ session: RealtimeVerifySession, logs: VerifyEventLog[] }> {
  await delay()
  return clone({ session: realtimeSession, logs: verifyLogs })
}

async function createRealtimeSession(payload: Pick<RealtimeVerifySession, 'platform' | 'verifyMode' | 'targetUrl' | 'userUniqueId'>): Promise<RealtimeVerifySession> {
  await delay()
  if (payload.platform === 'web_js' && !payload.targetUrl?.trim()) {
    throw new Error('Web 验证必须输入待验证网址')
  }
  if (payload.platform === 'server_java' && !payload.userUniqueId?.trim()) {
    throw new Error('服务端验证必须输入测试 user_unique_id')
  }
  realtimeSession = {
    id: createId('rtv'),
    appId: appContext.appId,
    platform: payload.platform,
    verifyMode: payload.verifyMode,
    status: 'created',
    targetUrl: payload.targetUrl,
    userUniqueId: payload.userUniqueId,
    qrCodeUrl: 'https://dummyimage.com/120x120/eff6ff/2563eb&text=QR',
    testUrl: `${payload.targetUrl || 'https://sdk.example.com/server-verify'}?bd_verify=1&session=${Date.now()}`,
  }
  verifyLogs = []
  createAudit('tracking.realtimeVerify', realtimeSession.id, 'tracking.realtimeVerify.create', undefined, realtimeSession)
  return clone(realtimeSession)
}

async function updateRealtimeSessionStatus(status: RealtimeVerifySession['status']): Promise<RealtimeVerifySession> {
  await delay()
  const before = clone(realtimeSession)
  realtimeSession = {
    ...realtimeSession,
    status,
    startedAt: ['connected', 'verifying'].includes(status) ? realtimeSession.startedAt ?? nowText() : realtimeSession.startedAt,
    endedAt: status === 'ended' ? nowText() : realtimeSession.endedAt,
  }
  createAudit('tracking.realtimeVerify', realtimeSession.id, `tracking.realtimeVerify.${status}`, before, realtimeSession)
  return clone(realtimeSession)
}

async function simulateVerifyLog(eventName: string): Promise<VerifyEventLog> {
  await delay()
  if (!['connected', 'verifying'].includes(realtimeSession.status)) {
    throw new Error('只有连接或验证中状态才能接收实时事件')
  }
  if (['app_launch', 'app_terminate'].includes(eventName)) {
    throw new Error('app_launch 和 app_terminate 不支持实时验证')
  }
  const event = events.find((item) => item.eventName === eventName)
  const failed = realtimeSession.verifyMode !== 'quick' && !event
  const log: VerifyEventLog = {
    id: createId('log'),
    eventName,
    triggerTime: nowText(),
    rawPayload: { event: eventName, params: failed ? { unknown: true } : { product_id: 'sku_1001', order_amount: 99.9 } },
    validationResult: failed ? 'failed' : 'success',
    validationMessages: failed ? ['按元数据验证时只展示并校验已登记事件和属性', '事件元数据不存在，命中 1010008'] : ['事件已登记', '属性类型匹配', '上报时间在有效窗口内'],
    screenshots: realtimeSession.platform === 'android' && appContext.sdkSettings.screenshotCaptureEnabled ? ['自动截图 1', '自动截图 2'] : [],
  }
  verifyLogs.unshift(log)
  realtimeSession = { ...realtimeSession, status: 'verifying' }
  saveState()
  return clone(log)
}

async function clearVerifyLogs(): Promise<void> {
  await delay()
  verifyLogs = []
  createAudit('tracking.realtimeVerify', realtimeSession.id, 'tracking.realtimeVerify.clearLogs', undefined, undefined)
}

async function manualCorrectLog(logId: string, result: VerifyEventLog['validationResult'], remark: string): Promise<VerifyEventLog> {
  await delay()
  const index = verifyLogs.findIndex((log) => log.id === logId)
  if (index < 0) {
    throw new Error('验证日志不存在')
  }
  verifyLogs[index] = { ...verifyLogs[index], validationResult: result, remark } as VerifyEventLog
  saveState()
  return clone(verifyLogs[index] as VerifyEventLog)
}

async function saveVerifyReport(reportName: string): Promise<VerifyReport> {
  await delay()
  if (realtimeSession.verifyMode === 'quick') {
    throw new Error('快速验证不支持保存报告')
  }
  if (realtimeSession.status !== 'paused') {
    throw new Error('保存报告前需要先暂停当前验证会话')
  }
  if (verifyLogs.length === 0) {
    throw new Error('行为流为空，无法生成验证报告')
  }
  if (!reportName.trim()) {
    throw new Error('报告名称必填')
  }
  const report: VerifyReport = {
    id: createId('report'),
    appId: appContext.appId,
    reportName: reportName.trim(),
    verifySessionId: realtimeSession.id,
    platform: realtimeSession.platform,
    verifyMode: realtimeSession.verifyMode === 'requirement' ? 'requirement' : 'metadata',
    summary: {
      totalEvents: verifyLogs.length,
      successEvents: verifyLogs.filter((log) => ['success', 'manual_success'].includes(log.validationResult)).length,
      failedEvents: verifyLogs.filter((log) => ['failed', 'manual_failed'].includes(log.validationResult)).length,
      manualCorrectedEvents: verifyLogs.filter((log) => log.validationResult.startsWith('manual')).length,
    },
    eventLogs: clone(verifyLogs),
    createdBy: 'Chaoyang Xu',
    createdAt: nowText(),
  }
  verifyReports.unshift(report)
  createAudit('tracking.verifyReport', report.id, 'tracking.verifyReport.create', undefined, report)
  return clone(report)
}

async function listVerifyReports(): Promise<VerifyReport[]> {
  await delay()
  return clone(verifyReports)
}

async function deleteVerifyReport(reportId: string): Promise<void> {
  await delay()
  const before = verifyReports.find((report) => report.id === reportId)
  verifyReports = verifyReports.filter((report) => report.id !== reportId)
  createAudit('tracking.verifyReport', reportId, 'tracking.verifyReport.delete', before, undefined)
}

async function getGovernanceDashboard(): Promise<GovernanceDashboardMetrics> {
  await delay()
  refreshGovernanceUsage()
  return clone(mockGovernanceMetrics)
}

async function toggleIngestionValidationMode(enabled: boolean): Promise<AppContext> {
  await delay()
  const before = clone(appContext)
  appContext = {
    ...appContext,
    sdkSettings: {
      ...appContext.sdkSettings,
      ingestionValidationMode: enabled,
    },
  }
  createAudit('governance.dashboard', appContext.appId, 'governance.ingestionValidationMode.toggle', before, appContext)
  return clone(appContext)
}

async function exportTrackingPlan(): Promise<string> {
  await delay()
  const rows = [
    ['类型', '名称', '展示名', '状态', '数据类型', '描述', '关联事件', '分类', '更新时间'],
    ...events.map((event) => [
      event.isPreset ? '预置事件' : '自定义事件',
      event.eventName,
      event.displayName ?? '',
      event.status,
      '',
      event.description ?? '',
      '',
      eventCategories.find((category) => category.id === event.categoryId)?.name ?? '',
      event.updatedAt,
    ]),
    ...eventProperties.map((property) => [
      property.isPreset ? '预置事件属性' : property.propertyScope === 'event_common_header' ? '事件公共属性' : '事件属性',
      property.propertyName,
      property.displayName ?? '',
      property.status,
      property.dataType,
      property.description ?? '',
      property.associatedEventIds.map((eventId) => events.find((event) => event.id === eventId)?.eventName ?? eventId).join('|'),
      '',
      property.updatedAt,
    ]),
    ...userProperties.map((property) => ['用户属性', property.propertyName, property.displayName ?? '', property.status, property.dataType, property.description ?? '', '', '', property.updatedAt]),
  ]
  createAudit('governance.dashboard', appContext.appId, 'governance.trackingPlan.export', undefined, { rowCount: rows.length - 1 })
  return toCsv(rows)
}

async function listIngestionDetails(): Promise<IngestionDetail[]> {
  await delay()
  return clone(ingestionDetails)
}

async function listErrorLogs(filter?: string | ErrorLogFilter): Promise<ErrorLog[]> {
  await delay()
  const query = typeof filter === 'string' ? { eventName: filter } : filter ?? {}
  return clone(
    errorLogs.filter((log) => {
      if (query.eventName && log.eventName !== query.eventName) {
        return false
      }
      if (query.errorType && query.errorType !== 'all' && log.errorType !== query.errorType) {
        return false
      }
      if (query.errorCode && !log.errorCode.includes(query.errorCode.trim())) {
        return false
      }
      return true
    }).slice(0, 10),
  )
}

async function exportErrorLogs(filter?: string | ErrorLogFilter): Promise<string> {
  const logs = await listErrorLogs(filter)
  return toCsv([
    ['事件名称', '错误类型', '错误码', '错误说明', '原始数据', '接收时间'],
    ...logs.map((log) => [log.eventName, log.errorType, log.errorCode, log.message, log.rawPayload, log.receivedAt]),
  ])
}

async function createIngestionMonitor(payload: CreateMonitorPayload): Promise<AlertRecord> {
  await delay()
  if (!payload.monitorName.trim()) {
    throw new Error('监控名称必填')
  }
  if (payload.channels.length === 0) {
    throw new Error('告警渠道至少选择一个')
  }
  if (payload.recipients.length === 0 && payload.channels.includes('email')) {
    throw new Error('邮箱告警需要收件人')
  }
  const alert: AlertRecord = {
    id: createId('alert'),
    appId: appContext.appId,
    source: 'ingestion_detail_monitor',
    monitorName: payload.monitorName.trim(),
    objectType: payload.objectType,
    targetName: payload.targetName.trim(),
    alertCount: 0,
    abnormalDataCount: 0,
    status: 'enabled',
    createdAt: nowText(),
    channels: payload.channels,
    recipients: payload.recipients,
    webhook: payload.webhook,
  }
  alerts.unshift(alert)
  createAudit('governance.alert', alert.id, 'governance.monitor.create', undefined, alert)
  return clone(alert)
}

async function listValidationRules(): Promise<ValidationRule[]> {
  await delay()
  return clone(validationRules)
}

async function createValidationRule(payload: CreateRulePayload): Promise<ValidationRule> {
  await delay()
  if (!payload.ruleName.trim() || !payload.targetName.trim()) {
    throw new Error('规则名称和校验对象必填')
  }
  if (payload.conditions.length === 0 || payload.conditions.some((condition) => !condition.trim())) {
    throw new Error('至少配置一条校验规则')
  }
  if (payload.ruleType === 'event_volume' && (payload.intervalMinutes ?? 0) < 10) {
    throw new Error('事件量校验的最小时间间隔为 10 分钟')
  }
  const rule: ValidationRule = {
    id: createId('rule'),
    ruleName: payload.ruleName.trim(),
    ruleType: payload.ruleType,
    targetName: payload.targetName.trim(),
    conditions: payload.conditions.map((condition) => condition.trim()),
    intervalMinutes: payload.intervalMinutes,
    alertEnabled: payload.alertEnabled,
    interceptEnabled: payload.ruleType === 'event_volume' ? false : payload.interceptEnabled,
    status: 'enabled',
    createdAt: nowText(),
  }
  validationRules.unshift(rule)
  if (rule.alertEnabled) {
    alerts.unshift({
      id: createId('alert'),
      appId: appContext.appId,
      source: 'custom_validation_rule',
      monitorName: rule.ruleName,
      objectType: rule.ruleType,
      alertCount: 0,
      abnormalDataCount: 0,
      status: 'enabled',
      createdAt: nowText(),
      channels: ['email'],
      recipients: ['data-admin@example.com'],
    })
  }
  createAudit('governance.rule', rule.id, 'governance.validationRule.create', undefined, rule)
  return clone(rule)
}

async function updateValidationRuleSettings(ruleId: string, payload: Pick<ValidationRule, 'alertEnabled' | 'interceptEnabled' | 'status'>): Promise<ValidationRule> {
  await delay()
  const index = validationRules.findIndex((rule) => rule.id === ruleId)
  if (index < 0) {
    throw new Error('校验规则不存在')
  }
  const before = clone(validationRules[index])
  validationRules[index] = {
    ...validationRules[index],
    alertEnabled: payload.alertEnabled,
    interceptEnabled: validationRules[index]?.ruleType === 'event_volume' ? false : payload.interceptEnabled,
    status: payload.status,
  } as ValidationRule
  createAudit('governance.rule', ruleId, 'governance.validationRule.updateSettings', before, validationRules[index])
  return clone(validationRules[index] as ValidationRule)
}

async function updateValidationRule(ruleId: string, payload: Partial<Pick<ValidationRule, 'ruleName' | 'alertEnabled' | 'interceptEnabled' | 'status'>>): Promise<ValidationRule> {
  await delay()
  const index = validationRules.findIndex((rule) => rule.id === ruleId)
  if (index < 0) {
    throw new Error('校验规则不存在')
  }
  const before = clone(validationRules[index])
  const current = validationRules[index] as ValidationRule
  const nextName = payload.ruleName?.trim() ?? current.ruleName
  if (!nextName) {
    throw new Error('规则名称必填')
  }
  validationRules[index] = {
    ...current,
    ruleName: nextName,
    alertEnabled: payload.alertEnabled ?? current.alertEnabled,
    interceptEnabled: current.ruleType === 'event_volume' ? false : payload.interceptEnabled ?? current.interceptEnabled,
    status: payload.status ?? current.status,
  }
  createAudit('governance.rule', ruleId, 'governance.validationRule.update', before, validationRules[index])
  return clone(validationRules[index] as ValidationRule)
}

async function deleteValidationRule(ruleId: string): Promise<void> {
  await delay()
  const rule = validationRules.find((item) => item.id === ruleId)
  if (!rule) {
    throw new Error('校验规则不存在')
  }
  if (rule.status !== 'disabled') {
    throw new Error('已关闭规则才支持删除')
  }
  validationRules = validationRules.filter((item) => item.id !== ruleId)
  createAudit('governance.rule', ruleId, 'governance.validationRule.delete', rule, undefined)
}

async function listAlerts(): Promise<AlertRecord[]> {
  await delay()
  return clone(alerts)
}

async function updateAlert(
  alertId: string,
  status: AlertRecord['status'],
  patch?: string[] | Partial<Pick<AlertRecord, 'recipients' | 'channels' | 'webhook'>>,
): Promise<AlertRecord> {
  await delay()
  const index = alerts.findIndex((alert) => alert.id === alertId)
  if (index < 0) {
    throw new Error('告警不存在')
  }
  if (alerts[index]?.source === 'custom_validation_rule') {
    throw new Error('校验规则配置创建的告警仅支持查看，请前往校验规则配置页修改')
  }
  const before = clone(alerts[index])
  const normalizedPatch = Array.isArray(patch) ? { recipients: patch } : patch ?? {}
  alerts[index] = {
    ...alerts[index],
    status,
    recipients: normalizedPatch.recipients ?? alerts[index]?.recipients ?? [],
    channels: normalizedPatch.channels ?? alerts[index]?.channels ?? [],
    webhook: normalizedPatch.webhook ?? alerts[index]?.webhook,
  } as AlertRecord
  createAudit('governance.alert', alertId, 'governance.alert.update', before, alerts[index])
  return clone(alerts[index] as AlertRecord)
}

async function getCostGovernance(): Promise<CostGovernanceSnapshot> {
  await delay()
  return clone(costGovernance)
}

async function disableCostEvents(eventIds: string[], confirmedImpact = false): Promise<void> {
  await delay()
  if (!confirmedImpact) {
    throw new Error('禁用前必须勾选“我已确认禁用影响”')
  }
  const before = clone(events.filter((event) => eventIds.includes(event.id)))
  events = events.map((event) => (eventIds.includes(event.id) ? { ...event, status: 'disabled', updatedAt: nowText() } : event))
  costGovernance = {
    ...costGovernance,
    lowRoiEvents: costGovernance.lowRoiEvents.filter((event) => !eventIds.includes(event.eventId)),
  }
  createAudit('governance.cost', eventIds.join(','), 'governance.cost.disableEvents', before, { eventIds })
}

async function closeAutoTrack(): Promise<AppContext> {
  await delay()
  const before = clone(appContext)
  appContext = {
    ...appContext,
    sdkSettings: {
      ...appContext.sdkSettings,
      autoTrackEnabled: false,
    },
  }
  createAudit('governance.cost', appContext.appId, 'governance.cost.closeAutoTrack', before, appContext)
  return clone(appContext)
}

async function listAuditLogs(): Promise<AuditLog[]> {
  await delay()
  return clone(auditLogs)
}

export const userBehaviorDataService = {
  constants: {
    EVENT_NAME_REGEX,
    PROPERTY_NAME_REGEX,
    VIRTUAL_PROPERTY_REGEX,
    VERSION_REGEX,
  },
  getAppContext,
  getPermissions,
  getPermission,
  getAccessOverview,
  listMetadataTable,
  previewBatchMetadataAction,
  executeBatchMetadataAction,
  updateMetadataDisplayInfo,
  updateMetadataOwnership,
  getMetadataImpactPreview,
  getMetadataAuditTimeline,
  updateSdkSettings,
  validateBehaviorUpload,
  listReportEndpoints,
  getSchemaCatalog,
  listIntegrationTasks,
  testKafkaConnection,
  parseKafkaSample,
  validateCustomUploadConfig,
  createIntegrationTask,
  updateIntegrationTaskStatus,
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  updateEventStatus,
  previewBatchEvents,
  importBatchEvents,
  downloadEventTemplate,
  exportEventDisplayCsv,
  importEventDisplayCsv,
  importEventDisplayRows,
  attachPropertiesToEvent,
  detachPropertyFromEvent,
  deleteEventPropertyFromEvent,
  listPendingEvents,
  approvePendingEvent,
  blacklistPendingEvent,
  listEventProperties,
  exportPropertyDisplayCsv,
  importPropertyDisplayCsv,
  importPropertyDisplayRows,
  createEventProperty,
  listPendingEventProperties,
  approvePendingEventProperty,
  blacklistPendingEventProperty,
  updateEventPropertyStatus,
  changeEventPropertyType,
  listUserProperties,
  createUserProperty,
  listPendingUserProperties,
  approvePendingUserProperty,
  blacklistPendingUserProperty,
  updateUserPropertyStatus,
  changeUserPropertyType,
  listVirtualEvents,
  createVirtualEvent,
  updateVirtualEventStatus,
  deleteVirtualEvent,
  listVirtualProperties,
  validateSqlExpression,
  createVirtualProperty,
  updateVirtualProperty,
  deleteVirtualProperty,
  listVisualEvents,
  getVisualSelectionSession,
  createVisualSelectionSession,
  updateVisualSelectionToolMode,
  createVisualEvent,
  updateVisualEventStatus,
  generateRelationEvents,
  getWebSessionConfig,
  updateWebSessionConfig,
  listCustomSessions,
  createCustomSession,
  updateCustomSessionStatus,
  deleteCustomSession,
  listCategories,
  createCategory,
  updateCategory,
  assignEventToCategory,
  removeEventFromCategory,
  moveCategory,
  deleteCategory,
  getLineage,
  listDictionaries,
  uploadDictionary,
  downloadDictionary,
  previewDictionaryDeleteImpact,
  deleteDictionary,
  getRealtimeSession,
  createRealtimeSession,
  updateRealtimeSessionStatus,
  simulateVerifyLog,
  clearVerifyLogs,
  manualCorrectLog,
  saveVerifyReport,
  listVerifyReports,
  deleteVerifyReport,
  getGovernanceDashboard,
  toggleIngestionValidationMode,
  exportTrackingPlan,
  listIngestionDetails,
  listErrorLogs,
  exportErrorLogs,
  createIngestionMonitor,
  listValidationRules,
  createValidationRule,
  updateValidationRuleSettings,
  updateValidationRule,
  deleteValidationRule,
  listAlerts,
  updateAlert,
  getCostGovernance,
  disableCostEvents,
  closeAutoTrack,
  listAuditLogs,
}
