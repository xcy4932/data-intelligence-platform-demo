import type {
  AffectedUser,
  AnomalyDiagnosis,
  ChartLegendItem,
  ComparisonGroup,
  CumulativeSeriesPoint,
  DashboardLocation,
  DimensionContribution,
  DownloadTask,
  DualAxisPoint,
  EventAnalysisDetailRow,
  EventAnalysisMetricCard,
  EventAnalysisResult,
  EventAnalysisTemplate,
  EventDefinition,
  EventMetadata,
  EventMetricConfig,
  EventProperty,
  FilterCondition,
  GroupByConfig,
  GroupSummaryRow,
  MetricTrendPoint,
  PercentageSeriesPoint,
  TimeSeriesPoint,
  UserAttribute,
  UserSegmentOption,
  UserTag,
} from '@/types/eventAnalysis'
import type { CustomFormulaMetric, FormulaToken } from '@/types/formula'

const getCyclicValue = <T>(items: T[], index: number): T => {
  const item = items[index % items.length]

  if (item === undefined) {
    throw new Error('Mock data source cannot be empty')
  }

  return item
}

const propertyOperators = ['equals', 'not_equals', 'in', 'not_in', 'contains', 'regex'] as const
const numberOperators = ['gt', 'gte', 'lt', 'lte', 'between'] as const

const baseProperties: EventProperty[] = [
  {
    propertyName: 'device_os',
    displayName: '设备系统',
    dataType: 'string',
    propertyType: 'common_property',
    availableOperators: [...propertyOperators],
  },
  {
    propertyName: 'app_version',
    displayName: 'App 版本',
    dataType: 'string',
    propertyType: 'common_property',
    availableOperators: [...propertyOperators],
  },
  {
    propertyName: 'channel',
    displayName: '渠道',
    dataType: 'string',
    propertyType: 'user_property',
    availableOperators: [...propertyOperators],
  },
  {
    propertyName: 'payment_status',
    displayName: '付费状态',
    dataType: 'string',
    propertyType: 'user_property',
    availableOperators: [...propertyOperators],
  },
  {
    propertyName: 'coin_balance_level',
    displayName: '金币余额等级',
    dataType: 'string',
    propertyType: 'user_tag',
    availableOperators: [...propertyOperators],
  },
]

const buildEvent = (
  eventName: string,
  displayName: string,
  category: EventDefinition['category'],
  description: string,
  extraProperties: EventProperty[],
  eventType: EventDefinition['eventType'] = 'general',
): EventDefinition => ({
  eventName,
  displayName,
  category,
  description,
  eventType,
  properties: [...baseProperties, ...extraProperties],
})

export const mockEventDefinitions: EventDefinition[] = [
  buildEvent('app_launch', '应用启动', 'app', '用户打开 App。', [
    {
      propertyName: 'launch_scene',
      displayName: '启动场景',
      dataType: 'string',
      propertyType: 'event_property',
      availableOperators: [...propertyOperators],
    },
  ]),
  buildEvent('game_start', '开始游戏', 'game', '用户进入一局游戏。', [
    {
      propertyName: 'game_type',
      displayName: '游戏类型',
      dataType: 'string',
      propertyType: 'event_property',
      availableOperators: [...propertyOperators],
    },
  ]),
  buildEvent('game_end', '结束游戏', 'game', '用户完成一局游戏。', [
    {
      propertyName: 'coin_change',
      displayName: '金币变化',
      dataType: 'number',
      propertyType: 'event_property',
      availableOperators: [...numberOperators],
    },
  ]),
  buildEvent('ad_exposure', '广告入口曝光', 'ad', '广告入口被展示。', [
    {
      propertyName: 'ad_position',
      displayName: '广告位',
      dataType: 'string',
      propertyType: 'event_property',
      availableOperators: [...propertyOperators],
    },
  ]),
  buildEvent('ad_click', '广告点击', 'ad', '用户点击广告入口。', [
    {
      propertyName: 'ad_position',
      displayName: '广告位',
      dataType: 'string',
      propertyType: 'event_property',
      availableOperators: [...propertyOperators],
    },
  ]),
  buildEvent('ad_watch_start', '广告开始播放', 'ad', '用户开始观看激励广告。', [
    {
      propertyName: 'duration',
      displayName: '播放时长',
      dataType: 'number',
      propertyType: 'event_property',
      availableOperators: [...numberOperators],
    },
  ]),
  buildEvent('ad_watch_complete', '广告观看完成', 'ad', '用户完整看完一次激励广告。', [
    {
      propertyName: 'revenue',
      displayName: '广告收益',
      dataType: 'number',
      propertyType: 'event_property',
      availableOperators: [...numberOperators],
    },
  ]),
  buildEvent('reward_claim', '奖励领取', 'reward', '用户领取金币或道具奖励。', [
    {
      propertyName: 'reward_amount',
      displayName: '奖励数量',
      dataType: 'number',
      propertyType: 'event_property',
      availableOperators: [...numberOperators],
    },
  ]),
  buildEvent('task_center_enter', '进入任务中心', 'task', '用户进入任务中心。', [
    {
      propertyName: 'entry_source',
      displayName: '入口来源',
      dataType: 'string',
      propertyType: 'event_property',
      availableOperators: [...propertyOperators],
    },
  ]),
  buildEvent('payment_success', '支付成功', 'payment', '用户完成付费。', [
    {
      propertyName: 'pay_amount',
      displayName: '支付金额',
      dataType: 'number',
      propertyType: 'event_property',
      availableOperators: [...numberOperators],
    },
  ]),
  buildEvent('virtual_valid_ad_watch', '广告有效观看', 'ad', '虚拟事件：完整观看且领取奖励。', [
    {
      propertyName: 'valid_watch_seconds',
      displayName: '有效观看秒数',
      dataType: 'number',
      propertyType: 'event_property',
      availableOperators: [...numberOperators],
    },
  ], 'virtual'),
  buildEvent('virtual_low_coin_ad_trigger', '低金币触发广告', 'ad', '虚拟事件：低金币状态下触发激励广告入口。', [
    {
      propertyName: 'trigger_scene',
      displayName: '触发场景',
      dataType: 'string',
      propertyType: 'event_property',
      availableOperators: [...propertyOperators],
    },
    {
      propertyName: 'coin_balance_before',
      displayName: '触发前金币余额',
      dataType: 'number',
      propertyType: 'event_property',
      availableOperators: [...numberOperators],
    },
  ], 'virtual'),
  buildEvent('circle_home_ad_click', '首页广告入口点击', 'ad', '圈选事件：首页广告入口按钮点击。', [
    {
      propertyName: 'button_area',
      displayName: '按钮区域',
      dataType: 'string',
      propertyType: 'event_property',
      availableOperators: [...propertyOperators],
    },
  ], 'circle'),
  buildEvent('circle_low_coin_popup_click', '金币不足弹窗点击', 'ad', '圈选事件：点击金币不足弹窗广告按钮。', [
    {
      propertyName: 'popup_style',
      displayName: '弹窗样式',
      dataType: 'string',
      propertyType: 'event_property',
      availableOperators: [...propertyOperators],
    },
  ], 'circle'),
]

