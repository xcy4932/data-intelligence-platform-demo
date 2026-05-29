<script setup lang="ts">
import '@/components/charts/chartRegister'
import type { EChartsOption } from 'echarts'
import dayjs from 'dayjs'
import {
  AddCircleOutline,
  ArrowBackOutline,
  CloudDownloadOutline,
  CreateOutline,
  EyeOutline,
  PeopleOutline,
  RefreshOutline,
  SaveOutline,
  SearchOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import type { DataTableColumns, SelectOption } from 'naive-ui'
import {
  NAlert,
  NButton,
  NCard,
  NCheckbox,
  NCheckboxGroup,
  NDataTable,
  NDatePicker,
  NDivider,
  NEmpty,
  NForm,
  NFormItem,
  NGi,
  NGrid,
  NIcon,
  NInput,
  NInputNumber,
  NModal,
  NRadioButton,
  NRadioGroup,
  NSelect,
  NSpace,
  NSpin,
  NStep,
  NSteps,
  NStatistic,
  NTag,
  NText,
  NTooltip,
  useMessage,
} from 'naive-ui'
import { computed, h, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import VChart from 'vue-echarts'
import AdAudienceFilterBuilder from '@/components/ad-analysis/AdAudienceFilterBuilder.vue'
import { adAnalysisService } from '@/services/adAnalysisService'
import { failureFromMessage, getAdQueryFailure, getAdReportGateFailure } from '@/services/adAnalysisRules'
import type {
  AdAccessContext,
  AdAccessContextPatch,
  AdAccessDecision,
  AdAnalysisReport,
  AdAudienceFilter,
  AdAuditLog,
  AdBehaviorEventConfig,
  AdBehaviorSemantic,
  AdDailyTrendPoint,
  AdDataPrerequisiteStatus,
  AdEffectDetailRow,
  AdEffectResult,
  AdExportSegmentPayload,
  AdExportSegmentResult,
  AdExportSourceType,
  AdFrequencyRow,
  AdMediaResult,
  AdMetadataTemplate,
  AdMetricAggregationMethod,
  AdMetricCalculationObject,
  AdMetricCondition,
  AdMetricFilterCondition,
  AdMetricConfig,
  AdMetricConditionSource,
  AdMetricDisplayFormat,
  AdMetricType,
  AdOutputIdType,
  AdOverlapCell,
  AdPathLink,
  AdPathNode,
  AdQueryFailureState,
  AdReferenceData,
  AdReportDetailRow,
  AdReportResult,
  AdReportType,
  AdTrendMetric,
} from '@/types/adAnalysis'

type DateRangeValue = [number, number]
type PageMode = 'home' | 'templates' | 'template-create' | 'detail' | 'ad-report'

interface MetricDraft {
  id?: string
  name: string
  description: string
  group: string
  metricType: AdMetricType
  formula: string
  conditions: AdMetricCondition[]
  displayFormat: AdMetricDisplayFormat
}

const route = useRoute()
const router = useRouter()
const message = useMessage()

const loading = ref(false)
const querying = ref(false)
const accessContext = ref<AdAccessContext | null>(null)
const accessDecision = ref<AdAccessDecision | null>(null)
const dataPrerequisites = ref<AdDataPrerequisiteStatus | null>(null)
const referenceData = reactive<AdReferenceData>({
  subjects: [],
  behaviorOptions: [],
  eventOptions: [],
  channels: [],
  advertisers: [],
  adGroups: [],
  adPlans: [],
  adCreatives: [],
})
const templates = ref<AdMetadataTemplate[]>([])
const reports = ref<AdAnalysisReport[]>([])
const auditLogs = ref<AdAuditLog[]>([])

const searchForm = reactive({
  keyword: '',
  reportType: 'all' as AdReportType | 'all',
  page: 1,
  pageSize: 8,
  total: 0,
})

const showReportModal = ref(false)
const reportForm = reactive<{
  id?: string
  name: string
  templateId: string
  reportType: AdReportType
  defaultTimeRange: DateRangeValue | null
}>({
  name: '',
  templateId: '',
  reportType: 'effect',
  defaultTimeRange: null,
})

const templateStep = ref(1)
const templateForm = reactive<{
  id?: string
  name: string
  subjectType: string
  description: string
  events: AdBehaviorEventConfig[]
  metrics: AdMetricConfig[]
}>({
  name: '',
  subjectType: 'user',
  description: '',
  events: [],
  metrics: [],
})

const showMetricModal = ref(false)
const showMetricDetailModal = ref(false)
const metricDraft = reactive<MetricDraft>({
  name: '',
  description: '',
  group: '',
  metricType: 'single',
  formula: 'A',
  conditions: [],
  displayFormat: 'integer',
})
const activeMetric = ref<AdMetricConfig | null>(null)
const metricDraftSnapshot = ref('')

const currentReport = ref<AdAnalysisReport | null>(null)
const currentTemplate = ref<AdMetadataTemplate | null>(null)
const effectResult = ref<AdEffectResult | null>(null)
const mediaResult = ref<AdMediaResult | null>(null)
const adReportResult = ref<AdReportResult | null>(null)
const queryError = ref('')
const queryFailure = ref<AdQueryFailureState | null>(null)

const defaultDateRange = (): DateRangeValue => [
  dayjs('2026-05-01').valueOf(),
  dayjs('2026-05-28').valueOf(),
]

const effectQuery = reactive({
  aggregateDimensions: ['channel'],
  channels: [] as string[],
  advertisers: [] as string[],
  adGroups: [] as string[],
  adPlans: [] as string[],
  adCreatives: [] as string[],
  dateRange: defaultDateRange(),
  crowdFilter: [] as AdAudienceFilter[],
  selectedMetricIds: [] as string[],
  funnelStat: 'users' as 'users' | 'times',
  selectedFunnelStageId: 'click',
})

const showMetricSelector = ref(false)
const metricSelectorValue = ref<string[]>([])
const metricSelectorKeyword = ref('')

const mediaQuery = reactive({
  channels: [] as string[],
  dateRange: defaultDateRange(),
  startEvent: 'click',
  endEvent: 'buycar',
  middleEvents: ['phone', 'test_drive'] as string[],
  crowdFilter: [] as AdAudienceFilter[],
  conversionSteps: 4,
  frequencyEvent: 'phone',
  overlapEvent: 'phone',
  overlapMode: 'users' as 'users' | 'percentage',
})

const selectedPathDescription = ref('')
const selectedPathLink = ref<AdPathLink | null>(null)
const selectedPathNode = ref<AdPathNode | null>(null)
const selectedOverlapDetail = ref<{
  rowChannelId: string
  columnChannelId: string
  rowChannelName: string
  columnChannelName: string
  users: number
  percentage: number
  eventName: string
  sampleUsers: Array<{ id: string, mobile: string, lastEvent: string, mediaPath: string }>
} | null>(null)

const adReportQuery = reactive({
  mediaChannels: [] as string[],
  advertisers: [] as string[],
  adGroups: [] as string[],
  adCreatives: [] as string[],
  dateRange: defaultDateRange(),
  metric: 'clicks' as AdTrendMetric,
})

const showExportModal = ref(false)
const exportResult = ref<AdExportSegmentResult | null>(null)
const exportForm = reactive<AdExportSegmentPayload>({
  reportId: '',
  sourceType: 'detail',
  sourceName: '',
  sourceConfig: {},
  outputIdType: '',
  segmentName: '',
  description: '',
  authTargets: [],
  groupIds: [],
  estimatedUsers: 0,
})

const pageMode = computed<PageMode>(() => {
  if (route.path.endsWith('/templates/new')) return 'template-create'
  if (route.path.endsWith('/templates')) return 'templates'
  if (route.path.endsWith('/ad-report')) return 'ad-report'
  if (route.params.reportId) return 'detail'
  return 'home'
})

const permissions = computed(() => accessContext.value?.permissions)
const canEnter = computed(() => accessDecision.value?.available ?? false)
const isAdReportAvailable = computed(() =>
  Boolean(accessContext.value?.vecdpPurchased && accessContext.value?.iadPurchased && permissions.value?.viewAdReport),
)
const runtimeFailure = computed(() => accessContext.value ? getAdQueryFailure(accessContext.value) : null)
const adReportGateFailure = computed(() => accessContext.value ? getAdReportGateFailure(accessContext.value) : null)
const visibleFailureStates = computed(() => {
  const states = [runtimeFailure.value, adReportGateFailure.value, queryFailure.value]
    .filter((state): state is AdQueryFailureState => Boolean(state))
  const seen = new Set<string>()
  return states.filter((state) => {
    if (seen.has(state.reason)) return false
    seen.add(state.reason)
    return true
  })
})

type ProjectConfigFlag =
  | 'vecdpPurchased'
  | 'iadPurchased'
  | 'dataSourceAvailable'
  | 'dataFusionReady'
  | 'idMappingReady'
  | 'monitoringDataReady'

const projectConfigOptions: Array<{ key: ProjectConfigFlag; label: string; hint: string }> = [
  { key: 'vecdpPurchased', label: 'veCDP 已采购', hint: '关闭后广告投放报表入口置灰' },
  { key: 'iadPurchased', label: 'iAD 已采购', hint: '关闭后广告投放报表入口置灰' },
  { key: 'dataSourceAvailable', label: '广告数据源可用', hint: '关闭后查询与下载返回数据源异常' },
  { key: 'dataFusionReady', label: '数据融合完成', hint: '关闭后模块进入数据接入未完成状态' },
  { key: 'idMappingReady', label: 'ID Mapping 完成', hint: '关闭后模块进入 ID Mapping 未完成状态' },
  { key: 'monitoringDataReady', label: '广告监测接入完成', hint: '关闭后模块进入监测数据未接入状态' },
]

const reportTypeOptions: SelectOption[] = [
  { label: '全部', value: 'all' },
  { label: '广告效果分析', value: 'effect' },
  { label: '媒体渠道分析', value: 'media_channel' },
]

const reportCreateTypeOptions: SelectOption[] = [
  { label: '广告效果分析', value: 'effect' },
  { label: '媒体渠道分析', value: 'media_channel' },
]

const aggregateDimensionOptions: SelectOption[] = [
  { label: '媒体渠道', value: 'channel' },
  { label: '广告主', value: 'advertiser' },
  { label: '广告组', value: 'ad_group' },
  { label: '广告计划', value: 'ad_plan' },
  { label: '广告创意', value: 'ad_creative' },
]

const outputIdOptions: SelectOption[] = [
  { label: '基准 ID', value: 'base_id' },
  { label: '手机号', value: 'mobile' },
  { label: '设备 ID', value: 'device_id' },
  { label: 'OneID', value: 'one_id' },
]

const authTargetOptions: SelectOption[] = [
  { label: '运营组', value: '运营组' },
  { label: '销售转化组', value: '销售转化组' },
  { label: '项目管理员', value: '项目管理员' },
]

const segmentGroupOptions: SelectOption[] = [
  { label: '广告投放人群', value: 'ad_segments' },
  { label: '高意向线索', value: 'high_intent' },
  { label: '复投实验', value: 'retargeting' },
]

const displayFormatOptions: SelectOption[] = [
  { label: '整数', value: 'integer' },
  { label: '小数', value: 'decimal' },
  { label: '百分比整数', value: 'percent_integer' },
  { label: '百分比小数', value: 'percent_decimal' },
]

const conditionSourceOptions: SelectOption[] = [
  { label: '媒体监测数据', value: 'media_monitor' },
  { label: '行为事件', value: 'behavior' },
  { label: '广告明细字段', value: 'detail' },
  { label: '标签', value: 'tag' },
  { label: '用户属性', value: 'property' },
]

const metricCalculationObjectOptions: SelectOption[] = [
  { label: '去重用户', value: 'user' },
  { label: '事件次数', value: 'event' },
  { label: '明细字段值', value: 'field' },
  { label: '标签命中用户', value: 'tag' },
  { label: '属性命中用户', value: 'property' },
]

const metricStatisticOptions: SelectOption[] = [
  { label: '人数', value: 'users' },
  { label: '次数', value: 'times' },
  { label: '求和', value: 'sum' },
  { label: '均值', value: 'avg' },
  { label: '最大值', value: 'max' },
  { label: '最小值', value: 'min' },
]

const metricIdTypeOptions: SelectOption[] = [
  { label: 'Base ID', value: 'base_id' },
  { label: '手机号', value: 'mobile' },
  { label: '设备 ID', value: 'device_id' },
  { label: 'One ID', value: 'one_id' },
]

const metricAggregationOptions: SelectOption[] = [
  { label: '不聚合', value: 'none' },
  { label: '去重计数', value: 'distinct_count' },
  { label: '求和', value: 'sum' },
  { label: '均值', value: 'avg' },
  { label: '最大值', value: 'max' },
  { label: '最小值', value: 'min' },
]

const metricFilterFieldOptions: SelectOption[] = [
  { label: '行为属性', value: 'behavior_property' },
  { label: '标签', value: 'tag' },
  { label: '用户属性', value: 'property' },
  { label: '明细字段', value: 'detail_field' },
]

const metricFilterOperatorOptions: SelectOption[] = [
  { label: '等于', value: 'eq' },
  { label: '不等于', value: 'neq' },
  { label: '包含任一', value: 'in' },
  { label: '不包含', value: 'not_in' },
  { label: '文本包含', value: 'contains' },
  { label: '大于', value: 'gt' },
  { label: '大于等于', value: 'gte' },
  { label: '小于', value: 'lt' },
  { label: '区间', value: 'between' },
]

const sourceFieldOptions: Record<AdMetricConditionSource, SelectOption[]> = {
  media_monitor: [
    { label: '展示次数 impressions', value: 'impressions' },
    { label: '点击次数 clicks', value: 'clicks' },
    { label: '广告消耗 cost', value: 'cost' },
  ],
  behavior: [
    { label: '事件发生用户', value: 'event_user' },
    { label: '事件发生次数', value: 'event_count' },
  ],
  detail: [
    { label: '总花费 cost', value: 'cost' },
    { label: '展示次数 impressions', value: 'impressions' },
    { label: '点击次数 clicks', value: 'clicks' },
    { label: '转化人数 conversions', value: 'conversion_users' },
  ],
  tag: [
    { label: '高意向标签 tag_high_intent', value: 'tag_high_intent' },
    { label: '新能源偏好 tag_new_energy', value: 'tag_new_energy' },
  ],
  property: [
    { label: '城市 city', value: 'city' },
    { label: '车型偏好 car_preference', value: 'car_preference' },
    { label: '会员等级 member_level', value: 'member_level' },
  ],
}

const trendMetricOptions: SelectOption[] = [
  { label: '展示数', value: 'impressions' },
  { label: '点击数', value: 'clicks' },
  { label: '总花费', value: 'cost' },
  { label: '点击率', value: 'ctr' },
  { label: '平均点击价格', value: 'avgCpc' },
]

const conversionStepOptions: SelectOption[] = [2, 3, 4, 5].map((value) => ({
  label: `${value} 步`,
  value,
}))

const channelOptions = computed<SelectOption[]>(() =>
  referenceData.channels.map((channel) => ({ label: channel.name, value: channel.id })),
)

const advertiserOptions = computed<SelectOption[]>(() =>
  referenceData.advertisers
    .filter((advertiser) =>
      effectQuery.channels.length === 0 || effectQuery.channels.includes(advertiser.channelId ?? ''),
    )
    .map((advertiser) => ({ label: advertiser.name, value: advertiser.id })),
)

const adReportAdvertiserOptions = computed<SelectOption[]>(() =>
  referenceData.advertisers
    .filter((advertiser) =>
      adReportQuery.mediaChannels.length === 0 || adReportQuery.mediaChannels.includes(advertiser.channelId ?? ''),
    )
    .map((advertiser) => ({ label: advertiser.name, value: advertiser.id })),
)

const adGroupOptions = computed<SelectOption[]>(() =>
  referenceData.adGroups
    .filter((group) => effectQuery.advertisers.length === 0 || effectQuery.advertisers.includes(group.advertiserId ?? ''))
    .map((group) => ({ label: group.name, value: group.id })),
)

const adPlanOptions = computed<SelectOption[]>(() =>
  referenceData.adPlans
    .filter((plan) => effectQuery.adGroups.length === 0 || effectQuery.adGroups.includes(plan.adGroupId ?? ''))
    .map((plan) => ({ label: plan.name, value: plan.id })),
)

const adCreativeOptions = computed<SelectOption[]>(() =>
  referenceData.adCreatives
    .filter((creative) => effectQuery.adPlans.length === 0 || effectQuery.adPlans.includes(creative.adPlanId ?? ''))
    .map((creative) => ({ label: creative.name, value: creative.id })),
)

const adReportGroupOptions = computed<SelectOption[]>(() =>
  referenceData.adGroups
    .filter((group) => adReportQuery.advertisers.length === 0 || adReportQuery.advertisers.includes(group.advertiserId ?? ''))
    .map((group) => ({ label: group.name, value: group.id })),
)

const adReportCreativeOptions = computed<SelectOption[]>(() =>
  referenceData.adCreatives
    .filter((creative) => adReportQuery.adGroups.length === 0 || adReportQuery.adGroups.includes(creative.adGroupId ?? ''))
    .map((creative) => ({ label: creative.name, value: creative.id })),
)

const enabledTemplateOptions = computed<SelectOption[]>(() =>
  templates.value
    .filter((template) => template.status === 'enabled')
    .map((template) => ({ label: template.name, value: template.id })),
)

const metricGroupOptions = computed<SelectOption[]>(() => {
  const groups = new Set(['系统自动生成', '广告效果', '链路转化', '自定义指标'])
  templateForm.metrics.forEach((metric) => {
    if (metric.group) groups.add(metric.group)
  })
  return Array.from(groups).map((group) => ({ label: group, value: group }))
})

const eventOptionsForTemplate = computed<SelectOption[]>(() =>
  referenceData.eventOptions
    .filter((event) => event.subjectType === templateForm.subjectType || event.subjectType === 'user')
    .map((event) => ({ label: event.label, value: event.value })),
)

const reportEventOptions = computed<SelectOption[]>(() =>
  (currentTemplate.value?.behaviorEventConfig ?? []).map((event) => ({
    label: `${event.displayName} ${event.eventName}`,
    value: event.eventName,
  })),
)

const userMetricOptions = computed<SelectOption[]>(() =>
  (currentTemplate.value?.metricConfig ?? []).map((metric) => ({
    label: `${metric.name}${metric.creatorType === 'system' ? '（系统）' : ''}`,
    value: metric.id,
  })),
)

const filteredUserMetricOptions = computed<SelectOption[]>(() => {
  const keyword = metricSelectorKeyword.value.trim().toLowerCase()
  if (!keyword) return userMetricOptions.value
  return userMetricOptions.value.filter((option) => String(option.label ?? '').toLowerCase().includes(keyword))
})

const currentReportTypeLabel = computed(() =>
  currentReport.value?.reportType === 'media_channel' ? '媒体渠道分析' : '广告效果分析',
)

const reportModalTitle = computed(() => reportForm.id ? '编辑报告' : '新建报告')

const isTemplateInvalid = computed(() =>
  Boolean(currentReport.value && (!currentTemplate.value || currentTemplate.value.status !== 'enabled')),
)

function icon(iconComponent: unknown) {
  return () => h(NIcon, null, { default: () => h(iconComponent as never) })
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('zh-CN').format(Math.round(value))
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return '--'
  return `${(value * 100).toFixed(2)}%`
}

function formatMoney(value: number) {
  return `¥${new Intl.NumberFormat('zh-CN').format(Math.round(value))}`
}

function formatMetricValue(value: number, displayFormat: AdMetricDisplayFormat) {
  if (!Number.isFinite(value)) return '--'
  if (displayFormat === 'integer') return formatNumber(value)
  if (displayFormat === 'decimal') return value.toFixed(2)
  if (displayFormat === 'percent_integer') return `${Math.round(value * 100)}%`
  return `${(value * 100).toFixed(2)}%`
}

function toDateRange(value: DateRangeValue): { start: string, end: string } {
  return {
    start: dayjs(value[0]).format('YYYY-MM-DD'),
    end: dayjs(value[1]).format('YYYY-MM-DD'),
  }
}

function parseDateRange(range?: [string, string]): DateRangeValue {
  if (!range) return defaultDateRange()
  return [dayjs(range[0]).valueOf(), dayjs(range[1]).valueOf()]
}

function reportTypeLabel(type: AdReportType) {
  return type === 'effect' ? '广告效果分析' : '媒体渠道分析'
}

function normalizeReportType(value: unknown): AdReportType | 'all' {
  return value === 'effect' || value === 'media_channel' || value === 'all' ? value : 'all'
}

function applyReportListQueryFromRoute() {
  searchForm.keyword = typeof route.query.adKeyword === 'string' ? route.query.adKeyword : ''
  searchForm.reportType = normalizeReportType(route.query.adReportType)
  const page = Number(route.query.adPage)
  searchForm.page = Number.isFinite(page) && page > 0 ? page : 1
}

function reportListQueryParams() {
  const query: Record<string, string> = {
    adReportType: searchForm.reportType,
    adPage: String(searchForm.page),
  }
  if (searchForm.keyword.trim()) query.adKeyword = searchForm.keyword.trim()
  return query
}

function syncReportListQueryToRoute() {
  if (pageMode.value !== 'home') return
  router.replace({ path: '/data-insight/ad-analysis', query: reportListQueryParams() })
}

function openReportDetail(reportId: string) {
  router.push({ path: `/data-insight/ad-analysis/reports/${reportId}`, query: reportListQueryParams() })
}

function returnToReportList() {
  router.push({ path: '/data-insight/ad-analysis', query: reportListQueryParams() })
}

function templateStatusType(status: AdMetadataTemplate['status']) {
  if (status === 'enabled') return 'success'
  if (status === 'disabled') return 'warning'
  return 'error'
}

function templateStatusLabel(status: AdMetadataTemplate['status']) {
  if (status === 'enabled') return '启用'
  if (status === 'disabled') return '禁用'
  return '已删除'
}

async function loadFoundation() {
  loading.value = true
  try {
    const [context, prerequisites] = await Promise.all([
      adAnalysisService.getAccessContext(),
      adAnalysisService.getDataPrerequisites(),
    ])
    const decision = await adAnalysisService.getAccessDecision()
    accessContext.value = context
    accessDecision.value = decision
    dataPrerequisites.value = prerequisites
    if (!decision.available) {
      Object.assign(referenceData, {
        subjects: [],
        behaviorOptions: [],
        eventOptions: [],
        channels: [],
        advertisers: [],
        adGroups: [],
        adPlans: [],
        adCreatives: [],
      })
      templates.value = []
      reports.value = []
      auditLogs.value = []
      return
    }
    const [references, templateList, logs] = await Promise.all([
      adAnalysisService.getReferenceData(),
      adAnalysisService.listTemplates(),
      adAnalysisService.listAuditLogs(),
    ])
    Object.assign(referenceData, references)
    templates.value = templateList
    auditLogs.value = logs
    applyReportListQueryFromRoute()
    await loadReports()
  } finally {
    loading.value = false
  }
}

function setQueryFailure(error: unknown, fallback = '查询失败，请稍后重试。') {
  const text = error instanceof Error ? error.message : fallback
  queryError.value = text
  queryFailure.value = failureFromMessage(text)
}

function projectConfigChecked(key: ProjectConfigFlag) {
  return Boolean(accessContext.value?.[key])
}

async function updateProjectConfigFlag(key: ProjectConfigFlag, checked: boolean) {
  try {
    await adAnalysisService.updateAccessContext({ [key]: checked } as AdAccessContextPatch)
    queryError.value = ''
    queryFailure.value = null
    effectResult.value = null
    mediaResult.value = null
    adReportResult.value = null
    await loadFoundation()
    await handleRouteChange()
    message.success('项目配置已更新，可直接验收对应状态。')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '项目配置更新失败。')
  }
}

async function loadReports() {
  const response = await adAnalysisService.searchReports({
    keyword: searchForm.keyword,
    reportType: searchForm.reportType,
    page: searchForm.page,
    pageSize: searchForm.pageSize,
  })
  reports.value = response.list
  searchForm.total = response.total
}

function handleReportPageChange(page: number) {
  searchForm.page = page
  syncReportListQueryToRoute()
  loadReports()
}

async function refreshAuditLogs() {
  auditLogs.value = await adAnalysisService.listAuditLogs()
}

async function loadReportDetail() {
  const reportId = String(route.params.reportId ?? '')
  if (!reportId) return
  loading.value = true
  queryError.value = ''
  queryFailure.value = null
  effectResult.value = null
  mediaResult.value = null
  selectedPathDescription.value = ''
  selectedPathLink.value = null
  selectedPathNode.value = null
  effectQuery.aggregateDimensions = ['channel']
  effectQuery.advertisers = []
  effectQuery.adGroups = []
  effectQuery.adPlans = []
  effectQuery.adCreatives = []
  effectQuery.crowdFilter = []
  effectQuery.funnelStat = 'users'
  effectQuery.selectedFunnelStageId = 'click'
  mediaQuery.crowdFilter = []
  mediaQuery.conversionSteps = 4
  mediaQuery.overlapMode = 'users'
  try {
    const report = await adAnalysisService.getReport(reportId)
    currentReport.value = report ?? null
    currentTemplate.value = report ? (await adAnalysisService.getTemplate(report.templateId)) ?? null : null

    if (report) {
      effectQuery.dateRange = parseDateRange(report.defaultTimeRange)
      mediaQuery.dateRange = parseDateRange(report.defaultTimeRange)
      effectQuery.channels = [...report.channelIds]
      mediaQuery.channels = [...report.channelIds]
      effectQuery.selectedMetricIds = currentTemplate.value?.metricConfig.map((metric) => metric.id) ?? []
      metricSelectorValue.value = [...effectQuery.selectedMetricIds]
      const events = currentTemplate.value?.behaviorEventConfig ?? []
      mediaQuery.startEvent = events[1]?.eventName ?? events[0]?.eventName ?? 'click'
      mediaQuery.endEvent = events.at(-1)?.eventName ?? 'buycar'
      mediaQuery.middleEvents = events.slice(2, -1).map((event) => event.eventName)
      mediaQuery.frequencyEvent = events[2]?.eventName ?? mediaQuery.endEvent
      mediaQuery.overlapEvent = events[2]?.eventName ?? mediaQuery.endEvent
    }
  } finally {
    loading.value = false
  }
}

async function loadTemplateForRoute() {
  const templateId = String(route.query.templateId ?? '')
  if (!templateId) {
    resetTemplateForm()
    return
  }
  const template = await adAnalysisService.getTemplate(templateId)
  if (!template) {
    resetTemplateForm()
    return
  }
  templateForm.id = template.id
  templateForm.name = template.name
  templateForm.subjectType = template.subjectType
  templateForm.description = template.description
  templateForm.events = template.behaviorEventConfig.map((event) => ({ ...event }))
  templateForm.metrics = template.metricConfig.map((metric) => ({ ...metric, conditions: metric.conditions.map((condition) => ({ ...condition, filters: [...condition.filters] })) }))
  templateStep.value = 1
}

async function handleRouteChange() {
  if (pageMode.value === 'home') {
    applyReportListQueryFromRoute()
    await loadReports()
  }
  if (pageMode.value === 'detail') await loadReportDetail()
  if (pageMode.value === 'template-create') await loadTemplateForRoute()
  if (pageMode.value === 'templates') {
    templates.value = await adAnalysisService.listTemplates()
  }
  if (pageMode.value === 'ad-report') {
    adReportResult.value = null
    queryError.value = ''
    queryFailure.value = null
  }
}

function openCreateReport() {
  if (!permissions.value?.manageReport) {
    message.warning('暂无广告投放分析增删改权限，请联系项目管理员开通。')
    return
  }
  reportForm.id = undefined
  reportForm.name = ''
  reportForm.templateId = enabledTemplateOptions.value[0]?.value as string ?? ''
  reportForm.reportType = 'effect'
  reportForm.defaultTimeRange = defaultDateRange()
  showReportModal.value = true
}

function openEditReport(report: AdAnalysisReport) {
  if (!permissions.value?.manageReport) {
    message.warning('暂无广告投放分析增删改权限，请联系项目管理员开通。')
    return
  }
  reportForm.id = report.id
  reportForm.name = report.name
  reportForm.templateId = report.templateId
  reportForm.reportType = report.reportType
  reportForm.defaultTimeRange = parseDateRange(report.defaultTimeRange)
  showReportModal.value = true
}

async function saveReport() {
  try {
    const report = await adAnalysisService.saveReport({
      id: reportForm.id,
      name: reportForm.name,
      templateId: reportForm.templateId,
      reportType: reportForm.reportType,
      defaultTimeRange: reportForm.defaultTimeRange ? [dayjs(reportForm.defaultTimeRange[0]).format('YYYY-MM-DD'), dayjs(reportForm.defaultTimeRange[1]).format('YYYY-MM-DD')] : undefined,
    })
    showReportModal.value = false
    message.success(reportForm.id ? '报告编辑成功。' : '报告创建成功。')
    await loadReports()
    await refreshAuditLogs()
    if (!reportForm.id) {
      await router.push(`/data-insight/ad-analysis/reports/${report.id}`)
    }
  } catch (error) {
    message.error(error instanceof Error ? error.message : '保存报告失败。')
  }
}

async function deleteReport(report: AdAnalysisReport) {
  if (!permissions.value?.manageReport) {
    message.warning('暂无广告投放分析增删改权限，请联系项目管理员开通。')
    return
  }
  if (!window.confirm('删除后，该广告投放分析报告将无法恢复，是否确认删除？')) return
  await adAnalysisService.deleteReport(report.id)
  message.success('报告已删除。')
  await loadReports()
  await refreshAuditLogs()
}

function resetTemplateForm() {
  templateForm.id = undefined
  templateForm.name = ''
  templateForm.subjectType = 'user'
  templateForm.description = ''
  templateForm.events = [
    {
      id: '',
      templateId: 'draft',
      adBehavior: 'click',
      eventName: 'click',
      displayName: '点击',
      orderIndex: 1,
    },
  ]
  templateForm.metrics = []
  templateStep.value = 1
}

function handleSubjectChange(value: string) {
  const hasConfiguredEvent = templateForm.events.some((event) => event.adBehavior || event.eventName || event.displayName)
  if (hasConfiguredEvent && templateForm.subjectType !== value) {
    const confirmed = window.confirm('切换主体将清空已配置的广告行为事件，是否继续？')
    if (!confirmed) return
    templateForm.events = []
    templateForm.metrics = []
  }
  templateForm.subjectType = value
}

function addBehaviorEvent() {
  templateForm.events.push({
    id: '',
    templateId: templateForm.id ?? 'draft',
    adBehavior: '',
    eventName: '',
    displayName: '',
    orderIndex: templateForm.events.length + 1,
  })
}

function handleBehaviorChange(row: AdBehaviorEventConfig, value: AdBehaviorSemantic) {
  row.adBehavior = value
  const behavior = referenceData.behaviorOptions.find((option) => option.value === value)
  if (behavior) {
    row.eventName = behavior.defaultEventName
    row.displayName = behavior.label
  }
}

function removeBehaviorEvent(index: number) {
  const row = templateForm.events[index]
  if (!row) return
  const isEmpty = !row.adBehavior && !row.eventName && !row.displayName
  if (!isEmpty && !window.confirm('删除后该广告行为事件不会参与指标生成和报告分析，是否继续？')) return
  templateForm.events.splice(index, 1)
  templateForm.events.forEach((event, eventIndex) => {
    event.orderIndex = eventIndex + 1
  })
}

function validateTemplateStepOne() {
  if (!templateForm.name.trim()) return '请输入模板名称。'
  if (templateForm.name.trim().length > 100) return '模板名称最多 100 字。'
  if (!templateForm.subjectType) return '请选择主体。'
  if (templateForm.events.length === 0) return '至少配置 1 个广告行为事件。'

  const behaviorEvents = new Set<string>()
  const displayNames = new Set<string>()
  const orders = new Set<number>()
  for (const event of templateForm.events) {
    if (!event.adBehavior || !event.eventName || !event.displayName.trim() || !event.orderIndex) {
      return '每个广告行为事件配置必须完整。'
    }
    const behaviorEventKey = `${event.adBehavior}:${event.eventName}`
    if (behaviorEvents.has(behaviorEventKey)) return '行为事件不能重复配置为同一广告行为。'
    if (displayNames.has(event.displayName.trim())) return '展示名称不能重复。'
    if (orders.has(event.orderIndex)) return '顺序不能重复。'
    behaviorEvents.add(behaviorEventKey)
    displayNames.add(event.displayName.trim())
    orders.add(event.orderIndex)
  }
  return ''
}

async function goMetricStep() {
  const validationMessage = validateTemplateStepOne()
  if (validationMessage) {
    message.warning(validationMessage)
    return
  }
  const draftMetrics = await adAnalysisService.generateSystemMetrics(templateForm.id ?? 'draft', templateForm.events)
  if (templateForm.metrics.length === 0) {
    templateForm.metrics = draftMetrics
  } else {
    const userMetrics = templateForm.metrics.filter((metric) => metric.creatorType === 'user')
    templateForm.metrics = [...draftMetrics, ...userMetrics]
  }
  templateStep.value = 2
}

function resetMetricDraft() {
  metricDraft.id = undefined
  metricDraft.name = ''
  metricDraft.description = ''
  metricDraft.group = '自定义指标'
  metricDraft.metricType = 'single'
  metricDraft.formula = 'A'
  metricDraft.conditions = []
  metricDraft.displayFormat = 'integer'
}

function serializeMetricDraft() {
  return JSON.stringify({
    id: metricDraft.id,
    name: metricDraft.name,
    description: metricDraft.description,
    group: metricDraft.group,
    metricType: metricDraft.metricType,
    formula: metricDraft.formula,
    conditions: metricDraft.conditions,
    displayFormat: metricDraft.displayFormat,
  })
}

function closeMetricModalSilently() {
  metricDraftSnapshot.value = serializeMetricDraft()
  showMetricModal.value = false
}

function requestCloseMetricModal() {
  if (serializeMetricDraft() !== metricDraftSnapshot.value) {
    const confirmed = window.confirm('当前指标配置尚未保存，是否确认关闭？')
    if (!confirmed) return
  }
  closeMetricModalSilently()
}

function handleMetricModalUpdate(nextShow: boolean) {
  if (nextShow) {
    showMetricModal.value = true
    return
  }
  requestCloseMetricModal()
}

function openCreateMetric() {
  resetMetricDraft()
  addMetricCondition('behavior')
  metricDraftSnapshot.value = serializeMetricDraft()
  showMetricModal.value = true
}

function nextMetricVariable() {
  return String.fromCharCode(65 + metricDraft.conditions.length)
}

function addMetricCondition(source: AdMetricConditionSource) {
  const variable = nextMetricVariable()
  const calculationObjectMap: Record<AdMetricConditionSource, AdMetricCalculationObject> = {
    media_monitor: 'event',
    behavior: 'user',
    detail: 'field',
    tag: 'tag',
    property: 'property',
  }
  const statisticMap: Record<AdMetricConditionSource, AdMetricCondition['statistic']> = {
    media_monitor: 'times',
    behavior: 'users',
    detail: 'sum',
    tag: 'users',
    property: 'users',
  }
  const aggregationMap: Record<AdMetricConditionSource, AdMetricAggregationMethod> = {
    media_monitor: 'sum',
    behavior: 'distinct_count',
    detail: 'sum',
    tag: 'distinct_count',
    property: 'distinct_count',
  }
  metricDraft.conditions.push({
    variable,
    source,
    calculationObject: calculationObjectMap[source],
    eventName: source === 'behavior' || source === 'media_monitor' ? (templateForm.events[0]?.eventName ?? 'click') : undefined,
    fieldName: sourceFieldOptions[source][0]?.value as string | undefined,
    fieldDisplayName: sourceFieldOptions[source][0]?.label as string | undefined,
    idType: 'base_id',
    statistic: statisticMap[source],
    aggregationMethod: aggregationMap[source],
    filters: [],
  })
  metricDraft.formula = metricDraft.metricType === 'single'
    ? metricDraft.conditions[0]?.variable ?? 'A'
    : metricDraft.conditions.map((condition) => condition.variable).join(' + ')
}

function handleMetricSourceChange(condition: AdMetricCondition, source: AdMetricConditionSource) {
  condition.source = source
  const calculationObjectMap: Record<AdMetricConditionSource, AdMetricCalculationObject> = {
    media_monitor: 'event',
    behavior: 'user',
    detail: 'field',
    tag: 'tag',
    property: 'property',
  }
  condition.calculationObject = calculationObjectMap[source]
  condition.eventName = source === 'behavior' || source === 'media_monitor' ? (templateForm.events[0]?.eventName ?? 'click') : undefined
  condition.fieldName = sourceFieldOptions[source][0]?.value as string | undefined
  condition.fieldDisplayName = sourceFieldOptions[source][0]?.label as string | undefined
  condition.statistic = source === 'detail' ? 'sum' : source === 'media_monitor' ? 'times' : 'users'
  condition.aggregationMethod = condition.statistic === 'users'
    ? 'distinct_count'
    : condition.statistic === 'times'
      ? 'sum'
      : condition.statistic
}

function handleMetricFieldChange(condition: AdMetricCondition, value: string) {
  condition.fieldName = value
  condition.fieldDisplayName = sourceFieldOptions[condition.source].find((option) => option.value === value)?.label as string | undefined
}

function addMetricFilter(condition: AdMetricCondition) {
  const filter: AdMetricFilterCondition = {
    id: `flt_${Date.now()}_${condition.filters.length}`,
    fieldType: 'behavior_property',
    fieldName: '',
    operator: 'eq',
    value: '',
  }
  condition.filters.push(filter)
}

function removeMetricFilter(condition: AdMetricCondition, filterIndex: number) {
  condition.filters.splice(filterIndex, 1)
}

function removeMetricCondition(index: number) {
  metricDraft.conditions.splice(index, 1)
  metricDraft.conditions.forEach((condition, conditionIndex) => {
    condition.variable = String.fromCharCode(65 + conditionIndex)
  })
}

async function confirmMetric() {
  const duplicated = templateForm.metrics.some((metric) => metric.name.trim() === metricDraft.name.trim() && metric.id !== metricDraft.id)
  if (!metricDraft.name.trim()) {
    message.warning('请输入指标名称。')
    return
  }
  if (metricDraft.name.trim().length > 100) {
    message.warning('指标名称最多 100 字。')
    return
  }
  if (metricDraft.description.length > 500) {
    message.warning('描述最多 500 字。')
    return
  }
  if (duplicated) {
    message.warning('同一模板下指标名称不允许重复。')
    return
  }
  if (metricDraft.conditions.length === 0) {
    message.warning('请至少添加一个计算条件。')
    return
  }
  const invalidCondition = metricDraft.conditions.find((condition) =>
    !condition.calculationObject ||
    !condition.statistic ||
    !condition.idType ||
    !condition.aggregationMethod ||
    (!condition.eventName && !condition.fieldName),
  )
  if (invalidCondition) {
    message.warning(`请完整配置计算条件 ${invalidCondition.variable} 的计算对象、统计口径、ID 类型和聚合方式。`)
    return
  }
  const invalidFilter = metricDraft.conditions
    .flatMap((condition) => condition.filters.map((filter) => ({ condition, filter })))
    .find(({ filter }) => !filter.fieldType || !filter.fieldName.trim() || !filter.operator || !filter.value.trim())
  if (invalidFilter) {
    message.warning(`请完整配置计算条件 ${invalidFilter.condition.variable} 的筛选条件。`)
    return
  }
  const validation = await adAnalysisService.validateFormula(
    metricDraft.formula,
    metricDraft.conditions.map((condition) => condition.variable),
  )
  if (!validation.valid) {
    message.warning(validation.message ?? '计算公式不合法。')
    return
  }

  const metric: AdMetricConfig = {
    id: metricDraft.id ?? `metric_user_${Date.now()}`,
    templateId: templateForm.id ?? 'draft',
    name: metricDraft.name.trim(),
    description: metricDraft.description.trim(),
    group: metricDraft.group || '自定义指标',
    metricType: metricDraft.metricType,
    formula: metricDraft.formula.trim(),
    conditions: metricDraft.conditions.map((condition) => ({ ...condition, filters: condition.filters.map((filter) => ({ ...filter })) })),
    displayFormat: metricDraft.displayFormat,
    creatorId: accessContext.value?.userId ?? 'current_user',
    creatorName: accessContext.value?.userName ?? '当前用户',
    creatorType: 'user',
    isRemovable: true,
  }

  templateForm.metrics.push(metric)
  try {
    await adAnalysisService.recordMetricCreated(metric, templateForm.id ?? 'draft')
    await refreshAuditLogs()
  } catch (error) {
    message.warning(error instanceof Error ? error.message : '指标审计记录写入失败。')
  }
  closeMetricModalSilently()
  message.success('指标已加入列表，保存模板后持久化。')
}

function viewMetric(metric: AdMetricConfig) {
  activeMetric.value = metric
  showMetricDetailModal.value = true
}

async function removeMetric(metric: AdMetricConfig) {
  if (!metric.isRemovable) {
    message.warning('系统自动生成指标不可移除。')
    return
  }
  if (!window.confirm('移除后该指标不会出现在基于该模板创建的报告中，是否继续？')) return
  templateForm.metrics = templateForm.metrics.filter((item) => item.id !== metric.id)
  try {
    await adAnalysisService.recordMetricRemoved(metric, templateForm.id ?? 'draft')
    await refreshAuditLogs()
  } catch (error) {
    message.warning(error instanceof Error ? error.message : '指标审计记录写入失败。')
  }
}

async function saveTemplate() {
  if (!permissions.value?.manageTemplate) {
    message.warning('暂无广告元数据模板管理权限。')
    return
  }
  try {
    const payload = {
      id: templateForm.id,
      name: templateForm.name,
      subjectType: templateForm.subjectType,
      description: templateForm.description,
      behaviorEventConfig: templateForm.events,
      metricConfig: templateForm.metrics,
    }
    if (templateForm.id) {
      await adAnalysisService.updateTemplate(payload)
    } else {
      await adAnalysisService.createTemplate(payload)
    }
    message.success('广告元数据模板保存成功。')
    templates.value = await adAnalysisService.listTemplates()
    await refreshAuditLogs()
    await router.push('/data-insight/ad-analysis/templates')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '保存模板失败。')
  }
}

