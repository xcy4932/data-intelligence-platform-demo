import dayjs from 'dayjs'
import type { EntityId } from '@/types/common'
import type {
  LifecycleAuditLog,
  LifecycleAuthorization,
  LifecycleBackendAuditRecord,
  LifecycleBusinessChart,
  LifecycleExportSegmentLog,
  LifecyclePath,
  LifecyclePathEdge,
  LifecyclePathNode,
  LifecyclePermissionSet,
  LifecycleProjectAuthorizationLink,
  LifecycleReport,
  LifecycleResourcePermissionSnapshot,
  LifecycleStage,
  LifecycleStageSnapshot,
} from '@/types/lifecycleAnalysis'

const nowDate = dayjs('2026-05-26')

export const lifecyclePermissionSet: LifecyclePermissionSet = {
  viewReport: true,
  editReport: true,
  managePath: true,
  manageReport: true,
  createSegment: true,
  viewGroupProfile: true,
  manageAuthorization: true,
  deleteLifecycleTag: true,
  projectAdmin: true,
  tagResourceView: true,
  downloadChartData: true,
}

export const readOnlyLifecyclePermissionSet: LifecyclePermissionSet = {
  viewReport: true,
  editReport: false,
  managePath: false,
  manageReport: false,
  createSegment: false,
  viewGroupProfile: false,
  manageAuthorization: false,
  deleteLifecycleTag: false,
  projectAdmin: false,
  tagResourceView: true,
  downloadChartData: false,
}

export const disabledPermissionSet: LifecyclePermissionSet = {
  ...lifecyclePermissionSet,
  editReport: false,
  managePath: false,
  createSegment: false,
  viewGroupProfile: false,
}

const allLifecycleEvents = ['ad_exposure', 'ad_click', 'product_detail_view', 'test_drive_booked', 'payment_success', 'repeat_purchase', 'coupon_receive', 'service_consult']
const allLifecycleSegments = ['', 'seg-active-30d', 'seg-private-high-value', 'seg-ad-touch', 'seg-dormant-risk', 'seg-reactivated-14d']

const resourceSnapshot = (
  reportId: EntityId,
  tagId: EntityId,
  subjectType: string,
  overrides: Partial<LifecycleResourcePermissionSnapshot> = {},
): LifecycleResourcePermissionSnapshot => ({
  allowedSubjectTypes: [subjectType],
  allowedTagIds: [tagId, 'tag-consume-level', 'tag-channel-preference', 'tag-car-interest'],
  allowedEventNames: allLifecycleEvents,
  allowedSegmentIds: allLifecycleSegments,
  rowAccessRatio: 1,
  projectAuthorizationId: `project-auth-${reportId}`,
  projectAuthorizationName: '项目中心 / 按内容管理 / 生命周期分析资源',
  syncedAt: '2026-05-26T08:10:00+02:00',
  deniedReasons: {},
  ...overrides,
})

const aiplStages: LifecycleStage[] = [
  { value: 'A', name: '认知', english: 'Awareness', description: '用户被动接触品牌，对品牌有初步了解', color: '#2563eb', order: 1, visible: true },
  { value: 'I', name: '兴趣', english: 'Interest', description: '用户主动接触品牌，例如点击广告、互动、预约体验', color: '#16a34a', order: 2, visible: true },
  { value: 'P', name: '购买', english: 'Purchase', description: '用户已完成购买行为', color: '#f59e0b', order: 3, visible: true },
  { value: 'L', name: '忠诚', english: 'Loyalty', description: '用户形成复购、推荐、口碑传播等忠诚行为', color: '#dc2626', order: 4, visible: true },
]

const fiveAStages: LifecycleStage[] = [
  { value: 'A1', name: '了解', english: 'Aware', description: '用户初步知道品牌存在', color: '#0f766e', order: 1, visible: true },
  { value: 'A2', name: '吸引', english: 'Appeal', description: '用户对品牌形成好感或兴趣', color: '#2563eb', order: 2, visible: true },
  { value: 'A3', name: '问询', english: 'Ask', description: '用户主动搜索、咨询或收集信息', color: '#7c3aed', order: 3, visible: true },
  { value: 'A4', name: '行动', english: 'Act', description: '用户完成购买或关键转化行为', color: '#f97316', order: 4, visible: true },
  { value: 'A5', name: '拥护', english: 'Advocate', description: '用户形成忠诚并愿意推荐品牌', color: '#be123c', order: 5, visible: true },
]

const leadStages: LifecycleStage[] = [
  { value: 'NEW', name: '新线索', english: 'New Lead', description: '近期入库但尚未触达的线索', color: '#0891b2', order: 1, visible: true },
  { value: 'FOLLOW', name: '跟进中', english: 'Following', description: '已被销售或运营触达的线索', color: '#4f46e5', order: 2, visible: true },
  { value: 'INVALID', name: '沉默', english: 'Silent', description: '长期未响应或暂无转化意愿的线索', color: '#64748b', order: 3, visible: true },
]

const retentionStages: LifecycleStage[] = [
  { value: 'NEW', name: '新客', english: 'New', description: '首次进入品牌可运营池的用户', color: '#0284c7', order: 1, visible: true },
  { value: 'ACTIVE', name: '活跃', english: 'Active', description: '近期持续访问、互动或消费的用户', color: '#16a34a', order: 2, visible: true },
  { value: 'RISK', name: '风险', english: 'At Risk', description: '活跃度明显下降，存在流失风险', color: '#eab308', order: 3, visible: true },
  { value: 'SILENT', name: '沉默', english: 'Silent', description: '长期无关键行为，需要召回', color: '#64748b', order: 4, visible: true },
  { value: 'RETURN', name: '回流', english: 'Return', description: '被召回后重新发生关键行为', color: '#be123c', order: 5, visible: true },
]

