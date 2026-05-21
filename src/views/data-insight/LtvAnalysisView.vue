<script setup lang="ts">
import '@/components/charts/chartRegister'
import type { EChartsOption } from 'echarts'
import dayjs from 'dayjs'
import {
  NAlert,
  NButton,
  NCard,
  NCheckbox,
  NDataTable,
  NDatePicker,
  NDrawer,
  NDrawerContent,
  NEmpty,
  NInput,
  NInputNumber,
  NModal,
  NSelect,
  NSpace,
  NSpin,
  NSwitch,
  NTag,
  NTooltip,
} from 'naive-ui'
import type { DataTableColumns, SelectOption } from 'naive-ui'
import { computed, h, onMounted, reactive, ref } from 'vue'
import VChart from 'vue-echarts'
import { createDefaultLtvQuery } from '@/mock/ltvAnalysis'
import { ltvAnalysisService } from '@/services/ltvAnalysisService'
import type {
  LtvAdRevenueMetric,
  LtvDetailRow,
  LtvDrilldownContext,
  LtvGroupByConfig,
  LtvIapRevenueMetric,
  LtvMetadata,
  LtvQueryRequest,
  LtvQueryResponse,
  LtvQueryState,
  LtvRevenueBreakdownRecord,
  LtvRevenueMetric,
  LtvUserRecord,
  LtvWindowConfig,
} from '@/types/ltvAnalysis'
import type { EventProperty, FilterCondition, FilterSourceType } from '@/types/eventAnalysis'

type DateRangeValue = [number, number]

const dateFormat = 'YYYY-MM-DD'

interface SummaryCard {
  label: string
  value: string
  note: string
}

const metadata = ref<LtvMetadata | null>(null)
const loading = ref(false)
const metadataLoading = ref(false)
const queryState = ref<LtvQueryState>('idle')
const notice = ref('')
const errorMessage = ref('')
const result = ref<LtvQueryResponse | null>(null)
const query = reactive<LtvQueryRequest>(createDefaultLtvQuery())
const customDateRange = ref<DateRangeValue>([
  dayjs(query.timeRange.startDate).valueOf(),
  dayjs(query.timeRange.endDate).valueOf(),
])

const showUserDrawer = ref(false)
const showRevenueDrawer = ref(false)
const showSaveAnalysisModal = ref(false)
const showDashboardModal = ref(false)
const users = ref<LtvUserRecord[]>([])
const revenueBreakdown = ref<LtvRevenueBreakdownRecord[]>([])
const drilldownTitle = ref('')

const saveAnalysisForm = reactive({
  name: '广告获客用户 LTV 分析',
  folder: '个人空间 / 我的分析',
  description: '保存起始事件、收入指标、筛选、对照组、窗口和图表状态。',
  tags: 'LTV,广告获客,收入分析',
})

const dashboardForm = reactive({
  widgetName: '广告获客 LTV 趋势图',
  dashboardPath: '个人空间 / 收入看板',
  widgetType: 'ltv_trend' as 'ltv_trend' | 'ltv_compare' | 'ltv_table',
})

const userSearch = ref('')

const subjectOptions: SelectOption[] = [
  { label: '用户 ID', value: 'user_id' },
  { label: '设备 ID', value: 'device_id' },
  { label: '账号 ID', value: 'account_id' },
  { label: '匿名 ID', value: 'anonymous_id' },
  { label: '自定义主体', value: 'custom_id' },
]

const dedupOptions: SelectOption[] = [
  { label: '每日去重', value: 'once_per_day' },
  { label: '仅首次进入', value: 'first_time_only' },
]

const quickRangeOptions: SelectOption[] = [
  { label: '今天', value: 'today' },
  { label: '昨天', value: 'yesterday' },
  { label: '过去 7 天', value: 'last_7_days' },
  { label: '过去 14 天', value: 'last_14_days' },
  { label: '过去 30 天', value: 'last_30_days' },
  { label: '自定义', value: 'custom' },
]

const timezoneOptions: SelectOption[] = [
  { label: 'UTC+8 北京时间', value: 'UTC+8 北京时间' },
  { label: 'UTC+1 欧洲中部时间', value: 'UTC+1 欧洲中部时间' },
]

const filterSourceOptions: SelectOption[] = [
  { label: '事件属性', value: 'event_property' },
  { label: '公共属性', value: 'common_property' },
  { label: '用户属性', value: 'user_property' },
  { label: '用户标签', value: 'user_tag' },
  { label: '用户分群', value: 'segment' },
]

const operatorOptions: SelectOption[] = [
  { label: '等于', value: 'equals' },
  { label: '不等于', value: 'not_equals' },
  { label: '属于', value: 'in' },
  { label: '不属于', value: 'not_in' },
  { label: '大于', value: 'gt' },
  { label: '大于等于', value: 'gte' },
  { label: '小于', value: 'lt' },
  { label: '小于等于', value: 'lte' },
  { label: '包含', value: 'contains' },
  { label: '正则匹配', value: 'regex' },
]

const relationOptions: SelectOption[] = [
  { label: 'AND', value: 'AND' },
  { label: 'OR', value: 'OR' },
]

const missingEcpmOptions: SelectOption[] = [
  { label: '缺失时报错', value: 'ERROR' },
  { label: '缺失填 0', value: 'FILL_ZERO' },
  { label: '沿用前一日', value: 'USE_PREVIOUS' },
]

const incompleteWindowOptions: SelectOption[] = [
  { label: '展示部分值并提示', value: 'SHOW_WITH_WARNING' },
  { label: '展示部分值', value: 'SHOW_PARTIAL' },
  { label: '空值展示', value: 'SHOW_EMPTY' },
]

const chartModeOptions: SelectOption[] = [
  { label: '趋势图', value: 'TREND' },
  { label: '窗口对比', value: 'COMPARE' },
]

const trendObjectOptions: SelectOption[] = [
  { label: '按整体', value: 'overall' },
  { label: '按 Cohort 日期', value: 'date' },
  { label: '按分组 / 对照组', value: 'group' },
]

const groupSourceOptions: SelectOption[] = [
  { label: '用户属性', value: 'user_property' },
  { label: '用户标签', value: 'user_tag' },
  { label: '起始事件属性', value: 'start_event_property' },
  { label: '主体属性', value: 'subject_property' },
]

const eventOptions = computed<SelectOption[]>(() =>
  (metadata.value?.eventMetadata.events ?? []).map((event) => ({
    label: `${event.displayName} ${event.eventName}`,
    value: event.eventName,
  })),
)

const numericPropertyOptions = (eventName: string): SelectOption[] => {
  const event = metadata.value?.eventMetadata.events.find((item) => item.eventName === eventName)

  return (event?.properties ?? [])
    .filter((property) => property.dataType === 'number')
    .map((property) => ({
      label: `${property.displayName} ${property.propertyName}`,
      value: property.propertyName,
    }))
}

const fieldOptions = (sourceType: FilterSourceType): SelectOption[] => {
  if (!metadata.value) {
    return []
  }

  if (sourceType === 'event_property' || sourceType === 'common_property') {
    const properties = metadata.value.eventMetadata.events
      .flatMap((event) => event.properties)
      .filter((property) => sourceType === 'event_property'
        ? property.propertyType === 'event_property'
        : property.propertyType === 'common_property')
    const uniqueProperties = new Map<string, EventProperty>()
    properties.forEach((property) => uniqueProperties.set(property.propertyName, property))

    return [...uniqueProperties.values()].map((property) => ({
      label: property.displayName,
      value: property.propertyName,
    }))
  }

  if (sourceType === 'user_property') {
    return metadata.value.eventMetadata.userAttributes.map((attribute) => ({
      label: attribute.displayName,
      value: attribute.field,
    }))
  }

  if (sourceType === 'user_tag') {
    return metadata.value.eventMetadata.userTags.map((tag) => ({
      label: tag.displayName,
      value: tag.field,
    }))
  }

  if (sourceType === 'segment') {
    return metadata.value.eventMetadata.userSegments.map((segment) => ({
      label: segment.name,
      value: segment.id,
    }))
  }

  return []
}

