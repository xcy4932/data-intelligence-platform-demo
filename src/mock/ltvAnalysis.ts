import dayjs from 'dayjs'
import { mockEventDefinitions, mockEventMetadata } from './eventAnalysis'
import type { FilterCondition } from '@/types/eventAnalysis'
import type {
  LtvActionResult,
  LtvAdRevenueMetric,
  LtvCellMetricValue,
  LtvCellResult,
  LtvComparisonGroup,
  LtvDashboardWidgetPayload,
  LtvDetailRow,
  LtvDrilldownContext,
  LtvGroupByConfig,
  LtvIapRevenueMetric,
  LtvMetadata,
  LtvQueryRequest,
  LtvQueryResponse,
  LtvRevenueBreakdownRecord,
  LtvRevenueMetric,
  LtvSavedAnalysisPayload,
  LtvSegmentFilterConfig,
  LtvTrendPoint,
  LtvUserRecord,
  LtvWindowConfig,
  LtvWindowValue,
} from '@/types/ltvAnalysis'

interface MockGroupContext {
  name: string
  color: string
  multiplier: number
}

const dateFormat = 'YYYY-MM-DD'

const getEventDisplayName = (eventName: string): string =>
  mockEventDefinitions.find((event) => event.eventName === eventName)?.displayName ?? eventName

const cloneFilter = (condition: FilterCondition): FilterCondition => ({
  ...condition,
  value: Array.isArray(condition.value) ? [...condition.value] : condition.value,
  childFilters: condition.childFilters?.map(cloneFilter),
})

const cloneMetric = (metric: LtvRevenueMetric): LtvRevenueMetric => ({
  ...metric,
  filters: metric.filters.map(cloneFilter),
})

export const defaultLtvWindows: LtvWindowConfig[] = [
  { id: 'ltv0', label: 'LTV0', value: 0, enabled: true },
  { id: 'ltv1', label: 'LTV1', value: 1, enabled: true },
  { id: 'ltv2', label: 'LTV2', value: 2, enabled: true },
  { id: 'ltv3', label: 'LTV3', value: 3, enabled: true },
  { id: 'ltv4', label: 'LTV4', value: 4, enabled: true },
  { id: 'ltv5', label: 'LTV5', value: 5, enabled: true },
  { id: 'ltv6', label: 'LTV6', value: 6, enabled: true },
  { id: 'ltv7', label: 'LTV7', value: 7, enabled: true },
  { id: 'ltv8', label: 'LTV8', value: 8, enabled: true },
  { id: 'ltv9', label: 'LTV9', value: 9, enabled: true },
  { id: 'ltv10', label: 'LTV10', value: 10, enabled: true },
  { id: 'ltv14', label: 'LTV14', value: 14, enabled: true },
  { id: 'ltv30', label: 'LTV30', value: 30, enabled: true },
  { id: 'ltv60', label: 'LTV60', value: 60, enabled: true },
  { id: 'ltv_to_date', label: 'LTV至今', value: 'to_date', enabled: true },
]

export const defaultLtvSegmentFilter: LtvSegmentFilterConfig = {
  relation: 'AND',
  conditions: [
    {
      id: 'ltv-filter-active',
      sourceType: 'segment',
      field: 'seg_active_7d',
      fieldDisplayName: '用户分群',
      operator: 'in',
      value: ['seg_active_7d'],
      displayValue: '近 7 日活跃用户',
      logic: 'AND',
    },
  ],
}

export const defaultLtvComparisonGroups: LtvComparisonGroup[] = [
  {
    id: 'ltv-group-all',
    name: '全部新增用户',
    color: '#2f7de1',
    enabled: true,
    filters: [],
  },
  {
    id: 'ltv-group-low-coin',
    name: '低金币高活跃用户',
    color: '#18a058',
    enabled: true,
    filters: [
      {
        id: 'ltv-low-coin',
        sourceType: 'user_tag',
        field: 'coin_balance_level',
        fieldDisplayName: '金币余额等级',
        operator: 'equals',
        value: 'low',
        displayValue: '低金币',
        logic: 'AND',
      },
      {
        id: 'ltv-active-high',
        sourceType: 'user_tag',
        field: 'active_level',
        fieldDisplayName: '活跃等级',
        operator: 'equals',
        value: 'high',
        displayValue: '高活跃',
        logic: 'AND',
      },
    ],
  },
]