const report = (
  id: EntityId,
  tagId: EntityId,
  name: string,
  subjectType: string,
  subjectName: string,
  stages: LifecycleStage[],
  creatorId: EntityId,
  creatorName: string,
  createdAt: string,
  overrides: Partial<LifecycleReport> = {},
): LifecycleReport => ({
  id,
  tagId,
  tagName: name,
  name,
  subjectType,
  subjectName,
  stages,
  creatorId,
  creatorName,
  createdAt,
  updatedAt: '2026-05-26T08:20:00+02:00',
  latestDataDate: '2026-05-26',
  maxDataDate: '2026-05-26',
  status: 'enabled',
  permissions: lifecyclePermissionSet,
  resourcePermissions: resourceSnapshot(id, tagId, subjectType),
  ...overrides,
})

export const lifecycleReports: LifecycleReport[] = [
  report('lcr-aipl-user', 'tag-lifecycle-aipl', 'AIPL 用户生命周期', 'user', '用户', aiplStages, 'u-growth', '林哲', '2026-04-10T09:00:00+02:00'),
  report('lcr-5a-member', 'tag-lifecycle-5a', '5A 会员生命周期', 'member', '会员', fiveAStages, 'u-insight', '许澄', '2026-04-18T14:25:00+02:00', {
    updatedAt: '2026-05-25T17:45:00+02:00',
    resourcePermissions: resourceSnapshot('lcr-5a-member', 'tag-lifecycle-5a', 'member', {
      allowedStageValues: ['A1', 'A2', 'A3', 'A4'],
      allowedEventNames: ['product_detail_view', 'payment_success', 'repeat_purchase'],
      allowedSegmentIds: ['', 'seg-active-30d', 'seg-private-high-value'],
      rowAccessRatio: 0.86,
      deniedReasons: {
        repeat_purchase_raw: '会员复购明细受行权限约束，已按当前授权过滤。',
        ad_exposure: '未授权广告曝光事件资源。',
      },
    }),
  }),
  report('lcr-lead-disabled', 'tag-lifecycle-lead', '线索生命周期', 'lead', '线索', leadStages, 'u-sales', '陈乔', '2026-05-03T11:10:00+02:00', {
    status: 'disabled',
    latestDataDate: '2026-05-20',
    maxDataDate: '2026-05-20',
    permissions: disabledPermissionSet,
    resourcePermissions: resourceSnapshot('lcr-lead-disabled', 'tag-lifecycle-lead', 'lead', {
      allowedTagIds: ['tag-lifecycle-lead'],
      allowedEventNames: ['test_drive_booked'],
      rowAccessRatio: 0.72,
      deniedReasons: {
        tag_car_interest: '仅线索生命周期标签已授权，其他底层兴趣标签不可见。',
      },
    }),
    unavailableReason: '生命周期标签已被禁用，报告不可正常分析，请先在标签体系中启用该标签。',
  }),
  report('lcr-retention-user', 'tag-lifecycle-retention', '用户留存生命周期', 'user', '用户', retentionStages, 'u-retention', '唐宁', '2026-05-06T15:20:00+02:00', {
    updatedAt: '2026-05-26T10:12:00+02:00',
    resourcePermissions: resourceSnapshot('lcr-retention-user', 'tag-lifecycle-retention', 'user', {
      allowedStageValues: ['NEW', 'ACTIVE', 'RISK', 'RETURN'],
      allowedTagIds: ['tag-lifecycle-retention', 'tag-channel-preference', 'tag-consume-level'],
      allowedEventNames: ['ad_click', 'product_detail_view', 'payment_success', 'repeat_purchase'],
      allowedSegmentIds: ['', 'seg-active-30d', 'seg-dormant-risk', 'seg-reactivated-14d'],
      rowAccessRatio: 0.64,
      deniedReasons: {
        silent_stage: '沉默阶段涉及高敏沉睡用户资产，当前角色不可查看。',
        ad_exposure: '未授权广告曝光明细事件，仅允许查看点击和转化事件。',
      },
    }),
  }),
  report('lcr-demo-aipl', 'tag-demo-lifecycle-aipl', 'Demo - AIPL 生命周期样例', 'user', '用户', aiplStages, 'system', '系统预置', '2026-05-01T09:00:00+02:00', {
    isDemo: true,
    permissions: readOnlyLifecyclePermissionSet,
    resourcePermissions: resourceSnapshot('lcr-demo-aipl', 'tag-demo-lifecycle-aipl', 'user'),
  }),
]

const growthRate = (current: number, previous: number): { value: number | null; reason?: string } => {
  if (previous === 0 && current === 0) {
    return { value: 0 }
  }
  if (previous === 0 && current > 0) {
    return { value: null, reason: '前日人数为0，无法计算环比' }
  }
  return { value: Number(((current / previous - 1) * 100).toFixed(2)) }
}

