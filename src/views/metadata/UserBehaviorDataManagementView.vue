<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NAlert,
  NButton,
  NCard,
  NCheckbox,
  NCheckboxGroup,
  NDescriptions,
  NDescriptionsItem,
  NDrawer,
  NDrawerContent,
  NDropdown,
  NEmpty,
  NForm,
  NFormItem,
  NGi,
  NGrid,
  NInput,
  NInputNumber,
  NModal,
  NPagination,
  NRadioButton,
  NRadioGroup,
  NSelect,
  NSpace,
  NStatistic,
  NSwitch,
  NTabPane,
  NTable,
  NTabs,
  NTag,
  useMessage,
} from 'naive-ui'
import type {
  AlertRecord,
  AppContext,
  CostGovernanceSnapshot,
  CustomSession,
  DataIntegrationTask,
  DictionaryFile,
  ErrorLog,
  EventCategory,
  EventMetadata,
  EventPropertyMetadata,
  GovernanceDashboardMetrics,
  IngestionDetail,
  LineageItem,
  MetadataBatchAction,
  MetadataBatchPreview,
  MetadataDisplayImportResult,
  MetadataDisplayImportRow,
  MetadataImpactPreview,
  MetadataManagementKind,
  MetadataSensitiveLevel,
  MetadataStatus,
  MetadataTableRow,
  PendingEvent,
  PendingEventProperty,
  PendingUserProperty,
  Permission,
  Platform,
  PropertyDataType,
  RecentIngestionHealth,
  RealtimeVerifySession,
  ReportEndpoint,
  SqlValidationResult,
  UploadValidationResult,
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
import { userBehaviorDataService } from '@/services/userBehaviorDataService'

type DataManagementPage =
  | 'access-overview'
  | 'report-url'
  | 'schema'
  | 'visual-integration'
  | 'events'
  | 'event-properties'
  | 'user-properties'
  | 'virtual-events'
  | 'virtual-properties'
  | 'visual-events'
  | 'passive-relation-events'
  | 'session'
  | 'custom-session'
  | 'event-categories'
  | 'dimension-dictionary'
  | 'lineage'
  | 'realtime-verify'
  | 'reports'
  | 'governance-dashboard'
  | 'ingestion-detail'
  | 'rules'
  | 'alerts'
  | 'cost'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const loading = ref(false)

const appContext = ref<AppContext | null>(null)
const permissions = ref<Permission[]>([])
const sdkVersions = ref<Array<Record<string, string>>>([])
const recentHealth = ref<RecentIngestionHealth>({
  receivedEventCount: 0,
  interceptedEventCount: 0,
  abnormalPropertyCount: 0,
  delayRate: 0,
  healthyScore: 0,
})
const endpoints = ref<ReportEndpoint[]>([])
const events = ref<EventMetadata[]>([])
const pendingEvents = ref<PendingEvent[]>([])
const pendingEventProperties = ref<PendingEventProperty[]>([])
const pendingUserProperties = ref<PendingUserProperty[]>([])
const selectedPendingEventIds = ref<string[]>([])
const selectedPendingEventPropertyIds = ref<string[]>([])
const selectedPendingUserPropertyIds = ref<string[]>([])
const eventProperties = ref<EventPropertyMetadata[]>([])
const userProperties = ref<UserPropertyMetadata[]>([])
const virtualEvents = ref<VirtualEvent[]>([])
const virtualProperties = ref<VirtualProperty[]>([])
const visualEvents = ref<VisualEvent[]>([])
const visualSelectionSession = ref<VisualSelectionSession | null>(null)
const integrationTasks = ref<DataIntegrationTask[]>([])
const webSessionConfig = ref<WebSessionConfig | null>(null)
const customSessions = ref<CustomSession[]>([])
const categories = ref<EventCategory[]>([])
const dictionaries = ref<DictionaryFile[]>([])
const realtimeSession = ref<RealtimeVerifySession | null>(null)
const verifyLogs = ref<VerifyEventLog[]>([])
const verifyReports = ref<VerifyReport[]>([])
const governanceMetrics = ref<GovernanceDashboardMetrics | null>(null)
const ingestionDetails = ref<IngestionDetail[]>([])
const errorLogs = ref<ErrorLog[]>([])
const validationRules = ref<ValidationRule[]>([])
const alerts = ref<AlertRecord[]>([])
const costGovernance = ref<CostGovernanceSnapshot | null>(null)
const lineageItems = ref<LineageItem[]>([])
const schemaCatalog = ref<Awaited<ReturnType<typeof userBehaviorDataService.getSchemaCatalog>> | null>(null)
const sqlValidation = ref<SqlValidationResult | null>(null)
const uploadValidationResult = ref<UploadValidationResult | null>(null)
const metadataRows = ref<MetadataTableRow[]>([])
const metadataTotal = ref(0)
const selectedMetadataIds = ref<string[]>([])
const metadataImpactPreview = ref<MetadataImpactPreview | null>(null)
const metadataBatchPreview = ref<MetadataBatchPreview | null>(null)
const metadataAuditTimeline = ref<Awaited<ReturnType<typeof userBehaviorDataService.getMetadataAuditTimeline>>>([])

const selectedEvent = ref<EventMetadata | null>(null)
const selectedMetadata = ref<MetadataTableRow | null>(null)
const selectedErrorsEvent = ref('')
const selectedVirtualPropertyId = ref('')
const showEventDrawer = ref(false)
const showMetadataDrawer = ref(false)
const showBatchEditModal = ref(false)
const showErrorsDrawer = ref(false)
const showEventModal = ref(false)
const showEventEditModal = ref(false)
const showBatchModal = ref(false)
const showPropertyModal = ref(false)
const showUserPropertyModal = ref(false)
const showVirtualEventModal = ref(false)
const showVirtualPropertyModal = ref(false)
const showVirtualPropertyEditModal = ref(false)
const showVisualEventModal = ref(false)
const showCustomSessionModal = ref(false)
const showCategoryModal = ref(false)
const showDictionaryModal = ref(false)
const showMonitorModal = ref(false)
const showRuleModal = ref(false)
const showRuleEditModal = ref(false)
const showDictionaryImpactDrawer = ref(false)
const showReportDrawer = ref(false)
const showAlertDrawer = ref(false)
const showAlertEditModal = ref(false)
const showCostImpactDrawer = ref(false)

const endpointFilter = reactive({
  environmentType: 'saas_cloud_native',
  region: 'cn_beijing',
  platforms: [] as Platform[],
  platformGroup: 'all' as 'all' | 'client' | 'server' | 'http_api',
  customDomain: 'https://collector.private.example.com',
})

const eventFilter = reactive({
  keyword: '',
  debouncedKeyword: '',
  status: 'all',
  sourceType: 'all',
  categoryId: 'all',
  isPreset: 'all',
  hasScreenshot: 'all',
  queried30d: 'all',
})

const propertyFilter = reactive({
  keyword: '',
  status: 'all',
  dataType: 'all',
  scope: 'all',
  emptyInfoOnly: false,
})

const metadataTableState = reactive({
  page: 1,
  pageSize: 10,
  sortBy: 'updatedAt' as 'name' | 'displayName' | 'status' | 'owner' | 'updatedAt' | 'recent30dQueryCount' | 'yesterdayIngestCount',
  sortOrder: 'desc' as 'asc' | 'desc',
  visibleColumns: [
    'selection',
    'name',
    'displayName',
    'status',
    'owner',
    'tags',
    'reportingPlatforms',
    'hasIngestedData',
    'registrationSource',
    'recent30dQueryCount',
    'yesterdayIngestCount',
    'updatedAt',
    'actions',
  ],
})
const batchAction = ref<MetadataBatchAction>('hide')
const batchEditForm = reactive({
  displayNamePrefix: '',
  description: '',
  categoryId: '',
  owner: '数据管理员',
  tagsText: '核心埋点',
  unit: '',
  businessDefinition: '',
  sensitiveLevel: 'internal' as MetadataSensitiveLevel,
})
const metadataEditForm = reactive({
  displayName: '',
  description: '',
  categoryId: '',
  owner: '',
  tagsText: '',
  unit: '',
  businessDefinition: '',
  sensitiveLevel: 'internal' as MetadataSensitiveLevel,
})

const eventForm = reactive({
  eventName: '',
  displayName: '',
  categoryId: '',
  description: '',
  associatedPropertyIds: [] as string[],
})
const eventEditForm = reactive({
  eventId: '',
  displayName: '',
  categoryId: '',
  description: '',
})
const eventPropertyAttachForm = reactive({
  propertyIds: [] as string[],
})
type DisplayImportSummary = MetadataDisplayImportResult & { fileName: string }
const eventPropertyDisplayImportInput = ref<HTMLInputElement | null>(null)
const userPropertyDisplayImportInput = ref<HTMLInputElement | null>(null)
const eventPropertyDisplayImportSummary = ref<DisplayImportSummary | null>(null)
const userPropertyDisplayImportSummary = ref<DisplayImportSummary | null>(null)
const batchEventExcelInput = ref<HTMLInputElement | null>(null)

const batchForm = reactive({
  source: 'excel' as 'excel' | 'manual',
  text: 'event_name,展示名,描述\ncheckout_start,发起结算,点击结算按钮时上报',
  mode: 'skip' as 'skip' | 'overwrite',
  fileName: '',
  rowCount: 0,
})
const batchPreviewRows = ref<Array<{ rowNumber: number, eventName: string, errorType: string, message: string }>>([])
const batchPreviewTotal = ref(0)

const propertyForm = reactive({
  propertyName: '',
  displayName: '',
  description: '',
  dataType: 'string' as PropertyDataType,
  propertyScope: 'event_param' as EventPropertyMetadata['propertyScope'],
  associatedEventIds: [] as string[],
})
const drawerEventPropertyAttachForm = reactive({
  propertyIds: [] as string[],
})

const userPropertyForm = reactive({
  propertyName: '',
  displayName: '',
  description: '',
  dataType: 'string' as PropertyDataType,
  calculationLogic: 'latest_value' as UserPropertyMetadata['calculationLogic'],
})

const typeChangeForm = reactive({
  targetKind: 'event' as 'event' | 'user',
  targetId: '',
  dataType: 'string' as PropertyDataType,
  confirmed: false,
})

const integrationForm = reactive({
  taskName: '新 Kafka 行为数据同步',
  description: '通过可视化映射同步 UBA 行为数据。',
  sourceType: 'uba_event_data' as DataIntegrationTask['sourceType'],
  configMode: 'visual_mapping' as DataIntegrationTask['configMode'],
  consumerGroup: 'uba-growth-demo',
  bootstrapServers: 'kafka-01.example.com:9092\nkafka-02.example.com:9092',
  topic: 'uba_event_log',
  authType: 'none' as NonNullable<DataIntegrationTask['kafkaConfig']>['authType'],
  username: '',
  password: '',
  mappingText:
    '$.event,events[].event,event,string,true\n$.ts,events[].local_time_ms,event,int,true\n$.uid,user.user_unique_id,user,string,true\n$.params.product_id,events[].params.product_id,event_param,string,false',
  customConfigText: JSON.stringify({
    kafkaConfig: {
      consumerGroup: 'uba-growth-demo',
      bootstrapServers: ['kafka-01.example.com:9092'],
      topic: 'uba_event_log',
      authType: 'none',
    },
    fieldMappings: [
      { sourceField: '$.event', targetField: 'events[].event', targetType: 'event', dataType: 'string', required: true },
      { sourceField: '$.ts', targetField: 'events[].local_time_ms', targetType: 'event', dataType: 'int', required: true },
      { sourceField: '$.uid', targetField: 'user.user_unique_id', targetType: 'user', dataType: 'string', required: true },
    ],
  }, null, 2),
})
const integrationConnectionMessage = ref('')
const kafkaFields = ref<string[]>([])
const kafkaPreview = ref('')

const virtualEventForm = reactive({
  eventName: '',
  displayName: '',
  description: '',
  componentEventIds: [] as string[],
  filterField: '',
  filterValue: '',
})

const virtualPropertyForm = reactive({
  propertyType: 'event_virtual_property' as VirtualProperty['propertyType'],
  propertyName: '',
  displayName: '',
  description: '',
  dataType: 'string' as VirtualProperty['dataType'],
  sqlExpression: 'domain(event_params.full_url)',
  associationMode: 'any_referenced_property_has_value' as NonNullable<VirtualProperty['associationMode']>,
})
const virtualPropertyEditForm = reactive({
  propertyType: 'event_virtual_property' as VirtualProperty['propertyType'],
  displayName: '',
  description: '',
  dataType: 'string' as VirtualProperty['dataType'],
  sqlExpression: '',
  associationMode: 'any_referenced_property_has_value' as NonNullable<VirtualProperty['associationMode']>,
  confirmedDictionaryDelete: false,
})

const visualEventForm = reactive({
  eventName: '',
  description: '',
  platform: 'web' as VisualEvent['platform'],
  pageName: '首页',
  pageRule: 'https://www.example.com/home?*',
  elementName: '#primary-button',
})
const visualSelectionForm = reactive({
  platform: 'web' as VisualEvent['platform'],
  targetUrl: 'https://www.example.com/home',
  toolMode: 'select' as VisualSelectionSession['toolMode'],
  highlightDefined: false,
})

const uploadPayloadText = ref(JSON.stringify({
  header: {
    app_id: 'app_2026_growth',
    $os: 'iOS',
  },
  user: {
    user_unique_id: 'uid_900001',
    vip_level: 'A',
  },
  events: [
    {
      event: 'pay_success',
      local_time_ms: Date.now(),
      params: {
        order_amount: 99.9,
        pay_channel: 'wechat',
        product_id: 'sku_1001',
      },
    },
  ],
}, null, 2))

const relationForm = reactive({
  activeEventName: 'subscribe',
  targetUuidText: 'uuid_1001\nuuid_1002\nuuid_1003',
  resultText: '',
})

const sessionInterval = ref(30)
const customSessionForm = reactive({
  sessionName: '',
  displayName: '',
  description: '',
  platformScope: ['web_js'] as Platform[],
  eventIds: [] as string[],
  cutRuleType: 'time_gap' as CustomSession['cutRule']['type'],
  gapMinutes: 30,
  startEventId: '',
  endEventId: '',
})

const categoryForm = reactive({
  id: '',
  name: '',
  scope: 'public' as EventCategory['scope'],
  description: '',
  isDefault: false,
})
const assignCategoryForm = reactive({
  eventId: '',
  categoryId: '',
})
const categoryModalMode = ref<'create' | 'edit'>('create')

const dictionaryForm = reactive({
  propertyKind: 'event' as DictionaryFile['propertyKind'],
  propertyId: '',
  fileName: 'dictionary.csv',
  content: 'wechat,微信支付\nalipay,支付宝',
  confirmedImpact: false,
})
const dictionaryUploadInput = ref<HTMLInputElement | null>(null)
const dictionaryImpactItems = ref<LineageItem[]>([])
const selectedDictionary = ref<DictionaryFile | null>(null)

const lineageForm = reactive({
  objectType: 'event' as LineageItem['objectType'],
  objectId: '',
})

const realtimeForm = reactive({
  platform: 'web_js' as RealtimeVerifySession['platform'],
  verifyMode: 'metadata' as RealtimeVerifySession['verifyMode'],
  targetUrl: 'https://www.example.com/home',
  userUniqueId: 'uid_900001',
  simulateEventName: 'product_view',
  reportName: '本次埋点验证报告',
  manualRemark: '人工复核通过',
})
const selectedVerifyLogId = ref('')

const monitorForm = reactive({
  monitorName: '',
  objectType: 'event' as AlertRecord['objectType'],
  targetName: '',
  channels: ['email'] as AlertRecord['channels'],
  recipients: 'data-admin@example.com',
  webhook: '',
})
const errorFilter = reactive({
  errorType: 'all' as ErrorLog['errorType'] | 'all',
  errorCode: '',
})

const ruleForm = reactive({
  ruleName: '',
  ruleType: 'event_property' as ValidationRule['ruleType'],
  targetName: '',
  conditions: '必传校验：属性未上传或 value 为 null',
  intervalMinutes: 10,
  alertEnabled: true,
  interceptEnabled: true,
})
const selectedRule = ref<ValidationRule | null>(null)
const ruleEditForm = reactive({
  ruleName: '',
  alertEnabled: true,
  interceptEnabled: true,
  status: 'enabled' as ValidationRule['status'],
})

const costConfirm = reactive({
  confirmed: false,
  selectedEventIds: [] as string[],
})
const costSortBy = ref<'costEstimate' | 'ingestCount30d' | 'queryCount30d' | 'roiScore'>('costEstimate')
const costImpactPreview = ref<MetadataImpactPreview | null>(null)
const selectedReport = ref<VerifyReport | null>(null)
const reportFilter = reactive({
  keyword: '',
  platform: 'all' as RealtimeVerifySession['platform'] | 'all',
  verifyMode: 'all' as VerifyReport['verifyMode'] | 'all',
})
const selectedAlert = ref<AlertRecord | null>(null)
const alertEditForm = reactive({
  recipients: '',
  channels: ['email'] as AlertRecord['channels'],
  webhook: '',
})

const routePageMap: Array<{ path: string, key: DataManagementPage, title: string, group: string }> = [
  { path: '/data-management/access/overview', key: 'access-overview', title: '接入概览', group: '数据接入' },
  { path: '/data-management/access/report-url', key: 'report-url', title: '数据上报地址', group: '数据接入' },
  { path: '/data-management/access/schema', key: 'schema', title: '数据格式与事件属性分类', group: '数据接入' },
  { path: '/data-management/access/visual-integration', key: 'visual-integration', title: '可视化数据集成', group: '数据接入' },
  { path: '/data-management/metadata/events', key: 'events', title: '一般事件', group: '元数据管理' },
  { path: '/data-management/metadata/event-properties', key: 'event-properties', title: '事件属性', group: '元数据管理' },
  { path: '/data-management/metadata/user-properties', key: 'user-properties', title: '用户属性', group: '元数据管理' },
  { path: '/data-management/metadata/virtual-events', key: 'virtual-events', title: '虚拟事件', group: '元数据管理' },
  { path: '/data-management/metadata/virtual-properties', key: 'virtual-properties', title: '虚拟属性', group: '元数据管理' },
  { path: '/data-management/metadata/visual-events', key: 'visual-events', title: '圈选事件', group: '元数据管理' },
  { path: '/data-management/metadata/passive-relation-events', key: 'passive-relation-events', title: '被动和关系事件', group: '元数据管理' },
  { path: '/data-management/metadata/session', key: 'session', title: '会话管理', group: '元数据管理' },
  { path: '/data-management/metadata/custom-session', key: 'custom-session', title: '自定义 Session', group: '元数据管理' },
  { path: '/data-management/efficiency/event-categories', key: 'event-categories', title: '事件分类', group: '分类管理功能' },
  { path: '/data-management/efficiency/dimension-dictionary', key: 'dimension-dictionary', title: '维度字典', group: '分类管理功能' },
  { path: '/data-management/efficiency/lineage', key: 'lineage', title: '埋点血缘', group: '分类管理功能' },
  { path: '/data-management/tracking/realtime-verify', key: 'realtime-verify', title: '埋点实时验证', group: '埋点验证' },
  { path: '/data-management/tracking/reports', key: 'reports', title: '验证报告', group: '埋点验证' },
  { path: '/data-management/governance/dashboard', key: 'governance-dashboard', title: '数据治理看板', group: '数据治理' },
  { path: '/data-management/governance/ingestion-detail', key: 'ingestion-detail', title: '数据入库明细', group: '数据治理' },
  { path: '/data-management/governance/rules', key: 'rules', title: '校验规则配置', group: '数据治理' },
  { path: '/data-management/governance/alerts', key: 'alerts', title: '告警管理', group: '数据治理' },
  { path: '/data-management/governance/cost', key: 'cost', title: '成本治理分析', group: '数据治理' },
]

const currentRouteConfig = computed(() => routePageMap.find((item) => item.path === route.path) ?? routePageMap[0])
const pageKey = computed<DataManagementPage>(() => currentRouteConfig.value?.key ?? 'access-overview')
const pageTitle = computed(() => currentRouteConfig.value?.title ?? '接入概览')
const coreMetadataKind = computed<MetadataManagementKind | null>(() => {
  if (pageKey.value === 'events') {
    return 'event'
  }
  if (pageKey.value === 'event-properties') {
    return 'event_property'
  }
  if (pageKey.value === 'user-properties') {
    return 'user_property'
  }
  if (pageKey.value === 'virtual-events') {
    return 'virtual_event'
  }
  if (pageKey.value === 'virtual-properties') {
    return 'virtual_property'
  }
  if (pageKey.value === 'visual-events') {
    return 'visual_event'
  }
  if (pageKey.value === 'passive-relation-events') {
    return 'relation_event'
  }
  if (pageKey.value === 'custom-session') {
    return 'custom_session'
  }
  return null
})
const groupedRoutes = computed(() => {
  const groups = new Map<string, typeof routePageMap>()
  routePageMap.forEach((item) => {
    groups.set(item.group, [...(groups.get(item.group) ?? []), item])
  })
  return [...groups.entries()].map(([group, pages]) => ({ group, pages }))
})

const platformOptions = [
  { label: 'Android', value: 'android' },
  { label: 'iOS', value: 'ios' },
  { label: 'HarmonyOS', value: 'harmonyos' },
  { label: 'Web JS', value: 'web_js' },
  { label: '微信小程序', value: 'wechat_mp' },
  { label: '服务端 Java', value: 'server_java' },
  { label: 'HTTP API', value: 'http_api' },
]

const dataTypeOptions = ['int', 'float', 'string', 'datetime', 'list', 'version'].map((value) => ({ label: value, value }))
const virtualDataTypeOptions = ['int', 'float', 'string', 'datetime', 'list'].map((value) => ({ label: value, value }))
const statusOptions = [
  { label: '全部状态', value: 'all' },
  { label: '启用', value: 'enabled' },
  { label: '禁用', value: 'disabled' },
  { label: '隐藏', value: 'hidden' },
  { label: '待验收', value: 'pending_approval' },
  { label: '黑名单', value: 'blacklist' },
  { label: '超限', value: 'over_limit' },
]
const metadataColumnOptions = [
  { label: '选择', value: 'selection' },
  { label: '名称', value: 'name' },
  { label: '展示名', value: 'displayName' },
  { label: '状态', value: 'status' },
  { label: '负责人', value: 'owner' },
  { label: '标签', value: 'tags' },
  { label: '上报平台', value: 'reportingPlatforms' },
  { label: '是否有数据', value: 'hasIngestedData' },
  { label: '登记来源', value: 'registrationSource' },
  { label: '30 天查询', value: 'recent30dQueryCount' },
  { label: '昨日入库', value: 'yesterdayIngestCount' },
  { label: '更新时间', value: 'updatedAt' },
  { label: '操作', value: 'actions' },
]
const metadataSortOptions = [
  { label: '更新时间', value: 'updatedAt' },
  { label: '名称', value: 'name' },
  { label: '展示名', value: 'displayName' },
  { label: '状态', value: 'status' },
  { label: '负责人', value: 'owner' },
  { label: '30 天查询', value: 'recent30dQueryCount' },
  { label: '昨日入库', value: 'yesterdayIngestCount' },
]
const sensitiveLevelOptions = [
  { label: '公开', value: 'public' },
  { label: '内部', value: 'internal' },
  { label: '敏感', value: 'sensitive' },
  { label: '受限', value: 'restricted' },
]

const eventSelectOptions = computed(() => events.value.map((event) => ({ label: `${event.displayName || event.eventName} (${event.eventName})`, value: event.id })))
const eventNameOptions = computed(() => events.value.map((event) => ({ label: event.eventName, value: event.eventName })))
const attachablePropertyOptions = computed(() => {
  const currentIds = selectedEvent.value?.associatedPropertyIds ?? []
  return eventProperties.value
    .filter((property) => property.propertyScope === 'event_param' && !property.isPreset && !currentIds.includes(property.id))
    .map((property) => ({ label: `${property.displayName || property.propertyName} (${property.propertyName})`, value: property.id }))
})
const metadataDrawerEventProperties = computed(() => {
  if (selectedMetadata.value?.kind !== 'event') {
    return []
  }
  const eventId = selectedMetadata.value.id
  return eventProperties.value
    .filter((property) => property.propertyScope === 'event_common_header' || property.associatedEventIds.includes(eventId))
    .sort((a, b) => {
      if (a.propertyScope !== b.propertyScope) {
        return a.propertyScope === 'event_param' ? -1 : 1
      }
      return a.propertyName.localeCompare(b.propertyName)
    })
})
const metadataDrawerCustomPropertyCount = computed(() => metadataDrawerEventProperties.value.filter((property) => property.propertyScope === 'event_param').length)
const metadataDrawerCommonPropertyCount = computed(() => metadataDrawerEventProperties.value.filter((property) => property.propertyScope === 'event_common_header').length)
const metadataDrawerAttachablePropertyOptions = computed(() => {
  if (selectedMetadata.value?.kind !== 'event') {
    return []
  }
  const eventId = selectedMetadata.value.id
  return eventProperties.value
    .map((property) => {
      const alreadyInEvent = property.propertyScope === 'event_common_header' || property.associatedEventIds.includes(eventId)
      return {
        label: `${eventPropertyScopeText(property)} / ${property.displayName || property.propertyName} (${property.propertyName})`,
        value: property.id,
        disabled: alreadyInEvent || (property.propertyScope === 'event_param' && property.isPreset),
      }
    })
    .sort((a, b) => Number(a.disabled) - Number(b.disabled) || a.label.localeCompare(b.label))
})
const categoryOptions = computed(() => [
  { label: '不选择分类', value: '' },
  ...categories.value.map((category) => ({ label: `${category.scope === 'public' ? '公共' : '私人'} / ${category.name}`, value: category.id })),
])
const propertySelectOptions = computed(() => [
  ...eventProperties.value.map((property) => ({ label: `事件属性 / ${property.displayName || property.propertyName}`, value: `event:${property.id}` })),
  ...userProperties.value.map((property) => ({ label: `用户属性 / ${property.displayName || property.propertyName}`, value: `user:${property.id}` })),
])
const dictionaryPropertyOptions = computed(() => {
  const base =
    dictionaryForm.propertyKind === 'event'
      ? eventProperties.value.filter((property) => !property.isPreset || ['string', 'int', 'float', 'version'].includes(property.dataType))
      : userProperties.value.filter((property) => !property.isPreset || ['string', 'int', 'float', 'version'].includes(property.dataType))
  return base.map((property) => ({ label: `${property.displayName || property.propertyName} (${property.dataType})`, value: property.id }))
})
const uncategorizedEvents = computed(() => events.value.filter((event) => !event.categoryId))
const publicCategories = computed(() => categories.value.filter((category) => category.scope === 'public'))
const privateCategories = computed(() => categories.value.filter((category) => category.scope === 'private'))
const dictionaryPropertyMap = computed(() => {
  const map = new Map<string, string>()
  eventProperties.value.forEach((property) => map.set(property.id, `${property.displayName || property.propertyName} / ${property.propertyName}`))
  userProperties.value.forEach((property) => map.set(property.id, `${property.displayName || property.propertyName} / ${property.propertyName}`))
  virtualProperties.value.forEach((property) => map.set(property.id, `${property.displayName || property.propertyName} / ${property.propertyName}`))
  return map
})
const filteredVerifyReports = computed(() =>
  verifyReports.value.filter((report) => {
    const keyword = reportFilter.keyword.trim().toLowerCase()
    if (keyword && !`${report.reportName} ${report.createdBy}`.toLowerCase().includes(keyword)) {
      return false
    }
    if (reportFilter.platform !== 'all' && report.platform !== reportFilter.platform) {
      return false
    }
    if (reportFilter.verifyMode !== 'all' && report.verifyMode !== reportFilter.verifyMode) {
      return false
    }
    return true
  }),
)
const sortedCostEvents = computed(() =>
  [...(costGovernance.value?.lowRoiEvents ?? [])].sort((a, b) => Number(b[costSortBy.value]) - Number(a[costSortBy.value])),
)
const verifyStats = computed(() => ({
  success: verifyLogs.value.filter((log) => ['success', 'manual_success'].includes(log.validationResult)).length,
  failed: verifyLogs.value.filter((log) => ['failed', 'manual_failed'].includes(log.validationResult)).length,
  pending: verifyLogs.value.filter((log) => log.validationResult === 'pending').length,
  total: verifyLogs.value.length,
}))
const selectedVerifyLog = computed(() => verifyLogs.value.find((log) => log.id === selectedVerifyLogId.value) ?? verifyLogs.value[0])
const verifyCanSaveReport = computed(() => Boolean(realtimeSession.value && realtimeSession.value.status === 'paused' && realtimeSession.value.verifyMode !== 'quick' && verifyLogs.value.length))
const verifySaveHint = computed(() => {
  if (realtimeSession.value?.verifyMode === 'quick') {
    return '快速验证仅用于联调，不生成报告。'
  }
  if (!verifyLogs.value.length) {
    return '行为流为空，先触发事件后再保存报告。'
  }
  if (realtimeSession.value?.status !== 'paused') {
    return '保存报告前需要先暂停当前验证会话。'
  }
  return '可保存报告；保存前可先对失败事件做人工校准。'
})
const verifyScopeCards = computed(() => [
  {
    key: 'quick',
    title: '快速验证',
    description: '接收全部测试事件，适合快速联调 SDK 和上报链路。',
  },
  {
    key: 'metadata',
    title: '按元数据',
    description: '仅校验已登记事件和属性，未登记数据会进入失败或待验收。',
  },
  {
    key: 'requirement',
    title: '按需求',
    description: '按埋点需求范围校验，适合发版前验收和报告沉淀。',
  },
])
const realtimePlatformChecks = computed(() => {
  const sessionReady = Boolean(realtimeSession.value)
  const connected = ['connected', 'verifying', 'paused'].includes(realtimeSession.value?.status ?? '')
  const shared = [
    { label: '验证会话', ok: sessionReady, detail: sessionReady ? realtimeSession.value?.id ?? '' : '待生成连接' },
    { label: '连接状态', ok: connected, detail: statusText(realtimeSession.value?.status ?? 'created') },
  ]
  if (realtimeForm.platform === 'web_js') {
    return [
      ...shared,
      { label: 'SDK 版本', ok: true, detail: 'Web JS >= 5.1.2' },
      { label: '验证链接', ok: Boolean(realtimeSession.value?.testUrl), detail: realtimeSession.value?.testUrl ? '已生成' : '待生成' },
    ]
  }
  if (realtimeForm.platform === 'server_java') {
    return [
      ...shared,
      { label: 'SDK 类型', ok: true, detail: 'Server Java' },
      { label: '测试用户', ok: Boolean(realtimeForm.userUniqueId), detail: realtimeForm.userUniqueId || '待填写' },
    ]
  }
  if (realtimeForm.platform === 'wechat_mp') {
    return [
      ...shared,
      { label: '小程序代码', ok: true, detail: '已上传测试包' },
      { label: '合法域名', ok: Boolean(realtimeForm.targetUrl), detail: realtimeForm.targetUrl ? '已配置' : '待配置' },
    ]
  }
  return [
    ...shared,
    { label: 'App 信息', ok: true, detail: 'app_id / scheme 已匹配' },
    { label: '截图能力', ok: Boolean(appContext.value?.sdkSettings.screenshotCaptureEnabled), detail: appContext.value?.sdkSettings.screenshotCaptureEnabled ? '已开启' : '未开启' },
  ]
})
const realtimeConnectionCards = computed(() => {
  if (realtimeForm.platform === 'server_java') {
    return [
      { title: '复制测试 URL', detail: realtimeSession.value?.testUrl || '生成连接后可复制到 SDK 初始化参数' },
      { title: '触发服务端事件', detail: `使用 ${realtimeForm.userUniqueId || '测试 user_unique_id'} 触发接口` },
    ]
  }
  if (realtimeForm.platform === 'web_js') {
    return [
      { title: '打开测试链接', detail: realtimeSession.value?.testUrl || '生成连接后打开测试链接' },
      { title: '浏览器行为流', detail: '页面点击、曝光和自定义事件会进入左侧行为流' },
    ]
  }
  if (realtimeForm.platform === 'wechat_mp') {
    return [
      { title: '扫码设备', detail: '如多台设备扫码，会按设备维度建立验证连接' },
      { title: '调试参数', detail: '生成连接后注入小程序调试参数并开始检测' },
    ]
  }
  return [
    { title: '扫码连接 App', detail: '确认 App 名称、app_id、scheme 和 SDK 版本后扫码' },
    { title: '触发 App 行为', detail: '事件会实时进入行为流，Android 可展示截图标记' },
  ]
})
const lineageObjectOptions = computed(() => {
  if (lineageForm.objectType === 'event') {
    return eventSelectOptions.value
  }
  if (lineageForm.objectType === 'event_property') {
    return eventProperties.value.map((property) => ({ label: property.displayName || property.propertyName, value: property.id }))
  }
  if (lineageForm.objectType === 'user_property') {
    return userProperties.value.map((property) => ({ label: property.displayName || property.propertyName, value: property.id }))
  }
  return dictionaries.value.flatMap((dictionary) => dictionary.previewRows.map((row) => ({ label: `${dictionary.fileName} / ${row.rawValue}`, value: `${dictionary.propertyId}:${row.rawValue}` })))
})

const eventSummaryCards = computed(() => [
  { label: '一般事件', value: events.value.length },
  { label: '事件属性', value: eventProperties.value.length },
  { label: '用户属性', value: userProperties.value.length },
  { label: '待验收元数据', value: pendingEvents.value.length + pendingEventProperties.value.length + pendingUserProperties.value.length },
])

let eventSearchTimer: number | undefined

watch(
  () => eventFilter.keyword,
  (keyword) => {
    if (eventSearchTimer) {
      window.clearTimeout(eventSearchTimer)
    }
    eventSearchTimer = window.setTimeout(() => {
      eventFilter.debouncedKeyword = keyword
      void refreshEvents()
    }, 300)
  },
)

watch(
  () => route.path,
  () => {
    selectedMetadataIds.value = []
    metadataBatchPreview.value = null
    metadataImpactPreview.value = null
    metadataTableState.page = 1
    void refreshRouteData()
  },
)

watch(
  () => [metadataTableState.page, metadataTableState.pageSize, metadataTableState.sortBy, metadataTableState.sortOrder],
  () => {
    void refreshMetadataTable()
  },
)

function statusText(status: string): string {
  const map: Record<string, string> = {
    enabled: '启用',
    disabled: '禁用',
    hidden: '隐藏',
    pending_approval: '待验收',
    blacklist: '黑名单',
    over_limit: '超限',
    valid: '有效',
    invalid: '失效',
    deleted: '已删除',
    created: '待连接',
    connected: '已连接',
    verifying: '验证中',
    ended: '已结束',
    expired: '已过期',
    running: '运行中',
    paused: '暂停',
    success: '通过',
    failed: '失败',
    manual_success: '人工通过',
    manual_failed: '人工失败',
    completed: '完成',
    draft: '草稿',
    testing: '测试中',
    processing: '处理中',
    effective: '已生效',
    uploaded: '已上传',
    none: '无',
  }
  return map[status] ?? status
}

function tagType(status: string): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (['enabled', 'running', 'valid', 'effective', 'success'].includes(status)) {
    return 'success'
  }
  if (['disabled', 'failed', 'invalid', 'blacklist', 'manual_failed'].includes(status)) {
    return 'error'
  }
  if (['hidden', 'pending_approval', 'processing', 'testing', 'paused', 'pending'].includes(status)) {
    return 'warning'
  }
  return 'default'
}