function editTemplate(template: AdMetadataTemplate) {
  if (!permissions.value?.manageTemplate) {
    message.warning('暂无广告元数据模板管理权限。')
    return
  }
  router.push(`/data-insight/ad-analysis/templates/new?templateId=${template.id}`)
}

async function deleteTemplate(template: AdMetadataTemplate) {
  if (!permissions.value?.manageTemplate) {
    message.warning('暂无广告元数据模板管理权限。')
    return
  }
  if (!window.confirm('删除后模板不可恢复，已生成历史报告保留快照，是否继续？')) return
  await adAnalysisService.deleteTemplate(template.id)
  message.success('模板已删除。')
  templates.value = await adAnalysisService.listTemplates()
  await refreshAuditLogs()
}

function addAudienceFilter(target: 'effect' | 'media', type: AdAudienceFilter['type']) {
  const filter: AdAudienceFilter = {
    id: `filter_${Date.now()}`,
    type,
    name: type === 'tag' ? '高意向标签' : type === 'behavior' ? '近 7 日点击' : '核心城市人群包',
    operator: 'include',
  }
  if (target === 'effect') {
    effectQuery.crowdFilter.push(filter)
  } else {
    mediaQuery.crowdFilter.push(filter)
  }
}

function removeAudienceFilter(target: 'effect' | 'media', id: string) {
  if (target === 'effect') {
    effectQuery.crowdFilter = effectQuery.crowdFilter.filter((filter) => filter.id !== id)
  } else {
    mediaQuery.crowdFilter = mediaQuery.crowdFilter.filter((filter) => filter.id !== id)
  }
}