const groupFieldOptions = (sourceType: LtvGroupByConfig['sourceType']): SelectOption[] => {
  if (sourceType === 'start_event_property') {
    return fieldOptions('event_property')
  }

  if (sourceType === 'subject_property') {
    return fieldOptions('user_property')
  }

  return fieldOptions(sourceType)
}

const metricSelectOptions = computed<SelectOption[]>(() => [
  { label: '总收入', value: 'total' },
  ...query.revenueMetrics
    .filter((metric) => metric.enabled)
    .map((metric) => ({ label: metric.name, value: metric.id })),
])

const windowOptions = computed<SelectOption[]>(() =>
  query.windows
    .filter((window) => window.enabled)
    .map((window) => ({ label: window.label, value: window.id })),
)

const tableWindows = computed<LtvWindowConfig[]>(() =>
  query.windows
    .filter((window) => window.enabled),
)

const tableScrollX = computed(() => 520 + tableWindows.value.length * 126)

const trendTargetOptions = computed<SelectOption[]>(() => {
  if (!result.value) {
    return [{ label: '总体', value: 'overall' }]
  }

  if (query.trendObject === 'overall') {
    return [{ label: '总体', value: 'overall' }]
  }

  if (query.trendObject === 'date') {
    return [...new Set(result.value.rows.map((row) => row.cohortDate))]
      .map((date) => ({ label: date, value: date }))
  }

  return [...new Set(result.value.rows.map((row) => row.groupName))]
    .map((groupName) => ({ label: groupName, value: groupName }))
})

const filteredUsers = computed(() => {
  const keyword = userSearch.value.trim().toLowerCase()

  if (!keyword) {
    return users.value
  }

  return users.value.filter((user) => user.userId.toLowerCase().includes(keyword))
})

const summaryCards = computed<SummaryCard[]>(() => {
  if (!result.value) {
    return [
      { label: '起始用户', value: '-', note: '等待查询。' },
      { label: '累计收入', value: '-', note: '等待查询。' },
      { label: 'LTV 至今', value: '-', note: '等待查询。' },
      { label: '收入指标', value: '-', note: '等待查询。' },
      { label: '平均付费率', value: '-', note: '等待查询。' },
    ]
  }

  return [
    {
      label: '起始用户',
      value: formatNumber(result.value.summary.totalStartUsers),
      note: `${result.value.summary.cohortDateCount} 个 Cohort 日期。`,
    },
    {
      label: '累计收入',
      value: formatCurrency(result.value.summary.totalRevenue),
      note: '内购净收入 + 广告收入。',
    },
    {
      label: 'LTV 至今',
      value: formatCurrency(result.value.summary.overallLTVToDate),
      note: '累计收入 / 起始用户。',
    },
    {
      label: '收入指标',
      value: `${result.value.summary.enabledMetricCount}`,
      note: '当前启用收入指标数。',
    },
    {
      label: '平均付费率',
      value: formatPercent(result.value.summary.averagePayRate),
      note: '按启用分组加权模拟。',
    },
  ]
})

const chartOption = computed<EChartsOption>(() => {
  if (!result.value || result.value.trend.length === 0) {
    return {
      grid: { left: 48, right: 32, top: 40, bottom: 42 },
      xAxis: { type: 'category', data: [] },
      yAxis: { type: 'value' },
      series: [],
    }
  }

  if (query.chartMode === 'COMPARE') {
    const windowId = query.compareWindowId
    const dates = [...new Set(result.value.rows.map((row) => row.cohortDate))]
    const groups = [...new Set(result.value.rows.map((row) => row.groupName))]

    return {
      color: ['#2f7de1', '#18a058', '#f0a020', '#d03050', '#8a63d2'],
      grid: { left: 64, right: 32, top: 48, bottom: 48 },
      legend: { top: 4 },
      tooltip: {
        trigger: 'axis',
        valueFormatter: (value) => formatCurrency(Number(value)),
      },
      xAxis: { type: 'category', data: dates },
      yAxis: { type: 'value', axisLabel: { formatter: (value: number) => `¥${value.toFixed(2)}` } },
      series: groups.map((groupName) => ({
        name: groupName,
        type: 'line',
        smooth: true,
        data: dates.map((date) => {
          const row = result.value?.rows.find((item) => item.cohortDate === date && item.groupName === groupName)
          const cell = row?.cells.find((item) => item.windowId === windowId)
          return cell ? getCellLtv(cell) : 0
        }),
      })),
    }
  }

  const windows = result.value.windows
  const targetRows = getTrendRows()

  return {
    color: ['#2f7de1', '#18a058', '#f0a020', '#d03050', '#8a63d2'],
    grid: { left: 64, right: 32, top: 46, bottom: 48 },
    legend: { top: 4 },
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value) => formatCurrency(Number(value)),
    },
    xAxis: { type: 'category', data: windows.map((window) => window.label) },
    yAxis: { type: 'value', axisLabel: { formatter: (value: number) => `¥${value.toFixed(2)}` } },
    series: targetRows.map((row) => ({
      name: row.groupName === '全部用户' ? row.cohortDate : `${row.cohortDate} · ${row.groupName}`,
      type: 'line',
      smooth: true,
      data: windows.map((window) => {
        const cell = row.cells.find((item) => item.windowId === window.id)
        return cell ? getCellLtv(cell) : 0
      }),
    })),
  }
})

const ltvTableColumns = computed<DataTableColumns<LtvDetailRow>>(() => {
  const dynamicColumns: DataTableColumns<LtvDetailRow> = tableWindows.value.map((window) => ({
    title: window.label,
    key: window.id,
    width: 126,
    render: (row) => {
      const cell = row.cells.find((item) => item.windowId === window.id)

      if (!cell) {
        return '-'
      }
      const ltvValue = getCellLtv(cell)
      const revenueValue = getCellRevenue(cell)
      const metricLines = cell.metricValues.map((metric) => `${metric.metricName}：${formatCurrency(metric.revenue)} / ${formatCurrency(metric.ltv)}`)

      return h(
        NTooltip,
        { trigger: 'hover' },
        {
          trigger: () => h(
            NButton,
            {
              text: true,
              type: cell.isComplete ? 'primary' : 'warning',
              onClick: () => openRevenueDrawer(row, cell.windowId),
            },
            { default: () => `${formatCurrency(ltvValue)} / ${formatCurrency(revenueValue)}` },
          ),
          default: () => h('div', { class: 'cell-tooltip' }, [
            h('div', `日期：${row.cohortDate}`),
            h('div', `窗口：${cell.windowLabel}`),
            h('div', `起始用户数：${formatNumber(row.startUsers)}`),
            h('div', `累计营收：${formatCurrency(revenueValue)}`),
            h('div', `人均 LTV：${formatCurrency(ltvValue)}`),
            h('div', `窗口状态：${cell.isComplete ? '完整' : '未完整'}`),
            ...metricLines.map((line) => h('div', line)),
          ]),
        },
      )
    },
  }))

  return [
    { title: 'Cohort 日期', key: 'cohortDate', fixed: 'left', width: 118 },
    { title: query.comparisonGroups.some((group) => group.enabled) ? '对照组' : '分组', key: 'groupName', width: 160 },
    {
      title: '起始用户',
      key: 'startUsers',
      width: 118,
      sorter: (rowA, rowB) => rowA.startUsers - rowB.startUsers,
      render: (row) => h(
        NButton,
        {
          text: true,
          type: 'primary',
          onClick: () => openUserDrawer(row),
        },
        { default: () => formatNumber(row.startUsers) },
      ),
    },
    ...dynamicColumns,
    {
      title: '付费率',
      key: 'payRate',
      width: 96,
      render: (row) => formatPercent(row.payRate),
    },
    {
      title: 'ARPPU',
      key: 'arppu',
      width: 96,
      render: (row) => formatCurrency(row.arppu),
    },
  ]
})

