<script setup lang="ts">
import '@/components/charts/chartRegister'
import type { EChartsOption } from 'echarts'
import {
  NAlert,
  NButton,
  NCard,
  NCheckbox,
  NCheckboxGroup,
  NDataTable,
  NDatePicker,
  NDrawer,
  NDrawerContent,
  NEmpty,
  NGi,
  NGrid,
  NInput,
  NInputNumber,
  NModal,
  NRadioButton,
  NRadioGroup,
  NSelect,
  NSpace,
  NSpin,
  NStatistic,
  NSwitch,
  NTag,
} from 'naive-ui'
import type { DataTableColumns, SelectOption } from 'naive-ui'
import dayjs from 'dayjs'
import { computed, h, onMounted, reactive, ref } from 'vue'
import VChart from 'vue-echarts'
import { retentionAnalysisService } from '@/services/retentionAnalysisService'
import type {
  EventDefinition,
  EventProperty,
  FilterCondition,
  FilterOperator,
  FilterSourceType,
  UserAttribute,
  UserSegmentOption,
  UserTag,
} from '@/types/eventAnalysis'
import type {
  RetentionChartPoint,
  RetentionChartType,
  RetentionComparisonGroup,
  RetentionCustomWindow,
  RetentionExtraMetric,
  RetentionExtraMetricAggregator,
  RetentionGranularity,
  RetentionFieldType,
  RetentionGroupBy,
  RetentionIdType,
  RetentionMetricMode,
  RetentionModelType,
  RetentionQueryRequest,
  RetentionQueryResponse,
  RetentionQueryState,
  RetentionRelationProperty,
  RetentionRefreshPolicy,
  RetentionResultRow,
  RetentionTimeMode,
  RetentionUserFilterGroup,
  RetentionUserRecord,
  RetentionWindowConfig,
  RetentionWindowMode,
} from '@/types/retentionAnalysis'

type DateRangeValue = [number, number]
type RetentionFilterTarget = 'start' | 'return' | 'user' | 'comparison' | 'extra_metric'
type RetentionUserType = 'start' | 'retained' | 'churned'
type RetentionUserField = Exclude<keyof RetentionUserRecord, 'userId'>

interface RetentionDrilldownContext {
  cohortDate: string
  windowKey: string
  windowLabel: string
  groupName: string
  userType: RetentionUserType
  startUsers: number
  matchedUsers: number
  rate: number
}

const loading = ref(false)
const metadataLoading = ref(false)
const queryState = ref<RetentionQueryState>('idle')
const notice = ref('')
const errorMessage = ref('')
const metadataEvents = ref<EventDefinition[]>([])
const metadataUserAttributes = ref<UserAttribute[]>([])
const metadataUserTags = ref<UserTag[]>([])
const metadataUserSegments = ref<UserSegmentOption[]>([])
const result = ref<RetentionQueryResponse | null>(null)
const users = ref<RetentionUserRecord[]>([])
const showUserDrawer = ref(false)
const showSaveAnalysisModal = ref(false)
const showSaveDashboardModal = ref(false)
const showFilterModal = ref(false)
const showGroupByModal = ref(false)
const showExtraMetricModal = ref(false)
const showComparisonModal = ref(false)
const showMicroscopeModal = ref(false)
const showSegmentModal = ref(false)
const showAnnotationModal = ref(false)
const showExportModal = ref(false)
const filterTarget = ref<RetentionFilterTarget>('user')
const filterTargetGroupId = ref('')
const filterTargetMetricId = ref('')
const selectedDrilldown = ref<RetentionDrilldownContext | null>(null)
const visibleUserFields = ref<RetentionUserField[]>([
  'startEventTime',
  'returnEventTime',
  'groupValue',
  'relationPropertyValue',
  'userLevel',
  'channel',
  'lifecycleTag',
])

const today = dayjs('2026-05-19')
const timeRange = ref<DateRangeValue>([
  today.subtract(7, 'day').valueOf(),
  today.subtract(1, 'day').valueOf(),
])
const scope = reactive({
  projectId: 'demo_game_app',
  subjectId: 'app_user',
  idType: 'user_id' as RetentionIdType,
  timezone: 'UTC+8',
})
const startEventName = ref('')
const returnEventName = ref('')
const modelType = ref<RetentionModelType>('fixed_date')
const granularity = ref<RetentionGranularity>('day')
const weekStartDay = ref<1 | 2 | 3 | 4 | 5 | 6 | 7>(1)
const windowMode = ref<RetentionWindowMode>('all')
const keyWindowText = ref('1,3,7')
const includeDay0 = ref(false)
const includeUserCount = ref(true)
const continuousIncludeStartDay = ref(false)
const continuousWindow = ref(7)
const aggregationMode = ref<'weighted' | 'deduplicated'>('weighted')
const chartType = ref<RetentionChartType>('trend')
const metricMode = ref<RetentionMetricMode>('retention')
const selectedWindowKey = ref('day_1')
const customWindows = ref<RetentionCustomWindow[]>([])
const comparisonGroups = ref<RetentionComparisonGroup[]>([])
const groupBys = ref<RetentionGroupBy[]>([])
const extraMetrics = ref<RetentionExtraMetric[]>([])
const userFilter = ref<RetentionUserFilterGroup | null>(null)
const startEventFilters = ref<FilterCondition[]>([])
const returnEventFilters = ref<FilterCondition[]>([])
const relationProperties = ref<RetentionRelationProperty[]>([])

const filterDraft = reactive({
  logic: 'AND' as 'AND' | 'OR',
  sourceType: 'user_property' as FilterSourceType,
  field: '',
  operator: 'equals' as FilterOperator,
  valueText: '',
})

const groupByDraft = reactive({
  fieldType: 'user_property' as RetentionFieldType,
  fieldName: '',
  valueMode: 'raw' as RetentionGroupBy['valueMode'],
  listSplit: false,
})

const comparisonDraft = reactive({
  id: '',
  name: '',
  color: '#2080f0',
  enabled: true,
  conditions: [] as FilterCondition[],
})

const extraMetricDraft = reactive({
  id: '',
  eventName: '',
  displayName: '',
  aggregator: 'PV' as RetentionExtraMetricAggregator,
  propertyName: '',
  filters: [] as FilterCondition[],
})

const saveAnalysisForm = reactive({
  name: '未命名留存分析',
  description: '',
  tags: '留存, 新用户',
  spaceType: 'personal' as 'personal' | 'team',
  timeMode: 'relative' as RetentionTimeMode,
})
const saveDashboardForm = reactive({
  title: '留存趋势图',
  dashboardId: 'dash-personal-retention',
  widgetType: 'retention_trend' as 'retention_trend' | 'retention_comparison' | 'retention_table',
  timeMode: 'relative' as RetentionTimeMode,
  refreshPolicy: 'daily' as RetentionRefreshPolicy,
})
const segmentForm = reactive({
  name: '留存用户分群',
  description: '基于当前留存分析单元格生成的静态分群',
})
const annotationForm = reactive({
  title: '留存波动批注',
  content: '',
})
const exportForm = reactive({
  fileName: '留存用户ID导出',
  includeEventTime: true,
  includeGroupValues: true,
})

const eventOptions = computed<SelectOption[]>(() =>
  metadataEvents.value.map((event) => ({
    label: `${event.displayName} ${event.eventName}`,
    value: event.eventName,
  })),
)

const currentFilterEvent = computed(() => {
  if (filterTarget.value === 'return') {
    return returnEvent.value
  }

  if (filterTarget.value === 'extra_metric') {
    return metadataEvents.value.find((event) => event.eventName === extraMetricDraft.eventName)
  }

  return startEvent.value
})

const eventPropertyOptions = computed<SelectOption[]>(() =>
  (currentFilterEvent.value?.properties ?? []).map((property) => ({
    label: `${property.displayName} ${property.propertyName}`,
    value: property.propertyName,
  })),
)

const userPropertyOptions = computed<SelectOption[]>(() =>
  metadataUserAttributes.value.map((attribute) => ({
    label: `${attribute.displayName} ${attribute.field}`,
    value: attribute.field,
  })),
)

const userTagOptions = computed<SelectOption[]>(() =>
  metadataUserTags.value.map((tag) => ({
    label: `${tag.displayName} ${tag.field}`,
    value: tag.field,
  })),
)

const segmentOptions = computed<SelectOption[]>(() =>
  metadataUserSegments.value.map((segment) => ({
    label: `${segment.name} · ${segment.estimatedUsers.toLocaleString('zh-CN')} 人`,
    value: segment.id,
  })),
)

const dateLabel = computed(() => {
  const [start, end] = timeRange.value

  return `${dayjs(start).format('YYYY-MM-DD')} 至 ${dayjs(end).format('YYYY-MM-DD')}`
})

const startEvent = computed(() =>
  metadataEvents.value.find((event) => event.eventName === startEventName.value),
)

const returnEvent = computed(() =>
  metadataEvents.value.find((event) => event.eventName === returnEventName.value),
)

const startRelationPropertyOptions = computed<SelectOption[]>(() =>
  (startEvent.value?.properties ?? []).map((property) => ({
    label: `${property.displayName} ${property.propertyName}`,
    value: property.propertyName,
  })),
)

const returnRelationPropertyOptions = computed<SelectOption[]>(() =>
  (returnEvent.value?.properties ?? []).map((property) => ({
    label: `${property.displayName} ${property.propertyName}`,
    value: property.propertyName,
  })),
)

const extraMetricEvent = computed(() =>
  metadataEvents.value.find((event) => event.eventName === extraMetricDraft.eventName),
)

const extraMetricPropertyOptions = computed<SelectOption[]>(() =>
  (extraMetricEvent.value?.properties ?? [])
    .filter((property) => property.dataType === 'number')
    .map((property) => ({
      label: `${property.displayName} ${property.propertyName}`,
      value: property.propertyName,
    })),
)