export const mockUserAttributes: UserAttribute[] = [
  { field: 'register_days', displayName: '注册天数', dataType: 'number', description: '用户注册距今天数。' },
  { field: 'payment_status', displayName: '付费状态', dataType: 'string', description: '未付费、轻付费、高付费。' },
  { field: 'country', displayName: '国家地区', dataType: 'string', description: '用户所在地区。' },
  { field: 'channel', displayName: '获客渠道', dataType: 'string', description: '自然量、广告投放、社交裂变等。' },
  { field: 'last_login_time', displayName: '最近登录时间', dataType: 'datetime', description: '最近一次登录时间。' },
  { field: 'coin_balance', displayName: '金币余额', dataType: 'number', description: '当前金币余额。' },
  { field: 'user_level', displayName: '用户等级', dataType: 'string', description: '游戏等级。' },
  { field: 'game_rounds_7d', displayName: '近 7 日游戏局数', dataType: 'number', description: '近 7 天总局数。' },
]

export const mockUserTags: UserTag[] = [
  { field: 'coin_balance_level', displayName: '金币余额等级', valueExamples: ['低金币', '中金币', '高金币'], description: '按金币余额分层。' },
  { field: 'active_level', displayName: '活跃等级', valueExamples: ['低活跃', '中活跃', '高活跃'], description: '按活跃天数分层。' },
  { field: 'churn_risk', displayName: '流失风险', valueExamples: ['低', '中', '高'], description: '流失预测风险。' },
  { field: 'ad_preference', displayName: '广告偏好', valueExamples: ['高接受', '中接受', '低接受'], description: '广告观看偏好。' },
  { field: 'game_preference', displayName: '游戏偏好', valueExamples: ['斗地主', '麻将', '德州扑克'], description: '偏好的游戏类型。' },
  { field: 'lifecycle_stage', displayName: '生命周期', valueExamples: ['新用户', '成长期', '成熟期'], description: '用户生命周期阶段。' },
  { field: 'payment_potential', displayName: '付费潜力', valueExamples: ['低', '中', '高'], description: '付费潜力评分。' },
  { field: 'task_sensitivity', displayName: '任务敏感度', valueExamples: ['低', '中', '高'], description: '任务入口响应程度。' },
]

export const mockUserSegments: UserSegmentOption[] = [
  { id: 'seg_active_7d', name: '近 7 日活跃用户', estimatedUsers: 168430, description: '近 7 天至少登录 1 天。' },
  { id: 'seg_low_coin_high_active', name: '低金币高活跃用户', estimatedUsers: 46820, description: '金币低且活跃天数高。' },
  { id: 'seg_low_coin_ad_decline', name: '低金币高活跃广告下降用户', estimatedUsers: 28640, description: '本次事件分析识别的重点人群。' },
  { id: 'seg_non_pay_active', name: '非付费活跃用户', estimatedUsers: 73210, description: '活跃但未付费用户。' },
  { id: 'seg_android_183', name: 'Android 1.8.3 用户', estimatedUsers: 39200, description: 'App 1.8.3 版本用户。' },
  { id: 'seg_churn_risk_high', name: '高流失风险用户', estimatedUsers: 18460, description: '流失风险高。' },
]