async function runEffectQuery() {
  if (!currentReport.value) return
  querying.value = true
  queryError.value = ''
  queryFailure.value = null
  try {
    effectResult.value = await adAnalysisService.queryEffect({
      reportId: currentReport.value.id,
      aggregateDimensions: effectQuery.aggregateDimensions,
      channels: effectQuery.channels,
      advertisers: effectQuery.advertisers,
      adGroups: effectQuery.adGroups,
      adPlans: effectQuery.adPlans,
      adCreatives: effectQuery.adCreatives,
      timeRange: toDateRange(effectQuery.dateRange),
      crowdFilter: effectQuery.crowdFilter,
      selectedMetricIds: effectQuery.selectedMetricIds,
    })
    effectQuery.selectedFunnelStageId = effectResult.value.funnel[1]?.id ?? effectResult.value.funnel[0]?.id ?? ''
    await refreshAuditLogs()
  } catch (error) {
    setQueryFailure(error)
  } finally {
    querying.value = false
  }
}

function resetEffectQuery() {
  effectQuery.aggregateDimensions = ['channel']
  effectQuery.channels = []
  effectQuery.advertisers = []
  effectQuery.adGroups = []
  effectQuery.adPlans = []
  effectQuery.adCreatives = []
  effectQuery.crowdFilter = []
  effectQuery.dateRange = defaultDateRange()
  effectResult.value = null
  queryError.value = ''
  queryFailure.value = null
}