const extraMetricAggregatorOptions: Array<SelectOption & { value: RetentionExtraMetricAggregator }> = [
  { label: '总次数 PV', value: 'PV' },
  { label: '总人数 UV', value: 'UV' },
  { label: '人均次数 PV/UV', value: 'PV_UV' },
  { label: '求和 SUM', value: 'SUM' },
  { label: '人均值 SUM/UV', value: 'SUM_UV' },
  { label: '阶段累计总和 CUMSUM', value: 'CUMSUM' },
  { label: '阶段累计人均值 CUMSUM/UV', value: 'CUMSUM_UV' },
  { label: '阶段累计人均值 CUMSUM/FUV', value: 'CUMSUM_FUV' },
]

const extraMetricNeedsProperty = computed(() =>
  ['SUM', 'SUM_UV', 'CUMSUM', 'CUMSUM_UV', 'CUMSUM_FUV'].includes(extraMetricDraft.aggregator),
)

const filterSourceOptions = computed<SelectOption[]>(() => {
  const baseOptions: SelectOption[] = [
    { label: '用户属性', value: 'user_property' },
    { label: '用户标签', value: 'user_tag' },
    { label: '用户分群', value: 'segment' },
  ]

  if (filterTarget.value === 'start' || filterTarget.value === 'return' || filterTarget.value === 'extra_metric') {
    return [
      { label: '事件属性', value: 'event_property' },
      ...baseOptions,
    ]
  }

  return [
    ...baseOptions,
    { label: '行为圈选', value: 'behavior' },
    { label: '动态匹配', value: 'dynamic_match' },
  ]
})

const filterFieldOptions = computed<SelectOption[]>(() => {
  if (filterDraft.sourceType === 'event_property') {
    return eventPropertyOptions.value
  }

  if (filterDraft.sourceType === 'user_property') {
    return userPropertyOptions.value
  }

  if (filterDraft.sourceType === 'user_tag') {
    return userTagOptions.value
  }

  if (filterDraft.sourceType === 'segment') {
    return segmentOptions.value
  }

  return eventOptions.value
})

const filterOperatorOptions = computed<SelectOption[]>(() => {
  if (filterDraft.sourceType === 'segment') {
    return [
      { label: '属于', value: 'in' },
      { label: '不属于', value: 'not_in' },
    ]
  }

  if (filterDraft.sourceType === 'behavior') {
    return [
      { label: '做过', value: 'done' },
      { label: '没做过', value: 'not_done' },
      { label: '依次做过', value: 'sequence_done' },
    ]
  }

  return [
    { label: '等于', value: 'equals' },
    { label: '不等于', value: 'not_equals' },
    { label: '属于', value: 'in' },
    { label: '不属于', value: 'not_in' },
    { label: '包含', value: 'contains' },
    { label: '正则匹配', value: 'regex' },
    { label: '大于', value: 'gt' },
    { label: '大于等于', value: 'gte' },
    { label: '小于', value: 'lt' },
    { label: '小于等于', value: 'lte' },
  ]
})

const groupByFieldOptions = computed<SelectOption[]>(() => {
  if (groupByDraft.fieldType === 'start_event_property') {
    return (startEvent.value?.properties ?? []).map((property) => ({
      label: `${property.displayName} ${property.propertyName}`,
      value: property.propertyName,
    }))
  }

  if (groupByDraft.fieldType === 'return_event_property') {
    return (returnEvent.value?.properties ?? []).map((property) => ({
      label: `${property.displayName} ${property.propertyName}`,
      value: property.propertyName,
    }))
  }

  if (groupByDraft.fieldType === 'user_tag') {
    return userTagOptions.value
  }

  if (groupByDraft.fieldType === 'cohort') {
    return segmentOptions.value
  }

  return userPropertyOptions.value
})

const groupBySourceLabelMap: Record<RetentionFieldType, string> = {
  start_event_property: '起始事件属性',
  return_event_property: '回访事件属性',
  user_property: '用户属性',
  user_tag: '用户标签',
  cohort: '用户分群',
}

const groupByValueModeLabelMap: Record<RetentionGroupBy['valueMode'], string> = {
  raw: '原始值',
  auto_interval: '自动区间',
  custom_interval: '自定义区间',
}

const currentGroupBySourceTip = computed(() => {
  if (groupByDraft.fieldType === 'start_event_property' && !startEventName.value) {
    return '请先选择起始事件，再选择起始事件属性分组。'
  }

  if (groupByDraft.fieldType === 'return_event_property' && !returnEventName.value) {
    return '请先选择回访事件，再选择回访事件属性分组。'
  }

  if (!groupByFieldOptions.value.length) {
    return '当前来源下暂无可用分组字段。'
  }

  return ''
})

const getGroupByFieldTypeLabel = (fieldType: RetentionFieldType): string =>
  groupBySourceLabelMap[fieldType]

const getGroupByValueModeLabel = (valueMode: RetentionGroupBy['valueMode']): string =>
  groupByValueModeLabelMap[valueMode]

const userFieldOptions: Array<SelectOption & { value: RetentionUserField }> = [
  { label: '起始事件时间', value: 'startEventTime' },
  { label: '回访事件时间', value: 'returnEventTime' },
  { label: '分组值', value: 'groupValue' },
  { label: '关联属性值', value: 'relationPropertyValue' },
  { label: '用户等级', value: 'userLevel' },
  { label: '渠道', value: 'channel' },
  { label: '生命周期标签', value: 'lifecycleTag' },
]

const selectedDrilldownTitle = computed(() => {
  if (!selectedDrilldown.value) {
    return '留存下钻'
  }

  const typeTextMap: Record<RetentionUserType, string> = {
    start: '起始用户',
    retained: '留存用户',
    churned: '流失用户',
  }

  return `${selectedDrilldown.value.cohortDate} · ${selectedDrilldown.value.windowLabel} · ${typeTextMap[selectedDrilldown.value.userType]}`
})

const chartTitle = computed(() => {
  const metricText = metricMode.value === 'retention' ? '留存' : '流失'
  const chartTextMap: Record<RetentionChartType, string> = {
    trend: '趋势图',
    comparison: '对比图',
    table: '矩阵表',
  }

  return `${metricText}${chartTextMap[chartType.value]}`
})

const hasRequiredEvents = computed(() => Boolean(startEventName.value && returnEventName.value))

const metricValueField = computed(() => (metricMode.value === 'retention' ? 'retentionRate' : 'churnRate'))

const metricUsersField = computed(() => (metricMode.value === 'retention' ? 'retainedUsers' : 'churnUsers'))

const activeSeries = computed(() =>
  chartType.value === 'comparison' ? result.value?.chartData.comparison ?? [] : result.value?.chartData.trend ?? [],
)

const chartOption = computed<EChartsOption>(() => ({
  color: activeSeries.value.map((series) => series.color),
  grid: { top: 52, right: 28, bottom: 64, left: 58 },
  legend: { top: 8, right: 12 },
  tooltip: {
    trigger: 'axis',
    formatter: (params): string => {
      const items = Array.isArray(params) ? params : [params]

      return items
        .map((item) => {
          const point = item.data as RetentionChartPoint
          const usersText = metricMode.value === 'retention' ? '留存人数' : '流失人数'

          return `${point.name}<br/>起始人数：${point.startUsers.toLocaleString('zh-CN')}<br/>${usersText}：${point.users.toLocaleString('zh-CN')}<br/>${item.seriesName}：${point.value.toFixed(2)}%`
        })
        .join('<br/><br/>')
    },
  },
  dataZoom: [
    { type: 'inside', filterMode: 'none', start: 0, end: 100 },
    { type: 'slider', height: 22, bottom: 18, filterMode: 'none', start: 0, end: 100 },
  ],
  xAxis: {
    type: 'category',
    boundaryGap: chartType.value === 'comparison',
    data: activeSeries.value[0]?.points.map((point) => point.name) ?? [],
  },
  yAxis: {
    type: 'value',
    axisLabel: { formatter: '{value}%' },
    splitLine: { lineStyle: { color: '#edf0f5' } },
  },
  series: activeSeries.value.map((series) => ({
    name: series.name,
    type: 'line',
    smooth: true,
    symbolSize: 8,
    data: series.points.map((point) => ({
      ...point,
      value: point.value,
    })),
    label: { show: false },
  })),
}))

const parseKeyOffsets = (): number[] =>
  [...new Set(keyWindowText.value.split(',').map((item) => Number(item.trim())).filter((item) => Number.isInteger(item) && item >= 0))]
    .sort((left, right) => left - right)
    .slice(0, 10)

const markDirty = (): void => {
  if (queryState.value === 'loading') {
    return
  }

  queryState.value = result.value ? 'dirty' : 'idle'
}

const getOptionLabel = (options: SelectOption[], value: string): string => {
  const option = options.find((item) => String(item.value) === value)

  return String(option?.label ?? value).split(' ')[0] ?? value
}

const getEventProperty = (event: EventDefinition | undefined, propertyName: string): EventProperty | undefined =>
  event?.properties.find((property) => property.propertyName === propertyName)

const buildEventConfig = (eventName: string, filters: FilterCondition[]) => {
  const event = metadataEvents.value.find((item) => item.eventName === eventName)

  return {
    eventName,
    displayName: event?.displayName ?? eventName,
    filters,
  }
}

const buildWindowConfig = (): RetentionWindowConfig => ({
  mode: windowMode.value,
  keyOffsets: parseKeyOffsets(),
})

const buildQuery = (): RetentionQueryRequest => {
  const [start, end] = timeRange.value

  return {
    projectId: scope.projectId,
    subjectId: scope.subjectId,
    idType: scope.idType,
    timezone: scope.timezone,
    modelType: modelType.value,
    granularity: granularity.value,
    weekStartDay: weekStartDay.value,
    startDate: dayjs(start).format('YYYY-MM-DD'),
    endDate: dayjs(end).format('YYYY-MM-DD'),
    startEvent: buildEventConfig(startEventName.value, startEventFilters.value),
    returnEvent: buildEventConfig(returnEventName.value, returnEventFilters.value),
    relationProperties: relationProperties.value,
    userFilter: userFilter.value ?? {
      id: 'retention_filter_all_users',
      name: '全部用户',
      relation: 'AND',
      conditions: [],
    },
    comparisonGroups: comparisonGroups.value,
    groupBys: groupBys.value,
    retentionWindows: buildWindowConfig(),
    customWindows: customWindows.value,
    continuousRetention: {
      enabled: modelType.value === 'continuous',
      includeStartDay: continuousIncludeStartDay.value,
      window: continuousWindow.value,
      unit: granularity.value,
    },
    extraMetrics: extraMetrics.value,
    aggregationMode: aggregationMode.value,
    includeUserCount: includeUserCount.value,
    includeDay0: includeDay0.value,
    chartType: chartType.value,
  }
}