export const mockEventMetadata: EventMetadata = {
  events: mockEventDefinitions,
  userAttributes: mockUserAttributes,
  userTags: mockUserTags,
  userSegments: mockUserSegments,
}

export const mockDefaultFilters: FilterCondition[] = [
  {
    id: 'filter-active-7d',
    sourceType: 'segment',
    field: 'seg_active_7d',
    fieldDisplayName: '用户分群',
    operator: 'in',
    value: ['seg_active_7d'],
    displayValue: '近 7 日活跃用户',
    logic: 'AND',
  },
  {
    id: 'filter-low-coin',
    sourceType: 'user_tag',
    field: 'coin_balance_level',
    fieldDisplayName: '金币余额等级',
    operator: 'equals',
    value: 'low',
    displayValue: '低金币',
    logic: 'AND',
  },
  {
    id: 'filter-game-rounds',
    sourceType: 'behavior',
    field: 'game_end',
    fieldDisplayName: '行为圈选',
    operator: 'done',
    value: 'game_end',
    displayValue: '过去 7 天做过结束游戏 >= 5 次',
    logic: 'AND',
    behaviorType: 'done',
    timeWindowDays: 7,
    eventName: 'game_end',
    countOperator: 'gte',
    countValue: 5,
    childFilters: [],
  },
  {
    id: 'filter-ad-watch-drop',
    sourceType: 'behavior',
    field: 'ad_watch_complete',
    fieldDisplayName: '行为圈选',
    operator: 'gte',
    value: 'ad_watch_complete',
    displayValue: '过去 3 天广告观看完成次数下降 > 30%',
    logic: 'AND',
    behaviorType: 'done',
    timeWindowDays: 3,
    eventName: 'ad_watch_complete',
    countOperator: 'gte',
    countValue: 1,
    childFilters: [
      {
        id: 'filter-ad-position',
        sourceType: 'event_property',
        field: 'ad_position',
        fieldDisplayName: '广告位',
        operator: 'in',
        value: ['金币不足弹窗', '任务中心'],
        displayValue: '金币不足弹窗 / 任务中心',
        logic: 'AND',
      },
    ],
  },
]

export const mockMetricConfigs: EventMetricConfig[] = [
  {
    id: 'metric_ad_watch_pv',
    name: '广告观看次数',
    eventName: 'ad_watch_complete',
    metricType: 'event',
    operator: 'PV',
    unit: '次',
    precision: 0,
    filters: [],
    enabled: true,
  },
  {
    id: 'metric_ad_watch_uv',
    name: '广告观看人数',
    eventName: 'ad_watch_complete',
    metricType: 'event',
    operator: 'UV',
    unit: '人',
    precision: 0,
    filters: [],
    enabled: true,
  },
  {
    id: 'metric_ad_watch_per_user',
    name: '人均广告观看次数',
    eventName: 'ad_watch_complete',
    metricType: 'event',
    operator: 'PV_UV',
    unit: '次/人',
    precision: 2,
    filters: [],
    enabled: true,
  },
  {
    id: 'metric_ad_revenue',
    name: '广告收益',
    eventName: 'ad_watch_complete',
    metricType: 'property',
    operator: 'SUM',
    propertyName: 'revenue',
    unit: '元',
    precision: 0,
    filters: [],
    enabled: true,
  },
  {
    id: 'metric_ad_complete_rate',
    name: '广告完成率',
    eventName: 'custom_ad_complete_rate',
    metricType: 'custom',
    operator: 'CUSTOM',
    expression: 'ad_watch_complete.PV / ad_watch_start.PV',
    unit: '%',
    precision: 1,
    filters: [],
    enabled: true,
  },
  {
    id: 'metric_ad_click_rate',
    name: '广告点击率',
    eventName: 'custom_ad_click_rate',
    metricType: 'custom',
    operator: 'CUSTOM',
    expression: 'ad_click.PV / ad_exposure.PV',
    unit: '%',
    precision: 1,
    filters: [],
    enabled: true,
  },
  {
    id: 'metric_position_uv_share',
    name: '各广告位观看人数占比',
    eventName: 'formula_position_uv_share',
    metricType: 'formula',
    operator: 'FORMULA',
    expression: 'A / B',
    unit: '%',
    precision: 1,
    filters: [],
    enabled: true,
    groupParticipating: true,
  },
]

const adCompleteRateTokens: FormulaToken[] = [
  { id: 'token-complete-pv', type: 'metric', label: '广告观看完成 PV', value: 'metric_ad_watch_pv', conditionId: 'condition-a' },
  { id: 'token-divide', type: 'operator', label: '÷', value: '/', operator: '/' },
  { id: 'token-start-pv', type: 'metric', label: '广告开始播放 PV', value: 'metric_ad_start_pv', conditionId: 'condition-b' },
]

