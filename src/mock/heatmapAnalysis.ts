import dayjs from 'dayjs'
import type {
  HeatmapActionResult,
  HeatmapClickPoint,
  HeatmapClickedUser,
  HeatmapComparisonRow,
  HeatmapCreatePayload,
  HeatmapDashboardPayload,
  HeatmapElementStat,
  HeatmapElementSortMetric,
  HeatmapListFilter,
  HeatmapListItem,
  HeatmapMetricSnapshot,
  HeatmapPageGroup,
  HeatmapQueryConfig,
  HeatmapQueryResult,
  HeatmapReachSection,
  HeatmapSaveAnalysisPayload,
  HeatmapSharePayload,
  HeatmapTrendPoint,
  HeatmapVersion,
} from '@/types/heatmapAnalysis'

const dateFormat = 'YYYY-MM-DD'

const createMetric = (
  pv: number,
  uv: number,
  clickCount: number,
  bounceRate: number,
  avgStaySeconds: number,
  avgReachDepth: number,
): HeatmapMetricSnapshot => ({
  pv,
  uv,
  clickCount,
  bounceRate,
  avgStaySeconds,
  avgReachDepth,
  firstScreenVisibleSeconds: 5.8,
  pageClickRate: Number((clickCount / Math.max(uv, 1)).toFixed(4)),
})

const createTrend = (basePv: number, baseClick: number): HeatmapTrendPoint[] =>
  Array.from({ length: 7 }, (_, index) => {
    const date = dayjs('2026-05-20').subtract(6 - index, 'day')
    const wave = Math.sin(index / 1.7) * 0.08
    return {
      date: date.format(dateFormat),
      pv: Math.round(basePv * (0.84 + index * 0.035 + wave)),
      uv: Math.round(basePv * (0.46 + index * 0.014 + wave / 2)),
      clickCount: Math.round(baseClick * (0.78 + index * 0.04 + wave)),
    }
  })

export const mockHeatmapVersions: HeatmapVersion[] = [
  {
    id: 'hv_ysp_after',
    heatmapId: 'hm_yangshipin_home',
    versionName: '改版后',
    versionDesc: '首页首屏新增赛事直播卡片，调整推荐位排序。',
    baseUrl: 'https://www.yangshipin.cn',
    validStartTime: '2026-05-15 00:00:00',
    isDefault: true,
    archived: false,
    createdBy: 'Chaoyang Xu',
    createdAt: '2026-05-15 10:00:00',
  },
  {
    id: 'hv_ysp_before',
    heatmapId: 'hm_yangshipin_home',
    versionName: '改版前',
    versionDesc: '旧版首页布局，焦点图占据首屏核心区域。',
    baseUrl: 'https://www.yangshipin.cn',
    validStartTime: '2026-05-01 00:00:00',
    validEndTime: '2026-05-14 23:59:59',
    isDefault: false,
    archived: false,
    createdBy: 'Mia Chen',
    createdAt: '2026-05-01 09:20:00',
  },
  {
    id: 'hv_ysp_archive',
    heatmapId: 'hm_yangshipin_home',
    versionName: '春节活动版',
    versionDesc: '活动入口置顶版本，已归档用于历史复盘。',
    baseUrl: 'https://www.yangshipin.cn',
    validStartTime: '2026-02-01 00:00:00',
    validEndTime: '2026-02-18 23:59:59',
    isDefault: false,
    archived: true,
    createdBy: 'Mia Chen',
    createdAt: '2026-02-01 08:30:00',
  },
  {
    id: 'hv_mobile_default',
    heatmapId: 'hm_mobile_settlement',
    versionName: '默认版本',
    versionDesc: '小游戏结算页 App 快照。',
    baseUrl: 'demo-app://settlement',
    snapshotUrl: 'mobile_settlement_snapshot',
    validStartTime: '2026-05-10 00:00:00',
    isDefault: true,
    archived: false,
    createdBy: 'Chaoyang Xu',
    createdAt: '2026-05-10 18:30:00',
  },
  {
    id: 'hv_event_default',
    heatmapId: 'hm_yangshipin_event',
    versionName: '默认版本',
    versionDesc: '赛事详情页默认采集版本。',
    baseUrl: 'https://www.yangshipin.cn/tv/home',
    validStartTime: '2026-05-08 00:00:00',
    isDefault: true,
    archived: false,
    createdBy: 'Mia Chen',
    createdAt: '2026-05-08 14:22:00',
  },
]

