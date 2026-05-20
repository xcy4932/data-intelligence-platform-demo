import { mockEventMetadata } from './eventAnalysis'
import type {
  FunnelActionResult,
  FunnelComparisonGroup,
  FunnelDashboardWidgetPayload,
  FunnelDurationBucket,
  FunnelGroupBy,
  FunnelGroupResult,
  FunnelMetadata,
  FunnelQueryRequest,
  FunnelQueryResponse,
  FunnelSavedAnalysisPayload,
  FunnelStep,
  FunnelStepResult,
  FunnelTemplate,
  FunnelTrendPoint,
  FunnelUserRecord,
} from '@/types/funnelAnalysis'

const cloneStep = (step: FunnelStep): FunnelStep => ({
  ...step,
  filters: step.filters.map((filter) => ({ ...filter })),
  simultaneousMetric: step.simultaneousMetric
    ? {
        ...step.simultaneousMetric,
        filters: step.simultaneousMetric.filters.map((filter) => ({ ...filter })),
      }
    : undefined,
})

export const mockActivationSteps: FunnelStep[] = [
  {
    id: 'step_ad_exposure',
    order: 1,
    eventName: 'ad_exposure',
    eventDisplayName: '广告入口曝光',
    alias: '看到广告入口',
    filters: [],
  },
  {
    id: 'step_ad_click',
    order: 2,
    eventName: 'ad_click',
    eventDisplayName: '广告点击',
    alias: '点击广告入口',
    filters: [],
  },
  {
    id: 'step_ad_start',
    order: 3,
    eventName: 'ad_watch_start',
    eventDisplayName: '广告开始播放',
    alias: '开始播放广告',
    filters: [],
  },
  {
    id: 'step_ad_complete',
    order: 4,
    eventName: 'ad_watch_complete',
    eventDisplayName: '广告观看完成',
    alias: '完成广告观看',
    filters: [],
  },
]

export const mockFunnelTemplates: FunnelTemplate[] = [
  {
    id: 'tpl_ad_watch',
    name: '广告观看漏斗',
    description: '广告入口曝光到广告观看完成的核心转化路径。',
    category: '广告',
    ownerId: 'system',
    visibility: 'public',
    config: {
      funnelMode: 'ordered',
      calculationType: 'UV',
      conversionWindow: {
        mode: 'preset',
        value: 7,
        unit: 'day',
        restrictWithinSelectedTimeRange: false,
      },
      steps: mockActivationSteps.map(cloneStep),
      relationProperties: [],
    },
    createdAt: '2026-05-01T10:00:00+02:00',
    updatedAt: '2026-05-18T10:00:00+02:00',
  },
  {
    id: 'tpl_payment',
    name: '充值转化漏斗',
    description: '商城入口曝光、商品点击、提交订单、支付成功。',
    category: '付费',
    ownerId: 'system',
    visibility: 'team',
    config: {
      funnelMode: 'ordered',
      calculationType: 'UV',
      conversionWindow: {
        mode: 'preset',
        value: 1,
        unit: 'day',
        restrictWithinSelectedTimeRange: false,
      },
      steps: [
        {
          id: 'step_payment_view',
          order: 1,
          eventName: 'app_launch',
          eventDisplayName: '应用启动',
          alias: '打开商城入口',
          filters: [],
        },
        {
          id: 'step_payment_click',
          order: 2,
          eventName: 'reward_claim',
          eventDisplayName: '奖励领取',
          alias: '查看充值权益',
          filters: [],
        },
        {
          id: 'step_payment_success',
          order: 3,
          eventName: 'payment_success',
          eventDisplayName: '支付成功',
          alias: '支付成功',
          filters: [],
        },
      ],
      relationProperties: [],
    },
    createdAt: '2026-05-03T10:00:00+02:00',
    updatedAt: '2026-05-18T11:00:00+02:00',
  },
]

export const mockFunnelMetadata: FunnelMetadata = {
  eventMetadata: mockEventMetadata,
  templates: mockFunnelTemplates,
  recommendedEvents: mockEventMetadata.events.filter((event) =>
    ['ad_exposure', 'ad_click', 'ad_watch_start', 'ad_watch_complete', 'payment_success', 'game_start'].includes(event.eventName),
  ),
}

const formatDate = (date: Date): string => date.toISOString().slice(0, 10)

const formatGroupValues = (values: Record<string, string | number>): string =>
  Object.entries(values).map(([key, value]) => `${key}: ${value}`).join(' / ') || '全部用户'