const adWatchPvMetric = getCyclicValue(mockMetricConfigs, 0)
const adWatchUvMetric = getCyclicValue(mockMetricConfigs, 1)
const active7dFilter = getCyclicValue(mockDefaultFilters, 0)
const highActiveFilter: FilterCondition = {
  id: 'compare-high-active',
  sourceType: 'user_property',
  field: 'active_days_7d',
  fieldDisplayName: '近 7 天活跃天数',
  operator: 'gte',
  value: 5,
  displayValue: '活跃天数 >= 5',
  logic: 'AND',
}

export const mockFormulaMetrics: CustomFormulaMetric[] = [
  {
    id: 'formula_ad_complete_rate',
    name: '广告完成率',
    metricType: 'custom',
    tokens: adCompleteRateTokens,
    conditions: [
      { id: 'condition-a', label: 'A: 广告观看完成 PV', metricConfig: adWatchPvMetric, participateInGroup: true },
      {
        id: 'condition-b',
        label: 'B: 广告开始播放 PV',
        metricConfig: {
          ...adWatchPvMetric,
          id: 'metric_ad_start_pv',
          name: '广告开始播放次数',
          eventName: 'ad_watch_start',
        },
        participateInGroup: true,
      },
    ],
    displayConfig: {
      format: 'percent',
      precision: 1,
      unit: '%',
      showAtomicMetrics: true,
    },
    enabled: true,
  },
  {
    id: 'formula_ad_click_rate',
    name: '广告点击率',
    metricType: 'custom',
    tokens: [
      { id: 'token-click-pv', type: 'metric', label: '广告点击 PV', value: 'metric_ad_click_pv', conditionId: 'condition-c' },
      { id: 'token-click-divide', type: 'operator', label: '÷', value: '/', operator: '/' },
      { id: 'token-exposure-pv', type: 'metric', label: '广告曝光 PV', value: 'metric_ad_exposure_pv', conditionId: 'condition-d' },
    ],
    conditions: [
      {
        id: 'condition-c',
        label: 'C: 广告点击 PV',
        metricConfig: { ...adWatchPvMetric, id: 'metric_ad_click_pv', name: '广告点击次数', eventName: 'ad_click' },
        participateInGroup: true,
      },
      {
        id: 'condition-d',
        label: 'D: 广告曝光 PV',
        metricConfig: { ...adWatchPvMetric, id: 'metric_ad_exposure_pv', name: '广告入口曝光次数', eventName: 'ad_exposure' },
        participateInGroup: true,
      },
    ],
    displayConfig: {
      format: 'percent',
      precision: 1,
      unit: '%',
      showAtomicMetrics: false,
    },
    enabled: true,
  },
  {
    id: 'formula_position_uv_share',
    name: '各广告位广告观看人数占比',
    metricType: 'formula',
    tokens: [
      { id: 'token-group-uv', type: 'metric', label: '分组广告观看 UV', value: 'metric_group_ad_watch_uv', conditionId: 'condition-e' },
      { id: 'token-share-divide', type: 'operator', label: '÷', value: '/', operator: '/' },
      { id: 'token-total-uv', type: 'metric', label: '全部广告观看 UV', value: 'metric_total_ad_watch_uv', conditionId: 'condition-f' },
    ],
    conditions: [
      {
        id: 'condition-e',
        label: 'E: 分组广告观看 UV',
        metricConfig: { ...adWatchUvMetric, id: 'metric_group_ad_watch_uv', name: '分组广告观看人数' },
        participateInGroup: true,
      },
      {
        id: 'condition-f',
        label: 'F: 全部广告观看 UV',
        metricConfig: { ...adWatchUvMetric, id: 'metric_total_ad_watch_uv', name: '全部广告观看人数' },
        participateInGroup: false,
      },
    ],
    displayConfig: {
      format: 'percent',
      precision: 1,
      unit: '%',
      showAtomicMetrics: true,
    },
    enabled: true,
  },
]

export const mockGroupByConfigs: GroupByConfig[] = [
  {
    id: 'group-coin-balance-level',
    field: 'coin_balance_level',
    displayName: '金币余额等级',
    sourceType: 'user_tag',
    groupType: 'enum',
    topN: 10,
    enabled: true,
    applyToMetricIds: ['metric_ad_watch_pv', 'metric_ad_watch_uv'],
  },
  {
    id: 'group-ad-position',
    field: 'ad_position',
    displayName: '广告位',
    sourceType: 'event_property',
    groupType: 'enum',
    topN: 10,
    enabled: true,
    applyToMetricIds: ['metric_ad_watch_pv', 'metric_ad_revenue'],
  },
  {
    id: 'group-game-type',
    field: 'game_type',
    displayName: '游戏类型',
    sourceType: 'event_property',
    groupType: 'enum',
    topN: 10,
    enabled: true,
    applyToMetricIds: ['metric_ad_watch_pv'],
  },
]