function formatPercent(value?: number): string {
  return `${(((value ?? 0) as number) * 100).toFixed(2)}%`
}

function formatNumber(value?: number): string {
  return Number(value ?? 0).toLocaleString()
}

function eventNamesByIds(ids: string[]): string {
  return ids.map((id) => events.value.find((event) => event.id === id)?.eventName || id).join('、') || '-'
}

function dictionaryPropertyText(propertyId: string): string {
  return dictionaryPropertyMap.value.get(propertyId) ?? propertyId
}

function lineageUsageText(usageType: LineageItem['usageType']): string {
  const map: Record<LineageItem['usageType'], string> = {
    chart: '图表',
    dashboard: '看板',
    segment: '分群',
  }
  return map[usageType]
}

function realtimePlatformGuide(platform: RealtimeVerifySession['platform']): string {
  const map: Record<RealtimeVerifySession['platform'], string> = {
    android: 'App 端需确认 App 名称、App ID、scheme 和 SDK 版本，扫码后进入检测状态；Android 支持付费截图回放。',
    ios: 'iOS 端需确认 App 名称、App ID、scheme 和 SDK 版本，扫码后进入检测状态。',
    web_js: 'Web JS SDK 需不低于 5.1.2。输入验证网址后生成测试链接或二维码，打开后开始接收行为流。',
    wechat_mp: '微信小程序需先上传小程序代码，并配置合法域名；同一二维码多设备扫码时按设备列表接入。',
    server_java: '服务端仅支持 Java SDK。复制测试 URL 到 SDK 初始化参数，并使用测试 user_unique_id 触发事件。',
  }
  return map[platform]
}

function realtimePlatformText(platform?: RealtimeVerifySession['platform']): string {
  const map: Record<RealtimeVerifySession['platform'], string> = {
    android: 'Android',
    ios: 'iOS',
    web_js: 'Web JS',
    wechat_mp: '微信小程序',
    server_java: '服务端 Java',
  }
  return platform ? map[platform] : '-'
}

function selectVerifyLog(log: VerifyEventLog): void {
  selectedVerifyLogId.value = log.id
}

function handleError(error: unknown): void {
  message.error(error instanceof Error ? error.message : String(error))
}

async function refreshAll(): Promise<void> {
  loading.value = true
  try {
    const overview = await userBehaviorDataService.getAccessOverview()
    appContext.value = overview.app
    sdkVersions.value = overview.sdkVersions
    recentHealth.value = overview.recentHealth
    permissions.value = await userBehaviorDataService.getPermissions()
    schemaCatalog.value = await userBehaviorDataService.getSchemaCatalog()
    categories.value = await userBehaviorDataService.listCategories()
    await Promise.all([
      refreshEndpoints(),
      refreshEvents(),
      refreshProperties(),
      refreshIntegrationTasks(),
      refreshVirtuals(),
      refreshVisualEvents(),
      refreshSessions(),
      refreshDictionaries(),
      refreshRealtime(),
      refreshGovernance(),
    ])
  } finally {
    loading.value = false
  }
}

async function refreshRouteData(): Promise<void> {
  if (pageKey.value === 'report-url') {
    await refreshEndpoints()
  }
  if (['events', 'event-categories', 'cost'].includes(pageKey.value)) {
    await refreshEvents()
  }
  if (['event-properties', 'user-properties', 'dimension-dictionary', 'lineage'].includes(pageKey.value)) {
    await refreshProperties()
    await refreshDictionaries()
  }
  if (pageKey.value === 'visual-integration') {
    await refreshIntegrationTasks()
  }
  if (['virtual-events', 'virtual-properties'].includes(pageKey.value)) {
    await refreshVirtuals()
  }
  if (pageKey.value === 'visual-events') {
    await refreshVisualEvents()
  }
  if (['session', 'custom-session'].includes(pageKey.value)) {
    await refreshSessions()
  }
  if (['realtime-verify', 'reports'].includes(pageKey.value)) {
    await refreshRealtime()
  }
  if (['governance-dashboard', 'ingestion-detail', 'rules', 'alerts', 'cost'].includes(pageKey.value)) {
    await refreshGovernance()
  }
  if (coreMetadataKind.value) {
    await refreshMetadataTable()
  }
}

async function refreshMetadataTable(resetPage = false): Promise<void> {
  if (!coreMetadataKind.value) {
    metadataRows.value = []
    metadataTotal.value = 0
    selectedMetadataIds.value = []
    return
  }
  if (resetPage) {
    metadataTableState.page = 1
  }
  const isEventKind = coreMetadataKind.value === 'event' || coreMetadataKind.value === 'relation_event' || coreMetadataKind.value === 'virtual_event' || coreMetadataKind.value === 'visual_event'
  const result = await userBehaviorDataService.listMetadataTable({
    kind: coreMetadataKind.value,
    keyword: isEventKind ? eventFilter.debouncedKeyword || eventFilter.keyword : propertyFilter.keyword,
    status: (isEventKind ? eventFilter.status : propertyFilter.status) as never,
    page: metadataTableState.page,
    pageSize: metadataTableState.pageSize,
    sortBy: metadataTableState.sortBy,
    sortOrder: metadataTableState.sortOrder,
    onlyMissingInfo: !isEventKind && propertyFilter.emptyInfoOnly,
  })
  metadataRows.value = result.rows
  metadataTotal.value = result.total
  selectedMetadataIds.value = selectedMetadataIds.value.filter((id) => result.rows.some((row) => row.id === id))
}

async function refreshEndpoints(): Promise<void> {
  endpoints.value = await userBehaviorDataService.listReportEndpoints({
    environmentType: endpointFilter.environmentType as ReportEndpoint['environmentType'],
    region: endpointFilter.region as ReportEndpoint['region'],
    platforms: endpointFilter.platforms,
    platformGroup: endpointFilter.platformGroup,
    customDomain: endpointFilter.customDomain,
  })
}

async function refreshEvents(): Promise<void> {
  events.value = await userBehaviorDataService.listEvents({
    keyword: eventFilter.debouncedKeyword,
    status: eventFilter.status as MetadataStatus | 'all',
    sourceType: eventFilter.sourceType as EventMetadata['sourceType'] | 'all',
    categoryId: eventFilter.categoryId,
    isPreset: eventFilter.isPreset as 'all' | 'yes' | 'no',
    hasScreenshot: eventFilter.hasScreenshot as 'all' | 'yes' | 'no',
    queried30d: eventFilter.queried30d as 'all' | 'yes' | 'no',
  })
  pendingEvents.value = await userBehaviorDataService.listPendingEvents()
  selectedPendingEventIds.value = selectedPendingEventIds.value.filter((id) => pendingEvents.value.some((pending) => pending.id === id))
  if (['events', 'virtual-events', 'visual-events', 'passive-relation-events'].includes(pageKey.value)) {
    await refreshMetadataTable()
  }
}

async function refreshProperties(): Promise<void> {
  eventProperties.value = await userBehaviorDataService.listEventProperties({
    keyword: propertyFilter.keyword,
    status: propertyFilter.status as MetadataStatus | 'all',
    dataType: propertyFilter.dataType as PropertyDataType | 'all',
    scope: propertyFilter.scope as EventPropertyMetadata['propertyScope'] | 'all',
    emptyInfoOnly: propertyFilter.emptyInfoOnly,
  })
  userProperties.value = await userBehaviorDataService.listUserProperties({
    keyword: propertyFilter.keyword,
    status: propertyFilter.status as MetadataStatus | 'all',
    dataType: propertyFilter.dataType as PropertyDataType | 'all',
    emptyInfoOnly: propertyFilter.emptyInfoOnly,
  })
  pendingEventProperties.value = await userBehaviorDataService.listPendingEventProperties()
  pendingUserProperties.value = await userBehaviorDataService.listPendingUserProperties()
  selectedPendingEventPropertyIds.value = selectedPendingEventPropertyIds.value.filter((id) => pendingEventProperties.value.some((pending) => pending.id === id))
  selectedPendingUserPropertyIds.value = selectedPendingUserPropertyIds.value.filter((id) => pendingUserProperties.value.some((pending) => pending.id === id))
  if (['event-properties', 'user-properties'].includes(pageKey.value)) {
    await refreshMetadataTable()
  }
}

async function refreshIntegrationTasks(): Promise<void> {
  integrationTasks.value = await userBehaviorDataService.listIntegrationTasks()
}

async function refreshVirtuals(): Promise<void> {
  virtualEvents.value = await userBehaviorDataService.listVirtualEvents()
  virtualProperties.value = await userBehaviorDataService.listVirtualProperties()
  if (['virtual-events', 'virtual-properties'].includes(pageKey.value)) {
    await refreshMetadataTable()
  }
}

async function refreshVisualEvents(): Promise<void> {
  visualEvents.value = await userBehaviorDataService.listVisualEvents()
  visualSelectionSession.value = await userBehaviorDataService.getVisualSelectionSession()
  if (pageKey.value === 'visual-events') {
    await refreshMetadataTable()
  }
}

async function refreshSessions(): Promise<void> {
  webSessionConfig.value = await userBehaviorDataService.getWebSessionConfig()
  sessionInterval.value = webSessionConfig.value.intervalMinutes
  customSessions.value = await userBehaviorDataService.listCustomSessions()
  if (pageKey.value === 'custom-session') {
    await refreshMetadataTable()
  }
}

async function refreshDictionaries(): Promise<void> {
  dictionaries.value = await userBehaviorDataService.listDictionaries()
}

async function refreshRealtime(): Promise<void> {
  const realtime = await userBehaviorDataService.getRealtimeSession()
  realtimeSession.value = realtime.session
  verifyLogs.value = realtime.logs
  if (!verifyLogs.value.some((log) => log.id === selectedVerifyLogId.value)) {
    selectedVerifyLogId.value = verifyLogs.value[0]?.id ?? ''
  }
  verifyReports.value = await userBehaviorDataService.listVerifyReports()
}

async function refreshGovernance(): Promise<void> {
  governanceMetrics.value = await userBehaviorDataService.getGovernanceDashboard()
  ingestionDetails.value = await userBehaviorDataService.listIngestionDetails()
  validationRules.value = await userBehaviorDataService.listValidationRules()
  alerts.value = await userBehaviorDataService.listAlerts()
  costGovernance.value = await userBehaviorDataService.getCostGovernance()
}

async function copyText(text: string, successText: string): Promise<void> {
  await navigator.clipboard?.writeText(text)
  message.success(successText)
}

function downloadCsv(content: string, fileName: string): void {
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

function hasMetadataColumn(column: string): boolean {
  return metadataTableState.visibleColumns.includes(column)
}

function metadataKindText(kind?: MetadataManagementKind | null): string {
  const map: Record<MetadataManagementKind, string> = {
    event: '一般事件',
    event_property: '事件属性',
    user_property: '用户属性',
    virtual_event: '虚拟事件',
    virtual_property: '虚拟属性',
    visual_event: '圈选事件',
    relation_event: '被动和关系事件',
    session: '会话管理',
    custom_session: '自定义 Session',
  }
  return kind ? map[kind] : '元数据'
}

function registrationSourceText(source?: string): string {
  const map: Record<string, string> = {
    manual: '手动登记',
    batch_import: '批量导入',
    sdk_detected: 'SDK 识别',
    system_preset: '系统预置',
    integration: '数据集成',
    visual_selection: '圈选生成',
    relation_generated: '关系生成',
  }
  return source ? map[source] ?? source : '-'
}

function sensitiveText(level?: string): string {
  const map: Record<string, string> = {
    public: '公开',
    internal: '内部',
    sensitive: '敏感',
    restricted: '受限',
  }
  return level ? map[level] ?? level : '-'
}

function splitMetadataTags(text: string): string[] {
  return text
    .split(/[,\n，、]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function parseImportSensitiveLevel(text: string): MetadataSensitiveLevel | undefined {
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
  return map[text.trim().toLowerCase()]
}

function parseCsvFileRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]
    if (char === '"' && inQuotes && next === '"') {
      cell += '"'
      index += 1
      continue
    }
    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (char === ',' && !inQuotes) {
      row.push(cell.trim())
      cell = ''
      continue
    }
    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        index += 1
      }
      row.push(cell.trim())
      if (row.some(Boolean)) {
        rows.push(row)
      }
      row = []
      cell = ''
      continue
    }
    cell += char
  }
  row.push(cell.trim())
  if (row.some(Boolean)) {
    rows.push(row)
  }
  return rows
}

function readUint16LE(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8)
}

function readUint32LE(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8) | ((bytes[offset + 2] ?? 0) << 16) | ((bytes[offset + 3] ?? 0) << 24)) >>> 0
}

function columnIndexFromCellRef(ref: string): number {
  const letters = ref.match(/[A-Z]+/i)?.[0].toUpperCase() ?? 'A'
  return [...letters].reduce((sum, char) => sum * 26 + char.charCodeAt(0) - 64, 0) - 1
}

async function inflateZipEntry(data: Uint8Array, method: number): Promise<Uint8Array> {
  if (method === 0) {
    return data
  }
  if (method !== 8) {
    throw new Error('当前 Excel 压缩格式不支持，请另存为标准 .xlsx 后上传')
  }
  if (!('DecompressionStream' in globalThis)) {
    throw new Error('当前浏览器不支持解析 Excel 压缩包，请使用最新版 Chrome/Edge 或上传 CSV')
  }
  const body = data.slice()
  const stream = new Blob([body]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function readXlsxEntries(buffer: ArrayBuffer): Promise<Map<string, string>> {
  const bytes = new Uint8Array(buffer)
  const decoder = new TextDecoder('utf-8')
  let eocdOffset = -1
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset -= 1) {
    if (readUint32LE(bytes, offset) === 0x06054b50) {
      eocdOffset = offset
      break
    }
  }
  if (eocdOffset < 0) {
    throw new Error('文件不是有效的 .xlsx')
  }
  const entryCount = readUint16LE(bytes, eocdOffset + 10)
  let pointer = readUint32LE(bytes, eocdOffset + 16)
  const entries = new Map<string, string>()
  for (let index = 0; index < entryCount; index += 1) {
    if (readUint32LE(bytes, pointer) !== 0x02014b50) {
      throw new Error('Excel 文件结构异常，无法读取目录')
    }
    const method = readUint16LE(bytes, pointer + 10)
    const compressedSize = readUint32LE(bytes, pointer + 20)
    const fileNameLength = readUint16LE(bytes, pointer + 28)
    const extraLength = readUint16LE(bytes, pointer + 30)
    const commentLength = readUint16LE(bytes, pointer + 32)
    const localHeaderOffset = readUint32LE(bytes, pointer + 42)
    const fileName = decoder.decode(bytes.slice(pointer + 46, pointer + 46 + fileNameLength))
    const localNameLength = readUint16LE(bytes, localHeaderOffset + 26)
    const localExtraLength = readUint16LE(bytes, localHeaderOffset + 28)
    const dataOffset = localHeaderOffset + 30 + localNameLength + localExtraLength
    const compressed = bytes.slice(dataOffset, dataOffset + compressedSize)
    if (fileName.endsWith('.xml') || fileName.endsWith('.rels')) {
      entries.set(fileName, decoder.decode(await inflateZipEntry(compressed, method)))
    }
    pointer += 46 + fileNameLength + extraLength + commentLength
  }
  return entries
}

function parseXml(text: string): Document {
  const document = new DOMParser().parseFromString(text, 'application/xml')
  if (document.getElementsByTagName('parsererror').length) {
    throw new Error('Excel XML 内容解析失败')
  }
  return document
}

function resolveFirstWorksheetPath(entries: Map<string, string>): string {
  const workbook = parseXml(entries.get('xl/workbook.xml') ?? '')
  const firstSheet = workbook.getElementsByTagName('sheet')[0]
  const relationId = firstSheet?.getAttribute('r:id')
  if (!relationId) {
    return 'xl/worksheets/sheet1.xml'
  }
  const relationships = parseXml(entries.get('xl/_rels/workbook.xml.rels') ?? '')
  const relation = [...relationships.getElementsByTagName('Relationship')].find((item) => item.getAttribute('Id') === relationId)
  const target = relation?.getAttribute('Target') ?? 'worksheets/sheet1.xml'
  return target.startsWith('/') ? target.replace(/^\//, '') : `xl/${target.replace(/^xl\//, '')}`
}

function cellText(cell: Element, sharedStrings: string[]): string {
  const type = cell.getAttribute('t')
  if (type === 'inlineStr') {
    return [...cell.getElementsByTagName('t')].map((item) => item.textContent ?? '').join('')
  }
  const value = cell.getElementsByTagName('v')[0]?.textContent ?? ''
  if (type === 's') {
    return sharedStrings[Number(value)] ?? ''
  }
  return value
}

async function readXlsxRows(file: File): Promise<string[][]> {
  const entries = await readXlsxEntries(await file.arrayBuffer())
  const sharedStringsXml = entries.get('xl/sharedStrings.xml')
  const sharedStrings = sharedStringsXml
    ? [...parseXml(sharedStringsXml).getElementsByTagName('si')].map((item) => [...item.getElementsByTagName('t')].map((text) => text.textContent ?? '').join(''))
    : []
  const sheetPath = resolveFirstWorksheetPath(entries)
  const sheetXml = entries.get(sheetPath)
  if (!sheetXml) {
    throw new Error('Excel 中没有可读取的工作表')
  }
  return [...parseXml(sheetXml).getElementsByTagName('row')]
    .map((row) => {
      const values: string[] = []
      ;[...row.getElementsByTagName('c')].forEach((cell, fallbackIndex) => {
        const cellRef = cell.getAttribute('r')
        values[cellRef ? columnIndexFromCellRef(cellRef) : fallbackIndex] = cellText(cell, sharedStrings).trim()
      })
      return values.map((value) => value ?? '')
    })
    .filter((row) => row.some(Boolean))
}

function normalizeImportHeader(text: string): string {
  return text.trim().toLowerCase().replace(/[\s_（）()]/g, '')
}

function importColumnIndex(headers: string[], aliases: string[]): number {
  const normalizedAliases = aliases.map(normalizeImportHeader)
  return headers.findIndex((header) => normalizedAliases.includes(normalizeImportHeader(header)))
}

function getImportCell(row: string[], index: number): string | undefined {
  const value = index >= 0 ? row[index]?.trim() : undefined
  return value || undefined
}

function rowsToDisplayImportRows(rows: string[][], kind: 'event' | 'property'): MetadataDisplayImportRow[] {
  if (!rows.length) {
    return []
  }
  const headerAliases = {
    name: kind === 'event' ? ['事件名称', '事件名', 'eventname', 'event'] : ['属性名称', '属性名', 'propertyname', 'property'],
    displayName: ['展示名', '显示名', 'displayname'],
    description: ['描述', '说明', 'description'],
    categoryId: ['分类', '分类id', 'category', 'categoryid'],
    owner: ['负责人', 'owner'],
    tags: ['标签', 'tags'],
    unit: ['单位', 'unit'],
    businessDefinition: ['业务口径', '口径说明', 'businessdefinition'],
    sensitiveLevel: ['敏感等级', '敏感级别', 'sensitivelevel'],
  }
  const header = rows[0] ?? []
  const hasHeader = importColumnIndex(header, headerAliases.name) >= 0 || importColumnIndex(header, headerAliases.displayName) >= 0
  const dataRows = hasHeader ? rows.slice(1) : rows
  const columns = hasHeader
    ? {
        name: importColumnIndex(header, headerAliases.name),
        displayName: importColumnIndex(header, headerAliases.displayName),
        description: importColumnIndex(header, headerAliases.description),
        categoryId: importColumnIndex(header, headerAliases.categoryId),
        owner: importColumnIndex(header, headerAliases.owner),
        tags: importColumnIndex(header, headerAliases.tags),
        unit: importColumnIndex(header, headerAliases.unit),
        businessDefinition: importColumnIndex(header, headerAliases.businessDefinition),
        sensitiveLevel: importColumnIndex(header, headerAliases.sensitiveLevel),
      }
    : { name: 0, displayName: 1, description: 2, categoryId: -1, owner: -1, tags: -1, unit: -1, businessDefinition: -1, sensitiveLevel: -1 }
  return dataRows
    .map((row, index) => {
      const sensitiveLevel = parseImportSensitiveLevel(getImportCell(row, columns.sensitiveLevel) ?? '')
      return {
        rowNumber: (hasHeader ? 2 : 1) + index,
        name: getImportCell(row, columns.name) ?? '',
        displayName: getImportCell(row, columns.displayName),
        description: getImportCell(row, columns.description),
        categoryId: getImportCell(row, columns.categoryId),
        owner: getImportCell(row, columns.owner),
        tags: splitMetadataTags(getImportCell(row, columns.tags) ?? ''),
        unit: getImportCell(row, columns.unit),
        businessDefinition: getImportCell(row, columns.businessDefinition),
        sensitiveLevel,
      }
    })
    .filter((row) => row.name || row.displayName || row.description)
}

async function parseMetadataDisplayImportFile(file: File, kind: 'event' | 'property'): Promise<MetadataDisplayImportRow[]> {
  const fileName = file.name.toLowerCase()
  const rows = fileName.endsWith('.xlsx')
    ? await readXlsxRows(file)
    : fileName.endsWith('.csv')
      ? parseCsvFileRows(await file.text())
      : (() => {
          throw new Error('请上传 .xlsx Excel 文件；如使用旧版 .xls，请先另存为 .xlsx')
        })()
  const parsedRows = rowsToDisplayImportRows(rows, kind)
  if (!parsedRows.length) {
    throw new Error('文件中没有可导入的数据行')
  }
  return parsedRows
}

function importSummaryText(summary: DisplayImportSummary | null): string {
  if (!summary) {
    return '尚未上传文件'
  }
  return `${summary.fileName}：读取 ${summary.total} 行，更新 ${summary.updated} 行，忽略 ${summary.ignored} 行，失败 ${summary.failed} 行`
}

function escapeCsvCell(value?: string): string {
  const cell = String(value ?? '')
  return /[",\n]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell
}

function eventRowsToCsv(rows: MetadataDisplayImportRow[]): string {
  return [
    ['event_name', '展示名', '描述'].join(','),
    ...rows.map((row) => [row.name, row.displayName ?? row.name, row.description ?? ''].map(escapeCsvCell).join(',')),
  ].join('\n')
}

function batchImportSourceText(): string {
  if (batchForm.source === 'excel') {
    return batchForm.fileName ? `${batchForm.fileName}：已读取 ${batchForm.rowCount} 行，预校验通过后可导入` : '尚未上传 Excel 文件'
  }
  return '手动粘贴模式适合少量事件；大批量请上传 Excel 文件'
}

function metadataRowChecked(row: MetadataTableRow): boolean {
  return selectedMetadataIds.value.includes(row.id)
}

function toggleMetadataRow(row: MetadataTableRow, checked: boolean): void {
  selectedMetadataIds.value = checked
    ? [...new Set([...selectedMetadataIds.value, row.id])]
    : selectedMetadataIds.value.filter((id) => id !== row.id)
}

function toggleMetadataId(id: string, checked: boolean): void {
  selectedMetadataIds.value = checked
    ? [...new Set([...selectedMetadataIds.value, id])]
    : selectedMetadataIds.value.filter((selectedId) => selectedId !== id)
}

function toggleCurrentPageMetadata(checked: boolean): void {
  const ids = metadataRows.value.map((row) => row.id)
  selectedMetadataIds.value = checked ? [...new Set([...selectedMetadataIds.value, ...ids])] : selectedMetadataIds.value.filter((id) => !ids.includes(id))
}

function togglePendingEvent(id: string, checked: boolean): void {
  selectedPendingEventIds.value = checked
    ? [...new Set([...selectedPendingEventIds.value, id])]
    : selectedPendingEventIds.value.filter((selectedId) => selectedId !== id)
}

function toggleAllPendingEvents(checked: boolean): void {
  selectedPendingEventIds.value = checked ? pendingEvents.value.map((pending) => pending.id) : []
}

function togglePendingEventProperty(id: string, checked: boolean): void {
  selectedPendingEventPropertyIds.value = checked
    ? [...new Set([...selectedPendingEventPropertyIds.value, id])]
    : selectedPendingEventPropertyIds.value.filter((selectedId) => selectedId !== id)
}

function toggleAllPendingEventProperties(checked: boolean): void {
  selectedPendingEventPropertyIds.value = checked ? pendingEventProperties.value.map((pending) => pending.id) : []
}

function togglePendingUserProperty(id: string, checked: boolean): void {
  selectedPendingUserPropertyIds.value = checked
    ? [...new Set([...selectedPendingUserPropertyIds.value, id])]
    : selectedPendingUserPropertyIds.value.filter((selectedId) => selectedId !== id)
}

function toggleAllPendingUserProperties(checked: boolean): void {
  selectedPendingUserPropertyIds.value = checked ? pendingUserProperties.value.map((pending) => pending.id) : []
}

function defaultApprovalCategoryId(): string | undefined {
  return categories.value.find((category) => category.scope === 'public')?.id ?? categories.value[0]?.id
}

async function completeApprovedMetadataInfo(
  kind: 'event' | 'event_property' | 'user_property',
  id: string,
  payload: { displayName: string, description: string, categoryId?: string, tags: string[], owner: string, unit?: string, businessDefinition: string, sensitiveLevel?: MetadataSensitiveLevel },
): Promise<void> {
  await userBehaviorDataService.updateMetadataDisplayInfo(kind, id, {
    displayName: payload.displayName,
    description: payload.description,
    categoryId: payload.categoryId,
    tags: payload.tags,
    businessDefinition: payload.businessDefinition,
  })
  await userBehaviorDataService.updateMetadataOwnership(kind, id, {
    owner: payload.owner,
    tags: payload.tags,
    unit: payload.unit,
    businessDefinition: payload.businessDefinition,
    sensitiveLevel: payload.sensitiveLevel ?? 'internal',
  })
}

async function handlePreviewBatchMetadata(): Promise<void> {
  if (!coreMetadataKind.value) {
    return
  }
  try {
    metadataBatchPreview.value = await userBehaviorDataService.previewBatchMetadataAction({
      kind: coreMetadataKind.value,
      ids: selectedMetadataIds.value,
      action: batchAction.value,
      confirmedImpact: false,
    })
    message[metadataBatchPreview.value.blockedCount ? 'warning' : 'success'](
      metadataBatchPreview.value.blockedCount ? '存在不可执行项，请查看影响预览' : '批量操作预览通过',
    )
  } catch (error) {
    handleError(error)
  }
}

async function handleExecuteBatchMetadata(action = batchAction.value, confirmedImpact = false): Promise<void> {
  if (!coreMetadataKind.value) {
    return
  }
  try {
    const result = await userBehaviorDataService.executeBatchMetadataAction({
      kind: coreMetadataKind.value,
      ids: selectedMetadataIds.value,
      action,
      confirmedImpact,
    })
    metadataBatchPreview.value = result
    selectedMetadataIds.value = []
    await Promise.all([refreshEvents(), refreshProperties(), refreshVirtuals(), refreshVisualEvents(), refreshSessions()])
    message.success(`批量操作完成：更新 ${result.updatedCount} 个，删除 ${result.deletedCount} 个`)
  } catch (error) {
    handleError(error)
  }
}

async function handleSingleMetadataAction(row: MetadataTableRow, action: MetadataBatchAction): Promise<void> {
  const originalIds = [...selectedMetadataIds.value]
  selectedMetadataIds.value = [row.id]
  await handleExecuteBatchMetadata(action, action === 'disable' || action === 'delete')
  selectedMetadataIds.value = originalIds.filter((id) => id !== row.id)
}

async function handleSingleMetadataActionById(kind: MetadataManagementKind, id: string, action: MetadataBatchAction): Promise<void> {
  try {
    const table = await userBehaviorDataService.listMetadataTable({ kind, page: 1, pageSize: 1000 })
    const row = table.rows.find((item) => item.id === id)
    if (!row) {
      throw new Error('元数据不存在')
    }
    await handleSingleMetadataAction(row, action)
  } catch (error) {
    handleError(error)
  }
}

function metadataActionOptions(row: MetadataTableRow) {
  const base = [
    { label: '启用', key: 'enable' },
    { label: '设为不显示', key: 'hide' },
    { label: '禁用', key: 'disable' },
    { label: '删除', key: 'delete' },
  ]
  if (row.kind === 'event_property' || row.kind === 'user_property') {
    return [{ label: '修改类型', key: 'change_type' }, ...base]
  }
  return base
}

async function handleMetadataRowMenu(row: MetadataTableRow, key: string | number): Promise<void> {
  if (key === 'change_type') {
    if (row.kind === 'event_property') {
      Object.assign(typeChangeForm, { targetKind: 'event', targetId: row.id, dataType: row.dataType || 'string' })
    }
    if (row.kind === 'user_property') {
      Object.assign(typeChangeForm, { targetKind: 'user', targetId: row.id, dataType: row.dataType || 'string' })
    }
    return
  }
  await handleSingleMetadataAction(row, key as MetadataBatchAction)
}

function virtualEventActionOptions(event: VirtualEvent) {
  return [
    { label: event.status === 'enabled' ? '禁用' : '启用', key: 'toggle_status' },
    { label: '删除', key: 'delete' },
  ]
}

async function handleVirtualEventMenu(event: VirtualEvent, key: string | number): Promise<void> {
  if (key === 'toggle_status') {
    await handleVirtualEventStatus(event, event.status === 'enabled' ? 'disabled' : 'enabled')
    return
  }
  if (key === 'delete') {
    await handleDeleteVirtualEvent(event)
  }
}

function virtualPropertyActionOptions(property: VirtualProperty) {
  return [
    { label: 'SQL 编辑', key: 'sql_edit', disabled: property.status === 'invalid' },
    { label: '删除', key: 'delete' },
  ]
}

async function handleVirtualPropertyMenu(property: VirtualProperty, key: string | number): Promise<void> {
  if (key === 'sql_edit') {
    openVirtualPropertyEditModal(property)
    return
  }
  if (key === 'delete') {
    await handleDeleteVirtualProperty(property)
  }
}

function visualEventActionOptions(event: VisualEvent) {
  return [
    { label: event.status === 'enabled' ? '禁用' : '启用', key: 'toggle_status' },
    { label: '删除', key: 'delete' },
  ]
}

async function handleVisualEventMenu(event: VisualEvent, key: string | number): Promise<void> {
  if (key === 'toggle_status') {
    await handleVisualEventStatus(event, event.status === 'enabled' ? 'disabled' : 'enabled')
    return
  }
  if (key === 'delete') {
    await handleSingleMetadataActionById('visual_event', event.id, 'delete')
  }
}

function relationEventActionOptions() {
  return [
    { label: '启用', key: 'enable' },
    { label: '设为不显示', key: 'hide' },
    { label: '禁用', key: 'disable' },
    { label: '删除', key: 'delete' },
  ]
}

async function handleRelationEventMenu(event: EventMetadata, key: string | number): Promise<void> {
  await handleSingleMetadataActionById('relation_event', event.id, key as MetadataBatchAction)
}

function customSessionActionOptions(session: CustomSession) {
  return [
    { label: session.status === 'enabled' ? '禁用' : '启用', key: 'toggle_status' },
    { label: '删除', key: 'delete' },
  ]
}

async function handleCustomSessionMenu(session: CustomSession, key: string | number): Promise<void> {
  if (key === 'toggle_status') {
    await handleCustomSessionStatus(session, session.status === 'enabled' ? 'disabled' : 'enabled')
    return
  }
  if (key === 'delete') {
    await handleDeleteCustomSession(session)
  }
}

const pendingApprovalActionOptions = [
  { label: '验收不显示', key: 'hidden' },
  { label: '加入黑名单', key: 'blacklist' },
]

function handlePendingEventMenu(pending: PendingEvent, key: string | number): void {
  if (key === 'blacklist') {
    void handleBlacklistPending(pending)
    return
  }
  void handleApprovePending(pending, 'hidden')
}

function handlePendingEventPropertyMenu(pending: PendingEventProperty, key: string | number): void {
  if (key === 'blacklist') {
    void handleBlacklistPendingEventProperty(pending)
    return
  }
  void handleApprovePendingEventProperty(pending, 'hidden')
}

function handlePendingUserPropertyMenu(pending: PendingUserProperty, key: string | number): void {
  if (key === 'blacklist') {
    void handleBlacklistPendingUserProperty(pending)
    return
  }
  void handleApprovePendingUserProperty(pending, 'hidden')
}

async function handleExportSelectedMetadata(): Promise<void> {
  if (!coreMetadataKind.value) {
    return
  }
  try {
    const result = await userBehaviorDataService.executeBatchMetadataAction({
      kind: coreMetadataKind.value,
      ids: selectedMetadataIds.value.length ? selectedMetadataIds.value : metadataRows.value.map((row) => row.id),
      action: 'export',
    })
    if (result.exportedCsv) {
      downloadCsv(result.exportedCsv, `${coreMetadataKind.value}-metadata-export.csv`)
    }
    metadataBatchPreview.value = result
    message.success('元数据已导出')
  } catch (error) {
    handleError(error)
  }
}

async function handleBatchEditMetadata(): Promise<void> {
  if (!coreMetadataKind.value) {
    return
  }
  try {
    const patch = {
      description: batchEditForm.description || undefined,
      categoryId: batchEditForm.categoryId || undefined,
      owner: batchEditForm.owner || undefined,
      tags: splitMetadataTags(batchEditForm.tagsText),
      unit: batchEditForm.unit || undefined,
      businessDefinition: batchEditForm.businessDefinition || undefined,
      sensitiveLevel: batchEditForm.sensitiveLevel,
    }
    const ids = [...selectedMetadataIds.value]
    if (batchEditForm.displayNamePrefix) {
      for (const row of metadataRows.value.filter((item) => ids.includes(item.id))) {
        await userBehaviorDataService.updateMetadataDisplayInfo(coreMetadataKind.value, row.id, {
          ...patch,
          displayName: `${batchEditForm.displayNamePrefix}${row.displayName || row.name}`,
        })
      }
    } else {
      await userBehaviorDataService.executeBatchMetadataAction({
        kind: coreMetadataKind.value,
        ids,
        action: 'update_display',
        patch,
      })
    }
    showBatchEditModal.value = false
    selectedMetadataIds.value = []
    await Promise.all([refreshEvents(), refreshProperties(), refreshVirtuals(), refreshVisualEvents(), refreshSessions()])
    message.success('批量编辑已完成')
  } catch (error) {
    handleError(error)
  }
}

async function openMetadataDrawer(kind: MetadataManagementKind, id: string): Promise<void> {
  try {
    const table = await userBehaviorDataService.listMetadataTable({ kind, page: 1, pageSize: 1000 })
    const row = table.rows.find((item) => item.id === id)
    if (!row) {
      throw new Error('元数据不存在')
    }
    selectedMetadata.value = row
    Object.assign(metadataEditForm, {
      displayName: row.displayName ?? '',
      description: row.description ?? '',
      categoryId: row.categoryId ?? '',
      owner: row.owner ?? '',
      tagsText: row.tags?.join('、') ?? '',
      unit: row.unit ?? '',
      businessDefinition: row.businessDefinition ?? '',
      sensitiveLevel: row.sensitiveLevel ?? 'internal',
    })
    metadataImpactPreview.value = await userBehaviorDataService.getMetadataImpactPreview(kind, id, 'disable')
    metadataAuditTimeline.value = await userBehaviorDataService.getMetadataAuditTimeline(kind, id)
    showMetadataDrawer.value = true
  } catch (error) {
    handleError(error)
  }
}

async function handleSaveMetadataDrawer(): Promise<void> {
  if (!selectedMetadata.value) {
    return
  }
  try {
    const kind = selectedMetadata.value.kind
    const id = selectedMetadata.value.id
    await userBehaviorDataService.updateMetadataDisplayInfo(kind, id, {
      displayName: metadataEditForm.displayName,
      description: metadataEditForm.description,
      categoryId: metadataEditForm.categoryId || undefined,
      tags: splitMetadataTags(metadataEditForm.tagsText),
      businessDefinition: metadataEditForm.businessDefinition,
    })
    selectedMetadata.value = await userBehaviorDataService.updateMetadataOwnership(kind, id, {
      owner: metadataEditForm.owner,
      tags: splitMetadataTags(metadataEditForm.tagsText),
      unit: metadataEditForm.unit,
      businessDefinition: metadataEditForm.businessDefinition,
      sensitiveLevel: metadataEditForm.sensitiveLevel,
    })
    metadataAuditTimeline.value = await userBehaviorDataService.getMetadataAuditTimeline(kind, id)
    await Promise.all([refreshEvents(), refreshProperties(), refreshVirtuals(), refreshVisualEvents(), refreshSessions()])
    message.success('元数据编辑已保存')
  } catch (error) {
    handleError(error)
  }
}

function eventPropertyScopeText(property: EventPropertyMetadata): string {
  return property.propertyScope === 'event_common_header' ? '公共属性' : '自定义属性'
}

function canDeleteDrawerEventProperty(property: EventPropertyMetadata): boolean {
  return property.propertyScope === 'event_param' && !property.isPreset && !property.hasIngestedData
}

async function refreshMetadataDrawerEventProperties(): Promise<void> {
  const current = selectedMetadata.value
  await Promise.all([refreshEvents(), refreshProperties()])
  if (current?.kind === 'event') {
    const table = await userBehaviorDataService.listMetadataTable({ kind: current.kind, page: 1, pageSize: 1000 })
    selectedMetadata.value = table.rows.find((item) => item.id === current.id) ?? current
    metadataAuditTimeline.value = await userBehaviorDataService.getMetadataAuditTimeline(current.kind, current.id)
  }
}

async function handleToggleDrawerEventProperty(property: EventPropertyMetadata): Promise<void> {
  try {
    const nextStatus: MetadataStatus = property.status === 'hidden' ? 'enabled' : 'hidden'
    await userBehaviorDataService.updateEventPropertyStatus(property.id, nextStatus)
    await refreshMetadataDrawerEventProperties()
    message.success(nextStatus === 'hidden' ? '属性已设为隐藏' : '属性已恢复显示')
  } catch (error) {
    handleError(error)
  }
}

async function handleDeleteDrawerEventProperty(property: EventPropertyMetadata): Promise<void> {
  if (selectedMetadata.value?.kind !== 'event') {
    return
  }
  if (!canDeleteDrawerEventProperty(property)) {
    message.warning(property.hasIngestedData ? '该属性已有上报数据，不能删除，可改为隐藏' : '公共属性或预置属性不能从事件删除')
    return
  }
  const confirmed = window.confirm('确认删除该事件属性？系统会再次校验该属性是否无上报数据。')
  if (!confirmed) {
    return
  }
  try {
    await userBehaviorDataService.deleteEventPropertyFromEvent(selectedMetadata.value.id, property.id)
    await refreshMetadataDrawerEventProperties()
    message.success('事件属性已删除')
  } catch (error) {
    handleError(error)
  }
}

async function handleAttachDrawerEventProperties(): Promise<void> {
  if (selectedMetadata.value?.kind !== 'event') {
    return
  }
  if (!drawerEventPropertyAttachForm.propertyIds.length) {
    message.warning('请选择要添加的已有属性')
    return
  }
  try {
    await userBehaviorDataService.attachPropertiesToEvent(selectedMetadata.value.id, drawerEventPropertyAttachForm.propertyIds)
    drawerEventPropertyAttachForm.propertyIds = []
    await refreshMetadataDrawerEventProperties()
    message.success('已有属性已添加到当前事件')
  } catch (error) {
    handleError(error)
  }
}

async function handlePreviewMetadataImpact(action: MetadataImpactPreview['action']): Promise<void> {
  if (!selectedMetadata.value) {
    return
  }
  try {
    metadataImpactPreview.value = await userBehaviorDataService.getMetadataImpactPreview(selectedMetadata.value.kind, selectedMetadata.value.id, action)
  } catch (error) {
    handleError(error)
  }
}

async function handleUpdateSdkSetting(key: keyof AppContext['sdkSettings'], value: boolean): Promise<void> {
  try {
    appContext.value = await userBehaviorDataService.updateSdkSettings({ [key]: value })
    message.success('SDK 开关状态已更新')
    await refreshVisualEvents()
  } catch (error) {
    handleError(error)
  }
}

async function handleValidateBehaviorUpload(): Promise<void> {
  try {
    uploadValidationResult.value = await userBehaviorDataService.validateBehaviorUpload(uploadPayloadText.value)
    await Promise.all([refreshEvents(), refreshProperties(), refreshGovernance()])
    message[uploadValidationResult.value.discardedCount > 0 || uploadValidationResult.value.abnormalPropertyCount > 0 ? 'warning' : 'success']('上报 payload 校验完成')
  } catch (error) {
    handleError(error)
  }
}

async function handleDownloadEventTemplate(): Promise<void> {
  const csv = await userBehaviorDataService.downloadEventTemplate()
  downloadCsv(csv, 'tracking-event-template.csv')
  message.success('埋点设计模板已下载')
}

async function handleExportEventDisplay(): Promise<void> {
  const csv = await userBehaviorDataService.exportEventDisplayCsv({
    keyword: eventFilter.debouncedKeyword,
    status: eventFilter.status as MetadataStatus | 'all',
    sourceType: eventFilter.sourceType as EventMetadata['sourceType'] | 'all',
    categoryId: eventFilter.categoryId,
    isPreset: eventFilter.isPreset as 'all' | 'yes' | 'no',
    hasScreenshot: eventFilter.hasScreenshot as 'all' | 'yes' | 'no',
    queried30d: eventFilter.queried30d as 'all' | 'yes' | 'no',
  })
  downloadCsv(csv, 'event-display-info.csv')
  message.success('当前筛选事件展示信息已导出')
}

const eventUtilityActionOptions = [
  { label: '下载事件模板', key: 'download-template' },
  { label: '导出当前筛选展示信息', key: 'export-display' },
  { label: '进入埋点验证', key: 'verify-tracking' },
]

async function handleEventUtilityAction(key: string | number): Promise<void> {
  if (key === 'download-template') {
    await handleDownloadEventTemplate()
    return
  }
  if (key === 'export-display') {
    await handleExportEventDisplay()
    return
  }
  if (key === 'verify-tracking') {
    void router.push('/data-management/tracking/realtime-verify')
  }
}

const metadataWorkbenchMoreOptions = [
  { label: '批量编辑展示信息', key: 'batch-edit' },
  { label: '导出勾选元数据', key: 'export-selected' },
]

function handleMetadataWorkbenchMoreAction(key: string | number): void {
  if (key === 'batch-edit') {
    showBatchEditModal.value = true
    return
  }
  if (key === 'export-selected') {
    void handleExportSelectedMetadata()
  }
}

async function handleExportPropertyDisplay(kind: 'event' | 'user'): Promise<void> {
  const csv = await userBehaviorDataService.exportPropertyDisplayCsv(kind, {
    keyword: propertyFilter.keyword,
    status: propertyFilter.status as MetadataStatus | 'all',
    dataType: propertyFilter.dataType as PropertyDataType | 'all',
    scope: propertyFilter.scope as EventPropertyMetadata['propertyScope'] | 'all',
    emptyInfoOnly: propertyFilter.emptyInfoOnly,
  })
  downloadCsv(csv, `${kind}-property-display-info.csv`)
  message.success('属性展示信息已导出')
}

async function handleImportPropertyDisplayFile(kind: 'event' | 'user', event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) {
    return
  }
  try {
    const rows = await parseMetadataDisplayImportFile(file, 'property')
    const result = await userBehaviorDataService.importPropertyDisplayRows(kind, rows)
    if (kind === 'event') {
      eventPropertyDisplayImportSummary.value = { ...result, fileName: file.name }
    } else {
      userPropertyDisplayImportSummary.value = { ...result, fileName: file.name }
    }
    await refreshProperties()
    message.success(`Excel 导入完成：更新 ${result.updated} 行，忽略 ${result.ignored} 行，失败 ${result.failed} 行`)
  } catch (error) {
    handleError(error)
  }
}

async function handleCreateEvent(): Promise<void> {
  try {
    await userBehaviorDataService.createEvent({
      eventName: eventForm.eventName,
      displayName: eventForm.displayName,
      description: eventForm.description,
      categoryId: eventForm.categoryId || undefined,
      associatedPropertyIds: eventForm.associatedPropertyIds,
    })
    showEventModal.value = false
    Object.assign(eventForm, { eventName: '', displayName: '', categoryId: '', description: '', associatedPropertyIds: [] })
    await refreshEvents()
    message.success('事件创建成功')
  } catch (error) {
    handleError(error)
  }
}

function openEventEditModal(event: EventMetadata): void {
  Object.assign(eventEditForm, {
    eventId: event.id,
    displayName: event.displayName ?? '',
    categoryId: event.categoryId ?? '',
    description: event.description ?? '',
  })
  showEventEditModal.value = true
}

async function handleUpdateEventInfo(): Promise<void> {
  try {
    await userBehaviorDataService.updateEvent(eventEditForm.eventId, {
      displayName: eventEditForm.displayName,
      categoryId: eventEditForm.categoryId || undefined,
      description: eventEditForm.description,
    })
    showEventEditModal.value = false
    await refreshEvents()
    message.success('事件展示信息已更新')
  } catch (error) {
    handleError(error)
  }
}

async function handleAttachPropertiesToSelectedEvent(): Promise<void> {
  if (!selectedEvent.value) {
    return
  }
  try {
    selectedEvent.value = await userBehaviorDataService.attachPropertiesToEvent(selectedEvent.value.id, eventPropertyAttachForm.propertyIds)
    eventPropertyAttachForm.propertyIds = []
    await refreshProperties()
    await refreshEvents()
    message.success('事件属性已添加')
  } catch (error) {
    handleError(error)
  }
}

async function handleDetachPropertyFromSelectedEvent(propertyId: string): Promise<void> {
  if (!selectedEvent.value) {
    return
  }
  try {
    const confirmed = window.confirm('删除事件已添加属性前，将检查入库、图表、分群和虚拟属性影响。确认继续？')
    selectedEvent.value = await userBehaviorDataService.detachPropertyFromEvent(selectedEvent.value.id, propertyId, confirmed)
    await refreshProperties()
    await refreshEvents()
    message.success('事件属性已移除')
  } catch (error) {
    handleError(error)
  }
}

async function handleUpdateEventStatus(event: EventMetadata, status: MetadataStatus): Promise<void> {
  try {
    const confirmed = status === 'disabled' ? window.confirm('禁用前将检查血缘、查询次数、昨日入库和虚拟引用影响。确认继续？') : true
    await userBehaviorDataService.updateEventStatus(event.id, status, confirmed)
    await refreshEvents()
    message.success(`事件已${statusText(status)}`)
  } catch (error) {
    handleError(error)
  }
}

async function handlePreviewBatch(): Promise<void> {
  try {
    if (batchForm.source === 'excel' && !batchForm.rowCount) {
      message.warning('请先上传 Excel 文件')
      return
    }
    const result = await userBehaviorDataService.previewBatchEvents(batchForm.text, batchForm.mode)
    batchPreviewRows.value = result.rows
    batchPreviewTotal.value = result.total ?? 0
    message[result.canImport ? 'success' : 'warning'](result.canImport ? `预校验通过，共 ${result.total ?? batchForm.rowCount} 行` : '存在行级错误')
  } catch (error) {
    handleError(error)
  }
}

async function handleImportBatch(): Promise<void> {
  try {
    if (batchForm.source === 'excel' && !batchForm.rowCount) {
      message.warning('请先上传 Excel 文件')
      return
    }
    const result = await userBehaviorDataService.importBatchEvents(batchForm.text, batchForm.mode)
    await refreshEvents()
    showBatchModal.value = false
    Object.assign(batchForm, { source: 'excel', text: '', fileName: '', rowCount: 0 })
    batchPreviewRows.value = []
    batchPreviewTotal.value = 0
    message.success(`导入完成：新建 ${result.created} 个，更新 ${result.updated} 个`)
  } catch (error) {
    handleError(error)
  }
}

async function handleImportBatchExcelFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) {
    return
  }
  try {
    const rows = await parseMetadataDisplayImportFile(file, 'event')
    batchForm.source = 'excel'
    batchForm.fileName = file.name
    batchForm.rowCount = rows.length
    batchForm.text = eventRowsToCsv(rows)
    batchPreviewRows.value = []
    batchPreviewTotal.value = 0
    message.success(`Excel 已读取 ${rows.length} 行，请先预校验`)
  } catch (error) {
    handleError(error)
  }
}

