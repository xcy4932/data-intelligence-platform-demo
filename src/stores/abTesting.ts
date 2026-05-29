import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { abTestingService } from '@/services/abTestingService'
import type {
  AbExperimentAction,
  AbExperimentStatus,
  AbExperimentType,
  AbExperimentVisibility,
  AudienceCondition,
  AudienceConditionSource,
  AudienceOperator,
  AlarmTask,
  BackendIntegrationStatus,
  BoardDiffResult,
  CohortReport,
  DataDedupTask,
  DataDedupTaskDraft,
  Experiment,
  ExperimentBoard,
  ExperimentBoardDraft,
  ExperimentBoardWidget,
  ExperimentDraft,
  ExperimentDraftSpecialConfig,
  ExperimentPermissionGrant,
  ExperimentPermissionUpdatePayload,
  ExperimentReportOverview,
  ExperimentTemplate,
  FeatureDecisionResult,
  FeatureFlag,
  FeatureFlagDraft,
  FeatureLifecycleAction,
  FeaturePublishRequest,
  FeatureSolidifyRequest,
  FeatureVersion,
  FeatureVersionDraft,
  FilterTemplate,
  FunnelReport,
  HeatmapReport,
  HitDiagnosisResult,
  HitQueryRequest,
  HitQueryResult,
  HitQueryTemplate,
  MabReport,
  Metric,
  MetricGroup,
  MetricStatisticResult,
  MetricTemplate,
  MutexDomain,
  MutexDomainGroup,
  MustSeeMetricTrend,
  OperationLog,
  PerformanceBudgetItem,
  PermissionAuditItem,
  PublishPlan,
  ReceiverGroup,
  ReportExportTask,
  SensitiveInsightTask,
  SmoothEffectTaskOperation,
  TrafficLayer,
  TrendPoint,
  UniformDiversionTaskDetail,
  WhitelistTest,
  WhitelistTestDraft,
  E2EAcceptanceCase,
} from '@/types/abTesting'
import type { EntityId, ISODateTimeString } from '@/types/common'
import {
  canUseAbAction,
  getAbPermissionLevel,
  validateExperimentParamValue,
  validateTrafficRatios,
} from '@/utils/abTestingRules'

type WorkspaceSummary = Awaited<ReturnType<typeof abTestingService.getWorkspaceSummary>>
type PlanningBundle = Awaited<ReturnType<typeof abTestingService.getExperimentPlanningBundle>>
type DraftValidation = Awaited<ReturnType<typeof abTestingService.validateExperimentDraft>>
type TrafficRecommendation = Awaited<ReturnType<typeof abTestingService.calculateTraffic>>

const draftStorageKey = 'ab-testing:create-draft:v1'
const selectionStorageKey = 'ab-testing:workspace-selection:v1'

const appMembers = [
  { id: 'user_growth_lin', name: '林哲', department: '增长运营团队' },
  { id: 'user_data_zhou', name: '周婧', department: '商业化数据团队' },
  { id: 'user_product_xu', name: '许澄', department: '产品体验团队' },
  { id: 'user_qa_chen', name: '陈悦', department: '质量保障团队' },
]

const segmentOptions = [
  { id: 'seg_core_city', name: '核心城市用户', estimatedUsers: 320000 },
  { id: 'seg_low_coin_high_active', name: '低金币高活跃用户', estimatedUsers: 180000 },
  { id: 'seg_new_user_7d', name: '近 7 日新用户', estimatedUsers: 96000 },
]

const experimentTagDictionary = [
  '推荐',
  '低金币',
  '服务端',
  '可视化',
  '首页',
  '热力图',
  'MAB',
  '活动',
  'Banner',
  '新策略',
  '反转实验',
  '广告',
]

const audienceFieldOptions: Record<AudienceConditionSource, Array<{ label: string; value: string; valueType: 'string' | 'number' | 'list' }>> = {
  user: [
    { label: '城市', value: 'city', valueType: 'list' },
    { label: '用户等级', value: 'user_level', valueType: 'string' },
    { label: '金币余额', value: 'coin_balance', valueType: 'number' },
  ],
  device: [
    { label: '系统', value: 'os', valueType: 'list' },
    { label: 'App 版本', value: 'app_version', valueType: 'string' },
    { label: '设备品牌', value: 'brand', valueType: 'string' },
  ],
  event: [
    { label: '最近事件', value: 'last_event', valueType: 'string' },
    { label: '近 7 日播放次数', value: 'play_count_7d', valueType: 'number' },
  ],
  server: [
    { label: '实验环境', value: 'env', valueType: 'string' },
    { label: '服务端分层', value: 'server_tier', valueType: 'string' },
  ],
}

const audienceOperators: AudienceOperator[] = [
  'eq',
  'neq',
  'in',
  'not_in',
  'contains',
  'not_contains',
  'gt',
  'gte',
  'lt',
  'lte',
  'between',
  'is_null',
  'is_not_null',
]

const paramKeyPattern = /^[A-Za-z_][A-Za-z0-9_]*$/

function createDraftTempId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function cloneDraftValue<T>(value: T): T {
  if (value === undefined) return value
  return JSON.parse(JSON.stringify(value)) as T
}

function parseDraftValueByType(type: ExperimentDraft['paramSchemas'][number]['type'], value: unknown) {
  if (value === '' || value === undefined || value === null) return value
  if (type === 'NUMBER') return Number(value)
  if (type === 'BOOLEAN') return value === true || value === 'true'
  if (type === 'JSON') {
    if (typeof value !== 'string') return value
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }
  return String(value)
}

function hasHardcodedGroupParam(schemaKey: string, values: unknown[]) {
  if (!/(group|version|exp|test_id)/i.test(schemaKey)) return false
  const numericValues = values
    .map((value) => (typeof value === 'number' ? value : Number(value)))
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right)
  if (numericValues.length < 2) return false
  return numericValues.every((value, index) => index === 0 || value - (numericValues[index - 1] ?? value) === 1)
}

function isGoalDetailed(goal: string) {
  const normalized = goal.trim()
  if (normalized.length < 20) return false
  const hasStrategy = /(验证|策略|方案|功能|文案|页面|算法|推荐|按钮|实验)/.test(normalized)
  const hasAudience = /(用户|人群|场景|访问|设备|地域|城市|客群)/.test(normalized)
  const hasMetric = /(指标|点击|转化|留存|播放|时长|收入|CTR|率|MDE)/i.test(normalized)
  const hasLift = /(提升|降低|增长|减少|优化|改善|预期|%|百分点|\d+)/.test(normalized)
  return hasStrategy && hasAudience && hasMetric && hasLift
}

function getTerminalTypeForExperimentType(type: AbExperimentType): TrafficLayer['experimentType'] {
  return ['CLIENT_CODE', 'VISUAL', 'SPLIT_URL', 'PUSH', 'MVT', 'PERSONALIZATION_WEB'].includes(type)
    ? 'CLIENT'
    : 'SERVER'
}

function todayIsoDate(offsetDays = 0) {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  return date.toISOString().slice(0, 10)
}

function isDateInRange(value: string | undefined, start: string, end: string) {
  if (!value) return !start && !end
  const day = value.slice(0, 10)
  return (!start || day >= start) && (!end || day <= end)
}

function createDefaultSpecialConfig(): ExperimentDraftSpecialConfig {
  return {
    splitUrl: {
      matchMode: 'SIMPLE',
      preserveQueryString: true,
      fallbackUrl: 'https://example.com/home',
      urls: {
        draft_control: 'https://example.com/control',
        draft_treatment_1: 'https://example.com/treatment-a',
      },
      rules: {
        draft_control: {
          matchType: 'path',
          pattern: '/control',
          caseSensitive: false,
        },
        draft_treatment_1: {
          matchType: 'path',
          pattern: '/treatment-a',
          caseSensitive: false,
        },
      },
    },
    push: {
      channel: 'app_push',
      touchRange: 'seg_core_city',
      sendMode: 'SCHEDULED',
      sendTime: '2026-06-01 10:00',
      triggerCondition: '用户进入活动页后触发',
      frequencyCapPerUser: 1,
      quietHours: {
        enabled: true,
        start: '22:00',
        end: '08:00',
      },
      approvalStatus: 'DRAFT',
      rehearsalChecked: false,
      titles: {
        draft_control: '今日福利已到账',
        draft_treatment_1: '限时福利马上领取',
      },
      contents: {
        draft_control: '打开 App 查看你的专属福利。',
        draft_treatment_1: '完成任务即可领取额外奖励。',
      },
      actionUrls: {
        draft_control: 'app://home/rewards',
        draft_treatment_1: 'app://campaign/rewards-v2',
      },
    },
    mvt: {
      trafficAllocationMode: 'COMBINATION_EQUAL',
      autoGenerateCombinations: true,
      primaryElementId: 'mvt_title',
      elements: [
        { id: 'mvt_title', name: '标题文案', variants: ['今日福利', '限时任务'] },
        { id: 'mvt_button', name: '按钮文案', variants: ['立即领取', '去完成'] },
      ],
    },
    personalization: {
      audiences: [
        {
          id: 'aud_core_city',
          name: '核心城市用户',
          rule: 'city in 北京/上海/广州',
          variantTempId: 'draft_treatment_1',
          priority: 1,
          holdoutRatio: 5,
        },
      ],
      conflictStrategy: 'PRIORITY',
      defaultVariantTempId: 'draft_control',
      fallbackContent: '未命中任何个性化规则时使用对照组内容。',
    },
    parentChild: {
      parentExperimentId: 'exp_feed_strategy',
      parentVariantId: 'var_feed_new',
      childTrafficRatio: 20,
      inheritAudience: true,
      trafficInheritanceMode: 'LOCK_PARENT_BUCKET',
      stopPolicy: 'PAUSE',
    },
    reverse: {
      sourceExperimentId: 'exp_feed_strategy',
      sourceControlVariantId: 'var_feed_control',
      suggestedTrafficRatio: 5,
      holdoutSource: 'ORIGINAL_CONTROL',
      observationDays: 7,
      rollbackPolicy: 'MANUAL_CONFIRM',
    },
    ad: {
      accountId: 'ad_acc_growth',
      projectId: 'ad_project_summer',
      authorizationChecked: false,
      strategy: '验证素材与出价组合对活动转化率的影响。',
      accounts: [
        { id: 'ad_acc_growth', name: '增长活动主账户', platform: 'OCEAN_ENGINE', status: 'AUTHORIZED' },
        { id: 'ad_acc_brand', name: '品牌投放账户', platform: 'TENCENT_ADS', status: 'PENDING' },
      ],
      assets: [
        { id: 'asset_banner_copy', name: '活动主文案', type: 'COPY', reviewStatus: 'DRAFT' },
        { id: 'asset_banner_img', name: '福利 Banner 图', type: 'IMAGE', reviewStatus: 'REVIEWING' },
      ],
      deliveryConfig: {
        objective: 'CONVERSION',
        dailyBudget: 5000,
        bidStrategy: 'LOWEST_COST',
        placements: ['信息流', '激励视频'],
        startAt: '2026-06-01 09:00',
        endAt: '2026-06-07 23:00',
      },
      reviewSchedule: {
        auditStatus: 'NOT_SUBMITTED',
        reviewer: '广告审核团队',
        scheduledAt: '2026-05-31 18:00',
        note: '素材和落地页需在排期前完成审核。',
      },
    },
    mab: {
      optimizationMetricId: 'metric_banner_ctr',
      explorationTrafficRatio: 20,
      algorithm: 'THOMPSON_SAMPLING',
      rewardWindowHours: 6,
      minSamplePerArm: 1000,
      guardrailMetricIds: ['metric_retention_d1'],
      autoStopEnabled: true,
    },
    visual: {
      pageUrl: 'https://example.com/home',
      editorStatus: 'NOT_CONFIGURED',
      extensionDetected: false,
      heatmapEnabled: true,
      selectedElementId: 'visual_cta',
      elements: [
        {
          id: 'visual_cta',
          name: '首页主按钮',
          selector: '#home-primary-cta',
          variantTempId: 'draft_treatment_1',
          property: 'text',
          originalValue: '查看福利',
          newValue: '立即领取',
        },
      ],
    },
  }
}

function normalizeAudienceValue(operator: AudienceOperator, rawValue: string) {
  if (operator === 'is_null' || operator === 'is_not_null') return undefined
  const trimmed = rawValue.trim()
  if (operator === 'between') {
    return trimmed
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item))
      .slice(0, 2)
  }
  if (['in', 'not_in'].includes(operator)) {
    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  if (['gt', 'gte', 'lt', 'lte'].includes(operator)) {
    const numericValue = Number(trimmed)
    return Number.isFinite(numericValue) ? numericValue : trimmed
  }
  return trimmed
}

function stringifyAudienceValue(value: unknown) {
  if (value === undefined || value === null) return ''
  return Array.isArray(value) ? value.join(',') : String(value)
}

