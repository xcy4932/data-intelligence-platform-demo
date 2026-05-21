<script setup lang="ts">
import '@/components/charts/chartRegister'
import type { EChartsOption } from 'echarts'
import dayjs from 'dayjs'
import {
  NAlert,
  NButton,
  NCard,
  NDataTable,
  NDatePicker,
  NDrawer,
  NDrawerContent,
  NEmpty,
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
  NText,
} from 'naive-ui'
import type { DataTableColumns, SelectOption } from 'naive-ui'
import { computed, h, onMounted, reactive, ref } from 'vue'
import VChart from 'vue-echarts'
import { presetFrequencyRanges } from '@/mock/distributionAnalysis'
import { distributionAnalysisService } from '@/services/distributionAnalysisService'
import type {
  EventDefinition,
  EventProperty,
  FilterCondition,
  FilterSourceType,
} from '@/types/eventAnalysis'
import type {
  DistributionAggregator,
  DistributionBucketConfig,
  DistributionChartMode,
  DistributionChartType,
  DistributionComparisonGroup,
  DistributionDetailRow,
  DistributionDrilldownContext,
  DistributionGranularity,
  DistributionGroupBy,
  DistributionMetadata,
  DistributionMetric,
  DistributionPropertyType,
  DistributionQueryRequest,
  DistributionQueryResponse,
  DistributionQueryState,
  DistributionSortBy,
  DistributionSubjectType,
  DistributionUserFilterConfig,
  DistributionUserRecord,
} from '@/types/distributionAnalysis'

type DateRangeValue = [number, number]

const metadataLoading = ref(false)
const loading = ref(false)
const queryState = ref<DistributionQueryState>('idle')
const notice = ref('')
const errorMessage = ref('')
const metadata = ref<DistributionMetadata | null>(null)
const result = ref<DistributionQueryResponse | null>(null)
const showUserDrawer = ref(false)
const showSaveAnalysisModal = ref(false)
const showSaveDashboardModal = ref(false)
const selectedDrilldown = ref<DistributionDrilldownContext | null>(null)

const subjectType = ref<DistributionSubjectType>('user_id')
const timezone = ref('UTC+8 北京时间')
const chartMode = ref<DistributionChartMode>('trend')
const chartType = ref<DistributionChartType>('stacked_area')
const granularity = ref<DistributionGranularity>('day')
const sortBy = ref<DistributionSortBy>('bucket_order')
const quickRange = ref('last_7_days')
const showRatio = ref(true)
const showCount = ref(true)
const dateRange = ref<DateRangeValue>([
  dayjs('2026-05-15').valueOf(),
  dayjs('2026-05-21').valueOf(),
])

const metric = reactive<DistributionMetric>({})
const bucketConfig = reactive<DistributionBucketConfig>({
  mode: 'sturges_auto',
  bucketCount: 5,
  start: 0,
  end: 100,
  width: 10,
  includeBelowRange: true,
  includeAboveRange: true,
  includeNullBucket: false,
  ranges: [
    { id: 'range_0_5', label: '0-5 次', min: 0, max: 5, leftClosed: true, rightClosed: true },
    { id: 'range_6_10', label: '6-10 次', min: 6, max: 10, leftClosed: true, rightClosed: true },
    { id: 'range_11_20', label: '11-20 次', min: 11, max: 20, leftClosed: true, rightClosed: true },
  ],
})
const userFilter = reactive<DistributionUserFilterConfig>({ relation: 'AND', conditions: [] })
const groupBys = ref<DistributionGroupBy[]>([])
const comparisonGroups = ref<DistributionComparisonGroup[]>([])
const saveAnalysisForm = reactive({
  name: '未命名分布分析',
  folder: '个人空间 / 我的分析',
  description: '',
  tags: '分布分析',
  timeMode: 'relative',
  favorite: false,
})
const dashboardForm = reactive({
  widgetName: '分布趋势图',
  dashboard: '个人空间 / 数据概览',
  refreshPolicy: 'open',
  inheritPermission: true,
})

const groupByDraft = reactive<DistributionGroupBy>({
  id: 'group_draft',
  fieldType: 'user_property',
  fieldName: 'channel',
  displayName: '渠道',
  valueLimit: 20,
  includeOthers: true,
  includeUnknown: true,
})

const subjectOptions: SelectOption[] = [
  { label: '用户 ID', value: 'user_id' },
  { label: '设备 ID', value: 'device_id' },
  { label: '账号 ID', value: 'account_id' },
  { label: '匿名 ID', value: 'anonymous_id' },
  { label: '自定义主体', value: 'custom_id' },
]

const granularityOptions: SelectOption[] = [
  { label: '小时（后续开放）', value: 'hour', disabled: true },
  { label: '天', value: 'day' },
  { label: '周（字段预留）', value: 'week', disabled: true },
  { label: '月（字段预留）', value: 'month', disabled: true },
]

const chartModeOptions: SelectOption[] = [
  { label: '趋势图', value: 'trend' },
  { label: '分组图', value: 'group' },
]

const chartTypeOptions = computed<SelectOption[]>(() => chartMode.value === 'trend'
  ? [
      { label: '折线图', value: 'line' },
      { label: '柱状图', value: 'bar' },
      { label: '堆叠柱状图', value: 'stacked_bar' },
      { label: '堆叠面积图', value: 'stacked_area' },
    ]
  : [
      { label: '柱状图', value: 'bar' },
      { label: '堆叠柱状图', value: 'stacked_bar' },
      { label: '饼图', value: 'pie' },
      { label: '环形图', value: 'donut' },
    ])

const sortOptions: SelectOption[] = [
  { label: '区间顺序', value: 'bucket_order' },
  { label: '人数降序', value: 'count_desc' },
  { label: '人数升序', value: 'count_asc' },
  { label: '占比降序', value: 'ratio_desc' },
  { label: '占比升序', value: 'ratio_asc' },
]

const quickRangeOptions: SelectOption[] = [
  { label: '最近 7 天', value: 'last_7_days' },
  { label: '最近 30 天', value: 'last_30_days' },
  { label: '最近 120 天', value: 'last_120_days' },
  { label: '固定时间', value: 'fixed' },
]

const filterSourceOptions: SelectOption[] = [
  { label: '事件属性', value: 'event_property' },
  { label: '公共属性', value: 'common_property' },
  { label: '用户属性', value: 'user_property' },
  { label: '用户标签', value: 'user_tag' },
  { label: '用户分群', value: 'segment' },
  { label: '行为圈选', value: 'behavior' },
  { label: '动态匹配', value: 'dynamic_match' },
]

const filterOperatorOptions: SelectOption[] = [
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
  { label: '过去 N 天做过', value: 'done' },
  { label: '过去 N 天没做过', value: 'not_done' },
]

const groupFieldOptions: SelectOption[] = [
  { label: '渠道', value: 'user_property:channel' },
  { label: '设备系统', value: 'event_property:device_os' },
  { label: 'App 版本', value: 'event_property:app_version' },
  { label: '金币余额等级', value: 'user_tag:coin_balance_level' },
  { label: '用户分群', value: 'cohort:active_7d_users' },
  { label: '统计主体', value: 'subject_property:subject_id' },
]

const groupValueLimitOptions: SelectOption[] = [
  { label: 'Top 5', value: 5 },
  { label: 'Top 10', value: 10 },
  { label: 'Top 20', value: 20 },
]

const bucketModeOptions: SelectOption[] = [
  { label: '智能分组', value: 'sturges_auto' },
  { label: '次数预设分组', value: 'preset_frequency' },
  { label: '等宽分组', value: 'equal_width' },
  { label: '自定义等宽', value: 'custom_equal_width' },
  { label: '自定义区间', value: 'custom_ranges' },
  { label: '枚举值分布', value: 'enum_values' },
]

