<script setup lang="ts">
import { computed, onMounted, ref, watch, type Component } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import {
  NAlert,
  NButton,
  NCheckbox,
  NDescriptions,
  NDescriptionsItem,
  NDrawer,
  NDrawerContent,
  NEmpty,
  NIcon,
  NInput,
  NInputNumber,
  NModal,
  NPagination,
  NSelect,
  NSpace,
  NTabPane,
  NTabs,
  NTable,
  NTag,
  NTooltip,
  useMessage,
} from 'naive-ui'
import {
  AddCircleOutline,
  AlarmOutline,
  AnalyticsOutline,
  ChevronBackOutline,
  CloseCircleOutline,
  CopyOutline,
  CreateOutline,
  FunnelOutline,
  ListOutline,
  PeopleOutline,
  RefreshOutline,
  SaveOutline,
  SearchOutline,
  ShieldCheckmarkOutline,
  StatsChartOutline,
  TimeOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import MetricFilterBuilder, { type FilterGroupDraft } from '@/components/ab-testing/MetricFilterBuilder.vue'
import { useAbTestingStore } from '@/stores/abTesting'
import { validateMetricFormula } from '@/utils/abTestingRules'
import type {
  AlarmTask,
  AlarmTriggerRecord,
  EventMetricEvent,
  Experiment,
  FlexibleProperty,
  Metric,
  MetricFilter,
  MetricFilterGroup,
  MetricGroup,
  MetricGroupEditorPayload,
  MetricTemplate,
  MustSeeMetricTrend,
  OperationLog,
  ReceiverGroup,
} from '@/types/abTesting'
import type { EntityId } from '@/types/common'

type MetricEntryKey = 'groups' | 'templates' | 'alarms' | 'receivers' | 'mustSee'
type GroupPageMode = 'list' | 'detail' | 'editor'
type MetricGroupStatusFilter = MetricGroup['status'] | 'all'
type MetricGroupTypeFilter = MetricGroup['type'] | 'all'
type MetricGroupEditorMode = MetricGroupEditorPayload['mode']
type MetricOperator = EventMetricEvent['operator']
type AlarmStrategyDraft = AlarmTask['strategies'][number] & { tempId: EntityId }
type AlarmTimeRangeDraft = { id: EntityId; start: string; end: string }
type MetricFilterDraft = Omit<MetricFilter, 'value'> & { value?: string }

interface MetricPropertyOption {
  id: string
  name: string
  type: 'number' | 'string' | 'boolean' | 'date'
  source: MetricFilter['propertySource']
  status: MetricGroup['status']
}

interface MetricEventDraft {
  code: string
  eventId: EntityId | null
  eventName: string
  eventType: EventMetricEvent['eventType']
  operator: MetricOperator | null
  propertyId: string | null
  filters: MetricFilterDraft[]
  filterTree: FilterGroupDraft
  aggregationFilter: {
    enabled: boolean
    dimensionType: NonNullable<EventMetricEvent['aggregationFilter']>['dimensionType']
    propertyId?: string | null
  }
}

interface MetricEditorDraft {
  id: EntityId
  name: string
  description: string
  metricKind: 'single' | 'composite'
  events: MetricEventDraft[]
  formula: string
  numberFormatType: Metric['numberFormat']['type']
  decimalPlaces: number
  isMustSee: boolean
  flexibleEnabled: boolean
  flexibleProperties: FlexibleProperty[]
  retentionDays: number
  startEvent: MetricEventDraft
  returnEvent: MetricEventDraft
  conversionWindowValue: number
  conversionWindowUnit: 'minute' | 'hour' | 'day'
  funnelSteps: MetricEventDraft[]
  globalFilters: MetricFilterDraft[]
  globalFilterTree: FilterGroupDraft
}

interface MetricGroupEditorDraft {
  mode: MetricGroupEditorMode
  groupId?: EntityId
  appId: EntityId
  name: string
  description: string
  type: MetricGroup['type'] | null
  ownerId: EntityId
  permissionType: MetricGroup['permissionType']
  authorizedUserIds: EntityId[]
  directoryGroupId?: EntityId
  metrics: MetricEditorDraft[]
}

const abStore = useAbTestingStore()
const route = useRoute()
const router = useRouter()
const message = useMessage()

const {
  alarmTasks,
  alarmTriggerRecords,
  experiments,
  metricGroupMergeIds,
  metricDirectoryGroups,
  metricGroups,
  metricTemplates,
  metrics,
  mustSeeMetrics,
  mustSeeTrends,
  operationLogs,
  receiverGroups,
  selectedMetricGroup,
  selectedMetricGroupId,
  selectedMetricGroupMetrics,
} = storeToRefs(abStore)

const currentUserId = 'user_growth_lin'
const adminUserIds = new Set<EntityId>(['user_growth_lin'])
const defaultAppId = 'app_news'

const memberOptions = [
  { label: '林哲 · 增长运营团队', value: 'user_growth_lin' },
  { label: '周婧 · 商业化数据团队', value: 'user_data_zhou' },
  { label: '许澄 · 产品体验团队', value: 'user_product_xu' },
  { label: '陈悦 · 质量保障团队', value: 'user_qa_chen' },
]

const eventCatalog = [
  { id: 'event_ad_watch', name: '激励广告观看完成', key: 'ad_watch_complete', type: 'normal', status: 'active' },
  { id: 'event_popup_show', name: '弹窗曝光', key: 'popup_show', type: 'normal', status: 'active' },
  { id: 'event_ad_click', name: '广告点击', key: 'ad_click', type: 'normal', status: 'active' },
  { id: 'event_app_open', name: '打开 App', key: 'app_open', type: 'normal', status: 'active' },
  { id: 'event_virtual_purchase', name: '虚拟购买完成', key: 'virtual_purchase_done', type: 'virtual', status: 'active' },
  { id: 'event_banner_view', name: 'Banner 曝光', key: 'banner_view', type: 'visual', status: 'active' },
  { id: 'event_legacy_pay', name: '旧支付成功事件', key: 'legacy_pay_success', type: 'normal', status: 'offline' },
] as const

const propertyCatalog: MetricPropertyOption[] = [
  { id: 'scene', name: '广告场景', type: 'string', source: 'event', status: 'active' },
  { id: 'ad_plan_id', name: '广告计划 ID', type: 'string', source: 'event', status: 'active' },
  { id: 'revenue', name: '广告收入', type: 'number', source: 'event', status: 'active' },
  { id: 'city', name: '城市', type: 'string', source: 'public', status: 'active' },
  { id: 'coin_balance', name: '金币余额', type: 'number', source: 'user', status: 'active' },
  { id: 'is_new_user', name: '是否新用户', type: 'boolean', source: 'public', status: 'active' },
  { id: 'legacy_amount', name: '旧金额字段', type: 'number', source: 'event', status: 'offline' },
]

const operatorOptions: Array<{
  label: string
  value: MetricOperator
  needsProperty?: boolean
  confidence?: boolean
  disabled?: boolean
}> = [
  { label: '进组人均次数 pv/au', value: 'pv/au', confidence: true },
  { label: '转化率 uv/au', value: 'uv/au', confidence: true },
  { label: '按属性求进组人均值 sum/au', value: 'sum/au', needsProperty: true, confidence: true },
  { label: '按属性求每日活跃均值 sum/sum(dau) · 历史保留', value: 'sum/sum(dau)', needsProperty: true, disabled: true },
  { label: '每日活跃均次 pv/sum(dau) · 历史保留', value: 'pv/sum(dau)', disabled: true },
  { label: '人均次数 pv/uv', value: 'pv/uv', confidence: true },
  { label: '按属性求人均值 sum/uv', value: 'sum/uv', needsProperty: true, confidence: true },
  { label: '按属性求平均值 sum/pv', value: 'sum/pv', needsProperty: true, confidence: true },
  { label: '总次数 pv', value: 'pv' },
  { label: '总人数 uv', value: 'uv' },
  { label: '按属性求和 sum', value: 'sum', needsProperty: true },
  { label: '按属性去重 count_distinct', value: 'count_distinct', needsProperty: true },
]

const filterOperatorOptions = [
  { label: '等于', value: '=' },
  { label: '不等于', value: '!=' },
  { label: '包含', value: 'contains' },
  { label: '不包含', value: 'not_contains' },
  { label: '大于', value: '>' },
  { label: '大于等于', value: '>=' },
  { label: '小于', value: '<' },
  { label: '小于等于', value: '<=' },
  { label: '有值', value: 'is_not_null' },
  { label: '无值', value: 'is_null' },
  { label: '属于', value: 'in' },
  { label: '不属于', value: 'not_in' },
]

const aggregationDimensionOptions = [
  { label: '人', value: 'user' },
  { label: '事件属性', value: 'event_property' },
  { label: '公共属性', value: 'public_property' },
  { label: '自定义属性', value: 'custom_property' },
]

const activeEntry = ref<MetricEntryKey>('groups')
const groupPageMode = ref<GroupPageMode>('list')
const groupKeyword = ref('')
const debouncedGroupKeyword = ref('')
const groupStatusFilter = ref<MetricGroupStatusFilter>('active')
const groupTypeFilter = ref<MetricGroupTypeFilter>('all')
const groupPage = ref(1)
const groupPageSize = ref(10)
let groupKeywordDebounceTimer: ReturnType<typeof setTimeout> | null = null

const associationModalVisible = ref(false)
const associationFilters = ref({
  status: 'RUNNING' as Experiment['status'] | 'all',
  keyword: '',
  ownerId: 'all' as EntityId | 'all',
})
const historyDrawerVisible = ref(false)
const offlineConfirmVisible = ref(false)
const offlineBlockVisible = ref(false)
const offlineTargetGroup = ref<MetricGroup | null>(null)
const offlineBlockedExperiments = ref<Experiment[]>([])
const permissionEditing = ref(false)
const permissionFieldErrors = ref<Record<string, string>>({})
const permissionDraft = ref({
  ownerId: currentUserId,
  permissionType: 'public' as MetricGroup['permissionType'],
  authorizedUserIds: [] as EntityId[],
})

const mergeDialogVisible = ref(false)
const mergeFieldErrors = ref<Record<string, string>>({})
const mergeDraft = ref({
  name: '',
  description: '',
  ownerId: currentUserId,
  permissionType: 'public' as MetricGroup['permissionType'],
  authorizedUserIds: [] as EntityId[],
  metricNameOverrides: {} as Record<EntityId, string>,
})

const groupEditorSnapshot = ref('')
const groupEditorReturnMode = ref<GroupPageMode>('list')
const groupFieldErrors = ref<Record<string, string>>({})
const expandedMetricIds = ref<EntityId[]>([])
const detailExpandedMetricIds = ref<EntityId[]>([])

const groupEditorDraft = ref<MetricGroupEditorDraft>({
  mode: 'create',
  appId: defaultAppId,
  name: '',
  description: '',
  type: null,
  ownerId: currentUserId,
  permissionType: 'public',
  authorizedUserIds: [],
  metrics: [],
})

const templateKeyword = ref('')
const templateTab = ref<'all' | MetricTemplate['templateType']>('all')
const templateEditorVisible = ref(false)
const templateFieldErrors = ref<Record<string, string>>({})
const templateGroupKeyword = ref('')
const templateGroupSnapshot = ref<EntityId[]>([])
const templateDraft = ref({
  mode: 'create' as 'create' | 'edit',
  templateId: undefined as EntityId | undefined,
  appId: defaultAppId,
  name: '',
  description: '',
  ownerId: currentUserId,
  templateType: 'personal' as MetricTemplate['templateType'],
  availableUserIds: [] as EntityId[],
  metricGroupIds: [] as EntityId[],
})

const alarmKeyword = ref('')
const alarmStatusFilter = ref<'all' | 'enabled' | 'disabled'>('all')
const alarmTypeFilter = ref<AlarmTask['alarmType'] | 'all'>('all')
const alarmEditorVisible = ref(false)
const alarmRecordDrawerVisible = ref(false)
const selectedAlarmRecordTaskId = ref<EntityId | null>(null)
const alarmFieldErrors = ref<Record<string, string>>({})
const alarmDraft = ref({
  mode: 'create' as 'create' | 'edit',
  id: undefined as EntityId | undefined,
  appId: defaultAppId,
  name: '',
  description: '',
  alarmType: 'experiment' as AlarmTask['alarmType'],
  level: 'notice' as AlarmTask['level'],
  interval: '1h' as AlarmTask['interval'],
  enabled: false,
  ruleRelation: 'any' as AlarmTask['ruleRelation'],
  experimentId: 'exp_feed_strategy' as EntityId | undefined,
  dashboardId: 'board_growth_overview',
  strategies: [] as AlarmStrategyDraft[],
  channels: ['feishu'] as AlarmTask['notification']['channels'],
  feishuWebhook: 'https://open.feishu.cn/open-apis/bot/v2/hook/***',
  dingtalkWebhook: '',
  wecomWebhook: '',
  receiverGroupIds: ['rg_experiment_owner'] as EntityId[],
  timeRanges: [{ id: 'time_default', start: '00:00', end: '23:59' }] as AlarmTimeRangeDraft[],
})

const receiverEditorVisible = ref(false)
const receiverDeleteBlockedVisible = ref(false)
const receiverBlockedAlarmTasks = ref<AlarmTask[]>([])
const receiverFieldErrors = ref<Record<string, string>>({})
const receiverDraft = ref({
  mode: 'create' as 'create' | 'edit',
  id: undefined as EntityId | undefined,
  appId: defaultAppId,
  name: '',
  memberIds: [] as EntityId[],
})

const mustSeeFilters = ref({
  grain: 'day',
  range: '7d',
  experimentMode: 'all',
  experimentVersionIds: [] as EntityId[],
  dimensionType: 'all',
  dimensionOperator: '=',
  dimensionValue: '',
})
const hoveredTrendId = ref<EntityId | null>(null)

const moduleEntries: Array<{
  key: MetricEntryKey
  label: string
  description: string
  icon: Component
}> = [
  { key: 'groups', label: '指标组列表', description: '创建、搜索、合并、复制、编辑、下线指标组', icon: ListOutline },
  { key: 'templates', label: '指标组模板管理', description: '把常用指标组集合保存为实验模板', icon: CopyOutline },
  { key: 'alarms', label: '报警任务', description: '配置大盘报警和实验报警策略', icon: AlarmOutline },
  { key: 'receivers', label: '接收组', description: '维护邮件报警收件人', icon: PeopleOutline },
  { key: 'mustSee', label: '必看指标看板', description: '守护关键业务指标并反查实验', icon: StatsChartOutline },
]

function createTempId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function createEmptyFilter(): MetricFilterDraft {
  return {
    id: createTempId('filter'),
    propertyId: '',
    propertySource: 'event',
    operator: '=',
    value: '',
  }
}

function createEmptyFilterGroup(conditions: MetricFilterDraft[] = []): FilterGroupDraft {
  return {
    id: createTempId('filter_group'),
    relation: 'AND',
    conditions,
    groups: [],
  }
}

function createEmptyEventDraft(code: string): MetricEventDraft {
  return {
    code,
    eventId: null,
    eventName: '',
    eventType: 'normal',
    operator: null,
    propertyId: null,
    filters: [],
    filterTree: createEmptyFilterGroup(),
    aggregationFilter: {
      enabled: false,
      dimensionType: 'user',
      propertyId: null,
    },
  }
}

function createEmptyMetricDraft(type: MetricGroup['type']): MetricEditorDraft {
  const id = createTempId('draft_metric')
  return {
    id,
    name: '',
    description: '',
    metricKind: 'single',
    events: [createEmptyEventDraft('A')],
    formula: '',
    numberFormatType: type === 'event' ? 'number' : 'percent',
    decimalPlaces: 4,
    isMustSee: false,
    flexibleEnabled: false,
    flexibleProperties: [],
    retentionDays: 30,
    startEvent: createEmptyEventDraft('起始事件'),
    returnEvent: createEmptyEventDraft('回访事件'),
    conversionWindowValue: 30,
    conversionWindowUnit: 'minute',
    funnelSteps: [createEmptyEventDraft('1'), createEmptyEventDraft('2')],
    globalFilters: [],
    globalFilterTree: createEmptyFilterGroup(),
  }
}

function memberName(userId?: EntityId) {
  return memberOptions.find((member) => member.value === userId)?.label.split(' · ')[0] ?? userId ?? '-'
}

function groupTypeLabel(type?: MetricGroup['type'] | null) {
  if (type === 'event') return '事件指标'
  if (type === 'retention') return '留存指标'
  if (type === 'funnel') return '漏斗指标'
  return '未选择'
}

function groupStatusLabel(status: MetricGroup['status']) {
  return status === 'active' ? '使用中' : '已下线'
}

const groupStatusHeaderHint = computed(() =>
  groupStatusFilter.value === 'all' ? '全部状态' : `当前：${groupStatusLabel(groupStatusFilter.value)}`,
)

function cycleGroupStatusFilter() {
  const order: MetricGroupStatusFilter[] = ['active', 'offline', 'all']
  const nextIndex = (Math.max(0, order.indexOf(groupStatusFilter.value)) + 1) % order.length
  groupStatusFilter.value = order[nextIndex] ?? 'active'
}

function metricKindLabel(kind: Metric['metricKind']) {
  return kind === 'composite' ? '组合指标' : '单一指标'
}

function permissionLabel(type: MetricGroup['permissionType']) {
  return type === 'public' ? '公共指标组' : '私有指标组'
}

function directoryName(directoryGroupId?: EntityId) {
  return metricDirectoryGroups.value.find((directory) => directory.id === directoryGroupId)?.name ?? '未归类'
}

function templateTypeLabel(type: MetricTemplate['templateType']) {
  return type === 'common' ? '通用模板' : '个人模板'
}

function alarmTypeLabel(type: AlarmTask['alarmType']) {
  return type === 'dashboard' ? '大盘报警' : '实验报警'
}

function alarmLevelLabel(level: AlarmTask['level']) {
  if (level === 'critical') return '危急'
  if (level === 'warning') return '警告'
  return '注意'
}

function formatDate(value?: string) {
  return value ? value.slice(0, 10) : '-'
}

function canViewGroup(group: MetricGroup) {
  if (group.permissionType === 'public') return true
  return adminUserIds.has(currentUserId) || group.ownerId === currentUserId || group.authorizedUserIds.includes(currentUserId)
}

function canEditGroup(group: MetricGroup) {
  return group.status === 'active' && (adminUserIds.has(currentUserId) || group.ownerId === currentUserId)
}

function canEditTemplate(template: MetricTemplate) {
  return adminUserIds.has(currentUserId) || template.ownerId === currentUserId
}

function canViewTemplate(template: MetricTemplate) {
  return (
    template.templateType === 'common' ||
    adminUserIds.has(currentUserId) ||
    template.ownerId === currentUserId ||
    template.availableUserIds.includes(currentUserId)
  )
}

function getGroupMetrics(group?: MetricGroup | null) {
  if (!group) return []
  return group.metricIds
    .map((metricId) => metrics.value.find((metric) => metric.id === metricId))
    .filter((metric): metric is Metric => Boolean(metric))
}

function getMetricGroup(metric: Metric) {
  return metricGroups.value.find((group) => group.id === metric.metricGroupId)
}

function metricName(metricId?: EntityId | null) {
  return metrics.value.find((metric) => metric.id === metricId)?.name ?? metricId ?? '-'
}

function getEventMeta(eventId?: EntityId | null) {
  return eventCatalog.find((event) => event.id === eventId)
}

function getPropertyMeta(propertyId?: string | null) {
  return propertyCatalog.find((property) => property.id === propertyId)
}

function cloneFilterDraft(filter: MetricFilter): MetricFilterDraft {
  return {
    ...filter,
    id: filter.id || createTempId('filter'),
    value: filter.value === undefined || filter.value === null ? '' : String(filter.value),
  }
}

function cloneFilterGroupDraft(filterTree?: MetricFilterGroup, fallbackFilters: MetricFilter[] = []): FilterGroupDraft {
  if (!filterTree) {
    return createEmptyFilterGroup(fallbackFilters.map(cloneFilterDraft))
  }
  return {
    id: filterTree.id || createTempId('filter_group'),
    relation: filterTree.relation ?? 'AND',
    conditions: (filterTree.conditions ?? []).map(cloneFilterDraft),
    groups: (filterTree.groups ?? []).map((group) => cloneFilterGroupDraft(group)),
  }
}

function buildFilterGroupPayload(group: FilterGroupDraft): MetricFilterGroup {
  return {
    id: group.id,
    relation: group.relation,
    conditions: group.conditions.map((filter) => ({
      id: filter.id,
      propertyId: filter.propertyId,
      propertySource: filter.propertySource,
      operator: filter.operator,
      value: filter.value ?? '',
    })),
    groups: group.groups.map(buildFilterGroupPayload),
  }
}

function flattenFilterGroup(group: FilterGroupDraft): MetricFilter[] {
  return [
    ...group.conditions.map((filter) => ({
      id: filter.id,
      propertyId: filter.propertyId,
      propertySource: filter.propertySource,
      operator: filter.operator,
      value: filter.value ?? '',
    })),
    ...group.groups.flatMap(flattenFilterGroup),
  ]
}

function cloneEventDraft(event: EventMetricEvent, fallbackCode: string): MetricEventDraft {
  return {
    code: event.code || fallbackCode,
    eventId: event.eventId || null,
    eventName: event.eventName ?? getEventMeta(event.eventId)?.name ?? '',
    eventType: event.eventType ?? 'normal',
    operator: event.operator ?? null,
    propertyId: event.propertyId ?? null,
    filters: event.filters.map(cloneFilterDraft),
    filterTree: cloneFilterGroupDraft(event.filterTree, event.filters),
    aggregationFilter: {
      enabled: event.aggregationFilter?.enabled ?? false,
      dimensionType: event.aggregationFilter?.dimensionType ?? 'user',
      propertyId: event.aggregationFilter?.propertyId ?? null,
    },
  }
}

const groupTypeOptions = [
  { label: '事件指标', value: 'event' },
  { label: '留存指标', value: 'retention' },
  { label: '漏斗指标', value: 'funnel' },
]

const eventOptions = computed(() =>
  eventCatalog.map((event) => ({
    label: `${event.name} · ${event.key}${event.status === 'offline' ? '（已下线）' : ''}`,
    value: event.id,
    disabled: event.status === 'offline',
  })),
)

const anyPropertyOptions = computed(() =>
  propertyCatalog.map((property) => ({
    label: `${property.name} · ${property.id}${property.status === 'offline' ? '（已下线）' : ''}`,
    value: property.id,
    disabled: property.status === 'offline',
  })),
)

const activeGroupOptions = computed(() =>
  visibleGroups.value
    .filter((group) => group.status === 'active')
    .map((group) => ({ label: `${group.name} · ${groupTypeLabel(group.type)}`, value: group.id })),
)

const activeMetricOptions = computed(() =>
  metrics.value
    .filter((metric) => metric.status === 'active' && metric.metricCategory !== 'funnel')
    .map((metric) => ({ label: `${metric.name} · ${groupTypeLabel(metric.metricCategory)}`, value: metric.id })),
)

const retentionMetricOptions = computed(() =>
  metrics.value
    .filter((metric) => metric.status === 'active' && metric.metricCategory === 'retention')
    .map((metric) => ({ label: metric.name, value: metric.id })),
)

const experimentOptions = computed(() =>
  experiments.value.map((experiment) => ({
    label: `${experiment.name} · ${experiment.id} · ${memberName(experiment.ownerId)}`,
    value: experiment.id,
  })),
)

const receiverOptions = computed(() =>
  receiverGroups.value.map((group) => ({ label: `${group.name} · ${group.memberNames.join('、')}`, value: group.id })),
)

const visibleGroups = computed(() => metricGroups.value.filter((group) => canViewGroup(group)))

const filteredGroups = computed(() => {
  const keyword = debouncedGroupKeyword.value.trim().toLowerCase()
  return visibleGroups.value.filter((group) => {
    const statusMatched = groupStatusFilter.value === 'all' || group.status === groupStatusFilter.value
    const typeMatched = groupTypeFilter.value === 'all' || group.type === groupTypeFilter.value
    const text = [group.name, group.description, group.owner.name, group.creatorId, memberName(group.creatorId)].join(' ').toLowerCase()
    return statusMatched && typeMatched && (!keyword || text.includes(keyword))
  })
})

const pagedGroups = computed(() => {
  const maxPage = Math.max(1, Math.ceil(filteredGroups.value.length / groupPageSize.value))
  if (groupPage.value > maxPage) groupPage.value = maxPage
  const start = (groupPage.value - 1) * groupPageSize.value
  return filteredGroups.value.slice(start, start + groupPageSize.value)
})

const selectedGroupExperiments = computed(() => {
  if (!selectedMetricGroup.value) return []
  return selectedMetricGroup.value.relatedExperimentIds
    .map((experimentId) => experiments.value.find((experiment) => experiment.id === experimentId))
    .filter((experiment): experiment is Experiment => Boolean(experiment))
})

const filteredSelectedGroupExperiments = computed(() => {
  const keyword = associationFilters.value.keyword.trim().toLowerCase()
  return selectedGroupExperiments.value.filter((experiment) => {
    const statusMatched = associationFilters.value.status === 'all' || experiment.status === associationFilters.value.status
    const ownerMatched = associationFilters.value.ownerId === 'all' || experiment.ownerId === associationFilters.value.ownerId
    const text = [experiment.name, experiment.id, memberName(experiment.ownerId)].join(' ').toLowerCase()
    return statusMatched && ownerMatched && (!keyword || text.includes(keyword))
  })
})

const selectedGroupLogs = computed(() =>
  operationLogs.value.filter(
    (log) =>
      selectedMetricGroup.value &&
      ((log.objectType === 'METRIC_GROUP' && log.objectId === selectedMetricGroup.value.id) ||
        selectedMetricGroup.value.metricIds.includes(log.objectId)),
  ),
)

function historyActionLabel(action: string) {
  const labels: Record<string, string> = {
    create: '创建指标组',
    edit: '编辑指标组',
    copy: '复制指标组',
    copy_save: '复制保存指标组',
    merge: '合并创建指标组',
    offline: '下线指标组',
    toggle_must_see_metric: '设置/取消必看指标',
    edit_receiver_group: '编辑接收组',
    create_receiver_group: '创建接收组',
  }
  return labels[action] ?? action
}

function historyChangedFields(log: OperationLog) {
  const beforeKeys = Object.keys((log.before ?? {}) as Record<string, unknown>)
  const afterKeys = Object.keys((log.after ?? {}) as Record<string, unknown>)
  return [...new Set([...beforeKeys, ...afterKeys])].join('、') || '-'
}

function historySnapshotText(value?: unknown) {
  if (!value || typeof value !== 'object') return '-'
  return Object.entries(value as Record<string, unknown>)
    .map(([key, item]) => `${key}: ${Array.isArray(item) ? item.join(',') : String(item)}`)
    .join('；')
}

const mergeSources = computed(() =>
  metricGroupMergeIds.value
    .map((groupId) => metricGroups.value.find((group) => group.id === groupId))
    .filter((group): group is MetricGroup => Boolean(group)),
)

const mergeSourceMetrics = computed(() => mergeSources.value.flatMap((group) => getGroupMetrics(group).map((metric) => ({ group, metric }))))

const mergeDuplicateMessage = computed(() => {
  const names = mergeSourceMetrics.value.map(({ metric }) => (mergeDraft.value.metricNameOverrides[metric.id] ?? metric.name).trim())
  if (names.some((name) => !name)) return '指标名称不能为空'
  return new Set(names).size !== names.length ? '指标名称重复，请修改后再合并' : ''
})

const groupEditorDirty = computed(() => groupPageMode.value === 'editor' && JSON.stringify(groupEditorDraft.value) !== groupEditorSnapshot.value)

const directoryModalVisible = ref(false)
const directoryFieldErrors = ref<Record<string, string>>({})
const directoryDraft = ref({
  name: '',
  description: '',
})

const directoryOptions = computed(() => [
  ...metricDirectoryGroups.value.map((directory) => ({ label: directory.name, value: directory.id })),
  { label: '新建目录分组', value: 'dir_new_group' },
])

const filteredTemplates = computed(() => {
  const keyword = templateKeyword.value.trim().toLowerCase()
  return metricTemplates.value.filter((template) => {
    const tabMatched = templateTab.value === 'all' || template.templateType === templateTab.value
    const groupNames = template.metricGroupIds
      .map((groupId) => metricGroups.value.find((group) => group.id === groupId)?.name ?? '')
      .join(' ')
    const text = [template.name, template.description, memberName(template.ownerId), groupNames].join(' ').toLowerCase()
    return tabMatched && canViewTemplate(template) && (!keyword || text.includes(keyword))
  })
})

const availableTemplateGroups = computed(() => {
  const keyword = templateGroupKeyword.value.trim().toLowerCase()
  return visibleGroups.value
    .filter((group) => group.status === 'active')
    .filter((group) => {
      const text = [group.name, group.description, group.owner.name, memberName(group.ownerId)].join(' ').toLowerCase()
      return !keyword || text.includes(keyword)
    })
})

const filteredAlarms = computed(() => {
  const keyword = alarmKeyword.value.trim().toLowerCase()
  return alarmTasks.value.filter((task) => {
    const statusMatched = alarmStatusFilter.value === 'all' || (alarmStatusFilter.value === 'enabled' ? task.enabled : !task.enabled)
    const typeMatched = alarmTypeFilter.value === 'all' || task.alarmType === alarmTypeFilter.value
    const strategyText = task.strategies.map((strategy) => metricName(strategy.metricId)).join(' ')
    const text = [task.name, task.description, strategyText, alarmTypeLabel(task.alarmType)].join(' ').toLowerCase()
    return statusMatched && typeMatched && (!keyword || text.includes(keyword))
  })
})

const selectedAlarmRecordTask = computed(() =>
  alarmTasks.value.find((task) => task.id === selectedAlarmRecordTaskId.value),
)

const selectedAlarmRecords = computed(() =>
  alarmTriggerRecords.value
    .filter((record) => !selectedAlarmRecordTaskId.value || record.alarmTaskId === selectedAlarmRecordTaskId.value)
    .sort((left, right) => right.triggeredAt.localeCompare(left.triggeredAt)),
)

const mustSeeTrendCards = computed(() =>
  mustSeeTrends.value
    .filter((trend) => mustSeeMetrics.value.some((metric) => metric.id === trend.metricId))
    .map((trend) => {
      const points = mustSeeFilters.value.range === '3d' ? trend.points.slice(-3) : trend.points
      const latestPoint = points[points.length - 1]
      return {
        ...trend,
        points,
        latestPoint,
        newCount: latestPoint?.relatedNewExperimentIds.length ?? 0,
        runningCount: latestPoint?.relatedRunningExperimentIds.length ?? 0,
      }
    })
    .filter((trend) => {
      if (mustSeeFilters.value.experimentMode === 'new') return trend.newCount > 0
      if (mustSeeFilters.value.experimentMode === 'running') return trend.runningCount > 0
      return true
    }),
)

const mustSeeExperimentVersionOptions = computed(() =>
  experiments.value.flatMap((experiment) => [
    { label: `${experiment.name} / 对照组`, value: `${experiment.id}:control` },
    { label: `${experiment.name} / 实验组`, value: `${experiment.id}:treatment` },
  ]),
)

const mustSeeRangeWarning = computed(() => {
  if (mustSeeFilters.value.grain === '5m' && mustSeeFilters.value.range !== '24h') {
    return '5分钟级最长查询范围为24小时，请缩短时间范围。'
  }
  if (mustSeeFilters.value.grain === 'hour' && mustSeeFilters.value.range === '365d') {
    return '小时级最长查询范围为30天，请缩短时间范围。'
  }
  return ''
})

function setActiveEntry(entry: MetricEntryKey) {
  activeEntry.value = entry
  if (entry === 'groups' && groupPageMode.value === 'editor' && groupEditorDirty.value) {
    const confirmed = window.confirm('当前修改尚未保存，离开后将丢失已编辑内容。确认离开？')
    if (!confirmed) return
  }
  if (entry === 'groups') {
    groupPageMode.value = selectedMetricGroup.value ? 'list' : 'list'
  }
}

function syncGroupFromRoute() {
  const routeGroupId = typeof route.params.metricGroupId === 'string' ? route.params.metricGroupId : ''
  if (routeGroupId && metricGroups.value.some((group) => group.id === routeGroupId && canViewGroup(group))) {
    selectedMetricGroupId.value = routeGroupId
    activeEntry.value = 'groups'
    groupPageMode.value = 'detail'
  }
}

function openGroupDetail(group: MetricGroup) {
  if (!canViewGroup(group)) {
    message.warning('暂无查看该指标组详情的权限')
    return
  }
  selectedMetricGroupId.value = group.id
  activeEntry.value = 'groups'
  groupPageMode.value = 'detail'
  void router.push(`/ab-testing/metrics/${group.id}`)
}

function backToGroupList() {
  groupPageMode.value = 'list'
  detailExpandedMetricIds.value = []
  void router.push('/ab-testing/metrics')
}

function toggleMergeSelection(groupId: EntityId, checked: boolean) {
  metricGroupMergeIds.value = checked
    ? [...new Set([...metricGroupMergeIds.value, groupId])]
    : metricGroupMergeIds.value.filter((id) => id !== groupId)
}

function prepareMergeDialog() {
  if (metricGroupMergeIds.value.length < 2) {
    message.warning('请至少选择两个指标组')
    return
  }
  const sources = mergeSources.value
  if (sources.some((group) => group.status !== 'active')) {
    message.warning('仅使用中的指标组支持合并')
    return
  }
  if (new Set(sources.map((group) => group.type)).size > 1) {
    message.warning('请选择同一种指标类型的指标组合并')
    return
  }
  if (sources[0]?.type !== 'event') {
    message.warning('留存指标组和漏斗指标组每组仅允许一个指标，不支持合并')
    return
  }
  mergeFieldErrors.value = {}
  mergeDraft.value = {
    name: '',
    description: '',
    ownerId: currentUserId,
    permissionType: sources.some((group) => group.permissionType === 'private') ? 'private' : 'public',
    authorizedUserIds: [...new Set(sources.flatMap((group) => group.authorizedUserIds))],
    metricNameOverrides: Object.fromEntries(mergeSourceMetrics.value.map(({ metric }) => [metric.id, metric.name])),
  }
  mergeDialogVisible.value = true
}

async function confirmMerge() {
  if (mergeDuplicateMessage.value) {
    mergeFieldErrors.value = { metricNames: mergeDuplicateMessage.value }
    return
  }
  const result = await abStore.mergeMetricGroups(mergeDraft.value)
  mergeFieldErrors.value = result.fieldErrors ?? {}
  message[result.group ? 'success' : 'warning'](result.message)
  if (result.group) {
    mergeDialogVisible.value = false
    metricGroupMergeIds.value = []
    openGroupDetail(result.group)
  }
}

function runningExperimentsForGroup(group: MetricGroup) {
  return group.relatedExperimentIds
    .map((experimentId) => experiments.value.find((experiment) => experiment.id === experimentId))
    .filter((experiment): experiment is Experiment => experiment?.status === 'RUNNING')
}

function requestOfflineGroup(group: MetricGroup) {
  if (!canEditGroup(group)) {
    message.warning('仅指标组 Owner 或管理员可下线')
    return
  }
  const runningExperiments = runningExperimentsForGroup(group)
  if (runningExperiments.length) {
    offlineBlockedExperiments.value = runningExperiments
    offlineBlockVisible.value = true
    return
  }
  offlineTargetGroup.value = group
  offlineConfirmVisible.value = true
}

function startPermissionEditing() {
  if (!selectedMetricGroup.value) return
  if (!canEditGroup(selectedMetricGroup.value)) {
    message.warning('仅指标组 Owner 或管理员可配置权限')
    return
  }
  permissionFieldErrors.value = {}
  permissionDraft.value = {
    ownerId: selectedMetricGroup.value.ownerId,
    permissionType: selectedMetricGroup.value.permissionType,
    authorizedUserIds: [...selectedMetricGroup.value.authorizedUserIds],
  }
  permissionEditing.value = true
}

function cancelPermissionEditing() {
  permissionEditing.value = false
  permissionFieldErrors.value = {}
}

async function savePermissionConfig() {
  const group = selectedMetricGroup.value
  if (!group) return
  if (!permissionDraft.value.ownerId) {
    permissionFieldErrors.value = { ownerId: '请选择 Owner' }
    return
  }
  const payload: MetricGroupEditorPayload = {
    mode: 'edit',
    groupId: group.id,
    appId: group.appId,
    name: group.name,
    description: group.description,
    type: group.type,
    ownerId: permissionDraft.value.ownerId,
    permissionType: permissionDraft.value.permissionType,
    authorizedUserIds:
      permissionDraft.value.permissionType === 'private'
        ? permissionDraft.value.authorizedUserIds.filter((userId) => userId !== permissionDraft.value.ownerId)
        : [],
    directoryGroupId: group.directoryGroupId,
    metrics: selectedMetricGroupMetrics.value,
  }
  const result = await abStore.saveMetricGroup(payload)
  permissionFieldErrors.value = result.fieldErrors ?? {}
  message[result.group ? 'success' : 'warning'](result.group ? '权限配置已保存' : result.message)
  if (result.group) {
    permissionEditing.value = false
    openGroupDetail(result.group)
  }
}

async function confirmOfflineGroup() {
  if (!offlineTargetGroup.value) return
  const result = await abStore.offlineMetricGroup(offlineTargetGroup.value.id)
  message[result.group && !result.relatedExperiments?.length ? 'success' : 'warning'](result.message)
  if (result.relatedExperiments?.length) {
    offlineBlockedExperiments.value = result.relatedExperiments
    offlineBlockVisible.value = true
  }
  offlineConfirmVisible.value = false
  offlineTargetGroup.value = null
}

function createCopyName(baseName: string) {
  const existingNames = new Set(metricGroups.value.map((group) => group.name.toLowerCase()))
  const firstName = `${baseName}-复制`
  if (!existingNames.has(firstName.toLowerCase())) return firstName
  let index = 2
  while (existingNames.has(`${firstName}${index}`.toLowerCase())) index += 1
  return `${firstName}${index}`
}

function openGroupEditor(mode: MetricGroupEditorMode, group?: MetricGroup) {
  if (mode !== 'create' && group && !canEditGroup(group) && mode === 'edit') {
    message.warning('仅指标组 Owner 或管理员可编辑')
    return
  }
  groupEditorReturnMode.value = groupPageMode.value === 'editor' ? 'list' : groupPageMode.value
  groupFieldErrors.value = {}
  const draftType = group?.type ?? null
  const groupMetrics = group ? getGroupMetrics(group) : []
  groupEditorDraft.value = {
    mode,
    groupId: mode === 'edit' ? group?.id : undefined,
    appId: group?.appId ?? defaultAppId,
    name: mode === 'copy' && group ? createCopyName(group.name) : group?.name ?? '',
    description: group?.description ?? '',
    type: draftType,
    ownerId: mode === 'copy' ? currentUserId : group?.ownerId ?? currentUserId,
    permissionType: group?.permissionType ?? 'public',
    authorizedUserIds: group?.authorizedUserIds ? [...group.authorizedUserIds] : [],
    directoryGroupId: group?.directoryGroupId,
    metrics: groupMetrics.length ? groupMetrics.map(buildDraftFromMetric) : [],
  }
  expandedMetricIds.value = groupEditorDraft.value.metrics.map((metric) => metric.id)
  resetGroupEditorSnapshot()
  activeEntry.value = 'groups'
  groupPageMode.value = 'editor'
}

function resetGroupEditorSnapshot() {
  groupEditorSnapshot.value = JSON.stringify(groupEditorDraft.value)
}

function cancelGroupEditor() {
  if (groupEditorDirty.value) {
    const confirmed = window.confirm('当前修改尚未保存，离开后将丢失已编辑内容。确认离开？')
    if (!confirmed) return
  }
  groupPageMode.value = groupEditorReturnMode.value
}

function handleDirectoryChange(value: string | null) {
  if (value === 'dir_new_group') {
    directoryFieldErrors.value = {}
    directoryDraft.value = { name: '', description: '' }
    directoryModalVisible.value = true
    return
  }
  groupEditorDraft.value.directoryGroupId = value || undefined
}

async function saveDirectoryGroup() {
  const name = directoryDraft.value.name.trim()
  const description = directoryDraft.value.description.trim()
  const errors: Record<string, string> = {}
  if (!name) errors.name = '请输入分组名称'
  if (name.length > 50) errors.name = '分组名称不能超过 50 个字符'
  if (description.length > 200) errors.description = '分组描述不能超过 200 个字符'
  if (metricDirectoryGroups.value.some((group) => group.appId === defaultAppId && group.name.trim() === name)) errors.name = '当前应用内已存在同名目录分组'
  directoryFieldErrors.value = errors
  if (Object.keys(errors).length) return

  const result = await abStore.saveMetricDirectoryGroup({
    appId: defaultAppId,
    name,
    description,
  })
  directoryFieldErrors.value = result.fieldErrors ?? {}
  message[result.directoryGroup ? 'success' : 'warning'](result.message)
  if (result.directoryGroup) {
    groupEditorDraft.value.directoryGroupId = result.directoryGroup.id
    directoryModalVisible.value = false
  }
}

function changeEditorType(value: string | null) {
  if (!value) return
  const type = value as MetricGroup['type']
  if (groupEditorDraft.value.type === type) return
  const hasContent = groupEditorDraft.value.metrics.some((metric) => metric.name.trim())
  if (hasContent) {
    const confirmed = window.confirm('切换类型后，当前已配置的指标内容将被清空。确认切换？')
    if (!confirmed) return
  }
  groupEditorDraft.value.type = type
  groupEditorDraft.value.metrics = [createEmptyMetricDraft(type)]
  expandedMetricIds.value = groupEditorDraft.value.metrics.map((metric) => metric.id)
}

function ensureMetricsForType() {
  const type = groupEditorDraft.value.type
  if (!type) return
  if (!groupEditorDraft.value.metrics.length) {
    groupEditorDraft.value.metrics = [createEmptyMetricDraft(type)]
    expandedMetricIds.value = groupEditorDraft.value.metrics.map((metric) => metric.id)
  }
}

function addMetricDraft() {
  if (groupEditorDraft.value.type !== 'event') return
  if (groupEditorDraft.value.metrics.length >= 100) {
    message.warning('一个事件指标组最多支持100个事件指标')
    return
  }
  const metric = createEmptyMetricDraft('event')
  groupEditorDraft.value.metrics.push(metric)
  expandedMetricIds.value.push(metric.id)
}

function removeMetricDraft(metricId: EntityId) {
  if (groupEditorDraft.value.metrics.length <= 1) {
    message.warning('指标配置至少包含1个指标')
    return
  }
  const metric = groupEditorDraft.value.metrics.find((item) => item.id === metricId)
  if (metric && !metric.id.startsWith('draft_')) {
    const confirmed = window.confirm('删除后，该指标将从当前指标组中移除。确认删除？')
    if (!confirmed) return
  }
  groupEditorDraft.value.metrics = groupEditorDraft.value.metrics.filter((metric) => metric.id !== metricId)
}

function toggleMetricExpanded(metricId: EntityId) {
  expandedMetricIds.value = expandedMetricIds.value.includes(metricId)
    ? expandedMetricIds.value.filter((id) => id !== metricId)
    : [...expandedMetricIds.value, metricId]
}

function toggleDetailMetric(metricId: EntityId) {
  detailExpandedMetricIds.value = detailExpandedMetricIds.value.includes(metricId)
    ? detailExpandedMetricIds.value.filter((id) => id !== metricId)
    : [...detailExpandedMetricIds.value, metricId]
}

function updateMetricKind(metric: MetricEditorDraft, value: string) {
  const kind = value as MetricEditorDraft['metricKind']
  metric.metricKind = kind
  if (kind === 'single') {
    metric.events = [metric.events[0] ?? createEmptyEventDraft('A')]
    metric.formula = ''
  } else if (metric.events.length < 2) {
    metric.events = [metric.events[0] ?? createEmptyEventDraft('A'), createEmptyEventDraft('B')]
    metric.formula = 'A/B'
  }
}

function syncEventMeta(event: MetricEventDraft, eventId: string | null) {
  const meta = getEventMeta(eventId)
  event.eventId = eventId
  event.eventName = meta?.name ?? ''
  event.eventType = meta?.type === 'visual' ? 'visual' : meta?.type === 'virtual' ? 'virtual' : 'normal'
}

function addMetricEvent(metric: MetricEditorDraft) {
  if (metric.events.length >= 26) {
    message.warning('组合指标最多支持26个事件')
    return
  }
  metric.events.push(createEmptyEventDraft(String.fromCharCode(65 + metric.events.length)))
}

function removeMetricEvent(metric: MetricEditorDraft, index: number) {
  if (metric.events.length <= 2) {
    message.warning('组合指标至少保留2个事件')
    return
  }
  metric.events.splice(index, 1)
  metric.events.forEach((event, eventIndex) => {
    event.code = String.fromCharCode(65 + eventIndex)
  })
}

function handleFilterPropertyChange(filter: MetricFilterDraft, propertyId: string) {
  const property = getPropertyMeta(propertyId)
  filter.propertyId = propertyId
  filter.propertySource = property?.source ?? 'event'
}

function addFlexibleProperty(metric: MetricEditorDraft) {
  const property = propertyCatalog.find((item) => item.status === 'active')
  if (!property) return
  metric.flexibleEnabled = true
  metric.flexibleProperties.push({
    id: createTempId('flex'),
    scope: '全',
    propertyId: property.id,
    propertyName: property.name,
    defaultOperator: '=',
    defaultValue: '',
  })
}

function removeFlexibleProperty(metric: MetricEditorDraft, propertyId: EntityId) {
  metric.flexibleProperties = metric.flexibleProperties.filter((property) => property.id !== propertyId)
}

function handleFlexiblePropertyChange(property: FlexibleProperty, propertyId: string) {
  const meta = getPropertyMeta(propertyId)
  property.propertyId = propertyId
  property.propertyName = meta?.name ?? propertyId
}

function flexibleScopeOptions(metric: MetricEditorDraft) {
  if (groupEditorDraft.value.type === 'retention') {
    return ['起始事件', '回访事件', '全'].map((scope) => ({ label: scope, value: scope }))
  }
  return [...metric.events.map((event) => event.code), '全'].map((scope) => ({ label: scope, value: scope }))
}

function propertyOptionsForOperator(operator?: MetricOperator | null) {
  const option = operatorOptions.find((item) => item.value === operator)
  return propertyCatalog
    .filter((property) => property.status === 'active')
    .filter((property) => !option?.needsProperty || option.value === 'count_distinct' || property.type === 'number')
    .map((property) => ({ label: `${property.name} · ${property.id}`, value: property.id }))
}

function metricNeedsProperty(event: MetricEventDraft) {
  return Boolean(operatorOptions.find((operator) => operator.value === event.operator)?.needsProperty)
}

function supportsAggregationFilter(event: MetricEventDraft) {
  return ['uv', 'pv/uv', 'pv/au', 'uv/au', 'sum/uv'].includes(event.operator ?? '')
}

function aggregationPropertyOptions(dimensionType: NonNullable<EventMetricEvent['aggregationFilter']>['dimensionType']) {
  if (dimensionType === 'user') return []
  const source = dimensionType === 'event_property' ? 'event' : dimensionType === 'public_property' ? 'public' : 'custom'
  return propertyCatalog
    .filter((property) => property.status === 'active')
    .filter((property) => property.source === source || (source === 'custom' && property.source === 'user'))
    .map((property) => ({ label: `${property.name} · ${property.id}`, value: property.id }))
}

function aggregationFilterText(event: EventMetricEvent) {
  if (!event.aggregationFilter?.enabled) return '未启用'
  const dimensionName = aggregationDimensionOptions.find((option) => option.value === event.aggregationFilter?.dimensionType)?.label ?? event.aggregationFilter.dimensionType
  const propertyName = event.aggregationFilter.dimensionType === 'user' ? '' : ` · ${propertyLabel(event.aggregationFilter.propertyId)}`
  return `${dimensionName}${propertyName}`
}

function formulaFeedback(metric: MetricEditorDraft) {
  if (metric.metricKind !== 'composite') return ''
  const result = validateMetricFormula(metric.formula, metric.events.map((event) => event.code))
  return result.valid ? '公式可解析，保存时将按当前事件编号生成组合指标。' : result.message
}

function addFunnelStep(metric: MetricEditorDraft) {
  if (metric.funnelSteps.length >= 10) {
    message.warning('漏斗事件最多支持10个步骤')
    return
  }
  metric.funnelSteps.push(createEmptyEventDraft(String(metric.funnelSteps.length + 1)))
}

function removeFunnelStep(metric: MetricEditorDraft, index: number) {
  if (metric.funnelSteps.length <= 2) {
    message.warning('漏斗指标至少需要2个步骤')
    return
  }
  metric.funnelSteps.splice(index, 1)
  metric.funnelSteps.forEach((step, stepIndex) => {
    step.code = String(stepIndex + 1)
  })
}

function moveFunnelStep(metric: MetricEditorDraft, index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= metric.funnelSteps.length) return
  const [item] = metric.funnelSteps.splice(index, 1)
  if (item) metric.funnelSteps.splice(target, 0, item)
  metric.funnelSteps.forEach((step, stepIndex) => {
    step.code = String(stepIndex + 1)
  })
}