async function handleApprovePending(pending: PendingEvent, status: 'enabled' | 'hidden'): Promise<void> {
  try {
    const event = await userBehaviorDataService.approvePendingEvent(pending.id, pending.eventName, status)
    await completeApprovedMetadataInfo('event', event.id, {
      displayName: pending.eventName,
      description: `待验收转正事件，样例属性：${pending.sampleProperties.join('、') || '无'}`,
      categoryId: defaultApprovalCategoryId(),
      tags: ['待验收转正', 'SDK识别'],
      owner: '数据管理员',
      businessDefinition: `由上报样例验收生成，首次出现 ${pending.firstSeenAt}，样例条数 ${pending.sampleCount}`,
      sensitiveLevel: 'internal',
    })
    await refreshEvents()
    message.success('待验收事件已通过')
  } catch (error) {
    handleError(error)
  }
}

async function handleBlacklistPending(pending: PendingEvent): Promise<void> {
  try {
    await userBehaviorDataService.blacklistPendingEvent(pending.id)
    await refreshEvents()
    message.success('已加入黑名单')
  } catch (error) {
    handleError(error)
  }
}

async function handleBatchApprovePendingEvents(status: 'enabled' | 'hidden'): Promise<void> {
  const targets = pendingEvents.value.filter((pending) => selectedPendingEventIds.value.includes(pending.id))
  if (!targets.length) {
    message.warning('请先勾选待验收事件')
    return
  }
  let succeeded = 0
  const failed: string[] = []
  for (const pending of targets) {
    try {
      const event = await userBehaviorDataService.approvePendingEvent(pending.id, pending.eventName, status)
      await completeApprovedMetadataInfo('event', event.id, {
        displayName: pending.eventName,
        description: `待验收批量转正事件，样例属性：${pending.sampleProperties.join('、') || '无'}`,
        categoryId: defaultApprovalCategoryId(),
        tags: ['待验收转正', '批量验收'],
        owner: '数据管理员',
        businessDefinition: `批量验收生成，首次出现 ${pending.firstSeenAt}，样例条数 ${pending.sampleCount}`,
        sensitiveLevel: 'internal',
      })
      succeeded += 1
    } catch (error) {
      failed.push(`${pending.eventName}：${error instanceof Error ? error.message : String(error)}`)
    }
  }
  selectedPendingEventIds.value = []
  await refreshEvents()
  message[failed.length ? 'warning' : 'success'](`待验收事件批量处理完成：成功 ${succeeded} 个${failed.length ? `，失败 ${failed.length} 个：${failed.join('；')}` : ''}`)
}

async function handleBatchBlacklistPendingEvents(): Promise<void> {
  const targets = pendingEvents.value.filter((pending) => selectedPendingEventIds.value.includes(pending.id))
  if (!targets.length) {
    message.warning('请先勾选待验收事件')
    return
  }
  let succeeded = 0
  const failed: string[] = []
  for (const pending of targets) {
    try {
      await userBehaviorDataService.blacklistPendingEvent(pending.id)
      succeeded += 1
    } catch (error) {
      failed.push(`${pending.eventName}：${error instanceof Error ? error.message : String(error)}`)
    }
  }
  selectedPendingEventIds.value = []
  await refreshEvents()
  message[failed.length ? 'warning' : 'success'](`待验收事件黑名单处理完成：成功 ${succeeded} 个${failed.length ? `，失败 ${failed.length} 个：${failed.join('；')}` : ''}`)
}

async function handleCreateEventProperty(): Promise<void> {
  try {
    await userBehaviorDataService.createEventProperty({
      propertyName: propertyForm.propertyName,
      displayName: propertyForm.displayName,
      description: propertyForm.description,
      dataType: propertyForm.dataType,
      propertyScope: propertyForm.propertyScope,
      associatedEventIds: propertyForm.associatedEventIds,
    })
    showPropertyModal.value = false
    Object.assign(propertyForm, { propertyName: '', displayName: '', description: '', dataType: 'string', propertyScope: 'event_param', associatedEventIds: [] })
    await refreshProperties()
    await refreshEvents()
    message.success('事件属性创建成功')
  } catch (error) {
    handleError(error)
  }
}

async function handleCreateUserProperty(): Promise<void> {
  try {
    await userBehaviorDataService.createUserProperty(userPropertyForm)
    showUserPropertyModal.value = false
    Object.assign(userPropertyForm, { propertyName: '', displayName: '', description: '', dataType: 'string', calculationLogic: 'latest_value' })
    await refreshProperties()
    message.success('用户属性创建成功')
  } catch (error) {
    handleError(error)
  }
}

async function handleApprovePendingEventProperty(pending: PendingEventProperty, status: 'enabled' | 'hidden'): Promise<void> {
  try {
    const property = await userBehaviorDataService.approvePendingEventProperty(pending.id, pending.propertyName, status)
    await completeApprovedMetadataInfo('event_property', property.id, {
      displayName: pending.propertyName,
      description: `待验收转正事件属性，所属事件：${pending.eventName}，样例值：${pending.sampleValue}`,
      tags: ['待验收转正', pending.eventName === 'event_common_header' ? '事件公共属性' : '事件属性'],
      owner: '数据管理员',
      unit: ['int', 'float'].includes(pending.detectedType) ? '待确认' : undefined,
      businessDefinition: `由上报样例验收生成，首次出现 ${pending.firstSeenAt}，识别类型 ${pending.detectedType}`,
      sensitiveLevel: 'internal',
    })
    await refreshProperties()
    await refreshEvents()
    message.success('待验收事件属性已通过')
  } catch (error) {
    handleError(error)
  }
}

async function handleBlacklistPendingEventProperty(pending: PendingEventProperty): Promise<void> {
  try {
    await userBehaviorDataService.blacklistPendingEventProperty(pending.id)
    await refreshProperties()
    message.success('待验收事件属性已加入黑名单')
  } catch (error) {
    handleError(error)
  }
}

async function handleBatchApprovePendingEventProperties(status: 'enabled' | 'hidden'): Promise<void> {
  const targets = pendingEventProperties.value.filter((pending) => selectedPendingEventPropertyIds.value.includes(pending.id))
  if (!targets.length) {
    message.warning('请先勾选待验收事件属性')
    return
  }
  let succeeded = 0
  const failed: string[] = []
  for (const pending of targets) {
    try {
      const property = await userBehaviorDataService.approvePendingEventProperty(pending.id, pending.propertyName, status)
      await completeApprovedMetadataInfo('event_property', property.id, {
        displayName: pending.propertyName,
        description: `待验收批量转正事件属性，所属事件：${pending.eventName}，样例值：${pending.sampleValue}`,
        tags: ['待验收转正', '批量验收'],
        owner: '数据管理员',
        unit: ['int', 'float'].includes(pending.detectedType) ? '待确认' : undefined,
        businessDefinition: `批量验收生成，首次出现 ${pending.firstSeenAt}，识别类型 ${pending.detectedType}`,
        sensitiveLevel: 'internal',
      })
      succeeded += 1
    } catch (error) {
      failed.push(`${pending.propertyName}：${error instanceof Error ? error.message : String(error)}`)
    }
  }
  selectedPendingEventPropertyIds.value = []
  await refreshProperties()
  await refreshEvents()
  message[failed.length ? 'warning' : 'success'](`待验收事件属性批量处理完成：成功 ${succeeded} 个${failed.length ? `，失败 ${failed.length} 个：${failed.join('；')}` : ''}`)
}

async function handleBatchBlacklistPendingEventProperties(): Promise<void> {
  const targets = pendingEventProperties.value.filter((pending) => selectedPendingEventPropertyIds.value.includes(pending.id))
  if (!targets.length) {
    message.warning('请先勾选待验收事件属性')
    return
  }
  let succeeded = 0
  const failed: string[] = []
  for (const pending of targets) {
    try {
      await userBehaviorDataService.blacklistPendingEventProperty(pending.id)
      succeeded += 1
    } catch (error) {
      failed.push(`${pending.propertyName}：${error instanceof Error ? error.message : String(error)}`)
    }
  }
  selectedPendingEventPropertyIds.value = []
  await refreshProperties()
  message[failed.length ? 'warning' : 'success'](`待验收事件属性黑名单处理完成：成功 ${succeeded} 个${failed.length ? `，失败 ${failed.length} 个：${failed.join('；')}` : ''}`)
}

async function handleApprovePendingUserProperty(pending: PendingUserProperty, status: 'enabled' | 'hidden'): Promise<void> {
  try {
    const property = await userBehaviorDataService.approvePendingUserProperty(pending.id, pending.propertyName, userPropertyForm.calculationLogic, status)
    await completeApprovedMetadataInfo('user_property', property.id, {
      displayName: pending.propertyName,
      description: `待验收转正用户属性，样例值：${pending.sampleValue}`,
      tags: ['待验收转正', '用户属性'],
      owner: '用户增长团队',
      unit: ['int', 'float'].includes(pending.detectedType) ? '待确认' : undefined,
      businessDefinition: `由用户属性样例验收生成，首次出现 ${pending.firstSeenAt}，识别类型 ${pending.detectedType}`,
      sensitiveLevel: 'internal',
    })
    await refreshProperties()
    message.success('待验收用户属性已通过')
  } catch (error) {
    handleError(error)
  }
}

async function handleBlacklistPendingUserProperty(pending: PendingUserProperty): Promise<void> {
  try {
    await userBehaviorDataService.blacklistPendingUserProperty(pending.id)
    await refreshProperties()
    message.success('待验收用户属性已加入黑名单')
  } catch (error) {
    handleError(error)
  }
}

async function handleBatchApprovePendingUserProperties(status: 'enabled' | 'hidden'): Promise<void> {
  const targets = pendingUserProperties.value.filter((pending) => selectedPendingUserPropertyIds.value.includes(pending.id))
  if (!targets.length) {
    message.warning('请先勾选待验收用户属性')
    return
  }
  let succeeded = 0
  const failed: string[] = []
  for (const pending of targets) {
    try {
      const property = await userBehaviorDataService.approvePendingUserProperty(pending.id, pending.propertyName, userPropertyForm.calculationLogic, status)
      await completeApprovedMetadataInfo('user_property', property.id, {
        displayName: pending.propertyName,
        description: `待验收批量转正用户属性，样例值：${pending.sampleValue}`,
        tags: ['待验收转正', '批量验收'],
        owner: '用户增长团队',
        unit: ['int', 'float'].includes(pending.detectedType) ? '待确认' : undefined,
        businessDefinition: `批量验收生成，首次出现 ${pending.firstSeenAt}，识别类型 ${pending.detectedType}`,
        sensitiveLevel: 'internal',
      })
      succeeded += 1
    } catch (error) {
      failed.push(`${pending.propertyName}：${error instanceof Error ? error.message : String(error)}`)
    }
  }
  selectedPendingUserPropertyIds.value = []
  await refreshProperties()
  message[failed.length ? 'warning' : 'success'](`待验收用户属性批量处理完成：成功 ${succeeded} 个${failed.length ? `，失败 ${failed.length} 个：${failed.join('；')}` : ''}`)
}

async function handleBatchBlacklistPendingUserProperties(): Promise<void> {
  const targets = pendingUserProperties.value.filter((pending) => selectedPendingUserPropertyIds.value.includes(pending.id))
  if (!targets.length) {
    message.warning('请先勾选待验收用户属性')
    return
  }
  let succeeded = 0
  const failed: string[] = []
  for (const pending of targets) {
    try {
      await userBehaviorDataService.blacklistPendingUserProperty(pending.id)
      succeeded += 1
    } catch (error) {
      failed.push(`${pending.propertyName}：${error instanceof Error ? error.message : String(error)}`)
    }
  }
  selectedPendingUserPropertyIds.value = []
  await refreshProperties()
  message[failed.length ? 'warning' : 'success'](`待验收用户属性黑名单处理完成：成功 ${succeeded} 个${failed.length ? `，失败 ${failed.length} 个：${failed.join('；')}` : ''}`)
}

async function handleChangePropertyType(): Promise<void> {
  try {
    if (typeChangeForm.targetKind === 'event') {
      await userBehaviorDataService.changeEventPropertyType(typeChangeForm.targetId, typeChangeForm.dataType, typeChangeForm.confirmed)
    } else {
      await userBehaviorDataService.changeUserPropertyType(typeChangeForm.targetId, typeChangeForm.dataType, typeChangeForm.confirmed)
    }
    Object.assign(typeChangeForm, { targetId: '', confirmed: false })
    await refreshProperties()
    await refreshVirtuals()
    message.success('数据类型已修改，相关虚拟属性会按引用状态更新')
  } catch (error) {
    handleError(error)
  }
}

async function handlePropertyStatus(kind: 'event' | 'user', id: string, status: MetadataStatus): Promise<void> {
  try {
    const confirmed = status === 'disabled' ? window.confirm('禁用前将加载血缘影响范围。确认继续？') : true
    if (kind === 'event') {
      await userBehaviorDataService.updateEventPropertyStatus(id, status, confirmed)
    } else {
      await userBehaviorDataService.updateUserPropertyStatus(id, status, confirmed)
    }
    await refreshProperties()
    await refreshVirtuals()
    message.success('状态已更新')
  } catch (error) {
    handleError(error)
  }
}

function parseMappings(): DataIntegrationTask['fieldMappings'] {
  return integrationForm.mappingText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [sourceField = '', targetField = '', targetType = 'event_param', dataType = 'string', required = 'false'] = line.split(',').map((item) => item.trim())
      return {
        sourceField,
        targetField,
        targetType: targetType as DataIntegrationTask['fieldMappings'][number]['targetType'],
        dataType: dataType as PropertyDataType,
        required: required === 'true',
      }
    })
}

async function handleTestKafka(): Promise<void> {
  const result = await userBehaviorDataService.testKafkaConnection({
    consumerGroup: integrationForm.consumerGroup,
    bootstrapServers: integrationForm.bootstrapServers.split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
    topic: integrationForm.topic,
    authType: integrationForm.authType,
    username: integrationForm.username,
    password: integrationForm.password,
  })
  integrationConnectionMessage.value = result.message
  message[result.success ? 'success' : 'error'](result.message)
}

async function handleParseKafka(): Promise<void> {
  try {
    const result = await userBehaviorDataService.parseKafkaSample(integrationForm.sourceType)
    kafkaFields.value = result.fields
    kafkaPreview.value = result.rawMessage
    message.success('样例数据解析成功')
  } catch (error) {
    handleError(error)
  }
}

async function handleValidateCustomConfig(): Promise<void> {
  try {
    const result = await userBehaviorDataService.validateCustomUploadConfig(integrationForm.customConfigText)
    integrationConnectionMessage.value = result.message
    if (result.success && result.mappingText) {
      integrationForm.mappingText = result.mappingText
      kafkaPreview.value = integrationForm.customConfigText
    }
    message[result.success ? 'success' : 'error'](result.message)
  } catch (error) {
    handleError(error)
  }
}

async function handleCreateIntegrationTask(): Promise<void> {
  try {
    await userBehaviorDataService.createIntegrationTask({
      taskName: integrationForm.taskName,
      description: integrationForm.description,
      sourceType: integrationForm.sourceType,
      configMode: integrationForm.configMode,
      kafkaConfig: {
        consumerGroup: integrationForm.consumerGroup,
        bootstrapServers: integrationForm.bootstrapServers.split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
        topic: integrationForm.topic,
        authType: integrationForm.authType,
        username: integrationForm.username,
        password: integrationForm.password,
      },
      fieldMappings: parseMappings(),
    })
    await refreshIntegrationTasks()
    await refreshEvents()
    message.success('任务已保存并进入 running 状态')
  } catch (error) {
    handleError(error)
  }
}

async function handleIntegrationStatus(task: DataIntegrationTask, status: DataIntegrationTask['status']): Promise<void> {
  try {
    await userBehaviorDataService.updateIntegrationTaskStatus(task.id, status)
    await refreshIntegrationTasks()
    message.success('任务状态已更新')
  } catch (error) {
    handleError(error)
  }
}

async function handleCreateVirtualEvent(): Promise<void> {
  try {
    const filters =
      virtualEventForm.filterField && virtualEventForm.filterValue
        ? [{ field: virtualEventForm.filterField, operator: '=' as const, value: virtualEventForm.filterValue }]
        : []
    await userBehaviorDataService.createVirtualEvent({
      eventName: virtualEventForm.eventName,
      displayName: virtualEventForm.displayName,
      description: virtualEventForm.description,
      components: virtualEventForm.componentEventIds.map((eventId) => ({ eventId, filters })),
    })
    showVirtualEventModal.value = false
    Object.assign(virtualEventForm, { eventName: '', displayName: '', description: '', componentEventIds: [], filterField: '', filterValue: '' })
    await refreshVirtuals()
    message.success('虚拟事件创建成功')
  } catch (error) {
    handleError(error)
  }
}