const aggregatorOptions = computed<SelectOption[]>(() => {
  const hasNumberProperty = selectedEvent.value?.properties.some((property) => property.dataType === 'number') ?? false
  return [
    { label: '事件次数 PV', value: 'PV' },
    { label: '活跃天数', value: 'ACTIVE_DAYS' },
    { label: '活跃小时数', value: 'ACTIVE_HOURS' },
    { label: '属性求和 SUM', value: 'SUM', disabled: !hasNumberProperty },
    { label: '属性均值 AVG', value: 'AVG', disabled: !hasNumberProperty },
    { label: '属性最大值 MAX', value: 'MAX', disabled: !hasNumberProperty },
    { label: '属性最小值 MIN', value: 'MIN', disabled: !hasNumberProperty },
    { label: '属性去重数 DISTINCT', value: 'DISTINCT' },
    { label: '首次属性值 FIRST', value: 'FIRST' },
    { label: '末次属性值 LAST', value: 'LAST' },
  ]
})

const eventOptions = computed<SelectOption[]>(() => {
  const events = metadata.value?.eventMetadata.events ?? []
  return events
    .map((event) => ({
      label: `${event.displayName} ${event.eventName} · ${event.eventType === 'general' ? '一般事件' : event.eventType === 'virtual' ? '虚拟事件' : '圈选事件'}`,
      value: event.eventName,
    }))
})

const selectedEvent = computed(() => {
  const events = metadata.value?.eventMetadata.events ?? []
  return events.find((event) => event.eventName === metric.event?.eventName)
})

const propertyOptions = computed<SelectOption[]>(() => {
  const properties = selectedEvent.value?.properties ?? []
  const onlyNumber = needsNumberProperty.value
  return properties
    .filter((property) => !onlyNumber || property.dataType === 'number')
    .map((property) => ({
      label: `${property.displayName} ${property.propertyName}`,
      value: property.propertyName,
    }))
})

const needsProperty = computed(() => {
  if (!metric.aggregator) return false
  return ['SUM', 'AVG', 'MAX', 'MIN', 'DISTINCT', 'FIRST', 'LAST'].includes(metric.aggregator)
})

const needsNumberProperty = computed(() => {
  if (!metric.aggregator) return false
  return ['SUM', 'AVG', 'MAX', 'MIN'].includes(metric.aggregator)
})

const comparisonEnabled = computed(() => comparisonGroups.value.some((group) => group.enabled))

const timeBuckets = computed(() => {
  if (!result.value) return []
  return Array.from(new Set(result.value.trend.map((point) => point.timeBucket)))
})

const userDrawerRows = computed<DistributionUserRecord[]>(() => {
  const context = selectedDrilldown.value
  if (!context) return []

  return Array.from({ length: Math.min(context.subjectCount, 30) }, (_, index) => ({
    subjectId: `u_${String(810000 + index).padStart(6, '0')}`,
    metricValue: context.bucketLabel,
    bucketLabel: context.bucketLabel,
    eventCount: Math.max(1, Math.round((index % 8) + context.ratio / 10)),
    firstEventTime: `${context.timeBucket ?? dayjs(dateRange.value[0]).format('YYYY-MM-DD')} 09:${String(index % 60).padStart(2, '0')}`,
    lastEventTime: `${context.timeBucket ?? dayjs(dateRange.value[1]).format('YYYY-MM-DD')} 21:${String((index * 3) % 60).padStart(2, '0')}`,
    groupName: context.groupName,
  }))
})

const summaryCards = computed(() => {
  if (!result.value) {
    return [
      { label: '分析主体数', value: '-', description: '进入本次分布计算的主体数量。' },
      { label: '有效主体数', value: '-', description: '有可用于分桶的指标值主体。' },
      { label: '峰值区间', value: '-', description: '主体占比最高的分布区间。' },
      { label: '平均指标值', value: '-', description: '按主体聚合后的平均指标值。' },
    ]
  }

  return [
    { label: '分析主体数', value: result.value.summary.totalSubjects.toLocaleString(), description: '进入本次分布计算的主体数量。' },
    { label: '有效主体数', value: result.value.summary.validSubjects.toLocaleString(), description: '有可用于分桶的指标值主体。' },
    { label: '峰值区间', value: result.value.summary.peakBucketLabel, description: `${result.value.summary.peakBucketRatio}% 主体集中在该区间。` },
    { label: '平均指标值', value: result.value.summary.avgMetricValue.toLocaleString(), description: '按主体聚合后的平均指标值。' },
  ]
})

const chartOption = computed<EChartsOption>(() => {
  if (!result.value) return {}

  const sortedBuckets = sortBuckets(result.value.buckets)

  if (chartMode.value === 'group' && (chartType.value === 'pie' || chartType.value === 'donut')) {
    return {
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      series: [
        {
          type: 'pie',
          radius: chartType.value === 'donut' ? ['42%', '68%'] : '68%',
          data: sortedBuckets.map((bucket) => ({
            name: bucket.bucketLabel,
            value: showRatio.value ? bucket.ratio : bucket.subjectCount,
          })),
        },
      ],
    }
  }

  if (chartMode.value === 'group') {
    const bucketLabels = Array.from(new Set(sortedBuckets.map((bucket) => bucket.bucketLabel)))
    const groupNames = Array.from(new Set(sortedBuckets.map((bucket) => bucket.groupName)))
    return {
      tooltip: { trigger: 'axis' },
      legend: { top: 0 },
      grid: { left: 48, right: 24, top: 56, bottom: 48 },
      xAxis: { type: 'category', data: bucketLabels },
      yAxis: { type: 'value', name: showRatio.value ? '占比 %' : '主体数' },
      series: groupNames.map((groupName) => ({
        name: groupName,
        type: 'bar',
        stack: chartType.value === 'stacked_bar' ? 'total' : undefined,
        data: bucketLabels.map((bucketLabel) => {
          const bucket = sortedBuckets.find((item) => item.bucketLabel === bucketLabel && item.groupName === groupName)
          return bucket ? (showRatio.value ? bucket.ratio : bucket.subjectCount) : 0
        }),
      })),
    }
  }

  const timeBuckets = Array.from(new Set(result.value.trend.map((point) => point.timeBucket)))
  const bucketLabels = Array.from(new Set(result.value.trend.map((point) => point.bucketLabel)))
  const isBar = chartType.value === 'bar' || chartType.value === 'stacked_bar'
  const isStacked = chartType.value === 'stacked_bar' || chartType.value === 'stacked_area'
  return {
    tooltip: { trigger: 'axis' },
    legend: { top: 0 },
    grid: { left: 56, right: 32, top: 56, bottom: 52 },
    xAxis: { type: 'category', data: timeBuckets },
    yAxis: { type: 'value', name: showRatio.value ? '占比 %' : '主体数' },
    dataZoom: [{ type: 'inside' }, { type: 'slider', height: 18, bottom: 12 }],
    series: bucketLabels.map((bucketLabel) => ({
      name: bucketLabel,
      type: isBar ? 'bar' : 'line',
      smooth: !isBar,
      stack: isStacked ? 'distribution' : undefined,
      areaStyle: chartType.value === 'stacked_area' ? {} : undefined,
      emphasis: { focus: 'series' },
      data: timeBuckets.map((timeBucket) => {
        const point = result.value?.trend.find((item) => item.timeBucket === timeBucket && item.bucketLabel === bucketLabel)
        return point ? (showRatio.value ? point.ratio : point.subjectCount) : 0
      }),
    })),
  }
})