function metricConfidenceSupported(metric: MetricEditorDraft, groupType: MetricGroup['type']) {
  if (groupType === 'funnel') return false
  if (groupType === 'retention') return true
  if (metric.metricKind === 'single') {
    return Boolean(operatorOptions.find((operator) => operator.value === metric.events[0]?.operator)?.confidence)
  }
  return metric.formula.includes('/') && validateMetricFormula(metric.formula, metric.events.map((event) => event.code)).valid
}

function buildDraftFromMetric(metric: Metric): MetricEditorDraft {
  const draft = createEmptyMetricDraft(metric.metricCategory)
  draft.id = metric.id
  draft.name = metric.name
  draft.description = metric.description
  draft.metricKind = metric.metricKind
  draft.numberFormatType = metric.numberFormat.type
  draft.decimalPlaces = metric.numberFormat.decimalPlaces
  draft.isMustSee = metric.isMustSee
  if ('events' in metric.definition) {
    draft.events = metric.definition.events.map((event, index) => cloneEventDraft(event, String.fromCharCode(65 + index)))
    draft.formula = metric.definition.formula ?? ''
    draft.flexibleProperties = JSON.parse(JSON.stringify(metric.definition.flexibleProperties))
    draft.flexibleEnabled = draft.flexibleProperties.length > 0
  }
  if ('startEvent' in metric.definition) {
    draft.startEvent = cloneEventDraft(metric.definition.startEvent, '起始事件')
    draft.returnEvent = cloneEventDraft(metric.definition.returnEvent, '回访事件')
    draft.retentionDays = metric.definition.retentionDays
    draft.flexibleProperties = JSON.parse(JSON.stringify(metric.definition.flexibleProperties))
    draft.flexibleEnabled = draft.flexibleProperties.length > 0
  }
  if ('steps' in metric.definition) {
    draft.funnelSteps = metric.definition.steps.map((event, index) => cloneEventDraft(event, String(index + 1)))
    draft.conversionWindowValue = metric.definition.conversionWindow.value
    draft.conversionWindowUnit = metric.definition.conversionWindow.unit
    draft.globalFilters = metric.definition.globalFilters.map(cloneFilterDraft)
    draft.globalFilterTree = cloneFilterGroupDraft(metric.definition.globalFilterTree, metric.definition.globalFilters)
  }
  return draft
}

