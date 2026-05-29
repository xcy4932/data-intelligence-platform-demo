import type {
  AdAccessContext,
  AdAnalysisReport,
  AdAuditLog,
  AdBehaviorEventConfig,
  AdBehaviorOption,
  AdDailyTrendPoint,
  AdEffectDetailRow,
  AdEffectQueryRequest,
  AdEffectResult,
  AdEventOption,
  AdFunnelStage,
  AdMediaQueryRequest,
  AdMediaResult,
  AdMetadataTemplate,
  AdMetricConfig,
  AdMetricCondition,
  AdMetricDisplayFormat,
  AdOverlapCell,
  AdReportDetailRow,
  AdReportQueryRequest,
  AdReportResult,
  AdSubjectOption,
  AdTaxonomyNode,
  AdTimeRangeQuery,
} from '@/types/adAnalysis'

export const adAnalysisPermissionSet = {
  viewAnalysis: true,
  manageReport: true,
  manageTemplate: true,
  viewAdReport: true,
  downloadData: true,
  createSegment: true,
}

const adChannelSeeds = [
  {
    id: 'toutiao',
    name: '巨量引擎',
    base: 1.18,
    advertisers: [
      { id: 'adv_ev_a', name: '新能源 A 账号' },
      { id: 'adv_suv_launch', name: '城市 SUV 上市账号' },
    ],
  },
  {
    id: 'tencent',
    name: '腾讯广告',
    base: 0.96,
    advertisers: [
      { id: 'adv_ev_b', name: '新能源 B 账号' },
      { id: 'adv_trade_in', name: '置换补贴账号' },
    ],
  },
  {
    id: 'kuaishou',
    name: '快手',
    base: 0.82,
    advertisers: [
      { id: 'adv_service_a', name: '售后增长 A 账号' },
      { id: 'adv_drive_city', name: '试驾预约账号' },
    ],
  },
  {
    id: 'gdt',
    name: '广点通',
    base: 0.72,
    advertisers: [
      { id: 'adv_service_b', name: '售后增长 B 账号' },
      { id: 'adv_family_car', name: '家庭车型账号' },
    ],
  },
  {
    id: 'xiaohongshu',
    name: '小红书',
    base: 0.68,
    advertisers: [
      { id: 'adv_koc_ev', name: 'KOC 种草账号' },
      { id: 'adv_women_owner', name: '女性车主账号' },
    ],
  },
  {
    id: 'wechat_channels',
    name: '视频号',
    base: 0.78,
    advertisers: [
      { id: 'adv_private_domain', name: '私域直播账号' },
      { id: 'adv_owner_referral', name: '老带新活动账号' },
    ],
  },
  {
    id: 'baidu',
    name: '百度营销',
    base: 0.74,
    advertisers: [
      { id: 'adv_search_lead', name: '搜索线索账号' },
      { id: 'adv_brand_zone', name: '品牌专区账号' },
    ],
  },
] as const

const adGroupStages = [
  { id: 'launch', name: '上市拉新投放组' },
  { id: 'retarget', name: '高意向复访投放组' },
] as const

const adPlanStages = [
  { id: 'city', name: '重点城市计划' },
  { id: 'lookalike', name: '相似人群扩量计划' },
] as const

const adCreativeStages = [
  { id: 'video', name: '车型亮点短视频' },
  { id: 'form', name: '一键留资表单' },
] as const

const allAdvertiserIds = adChannelSeeds.flatMap((channel) => channel.advertisers.map((advertiser) => advertiser.id))
const allAdGroupIds = allAdvertiserIds.flatMap((advertiserId) => adGroupStages.map((stage) => `grp_${advertiserId}_${stage.id}`))
const allAdPlanIds = allAdGroupIds.flatMap((groupId) => adPlanStages.map((stage) => `plan_${groupId}_${stage.id}`))
const allAdCreativeIds = allAdPlanIds.flatMap((planId) => adCreativeStages.map((stage) => `crt_${planId}_${stage.id}`))

export const mockAdAccessContext: AdAccessContext = {
  projectId: 'project_demo_auto',
  userId: 'u_xcy',
  userName: 'Chaoyang Xu',
  currentVersion: '1.25',
  isNewUser: false,
  modulePurchased: true,
  moduleDeployed: true,
  dataFusionReady: true,
  idMappingReady: true,
  monitoringDataReady: true,
  dataSourceAvailable: true,
  vecdpPurchased: true,
  iadPurchased: true,
  monitoringLinkSource: 'iad',
  permissions: adAnalysisPermissionSet,
  dataPermission: {
    channelIds: adChannelSeeds.map((channel) => channel.id),
    advertiserIds: allAdvertiserIds,
    adGroupIds: allAdGroupIds,
    adPlanIds: allAdPlanIds,
    adCreativeIds: allAdCreativeIds,
    reportIds: [
      'rpt_effect_growth',
      'rpt_media_mix',
      'rpt_city_creative',
      'rpt_retargeting_media',
      'rpt_store_arrival',
      'rpt_private_domain',
    ],
    subjectTypes: ['user', 'vehicle_lead', 'store_customer'],
    tagIds: ['tag_high_intent', 'tag_new_energy', 'tag_budget_ready', 'tag_owner_trade_in', 'tag_family_car'],
    behaviorIds: ['ad_impression', 'click', 'landing_page_view', 'phone', 'effective_lead', 'test_drive', 'arrive_store', 'order_lock', 'buycar'],
    segmentIds: ['seg_core_city', 'seg_active_30d', 'seg_high_intent_ev', 'seg_owner_trade_in', 'seg_private_domain'],
  },
}

export const adSubjectOptions: AdSubjectOption[] = [
  { label: '用户', value: 'user' },
  { label: '车辆线索', value: 'vehicle_lead' },
  { label: '门店客户', value: 'store_customer' },
]

export const adBehaviorOptions: AdBehaviorOption[] = [
  { label: '曝光', value: 'impression', defaultEventName: 'ad_impression' },
  { label: '点击', value: 'click', defaultEventName: 'click' },
  { label: '留资', value: 'lead', defaultEventName: 'phone' },
  { label: '试驾', value: 'test_drive', defaultEventName: 'test_drive' },
  { label: '成交', value: 'deal', defaultEventName: 'buycar' },
]