function openMetricSelector() {
  metricSelectorValue.value = [...effectQuery.selectedMetricIds]
  metricSelectorKeyword.value = ''
  showMetricSelector.value = true
}

function applyMetricSelector() {
  effectQuery.selectedMetricIds = [...metricSelectorValue.value]
  showMetricSelector.value = false
}

async function runMediaQuery() {
  if (!currentReport.value) return
  querying.value = true
  queryError.value = ''
  queryFailure.value = null
  try {
    mediaResult.value = await adAnalysisService.queryMedia({
      reportId: currentReport.value.id,
      channels: mediaQuery.channels,
      timeRange: toDateRange(mediaQuery.dateRange),
      startEvent: mediaQuery.startEvent,
      endEvent: mediaQuery.endEvent,
      middleEvents: mediaQuery.middleEvents.filter(Boolean),
      crowdFilter: mediaQuery.crowdFilter,
      conversionSteps: mediaQuery.conversionSteps,
      frequencyEvent: mediaQuery.frequencyEvent,
      overlapEvent: mediaQuery.overlapEvent,
    })
    selectedPathDescription.value = mediaResult.value.path.links[0]?.description ?? ''
    selectedPathLink.value = mediaResult.value.path.links[0] ?? null
    selectedPathNode.value = null
    selectedOverlapDetail.value = null
    await refreshAuditLogs()
  } catch (error) {
    setQueryFailure(error)
  } finally {
    querying.value = false
  }
}

function resetMediaQuery() {
  mediaQuery.channels = []
  mediaQuery.dateRange = defaultDateRange()
  mediaQuery.startEvent = ''
  mediaQuery.endEvent = ''
  mediaQuery.middleEvents = []
  mediaQuery.crowdFilter = []
  mediaResult.value = null
  selectedPathDescription.value = ''
  selectedPathLink.value = null
  selectedPathNode.value = null
  selectedOverlapDetail.value = null
  queryError.value = ''
  queryFailure.value = null
}

async function refreshMediaDerivedAnalysis() {
  if (!mediaResult.value || !currentReport.value) return
  await runMediaQuery()
}

function addMiddleEvent() {
  mediaQuery.middleEvents.push('')
}

function removeMiddleEvent(index: number) {
  mediaQuery.middleEvents.splice(index, 1)
}

async function runAdReportQuery() {
  querying.value = true
  queryError.value = ''
  queryFailure.value = null
  try {
    adReportResult.value = await adAnalysisService.queryAdReport({
      mediaChannels: adReportQuery.mediaChannels,
      advertisers: adReportQuery.advertisers,
      adGroups: adReportQuery.adGroups,
      adCreatives: adReportQuery.adCreatives,
      timeRange: toDateRange(adReportQuery.dateRange),
      metric: adReportQuery.metric,
    })
    await refreshAuditLogs()
  } catch (error) {
    setQueryFailure(error)
  } finally {
    querying.value = false
  }
}

function resetAdReportQuery() {
  adReportQuery.mediaChannels = []
  adReportQuery.advertisers = []
  adReportQuery.adGroups = []
  adReportQuery.adCreatives = []
  adReportQuery.dateRange = defaultDateRange()
  adReportResult.value = null
  queryError.value = ''
  queryFailure.value = null
}

function openExportSegment(
  sourceType: AdExportSourceType,
  sourceName: string,
  estimatedUsers: number,
  sourceConfig: Record<string, unknown>,
  reportId = currentReport.value?.id,
) {
  if (!permissions.value?.createSegment) {
    message.warning('暂无分群创建权限，请联系项目管理员开通。')
    return
  }
  exportForm.reportId = reportId
  exportForm.sourceType = sourceType
  exportForm.sourceName = sourceName
  exportForm.sourceConfig = sourceConfig
  exportForm.outputIdType = 'base_id'
  exportForm.segmentName = `${sourceName}人群`
  exportForm.description = ''
  exportForm.authTargets = []
  exportForm.groupIds = ['ad_segments']
  exportForm.estimatedUsers = estimatedUsers
  exportResult.value = null
  showExportModal.value = true
}

function validateExportForm() {
  const validOutputIds = outputIdOptions.map((option) => option.value)
  const validAuthTargets = authTargetOptions.map((option) => option.value)
  const validGroupIds = segmentGroupOptions.map((option) => option.value)
  if (!validOutputIds.includes(exportForm.outputIdType)) return '请选择合法的输出 ID 类型。'
  if (exportForm.groupIds.length === 0) return '请至少选择一个用户分群分组。'
  if (exportForm.groupIds.some((groupId) => !validGroupIds.includes(groupId))) return '分群分组不合法，请重新选择。'
  if (exportForm.authTargets.some((target) => !validAuthTargets.includes(target))) return '授权对象不合法，请重新选择。'
  return ''
}

async function saveExportSegment() {
  try {
    const validationMessage = validateExportForm()
    if (validationMessage) {
      message.warning(validationMessage)
      return
    }
    const result = await adAnalysisService.exportSegment(exportForm)
    exportResult.value = result
    message.success(`分群导出成功，可前往用户分群模块查看：${result.segmentName}`)
    await refreshAuditLogs()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '导出分群失败。')
  }
}

function goSegmentDetail() {
  const segmentId = exportResult.value?.segmentId
  if (!segmentId) return
  showExportModal.value = false
  router.push(`/user-insight/segments/${segmentId}`)
}

function missingPrerequisiteLabel(item: string) {
  const labels: Record<string, string> = {
    data_fusion: '数据融合未完成',
    id_mapping: 'ID Mapping 未完成',
    monitoring_data: '广告监测数据未接入',
  }
  return labels[item] ?? item
}

function auditValue(value?: string) {
  return value || '-'
}

function compactAuditConfig(config: Record<string, unknown>) {
  const entries = Object.entries(config ?? {}).filter(([, value]) => value !== undefined && value !== '')
  if (entries.length === 0) return '-'
  const text = entries
    .slice(0, 4)
    .map(([key, value]) => {
      if (Array.isArray(value)) return `${key}: ${value.join(',') || '-'}`
      if (typeof value === 'object' && value !== null) return `${key}: ${JSON.stringify(value)}`
      return `${key}: ${String(value)}`
    })
    .join('；')
  return text.length > 140 ? `${text.slice(0, 140)}...` : text
}

async function downloadExcel(source: string, rows: Array<Record<string, unknown>>, config: Record<string, unknown>, reportId?: string) {
  if (rows.length === 0) {
    const noDataMessage = '当前条件下暂无广告数据，请调整筛选条件或确认数据是否已接入。'
    queryFailure.value = failureFromMessage(noDataMessage)
    message.warning(noDataMessage)
    return
  }
  try {
    const result = await adAnalysisService.createDownloadTask({
      source,
      reportId,
      sourceConfig: config,
      rows,
    })
    const link = document.createElement('a')
    link.href = result.fileUrl
    link.download = result.fileName
    link.click()
    await refreshAuditLogs()
    queryFailure.value = null
    message.success(`下载任务已生成，文件包含 ${formatNumber(result.rowCount)} 行。`)
  } catch (error) {
    setQueryFailure(error, '下载失败。')
    message.error(error instanceof Error ? error.message : '下载失败。')
  }
}

function effectDownloadConfig(extra: Record<string, unknown> = {}) {
  return {
    report_id: currentReport.value?.id,
    aggregate_dimensions: effectQuery.aggregateDimensions,
    channels: effectQuery.channels,
    advertisers: effectQuery.advertisers,
    ad_groups: effectQuery.adGroups,
    ad_plans: effectQuery.adPlans,
    ad_creatives: effectQuery.adCreatives,
    time_range: toDateRange(effectQuery.dateRange),
    crowd_filter: effectQuery.crowdFilter,
    selected_metrics: effectQuery.selectedMetricIds,
    ...extra,
  }
}

function mediaDownloadConfig(extra: Record<string, unknown> = {}) {
  return {
    report_id: currentReport.value?.id,
    channels: mediaQuery.channels,
    time_range: toDateRange(mediaQuery.dateRange),
    start_event: mediaQuery.startEvent,
    end_event: mediaQuery.endEvent,
    middle_events: mediaQuery.middleEvents.filter(Boolean),
    crowd_filter: mediaQuery.crowdFilter,
    conversion_steps: mediaQuery.conversionSteps,
    frequency_event: mediaQuery.frequencyEvent,
    overlap_event: mediaQuery.overlapEvent,
    overlap_mode: mediaQuery.overlapMode,
    ...extra,
  }
}

function adReportDownloadConfig(extra: Record<string, unknown> = {}) {
  return {
    media_channels: adReportQuery.mediaChannels,
    advertisers: adReportQuery.advertisers,
    ad_groups: adReportQuery.adGroups,
    ad_creatives: adReportQuery.adCreatives,
    time_range: toDateRange(adReportQuery.dateRange),
    metric: adReportQuery.metric,
    ...extra,
  }
}

function downloadEffectDetail() {
  const rows = effectResult.value?.detailRows.map((row) => ({
    聚合维度: row.dimensionName,
    媒体渠道: row.channelName,
    广告主: row.advertiserName,
    广告组: row.adGroupName,
    广告计划: row.adPlanName,
    广告创意: row.adCreativeName,
    曝光人数: row.impressionsUsers,
    曝光次数: row.impressions,
    点击人数: row.clickUsers,
    点击次数: row.clicks,
    留资人数: row.leadUsers,
    试驾人数: row.testDriveUsers,
    成交人数: row.dealUsers,
    点击率: formatPercent(row.ctr),
    留资率: formatPercent(row.leadRate),
    转化率: formatPercent(row.conversionRate),
    花费: row.cost,
    平均点击价格: row.avgCpc.toFixed(2),
  })) ?? []
  downloadExcel('广告效果明细', rows, effectDownloadConfig({ table: 'effect_detail' }), currentReport.value?.id)
}

function downloadFunnel() {
  const rows = effectResult.value?.funnel.map((stage) => ({
    阶段: stage.name,
    人数: stage.users,
    次数: stage.times,
    转化率: formatPercent(stage.conversionRate),
  })) ?? []
  downloadExcel('转化漏斗明细', rows, effectDownloadConfig({ table: 'funnel', stat: effectQuery.funnelStat }), currentReport.value?.id)
}

function exportSelectedFunnelStage() {
  const stage = selectedFunnelStage.value
  if (!stage) {
    message.warning('请先查询并选择漏斗阶段。')
    return
  }
  openExportSegment(
    'funnel',
    `${stage.name}阶段人群`,
    stage.users,
    {
      stage_id: stage.id,
      stage_name: stage.name,
      event_name: stage.eventName,
      stat: effectQuery.funnelStat,
      users: stage.users,
      times: stage.times,
      conversion_rate: stage.conversionRate,
      query: toDateRange(effectQuery.dateRange),
      crowd_filter: effectQuery.crowdFilter,
    },
  )
}

function downloadFrequency() {
  const rows = mediaResult.value?.frequency.map((row) => ({
    媒体渠道: row.channelName,
    '1 次人数': row.onceUsers,
    '2 次人数': row.twiceUsers,
    '3 次人数': row.threeUsers,
    '4 次人数': row.fourUsers,
    '5 次人数': row.fiveUsers,
    '5 次以上人数': row.moreThanFiveUsers,
    对应转化人数: row.convertedUsers,
    转化率: formatPercent(row.conversionRate),
  })) ?? []
  downloadExcel('频次分析明细', rows, mediaDownloadConfig({ table: 'frequency', event: mediaQuery.frequencyEvent }), currentReport.value?.id)
}

function downloadOverlap() {
  const rows = mediaResult.value?.overlap.cells.map((cell) => ({
    行媒体: channelName(cell.rowChannelId),
    列媒体: channelName(cell.columnChannelId),
    重合人数: cell.users,
    百分比: formatPercent(cell.percentage),
  })) ?? []
  downloadExcel('重合度分析明细', rows, mediaDownloadConfig({ table: 'overlap', event: mediaQuery.overlapEvent, mode: mediaQuery.overlapMode }), currentReport.value?.id)
}

function openOverlapDetail(cell: AdOverlapCell) {
  const rowChannelName = channelName(cell.rowChannelId)
  const columnChannelName = channelName(cell.columnChannelId)
  selectedOverlapDetail.value = {
    rowChannelId: cell.rowChannelId,
    columnChannelId: cell.columnChannelId,
    rowChannelName,
    columnChannelName,
    users: cell.users,
    percentage: cell.percentage,
    eventName: mediaQuery.overlapEvent,
    sampleUsers: Array.from({ length: 5 }).map((_, index) => ({
      id: `one_${cell.rowChannelId}_${cell.columnChannelId}_${index + 1}`,
      mobile: `138****${String(6200 + index * 17).slice(-4)}`,
      lastEvent: mediaQuery.overlapEvent || mediaQuery.endEvent,
      mediaPath: `${rowChannelName} -> ${columnChannelName}`,
    })),
  }
}

function exportSelectedOverlapUsers() {
  const detail = selectedOverlapDetail.value
  if (!detail) {
    message.warning('请先点击重合度单元格查看用户详情。')
    return
  }
  openExportSegment(
    'overlap',
    `${detail.rowChannelName}-${detail.columnChannelName}重合用户`,
    detail.users,
    {
      rowChannelId: detail.rowChannelId,
      columnChannelId: detail.columnChannelId,
      event: detail.eventName,
      percentage: detail.percentage,
      sample_users: detail.sampleUsers,
    },
  )
}

function downloadAdReportTrend() {
  const rows = adReportResult.value?.trend.map((point) => ({
    日期: point.date,
    展示数: point.impressions,
    点击数: point.clicks,
    总花费: point.cost,
    点击率: formatPercent(point.ctr),
    平均点击价格: point.avgCpc.toFixed(2),
  })) ?? []
  downloadExcel('广告效果趋势', rows, adReportDownloadConfig({ table: 'trend' }))
}

function downloadAdReportDetail() {
  const rows = adReportResult.value?.detailRows.map((row) => ({
    媒体渠道: row.channelName,
    广告主: row.advertiserName,
    广告组: row.adGroupName,
    广告创意: row.adCreativeName,
    展示数: row.impressions,
    点击数: row.clicks,
    总花费: row.cost,
    点击率: formatPercent(row.ctr),
    平均点击价格: row.avgCpc.toFixed(2),
    转化人数: row.conversionUsers,
    转化率: formatPercent(row.conversionRate),
  })) ?? []
  downloadExcel('广告指标明细', rows, adReportDownloadConfig({ table: 'ad_metric_detail' }))
}

function channelName(channelId: string) {
  return referenceData.channels.find((channel) => channel.id === channelId)?.name ?? channelId
}