export const mockHeatmapPageGroups: HeatmapPageGroup[] = [
  {
    id: 'pg_yangshipin_home',
    name: '央视频首页合并页面',
    baseUrl: 'https://www.yangshipin.cn',
    domain: 'www.yangshipin.cn',
    definitionType: 'url',
    urlRule: {
      pathOperator: 'equals',
      pagePath: '/',
      queryOperator: 'any',
      queryValue: '*',
      includeSubPath: false,
    },
    titleRule: {
      titleOperator: 'contains',
      pageTitle: '央视频',
    },
    hashRule: {
      hashEnabled: false,
      hashPathOperator: 'equals',
      hashPath: '',
      hashQueryOperator: 'empty',
      hashQueryValue: '',
    },
    previewStatus: 'matched',
    matchedPageCount: 8,
  },
  {
    id: 'pg_event_page',
    name: '赛事详情合并页面',
    baseUrl: 'https://www.yangshipin.cn/tv/home',
    domain: 'www.yangshipin.cn',
    definitionType: 'title',
    urlRule: {
      pathOperator: 'contains',
      pagePath: '/tv',
      queryOperator: 'any',
      queryValue: '*',
      includeSubPath: true,
    },
    titleRule: {
      titleOperator: 'contains',
      pageTitle: '赛事',
    },
    hashRule: {
      hashEnabled: true,
      hashPathOperator: 'contains',
      hashPath: '/home',
      hashQueryOperator: 'any',
      hashQueryValue: '*',
    },
    previewStatus: 'matched',
    matchedPageCount: 4,
  },
]

export const mockHeatmaps: HeatmapListItem[] = [
  {
    id: 'hm_yangshipin_home',
    name: '央视频首页热力图',
    platform: 'web',
    analysisTypes: ['click_heatmap', 'point_heatmap', 'reach_heatmap', 'comparison', 'clicked_users'],
    status: 'active',
    pageGroup: mockHeatmapPageGroups[0],
    currentVersionId: 'hv_ysp_after',
    currentVersionName: '改版后',
    createdBy: 'Chaoyang Xu',
    createdAt: '2026-05-01 09:12:00',
    updatedAt: '2026-05-20 19:30:00',
    lastViewedAt: '2026-05-21 10:10:00',
    description: '演示网页端点击热图、点位云图、触达率和改版对比。',
    yesterday: createMetric(248_620, 97_420, 183_960, 0.318, 84, 0.73),
    previousDay: createMetric(232_100, 91_300, 162_240, 0.337, 79, 0.69),
    trend: createTrend(236_000, 168_000),
    dashboardReferenced: true,
  },
  {
    id: 'hm_yangshipin_event',
    name: '赛事详情页点击热图',
    platform: 'web',
    analysisTypes: ['click_heatmap', 'point_heatmap', 'clicked_users'],
    status: 'active',
    pageGroup: mockHeatmapPageGroups[1],
    currentVersionId: 'hv_event_default',
    currentVersionName: '默认版本',
    createdBy: 'Mia Chen',
    createdAt: '2026-05-08 14:22:00',
    updatedAt: '2026-05-19 16:05:00',
    description: '赛事页面播放按钮、收藏按钮和推荐卡片点击复盘。',
    yesterday: createMetric(89_300, 42_100, 61_420, 0.286, 126, 0.81),
    previousDay: createMetric(84_120, 39_860, 58_100, 0.292, 119, 0.78),
    trend: createTrend(82_000, 57_000),
    dashboardReferenced: false,
  },
  {
    id: 'hm_mobile_settlement',
    name: '小游戏结算页移动热图',
    platform: 'mobile',
    analysisTypes: ['click_heatmap', 'point_heatmap', 'reach_heatmap', 'clicked_users'],
    status: 'active',
    currentVersionId: 'hv_mobile_default',
    currentVersionName: '默认版本',
    createdBy: 'Chaoyang Xu',
    createdAt: '2026-05-10 18:30:00',
    updatedAt: '2026-05-18 20:45:00',
    description: '移动端奖励领取、复玩和广告入口误点分析。',
    yesterday: createMetric(61_200, 28_640, 52_300, 0.225, 68, 0.66),
    previousDay: createMetric(59_400, 27_900, 48_760, 0.241, 63, 0.61),
    trend: createTrend(58_000, 46_000),
    dashboardReferenced: false,
  },
]