export const adEventOptions: AdEventOption[] = [
  { label: '广告曝光 ad_impression', value: 'ad_impression', subjectType: 'user' },
  { label: '广告点击 click', value: 'click', subjectType: 'user' },
  { label: '落地页访问 landing_page_view', value: 'landing_page_view', subjectType: 'user' },
  { label: '留资 phone', value: 'phone', subjectType: 'user' },
  { label: '有效线索 effective_lead', value: 'effective_lead', subjectType: 'vehicle_lead' },
  { label: '预约试驾 test_drive', value: 'test_drive', subjectType: 'vehicle_lead' },
  { label: '到店 arrive_store', value: 'arrive_store', subjectType: 'store_customer' },
  { label: '锁单 order_lock', value: 'order_lock', subjectType: 'vehicle_lead' },
  { label: '成交 buycar', value: 'buycar', subjectType: 'vehicle_lead' },
  { label: '优惠券领取 coupon_receive', value: 'coupon_receive', subjectType: 'user' },
  { label: '私域加企微 add_wecom', value: 'add_wecom', subjectType: 'user' },
  { label: '服务预约 service_booking', value: 'service_booking', subjectType: 'store_customer' },
]

export const adChannels: AdTaxonomyNode[] = [
  ...adChannelSeeds.map((channel) => ({ id: channel.id, name: channel.name })),
]

export const adAdvertisers: AdTaxonomyNode[] = [
  ...adChannelSeeds.flatMap((channel) =>
    channel.advertisers.map((advertiser) => ({
      id: advertiser.id,
      name: advertiser.name,
      channelId: channel.id,
    })),
  ),
]

export const adGroups: AdTaxonomyNode[] = [
  ...adChannelSeeds.flatMap((channel) =>
    channel.advertisers.flatMap((advertiser) =>
      adGroupStages.map((stage) => ({
        id: `grp_${advertiser.id}_${stage.id}`,
        name: `${stage.name} · ${advertiser.name.replace('账号', '')}`,
        advertiserId: advertiser.id,
        channelId: channel.id,
      })),
    ),
  ),
]

export const adPlans: AdTaxonomyNode[] = [
  ...adGroups.flatMap((group) =>
    adPlanStages.map((stage) => ({
      id: `plan_${group.id}_${stage.id}`,
      name: `${stage.name} · ${group.name.split(' · ')[0]}`,
      adGroupId: group.id,
      advertiserId: group.advertiserId,
      channelId: group.channelId,
    })),
  ),
]

export const adCreatives: AdTaxonomyNode[] = [
  ...adPlans.flatMap((plan) =>
    adCreativeStages.map((stage) => ({
      id: `crt_${plan.id}_${stage.id}`,
      name: `${stage.name} · ${plan.name.split(' · ')[0]}`,
      adPlanId: plan.id,
      adGroupId: plan.adGroupId,
      advertiserId: plan.advertiserId,
      channelId: plan.channelId,
    })),
  ),
]

const now = '2026-05-28 16:00:00'

export const mockBehaviorEventConfig: AdBehaviorEventConfig[] = [
  {
    id: 'evt_impression',
    templateId: 'tpl_auto_growth',
    adBehavior: 'impression',
    eventName: 'ad_impression',
    displayName: '曝光',
    orderIndex: 1,
  },
  {
    id: 'evt_click',
    templateId: 'tpl_auto_growth',
    adBehavior: 'click',
    eventName: 'click',
    displayName: '点击',
    orderIndex: 2,
  },
  {
    id: 'evt_landing',
    templateId: 'tpl_auto_growth',
    adBehavior: 'click',
    eventName: 'landing_page_view',
    displayName: '落地页访问',
    orderIndex: 3,
  },
  {
    id: 'evt_phone',
    templateId: 'tpl_auto_growth',
    adBehavior: 'lead',
    eventName: 'phone',
    displayName: '留资',
    orderIndex: 4,
  },
  {
    id: 'evt_effective_lead',
    templateId: 'tpl_auto_growth',
    adBehavior: 'lead',
    eventName: 'effective_lead',
    displayName: '有效线索',
    orderIndex: 5,
  },
  {
    id: 'evt_drive',
    templateId: 'tpl_auto_growth',
    adBehavior: 'test_drive',
    eventName: 'test_drive',
    displayName: '试驾',
    orderIndex: 6,
  },
  {
    id: 'evt_arrive_store',
    templateId: 'tpl_auto_growth',
    adBehavior: 'test_drive',
    eventName: 'arrive_store',
    displayName: '到店',
    orderIndex: 7,
  },
  {
    id: 'evt_order_lock',
    templateId: 'tpl_auto_growth',
    adBehavior: 'deal',
    eventName: 'order_lock',
    displayName: '锁单',
    orderIndex: 8,
  },
  {
    id: 'evt_deal',
    templateId: 'tpl_auto_growth',
    adBehavior: 'deal',
    eventName: 'buycar',
    displayName: '成交',
    orderIndex: 9,
  },
]

const metricCondition = (
  variable: string,
  eventName: string,
  statistic: AdMetricCondition['statistic'] = 'users',
): AdMetricCondition => ({
  variable,
  source: eventName.startsWith('ad_') || eventName === 'click' ? 'media_monitor' : 'behavior',
  calculationObject: 'user',
  eventName,
  idType: 'base_id',
  statistic,
  aggregationMethod: statistic === 'users' ? 'distinct_count' : statistic === 'times' ? 'sum' : statistic,
  filters: [],
})

export const buildSystemMetrics = (
  templateId: string,
  events: AdBehaviorEventConfig[],
): AdMetricConfig[] => {
  const personMetrics = events.map((event, index) => ({
    id: `${templateId}_metric_${event.eventName}_users`,
    templateId,
    name: `${event.displayName}人数`,
    description: `统计完成“${event.displayName}”行为的去重用户数。`,
    group: '系统自动生成',
    metricType: 'single' as const,
    formula: 'A',
    conditions: [metricCondition('A', event.eventName, 'users')],
    displayFormat: 'integer' as AdMetricDisplayFormat,
    creatorId: 'system',
    creatorName: '系统',
    creatorType: 'system' as const,
    isRemovable: false,
  }))

  const conversionMetrics: AdMetricConfig[] = []
  for (let index = 1; index < events.length; index += 1) {
    const prev = events[index - 1]
    const current = events[index]
    if (!prev || !current) continue
    conversionMetrics.push({
      id: `${templateId}_metric_${prev.eventName}_${current.eventName}_rate`,
      templateId,
      name: `${current.displayName}转化率`,
      description: `${current.displayName}人数 / ${prev.displayName}人数。`,
      group: '链路转化',
      metricType: 'composite',
      formula: 'B / A',
      conditions: [
        metricCondition('A', prev.eventName, 'users'),
        metricCondition('B', current.eventName, 'users'),
      ],
      displayFormat: 'percent_decimal',
      creatorId: 'system',
      creatorName: '系统',
      creatorType: 'system',
      isRemovable: false,
    })
  }

  return [
    ...personMetrics,
    {
      id: `${templateId}_metric_ctr`,
      templateId,
      name: '点击率',
      description: '点击次数 / 展示次数。',
      group: '广告效果',
      metricType: 'composite',
      formula: 'B / A',
      conditions: [
        metricCondition('A', 'ad_impression', 'times'),
        metricCondition('B', 'click', 'times'),
      ],
      displayFormat: 'percent_decimal',
      creatorId: 'system',
      creatorName: '系统',
      creatorType: 'system',
      isRemovable: false,
    },
    ...conversionMetrics,
  ]
}