export const defaultLtvGroupBy: LtvGroupByConfig = {
  enabled: false,
  id: 'ltv-groupby-channel',
  sourceType: 'user_property',
  field: 'channel',
  displayName: '获客渠道',
  topN: 5,
  includeOthers: true,
  includeUnknown: true,
}

export const defaultLtvRevenueMetrics: LtvRevenueMetric[] = [
  {
    id: 'ltv-metric-iap',
    name: '内购净收入',
    type: 'iap',
    eventName: 'payment_success',
    eventDisplayName: '支付成功',
    revenueProperty: 'pay_amount',
    revenuePropertyDisplayName: '支付金额',
    profitRatio: 92,
    enabled: true,
    filters: [
      {
        id: 'ltv-iap-filter',
        sourceType: 'user_property',
        field: 'payment_status',
        fieldDisplayName: '付费状态',
        operator: 'not_equals',
        value: 'unknown',
        displayValue: '非未知',
        logic: 'AND',
      },
    ],
  },
  {
    id: 'ltv-metric-ad',
    name: '激励广告收入',
    type: 'ad',
    eventName: 'ad_watch_complete',
    eventDisplayName: '广告观看完成',
    ecpmSource: 'daily_upload',
    fixedEcpm: 42,
    missingEcpmStrategy: 'USE_PREVIOUS',
    ecpmFileId: 'file_ecpm_202605',
    ecpmFileName: 'ecpm_2026_05.csv',
    ecpmRecordCount: 68,
    ecpmCoverageStart: '2026-05-01',
    ecpmCoverageEnd: '2026-07-08',
    ecpmUploadStatus: 'success',
    ecpmParseErrors: [],
    enabled: true,
    filters: [
      {
        id: 'ltv-ad-filter',
        sourceType: 'event_property',
        field: 'ad_position',
        fieldDisplayName: '广告位',
        operator: 'in',
        value: ['金币不足弹窗', '任务中心', '结算页广告'],
        displayValue: '金币不足弹窗 / 任务中心 / 结算页广告',
        logic: 'AND',
      },
    ],
  },
]

export const defaultLtvQuery: LtvQueryRequest = {
  projectId: 'demo-project',
  subjectType: 'user_id',
  timezone: 'UTC+8 北京时间',
  timeRange: {
    quickKey: 'last_7_days',
    startDate: '2026-05-15',
    endDate: '2026-05-21',
  },
  startEvent: {
    eventName: 'app_launch',
    eventDisplayName: '应用启动',
    dedupStrategy: 'once_per_day',
    filters: [
      {
        id: 'ltv-start-filter',
        sourceType: 'common_property',
        field: 'app_version',
        fieldDisplayName: 'App 版本',
        operator: 'in',
        value: ['1.8.3', '1.8.4'],
        displayValue: '1.8.3 / 1.8.4',
        logic: 'AND',
        childFilters: [
          {
            id: 'ltv-start-child-filter',
            sourceType: 'user_property',
            field: 'channel',
            fieldDisplayName: '获客渠道',
            operator: 'not_equals',
            value: 'internal',
            displayValue: '非内部测试',
            logic: 'AND',
          },
        ],
      },
    ],
  },
  revenueMetrics: defaultLtvRevenueMetrics.map(cloneMetric),
  segmentFilter: {
    relation: defaultLtvSegmentFilter.relation,
    conditions: defaultLtvSegmentFilter.conditions.map(cloneFilter),
  },
  comparisonGroups: defaultLtvComparisonGroups.map((group) => ({
    ...group,
    filters: group.filters.map(cloneFilter),
  })),
  groupBy: { ...defaultLtvGroupBy },
  windows: defaultLtvWindows.map((window) => ({ ...window })),
  incompleteWindowMode: 'SHOW_WITH_WARNING',
  chartMode: 'TREND',
  trendObject: 'overall',
  selectedMetricId: 'total',
  compareWindowId: 'ltv7',
  selectedTrendTargetKey: 'overall',
  userPropertySnapshotMode: 'COHORT_DAY',
  decimalScale: 2,
}

export const mockLtvMetadata: LtvMetadata = {
  eventMetadata: mockEventMetadata,
  recommendedStartEvents: mockEventDefinitions.filter((event) =>
    ['app_launch', 'game_start', 'ad_exposure', 'payment_success'].includes(event.eventName),
  ),
  recommendedRevenueEvents: mockEventDefinitions.filter((event) => event.eventName === 'payment_success'),
  recommendedAdEvents: mockEventDefinitions.filter((event) =>
    ['ad_exposure', 'ad_click', 'ad_watch_complete'].includes(event.eventName),
  ),
}