const validateQuery = (): string => {
  if (!startEventName.value) {
    return '请选择起始事件'
  }

  if (!returnEventName.value) {
    return '请选择回访事件'
  }

  if (!timeRange.value) {
    return '请选择起始事件时间范围'
  }

  if (windowMode.value === 'key' && parseKeyOffsets().length === 0) {
    return '请至少配置一个关键留存窗口'
  }

  if (windowMode.value === 'custom' && customWindows.value.length === 0) {
    return '请至少配置一个留存区间'
  }

  const invalidCustomWindow = customWindows.value.find((window) => window.endOffset < window.startOffset)

  if (windowMode.value === 'custom' && invalidCustomWindow) {
    return `留存区间「${invalidCustomWindow.name}」的结束周期不能早于起始周期`
  }

  if (Math.max(...parseKeyOffsets(), 0) > 120) {
    return '当前最多支持查看 Day120 留存'
  }

  const invalidRelation = relationProperties.value.find((relation) => {
    const startProperty = getEventProperty(startEvent.value, relation.startProperty)
    const returnProperty = getEventProperty(returnEvent.value, relation.returnProperty)

    return !startProperty || !returnProperty || startProperty.dataType !== returnProperty.dataType
  })

  if (invalidRelation) {
    return '起始事件和回访事件的关联属性类型必须一致'
  }

  if (modelType.value === 'continuous' && continuousWindow.value <= 0) {
    return '连续留存窗口必须大于 0'
  }

  const invalidSumMetric = extraMetrics.value.find((metric) =>
    ['SUM', 'SUM_UV', 'CUMSUM', 'CUMSUM_UV', 'CUMSUM_FUV'].includes(metric.aggregator) && !metric.propertyName,
  )

  if (invalidSumMetric) {
    return `请为「${invalidSumMetric.displayName}」选择数值属性`
  }

  return ''
}

const runQuery = async (): Promise<void> => {
  errorMessage.value = ''
  notice.value = ''
  queryState.value = 'validating'

  const validationMessage = validateQuery()

  if (validationMessage) {
    queryState.value = result.value ? 'dirty' : 'idle'
    errorMessage.value = validationMessage
    return
  }

  loading.value = true
  queryState.value = 'loading'

  try {
    const query = buildQuery()
    const response = await retentionAnalysisService.runRetentionAnalysis(query, metricMode.value, selectedWindowKey.value)
    result.value = response
    selectedWindowKey.value = response.columns[0]?.key ?? 'day_1'
    queryState.value = response.rows.length ? 'success' : 'empty'
    notice.value = `分析完成，起始用户 ${response.summary.totalStartUsers.toLocaleString('zh-CN')} 人。`
  } catch {
    queryState.value = 'error'
    errorMessage.value = '查询失败，请稍后重试。'
  } finally {
    loading.value = false
  }
}

const loadDemoQuery = (): void => {
  startEventName.value = 'app_launch'
  returnEventName.value = 'game_start'
  chartType.value = 'trend'
  metricMode.value = 'retention'
  markDirty()
}

const clearEvent = (target: 'start' | 'return'): void => {
  if (target === 'start') {
    startEventName.value = ''
  } else {
    returnEventName.value = ''
  }

  markDirty()
}

const copyStartToReturn = (): void => {
  returnEventName.value = startEventName.value
  markDirty()
}

const resetFilterDraft = (target: RetentionFilterTarget): void => {
  filterTarget.value = target
  filterDraft.logic = 'AND'
  filterDraft.sourceType = target === 'start' || target === 'return' ? 'event_property' : 'user_property'
  filterDraft.field = ''
  filterDraft.operator = 'equals'
  filterDraft.valueText = ''
}

const openFilterConfig = (target: RetentionFilterTarget, groupId = '', metricId = ''): void => {
  resetFilterDraft(target)
  filterTargetGroupId.value = groupId
  filterTargetMetricId.value = metricId
  showFilterModal.value = true
}

const syncFilterDraftSource = (value: string): void => {
  filterDraft.sourceType = value as FilterSourceType
  filterDraft.operator = value === 'behavior' ? 'done' : value === 'segment' ? 'in' : 'equals'
  filterDraft.field = ''
  filterDraft.valueText = ''
}

const saveFilterCondition = (): void => {
  if (!filterDraft.field) {
    errorMessage.value = '请选择筛选字段'
    return
  }

  if (filterDraft.sourceType !== 'behavior' && !filterDraft.valueText.trim()) {
    errorMessage.value = '请填写筛选值'
    return
  }

  const fieldDisplayName = getOptionLabel(filterFieldOptions.value, filterDraft.field)
  const displayValue =
    filterDraft.sourceType === 'behavior'
      ? `过去 7 天${filterDraft.operator === 'not_done' ? '没做过' : '做过'} ${fieldDisplayName}`
      : filterDraft.valueText.trim()
  const condition: FilterCondition = {
    id: `retention_filter_${Date.now()}`,
    sourceType: filterDraft.sourceType,
    field: filterDraft.field,
    fieldDisplayName,
    operator: filterDraft.operator,
    value: filterDraft.sourceType === 'segment'
      ? filterDraft.field
      : filterDraft.sourceType === 'behavior'
        ? filterDraft.field
        : filterDraft.valueText.trim(),
    displayValue,
    logic: filterDraft.logic,
    eventName: filterDraft.sourceType === 'behavior' ? filterDraft.field : undefined,
    timeWindowDays: filterDraft.sourceType === 'behavior' ? 7 : undefined,
    behaviorType: filterDraft.sourceType === 'behavior' ? 'done' : undefined,
  }

  if (filterTarget.value === 'start') {
    startEventFilters.value = [...startEventFilters.value, condition]
  } else if (filterTarget.value === 'return') {
    returnEventFilters.value = [...returnEventFilters.value, condition]
  } else if (filterTarget.value === 'comparison') {
    if (filterTargetGroupId.value === 'draft') {
      comparisonDraft.conditions = [...comparisonDraft.conditions, condition]
    } else {
      comparisonGroups.value = comparisonGroups.value.map((group) =>
        group.id === filterTargetGroupId.value
          ? {
              ...group,
              userFilter: {
                ...group.userFilter,
                conditions: [...group.userFilter.conditions, condition],
              },
            }
          : group,
      )
    }
  } else if (filterTarget.value === 'extra_metric') {
    if (filterTargetMetricId.value === 'draft') {
      extraMetricDraft.filters = [...extraMetricDraft.filters, condition]
    } else {
      extraMetrics.value = extraMetrics.value.map((metric) =>
        metric.id === filterTargetMetricId.value
          ? {
              ...metric,
              filters: [...metric.filters, condition],
            }
          : metric,
      )
    }
  } else {
    const currentFilter = userFilter.value ?? {
      id: 'retention_filter_all_users',
      name: '全部用户',
      relation: 'AND' as const,
      conditions: [],
    }
    userFilter.value = {
      ...currentFilter,
      name: '自定义用户筛选',
      conditions: [...currentFilter.conditions, condition],
    }
  }

  showFilterModal.value = false
  markDirty()
}

const removeEventFilter = (target: 'start' | 'return', conditionId: string): void => {
  if (target === 'start') {
    startEventFilters.value = startEventFilters.value.filter((condition) => condition.id !== conditionId)
  } else {
    returnEventFilters.value = returnEventFilters.value.filter((condition) => condition.id !== conditionId)
  }

  markDirty()
}

const removeUserFilter = (conditionId: string): void => {
  if (!userFilter.value) {
    return
  }

  userFilter.value = {
    ...userFilter.value,
    conditions: userFilter.value.conditions.filter((condition) => condition.id !== conditionId),
  }
  markDirty()
}

const removeComparisonFilter = (groupId: string, conditionId: string): void => {
  if (groupId === 'draft') {
    comparisonDraft.conditions = comparisonDraft.conditions.filter((condition) => condition.id !== conditionId)
    return
  }

  comparisonGroups.value = comparisonGroups.value.map((group) =>
    group.id === groupId
      ? {
          ...group,
          userFilter: {
            ...group.userFilter,
            conditions: group.userFilter.conditions.filter((condition) => condition.id !== conditionId),
          },
        }
      : group,
  )
  markDirty()
}

const removeExtraMetricFilter = (metricId: string, conditionId: string): void => {
  if (metricId === 'draft') {
    extraMetricDraft.filters = extraMetricDraft.filters.filter((condition) => condition.id !== conditionId)
    return
  }

  extraMetrics.value = extraMetrics.value.map((metric) =>
    metric.id === metricId
      ? {
          ...metric,
          filters: metric.filters.filter((condition) => condition.id !== conditionId),
        }
      : metric,
  )
  markDirty()
}

const addRelationProperty = (): void => {
  const startProperty = startEvent.value?.properties[0]
  const returnProperty = returnEvent.value?.properties.find((property) => property.dataType === startProperty?.dataType)

  if (!startProperty || !returnProperty) {
    errorMessage.value = '请先选择起始事件和回访事件，并确保存在同类型属性'
    return
  }

  relationProperties.value = [
    ...relationProperties.value,
    {
      id: `relation_property_${Date.now()}`,
      startProperty: startProperty.propertyName,
      returnProperty: returnProperty.propertyName,
      propertyType: startProperty.dataType,
    },
  ]
  markDirty()
}

const removeRelationProperty = (relationId: string): void => {
  relationProperties.value = relationProperties.value.filter((relation) => relation.id !== relationId)
  markDirty()
}

const resetComparisonDraft = (): void => {
  const nextIndex = comparisonGroups.value.length + 1

  comparisonDraft.id = ''
  comparisonDraft.name = `对照组 ${nextIndex}`
  comparisonDraft.color = ['#18a058', '#2080f0', '#f0a020', '#d03050'][nextIndex % 4] ?? '#18a058'
  comparisonDraft.enabled = true
  comparisonDraft.conditions = []
}