export const mockHeatmapElements: HeatmapElementStat[] = [
  {
    elementKey: 'hero_live',
    elementText: '焦点直播卡片',
    elementType: 'card',
    eventDesc: '首页焦点直播点击',
    clickCount: 42_860,
    clickUserCount: 31_240,
    clickRate: 0.321,
    clickShare: 0.233,
    exposureCount: 214_800,
    exposureUserCount: 91_300,
    exposureClickRate: 0.1995,
    x: 10,
    y: 11,
    width: 56,
    height: 14,
    visible: true,
    isClickable: true,
    rank: 1,
  },
  {
    elementKey: 'search_box',
    elementText: '搜索框',
    elementType: 'input',
    eventDesc: '搜索框点击',
    clickCount: 28_460,
    clickUserCount: 21_120,
    clickRate: 0.217,
    clickShare: 0.155,
    exposureCount: 238_900,
    exposureUserCount: 95_700,
    exposureClickRate: 0.1191,
    x: 70,
    y: 4,
    width: 20,
    height: 4,
    visible: true,
    isClickable: true,
    rank: 2,
  },
  {
    elementKey: 'vip_banner',
    elementText: '会员权益横幅',
    elementType: 'banner',
    eventDesc: '未定义',
    clickCount: 19_320,
    clickUserCount: 14_660,
    clickRate: 0.151,
    clickShare: 0.105,
    exposureCount: 180_420,
    exposureUserCount: 79_640,
    exposureClickRate: 0.1071,
    x: 11,
    y: 30,
    width: 78,
    height: 8,
    visible: true,
    isClickable: false,
    rank: 3,
  },
  {
    elementKey: 'recommend_card_1',
    elementText: '推荐内容卡片',
    elementType: 'card',
    eventDesc: '推荐内容点击',
    clickCount: 15_780,
    clickUserCount: 11_240,
    clickRate: 0.115,
    clickShare: 0.086,
    exposureCount: 152_600,
    exposureUserCount: 72_440,
    exposureClickRate: 0.1034,
    x: 10,
    y: 42,
    width: 24,
    height: 18,
    visible: true,
    isClickable: true,
    rank: 4,
  },
  {
    elementKey: 'recommend_card_2',
    elementText: '短视频推荐卡片',
    elementType: 'card',
    eventDesc: '推荐内容点击',
    clickCount: 13_960,
    clickUserCount: 10_280,
    clickRate: 0.105,
    clickShare: 0.076,
    exposureCount: 144_200,
    exposureUserCount: 69_600,
    exposureClickRate: 0.0968,
    x: 38,
    y: 42,
    width: 24,
    height: 18,
    visible: true,
    isClickable: true,
    rank: 5,
  },
  {
    elementKey: 'footer_blank',
    elementText: '底部空白区域',
    elementType: 'blank',
    eventDesc: '未定义',
    clickCount: 8_120,
    clickUserCount: 4_980,
    clickRate: 0.051,
    clickShare: 0.044,
    exposureCount: 92_340,
    exposureUserCount: 45_300,
    exposureClickRate: 0.0879,
    x: 8,
    y: 78,
    width: 84,
    height: 9,
    visible: true,
    isClickable: false,
    rank: 6,
  },
]

