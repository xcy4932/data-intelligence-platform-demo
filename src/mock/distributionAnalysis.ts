import { mockEventMetadata } from './eventAnalysis'
import type {
  DistributionActionResult,
  DistributionAggregator,
  DistributionBucketConfig,
  DistributionBucketResult,
  DistributionComparisonGroup,
  DistributionDashboardWidgetPayload,
  DistributionDetailRow,
  DistributionGroupBy,
  DistributionMetadata,
  DistributionQueryRequest,
  DistributionQueryResponse,
  DistributionRange,
  DistributionSavedAnalysisPayload,
  DistributionTrendPoint,
  DistributionUserFilterConfig,
} from '@/types/distributionAnalysis'

export const mockDistributionMetadata: DistributionMetadata = {
  eventMetadata: mockEventMetadata,
  recommendedEvents: mockEventMetadata.events.filter((event) =>
    ['app_launch', 'ad_watch_complete', 'game_end', 'payment_success', 'reward_claim'].includes(event.eventName),
  ),
}

export const defaultDistributionFilter: DistributionUserFilterConfig = {
  relation: 'AND',
  conditions: [],
}

export const defaultDistributionGroupBys: DistributionGroupBy[] = []

export const defaultDistributionComparisonGroups: DistributionComparisonGroup[] = [
  {
    id: 'distribution_compare_low_coin',
    name: '低金币用户',
    color: '#d03050',
    enabled: false,
    userFilter: {
      relation: 'AND',
      conditions: [
        {
          id: 'distribution_compare_low_coin_filter',
          logic: 'AND',
          sourceType: 'user_tag',
          field: 'coin_balance_level',
          fieldDisplayName: '金币余额等级',
          operator: 'equals',
          value: 'low',
          displayValue: '低金币',
        },
      ],
    },
  },
]

export const presetFrequencyRanges: DistributionRange[] = [
  { id: 'r_1', label: '1 次', min: 1, max: 1, leftClosed: true, rightClosed: true },
  { id: 'r_2', label: '2 次', min: 2, max: 2, leftClosed: true, rightClosed: true },
  { id: 'r_3', label: '3 次', min: 3, max: 3, leftClosed: true, rightClosed: true },
  { id: 'r_4', label: '4 次', min: 4, max: 4, leftClosed: true, rightClosed: true },
  { id: 'r_5', label: '5 次', min: 5, max: 5, leftClosed: true, rightClosed: true },
  { id: 'r_6_10', label: '6-10 次', min: 6, max: 10, leftClosed: true, rightClosed: true },
  { id: 'r_11_20', label: '11-20 次', min: 11, max: 20, leftClosed: true, rightClosed: true },
  { id: 'r_21_50', label: '21-50 次', min: 21, max: 50, leftClosed: true, rightClosed: true },
  { id: 'r_51_100', label: '51-100 次', min: 51, max: 100, leftClosed: true, rightClosed: true },
  { id: 'r_100_plus', label: '100 次以上', min: 101, leftClosed: true, rightClosed: false },
]

const aggregatorBaseMap: Record<DistributionAggregator, number> = {
  PV: 16,
  ACTIVE_DAYS: 5,
  ACTIVE_HOURS: 8,
  SUM: 420,
  AVG: 68,
  MAX: 180,
  MIN: 18,
  DISTINCT: 6,
  FIRST: 4,
  LAST: 4,
}

const createAutoRanges = (bucketCount: number, maxValue: number): DistributionRange[] => {
  const width = Math.max(Math.ceil(maxValue / bucketCount), 1)

  return Array.from({ length: bucketCount }, (_, index) => {
    const min = index * width
    const max = index === bucketCount - 1 ? undefined : (index + 1) * width - 1
    return {
      id: `auto_${index}`,
      label: max === undefined ? `${min}+` : `${min}-${max}`,
      min,
      max,
      leftClosed: true,
      rightClosed: true,
    }
  })
}