const openCreateComparisonGroup = (): void => {
  resetComparisonDraft()
  showComparisonModal.value = true
}

const openEditComparisonGroup = (group: RetentionComparisonGroup): void => {
  comparisonDraft.id = group.id
  comparisonDraft.name = group.name
  comparisonDraft.color = group.color
  comparisonDraft.enabled = group.enabled
  comparisonDraft.conditions = [...group.userFilter.conditions]
  showComparisonModal.value = true
}

const saveComparisonGroup = (): void => {
  if (!comparisonDraft.name.trim()) {
    errorMessage.value = '请填写对照组名称'
    return
  }

  const duplicatedName = comparisonGroups.value.some(
    (group) => group.id !== comparisonDraft.id && group.name === comparisonDraft.name.trim(),
  )

  if (duplicatedName) {
    errorMessage.value = '对照组名称不能重复'
    return
  }

  const nextGroup: RetentionComparisonGroup = {
    id: comparisonDraft.id || `retention_group_${Date.now()}`,
    name: comparisonDraft.name.trim(),
    color: comparisonDraft.color,
    enabled: comparisonDraft.enabled,
    userFilter: {
      id: comparisonDraft.id ? `retention_group_filter_${comparisonDraft.id}` : `retention_group_filter_${Date.now()}`,
      name: comparisonDraft.conditions.length ? `${comparisonDraft.name.trim()}筛选` : '暂无筛选条件',
      relation: 'AND',
      conditions: [...comparisonDraft.conditions],
    },
  }

  comparisonGroups.value = comparisonDraft.id
    ? comparisonGroups.value.map((group) => (group.id === comparisonDraft.id ? nextGroup : group))
    : [...comparisonGroups.value, nextGroup]
  showComparisonModal.value = false
  markDirty()
}

const copyComparisonGroup = (group: RetentionComparisonGroup): void => {
  comparisonGroups.value = [
    ...comparisonGroups.value,
    {
      ...group,
      id: `retention_group_copy_${Date.now()}`,
      name: `${group.name} 副本`,
      userFilter: { ...group.userFilter },
      color: '#f0a020',
    },
  ]
  markDirty()
}

const removeComparisonGroup = (groupId: string): void => {
  comparisonGroups.value = comparisonGroups.value.filter((group) => group.id !== groupId)
  markDirty()
}

const openGroupByConfig = (): void => {
  groupByDraft.fieldType = 'user_property'
  groupByDraft.fieldName = String(userPropertyOptions.value[0]?.value ?? '')
  groupByDraft.valueMode = 'raw'
  groupByDraft.listSplit = false
  showGroupByModal.value = true
}

const syncGroupByFieldType = (value: string): void => {
  groupByDraft.fieldType = value as RetentionFieldType
  groupByDraft.fieldName = String(groupByFieldOptions.value[0]?.value ?? '')
}

const saveGroupBy = (): void => {
  if (!groupByDraft.fieldName) {
    errorMessage.value = '请选择分组字段'
    return
  }

  const nextGroup: RetentionGroupBy = {
    id: `retention_group_by_${Date.now()}`,
    fieldType: groupByDraft.fieldType,
    fieldName: groupByDraft.fieldName,
    displayName: getOptionLabel(groupByFieldOptions.value, groupByDraft.fieldName),
    valueMode: groupByDraft.valueMode,
    listSplit: groupByDraft.listSplit,
  }

  groupBys.value = [
    ...groupBys.value,
    nextGroup,
  ].slice(0, 10)
  showGroupByModal.value = false
  markDirty()
}

const removeGroupBy = (groupId: string): void => {
  groupBys.value = groupBys.value.filter((group) => group.id !== groupId)
  markDirty()
}

const addCustomWindow = (): void => {
  const nextIndex = customWindows.value.length + 1

  customWindows.value = [
    ...customWindows.value,
    {
      id: `custom_window_${Date.now()}`,
      name: `自定义区间 ${nextIndex}`,
      startOffset: nextIndex === 1 ? 1 : nextIndex * 3,
      endOffset: nextIndex === 1 ? 3 : nextIndex * 3 + 2,
      unit: granularity.value,
    },
  ].slice(0, 10)
  markDirty()
}

const removeCustomWindow = (windowId: string): void => {
  customWindows.value = customWindows.value.filter((window) => window.id !== windowId)
  markDirty()
}

const resetExtraMetricDraft = (): void => {
  const firstEvent = metadataEvents.value.find((event) => event.eventName === 'ad_watch_complete') ?? metadataEvents.value[0]

  extraMetricDraft.id = ''
  extraMetricDraft.eventName = firstEvent?.eventName ?? ''
  extraMetricDraft.displayName = firstEvent ? `${firstEvent.displayName}次数` : ''
  extraMetricDraft.aggregator = 'PV'
  extraMetricDraft.propertyName = ''
  extraMetricDraft.filters = []
}

const openCreateExtraMetric = (): void => {
  if (extraMetrics.value.length >= 5) {
    errorMessage.value = '同时显示指标最多支持 5 个'
    return
  }

  resetExtraMetricDraft()
  showExtraMetricModal.value = true
}

const syncExtraMetricEvent = (value: string): void => {
  const event = metadataEvents.value.find((item) => item.eventName === value)

  extraMetricDraft.eventName = value
  extraMetricDraft.displayName = event ? `${event.displayName}次数` : ''
  extraMetricDraft.propertyName = ''
  extraMetricDraft.filters = []
}

const syncExtraMetricAggregator = (value: string): void => {
  extraMetricDraft.aggregator = value as RetentionExtraMetricAggregator

  if (!extraMetricNeedsProperty.value) {
    extraMetricDraft.propertyName = ''
  }
}

const saveExtraMetric = (): void => {
  if (!extraMetricDraft.eventName) {
    errorMessage.value = '请选择指标事件'
    return
  }

  if (!extraMetricDraft.displayName.trim()) {
    errorMessage.value = '请填写指标名称'
    return
  }

  if (extraMetricNeedsProperty.value && !extraMetricDraft.propertyName) {
    errorMessage.value = '当前算子需要选择数值属性'
    return
  }

  const nextMetric: RetentionExtraMetric = {
    id: `extra_metric_${Date.now()}`,
    eventName: extraMetricDraft.eventName,
    displayName: extraMetricDraft.displayName.trim(),
    aggregator: extraMetricDraft.aggregator,
    propertyName: extraMetricDraft.propertyName || undefined,
    filters: [...extraMetricDraft.filters],
  }

  extraMetrics.value = [...extraMetrics.value, nextMetric]
  showExtraMetricModal.value = false
  markDirty()
}

const removeExtraMetric = (metricId: string): void => {
  extraMetrics.value = extraMetrics.value.filter((metric) => metric.id !== metricId)
  markDirty()
}

const createDefaultDrilldown = (): RetentionDrilldownContext | null => {
  const firstRow = result.value?.rows[0]
  const firstColumn = result.value?.columns[0]

  if (!firstRow || !firstColumn) {
    return null
  }

  const window = firstRow.windows.find((item) => item.key === firstColumn.key) ?? firstRow.windows[0]

  return {
    cohortDate: firstRow.cohortDate,
    windowKey: firstColumn.key,
    windowLabel: firstColumn.label,
    groupName: firstRow.comparisonGroupName ?? (Object.values(firstRow.groupValues).join(' / ') || '总体'),
    userType: metricMode.value === 'retention' ? 'retained' : 'churned',
    startUsers: firstRow.startUsers,
    matchedUsers: metricMode.value === 'retention' ? window?.retainedUsers ?? 0 : window?.churnUsers ?? 0,
    rate: metricMode.value === 'retention' ? window?.retentionRate ?? 0 : window?.churnRate ?? 0,
  }
}

const createDrilldownFromRow = (
  row: RetentionResultRow,
  windowKey: string,
  userType: RetentionUserType,
): RetentionDrilldownContext => {
  const column = result.value?.columns.find((item) => item.key === windowKey)
  const window = row.windows.find((item) => item.key === windowKey)
  const groupName = row.comparisonGroupName ?? (Object.values(row.groupValues).join(' / ') || '总体')

  return {
    cohortDate: row.cohortDate,
    windowKey,
    windowLabel: column?.label ?? '起始人数',
    groupName,
    userType,
    startUsers: row.startUsers,
    matchedUsers:
      userType === 'start'
        ? row.startUsers
        : userType === 'retained'
          ? window?.retainedUsers ?? 0
          : window?.churnUsers ?? 0,
    rate:
      userType === 'start'
        ? 100
        : userType === 'retained'
          ? window?.retentionRate ?? 0
          : window?.churnRate ?? 0,
  }
}

const openMicroscope = (context: RetentionDrilldownContext | null): void => {
  selectedDrilldown.value = context ?? createDefaultDrilldown()

  if (!selectedDrilldown.value) {
    errorMessage.value = '请先运行查询后再下钻分析'
    return
  }

  segmentForm.name = `${selectedDrilldown.value.userType === 'churned' ? '流失用户' : '留存用户'}_${selectedDrilldown.value.cohortDate}_${selectedDrilldown.value.windowLabel}`
  exportForm.fileName = `${segmentForm.name}_用户ID`
  annotationForm.title = `${selectedDrilldown.value.cohortDate} ${selectedDrilldown.value.windowLabel} 留存批注`
  showMicroscopeModal.value = true
}

const isRetentionChartPoint = (value: unknown): value is RetentionChartPoint => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<RetentionChartPoint>

  return typeof candidate.windowKey === 'string' && typeof candidate.value === 'number'
}

const openMicroscopeFromChart = (payload: unknown): void => {
  const candidate = payload && typeof payload === 'object'
    ? payload as { data?: unknown; seriesName?: unknown }
    : undefined
  const point = isRetentionChartPoint(candidate?.data) ? candidate.data : undefined

  if (!point) {
    openMicroscope(createDefaultDrilldown())
    return
  }

  openMicroscope({
    cohortDate: point.cohortDate ?? '总体',
    windowKey: point.windowKey,
    windowLabel: point.windowLabel,
    groupName: typeof candidate?.seriesName === 'string' ? candidate.seriesName : '总体',
    userType: metricMode.value === 'retention' ? 'retained' : 'churned',
    startUsers: point.startUsers,
    matchedUsers: point.users,
    rate: point.value,
  })
}