const userMetric: AdMetricConfig = {
  id: 'metric_roi_score',
  templateId: 'tpl_auto_growth',
  name: '线索成本效率',
  description: '用于衡量当前渠道的留资效率，数值越低表示获客成本更优。',
  group: '自定义指标',
  metricType: 'composite',
  formula: 'A / B',
  conditions: [
    {
      variable: 'A',
      source: 'detail',
      calculationObject: 'field',
      fieldName: 'cost',
      fieldDisplayName: '总花费',
      idType: 'base_id',
      statistic: 'sum',
      aggregationMethod: 'sum',
      filters: [],
    },
    metricCondition('B', 'phone', 'users'),
  ],
  displayFormat: 'decimal',
  creatorId: 'u_xcy',
  creatorName: 'Chaoyang Xu',
  creatorType: 'user',
  isRemovable: true,
}

const qualityLeadMetric: AdMetricConfig = {
  id: 'metric_quality_lead_rate',
  templateId: 'tpl_auto_growth',
  name: '有效线索率',
  description: '有效线索人数 / 留资人数，用于衡量后链路线索质量。',
  group: '线索质量',
  metricType: 'composite',
  formula: 'B / A',
  conditions: [
    metricCondition('A', 'phone', 'users'),
    {
      ...metricCondition('B', 'effective_lead', 'users'),
      filters: [
        { id: 'filter_city_core', fieldType: 'property', fieldName: 'city_tier', operator: 'in', value: '一线,新一线' },
        { id: 'filter_budget_ready', fieldType: 'tag', fieldName: 'tag_budget_ready', operator: 'eq', value: '已命中' },
      ],
    },
  ],
  displayFormat: 'percent_decimal',
  creatorId: 'u_ops',
  creatorName: '运营管理员',
  creatorType: 'user',
  isRemovable: true,
}

const frequencyPressureMetric: AdMetricConfig = {
  id: 'metric_frequency_pressure',
  templateId: 'tpl_auto_growth',
  name: '频控压力指数',
  description: '高频曝光次数 / 点击人数，用于识别重复触达过重的渠道。',
  group: '媒体频控',
  metricType: 'composite',
  formula: 'A / B',
  conditions: [
    {
      variable: 'A',
      source: 'media_monitor',
      calculationObject: 'event',
      eventName: 'ad_impression',
      idType: 'base_id',
      statistic: 'times',
      aggregationMethod: 'sum',
      filters: [
        { id: 'filter_freq_gt5', fieldType: 'behavior_property', fieldName: 'frequency_7d', operator: 'gt', value: '5' },
      ],
    },
    metricCondition('B', 'click', 'users'),
  ],
  displayFormat: 'decimal',
  creatorId: 'u_xcy',
  creatorName: 'Chaoyang Xu',
  creatorType: 'user',
  isRemovable: true,
}

const storeEventConfig: AdBehaviorEventConfig[] = [
  { id: 'evt_store_click', templateId: 'tpl_store_arrival', adBehavior: 'click', eventName: 'click', displayName: '点击', orderIndex: 1 },
  { id: 'evt_store_coupon', templateId: 'tpl_store_arrival', adBehavior: 'lead', eventName: 'coupon_receive', displayName: '领券', orderIndex: 2 },
  { id: 'evt_store_booking', templateId: 'tpl_store_arrival', adBehavior: 'lead', eventName: 'service_booking', displayName: '服务预约', orderIndex: 3 },
  { id: 'evt_store_arrive', templateId: 'tpl_store_arrival', adBehavior: 'test_drive', eventName: 'arrive_store', displayName: '到店', orderIndex: 4 },
]

const storeAppointmentMetric: AdMetricConfig = {
  id: 'metric_store_booking_cost',
  templateId: 'tpl_store_arrival',
  name: '预约到店成本',
  description: '广告消耗 / 服务预约人数，辅助评估门店到店效率。',
  group: '门店经营',
  metricType: 'composite',
  formula: 'A / B',
  conditions: [
    {
      variable: 'A',
      source: 'detail',
      calculationObject: 'field',
      fieldName: 'cost',
      fieldDisplayName: '总花费',
      idType: 'base_id',
      statistic: 'sum',
      aggregationMethod: 'sum',
      filters: [{ id: 'filter_store_city', fieldType: 'detail_field', fieldName: 'store_city', operator: 'in', value: '上海,杭州,苏州' }],
    },
    metricCondition('B', 'service_booking', 'users'),
  ],
  displayFormat: 'decimal',
  creatorId: 'u_store_ops',
  creatorName: '门店运营',
  creatorType: 'user',
  isRemovable: true,
}

const privateDomainEventConfig: AdBehaviorEventConfig[] = [
  { id: 'evt_pd_impression', templateId: 'tpl_private_domain', adBehavior: 'impression', eventName: 'ad_impression', displayName: '曝光', orderIndex: 1 },
  { id: 'evt_pd_click', templateId: 'tpl_private_domain', adBehavior: 'click', eventName: 'click', displayName: '点击', orderIndex: 2 },
  { id: 'evt_pd_wecom', templateId: 'tpl_private_domain', adBehavior: 'lead', eventName: 'add_wecom', displayName: '加企微', orderIndex: 3 },
  { id: 'evt_pd_phone', templateId: 'tpl_private_domain', adBehavior: 'lead', eventName: 'phone', displayName: '留资', orderIndex: 4 },
  { id: 'evt_pd_buycar', templateId: 'tpl_private_domain', adBehavior: 'deal', eventName: 'buycar', displayName: '成交', orderIndex: 5 },
]

const privateDomainMetric: AdMetricConfig = {
  id: 'metric_wecom_lead_rate',
  templateId: 'tpl_private_domain',
  name: '加企微后留资率',
  description: '留资人数 / 加企微人数，衡量私域承接质量。',
  group: '私域承接',
  metricType: 'composite',
  formula: 'B / A',
  conditions: [metricCondition('A', 'add_wecom', 'users'), metricCondition('B', 'phone', 'users')],
  displayFormat: 'percent_decimal',
  creatorId: 'u_private_ops',
  creatorName: '私域运营',
  creatorType: 'user',
  isRemovable: true,
}