const buildDateRange = (startDate: string, endDate: string): string[] => {
  const start = dayjs(startDate)
  const end = dayjs(endDate)
  const dates: string[] = []

  for (let index = 0; index <= end.diff(start, 'day'); index += 1) {
    dates.push(start.add(index, 'day').format(dateFormat))
  }

  return dates
}

const getGroupContexts = (query: LtvQueryRequest): MockGroupContext[] => {
  const activeComparisonGroups = query.comparisonGroups.filter((group) => group.enabled)

  if (activeComparisonGroups.length > 0) {
    return activeComparisonGroups.map((group, index) => ({
      name: group.name,
      color: group.color,
      multiplier: index === 0 ? 1 : 0.42 + index * 0.08,
    }))
  }

  if (query.groupBy.enabled) {
    return [
      { name: '自然量', color: '#2f7de1', multiplier: 0.48 },
      { name: '广告投放', color: '#18a058', multiplier: 0.34 },
      { name: '社交裂变', color: '#f0a020', multiplier: 0.18 },
    ].slice(0, query.groupBy.topN)
  }

  return [{ name: '全部用户', color: '#2f7de1', multiplier: 1 }]
}

const getWindowAge = (windowValue: LtvWindowValue, cohortDate: string, endDate: string): number => {
  const age = Math.max(dayjs(endDate).diff(dayjs(cohortDate), 'day'), 0)
  return windowValue === 'to_date' ? age : Math.min(windowValue, age)
}

const getWindowComplete = (windowValue: LtvWindowValue, cohortDate: string, endDate: string): boolean => {
  if (windowValue === 'to_date') {
    return true
  }

  return dayjs(endDate).diff(dayjs(cohortDate), 'day') >= windowValue
}

const getDecaySum = (age: number, base: number, decay: number): number => {
  let total = 0

  for (let index = 0; index <= age; index += 1) {
    total += base * Math.pow(decay, index)
  }

  return total
}

const getEcpm = (cohortIndex: number, age: number, metric: LtvAdRevenueMetric): number => {
  if (metric.ecpmSource === 'fixed_mock') {
    return metric.fixedEcpm
  }

  return Math.max(28, metric.fixedEcpm + Math.sin((cohortIndex + age) / 2) * 4 - age * 0.16)
}

const getMetricRevenue = (
  metric: LtvRevenueMetric,
  startUsers: number,
  cohortIndex: number,
  groupIndex: number,
  age: number,
): number => {
  if (metric.type === 'iap') {
    const grossRevenue = startUsers * getDecaySum(age, 0.105 + groupIndex * 0.012, 0.74)
    return grossRevenue * (metric.profitRatio / 100)
  }

  const adViews = startUsers * getDecaySum(age, 1.65 + groupIndex * 0.16, 0.82)
  const ecpm = getEcpm(cohortIndex, age, metric)
  return adViews * ecpm / 1000
}

const getCellResult = (
  query: LtvQueryRequest,
  metricValues: LtvCellMetricValue[],
  window: LtvWindowConfig,
  isComplete: boolean,
  startUsers: number,
): LtvCellResult => {
  const revenue = metricValues.reduce((total, metric) => total + metric.revenue, 0)
  const shouldHide = !isComplete && query.incompleteWindowMode === 'SHOW_EMPTY'
  const visibleRevenue = shouldHide ? 0 : revenue

  return {
    windowId: window.id,
    windowLabel: window.label,
    windowValue: window.value,
    isComplete,
    revenue: Number(visibleRevenue.toFixed(2)),
    ltv: Number((visibleRevenue / Math.max(startUsers, 1)).toFixed(4)),
    metricValues,
    warning: !isComplete && query.incompleteWindowMode === 'SHOW_WITH_WARNING'
      ? `${window.label} 尚未成熟，当前展示截至查询结束日的累计值。`
      : undefined,
  }
}