const buildSnapshots = (currentReport: LifecycleReport, seed: number): LifecycleStageSnapshot[] => {
  const result: LifecycleStageSnapshot[] = []
  currentReport.stages.forEach((stage, stageIndex) => {
    const base = Math.max(0, seed - stageIndex * 5200)
    let previous = 0
    for (let offset = 370; offset >= 0; offset -= 1) {
      const date = nowDate.subtract(offset, 'day')
      const dayIndex = 370 - offset
      const seasonal = Math.sin((dayIndex + stageIndex * 9) / 15) * (780 - stageIndex * 60)
      const trend = dayIndex * (28 + stageIndex * 8)
      const launchLift = date.isAfter(dayjs('2026-05-08')) ? 900 - stageIndex * 120 : 0
      const disabledDrop = currentReport.status === 'disabled' && date.isAfter(dayjs('2026-05-20')) ? base + trend : 0
      const total = Math.max(0, Math.round(base + trend + seasonal + launchLift - disabledDrop))
      const newCount = offset === 370 ? Math.round(total * 0.04) : Math.max(0, Math.round(Math.max(total - previous, total * (0.012 + stageIndex * 0.003))))
      const lostCount = offset === 370 ? 0 : Math.max(0, Math.round(Math.max(previous - total, total * (0.008 + stageIndex * 0.002))))
      const rate = growthRate(total, previous)
      result.push({
        id: `${currentReport.id}-${stage.value}-${date.format('YYYYMMDD')}`,
        reportId: currentReport.id,
        stageValue: stage.value,
        date: date.format('YYYY-MM-DD'),
        totalCount: total,
        previousTotalCount: previous,
        dayGrowthRate: rate.value,
        noComparableReason: rate.reason,
        newCount,
        lostCount,
      })
      previous = total
    }
  })
  return result
}

export const lifecycleStageSnapshots: LifecycleStageSnapshot[] = [
  ...buildSnapshots(lifecycleReports[0]!, 36500),
  ...buildSnapshots(lifecycleReports[1]!, 28600),
  ...buildSnapshots(lifecycleReports[2]!, 7200),
  ...buildSnapshots(lifecycleReports[3]!, 24500),
  ...buildSnapshots(lifecycleReports[4]!, 41800),
]