async function handleVirtualEventStatus(event: VirtualEvent, status: VirtualEvent['status']): Promise<void> {
  try {
    await userBehaviorDataService.updateVirtualEventStatus(event.id, status)
    await refreshVirtuals()
    message.success('虚拟事件状态已更新')
  } catch (error) {
    handleError(error)
  }
}

async function handleDeleteVirtualEvent(event: VirtualEvent): Promise<void> {
  if (!window.confirm('删除虚拟事件前会检查分析引用。确认删除？')) {
    return
  }
  await userBehaviorDataService.deleteVirtualEvent(event.id)
  await refreshVirtuals()
  message.success('虚拟事件已删除')
}

async function handleValidateSql(): Promise<void> {
  try {
    sqlValidation.value = await userBehaviorDataService.validateSqlExpression(virtualPropertyForm)
    message[sqlValidation.value.valid ? 'success' : 'error'](sqlValidation.value.valid ? 'SQL 校验通过' : 'SQL 校验失败')
  } catch (error) {
    handleError(error)
  }
}

async function handleCreateVirtualProperty(): Promise<void> {
  try {
    await userBehaviorDataService.createVirtualProperty(virtualPropertyForm)
    showVirtualPropertyModal.value = false
    sqlValidation.value = null
    Object.assign(virtualPropertyForm, {
      propertyType: 'event_virtual_property',
      propertyName: '',
      displayName: '',
      description: '',
      dataType: 'string',
      sqlExpression: 'domain(event_params.full_url)',
      associationMode: 'any_referenced_property_has_value',
    })
    await refreshVirtuals()
    message.success('虚拟属性创建成功')
  } catch (error) {
    handleError(error)
  }
}

function openVirtualPropertyEditModal(property: VirtualProperty): void {
  selectedVirtualPropertyId.value = property.id
  Object.assign(virtualPropertyEditForm, {
    propertyType: property.propertyType,
    displayName: property.displayName ?? '',
    description: property.description ?? '',
    dataType: property.dataType,
    sqlExpression: property.sqlExpression,
    associationMode: property.associationMode ?? 'any_referenced_property_has_value',
    confirmedDictionaryDelete: false,
  })
  sqlValidation.value = null
  showVirtualPropertyEditModal.value = true
}

async function handleUpdateVirtualProperty(): Promise<void> {
  try {
    await userBehaviorDataService.updateVirtualProperty(selectedVirtualPropertyId.value, virtualPropertyEditForm)
    showVirtualPropertyEditModal.value = false
    sqlValidation.value = null
    await refreshVirtuals()
    await refreshDictionaries()
    message.success('虚拟属性已更新')
  } catch (error) {
    handleError(error)
  }
}

async function handleDeleteVirtualProperty(property: VirtualProperty): Promise<void> {
  if (!window.confirm('删除虚拟属性会记录审计日志，并影响使用该字段的分析。确认删除？')) {
    return
  }
  await userBehaviorDataService.deleteVirtualProperty(property.id)
  await refreshVirtuals()
  message.success('虚拟属性已删除')
}

async function handleStartVisualSelection(platform: VisualEvent['platform']): Promise<void> {
  try {
    visualSelectionSession.value = await userBehaviorDataService.createVisualSelectionSession(
      platform,
      platform === 'web' ? visualSelectionForm.targetUrl : undefined,
    )
    visualSelectionForm.platform = platform
    message[visualSelectionSession.value.status === 'active' ? 'success' : 'error'](visualSelectionSession.value.message)
  } catch (error) {
    handleError(error)
  }
}

async function handleUpdateVisualToolMode(): Promise<void> {
  try {
    visualSelectionSession.value = await userBehaviorDataService.updateVisualSelectionToolMode(
      visualSelectionForm.toolMode,
      visualSelectionForm.highlightDefined,
    )
    message.success(visualSelectionSession.value.message)
  } catch (error) {
    handleError(error)
  }
}

async function handleCreateVisualEvent(): Promise<void> {
  try {
    await userBehaviorDataService.createVisualEvent(visualEventForm)
    showVisualEventModal.value = false
    Object.assign(visualEventForm, { eventName: '', description: '', platform: 'web', pageName: '首页', pageRule: 'https://www.example.com/home?*', elementName: '#primary-button' })
    await refreshVisualEvents()
    await refreshEvents()
    message.success('圈选事件已创建，并同步进入事件选择器')
  } catch (error) {
    handleError(error)
  }
}

async function handleVisualEventStatus(event: VisualEvent, status: VisualEvent['status']): Promise<void> {
  try {
    await userBehaviorDataService.updateVisualEventStatus(event.id, status)
    await refreshVisualEvents()
    message.success('圈选事件状态已更新')
  } catch (error) {
    handleError(error)
  }
}

async function handleGenerateRelationEvents(): Promise<void> {
  try {
    const result = await userBehaviorDataService.generateRelationEvents(relationForm.activeEventName, relationForm.targetUuidText)
    relationForm.resultText = `${result.activeEventName} 生成 ${result.generatedCount} 条 ${result.passiveEventName}，$inactive=${result.inactiveParam}，$inline=${result.inlineParam}`
    await refreshEvents()
    message.success('关系事件生成成功')
  } catch (error) {
    handleError(error)
  }
}

async function handleUpdateSession(): Promise<void> {
  try {
    await userBehaviorDataService.updateWebSessionConfig(sessionInterval.value)
    await refreshSessions()
    message.success('会话间隔已保存，后续会话指标将按新规则计算')
  } catch (error) {
    handleError(error)
  }
}

async function handleCreateCustomSession(): Promise<void> {
  try {
    await userBehaviorDataService.createCustomSession(customSessionForm)
    showCustomSessionModal.value = false
    Object.assign(customSessionForm, { sessionName: '', displayName: '', description: '', platformScope: ['web_js'], eventIds: [], cutRuleType: 'time_gap', gapMinutes: 30, startEventId: '', endEventId: '' })
    await refreshSessions()
    message.success('自定义 Session 已创建')
  } catch (error) {
    handleError(error)
  }
}

async function handleCustomSessionStatus(session: CustomSession, status: CustomSession['status']): Promise<void> {
  await userBehaviorDataService.updateCustomSessionStatus(session.id, status)
  await refreshSessions()
  message.success('Session 状态已更新')
}

async function handleDeleteCustomSession(session: CustomSession): Promise<void> {
  if (!window.confirm('删除后分析工具不再可选该 Session，确认删除？')) {
    return
  }
  await userBehaviorDataService.deleteCustomSession(session.id)
  await refreshSessions()
  message.success('Session 已删除')
}

function openCreateCategoryModal(): void {
  categoryModalMode.value = 'create'
  Object.assign(categoryForm, { id: '', name: '', scope: 'public', description: '', isDefault: false })
  showCategoryModal.value = true
}

function openEditCategoryModal(category: EventCategory): void {
  categoryModalMode.value = 'edit'
  Object.assign(categoryForm, {
    id: category.id,
    name: category.name,
    scope: category.scope,
    description: category.description ?? '',
    isDefault: Boolean(category.isDefault),
  })
  showCategoryModal.value = true
}

async function handleSaveCategory(): Promise<void> {
  try {
    if (categoryModalMode.value === 'create') {
      await userBehaviorDataService.createCategory(categoryForm)
    } else {
      await userBehaviorDataService.updateCategory(categoryForm.id, {
        name: categoryForm.name,
        description: categoryForm.description,
        isDefault: categoryForm.isDefault,
      })
    }
    showCategoryModal.value = false
    Object.assign(categoryForm, { id: '', name: '', scope: 'public', description: '', isDefault: false })
    categories.value = await userBehaviorDataService.listCategories()
    message.success(categoryModalMode.value === 'create' ? '分类创建成功' : '分类已更新')
  } catch (error) {
    handleError(error)
  }
}

async function handleAssignCategory(): Promise<void> {
  try {
    await userBehaviorDataService.assignEventToCategory(assignCategoryForm.eventId, assignCategoryForm.categoryId)
    await refreshEvents()
    categories.value = await userBehaviorDataService.listCategories()
    message.success('事件分类已更新')
  } catch (error) {
    handleError(error)
  }
}

async function handleMoveCategory(category: EventCategory, direction: 'up' | 'down'): Promise<void> {
  try {
    categories.value = await userBehaviorDataService.moveCategory(category.id, direction)
    message.success('分类排序已更新')
  } catch (error) {
    handleError(error)
  }
}

async function handleRemoveEventFromCategory(eventId: string, categoryId: string): Promise<void> {
  try {
    await userBehaviorDataService.removeEventFromCategory(eventId, categoryId)
    await refreshEvents()
    categories.value = await userBehaviorDataService.listCategories()
    message.success('事件已移回未分类')
  } catch (error) {
    handleError(error)
  }
}

async function handleDeleteCategory(category: EventCategory): Promise<void> {
  if (!window.confirm('删除分类后，分类内事件将回到未分类。确认删除？')) {
    return
  }
  await userBehaviorDataService.deleteCategory(category.id)
  categories.value = await userBehaviorDataService.listCategories()
  await refreshEvents()
  message.success('分类已删除')
}

async function handleUploadDictionary(): Promise<void> {
  try {
    await userBehaviorDataService.uploadDictionary(dictionaryForm.propertyKind, dictionaryForm.propertyId, dictionaryForm.fileName, dictionaryForm.content)
    showDictionaryModal.value = false
    dictionaryForm.confirmedImpact = false
    await refreshDictionaries()
    await refreshProperties()
    message.success('字典文件上传成功，系统需要约 20-30 分钟更新，请稍后查询')
  } catch (error) {
    handleError(error)
  }
}

function openDictionaryModal(kind?: DictionaryFile['propertyKind'], propertyId?: string): void {
  Object.assign(dictionaryForm, {
    propertyKind: kind ?? dictionaryForm.propertyKind,
    propertyId: propertyId ?? '',
    fileName: 'dictionary.csv',
    content: 'raw_value,translated_value',
    confirmedImpact: false,
  })
  showDictionaryModal.value = true
}

async function handleDictionaryFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    return
  }
  if (!/\.(csv|txt)$/i.test(file.name)) {
    message.error('请上传 csv 或 txt 字典文件')
    input.value = ''
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    message.error('字典文件必须小于 10MB')
    input.value = ''
    return
  }
  dictionaryForm.fileName = file.name
  dictionaryForm.content = await file.text()
  input.value = ''
  message.success('字典文件已读取，可确认上传')
}

async function handleDownloadDictionary(dictionary: DictionaryFile): Promise<void> {
  try {
    const csv = await userBehaviorDataService.downloadDictionary(dictionary.propertyId)
    downloadCsv(csv, dictionary.fileName)
    message.success('字典文件已下载')
  } catch (error) {
    handleError(error)
  }
}

async function handlePreviewDictionaryImpact(dictionary: DictionaryFile): Promise<void> {
  try {
    selectedDictionary.value = dictionary
    dictionaryImpactItems.value = await userBehaviorDataService.previewDictionaryDeleteImpact(dictionary.propertyId)
    showDictionaryImpactDrawer.value = true
    message.success(dictionaryImpactItems.value.length ? '字典影响范围已加载' : '该字典当前无图表或分群引用')
  } catch (error) {
    handleError(error)
  }
}

async function handleDeleteDictionary(dictionary: DictionaryFile): Promise<void> {
  try {
    dictionaryImpactItems.value = await userBehaviorDataService.previewDictionaryDeleteImpact(dictionary.propertyId)
    selectedDictionary.value = dictionary
    showDictionaryImpactDrawer.value = true
    const confirmed = window.confirm(`将删除字典并恢复原始值展示，影响 ${dictionaryImpactItems.value.length} 个图表/分群引用。确认删除？`)
    await userBehaviorDataService.deleteDictionary(dictionary.propertyKind, dictionary.propertyId, confirmed)
    await refreshDictionaries()
    await refreshProperties()
    message.success('字典已删除，查询结果恢复原始值展示')
  } catch (error) {
    handleError(error)
  }
}

async function handleLoadLineage(): Promise<void> {
  try {
    lineageItems.value = await userBehaviorDataService.getLineage(lineageForm.objectType, lineageForm.objectId)
    message.success(lineageItems.value.length > 0 ? '血缘影响范围已加载' : '当前对象暂无血缘引用')
  } catch (error) {
    handleError(error)
  }
}

async function handleCreateRealtimeSession(): Promise<void> {
  try {
    await userBehaviorDataService.createRealtimeSession(realtimeForm)
    await refreshRealtime()
    message.success('验证会话已创建')
  } catch (error) {
    handleError(error)
  }
}

async function handleRealtimeStatus(status: RealtimeVerifySession['status']): Promise<void> {
  try {
    await userBehaviorDataService.updateRealtimeSessionStatus(status)
    await refreshRealtime()
    message.success('验证状态已更新')
  } catch (error) {
    handleError(error)
  }
}

async function handleSimulateLog(): Promise<void> {
  try {
    await userBehaviorDataService.simulateVerifyLog(realtimeForm.simulateEventName)
    await refreshRealtime()
    message.success('实时事件已进入行为流')
  } catch (error) {
    handleError(error)
  }
}

async function handleClearLogs(): Promise<void> {
  await userBehaviorDataService.clearVerifyLogs()
  selectedVerifyLogId.value = ''
  await refreshRealtime()
  message.success('当前页面展示已清空')
}

async function handleManualCorrect(log: VerifyEventLog, success: boolean): Promise<void> {
  await userBehaviorDataService.manualCorrectLog(log.id, success ? 'manual_success' : 'manual_failed', realtimeForm.manualRemark)
  await refreshRealtime()
  message.success('人工校准已保存')
}

async function handleSaveReport(): Promise<void> {
  try {
    await userBehaviorDataService.saveVerifyReport(realtimeForm.reportName)
    await refreshRealtime()
    message.success('验证报告已生成')
  } catch (error) {
    handleError(error)
  }
}

function openReportDrawer(report: VerifyReport): void {
  selectedReport.value = report
  showReportDrawer.value = true
}

async function handleDeleteReport(report: VerifyReport): Promise<void> {
  if (!window.confirm('删除报告后不可恢复，确认删除？')) {
    return
  }
  await userBehaviorDataService.deleteVerifyReport(report.id)
  await refreshRealtime()
  message.success('验证报告已删除')
}

async function handleToggleValidationMode(value: boolean): Promise<void> {
  if (!window.confirm(value ? '开启后约 10 分钟生效，未知事件及属性必须验收后才允许入库。确认开启？' : '关闭后自动入库，已进入待验收列表的数据不会自动验收。确认关闭？')) {
    return
  }
  appContext.value = await userBehaviorDataService.toggleIngestionValidationMode(value)
  message.success('入库校验模式已更新')
}

async function handleExportTrackingPlan(): Promise<void> {
  const csv = await userBehaviorDataService.exportTrackingPlan()
  downloadCsv(csv, 'tracking-plan.csv')
  message.success('埋点方案已导出')
}

async function handleLoadErrors(detail: IngestionDetail): Promise<void> {
  selectedErrorsEvent.value = detail.eventName
  Object.assign(errorFilter, { errorType: 'all', errorCode: '' })
  errorLogs.value = await userBehaviorDataService.listErrorLogs({ eventName: detail.eventName })
  showErrorsDrawer.value = true
}

async function handleApplyErrorFilter(): Promise<void> {
  errorLogs.value = await userBehaviorDataService.listErrorLogs({
    eventName: selectedErrorsEvent.value,
    errorType: errorFilter.errorType,
    errorCode: errorFilter.errorCode,
  })
}

async function handleExportErrors(eventName?: string): Promise<void> {
  const csv = await userBehaviorDataService.exportErrorLogs(eventName ?? {
    errorType: errorFilter.errorType,
    errorCode: errorFilter.errorCode,
  })
  downloadCsv(csv, eventName ? `${eventName}-errors.csv` : 'all-ingestion-errors.csv')
  message.success('错误明细已下载')
}

function openMonitorModalFromDetail(detail?: IngestionDetail): void {
  Object.assign(monitorForm, {
    monitorName: detail ? `${detail.eventName} 入库异常监控` : '',
    objectType: 'event',
    targetName: detail?.eventName ?? '',
    channels: ['email'],
    recipients: 'data-admin@example.com',
    webhook: '',
  })
  showMonitorModal.value = true
}

async function handleCreateMonitor(): Promise<void> {
  try {
    await userBehaviorDataService.createIngestionMonitor({
      monitorName: monitorForm.monitorName,
      objectType: monitorForm.objectType,
      targetName: monitorForm.targetName,
      channels: monitorForm.channels,
      recipients: monitorForm.recipients.split(/[,\n]/).map((item) => item.trim()).filter(Boolean),
      webhook: monitorForm.webhook,
    })
    showMonitorModal.value = false
    Object.assign(monitorForm, { monitorName: '', objectType: 'event', targetName: '', channels: ['email'], recipients: 'data-admin@example.com', webhook: '' })
    await refreshGovernance()
    message.success('监控告警已创建，约 10 分钟后生效')
  } catch (error) {
    handleError(error)
  }
}

async function handleCreateRule(): Promise<void> {
  try {
    await userBehaviorDataService.createValidationRule({
      ruleName: ruleForm.ruleName,
      ruleType: ruleForm.ruleType,
      targetName: ruleForm.targetName,
      conditions: ruleForm.conditions.split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
      intervalMinutes: ruleForm.intervalMinutes,
      alertEnabled: ruleForm.alertEnabled,
      interceptEnabled: ruleForm.interceptEnabled,
    })
    showRuleModal.value = false
    Object.assign(ruleForm, { ruleName: '', ruleType: 'event_property', targetName: '', conditions: '必传校验：属性未上传或 value 为 null', intervalMinutes: 10, alertEnabled: true, interceptEnabled: true })
    await refreshGovernance()
    message.success('校验规则已创建')
  } catch (error) {
    handleError(error)
  }
}

async function handleRuleSettings(rule: ValidationRule, status: ValidationRule['status']): Promise<void> {
  try {
    await userBehaviorDataService.updateValidationRuleSettings(rule.id, {
      alertEnabled: rule.alertEnabled,
      interceptEnabled: rule.interceptEnabled,
      status,
    })
    await refreshGovernance()
    message.success('规则设置已更新')
  } catch (error) {
    handleError(error)
  }
}

function openRuleEditModal(rule: ValidationRule): void {
  selectedRule.value = rule
  Object.assign(ruleEditForm, {
    ruleName: rule.ruleName,
    alertEnabled: rule.alertEnabled,
    interceptEnabled: rule.interceptEnabled,
    status: rule.status,
  })
  showRuleEditModal.value = true
}

async function handleUpdateRule(): Promise<void> {
  if (!selectedRule.value) {
    return
  }
  try {
    await userBehaviorDataService.updateValidationRule(selectedRule.value.id, {
      ruleName: ruleEditForm.ruleName,
      alertEnabled: ruleEditForm.alertEnabled,
      interceptEnabled: ruleEditForm.interceptEnabled,
      status: ruleEditForm.status,
    })
    showRuleEditModal.value = false
    await refreshGovernance()
    message.success('校验规则已更新')
  } catch (error) {
    handleError(error)
  }
}

async function handleDeleteRule(rule: ValidationRule): Promise<void> {
  try {
    await userBehaviorDataService.deleteValidationRule(rule.id)
    await refreshGovernance()
    message.success('校验规则已删除')
  } catch (error) {
    handleError(error)
  }
}

async function handleAlertStatus(alert: AlertRecord, status: AlertRecord['status']): Promise<void> {
  try {
    await userBehaviorDataService.updateAlert(alert.id, status)
    await refreshGovernance()
    message.success('告警状态已更新')
  } catch (error) {
    handleError(error)
  }
}

function openAlertDrawer(alert: AlertRecord): void {
  selectedAlert.value = alert
  showAlertDrawer.value = true
}

function openAlertEditModal(alert: AlertRecord): void {
  selectedAlert.value = alert
  Object.assign(alertEditForm, {
    recipients: alert.recipients.join('\n'),
    channels: [...alert.channels],
    webhook: alert.webhook ?? '',
  })
  showAlertEditModal.value = true
}

async function handleSaveAlertSettings(): Promise<void> {
  if (!selectedAlert.value) {
    return
  }
  try {
    await userBehaviorDataService.updateAlert(
      selectedAlert.value.id,
      selectedAlert.value.status,
      {
        channels: alertEditForm.channels,
        recipients: alertEditForm.recipients.split(/[,\n]/).map((item) => item.trim()).filter(Boolean),
        webhook: alertEditForm.webhook,
      },
    )
    showAlertEditModal.value = false
    await refreshGovernance()
    message.success('告警接收人已更新')
  } catch (error) {
    handleError(error)
  }
}

async function handlePreviewCostEvent(eventId: string): Promise<void> {
  try {
    costImpactPreview.value = await userBehaviorDataService.getMetadataImpactPreview('event', eventId, 'disable')
    showCostImpactDrawer.value = true
  } catch (error) {
    handleError(error)
  }
}

async function handleDisableCostEvents(ids?: string[]): Promise<void> {
  try {
    const eventIds = ids ?? costConfirm.selectedEventIds
    if (!eventIds.length) {
      message.warning('请选择要禁用的事件')
      return
    }
    await userBehaviorDataService.disableCostEvents(eventIds, costConfirm.confirmed)
    costConfirm.selectedEventIds = []
    costConfirm.confirmed = false
    await refreshEvents()
    await refreshGovernance()
    message.success('低 ROI 事件已禁用')
  } catch (error) {
    handleError(error)
  }
}

async function handleCloseAutoTrack(): Promise<void> {
  if (!window.confirm('关闭后自动全埋点事件不再上报，需在 SDK 中配置业务分析所需事件。确认关闭？')) {
    return
  }
  appContext.value = await userBehaviorDataService.closeAutoTrack()
  message.success('全埋点开关已关闭')
}

function openEventDrawer(event: EventMetadata): void {
  selectedEvent.value = event
  eventPropertyAttachForm.propertyIds = []
  showEventDrawer.value = true
}

onMounted(() => {
  void refreshAll()
})
</script>