export const mockHeatmapPoints: HeatmapClickPoint[] = [
  { id: 'point_hero', x: 34, y: 18, count: 12_860, userCount: 9_240, elementKey: 'hero_live', elementText: '焦点直播卡片', isClickable: true, avgClickSecond: 4.2 },
  { id: 'point_search', x: 80, y: 6, count: 9_440, userCount: 7_210, elementKey: 'search_box', elementText: '搜索框', isClickable: true, avgClickSecond: 2.1 },
  { id: 'point_vip', x: 52, y: 34, count: 7_320, userCount: 4_880, elementKey: 'vip_banner', elementText: '会员权益横幅', isClickable: false, avgClickSecond: 8.6, anomalyType: 'non_clickable' },
  { id: 'point_blank', x: 74, y: 82, count: 3_620, userCount: 1_140, elementKey: 'footer_blank', elementText: '底部空白区域', isClickable: false, avgClickSecond: 61.4, anomalyType: 'blank_area' },
  { id: 'point_machine', x: 92, y: 22, count: 2_960, userCount: 240, isClickable: false, avgClickSecond: 0.8, anomalyType: 'same_coordinate' },
]

export const mockHeatmapReachSections: HeatmapReachSection[] = [
  { sectionIndex: 1, startY: 0, endY: 25, reachUserCount: 97_420, reachRate: 1, avgStayMs: 8400, clickCount: 96_200, sectionName: '首屏' },
  { sectionIndex: 2, startY: 25, endY: 50, reachUserCount: 72_680, reachRate: 0.746, avgStayMs: 6200, clickCount: 48_300, sectionName: '第二屏' },
  { sectionIndex: 3, startY: 50, endY: 75, reachUserCount: 48_920, reachRate: 0.502, avgStayMs: 4100, clickCount: 24_600, sectionName: '第三屏' },
  { sectionIndex: 4, startY: 75, endY: 100, reachUserCount: 29_320, reachRate: 0.301, avgStayMs: 2800, clickCount: 14_860, sectionName: '底部区域' },
]

export const mockHeatmapComparisonRows: HeatmapComparisonRow[] = [
  { elementKey: 'hero_live', elementText: '焦点直播卡片', leftClickCount: 31_800, rightClickCount: 42_860, clickDelta: 11_060, clickDeltaRateLabel: '+34.8%', clickRateDelta: 0.061, rankChange: '2 → 1', status: 'up' },
  { elementKey: 'search_box', elementText: '搜索框', leftClickCount: 27_900, rightClickCount: 28_460, clickDelta: 560, clickDeltaRateLabel: '+2.0%', clickRateDelta: 0.006, rankChange: '1 → 2', status: 'flat' },
  { elementKey: 'vip_banner', elementText: '会员权益横幅', leftClickCount: 6_200, rightClickCount: 19_320, clickDelta: 13_120, clickDeltaRateLabel: '+211.6%', clickRateDelta: 0.088, rankChange: '8 → 3', status: 'new' },
  { elementKey: 'recommend_card_2', elementText: '短视频推荐卡片', leftClickCount: 22_400, rightClickCount: 13_960, clickDelta: -8_440, clickDeltaRateLabel: '-37.7%', clickRateDelta: -0.043, rankChange: '3 → 5', status: 'down' },
]

export const mockClickedUsers: HeatmapClickedUser[] = Array.from({ length: 24 }, (_, index) => ({
  userId: `u_${2026052100 + index}`,
  firstClickTime: dayjs('2026-05-20 09:00:00').add(index * 13, 'minute').format('YYYY-MM-DD HH:mm:ss'),
  lastClickTime: dayjs('2026-05-20 10:20:00').add(index * 17, 'minute').format('YYYY-MM-DD HH:mm:ss'),
  clickCount: index % 5 === 0 ? 28 + index : 2 + index % 6,
  device: index % 3 === 0 ? 'Mobile' : 'PC',
  browser: index % 2 === 0 ? 'Chrome' : 'Safari',
  os: index % 3 === 0 ? 'iOS' : index % 3 === 1 ? 'Windows' : 'macOS',
  city: ['北京', '上海', '广州', '深圳', '杭州'][index % 5] ?? '北京',
  userAttributes: [
    index % 2 === 0 ? '登录用户' : '匿名用户',
    index % 3 === 0 ? '高活跃' : '中活跃',
    index % 4 === 0 ? '低金币' : '正常金币',
  ],
  anomalyTypes: index % 5 === 0 ? ['高频点击', '固定点点击'] : index % 7 === 0 ? ['超短停留点击'] : [],
}))

