import { mockEventMetadata } from './eventAnalysis'
import type {
  RetentionChartSeries,
  RetentionColumn,
  RetentionComparisonGroup,
  RetentionCustomWindow,
  RetentionDashboardWidgetPayload,
  RetentionExtraMetric,
  RetentionGroupBy,
  RetentionMetadata,
  RetentionQueryRequest,
  RetentionQueryResponse,
  RetentionResultRow,
  RetentionSavedAnalysisPayload,
  RetentionUserFilterGroup,
  RetentionUserRecord,
  RetentionWindowConfig,
  RetentionWindowResult,
} from '@/types/retentionAnalysis'

export const mockRetentionMetadata: RetentionMetadata = {
  eventMetadata: mockEventMetadata,
  recommendedEvents: mockEventMetadata.events.filter((event) =>
    ['app_launch', 'game_start', 'ad_watch_complete', 'payment_success', 'reward_claim'].includes(event.eventName),
  ),
}

export const mockRetentionUserFilter: RetentionUserFilterGroup = {
  id: 'retention_filter_all_users',
  name: '全部用户',
  relation: 'AND',
  conditions: [],
}

export const mockRetentionComparisonGroups: RetentionComparisonGroup[] = [
  {
    id: 'retention_group_new_users',
    name: '新用户',
    color: '#2080f0',
    enabled: true,
    userFilter: {
      id: 'retention_group_new_users_filter',
      name: '注册 7 天内',
      relation: 'AND',
      conditions: [],
    },
  },
  {
    id: 'retention_group_low_coin',
    name: '低金币用户',
    color: '#d03050',
    enabled: true,
    userFilter: {
      id: 'retention_group_low_coin_filter',
      name: '金币余额等级 = 低金币',
      relation: 'AND',
      conditions: [],
    },
  },
]

export const mockRetentionGroupBys: RetentionGroupBy[] = [
  {
    id: 'retention_group_channel',
    fieldType: 'user_property',
    fieldName: 'channel',
    displayName: '注册渠道',
    valueMode: 'raw',
  },
  {
    id: 'retention_group_coin',
    fieldType: 'user_tag',
    fieldName: 'coin_balance_level',
    displayName: '金币余额等级',
    valueMode: 'raw',
  },
]

export const mockRetentionCustomWindows: RetentionCustomWindow[] = [
  { id: 'custom_window_explore', name: '新手探索期', startOffset: 1, endOffset: 3, unit: 'day' },
  { id: 'custom_window_activate', name: '激活期', startOffset: 4, endOffset: 7, unit: 'day' },
  { id: 'custom_window_sticky', name: '长期粘性期', startOffset: 8, endOffset: 30, unit: 'day' },
]

export const mockRetentionExtraMetrics: RetentionExtraMetric[] = [
  {
    id: 'extra_ad_watch_pv',
    eventName: 'ad_watch_complete',
    displayName: '留存用户广告观看次数',
    aggregator: 'PV',
    filters: [],
  },
  {
    id: 'extra_payment_ltv',
    eventName: 'payment_success',
    displayName: '阶段累计 LTV',
    aggregator: 'CUMSUM_FUV',
    propertyName: 'amount',
    filters: [],
  },
]

const formatDate = (date: Date): string => date.toISOString().slice(0, 10)