export const lifecycleBusinessCharts: LifecycleBusinessChart[] = [
  {
    id: 'lcc-ad-exposure',
    reportId: 'lcr-aipl-user',
    title: '认知阶段广告曝光次数',
    stageValues: ['A'],
    chartType: 'line',
    dimension: 'time',
    metric: '行为次数',
    timeRange: ['2026-05-13', '2026-05-26'],
    filters: '渠道不等于内部测试',
    filterLogic: 'and',
    filterConditions: [
      {
        id: 'lccf-ad-channel',
        source: 'event',
        sourceId: 'ad_exposure',
        sourceName: '广告曝光',
        field: 'ad_exposure.channel',
        label: '渠道',
        operator: 'not_equals',
        value: '内部测试',
        timeRange: ['2026-05-13', '2026-05-26'],
      },
    ],
    sort: 'desc',
    topN: 10,
    updatedAt: '2026-05-26T08:30:00+02:00',
  },
  {
    id: 'lcc-purchase-amount',
    reportId: 'lcr-aipl-user',
    title: '购买阶段成交金额',
    stageValues: ['P'],
    chartType: 'bar',
    dimension: 'channel',
    metric: '成交金额',
    timeRange: ['2026-05-01', '2026-05-26'],
    filters: '订单状态=支付成功',
    filterLogic: 'and',
    filterConditions: [
      {
        id: 'lccf-order-status',
        source: 'event',
        sourceId: 'payment_success',
        sourceName: '支付成功',
        field: 'payment_success.order_status',
        label: '订单状态',
        operator: 'equals',
        value: '支付成功',
      },
    ],
    sort: 'desc',
    topN: 8,
    updatedAt: '2026-05-26T08:35:00+02:00',
  },
  {
    id: 'lcc-loyalty-repeat',
    reportId: 'lcr-aipl-user',
    title: '忠诚阶段复购次数构成',
    stageValues: ['L'],
    chartType: 'donut',
    dimension: '标签',
    metric: '复购次数',
    timeRange: ['2026-05-01', '2026-05-26'],
    filters: '敏感资源已按行权限过滤',
    filterLogic: 'and',
    filterConditions: [
      {
        id: 'lccf-repeat-tag',
        source: 'tag',
        sourceId: 'tag-consume-level',
        sourceName: '消费层级标签',
        field: 'tag-consume-level',
        label: '复购倾向',
        operator: 'contains',
        value: '高',
      },
    ],
    sort: 'desc',
    topN: 6,
    updatedAt: '2026-05-26T08:38:00+02:00',
  },
  {
    id: 'lcc-stage-total-metric',
    reportId: 'lcr-aipl-user',
    title: '全阶段可运营用户指标卡',
    stageValues: ['A', 'I', 'P', 'L'],
    chartType: 'metric',
    dimension: '阶段',
    metric: '用户数',
    timeRange: ['2026-05-26', '2026-05-26'],
    filters: '最近活跃天数介于 3 到 30',
    filterLogic: 'and',
    filterConditions: [
      {
        id: 'lccf-active-days-between',
        source: 'attribute',
        sourceId: 'profile.active_days_30d',
        sourceName: '行为属性',
        field: 'profile.active_days_30d',
        label: '最近活跃天数',
        operator: 'between',
        value: '3',
        value2: '30',
      },
    ],
    sort: 'desc',
    topN: 1,
    updatedAt: '2026-05-26T08:42:00+02:00',
  },
  {
    id: 'lcc-interest-channel-table',
    reportId: 'lcr-aipl-user',
    title: '兴趣阶段渠道互动明细',
    stageValues: ['I'],
    chartType: 'table',
    dimension: '渠道',
    metric: '行为次数',
    timeRange: ['2026-05-13', '2026-05-26'],
    filters: '广告点击渠道属于信息流广告/搜索渠道，或渠道偏好包含私域',
    filterLogic: 'or',
    filterConditions: [
      {
        id: 'lccf-click-channel-in',
        source: 'event',
        sourceId: 'ad_click',
        sourceName: '广告点击',
        field: 'ad_click.channel',
        label: '渠道',
        operator: 'in',
        value: '信息流广告,搜索渠道',
        timeRange: ['2026-05-13', '2026-05-26'],
      },
      {
        id: 'lccf-channel-preference-private',
        source: 'tag',
        sourceId: 'tag-channel-preference',
        sourceName: '渠道偏好标签',
        field: 'tag-channel-preference',
        label: '偏好渠道',
        operator: 'contains',
        value: '私域',
      },
    ],
    sort: 'desc',
    topN: 12,
    updatedAt: '2026-05-26T08:48:00+02:00',
  },
  {
    id: 'lcc-payment-quality-error',
    reportId: 'lcr-aipl-user',
    title: '购买阶段订单质量监控',
    stageValues: ['P'],
    chartType: 'table',
    dimension: '行为属性',
    metric: '订单数',
    timeRange: ['2026-05-20', '2026-05-26'],
    filters: '金额大于 0 且订单状态有值',
    filterLogic: 'and',
    filterConditions: [
      {
        id: 'lccf-payment-amount-positive',
        source: 'event',
        sourceId: 'payment_success',
        sourceName: '支付成功',
        field: 'payment_success.amount',
        label: '金额',
        operator: 'greater_than',
        value: '0',
        timeRange: ['2026-05-20', '2026-05-26'],
      },
      {
        id: 'lccf-payment-status-has-value',
        source: 'event',
        sourceId: 'payment_success',
        sourceName: '支付成功',
        field: 'payment_success.order_status',
        label: '订单状态',
        operator: 'has_value',
        value: '',
        timeRange: ['2026-05-20', '2026-05-26'],
      },
    ],
    sort: 'desc',
    topN: 10,
    updatedAt: '2026-05-26T08:52:00+02:00',
    error: true,
  },
  {
    id: 'lcc-ask-failed',
    reportId: 'lcr-5a-member',
    title: '问询阶段咨询次数',
    stageValues: ['A3'],
    chartType: 'table',
    dimension: '渠道',
    metric: '咨询次数',
    timeRange: ['2026-05-01', '2026-05-25'],
    filters: '客服渠道已授权',
    filterLogic: 'and',
    filterConditions: [
      {
        id: 'lccf-service-channel',
        source: 'attribute',
        sourceId: 'service_channel',
        sourceName: '会员属性',
        field: 'service_channel',
        label: '客服渠道',
        operator: 'in',
        value: '在线客服,电话客服',
      },
    ],
    sort: 'desc',
    topN: 10,
    updatedAt: '2026-05-25T18:00:00+02:00',
    error: true,
  },
  {
    id: 'lcc-member-advocate-repeat',
    reportId: 'lcr-5a-member',
    title: '拥护阶段复购贡献',
    stageValues: ['A5'],
    chartType: 'donut',
    dimension: '会员等级',
    metric: '复购次数',
    timeRange: ['2026-05-01', '2026-05-25'],
    filters: '会员等级有值',
    filterLogic: 'and',
    filterConditions: [
      {
        id: 'lccf-member-level-has-value',
        source: 'attribute',
        sourceId: 'profile.member_level',
        sourceName: '会员属性',
        field: 'profile.member_level',
        label: '会员等级',
        operator: 'has_value',
        value: '',
      },
    ],
    sort: 'desc',
    topN: 6,
    updatedAt: '2026-05-25T18:08:00+02:00',
  },
  {
    id: 'lcc-retention-risk-channel',
    reportId: 'lcr-retention-user',
    title: '风险阶段召回渠道表现',
    stageValues: ['RISK'],
    chartType: 'bar',
    dimension: '渠道',
    metric: '回流人数',
    timeRange: ['2026-05-12', '2026-05-26'],
    filters: '广告点击渠道不属于自然流量',
    filterLogic: 'and',
    filterConditions: [
      {
        id: 'lccf-retention-click-channel',
        source: 'event',
        sourceId: 'ad_click',
        sourceName: '广告点击',
        field: 'ad_click.channel',
        label: '渠道',
        operator: 'not_in',
        value: '自然流量',
        timeRange: ['2026-05-12', '2026-05-26'],
      },
    ],
    sort: 'desc',
    topN: 8,
    updatedAt: '2026-05-26T10:22:00+02:00',
  },
  {
    id: 'lcc-retention-return-metric',
    reportId: 'lcr-retention-user',
    title: '回流用户 14 日留存率',
    stageValues: ['RETURN'],
    chartType: 'metric',
    dimension: '留存周期',
    metric: '用户数',
    timeRange: ['2026-05-13', '2026-05-26'],
    filters: '最近活跃天数大于等于 2',
    filterLogic: 'and',
    filterConditions: [
      {
        id: 'lccf-return-active-days',
        source: 'attribute',
        sourceId: 'profile.active_days_30d',
        sourceName: '行为属性',
        field: 'profile.active_days_30d',
        label: '最近活跃天数',
        operator: 'greater_equal',
        value: '2',
      },
    ],
    sort: 'desc',
    topN: 1,
    updatedAt: '2026-05-26T10:24:00+02:00',
  },
  {
    id: 'lcc-demo-act',
    reportId: 'lcr-demo-aipl',
    title: 'Demo 购买阶段关键转化',
    stageValues: ['P'],
    chartType: 'metric',
    dimension: '阶段',
    metric: '用户数',
    timeRange: ['2026-05-20', '2026-05-26'],
    filters: '系统预置口径',
    filterLogic: 'and',
    filterConditions: [
      {
        id: 'lccf-demo-system',
        source: 'attribute',
        sourceId: 'demo_scope',
        sourceName: '系统预置',
        field: 'demo_scope',
        label: '样例口径',
        operator: 'equals',
        value: 'AIPL Demo',
      },
    ],
    sort: 'desc',
    topN: 1,
    updatedAt: '2026-05-26T08:00:00+02:00',
  },
]