const openUsers = async (): Promise<void> => {
  users.value = await retentionAnalysisService.getRetentionUsers()
  showUserDrawer.value = true
}

const openUsersFromMicroscope = async (): Promise<void> => {
  showMicroscopeModal.value = false
  await openUsers()
}

const openSegmentModal = (): void => {
  showMicroscopeModal.value = false
  showSegmentModal.value = true
}

const saveSegment = (): void => {
  showSegmentModal.value = false
  notice.value = `用户分群「${segmentForm.name}」已生成，包含 ${selectedDrilldown.value?.matchedUsers.toLocaleString('zh-CN') ?? 0} 人。`
}

const openExportModal = (): void => {
  showMicroscopeModal.value = false
  showExportModal.value = true
}

const createExportTask = (): void => {
  showExportModal.value = false
  notice.value = `导出任务「${exportForm.fileName}」已创建，可在下载中心查看。`
}

const openAnnotationModal = (): void => {
  showMicroscopeModal.value = false
  showAnnotationModal.value = true
}

const saveAnnotation = (): void => {
  showAnnotationModal.value = false
  notice.value = `日期批注「${annotationForm.title}」已添加到当前留存分析。`
}

const viewUserSamples = async (): Promise<void> => {
  notice.value = '已加载当前单元格用户样本。'
  showMicroscopeModal.value = false
  await openUsers()
}

const copyDrilldownQuery = (): void => {
  const payload = selectedDrilldown.value
    ? JSON.stringify(
        {
          queryId: result.value?.queryId,
          cohortDate: selectedDrilldown.value.cohortDate,
          windowKey: selectedDrilldown.value.windowKey,
          userType: selectedDrilldown.value.userType,
          queryConfig: buildQuery(),
        },
        null,
        2,
      )
    : ''

  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    void navigator.clipboard.writeText(payload)
  }

  showMicroscopeModal.value = false
  notice.value = '当前下钻查询条件已复制。'
}

const exportResultTable = (): void => {
  notice.value = '留存分析 Excel 导出任务已创建，包含查询配置、留存表格、图表数据和指标说明。'
}

const saveAnalysis = async (): Promise<void> => {
  const validationMessage = validateQuery()

  if (validationMessage) {
    errorMessage.value = validationMessage
    return
  }

  const response = await retentionAnalysisService.saveRetentionAnalysis({
    ...saveAnalysisForm,
    tags: saveAnalysisForm.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    queryConfig: buildQuery(),
    chartConfig: {
      chartType: chartType.value,
      selectedWindow: selectedWindowKey.value,
      showUserCount: includeUserCount.value,
      showMetric: metricMode.value,
    },
  })
  showSaveAnalysisModal.value = false
  notice.value = response.message
}

const saveToDashboard = async (): Promise<void> => {
  const validationMessage = validateQuery()

  if (validationMessage) {
    errorMessage.value = validationMessage
    return
  }

  const response = await retentionAnalysisService.saveRetentionWidgetToDashboard({
    ...saveDashboardForm,
    queryConfig: buildQuery(),
    chartConfig: {
      metric: metricMode.value,
      chartType: chartType.value,
      selectedWindow: selectedWindowKey.value,
      showUserCount: includeUserCount.value,
    },
  })
  showSaveDashboardModal.value = false
  notice.value = response.message
}

const retentionColumns = computed<DataTableColumns<RetentionResultRow>>(() => {
  const baseColumns: DataTableColumns<RetentionResultRow> = [
    { title: '起始日期', key: 'cohortDate', fixed: 'left', width: 120 },
    {
      title: '对照组',
      key: 'comparisonGroupName',
      width: 130,
      render: (row) => row.comparisonGroupName ?? '全部用户',
    },
    {
      title: groupBys.value.length ? groupBys.value.map((group) => group.displayName).join(' / ') : '分组',
      key: 'groupValues',
      width: 140,
      render: (row) => Object.values(row.groupValues).join(' / ') || '总体',
    },
    {
      title: '起始人数',
      key: 'startUsers',
      sorter: (left, right) => left.startUsers - right.startUsers,
      width: 120,
      render: (row) =>
        h(
          NButton,
          {
            text: true,
            type: 'primary',
            onClick: () => openMicroscope(createDrilldownFromRow(row, 'start_users', 'start')),
          },
          { default: () => row.startUsers.toLocaleString('zh-CN') },
        ),
    },
  ]

  const windowColumns: DataTableColumns<RetentionResultRow> =
    result.value?.columns.map((column) => ({
      title: column.label,
      key: column.key,
      align: 'center',
      sorter: (left: RetentionResultRow, right: RetentionResultRow) => {
        const leftWindow = left.windows.find((window) => window.key === column.key)
        const rightWindow = right.windows.find((window) => window.key === column.key)

        return (leftWindow?.[metricValueField.value] ?? 0) - (rightWindow?.[metricValueField.value] ?? 0)
      },
      render: (row: RetentionResultRow) => {
        const window = row.windows.find((item) => item.key === column.key)
        const value = window?.[metricValueField.value] ?? 0
        const userCount = window?.[metricUsersField.value] ?? 0
        const alpha = Math.max(0.08, Math.min(0.78, value / 55))

        return h(
          'button',
          {
            class: 'retention-cell',
            style: {
              background: metricMode.value === 'retention'
                ? `rgba(24, 160, 88, ${alpha})`
                : `rgba(208, 48, 80, ${alpha})`,
            },
            onClick: () =>
              openMicroscope(
                createDrilldownFromRow(
                  row,
                  column.key,
                  metricMode.value === 'retention' ? 'retained' : 'churned',
                ),
              ),
          },
          includeUserCount.value
            ? `${value.toFixed(2)}% / ${userCount.toLocaleString('zh-CN')} 人`
            : `${value.toFixed(2)}%`,
        )
      },
    })) ?? []

  return [...baseColumns, ...windowColumns]
})

const userColumnMap: Record<RetentionUserField, DataTableColumns<RetentionUserRecord>[number]> = {
  startEventTime: { title: '起始事件时间', key: 'startEventTime', width: 170, sorter: 'default' },
  returnEventTime: { title: '回访事件时间', key: 'returnEventTime', width: 170, sorter: 'default' },
  groupValue: { title: '分组值', key: 'groupValue', width: 120 },
  relationPropertyValue: { title: '关联属性值', key: 'relationPropertyValue', width: 160 },
  userLevel: { title: '用户等级', key: 'userLevel', width: 100 },
  channel: { title: '渠道', key: 'channel', width: 120 },
  lifecycleTag: { title: '生命周期标签', key: 'lifecycleTag', width: 130 },
}

const userColumns = computed<DataTableColumns<RetentionUserRecord>>(() => [
  { title: '用户 ID', key: 'userId', fixed: 'left', width: 120 },
  ...visibleUserFields.value.map((field) => userColumnMap[field]),
])

onMounted(async () => {
  metadataLoading.value = true
  const [metadata, defaultFilter, defaultGroups, defaultWindows] = await Promise.all([
    retentionAnalysisService.getRetentionMetadata(),
    retentionAnalysisService.getDefaultUserFilter(),
    retentionAnalysisService.getDefaultComparisonGroups(),
    retentionAnalysisService.getDefaultCustomWindows(),
  ])
  metadataEvents.value = metadata.eventMetadata.events
  metadataUserAttributes.value = metadata.eventMetadata.userAttributes
  metadataUserTags.value = metadata.eventMetadata.userTags
  metadataUserSegments.value = metadata.eventMetadata.userSegments
  userFilter.value = defaultFilter
  comparisonGroups.value = defaultGroups.slice(0, 0)
  customWindows.value = defaultWindows
  metadataLoading.value = false
})
</script>