function buildEventPayload(event: MetricEventDraft): EventMetricEvent {
  return {
    code: event.code,
    eventId: event.eventId ?? '',
    eventName: event.eventName || getEventMeta(event.eventId)?.name || '',
    eventType: event.eventType,
    operator: event.operator ?? 'uv',
    propertyId: event.propertyId,
    filters: flattenFilterGroup(event.filterTree),
    filterTree: buildFilterGroupPayload(event.filterTree),
    aggregationFilter: event.aggregationFilter,
  }
}

function buildMetricPayload(metric: MetricEditorDraft, groupId: EntityId, groupType: MetricGroup['type']): Metric {
  const now = new Date().toISOString()
  const definition =
    groupType === 'event'
      ? {
          metricId: metric.id,
          metricKind: metric.metricKind,
          events: metric.events.map(buildEventPayload),
          formula: metric.metricKind === 'composite' ? metric.formula : null,
          flexibleProperties: metric.flexibleEnabled ? metric.flexibleProperties : [],
        }
      : groupType === 'retention'
        ? {
            metricId: metric.id,
            startEvent: buildEventPayload(metric.startEvent),
            returnEvent: buildEventPayload(metric.returnEvent),
            retentionDays: metric.retentionDays,
            flexibleProperties: metric.flexibleEnabled ? metric.flexibleProperties : [],
          }
        : {
            metricId: metric.id,
            conversionWindow: {
              value: metric.conversionWindowValue,
              unit: metric.conversionWindowUnit,
            },
            steps: metric.funnelSteps.map(buildEventPayload),
            globalFilters: flattenFilterGroup(metric.globalFilterTree),
            globalFilterTree: buildFilterGroupPayload(metric.globalFilterTree),
          }
  return {
    id: metric.id,
    metricGroupId: groupId,
    name: metric.name,
    description: metric.description,
    metricCategory: groupType,
    metricKind: groupType === 'event' ? metric.metricKind : 'single',
    definition,
    numberFormat: {
      type: metric.numberFormatType,
      decimalPlaces: metric.decimalPlaces,
    },
    isMustSee: groupType !== 'funnel' && metric.isMustSee,
    confidenceSupported: metricConfidenceSupported(metric, groupType),
    status: 'active',
    createdAt: now,
    updatedAt: now,
  }
}