<template>
  <div class="ubdm-page">
    <div class="page-head">
      <div>
        <div class="page-kicker">元数据管理 / 行为数据管理</div>
        <h1 class="page-title">{{ pageTitle }}</h1>
      </div>
      <n-space>
        <n-tag v-if="appContext" type="info">app_id: {{ appContext.appId }}</n-tag>
        <n-tag v-if="appContext" :type="appContext.sdkSettings.ingestionValidationMode ? 'success' : 'warning'">
          入库校验 {{ appContext.sdkSettings.ingestionValidationMode ? '开启' : '关闭' }}
        </n-tag>
      </n-space>
    </div>

    <div class="section-nav">
      <div v-for="group in groupedRoutes" :key="group.group" class="nav-group">
        <div class="nav-title">{{ group.group }}</div>
        <n-space size="small" wrap>
          <n-button
            v-for="item in group.pages"
            :key="item.path"
            size="small"
            :type="route.path === item.path ? 'primary' : 'default'"
            secondary
            @click="router.push(item.path)"
          >
            {{ item.title }}
          </n-button>
        </n-space>
      </div>
    </div>

    <n-grid :cols="4" :x-gap="12" :y-gap="12" class="summary-grid">
      <n-gi v-for="card in eventSummaryCards" :key="card.label">
        <n-card size="small">
          <n-statistic :label="card.label" :value="card.value" />
        </n-card>
      </n-gi>
    </n-grid>

    <n-card v-if="pageKey === 'access-overview'" :bordered="false" class="content-card">
      <div class="access-overview-layout">
        <section class="overview-panel app-info-panel">
          <div class="panel-title">当前应用信息</div>
          <n-descriptions :column="2" size="small">
            <n-descriptions-item label="项目">{{ appContext?.projectId }}</n-descriptions-item>
            <n-descriptions-item label="应用">{{ appContext?.appName }}</n-descriptions-item>
            <n-descriptions-item label="app_id">{{ appContext?.appId }}</n-descriptions-item>
            <n-descriptions-item label="环境">{{ appContext?.environmentType }}</n-descriptions-item>
            <n-descriptions-item label="地域">{{ appContext?.region }}</n-descriptions-item>
            <n-descriptions-item label="时区">{{ appContext?.timezone }}</n-descriptions-item>
          </n-descriptions>
          <div v-if="appContext" class="settings-grid">
            <div><span>全埋点</span><n-switch :value="appContext.sdkSettings.autoTrackEnabled" @update:value="(value) => handleUpdateSdkSetting('autoTrackEnabled', value)" /></div>
            <div><span>入库校验</span><n-switch :value="appContext.sdkSettings.ingestionValidationMode" @update:value="(value) => handleUpdateSdkSetting('ingestionValidationMode', value)" /></div>
            <div><span>截图采集</span><n-switch :value="appContext.sdkSettings.screenshotCaptureEnabled" @update:value="(value) => handleUpdateSdkSetting('screenshotCaptureEnabled', value)" /></div>
            <div><span>AI 成本治理</span><n-switch :value="appContext.sdkSettings.aiCostGovernanceEnabled" @update:value="(value) => handleUpdateSdkSetting('aiCostGovernanceEnabled', value)" /></div>
          </div>
        </section>
        <section class="overview-panel access-health-panel">
          <div class="panel-title">接入健康</div>
          <n-alert type="info">
            自定义事件和属性应优先完成元数据登记；开启入库校验后，未登记或未验收的数据不允许入库。
          </n-alert>
          <div class="health-metric-grid">
            <div class="health-metric">
              <span>24h 接收事件</span>
              <strong>{{ formatNumber(recentHealth.receivedEventCount) }}</strong>
            </div>
            <div class="health-metric">
              <span>24h 拦截事件</span>
              <strong>{{ formatNumber(recentHealth.interceptedEventCount) }}</strong>
            </div>
            <div class="health-metric">
              <span>异常属性</span>
              <strong>{{ formatNumber(recentHealth.abnormalPropertyCount) }}</strong>
            </div>
            <div class="health-metric">
              <span>健康分</span>
              <strong>{{ recentHealth.healthyScore ?? 0 }}</strong>
            </div>
          </div>
        </section>
      </div>
      <section class="overview-panel mt">
        <div class="panel-title">SDK 版本</div>
        <div class="sdk-version-grid">
          <div v-for="version in sdkVersions" :key="String(version.platform)" class="sdk-version-item">
            <strong>{{ version.platform }}</strong>
            <span>最新 {{ version.latestVersion }}</span>
            <span>实时验证最低 {{ version.minRealtimeVerifyVersion }}</span>
          </div>
        </div>
      </section>
      <section class="overview-panel mt">
        <div class="panel-title">数据模型</div>
        <div class="data-model-grid">
          <div>
            <strong>行为数据</strong>
            <span>事件名称、发生时间、params 事件属性进入统一行为模型。</span>
          </div>
          <div>
            <strong>用户数据</strong>
            <span>user_unique_id、用户属性和计算逻辑进入用户属性管理。</span>
          </div>
          <div>
            <strong>设备数据</strong>
            <span>SDK 自动采集的系统预置公共属性按端类型区分。</span>
          </div>
          <div>
            <strong>Item 数据</strong>
            <span>业务对象属性通过事件属性或维度字典关联分析。</span>
          </div>
        </div>
      </section>
    </n-card>

    <n-card v-if="pageKey === 'report-url'" :bordered="false" class="content-card">
      <div class="toolbar">
        <n-radio-group v-model:value="endpointFilter.environmentType" @update:value="refreshEndpoints">
          <n-radio-button value="saas_cloud_native">SaaS 云原生</n-radio-button>
          <n-radio-button value="saas_non_cloud_native">SaaS 非云原生</n-radio-button>
          <n-radio-button value="private_deployment">私有化</n-radio-button>
        </n-radio-group>
        <n-select v-model:value="endpointFilter.region" :options="[
          { label: '北京', value: 'cn_beijing' },
          { label: '广州', value: 'cn_guangzhou' },
          { label: '柔佛', value: 'ap_southeast_johor' },
          { label: '自定义', value: 'custom' },
        ]" style="width: 180px" @update:value="refreshEndpoints" />
        <n-select v-model:value="endpointFilter.platformGroup" :options="[
          { label: '全部端类型', value: 'all' },
          { label: '客户端', value: 'client' },
          { label: '服务端', value: 'server' },
          { label: 'HTTP API', value: 'http_api' },
        ]" style="width: 160px" @update:value="refreshEndpoints" />
        <n-select v-model:value="endpointFilter.platforms" multiple clearable :options="platformOptions" style="width: 360px" @update:value="refreshEndpoints" />
        <n-input v-if="endpointFilter.environmentType === 'private_deployment'" v-model:value="endpointFilter.customDomain" placeholder="自定义采集域名" style="width: 280px" @update:value="refreshEndpoints" />
      </div>
      <n-alert type="info" class="mt">
        HTTP API 会区分单条上传和批量上传，批量每次最多 50 条；SaaS 云原生必须按地域选择地址，私有化优先展示自定义采集域名。
      </n-alert>
      <n-table :bordered="false" size="small">
        <thead>
          <tr>
            <th>端类型</th>
            <th>地址类型</th>
            <th>上报地址</th>
            <th>配置提示</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="endpoint in endpoints" :key="`${endpoint.platform}-${endpoint.endpointType}-${endpoint.url}`">
            <td>{{ endpoint.platform }}</td>
            <td>{{ endpoint.endpointType }}</td>
            <td class="mono">{{ endpoint.url }}</td>
            <td>
              <div>{{ endpoint.sdkConfigHint }}</div>
              <n-tag v-if="endpoint.whitelistHint?.length" size="small" type="warning">需配置白名单：{{ endpoint.whitelistHint.join('、') }}</n-tag>
            </td>
            <td><n-tag :type="endpoint.supported ? 'success' : 'error'">{{ endpoint.supported ? '支持' : endpoint.unsupportedReason }}</n-tag></td>
            <td><n-button size="small" @click="copyText(endpoint.url, '已复制上报地址')">复制</n-button></td>
          </tr>
        </tbody>
      </n-table>
      <n-empty v-if="!endpoints.length" description="当前筛选无上报地址" />
    </n-card>

    <n-card v-if="pageKey === 'schema'" :bordered="false" class="content-card">
      <n-tabs type="line">
        <n-tab-pane name="types" tab="数据类型规则">
          <n-table :bordered="false" size="small">
            <thead><tr><th>类型</th><th>上报要求</th><th>落库与分析要求</th><th>约束</th></tr></thead>
            <tbody>
              <tr v-for="rule in schemaCatalog?.dataTypeRules" :key="rule.type">
                <td><n-tag>{{ rule.type }}</n-tag></td>
                <td>{{ rule.uploadRequirement }}</td>
                <td>{{ rule.analysisRequirement }}</td>
                <td class="mono">{{ JSON.stringify(rule.constraints) }}</td>
              </tr>
            </tbody>
          </n-table>
        </n-tab-pane>
        <n-tab-pane name="preset" tab="预置属性目录">
          <n-table :bordered="false" size="small">
            <thead><tr><th>属性</th><th>展示名</th><th>类型</th><th>端范围</th><th>采集方式</th><th>说明</th></tr></thead>
            <tbody>
              <tr v-for="property in schemaCatalog?.presetProperties" :key="property.id">
                <td class="mono">{{ property.name }}</td>
                <td>{{ property.displayName }}</td>
                <td>{{ property.dataType }}</td>
                <td>{{ Array.isArray(property.platformScope) ? property.platformScope.join('、') : '跨端' }}</td>
                <td>{{ property.autoCollected ? '自动采集' : property.dataSource }}</td>
                <td>{{ property.description }}</td>
              </tr>
            </tbody>
          </n-table>
        </n-tab-pane>
        <n-tab-pane name="categories" tab="数据分类">
          <div class="card-row">
            <n-card v-for="category in schemaCatalog?.dataCategories" :key="category.type" size="small">
              <div class="card-title">{{ category.type }}</div>
              <n-space wrap>
                <n-tag v-for="item in category.items" :key="item">{{ item }}</n-tag>
              </n-space>
            </n-card>
          </div>
          <n-alert class="mt" type="info">any_event 与 any_active_event 仅作为查询分析伪事件存在，不是真实上报事件，不计费，不进入真实事件日志。</n-alert>
        </n-tab-pane>
        <n-tab-pane name="status" tab="状态规则">
          <n-table :bordered="false" size="small">
            <thead><tr><th>状态</th><th>管理可见</th><th>占配额</th><th>构建存储</th><th>分析可用</th><th>计费</th><th>可导出</th></tr></thead>
            <tbody>
              <tr v-for="rule in schemaCatalog?.statusRules" :key="rule.status">
                <td><n-tag :type="tagType(rule.status)">{{ statusText(rule.status) }}</n-tag></td>
                <td>{{ rule.visibleInManagement ? '是' : '否' }}</td>
                <td>{{ rule.countQuota ? '是' : '否' }}</td>
                <td>{{ rule.buildStorage ? '是' : '否' }}</td>
                <td>{{ rule.availableInAnalysis ? '是' : '否' }}</td>
                <td>{{ rule.billable ? '是' : '否' }}</td>
                <td>{{ rule.exportable ? '是' : '否' }}</td>
              </tr>
            </tbody>
          </n-table>
        </n-tab-pane>
        <n-tab-pane name="recommend" tab="类型选择指导">
          <n-table :bordered="false" size="small">
            <thead><tr><th>场景</th><th>推荐类型</th><th>说明</th></tr></thead>
            <tbody>
              <tr v-for="item in schemaCatalog?.typeRecommendations" :key="item.scene">
                <td>{{ item.scene }}</td>
                <td><n-tag>{{ item.dataType }}</n-tag></td>
                <td>{{ item.description }}</td>
              </tr>
            </tbody>
          </n-table>
        </n-tab-pane>
        <n-tab-pane name="upload" tab="上报模型校验">
          <n-grid :cols="2" :x-gap="16">
            <n-gi>
              <n-input v-model:value="uploadPayloadText" type="textarea" :autosize="{ minRows: 14 }" />
              <n-space class="mt">
                <n-button type="primary" @click="handleValidateBehaviorUpload">执行入库校验</n-button>
                <n-button @click="router.push('/data-management/governance/ingestion-detail')">查看入库明细</n-button>
              </n-space>
            </n-gi>
            <n-gi>
              <n-card size="small" title="校验链路">
                <div v-for="step in uploadValidationResult?.steps" :key="step.name" class="step-row">
                  <n-tag :type="tagType(step.status)">{{ step.status }}</n-tag>
                  <span>{{ step.name }}：{{ step.message }}</span>
                </div>
                <n-empty v-if="!uploadValidationResult" description="粘贴统一行为数据 JSON 后执行校验" />
              </n-card>
              <n-table v-if="uploadValidationResult?.errors.length" :bordered="false" size="small" class="mt">
                <thead><tr><th>错误码</th><th>类型</th><th>事件</th><th>说明</th></tr></thead>
                <tbody>
                  <tr v-for="error in uploadValidationResult.errors" :key="error.id">
                    <td><n-tag type="error">{{ error.errorCode }}</n-tag></td>
                    <td>{{ error.errorType }}</td>
                    <td>{{ error.eventName }}</td>
                    <td>{{ error.message }}</td>
                  </tr>
                </tbody>
              </n-table>
            </n-gi>
          </n-grid>
        </n-tab-pane>
        <n-tab-pane name="codes" tab="错误码">
          <n-table :bordered="false" size="small">
            <thead><tr><th>错误码</th><th>层级</th><th>描述</th><th>处理逻辑</th></tr></thead>
            <tbody>
              <tr v-for="rule in schemaCatalog?.errorCodeRules" :key="rule.code">
                <td><n-tag type="error">{{ rule.code }}</n-tag></td>
                <td>{{ rule.level }}</td>
                <td>{{ rule.description }}</td>
                <td>{{ rule.handling }}</td>
              </tr>
            </tbody>
          </n-table>
        </n-tab-pane>
      </n-tabs>
      <n-alert class="mt" type="warning">
        对象和布尔值允许上报，但统一转为 string 存储；嵌套 JSON 不直接作为结构化字段落库，可通过虚拟属性抽取。
      </n-alert>
    </n-card>

    <n-card v-if="pageKey === 'visual-integration'" :bordered="false" class="content-card">
      <n-grid :cols="2" :x-gap="16">
        <n-gi>
          <n-form label-placement="left" label-width="110">
            <n-form-item label="数据类型">
              <n-radio-group v-model:value="integrationForm.sourceType">
                <n-radio-button value="uba_event_data">UBA 数据</n-radio-button>
                <n-radio-button value="user_profile_data">用户属性</n-radio-button>
              </n-radio-group>
            </n-form-item>
            <n-form-item label="配置模式">
              <n-radio-group v-model:value="integrationForm.configMode">
                <n-radio-button value="visual_mapping">可视化映射</n-radio-button>
                <n-radio-button value="custom_upload">自定义上传配置</n-radio-button>
              </n-radio-group>
            </n-form-item>
            <n-form-item label="任务名称"><n-input v-model:value="integrationForm.taskName" /></n-form-item>
            <n-form-item label="描述"><n-input v-model:value="integrationForm.description" type="textarea" /></n-form-item>
            <n-form-item label="Kafka Server"><n-input v-model:value="integrationForm.bootstrapServers" type="textarea" /></n-form-item>
            <n-form-item label="消费者组"><n-input v-model:value="integrationForm.consumerGroup" /></n-form-item>
            <n-form-item label="Topic"><n-input v-model:value="integrationForm.topic" /></n-form-item>
            <n-form-item label="认证">
              <n-radio-group v-model:value="integrationForm.authType">
                <n-radio-button value="none">无</n-radio-button>
                <n-radio-button value="sasl_plaintext">SASL Plain</n-radio-button>
                <n-radio-button value="sasl_ssl">SASL SSL</n-radio-button>
              </n-radio-group>
            </n-form-item>
            <n-form-item v-if="integrationForm.authType !== 'none'" label="账号"><n-input v-model:value="integrationForm.username" /></n-form-item>
            <n-form-item v-if="integrationForm.authType !== 'none'" label="密码"><n-input v-model:value="integrationForm.password" type="password" /></n-form-item>
            <n-form-item label="字段映射">
              <n-input v-model:value="integrationForm.mappingText" type="textarea" :autosize="{ minRows: 4 }" />
            </n-form-item>
            <n-form-item v-if="integrationForm.configMode === 'custom_upload'" label="配置文件">
              <n-input v-model:value="integrationForm.customConfigText" type="textarea" :autosize="{ minRows: 8 }" />
            </n-form-item>
            <n-space>
              <n-button @click="handleTestKafka">测试连接</n-button>
              <n-button @click="handleParseKafka">解析样例数据</n-button>
              <n-button v-if="integrationForm.configMode === 'custom_upload'" @click="handleValidateCustomConfig">校验配置文件</n-button>
              <n-button type="primary" @click="handleCreateIntegrationTask">保存并执行</n-button>
            </n-space>
            <n-alert v-if="integrationConnectionMessage" class="mt" type="info">{{ integrationConnectionMessage }}</n-alert>
          </n-form>
        </n-gi>
        <n-gi>
          <n-card size="small" title="样例字段树">
            <n-space wrap>
              <n-tag v-for="field in kafkaFields" :key="field">{{ field }}</n-tag>
            </n-space>
            <pre class="payload">{{ kafkaPreview || '点击“解析样例数据”后展示标准上报结构预览。' }}</pre>
          </n-card>
        </n-gi>
      </n-grid>
      <h3>集成任务</h3>
      <n-table :bordered="false" size="small">
        <thead><tr><th>任务</th><th>来源</th><th>配置模式</th><th>状态</th><th>同步/失败</th><th>延迟</th><th>最近运行</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="task in integrationTasks" :key="task.id">
            <td>{{ task.taskName }}</td>
            <td>{{ task.sourceType }}</td>
            <td>{{ task.configMode }}</td>
            <td><n-tag :type="tagType(task.status)">{{ statusText(task.status) }}</n-tag></td>
            <td>{{ formatNumber(task.syncedCount) }} / {{ formatNumber(task.failedCount) }}</td>
            <td>{{ task.latencySeconds }}s</td>
            <td>{{ task.lastRunAt || '-' }}</td>
            <td>
              <n-space size="small">
                <n-button size="small" @click="handleIntegrationStatus(task, task.status === 'running' ? 'paused' : 'running')">{{ task.status === 'running' ? '暂停' : '运行' }}</n-button>
                <n-button size="small" @click="handleIntegrationStatus(task, 'failed')">标记失败</n-button>
              </n-space>
            </td>
          </tr>
        </tbody>
      </n-table>
    </n-card>

    <n-card v-if="pageKey === 'events'" :bordered="false" class="content-card">
      <div class="metadata-command-bar">
        <div class="metadata-filter-row">
          <n-input v-model:value="eventFilter.keyword" clearable placeholder="搜索事件名称或展示名" class="event-search-control" />
          <n-select v-model:value="eventFilter.status" :options="statusOptions" class="filter-select" @update:value="refreshEvents" />
          <n-select v-model:value="eventFilter.categoryId" :options="[{ label: '全部分类', value: 'all' }, ...categoryOptions.filter((item) => item.value)]" class="filter-select wide" @update:value="refreshEvents" />
          <n-select v-model:value="eventFilter.sourceType" :options="[
            { label: '全部来源', value: 'all' },
            { label: '预置', value: 'preset' },
            { label: '自定义', value: 'custom' },
            { label: '集成', value: 'integrated' },
            { label: '关系生成', value: 'relation_generated' },
          ]" class="filter-select" @update:value="refreshEvents" />
          <n-select v-model:value="eventFilter.isPreset" :options="[
            { label: '全部预置', value: 'all' },
            { label: '仅预置', value: 'yes' },
            { label: '非预置', value: 'no' },
          ]" class="filter-select compact" @update:value="refreshEvents" />
          <n-select v-model:value="eventFilter.hasScreenshot" :options="[
            { label: '全部截图', value: 'all' },
            { label: '有截图', value: 'yes' },
            { label: '无截图', value: 'no' },
          ]" class="filter-select compact" @update:value="refreshEvents" />
          <n-select v-model:value="eventFilter.queried30d" :options="[
            { label: '全部查询', value: 'all' },
            { label: '30天被查', value: 'yes' },
            { label: '30天未查', value: 'no' },
          ]" class="filter-select compact" @update:value="refreshEvents" />
        </div>
        <div class="metadata-primary-actions">
          <n-button type="primary" @click="showEventModal = true">新建事件</n-button>
          <n-button @click="showBatchModal = true">批量新建</n-button>
          <n-dropdown trigger="click" :options="eventUtilityActionOptions" @select="handleEventUtilityAction">
            <n-button>更多</n-button>
          </n-dropdown>
        </div>
      </div>
      <n-card size="small" class="mt metadata-workbench" title="生产级管理工作台">
        <div class="workbench-layout">
          <div class="workbench-section table-setting-section">
            <span class="section-label">表格管理</span>
            <n-select v-model:value="metadataTableState.sortBy" :options="metadataSortOptions" class="workbench-sort-select" />
            <n-radio-group v-model:value="metadataTableState.sortOrder">
              <n-radio-button value="desc">降序</n-radio-button>
              <n-radio-button value="asc">升序</n-radio-button>
            </n-radio-group>
            <div class="column-setting">
              <span class="muted">字段显示</span>
              <n-select
                v-model:value="metadataTableState.visibleColumns"
                multiple
                :max-tag-count="2"
                :options="metadataColumnOptions"
                placeholder="列设置"
                class="column-select"
              />
            </div>
          </div>
          <div class="workbench-section batch-setting-section">
            <span class="section-label">批量处理</span>
            <n-tag type="info">已选 {{ selectedMetadataIds.length }} 项</n-tag>
            <n-select v-model:value="batchAction" :options="[
              { label: '批量不显示', value: 'hide' },
              { label: '批量启用', value: 'enable' },
              { label: '批量禁用', value: 'disable' },
              { label: '批量删除', value: 'delete' },
            ]" class="batch-action-select" />
            <n-button @click="handlePreviewBatchMetadata">影响预览</n-button>
            <n-button type="primary" @click="handleExecuteBatchMetadata(batchAction, true)">执行</n-button>
            <n-dropdown trigger="click" :options="metadataWorkbenchMoreOptions" @select="handleMetadataWorkbenchMoreAction">
              <n-button>更多操作</n-button>
            </n-dropdown>
          </div>
        </div>
        <n-alert v-if="metadataBatchPreview" :type="metadataBatchPreview.blockedCount ? 'warning' : 'success'">
          可执行 {{ metadataBatchPreview.executableCount }} 项，阻断 {{ metadataBatchPreview.blockedCount }} 项；{{ metadataBatchPreview.warnings.join('；') }}
        </n-alert>
      </n-card>
      <n-table :bordered="false" size="small">
        <thead>
          <tr>
            <th v-if="hasMetadataColumn('selection')"><n-checkbox :checked="metadataRows.length > 0 && metadataRows.every((row) => selectedMetadataIds.includes(row.id))" @update:checked="toggleCurrentPageMetadata" /></th>
            <th v-if="hasMetadataColumn('name')">事件名称</th>
            <th v-if="hasMetadataColumn('displayName')">展示名</th>
            <th>分类</th>
            <th v-if="hasMetadataColumn('status')">状态</th>
            <th>来源</th>
            <th v-if="hasMetadataColumn('owner')">负责人</th>
            <th v-if="hasMetadataColumn('tags')">标签</th>
            <th v-if="hasMetadataColumn('reportingPlatforms')">上报平台</th>
            <th v-if="hasMetadataColumn('hasIngestedData')">有数据</th>
            <th v-if="hasMetadataColumn('registrationSource')">登记来源</th>
            <th v-if="hasMetadataColumn('recent30dQueryCount')">30 天查询</th>
            <th v-if="hasMetadataColumn('yesterdayIngestCount')">昨日入库</th>
            <th v-if="hasMetadataColumn('updatedAt')">更新时间</th>
            <th v-if="hasMetadataColumn('actions')">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in metadataRows" :key="row.id">
            <td v-if="hasMetadataColumn('selection')"><n-checkbox :checked="metadataRowChecked(row)" @update:checked="(checked) => toggleMetadataRow(row, checked)" /></td>
            <td v-if="hasMetadataColumn('name')"><n-button text type="primary" @click="openMetadataDrawer(row.kind, row.id)">{{ row.name }}</n-button></td>
            <td v-if="hasMetadataColumn('displayName')">{{ row.displayName || '-' }}</td>
            <td>{{ categories.find((category) => category.id === row.categoryId)?.name || '未分类' }}</td>
            <td v-if="hasMetadataColumn('status')"><n-tag :type="tagType(row.status)">{{ statusText(row.status) }}</n-tag></td>
            <td>{{ row.sourceType }}</td>
            <td v-if="hasMetadataColumn('owner')">{{ row.owner || '-' }}</td>
            <td v-if="hasMetadataColumn('tags')"><n-space size="small" wrap><n-tag v-for="tag in row.tags" :key="tag" size="small">{{ tag }}</n-tag></n-space></td>
            <td v-if="hasMetadataColumn('reportingPlatforms')">{{ row.reportingPlatforms?.join('、') || '-' }}</td>
            <td v-if="hasMetadataColumn('hasIngestedData')">{{ row.hasIngestedData ? '是' : '否' }}</td>
            <td v-if="hasMetadataColumn('registrationSource')">{{ registrationSourceText(row.registrationSource) }}</td>
            <td v-if="hasMetadataColumn('recent30dQueryCount')">{{ row.recent30dQueryCount }} 次 / {{ row.recent30dQueryUserCount }} 人</td>
            <td v-if="hasMetadataColumn('yesterdayIngestCount')">{{ formatNumber(row.yesterdayIngestCount) }}</td>
            <td v-if="hasMetadataColumn('updatedAt')">{{ row.updatedAt }}</td>
            <td v-if="hasMetadataColumn('actions')">
              <div class="row-actions">
                <n-button size="small" type="primary" secondary @click="openMetadataDrawer(row.kind, row.id)">编辑</n-button>
                <n-dropdown trigger="click" :options="metadataActionOptions(row)" @select="(key) => handleMetadataRowMenu(row, key)">
                  <n-button size="small">更多</n-button>
                </n-dropdown>
              </div>
            </td>
          </tr>
        </tbody>
      </n-table>
      <div class="pagination-row">
        <n-pagination v-model:page="metadataTableState.page" v-model:page-size="metadataTableState.pageSize" show-size-picker :page-sizes="[10, 20, 50]" :item-count="metadataTotal" />
      </div>
      <n-empty v-if="!metadataRows.length" description="暂无事件或筛选无结果">
        <template #extra><n-button @click="Object.assign(eventFilter, { keyword: '', debouncedKeyword: '', status: 'all', sourceType: 'all', categoryId: 'all' }); refreshEvents()">清空筛选</n-button></template>
      </n-empty>
      <h3>待验收事件</h3>
      <n-alert type="info">开启入库校验后，未知事件进入待验收列表；黑名单事件永远不入库。</n-alert>
      <div class="toolbar mt">
        <n-tag type="info">已选 {{ selectedPendingEventIds.length }} 项</n-tag>
        <n-button :disabled="!selectedPendingEventIds.length" type="primary" @click="handleBatchApprovePendingEvents('enabled')">批量验收启用</n-button>
        <n-button :disabled="!selectedPendingEventIds.length" @click="handleBatchApprovePendingEvents('hidden')">批量验收隐藏</n-button>
        <n-button :disabled="!selectedPendingEventIds.length" type="error" @click="handleBatchBlacklistPendingEvents">批量加入黑名单</n-button>
      </div>
      <n-table :bordered="false" size="small" class="mt">
        <thead><tr><th><n-checkbox :checked="pendingEvents.length > 0 && selectedPendingEventIds.length === pendingEvents.length" @update:checked="toggleAllPendingEvents" /></th><th>事件名</th><th>首次出现</th><th>样例条数</th><th>样例属性</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="pending in pendingEvents" :key="pending.id">
            <td><n-checkbox :checked="selectedPendingEventIds.includes(pending.id)" @update:checked="(checked) => togglePendingEvent(pending.id, checked)" /></td>
            <td>{{ pending.eventName }}</td>
            <td>{{ pending.firstSeenAt }}</td>
            <td>{{ pending.sampleCount }}</td>
            <td>{{ pending.sampleProperties.join('、') }}</td>
            <td>
              <div class="row-actions">
                <n-button size="small" type="primary" secondary @click="handleApprovePending(pending, 'enabled')">验收启用</n-button>
                <n-dropdown trigger="click" :options="pendingApprovalActionOptions" @select="(key) => handlePendingEventMenu(pending, key)">
                  <n-button size="small">更多</n-button>
                </n-dropdown>
              </div>
            </td>
          </tr>
        </tbody>
      </n-table>
    </n-card>

    <n-card v-if="pageKey === 'event-properties'" :bordered="false" class="content-card">
      <div class="toolbar">
        <n-input v-model:value="propertyFilter.keyword" clearable placeholder="搜索属性" style="width: 240px" @update:value="refreshProperties" />
        <n-select v-model:value="propertyFilter.status" :options="statusOptions" style="width: 140px" @update:value="refreshProperties" />
        <n-select v-model:value="propertyFilter.dataType" :options="[{ label: '全部类型', value: 'all' }, ...dataTypeOptions]" style="width: 140px" @update:value="refreshProperties" />
        <n-select v-model:value="propertyFilter.scope" :options="[
          { label: '全部范围', value: 'all' },
          { label: '事件属性 params', value: 'event_param' },
          { label: '事件公共属性 header', value: 'event_common_header' },
        ]" style="width: 190px" @update:value="refreshProperties" />
        <n-checkbox v-model:checked="propertyFilter.emptyInfoOnly" @update:checked="refreshProperties">只看展示信息缺失</n-checkbox>
        <n-button type="primary" @click="showPropertyModal = true">新增事件属性</n-button>
        <n-button @click="handleExportPropertyDisplay('event')">导出展示信息</n-button>
      </div>
      <n-card size="small" class="mt file-import-card" title="上传 Excel 批量导入属性展示名和描述">
        <n-alert type="info">支持 .xlsx 文件，至少包含“属性名称、展示名、描述”列；可选“负责人、标签、单位、敏感等级、业务口径”。大批量数据不会在页面展开展示。</n-alert>
        <input ref="eventPropertyDisplayImportInput" class="hidden-file-input" type="file" accept=".xlsx,.csv" @change="(event) => handleImportPropertyDisplayFile('event', event)" />
        <div class="file-import-row">
          <n-button type="primary" @click="eventPropertyDisplayImportInput?.click()">上传 Excel 文件</n-button>
          <span class="muted">{{ importSummaryText(eventPropertyDisplayImportSummary) }}</span>
        </div>
        <n-alert v-if="eventPropertyDisplayImportSummary?.errors.length" class="mt" type="warning">
          前 {{ eventPropertyDisplayImportSummary.errors.length }} 条异常：{{ eventPropertyDisplayImportSummary.errors.map((item) => `第${item.rowNumber}行 ${item.name}：${item.reason}`).join('；') }}
        </n-alert>
      </n-card>
      <n-card size="small" class="mt metadata-workbench" title="生产级管理工作台">
        <div class="toolbar">
          <n-select v-model:value="metadataTableState.sortBy" :options="metadataSortOptions" style="width: 150px" />
          <n-radio-group v-model:value="metadataTableState.sortOrder"><n-radio-button value="desc">降序</n-radio-button><n-radio-button value="asc">升序</n-radio-button></n-radio-group>
          <n-tag type="info">已选 {{ selectedMetadataIds.length }} 项</n-tag>
          <n-select v-model:value="batchAction" :options="[
            { label: '批量不显示', value: 'hide' },
            { label: '批量启用', value: 'enable' },
            { label: '批量禁用', value: 'disable' },
            { label: '批量删除', value: 'delete' },
          ]" style="width: 150px" />
          <n-button @click="handlePreviewBatchMetadata">影响预览</n-button>
          <n-button type="primary" @click="handleExecuteBatchMetadata(batchAction, true)">执行</n-button>
          <n-button @click="showBatchEditModal = true">批量编辑信息</n-button>
          <n-button @click="handleExportSelectedMetadata">导出勾选</n-button>
        </div>
        <n-alert v-if="metadataBatchPreview" :type="metadataBatchPreview.blockedCount ? 'warning' : 'success'">
          可执行 {{ metadataBatchPreview.executableCount }} 项，阻断 {{ metadataBatchPreview.blockedCount }} 项；{{ metadataBatchPreview.warnings.join('；') }}
        </n-alert>
      </n-card>
      <n-table :bordered="false" size="small">
        <thead><tr><th><n-checkbox :checked="metadataRows.length > 0 && metadataRows.every((row) => selectedMetadataIds.includes(row.id))" @update:checked="toggleCurrentPageMetadata" /></th><th>属性名</th><th>展示名</th><th>范围</th><th>类型</th><th>维度字典</th><th>负责人</th><th>标签</th><th>单位</th><th>敏感等级</th><th>上报平台</th><th>有数据</th><th>30 天查询</th><th>昨日入库</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="row in metadataRows" :key="row.id">
            <td><n-checkbox :checked="metadataRowChecked(row)" @update:checked="(checked) => toggleMetadataRow(row, checked)" /></td>
            <td class="mono"><n-button text type="primary" @click="openMetadataDrawer(row.kind, row.id)">{{ row.name }}</n-button></td>
            <td>{{ row.displayName || '-' }}</td>
            <td>{{ row.sourceType === 'event_common_header' ? '事件公共属性' : '事件属性' }}</td>
            <td>{{ row.dataType }}</td>
            <td>
              <n-space size="small" align="center">
                <n-tag size="small" :type="tagType(row.dictionaryStatus || 'none')">{{ statusText(row.dictionaryStatus || 'none') }}</n-tag>
                <n-button size="tiny" @click="openDictionaryModal('event', row.id)">上传</n-button>
              </n-space>
            </td>
            <td>{{ row.owner || '-' }}</td>
            <td><n-space size="small" wrap><n-tag v-for="tag in row.tags" :key="tag" size="small">{{ tag }}</n-tag></n-space></td>
            <td>{{ row.unit || '-' }}</td>
            <td>{{ sensitiveText(row.sensitiveLevel) }}</td>
            <td>{{ row.reportingPlatforms?.join('、') || '-' }}</td>
            <td>{{ row.hasIngestedData ? '是' : '否' }}</td>
            <td>{{ row.recent30dQueryCount }} 次 / {{ row.recent30dQueryUserCount }} 人</td>
            <td>{{ formatNumber(row.yesterdayIngestCount) }}</td>
            <td><n-tag :type="tagType(row.status)">{{ statusText(row.status) }}</n-tag></td>
            <td>
              <div class="row-actions">
                <n-button size="small" type="primary" secondary @click="openMetadataDrawer(row.kind, row.id)">编辑</n-button>
                <n-dropdown trigger="click" :options="metadataActionOptions(row)" @select="(key) => handleMetadataRowMenu(row, key)">
                  <n-button size="small">更多</n-button>
                </n-dropdown>
              </div>
            </td>
          </tr>
        </tbody>
      </n-table>
      <div class="pagination-row">
        <n-pagination v-model:page="metadataTableState.page" v-model:page-size="metadataTableState.pageSize" show-size-picker :page-sizes="[10, 20, 50]" :item-count="metadataTotal" />
      </div>
      <n-card v-if="typeChangeForm.targetKind === 'event' && typeChangeForm.targetId" size="small" class="mt" title="修改事件属性数据类型">
        <n-space align="center">
          <n-select v-model:value="typeChangeForm.dataType" :options="dataTypeOptions" style="width: 140px" />
          <n-checkbox v-model:checked="typeChangeForm.confirmed">已确认历史数据影响和 SDK 上报代码同步</n-checkbox>
          <n-button type="primary" @click="handleChangePropertyType">提交修改</n-button>
        </n-space>
      </n-card>
      <h3>待验收事件属性</h3>
      <div class="toolbar mt">
        <n-tag type="info">已选 {{ selectedPendingEventPropertyIds.length }} 项</n-tag>
        <n-button :disabled="!selectedPendingEventPropertyIds.length" type="primary" @click="handleBatchApprovePendingEventProperties('enabled')">批量验收启用</n-button>
        <n-button :disabled="!selectedPendingEventPropertyIds.length" @click="handleBatchApprovePendingEventProperties('hidden')">批量验收隐藏</n-button>
        <n-button :disabled="!selectedPendingEventPropertyIds.length" type="error" @click="handleBatchBlacklistPendingEventProperties">批量加入黑名单</n-button>
      </div>
      <n-table :bordered="false" size="small" class="mt">
        <thead><tr><th><n-checkbox :checked="pendingEventProperties.length > 0 && selectedPendingEventPropertyIds.length === pendingEventProperties.length" @update:checked="toggleAllPendingEventProperties" /></th><th>属性</th><th>所属事件</th><th>识别类型</th><th>样例值</th><th>首次出现</th><th>样例条数</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="pending in pendingEventProperties" :key="pending.id">
            <td><n-checkbox :checked="selectedPendingEventPropertyIds.includes(pending.id)" @update:checked="(checked) => togglePendingEventProperty(pending.id, checked)" /></td>
            <td class="mono">{{ pending.propertyName }}</td>
            <td>{{ pending.eventName === 'event_common_header' ? '事件公共属性 header' : pending.eventName }}</td>
            <td>{{ pending.detectedType }}</td>
            <td>{{ pending.sampleValue }}</td>
            <td>{{ pending.firstSeenAt }}</td>
            <td>{{ pending.sampleCount }}</td>
            <td>
              <div class="row-actions">
                <n-button size="small" type="primary" secondary @click="handleApprovePendingEventProperty(pending, 'enabled')">验收启用</n-button>
                <n-dropdown trigger="click" :options="pendingApprovalActionOptions" @select="(key) => handlePendingEventPropertyMenu(pending, key)">
                  <n-button size="small">更多</n-button>
                </n-dropdown>
              </div>
            </td>
          </tr>
        </tbody>
      </n-table>
    </n-card>

    <n-card v-if="pageKey === 'user-properties'" :bordered="false" class="content-card">
      <div class="toolbar">
        <n-input v-model:value="propertyFilter.keyword" clearable placeholder="搜索用户属性" style="width: 240px" @update:value="refreshProperties" />
        <n-select v-model:value="propertyFilter.status" :options="statusOptions" style="width: 140px" @update:value="refreshProperties" />
        <n-select v-model:value="propertyFilter.dataType" :options="[{ label: '全部类型', value: 'all' }, ...dataTypeOptions]" style="width: 140px" @update:value="refreshProperties" />
        <n-checkbox v-model:checked="propertyFilter.emptyInfoOnly" @update:checked="refreshProperties">只看展示信息缺失</n-checkbox>
        <n-button type="primary" @click="showUserPropertyModal = true">新增用户属性</n-button>
        <n-button @click="handleExportPropertyDisplay('user')">导出展示信息</n-button>
      </div>
      <n-card size="small" class="mt file-import-card" title="上传 Excel 批量导入用户属性展示名和描述">
        <n-alert type="info">支持 .xlsx 文件，至少包含“属性名称、展示名、描述”列；可选“负责人、标签、单位、敏感等级、业务口径”。大批量数据不会在页面展开展示。</n-alert>
        <input ref="userPropertyDisplayImportInput" class="hidden-file-input" type="file" accept=".xlsx,.csv" @change="(event) => handleImportPropertyDisplayFile('user', event)" />
        <div class="file-import-row">
          <n-button type="primary" @click="userPropertyDisplayImportInput?.click()">上传 Excel 文件</n-button>
          <span class="muted">{{ importSummaryText(userPropertyDisplayImportSummary) }}</span>
        </div>
        <n-alert v-if="userPropertyDisplayImportSummary?.errors.length" class="mt" type="warning">
          前 {{ userPropertyDisplayImportSummary.errors.length }} 条异常：{{ userPropertyDisplayImportSummary.errors.map((item) => `第${item.rowNumber}行 ${item.name}：${item.reason}`).join('；') }}
        </n-alert>
      </n-card>
      <n-card size="small" class="mt metadata-workbench" title="生产级管理工作台">
        <div class="toolbar">
          <n-select v-model:value="metadataTableState.sortBy" :options="metadataSortOptions" style="width: 150px" />
          <n-radio-group v-model:value="metadataTableState.sortOrder"><n-radio-button value="desc">降序</n-radio-button><n-radio-button value="asc">升序</n-radio-button></n-radio-group>
          <n-tag type="info">已选 {{ selectedMetadataIds.length }} 项</n-tag>
          <n-select v-model:value="batchAction" :options="[
            { label: '批量不显示', value: 'hide' },
            { label: '批量启用', value: 'enable' },
            { label: '批量禁用', value: 'disable' },
            { label: '批量删除', value: 'delete' },
          ]" style="width: 150px" />
          <n-button @click="handlePreviewBatchMetadata">影响预览</n-button>
          <n-button type="primary" @click="handleExecuteBatchMetadata(batchAction, true)">执行</n-button>
          <n-button @click="showBatchEditModal = true">批量编辑信息</n-button>
          <n-button @click="handleExportSelectedMetadata">导出勾选</n-button>
        </div>
        <n-alert v-if="metadataBatchPreview" :type="metadataBatchPreview.blockedCount ? 'warning' : 'success'">
          可执行 {{ metadataBatchPreview.executableCount }} 项，阻断 {{ metadataBatchPreview.blockedCount }} 项；{{ metadataBatchPreview.warnings.join('；') }}
        </n-alert>
      </n-card>
      <n-table :bordered="false" size="small">
        <thead><tr><th><n-checkbox :checked="metadataRows.length > 0 && metadataRows.every((row) => selectedMetadataIds.includes(row.id))" @update:checked="toggleCurrentPageMetadata" /></th><th>属性名</th><th>展示名</th><th>类型</th><th>计算逻辑</th><th>维度字典</th><th>负责人</th><th>标签</th><th>单位</th><th>敏感等级</th><th>上报平台</th><th>有数据</th><th>30 天查询</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="row in metadataRows" :key="row.id">
            <td><n-checkbox :checked="metadataRowChecked(row)" @update:checked="(checked) => toggleMetadataRow(row, checked)" /></td>
            <td class="mono"><n-button text type="primary" @click="openMetadataDrawer(row.kind, row.id)">{{ row.name }}</n-button></td>
            <td>{{ row.displayName || '-' }}</td>
            <td>{{ row.dataType }}</td>
            <td>{{ row.sourceType === 'latest_value' ? '计算最终值' : '计算全部值' }}</td>
            <td>
              <n-space size="small" align="center">
                <n-tag size="small" :type="tagType(row.dictionaryStatus || 'none')">{{ statusText(row.dictionaryStatus || 'none') }}</n-tag>
                <n-button size="tiny" @click="openDictionaryModal('user', row.id)">上传</n-button>
              </n-space>
            </td>
            <td>{{ row.owner || '-' }}</td>
            <td><n-space size="small" wrap><n-tag v-for="tag in row.tags" :key="tag" size="small">{{ tag }}</n-tag></n-space></td>
            <td>{{ row.unit || '-' }}</td>
            <td>{{ sensitiveText(row.sensitiveLevel) }}</td>
            <td>{{ row.reportingPlatforms?.join('、') || '-' }}</td>
            <td>{{ row.hasIngestedData ? '是' : '否' }}</td>
            <td>{{ row.recent30dQueryCount }} 次 / {{ row.recent30dQueryUserCount }} 人</td>
            <td><n-tag :type="tagType(row.status)">{{ statusText(row.status) }}</n-tag></td>
            <td>
              <div class="row-actions">
                <n-button size="small" type="primary" secondary @click="openMetadataDrawer(row.kind, row.id)">编辑</n-button>
                <n-dropdown trigger="click" :options="metadataActionOptions(row)" @select="(key) => handleMetadataRowMenu(row, key)">
                  <n-button size="small">更多</n-button>
                </n-dropdown>
              </div>
            </td>
          </tr>
        </tbody>
      </n-table>
      <div class="pagination-row">
        <n-pagination v-model:page="metadataTableState.page" v-model:page-size="metadataTableState.pageSize" show-size-picker :page-sizes="[10, 20, 50]" :item-count="metadataTotal" />
      </div>
      <n-card v-if="typeChangeForm.targetKind === 'user' && typeChangeForm.targetId" size="small" class="mt" title="修改用户属性数据类型">
        <n-space align="center">
          <n-select v-model:value="typeChangeForm.dataType" :options="dataTypeOptions" style="width: 140px" />
          <n-checkbox v-model:checked="typeChangeForm.confirmed">已确认历史归属计算和 SDK 上报影响</n-checkbox>
          <n-button type="primary" @click="handleChangePropertyType">提交修改</n-button>
        </n-space>
      </n-card>
      <h3>待验收用户属性</h3>
      <div class="toolbar mt">
        <n-tag type="info">已选 {{ selectedPendingUserPropertyIds.length }} 项</n-tag>
        <n-button :disabled="!selectedPendingUserPropertyIds.length" type="primary" @click="handleBatchApprovePendingUserProperties('enabled')">批量验收启用</n-button>
        <n-button :disabled="!selectedPendingUserPropertyIds.length" @click="handleBatchApprovePendingUserProperties('hidden')">批量验收隐藏</n-button>
        <n-button :disabled="!selectedPendingUserPropertyIds.length" type="error" @click="handleBatchBlacklistPendingUserProperties">批量加入黑名单</n-button>
      </div>
      <n-table :bordered="false" size="small" class="mt">
        <thead><tr><th><n-checkbox :checked="pendingUserProperties.length > 0 && selectedPendingUserPropertyIds.length === pendingUserProperties.length" @update:checked="toggleAllPendingUserProperties" /></th><th>属性</th><th>识别类型</th><th>样例值</th><th>首次出现</th><th>样例条数</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="pending in pendingUserProperties" :key="pending.id">
            <td><n-checkbox :checked="selectedPendingUserPropertyIds.includes(pending.id)" @update:checked="(checked) => togglePendingUserProperty(pending.id, checked)" /></td>
            <td class="mono">{{ pending.propertyName }}</td>
            <td>{{ pending.detectedType }}</td>
            <td>{{ pending.sampleValue }}</td>
            <td>{{ pending.firstSeenAt }}</td>
            <td>{{ pending.sampleCount }}</td>
            <td>
              <div class="row-actions">
                <n-button size="small" type="primary" secondary @click="handleApprovePendingUserProperty(pending, 'enabled')">验收启用</n-button>
                <n-dropdown trigger="click" :options="pendingApprovalActionOptions" @select="(key) => handlePendingUserPropertyMenu(pending, key)">
                  <n-button size="small">更多</n-button>
                </n-dropdown>
              </div>
            </td>
          </tr>
        </tbody>
      </n-table>
    </n-card>

    <n-card v-if="pageKey === 'virtual-events'" :bordered="false" class="content-card">
      <div class="toolbar"><n-button type="primary" @click="showVirtualEventModal = true">创建虚拟事件</n-button></div>
      <n-card size="small" class="mt metadata-workbench" title="生产级批量操作">
        <div class="toolbar">
          <n-tag type="info">已选 {{ selectedMetadataIds.length }} 项</n-tag>
          <n-select v-model:value="batchAction" :options="[
            { label: '批量启用', value: 'enable' },
            { label: '批量禁用', value: 'disable' },
            { label: '批量删除', value: 'delete' },
          ]" style="width: 150px" />
          <n-button @click="handlePreviewBatchMetadata">影响预览</n-button>
          <n-button type="primary" @click="handleExecuteBatchMetadata(batchAction, true)">执行</n-button>
          <n-button @click="showBatchEditModal = true">批量编辑信息</n-button>
          <n-button @click="handleExportSelectedMetadata">导出勾选</n-button>
        </div>
        <n-alert v-if="metadataBatchPreview" :type="metadataBatchPreview.blockedCount ? 'warning' : 'success'">
          可执行 {{ metadataBatchPreview.executableCount }} 项，阻断 {{ metadataBatchPreview.blockedCount }} 项；{{ metadataBatchPreview.warnings.join('；') }}
        </n-alert>
      </n-card>
      <n-table :bordered="false" size="small">
        <thead><tr><th><n-checkbox :checked="virtualEvents.length > 0 && virtualEvents.every((event) => selectedMetadataIds.includes(event.id))" @update:checked="(checked) => selectedMetadataIds = checked ? virtualEvents.map((event) => event.id) : []" /></th><th>虚拟事件</th><th>展示名</th><th>组合事件</th><th>描述</th><th>状态</th><th>更新时间</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="event in virtualEvents" :key="event.id">
            <td><n-checkbox :checked="selectedMetadataIds.includes(event.id)" @update:checked="(checked) => toggleMetadataId(event.id, checked)" /></td>
            <td class="mono"><n-button text type="primary" @click="openMetadataDrawer('virtual_event', event.id)">{{ event.eventName }}</n-button></td>
            <td>{{ event.displayName }}</td>
            <td>{{ event.combinedEvents.map((item) => item.eventName).join(' OR ') }}</td>
            <td>{{ event.description || '-' }}</td>
            <td><n-tag :type="tagType(event.status)">{{ statusText(event.status) }}</n-tag></td>
            <td>{{ event.updatedAt }}</td>
            <td>
              <div class="row-actions">
                <n-button size="small" type="primary" secondary @click="openMetadataDrawer('virtual_event', event.id)">编辑</n-button>
                <n-dropdown trigger="click" :options="virtualEventActionOptions(event)" @select="(key) => handleVirtualEventMenu(event, key)">
                  <n-button size="small">更多</n-button>
                </n-dropdown>
              </div>
            </td>
          </tr>
        </tbody>
      </n-table>
    </n-card>

    <n-card v-if="pageKey === 'virtual-properties'" :bordered="false" class="content-card">
      <div class="toolbar"><n-button type="primary" @click="showVirtualPropertyModal = true">创建虚拟属性</n-button></div>
      <n-alert type="info">SaaS 每个应用最多 200 个虚拟属性；SQL 修改后已有字典会自动删除并重新校验。</n-alert>
      <n-card size="small" class="mt metadata-workbench" title="生产级批量操作">
        <div class="toolbar">
          <n-tag type="info">已选 {{ selectedMetadataIds.length }} 项</n-tag>
          <n-select v-model:value="batchAction" :options="[
            { label: '批量启用', value: 'enable' },
            { label: '批量禁用', value: 'disable' },
            { label: '批量删除', value: 'delete' },
          ]" style="width: 150px" />
          <n-button @click="handlePreviewBatchMetadata">影响预览</n-button>
          <n-button type="primary" @click="handleExecuteBatchMetadata(batchAction, true)">执行</n-button>
          <n-button @click="showBatchEditModal = true">批量编辑信息</n-button>
          <n-button @click="handleExportSelectedMetadata">导出勾选</n-button>
        </div>
        <n-alert v-if="metadataBatchPreview" :type="metadataBatchPreview.blockedCount ? 'warning' : 'success'">
          可执行 {{ metadataBatchPreview.executableCount }} 项，阻断 {{ metadataBatchPreview.blockedCount }} 项；{{ metadataBatchPreview.warnings.join('；') }}
        </n-alert>
      </n-card>
      <n-table :bordered="false" size="small" class="mt">
        <thead><tr><th><n-checkbox :checked="virtualProperties.length > 0 && virtualProperties.every((property) => selectedMetadataIds.includes(property.id))" @update:checked="(checked) => selectedMetadataIds = checked ? virtualProperties.map((property) => property.id) : []" /></th><th>属性名</th><th>展示名</th><th>类型</th><th>数据类型</th><th>SQL</th><th>引用属性</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="property in virtualProperties" :key="property.id">
            <td><n-checkbox :checked="selectedMetadataIds.includes(property.id)" @update:checked="(checked) => toggleMetadataId(property.id, checked)" /></td>
            <td class="mono"><n-button text type="primary" @click="openMetadataDrawer('virtual_property', property.id)">{{ property.propertyName }}</n-button></td>
            <td>{{ property.displayName || '-' }}</td>
            <td>{{ property.propertyType === 'event_virtual_property' ? '事件虚拟属性' : '用户虚拟属性' }}</td>
            <td>{{ property.dataType }}</td>
            <td class="mono">{{ property.sqlExpression }}</td>
            <td>{{ property.referencedProperties.map((item) => item.propertyName).join('、') }}</td>
            <td><n-tag :type="tagType(property.status)">{{ statusText(property.status) }}</n-tag><span v-if="property.invalidReason">：{{ property.invalidReason }}</span></td>
            <td>
              <div class="row-actions">
                <n-button size="small" type="primary" secondary @click="openMetadataDrawer('virtual_property', property.id)">生产编辑</n-button>
                <n-dropdown trigger="click" :options="virtualPropertyActionOptions(property)" @select="(key) => handleVirtualPropertyMenu(property, key)">
                  <n-button size="small">更多</n-button>
                </n-dropdown>
              </div>
            </td>
          </tr>
        </tbody>
      </n-table>
    </n-card>

    <n-card v-if="pageKey === 'visual-events'" :bordered="false" class="content-card">
      <div class="toolbar"><n-button type="primary" @click="showVisualEventModal = true">新建圈选事件</n-button></div>
      <n-alert type="warning" v-if="!appContext?.sdkSettings.autoTrackEnabled">未检测到全埋点能力，请确认 SDK 配置。</n-alert>
      <n-card size="small" class="mt" title="可视化圈选会话">
        <n-grid :cols="2" :x-gap="16">
          <n-gi>
            <n-form label-placement="left" label-width="110">
              <n-form-item label="网页圈选网址"><n-input v-model:value="visualSelectionForm.targetUrl" /></n-form-item>
              <n-form-item label="工具模式">
                <n-radio-group v-model:value="visualSelectionForm.toolMode">
                  <n-radio-button value="browse">浏览</n-radio-button>
                  <n-radio-button value="select">圈选</n-radio-button>
                  <n-radio-button value="heatmap">热力图</n-radio-button>
                </n-radio-group>
              </n-form-item>
              <n-form-item label="高亮已定义"><n-switch v-model:value="visualSelectionForm.highlightDefined" /></n-form-item>
              <n-space>
                <n-button type="primary" @click="handleStartVisualSelection('web')">启动网页端圈选</n-button>
                <n-button @click="handleStartVisualSelection('app')">生成移动端二维码</n-button>
                <n-button @click="handleUpdateVisualToolMode">应用工具条设置</n-button>
              </n-space>
            </n-form>
          </n-gi>
          <n-gi>
            <n-descriptions :column="1" bordered size="small">
              <n-descriptions-item label="状态">{{ visualSelectionSession ? statusText(visualSelectionSession.status) : '未创建' }}</n-descriptions-item>
              <n-descriptions-item label="模式">{{ visualSelectionSession?.toolMode || '-' }}</n-descriptions-item>
              <n-descriptions-item label="提示">{{ visualSelectionSession?.message || '先创建圈选会话' }}</n-descriptions-item>
              <n-descriptions-item label="二维码">{{ visualSelectionSession?.qrCodeUrl || '-' }}</n-descriptions-item>
            </n-descriptions>
          </n-gi>
        </n-grid>
      </n-card>
      <n-card size="small" class="mt metadata-workbench" title="生产级批量操作">
        <div class="toolbar">
          <n-tag type="info">已选 {{ selectedMetadataIds.length }} 项</n-tag>
          <n-select v-model:value="batchAction" :options="[
            { label: '批量启用', value: 'enable' },
            { label: '批量不显示', value: 'hide' },
            { label: '批量禁用', value: 'disable' },
            { label: '批量删除', value: 'delete' },
          ]" style="width: 150px" />
          <n-button @click="handlePreviewBatchMetadata">影响预览</n-button>
          <n-button type="primary" @click="handleExecuteBatchMetadata(batchAction, true)">执行</n-button>
          <n-button @click="showBatchEditModal = true">批量编辑信息</n-button>
          <n-button @click="handleExportSelectedMetadata">导出勾选</n-button>
        </div>
        <n-alert v-if="metadataBatchPreview" :type="metadataBatchPreview.blockedCount ? 'warning' : 'success'">
          可执行 {{ metadataBatchPreview.executableCount }} 项，阻断 {{ metadataBatchPreview.blockedCount }} 项；{{ metadataBatchPreview.warnings.join('；') }}
        </n-alert>
      </n-card>
      <n-table :bordered="false" size="small" class="mt">
        <thead><tr><th><n-checkbox :checked="visualEvents.length > 0 && visualEvents.every((event) => selectedMetadataIds.includes(event.id))" @update:checked="(checked) => selectedMetadataIds = checked ? visualEvents.map((event) => event.id) : []" /></th><th>事件</th><th>端类型</th><th>页面/页面组</th><th>元素</th><th>48h 触发/人数</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="event in visualEvents" :key="event.id">
            <td><n-checkbox :checked="selectedMetadataIds.includes(event.id)" @update:checked="(checked) => toggleMetadataId(event.id, checked)" /></td>
            <td><n-button text type="primary" @click="openMetadataDrawer('visual_event', event.id)">{{ event.eventName }}</n-button></td>
            <td>{{ event.platform }}</td>
            <td>{{ event.pageName }} / {{ event.pageRule }}</td>
            <td>{{ event.elementName }}</td>
            <td>{{ event.recent48hTriggerCount }} / {{ event.recent48hUserCount }}</td>
            <td><n-tag :type="tagType(event.status)">{{ statusText(event.status) }}</n-tag></td>
            <td>
              <div class="row-actions">
                <n-button size="small" type="primary" secondary @click="openMetadataDrawer('visual_event', event.id)">编辑</n-button>
                <n-dropdown trigger="click" :options="visualEventActionOptions(event)" @select="(key) => handleVisualEventMenu(event, key)">
                  <n-button size="small">更多</n-button>
                </n-dropdown>
              </div>
            </td>
          </tr>
        </tbody>
      </n-table>
    </n-card>

    <n-card v-if="pageKey === 'passive-relation-events'" :bordered="false" class="content-card">
      <n-grid :cols="2" :x-gap="16">
        <n-gi>
          <n-form label-placement="left" label-width="120">
            <n-form-item label="主动事件"><n-input v-model:value="relationForm.activeEventName" /></n-form-item>
            <n-form-item label="目标用户列表"><n-input v-model:value="relationForm.targetUuidText" type="textarea" /></n-form-item>
            <n-button type="primary" @click="handleGenerateRelationEvents">模拟生成被动事件</n-button>
          </n-form>
        </n-gi>
        <n-gi>
          <n-alert type="info">当主动事件上报 $inline="true" 且包含 $target_uuid_list 时，系统为每个目标用户生成 $inactive_ 前缀的被动事件；$inactive 为 string。</n-alert>
          <n-card v-if="relationForm.resultText" size="small" class="mt">{{ relationForm.resultText }}</n-card>
        </n-gi>
      </n-grid>
      <n-card size="small" class="mt metadata-workbench" title="生产级批量操作">
        <div class="toolbar">
          <n-tag type="info">已选 {{ selectedMetadataIds.length }} 项</n-tag>
          <n-select v-model:value="batchAction" :options="[
            { label: '批量启用', value: 'enable' },
            { label: '批量不显示', value: 'hide' },
            { label: '批量禁用', value: 'disable' },
          ]" style="width: 150px" />
          <n-button @click="handlePreviewBatchMetadata">影响预览</n-button>
          <n-button type="primary" @click="handleExecuteBatchMetadata(batchAction, true)">执行</n-button>
          <n-button @click="showBatchEditModal = true">批量编辑信息</n-button>
          <n-button @click="handleExportSelectedMetadata">导出勾选</n-button>
        </div>
        <n-alert v-if="metadataBatchPreview" :type="metadataBatchPreview.blockedCount ? 'warning' : 'success'">
          可执行 {{ metadataBatchPreview.executableCount }} 项，阻断 {{ metadataBatchPreview.blockedCount }} 项；{{ metadataBatchPreview.warnings.join('；') }}
        </n-alert>
      </n-card>
      <n-table :bordered="false" size="small" class="mt">
        <thead><tr><th><n-checkbox :checked="events.filter((item) => item.isRelationEvent || item.isPassiveEvent).length > 0 && events.filter((item) => item.isRelationEvent || item.isPassiveEvent).every((event) => selectedMetadataIds.includes(event.id))" @update:checked="(checked) => selectedMetadataIds = checked ? events.filter((item) => item.isRelationEvent || item.isPassiveEvent).map((event) => event.id) : []" /></th><th>关系/被动事件</th><th>是否关系事件</th><th>是否被动事件</th><th>昨日入库</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="event in events.filter((item) => item.isRelationEvent || item.isPassiveEvent)" :key="event.id">
            <td><n-checkbox :checked="selectedMetadataIds.includes(event.id)" @update:checked="(checked) => toggleMetadataId(event.id, checked)" /></td>
            <td><n-button text type="primary" @click="openMetadataDrawer('relation_event', event.id)">{{ event.eventName }}</n-button></td>
            <td>{{ event.isRelationEvent ? '是' : '否' }}</td>
            <td>{{ event.isPassiveEvent ? '是' : '否' }}</td>
            <td>{{ event.yesterdayIngestCount }}</td>
            <td><n-tag :type="tagType(event.status)">{{ statusText(event.status) }}</n-tag></td>
            <td>
              <div class="row-actions">
                <n-button size="small" type="primary" secondary @click="openMetadataDrawer('relation_event', event.id)">编辑</n-button>
                <n-dropdown trigger="click" :options="relationEventActionOptions()" @select="(key) => handleRelationEventMenu(event, key)">
                  <n-button size="small">更多</n-button>
                </n-dropdown>
              </div>
            </td>
          </tr>
        </tbody>
      </n-table>
    </n-card>

    <n-card v-if="pageKey === 'session'" :bordered="false" class="content-card">
      <n-alert type="info">Web/JS SDK 默认 30 分钟切割；站外访问、超过间隔、系统时区午夜 0 点均会开启新会话。</n-alert>
      <n-form class="mt" label-placement="left" label-width="120">
        <n-form-item label="会话间隔">
          <n-input-number v-model:value="sessionInterval" :min="1" :max="1440" />
          <span class="unit">分钟</span>
        </n-form-item>
        <n-button type="primary" @click="handleUpdateSession">保存设置</n-button>
      </n-form>
      <n-descriptions v-if="webSessionConfig" class="mt" :column="3">
        <n-descriptions-item label="当前间隔">{{ webSessionConfig.intervalMinutes }} 分钟</n-descriptions-item>
        <n-descriptions-item label="更新人">{{ webSessionConfig.updatedBy }}</n-descriptions-item>
        <n-descriptions-item label="更新时间">{{ webSessionConfig.updatedAt }}</n-descriptions-item>
      </n-descriptions>
    </n-card>

    <n-card v-if="pageKey === 'custom-session'" :bordered="false" class="content-card">
      <div class="toolbar"><n-button type="primary" @click="showCustomSessionModal = true">创建 Session</n-button></div>
      <n-card size="small" class="mt metadata-workbench" title="生产级批量操作">
        <div class="toolbar">
          <n-tag type="info">已选 {{ selectedMetadataIds.length }} 项</n-tag>
          <n-select v-model:value="batchAction" :options="[
            { label: '批量启用', value: 'enable' },
            { label: '批量禁用', value: 'disable' },
            { label: '批量删除', value: 'delete' },
          ]" style="width: 150px" />
          <n-button @click="handlePreviewBatchMetadata">影响预览</n-button>
          <n-button type="primary" @click="handleExecuteBatchMetadata(batchAction, true)">执行</n-button>
          <n-button @click="showBatchEditModal = true">批量编辑信息</n-button>
          <n-button @click="handleExportSelectedMetadata">导出勾选</n-button>
        </div>
        <n-alert v-if="metadataBatchPreview" :type="metadataBatchPreview.blockedCount ? 'warning' : 'success'">
          可执行 {{ metadataBatchPreview.executableCount }} 项，阻断 {{ metadataBatchPreview.blockedCount }} 项；{{ metadataBatchPreview.warnings.join('；') }}
        </n-alert>
      </n-card>
      <n-table :bordered="false" size="small">
        <thead><tr><th><n-checkbox :checked="customSessions.length > 0 && customSessions.every((session) => selectedMetadataIds.includes(session.id))" @update:checked="(checked) => selectedMetadataIds = checked ? customSessions.map((session) => session.id) : []" /></th><th>Session</th><th>展示名</th><th>端范围</th><th>事件范围</th><th>切割规则</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="session in customSessions" :key="session.id">
            <td><n-checkbox :checked="selectedMetadataIds.includes(session.id)" @update:checked="(checked) => toggleMetadataId(session.id, checked)" /></td>
            <td class="mono"><n-button text type="primary" @click="openMetadataDrawer('custom_session', session.id)">{{ session.sessionName }}</n-button></td>
            <td>{{ session.displayName }}</td>
            <td>{{ session.platformScope.join('、') }}</td>
            <td>{{ session.eventScope.mode === 'all_events' ? '全部事件' : session.eventScope.eventIds.length + ' 个事件' }}</td>
            <td>
              <span v-if="session.cutRule.type === 'time_gap'">{{ session.cutRule.gapMinutes }} 分钟</span>
              <span v-else>
                {{ events.find((event) => event.id === session.startEventId)?.eventName || session.startEventId }}
                →
                {{ events.find((event) => event.id === session.endEventId)?.eventName || session.endEventId }}
              </span>
            </td>
            <td><n-tag :type="tagType(session.status)">{{ statusText(session.status) }}</n-tag></td>
            <td>
              <div class="row-actions">
                <n-button size="small" type="primary" secondary @click="openMetadataDrawer('custom_session', session.id)">编辑</n-button>
                <n-dropdown trigger="click" :options="customSessionActionOptions(session)" @select="(key) => handleCustomSessionMenu(session, key)">
                  <n-button size="small">更多</n-button>
                </n-dropdown>
              </div>
            </td>
          </tr>
        </tbody>
      </n-table>
    </n-card>

    <n-card v-if="pageKey === 'event-categories'" :bordered="false" class="content-card">
      <div class="toolbar">
        <n-button type="primary" @click="openCreateCategoryModal">创建分类</n-button>
        <n-select v-model:value="assignCategoryForm.eventId" :options="eventSelectOptions" placeholder="选择事件" style="width: 260px" />
        <n-select v-model:value="assignCategoryForm.categoryId" :options="categoryOptions.filter((item) => item.value)" placeholder="选择分类" style="width: 220px" />
        <n-button @click="handleAssignCategory">加入分类</n-button>
      </div>
      <n-alert type="info">公共分类同步到一般事件、虚拟事件和圈选事件筛选；同一分类页中，一个事件只会属于一个分类。未分类为默认兜底，不占 20 个分类名额。</n-alert>
      <n-grid class="mt" :cols="2" :x-gap="16">
        <n-gi>
          <n-card size="small" title="公共分类">
            <n-tag type="info">未分类 {{ uncategorizedEvents.length }} 个</n-tag>
            <n-table :bordered="false" size="small" class="mt">
              <thead><tr><th>分类</th><th>排序</th><th>事件数</th><th>事件</th><th>操作</th></tr></thead>
              <tbody>
                <tr v-for="category in publicCategories" :key="category.id">
                  <td>
                    <n-space size="small" align="center">
                      <span>{{ category.name }}</span>
                      <n-tag v-if="category.isDefault" size="small" type="success">默认</n-tag>
                    </n-space>
                    <div v-if="category.description" class="muted">{{ category.description }}</div>
                  </td>
                  <td>{{ category.sortOrder }}</td>
                  <td>{{ category.eventIds.length }}</td>
                  <td>{{ eventNamesByIds(category.eventIds) }}</td>
                  <td>
                    <div class="row-actions">
                      <n-button size="small" @click="handleMoveCategory(category, 'up')">上移</n-button>
                      <n-button size="small" @click="handleMoveCategory(category, 'down')">下移</n-button>
                      <n-button size="small" type="primary" secondary @click="openEditCategoryModal(category)">编辑</n-button>
                      <n-button size="small" type="error" @click="handleDeleteCategory(category)">删除</n-button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </n-table>
          </n-card>
        </n-gi>
        <n-gi>
          <n-card size="small" title="私人分类">
            <n-tag type="info">仅当前用户可见</n-tag>
            <n-table :bordered="false" size="small" class="mt">
              <thead><tr><th>分类</th><th>排序</th><th>事件数</th><th>事件</th><th>操作</th></tr></thead>
              <tbody>
                <tr v-for="category in privateCategories" :key="category.id">
                  <td>
                    <n-space size="small" align="center">
                      <span>{{ category.name }}</span>
                      <n-tag v-if="category.isDefault" size="small" type="success">默认</n-tag>
                    </n-space>
                    <div v-if="category.description" class="muted">{{ category.description }}</div>
                  </td>
                  <td>{{ category.sortOrder }}</td>
                  <td>{{ category.eventIds.length }}</td>
                  <td>{{ eventNamesByIds(category.eventIds) }}</td>
                  <td>
                    <div class="row-actions">
                      <n-button size="small" @click="handleMoveCategory(category, 'up')">上移</n-button>
                      <n-button size="small" @click="handleMoveCategory(category, 'down')">下移</n-button>
                      <n-button size="small" type="primary" secondary @click="openEditCategoryModal(category)">编辑</n-button>
                      <n-button size="small" type="error" @click="handleDeleteCategory(category)">删除</n-button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </n-table>
          </n-card>
        </n-gi>
      </n-grid>
      <n-table :bordered="false" size="small">
        <thead><tr><th>事件</th><th>当前分类</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="event in events" :key="event.id">
            <td>{{ event.eventName }}</td>
            <td>{{ categories.find((category) => category.id === event.categoryId)?.name || '未分类' }}</td>
            <td><n-button v-if="event.categoryId" size="small" @click="handleRemoveEventFromCategory(event.id, event.categoryId)">移回未分类</n-button></td>
          </tr>
        </tbody>
      </n-table>
    </n-card>

    <n-card v-if="pageKey === 'dimension-dictionary'" :bordered="false" class="content-card">
      <div class="toolbar"><n-button type="primary" @click="openDictionaryModal()">上传字典</n-button><n-button @click="refreshDictionaries">刷新状态</n-button></div>
      <n-alert type="info">UTF-8 csv/txt，每行“原始值,翻译值”，小于 10 万行和 10MB；数值计算仍使用原始值。</n-alert>
      <n-table :bordered="false" size="small" class="mt">
        <thead><tr><th>文件</th><th>属性</th><th>类型</th><th>状态</th><th>行数</th><th>预览</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="dictionary in dictionaries" :key="dictionary.id">
            <td>{{ dictionary.fileName }}</td>
            <td>{{ dictionaryPropertyText(dictionary.propertyId) }}</td>
            <td>{{ dictionary.propertyKind }}</td>
            <td><n-tag :type="tagType(dictionary.status)">{{ statusText(dictionary.status) }}</n-tag></td>
            <td>{{ dictionary.rowCount }}</td>
            <td>{{ dictionary.previewRows.map((row) => `${row.rawValue}=${row.translatedValue}`).join('；') }}</td>
            <td>
              <div class="row-actions">
                <n-button size="small" @click="handlePreviewDictionaryImpact(dictionary)">影响预览</n-button>
                <n-button size="small" @click="handleDownloadDictionary(dictionary)">下载</n-button>
                <n-button size="small" type="error" @click="handleDeleteDictionary(dictionary)">删除</n-button>
              </div>
            </td>
          </tr>
        </tbody>
      </n-table>
    </n-card>

    <n-card v-if="pageKey === 'lineage'" :bordered="false" class="content-card">
      <div class="toolbar">
        <n-select v-model:value="lineageForm.objectType" :options="[
          { label: '一般事件', value: 'event' },
          { label: '事件属性', value: 'event_property' },
          { label: '用户属性', value: 'user_property' },
          { label: '字典值', value: 'dictionary_value' },
        ]" style="width: 160px" />
        <n-select v-model:value="lineageForm.objectId" :options="lineageObjectOptions" filterable style="width: 320px" />
        <n-button type="primary" @click="handleLoadLineage">加载血缘</n-button>
      </div>
      <n-grid v-if="lineageItems.length" :cols="4" :x-gap="12" class="mt">
        <n-gi><n-statistic label="图表" :value="lineageItems.filter((item) => item.usageType === 'chart').length" /></n-gi>
        <n-gi><n-statistic label="看板" :value="lineageItems.filter((item) => item.usageType === 'dashboard').length" /></n-gi>
        <n-gi><n-statistic label="分群" :value="lineageItems.filter((item) => item.usageType === 'segment').length" /></n-gi>
        <n-gi><n-statistic label="间接引用" :value="lineageItems.filter((item) => item.referenceMode === 'indirect').length" /></n-gi>
      </n-grid>
      <n-table :bordered="false" size="small">
        <thead><tr><th>引用对象</th><th>容器</th><th>工具</th><th>引用方式</th><th>引用路径</th><th>近 30 天查询</th><th>创建人</th><th>更新时间</th></tr></thead>
        <tbody>
          <tr v-for="item in lineageItems" :key="item.id">
            <td>{{ item.name }}</td>
            <td>{{ item.containerName || '-' }}</td>
            <td>{{ item.analysisToolType || lineageUsageText(item.usageType) }}</td>
            <td>{{ item.referenceMode === 'direct' ? '直接引用' : '间接引用' }}</td>
            <td>{{ item.referencePath }}</td>
            <td>{{ item.queryCount30d ?? '-' }}</td>
            <td>{{ item.creator }}</td>
            <td>{{ item.updatedAt }}</td>
          </tr>
        </tbody>
      </n-table>
      <n-empty v-if="!lineageItems.length" description="请选择事件、属性或字典值加载血缘影响" />
    </n-card>

    <n-card v-if="pageKey === 'realtime-verify'" :bordered="false" class="content-card realtime-verify-page">
      <div class="verify-top-grid">
        <section class="verify-panel verify-config-panel">
          <div class="verify-panel-head">
            <div>
              <div class="panel-title">连接配置</div>
              <p>按端类型生成测试链接、二维码或服务端参数。</p>
            </div>
            <n-tag :type="tagType(realtimeSession?.status || 'created')">{{ statusText(realtimeSession?.status || 'created') }}</n-tag>
          </div>
          <n-form label-placement="top">
            <n-form-item label="端类型">
              <n-select v-model:value="realtimeForm.platform" :options="[
                { label: 'Android', value: 'android' },
                { label: 'iOS', value: 'ios' },
                { label: 'Web JS', value: 'web_js' },
                { label: '微信小程序', value: 'wechat_mp' },
                { label: '服务端 Java', value: 'server_java' },
              ]" />
            </n-form-item>
            <n-form-item label="验证方式">
              <n-radio-group v-model:value="realtimeForm.verifyMode">
                <n-radio-button value="quick">快速验证</n-radio-button>
                <n-radio-button value="metadata">按元数据</n-radio-button>
                <n-radio-button value="requirement">按需求</n-radio-button>
              </n-radio-group>
            </n-form-item>
            <n-alert type="info">{{ realtimePlatformGuide(realtimeForm.platform) }}</n-alert>
            <n-form-item v-if="realtimeForm.platform === 'web_js' || realtimeForm.platform === 'wechat_mp'" label="验证网址">
              <n-input v-model:value="realtimeForm.targetUrl" />
            </n-form-item>
            <n-form-item v-if="realtimeForm.platform === 'server_java'" label="测试 user_unique_id">
              <n-input v-model:value="realtimeForm.userUniqueId" />
            </n-form-item>
          </n-form>
          <div v-if="['android','ios','wechat_mp'].includes(realtimeForm.platform)" class="verify-qr-row">
            <div class="qr-preview">{{ realtimeSession?.qrCodeUrl ? 'QR' : '待生成' }}</div>
            <div>
              <strong>扫码连接</strong>
              <span>用于 App 或小程序测试设备接入。多设备扫码时按设备维度接收行为流。</span>
            </div>
          </div>
          <div class="verify-actions">
            <n-button type="primary" @click="handleCreateRealtimeSession">生成连接</n-button>
            <n-button @click="handleRealtimeStatus('connected')">开始接收</n-button>
            <n-button @click="handleRealtimeStatus('paused')">暂停</n-button>
            <n-button @click="handleRealtimeStatus('ended')">结束</n-button>
          </div>
        </section>

        <section class="verify-panel verify-session-panel">
          <div class="verify-panel-head">
            <div>
              <div class="panel-title">会话概览</div>
              <p>{{ realtimePlatformText(realtimeSession?.platform || realtimeForm.platform) }} / {{ realtimeSession?.verifyMode === 'quick' ? '快速验证' : realtimeSession?.verifyMode === 'requirement' ? '按需求' : '按元数据' }}</p>
            </div>
            <n-button v-if="realtimeSession?.testUrl" text type="primary" @click="copyText(realtimeSession.testUrl || '', '已复制测试 URL')">复制测试链接</n-button>
          </div>
          <div class="verify-stat-grid">
            <div><span>成功事件</span><strong>{{ verifyStats.success }}</strong></div>
            <div><span>失败事件</span><strong>{{ verifyStats.failed }}</strong></div>
            <div><span>待校验</span><strong>{{ verifyStats.pending }}</strong></div>
            <div><span>总触发</span><strong>{{ verifyStats.total }}</strong></div>
          </div>
          <n-alert class="mt" type="info">
            测试 URL：{{ realtimeSession?.testUrl || '生成连接后显示' }}
          </n-alert>
          <div class="verify-check-grid">
            <div v-for="item in realtimePlatformChecks" :key="item.label" class="verify-check-item">
              <n-tag size="small" :type="item.ok ? 'success' : 'warning'">{{ item.ok ? '通过' : '待处理' }}</n-tag>
              <div>
                <strong>{{ item.label }}</strong>
                <span>{{ item.detail }}</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div class="verify-mode-grid">
        <div v-for="scope in verifyScopeCards" :key="scope.key" :class="['verify-mode-card', { active: realtimeForm.verifyMode === scope.key }]">
          <strong>{{ scope.title }}</strong>
          <span>{{ scope.description }}</span>
        </div>
      </div>

      <div class="verify-command-panel">
        <div class="verify-command-group">
          <n-select v-model:value="realtimeForm.simulateEventName" :options="eventNameOptions" filterable class="verify-event-select" />
          <n-button type="primary" @click="handleSimulateLog">模拟触发事件</n-button>
          <n-button @click="handleClearLogs">清空行为流</n-button>
        </div>
        <div class="verify-command-group report-command">
          <n-input v-model:value="realtimeForm.reportName" placeholder="报告名称" />
          <n-button :disabled="!verifyCanSaveReport" @click="handleSaveReport">保存报告</n-button>
          <span>{{ verifySaveHint }}</span>
        </div>
      </div>

      <div class="verify-workspace">
        <section class="verify-panel verify-stream-panel">
          <div class="verify-panel-head">
            <div>
              <div class="panel-title">行为流</div>
              <p>按触发时间实时追加，点击事件查看校验详情。</p>
            </div>
            <n-tag type="info">{{ verifyLogs.length }} 条</n-tag>
          </div>
          <div class="verify-stream-list">
            <button
              v-for="log in verifyLogs"
              :key="log.id"
              type="button"
              :class="['verify-stream-item', { active: selectedVerifyLog?.id === log.id }]"
              @click="selectVerifyLog(log)"
            >
              <span class="stream-event-name">{{ log.eventName }}</span>
              <span>{{ log.triggerTime }}</span>
              <n-tag size="small" :type="tagType(log.validationResult)">{{ statusText(log.validationResult) }}</n-tag>
              <span v-if="log.screenshots?.length">{{ log.screenshots.length }} 张截图</span>
            </button>
          </div>
          <n-empty v-if="!verifyLogs.length" description="暂无实时事件，请先生成连接并触发测试事件" />
        </section>

        <section class="verify-panel verify-detail-panel">
          <div class="verify-panel-head">
            <div>
              <div class="panel-title">事件详情</div>
              <p>{{ selectedVerifyLog?.eventName || '未选择事件' }}</p>
            </div>
            <n-tag v-if="selectedVerifyLog" :type="tagType(selectedVerifyLog.validationResult)">{{ statusText(selectedVerifyLog.validationResult) }}</n-tag>
          </div>
          <template v-if="selectedVerifyLog">
            <div class="verify-detail-grid">
              <div>
                <span>触发时间</span>
                <strong>{{ selectedVerifyLog.triggerTime }}</strong>
              </div>
              <div>
                <span>截图</span>
                <strong>{{ selectedVerifyLog.screenshots?.length ? `${selectedVerifyLog.screenshots.length} 张` : '-' }}</strong>
              </div>
              <div>
                <span>人工校准</span>
                <strong>{{ selectedVerifyLog.validationResult.startsWith('manual') ? '已校准' : '未校准' }}</strong>
              </div>
            </div>
            <div class="verify-message-list">
              <div v-for="messageItem in selectedVerifyLog.validationMessages" :key="messageItem">{{ messageItem }}</div>
            </div>
            <pre class="payload mt">{{ JSON.stringify(selectedVerifyLog.rawPayload, null, 2) }}</pre>
            <div class="verify-detail-actions">
              <n-input v-model:value="realtimeForm.manualRemark" placeholder="人工复核备注" />
              <n-button @click="handleManualCorrect(selectedVerifyLog, true)">标记正确</n-button>
              <n-button type="error" @click="handleManualCorrect(selectedVerifyLog, false)">标记错误</n-button>
            </div>
          </template>
          <n-empty v-else description="选择左侧行为流中的事件查看详情" />
        </section>
      </div>

      <div class="verify-connection-grid">
        <div v-for="card in realtimeConnectionCards" :key="card.title" class="verify-connection-card">
          <strong>{{ card.title }}</strong>
          <span>{{ card.detail }}</span>
        </div>
      </div>
    </n-card>

    <n-card v-if="pageKey === 'reports'" :bordered="false" class="content-card">
      <div class="toolbar">
        <n-input v-model:value="reportFilter.keyword" clearable placeholder="搜索报告名称或创建人" style="width: 260px" />
        <n-select v-model:value="reportFilter.platform" :options="[
          { label: '全部端类型', value: 'all' },
          { label: 'Android', value: 'android' },
          { label: 'iOS', value: 'ios' },
          { label: 'Web JS', value: 'web_js' },
          { label: '微信小程序', value: 'wechat_mp' },
          { label: '服务端 Java', value: 'server_java' },
        ]" style="width: 160px" />
        <n-select v-model:value="reportFilter.verifyMode" :options="[
          { label: '全部方式', value: 'all' },
          { label: '按元数据', value: 'metadata' },
          { label: '按需求', value: 'requirement' },
        ]" style="width: 150px" />
      </div>
      <n-table :bordered="false" size="small">
        <thead><tr><th>报告名称</th><th>端类型</th><th>验证方式</th><th>总览</th><th>创建人</th><th>创建时间</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="report in filteredVerifyReports" :key="report.id">
            <td>{{ report.reportName }}</td>
            <td>{{ report.platform }}</td>
            <td>{{ report.verifyMode }}</td>
            <td>总 {{ report.summary.totalEvents }} / 成功 {{ report.summary.successEvents }} / 失败 {{ report.summary.failedEvents }} / 人工 {{ report.summary.manualCorrectedEvents }}</td>
            <td>{{ report.createdBy }}</td>
            <td>{{ report.createdAt }}</td>
            <td>
              <div class="row-actions">
                <n-button size="small" @click="openReportDrawer(report)">查看</n-button>
                <n-button size="small" type="error" @click="handleDeleteReport(report)">删除</n-button>
              </div>
            </td>
          </tr>
        </tbody>
      </n-table>
    </n-card>

    <n-card v-if="pageKey === 'governance-dashboard'" :bordered="false" class="content-card">
      <n-grid :cols="6" :x-gap="12">
        <n-gi><n-statistic label="事件拦截率" :value="formatPercent(governanceMetrics?.eventInterceptRate)" /><n-button text type="primary" @click="router.push('/data-management/governance/ingestion-detail')">查看明细</n-button></n-gi>
        <n-gi><n-statistic label="数据错误率" :value="formatPercent(governanceMetrics?.dataErrorRate)" /><n-button text type="primary" @click="router.push('/data-management/governance/ingestion-detail')">错误明细</n-button></n-gi>
        <n-gi><n-statistic label="延迟率" :value="formatPercent(governanceMetrics?.delayRate)" /><n-button text type="primary" @click="router.push('/data-management/governance/ingestion-detail')">延迟明细</n-button></n-gi>
        <n-gi><n-statistic label="接收事件" :value="formatNumber(governanceMetrics?.receivedEventCount)" /><n-button text type="primary" @click="router.push('/data-management/governance/ingestion-detail')">入库明细</n-button></n-gi>
        <n-gi><n-statistic label="拦截事件" :value="formatNumber(governanceMetrics?.interceptedEventCount)" /><n-button text type="primary" @click="router.push('/data-management/governance/ingestion-detail')">拦截明细</n-button></n-gi>
        <n-gi><n-statistic label="异常属性" :value="formatNumber(governanceMetrics?.abnormalPropertyCount)" /><n-button text type="primary" @click="router.push('/data-management/governance/ingestion-detail')">异常明细</n-button></n-gi>
      </n-grid>
      <div class="toolbar mt">
        <span>入库校验模式</span>
        <n-switch :value="appContext?.sdkSettings.ingestionValidationMode" @update:value="handleToggleValidationMode" />
        <n-button type="primary" @click="handleExportTrackingPlan">导出埋点方案</n-button>
        <n-button @click="router.push('/data-management/governance/ingestion-detail')">查看入库明细</n-button>
      </div>
      <n-table :bordered="false" size="small" class="mt">
        <thead><tr><th>元数据类型</th><th>数量</th></tr></thead>
        <tbody>
          <tr v-for="(value, key) in governanceMetrics?.metadataUsage" :key="key"><td>{{ key }}</td><td>{{ value }}</td></tr>
        </tbody>
      </n-table>
    </n-card>

    <n-card v-if="pageKey === 'ingestion-detail'" :bordered="false" class="content-card">
      <div class="toolbar">
        <n-button type="primary" @click="openMonitorModalFromDetail()">创建监控告警</n-button>
        <n-button @click="handleExportErrors()">下载错误明细</n-button>
      </div>
      <n-alert type="info">错误明细默认保留最近 7 天，每个事件详情只展示最新 10 条；可按错误类型和错误码过滤并下载。</n-alert>
      <n-table :bordered="false" size="small">
        <thead><tr><th>事件名称</th><th>SDK</th><th>版本</th><th>错误类型</th><th>接收</th><th>抛弃</th><th>入库</th><th>异常属性</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="detail in ingestionDetails" :key="detail.id">
            <td><n-button text type="primary" @click="handleLoadErrors(detail)">{{ detail.eventName }}</n-button></td>
            <td>{{ detail.sdkType || 'HTTP API' }}</td>
            <td>{{ detail.sdkVersion || '-' }}</td>
            <td>{{ detail.errorType }}</td>
            <td>{{ formatNumber(detail.receivedCount) }}</td>
            <td>{{ formatNumber(detail.discardedCount) }}</td>
            <td>{{ formatNumber(detail.storedCount) }}</td>
            <td>{{ formatNumber(detail.abnormalPropertyCount) }}</td>
            <td>
              <div class="row-actions">
                <n-button size="small" @click="handleExportErrors(detail.eventName)">下载</n-button>
                <n-button size="small" @click="openMonitorModalFromDetail(detail)">建监控</n-button>
              </div>
            </td>
          </tr>
        </tbody>
      </n-table>
    </n-card>

    <n-card v-if="pageKey === 'rules'" :bordered="false" class="content-card">
      <div class="toolbar"><n-button type="primary" @click="showRuleModal = true">创建校验规则</n-button></div>
      <n-table :bordered="false" size="small">
        <thead><tr><th>规则</th><th>类型</th><th>对象</th><th>条件</th><th>告警</th><th>拦截</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="rule in validationRules" :key="rule.id">
            <td>{{ rule.ruleName }}</td>
            <td>{{ rule.ruleType }}</td>
            <td>{{ rule.targetName }}</td>
            <td>{{ rule.conditions.join(' OR ') }}</td>
            <td><n-switch v-model:value="rule.alertEnabled" @update:value="handleRuleSettings(rule, rule.status)" /></td>
            <td><n-switch v-model:value="rule.interceptEnabled" :disabled="rule.ruleType === 'event_volume'" @update:value="handleRuleSettings(rule, rule.status)" /></td>
            <td><n-tag :type="tagType(rule.status)">{{ statusText(rule.status) }}</n-tag></td>
            <td>
              <n-space size="small">
                <n-button size="small" @click="handleRuleSettings(rule, rule.status === 'enabled' ? 'disabled' : 'enabled')">{{ rule.status === 'enabled' ? '关闭' : '开启' }}</n-button>
                <n-button size="small" @click="openRuleEditModal(rule)">编辑</n-button>
                <n-button size="small" type="error" @click="handleDeleteRule(rule)">删除</n-button>
              </n-space>
            </td>
          </tr>
        </tbody>
      </n-table>
    </n-card>

    <n-card v-if="pageKey === 'alerts'" :bordered="false" class="content-card">
      <n-table :bordered="false" size="small">
        <thead><tr><th>监控名称</th><th>来源</th><th>对象</th><th>告警条数</th><th>异常数据</th><th>状态</th><th>最近触发</th><th>渠道</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="alert in alerts" :key="alert.id">
            <td>{{ alert.monitorName }}</td>
            <td>{{ alert.source === 'custom_validation_rule' ? '校验规则配置' : '入库明细监控' }}</td>
            <td>{{ alert.objectType }} / {{ alert.targetName || '-' }}</td>
            <td>{{ alert.alertCount }}</td>
            <td>{{ alert.abnormalDataCount }}</td>
            <td><n-tag :type="tagType(alert.status)">{{ statusText(alert.status) }}</n-tag></td>
            <td>{{ alert.lastTriggeredAt || '-' }}</td>
            <td>{{ alert.channels.join('、') }}</td>
            <td>
              <div class="row-actions">
                <n-button size="small" @click="openAlertDrawer(alert)">详情</n-button>
                <n-button size="small" :disabled="alert.source === 'custom_validation_rule'" @click="openAlertEditModal(alert)">修改</n-button>
                <n-button size="small" :disabled="alert.source === 'custom_validation_rule'" @click="handleAlertStatus(alert, alert.status === 'enabled' ? 'disabled' : 'enabled')">{{ alert.status === 'enabled' ? '关闭' : '开启' }}</n-button>
              </div>
            </td>
          </tr>
        </tbody>
      </n-table>
    </n-card>

    <n-card v-if="pageKey === 'cost'" :bordered="false" class="content-card">
      <n-grid :cols="3" :x-gap="12">
        <n-gi><n-statistic label="已消耗事件量" :value="costGovernance?.consumedEventCount ?? 0" /></n-gi>
        <n-gi><n-statistic label="月均事件使用量" :value="formatNumber(costGovernance?.monthlyAverageEventUsage)" /></n-gi>
        <n-gi><n-button type="error" @click="handleCloseAutoTrack">关闭全埋点</n-button></n-gi>
      </n-grid>
      <div class="card-row">
        <n-card v-for="item in costGovernance?.aiDiagnostics" :key="item.title" size="small">
          <n-tag :type="item.priority === 'P0' ? 'error' : item.priority === 'P1' ? 'warning' : 'info'">{{ item.priority }}</n-tag>
          <div class="card-title">{{ item.title }}</div>
          <div>{{ item.description }}</div>
          <div class="muted">{{ item.action }}</div>
        </n-card>
      </div>
      <div class="toolbar mt">
        <n-select v-model:value="costSortBy" :options="[
          { label: '按成本估算排序', value: 'costEstimate' },
          { label: '按入库量排序', value: 'ingestCount30d' },
          { label: '按查询量排序', value: 'queryCount30d' },
          { label: '按 ROI 排序', value: 'roiScore' },
        ]" style="width: 180px" />
        <n-checkbox v-model:checked="costConfirm.confirmed">我已确认禁用影响</n-checkbox>
        <n-button type="error" @click="handleDisableCostEvents()">批量禁用</n-button>
      </div>
      <n-table :bordered="false" size="small" class="mt">
        <thead><tr><th>选择</th><th>事件</th><th>入库量</th><th>查询次数</th><th>查询人数</th><th>关联图表</th><th>成本估算</th><th>ROI</th><th>建议</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="event in sortedCostEvents" :key="event.eventId">
            <td><n-checkbox :checked="costConfirm.selectedEventIds.includes(event.eventId)" @update:checked="(checked) => checked ? costConfirm.selectedEventIds.push(event.eventId) : costConfirm.selectedEventIds = costConfirm.selectedEventIds.filter((id) => id !== event.eventId)" /></td>
            <td>{{ event.eventName }}</td>
            <td>{{ formatNumber(event.ingestCount30d) }}</td>
            <td>{{ event.queryCount30d }}</td>
            <td>{{ event.queryUserCount30d }}</td>
            <td>{{ event.relatedChartCount }}</td>
            <td>{{ formatNumber(event.costEstimate) }}</td>
            <td>{{ event.roiScore }}</td>
            <td>{{ event.recommendation }}</td>
            <td>
              <div class="row-actions">
                <n-button size="small" @click="handlePreviewCostEvent(event.eventId)">影响预览</n-button>
                <n-button size="small" type="error" @click="handleDisableCostEvents([event.eventId])">禁用</n-button>
              </div>
            </td>
          </tr>
        </tbody>
      </n-table>
    </n-card>

    <n-drawer v-model:show="showEventDrawer" :width="720">
      <n-drawer-content title="事件详情">
        <n-descriptions v-if="selectedEvent" :column="2" bordered>
          <n-descriptions-item label="事件名称">{{ selectedEvent.eventName }}</n-descriptions-item>
          <n-descriptions-item label="展示名">{{ selectedEvent.displayName }}</n-descriptions-item>
          <n-descriptions-item label="描述">{{ selectedEvent.description }}</n-descriptions-item>
          <n-descriptions-item label="状态">{{ statusText(selectedEvent.status) }}</n-descriptions-item>
          <n-descriptions-item label="埋点截图">{{ selectedEvent.screenshotCount }} 张</n-descriptions-item>
          <n-descriptions-item label="昨日入库">{{ selectedEvent.yesterdayIngestCount }}</n-descriptions-item>
        </n-descriptions>
        <n-tabs class="mt">
          <n-tab-pane name="props" tab="事件属性">
            <n-space align="center" class="mb">
              <n-select v-model:value="eventPropertyAttachForm.propertyIds" multiple clearable :options="attachablePropertyOptions" style="width: 360px" />
              <n-button type="primary" @click="handleAttachPropertiesToSelectedEvent">添加事件属性</n-button>
            </n-space>
            <n-space wrap>
              <n-tag v-for="property in eventProperties.filter((item) => selectedEvent?.associatedPropertyIds.includes(item.id))" :key="property.id" closable @close="handleDetachPropertyFromSelectedEvent(property.id)">
                {{ property.propertyName }} / {{ property.dataType }}
              </n-tag>
            </n-space>
          </n-tab-pane>
          <n-tab-pane name="common" tab="公共属性/预置说明">
            <n-space wrap>
              <n-tag v-for="property in eventProperties.filter((item) => item.propertyScope === 'event_common_header')" :key="property.id">
                {{ property.propertyName }} / {{ property.dataType }}
              </n-tag>
            </n-space>
            <n-alert class="mt" type="info">预置事件公共属性由系统或 SDK 采集，前端从服务目录拉取，不允许作为自定义事件属性重复创建。</n-alert>
          </n-tab-pane>
          <n-tab-pane name="screenshots" tab="埋点截图">
            <n-space wrap>
              <n-card v-for="index in selectedEvent?.screenshotCount || 0" :key="index" size="small" class="shot-card">截图 {{ index }}</n-card>
            </n-space>
            <n-empty v-if="!selectedEvent?.screenshotCount" description="当前事件暂无截图" />
          </n-tab-pane>
          <n-tab-pane name="quality" tab="入库质量">
            <n-table :bordered="false" size="small">
              <tbody>
                <tr v-for="detail in ingestionDetails.filter((item) => item.eventName === selectedEvent?.eventName)" :key="detail.id">
                  <td>接收 {{ detail.receivedCount }}</td><td>抛弃 {{ detail.discardedCount }}</td><td>入库 {{ detail.storedCount }}</td><td>异常属性 {{ detail.abnormalPropertyCount }}</td>
                </tr>
              </tbody>
            </n-table>
          </n-tab-pane>
          <n-tab-pane name="lineage" tab="图表/分群血缘">
            <n-button @click="selectedEvent && Object.assign(lineageForm, { objectType: 'event', objectId: selectedEvent.id }); handleLoadLineage()">加载血缘影响</n-button>
          </n-tab-pane>
          <n-tab-pane name="audit" tab="操作日志">
            <n-alert type="info">创建、编辑、状态变更、属性关联等操作均会写入审计日志；治理看板导出的方案也会记录导出日志。</n-alert>
          </n-tab-pane>
        </n-tabs>
      </n-drawer-content>
    </n-drawer>

    <n-drawer v-model:show="showMetadataDrawer" :width="860">
      <n-drawer-content :title="selectedMetadata ? `${metadataKindText(selectedMetadata.kind)} / ${selectedMetadata.name}` : '元数据编辑'">
        <n-tabs v-if="selectedMetadata" type="line">
          <n-tab-pane name="basic" tab="基础与编辑">
            <n-alert type="info">系统标识名、属性名、数据类型等生产不可变字段已锁定；这里仅编辑展示、责任归属和治理字段。</n-alert>
            <n-descriptions class="mt" :column="2" bordered>
              <n-descriptions-item label="系统名称">{{ selectedMetadata.name }}</n-descriptions-item>
              <n-descriptions-item label="类型">{{ metadataKindText(selectedMetadata.kind) }}</n-descriptions-item>
              <n-descriptions-item label="状态"><n-tag :type="tagType(selectedMetadata.status)">{{ statusText(selectedMetadata.status) }}</n-tag></n-descriptions-item>
              <n-descriptions-item label="数据类型">{{ selectedMetadata.dataType || '-' }}</n-descriptions-item>
              <n-descriptions-item label="登记来源">{{ registrationSourceText(selectedMetadata.registrationSource) }}</n-descriptions-item>
              <n-descriptions-item label="可删除">{{ selectedMetadata.deleteAllowed ? '是' : '否' }}</n-descriptions-item>
            </n-descriptions>
            <n-form class="mt" label-placement="left" label-width="110">
              <n-form-item label="展示名"><n-input v-model:value="metadataEditForm.displayName" /></n-form-item>
              <n-form-item v-if="selectedMetadata.kind === 'event'" label="事件分类"><n-select v-model:value="metadataEditForm.categoryId" clearable :options="categoryOptions" /></n-form-item>
              <n-form-item label="描述"><n-input v-model:value="metadataEditForm.description" type="textarea" /></n-form-item>
              <n-form-item label="负责人"><n-input v-model:value="metadataEditForm.owner" /></n-form-item>
              <n-form-item label="标签"><n-input v-model:value="metadataEditForm.tagsText" placeholder="多个标签用顿号、逗号或换行分隔" /></n-form-item>
              <n-form-item label="单位"><n-input v-model:value="metadataEditForm.unit" placeholder="数值属性可填写，如 元、次、秒" /></n-form-item>
              <n-form-item label="敏感等级"><n-select v-model:value="metadataEditForm.sensitiveLevel" :options="sensitiveLevelOptions" /></n-form-item>
              <n-form-item label="业务口径"><n-input v-model:value="metadataEditForm.businessDefinition" type="textarea" /></n-form-item>
            </n-form>
            <n-space>
              <n-button type="primary" @click="handleSaveMetadataDrawer">保存编辑</n-button>
              <n-button @click="handlePreviewMetadataImpact('disable')">禁用影响</n-button>
              <n-button @click="handlePreviewMetadataImpact('delete')">删除影响</n-button>
              <n-button @click="handleSingleMetadataAction(selectedMetadata, 'hide')">设为不显示</n-button>
              <n-button type="error" @click="handleSingleMetadataAction(selectedMetadata, 'disable')">禁用</n-button>
            </n-space>
          </n-tab-pane>
          <n-tab-pane v-if="selectedMetadata.kind === 'event'" name="event-properties" tab="事件属性">
            <n-alert type="info">
              展示当前事件关联的自定义事件属性和事件公共属性；有上报数据的属性不能删除，可改为隐藏。
            </n-alert>
            <div class="drawer-property-summary">
              <n-tag type="success">自定义属性 {{ metadataDrawerCustomPropertyCount }} 个</n-tag>
              <n-tag type="info">公共属性 {{ metadataDrawerCommonPropertyCount }} 个</n-tag>
              <n-tag>显示中 {{ metadataDrawerEventProperties.filter((property) => property.status !== 'hidden').length }} 个</n-tag>
            </div>
            <n-table :bordered="false" size="small" class="mt">
              <thead>
                <tr>
                  <th>属性名</th>
                  <th>展示名</th>
                  <th>范围</th>
                  <th>数据类型</th>
                  <th>状态</th>
                  <th>是否有数据</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="property in metadataDrawerEventProperties" :key="property.id">
                  <td class="mono">{{ property.propertyName }}</td>
                  <td>{{ property.displayName || '-' }}</td>
                  <td>{{ eventPropertyScopeText(property) }}</td>
                  <td>{{ property.dataType }}</td>
                  <td><n-tag :type="tagType(property.status)">{{ statusText(property.status) }}</n-tag></td>
                  <td>{{ property.hasIngestedData ? '是' : '否' }}</td>
                  <td>
                    <div class="row-actions">
                      <n-button size="small" @click="handleToggleDrawerEventProperty(property)">
                        {{ property.status === 'hidden' ? '显示' : '隐藏' }}
                      </n-button>
                      <n-button
                        size="small"
                        type="error"
                        :disabled="!canDeleteDrawerEventProperty(property)"
                        @click="handleDeleteDrawerEventProperty(property)"
                      >
                        删除
                      </n-button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </n-table>
            <n-empty v-if="!metadataDrawerEventProperties.length" class="mt" description="当前事件暂无属性" />
            <div class="drawer-inline-create">
              <h3>添加已有属性</h3>
              <n-alert type="info">
                从已有事件属性库选择属性添加到当前事件；已在当前事件生效的属性会置灰，公共属性为全局字段，默认在所有事件中展示。
              </n-alert>
              <div class="drawer-attach-row">
                <n-select
                  v-model:value="drawerEventPropertyAttachForm.propertyIds"
                  multiple
                  filterable
                  clearable
                  :options="metadataDrawerAttachablePropertyOptions"
                  placeholder="选择已有自定义属性或公共属性"
                  class="drawer-attach-select"
                />
                <n-button
                  type="primary"
                  :disabled="!drawerEventPropertyAttachForm.propertyIds.length"
                  @click="handleAttachDrawerEventProperties"
                >
                  添加到当前事件
                </n-button>
              </div>
            </div>
          </n-tab-pane>
          <n-tab-pane name="impact" tab="使用血缘与影响">
            <n-grid :cols="4" :x-gap="12">
              <n-gi><n-statistic label="30 天查询" :value="metadataImpactPreview?.recent30dQueryCount ?? 0" /></n-gi>
              <n-gi><n-statistic label="昨日入库" :value="metadataImpactPreview?.yesterdayIngestCount ?? 0" /></n-gi>
              <n-gi><n-statistic label="关联图表" :value="metadataImpactPreview?.relatedCharts ?? 0" /></n-gi>
              <n-gi><n-statistic label="关联分群" :value="metadataImpactPreview?.relatedSegments ?? 0" /></n-gi>
            </n-grid>
            <n-alert class="mt" :type="metadataImpactPreview?.canProceed ? 'success' : 'warning'">
              {{ metadataImpactPreview?.canProceed ? '当前操作可继续，仍建议先通知相关使用方。' : metadataImpactPreview?.reason }}
            </n-alert>
            <n-table :bordered="false" size="small" class="mt">
              <thead><tr><th>引用对象</th><th>工具</th><th>引用方式</th><th>路径</th><th>近 30 天查询</th><th>创建人</th></tr></thead>
              <tbody>
                <tr v-for="item in metadataImpactPreview?.affectedLineage" :key="item.id">
                  <td>{{ item.name }}</td>
                  <td>{{ item.analysisToolType || item.usageType }}</td>
                  <td>{{ item.referenceMode === 'direct' ? '直接' : '间接' }}</td>
                  <td>{{ item.referencePath }}</td>
                  <td>{{ item.queryCount30d ?? '-' }}</td>
                  <td>{{ item.creator }}</td>
                </tr>
              </tbody>
            </n-table>
          </n-tab-pane>
          <n-tab-pane name="quality" tab="上报质量">
            <n-descriptions :column="2" bordered>
              <n-descriptions-item label="上报平台">{{ selectedMetadata.reportingPlatforms?.join('、') || '-' }}</n-descriptions-item>
              <n-descriptions-item label="是否有数据">{{ selectedMetadata.hasIngestedData ? '是' : '否' }}</n-descriptions-item>
              <n-descriptions-item label="敏感等级">{{ sensitiveText(selectedMetadata.sensitiveLevel) }}</n-descriptions-item>
              <n-descriptions-item label="负责人">{{ selectedMetadata.owner || '-' }}</n-descriptions-item>
            </n-descriptions>
            <n-alert class="mt" type="info">生产治理建议优先补齐展示名、描述、负责人、标签和业务口径，避免分析侧误用。</n-alert>
          </n-tab-pane>
          <n-tab-pane name="approval" tab="审批记录">
            <n-alert type="info">待验收转正、黑名单、批量状态变更都会写入审批/审计链路。</n-alert>
            <n-table :bordered="false" size="small" class="mt">
              <thead><tr><th>动作</th><th>操作人</th><th>时间</th><th>资源</th></tr></thead>
              <tbody>
                <tr v-for="log in metadataAuditTimeline.filter((item) => item.action.includes('approve') || item.action.includes('blacklist'))" :key="log.id">
                  <td>{{ log.action }}</td>
                  <td>{{ log.operator }}</td>
                  <td>{{ log.operatedAt }}</td>
                  <td>{{ log.resourceId }}</td>
                </tr>
              </tbody>
            </n-table>
          </n-tab-pane>
          <n-tab-pane name="audit" tab="操作审计">
            <n-table :bordered="false" size="small">
              <thead><tr><th>动作</th><th>操作人</th><th>时间</th><th>IP</th></tr></thead>
              <tbody>
                <tr v-for="log in metadataAuditTimeline" :key="log.id">
                  <td>{{ log.action }}</td>
                  <td>{{ log.operator }}</td>
                  <td>{{ log.operatedAt }}</td>
                  <td>{{ log.ip || '-' }}</td>
                </tr>
              </tbody>
            </n-table>
          </n-tab-pane>
        </n-tabs>
      </n-drawer-content>
    </n-drawer>

    <n-drawer v-model:show="showErrorsDrawer" :width="760">
      <n-drawer-content :title="`${selectedErrorsEvent} 错误详情`">
        <n-alert type="info">默认展示最近 7 天内最新错误日志；超过 7 天只保留统计结果。</n-alert>
        <div class="toolbar mt">
          <n-select v-model:value="errorFilter.errorType" :options="[
            { label: '全部类型', value: 'all' },
            { label: '事件错误', value: 'event_error' },
            { label: '属性错误', value: 'property_error' },
            { label: '用户错误', value: 'user_error' },
          ]" style="width: 150px" />
          <n-input v-model:value="errorFilter.errorCode" clearable placeholder="错误码" style="width: 140px" />
          <n-button type="primary" @click="handleApplyErrorFilter">应用过滤</n-button>
          <n-button @click="handleExportErrors(selectedErrorsEvent)">下载当前事件错误</n-button>
        </div>
        <n-table :bordered="false" size="small" class="mt">
          <thead><tr><th>错误码</th><th>类型</th><th>说明</th><th>原始数据</th><th>接收时间</th></tr></thead>
          <tbody>
            <tr v-for="log in errorLogs" :key="log.id">
              <td><n-tag type="error">{{ log.errorCode }}</n-tag></td>
              <td>{{ log.errorType }}</td>
              <td>{{ log.message }}</td>
              <td class="mono">{{ log.rawPayload }}</td>
              <td>{{ log.receivedAt }}</td>
            </tr>
          </tbody>
        </n-table>
      </n-drawer-content>
    </n-drawer>

    <n-drawer v-model:show="showDictionaryImpactDrawer" :width="760">
      <n-drawer-content :title="`字典影响预览 / ${selectedDictionary?.fileName || ''}`">
        <n-alert type="warning">删除字典后，筛选、分组和图表展示会恢复为原始值；数值计算本身仍使用原始值。</n-alert>
        <n-table :bordered="false" size="small" class="mt">
          <thead><tr><th>类型</th><th>引用对象</th><th>容器</th><th>路径</th><th>近 30 天查询</th><th>创建人</th></tr></thead>
          <tbody>
            <tr v-for="item in dictionaryImpactItems" :key="item.id">
              <td>{{ lineageUsageText(item.usageType) }}</td>
              <td>{{ item.name }}</td>
              <td>{{ item.containerName || '-' }}</td>
              <td>{{ item.referencePath }}</td>
              <td>{{ item.queryCount30d ?? '-' }}</td>
              <td>{{ item.creator }}</td>
            </tr>
          </tbody>
        </n-table>
        <n-empty v-if="!dictionaryImpactItems.length" description="当前字典暂无图表、看板或分群引用" />
      </n-drawer-content>
    </n-drawer>

    <n-drawer v-model:show="showReportDrawer" :width="820">
      <n-drawer-content :title="selectedReport?.reportName || '验证报告详情'">
        <n-descriptions v-if="selectedReport" :column="2" bordered>
          <n-descriptions-item label="端类型">{{ selectedReport.platform }}</n-descriptions-item>
          <n-descriptions-item label="验证方式">{{ selectedReport.verifyMode }}</n-descriptions-item>
          <n-descriptions-item label="创建人">{{ selectedReport.createdBy }}</n-descriptions-item>
          <n-descriptions-item label="创建时间">{{ selectedReport.createdAt }}</n-descriptions-item>
        </n-descriptions>
        <n-table v-if="selectedReport" :bordered="false" size="small" class="mt">
          <thead><tr><th>事件</th><th>触发时间</th><th>结果</th><th>校验信息</th><th>备注</th></tr></thead>
          <tbody>
            <tr v-for="log in selectedReport.eventLogs" :key="log.id">
              <td>{{ log.eventName }}</td>
              <td>{{ log.triggerTime }}</td>
              <td><n-tag :type="tagType(log.validationResult)">{{ statusText(log.validationResult) }}</n-tag></td>
              <td>{{ log.validationMessages.join('；') }}</td>
              <td>{{ log.remark || '-' }}</td>
            </tr>
          </tbody>
        </n-table>
      </n-drawer-content>
    </n-drawer>

    <n-drawer v-model:show="showAlertDrawer" :width="680">
      <n-drawer-content :title="selectedAlert?.monitorName || '告警详情'">
        <n-descriptions v-if="selectedAlert" :column="2" bordered>
          <n-descriptions-item label="来源">{{ selectedAlert.source === 'custom_validation_rule' ? '校验规则配置' : '入库明细监控' }}</n-descriptions-item>
          <n-descriptions-item label="对象">{{ selectedAlert.objectType }} / {{ selectedAlert.targetName || '-' }}</n-descriptions-item>
          <n-descriptions-item label="状态">{{ statusText(selectedAlert.status) }}</n-descriptions-item>
          <n-descriptions-item label="最近触发">{{ selectedAlert.lastTriggeredAt || '-' }}</n-descriptions-item>
          <n-descriptions-item label="告警条数">{{ selectedAlert.alertCount }}</n-descriptions-item>
          <n-descriptions-item label="异常数据">{{ selectedAlert.abnormalDataCount }}</n-descriptions-item>
          <n-descriptions-item label="渠道">{{ selectedAlert.channels.join('、') }}</n-descriptions-item>
          <n-descriptions-item label="接收人">{{ selectedAlert.recipients.join('、') || '-' }}</n-descriptions-item>
        </n-descriptions>
        <n-alert class="mt" type="info">校验规则创建的告警只允许查看；入库明细监控支持关闭、开启和修改接收人。</n-alert>
      </n-drawer-content>
    </n-drawer>

    <n-drawer v-model:show="showCostImpactDrawer" :width="760">
      <n-drawer-content :title="`禁用影响预览 / ${costImpactPreview?.name || ''}`">
        <n-alert :type="costImpactPreview?.canProceed ? 'warning' : 'error'">
          近 30 天查询 {{ costImpactPreview?.recent30dQueryCount ?? 0 }} 次，昨日入库 {{ formatNumber(costImpactPreview?.yesterdayIngestCount) }}，关联图表 {{ costImpactPreview?.relatedCharts ?? 0 }}，关联分群 {{ costImpactPreview?.relatedSegments ?? 0 }}。
        </n-alert>
        <n-table :bordered="false" size="small" class="mt">
          <thead><tr><th>类型</th><th>引用对象</th><th>路径</th><th>查询</th><th>更新时间</th></tr></thead>
          <tbody>
            <tr v-for="item in costImpactPreview?.affectedLineage" :key="item.id">
              <td>{{ lineageUsageText(item.usageType) }}</td>
              <td>{{ item.name }}</td>
              <td>{{ item.referencePath }}</td>
              <td>{{ item.queryCount30d ?? '-' }}</td>
              <td>{{ item.updatedAt }}</td>
            </tr>
          </tbody>
        </n-table>
      </n-drawer-content>
    </n-drawer>

    <n-modal v-model:show="showEventModal" preset="card" title="新建事件" class="form-modal">
      <n-form label-placement="left" label-width="100">
        <n-form-item label="事件名称"><n-input v-model:value="eventForm.eventName" /></n-form-item>
        <n-form-item label="展示名"><n-input v-model:value="eventForm.displayName" /></n-form-item>
        <n-form-item label="事件分类"><n-select v-model:value="eventForm.categoryId" clearable :options="categoryOptions" /></n-form-item>
        <n-form-item label="事件描述"><n-input v-model:value="eventForm.description" type="textarea" /></n-form-item>
        <n-form-item label="属性设置"><n-select v-model:value="eventForm.associatedPropertyIds" multiple clearable :options="eventProperties.filter((item) => item.propertyScope === 'event_param').map((item) => ({ label: item.propertyName, value: item.id }))" /></n-form-item>
      </n-form>
      <template #footer><n-button type="primary" @click="handleCreateEvent">保存</n-button></template>
    </n-modal>

    <n-modal v-model:show="showBatchEditModal" preset="card" title="批量编辑元数据治理信息" class="form-modal wide">
      <n-alert type="warning">批量编辑仅修改展示和治理字段，不修改事件名、属性名、数据类型等生产不可变字段。</n-alert>
      <n-form class="mt" label-placement="left" label-width="130">
        <n-form-item label="展示名前缀"><n-input v-model:value="batchEditForm.displayNamePrefix" placeholder="可选，会追加到当前展示名前" /></n-form-item>
        <n-form-item label="统一描述"><n-input v-model:value="batchEditForm.description" type="textarea" /></n-form-item>
        <n-form-item v-if="coreMetadataKind === 'event'" label="统一分类"><n-select v-model:value="batchEditForm.categoryId" clearable :options="categoryOptions" /></n-form-item>
        <n-form-item label="负责人"><n-input v-model:value="batchEditForm.owner" /></n-form-item>
        <n-form-item label="标签"><n-input v-model:value="batchEditForm.tagsText" /></n-form-item>
        <n-form-item label="单位"><n-input v-model:value="batchEditForm.unit" /></n-form-item>
        <n-form-item label="敏感等级"><n-select v-model:value="batchEditForm.sensitiveLevel" :options="sensitiveLevelOptions" /></n-form-item>
        <n-form-item label="业务口径"><n-input v-model:value="batchEditForm.businessDefinition" type="textarea" /></n-form-item>
      </n-form>
      <template #footer><n-button type="primary" @click="handleBatchEditMetadata">确认批量编辑 {{ selectedMetadataIds.length }} 项</n-button></template>
    </n-modal>

    <n-modal v-model:show="showEventEditModal" preset="card" title="编辑事件展示信息" class="form-modal">
      <n-alert type="info">事件名称不可编辑；批量导入也只允许更新展示名、描述和分类之外的只读字段会被忽略。</n-alert>
      <n-form class="mt" label-placement="left" label-width="100">
        <n-form-item label="展示名"><n-input v-model:value="eventEditForm.displayName" /></n-form-item>
        <n-form-item label="事件分类"><n-select v-model:value="eventEditForm.categoryId" clearable :options="categoryOptions" /></n-form-item>
        <n-form-item label="事件描述"><n-input v-model:value="eventEditForm.description" type="textarea" /></n-form-item>
      </n-form>
      <template #footer><n-button type="primary" @click="handleUpdateEventInfo">保存</n-button></template>
    </n-modal>

    <n-modal v-model:show="showBatchModal" preset="card" title="批量新建事件" class="form-modal wide">
      <n-alert type="info">优先上传 .xlsx Excel 文件，至少包含“事件名称、展示名、描述”列；大批量数据只读取文件并展示摘要，不在页面展开明细。</n-alert>
      <n-radio-group v-model:value="batchForm.source" class="mt">
        <n-radio-button value="excel">上传 Excel</n-radio-button>
        <n-radio-button value="manual">少量粘贴</n-radio-button>
      </n-radio-group>
      <n-radio-group v-model:value="batchForm.mode" class="mt"><n-radio-button value="skip">跳过已存在项</n-radio-button><n-radio-button value="overwrite">覆盖展示信息</n-radio-button></n-radio-group>
      <div v-if="batchForm.source === 'excel'" class="file-import-card mt">
        <input ref="batchEventExcelInput" class="hidden-file-input" type="file" accept=".xlsx,.csv" @change="handleImportBatchExcelFile" />
        <div class="file-import-row">
          <n-button type="primary" @click="batchEventExcelInput?.click()">上传 Excel 文件</n-button>
          <span class="muted">{{ batchImportSourceText() }}</span>
        </div>
      </div>
      <n-input v-else v-model:value="batchForm.text" class="mt" type="textarea" :autosize="{ minRows: 8 }" placeholder="event_name,展示名,描述&#10;checkout_start,发起结算,点击结算按钮时上报" />
      <n-space class="mt"><n-button @click="handlePreviewBatch">预校验</n-button><n-button type="primary" :disabled="batchForm.source === 'excel' && !batchForm.rowCount" @click="handleImportBatch">确认导入</n-button></n-space>
      <n-alert v-if="batchPreviewTotal" class="mt" type="success">已预校验 {{ batchPreviewTotal }} 行；异常列表最多展示前 100 条。</n-alert>
      <n-table v-if="batchPreviewRows.length" :bordered="false" size="small" class="mt">
        <thead><tr><th>行号</th><th>事件名称</th><th>错误类型</th><th>错误说明</th></tr></thead>
        <tbody><tr v-for="row in batchPreviewRows" :key="`${row.rowNumber}-${row.errorType}`"><td>{{ row.rowNumber }}</td><td>{{ row.eventName }}</td><td>{{ row.errorType }}</td><td>{{ row.message }}</td></tr></tbody>
      </n-table>
    </n-modal>

    <n-modal v-model:show="showPropertyModal" preset="card" title="新增事件属性" class="form-modal">
      <n-form label-placement="left" label-width="120">
        <n-form-item label="属性名称"><n-input v-model:value="propertyForm.propertyName" /></n-form-item>
        <n-form-item label="展示名"><n-input v-model:value="propertyForm.displayName" /></n-form-item>
        <n-form-item label="事件公共属性"><n-switch :value="propertyForm.propertyScope === 'event_common_header'" @update:value="(value) => propertyForm.propertyScope = value ? 'event_common_header' : 'event_param'" /></n-form-item>
        <n-form-item label="数据类型"><n-select v-model:value="propertyForm.dataType" :options="dataTypeOptions" /></n-form-item>
        <n-form-item label="关联事件"><n-select v-model:value="propertyForm.associatedEventIds" multiple clearable :disabled="propertyForm.propertyScope === 'event_common_header'" :options="eventSelectOptions" /></n-form-item>
        <n-form-item label="描述"><n-input v-model:value="propertyForm.description" type="textarea" /></n-form-item>
      </n-form>
      <template #footer><n-button type="primary" @click="handleCreateEventProperty">保存</n-button></template>
    </n-modal>

    <n-modal v-model:show="showUserPropertyModal" preset="card" title="新增用户属性" class="form-modal">
      <n-form label-placement="left" label-width="120">
        <n-form-item label="属性名称"><n-input v-model:value="userPropertyForm.propertyName" /></n-form-item>
        <n-form-item label="展示名"><n-input v-model:value="userPropertyForm.displayName" /></n-form-item>
        <n-form-item label="数据类型"><n-select v-model:value="userPropertyForm.dataType" :options="dataTypeOptions" /></n-form-item>
        <n-form-item label="计算逻辑"><n-radio-group v-model:value="userPropertyForm.calculationLogic"><n-radio-button value="all_values">计算全部值</n-radio-button><n-radio-button value="latest_value">计算最终值</n-radio-button></n-radio-group></n-form-item>
        <n-form-item label="描述"><n-input v-model:value="userPropertyForm.description" type="textarea" /></n-form-item>
      </n-form>
      <template #footer><n-button type="primary" @click="handleCreateUserProperty">保存</n-button></template>
    </n-modal>

    <n-modal v-model:show="showVirtualEventModal" preset="card" title="创建虚拟事件" class="form-modal">
      <n-form label-placement="left" label-width="110">
        <n-form-item label="事件名称"><n-input v-model:value="virtualEventForm.eventName" /></n-form-item>
        <n-form-item label="展示名"><n-input v-model:value="virtualEventForm.displayName" /></n-form-item>
        <n-form-item label="组合事件"><n-select v-model:value="virtualEventForm.componentEventIds" multiple :options="eventSelectOptions" /></n-form-item>
        <n-form-item label="过滤字段"><n-input v-model:value="virtualEventForm.filterField" placeholder="可选，例如 product_id" /></n-form-item>
        <n-form-item label="过滤值"><n-input v-model:value="virtualEventForm.filterValue" placeholder="可选" /></n-form-item>
        <n-form-item label="描述"><n-input v-model:value="virtualEventForm.description" type="textarea" /></n-form-item>
      </n-form>
      <template #footer><n-button type="primary" @click="handleCreateVirtualEvent">保存</n-button></template>
    </n-modal>

    <n-modal v-model:show="showVirtualPropertyModal" preset="card" title="创建虚拟属性" class="form-modal wide">
      <n-form label-placement="left" label-width="120">
        <n-form-item label="属性类型"><n-radio-group v-model:value="virtualPropertyForm.propertyType"><n-radio-button value="event_virtual_property">事件虚拟属性</n-radio-button><n-radio-button value="user_virtual_property">用户虚拟属性</n-radio-button></n-radio-group></n-form-item>
        <n-form-item label="属性名称"><n-input v-model:value="virtualPropertyForm.propertyName" placeholder="系统会自动补 $vp 前缀" /></n-form-item>
        <n-form-item label="展示名"><n-input v-model:value="virtualPropertyForm.displayName" /></n-form-item>
        <n-form-item label="数据类型"><n-select v-model:value="virtualPropertyForm.dataType" :options="virtualDataTypeOptions" /></n-form-item>
        <n-form-item label="关联方式" v-if="virtualPropertyForm.propertyType === 'event_virtual_property'"><n-radio-group v-model:value="virtualPropertyForm.associationMode"><n-radio-button value="any_referenced_property_has_value">任一属性有值</n-radio-button><n-radio-button value="all_referenced_properties_have_value">全部属性有值</n-radio-button></n-radio-group></n-form-item>
        <n-form-item label="SQL 表达式"><n-input v-model:value="virtualPropertyForm.sqlExpression" type="textarea" :autosize="{ minRows: 4 }" /></n-form-item>
        <n-form-item label="描述"><n-input v-model:value="virtualPropertyForm.description" type="textarea" /></n-form-item>
      </n-form>
      <n-alert v-if="sqlValidation" :type="sqlValidation.valid ? 'success' : 'error'">
        {{ sqlValidation.valid ? `校验通过，输出类型 ${sqlValidation.outputType}，引用 ${sqlValidation.referencedProperties.map((item) => item.propertyName).join('、')}` : sqlValidation.errors.map((item) => item.message).join('；') }}
      </n-alert>
      <template #footer><n-space><n-button @click="handleValidateSql">SQL 校验</n-button><n-button type="primary" @click="handleCreateVirtualProperty">保存</n-button></n-space></template>
    </n-modal>

    <n-modal v-model:show="showVirtualPropertyEditModal" preset="card" title="编辑虚拟属性" class="form-modal wide">
      <n-form label-placement="left" label-width="120">
        <n-form-item label="属性类型"><n-radio-group v-model:value="virtualPropertyEditForm.propertyType"><n-radio-button value="event_virtual_property">事件虚拟属性</n-radio-button><n-radio-button value="user_virtual_property">用户虚拟属性</n-radio-button></n-radio-group></n-form-item>
        <n-form-item label="展示名"><n-input v-model:value="virtualPropertyEditForm.displayName" /></n-form-item>
        <n-form-item label="数据类型"><n-select v-model:value="virtualPropertyEditForm.dataType" :options="virtualDataTypeOptions" /></n-form-item>
        <n-form-item label="关联方式" v-if="virtualPropertyEditForm.propertyType === 'event_virtual_property'"><n-radio-group v-model:value="virtualPropertyEditForm.associationMode"><n-radio-button value="any_referenced_property_has_value">任一属性有值</n-radio-button><n-radio-button value="all_referenced_properties_have_value">全部属性有值</n-radio-button></n-radio-group></n-form-item>
        <n-form-item label="SQL 表达式"><n-input v-model:value="virtualPropertyEditForm.sqlExpression" type="textarea" :autosize="{ minRows: 4 }" /></n-form-item>
        <n-form-item label="确认影响"><n-checkbox v-model:checked="virtualPropertyEditForm.confirmedDictionaryDelete">SQL 修改后删除已有字典并重新校验</n-checkbox></n-form-item>
        <n-form-item label="描述"><n-input v-model:value="virtualPropertyEditForm.description" type="textarea" /></n-form-item>
      </n-form>
      <template #footer><n-button type="primary" @click="handleUpdateVirtualProperty">保存修改</n-button></template>
    </n-modal>

    <n-modal v-model:show="showVisualEventModal" preset="card" title="新建圈选事件" class="form-modal">
      <n-form label-placement="left" label-width="110">
        <n-form-item label="端类型"><n-radio-group v-model:value="visualEventForm.platform"><n-radio-button value="web">网页端</n-radio-button><n-radio-button value="app">移动端</n-radio-button></n-radio-group></n-form-item>
        <n-form-item label="事件名称"><n-input v-model:value="visualEventForm.eventName" /></n-form-item>
        <n-form-item label="事件描述"><n-input v-model:value="visualEventForm.description" /></n-form-item>
        <n-form-item label="所属页面"><n-input v-model:value="visualEventForm.pageName" /></n-form-item>
        <n-form-item label="页面规则"><n-input v-model:value="visualEventForm.pageRule" /></n-form-item>
        <n-form-item label="元素"><n-input v-model:value="visualEventForm.elementName" /></n-form-item>
      </n-form>
      <template #footer><n-button type="primary" @click="handleCreateVisualEvent">保存</n-button></template>
    </n-modal>

    <n-modal v-model:show="showCustomSessionModal" preset="card" title="创建自定义 Session" class="form-modal">
      <n-form label-placement="left" label-width="120">
        <n-form-item label="Session 名称"><n-input v-model:value="customSessionForm.sessionName" /></n-form-item>
        <n-form-item label="展示名"><n-input v-model:value="customSessionForm.displayName" /></n-form-item>
        <n-form-item label="端范围"><n-select v-model:value="customSessionForm.platformScope" multiple :options="platformOptions" /></n-form-item>
        <n-form-item label="事件范围"><n-select v-model:value="customSessionForm.eventIds" multiple clearable :options="eventSelectOptions" /></n-form-item>
        <n-form-item label="切割规则">
          <n-radio-group v-model:value="customSessionForm.cutRuleType">
            <n-radio-button value="time_gap">按时间间隔</n-radio-button>
            <n-radio-button value="start_end_event">按开始/结束事件</n-radio-button>
          </n-radio-group>
        </n-form-item>
        <n-form-item v-if="customSessionForm.cutRuleType === 'time_gap'" label="切割时长"><n-input-number v-model:value="customSessionForm.gapMinutes" :min="1" /> 分钟</n-form-item>
        <n-form-item v-if="customSessionForm.cutRuleType === 'start_end_event'" label="开始事件"><n-select v-model:value="customSessionForm.startEventId" :options="eventSelectOptions" filterable /></n-form-item>
        <n-form-item v-if="customSessionForm.cutRuleType === 'start_end_event'" label="结束事件"><n-select v-model:value="customSessionForm.endEventId" :options="eventSelectOptions" filterable /></n-form-item>
        <n-form-item label="描述"><n-input v-model:value="customSessionForm.description" type="textarea" /></n-form-item>
      </n-form>
      <template #footer><n-button type="primary" @click="handleCreateCustomSession">保存</n-button></template>
    </n-modal>

    <n-modal v-model:show="showCategoryModal" preset="card" :title="categoryModalMode === 'create' ? '创建事件分类' : '编辑事件分类'" class="form-modal">
      <n-form label-placement="left" label-width="100">
        <n-form-item label="分类名称"><n-input v-model:value="categoryForm.name" /></n-form-item>
        <n-form-item label="分类类型"><n-radio-group v-model:value="categoryForm.scope" :disabled="categoryModalMode === 'edit'"><n-radio-button value="public">公共分类</n-radio-button><n-radio-button value="private">私人分类</n-radio-button></n-radio-group></n-form-item>
        <n-form-item label="描述"><n-input v-model:value="categoryForm.description" type="textarea" /></n-form-item>
        <n-form-item v-if="categoryModalMode === 'edit'" label="默认分类"><n-checkbox v-model:checked="categoryForm.isDefault">设为当前分类页默认分类</n-checkbox></n-form-item>
      </n-form>
      <template #footer><n-button type="primary" @click="handleSaveCategory">保存</n-button></template>
    </n-modal>

    <n-modal v-model:show="showDictionaryModal" preset="card" title="上传维度字典" class="form-modal wide">
      <n-form label-placement="left" label-width="110">
        <n-form-item label="属性类型"><n-radio-group v-model:value="dictionaryForm.propertyKind"><n-radio-button value="event">事件属性</n-radio-button><n-radio-button value="user">用户属性</n-radio-button></n-radio-group></n-form-item>
        <n-form-item label="属性"><n-select v-model:value="dictionaryForm.propertyId" :options="dictionaryPropertyOptions" filterable /></n-form-item>
        <n-form-item label="文件名"><n-input v-model:value="dictionaryForm.fileName" /></n-form-item>
        <n-form-item label="上传文件">
          <input ref="dictionaryUploadInput" class="hidden-file-input" type="file" accept=".csv,.txt" @change="handleDictionaryFileChange" />
          <n-space align="center">
            <n-button @click="dictionaryUploadInput?.click()">选择 csv/txt 文件</n-button>
            <span class="muted">{{ dictionaryForm.fileName }}</span>
          </n-space>
        </n-form-item>
        <n-form-item label="前 100 行预览"><n-input v-model:value="dictionaryForm.content" type="textarea" :autosize="{ minRows: 6 }" /></n-form-item>
      </n-form>
      <template #footer><n-button type="primary" @click="handleUploadDictionary">确认上传</n-button></template>
    </n-modal>

    <n-modal v-model:show="showMonitorModal" preset="card" title="创建入库异常监控告警" class="form-modal">
      <n-form label-placement="left" label-width="110">
        <n-form-item label="监控名称"><n-input v-model:value="monitorForm.monitorName" /></n-form-item>
        <n-form-item label="监控对象"><n-radio-group v-model:value="monitorForm.objectType"><n-radio-button value="event">事件</n-radio-button><n-radio-button value="event_property">事件属性</n-radio-button><n-radio-button value="user_property">用户属性</n-radio-button></n-radio-group></n-form-item>
        <n-form-item label="具体对象"><n-input v-model:value="monitorForm.targetName" /></n-form-item>
        <n-form-item label="告警渠道"><n-checkbox-group v-model:value="monitorForm.channels"><n-checkbox value="email">邮箱</n-checkbox><n-checkbox value="wechat_work">企业群</n-checkbox></n-checkbox-group></n-form-item>
        <n-form-item label="收件人"><n-input v-model:value="monitorForm.recipients" /></n-form-item>
        <n-form-item label="Webhook"><n-input v-model:value="monitorForm.webhook" /></n-form-item>
      </n-form>
      <template #footer><n-button type="primary" @click="handleCreateMonitor">保存</n-button></template>
    </n-modal>

    <n-modal v-model:show="showRuleModal" preset="card" title="创建校验规则" class="form-modal">
      <n-form label-placement="left" label-width="120">
        <n-form-item label="规则名称"><n-input v-model:value="ruleForm.ruleName" /></n-form-item>
        <n-form-item label="规则类型"><n-radio-group v-model:value="ruleForm.ruleType"><n-radio-button value="event_volume">事件量</n-radio-button><n-radio-button value="event_property">事件属性</n-radio-button><n-radio-button value="user_property">用户属性</n-radio-button></n-radio-group></n-form-item>
        <n-form-item label="校验对象"><n-input v-model:value="ruleForm.targetName" placeholder="pay_success.order_amount" /></n-form-item>
        <n-form-item label="校验规则"><n-input v-model:value="ruleForm.conditions" type="textarea" /></n-form-item>
        <n-form-item label="时间间隔"><n-input-number v-model:value="ruleForm.intervalMinutes" :min="1" /> 分钟</n-form-item>
        <n-form-item label="开启告警"><n-switch v-model:value="ruleForm.alertEnabled" /></n-form-item>
        <n-form-item label="拦截异常"><n-switch v-model:value="ruleForm.interceptEnabled" :disabled="ruleForm.ruleType === 'event_volume'" /></n-form-item>
      </n-form>
      <template #footer><n-button type="primary" @click="handleCreateRule">保存</n-button></template>
    </n-modal>

    <n-modal v-model:show="showRuleEditModal" preset="card" title="编辑校验规则" class="form-modal">
      <n-alert type="info">校验对象和规则条件创建后不可编辑；如需调整对象或 AND/OR 条件，请关闭后新建规则。</n-alert>
      <n-form class="mt" label-placement="left" label-width="120">
        <n-form-item label="规则名称"><n-input v-model:value="ruleEditForm.ruleName" /></n-form-item>
        <n-form-item label="状态"><n-radio-group v-model:value="ruleEditForm.status"><n-radio-button value="enabled">开启</n-radio-button><n-radio-button value="disabled">关闭</n-radio-button></n-radio-group></n-form-item>
        <n-form-item label="开启告警"><n-switch v-model:value="ruleEditForm.alertEnabled" /></n-form-item>
        <n-form-item label="拦截异常"><n-switch v-model:value="ruleEditForm.interceptEnabled" :disabled="selectedRule?.ruleType === 'event_volume'" /></n-form-item>
      </n-form>
      <template #footer><n-button type="primary" @click="handleUpdateRule">保存</n-button></template>
    </n-modal>

    <n-modal v-model:show="showAlertEditModal" preset="card" title="修改入库监控告警" class="form-modal">
      <n-form label-placement="left" label-width="110">
        <n-form-item label="告警渠道"><n-checkbox-group v-model:value="alertEditForm.channels"><n-checkbox value="email">邮箱</n-checkbox><n-checkbox value="wechat_work">企业群</n-checkbox></n-checkbox-group></n-form-item>
        <n-form-item label="接收人"><n-input v-model:value="alertEditForm.recipients" type="textarea" /></n-form-item>
        <n-form-item label="Webhook"><n-input v-model:value="alertEditForm.webhook" /></n-form-item>
      </n-form>
      <template #footer><n-button type="primary" @click="handleSaveAlertSettings">保存</n-button></template>
    </n-modal>
  </div>