<template>
  <div class="retention-page">
    <div class="retention-header">
      <div>
        <h1>留存分析</h1>
        <p>自定义起始事件和回访事件，分析用户在后续周期内是否持续发生关键行为。</p>
      </div>
      <n-space>
        <n-tag :type="queryState === 'success' ? 'success' : queryState === 'dirty' ? 'warning' : 'default'">
          查询状态：{{ queryState }}
        </n-tag>
        <n-button @click="showSaveAnalysisModal = true">保存分析</n-button>
        <n-button @click="showSaveDashboardModal = true">保存到看板</n-button>
        <n-button secondary @click="loadDemoQuery">加载示例</n-button>
        <n-button type="primary" :loading="loading" @click="runQuery">运行查询</n-button>
      </n-space>
    </div>

    <n-alert v-if="notice" type="success" :show-icon="false">{{ notice }}</n-alert>
    <n-alert v-if="errorMessage" type="error" :show-icon="false">{{ errorMessage }}</n-alert>

    <div class="retention-layout">
      <aside class="retention-config">
        <n-spin :show="metadataLoading">
          <n-card title="1. 事件配置" size="small">
            <n-space vertical>
              <n-card size="small" class="event-config-card">
                <strong>起始事件</strong>
                <n-select
                  v-model:value="startEventName"
                  :options="eventOptions"
                  filterable
                  clearable
                  placeholder="请选择起始事件"
                  @update:value="markDirty"
                />
                <n-space :size="6">
                  <n-button size="tiny" secondary @click="openFilterConfig('start')">
                    过滤条件 {{ startEventFilters.length }}
                  </n-button>
                  <n-button size="tiny" secondary @click="copyStartToReturn">复制为回访事件</n-button>
                  <n-button size="tiny" text type="error" @click="clearEvent('start')">清空</n-button>
                </n-space>
                <div v-if="startEventFilters.length" class="filter-chip-list">
                  <n-tag
                    v-for="condition in startEventFilters"
                    :key="condition.id"
                    closable
                    @close="removeEventFilter('start', condition.id)"
                  >
                    {{ condition.fieldDisplayName }} {{ condition.displayValue }}
                  </n-tag>
                </div>
              </n-card>

              <n-card size="small" class="event-config-card">
                <strong>回访事件</strong>
                <n-select
                  v-model:value="returnEventName"
                  :options="eventOptions"
                  filterable
                  clearable
                  placeholder="请选择回访事件"
                  @update:value="markDirty"
                />
                <n-alert v-if="startEventName && startEventName === returnEventName" type="info" :show-icon="false">
                  起始事件和回访事件相同，适合分析重复发生行为。
                </n-alert>
                <n-space :size="6">
                  <n-button size="tiny" secondary @click="openFilterConfig('return')">
                    过滤条件 {{ returnEventFilters.length }}
                  </n-button>
                  <n-button size="tiny" text type="error" @click="clearEvent('return')">清空</n-button>
                </n-space>
                <div v-if="returnEventFilters.length" class="filter-chip-list">
                  <n-tag
                    v-for="condition in returnEventFilters"
                    :key="condition.id"
                    closable
                    @close="removeEventFilter('return', condition.id)"
                  >
                    {{ condition.fieldDisplayName }} {{ condition.displayValue }}
                  </n-tag>
                </div>
              </n-card>

              <n-card size="small" class="event-config-card">
                <div class="card-mini-title">
                  <strong>关联属性</strong>
                  <n-button size="tiny" secondary @click="addRelationProperty">+ 添加</n-button>
                </div>
                <n-empty v-if="!relationProperties.length" size="small" description="未开启关联属性，默认只要求同一用户回访" />
                <div v-else class="compact-list">
                  <div v-for="relation in relationProperties" :key="relation.id" class="relation-row">
                    <n-select
                      v-model:value="relation.startProperty"
                      :options="startRelationPropertyOptions"
                      size="small"
                      filterable
                      @update:value="markDirty"
                    />
                    <span>=</span>
                    <n-select
                      v-model:value="relation.returnProperty"
                      :options="returnRelationPropertyOptions"
                      size="small"
                      filterable
                      @update:value="markDirty"
                    />
                    <n-button size="tiny" text type="error" @click="removeRelationProperty(relation.id)">删除</n-button>
                  </div>
                </div>
              </n-card>
            </n-space>
          </n-card>

          <n-card title="2. 时间与留存模型" size="small">
            <n-space vertical>
              <n-date-picker
                v-model:value="timeRange"
                type="daterange"
                clearable
                @update:value="markDirty"
              />
              <n-grid :cols="2" :x-gap="8" :y-gap="8">
                <n-gi>
                  <n-select
                    v-model:value="scope.idType"
                    :options="[
                      { label: '用户 ID', value: 'user_id' },
                      { label: '设备 ID', value: 'device_id' },
                      { label: '账号 ID', value: 'account_id' },
                    ]"
                    @update:value="markDirty"
                  />
                </n-gi>
                <n-gi>
                  <n-select
                    v-model:value="scope.timezone"
                    :options="[
                      { label: 'UTC+8 北京时间', value: 'UTC+8' },
                      { label: 'UTC+1 欧洲中部时间', value: 'UTC+1' },
                    ]"
                    @update:value="markDirty"
                  />
                </n-gi>
                <n-gi>
                  <n-select
                    v-model:value="granularity"
                    :options="[
                      { label: '日', value: 'day' },
                      { label: '周', value: 'week' },
                      { label: '月', value: 'month' },
                    ]"
                    @update:value="markDirty"
                  />
                </n-gi>
                <n-gi>
                  <n-select
                    v-model:value="weekStartDay"
                    :disabled="granularity !== 'week'"
                    :options="[
                      { label: '周一开始', value: 1 },
                      { label: '周日开始', value: 7 },
                    ]"
                    @update:value="markDirty"
                  />
                </n-gi>
              </n-grid>

              <n-radio-group v-model:value="modelType" @update:value="markDirty">
                <n-radio-button value="fixed_date">特定日期留存</n-radio-button>
                <n-radio-button value="custom_interval">自定义区间</n-radio-button>
                <n-radio-button value="continuous">连续留存</n-radio-button>
              </n-radio-group>
              <n-card v-if="modelType === 'continuous'" size="small">
                <n-space align="center">
                  <span>连续窗口</span>
                  <n-input-number
                    v-model:value="continuousWindow"
                    :min="1"
                    :max="120"
                    size="small"
                    @update:value="markDirty"
                  />
                  <span>{{ granularity === 'day' ? '天' : granularity === 'week' ? '周' : '月' }}</span>
                  <n-checkbox v-model:checked="continuousIncludeStartDay" @update:checked="markDirty">
                    起始当天也必须回访
                  </n-checkbox>
                </n-space>
              </n-card>
              <n-space align="center">
                <n-checkbox v-model:checked="includeDay0" @update:checked="markDirty">计算当日留存</n-checkbox>
                <n-checkbox v-model:checked="includeUserCount" @update:checked="markDirty">显示人数</n-checkbox>
              </n-space>
            </n-space>
          </n-card>

          <n-card title="3. 留存窗口" size="small">
            <n-space vertical>
              <n-radio-group v-model:value="windowMode" @update:value="markDirty">
                <n-radio-button value="all">查看所有窗口</n-radio-button>
                <n-radio-button value="key">关键窗口</n-radio-button>
                <n-radio-button value="custom">自定义区间</n-radio-button>
              </n-radio-group>
              <n-input
                v-if="windowMode === 'key'"
                v-model:value="keyWindowText"
                placeholder="例如 1,3,7,14,30"
                @update:value="markDirty"
              />
              <div v-if="windowMode === 'custom'" class="compact-list">
                <div v-for="window in customWindows" :key="window.id" class="compact-row">
                  <n-input v-model:value="window.name" size="small" @update:value="markDirty" />
                  <n-input-number v-model:value="window.startOffset" :min="0" size="small" @update:value="markDirty" />
                  <span>至</span>
                  <n-input-number v-model:value="window.endOffset" :min="0" size="small" @update:value="markDirty" />
                  <n-button size="tiny" text type="error" @click="removeCustomWindow(window.id)">删除</n-button>
                </div>
                <n-button size="small" secondary @click="addCustomWindow">+ 添加区间</n-button>
              </div>
            </n-space>
          </n-card>

          <n-card title="4. 用户筛选 / 对照组 / 分组" size="small">
            <n-space vertical>
              <div class="summary-line">
                <span>分析用户</span>
                <strong>{{ userFilter?.conditions.length ? '自定义用户筛选' : '全部用户' }}</strong>
              </div>
              <div v-if="userFilter?.conditions.length" class="filter-chip-list">
                <n-tag
                  v-for="condition in userFilter.conditions"
                  :key="condition.id"
                  closable
                  @close="removeUserFilter(condition.id)"
                >
                  {{ condition.fieldDisplayName }} {{ condition.displayValue }}
                </n-tag>
              </div>
              <n-button size="small" secondary @click="openFilterConfig('user')">添加筛选条件</n-button>

              <div class="section-title">对照组</div>
              <div v-if="comparisonGroups.length" class="compact-list">
                <div v-for="group in comparisonGroups" :key="group.id" class="comparison-config-row">
                  <div class="compact-row">
                    <i :style="{ background: group.color }" />
                    <n-input v-model:value="group.name" size="small" @update:value="markDirty" />
                    <n-switch v-model:value="group.enabled" size="small" @update:value="markDirty" />
                    <n-button size="tiny" secondary @click="openFilterConfig('comparison', group.id)">
                      条件 {{ group.userFilter.conditions.length }}
                    </n-button>
                    <n-button size="tiny" text @click="openEditComparisonGroup(group)">编辑</n-button>
                    <n-button size="tiny" text @click="copyComparisonGroup(group)">复制</n-button>
                    <n-button size="tiny" text type="error" @click="removeComparisonGroup(group.id)">删除</n-button>
                  </div>
                  <div v-if="group.userFilter.conditions.length" class="filter-chip-list">
                    <n-tag
                      v-for="condition in group.userFilter.conditions"
                      :key="condition.id"
                      closable
                      @close="removeComparisonFilter(group.id, condition.id)"
                    >
                      {{ condition.fieldDisplayName }} {{ condition.displayValue }}
                    </n-tag>
                  </div>
                </div>
              </div>
              <n-empty v-else size="small" description="未配置对照组，将按全部用户查询" />
              <n-button size="small" secondary @click="openCreateComparisonGroup">+ 添加对照组</n-button>

              <div class="section-title">属性分组</div>
              <div v-if="groupBys.length" class="compact-list">
                <div v-for="group in groupBys" :key="group.id" class="group-by-config-row">
                  <div>
                    <strong>{{ group.displayName }}</strong>
                    <span>
                      {{ getGroupByFieldTypeLabel(group.fieldType) }} ·
                      {{ getGroupByValueModeLabel(group.valueMode) }}
                      <template v-if="group.listSplit"> · 列表拆分</template>
                    </span>
                  </div>
                  <n-button size="tiny" text type="error" @click="removeGroupBy(group.id)">删除</n-button>
                </div>
              </div>
              <n-empty v-else size="small" description="未配置属性分组，默认仅按起始日期汇总" />
              <n-button size="small" secondary @click="openGroupByConfig">+ 添加分组</n-button>
            </n-space>
          </n-card>

          <n-card title="5. 同时显示指标" size="small">
            <div v-if="extraMetrics.length" class="compact-list">
              <div v-for="metric in extraMetrics" :key="metric.id" class="metric-config-row">
                <div class="compact-row">
                  <strong>{{ metric.displayName }}</strong>
                  <n-tag size="small">{{ metric.aggregator }}</n-tag>
                  <span>{{ metric.eventName }}</span>
                  <n-button size="tiny" secondary @click="openFilterConfig('extra_metric', '', metric.id)">
                    过滤条件 {{ metric.filters.length }}
                  </n-button>
                  <n-button size="tiny" text type="error" @click="removeExtraMetric(metric.id)">删除</n-button>
                </div>
                <div v-if="metric.filters.length" class="filter-chip-list">
                  <n-tag
                    v-for="condition in metric.filters"
                    :key="condition.id"
                    closable
                    @close="removeExtraMetricFilter(metric.id, condition.id)"
                  >
                    {{ condition.fieldDisplayName }} {{ condition.displayValue }}
                  </n-tag>
                </div>
              </div>
            </div>
            <n-empty v-else size="small" description="当前只展示留存/流失核心指标" />
            <n-button class="full-button" size="small" secondary @click="openCreateExtraMetric">+ 添加业务指标</n-button>
          </n-card>
        </n-spin>
      </aside>

      <main class="retention-main">
        <n-card size="small">
          <div class="toolbar">
            <div>
              <strong>查询范围</strong>
              <span>{{ dateLabel }} · {{ granularity }} 粒度 · {{ scope.idType }}</span>
            </div>
            <n-space>
              <n-radio-group v-model:value="metricMode" @update:value="runQuery">
                <n-radio-button value="retention">留存</n-radio-button>
                <n-radio-button value="churn">流失</n-radio-button>
              </n-radio-group>
              <n-radio-group v-model:value="chartType" @update:value="markDirty">
                <n-radio-button value="trend">趋势图</n-radio-button>
                <n-radio-button value="comparison">对比图</n-radio-button>
                <n-radio-button value="table">留存表格</n-radio-button>
              </n-radio-group>
            </n-space>
          </div>
        </n-card>

        <n-grid v-if="result" :cols="4" :x-gap="12">
          <n-gi>
            <n-card>
              <n-statistic label="起始用户" :value="result.summary.totalStartUsers" />
            </n-card>
          </n-gi>
          <n-gi>
            <n-card>
              <n-statistic label="Day1 留存率" :value="result.summary.retentionRateDay1" suffix="%" />
            </n-card>
          </n-gi>
          <n-gi>
            <n-card>
              <n-statistic label="Day7 留存率" :value="result.summary.retentionRateDay7" suffix="%" />
            </n-card>
          </n-gi>
          <n-gi>
            <n-card>
              <n-statistic label="最大窗口" :value="result.summary.maxWindow" suffix="天" />
            </n-card>
          </n-gi>
        </n-grid>

        <n-card class="chart-card">
          <template #header>
            <div class="card-header">
              <div>
                <strong>{{ chartTitle }}</strong>
                <span>{{ startEvent?.displayName || '未选择起始事件' }} → {{ returnEvent?.displayName || '未选择回访事件' }}</span>
              </div>
              <n-select
                v-if="chartType === 'comparison' && result"
                v-model:value="selectedWindowKey"
                :options="result.columns.map((column) => ({ label: column.label, value: column.key }))"
                size="small"
                style="width: 140px"
                @update:value="runQuery"
              />
            </div>
          </template>

          <n-spin :show="loading">
            <n-empty v-if="!hasRequiredEvents && !result" description="请选择起始事件和回访事件后开始分析">
              <template #extra>
                <n-button type="primary" @click="loadDemoQuery">选择起始事件</n-button>
              </template>
            </n-empty>
            <n-empty v-else-if="queryState === 'empty'" description="当前条件下暂无留存数据，请调整筛选条件或时间范围。" />
            <v-chart
              v-else-if="result && chartType !== 'table'"
              class="retention-chart"
              :option="chartOption"
              autoresize
              @click="openMicroscopeFromChart"
            />
            <n-data-table
              v-else-if="result"
              :columns="retentionColumns"
              :data="result.rows"
              :pagination="{ pageSize: 8 }"
              :scroll-x="1120"
            />
          </n-spin>
        </n-card>

        <n-card v-if="result" title="明细数据">
          <template #header-extra>
            <n-space>
              <n-button size="small" secondary @click="exportResultTable">导出 Excel</n-button>
              <n-button size="small" type="primary" secondary @click="openMicroscope(createDefaultDrilldown())">显微镜下钻</n-button>
            </n-space>
          </template>
          <n-data-table
            :columns="retentionColumns"
            :data="result.rows"
            :pagination="{ pageSize: 10 }"
            :scroll-x="1120"
          />
        </n-card>
      </main>
    </div>

    <n-drawer v-model:show="showUserDrawer" :width="720">
      <n-drawer-content title="用户列表">
        <n-space vertical>
          <n-grid :cols="4" :x-gap="10">
            <n-gi>
              <n-card size="small">
                <n-statistic label="命中用户" :value="selectedDrilldown?.matchedUsers ?? users.length" />
              </n-card>
            </n-gi>
            <n-gi>
              <n-card size="small">
                <n-statistic label="起始用户" :value="selectedDrilldown?.startUsers ?? 0" />
              </n-card>
            </n-gi>
            <n-gi>
              <n-card size="small">
                <n-statistic label="命中率" :value="selectedDrilldown?.rate ?? 0" suffix="%" />
              </n-card>
            </n-gi>
            <n-gi>
              <n-card size="small">
                <n-statistic label="当前口径" :value="scope.idType" />
              </n-card>
            </n-gi>
          </n-grid>
          <n-alert type="info" :show-icon="false">
            除用户 ID 外，其余字段可按用户属性和标签自由配置展示。
          </n-alert>
          <n-card size="small" title="展示字段">
            <n-checkbox-group v-model:value="visibleUserFields">
              <n-space>
                <n-checkbox
                  v-for="field in userFieldOptions"
                  :key="field.value"
                  :value="field.value"
                >
                  {{ field.label }}
                </n-checkbox>
              </n-space>
            </n-checkbox-group>
          </n-card>
          <n-space justify="end">
            <n-button size="small" secondary @click="openExportModal">导出用户 ID</n-button>
            <n-button size="small" type="primary" secondary @click="openSegmentModal">保存为分群</n-button>
          </n-space>
          <n-data-table
            :columns="userColumns"
            :data="users"
            :pagination="{ pageSize: 10 }"
            :scroll-x="1120"
          />
        </n-space>
      </n-drawer-content>
    </n-drawer>

    <n-modal v-model:show="showFilterModal" preset="card" title="筛选条件配置" class="retention-modal">
      <n-space vertical>
        <n-alert type="info" :show-icon="false">
          事件过滤支持事件属性、用户属性、标签和分群；用户筛选支持属性、标签、分群、行为圈选和动态匹配。
        </n-alert>
        <n-grid :cols="2" :x-gap="10" :y-gap="10">
          <n-gi>
            <n-select
              v-model:value="filterDraft.logic"
              :options="[
                { label: 'AND', value: 'AND' },
                { label: 'OR', value: 'OR' },
              ]"
              placeholder="逻辑关系"
            />
          </n-gi>
          <n-gi>
            <n-select
              :value="filterDraft.sourceType"
              :options="filterSourceOptions"
              placeholder="筛选类型"
              @update:value="(value) => syncFilterDraftSource(String(value))"
            />
          </n-gi>
          <n-gi>
            <n-select
              v-model:value="filterDraft.field"
              :options="filterFieldOptions"
              filterable
              placeholder="字段 / 事件 / 分群"
            />
          </n-gi>
          <n-gi>
            <n-select
              v-model:value="filterDraft.operator"
              :options="filterOperatorOptions"
              placeholder="操作符"
            />
          </n-gi>
          <n-gi :span="2">
            <n-input
              v-model:value="filterDraft.valueText"
              :disabled="filterDraft.sourceType === 'behavior' || filterDraft.sourceType === 'segment'"
              placeholder="筛选值；属于/不属于支持英文逗号分隔，正则匹配填写表达式"
            />
          </n-gi>
        </n-grid>
        <n-button type="primary" @click="saveFilterCondition">保存筛选条件</n-button>
      </n-space>
    </n-modal>

    <n-modal v-model:show="showGroupByModal" preset="card" title="属性分组配置" class="retention-modal">
      <n-space vertical>
        <n-select
          :value="groupByDraft.fieldType"
          :options="[
            { label: '起始事件属性', value: 'start_event_property' },
            { label: '回访事件属性', value: 'return_event_property' },
            { label: '用户属性', value: 'user_property' },
            { label: '用户标签', value: 'user_tag' },
            { label: '用户分群', value: 'cohort' },
          ]"
          @update:value="(value) => syncGroupByFieldType(String(value))"
        />
        <n-select
          v-model:value="groupByDraft.fieldName"
          :options="groupByFieldOptions"
          :disabled="!groupByFieldOptions.length"
          filterable
          placeholder="选择分组字段"
        />
        <n-alert v-if="currentGroupBySourceTip" type="warning" :show-icon="false">
          {{ currentGroupBySourceTip }}
        </n-alert>
        <n-radio-group v-model:value="groupByDraft.valueMode">
          <n-radio-button value="raw">原始值</n-radio-button>
          <n-radio-button value="auto_interval">自动区间</n-radio-button>
          <n-radio-button value="custom_interval">自定义区间</n-radio-button>
        </n-radio-group>
        <n-checkbox v-model:checked="groupByDraft.listSplit">列表属性拆分显示</n-checkbox>
        <n-button type="primary" @click="saveGroupBy">保存分组</n-button>
      </n-space>
    </n-modal>

    <n-modal v-model:show="showExtraMetricModal" preset="card" title="同时显示指标配置" class="retention-modal">
      <n-space vertical>
        <n-alert type="info" :show-icon="false">
          同时显示指标用于统计留存用户在留存窗口内产生的业务指标，例如广告观看次数、充值金额或 LTV。
        </n-alert>
        <n-input v-model:value="extraMetricDraft.displayName" placeholder="指标名称" />
        <n-grid :cols="2" :x-gap="10" :y-gap="10">
          <n-gi>
            <n-select
              :value="extraMetricDraft.eventName"
              :options="eventOptions"
              filterable
              placeholder="选择事件"
              @update:value="(value) => syncExtraMetricEvent(String(value))"
            />
          </n-gi>
          <n-gi>
            <n-select
              :value="extraMetricDraft.aggregator"
              :options="extraMetricAggregatorOptions"
              placeholder="计算方式"
              @update:value="(value) => syncExtraMetricAggregator(String(value))"
            />
          </n-gi>
          <n-gi v-if="extraMetricNeedsProperty" :span="2">
            <n-select
              v-model:value="extraMetricDraft.propertyName"
              :options="extraMetricPropertyOptions"
              filterable
              placeholder="选择数值属性"
            />
          </n-gi>
        </n-grid>

        <n-card size="small" title="指标过滤条件">
          <n-space vertical>
            <div v-if="extraMetricDraft.filters.length" class="filter-chip-list">
              <n-tag
                v-for="condition in extraMetricDraft.filters"
                :key="condition.id"
                closable
                @close="removeExtraMetricFilter('draft', condition.id)"
              >
                {{ condition.fieldDisplayName }} {{ condition.displayValue }}
              </n-tag>
            </div>
            <n-empty v-else size="small" description="暂未配置过滤条件" />
            <n-button size="small" secondary @click="openFilterConfig('extra_metric', '', 'draft')">
              + 添加指标过滤
            </n-button>
          </n-space>
        </n-card>
        <n-button type="primary" @click="saveExtraMetric">保存指标</n-button>
      </n-space>
    </n-modal>

    <n-modal v-model:show="showComparisonModal" preset="card" title="对照组配置" class="retention-modal">
      <n-space vertical>
        <n-input v-model:value="comparisonDraft.name" placeholder="对照组名称" />
        <n-grid :cols="2" :x-gap="10">
          <n-gi>
            <n-input v-model:value="comparisonDraft.color" placeholder="颜色，例如 #2080f0" />
          </n-gi>
          <n-gi>
            <n-space align="center">
              <span>启用</span>
              <n-switch v-model:value="comparisonDraft.enabled" />
            </n-space>
          </n-gi>
        </n-grid>
        <n-card size="small" title="人群条件">
          <n-space vertical>
            <div v-if="comparisonDraft.conditions.length" class="filter-chip-list">
              <n-tag
                v-for="condition in comparisonDraft.conditions"
                :key="condition.id"
                closable
                @close="removeComparisonFilter('draft', condition.id)"
              >
                {{ condition.fieldDisplayName }} {{ condition.displayValue }}
              </n-tag>
            </div>
            <n-empty v-else size="small" description="未配置条件时，该对照组等同于全部用户" />
            <n-button size="small" secondary @click="openFilterConfig('comparison', 'draft')">
              + 添加人群条件
            </n-button>
          </n-space>
        </n-card>
        <n-button type="primary" @click="saveComparisonGroup">保存对照组</n-button>
      </n-space>
    </n-modal>

    <n-modal v-model:show="showMicroscopeModal" preset="card" :title="selectedDrilldownTitle" class="retention-modal">
      <n-space vertical>
        <n-grid :cols="3" :x-gap="10">
          <n-gi>
            <n-card size="small">
              <n-statistic label="起始人数" :value="selectedDrilldown?.startUsers ?? 0" />
            </n-card>
          </n-gi>
          <n-gi>
            <n-card size="small">
              <n-statistic label="命中人数" :value="selectedDrilldown?.matchedUsers ?? 0" />
            </n-card>
          </n-gi>
          <n-gi>
            <n-card size="small">
              <n-statistic label="比例" :value="selectedDrilldown?.rate ?? 0" suffix="%" />
            </n-card>
          </n-gi>
        </n-grid>
        <n-alert type="info" :show-icon="false">
          分组：{{ selectedDrilldown?.groupName ?? '总体' }}。可继续查看用户、保存分群、导出用户 ID 或复制该单元格查询条件。
        </n-alert>
        <n-grid :cols="2" :x-gap="10" :y-gap="10">
          <n-gi>
            <n-button class="full-button" type="primary" @click="openUsersFromMicroscope">查看用户列表</n-button>
          </n-gi>
          <n-gi>
            <n-button class="full-button" secondary @click="openSegmentModal">保存为用户分群</n-button>
          </n-gi>
          <n-gi>
            <n-button class="full-button" secondary @click="openExportModal">导出用户 ID</n-button>
          </n-gi>
          <n-gi>
            <n-button class="full-button" secondary @click="viewUserSamples">查看用户样本</n-button>
          </n-gi>
          <n-gi>
            <n-button class="full-button" secondary @click="openAnnotationModal">新建日期批注</n-button>
          </n-gi>
          <n-gi>
            <n-button class="full-button" secondary @click="copyDrilldownQuery">复制查询条件</n-button>
          </n-gi>
        </n-grid>
      </n-space>
    </n-modal>

    <n-modal v-model:show="showSegmentModal" preset="card" title="保存为用户分群" class="retention-modal">
      <n-space vertical>
        <n-input v-model:value="segmentForm.name" placeholder="分群名称" />
        <n-input v-model:value="segmentForm.description" type="textarea" placeholder="分群描述" />
        <n-alert type="info" :show-icon="false">
          当前范围：{{ selectedDrilldownTitle }}，预计 {{ selectedDrilldown?.matchedUsers.toLocaleString('zh-CN') ?? 0 }} 人。
        </n-alert>
        <n-button type="primary" @click="saveSegment">保存分群</n-button>
      </n-space>
    </n-modal>

    <n-modal v-model:show="showExportModal" preset="card" title="导出用户 ID" class="retention-modal">
      <n-space vertical>
        <n-input v-model:value="exportForm.fileName" placeholder="导出任务名称" />
        <n-space>
          <n-checkbox v-model:checked="exportForm.includeEventTime">包含起始/回访事件时间</n-checkbox>
          <n-checkbox v-model:checked="exportForm.includeGroupValues">包含分组值</n-checkbox>
        </n-space>
        <n-alert type="warning" :show-icon="false">
          用户 ID 导出会生成异步任务，本阶段使用 mock 任务反馈。
        </n-alert>
        <n-button type="primary" @click="createExportTask">创建导出任务</n-button>
      </n-space>
    </n-modal>

    <n-modal v-model:show="showAnnotationModal" preset="card" title="新建日期批注" class="retention-modal">
      <n-space vertical>
        <n-input v-model:value="annotationForm.title" placeholder="批注标题" />
        <n-input v-model:value="annotationForm.content" type="textarea" placeholder="批注内容，例如活动上线、版本发布、渠道投放变化" />
        <n-alert type="info" :show-icon="false">
          批注将关联到当前 cohort 日期和留存窗口，后续可在趋势图中展示。
        </n-alert>
        <n-button type="primary" @click="saveAnnotation">保存批注</n-button>
      </n-space>
    </n-modal>

    <n-modal v-model:show="showSaveAnalysisModal" preset="card" title="保存分析" class="retention-modal">
      <n-space vertical>
        <n-input v-model:value="saveAnalysisForm.name" placeholder="分析名称" />
        <n-input v-model:value="saveAnalysisForm.description" type="textarea" placeholder="描述" />
        <n-select
          v-model:value="saveAnalysisForm.spaceType"
          :options="[
            { label: '个人空间', value: 'personal' },
            { label: '团队空间', value: 'team' },
          ]"
        />
        <n-input v-model:value="saveAnalysisForm.tags" placeholder="标签，英文逗号分隔" />
        <n-radio-group v-model:value="saveAnalysisForm.timeMode">
          <n-radio-button value="relative">相对时间</n-radio-button>
          <n-radio-button value="fixed">固定时间</n-radio-button>
        </n-radio-group>
        <n-button type="primary" @click="saveAnalysis">保存</n-button>
      </n-space>
    </n-modal>

    <n-modal v-model:show="showSaveDashboardModal" preset="card" title="保存到看板" class="retention-modal">
      <n-space vertical>
        <n-input v-model:value="saveDashboardForm.title" placeholder="图表名称" />
        <n-select
          v-model:value="saveDashboardForm.dashboardId"
          :options="[
            { label: '个人空间 / 留存监控', value: 'dash-personal-retention' },
            { label: '团队空间 / 新用户留存看板', value: 'dash-team-retention' },
          ]"
        />
        <n-radio-group v-model:value="saveDashboardForm.widgetType">
          <n-radio-button value="retention_trend">留存曲线</n-radio-button>
          <n-radio-button value="retention_comparison">留存对比</n-radio-button>
          <n-radio-button value="retention_table">留存表格</n-radio-button>
        </n-radio-group>
        <n-select
          v-model:value="saveDashboardForm.refreshPolicy"
          :options="[
            { label: '手动刷新', value: 'manual' },
            { label: '每小时刷新', value: 'hourly' },
            { label: '每日刷新', value: 'daily' },
          ]"
        />
        <n-button type="primary" @click="saveToDashboard">保存到看板</n-button>
      </n-space>
    </n-modal>
  </div>