const userColumns: DataTableColumns<LtvUserRecord> = [
  { title: '用户 ID', key: 'userId', width: 150 },
  { title: 'Cohort 日期', key: 'cohortDate', width: 120 },
  { title: '分组', key: 'groupName', width: 160 },
  { title: '渠道', key: 'channel', width: 110 },
  { title: '用户等级', key: 'userLevel', width: 100 },
  { title: '起始事件时间', key: 'startEventTime', width: 180 },
  { title: '收入至今', key: 'revenueToDate', width: 110, render: (row) => formatCurrency(row.revenueToDate) },
  { title: 'LTV 至今', key: 'ltvToDate', width: 110, render: (row) => formatCurrency(row.ltvToDate) },
  { title: '付费状态', key: 'paymentStatus', width: 100 },
]

const revenueColumns: DataTableColumns<LtvRevenueBreakdownRecord> = [
  { title: '日期', key: 'date', width: 120 },
  { title: '收入指标', key: 'metricName', width: 140 },
  { title: '类型', key: 'revenueType', width: 90, render: (row) => row.revenueType === 'iap' ? '内购' : '广告' },
  { title: '事件', key: 'eventName', width: 140 },
  { title: '事件次数', key: 'eventCount', width: 100, render: (row) => formatNumber(row.eventCount) },
  { title: '收入用户', key: 'revenueUserCount', width: 100, render: (row) => formatNumber(row.revenueUserCount) },
  { title: '收入', key: 'revenue', width: 110, render: (row) => formatCurrency(row.revenue) },
  { title: '累计收入', key: 'cumulativeRevenue', width: 110, render: (row) => formatCurrency(row.cumulativeRevenue) },
  { title: '流水 / 曝光 ID', key: 'orderId', width: 180 },
  { title: '用户 ID', key: 'userId', width: 150 },
  { title: '事件时间', key: 'eventTime', width: 180 },
  { title: '利润率 / eCPM', key: 'ratio', width: 130, render: (row) => row.profitRatio ? `${row.profitRatio}%` : row.ecpm ? `¥${row.ecpm}` : '-' },
]

function formatNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(Math.round(value))
}