const detailColumns = computed<DataTableColumns<DistributionDetailRow>>(() => [
  { title: '分布区间', key: 'bucketLabel', width: 150 },
  { title: '分组', key: 'groupName', width: 130 },
  { title: '对照组', key: 'comparisonGroupName', width: 130 },
  {
    title: '主体数',
    key: 'subjectCount',
    width: 120,
    sorter: 'default',
    render: (row) => h(NButton, {
      text: true,
      type: 'primary',
      onClick: () => openUserDrawer({
        bucketLabel: row.bucketLabel,
        groupName: row.groupName,
        comparisonGroupName: row.comparisonGroupName,
        subjectCount: row.subjectCount,
        ratio: row.ratio,
      }),
    }, { default: () => row.subjectCount.toLocaleString() }),
  },
  {
    title: '占比',
    key: 'ratio',
    width: 100,
    sorter: 'default',
    render: (row) => `${row.ratio}%`,
  },
  { title: '平均指标值', key: 'avgMetricValue', width: 130, sorter: 'default' },
  { title: '最小值', key: 'minMetricValue', width: 110 },
  { title: '最大值', key: 'maxMetricValue', width: 110 },
  {
    title: '样例主体',
    key: 'sampleSubjects',
    width: 220,
    render: (row) => row.sampleSubjects.join('、'),
  },
  ...timeBuckets.value.map((timeBucket) => ({
    title: timeBucket,
    key: `time_${timeBucket}`,
    width: 120,
    sorter: (left: DistributionDetailRow, right: DistributionDetailRow) =>
      getTimePoint(left, timeBucket).subjectCount - getTimePoint(right, timeBucket).subjectCount,
    render: (row: DistributionDetailRow) => {
      const point = getTimePoint(row, timeBucket)
      return h(NButton, {
        text: true,
        type: 'primary',
        onClick: () => openUserDrawer({
          bucketLabel: row.bucketLabel,
          timeBucket,
          groupName: row.groupName,
          comparisonGroupName: row.comparisonGroupName,
          subjectCount: point.subjectCount,
          ratio: point.ratio,
        }),
      }, { default: () => showRatio.value ? `${point.ratio}%` : point.subjectCount.toLocaleString() })
    },
  })),
  {
    title: '操作',
    key: 'actions',
    width: 120,
    fixed: 'right',
    render: (row) => h(NSpace, null, {
      default: () => [
        h(NButton, { text: true, type: 'primary', onClick: () => openUserDrawer({
          bucketLabel: row.bucketLabel,
          groupName: row.groupName,
          comparisonGroupName: row.comparisonGroupName,
          subjectCount: row.subjectCount,
          ratio: row.ratio,
        }) }, { default: () => '查看用户' }),
        h(NButton, { text: true, type: 'primary', onClick: () => { notice.value = `已将「${row.bucketLabel}」保存为用户分群。` } }, { default: () => '存为分群' }),
      ],
    }),
  },
])

const userColumns: DataTableColumns<DistributionUserRecord> = [
  { title: '主体 ID', key: 'subjectId', width: 140 },
  { title: '指标值', key: 'metricValue', width: 100 },
  { title: '分布区间', key: 'bucketLabel', width: 120 },
  { title: '事件次数', key: 'eventCount', width: 100, sorter: 'default' },
  { title: '首次事件时间', key: 'firstEventTime', width: 170 },
  { title: '末次事件时间', key: 'lastEventTime', width: 170 },
  { title: '分组', key: 'groupName', width: 120 },
]

function sortBuckets(buckets: DistributionQueryResponse['buckets']) {
  const copied = [...buckets]
  if (sortBy.value === 'count_desc') return copied.sort((left, right) => right.subjectCount - left.subjectCount)
  if (sortBy.value === 'count_asc') return copied.sort((left, right) => left.subjectCount - right.subjectCount)
  if (sortBy.value === 'ratio_desc') return copied.sort((left, right) => right.ratio - left.ratio)
  if (sortBy.value === 'ratio_asc') return copied.sort((left, right) => left.ratio - right.ratio)
  return copied
}

function getTimePoint(row: DistributionDetailRow, timeBucket: string) {
  return row.timeSeries.find((point) => point.timeBucket === timeBucket) ?? { timeBucket, subjectCount: 0, ratio: 0 }
}