const buildPath = (currentReport: LifecycleReport, id: EntityId, name = '默认路径'): LifecyclePath => {
  const latest = lifecycleStageSnapshots.filter((snapshot) => snapshot.reportId === currentReport.id && snapshot.date === currentReport.latestDataDate)
  const firstTotal = latest[0]?.totalCount || 1
  const nodes: LifecyclePathNode[] = currentReport.stages.map((stage, index) => {
    const total = latest.find((snapshot) => snapshot.stageValue === stage.value)?.totalCount ?? 0
    const userCount = Math.max(0, Math.round(firstTotal * (0.82 - index * 0.14) + total * 0.18))
    const ratio = firstTotal ? Number((userCount / firstTotal * 100).toFixed(2)) : 0
    const lostCount = index === 0 ? Math.round(userCount * 0.1) : Math.round(userCount * (0.16 + index * 0.04))
    return {
      id: `${id}-node-${stage.value}`,
      pathId: id,
      nodeType: index === 0 ? 'start' : index === currentReport.stages.length - 1 ? 'end' : 'middle',
      nodeName: stage.name,
      conditionType: 'tag',
      conditionConfig: {
        tagId: currentReport.tagId,
        tagName: currentReport.tagName,
        tagValue: stage.name,
        eventName: index === 0 ? 'ad_exposure' : index === currentReport.stages.length - 1 ? 'payment_success' : 'product_detail_view',
        eventDisplayName: index === 0 ? '广告曝光' : index === currentReport.stages.length - 1 ? '支付成功' : '商品详情浏览',
        propertyFilter: index === 0 ? '渠道 = 信息流广告' : '',
        timeLimit: index === 0 ? '分析周期内首次发生' : '',
      },
      windowValue: index === 0 ? 1 : index + 1,
      windowUnit: 'day',
      orderIndex: index + 1,
      userCount,
      ratio,
      lostCount,
      lostRate: Number((lostCount / Math.max(userCount, 1) * 100).toFixed(2)),
      conversionRate: index === 0 ? 100 : Number((userCount / Math.max(nodesSafeCount(latest, index - 1, firstTotal), 1) * 100).toFixed(2)),
    }
  })
  const edges: LifecyclePathEdge[] = nodes.slice(0, -1).map((node, index) => {
    const next = nodes[index + 1]!
    return {
      id: `${id}-edge-${node.id}-${next.id}`,
      fromNodeId: node.id,
      toNodeId: next.id,
      userCount: next.userCount,
      conversionRate: Number((next.userCount / Math.max(node.userCount, 1) * 100).toFixed(2)),
      lostCount: Math.max(0, node.userCount - next.userCount),
    }
  })
  return {
    id,
    reportId: currentReport.id,
    name,
    description: '系统根据生命周期阶段顺序创建，支持在更多菜单中编辑。',
    updateMode: 'daily',
    dailyExecuteTime: '08:30',
    periodConfig: {
      quickKey: 'last_7_days',
      startDate: nowDate.subtract(6, 'day').format('YYYY-MM-DD'),
      endDate: nowDate.format('YYYY-MM-DD'),
    },
    targetSegmentId: undefined,
    targetSegmentName: '全量用户',
    status: currentReport.status === 'disabled' ? 'failed' : 'success',
    nextRunAt: currentReport.status === 'disabled' ? undefined : '2026-05-29T08:30:00+02:00',
    lastRunAt: '2026-05-26T08:30:00+02:00',
    creatorId: 'u-growth',
    creatorName: '林哲',
    createdAt: '2026-05-08T09:30:00+02:00',
    updatedAt: '2026-05-26T09:00:00+02:00',
    nodes,
    edges,
  }
}

const nodesSafeCount = (snapshots: LifecycleStageSnapshot[], index: number, fallback: number): number => {
  if (index < 0) return fallback
  return snapshots[index]?.totalCount ?? fallback
}

const buildEventPath = (currentReport: LifecycleReport, id: EntityId, name: string): LifecyclePath => {
  const path = buildPath(currentReport, id, name)
  path.description = '自定义行为路径，演示起始事件、行为属性过滤、中间节点和终止事件配置。'
  path.updateMode = 'manual'
  path.dailyExecuteTime = undefined
  path.targetSegmentId = 'seg-active-30d'
  path.targetSegmentName = '近 30 日活跃用户'
  path.periodConfig = {
    quickKey: 'last_14_days',
    startDate: nowDate.subtract(13, 'day').format('YYYY-MM-DD'),
    endDate: nowDate.format('YYYY-MM-DD'),
  }
  path.nodes = path.nodes.slice(0, 4).map((node, index) => ({
    ...node,
    id: `${id}-event-node-${index + 1}`,
    pathId: id,
    nodeType: index === 0 ? 'start' : index === 3 ? 'end' : 'middle',
    nodeName: ['广告点击', '商品详情浏览', '预约/加购', '支付成功'][index] ?? node.nodeName,
    conditionType: 'event',
    conditionConfig: {
      eventName: ['ad_click', 'product_detail_view', 'test_drive_booked', 'payment_success'][index] ?? 'product_detail_view',
      eventDisplayName: ['广告点击', '商品详情浏览', '预约试驾', '支付成功'][index] ?? '商品详情浏览',
      propertyFilter: index === 0 ? 'channel in (信息流广告, 搜索渠道)' : index === 3 ? 'amount > 0' : '',
      timeLimit: index === 0 ? '分析周期内首次发生' : index === 3 ? '起点后 7 天内' : '',
    },
    windowValue: index === 0 ? 1 : index === 3 ? 7 : 3,
    windowUnit: 'day',
    orderIndex: index + 1,
  }))
  path.edges = path.nodes.slice(0, -1).map((node, index) => {
    const next = path.nodes[index + 1]!
    return {
      id: `${id}-event-edge-${index + 1}`,
      fromNodeId: node.id,
      toNodeId: next.id,
      userCount: next.userCount,
      conversionRate: Number((next.userCount / Math.max(node.userCount, 1) * 100).toFixed(2)),
      lostCount: Math.max(0, node.userCount - next.userCount),
    }
  })
  path.createdAt = '2026-05-18T11:30:00+02:00'
  path.updatedAt = '2026-05-26T09:40:00+02:00'
  path.lastRunAt = '2026-05-26T09:40:00+02:00'
  path.nextRunAt = undefined
  return path
}