</template>

<style scoped lang="scss">
.ubdm-page {
  padding: 20px;
}

.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}

.page-kicker {
  margin-bottom: 4px;
  color: #64748b;
  font-size: 13px;
}

.section-nav {
  display: grid;
  gap: 10px;
  padding: 12px;
  margin-bottom: 16px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.nav-group {
  display: grid;
  grid-template-columns: 92px 1fr;
  gap: 10px;
  align-items: center;
}

.nav-title {
  color: #475569;
  font-size: 13px;
  font-weight: 650;
}

.summary-grid {
  margin-bottom: 16px;
}

.content-card {
  margin-bottom: 16px;
}

.access-overview-layout {
  display: grid;
  grid-template-columns: minmax(420px, 0.95fr) minmax(520px, 1.45fr);
  gap: 16px;
  align-items: stretch;
}

.overview-panel {
  padding: 18px 20px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.panel-title {
  margin-bottom: 14px;
  color: #111827;
  font-size: 16px;
  font-weight: 700;
}

.app-info-panel,
.access-health-panel {
  min-height: 0;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 16px;
  padding-top: 14px;
  margin-top: 14px;
  border-top: 1px solid #edf2f7;

  > div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    min-width: 0;
  }
}

.health-metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.health-metric {
  display: grid;
  gap: 8px;
  padding: 14px;
  border: 1px solid #edf2f7;
  border-radius: 8px;
  background: #f8fafc;

  span {
    color: #64748b;
    font-size: 13px;
  }

  strong {
    color: #111827;
    font-size: 24px;
    line-height: 1;
  }
}

.sdk-version-grid,
.data-model-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.data-model-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.sdk-version-item,
.data-model-grid > div {
  display: grid;
  gap: 7px;
  padding: 14px;
  border: 1px solid #edf2f7;
  border-radius: 8px;
  background: #fbfdff;
}

.sdk-version-item span,
.data-model-grid span {
  color: #4b5563;
  line-height: 1.6;
}

.realtime-verify-page {
  background: #f8fafc;
}

.verify-top-grid {
  display: grid;
  grid-template-columns: minmax(360px, 0.9fr) minmax(540px, 1.4fr);
  gap: 16px;
}

.verify-workspace {
  display: grid;
  grid-template-columns: minmax(360px, 0.85fr) minmax(560px, 1.35fr);
  gap: 16px;
  margin-top: 16px;
}

.verify-panel,
.verify-command-panel {
  padding: 18px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.verify-panel-head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 14px;

  p {
    margin: 4px 0 0;
    color: #64748b;
    line-height: 1.5;
  }
}

.verify-actions,
.verify-command-group,
.verify-detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.verify-qr-row {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 14px;
  align-items: center;
  padding: 14px;
  margin: 14px 0;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #eff6ff;

  span {
    display: block;
    margin-top: 6px;
    color: #475569;
    line-height: 1.6;
  }
}

.verify-stat-grid,
.verify-check-grid,
.verify-mode-grid,
.verify-connection-grid {
  display: grid;
  gap: 12px;
}

.verify-stat-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));

  > div {
    display: grid;
    gap: 8px;
    padding: 14px;
    border: 1px solid #edf2f7;
    border-radius: 8px;
    background: #f8fafc;
  }

  span {
    color: #64748b;
    font-size: 13px;
  }

  strong {
    color: #111827;
    font-size: 24px;
    line-height: 1;
  }
}