const resolveRanges = (config: DistributionBucketConfig, aggregator: DistributionAggregator): DistributionRange[] => {
  if (config.mode === 'preset_frequency') {
    return presetFrequencyRanges
  }

  if (config.mode === 'equal_width') {
    return createAutoRanges(config.bucketCount ?? 5, aggregatorBaseMap[aggregator] * 4)
  }

  if (config.mode === 'custom_equal_width') {
    const start = config.start ?? 0
    const end = config.end ?? 100
    const width = Math.max(config.width ?? 10, 1)
    const count = Math.min(Math.ceil((end - start) / width), 100)
    return Array.from({ length: count }, (_, index) => {
      const min = start + index * width
      const max = Math.min(min + width, end)
      return {
        id: `custom_equal_${index}`,
        label: `${min}-${max}`,
        min,
        max,
        leftClosed: true,
        rightClosed: index === count - 1,
      }
    })
  }

  if (config.mode === 'custom_ranges' && config.ranges.length) {
    return config.ranges
  }

  if (config.mode === 'enum_values') {
    return ['自然量', '广告投放', '社交裂变', '未知'].map((label, index) => ({
      id: `enum_${index}`,
      label,
      min: index,
      max: index,
      leftClosed: true,
      rightClosed: true,
    }))
  }

  return createAutoRanges(6, aggregatorBaseMap[aggregator] * 3)
}

const createTimeBuckets = (startDate: string, endDate: string): string[] => {
  const buckets: string[] = []
  const cursor = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  while (cursor <= end && buckets.length < 31) {
    buckets.push(cursor.toISOString().slice(0, 10))
    cursor.setDate(cursor.getDate() + 1)
  }
  return buckets
}

const createDistributionCount = (rangeIndex: number, rangeCount: number, groupIndex: number): number => {
  const center = (rangeCount - 1) / 2
  const distance = Math.abs(rangeIndex - center)
  const base = 5200 - distance * 820
  const longTail = rangeIndex === rangeCount - 1 ? 780 : 0
  return Math.max(Math.round(base - groupIndex * 360 + longTail), 260)
}

const createGroupNames = (query: DistributionQueryRequest): string[] => {
  if (query.groupBys[0]?.fieldName === 'channel') {
    return ['自然量', '广告投放', '社交裂变']
  }

  if (query.groupBys[0]?.fieldName === 'coin_balance_level') {
    return ['低金币', '正常金币', '高金币']
  }

  return ['全部用户']
}