const reportColumns = computed<DataTableColumns<AdAnalysisReport>>(() => [
  {
    title: '报告名称',
    key: 'name',
    minWidth: 190,
    render: (row) =>
      h(
        NButton,
        {
          text: true,
          type: 'primary',
          onClick: () => openReportDetail(row.id),
        },
        { default: () => row.name },
      ),
  },
  {
    title: '报告类型',
    key: 'reportType',
    width: 140,
    render: (row) => h(NTag, { type: row.reportType === 'effect' ? 'success' : 'info', round: true }, { default: () => reportTypeLabel(row.reportType) }),
  },
  { title: '广告渠道数', key: 'channelIds', width: 110, render: (row) => row.channelIds.length },
  { title: '创建人', key: 'creatorName', width: 130 },
  { title: '创建时间', key: 'createdAt', width: 170 },
  { title: '更新时间', key: 'updatedAt', width: 170 },
  {
    title: '操作',
    key: 'actions',
    width: 210,
    fixed: 'right',
    render: (row) =>
      h(NSpace, { size: 8 }, {
        default: () => [
          h(NButton, { size: 'small', secondary: true, renderIcon: icon(EyeOutline), onClick: () => openReportDetail(row.id) }, { default: () => '查看' }),
          h(NButton, { size: 'small', secondary: true, renderIcon: icon(CreateOutline), disabled: !permissions.value?.manageReport, onClick: () => openEditReport(row) }, { default: () => '编辑' }),
          h(NButton, { size: 'small', secondary: true, type: 'error', renderIcon: icon(TrashOutline), disabled: !permissions.value?.manageReport, onClick: () => deleteReport(row) }, { default: () => '删除' }),
        ],
      }),
  },
])

const templateColumns = computed<DataTableColumns<AdMetadataTemplate>>(() => [
  { title: '模板名称', key: 'name', minWidth: 200 },
  { title: '主体', key: 'subjectType', width: 120 },
  { title: '事件数', key: 'behaviorEventConfig', width: 90, render: (row) => row.behaviorEventConfig.length },
  { title: '指标数', key: 'metricConfig', width: 90, render: (row) => row.metricConfig.length },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) => h(NTag, { type: templateStatusType(row.status), round: true }, { default: () => templateStatusLabel(row.status) }),
  },
  { title: '创建人', key: 'creatorName', width: 130 },
  { title: '更新时间', key: 'updatedAt', width: 170 },
  {
    title: '操作',
    key: 'actions',
    width: 180,
    fixed: 'right',
    render: (row) =>
      h(NSpace, { size: 8 }, {
        default: () => [
          h(NButton, { size: 'small', secondary: true, renderIcon: icon(CreateOutline), disabled: !permissions.value?.manageTemplate, onClick: () => editTemplate(row) }, { default: () => '编辑' }),
          h(NButton, { size: 'small', secondary: true, type: 'error', renderIcon: icon(TrashOutline), disabled: !permissions.value?.manageTemplate, onClick: () => deleteTemplate(row) }, { default: () => '删除' }),
        ],
      }),
  },
])

const metricColumns = computed<DataTableColumns<AdMetricConfig>>(() => [
  { title: '指标名称', key: 'name', minWidth: 180 },
  { title: '指标类型', key: 'metricType', width: 120, render: (row) => row.metricType === 'single' ? '单一指标' : '组合指标' },
  { title: '创建人', key: 'creatorName', width: 120, render: (row) => row.creatorType === 'system' ? '系统' : row.creatorName },
  { title: '展示格式', key: 'displayFormat', width: 130 },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    render: (row) =>
      h(NSpace, { size: 8 }, {
        default: () => [
          h(NButton, { size: 'small', secondary: true, renderIcon: icon(EyeOutline), onClick: () => viewMetric(row) }, { default: () => '查看' }),
          h(NButton, { size: 'small', secondary: true, type: 'error', renderIcon: icon(TrashOutline), disabled: !row.isRemovable, onClick: () => removeMetric(row) }, { default: () => '移除' }),
        ],
      }),
  },
])

const effectDetailColumns = computed<DataTableColumns<AdEffectDetailRow>>(() => {
  const selectedMetrics = currentTemplate.value?.metricConfig.filter((metric) => effectQuery.selectedMetricIds.includes(metric.id) && metric.creatorType === 'user') ?? []
  return [
    { title: '聚合维度名称', key: 'dimensionName', fixed: 'left', minWidth: 180 },
    { title: '曝光人数', key: 'impressionsUsers', width: 120, render: (row) => formatNumber(row.impressionsUsers) },
    { title: '曝光次数', key: 'impressions', width: 120, render: (row) => formatNumber(row.impressions) },
    {
      title: '点击人数',
      key: 'clickUsers',
      width: 120,
      render: (row) => h(NButton, { text: true, type: 'primary', onClick: () => openExportSegment('detail', `${row.dimensionName}-点击`, row.clickUsers, { row, metric: '点击人数', filters: toDateRange(effectQuery.dateRange) }) }, { default: () => formatNumber(row.clickUsers) }),
    },
    { title: '点击次数', key: 'clicks', width: 120, render: (row) => formatNumber(row.clicks) },
    {
      title: '留资人数',
      key: 'leadUsers',
      width: 120,
      render: (row) => h(NButton, { text: true, type: 'primary', onClick: () => openExportSegment('detail', `${row.dimensionName}-留资`, row.leadUsers, { row, metric: '留资人数', filters: toDateRange(effectQuery.dateRange) }) }, { default: () => formatNumber(row.leadUsers) }),
    },
    {
      title: '试驾人数',
      key: 'testDriveUsers',
      width: 120,
      render: (row) => h(NButton, { text: true, type: 'primary', onClick: () => openExportSegment('detail', `${row.dimensionName}-试驾`, row.testDriveUsers, { row, metric: '试驾人数' }) }, { default: () => formatNumber(row.testDriveUsers) }),
    },
    {
      title: '成交人数',
      key: 'dealUsers',
      width: 120,
      render: (row) => h(NButton, { text: true, type: 'primary', onClick: () => openExportSegment('detail', `${row.dimensionName}-成交`, row.dealUsers, { row, metric: '成交人数' }) }, { default: () => formatNumber(row.dealUsers) }),
    },
    { title: '点击率', key: 'ctr', width: 110, render: (row) => formatPercent(row.ctr) },
    { title: '留资率', key: 'leadRate', width: 110, render: (row) => formatPercent(row.leadRate) },
    { title: '转化率', key: 'conversionRate', width: 110, render: (row) => formatPercent(row.conversionRate) },
    { title: '花费', key: 'cost', width: 120, render: (row) => formatMoney(row.cost) },
    { title: '平均点击价格', key: 'avgCpc', width: 140, render: (row) => row.avgCpc.toFixed(2) },
    ...selectedMetrics.map((metric) => ({
      title: metric.name,
      key: metric.id,
      width: 140,
      render: (row: AdEffectDetailRow) => formatMetricValue(row.customMetrics[metric.id] ?? Number.NaN, metric.displayFormat),
    })),
  ]
})

const frequencyColumns = computed<DataTableColumns<AdFrequencyRow>>(() => [
  { title: '媒体渠道', key: 'channelName', fixed: 'left', width: 130 },
  { title: '1 次人数', key: 'onceUsers', width: 110, render: (row) => formatNumber(row.onceUsers) },
  { title: '2 次人数', key: 'twiceUsers', width: 110, render: (row) => formatNumber(row.twiceUsers) },
  { title: '3 次人数', key: 'threeUsers', width: 110, render: (row) => formatNumber(row.threeUsers) },
  { title: '4 次人数', key: 'fourUsers', width: 110, render: (row) => formatNumber(row.fourUsers) },
  { title: '5 次人数', key: 'fiveUsers', width: 110, render: (row) => formatNumber(row.fiveUsers) },
  { title: '5 次以上人数', key: 'moreThanFiveUsers', width: 130, render: (row) => formatNumber(row.moreThanFiveUsers) },
  {
    title: '对应转化人数',
    key: 'convertedUsers',
    width: 130,
    render: (row) => h(NButton, { text: true, type: 'primary', onClick: () => openExportSegment('frequency', `${row.channelName}-频次转化`, row.convertedUsers, { channelId: row.channelId, event: mediaQuery.frequencyEvent }) }, { default: () => formatNumber(row.convertedUsers) }),
  },
  { title: '转化率', key: 'conversionRate', width: 110, render: (row) => formatPercent(row.conversionRate) },
])

const overlapColumns = computed<DataTableColumns<AdOverlapCell>>(() => {
  const channels = mediaResult.value?.overlap.channels ?? []
  return [
    {
      title: '行为媒体渠道',
      key: 'rowChannelId',
      fixed: 'left',
      width: 140,
      render: (row) => channelName(row.rowChannelId),
    },
    ...channels.map((channel) => ({
      title: channel.name,
      key: channel.id,
      width: 130,
      render: (row: AdOverlapCell) => {
        const cell = mediaResult.value?.overlap.cells.find(
          (item) => item.rowChannelId === row.rowChannelId && item.columnChannelId === channel.id,
        )
        if (!cell) return '--'
        const label = mediaQuery.overlapMode === 'users' ? formatNumber(cell.users) : formatPercent(cell.percentage)
        return h(NButton, { text: true, type: 'primary', onClick: () => openOverlapDetail(cell) }, { default: () => label })
      },
    })),
  ]
})

const overlapRows = computed<AdOverlapCell[]>(() =>
  (mediaResult.value?.overlap.channels ?? []).map((channel) => ({
    rowChannelId: channel.id,
    columnChannelId: channel.id,
    users: 0,
    percentage: 0,
  })),
)

const adReportDetailColumns: DataTableColumns<AdReportDetailRow> = [
  { title: '媒体渠道', key: 'channelName', fixed: 'left', width: 130 },
  { title: '广告主', key: 'advertiserName', width: 160 },
  { title: '广告组', key: 'adGroupName', width: 170 },
  { title: '广告创意', key: 'adCreativeName', width: 170 },
  { title: '展示数', key: 'impressions', width: 120, render: (row) => formatNumber(row.impressions) },
  { title: '点击数', key: 'clicks', width: 120, render: (row) => formatNumber(row.clicks) },
  { title: '总花费', key: 'cost', width: 120, render: (row) => formatMoney(row.cost) },
  { title: '点击率', key: 'ctr', width: 110, render: (row) => formatPercent(row.ctr) },
  { title: '平均点击价格', key: 'avgCpc', width: 130, render: (row) => row.avgCpc.toFixed(2) },
  { title: '转化人数', key: 'conversionUsers', width: 120, render: (row) => formatNumber(row.conversionUsers) },
  { title: '转化率', key: 'conversionRate', width: 110, render: (row) => formatPercent(row.conversionRate) },
]

const selectedFunnelStage = computed(() =>
  effectResult.value?.funnel.find((stage) => stage.id === effectQuery.selectedFunnelStageId) ?? effectResult.value?.funnel[0],
)

const pathDetailSummary = computed(() => {
  if (!mediaResult.value) return null
  const { nodes, links } = mediaResult.value.path
  const maxDepth = nodes.reduce((max, node) => Math.max(max, node.depth), 0)
  const firstStepLinks = links.filter((link) => link.pathLevel === 1)
  const laterStepLinks = links.filter((link) => link.pathLevel > 1)
  const directUsers = firstStepLinks.reduce((sum, link) => sum + link.value, 0)
  const indirectUsers = laterStepLinks.reduce((sum, link) => sum + link.value, 0)
  const topCombination = Object.entries(
    links.reduce<Record<string, number>>((acc, link) => {
      const name = channelName(link.channelId)
      acc[name] = (acc[name] ?? 0) + link.value
      return acc
    }, {}),
  ).sort((left, right) => right[1] - left[1])[0]
  const longestChainNodes = nodes
    .filter((node) => node.channelId === links[0]?.channelId)
    .sort((left, right) => left.depth - right.depth)
    .map((node) => node.name)
  const selectedValue = selectedPathLink.value?.value ?? selectedPathNode.value?.value ?? 0
  const selectedRate = selectedPathLink.value?.rate ?? selectedPathNode.value?.rate ?? 0

  return {
    directUsers,
    indirectUsers,
    maxDepth,
    topCombinationName: topCombination?.[0] ?? '-',
    topCombinationUsers: topCombination?.[1] ?? 0,
    longestChain: longestChainNodes.length > 0 ? longestChainNodes.join(' -> ') : '-',
    selectedName: selectedPathLink.value?.description ?? selectedPathNode.value?.name ?? '请选择路径或节点',
    selectedValue,
    selectedRate,
  }
})

const funnelOption = computed<EChartsOption>(() => ({
  tooltip: {
    trigger: 'item',
    formatter: (params: unknown) => {
      const item = params as { name: string, value: number, data?: { conversionRate?: number } }
      return `${item.name}<br/>${effectQuery.funnelStat === 'users' ? '人数' : '次数'}：${formatNumber(item.value)}<br/>转化率：${formatPercent(item.data?.conversionRate ?? 0)}`
    },
  },
  series: [
    {
      type: 'funnel',
      left: '5%',
      top: 24,
      bottom: 12,
      width: '88%',
      minSize: '24%',
      maxSize: '100%',
      sort: 'none',
      label: { formatter: '{b}' },
      data: (effectResult.value?.funnel ?? []).map((stage) => ({
        name: stage.name,
        value: effectQuery.funnelStat === 'users' ? stage.users : stage.times,
        conversionRate: stage.conversionRate,
        id: stage.id,
      })),
    },
  ],
}))

const funnelDistributionOption = computed<EChartsOption>(() => {
  const stage = selectedFunnelStage.value
  const rows = stage ? effectResult.value?.channelDistribution[stage.id] ?? [] : []
  return {
    tooltip: { trigger: 'item', formatter: '{b}<br/>{c} ({d}%)' },
    legend: { bottom: 0 },
    series: [
      {
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['50%', '44%'],
        data: rows.map((row) => ({ name: row.channelName, value: row.value })),
      },
    ],
  }
})

const pathOption = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'item' },
  series: [
    {
      type: 'sankey',
      layout: 'none',
      nodeGap: 14,
      draggable: false,
      emphasis: { focus: 'adjacency' },
      data: (mediaResult.value?.path.nodes ?? []).map((node) => ({
        name: node.id,
        label: { formatter: `${node.name}\n${formatNumber(node.value)} / ${formatPercent(node.rate)}` },
        value: node.value,
        itemStyle: { color: node.depth === 0 ? '#2563eb' : node.depth === 1 ? '#16a34a' : '#f59e0b' },
      })),
      links: (mediaResult.value?.path.links ?? []).map((link) => ({
        source: link.source,
        target: link.target,
        value: link.value,
        lineStyle: { color: 'gradient', opacity: 0.28 },
        description: link.description,
        channelId: link.channelId,
      })),
    },
  ],
}))

const trendOption = computed<EChartsOption>(() => {
  const points: AdDailyTrendPoint[] = adReportResult.value?.trend ?? []
  const metric = adReportQuery.metric
  const metricLabelMap: Record<AdTrendMetric, string> = {
    impressions: '展示数',
    clicks: '点击数',
    cost: '总花费',
    ctr: '点击率',
    avgCpc: '平均点击价格',
  }
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 48, right: 24, top: 32, bottom: 42 },
    xAxis: { type: 'category', data: points.map((point) => point.date) },
    yAxis: { type: 'value' },
    series: [
      {
        name: metricLabelMap[metric],
        type: 'line',
        smooth: true,
        areaStyle: { opacity: 0.12 },
        data: points.map((point) => point[metric]),
      },
    ],
  }
})