const createTimeBuckets = (startTime: string, endTime: string): string[] => {
  const buckets: string[] = []
  const cursor = new Date(`${startTime.slice(0, 10)}T00:00:00`)
  const end = new Date(`${endTime.slice(0, 10)}T00:00:00`)

  while (cursor <= end && buckets.length < 30) {
    buckets.push(formatDate(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  return buckets
}

const createStepResults = (steps: FunnelStep[], groupPenalty = 0): FunnelStepResult[] => {
  const firstCount = 128_600 - groupPenalty
  const stepConversionRates = [1, 0.68, 0.74, 0.82, 0.76, 0.71]
  const groupRatePenalty = groupPenalty / 1_200_000
  const reachedCounts = steps.reduce<number[]>((counts, _step, index) => {
    if (index === 0) {
      return [firstCount]
    }

    const previousCount = counts[index - 1] ?? firstCount
    const baseRate = stepConversionRates[index] ?? 0.72
    const adjustedRate = Math.max(baseRate - groupRatePenalty - index * 0.006, 0.35)
    return [...counts, Math.round(previousCount * adjustedRate)]
  }, [])

  return steps.map((step, index) => {
    const previousCount = index === 0 ? firstCount : reachedCounts[index - 1] ?? firstCount
    const reachedCount = reachedCounts[index] ?? 0
    const previousBase = index === 0 ? reachedCount : Math.max(previousCount, 1)
    const previousConversionRate = index === 0 ? 100 : Number(((reachedCount / previousBase) * 100).toFixed(2))
    const overallConversionRate = Number(((reachedCount / Math.max(firstCount, 1)) * 100).toFixed(2))
    const nextCount = reachedCounts[index + 1] ?? reachedCount

    return {
      stepId: step.id,
      stepOrder: index + 1,
      stepName: step.alias || step.eventDisplayName,
      reachedCount,
      lostCount: index < steps.length - 1 ? Math.max(reachedCount - nextCount, 0) : 0,
      previousConversionRate,
      overallConversionRate,
      previousLostRate: Number((100 - previousConversionRate).toFixed(2)),
      overallLostRate: Number((100 - overallConversionRate).toFixed(2)),
      avgDurationMs: (index + 1) * 68_000,
      medianDurationMs: (index + 1) * 45_000,
      simultaneousMetricValue: step.simultaneousMetric ? Math.round(reachedCount * 1.42) : undefined,
    }
  })
}

const getGroupValues = (groupBy: FunnelGroupBy | undefined): Array<Record<string, string>> => {
  if (!groupBy) {
    return [{}]
  }

  const valueMap: Record<string, string[]> = {
    channel: ['自然量', '广告投放', '社交裂变'],
    country: ['中国', '美国', '巴西'],
    app_version: ['1.8.3', '1.8.2', '1.8.1'],
    coin_balance_level: ['低金币', '正常金币', '高金币'],
    ad_position: ['金币不足弹窗', '任务中心', '结算页广告'],
    game_type: ['斗地主', '麻将', 'Slots'],
  }
  const values = valueMap[groupBy.fieldName] ?? [`${groupBy.displayName} A`, `${groupBy.displayName} B`]

  return values.map((value) => ({ [groupBy.displayName]: value }))
}

const createGroupResults = (query: FunnelQueryRequest): FunnelGroupResult[] => {
  if (query.multiPath.enabled && query.multiPath.paths.length > 0) {
    const pathGroups = [
      {
        pathName: '默认路径',
        penalty: 0,
      },
      ...query.multiPath.paths.map((path, index) => ({
        pathName: path.name,
        penalty: (index + 1) * 18_000,
      })),
    ]

    return pathGroups.map((path) => ({
      groupKey: path.pathName,
      groupValues: {
        路径: path.pathName,
      },
      steps: createStepResults(query.steps, path.penalty),
    }))
  }

  const firstGroupBy = query.groupBys[0]

  return getGroupValues(firstGroupBy).map((groupValues, index) => ({
    groupKey: Object.values(groupValues).join('_') || 'overall',
    groupValues,
    steps: createStepResults(query.steps, index * 12_000),
  }))
}

const createComparisonResults = (query: FunnelQueryRequest): FunnelGroupResult[] =>
  query.comparisonGroups
    .filter((group) => group.enabled)
    .map((group, index) => ({
      groupKey: group.id,
      groupValues: {
        对照组: group.name,
      },
      steps: createStepResults(query.steps, 18_000 + index * 16_000),
    }))

const createTrend = (steps: FunnelStep[], buckets: string[], seriesPrefix = '', valueOffset = 0): FunnelTrendPoint[] =>
  buckets.flatMap((bucket, bucketIndex) =>
    steps.slice(1).map((step, index) => ({
      timeBucket: bucket,
      seriesKey: `${seriesPrefix}${steps[index]?.alias ?? `步骤 ${index + 1}`} → ${step.alias || step.eventDisplayName}`,
      stepPair: `${steps[index]?.id ?? ''}_${step.id}`,
      value: Number((62 + index * 4 + bucketIndex * 0.35 + valueOffset).toFixed(2)),
      count: 28_000 + bucketIndex * 580 - index * 2600 - valueOffset * 120,
    })),
  )

const createDurationHistogram = (ratio = 1): FunnelDurationBucket[] => [
  { bucketStart: 0, bucketEnd: 60, count: Math.round(23800 * ratio), ratio: 20 },
  { bucketStart: 60, bucketEnd: 180, count: Math.round(41650 * ratio), ratio: 35 },
  { bucketStart: 180, bucketEnd: 300, count: Math.round(21420 * ratio), ratio: 18 },
  { bucketStart: 300, bucketEnd: 600, count: Math.round(14280 * ratio), ratio: 12 },
  { bucketStart: 600, bucketEnd: 1800, count: Math.round(17850 * ratio), ratio: 15 },
]

export const createFunnelResult = (query: FunnelQueryRequest): FunnelQueryResponse => {
  const steps = createStepResults(query.steps)
  const firstStep = steps[0]
  const finalStep = steps[steps.length - 1]
  const buckets = createTimeBuckets(query.timeConfig.startTime, query.timeConfig.endTime)
  const comparisonGroups = createComparisonResults(query)
  const comparisonTrend = comparisonGroups.flatMap((group, index) =>
    createTrend(query.steps, buckets, `${formatGroupValues(group.groupValues)} · `, -4 - index * 2),
  )

  return {
    queryId: `funnel_query_${Date.now()}`,
    executedAt: '2026-05-20T10:00:00+02:00',
    timezone: query.timezone,
    summary: {
      firstStepCount: firstStep?.reachedCount ?? 0,
      finalStepCount: finalStep?.reachedCount ?? 0,
      overallConversionRate: finalStep?.overallConversionRate ?? 0,
      totalLostCount: steps.reduce((sum, step) => sum + step.lostCount, 0),
      avgDurationMs: 286_000,
      medianDurationMs: 192_000,
    },
    steps,
    groups: createGroupResults(query),
    comparisonGroups,
    trend: createTrend(query.steps, buckets),
    comparisonTrend,
    duration: {
      histogram: createDurationHistogram(),
      boxplot: {
        min: 18_000,
        p25: 76_000,
        median: 192_000,
        avg: 286_000,
        p75: 420_000,
        max: 1_800_000,
      },
    },
    comparisonDuration: comparisonGroups.map((group, index) => ({
      groupKey: group.groupKey,
      groupName: formatGroupValues(group.groupValues),
      histogram: createDurationHistogram(Math.max(0.52, 0.82 - index * 0.14)),
      boxplot: {
        min: 22_000 + index * 8_000,
        p25: 88_000 + index * 15_000,
        median: 218_000 + index * 20_000,
        avg: 318_000 + index * 24_000,
        p75: 460_000 + index * 30_000,
        max: 1_950_000 + index * 120_000,
      },
    })),
  }
}

export const mockFunnelUsers: FunnelUserRecord[] = Array.from({ length: 38 }, (_, index) => ({
  userId: `fu_${900100 + index}`,
  firstStepTime: `2026-05-${String(1 + (index % 20)).padStart(2, '0')} 09:${String(10 + index).padStart(2, '0')}`,
  reachedStepTime: index % 5 === 0 ? undefined : `2026-05-${String(1 + (index % 20)).padStart(2, '0')} 09:${String(30 + index).padStart(2, '0')}`,
  lostAfterStepId: index % 5 === 0 ? 'step_ad_click' : undefined,
  durationMs: index % 5 === 0 ? undefined : 80_000 + index * 13_000,
  groupValue: index % 2 === 0 ? '自然量' : '广告投放',
  pathName: index % 3 === 0 ? '广告观看漏斗' : '默认路径',
  stepEvents: mockActivationSteps.map((step, stepIndex) => ({
    stepId: step.id,
    eventName: step.eventName,
    eventTime: `2026-05-${String(1 + (index % 20)).padStart(2, '0')} 09:${String(10 + index + stepIndex * 4).padStart(2, '0')}`,
  })),
}))

export const mockDefaultComparisonGroups: FunnelComparisonGroup[] = []

export const saveFunnelAnalysisResult = (payload: FunnelSavedAnalysisPayload): FunnelActionResult => ({
  success: true,
  id: `saved_funnel_${Date.now()}`,
  message: `漏斗分析「${payload.name}」已保存`,
})

export const saveFunnelDashboardResult = (payload: FunnelDashboardWidgetPayload): FunnelActionResult => ({
  success: true,
  id: `funnel_widget_${Date.now()}`,
  message: `组件「${payload.title}」已保存到看板`,
})