export const mockPreview48h = Array.from({ length: 48 }, (_, index) => ({
  hour: dayjs('2026-05-19 00:00:00').add(index, 'hour').format('MM-DD HH:mm'),
  pv: Math.round(1900 + Math.sin(index / 3) * 420 + index * 18),
}))

export const createDefaultHeatmapQuery = (heatmapId = 'hm_yangshipin_home'): HeatmapQueryConfig => {
  const heatmap = mockHeatmaps.find((item) => item.id === heatmapId) ?? mockHeatmaps[0]!
  const versions = mockHeatmapVersions.filter((version) => version.heatmapId === heatmap.id)
  const defaultVersion = versions.find((version) => version.isDefault) ?? versions[0]
  const comparisonVersion = versions.find((version) => version.id !== defaultVersion?.id && !version.archived) ?? defaultVersion

  return {
    heatmapId: heatmap.id,
    mode: 'click_heatmap',
    versionId: defaultVersion?.id ?? heatmap.currentVersionId,
    dateRange: {
      type: 'relative',
      value: 'yesterday',
      startDate: '2026-05-20',
      endDate: '2026-05-20',
    },
    deviceType: 'all',
    browser: 'all',
    os: 'all',
    userFilterText: '',
    sortMetric: 'click_count',
    topN: 20,
    selectedElementKey: 'hero_live',
    overlayOpacity: 0.7,
    showClickableElements: false,
    hideHeatLayer: false,
    pointGranularity: 'standard',
    reachSectionType: 'screen',
    comparison: {
      leftVersionId: comparisonVersion?.id ?? defaultVersion?.id ?? heatmap.currentVersionId,
      rightVersionId: defaultVersion?.id ?? heatmap.currentVersionId,
      viewMode: 'side_by_side',
      leftDateRange: {
        startDate: '2026-05-08',
        endDate: '2026-05-14',
      },
      rightDateRange: {
        startDate: '2026-05-15',
        endDate: '2026-05-20',
      },
      leftDevice: 'all',
      rightDevice: 'all',
      leftUserFilterText: '',
      rightUserFilterText: '',
    },
  }
}

export const filterHeatmaps = (heatmaps: HeatmapListItem[], filters: HeatmapListFilter): HeatmapListItem[] => {
  const keyword = filters.keyword.trim().toLowerCase()
  const filtered = heatmaps.filter((heatmap) => {
    const keywordMatched = !keyword
      || heatmap.name.toLowerCase().includes(keyword)
      || heatmap.description.toLowerCase().includes(keyword)
    const platformMatched = filters.platform === 'all' || heatmap.platform === filters.platform
    const typeMatched = filters.analysisType === 'all' || heatmap.analysisTypes.includes(filters.analysisType)
    const creatorMatched = filters.creator === 'all' || heatmap.createdBy === filters.creator
    return heatmap.status !== 'deleted' && keywordMatched && platformMatched && typeMatched && creatorMatched
  })

  const sorted = [...filtered]
  sorted.sort((left, right) => {
    if (filters.sortBy === 'created_at_desc') {
      return right.createdAt.localeCompare(left.createdAt)
    }
    if (filters.sortBy === 'yesterday_pv_desc') {
      return right.yesterday.pv - left.yesterday.pv
    }
    if (filters.sortBy === 'yesterday_click_desc') {
      return right.yesterday.clickCount - left.yesterday.clickCount
    }
    if (filters.sortBy === 'bounce_rate_desc') {
      return right.yesterday.bounceRate - left.yesterday.bounceRate
    }
    return right.updatedAt.localeCompare(left.updatedAt)
  })

  return sorted
}

const deviceMultiplier = (device: HeatmapQueryConfig['deviceType'] | undefined): number => {
  const map: Record<HeatmapQueryConfig['deviceType'], number> = {
    all: 1,
    pc: 0.8,
    mobile: 0.62,
    tablet: 0.18,
  }
  return map[device ?? 'all']
}