.verify-check-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 14px;
}

.verify-check-item {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  align-items: flex-start;
  padding: 12px;
  border: 1px solid #edf2f7;
  border-radius: 8px;

  span:not(.n-tag) {
    display: block;
    margin-top: 4px;
    color: #64748b;
  }
}

.verify-mode-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 16px;
}

.verify-mode-card,
.verify-connection-card {
  display: grid;
  gap: 8px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;

  span {
    color: #64748b;
    line-height: 1.6;
  }
}

.verify-mode-card.active {
  border-color: #18a058;
  background: #f0fdf4;
}

.verify-command-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
}

.verify-event-select {
  width: 260px;
}

.report-command {
  flex: 1;
  justify-content: flex-end;
  min-width: 420px;

  .n-input {
    max-width: 260px;
  }

  span {
    color: #64748b;
  }
}

.verify-stream-list {
  display: grid;
  gap: 8px;
  max-height: 520px;
  overflow: auto;
}

.verify-stream-item {
  display: grid;
  grid-template-columns: minmax(110px, 1fr) minmax(132px, auto) auto;
  gap: 10px;
  align-items: center;
  width: 100%;
  padding: 12px;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;

  &:hover,
  &.active {
    border-color: #18a058;
    background: #f0fdf4;
  }

  span {
    color: #64748b;
  }
}