const buildRows = (query: LtvQueryRequest): LtvDetailRow[] => {
  const dates = buildDateRange(query.timeRange.startDate, query.timeRange.endDate)
  const groups = getGroupContexts(query)
  const enabledMetrics = query.revenueMetrics.filter((metric) => metric.enabled)
  const enabledWindows = query.windows.filter((window) => window.enabled)

  return dates.flatMap((date, cohortIndex) => groups.map((group, groupIndex) => {
    const baseStartUsers = 11200 + cohortIndex * 430 - Math.max(cohortIndex - 4, 0) * 260
    const startUsers = Math.round(baseStartUsers * group.multiplier)
    const cells = enabledWindows.map((window) => {
      const age = getWindowAge(window.value, date, query.timeRange.endDate)
      const isComplete = getWindowComplete(window.value, date, query.timeRange.endDate)
      const metricValues = enabledMetrics.map((metric) => ({
        metricId: metric.id,
        metricName: metric.name,
        revenue: Number(getMetricRevenue(metric, startUsers, cohortIndex, groupIndex, age).toFixed(2)),
        ltv: 0,
      }))
      const totalRevenue = metricValues.reduce((total, metric) => total + metric.revenue, 0)
      const normalizedMetrics = metricValues.map((metric) => ({
        ...metric,
        ltv: Number((metric.revenue / Math.max(startUsers, 1)).toFixed(4)),
      }))

      if (totalRevenue <= 0) {
        return getCellResult(query, normalizedMetrics, window, isComplete, startUsers)
      }

      return getCellResult(query, normalizedMetrics, window, isComplete, startUsers)
    })
    const toDateCell = cells.find((cell) => cell.windowId === 'ltv_to_date') ?? cells[cells.length - 1]
    const revenueToDate = toDateCell?.revenue ?? 0

    return {
      key: `${date}-${group.name}`,
      cohortDate: date,
      groupName: group.name,
      startUsers,
      revenueToDate,
      ltvToDate: Number((revenueToDate / Math.max(startUsers, 1)).toFixed(4)),
      payRate: Number((0.086 + cohortIndex * 0.002 + groupIndex * 0.008).toFixed(4)),
      arppu: Number((58 + cohortIndex * 1.4 + groupIndex * 3.2).toFixed(2)),
      cells,
    }
  }))
}

const aggregateRows = (rows: LtvDetailRow[], windows: LtvWindowConfig[]): LtvDetailRow[] => {
  const groupNames = [...new Set(rows.map((row) => row.groupName))]

  return groupNames.map((groupName) => {
    const groupedRows = rows.filter((row) => row.groupName === groupName)
    const startUsers = groupedRows.reduce((total, row) => total + row.startUsers, 0)
    const cells = windows.filter((window) => window.enabled).map((window) => {
      const rowCells = groupedRows
        .map((row) => row.cells.find((cell) => cell.windowId === window.id))
        .filter((cell): cell is LtvCellResult => Boolean(cell))
      const revenue = rowCells.reduce((total, cell) => total + cell.revenue, 0)
      const metrics = [...new Map(
        rowCells
          .flatMap((cell) => cell.metricValues)
          .map((metric) => [metric.metricId, metric]),
      ).values()]
      const metricValues: LtvCellMetricValue[] = metrics.map((metric) => {
        const revenueByMetric = rowCells.reduce((total, cell) => {
          const matched = cell.metricValues.find((item) => item.metricId === metric.metricId)
          return total + (matched?.revenue ?? 0)
        }, 0)

        return {
          metricId: metric.metricId,
          metricName: metric.metricName,
          revenue: Number(revenueByMetric.toFixed(2)),
          ltv: Number((revenueByMetric / Math.max(startUsers, 1)).toFixed(4)),
        }
      })

      return {
        windowId: window.id,
        windowLabel: window.label,
        windowValue: window.value,
        isComplete: rowCells.every((cell) => cell.isComplete),
        revenue: Number(revenue.toFixed(2)),
        ltv: Number((revenue / Math.max(startUsers, 1)).toFixed(4)),
        metricValues,
        warning: rowCells.some((cell) => cell.warning) ? '包含未成熟窗口。' : undefined,
      }
    })
    const revenueToDate = cells.find((cell) => cell.windowId === 'ltv_to_date')?.revenue ?? 0

    return {
      key: `overall-${groupName}`,
      cohortDate: '汇总',
      groupName,
      startUsers,
      revenueToDate,
      ltvToDate: Number((revenueToDate / Math.max(startUsers, 1)).toFixed(4)),
      payRate: Number((groupedRows.reduce((total, row) => total + row.payRate, 0) / Math.max(groupedRows.length, 1)).toFixed(4)),
      arppu: Number((groupedRows.reduce((total, row) => total + row.arppu, 0) / Math.max(groupedRows.length, 1)).toFixed(2)),
      cells,
      children: groupedRows,
    }
  })
}