function validateGroupEditor() {
  const errors: Record<string, string> = {}
  const draft = groupEditorDraft.value
  if (!draft.type) errors.type = '请选择指标组类型'
  if (!draft.name.trim()) errors.name = '请输入指标组名称'
  if (draft.name.trim().length > 50) errors.name = '指标组名称不能超过 50 个字符'
  if (!draft.ownerId) errors.ownerId = '请选择 Owner'
  if (!draft.metrics.length) errors.metrics = '指标配置至少包含1个指标'
  const names = draft.metrics.map((metric) => metric.name.trim()).filter(Boolean)
  if (new Set(names).size !== names.length) errors.metricNames = '当前指标组内存在重复指标名称'
  groupFieldErrors.value = errors
  return Object.keys(errors).length === 0
}

async function saveGroupEditor() {
  ensureMetricsForType()
  if (!validateGroupEditor() || !groupEditorDraft.value.type) return
  const draft = groupEditorDraft.value
  const groupType = draft.type
  if (!groupType) return
  if (draft.mode === 'edit' && groupType === 'funnel') {
    const relatedExperiments = selectedMetricGroup.value?.relatedExperimentIds.length ?? 0
    if (relatedExperiments > 0) {
      const confirmed = window.confirm('确认修改漏斗指标？修改后，新实验将使用新口径，已绑定实验保留绑定时的口径快照。')
      if (!confirmed) return
    }
  }
  const transientGroupId = draft.groupId ?? 'draft_metric_group'
  const payload: MetricGroupEditorPayload = {
    mode: draft.mode,
    groupId: draft.groupId,
    appId: draft.appId,
    name: draft.name,
    description: draft.description,
    type: groupType,
    ownerId: draft.ownerId,
    permissionType: draft.permissionType,
    authorizedUserIds: draft.permissionType === 'private' ? draft.authorizedUserIds : [],
    directoryGroupId: draft.directoryGroupId,
    metrics: draft.metrics.map((metric) => buildMetricPayload(metric, transientGroupId, groupType)),
  }
  const result = await abStore.saveMetricGroup(payload)
  groupFieldErrors.value = result.fieldErrors ?? {}
  message[result.group ? 'success' : 'warning'](result.message)
  if (result.group) {
    resetGroupEditorSnapshot()
    openGroupDetail(result.group)
  }
}

function metricDefinitionSummary(metric: Metric) {
  if ('events' in metric.definition) {
    const events = metric.definition.events.map((event) => `${event.code}:${event.eventName}/${operatorLabel(event.operator)}`).join('；')
    return metric.definition.metricKind === 'composite' ? `${events}；指标关系 ${metric.definition.formula || '-'}` : events
  }
  if ('startEvent' in metric.definition) {
    return `${metric.definition.startEvent.eventName} 后第 ${metric.definition.retentionDays} 日回访 ${metric.definition.returnEvent.eventName}`
  }
  return `${metric.definition.steps.map((step) => step.eventName).join(' > ')}；${metric.definition.conversionWindow.value}${metric.definition.conversionWindow.unit}`
}

function operatorLabel(operator: string) {
  return operatorOptions.find((item) => item.value === operator)?.label ?? operator
}

function propertyLabel(propertyId?: string | null) {
  return getPropertyMeta(propertyId)?.name ?? propertyId ?? '-'
}

function metricFilterTreeText(filterTree?: MetricFilterGroup, fallbackFilters: MetricFilter[] = []): string {
  const group = filterTree ?? {
    id: 'fallback',
    relation: 'AND' as const,
    conditions: fallbackFilters,
    groups: [],
  }
  const conditionText = group.conditions
    .filter((filter) => filter.propertyId)
    .map((filter) => `${propertyLabel(filter.propertyId)} ${filter.operator} ${String(filter.value ?? '')}`)
  const childText = group.groups.map((child) => `(${metricFilterTreeText(child)})`).filter(Boolean)
  const parts = [...conditionText, ...childText]
  if (!parts.length) return '无过滤条件'
  return parts.join(group.relation === 'AND' ? ' 且 ' : ' 或 ')
}

function metricTypeDescription(metric: Metric) {
  if (metric.metricCategory === 'event') return `${metricKindLabel(metric.metricKind)} · ${metric.confidenceSupported ? '支持置信度' : '不支持置信度'}`
  if (metric.metricCategory === 'retention') return `D${'retentionDays' in metric.definition ? metric.definition.retentionDays : 30} 留存 · 支持灵活属性`
  return '漏斗指标 · 不支持核心指标和报警'
}

function flexiblePropertyNames(metric: Metric) {
  const definition = metric.definition
  if ('flexibleProperties' in definition) {
    return definition.flexibleProperties.map((property) => `${property.scope}:${property.propertyName}`).join('、') || '-'
  }
  return '-'
}

async function toggleMustSee(metric: Metric, isMustSee: boolean) {
  if (!adminUserIds.has(currentUserId)) {
    message.warning('仅集团管理员或应用管理员可设置必看指标')
    return
  }
  if (metric.metricCategory === 'funnel') {
    message.warning('漏斗指标不支持设为必看指标')
    return
  }
  const result = await abStore.toggleMetricMustSee(metric.id, isMustSee)
  message[result.metric ? 'success' : 'warning'](result.message)
}

function openTemplateEditor(mode: 'create' | 'edit', template?: MetricTemplate) {
  templateFieldErrors.value = {}
  templateGroupKeyword.value = ''
  const metricGroupIds = template?.metricGroupIds ? [...template.metricGroupIds] : selectedMetricGroup.value ? [selectedMetricGroup.value.id] : []
  templateGroupSnapshot.value = [...metricGroupIds]
  templateDraft.value = {
    mode,
    templateId: mode === 'edit' ? template?.id : undefined,
    appId: template?.appId ?? defaultAppId,
    name: template?.name ?? '',
    description: template?.description ?? '',
    ownerId: template?.ownerId ?? currentUserId,
    templateType: template?.templateType ?? 'personal',
    availableUserIds: template?.availableUserIds ? [...template.availableUserIds] : [],
    metricGroupIds,
  }
  templateEditorVisible.value = true
}

async function saveTemplateEditor() {
  const draft = templateDraft.value
  const payload = {
    appId: draft.appId,
    name: draft.name,
    description: draft.description,
    ownerId: draft.ownerId,
    templateType: draft.templateType,
    availableUserIds: draft.templateType === 'personal' ? draft.availableUserIds : [],
    metricGroupIds: draft.metricGroupIds,
  }
  const result =
    draft.mode === 'edit' && draft.templateId
      ? await abStore.updateMetricTemplate(draft.templateId, payload)
      : await abStore.createMetricTemplate(payload)
  templateFieldErrors.value = result.fieldErrors ?? {}
  message[result.template ? 'success' : 'warning'](result.message)
  if (result.template) templateEditorVisible.value = false
}

async function deleteTemplate(template: MetricTemplate) {
  if (!window.confirm(`确认删除模板「${template.name}」？已通过该模板创建的实验不受影响。`)) return
  const result = await abStore.deleteMetricTemplate(template.id)
  message[result.template ? 'success' : 'warning'](result.message)
}

function toggleTemplateGroup(groupId: EntityId, checked: boolean) {
  templateDraft.value.metricGroupIds = checked
    ? [...new Set([...templateDraft.value.metricGroupIds, groupId])]
    : templateDraft.value.metricGroupIds.filter((id) => id !== groupId)
}

function resetTemplateGroups() {
  templateDraft.value.metricGroupIds = [...templateGroupSnapshot.value]
}

function clearTemplateGroups() {
  if (!templateDraft.value.metricGroupIds.length) return
  const confirmed = window.confirm('确认清空已选指标组？')
  if (!confirmed) return
  templateDraft.value.metricGroupIds = []
}

function templateGroupNames(template: MetricTemplate) {
  return template.metricGroupIds.map((groupId) => metricGroups.value.find((group) => group.id === groupId)?.name ?? groupId).join('、')
}

function applyTemplateToDraft(template: MetricTemplate) {
  const count = abStore.applyMetricTemplateToDraft(template.id)
  message.success(`已将模板内 ${count} 个可用指标加入实验草稿，重复项已自动跳过`)
}

function createAlarmStrategyDraft(strategy?: AlarmTask['strategies'][number], alarmType: AlarmTask['alarmType'] = 'experiment'): AlarmStrategyDraft {
  return {
    tempId: strategy?.id ?? createTempId('strategy'),
    id: strategy?.id ?? createTempId('strategy'),
    metricId: strategy?.metricId ?? activeMetricOptions.value[0]?.value ?? '',
    strategyType: strategy?.strategyType ?? (alarmType === 'dashboard' ? 'mom' : 'control'),
    compareTo: alarmType === 'experiment' ? 'control' : undefined,
    direction: strategy?.direction ?? 'decrease',
    thresholdPercent: strategy?.thresholdPercent ?? 5,
    requireSignificance: strategy?.requireSignificance ?? alarmType === 'experiment',
  }
}

function addAlarmStrategy() {
  alarmDraft.value.strategies.push(createAlarmStrategyDraft(undefined, alarmDraft.value.alarmType))
}

function removeAlarmStrategy(tempId: EntityId) {
  if (alarmDraft.value.strategies.length <= 1) {
    message.warning('至少保留一条报警策略')
    return
  }
  alarmDraft.value.strategies = alarmDraft.value.strategies.filter((strategy) => strategy.tempId !== tempId)
}

function addAlarmTimeRange() {
  alarmDraft.value.timeRanges.push({ id: createTempId('time_range'), start: '09:00', end: '18:00' })
}

function removeAlarmTimeRange(id: EntityId) {
  if (alarmDraft.value.timeRanges.length <= 1) {
    message.warning('至少保留一个报警时间段')
    return
  }
  alarmDraft.value.timeRanges = alarmDraft.value.timeRanges.filter((range) => range.id !== id)
}

function handleAlarmTypeChange(value: string) {
  const alarmType = value as AlarmTask['alarmType']
  alarmDraft.value.alarmType = alarmType
  alarmDraft.value.strategies = [createAlarmStrategyDraft(undefined, alarmType)]
}

function openAlarmEditor(mode: 'create' | 'edit', task?: AlarmTask, alarmType: AlarmTask['alarmType'] = 'experiment') {
  alarmFieldErrors.value = {}
  const nextAlarmType = task?.alarmType ?? alarmType
  alarmDraft.value = {
    mode,
    id: mode === 'edit' ? task?.id : undefined,
    appId: task?.appId ?? defaultAppId,
    name: task?.name ?? '',
    description: task?.description ?? '',
    alarmType: task?.alarmType ?? alarmType,
    level: task?.level ?? 'notice',
    interval: task?.interval ?? '1h',
    enabled: task?.enabled ?? false,
    ruleRelation: task?.ruleRelation ?? 'any',
    experimentId: task?.scene.experimentId ?? 'exp_feed_strategy',
    dashboardId: task?.scene.dashboardId ?? 'board_growth_overview',
    strategies: task?.strategies.length
      ? task.strategies.map((strategy) => createAlarmStrategyDraft(strategy, nextAlarmType))
      : [createAlarmStrategyDraft(undefined, nextAlarmType)],
    channels: task?.notification.channels ? [...task.notification.channels] : ['feishu'],
    feishuWebhook: task?.notification.maskedWebhooks.feishu ?? 'https://open.feishu.cn/open-apis/bot/v2/hook/***',
    dingtalkWebhook: task?.notification.maskedWebhooks.dingtalk ?? '',
    wecomWebhook: task?.notification.maskedWebhooks.wecom ?? '',
    receiverGroupIds: task?.notification.receiverGroupIds ? [...task.notification.receiverGroupIds] : receiverGroups.value[0] ? [receiverGroups.value[0].id] : [],
    timeRanges: task?.notification.timeRanges.length
      ? task.notification.timeRanges.map((range) => ({ id: createTempId('time_range'), ...range }))
      : [{ id: 'time_default', start: '00:00', end: '23:59' }],
  }
  alarmEditorVisible.value = true
}

async function saveAlarmEditor() {
  const draft = alarmDraft.value
  const result = await abStore.saveAlarmTask({
    id: draft.mode === 'edit' ? draft.id : undefined,
    appId: draft.appId,
    name: draft.name,
    description: draft.description,
    alarmType: draft.alarmType,
    level: draft.level,
    interval: draft.interval,
    enabled: draft.enabled,
    ruleRelation: draft.ruleRelation,
    scene: draft.alarmType === 'experiment' ? { experimentId: draft.experimentId } : { dashboardId: draft.dashboardId },
    strategies: draft.strategies.map((strategy) => ({
      id: strategy.id || createTempId('strategy'),
      metricId: strategy.metricId,
      strategyType: draft.alarmType === 'experiment' ? 'control' : strategy.strategyType,
      compareTo: draft.alarmType === 'experiment' ? 'control' : undefined,
      direction: strategy.direction,
      thresholdPercent: strategy.thresholdPercent,
      requireSignificance: draft.alarmType === 'experiment' && strategy.requireSignificance,
    })),
    notification: {
      channels: draft.channels,
      maskedWebhooks: {
        feishu: draft.feishuWebhook,
        dingtalk: draft.dingtalkWebhook,
        wecom: draft.wecomWebhook,
      },
      receiverGroupIds: draft.receiverGroupIds,
      timeRanges: draft.timeRanges.map(({ start, end }) => ({ start, end })),
    },
  })
  alarmFieldErrors.value = result.fieldErrors ?? {}
  message[result.task ? 'success' : 'warning'](result.message)
  if (result.task) alarmEditorVisible.value = false
}

async function toggleAlarm(task: AlarmTask, checked: boolean) {
  const result = await abStore.toggleAlarmTaskEnabled(task.id, checked)
  message[result.task ? 'success' : 'warning'](result.message)
}

async function deleteAlarm(task: AlarmTask) {
  if (!window.confirm(`确认删除报警任务「${task.name}」？历史报警记录仍会保留。`)) return
  const result = await abStore.deleteAlarmTask(task.id)
  message[result.task ? 'success' : 'warning'](result.message)
}

function alarmStrategyText(task: AlarmTask) {
  return task.strategies
    .map((strategy) => {
      const strategyType = strategy.strategyType === 'absolute' ? '绝对数值' : strategy.strategyType === 'yoy' ? '同比' : strategy.strategyType === 'mom' ? '环比' : '对照组'
      const direction = strategy.direction === 'decrease' ? '下降' : strategy.direction === 'increase' ? '上升' : '波动'
      return `${metricName(strategy.metricId)} · ${strategyType} · ${direction} ${strategy.thresholdPercent}%`
    })
    .join('；')
}

function alarmReceiversText(task: AlarmTask) {
  return task.notification.receiverGroupIds
    .map((groupId) => receiverGroups.value.find((group) => group.id === groupId)?.name ?? groupId)
    .join('、') || '-'
}

function alarmRecordStatusLabel(status: AlarmTriggerRecord['status']) {
  const labels: Record<AlarmTriggerRecord['status'], string> = {
    sent: '已发送',
    suppressed: '已抑制',
    failed: '发送失败',
  }
  return labels[status]
}

function alarmRecordStatusType(status: AlarmTriggerRecord['status']) {
  if (status === 'sent') return 'success'
  if (status === 'failed') return 'error'
  return 'warning'
}

function openAlarmRecords(task: AlarmTask) {
  selectedAlarmRecordTaskId.value = task.id
  alarmRecordDrawerVisible.value = true
}

function openReceiverEditor(mode: 'create' | 'edit', group?: ReceiverGroup) {
  receiverFieldErrors.value = {}
  receiverDraft.value = {
    mode,
    id: mode === 'edit' ? group?.id : undefined,
    appId: group?.appId ?? defaultAppId,
    name: group?.name ?? '',
    memberIds: group?.memberIds ? [...group.memberIds] : [],
  }
  receiverEditorVisible.value = true
}

async function saveReceiverEditor() {
  const draft = receiverDraft.value
  const result = await abStore.saveReceiverGroup({
    id: draft.mode === 'edit' ? draft.id : undefined,
    appId: draft.appId,
    name: draft.name,
    memberIds: draft.memberIds,
  })
  receiverFieldErrors.value = result.fieldErrors ?? {}
  message[result.group ? 'success' : 'warning'](result.message)
  if (result.group) receiverEditorVisible.value = false
}

async function deleteReceiver(group: ReceiverGroup) {
  const result = await abStore.deleteReceiverGroup(group.id)
  if (result.usedByAlarmTasks?.length) {
    receiverBlockedAlarmTasks.value = result.usedByAlarmTasks
    receiverDeleteBlockedVisible.value = true
  }
  message[result.group ? 'success' : 'warning'](result.message)
}

function resetMustSeeFilters() {
  mustSeeFilters.value = {
    grain: 'day',
    range: '7d',
    experimentMode: 'all',
    experimentVersionIds: [],
    dimensionType: 'all',
    dimensionOperator: '=',
    dimensionValue: '',
  }
  message.success('已重置必看指标看板筛选条件')
}

function queryMustSeeBoard() {
  if (mustSeeRangeWarning.value) {
    message.warning(mustSeeRangeWarning.value)
    return
  }
  message.success('已按当前筛选条件刷新必看指标趋势')
}