function createFilter(sourceType: FilterSourceType = 'user_tag'): FilterCondition {
  const firstField = getFilterFieldOptions(sourceType)[0]
  const fieldValue = String(firstField?.value ?? 'coin_balance_level')
  return {
    id: `distribution_filter_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    logic: 'AND',
    sourceType,
    field: fieldValue,
    fieldDisplayName: String(firstField?.label ?? '金币余额等级'),
    operator: sourceType === 'behavior' ? 'done' : 'equals',
    value: sourceType === 'behavior' ? 'payment_success' : 'low',
    displayValue: sourceType === 'behavior' ? '过去 7 天做过支付' : '低金币',
    behaviorType: sourceType === 'behavior' ? 'done' : undefined,
    timeWindowDays: sourceType === 'behavior' ? 7 : undefined,
    eventName: sourceType === 'behavior' ? fieldValue : undefined,
  }
}

function getFilterFieldOptions(sourceType: FilterSourceType): SelectOption[] {
  const eventProperties = selectedEvent.value?.properties ?? []
  if (sourceType === 'event_property') {
    return eventProperties
      .filter((property) => property.propertyType === 'event_property')
      .map((property) => ({ label: property.displayName, value: property.propertyName }))
  }
  if (sourceType === 'common_property') {
    return eventProperties
      .filter((property) => property.propertyType === 'common_property')
      .map((property) => ({ label: property.displayName, value: property.propertyName }))
  }
  if (sourceType === 'user_property') {
    return (metadata.value?.eventMetadata.userAttributes ?? []).map((field) => ({
      label: field.displayName,
      value: field.field,
    }))
  }
  if (sourceType === 'user_tag') {
    return (metadata.value?.eventMetadata.userTags ?? []).map((field) => ({
      label: field.displayName,
      value: field.field,
    }))
  }
  if (sourceType === 'segment') {
    return (metadata.value?.eventMetadata.userSegments ?? []).map((segment) => ({
      label: segment.name,
      value: segment.id,
    }))
  }
  if (sourceType === 'behavior') {
    return (metadata.value?.eventMetadata.events ?? []).map((event) => ({
      label: event.displayName,
      value: event.eventName,
    }))
  }
  return [
    { label: '事件发生日标签', value: 'event_day_tag' },
    { label: '最新用户分群', value: 'latest_segment' },
  ]
}

function updateFilterSource(filter: FilterCondition, sourceType: FilterSourceType) {
  const nextFilter = createFilter(sourceType)
  filter.sourceType = sourceType
  filter.field = nextFilter.field
  filter.fieldDisplayName = nextFilter.fieldDisplayName
  filter.operator = nextFilter.operator
  filter.value = nextFilter.value
  filter.displayValue = nextFilter.displayValue
  filter.behaviorType = nextFilter.behaviorType
  filter.timeWindowDays = nextFilter.timeWindowDays
  filter.eventName = nextFilter.eventName
  markDirty()
}

function updateFilterField(filter: FilterCondition, fieldName: string) {
  const option = getFilterFieldOptions(filter.sourceType).find((item) => item.value === fieldName)
  filter.field = fieldName
  filter.fieldDisplayName = String(option?.label ?? fieldName)
  if (filter.sourceType === 'behavior') {
    filter.eventName = fieldName
  }
  markDirty()
}

function updateFilterValue(filter: FilterCondition, value: string) {
  filter.value = value
  filter.displayValue = value
  markDirty()
}

function addChildFilter(filter: FilterCondition) {
  filter.childFilters = [...(filter.childFilters ?? []), createFilter('event_property')]
  markDirty()
}

function removeChildFilter(filter: FilterCondition, childFilterId: string) {
  filter.childFilters = (filter.childFilters ?? []).filter((childFilter) => childFilter.id !== childFilterId)
  markDirty()
}

function formatFilter(filter: FilterCondition) {
  return `${filter.fieldDisplayName} ${filter.operator} ${filter.displayValue}`
}

function markDirty() {
  if (queryState.value !== 'idle') {
    queryState.value = 'dirty'
    notice.value = '配置已修改，请点击开始分析刷新结果。'
  }
}

function handleQuickRange(value: string) {
  quickRange.value = value
  if (value === 'last_7_days') {
    dateRange.value = [dayjs('2026-05-15').valueOf(), dayjs('2026-05-21').valueOf()]
  }
  if (value === 'last_30_days') {
    dateRange.value = [dayjs('2026-04-22').valueOf(), dayjs('2026-05-21').valueOf()]
  }
  if (value === 'last_120_days') {
    dateRange.value = [dayjs('2026-01-22').valueOf(), dayjs('2026-05-21').valueOf()]
  }
  markDirty()
}

function handleChartModeChange(value: DistributionChartMode) {
  chartMode.value = value
  chartType.value = value === 'trend' ? 'stacked_area' : 'bar'
  markDirty()
}

function mapPropertyType(property: EventProperty): DistributionPropertyType {
  return property.dataType
}

function resolveEventType(event: EventDefinition): DistributionMetric['event'] extends infer T
  ? T extends { eventType: infer K }
    ? K
    : never
  : never {
  if (event.eventType === 'virtual') return 'virtual'
  if (event.eventType === 'circle') return 'visual'
  return 'normal'
}

function handleEventChange(eventName: string) {
  const event = metadata.value?.eventMetadata.events.find((item) => item.eventName === eventName)
  if (!event) return
  metric.event = {
    eventName: event.eventName,
    eventDisplayName: event.displayName,
    eventType: resolveEventType(event),
    filters: [],
  }
  metric.propertyName = undefined
  metric.propertyDisplayName = undefined
  metric.propertyType = undefined
  markDirty()
}

function handleAggregatorChange(value: DistributionAggregator) {
  metric.aggregator = value
  if (!needsProperty.value) {
    metric.propertyName = undefined
    metric.propertyDisplayName = undefined
    metric.propertyType = undefined
  }
  if (['FIRST', 'LAST'].includes(value)) {
    bucketConfig.mode = 'enum_values'
  }
  markDirty()
}

function handlePropertyChange(propertyName: string) {
  const property = selectedEvent.value?.properties.find((item) => item.propertyName === propertyName)
  if (!property) return
  metric.propertyName = property.propertyName
  metric.propertyDisplayName = property.displayName
  metric.propertyType = mapPropertyType(property)
  markDirty()
}

function addMetricFilter() {
  if (!metric.event) {
    errorMessage.value = '请先选择分析事件。'
    return
  }
  const filter = createFilter('event_property')
  filter.logic = metric.event.filters.length ? 'AND' : 'AND'
  metric.event.filters.push(filter)
  markDirty()
}

function removeMetricFilter(filterId: string) {
  if (!metric.event) return
  metric.event.filters = metric.event.filters.filter((filter) => filter.id !== filterId)
  markDirty()
}

function addUserFilter() {
  const filter = createFilter('user_tag')
  filter.logic = userFilter.conditions.length ? userFilter.relation : 'AND'
  userFilter.conditions.push(filter)
  markDirty()
}

function removeUserFilter(filterId: string) {
  userFilter.conditions = userFilter.conditions.filter((filter) => filter.id !== filterId)
  markDirty()
}

function addComparisonFilter(group: DistributionComparisonGroup) {
  group.userFilter.conditions.push(createFilter('user_tag'))
  markDirty()
}

function removeComparisonFilter(group: DistributionComparisonGroup, filterId: string) {
  group.userFilter.conditions = group.userFilter.conditions.filter((filter) => filter.id !== filterId)
  markDirty()
}

function addGroupBy() {
  if (comparisonEnabled.value) {
    errorMessage.value = '已开启对照组时，属性分组默认禁用，避免维度过多。'
    return
  }
  if (groupBys.value.length >= 2) {
    errorMessage.value = 'Demo 阶段最多支持 2 个分组。'
    return
  }
  const nextGroup: DistributionGroupBy = {
    ...groupByDraft,
    id: `distribution_group_${Date.now()}`,
  }
  groupBys.value = [...groupBys.value, nextGroup]
  markDirty()
}

function updateGroupByDraft(value: string) {
  const [fieldType, fieldName] = value.split(':')
  const option = groupFieldOptions.find((item) => item.value === value)
  groupByDraft.fieldType = (fieldType ?? 'user_property') as DistributionGroupBy['fieldType']
  groupByDraft.fieldName = fieldName ?? 'channel'
  groupByDraft.displayName = String(option?.label ?? fieldName ?? '渠道')
}

function removeGroupBy(groupId: string) {
  groupBys.value = groupBys.value.filter((group) => group.id !== groupId)
  markDirty()
}

function toggleComparisonGroup(groupId: string, enabled: boolean) {
  comparisonGroups.value = comparisonGroups.value.map((group) => group.id === groupId ? { ...group, enabled } : group)
  if (enabled && groupBys.value.length) {
    groupBys.value = []
    notice.value = '已开启对照组，属性分组已自动清空。'
  }
  markDirty()
}

function removeComparisonGroup(groupId: string) {
  comparisonGroups.value = comparisonGroups.value.filter((group) => group.id !== groupId)
  markDirty()
}

function addComparisonGroup() {
  if (comparisonGroups.value.length >= 10) {
    errorMessage.value = '最多支持 10 个对照组。'
    return
  }
  comparisonGroups.value = [
    ...comparisonGroups.value,
    {
      id: `distribution_compare_${Date.now()}`,
      name: `对照组 ${comparisonGroups.value.length + 1}`,
      color: '#2080f0',
      enabled: true,
      userFilter: {
        relation: 'AND',
        conditions: [
          {
            id: `distribution_compare_filter_${Date.now()}`,
            logic: 'AND',
            sourceType: 'user_property',
            field: 'channel',
            fieldDisplayName: '渠道',
            operator: 'equals',
            value: 'natural',
            displayValue: '自然量',
          },
        ],
      },
    },
  ]
  if (groupBys.value.length) {
    groupBys.value = []
  }
  markDirty()
}

function addRange() {
  const index = bucketConfig.ranges.length
  bucketConfig.ranges.push({
    id: `custom_range_${Date.now()}`,
    label: `${index * 10}-${index * 10 + 9}`,
    min: index * 10,
    max: index * 10 + 9,
    leftClosed: true,
    rightClosed: true,
  })
  markDirty()
}

function restorePresetRanges() {
  bucketConfig.mode = 'preset_frequency'
  bucketConfig.ranges = presetFrequencyRanges.map((range) => ({ ...range }))
  notice.value = '已恢复预置频次分组。'
  markDirty()
}

function validateRangesNow() {
  const error = validateCustomRanges()
  if (error) {
    errorMessage.value = error
    return
  }
  notice.value = '区间校验通过。'
}

function removeRange(rangeId: string) {
  bucketConfig.ranges = bucketConfig.ranges.filter((range) => range.id !== rangeId)
  markDirty()
}

function validateCustomRanges(): string {
  if (bucketConfig.mode !== 'custom_ranges') return ''
  const ranges = [...bucketConfig.ranges].sort((left, right) => (left.min ?? Number.NEGATIVE_INFINITY) - (right.min ?? Number.NEGATIVE_INFINITY))
  const labels = new Set<string>()

  for (let index = 0; index < ranges.length; index += 1) {
    const range = ranges[index]
    if (!range) continue
    if (!range.label.trim()) return '区间名称不能为空。'
    if (labels.has(range.label)) return '区间名称重复，请调整。'
    labels.add(range.label)
    if (range.min !== undefined && range.max !== undefined && range.min >= range.max) {
      return '区间左边界必须小于右边界。'
    }

    const nextRange = ranges[index + 1]
    if (nextRange?.min !== undefined && range.max !== undefined && range.max > nextRange.min) {
      return '分布区间存在重叠，请调整。'
    }
  }

  return ''
}

function validateConfig(): boolean {
  errorMessage.value = ''
  if (!metric.event) {
    errorMessage.value = '请选择分析事件。'
    return false
  }
  if (!metric.aggregator) {
    errorMessage.value = '请选择计算方式。'
    return false
  }
  if (needsProperty.value && !metric.propertyName) {
    errorMessage.value = '当前计算方式需要选择事件属性。'
    return false
  }
  if (metric.event?.filters.some((filter) => !filter.field || !filter.operator || filter.value === '')) {
    errorMessage.value = '请完善事件过滤条件。'
    return false
  }
  if (userFilter.conditions.some((filter) => !filter.field || !filter.operator || filter.value === '')) {
    errorMessage.value = '请完善用户筛选条件。'
    return false
  }
  if (['FIRST', 'LAST'].includes(metric.aggregator) && bucketConfig.mode !== 'enum_values') {
    errorMessage.value = '非数值结果仅支持枚举值分布，请切换分组方式。'
    return false
  }
  if (bucketConfig.mode === 'custom_equal_width') {
    if ((bucketConfig.end ?? 0) <= (bucketConfig.start ?? 0)) {
      errorMessage.value = '自定义等宽分组的结束值必须大于起始值。'
      return false
    }
    if ((bucketConfig.width ?? 0) <= 0) {
      errorMessage.value = '自定义等宽分组的组距必须大于 0。'
      return false
    }
  }
  if (bucketConfig.mode === 'custom_ranges' && bucketConfig.ranges.length === 0) {
    errorMessage.value = '请至少配置一个自定义区间。'
    return false
  }
  const customRangeError = validateCustomRanges()
  if (customRangeError) {
    errorMessage.value = customRangeError
    return false
  }
  if (!dateRange.value) {
    errorMessage.value = '请选择查询时间。'
    return false
  }
  const rangeDays = dayjs(dateRange.value[1]).diff(dayjs(dateRange.value[0]), 'day') + 1
  if (rangeDays > 120) {
    errorMessage.value = '当前最多支持查询 120 天。'
    return false
  }
  return true
}

function buildQueryConfig(): DistributionQueryRequest {
  return {
    projectId: 'demo_project',
    subjectType: subjectType.value,
    timezone: timezone.value,
    metric: {
      event: metric.event ? { ...metric.event, filters: metric.event.filters.map((filter) => ({ ...filter })) } : undefined,
      aggregator: metric.aggregator,
      propertyName: metric.propertyName,
      propertyDisplayName: metric.propertyDisplayName,
      propertyType: metric.propertyType,
    },
    bucketConfig: { ...bucketConfig, ranges: bucketConfig.ranges.map((range) => ({ ...range })) },
    userFilter: { ...userFilter, conditions: userFilter.conditions.map((filter) => ({ ...filter })) },
    groupBys: groupBys.value.map((group) => ({ ...group })),
    comparisonGroups: comparisonGroups.value.map((group) => ({
      ...group,
      userFilter: { ...group.userFilter, conditions: group.userFilter.conditions.map((filter) => ({ ...filter })) },
    })),
    timeRange: {
      startDate: dayjs(dateRange.value[0]).format('YYYY-MM-DD'),
      endDate: dayjs(dateRange.value[1]).format('YYYY-MM-DD'),
      granularity: granularity.value,
    },
    chartMode: chartMode.value,
    chartType: chartType.value,
    showRatio: showRatio.value,
    showCount: showCount.value,
    sortBy: sortBy.value,
  }
}

function openUserDrawer(context: DistributionDrilldownContext) {
  selectedDrilldown.value = context
  showUserDrawer.value = true
}

interface ChartClickPayload {
  name?: string
  seriesName?: string
  data?: {
    name?: string
    value?: number
  }
}

function handleChartClick(payload: unknown) {
  if (!result.value) return
  const chartPayload = payload as ChartClickPayload
  const bucketLabel = chartMode.value === 'trend'
    ? chartPayload.seriesName
    : chartPayload.name ?? chartPayload.data?.name
  if (!bucketLabel) return
  const bucket = result.value.buckets.find((item) => item.bucketLabel === bucketLabel)
  if (!bucket) return
  openUserDrawer({
    bucketLabel: bucket.bucketLabel,
    groupName: bucket.groupName,
    comparisonGroupName: bucket.comparisonGroupName ?? '-',
    subjectCount: bucket.subjectCount,
    ratio: bucket.ratio,
  })
}

async function runAnalysis() {
  queryState.value = 'validating'
  if (!validateConfig()) {
    queryState.value = 'error'
    return
  }
  loading.value = true
  queryState.value = 'loading'
  try {
    result.value = await distributionAnalysisService.runAnalysis(buildQueryConfig())
    queryState.value = result.value.details.length ? 'success' : 'empty'
    notice.value = `分析完成，已生成 ${result.value.details.length} 条分布明细。`
  } catch {
    queryState.value = 'error'
    errorMessage.value = '查询失败，请稍后重试。'
  } finally {
    loading.value = false
  }
}

async function saveAnalysis() {
  if (!validateConfig()) return
  showSaveAnalysisModal.value = false
  const response = await distributionAnalysisService.saveAnalysis({
    name: saveAnalysisForm.name || `${metric.event?.eventDisplayName ?? '未命名'}分布分析`,
    description: saveAnalysisForm.description || '保存分布分析查询配置，可恢复指标、筛选、分组和图表状态。',
    tags: saveAnalysisForm.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    queryConfig: buildQueryConfig(),
  })
  notice.value = response.message
}

async function saveToDashboard() {
  if (!validateConfig()) return
  showSaveDashboardModal.value = false
  const response = await distributionAnalysisService.saveWidgetToDashboard({
    widgetName: dashboardForm.widgetName || `${metric.event?.eventDisplayName ?? '未命名'}分布图`,
    widgetType: chartMode.value === 'trend' ? 'distribution_trend' : chartType.value === 'pie' || chartType.value === 'donut' ? 'distribution_pie' : 'distribution_group',
    queryConfig: buildQueryConfig(),
  })
  notice.value = response.message
}

function resetConfig() {
  metric.event = undefined
  metric.aggregator = undefined
  metric.propertyName = undefined
  metric.propertyDisplayName = undefined
  metric.propertyType = undefined
  bucketConfig.mode = 'sturges_auto'
  bucketConfig.includeNullBucket = false
  userFilter.conditions = []
  groupBys.value = []
  result.value = null
  queryState.value = 'idle'
  notice.value = ''
  errorMessage.value = ''
}

async function loadInitialData() {
  metadataLoading.value = true
  try {
    const [meta, filter, groups, comparisons] = await Promise.all([
      distributionAnalysisService.getMetadata(),
      distributionAnalysisService.getDefaultUserFilter(),
      distributionAnalysisService.getDefaultGroupBys(),
      distributionAnalysisService.getDefaultComparisonGroups(),
    ])
    metadata.value = meta
    userFilter.relation = filter.relation
    userFilter.conditions = filter.conditions
    groupBys.value = groups
    comparisonGroups.value = comparisons
  } finally {
    metadataLoading.value = false
  }
}

onMounted(() => {
  loadInitialData()
})
</script>

<template>
  <div class="distribution-analysis-page">
    <div class="page-header">
      <div>
        <h1>分布分析</h1>
        <p>按主体聚合事件或属性指标，观察用户在不同数值区间、枚举值和分组下的分布情况。</p>
      </div>
      <n-space>
        <n-button @click="showSaveAnalysisModal = true">保存分析</n-button>
        <n-button @click="showSaveDashboardModal = true">保存到看板</n-button>
        <n-button @click="notice = '已生成导出任务：分布分析结果.xlsx。'">导出 Excel</n-button>
        <n-button @click="resetConfig">重置</n-button>
        <n-button type="primary" :loading="loading" @click="runAnalysis">开始分析</n-button>
      </n-space>
    </div>

    <n-alert v-if="notice" type="success" closable class="page-alert" @close="notice = ''">
      {{ notice }}
    </n-alert>
    <n-alert v-if="errorMessage" type="error" closable class="page-alert" @close="errorMessage = ''">
      {{ errorMessage }}
    </n-alert>

    <div class="analysis-layout">
      <div class="config-panel">
        <n-spin :show="metadataLoading">
          <n-card title="1. 指标配置" size="small">
            <div class="form-grid">
              <span>识别主体</span>
              <n-select v-model:value="subjectType" :options="subjectOptions" @update:value="markDirty" />

              <span>事件名称</span>
              <n-select
                :value="metric.event?.eventName"
                filterable
                clearable
                placeholder="搜索事件名称 / 显示名"
                :options="eventOptions"
                @update:value="(value) => value && handleEventChange(String(value))"
              />

              <span>计算方式</span>
              <n-select
                :value="metric.aggregator"
                placeholder="请选择算子"
                :options="aggregatorOptions"
                @update:value="(value) => handleAggregatorChange(value as DistributionAggregator)"
              />

              <span v-if="needsProperty">事件属性</span>
              <n-select
                v-if="needsProperty"
                :value="metric.propertyName"
                filterable
                placeholder="请选择属性"
                :options="propertyOptions"
                @update:value="(value) => value && handlePropertyChange(String(value))"
              />
            </div>

            <div class="section-line">
              <span>事件过滤</span>
              <n-button size="small" @click="addMetricFilter">+ 添加过滤</n-button>
            </div>
            <div v-if="metric.event?.filters.length" class="filter-editor">
              <div
                v-for="(filter, index) in metric.event.filters"
                :key="filter.id"
                class="filter-block"
              >
                <div class="filter-row">
                  <div class="logic-cell">
                    <n-select
                      v-if="index > 0"
                      v-model:value="filter.logic"
                      class="logic-select"
                      :options="[{ label: 'AND', value: 'AND' }, { label: 'OR', value: 'OR' }]"
                      @update:value="markDirty"
                    />
                  </div>
                  <n-select :value="filter.sourceType" :options="filterSourceOptions" @update:value="(value) => updateFilterSource(filter, value as FilterSourceType)" />
                  <n-select :value="filter.field" filterable :options="getFilterFieldOptions(filter.sourceType)" @update:value="(value) => updateFilterField(filter, String(value))" />
                  <n-select v-model:value="filter.operator" :options="filterOperatorOptions" @update:value="markDirty" />
                  <n-input :value="String(filter.value)" placeholder="值" @update:value="(value) => updateFilterValue(filter, value)" />
                  <n-button text type="primary" @click="addChildFilter(filter)">二级</n-button>
                  <n-button text type="error" @click="removeMetricFilter(filter.id)">删除</n-button>
                </div>
                <div v-if="filter.childFilters?.length" class="child-filter-list">
              <div v-for="childFilter in filter.childFilters" :key="childFilter.id" class="filter-row child-filter-row">
                    <div class="logic-cell">
                      <n-select
                        v-model:value="childFilter.logic"
                        class="logic-select"
                        :options="[{ label: 'AND', value: 'AND' }, { label: 'OR', value: 'OR' }]"
                        @update:value="markDirty"
                      />
                    </div>
                    <n-select :value="childFilter.sourceType" :options="filterSourceOptions" @update:value="(value) => updateFilterSource(childFilter, value as FilterSourceType)" />
                    <n-select :value="childFilter.field" filterable :options="getFilterFieldOptions(childFilter.sourceType)" @update:value="(value) => updateFilterField(childFilter, String(value))" />
                    <n-select v-model:value="childFilter.operator" :options="filterOperatorOptions" @update:value="markDirty" />
                    <n-input :value="String(childFilter.value)" placeholder="值" @update:value="(value) => updateFilterValue(childFilter, value)" />
                    <n-button text type="error" @click="removeChildFilter(filter, childFilter.id)">删除</n-button>
                  </div>
                </div>
              </div>
            </div>
            <n-text v-else depth="3">未配置事件过滤。</n-text>
          </n-card>

          <n-card title="2. 分布区间" size="small">
            <div class="form-grid">
              <span>分组方式</span>
              <n-select
                v-model:value="bucketConfig.mode"
                :options="bucketModeOptions"
                @update:value="markDirty"
              />

              <template v-if="bucketConfig.mode === 'equal_width'">
                <span>分组数</span>
                <n-select
                  v-model:value="bucketConfig.bucketCount"
                  :options="[
                    { label: '5 组', value: 5 },
                    { label: '10 组', value: 10 },
                    { label: '15 组', value: 15 },
                  ]"
                  @update:value="markDirty"
                />
              </template>

              <template v-if="bucketConfig.mode === 'custom_equal_width'">
                <span>起始 / 结束</span>
                <n-space>
                  <n-input-number v-model:value="bucketConfig.start" size="small" @update:value="markDirty" />
                  <n-input-number v-model:value="bucketConfig.end" size="small" @update:value="markDirty" />
                </n-space>
                <span>组距</span>
                <n-input-number v-model:value="bucketConfig.width" size="small" @update:value="markDirty" />
              </template>
            </div>

            <div v-if="bucketConfig.mode === 'custom_ranges'" class="range-list">
              <div v-for="range in bucketConfig.ranges" :key="range.id" class="range-row">
                <n-input v-model:value="range.label" size="small" placeholder="区间名称" @update:value="markDirty" />
                <n-input-number v-model:value="range.min" size="small" @update:value="markDirty" />
                <n-input-number v-model:value="range.max" size="small" @update:value="markDirty" />
                <n-button text type="error" @click="removeRange(range.id)">删除</n-button>
              </div>
              <n-space>
                <n-button @click="addRange">添加区间</n-button>
                <n-button @click="validateRangesNow">校验区间</n-button>
              </n-space>
            </div>

            <div class="switch-row">
              <span>包含空值桶</span>
              <n-switch v-model:value="bucketConfig.includeNullBucket" @update:value="markDirty" />
            </div>
            <n-button block class="section-action" @click="restorePresetRanges">恢复预置频次分组</n-button>
          </n-card>

          <n-card title="3. 用户筛选 / 分组 / 对照" size="small">
            <div class="section-line">
              <span>用户筛选</span>
              <n-space>
                <n-button size="small" @click="addUserFilter">+ 添加筛选</n-button>
              </n-space>
            </div>
            <div v-if="userFilter.conditions.length" class="filter-editor">
              <div
                v-for="(filter, index) in userFilter.conditions"
                :key="filter.id"
                class="filter-block"
              >
                <div class="filter-row">
                  <div class="logic-cell">
                    <n-select
                      v-if="index > 0"
                      v-model:value="filter.logic"
                      class="logic-select"
                      :options="[{ label: 'AND', value: 'AND' }, { label: 'OR', value: 'OR' }]"
                      @update:value="markDirty"
                    />
                  </div>
                  <n-select :value="filter.sourceType" :options="filterSourceOptions" @update:value="(value) => updateFilterSource(filter, value as FilterSourceType)" />
                  <n-select :value="filter.field" filterable :options="getFilterFieldOptions(filter.sourceType)" @update:value="(value) => updateFilterField(filter, String(value))" />
                  <n-select v-model:value="filter.operator" :options="filterOperatorOptions" @update:value="markDirty" />
                  <n-input :value="String(filter.value)" placeholder="值" @update:value="(value) => updateFilterValue(filter, value)" />
                  <n-button text type="primary" @click="addChildFilter(filter)">二级</n-button>
                  <n-button text type="error" @click="removeUserFilter(filter.id)">删除</n-button>
                </div>
                <div class="filter-summary">{{ formatFilter(filter) }}</div>
                <div v-if="filter.childFilters?.length" class="child-filter-list">
              <div v-for="childFilter in filter.childFilters" :key="childFilter.id" class="filter-row child-filter-row">
                    <div class="logic-cell">
                      <n-select
                        v-model:value="childFilter.logic"
                        class="logic-select"
                        :options="[{ label: 'AND', value: 'AND' }, { label: 'OR', value: 'OR' }]"
                        @update:value="markDirty"
                      />
                    </div>
                    <n-select :value="childFilter.sourceType" :options="filterSourceOptions" @update:value="(value) => updateFilterSource(childFilter, value as FilterSourceType)" />
                    <n-select :value="childFilter.field" filterable :options="getFilterFieldOptions(childFilter.sourceType)" @update:value="(value) => updateFilterField(childFilter, String(value))" />
                    <n-select v-model:value="childFilter.operator" :options="filterOperatorOptions" @update:value="markDirty" />
                    <n-input :value="String(childFilter.value)" placeholder="值" @update:value="(value) => updateFilterValue(childFilter, value)" />
                    <n-button text type="error" @click="removeChildFilter(filter, childFilter.id)">删除</n-button>
                  </div>
                </div>
              </div>
            </div>
            <n-text v-else depth="3">当前分析全部用户。</n-text>

            <div class="section-line">
              <span>属性分组</span>
              <n-space>
                <n-select
                  class="group-field-select"
                  :value="`${groupByDraft.fieldType}:${groupByDraft.fieldName}`"
                  :options="groupFieldOptions"
                  filterable
                  :disabled="comparisonEnabled"
                  @update:value="(value) => updateGroupByDraft(String(value))"
                />
                <n-select
                  v-model:value="groupByDraft.valueLimit"
                  class="topn-select"
                  size="small"
                  :options="groupValueLimitOptions"
                  :disabled="comparisonEnabled"
                  @update:value="markDirty"
                />
                <n-button size="small" :disabled="comparisonEnabled" @click="addGroupBy">+ 添加分组</n-button>
              </n-space>
            </div>
            <div v-if="groupBys.length" class="plain-list">
              <div v-for="group in groupBys" :key="group.id" class="plain-row">
                <span>{{ group.displayName }} · Top {{ group.valueLimit }}</span>
                <n-button text type="error" @click="removeGroupBy(group.id)">删除</n-button>
              </div>
            </div>
            <n-text v-else depth="3">未配置属性分组。</n-text>

            <div class="section-line">
              <span>对照组</span>
              <n-button size="small" @click="addComparisonGroup">+ 添加对照组</n-button>
            </div>
            <div class="plain-list">
              <div v-for="group in comparisonGroups" :key="group.id" class="comparison-card">
                <div class="comparison-header">
                  <n-input v-model:value="group.name" size="small" @update:value="markDirty" />
                  <n-switch :value="group.enabled" @update:value="(enabled) => toggleComparisonGroup(group.id, enabled)" />
                  <n-button size="small" @click="addComparisonFilter(group)">+ 条件</n-button>
                  <n-button text type="error" @click="removeComparisonGroup(group.id)">删除</n-button>
                </div>
                <div class="comparison-filter-list">
                  <div v-for="(filter, filterIndex) in group.userFilter.conditions" :key="filter.id" class="filter-row comparison-filter-row">
                    <div class="logic-cell">
                      <n-select
                        v-if="filterIndex > 0"
                        v-model:value="filter.logic"
                        class="logic-select"
                        :options="[{ label: 'AND', value: 'AND' }, { label: 'OR', value: 'OR' }]"
                        @update:value="markDirty"
                      />
                    </div>
                    <n-select :value="filter.sourceType" :options="filterSourceOptions" @update:value="(value) => updateFilterSource(filter, value as FilterSourceType)" />
                    <n-select :value="filter.field" filterable :options="getFilterFieldOptions(filter.sourceType)" @update:value="(value) => updateFilterField(filter, String(value))" />
                    <n-select v-model:value="filter.operator" :options="filterOperatorOptions" @update:value="markDirty" />
                    <n-input :value="String(filter.value)" placeholder="值" @update:value="(value) => updateFilterValue(filter, value)" />
                    <n-button text type="error" @click="removeComparisonFilter(group, filter.id)">删除</n-button>
                  </div>
                </div>
              </div>
            </div>
          </n-card>

          <n-card title="4. 时间与图表" size="small">
            <div class="form-grid">
              <span>快捷时间</span>
              <n-select :value="quickRange" :options="quickRangeOptions" @update:value="(value) => handleQuickRange(String(value))" />
              <span>时间范围</span>
              <n-date-picker v-model:value="dateRange" type="daterange" @update:value="markDirty" />
              <span>时间粒度</span>
              <n-select v-model:value="granularity" :options="granularityOptions" @update:value="markDirty" />
              <span>图表模式</span>
              <n-select :value="chartMode" :options="chartModeOptions" @update:value="(value) => handleChartModeChange(value as DistributionChartMode)" />
              <span>图表类型</span>
              <n-select v-model:value="chartType" :options="chartTypeOptions" @update:value="markDirty" />
              <span>排序</span>
              <n-select v-model:value="sortBy" :options="sortOptions" @update:value="markDirty" />
            </div>
            <div class="switch-row">
              <span>展示占比</span>
              <n-switch v-model:value="showRatio" @update:value="markDirty" />
            </div>
            <div class="switch-row">
              <span>展示人数</span>
              <n-switch v-model:value="showCount" @update:value="markDirty" />
            </div>
          </n-card>
        </n-spin>
      </div>

      <div class="result-panel">
        <div class="status-row">
          <n-tag :type="queryState === 'success' ? 'success' : queryState === 'dirty' ? 'warning' : queryState === 'error' ? 'error' : 'default'">
            查询状态：{{ queryState }}
          </n-tag>
          <n-button :loading="loading" @click="runAnalysis">刷新分析</n-button>
        </div>

        <div class="summary-grid">
          <n-card v-for="card in summaryCards" :key="card.label" size="small">
            <n-statistic :label="card.label" :value="card.value" />
            <p>{{ card.description }}</p>
          </n-card>
        </div>

        <n-card class="chart-card" size="small">
          <template #header>
            <div class="card-header">
              <div>
                <strong>{{ metric.event?.eventDisplayName ?? '分布分析结果' }}</strong>
                <p>
                  {{ chartMode === 'trend' ? '趋势图' : '分组图' }} · {{ metric.aggregator ?? '未选择算子' }} · {{ granularity }} 粒度 ·
                  {{ groupBys.length }} 个分组 · {{ comparisonGroups.filter((group) => group.enabled).length }} 个对照组
                </p>
              </div>
              <n-space>
                <n-tag v-if="showRatio">占比</n-tag>
                <n-tag v-if="showCount">主体数</n-tag>
              </n-space>
            </div>
          </template>

          <n-spin :show="loading">
            <v-chart v-if="result" class="distribution-chart" :option="chartOption" autoresize @click="handleChartClick" />
            <n-empty v-else description="请选择分析事件和计算方式后开始分布分析" class="empty-result">
              <template #extra>
                <n-button type="primary" @click="runAnalysis">选择分析事件后开始分析</n-button>
              </template>
            </n-empty>
          </n-spin>
        </n-card>

        <n-card title="详细数据" size="small">
          <n-data-table
            v-if="result"
            :columns="detailColumns"
            :data="result.details"
            :pagination="{ pageSize: 10 }"
            :row-key="(row) => row.key"
            :scroll-x="1220"
            default-expand-all
          />
          <n-empty v-else description="暂无明细数据，请先发起分布分析。" />
        </n-card>
      </div>
    </div>

    <n-drawer v-model:show="showUserDrawer" :width="760">
      <n-drawer-content title="分布命中主体列表">
        <div v-if="selectedDrilldown" class="drawer-summary">
          <n-statistic label="分布区间" :value="selectedDrilldown.bucketLabel" />
          <n-statistic label="命中主体" :value="selectedDrilldown.subjectCount.toLocaleString()" />
          <n-statistic label="占比" :value="`${selectedDrilldown.ratio}%`" />
          <n-statistic label="时间" :value="selectedDrilldown.timeBucket ?? '全周期'" />
        </div>
        <n-data-table
          :columns="userColumns"
          :data="userDrawerRows"
          :pagination="{ pageSize: 8 }"
          :scroll-x="920"
        />
        <template #footer>
          <n-space justify="end">
            <n-button @click="notice = '已创建用户 ID 导出任务。'">导出用户 ID</n-button>
            <n-button type="primary" @click="notice = '已保存为静态用户分群。'">保存为用户分群</n-button>
          </n-space>
        </template>
      </n-drawer-content>
    </n-drawer>

    <n-modal v-model:show="showSaveAnalysisModal" preset="card" title="保存分析" class="compact-modal">
      <div class="modal-form">
        <label>分析名称</label>
        <n-input v-model:value="saveAnalysisForm.name" placeholder="未命名分布分析" />
        <label>保存位置</label>
        <n-select
          v-model:value="saveAnalysisForm.folder"
          :options="[
            { label: '个人空间 / 我的分析', value: '个人空间 / 我的分析' },
            { label: '团队空间 / 运营分析', value: '团队空间 / 运营分析' },
          ]"
        />
        <label>描述</label>
        <n-input v-model:value="saveAnalysisForm.description" type="textarea" placeholder="补充分析目的" />
        <label>标签</label>
        <n-input v-model:value="saveAnalysisForm.tags" placeholder="多个标签用逗号分隔" />
        <label>时间范围保存方式</label>
        <n-radio-group v-model:value="saveAnalysisForm.timeMode">
          <n-radio-button value="relative">相对时间</n-radio-button>
          <n-radio-button value="fixed">固定时间</n-radio-button>
        </n-radio-group>
        <div class="switch-row">
          <span>设为常用</span>
          <n-switch v-model:value="saveAnalysisForm.favorite" />
        </div>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showSaveAnalysisModal = false">取消</n-button>
          <n-button type="primary" @click="saveAnalysis">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showSaveDashboardModal" preset="card" title="保存到看板" class="compact-modal">
      <div class="modal-form">
        <label>图表名称</label>
        <n-input v-model:value="dashboardForm.widgetName" placeholder="分布趋势图" />
        <label>目标看板</label>
        <n-select
          v-model:value="dashboardForm.dashboard"
          :options="[
            { label: '个人空间 / 数据概览', value: '个人空间 / 数据概览' },
            { label: '团队空间 / 用户行为监控', value: '团队空间 / 用户行为监控' },
          ]"
        />
        <label>刷新方式</label>
        <n-select
          v-model:value="dashboardForm.refreshPolicy"
          :options="[
            { label: '打开看板时刷新', value: 'open' },
            { label: '每小时刷新', value: 'hourly' },
            { label: '每日刷新', value: 'daily' },
          ]"
        />
        <div class="switch-row">
          <span>继承看板权限</span>
          <n-switch v-model:value="dashboardForm.inheritPermission" />
        </div>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showSaveDashboardModal = false">取消</n-button>
          <n-button type="primary" @click="saveToDashboard">保存</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<style scoped>
.distribution-analysis-page {
  min-height: 100%;
  padding: 24px;
  background: #f3f6fa;
}

.page-header {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 18px;
}

.page-header h1 {
  margin: 0 0 8px;
  color: #111827;
  font-size: 30px;
  line-height: 1.25;
}

.page-header p,
.chart-card p,
.summary-grid p {
  margin: 0;
  color: #667085;
}

.page-alert {
  margin-bottom: 14px;
}

.analysis-layout {
  display: grid;
  grid-template-columns: 520px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.config-panel,
.result-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.config-panel {
  max-height: calc(100vh - 170px);
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
}

.form-grid {
  display: grid;
  grid-template-columns: 86px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
}

.form-grid > span,
.section-line > span,
.switch-row > span {
  color: #344054;
  font-weight: 700;
}

.hint-box {
  display: grid;
  gap: 4px;
  margin-top: 12px;
  padding: 10px 12px;
  border: 1px solid #d0ebdd;
  border-radius: 6px;
  background: #f0fbf5;
  color: #344054;
}

.section-line,
.switch-row,
.plain-row,
.range-row,
.status-row,
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.section-line {
  margin-top: 16px;
  flex-wrap: wrap;
}

.switch-row {
  margin-top: 12px;
}

.tag-list {
  margin-top: 10px;
}

.filter-editor {
  display: grid;
  gap: 10px;
  margin-top: 10px;
}

.filter-block {
  padding: 10px;
  border: 1px solid #e4e7ec;
  border-radius: 6px;
  background: #f9fafb;
  overflow: visible;
}

.filter-row {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;
  align-items: center;
}

.child-filter-list {
  display: grid;
  gap: 8px;
  margin-top: 8px;
  padding-left: 14px;
  border-left: 2px solid #d0ebdd;
}

.child-filter-row {
  grid-template-columns: 76px minmax(0, 1fr) minmax(0, 1fr);
}

.filter-summary {
  margin-top: 6px;
  color: #667085;
  font-size: 12px;
}

.logic-select {
  width: 76px;
}

.logic-cell {
  min-height: 34px;
}

.small-select {
  width: 88px;
}

.group-field-select {
  width: 180px;
}

.topn-select {
  width: 96px;
}

.comparison-card {
  display: grid;
  gap: 10px;
  padding: 10px;
  border: 1px solid #e4e7ec;
  border-radius: 6px;
  background: #f9fafb;
}

.comparison-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto auto;
  gap: 8px;
  align-items: center;
}

.comparison-filter-list {
  display: grid;
  gap: 8px;
}

.comparison-filter-row {
  grid-template-columns: 76px minmax(0, 1fr) minmax(0, 1fr);
}

.plain-list,
.range-list {
  display: grid;
  gap: 8px;
  margin-top: 10px;
}

.plain-row,
.range-row {
  min-height: 38px;
  padding: 8px 10px;
  border: 1px solid #e4e7ec;
  border-radius: 6px;
  background: #f9fafb;
}

.range-row {
  display: grid;
  grid-template-columns: minmax(90px, 1fr) 88px 88px auto;
}

.section-action {
  margin-top: 12px;
}

.status-row {
  justify-content: flex-end;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.summary-grid :deep(.n-card) {
  min-height: 130px;
}

.chart-card {
  min-height: 430px;
}

.distribution-chart {
  width: 100%;
  height: 360px;
}

.empty-result {
  min-height: 320px;
  justify-content: center;
}

.drawer-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.compact-modal {
  width: 560px;
}

.modal-form {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
}

.modal-form label {
  color: #344054;
  font-weight: 700;
}

@media (max-width: 1280px) {
  .analysis-layout {
    grid-template-columns: 1fr;
  }

  .config-panel {
    max-height: none;
  }

  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