function formatCurrency(value: number): string {
  if (value >= 1000) {
    return `¥${new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 }).format(value)}`
  }

  return `¥${value.toFixed(2)}`
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function markDirty() {
  if (queryState.value !== 'loading') {
    queryState.value = 'dirty'
    notice.value = '配置已修改，请点击开始分析刷新结果。'
  }
}

function syncQuickRange(value: string) {
  const today = dayjs('2026-05-21')
  const rangeMap: Record<string, [string, string]> = {
    today: [today.format(dateFormat), today.format(dateFormat)],
    yesterday: [today.subtract(1, 'day').format(dateFormat), today.subtract(1, 'day').format(dateFormat)],
    last_7_days: [today.subtract(6, 'day').format(dateFormat), today.format(dateFormat)],
    last_14_days: [today.subtract(13, 'day').format(dateFormat), today.format(dateFormat)],
    last_30_days: [today.subtract(29, 'day').format(dateFormat), today.format(dateFormat)],
  }
  const selectedRange = rangeMap[value]

  if (selectedRange) {
    query.timeRange.startDate = selectedRange[0]
    query.timeRange.endDate = selectedRange[1]
    customDateRange.value = [dayjs(selectedRange[0]).valueOf(), dayjs(selectedRange[1]).valueOf()]
  }

  markDirty()
}

function updateCustomDateRange(value: DateRangeValue | null) {
  if (!value) {
    return
  }

  customDateRange.value = value
  query.timeRange.quickKey = 'custom'
  query.timeRange.startDate = dayjs(value[0]).format(dateFormat)
  query.timeRange.endDate = dayjs(value[1]).format(dateFormat)
  markDirty()
}

function updateStartEvent(eventName: string) {
  const event = metadata.value?.eventMetadata.events.find((item) => item.eventName === eventName)
  query.startEvent.eventName = eventName
  query.startEvent.eventDisplayName = event?.displayName ?? eventName
  markDirty()
}

function updateRevenueMetricEvent(metric: LtvRevenueMetric, eventName: string) {
  const event = metadata.value?.eventMetadata.events.find((item) => item.eventName === eventName)
  metric.eventName = eventName
  metric.eventDisplayName = event?.displayName ?? eventName
  markDirty()
}

function updateRevenueMetricProperty(metric: LtvIapRevenueMetric, propertyName: string) {
  const event = metadata.value?.eventMetadata.events.find((item) => item.eventName === metric.eventName)
  const property = event?.properties.find((item) => item.propertyName === propertyName)
  metric.revenueProperty = propertyName
  metric.revenuePropertyDisplayName = property?.displayName ?? propertyName
  markDirty()
}

function downloadTextFile(fileName: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

function downloadEcpmTemplate(metric: LtvAdRevenueMetric) {
  downloadTextFile(
    `${metric.name}_ecpm_template.csv`,
    'date,ecpm\n2026-05-15,42\n2026-05-16,43\n2026-05-17,41\n',
  )
  notice.value = '已下载 eCPM 模板，可按 date、ecpm 两列填写。'
}

function simulateEcpmUpload(metric: LtvAdRevenueMetric) {
  metric.ecpmFileId = `file_ecpm_${Date.now()}`
  metric.ecpmFileName = `${metric.name}_ecpm_202605.csv`
  metric.ecpmRecordCount = 68
  metric.ecpmCoverageStart = '2026-05-01'
  metric.ecpmCoverageEnd = '2026-07-08'
  metric.ecpmUploadStatus = 'success'
  metric.ecpmParseErrors = []
  notice.value = `${metric.name} 的 eCPM 文件已解析成功，覆盖 2026-05-01 至 2026-07-08。`
  markDirty()
}

function exportLtvExcel() {
  const rows = (result.value?.overallRows ?? []).flatMap((row) =>
    row.cells.map((cell) => [
      row.cohortDate,
      row.groupName,
      row.startUsers,
      cell.windowLabel,
      cell.revenue,
      cell.ltv,
      cell.isComplete ? '完整' : '未完整',
    ]),
  )
  const content = [
    ['cohort_date', 'group', 'start_users', 'window', 'revenue', 'ltv', 'status'],
    ...rows,
  ].map((row) => row.join(',')).join('\n')

  downloadTextFile('ltv_analysis_export.csv', content)
  notice.value = '已导出 LTV 明细数据。Demo 阶段使用 CSV 模拟 Excel 下载。'
}

function createFilter(logic: 'AND' | 'OR' = 'AND'): FilterCondition {
  return {
    id: `ltv-filter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sourceType: 'user_tag',
    field: 'coin_balance_level',
    fieldDisplayName: '金币余额等级',
    operator: 'equals',
    value: 'low',
    displayValue: '低金币',
    logic,
  }
}

function addFilter(filters: FilterCondition[]) {
  filters.push(createFilter(filters.length === 0 ? 'AND' : 'AND'))
  markDirty()
}

function addChildFilter(filter: FilterCondition) {
  if (!filter.childFilters) {
    filter.childFilters = []
  }

  filter.childFilters.push(createFilter('AND'))
  markDirty()
}

function removeFilter(filters: FilterCondition[], index: number) {
  filters.splice(index, 1)
  markDirty()
}

function removeChildFilter(filter: FilterCondition, index: number) {
  filter.childFilters?.splice(index, 1)
  markDirty()
}

function updateFilterField(filter: FilterCondition, field: string) {
  const option = fieldOptions(filter.sourceType).find((item) => item.value === field)
  filter.field = field
  filter.fieldDisplayName = String(option?.label ?? field)
  filter.displayValue = String(filter.value)
  markDirty()
}

async function addRevenueMetric(type: 'iap' | 'ad') {
  if (query.revenueMetrics.length >= 10) {
    notice.value = 'Demo 阶段最多支持 10 个收入指标。'
    return
  }

  const metric = await ltvAnalysisService.createRevenueMetric(type, query.revenueMetrics.length + 1)
  query.revenueMetrics.push(metric)
  markDirty()
}

function removeRevenueMetric(index: number) {
  const removedMetricId = query.revenueMetrics[index]?.id
  query.revenueMetrics.splice(index, 1)
  if (query.selectedMetricId === removedMetricId) {
    query.selectedMetricId = 'total'
  }
  markDirty()
}

function duplicateMetric(metric: LtvRevenueMetric) {
  if (query.revenueMetrics.length >= 10) {
    notice.value = 'Demo 阶段最多支持 10 个收入指标。'
    return
  }

  query.revenueMetrics.push({
    ...metric,
    id: `${metric.id}-copy-${Date.now()}`,
    name: `${metric.name} 副本`,
    filters: metric.filters.map((filter) => ({
      ...filter,
      childFilters: filter.childFilters?.map((child) => ({ ...child })),
    })),
  })
  markDirty()
}

function addComparisonGroup() {
  if (query.comparisonGroups.length >= 10) {
    notice.value = '最多支持 10 个对照组。'
    return
  }

  const index = query.comparisonGroups.length + 1
  query.comparisonGroups.push({
    id: `ltv-comparison-${Date.now()}`,
    name: `对照组 ${index}`,
    color: ['#2f7de1', '#18a058', '#f0a020', '#d03050', '#8a63d2'][index % 5] ?? '#2f7de1',
    enabled: true,
    filters: [createFilter('AND')],
  })
  query.groupBy.enabled = false
  markDirty()
}

function removeComparisonGroup(index: number) {
  query.comparisonGroups.splice(index, 1)
  markDirty()
}

function updateGroupByEnabled(value: boolean) {
  query.groupBy.enabled = value

  if (value) {
    query.comparisonGroups.forEach((group) => {
      group.enabled = false
    })
  }

  markDirty()
}

function updateTrendObject(value: 'overall' | 'date' | 'group') {
  query.trendObject = value

  if (value === 'overall') {
    query.selectedTrendTargetKey = 'overall'
  } else if (value === 'date') {
    query.selectedTrendTargetKey = String(trendTargetOptions.value[0]?.value ?? query.timeRange.startDate)
  } else {
    query.selectedTrendTargetKey = String(trendTargetOptions.value[0]?.value ?? '全部用户')
  }

  markDirty()
}

function validateQuery(): string | null {
  if (!query.startEvent.eventName) {
    return '请选择起始事件。'
  }

  if (!query.revenueMetrics.some((metric) => metric.enabled)) {
    return '至少需要启用一个收入指标。'
  }

  if (!query.windows.some((window) => window.enabled)) {
    return '至少需要启用一个 LTV 窗口。'
  }

  const invalidMetric = query.revenueMetrics.find((metric) =>
    metric.enabled && (metric.type === 'iap'
      ? !metric.revenueProperty || metric.profitRatio < 0 || metric.profitRatio > 100
      : metric.fixedEcpm <= 0 || (metric.ecpmSource === 'daily_upload' && metric.ecpmUploadStatus !== 'success')),
  )

  if (invalidMetric) {
    return `收入指标「${invalidMetric.name}」配置不完整。`
  }

  const ecpmMissingMetric = query.revenueMetrics.find((metric) => {
    if (!metric.enabled || metric.type !== 'ad' || metric.ecpmSource !== 'daily_upload' || metric.missingEcpmStrategy !== 'ERROR') {
      return false
    }

    const maxWindow = Math.max(0, ...query.windows
      .filter((window) => window.enabled && typeof window.value === 'number')
      .map((window) => Number(window.value)))
    const requiredEnd = dayjs(query.timeRange.endDate).add(maxWindow, 'day')

    return !metric.ecpmCoverageEnd || dayjs(metric.ecpmCoverageEnd).isBefore(requiredEnd, 'day')
  })

  if (ecpmMissingMetric) {
    return `收入指标「${ecpmMissingMetric.name}」的 eCPM 文件缺少查询所需日期，请补充后再查询。`
  }

  return null
}

function getQueryPayload(): LtvQueryRequest {
  return {
    ...query,
    timeRange: { ...query.timeRange },
    startEvent: {
      ...query.startEvent,
      filters: query.startEvent.filters.map((filter) => ({ ...filter, childFilters: filter.childFilters?.map((child) => ({ ...child })) })),
    },
    revenueMetrics: query.revenueMetrics.map((metric) => ({
      ...metric,
      filters: metric.filters.map((filter) => ({ ...filter, childFilters: filter.childFilters?.map((child) => ({ ...child })) })),
    })),
    segmentFilter: {
      ...query.segmentFilter,
      conditions: query.segmentFilter.conditions.map((filter) => ({ ...filter, childFilters: filter.childFilters?.map((child) => ({ ...child })) })),
    },
    comparisonGroups: query.comparisonGroups.map((group) => ({
      ...group,
      filters: group.filters.map((filter) => ({ ...filter, childFilters: filter.childFilters?.map((child) => ({ ...child })) })),
    })),
    groupBy: { ...query.groupBy },
    windows: query.windows.map((window) => ({ ...window })),
  }
}

async function runAnalysis() {
  const validationError = validateQuery()

  if (validationError) {
    queryState.value = 'error'
    errorMessage.value = validationError
    return
  }

  loading.value = true
  queryState.value = 'loading'
  errorMessage.value = ''

  try {
    result.value = await ltvAnalysisService.runAnalysis(getQueryPayload())
    normalizeTrendTargetKey()
    queryState.value = result.value.rows.length > 0 ? 'success' : 'empty'
    notice.value = result.value.rows.length > 0
      ? `分析完成，生成 ${result.value.summary.cohortDateCount} 个 Cohort 日期的 LTV 数据。`
      : '当前条件下暂无 LTV 数据。'
  } catch {
    queryState.value = 'error'
    errorMessage.value = '查询失败，请稍后重试。'
  } finally {
    loading.value = false
  }
}

function getSelectedMetricName(): string {
  if (query.selectedMetricId === 'total') {
    return '总收入'
  }

  return query.revenueMetrics.find((metric) => metric.id === query.selectedMetricId)?.name ?? '收入指标'
}

function getSelectLabel(options: SelectOption[], value: string): string {
  const label = options.find((option) => option.value === value)?.label
  return typeof label === 'string' ? label : value
}

function getChartSubtitle(): string {
  if (query.chartMode === 'COMPARE') {
    return `${getSelectedMetricName()} · ${getSelectLabel(windowOptions.value, query.compareWindowId)} · 按 Cohort 日期对比`
  }

  return `${getSelectedMetricName()} · ${getSelectLabel(trendObjectOptions, query.trendObject)} · ${getSelectLabel(trendTargetOptions.value, getEffectiveTrendTargetKey())}`
}

function getEffectiveTrendTargetKey(): string {
  const values = trendTargetOptions.value.map((option) => String(option.value))

  if (values.includes(query.selectedTrendTargetKey)) {
    return query.selectedTrendTargetKey
  }

  return values[0] ?? 'overall'
}

function normalizeTrendTargetKey() {
  query.selectedTrendTargetKey = getEffectiveTrendTargetKey()
}

function getCellLtv(cell: { ltv: number, metricValues: Array<{ metricId: string, ltv: number }> }): number {
  if (query.selectedMetricId === 'total') {
    return cell.ltv
  }

  return cell.metricValues.find((metric) => metric.metricId === query.selectedMetricId)?.ltv ?? 0
}

function getCellRevenue(cell: { revenue: number, metricValues: Array<{ metricId: string, revenue: number }> }): number {
  if (query.selectedMetricId === 'total') {
    return cell.revenue
  }

  return cell.metricValues.find((metric) => metric.metricId === query.selectedMetricId)?.revenue ?? 0
}

function getTrendRows(): LtvDetailRow[] {
  if (!result.value) {
    return []
  }

  if (query.trendObject === 'overall') {
    return result.value.overallRows
  }

  if (query.trendObject === 'date') {
    return result.value.rows.filter((row) => row.cohortDate === getEffectiveTrendTargetKey())
  }

  return result.value.overallRows.filter((row) => row.groupName === getEffectiveTrendTargetKey())
}

function getCell(row: LtvDetailRow, windowId: string) {
  return row.cells.find((cell) => cell.windowId === windowId)
}

async function openUserDrawer(row: LtvDetailRow) {
  drilldownTitle.value = `${row.cohortDate} · ${row.groupName} 起始用户`
  users.value = await ltvAnalysisService.getUsers({
    cohortDate: row.cohortDate === '汇总' ? query.timeRange.startDate : row.cohortDate,
    groupName: row.groupName,
  })
  showUserDrawer.value = true
}

async function openRevenueDrawer(row: LtvDetailRow, windowId: string) {
  const cell = getCell(row, windowId)

  if (!cell) {
    return
  }

  const context: LtvDrilldownContext = {
    rowKey: row.key,
    cohortDate: row.cohortDate === '汇总' ? query.timeRange.startDate : row.cohortDate,
    groupName: row.groupName,
    windowId: cell.windowId,
    windowLabel: cell.windowLabel,
    metricId: query.selectedMetricId,
    metricName: getSelectedMetricName(),
  }
  drilldownTitle.value = `${context.cohortDate} · ${context.groupName} · ${context.windowLabel} 收入明细`
  revenueBreakdown.value = await ltvAnalysisService.getRevenueBreakdown(context)
  showRevenueDrawer.value = true
}

async function saveAnalysis() {
  const response = await ltvAnalysisService.saveAnalysis({
    name: saveAnalysisForm.name,
    description: saveAnalysisForm.description,
    tags: saveAnalysisForm.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    queryConfig: getQueryPayload(),
  })
  showSaveAnalysisModal.value = false
  notice.value = response.message
}

async function saveWidgetToDashboard() {
  const response = await ltvAnalysisService.saveWidgetToDashboard({
    widgetName: dashboardForm.widgetName,
    dashboardPath: dashboardForm.dashboardPath,
    widgetType: dashboardForm.widgetType,
    chartMode: query.chartMode,
    queryConfig: getQueryPayload(),
  })
  showDashboardModal.value = false
  notice.value = response.message
}

async function resetDemo() {
  const defaultQuery = await ltvAnalysisService.getDefaultQuery()
  Object.assign(query, defaultQuery)
  customDateRange.value = [
    dayjs(defaultQuery.timeRange.startDate).valueOf(),
    dayjs(defaultQuery.timeRange.endDate).valueOf(),
  ]
  await runAnalysis()
}

onMounted(async () => {
  metadataLoading.value = true
  metadata.value = await ltvAnalysisService.getMetadata()
  metadataLoading.value = false
  await resetDemo()
})
</script>

<template>
  <n-spin :show="metadataLoading">
    <div class="ltv-page">
      <div class="page-header">
        <div>
          <h1>LTV 分析</h1>
          <p>
            按起始事件圈定 Cohort，叠加内购和广告收入，分析 LTV0、LTV7、LTV30 与 LTV 至今。
          </p>
        </div>
        <n-space>
          <n-button @click="showSaveAnalysisModal = true">保存分析</n-button>
          <n-button @click="showDashboardModal = true">保存到看板</n-button>
          <n-button @click="exportLtvExcel">导出 Excel</n-button>
          <n-button @click="resetDemo">恢复演示配置</n-button>
          <n-button type="primary" :loading="loading" @click="runAnalysis">开始分析</n-button>
        </n-space>
      </div>

      <n-alert
        v-if="notice"
        class="status-alert"
        :type="queryState === 'error' ? 'error' : queryState === 'dirty' ? 'warning' : 'success'"
        closable
        @close="notice = ''"
      >
        {{ errorMessage || notice }}
      </n-alert>

      <div class="analysis-layout">
        <div class="config-column">
          <n-card class="config-card" title="1. 起始事件">
            <div class="form-grid">
              <label>识别主体</label>
              <n-select v-model:value="query.subjectType" :options="subjectOptions" @update:value="markDirty" />

              <label>起始事件</label>
              <n-select
                :value="query.startEvent.eventName"
                filterable
                :options="eventOptions"
                @update:value="updateStartEvent"
              />

              <label>用户去重</label>
              <n-select v-model:value="query.startEvent.dedupStrategy" :options="dedupOptions" @update:value="markDirty" />

              <label>起始过滤</label>
              <div>
                <n-button secondary @click="addFilter(query.startEvent.filters)">+ 添加过滤</n-button>
              </div>
            </div>

            <div class="filter-list">
              <div v-if="query.startEvent.filters.length === 0" class="muted">未配置起始事件过滤。</div>
              <div v-for="(filter, index) in query.startEvent.filters" :key="filter.id" class="filter-block">
                <div class="filter-row">
                  <n-select
                    v-if="index > 0"
                    v-model:value="filter.logic"
                    class="logic-select"
                    :options="relationOptions"
                    @update:value="markDirty"
                  />
                  <div v-else class="logic-spacer" />
                  <n-select v-model:value="filter.sourceType" :options="filterSourceOptions" @update:value="markDirty" />
                  <n-select :value="filter.field" :options="fieldOptions(filter.sourceType)" @update:value="(value) => updateFilterField(filter, String(value))" />
                  <n-select v-model:value="filter.operator" :options="operatorOptions" @update:value="markDirty" />
                  <n-input v-model:value="filter.displayValue" placeholder="筛选值" @update:value="markDirty" />
                  <n-button text type="primary" @click="addChildFilter(filter)">二级</n-button>
                  <n-button text type="error" @click="removeFilter(query.startEvent.filters, index)">删除</n-button>
                </div>
                <div v-if="filter.childFilters?.length" class="child-filter-list">
                  <div v-for="(child, childIndex) in filter.childFilters" :key="child.id" class="filter-row">
                    <n-select v-model:value="child.logic" class="logic-select" :options="relationOptions" @update:value="markDirty" />
                    <n-select v-model:value="child.sourceType" :options="filterSourceOptions" @update:value="markDirty" />
                    <n-select :value="child.field" :options="fieldOptions(child.sourceType)" @update:value="(value) => updateFilterField(child, String(value))" />
                    <n-select v-model:value="child.operator" :options="operatorOptions" @update:value="markDirty" />
                    <n-input v-model:value="child.displayValue" placeholder="筛选值" @update:value="markDirty" />
                    <n-button text type="error" @click="removeChildFilter(filter, childIndex)">删除</n-button>
                  </div>
                </div>
              </div>
            </div>
          </n-card>

          <n-card class="config-card" title="2. 收入指标">
            <n-space class="section-actions">
              <n-button secondary @click="addRevenueMetric('iap')">+ 内购指标</n-button>
              <n-button secondary @click="addRevenueMetric('ad')">+ 广告指标</n-button>
            </n-space>

            <div class="metric-list">
              <div v-for="(metric, index) in query.revenueMetrics" :key="metric.id" class="metric-card">
                <div class="metric-card-header">
                  <n-input v-model:value="metric.name" class="metric-name" @update:value="markDirty" />
                  <n-tag :type="metric.type === 'iap' ? 'success' : 'info'">
                    {{ metric.type === 'iap' ? '内购' : '广告' }}
                  </n-tag>
                  <n-switch v-model:value="metric.enabled" @update:value="markDirty" />
                </div>

                <div class="form-grid compact">
                  <label>收入事件</label>
                  <n-select
                    :value="metric.eventName"
                    filterable
                    :options="eventOptions"
                    @update:value="(value) => updateRevenueMetricEvent(metric, String(value))"
                  />

                  <template v-if="metric.type === 'iap'">
                    <label>金额属性</label>
                    <n-select
                      :value="(metric as LtvIapRevenueMetric).revenueProperty"
                      :options="numericPropertyOptions(metric.eventName)"
                      @update:value="(value) => updateRevenueMetricProperty(metric as LtvIapRevenueMetric, String(value))"
                    />
                    <label>利润率</label>
                    <n-input-number
                      v-model:value="(metric as LtvIapRevenueMetric).profitRatio"
                      :min="0"
                      :max="100"
                      :precision="3"
                      @update:value="markDirty"
                    >
                      <template #suffix>%</template>
                    </n-input-number>
                  </template>

                  <template v-else>
                    <label>eCPM</label>
                    <n-input-number
                      v-model:value="(metric as LtvAdRevenueMetric).fixedEcpm"
                      :min="0"
                      :precision="2"
                      @update:value="markDirty"
                    >
                      <template #prefix>¥</template>
                    </n-input-number>
                    <label>缺失策略</label>
                    <n-select
                      v-model:value="(metric as LtvAdRevenueMetric).missingEcpmStrategy"
                      :options="missingEcpmOptions"
                      @update:value="markDirty"
                    />
                    <label>eCPM 文件</label>
                    <div class="ecpm-row">
                      <n-tag :type="(metric as LtvAdRevenueMetric).ecpmUploadStatus === 'success' ? 'success' : 'warning'">
                        {{
                          (metric as LtvAdRevenueMetric).ecpmUploadStatus === 'success'
                            ? `${(metric as LtvAdRevenueMetric).ecpmRecordCount} 条 · ${(metric as LtvAdRevenueMetric).ecpmCoverageStart} 至 ${(metric as LtvAdRevenueMetric).ecpmCoverageEnd}`
                            : '未上传'
                        }}
                      </n-tag>
                      <n-button size="small" @click="downloadEcpmTemplate(metric as LtvAdRevenueMetric)">下载模板</n-button>
                      <n-button size="small" type="primary" secondary @click="simulateEcpmUpload(metric as LtvAdRevenueMetric)">模拟上传</n-button>
                    </div>
                  </template>
                </div>

                <div class="metric-actions">
                  <n-button text type="primary" @click="addFilter(metric.filters)">+ 指标过滤</n-button>
                  <n-button text @click="duplicateMetric(metric)">复制</n-button>
                  <n-button text type="error" @click="removeRevenueMetric(index)">删除</n-button>
                </div>
                <div v-if="metric.filters.length" class="filter-list slim">
                  <div v-for="(filter, filterIndex) in metric.filters" :key="filter.id" class="filter-block compact-filter-block">
                    <div class="filter-row">
                      <n-select
                        v-if="filterIndex > 0"
                        v-model:value="filter.logic"
                        class="logic-select"
                        :options="relationOptions"
                        @update:value="markDirty"
                      />
                      <div v-else class="logic-spacer" />
                      <n-select v-model:value="filter.sourceType" :options="filterSourceOptions" @update:value="markDirty" />
                      <n-select :value="filter.field" :options="fieldOptions(filter.sourceType)" @update:value="(value) => updateFilterField(filter, String(value))" />
                      <n-select v-model:value="filter.operator" :options="operatorOptions" @update:value="markDirty" />
                      <n-input v-model:value="filter.displayValue" placeholder="筛选值" @update:value="markDirty" />
                      <n-button text type="primary" @click="addChildFilter(filter)">二级</n-button>
                      <n-button text type="error" @click="removeFilter(metric.filters, filterIndex)">删除</n-button>
                    </div>
                    <div v-if="filter.childFilters?.length" class="child-filter-list">
                      <div v-for="(child, childIndex) in filter.childFilters" :key="child.id" class="filter-row">
                        <n-select v-model:value="child.logic" class="logic-select" :options="relationOptions" @update:value="markDirty" />
                        <n-select v-model:value="child.sourceType" :options="filterSourceOptions" @update:value="markDirty" />
                        <n-select :value="child.field" :options="fieldOptions(child.sourceType)" @update:value="(value) => updateFilterField(child, String(value))" />
                        <n-select v-model:value="child.operator" :options="operatorOptions" @update:value="markDirty" />
                        <n-input v-model:value="child.displayValue" placeholder="筛选值" @update:value="markDirty" />
                        <n-button text type="error" @click="removeChildFilter(filter, childIndex)">删除</n-button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </n-card>

          <n-card class="config-card" title="3. 用户筛选 / 对照 / 分组">
            <div class="config-subsection">
              <div class="subsection-header">
                <strong>用户筛选</strong>
                <n-button secondary @click="addFilter(query.segmentFilter.conditions)">+ 添加筛选</n-button>
              </div>
              <div class="filter-list slim">
                <div v-if="query.segmentFilter.conditions.length === 0" class="muted">默认分析全部起始用户。</div>
                <div v-for="(filter, index) in query.segmentFilter.conditions" :key="filter.id" class="filter-block compact-filter-block">
                  <div class="filter-row">
                    <n-select
                      v-if="index > 0"
                      v-model:value="filter.logic"
                      class="logic-select"
                      :options="relationOptions"
                      @update:value="markDirty"
                    />
                    <div v-else class="logic-spacer" />
                    <n-select v-model:value="filter.sourceType" :options="filterSourceOptions" @update:value="markDirty" />
                    <n-select :value="filter.field" :options="fieldOptions(filter.sourceType)" @update:value="(value) => updateFilterField(filter, String(value))" />
                    <n-select v-model:value="filter.operator" :options="operatorOptions" @update:value="markDirty" />
                    <n-input v-model:value="filter.displayValue" placeholder="筛选值" @update:value="markDirty" />
                    <n-button text type="primary" @click="addChildFilter(filter)">二级</n-button>
                    <n-button text type="error" @click="removeFilter(query.segmentFilter.conditions, index)">删除</n-button>
                  </div>
                  <div v-if="filter.childFilters?.length" class="child-filter-list">
                    <div v-for="(child, childIndex) in filter.childFilters" :key="child.id" class="filter-row">
                      <n-select v-model:value="child.logic" class="logic-select" :options="relationOptions" @update:value="markDirty" />
                      <n-select v-model:value="child.sourceType" :options="filterSourceOptions" @update:value="markDirty" />
                      <n-select :value="child.field" :options="fieldOptions(child.sourceType)" @update:value="(value) => updateFilterField(child, String(value))" />
                      <n-select v-model:value="child.operator" :options="operatorOptions" @update:value="markDirty" />
                      <n-input v-model:value="child.displayValue" placeholder="筛选值" @update:value="markDirty" />
                      <n-button text type="error" @click="removeChildFilter(filter, childIndex)">删除</n-button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="config-subsection">
              <div class="subsection-header">
                <strong>对照组</strong>
                <n-button secondary @click="addComparisonGroup">+ 添加对照组</n-button>
              </div>
              <div v-for="(group, groupIndex) in query.comparisonGroups" :key="group.id" class="comparison-card">
                <div class="comparison-header">
                  <n-input v-model:value="group.name" @update:value="markDirty" />
                  <n-switch v-model:value="group.enabled" @update:value="markDirty" />
                  <n-button text type="primary" @click="addFilter(group.filters)">+ 条件</n-button>
                  <n-button text type="error" @click="removeComparisonGroup(groupIndex)">删除</n-button>
                </div>
                <div v-if="group.filters.length" class="filter-list slim">
                  <div v-for="(filter, filterIndex) in group.filters" :key="filter.id" class="filter-block compact-filter-block">
                    <div class="filter-row">
                      <n-select
                        v-if="filterIndex > 0"
                        v-model:value="filter.logic"
                        class="logic-select"
                        :options="relationOptions"
                        @update:value="markDirty"
                      />
                      <div v-else class="logic-spacer" />
                      <n-select v-model:value="filter.sourceType" :options="filterSourceOptions" @update:value="markDirty" />
                      <n-select :value="filter.field" :options="fieldOptions(filter.sourceType)" @update:value="(value) => updateFilterField(filter, String(value))" />
                      <n-select v-model:value="filter.operator" :options="operatorOptions" @update:value="markDirty" />
                      <n-input v-model:value="filter.displayValue" placeholder="筛选值" @update:value="markDirty" />
                      <n-button text type="primary" @click="addChildFilter(filter)">二级</n-button>
                      <n-button text type="error" @click="removeFilter(group.filters, filterIndex)">删除</n-button>
                    </div>
                    <div v-if="filter.childFilters?.length" class="child-filter-list">
                      <div v-for="(child, childIndex) in filter.childFilters" :key="child.id" class="filter-row">
                        <n-select v-model:value="child.logic" class="logic-select" :options="relationOptions" @update:value="markDirty" />
                        <n-select v-model:value="child.sourceType" :options="filterSourceOptions" @update:value="markDirty" />
                        <n-select :value="child.field" :options="fieldOptions(child.sourceType)" @update:value="(value) => updateFilterField(child, String(value))" />
                        <n-select v-model:value="child.operator" :options="operatorOptions" @update:value="markDirty" />
                        <n-input v-model:value="child.displayValue" placeholder="筛选值" @update:value="markDirty" />
                        <n-button text type="error" @click="removeChildFilter(filter, childIndex)">删除</n-button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="config-subsection">
              <div class="subsection-header">
                <strong>属性分组</strong>
                <n-switch :value="query.groupBy.enabled" @update:value="updateGroupByEnabled" />
              </div>
              <div class="form-grid compact">
                <label>字段来源</label>
                <n-select v-model:value="query.groupBy.sourceType" :options="groupSourceOptions" :disabled="!query.groupBy.enabled" @update:value="markDirty" />
                <label>分组字段</label>
                <n-select
                  v-model:value="query.groupBy.field"
                  :disabled="!query.groupBy.enabled"
                  :options="groupFieldOptions(query.groupBy.sourceType)"
                  @update:value="markDirty"
                />
                <label>Top N</label>
                <n-input-number v-model:value="query.groupBy.topN" :disabled="!query.groupBy.enabled" :min="1" :max="20" @update:value="markDirty" />
              </div>
              <p class="muted">V1 中属性分组与对照组互斥，开启分组后会关闭对照组。</p>
            </div>
          </n-card>

          <n-card class="config-card" title="4. 时间与 LTV 窗口">
            <div class="form-grid">
              <label>时间范围</label>
              <n-select
                v-model:value="query.timeRange.quickKey"
                :options="quickRangeOptions"
                @update:value="(value) => syncQuickRange(String(value))"
              />
              <label v-if="query.timeRange.quickKey === 'custom'">自定义</label>
              <n-date-picker
                v-if="query.timeRange.quickKey === 'custom'"
                type="daterange"
                :value="customDateRange"
                clearable
                @update:value="updateCustomDateRange"
              />
              <label>时区</label>
              <n-select v-model:value="query.timezone" :options="timezoneOptions" @update:value="markDirty" />
              <label>未成熟窗口</label>
              <n-select v-model:value="query.incompleteWindowMode" :options="incompleteWindowOptions" @update:value="markDirty" />
            </div>
            <div class="window-grid">
              <n-checkbox
                v-for="window in query.windows"
                :key="window.id"
                v-model:checked="window.enabled"
                @update:checked="markDirty"
              >
                {{ window.label }}
              </n-checkbox>
            </div>
          </n-card>
        </div>

        <div class="result-column">
          <div class="result-toolbar">
            <div>
              <h2>LTV 结果</h2>
              <p>
                {{ query.timeRange.startDate }} 至 {{ query.timeRange.endDate }} ·
                {{ query.timezone }} · 查询状态：{{ queryState }}
              </p>
            </div>
          </div>

          <div class="summary-grid">
            <n-card v-for="card in summaryCards" :key="card.label" class="summary-card">
              <div class="summary-label">{{ card.label }}</div>
              <div class="summary-value">{{ card.value }}</div>
              <div class="summary-note">{{ card.note }}</div>
            </n-card>
          </div>

          <n-card class="chart-card">
            <div class="chart-header">
              <div>
                <h3>{{ query.chartMode === 'TREND' ? 'LTV 趋势图' : 'LTV 窗口对比' }}</h3>
                <p>{{ getChartSubtitle() }}</p>
              </div>
              <n-space>
                <n-select v-model:value="query.chartMode" class="inline-select" :options="chartModeOptions" @update:value="markDirty" />
                <n-select v-model:value="query.selectedMetricId" class="inline-select" :options="metricSelectOptions" @update:value="markDirty" />
                <n-select
                  v-if="query.chartMode === 'TREND'"
                  :value="query.trendObject"
                  class="inline-select"
                  :options="trendObjectOptions"
                  @update:value="(value) => updateTrendObject(value as 'overall' | 'date' | 'group')"
                />
                <n-select
                  v-if="query.chartMode === 'TREND'"
                  v-model:value="query.selectedTrendTargetKey"
                  class="inline-select"
                  :options="trendTargetOptions"
                  @update:value="markDirty"
                />
                <n-select
                  v-if="query.chartMode === 'COMPARE'"
                  v-model:value="query.compareWindowId"
                  class="inline-select"
                  :options="windowOptions"
                  @update:value="markDirty"
                />
              </n-space>
            </div>
            <div v-if="!result || result.trend.length === 0" class="empty-area">
              <n-empty description="当前条件下暂无图表数据，请配置起始事件和收入指标后开始分析。" />
            </div>
            <v-chart v-else class="main-chart" :option="chartOption" autoresize />
          </n-card>

          <n-alert v-if="result?.warnings.length" type="warning" class="warnings">
            <div v-for="warning in result.warnings.slice(0, 3)" :key="warning">{{ warning }}</div>
          </n-alert>

          <n-card class="table-card" title="详细数据">
            <n-data-table
              :columns="ltvTableColumns"
              :data="result?.overallRows ?? []"
              :loading="loading"
              :scroll-x="tableScrollX"
              :pagination="{ pageSize: 8 }"
            />
          </n-card>
        </div>
      </div>

      <n-drawer v-model:show="showUserDrawer" width="820">
        <n-drawer-content :title="drilldownTitle">
          <n-space class="drawer-actions">
            <n-input v-model:value="userSearch" class="drawer-search" clearable placeholder="搜索用户 ID" />
            <n-button>导出用户</n-button>
            <n-button type="primary">保存为分群</n-button>
          </n-space>
          <n-data-table :columns="userColumns" :data="filteredUsers" :pagination="{ pageSize: 8 }" :scroll-x="1100" />
        </n-drawer-content>
      </n-drawer>

      <n-drawer v-model:show="showRevenueDrawer" width="860">
        <n-drawer-content :title="drilldownTitle">
          <n-space class="drawer-actions">
            <n-button>下载流水</n-button>
            <n-button type="primary">创建复盘任务</n-button>
          </n-space>
          <n-data-table :columns="revenueColumns" :data="revenueBreakdown" :pagination="{ pageSize: 8 }" :scroll-x="1580" />
        </n-drawer-content>
      </n-drawer>

      <n-modal v-model:show="showSaveAnalysisModal" preset="card" title="保存分析" class="ltv-modal">
        <div class="modal-form">
          <label>分析名称</label>
          <n-input v-model:value="saveAnalysisForm.name" />
          <label>保存位置</label>
          <n-select v-model:value="saveAnalysisForm.folder" :options="[
            { label: '个人空间 / 我的分析', value: '个人空间 / 我的分析' },
            { label: '团队空间 / 运营团队', value: '团队空间 / 运营团队' },
          ]" />
          <label>描述</label>
          <n-input v-model:value="saveAnalysisForm.description" type="textarea" />
          <label>标签</label>
          <n-input v-model:value="saveAnalysisForm.tags" />
        </div>
        <template #footer>
          <n-space justify="end">
            <n-button @click="showSaveAnalysisModal = false">取消</n-button>
            <n-button type="primary" @click="saveAnalysis">保存</n-button>
          </n-space>
        </template>
      </n-modal>

      <n-modal v-model:show="showDashboardModal" preset="card" title="保存到看板" class="ltv-modal">
        <div class="modal-form">
          <label>组件名称</label>
          <n-input v-model:value="dashboardForm.widgetName" />
          <label>看板位置</label>
          <n-select v-model:value="dashboardForm.dashboardPath" :options="[
            { label: '个人空间 / 收入看板', value: '个人空间 / 收入看板' },
            { label: '团队空间 / 运营日报', value: '团队空间 / 运营日报' },
            { label: '公共空间 / 公司经营大盘', value: '公共空间 / 公司经营大盘' },
          ]" />
          <label>组件类型</label>
          <n-select v-model:value="dashboardForm.widgetType" :options="[
            { label: 'LTV 趋势图', value: 'ltv_trend' },
            { label: 'LTV 对比图', value: 'ltv_compare' },
            { label: 'LTV 明细表', value: 'ltv_table' },
          ]" />
          <n-alert type="info">
            保存当前 {{ query.chartMode === 'TREND' ? 'LTV 趋势图' : 'LTV 窗口对比图' }}，看板打开时会重新按当前配置查询。
          </n-alert>
        </div>
        <template #footer>
          <n-space justify="end">
            <n-button @click="showDashboardModal = false">取消</n-button>
            <n-button type="primary" @click="saveWidgetToDashboard">保存</n-button>
          </n-space>
        </template>
      </n-modal>
    </div>
  </n-spin>
</template>

<style scoped>
.ltv-page {
  min-height: 100%;
  padding: 24px;
  background: #f3f6fb;
  color: #1f2937;
}

.page-header,
.result-toolbar,
.chart-header,
.subsection-header,
.comparison-header,
.metric-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.page-header h1,
.result-toolbar h2 {
  margin: 0;
  color: #111827;
}

.page-header p,
.result-toolbar p,
.chart-header p,
.muted,
.summary-note {
  margin: 8px 0 0;
  color: #667085;
  line-height: 1.6;
}

.status-alert,
.warnings {
  margin-top: 16px;
}

.analysis-layout {
  display: grid;
  grid-template-columns: minmax(0, 520px) minmax(0, 1fr);
  gap: 20px;
  margin-top: 16px;
  align-items: start;
}

.config-column {
  display: grid;
  gap: 16px;
  min-width: 0;
}

.result-column {
  display: grid;
  gap: 16px;
  min-width: 0;
}

.config-card,
.chart-card,
.table-card,
.summary-card {
  border-radius: 8px;
  min-width: 0;
}

.config-card {
  overflow: hidden;
}

.config-card :deep(.n-card__content) {
  overflow: hidden;
}

.form-grid {
  display: grid;
  grid-template-columns: 104px minmax(0, 1fr);
  gap: 14px 16px;
  align-items: center;
}

.form-grid.compact {
  grid-template-columns: 84px minmax(0, 1fr);
  gap: 10px 12px;
  margin-top: 12px;
}

.form-grid label {
  font-weight: 700;
  color: #344054;
}

.section-actions,
.metric-actions,
.drawer-actions {
  margin-bottom: 12px;
}

.drawer-actions {
  flex-wrap: wrap;
}

.drawer-search {
  width: 220px;
}

.filter-list {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.filter-list.slim {
  margin-top: 10px;
}

.filter-block,
.comparison-card,
.metric-card {
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
}

.compact-filter-block {
  padding: 10px;
}

.filter-row {
  display: grid;
  grid-template-columns: 78px minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;
  align-items: center;
}

.logic-select,
.logic-spacer {
  width: 78px;
}

.filter-row :deep(.n-select),
.filter-row :deep(.n-input) {
  min-width: 0;
}

.filter-row :deep(.n-button) {
  justify-self: start;
}

.child-filter-list {
  display: grid;
  gap: 8px;
  margin: 10px 0 0 20px;
  padding-left: 12px;
  border-left: 3px solid #bfe8d1;
}

.ecpm-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.cell-tooltip {
  display: grid;
  gap: 4px;
  max-width: 320px;
  line-height: 1.5;
}

.metric-list {
  display: grid;
  gap: 12px;
}

.metric-name {
  flex: 1;
}

.config-subsection {
  padding-top: 14px;
}

.config-subsection + .config-subsection {
  margin-top: 16px;
  border-top: 1px solid #edf0f5;
}

.comparison-header {
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.window-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 16px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(168px, 1fr));
  gap: 12px;
}

.summary-card {
  min-height: 132px;
}

.summary-label {
  color: #667085;
  font-weight: 700;
}

.summary-value {
  margin-top: 14px;
  font-size: 30px;
  font-weight: 700;
  color: #111827;
}

.chart-card {
  min-height: 430px;
}

.chart-header,
.result-toolbar,
.page-header {
  flex-wrap: wrap;
}

.chart-header h3 {
  margin: 0;
  color: #111827;
}

.inline-select {
  width: 160px;
}

.main-chart {
  height: 340px;
  margin-top: 12px;
}

.empty-area {
  display: grid;
  place-items: center;
  height: 320px;
}

.table-card {
  overflow: hidden;
}

.modal-form {
  display: grid;
  gap: 12px;
}

.modal-form label {
  font-weight: 700;
}

.ltv-modal {
  width: 560px;
}

@media (max-width: 1480px) {
  .analysis-layout {
    grid-template-columns: minmax(0, 460px) minmax(0, 1fr);
  }

  .summary-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .filter-row {
    grid-template-columns: 78px minmax(0, 1fr);
  }
}
</style>