function handleFunnelClick(params: unknown) {
  const id = (params as { data?: { id?: string } }).data?.id
  if (id) effectQuery.selectedFunnelStageId = id
}

function handlePathClick(params: unknown) {
  const event = params as { data?: { description?: string, value?: number, channelId?: string }, dataType?: string, name?: string }
  if (event.data?.description) {
    selectedPathDescription.value = event.data.description
    selectedPathLink.value = event.data as AdPathLink
    selectedPathNode.value = null
  }
  if (event.dataType === 'edge' && event.data?.value) {
    openExportSegment('path_link', event.data.description ?? '路径流转', event.data.value, event.data)
  }
  if (event.dataType === 'node' && event.name) {
    const node = mediaResult.value?.path.nodes.find((item) => item.id === event.name)
    if (node) {
      selectedPathDescription.value = `${node.name} 节点人数 ${formatNumber(node.value)}，节点转化率 ${formatPercent(node.rate)}。`
      selectedPathNode.value = node
      selectedPathLink.value = null
      openExportSegment('path_node', node.name, node.value, node)
    }
  }
}

watch(
  () => [searchForm.keyword, searchForm.reportType],
  () => {
    searchForm.page = 1
    syncReportListQueryToRoute()
    loadReports()
  },
)

watch(
  () => route.fullPath,
  () => {
    handleRouteChange()
  },
)

onMounted(async () => {
  await loadFoundation()
  await handleRouteChange()
})
</script>