const buildFailedPath = (currentReport: LifecycleReport, id: EntityId, name: string): LifecyclePath => {
  const path = buildPath(currentReport, id, name)
  path.description = '演示路径无用户或配置过窄时的失败态，可进入编辑或重新计算。'
  path.status = 'failed'
  path.updateMode = 'manual'
  path.targetSegmentId = 'seg-dormant-risk'
  path.targetSegmentName = '沉睡风险用户'
  path.periodConfig = {
    quickKey: 'last_7_days',
    startDate: nowDate.subtract(6, 'day').format('YYYY-MM-DD'),
    endDate: nowDate.format('YYYY-MM-DD'),
  }
  path.nodes = path.nodes.map((node, index) => ({
    ...node,
    userCount: index === 0 ? 420 : 0,
    ratio: index === 0 ? 100 : 0,
    lostCount: index === 0 ? 420 : 0,
    lostRate: index === 0 ? 100 : 0,
    conversionRate: index === 0 ? 100 : 0,
  }))
  path.edges = path.edges.map((edge) => ({ ...edge, userCount: 0, conversionRate: 0, lostCount: 420 }))
  path.createdAt = '2026-05-21T16:10:00+02:00'
  path.updatedAt = '2026-05-26T09:52:00+02:00'
  path.lastRunAt = '2026-05-26T09:52:00+02:00'
  path.nextRunAt = undefined
  return path
}

const buildCalculatingPath = (currentReport: LifecycleReport, id: EntityId, name: string): LifecyclePath => {
  const path = buildPath(currentReport, id, name)
  path.description = '演示保存路径后的计算中状态，稍后会自动完成。'
  path.status = 'calculating'
  path.updateMode = 'daily'
  path.dailyExecuteTime = '09:30'
  path.targetSegmentId = 'seg-reactivated-14d'
  path.targetSegmentName = '14 日回流用户'
  path.createdAt = '2026-05-26T09:58:00+02:00'
  path.updatedAt = '2026-05-26T09:58:00+02:00'
  path.lastRunAt = undefined
  path.nextRunAt = '2026-05-29T09:30:00+02:00'
  return path
}

export const lifecyclePaths: LifecyclePath[] = [
  buildPath(lifecycleReports[0]!, 'lcp-aipl-default'),
  buildEventPath(lifecycleReports[0]!, 'lcp-aipl-event-conversion', '广告点击到支付转化路径'),
  buildFailedPath(lifecycleReports[0]!, 'lcp-aipl-narrow-failed', '高价值复购窄口径路径'),
  buildCalculatingPath(lifecycleReports[3]!, 'lcp-retention-calculating', '回流召回计算中路径'),
  buildPath(lifecycleReports[1]!, 'lcp-member-5a-default', '会员 5A 默认路径'),
  buildPath(lifecycleReports[4]!, 'lcp-demo-default', 'Demo 默认路径'),
]

export const lifecycleAuthorizations: LifecycleAuthorization[] = [
  {
    id: 'lca-growth-role',
    reportId: 'lcr-aipl-user',
    principalType: 'role',
    principalId: 'role-growth',
    principalName: '增长运营角色',
    permissions: ['view', 'edit', 'manage_path'],
    tagViewGranted: true,
    projectAuthorizationId: 'project-auth-lcr-aipl-user-role-growth',
    projectAuthorizationName: '项目中心 / 增长运营角色授权',
    tagPermissionSyncedAt: '2026-05-12T10:00:00+02:00',
    grantedBy: '孟澜',
    grantedAt: '2026-05-12T10:00:00+02:00',
  },
  {
    id: 'lca-growth-user',
    reportId: 'lcr-aipl-user',
    principalType: 'user',
    principalId: 'u-insight',
    principalName: '许澄',
    permissions: ['view', 'edit'],
    tagViewGranted: true,
    projectAuthorizationId: 'project-auth-lcr-aipl-user-u-insight',
    projectAuthorizationName: '项目中心 / 许澄授权',
    tagPermissionSyncedAt: '2026-05-20T14:10:00+02:00',
    grantedBy: '孟澜',
    grantedAt: '2026-05-20T14:10:00+02:00',
  },
  {
    id: 'lca-growth-dept',
    reportId: 'lcr-aipl-user',
    principalType: 'department',
    principalId: 'dept-growth',
    principalName: '增长运营团队',
    permissions: ['view'],
    tagViewGranted: false,
    projectAuthorizationId: 'project-auth-lcr-aipl-user-dept-growth',
    projectAuthorizationName: '项目中心 / 增长运营团队授权',
    grantedBy: '孟澜',
    grantedAt: '2026-05-22T15:00:00+02:00',
  },
  {
    id: 'lca-member-group',
    reportId: 'lcr-5a-member',
    principalType: 'user_group',
    principalId: 'group-member',
    principalName: '会员运营组',
    permissions: ['view', 'report_manage'],
    tagViewGranted: true,
    projectAuthorizationId: 'project-auth-lcr-5a-member-group-member',
    projectAuthorizationName: '项目中心 / 会员运营组授权',
    tagPermissionSyncedAt: '2026-05-18T16:20:00+02:00',
    grantedBy: '孟澜',
    grantedAt: '2026-05-18T16:20:00+02:00',
  },
  {
    id: 'lca-retention-user',
    reportId: 'lcr-retention-user',
    principalType: 'user',
    principalId: 'u-growth',
    principalName: '林哲',
    permissions: ['view', 'manage_path'],
    tagViewGranted: false,
    projectAuthorizationId: 'project-auth-lcr-retention-user-u-growth',
    projectAuthorizationName: '项目中心 / 林哲路径管理授权',
    grantedBy: '唐宁',
    grantedAt: '2026-05-24T11:18:00+02:00',
  },
]