export const mockComparisonGroups: ComparisonGroup[] = [
  {
    id: 'group-all-active',
    name: '全部活跃用户',
    description: '近 7 天活跃用户，作为业务基准组。',
    filters: [active7dFilter],
    colorKey: '#2080f0',
    enabled: true,
  },
  {
    id: 'group-low-coin-high-active',
    name: '低金币高活跃用户',
    description: '低金币且活跃天数高，是本次异常的重点问题组。',
    filters: [
      {
        id: 'compare-low-coin',
        sourceType: 'user_tag',
        field: 'coin_balance_level',
        fieldDisplayName: '金币余额等级',
        operator: 'equals',
        value: '低金币',
        displayValue: '低金币',
        logic: 'AND',
      },
      highActiveFilter,
    ],
    colorKey: '#d03050',
    enabled: true,
  },
  {
    id: 'group-normal-coin-high-active',
    name: '正常金币高活跃用户',
    description: '金币余额正常且活跃稳定，用于判断问题是否集中发生。',
    filters: [
      {
        id: 'compare-normal-coin',
        sourceType: 'user_tag',
        field: 'coin_balance_level',
        fieldDisplayName: '金币余额等级',
        operator: 'equals',
        value: '正常',
        displayValue: '正常金币',
        logic: 'AND',
      },
      highActiveFilter,
    ],
    colorKey: '#18a058',
    enabled: true,
  },
]

export const mockDefaultTemplate: EventAnalysisTemplate = {
  id: 'template-ad-watch-decline',
  name: '广告观看下降分析模板',
  description: '默认分析广告观看次数、观看人数、完成率和收益下降原因。',
  scenario: 'ad_watch_decline',
  dateRangeLabel: '过去 14 天',
  timeRange: {
    preset: 'last_14_days',
    startDate: '2026-05-02',
    endDate: '2026-05-15',
    granularity: 'day',
    comparisonType: 'previous_period',
  },
  primaryEventName: 'ad_watch_complete',
  primaryMetricId: 'metric_ad_watch_pv',
  metricConfigs: mockMetricConfigs,
  formulaMetrics: mockFormulaMetrics,
  filters: mockDefaultFilters,
  groupByConfigs: mockGroupByConfigs,
  comparisonGroups: mockComparisonGroups,
  chartConfig: {
    title: '',
    chartType: 'line',
    selectedMetricIds: ['metric_ad_watch_pv'],
    selectedGroupById: 'group-coin-balance-level',
    selectedGroupValues: ['全部活跃用户', '低金币高活跃用户', '正常金币高活跃用户'],
    xAxisMode: 'time',
    yAxisMode: 'single',
    leftAxisMetricIds: ['metric_ad_watch_pv'],
    rightAxisMetricIds: ['metric_ad_complete_rate'],
    dualAxisRenderMode: 'bar_line',
    barDirection: 'vertical',
    displayMode: 'value',
    topN: 10,
    mergeOthers: true,
    showLegend: true,
    showDataLabel: false,
    showTooltip: true,
    showCompareLine: true,
    showPredictionBand: true,
    showAnomalyPoint: true,
    showCumulativeValue: true,
    showGrowthRate: true,
    tableMode: 'flat',
  },
}

export const mockMetricCards: EventAnalysisMetricCard[] = [
  {
    id: 'card-ad-watch-pv',
    metricId: 'metric_ad_watch_pv',
    metricName: '广告观看次数',
    value: 356920,
    compareValue: 407800,
    unit: '次',
    precision: 0,
    changeRate: -12.4,
    status: 'critical',
    tooltip: '事件：广告观看完成；算子：PV；时间范围：过去 14 天；上一周期：407,800。',
  },
  {
    id: 'card-ad-watch-uv',
    metricId: 'metric_ad_watch_uv',
    metricName: '广告观看人数',
    value: 89340,
    compareValue: 97210,
    unit: '人',
    precision: 0,
    changeRate: -8.1,
    status: 'warning',
    tooltip: '事件：广告观看完成；算子：UV；用于衡量触发用户数。',
  },
  {
    id: 'card-ad-watch-per-user',
    metricId: 'metric_ad_watch_per_user',
    metricName: '人均广告观看次数',
    value: 3.99,
    compareValue: 4.19,
    unit: '次/人',
    precision: 2,
    changeRate: -4.7,
    status: 'normal',
    tooltip: '广告观看次数 / 广告观看人数。',
  },
  {
    id: 'card-ad-complete-rate',
    metricId: 'metric_ad_complete_rate',
    metricName: '广告完成率',
    value: 72.6,
    compareValue: 77.5,
    unit: '%',
    precision: 1,
    changeRate: -6.3,
    status: 'warning',
    tooltip: '广告观看完成次数 / 广告开始播放次数。',
  },
  {
    id: 'card-ad-revenue',
    metricId: 'metric_ad_revenue',
    metricName: '广告收益',
    value: 42860,
    compareValue: 47510,
    unit: '元',
    precision: 0,
    changeRate: -9.8,
    status: 'warning',
    tooltip: '广告观看完成事件 revenue 属性 SUM。',
  },
  {
    id: 'card-ad-click-rate',
    metricId: 'metric_ad_click_rate',
    metricName: '广告点击率',
    value: 18.2,
    compareValue: 19.8,
    unit: '%',
    precision: 1,
    changeRate: -8.1,
    status: 'warning',
    tooltip: '广告点击次数 / 广告入口曝光次数。',
  },
]