const createDateRange = (startDate: string, endDate: string): string[] => {
  const dates: string[] = []
  const cursor = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)

  while (cursor <= end) {
    dates.push(formatDate(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  return dates
}

const resolveColumns = (
  windows: RetentionWindowConfig,
  includeDay0: boolean,
  customWindows: RetentionCustomWindow[],
): RetentionColumn[] => {
  if (windows.mode === 'custom') {
    return customWindows.map((window) => ({
      key: window.id,
      label: window.name,
      windowStartOffset: window.startOffset,
      windowEndOffset: window.endOffset,
    }))
  }

  const offsets =
    windows.mode === 'key'
      ? windows.keyOffsets
      : Array.from({ length: 7 }, (_, index) => index + 1)
  const normalizedOffsets = [...new Set(includeDay0 ? [0, ...offsets] : offsets)]
    .filter((offset) => offset >= 0)
    .slice(0, 10)

  return normalizedOffsets.map((offset) => ({
    key: `day_${offset}`,
    label: `Day${offset}`,
    windowStartOffset: offset,
    windowEndOffset: offset,
  }))
}

const createWindowResult = (
  column: RetentionColumn,
  startUsers: number,
  rowIndex: number,
  groupPenalty: number,
): RetentionWindowResult => {
  const offset = Math.max(column.windowEndOffset, column.windowStartOffset)
  const baseRate = offset === 0 ? 42 : Math.max(8, 34 - offset * 2.6 - rowIndex * 0.8 - groupPenalty)
  const retentionRate = Number(baseRate.toFixed(2))
  const retainedUsers = Math.round((startUsers * retentionRate) / 100)
  const churnRate = Number(Math.max(0, 100 - retentionRate - 12).toFixed(2))

  return {
    key: column.key,
    retainedUsers,
    retentionRate,
    churnUsers: Math.round((startUsers * churnRate) / 100),
    churnRate,
    extraMetrics: {
      extra_ad_watch_pv: Math.round(retainedUsers * (2.3 + offset * 0.12)),
      extra_payment_ltv: Number((retainedUsers * (0.18 + offset * 0.08)).toFixed(2)),
    },
  }
}

const buildTrendSeries = (
  rows: RetentionResultRow[],
  columns: RetentionColumn[],
  metricMode: 'retention' | 'churn',
): RetentionChartSeries[] => {
  const totalStartUsers = rows.reduce((sum, row) => sum + row.startUsers, 0)

  return [
    {
      id: 'overall',
      name: metricMode === 'retention' ? '总体留存' : '总体流失',
      color: metricMode === 'retention' ? '#18a058' : '#d03050',
      points: columns.map((column) => {
        const users = rows.reduce((sum, row) => {
          const window = row.windows.find((item) => item.key === column.key)
          return sum + (metricMode === 'retention' ? window?.retainedUsers ?? 0 : window?.churnUsers ?? 0)
        }, 0)

        return {
          name: column.label,
          windowKey: column.key,
          windowLabel: column.label,
          value: Number(((users / Math.max(totalStartUsers, 1)) * 100).toFixed(2)),
          users,
          startUsers: totalStartUsers,
        }
      }),
    },
  ]
}

const buildComparisonSeries = (
  rows: RetentionResultRow[],
  selectedWindowKey: string,
  metricMode: 'retention' | 'churn',
): RetentionChartSeries[] => [
  {
    id: 'comparison',
    name: metricMode === 'retention' ? '关键窗口留存' : '关键窗口流失',
    color: '#2080f0',
    points: rows.map((row) => {
      const window = row.windows.find((item) => item.key === selectedWindowKey) ?? row.windows[0]
      const users = metricMode === 'retention' ? window?.retainedUsers ?? 0 : window?.churnUsers ?? 0
      const value = metricMode === 'retention' ? window?.retentionRate ?? 0 : window?.churnRate ?? 0

      return {
        name: row.cohortDate,
        cohortDate: row.cohortDate,
        windowKey: selectedWindowKey,
        windowLabel: selectedWindowKey.replace('day_', 'Day'),
        value,
        users,
        startUsers: row.startUsers,
      }
    }),
  },
]

const getGroupBucketValues = (groupBy: RetentionGroupBy | undefined): Array<Record<string, string>> => {
  if (!groupBy) {
    return [{}]
  }

  const valueMap: Record<string, string[]> = {
    country: ['中国', '美国', '巴西', '德国'],
    channel: ['自然量', '广告投放', '社交裂变', '应用商店'],
    coin_balance_level: ['低金币', '正常金币', '高金币'],
    active_level: ['高活跃', '中活跃', '低活跃'],
    lifecycle_stage: ['新手探索期', '激活期', '成熟期'],
    ad_position: ['金币不足弹窗', '任务中心', '结算页广告'],
    game_type: ['斗地主', '麻将', 'Slots'],
    app_version: ['1.8.3', '1.8.2', '1.8.1'],
  }
  const values = valueMap[groupBy.fieldName] ?? [`${groupBy.displayName} A`, `${groupBy.displayName} B`, `${groupBy.displayName} C`]

  return values.map((value) => ({
    [groupBy.displayName]: value,
  }))
}

export const createRetentionResult = (
  query: RetentionQueryRequest,
  metricMode: 'retention' | 'churn' = 'retention',
  selectedWindowKey = 'day_1',
): RetentionQueryResponse => {
  const columns = resolveColumns(query.retentionWindows, query.includeDay0, query.customWindows)
  const cohortDates = createDateRange(query.startDate, query.endDate)
  const enabledGroups = query.comparisonGroups.filter((group) => group.enabled)
  const rowGroups = enabledGroups.length ? enabledGroups : [{ id: 'overall', name: '全部用户' }]
  const firstGroupBy = query.groupBys[0]
  const groupBuckets = getGroupBucketValues(firstGroupBy)
  const rows: RetentionResultRow[] = cohortDates.flatMap((cohortDate, cohortIndex) =>
    rowGroups.flatMap((group, groupIndex) =>
      groupBuckets.map((groupValues, bucketIndex) => {
        const startUsers = Math.max(1200, 8600 + cohortIndex * 280 - groupIndex * 950 - bucketIndex * 780)
        const bucketKey = Object.values(groupValues).join('_') || 'overall'

        return {
          rowId: `${cohortDate}_${group.id}_${bucketKey}`,
          cohortDate,
          groupValues,
          comparisonGroupId: group.id,
          comparisonGroupName: group.name,
          startUsers,
          windows: columns.map((column) => createWindowResult(column, startUsers, cohortIndex, groupIndex * 4 + bucketIndex * 2)),
        }
      }),
    ),
  )
  const day1Window = rows.flatMap((row) => row.windows.filter((window) => window.key === 'day_1'))
  const day7Window = rows.flatMap((row) => row.windows.filter((window) => window.key === 'day_7'))
  const totalStartUsers = rows.reduce((sum, row) => sum + row.startUsers, 0)
  const retainedUsersDay1 = day1Window.reduce((sum, window) => sum + window.retainedUsers, 0)
  const retentionRateDay1 = Number(((retainedUsersDay1 / Math.max(totalStartUsers, 1)) * 100).toFixed(2))
  const retainedUsersDay7 = day7Window.reduce((sum, window) => sum + window.retainedUsers, 0)

  return {
    queryId: `retention_query_${Date.now()}`,
    executedAt: '2026-05-19T10:30:00+02:00',
    timezone: query.timezone,
    summary: {
      totalStartUsers,
      maxWindow: Math.max(...columns.map((column) => column.windowEndOffset), 0),
      aggregationMode: query.aggregationMode,
      retainedUsersDay1,
      retentionRateDay1,
      retentionRateDay7: Number(((retainedUsersDay7 / Math.max(totalStartUsers, 1)) * 100).toFixed(2)),
    },
    columns,
    rows,
    chartData: {
      trend: buildTrendSeries(rows, columns, metricMode),
      comparison: buildComparisonSeries(rows, selectedWindowKey, metricMode),
    },
  }
}

export const mockRetentionUsers: RetentionUserRecord[] = Array.from({ length: 36 }, (_, index) => ({
  userId: `u_${String(802000 + index)}`,
  startEventTime: `2026-05-${String(12 + (index % 7)).padStart(2, '0')} 09:${String(10 + index).padStart(2, '0')}`,
  returnEventTime:
    index % 4 === 0
      ? undefined
      : `2026-05-${String(13 + (index % 6)).padStart(2, '0')} 18:${String(20 + index).padStart(2, '0')}`,
  groupValue: index % 2 === 0 ? '自然量' : '广告投放',
  relationPropertyValue: index % 3 === 0 ? 'campaign_low_coin' : 'campaign_new_user',
  userLevel: index % 4 === 0 ? 'Lv.8' : 'Lv.5',
  channel: index % 2 === 0 ? 'App Store' : '巨量引擎',
  lifecycleTag: index % 5 === 0 ? '流失风险高' : '新手激活期',
}))

export const createSavedRetentionResult = (
  payload: RetentionSavedAnalysisPayload,
): { id: string; message: string } => ({
  id: `retention_saved_${Date.now()}`,
  message: `留存分析「${payload.name}」已保存`,
})

export const createRetentionDashboardResult = (
  payload: RetentionDashboardWidgetPayload,
): { id: string; message: string } => ({
  id: `retention_widget_${Date.now()}`,
  message: `组件「${payload.title}」已保存到看板`,
})