function trendPath(trend: MustSeeMetricTrend & { points: MustSeeMetricTrend['points'] }) {
  if (!trend.points.length) return ''
  const values = trend.points.map((point) => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(0.0001, max - min)
  return trend.points
    .map((point, index) => {
      const x = trend.points.length === 1 ? 0 : (index / (trend.points.length - 1)) * 100
      const y = 78 - ((point.value - min) / span) * 68
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
}

function formatDelta(value?: number | null) {
  if (value === undefined || value === null) return '—'
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
}

function jumpToExperiment(experimentId?: EntityId) {
  if (!experimentId) return
  void router.push(`/ab-testing/experiments/${experimentId}/report`)
}

function jumpToMustSeeExperiments(
  trend: MustSeeMetricTrend & { latestPoint?: MustSeeMetricTrend['points'][number]; newCount: number; runningCount: number },
  relation: 'new' | 'running',
) {
  const latestPoint = trend.latestPoint
  const experimentIds = relation === 'new' ? latestPoint?.relatedNewExperimentIds ?? [] : latestPoint?.relatedRunningExperimentIds ?? []
  if (!latestPoint || !experimentIds.length) return
  void router.push({
    path: '/ab-testing/experiments',
    query: {
      metricId: trend.metricId,
      metricName: trend.metricName,
      at: latestPoint.time,
      relation,
      experimentIds: experimentIds.join(','),
    },
  })
}

onMounted(syncGroupFromRoute)
watch(
  groupKeyword,
  (keyword) => {
    if (groupKeywordDebounceTimer) clearTimeout(groupKeywordDebounceTimer)
    groupKeywordDebounceTimer = setTimeout(() => {
      debouncedGroupKeyword.value = keyword
    }, 240)
  },
  { immediate: true },
)
watch([debouncedGroupKeyword, groupStatusFilter, groupTypeFilter], () => {
  groupPage.value = 1
})
watch(
  () => [route.params.metricGroupId, metricGroups.value.length],
  syncGroupFromRoute,
)
watch(
  () => groupEditorDraft.value.type,
  () => ensureMetricsForType(),
)
</script>

<template>
  <div class="metric-module">
    <nav class="metric-subnav" aria-label="指标管理模块导航">
      <button
        v-for="entry in moduleEntries"
        :key="entry.key"
        type="button"
        :class="{ active: activeEntry === entry.key }"
        @click="setActiveEntry(entry.key)"
      >
        <n-icon :component="entry.icon" />
        <span>{{ entry.label }}</span>
        <small>{{ entry.description }}</small>
      </button>
    </nav>

    <section v-if="activeEntry === 'groups' && groupPageMode === 'list'" class="metric-page">
      <div class="metric-page-head">
        <div>
          <h2>指标组列表</h2>
          <p>集中查看、搜索、筛选、创建、合并、复制、编辑和下线指标组。</p>
        </div>
        <n-space>
          <n-tooltip trigger="hover">
            <template #trigger>
              <n-button :disabled="metricGroupMergeIds.length < 2" secondary @click="prepareMergeDialog">
                <template #icon><n-icon :component="FunnelOutline" /></template>
                合并指标组
              </n-button>
            </template>
            至少选择 2 个使用中的事件指标组
          </n-tooltip>
          <n-button type="primary" @click="openGroupEditor('create')">
            <template #icon><n-icon :component="AddCircleOutline" /></template>
            创建指标组
          </n-button>
        </n-space>
      </div>

      <div class="metric-toolbar">
        <n-input v-model:value="groupKeyword" clearable placeholder="搜索指标组名称、描述、创建人">
          <template #prefix><n-icon :component="SearchOutline" /></template>
        </n-input>
        <n-select
          v-model:value="groupStatusFilter"
          :options="[
            { label: '使用中', value: 'active' },
            { label: '已下线', value: 'offline' },
            { label: '全部状态', value: 'all' },
          ]"
        />
        <n-select
          v-model:value="groupTypeFilter"
          :options="[
            { label: '全部类型', value: 'all' },
            { label: '事件指标', value: 'event' },
            { label: '留存指标', value: 'retention' },
            { label: '漏斗指标', value: 'funnel' },
          ]"
        />
      </div>

      <div class="metric-table-wrap">
        <n-table :bordered="false" :single-line="false" size="small">
          <thead>
            <tr>
              <th class="select-col"></th>
              <th>指标组名称</th>
              <th>
                <span class="table-header-filter">
                  状态
                  <n-tooltip trigger="hover">
                    <template #trigger>
                      <n-button
                        quaternary
                        circle
                        size="tiny"
                        :type="groupStatusFilter === 'all' ? 'default' : 'primary'"
                        @click="cycleGroupStatusFilter"
                      >
                        <template #icon><n-icon :component="FunnelOutline" /></template>
                      </n-button>
                    </template>
                    {{ groupStatusHeaderHint }}
                  </n-tooltip>
                </span>
              </th>
              <th>指标组类型</th>
              <th>指标数量</th>
              <th>描述</th>
              <th>Owner</th>
              <th>创建人</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="group in pagedGroups" :key="group.id">
              <td>
                <n-checkbox
                  :checked="metricGroupMergeIds.includes(group.id)"
                  :disabled="group.status !== 'active'"
                  @update:checked="(checked) => toggleMergeSelection(group.id, Boolean(checked))"
                />
              </td>
              <td>
                <button type="button" class="link-button strong" @click="openGroupDetail(group)">{{ group.name }}</button>
              </td>
              <td>
                <n-tag :type="group.status === 'active' ? 'success' : 'default'" size="small">{{ groupStatusLabel(group.status) }}</n-tag>
              </td>
              <td>{{ groupTypeLabel(group.type) }}</td>
              <td>{{ group.metricIds.length }}</td>
              <td class="ellipsis-cell">{{ group.description }}</td>
              <td>{{ group.owner.name }}</td>
              <td>{{ memberName(group.creatorId) }}</td>
              <td>{{ formatDate(group.updatedAt) }}</td>
              <td>
                <n-space size="small" :wrap="false">
                  <n-button size="tiny" secondary :disabled="!canEditGroup(group)" @click="openGroupEditor('edit', group)">
                    <template #icon><n-icon :component="CreateOutline" /></template>
                    编辑
                  </n-button>
                  <n-button size="tiny" secondary @click="openGroupEditor('copy', group)">
                    <template #icon><n-icon :component="CopyOutline" /></template>
                    复制
                  </n-button>
                  <n-button size="tiny" secondary type="warning" :disabled="!canEditGroup(group)" @click="requestOfflineGroup(group)">
                    <template #icon><n-icon :component="CloseCircleOutline" /></template>
                    下线
                  </n-button>
                </n-space>
              </td>
            </tr>
          </tbody>
        </n-table>
        <n-empty v-if="!filteredGroups.length" description="暂无匹配的指标组" />
      </div>

      <div class="metric-pagination-row">
        <span>共 {{ filteredGroups.length }} 个指标组，已选择 {{ metricGroupMergeIds.length }} 个</span>
        <n-pagination
          v-model:page="groupPage"
          v-model:page-size="groupPageSize"
          :item-count="filteredGroups.length"
          :page-sizes="[10, 20, 50]"
          show-size-picker
        />
      </div>
    </section>

    <section v-else-if="activeEntry === 'groups' && groupPageMode === 'detail'" class="metric-page">
      <template v-if="selectedMetricGroup">
        <div class="metric-page-head">
          <div class="head-title-row">
            <n-button quaternary circle @click="backToGroupList">
              <template #icon><n-icon :component="ChevronBackOutline" /></template>
            </n-button>
            <div>
              <h2>{{ selectedMetricGroup.name }}</h2>
              <p>{{ selectedMetricGroup.description || '暂无描述' }}</p>
            </div>
          </div>
          <n-space>
            <n-button secondary @click="openGroupEditor('copy', selectedMetricGroup)">
              <template #icon><n-icon :component="CopyOutline" /></template>
              复制
            </n-button>
            <n-button secondary :disabled="!canEditGroup(selectedMetricGroup)" @click="openGroupEditor('edit', selectedMetricGroup)">
              <template #icon><n-icon :component="CreateOutline" /></template>
              编辑
            </n-button>
            <n-button secondary @click="historyDrawerVisible = true">
              <template #icon><n-icon :component="TimeOutline" /></template>
              操作历史
            </n-button>
            <n-button type="warning" secondary :disabled="!canEditGroup(selectedMetricGroup)" @click="requestOfflineGroup(selectedMetricGroup)">
              <template #icon><n-icon :component="CloseCircleOutline" /></template>
              下线
            </n-button>
          </n-space>
        </div>

        <div class="metric-detail-grid">
          <section class="metric-block metric-info-block">
            <div class="metric-block-title">
              <h3>基本信息</h3>
            </div>
            <div class="metric-info-tags">
              <n-tag size="small">{{ groupTypeLabel(selectedMetricGroup.type) }}</n-tag>
              <n-tag :type="selectedMetricGroup.status === 'active' ? 'success' : 'default'" size="small">
                {{ groupStatusLabel(selectedMetricGroup.status) }}
              </n-tag>
              <n-tag :type="selectedMetricGroup.permissionType === 'public' ? 'info' : 'warning'" size="small">
                {{ permissionLabel(selectedMetricGroup.permissionType) }}
              </n-tag>
              <button type="button" class="link-button" @click="associationModalVisible = true">
                {{ selectedGroupExperiments.length }} 个关联实验
              </button>
            </div>
            <n-descriptions
              class="compact-descriptions"
              :column="3"
              size="small"
              label-placement="top"
              bordered
            >
              <n-descriptions-item label="指标数量">{{ selectedMetricGroup.metricIds.length }}</n-descriptions-item>
              <n-descriptions-item label="Owner">{{ selectedMetricGroup.owner.name }}</n-descriptions-item>
              <n-descriptions-item label="创建人">{{ memberName(selectedMetricGroup.creatorId) }}</n-descriptions-item>
              <n-descriptions-item label="创建时间">{{ formatDate(selectedMetricGroup.createdAt) }}</n-descriptions-item>
              <n-descriptions-item label="更新时间">{{ formatDate(selectedMetricGroup.updatedAt) }}</n-descriptions-item>
              <n-descriptions-item label="所属目录">{{ directoryName(selectedMetricGroup.directoryGroupId) }}</n-descriptions-item>
            </n-descriptions>
          </section>

          <section class="metric-block">
            <div class="metric-block-title">
              <div>
                <h3>权限管理区</h3>
                <p>配置公共/私有可见范围、Owner 和私有授权用户。</p>
              </div>
              <n-space>
                <n-button v-if="!permissionEditing" secondary :disabled="!canEditGroup(selectedMetricGroup)" @click="startPermissionEditing">
                  <template #icon><n-icon :component="ShieldCheckmarkOutline" /></template>
                  配置权限
                </n-button>
                <template v-else>
                  <n-button secondary @click="cancelPermissionEditing">取消</n-button>
                  <n-button type="primary" @click="savePermissionConfig">保存权限</n-button>
                </template>
              </n-space>
            </div>
            <template v-if="permissionEditing">
              <div class="permission-editor-grid">
                <label>
                  <span>Owner</span>
                  <n-select v-model:value="permissionDraft.ownerId" :options="memberOptions" />
                  <small v-if="permissionFieldErrors.ownerId">{{ permissionFieldErrors.ownerId }}</small>
                </label>
                <label>
                  <span>权限类型</span>
                  <n-select
                    v-model:value="permissionDraft.permissionType"
                    :options="[
                      { label: '公共指标组', value: 'public' },
                      { label: '私有指标组', value: 'private' },
                    ]"
                  />
                </label>
                <label v-if="permissionDraft.permissionType === 'private'" class="wide">
                  <span>授权用户</span>
                  <n-select v-model:value="permissionDraft.authorizedUserIds" multiple :options="memberOptions" placeholder="Owner 和管理员默认有权限" />
                </label>
              </div>
              <n-alert :type="permissionDraft.permissionType === 'public' ? 'info' : 'warning'" :bordered="false">
                {{
                  permissionDraft.permissionType === 'public'
                    ? '保存后，应用内拥有指标管理查看权限的用户均可查看和使用该指标组。'
                    : '保存后，仅管理员、Owner 和授权用户可查看或使用该指标组。'
                }}
              </n-alert>
            </template>
            <template v-else>
              <n-descriptions
                class="compact-descriptions"
                :column="2"
                size="small"
                label-placement="top"
                bordered
              >
                <n-descriptions-item label="可见范围">
                  <n-tag :type="selectedMetricGroup.permissionType === 'public' ? 'info' : 'warning'" size="small">
                    {{ permissionLabel(selectedMetricGroup.permissionType) }}
                  </n-tag>
                </n-descriptions-item>
                <n-descriptions-item label="Owner">{{ selectedMetricGroup.owner.name }}</n-descriptions-item>
                <n-descriptions-item label="管理员">默认拥有管理权限</n-descriptions-item>
                <n-descriptions-item label="单独授权">{{ selectedMetricGroup.authorizedUserIds.length }} 人</n-descriptions-item>
              </n-descriptions>
              <div class="permission-user-strip">
                <span>授权成员</span>
                <div class="permission-strip">
                  <n-tag type="info" size="small">{{ selectedMetricGroup.owner.name }} · Owner</n-tag>
                  <n-tag v-for="userId in selectedMetricGroup.authorizedUserIds" :key="userId" size="small">{{ memberName(userId) }}</n-tag>
                  <span v-if="!selectedMetricGroup.authorizedUserIds.length" class="muted">暂无单独授权用户</span>
                </div>
              </div>
            </template>
          </section>
        </div>

        <section class="metric-block">
          <div class="metric-block-title">
            <h3>指标配置区</h3>
          </div>
          <div class="metric-row-list">
            <div v-for="metric in selectedMetricGroupMetrics" :key="metric.id" class="metric-config-row">
              <div class="metric-config-head">
                <n-button quaternary size="small" @click="toggleDetailMetric(metric.id)">
                  {{ detailExpandedMetricIds.includes(metric.id) ? '收起' : '展开' }}
                </n-button>
                <div class="metric-head-copy">
                  <strong>{{ metric.name }}</strong>
                  <span>{{ metricTypeDescription(metric) }}</span>
                </div>
                <n-tag size="small">{{ groupTypeLabel(metric.metricCategory) }}</n-tag>
                <n-tag v-if="metric.isMustSee" type="success" size="small">必看指标</n-tag>
                <button type="button" class="link-button" @click="associationModalVisible = true">
                  {{ selectedGroupExperiments.length }} 个关联实验
                </button>
                <span>{{ formatDate(metric.updatedAt) }}</span>
              </div>
              <div v-if="detailExpandedMetricIds.includes(metric.id)" class="metric-definition-box">
                <div class="metric-display-header">
                  <p>{{ metric.description || '暂无指标描述' }}</p>
                  <div class="metric-display-tags">
                    <n-tag size="small">{{ metric.numberFormat.type === 'percent' ? '百分比' : '数字' }} · {{ metric.numberFormat.decimalPlaces }} 位</n-tag>
                    <n-tag :type="metric.confidenceSupported ? 'info' : 'default'" size="small">
                      {{ metric.confidenceSupported ? '支持置信度' : '不支持置信度' }}
                    </n-tag>
                    <n-tag v-if="flexiblePropertyNames(metric) !== '-'" type="success" size="small">灵活属性</n-tag>
                  </div>
                </div>
                <div class="definition-grid compact">
                  <span>口径摘要</span><strong>{{ metricDefinitionSummary(metric) }}</strong>
                  <span>灵活属性</span><strong>{{ flexiblePropertyNames(metric) }}</strong>
                </div>

                <div v-if="'events' in metric.definition" class="metric-definition-steps">
                  <div v-for="event in metric.definition.events" :key="event.code" class="definition-step-card">
                    <div class="definition-step-head">
                      <n-tag type="info" size="small">事件 {{ event.code }}</n-tag>
                      <strong>{{ event.eventName }}</strong>
                    </div>
                    <div class="definition-grid compact">
                      <span>事件ID</span><strong>{{ event.eventId }}</strong>
                      <span>计算方式</span><strong>{{ operatorLabel(event.operator) }}</strong>
                      <span>属性</span><strong>{{ propertyLabel(event.propertyId) }}</strong>
                      <span>过滤条件</span><strong>{{ metricFilterTreeText(event.filterTree, event.filters) }}</strong>
                      <span>聚合过滤</span><strong>{{ aggregationFilterText(event) }}</strong>
                    </div>
                  </div>
                  <div v-if="metric.definition.metricKind === 'composite'" class="metric-formula-line">
                    <span>指标关系</span>
                    <strong>{{ metric.definition.formula }}</strong>
                  </div>
                </div>

                <div v-else-if="'startEvent' in metric.definition" class="metric-definition-steps">
                  <div class="definition-step-card">
                    <div class="definition-step-head">
                      <n-tag type="info" size="small">起始事件</n-tag>
                      <strong>{{ metric.definition.startEvent.eventName }}</strong>
                    </div>
                    <div class="definition-grid compact">
                      <span>事件ID</span><strong>{{ metric.definition.startEvent.eventId }}</strong>
                      <span>过滤条件</span><strong>{{ metricFilterTreeText(metric.definition.startEvent.filterTree, metric.definition.startEvent.filters) }}</strong>
                      <span>聚合过滤</span><strong>{{ aggregationFilterText(metric.definition.startEvent) }}</strong>
                    </div>
                  </div>
                  <div class="definition-step-card">
                    <div class="definition-step-head">
                      <n-tag type="success" size="small">回访事件</n-tag>
                      <strong>{{ metric.definition.returnEvent.eventName }}</strong>
                    </div>
                    <div class="definition-grid compact">
                      <span>事件ID</span><strong>{{ metric.definition.returnEvent.eventId }}</strong>
                      <span>过滤条件</span><strong>{{ metricFilterTreeText(metric.definition.returnEvent.filterTree, metric.definition.returnEvent.filters) }}</strong>
                      <span>聚合过滤</span><strong>{{ aggregationFilterText(metric.definition.returnEvent) }}</strong>
                      <span>留存窗口</span><strong>D{{ metric.definition.retentionDays }}</strong>
                    </div>
                  </div>
                </div>

                <div v-else class="metric-definition-steps">
                  <div v-for="step in metric.definition.steps" :key="step.code" class="definition-step-card">
                    <div class="definition-step-head">
                      <n-tag type="info" size="small">步骤 {{ step.code }}</n-tag>
                      <strong>{{ step.eventName }}</strong>
                    </div>
                    <div class="definition-grid compact">
                      <span>事件ID</span><strong>{{ step.eventId }}</strong>
                      <span>过滤条件</span><strong>{{ metricFilterTreeText(step.filterTree, step.filters) }}</strong>
                      <span>聚合过滤</span><strong>{{ aggregationFilterText(step) }}</strong>
                    </div>
                  </div>
                  <div class="metric-formula-line">
                    <span>全局过滤</span>
                    <strong>{{ metricFilterTreeText(metric.definition.globalFilterTree, metric.definition.globalFilters) }}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </template>
      <n-empty v-else description="请选择指标组" />
    </section>

    <section v-else-if="activeEntry === 'groups' && groupPageMode === 'editor'" class="metric-page">
      <div class="metric-page-head sticky-head">
        <div class="head-title-row">
          <n-button quaternary circle @click="cancelGroupEditor">
            <template #icon><n-icon :component="ChevronBackOutline" /></template>
          </n-button>
          <div>
            <h2>
              {{
                groupEditorDraft.mode === 'create'
                  ? '创建指标组'
                  : groupEditorDraft.mode === 'copy'
                    ? '复制指标组'
                    : '编辑指标组'
              }}
            </h2>
            <p>先选择指标组类型，再维护基本信息、权限和可执行计算口径。</p>
          </div>
        </div>
        <n-space>
          <n-button @click="cancelGroupEditor">取消</n-button>
          <n-button v-if="groupEditorDraft.mode === 'edit'" secondary @click="historyDrawerVisible = true">
            <template #icon><n-icon :component="TimeOutline" /></template>
            操作历史
          </n-button>
          <n-button type="primary" @click="saveGroupEditor">
            <template #icon><n-icon :component="SaveOutline" /></template>
            保存
          </n-button>
        </n-space>
      </div>

      <section class="metric-block">
        <div class="metric-block-title">
          <h3>基本信息</h3>
        </div>
        <div class="editor-grid">
          <label>
            <span>指标组类型</span>
            <n-select
              :value="groupEditorDraft.type"
              :disabled="groupEditorDraft.mode === 'edit'"
              :options="groupTypeOptions"
              placeholder="请选择指标组类型"
              @update:value="changeEditorType"
            />
            <small v-if="groupFieldErrors.type">{{ groupFieldErrors.type }}</small>
          </label>
          <label>
            <span>指标组名称</span>
            <n-input v-model:value="groupEditorDraft.name" placeholder="1-50字符，同应用唯一" />
            <small v-if="groupFieldErrors.name">{{ groupFieldErrors.name }}</small>
          </label>
          <label>
            <span>Owner / 负责人</span>
            <n-select v-model:value="groupEditorDraft.ownerId" :options="memberOptions" />
            <small v-if="groupFieldErrors.ownerId">{{ groupFieldErrors.ownerId }}</small>
          </label>
          <label>
            <span>所属目录分组</span>
            <n-select
              :value="groupEditorDraft.directoryGroupId"
              clearable
              filterable
              :options="directoryOptions"
              placeholder="搜索、选择或新建目录分组"
              @update:value="(value) => handleDirectoryChange(String(value || ''))"
            />
          </label>
          <label class="wide">
            <span>指标组描述</span>
            <n-input v-model:value="groupEditorDraft.description" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" placeholder="最多1000字符" />
          </label>
          <label>
            <span>权限类型</span>
            <n-select
              v-model:value="groupEditorDraft.permissionType"
              :options="[
                { label: '公共指标组', value: 'public' },
                { label: '私有指标组', value: 'private' },
              ]"
            />
          </label>
          <label v-if="groupEditorDraft.permissionType === 'private'">
            <span>授权用户</span>
            <n-select v-model:value="groupEditorDraft.authorizedUserIds" multiple :options="memberOptions" placeholder="Owner 和管理员默认有权限" />
          </label>
        </div>
      </section>

      <section class="metric-block">
        <div class="metric-block-title">
          <div>
            <h3>指标配置</h3>
            <p>{{ groupEditorDraft.type ? `${groupTypeLabel(groupEditorDraft.type)}配置` : '选择指标组类型后展示对应配置区' }}</p>
          </div>
          <n-button v-if="groupEditorDraft.type === 'event'" secondary :disabled="groupEditorDraft.metrics.length >= 100" @click="addMetricDraft">
            <template #icon><n-icon :component="AddCircleOutline" /></template>
            添加指标
          </n-button>
        </div>
        <n-alert v-if="groupEditorDraft.type === 'funnel' && groupEditorDraft.mode === 'edit'" type="warning" :bordered="false">
          该漏斗指标如已用于实验分析，修改漏斗步骤、过滤条件或转化窗口期后，将触发后续数据重新计算。历史实验报告保留原始绑定口径。
        </n-alert>
        <small v-if="groupFieldErrors.metrics || groupFieldErrors.metricNames || groupFieldErrors.metricDefinitions" class="error-text">
          {{ groupFieldErrors.metrics || groupFieldErrors.metricNames || groupFieldErrors.metricDefinitions }}
        </small>

        <n-empty v-if="!groupEditorDraft.type" description="请选择指标组类型" />
        <div v-else class="metric-card-list">
          <div v-for="metric in groupEditorDraft.metrics" :key="metric.id" class="metric-draft-card">
            <div class="metric-draft-head">
              <n-button quaternary size="small" @click="toggleMetricExpanded(metric.id)">
                {{ expandedMetricIds.includes(metric.id) ? '收起' : '展开' }}
              </n-button>
              <n-input v-model:value="metric.name" placeholder="指标名称，当前指标组内唯一" />
              <n-tag :type="metricConfidenceSupported(metric, groupEditorDraft.type) ? 'info' : 'default'" size="small">
                {{ metricConfidenceSupported(metric, groupEditorDraft.type) ? '支持置信度' : '不支持置信度' }}
              </n-tag>
              <n-button secondary size="small" :disabled="groupEditorDraft.metrics.length <= 1" @click="removeMetricDraft(metric.id)">
                <template #icon><n-icon :component="TrashOutline" /></template>
                删除
              </n-button>
            </div>

            <div v-if="expandedMetricIds.includes(metric.id)" class="metric-draft-body">
              <label class="wide">
                <span>指标描述</span>
                <n-input v-model:value="metric.description" type="textarea" :autosize="{ minRows: 2, maxRows: 3 }" placeholder="请输入指标含义、计算逻辑或使用场景，方便业务人员理解" />
              </label>

              <template v-if="groupEditorDraft.type === 'event'">
                <div class="inline-grid">
                  <label>
                    <span>指标类型</span>
                    <n-select
                      :value="metric.metricKind"
                      :options="[
                        { label: '单一指标', value: 'single' },
                        { label: '组合指标', value: 'composite' },
                      ]"
                      @update:value="(value) => updateMetricKind(metric, String(value))"
                    />
                  </label>
                  <label>
                    <span>数字格式</span>
                    <n-select
                      v-model:value="metric.numberFormatType"
                      :options="[
                        { label: '数字', value: 'number' },
                        { label: '百分比', value: 'percent' },
                      ]"
                    />
                  </label>
                  <label>
                    <span>小数位</span>
                    <n-input-number v-model:value="metric.decimalPlaces" :min="0" :max="6" />
                  </label>
                </div>

                <div v-for="(event, index) in metric.events" :key="event.code" class="event-config-row">
                  <strong>事件 {{ event.code }}</strong>
                  <n-select :value="event.eventId" :options="eventOptions" placeholder="选择事件" @update:value="(value) => syncEventMeta(event, String(value))" />
                  <n-select v-model:value="event.operator" :options="operatorOptions" placeholder="计算方式" />
                  <n-select v-if="metricNeedsProperty(event)" v-model:value="event.propertyId" :options="propertyOptionsForOperator(event.operator)" placeholder="选择属性" />
                  <n-button v-if="metric.metricKind === 'composite'" secondary size="small" :disabled="metric.events.length <= 2" @click="removeMetricEvent(metric, index)">
                    删除事件
                  </n-button>
                  <MetricFilterBuilder
                    class="event-filter-builder"
                    :group="event.filterTree"
                    :property-options="anyPropertyOptions"
                    :operator-options="filterOperatorOptions"
                    :title="`事件 ${event.code} 过滤条件`"
                    @property-change="handleFilterPropertyChange"
                  />
                  <div v-if="supportsAggregationFilter(event)" class="aggregation-filter-row">
                    <n-checkbox v-model:checked="event.aggregationFilter.enabled">启用指标属性聚合函数过滤</n-checkbox>
                    <n-select
                      v-model:value="event.aggregationFilter.dimensionType"
                      :options="aggregationDimensionOptions"
                      placeholder="聚合维度"
                    />
                    <n-select
                      v-if="event.aggregationFilter.dimensionType !== 'user'"
                      v-model:value="event.aggregationFilter.propertyId"
                      :options="aggregationPropertyOptions(event.aggregationFilter.dimensionType)"
                      placeholder="聚合属性"
                    />
                  </div>
                </div>

                <n-button v-if="metric.metricKind === 'composite'" secondary :disabled="metric.events.length >= 26" @click="addMetricEvent(metric)">
                  <template #icon><n-icon :component="AddCircleOutline" /></template>
                  添加事件
                </n-button>
                <label v-if="metric.metricKind === 'composite'" class="wide">
                  <span>指标关系</span>
                  <n-input v-model:value="metric.formula" placeholder="例如 A/B、(A-B)/A、A+B-C" />
                  <small :class="{ 'success-text': validateMetricFormula(metric.formula, metric.events.map((event) => event.code)).valid }">
                    {{ formulaFeedback(metric) }}
                  </small>
                </label>
              </template>

              <template v-else-if="groupEditorDraft.type === 'retention'">
                <div class="inline-grid">
                  <label>
                    <span>起始事件</span>
                    <n-select :value="metric.startEvent.eventId" :options="eventOptions" placeholder="选择起始事件" @update:value="(value) => syncEventMeta(metric.startEvent, String(value))" />
                  </label>
                  <label>
                    <span>回访事件</span>
                    <n-select :value="metric.returnEvent.eventId" :options="eventOptions" placeholder="选择回访事件" @update:value="(value) => syncEventMeta(metric.returnEvent, String(value))" />
                  </label>
                  <label>
                    <span>留存天数</span>
                    <n-input-number v-model:value="metric.retentionDays" :min="1" :max="365" />
                  </label>
                </div>
                <div class="dual-filter-grid">
                  <div>
                    <strong>起始事件过滤条件</strong>
                    <MetricFilterBuilder
                      :group="metric.startEvent.filterTree"
                      :property-options="anyPropertyOptions"
                      :operator-options="filterOperatorOptions"
                      title="起始事件过滤条件"
                      @property-change="handleFilterPropertyChange"
                    />
                  </div>
                  <div>
                    <strong>回访事件过滤条件</strong>
                    <MetricFilterBuilder
                      :group="metric.returnEvent.filterTree"
                      :property-options="anyPropertyOptions"
                      :operator-options="filterOperatorOptions"
                      title="回访事件过滤条件"
                      @property-change="handleFilterPropertyChange"
                    />
                  </div>
                </div>
              </template>

              <template v-else>
                <div class="inline-grid">
                  <label>
                    <span>转化窗口期</span>
                    <n-input-number v-model:value="metric.conversionWindowValue" :min="1" />
                  </label>
                  <label>
                    <span>单位</span>
                    <n-select
                      v-model:value="metric.conversionWindowUnit"
                      :options="[
                        { label: '分钟', value: 'minute' },
                        { label: '小时', value: 'hour' },
                        { label: '天', value: 'day' },
                      ]"
                    />
                  </label>
                </div>
                <div class="funnel-step-list">
                  <div v-for="(step, index) in metric.funnelSteps" :key="`${step.code}-${index}`" class="funnel-step-row">
                    <strong>步骤 {{ index + 1 }}</strong>
                    <n-select :value="step.eventId" :options="eventOptions" placeholder="选择漏斗事件" @update:value="(value) => syncEventMeta(step, String(value))" />
                    <n-button secondary size="small" :disabled="index === 0" @click="moveFunnelStep(metric, index, -1)">上移</n-button>
                    <n-button secondary size="small" :disabled="index === metric.funnelSteps.length - 1" @click="moveFunnelStep(metric, index, 1)">下移</n-button>
                    <n-button secondary size="small" :disabled="metric.funnelSteps.length <= 2" @click="removeFunnelStep(metric, index)">删除</n-button>
                    <MetricFilterBuilder
                      class="event-filter-builder"
                      :group="step.filterTree"
                      :property-options="anyPropertyOptions"
                      :operator-options="filterOperatorOptions"
                      :title="`步骤 ${index + 1} 过滤条件`"
                      @property-change="handleFilterPropertyChange"
                    />
                  </div>
                </div>
                <n-button secondary :disabled="metric.funnelSteps.length >= 10" @click="addFunnelStep(metric)">添加漏斗事件</n-button>
                <MetricFilterBuilder
                  :group="metric.globalFilterTree"
                  :property-options="anyPropertyOptions"
                  :operator-options="filterOperatorOptions"
                  title="全局过滤条件"
                  @property-change="handleFilterPropertyChange"
                />
              </template>

              <div v-if="groupEditorDraft.type !== 'funnel'" class="advanced-box">
                <div class="metric-block-title">
                  <div>
                    <h3>高级设置</h3>
                    <p>灵活属性只定义可变属性，实验选择指标时再填写属性值。</p>
                  </div>
                  <n-checkbox v-model:checked="metric.flexibleEnabled">灵活属性</n-checkbox>
                </div>
                <template v-if="metric.flexibleEnabled">
                  <div v-for="property in metric.flexibleProperties" :key="property.id" class="flex-row">
                    <n-select v-model:value="property.scope" :options="flexibleScopeOptions(metric)" />
                    <n-select :value="property.propertyId" :options="anyPropertyOptions" @update:value="(value) => handleFlexiblePropertyChange(property, String(value))" />
                    <n-select v-model:value="property.defaultOperator" :options="filterOperatorOptions" />
                    <n-input
                      :value="String(property.defaultValue ?? '')"
                      placeholder="默认属性值，可为空"
                      @update:value="(value) => (property.defaultValue = String(value))"
                    />
                    <n-button secondary @click="removeFlexibleProperty(metric, property.id)">删除</n-button>
                  </div>
                  <n-button secondary size="small" @click="addFlexibleProperty(metric)">添加灵活属性</n-button>
                </template>
              </div>

              <div class="inline-grid">
                <label>
                  <span>数字格式</span>
                  <n-select
                    v-model:value="metric.numberFormatType"
                    :options="[
                      { label: '数字', value: 'number' },
                      { label: '百分比', value: 'percent' },
                    ]"
                  />
                </label>
                <label>
                  <span>小数位</span>
                  <n-input-number v-model:value="metric.decimalPlaces" :min="0" :max="6" />
                </label>
                <label v-if="groupEditorDraft.type !== 'funnel'">
                  <span>设为必看指标</span>
                  <n-checkbox v-model:checked="metric.isMustSee" :disabled="!adminUserIds.has(currentUserId)">
                    管理员可操作
                  </n-checkbox>
                </label>
              </div>
            </div>
          </div>
        </div>
      </section>
    </section>

    <section v-else-if="activeEntry === 'templates'" class="metric-page">
      <div class="metric-page-head">
        <div>
          <h2>指标组模板管理</h2>
          <p>保存常用指标组集合，在创建实验时快速批量添加关注指标。</p>
        </div>
        <n-button type="primary" @click="openTemplateEditor('create')">
          <template #icon><n-icon :component="AddCircleOutline" /></template>
          新建模板
        </n-button>
      </div>
      <div class="metric-toolbar">
        <n-input v-model:value="templateKeyword" clearable placeholder="搜索模板名称、描述、Owner">
          <template #prefix><n-icon :component="SearchOutline" /></template>
        </n-input>
        <n-tabs v-model:value="templateTab" type="segment">
          <n-tab-pane name="all" tab="全部" />
          <n-tab-pane name="personal" tab="个人" />
          <n-tab-pane name="common" tab="通用" />
        </n-tabs>
      </div>
      <div class="metric-table-wrap">
        <n-table :bordered="false" size="small">
          <thead>
            <tr>
              <th>模板名称</th>
              <th>模板类型</th>
              <th>指标组数量</th>
              <th>Owner</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="template in filteredTemplates" :key="template.id">
              <td>
                <button type="button" class="link-button strong" @click="openTemplateEditor('edit', template)">{{ template.name }}</button>
                <p class="table-sub">{{ template.description }}</p>
              </td>
              <td>{{ templateTypeLabel(template.templateType) }}</td>
              <td>{{ template.metricGroupIds.length }}</td>
              <td>{{ memberName(template.ownerId) }}</td>
              <td>{{ formatDate(template.updatedAt) }}</td>
              <td>
                <n-space size="small">
                  <n-button size="tiny" secondary @click="applyTemplateToDraft(template)">用于实验草稿</n-button>
                  <n-button size="tiny" secondary :disabled="!canEditTemplate(template)" @click="openTemplateEditor('edit', template)">编辑</n-button>
                  <n-button size="tiny" secondary type="error" :disabled="!canEditTemplate(template)" @click="deleteTemplate(template)">删除</n-button>
                </n-space>
              </td>
            </tr>
          </tbody>
        </n-table>
        <n-empty v-if="!filteredTemplates.length" description="暂无匹配模板" />
      </div>
    </section>

    <section v-else-if="activeEntry === 'alarms'" class="metric-page">
      <div class="metric-page-head">
        <div>
          <h2>报警任务</h2>
          <p>支持大盘报警和实验报警，按策略命中后通过机器人或邮件触达。</p>
        </div>
        <n-space>
          <n-button secondary @click="openAlarmEditor('create', undefined, 'dashboard')">新建大盘报警</n-button>
          <n-button type="primary" @click="openAlarmEditor('create', undefined, 'experiment')">
            <template #icon><n-icon :component="AlarmOutline" /></template>
            新建实验报警
          </n-button>
        </n-space>
      </div>
      <div class="metric-toolbar">
        <n-input v-model:value="alarmKeyword" clearable placeholder="搜索报警任务、描述或指标">
          <template #prefix><n-icon :component="SearchOutline" /></template>
        </n-input>
        <n-select
          v-model:value="alarmStatusFilter"
          :options="[
            { label: '全部状态', value: 'all' },
            { label: '已启用', value: 'enabled' },
            { label: '已停用', value: 'disabled' },
          ]"
        />
        <n-select
          v-model:value="alarmTypeFilter"
          :options="[
            { label: '全部类型', value: 'all' },
            { label: '大盘报警', value: 'dashboard' },
            { label: '实验报警', value: 'experiment' },
          ]"
        />
      </div>
      <div class="metric-table-wrap">
        <n-table :bordered="false" size="small">
          <thead>
            <tr>
              <th>任务名称</th>
              <th>状态</th>
              <th>报警等级</th>
              <th>报警类型</th>
              <th>监控策略</th>
              <th>报警方式</th>
              <th>报警次数</th>
              <th>创建人</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="task in filteredAlarms" :key="task.id">
              <td>
                <button type="button" class="link-button strong" @click="openAlarmEditor('edit', task)">{{ task.name }}</button>
                <p class="table-sub">{{ task.description }}</p>
              </td>
              <td>
                <n-checkbox :checked="task.enabled" @update:checked="(checked) => toggleAlarm(task, Boolean(checked))">启用</n-checkbox>
              </td>
              <td>{{ alarmLevelLabel(task.level) }}</td>
              <td>{{ alarmTypeLabel(task.alarmType) }}</td>
              <td>{{ alarmStrategyText(task) }}</td>
              <td>{{ task.notification.channels.join('、') }}</td>
              <td>{{ task.triggerCount }}</td>
              <td>{{ memberName(task.createdBy) }}</td>
              <td>{{ formatDate(task.createdAt) }}</td>
              <td>
                <n-space size="small">
                  <n-button size="tiny" secondary @click="openAlarmEditor('edit', task)">编辑</n-button>
                  <n-button size="tiny" secondary @click="openAlarmRecords(task)">命中记录</n-button>
                  <n-button size="tiny" secondary type="error" @click="deleteAlarm(task)">删除</n-button>
                </n-space>
              </td>
            </tr>
          </tbody>
        </n-table>
        <n-empty v-if="!filteredAlarms.length" description="暂无匹配报警任务" />
      </div>
    </section>

    <section v-else-if="activeEntry === 'receivers'" class="metric-page">
      <div class="metric-page-head">
        <div>
          <h2>接收组</h2>
          <p>维护邮件报警接收人；被报警任务使用的接收组不可直接删除。</p>
        </div>
        <n-button type="primary" @click="openReceiverEditor('create')">
          <template #icon><n-icon :component="PeopleOutline" /></template>
          新建接收组
        </n-button>
      </div>
      <div class="metric-table-wrap">
        <n-table :bordered="false" size="small">
          <thead>
            <tr>
              <th>接收组名称</th>
              <th>成员数量</th>
              <th>成员预览</th>
              <th>创建人</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="group in receiverGroups" :key="group.id">
              <td>{{ group.name }}</td>
              <td>{{ group.memberIds.length }}</td>
              <td>{{ group.memberNames.join('、') }}</td>
              <td>{{ memberName(group.createdBy) }}</td>
              <td>{{ formatDate(group.updatedAt) }}</td>
              <td>
                <n-space size="small">
                  <n-button size="tiny" secondary @click="openReceiverEditor('edit', group)">编辑</n-button>
                  <n-button size="tiny" secondary type="error" @click="deleteReceiver(group)">删除</n-button>
                </n-space>
              </td>
            </tr>
          </tbody>
        </n-table>
        <n-empty v-if="!receiverGroups.length" description="暂无接收组" />
      </div>
    </section>

    <section v-else class="metric-page">
      <div class="metric-page-head">
        <div>
          <h2>必看指标看板</h2>
          <p>从应用视角查看所有必看指标趋势，并通过异常时间点反查新增或运行中的实验。</p>
        </div>
        <n-space>
          <n-button secondary @click="resetMustSeeFilters">
            <template #icon><n-icon :component="RefreshOutline" /></template>
            重置
          </n-button>
          <n-button type="primary" @click="queryMustSeeBoard">
            <template #icon><n-icon :component="AnalyticsOutline" /></template>
            查询
          </n-button>
        </n-space>
      </div>
      <div class="must-see-filters">
        <n-select
          v-model:value="mustSeeFilters.grain"
          :options="[
            { label: '天级', value: 'day' },
            { label: '小时级', value: 'hour' },
            { label: '5分钟级', value: '5m' },
          ]"
        />
        <n-select
          v-model:value="mustSeeFilters.range"
          :options="[
            { label: '最近7天', value: '7d' },
            { label: '最近3天', value: '3d' },
            { label: '最近24小时', value: '24h' },
            { label: '最近365天', value: '365d' },
          ]"
        />
        <n-select
          v-model:value="mustSeeFilters.experimentMode"
          :options="[
            { label: '全部实验模式', value: 'all' },
            { label: '主动触发型实验', value: 'new' },
            { label: '被动接受型实验 / Push实验', value: 'running' },
          ]"
        />
        <n-select
          v-model:value="mustSeeFilters.experimentVersionIds"
          multiple
          filterable
          clearable
          :options="mustSeeExperimentVersionOptions"
          placeholder="实验及版本"
        />
        <n-select
          v-model:value="mustSeeFilters.dimensionType"
          :options="[
            { label: '全部筛选维度', value: 'all' },
            { label: '公共属性', value: 'public' },
            { label: '用户分群', value: 'cohort' },
          ]"
        />
        <n-select
          v-model:value="mustSeeFilters.dimensionOperator"
          :disabled="mustSeeFilters.dimensionType === 'all'"
          :options="[
            { label: '等于', value: '=' },
            { label: '属于', value: 'in' },
            { label: '不属于', value: 'not_in' },
          ]"
        />
        <n-input v-model:value="mustSeeFilters.dimensionValue" placeholder="维度值" />
      </div>
      <n-alert v-if="mustSeeRangeWarning" type="warning" :bordered="false">
        {{ mustSeeRangeWarning }}
      </n-alert>

      <n-empty
        v-if="!mustSeeTrendCards.length"
        description="暂无必看指标。请在指标组列表中将关键业务指标设置为必看指标。"
      />
      <div v-else class="trend-grid">
        <div
          v-for="trend in mustSeeTrendCards"
          :key="trend.metricId"
          class="trend-card"
          @mouseenter="hoveredTrendId = trend.metricId"
          @mouseleave="hoveredTrendId = null"
        >
          <div class="trend-head">
            <div>
              <strong>{{ trend.metricName }}</strong>
              <span>{{ trend.metricGroupName }}</span>
            </div>
            <strong>{{ trend.currentValue.toFixed(2) }}%</strong>
          </div>
          <svg viewBox="0 0 100 80" preserveAspectRatio="none" class="sparkline">
            <path :d="trendPath(trend)" />
          </svg>
          <div class="trend-meta">
            <n-tag size="small">日环比 {{ formatDelta(trend.latestPoint?.dayOverDay) }}</n-tag>
            <n-tag size="small">周环比 {{ formatDelta(trend.latestPoint?.weekOverWeek) }}</n-tag>
          </div>
          <div v-if="hoveredTrendId === trend.metricId" class="trend-hover">
            <strong>{{ trend.latestPoint?.time ?? '-' }}</strong>
            <span>指标值 {{ trend.latestPoint?.value.toFixed(2) ?? '-' }}%</span>
            <span>新增实验 {{ trend.newCount }} 个，运行中实验 {{ trend.runningCount }} 个</span>
            <n-space size="small">
              <n-button
                size="tiny"
                secondary
                :disabled="!trend.latestPoint?.relatedNewExperimentIds.length"
                @click="jumpToMustSeeExperiments(trend, 'new')"
              >
                查看当时新增实验
              </n-button>
              <n-button
                size="tiny"
                secondary
                :disabled="!trend.latestPoint?.relatedRunningExperimentIds.length"
                @click="jumpToMustSeeExperiments(trend, 'running')"
              >
                查看当时运行实验
              </n-button>
            </n-space>
          </div>
        </div>
      </div>
    </section>

    <n-modal v-model:show="directoryModalVisible" preset="card" title="新建目录分组" class="metric-modal-small" :mask-closable="false">
      <div class="editor-grid single">
        <label>
          <span>分组名称</span>
          <n-input v-model:value="directoryDraft.name" placeholder="1-50字符，同应用唯一" />
          <small v-if="directoryFieldErrors.name">{{ directoryFieldErrors.name }}</small>
        </label>
        <label>
          <span>分组描述</span>
          <n-input v-model:value="directoryDraft.description" type="textarea" :autosize="{ minRows: 2, maxRows: 3 }" placeholder="最多200字符" />
          <small v-if="directoryFieldErrors.description">{{ directoryFieldErrors.description }}</small>
        </label>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="directoryModalVisible = false">取消</n-button>
          <n-button type="primary" @click="saveDirectoryGroup">保存分组</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="mergeDialogVisible" preset="card" title="合并指标组" class="metric-modal" :mask-closable="false">
      <div class="editor-grid">
        <label>
          <span>新指标组名称</span>
          <n-input v-model:value="mergeDraft.name" placeholder="最长50字符，同应用不可重名" />
          <small v-if="mergeFieldErrors.name">{{ mergeFieldErrors.name }}</small>
        </label>
        <label>
          <span>Owner</span>
          <n-select v-model:value="mergeDraft.ownerId" :options="memberOptions" />
          <small v-if="mergeFieldErrors.ownerId">{{ mergeFieldErrors.ownerId }}</small>
        </label>
        <label>
          <span>权限类型</span>
          <n-select
            v-model:value="mergeDraft.permissionType"
            :options="[
              { label: '公共指标组', value: 'public' },
              { label: '私有指标组', value: 'private' },
            ]"
          />
        </label>
        <label v-if="mergeDraft.permissionType === 'private'">
          <span>授权用户</span>
          <n-select v-model:value="mergeDraft.authorizedUserIds" multiple :options="memberOptions" />
        </label>
        <label class="wide">
          <span>新指标组描述</span>
          <n-input v-model:value="mergeDraft.description" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" />
        </label>
      </div>
      <n-divider />
      <n-alert v-if="mergeDuplicateMessage || mergeFieldErrors.metricNames" type="error" :bordered="false">
        {{ mergeDuplicateMessage || mergeFieldErrors.metricNames }}
      </n-alert>
      <div class="metric-table-wrap small-table">
        <n-table :bordered="false" size="small">
          <thead>
            <tr>
              <th>来源指标组</th>
              <th>指标类型</th>
              <th>指标名称</th>
              <th>合并后名称</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="{ group, metric } in mergeSourceMetrics" :key="metric.id">
              <td>{{ group.name }}</td>
              <td>{{ groupTypeLabel(metric.metricCategory) }}</td>
              <td>{{ metric.name }}</td>
              <td><n-input v-model:value="mergeDraft.metricNameOverrides[metric.id]" /></td>
            </tr>
          </tbody>
        </n-table>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="mergeDialogVisible = false">取消</n-button>
          <n-button type="primary" :disabled="Boolean(mergeDuplicateMessage)" @click="confirmMerge">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="offlineConfirmVisible" preset="dialog" title="确认下线指标组？" positive-text="确认下线" negative-text="取消" @positive-click="confirmOfflineGroup">
      下线后，该指标组不可再被新实验选择，历史实验报告仍保留原有数据和口径。
    </n-modal>

    <n-modal v-model:show="offlineBlockVisible" preset="card" title="无法下线指标组" class="metric-modal">
      <p class="muted">当前指标组存在被运行中实验使用的指标，请先停止相关实验或移除指标后再下线。</p>
      <div class="metric-table-wrap small-table">
        <n-table :bordered="false" size="small">
          <thead>
            <tr>
              <th>实验名称</th>
              <th>实验ID</th>
              <th>实验Owner</th>
              <th>实验状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="experiment in offlineBlockedExperiments" :key="experiment.id">
              <td>{{ experiment.name }}</td>
              <td>{{ experiment.id }}</td>
              <td>{{ memberName(experiment.ownerId) }}</td>
              <td>{{ experiment.status }}</td>
              <td><n-button size="tiny" secondary @click="jumpToExperiment(experiment.id)">查看实验</n-button></td>
            </tr>
          </tbody>
        </n-table>
      </div>
    </n-modal>

    <n-modal v-model:show="associationModalVisible" preset="card" title="关联实验" class="metric-modal">
      <div class="metric-toolbar compact-toolbar">
        <n-select
          v-model:value="associationFilters.status"
          :options="[
            { label: '进行中的实验', value: 'RUNNING' },
            { label: '全部状态', value: 'all' },
            { label: '草稿', value: 'DRAFT' },
            { label: '已暂停', value: 'PAUSED' },
            { label: '已结束', value: 'ENDED' },
          ]"
        />
        <n-input v-model:value="associationFilters.keyword" clearable placeholder="搜索实验名称、实验ID、Owner">
          <template #prefix><n-icon :component="SearchOutline" /></template>
        </n-input>
        <n-select
          v-model:value="associationFilters.ownerId"
          :options="[{ label: '全部Owner', value: 'all' }, ...memberOptions]"
        />
      </div>
      <div class="metric-table-wrap small-table">
        <n-table :bordered="false" size="small">
          <thead>
            <tr>
              <th>实验名称</th>
              <th>实验ID</th>
              <th>实验状态</th>
              <th>实验Owner</th>
              <th>实验流量</th>
              <th>创建时间</th>
              <th>指标角色</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="experiment in filteredSelectedGroupExperiments" :key="experiment.id">
              <td>{{ experiment.name }}</td>
              <td>{{ experiment.id }}</td>
              <td>{{ experiment.status }}</td>
              <td>{{ memberName(experiment.ownerId) }}</td>
              <td>{{ experiment.trafficRatio }}%</td>
              <td>{{ formatDate(experiment.createdAt) }}</td>
              <td>{{ experiment.coreMetricId && selectedMetricGroup?.metricIds.includes(experiment.coreMetricId) ? '核心指标' : '关注指标' }}</td>
              <td><n-button size="tiny" secondary @click="jumpToExperiment(experiment.id)">查看实验</n-button></td>
            </tr>
          </tbody>
        </n-table>
        <n-empty v-if="!filteredSelectedGroupExperiments.length" description="暂无匹配的关联实验" />
      </div>
    </n-modal>

    <n-drawer v-model:show="historyDrawerVisible" :width="520">
      <n-drawer-content title="操作历史">
        <div class="history-list">
          <div v-for="log in selectedGroupLogs" :key="log.id" class="history-row">
            <n-icon :component="TimeOutline" />
            <div>
              <strong>{{ historyActionLabel(log.action) }}</strong>
              <span>{{ log.operatorName }} · {{ formatDate(log.createdAt) }}</span>
              <small>变更字段：{{ historyChangedFields(log) }}</small>
              <code>修改前：{{ historySnapshotText(log.before) }}</code>
              <code>修改后：{{ historySnapshotText(log.after) }}</code>
            </div>
          </div>
          <n-empty v-if="!selectedGroupLogs.length" description="暂无操作历史" />
        </div>
      </n-drawer-content>
    </n-drawer>

    <n-modal v-model:show="templateEditorVisible" preset="card" title="模板编辑" class="metric-modal" :mask-closable="false">
      <div class="editor-grid">
        <label>
          <span>模板名称</span>
          <n-input v-model:value="templateDraft.name" placeholder="1-50字符，同Owner下唯一" />
          <small v-if="templateFieldErrors.name">{{ templateFieldErrors.name }}</small>
        </label>
        <label>
          <span>模板Owner</span>
          <n-select v-model:value="templateDraft.ownerId" :options="memberOptions" />
        </label>
        <label>
          <span>模板类别</span>
          <n-select
            v-model:value="templateDraft.templateType"
            :options="[
              { label: '个人模板', value: 'personal' },
              { label: '通用模板', value: 'common' },
            ]"
          />
        </label>
        <label v-if="templateDraft.templateType === 'personal'">
          <span>指定人可用</span>
          <n-select v-model:value="templateDraft.availableUserIds" multiple :options="memberOptions" />
        </label>
        <label class="wide">
          <span>模板描述</span>
          <n-input v-model:value="templateDraft.description" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" />
        </label>
      </div>
      <n-divider />
      <div class="template-picker">
        <section>
          <div class="metric-block-title">
            <h3>可选指标组</h3>
            <n-button size="small" secondary @click="templateGroupKeyword = ''">刷新</n-button>
          </div>
          <n-input v-model:value="templateGroupKeyword" clearable placeholder="搜索指标组名称、描述、Owner">
            <template #prefix><n-icon :component="SearchOutline" /></template>
          </n-input>
          <div class="picker-list">
            <label v-for="group in availableTemplateGroups" :key="group.id" class="picker-row">
              <n-checkbox
                :checked="templateDraft.metricGroupIds.includes(group.id)"
                @update:checked="(checked) => toggleTemplateGroup(group.id, Boolean(checked))"
              />
              <span>{{ group.name }}</span>
              <n-tag size="small">{{ groupTypeLabel(group.type) }}</n-tag>
            </label>
          </div>
        </section>
        <section>
          <div class="metric-block-title">
            <h3>已选指标组 {{ templateDraft.metricGroupIds.length }}</h3>
            <n-space>
              <n-button size="small" secondary @click="resetTemplateGroups">重置</n-button>
              <n-button size="small" secondary @click="clearTemplateGroups">清空</n-button>
            </n-space>
          </div>
          <div class="picker-list">
            <div v-for="groupId in templateDraft.metricGroupIds" :key="groupId" class="picker-row">
              <span>{{ metricGroups.find((group) => group.id === groupId)?.name ?? groupId }}</span>
              <n-button size="tiny" secondary @click="toggleTemplateGroup(groupId, false)">移除</n-button>
            </div>
          </div>
          <small v-if="templateFieldErrors.metricGroupIds" class="error-text">{{ templateFieldErrors.metricGroupIds }}</small>
        </section>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="templateEditorVisible = false">取消</n-button>
          <n-button type="primary" @click="saveTemplateEditor">保存模板</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="alarmEditorVisible" preset="card" title="报警任务" class="metric-modal" :mask-closable="false">
      <div class="editor-grid">
        <label>
          <span>任务名称</span>
          <n-input v-model:value="alarmDraft.name" placeholder="最长50字符" />
          <small v-if="alarmFieldErrors.name">{{ alarmFieldErrors.name }}</small>
        </label>
        <label>
          <span>报警类型</span>
          <n-select
            :value="alarmDraft.alarmType"
            :disabled="alarmDraft.mode === 'edit'"
            :options="[
              { label: '大盘报警', value: 'dashboard' },
              { label: '实验报警', value: 'experiment' },
            ]"
            @update:value="(value) => handleAlarmTypeChange(String(value))"
          />
        </label>
        <label v-if="alarmDraft.alarmType === 'experiment'">
          <span>实验</span>
          <n-select v-model:value="alarmDraft.experimentId" :options="experimentOptions" filterable />
          <small v-if="alarmFieldErrors.scene">{{ alarmFieldErrors.scene }}</small>
        </label>
        <label v-else>
          <span>关联大盘</span>
          <n-input v-model:value="alarmDraft.dashboardId" placeholder="例如 board_growth_overview" />
        </label>
        <label>
          <span>报警等级</span>
          <n-select
            v-model:value="alarmDraft.level"
            :options="[
              { label: '注意', value: 'notice' },
              { label: '警告', value: 'warning' },
              { label: '危急', value: 'critical' },
            ]"
          />
        </label>
        <label class="wide">
          <span>任务说明</span>
          <n-input v-model:value="alarmDraft.description" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" />
        </label>
      </div>
      <n-divider />
      <div class="metric-block-title">
        <div>
          <h3>报警策略配置</h3>
          <p>多条策略之间按报警规则关系判断；大盘报警支持绝对数值、同比、环比，实验报警固定对照组比较。</p>
        </div>
        <n-button secondary size="small" @click="addAlarmStrategy">添加报警策略</n-button>
      </div>
      <div class="editor-grid">
        <label>
          <span>报警规则</span>
          <n-select
            v-model:value="alarmDraft.ruleRelation"
            :options="[
              { label: '同时满足以下规则', value: 'all' },
              { label: '满足下述一条规则', value: 'any' },
            ]"
          />
        </label>
        <label>
          <span>任务间隔</span>
          <n-select
            v-model:value="alarmDraft.interval"
            :options="[
              { label: '1小时', value: '1h' },
              { label: '24小时', value: '24h' },
            ]"
          />
        </label>
      </div>
      <div class="alarm-strategy-list">
        <div v-for="(strategy, index) in alarmDraft.strategies" :key="strategy.tempId" class="alarm-strategy-row">
          <strong>策略 {{ index + 1 }}</strong>
          <n-select v-model:value="strategy.metricId" :options="activeMetricOptions" filterable placeholder="指标名称" />
          <n-select
            v-if="alarmDraft.alarmType === 'dashboard'"
            v-model:value="strategy.strategyType"
            :options="[
              { label: '绝对数值', value: 'absolute' },
              { label: '同比', value: 'yoy' },
              { label: '环比', value: 'mom' },
            ]"
          />
          <n-tag v-else size="small" type="info">对比对照组</n-tag>
          <n-select
            v-model:value="strategy.direction"
            :options="[
              { label: '下降', value: 'decrease' },
              { label: '上升', value: 'increase' },
              { label: '任意波动', value: 'any' },
            ]"
          />
          <n-input-number v-model:value="strategy.thresholdPercent" :min="0.01" :max="100" />
          <n-checkbox v-if="alarmDraft.alarmType === 'experiment'" v-model:checked="strategy.requireSignificance">
            显著时报警
          </n-checkbox>
          <n-button secondary size="small" :disabled="alarmDraft.strategies.length <= 1" @click="removeAlarmStrategy(strategy.tempId)">删除</n-button>
        </div>
        <small v-if="alarmFieldErrors.strategies" class="error-text">{{ alarmFieldErrors.strategies }}</small>
      </div>
      <n-divider />
      <div class="editor-grid">
        <label>
          <span>报警方式</span>
          <n-select
            v-model:value="alarmDraft.channels"
            multiple
            :options="[
              { label: '飞书', value: 'feishu' },
              { label: '钉钉', value: 'dingtalk' },
              { label: '企业微信', value: 'wecom' },
              { label: '邮件', value: 'email' },
            ]"
          />
          <small v-if="alarmFieldErrors.notification">{{ alarmFieldErrors.notification }}</small>
        </label>
        <label v-if="alarmDraft.channels.includes('email')">
          <span>邮件接收组</span>
          <n-select v-model:value="alarmDraft.receiverGroupIds" multiple :options="receiverOptions" />
          <small v-if="alarmFieldErrors.receiverGroupIds">{{ alarmFieldErrors.receiverGroupIds }}</small>
        </label>
        <label v-if="alarmDraft.channels.includes('feishu')">
          <span>飞书 WebHook</span>
          <n-input v-model:value="alarmDraft.feishuWebhook" />
        </label>
        <label v-if="alarmDraft.channels.includes('dingtalk')">
          <span>钉钉 WebHook</span>
          <n-input v-model:value="alarmDraft.dingtalkWebhook" />
          <small>建议将“报警”设置为钉钉机器人安全关键词。</small>
        </label>
        <label v-if="alarmDraft.channels.includes('wecom')">
          <span>企微 WebHook</span>
          <n-input v-model:value="alarmDraft.wecomWebhook" />
        </label>
        <label>
          <span>报警时间</span>
          <div class="time-range-list">
            <div v-for="range in alarmDraft.timeRanges" :key="range.id" class="time-range-row">
              <n-input v-model:value="range.start" />
              <n-input v-model:value="range.end" />
              <n-button secondary size="small" :disabled="alarmDraft.timeRanges.length <= 1" @click="removeAlarmTimeRange(range.id)">删除</n-button>
            </div>
            <n-button size="small" secondary @click="addAlarmTimeRange">添加时间段</n-button>
          </div>
        </label>
        <label>
          <span>生效开关</span>
          <n-checkbox v-model:checked="alarmDraft.enabled">保存后启用</n-checkbox>
        </label>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="alarmEditorVisible = false">取消</n-button>
          <n-button type="primary" @click="saveAlarmEditor">保存报警</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-drawer v-model:show="alarmRecordDrawerVisible" :width="760">
      <n-drawer-content title="报警命中记录">
        <div class="metric-block-title">
          <div>
            <h3>{{ selectedAlarmRecordTask?.name ?? '全部报警任务' }}</h3>
            <p>展示策略命中、发送结果、接收组和核心数值，删除任务后历史记录仍可追溯。</p>
          </div>
          <n-tag size="small">{{ selectedAlarmRecords.length }} 条</n-tag>
        </div>
        <div class="metric-table-wrap small-table">
          <n-table :bordered="false" size="small">
            <thead>
              <tr>
                <th>命中时间</th>
                <th>指标</th>
                <th>阈值</th>
                <th>实际变化</th>
                <th>P-value</th>
                <th>发送状态</th>
                <th>通知对象</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in selectedAlarmRecords" :key="record.id">
                <td>{{ formatDate(record.triggeredAt) }}</td>
                <td>
                  <strong>{{ record.metricName }}</strong>
                  <p class="table-sub">{{ record.message }}</p>
                </td>
                <td>{{ record.thresholdPercent }}%</td>
                <td>{{ record.diffPercent > 0 ? '+' : '' }}{{ record.diffPercent.toFixed(2) }}%</td>
                <td>{{ record.requireSignificance ? (record.pValue ?? '-') : '未要求' }}</td>
                <td>
                  <n-tag size="small" :type="alarmRecordStatusType(record.status)">{{ alarmRecordStatusLabel(record.status) }}</n-tag>
                </td>
                <td>{{ record.receiverGroupNames.join('、') || record.notificationChannels.join('、') }}</td>
              </tr>
            </tbody>
          </n-table>
          <n-empty v-if="!selectedAlarmRecords.length" description="暂无报警命中记录" />
        </div>
      </n-drawer-content>
    </n-drawer>

    <n-modal v-model:show="receiverEditorVisible" preset="card" title="接收组" class="metric-modal-small" :mask-closable="false">
      <div class="editor-grid single">
        <label>
          <span>接收组名称</span>
          <n-input v-model:value="receiverDraft.name" placeholder="1-50字符，同应用唯一" />
          <small v-if="receiverFieldErrors.name">{{ receiverFieldErrors.name }}</small>
        </label>
        <label>
          <span>接收组成员</span>
          <n-select v-model:value="receiverDraft.memberIds" multiple :options="memberOptions" />
          <small v-if="receiverFieldErrors.memberIds">{{ receiverFieldErrors.memberIds }}</small>
        </label>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="receiverEditorVisible = false">取消</n-button>
          <n-button type="primary" @click="saveReceiverEditor">保存接收组</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="receiverDeleteBlockedVisible" preset="card" title="无法删除接收组" class="metric-modal-small">
      <p class="muted">该接收组正在被报警任务使用，请先修改报警任务。</p>
      <div class="history-list">
        <div v-for="task in receiverBlockedAlarmTasks" :key="task.id" class="history-row">
          <n-icon :component="AlarmOutline" />
          <div>
            <strong>{{ task.name }}</strong>
            <span>{{ alarmStrategyText(task) }}</span>
          </div>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<style scoped>