export const mockAdTemplates: AdMetadataTemplate[] = [
  {
    id: 'tpl_auto_growth',
    name: '汽车营销全链路模板',
    subjectType: 'user',
    description: '覆盖曝光、点击、留资、试驾、成交的广告行为链路。',
    status: 'enabled',
    creatorId: 'u_xcy',
    creatorName: 'Chaoyang Xu',
    createdAt: '2026-05-12 10:18:00',
    updatedAt: now,
    behaviorEventConfig: mockBehaviorEventConfig,
    metricConfig: [...buildSystemMetrics('tpl_auto_growth', mockBehaviorEventConfig), userMetric, qualityLeadMetric, frequencyPressureMetric],
  },
  {
    id: 'tpl_store_arrival',
    name: '门店到店服务模板',
    subjectType: 'store_customer',
    description: '覆盖广告点击、领券、服务预约、到店核销的门店经营链路。',
    status: 'enabled',
    creatorId: 'u_store_ops',
    creatorName: '门店运营',
    createdAt: '2026-05-05 09:30:00',
    updatedAt: '2026-05-27 18:10:00',
    behaviorEventConfig: storeEventConfig,
    metricConfig: [...buildSystemMetrics('tpl_store_arrival', storeEventConfig), storeAppointmentMetric],
  },
  {
    id: 'tpl_private_domain',
    name: '私域承接广告模板',
    subjectType: 'user',
    description: '展示广告到加企微、留资、成交的私域承接路径。',
    status: 'enabled',
    creatorId: 'u_private_ops',
    creatorName: '私域运营',
    createdAt: '2026-05-08 14:25:00',
    updatedAt: '2026-05-26 17:45:00',
    behaviorEventConfig: privateDomainEventConfig,
    metricConfig: [...buildSystemMetrics('tpl_private_domain', privateDomainEventConfig), privateDomainMetric],
  },
  {
    id: 'tpl_service_growth',
    name: '售后服务线索模板',
    subjectType: 'store_customer',
    description: '服务预约与到店转化链路，当前用于历史报表快照。',
    status: 'disabled',
    creatorId: 'u_ops',
    creatorName: '运营管理员',
    createdAt: '2026-04-20 09:00:00',
    updatedAt: '2026-05-10 11:30:00',
    behaviorEventConfig: [
      { id: 'evt_service_click', templateId: 'tpl_service_growth', adBehavior: 'click', eventName: 'click', displayName: '点击', orderIndex: 1 },
      { id: 'evt_service_booking', templateId: 'tpl_service_growth', adBehavior: 'lead', eventName: 'service_booking', displayName: '服务预约', orderIndex: 2 },
      { id: 'evt_service_store', templateId: 'tpl_service_growth', adBehavior: 'lead', eventName: 'arrive_store', displayName: '到店', orderIndex: 3 },
    ],
    metricConfig: buildSystemMetrics('tpl_service_growth', [
      { id: 'evt_service_click', templateId: 'tpl_service_growth', adBehavior: 'click', eventName: 'click', displayName: '点击', orderIndex: 1 },
      { id: 'evt_service_booking', templateId: 'tpl_service_growth', adBehavior: 'lead', eventName: 'service_booking', displayName: '服务预约', orderIndex: 2 },
      { id: 'evt_service_store', templateId: 'tpl_service_growth', adBehavior: 'lead', eventName: 'arrive_store', displayName: '到店', orderIndex: 3 },
    ]),
  },
]

export const mockAdReports: AdAnalysisReport[] = [
  {
    id: 'rpt_effect_growth',
    name: '新能源上市广告效果分析',
    templateId: 'tpl_auto_growth',
    templateName: '汽车营销全链路模板',
    reportType: 'effect',
    defaultTimeRange: ['2026-05-01', '2026-05-28'],
    channelIds: ['toutiao', 'tencent', 'kuaishou', 'xiaohongshu'],
    creatorId: 'u_xcy',
    creatorName: 'Chaoyang Xu',
    authorizedUserIds: ['u_xcy', 'u_ops'],
    editableUserIds: ['u_xcy'],
    downloadableUserIds: ['u_xcy'],
    exportableUserIds: ['u_xcy'],
    createdAt: '2026-05-14 15:20:00',
    updatedAt: '2026-05-28 15:42:00',
    status: 'enabled',
  },
  {
    id: 'rpt_media_mix',
    name: '跨媒体渠道路径评估',
    templateId: 'tpl_auto_growth',
    templateName: '汽车营销全链路模板',
    reportType: 'media_channel',
    defaultTimeRange: ['2026-05-01', '2026-05-28'],
    channelIds: ['toutiao', 'tencent', 'kuaishou', 'gdt', 'wechat_channels'],
    creatorId: 'u_xcy',
    creatorName: 'Chaoyang Xu',
    authorizedUserIds: ['u_xcy', 'u_ops'],
    editableUserIds: ['u_xcy'],
    downloadableUserIds: ['u_xcy'],
    exportableUserIds: ['u_xcy'],
    createdAt: '2026-05-16 12:00:00',
    updatedAt: '2026-05-28 15:35:00',
    status: 'enabled',
  },
  {
    id: 'rpt_city_creative',
    name: '重点城市创意投放对比',
    templateId: 'tpl_auto_growth',
    templateName: '汽车营销全链路模板',
    reportType: 'effect',
    defaultTimeRange: ['2026-05-08', '2026-05-28'],
    channelIds: ['toutiao', 'tencent', 'baidu'],
    creatorId: 'u_ops',
    creatorName: '运营管理员',
    authorizedUserIds: ['u_xcy', 'u_ops', 'u_sales'],
    editableUserIds: ['u_xcy', 'u_ops'],
    downloadableUserIds: ['u_xcy', 'u_ops'],
    exportableUserIds: ['u_xcy'],
    createdAt: '2026-05-18 11:10:00',
    updatedAt: '2026-05-28 14:05:00',
    status: 'enabled',
  },
  {
    id: 'rpt_retargeting_media',
    name: '高意向复投媒体组合分析',
    templateId: 'tpl_auto_growth',
    templateName: '汽车营销全链路模板',
    reportType: 'media_channel',
    defaultTimeRange: ['2026-05-10', '2026-05-28'],
    channelIds: ['tencent', 'gdt', 'wechat_channels', 'xiaohongshu'],
    creatorId: 'u_xcy',
    creatorName: 'Chaoyang Xu',
    authorizedUserIds: ['u_xcy', 'u_ops'],
    editableUserIds: ['u_xcy'],
    downloadableUserIds: ['u_xcy'],
    exportableUserIds: ['u_xcy'],
    createdAt: '2026-05-19 16:20:00',
    updatedAt: '2026-05-28 13:12:00',
    status: 'enabled',
  },
  {
    id: 'rpt_store_arrival',
    name: '门店到店广告效果追踪',
    templateId: 'tpl_store_arrival',
    templateName: '门店到店服务模板',
    reportType: 'effect',
    defaultTimeRange: ['2026-05-03', '2026-05-28'],
    channelIds: ['kuaishou', 'gdt', 'baidu'],
    creatorId: 'u_store_ops',
    creatorName: '门店运营',
    authorizedUserIds: ['u_xcy', 'u_store_ops'],
    editableUserIds: ['u_xcy', 'u_store_ops'],
    downloadableUserIds: ['u_xcy', 'u_store_ops'],
    exportableUserIds: ['u_xcy'],
    createdAt: '2026-05-20 09:45:00',
    updatedAt: '2026-05-28 12:40:00',
    status: 'enabled',
  },
  {
    id: 'rpt_private_domain',
    name: '私域承接路径广告分析',
    templateId: 'tpl_private_domain',
    templateName: '私域承接广告模板',
    reportType: 'media_channel',
    defaultTimeRange: ['2026-05-12', '2026-05-28'],
    channelIds: ['wechat_channels', 'xiaohongshu', 'toutiao', 'tencent'],
    creatorId: 'u_private_ops',
    creatorName: '私域运营',
    authorizedUserIds: ['u_xcy', 'u_private_ops'],
    editableUserIds: ['u_xcy', 'u_private_ops'],
    downloadableUserIds: ['u_xcy'],
    exportableUserIds: ['u_xcy'],
    createdAt: '2026-05-21 10:00:00',
    updatedAt: '2026-05-28 11:55:00',
    status: 'enabled',
  },
]