const filterMultiplier = (filterText: string): number => {
  if (!filterText.trim()) {
    return 1
  }

  if (filterText.includes('低金币')) {
    return 0.38
  }

  if (filterText.includes('高活跃')) {
    return 0.56
  }

  return 0.72
}

const dateRangeMultiplier = (range?: { startDate: string, endDate: string }): number => {
  if (!range) {
    return 1
  }

  const dayCount = Math.max(1, dayjs(range.endDate).diff(dayjs(range.startDate), 'day') + 1)
  return Math.min(1.45, Math.max(0.28, dayCount / 7))
}

const scaleElement = (element: HeatmapElementStat, multiplier: number, index: number): HeatmapElementStat => ({
  ...element,
  clickCount: Math.round(element.clickCount * multiplier),
  clickUserCount: Math.round(element.clickUserCount * multiplier),
  exposureCount: Math.round(element.exposureCount * multiplier),
  exposureUserCount: Math.round(element.exposureUserCount * multiplier),
  clickRate: Number(Math.min(0.96, element.clickRate * (0.92 + multiplier * 0.08)).toFixed(4)),
  clickShare: Number(Math.min(0.96, element.clickShare * (0.9 + multiplier * 0.1)).toFixed(4)),
  exposureClickRate: Number(Math.min(0.96, element.exposureClickRate * (0.9 + multiplier * 0.1)).toFixed(4)),
  rank: index + 1,
})

const scalePoint = (point: HeatmapClickPoint, multiplier: number): HeatmapClickPoint => ({
  ...point,
  count: Math.round(point.count * multiplier),
  userCount: Math.round(point.userCount * multiplier),
})

const createPointsByGranularity = (query: HeatmapQueryConfig, multiplier: number): HeatmapClickPoint[] => {
  const scaledPoints = mockHeatmapPoints.map((point) => scalePoint(point, multiplier))

  if (query.pointGranularity === 'fine') {
    return scaledPoints.flatMap((point, index) => [
      point,
      {
        ...point,
        id: `${point.id}_near_${index}`,
        x: Math.min(98, point.x + 1.2),
        y: Math.min(98, point.y + 0.9),
        count: Math.round(point.count * 0.32),
        userCount: Math.round(point.userCount * 0.28),
        anomalyType: undefined,
      },
    ])
  }

  if (query.pointGranularity === 'coarse') {
    return [
      {
        id: 'point_bucket_top',
        x: 46,
        y: 18,
        count: Math.round((scaledPoints[0]?.count ?? 0) + (scaledPoints[1]?.count ?? 0)),
        userCount: Math.round((scaledPoints[0]?.userCount ?? 0) + (scaledPoints[1]?.userCount ?? 0) * 0.82),
        elementKey: 'hero_live',
        elementText: '首屏核心区域',
        isClickable: true,
        avgClickSecond: 3.4,
      },
      {
        id: 'point_bucket_middle',
        x: 52,
        y: 42,
        count: Math.round((scaledPoints[2]?.count ?? 0) + (scaledPoints[3]?.count ?? 0) * 0.45),
        userCount: Math.round((scaledPoints[2]?.userCount ?? 0) + (scaledPoints[3]?.userCount ?? 0) * 0.36),
        elementKey: 'vip_banner',
        elementText: '中部内容区域',
        isClickable: false,
        avgClickSecond: 15.8,
        anomalyType: 'non_clickable',
      },
      {
        id: 'point_bucket_abnormal',
        x: 84,
        y: 54,
        count: Math.round((scaledPoints[3]?.count ?? 0) + (scaledPoints[4]?.count ?? 0)),
        userCount: Math.round((scaledPoints[3]?.userCount ?? 0) + (scaledPoints[4]?.userCount ?? 0)),
        elementText: '异常点击聚合区',
        isClickable: false,
        avgClickSecond: 22.6,
        anomalyType: 'same_coordinate',
      },
    ]
  }

  return scaledPoints
}