.metric-module,
.metric-page,
.metric-card-list,
.metric-row-list,
.metric-draft-body,
.history-list {
  display: grid;
  gap: 14px;
}

.metric-subnav {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.metric-subnav button {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr);
  gap: 4px 8px;
  align-items: center;
  min-height: 72px;
  border: 1px solid #d9e2ec;
  border-radius: 8px;
  padding: 10px 12px;
  background: #ffffff;
  color: #0f172a;
  text-align: left;
  cursor: pointer;
}

.metric-subnav button.active {
  border-color: #2563eb;
  background: #eff6ff;
}

.metric-subnav small {
  grid-column: 2;
  color: #64748b;
  font-size: 12px;
  line-height: 1.4;
}

.metric-page {
  border: 1px solid #d9e2ec;
  border-radius: 8px;
  padding: 16px;
  background: #ffffff;
}

.metric-page-head,
.metric-pagination-row,
.metric-block-title,
.metric-draft-head,
.metric-config-head,
.trend-head,
.head-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.head-title-row {
  justify-content: flex-start;
}

.sticky-head {
  position: sticky;
  top: 0;
  z-index: 4;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 12px;
  background: #ffffff;
}

h2,
h3,
p {
  margin: 0;
}

.metric-page-head h2 {
  color: #0f172a;
  font-size: 22px;
}