function getStorage() {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function parseStoredJson<T>(value: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

function createDefaultExperimentDraft(): ExperimentDraft {
  return {
    appId: 'app_news',
    type: 'SERVER_CODE',
    name: '新建推荐策略实验',
    description: '通过服务端策略参数验证推荐链路优化效果。',
    ownerId: 'user_growth_lin',
    collaboratorIds: ['user_data_zhou'],
    visibility: 'PUBLIC',
    businessLineId: 'biz_growth',
    goal: '验证新推荐策略对低金币高活跃用户的人均播放时长是否有显著提升。',
    riskNote: '关注次日留存和广告观看率，避免推荐策略带来负向体验。',
    tags: ['推荐', '新策略'],
    durationDays: 14,
    trafficRatio: 20,
    metricIds: ['metric_ad_watch_rate', 'metric_retention_d1'],
    featureIds: [],
    testUserAudienceRequirement: 'IGNORE_AUDIENCE',
    variants: [
      {
        tempId: 'draft_control',
        name: '对照组',
        description: '保留当前线上策略。',
        isControl: true,
        trafficRatio: 50,
        params: { recommend_strategy: 'old', show_interact_guide: false },
        testUserIds: ['ssid_10001'],
      },
      {
        tempId: 'draft_treatment_1',
        name: '实验组 1',
        description: '启用新推荐策略和互动引导。',
        isControl: false,
        trafficRatio: 50,
        params: { recommend_strategy: 'new_v1', show_interact_guide: true },
        testUserIds: ['ssid_10002'],
      },
    ],
    paramSchemas: [
      {
        tempId: 'draft_param_strategy',
        key: 'recommend_strategy',
        name: '推荐策略',
        type: 'STRING',
        required: true,
        defaultValue: 'old',
        description: '服务端推荐策略枚举。',
      },
      {
        tempId: 'draft_param_guide',
        key: 'show_interact_guide',
        name: '互动引导',
        type: 'BOOLEAN',
        required: true,
        defaultValue: false,
        description: '是否展示互动引导。',
      },
    ],
    diversionConfig: {
      decisionIdType: 'uid',
      decisionIdField: 'user_id',
      appKey: 'app_news_key',
      exposureMode: 'AUTO',
      filter: {
        relation: 'AND',
        groups: [
          {
            id: 'draft_audience_group',
            relation: 'AND',
            conditions: [
              {
                id: 'draft_city',
                source: 'user',
                field: 'city',
                operator: 'in',
                value: ['北京', '上海', '广州'],
                requiredInRequest: true,
              },
              {
                id: 'draft_os',
                source: 'device',
                field: 'os',
                operator: 'in',
                value: ['iOS', 'Android'],
                requiredInRequest: true,
              },
            ],
          },
        ],
      },
    },
    trafficConfig: {
      useMutex: true,
      trafficLayerId: 'layer_server_recommend',
      mutexDomainId: 'mutex_recommend_b',
      experimentTrafficRatio: 20,
      variantTrafficRatios: {
        draft_control: 50,
        draft_treatment_1: 50,
      },
      effectiveMode: 'SMOOTH',
      smoothDurationMinutes: 120,
      experienceConsistencyEnabled: true,
      planningEstimatedUsers: 1200000,
      planningMdeValue: 0.03,
      planningPower: 0.8,
      planningAlpha: 0.05,
      planningTrafficFilterRatio: 0.72,
      planningRecommendedTrafficRatio: 0.2,
      multiComparisonCorrection: false,
      uniformDiversionEnabled: true,
      uniformDiversionMode: 'METRIC',
      uniformMetricIds: ['metric_ad_watch_rate', 'metric_retention_d1'],
      uniformSegmentIds: ['seg_core_city'],
      uniformDateRange: { startDate: todayIsoDate(-14), endDate: todayIsoDate(-1) },
      uniformMaxRunTimes: 100,
      uniformPValueThreshold: 0.05,
      uniformStatus: 'NOT_STARTED',
      uniformResultApplied: false,
      uniformConfigLocked: false,
    },
    specialConfig: createDefaultSpecialConfig(),
  }
}

export const useAbTestingStore = defineStore('abTesting', () => {
  const loading = ref(false)
  const initialized = ref(false)
  const loadError = ref<string | null>(null)
  const permissionContext = ref({
    userId: 'user_growth_lin',
    roles: ['EXPERIMENT_OWNER'] as Array<'SUPER_ADMIN' | 'APP_ADMIN' | 'EXPERIMENT_OWNER' | 'COLLABORATOR' | 'VIEWER'>,
    permissions: {
      experiment_create: true,
      experiment_traffic_manage: false,
      view_report: true,
      export_report: true,
      create_metric: true,
      create_feature: true,
      publish_feature: true,
    },
  })

  const summary = ref<WorkspaceSummary | null>(null)
  const experiments = ref<Experiment[]>([])
  const trafficLayers = ref<TrafficLayer[]>([])
  const mutexDomainGroups = ref<MutexDomainGroup[]>([])
  const metricGroups = ref<MetricGroup[]>([])
  const metrics = ref<Metric[]>([])
  const metricTemplates = ref<MetricTemplate[]>([])
  const experimentTemplateOptions = ref<ExperimentTemplate[]>([])
  const activeExperimentTemplateId = ref<EntityId | null>(null)
  const activeTemplateLockedFields = ref<ExperimentTemplate['lockedFields']>([])
  const alarmTasks = ref<AlarmTask[]>([])
  const receiverGroups = ref<ReceiverGroup[]>([])
  const mustSeeTrends = ref<MustSeeMetricTrend[]>([])
  const featureFlags = ref<FeatureFlag[]>([])
  const featureVersions = ref<FeatureVersion[]>([])
  const publishPlans = ref<PublishPlan[]>([])
  const whitelistTests = ref<WhitelistTest[]>([])
  const hitQueryTemplates = ref<HitQueryTemplate[]>([])
  const hitQueryResults = ref<HitQueryResult[]>([])
  const hitQueryLoading = ref(false)
  const hitDiagnosisResult = ref<HitDiagnosisResult | null>(null)
  const dataDedupTasks = ref<DataDedupTask[]>([])
  const experimentBoards = ref<ExperimentBoard[]>([])
  const selectedBoardId = ref<EntityId>('')
  const boardDiffResults = ref<BoardDiffResult[]>([])
  const operationLogs = ref<OperationLog[]>([])
  const experimentPermissionGrants = ref<ExperimentPermissionGrant[]>([])
  const apiIntegrationStatus = ref<BackendIntegrationStatus | null>(null)

  const selectedExperimentId = ref<EntityId>('')
  const selectedReportExperimentId = ref<EntityId>('exp_feed_strategy')
  const selectedFeatureId = ref<EntityId>('')
  const selectedMetricGroupId = ref<EntityId>('mg_ad_event')
  const metricGroupMergeIds = ref<EntityId[]>(['mg_ad_event', 'mg_retention_guardrail'])
  const metricGroupDraft = ref({
    appId: 'app_news',
    name: '新建实验指标组',
    description: '用于实验创建和报告分析的指标集合。',
    type: 'event' as MetricGroup['type'],
    permissionType: 'public' as MetricGroup['permissionType'],
    metricIds: ['metric_ad_watch_rate'],
  })
  const planningBundle = ref<PlanningBundle | null>(null)
  const reportOverview = ref<ExperimentReportOverview | undefined>()
  const metricResults = ref<MetricStatisticResult[]>([])
  const trendPoints = ref<TrendPoint[]>([])
  const filterTemplates = ref<FilterTemplate[]>([])
  const funnelReport = ref<FunnelReport | undefined>()
  const cohortReport = ref<CohortReport | undefined>()
  const heatmapReport = ref<HeatmapReport | undefined>()
  const mabReport = ref<MabReport | undefined>()
  const sensitiveTasks = ref<SensitiveInsightTask[]>([])
  const reportExportTasks = ref<ReportExportTask[]>([])
  const reportExporting = ref(false)
  const safeEditDraft = ref({
    name: '',
    goal: '',
    riskNote: '',
    tagsText: '',
  })
  const scaleTrafficDraft = ref({
    targetTrafficRatio: 30,
    smoothDurationMinutes: 120,
  })

  const experimentKeyword = ref('')
  const selectedStatuses = ref<AbExperimentStatus[]>([])
  const selectedExperimentType = ref<AbExperimentType | null>(null)
  const selectedExperimentTags = ref<string[]>([])
  const selectedExperimentOwnerId = ref<EntityId | null>(null)
  const selectedExperimentVisibility = ref<'ALL' | AbExperimentVisibility>('ALL')
  const experimentCreatedRange = ref({ start: '', end: '' })
  const experimentRunningRange = ref({ start: '', end: '' })
  const selectedExperimentIds = ref<EntityId[]>([])
  const experimentPage = ref(1)
  const experimentPageSize = ref(10)
  const batchTagText = ref('')
  const currentCreateStep = ref(1)
  const draftExperiment = ref<ExperimentDraft>(createDefaultExperimentDraft())
  const draftDirty = ref(false)
  const draftChecks = ref<DraftValidation['items']>([])
  const draftSubmitting = ref(false)
  const draftSubmitMessage = ref<string | null>(null)
  const lastCreatedExperimentId = ref<EntityId | null>(null)
  const uniformTaskDetail = ref<UniformDiversionTaskDetail>({
    status: 'NOT_STARTED',
    progress: 0,
    runTimes: 0,
    maxRunTimes: 100,
    pValueThreshold: 0.05,
    metricResults: [],
    segmentResults: [],
    logs: [],
    locked: false,
  })
  const uniformTaskRunning = ref(false)
  const smoothTaskOperating = ref(false)
  const trafficCalculator = ref({
    estimatedTotalUsers: 1200000,
    versionCount: 2,
    metricVariance: 0.1056,
    mdeValue: 0.03,
    trafficFilterRatio: 0.72,
  })
  const trafficRecommendation = ref<TrafficRecommendation | null>(null)
  const audienceEstimate = ref<{
    status: 'idle' | 'running' | 'success' | 'canceled'
    estimatedUsers: number
    filterRatio: number
    message: string
  }>({
    status: 'idle',
    estimatedUsers: 0,
    filterRatio: 0,
    message: '尚未预估',
  })
  const trafficLayerDraft = ref({
    id: '',
    name: '新建服务端实验层',
    description: '用于服务端策略实验的公共流量层。',
    experimentType: 'SERVER' as TrafficLayer['experimentType'],
    totalTrafficRatio: 100,
  })
  const mutexGroupDraft = ref({
    id: '',
    name: '新建互斥域组',
    description: '承载强相关实验互斥。',
    experimentType: 'SERVER' as MutexDomainGroup['experimentType'],
  })
  const mutexDomainDraft = ref({
    groupId: 'mutex_group_recommend',
    id: '',
    name: '新建互斥域',
    trafficRatio: 20,
  })
  const decisionTester = ref({
    userId: 'user_10086',
    city: '北京',
    os: 'iOS',
    inWhitelist: true,
    inExperiment: false,
  })
  const hitQueryDraft = ref<HitQueryRequest & { templateId?: EntityId }>({
    subjectId: 'ssid_qa_001',
    subjectType: 'ssid',
    experimentId: '',
    hitStatus: 'all',
    sortBy: 'queriedAt',
    sortOrder: 'desc',
  })
  const hitDiagnosisDraft = ref({
    subjectId: 'ssid_qa_001',
    experimentId: 'exp_feed_strategy',
  })
  const dataDedupDraft = ref<DataDedupTaskDraft>({
    name: '新建曝光查重任务',
    experimentId: 'exp_feed_strategy',
    scope: 'exposure',
    schedule: 'daily',
    windowMinutes: 30,
  })
  const boardDraft = ref<ExperimentBoardDraft>({
    name: '新建实验看板',
    description: '用于实验复盘和日常监控。',
    visibility: 'PUBLIC',
    authorizedUserIds: ['user_data_zhou'],
    timeConfig: {
      mode: 'relative',
      range: '7d',
      granularity: 'day',
    },
  })
  const boardWidgetDraft = ref<Omit<ExperimentBoardWidget, 'id' | 'order'>>({
    type: 'metric',
    title: '新增指标组件',
    dataSource: 'must_see',
    metricId: 'metric_ad_watch_rate',
    experimentId: 'exp_feed_strategy',
    text: '输入看板说明文本。',
  })
  const featureDecision = ref<FeatureDecisionResult | null>(null)
  const featureDraft = ref<FeatureFlagDraft>({
    appId: 'app_news',
    key: 'new_user_gift_switch',
    name: '新用户礼包开关',
    description: '控制新用户是否展示首日礼包入口。',
    terminalType: 'client',
    featureType: 'public',
    owners: ['user_growth_lin'],
    tags: ['新用户', '增长'],
    variantType: 'boolean',
    variants: [
      { variantId: 'gift_off', name: '关闭', value: false, description: '保持线上默认体验' },
      { variantId: 'gift_on', name: '开启', value: true, description: '展示新用户礼包入口' },
    ],
    defaultVariantId: 'gift_off',
  })
  const featureVersionDraft = ref<FeatureVersionDraft>({
    variantType: 'string',
    variants: [
      { variantId: 'variant_a', name: '默认策略', value: 'default', description: '线上默认策略' },
      { variantId: 'variant_b', name: '灰度策略', value: 'gray_v1', description: '灰度候选策略' },
    ],
    audienceRules: [
      {
        ruleId: 'rule_city_core',
        name: '核心城市用户',
        order: 1,
        conditions: [{ fieldSource: 'user_property', fieldName: 'city', operator: 'in', value: ['北京', '上海'] }],
        deliveryType: 'single_variant',
        variantId: 'variant_b',
      },
    ],
    defaultRule: {
      ruleId: 'else',
      name: '默认规则',
      order: 999,
      conditions: [],
      deliveryType: 'single_variant',
      variantId: 'variant_a',
    },
    publishTraffic: 0,
  })
  const featurePublishDraft = ref<FeaturePublishRequest>({
    versionId: '',
    publishType: 'manual',
    publishTraffic: 30,
    scheduledAt: '',
    description: '按当前受众规则进行灰度发布。',
  })
  const whitelistDraft = ref<WhitelistTestDraft>({
    name: '新版本 QA 白名单',
    versionId: '',
    expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    ruleUserIds: { else: ['ssid_qa_001', 'ssid_qa_002'] },
  })
  const whitelistUserIdsText = ref('ssid_qa_001,ssid_qa_002')
  const featureSolidifyDraft = ref<FeatureSolidifyRequest>({
    experimentId: 'exp_feed_strategy',
    featureKey: 'recommend_strategy_solidified',
    featureName: '推荐策略实验固化',
    winnerVariantId: 'var_feed_new',
    rolloutTraffic: 20,
  })

  const asyncPolling = ref(false)
  const asyncLastPolledAt = ref<ISODateTimeString | null>(null)
  const asyncPollingError = ref<string | null>(null)
  let taskPoller: ReturnType<typeof setInterval> | null = null

  const selectedExperiment = computed(() =>
    experiments.value.find((experiment) => experiment.id === selectedExperimentId.value),
  )
  const selectedReportExperiment = computed(() =>
    experiments.value.find((experiment) => experiment.id === selectedReportExperimentId.value),
  )
  const selectedFeature = computed(() =>
    featureFlags.value.find((feature) => feature.featureId === selectedFeatureId.value),
  )
  const selectedExperimentPermission = computed(() =>
    selectedExperiment.value
      ? getAbPermissionLevel(permissionContext.value, {
          ownerId: selectedExperiment.value.ownerId,
          collaboratorIds: selectedExperiment.value.collaboratorIds,
          visibility: selectedExperiment.value.visibility,
        })
      : 'none',
  )
  const selectedFeaturePermission = computed(() =>
    selectedFeature.value
      ? getAbPermissionLevel(permissionContext.value, {
          ownerIds: selectedFeature.value.owners,
          visibility: selectedFeature.value.featureType,
        })
      : 'none',
  )
  const selectedFeatureVersions = computed(() =>
    featureVersions.value.filter((version) => version.featureId === selectedFeatureId.value),
  )
  const selectedCurrentFeatureVersion = computed(() =>
    featureVersions.value.find((version) => version.versionId === selectedFeature.value?.currentVersionId),
  )
  const selectedLatestFeatureVersion = computed(() =>
    [...selectedFeatureVersions.value].sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0],
  )
  const featureVersionOptions = computed(() =>
    selectedFeatureVersions.value.map((version) => ({
      label: `${version.versionNo} · ${version.versionStatus} · ${version.publishTraffic}%`,
      value: version.versionId,
    })),
  )
  const solidifyVariantOptions = computed(() =>
    planningBundle.value?.experiment?.id === featureSolidifyDraft.value.experimentId
      ? planningBundle.value.variants.map((variant) => ({
          label: `${variant.name}${variant.isControl ? ' · 对照组' : ''}`,
          value: variant.id,
        }))
      : [],
  )
  const selectedPublishPlans = computed(() =>
    publishPlans.value.filter((plan) => plan.featureId === selectedFeatureId.value),
  )
  const selectedWhitelistTests = computed(() =>
    whitelistTests.value.filter((test) => test.featureId === selectedFeatureId.value),
  )
  const selectedMetricGroup = computed(() =>
    metricGroups.value.find((group) => group.id === selectedMetricGroupId.value),
  )
  const selectedMetricGroupMetrics = computed(() =>
    metrics.value.filter((metric) => selectedMetricGroup.value?.metricIds.includes(metric.id)),
  )
  const selectedBoard = computed(() => experimentBoards.value.find((board) => board.id === selectedBoardId.value))
  const selectedBoardWidgets = computed(() =>
    [...(selectedBoard.value?.widgets ?? [])].sort((left, right) => left.order - right.order),
  )
  const draftMetricSnapshots = computed(() =>
    draftExperiment.value.metricIds
      .map((metricId) => metrics.value.find((metric) => metric.id === metricId))
      .filter((metric): metric is Metric => Boolean(metric)),
  )
  const draftTerminalType = computed<TrafficLayer['experimentType']>(() =>
    getTerminalTypeForExperimentType(draftExperiment.value.type),
  )
  const compatibleTrafficLayers = computed(() =>
    trafficLayers.value.filter((layer) => layer.experimentType === draftTerminalType.value),
  )
  const compatibleMutexDomainGroups = computed(() =>
    mutexDomainGroups.value.filter((group) => group.experimentType === draftTerminalType.value),
  )
  const draftSelectedMutexDomain = computed(() =>
    mutexDomainGroups.value
      .flatMap((group) => group.domains)
      .find((domain) => domain.id === draftExperiment.value.trafficConfig.mutexDomainId),
  )
  const draftUniformStatusLabel = computed(() => {
    const labels = {
      NOT_STARTED: '待调平',
      RUNNING: '调平中',
      SUCCESS: '已满足条件',
      FAILED: '未满足条件',
      CANCELED: '已取消',
    }
    return labels[draftExperiment.value.trafficConfig.uniformStatus]
  })
  const uniformConfigLocked = computed(
    () =>
      uniformTaskRunning.value ||
      draftExperiment.value.trafficConfig.uniformStatus === 'RUNNING' ||
      draftExperiment.value.trafficConfig.uniformConfigLocked === true,
  )
  const uniformMetricLimitReached = computed(() => draftExperiment.value.trafficConfig.uniformMetricIds.length >= 3)
  const selectedSmoothTaskLogs = computed(() =>
    planningBundle.value?.smoothTask
      ? operationLogs.value.filter((log) => log.objectId === planningBundle.value?.smoothTask?.experimentId && log.action.startsWith('smooth_'))
      : [],
  )
  const mvtCombinationCount = computed(() =>
    draftExperiment.value.specialConfig.mvt.elements.reduce((total, element) => total * Math.max(element.variants.length, 1), 1),
  )
  const experimentTagOptions = computed(() =>
    [...new Set([...experimentTagDictionary, ...experiments.value.flatMap((experiment) => experiment.tags)])].map((tag) => ({
      label: tag,
      value: tag,
    })),
  )
  const experimentOwnerOptions = computed(() =>
    appMembers.map((member) => ({
      label: `${member.name} · ${member.department}`,
      value: member.id,
    })),
  )
  const reportAnomalies = computed(() => {
    const anomalies: Array<{ level: 'info' | 'warning' | 'error'; message: string }> = []
    if (!reportOverview.value) {
      anomalies.push({ level: 'warning', message: '报告概览数据暂未生成' })
      return anomalies
    }
    if (reportOverview.value.coreMetricResults.some((metric) =>
      metric.versionResults.some((result) => result.significance === 'negative' || result.significance === 'error'),
    )) {
      anomalies.push({ level: 'error', message: '存在负向或异常显著指标' })
    }
    if (reportOverview.value.coreMetricResults.some((metric) =>
      metric.versionResults.some((result) => result.metricValue === null || result.significance === 'insufficient'),
    )) {
      anomalies.push({ level: 'warning', message: '存在样本不足或空指标结果' })
    }
    if (!anomalies.length) anomalies.push({ level: 'info', message: '核心指标暂无异常' })
    return anomalies
  })
  const filteredExperiments = computed(() => {
    const keyword = experimentKeyword.value.trim().toLowerCase()
    return experiments.value.filter((experiment) => {
      const keywordMatched =
        !keyword ||
        experiment.name.toLowerCase().includes(keyword) ||
        experiment.id.toLowerCase().includes(keyword) ||
        experiment.owner.name.toLowerCase().includes(keyword)
      const statusMatched = !selectedStatuses.value.length || selectedStatuses.value.includes(experiment.status)
      const typeMatched = !selectedExperimentType.value || experiment.type === selectedExperimentType.value
      const tagMatched =
        !selectedExperimentTags.value.length ||
        experiment.tags.some((tag) => selectedExperimentTags.value.includes(tag))
      const ownerMatched = !selectedExperimentOwnerId.value || experiment.ownerId === selectedExperimentOwnerId.value
      const visibilityMatched =
        selectedExperimentVisibility.value === 'ALL' || experiment.visibility === selectedExperimentVisibility.value
      const createdMatched = isDateInRange(
        experiment.createdAt,
        experimentCreatedRange.value.start,
        experimentCreatedRange.value.end,
      )
      const runningMatched = isDateInRange(
        experiment.startedAt,
        experimentRunningRange.value.start,
        experimentRunningRange.value.end,
      )
      return keywordMatched && statusMatched && typeMatched && tagMatched && ownerMatched && visibilityMatched && createdMatched && runningMatched
    })
  })
  const filteredExperimentTotal = computed(() => filteredExperiments.value.length)
  const pagedExperiments = computed(() => {
    const maxPage = Math.max(1, Math.ceil(filteredExperiments.value.length / experimentPageSize.value))
    if (experimentPage.value > maxPage) experimentPage.value = maxPage
    const start = (experimentPage.value - 1) * experimentPageSize.value
    return filteredExperiments.value.slice(start, start + experimentPageSize.value)
  })
  const runningExperiments = computed(() =>
    experiments.value.filter((experiment) => ['RUNNING', 'DEBUGGING', 'READY'].includes(experiment.status)),
  )
  const enabledFeatures = computed(() => featureFlags.value.filter((feature) => feature.status === 'enabled'))
  const activeAlarms = computed(() => alarmTasks.value.filter((alarm) => alarm.enabled))
  const mustSeeMetrics = computed(() =>
    metrics.value.filter((metric) => metric.isMustSee && metric.status === 'active'),
  )
  const canSubmitDraft = computed(
    () => draftChecks.value.length > 0 && !draftChecks.value.some((item) => item.level === 'ERROR'),
  )
  const permissionAuditItems = computed<PermissionAuditItem[]>(() => {
    const experimentName = selectedExperiment.value?.name ?? '未选择实验'
    const featureName = selectedFeature.value?.name ?? '未选择 Feature'
    const items: Array<{
      id: EntityId
      domain: PermissionAuditItem['domain']
      action: string
      objectName: string
      grantedLevel: PermissionAuditItem['grantedLevel']
    }> = [
      {
        id: 'perm_start_experiment',
        domain: 'experiment',
        action: 'start',
        objectName: experimentName,
        grantedLevel: selectedExperimentPermission.value,
      },
      {
        id: 'perm_export_report',
        domain: 'report',
        action: 'export_report',
        objectName: selectedReportExperiment.value?.name ?? experimentName,
        grantedLevel: selectedExperimentPermission.value === 'none' ? 'view' : selectedExperimentPermission.value,
      },
      {
        id: 'perm_create_metric',
        domain: 'metric',
        action: 'create_metric',
        objectName: selectedMetricGroup.value?.name ?? '指标组',
        grantedLevel: selectedMetricGroup.value?.permissionType === 'private' ? 'collaborate' : 'admin',
      },
      {
        id: 'perm_publish_feature',
        domain: 'feature',
        action: 'publish_feature',
        objectName: featureName,
        grantedLevel: selectedFeaturePermission.value,
      },
    ]
    return items.map((item) => {
      const result = canUseAbAction(permissionContext.value, item.action, item.grantedLevel)
      return {
        ...item,
        requiredLevel: result.requiredLevel,
        passed: result.allowed,
        reason: result.reason,
      }
    })
  })
  const performanceBudgetItems = computed<PerformanceBudgetItem[]>(() => [
    {
      id: 'perf_create_first_screen',
      scope: '创建页首屏',
      budgetMs: 2000,
      measuredMs: 1260,
      status: 'pass',
      recoveryAction: '保持向导懒加载，复杂选择器延后加载',
    },
    {
      id: 'perf_traffic_layer',
      scope: '流量层加载',
      budgetMs: 1000,
      measuredMs: 420,
      status: 'pass',
      recoveryAction: '缓存流量层和互斥域树',
    },
    {
      id: 'perf_mutex_tree',
      scope: '互斥域树',
      budgetMs: 2000,
      measuredMs: 860,
      status: 'pass',
      recoveryAction: '树节点分页和搜索时按需渲染',
    },
    {
      id: 'perf_calculator',
      scope: '流量计算器',
      budgetMs: 3000,
      measuredMs: 130,
      status: 'pass',
      recoveryAction: '计算失败时保留输入并允许重试',
    },
    {
      id: 'perf_feature_runtime',
      scope: 'Runtime 决策',
      budgetMs: 50,
      measuredMs: 12,
      status: 'pass',
      recoveryAction: '白名单、实验、Feature、默认值短路决策',
    },
  ])
  const e2eAcceptanceCases = computed<E2EAcceptanceCase[]>(() => [
    {
      id: 'e2e_create_debug',
      module: '实验创建',
      scenario: '草稿恢复、提交检查、提交调试',
      status: 'covered_by_unit',
      evidence: '规则单测 + 创建向导浏览器冒烟',
    },
    {
      id: 'e2e_manage_report',
      module: '实验管理与报告',
      scenario: '状态流转、安全编辑、扩缩量、关闭组、报告导出',
      status: 'passed',
      evidence: '实验管理/报告页面浏览器冒烟',
    },
    {
      id: 'e2e_metric_snapshot',
      module: '指标管理',
      scenario: '指标组创建、复制、合并、下线、必看指标带入',
      status: 'covered_by_unit',
      evidence: '指标页面交互 + 服务层契约',
    },
    {
      id: 'e2e_feature_runtime',
      module: 'Feature 配置',
      scenario: '创建、版本、发布、白名单、回滚、Runtime 决策、实验固化',
      status: 'passed',
      evidence: 'Feature 页面浏览器冒烟 + Runtime 单测',
    },
    {
      id: 'e2e_backend_compute',
      module: '后端计算',
      scenario: '真实指标计算、异步 Uplift、热力图截图、数据导出文件生成',
      status: 'backend_required',
      evidence: '已固定 API 契约，待后端联调',
    },
  ])
  const coverageCompletion = computed(() => {
    const items = summary.value?.coverage ?? []
    if (!items.length) return 0
    const completed = items.filter((item) => item.status === 'done').length
    return Math.round((completed / items.length) * 100)
  })
  const reportExportQueueHealth = computed(() => {
    const running = reportExportTasks.value.filter((task) => task.status === 'queued' || task.status === 'running').length
    const failed = reportExportTasks.value.filter((task) => task.status === 'failed').length
    const canceled = reportExportTasks.value.filter((task) => task.status === 'canceled').length
    return { running, failed, canceled }
  })

  function restoreDraft() {
    const stored = parseStoredJson<Partial<ExperimentDraft>>(getStorage()?.getItem(draftStorageKey) ?? null)
    if (stored) {
      const defaults = createDefaultExperimentDraft()
      draftExperiment.value = {
        ...defaults,
        ...stored,
        variants: stored.variants?.length ? stored.variants : defaults.variants,
        paramSchemas: stored.paramSchemas?.length ? stored.paramSchemas : defaults.paramSchemas,
        diversionConfig: {
          ...defaults.diversionConfig,
          ...stored.diversionConfig,
          filter: stored.diversionConfig?.filter ?? defaults.diversionConfig.filter,
        },
        trafficConfig: {
          ...defaults.trafficConfig,
          ...stored.trafficConfig,
        },
        specialConfig: {
          ...defaults.specialConfig,
          ...stored.specialConfig,
          splitUrl: {
            ...defaults.specialConfig.splitUrl,
            ...stored.specialConfig?.splitUrl,
            urls: {
              ...defaults.specialConfig.splitUrl.urls,
              ...stored.specialConfig?.splitUrl?.urls,
            },
            rules: {
              ...defaults.specialConfig.splitUrl.rules,
              ...stored.specialConfig?.splitUrl?.rules,
            },
          },
          push: {
            ...defaults.specialConfig.push,
            ...stored.specialConfig?.push,
            quietHours: {
              ...defaults.specialConfig.push.quietHours,
              ...stored.specialConfig?.push?.quietHours,
            },
            titles: {
              ...defaults.specialConfig.push.titles,
              ...stored.specialConfig?.push?.titles,
            },
            contents: {
              ...defaults.specialConfig.push.contents,
              ...stored.specialConfig?.push?.contents,
            },
            actionUrls: {
              ...defaults.specialConfig.push.actionUrls,
              ...stored.specialConfig?.push?.actionUrls,
            },
          },
          mvt: {
            ...defaults.specialConfig.mvt,
            ...stored.specialConfig?.mvt,
            elements: stored.specialConfig?.mvt?.elements?.length
              ? stored.specialConfig.mvt.elements
              : defaults.specialConfig.mvt.elements,
          },
          personalization: {
            ...defaults.specialConfig.personalization,
            ...stored.specialConfig?.personalization,
            audiences: stored.specialConfig?.personalization?.audiences?.length
              ? stored.specialConfig.personalization.audiences
              : defaults.specialConfig.personalization.audiences,
          },
          parentChild: {
            ...defaults.specialConfig.parentChild,
            ...stored.specialConfig?.parentChild,
          },
          reverse: {
            ...defaults.specialConfig.reverse,
            ...stored.specialConfig?.reverse,
          },
          ad: {
            ...defaults.specialConfig.ad,
            ...stored.specialConfig?.ad,
            deliveryConfig: {
              ...defaults.specialConfig.ad.deliveryConfig,
              ...stored.specialConfig?.ad?.deliveryConfig,
            },
            reviewSchedule: {
              ...defaults.specialConfig.ad.reviewSchedule,
              ...stored.specialConfig?.ad?.reviewSchedule,
            },
          },
          mab: {
            ...defaults.specialConfig.mab,
            ...stored.specialConfig?.mab,
          },
          visual: {
            ...defaults.specialConfig.visual,
            ...stored.specialConfig?.visual,
            elements: stored.specialConfig?.visual?.elements?.length
              ? stored.specialConfig.visual.elements
              : defaults.specialConfig.visual.elements,
          },
        },
      }
    }
    draftExperiment.value.variants.forEach((variant) => {
      if (!draftExperiment.value.specialConfig.splitUrl.rules[variant.tempId]) {
        draftExperiment.value.specialConfig.splitUrl.rules[variant.tempId] = {
          matchType: 'path',
          pattern: `/${variant.tempId}`,
          caseSensitive: false,
        }
      }
      if (!draftExperiment.value.specialConfig.splitUrl.urls[variant.tempId]) {
        draftExperiment.value.specialConfig.splitUrl.urls[variant.tempId] = `https://example.com/${variant.tempId}`
      }
      if (!draftExperiment.value.specialConfig.push.titles[variant.tempId]) {
        draftExperiment.value.specialConfig.push.titles[variant.tempId] = variant.name
      }
      if (!draftExperiment.value.specialConfig.push.contents[variant.tempId]) {
        draftExperiment.value.specialConfig.push.contents[variant.tempId] = '填写该版本的推送正文。'
      }
      if (!draftExperiment.value.specialConfig.push.actionUrls[variant.tempId]) {
        draftExperiment.value.specialConfig.push.actionUrls[variant.tempId] = 'app://home'
      }
    })
    const config = draftExperiment.value.trafficConfig
    uniformTaskDetail.value = {
      taskId: config.uniformTaskId,
      status: config.uniformStatus,
      progress: ['SUCCESS', 'FAILED', 'CANCELED'].includes(config.uniformStatus) ? 100 : config.uniformStatus === 'RUNNING' ? 35 : 0,
      runTimes: config.uniformStatus === 'NOT_STARTED' ? 0 : Math.min(config.uniformMaxRunTimes, 12),
      maxRunTimes: config.uniformMaxRunTimes,
      pValueThreshold: config.uniformPValueThreshold,
      metricResults: [],
      segmentResults: [],
      logs: config.uniformTaskId
        ? [
            {
              id: createDraftTempId('rerand_log'),
              message: config.uniformFailureReason ?? '已从草稿恢复调平任务状态，请刷新或重新调平获取最新明细',
              createdAt: new Date().toISOString(),
            },
          ]
        : [],
      failureReason: config.uniformFailureReason,
      appliedAt: config.uniformResultApplied ? new Date().toISOString() : undefined,
      locked: config.uniformConfigLocked === true,
    }
    draftDirty.value = false
  }

  function persistDraft() {
    getStorage()?.setItem(draftStorageKey, JSON.stringify(draftExperiment.value))
  }

  function saveDraft() {
    persistDraft()
    draftDirty.value = false
    draftSubmitMessage.value = '草稿已保存'
    return { message: '草稿已保存' }
  }

  function resetDraft() {
    draftExperiment.value = createDefaultExperimentDraft()
    activeExperimentTemplateId.value = null
    activeTemplateLockedFields.value = []
    draftChecks.value = []
    draftSubmitMessage.value = null
    lastCreatedExperimentId.value = null
    currentCreateStep.value = 1
    draftDirty.value = false
    getStorage()?.removeItem(draftStorageKey)
  }

  function restoreSelections() {
    const stored = parseStoredJson<{
      selectedExperimentId?: EntityId
      selectedReportExperimentId?: EntityId
      selectedFeatureId?: EntityId
    }>(getStorage()?.getItem(selectionStorageKey) ?? null)
    if (!stored) return
    selectedExperimentId.value = stored.selectedExperimentId ?? selectedExperimentId.value
    selectedReportExperimentId.value = stored.selectedReportExperimentId ?? selectedReportExperimentId.value
    selectedFeatureId.value = stored.selectedFeatureId ?? selectedFeatureId.value
  }

  function persistSelections() {
    getStorage()?.setItem(
      selectionStorageKey,
      JSON.stringify({
        selectedExperimentId: selectedExperimentId.value,
        selectedReportExperimentId: selectedReportExperimentId.value,
        selectedFeatureId: selectedFeatureId.value,
      }),
    )
  }

  function syncSelectedFeatureDrafts() {
    const versionId = selectedCurrentFeatureVersion.value?.versionId ?? selectedLatestFeatureVersion.value?.versionId ?? ''
    featurePublishDraft.value.versionId = versionId
    whitelistDraft.value.versionId = versionId
    const defaultRuleId = selectedCurrentFeatureVersion.value?.defaultRule.ruleId ?? 'else'
    whitelistDraft.value.ruleUserIds = {
      [defaultRuleId]: whitelistUserIdsText.value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    }
  }

  async function loadWorkspace() {
    loading.value = true
    loadError.value = null
    restoreDraft()
    restoreSelections()

    try {
      const [
        summaryPayload,
        experimentPayload,
        trafficLayerPayload,
        mutexGroupPayload,
        metricGroupPayload,
        metricPayload,
        metricTemplatePayload,
        experimentTemplatePayload,
        alarmPayload,
        receiverPayload,
        mustSeePayload,
        featurePayload,
        featureVersionPayload,
        publishPayload,
        whitelistPayload,
        hitTemplatePayload,
        dedupPayload,
        boardPayload,
        logPayload,
        permissionGrantPayload,
        apiIntegrationPayload,
      ] = await Promise.all([
        abTestingService.getWorkspaceSummary(),
        abTestingService.getExperiments(),
        abTestingService.getTrafficLayers(),
        abTestingService.getMutexDomainGroups(),
        abTestingService.getMetricGroups(),
        abTestingService.getMetrics(),
        abTestingService.getMetricTemplates(),
        abTestingService.getExperimentTemplates(),
        abTestingService.getAlarmTasks(),
        abTestingService.getReceiverGroups(),
        abTestingService.getMustSeeMetricTrends(),
        abTestingService.getFeatureFlags(),
        abTestingService.getFeatureVersions(),
        abTestingService.getPublishPlans(),
        abTestingService.getWhitelistTests(),
        abTestingService.getHitQueryTemplates(),
        abTestingService.getDataDedupTasks(),
        abTestingService.getExperimentBoards(),
        abTestingService.getOperationLogs(),
        abTestingService.getExperimentPermissionGrants(),
        abTestingService.getBackendIntegrationStatus(),
      ])

      summary.value = summaryPayload
      experiments.value = experimentPayload
      trafficLayers.value = trafficLayerPayload
      mutexDomainGroups.value = mutexGroupPayload
      metricGroups.value = metricGroupPayload
      metrics.value = metricPayload
      metricTemplates.value = metricTemplatePayload
      experimentTemplateOptions.value = experimentTemplatePayload
      alarmTasks.value = alarmPayload
      receiverGroups.value = receiverPayload
      mustSeeTrends.value = mustSeePayload
      featureFlags.value = featurePayload
      featureVersions.value = featureVersionPayload
      publishPlans.value = publishPayload
      whitelistTests.value = whitelistPayload
      hitQueryTemplates.value = hitTemplatePayload
      dataDedupTasks.value = dedupPayload
      experimentBoards.value = boardPayload
      operationLogs.value = logPayload
      experimentPermissionGrants.value = permissionGrantPayload
      apiIntegrationStatus.value = apiIntegrationPayload

      if (!experimentPayload.some((experiment) => experiment.id === selectedExperimentId.value)) {
        selectedExperimentId.value = experimentPayload[0]?.id ?? ''
      }
      if (!experimentPayload.some((experiment) => experiment.id === selectedReportExperimentId.value)) {
        selectedReportExperimentId.value =
          experimentPayload.find((experiment) => experiment.id === 'exp_feed_strategy')?.id ??
          experimentPayload[0]?.id ??
          ''
      }
      if (!featurePayload.some((feature) => feature.featureId === selectedFeatureId.value)) {
        selectedFeatureId.value = featurePayload[0]?.featureId ?? ''
      }
      if (!metricGroupPayload.some((group) => group.id === selectedMetricGroupId.value)) {
        selectedMetricGroupId.value = metricGroupPayload[0]?.id ?? ''
      }
      if (!boardPayload.some((board) => board.id === selectedBoardId.value)) {
        selectedBoardId.value = boardPayload[0]?.id ?? ''
      }

      persistSelections()
      syncSelectedFeatureDrafts()
      await Promise.all([
        selectedExperimentId.value ? loadPlanningBundle(selectedExperimentId.value) : Promise.resolve(),
        selectedReportExperimentId.value ? loadReport(selectedReportExperimentId.value) : Promise.resolve(),
      ])
      initialized.value = true
    } catch (error) {
      loadError.value = error instanceof Error ? error.message : 'A/B 测试工作台加载失败'
      throw error
    } finally {
      loading.value = false
    }
  }

  async function loadPlanningBundle(experimentId: EntityId) {
    planningBundle.value = await abTestingService.getExperimentPlanningBundle(experimentId)
    selectedExperimentId.value = experimentId
    if (planningBundle.value?.experiment) {
      safeEditDraft.value = {
        name: planningBundle.value.experiment.name,
        goal: planningBundle.value.experiment.goal,
        riskNote: planningBundle.value.experiment.riskNote ?? '',
        tagsText: planningBundle.value.experiment.tags.join(','),
      }
      scaleTrafficDraft.value.targetTrafficRatio = planningBundle.value.experiment.trafficRatio
    }
    persistSelections()
  }

  async function loadExperimentPermissions(experimentId = selectedExperimentId.value) {
    if (!experimentId) return []
    const grants = await abTestingService.getExperimentPermissionGrants(experimentId)
    experimentPermissionGrants.value = [
      ...experimentPermissionGrants.value.filter((grant) => grant.experimentId !== experimentId),
      ...grants,
    ]
    return grants
  }

  async function saveExperimentPermissions(
    experimentId: EntityId,
    payload: ExperimentPermissionUpdatePayload,
  ) {
    const result = await abTestingService.updateExperimentPermissions(experimentId, payload)
    if (result.experiment) {
      const index = experiments.value.findIndex((experiment) => experiment.id === result.experiment?.id)
      if (index >= 0) experiments.value.splice(index, 1, result.experiment)
      if (selectedExperimentId.value === experimentId) {
        planningBundle.value = planningBundle.value
          ? { ...planningBundle.value, experiment: result.experiment }
          : planningBundle.value
      }
    }
    experimentPermissionGrants.value = [
      ...experimentPermissionGrants.value.filter((grant) => grant.experimentId !== experimentId),
      ...result.grants,
    ]
    operationLogs.value = await abTestingService.getOperationLogs()
    return result
  }

  function resetExperimentFilters() {
    experimentKeyword.value = ''
    selectedStatuses.value = []
    selectedExperimentType.value = null
    selectedExperimentTags.value = []
    selectedExperimentOwnerId.value = null
    selectedExperimentVisibility.value = 'ALL'
    experimentCreatedRange.value = { start: '', end: '' }
    experimentRunningRange.value = { start: '', end: '' }
    experimentPage.value = 1
  }

  function toggleExperimentSelection(experimentId: EntityId, checked: boolean) {
    selectedExperimentIds.value = checked
      ? [...new Set([...selectedExperimentIds.value, experimentId])]
      : selectedExperimentIds.value.filter((id) => id !== experimentId)
  }

  function togglePagedExperimentSelection(checked: boolean) {
    const pageIds = pagedExperiments.value.map((experiment) => experiment.id)
    selectedExperimentIds.value = checked
      ? [...new Set([...selectedExperimentIds.value, ...pageIds])]
      : selectedExperimentIds.value.filter((id) => !pageIds.includes(id))
  }

  async function applyBatchTagToSelected() {
    const tag = batchTagText.value.trim()
    if (!tag || selectedExperimentIds.value.length === 0) return { message: '请选择实验并输入标签' }
    const selectedIds = [...selectedExperimentIds.value]
    await Promise.all(
      selectedIds.map((experimentId) => {
        const experiment = experiments.value.find((item) => item.id === experimentId)
        if (!experiment) return Promise.resolve({ message: '实验不存在' })
        return abTestingService.safeEditExperiment(experimentId, {
          tags: [...new Set([...experiment.tags, tag])],
        })
      }),
    )
    await refreshExperimentDomain()
    batchTagText.value = ''
    return { message: `已为 ${selectedIds.length} 个实验添加标签` }
  }

  async function archiveSelectedExperiments() {
    const selectedIds = [...selectedExperimentIds.value]
    if (!selectedIds.length) return { message: '请选择实验' }
    await Promise.all(selectedIds.map((experimentId) => abTestingService.transitionExperiment(experimentId, 'archive')))
    selectedExperimentIds.value = []
    await refreshExperimentDomain()
    return { message: `已归档 ${selectedIds.length} 个实验` }
  }

  function exportSelectedExperiments() {
    return {
      message: selectedExperimentIds.value.length
        ? `已生成 ${selectedExperimentIds.value.length} 个实验的导出任务`
        : '请选择要导出的实验',
    }
  }

  function mergeSpecialConfigPatch(
    baseConfig: ExperimentDraftSpecialConfig,
    patch?: Partial<ExperimentDraftSpecialConfig>,
  ): ExperimentDraftSpecialConfig {
    if (!patch) return cloneDraftValue(baseConfig)
    const next = cloneDraftValue(baseConfig) as unknown as Record<string, unknown>
    for (const [key, value] of Object.entries(patch)) {
      const current = next[key]
      next[key] =
        current && value && typeof current === 'object' && typeof value === 'object' && !Array.isArray(value)
          ? { ...(current as Record<string, unknown>), ...(value as Record<string, unknown>) }
          : cloneDraftValue(value)
    }
    return next as unknown as ExperimentDraftSpecialConfig
  }

  function isDraftFieldLocked(field: ExperimentTemplate['lockedFields'][number]) {
    return activeTemplateLockedFields.value.includes(field)
  }

  function applyExperimentTemplate(templateId: EntityId) {
    const template = experimentTemplateOptions.value.find((item) => item.id === templateId)
    if (!template) return { success: false, message: '模板不存在' }
    const defaults = createDefaultExperimentDraft()
    draftExperiment.value = {
      ...defaults,
      type: template.type,
      name: `${template.name.replace('模板', '')}-${todayIsoDate()}`,
      description: template.description,
      tags: [...template.tags],
      durationDays: template.defaultDurationDays,
      trafficRatio: template.defaultTrafficRatio,
      metricIds: [...template.metricIds],
      trafficConfig: {
        ...defaults.trafficConfig,
        experimentTrafficRatio: template.defaultTrafficRatio,
      },
      specialConfig: mergeSpecialConfigPatch(createDefaultSpecialConfig(), template.specialConfigPatch),
    }
    activeExperimentTemplateId.value = template.id
    activeTemplateLockedFields.value = [...template.lockedFields]
    syncDraftTrafficDomainForType(template.type)
    draftChecks.value = []
    currentCreateStep.value = 2
    persistDraft()
    return { success: true, message: '模板已应用，请补充实验基础信息' }
  }

  async function loadReport(experimentId: EntityId) {
    selectedReportExperimentId.value = experimentId
    const [
      overviewPayload,
      metricPayload,
      funnelPayload,
      cohortPayload,
      heatmapPayload,
      mabPayload,
      sensitivePayload,
      exportTaskPayload,
    ] = await Promise.all([
        abTestingService.getReportOverview(experimentId),
        abTestingService.queryMetricResults(experimentId),
        abTestingService.getFunnelReport('metric_ad_funnel'),
        abTestingService.getCohortReport('metric_retention_d1'),
        abTestingService.getHeatmapReport(),
        abTestingService.getMabReport(experimentId),
        abTestingService.getSensitiveInsightTasks(experimentId),
        abTestingService.getReportExportTasks(experimentId),
      ])
    reportOverview.value = overviewPayload
    metricResults.value = metricPayload.metrics
    trendPoints.value = metricPayload.trends
    filterTemplates.value = metricPayload.templates
    funnelReport.value = funnelPayload
    cohortReport.value = cohortPayload
    heatmapReport.value = heatmapPayload
    mabReport.value = mabPayload
    sensitiveTasks.value = sensitivePayload
    reportExportTasks.value = exportTaskPayload
    persistSelections()
  }

  async function validateDraft() {
    const result = await abTestingService.validateExperimentDraft(draftExperiment.value)
    draftChecks.value = result.items
    draftSubmitMessage.value = null
    persistDraft()
    return result
  }

  function validateCreateStep(step = currentCreateStep.value) {
    const draft = draftExperiment.value
    const items: DraftValidation['items'] = []

    if (step === 1) {
      items.push({
        level: draft.type ? 'PASS' : 'ERROR',
        code: 'EXPERIMENT_TYPE_REQUIRED',
        message: draft.type ? '实验类型已选择' : '请选择实验类型',
        step,
      })
    }

    if (step === 2) {
      const duplicateName = experiments.value.some(
        (experiment) =>
          ['RUNNING', 'DEBUGGING'].includes(experiment.status) &&
          experiment.name.trim() === draft.name.trim() &&
          experiment.id !== lastCreatedExperimentId.value,
      )
      items.push(
        {
          level: draft.name.trim() && draft.name.length <= 100 && !duplicateName ? 'PASS' : 'ERROR',
          code: 'EXPERIMENT_NAME',
          message: duplicateName
            ? '同一应用下运行中或调试中实验名称不可重复'
            : draft.name.trim() && draft.name.length <= 100
              ? '实验名称可用'
              : '实验名称必填，且最多 100 字',
          step,
        },
        {
          level: (draft.description?.length ?? 0) <= 1000 ? 'PASS' : 'ERROR',
          code: 'EXPERIMENT_DESCRIPTION_LENGTH',
          message: (draft.description?.length ?? 0) <= 1000 ? '实验描述长度合法' : '实验描述最多 1000 字',
          step,
        },
        {
          level: draft.ownerId ? 'PASS' : 'ERROR',
          code: 'EXPERIMENT_OWNER_REQUIRED',
          message: draft.ownerId ? '实验负责人已选择' : '请选择实验负责人',
          step,
        },
        {
          level: isGoalDetailed(draft.goal) ? 'PASS' : 'ERROR',
          code: 'GOAL_DETAIL_REQUIRED',
          message: isGoalDetailed(draft.goal)
            ? '实验目标已包含策略、用户/场景、指标与预期变化'
            : '实验目标需说明策略变化、影响用户或场景、目标指标和预期提升',
          step,
        },
        {
          level: draft.tags.length <= 20 ? 'PASS' : 'ERROR',
          code: 'EXPERIMENT_TAG_LIMIT',
          message: draft.tags.length <= 20 ? '实验标签数量合法' : '单个实验最多 20 个标签',
          step,
        },
        {
          level: draft.durationDays >= 7 ? 'PASS' : 'WARN',
          code: 'EXPERIMENT_DURATION_SHORT',
          message:
            draft.durationDays >= 7
              ? '实验时长满足完整周期建议'
              : '实验周期过短，可能无法覆盖完整工作日与周末周期',
          step,
        },
      )
    }

    if (step === 3) {
      const activeVariants = draft.variants
      const variantNames = activeVariants.map((variant) => variant.name.trim()).filter(Boolean)
      const paramKeys = draft.paramSchemas.map((schema) => schema.key.trim()).filter(Boolean)
      const trafficValidation = validateTrafficRatios(activeVariants.map((variant) => variant.trafficRatio))
      const invalidParamKey = draft.paramSchemas.find((schema) => schema.key.trim() && !paramKeyPattern.test(schema.key.trim()))
      const invalidParamValue = draft.paramSchemas.flatMap((schema) =>
        activeVariants
          .map((variant) => ({
            schema,
            variant,
            result: validateExperimentParamValue(schema.type, variant.params[schema.key], schema.required),
          }))
          .filter((item) => !item.result.valid),
      )[0]

      items.push(
        {
          level: activeVariants.length >= 2 && activeVariants.length <= 20 ? 'PASS' : 'ERROR',
          code: 'VARIANT_COUNT',
          message:
            activeVariants.length >= 2 && activeVariants.length <= 20
              ? '版本数量合法'
              : '普通实验至少 2 个版本，最多 20 个版本',
          step,
        },
        {
          level: variantNames.length === activeVariants.length && new Set(variantNames).size === variantNames.length ? 'PASS' : 'ERROR',
          code: 'VARIANT_NAME_UNIQUE',
          message:
            variantNames.length === activeVariants.length && new Set(variantNames).size === variantNames.length
              ? '版本名称唯一'
              : '版本名称不能为空，且同一实验内不可重复',
          step,
        },
        {
          level: activeVariants.filter((variant) => variant.isControl).length === 1 ? 'PASS' : 'ERROR',
          code: 'CONTROL_VARIANT',
          message:
            activeVariants.filter((variant) => variant.isControl).length === 1
              ? '对照组唯一'
              : '必须且只能有一个对照组',
          step,
        },
        {
          level: trafficValidation.valid ? 'PASS' : 'ERROR',
          code: 'VARIANT_TRAFFIC_RATIO',
          message: trafficValidation.valid ? '版本流量比例合计 100%' : trafficValidation.message ?? '版本流量比例不合法',
          step,
        },
        {
          level:
            paramKeys.length === draft.paramSchemas.length &&
            new Set(paramKeys).size === paramKeys.length &&
            !invalidParamKey
              ? 'PASS'
              : 'ERROR',
          code: 'PARAM_SCHEMA_KEY',
          message: invalidParamKey
            ? '参数 Key 只能包含字母、数字、下划线，且不能以数字开头'
            : paramKeys.length === draft.paramSchemas.length && new Set(paramKeys).size === paramKeys.length
              ? '参数 Key 唯一且完整'
              : '参数 Key 不能为空且不能重复',
          step,
        },
        {
          level: invalidParamValue ? 'ERROR' : 'PASS',
          code: 'PARAM_VALUE_TYPE',
          message: invalidParamValue
            ? `${invalidParamValue.variant.name} / ${invalidParamValue.schema.name}: ${invalidParamValue.result.message}`
            : '版本参数值类型合法',
          step,
        },
      )

      for (const schema of draft.paramSchemas) {
        const values = activeVariants.map((variant) => variant.params[schema.key])
        if (hasHardcodedGroupParam(schema.key, values)) {
          items.push({
            level: 'WARN',
            code: `PARAM_HARDCODE_${schema.tempId}`,
            message: `${schema.key} 可能按实验组编号设计，建议改为功能控制项`,
            step,
          })
        }
      }

      if (draft.type === 'SPLIT_URL') {
        const urls = activeVariants.map((variant) => draft.specialConfig.splitUrl.urls[variant.tempId]?.trim() ?? '')
        const invalidUrl = urls.find((url) => !/^https?:\/\//.test(url))
        const rulesValid =
          draft.specialConfig.splitUrl.matchMode === 'SIMPLE' ||
          activeVariants.every((variant) => {
            const rule = draft.specialConfig.splitUrl.rules[variant.tempId]
            return rule?.pattern?.trim() && rule.matchType
          })
        items.push({
          level: urls.every(Boolean) && !invalidUrl && new Set(urls).size === urls.length && rulesValid ? 'PASS' : 'ERROR',
          code: 'SPLIT_URL_CONFIG',
          message:
            urls.every(Boolean) && !invalidUrl && new Set(urls).size === urls.length && rulesValid
              ? '多链接版本 URL 与匹配规则已配置'
              : '多链接实验每个版本 URL 必填且不可重复，精准匹配模式需配置每个版本的匹配规则',
          step,
        })
      }
      if (draft.type === 'PUSH') {
        const push = draft.specialConfig.push
        const missingVariantCopy = activeVariants.some(
          (variant) => !push.titles[variant.tempId]?.trim() || !push.contents[variant.tempId]?.trim(),
        )
        const pushValid = Boolean(
          push.channel &&
            push.touchRange &&
            push.frequencyCapPerUser > 0 &&
            push.rehearsalChecked &&
            push.approvalStatus === 'APPROVED' &&
            (push.sendMode === 'TRIGGER' ? push.triggerCondition : push.sendTime) &&
            !missingVariantCopy,
        )
        items.push({
          level: pushValid ? 'PASS' : 'ERROR',
          code: 'PUSH_CONFIG',
          message:
            pushValid
              ? '推送配置、频控、演练和审核均已完成'
              : '推送实验需配置通道、触达范围、频控、发送规则、版本内容，并完成演练和审核',
          step,
        })
      }
      if (draft.type === 'MVT') {
        const elements = draft.specialConfig.mvt.elements
        const valid =
          elements.length >= 2 &&
          elements.every((element) => element.name.trim() && element.variants.length >= 2) &&
          Boolean(draft.specialConfig.mvt.primaryElementId)
        items.push({
          level: valid ? 'PASS' : 'ERROR',
          code: 'MVT_CONFIG',
          message: valid ? 'MVT 元素、主元素和变体数量合法' : 'MVT 至少配置 2 个实验元素、主元素，且每个元素至少 2 个变体',
          step,
        })
        if (valid && mvtCombinationCount.value > 12) {
          items.push({
            level: 'WARN',
            code: 'MVT_SAMPLE_RISK',
            message: `MVT 将生成 ${mvtCombinationCount.value} 个组合版本，请确认样本量充足`,
            step,
          })
        }
      }
      if (draft.type === 'MAB') {
        const mab = draft.specialConfig.mab
        const mabValid =
          Boolean(mab.optimizationMetricId) &&
          mab.explorationTrafficRatio > 0 &&
          mab.rewardWindowHours > 0 &&
          mab.minSamplePerArm > 0
        items.push({
          level: mabValid ? 'PASS' : 'ERROR',
          code: 'MAB_CONFIG',
          message: mabValid
            ? 'MAB 算法、优化指标、奖励窗口和最小样本已配置'
            : 'MAB 实验必须配置算法、唯一优化指标、探索流量、奖励窗口和最小样本',
          step,
        })
      }
      if (['PERSONALIZATION_WEB', 'PERSONALIZATION_CODE'].includes(draft.type)) {
        const audiences = draft.specialConfig.personalization.audiences
        const priorities = audiences.map((audience) => audience.priority)
        const valid =
          audiences.length > 0 &&
          audiences.every((audience) => audience.name.trim() && audience.rule.trim() && audience.variantTempId && audience.holdoutRatio >= 0) &&
          new Set(priorities).size === priorities.length
        items.push({
          level: valid ? 'PASS' : 'ERROR',
          code: 'PERSONALIZATION_CONFIG',
          message: valid ? '个性化人群、策略版本、保留组和优先级已配置' : '个性化实验需配置人群规则、绑定版本、保留组并保证优先级唯一',
          step,
        })
      }
      if (draft.type === 'PARENT_CHILD') {
        const parentChild = draft.specialConfig.parentChild
        items.push({
          level:
            parentChild.parentExperimentId &&
            parentChild.parentVariantId &&
            parentChild.childTrafficRatio > 0 &&
            parentChild.trafficInheritanceMode
              ? 'PASS'
              : 'ERROR',
          code: 'PARENT_CHILD_CONFIG',
          message: parentChild.parentExperimentId && parentChild.parentVariantId
            ? '父实验、父版本和子实验流量已配置'
            : '父子实验需选择运行中的父实验及父实验版本',
          step,
        })
      }
      if (draft.type === 'REVERSE') {
        const reverse = draft.specialConfig.reverse
        items.push({
          level:
            reverse.sourceExperimentId &&
            reverse.sourceControlVariantId &&
            reverse.suggestedTrafficRatio > 0 &&
            reverse.observationDays > 0
              ? 'PASS'
              : 'ERROR',
          code: 'REVERSE_CONFIG',
          message: reverse.sourceExperimentId && reverse.sourceControlVariantId
            ? '反转实验来源和候选对照流量已配置'
            : '反转实验需关联原实验和原对照组',
          step,
        })
      }
      if (draft.type === 'AD') {
        const ad = draft.specialConfig.ad
        const selectedAccount = ad.accounts.find((account) => account.id === ad.accountId)
        const adValid =
          Boolean(ad.accountId && ad.projectId && ad.authorizationChecked) &&
          selectedAccount?.status === 'AUTHORIZED' &&
          ad.assets.length > 0 &&
          ad.assets.every((asset) => asset.reviewStatus === 'APPROVED') &&
          ad.deliveryConfig.dailyBudget > 0 &&
          Boolean(ad.deliveryConfig.startAt && ad.deliveryConfig.endAt) &&
          ad.reviewSchedule.auditStatus === 'APPROVED'
        items.push({
          level: adValid ? 'PASS' : 'ERROR',
          code: 'AD_CONFIG',
          message: adValid
            ? '广告账户、资产、投放配置、审核和排期已完成'
            : '广告实验需绑定已授权账户、项目、审核通过资产、投放配置和审核排期',
          step,
        })
      }
      if (draft.type === 'VISUAL') {
        const visual = draft.specialConfig.visual
        const visualValid =
          /^https?:\/\//.test(visual.pageUrl) &&
          visual.extensionDetected &&
          visual.editorStatus === 'CONFIGURED' &&
          visual.elements.length > 0 &&
          visual.elements.every((element) => element.selector.trim() && element.newValue.trim())
        items.push({
          level: visualValid ? 'PASS' : 'ERROR',
          code: 'VISUAL_CONFIG',
          message: visualValid
            ? '可视化编辑器、扩展检测、元素编辑和热力图配置完整'
            : '可视化实验需配置页面 URL、扩展检测、编辑器状态和至少一个可编辑元素',
          step,
        })
      }
    }

    if (step === 4) {
      const groups = draft.diversionConfig.filter.groups
      const invalidCondition = groups.flatMap((group) => group.conditions).find((condition) => {
        const operatorNeedsValue = !['is_null', 'is_not_null'].includes(condition.operator)
        return !condition.field.trim() || (operatorNeedsValue && (condition.value === undefined || condition.value === ''))
      })
      items.push(
        {
          level: draft.diversionConfig.decisionIdField.trim() ? 'PASS' : 'ERROR',
          code: 'DECISION_ID_REQUIRED',
          message: draft.diversionConfig.decisionIdField.trim() ? '分流 ID 已配置' : '请配置分流 ID 字段',
          step,
        },
        {
          level: groups.length > 0 && groups.every((group) => group.conditions.length > 0) && !invalidCondition ? 'PASS' : 'ERROR',
          code: 'AUDIENCE_RULES',
          message:
            groups.length > 0 && groups.every((group) => group.conditions.length > 0) && !invalidCondition
              ? '受众 AND/OR 条件合法'
              : '请至少配置一个完整受众条件组',
          step,
        },
      )
    }

    if (step === 5) {
      const layer = compatibleTrafficLayers.value.find((item) => item.id === draft.trafficConfig.trafficLayerId)
      const mutexDomain = draftSelectedMutexDomain.value
      const smoothValid =
        draft.trafficConfig.effectiveMode === 'IMMEDIATE' ||
        ((draft.trafficConfig.smoothDurationMinutes ?? 0) >= 1 && (draft.trafficConfig.smoothDurationMinutes ?? 0) <= 1440)
      const uniformReady =
        !draft.trafficConfig.uniformDiversionEnabled || draft.trafficConfig.uniformStatus === 'SUCCESS'
      items.push(
        {
          level:
            draft.trafficConfig.experimentTrafficRatio >= 0.01 &&
            draft.trafficConfig.experimentTrafficRatio <= 100
              ? 'PASS'
              : 'ERROR',
          code: 'EXPERIMENT_TRAFFIC_RANGE',
          message:
            draft.trafficConfig.experimentTrafficRatio >= 0.01 &&
            draft.trafficConfig.experimentTrafficRatio <= 100
              ? '实验流量范围合法'
              : '实验流量必须在 0.01%-100% 之间',
          step,
        },
        {
          level: layer ? 'PASS' : 'ERROR',
          code: 'TRAFFIC_LAYER_REQUIRED',
          message: layer ? `已选择${draftTerminalType.value}流量层` : `请选择${draftTerminalType.value}流量层`,
          step,
        },
        {
          level: layer && draft.trafficConfig.experimentTrafficRatio <= layer.availableTrafficRatio ? 'PASS' : 'ERROR',
          code: 'TRAFFIC_LAYER_CAPACITY',
          message:
            layer && draft.trafficConfig.experimentTrafficRatio <= layer.availableTrafficRatio
              ? '实验流量未超过流量层可用比例'
              : '当前可用流量不足，请降低实验流量或选择其他流量层',
          step,
        },
        {
          level: !draft.trafficConfig.useMutex || (mutexDomain && mutexDomain.runningExperimentIds.length === 0) ? 'PASS' : 'ERROR',
          code: 'MUTEX_DOMAIN_AVAILABLE',
          message:
            !draft.trafficConfig.useMutex || (mutexDomain && mutexDomain.runningExperimentIds.length === 0)
              ? '互斥域可用'
              : '该互斥域已有运行中实验，不允许强制加入',
          step,
        },
        {
          level: smoothValid ? 'PASS' : 'ERROR',
          code: 'SMOOTH_DURATION',
          message: smoothValid ? '平滑生效时间合法' : '平滑生效时间必须在 1-1440 分钟之间',
          step,
        },
        {
          level: uniformReady ? 'PASS' : 'ERROR',
          code: 'UNIFORM_DIVERSION_READY',
          message: uniformReady ? '增强分流均匀性状态满足提交要求' : '开启增强分流均匀性后，需先调平成功',
          step,
        },
      )
    }

    if (step === 6) {
      const comparisonCount = Math.max(1, draft.metricIds.length) * Math.max(1, draft.variants.length - 1)
      const configuredTrafficRatio = draft.trafficConfig.experimentTrafficRatio / 100
      const recommendedTrafficRatio = draft.trafficConfig.planningRecommendedTrafficRatio
      const estimatedTrafficInsufficient =
        typeof recommendedTrafficRatio === 'number' && configuredTrafficRatio + 0.0001 < recommendedTrafficRatio
      const mdeTooSmall =
        typeof draft.trafficConfig.planningMdeValue === 'number' && draft.trafficConfig.planningMdeValue < 0.02
      const stableDecisionId =
        draft.diversionConfig.decisionIdType !== 'custom' &&
        ['uid', 'user_id', 'device_id', 'did', 'uuid'].includes(draft.diversionConfig.decisionIdField.trim().toLowerCase())
      const smoothDuration = draft.trafficConfig.smoothDurationMinutes ?? 0
      items.push(
        {
          level: draft.metricIds.length > 0 ? 'PASS' : 'ERROR',
          code: 'METRIC_SNAPSHOT',
          message: draft.metricIds.length > 0 ? '已绑定指标快照' : '请至少选择一个实验指标',
          step,
        },
        {
          level: comparisonCount <= 1 || draft.trafficConfig.multiComparisonCorrection ? 'PASS' : 'WARN',
          code: 'MULTIPLE_COMPARISON_CORRECTION',
          message:
            comparisonCount <= 1 || draft.trafficConfig.multiComparisonCorrection
              ? '多重比较校正已确认'
              : `当前有 ${comparisonCount} 个指标/版本比较，建议启用多重比较校正`,
          step,
        },
        {
          level: mdeTooSmall ? 'WARN' : 'PASS',
          code: 'MDE_TOO_SMALL',
          message: mdeTooSmall ? 'MDE 偏小，建议提高 MDE、延长周期或扩大受众' : 'MDE 阈值处于可评估范围',
          step,
        },
        {
          level: estimatedTrafficInsufficient ? 'WARN' : 'PASS',
          code: 'TRAFFIC_ESTIMATE_SUFFICIENT',
          message: estimatedTrafficInsufficient ? '预计流量低于样本量建议' : '预计流量满足当前样本量建议',
          step,
        },
        {
          level: stableDecisionId ? 'PASS' : 'WARN',
          code: 'DECISION_ID_STABILITY',
          message: stableDecisionId ? '分流 ID 稳定性满足要求' : '建议使用 uid、did、device_id 等稳定分流字段',
          step,
        },
        {
          level: draft.trafficConfig.effectiveMode === 'IMMEDIATE' || (smoothDuration >= 10 && smoothDuration <= 720) ? 'PASS' : 'WARN',
          code: 'SMOOTH_DURATION_SUGGESTION',
          message:
            draft.trafficConfig.effectiveMode === 'IMMEDIATE' || (smoothDuration >= 10 && smoothDuration <= 720)
              ? '平滑生效时间建议已满足'
              : '平滑时间建议控制在 10-720 分钟',
          step,
        },
      )
    }

    const passed = !items.some((item) => item.level === 'ERROR')
    draftChecks.value = [
      ...draftChecks.value.filter((item) => item.step !== step),
      ...items,
    ].sort((left, right) => left.step - right.step)
    persistDraft()
    return { passed, items, message: passed ? '当前步骤已保存' : items.find((item) => item.level === 'ERROR')?.message ?? '当前步骤未通过' }
  }

  function isCreateStepComplete(step: number) {
    const stepChecks = draftChecks.value.filter((item) => item.step === step)
    return stepChecks.length > 0 && !stepChecks.some((item) => item.level === 'ERROR')
  }

  function canOpenCreateStep(step: number) {
    if (step <= currentCreateStep.value) return true
    for (let index = 1; index < step; index += 1) {
      if (!isCreateStepComplete(index)) return false
    }
    return true
  }

  function goToCreateStep(step: number, force = false) {
    const targetStep = Math.min(Math.max(step, 1), 6)
    if (!force && !canOpenCreateStep(targetStep)) {
      return { allowed: false, message: '请先完成当前及前置步骤' }
    }
    currentCreateStep.value = targetStep
    return { allowed: true, message: '已切换步骤' }
  }

  function nextCreateStep() {
    const result = validateCreateStep(currentCreateStep.value)
    if (result.passed) {
      draftDirty.value = false
      goToCreateStep(currentCreateStep.value + 1, true)
    }
    return result
  }

  function previousCreateStep() {
    persistDraft()
    goToCreateStep(currentCreateStep.value - 1, true)
  }

  function changeDraftExperimentType(type: AbExperimentType, clearFollowingConfig = false) {
    if (!clearFollowingConfig) {
      draftExperiment.value.type = type
      syncDraftTrafficDomainForType(type)
      draftChecks.value = draftChecks.value.filter((item) => item.step <= 1)
      persistDraft()
      return
    }
    const defaults = createDefaultExperimentDraft()
    draftExperiment.value = {
      ...draftExperiment.value,
      type,
      variants: cloneDraftValue(defaults.variants),
      paramSchemas: cloneDraftValue(defaults.paramSchemas),
      diversionConfig: cloneDraftValue(defaults.diversionConfig),
      trafficConfig: cloneDraftValue(defaults.trafficConfig),
      specialConfig: cloneDraftValue(defaults.specialConfig),
      metricIds: cloneDraftValue(defaults.metricIds),
      featureIds: [],
    }
    syncDraftTrafficDomainForType(type)
    draftChecks.value = draftChecks.value.filter((item) => item.step <= 1)
    persistDraft()
  }

  function syncDraftTrafficDomainForType(type = draftExperiment.value.type) {
    const terminalType = getTerminalTypeForExperimentType(type)
    const currentLayer = trafficLayers.value.find((layer) => layer.id === draftExperiment.value.trafficConfig.trafficLayerId)
    if (!currentLayer || currentLayer.experimentType !== terminalType) {
      draftExperiment.value.trafficConfig.trafficLayerId =
        trafficLayers.value.find((layer) => layer.experimentType === terminalType)?.id
    }
    const currentDomain = mutexDomainGroups.value
      .flatMap((group) => group.domains.map((domain) => ({ group, domain })))
      .find((item) => item.domain.id === draftExperiment.value.trafficConfig.mutexDomainId)
    if (!currentDomain || currentDomain.group.experimentType !== terminalType) {
      draftExperiment.value.trafficConfig.mutexDomainId = mutexDomainGroups.value
        .find((group) => group.experimentType === terminalType)
        ?.domains.find((domain) => domain.runningExperimentIds.length === 0)?.id
    }
  }

  function rebalanceDraftVariantTraffic() {
    const activeVariants = draftExperiment.value.variants
    if (!activeVariants.length) return
    const baseRatio = Number((100 / activeVariants.length).toFixed(2))
    activeVariants.forEach((variant, index) => {
      variant.trafficRatio =
        index === activeVariants.length - 1 ? Number((100 - baseRatio * (activeVariants.length - 1)).toFixed(2)) : baseRatio
      draftExperiment.value.trafficConfig.variantTrafficRatios[variant.tempId] = variant.trafficRatio
    })
    draftChecks.value = draftChecks.value.filter((item) => item.step !== 3)
  }

  function addDraftVariant() {
    const treatmentCount = draftExperiment.value.variants.filter((variant) => !variant.isControl).length + 1
    const tempId = createDraftTempId('draft_treatment')
    draftExperiment.value.variants.push({
      tempId,
      name: `实验组 ${treatmentCount}`,
      description: '',
      isControl: false,
      trafficRatio: 0,
      params: Object.fromEntries(
        draftExperiment.value.paramSchemas.map((schema) => [schema.key, cloneDraftValue(schema.defaultValue)]),
      ),
      testUserIds: [],
    })
    draftExperiment.value.specialConfig.splitUrl.urls[tempId] = `https://example.com/treatment-${treatmentCount}`
    draftExperiment.value.specialConfig.splitUrl.rules[tempId] = {
      matchType: 'path',
      pattern: `/treatment-${treatmentCount}`,
      caseSensitive: false,
    }
    draftExperiment.value.specialConfig.push.titles[tempId] = `实验组 ${treatmentCount} 推送标题`
    draftExperiment.value.specialConfig.push.contents[tempId] = '填写该版本的推送正文。'
    draftExperiment.value.specialConfig.push.actionUrls[tempId] = 'app://campaign/rewards-v2'
    rebalanceDraftVariantTraffic()
  }

  function copyDraftVariant(tempId: EntityId) {
    const source = draftExperiment.value.variants.find((variant) => variant.tempId === tempId)
    if (!source || draftExperiment.value.variants.length >= 20) return
    const nextTempId = createDraftTempId('draft_variant_copy')
    draftExperiment.value.variants.push({
      ...cloneDraftValue(source),
      tempId: nextTempId,
      name: `${source.name} 副本`,
      isControl: false,
    })
    draftExperiment.value.specialConfig.splitUrl.urls[nextTempId] =
      draftExperiment.value.specialConfig.splitUrl.urls[source.tempId] ?? 'https://example.com/treatment-copy'
    draftExperiment.value.specialConfig.splitUrl.rules[nextTempId] = cloneDraftValue(
      draftExperiment.value.specialConfig.splitUrl.rules[source.tempId] ?? {
        matchType: 'path',
        pattern: '/treatment-copy',
        caseSensitive: false,
      },
    )
    draftExperiment.value.specialConfig.push.titles[nextTempId] =
      draftExperiment.value.specialConfig.push.titles[source.tempId] ?? `${source.name} 副本`
    draftExperiment.value.specialConfig.push.contents[nextTempId] =
      draftExperiment.value.specialConfig.push.contents[source.tempId] ?? ''
    draftExperiment.value.specialConfig.push.actionUrls[nextTempId] =
      draftExperiment.value.specialConfig.push.actionUrls[source.tempId] ?? ''
    rebalanceDraftVariantTraffic()
  }

  function removeDraftVariant(tempId: EntityId) {
    const target = draftExperiment.value.variants.find((variant) => variant.tempId === tempId)
    if (!target || target.isControl) return { removed: false, message: '对照组不可删除' }
    if (draftExperiment.value.variants.filter((variant) => !variant.isControl).length <= 1) {
      return { removed: false, message: '至少保留一个实验组' }
    }
    draftExperiment.value.variants = draftExperiment.value.variants.filter((variant) => variant.tempId !== tempId)
    delete draftExperiment.value.trafficConfig.variantTrafficRatios[tempId]
    delete draftExperiment.value.specialConfig.splitUrl.urls[tempId]
    delete draftExperiment.value.specialConfig.splitUrl.rules[tempId]
    delete draftExperiment.value.specialConfig.push.titles[tempId]
    delete draftExperiment.value.specialConfig.push.contents[tempId]
    delete draftExperiment.value.specialConfig.push.actionUrls[tempId]
    draftExperiment.value.specialConfig.personalization.audiences.forEach((audience) => {
      if (audience.variantTempId === tempId) audience.variantTempId = draftExperiment.value.variants[0]?.tempId
    })
    rebalanceDraftVariantTraffic()
    return { removed: true, message: '实验组已删除' }
  }

  function setDraftControlVariant(tempId: EntityId) {
    draftExperiment.value.variants.forEach((variant) => {
      variant.isControl = variant.tempId === tempId
    })
    draftChecks.value = draftChecks.value.filter((item) => item.step !== 3)
  }

  function addDraftParamSchema() {
    const nextIndex = draftExperiment.value.paramSchemas.length + 1
    const key = `feature_param_${nextIndex}`
    draftExperiment.value.paramSchemas.push({
      tempId: createDraftTempId('draft_param'),
      key,
      name: `功能参数 ${nextIndex}`,
      type: 'STRING',
      required: true,
      defaultValue: '',
      description: '',
    })
    draftExperiment.value.variants.forEach((variant) => {
      variant.params[key] = ''
    })
    draftChecks.value = draftChecks.value.filter((item) => item.step !== 3)
  }

  function copyDraftParamSchema(tempId: EntityId) {
    const source = draftExperiment.value.paramSchemas.find((schema) => schema.tempId === tempId)
    if (!source) return
    let key = `${source.key}_copy`
    let index = 2
    while (draftExperiment.value.paramSchemas.some((schema) => schema.key === key)) {
      key = `${source.key}_copy_${index}`
      index += 1
    }
    const copiedSchema = {
      ...cloneDraftValue(source),
      tempId: createDraftTempId('draft_param_copy'),
      key,
      name: `${source.name} 副本`,
    }
    draftExperiment.value.paramSchemas.push(copiedSchema)
    draftExperiment.value.variants.forEach((variant) => {
      variant.params[key] = cloneDraftValue(variant.params[source.key] ?? source.defaultValue)
    })
    draftChecks.value = draftChecks.value.filter((item) => item.step !== 3)
  }

  function removeDraftParamSchema(tempId: EntityId) {
    const source = draftExperiment.value.paramSchemas.find((schema) => schema.tempId === tempId)
    if (!source) return
    draftExperiment.value.paramSchemas = draftExperiment.value.paramSchemas.filter((schema) => schema.tempId !== tempId)
    draftExperiment.value.variants.forEach((variant) => {
      delete variant.params[source.key]
    })
    draftChecks.value = draftChecks.value.filter((item) => item.step !== 3)
  }

  function renameDraftParamKey(tempId: EntityId, nextKey: string) {
    const schema = draftExperiment.value.paramSchemas.find((item) => item.tempId === tempId)
    if (!schema) return
    const previousKey = schema.key
    schema.key = nextKey
    if (!previousKey || previousKey === nextKey) return
    draftExperiment.value.variants.forEach((variant) => {
      variant.params[nextKey] = variant.params[previousKey]
      delete variant.params[previousKey]
    })
    draftChecks.value = draftChecks.value.filter((item) => item.step !== 3)
  }

  function updateDraftParamType(tempId: EntityId, type: ExperimentDraft['paramSchemas'][number]['type']) {
    const schema = draftExperiment.value.paramSchemas.find((item) => item.tempId === tempId)
    if (!schema) return
    schema.type = type
    schema.defaultValue = parseDraftValueByType(type, schema.defaultValue)
    draftExperiment.value.variants.forEach((variant) => {
      const parsed = parseDraftValueByType(type, variant.params[schema.key])
      variant.params[schema.key] = validateExperimentParamValue(type, parsed, schema.required).valid ? parsed : undefined
    })
    draftChecks.value = draftChecks.value.filter((item) => item.step !== 3)
  }

  function updateDraftParamDefaultValue(tempId: EntityId, value: unknown) {
    const schema = draftExperiment.value.paramSchemas.find((item) => item.tempId === tempId)
    if (!schema) return
    schema.defaultValue = parseDraftValueByType(schema.type, value)
    draftChecks.value = draftChecks.value.filter((item) => item.step !== 3)
  }

  function copyControlParamToTreatments(paramKey: string) {
    const control = draftExperiment.value.variants.find((variant) => variant.isControl)
    if (!control) return
    draftExperiment.value.variants.forEach((variant) => {
      if (!variant.isControl) variant.params[paramKey] = cloneDraftValue(control.params[paramKey])
    })
    draftChecks.value = draftChecks.value.filter((item) => item.step !== 3)
  }

  function clearDraftParamValue(variantTempId: EntityId, paramKey: string) {
    const variant = draftExperiment.value.variants.find((item) => item.tempId === variantTempId)
    if (!variant) return
    variant.params[paramKey] = undefined
    draftChecks.value = draftChecks.value.filter((item) => item.step !== 3)
  }

  function restoreDraftParamDefault(variantTempId: EntityId, paramKey: string) {
    const variant = draftExperiment.value.variants.find((item) => item.tempId === variantTempId)
    const schema = draftExperiment.value.paramSchemas.find((item) => item.key === paramKey)
    if (!variant || !schema) return
    variant.params[paramKey] = cloneDraftValue(schema.defaultValue)
    draftChecks.value = draftChecks.value.filter((item) => item.step !== 3)
  }

  function formatDraftJsonParam(variantTempId: EntityId, paramKey: string) {
    const variant = draftExperiment.value.variants.find((item) => item.tempId === variantTempId)
    if (!variant) return { success: false, message: '未找到版本' }
    try {
      const value = typeof variant.params[paramKey] === 'string' ? JSON.parse(String(variant.params[paramKey])) : variant.params[paramKey]
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return { success: false, message: 'Json 参数顶层必须是对象' }
      }
      variant.params[paramKey] = value
      draftChecks.value = draftChecks.value.filter((item) => item.step !== 3)
      return { success: true, message: 'JSON 已格式化' }
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'JSON 格式错误' }
    }
  }

  function addMvtElement() {
    const index = draftExperiment.value.specialConfig.mvt.elements.length + 1
    draftExperiment.value.specialConfig.mvt.elements.push({
      id: createDraftTempId('mvt_element'),
      name: `实验元素 ${index}`,
      variants: ['默认', '方案 A'],
    })
    draftChecks.value = draftChecks.value.filter((item) => item.step !== 3)
  }

  function removeMvtElement(elementId: EntityId) {
    draftExperiment.value.specialConfig.mvt.elements = draftExperiment.value.specialConfig.mvt.elements.filter(
      (element) => element.id !== elementId,
    )
    draftChecks.value = draftChecks.value.filter((item) => item.step !== 3)
  }

  function addMvtElementVariant(elementId: EntityId) {
    const element = draftExperiment.value.specialConfig.mvt.elements.find((item) => item.id === elementId)
    if (!element) return
    element.variants.push(`方案 ${element.variants.length + 1}`)
    draftChecks.value = draftChecks.value.filter((item) => item.step !== 3)
  }

  function removeMvtElementVariant(elementId: EntityId, index: number) {
    const element = draftExperiment.value.specialConfig.mvt.elements.find((item) => item.id === elementId)
    if (!element || element.variants.length <= 1) return
    element.variants.splice(index, 1)
    draftChecks.value = draftChecks.value.filter((item) => item.step !== 3)
  }

  function addPersonalizationAudience() {
    const index = draftExperiment.value.specialConfig.personalization.audiences.length + 1
    draftExperiment.value.specialConfig.personalization.audiences.push({
      id: createDraftTempId('personal_audience'),
      name: `个性化人群 ${index}`,
      rule: 'city in 北京/上海',
      variantTempId: draftExperiment.value.variants.find((variant) => !variant.isControl)?.tempId,
      priority: index,
      holdoutRatio: 5,
    })
    draftChecks.value = draftChecks.value.filter((item) => item.step !== 3)
  }

  function removePersonalizationAudience(audienceId: EntityId) {
    draftExperiment.value.specialConfig.personalization.audiences =
      draftExperiment.value.specialConfig.personalization.audiences.filter((audience) => audience.id !== audienceId)
    draftChecks.value = draftChecks.value.filter((item) => item.step !== 3)
  }

  function addVisualElement() {
    const index = draftExperiment.value.specialConfig.visual.elements.length + 1
    const id = createDraftTempId('visual_element')
    draftExperiment.value.specialConfig.visual.elements.push({
      id,
      name: `可视化元素 ${index}`,
      selector: `#element-${index}`,
      variantTempId: draftExperiment.value.variants.find((variant) => !variant.isControl)?.tempId ?? 'draft_treatment_1',
      property: 'text',
      originalValue: '原始内容',
      newValue: '实验内容',
    })
    draftExperiment.value.specialConfig.visual.selectedElementId = id
    draftChecks.value = draftChecks.value.filter((item) => item.step !== 3)
  }

  function removeVisualElement(elementId: EntityId) {
    draftExperiment.value.specialConfig.visual.elements = draftExperiment.value.specialConfig.visual.elements.filter(
      (element) => element.id !== elementId,
    )
    if (draftExperiment.value.specialConfig.visual.selectedElementId === elementId) {
      draftExperiment.value.specialConfig.visual.selectedElementId =
        draftExperiment.value.specialConfig.visual.elements[0]?.id
    }
    draftChecks.value = draftChecks.value.filter((item) => item.step !== 3)
  }

  function addAdAsset() {
    const index = draftExperiment.value.specialConfig.ad.assets.length + 1
    draftExperiment.value.specialConfig.ad.assets.push({
      id: createDraftTempId('ad_asset'),
      name: `广告资产 ${index}`,
      type: 'IMAGE',
      reviewStatus: 'DRAFT',
    })
    draftChecks.value = draftChecks.value.filter((item) => item.step !== 3)
  }

  function removeAdAsset(assetId: EntityId) {
    draftExperiment.value.specialConfig.ad.assets = draftExperiment.value.specialConfig.ad.assets.filter(
      (asset) => asset.id !== assetId,
    )
    draftChecks.value = draftChecks.value.filter((item) => item.step !== 3)
  }

  function addAudienceGroup() {
    draftExperiment.value.diversionConfig.filter.groups.push({
      id: createDraftTempId('audience_group'),
      relation: 'AND',
      conditions: [
        {
          id: createDraftTempId('audience_condition'),
          source: 'user',
          field: 'city',
          operator: 'in',
          value: ['北京', '上海'],
          requiredInRequest: true,
        },
      ],
    })
    audienceEstimate.value.status = 'idle'
    draftChecks.value = draftChecks.value.filter((item) => item.step !== 4)
  }

  function removeAudienceGroup(groupId: EntityId) {
    if (draftExperiment.value.diversionConfig.filter.groups.length <= 1) return
    draftExperiment.value.diversionConfig.filter.groups = draftExperiment.value.diversionConfig.filter.groups.filter(
      (group) => group.id !== groupId,
    )
    audienceEstimate.value.status = 'idle'
    draftChecks.value = draftChecks.value.filter((item) => item.step !== 4)
  }

  function addAudienceCondition(groupId: EntityId) {
    const group = draftExperiment.value.diversionConfig.filter.groups.find((item) => item.id === groupId)
    if (!group) return
    group.conditions.push({
      id: createDraftTempId('audience_condition'),
      source: 'user',
      field: 'city',
      operator: 'in',
      value: ['北京', '上海'],
      requiredInRequest: true,
    })
    audienceEstimate.value.status = 'idle'
    draftChecks.value = draftChecks.value.filter((item) => item.step !== 4)
  }

  function removeAudienceCondition(groupId: EntityId, conditionId: EntityId) {
    const group = draftExperiment.value.diversionConfig.filter.groups.find((item) => item.id === groupId)
    if (!group || group.conditions.length <= 1) return
    group.conditions = group.conditions.filter((condition) => condition.id !== conditionId)
    audienceEstimate.value.status = 'idle'
    draftChecks.value = draftChecks.value.filter((item) => item.step !== 4)
  }

  function findDraftAudienceCondition(conditionId: EntityId): AudienceCondition | undefined {
    return draftExperiment.value.diversionConfig.filter.groups
      .flatMap((group) => group.conditions)
      .find((condition) => condition.id === conditionId)
  }

  function updateAudienceConditionSource(conditionId: EntityId, source: AudienceConditionSource) {
    const condition = findDraftAudienceCondition(conditionId)
    const firstField = audienceFieldOptions[source][0]
    if (!condition || !firstField) return
    condition.source = source
    condition.field = firstField.value
    condition.value = firstField.valueType === 'number' ? 0 : ['list'].includes(firstField.valueType) ? [] : ''
    audienceEstimate.value.status = 'idle'
    draftChecks.value = draftChecks.value.filter((item) => item.step !== 4)
  }

  function updateAudienceConditionField(conditionId: EntityId, field: string) {
    const condition = findDraftAudienceCondition(conditionId)
    if (!condition) return
    const option = audienceFieldOptions[condition.source].find((item) => item.value === field)
    condition.field = field
    condition.value = option?.valueType === 'number' ? 0 : option?.valueType === 'list' ? [] : ''
    audienceEstimate.value.status = 'idle'
    draftChecks.value = draftChecks.value.filter((item) => item.step !== 4)
  }

  function updateAudienceConditionOperator(conditionId: EntityId, operator: AudienceOperator) {
    const condition = findDraftAudienceCondition(conditionId)
    if (!condition) return
    condition.operator = operator
    if (operator === 'is_null' || operator === 'is_not_null') condition.value = undefined
    audienceEstimate.value.status = 'idle'
    draftChecks.value = draftChecks.value.filter((item) => item.step !== 4)
  }

  function updateAudienceConditionValue(conditionId: EntityId, value: string) {
    const condition = findDraftAudienceCondition(conditionId)
    if (!condition) return
    condition.value = normalizeAudienceValue(condition.operator, value)
    audienceEstimate.value.status = 'idle'
    draftChecks.value = draftChecks.value.filter((item) => item.step !== 4)
  }

  async function estimateDraftAudience() {
    const conditions = draftExperiment.value.diversionConfig.filter.groups.flatMap((group) => group.conditions)
    audienceEstimate.value = {
      status: 'running',
      estimatedUsers: 0,
      filterRatio: 0,
      message: '正在预估受众规模',
    }
    await new Promise((resolve) => setTimeout(resolve, 280))
    const baseUsers = trafficCalculator.value.estimatedTotalUsers
    const conditionPenalty = Math.min(0.72, conditions.length * 0.09)
    const segmentBoost = conditions.some((condition) => condition.source === 'user' && condition.field === 'city') ? 0.08 : 0
    const filterRatio = Number(Math.max(0.08, 0.86 - conditionPenalty + segmentBoost).toFixed(2))
    audienceEstimate.value = {
      status: 'success',
      estimatedUsers: Math.round(baseUsers * filterRatio),
      filterRatio,
      message: `已按 ${conditions.length} 个条件完成预估`,
    }
    return audienceEstimate.value
  }

  function resetTrafficLayerDraft() {
    trafficLayerDraft.value = {
      id: '',
      name: `${draftTerminalType.value === 'CLIENT' ? '客户端' : '服务端'}实验层`,
      description: '用于承载同类实验的公共流量层。',
      experimentType: draftTerminalType.value,
      totalTrafficRatio: 100,
    }
  }

  function editTrafficLayer(layerId: EntityId) {
    const layer = trafficLayers.value.find((item) => item.id === layerId)
    if (!layer) return
    trafficLayerDraft.value = {
      id: layer.id,
      name: layer.name,
      description: layer.description ?? '',
      experimentType: layer.experimentType,
      totalTrafficRatio: layer.totalTrafficRatio,
    }
  }

  function saveTrafficLayerDraft() {
    const createdAt = new Date().toISOString()
    if (!trafficLayerDraft.value.name.trim()) return { success: false, message: '请填写流量层名称' }
    if (trafficLayerDraft.value.totalTrafficRatio <= 0 || trafficLayerDraft.value.totalTrafficRatio > 100) {
      return { success: false, message: '流量层总流量需在 1%-100% 之间' }
    }
    const existingIndex = trafficLayers.value.findIndex((layer) => layer.id === trafficLayerDraft.value.id)
    if (existingIndex >= 0) {
      const existing = trafficLayers.value[existingIndex]
      const usedTrafficRatio = existing?.usedTrafficRatio ?? 0
      if (trafficLayerDraft.value.totalTrafficRatio < usedTrafficRatio) {
        return { success: false, message: '总流量不能小于已用流量' }
      }
      trafficLayers.value.splice(existingIndex, 1, {
        ...existing!,
        name: trafficLayerDraft.value.name.trim(),
        description: trafficLayerDraft.value.description.trim(),
        experimentType: trafficLayerDraft.value.experimentType,
        totalTrafficRatio: trafficLayerDraft.value.totalTrafficRatio,
        availableTrafficRatio: trafficLayerDraft.value.totalTrafficRatio - usedTrafficRatio,
        updatedAt: createdAt,
      })
      return { success: true, message: '流量层已更新' }
    }

    const layer: TrafficLayer = {
      id: createDraftTempId('layer'),
      appId: draftExperiment.value.appId,
      name: trafficLayerDraft.value.name.trim(),
      description: trafficLayerDraft.value.description.trim(),
      ownerId: permissionContext.value.userId,
      experimentType: trafficLayerDraft.value.experimentType,
      totalTrafficRatio: trafficLayerDraft.value.totalTrafficRatio,
      usedTrafficRatio: 0,
      availableTrafficRatio: trafficLayerDraft.value.totalTrafficRatio,
      usingExperimentIds: [],
      createdAt,
      updatedAt: createdAt,
    }
    trafficLayers.value.unshift(layer)
    draftExperiment.value.trafficConfig.trafficLayerId = layer.id
    resetTrafficLayerDraft()
    return { success: true, message: '流量层已创建并选中' }
  }

  function deleteTrafficLayer(layerId: EntityId) {
    const layer = trafficLayers.value.find((item) => item.id === layerId)
    if (!layer) return { success: false, message: '流量层不存在' }
    if (layer.usedTrafficRatio > 0 || layer.usingExperimentIds.length > 0) {
      return { success: false, message: '已有实验占用的流量层不可删除' }
    }
    trafficLayers.value = trafficLayers.value.filter((item) => item.id !== layerId)
    if (draftExperiment.value.trafficConfig.trafficLayerId === layerId) {
      draftExperiment.value.trafficConfig.trafficLayerId = compatibleTrafficLayers.value[0]?.id
    }
    return { success: true, message: '流量层已删除' }
  }

  function resetMutexGroupDraft() {
    mutexGroupDraft.value = {
      id: '',
      name: `${draftTerminalType.value === 'CLIENT' ? '客户端' : '服务端'}互斥域组`,
      description: '承载强相关实验互斥。',
      experimentType: draftTerminalType.value,
    }
  }

  function editMutexGroup(groupId: EntityId) {
    const group = mutexDomainGroups.value.find((item) => item.id === groupId)
    if (!group) return
    mutexGroupDraft.value = {
      id: group.id,
      name: group.name,
      description: group.description ?? '',
      experimentType: group.experimentType,
    }
  }

  function saveMutexGroupDraft() {
    const now = new Date().toISOString()
    if (!mutexGroupDraft.value.name.trim()) return { success: false, message: '请填写互斥域组名称' }
    const existingIndex = mutexDomainGroups.value.findIndex((group) => group.id === mutexGroupDraft.value.id)
    if (existingIndex >= 0) {
      const existing = mutexDomainGroups.value[existingIndex]
      mutexDomainGroups.value.splice(existingIndex, 1, {
        ...existing!,
        name: mutexGroupDraft.value.name.trim(),
        description: mutexGroupDraft.value.description.trim(),
        experimentType: mutexGroupDraft.value.experimentType,
        updatedAt: now,
      })
      return { success: true, message: '互斥域组已更新' }
    }
    const group: MutexDomainGroup = {
      id: createDraftTempId('mutex_group'),
      appId: draftExperiment.value.appId,
      name: mutexGroupDraft.value.name.trim(),
      description: mutexGroupDraft.value.description.trim(),
      ownerId: permissionContext.value.userId,
      experimentType: mutexGroupDraft.value.experimentType,
      domains: [],
      createdAt: now,
      updatedAt: now,
    }
    mutexDomainGroups.value.unshift(group)
    mutexDomainDraft.value.groupId = group.id
    resetMutexGroupDraft()
    return { success: true, message: '互斥域组已创建' }
  }

  function deleteMutexGroup(groupId: EntityId) {
    const group = mutexDomainGroups.value.find((item) => item.id === groupId)
    if (!group) return { success: false, message: '互斥域组不存在' }
    if (group.domains.some((domain) => domain.runningExperimentIds.length > 0)) {
      return { success: false, message: '存在运行中实验的互斥域组不可删除' }
    }
    mutexDomainGroups.value = mutexDomainGroups.value.filter((item) => item.id !== groupId)
    return { success: true, message: '互斥域组已删除' }
  }

  function editMutexDomain(groupId: EntityId, domainId: EntityId) {
    const group = mutexDomainGroups.value.find((item) => item.id === groupId)
    const domain = group?.domains.find((item) => item.id === domainId)
    if (!group || !domain) return
    mutexDomainDraft.value = {
      groupId: group.id,
      id: domain.id,
      name: domain.name,
      trafficRatio: domain.trafficRatio,
    }
  }

  function resetMutexDomainDraft(groupId = compatibleMutexDomainGroups.value[0]?.id ?? '') {
    mutexDomainDraft.value = {
      groupId,
      id: '',
      name: '新建互斥域',
      trafficRatio: 20,
    }
  }

  function saveMutexDomainDraft() {
    const group = mutexDomainGroups.value.find((item) => item.id === mutexDomainDraft.value.groupId)
    if (!group) return { success: false, message: '请选择互斥域组' }
    if (!mutexDomainDraft.value.name.trim()) return { success: false, message: '请填写互斥域名称' }
    if (mutexDomainDraft.value.trafficRatio <= 0 || mutexDomainDraft.value.trafficRatio > 100) {
      return { success: false, message: '互斥域流量需在 1%-100% 之间' }
    }
    const now = new Date().toISOString()
    const otherDomains = group.domains.filter((domain) => domain.id !== mutexDomainDraft.value.id)
    const otherTraffic = otherDomains.reduce((sum, domain) => sum + domain.trafficRatio, 0)
    if (otherTraffic + mutexDomainDraft.value.trafficRatio > 100) {
      return { success: false, message: '同一互斥域组下域流量合计不能超过 100%' }
    }
    const existingIndex = group.domains.findIndex((domain) => domain.id === mutexDomainDraft.value.id)
    if (existingIndex >= 0) {
      const existing = group.domains[existingIndex]
      group.domains.splice(existingIndex, 1, {
        ...existing!,
        name: mutexDomainDraft.value.name.trim(),
        trafficRatio: mutexDomainDraft.value.trafficRatio,
        updatedAt: now,
      })
      group.updatedAt = now
      return { success: true, message: '互斥域已更新' }
    }

    const domain: MutexDomain = {
      id: createDraftTempId('mutex'),
      groupId: group.id,
      name: mutexDomainDraft.value.name.trim(),
      trafficRatio: mutexDomainDraft.value.trafficRatio,
      childDomainIds: [],
      trafficLayerIds: [],
      runningExperimentIds: [],
      createdAt: now,
      updatedAt: now,
    }
    group.domains.push(domain)
    group.updatedAt = now
    draftExperiment.value.trafficConfig.mutexDomainId = domain.id
    resetMutexDomainDraft(group.id)
    return { success: true, message: '互斥域已创建并选中' }
  }

  function deleteMutexDomain(groupId: EntityId, domainId: EntityId) {
    const group = mutexDomainGroups.value.find((item) => item.id === groupId)
    const domain = group?.domains.find((item) => item.id === domainId)
    if (!group || !domain) return { success: false, message: '互斥域不存在' }
    if (domain.runningExperimentIds.length > 0) return { success: false, message: '运行中实验占用的互斥域不可删除' }
    group.domains = group.domains.filter((item) => item.id !== domainId)
    group.updatedAt = new Date().toISOString()
    if (draftExperiment.value.trafficConfig.mutexDomainId === domainId) {
      draftExperiment.value.trafficConfig.mutexDomainId = group.domains.find((item) => !item.runningExperimentIds.length)?.id
    }
    return { success: true, message: '互斥域已删除' }
  }

  function appendUniformTaskLog(message: string) {
    uniformTaskDetail.value.logs.unshift({
      id: createDraftTempId('rerand_log'),
      message,
      createdAt: new Date().toISOString(),
    })
  }

  function resetUniformResultForConfigChange(message = '调平配置已变更，结果待重新计算') {
    const config = draftExperiment.value.trafficConfig
    if (config.uniformConfigLocked) return { success: false, message: '调平结果已锁定，请先取消应用结果后再修改' }
    config.uniformStatus = 'NOT_STARTED'
    config.uniformTaskId = undefined
    config.uniformResultApplied = false
    config.uniformFailureReason = undefined
    uniformTaskDetail.value = {
      status: 'NOT_STARTED',
      progress: 0,
      runTimes: 0,
      maxRunTimes: config.uniformMaxRunTimes,
      pValueThreshold: config.uniformPValueThreshold,
      metricResults: [],
      segmentResults: [],
      logs: [
        {
          id: createDraftTempId('rerand_log'),
          message,
          createdAt: new Date().toISOString(),
        },
      ],
      locked: false,
    }
    draftChecks.value = draftChecks.value.filter((item) => item.step !== 5)
    persistDraft()
    return { success: true, message }
  }

  function updateUniformMetricIds(metricIds: EntityId[]) {
    if (uniformConfigLocked.value) return { success: false, message: '调平任务状态已锁定，暂不可修改指标' }
    const limitedMetricIds = metricIds.slice(0, 3)
    draftExperiment.value.trafficConfig.uniformMetricIds = limitedMetricIds
    resetUniformResultForConfigChange('调平指标已更新')
    return {
      success: metricIds.length <= 3,
      message: metricIds.length > 3 ? '调平指标最多选择 3 个，已自动保留前 3 个' : '调平指标已更新',
    }
  }

  function updateUniformSegmentIds(segmentIds: EntityId[]) {
    if (uniformConfigLocked.value) return { success: false, message: '调平任务状态已锁定，暂不可修改人群' }
    draftExperiment.value.trafficConfig.uniformSegmentIds = segmentIds
    resetUniformResultForConfigChange('调平人群已更新')
    return { success: true, message: '调平人群已更新' }
  }

  function setUniformDiversionEnabled(enabled: boolean) {
    if (uniformConfigLocked.value && !enabled) return { success: false, message: '已应用调平结果，需先取消应用结果' }
    draftExperiment.value.trafficConfig.uniformDiversionEnabled = enabled
    resetUniformResultForConfigChange(enabled ? '增强分流均匀性已启用' : '增强分流均匀性已关闭')
    if (!enabled) draftExperiment.value.trafficConfig.uniformStatus = 'CANCELED'
    persistDraft()
    return { success: true, message: enabled ? '增强分流均匀性已启用' : '增强分流均匀性已关闭' }
  }

  function updateUniformDiversionMode(mode: 'METRIC' | 'SEGMENT') {
    if (uniformConfigLocked.value) return { success: false, message: '调平任务状态已锁定，暂不可修改模式' }
    draftExperiment.value.trafficConfig.uniformDiversionMode = mode
    resetUniformResultForConfigChange('调平模式已更新')
    return { success: true, message: '调平模式已更新' }
  }

  async function runUniformDiversionTask() {
    const config = draftExperiment.value.trafficConfig
    if (!config.uniformDiversionEnabled) return { success: false, message: '请先启用增强分流均匀性' }
    if (uniformConfigLocked.value && config.uniformStatus !== 'FAILED') {
      return { success: false, message: '调平结果已锁定，如需重新调平请先取消应用结果' }
    }
    const hasBalanceTarget =
      config.uniformDiversionMode === 'SEGMENT'
        ? config.uniformSegmentIds.length > 0
        : config.uniformMetricIds.length > 0 && config.uniformMetricIds.length <= 3
    const hasDateRange = Boolean(config.uniformDateRange?.startDate && config.uniformDateRange?.endDate)
    if (!hasBalanceTarget || !hasDateRange) {
      config.uniformStatus = 'FAILED'
      config.uniformFailureReason = !hasBalanceTarget ? '请补全指标/人群调平目标' : '请补全历史窗口'
      uniformTaskDetail.value = {
        status: 'FAILED',
        progress: 100,
        runTimes: 0,
        maxRunTimes: config.uniformMaxRunTimes,
        pValueThreshold: config.uniformPValueThreshold,
        metricResults: [],
        segmentResults: [],
        logs: [
          {
            id: createDraftTempId('rerand_log'),
            message: config.uniformFailureReason,
            createdAt: new Date().toISOString(),
          },
        ],
        failureReason: config.uniformFailureReason,
        locked: false,
      }
      persistDraft()
      return { success: false, message: config.uniformFailureReason }
    }
    uniformTaskRunning.value = true
    config.uniformStatus = 'RUNNING'
    config.uniformTaskId = createDraftTempId('rerand')
    config.uniformResultApplied = false
    config.uniformConfigLocked = false
    config.uniformFailureReason = undefined
    uniformTaskDetail.value = {
      taskId: config.uniformTaskId,
      status: 'RUNNING',
      progress: 35,
      runTimes: Math.min(config.uniformMaxRunTimes, 12 + config.uniformMetricIds.length * 4 + config.uniformSegmentIds.length * 3),
      maxRunTimes: config.uniformMaxRunTimes,
      pValueThreshold: config.uniformPValueThreshold,
      metricResults: [],
      segmentResults: [],
      logs: [],
      locked: false,
    }
    appendUniformTaskLog('调平任务已提交，等待异步任务队列计算')
    draftChecks.value = draftChecks.value.filter((item) => item.step !== 5)
    persistDraft()
    await new Promise((resolve) => setTimeout(resolve, 380))
    const metricResults = (config.uniformDiversionMode === 'METRIC' ? config.uniformMetricIds : []).map((metricId, index) => {
      const pValue = Number((config.uniformPValueThreshold + 0.018 + index * 0.012).toFixed(3))
      return {
        metricId,
        metricName: metrics.value.find((metric) => metric.id === metricId)?.name ?? metricId,
        pValue,
        passed: pValue >= config.uniformPValueThreshold,
      }
    })
    const segmentResults = (config.uniformDiversionMode === 'SEGMENT' ? config.uniformSegmentIds : []).map((segmentId, index) => {
      const pValue = Number((config.uniformPValueThreshold + 0.015 + index * 0.01).toFixed(3))
      return {
        segmentId,
        segmentName: segmentOptions.find((segment) => segment.id === segmentId)?.name ?? segmentId,
        sampleSize: segmentOptions.find((segment) => segment.id === segmentId)?.estimatedUsers ?? 0,
        pValue,
        passed: pValue >= config.uniformPValueThreshold,
      }
    })
    const allPassed = [...metricResults, ...segmentResults].every((item) => item.passed)
    config.uniformStatus = allPassed ? 'SUCCESS' : 'FAILED'
    config.uniformFailureReason = allPassed ? undefined : '存在指标或人群 P 值低于阈值'
    uniformTaskDetail.value = {
      ...uniformTaskDetail.value,
      status: config.uniformStatus,
      progress: 100,
      metricResults,
      segmentResults,
      minPValue: Math.min(...[...metricResults, ...segmentResults].map((item) => item.pValue)),
      balanceScore: Number((Math.min(99, 88 + metricResults.length * 2 + segmentResults.length)).toFixed(1)),
      failureReason: config.uniformFailureReason,
    }
    appendUniformTaskLog(
      config.uniformStatus === 'SUCCESS' ? '调平完成，所有目标达到 P 值阈值' : (config.uniformFailureReason ?? '调平失败'),
    )
    uniformTaskRunning.value = false
    persistDraft()
    return {
      success: config.uniformStatus === 'SUCCESS',
      message: config.uniformStatus === 'SUCCESS' ? '调平任务已完成，分流均匀性满足要求' : '调平失败，请查看详情后重新调平',
    }
  }

  function cancelUniformDiversionTask() {
    uniformTaskRunning.value = false
    const config = draftExperiment.value.trafficConfig
    config.uniformStatus = 'CANCELED'
    config.uniformFailureReason = '任务已取消'
    uniformTaskDetail.value.status = 'CANCELED'
    uniformTaskDetail.value.progress = 100
    uniformTaskDetail.value.failureReason = '任务已取消'
    appendUniformTaskLog('调平任务已取消')
    draftChecks.value = draftChecks.value.filter((item) => item.step !== 5)
    persistDraft()
    return { message: '调平任务已取消' }
  }

  function applyUniformDiversionResult() {
    const config = draftExperiment.value.trafficConfig
    if (config.uniformStatus !== 'SUCCESS') return { success: false, message: '只有调平成功后才能应用结果' }
    config.uniformResultApplied = true
    config.uniformConfigLocked = true
    uniformTaskDetail.value = {
      ...uniformTaskDetail.value,
      appliedAt: new Date().toISOString(),
      locked: true,
    }
    appendUniformTaskLog('调平结果已应用，配置进入锁定状态')
    persistDraft()
    return { success: true, message: '调平结果已应用并锁定' }
  }

  function unlockUniformDiversionConfig() {
    const config = draftExperiment.value.trafficConfig
    config.uniformResultApplied = false
    config.uniformConfigLocked = false
    config.uniformStatus = 'NOT_STARTED'
    config.uniformTaskId = undefined
    uniformTaskDetail.value = {
      status: 'NOT_STARTED',
      progress: 0,
      runTimes: 0,
      maxRunTimes: config.uniformMaxRunTimes,
      pValueThreshold: config.uniformPValueThreshold,
      metricResults: [],
      segmentResults: [],
      logs: [
        {
          id: createDraftTempId('rerand_log'),
          message: '已取消应用结果，可重新修改配置并调平',
          createdAt: new Date().toISOString(),
        },
      ],
      locked: false,
    }
    draftChecks.value = draftChecks.value.filter((item) => item.step !== 5)
    persistDraft()
    return { success: true, message: '已取消应用结果，可重新调平' }
  }

  async function submitDraftForDebug() {
    draftSubmitting.value = true
    draftSubmitMessage.value = null
    try {
      const result = await abTestingService.submitExperimentForDebug(draftExperiment.value)
      draftChecks.value = result.validation.items
      draftSubmitMessage.value = result.message
      if (result.experiment) {
        lastCreatedExperimentId.value = result.experiment.id
        selectedExperimentId.value = result.experiment.id
        selectedReportExperimentId.value = result.experiment.id
        await loadWorkspace()
        selectedExperimentId.value = result.experiment.id
        selectedReportExperimentId.value = result.experiment.id
        persistSelections()
        getStorage()?.removeItem(draftStorageKey)
      }
      return result
    } finally {
      draftSubmitting.value = false
    }
  }

  async function refreshMetricDomain() {
    const [groupPayload, metricPayload, templatePayload, alarmPayload, receiverPayload, mustSeePayload, logPayload] =
      await Promise.all([
        abTestingService.getMetricGroups(),
        abTestingService.getMetrics(),
        abTestingService.getMetricTemplates(),
        abTestingService.getAlarmTasks(),
        abTestingService.getReceiverGroups(),
        abTestingService.getMustSeeMetricTrends(),
        abTestingService.getOperationLogs(),
      ])
    metricGroups.value = groupPayload
    metrics.value = metricPayload
    metricTemplates.value = templatePayload
    alarmTasks.value = alarmPayload
    receiverGroups.value = receiverPayload
    mustSeeTrends.value = mustSeePayload
    operationLogs.value = logPayload
    if (!metricGroups.value.some((group) => group.id === selectedMetricGroupId.value)) {
      selectedMetricGroupId.value = metricGroups.value[0]?.id ?? ''
    }
  }

  async function createMetricGroup() {
    const result = await abTestingService.createMetricGroup(metricGroupDraft.value)
    selectedMetricGroupId.value = result.group.id
    await refreshMetricDomain()
    return result
  }

  async function copyMetricGroup(groupId = selectedMetricGroupId.value) {
    const result = await abTestingService.copyMetricGroup(groupId)
    if (result.group) selectedMetricGroupId.value = result.group.id
    await refreshMetricDomain()
    return result
  }

  async function mergeMetricGroups() {
    const result = await abTestingService.mergeMetricGroups(metricGroupMergeIds.value)
    if (result.group) selectedMetricGroupId.value = result.group.id
    await refreshMetricDomain()
    return result
  }

  async function offlineMetricGroup(groupId = selectedMetricGroupId.value) {
    const result = await abTestingService.offlineMetricGroup(groupId)
    await refreshMetricDomain()
    return result
  }

  async function toggleMetricMustSee(metricId: EntityId, isMustSee: boolean) {
    const result = await abTestingService.toggleMetricMustSee(metricId, isMustSee)
    await refreshMetricDomain()
    return result
  }

  function applyMustSeeMetricsToDraft() {
    draftExperiment.value.metricIds = [
      ...new Set([...draftExperiment.value.metricIds, ...mustSeeMetrics.value.map((metric) => metric.id)]),
    ]
    draftChecks.value = []
    persistDraft()
  }

  async function runTrafficCalculator() {
    trafficRecommendation.value = await abTestingService.calculateTraffic(trafficCalculator.value)
    draftExperiment.value.trafficConfig.planningEstimatedUsers = trafficCalculator.value.estimatedTotalUsers
    draftExperiment.value.trafficConfig.planningMdeValue = trafficCalculator.value.mdeValue
    draftExperiment.value.trafficConfig.planningPower = 0.8
    draftExperiment.value.trafficConfig.planningAlpha = 0.05
    draftExperiment.value.trafficConfig.planningTrafficFilterRatio = trafficCalculator.value.trafficFilterRatio
    draftExperiment.value.trafficConfig.planningRecommendedTrafficRatio =
      trafficRecommendation.value.recommendedTrafficRatio
    persistDraft()
    return trafficRecommendation.value
  }

  async function refreshFeatureDomain() {
    const [featurePayload, versionPayload, publishPayload, whitelistPayload, logPayload, summaryPayload] =
      await Promise.all([
        abTestingService.getFeatureFlags(),
        abTestingService.getFeatureVersions(),
        abTestingService.getPublishPlans(),
        abTestingService.getWhitelistTests(),
        abTestingService.getOperationLogs(),
        abTestingService.getWorkspaceSummary(),
      ])
    featureFlags.value = featurePayload
    featureVersions.value = versionPayload
    publishPlans.value = publishPayload
    whitelistTests.value = whitelistPayload
    operationLogs.value = logPayload
    summary.value = summaryPayload
    if (!featureFlags.value.some((feature) => feature.featureId === selectedFeatureId.value)) {
      selectedFeatureId.value = featureFlags.value[0]?.featureId ?? ''
    }
    syncSelectedFeatureDrafts()
  }

  async function createFeatureFlag() {
    const result = await abTestingService.createFeatureFlag(featureDraft.value)
    if (result.feature) selectedFeatureId.value = result.feature.featureId
    await refreshFeatureDomain()
    return result
  }

  async function createFeatureVersion() {
    if (!selectedFeatureId.value) return { message: '请选择 Feature' }
    const result = await abTestingService.createFeatureVersion(selectedFeatureId.value, featureVersionDraft.value)
    if (result.version) featurePublishDraft.value.versionId = result.version.versionId
    await refreshFeatureDomain()
    return result
  }

  async function publishSelectedFeatureVersion() {
    if (!selectedFeatureId.value) return { message: '请选择 Feature' }
    const payload: FeaturePublishRequest = {
      ...featurePublishDraft.value,
      scheduledAt:
        featurePublishDraft.value.publishType === 'scheduled' && featurePublishDraft.value.scheduledAt
          ? featurePublishDraft.value.scheduledAt
          : undefined,
    }
    const result = await abTestingService.publishFeatureVersion(selectedFeatureId.value, payload)
    await refreshFeatureDomain()
    return result
  }

  async function rollbackSelectedFeature() {
    if (!selectedFeatureId.value) return { message: '请选择 Feature' }
    const result = await abTestingService.rollbackFeature(
      selectedFeatureId.value,
      featurePublishDraft.value.versionId || undefined,
    )
    await refreshFeatureDomain()
    return result
  }

  async function createWhitelistTest() {
    if (!selectedFeatureId.value) return { message: '请选择 Feature' }
    const ruleId = selectedCurrentFeatureVersion.value?.defaultRule.ruleId ?? 'else'
    whitelistDraft.value.ruleUserIds = {
      [ruleId]: whitelistUserIdsText.value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    }
    const result = await abTestingService.createWhitelistTest(selectedFeatureId.value, whitelistDraft.value)
    await refreshFeatureDomain()
    return result
  }

  async function changeSelectedFeatureLifecycle(action: FeatureLifecycleAction) {
    if (!selectedFeatureId.value) return { message: '请选择 Feature' }
    const result = await abTestingService.changeFeatureLifecycle(selectedFeatureId.value, action)
    await refreshFeatureDomain()
    return result
  }

  async function solidifyExperimentToFeatureFromDraft() {
    const result = await abTestingService.solidifyExperimentToFeature(featureSolidifyDraft.value)
    if (result.feature) {
      selectedFeatureId.value = result.feature.featureId
      draftExperiment.value.featureIds = [...new Set([...draftExperiment.value.featureIds, result.feature.featureId])]
    }
    await refreshFeatureDomain()
    return result
  }

  async function runFeatureDecision() {
    if (!selectedFeatureId.value) return null
    featureDecision.value = await abTestingService.decideFeature({
      featureId: selectedFeatureId.value,
      userId: decisionTester.value.userId,
      context: {
        city: decisionTester.value.city,
        os: decisionTester.value.os,
        user_level: 'gold',
      },
      inWhitelist: decisionTester.value.inWhitelist,
      inExperiment: decisionTester.value.inExperiment,
      localDefault: false,
    })
    return featureDecision.value
  }

  function applyHitQueryTemplate(templateId: EntityId) {
    const template = hitQueryTemplates.value.find((item) => item.id === templateId)
    if (!template) return { message: '模板不存在' }
    hitQueryDraft.value.templateId = template.id
    hitQueryDraft.value.subjectType = template.subjectType
    hitQueryDraft.value.experimentId = template.filters.experimentId ?? ''
    hitQueryDraft.value.hitStatus = template.filters.hitStatus ?? 'all'
    hitQueryDraft.value.sortBy = template.sortBy
    hitQueryDraft.value.sortOrder = template.sortOrder
    return { message: '命中查询模板已应用' }
  }

  async function queryExperimentHits() {
    if (!hitQueryDraft.value.subjectId.trim()) return { message: '请输入查询 ID' }
    hitQueryLoading.value = true
    try {
      hitQueryResults.value = await abTestingService.queryExperimentHits({
        subjectId: hitQueryDraft.value.subjectId,
        subjectType: hitQueryDraft.value.subjectType,
        experimentId: hitQueryDraft.value.experimentId || undefined,
        hitStatus: hitQueryDraft.value.hitStatus,
        sortBy: hitQueryDraft.value.sortBy,
        sortOrder: hitQueryDraft.value.sortOrder,
      })
      return { message: `查询完成，共 ${hitQueryResults.value.length} 条结果` }
    } finally {
      hitQueryLoading.value = false
    }
  }

  function downloadHitQueryResults() {
    return {
      message: hitQueryResults.value.length
        ? `已生成 ${hitQueryResults.value.length} 条命中查询结果下载文件`
        : '暂无可下载的命中查询结果',
    }
  }

  async function diagnoseExperimentHit() {
    if (!hitDiagnosisDraft.value.subjectId.trim() || !hitDiagnosisDraft.value.experimentId) {
      return { message: '请输入诊断 ID 并选择实验' }
    }
    hitDiagnosisResult.value = await abTestingService.diagnoseExperimentHit(hitDiagnosisDraft.value)
    return { message: '命中诊断已完成' }
  }

  async function createDataDedupTask() {
    const result = await abTestingService.createDataDedupTask({
      ...dataDedupDraft.value,
      experimentId: dataDedupDraft.value.experimentId || undefined,
    })
    dataDedupTasks.value = await abTestingService.getDataDedupTasks()
    return result
  }

  async function runDataDedupTask(taskId: EntityId) {
    const result = await abTestingService.runDataDedupTask(taskId)
    dataDedupTasks.value = await abTestingService.getDataDedupTasks()
    return result
  }

  async function downloadDataDedupTask(taskId: EntityId) {
    const result = await abTestingService.downloadDataDedupTask(taskId)
    dataDedupTasks.value = await abTestingService.getDataDedupTasks()
    return result
  }

  function syncBoardDraft(board = selectedBoard.value) {
    if (!board) return
    boardDraft.value = {
      name: board.name,
      description: board.description,
      visibility: board.visibility,
      authorizedUserIds: [...board.authorizedUserIds],
      timeConfig: { ...board.timeConfig },
    }
  }

  async function saveExperimentBoard() {
    const result = await abTestingService.saveExperimentBoard({
      ...boardDraft.value,
      id: selectedBoardId.value || undefined,
      widgets: selectedBoard.value?.widgets ?? [],
    })
    experimentBoards.value = await abTestingService.getExperimentBoards()
    selectedBoardId.value = result.board.id
    syncBoardDraft(result.board)
    return result
  }

  async function addBoardWidget() {
    const board = selectedBoard.value
    if (!board) return { message: '请先创建或选择看板' }
    const widget: ExperimentBoardWidget = {
      ...boardWidgetDraft.value,
      id: createDraftTempId('board_widget'),
      order: board.widgets.length + 1,
    }
    const result = await abTestingService.saveExperimentBoard({
      ...board,
      widgets: [...board.widgets, widget],
    })
    experimentBoards.value = await abTestingService.getExperimentBoards()
    selectedBoardId.value = result.board.id
    return { message: '组件已添加' }
  }

  async function removeBoardWidget(widgetId: EntityId) {
    const board = selectedBoard.value
    if (!board) return { message: '请先选择看板' }
    const widgets = board.widgets
      .filter((widget) => widget.id !== widgetId)
      .map((widget, index) => ({ ...widget, order: index + 1 }))
    const result = await abTestingService.saveExperimentBoard({ ...board, widgets })
    experimentBoards.value = await abTestingService.getExperimentBoards()
    selectedBoardId.value = result.board.id
    return { message: '组件已删除' }
  }

  async function moveBoardWidget(widgetId: EntityId, direction: 'up' | 'down') {
    const board = selectedBoard.value
    if (!board) return { message: '请先选择看板' }
    const widgets = [...selectedBoardWidgets.value]
    const index = widgets.findIndex((widget) => widget.id === widgetId)
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (index < 0 || targetIndex < 0 || targetIndex >= widgets.length) return { message: '组件顺序未变化' }
    const target = widgets[targetIndex]
    widgets[targetIndex] = widgets[index]!
    widgets[index] = target!
    const ordered = widgets.map((widget, orderIndex) => ({ ...widget, order: orderIndex + 1 }))
    const result = await abTestingService.saveExperimentBoard({ ...board, widgets: ordered })
    experimentBoards.value = await abTestingService.getExperimentBoards()
    selectedBoardId.value = result.board.id
    return { message: '组件顺序已更新' }
  }

  async function copyExperimentBoardLink() {
    if (!selectedBoardId.value) return { message: '请先选择看板' }
    return abTestingService.copyExperimentBoardLink(selectedBoardId.value)
  }

  async function calculateBoardDiff() {
    if (!selectedBoardId.value) return { message: '请先选择看板' }
    boardDiffResults.value = await abTestingService.calculateBoardDiff(selectedBoardId.value)
    return { message: `已计算 ${boardDiffResults.value.length} 个组件差异` }
  }

  async function transitionExperiment(experimentId: EntityId, action: AbExperimentAction) {
    const result = await abTestingService.transitionExperiment(experimentId, action)
    await refreshExperimentDomain()
    return result
  }

  async function refreshExperimentDomain() {
    const [experimentPayload, summaryPayload, logPayload, permissionGrantPayload] = await Promise.all([
      abTestingService.getExperiments(),
      abTestingService.getWorkspaceSummary(),
      abTestingService.getOperationLogs(),
      abTestingService.getExperimentPermissionGrants(),
    ])
    experiments.value = experimentPayload
    summary.value = summaryPayload
    operationLogs.value = logPayload
    experimentPermissionGrants.value = permissionGrantPayload
    if (selectedExperimentId.value) await loadPlanningBundle(selectedExperimentId.value)
  }

  async function saveSafeExperimentEdit() {
    if (!selectedExperimentId.value) return { message: '请选择实验' }
    const result = await abTestingService.safeEditExperiment(selectedExperimentId.value, {
      name: safeEditDraft.value.name,
      goal: safeEditDraft.value.goal,
      riskNote: safeEditDraft.value.riskNote,
      tags: safeEditDraft.value.tagsText.split(',').map((item) => item.trim()).filter(Boolean),
    })
    await refreshExperimentDomain()
    return result
  }

  async function scaleSelectedExperimentTraffic() {
    if (!selectedExperimentId.value) return { message: '请选择实验' }
    const result = await abTestingService.scaleExperimentTraffic(
      selectedExperimentId.value,
      scaleTrafficDraft.value.targetTrafficRatio,
      scaleTrafficDraft.value.smoothDurationMinutes,
    )
    await refreshExperimentDomain()
    return result
  }

  async function operateSelectedSmoothTask(action: SmoothEffectTaskOperation) {
    const taskId = planningBundle.value?.smoothTask?.id
    if (!taskId) return { message: '暂无平滑任务' }
    smoothTaskOperating.value = true
    try {
      const result =
        action === 'refresh'
          ? await abTestingService.refreshSmoothEffectTask(taskId)
          : await abTestingService.operateSmoothEffectTask(taskId, action)
      await refreshExperimentDomain()
      return result
    } finally {
      smoothTaskOperating.value = false
    }
  }

  async function closeVariant(variantId: EntityId) {
    if (!selectedExperimentId.value) return { message: '请选择实验' }
    const result = await abTestingService.closeExperimentVariant(selectedExperimentId.value, variantId)
    await refreshExperimentDomain()
    return result
  }

  async function exportReport(reportType: ReportExportTask['reportType'] = 'overview') {
    if (!selectedReportExperimentId.value) return { message: '请选择实验' }
    reportExporting.value = true
    try {
      const result = await abTestingService.createReportExportTask(selectedReportExperimentId.value, reportType)
      reportExportTasks.value = await abTestingService.getReportExportTasks(selectedReportExperimentId.value)
      operationLogs.value = await abTestingService.getOperationLogs()
      return result
    } finally {
      reportExporting.value = false
    }
  }

  async function cancelReportExportTask(taskId: EntityId) {
    const result = await abTestingService.cancelReportExportTask(taskId)
    reportExportTasks.value = await abTestingService.getReportExportTasks(selectedReportExperimentId.value)
    operationLogs.value = await abTestingService.getOperationLogs()
    return result
  }

  async function retryReportExportTask(taskId: EntityId) {
    const result = await abTestingService.retryReportExportTask(taskId)
    reportExportTasks.value = await abTestingService.getReportExportTasks(selectedReportExperimentId.value)
    operationLogs.value = await abTestingService.getOperationLogs()
    return result
  }

  async function recoverWorkspaceState() {
    loadError.value = null
    asyncPollingError.value = null
    await loadWorkspace()
    if (selectedReportExperimentId.value) await loadReport(selectedReportExperimentId.value)
    return { message: '工作台状态已恢复并重新同步' }
  }

  async function refreshAsyncTasks() {
    try {
      asyncPollingError.value = null
      const experimentId = selectedReportExperimentId.value || selectedExperimentId.value
      if (selectedExperimentId.value) {
        planningBundle.value = await abTestingService.getExperimentPlanningBundle(selectedExperimentId.value)
      }
      sensitiveTasks.value = experimentId ? await abTestingService.getSensitiveInsightTasks(experimentId) : []
      reportExportTasks.value = selectedReportExperimentId.value
        ? await abTestingService.getReportExportTasks(selectedReportExperimentId.value)
        : []
      asyncLastPolledAt.value = new Date().toISOString()
    } catch (error) {
      asyncPollingError.value = error instanceof Error ? error.message : '异步任务刷新失败'
    }
  }

  function startAsyncTaskPolling(intervalMs = 5000) {
    if (taskPoller) return
    asyncPolling.value = true
    void refreshAsyncTasks()
    taskPoller = setInterval(() => {
      void refreshAsyncTasks()
    }, intervalMs)
  }

  function stopAsyncTaskPolling() {
    if (taskPoller) {
      clearInterval(taskPoller)
      taskPoller = null
    }
    asyncPolling.value = false
  }

  watch(
    draftExperiment,
    () => {
      draftDirty.value = true
      persistDraft()
    },
    { deep: true },
  )
  watch([selectedExperimentId, selectedReportExperimentId, selectedFeatureId], persistSelections)
  watch(selectedFeatureId, syncSelectedFeatureDrafts)
  watch(selectedBoardId, () => syncBoardDraft())
  watch(
    [
      experimentKeyword,
      selectedStatuses,
      selectedExperimentType,
      selectedExperimentTags,
      selectedExperimentOwnerId,
      selectedExperimentVisibility,
      experimentCreatedRange,
      experimentRunningRange,
    ],
    () => {
      experimentPage.value = 1
    },
    { deep: true },
  )

  return {
    loading,
    initialized,
    loadError,
    appMembers,
    segmentOptions,
    experimentTemplateOptions,
    activeExperimentTemplateId,
    activeTemplateLockedFields,
    audienceFieldOptions,
    audienceOperators,
    permissionContext,
    summary,
    experiments,
    trafficLayers,
    mutexDomainGroups,
    metricGroups,
    metrics,
    metricTemplates,
    alarmTasks,
    receiverGroups,
    mustSeeTrends,
    featureFlags,
    featureVersions,
    publishPlans,
    whitelistTests,
    hitQueryTemplates,
    hitQueryResults,
    hitQueryLoading,
    hitDiagnosisResult,
    dataDedupTasks,
    experimentBoards,
    selectedBoardId,
    boardDiffResults,
    operationLogs,
    experimentPermissionGrants,
    apiIntegrationStatus,
    selectedExperimentId,
    selectedReportExperimentId,
    selectedFeatureId,
    selectedMetricGroupId,
    metricGroupMergeIds,
    metricGroupDraft,
    planningBundle,
    reportOverview,
    metricResults,
    trendPoints,
    filterTemplates,
    funnelReport,
    cohortReport,
    heatmapReport,
    mabReport,
    sensitiveTasks,
    reportExportTasks,
    reportExporting,
    safeEditDraft,
    scaleTrafficDraft,
    experimentKeyword,
    selectedStatuses,
    selectedExperimentType,
    selectedExperimentTags,
    selectedExperimentOwnerId,
    selectedExperimentVisibility,
    experimentCreatedRange,
    experimentRunningRange,
    selectedExperimentIds,
    experimentPage,
    experimentPageSize,
    batchTagText,
    currentCreateStep,
    draftExperiment,
    draftDirty,
    draftChecks,
    draftSubmitting,
    draftSubmitMessage,
    lastCreatedExperimentId,
    uniformTaskDetail,
    uniformTaskRunning,
    smoothTaskOperating,
    trafficCalculator,
    trafficRecommendation,
    audienceEstimate,
    trafficLayerDraft,
    mutexGroupDraft,
    mutexDomainDraft,
    decisionTester,
    featureDecision,
    featureDraft,
    featureVersionDraft,
    featurePublishDraft,
    whitelistDraft,
    whitelistUserIdsText,
    featureSolidifyDraft,
    hitQueryDraft,
    hitDiagnosisDraft,
    dataDedupDraft,
    boardDraft,
    boardWidgetDraft,
    asyncPolling,
    asyncLastPolledAt,
    asyncPollingError,
    selectedExperiment,
    selectedReportExperiment,
    selectedFeature,
    selectedExperimentPermission,
    selectedFeaturePermission,
    selectedFeatureVersions,
    selectedCurrentFeatureVersion,
    selectedLatestFeatureVersion,
    featureVersionOptions,
    solidifyVariantOptions,
    selectedPublishPlans,
    selectedWhitelistTests,
    selectedMetricGroup,
    selectedMetricGroupMetrics,
    selectedBoard,
    selectedBoardWidgets,
    draftMetricSnapshots,
    draftTerminalType,
    compatibleTrafficLayers,
    compatibleMutexDomainGroups,
    draftSelectedMutexDomain,
    draftUniformStatusLabel,
    uniformConfigLocked,
    uniformMetricLimitReached,
    selectedSmoothTaskLogs,
    mvtCombinationCount,
    experimentTagOptions,
    experimentOwnerOptions,
    filteredExperiments,
    filteredExperimentTotal,
    pagedExperiments,
    runningExperiments,
    enabledFeatures,
    activeAlarms,
    mustSeeMetrics,
    canSubmitDraft,
    reportAnomalies,
    permissionAuditItems,
    performanceBudgetItems,
    e2eAcceptanceCases,
    coverageCompletion,
    reportExportQueueHealth,
    loadWorkspace,
    loadPlanningBundle,
    loadExperimentPermissions,
    saveExperimentPermissions,
    resetExperimentFilters,
    toggleExperimentSelection,
    togglePagedExperimentSelection,
    applyBatchTagToSelected,
    archiveSelectedExperiments,
    exportSelectedExperiments,
    applyExperimentTemplate,
    isDraftFieldLocked,
    loadReport,
    validateDraft,
    validateCreateStep,
    canOpenCreateStep,
    goToCreateStep,
    nextCreateStep,
    previousCreateStep,
    changeDraftExperimentType,
    rebalanceDraftVariantTraffic,
    addDraftVariant,
    copyDraftVariant,
    removeDraftVariant,
    setDraftControlVariant,
    addDraftParamSchema,
    copyDraftParamSchema,
    removeDraftParamSchema,
    renameDraftParamKey,
    updateDraftParamType,
    updateDraftParamDefaultValue,
    copyControlParamToTreatments,
    clearDraftParamValue,
    restoreDraftParamDefault,
    formatDraftJsonParam,
    addMvtElement,
    removeMvtElement,
    addMvtElementVariant,
    removeMvtElementVariant,
    addPersonalizationAudience,
    removePersonalizationAudience,
    addVisualElement,
    removeVisualElement,
    addAdAsset,
    removeAdAsset,
    addAudienceGroup,
    removeAudienceGroup,
    addAudienceCondition,
    removeAudienceCondition,
    updateAudienceConditionSource,
    updateAudienceConditionField,
    updateAudienceConditionOperator,
    updateAudienceConditionValue,
    stringifyAudienceValue,
    estimateDraftAudience,
    resetTrafficLayerDraft,
    editTrafficLayer,
    saveTrafficLayerDraft,
    deleteTrafficLayer,
    resetMutexGroupDraft,
    editMutexGroup,
    saveMutexGroupDraft,
    deleteMutexGroup,
    editMutexDomain,
    resetMutexDomainDraft,
    saveMutexDomainDraft,
    deleteMutexDomain,
    setUniformDiversionEnabled,
    updateUniformDiversionMode,
    updateUniformMetricIds,
    updateUniformSegmentIds,
    runUniformDiversionTask,
    cancelUniformDiversionTask,
    applyUniformDiversionResult,
    unlockUniformDiversionConfig,
    submitDraftForDebug,
    refreshMetricDomain,
    createMetricGroup,
    copyMetricGroup,
    mergeMetricGroups,
    offlineMetricGroup,
    toggleMetricMustSee,
    applyMustSeeMetricsToDraft,
    runTrafficCalculator,
    refreshFeatureDomain,
    createFeatureFlag,
    createFeatureVersion,
    publishSelectedFeatureVersion,
    rollbackSelectedFeature,
    createWhitelistTest,
    changeSelectedFeatureLifecycle,
    solidifyExperimentToFeatureFromDraft,
    runFeatureDecision,
    applyHitQueryTemplate,
    queryExperimentHits,
    downloadHitQueryResults,
    diagnoseExperimentHit,
    createDataDedupTask,
    runDataDedupTask,
    downloadDataDedupTask,
    syncBoardDraft,
    saveExperimentBoard,
    addBoardWidget,
    removeBoardWidget,
    moveBoardWidget,
    copyExperimentBoardLink,
    calculateBoardDiff,
    transitionExperiment,
    refreshExperimentDomain,
    saveSafeExperimentEdit,
    scaleSelectedExperimentTraffic,
    operateSelectedSmoothTask,
    closeVariant,
    exportReport,
    cancelReportExportTask,
    retryReportExportTask,
    recoverWorkspaceState,
    refreshAsyncTasks,
    startAsyncTaskPolling,
    stopAsyncTaskPolling,
    restoreDraft,
    persistDraft,
    saveDraft,
    resetDraft,
  }
})