<template>
  <div class="page-container ad-analysis-page">
    <n-spin :show="loading">
      <template v-if="accessDecision && !canEnter">
        <n-card :bordered="false" class="state-panel">
          <n-empty :description="accessDecision.message || '当前项目未开通广告投放分析能力，请联系商务或管理员开通。'">
            <template #extra>
              <n-space vertical align="center">
                <n-space v-if="dataPrerequisites?.missingItems?.length" justify="center">
                  <n-tag v-for="item in dataPrerequisites.missingItems" :key="item" type="warning" round>
                    {{ missingPrerequisiteLabel(item) }}
                  </n-tag>
                </n-space>
                <n-space justify="center">
                  <n-button type="primary">联系管理员</n-button>
                  <n-button secondary @click="router.push('/dashboard')">返回首页</n-button>
                </n-space>
              </n-space>
            </template>
          </n-empty>
          <div class="project-config-panel">
            <div class="project-config-head">
              <strong>项目配置验收</strong>
              <span>切换采购、数据源与接入状态，验收入口置灰和异常提示。</span>
            </div>
            <n-grid :cols="3" :x-gap="12" :y-gap="12">
              <n-gi v-for="option in projectConfigOptions" :key="option.key">
                <label class="project-config-item">
                  <n-checkbox :checked="projectConfigChecked(option.key)" @update:checked="(checked) => updateProjectConfigFlag(option.key, checked)" />
                  <span>
                    <strong>{{ option.label }}</strong>
                    <small>{{ option.hint }}</small>
                  </span>
                </label>
              </n-gi>
            </n-grid>
          </div>
        </n-card>
      </template>

      <template v-else>
        <section v-if="pageMode === 'home'" class="view-stack">
          <div class="page-heading">
            <div>
              <h1 class="page-title">广告投放分析</h1>
              <p class="page-description">串联广告监测数据与后链路转化数据，评估人群、渠道、创意与转化路径组合。</p>
            </div>
            <n-space>
              <n-button secondary :render-icon="icon(AddCircleOutline)" :disabled="!permissions?.manageTemplate" @click="router.push('/data-insight/ad-analysis/templates/new')">
                新建广告元数据模板
              </n-button>
              <n-button type="primary" :render-icon="icon(AddCircleOutline)" :disabled="!permissions?.manageReport" @click="openCreateReport">
                新建报告
              </n-button>
              <n-tooltip>
                <template #trigger>
                  <n-button secondary :render-icon="icon(CloudDownloadOutline)" :disabled="!isAdReportAvailable" @click="router.push('/data-insight/ad-analysis/ad-report')">
                    广告投放报表
                  </n-button>
                </template>
                {{ adReportGateFailure?.message || '进入广告投放报表。' }}
              </n-tooltip>
            </n-space>
          </div>

          <div class="project-config-panel">
            <div class="project-config-head">
              <strong>项目配置验收</strong>
              <span>用于模拟未采购、数据源不可用、数据接入未完成等场景。</span>
            </div>
            <n-grid :cols="3" :x-gap="12" :y-gap="12">
              <n-gi v-for="option in projectConfigOptions" :key="option.key">
                <label class="project-config-item">
                  <n-checkbox :checked="projectConfigChecked(option.key)" @update:checked="(checked) => updateProjectConfigFlag(option.key, checked)" />
                  <span>
                    <strong>{{ option.label }}</strong>
                    <small>{{ option.hint }}</small>
                  </span>
                </label>
              </n-gi>
            </n-grid>
          </div>

          <div v-if="visibleFailureStates.length" class="failure-state-grid">
            <div v-for="state in visibleFailureStates" :key="state.reason" class="failure-state-item">
              <n-tag type="warning" round>{{ state.title }}</n-tag>
              <p>{{ state.message }}</p>
              <small>{{ state.action }}</small>
            </div>
          </div>

          <n-card :bordered="false" class="work-card">
            <template #header>
              <div class="card-header">
                <span>广告投放分析报告</span>
                <n-button text type="primary" @click="router.push('/data-insight/ad-analysis/templates')">广告元数据模板</n-button>
              </div>
            </template>

            <n-space class="toolbar" justify="space-between" align="center">
              <n-space>
                <n-input v-model:value="searchForm.keyword" clearable placeholder="请输入报告名称" style="width: 260px" @keyup.enter="loadReports">
                  <template #prefix>
                    <n-icon><SearchOutline /></n-icon>
                  </template>
                </n-input>
                <n-select v-model:value="searchForm.reportType" :options="reportTypeOptions" style="width: 180px" />
              </n-space>
            </n-space>

            <n-data-table
              :columns="reportColumns"
              :data="reports"
              :pagination="{ page: searchForm.page, pageSize: searchForm.pageSize, itemCount: searchForm.total, onChange: handleReportPageChange }"
              :scroll-x="1160"
            />
          </n-card>

          <n-card :bordered="false" class="work-card">
            <template #header>审计日志</template>
            <div class="audit-list">
              <div v-if="auditLogs.length > 0" class="audit-row audit-head">
                <span>动作</span>
                <span>报告 ID</span>
                <span>模板 ID</span>
                <span>来源</span>
                <span>source_config</span>
                <span>用户</span>
                <span>时间</span>
              </div>
              <div v-for="log in auditLogs" :key="log.id" class="audit-row">
                <span class="audit-action">{{ log.actionLabel || log.action }}</span>
                <span>{{ auditValue(log.reportId) }}</span>
                <span>{{ auditValue(log.templateId) }}</span>
                <span>{{ auditValue(log.sourceType) }}</span>
                <span class="audit-config" :title="compactAuditConfig(log.sourceConfig)">{{ compactAuditConfig(log.sourceConfig) }}</span>
                <span>{{ log.userName }}</span>
                <span>{{ log.createdAt }}</span>
              </div>
              <n-empty v-if="auditLogs.length === 0" description="暂无审计记录" />
            </div>
          </n-card>
        </section>

        <section v-else-if="pageMode === 'templates'" class="view-stack">
          <div class="page-heading">
            <div>
              <h1 class="page-title">广告元数据模板</h1>
              <p class="page-description">定义广告行为事件、系统自动生成指标与用户自定义指标。</p>
            </div>
            <n-space>
              <n-button secondary :render-icon="icon(ArrowBackOutline)" @click="returnToReportList">返回</n-button>
              <n-button type="primary" :render-icon="icon(AddCircleOutline)" :disabled="!permissions?.manageTemplate" @click="router.push('/data-insight/ad-analysis/templates/new')">
                新建广告元数据模板
              </n-button>
            </n-space>
          </div>

          <n-card :bordered="false" class="work-card">
            <n-data-table :columns="templateColumns" :data="templates" :scroll-x="980" />
          </n-card>
        </section>

        <section v-else-if="pageMode === 'template-create'" class="view-stack">
          <div class="page-heading">
            <div>
              <h1 class="page-title">{{ templateForm.id ? '编辑广告元数据模板' : '新建广告元数据模板' }}</h1>
              <p class="page-description">按两步完成行为事件映射和广告指标选择。</p>
            </div>
            <n-space>
              <n-button secondary :render-icon="icon(ArrowBackOutline)" @click="router.push('/data-insight/ad-analysis/templates')">取消</n-button>
              <n-button v-if="templateStep === 2" secondary @click="templateStep = 1">上一步</n-button>
              <n-button v-if="templateStep === 1" type="primary" @click="goMetricStep">下一步</n-button>
              <n-button v-else type="primary" :render-icon="icon(SaveOutline)" @click="saveTemplate">保存</n-button>
            </n-space>
          </div>

          <n-card :bordered="false" class="work-card">
            <n-steps :current="templateStep">
              <n-step title="广告行为事件配置" />
              <n-step title="选择广告指标" />
            </n-steps>
          </n-card>

          <n-card v-if="templateStep === 1" :bordered="false" class="work-card">
            <template #header>基本信息</template>
            <n-form label-placement="top">
              <n-grid :cols="3" :x-gap="16">
                <n-gi>
                  <n-form-item label="模板名称" required>
                    <n-input v-model:value="templateForm.name" maxlength="100" show-count placeholder="请输入模板名称" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="主体" required>
                    <n-select :value="templateForm.subjectType" :options="referenceData.subjects" @update:value="handleSubjectChange" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="描述">
                    <n-input v-model:value="templateForm.description" maxlength="500" show-count placeholder="模板说明" />
                  </n-form-item>
                </n-gi>
              </n-grid>
            </n-form>

            <n-divider />

            <div class="section-header">
              <h2>广告行为事件配置</h2>
              <n-button secondary :render-icon="icon(AddCircleOutline)" @click="addBehaviorEvent">添加事件</n-button>
            </div>
            <div class="event-grid event-grid-head">
              <span>广告行为</span>
              <span>行为事件</span>
              <span>展示名称</span>
              <span>顺序</span>
              <span>删除</span>
            </div>
            <div v-for="(event, index) in templateForm.events" :key="`${event.id}_${index}`" class="event-grid">
              <n-select :value="event.adBehavior" :options="referenceData.behaviorOptions" @update:value="(value: AdBehaviorSemantic) => handleBehaviorChange(event, value)" />
              <n-select v-model:value="event.eventName" :options="eventOptionsForTemplate" />
              <n-input v-model:value="event.displayName" placeholder="报告中展示的名称" />
              <n-input-number v-model:value="event.orderIndex" :min="1" />
              <n-button quaternary circle type="error" :render-icon="icon(TrashOutline)" @click="removeBehaviorEvent(index)" />
            </div>
          </n-card>

          <n-card v-else :bordered="false" class="work-card">
            <template #header>
              <div class="card-header">
                <span>指标列表</span>
                <n-button type="primary" :render-icon="icon(AddCircleOutline)" @click="openCreateMetric">新建广告指标</n-button>
              </div>
            </template>
            <n-data-table :columns="metricColumns" :data="templateForm.metrics" :scroll-x="780" />
          </n-card>
        </section>

        <section v-else-if="pageMode === 'detail'" class="view-stack">
          <template v-if="currentReport">
            <div class="page-heading">
              <div>
                <h1 class="page-title">{{ currentReport.name }}</h1>
                <p class="page-description">{{ currentReportTypeLabel }} · {{ currentReport.templateName }}</p>
              </div>
              <n-space>
                <n-button secondary :render-icon="icon(ArrowBackOutline)" @click="returnToReportList">返回</n-button>
                <n-button secondary :render-icon="icon(CreateOutline)" :disabled="!permissions?.manageReport" @click="openEditReport(currentReport)">编辑</n-button>
                <n-button secondary :render-icon="icon(RefreshOutline)" :disabled="isTemplateInvalid" @click="currentReport.reportType === 'effect' ? runEffectQuery() : runMediaQuery()">刷新</n-button>
                <n-button secondary :render-icon="icon(CloudDownloadOutline)" :disabled="!permissions?.downloadData || !effectResult" v-if="currentReport.reportType === 'effect'" @click="downloadEffectDetail">
                  下载明细数据
                </n-button>
              </n-space>
            </div>

            <n-alert v-if="isTemplateInvalid" type="error" title="模板失效">
              当前报告引用的广告元数据模板已失效，无法继续查询。
            </n-alert>
            <n-alert v-if="queryFailure" type="error" :title="queryFailure.title">
              <n-space vertical size="small">
                <span>{{ queryFailure.message }}</span>
                <n-text depth="3">{{ queryFailure.action }}</n-text>
              </n-space>
            </n-alert>
            <n-alert v-else-if="queryError" type="error" title="查询失败">
              {{ queryError }}
            </n-alert>

            <template v-if="currentReport.reportType === 'effect'">
              <n-card :bordered="false" class="work-card">
                <template #header>查询条件</template>
                <n-form label-placement="top">
                  <n-grid :cols="3" :x-gap="16">
                    <n-gi>
                      <n-form-item label="聚合维度">
                        <n-select v-model:value="effectQuery.aggregateDimensions" multiple :options="aggregateDimensionOptions" />
                      </n-form-item>
                    </n-gi>
                    <n-gi>
                      <n-form-item label="投放渠道">
                        <n-select v-model:value="effectQuery.channels" multiple clearable :options="channelOptions" />
                      </n-form-item>
                    </n-gi>
                    <n-gi>
                      <n-form-item label="广告主">
                        <n-select v-model:value="effectQuery.advertisers" multiple clearable :options="advertiserOptions" placeholder="需先选择投放渠道" />
                      </n-form-item>
                    </n-gi>
                    <n-gi>
                      <n-form-item label="时间范围" required>
                        <n-date-picker v-model:value="effectQuery.dateRange" type="daterange" clearable />
                      </n-form-item>
                    </n-gi>
                    <n-gi>
                      <n-form-item label="广告组">
                        <n-select v-model:value="effectQuery.adGroups" multiple clearable :options="adGroupOptions" />
                      </n-form-item>
                    </n-gi>
                    <n-gi>
                      <n-form-item label="广告计划">
                        <n-select v-model:value="effectQuery.adPlans" multiple clearable :options="adPlanOptions" />
                      </n-form-item>
                    </n-gi>
                    <n-gi>
                      <n-form-item label="广告创意">
                        <n-select v-model:value="effectQuery.adCreatives" multiple clearable :options="adCreativeOptions" />
                      </n-form-item>
                    </n-gi>
                  </n-grid>
                </n-form>
                <ad-audience-filter-builder v-model="effectQuery.crowdFilter" class="audience-filter-builder" />
                <n-space justify="end">
                  <n-button @click="resetEffectQuery">重置</n-button>
                  <n-button type="primary" :loading="querying" :disabled="isTemplateInvalid || Boolean(runtimeFailure)" @click="runEffectQuery">查询</n-button>
                </n-space>
              </n-card>

              <n-grid v-if="effectResult" :cols="2" :x-gap="16" :y-gap="16">
                <n-gi v-for="metric in effectResult.summary" :key="metric.key">
                  <div class="metric-tile">
                    <n-statistic :label="metric.label" :value="metric.unit === '%' ? formatPercent(metric.value) : metric.unit === '元' ? formatMoney(metric.value) : formatNumber(metric.value)" />
                    <n-tag :type="metric.change >= 0 ? 'success' : 'error'" size="small">
                      {{ metric.change >= 0 ? '+' : '' }}{{ metric.change }}%
                    </n-tag>
                  </div>
                </n-gi>
              </n-grid>

              <n-card :bordered="false" class="work-card">
                <template #header>
                  <div class="card-header">
                    <span>广告效果明细</span>
                    <n-space>
                      <n-button secondary @click="openMetricSelector">自定义指标</n-button>
                      <n-button secondary :render-icon="icon(CloudDownloadOutline)" :disabled="!permissions?.downloadData || !effectResult" @click="downloadEffectDetail">下载明细数据</n-button>
                    </n-space>
                  </div>
                </template>
                <n-data-table v-if="effectResult" :columns="effectDetailColumns" :data="effectResult.detailRows" :scroll-x="1760" />
                <n-empty v-else description="初始详情页展示查询条件区，等待用户点击查询。" />
              </n-card>

              <n-grid :cols="2" :x-gap="16">
                <n-gi>
                  <n-card :bordered="false" class="work-card chart-card">
                    <template #header>
                      <div class="card-header">
                        <span>转化漏斗分析</span>
                        <n-space>
                          <n-radio-group v-model:value="effectQuery.funnelStat" size="small">
                            <n-radio-button value="users">人数</n-radio-button>
                            <n-radio-button value="times">次数</n-radio-button>
                          </n-radio-group>
                          <n-button size="small" secondary :disabled="!permissions?.createSegment || !effectResult" @click="exportSelectedFunnelStage">导出当前阶段分群</n-button>
                          <n-button size="small" secondary :disabled="!permissions?.downloadData || !effectResult" @click="downloadFunnel">下载明细数据</n-button>
                        </n-space>
                      </div>
                    </template>
                    <v-chart v-if="effectResult" class="chart" :option="funnelOption" autoresize @click="handleFunnelClick" />
                    <n-empty v-else description="暂无漏斗数据" />
                  </n-card>
                </n-gi>
                <n-gi>
                  <n-card :bordered="false" class="work-card chart-card">
                    <template #header>{{ selectedFunnelStage?.name || '阶段' }}渠道分布</template>
                    <v-chart v-if="effectResult" class="chart" :option="funnelDistributionOption" autoresize />
                    <n-empty v-else description="暂无渠道分布数据" />
                  </n-card>
                </n-gi>
              </n-grid>
            </template>

            <template v-else>
              <n-card :bordered="false" class="work-card">
                <template #header>全局筛选</template>
                <n-form label-placement="top">
                  <n-grid :cols="3" :x-gap="16">
                    <n-gi>
                      <n-form-item label="投放渠道" required>
                        <n-select v-model:value="mediaQuery.channels" multiple :options="channelOptions" />
                      </n-form-item>
                    </n-gi>
                    <n-gi>
                      <n-form-item label="时间范围" required>
                        <n-date-picker v-model:value="mediaQuery.dateRange" type="daterange" clearable />
                      </n-form-item>
                    </n-gi>
                    <n-gi>
                      <n-form-item label="起点事件" required>
                        <n-select v-model:value="mediaQuery.startEvent" :options="reportEventOptions" />
                      </n-form-item>
                    </n-gi>
                    <n-gi>
                      <n-form-item label="终止事件" required>
                        <n-select v-model:value="mediaQuery.endEvent" :options="reportEventOptions" />
                      </n-form-item>
                    </n-gi>
                  </n-grid>
                  <div class="middle-events">
                    <div v-for="(eventName, index) in mediaQuery.middleEvents" :key="index" class="middle-event-row">
                      <n-select v-model:value="mediaQuery.middleEvents[index]" :options="reportEventOptions" placeholder="增加节点事件" />
                      <n-button quaternary circle type="error" :render-icon="icon(TrashOutline)" @click="removeMiddleEvent(index)" />
                    </div>
                    <n-button secondary :render-icon="icon(AddCircleOutline)" @click="addMiddleEvent">增加节点事件</n-button>
                  </div>
                  <ad-audience-filter-builder v-model="mediaQuery.crowdFilter" class="audience-filter-builder" />
                </n-form>
                <n-space justify="end">
                  <n-button @click="resetMediaQuery">重置</n-button>
                  <n-button type="primary" :loading="querying" :disabled="isTemplateInvalid || Boolean(runtimeFailure)" @click="runMediaQuery">查询</n-button>
                </n-space>
              </n-card>

              <n-card :bordered="false" class="work-card chart-card sankey-card">
                <template #header>
                  <div class="card-header">
                    <span>广告媒体转化路径</span>
                    <n-select v-model:value="mediaQuery.conversionSteps" :options="conversionStepOptions" style="width: 120px" @update:value="mediaResult && runMediaQuery()" />
                  </div>
                </template>
                <n-alert v-if="selectedPathDescription" type="info" class="path-info">{{ selectedPathDescription }}</n-alert>
                <v-chart v-if="mediaResult" class="sankey-chart" :option="pathOption" autoresize @click="handlePathClick" />
                <n-empty v-else description="查询后展示媒体渠道转化路径" />
                <div v-if="pathDetailSummary" class="path-detail-panel">
                  <div class="path-detail-tile">
                    <span>直接转化</span>
                    <strong>{{ formatNumber(pathDetailSummary.directUsers) }}</strong>
                    <small>首段媒体触达后的直接流转人数</small>
                  </div>
                  <div class="path-detail-tile">
                    <span>间接转化</span>
                    <strong>{{ formatNumber(pathDetailSummary.indirectUsers) }}</strong>
                    <small>经由中间节点继续转化的人数</small>
                  </div>
                  <div class="path-detail-tile">
                    <span>最长链路</span>
                    <strong>{{ pathDetailSummary.maxDepth + 1 }} 步</strong>
                    <small>{{ pathDetailSummary.longestChain }}</small>
                  </div>
                  <div class="path-detail-tile">
                    <span>媒体组合效果</span>
                    <strong>{{ pathDetailSummary.topCombinationName }}</strong>
                    <small>累计流转 {{ formatNumber(pathDetailSummary.topCombinationUsers) }} 人</small>
                  </div>
                  <div class="path-detail-selected">
                    <span>当前路径详情</span>
                    <strong>{{ pathDetailSummary.selectedName }}</strong>
                    <small>
                      人数 {{ formatNumber(pathDetailSummary.selectedValue) }}，转化率 {{ formatPercent(pathDetailSummary.selectedRate) }}
                    </small>
                  </div>
                </div>
              </n-card>

              <n-grid :cols="2" :x-gap="16">
                <n-gi>
                  <n-card :bordered="false" class="work-card">
                    <template #header>
                      <div class="card-header">
                        <span>频次分析</span>
                        <n-space>
                          <n-select v-model:value="mediaQuery.frequencyEvent" :options="reportEventOptions" size="small" style="width: 150px" @update:value="refreshMediaDerivedAnalysis" />
                          <n-button size="small" secondary :disabled="!permissions?.downloadData || !mediaResult" @click="downloadFrequency">下载明细数据</n-button>
                        </n-space>
                      </div>
                    </template>
                    <n-data-table v-if="mediaResult" :columns="frequencyColumns" :data="mediaResult.frequency" :scroll-x="980" />
                    <n-empty v-else description="暂无频次分析数据" />
                  </n-card>
                </n-gi>
                <n-gi>
                  <n-card :bordered="false" class="work-card">
                    <template #header>
                      <div class="card-header">
                        <span>重合度分析</span>
                        <n-space>
                          <n-select v-model:value="mediaQuery.overlapEvent" :options="reportEventOptions" size="small" style="width: 150px" @update:value="refreshMediaDerivedAnalysis" />
                          <n-radio-group v-model:value="mediaQuery.overlapMode" size="small">
                            <n-radio-button value="users">重合人数</n-radio-button>
                            <n-radio-button value="percentage">百分比</n-radio-button>
                          </n-radio-group>
                          <n-button size="small" secondary :disabled="!permissions?.downloadData || !mediaResult" @click="downloadOverlap">下载明细数据</n-button>
                        </n-space>
                      </div>
                    </template>
                    <n-data-table v-if="mediaResult" :columns="overlapColumns" :data="overlapRows" :scroll-x="720" />
                    <n-empty v-else description="暂无重合度分析数据" />
                    <div v-if="selectedOverlapDetail" class="overlap-detail-panel">
                      <div class="overlap-detail-head">
                        <div>
                          <n-text strong>{{ selectedOverlapDetail.rowChannelName }} 与 {{ selectedOverlapDetail.columnChannelName }} 的重合用户</n-text>
                          <p>{{ selectedOverlapDetail.eventName }} 事件下重合 {{ formatNumber(selectedOverlapDetail.users) }} 人，占比 {{ formatPercent(selectedOverlapDetail.percentage) }}。</p>
                        </div>
                        <n-button size="small" type="primary" :disabled="!permissions?.createSegment" @click="exportSelectedOverlapUsers">导出重合人群</n-button>
                      </div>
                      <div class="overlap-user-list">
                        <div class="overlap-user-row overlap-user-head">
                          <span>用户 ID</span>
                          <span>手机号</span>
                          <span>最近事件</span>
                          <span>媒体路径</span>
                        </div>
                        <div v-for="user in selectedOverlapDetail.sampleUsers" :key="user.id" class="overlap-user-row">
                          <span>{{ user.id }}</span>
                          <span>{{ user.mobile }}</span>
                          <span>{{ user.lastEvent }}</span>
                          <span>{{ user.mediaPath }}</span>
                        </div>
                      </div>
                    </div>
                  </n-card>
                </n-gi>
              </n-grid>
            </template>
          </template>
        </section>

        <section v-else-if="pageMode === 'ad-report'" class="view-stack">
          <div class="page-heading">
            <div>
              <h1 class="page-title">广告投放报表</h1>
              <p class="page-description">统计私域广告监测数据，帮助筛选最佳广告渠道。</p>
            </div>
            <n-button secondary :render-icon="icon(ArrowBackOutline)" @click="returnToReportList">返回</n-button>
          </div>

          <div class="project-config-panel">
            <div class="project-config-head">
              <strong>项目配置验收</strong>
              <span>关闭 veCDP 或 iAD 可验收报表入口置灰和查询拦截。</span>
            </div>
            <n-grid :cols="3" :x-gap="12" :y-gap="12">
              <n-gi v-for="option in projectConfigOptions" :key="option.key">
                <label class="project-config-item">
                  <n-checkbox :checked="projectConfigChecked(option.key)" @update:checked="(checked) => updateProjectConfigFlag(option.key, checked)" />
                  <span>
                    <strong>{{ option.label }}</strong>
                    <small>{{ option.hint }}</small>
                  </span>
                </label>
              </n-gi>
            </n-grid>
          </div>

          <n-alert v-if="adReportGateFailure" type="warning" :title="adReportGateFailure.title">
            <n-space vertical size="small">
              <span>{{ adReportGateFailure.message }}</span>
              <n-text depth="3">{{ adReportGateFailure.action }}</n-text>
            </n-space>
          </n-alert>
          <n-alert v-else-if="!isAdReportAvailable" type="warning" title="使用限制">
            广告投放报表需要同时采购 veCDP 和 iAD，监测链接需在 iAD 内生成。
          </n-alert>
          <n-alert v-if="queryFailure" type="error" :title="queryFailure.title">
            <n-space vertical size="small">
              <span>{{ queryFailure.message }}</span>
              <n-text depth="3">{{ queryFailure.action }}</n-text>
            </n-space>
          </n-alert>
          <n-alert v-else-if="queryError" type="error" title="查询失败">{{ queryError }}</n-alert>

          <n-card :bordered="false" class="work-card">
            <template #header>查询条件</template>
            <n-form label-placement="top">
              <n-grid :cols="3" :x-gap="16">
                <n-gi>
                  <n-form-item label="媒体渠道">
                    <n-select v-model:value="adReportQuery.mediaChannels" multiple clearable :options="channelOptions" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="广告主">
                    <n-select v-model:value="adReportQuery.advertisers" multiple clearable :options="adReportAdvertiserOptions" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="广告组">
                    <n-select v-model:value="adReportQuery.adGroups" multiple clearable :options="adReportGroupOptions" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="广告创意">
                    <n-select v-model:value="adReportQuery.adCreatives" multiple clearable :options="adReportCreativeOptions" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="时间范围" required>
                    <n-date-picker v-model:value="adReportQuery.dateRange" type="daterange" clearable />
                  </n-form-item>
                </n-gi>
              </n-grid>
            </n-form>
            <n-space justify="end">
              <n-button @click="resetAdReportQuery">重置</n-button>
              <n-button type="primary" :loading="querying" :disabled="Boolean(adReportGateFailure)" @click="runAdReportQuery">查询</n-button>
            </n-space>
          </n-card>

          <n-card :bordered="false" class="work-card chart-card">
            <template #header>
              <div class="card-header">
                <span>广告效果趋势</span>
                <n-space>
                  <n-select v-model:value="adReportQuery.metric" :options="trendMetricOptions" style="width: 170px" />
                  <n-button secondary size="small" :disabled="!permissions?.downloadData || !adReportResult" @click="downloadAdReportTrend">下载明细数据</n-button>
                </n-space>
              </div>
            </template>
            <v-chart v-if="adReportResult" class="chart" :option="trendOption" autoresize />
            <n-empty v-else description="查询后展示按天趋势" />
          </n-card>

          <n-card :bordered="false" class="work-card">
            <template #header>
              <div class="card-header">
                <span>广告指标明细</span>
                <n-button secondary size="small" :disabled="!permissions?.downloadData || !adReportResult" @click="downloadAdReportDetail">下载广告指标明细 Excel</n-button>
              </div>
            </template>
            <n-data-table v-if="adReportResult" :columns="adReportDetailColumns" :data="adReportResult.detailRows" :scroll-x="1330" />
            <n-empty v-else description="暂无广告指标明细" />
          </n-card>
        </section>
      </template>
    </n-spin>

    <n-modal v-model:show="showReportModal" preset="card" :title="reportModalTitle" class="modal-card">
      <n-form label-placement="top">
        <n-form-item label="报告名称" required>
          <n-input v-model:value="reportForm.name" maxlength="100" show-count placeholder="请输入报告名称" />
        </n-form-item>
        <n-form-item label="元数据模板" required>
          <n-select v-model:value="reportForm.templateId" :options="enabledTemplateOptions" />
        </n-form-item>
        <n-form-item label="报告类型" required>
          <n-radio-group v-model:value="reportForm.reportType" :disabled="Boolean(reportForm.id)">
            <n-radio-button v-for="option in reportCreateTypeOptions" :key="String(option.value)" :value="option.value">
              {{ option.label }}
            </n-radio-button>
          </n-radio-group>
          <template v-if="reportForm.id" #feedback>
            报告创建后不允许修改类型，避免历史数据结构变化。
          </template>
        </n-form-item>
        <n-form-item label="默认时间范围">
          <n-date-picker v-model:value="reportForm.defaultTimeRange" type="daterange" clearable />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showReportModal = false">取消</n-button>
          <n-button type="primary" @click="saveReport">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal :show="showMetricModal" preset="card" title="快速新建广告指标" class="wide-modal" :mask-closable="false" @update:show="handleMetricModalUpdate">
      <n-form label-placement="top">
        <n-grid :cols="2" :x-gap="16">
          <n-gi>
            <n-form-item label="指标名称" required>
              <n-input v-model:value="metricDraft.name" maxlength="100" show-count />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="指标分组">
              <n-select v-model:value="metricDraft.group" :options="metricGroupOptions" placeholder="请选择已有指标分组" />
            </n-form-item>
          </n-gi>
        </n-grid>
        <n-form-item label="描述">
          <n-input v-model:value="metricDraft.description" type="textarea" maxlength="500" show-count />
        </n-form-item>
        <n-grid :cols="2" :x-gap="16">
          <n-gi>
            <n-form-item label="指标类型" required>
              <n-radio-group v-model:value="metricDraft.metricType">
                <n-radio-button value="single">单一指标</n-radio-button>
                <n-radio-button value="composite">组合指标</n-radio-button>
              </n-radio-group>
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="展示格式" required>
              <n-select v-model:value="metricDraft.displayFormat" :options="displayFormatOptions" />
            </n-form-item>
          </n-gi>
        </n-grid>

        <div class="section-header">
          <h2>计算条件</h2>
          <n-space>
            <n-button size="small" secondary @click="addMetricCondition('media_monitor')">+ 媒体监测</n-button>
            <n-button size="small" secondary @click="addMetricCondition('behavior')">+ 行为</n-button>
            <n-button size="small" secondary @click="addMetricCondition('detail')">+ 明细</n-button>
            <n-button size="small" secondary @click="addMetricCondition('tag')">+ 标签</n-button>
            <n-button size="small" secondary @click="addMetricCondition('property')">+ 属性</n-button>
          </n-space>
        </div>
        <div v-for="(condition, index) in metricDraft.conditions" :key="condition.variable" class="metric-condition-card">
          <div class="condition-card-header">
            <n-space align="center">
              <n-tag type="info">{{ condition.variable }}</n-tag>
              <n-text strong>计算条件 {{ index + 1 }}</n-text>
            </n-space>
            <n-button quaternary circle type="error" :render-icon="icon(TrashOutline)" @click="removeMetricCondition(index)" />
          </div>

          <div class="condition-main-grid">
            <n-form-item label="数据来源" required>
              <n-select :value="condition.source" :options="conditionSourceOptions" @update:value="(value: AdMetricConditionSource) => handleMetricSourceChange(condition, value)" />
            </n-form-item>
            <n-form-item label="计算对象" required>
              <n-select v-model:value="condition.calculationObject" :options="metricCalculationObjectOptions" />
            </n-form-item>
            <n-form-item v-if="condition.source === 'behavior' || condition.source === 'media_monitor'" label="行为事件" required>
              <n-select v-model:value="condition.eventName" clearable :options="eventOptionsForTemplate" placeholder="请选择事件" />
            </n-form-item>
            <n-form-item v-else label="字段/标签/属性" required>
              <n-select :value="condition.fieldName" clearable :options="sourceFieldOptions[condition.source]" placeholder="请选择字段" @update:value="(value: string) => handleMetricFieldChange(condition, value)" />
            </n-form-item>
            <n-form-item label="统计口径" required>
              <n-select v-model:value="condition.statistic" :options="metricStatisticOptions" />
            </n-form-item>
            <n-form-item label="ID 类型" required>
              <n-select v-model:value="condition.idType" :options="metricIdTypeOptions" />
            </n-form-item>
            <n-form-item label="聚合方式" required>
              <n-select v-model:value="condition.aggregationMethod" :options="metricAggregationOptions" />
            </n-form-item>
          </div>

          <div class="condition-filter-panel">
            <div class="condition-filter-header">
              <n-text strong>筛选条件</n-text>
              <n-button size="small" secondary @click="addMetricFilter(condition)">添加筛选条件</n-button>
            </div>
            <div v-if="condition.filters.length === 0" class="condition-filter-empty">未添加筛选条件</div>
            <div v-for="(filter, filterIndex) in condition.filters" :key="filter.id" class="condition-filter-row">
              <n-select v-model:value="filter.fieldType" :options="metricFilterFieldOptions" placeholder="字段类型" />
              <n-input v-model:value="filter.fieldName" placeholder="字段名，例如 city / utm_campaign" />
              <n-select v-model:value="filter.operator" :options="metricFilterOperatorOptions" placeholder="关系" />
              <n-input v-model:value="filter.value" placeholder="值，多个用英文逗号分隔" />
              <n-button quaternary circle type="error" :render-icon="icon(TrashOutline)" @click="removeMetricFilter(condition, filterIndex)" />
            </div>
          </div>
        </div>
        <n-form-item label="计算方式" required>
          <n-input v-model:value="metricDraft.formula" placeholder="例如 B / A" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="requestCloseMetricModal">取消</n-button>
          <n-button type="primary" @click="confirmMetric">确定</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showMetricDetailModal" preset="card" title="指标详情" class="modal-card">
      <template v-if="activeMetric">
        <div class="detail-list">
          <div><span>指标名称</span><strong>{{ activeMetric.name }}</strong></div>
          <div><span>描述</span><strong>{{ activeMetric.description || '-' }}</strong></div>
          <div><span>类型</span><strong>{{ activeMetric.metricType === 'single' ? '单一指标' : '组合指标' }}</strong></div>
          <div><span>计算公式</span><strong>{{ activeMetric.formula }}</strong></div>
          <div><span>展示格式</span><strong>{{ activeMetric.displayFormat }}</strong></div>
        </div>
        <n-divider />
        <div class="condition-preview" v-for="condition in activeMetric.conditions" :key="condition.variable">
          <n-tag>{{ condition.variable }}</n-tag>
          <span>{{ condition.source }}</span>
          <span>{{ condition.eventName || condition.fieldDisplayName || condition.fieldName }}</span>
          <span>{{ condition.calculationObject || '-' }}</span>
          <span>{{ condition.statistic }} / {{ condition.aggregationMethod || '-' }}</span>
          <span>{{ condition.idType || '-' }}</span>
        </div>
        <div v-for="condition in activeMetric.conditions" :key="`${condition.variable}_filters`" class="condition-filter-summary">
          <n-text depth="3">{{ condition.variable }} 筛选条件：</n-text>
          <span>{{ condition.filters.length ? condition.filters.map((filter) => `${filter.fieldType}.${filter.fieldName} ${filter.operator} ${filter.value}`).join('；') : '无' }}</span>
        </div>
      </template>
    </n-modal>

    <n-modal v-model:show="showMetricSelector" preset="card" title="自定义指标" class="modal-card">
      <n-input v-model:value="metricSelectorKeyword" clearable placeholder="搜索指标名称" class="metric-selector-search">
        <template #prefix>
          <n-icon><SearchOutline /></n-icon>
        </template>
      </n-input>
      <n-checkbox-group v-model:value="metricSelectorValue">
        <div class="checkbox-list">
          <n-checkbox v-for="option in filteredUserMetricOptions" :key="String(option.value)" :value="option.value">
            {{ option.label }}
          </n-checkbox>
          <n-empty v-if="filteredUserMetricOptions.length === 0" description="未找到匹配指标" />
        </div>
      </n-checkbox-group>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showMetricSelector = false">取消</n-button>
          <n-button type="primary" @click="applyMetricSelector">确定</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showExportModal" preset="card" title="导出分群" class="modal-card">
      <n-alert v-if="exportResult" type="success" title="分群已创建">
        {{ exportResult.segmentName }} 已同步到用户分群模块，创建时间 {{ exportResult.createdAt }}。
      </n-alert>
      <n-alert v-if="exportForm.estimatedUsers <= 0" type="warning">
        当前规则下暂无可导出用户，无法生成分群。
      </n-alert>
      <n-form v-if="!exportResult" label-placement="top">
        <n-form-item label="导出来源">
          <n-input :value="exportForm.sourceName" readonly />
        </n-form-item>
        <n-form-item label="输出 ID 类型" required>
          <n-select v-model:value="exportForm.outputIdType" :options="outputIdOptions" />
        </n-form-item>
        <n-form-item label="分群名称" required>
          <n-input v-model:value="exportForm.segmentName" />
        </n-form-item>
        <n-form-item label="分群描述">
          <n-input v-model:value="exportForm.description" type="textarea" />
        </n-form-item>
        <n-grid :cols="2" :x-gap="16">
          <n-gi>
            <n-form-item label="授权给">
              <n-select v-model:value="exportForm.authTargets" multiple clearable :options="authTargetOptions" />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="分组">
              <n-select v-model:value="exportForm.groupIds" multiple clearable :options="segmentGroupOptions" />
            </n-form-item>
          </n-gi>
        </n-grid>
        <n-form-item label="预估人数">
          <n-input :value="formatNumber(exportForm.estimatedUsers)" readonly />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showExportModal = false">继续分析</n-button>
          <n-button v-if="exportResult" type="primary" @click="goSegmentDetail">前往用户分群</n-button>
          <n-button v-else type="primary" :disabled="exportForm.estimatedUsers <= 0" @click="saveExportSegment">保存</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<style scoped lang="scss">