.metric-page-head p,
.metric-block-title p,
.muted,
.table-sub {
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
}

.metric-toolbar,
.must-see-filters {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) 180px 180px;
  gap: 10px;
  align-items: center;
}

.metric-toolbar.compact-toolbar {
  grid-template-columns: 180px minmax(240px, 1fr) 180px;
  margin-bottom: 12px;
}

.must-see-filters {
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
}

.metric-table-wrap {
  overflow: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.metric-table-wrap :deep(table) {
  min-width: 1040px;
}

.metric-table-wrap.small-table :deep(table) {
  min-width: 720px;
}

.table-header-filter {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.select-col {
  width: 42px;
}

.link-button {
  border: 0;
  padding: 0;
  background: transparent;
  color: #2563eb;
  cursor: pointer;
  font: inherit;
  text-align: left;
}

.link-button.strong {
  font-weight: 700;
}

.ellipsis-cell {
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metric-detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
  gap: 14px;
  align-items: start;
}

.metric-block,
.metric-draft-card,
.metric-definition-box,
.advanced-box,
.trend-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 14px;
  background: #ffffff;
}

.metric-block {
  display: grid;
  gap: 12px;
}

.metric-info-block {
  align-content: start;
}

.metric-info-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.compact-descriptions {
  width: 100%;
}

.compact-descriptions :deep(.n-descriptions-table-header),
.compact-descriptions :deep(.n-descriptions-table-content) {
  padding: 9px 12px;
}

.compact-descriptions :deep(.n-descriptions-table-header) {
  color: #64748b;
  font-size: 12px;
}

.definition-grid {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 10px 12px;
  align-items: start;
}

.definition-grid.compact {
  grid-template-columns: 88px minmax(0, 1fr);
}

.definition-grid span {
  color: #64748b;
}

.permission-strip,
.metric-display-tags,
.trend-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.permission-editor-grid {
  display: grid;
  gap: 10px;
}

.permission-editor-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.permission-editor-grid label {
  display: grid;
  gap: 4px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px;
  background: #f8fafc;
}

.permission-editor-grid span,
.metric-head-copy span {
  color: #64748b;
  font-size: 12px;
}

.permission-editor-grid .wide {
  grid-column: 1 / -1;
}

.permission-user-strip {
  display: grid;
  gap: 8px;
}

.permission-user-strip > span {
  color: #64748b;
  font-size: 12px;
}

.metric-config-row {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}

.metric-config-head {
  display: grid;
  grid-template-columns: 64px minmax(220px, 1fr) auto auto auto auto;
  padding: 10px 12px;
}

.metric-definition-box {
  display: grid;
  gap: 12px;
  margin: 0 12px 12px;
  background: #ffffff;
}

.metric-head-copy,
.metric-display-header,
.metric-definition-steps {
  display: grid;
  gap: 8px;
}

.metric-display-header {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
}

.definition-step-card {
  display: grid;
  gap: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px 12px;
  background: #f8fafc;
}

.definition-step-head,
.metric-formula-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.metric-formula-line {
  justify-content: space-between;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  padding: 10px 12px;
  background: #eff6ff;
}

.editor-grid,
.inline-grid,
.dual-filter-grid,
.template-picker,
.event-config-row,
.flex-row,
.funnel-step-row {
  display: grid;
  gap: 10px;
  align-items: start;
}

.editor-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.editor-grid.single {
  grid-template-columns: 1fr;
}

.editor-grid label,
.metric-draft-body label {
  display: grid;
  gap: 6px;
}

.editor-grid .wide,
.metric-draft-body .wide {
  grid-column: 1 / -1;
}

.editor-grid small,
.metric-draft-body small,
.error-text {
  color: #dc2626;
  font-size: 12px;
}

.metric-draft-card {
  background: #f8fafc;
}

.metric-draft-head {
  display: grid;
  grid-template-columns: 64px minmax(180px, 1fr) auto auto;
}

.metric-draft-body {
  margin-top: 12px;
}

.inline-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.dual-filter-grid,
.template-picker {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.event-config-row {
  grid-template-columns: 78px minmax(180px, 1fr) minmax(180px, 1fr) minmax(160px, 0.8fr) auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  background: #ffffff;
}

.event-config-row .event-filter-builder {
  grid-column: 2 / -1;
}

.aggregation-filter-row {
  grid-column: 2 / -1;
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(160px, 0.7fr) minmax(180px, 1fr);
  gap: 8px;
  align-items: center;
  border: 1px dashed #bfdbfe;
  border-radius: 8px;
  padding: 10px;
  background: #eff6ff;
}

.success-text {
  color: #16a34a !important;
}

.flex-row {
  grid-template-columns: 120px minmax(160px, 1fr) 140px minmax(160px, 1fr) 80px;
}

.funnel-step-list {
  display: grid;
  gap: 10px;
}

.funnel-step-row {
  grid-template-columns: 72px minmax(220px, 1fr) repeat(3, auto);
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  background: #ffffff;
}

.funnel-step-row .event-filter-builder {
  grid-column: 2 / -1;
}

.picker-list {
  display: grid;
  gap: 8px;
  max-height: 360px;
  overflow: auto;
}

.picker-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 9px 10px;
  background: #ffffff;
}

.history-row {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr);
  gap: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px 12px;
  background: #ffffff;
}