export const createDistributionResult = (query: DistributionQueryRequest): DistributionQueryResponse => {
  const aggregator = query.metric.aggregator ?? 'PV'
  const ranges = resolveRanges(query.bucketConfig, aggregator)
  const groupNames = createGroupNames(query)
  const compareNames = query.comparisonGroups.filter((group) => group.enabled).map((group) => group.name)
  const seriesNames = compareNames.length ? ['当前用户', ...compareNames] : ['']
  const timeBuckets = createTimeBuckets(query.timeRange.startDate, query.timeRange.endDate)

  const buckets: DistributionBucketResult[] = seriesNames.flatMap((comparisonName, comparisonIndex) =>
    groupNames.flatMap((groupName, groupIndex) => {
      const counts = ranges.map((range, rangeIndex) =>
        Math.round(createDistributionCount(rangeIndex, ranges.length, groupIndex) * (comparisonIndex ? 0.68 - comparisonIndex * 0.08 : 1)),
      )
      const total = counts.reduce((sum, count) => sum + count, 0)
      return ranges.map((range, rangeIndex) => ({
        bucketId: range.id,
        bucketLabel: range.label,
        min: range.min,
        max: range.max,
        subjectCount: counts[rangeIndex] ?? 0,
        ratio: Number((((counts[rangeIndex] ?? 0) / Math.max(total, 1)) * 100).toFixed(2)),
        groupName,
        comparisonGroupName: comparisonName || undefined,
      }))
    }),
  )

  const trend: DistributionTrendPoint[] = timeBuckets.flatMap((timeBucket, timeIndex) =>
    buckets.map((bucket, bucketIndex) => {
      const wave = 0.86 + ((timeIndex + bucketIndex) % 5) * 0.05
      const subjectCount = Math.round(bucket.subjectCount * wave)
      return {
        timeBucket,
        bucketLabel: bucket.bucketLabel,
        groupName: bucket.groupName,
        comparisonGroupName: bucket.comparisonGroupName,
        subjectCount,
        ratio: Number((bucket.ratio * (0.94 + (timeIndex % 4) * 0.02)).toFixed(2)),
      }
    }),
  )

  const details: DistributionDetailRow[] = buckets.map((bucket, index) => {
    const avgMetricValue = Number((((bucket.min ?? index) + (bucket.max ?? (bucket.min ?? index) + 12)) / 2).toFixed(2))
    return {
      key: `${bucket.comparisonGroupName ?? 'base'}_${bucket.groupName}_${bucket.bucketId}`,
      bucketLabel: bucket.bucketLabel,
      groupName: bucket.groupName,
      comparisonGroupName: bucket.comparisonGroupName ?? '-',
      subjectCount: bucket.subjectCount,
      ratio: bucket.ratio,
      avgMetricValue,
      minMetricValue: bucket.min ?? 0,
      maxMetricValue: bucket.max ?? avgMetricValue * 1.8,
      sampleSubjects: [`u_${9000 + index}`, `u_${9100 + index}`, `u_${9200 + index}`],
      timeSeries: timeBuckets.map((timeBucket, timeIndex) => ({
        timeBucket,
        subjectCount: Math.round(bucket.subjectCount * (0.08 + (timeIndex % 5) * 0.006)),
        ratio: Number((bucket.ratio * (0.96 + (timeIndex % 3) * 0.02)).toFixed(2)),
      })),
      children: timeBuckets.map((timeBucket, timeIndex) => ({
        key: `${bucket.comparisonGroupName ?? 'base'}_${bucket.groupName}_${bucket.bucketId}_${timeBucket}`,
        bucketLabel: timeBucket,
        groupName: bucket.groupName,
        comparisonGroupName: bucket.comparisonGroupName ?? '-',
        subjectCount: Math.round(bucket.subjectCount * (0.08 + (timeIndex % 5) * 0.006)),
        ratio: Number((bucket.ratio * (0.96 + (timeIndex % 3) * 0.02)).toFixed(2)),
        avgMetricValue,
        minMetricValue: bucket.min ?? 0,
        maxMetricValue: bucket.max ?? avgMetricValue * 1.8,
        sampleSubjects: [`u_${9000 + index}_${timeIndex}`],
        timeSeries: [],
      })),
    }
  })

  const totalSubjects = buckets.reduce((sum, bucket) => sum + bucket.subjectCount, 0)
  const peakBucket = buckets.reduce((peak, bucket) => bucket.subjectCount > peak.subjectCount ? bucket : peak, buckets[0] ?? {
    bucketId: '',
    bucketLabel: '-',
    subjectCount: 0,
    ratio: 0,
    groupName: '',
  })

  return {
    queryId: `distribution_query_${Date.now()}`,
    executedAt: '2026-05-21T10:00:00+02:00',
    timezone: query.timezone,
    summary: {
      totalSubjects,
      validSubjects: Math.round(totalSubjects * 0.96),
      nullSubjects: Math.round(totalSubjects * 0.04),
      peakBucketLabel: peakBucket.bucketLabel,
      peakBucketRatio: peakBucket.ratio,
      avgMetricValue: Number((aggregatorBaseMap[aggregator] * 1.18).toFixed(2)),
    },
    buckets,
    trend,
    details,
  }
}

export const createSavedDistributionResult = (payload: DistributionSavedAnalysisPayload): DistributionActionResult => ({
  success: true,
  id: `distribution_saved_${Date.now()}`,
  message: `分布分析「${payload.name}」已保存。`,
})

export const createDistributionDashboardResult = (payload: DistributionDashboardWidgetPayload): DistributionActionResult => ({
  success: true,
  id: `distribution_widget_${Date.now()}`,
  message: `组件「${payload.widgetName}」已保存到看板。`,
})