.ad-analysis-page {
  min-height: 100%;
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
}

.view-stack {
  display: grid;
  gap: 16px;
  min-width: 0;
}

.page-heading,
.card-header,
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.page-heading {
  margin-bottom: 4px;
  align-items: flex-start;
  flex-wrap: wrap;
  min-width: 0;
}

.page-heading > div:first-child {
  min-width: 320px;
  flex: 1 1 420px;
}

.page-heading :deep(.n-space) {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.work-card {
  min-width: 0;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgb(15 23 42 / 6%);
}

.work-card :deep(.n-data-table) {
  min-width: 0;
}

.state-panel {
  min-height: 420px;
  display: grid;
  align-content: center;
  gap: 20px;
}

.project-config-panel,
.failure-state-grid {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  padding: 16px;
}

.project-config-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  color: #64748b;
}

.project-config-head strong {
  color: #0f172a;
}

.project-config-item {
  min-height: 64px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  border: 1px solid #edf2f7;
  border-radius: 8px;
  cursor: pointer;
}

.project-config-item span {
  display: grid;
  gap: 4px;
}

.project-config-item small,
.failure-state-item small {
  color: #64748b;
  line-height: 1.5;
}

.failure-state-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.failure-state-item {
  display: grid;
  gap: 8px;
  align-content: start;
}

.failure-state-item p {
  margin: 0;
  color: #334155;
  line-height: 1.6;
}

.metric-tile {
  min-height: 112px;
  padding: 18px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 10px 30px rgb(15 23 42 / 5%);
}

.metric-tile {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.toolbar,
.filter-tags {
  margin-bottom: 16px;
}

.audience-filter-builder {
  margin: 2px 0 16px;
}

.audit-list {
  display: grid;
  gap: 8px;
  overflow-x: auto;
}

.audit-row {
  display: grid;
  grid-template-columns: 1.15fr 1fr 1fr 1fr 1.8fr 1fr 1.2fr;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  background: #f8fafc;
  color: #475569;
  font-size: 13px;
  min-width: 1080px;
  align-items: center;
}

.audit-head {
  background: #eef2ff;
  color: #475569;
  font-weight: 650;
}

.audit-action {
  color: #1f2937;
  font-weight: 650;
}

.audit-config {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-grid {
  display: grid;
  grid-template-columns: 1.2fr 1.4fr 1.2fr 120px 64px;
  gap: 12px;
  align-items: center;
  margin-top: 10px;
}

.event-grid-head {
  margin-top: 0;
  color: #64748b;
  font-size: 13px;
  font-weight: 650;
}

.section-header h2 {
  margin: 0;
  font-size: 16px;
}

.metric-condition-card {
  padding: 14px;
  margin-bottom: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}

.condition-card-header,
.condition-filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.condition-main-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.condition-filter-panel {
  padding-top: 4px;
}

.condition-filter-row {
  display: grid;
  grid-template-columns: 150px 1fr 140px 1.4fr 42px;
  gap: 10px;
  align-items: center;
  margin-top: 10px;
}

.condition-filter-empty {
  padding: 10px 12px;
  border-radius: 6px;
  background: white;
  color: #64748b;
  font-size: 13px;
}

.middle-events {
  display: grid;
  gap: 10px;
  margin-bottom: 16px;
}

.middle-event-row {
  display: grid;
  grid-template-columns: minmax(240px, 420px) 42px;
  gap: 10px;
  align-items: center;
}

.chart-card {
  min-height: 380px;
}

.chart {
  height: 320px;
}

.sankey-card {
  min-height: 480px;
}

.sankey-chart {
  height: 410px;
}

.path-info {
  margin-bottom: 12px;
}

.path-detail-panel {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.path-detail-tile,
.path-detail-selected {
  display: grid;
  gap: 4px;
  padding: 12px;
  border-radius: 8px;
  background: #f8fafc;
}

.path-detail-tile span,
.path-detail-selected span {
  color: #64748b;
  font-size: 12px;
}

.path-detail-tile strong,
.path-detail-selected strong {
  color: #111827;
  font-size: 16px;
}

.path-detail-tile small,
.path-detail-selected small {
  color: #475569;
  line-height: 1.45;
}

.path-detail-selected {
  grid-column: 1 / -1;
}

.overlap-detail-panel {
  margin-top: 16px;
  padding: 14px;
  border-radius: 8px;
  background: #f8fafc;
}

.overlap-detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.overlap-detail-head p {
  margin: 4px 0 0;
  color: #64748b;
}

.overlap-user-list {
  display: grid;
  gap: 6px;
}

.overlap-user-row {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr 0.9fr 1.4fr;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  background: white;
  color: #475569;
  font-size: 13px;
}

.overlap-user-head {
  background: #eef2ff;
  color: #475569;
  font-weight: 650;
}

.metric-selector-search {
  margin-bottom: 14px;
}

.modal-card {
  width: 560px;
}

.wide-modal {
  width: 960px;
}

.detail-list {
  display: grid;
  gap: 12px;
}

.detail-list div,
.condition-preview {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 12px;
  align-items: center;
}

.detail-list span {
  color: #64748b;
}

.condition-preview {
  grid-template-columns: 54px 1fr 1fr 1fr 1fr 110px;
  padding: 8px 0;
}

.condition-filter-summary {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 12px;
  padding: 6px 0;
  color: #475569;
}

.checkbox-list {
  display: grid;
  gap: 12px;
}
</style>