.history-row div {
  display: grid;
  gap: 4px;
}

.history-row span,
.trend-card span {
  color: #64748b;
  font-size: 12px;
}

.history-row code {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #475569;
  font-size: 12px;
}

.trend-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.trend-card {
  position: relative;
  min-height: 210px;
}

.trend-head > div {
  display: grid;
  gap: 4px;
}

.sparkline {
  width: 100%;
  height: 90px;
  margin: 8px 0;
  overflow: visible;
}

.sparkline path {
  fill: none;
  stroke: #2563eb;
  stroke-width: 3;
  vector-effect: non-scaling-stroke;
}

.trend-hover {
  position: absolute;
  right: 12px;
  bottom: 12px;
  z-index: 2;
  display: grid;
  gap: 6px;
  min-width: 240px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 10px;
  background: #eff6ff;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);
}

.alarm-strategy-list,
.time-range-list {
  display: grid;
  gap: 8px;
}

.alarm-strategy-row {
  display: grid;
  grid-template-columns: 70px minmax(170px, 1fr) minmax(120px, 0.75fr) minmax(120px, 0.75fr) minmax(110px, 0.55fr) minmax(110px, auto) 72px;
  gap: 8px;
  align-items: center;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px;
  background: #f8fafc;
}

.time-range-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 8px;
}

.metric-modal {
  width: min(1080px, calc(100vw - 32px));
}

.metric-modal-small {
  width: min(640px, calc(100vw - 32px));
}

@media (max-width: 980px) {
  .metric-subnav,
  .metric-detail-grid,
  .editor-grid,
  .inline-grid,
  .dual-filter-grid,
  .template-picker,
  .trend-grid,
  .must-see-filters,
  .metric-toolbar,
  .metric-config-head,
  .metric-display-header,
  .event-config-row,
  .aggregation-filter-row,
  .alarm-strategy-row,
  .time-range-row,
  .flex-row,
  .funnel-step-row,
  .metric-draft-head {
    grid-template-columns: 1fr;
  }

  .metric-page-head,
  .metric-block-title {
    align-items: stretch;
    flex-direction: column;
  }

  .event-config-row .event-filter-builder,
  .aggregation-filter-row,
  .funnel-step-row .event-filter-builder,
  .editor-grid .wide,
  .permission-editor-grid .wide,
  .metric-draft-body .wide {
    grid-column: auto;
  }
}
</style>