const buildTrend = (query: LtvQueryRequest, rows: LtvDetailRow[]): LtvTrendPoint[] => {
  const selectedWindow = query.windows.find((window) => window.id === query.compareWindowId)
    ?? query.windows.find((window) => window.enabled)
    ?? defaultLtvWindows[0]
  const selectedMetricId = query.selectedMetricId

  if (!selectedWindow) {
    return []
  }

  return rows.flatMap((row) => {
    const cell = row.cells.find((item) => item.windowId === selectedWindow.id)

    if (!cell) {
      return []
    }

    if (selectedMetricId === 'total') {
      return [{
        date: row.cohortDate,
        groupName: row.groupName,
        windowLabel: cell.windowLabel,
        metricName: '总收入',
        revenue: cell.revenue,
        ltv: cell.ltv,
        startUsers: row.startUsers,
        isComplete: cell.isComplete,
      }]
    }

    const metric = cell.metricValues.find((item) => item.metricId === selectedMetricId)

    if (!metric) {
      return []
    }

    return [{
      date: row.cohortDate,
      groupName: row.groupName,
      windowLabel: cell.windowLabel,
      metricName: metric.metricName,
      revenue: metric.revenue,
      ltv: metric.ltv,
      startUsers: row.startUsers,
      isComplete: cell.isComplete,
    }]
  })
}

export const createDefaultLtvQuery = (): LtvQueryRequest => ({
  ...defaultLtvQuery,
  timeRange: { ...defaultLtvQuery.timeRange },
  startEvent: {
    ...defaultLtvQuery.startEvent,
    filters: defaultLtvQuery.startEvent.filters.map(cloneFilter),
  },
  revenueMetrics: defaultLtvQuery.revenueMetrics.map(cloneMetric),
  segmentFilter: {
    ...defaultLtvQuery.segmentFilter,
    conditions: defaultLtvQuery.segmentFilter.conditions.map(cloneFilter),
  },
  comparisonGroups: defaultLtvQuery.comparisonGroups.map((group) => ({
    ...group,
    filters: group.filters.map(cloneFilter),
  })),
  groupBy: { ...defaultLtvQuery.groupBy },
  windows: defaultLtvQuery.windows.map((window) => ({ ...window })),
})

export const createLtvResult = (query: LtvQueryRequest): LtvQueryResponse => {
  const rows = buildRows(query)
  const overallRows = aggregateRows(rows, query.windows)
  const trend = buildTrend(query, rows)
  const totalStartUsers = overallRows.reduce((total, row) => total + row.startUsers, 0)
  const totalRevenue = overallRows.reduce((total, row) => total + row.revenueToDate, 0)
  const warnings = rows.flatMap((row) => row.cells.map((cell) => cell.warning).filter((warning): warning is string => Boolean(warning)))
  const adWarnings = query.revenueMetrics
    .filter((metric): metric is LtvAdRevenueMetric => metric.type === 'ad' && metric.enabled && metric.missingEcpmStrategy === 'USE_PREVIOUS')
    .map((metric) => `${metric.name} 存在缺失 eCPM 日期，已使用前一日 eCPM 补齐。`)

  return {
    queryId: `ltv-${Date.now()}`,
    executedAt: '2026-05-21 14:30:00',
    timezone: query.timezone,
    summary: {
      totalStartUsers,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      overallLTVToDate: Number((totalRevenue / Math.max(totalStartUsers, 1)).toFixed(4)),
      cohortDateCount: buildDateRange(query.timeRange.startDate, query.timeRange.endDate).length,
      enabledMetricCount: query.revenueMetrics.filter((metric) => metric.enabled).length,
      averagePayRate: Number((overallRows.reduce((total, row) => total + row.payRate, 0) / Math.max(overallRows.length, 1)).toFixed(4)),
    },
    windows: query.windows.filter((window) => window.enabled).map((window) => ({ ...window })),
    metrics: query.revenueMetrics.filter((metric) => metric.enabled).map(cloneMetric),
    rows,
    overallRows,
    trend,
    warnings: [...new Set([...warnings, ...adWarnings])],
  }
}