export const mockAdAuditLogs: AdAuditLog[] = [
  {
    id: 'audit_query_effect_seed',
    userId: 'u_xcy',
    userName: 'Chaoyang Xu',
    action: '查询广告数据',
    actionLabel: '查询广告数据',
    reportId: 'rpt_effect_growth',
    templateId: 'tpl_auto_growth',
    sourceType: 'effect_query',
    sourceConfig: {
      channels: ['toutiao', 'tencent', 'kuaishou', 'xiaohongshu'],
      aggregate_dimensions: ['channel', 'advertiser'],
      time_range: { start: '2026-05-01', end: '2026-05-28' },
      selected_metrics: ['metric_roi_score', 'metric_quality_lead_rate'],
    },
    requestId: 'effect_seed_001',
    ip: '127.0.0.1',
    createdAt: '2026-05-28 15:58:00',
  },
  {
    id: 'audit_export_overlap_seed',
    userId: 'u_xcy',
    userName: 'Chaoyang Xu',
    action: '导出分群',
    actionLabel: '导出分群',
    reportId: 'rpt_media_mix',
    templateId: 'tpl_auto_growth',
    entityId: 'seg_high_intent_ev',
    entityName: '巨量引擎-视频号重合用户人群',
    sourceType: 'overlap',
    sourceConfig: {
      rowChannelId: 'toutiao',
      columnChannelId: 'wechat_channels',
      event: 'effective_lead',
      percentage: 0.213,
    },
    requestId: 'export_seed_001',
    ip: '127.0.0.1',
    createdAt: '2026-05-28 15:42:00',
  },
  {
    id: 'audit_metric_create_seed',
    userId: 'u_ops',
    userName: '运营管理员',
    action: '新建广告指标',
    actionLabel: '新建广告指标',
    templateId: 'tpl_auto_growth',
    entityId: 'metric_quality_lead_rate',
    entityName: '有效线索率',
    sourceType: 'metric_config',
    sourceConfig: {
      metric_name: '有效线索率',
      metric_type: 'composite',
      formula: 'B / A',
      filters: ['city_tier in 一线,新一线', 'tag_budget_ready = 已命中'],
    },
    requestId: 'metric_seed_001',
    ip: '127.0.0.1',
    createdAt: '2026-05-27 18:36:00',
  },
  {
    id: 'audit_download_seed',
    userId: 'u_xcy',
    userName: 'Chaoyang Xu',
    action: '下载明细数据',
    actionLabel: '下载明细数据',
    reportId: 'rpt_store_arrival',
    templateId: 'tpl_store_arrival',
    entityId: 'download_seed_001',
    entityName: '门店到店广告效果追踪_20260528.xlsx',
    sourceType: 'download',
    sourceConfig: {
      source: '广告效果明细',
      channels: ['kuaishou', 'gdt', 'baidu'],
      table: 'effect_detail',
      time_range: { start: '2026-05-03', end: '2026-05-28' },
    },
    requestId: 'download_seed_001',
    ip: '127.0.0.1',
    createdAt: '2026-05-27 16:12:00',
  },
  {
    id: 'audit_view_permission_seed',
    userId: 'u_xcy',
    userName: 'Chaoyang Xu',
    action: '查看广告主或渠道数据',
    actionLabel: '查看广告主或渠道数据',
    reportId: 'rpt_private_domain',
    templateId: 'tpl_private_domain',
    sourceType: 'ad_data_permission',
    sourceConfig: {
      channels: ['wechat_channels', 'xiaohongshu'],
      advertisers: ['adv_private_domain', 'adv_koc_ev'],
      permission_scope: 'authorized_report_and_channel',
    },
    requestId: 'permission_seed_001',
    ip: '127.0.0.1',
    createdAt: '2026-05-26 10:20:00',
  },
]

const channelBase = Object.fromEntries(adChannelSeeds.map((channel) => [channel.id, channel.base])) as Record<string, number>

const getTaxonomyName = (nodes: AdTaxonomyNode[], id: string) =>
  nodes.find((node) => node.id === id)?.name ?? id

const matchFilter = (selected: string[], id: string) => selected.length === 0 || selected.includes(id)