const trendValues = [414800, 419860, 427120, 433640, 421350, 416940, 412870, 407443, 412300, 409800, 398200, 386500, 372100, 356920]
const dates = ['2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05', '2026-05-06', '2026-05-07', '2026-05-08', '2026-05-09', '2026-05-10', '2026-05-11', '2026-05-12', '2026-05-13', '2026-05-14', '2026-05-15']
const groupNames = ['全部活跃用户', '低金币高活跃用户', '正常金币高活跃用户']

export const mockMetricTrend: MetricTrendPoint[] = dates.map((date, index) => ({
  date,
  actualValue: getCyclicValue(trendValues, index),
  compareValue: 407200 + index * 120,
  expectedValue: 407800 + index * 80,
  upperBound: 426900 + index * 40,
  lowerBound: 389200 - index * 14,
  isAnomaly: index >= 11,
  anomalyLevel: index === 13 ? 'P1' : index >= 11 ? 'P2' : undefined,
}))

export const mockTimeSeries: TimeSeriesPoint[] = dates.flatMap((date, index) =>
  groupNames.map((groupName, groupIndex) => {
    const baseValue = getCyclicValue(trendValues, index)
    const ratio = groupIndex === 0 ? 1 : groupIndex === 1 ? 0.27 - index * 0.004 : 0.31
    const value = Math.round(baseValue * ratio)

    return {
      date,
      groupName,
      metricId: 'metric_ad_watch_pv',
      metricName: '广告观看次数',
      value,
      compareValue: Math.round((407000 + index * 130) * ratio),
      expectedValue: Math.round((408000 + index * 80) * ratio),
      upperBound: Math.round((426000 + index * 50) * ratio),
      lowerBound: Math.round((389000 - index * 12) * ratio),
      isAnomaly: groupIndex === 1 && index >= 11,
      anomalyLevel: groupIndex === 1 && index >= 12 ? 'P1' : groupIndex === 1 && index === 11 ? 'P2' : undefined,
    }
  }),
)

const contributionSource: DimensionContribution[] = [
  ['金币余额区间', '低金币', 82430, 115430, -33000, 42.1, 18640],
  ['广告位', '金币不足弹窗', 64220, 88900, -24680, 31.4, 14820],
  ['用户类型', '非付费用户', 72640, 94200, -21560, 27.5, 15980],
  ['游戏类型', '斗地主', 48300, 61500, -13200, 16.8, 9340],
  ['App 版本', '1.8.3', 39200, 48600, -9400, 12, 7560],
  ['广告位', '任务中心入口', 36200, 43700, -7500, 9.5, 6410],
  ['生命周期', '成熟期', 29800, 35600, -5800, 7.4, 5220],
  ['设备系统', 'Android', 185400, 207200, -21800, 27.7, 19310],
].map(([dimension, dimensionValue, actualValue, expectedValue, diff, contributionRate, affectedUsers], index) => ({
  id: `contrib-${index + 1}`,
  dimension: String(dimension),
  dimensionValue: String(dimensionValue),
  actualValue: Number(actualValue),
  expectedValue: Number(expectedValue),
  diff: Number(diff),
  diffRate: Number(((Number(diff) / Number(expectedValue)) * 100).toFixed(1)),
  contributionRate: Number(contributionRate),
  affectedUsers: Number(affectedUsers),
}))

export const mockGroupSummaries: GroupSummaryRow[] = contributionSource.map((item) => ({
  id: item.id,
  groupName: item.dimensionValue,
  dimension: item.dimension,
  value: item.actualValue,
  compareValue: item.expectedValue,
  percentage: item.contributionRate,
  diffRate: item.diffRate,
  affectedUsers: item.affectedUsers,
}))

export const mockDualAxisSeries: DualAxisPoint[] = dates.map((date, index) => ({
  date,
  leftValue: getCyclicValue(trendValues, index),
  rightValue: Number((76.8 - index * 0.32 - (index >= 11 ? 2.1 : 0)).toFixed(1)),
}))

export const mockPercentageSeries: PercentageSeriesPoint[] = dates.flatMap((date, index) => {
  const low = 38 + index * 0.8
  const normal = 34 - index * 0.2
  const high = 100 - low - normal

  return [
    { date, groupName: '低金币', value: Number(low.toFixed(1)), rawValue: Math.round(getCyclicValue(trendValues, index) * low / 100) },
    { date, groupName: '中金币', value: Number(normal.toFixed(1)), rawValue: Math.round(getCyclicValue(trendValues, index) * normal / 100) },
    { date, groupName: '高金币', value: Number(high.toFixed(1)), rawValue: Math.round(getCyclicValue(trendValues, index) * high / 100) },
  ]
})