export const createLtvUsers = (context: Pick<LtvDrilldownContext, 'cohortDate' | 'groupName'>): LtvUserRecord[] =>
  Array.from({ length: 18 }, (_, index) => ({
    userId: `u_${context.cohortDate.replaceAll('-', '')}_${String(index + 1).padStart(4, '0')}`,
    cohortDate: context.cohortDate,
    groupName: context.groupName,
    channel: ['自然量', '广告投放', '社交裂变', '应用商店'][index % 4] ?? '自然量',
    userLevel: ['青铜', '白银', '黄金', '铂金'][index % 4] ?? '青铜',
    startEventTime: `${context.cohortDate} ${String(8 + index % 10).padStart(2, '0')}:18:00`,
    revenueToDate: Number((index * 3.6 + 2.8).toFixed(2)),
    ltvToDate: Number((0.28 + index * 0.018).toFixed(4)),
    paymentStatus: index % 3 === 0 ? '轻付费' : '未付费',
  }))

export const createLtvRevenueBreakdown = (context: LtvDrilldownContext): LtvRevenueBreakdownRecord[] =>
  Array.from({ length: 16 }, (_, index) => {
    const isAd = context.metricId.includes('ad')
    const rawRevenue = isAd ? Number((0.038 + index * 0.003).toFixed(4)) : Number((6.8 + index * 1.7).toFixed(2))

    return {
      orderId: `${isAd ? 'ad' : 'pay'}_${context.cohortDate.replaceAll('-', '')}_${index + 1}`,
      userId: `u_${context.cohortDate.replaceAll('-', '')}_${String(index + 11).padStart(4, '0')}`,
      date: dayjs(context.cohortDate).add(index % 5, 'day').format('YYYY-MM-DD'),
      eventTime: dayjs(context.cohortDate).add(index % 5, 'day').format('YYYY-MM-DD HH:mm:ss'),
      metricName: context.metricName,
      revenueType: isAd ? 'ad' : 'iap',
      eventName: isAd ? 'ad_watch_complete' : 'payment_success',
      eventCount: isAd ? 18 + index * 3 : 1,
      revenueUserCount: isAd ? 12 + index : 1,
      revenue: isAd ? rawRevenue : Number((rawRevenue * 0.92).toFixed(2)),
      rawRevenue,
      cumulativeRevenue: Number(Array.from({ length: index + 1 }, (_, currentIndex) => (
        isAd ? 0.038 + currentIndex * 0.003 : (6.8 + currentIndex * 1.7) * 0.92
      )).reduce((total, item) => total + item, 0).toFixed(2)),
      profitRatio: isAd ? undefined : 92,
      ecpm: isAd ? 42 + index % 4 : undefined,
    }
  })

export const createSavedLtvResult = (payload: LtvSavedAnalysisPayload): LtvActionResult => ({
  success: true,
  id: `saved-ltv-${payload.name.length}-${Date.now()}`,
  message: 'LTV 分析已保存。',
})

export const createLtvDashboardResult = (payload: LtvDashboardWidgetPayload): LtvActionResult => ({
  success: true,
  id: `ltv-widget-${payload.widgetName.length}-${Date.now()}`,
  message: '已保存到看板。',
})

export const createEmptyIapMetric = (index: number): LtvIapRevenueMetric => ({
  id: `ltv-metric-iap-${Date.now()}-${index}`,
  name: `内购收入 ${index}`,
  type: 'iap',
  eventName: 'payment_success',
  eventDisplayName: getEventDisplayName('payment_success'),
  revenueProperty: 'pay_amount',
  revenuePropertyDisplayName: '支付金额',
  profitRatio: 90,
  enabled: true,
  filters: [],
})

export const createEmptyAdMetric = (index: number): LtvAdRevenueMetric => ({
  id: `ltv-metric-ad-${Date.now()}-${index}`,
  name: `广告收入 ${index}`,
  type: 'ad',
  eventName: 'ad_watch_complete',
  eventDisplayName: getEventDisplayName('ad_watch_complete'),
  ecpmSource: 'daily_upload',
  fixedEcpm: 40,
  missingEcpmStrategy: 'ERROR',
  ecpmRecordCount: 0,
  ecpmUploadStatus: 'empty',
  ecpmParseErrors: [],
  enabled: true,
  filters: [],
})