export const lifecycleProjectAuthorizationLinks: LifecycleProjectAuthorizationLink[] = [
  {
    id: 'project-auth-lcr-aipl-user-role-growth',
    reportId: 'lcr-aipl-user',
    principalType: 'role',
    principalId: 'role-growth',
    principalName: '增长运营角色',
    permissions: ['view', 'edit', 'manage_path'],
    tagPermissionLevel: 'edit',
    source: 'project_center',
    syncedAt: '2026-05-12T10:00:00+02:00',
  },
  {
    id: 'project-auth-lcr-aipl-user-u-insight',
    reportId: 'lcr-aipl-user',
    principalType: 'user',
    principalId: 'u-insight',
    principalName: '许澄',
    permissions: ['view', 'edit'],
    tagPermissionLevel: 'edit',
    source: 'project_center',
    syncedAt: '2026-05-20T14:10:00+02:00',
  },
  {
    id: 'project-auth-lcr-aipl-user-dept-growth',
    reportId: 'lcr-aipl-user',
    principalType: 'department',
    principalId: 'dept-growth',
    principalName: '增长运营团队',
    permissions: ['view'],
    source: 'project_center',
    syncedAt: '2026-05-22T15:00:00+02:00',
  },
  {
    id: 'project-auth-lcr-5a-member-group-member',
    reportId: 'lcr-5a-member',
    principalType: 'user_group',
    principalId: 'group-member',
    principalName: '会员运营组',
    permissions: ['view', 'report_manage'],
    tagPermissionLevel: 'manage',
    source: 'project_center',
    syncedAt: '2026-05-18T16:20:00+02:00',
  },
  {
    id: 'project-auth-lcr-retention-user-u-growth',
    reportId: 'lcr-retention-user',
    principalType: 'user',
    principalId: 'u-growth',
    principalName: '林哲',
    permissions: ['view', 'manage_path'],
    source: 'project_center',
    syncedAt: '2026-05-24T11:18:00+02:00',
  },
]

export const lifecycleAuditLogs: LifecycleAuditLog[] = [
  {
    id: 'audit-view-aipl',
    userId: 'u-growth',
    userName: '林哲',
    action: '查看生命周期报告',
    reportId: 'lcr-aipl-user',
    tagId: 'tag-lifecycle-aipl',
    ip: '10.18.2.45',
    createdAt: '2026-05-26T09:12:00+02:00',
  },
  {
    id: 'audit-path-aipl',
    userId: 'u-growth',
    userName: '林哲',
    action: '重新计算路径',
    reportId: 'lcr-aipl-user',
    tagId: 'tag-lifecycle-aipl',
    targetId: 'lcp-aipl-default',
    before: '成功',
    after: '计算中 -> 成功',
    ip: '10.18.2.45',
    createdAt: '2026-05-26T09:20:00+02:00',
  },
  {
    id: 'audit-switch-aipl',
    userId: 'u-growth',
    userName: '林哲',
    action: '切换分析报告',
    reportId: 'lcr-aipl-user',
    tagId: 'tag-lifecycle-aipl',
    targetId: 'lcr-5a-member',
    before: 'AIPL 用户生命周期',
    after: '5A 会员生命周期',
    ip: '10.18.2.45',
    createdAt: '2026-05-26T09:26:00+02:00',
  },
  {
    id: 'audit-demo-aipl',
    userId: 'u-growth',
    userName: '林哲',
    action: '查看 Demo',
    reportId: 'lcr-aipl-user',
    tagId: 'tag-lifecycle-aipl',
    targetId: 'lcr-demo-aipl',
    before: '正式报告',
    after: '只读 Demo',
    ip: '10.18.2.45',
    createdAt: '2026-05-26T09:28:00+02:00',
  },
  {
    id: 'audit-download-chart',
    userId: 'u-insight',
    userName: '许澄',
    action: '下载数据',
    reportId: 'lcr-aipl-user',
    tagId: 'tag-lifecycle-aipl',
    targetId: 'lcc-interest-channel-table',
    after: '兴趣阶段渠道互动明细',
    ip: '10.18.2.51',
    createdAt: '2026-05-26T09:31:00+02:00',
  },
  {
    id: 'audit-chart-add',
    userId: 'u-insight',
    userName: '许澄',
    action: '添加图表',
    reportId: 'lcr-aipl-user',
    tagId: 'tag-lifecycle-aipl',
    targetId: 'lcc-stage-total-metric',
    after: '全阶段可运营用户指标卡',
    ip: '10.18.2.51',
    createdAt: '2026-05-26T09:35:00+02:00',
  },
  {
    id: 'audit-export-transition',
    userId: 'u-growth',
    userName: '林哲',
    action: '导出分群',
    reportId: 'lcr-aipl-user',
    tagId: 'tag-lifecycle-aipl',
    targetId: 'segment-lifecycle-transition-A-I',
    before: '认知 → 兴趣',
    after: 'AIPL_认知到兴趣_流转人群',
    ip: '10.18.2.45',
    createdAt: '2026-05-26T09:42:00+02:00',
  },
  {
    id: 'audit-auth-update',
    userId: 'u-admin',
    userName: '孟澜',
    action: '授权生命周期分析权限',
    reportId: 'lcr-aipl-user',
    tagId: 'tag-lifecycle-aipl',
    targetId: 'u-insight',
    before: 'view',
    after: 'view,edit',
    ip: '10.18.2.20',
    createdAt: '2026-05-26T09:46:00+02:00',
  },
  {
    id: 'audit-auth-revoke',
    userId: 'u-admin',
    userName: '孟澜',
    action: '取消生命周期分析权限',
    reportId: 'lcr-aipl-user',
    tagId: 'tag-lifecycle-aipl',
    targetId: 'u-temp',
    before: '临时协作者 view',
    after: 'revoke',
    ip: '10.18.2.20',
    createdAt: '2026-05-26T09:50:00+02:00',
  },
  {
    id: 'audit-path-failed',
    userId: 'u-growth',
    userName: '林哲',
    action: '编辑路径',
    reportId: 'lcr-aipl-user',
    tagId: 'tag-lifecycle-aipl',
    targetId: 'lcp-aipl-narrow-failed',
    before: '成功',
    after: '失败：当前路径配置下暂无用户完成跃迁',
    ip: '10.18.2.45',
    createdAt: '2026-05-26T09:55:00+02:00',
  },
]