const cumulativeGroups = ['当前周期', '上一周期']
export const mockCumulativeSeries: CumulativeSeriesPoint[] = dates.flatMap((date, index) =>
  cumulativeGroups.map((groupName) => ({
    date,
    groupName,
    currentValue: trendValues.slice(0, index + 1).reduce((sum, value) => sum + value, 0),
    compareValue: Array.from({ length: index + 1 }, (_, itemIndex) => 407200 + itemIndex * 120).reduce((sum, value) => sum + value, 0),
  })),
)

export const mockAnomalyDiagnosis: AnomalyDiagnosis = {
  id: 'anomaly-ad-watch-drop-20260515',
  anomalyDate: '2026-05-15',
  metricName: '广告观看次数',
  actualValue: 356920,
  expectedValue: 407300,
  lowerBound: 389000,
  upperBound: 426500,
  diff: -50380,
  diffRate: -12.4,
  severity: 'P1',
  confidence: 95,
  lookbackDays: 60,
  status: 'unhandled',
  summary: '广告观看次数下降主要集中在低金币高活跃用户，其中金币不足弹窗广告位下降贡献最高。建议后续将该批用户保存为分群，并通过运营任务和 A/B 测试验证不同干预策略。',
  contributions: contributionSource,
  recommendedActions: [
    {
      id: 'action-create-segment',
      actionType: 'create_segment',
      title: '保存为用户分群',
      description: '将低金币高活跃广告下降用户保存为每日更新分群。',
      targetRoute: '/user-insight/segments',
      payload: {
        source: 'event_analysis',
        segmentId: 'seg_low_coin_ad_decline',
        segmentName: '低金币高活跃广告下降用户',
        estimatedUsers: 28640,
        targetMetric: '广告观看次数',
      },
    },
    {
      id: 'action-create-campaign',
      actionType: 'create_campaign',
      title: '创建运营任务',
      description: '创建低金币用户激励广告观看提升任务。',
      targetRoute: '/intelligent-operation/campaigns',
      payload: {
        source: 'event_analysis',
        segmentId: 'seg_low_coin_ad_decline',
        campaignName: '低金币用户激励广告观看提升任务',
        targetMetric: '广告观看次数',
        recommendedStrategy: '低金币广告入口强化',
        channels: ['站内弹窗', '任务中心入口'],
        reward: '500 金币',
      },
    },
    {
      id: 'action-create-experiment',
      actionType: 'create_experiment',
      title: '创建 A/B 实验',
      description: '进入实验列表后通过“新建实验”验证原始入口、金币不足弹窗引导、任务中心奖励引导三种策略。',
      targetRoute: '/ab-testing/experiments',
      payload: {
        source: 'event_analysis',
        segmentId: 'seg_low_coin_ad_decline',
        experimentName: '低金币广告激励策略 A/B/C 测试',
        targetMetric: '广告观看次数',
      },
    },
  ],
}

const coinLevels = ['0-500', '501-2000', '2001+']
const adPositions = ['金币不足弹窗', '任务中心', '首页 Banner', '结算页入口']
const gameTypes = ['斗地主', '麻将', '德州扑克', '捕鱼']
const paymentStatuses = ['未付费', '轻付费', '高付费']
const appVersions = ['1.8.3', '1.8.2', '1.8.1', '1.7.9']

export const mockDetailRows: EventAnalysisDetailRow[] = Array.from({ length: 30 }, (_, index) => {
  const isPrimaryIssue = index % 5 === 0
  const adWatchPv = isPrimaryIssue ? 82430 - index * 670 : 28600 + index * 1180
  const adWatchUv = Math.max(3200, Math.round(adWatchPv / (isPrimaryIssue ? 3.77 : 4.25)))
  const wowChange = isPrimaryIssue ? -28.6 + index * 0.3 : -5.8 - (index % 7) * 1.8
  const adRevenue = Math.round(adWatchPv * (0.105 + (index % 4) * 0.006))

  return {
    id: `detail-${String(index + 1).padStart(2, '0')}`,
    date: getCyclicValue(dates, index),
    comparisonGroup: isPrimaryIssue ? '低金币高活跃用户' : getCyclicValue(groupNames, index),
    userGroup: isPrimaryIssue ? '低金币高活跃用户' : index % 3 === 0 ? '全部活跃用户' : '正常金币高活跃用户',
    coinBalanceLevel: isPrimaryIssue ? '0-500' : getCyclicValue(coinLevels, index),
    adPosition: isPrimaryIssue ? '金币不足弹窗' : getCyclicValue(adPositions, index),
    gameType: isPrimaryIssue ? '斗地主' : getCyclicValue(gameTypes, index),
    paymentStatus: isPrimaryIssue ? '未付费' : getCyclicValue(paymentStatuses, index),
    appVersion: isPrimaryIssue ? '1.8.3' : getCyclicValue(appVersions, index),
    adWatchPv,
    adWatchUv,
    adWatchPerUser: Number((adWatchPv / adWatchUv).toFixed(2)),
    adCompleteRate: Number((isPrimaryIssue ? 68.4 + index * 0.08 : 74.6 - (index % 4) * 1.2).toFixed(1)),
    adRevenue,
    wowChange: Number(wowChange.toFixed(1)),
    yoyChange: Number((wowChange - 2.4).toFixed(1)),
    contributionRate: Number((isPrimaryIssue ? 42.1 - index * 0.7 : 6.5 + (index % 8) * 2.6).toFixed(1)),
    affectedUsers: isPrimaryIssue ? 18640 - index * 180 : 3200 + index * 260,
  }
})

