<script setup lang="ts">
import {
  NAlert,
  NButton,
  NCard,
  NCheckbox,
  NCheckboxGroup,
  NCollapse,
  NCollapseItem,
  NDataTable,
  NDatePicker,
  NDescriptions,
  NDescriptionsItem,
  NDivider,
  NDrawer,
  NDrawerContent,
  NEmpty,
  NGi,
  NGrid,
  NInput,
  NInputNumber,
  NModal,
  NSelect,
  NSpace,
  NSpin,
  NStatistic,
  NSwitch,
  NTabPane,
  NTabs,
  NTag,
  NTooltip,
} from 'naive-ui'
import type { DataTableColumns, DataTableRowKey, SelectGroupOption, SelectOption, TagProps } from 'naive-ui'
import dayjs from 'dayjs'
import { computed, h, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ChartTypeSwitcher from '@/components/charts/ChartTypeSwitcher.vue'
import EventAnalysisChartRenderer from '@/components/charts/EventAnalysisChartRenderer.vue'
import EventResultTable from '@/components/charts/EventResultTable.vue'
import FormulaDisplayConfig from '@/components/business/formula-editor/FormulaDisplayConfig.vue'
import FormulaEditorPanel from '@/components/business/formula-editor/FormulaEditor.vue'
import MetricConditionPicker from '@/components/business/formula-editor/MetricConditionPicker.vue'
import { eventAnalysisService } from '@/services/eventAnalysisService'
import type {
  AffectedUser,
  AnalysisConfigState,
  AnalysisDirtyState,
  AnalysisChartConfig,
  AnalysisInteractionState,
  AnalysisQueryConfig,
  AnalysisTableConfig,
  AnalysisQueryState,
  BehaviorFilterType,
  ChartConfig,
  ChartType,
  DashboardRefreshMode,
  DashboardRefreshSchedule,
  DashboardLocation,
  DashboardSummaryItem,
  DashboardWidgetChartType,
  DashboardWidgetSaveObject,
  DimensionContribution,
  DynamicMatchMode,
  DynamicMatchTargetType,
  DownloadContent,
  DownloadFormat,
  DownloadRange,
  EventAnalysisDetailRow,
  EventAnalysisMetricCard,
  EventAnalysisQueryConfig,
  EventAnalysisResult,
  EventAnalysisTemplate,
  EventMetadata,
  EventMetricConfig,
  EventPropertyDataType,
  FilterCondition,
  FilterOperator,
  FilterSourceType,
  ComparisonGroup,
  GroupByConfig,
  GroupSourceType,
  GroupType,
  MetricOperator,
  RecommendedAction,
  SavedAnalysisVisibility,
} from '@/types/eventAnalysis'
import type { CustomFormulaMetric, FormulaCondition, FormulaOperator, FormulaToken } from '@/types/formula'
import { validateFormulaTokens } from '@/utils/formulaValidator'

const defaultChartConfig: ChartConfig = {
  title: '',
  chartType: 'line',
  selectedMetricIds: ['metric_ad_watch_pv'],
  selectedGroupById: 'group-coin-balance-level',
  selectedGroupValues: ['全部活跃用户', '低金币高活跃用户', '正常金币高活跃用户'],
  xAxisMode: 'time',
  yAxisMode: 'single',
  leftAxisMetricIds: ['metric_ad_watch_pv'],
  rightAxisMetricIds: ['metric_ad_complete_rate'],
  dualAxisRenderMode: 'bar_line',
  barDirection: 'vertical',
  displayMode: 'value',
  topN: 10,
  mergeOthers: true,
  showLegend: true,
  showDataLabel: false,
  showTooltip: true,
  showCompareLine: true,
  showPredictionBand: true,
  showAnomalyPoint: true,
  showCumulativeValue: true,
  showGrowthRate: true,
  tableMode: 'flat',
}

const router = useRouter()

const queryState = ref<AnalysisQueryState>('idle')
const configState = ref<AnalysisConfigState>('saved')
const analysisDirtyState = ref<AnalysisDirtyState>('new')
const activeTab = ref('detail')
const activeConfigPanels = ref<string>('metrics')
const showAllMetrics = ref(false)
const errorMessage = ref('')
const actionNotice = ref('')
const selectedTemplateId = ref('template-ad-watch-decline')
const selectedEventName = ref('ad_watch_complete')
const selectedMetricId = ref('metric_ad_watch_pv')
const temporaryFilter = ref('')
const contributionKeyword = ref('')
const selectedAnomalyDate = ref('')
const selectedContributionId = ref('')
const confidenceInterval = ref(95)
const anomalyLookbackDays = ref(60)
const contributionPinState = ref<Record<string, 'top' | 'bottom' | undefined>>({})
const selectedUserProfileFields = ref<string[]>([
  'attr:user_level',
  'attr:coin_balance',
  'attr:active_days_7d',
  'attr:game_rounds_7d',
  'attr:ad_watch_count_7d',
  'attr:ad_watch_decline_rate_3d',
  'attr:payment_status',
  'tag:churn_risk',
  'attr:last_login_time',
])
const defaultUserProfileFields = [...selectedUserProfileFields.value]
const userFieldKeyword = ref('')
const userFieldSourceFilter = ref<'all' | 'attr' | 'tag'>('all')
const queryJson = ref('')
const showGrowthColumns = ref(false)
const showFormulaModal = ref(false)
const showDownloadModal = ref(false)
const showDashboardModal = ref(false)
const showSaveAnalysisModal = ref(false)
const showMetricConfigModal = ref(false)
const showFilterConfigModal = ref(false)
const showComparisonConfigModal = ref(false)
const showGroupConfigModal = ref(false)
const showClearFilterConfirmModal = ref(false)
const showChartConfigDrawer = ref(false)
const drawerVisible = ref(false)
const selectedRow = ref<EventAnalysisDetailRow | null>(null)
const checkedUserRowKeys = ref<DataTableRowKey[]>([])

const metadata = ref<EventMetadata | null>(null)
const template = ref<EventAnalysisTemplate | null>(null)
const chartConfig = ref<ChartConfig>({ ...defaultChartConfig })
const result = ref<EventAnalysisResult | null>(null)
const affectedUsers = ref<AffectedUser[]>([])
const dashboardLocations = ref<DashboardLocation[]>([])

const downloadRange = ref<DownloadRange>('page_result')
const downloadContents = ref<DownloadContent[]>(['chart_data', 'detail_data'])
const downloadFormat = ref<DownloadFormat>('excel')
const dashboardSaveObject = ref<DashboardWidgetSaveObject>('chart')
const dashboardChartName = ref('广告观看次数趋势图')
const dashboardDescription = ref('')
const dashboardId = ref('dash-personal-overview')
const dashboardSpaceType = ref<'all' | 'personal' | 'team' | 'public'>('personal')
const newDashboardName = ref('')
const dashboardTags = ref<string[]>(['事件分析', '广告观看下降'])
const dashboardSaveChartType = ref<DashboardWidgetChartType>('line')
const dashboardDisplayItems = ref<DashboardSummaryItem[]>(['latest', 'wow'])
const dashboardRefreshMode = ref<DashboardRefreshMode>('open')
const dashboardRefreshSchedule = ref<DashboardRefreshSchedule>('daily_9')
const dashboardSaving = ref(false)
const dashboardSaveResultLink = ref('')
const currentSavedAnalysisId = ref('')
const currentSavedAnalysisVersion = ref(0)
const currentSavedAnalysisUpdatedAt = ref('')
const saveAnalysisMode = ref<'create' | 'update' | 'copy'>('create')
const savingAnalysis = ref(false)
const saveAnalysisDraft = ref({
  name: '广告观看次数 - 事件分析',
  description: '',
  folderId: 'personal-my-analysis',
  visibility: 'private' as SavedAnalysisVisibility,
  tags: ['事件分析', '广告观看下降'],
  saveChartState: true,
  saveTableState: true,
})
const metricEditMode = ref<'create' | 'edit'>('create')
const filterEditMode = ref<'create' | 'edit'>('create')
const comparisonEditMode = ref<'create' | 'edit'>('create')
const comparisonFilterEditIndex = ref(-1)
const comparisonFilterValueText = ref('')
const comparisonFilterValueMode = ref<'select' | 'manual'>('select')
const comparisonFilterSelectedValues = ref<Array<string | number>>([])
const groupEditMode = ref<'create' | 'edit'>('create')
const editingMetricId = ref('')
const editingFilterId = ref('')
const editingComparisonId = ref('')
const editingGroupId = ref('')
const filterValueText = ref('')
const filterValueMode = ref<'select' | 'manual'>('select')
const filterSelectedValues = ref<Array<string | number>>([])
const childFilterEditorVisible = ref(false)
const childFilterEditIndex = ref(-1)
const childFilterValueText = ref('')
const childFilterValueMode = ref<'select' | 'manual'>('select')
const childFilterSelectedValues = ref<Array<string | number>>([])
const showMetricFilterConfigModal = ref(false)
const metricFilterEditIndex = ref(-1)
const metricFilterValueText = ref('')
const editingFormulaId = ref('')
const selectedFormulaConditionId = ref('')
const formulaConstantValue = ref(100)
const timezone = ref('UTC+8')
const statisticsSubject = ref('user')
const customTimeRangeValue = ref<[number, number] | null>(null)
const customComparisonRangeValue = ref<[number, number] | null>(null)
const chartSortMode = ref('metric_desc')
const chartColorScheme = ref('business')

type EventSelectOption = SelectOption | SelectGroupOption

interface PersistedLastQuery {
  queriedAt: number
  queryConfig: EventAnalysisQueryConfig
}

const LAST_QUERY_STORAGE_KEY = 'event-analysis:last-query'
const LAST_QUERY_MAX_AGE_MS = 24 * 60 * 60 * 1000

const numericMetricOperators: MetricOperator[] = [
  'SUM',
  'AVG',
  'MAX',
  'MIN',
  'PER_USER_AVG',
  'PERCENTILE_25',
  'PERCENTILE_50',
  'PERCENTILE_75',
  'PERCENTILE_90',
]

const propertyMetricOperators: MetricOperator[] = [
  ...numericMetricOperators,
  'DISTINCT_COUNT',
  'DISTINCT_USER_PROPERTY',
]

const createFormulaDraft = (): CustomFormulaMetric => ({
  id: `formula_custom_${Date.now()}`,
  name: '未命名公式指标',
  metricType: 'formula',
  tokens: [],
  conditions: [],
  displayConfig: {
    format: 'percent',
    precision: 1,
    unit: '%',
    showAtomicMetrics: true,
  },
  enabled: true,
})

const createMetricDraft = (): EventMetricConfig => ({
  id: `metric_custom_${Date.now()}`,
  name: '未命名事件指标',
  eventName: 'ad_watch_complete',
  metricType: 'event',
  operator: 'PV',
  unit: '次',
  precision: 0,
  filters: [],
  enabled: true,
})

const createFilterDraft = (): FilterCondition => ({
  id: `filter_custom_${Date.now()}`,
  sourceType: 'event_property',
  field: 'ad_position',
  fieldDisplayName: '广告位',
  operator: 'equals',
  value: '金币不足弹窗',
  displayValue: '金币不足弹窗',
  logic: 'AND',
})

const createComparisonDraft = (): ComparisonGroup => ({
  id: `compare_custom_${Date.now()}`,
  name: '未命名对照组',
  description: '暂无条件。',
  filters: [],
  colorKey: '#8b5cf6',
  enabled: true,
})

const createGroupDraft = (): GroupByConfig => ({
  id: `group_custom_${Date.now()}`,
  field: 'ad_position',
  displayName: '广告位',
  sourceType: 'event_property',
  groupType: 'enum',
  topN: 10,
  enabled: true,
  applyToMetricIds: ['metric_ad_watch_pv'],
})

const metricDraft = ref<EventMetricConfig>(createMetricDraft())
const filterDraft = ref<FilterCondition>(createFilterDraft())
const childFilterDraft = ref<FilterCondition>(createFilterDraft())
const comparisonFilterDraft = ref<FilterCondition>(createFilterDraft())
const metricFilterDraft = ref<FilterCondition>(createFilterDraft())
const comparisonDraft = ref<ComparisonGroup>(createComparisonDraft())
const groupDraft = ref<GroupByConfig>(createGroupDraft())
const formulaDraft = ref<CustomFormulaMetric>(createFormulaDraft())

const loading = computed(() => queryState.value === 'loading' || queryState.value === 'validating')
const metricConfigs = computed(() => template.value?.metricConfigs ?? [])
const visibleMetricConfigs = computed(() =>
  showAllMetrics.value ? metricConfigs.value : metricConfigs.value.slice(0, 3),
)
const filters = computed(() => template.value?.filters ?? [])
const comparisonGroups = computed(() => template.value?.comparisonGroups ?? [])
const groupByConfigs = computed<GroupByConfig[]>(() => template.value?.groupByConfigs ?? [])
const formulaMetrics = computed(() => template.value?.formulaMetrics ?? [])
const enabledComparisonGroupNames = computed(() =>
  comparisonGroups.value.filter((group) => group.enabled).map((group) => group.name),
)
const selectedUsers = computed(() =>
  affectedUsers.value.filter((user) => checkedUserRowKeys.value.includes(user.userId)),
)

const userPropertyFieldMap: Record<string, {
  label: string
  key: keyof AffectedUser
  width: number
}> = {
  user_level: {
    label: '用户等级',
    key: 'userLevel',
    width: 88,
  },
  coin_balance: {
    label: '金币余额',
    key: 'coinBalance',
    width: 96,
  },
  active_days_7d: {
    label: '近 7 日活跃天数',
    key: 'activeDays7d',
    width: 124,
  },
  game_rounds_7d: {
    label: '近 7 日游戏局数',
    key: 'gameRounds7d',
    width: 124,
  },
  ad_watch_count_7d: {
    label: '近 7 日广告观看次数',
    key: 'adWatchCount7d',
    width: 146,
  },
  ad_watch_decline_rate_3d: {
    label: '近 3 日广告下降率',
    key: 'adWatchDeclineRate3d',
    width: 132,
  },
  payment_status: {
    label: '付费状态',
    key: 'paymentStatus',
    width: 96,
  },
  last_login_time: {
    label: '最近登录时间',
    key: 'lastLoginTime',
    width: 148,
  },
}

const userTagValueGetters: Record<string, (user: AffectedUser) => string> = {
  churn_risk: (user: AffectedUser) => user.churnRisk,
  active_level: (user: AffectedUser) => user.activeDays7d >= 6 ? '高活跃' : user.activeDays7d >= 4 ? '中活跃' : '低活跃',
  coin_balance_level: (user: AffectedUser) => user.coinBalance < 200 ? '低金币' : user.coinBalance < 400 ? '中金币' : '高金币',
  ad_preference: (user: AffectedUser) => user.adWatchCount7d >= 18 ? '高接受' : user.adWatchCount7d >= 10 ? '中接受' : '低接受',
  game_preference: (user: AffectedUser) => user.gameRounds7d % 3 === 0 ? '斗地主' : user.gameRounds7d % 3 === 1 ? '麻将' : '德州扑克',
  lifecycle_stage: (user: AffectedUser) => user.userLevel.includes('2') ? '成熟期' : '成长期',
  payment_potential: (user: AffectedUser) => user.paymentStatus === '未付费' ? '中' : '高',
  task_sensitivity: (user: AffectedUser) => user.adWatchDeclineRate3d < -50 ? '高' : '中',
}

interface UserProfileFieldOption {
  label: string
  value: string
  source: 'attr' | 'tag'
  description: string
}

const userProfileFieldList = computed<UserProfileFieldOption[]>(() => {
  const metadataValue = metadata.value
  const attributeOptions: UserProfileFieldOption[] = [
    ...(metadataValue?.userAttributes ?? []).map((attribute) => ({
      label: attribute.displayName,
      value: `attr:${attribute.field}`,
      source: 'attr' as const,
      description: attribute.description,
    })),
    { label: '近 7 日活跃天数', value: 'attr:active_days_7d', source: 'attr', description: '近 7 天活跃天数。' },
    { label: '近 7 日广告观看次数', value: 'attr:ad_watch_count_7d', source: 'attr', description: '近 7 天广告观看次数。' },
    { label: '近 3 日广告下降率', value: 'attr:ad_watch_decline_rate_3d', source: 'attr', description: '近 3 天广告观看次数下降率。' },
  ]
  const tagOptions: UserProfileFieldOption[] = (metadataValue?.userTags ?? []).map((tag) => ({
    label: tag.displayName,
    value: `tag:${tag.field}`,
    source: 'tag',
    description: tag.description,
  }))

  return [...attributeOptions, ...tagOptions]
})

const filteredUserProfileFieldList = computed(() => {
  const keyword = userFieldKeyword.value.trim().toLowerCase()

  return userProfileFieldList.value.filter((field) => {
    const matchesSource = userFieldSourceFilter.value === 'all' || field.source === userFieldSourceFilter.value
    const matchesKeyword =
      !keyword ||
      field.label.toLowerCase().includes(keyword) ||
      field.value.toLowerCase().includes(keyword) ||
      field.description.toLowerCase().includes(keyword)

    return matchesSource && matchesKeyword
  })
})

const selectedUserProfileFieldDetails = computed(() =>
  selectedUserProfileFields.value
    .map((fieldValue) => userProfileFieldList.value.find((field) => field.value === fieldValue))
    .filter((field): field is UserProfileFieldOption => Boolean(field)),
)

const toggleUserProfileField = (fieldValue: string): void => {
  selectedUserProfileFields.value = selectedUserProfileFields.value.includes(fieldValue)
    ? selectedUserProfileFields.value.filter((value) => value !== fieldValue)
    : [...selectedUserProfileFields.value, fieldValue]
}

const selectFilteredUserProfileFields = (): void => {
  const fieldValues = filteredUserProfileFieldList.value.map((field) => field.value)
  selectedUserProfileFields.value = Array.from(new Set([...selectedUserProfileFields.value, ...fieldValues]))
}

const clearUserProfileFields = (): void => {
  selectedUserProfileFields.value = []
}

const resetUserProfileFields = (): void => {
  selectedUserProfileFields.value = [...defaultUserProfileFields]
}

const removeUserProfileField = (fieldValue: string): void => {
  selectedUserProfileFields.value = selectedUserProfileFields.value.filter((value) => value !== fieldValue)
}

const getFieldSourceLabel = (source: UserProfileFieldOption['source']): string => source === 'attr' ? '属性' : '标签'

const userFieldSourceOptions: SelectOption[] = [
  { label: '全部字段', value: 'all' },
  { label: '用户属性', value: 'attr' },
  { label: '用户标签', value: 'tag' },
]

const userDrawerSummary = computed(() => {
  const users = affectedUsers.value
  const userCount = users.length || 1
  const averageCoinBalance = Math.round(users.reduce((sum, user) => sum + user.coinBalance, 0) / userCount)
  const averageDeclineRate = users.reduce((sum, user) => sum + user.adWatchDeclineRate3d, 0) / userCount
  const highRiskRate = users.filter((user) => user.churnRisk === '高').length / userCount * 100

  return {
    affectedUsers: selectedRow.value?.affectedUsers ?? users.length,
    averageCoinBalance,
    averageDeclineRate,
    highRiskRate,
  }
})

const eventOptions = computed<EventSelectOption[]>(() => {
  const events = metadata.value?.events ?? []
  const groups: Array<{ key: string; label: string; type: 'general' | 'virtual' | 'circle' }> = [
    { key: 'general-events', label: '一般事件', type: 'general' },
    { key: 'virtual-events', label: '虚拟事件', type: 'virtual' },
    { key: 'circle-events', label: '圈选事件', type: 'circle' },
  ]

  return groups.map((group) => ({
    type: 'group',
    key: group.key,
    label: group.label,
    children: events
      .filter((event) => event.eventType === group.type)
      .map((event) => ({
        label: `${event.displayName} ${event.eventName}`,
        value: event.eventName,
      })),
  }))
})

const metricTypeOptions: SelectOption[] = [
  { label: '事件指标', value: 'event' },
  { label: '属性指标', value: 'property' },
  { label: '自定义指标', value: 'custom' },
  { label: '公式指标', value: 'formula' },
]

const selectedDraftEvent = computed(() =>
  metadata.value?.events.find((event) => event.eventName === metricDraft.value.eventName),
)

const numericPropertyOptions = computed(() =>
  (selectedDraftEvent.value?.properties ?? []).filter((property) => property.dataType === 'number'),
)

const metricNeedsProperty = computed(() => propertyMetricOperators.includes(metricDraft.value.operator))

const metricDraftStatus = computed(() => {
  if (!metricDraft.value.eventName || !metricDraft.value.operator) {
    return '未完成'
  }

  if (metricNeedsProperty.value && !metricDraft.value.propertyName) {
    return '部分完成'
  }

  return '已完成'
})

const metricOperatorOptions = computed<Array<SelectOption & { value: MetricOperator }>>(() => {
  const hasNumericProperty = numericPropertyOptions.value.length > 0

  return [
    { label: 'PV 总次数', value: 'PV' },
    { label: 'UV 触发用户数', value: 'UV' },
    { label: 'PV/UV 人均次数', value: 'PV_UV' },
    { label: 'UV/AU 渗透率', value: 'UV_AU' },
    { label: 'SUM 求和', value: 'SUM', disabled: !hasNumericProperty },
    { label: 'AVG 平均值', value: 'AVG', disabled: !hasNumericProperty },
    { label: 'MAX 最大值', value: 'MAX', disabled: !hasNumericProperty },
    { label: 'MIN 最小值', value: 'MIN', disabled: !hasNumericProperty },
    { label: 'PER_USER_AVG 人均值', value: 'PER_USER_AVG', disabled: !hasNumericProperty },
    { label: 'P25 下四分位数', value: 'PERCENTILE_25', disabled: !hasNumericProperty },
    { label: 'P50 中位数', value: 'PERCENTILE_50', disabled: !hasNumericProperty },
    { label: 'P75 上四分位数', value: 'PERCENTILE_75', disabled: !hasNumericProperty },
    { label: 'P90 分位数', value: 'PERCENTILE_90', disabled: !hasNumericProperty },
    { label: 'DISTINCT_COUNT 属性去重数', value: 'DISTINCT_COUNT' },
    { label: 'DISTINCT_USER_PROPERTY 属性与用户去重', value: 'DISTINCT_USER_PROPERTY' },
    { label: 'CUSTOM 自定义', value: 'CUSTOM' },
    { label: 'FORMULA 公式', value: 'FORMULA' },
  ]
})

const sourceTypeOptions: Array<SelectOption & { value: FilterSourceType }> = [
  { label: '事件属性', value: 'event_property' },
  { label: '用户属性', value: 'user_property' },
  { label: '用户标签', value: 'user_tag' },
  { label: '用户分群', value: 'segment' },
  { label: '行为条件', value: 'behavior' },
  { label: '动态匹配', value: 'dynamic_match' },
  { label: '公共属性', value: 'common_property' },
]

const allFilterOperatorOptions: Array<SelectOption & { value: FilterOperator }> = [
  { label: '等于', value: 'equals' },
  { label: '不等于', value: 'not_equals' },
  { label: '属于', value: 'in' },
  { label: '不属于', value: 'not_in' },
  { label: '大于', value: 'gt' },
  { label: '大于等于', value: 'gte' },
  { label: '小于', value: 'lt' },
  { label: '小于等于', value: 'lte' },
  { label: '区间', value: 'between' },
  { label: '包含', value: 'contains' },
  { label: '正则匹配', value: 'regex' },
  { label: '发生过', value: 'done' },
  { label: '未发生', value: 'not_done' },
  { label: '依次做过', value: 'sequence_done' },
  { label: '今天', value: 'today' },
  { label: '昨天', value: 'yesterday' },
  { label: '过去 N 天', value: 'last_n_days' },
  { label: '早于', value: 'before' },
  { label: '晚于', value: 'after' },
]

const groupSourceTypeOptions: Array<SelectOption & { value: GroupSourceType }> = [
  { label: '事件属性', value: 'event_property' },
  { label: '用户属性', value: 'user_property' },
  { label: '用户标签', value: 'user_tag' },
  { label: '用户分群', value: 'segment' },
  { label: '公共属性', value: 'common_property' },
]

const groupTypeOptions: Array<SelectOption & { value: GroupType }> = [
  { label: '枚举', value: 'enum' },
  { label: '数值区间', value: 'number_range' },
  { label: '时间桶', value: 'datetime_bucket' },
]

const formulaMetricOptions = computed<SelectOption[]>(() =>
  metricConfigs.value.map((metric) => ({
    label: `${metric.name} · ${metric.operator}`,
    value: metric.id,
  })),
)

const chartMetricOptions = computed<SelectOption[]>(() =>
  metricConfigs.value
    .filter((metric) => metric.enabled)
    .map((metric) => ({
      label: metric.name,
      value: metric.id,
    })),
)

const formulaConditionOptions = computed<SelectOption[]>(() =>
  formulaDraft.value.conditions.map((condition) => ({
    label: condition.label,
    value: condition.id,
  })),
)

const timeRangeOptions: SelectOption[] = [
  { label: '今天', value: 'today' },
  { label: '昨天', value: 'yesterday' },
  { label: '过去 7 天', value: 'last_7_days' },
  { label: '过去 14 天', value: 'last_14_days' },
  { label: '过去 30 天', value: 'last_30_days' },
  { label: '过去 60 天', value: 'last_60_days' },
  { label: '过去 180 天', value: 'last_180_days' },
  { label: '自定义', value: 'custom' },
]

const getSelectedDateSpanDays = (startDate?: string, endDate?: string): number => {
  const timeRange = template.value?.timeRange

  if (!timeRange && (!startDate || !endDate)) {
    return 14
  }

  return Math.max(
    dayjs(endDate ?? timeRange?.endDate).diff(dayjs(startDate ?? timeRange?.startDate), 'day') + 1,
    1,
  )
}

const isGranularityAvailable = (
  granularity: 'hour' | 'day' | 'week',
  startDate?: string,
  endDate?: string,
): boolean => {
  const days = getSelectedDateSpanDays(startDate, endDate)

  if (days <= 1) {
    return granularity === 'hour'
  }

  if (days <= 7) {
    return granularity === 'hour' || granularity === 'day'
  }

  if (days <= 30) {
    return granularity === 'day' || granularity === 'week'
  }

  return granularity === 'week'
}

const granularityOptions = computed<SelectOption[]>(() => [
  { label: '5 分钟（后续版本开放）', value: 'minute_5', disabled: true },
  { label: '小时', value: 'hour', disabled: !isGranularityAvailable('hour') },
  { label: '天', value: 'day', disabled: !isGranularityAvailable('day') },
  { label: '周', value: 'week', disabled: !isGranularityAvailable('week') },
  { label: '月（后续版本开放）', value: 'month', disabled: true },
])

const comparisonTypeOptions: SelectOption[] = [
  { label: '不对比', value: 'none' },
  { label: '上一周期', value: 'previous_period' },
  { label: '上周同期', value: 'same_week' },
  { label: '上月同期（后续开放）', value: 'same_month', disabled: true },
  { label: '去年同期（后续开放）', value: 'same_year', disabled: true },
  { label: '自定义对比', value: 'custom' },
]

const chartSortOptions: SelectOption[] = [
  { label: '指标值降序', value: 'metric_desc' },
  { label: '指标值升序', value: 'metric_asc' },
  { label: '环比变化降序', value: 'change_desc' },
  { label: '下降贡献度降序', value: 'contribution_desc' },
]

const chartColorSchemeOptions: SelectOption[] = [
  { label: '业务蓝绿', value: 'business' },
  { label: '风险红橙', value: 'risk' },
  { label: '对比多色', value: 'contrast' },
]

const chartTypeLabelMap: Record<ChartType, string> = {
  line: '折线图',
  stacked: '堆叠图',
  bar: '柱形图',
  dual_axis: '双轴图',
  donut: '环形图',
  pie: '饼图',
  percentage: '百分比图',
  cumulative: '累积图',
}

const timezoneOptions: SelectOption[] = [
  { label: 'UTC+8 北京时间', value: 'UTC+8' },
  { label: 'UTC+1 欧洲中部时间', value: 'UTC+1' },
]

const statisticsSubjectOptions: SelectOption[] = [
  { label: '用户', value: 'user' },
  { label: '设备', value: 'device' },
  { label: '账号', value: 'account' },
]

const behaviorTypeOptions: Array<SelectOption & { value: BehaviorFilterType }> = [
  { label: '做过', value: 'done' },
  { label: '没做过', value: 'not_done' },
  { label: '依次做过', value: 'sequence_done' },
]

const countOperatorOptions: Array<SelectOption & { value: FilterOperator }> = [
  { label: '等于', value: 'equals' },
  { label: '大于', value: 'gt' },
  { label: '大于等于', value: 'gte' },
  { label: '小于', value: 'lt' },
  { label: '小于等于', value: 'lte' },
]

const dynamicMatchTargetOptions: Array<SelectOption & { value: DynamicMatchTargetType }> = [
  { label: '用户标签', value: 'user_tag' },
  { label: '用户分群', value: 'segment' },
]

const dynamicMatchModeOptions: Array<SelectOption & { value: DynamicMatchMode }> = [
  { label: '事件发生日', value: 'event_day' },
  { label: '事件发生前一日', value: 'previous_day' },
  { label: '最新结果', value: 'latest' },
]

const metricPropertyOptions = computed<SelectOption[]>(() => {
  const event = metadata.value?.events.find((item) => item.eventName === metricDraft.value.eventName)

  return (
    event?.properties.map((property) => ({
      label: `${property.displayName} ${property.propertyName}`,
      value: property.propertyName,
      disabled:
        numericMetricOperators.includes(metricDraft.value.operator) && property.dataType !== 'number',
    })) ?? []
  )
})

const getFilterFieldOptions = (sourceType: FilterSourceType): SelectOption[] => {
  if (!metadata.value) {
    return []
  }

  if (sourceType === 'user_property') {
    return metadata.value.userAttributes.map((item) => ({
      label: `${item.displayName} ${item.field}`,
      value: item.field,
    }))
  }

  if (sourceType === 'user_tag') {
    return metadata.value.userTags.map((item) => ({
      label: `${item.displayName} ${item.field}`,
      value: item.field,
    }))
  }

  if (sourceType === 'segment') {
    return metadata.value.userSegments.map((item) => ({
      label: `${item.name} ${item.id}`,
      value: item.id,
    }))
  }

  if (sourceType === 'behavior') {
    return [
      { label: '过去 7 天做过游戏结束 >= 5 次', value: 'game_rounds_7d' },
      { label: '过去 3 天广告观看完成次数下降 > 30%', value: 'ad_watch_decline_rate_3d' },
      { label: '过去 7 天依次做过 游戏结束 → 广告入口曝光 → 广告观看完成', value: 'sequence_game_ad_watch' },
    ]
  }

  if (sourceType === 'dynamic_match') {
    return [
      { label: '广告观看发生当天属于低金币标签', value: 'ad_watch_day_low_coin' },
      { label: '广告观看前一日属于近 7 日活跃用户', value: 'ad_watch_prev_day_active' },
      { label: '按最新结果匹配低金币高活跃分群', value: 'latest_low_coin_high_active' },
    ]
  }

  return metadata.value.events
    .flatMap((event) => event.properties)
    .map((property) => ({
      label: `${property.displayName} ${property.propertyName}`,
      value: property.propertyName,
    }))
}

type FilterFieldKind = EventPropertyDataType | 'segment' | 'tag'

const getFieldKind = (sourceType: FilterSourceType, field: string): FilterFieldKind => {
  const metadataValue = metadata.value

  if (sourceType === 'segment') {
    return 'segment'
  }

  if (sourceType === 'user_tag') {
    return 'tag'
  }

  if (!metadataValue) {
    return 'string'
  }

  if (sourceType === 'user_property') {
    return metadataValue.userAttributes.find((item) => item.field === field)?.dataType ?? 'string'
  }

  const eventProperty = metadataValue.events
    .flatMap((event) => event.properties)
    .find((property) => property.propertyName === field)

  return eventProperty?.dataType ?? 'string'
}

const getOperatorOptionsByField = (
  sourceType: FilterSourceType,
  field: string,
): Array<SelectOption & { value: FilterOperator }> => {
  if (sourceType === 'behavior') {
    return allFilterOperatorOptions.filter((option) =>
      ['done', 'not_done', 'sequence_done'].includes(option.value),
    )
  }

  if (sourceType === 'dynamic_match') {
    return allFilterOperatorOptions.filter((option) => ['equals', 'in'].includes(option.value))
  }

  const kind = getFieldKind(sourceType, field)
  const operatorMap: Record<FilterFieldKind, FilterOperator[]> = {
    string: ['equals', 'not_equals', 'contains', 'not_contains', 'in', 'not_in', 'regex'],
    number: ['equals', 'gt', 'gte', 'lt', 'lte', 'between'],
    datetime: ['today', 'yesterday', 'last_n_days', 'before', 'after', 'between'],
    boolean: ['equals', 'not_equals'],
    segment: ['in', 'not_in'],
    tag: ['equals', 'not_equals', 'in', 'not_in'],
  }
  const allowedOperators = operatorMap[kind]

  return allFilterOperatorOptions.filter((option) => allowedOperators.includes(option.value))
}

const filterOperatorOptions = computed<Array<SelectOption & { value: FilterOperator }>>(() =>
  getOperatorOptionsByField(filterDraft.value.sourceType, filterDraft.value.field),
)

const childFilterOperatorOptions = computed<Array<SelectOption & { value: FilterOperator }>>(() =>
  getOperatorOptionsByField(childFilterDraft.value.sourceType, childFilterDraft.value.field),
)

const comparisonFilterOperatorOptions = computed<Array<SelectOption & { value: FilterOperator }>>(() =>
  getOperatorOptionsByField(comparisonFilterDraft.value.sourceType, comparisonFilterDraft.value.field),
)

const metricFilterOperatorOptions = computed<Array<SelectOption & { value: FilterOperator }>>(() =>
  getOperatorOptionsByField(metricFilterDraft.value.sourceType, metricFilterDraft.value.field),
)

const getCommonValueOptions = (sourceType: FilterSourceType, field: string): SelectOption[] => {
  const metadataValue = metadata.value

  if (!metadataValue) {
    return []
  }

  if (sourceType === 'segment') {
    return metadataValue.userSegments.map((segment) => ({
      label: `${segment.name} · ${segment.estimatedUsers.toLocaleString('zh-CN')} 人`,
      value: segment.id,
    }))
  }

  if (sourceType === 'user_tag') {
    const tag = metadataValue.userTags.find((item) => item.field === field)

    return (
      tag?.valueExamples.map((value) => ({
        label: value,
        value,
      })) ?? []
    )
  }

  const optionMap: Record<string, string[]> = {
    ad_position: ['金币不足弹窗', '钻石不足弹窗', '任务中心', '结算页广告', '首页广告入口', 'low_coin_popup', 'task_center', 'settlement_ad'],
    game_type: ['斗地主', '麻将', '德州扑克', '捕鱼', 'Slots'],
    ad_source: ['激励视频', '插屏广告', '任务广告'],
    app_version: ['1.8.3', '1.8.2', '1.8.1', '1.7.9'],
    device_os: ['iOS', 'Android', 'HarmonyOS'],
    channel: ['自然量', '广告投放', '社交裂变', '应用商店'],
    payment_status: ['未付费', '轻付费', '高付费'],
    churn_risk: ['低', '中', '高'],
    active_level: ['低活跃', '中活跃', '高活跃'],
  }

  return (optionMap[field] ?? ['低金币', '中金币', '高金币'])
    .slice(0, 100)
    .map((value) => ({
      label: value,
      value,
    }))
}

const filterValueOptions = computed<SelectOption[]>(() =>
  getCommonValueOptions(filterDraft.value.sourceType, filterDraft.value.field),
)

const childFilterValueOptions = computed<SelectOption[]>(() =>
  getCommonValueOptions(childFilterDraft.value.sourceType, childFilterDraft.value.field),
)

const comparisonFilterFieldOptions = computed<SelectOption[]>(() =>
  getFilterFieldOptions(comparisonFilterDraft.value.sourceType),
)

const comparisonFilterValueOptions = computed<SelectOption[]>(() =>
  getCommonValueOptions(comparisonFilterDraft.value.sourceType, comparisonFilterDraft.value.field),
)

const dynamicMatchFieldOptions = computed<SelectOption[]>(() => {
  if (!metadata.value) {
    return []
  }

  if (filterDraft.value.matchTargetType === 'segment') {
    return metadata.value.userSegments.map((segment) => ({
      label: `${segment.name} ${segment.id}`,
      value: segment.id,
    }))
  }

  return metadata.value.userTags.map((tag) => ({
    label: `${tag.displayName} ${tag.field}`,
    value: tag.field,
  }))
})

const childDynamicMatchFieldOptions = computed<SelectOption[]>(() => {
  if (!metadata.value) {
    return []
  }

  if (childFilterDraft.value.matchTargetType === 'segment') {
    return metadata.value.userSegments.map((segment) => ({
      label: `${segment.name} ${segment.id}`,
      value: segment.id,
    }))
  }

  return metadata.value.userTags.map((tag) => ({
    label: `${tag.displayName} ${tag.field}`,
    value: tag.field,
  }))
})

const getOptionDisplayPrefix = (option: SelectOption | undefined, fallback: string): string => {
  if (!option?.label) {
    return fallback
  }

  return String(option.label).split(' ')[0] ?? fallback
}

const filterFieldOptions = computed<SelectOption[]>(() => getFilterFieldOptions(filterDraft.value.sourceType))

const metricFilterFieldOptions = computed<SelectOption[]>(() =>
  getFilterFieldOptions(metricFilterDraft.value.sourceType),
)

const groupFieldOptions = computed<SelectOption[]>(() => {
  if (!metadata.value) {
    return []
  }

  if (groupDraft.value.sourceType === 'user_property') {
    return metadata.value.userAttributes.map((item) => ({
      label: `${item.displayName} ${item.field}`,
      value: item.field,
    }))
  }

  if (groupDraft.value.sourceType === 'user_tag') {
    return metadata.value.userTags.map((item) => ({
      label: `${item.displayName} ${item.field}`,
      value: item.field,
    }))
  }

  if (groupDraft.value.sourceType === 'segment') {
    return metadata.value.userSegments.map((item) => ({
      label: `${item.name} ${item.id}`,
      value: item.id,
    }))
  }

  return metadata.value.events
    .flatMap((event) => event.properties)
    .map((property) => ({
      label: `${property.displayName} ${property.propertyName}`,
      value: property.propertyName,
    }))
})

const topNOptions = computed<SelectOption[]>(() =>
  (result.value?.chartTopNOptions ?? [5, 10, 20, 50]).map((value) => ({
    label: `Top ${value}`,
    value,
  })),
)

const dashboardOptions = computed<SelectOption[]>(() =>
  dashboardLocations.value
    .filter((location) => dashboardSpaceType.value === 'all' || location.spaceType === dashboardSpaceType.value)
    .map((location) => ({
    label: `${location.name} · ${location.path}`,
    value: location.id,
    disabled: !location.canWrite,
  })),
)

const dashboardLocation = computed(() =>
  dashboardLocations.value.find((location) => location.id === dashboardId.value),
)

const dashboardSaveObjectOptions: SelectOption[] = [
  { label: '单图表', value: 'chart' },
  { label: '指标卡', value: 'metric_card' },
  { label: '表格', value: 'table' },
  { label: '图表组', value: 'chart_group' },
]

const dashboardSpaceOptions: SelectOption[] = [
  { label: '个人空间', value: 'personal' },
  { label: '团队空间', value: 'team' },
  { label: '公共空间', value: 'public' },
]

const dashboardRefreshModeOptions: SelectOption[] = [
  { label: '打开看板时刷新', value: 'open' },
  { label: '定时刷新', value: 'scheduled' },
  { label: '手动刷新', value: 'manual' },
  { label: '固定快照', value: 'snapshot' },
]

const dashboardRefreshScheduleOptions: SelectOption[] = [
  { label: '每小时', value: 'hourly' },
  { label: '每天 9:00', value: 'daily_9' },
  { label: '每周一 9:00', value: 'weekly_monday_9' },
]

const dashboardSummaryItemOptions: Array<SelectOption & { value: DashboardSummaryItem }> = [
  { label: '合计值', value: 'total' },
  { label: '最新值', value: 'latest' },
  { label: '平均值', value: 'avg' },
  { label: '最大值', value: 'max' },
  { label: '最小值', value: 'min' },
  { label: '环比', value: 'wow' },
  { label: '同比', value: 'yoy' },
]

const dashboardChartTypeOptions = computed<SelectOption[]>(() => {
  const selectedMetricCount = chartConfig.value.selectedMetricIds.length
  const hasGroupBy = groupByConfigs.value.length > 0
  const hasPvOrSumMetric = metricConfigs.value.some((metric) =>
    chartConfig.value.selectedMetricIds.includes(metric.id) &&
    ['PV', 'SUM'].includes(metric.operator),
  )

  return [
    { label: '折线图', value: 'line' },
    { label: '堆叠图', value: 'stacked' },
    { label: '柱形图', value: 'bar' },
    {
      label: '双轴图（至少两个指标）',
      value: 'dual_axis',
      disabled: selectedMetricCount < 2,
    },
    {
      label: '环形图（需要属性分组）',
      value: 'donut',
      disabled: !hasGroupBy,
    },
    {
      label: '饼图（需要属性分组）',
      value: 'pie',
      disabled: !hasGroupBy,
    },
    { label: '百分比图', value: 'percentage' },
    {
      label: '累积图（仅 PV / SUM）',
      value: 'cumulative',
      disabled: !hasPvOrSumMetric,
    },
    {
      label: '指标卡（仅单指标）',
      value: 'metric_card',
      disabled: selectedMetricCount !== 1,
    },
    { label: '表格', value: 'table' },
  ]
})

const dashboardSummaryDisabled = computed(() =>
  ['donut', 'pie', 'table'].includes(dashboardSaveChartType.value),
)

const dashboardSaveDuplicateName = computed(() =>
  Boolean(dashboardLocation.value?.widgets.includes(dashboardChartName.value.trim())),
)

const dashboardSaveValidationMessage = computed(() => {
  if (!dashboardChartName.value.trim()) {
    return '请输入图表名称。'
  }

  if (dashboardChartName.value.trim().length > 50) {
    return '图表名称不能超过 50 个字符。'
  }

  if (!dashboardId.value) {
    return '请选择看板位置。'
  }

  if (!dashboardLocation.value?.canWrite) {
    return '你没有保存到该看板的权限。'
  }

  if (dashboardSaveDuplicateName.value) {
    return '当前看板已存在同名图表，请修改名称。'
  }

  const chartOption = dashboardChartTypeOptions.value.find((option) => option.value === dashboardSaveChartType.value)
  if (chartOption?.disabled) {
    return '当前配置不支持该图表类型。'
  }

  return ''
})

const saveAnalysisButtonText = computed(() => {
  if (analysisDirtyState.value === 'saving') {
    return '保存中'
  }

  if (!currentSavedAnalysisId.value) {
    return '保存分析'
  }

  if (analysisDirtyState.value === 'dirty') {
    return '保存修改'
  }

  if (analysisDirtyState.value === 'saved') {
    return '已保存'
  }

  return '保存分析'
})

const saveFolderOptions: SelectOption[] = [
  { label: '个人空间 / 我的分析', value: 'personal-my-analysis' },
  { label: '个人空间 / 广告分析', value: 'personal-ad-analysis' },
  { label: '个人空间 / 留存分析', value: 'personal-retention-analysis' },
  { label: '团队空间 / 运营团队', value: 'team-operation' },
  { label: '团队空间 / 数据分析团队', value: 'team-data-analysis' },
]

const saveVisibilityOptions: SelectOption[] = [
  { label: '仅自己可见', value: 'private' },
  { label: '团队成员可见', value: 'team' },
  { label: '所有人可见', value: 'public', disabled: true },
]

const saveTagOptions: SelectOption[] = [
  { label: '事件分析', value: '事件分析' },
  { label: '广告观看下降', value: '广告观看下降' },
  { label: '异常诊断', value: '异常诊断' },
  { label: '低金币用户', value: '低金币用户' },
  { label: '运营联动', value: '运营联动' },
]

const selectedAnomalyPoint = computed(() => {
  const anomalies = result.value?.anomalyPoints ?? []

  return anomalies.find((item) => item.date === selectedAnomalyDate.value) ?? anomalies[0]
})

const anomalyOverview = computed(() => {
  const anomalies = result.value?.anomalyPoints ?? []
  const maxAnomaly = anomalies.reduce<typeof anomalies[number] | undefined>((current, item) => {
    if (!current) {
      return item
    }

    return Math.abs(item.actualValue - item.expectedValue) > Math.abs(current.actualValue - current.expectedValue)
      ? item
      : current
  }, undefined)

  return {
    count: anomalies.length,
    maxAnomaly,
  }
})

const filteredContributions = computed(() => {
  const contributions = result.value?.anomalyDiagnosis.contributions ?? []
  const keyword = contributionKeyword.value.trim()
  const filtered = keyword
    ? contributions.filter(
        (item) => item.dimension.includes(keyword) || item.dimensionValue.includes(keyword),
      )
    : contributions

  return [...filtered].sort((itemA, itemB) => {
    const pinA = contributionPinState.value[itemA.id]
    const pinB = contributionPinState.value[itemB.id]

    if (pinA === 'top' && pinB !== 'top') {
      return -1
    }

    if (pinA !== 'top' && pinB === 'top') {
      return 1
    }

    if (pinA === 'bottom' && pinB !== 'bottom') {
      return 1
    }

    if (pinA !== 'bottom' && pinB === 'bottom') {
      return -1
    }

    return itemB.contributionRate - itemA.contributionRate
  })
})

const filteredDetailRows = computed(() => {
  const rows = result.value?.tableRows ?? []

  if (!temporaryFilter.value) {
    return rows.filter((row) => enabledComparisonGroupNames.value.includes(row.comparisonGroup))
  }

  return rows.filter(
    (row) =>
      enabledComparisonGroupNames.value.includes(row.comparisonGroup) &&
      [
        row.coinBalanceLevel,
        row.adPosition,
        row.gameType,
        row.paymentStatus,
        row.appVersion,
        row.userGroup,
      ].includes(temporaryFilter.value),
  )
})

const formulaValidation = computed(() => validateFormulaTokens(formulaDraft.value.tokens))

const anomalyDiagnosisDisabled = computed(
  () => {
    const enabledComparisonCount = comparisonGroups.value.filter((group) => group.enabled).length

    return (
      chartConfig.value.chartType !== 'line' ||
      (enabledComparisonCount > 0 &&
        metricConfigs.value.filter((metric) => metric.enabled).length * enabledComparisonCount > 10)
    )
  },
)

const formatNumber = (value: number): string => new Intl.NumberFormat('zh-CN').format(value)

const formatMetricValue = (card: EventAnalysisMetricCard): string => {
  if (card.unit === '元') {
    return `¥${formatNumber(card.value)}`
  }

  if (card.unit === '%') {
    return `${card.value.toFixed(card.precision)}%`
  }

  return `${formatNumber(Number(card.value.toFixed(card.precision)))} ${card.unit}`
}

const formatRate = (value: number): string => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`

const setContributionPin = (item: DimensionContribution, pin?: 'top' | 'bottom'): void => {
  contributionPinState.value = {
    ...contributionPinState.value,
    [item.id]: pin,
  }
}

const selectContribution = (item: DimensionContribution): void => {
  selectedContributionId.value = item.id
  applyTemporaryFilter(item.dimension, item.dimensionValue)
  void openUserDrawerFromContribution(item)
}

const contributionColumns = computed<DataTableColumns<DimensionContribution>>(() => [
  { title: '维度', key: 'dimension', width: 118 },
  { title: '维度值', key: 'dimensionValue', width: 150 },
  {
    title: '参考值',
    key: 'expectedValue',
    width: 110,
    sorter: (rowA, rowB) => rowA.expectedValue - rowB.expectedValue,
    render: (row) => formatNumber(row.expectedValue),
  },
  {
    title: '实际值',
    key: 'actualValue',
    width: 110,
    sorter: (rowA, rowB) => rowA.actualValue - rowB.actualValue,
    render: (row) => formatNumber(row.actualValue),
  },
  {
    title: '差异',
    key: 'diff',
    width: 100,
    sorter: (rowA, rowB) => rowA.diff - rowB.diff,
    render: (row) => formatNumber(row.diff),
  },
  {
    title: '差异率',
    key: 'diffRate',
    width: 100,
    sorter: (rowA, rowB) => rowA.diffRate - rowB.diffRate,
    render: (row) => h(NTag, { size: 'small', type: row.diffRate < -10 ? 'error' : 'warning' }, () => formatRate(row.diffRate)),
  },
  {
    title: '贡献度',
    key: 'contributionRate',
    width: 100,
    sorter: (rowA, rowB) => rowA.contributionRate - rowB.contributionRate,
    render: (row) => `${row.contributionRate.toFixed(1)}%`,
  },
  {
    title: '影响用户数',
    key: 'affectedUsers',
    width: 112,
    sorter: (rowA, rowB) => rowA.affectedUsers - rowB.affectedUsers,
    render: (row) => formatNumber(row.affectedUsers),
  },
  {
    title: '操作',
    key: 'actions',
    fixed: 'right',
    width: 210,
    render: (row) =>
      h(NSpace, { size: 6 }, () => [
        h(NButton, { size: 'tiny', text: true, type: 'primary', onClick: () => selectContribution(row) }, () => '查看明细'),
        h(
          NButton,
          { size: 'tiny', text: true, onClick: () => setContributionPin(row, contributionPinState.value[row.id] === 'top' ? undefined : 'top') },
          () => (contributionPinState.value[row.id] === 'top' ? '取消置顶' : '置顶'),
        ),
        h(
          NButton,
          { size: 'tiny', text: true, onClick: () => setContributionPin(row, contributionPinState.value[row.id] === 'bottom' ? undefined : 'bottom') },
          () => (contributionPinState.value[row.id] === 'bottom' ? '取消置底' : '置底'),
        ),
      ]),
  },
])

const getMetricDefinition = (metricId: string): EventMetricConfig | undefined =>
  metricConfigs.value.find((metric) => metric.id === metricId)

const getMetricDisplayName = (metricId: string): string =>
  getMetricDefinition(metricId)?.name ??
  result.value?.metricCards.find((card) => card.metricId === metricId)?.metricName ??
  metricId

const generatedChartTitle = computed(() => {
  const metricNames = chartConfig.value.selectedMetricIds.map(getMetricDisplayName)
  const metricText = metricNames.length > 0 ? metricNames.join(' / ') : '未选择指标'

  return `${chartTypeLabelMap[chartConfig.value.chartType]} · ${metricText}`
})

const chartTitle = computed(() => chartConfig.value.title?.trim() || generatedChartTitle.value)

const chartSubtitle = computed(() => {
  const timeRangeText = template.value?.dateRangeLabel ?? '当前时间范围'
  const granularity = template.value?.timeRange.granularity ?? 'day'
  const metricCount = chartConfig.value.selectedMetricIds.length

  return `${timeRangeText} · ${granularity} 粒度 · ${metricCount} 个指标`
})

const getMetricTooltip = (card: EventAnalysisMetricCard): string => {
  const metric = getMetricDefinition(card.metricId)

  return [
    `事件：${metric?.eventName ?? card.metricName}`,
    `算子：${metric?.operator ?? 'mock'}`,
    `时间范围：${template.value?.dateRangeLabel ?? '当前时间范围'}`,
    `当前值：${formatMetricValue(card)}`,
    `上一周期：${formatNumber(card.compareValue)}${card.unit}`,
    `变化率：${formatRate(card.changeRate)}`,
  ].join('\n')
}

const formatPayloadValue = (value: string | number | boolean | string[]): string =>
  Array.isArray(value) ? value.join(',') : String(value)

const getMetricTagType = (status: EventAnalysisMetricCard['status']): TagProps['type'] => {
  if (status === 'critical') {
    return 'error'
  }

  if (status === 'warning') {
    return 'warning'
  }

  return 'success'
}

const getRiskTagType = (risk: AffectedUser['churnRisk']): TagProps['type'] => {
  if (risk === '高') {
    return 'error'
  }

  if (risk === '中') {
    return 'warning'
  }

  return 'success'
}

const buildQueryConfig = (): EventAnalysisQueryConfig | null => {
  if (!template.value) {
    return null
  }

  return {
    templateId: selectedTemplateId.value,
    timeRange: template.value.timeRange,
    metricConfigs: template.value.metricConfigs,
    formulaMetrics: template.value.formulaMetrics,
    filters: template.value.filters,
    comparisonGroups: template.value.comparisonGroups,
    groupByConfigs: template.value.groupByConfigs,
    chartConfig: chartConfig.value,
  }
}

const formatDateValue = (value: number): string => dayjs(value).format('YYYY-MM-DD')

const getDateRangeByPreset = (
  preset: EventAnalysisTemplate['timeRange']['preset'],
): Pick<EventAnalysisTemplate['timeRange'], 'startDate' | 'endDate'> => {
  const today = dayjs()
  const endDate = today.format('YYYY-MM-DD')
  const presetDaysMap: Partial<Record<EventAnalysisTemplate['timeRange']['preset'], number>> = {
    today: 1,
    yesterday: 1,
    last_7_days: 7,
    last_14_days: 14,
    last_30_days: 30,
    last_60_days: 60,
    last_180_days: 180,
  }

  if (preset === 'yesterday') {
    const yesterday = today.subtract(1, 'day').format('YYYY-MM-DD')

    return {
      startDate: yesterday,
      endDate: yesterday,
    }
  }

  const days = presetDaysMap[preset] ?? 14

  return {
    startDate: today.subtract(days - 1, 'day').format('YYYY-MM-DD'),
    endDate,
  }
}

const getFallbackGranularity = (startDate: string, endDate: string): EventAnalysisTemplate['timeRange']['granularity'] => {
  const days = Math.max(dayjs(endDate).diff(dayjs(startDate), 'day') + 1, 1)

  if (days <= 7) {
    return 'hour'
  }

  if (days <= 30) {
    return 'day'
  }

  return 'week'
}

const updateTimeRange = (patch: Partial<EventAnalysisTemplate['timeRange']>): void => {
  const currentTemplate = template.value

  if (!currentTemplate) {
    return
  }

  const presetLabelMap: Record<string, string> = {
    today: '今天',
    yesterday: '昨天',
    last_7_days: '过去 7 天',
    last_14_days: '过去 14 天',
    last_30_days: '过去 30 天',
    last_60_days: '过去 60 天',
    last_180_days: '过去 180 天',
    custom: '自定义时间',
  }
  const nextTimeRange = {
    ...currentTemplate.timeRange,
    ...patch,
  }
  const nextGranularity = isGranularityAvailable(
    nextTimeRange.granularity,
    nextTimeRange.startDate,
    nextTimeRange.endDate,
  )
    ? nextTimeRange.granularity
    : getFallbackGranularity(nextTimeRange.startDate, nextTimeRange.endDate)

  updateTemplate({
    ...currentTemplate,
    dateRangeLabel: presetLabelMap[nextTimeRange.preset] ?? currentTemplate.dateRangeLabel,
    timeRange: {
      ...nextTimeRange,
      granularity: nextGranularity,
    },
  })
}

const handleTimePresetChange = (value: string): void => {
  if (
    ![
      'today',
      'yesterday',
      'last_7_days',
      'last_14_days',
      'last_30_days',
      'last_60_days',
      'last_180_days',
      'custom',
    ].includes(value)
  ) {
    return
  }

  const preset = value as EventAnalysisTemplate['timeRange']['preset']

  if (preset === 'custom') {
    updateTimeRange({ preset })
    return
  }

  const range = getDateRangeByPreset(preset)
  customTimeRangeValue.value = [dayjs(range.startDate).valueOf(), dayjs(range.endDate).valueOf()]
  updateTimeRange({ preset, ...range })
}

const handleGranularityChange = (value: string): void => {
  if (['hour', 'day', 'week'].includes(value)) {
    updateTimeRange({ granularity: value as EventAnalysisTemplate['timeRange']['granularity'] })
  }
}

const handleComparisonTypeChange = (value: string): void => {
  if (['none', 'previous_period', 'same_week', 'same_month', 'same_year', 'custom'].includes(value)) {
    updateTimeRange({ comparisonType: value as EventAnalysisTemplate['timeRange']['comparisonType'] })
  }
}

const handleCustomTimeRangeChange = (value: [number, number] | null): void => {
  customTimeRangeValue.value = value

  if (!value) {
    return
  }

  updateTimeRange({
    preset: 'custom',
    startDate: formatDateValue(value[0]),
    endDate: formatDateValue(value[1]),
  })
}

const handleCustomComparisonRangeChange = (value: [number, number] | null): void => {
  customComparisonRangeValue.value = value

  if (!value) {
    return
  }

  updateTimeRange({
    comparisonType: 'custom',
    customComparisonStartDate: formatDateValue(value[0]),
    customComparisonEndDate: formatDateValue(value[1]),
  })
}

const updateChartConfig = (patch: Partial<ChartConfig>): void => {
  chartConfig.value = {
    ...chartConfig.value,
    ...patch,
  }
  markDirty()
}

const updateSelectedChartMetrics = (metricIds: Array<string | number>): void => {
  const nextMetricIds = metricIds.map(String)

  updateChartConfig({
    selectedMetricIds: nextMetricIds,
    leftAxisMetricIds: chartConfig.value.leftAxisMetricIds?.filter((metricId) =>
      nextMetricIds.includes(metricId),
    ),
    rightAxisMetricIds: chartConfig.value.rightAxisMetricIds?.filter((metricId) =>
      nextMetricIds.includes(metricId),
    ),
  })
}

const updateLeftAxisMetrics = (metricIds: Array<string | number>): void => {
  updateChartConfig({
    leftAxisMetricIds: metricIds.map(String),
  })
}

const updateRightAxisMetrics = (metricIds: Array<string | number>): void => {
  updateChartConfig({
    rightAxisMetricIds: metricIds.map(String),
  })
}

const readRecentLastQuery = (): EventAnalysisQueryConfig | null => {
  const rawValue = window.localStorage.getItem(LAST_QUERY_STORAGE_KEY)

  if (!rawValue) {
    return null
  }

  try {
    const persistedValue = JSON.parse(rawValue) as Partial<PersistedLastQuery>

    if (
      typeof persistedValue.queriedAt !== 'number' ||
      Date.now() - persistedValue.queriedAt > LAST_QUERY_MAX_AGE_MS ||
      !persistedValue.queryConfig
    ) {
      window.localStorage.removeItem(LAST_QUERY_STORAGE_KEY)
      return null
    }

    return persistedValue.queryConfig
  } catch {
    window.localStorage.removeItem(LAST_QUERY_STORAGE_KEY)
    return null
  }
}

const saveRecentLastQuery = (queryConfig: EventAnalysisQueryConfig): void => {
  const persistedValue: PersistedLastQuery = {
    queriedAt: Date.now(),
    queryConfig,
  }

  window.localStorage.setItem(LAST_QUERY_STORAGE_KEY, JSON.stringify(persistedValue))
}

const applyQueryConfigToPage = (
  defaultTemplate: EventAnalysisTemplate,
  queryConfig: EventAnalysisQueryConfig,
): void => {
  template.value = {
    ...defaultTemplate,
    id: queryConfig.templateId,
    timeRange: queryConfig.timeRange,
    metricConfigs: queryConfig.metricConfigs,
    formulaMetrics: queryConfig.formulaMetrics,
    filters: queryConfig.filters,
    comparisonGroups: queryConfig.comparisonGroups,
    groupByConfigs: queryConfig.groupByConfigs,
    chartConfig: queryConfig.chartConfig,
  }
  selectedTemplateId.value = queryConfig.templateId
  selectedEventName.value = queryConfig.metricConfigs[0]?.eventName ?? defaultTemplate.primaryEventName
  selectedMetricId.value = queryConfig.chartConfig.selectedMetricIds[0] ?? queryConfig.metricConfigs[0]?.id ?? ''
  chartConfig.value = { ...queryConfig.chartConfig }
  customTimeRangeValue.value = [
    dayjs(queryConfig.timeRange.startDate).valueOf(),
    dayjs(queryConfig.timeRange.endDate).valueOf(),
  ]
  customComparisonRangeValue.value =
    queryConfig.timeRange.customComparisonStartDate && queryConfig.timeRange.customComparisonEndDate
      ? [
          dayjs(queryConfig.timeRange.customComparisonStartDate).valueOf(),
          dayjs(queryConfig.timeRange.customComparisonEndDate).valueOf(),
        ]
      : null
  queryJson.value = JSON.stringify(queryConfig, null, 2)
}

const validateAnalysisConfig = (queryConfig: EventAnalysisQueryConfig): string => {
  const enabledMetrics = queryConfig.metricConfigs.filter((metric) => metric.enabled)

  if (enabledMetrics.length === 0) {
    return '至少需要启用一个指标'
  }

  if (!queryConfig.timeRange.startDate || !queryConfig.timeRange.endDate) {
    return '时间范围不能为空'
  }

  if (dayjs(queryConfig.timeRange.startDate).isAfter(dayjs(queryConfig.timeRange.endDate))) {
    return '时间范围起始日期不能晚于结束日期'
  }

  if (
    queryConfig.timeRange.comparisonType === 'custom' &&
    (!queryConfig.timeRange.customComparisonStartDate ||
      !queryConfig.timeRange.customComparisonEndDate)
  ) {
    return '自定义对比必须选择对比时间范围'
  }

  const invalidMetricMessage = enabledMetrics
    .map((metric) => validateMetricConfig(metric, metric.id))
    .find(Boolean)

  if (invalidMetricMessage) {
    return invalidMetricMessage
  }

  const invalidFilter = queryConfig.filters.find(
    (filter) =>
      validateFilterDraft(
        filter,
        Array.isArray(filter.value) ? filter.value.join('\n') : String(filter.value),
      ) !== '',
  )

  if (invalidFilter) {
    return `细分筛选「${invalidFilter.fieldDisplayName}」配置不完整`
  }

  if (queryConfig.groupByConfigs.length > 3) {
    return '完整产品支持最多 20 层，Demo 阶段支持 3 层。'
  }

  return ''
}

const markDirty = (): void => {
  queryState.value = 'dirty'
  configState.value = 'unsaved'
  analysisDirtyState.value = currentSavedAnalysisId.value ? 'dirty' : 'new'
}

const updateTemplate = (nextTemplate: EventAnalysisTemplate): void => {
  template.value = nextTemplate
  markDirty()
}

const getFieldDisplayName = (field: string): string => {
  const metadataValue = metadata.value

  if (!metadataValue) {
    return field
  }

  const eventProperty = metadataValue.events
    .flatMap((event) => event.properties)
    .find((property) => property.propertyName === field)
  const userAttribute = metadataValue.userAttributes.find((attribute) => attribute.field === field)
  const userTag = metadataValue.userTags.find((tag) => tag.field === field)
  const segment = metadataValue.userSegments.find((item) => item.id === field)

  return (
    eventProperty?.displayName ??
    userAttribute?.displayName ??
    userTag?.displayName ??
    segment?.name ??
    field
  )
}

const getMetricUnit = (operator: MetricOperator): string => {
  if (operator === 'UV') {
    return '人'
  }

  if (operator === 'PV_UV') {
    return '次/人'
  }

  if (operator === 'UV_AU') {
    return '%'
  }

  if (operator === 'SUM' && metricDraft.value.propertyName === 'revenue') {
    return '元'
  }

  return '次'
}

const getMetricDefaultName = (eventName: string, operator: MetricOperator): string => {
  const event = metadata.value?.events.find((item) => item.eventName === eventName)
  const eventLabel = event?.displayName ?? '所选事件'
  const operatorLabel: Record<MetricOperator, string> = {
    PV: '总次数',
    UV: '触发用户数',
    PV_UV: '人均次数',
    UV_AU: '渗透率',
    SUM: '属性求和',
    AVG: '属性平均值',
    MAX: '属性最大值',
    MIN: '属性最小值',
    PER_USER_AVG: '属性人均值',
    DISTINCT_COUNT: '属性去重数',
    DISTINCT_USER_PROPERTY: '属性与用户去重',
    PERCENTILE_25: 'P25',
    PERCENTILE_50: 'P50',
    PERCENTILE_75: 'P75',
    PERCENTILE_90: 'P90',
    CUSTOM: '自定义指标',
    FORMULA: '公式指标',
  }

  return `${eventLabel}的${operatorLabel[operator]}`
}

const updateMetricNameIfDefault = (): void => {
  if (metricEditMode.value === 'edit') {
    return
  }

  metricDraft.value = {
    ...metricDraft.value,
    name: getMetricDefaultName(metricDraft.value.eventName, metricDraft.value.operator),
  }
}

const handleMetricEventChange = (value: string): void => {
  const nextEvent = metadata.value?.events.find((event) => event.eventName === value)
  const firstNumericProperty = nextEvent?.properties.find((property) => property.dataType === 'number')
  const nextOperator =
    numericMetricOperators.includes(metricDraft.value.operator) && !firstNumericProperty
      ? 'PV'
      : metricDraft.value.operator

  metricDraft.value = {
    ...metricDraft.value,
    eventName: value,
    operator: nextOperator,
    propertyName: propertyMetricOperators.includes(nextOperator)
      ? firstNumericProperty?.propertyName ?? nextEvent?.properties[0]?.propertyName
      : undefined,
    unit: getMetricUnit(nextOperator),
  }
  updateMetricNameIfDefault()
}

const isMetricOperator = (value: string): value is MetricOperator =>
  [
    'PV',
    'UV',
    'PV_UV',
    'UV_AU',
    'SUM',
    'AVG',
    'MAX',
    'MIN',
    'PER_USER_AVG',
    'DISTINCT_COUNT',
    'DISTINCT_USER_PROPERTY',
    'PERCENTILE_25',
    'PERCENTILE_50',
    'PERCENTILE_75',
    'PERCENTILE_90',
    'CUSTOM',
    'FORMULA',
  ].includes(value)

const handleMetricOperatorChange = (rawValue: string): void => {
  if (!isMetricOperator(rawValue)) {
    return
  }

  const value = rawValue
  const firstProperty =
    numericMetricOperators.includes(value)
      ? numericPropertyOptions.value[0]?.propertyName
      : selectedDraftEvent.value?.properties[0]?.propertyName

  metricDraft.value = {
    ...metricDraft.value,
    operator: value,
    propertyName: propertyMetricOperators.includes(value) ? firstProperty : undefined,
    unit: getMetricUnit(value),
    precision: value === 'UV_AU' || value === 'PV_UV' ? 2 : metricDraft.value.precision,
  }
  updateMetricNameIfDefault()
}

const parseFilterValue = (rawValue: string, operator: FilterOperator): string | number | string[] => {
  if (operator === 'between') {
    return rawValue
      .split(/[\n,~，-]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 2)
  }

  if (['gt', 'gte', 'lt', 'lte', 'last_n_days'].includes(operator)) {
    const numericValue = Number(rawValue)

    return Number.isFinite(numericValue) ? numericValue : rawValue
  }

  if (operator === 'in' || operator === 'not_in') {
    return rawValue
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return rawValue
}

const stringifyFilterValue = (value: FilterCondition['value']): string =>
  Array.isArray(value) ? value.join('\n') : String(value)

const isRegexValid = (pattern: string): boolean => {
  try {
    new RegExp(pattern)
    return true
  } catch {
    return false
  }
}

const validateFilterDraft = (filter: FilterCondition, rawValue: string): string => {
  if (filter.sourceType === 'behavior') {
    if (!filter.timeWindowDays || filter.timeWindowDays <= 0) {
      return '行为圈选必须选择时间范围'
    }

    if (filter.behaviorType === 'sequence_done') {
      if ((filter.eventSequence?.length ?? 0) < 2) {
        return '依次做过至少需要选择两个事件'
      }

      if (!filter.stepIntervalMinutes || filter.stepIntervalMinutes > 30) {
        return '步骤间隔不能超过 30 分钟'
      }
    } else if (!filter.eventName) {
      return '行为圈选必须选择事件'
    }

    const childError = filter.childFilters
      ?.map((childFilter) => validateFilterDraft(childFilter, stringifyFilterValue(childFilter.value)))
      .find(Boolean)

    return childError ? `二级过滤：${childError}` : ''
  }

  if (filter.sourceType === 'dynamic_match') {
    if (!filter.matchEventName) {
      return '动态匹配必须选择目标事件'
    }

    if (!filter.matchTargetType || !filter.matchField || !filter.matchMode) {
      return '动态匹配必须选择匹配对象和匹配方式'
    }

    const childError = filter.childFilters
      ?.map((childFilter) => validateFilterDraft(childFilter, stringifyFilterValue(childFilter.value)))
      .find(Boolean)

    return childError ? `二级过滤：${childError}` : ''
  }

  if (!filter.field) {
    return '筛选字段不能为空'
  }

  if (!filter.operator) {
    return '筛选操作符不能为空'
  }

  if (!rawValue.trim()) {
    return '筛选值不能为空'
  }

  if (filter.operator === 'between') {
    const values = parseFilterValue(rawValue, filter.operator)

    if (!Array.isArray(values) || values.length < 2) {
      return '区间必须填写起始值和结束值'
    }

    const startValue = Number(values[0])
    const endValue = Number(values[1])

    if (Number.isFinite(startValue) && Number.isFinite(endValue) && startValue > endValue) {
      return '区间起始不能大于结束'
    }
  }

  if (filter.operator === 'regex' && !isRegexValid(rawValue.trim())) {
    return '正则表达式语法错误'
  }

  const childError = filter.childFilters
    ?.map((childFilter) => validateFilterDraft(childFilter, stringifyFilterValue(childFilter.value)))
    .find(Boolean)

  return childError ? `二级过滤：${childError}` : ''
}

const getEventDisplayName = (eventName = ''): string =>
  metadata.value?.events.find((event) => event.eventName === eventName)?.displayName ?? eventName

const getOperatorDisplayName = (operator: FilterOperator = 'equals'): string => {
  const option = allFilterOperatorOptions.find((item) => item.value === operator)

  return typeof option?.label === 'string' ? option.label : operator
}

const buildFilterDisplayValue = (filter: FilterCondition, rawValue: string): string => {
  if (filter.sourceType === 'behavior') {
    const behaviorTextMap: Record<BehaviorFilterType, string> = {
      done: '做过',
      not_done: '没做过',
      sequence_done: '依次做过',
    }
    const eventText =
      filter.behaviorType === 'sequence_done'
        ? (filter.eventSequence ?? []).map(getEventDisplayName).join(' → ')
        : getEventDisplayName(filter.eventName)
    const countText =
      filter.behaviorType === 'done'
        ? ` ${getOperatorDisplayName(filter.countOperator)} ${filter.countValue ?? 1} 次`
        : ''
    const intervalText =
      filter.behaviorType === 'sequence_done'
        ? `，步骤间隔不超过 ${filter.stepIntervalMinutes ?? 30} 分钟`
        : ''
    const childText = filter.childFilters?.length
      ? `；二级过滤 ${filter.childFilters
          .map((childFilter, index) => `${index > 0 ? childFilter.logic : ''} ${childFilter.fieldDisplayName} ${getOperatorDisplayName(childFilter.operator)} ${childFilter.displayValue}`)
          .join(' ')}`
      : ''

    return `过去 ${filter.timeWindowDays ?? 7} 天${behaviorTextMap[filter.behaviorType ?? 'done']} ${eventText}${countText}${intervalText}${childText}`
  }

  if (filter.sourceType === 'dynamic_match') {
    const modeMap: Record<DynamicMatchMode, string> = {
      event_day: '发生当天',
      previous_day: '发生前一日',
      latest: '最新结果',
    }

    return `在 ${getEventDisplayName(filter.matchEventName)} ${modeMap[filter.matchMode ?? 'event_day']}，匹配 ${getFieldDisplayName(filter.matchField ?? '')}`
  }

  return rawValue || getFieldDisplayName(filter.field)
}

const validateMetricConfig = (metric: EventMetricConfig, excludeMetricId = ''): string => {
  const currentTemplate = template.value
  const metricName = metric.name.trim()

  if (!metricName) {
    return '指标名称不能为空'
  }

  if (metricName.length > 30) {
    return '指标名称不能超过 30 字'
  }

  if (
    currentTemplate?.metricConfigs.some(
      (item) => item.id !== excludeMetricId && item.name.trim() === metricName,
    )
  ) {
    return '当前分析内指标名称不能重复'
  }

  if (!metric.eventName) {
    return '事件不能为空'
  }

  if (!metric.operator) {
    return '算子不能为空'
  }

  if (propertyMetricOperators.includes(metric.operator) && !metric.propertyName) {
    return '该算子必须选择属性'
  }

  const invalidFilter = metric.filters.find(
    (filter) =>
      validateFilterDraft(
        filter,
        Array.isArray(filter.value) ? filter.value.join('\n') : String(filter.value),
      ) !== '',
  )

  if (invalidFilter) {
    return `指标过滤「${invalidFilter.fieldDisplayName}」配置不完整`
  }

  return ''
}

const openCreateMetric = (metricType: EventMetricConfig['metricType']): void => {
  if ((template.value?.metricConfigs.length ?? 0) >= 10) {
    actionNotice.value = 'Demo 阶段最多支持 10 个指标。'
    return
  }

  metricEditMode.value = 'create'
  editingMetricId.value = ''
  metricDraft.value = {
    ...createMetricDraft(),
    metricType,
    operator: metricType === 'property' ? 'SUM' : metricType === 'formula' ? 'FORMULA' : metricType === 'custom' ? 'CUSTOM' : 'PV',
    name:
      metricType === 'property'
        ? '未命名属性指标'
        : metricType === 'formula'
          ? '未命名公式指标'
          : metricType === 'custom'
            ? '未命名自定义指标'
            : '未命名事件指标',
  }
  handleMetricEventChange(metricDraft.value.eventName)
  showMetricConfigModal.value = true
}

const openEditMetric = (metric: EventMetricConfig): void => {
  metricEditMode.value = 'edit'
  editingMetricId.value = metric.id
  metricDraft.value = {
    ...metric,
    filters: metric.filters.map((filter) => ({ ...filter })),
  }
  showMetricConfigModal.value = true
}

const saveMetricConfig = (): void => {
  const currentTemplate = template.value

  if (!currentTemplate) {
    return
  }

  if (!metricDraft.value.name.trim()) {
    errorMessage.value = '指标名称不能为空'
    return
  }

  const validationMessage = validateMetricConfig(metricDraft.value, editingMetricId.value)

  if (validationMessage) {
    errorMessage.value = validationMessage
    return
  }

  const draft: EventMetricConfig = {
    ...metricDraft.value,
    name: metricDraft.value.name.trim(),
  }
  const metricConfigs =
    metricEditMode.value === 'edit'
      ? currentTemplate.metricConfigs.map((metric) => (metric.id === editingMetricId.value ? draft : metric))
      : [...currentTemplate.metricConfigs, draft]

  updateTemplate({
    ...currentTemplate,
    metricConfigs,
  })
  selectedMetricId.value = draft.id
  showMetricConfigModal.value = false
  actionNotice.value = metricEditMode.value === 'edit' ? '指标配置已更新，请重新分析。' : '已新增指标，请重新分析。'
}

const copyMetricConfig = (metric: EventMetricConfig): void => {
  const currentTemplate = template.value

  if (!currentTemplate) {
    return
  }

  if (currentTemplate.metricConfigs.length >= 10) {
    actionNotice.value = 'Demo 阶段最多支持 10 个指标。'
    return
  }

  const metricIndex = currentTemplate.metricConfigs.findIndex((item) => item.id === metric.id)
  const copiedMetric: EventMetricConfig = {
    ...metric,
    id: `${metric.id}_copy_${Date.now()}`,
    name: `${metric.name} 副本`,
    filters: metric.filters.map((filter) => ({ ...filter })),
  }
  const nextMetricConfigs = [...currentTemplate.metricConfigs]
  nextMetricConfigs.splice(metricIndex + 1, 0, copiedMetric)

  updateTemplate({
    ...currentTemplate,
    metricConfigs: nextMetricConfigs,
  })
  actionNotice.value = `已复制指标「${metric.name}」。`
}

const toggleMetricConfig = (metric: EventMetricConfig): void => {
  const currentTemplate = template.value

  if (!currentTemplate) {
    return
  }

  updateTemplate({
    ...currentTemplate,
    metricConfigs: currentTemplate.metricConfigs.map((item) =>
      item.id === metric.id ? { ...item, enabled: !item.enabled } : item,
    ),
  })
}

const removeMetricConfig = (metric: EventMetricConfig): void => {
  const currentTemplate = template.value

  if (!currentTemplate) {
    return
  }

  if (currentTemplate.metricConfigs.length <= 1) {
    actionNotice.value = '至少保留一个指标。'
    return
  }

  const referencedByFormula = currentTemplate.formulaMetrics.some((formula) =>
    formula.tokens.some((token) => token.value === metric.id),
  )

  if (referencedByFormula) {
    actionNotice.value = '该指标被公式指标引用，请先调整公式后再删除。'
    return
  }

  updateTemplate({
    ...currentTemplate,
    metricConfigs: currentTemplate.metricConfigs.filter((item) => item.id !== metric.id),
  })

  if (selectedMetricId.value === metric.id) {
    selectedMetricId.value = currentTemplate.metricConfigs.find((item) => item.id !== metric.id)?.id ?? ''
  }
}

const resetMetricConfigs = (): void => {
  const currentTemplate = template.value

  if (!currentTemplate) {
    return
  }

  updateTemplate({
    ...currentTemplate,
    metricConfigs: [createMetricDraft()],
  })
  actionNotice.value = '指标配置已重置为一条空事件指标，请重新配置后分析。'
}

const cloneFilterCondition = (filter: FilterCondition): FilterCondition => ({
  ...filter,
  value: Array.isArray(filter.value) ? [...filter.value] : filter.value,
  childFilters: filter.childFilters?.map(cloneFilterCondition),
  eventSequence: filter.eventSequence ? [...filter.eventSequence] : undefined,
})

const createFilterDraftBySource = (sourceType: FilterSourceType): FilterCondition => {
  const firstField = getFilterFieldOptions(sourceType)[0]
  const baseDraft: FilterCondition = {
    ...createFilterDraft(),
    id: `filter_custom_${Date.now()}`,
    sourceType,
    field: String(firstField?.value ?? ''),
    fieldDisplayName: getOptionDisplayPrefix(firstField, sourceType === 'behavior' ? '行为圈选' : '筛选字段'),
    operator: sourceType === 'segment' ? 'in' : sourceType === 'behavior' ? 'done' : 'equals',
    value: '',
    displayValue: '',
    childFilters: [],
  }

  if (sourceType === 'behavior') {
    return {
      ...baseDraft,
      field: 'ad_watch_complete',
      fieldDisplayName: '行为圈选',
      operator: 'done',
      value: 'ad_watch_complete',
      behaviorType: 'done',
      timeWindowDays: 7,
      eventName: 'ad_watch_complete',
      countOperator: 'gte',
      countValue: 3,
      stepIntervalMinutes: 30,
      eventSequence: ['game_end', 'ad_exposure', 'ad_watch_complete'],
      displayValue: '过去 7 天做过广告观看完成至少 3 次',
    }
  }

  if (sourceType === 'dynamic_match') {
    return {
      ...baseDraft,
      field: 'coin_balance_level',
      fieldDisplayName: '动态匹配',
      operator: 'equals',
      value: 'coin_balance_level',
      matchEventName: 'ad_watch_complete',
      matchTargetType: 'user_tag',
      matchField: 'coin_balance_level',
      matchMode: 'event_day',
      displayValue: '在广告观看发生当天，用户属于低金币标签',
    }
  }

  return baseDraft
}

const isMultiValueOperator = (operator: FilterOperator): boolean =>
  operator === 'in' || operator === 'not_in' || operator === 'between'

const syncFilterValueTextFromSelection = (
  values: Array<string | number>,
  target: 'primary' | 'child',
): void => {
  const nextText = values.map(String).join('\n')

  if (target === 'primary') {
    filterValueText.value = nextText
    return
  }

  childFilterValueText.value = nextText
}

const normalizeSelectedValues = (
  value: string | number | Array<string | number> | null,
): Array<string | number> => {
  if (Array.isArray(value)) {
    return value
  }

  if (value === null) {
    return []
  }

  return [value]
}

const handleFilterValueSelect = (value: string | number | Array<string | number> | null): void => {
  filterSelectedValues.value = normalizeSelectedValues(value)
  syncFilterValueTextFromSelection(filterSelectedValues.value, 'primary')
}

const handleChildFilterValueSelect = (
  value: string | number | Array<string | number> | null,
): void => {
  childFilterSelectedValues.value = normalizeSelectedValues(value)
  syncFilterValueTextFromSelection(childFilterSelectedValues.value, 'child')
}

const handleComparisonFilterValueSelect = (
  value: string | number | Array<string | number> | null,
): void => {
  comparisonFilterSelectedValues.value = normalizeSelectedValues(value)
  comparisonFilterValueText.value = comparisonFilterSelectedValues.value.map(String).join('\n')
}

const resetPrimaryFilterValue = (filter: FilterCondition): void => {
  filterSelectedValues.value = Array.isArray(filter.value)
    ? filter.value.filter((value) => typeof value === 'string' || typeof value === 'number')
    : typeof filter.value === 'string' || typeof filter.value === 'number'
      ? [filter.value]
      : []
  filterValueText.value = stringifyFilterValue(filter.value)
  filterValueMode.value = filter.manualInput ? 'manual' : 'select'
}

const resetChildFilterValue = (filter: FilterCondition): void => {
  childFilterSelectedValues.value = Array.isArray(filter.value)
    ? filter.value.filter((value) => typeof value === 'string' || typeof value === 'number')
    : typeof filter.value === 'string' || typeof filter.value === 'number'
      ? [filter.value]
      : []
  childFilterValueText.value = stringifyFilterValue(filter.value)
  childFilterValueMode.value = filter.manualInput ? 'manual' : 'select'
}

const resetComparisonFilterValue = (filter: FilterCondition): void => {
  comparisonFilterSelectedValues.value = Array.isArray(filter.value)
    ? filter.value.filter((value) => typeof value === 'string' || typeof value === 'number')
    : typeof filter.value === 'string' || typeof filter.value === 'number'
      ? [filter.value]
      : []
  comparisonFilterValueText.value = stringifyFilterValue(filter.value)
  comparisonFilterValueMode.value = filter.manualInput ? 'manual' : 'select'
}

const openCreateFilter = (sourceType: FilterSourceType = 'event_property'): void => {
  filterEditMode.value = 'create'
  editingFilterId.value = ''
  filterDraft.value = createFilterDraftBySource(sourceType)
  resetPrimaryFilterValue(filterDraft.value)
  childFilterEditorVisible.value = false
  showFilterConfigModal.value = true
}

const openEditFilter = (filter: FilterCondition): void => {
  filterEditMode.value = 'edit'
  editingFilterId.value = filter.id
  filterDraft.value = {
    ...filter,
    childFilters: filter.childFilters?.map((childFilter) => ({ ...childFilter })) ?? [],
  }
  resetPrimaryFilterValue(filterDraft.value)
  childFilterEditorVisible.value = false
  showFilterConfigModal.value = true
}

const isFilterSourceType = (value: string): value is FilterSourceType =>
  ['event_property', 'user_property', 'user_tag', 'segment', 'behavior', 'dynamic_match', 'common_property'].includes(value)

const handleFilterSourceChange = (rawValue: string): void => {
  if (!isFilterSourceType(rawValue)) {
    return
  }

  filterDraft.value = createFilterDraftBySource(rawValue)
  resetPrimaryFilterValue(filterDraft.value)
}

const handleMetricFilterSourceChange = (rawValue: string): void => {
  if (!isFilterSourceType(rawValue)) {
    return
  }

  const value = rawValue
  const firstField = getFilterFieldOptions(value)[0]

  metricFilterDraft.value = {
    ...metricFilterDraft.value,
    sourceType: value,
    field: String(firstField?.value ?? ''),
    fieldDisplayName: getOptionDisplayPrefix(firstField, ''),
    operator: value === 'behavior' ? 'done' : 'equals',
  }
  metricFilterValueText.value = value === 'behavior' ? '过去 7 天至少 3 次' : ''
}

const handleFilterFieldChange = (rawValue: string): void => {
  const fieldOption = getFilterFieldOptions(filterDraft.value.sourceType).find(
    (option) => String(option.value) === rawValue,
  )
  const nextOperator = getOperatorOptionsByField(filterDraft.value.sourceType, rawValue)[0]?.value ?? 'equals'

  filterDraft.value = {
    ...filterDraft.value,
    field: rawValue,
    fieldDisplayName: getOptionDisplayPrefix(fieldOption, rawValue),
    operator: nextOperator,
    value: '',
    displayValue: '',
  }
  resetPrimaryFilterValue(filterDraft.value)
}

const handleChildFilterFieldChange = (rawValue: string): void => {
  const fieldOption = getFilterFieldOptions(childFilterDraft.value.sourceType).find(
    (option) => String(option.value) === rawValue,
  )
  const nextOperator =
    getOperatorOptionsByField(childFilterDraft.value.sourceType, rawValue)[0]?.value ?? 'equals'

  childFilterDraft.value = {
    ...childFilterDraft.value,
    field: rawValue,
    fieldDisplayName: getOptionDisplayPrefix(fieldOption, rawValue),
    operator: nextOperator,
    value: '',
    displayValue: '',
  }
  resetChildFilterValue(childFilterDraft.value)
}

const handleChildFilterSourceChange = (rawValue: string): void => {
  if (!isFilterSourceType(rawValue)) {
    return
  }

  childFilterDraft.value = {
    ...createFilterDraftBySource(rawValue),
    logic: childFilterDraft.value.logic,
  }
  resetChildFilterValue(childFilterDraft.value)
}

const handleComparisonFilterSourceChange = (rawValue: string): void => {
  if (!isFilterSourceType(rawValue)) {
    return
  }

  comparisonFilterDraft.value = createFilterDraftBySource(rawValue)
  resetComparisonFilterValue(comparisonFilterDraft.value)
}

const handleFilterOperatorChange = (rawValue: string): void => {
  const option = allFilterOperatorOptions.find((item) => item.value === rawValue)

  if (!option) {
    return
  }

  filterDraft.value = {
    ...filterDraft.value,
    operator: option.value,
    value: '',
    displayValue: '',
  }
  resetPrimaryFilterValue(filterDraft.value)
}

const handleChildFilterOperatorChange = (rawValue: string): void => {
  const option = allFilterOperatorOptions.find((item) => item.value === rawValue)

  if (!option) {
    return
  }

  childFilterDraft.value = {
    ...childFilterDraft.value,
    operator: option.value,
    value: '',
    displayValue: '',
  }
  resetChildFilterValue(childFilterDraft.value)
}

const handleComparisonFilterFieldChange = (rawValue: string): void => {
  const fieldOption = getFilterFieldOptions(comparisonFilterDraft.value.sourceType).find(
    (option) => String(option.value) === rawValue,
  )
  const nextOperator =
    getOperatorOptionsByField(comparisonFilterDraft.value.sourceType, rawValue)[0]?.value ?? 'equals'

  comparisonFilterDraft.value = {
    ...comparisonFilterDraft.value,
    field: rawValue,
    fieldDisplayName: getOptionDisplayPrefix(fieldOption, rawValue),
    operator: nextOperator,
    value: '',
    displayValue: '',
  }
  resetComparisonFilterValue(comparisonFilterDraft.value)
}

const handleComparisonFilterOperatorChange = (rawValue: string): void => {
  const option = allFilterOperatorOptions.find((item) => item.value === rawValue)

  if (!option) {
    return
  }

  comparisonFilterDraft.value = {
    ...comparisonFilterDraft.value,
    operator: option.value,
    value: '',
    displayValue: '',
  }
  resetComparisonFilterValue(comparisonFilterDraft.value)
}

const handleBehaviorTypeChange = (rawValue: string): void => {
  if (!['done', 'not_done', 'sequence_done'].includes(rawValue)) {
    return
  }

  const behaviorType = rawValue as BehaviorFilterType

  filterDraft.value = {
    ...filterDraft.value,
    behaviorType,
    operator: behaviorType,
  }
}

const handleChildBehaviorTypeChange = (rawValue: string): void => {
  if (!['done', 'not_done', 'sequence_done'].includes(rawValue)) {
    return
  }

  const behaviorType = rawValue as BehaviorFilterType

  childFilterDraft.value = {
    ...childFilterDraft.value,
    behaviorType,
    operator: behaviorType,
  }
}

const handleDynamicTargetTypeChange = (rawValue: string): void => {
  if (!['user_tag', 'segment'].includes(rawValue)) {
    return
  }

  const matchTargetType = rawValue as DynamicMatchTargetType
  const nextField =
    matchTargetType === 'segment'
      ? metadata.value?.userSegments[0]?.id
      : metadata.value?.userTags[0]?.field

  filterDraft.value = {
    ...filterDraft.value,
    matchTargetType,
    matchField: nextField ?? '',
  }
}

const handleChildDynamicTargetTypeChange = (rawValue: string): void => {
  if (!['user_tag', 'segment'].includes(rawValue)) {
    return
  }

  const matchTargetType = rawValue as DynamicMatchTargetType
  const nextField =
    matchTargetType === 'segment'
      ? metadata.value?.userSegments[0]?.id
      : metadata.value?.userTags[0]?.field

  childFilterDraft.value = {
    ...childFilterDraft.value,
    matchTargetType,
    matchField: nextField ?? '',
  }
}

const handleDynamicMatchModeChange = (rawValue: string): void => {
  if (!['event_day', 'previous_day', 'latest'].includes(rawValue)) {
    return
  }

  filterDraft.value = {
    ...filterDraft.value,
    matchMode: rawValue as DynamicMatchMode,
  }
}

const handleChildDynamicMatchModeChange = (rawValue: string): void => {
  if (!['event_day', 'previous_day', 'latest'].includes(rawValue)) {
    return
  }

  childFilterDraft.value = {
    ...childFilterDraft.value,
    matchMode: rawValue as DynamicMatchMode,
  }
}

const saveFilterConfig = (): void => {
  const currentTemplate = template.value

  if (!currentTemplate) {
    return
  }

  const rawValue = filterValueText.value.trim()
  const validationMessage = validateFilterDraft(filterDraft.value, rawValue)

  if (validationMessage) {
    errorMessage.value = validationMessage
    return
  }

  const value =
    filterDraft.value.sourceType === 'behavior'
      ? filterDraft.value.eventName ?? filterDraft.value.eventSequence ?? ''
      : filterDraft.value.sourceType === 'dynamic_match'
        ? filterDraft.value.matchField ?? ''
        : parseFilterValue(rawValue, filterDraft.value.operator)
  const fieldDisplayName = getFieldDisplayName(filterDraft.value.field)
  const draft: FilterCondition = {
    ...filterDraft.value,
    value,
    fieldDisplayName,
    displayValue: buildFilterDisplayValue(filterDraft.value, rawValue || fieldDisplayName),
    manualInput: filterValueMode.value === 'manual',
  }
  const filters =
    filterEditMode.value === 'edit'
      ? currentTemplate.filters.map((filter) => (filter.id === editingFilterId.value ? draft : filter))
      : [...currentTemplate.filters, draft]

  updateTemplate({
    ...currentTemplate,
    filters,
  })
  showFilterConfigModal.value = false
  actionNotice.value = filterEditMode.value === 'edit' ? '筛选条件已更新，请重新分析。' : '已新增筛选条件，请重新分析。'
}

const openCreateChildFilter = (): void => {
  childFilterEditIndex.value = -1
  childFilterDraft.value = createFilterDraftBySource('event_property')
  resetChildFilterValue(childFilterDraft.value)
  childFilterEditorVisible.value = true
}

const openEditChildFilter = (filter: FilterCondition, index: number): void => {
  childFilterEditIndex.value = index
  childFilterDraft.value = {
    ...filter,
    childFilters: filter.childFilters?.map((childFilter) => ({ ...childFilter })) ?? [],
  }
  resetChildFilterValue(childFilterDraft.value)
  childFilterEditorVisible.value = true
}

const saveChildFilterConfig = (): void => {
  const rawValue = childFilterValueText.value.trim()
  const validationMessage = validateFilterDraft(childFilterDraft.value, rawValue)

  if (validationMessage) {
    errorMessage.value = validationMessage
    return
  }

  const value =
    childFilterDraft.value.sourceType === 'behavior'
      ? childFilterDraft.value.eventName ?? childFilterDraft.value.eventSequence ?? ''
      : childFilterDraft.value.sourceType === 'dynamic_match'
        ? childFilterDraft.value.matchField ?? ''
        : parseFilterValue(rawValue, childFilterDraft.value.operator)
  const fieldDisplayName =
    childFilterDraft.value.sourceType === 'behavior'
      ? '行为圈选'
      : childFilterDraft.value.sourceType === 'dynamic_match'
        ? '动态匹配'
        : getFieldDisplayName(childFilterDraft.value.field)
  const nextChildFilter: FilterCondition = {
    ...childFilterDraft.value,
    value,
    fieldDisplayName,
    displayValue: buildFilterDisplayValue(childFilterDraft.value, rawValue || fieldDisplayName),
    manualInput: childFilterValueMode.value === 'manual',
  }
  const nextChildFilters = [...(filterDraft.value.childFilters ?? [])]

  if (childFilterEditIndex.value >= 0) {
    nextChildFilters.splice(childFilterEditIndex.value, 1, nextChildFilter)
  } else {
    nextChildFilters.push(nextChildFilter)
  }

  filterDraft.value = {
    ...filterDraft.value,
    childFilters: nextChildFilters,
  }
  childFilterEditorVisible.value = false
}

const removeChildFilter = (index: number): void => {
  filterDraft.value = {
    ...filterDraft.value,
    childFilters: (filterDraft.value.childFilters ?? []).filter((_, filterIndex) => filterIndex !== index),
  }
}

const requestClearFilters = (): void => {
  showClearFilterConfirmModal.value = true
}

const clearFilters = (): void => {
  const currentTemplate = template.value

  if (!currentTemplate) {
    return
  }

  updateTemplate({
    ...currentTemplate,
    filters: [],
  })
  showClearFilterConfirmModal.value = false
  actionNotice.value = '已清空细分筛选，分析范围恢复为全部用户。'
}

const removeFilterConfig = (filter: FilterCondition): void => {
  const currentTemplate = template.value

  if (!currentTemplate) {
    return
  }

  updateTemplate({
    ...currentTemplate,
    filters: currentTemplate.filters.filter((item) => item.id !== filter.id),
  })
}

const openCreateMetricFilter = (sourceType: FilterSourceType = 'event_property'): void => {
  metricFilterEditIndex.value = -1
  const firstField = getFilterFieldOptions(sourceType)[0]
  metricFilterDraft.value = {
    ...createFilterDraft(),
    sourceType,
    field: String(firstField?.value ?? 'ad_position'),
    fieldDisplayName: getOptionDisplayPrefix(firstField, '广告位'),
    operator: sourceType === 'behavior' ? 'done' : 'equals',
  }
  metricFilterValueText.value = sourceType === 'behavior' ? '过去 7 天至少 3 次' : '金币不足弹窗'
  showMetricFilterConfigModal.value = true
}

const openEditMetricFilter = (filter: FilterCondition, index: number): void => {
  metricFilterEditIndex.value = index
  metricFilterDraft.value = { ...filter }
  metricFilterValueText.value = Array.isArray(filter.value) ? filter.value.join('\n') : String(filter.value)
  showMetricFilterConfigModal.value = true
}

const saveMetricFilterConfig = (): void => {
  const rawValue = metricFilterValueText.value.trim()
  const validationMessage = validateFilterDraft(metricFilterDraft.value, rawValue)

  if (validationMessage) {
    errorMessage.value = validationMessage
    return
  }

  const nextFilter: FilterCondition = {
    ...metricFilterDraft.value,
    value: parseFilterValue(rawValue, metricFilterDraft.value.operator),
    fieldDisplayName: getFieldDisplayName(metricFilterDraft.value.field),
    displayValue: rawValue,
  }
  const nextFilters = [...metricDraft.value.filters]

  if (metricFilterEditIndex.value >= 0) {
    nextFilters.splice(metricFilterEditIndex.value, 1, nextFilter)
  } else {
    nextFilters.push(nextFilter)
  }

  metricDraft.value = {
    ...metricDraft.value,
    filters: nextFilters,
  }
  showMetricFilterConfigModal.value = false
}

const removeMetricFilter = (index: number): void => {
  metricDraft.value = {
    ...metricDraft.value,
    filters: metricDraft.value.filters.filter((_, filterIndex) => filterIndex !== index),
  }
}

const comparisonColorPalette = ['#2080f0', '#d03050', '#18a058', '#f0a020', '#8b5cf6']

const getNextComparisonColor = (): string => {
  const usedColors = comparisonGroups.value.map((group) => group.colorKey)

  return comparisonColorPalette.find((color) => !usedColors.includes(color)) ?? comparisonColorPalette[0] ?? '#8b5cf6'
}

const buildComparisonDescription = (filtersValue: FilterCondition[]): string => {
  if (filtersValue.length === 0) {
    return '暂无条件'
  }

  return filtersValue
    .map((filter, index) => `${index > 0 ? `${filter.logic} ` : ''}${filter.displayValue}`)
    .join(' ')
}

const syncChartComparisonGroups = (groups: ComparisonGroup[]): void => {
  chartConfig.value = {
    ...chartConfig.value,
    selectedGroupValues: groups.filter((group) => group.enabled).map((group) => group.name),
  }
}

const openCreateComparisonFilter = (): void => {
  comparisonFilterEditIndex.value = -1
  comparisonFilterDraft.value = createFilterDraftBySource('user_tag')
  resetComparisonFilterValue(comparisonFilterDraft.value)
}

const openEditComparisonFilter = (filter: FilterCondition, index: number): void => {
  comparisonFilterEditIndex.value = index
  comparisonFilterDraft.value = cloneFilterCondition(filter)
  resetComparisonFilterValue(comparisonFilterDraft.value)
}

const saveComparisonFilterConfig = (): void => {
  const rawValue = comparisonFilterValueText.value.trim()
  const validationMessage = validateFilterDraft(comparisonFilterDraft.value, rawValue)

  if (validationMessage) {
    errorMessage.value = validationMessage
    return
  }

  const nextFilter: FilterCondition = {
    ...comparisonFilterDraft.value,
    value: parseFilterValue(rawValue, comparisonFilterDraft.value.operator),
    fieldDisplayName: getFieldDisplayName(comparisonFilterDraft.value.field),
    displayValue: buildFilterDisplayValue(comparisonFilterDraft.value, rawValue),
    manualInput: comparisonFilterValueMode.value === 'manual',
  }
  const nextFilters = [...comparisonDraft.value.filters]

  if (comparisonFilterEditIndex.value >= 0) {
    nextFilters.splice(comparisonFilterEditIndex.value, 1, nextFilter)
  } else {
    nextFilters.push(nextFilter)
  }

  comparisonDraft.value = {
    ...comparisonDraft.value,
    filters: nextFilters,
    description: buildComparisonDescription(nextFilters),
  }
  comparisonFilterEditIndex.value = -1
}

const removeComparisonFilter = (index: number): void => {
  const nextFilters = comparisonDraft.value.filters.filter((_, filterIndex) => filterIndex !== index)

  comparisonDraft.value = {
    ...comparisonDraft.value,
    filters: nextFilters,
    description: buildComparisonDescription(nextFilters),
  }
}

const openCreateComparison = (): void => {
  if (comparisonGroups.value.length >= 5) {
    actionNotice.value = 'Demo 阶段最多支持 5 个对照组。'
    return
  }

  comparisonEditMode.value = 'create'
  editingComparisonId.value = ''
  comparisonDraft.value = {
    ...createComparisonDraft(),
    colorKey: getNextComparisonColor(),
    filters: [],
  }
  openCreateComparisonFilter()
  showComparisonConfigModal.value = true
}

const openEditComparison = (group: ComparisonGroup): void => {
  comparisonEditMode.value = 'edit'
  editingComparisonId.value = group.id
  comparisonDraft.value = {
    ...group,
    filters: group.filters.map(cloneFilterCondition),
  }
  openCreateComparisonFilter()
  showComparisonConfigModal.value = true
}

const saveComparisonConfig = (): void => {
  const currentTemplate = template.value

  if (!currentTemplate) {
    return
  }

  const draft: ComparisonGroup = {
    ...comparisonDraft.value,
    name: comparisonDraft.value.name.trim(),
    description: buildComparisonDescription(comparisonDraft.value.filters),
  }

  if (!draft.name) {
    errorMessage.value = '对照组名称不能为空'
    return
  }

  if (draft.name.length > 30) {
    errorMessage.value = '对照组名称不能超过 30 字'
    return
  }

  if (
    currentTemplate.comparisonGroups.some(
      (group) => group.id !== editingComparisonId.value && group.name === draft.name,
    )
  ) {
    errorMessage.value = '同一分析内对照组名称不能重复'
    return
  }

  const comparisonGroupsValue =
    comparisonEditMode.value === 'edit'
      ? currentTemplate.comparisonGroups.map((group) =>
          group.id === editingComparisonId.value ? draft : group,
        )
      : [...currentTemplate.comparisonGroups, draft]

  updateTemplate({
    ...currentTemplate,
    comparisonGroups: comparisonGroupsValue,
  })
  syncChartComparisonGroups(comparisonGroupsValue)
  showComparisonConfigModal.value = false
}

const copyComparisonGroup = (group: ComparisonGroup): void => {
  const currentTemplate = template.value

  if (!currentTemplate) {
    return
  }

  if (currentTemplate.comparisonGroups.length >= 5) {
    actionNotice.value = 'Demo 阶段最多支持 5 个对照组。'
    return
  }

  const copiedGroup: ComparisonGroup = {
    ...group,
    id: `${group.id}_copy_${Date.now()}`,
    name: `${group.name} 副本`,
    colorKey: getNextComparisonColor(),
    filters: group.filters.map(cloneFilterCondition),
  }
  const nextGroups = [...currentTemplate.comparisonGroups, copiedGroup]

  updateTemplate({
    ...currentTemplate,
    comparisonGroups: nextGroups,
  })
  syncChartComparisonGroups(nextGroups)
}

const toggleComparisonGroup = (group: ComparisonGroup): void => {
  const currentTemplate = template.value

  if (!currentTemplate) {
    return
  }

  const nextGroups = currentTemplate.comparisonGroups.map((item) =>
    item.id === group.id ? { ...item, enabled: !item.enabled } : item,
  )

  updateTemplate({
    ...currentTemplate,
    comparisonGroups: nextGroups,
  })
  syncChartComparisonGroups(nextGroups)
}

const removeComparisonGroup = (group: ComparisonGroup): void => {
  const currentTemplate = template.value

  if (!currentTemplate) {
    return
  }

  const nextGroups = currentTemplate.comparisonGroups.filter((item) => item.id !== group.id)

  updateTemplate({
    ...currentTemplate,
    comparisonGroups: nextGroups,
  })
  syncChartComparisonGroups(nextGroups)
  actionNotice.value = `已删除对照组「${group.name}」。`
}

const openCreateGroupBy = (): void => {
  if (groupByConfigs.value.length >= 3) {
    actionNotice.value = '完整产品支持最多 20 层，Demo 阶段支持 3 层。'
    return
  }

  groupEditMode.value = 'create'
  editingGroupId.value = ''
  groupDraft.value = createGroupDraft()
  showGroupConfigModal.value = true
}

const openEditGroupBy = (group: GroupByConfig): void => {
  groupEditMode.value = 'edit'
  editingGroupId.value = group.id
  groupDraft.value = {
    ...group,
    ranges: group.ranges?.map((range) => ({ ...range })),
    applyToMetricIds: [...group.applyToMetricIds],
  }
  showGroupConfigModal.value = true
}

const saveGroupByConfig = (): void => {
  const currentTemplate = template.value

  if (!currentTemplate) {
    return
  }

  const fieldDisplayName = getFieldDisplayName(groupDraft.value.field)

  if (!groupDraft.value.field) {
    errorMessage.value = '分组字段不能为空'
    return
  }

  if (groupDraft.value.groupType === 'number_range') {
    const ranges = groupDraft.value.ranges ?? []
    const invalidRange = ranges.find((range) => !range.label.trim() || range.min > range.max)

    if (invalidRange) {
      errorMessage.value = '数值区间名称不能为空，且起始值不能大于结束值'
      return
    }
  }

  const draft: GroupByConfig = {
    ...groupDraft.value,
    displayName: groupDraft.value.displayName.trim() || fieldDisplayName,
  }
  const groupByConfigsValue =
    groupEditMode.value === 'edit'
      ? currentTemplate.groupByConfigs.map((group) => (group.id === editingGroupId.value ? draft : group))
      : [...currentTemplate.groupByConfigs, draft]

  updateTemplate({
    ...currentTemplate,
    groupByConfigs: groupByConfigsValue,
  })
  showGroupConfigModal.value = false
}

const removeGroupByConfig = (group: GroupByConfig): void => {
  const currentTemplate = template.value

  if (!currentTemplate) {
    return
  }

  updateTemplate({
    ...currentTemplate,
    groupByConfigs: currentTemplate.groupByConfigs.filter((item) => item.id !== group.id),
  })
}

const cloneFormulaMetric = (formula: CustomFormulaMetric): CustomFormulaMetric => ({
  ...formula,
  tokens: formula.tokens.map((token) => ({ ...token })),
  conditions: formula.conditions.map((condition) => ({
    ...condition,
    metricConfig: {
      ...condition.metricConfig,
      filters: condition.metricConfig.filters.map((filter) => ({ ...filter })),
    },
  })),
  displayConfig: { ...formula.displayConfig },
})

const openFormulaEditor = (formula?: CustomFormulaMetric): void => {
  const fallbackFormula = formulaMetrics.value[0]
  const formulaValue = formula ?? fallbackFormula ?? createFormulaDraft()

  formulaDraft.value = cloneFormulaMetric(formulaValue)
  editingFormulaId.value = formulaValue.id
  selectedFormulaConditionId.value = formulaDraft.value.conditions[0]?.id ?? ''
  showFormulaModal.value = true
}

const addFormulaConditionFromMetric = (metricId: string): void => {
  const metric = metricConfigs.value.find((item) => item.id === metricId)

  if (!metric) {
    return
  }

  const conditionIndex = formulaDraft.value.conditions.length
  const conditionId = `condition_${Date.now()}_${conditionIndex}`
  const condition: FormulaCondition = {
    id: conditionId,
    label: `${String.fromCharCode(65 + conditionIndex)}: ${metric.name}`,
    metricConfig: {
      ...metric,
      filters: metric.filters.map((filter) => ({ ...filter })),
    },
    participateInGroup: true,
  }

  formulaDraft.value = {
    ...formulaDraft.value,
    conditions: [...formulaDraft.value.conditions, condition],
  }
  selectedFormulaConditionId.value = conditionId
}

const insertFormulaMetricToken = (): void => {
  const condition = formulaDraft.value.conditions.find(
    (item) => item.id === selectedFormulaConditionId.value,
  )

  if (!condition) {
    return
  }

  const token: FormulaToken = {
    id: `token_metric_${Date.now()}`,
    type: 'metric',
    label: condition.label.replace(/^[A-Z]:\s*/, ''),
    value: condition.metricConfig.id,
    conditionId: condition.id,
  }

  formulaDraft.value = {
    ...formulaDraft.value,
    tokens: [...formulaDraft.value.tokens, token],
  }
}

const insertFormulaOperator = (operator: FormulaOperator): void => {
  const previousToken = formulaDraft.value.tokens[formulaDraft.value.tokens.length - 1]

  if (!previousToken || (previousToken.type === 'parenthesis' && previousToken.parenthesis === '(')) {
    actionNotice.value = '公式为空或左括号后不能插入运算符。'
    return
  }

  const labelMap: Record<FormulaOperator, string> = {
    '+': '+',
    '-': '-',
    '*': '×',
    '/': '÷',
  }
  const token: FormulaToken = {
    id: `token_operator_${Date.now()}`,
    type: 'operator',
    label: labelMap[operator],
    value: operator,
    operator,
  }

  if (previousToken.type === 'operator') {
    formulaDraft.value = {
      ...formulaDraft.value,
      tokens: [...formulaDraft.value.tokens.slice(0, -1), token],
    }
    return
  }

  formulaDraft.value = {
    ...formulaDraft.value,
    tokens: [...formulaDraft.value.tokens, token],
  }
}

const insertFormulaParenthesisPair = (): void => {
  if (formulaDraft.value.tokens.some((token) => token.type === 'parenthesis')) {
    actionNotice.value = '当前版本仅支持一层括号。'
    return
  }

  const openToken: FormulaToken = {
    id: `token_parenthesis_open_${Date.now()}`,
    type: 'parenthesis',
    label: '(',
    value: '(',
    parenthesis: '(',
  }
  const closeToken: FormulaToken = {
    id: `token_parenthesis_close_${Date.now()}`,
    type: 'parenthesis',
    label: ')',
    value: ')',
    parenthesis: ')',
  }

  formulaDraft.value = {
    ...formulaDraft.value,
    tokens: [...formulaDraft.value.tokens, openToken, closeToken],
  }
}

const insertFormulaConstant = (): void => {
  const value = formulaConstantValue.value

  if (!Number.isFinite(value) || Number.isNaN(value)) {
    errorMessage.value = '常数必须是合法数字'
    return
  }

  if (!Number.isInteger(value * 1_000_000)) {
    errorMessage.value = '常数小数最多 6 位'
    return
  }

  const token: FormulaToken = {
    id: `token_constant_${Date.now()}`,
    type: 'constant',
    label: String(value),
    value: String(value),
    constantValue: value,
  }

  formulaDraft.value = {
    ...formulaDraft.value,
    tokens: [...formulaDraft.value.tokens, token],
  }
}

const removeFormulaToken = (tokenId: string): void => {
  formulaDraft.value = {
    ...formulaDraft.value,
    tokens: formulaDraft.value.tokens.filter((token) => token.id !== tokenId),
  }
}

const clearFormulaTokens = (): void => {
  formulaDraft.value = {
    ...formulaDraft.value,
    tokens: [],
  }
}

const toggleFormulaConditionGroup = (conditionId: string): void => {
  formulaDraft.value = {
    ...formulaDraft.value,
    conditions: formulaDraft.value.conditions.map((condition) =>
      condition.id === conditionId
        ? { ...condition, participateInGroup: !condition.participateInGroup }
        : condition,
    ),
  }
}

const saveFormulaMetric = (): void => {
  const currentTemplate = template.value

  if (!currentTemplate) {
    return
  }

  const validation = validateFormulaTokens(formulaDraft.value.tokens)

  if (!validation.valid) {
    errorMessage.value = validation.message
    return
  }

  const draft: CustomFormulaMetric = {
    ...formulaDraft.value,
    name: formulaDraft.value.name.trim() || '未命名公式指标',
  }
  const exists = currentTemplate.formulaMetrics.some((formula) => formula.id === editingFormulaId.value)
  const formulaMetricsValue = exists
    ? currentTemplate.formulaMetrics.map((formula) =>
        formula.id === editingFormulaId.value ? cloneFormulaMetric(draft) : formula,
      )
    : [...currentTemplate.formulaMetrics, cloneFormulaMetric(draft)]
  const linkedMetric: EventMetricConfig = {
    id: draft.id,
    name: draft.name,
    eventName: `formula_${draft.id}`,
    metricType: draft.metricType,
    operator: draft.metricType === 'formula' ? 'FORMULA' : 'CUSTOM',
    expression: draft.tokens.map((token) => token.value).join(' '),
    unit: draft.displayConfig.unit,
    precision: draft.displayConfig.precision,
    filters: [],
    enabled: draft.enabled,
    showAtomicMetrics: draft.displayConfig.showAtomicMetrics,
    groupParticipating: draft.conditions.some((condition) => condition.participateInGroup),
  }
  const metricExists = currentTemplate.metricConfigs.some((metric) => metric.id === linkedMetric.id)
  const metricConfigsValue = metricExists
    ? currentTemplate.metricConfigs.map((metric) => (metric.id === linkedMetric.id ? linkedMetric : metric))
    : [...currentTemplate.metricConfigs, linkedMetric]

  updateTemplate({
    ...currentTemplate,
    formulaMetrics: formulaMetricsValue,
    metricConfigs: metricConfigsValue,
  })
  selectedMetricId.value = draft.id
  showFormulaModal.value = false
  actionNotice.value = `公式指标「${draft.name}」已保存，请重新分析。`
}

const runCurrentAnalysis = async (): Promise<void> => {
  const queryConfig = buildQueryConfig()

  if (!queryConfig) {
    queryState.value = 'error'
    errorMessage.value = '分析配置尚未加载'
    return
  }

  const validationMessage = validateAnalysisConfig(queryConfig)

  if (validationMessage) {
    queryState.value = 'error'
    errorMessage.value = validationMessage
    return
  }

  queryState.value = 'loading'
  errorMessage.value = ''
  queryJson.value = JSON.stringify(queryConfig, null, 2)

  try {
    result.value = await eventAnalysisService.runAnalysis(queryConfig)
    saveRecentLastQuery(queryConfig)
    queryState.value = result.value.tableRows.length > 0 ? 'success' : 'empty'
    configState.value = 'saved'
    actionNotice.value = `分析完成，发现 ${result.value.anomalyPoints.length} 个异常点。`
  } catch (error) {
    queryState.value = 'error'
    errorMessage.value = error instanceof Error ? error.message : '查询失败，请稍后重试'
  }
}

const loadPageData = async (): Promise<void> => {
  queryState.value = 'loading'
  errorMessage.value = ''

  try {
    const [metadataData, defaultTemplate, dashboardData] = await Promise.all([
      eventAnalysisService.getEventMetadata(),
      eventAnalysisService.getDefaultTemplate(),
      eventAnalysisService.getDashboardLocations(),
    ])

    metadata.value = metadataData
    template.value = defaultTemplate
    selectedTemplateId.value = defaultTemplate.id
    selectedEventName.value = defaultTemplate.primaryEventName
    selectedMetricId.value = defaultTemplate.primaryMetricId
    chartConfig.value = { ...defaultTemplate.chartConfig }
    customTimeRangeValue.value = [
      dayjs(defaultTemplate.timeRange.startDate).valueOf(),
      dayjs(defaultTemplate.timeRange.endDate).valueOf(),
    ]
    customComparisonRangeValue.value =
      defaultTemplate.timeRange.customComparisonStartDate && defaultTemplate.timeRange.customComparisonEndDate
        ? [
            dayjs(defaultTemplate.timeRange.customComparisonStartDate).valueOf(),
            dayjs(defaultTemplate.timeRange.customComparisonEndDate).valueOf(),
          ]
        : null
    dashboardLocations.value = dashboardData

    const recentQueryConfig = readRecentLastQuery()

    if (recentQueryConfig) {
      applyQueryConfigToPage(defaultTemplate, recentQueryConfig)
      await runCurrentAnalysis()
      actionNotice.value = '已恢复 24 小时内最后一次查询结果。'
      return
    }

    result.value = null
    queryJson.value = ''
    queryState.value = 'idle'
    configState.value = 'saved'
  } catch (error) {
    queryState.value = 'error'
    errorMessage.value = error instanceof Error ? error.message : '事件分析数据加载失败'
  }
}

const updateChartType = (chartType: ChartType): void => {
  chartConfig.value = {
    ...chartConfig.value,
    chartType,
  }
  actionNotice.value = '图表类型已切换，当前结果已重新渲染。'
}

const selectMetricCard = (card: EventAnalysisMetricCard): void => {
  selectedMetricId.value = card.metricId
  chartConfig.value = {
    ...chartConfig.value,
    selectedMetricIds: [card.metricId],
  }
  temporaryFilter.value = ''
  activeTab.value = 'detail'
  actionNotice.value = `主图已切换到「${card.metricName}」。`
}

const applyTemporaryFilter = (field: string, value: string): void => {
  temporaryFilter.value = value
  activeTab.value = 'detail'
  actionNotice.value = `已添加临时筛选：${field} = ${value}`
}

const selectAnomaly = (date: string): void => {
  selectedAnomalyDate.value = date
  activeTab.value = 'anomaly'
  actionNotice.value = `已打开 ${date} 异常诊断。`
  setTimeout(() => {
    document.querySelector('.bottom-result-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, 0)
}

const openUserDrawer = async (row: EventAnalysisDetailRow): Promise<void> => {
  selectedRow.value = row
  drawerVisible.value = true
  affectedUsers.value = await eventAnalysisService.getAffectedUsers(row.id)
  checkedUserRowKeys.value = affectedUsers.value.slice(0, 6).map((user) => user.userId)
}

const openUserDrawerFromContribution = async (item: DimensionContribution): Promise<void> => {
  const matchedRow = (result.value?.tableRows ?? []).find((row) =>
    [
      row.coinBalanceLevel,
      row.adPosition,
      row.gameType,
      row.paymentStatus,
      row.appVersion,
      row.userGroup,
      row.comparisonGroup,
    ].includes(item.dimensionValue),
  )

  selectedRow.value = matchedRow ?? {
    id: item.id,
    date: result.value?.anomalyDiagnosis.anomalyDate ?? '',
    comparisonGroup: '异常贡献用户',
    userGroup: item.dimensionValue,
    coinBalanceLevel: item.dimensionValue,
    adPosition: item.dimensionValue,
    gameType: item.dimension,
    paymentStatus: '',
    appVersion: '',
    adWatchPv: item.actualValue,
    adWatchUv: item.affectedUsers,
    adWatchPerUser: item.affectedUsers ? Number((item.actualValue / item.affectedUsers).toFixed(2)) : 0,
    adCompleteRate: 0,
    adRevenue: 0,
    wowChange: item.diffRate,
    yoyChange: item.diffRate,
    contributionRate: item.contributionRate,
    affectedUsers: item.affectedUsers,
  }
  drawerVisible.value = true
  affectedUsers.value = await eventAnalysisService.getAffectedUsers(item.id)
  checkedUserRowKeys.value = affectedUsers.value.slice(0, 6).map((user) => user.userId)
}

const notifyUserExport = (): void => {
  actionNotice.value = `已选择 ${selectedUsers.value.length} 个用户，Demo 阶段仅展示导出入口。`
}

const goToAction = (action: RecommendedAction): void => {
  const query = Object.fromEntries(
    Object.entries(action.payload).map(([key, value]) => [key, formatPayloadValue(value)]),
  )

  void router.push({
    path: action.targetRoute,
    query,
  })
}

const createSegment = async (): Promise<void> => {
  const saveResult = await eventAnalysisService.saveAsSegment({
    segmentName: '低金币高活跃广告下降用户',
    description: '来源于事件分析异常诊断',
    estimatedUsers: 28640,
    sourceMetric: '广告观看次数',
  })
  actionNotice.value = saveResult.message
  const action = result.value?.anomalyDiagnosis.recommendedActions.find(
    (item) => item.actionType === 'create_segment',
  )

  if (action) {
    goToAction(action)
  }
}

const createCampaign = (): void => {
  const action = result.value?.anomalyDiagnosis.recommendedActions.find(
    (item) => item.actionType === 'create_campaign',
  )

  if (action) {
    goToAction(action)
  }
}

const createExperiment = (): void => {
  const action = result.value?.anomalyDiagnosis.recommendedActions.find(
    (item) => item.actionType === 'create_experiment',
  )

  if (action) {
    goToAction(action)
  }
}

const buildSavedAnalysisQueryConfig = (): AnalysisQueryConfig | null => {
  if (!template.value) {
    return null
  }

  return {
    analysisType: 'event',
    timeRange: template.value.timeRange,
    timezone: timezone.value,
    subjectType: 'app_user',
    statisticUnit: statisticsSubject.value,
    moduleConfig: {
      metrics: metricConfigs.value,
      formulaMetrics: formulaMetrics.value,
      filters: filters.value,
      groupBys: groupByConfigs.value,
      comparisonGroups: comparisonGroups.value,
      anomalyConfig: {
        confidenceInterval: confidenceInterval.value,
        lookbackDays: anomalyLookbackDays.value,
      },
    },
  }
}

const buildSavedAnalysisChartConfig = (): AnalysisChartConfig => ({
  chartType: chartConfig.value.chartType,
  selectedMetricIds: chartConfig.value.selectedMetricIds,
  selectedGroupByIds: chartConfig.value.selectedGroupById ? [chartConfig.value.selectedGroupById] : [],
  topN: chartConfig.value.topN,
  mergeOthers: chartConfig.value.mergeOthers,
  showLegend: chartConfig.value.showLegend,
  showTooltip: chartConfig.value.showTooltip,
  showDataLabel: chartConfig.value.showDataLabel,
  showCompareLine: chartConfig.value.showCompareLine,
  showAnomalyPoint: chartConfig.value.showAnomalyPoint,
  showPredictionBand: chartConfig.value.showPredictionBand,
  displayMode: chartConfig.value.displayMode,
})

const buildSavedAnalysisTableConfig = (): AnalysisTableConfig => ({
  tableMode: chartConfig.value.tableMode ?? 'flat',
  visibleColumns: ['userId', ...selectedUserProfileFields.value],
  pageSize: 10,
})

const buildSavedAnalysisInteractionState = (): AnalysisInteractionState => ({
  selectedMetricId: selectedMetricId.value,
  selectedAnomalyId: selectedAnomalyDate.value,
  selectedGroupValue: temporaryFilter.value,
  activeTab: activeTab.value,
})

const openSaveAnalysisModal = (mode: 'create' | 'copy' = 'create'): void => {
  saveAnalysisMode.value = mode
  const metricName = getMetricDisplayName(selectedMetricId.value || chartConfig.value.selectedMetricIds[0] || 'metric_ad_watch_pv')
  saveAnalysisDraft.value = {
    ...saveAnalysisDraft.value,
    name: mode === 'copy'
      ? `${saveAnalysisDraft.value.name || metricName} 副本`
      : saveAnalysisDraft.value.name || `${metricName} - 事件分析`,
  }
  showSaveAnalysisModal.value = true
}

const submitSaveAnalysis = async (): Promise<void> => {
  const queryConfig = buildSavedAnalysisQueryConfig()

  if (!queryConfig) {
    actionNotice.value = '当前分析配置不完整，无法保存'
    return
  }

  if (!saveAnalysisDraft.value.name.trim()) {
    actionNotice.value = '请输入分析名称'
    return
  }

  if (saveAnalysisDraft.value.name.trim().length > 50) {
    actionNotice.value = '分析名称不能超过 50 个字符'
    return
  }

  analysisDirtyState.value = 'saving'
  savingAnalysis.value = true

  try {
    const saveResult = await eventAnalysisService.saveAnalysisConfig({
      analysisId: saveAnalysisMode.value === 'create' ? currentSavedAnalysisId.value || undefined : undefined,
      templateId: selectedTemplateId.value,
      name: saveAnalysisDraft.value.name.trim(),
      description: saveAnalysisDraft.value.description,
      visibility: saveAnalysisDraft.value.visibility,
      folderId: saveAnalysisDraft.value.folderId,
      tags: saveAnalysisDraft.value.tags,
      saveChartState: saveAnalysisDraft.value.saveChartState,
      saveTableState: saveAnalysisDraft.value.saveTableState,
      savedAnalysis: {
        name: saveAnalysisDraft.value.name.trim(),
        description: saveAnalysisDraft.value.description,
        analysisType: 'event',
        ownerId: 'u_chaoyang',
        ownerName: 'Chaoyang Xu',
        visibility: saveAnalysisDraft.value.visibility,
        folderId: saveAnalysisDraft.value.folderId,
        tags: saveAnalysisDraft.value.tags,
        queryConfig,
        chartConfig: buildSavedAnalysisChartConfig(),
        tableConfig: saveAnalysisDraft.value.saveTableState ? buildSavedAnalysisTableConfig() : undefined,
        interactionState: saveAnalysisDraft.value.saveChartState ? buildSavedAnalysisInteractionState() : undefined,
      },
    })
    currentSavedAnalysisId.value = saveResult.id
    currentSavedAnalysisVersion.value += 1
    currentSavedAnalysisUpdatedAt.value = '刚刚更新'
    analysisDirtyState.value = 'saved'
    configState.value = 'saved'
    showSaveAnalysisModal.value = false
    actionNotice.value = saveResult.message
  } catch {
    analysisDirtyState.value = 'save_failed'
    actionNotice.value = '保存失败，请稍后重试'
  } finally {
    savingAnalysis.value = false
  }
}

const saveAnalysis = async (): Promise<void> => {
  if (currentSavedAnalysisId.value && analysisDirtyState.value === 'dirty') {
    await submitSaveAnalysis()
    return
  }

  if (!currentSavedAnalysisId.value || analysisDirtyState.value === 'new') {
    openSaveAnalysisModal('create')
  }
}

const submitDownload = async (): Promise<void> => {
  const task = await eventAnalysisService.createDownloadTask({
    range: downloadRange.value,
    contents: downloadContents.value,
    format: downloadFormat.value,
  })

  showDownloadModal.value = false
  actionNotice.value =
    task.range === 'page_result'
      ? '页面结果下载任务已生成。'
      : '更多数据下载任务已创建，完成后将通过通知中心提醒。'
}

const getDashboardDefaultName = (saveObject: DashboardWidgetSaveObject): string => {
  const metricName = getMetricDisplayName(selectedMetricId.value || chartConfig.value.selectedMetricIds[0] || 'metric_ad_watch_pv')

  if (saveObject === 'metric_card') {
    return `${metricName}指标卡`
  }

  if (saveObject === 'table') {
    return '广告观看下降明细表'
  }

  if (saveObject === 'chart_group') {
    return '广告观看下降分析图表组'
  }

  return `${metricName}趋势图`
}

const getDefaultDashboardDisplayItems = (chartType: DashboardWidgetChartType): DashboardSummaryItem[] => {
  if (chartType === 'line') {
    return ['latest', 'wow']
  }

  if (chartType === 'bar' || chartType === 'stacked') {
    return ['total']
  }

  if (chartType === 'dual_axis' || chartType === 'percentage' || chartType === 'cumulative') {
    return ['latest']
  }

  return []
}

const openSaveDashboardModal = (saveObject: DashboardWidgetSaveObject = 'chart'): void => {
  dashboardSaveObject.value = saveObject
  dashboardSaveChartType.value =
    saveObject === 'metric_card'
      ? 'metric_card'
      : saveObject === 'table'
        ? 'table'
        : chartConfig.value.chartType
  dashboardChartName.value = getDashboardDefaultName(saveObject)
  dashboardDescription.value = ''
  dashboardTags.value = ['事件分析', '广告观看下降']
  dashboardDisplayItems.value = getDefaultDashboardDisplayItems(dashboardSaveChartType.value)
  dashboardRefreshMode.value = 'open'
  dashboardRefreshSchedule.value = 'daily_9'
  dashboardSpaceType.value = 'personal'
  dashboardId.value =
    dashboardLocations.value.find((location) => location.spaceType === 'personal' && location.canWrite)?.id ??
    dashboardLocations.value[0]?.id ??
    ''
  newDashboardName.value = ''
  dashboardSaveResultLink.value = ''
  showDashboardModal.value = true
}

const updateDashboardChartType = (chartType: DashboardWidgetChartType): void => {
  dashboardSaveChartType.value = chartType
  dashboardDisplayItems.value = getDefaultDashboardDisplayItems(chartType)
}

const createInlineDashboard = (): void => {
  const name = newDashboardName.value.trim()

  if (!name) {
    actionNotice.value = '请输入新看板名称。'
    return
  }

  const duplicate = dashboardLocations.value.some(
    (location) => location.spaceType === dashboardSpaceType.value && location.name === name,
  )

  if (duplicate) {
    actionNotice.value = '同一空间下已存在同名看板。'
    return
  }

  const nextLocation: DashboardLocation = {
    id: `dash-inline-${Date.now()}`,
    name,
    path: `${dashboardSpaceType.value === 'team' ? '团队空间' : dashboardSpaceType.value === 'public' ? '公共空间' : '个人空间'} / ${name}`,
    spaceType: dashboardSpaceType.value === 'all' ? 'personal' : dashboardSpaceType.value,
    canWrite: dashboardSpaceType.value !== 'public',
    widgets: [],
  }
  dashboardLocations.value = [...dashboardLocations.value, nextLocation]
  dashboardId.value = nextLocation.id
  newDashboardName.value = ''
}

const submitDashboardSave = async (): Promise<void> => {
  const validationMessage = dashboardSaveValidationMessage.value
  const queryConfig = buildQueryConfig()

  if (validationMessage) {
    actionNotice.value = validationMessage
    return
  }

  if (!queryConfig) {
    actionNotice.value = '当前分析配置已失效，请重新分析。'
    return
  }

  dashboardSaving.value = true

  const saveResult = await eventAnalysisService.saveToDashboard({
    chartName: dashboardChartName.value,
    description: dashboardDescription.value,
    sourceAnalysis: '事件分析',
    sourceDescription: '当前事件分析查询配置',
    tags: dashboardTags.value,
    saveObject: dashboardSaveObject.value,
    spaceType: dashboardLocation.value?.spaceType ?? 'personal',
    dashboardId: dashboardId.value,
    chartType: dashboardSaveChartType.value,
    displayItems: dashboardDisplayItems.value,
    refreshMode: dashboardRefreshMode.value,
    refreshSchedule: dashboardRefreshMode.value === 'scheduled' ? dashboardRefreshSchedule.value : undefined,
    fixedSnapshot: dashboardRefreshMode.value === 'snapshot',
    queryConfig,
    chartConfig: {
      ...chartConfig.value,
      chartType: dashboardSaveChartType.value === 'metric_card' || dashboardSaveChartType.value === 'table'
        ? chartConfig.value.chartType
        : dashboardSaveChartType.value,
    },
  })

  dashboardSaving.value = false
  dashboardSaveResultLink.value = `/analysis-center/dashboards/${dashboardId.value}`
  actionNotice.value = saveResult.message
}

const getUserPropertyColumn = (
  field: string,
): DataTableColumns<AffectedUser>[number] | null => {
  const fieldConfig = userPropertyFieldMap[field]

  if (!fieldConfig) {
    return null
  }

  return {
    title: fieldConfig.label,
    key: fieldConfig.key,
    width: fieldConfig.width,
    sorter: (rowA, rowB) => {
      const valueA = rowA[fieldConfig.key]
      const valueB = rowB[fieldConfig.key]

      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return valueA - valueB
      }

      return String(valueA).localeCompare(String(valueB), 'zh-CN')
    },
    render: (row) => {
      const value = row[fieldConfig.key]

      if (field === 'ad_watch_decline_rate_3d') {
        return `${value}%`
      }

      return String(value)
    },
  }
}

const getUserTagColumn = (field: string): DataTableColumns<AffectedUser>[number] | null => {
  const tag = metadata.value?.userTags.find((item) => item.field === field)
  const valueGetter = userTagValueGetters[field]

  if (!tag || !valueGetter) {
    return null
  }

  return {
    title: tag.displayName,
    key: `tag:${field}`,
    width: 112,
    filterOptions: tag.valueExamples.map((value) => ({
      label: value,
      value,
    })),
    filter: (value, row) => valueGetter(row) === value,
    render: (row) => {
      const value = valueGetter(row)

      if (field === 'churn_risk') {
        return h(NTag, { type: getRiskTagType(row.churnRisk), size: 'small' }, () => value)
      }

      return h(NTag, { size: 'small' }, () => value)
    },
  }
}

const userColumns = computed<DataTableColumns<AffectedUser>>(() => {
  const configurableColumns = selectedUserProfileFields.value
    .map((fieldKey) => {
      const [source, field] = fieldKey.split(':')

      if (!source || !field) {
        return null
      }

      return source === 'tag' ? getUserTagColumn(field) : getUserPropertyColumn(field)
    })
    .filter((column): column is DataTableColumns<AffectedUser>[number] => Boolean(column))

  return [
    { type: 'selection' },
    { title: '用户 ID', key: 'userId', width: 120, fixed: 'left' },
    ...configurableColumns,
  ]
})

onMounted(() => {
  void loadPageData()
})
</script>

<template>
  <div class="page-container event-analysis-page">
    <div class="workspace-header">
      <div>
        <h1 class="page-title">
          事件分析
          <n-tag v-if="configState === 'unsaved'" type="warning" size="small">未保存</n-tag>
        </h1>
        <p class="page-description">
          通过事件、指标、筛选、分组和图表配置，完成广告观看下降的行为分析与诊断。
        </p>
      </div>

      <n-space align="center" :size="8">
        <n-button
          size="small"
          :loading="savingAnalysis"
          :disabled="analysisDirtyState === 'saved'"
          @click="saveAnalysis"
        >
          {{ saveAnalysisButtonText }}
        </n-button>
        <n-button size="small" @click="openSaveAnalysisModal('copy')">另存为</n-button>
        <n-button size="small" @click="openSaveDashboardModal('chart')">保存到看板</n-button>
        <n-button size="small" @click="showDownloadModal = true">下载数据</n-button>
        <n-button size="small" type="primary" secondary @click="createSegment">保存分群</n-button>
        <n-button size="small" type="primary" @click="createCampaign">创建运营任务</n-button>
        <n-button size="small" type="success" @click="createExperiment">创建 A/B 实验</n-button>
      </n-space>
    </div>

    <n-alert v-if="actionNotice" type="success" :show-icon="false" class="notice-alert">
      {{ actionNotice }}
    </n-alert>
    <n-alert v-if="errorMessage" type="error" :show-icon="false" class="notice-alert">
      {{ errorMessage }}
    </n-alert>

    <n-spin :show="loading">
      <div class="analysis-workbench">
        <aside class="config-panel">
          <div class="config-panel-stack">
            <n-collapse
              v-model:expanded-names="activeConfigPanels"
              accordion
              class="config-collapse"
              arrow-placement="right"
            >
              <n-collapse-item name="metrics">
                <template #header>
                  <div class="config-collapse-header">
                    <strong>1. 指标配置</strong>
                    <span>{{ metricConfigs.length }} 个指标</span>
                  </div>
                </template>
              <n-space vertical :size="12">
                <p class="muted">选择事件和计算方式，构建分析指标。</p>
                <div class="action-row">
                  <n-button size="tiny" secondary @click="openCreateMetric('event')">+ 事件指标</n-button>
                  <n-button size="tiny" secondary @click="openCreateMetric('property')">+ 属性指标</n-button>
                  <n-button size="tiny" secondary @click="openFormulaEditor()">+ 自定义指标</n-button>
                  <n-button size="tiny" secondary @click="openFormulaEditor()">+ 公式指标</n-button>
                  <n-button size="tiny" @click="resetMetricConfigs">
                    重置
                  </n-button>
                </div>
                <div class="config-list">
                  <div v-for="metric in visibleMetricConfigs" :key="metric.id" class="config-item compact-metric-item">
                    <div>
                      <strong>{{ metric.name }}</strong>
                      <span>
                        {{ metric.eventName }} · {{ metric.operator }}
                        <template v-if="metric.propertyName"> · {{ metric.propertyName }}</template>
                        · 过滤条件 {{ metric.filters.length }}
                      </span>
                    </div>
                    <n-space :size="6">
                      <n-tag size="small" :type="metric.enabled ? 'info' : 'default'">
                        {{ metric.enabled ? metric.metricType : '禁用' }}
                      </n-tag>
                      <n-button size="tiny" text @click="openEditMetric(metric)">编辑</n-button>
                      <n-button size="tiny" text @click="copyMetricConfig(metric)">复制</n-button>
                      <n-button size="tiny" text @click="toggleMetricConfig(metric)">
                        {{ metric.enabled ? '禁用' : '启用' }}
                      </n-button>
                      <n-button size="tiny" text type="error" @click="removeMetricConfig(metric)">删除</n-button>
                    </n-space>
                  </div>
                </div>
                <n-button
                  v-if="metricConfigs.length > 3"
                  class="full-button"
                  size="small"
                  secondary
                  @click="showAllMetrics = !showAllMetrics"
                >
                  {{ showAllMetrics ? '收起指标列表' : `展开全部 ${metricConfigs.length} 个指标` }}
                </n-button>
              </n-space>
              </n-collapse-item>

              <n-collapse-item name="filters">
                <template #header>
                  <div class="config-collapse-header">
                    <strong>2. 细分筛选</strong>
                    <span>{{ filters.length }} 条条件</span>
                  </div>
                </template>
              <p class="muted">限定参与本次分析的用户范围，支持一级条件和行为/动态匹配配置。</p>
              <div class="action-row">
                <n-button size="tiny" secondary @click="openCreateFilter('event_property')">+ 属性过滤</n-button>
                <n-button size="tiny" secondary @click="openCreateFilter('behavior')">+ 行为圈选</n-button>
                <n-button size="tiny" secondary @click="openCreateFilter('dynamic_match')">+ 动态匹配</n-button>
                <n-button size="tiny" @click="requestClearFilters">清空筛选</n-button>
              </div>
              <div class="config-list">
                <div v-for="(filter, index) in filters" :key="filter.id" class="config-item">
                  <div>
                    <strong>
                      <template v-if="index > 0">{{ filter.logic }} · </template>
                      {{ filter.sourceType === 'behavior' ? '行为圈选' : filter.sourceType === 'dynamic_match' ? '动态匹配' : filter.fieldDisplayName }}
                    </strong>
                    <span>
                      {{ filter.displayValue }}
                      <template v-if="filter.childFilters?.length"> · 二级过滤 {{ filter.childFilters.length }} 条</template>
                    </span>
                  </div>
                  <n-space :size="6">
                    <n-button size="tiny" text @click="openEditFilter(filter)">编辑</n-button>
                    <n-button size="tiny" text type="error" @click="removeFilterConfig(filter)">删除</n-button>
                  </n-space>
                </div>
              </div>
              <n-button class="full-button" size="small" secondary @click="openCreateFilter('event_property')">
                添加筛选条件
              </n-button>
              </n-collapse-item>

              <n-collapse-item name="comparison">
                <template #header>
                  <div class="config-collapse-header">
                    <strong>3. 对照组</strong>
                    <span>{{ comparisonGroups.length }} 个分组</span>
                  </div>
                </template>
              <div class="comparison-list">
                <div v-for="group in comparisonGroups" :key="group.id" class="comparison-item">
                  <i :style="{ background: group.colorKey }" />
                  <div>
                    <strong>{{ group.name }}</strong>
                    <span>
                      {{ group.description }}
                      <template v-if="group.filters.length"> · 条件 {{ group.filters.length }} 条</template>
                    </span>
                  </div>
                  <n-tag size="small" :type="group.enabled ? 'success' : 'default'">
                    {{ group.enabled ? '启用' : '禁用' }}
                  </n-tag>
                  <n-space :size="6">
                    <n-button size="tiny" text @click="openEditComparison(group)">编辑</n-button>
                    <n-button size="tiny" text @click="copyComparisonGroup(group)">复制</n-button>
                    <n-button size="tiny" text type="error" @click="removeComparisonGroup(group)">删除</n-button>
                    <n-switch size="small" :value="group.enabled" @update:value="toggleComparisonGroup(group)" />
                  </n-space>
                </div>
              </div>
              <n-alert v-if="anomalyDiagnosisDisabled" type="warning" :show-icon="false" class="inline-alert">
                当前指标和对照组组合过多，或图表不是折线图，暂不支持异常诊断。请减少指标或对照组后重试。
              </n-alert>
              <n-button class="full-button" size="small" secondary @click="openCreateComparison">
                添加对照组
              </n-button>
              </n-collapse-item>

              <n-collapse-item name="groupBys">
                <template #header>
                  <div class="config-collapse-header">
                    <strong>4. 属性分组</strong>
                    <span>{{ groupByConfigs.length }} 层</span>
                  </div>
                </template>
              <div class="config-list">
                <div v-for="group in groupByConfigs" :key="group.id" class="config-item">
                  <div>
                    <strong>{{ group.displayName }}</strong>
                    <span>
                      Top {{ group.topN }} · {{ group.sourceType }} ·
                      {{ group.applyToMetricIds.length ? '作用于指定指标' : '作用于全部指标' }}
                    </span>
                  </div>
                  <n-space :size="6">
                    <n-tag size="small" :type="group.enabled ? 'success' : 'default'">
                      {{ group.groupType }}
                    </n-tag>
                    <n-button size="tiny" text @click="openEditGroupBy(group)">编辑</n-button>
                    <n-button size="tiny" text type="error" @click="removeGroupByConfig(group)">删除</n-button>
                  </n-space>
                </div>
              </div>
              <n-button class="full-button" size="small" secondary @click="openCreateGroupBy">
                添加属性分组
              </n-button>
              <p class="muted limit-note">完整产品支持最多 20 层，Demo 阶段支持 3 层。</p>
              </n-collapse-item>
            </n-collapse>

            <n-button block type="primary" size="large" @click="runCurrentAnalysis">
              5. 开始分析
            </n-button>
          </div>
        </aside>

        <section class="result-panel">
          <n-space vertical :size="16">
            <n-card :bordered="false">
              <n-space vertical :size="12">
                <div class="result-toolbar">
                  <div>
                    <strong>时间范围 / 粒度 / 对比 / 图表类型</strong>
                    <span>
                      修改配置后不会立即查询，需要点击开始分析刷新结果。
                    </span>
                  </div>
                  <n-space :size="8">
                    <n-tag :type="queryState === 'dirty' ? 'warning' : 'info'" size="small">
                      查询状态：{{ queryState }}
                    </n-tag>
                    <n-tag v-if="queryState === 'dirty'" type="warning" size="small">
                      配置已修改，请重新分析
                    </n-tag>
                    <n-button size="small" @click="runCurrentAnalysis">刷新分析</n-button>
                  </n-space>
                </div>
                <n-grid :cols="6" :x-gap="10" :y-gap="10" responsive="screen">
                  <n-gi>
                    <n-select
                      :value="template?.timeRange.preset"
                      :options="timeRangeOptions"
                      size="small"
                      @update:value="(value) => handleTimePresetChange(String(value))"
                    />
                  </n-gi>
                  <n-gi v-if="template?.timeRange.preset === 'custom'" :span="2">
                    <n-date-picker
                      :value="customTimeRangeValue"
                      type="daterange"
                      clearable
                      size="small"
                      start-placeholder="开始日期"
                      end-placeholder="结束日期"
                      @update:value="handleCustomTimeRangeChange"
                    />
                  </n-gi>
                  <n-gi>
                    <n-select
                      :value="template?.timeRange.granularity"
                      :options="granularityOptions"
                      size="small"
                      @update:value="(value) => handleGranularityChange(String(value))"
                    />
                  </n-gi>
                  <n-gi>
                    <n-select
                      :value="template?.timeRange.comparisonType"
                      :options="comparisonTypeOptions"
                      size="small"
                      @update:value="(value) => handleComparisonTypeChange(String(value))"
                    />
                  </n-gi>
                  <n-gi v-if="template?.timeRange.comparisonType === 'custom'" :span="2">
                    <n-date-picker
                      :value="customComparisonRangeValue"
                      type="daterange"
                      clearable
                      size="small"
                      start-placeholder="对比开始"
                      end-placeholder="对比结束"
                      @update:value="handleCustomComparisonRangeChange"
                    />
                  </n-gi>
                  <n-gi>
                    <n-select v-model:value="timezone" :options="timezoneOptions" size="small" @update:value="markDirty" />
                  </n-gi>
                  <n-gi>
                    <n-select
                      v-model:value="statisticsSubject"
                      :options="statisticsSubjectOptions"
                      size="small"
                      @update:value="markDirty"
                    />
                  </n-gi>
                  <n-gi>
                    <n-select
                      value="app_user"
                      :options="[{ label: 'App 用户', value: 'app_user', disabled: true }]"
                      size="small"
                      disabled
                    />
                  </n-gi>
                </n-grid>
              </n-space>
            </n-card>

            <div class="metric-card-grid">
              <n-tooltip v-for="card in result?.metricCards ?? []" :key="card.id" trigger="hover">
                <template #trigger>
                  <n-card
                    class="metric-card"
                    :class="{ active: selectedMetricId === card.metricId }"
                    :bordered="false"
                    @click="selectMetricCard(card)"
                  >
                    <n-statistic :label="card.metricName" :value="formatMetricValue(card)" />
                    <div class="metric-card-footer">
                      <n-tag :type="getMetricTagType(card.status)" size="small">
                        {{ formatRate(card.changeRate) }}
                      </n-tag>
                      <span>{{ card.status === 'critical' ? '异常' : card.status === 'warning' ? '预警' : card.status === 'growth' ? '上升' : '正常' }}</span>
                    </div>
                    <p>{{ card.tooltip }}</p>
                  </n-card>
                </template>
                <pre class="metric-tooltip">{{ getMetricTooltip(card) }}</pre>
              </n-tooltip>
            </div>
            <n-card v-if="!result && queryState === 'idle'" :bordered="false">
              <n-empty description="24 小时内没有可恢复的查询结果，请配置条件后点击开始分析。">
                <template #extra>
                  <n-button type="primary" @click="runCurrentAnalysis">开始分析</n-button>
                </template>
              </n-empty>
            </n-card>

            <n-card :bordered="false">
              <template #header>
                <div class="chart-title-block">
                  <strong>{{ chartTitle }}</strong>
                  <span>{{ chartSubtitle }}</span>
                </div>
              </template>
              <template #header-extra>
                <n-space :size="8" align="center">
                  <n-button size="small" @click="showChartConfigDrawer = true">图表配置</n-button>
                </n-space>
              </template>
              <div class="chart-shell">
                <event-analysis-chart-renderer
                  :result="result"
                  :config="chartConfig"
                  :loading="loading"
                  @select-anomaly="selectAnomaly"
                  @filter-detail="applyTemporaryFilter"
                  @open-users="(row) => void openUserDrawer(row)"
                />
              </div>
            </n-card>
          </n-space>

          <section class="bottom-result-section">
            <n-card :bordered="false">
              <n-tabs v-model:value="activeTab" type="line">
                <n-tab-pane name="detail" tab="详细数据">
                  <div class="tab-toolbar">
                    <n-space>
                      <n-tag v-if="temporaryFilter" type="warning" closable @close="temporaryFilter = ''">
                        临时筛选：{{ temporaryFilter }}
                      </n-tag>
                      <n-button size="small" @click="showGrowthColumns = !showGrowthColumns">
                        {{ showGrowthColumns ? '隐藏增长百分比' : '展示增长百分比' }}
                      </n-button>
                      <n-button
                        size="small"
                        :type="chartConfig.tableMode === 'hierarchy' ? 'primary' : 'default'"
                        @click="chartConfig.tableMode = chartConfig.tableMode === 'hierarchy' ? 'flat' : 'hierarchy'"
                      >
                        数据透视表
                      </n-button>
                      <n-button size="small" @click="chartConfig.tableMode = chartConfig.tableMode === 'transpose' ? 'flat' : 'transpose'">
                        行列转置
                      </n-button>
                      <n-button size="small" @click="showDownloadModal = true">下载</n-button>
                    </n-space>
                  </div>
                  <event-result-table
                    :result="result ? { ...result, tableRows: filteredDetailRows } : null"
                    :config="chartConfig"
                    :loading="loading"
                    :selected-metric-id="selectedMetricId"
                    :show-growth-columns="showGrowthColumns"
                    @filter-detail="applyTemporaryFilter"
                    @open-users="(row) => void openUserDrawer(row)"
                  />
                </n-tab-pane>

                <n-tab-pane name="anomaly" tab="异常诊断">
                  <n-alert v-if="anomalyDiagnosisDisabled" type="warning" :show-icon="false">
                    当前配置不支持异常诊断，请切换为折线图或减少指标/对照组。
                  </n-alert>
                  <template v-else-if="result?.anomalyDiagnosis">
                    <n-alert v-if="!selectedAnomalyDate" type="info" :show-icon="false" class="diagnosis-block">
                      发现 {{ anomalyOverview.count }} 个异常点。
                      <template v-if="anomalyOverview.maxAnomaly">
                        最大异常：{{ anomalyOverview.maxAnomaly.date }}，{{ anomalyOverview.maxAnomaly.metricName }}
                        下降 {{ Math.abs(((anomalyOverview.maxAnomaly.actualValue - anomalyOverview.maxAnomaly.expectedValue) / anomalyOverview.maxAnomaly.expectedValue) * 100).toFixed(1) }}%。
                      </template>
                      请点击趋势图异常点查看诊断详情。
                    </n-alert>

                    <n-space class="diagnosis-block" align="center">
                      <span class="modal-label">置信区间</span>
                      <n-input-number v-model:value="confidenceInterval" :min="80" :max="99" size="small" />
                      <span class="modal-label">回溯天数</span>
                      <n-input-number v-model:value="anomalyLookbackDays" :min="7" :max="180" size="small" />
                      <n-tag size="small" type="info">Demo 展示设置，不重新计算</n-tag>
                    </n-space>

                    <n-descriptions :column="4" size="small" label-placement="top" bordered>
                      <n-descriptions-item label="指标名称">
                        {{ result.anomalyDiagnosis.metricName }}
                      </n-descriptions-item>
                      <n-descriptions-item label="异常日期">
                        {{ selectedAnomalyPoint?.date ?? result.anomalyDiagnosis.anomalyDate }}
                      </n-descriptions-item>
                      <n-descriptions-item label="实际值">
                        {{ formatNumber(result.anomalyDiagnosis.actualValue) }}
                      </n-descriptions-item>
                      <n-descriptions-item label="参考值">
                        {{ formatNumber(result.anomalyDiagnosis.expectedValue) }}
                      </n-descriptions-item>
                      <n-descriptions-item label="预测区间">
                        {{ formatNumber(result.anomalyDiagnosis.lowerBound) }} - {{ formatNumber(result.anomalyDiagnosis.upperBound) }}
                      </n-descriptions-item>
                      <n-descriptions-item label="差异">
                        {{ formatNumber(result.anomalyDiagnosis.diff) }}
                      </n-descriptions-item>
                      <n-descriptions-item label="差异率">
                        {{ formatRate(result.anomalyDiagnosis.diffRate) }}
                      </n-descriptions-item>
                      <n-descriptions-item label="置信度">
                        {{ result.anomalyDiagnosis.confidence }}%
                      </n-descriptions-item>
                      <n-descriptions-item label="异常等级">
                        {{ result.anomalyDiagnosis.severity }}
                      </n-descriptions-item>
                    </n-descriptions>

                    <n-card size="small" title="贡献维度" class="diagnosis-block">
                      <n-space vertical>
                        <n-input v-model:value="contributionKeyword" placeholder="搜索维度或维度值" size="small" />
                        <n-data-table
                          :columns="contributionColumns"
                          :data="filteredContributions"
                          :pagination="{ pageSize: 6 }"
                          :row-class-name="(row) => row.id === selectedContributionId ? 'selected-contribution-row' : ''"
                          :row-key="(row) => row.id"
                          :scroll-x="1100"
                          size="small"
                        />
                      </n-space>
                    </n-card>

                    <n-alert type="success" :show-icon="false" class="diagnosis-block">
                      {{ result.anomalyDiagnosis.summary }}
                    </n-alert>
                    <n-space class="action-row diagnosis-block">
                      <n-button size="small" secondary type="primary" @click="createSegment">保存为用户分群</n-button>
                      <n-button size="small" secondary type="primary" @click="createCampaign">创建运营任务</n-button>
                      <n-button size="small" secondary type="success" @click="createExperiment">创建 A/B 实验</n-button>
                    </n-space>
                  </template>
                  <n-empty v-else description="暂无异常诊断" />
                </n-tab-pane>

                <n-tab-pane name="users" tab="受影响用户">
                  <n-data-table
                    :columns="userColumns"
                    :data="affectedUsers"
                    :pagination="{ pageSize: 8 }"
                    size="small"
                  />
                </n-tab-pane>

                <n-tab-pane name="query" tab="查询配置 JSON">
                  <pre class="query-json">{{ queryJson }}</pre>
                </n-tab-pane>
              </n-tabs>
            </n-card>
          </section>
        </section>
      </div>
    </n-spin>

    <n-modal v-model:show="showSaveAnalysisModal" preset="card" title="保存分析" class="small-modal">
      <n-space vertical :size="14">
        <n-input
          v-model:value="saveAnalysisDraft.name"
          maxlength="50"
          show-count
          placeholder="请输入分析名称"
        />
        <n-input
          v-model:value="saveAnalysisDraft.description"
          type="textarea"
          placeholder="描述这个分析的业务背景或使用场景"
        />
        <n-select
          v-model:value="saveAnalysisDraft.folderId"
          :options="saveFolderOptions"
          placeholder="保存位置"
        />
        <n-select
          v-model:value="saveAnalysisDraft.visibility"
          :options="saveVisibilityOptions"
          placeholder="可见范围"
        />
        <n-select
          v-model:value="saveAnalysisDraft.tags"
          :options="saveTagOptions"
          multiple
          filterable
          tag
          placeholder="分析标签"
        />
        <n-space justify="space-between" align="center">
          <span class="modal-label">保存当前图表状态</span>
          <n-switch v-model:value="saveAnalysisDraft.saveChartState" />
        </n-space>
        <n-space justify="space-between" align="center">
          <span class="modal-label">保存当前表格状态</span>
          <n-switch v-model:value="saveAnalysisDraft.saveTableState" />
        </n-space>
        <n-alert type="info" :show-icon="false">
          保存分析会保存完整查询配置。下次打开时会恢复配置，并重新查询最新数据。
        </n-alert>
        <n-space justify="end">
          <n-button @click="showSaveAnalysisModal = false">取消</n-button>
          <n-button type="primary" :loading="savingAnalysis" @click="submitSaveAnalysis">保存</n-button>
        </n-space>
      </n-space>
    </n-modal>

    <n-modal v-model:show="showClearFilterConfirmModal" preset="card" title="清空细分筛选" class="small-modal">
      <n-space vertical>
        <n-alert type="warning" :show-icon="false">
          确定清空所有细分筛选条件吗？清空后分析范围将恢复为全部用户。
        </n-alert>
        <n-space justify="end">
          <n-button @click="showClearFilterConfirmModal = false">取消</n-button>
          <n-button type="error" @click="clearFilters">确认清空</n-button>
        </n-space>
      </n-space>
    </n-modal>

    <n-modal v-model:show="showFormulaModal" preset="card" title="完整公式编辑器" class="formula-modal">
      <n-space vertical :size="14">
        <n-input v-model:value="formulaDraft.name" placeholder="公式指标名称" />

        <div class="formula-editor-panel">
          <span class="modal-label">公式编辑区</span>
          <formula-editor-panel :tokens="formulaDraft.tokens" @remove-token="removeFormulaToken" />
        </div>

        <n-grid :cols="2" :x-gap="16" :y-gap="16">
          <n-gi>
            <n-card title="插入工具栏" size="small">
              <n-space vertical>
                <n-select
                  v-model:value="selectedFormulaConditionId"
                  :options="formulaConditionOptions"
                  placeholder="选择计算条件"
                />
                <n-space>
                  <n-button size="small" secondary @click="insertFormulaMetricToken">+ 事件指标</n-button>
                  <n-button size="small" @click="insertFormulaOperator('+')">+</n-button>
                  <n-button size="small" @click="insertFormulaOperator('-')">-</n-button>
                  <n-button size="small" @click="insertFormulaOperator('*')">×</n-button>
                  <n-button size="small" @click="insertFormulaOperator('/')">÷</n-button>
                  <n-button size="small" @click="insertFormulaParenthesisPair">( )</n-button>
                </n-space>
                <n-space align="center">
                  <n-input-number v-model:value="formulaConstantValue" />
                  <n-button size="small" secondary @click="insertFormulaConstant">+ 常数</n-button>
                  <n-button size="small" @click="clearFormulaTokens">清空公式</n-button>
                </n-space>
              </n-space>
            </n-card>
          </n-gi>

          <n-gi>
            <n-card title="指标选择面板" size="small">
              <metric-condition-picker
                :metric-options="formulaMetricOptions"
                @select-metric="addFormulaConditionFromMetric"
                @create-condition="openCreateMetric('event')"
              />
            </n-card>
          </n-gi>
        </n-grid>

        <n-card title="计算条件列表" size="small">
          <div class="config-list">
            <div v-for="condition in formulaDraft.conditions" :key="condition.id" class="config-item">
              <div>
                <strong>{{ condition.label }}</strong>
                <span>{{ condition.metricConfig.eventName }} · {{ condition.metricConfig.operator }}</span>
              </div>
              <n-space align="center">
                <span class="modal-label">参与分组</span>
                <n-switch
                  :value="condition.participateInGroup"
                  @update:value="toggleFormulaConditionGroup(condition.id)"
                />
              </n-space>
            </div>
          </div>
        </n-card>

        <n-card title="展示设置" size="small">
          <formula-display-config
            :config="formulaDraft.displayConfig"
            @update-config="(config) => formulaDraft.displayConfig = config"
          />
        </n-card>

        <n-alert :type="formulaValidation.valid ? 'success' : 'error'" :show-icon="false">
          {{ formulaValidation.message }}
        </n-alert>
        <n-space justify="end">
          <n-button @click="showFormulaModal = false">取消</n-button>
          <n-button type="primary" :disabled="!formulaValidation.valid" @click="saveFormulaMetric">
            保存公式指标
          </n-button>
        </n-space>
      </n-space>
    </n-modal>

    <n-modal v-model:show="showDownloadModal" preset="card" title="下载数据" class="small-modal">
      <n-space vertical>
        <n-select
          v-model:value="downloadRange"
          :options="[
            { label: '页面结果', value: 'page_result' },
            { label: '更多数据', value: 'more_data' },
          ]"
        />
        <n-checkbox-group v-model:value="downloadContents">
          <n-space>
            <n-checkbox value="chart_data">图表数据</n-checkbox>
            <n-checkbox value="detail_data">明细数据</n-checkbox>
            <n-checkbox value="user_list">用户列表</n-checkbox>
          </n-space>
        </n-checkbox-group>
        <n-select
          v-model:value="downloadFormat"
          :options="[
            { label: 'CSV', value: 'csv' },
            { label: 'Excel', value: 'excel' },
          ]"
        />
        <n-button type="primary" @click="submitDownload">创建下载任务</n-button>
      </n-space>
    </n-modal>

    <n-modal v-model:show="showDashboardModal" preset="card" title="保存到看板" class="dashboard-save-modal">
      <div class="dashboard-save-layout">
        <n-space vertical>
          <n-card size="small" title="1. 基础信息">
            <n-space vertical>
              <n-select v-model:value="dashboardSaveObject" :options="dashboardSaveObjectOptions" @update:value="(value) => openSaveDashboardModal(value as DashboardWidgetSaveObject)" />
              <n-input v-model:value="dashboardChartName" maxlength="50" show-count placeholder="图表名称" />
              <n-input v-model:value="dashboardDescription" type="textarea" placeholder="描述，可选" />
              <n-descriptions :column="2" size="small" bordered>
                <n-descriptions-item label="所属分析">事件分析</n-descriptions-item>
                <n-descriptions-item label="数据来源">当前查询配置</n-descriptions-item>
              </n-descriptions>
              <n-select v-model:value="dashboardTags" multiple tag filterable placeholder="标签" />
            </n-space>
          </n-card>

          <n-card size="small" title="2. 保存位置">
            <n-space vertical>
              <n-select v-model:value="dashboardSpaceType" :options="dashboardSpaceOptions" placeholder="空间类型" />
              <n-select v-model:value="dashboardId" :options="dashboardOptions" placeholder="看板路径" />
              <n-grid :cols="3" :x-gap="8">
                <n-gi :span="2">
                  <n-input v-model:value="newDashboardName" placeholder="+ 新建看板名称" />
                </n-gi>
                <n-gi>
                  <n-button block @click="createInlineDashboard">新建看板</n-button>
                </n-gi>
              </n-grid>
              <n-alert v-if="dashboardLocation && !dashboardLocation.canWrite" type="warning" :show-icon="false">
                你没有保存到该看板的权限，请选择个人空间或团队空间中的可写看板。
              </n-alert>
            </n-space>
          </n-card>

          <n-card size="small" title="3. 图表设置">
            <n-space vertical>
              <n-select
                :value="dashboardSaveChartType"
                :options="dashboardChartTypeOptions"
                placeholder="图表类型"
                @update:value="(value) => updateDashboardChartType(value as DashboardWidgetChartType)"
              />
              <n-alert v-if="dashboardSummaryDisabled" type="info" :show-icon="false">
                当前图表类型不支持同时展示摘要数据。
              </n-alert>
              <n-checkbox-group v-else v-model:value="dashboardDisplayItems">
                <n-space>
                  <n-checkbox
                    v-for="item in dashboardSummaryItemOptions"
                    :key="item.value"
                    :value="item.value"
                    :disabled="(item.value === 'wow' || item.value === 'yoy') && !dashboardDisplayItems.includes('latest')"
                  >
                    {{ item.label }}
                  </n-checkbox>
                </n-space>
              </n-checkbox-group>
              <n-alert v-if="!dashboardSummaryDisabled" type="info" :show-icon="false">
                环比和同比需要基于最新值计算，请先选择最新值。
              </n-alert>
            </n-space>
          </n-card>

          <n-card size="small" title="4. 数据刷新设置">
            <n-space vertical>
              <n-select v-model:value="dashboardRefreshMode" :options="dashboardRefreshModeOptions" />
              <n-select
                v-if="dashboardRefreshMode === 'scheduled'"
                v-model:value="dashboardRefreshSchedule"
                :options="dashboardRefreshScheduleOptions"
              />
              <n-alert v-if="dashboardRefreshMode === 'snapshot'" type="warning" :show-icon="false">
                固定快照不会随时间刷新，适合复盘和归档。
              </n-alert>
            </n-space>
          </n-card>
        </n-space>

        <n-card size="small" title="5. 预览" class="dashboard-preview-card">
          <n-space vertical>
            <div class="preview-title">{{ dashboardChartName || '未命名图表' }}</div>
            <n-tag type="info">{{ dashboardSaveChartType === 'metric_card' ? '指标卡' : dashboardSaveChartType === 'table' ? '表格' : chartTypeLabelMap[dashboardSaveChartType] }}</n-tag>
            <div class="preview-box">
              <template v-if="dashboardSaveChartType === 'metric_card'">
                <span class="preview-metric">{{ result?.metricCards[0] ? formatMetricValue(result.metricCards[0]) : '356,920 次' }}</span>
                <n-tag size="small" type="warning">{{ result?.metricCards[0]?.changeRate ?? '-12.4%' }}%</n-tag>
              </template>
              <template v-else-if="dashboardSaveChartType === 'table'">
                <span>明细表 · {{ result?.tableRows.length ?? 0 }} 行</span>
              </template>
              <template v-else>
                <span>{{ chartTypeLabelMap[dashboardSaveChartType] }} 缩略预览</span>
                <span class="preview-line" />
              </template>
            </div>
            <div class="preview-meta">
              <span>位置：{{ dashboardLocation?.path ?? '未选择' }}</span>
              <span>刷新：{{ dashboardRefreshModeOptions.find((item) => item.value === dashboardRefreshMode)?.label }}</span>
              <span>摘要：{{ dashboardDisplayItems.length ? dashboardDisplayItems.join(' / ') : '不展示' }}</span>
            </div>
            <n-alert v-if="dashboardSaveValidationMessage" type="error" :show-icon="false">
              {{ dashboardSaveValidationMessage }}
            </n-alert>
            <n-alert v-if="dashboardSaveResultLink" type="success" :show-icon="false">
              已保存到看板。
              <n-button text type="primary" @click="router.push(dashboardSaveResultLink)">查看看板</n-button>
              <n-button text @click="showDashboardModal = false">继续分析</n-button>
            </n-alert>
            <n-space justify="end">
              <n-button @click="showDashboardModal = false">取消</n-button>
              <n-button type="primary" :loading="dashboardSaving" @click="submitDashboardSave">保存</n-button>
            </n-space>
          </n-space>
        </n-card>
      </div>
    </n-modal>

    <n-drawer v-model:show="drawerVisible" :width="720">
      <n-drawer-content title="用户详情：明细背后用户列表">
        <template v-if="selectedRow">
          <n-grid :cols="4" :x-gap="12" :y-gap="12">
            <n-gi>
              <n-statistic label="影响用户数" :value="formatNumber(userDrawerSummary.affectedUsers)" />
            </n-gi>
            <n-gi>
              <n-statistic label="平均金币余额" :value="formatNumber(userDrawerSummary.averageCoinBalance)" />
            </n-gi>
            <n-gi>
              <n-statistic label="近 3 日广告观看下降率" :value="formatRate(userDrawerSummary.averageDeclineRate)" />
            </n-gi>
            <n-gi>
              <n-statistic label="流失风险高用户占比" :value="`${userDrawerSummary.highRiskRate.toFixed(1)}%`" />
            </n-gi>
          </n-grid>
        </template>

        <n-divider />

        <n-card title="展示字段配置" size="small" class="user-field-config">
          <n-grid :cols="2" :x-gap="12">
            <n-gi>
              <n-space vertical :size="8">
                <n-space :size="8">
                  <n-input
                    v-model:value="userFieldKeyword"
                    clearable
                    size="small"
                    placeholder="搜索字段名称 / 描述"
                  />
                  <n-select
                    v-model:value="userFieldSourceFilter"
                    :options="userFieldSourceOptions"
                    size="small"
                    class="mini-select"
                  />
                </n-space>
                <n-space :size="8">
                  <n-button size="tiny" secondary @click="selectFilteredUserProfileFields">全选当前结果</n-button>
                  <n-button size="tiny" @click="resetUserProfileFields">恢复默认</n-button>
                  <n-button size="tiny" @click="clearUserProfileFields">清空</n-button>
                </n-space>
                <div class="user-field-picker-list">
                  <button
                    v-for="field in filteredUserProfileFieldList"
                    :key="field.value"
                    class="user-field-option"
                    :class="{ selected: selectedUserProfileFields.includes(field.value) }"
                    type="button"
                    @click="toggleUserProfileField(field.value)"
                  >
                    <span>
                      <strong>{{ field.label }}</strong>
                      <small>{{ field.description }}</small>
                    </span>
                    <n-tag size="small" :type="field.source === 'attr' ? 'info' : 'success'">
                      {{ getFieldSourceLabel(field.source) }}
                    </n-tag>
                  </button>
                </div>
              </n-space>
            </n-gi>
            <n-gi>
              <div class="selected-user-fields">
                <div class="selected-user-fields-header">
                  <strong>已选 {{ selectedUserProfileFields.length }} 个字段</strong>
                  <span>用户 ID 固定展示</span>
                </div>
                <div class="selected-user-field-list">
                  <n-tag
                    v-for="field in selectedUserProfileFieldDetails"
                    :key="field.value"
                    closable
                    size="small"
                    :type="field.source === 'attr' ? 'info' : 'success'"
                    @close="removeUserProfileField(field.value)"
                  >
                    {{ field.label }}
                  </n-tag>
                </div>
              </div>
            </n-gi>
          </n-grid>
        </n-card>

        <n-data-table
          v-model:checked-row-keys="checkedUserRowKeys"
          :columns="userColumns"
          :data="affectedUsers"
          :row-key="(row) => row.userId"
          :pagination="{ pageSize: 8 }"
          :scroll-x="1120"
          size="small"
        />

        <template #footer>
          <div class="drawer-footer">
            <span>已选择 {{ selectedUsers.length }} 个用户</span>
            <n-space>
              <n-button size="small" @click="createSegment">加入分群</n-button>
              <n-button size="small" @click="notifyUserExport">导出用户</n-button>
              <n-button size="small" type="primary" @click="createCampaign">创建运营任务</n-button>
              <n-button size="small" type="success" @click="createExperiment">创建 A/B 实验</n-button>
            </n-space>
          </div>
        </template>
      </n-drawer-content>
    </n-drawer>

    <n-drawer v-model:show="showChartConfigDrawer" :width="520">
      <n-drawer-content title="图表配置">
        <n-space vertical :size="16">
          <n-card title="指标与图表类型" size="small">
            <n-space vertical>
              <n-input
                :value="chartConfig.title ?? ''"
                clearable
                :placeholder="generatedChartTitle"
                @update:value="(value) => updateChartConfig({ title: value })"
              >
                <template #prefix>标题</template>
              </n-input>
              <n-select
                :value="chartConfig.selectedMetricIds"
                :options="chartMetricOptions"
                multiple
                clearable
                placeholder="选择展示在图表中的指标"
                @update:value="updateSelectedChartMetrics"
              />
              <chart-type-switcher
                :value="chartConfig.chartType"
                :result="result"
                :config="chartConfig"
                @update:value="updateChartType"
              />
              <template v-if="chartConfig.chartType === 'dual_axis'">
                <n-select
                  :value="chartConfig.leftAxisMetricIds"
                  :options="chartMetricOptions"
                  multiple
                  clearable
                  placeholder="主坐标轴指标"
                  @update:value="updateLeftAxisMetrics"
                />
                <n-select
                  :value="chartConfig.rightAxisMetricIds"
                  :options="chartMetricOptions"
                  multiple
                  clearable
                  placeholder="次坐标轴指标"
                  @update:value="updateRightAxisMetrics"
                />
              </template>
            </n-space>
          </n-card>

          <n-card title="显示设置" size="small">
            <n-space vertical>
              <n-space justify="space-between" align="center">
                <span class="modal-label">显示累计值</span>
                <n-switch
                  :value="chartConfig.showCumulativeValue"
                  @update:value="(value) => updateChartConfig({ showCumulativeValue: value })"
                />
              </n-space>
              <n-space justify="space-between" align="center">
                <span class="modal-label">显示增长百分比</span>
                <n-switch
                  :value="chartConfig.showGrowthRate"
                  @update:value="(value) => updateChartConfig({ showGrowthRate: value })"
                />
              </n-space>
              <n-space justify="space-between" align="center">
                <span class="modal-label">显示数据标签</span>
                <n-switch
                  :value="chartConfig.showDataLabel"
                  @update:value="(value) => updateChartConfig({ showDataLabel: value })"
                />
              </n-space>
              <n-space justify="space-between" align="center">
                <span class="modal-label">显示预测区间</span>
                <n-switch
                  :value="chartConfig.showPredictionBand"
                  @update:value="(value) => updateChartConfig({ showPredictionBand: value })"
                />
              </n-space>
              <n-space justify="space-between" align="center">
                <span class="modal-label">显示异常点</span>
                <n-switch
                  :value="chartConfig.showAnomalyPoint"
                  @update:value="(value) => updateChartConfig({ showAnomalyPoint: value })"
                />
              </n-space>
              <n-space justify="space-between" align="center">
                <span class="modal-label">显示对比线</span>
                <n-switch
                  :value="chartConfig.showCompareLine"
                  @update:value="(value) => updateChartConfig({ showCompareLine: value })"
                />
              </n-space>
            </n-space>
          </n-card>

          <n-card title="排序与颜色" size="small">
            <n-space vertical>
              <n-select
                :value="chartConfig.topN"
                :options="topNOptions"
                placeholder="TopN"
                @update:value="(value) => updateChartConfig({ topN: Number(value) })"
              />
              <n-select
                :value="chartConfig.displayMode"
                :options="[
                  { label: '数值', value: 'value' },
                  { label: '百分比', value: 'percentage' },
                ]"
                @update:value="(value) => updateChartConfig({ displayMode: String(value) === 'percentage' ? 'percentage' : 'value' })"
              />
              <n-button @click="updateChartConfig({ barDirection: chartConfig.barDirection === 'horizontal' ? 'vertical' : 'horizontal' })">
                {{ chartConfig.barDirection === 'horizontal' ? '切换为纵向柱形' : '切换为横向柱形' }}
              </n-button>
              <n-select v-model:value="chartSortMode" :options="chartSortOptions" @update:value="markDirty" />
              <n-select v-model:value="chartColorScheme" :options="chartColorSchemeOptions" @update:value="markDirty" />
            </n-space>
          </n-card>

          <n-button type="primary" @click="openSaveDashboardModal('chart')">保存到看板</n-button>

          <n-alert type="info" :show-icon="false">
            折线图底部支持 dataZoom 拖拽缩放；双击图表区域可恢复完整时间范围。
          </n-alert>
        </n-space>
      </n-drawer-content>
    </n-drawer>

    <n-modal v-model:show="showMetricConfigModal" preset="card" title="指标配置" class="small-modal">
      <n-space vertical>
        <n-input v-model:value="metricDraft.name" placeholder="指标名称" />
        <n-select v-model:value="metricDraft.metricType" :options="metricTypeOptions" />
        <n-select
          :value="metricDraft.eventName"
          :options="eventOptions"
          filterable
          placeholder="搜索事件名称 / 显示名"
          @update:value="(value) => handleMetricEventChange(String(value))"
        />
        <n-select
          :value="metricDraft.operator"
          :options="metricOperatorOptions"
          @update:value="(value) => handleMetricOperatorChange(String(value))"
        />
        <n-select
          v-if="metricNeedsProperty"
          v-model:value="metricDraft.propertyName"
          :options="metricPropertyOptions"
          clearable
          filterable
          placeholder="SUM / AVG / P90 / 去重算子需要选择属性"
        />
        <n-input v-model:value="metricDraft.unit" placeholder="单位，如 次 / 人 / %" />
        <n-space align="center">
          <span class="modal-label">启用指标</span>
          <n-switch v-model:value="metricDraft.enabled" />
          <n-tag :type="metricDraftStatus === '已完成' ? 'success' : metricDraftStatus === '部分完成' ? 'warning' : 'error'" size="small">
            {{ metricDraftStatus }}
          </n-tag>
        </n-space>
        <n-card title="指标过滤条件" size="small">
          <n-space vertical>
            <div class="action-row">
              <n-button size="tiny" secondary @click="openCreateMetricFilter('event_property')">
                + 事件属性
              </n-button>
              <n-button size="tiny" secondary @click="openCreateMetricFilter('common_property')">
                + 公共属性
              </n-button>
              <n-button size="tiny" secondary @click="openCreateMetricFilter('user_property')">
                + 用户属性
              </n-button>
              <n-button size="tiny" secondary @click="openCreateMetricFilter('user_tag')">
                + 用户标签
              </n-button>
            </div>
            <div v-if="metricDraft.filters.length" class="config-list">
              <div v-for="(filter, index) in metricDraft.filters" :key="filter.id" class="config-item">
                <div>
                  <strong>{{ filter.fieldDisplayName }}</strong>
                  <span>{{ filter.operator }} · {{ filter.displayValue }}</span>
                </div>
                <n-space :size="6">
                  <n-tag size="small">{{ filter.logic }}</n-tag>
                  <n-button size="tiny" text @click="openEditMetricFilter(filter, index)">编辑</n-button>
                  <n-button size="tiny" text type="error" @click="removeMetricFilter(index)">删除</n-button>
                </n-space>
              </div>
            </div>
            <n-empty v-else description="当前指标暂无独立过滤条件" />
          </n-space>
        </n-card>
        <n-alert type="info" :show-icon="false">
          PV / UV / PV_UV 不显示属性选择；SUM / AVG / MAX / MIN / 分位数 / 人均值需要数值属性；UV/AU 的分母为活跃用户数。
        </n-alert>
        <n-button type="primary" @click="saveMetricConfig">保存指标</n-button>
      </n-space>
    </n-modal>

    <n-modal v-model:show="showMetricFilterConfigModal" preset="card" title="指标过滤条件" class="small-modal">
      <n-space vertical>
        <n-select
          v-model:value="metricFilterDraft.logic"
          :options="[
            { label: 'AND', value: 'AND' },
            { label: 'OR', value: 'OR' },
          ]"
        />
        <n-select
          :value="metricFilterDraft.sourceType"
          :options="sourceTypeOptions"
          @update:value="(value) => handleMetricFilterSourceChange(String(value))"
        />
        <n-select v-model:value="metricFilterDraft.field" :options="metricFilterFieldOptions" filterable />
        <n-select v-model:value="metricFilterDraft.operator" :options="metricFilterOperatorOptions" />
        <n-input
          v-model:value="metricFilterValueText"
          type="textarea"
          placeholder="支持选择值、手动输入、批量粘贴（一行一个值）和正则匹配。"
        />
        <n-button type="primary" @click="saveMetricFilterConfig">保存过滤条件</n-button>
      </n-space>
    </n-modal>

    <n-modal v-model:show="showFilterConfigModal" preset="card" title="细分筛选配置" class="small-modal">
      <n-space vertical>
        <n-select
          v-model:value="filterDraft.logic"
          :options="[
            { label: 'AND', value: 'AND' },
            { label: 'OR', value: 'OR' },
          ]"
          placeholder="与上一条条件的逻辑关系"
        />
        <n-select
          :value="filterDraft.sourceType"
          :options="sourceTypeOptions"
          @update:value="(value) => handleFilterSourceChange(String(value))"
        />

        <template v-if="filterDraft.sourceType === 'behavior'">
          <n-grid :cols="2" :x-gap="12" :y-gap="12">
            <n-gi>
              <n-select
                :value="filterDraft.behaviorType"
                :options="behaviorTypeOptions"
                placeholder="行为类型"
                @update:value="(value) => handleBehaviorTypeChange(String(value))"
              />
            </n-gi>
            <n-gi>
              <n-input-number
                v-model:value="filterDraft.timeWindowDays"
                :min="1"
                :max="180"
                placeholder="过去 N 天"
              />
            </n-gi>
            <n-gi v-if="filterDraft.behaviorType !== 'sequence_done'">
              <n-select v-model:value="filterDraft.eventName" :options="eventOptions" filterable placeholder="选择事件" />
            </n-gi>
            <n-gi v-if="filterDraft.behaviorType === 'done'">
              <n-select v-model:value="filterDraft.countOperator" :options="countOperatorOptions" placeholder="次数条件" />
            </n-gi>
            <n-gi v-if="filterDraft.behaviorType === 'done'">
              <n-input-number v-model:value="filterDraft.countValue" :min="1" placeholder="次数" />
            </n-gi>
            <n-gi v-if="filterDraft.behaviorType === 'sequence_done'" :span="2">
              <n-select
                v-model:value="filterDraft.eventSequence"
                :options="eventOptions"
                multiple
                filterable
                placeholder="依次做过的事件序列"
              />
            </n-gi>
            <n-gi v-if="filterDraft.behaviorType === 'sequence_done'">
              <n-input-number
                v-model:value="filterDraft.stepIntervalMinutes"
                :min="1"
                :max="30"
                placeholder="步骤间隔分钟"
              />
            </n-gi>
          </n-grid>
        </template>

        <template v-else-if="filterDraft.sourceType === 'dynamic_match'">
          <n-grid :cols="2" :x-gap="12" :y-gap="12">
            <n-gi>
              <n-select v-model:value="filterDraft.matchEventName" :options="eventOptions" filterable placeholder="目标事件" />
            </n-gi>
            <n-gi>
              <n-select
                :value="filterDraft.matchTargetType"
                :options="dynamicMatchTargetOptions"
                placeholder="匹配对象"
                @update:value="(value) => handleDynamicTargetTypeChange(String(value))"
              />
            </n-gi>
            <n-gi>
              <n-select v-model:value="filterDraft.matchField" :options="dynamicMatchFieldOptions" filterable placeholder="标签 / 分群" />
            </n-gi>
            <n-gi>
              <n-select
                :value="filterDraft.matchMode"
                :options="dynamicMatchModeOptions"
                placeholder="匹配方式"
                @update:value="(value) => handleDynamicMatchModeChange(String(value))"
              />
            </n-gi>
          </n-grid>
        </template>

        <template v-else>
          <n-select
            :value="filterDraft.field"
            :options="filterFieldOptions"
            filterable
            placeholder="字段，超过 1000 个值时可搜索定位"
            @update:value="(value) => handleFilterFieldChange(String(value))"
          />
          <n-select
            :value="filterDraft.operator"
            :options="filterOperatorOptions"
            @update:value="(value) => handleFilterOperatorChange(String(value))"
          />
          <div class="value-editor-toolbar">
            <n-button
              size="tiny"
              :type="filterValueMode === 'select' ? 'primary' : 'default'"
              secondary
              @click="filterValueMode = 'select'"
            >
              选择值
            </n-button>
            <n-button
              size="tiny"
              :type="filterValueMode === 'manual' ? 'primary' : 'default'"
              secondary
              @click="filterValueMode = 'manual'"
            >
              切换为手动 / 批量录入
            </n-button>
          </div>
          <n-select
            v-if="filterValueMode === 'select'"
            :value="isMultiValueOperator(filterDraft.operator) ? filterSelectedValues : filterSelectedValues[0]"
            :options="filterValueOptions"
            :multiple="isMultiValueOperator(filterDraft.operator)"
            filterable
            tag
            placeholder="默认展示前 100 个高频值；未找到该属性值时可直接输入"
            @update:value="handleFilterValueSelect"
          />
          <n-input
            v-else
            v-model:value="filterValueText"
            type="textarea"
            placeholder="筛选值。属于/不属于支持一行一个值；正则条件填写 re2 风格表达式；区间可填 0,100。"
          />
        </template>

        <n-card title="二级筛选条件" size="small">
          <n-space vertical>
            <div v-if="filterDraft.childFilters?.length" class="config-list">
              <div
                v-for="(childFilter, childIndex) in filterDraft.childFilters"
                :key="childFilter.id"
                class="config-item"
              >
                <div>
                  <strong>
                    <template v-if="childIndex > 0">{{ childFilter.logic }} · </template>
                    {{ childFilter.sourceType === 'behavior' ? '行为圈选' : childFilter.sourceType === 'dynamic_match' ? '动态匹配' : childFilter.fieldDisplayName }}
                  </strong>
                  <span v-if="childFilter.sourceType === 'behavior' || childFilter.sourceType === 'dynamic_match'">
                    {{ childFilter.displayValue }}
                  </span>
                  <span v-else>{{ getOperatorDisplayName(childFilter.operator) }} · {{ childFilter.displayValue }}</span>
                </div>
                <n-space :size="6">
                  <n-button size="tiny" text @click="openEditChildFilter(childFilter, childIndex)">编辑</n-button>
                  <n-button size="tiny" text type="error" @click="removeChildFilter(childIndex)">删除</n-button>
                </n-space>
              </div>
            </div>
            <n-empty v-else description="暂无二级筛选，可继续添加属性、标签、分群、行为或动态匹配条件" />
            <n-button size="small" secondary @click="openCreateChildFilter">+ 二级筛选条件</n-button>

            <div v-if="childFilterEditorVisible" class="child-filter-editor">
              <n-grid :cols="2" :x-gap="10" :y-gap="10">
                <n-gi v-if="childFilterEditIndex > 0 || (childFilterEditIndex < 0 && (filterDraft.childFilters?.length ?? 0) > 0)">
                  <n-select
                    v-model:value="childFilterDraft.logic"
                    :options="[
                      { label: 'AND', value: 'AND' },
                      { label: 'OR', value: 'OR' },
                    ]"
                  />
                </n-gi>
                <n-gi>
                  <n-select
                    :value="childFilterDraft.sourceType"
                    :options="sourceTypeOptions"
                    @update:value="(value) => handleChildFilterSourceChange(String(value))"
                  />
                </n-gi>

                <template v-if="childFilterDraft.sourceType === 'behavior'">
                  <n-gi>
                    <n-select
                      :value="childFilterDraft.behaviorType"
                      :options="behaviorTypeOptions"
                      placeholder="行为类型"
                      @update:value="(value) => handleChildBehaviorTypeChange(String(value))"
                    />
                  </n-gi>
                  <n-gi>
                    <n-input-number
                      v-model:value="childFilterDraft.timeWindowDays"
                      :min="1"
                      :max="180"
                      placeholder="过去 N 天"
                    />
                  </n-gi>
                  <n-gi v-if="childFilterDraft.behaviorType !== 'sequence_done'">
                    <n-select
                      v-model:value="childFilterDraft.eventName"
                      :options="eventOptions"
                      filterable
                      placeholder="选择事件"
                    />
                  </n-gi>
                  <n-gi v-if="childFilterDraft.behaviorType === 'done'">
                    <n-select
                      v-model:value="childFilterDraft.countOperator"
                      :options="countOperatorOptions"
                      placeholder="次数条件"
                    />
                  </n-gi>
                  <n-gi v-if="childFilterDraft.behaviorType === 'done'">
                    <n-input-number v-model:value="childFilterDraft.countValue" :min="1" placeholder="次数" />
                  </n-gi>
                  <n-gi v-if="childFilterDraft.behaviorType === 'sequence_done'" :span="2">
                    <n-select
                      v-model:value="childFilterDraft.eventSequence"
                      :options="eventOptions"
                      multiple
                      filterable
                      placeholder="依次做过的事件序列"
                    />
                  </n-gi>
                  <n-gi v-if="childFilterDraft.behaviorType === 'sequence_done'">
                    <n-input-number
                      v-model:value="childFilterDraft.stepIntervalMinutes"
                      :min="1"
                      :max="30"
                      placeholder="步骤间隔分钟"
                    />
                  </n-gi>
                </template>

                <template v-else-if="childFilterDraft.sourceType === 'dynamic_match'">
                  <n-gi>
                    <n-select
                      v-model:value="childFilterDraft.matchEventName"
                      :options="eventOptions"
                      filterable
                      placeholder="目标事件"
                    />
                  </n-gi>
                  <n-gi>
                    <n-select
                      :value="childFilterDraft.matchTargetType"
                      :options="dynamicMatchTargetOptions"
                      placeholder="匹配对象"
                      @update:value="(value) => handleChildDynamicTargetTypeChange(String(value))"
                    />
                  </n-gi>
                  <n-gi>
                    <n-select
                      v-model:value="childFilterDraft.matchField"
                      :options="childDynamicMatchFieldOptions"
                      filterable
                      placeholder="标签 / 分群"
                    />
                  </n-gi>
                  <n-gi>
                    <n-select
                      :value="childFilterDraft.matchMode"
                      :options="dynamicMatchModeOptions"
                      placeholder="匹配方式"
                      @update:value="(value) => handleChildDynamicMatchModeChange(String(value))"
                    />
                  </n-gi>
                </template>

                <template v-else>
                  <n-gi>
                    <n-select
                      :value="childFilterDraft.field"
                      :options="getFilterFieldOptions(childFilterDraft.sourceType)"
                      filterable
                      @update:value="(value) => handleChildFilterFieldChange(String(value))"
                    />
                  </n-gi>
                  <n-gi>
                    <n-select
                      :value="childFilterDraft.operator"
                      :options="childFilterOperatorOptions"
                      @update:value="(value) => handleChildFilterOperatorChange(String(value))"
                    />
                  </n-gi>
                  <n-gi :span="2">
                    <div class="value-editor-toolbar">
                      <n-button
                        size="tiny"
                        :type="childFilterValueMode === 'select' ? 'primary' : 'default'"
                        secondary
                        @click="childFilterValueMode = 'select'"
                      >
                        选择值
                      </n-button>
                      <n-button
                        size="tiny"
                        :type="childFilterValueMode === 'manual' ? 'primary' : 'default'"
                        secondary
                        @click="childFilterValueMode = 'manual'"
                      >
                        手动 / 批量录入
                      </n-button>
                    </div>
                    <n-select
                      v-if="childFilterValueMode === 'select'"
                      :value="isMultiValueOperator(childFilterDraft.operator) ? childFilterSelectedValues : childFilterSelectedValues[0]"
                      :options="childFilterValueOptions"
                      :multiple="isMultiValueOperator(childFilterDraft.operator)"
                      filterable
                      tag
                      placeholder="搜索属性值，未找到可直接输入"
                      @update:value="handleChildFilterValueSelect"
                    />
                    <n-input
                      v-else
                      v-model:value="childFilterValueText"
                      type="textarea"
                      placeholder="一行一个值，例如 low_coin_popup / task_center / settlement_ad"
                    />
                  </n-gi>
                </template>
              </n-grid>
              <n-space justify="end" class="child-filter-actions">
                <n-button size="small" @click="childFilterEditorVisible = false">取消</n-button>
                <n-button size="small" type="primary" @click="saveChildFilterConfig">保存二级筛选</n-button>
              </n-space>
            </div>
          </n-space>
        </n-card>

        <n-alert type="info" :show-icon="false">
          行为圈选可配置做过、没做过、依次做过；动态匹配用于事件发生日、前一日或最新标签/分群状态匹配，Demo 使用 mock 结果。
        </n-alert>
        <n-button type="primary" @click="saveFilterConfig">保存筛选</n-button>
      </n-space>
    </n-modal>

    <n-modal v-model:show="showComparisonConfigModal" preset="card" title="对照组配置" class="small-modal">
      <n-space vertical>
        <n-input v-model:value="comparisonDraft.name" placeholder="对照组名称" />
        <n-input
          v-model:value="comparisonDraft.description"
          type="textarea"
          placeholder="对照组说明"
        />
        <n-input v-model:value="comparisonDraft.colorKey" placeholder="颜色，如 #d03050" />
        <n-space align="center">
          <span class="modal-label">启用对照组</span>
          <n-switch v-model:value="comparisonDraft.enabled" />
        </n-space>

        <n-card title="人群条件配置" size="small">
          <n-space vertical>
            <div v-if="comparisonDraft.filters.length" class="config-list">
              <div
                v-for="(filter, index) in comparisonDraft.filters"
                :key="filter.id"
                class="config-item"
              >
                <div>
                  <strong>
                    <template v-if="index > 0">{{ filter.logic }} · </template>
                    {{ filter.fieldDisplayName }}
                  </strong>
                  <span>{{ filter.displayValue }}</span>
                </div>
                <n-space :size="6">
                  <n-button size="tiny" text @click="openEditComparisonFilter(filter, index)">编辑</n-button>
                  <n-button size="tiny" text type="error" @click="removeComparisonFilter(index)">删除</n-button>
                </n-space>
              </div>
            </div>
            <n-empty v-else description="暂无条件，保存后将作为空对照组配置保留" />

            <n-card size="small" embedded>
              <n-space vertical>
                <n-grid :cols="2" :x-gap="10" :y-gap="10">
                  <n-gi>
                    <n-select
                      v-model:value="comparisonFilterDraft.logic"
                      :options="[
                        { label: 'AND', value: 'AND' },
                        { label: 'OR', value: 'OR' },
                      ]"
                      placeholder="逻辑关系"
                    />
                  </n-gi>
                  <n-gi>
                    <n-select
                      :value="comparisonFilterDraft.sourceType"
                      :options="sourceTypeOptions.filter((option) => ['user_property', 'user_tag', 'segment', 'common_property'].includes(String(option.value)))"
                      @update:value="(value) => handleComparisonFilterSourceChange(String(value))"
                    />
                  </n-gi>
                  <n-gi>
                    <n-select
                      :value="comparisonFilterDraft.field"
                      :options="comparisonFilterFieldOptions"
                      filterable
                      @update:value="(value) => handleComparisonFilterFieldChange(String(value))"
                    />
                  </n-gi>
                  <n-gi>
                    <n-select
                      :value="comparisonFilterDraft.operator"
                      :options="comparisonFilterOperatorOptions"
                      @update:value="(value) => handleComparisonFilterOperatorChange(String(value))"
                    />
                  </n-gi>
                  <n-gi :span="2">
                    <div class="value-editor-toolbar">
                      <n-button
                        size="tiny"
                        :type="comparisonFilterValueMode === 'select' ? 'primary' : 'default'"
                        secondary
                        @click="comparisonFilterValueMode = 'select'"
                      >
                        选择值
                      </n-button>
                      <n-button
                        size="tiny"
                        :type="comparisonFilterValueMode === 'manual' ? 'primary' : 'default'"
                        secondary
                        @click="comparisonFilterValueMode = 'manual'"
                      >
                        手动 / 批量录入
                      </n-button>
                    </div>
                    <n-select
                      v-if="comparisonFilterValueMode === 'select'"
                      :value="isMultiValueOperator(comparisonFilterDraft.operator) ? comparisonFilterSelectedValues : comparisonFilterSelectedValues[0]"
                      :options="comparisonFilterValueOptions"
                      :multiple="isMultiValueOperator(comparisonFilterDraft.operator)"
                      filterable
                      tag
                      placeholder="搜索属性值，未找到可直接输入"
                      @update:value="handleComparisonFilterValueSelect"
                    />
                    <n-input
                      v-else
                      v-model:value="comparisonFilterValueText"
                      type="textarea"
                      placeholder="支持一行一个值，例如 低金币 / 高活跃 / seg_active_7d"
                    />
                  </n-gi>
                </n-grid>
                <n-space justify="end">
                  <n-button size="small" @click="openCreateComparisonFilter">新条件</n-button>
                  <n-button size="small" type="primary" @click="saveComparisonFilterConfig">
                    {{ comparisonFilterEditIndex >= 0 ? '更新条件' : '添加条件' }}
                  </n-button>
                </n-space>
              </n-space>
            </n-card>
          </n-space>
        </n-card>

        <n-alert type="info" :show-icon="false">
          对照组不是查询必填项，Demo 最多 5 个；关闭后图表和明细会隐藏该组，删除后会同步移除图表分组。
        </n-alert>
        <n-button type="primary" @click="saveComparisonConfig">保存对照组</n-button>
      </n-space>
    </n-modal>

    <n-modal v-model:show="showGroupConfigModal" preset="card" title="属性分组配置" class="small-modal">
      <n-space vertical>
        <n-input v-model:value="groupDraft.displayName" placeholder="分组展示名" />
        <n-select v-model:value="groupDraft.sourceType" :options="groupSourceTypeOptions" />
        <n-select v-model:value="groupDraft.field" :options="groupFieldOptions" filterable />
        <n-select v-model:value="groupDraft.groupType" :options="groupTypeOptions" />
        <n-select
          v-model:value="groupDraft.topN"
          :options="[
            { label: 'Top 5', value: 5 },
            { label: 'Top 10', value: 10 },
            { label: 'Top 20', value: 20 },
            { label: 'Top 50', value: 50 },
          ]"
        />
        <n-select
          v-model:value="groupDraft.applyToMetricIds"
          multiple
          clearable
          :options="formulaMetricOptions"
          placeholder="作用于全部指标 / 或选择指定指标"
        />
        <div v-if="groupDraft.groupType === 'number_range'" class="range-editor">
          <div
            v-for="(range, index) in groupDraft.ranges ?? []"
            :key="`${range.label}-${index}`"
            class="range-row"
          >
            <n-input v-model:value="range.label" placeholder="区间名称" />
            <n-input-number v-model:value="range.min" placeholder="起始" />
            <n-input-number v-model:value="range.max" placeholder="结束" />
          </div>
          <n-button
            size="small"
            secondary
            @click="groupDraft.ranges = [...(groupDraft.ranges ?? []), { label: '其他', min: 0, max: 0 }]"
          >
            新增区间
          </n-button>
        </div>
        <n-space align="center">
          <span class="modal-label">启用分组</span>
          <n-switch v-model:value="groupDraft.enabled" />
        </n-space>
        <n-alert type="info" :show-icon="false">
          属性分组会影响柱形图、饼图、环形图、百分比图和详细数据聚合口径。
        </n-alert>
        <n-button type="primary" @click="saveGroupByConfig">保存分组</n-button>
      </n-space>
    </n-modal>
  </div>
</template>

<style scoped lang="scss">
.event-analysis-page {
  min-height: 100%;
}

.workspace-header,
.result-toolbar,
.metric-card-footer,
.drawer-footer,
.tab-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.workspace-header {
  margin-bottom: 16px;
}

.mini-select {
  width: 100px;
}

.notice-alert {
  margin: 12px 0;
}

.analysis-workbench {
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.config-panel {
  width: 360px;
  display: flex;
  position: sticky;
  top: 16px;
  height: calc(100vh - 144px);
  min-height: 620px;
  max-height: 820px;
}

.config-panel-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  height: 100%;
}

.config-collapse {
  display: grid;
  gap: 8px;
  flex: 1;
  align-content: start;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.config-panel-stack > .n-button:last-child {
  margin-top: auto;
}

.config-collapse :deep(.n-collapse-item) {
  border: 0;
  border-radius: 8px;
  background: #fff;
}

.config-collapse :deep(.n-collapse-item__header) {
  min-height: 48px;
  padding: 12px 16px;
}

.config-collapse :deep(.n-collapse-item__content-inner) {
  padding: 0 16px 14px;
}

.config-collapse :deep(.n-collapse-item--active .n-collapse-item__content-inner) {
  max-height: 360px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 12px;
}

.config-collapse :deep(.n-collapse-item--active .n-collapse-item__content-inner::-webkit-scrollbar) {
  width: 6px;
}

.config-collapse :deep(.n-collapse-item--active .n-collapse-item__content-inner::-webkit-scrollbar-thumb) {
  border-radius: 999px;
  background: #d1d5db;
}

.config-collapse-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.config-collapse-header strong {
  color: #111827;
  font-size: 15px;
}

.config-collapse-header span {
  color: #6b7280;
  font-size: 12px;
  line-height: 1.4;
}

.result-panel {
  min-width: 0;
}

.bottom-result-section {
  min-height: 360px;
  margin-top: 16px;
}

.muted {
  margin: 0 0 8px;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.5;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.full-button {
  width: 100%;
  margin-top: 8px;
}

.config-list,
.comparison-list,
.contribution-grid {
  display: grid;
  gap: 8px;
}

.config-item,
.comparison-item,
.contribution-item,
.transpose-box {
  border: 1px solid #edf0f5;
  border-radius: 8px;
  background: #fafbfc;
}

.config-item,
.comparison-item,
.contribution-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
}

.config-item div,
.comparison-item div,
.contribution-item div,
.result-toolbar div,
.transpose-box {
  display: grid;
  gap: 4px;
}

.config-item strong,
.comparison-item strong,
.contribution-item strong,
.result-toolbar strong,
.transpose-box strong {
  color: #111827;
  font-size: 13px;
}

.config-item span,
.comparison-item span,
.contribution-item span,
.result-toolbar span,
.transpose-box span {
  color: #6b7280;
  font-size: 12px;
  line-height: 1.5;
}

.compact-metric-item {
  padding: 8px 10px;
}

.compact-metric-item strong {
  font-size: 12px;
}

.compact-metric-item span {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}

.comparison-item {
  display: grid;
  grid-template-columns: 10px 1fr auto auto;
}

.comparison-item i {
  width: 10px;
  height: 10px;
  margin-top: 4px;
  border-radius: 50%;
}

.metric-card {
  min-height: 142px;
  cursor: pointer;
}

.metric-card-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
}

.metric-card.active {
  outline: 2px solid #2563eb;
}

.metric-card-footer {
  justify-content: flex-start;
  margin-top: 10px;
  color: #6b7280;
  font-size: 12px;
}

.metric-card p {
  margin: 8px 0 0;
  color: #6b7280;
  font-size: 11px;
  line-height: 1.5;
}

.chart-shell {
  margin-top: 8px;
}

.chart-title-block {
  display: grid;
  gap: 4px;
}

.chart-title-block strong {
  color: #111827;
  font-size: 16px;
}

.chart-title-block span {
  color: #6b7280;
  font-size: 12px;
}

.diagnosis-summary {
  margin: 14px 0;
  color: #4b5563;
  font-size: 13px;
  line-height: 1.8;
}

.diagnosis-block {
  margin-bottom: 12px;
}

.user-field-config {
  margin-bottom: 12px;
}

.user-field-picker-list {
  display: grid;
  max-height: 220px;
  overflow: auto;
  gap: 6px;
  padding-right: 4px;
}

.user-field-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid #edf0f5;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  text-align: left;
}

.user-field-option.selected {
  border-color: #18a058;
  background: #f0fdf4;
}

.user-field-option span {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.user-field-option strong {
  color: #111827;
  font-size: 13px;
}

.user-field-option small {
  overflow: hidden;
  color: #6b7280;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selected-user-fields {
  display: grid;
  align-content: start;
  min-height: 220px;
  gap: 10px;
  padding: 10px;
  border: 1px solid #edf0f5;
  border-radius: 8px;
  background: #fafbfc;
}

.selected-user-fields-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.selected-user-fields-header strong {
  color: #111827;
  font-size: 13px;
}

.selected-user-fields-header span {
  color: #6b7280;
  font-size: 12px;
}

.selected-user-field-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

:deep(.selected-contribution-row td) {
  background: #eff6ff !important;
}

.contribution-grid {
  margin-top: 12px;
}

.contribution-item {
  cursor: pointer;
}

.transpose-box {
  min-height: 220px;
  padding: 24px;
}

.query-json {
  max-height: 360px;
  overflow: auto;
  padding: 14px;
  border-radius: 8px;
  background: #111827;
  color: #d1d5db;
  font-size: 12px;
}

.formula-modal {
  width: 900px;
}

.small-modal {
  width: 560px;
}

.dashboard-save-modal {
  width: 980px;
}

.dashboard-save-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(300px, 0.8fr);
  gap: 16px;
}

.dashboard-preview-card {
  align-self: start;
}

.preview-title {
  color: #111827;
  font-size: 18px;
  font-weight: 700;
}

.preview-box {
  display: grid;
  min-height: 180px;
  place-items: center;
  gap: 12px;
  padding: 20px;
  border: 1px solid #edf0f5;
  border-radius: 8px;
  background: #f8fafc;
  color: #6b7280;
}

.preview-metric {
  color: #111827;
  font-size: 34px;
  font-weight: 700;
}

.preview-line {
  width: 80%;
  height: 42px;
  border-bottom: 4px solid #18a058;
  border-radius: 50%;
}

.preview-meta {
  display: grid;
  gap: 6px;
  color: #6b7280;
  font-size: 12px;
}

.modal-label {
  color: #4b5563;
  font-size: 13px;
}

.formula-token-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.formula-editor-panel {
  padding: 12px;
  border: 1px solid #edf0f5;
  border-radius: 8px;
  background: #fafbfc;
}

.empty-token-hint {
  color: #9ca3af;
  font-size: 13px;
}

.metric-tooltip {
  margin: 0;
  white-space: pre-wrap;
  font-family: inherit;
  font-size: 12px;
  line-height: 1.7;
}

.drawer-footer {
  width: 100%;
}

.drawer-footer span {
  color: #6b7280;
  font-size: 13px;
}
</style>