const createReachSectionsByType = (query: HeatmapQueryConfig, multiplier: number): HeatmapReachSection[] => {
  if (query.reachSectionType === 'percent') {
    return mockHeatmapReachSections.map((section, index) => ({
      ...section,
      sectionName: `${index * 25}-${(index + 1) * 25}%`,
      reachUserCount: Math.round(section.reachUserCount * multiplier),
      clickCount: Math.round(section.clickCount * multiplier),
      avgStayMs: Math.round(section.avgStayMs * (0.9 + multiplier * 0.1)),
    }))
  }

  return mockHeatmapReachSections.map((section) => ({
    ...section,
    reachUserCount: Math.round(section.reachUserCount * multiplier),
    clickCount: Math.round(section.clickCount * multiplier),
    avgStayMs: Math.round(section.avgStayMs * (0.9 + multiplier * 0.1)),
  }))
}

const createComparisonRows = (query: HeatmapQueryConfig): HeatmapComparisonRow[] => {
  const leftMultiplier = deviceMultiplier(query.comparison.leftDevice)
    * dateRangeMultiplier(query.comparison.leftDateRange)
    * filterMultiplier(query.comparison.leftUserFilterText ?? '')
  const rightMultiplier = deviceMultiplier(query.comparison.rightDevice)
    * dateRangeMultiplier(query.comparison.rightDateRange)
    * filterMultiplier(query.comparison.rightUserFilterText ?? '')

  return mockHeatmapComparisonRows.map((row) => {
    const leftClickCount = Math.round(row.leftClickCount * leftMultiplier)
    const rightClickCount = Math.round(row.rightClickCount * rightMultiplier)
    const clickDelta = rightClickCount - leftClickCount
    const clickDeltaRateLabel = leftClickCount === 0
      ? rightClickCount > 0 ? '新增' : '--'
      : `${clickDelta > 0 ? '+' : ''}${((clickDelta / leftClickCount) * 100).toFixed(1)}%`
    const rawRateDelta = row.clickRateDelta * (0.84 + rightMultiplier * 0.16) - (leftMultiplier - 1) * 0.02
    const status: HeatmapComparisonRow['status'] = leftClickCount === 0 && rightClickCount > 0
      ? 'new'
      : rightClickCount === 0 && leftClickCount > 0
        ? 'disappeared'
        : Math.abs(clickDelta) < 600
          ? 'flat'
          : clickDelta > 0 ? 'up' : 'down'

    return {
      ...row,
      leftClickCount,
      rightClickCount,
      clickDelta,
      clickDeltaRateLabel,
      clickRateDelta: Number(rawRateDelta.toFixed(4)),
      status,
    }
  })
}

export const createHeatmapResult = (
  heatmaps: HeatmapListItem[],
  versions: HeatmapVersion[],
  query: HeatmapQueryConfig,
): HeatmapQueryResult => {
  const heatmap = heatmaps.find((item) => item.id === query.heatmapId) ?? heatmaps[0]!
  const heatmapVersions = versions.filter((version) => version.heatmapId === heatmap.id)
  const currentVersion = heatmapVersions.find((version) => version.id === query.versionId)
    ?? heatmapVersions.find((version) => version.isDefault)
    ?? heatmapVersions[0]
    ?? {
      id: heatmap.currentVersionId,
      heatmapId: heatmap.id,
      versionName: heatmap.currentVersionName,
      versionDesc: '默认演示版本。',
      baseUrl: heatmap.pageGroup?.baseUrl ?? 'demo-app://heatmap',
      isDefault: true,
      archived: false,
      createdBy: heatmap.createdBy,
      createdAt: heatmap.createdAt,
    }
  const metricMultiplier = deviceMultiplier(query.deviceType) * filterMultiplier(query.userFilterText)
  const summary = createMetric(
    Math.round(heatmap.yesterday.pv * metricMultiplier),
    Math.round(heatmap.yesterday.uv * metricMultiplier),
    Math.round(heatmap.yesterday.clickCount * metricMultiplier),
    heatmap.yesterday.bounceRate,
    heatmap.yesterday.avgStaySeconds,
    heatmap.yesterday.avgReachDepth,
  )
  const metricFieldMap: Record<HeatmapElementSortMetric, keyof HeatmapElementStat> = {
    click_count: 'clickCount',
    click_user_count: 'clickUserCount',
    click_rate: 'clickRate',
    click_share: 'clickShare',
    exposure_click_rate: 'exposureClickRate',
  }
  const metricField = metricFieldMap[query.sortMetric]
  const sortedElements = [...mockHeatmapElements].sort((left, right) => {
    const leftValue = left[metricField]
    const rightValue = right[metricField]
    return Number(rightValue) - Number(leftValue)
  })
  const scaledElements = sortedElements
    .map((element, index) => scaleElement(element, metricMultiplier, index))

  return {
    heatmap,
    versions: heatmapVersions,
    currentVersion,
    summary,
    elements: scaledElements.slice(0, query.topN),
    points: createPointsByGranularity(query, metricMultiplier),
    reachSections: createReachSectionsByType(query, metricMultiplier),
    comparisonRows: createComparisonRows(query),
    warnings: [
      '当前演示假设 SDK 与全埋点已接入，数据为 T+1 mock 结果。',
      '目标网页可能禁止 iframe 嵌入，系统已提供演示底图与“在原页面打开”。',
      '部分 SVG 元素默认可能无法采集点击数据，建议开启 SVG 采集。',
    ],
    queriedAt: '2026-05-21 10:30:00',
  }
}