const backendResourceTypeFromAction = (action: string): LifecycleBackendAuditRecord['resourceType'] => {
  if (action.includes('图表') || action.includes('下载数据')) return 'chart'
  if (action.includes('路径')) return 'path'
  if (action.includes('授权') || action.includes('权限')) return 'authorization'
  if (action.includes('分群')) return 'segment'
  if (action.includes('Demo')) return 'demo'
  if (action.includes('标签')) return 'tag'
  return 'report'
}

export const lifecycleBackendAuditRecords: LifecycleBackendAuditRecord[] = lifecycleAuditLogs.map((log) => ({
  id: `backend-${log.id}`,
  module: 'lifecycle_analysis',
  action: log.action,
  resourceType: backendResourceTypeFromAction(log.action),
  resourceId: log.targetId ?? log.reportId,
  reportId: log.reportId,
  tagId: log.tagId,
  userId: log.userId,
  userName: log.userName,
  before: log.before,
  after: log.after,
  ip: log.ip,
  createdAt: log.createdAt,
}))

export const lifecycleExportSegmentLogs: LifecycleExportSegmentLog[] = [
  {
    id: 'lesl-transition-a-i',
    reportId: 'lcr-aipl-user',
    sourceType: 'transition',
    sourceConfig: {
      edgeId: 'edge-A-I',
      fromStage: 'A',
      fromStageName: '认知',
      toStage: 'I',
      toStageName: '兴趣',
      userCount: 8420,
      timeRange: ['2026-05-20', '2026-05-26'],
      outputIdType: 'oneid',
    },
    segmentId: 'segment-lifecycle-transition-A-I',
    segmentName: 'AIPL_认知到兴趣_流转人群',
    segmentCount: 8420,
    creatorId: 'u-growth',
    creatorName: '林哲',
    createdAt: '2026-05-26T09:42:00+02:00',
  },
  {
    id: 'lesl-path-edge-pay',
    reportId: 'lcr-aipl-user',
    sourceType: 'path_edge',
    sourceConfig: {
      pathId: 'lcp-aipl-event-conversion',
      edgeId: 'lcp-aipl-event-conversion-event-edge-3',
      fromNodeName: '预约/加购',
      toNodeName: '支付成功',
      userCount: 3150,
      conversionRate: 42.8,
      timeRange: ['2026-05-13', '2026-05-26'],
    },
    segmentId: 'segment-lifecycle-path-pay',
    segmentName: '广告点击到支付_转化路径分群',
    segmentCount: 3150,
    creatorId: 'u-insight',
    creatorName: '许澄',
    createdAt: '2026-05-26T09:49:00+02:00',
  },
]

export const lifecycleOutputIdTypes = [
  { label: '用户 ID', value: 'oneid' },
  { label: '会员 ID', value: 'member_id' },
  { label: '设备 ID', value: 'device_id' },
  { label: '手机号', value: 'mobile' },
]

export const lifecycleSegmentGroups = [
  { label: '运营常用分群', value: 'group-growth' },
  { label: '风险预警', value: 'group-risk' },
  { label: '广告变现', value: 'group-ad' },
]

export const lifecycleTargetSegments = [
  { label: '全量用户', value: '', subjectType: 'user', status: 'available', count: 538000 },
  { label: '近 30 日活跃用户', value: 'seg-active-30d', subjectType: 'user', status: 'available', count: 148600 },
  { label: '私域高价值会员', value: 'seg-private-high-value', subjectType: 'member', status: 'available', count: 42600 },
  { label: '近期广告触达用户', value: 'seg-ad-touch', subjectType: 'user', status: 'available', count: 93500 },
  { label: '沉睡风险用户', value: 'seg-dormant-risk', subjectType: 'user', status: 'available', count: 38800 },
  { label: '14 日回流用户', value: 'seg-reactivated-14d', subjectType: 'user', status: 'available', count: 12600 },
  { label: '已失效历史会员分群', value: 'seg-expired-member', subjectType: 'member', status: 'invalid', count: 0 },
]

export const lifecycleEventOptions = [
  { label: '广告曝光 ad_exposure', value: 'ad_exposure' },
  { label: '广告点击 ad_click', value: 'ad_click' },
  { label: '商品详情浏览 product_detail_view', value: 'product_detail_view' },
  { label: '预约试驾 test_drive_booked', value: 'test_drive_booked' },
  { label: '支付成功 payment_success', value: 'payment_success' },
  { label: '复购 repeat_purchase', value: 'repeat_purchase' },
  { label: '领取优惠券 coupon_receive', value: 'coupon_receive' },
  { label: '客服咨询 service_consult', value: 'service_consult' },
]