const churnRisks: Array<AffectedUser['churnRisk']> = ['高', '中', '低']

export const mockAffectedUsers: AffectedUser[] = Array.from({ length: 50 }, (_, index) => ({
  userId: `u_${String(102938 + index * 37)}`,
  userLevel: `Lv.${12 + (index % 16)}`,
  coinBalance: 80 + (index * 43) % 430,
  activeDays7d: 5 + (index % 3),
  gameRounds7d: 28 + (index * 7) % 55,
  adWatchCount7d: 6 + (index * 2) % 22,
  adWatchDeclineRate3d: -34 - (index % 9) * 3,
  paymentStatus: index % 5 === 0 ? '轻付费' : '未付费',
  churnRisk: getCyclicValue(churnRisks, index),
  lastLoginTime: `2026-05-${String(15 + (index % 2)).padStart(2, '0')} ${String(8 + (index % 14)).padStart(2, '0')}:${String((index * 7) % 60).padStart(2, '0')}`,
  recommendedAction: index % 2 === 0 ? '金币不足弹窗引导' : '任务中心奖励引导',
}))

export const mockChartLegendItems: ChartLegendItem[] = [
  { id: 'legend-actual', name: '实际值', color: '#d03050', enabled: true },
  { id: 'legend-compare', name: '上一周期', color: '#2080f0', enabled: true },
  { id: 'legend-expected', name: '预测参考', color: '#18a058', enabled: true },
  { id: 'legend-low-coin', name: '低金币高活跃用户', color: '#d03050', enabled: true },
]

export const mockAnalysisResult: EventAnalysisResult = {
  metricCards: mockMetricCards,
  timeSeries: mockTimeSeries,
  metricTrend: mockMetricTrend,
  groupSummaries: mockGroupSummaries,
  dualAxisSeries: mockDualAxisSeries,
  percentageSeries: mockPercentageSeries,
  cumulativeSeries: mockCumulativeSeries,
  tableRows: mockDetailRows,
  anomalyPoints: mockMetricTrend
    .filter((point) => point.isAnomaly)
    .map((point) => ({
      date: point.date,
      metricId: 'metric_ad_watch_pv',
      metricName: '广告观看次数',
      actualValue: point.actualValue,
      expectedValue: point.expectedValue ?? 0,
      anomalyLevel: point.anomalyLevel ?? 'P2',
    })),
  anomalyDiagnosis: mockAnomalyDiagnosis,
  chartLegendItems: mockChartLegendItems,
  chartTopNOptions: [5, 10, 20, 50],
}

export const mockDownloadTasks: DownloadTask[] = [
  {
    id: 'download-page-result-001',
    name: '事件分析页面结果',
    range: 'page_result',
    contents: ['chart_data', 'detail_data'],
    format: 'excel',
    status: 'completed',
    createdAt: '2026-05-15T10:30:00+02:00',
  },
  {
    id: 'download-more-data-002',
    name: '低金币用户明细全量',
    range: 'more_data',
    contents: ['detail_data', 'user_list'],
    format: 'csv',
    status: 'running',
    createdAt: '2026-05-15T11:10:00+02:00',
  },
  {
    id: 'download-chart-data-003',
    name: '广告观看趋势图表数据',
    range: 'page_result',
    contents: ['chart_data'],
    format: 'csv',
    status: 'created',
    createdAt: '2026-05-15T11:30:00+02:00',
  },
]

export const mockDashboardLocations: DashboardLocation[] = [
  {
    id: 'dash-personal-overview',
    name: '我的概览',
    path: '个人空间 / 我的概览',
    spaceType: 'personal',
    canWrite: true,
    widgets: ['广告观看次数趋势图', '广告完成率指标卡'],
  },
  {
    id: 'dash-personal-ad-monitor',
    name: '广告监控',
    path: '个人空间 / 广告监控',
    spaceType: 'personal',
    canWrite: true,
    widgets: ['低金币用户分布'],
  },
  {
    id: 'dash-personal-retention',
    name: '留存监控',
    path: '个人空间 / 留存监控',
    spaceType: 'personal',
    canWrite: true,
    widgets: [],
  },
  {
    id: 'dash-team-operation-daily',
    name: '运营团队日报',
    path: '团队空间 / 运营团队日报',
    spaceType: 'team',
    canWrite: true,
    widgets: ['广告观看次数趋势图'],
  },
  {
    id: 'dash-team-data-weekly',
    name: '数据分析周报',
    path: '团队空间 / 数据分析周报',
    spaceType: 'team',
    canWrite: true,
    widgets: [],
  },
  {
    id: 'dash-public-executive',
    name: '公司经营大盘',
    path: '公共空间 / 公司经营大盘',
    spaceType: 'public',
    canWrite: false,
    widgets: ['商业化核心指标'],
  },
]