.stream-event-name {
  color: #111827 !important;
  font-weight: 700;
  word-break: break-word;
}

.verify-detail-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;

  > div {
    display: grid;
    gap: 7px;
    padding: 12px;
    border: 1px solid #edf2f7;
    border-radius: 8px;
    background: #f8fafc;
  }

  span {
    color: #64748b;
  }
}

.verify-message-list {
  display: grid;
  gap: 8px;

  > div {
    padding: 10px 12px;
    border-left: 3px solid #18a058;
    background: #f8fafc;
  }
}

.verify-detail-actions {
  margin-top: 14px;

  .n-input {
    flex: 1;
    min-width: 260px;
  }
}

.verify-connection-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 16px;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 14px;
}

.metadata-workbench {
  background: #f8fafc;
}

.metadata-command-bar {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
  padding-bottom: 2px;
}

.metadata-filter-row {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(240px, 1.35fr) repeat(6, minmax(128px, 0.7fr));
  gap: 10px;
  min-width: 0;
}

.metadata-primary-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
  align-items: center;
}

.event-search-control,
.filter-select,
.workbench-sort-select,
.batch-action-select {
  min-width: 0;
}

.filter-select.wide {
  min-width: 156px;
}

.filter-select.compact {
  min-width: 126px;
}

.workbench-layout {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-start;
}

.workbench-section {
  display: flex;
  flex: 0 1 auto;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  min-width: 0;
  width: fit-content;
  max-width: 100%;
  padding: 10px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.table-setting-section {
  max-width: 860px;
}

.batch-setting-section {
  max-width: 920px;
}

.section-label {
  flex: 0 0 auto;
  color: #64748b;
  font-weight: 600;
  white-space: nowrap;
}

.workbench-sort-select {
  width: 150px;
}

.batch-action-select {
  width: 148px;
}

.column-setting {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 260px;
}

.column-select {
  width: 240px;
}

.row-actions {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  white-space: nowrap;
}

.drawer-property-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.drawer-inline-create {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid #e5e7eb;
}

.drawer-inline-create h3 {
  margin: 0 0 12px;
  font-size: 16px;
}

.drawer-attach-row {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 12px;
}

.drawer-attach-select {
  flex: 1;
  min-width: 0;
}

@media (max-width: 1440px) {
  .metadata-command-bar {
    flex-direction: column;
  }

  .metadata-filter-row {
    width: 100%;
    grid-template-columns: minmax(220px, 1.2fr) repeat(3, minmax(132px, 1fr));
  }
}

@media (max-width: 900px) {
  .access-overview-layout,
  .health-metric-grid,
  .sdk-version-grid,
  .data-model-grid,
  .settings-grid,
  .verify-top-grid,
  .verify-workspace,
  .verify-stat-grid,
  .verify-check-grid,
  .verify-mode-grid,
  .verify-connection-grid,
  .verify-detail-grid {
    grid-template-columns: 1fr;
  }

  .verify-command-panel,
  .report-command {
    align-items: stretch;
    min-width: 0;
  }

  .verify-event-select,
  .report-command .n-input {
    width: 100%;
    max-width: none;
  }

  .metadata-filter-row {
    grid-template-columns: 1fr;
  }

  .metadata-primary-actions,
  .workbench-section {
    width: 100%;
  }

  .column-setting,
  .column-select,
  .workbench-sort-select,
  .batch-action-select {
    width: 100%;
  }
}

.pagination-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.file-import-card {
  background: #ffffff;
}

.file-import-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-top: 12px;
}

.hidden-file-input {
  display: none;
}

.qr-preview {
  display: grid;
  width: 96px;
  height: 96px;
  place-items: center;
  border: 1px solid #d9e2ec;
  border-radius: 6px;
  background:
    linear-gradient(90deg, #1f2937 8px, transparent 8px) 0 0 / 24px 24px,
    linear-gradient(#1f2937 8px, transparent 8px) 0 0 / 24px 24px,
    #f8fafc;
  color: #0f172a;
  font-weight: 700;
}

.card-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.card-title {
  margin: 8px 0 6px;
  font-weight: 700;
}

.mt {
  margin-top: 14px;
}

.mb {
  margin-bottom: 12px;
}

.switch-list {
  display: grid;
  gap: 8px;
  margin-top: 12px;

  > div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
}

.step-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.shot-card {
  width: 120px;
  min-height: 72px;
}

.mono {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
  font-size: 12px;
}

.payload {
  min-height: 220px;
  padding: 12px;
  overflow: auto;
  background: #0f172a;
  border-radius: 8px;
  color: #e2e8f0;
  white-space: pre-wrap;
}

.muted {
  margin-top: 6px;
  color: #64748b;
}

.unit {
  margin-left: 8px;
}

.form-modal {
  width: 640px;
}

.form-modal.wide {
  width: 840px;
}
</style>