</template>

<style scoped lang="scss">
.retention-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 100%;
}

.retention-header,
.toolbar,
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.retention-header h1 {
  margin: 0;
  font-size: 28px;
}

.retention-header p,
.toolbar span,
.card-header span {
  margin: 6px 0 0;
  color: #6b7280;
}

.retention-layout {
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.retention-config {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: calc(100vh - 152px);
  overflow: auto;
}

.retention-config :deep(.n-card) {
  margin-bottom: 12px;
}

.retention-main {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.event-config-card :deep(.n-card__content),
.compact-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-title {
  margin-top: 4px;
  font-weight: 700;
}

.card-mini-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.summary-line,
.compact-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.comparison-config-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  border: 1px solid #edf0f5;
  border-radius: 6px;
}

.metric-config-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  border: 1px solid #edf0f5;
  border-radius: 6px;
}

.group-by-config-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px;
  border: 1px solid #edf0f5;
  border-radius: 6px;
}

.group-by-config-row div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.group-by-config-row span {
  color: #6b7280;
  font-size: 12px;
}

.filter-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.relation-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
}

.compact-row i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex: none;
}

.full-button {
  width: 100%;
  margin-top: 8px;
}

.chart-card {
  min-height: 420px;
}

.retention-chart {
  width: 100%;
  height: 360px;
}

.retention-cell {
  width: 100%;
  min-width: 112px;
  border: 0;
  border-radius: 4px;
  padding: 8px 10px;
  color: #111827;
  cursor: pointer;
}

.retention-modal {
  width: 560px;
}

@media (max-width: 1200px) {
  .retention-layout {
    grid-template-columns: 1fr;
  }

  .retention-config {
    max-height: none;
  }
}
</style>