const hashNumber = (value: string) => {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

const querySeed = (...parts: unknown[]) => hashNumber(JSON.stringify(parts))

const rangeFactor = (seed: number, min: number, max: number) =>
  min + (seed % 1000 / 999) * (max - min)

const dateSpanFactor = (timeRange: AdTimeRangeQuery, baselineDays: number) => {
  const start = Date.parse(`${timeRange.start}T00:00:00`)
  const end = Date.parse(`${timeRange.end}T00:00:00`)
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 1
  const days = Math.floor((end - start) / 86_400_000) + 1
  return Math.max(0.45, Math.min(1.35, days / baselineDays))
}

interface AdEffectRawRow extends AdEffectDetailRow {
  advertiserId: string
  adGroupId: string
  adPlanId: string
  adCreativeId: string
}

const uniqueLabel = (values: string[]) => {
  const unique = Array.from(new Set(values))
  if (unique.length === 0) return '-'
  if (unique.length === 1) return unique[0]!
  return `多项(${unique.length})`
}

const aggregateEffectRows = (
  dimensions: string[],
  rawRows: AdEffectRawRow[],
  selectedMetrics: AdMetricConfig[],
): AdEffectDetailRow[] => {
  const activeDimensions = dimensions.length > 0 ? dimensions : ['channel']
  const dimensionValue = (row: AdEffectRawRow, dimension: string) => {
    const values: Record<string, { id: string, name: string }> = {
      channel: { id: row.channelId, name: row.channelName },
      advertiser: { id: row.advertiserId, name: row.advertiserName },
      ad_group: { id: row.adGroupId, name: row.adGroupName },
      ad_plan: { id: row.adPlanId, name: row.adPlanName },
      ad_creative: { id: row.adCreativeId, name: row.adCreativeName },
    }
    return values[dimension] ?? values.channel!
  }

  const groups = new Map<string, AdEffectRawRow[]>()
  rawRows.forEach((row) => {
    const key = activeDimensions.map((dimension) => dimensionValue(row, dimension).id).join('|')
    groups.set(key, [...(groups.get(key) ?? []), row])
  })

  return Array.from(groups.entries()).map(([key, rows]) => {
    const base = rows[0]!
    const totals = rows.reduce(
      (acc, row) => {
        acc.impressionsUsers += row.impressionsUsers
        acc.impressions += row.impressions
        acc.clickUsers += row.clickUsers
        acc.clicks += row.clicks
        acc.leadUsers += row.leadUsers
        acc.testDriveUsers += row.testDriveUsers
        acc.dealUsers += row.dealUsers
        acc.cost += row.cost
        selectedMetrics.forEach((metric) => {
          acc.customMetricSums[metric.id] = (acc.customMetricSums[metric.id] ?? 0) + (row.customMetrics[metric.id] ?? 0)
        })
        return acc
      },
      {
        impressionsUsers: 0,
        impressions: 0,
        clickUsers: 0,
        clicks: 0,
        leadUsers: 0,
        testDriveUsers: 0,
        dealUsers: 0,
        cost: 0,
        customMetricSums: {} as Record<string, number>,
      },
    )
    const dimensionName = activeDimensions.map((dimension) => dimensionValue(base, dimension).name).join(' / ')

    return {
      rowId: `agg_${key}`,
      dimensionKey: key,
      dimensionName,
      channelId: activeDimensions.includes('channel') ? base.channelId : '',
      channelName: activeDimensions.includes('channel') ? base.channelName : uniqueLabel(rows.map((row) => row.channelName)),
      advertiserName: activeDimensions.includes('advertiser') ? base.advertiserName : uniqueLabel(rows.map((row) => row.advertiserName)),
      adGroupName: activeDimensions.includes('ad_group') ? base.adGroupName : uniqueLabel(rows.map((row) => row.adGroupName)),
      adPlanName: activeDimensions.includes('ad_plan') ? base.adPlanName : uniqueLabel(rows.map((row) => row.adPlanName)),
      adCreativeName: activeDimensions.includes('ad_creative') ? base.adCreativeName : uniqueLabel(rows.map((row) => row.adCreativeName)),
      impressionsUsers: totals.impressionsUsers,
      impressions: totals.impressions,
      clickUsers: totals.clickUsers,
      clicks: totals.clicks,
      leadUsers: totals.leadUsers,
      testDriveUsers: totals.testDriveUsers,
      dealUsers: totals.dealUsers,
      ctr: totals.clicks / Math.max(totals.impressions, 1),
      leadRate: totals.leadUsers / Math.max(totals.clickUsers, 1),
      conversionRate: totals.dealUsers / Math.max(totals.clickUsers, 1),
      cost: totals.cost,
      avgCpc: totals.cost / Math.max(totals.clicks, 1),
      customMetrics: selectedMetrics.reduce<Record<string, number>>((acc, metric) => {
        const value = totals.customMetricSums[metric.id] ?? 0
        acc[metric.id] = metric.displayFormat.startsWith('percent') ? value / Math.max(rows.length, 1) : value
        return acc
      }, {}),
    }
  })
}

export const createAdEffectResult = (
  query: AdEffectQueryRequest,
  selectedMetrics: AdMetricConfig[],
): AdEffectResult => {
  const scenarioSeed = querySeed('effect', query.reportId, query.timeRange, query.aggregateDimensions, query.selectedMetricIds, query.crowdFilter)
  const volumeFactor = rangeFactor(scenarioSeed, 0.74, 1.28) * dateSpanFactor(query.timeRange, 28)
  const clickFactor = rangeFactor(Math.floor(scenarioSeed / 7), 0.86, 1.14)
  const leadFactor = rangeFactor(Math.floor(scenarioSeed / 11), 0.82, 1.18)
  const dealFactor = rangeFactor(Math.floor(scenarioSeed / 13), 0.78, 1.22)
  const costFactor = rangeFactor(Math.floor(scenarioSeed / 17), 0.9, 1.16)
  const selectedChannels = adChannels.filter((channel) => matchFilter(query.channels, channel.id))
  const rawRows: AdEffectRawRow[] = selectedChannels.flatMap((channel, channelIndex) => {
    const advertisers = adAdvertisers.filter(
      (advertiser) => advertiser.channelId === channel.id && matchFilter(query.advertisers, advertiser.id),
    )

    return advertisers.flatMap((advertiser, advertiserIndex) => {
      const groups = adGroups.filter(
        (group) => group.advertiserId === advertiser.id && matchFilter(query.adGroups, group.id),
      )

      return groups.flatMap((group, groupIndex) => {
        const plans = adPlans.filter(
          (plan) => plan.adGroupId === group.id && matchFilter(query.adPlans, plan.id),
        )

        return plans.flatMap((plan, planIndex) => {
          const creatives = adCreatives.filter(
            (creative) => creative.adPlanId === plan.id && matchFilter(query.adCreatives, creative.id),
          )

          return creatives.map((creative, creativeIndex) => {
            const rowOffset = advertiserIndex + groupIndex + planIndex + creativeIndex
            const rowSeed = querySeed(query.reportId, query.timeRange.start, channel.id, advertiser.id, group.id, plan.id, creative.id)
            const rowFactor = rangeFactor(rowSeed, 0.9, 1.1)
            const seed = Math.round((channelBase[channel.id as keyof typeof channelBase] ?? 0.7) * 1000)
            const impressions = Math.round((seed * 42 + channelIndex * 2100 + rowOffset * 760) * volumeFactor * rowFactor)
            const clicks = Math.round(impressions * Math.max(0.024, (0.092 - channelIndex * 0.006) * clickFactor))
            const clickUsers = Math.round(clicks * rangeFactor(Math.floor(rowSeed / 5), 0.66, 0.77))
            const leadUsers = Math.round(clickUsers * Math.max(0.08, (0.34 - channelIndex * 0.025) * leadFactor))
            const testDriveUsers = Math.round(leadUsers * Math.max(0.12, (0.42 - advertiserIndex * 0.03) * rangeFactor(Math.floor(rowSeed / 19), 0.9, 1.12)))
            const dealUsers = Math.round(testDriveUsers * Math.max(0.08, (0.27 + channelIndex * 0.015) * dealFactor))
            const cost = Math.round(clicks * (4.8 + channelIndex * 0.9) * costFactor)
            const dimensionName = query.aggregateDimensions.includes('advertiser')
              ? `${channel.name} / ${advertiser.name}`
              : channel.name

            return {
              rowId: `${channel.id}_${advertiser.id}_${group.id}_${plan.id}_${creative.id}`,
              dimensionKey: `${channel.id}:${advertiser.id}:${group.id}:${plan.id}:${creative.id}`,
              dimensionName,
              channelId: channel.id,
              channelName: channel.name,
              advertiserId: advertiser.id,
              advertiserName: advertiser.name,
              adGroupId: group.id,
              adGroupName: getTaxonomyName(adGroups, group.id),
              adPlanId: plan.id,
              adPlanName: getTaxonomyName(adPlans, plan.id),
              adCreativeId: creative.id,
              adCreativeName: getTaxonomyName(adCreatives, creative.id),
              impressionsUsers: Math.round(impressions * 0.68),
              impressions,
              clickUsers,
              clicks,
              leadUsers,
              testDriveUsers,
              dealUsers,
              ctr: clicks / impressions,
              leadRate: leadUsers / clickUsers,
              conversionRate: dealUsers / clickUsers,
              cost,
              avgCpc: cost / clicks,
              customMetrics: selectedMetrics.reduce<Record<string, number>>((acc, metric, index) => {
                acc[metric.id] = metric.displayFormat.startsWith('percent')
                  ? (leadUsers + index * 8) / Math.max(clickUsers, 1)
                  : cost / Math.max(leadUsers + index * 3, 1)
                return acc
              }, {}),
            }
          })
        })
      })
    })
  })
  const rows = aggregateEffectRows(query.aggregateDimensions, rawRows, selectedMetrics)

  const total = rows.reduce(
    (acc, row) => {
      acc.impressions += row.impressions
      acc.clicks += row.clicks
      acc.clickUsers += row.clickUsers
      acc.leads += row.leadUsers
      acc.deals += row.dealUsers
      acc.cost += row.cost
      return acc
    },
    { impressions: 0, clicks: 0, clickUsers: 0, leads: 0, deals: 0, cost: 0 },
  )

  const funnel: AdFunnelStage[] = [
    { id: 'impression', eventName: 'ad_impression', name: '曝光', users: Math.round(total.impressions * 0.68), times: total.impressions, conversionRate: 1 },
    { id: 'click', eventName: 'click', name: '点击', users: total.clickUsers, times: total.clicks, conversionRate: total.clickUsers / Math.max(total.impressions * 0.68, 1) },
    { id: 'lead', eventName: 'phone', name: '留资', users: total.leads, times: Math.round(total.leads * 1.12), conversionRate: total.leads / Math.max(total.clickUsers, 1) },
    { id: 'test_drive', eventName: 'test_drive', name: '试驾', users: Math.round(total.leads * 0.43), times: Math.round(total.leads * 0.51), conversionRate: 0.43 },
    { id: 'deal', eventName: 'buycar', name: '成交', users: total.deals, times: Math.round(total.deals * 1.04), conversionRate: total.deals / Math.max(total.leads, 1) },
  ]

  const channelDistribution = funnel.reduce<Record<string, { channelId: string, channelName: string, value: number, rate: number }[]>>((acc, stage) => {
    const stageRows = rawRows.map((row) => {
      const value = stage.id === 'impression'
        ? row.impressionsUsers
        : stage.id === 'click'
          ? row.clickUsers
          : stage.id === 'lead'
            ? row.leadUsers
            : stage.id === 'test_drive'
              ? row.testDriveUsers
              : row.dealUsers
      return {
        channelId: row.channelId,
        channelName: row.channelName,
        value,
        rate: value / Math.max(stage.users, 1),
      }
    })
    const byChannel = new Map<string, { channelId: string, channelName: string, value: number, rate: number }>()
    stageRows.forEach((row) => {
      const current = byChannel.get(row.channelId)
      byChannel.set(row.channelId, {
        channelId: row.channelId,
        channelName: row.channelName,
        value: (current?.value ?? 0) + row.value,
        rate: 0,
      })
    })
    acc[stage.id] = Array.from(byChannel.values()).map((row) => ({
      ...row,
      rate: row.value / Math.max(stage.users, 1),
    }))
    return acc
  }, {})

  return {
    queryId: `effect_${Date.now()}`,
    summary: [
      { key: 'impressions', label: '展示数', value: total.impressions, change: Number(rangeFactor(scenarioSeed, -1.8, 13.6).toFixed(1)) },
      { key: 'clicks', label: '点击数', value: total.clicks, change: Number(rangeFactor(Math.floor(scenarioSeed / 3), -2.4, 11.2).toFixed(1)) },
      { key: 'cost', label: '总花费', value: total.cost, unit: '元', change: Number(rangeFactor(Math.floor(scenarioSeed / 5), -8.6, 4.8).toFixed(1)) },
      { key: 'conversion_rate', label: '成交转化率', value: total.deals / Math.max(total.clickUsers, 1), unit: '%', change: Number(rangeFactor(Math.floor(scenarioSeed / 7), -1.6, 6.8).toFixed(1)) },
    ],
    detailRows: rows,
    funnel,
    channelDistribution,
  }
}

export const createAdMediaResult = (query: AdMediaQueryRequest): AdMediaResult => {
  const channels = adChannels.filter((channel) => matchFilter(query.channels, channel.id)).slice(0, 5)
  const middleLimit = Math.max(0, query.conversionSteps - 2)
  const eventChain = [query.startEvent, ...query.middleEvents.filter(Boolean).slice(0, middleLimit), query.endEvent].filter(Boolean)
  const scenarioSeed = querySeed('media', query.reportId, query.timeRange, eventChain, query.crowdFilter, query.frequencyEvent, query.overlapEvent)
  const volumeFactor = rangeFactor(scenarioSeed, 0.76, 1.26) * dateSpanFactor(query.timeRange, 28)
  const pathRateFactor = rangeFactor(Math.floor(scenarioSeed / 7), 0.9, 1.08)
  const eventFactor = (eventName?: string) => {
    const index = eventChain.findIndex((event) => event === eventName)
    return index < 0 ? 1 : Math.max(0.54, 1 - index * 0.13)
  }
  const frequencyFactor = eventFactor(query.frequencyEvent)
  const overlapFactor = eventFactor(query.overlapEvent)
  const nodes = channels.flatMap((channel, channelIndex) =>
    eventChain.map((eventName, depth) => {
      const nodeSeed = querySeed(query.reportId, channel.id, eventName, depth)
      return {
        id: `${channel.id}_${eventName}_${depth}`,
        name: `${channel.name}-${eventName}`,
        depth,
        value: Math.round((2800 - depth * 520) * (channelBase[channel.id as keyof typeof channelBase] ?? 0.7) * volumeFactor * rangeFactor(nodeSeed, 0.86, 1.14)),
        rate: Math.min(0.98, Math.max(0.12, (1 - depth * 0.19 - channelIndex * 0.03) * pathRateFactor)),
        channelId: channel.id,
      }
    }),
  )
  const links = channels.flatMap((channel) =>
    eventChain.slice(0, -1).map((eventName, index) => {
      const next = eventChain[index + 1]
      const linkSeed = querySeed(query.reportId, channel.id, eventName, next, index)
      const value = Math.round((1900 - index * 420) * (channelBase[channel.id as keyof typeof channelBase] ?? 0.7) * volumeFactor * rangeFactor(linkSeed, 0.88, 1.16))
      return {
        source: `${channel.id}_${eventName}_${index}`,
        target: `${channel.id}_${next}_${index + 1}`,
        value,
        rate: value / Math.max(2600 * volumeFactor, 1),
        channelId: channel.id,
        pathLevel: index + 1,
        description: `${channel.name} 从 ${eventName} 流转到 ${next}`,
      }
    }),
  )

  const frequency = channels.map((channel, index) => {
    const rowFactor = volumeFactor * rangeFactor(querySeed(query.reportId, channel.id, query.frequencyEvent, 'frequency'), 0.88, 1.12)
    const onceUsers = Math.round((1120 + index * 210) * frequencyFactor * rowFactor)
    const twiceUsers = Math.round((920 - index * 74) * frequencyFactor * rowFactor)
    const threeUsers = Math.round((660 - index * 48) * frequencyFactor * rowFactor)
    const fourUsers = Math.round((420 - index * 32) * frequencyFactor * rowFactor)
    const fiveUsers = Math.round((260 - index * 20) * frequencyFactor * rowFactor)
    const moreThanFiveUsers = Math.round((140 + index * 8) * frequencyFactor * rowFactor)
    const convertedUsers = Math.round((twiceUsers + threeUsers + fourUsers) * (0.26 + index * 0.01 + (1 - frequencyFactor) * 0.08))
    return {
      channelId: channel.id,
      channelName: channel.name,
      onceUsers,
      twiceUsers,
      threeUsers,
      fourUsers,
      fiveUsers,
      moreThanFiveUsers,
      convertedUsers,
      conversionRate: convertedUsers / (onceUsers + twiceUsers + threeUsers + fourUsers + fiveUsers + moreThanFiveUsers),
    }
  })

  const cells: AdOverlapCell[] = channels.flatMap((row, rowIndex) =>
    channels.map((column, columnIndex) => {
      const diagonal = row.id === column.id
      const cellFactor = volumeFactor * rangeFactor(querySeed(query.reportId, row.id, column.id, query.overlapEvent, 'overlap'), 0.9, 1.1)
      const users = Math.round((diagonal
        ? 3600 - rowIndex * 380
        : Math.max(220, 1500 - Math.abs(rowIndex - columnIndex) * 260 - columnIndex * 90)) * overlapFactor * cellFactor)
      return {
        rowChannelId: row.id,
        columnChannelId: column.id,
        users,
        percentage: users / Math.max(diagonal ? users : 3600 - rowIndex * 380, 1),
      }
    }),
  )

  return {
    queryId: `media_${Date.now()}`,
    path: { nodes, links },
    frequency,
    overlap: { channels, cells },
  }
}

const dateBuckets = (start: string, end: string) => {
  const dates: string[] = []
  const cursor = new Date(`${start}T00:00:00`)
  const limit = new Date(`${end}T00:00:00`)
  while (cursor <= limit && dates.length < 31) {
    dates.push(cursor.toISOString().slice(0, 10))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

export const createAdReportResult = (query: AdReportQueryRequest): AdReportResult => {
  const channels = adChannels.filter((channel) => matchFilter(query.mediaChannels, channel.id))
  const scenarioSeed = querySeed('ad-report', query.timeRange, query.mediaChannels, query.advertisers, query.adGroups, query.adCreatives, query.metric)
  const volumeFactor = rangeFactor(scenarioSeed, 0.82, 1.2) * dateSpanFactor(query.timeRange, 28)
  const clickFactor = rangeFactor(Math.floor(scenarioSeed / 7), 0.88, 1.12)
  const costFactor = rangeFactor(Math.floor(scenarioSeed / 11), 0.9, 1.14)
  const trend: AdDailyTrendPoint[] = dateBuckets(query.timeRange.start, query.timeRange.end).map((date, index) => {
    const impressions = Math.round((38000 + index * 860 + (index % 4) * 2100) * volumeFactor)
    const clicks = Math.round(impressions * (0.083 + (index % 5) * 0.002) * clickFactor)
    const cost = Math.round(clicks * (4.6 + (index % 3) * 0.45) * costFactor)
    return {
      date,
      impressions,
      clicks,
      cost,
      ctr: clicks / impressions,
      avgCpc: cost / clicks,
    }
  })

  const detailRows: AdReportDetailRow[] = channels.flatMap((channel, index) => {
    const advertisers = adAdvertisers.filter(
      (advertiser) => advertiser.channelId === channel.id && matchFilter(query.advertisers, advertiser.id),
    )
    return advertisers.flatMap((advertiser) => {
      const groups = adGroups.filter(
        (group) => group.advertiserId === advertiser.id && matchFilter(query.adGroups, group.id),
      )

      return groups.flatMap((group, groupIndex) => {
        const creatives = adCreatives.filter(
          (creative) => creative.adGroupId === group.id && matchFilter(query.adCreatives, creative.id),
        )

        return creatives.map((creative, creativeIndex) => {
          const rowFactor = rangeFactor(querySeed(query.timeRange.start, channel.id, advertiser.id, group.id, creative.id), 0.9, 1.1)
          const impressions = Math.round(120000 * (channelBase[channel.id as keyof typeof channelBase] ?? 0.7))
            + groupIndex * 2800
            + creativeIndex * 1200
          const adjustedImpressions = Math.round(impressions * volumeFactor * rowFactor)
          const clicks = Math.round(adjustedImpressions * (0.086 - index * 0.004) * clickFactor)
          const cost = Math.round(clicks * (4.9 + index * 0.55) * costFactor)
          const conversionUsers = Math.round(clicks * (0.19 + index * 0.01))
          return {
            rowId: `${channel.id}_${advertiser.id}_${group.id}_${creative.id}`,
            channelId: channel.id,
            channelName: channel.name,
            advertiserName: advertiser.name,
            adGroupName: group.name,
            adCreativeName: creative.name,
            impressions: adjustedImpressions,
            clicks,
            cost,
            ctr: clicks / adjustedImpressions,
            avgCpc: cost / clicks,
            conversionUsers,
            conversionRate: conversionUsers / clicks,
          }
        })
      })
    })
  })

  return {
    queryId: `ad_report_${Date.now()}`,
    trend,
    detailRows,
  }
}