export const createHeatmapFromPayload = (payload: HeatmapCreatePayload, index: number): {
  heatmap: HeatmapListItem
  version: HeatmapVersion
} => {
  const heatmapId = `hm_created_${Date.now()}_${index}`
  const versionId = `hv_created_${Date.now()}_${index}`
  const version: HeatmapVersion = {
    id: versionId,
    heatmapId,
    versionName: payload.version.versionName,
    versionDesc: payload.version.versionDesc,
    baseUrl: payload.version.baseUrl,
    snapshotUrl: payload.version.snapshotUrl,
    validStartTime: payload.version.validStartTime,
    validEndTime: payload.version.validEndTime,
    isDefault: true,
    archived: false,
    createdBy: 'Chaoyang Xu',
    createdAt: '2026-05-21 10:30:00',
  }
  const heatmap: HeatmapListItem = {
    id: heatmapId,
    name: payload.name,
    platform: payload.platform,
    analysisTypes: payload.analysisTypes,
    status: 'active',
    pageGroup: payload.platform === 'web' ? payload.pageGroup : undefined,
    currentVersionId: versionId,
    currentVersionName: version.versionName,
    createdBy: 'Chaoyang Xu',
    createdAt: '2026-05-21 10:30:00',
    updatedAt: '2026-05-21 10:30:00',
    description: payload.description,
    yesterday: createMetric(36_400, 18_200, 24_960, 0.27, 74, 0.68),
    previousDay: createMetric(34_600, 17_900, 23_100, 0.29, 70, 0.64),
    trend: createTrend(35_000, 24_000),
    dashboardReferenced: false,
  }

  return { heatmap, version }
}

export const createHeatmapActionResult = (message: string, prefix: string): HeatmapActionResult => ({
  success: true,
  id: `${prefix}_${Date.now()}`,
  message,
})

export const createSavedHeatmapResult = (_payload: HeatmapSaveAnalysisPayload): HeatmapActionResult =>
  createHeatmapActionResult('热力图分析配置已保存。', 'saved_heatmap')

export const createDashboardHeatmapResult = (_payload: HeatmapDashboardPayload): HeatmapActionResult =>
  createHeatmapActionResult('已保存到看板。', 'heatmap_widget')

export const createShareHeatmapResult = (payload: HeatmapSharePayload): HeatmapActionResult => ({
  ...createHeatmapActionResult('分享链接已创建。', 'heatmap_share'),
  shareUrl: `https://demo.dataops.local/share/heatmap/${encodeURIComponent(payload.shareName)}`,
  qrCodeText: `HEATMAP_SHARE:${payload.shareName}:${payload.scope}:${payload.specifiedTargets?.length ?? 0}:${payload.expiresInDays}d`,
})
