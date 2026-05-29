<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import {
  NButton,
  NButtonGroup,
  NCard,
  NCheckbox,
  NDescriptions,
  NDescriptionsItem,
  NDivider,
  NDrawer,
  NDrawerContent,
  NDropdown,
  NEmpty,
  NGi,
  NGrid,
  NIcon,
  NInput,
  NInputNumber,
  NModal,
  NPagination,
  NProgress,
  NSelect,
  NSpace,
  NSpin,
  NStep,
  NSteps,
  NTabPane,
  NTabs,
  NTable,
  NTag,
  NTimeline,
  NTimelineItem,
  NTooltip,
  useMessage,
} from 'naive-ui'
import {
  AddCircleOutline,
  CopyOutline,
  DownloadOutline,
  EllipsisHorizontalOutline,
  ExpandOutline,
  HelpCircleOutline,
  RefreshOutline,
  ShieldCheckmarkOutline,
} from '@vicons/ionicons5'
import { useAbTestingStore } from '@/stores/abTesting'
import MetricManagementPanel from '@/components/ab-testing/MetricManagementPanel.vue'
import MetricFilterBuilder, { type FilterGroupDraft } from '@/components/ab-testing/MetricFilterBuilder.vue'
import type {
  AbPermissionLevel,
  AbExperimentAction,
  AbExperimentParamType,
  AbExperimentStatus,
  AbExperimentType,
  AbExperimentVisibility,
  AudienceCondition,
  AudienceConditionSource,
  AudienceRule,
  Experiment,
  ExperimentBoardWidget,
  ExperimentPermissionGrant,
  ExperimentPermissionType,
  ExperimentDraftParamSchema,
  ExperimentDraftVariant,
  ExperimentVariant,
  FeatureFlag,
  FeaturePublishStatus,
  FeatureStatus,
  FeatureVersion,
  PublishPlan,
  WhitelistTest,
  FilterTemplate,
  FlexibleProperty,
  Metric,
  MetricBindingSnapshot,
  MetricFilter,
  MetricFilterGroup,
  MetricStatisticResult,
  MetricTemplate,
  OperationLog,
  ReportFilter,
  ReportExportTask,
  SensitiveInsightTask,
  TemporaryRetentionQueryResult,
} from '@/types/abTesting'
import type { EntityId } from '@/types/common'
import { canUseAbAction, getAbPermissionLevel, getExperimentActionAvailability } from '@/utils/abTestingRules'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const abStore = useAbTestingStore()

const defaultPageHeader = {
  title: 'A/B 测试工作台',
  description: '实验规划、创建、运行、报告、指标与配置治理的统一入口。',
}

const pageHeaders: Record<string, { title: string; description: string }> = {
  overview: defaultPageHeader,
  experiments: {
    title: '实验管理',
    description: '实验列表、详情、生命周期操作、命中诊断、扩缩量和审计日志。',
  },
  create: {
    title: '实验创建',
    description: '6 步创建向导覆盖类型、版本参数、受众分流、流量互斥、调平和平滑生效。',
  },
  reports: {
    title: '实验报告',
    description: '结论、指标、事件、留存、漏斗、热力图、MAB 与敏感人群分析。',
  },
  metrics: {
    title: '指标管理',
    description: '指标组、事件指标、留存指标、漏斗指标、模板、报警和必看指标。',
  },
  features: {
    title: 'Feature Flag 配置管理',
    description: 'Feature 创建、版本、发布受众、白名单、灰度、回滚和 Runtime 决策。',
  },
  traffic: {
    title: '流量与互斥域',
    description: '流量层、互斥域、流量计算器、增强分流均匀性和平滑任务。',
  },
  tools: {
    title: '实验工具箱',
    description: '命中查询、命中诊断、数据查重、导出任务和异常恢复。',
  },
  boards: {
    title: '实验看板',
    description: '管理、编辑和查看跨实验运营看板。',
  },
}

const boardPageHeaders: Record<string, { title: string; description: string }> = {
  list: {
    title: '实验看板',
    description: '管理看板、权限和分享入口，从这里进入编辑或查看。',
  },
  edit: {
    title: '编辑实验看板',
    description: '配置看板信息并维护组件，添加后可在查看页立即看到。',
  },
  view: {
    title: '查看实验看板',
    description: '按已配置组件展示指标、实验健康度、报警和说明内容。',
  },
}

const featurePageHeaders: Record<string, { title: string; description: string }> = {
  list: {
    title: 'Feature 列表',
    description: '搜索、筛选、分页查看 Feature，并从行内进入实验、白名单、发布、权限和历史流程。',
  },
  create: {
    title: '创建 Feature',
    description: '按基本信息、适用 App、变量、变体、发布受众和示例代码完成 Feature 配置。',
  },
  detail: {
    title: 'Feature 详情',
    description: '查看 Feature 基础信息、版本、发布状态、关联实验和可执行操作。',
  },
  versions: {
    title: 'Feature 版本管理',
    description: '创建新版本、查看受众规则和版本差异，并选择版本进入发布或回滚。',
  },
  code: {
    title: '嵌入代码',
    description: '根据 Feature Key、终端类型和变体类型生成前后端接入示例。',
  },
  whitelist: {
    title: '白名单测试',
    description: '为 QA 或指定用户创建不依赖发布的 Feature 验证白名单。',
  },
  publish: {
    title: '发布 / 回滚 Feature',
    description: '确认版本信息，配置手动或定时灰度发布，并执行回滚。',
  },
  history: {
    title: '发布历史',
    description: '全局查看 Feature 发布、回滚、取消发布和关闭记录。',
  },
  lifecycle: {
    title: '生命周期管理',
    description: '查看关键操作 Timeline、版本使用状态和长期未使用提示。',
  },
  permissions: {
    title: '权限管理',
    description: '管理公共 / 私有 Feature 类型，并校验当前用户的查看与协作者能力。',
  },
  logs: {
    title: '操作日志',
    description: '查看单个 Feature 的创建、编辑、发布、回滚、白名单和权限变更日志。',
  },
  solidify: {
    title: '实验固化至 Feature',
    description: '从实验分组生成未发布 Feature 版本，确认后再进入发布流程。',
  },
}

const statusLabels: Record<AbExperimentStatus, string> = {
  DRAFT: '草稿',
  DEBUGGING: '调试中',
  READY: '待开始',
  RUNNING: '运行中',
  PAUSING: '暂停中',
  PAUSED: '已暂停',
  FROZEN: '已冻结',
  STOPPING: '停止中',
  STOPPED: '已停止',
  ENDED: '已结束',
  ARCHIVED: '已归档',
}

const typeLabels: Record<AbExperimentType, string> = {
  CLIENT_CODE: '客户端编程实验',
  SERVER_CODE: '服务端编程实验',
  VISUAL: '可视化实验',
  SPLIT_URL: '多链接实验',
  PUSH: '推送实验',
  MAB: 'MAB 智能调优',
  MVT: '多变量实验',
  PERSONALIZATION_WEB: 'Web 个性化',
  PERSONALIZATION_CODE: '编程个性化',
  PARENT_CHILD: '父子实验',
  REVERSE: '反转实验',
  AD: '广告实验',
}

const experimentTypeCatalog: Array<{
  value: AbExperimentType
  description: string
  scenes: string[]
  requirements: string[]
}> = [
  {
    value: 'CLIENT_CODE',
    description: '客户端本地功能、样式和交互在打开页面时立即生效。',
    scenes: ['按钮颜色', '页面布局', '本地弹窗', '客户端功能开关'],
    requirements: ['客户端 SDK 已接入', '客户端能读取实验参数'],
  },
  {
    value: 'SERVER_CODE',
    description: '服务端根据分流结果下发推荐、排序、定价或风控策略。',
    scenes: ['推荐算法', '内容分发', '搜索排序', '后端配置策略'],
    requirements: ['服务端 SDK 或分流 Agent 已接入', '具备服务端实验创建权限'],
  },
  {
    value: 'VISUAL',
    description: '无需开发，通过可视化编辑器调整 Web/H5 页面元素。',
    scenes: ['文案改版', '按钮样式', '页面热区', '落地页视觉验证'],
    requirements: ['应用开启可视化能力', '页面元素可被编辑器识别'],
  },
  {
    value: 'SPLIT_URL',
    description: '不同版本跳转到不同 URL，用于落地页或路径对比。',
    scenes: ['活动落地页', '注册路径', '广告承接页'],
    requirements: ['每个版本配置合法 URL', '对照组和实验组 URL 不重复'],
  },
  {
    value: 'PUSH',
    description: '测试推送标题、内容、跳转动作和按钮文案。',
    scenes: ['推送文案', '触达时间', '活动提醒'],
    requirements: ['推送通道已接入', '配置触达用户范围与发送时间'],
  },
  {
    value: 'MAB',
    description: '短周期内动态把更多流量分配给当前表现更好的版本。',
    scenes: ['活动 Banner', '高价值流量', '机会成本高的投放'],
    requirements: ['配置唯一优化指标', '接受动态流量分配'],
  },
  {
    value: 'MVT',
    description: '同时测试多个页面元素组合，自动生成组合版本。',
    scenes: ['标题和按钮组合', '图片和文案组合'],
    requirements: ['至少 2 个实验元素', '每个元素至少 2 个变体', '页面访问量足够高'],
  },
  {
    value: 'PERSONALIZATION_WEB',
    description: '根据用户特征在 Web/H5 页面展示不同内容。',
    scenes: ['地域化内容', '兴趣推荐', '用户分层体验'],
    requirements: ['配置人群规则', '多命中时配置优先级'],
  },
  {
    value: 'PERSONALIZATION_CODE',
    description: '通过代码参数为不同用户群体下发不同策略。',
    scenes: ['用户等级策略', '服务端个性化推荐'],
    requirements: ['配置人群规则', '每个人群绑定策略版本'],
  },
  {
    value: 'PARENT_CHILD',
    description: '子实验只在父实验某个版本流量下继续细分验证。',
    scenes: ['胜出策略再验证', '实验组内二次细分'],
    requirements: ['选择运行中的父实验', '子实验流量不超过父版本可用流量'],
  },
  {
    value: 'REVERSE',
    description: '在未体验新策略的对照人群中做小流量反转验证。',
    scenes: ['长期收益复验', '全量发布后风险观测'],
    requirements: ['关联已完成或已发布实验', '选择原对照组候选流量'],
  },
  {
    value: 'AD',
    description: '在外部广告平台授权后验证广告策略表现。',
    scenes: ['广告素材', '出价策略', '投放人群'],
    requirements: ['绑定广告账户', '完成外部平台授权校验'],
  },
]

const createSteps = [
  '实验类型',
  '基础信息',
  '版本参数',
  '受众分流',
  '流量互斥',
  '检查预览',
]

const activePage = computed(() => String(route.meta.abPage ?? 'overview'))
const currentHeader = computed(() => {
  if (activePage.value === 'features') {
    return featurePageHeaders[String(route.meta.featureSubPage ?? 'list')] ?? pageHeaders.features ?? defaultPageHeader
  }
  if (activePage.value === 'boards') {
    return boardPageHeaders[String(route.meta.boardSubPage ?? 'list')] ?? pageHeaders.boards ?? defaultPageHeader
  }
  return pageHeaders[activePage.value] ?? defaultPageHeader
})
const currentCreateStepTitle = computed(() => createSteps[currentCreateStep.value - 1] ?? createSteps[0])

type FeatureSubPage =
  | 'list'
  | 'create'
  | 'detail'
  | 'versions'
  | 'code'
  | 'whitelist'
  | 'publish'
  | 'history'
  | 'lifecycle'
  | 'permissions'
  | 'logs'
  | 'solidify'

type BoardSubPage = 'list' | 'edit' | 'view'

type ReportPrimaryTab = 'conclusion' | 'metrics' | 'advanced' | 'heatmap' | 'mab' | 'sensitive'
type CoreTrendView = 'day' | 'distribution' | 'box'
type ReportMetricViewMode = 'single' | 'group'
type MetricDiffDisplay = 'value' | 'diffAbs' | 'diffRel'
type MetricSortKey = 'version' | 'sampleSize' | 'metricValue' | 'diffRel' | 'pValue'
type RetentionViewMode = 'cohort' | 'nDay'
type FunnelViewMode = 'list' | 'chart'
type FunnelBaselineSelection = EntityId | 'none'
type MabTrendMode = 'absolute' | 'relative'
type MabTrafficView = 'cumulative' | 'actual' | 'theoretical'
type MabParameterView = 'online' | 'all'
type SensitiveTaskStatusTab = SensitiveInsightTask['status'] | 'all'

type MetricVersionResult = MetricStatisticResult['versionResults'][number]
type ReportFilterRow = Omit<ReportFilter['filters'][number], 'value'> & { id: EntityId; value?: string }
type TemporaryRetentionFilterDraft = Omit<MetricFilter, 'value'> & { value?: string }

interface StatisticCardState {
  metric: MetricStatisticResult
  result: MetricVersionResult
  baseline?: MetricVersionResult
}

interface DifferenceGroupDraft {
  id: EntityId
  name: string
  field: string
  operator: string
  value: string
}

interface HeatmapRegion {
  id: EntityId
  name: string
  x: number
  y: number
  width: number
  height: number
}

interface SensitiveInsightDraft {
  name: string
  metricId: EntityId | null
  treatmentVariantId: EntityId | null
  controlVariantId: EntityId | null
  direction: SensitiveInsightTask['direction']
  attributeFields: string[]
  timeRange: string
}

const activeReportTab = ref<ReportPrimaryTab>('conclusion')
const pendingReportTab = ref<ReportPrimaryTab | null>(null)
const selectedCoreMetricId = ref<EntityId | null>(null)
const activeTrendView = ref<CoreTrendView>('day')
const trendRangeVisible = ref(false)
const trendPValueVisible = ref(false)
const hiddenTrendVersionIds = ref<EntityId[]>([])
const reportRefreshing = ref(false)
const reportHelpVisible = ref(false)
const statisticCardVisible = ref(false)
const statisticCardState = ref<StatisticCardState | null>(null)
const trendFullscreenVisible = ref(false)
const groupUserDownloadVisible = ref(false)
const groupUserPolicyVisible = ref(false)
const reportMetricViewMode = ref<ReportMetricViewMode>('single')
const metricDiffDisplay = ref<MetricDiffDisplay>('diffRel')
const metricSearchKeyword = ref('')
const metricSortKey = ref<MetricSortKey>('version')
const metricSortAsc = ref(true)
const metricGroupSortMetricId = ref<EntityId | null>(null)
const metricGroupSortAsc = ref(false)
const highlightedVersionId = ref<EntityId | null>(null)
const selectedFilterTemplateId = ref<EntityId | null>(null)
const localFilterTemplates = ref<FilterTemplate[]>([])
const cohortFilterIds = ref<EntityId[]>([])
const retentionViewMode = ref<RetentionViewMode>('cohort')
const selectedRetentionDay = ref(7)
const temporaryRetentionMetricId = ref<EntityId | null>(null)
const temporaryRetentionQueried = ref(false)
const temporaryRetentionLoading = ref(false)
const temporaryRetentionResult = ref<TemporaryRetentionQueryResult | null>(null)
const temporaryRetentionDraft = ref({
  startEventId: '',
  returnEventId: '',
  startDate: '2026-05-21',
  endDate: '2026-05-28',
  startFilterTree: createTemporaryRetentionFilterGroup(),
  returnFilterTree: createTemporaryRetentionFilterGroup(),
})
const expandedRetentionRows = ref<string[]>([])
const funnelViewMode = ref<FunnelViewMode>('list')
const selectedFunnelCompareVersionId = ref<EntityId | null>(null)
const selectedFunnelBaselineVersionId = ref<FunnelBaselineSelection>('var_feed_control')
const differenceMetricId = ref<EntityId | null>(null)
const differenceVersionIds = ref<EntityId[]>([])
const differenceGroups = ref<DifferenceGroupDraft[]>([
  { id: 'diff_group_core_city', name: '一线城市用户', field: 'city', operator: 'in', value: '北京,上海,广州' },
  { id: 'diff_group_android', name: 'Android 用户', field: 'os', operator: 'eq', value: 'Android' },
])
const heatmapOverlayVisible = ref(true)
const selectedHeatmapVersionId = ref<EntityId | null>(null)
const heatmapRegions = ref<HeatmapRegion[]>([
  { id: 'region_primary_cta', name: '主按钮区域', x: 58, y: 42, width: 28, height: 12 },
  { id: 'region_benefit_entry', name: '福利入口', x: 12, y: 58, width: 32, height: 10 },
])
const mabTrendMode = ref<MabTrendMode>('relative')
const mabTrafficView = ref<MabTrafficView>('cumulative')
const mabHideOffline = ref(false)
const mabParameterView = ref<MabParameterView>('online')
const sensitiveTaskStatusTab = ref<SensitiveTaskStatusTab>('all')
const sensitiveCreateVisible = ref(false)
const sensitiveConfigVisible = ref(false)
const sensitiveSegmentVisible = ref(false)
const selectedSensitiveTaskId = ref<EntityId | null>(null)
const selectedSensitiveSegmentCondition = ref<string | null>(null)
const sensitiveTaskDraft = ref<SensitiveInsightDraft>({
  name: '敏感人群洞察',
  metricId: null,
  treatmentVariantId: null,
  controlVariantId: null,
  direction: 'positive',
  attributeFields: ['city', 'os', 'coin_balance', 'active_days'],
  timeRange: '2026-05-20 ~ 2026-05-28',
})
const reportMetricFilter = ref({
  timeGranularity: 'day' as ReportFilter['timeGranularity'],
  startTime: '2026-05-20',
  endTime: '2026-05-28',
  dataMode: 'after_experiment' as ReportFilter['dataMode'],
})
const reportFilterRows = ref<ReportFilterRow[]>([])
const draftMetricTemplateId = ref<EntityId | null>(null)
const draftFlexibleMetricValues = ref<Record<EntityId, Record<EntityId, string>>>({})

const trendPalette = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#db2777']
const groupUserDownloadFields = ['uid', '实验 ID', '实验名称', '实验分组 ID', '实验分组名称', '进组时间', '过滤条件', 'app_id', '导出时间']
const sensitiveAttributeOptions = [
  { label: '城市', value: 'city' },
  { label: '设备系统', value: 'os' },
  { label: '金币余额', value: 'coin_balance' },
  { label: '近 7 日活跃天数', value: 'active_days' },
  { label: '广告入口来源', value: 'ad_entry_source' },
  { label: '渠道', value: 'channel' },
  { label: '会员等级', value: 'member_level' },
  { label: 'App 版本', value: 'app_version' },
]
const sensitiveStageLabels: Record<SensitiveInsightTask['stage'], string> = {
  data_preparing: '数据准备',
  model_training: '模型训练',
  model_predicting: '敏感人群识别',
  result_output: '报告产出',
}
const sensitiveStatusLabels: Record<SensitiveInsightTask['status'], string> = {
  running: '运行中',
  completed: '已完成',
  failed: '失败',
  terminated: '已终止',
}

const {
  loading,
  loadError,
  permissionContext,
  summary,
  experiments,
  trafficLayers,
  mutexDomainGroups,
  metricGroups,
  metricBindingSnapshots,
  metrics,
  metricTemplates,
  receiverGroups,
  mustSeeTrends,
  featureFlags,
  featureVersions,
  publishPlans,
  featureDraft,
  featureVersionDraft,
  featurePublishDraft,
  whitelistDraft,
  whitelistUserIdsText,
  featureSolidifyDraft,
  hitQueryTemplates,
  hitQueryResults,
  hitQueryLoading,
  hitDiagnosisResult,
  dataDedupTasks,
  experimentBoards,
  selectedBoardId,
  boardDiffResults,
  operationLogs,
  selectedExperimentId,
  selectedReportExperimentId,
  selectedFeatureId,
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
  temporaryRetentionQueries,
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
  selectedFeaturePermission,
  selectedFeatureVersions,
  selectedCurrentFeatureVersion,
  selectedLatestFeatureVersion,
  featureVersionOptions,
  solidifyVariantOptions,
  selectedPublishPlans,
  selectedWhitelistTests,
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
  filteredExperimentTotal,
  pagedExperiments,
  runningExperiments,
  enabledFeatures,
  activeAlarms,
  canSubmitDraft,
  reportAnomalies,
  reportExportQueueHealth,
} = storeToRefs(abStore)

const boardPageMode = computed<BoardSubPage>(() => {
  const mode = String(route.meta.boardSubPage ?? 'list')
  return mode === 'edit' || mode === 'view' ? mode : 'list'
})
const boardRouteBoardId = computed(() => (typeof route.params.boardId === 'string' ? route.params.boardId : ''))
const boardCreateMode = computed(() => activePage.value === 'boards' && boardPageMode.value === 'edit' && !boardRouteBoardId.value)
const boardViewWidgets = computed(() => selectedBoardWidgets.value)

function canUseMetricTemplate(template: MetricTemplate) {
  return (
    template.templateType === 'common' ||
    template.ownerId === permissionContext.value.userId ||
    template.availableUserIds.includes(permissionContext.value.userId)
  )
}

const draftMetricFilters = ref({
  keyword: '',
  type: 'all',
  mustSee: 'all',
  permissionType: 'all',
  ownerId: 'all',
})

function canUseMetricInDraft(metric: Metric) {
  const group = metricGroups.value.find((item) => item.id === metric.metricGroupId)
  if (!group || group.status !== 'active' || metric.status !== 'active') return false
  if (group.permissionType === 'public') return true
  return (
    permissionContext.value.roles.includes('SUPER_ADMIN') ||
    permissionContext.value.roles.includes('APP_ADMIN') ||
    group.ownerId === permissionContext.value.userId ||
    group.authorizedUserIds.includes(permissionContext.value.userId)
  )
}

const draftMetricOwnerOptions = computed(() => {
  const owners = metricGroups.value.map((group) => ({ label: group.owner.name, value: group.ownerId }))
  return [{ label: '全部Owner', value: 'all' }, ...owners.filter((owner, index, items) => items.findIndex((item) => item.value === owner.value) === index)]
})

const filteredDraftMetrics = computed(() => {
  const keyword = draftMetricFilters.value.keyword.trim().toLowerCase()
  return metrics.value.filter((metric) => {
    const group = metricGroups.value.find((item) => item.id === metric.metricGroupId)
    if (!canUseMetricInDraft(metric) || !group) return false
    const typeMatched = draftMetricFilters.value.type === 'all' || metric.metricCategory === draftMetricFilters.value.type
    const mustSeeMatched = draftMetricFilters.value.mustSee === 'all' || (draftMetricFilters.value.mustSee === 'yes' ? metric.isMustSee : !metric.isMustSee)
    const permissionMatched = draftMetricFilters.value.permissionType === 'all' || group.permissionType === draftMetricFilters.value.permissionType
    const ownerMatched = draftMetricFilters.value.ownerId === 'all' || group.ownerId === draftMetricFilters.value.ownerId
    const text = [group.name, metric.name, metric.description, group.description, group.owner.name].join(' ').toLowerCase()
    return typeMatched && mustSeeMatched && permissionMatched && ownerMatched && (!keyword || text.includes(keyword))
  })
})

const draftMetricTemplateOptions = computed(() =>
  metricTemplates.value
    .filter((template) => canUseMetricTemplate(template))
    .map((template) => ({
      label: `${template.name} · ${template.templateType === 'common' ? '通用' : '个人'}`,
      value: template.id,
    })),
)
const draftCoreMetricOptions = computed(() =>
  filteredDraftMetrics.value.map((metric) => ({
    label: `${metric.name} · ${metricGroups.value.find((group) => group.id === metric.metricGroupId)?.name ?? metric.metricGroupId}${metric.metricCategory === 'funnel' ? '（不可为核心）' : ''}`,
    value: metric.id,
    disabled: metric.metricCategory === 'funnel',
  })),
)
const draftFocusMetricOptions = computed(() => {
  const selectedFunnelId = draftExperiment.value.focusMetricIds.find(
    (metricId) => metrics.value.find((metric) => metric.id === metricId)?.metricCategory === 'funnel',
  )
  return filteredDraftMetrics.value.map((metric) => ({
    label: `${metric.name} · ${metricGroups.value.find((group) => group.id === metric.metricGroupId)?.name ?? metric.metricGroupId}${metric.isMustSee ? ' · 必看' : ''}`,
    value: metric.id,
    disabled:
      metric.status !== 'active' ||
      metric.id === draftExperiment.value.coreMetricId ||
      (metric.metricCategory === 'funnel' && Boolean(selectedFunnelId) && selectedFunnelId !== metric.id),
  }))
})
const draftCoreMetric = computed(() => metrics.value.find((metric) => metric.id === draftExperiment.value.coreMetricId))
const draftFocusMetrics = computed(() =>
  draftExperiment.value.focusMetricIds
    .map((metricId) => metrics.value.find((metric) => metric.id === metricId))
    .filter((metric): metric is Metric => Boolean(metric)),
)

function handleDraftCoreMetricChange(value: EntityId | null) {
  draftExperiment.value.coreMetricId = value
  draftExperiment.value.focusMetricIds = draftExperiment.value.focusMetricIds.filter((metricId) => metricId !== value)
  abStore.syncDraftMetricIdsFromRoles()
}

function handleDraftFocusMetricChange(values: EntityId[]) {
  const activeValues = values.filter((metricId) => metrics.value.some((metric) => metric.id === metricId && metric.status === 'active'))
  const funnelValues = activeValues.filter((metricId) => metrics.value.find((metric) => metric.id === metricId)?.metricCategory === 'funnel')
  draftExperiment.value.focusMetricIds = [
    ...activeValues.filter((metricId) => metricId !== draftExperiment.value.coreMetricId && !funnelValues.includes(metricId)),
    ...funnelValues.slice(0, 1),
  ]
  abStore.syncDraftMetricIdsFromRoles()
  if (funnelValues.length > 1) message.warning('关注指标最多选择一个漏斗指标，已保留第一个')
}

function metricFlexibleProperties(metric: Metric): FlexibleProperty[] {
  return 'flexibleProperties' in metric.definition ? metric.definition.flexibleProperties : []
}

function flexibleDefaultText(property: FlexibleProperty) {
  if (Array.isArray(property.defaultValue)) return property.defaultValue.join(',')
  return property.defaultValue === undefined || property.defaultValue === null ? '' : String(property.defaultValue)
}

function flexibleDraftValue(metricId: EntityId, property: FlexibleProperty) {
  return draftFlexibleMetricValues.value[metricId]?.[property.id] ?? flexibleDefaultText(property)
}

function updateFlexibleDraftValue(metricId: EntityId, propertyId: EntityId, value: string) {
  draftFlexibleMetricValues.value = {
    ...draftFlexibleMetricValues.value,
    [metricId]: {
      ...(draftFlexibleMetricValues.value[metricId] ?? {}),
      [propertyId]: value,
    },
  }
}

function seedDraftFlexibleDefaults() {
  const nextValues = { ...draftFlexibleMetricValues.value }
  for (const metric of draftMetricSnapshots.value) {
    const properties = metricFlexibleProperties(metric)
    if (!properties.length) continue
    nextValues[metric.id] = { ...(nextValues[metric.id] ?? {}) }
    for (const property of properties) {
      if (nextValues[metric.id]?.[property.id] === undefined) nextValues[metric.id]![property.id] = flexibleDefaultText(property)
    }
  }
  draftFlexibleMetricValues.value = nextValues
}

const draftMetricFlexibleRows = computed(() =>
  draftMetricSnapshots.value.flatMap((metric) =>
    metricFlexibleProperties(metric).map((property) => ({
      metric,
      property,
      value: flexibleDraftValue(metric.id, property),
    })),
  ),
)

const reportFlexibleScopeRows = computed(() => {
  const experiment = selectedReportExperiment.value
  if (!experiment) return []
  return metrics.value
    .filter((metric) => experiment.metricIds.includes(metric.id))
    .flatMap((metric) =>
      metricFlexibleProperties(metric).map((property) => ({
        metricName: metric.name,
        scope: property.scope,
        propertyName: property.propertyName,
        operator: property.defaultOperator,
        value: draftFlexibleMetricValues.value[metric.id]?.[property.id] || flexibleDefaultText(property) || '全部',
        source: draftFlexibleMetricValues.value[metric.id]?.[property.id] ? '实验选择值' : '指标默认值',
      })),
    )
})

const reportMetricSnapshotRows = computed(() => {
  const experiment = selectedReportExperiment.value
  if (!experiment) return []
  const snapshots = metricBindingSnapshots.value.filter((snapshot) => snapshot.experimentId === experiment.id)
  if (snapshots.length) return snapshots
  return experiment.metricIds
    .map((metricId) => metrics.value.find((metric) => metric.id === metricId))
    .filter((metric): metric is Metric => Boolean(metric))
    .map((metric): MetricBindingSnapshot => {
      const group = metricGroups.value.find((item) => item.id === metric.metricGroupId)
      const definition = metric.definition
      const flexibleProperties = 'flexibleProperties' in definition ? definition.flexibleProperties : []
      return {
        id: `runtime_snapshot_${experiment.id}_${metric.id}`,
        experimentId: experiment.id,
        metricId: metric.id,
        metricGroupId: metric.metricGroupId,
        metricName: metric.name,
        metricGroupName: group?.name ?? metric.metricGroupId,
        metricRole: metric.id === experiment.coreMetricId ? 'core' : 'focus',
        metricCategory: metric.metricCategory,
        definition,
        numberFormat: metric.numberFormat,
        flexibleValues: flexibleProperties.map((property) => ({
          propertyId: property.propertyId,
          propertyName: property.propertyName,
          scope: property.scope,
          operator: property.defaultOperator,
          value: draftFlexibleMetricValues.value[metric.id]?.[property.id] || property.defaultValue,
          source: draftFlexibleMetricValues.value[metric.id]?.[property.id] ? 'experiment_value' : 'metric_default',
        })),
        statusAtBinding: metric.status,
        snapshotVersion: 0,
        source: 'experiment_create',
        capturedAt: experiment.createdAt,
      }
    })
})

function applyMetricTemplateToExperimentDraft() {
  if (!draftMetricTemplateId.value) {
    message.warning('请选择指标模板')
    return
  }
  const count = abStore.applyMetricTemplateToDraft(draftMetricTemplateId.value)
  seedDraftFlexibleDefaults()
  message[count ? 'success' : 'warning'](count ? `已从模板带入 ${count} 个指标` : '模板内没有可用指标')
}

async function saveDraftMetricsAsTemplate() {
  const metricGroupIds = [...new Set(draftMetricSnapshots.value.map((metric) => metric.metricGroupId))]
  if (!metricGroupIds.length) {
    message.warning('请先选择至少一个实验指标')
    return
  }
  const metricGroupNames = metricGroups.value
    .filter((group) => metricGroupIds.includes(group.id))
    .map((group) => group.name)
    .join('、')
  const result = await abStore.createMetricTemplate({
    appId: draftExperiment.value.appId,
    name: `${draftExperiment.value.name || '未命名实验'}指标模板`,
    description: metricGroupNames ? `从实验创建页已选指标保存：${metricGroupNames}` : '从实验创建页已选指标保存。',
    ownerId: permissionContext.value.userId,
    templateType: 'personal',
    availableUserIds: [],
    metricGroupIds,
  })
  message[result.template ? 'success' : 'warning'](result.message)
}

watch(draftMetricSnapshots, seedDraftFlexibleDefaults, { deep: true, immediate: true })

const featureFilterAppStorageKey = 'ab_feature_recent_app_id'
function getFeatureFilterStorage() {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function readRecentFeatureAppId() {
  return getFeatureFilterStorage()?.getItem(featureFilterAppStorageKey) || null
}

function persistRecentFeatureAppId(appId: EntityId | null) {
  if (!appId) return
  getFeatureFilterStorage()?.setItem(featureFilterAppStorageKey, appId)
}

const featureKeyword = ref('')
const featureFilterAppId = ref<EntityId | null>(readRecentFeatureAppId())
const featureFilterStatuses = ref<FeatureStatus[]>([])
const featureFilterPublishStatuses = ref<FeaturePublishStatus[]>([])
const featureFilterTerminalTypes = ref<FeatureFlag['terminalType'][]>([])
const featureFilterTags = ref<string[]>([])
const featureFilterOwnerId = ref<EntityId | null>(null)
const featurePage = ref(1)
const featurePageSize = ref(8)
const featureCreateHelpKey = ref('key')
const featureCreateErrors = ref<string[]>([])
const featureCreatePublishTraffic = ref(20)
const featureDraftVariantNameRefs = ref<Record<EntityId, { focus?: () => void } | null>>({})
const draggedFeatureAudienceRuleId = ref<EntityId | null>(null)
const featureVariableDrafts = ref<FeatureVariableDraft[]>([
  {
    id: 'var_city',
    name: '城市',
    key: 'city',
    type: 'string',
    description: '用户城市，用于核心城市受众判断',
    required: true,
    defaultValue: '北京',
  },
])
const solidifyStep = ref(1)
const featureVersionDiffBaseId = ref<EntityId | null>(null)
const whitelistKeyword = ref('')
const whitelistStatusFilter = ref<WhitelistTest['status'] | 'all'>('all')
const featureHistoryKeyword = ref('')
const featureHistoryAppIdFilter = ref<EntityId | null>(null)
const featureHistoryStatusFilter = ref<FeaturePublishStatus | 'all'>('all')
const featureHistoryActionFilter = ref('all')
const featureHistoryTagFilter = ref<string[]>([])
const featureHistoryOperatorFilter = ref<EntityId | null>(null)
const featureHistoryStartTime = ref('')
const featureHistoryEndTime = ref('')
const featureLifecycleStartTime = ref('')
const featureLifecycleEndTime = ref('')
const featureLifecycleActionFilter = ref('all')
const featureLifecycleOperatorFilter = ref<EntityId | null>(null)
const featureLifecycleMetricMode = ref<'requests' | 'users'>('requests')
const featureLogKeyword = ref('')
const featureLogActionFilter = ref('all')
const featureLogOperatorFilter = ref<EntityId | null>(null)
const featureLogStartTime = ref('')
const featureLogEndTime = ref('')
const featureLogDetailVisible = ref(false)
const selectedFeatureLogId = ref<EntityId | null>(null)
const featurePermissionModalVisible = ref(false)
const featurePermissionDraftType = ref<FeatureFlag['featureType']>('public')
const featureImagePreviewVisible = ref(false)
const featureVariantPreviewUrl = ref('')
const featurePublishConfirmVisible = ref(false)
const publishPlanFrequencyHours = ref(4)
const publishPlanStepTraffic = ref(30)
const publishPlanRollbackEnabled = ref(false)
const publishPlanConfirmationEnabled = ref(false)
const createEmptyFeatureParamValidation = () => ({
  enabled: false,
  testValue: '',
  testResult: '',
  stringMinLength: null as number | null,
  stringMaxLength: null as number | null,
  stringPattern: '',
  stringEnums: '',
  numberMin: null as number | null,
  numberMax: null as number | null,
  numberDecimalPlaces: 5,
  numberAllowNegative: true,
  jsonRequiredFields: '',
  jsonFieldTypes: '',
  jsonSchemaText: '',
})
const featureParamValidation = ref(createEmptyFeatureParamValidation())
type FeatureVariableDraft = {
  id: string
  name: string
  key: string
  type: 'string' | 'number' | 'boolean' | 'json'
  description: string
  required: boolean
  defaultValue: string
}
const featureVariableTypeOptions = [
  { label: 'string', value: 'string' },
  { label: 'number', value: 'number' },
  { label: 'boolean', value: 'boolean' },
  { label: 'json', value: 'json' },
]
const featureAudienceSourceOptions = [
  { label: '用户属性', value: 'user_property' },
  { label: '设备属性', value: 'device_property' },
  { label: '事件属性', value: 'event_property' },
  { label: '自定义变量', value: 'custom_variable' },
  { label: '用户分群', value: 'segment' },
]
const featureAudienceOperatorOptions = [
  { label: '等于', value: 'eq' },
  { label: '不等于', value: 'neq' },
  { label: '包含任一', value: 'in' },
  { label: '不包含任一', value: 'not_in' },
  { label: '文本包含', value: 'contains' },
  { label: '文本不包含', value: 'not_contains' },
  { label: '大于', value: 'gt' },
  { label: '大于等于', value: 'gte' },
  { label: '小于', value: 'lt' },
  { label: '小于等于', value: 'lte' },
]
const featureDeliveryTypeOptions = [
  { label: '不下发参数值', value: 'no_value' },
  { label: '单一变体', value: 'single_variant' },
  { label: '多变体按比例', value: 'multi_variant' },
]
const defaultFeatureCreateHelpSection = { key: 'basic', label: '基本信息', description: 'Key、名称、描述、配图、Owner、标签和终端类型。' }
const featureCreateHelpSections = [
  defaultFeatureCreateHelpSection,
  { key: 'variables', label: '自定义变量', description: '配置运行时上下文变量，供发布受众规则引用。' },
  { key: 'variants', label: '设置变体', description: '选择变体类型，维护变体值、描述、配图和参数校验。' },
  { key: 'audience', label: '发布受众', description: '按 if / else 顺序配置命中条件和下发变体。' },
  { key: 'code', label: '示例代码', description: '展示研发接入时需要使用的 key、默认值和上下文。' },
  { key: 'actions', label: '底部按钮', description: '保存草稿不影响线上，保存并发布进入发布流程。' },
]
const activeFeatureCreateHelp = computed(
  () => featureCreateHelpSections.find((section) => section.key === featureCreateHelpKey.value) ?? defaultFeatureCreateHelpSection,
)

const featureAppOptions = computed(() => {
  const appIds = new Set<EntityId>([
    ...featureFlags.value.map((feature) => feature.appId),
    ...experiments.value.map((experiment) => experiment.appId),
    featureDraft.value.appId,
  ].filter(Boolean))
  return [...appIds].map((appId) => ({ label: appId, value: appId }))
})

const defaultFeatureFilterAppId = computed<EntityId | null>(() => {
  const storedAppId = readRecentFeatureAppId()
  const appValues = featureAppOptions.value.map((option) => option.value)
  if (storedAppId && appValues.includes(storedAppId)) return storedAppId
  return appValues[0] ?? null
})

const featureTagOptions = computed(() => {
  const tags = new Set(featureFlags.value.flatMap((feature) => feature.tags))
  return [...tags].map((tag) => ({ label: tag, value: tag }))
})

const featureDraftTagOptions = computed(() => {
  const tags = new Set([...featureTagOptions.value.map((tag) => tag.value), ...featureDraft.value.tags])
  return [...tags].map((tag) => ({ label: tag, value: tag }))
})

const featureOwnerOptions = computed(() => {
  const owners = new Set(featureFlags.value.flatMap((feature) => feature.owners))
  return [...owners].map((ownerId) => ({ label: ownerId, value: ownerId }))
})

const featureOwnerSelectOptions = computed(() =>
  (abStore.appMembers ?? []).map((member) => ({
    label: `${member.name} · ${member.jobNo} · ${member.email}`,
    value: member.id,
  })),
)

const selectedFeatureAppInfo = computed(() => {
  const appId = featureDraft.value.appId
  const featureCount = featureFlags.value.filter((feature) => feature.appId === appId).length
  return {
    appId,
    featureCount,
    permission: canCreateFeature.value ? '可创建 Feature' : '无创建权限',
  }
})

const canCreateFeature = computed(
  () =>
    permissionContext.value.permissions.create_feature === true ||
    permissionContext.value.roles.includes('SUPER_ADMIN') ||
    permissionContext.value.roles.includes('APP_ADMIN'),
)
const hasMultipleFeatureApps = computed(() => featureAppOptions.value.length > 1)
const canOpenCreateFeatureFromList = computed(
  () => canCreateFeature.value && (!hasMultipleFeatureApps.value || Boolean(featureFilterAppId.value)),
)
const createFeatureButtonHint = computed(() => {
  if (!canCreateFeature.value) return '当前用户缺少创建 Feature 权限'
  if (hasMultipleFeatureApps.value && !featureFilterAppId.value) return '请先选择应用'
  return '创建 Feature'
})

function getFeaturePermission(feature: FeatureFlag) {
  return getAbPermissionLevel(permissionContext.value, {
    ownerIds: feature.owners,
    visibility: feature.featureType,
  })
}

function canOperateFeature(feature: FeatureFlag, action: string) {
  return canUseAbAction(permissionContext.value, action, getFeaturePermission(feature)).allowed
}

const visibleFeatureFlags = computed(() =>
  featureFlags.value.filter((feature) => getFeaturePermission(feature) !== 'none' && feature.status !== 'deleted'),
)

const featureRouteFeatureId = computed(() => String(route.params.featureId ?? ''))
const featureRouteForbidden = computed(() =>
  Boolean(featureRouteFeatureId.value && !visibleFeatureFlags.value.some((feature) => feature.featureId === featureRouteFeatureId.value)),
)

const filteredFeatureFlags = computed(() => {
  const keyword = featureKeyword.value.trim().toLowerCase()
  return visibleFeatureFlags.value.filter((feature) => {
    const keywordMatched =
      !keyword ||
      feature.name.toLowerCase().includes(keyword) ||
      feature.key.toLowerCase().includes(keyword) ||
      feature.description.toLowerCase().includes(keyword) ||
      feature.tags.some((tag) => tag.toLowerCase().includes(keyword))
    const appMatched = !featureFilterAppId.value || feature.appId === featureFilterAppId.value
    const statusMatched = !featureFilterStatuses.value.length || featureFilterStatuses.value.includes(feature.status)
    const publishMatched =
      !featureFilterPublishStatuses.value.length || featureFilterPublishStatuses.value.includes(feature.publishStatus)
    const terminalMatched =
      !featureFilterTerminalTypes.value.length || featureFilterTerminalTypes.value.includes(feature.terminalType)
    const tagMatched =
      !featureFilterTags.value.length || featureFilterTags.value.every((tag) => feature.tags.includes(tag))
    const ownerMatched = !featureFilterOwnerId.value || feature.owners.includes(featureFilterOwnerId.value)
    return keywordMatched && appMatched && statusMatched && publishMatched && terminalMatched && tagMatched && ownerMatched
  })
})

const pagedFeatureFlags = computed(() => {
  const start = (featurePage.value - 1) * featurePageSize.value
  return filteredFeatureFlags.value.slice(start, start + featurePageSize.value)
})

type FeatureLifecycleItem = {
  id: EntityId
  sourceAction: string
  actionLabel: string
  operatorId: EntityId
  operatorName: string
  createdAt: string
  description: string
  versionLabel: string
  experimentLabel: string
}

const selectedFeatureLogs = computed(() => {
  const versionIds = new Set(selectedFeatureVersions.value.map((version) => version.versionId))
  return operationLogs.value.filter(
    (log) =>
      log.objectId === selectedFeatureId.value ||
      versionIds.has(log.objectId) ||
      (selectedFeature.value && JSON.stringify(log.after ?? {}).includes(selectedFeature.value.featureId)),
  )
})

const featureLifecycleSourceItems = computed<FeatureLifecycleItem[]>(() => {
  const feature = selectedFeature.value
  if (!feature) return []
  const createdItem: FeatureLifecycleItem = {
    id: `${feature.featureId}_created`,
    sourceAction: 'create_feature',
    actionLabel: '创建 Feature',
    operatorId: feature.createdBy,
    operatorName: getMemberDisplay(feature.createdBy),
    createdAt: feature.createdAt,
    description: feature.description || 'Feature 创建',
    versionLabel: formatFeatureVersionRef(feature.currentVersionId),
    experimentLabel: '-',
  }
  const logItems = selectedFeatureLogs.value.map((log): FeatureLifecycleItem => ({
    id: log.id,
    sourceAction: log.action,
    actionLabel: formatFeatureLogAction(log.action),
    operatorId: log.operatorId,
    operatorName: log.operatorName,
    createdAt: log.createdAt,
    description: getFeatureHistoryDescription(log),
    versionLabel: getFeatureHistoryAfterVersion(log),
    experimentLabel: '-',
  }))
  const experimentItems = feature.relatedExperimentIds
    .map((experimentId) => experiments.value.find((experiment) => experiment.id === experimentId))
    .filter((experiment): experiment is Experiment => Boolean(experiment))
    .map((experiment): FeatureLifecycleItem => ({
      id: `${feature.featureId}_${experiment.id}`,
      sourceAction: 'experiment_start',
      actionLabel: '开启 A/B 实验',
      operatorId: experiment.ownerId,
      operatorName: experiment.owner.name,
      createdAt: experiment.startedAt ?? experiment.createdAt,
      description: `${experiment.name} · ${statusLabels[experiment.status]}`,
      versionLabel: '-',
      experimentLabel: experiment.name,
    }))
  return [createdItem, ...logItems, ...experimentItems].sort((left, right) => right.createdAt.localeCompare(left.createdAt))
})

const featureLifecycleActionOptions = computed(() => [
  { label: '全部操作', value: 'all' },
  ...[...new Map(featureLifecycleSourceItems.value.map((item) => [item.sourceAction, item.actionLabel])).entries()]
    .map(([value, label]) => ({ label, value })),
])

const featureLifecycleOperatorOptions = computed(() => [
  ...new Map(featureLifecycleSourceItems.value.map((item) => [item.operatorId, item.operatorName])).entries(),
].map(([value, label]) => ({ label, value })))

const selectedFeatureLifecycleItems = computed(() => {
  const startTime = getHistoryFilterTime(featureLifecycleStartTime.value)
  const endTime = getHistoryFilterTime(featureLifecycleEndTime.value, true)
  return featureLifecycleSourceItems.value.filter((item) => {
    const itemTime = new Date(item.createdAt).getTime()
    const timeMatched = (!startTime || itemTime >= startTime) && (!endTime || itemTime <= endTime)
    const actionMatched = featureLifecycleActionFilter.value === 'all' || item.sourceAction === featureLifecycleActionFilter.value
    const operatorMatched = !featureLifecycleOperatorFilter.value || item.operatorId === featureLifecycleOperatorFilter.value
    return timeMatched && actionMatched && operatorMatched
  })
})

const featurePublishHistoryRows = computed<OperationLog[]>(() => {
  const publishHistoryActions = [
    '发布 Feature 灰度',
    'publish_plan',
    'publish_feature',
    'schedule_feature_publish',
    'schedule_feature_publish_failed',
    'cancel_feature_publish',
    'rollback_feature',
    'rollback_feature_close',
    'feature_disable',
    'feature_enable',
    'feature_delete',
  ]
  const publishLogs = operationLogs.value.filter((log) =>
    publishHistoryActions.includes(log.action),
  )
  const loggedPublishIds = new Set(
    publishLogs
      .map((log) => {
        const planPayload = log.after?.plan
        return planPayload && typeof planPayload === 'object' && 'publishId' in planPayload
          ? String((planPayload as { publishId: EntityId }).publishId)
          : ''
      })
      .filter(Boolean),
  )
  const planLogs: OperationLog[] = publishPlans.value
    .filter((plan) => !loggedPublishIds.has(plan.publishId))
    .map((plan) => ({
      id: `publish_plan_${plan.publishId}`,
      objectType: 'FEATURE_VERSION',
      objectId: plan.versionId,
      action: 'publish_plan',
      operatorId: plan.createdBy,
      operatorName: plan.createdBy,
      after: {
        status: plan.status ?? 'running',
        publishStatus:
          plan.status === 'completed'
            ? 'full'
            : plan.status === 'canceled'
              ? 'canceled'
              : plan.status === 'failed'
                ? 'failed'
                : 'gray',
        plan,
      },
      createdAt: plan.steps[0]?.publishTime ?? new Date().toISOString(),
    }))
  return [...publishLogs, ...planLogs].sort((left, right) => right.createdAt.localeCompare(left.createdAt))
})

const featureHistoryActionOptions = computed(() => [
  { label: '全部操作', value: 'all' },
  ...[...new Set(featurePublishHistoryRows.value.map((log) => log.action))].map((action) => ({
    label: formatFeatureLogAction(action),
    value: action,
  })),
])

const featureHistoryStatusOptions = computed(() => [
  { label: '全部状态', value: 'all' },
  ...Object.entries(featurePublishStatusLabels).map(([value, label]) => ({ label, value })),
  { label: '失败', value: 'failed' },
])

const featureHistoryOperatorOptions = computed(() => {
  const operatorMap = new Map<EntityId, string>()
  featurePublishHistoryRows.value.forEach((log) => {
    operatorMap.set(log.operatorId, log.operatorName)
  })
  return [...operatorMap.entries()].map(([value, label]) => ({ label, value }))
})

const filteredFeaturePublishHistoryRows = computed(() => {
  const keyword = featureHistoryKeyword.value.trim().toLowerCase()
  const startTime = getHistoryFilterTime(featureHistoryStartTime.value)
  const endTime = getHistoryFilterTime(featureHistoryEndTime.value, true)
  return featurePublishHistoryRows.value.filter((log) => {
    const feature = getFeatureFromLog(log)
    const logText = featureLogSearchText(log, feature)
    const keywordMatched = !keyword || logText.includes(keyword)
    const appMatched = !featureHistoryAppIdFilter.value || feature?.appId === featureHistoryAppIdFilter.value
    const actionMatched = featureHistoryActionFilter.value === 'all' || log.action === featureHistoryActionFilter.value
    const statusMatched =
      featureHistoryStatusFilter.value === 'all' || getFeatureLogStatus(log) === featureHistoryStatusFilter.value
    const tagMatched =
      !featureHistoryTagFilter.value.length || featureHistoryTagFilter.value.every((tag) => feature?.tags.includes(tag))
    const operatorMatched = !featureHistoryOperatorFilter.value || log.operatorId === featureHistoryOperatorFilter.value
    const logTime = new Date(log.createdAt).getTime()
    const timeMatched =
      (!startTime || logTime >= startTime) &&
      (!endTime || logTime <= endTime)
    return keywordMatched && appMatched && actionMatched && statusMatched && tagMatched && operatorMatched && timeMatched
  })
})

const featureLogActionOptions = computed(() => [
  { label: '全部操作', value: 'all' },
  ...[...new Set(selectedFeatureLogs.value.map((log) => log.action))].map((action) => ({
    label: formatFeatureLogAction(action),
    value: action,
  })),
])

const featureLogOperatorOptions = computed(() => [
  ...new Map(selectedFeatureLogs.value.map((log) => [log.operatorId, log.operatorName])).entries(),
].map(([value, label]) => ({ label, value })))

const filteredSelectedFeatureLogs = computed(() => {
  const keyword = featureLogKeyword.value.trim().toLowerCase()
  const startTime = getHistoryFilterTime(featureLogStartTime.value)
  const endTime = getHistoryFilterTime(featureLogEndTime.value, true)
  return selectedFeatureLogs.value.filter((log) => {
    const keywordMatched = !keyword || featureLogSearchText(log, selectedFeature.value).includes(keyword)
    const actionMatched = featureLogActionFilter.value === 'all' || log.action === featureLogActionFilter.value
    const operatorMatched = !featureLogOperatorFilter.value || log.operatorId === featureLogOperatorFilter.value
    const logTime = new Date(log.createdAt).getTime()
    const timeMatched = (!startTime || logTime >= startTime) && (!endTime || logTime <= endTime)
    return keywordMatched && actionMatched && operatorMatched && timeMatched
  })
})

const selectedFeatureLog = computed(() =>
  operationLogs.value.find((log) => log.id === selectedFeatureLogId.value) ??
  featurePublishHistoryRows.value.find((log) => log.id === selectedFeatureLogId.value),
)

const selectedFeatureCanCollaborate = computed(() =>
  Boolean(selectedFeature.value && canOperateFeature(selectedFeature.value, 'create_feature')),
)
const selectedFeatureCanPublish = computed(() =>
  Boolean(selectedFeature.value && canOperateFeature(selectedFeature.value, 'publish_feature')),
)
const selectedFeatureCanDelete = computed(() =>
  Boolean(selectedFeature.value && canOperateFeature(selectedFeature.value, 'delete_feature')),
)
const selectedFeatureCanManagePermission = computed(() =>
  Boolean(selectedFeature.value && canOperateFeature(selectedFeature.value, 'manage_feature_permission')),
)

const featurePermissionCurrentLevelLabel = computed(() =>
  featurePermissionLevelLabels[selectedFeaturePermission.value as AbPermissionLevel] ?? String(selectedFeaturePermission.value),
)
const featurePermissionDraftHint = computed(() => {
  const feature = selectedFeature.value
  if (!feature) return '请选择 Feature 后再调整权限。'
  if (featurePermissionDraftType.value === feature.featureType) {
    return feature.featureType === 'public'
      ? '当前为公开 Feature，普通用户可查看，写操作仍需协作者权限。'
      : '当前为私有 Feature，仅集团管理员、应用管理员、创建者和 Owner 可见。'
  }
  return featurePermissionDraftType.value === 'private'
    ? '切换为私有后，普通用户将不可见该 Feature；只有集团管理员、应用管理员、创建者和 Owner 可查看和协作。'
    : '切换为公开后，普通用户可查看列表、详情、操作历史和发布历史；写操作仍仅协作者可用。'
})
const featurePermissionActionRows = computed(() => {
  const feature = selectedFeature.value
  return [
    {
      action: '新建',
      allowed: canCreateFeature.value,
      note: '默认创建公开 Feature',
    },
    {
      action: '编辑',
      allowed: Boolean(feature && canEditFeature(feature)),
      note: '基础信息、变体和规则',
    },
    {
      action: '发布',
      allowed: Boolean(feature && selectedFeatureCanPublish.value && getFeaturePublishActionLabel(feature).includes('发布')),
      note: '灰度发布、定时发布和发布确认',
    },
    {
      action: '回滚',
      allowed: Boolean(feature && selectedFeatureCanPublish.value && getFeaturePublishActionLabel(feature).includes('回滚')),
      note: '回滚到上一个全量版本或关闭 Feature',
    },
    {
      action: '开启',
      allowed: Boolean(feature && selectedFeatureCanDelete.value && feature.status === 'disabled'),
      note: '关闭后可重新开启',
    },
    {
      action: '关闭',
      allowed: Boolean(feature && selectedFeatureCanDelete.value && feature.status === 'enabled'),
      note: '关闭后流量回落到本地默认值',
    },
    {
      action: '关联实验',
      allowed: Boolean(feature && canCreateExperimentFromFeature(feature)),
      note: '将 Feature Key、变体和值带入实验草稿',
    },
    {
      action: '白名单',
      allowed: Boolean(feature && selectedFeatureCanCollaborate.value),
      note: '创建、终止或删除 QA 白名单',
    },
    {
      action: '删除',
      allowed: Boolean(feature && canDeleteFeature(feature)),
      note: '需先关闭且无运行中实验或灰度版本',
    },
    {
      action: '权限管理',
      allowed: selectedFeatureCanManagePermission.value,
      note: '只有协作者可修改公开 / 私有类型',
    },
  ]
})

const featureUsageTrendRows = computed(() => {
  const feature = selectedFeature.value
  if (!feature) return []
  const publishTraffic = selectedCurrentFeatureVersion.value?.publishTraffic ?? selectedLatestFeatureVersion.value?.publishTraffic ?? 0
  const base = Math.max(1600, selectedFeatureVersions.value.length * 1800 + publishTraffic * 140)
  const enabledFactor = feature.status === 'enabled' ? 1 : 0
  return Array.from({ length: 30 }, (_, index) => {
    const dayOffset = 29 - index
    const date = new Date(Date.now() - dayOffset * 24 * 60 * 60 * 1000)
    const factor = 0.82 + index * 0.045 + feature.tags.length * 0.018
    const requests = Math.round(base * factor * enabledFactor)
    const hits = Math.round(requests * Math.max(0.08, publishTraffic / 100))
    const hitUsers = Math.round(hits * (0.36 + (index % 4) * 0.018))
    return {
      date: date.toISOString().slice(0, 10),
      exposures: requests,
      requests,
      hits,
      hitUsers,
      hitRate: requests ? Number(((hits / requests) * 100).toFixed(1)) : 0,
    }
  })
})

const featureVariantUsageSummary = computed(() => {
  const totalRequests = featureUsageTrendRows.value.reduce((sum, row) => sum + row.requests, 0)
  const version = selectedCurrentFeatureVersion.value ?? selectedLatestFeatureVersion.value
  const publishTraffic = version?.publishTraffic ?? 0
  const localDefaultRequests = selectedFeature.value?.status === 'enabled'
    ? Math.round(totalRequests * Math.max(0, 100 - publishTraffic) / 100)
    : totalRequests
  const activeRequests = Math.max(0, totalRequests - localDefaultRequests)
  const hasNoValueRule = Boolean(
    version && [...version.audienceRules, version.defaultRule].some((rule) => rule.deliveryType === 'no_value'),
  )
  const noValueRequests = hasNoValueRule ? Math.round(activeRequests * 0.08) : 0
  return {
    totalRequests,
    activeRequests,
    noValueRequests,
    localDefaultRequests,
    noValueRatio: totalRequests ? Number(((noValueRequests / totalRequests) * 100).toFixed(1)) : 0,
    localDefaultRatio: totalRequests ? Number(((localDefaultRequests / totalRequests) * 100).toFixed(1)) : 0,
  }
})

const featureVariantUsageRows = computed(() => {
  const version = selectedCurrentFeatureVersion.value ?? selectedLatestFeatureVersion.value
  if (!version) return []
  const weighted = version.defaultRule.variantWeights?.length ? version.defaultRule.variantWeights : undefined
  const fallbackWeight = version.variants.length ? Number((100 / version.variants.length).toFixed(1)) : 0
  const distributableRequests = Math.max(
    0,
    featureVariantUsageSummary.value.totalRequests -
      featureVariantUsageSummary.value.localDefaultRequests -
      featureVariantUsageSummary.value.noValueRequests,
  )
  return version.variants.map((variant, index) => {
    const weight = weighted?.find((item) => item.variantId === variant.variantId)?.weight ?? fallbackWeight
    const requestCount = Math.round(distributableRequests * weight / 100)
    const ratio = featureVariantUsageSummary.value.totalRequests
      ? Number(((requestCount / featureVariantUsageSummary.value.totalRequests) * 100).toFixed(1))
      : 0
    return {
      variantId: variant.variantId,
      name: variant.name,
      value: JSON.stringify(variant.value),
      traffic: ratio,
      requestCount,
      ratio,
      sampleUsers: Math.round(requestCount * 0.38 + index * 17),
    }
  })
})

const featureLifecycleTrendSeries = computed(() => {
  const version = selectedCurrentFeatureVersion.value ?? selectedLatestFeatureVersion.value
  if (!version) return []
  const weighted = version.defaultRule.variantWeights?.length ? version.defaultRule.variantWeights : undefined
  const fallbackWeight = version.variants.length ? Number((100 / version.variants.length).toFixed(1)) : 0
  const rawSeries = version.variants.map((variant, variantIndex) => {
    const weight = weighted?.find((item) => item.variantId === variant.variantId)?.weight ?? fallbackWeight
    return {
      variantId: variant.variantId,
      name: variant.name,
      color: trendPalette[variantIndex % trendPalette.length] ?? '#2563eb',
      points: featureUsageTrendRows.value.map((row, index, rows) => {
        const requestCount = Math.round(row.requests * weight / 100)
        const hitUsers = Math.round(row.hitUsers * weight / 100)
        const value = featureLifecycleMetricMode.value === 'requests' ? requestCount : hitUsers
        return {
          date: row.date,
          requestCount,
          hitUsers,
          value,
          x: rows.length <= 1 ? 0 : Number(((index / (rows.length - 1)) * 100).toFixed(2)),
          y: 0,
        }
      }),
    }
  })
  const maxValue = Math.max(...rawSeries.flatMap((series) => series.points.map((point) => point.value)), 1)
  return rawSeries.map((series) => ({
    ...series,
    points: series.points.map((point) => ({
      ...point,
      y: Number((92 - (point.value / maxValue) * 84).toFixed(2)),
    })),
  })).map((series) => ({
    ...series,
    polyline: series.points.map((point) => `${point.x},${point.y}`).join(' '),
  }))
})

const featureRecentChangeRows = computed(() => {
  const version = selectedCurrentFeatureVersion.value ?? selectedLatestFeatureVersion.value
  if (!version) return []
  const latestUsage = featureUsageTrendRows.value.at(-1)
  return version.variants.map((variant) => {
    const usage = featureVariantUsageRows.value.find((row) => row.variantId === variant.variantId)
    const relatedLog = selectedFeatureLogs.value.find((log) =>
      JSON.stringify(log.after ?? {}).includes(variant.variantId) ||
      JSON.stringify(log.before ?? {}).includes(variant.variantId),
    )
    return {
      variantId: variant.variantId,
      name: variant.name,
      value: JSON.stringify(variant.value),
      lastChangedAt: relatedLog?.createdAt ?? version.createdAt,
      lastUsedAt: latestUsage?.date ?? '-',
      lastUsage: usage?.requestCount ?? 0,
    }
  })
})

const featureLifecyclePromptRows = computed<Array<{
  rule: string
  type: 'success' | 'warning' | 'error'
  status: string
  detail: string
}>>(() => {
  const feature = selectedFeature.value
  if (!feature) return []
  const daysSinceUpdate = Math.floor((Date.now() - new Date(feature.updatedAt).getTime()) / (24 * 60 * 60 * 1000))
  const totalRequests = featureVariantUsageSummary.value.totalRequests
  const rollbackCount =
    selectedFeatureVersions.value.filter((version) => version.versionStatus === 'rolled_back').length +
    selectedFeatureLogs.value.filter((log) => ['rollback_feature', 'rollback_feature_close'].includes(log.action)).length
  const highFrequency = totalRequests >= 100000
  return [
    {
      rule: '近 30 天无请求',
      type: totalRequests === 0 ? 'warning' : 'success',
      status: totalRequests === 0 ? '需清理' : '正常',
      detail: totalRequests === 0 ? '近 30 天没有请求命中，建议确认代码读取点后清理。' : `近 30 天请求 ${formatNumber(totalRequests)} 次。`,
    },
    {
      rule: '已关闭超过 30 天',
      type: feature.status === 'disabled' && daysSinceUpdate >= 30 ? 'warning' : 'success',
      status: feature.status === 'disabled' && daysSinceUpdate >= 30 ? '需清理' : '正常',
      detail: feature.status === 'disabled'
        ? `已关闭 ${daysSinceUpdate} 天。`
        : 'Feature 当前未关闭。',
    },
    {
      rule: '长期无变更但高频使用',
      type: daysSinceUpdate >= 30 && highFrequency ? 'warning' : 'success',
      status: daysSinceUpdate >= 30 && highFrequency ? '需复核' : '正常',
      detail: daysSinceUpdate >= 30 && highFrequency
        ? '长期未变更但仍有高频请求，建议复核 Owner 与配置归属。'
        : `最近 ${daysSinceUpdate} 天内有变更或请求量未达高频阈值。`,
    },
    {
      rule: '多次回滚',
      type: rollbackCount >= 2 ? 'error' : rollbackCount === 1 ? 'warning' : 'success',
      status: rollbackCount >= 2 ? '高风险' : rollbackCount === 1 ? '关注' : '正常',
      detail: rollbackCount ? `已出现 ${rollbackCount} 次回滚记录。` : '暂无回滚记录。',
    },
  ]
})

const featureCleanupHints = computed(() => {
  if (!selectedFeature.value) return ['请选择 Feature 后查看清理提示。']
  const hints: string[] = []
  const feature = selectedFeature.value
  const daysSinceUpdate = Math.floor((Date.now() - new Date(feature.updatedAt).getTime()) / (24 * 60 * 60 * 1000))
  if (feature.status === 'disabled' || feature.publishStatus === 'disabled') {
    hints.push('Feature 已关闭，建议确认代码默认值后清理读取点。')
  }
  if (feature.publishStatus === 'unpublished' && selectedFeatureVersions.value.length > 1) {
    hints.push('存在多个未发布版本，可合并无效草稿或保留最新版本。')
  }
  if (daysSinceUpdate >= 30) {
    hints.push(`已 ${daysSinceUpdate} 天未更新，建议复核 Owner 与业务归属。`)
  }
  if (selectedWhitelistTests.value.some((test) => test.status === 'expired')) {
    hints.push('存在已过期白名单测试，可删除或复制为新的 7 天测试。')
  }
  if (selectedFeatureVersions.value.some((version) => ['rolled_back', 'canceled', 'disabled'].includes(version.versionStatus))) {
    hints.push('存在已回滚、取消或禁用版本，发布前需重新编辑生成新版本。')
  }
  featureLifecyclePromptRows.value
    .filter((row) => row.type !== 'success')
    .forEach((row) => hints.push(`${row.rule}：${row.detail}`))
  return hints.length ? hints : ['当前配置无明显清理风险，保持发布历史和操作日志即可追溯。']
})

const selectedFeatureVersionForAction = computed(() =>
  selectedFeatureVersions.value.find((version) => version.versionId === featurePublishDraft.value.versionId) ??
  selectedCurrentFeatureVersion.value ??
  selectedLatestFeatureVersion.value,
)

const featureVersionDiffBase = computed(() =>
  selectedFeatureVersions.value.find((version) => version.versionId === featureVersionDiffBaseId.value) ??
  selectedFeatureVersions.value.find((version) => version.versionId !== selectedFeatureVersionForAction.value?.versionId),
)

const selectedFeatureVersionDiffRows = computed(() => {
  const current = selectedFeatureVersionForAction.value
  const base = featureVersionDiffBase.value
  if (!current || !base) return []
  const currentVariants = new Map(current.variants.map((variant) => [variant.variantId, variant]))
  const baseVariants = new Map(base.variants.map((variant) => [variant.variantId, variant]))
  const variantIds = new Set([...currentVariants.keys(), ...baseVariants.keys()])
  const rows = [...variantIds].map((variantId) => {
    const before = baseVariants.get(variantId)
    const after = currentVariants.get(variantId)
    return {
      key: `variant_${variantId}`,
      field: `变体 ${after?.name ?? before?.name ?? variantId}`,
      before: before ? JSON.stringify(before.value) : '未配置',
      after: after ? JSON.stringify(after.value) : '已删除',
      changed: JSON.stringify(before?.value) !== JSON.stringify(after?.value),
    }
  })
  rows.push(
    {
      key: 'audience_rules',
      field: '发布受众',
      before: base.audienceRules.map((rule) => rule.name).join('、') || '无 if 规则',
      after: current.audienceRules.map((rule) => rule.name).join('、') || '无 if 规则',
      changed: JSON.stringify(base.audienceRules) !== JSON.stringify(current.audienceRules),
    },
    {
      key: 'default_rule',
      field: 'else 默认规则',
      before: JSON.stringify(base.defaultRule),
      after: JSON.stringify(current.defaultRule),
      changed: JSON.stringify(base.defaultRule) !== JSON.stringify(current.defaultRule),
    },
  )
  return rows.filter((row) => row.changed)
})

function getMemberDisplay(userId?: string | null) {
  if (!userId) return '-'
  const option = appMemberOptions.value.find((item) => item.value === userId)
  return option?.label ?? userId
}

function formatFeatureVariantValue(value: unknown) {
  return typeof value === 'string' ? value : JSON.stringify(value)
}

function getFeatureVersionVariantName(version: FeatureVersion | undefined, variantId?: EntityId) {
  if (!variantId) return '不下发参数值'
  return version?.variants.find((variant) => variant.variantId === variantId)?.name ?? variantId
}

function describeAudienceConditions(rule: AudienceRule) {
  if (!rule.conditions.length) return '无过滤条件'
  return rule.conditions
    .map((condition) => `${condition.fieldSource}.${condition.fieldName || '-'} ${condition.operator} ${formatFeatureVariantValue(condition.value)}`)
    .join(' AND ')
}

function describeAudienceDelivery(rule: AudienceRule, version = selectedFeatureVersionForAction.value) {
  if (rule.deliveryType === 'no_value') return '不下发参数值'
  if (rule.deliveryType === 'single_variant') return `下发 ${getFeatureVersionVariantName(version, rule.variantId)}`
  const weights = rule.variantWeights ?? []
  return weights
    .map((item) => `${getFeatureVersionVariantName(version, item.variantId)} ${formatPercent(item.weight)}`)
    .join(' / ')
}

function isFeatureVersionCurrent(version: FeatureVersion) {
  return selectedFeature.value?.currentVersionId === version.versionId
}

function formatFeatureVersionVariantSummary(version: FeatureVersion) {
  return version.variants.map((variant) => `${variant.name}:${formatFeatureVariantValue(variant.value)}`).join(' / ')
}

const selectedFeatureVersionCanEdit = computed(() =>
  Boolean(
    selectedFeature.value &&
    selectedFeatureVersionForAction.value &&
    selectedFeatureVersionForAction.value.versionStatus !== 'disabled' &&
    selectedFeatureCanCollaborate.value,
  ),
)

const canPublishSelectedFeatureVersion = computed(() => {
  const version = selectedFeatureVersionForAction.value
  if (!selectedFeature.value || !version) return false
  return selectedFeature.value.status === 'enabled' && !['disabled', 'rolled_back', 'canceled'].includes(version.versionStatus)
})

const canRollbackSelectedFeature = computed(() =>
  Boolean(selectedFeature.value && ['gray', 'publish_confirm', 'full'].includes(selectedFeature.value.publishStatus)),
)

const canCancelSelectedPublish = computed(() => {
  const version = selectedFeatureVersionForAction.value
  return Boolean(version && version.versionStatus === 'pending_publish')
})

const canDisableSelectedFeatureVersion = computed(() => {
  const version = selectedFeatureVersionForAction.value
  if (!selectedFeature.value || !version || !selectedFeatureCanPublish.value) return false
  if (version.versionStatus === 'disabled') return false
  return !(selectedFeature.value.currentVersionId === version.versionId && ['gray', 'full', 'publish_confirm'].includes(version.versionStatus))
})

function getFeatureVersions(feature: FeatureFlag) {
  return featureVersions.value.filter((version) => version.featureId === feature.featureId)
}

function getFeatureCurrentVersion(feature: FeatureFlag) {
  return featureVersions.value.find((version) => version.versionId === feature.currentVersionId)
}

function getFeatureExperimentSourceVersion(feature: FeatureFlag) {
  return getFeatureCurrentVersion(feature) ?? getFeatureVersions(feature)[0]
}

function getFeatureCurrentVersionLabel(feature: FeatureFlag) {
  return getFeatureCurrentVersion(feature)?.versionNo ?? '-'
}

function hasUsableFeatureVersion(feature: FeatureFlag) {
  return getFeatureVersions(feature).some(
    (version) => !['disabled', 'rolled_back', 'canceled'].includes(version.versionStatus),
  )
}

function hasRunningRelatedExperiment(feature: FeatureFlag) {
  return feature.relatedExperimentIds.some((experimentId) => {
    const experiment = experiments.value.find((item) => item.id === experimentId)
    return experiment?.status === 'RUNNING'
  })
}

function hasBlockingPublishVersion(feature: FeatureFlag) {
  return getFeatureVersions(feature).some((version) =>
    ['pending_publish', 'gray', 'publish_confirm'].includes(version.versionStatus),
  )
}

function canEditFeature(feature: FeatureFlag) {
  return (
    canOperateFeature(feature, 'create_feature') &&
    feature.status === 'enabled' &&
    feature.publishStatus !== 'publish_confirm'
  )
}

function canCreateExperimentFromFeature(feature: FeatureFlag) {
  return (
    canOperateFeature(feature, 'create_feature') &&
    feature.status !== 'deleted' &&
    hasUsableFeatureVersion(feature) &&
    permissionContext.value.permissions.experiment_create === true
  )
}

function canDeleteFeature(feature: FeatureFlag) {
  return (
    canOperateFeature(feature, 'delete_feature') &&
    feature.status === 'disabled' &&
    !hasRunningRelatedExperiment(feature) &&
    !hasBlockingPublishVersion(feature)
  )
}

function getFeaturePublishActionLabel(feature: FeatureFlag) {
  if (feature.publishStatus === 'unpublished' || feature.publishStatus === 'pending_publish') return '发布'
  if (feature.publishStatus === 'gray') return '发布 / 回滚'
  if (feature.publishStatus === 'publish_confirm') return '发布确认 / 回滚'
  if (feature.publishStatus === 'full') return '回滚'
  if (feature.publishStatus === 'rolled_back') return ''
  return '发布'
}

const filteredSelectedWhitelistTests = computed(() => {
  const keyword = whitelistKeyword.value.trim().toLowerCase()
  return selectedWhitelistTests.value.filter((test) => {
    const keywordMatched =
      !keyword ||
      test.name.toLowerCase().includes(keyword) ||
      test.createdBy.toLowerCase().includes(keyword) ||
      Object.values(test.ruleUserIds).flat().some((userId) => userId.toLowerCase().includes(keyword))
    const statusMatched = whitelistStatusFilter.value === 'all' || test.status === whitelistStatusFilter.value
    return keywordMatched && statusMatched
  })
})

const whitelistDraftVersion = computed(() =>
  selectedFeatureVersions.value.find((version) => version.versionId === whitelistDraft.value.versionId) ??
  selectedCurrentFeatureVersion.value ??
  selectedLatestFeatureVersion.value,
)

const whitelistRuleOptions = computed(() => {
  const versionRules = whitelistDraft.value.versionMode === 'custom'
    ? [...featureVersionDraft.value.audienceRules, featureVersionDraft.value.defaultRule]
    : whitelistDraftVersion.value
      ? [...whitelistDraftVersion.value.audienceRules, whitelistDraftVersion.value.defaultRule]
      : []
  return versionRules.map((rule) => ({
    label: rule.ruleId === 'else'
      ? `else 默认规则 · ${describeAudienceDelivery(rule, whitelistDraftVersion.value)}`
      : `${rule.name} · ${describeAudienceConditions(rule)}`,
    value: rule.ruleId,
    rule,
  }))
})

function getWhitelistVersionLabel(test: WhitelistTest) {
  if ((test.versionMode ?? (test.versionId ? 'existing' : 'custom')) === 'custom') return '自定义配置'
  const version = selectedFeatureVersions.value.find((item) => item.versionId === test.versionId)
  return version ? `${version.versionNo} · ${featurePublishStatusLabels[version.versionStatus]}` : test.versionId || '-'
}

function getWhitelistModeLabel(test: WhitelistTest) {
  return (test.versionMode ?? (test.versionId ? 'existing' : 'custom')) === 'custom' ? '自定义配置' : '已有版本'
}

function getWhitelistStatusLabel(status: WhitelistTest['status']) {
  if (status === 'active') return '生效中'
  if (status === 'expired') return '已失效'
  return '已终止'
}

function getWhitelistStatusType(status: WhitelistTest['status']): 'success' | 'warning' | 'default' {
  if (status === 'active') return 'success'
  if (status === 'expired') return 'warning'
  return 'default'
}

function getWhitelistRuleLabel(ruleId: EntityId) {
  return whitelistRuleOptions.value.find((item) => item.value === ruleId)?.label ?? ruleId
}

function formatWhitelistRuleUsers(test: WhitelistTest) {
  return Object.entries(test.ruleUserIds)
    .map(([ruleId, userIds]) => `${getWhitelistRuleLabel(ruleId)}：${userIds.join('、')}`)
    .join('；')
}

function getWhitelistRuleUserText(ruleId: EntityId) {
  return (whitelistDraft.value.ruleUserIds?.[ruleId] ?? []).join(',')
}

function updateWhitelistRuleUsers(ruleId: EntityId, value: string) {
  const nextRuleUserIds = { ...(whitelistDraft.value.ruleUserIds ?? {}) }
  const userIds = value.split(',').map((item) => item.trim()).filter(Boolean)
  if (userIds.length) nextRuleUserIds[ruleId] = userIds
  else delete nextRuleUserIds[ruleId]
  whitelistDraft.value.ruleUserIds = nextRuleUserIds
  whitelistUserIdsText.value = Object.values(nextRuleUserIds).flat().join(',')
}

function setWhitelistRuleEnabled(ruleId: EntityId, checked: boolean) {
  const nextRuleUserIds = { ...(whitelistDraft.value.ruleUserIds ?? {}) }
  if (checked) {
    nextRuleUserIds[ruleId] = nextRuleUserIds[ruleId] ?? []
  } else {
    delete nextRuleUserIds[ruleId]
  }
  whitelistDraft.value.ruleUserIds = nextRuleUserIds
  whitelistUserIdsText.value = Object.values(nextRuleUserIds).flat().join(',')
}

function syncWhitelistDefaultRuleUsers() {
  const ruleIds = new Set(whitelistRuleOptions.value.map((item) => item.value))
  const nextRuleUserIds = Object.fromEntries(
    Object.entries(whitelistDraft.value.ruleUserIds ?? {}).filter(([ruleId]) => ruleIds.has(ruleId)),
  )
  if (!Object.keys(nextRuleUserIds).length) {
    const defaultRuleId = whitelistRuleOptions.value.find((item) => item.value === 'else')?.value ?? whitelistRuleOptions.value[0]?.value
    if (defaultRuleId) {
      nextRuleUserIds[defaultRuleId] = whitelistUserIdsText.value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    }
  }
  whitelistDraft.value.ruleUserIds = nextRuleUserIds
}

function buildFeatureCodeSnippet(feature: FeatureFlag | undefined, version: FeatureVersion | undefined) {
  if (!feature) return ''
  const defaultVariant = version?.defaultRule.variantId
    ? version.variants.find((variant) => variant.variantId === version.defaultRule.variantId)
    : version?.variants[0]
  const fallback = JSON.stringify(defaultVariant?.value ?? null)
  if (feature.terminalType === 'server') {
    return [
      `const value = await featureClient.get('${feature.key}', {`,
      "  userId: request.user.id,",
      "  context: { city: request.user.city, os: request.headers['x-os'] },",
      `  defaultValue: ${fallback},`,
      '})',
    ].join('\n')
  }
  return [
    `const value = await featureClient.get('${feature.key}', {`,
    '  userId: currentUser.id,',
    '  context: { city: currentUser.city, os: device.os },',
    `  defaultValue: ${fallback},`,
    '})',
  ].join('\n')
}

const selectedFeatureCodeSnippet = computed(() =>
  buildFeatureCodeSnippet(selectedFeature.value, selectedCurrentFeatureVersion.value ?? selectedLatestFeatureVersion.value),
)

const selectedFeatureVersionCodeSnippet = computed(() =>
  buildFeatureCodeSnippet(selectedFeature.value, selectedFeatureVersionForAction.value),
)

const featureCreateCodeSample = computed(() => {
  const key = featureDraft.value.key || 'feature_key'
  const defaultValue = featureDraft.value.variants.find((variant) => variant.variantId === featureDraft.value.defaultVariantId)?.value ?? null
  const contextLines = featureVariableDrafts.value.length
    ? featureVariableDrafts.value.map((variable) => `    ${variable.key}: ${JSON.stringify(variable.defaultValue || null)},`)
    : ['    city: currentUser.city,']
  const userLine = featureDraft.value.terminalType === 'server'
    ? '  userId: request.user.id,'
    : '  userId: currentUser.id,'
  return [
    `const value = await featureClient.get('${key}', {`,
    userLine,
    '  context: {',
    ...contextLines,
    '  },',
    `  defaultValue: ${JSON.stringify(defaultValue)},`,
    '})',
  ].join('\n')
})

const featurePublishConfirmRows = computed(() => {
  const feature = selectedFeature.value
  const version = selectedFeatureVersionForAction.value
  if (!feature || !version) return []
  return [
    { label: 'Feature', value: feature.name },
    { label: 'Key', value: feature.key },
    { label: 'App', value: feature.appId },
    { label: '版本号', value: version.versionNo },
    { label: '变体类型', value: version.variantType },
    { label: '发布人', value: permissionContext.value.userId },
    { label: '发布方案', value: featurePublishDraft.value.publishType === 'scheduled' ? '定时自动发布' : '手动发布' },
    { label: '发布流量', value: formatPercent(featurePublishDraft.value.publishTraffic) },
    { label: '发布描述', value: featurePublishDraft.value.description || '-' },
  ]
})

const solidifyExperiment = computed(() =>
  experiments.value.find((experiment) => experiment.id === featureSolidifyDraft.value.experimentId),
)

const solidifiableExperimentOptions = computed(() =>
  experiments.value
    .filter((experiment) => !['DRAFT', 'ARCHIVED'].includes(experiment.status))
    .map((experiment) => ({
      label: `${experiment.name} · ${statusLabels[experiment.status]}`,
      value: experiment.id,
    })),
)

const solidifyExperimentConflict = computed(() => {
  const experiment = solidifyExperiment.value
  if (!experiment) return ''
  const feature = featureFlags.value.find((item) =>
    item.relatedExperimentIds.some((experimentId) => {
      const related = experiments.value.find((candidate) => candidate.id === experimentId)
      return related?.status === 'RUNNING'
    }),
  )
  if (!feature) return ''
  return `当前应用已有运行中的关联实验「${feature.name}」，继续固化可能造成策略冲突。`
})

const solidifyRolloutTotal = computed(() =>
  Number((featureSolidifyDraft.value.variantRollouts ?? []).reduce((sum, item) => sum + item.traffic, 0).toFixed(2)),
)

function getSolidifyVariantValue(variant: ExperimentVariant | undefined) {
  if (!variant) return null
  const entries = Object.entries(variant.params)
  if (entries.length === 1) return entries[0]?.[1] ?? null
  return variant.params
}

function inferSolidifyVariantType(value: unknown): FeatureVersion['variantType'] {
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'string') return 'string'
  return 'json'
}

const solidifyWinnerVariant = computed(() =>
  planningBundle.value?.variants.find((variant) => variant.id === featureSolidifyDraft.value.winnerVariantId),
)

const solidifyGeneratedVariantType = computed(() =>
  inferSolidifyVariantType(getSolidifyVariantValue(solidifyWinnerVariant.value)),
)

const solidifyParamKeys = computed(() => {
  const schemaKeys = planningBundle.value?.paramSchemas.map((schema) => schema.key).filter(Boolean) ?? []
  if (schemaKeys.length) return schemaKeys
  const keys = new Set<string>()
  planningBundle.value?.variants.forEach((variant) => {
    Object.keys(variant.params).forEach((key) => keys.add(key))
  })
  return [...keys]
})

const solidifySelectedVariants = computed(() => {
  const rollouts = featureSolidifyDraft.value.variantRollouts?.filter((item) => item.traffic > 0) ?? []
  const selectedIds = new Set(rollouts.map((item) => item.experimentVariantId))
  return (planningBundle.value?.variants ?? []).filter((variant) => selectedIds.has(variant.id))
})

const solidifyExistingFeature = computed(() => {
  const key = featureSolidifyDraft.value.featureKey.trim()
  if (!key) return undefined
  return featureFlags.value.find((feature) => feature.key === key)
})

const solidifyExistingLatestVersion = computed(() => {
  const feature = solidifyExistingFeature.value
  if (!feature) return undefined
  return [...featureVersions.value]
    .filter((version) => version.featureId === feature.featureId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0]
})

const solidifyExistingFeatureWarning = computed(() => {
  const feature = solidifyExistingFeature.value
  if (!feature) return ''
  const targetAppId = featureSolidifyDraft.value.appId || solidifyExperiment.value?.appId
  if (feature.appId !== targetAppId) {
    return `Feature Key 已存在于其他 App「${feature.appId}」，请更换 Key 或切换到对应 App。`
  }
  const latestVersion = solidifyExistingLatestVersion.value
  if (latestVersion && latestVersion.variantType !== solidifyGeneratedVariantType.value) {
    return `已有 Feature 的变体类型为 ${latestVersion.variantType}，与实验固化类型 ${solidifyGeneratedVariantType.value} 不兼容。`
  }
  return `该 Key 将固化到已有 Feature「${feature.name}」，生成一个未发布新版本。`
})

const solidifyMetricConclusionRows = computed(() => {
  const experiment = solidifyExperiment.value
  const winner = solidifyWinnerVariant.value
  const coreMetricName = experiment?.coreMetricId
    ? metrics.value.find((metric) => metric.id === experiment.coreMetricId)?.name ?? experiment.coreMetricId
    : '未指定核心指标'
  return [
    `推荐优胜组：${winner?.name ?? '请选择胜出组'}`,
    `指标结论：以「${coreMetricName}」为核心口径，当前推荐将胜出组固化为 Feature 版本并走发布审批。`,
    `参数 Key：${solidifyParamKeys.value.join('、') || '无参数 Key'}`,
  ]
})

watch(
  [
    featureKeyword,
    featureFilterAppId,
    featureFilterStatuses,
    featureFilterPublishStatuses,
    featureFilterTerminalTypes,
    featureFilterTags,
    featureFilterOwnerId,
  ],
  () => {
    featurePage.value = 1
  },
)
watch(
  featureAppOptions,
  () => {
    const appValues = featureAppOptions.value.map((option) => option.value)
    if (!featureFilterAppId.value || !appValues.includes(featureFilterAppId.value)) {
      featureFilterAppId.value = defaultFeatureFilterAppId.value
    }
  },
  { immediate: true },
)
watch(featureFilterAppId, (appId) => persistRecentFeatureAppId(appId))

const coreMetricsForReport = computed(() =>
  reportOverview.value?.coreMetricResults?.length ? reportOverview.value.coreMetricResults : metricResults.value,
)

const selectedCoreMetric = computed(() => {
  if (!coreMetricsForReport.value.length) return undefined
  return (
    coreMetricsForReport.value.find((metric) => metric.metricId === selectedCoreMetricId.value) ??
    coreMetricsForReport.value[0]
  )
})

const selectedCoreMetricRows = computed(() => selectedCoreMetric.value?.versionResults ?? [])

const selectedReportVersionIds = computed(() => {
  const overviewVersions = reportOverview.value?.versions.map((version) => version.versionId) ?? []
  const metricVersions = coreMetricsForReport.value.flatMap((metric) => metric.versionResults.map((result) => result.versionId))
  return Array.from(new Set([...overviewVersions, ...metricVersions]))
})

const reportGroupCount = computed(() => selectedReportVersionIds.value.length || reportOverview.value?.versions.length || 0)

const reportTimeRange = computed(() => {
  const startTime = reportOverview.value?.startTime ?? selectedReportExperiment.value?.startedAt
  const endTime = reportOverview.value?.endTime ?? selectedReportExperiment.value?.endedAt
  if (!startTime) return '-'
  return `${formatDateTime(startTime)} 至 ${endTime ? formatDateTime(endTime) : '当前'}`
})

const shouldShowHeatmapTab = computed(() => {
  const type = selectedReportExperiment.value?.type
  return Boolean(heatmapReport.value && (type === 'VISUAL' || type === 'SPLIT_URL'))
})

const shouldShowMabTab = computed(() => selectedReportExperiment.value?.type === 'MAB' && Boolean(mabReport.value))

const reportPrimaryTabs = computed<Array<{ name: ReportPrimaryTab; label: string }>>(() => {
  const tabs: Array<{ name: ReportPrimaryTab; label: string }> = [
    { name: 'conclusion', label: '实验结论' },
    { name: 'metrics', label: '数据指标' },
    { name: 'advanced', label: '高级分析' },
  ]
  if (shouldShowHeatmapTab.value) tabs.push({ name: 'heatmap', label: '热力图分析' })
  if (shouldShowMabTab.value) tabs.push({ name: 'mab', label: 'MAB 报告' })
  tabs.push({ name: 'sensitive', label: '敏感人群洞察' })
  return tabs
})

const reportHeaderItems = computed(() => [
  {
    label: '实验名称',
    value: reportOverview.value?.experimentName ?? selectedReportExperiment.value?.name ?? '-',
  },
  {
    label: '实验状态',
    value: selectedReportExperiment.value ? statusLabels[selectedReportExperiment.value.status] : reportOverview.value?.status ? statusLabels[reportOverview.value.status] : '-',
  },
  {
    label: '实验类型',
    value: selectedReportExperiment.value ? typeLabels[selectedReportExperiment.value.type] : reportOverview.value?.experimentType ? typeLabels[reportOverview.value.experimentType] : '-',
  },
  {
    label: '实验时间',
    value: reportTimeRange.value,
  },
  {
    label: '流量占比',
    value: formatPercent(reportOverview.value?.trafficRatio ?? selectedReportExperiment.value?.trafficRatio),
  },
  {
    label: '分组数量',
    value: `${reportGroupCount.value || '-'} 组`,
  },
  {
    label: '进组人数',
    value: formatNumber(reportOverview.value?.entryUsers),
  },
  {
    label: '数据更新时间',
    value: reportOverview.value?.dataUpdatedAt ? formatDateTime(reportOverview.value.dataUpdatedAt) : '数据计算中',
  },
])

const reportConclusionBanner = computed(() => {
  const allResults = coreMetricsForReport.value.flatMap((metric) => metric.versionResults)
  const hasError = reportOverview.value?.conclusionStatus === 'error' || allResults.some((result) => result.significance === 'error')
  const hasInsufficient = reportOverview.value?.conclusionStatus === 'insufficient' || allResults.some((result) => result.significance === 'insufficient')
  const hasNegative = allResults.some((result) => result.significance === 'negative')
  const hasPositive = allResults.some((result) => result.significance === 'positive')
  if (hasError) {
    return {
      status: '指标异常',
      type: 'error' as const,
      text: '实验报告计算异常，请检查埋点、曝光事件和指标配置。',
      action: '检查配置',
    }
  }
  if (hasInsufficient || !allResults.length) {
    return {
      status: '数据不足',
      type: 'warning' as const,
      text: '当前数据不足，暂无法输出实验结论。',
      action: '继续观察',
    }
  }
  if (hasNegative) {
    return {
      status: '负向显著',
      type: 'error' as const,
      text: '当前实验核心指标存在显著负向影响，建议暂停或回滚相关策略。',
      action: '停止实验',
    }
  }
  if (hasPositive) {
    return {
      status: '正向显著',
      type: 'success' as const,
      text: '当前实验核心指标存在正向显著提升，建议结合业务成本评估是否上线。',
      action: '上线或分人群验证',
    }
  }
  return {
    status: '不显著',
    type: 'info' as const,
    text: '当前条件下尚未检测到显著差异，建议结合 MDE、样本量和实验周期判断是否继续观察。',
    action: '扩大流量或延长实验',
  }
})

const bestMetricResult = computed(() => {
  const metric = selectedCoreMetric.value ?? coreMetricsForReport.value[0]
  if (!metric) return undefined
  const comparableResults = metric.versionResults.filter((result) => result.significance !== 'baseline' && result.metricValue !== null)
  const positiveResults = comparableResults.filter((result) => result.significance === 'positive')
  const pool = positiveResults.length ? positiveResults : comparableResults
  const result = pool.reduce<MetricVersionResult | undefined>((best, current) => {
    if (!best) return current
    const bestValue = positiveResults.length ? best.diffRel ?? Number.NEGATIVE_INFINITY : best.metricValue ?? Number.NEGATIVE_INFINITY
    const currentValue = positiveResults.length ? current.diffRel ?? Number.NEGATIVE_INFINITY : current.metricValue ?? Number.NEGATIVE_INFINITY
    return currentValue > bestValue ? current : best
  }, undefined)
  return result ? { metric, result } : undefined
})

const reportExportPermission = computed(() => {
  if (!selectedReportExperiment.value) {
    return { allowed: false, reason: '请选择实验' }
  }
  return canUseAbAction(permissionContext.value, 'export_report', getExperimentPermissionLevel(selectedReportExperiment.value))
})

const groupUserDownloadCount = computed(() => reportOverview.value?.entryUsers ?? 0)

const groupUserDownloadMode = computed(() => {
  const count = groupUserDownloadCount.value
  if (count > 5_000_000) return 'blocked'
  if (count > 100_000) return 'async'
  return 'sync'
})

const groupUserDownloadHint = computed(() => {
  if (!reportExportPermission.value.allowed) return reportExportPermission.value.reason || '暂无导出权限'
  if (groupUserDownloadMode.value === 'blocked') return '当前数据量超过 500 万条，请缩小时间范围或增加过滤条件后重新下载。'
  if (groupUserDownloadMode.value === 'async') return '当前进组用户超过 10 万条，将创建异步导出任务，完成后在消息中心提示下载。'
  return '当前进组用户可直接下载。'
})

const availableFilterTemplates = computed(() => [...filterTemplates.value, ...localFilterTemplates.value])

const reportTemplateOptions = computed(() =>
  availableFilterTemplates.value.map((template) => ({
    label: `${template.scope === 'app' ? '应用模板' : '实验模板'} · ${template.templateName}`,
    value: template.templateId,
  })),
)

const reportGranularityOptions = computed(() => [
  { label: '天级', value: 'day', disabled: false },
  { label: '小时级', value: 'hour', disabled: !isGranularityAllowed('hour') },
  { label: '5 分钟级', value: '5m', disabled: !isGranularityAllowed('5m') },
])

const preAaAvailable = computed(() => (reportOverview.value?.entryUsers ?? 0) >= 100_000)

const reportCohortOptions = computed(() => [
  { label: '高活跃用户', value: 'cohort_high_active' },
  { label: '一线城市核心用户', value: 'cohort_core_city' },
  { label: '低金币用户', value: 'cohort_low_coin' },
])

const reportPropertyOptions = [
  { label: '用户属性', value: 'user_property' },
  { label: '事件属性', value: 'event_property' },
  { label: '设备属性', value: 'device_property' },
  { label: '渠道属性', value: 'channel_property' },
]

const reportOperatorOptions = [
  { label: '等于', value: 'eq' },
  { label: '不等于', value: 'neq' },
  { label: '包含', value: 'contains' },
  { label: '不包含', value: 'not_contains' },
  { label: '大于', value: 'gt' },
  { label: '小于', value: 'lt' },
  { label: '为空', value: 'is_null' },
  { label: '不为空', value: 'is_not_null' },
  { label: '属于', value: 'in' },
]

const reportFieldOptions = computed(() => {
  const defaults = [
    { label: '城市', value: 'city' },
    { label: '渠道', value: 'channel' },
    { label: '设备系统', value: 'os' },
    { label: 'App 版本', value: 'app_version' },
    { label: '金币余额', value: 'coin_balance' },
  ]
  const audienceFields = Object.values(abStore.audienceFieldOptions ?? {})
    .flat()
    .map((field) => ({ label: field.label, value: field.value }))
  const seen = new Set<string>()
  return [...defaults, ...audienceFields].filter((item) => {
    if (seen.has(item.value)) return false
    seen.add(item.value)
    return true
  })
})

const metricNavigationGroups = computed(() => {
  const keyword = metricSearchKeyword.value.trim().toLowerCase()
  const filterByKeyword = (items: MetricStatisticResult[]) =>
    keyword ? items.filter((metric) => metric.metricName.toLowerCase().includes(keyword)) : items
  const mustSeeIds = new Set(metrics.value.filter((metric) => metric.isMustSee).map((metric) => metric.id))
  return [
    { key: 'core', label: '核心指标', metrics: filterByKeyword(coreMetricsForReport.value) },
    { key: 'must', label: '关注指标', metrics: filterByKeyword(metricResults.value.filter((metric) => mustSeeIds.has(metric.metricId))) },
    { key: 'event', label: '事件指标', metrics: filterByKeyword(metricResults.value.filter((metric) => metric.metricType === 'event')) },
    { key: 'retention', label: '留存指标', metrics: filterByKeyword(metricResults.value.filter((metric) => metric.metricType === 'retention')) },
    { key: 'funnel', label: '漏斗指标', metrics: funnelReport.value ? filterByKeyword(metricResults.value.filter((metric) => metric.metricType === 'funnel')) : [] },
  ]
})

const sortedSelectedMetricRows = computed(() => {
  const rows = [...selectedCoreMetricRows.value]
  const direction = metricSortAsc.value ? 1 : -1
  return rows.sort((left, right) => {
    const leftValue = metricSortValue(left, metricSortKey.value)
    const rightValue = metricSortValue(right, metricSortKey.value)
    if (leftValue < rightValue) return -1 * direction
    if (leftValue > rightValue) return 1 * direction
    return 0
  })
})

const metricGroupRows = computed(() => {
  const rows = selectedReportVersionIds.value.map((versionId) => {
    const cells = metricResults.value.map((metric) => ({
      metric,
      result: metric.versionResults.find((item) => item.versionId === versionId),
    }))
    return { versionId, cells }
  })
  if (!metricGroupSortMetricId.value) return rows
  const direction = metricGroupSortAsc.value ? 1 : -1
  return rows.sort((left, right) => {
    const leftResult = left.cells.find((cell) => cell.metric.metricId === metricGroupSortMetricId.value)?.result
    const rightResult = right.cells.find((cell) => cell.metric.metricId === metricGroupSortMetricId.value)?.result
    const leftValue = metricDisplayRawValue(leftResult)
    const rightValue = metricDisplayRawValue(rightResult)
    if (leftValue < rightValue) return -1 * direction
    if (leftValue > rightValue) return 1 * direction
    return 0
  })
})

const retentionDayOptions = computed(() =>
  Array.from({ length: 30 }, (_, index) => ({ label: `${index + 1} 日留存`, value: index + 1 })),
)

const temporaryRetentionFilterPropertyOptions = [
  { label: '广告场景 · scene', value: 'scene' },
  { label: '广告计划 ID · ad_plan_id', value: 'ad_plan_id' },
  { label: '城市 · city', value: 'city' },
  { label: '金币余额 · coin_balance', value: 'coin_balance' },
  { label: '是否新用户 · is_new_user', value: 'is_new_user' },
]

const temporaryRetentionFilterOperatorOptions = [
  { label: '等于', value: '=' },
  { label: '不等于', value: '!=' },
  { label: '包含', value: 'contains' },
  { label: '不包含', value: 'not_contains' },
  { label: '大于', value: '>' },
  { label: '大于等于', value: '>=' },
  { label: '小于', value: '<' },
  { label: '小于等于', value: '<=' },
  { label: '有值', value: 'is_not_null' },
  { label: '无值', value: 'is_null' },
  { label: '属于', value: 'in' },
  { label: '不属于', value: 'not_in' },
]

function createTemporaryRetentionFilter(): TemporaryRetentionFilterDraft {
  return {
    id: createUiId('temporary_retention_filter'),
    propertyId: '',
    propertySource: 'event',
    operator: '=',
    value: '',
  }
}

function createTemporaryRetentionFilterGroup(): FilterGroupDraft {
  return {
    id: createUiId('temporary_retention_filter_group'),
    relation: 'AND',
    conditions: [createTemporaryRetentionFilter()],
    groups: [],
  }
}

function cloneTemporaryRetentionFilter(filter: MetricFilter): TemporaryRetentionFilterDraft {
  return {
    ...filter,
    id: filter.id || createUiId('temporary_retention_filter'),
    value: filter.value === undefined || filter.value === null ? '' : String(filter.value),
  }
}

function cloneTemporaryRetentionFilterGroup(filterTree?: MetricFilterGroup, fallbackFilters: MetricFilter[] = []): FilterGroupDraft {
  if (!filterTree) return { ...createTemporaryRetentionFilterGroup(), conditions: fallbackFilters.map(cloneTemporaryRetentionFilter) }
  return {
    id: filterTree.id || createUiId('temporary_retention_filter_group'),
    relation: filterTree.relation,
    conditions: filterTree.conditions.map(cloneTemporaryRetentionFilter),
    groups: filterTree.groups.map((group) => cloneTemporaryRetentionFilterGroup(group)),
  }
}

function handleTemporaryRetentionFilterPropertyChange(filter: TemporaryRetentionFilterDraft, propertyId: string) {
  filter.propertyId = propertyId
  filter.propertySource = ['city', 'is_new_user'].includes(propertyId) ? 'public' : propertyId === 'coin_balance' ? 'user' : 'event'
}

function temporaryRetentionFilterIncomplete(group: FilterGroupDraft): boolean {
  return group.conditions.some((filter) => {
    const hasAnyInput = Boolean(filter.propertyId || filter.operator !== '=' || String(filter.value ?? '').trim())
    if (!hasAnyInput) return false
    if (!filter.propertyId || !filter.operator) return true
    return !['is_null', 'is_not_null'].includes(filter.operator) && !String(filter.value ?? '').trim()
  }) || group.groups.some(temporaryRetentionFilterIncomplete)
}

function normalizeTemporaryRetentionFilterGroup(group: FilterGroupDraft): MetricFilterGroup {
  return {
    id: group.id,
    relation: group.relation,
    conditions: group.conditions
      .filter((filter) => Boolean(filter.propertyId))
      .map((filter) => ({
        id: filter.id,
        propertyId: filter.propertyId,
        propertySource: filter.propertySource,
        operator: filter.operator,
        value: ['is_null', 'is_not_null'].includes(filter.operator)
          ? undefined
          : String(filter.value ?? '')
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean),
      })),
    groups: group.groups
      .map(normalizeTemporaryRetentionFilterGroup)
      .filter((item) => item.conditions.length || item.groups.length),
  }
}

const retentionMetricOptionsForTemporary = computed(() =>
  metrics.value
    .filter((metric) => metric.metricCategory === 'retention' && metric.status === 'active')
    .map((metric) => ({ label: `${metric.name} · ${metric.metricGroupId}`, value: metric.id })),
)

const selectedTemporaryRetentionMetric = computed(() =>
  metrics.value.find((metric) => metric.id === temporaryRetentionMetricId.value && metric.metricCategory === 'retention'),
)

const temporaryRetentionEventOptions = computed(() => {
  const eventMap = new Map<EntityId, string>()
  for (const metric of metrics.value) {
    if ('events' in metric.definition) {
      metric.definition.events.forEach((event) => eventMap.set(event.eventId, event.eventName))
    }
    if ('startEvent' in metric.definition) {
      eventMap.set(metric.definition.startEvent.eventId, metric.definition.startEvent.eventName)
      eventMap.set(metric.definition.returnEvent.eventId, metric.definition.returnEvent.eventName)
    }
    if ('steps' in metric.definition) {
      metric.definition.steps.forEach((event) => eventMap.set(event.eventId, event.eventName))
    }
  }
  return Array.from(eventMap.entries()).map(([value, label]) => ({ label, value }))
})

const temporaryRetentionResultRows = computed(() => {
  const result = temporaryRetentionResult.value ?? temporaryRetentionQueries.value[0]
  if (!temporaryRetentionQueried.value || !result) return []
  return result.rows.map((row) => ({
    ...row,
    values: row.values.slice(0, 30),
  }))
})

function syncTemporaryRetentionMetric(metricId: EntityId | null) {
  temporaryRetentionMetricId.value = metricId
  const metric = metrics.value.find((item) => item.id === metricId && item.metricCategory === 'retention')
  if (metric && 'startEvent' in metric.definition) {
    temporaryRetentionDraft.value.startEventId = metric.definition.startEvent.eventId
    temporaryRetentionDraft.value.returnEventId = metric.definition.returnEvent.eventId
    temporaryRetentionDraft.value.startFilterTree = cloneTemporaryRetentionFilterGroup(metric.definition.startEvent.filterTree, metric.definition.startEvent.filters)
    temporaryRetentionDraft.value.returnFilterTree = cloneTemporaryRetentionFilterGroup(metric.definition.returnEvent.filterTree, metric.definition.returnEvent.filters)
  }
  temporaryRetentionQueried.value = false
  temporaryRetentionResult.value = null
}

async function queryTemporaryRetention() {
  if (!temporaryRetentionDraft.value.startEventId || !temporaryRetentionDraft.value.returnEventId) {
    message.warning('请完整配置起始事件和回访事件')
    return
  }
  if (!temporaryRetentionDraft.value.startDate || !temporaryRetentionDraft.value.endDate) {
    message.warning('请选择查询时间范围')
    return
  }
  if (
    temporaryRetentionFilterIncomplete(temporaryRetentionDraft.value.startFilterTree) ||
    temporaryRetentionFilterIncomplete(temporaryRetentionDraft.value.returnFilterTree)
  ) {
    message.warning('请补全临时留存过滤条件，或删除空条件')
    return
  }
  if (!selectedReportExperiment.value) {
    message.warning('请先选择实验报告')
    return
  }
  temporaryRetentionLoading.value = true
  try {
    const result = await abStore.queryTemporaryRetention({
      experimentId: selectedReportExperiment.value.id,
      metricId: temporaryRetentionMetricId.value,
      startEventId: temporaryRetentionDraft.value.startEventId,
      returnEventId: temporaryRetentionDraft.value.returnEventId,
      startDate: temporaryRetentionDraft.value.startDate,
      endDate: temporaryRetentionDraft.value.endDate,
      startFilterTree: normalizeTemporaryRetentionFilterGroup(temporaryRetentionDraft.value.startFilterTree),
      returnFilterTree: normalizeTemporaryRetentionFilterGroup(temporaryRetentionDraft.value.returnFilterTree),
    })
    if (result.result) {
      temporaryRetentionResult.value = result.result
      temporaryRetentionQueried.value = true
    }
    message[result.result ? 'success' : 'warning'](result.message)
  } finally {
    temporaryRetentionLoading.value = false
  }
}

const retentionTrendRows = computed(() => {
  if (!cohortReport.value) return []
  return cohortReport.value.rows.map((row) => ({
    ...row,
    points: cohortReport.value!.retentionDays.map((day, index) => {
      const value = row.values[index] ?? 0
      const baseline = cohortReport.value!.rows.find((item) => item.versionId !== row.versionId)?.values[index] ?? value
      const diffRel = baseline ? (value - baseline) / baseline : 0
      return {
        day,
        value,
        diffRel,
        confidenceInterval: [diffRel - 0.018, diffRel + 0.018] as [number, number],
        pValue: Math.max(0.006, 0.22 - Math.abs(diffRel) * 4),
        significance: Math.abs(diffRel) > 0.018 ? (diffRel > 0 ? 'positive' : 'negative') : 'neutral',
      }
    }),
  }))
})

const retentionDailyTrendRows = computed(() => {
  if (!cohortReport.value) return []
  const dayIndex = cohortReport.value.retentionDays.findIndex((day) => day === selectedRetentionDay.value)
  const safeIndex = dayIndex >= 0 ? dayIndex : Math.min(1, cohortReport.value.retentionDays.length - 1)
  return cohortReport.value.rows.flatMap((row) =>
    Array.from({ length: 7 }, (_, index) => {
      const date = shiftDate(row.cohortDate, index)
      const baseValue = row.values[safeIndex] ?? row.values[row.values.length - 1] ?? 0
      const value = Math.max(0, baseValue + (row.versionId.includes('new') ? 0.002 : -0.001) * index)
      return {
        versionId: row.versionId,
        cohortDate: date,
        newUsers: Math.max(200, row.newUsers - index * 210),
        value,
        available: isRetentionWindowAvailable(date, selectedRetentionDay.value),
      }
    }),
  )
})

const retentionWindowWarning = computed(() =>
  retentionDailyTrendRows.value.some((row) => !row.available)
    ? `所选时间范围内部分日期尚未到达 ${selectedRetentionDay.value} 日观察窗口，相关数据暂不展示。`
    : '',
)

const retentionInterpretation = computed(() => {
  const treatment = retentionTrendRows.value.find((row) => !reportOverview.value?.versions.find((version) => version.versionId === row.versionId)?.isControl)
  if (!treatment) return '当前同期群数据不足，暂无法生成长期影响解读。'
  const positiveCount = treatment.points.filter((point) => point.significance === 'positive').length
  if (positiveCount >= 3) return '实验策略可能存在持续正向影响。'
  if (treatment.points[0]?.significance === 'positive' && positiveCount <= 1) return '实验策略可能主要产生短期影响。'
  if (positiveCount === 0) return '当前未观察到实验策略对长期指标的显著影响。'
  return '实验策略在部分后续天数存在改善，建议继续观察长期趋势。'
})

const funnelVersionOptions = computed(() =>
  (reportOverview.value?.versions ?? []).map((version) => ({ label: version.versionName, value: version.versionId })),
)

const funnelBaselineOptions = computed(() => [
  ...funnelVersionOptions.value,
  { label: '不对比版本', value: 'none' },
])

const funnelStepRows = computed(() => {
  if (!funnelReport.value) return []
  const hasBaseline = selectedFunnelBaselineVersionId.value !== 'none'
  return funnelReport.value.steps.map((step, index) => {
    const compareReachedUsers = step.reachedUsers
    const baselineReachedUsers = hasBaseline ? Math.round(step.reachedUsers / (1 + (index === 0 ? 0 : 0.06 + index * 0.018))) : null
    const baselineOverall = hasBaseline ? step.overallConversionRate / (1 + (index === 0 ? 0 : 0.06 + index * 0.018)) : null
    const diffRel = baselineOverall ? (step.overallConversionRate - baselineOverall) / baselineOverall : null
    const pValue = diffRel === null ? null : Math.max(0.004, 0.18 - Math.abs(diffRel) * 0.8)
    return {
      ...step,
      compareReachedUsers,
      baselineReachedUsers,
      lostRate: index === 0 ? 0 : step.lostUsers / (step.lostUsers + step.reachedUsers),
      baselineOverall,
      diffRel,
      pValue,
      confidenceInterval: diffRel === null ? null : [diffRel - 0.035, diffRel + 0.035] as [number, number],
    }
  })
})

const funnelMaxUsers = computed(() => Math.max(...funnelStepRows.value.map((step) => step.compareReachedUsers), 1))

const differenceVersionOptions = computed(() =>
  (reportOverview.value?.versions ?? [])
    .filter((version) => !version.isControl)
    .map((version) => ({ label: version.versionName, value: version.versionId })),
)

const differenceSelectedMetric = computed(() =>
  metricResults.value.find((metric) => metric.metricId === differenceMetricId.value) ?? metricResults.value[0],
)

const differenceValidationMessage = computed(() => {
  if (differenceGroups.value.length < 2) return '至少配置 2 个群体才能查询。'
  if (differenceGroups.value.some((group) => !group.field || !group.value)) return '每个群体至少包含 1 个条件。'
  const signatures = differenceGroups.value.map((group) => `${group.field}:${group.operator}:${group.value}`)
  if (new Set(signatures).size !== signatures.length) return '群体条件完全重复，请调整后再查询。'
  return ''
})

const differenceResultRows = computed(() => {
  const metric = differenceSelectedMetric.value
  if (!metric) return []
  const versions = differenceVersionIds.value.length
    ? differenceVersionIds.value
    : differenceVersionOptions.value.map((option) => String(option.value))
  return differenceGroups.value.flatMap((group, groupIndex) =>
    versions.map((versionId, versionIndex) => {
      const baseResult = metric.versionResults.find((result) => result.versionId === versionId)
      const sampleSize = Math.max(1200, (baseResult?.sampleSize ?? 20000) - groupIndex * 7600)
      const sampleSmall = sampleSize < 5000
      const liftRel = (baseResult?.diffRel ?? 0.04) + groupIndex * 0.025 - versionIndex * 0.01
      const pValue = sampleSmall ? 0.18 : Math.max(0.006, 0.12 - Math.abs(liftRel) * 0.8)
      const significance = sampleSmall ? 'insufficient' : pValue < 0.05 && liftRel > 0 ? 'positive' : pValue < 0.05 && liftRel < 0 ? 'negative' : 'neutral'
      return {
        group,
        versionId,
        sampleSize,
        metricValue: (baseResult?.metricValue ?? 0.1) * (1 + groupIndex * 0.035),
        liftRel,
        pValue,
        confidenceInterval: [liftRel - 0.04, liftRel + 0.04] as [number, number],
        bestProbability: Math.min(0.93, Math.max(0.12, 0.48 + liftRel * 1.8 - groupIndex * 0.04)),
        significance,
        suggestion: sampleSmall
          ? '样本不足，建议扩大样本后再判断'
          : significance === 'positive'
            ? '建议该群体优先使用该版本'
            : significance === 'negative'
              ? '建议该群体排除实验策略'
              : '暂不建议做差异化策略',
      }
    }),
  )
})

const heatmapVersionOptions = computed(() =>
  (heatmapReport.value?.versions ?? []).map((version) => ({
    label: reportVersionName(version.versionId),
    value: version.versionId,
  })),
)

const selectedHeatmapVersion = computed(() => {
  const versions = heatmapReport.value?.versions ?? []
  return versions.find((version) => version.versionId === selectedHeatmapVersionId.value) ?? versions[0]
})

const heatmapTopElements = computed(() => {
  const seed = selectedHeatmapVersion.value?.topElements ?? []
  const generated = Array.from({ length: 20 }, (_, index) => {
    const source = seed[index % Math.max(seed.length, 1)]
    const clicks = Math.max(240, Math.round((source?.clicks ?? 3000) * (1 - index * 0.035)))
    return {
      name: index < seed.length && source ? source.name : `页面元素 ${index + 1}`,
      clicks,
      share: Math.max(0.012, (source?.share ?? 0.12) * (1 - index * 0.04)),
    }
  })
  return generated.slice(0, 20)
})

const heatmapAnomalyHints = computed(() =>
  heatmapReport.value?.anomalyHints?.length
    ? heatmapReport.value.anomalyHints
    : ['当前页面点击行为存在异常分布，建议结合渠道、设备、UA、用户属性进一步排查。'],
)

const mabVisibleArms = computed(() =>
  (mabReport.value?.arms ?? []).filter((arm) => !mabHideOffline.value || arm.status === 'online'),
)

const mabCoreRows = computed(() => [...mabVisibleArms.value].sort((left, right) => right.p2ba - left.p2ba))

const mabBestArm = computed(() =>
  mabCoreRows.value.reduce<(typeof mabCoreRows.value)[number] | undefined>((best, arm) => {
    if (!best) return arm
    return arm.metricValue > best.metricValue ? arm : best
  }, undefined),
)

const mabTrafficMaxArm = computed(() =>
  mabVisibleArms.value.reduce<(typeof mabVisibleArms.value)[number] | undefined>((best, arm) => {
    if (!best) return arm
    return arm.trafficRatio > best.trafficRatio ? arm : best
  }, undefined),
)

const mabTotalEntryUsers = computed(() => mabVisibleArms.value.reduce((total, arm) => total + arm.entryUsers, 0))

const mabEvaluationTrafficRatio = computed(() => 0.09)

const mabBenefitRows = computed(() =>
  (mabReport.value?.rounds ?? []).map((round, index) => {
    const evaluationLift = Math.max(0.004, round.cumulativeLift * 0.48 + index * 0.003)
    const smartRevenue = Math.round(mabTotalEntryUsers.value * round.cumulativeLift * 0.18)
    const evaluationRevenue = Math.round(mabTotalEntryUsers.value * evaluationLift * 0.18)
    return {
      ...round,
      evaluationLift,
      smartRevenue,
      evaluationRevenue,
      incrementalRevenue: Math.max(0, smartRevenue - evaluationRevenue),
    }
  }),
)

const mabBenefitMax = computed(() =>
  Math.max(...mabBenefitRows.value.flatMap((row) => [row.cumulativeLift, row.evaluationLift]), 0.01),
)

const mabTrendRows = computed(() => {
  const arms = mabVisibleArms.value
  const rounds = mabReport.value?.rounds ?? []
  const baseline = arms[0]?.metricValue ?? 0
  return arms.map((arm, armIndex) => ({
    arm,
    points: rounds.map((round, roundIndex) => {
      const progress = (roundIndex + 1) / Math.max(rounds.length, 1)
      const simulatedValue = Math.max(0, arm.metricValue * (0.86 + progress * 0.14) - armIndex * 0.0012)
      return {
        roundNo: round.roundNo,
        value: mabTrendMode.value === 'relative' && baseline ? (simulatedValue - baseline) / baseline : simulatedValue,
      }
    }),
  }))
})

const mabTrendMax = computed(() =>
  Math.max(...mabTrendRows.value.flatMap((row) => row.points.map((point) => Math.abs(point.value))), 0.01),
)

const mabTrafficRows = computed(() => {
  const arms = mabVisibleArms.value
  const rounds = mabReport.value?.rounds ?? []
  const equalRatio = arms.length ? 1 / arms.length : 0
  const p2baSum = Math.max(arms.reduce((sum, arm) => sum + arm.p2ba, 0), 0.01)
  return rounds.map((round, roundIndex) => {
    const progress = (roundIndex + 1) / Math.max(rounds.length, 1)
    return {
      roundNo: round.roundNo,
      optimizedAt: round.optimizedAt,
      cells: arms.map((arm) => {
        const actual = equalRatio + (arm.trafficRatio - equalRatio) * progress
        const theoretical = Math.max(0.04, (arm.p2ba / p2baSum) * (1 - mabEvaluationTrafficRatio.value))
        const cumulative = (actual * (roundIndex + 1) + equalRatio * Math.max(rounds.length - roundIndex - 1, 0)) / Math.max(rounds.length, 1)
        const value = mabTrafficView.value === 'actual' ? actual : mabTrafficView.value === 'theoretical' ? theoretical : cumulative
        return { armId: arm.armId, name: arm.name, value }
      }),
    }
  })
})

const mabTrafficMax = computed(() =>
  Math.max(...mabTrafficRows.value.flatMap((row) => row.cells.map((cell) => cell.value)), 0.01),
)

const mabParameterRows = computed(() => {
  const styles = ['coupon', 'task', 'benefit', 'member']
  return (mabReport.value?.arms ?? [])
    .filter((arm) => mabParameterView.value === 'all' || arm.status === 'online')
    .map((arm, index) => ({
      arm,
      params: [
        { name: 'banner_style', value: styles[index % styles.length] },
        { name: '评估流量', value: formatRatio(mabEvaluationTrafficRatio.value, 0) },
        { name: '调优目标', value: mabReport.value?.optimizationMetric ?? '核心指标' },
        { name: '参数维度', value: '非体验一致性' },
      ],
    }))
})

const mabWinnerWarning = computed(() =>
  mabBestArm.value && mabTrafficMaxArm.value && mabBestArm.value.armId !== mabTrafficMaxArm.value.armId
    ? `当前流量最高版本为 ${mabTrafficMaxArm.value.name}，指标最优版本为 ${mabBestArm.value.name}，不能仅按流量占比判断最终胜出。`
    : '当前流量分配与指标最优方向一致，但仍需结合评估流量和 P2BA 判断。'
)

const sensitiveTaskStatusTabs = computed(() => {
  const count = (status: SensitiveTaskStatusTab) =>
    status === 'all' ? sensitiveTasks.value.length : sensitiveTasks.value.filter((task) => task.status === status).length
  return [
    { label: `全部 ${count('all')}`, value: 'all' },
    { label: `运行中 ${count('running')}`, value: 'running' },
    { label: `已完成 ${count('completed')}`, value: 'completed' },
    { label: `失败 ${count('failed')}`, value: 'failed' },
    { label: `已终止 ${count('terminated')}`, value: 'terminated' },
  ]
})

const filteredSensitiveTasks = computed(() =>
  sensitiveTaskStatusTab.value === 'all'
    ? sensitiveTasks.value
    : sensitiveTasks.value.filter((task) => task.status === sensitiveTaskStatusTab.value),
)

const selectedSensitiveTask = computed(() =>
  sensitiveTasks.value.find((task) => task.id === selectedSensitiveTaskId.value) ??
  filteredSensitiveTasks.value[0] ??
  sensitiveTasks.value[0],
)

const selectedSensitiveSegment = computed(() =>
  selectedSensitiveTask.value?.result?.segments.find((segment) => segment.condition === selectedSensitiveSegmentCondition.value) ??
  selectedSensitiveTask.value?.result?.segments[0],
)

const sensitiveMetricOptions = computed(() =>
  coreMetricsForReport.value.map((metric) => ({ label: metric.metricName, value: metric.metricId })),
)

const sensitiveVariantOptions = computed(() =>
  (reportOverview.value?.versions ?? selectedReportVersionIds.value.map((versionId) => ({ versionId, versionName: reportVersionName(versionId), isControl: false }))).map((version) => ({
    label: version.versionName,
    value: version.versionId,
  })),
)

const sensitiveCreateRequirements = computed(() => {
  const entryUsers = reportOverview.value?.entryUsers ?? 0
  return [
    {
      label: '实验已产生可分析进组用户',
      passed: entryUsers > 0,
      detail: entryUsers ? `当前进组 ${formatNumber(entryUsers)} 人` : '暂无进组用户',
    },
    {
      label: '样本量达到建模下限',
      passed: entryUsers >= 20000,
      detail: entryUsers >= 20000 ? '已满足 2 万样本下限' : '低于 2 万样本时仅允许查看已有任务',
    },
    {
      label: '至少存在 1 个核心指标',
      passed: coreMetricsForReport.value.length > 0,
      detail: coreMetricsForReport.value.length ? `${coreMetricsForReport.value.length} 个可分析指标` : '暂无指标结果',
    },
    {
      label: '至少存在 2 个版本',
      passed: sensitiveVariantOptions.value.length >= 2,
      detail: sensitiveVariantOptions.value.length >= 2 ? `${sensitiveVariantOptions.value.length} 个版本可选` : '版本信息缺失',
    },
    {
      label: '具备报告导出/分析权限',
      passed: reportExportPermission.value.allowed,
      detail: reportExportPermission.value.allowed ? '权限校验通过' : reportExportPermission.value.reason || '暂无权限',
    },
  ]
})

const sensitiveCreateAvailable = computed(() => sensitiveCreateRequirements.value.every((item) => item.passed))

const sensitiveTaskStageRows = computed(() => {
  const task = selectedSensitiveTask.value
  const stages: SensitiveInsightTask['stage'][] = ['data_preparing', 'model_training', 'model_predicting', 'result_output']
  const currentIndex = task ? stages.indexOf(task.stage) : -1
  return stages.map((stage, index) => ({
    stage,
    label: sensitiveStageLabels[stage],
    status: !task ? 'wait' : index < currentIndex || task.status === 'completed' ? 'finish' : index === currentIndex ? 'process' : 'wait',
  }))
})

const sensitiveFeatureImportanceRows = computed(() =>
  (selectedSensitiveTask.value?.result?.topFeatures ?? ['金币余额分层', '近 7 日活跃天数', '广告入口来源', '城市']).map((feature, index) => ({
    feature,
    score: Math.max(0.12, 0.42 - index * 0.075),
    contribution: Math.max(0.08, 0.34 - index * 0.06),
  })),
)

const sensitiveCrossSegmentRows = computed(() =>
  (selectedSensitiveTask.value?.result?.segments ?? []).map((segment, index) => ({
    ...segment,
    index: index + 1,
    coverage: selectedSensitiveTask.value?.result?.totalUsers ? segment.users / selectedSensitiveTask.value.result.totalUsers : 0,
    action: segment.significance === 'positive' ? '建议定向放量' : segment.significance === 'negative' ? '建议排除或降权' : '继续观察',
  })),
)

const reportQualityStates = computed(() => {
  const states = [...reportAnomalies.value]
  const entryUsers = reportOverview.value?.entryUsers ?? 0
  const selectedMetricIds = selectedReportExperiment.value?.metricIds ?? []
  const activeMetricIds = new Set(metrics.value.filter((metric) => metric.status === 'active').map((metric) => metric.id))
  const knownVersionIds = new Set(reportOverview.value?.versions.map((version) => version.versionId) ?? [])
  const metricVersionIds = metricResults.value.flatMap((metric) => metric.versionResults.map((result) => result.versionId))
  if (!reportOverview.value && selectedReportExperiment.value?.status === 'RUNNING') {
    states.push({ level: 'warning' as const, message: '报告概览接口暂无数据，页面保留已加载的专项分析结果。' })
  }
  if (entryUsers <= 0) states.push({ level: 'warning' as const, message: '暂无进组用户，指标、留存和敏感人群分析暂不可计算。' })
  if (!metricResults.value.length) states.push({ level: 'warning' as const, message: '暂无指标结果，请检查指标绑定或查询条件。' })
  if (selectedMetricIds.some((metricId) => !activeMetricIds.has(metricId))) {
    states.push({ level: 'error' as const, message: '实验绑定指标存在删除或下线项，报告口径可能不完整。' })
  }
  if (knownVersionIds.size && metricVersionIds.some((versionId) => !knownVersionIds.has(versionId))) {
    states.push({ level: 'warning' as const, message: '指标结果中存在版本信息缺失，请检查版本同步。' })
  }
  if (selectedReportExperiment.value?.status === 'RUNNING' && !reportOverview.value?.dataUpdatedAt) {
    states.push({ level: 'warning' as const, message: '曝光或指标快照更新时间缺失，接口超时时应保留旧数据。' })
  }
  if (!reportExportPermission.value.allowed) {
    states.push({ level: 'warning' as const, message: reportExportPermission.value.reason || '当前用户暂无报告下载权限。' })
  }
  if (shouldShowHeatmapTab.value && !heatmapReport.value) states.push({ level: 'warning' as const, message: '热力图暂无页面截图或点击数据。' })
  if (selectedReportExperiment.value?.type === 'MAB' && !mabReport.value) states.push({ level: 'warning' as const, message: 'MAB 收益与调优数据暂未生成。' })
  return states
})

const allTrendVersionIds = computed(() =>
  Array.from(new Set(trendPoints.value.map((point) => point.versionId))),
)

const visibleTrendVersionIds = computed(() =>
  allTrendVersionIds.value.filter((versionId) => !hiddenTrendVersionIds.value.includes(versionId)),
)

const trendMaxValue = computed(() => {
  const values = trendPoints.value.flatMap((point) => [point.value, point.upperBound ?? point.value])
  return Math.max(...values, 0.01)
})

const trendChartRows = computed(() => {
  const times = Array.from(new Set(trendPoints.value.map((point) => point.time)))
  return times.map((time) => ({
    time,
    points: visibleTrendVersionIds.value
      .map((versionId) => ({
        versionId,
        point: trendPoints.value.find((item) => item.time === time && item.versionId === versionId),
      }))
      .filter((item): item is { versionId: EntityId; point: (typeof trendPoints.value)[number] } => Boolean(item.point)),
  }))
})

const distributionRows = computed(() =>
  selectedCoreMetricRows.value
    .filter((result) => result.metricValue !== null)
    .map((result, index) => {
      const spread = Math.max(result.mde ?? Math.abs(result.metricValue ?? 0) * 0.18, 0.01)
      const center = result.metricValue ?? 0
      return {
        result,
        color: trendPalette[index % trendPalette.length],
        left: Math.max(4, Math.min(72, (center - spread) * 100)),
        width: Math.max(18, Math.min(54, spread * 260)),
      }
    }),
)

const boxPlotRows = computed(() =>
  selectedCoreMetricRows.value
    .filter((result) => result.metricValue !== null)
    .map((result, index) => {
      const value = result.metricValue ?? 0
      const ci = result.confidenceInterval
      const spread = Math.max(result.mde ?? Math.abs(value) * 0.16, 0.01)
      const min = Math.max(0, value - spread * 1.5)
      const q1 = Math.max(0, value - spread * 0.65)
      const median = value
      const q3 = value + spread * 0.65
      const max = value + spread * 1.5
      const scaleMax = Math.max(max, ...selectedCoreMetricRows.value.map((item) => item.metricValue ?? 0), 0.01)
      return {
        result,
        color: trendPalette[index % trendPalette.length],
        min: (min / scaleMax) * 100,
        q1: (q1 / scaleMax) * 100,
        median: (median / scaleMax) * 100,
        q3: (q3 / scaleMax) * 100,
        max: (max / scaleMax) * 100,
        ci,
      }
    }),
)

const statusOptions = Object.entries(statusLabels).map(([value, label]) => ({ label, value }))
const typeOptions = Object.entries(typeLabels).map(([value, label]) => ({ label, value }))
const visibilityOptions = [
  { label: '全部可见性', value: 'ALL' },
  { label: '公共实验', value: 'PUBLIC' },
  { label: '私有实验', value: 'PRIVATE' },
]
const permissionTypeOptions = [
  { label: '查看权限', value: 'view' },
  { label: '协作权限', value: 'collaborate' },
]
const permissionSubjectTypeOptions = [
  { label: '用户', value: 'USER' },
  { label: '角色', value: 'ROLE' },
]
const hitSubjectTypeOptions = [
  { label: 'UID', value: 'uid' },
  { label: 'DID', value: 'did' },
  { label: 'SSID', value: 'ssid' },
]
const hitStatusOptions = [
  { label: '全部命中状态', value: 'all' },
  { label: '命中实验', value: 'hit' },
  { label: '未命中', value: 'not_hit' },
  { label: '白名单', value: 'whitelist' },
  { label: '受众排除', value: 'excluded' },
]
const hitSortOptions = [
  { label: '查询时间', value: 'queriedAt' },
  { label: '实验名称', value: 'experimentName' },
  { label: '命中状态', value: 'hitStatus' },
]
const sortOrderOptions = [
  { label: '降序', value: 'desc' },
  { label: '升序', value: 'asc' },
]
const dedupScopeOptions = [
  { label: '分流决策', value: 'decision' },
  { label: '曝光日志', value: 'exposure' },
  { label: '指标快照', value: 'metric' },
]
const dedupScheduleOptions = [
  { label: '手动运行', value: 'manual' },
  { label: '每日运行', value: 'daily' },
]
const boardRangeOptions = [
  { label: '近 24 小时', value: '24h' },
  { label: '近 7 天', value: '7d' },
  { label: '近 14 天', value: '14d' },
  { label: '近 30 天', value: '30d' },
  { label: '自定义', value: 'custom' },
]
const boardGranularityOptions = [
  { label: '小时', value: 'hour' },
  { label: '天', value: 'day' },
]
const boardWidgetTypeOptions = [
  { label: '指标', value: 'metric' },
  { label: '实验健康度', value: 'experiment_health' },
  { label: '报警', value: 'alarm' },
  { label: '文本', value: 'text' },
  { label: 'Diff', value: 'diff' },
]
const boardDataSourceOptions = [
  { label: '必看指标', value: 'must_see' },
  { label: '实验', value: 'experiment' },
  { label: '报警', value: 'alarm' },
  { label: '自定义', value: 'custom' },
]
const templateLockedFieldLabels = {
  type: '实验类型',
  metrics: '指标快照',
  trafficLayer: '流量层',
  specialConfig: '专属配置',
}
const testUserAudienceRequirementOptions = [
  { label: '白名单用户可绕过受众规则', value: 'IGNORE_AUDIENCE' },
  { label: '白名单用户也必须满足受众规则', value: 'REQUIRE_AUDIENCE' },
]
const splitUrlMatchModeOptions = [
  { label: '简单匹配', value: 'SIMPLE' },
  { label: '精准匹配', value: 'PRECISE' },
]
const splitUrlRuleTypeOptions = [
  { label: '路径匹配', value: 'path' },
  { label: '完整 URL', value: 'full_url' },
  { label: '正则表达式', value: 'regex' },
]
const visualPropertyOptions = [
  { label: '文案', value: 'text' },
  { label: '颜色', value: 'color' },
  { label: '图片', value: 'image' },
  { label: '显隐', value: 'visibility' },
  { label: '位置', value: 'position' },
]
const pushApprovalStatusOptions = [
  { label: '草稿', value: 'DRAFT' },
  { label: '审核中', value: 'REVIEWING' },
  { label: '已通过', value: 'APPROVED' },
]
const mvtAllocationModeOptions = [
  { label: '组合均分', value: 'COMBINATION_EQUAL' },
  { label: '手动分配', value: 'MANUAL' },
]
const mabAlgorithmOptions = [
  { label: 'Thompson Sampling', value: 'THOMPSON_SAMPLING' },
  { label: 'Epsilon Greedy', value: 'EPSILON_GREEDY' },
  { label: 'UCB', value: 'UCB' },
]
const personalizationConflictOptions = [
  { label: '按优先级', value: 'PRIORITY' },
  { label: '首个命中', value: 'FIRST_MATCH' },
]
const parentTrafficModeOptions = [
  { label: '锁定父实验桶', value: 'LOCK_PARENT_BUCKET' },
  { label: '父流量内重哈希', value: 'REHASH_IN_PARENT' },
]
const reverseHoldoutSourceOptions = [
  { label: '原对照组', value: 'ORIGINAL_CONTROL' },
  { label: '未曝光用户', value: 'UNEXPOSED_USERS' },
]
const rollbackPolicyOptions = [
  { label: '自动回滚', value: 'AUTO_ROLLBACK' },
  { label: '人工确认', value: 'MANUAL_CONFIRM' },
]
const adPlatformOptions = [
  { label: '巨量引擎', value: 'OCEAN_ENGINE' },
  { label: '腾讯广告', value: 'TENCENT_ADS' },
  { label: 'Meta', value: 'META' },
]
const adAccountStatusOptions = [
  { label: '已授权', value: 'AUTHORIZED' },
  { label: '授权过期', value: 'EXPIRED' },
  { label: '待授权', value: 'PENDING' },
]
const adAssetTypeOptions = [
  { label: '图片', value: 'IMAGE' },
  { label: '视频', value: 'VIDEO' },
  { label: '文案', value: 'COPY' },
]
const adReviewStatusOptions = [
  { label: '草稿', value: 'DRAFT' },
  { label: '审核中', value: 'REVIEWING' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已拒绝', value: 'REJECTED' },
]
const adObjectiveOptions = [
  { label: '转化', value: 'CONVERSION' },
  { label: '点击', value: 'CLICK' },
  { label: '留存', value: 'RETENTION' },
]
const bidStrategyOptions = [
  { label: '最低成本', value: 'LOWEST_COST' },
  { label: '成本上限', value: 'COST_CAP' },
]
const adAuditStatusOptions = [
  { label: '未提交', value: 'NOT_SUBMITTED' },
  { label: '已提交', value: 'SUBMITTED' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已拒绝', value: 'REJECTED' },
]
const roleSubjectOptions = [
  { label: '集团管理员', value: 'role_super_admin' },
  { label: '应用管理员', value: 'role_app_admin' },
  { label: '广告账户管理员', value: 'role_ad_admin' },
  { label: '看板 Owner', value: 'role_board_owner' },
]
const appCapability = {
  clientSdk: true,
  serverSdk: true,
  visualEditor: true,
  pushChannel: false,
  mvtCapacity: false,
  personalization: true,
  parentExperiment: true,
  reverseExperiment: true,
  adAuthorized: false,
}
const businessLineOptions = [
  { label: '增长业务线', value: 'biz_growth' },
  { label: '商业化业务线', value: 'biz_monetization' },
  { label: '产品体验业务线', value: 'biz_product' },
]
const appMemberOptions = computed(() =>
  (abStore.appMembers ?? []).map((member) => ({
    label: `${member.name} · ${member.department}`,
    value: member.id,
  })),
)
const draftDurationWarning = computed(() =>
  draftExperiment.value.durationDays < 7 ? '实验时长小于 7 天，提交前会提示样本稳定性风险。' : '',
)
const experimentTypes = computed(() =>
  experimentTypeCatalog.map((item) => {
    const createGranted = permissionContext.value.permissions.experiment_create === true
    const reason =
      !createGranted
        ? '当前用户缺少 experiment_create 权限。'
        : item.value === 'CLIENT_CODE' && !appCapability.clientSdk
          ? '当前应用未检测到客户端 SDK 接入，无法创建客户端实验。'
          : item.value === 'SERVER_CODE' && !appCapability.serverSdk
            ? '当前应用未接入服务端 SDK 或分流 Agent。'
            : item.value === 'VISUAL' && !appCapability.visualEditor
              ? '当前应用未开启可视化能力。'
              : item.value === 'PUSH' && !appCapability.pushChannel
                ? '当前应用未配置推送通道。'
                : item.value === 'MVT' && !appCapability.mvtCapacity
                  ? '当前应用访问量不足，暂不建议创建 MVT。'
                  : ['PERSONALIZATION_WEB', 'PERSONALIZATION_CODE'].includes(item.value) && !appCapability.personalization
                    ? '当前应用未开通个性化策略能力。'
                    : item.value === 'PARENT_CHILD' && !appCapability.parentExperiment
                      ? '当前应用暂无可用运行中父实验。'
                      : item.value === 'REVERSE' && !appCapability.reverseExperiment
                        ? '当前应用暂无可关联的已完成实验。'
                        : item.value === 'AD' && !appCapability.adAuthorized
                          ? '当前广告账户未完成外部平台授权。'
                          : ''
    return {
      ...item,
      label: typeLabels[item.value],
      available: !reason,
      reason,
    }
  }),
)
const selectedExperimentTypeInfo = computed(
  () => experimentTypes.value.find((item) => item.value === draftExperiment.value.type) ?? experimentTypes.value[0],
)
const featureTerminalOptions = [
  { label: '客户端', value: 'client' },
  { label: '服务端', value: 'server' },
]
const featureTypeOptions = [
  { label: '公开', value: 'public' },
  { label: '私有', value: 'private' },
]
const featureVariantTypeOptions = [
  { label: '布尔值', value: 'boolean' },
  { label: '字符串', value: 'string' },
  { label: '数字', value: 'number' },
  { label: 'JSON', value: 'json' },
]
const featureStatusLabels: Record<FeatureStatus, string> = {
  enabled: '开启',
  disabled: '关闭',
  deleted: '已删除',
}
const featurePublishStatusLabels: Record<FeaturePublishStatus, string> = {
  unpublished: '未发布',
  pending_publish: '待发布',
  gray: '灰度中',
  publish_confirm: '发布确认',
  full: '已全量',
  rolled_back: '已回滚',
  disabled: '已关闭',
  canceled: '取消发布',
}
const featurePermissionLevelLabels: Record<AbPermissionLevel, string> = {
  none: '无权限',
  view: '查看权限',
  collaborate: '协作者权限',
  admin: '协作者权限',
}
const featurePermissionScopeRows = [
  {
    name: '查看权限',
    content: '列表、详情、操作历史、发布历史',
    boundary: '只能查看，不能新建、编辑、发布、回滚或变更权限',
  },
  {
    name: '协作者权限',
    content: '新建、编辑、发布、回滚、开启、关闭、关联实验、白名单、删除、权限管理',
    boundary: '包含查看能力，并允许修改 Feature 类型',
  },
]
const featurePermissionRoleRows = [
  {
    role: '集团管理员',
    publicFeature: '协作者',
    privateFeature: '协作者',
    note: '公共和私有 Feature 均可查看与协作',
  },
  {
    role: '应用管理员',
    publicFeature: '协作者',
    privateFeature: '协作者',
    note: '公共和私有 Feature 均可查看与协作',
  },
  {
    role: 'Feature 创建者 / Owner',
    publicFeature: '协作者',
    privateFeature: '协作者',
    note: 'Owner 是该 Feature 的默认协作者',
  },
  {
    role: '普通用户',
    publicFeature: '查看',
    privateFeature: '不可见',
    note: '公共 Feature 可见，私有 Feature 不出现在列表和详情中',
  },
  {
    role: '无权限用户',
    publicFeature: '不可见',
    privateFeature: '不可见',
    note: '直接访问 URL 时展示无权限页面',
  },
]
const featureStatusOptions = Object.entries(featureStatusLabels).map(([value, label]) => ({ label, value }))
const featurePublishStatusOptions = Object.entries(featurePublishStatusLabels).map(([value, label]) => ({ label, value }))
const publishTypeOptions = [
  { label: '手动发布', value: 'manual' },
  { label: '定时自动发布', value: 'scheduled' },
]
const whitelistModeOptions = [
  { label: '已有版本', value: 'existing' },
  { label: '自定义', value: 'custom' },
]
const whitelistStatusOptions = [
  { label: '全部', value: 'all' },
  { label: '生效中', value: 'active' },
  { label: '已失效', value: 'expired' },
  { label: '已终止', value: 'terminated' },
]
const activeFeatureSubPage = computed(() => String(route.meta.featureSubPage ?? 'list') as FeatureSubPage)
const featureSubPageTabs = computed(() => [
  { name: 'list', label: '列表', path: '/ab-testing/features' },
  { name: 'create', label: '创建', path: '/ab-testing/features/create' },
  { name: 'solidify', label: '实验固化', path: '/ab-testing/features/solidify' },
  {
    name: 'detail',
    label: '详情',
    path: selectedFeatureId.value ? `/ab-testing/features/${selectedFeatureId.value}` : '/ab-testing/features',
    disabled: !selectedFeatureId.value,
  },
  {
    name: 'versions',
    label: '版本',
    path: selectedFeatureId.value ? `/ab-testing/features/${selectedFeatureId.value}/versions` : '/ab-testing/features',
    disabled: !selectedFeatureId.value,
  },
  {
    name: 'whitelist',
    label: '白名单',
    path: selectedFeatureId.value ? `/ab-testing/features/${selectedFeatureId.value}/whitelist` : '/ab-testing/features',
    disabled: !selectedFeatureId.value,
  },
  {
    name: 'publish',
    label: '发布/回滚',
    path: selectedFeatureId.value ? `/ab-testing/features/${selectedFeatureId.value}/publish` : '/ab-testing/features',
    disabled: !selectedFeatureId.value,
  },
  { name: 'history', label: '发布历史', path: '/ab-testing/features/history' },
  {
    name: 'lifecycle',
    label: '生命周期',
    path: selectedFeatureId.value ? `/ab-testing/features/${selectedFeatureId.value}/lifecycle` : '/ab-testing/features',
    disabled: !selectedFeatureId.value,
  },
  {
    name: 'permissions',
    label: '权限',
    path: selectedFeatureId.value ? `/ab-testing/features/${selectedFeatureId.value}/permissions` : '/ab-testing/features/permissions',
  },
  {
    name: 'logs',
    label: '操作日志',
    path: selectedFeatureId.value ? `/ab-testing/features/${selectedFeatureId.value}/logs` : '/ab-testing/features/logs',
    disabled: !selectedFeatureId.value,
  },
])
const featureDraftTagsText = computed({
  get: () => featureDraft.value.tags.join(','),
  set: (value: string) => {
    updateFeatureDraftTags(value.split(',').map((item) => item.trim()).filter(Boolean))
  },
})
const featureDraftOwnersText = computed({
  get: () => featureDraft.value.owners.join(','),
  set: (value: string) => {
    updateFeatureDraftOwners(value.split(',').map((item) => item.trim()).filter(Boolean))
  },
})

function updateFeatureDraftTags(tags: string[]) {
  const nextTags: string[] = []
  const seen = new Set<string>()
  for (const rawTag of tags.map((tag) => tag.trim()).filter(Boolean)) {
    const normalized = rawTag.toLowerCase()
    if (rawTag.length > 20) {
      message.warning('单个标签最长 20 个字符')
      continue
    }
    if (seen.has(normalized)) {
      message.warning('标签已存在')
      continue
    }
    if (nextTags.length >= 10) {
      message.warning('标签最多选择或创建 10 个')
      break
    }
    seen.add(normalized)
    nextTags.push(rawTag)
  }
  featureDraft.value.tags = nextTags
}

function updateFeatureDraftOwners(ownerIds: EntityId[]) {
  const nextOwners = [...new Set(ownerIds.filter(Boolean))]
  if (!nextOwners.length) {
    message.warning('至少保留 1 个 Owner')
    return
  }
  featureDraft.value.owners = nextOwners
}

function clearFeatureDraftApp() {
  featureDraft.value.appId = ''
  message.warning('适用 App 不能为空，保存前请重新选择')
}

function featureAudienceFieldOptions(source: AudienceRule['conditions'][number]['fieldSource']) {
  if (source === 'custom_variable') {
    return featureVariableDrafts.value.map((variable) => ({ label: `${variable.name} · ${variable.key}`, value: variable.key }))
  }
  if (source === 'segment') {
    return (abStore.segmentOptions ?? []).map((segment) => ({ label: segment.name, value: segment.id }))
  }
  const sourceMap: Record<string, AudienceConditionSource> = {
    user_property: 'user',
    device_property: 'device',
    event_property: 'event',
  }
  const mappedSource = sourceMap[source]
  return mappedSource ? audienceFieldOptions(mappedSource) : []
}

function parseFeatureAudienceValue(value: string, operator: AudienceRule['conditions'][number]['operator']) {
  if (operator === 'in' || operator === 'not_in') return value.split(',').map((item) => item.trim()).filter(Boolean)
  if (operator === 'between') return value.split(',').map((item) => Number(item.trim())).filter((item) => Number.isFinite(item)).slice(0, 2)
  if (['gt', 'gte', 'lt', 'lte'].includes(operator)) {
    const numberValue = Number(value)
    return Number.isFinite(numberValue) ? numberValue : value
  }
  return value
}

function formatFeatureAudienceValue(value: unknown) {
  return Array.isArray(value) ? value.join(',') : String(value ?? '')
}

function setFeatureDraftVariantNameRef(variantId: EntityId, element: unknown) {
  featureDraftVariantNameRefs.value[variantId] = element as { focus?: () => void } | null
}

function scrollFeatureCreateSection(key: string) {
  featureCreateHelpKey.value = key
  document.getElementById(`feature-create-section-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const featureDraftVariantOptions = computed(() =>
  featureDraft.value.variants.map((variant) => ({ label: variant.name, value: variant.variantId })),
)
const featureDraftRuleName = computed({
  get: () => featureDraft.value.audienceRules?.[0]?.name ?? '',
  set: (value: string) => {
    ensureFeatureDraftRules()
    const rule = featureDraft.value.audienceRules?.[0]
    if (rule) rule.name = value
  },
})
const featureDraftRuleFieldName = computed({
  get: () => featureDraft.value.audienceRules?.[0]?.conditions[0]?.fieldName ?? '',
  set: (value: string) => {
    ensureFeatureDraftRules()
    const condition = featureDraft.value.audienceRules?.[0]?.conditions[0]
    if (condition) condition.fieldName = value
  },
})
const featureDraftRuleValueText = computed({
  get: () => String(featureDraft.value.audienceRules?.[0]?.conditions[0]?.value ?? ''),
  set: updateFeatureDraftRuleValue,
})
const featureDraftRuleVariantId = computed({
  get: () => featureDraft.value.audienceRules?.[0]?.variantId ?? '',
  set: updateFeatureDraftRuleVariant,
})
const featureVersionVariantOptions = computed(() =>
  featureVersionDraft.value.variants.map((variant) => ({ label: variant.name, value: variant.variantId })),
)
const featureVersionRuleName = computed({
  get: () => featureVersionDraft.value.audienceRules[0]?.name ?? '',
  set: (value: string) => {
    const rule = featureVersionDraft.value.audienceRules[0]
    if (rule) rule.name = value
  },
})
const featureVersionRuleFieldName = computed({
  get: () => featureVersionDraft.value.audienceRules[0]?.conditions[0]?.fieldName ?? '',
  set: (value: string) => {
    const condition = featureVersionDraft.value.audienceRules[0]?.conditions[0]
    if (condition) condition.fieldName = value
  },
})
const featureVersionRuleValueText = computed({
  get: () => String(featureVersionDraft.value.audienceRules[0]?.conditions[0]?.value ?? ''),
  set: updateFeatureVersionRuleValue,
})
const featureVersionRuleVariantId = computed({
  get: () => featureVersionDraft.value.audienceRules[0]?.variantId ?? '',
  set: (value: EntityId) => {
    const rule = featureVersionDraft.value.audienceRules[0]
    if (rule) rule.variantId = value
  },
})

watch(
  () => featureDraft.value.variantType,
  (type) => {
    if (type === 'boolean') {
      featureParamValidation.value = createEmptyFeatureParamValidation()
    }
    if (type !== 'boolean') return
    featureDraft.value.variants = [
      { variantId: 'bool_false', name: 'False', value: false, description: '关闭或默认不生效' },
      { variantId: 'bool_true', name: 'True', value: true, description: '开启或命中配置' },
    ]
    featureDraft.value.defaultVariantId = 'bool_false'
    featureDraft.value.defaultRule = {
      ruleId: 'else',
      name: '默认规则',
      order: 999,
      conditions: [],
      deliveryType: 'single_variant',
      variantId: 'bool_false',
    }
    featureDraft.value.audienceRules = [
      {
        ruleId: 'rule_core_user',
        name: '核心用户',
        order: 1,
        conditions: [{ fieldSource: 'user_property', fieldName: 'city', operator: 'in', value: ['北京', '上海'] }],
        deliveryType: 'single_variant',
        variantId: 'bool_true',
      },
    ]
  },
)

watch(
  () => featureParamValidation.value.enabled,
  (enabled) => {
    if (enabled) return
    featureParamValidation.value = createEmptyFeatureParamValidation()
  },
)

watch(
  () => featureVersionDraft.value.variantType,
  (type) => {
    if (type !== 'boolean') return
    featureVersionDraft.value.variants = [
      { variantId: 'version_bool_false', name: 'False', value: false, description: '关闭或默认不生效' },
      { variantId: 'version_bool_true', name: 'True', value: true, description: '开启或命中配置' },
    ]
    featureVersionDraft.value.defaultRule = {
      ruleId: 'else',
      name: '默认规则',
      order: 999,
      conditions: [],
      deliveryType: 'single_variant',
      variantId: 'version_bool_false',
    }
    featureVersionDraft.value.audienceRules = [
      {
        ruleId: 'rule_city_core',
        name: '核心城市用户',
        order: 1,
        conditions: [{ fieldSource: 'user_property', fieldName: 'city', operator: 'in', value: ['北京', '上海'] }],
        deliveryType: 'single_variant',
        variantId: 'version_bool_true',
      },
    ]
  },
)
const paramTypeOptions = [
  { label: 'Number', value: 'NUMBER' },
  { label: 'String', value: 'STRING' },
  { label: 'Boolean', value: 'BOOLEAN' },
  { label: 'Json', value: 'JSON' },
]
const previewModalVisible = ref(false)
const previewVariantTempId = ref<EntityId>('draft_control')
const uniformDetailModalVisible = ref(false)
const smoothLogModalVisible = ref(false)
const previewVariant = computed(
  () => draftExperiment.value.variants.find((variant) => variant.tempId === previewVariantTempId.value) ?? draftExperiment.value.variants[0],
)
const previewJson = computed(() => JSON.stringify(previewVariant.value?.params ?? {}, null, 2))
const previewDiffEntries = computed(() => {
  const control = draftExperiment.value.variants.find((variant) => variant.isControl)
  const current = previewVariant.value
  if (!control || !current || control.tempId === current.tempId) return []
  const keys = new Set([...Object.keys(control.params), ...Object.keys(current.params)])
  return [...keys]
    .map((key) => ({
      key,
      control: JSON.stringify(control.params[key]),
      current: JSON.stringify(current.params[key]),
    }))
    .filter((item) => item.control !== item.current)
})
const previewVariantOptions = computed(() =>
  draftExperiment.value.variants.map((variant) => ({ label: variant.name, value: variant.tempId })),
)
const variantTempOptions = computed(() =>
  draftExperiment.value.variants.map((variant) => ({
    label: `${variant.name}${variant.isControl ? ' · 对照组' : ''}`,
    value: variant.tempId,
  })),
)
const audienceSourceOptions = [
  { label: '用户属性', value: 'user' },
  { label: '设备属性', value: 'device' },
  { label: '事件行为', value: 'event' },
  { label: '服务端变量', value: 'server' },
]
const audienceRelationOptions = [
  { label: '全部满足', value: 'AND' },
  { label: '任一满足', value: 'OR' },
]
const audienceOperatorOptions = (abStore.audienceOperators ?? []).map((operator) => ({ label: operator, value: operator }))
const segmentSelectOptions = (abStore.segmentOptions ?? []).map((segment) => ({
  label: `${segment.name} · ${formatNumber(segment.estimatedUsers)} 人`,
  value: segment.id,
}))
const pushSendModeOptions = [
  { label: '定时发送', value: 'SCHEDULED' },
  { label: '触发发送', value: 'TRIGGER' },
]
const parentExperimentOptions = computed(() =>
  experiments.value
    .filter((experiment) => ['RUNNING', 'DEBUGGING', 'READY'].includes(experiment.status))
    .map((experiment) => ({ label: experiment.name, value: experiment.id })),
)
const endedExperimentOptions = computed(() =>
  experiments.value.map((experiment) => ({ label: experiment.name, value: experiment.id })),
)
const parentVariantOptions = computed(() =>
  draftExperiment.value.specialConfig.parentChild.parentExperimentId === abStore.planningBundle?.experiment?.id
    ? (abStore.planningBundle?.variants ?? []).map((variant) => ({ label: variant.name, value: variant.id }))
    : [
        { label: '对照组', value: 'var_feed_control' },
        { label: '实验组 1', value: 'var_feed_new' },
      ],
)
const reverseControlVariantOptions = computed(() => [
  { label: '原对照组', value: 'var_feed_control' },
  { label: '首页按钮对照组', value: 'var_home_control' },
])
const visualElementOptions = computed(() =>
  draftExperiment.value.specialConfig.visual.elements.map((element) => ({ label: element.name, value: element.id })),
)
const mvtElementOptions = computed(() =>
  draftExperiment.value.specialConfig.mvt.elements.map((element) => ({ label: element.name, value: element.id })),
)
const adAccountOptions = computed(() =>
  draftExperiment.value.specialConfig.ad.accounts.map((account) => ({
    label: `${account.name} · ${account.platform} · ${account.status === 'AUTHORIZED' ? '已授权' : '未就绪'}`,
    value: account.id,
  })),
)
const compatibleTrafficLayerOptions = computed(() =>
  compatibleTrafficLayers.value.map((layer) => ({
    label: `${layer.name} · 可用 ${formatPercent(layer.availableTrafficRatio)}`,
    value: layer.id,
  })),
)
const compatibleMutexDomainOptions = computed(() =>
  compatibleMutexDomainGroups.value.flatMap((group) =>
    group.domains.map((domain) => ({
      label: `${group.name} / ${domain.name} · ${domain.runningExperimentIds.length ? '占用中' : '空闲'}`,
      value: domain.id,
      disabled: domain.runningExperimentIds.length > 0,
    })),
  ),
)
const mutexGroupOptions = computed(() =>
  mutexDomainGroups.value.map((group) => ({ label: group.name, value: group.id })),
)
const trafficLayerUsedAverage = computed(() => {
  if (!trafficLayers.value.length) return 0
  const total = trafficLayers.value.reduce((sum, layer) => sum + layer.usedTrafficRatio, 0)
  return Number((total / trafficLayers.value.length).toFixed(1))
})
const trafficLayerAvailableAverage = computed(() => {
  if (!trafficLayers.value.length) return 0
  const total = trafficLayers.value.reduce((sum, layer) => sum + layer.availableTrafficRatio, 0)
  return Number((total / trafficLayers.value.length).toFixed(1))
})
const mutexDomainCount = computed(() =>
  mutexDomainGroups.value.reduce((sum, group) => sum + group.domains.length, 0),
)
const occupiedMutexDomainCount = computed(() =>
  mutexDomainGroups.value.reduce(
    (sum, group) => sum + group.domains.filter((domain) => domain.runningExperimentIds.length > 0).length,
    0,
  ),
)
const uniformStatusTagType = computed(() => {
  if (draftExperiment.value.trafficConfig.uniformStatus === 'SUCCESS') return 'success'
  if (draftExperiment.value.trafficConfig.uniformStatus === 'FAILED') return 'error'
  if (draftExperiment.value.trafficConfig.uniformStatus === 'RUNNING') return 'warning'
  return 'default'
})
const smoothTaskProgress = computed(() => {
  const task = planningBundle.value?.smoothTask
  if (!task) return 0
  if (task.targetTrafficRatio === task.startTrafficRatio) return 100
  const progress =
    ((task.currentTrafficRatio - task.startTrafficRatio) / (task.targetTrafficRatio - task.startTrafficRatio)) * 100
  return Math.min(100, Math.max(0, Number(progress.toFixed(1))))
})
const smoothTaskStatusType = computed(() => {
  const status = planningBundle.value?.smoothTask?.status
  if (status === 'RUNNING') return 'warning'
  if (status === 'FINISHED') return 'success'
  if (status === 'FAILED' || status === 'ROLLED_BACK') return 'error'
  return 'default'
})
const allPagedExperimentsSelected = computed(
  () =>
    pagedExperiments.value.length > 0 &&
    pagedExperiments.value.every((experiment) => selectedExperimentIds.value.includes(experiment.id)),
)

type ExperimentUiAction =
  | AbExperimentAction
  | 'view_report'
  | 'copy'
  | 'delete'
  | 'permission'
  | 'diagnose'
  | 'history'
  | 'parent_child'
  | 'reverse'

const actionLabels: Record<ExperimentUiAction, string> = {
  save_draft: '保存草稿',
  submit_debug: '提交调试',
  start: '启动',
  pause: '暂停',
  freeze: '冻结',
  resume: '恢复',
  stop: '停止',
  restart: '重启',
  archive: '归档',
  edit: '编辑',
  solidify_feature: '固化至 Feature',
  manage_permission: '权限管理',
  view_report: '查看报告',
  copy: '复制',
  delete: '删除',
  permission: '权限管理',
  diagnose: '诊断',
  history: '操作历史',
  parent_child: '开启父子实验',
  reverse: '开启反转实验',
}

const rowActionMatrix: Record<AbExperimentStatus, { primary: ExperimentUiAction[]; more: ExperimentUiAction[] }> = {
  DRAFT: { primary: ['edit'], more: ['copy', 'delete', 'permission', 'history'] },
  DEBUGGING: { primary: ['edit', 'start', 'diagnose'], more: ['copy', 'delete', 'permission', 'history'] },
  READY: { primary: ['edit', 'start'], more: ['copy', 'permission', 'history'] },
  RUNNING: {
    primary: ['view_report', 'pause', 'freeze', 'stop'],
    more: ['edit', 'diagnose', 'solidify_feature', 'permission', 'history', 'parent_child'],
  },
  PAUSING: { primary: ['stop'], more: ['permission', 'history'] },
  PAUSED: { primary: ['resume', 'edit', 'stop'], more: ['diagnose', 'permission', 'history'] },
  FROZEN: { primary: ['resume', 'stop'], more: ['diagnose', 'solidify_feature', 'permission', 'history'] },
  STOPPING: { primary: [], more: ['permission', 'history'] },
  STOPPED: { primary: ['restart'], more: ['copy', 'permission', 'history'] },
  ENDED: { primary: ['view_report', 'restart'], more: ['copy', 'solidify_feature', 'reverse', 'permission', 'history'] },
  ARCHIVED: { primary: [], more: ['history'] },
}

const templateModalVisible = ref(false)
const selectedTemplateId = ref(abStore.experimentTemplateOptions[0]?.id ?? '')
const permissionModalVisible = ref(false)
const permissionDraft = ref<{
  experimentId: EntityId
  visibility: AbExperimentVisibility
  grants: ExperimentPermissionGrant[]
}>({
  experimentId: '',
  visibility: 'PUBLIC',
  grants: [],
})
const highRiskActionSet = new Set<AbExperimentAction>(['start', 'pause', 'freeze', 'resume', 'stop', 'restart'])
const actionConfirmVisible = ref(false)
const pendingAction = ref<{ experiment: Experiment; action: AbExperimentAction } | null>(null)
const actionConfirmChecks = ref({
  impact: false,
  cache: false,
  risk: false,
  restartLimit: false,
})
const actionConfirmInfo = computed(() => {
  const item = pendingAction.value
  if (!item) {
    return {
      title: '高危操作确认',
      impact: '',
      cacheHint: '',
      risk: '',
      restartBlocked: false,
      restartHint: '',
    }
  }
  const { experiment, action } = item
  const nextStatus = action === 'start' || action === 'resume' || action === 'restart'
    ? 'RUNNING'
    : action === 'pause'
      ? 'PAUSED'
      : action === 'freeze'
        ? 'FROZEN'
        : action === 'stop'
          ? 'ENDED'
          : experiment.status
  const restartedWithin24h =
    action === 'restart' && Date.now() - new Date(experiment.updatedAt).getTime() < 24 * 60 * 60 * 1000
  return {
    title: `${actionLabels[action]}「${experiment.name}」`,
    impact: `实验将从「${statusLabels[experiment.status]}」进入「${statusLabels[nextStatus]}」，影响当前命中用户、报告口径和后续可编辑范围。`,
    cacheHint:
      action === 'start' || action === 'resume' || action === 'restart'
        ? '启动类操作会刷新分流缓存，请确认 SDK/服务端缓存 TTL 已覆盖灰度窗口。'
        : '暂停、冻结或停止后，客户端与服务端缓存可能短时间保留旧命中结果。',
    risk:
      action === 'stop'
        ? '停止后实验将进入结论沉淀流程，未完成的平滑任务和未导出的报告需提前处理。'
        : action === 'pause' || action === 'freeze'
          ? '缩量或冻结可能造成版本样本不均衡，请确认已接受指标波动风险。'
          : '启动或恢复会重新接入真实流量，请确认受众、白名单和互斥域已复核。',
    restartBlocked: restartedWithin24h,
    restartHint: restartedWithin24h ? '距离上次状态变更不足 24 小时，PRD 要求不可重启。' : '已确认满足 24 小时重启限制。',
  }
})
const canConfirmHighRiskAction = computed(() => {
  if (!pendingAction.value) return false
  if (actionConfirmInfo.value.restartBlocked) return false
  return (
    actionConfirmChecks.value.impact &&
    actionConfirmChecks.value.cache &&
    actionConfirmChecks.value.risk &&
    (pendingAction.value.action !== 'restart' || actionConfirmChecks.value.restartLimit)
  )
})

const permissionSubjectOptions = computed(() => {
  const userOptions = appMemberOptions.value.map((member) => ({
    ...member,
    subjectType: 'USER' as const,
  }))
  const roleOptions = roleSubjectOptions.map((role) => ({
    ...role,
    subjectType: 'ROLE' as const,
  }))
  return { userOptions, roleOptions }
})

function audienceFieldOptions(source: AudienceConditionSource) {
  return (abStore.audienceFieldOptions?.[source] ?? []).map((field) => ({ label: field.label, value: field.value }))
}

function formatAudienceValue(condition: AudienceCondition) {
  return abStore.stringifyAudienceValue(condition.value)
}

function getExperimentPermissionLevel(experiment: Experiment) {
  return getAbPermissionLevel(permissionContext.value, {
    ownerId: experiment.ownerId,
    collaboratorIds: experiment.collaboratorIds,
    visibility: experiment.visibility,
  })
}

function isTransitionAction(action: ExperimentUiAction): action is AbExperimentAction {
  return [
    'save_draft',
    'submit_debug',
    'start',
    'pause',
    'freeze',
    'resume',
    'stop',
    'restart',
    'archive',
    'edit',
    'solidify_feature',
    'manage_permission',
  ].includes(action)
}

function rowActionDisabled(experiment: Experiment, action: ExperimentUiAction) {
  if (!isTransitionAction(action)) return false
  if (action === 'edit' || action === 'manage_permission') {
    return !canUseAbAction(permissionContext.value, action, getExperimentPermissionLevel(experiment)).allowed
  }
  return !getActionAvailability(experiment, action).available
}

function getMoreActionOptions(experiment: Experiment) {
  return rowActionMatrix[experiment.status].more.map((action) => ({
    label: actionLabels[action],
    key: action,
    disabled: rowActionDisabled(experiment, action),
  }))
}

function openCreateWizard() {
  abStore.goToCreateStep(1)
  void router.push('/ab-testing/create')
}

function openTemplateCreateModal() {
  selectedTemplateId.value = abStore.experimentTemplateOptions[0]?.id ?? ''
  templateModalVisible.value = true
}

function applySelectedTemplate() {
  const result = abStore.applyExperimentTemplate(selectedTemplateId.value)
  message[result.success ? 'success' : 'warning'](result.message)
  if (result.success) {
    templateModalVisible.value = false
    void router.push('/ab-testing/create')
  }
}

function goToCreateStep(step: number) {
  const result = abStore.goToCreateStep(step)
  if (!result.allowed) message.warning(result.message)
}

function updateDraftTags(value: Array<string | number> | null) {
  const nextTags = [...new Set((value ?? []).map((item) => String(item).trim()).filter(Boolean))]
  if (nextTags.length > 20) message.warning('实验标签最多选择或创建 20 个')
  draftExperiment.value.tags = nextTags.slice(0, 20)
}

function chooseExperimentType(item: (typeof experimentTypes.value)[number]) {
  if (abStore.isDraftFieldLocked('type')) {
    message.warning('当前实验模板已固化实验类型')
    return
  }
  if (!item.available) {
    message.warning(item.reason)
    return
  }
  const needsClear = currentCreateStep.value > 1 && draftExperiment.value.type !== item.value
  if (needsClear && !window.confirm('切换实验类型将清空后续配置，是否继续？')) return
  abStore.changeDraftExperimentType(item.value, needsClear)
  message.success('实验类型已选择')
}

function saveDraft() {
  const result = abStore.saveDraft()
  message.success(result.message)
}

function nextCreateStep() {
  const result = abStore.nextCreateStep()
  message[result.passed ? 'success' : 'warning'](result.message)
}

function cancelCreateWizard() {
  if (!window.confirm('确认取消创建实验并返回实验列表？')) return
  abStore.resetDraft()
  void router.push('/ab-testing/experiments')
}

function formatParamValue(value: unknown) {
  if (value === undefined || value === null) return ''
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
}

function updateDraftParamKey(schema: ExperimentDraftParamSchema, value: string) {
  abStore.renameDraftParamKey(schema.tempId, value)
}

function updateDraftParamDefault(schema: ExperimentDraftParamSchema, value: string) {
  abStore.updateDraftParamDefaultValue(schema.tempId, value)
}

function updateDraftParamType(schema: ExperimentDraftParamSchema, value: string) {
  abStore.updateDraftParamType(schema.tempId, value as ExperimentDraftParamSchema['type'])
}

function copyDraftParam(schema: ExperimentDraftParamSchema) {
  abStore.copyDraftParamSchema(schema.tempId)
  message.success('参数已复制')
}

function removeDraftParam(schema: ExperimentDraftParamSchema) {
  if (!window.confirm('删除参数会同步清空所有版本的该参数值，是否继续？')) return
  abStore.removeDraftParamSchema(schema.tempId)
  message.success('参数已删除')
}

function copyDraftVariant(variant: ExperimentDraftVariant) {
  abStore.copyDraftVariant(variant.tempId)
  message.success('版本已复制')
}

function removeDraftVariant(variant: ExperimentDraftVariant) {
  if (!window.confirm(`确认删除「${variant.name}」？`)) return
  const result = abStore.removeDraftVariant(variant.tempId)
  message[result.removed ? 'success' : 'warning'](result.message)
}

function setDraftControlVariant(variant: ExperimentDraftVariant) {
  abStore.setDraftControlVariant(variant.tempId)
  message.success('对照组已更新')
}

function formatJsonParam(variant: ExperimentDraftVariant, key: string) {
  const result = abStore.formatDraftJsonParam(variant.tempId, key)
  message[result.success ? 'success' : 'warning'](result.message)
}

function copyControlParamToTreatments(key: string) {
  abStore.copyControlParamToTreatments(key)
  message.success('已从对照组复制到实验组')
}

function openParamPreview(variantTempId = draftExperiment.value.variants[0]?.tempId ?? '') {
  previewVariantTempId.value = variantTempId
  previewModalVisible.value = true
}

function saveTrafficLayer() {
  const result = abStore.saveTrafficLayerDraft()
  message[result.success ? 'success' : 'warning'](result.message)
}

function removeTrafficLayer(layerId: EntityId) {
  if (!window.confirm('确认删除该流量层？')) return
  const result = abStore.deleteTrafficLayer(layerId)
  message[result.success ? 'success' : 'warning'](result.message)
}

function saveMutexGroup() {
  const result = abStore.saveMutexGroupDraft()
  message[result.success ? 'success' : 'warning'](result.message)
}

function removeMutexGroup(groupId: EntityId) {
  if (!window.confirm('确认删除该互斥域组？')) return
  const result = abStore.deleteMutexGroup(groupId)
  message[result.success ? 'success' : 'warning'](result.message)
}

function saveMutexDomain() {
  const result = abStore.saveMutexDomainDraft()
  message[result.success ? 'success' : 'warning'](result.message)
}

function removeMutexDomain(groupId: EntityId, domainId: EntityId) {
  if (!window.confirm('确认删除该互斥域？')) return
  const result = abStore.deleteMutexDomain(groupId, domainId)
  message[result.success ? 'success' : 'warning'](result.message)
}

async function estimateAudience() {
  const result = await abStore.estimateDraftAudience()
  message.success(result.message)
}

async function runUniformDiversion() {
  const result = await abStore.runUniformDiversionTask()
  message[result.success ? 'success' : 'warning'](result.message)
  uniformDetailModalVisible.value = true
}

function cancelUniformDiversion() {
  const result = abStore.cancelUniformDiversionTask()
  message.info(result.message)
}

function updateUniformEnabled(value: boolean) {
  const result = abStore.setUniformDiversionEnabled(value)
  message[result.success ? 'success' : 'warning'](result.message)
}

function updateUniformMode(value: string) {
  const result = abStore.updateUniformDiversionMode(value as 'METRIC' | 'SEGMENT')
  message[result.success ? 'success' : 'warning'](result.message)
}

function updateUniformMetrics(value: Array<string | number>) {
  const result = abStore.updateUniformMetricIds(value.map(String))
  message[result.success ? 'success' : 'warning'](result.message)
}

function updateUniformSegments(value: Array<string | number>) {
  const result = abStore.updateUniformSegmentIds(value.map(String))
  message[result.success ? 'success' : 'warning'](result.message)
}

function applyUniformResult() {
  const result = abStore.applyUniformDiversionResult()
  message[result.success ? 'success' : 'warning'](result.message)
}

function unlockUniformResult() {
  if (!window.confirm('取消应用结果后需要重新调平，是否继续？')) return
  const result = abStore.unlockUniformDiversionConfig()
  message[result.success ? 'success' : 'warning'](result.message)
}

async function loadWorkspace() {
  try {
    await abStore.loadWorkspace()
  } catch {
    message.error('A/B 测试工作台加载失败')
  }
}

async function validateDraft() {
  const result = await abStore.validateDraft()
  message[result.passed ? 'success' : 'warning'](result.passed ? '提交前检查通过' : '仍有必填项需要处理')
}

async function submitDraftForDebug() {
  const result = await abStore.submitDraftForDebug()
  message[result.experiment ? 'success' : 'warning'](result.message)
}

function parseFeatureVariantValue(value: string, type: string) {
  if (type === 'boolean') return value === 'true'
  if (type === 'number') return Number(value)
  if (type === 'json') {
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }
  return value
}

function readFeatureImageFile(file: File, assign: (url: string) => void) {
  const allowedTypes = ['image/png', 'image/jpeg', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    message.warning('配图仅支持 PNG、JPG/JPEG、WebP')
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    message.warning('单张配图不超过 5MB')
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    assign(String(reader.result ?? ''))
    message.success('配图已上传')
  }
  reader.readAsDataURL(file)
}

function handleFeatureImageUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) readFeatureImageFile(file, (url) => (featureDraft.value.imageUrl = url))
  input.value = ''
}

function handleFeatureDraftVariantImageUpload(variantId: EntityId, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  const variant = featureDraft.value.variants.find((item) => item.variantId === variantId)
  if (file && variant) readFeatureImageFile(file, (url) => (variant.imageUrl = url))
  input.value = ''
}

function handleFeatureVersionVariantImageUpload(variantId: EntityId, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  const variant = featureVersionDraft.value.variants.find((item) => item.variantId === variantId)
  if (file && variant) readFeatureImageFile(file, (url) => (variant.imageUrl = url))
  input.value = ''
}

function openFeatureVariantPreview(imageUrl?: string) {
  if (!imageUrl) return
  featureVariantPreviewUrl.value = imageUrl
  featureImagePreviewVisible.value = true
}

function parseFeatureValidationTestValue(value: string, type: string) {
  if (type === 'string') return { valid: true, value }
  if (type === 'number') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? { valid: true, value: parsed } : { valid: false, message: '测试值必须是有效数字' }
  }
  if (type === 'json') {
    try {
      return { valid: true, value: JSON.parse(value) }
    } catch {
      return { valid: false, message: 'JSON 格式错误，请检查测试值' }
    }
  }
  return { valid: true, value }
}

function matchesJsonSchemaType(value: unknown, type: string) {
  if (type === 'integer') return Number.isInteger(value)
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value)
  if (type === 'string') return typeof value === 'string'
  if (type === 'boolean') return typeof value === 'boolean'
  if (type === 'array') return Array.isArray(value)
  if (type === 'object') return typeof value === 'object' && value !== null && !Array.isArray(value)
  if (type === 'null') return value === null
  return true
}

function validateJsonSchemaValue(value: unknown, schema: unknown, path = '根节点') {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return []
  const schemaRecord = schema as Record<string, unknown>
  const errors: string[] = []
  const typeRules = Array.isArray(schemaRecord.type)
    ? schemaRecord.type.filter((item): item is string => typeof item === 'string')
    : typeof schemaRecord.type === 'string'
      ? [schemaRecord.type]
      : []
  if (typeRules.length && !typeRules.some((type) => matchesJsonSchemaType(value, type))) {
    errors.push(`${path} 不符合 JSON Schema 类型 ${typeRules.join('/')}`)
  }
  if (Array.isArray(schemaRecord.enum)) {
    const isAllowed = schemaRecord.enum.some((item) => JSON.stringify(item) === JSON.stringify(value))
    if (!isAllowed) errors.push(`${path} 不在 JSON Schema 枚举范围内`)
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return errors
  const record = value as Record<string, unknown>
  if (Array.isArray(schemaRecord.required)) {
    schemaRecord.required
      .filter((item): item is string => typeof item === 'string')
      .forEach((field) => {
        if (!(field in record)) errors.push(`${path} 缺少 JSON Schema 必填字段 ${field}`)
      })
  }
  if (schemaRecord.properties && typeof schemaRecord.properties === 'object' && !Array.isArray(schemaRecord.properties)) {
    Object.entries(schemaRecord.properties as Record<string, unknown>).forEach(([field, fieldSchema]) => {
      if (field in record) {
        errors.push(...validateJsonSchemaValue(record[field], fieldSchema, `${path}.${field}`))
      }
    })
  }
  return errors
}

function validateFeatureParameterValue(value: unknown, type = featureDraft.value.variantType) {
  if (!featureParamValidation.value.enabled || type === 'boolean') return []
  const errors: string[] = []
  if (type === 'string') {
    const text = String(value ?? '')
    const minLength = featureParamValidation.value.stringMinLength
    const maxLength = featureParamValidation.value.stringMaxLength
    const enums = featureParamValidation.value.stringEnums.split(',').map((item) => item.trim()).filter(Boolean)
    if (minLength !== null && text.length < minLength) errors.push(`字符串长度不能小于 ${minLength}`)
    if (maxLength !== null && text.length > maxLength) errors.push(`字符串长度不能大于 ${maxLength}`)
    if (featureParamValidation.value.stringPattern) {
      try {
        if (!new RegExp(featureParamValidation.value.stringPattern).test(text)) errors.push('字符串未命中正则表达式')
      } catch {
        errors.push('正则表达式格式不合法')
      }
    }
    if (enums.length && !enums.includes(text)) errors.push('字符串值必须在枚举范围内')
  }
  if (type === 'number') {
    const numberValue = typeof value === 'number' ? value : Number(value)
    const precision = Number.isFinite(numberValue) ? featureNumberPrecision(numberValue) : { integerDigits: 0, decimalDigits: 0 }
    if (!Number.isFinite(numberValue)) errors.push('数值必须是合法数字')
    if (!featureParamValidation.value.numberAllowNegative && numberValue < 0) errors.push('数值不能小于 0')
    if (featureParamValidation.value.numberMin !== null && numberValue < featureParamValidation.value.numberMin) errors.push(`数值不能小于 ${featureParamValidation.value.numberMin}`)
    if (featureParamValidation.value.numberMax !== null && numberValue > featureParamValidation.value.numberMax) errors.push(`数值不能大于 ${featureParamValidation.value.numberMax}`)
    if (precision.decimalDigits > featureParamValidation.value.numberDecimalPlaces) {
      errors.push(`小数位不能超过 ${featureParamValidation.value.numberDecimalPlaces} 位`)
    }
  }
  if (type === 'json') {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      errors.push('JSON 值必须是对象')
    } else {
      const record = value as Record<string, unknown>
      const requiredFields = featureParamValidation.value.jsonRequiredFields.split(',').map((item) => item.trim()).filter(Boolean)
      requiredFields.forEach((field) => {
        if (!(field in record)) errors.push(`JSON 缺少必填字段 ${field}`)
      })
      featureParamValidation.value.jsonFieldTypes
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((item) => {
          const [field, expectedType] = item.split(':').map((part) => part.trim())
          if (field && expectedType && field in record && typeof record[field] !== expectedType) {
            errors.push(`${field} 字段类型应为 ${expectedType}`)
          }
        })
      if (featureParamValidation.value.jsonSchemaText.trim()) {
        try {
          const schema = JSON.parse(featureParamValidation.value.jsonSchemaText)
          errors.push(...validateJsonSchemaValue(value, schema))
        } catch {
          errors.push('JSON Schema 格式不合法')
        }
      }
    }
  }
  return [...new Set(errors)]
}

function testFeatureParameterValidation() {
  const parsed = parseFeatureValidationTestValue(featureParamValidation.value.testValue, featureDraft.value.variantType)
  if (!parsed.valid) {
    featureParamValidation.value.testResult = parsed.message ?? '测试值不合法'
    return
  }
  const errors = validateFeatureParameterValue(parsed.value)
  featureParamValidation.value.testResult = errors.length ? errors.join('；') : '测试校验通过'
}

function featureNumberPrecision(value: number) {
  const [integerPart = '', decimalPart = ''] = String(Math.abs(value)).split('.')
  return { integerDigits: integerPart.replace(/^0+/, '').length || 1, decimalDigits: decimalPart.length }
}

function collectFeatureVariantErrors(
  variantType: string,
  variants: Array<{ variantId: EntityId; name: string; value: unknown }>,
  audienceRules: Array<{ deliveryType: string; variantId?: EntityId; variantWeights?: Array<{ variantId: EntityId; weight: number }> }>,
  defaultRule?: { deliveryType: string; variantId?: EntityId; variantWeights?: Array<{ variantId: EntityId; weight: number }> },
) {
  const errors: string[] = []
  const variantIds = new Set<EntityId>()
  const variantValues = new Set<string>()
  variants.forEach((variant) => {
    if (!variant.variantId || variantIds.has(variant.variantId)) errors.push('变体 ID 不能为空且不能重复')
    variantIds.add(variant.variantId)
    if (!variant.name.trim()) errors.push('变体名称不能为空')
    if (variantType === 'string') {
      const value = String(variant.value ?? '')
      if (!value) errors.push(`变体「${variant.name || variant.variantId}」的字符串值不能为空`)
      if (variantValues.has(value)) errors.push('字符串变体值不允许重复')
      variantValues.add(value)
    }
    if (variantType === 'number') {
      if (typeof variant.value !== 'number' || !Number.isFinite(variant.value)) {
        errors.push(`变体「${variant.name || variant.variantId}」必须是有效数字`)
      } else {
        const precision = featureNumberPrecision(variant.value)
        if (precision.integerDigits > 10) errors.push(`变体「${variant.name}」整数位最多 10 位`)
        if (precision.decimalDigits > 5) errors.push(`变体「${variant.name}」小数位最多 5 位`)
      }
    }
    if (variantType === 'json' && (typeof variant.value !== 'object' || variant.value === null)) {
      errors.push(`变体「${variant.name || variant.variantId}」必须是合法 JSON`)
    }
  })
  if (variantType === 'boolean') {
    const booleanValues = variants.map((variant) => variant.value)
    if (variants.length !== 2 || !booleanValues.includes(true) || !booleanValues.includes(false)) {
      errors.push('boolean 类型必须且只能保留 true / false 两个变体')
    }
  }
  const rules = [...audienceRules, ...(defaultRule ? [defaultRule] : [])]
  rules.forEach((rule) => {
    if (rule.deliveryType === 'single_variant' && rule.variantId && !variantIds.has(rule.variantId)) {
      errors.push('受众规则引用了不存在的变体')
    }
    if (rule.deliveryType === 'multi_variant') {
      const totalWeight = Number((rule.variantWeights ?? []).reduce((sum, item) => sum + item.weight, 0).toFixed(3))
      if (Math.abs(totalWeight - 100) > 0.001) errors.push('多变体发布比例合计必须等于 100%')
      if ((rule.variantWeights ?? []).some((item) => !variantIds.has(item.variantId))) {
        errors.push('多变体发布引用了不存在的变体')
      }
    }
  })
  return [...new Set(errors)]
}

function createFeatureRoute(subPage: FeatureSubPage, featureId = selectedFeatureId.value) {
  if (subPage === 'list') return '/ab-testing/features'
  if (subPage === 'create') return '/ab-testing/features/create'
  if (subPage === 'solidify') return '/ab-testing/features/solidify'
  if (subPage === 'history') return '/ab-testing/features/history'
  if (subPage === 'permissions' && !featureId) return '/ab-testing/features/permissions'
  if (subPage === 'logs' && !featureId) return '/ab-testing/features/logs'
  if (!featureId) return '/ab-testing/features'
  if (subPage === 'detail') return `/ab-testing/features/${featureId}`
  return `/ab-testing/features/${featureId}/${subPage}`
}

function openFeatureSubPage(subPage: FeatureSubPage, featureId = selectedFeatureId.value) {
  if (featureId) selectedFeatureId.value = featureId
  void router.push(createFeatureRoute(subPage, featureId))
}

function handleFeatureTabChange(value: string | number) {
  const subPage = String(value) as FeatureSubPage
  const item = featureSubPageTabs.value.find((tab) => tab.name === subPage)
  if (item?.disabled) return
  openFeatureSubPage(subPage)
}

function handleFeatureRowSelect(feature: FeatureFlag) {
  selectedFeatureId.value = feature.featureId
}

function openFeaturePublish(feature: FeatureFlag) {
  selectedFeatureId.value = feature.featureId
  const versionId = feature.currentVersionId ?? selectedLatestFeatureVersion.value?.versionId
  if (versionId) featurePublishDraft.value.versionId = versionId
  openFeatureSubPage('publish', feature.featureId)
}

function mapFeatureVariantTypeToExperimentParamType(type: FeatureVersion['variantType']): AbExperimentParamType {
  if (type === 'number') return 'NUMBER'
  if (type === 'json') return 'JSON'
  if (type === 'boolean') return 'BOOLEAN'
  return 'STRING'
}

function getEvenTrafficRatios(count: number) {
  if (count <= 0) return []
  const base = Math.floor((10000 / count)) / 100
  const ratios = Array.from({ length: count }, () => base)
  ratios[count - 1] = Number((100 - ratios.slice(0, -1).reduce((sum, item) => sum + item, 0)).toFixed(2))
  return ratios
}

function applyFeatureToExperimentDraft(feature: FeatureFlag, version: FeatureVersion) {
  const paramType = mapFeatureVariantTypeToExperimentParamType(version.variantType)
  const controlVariant = version.variants[0]
  const trafficRatios = getEvenTrafficRatios(version.variants.length)
  draftExperiment.value.appId = feature.appId
  draftExperiment.value.name = `${feature.name} 关联实验`
  draftExperiment.value.description = `基于 Feature「${feature.key}」创建，验证不同变体对核心指标的影响。`
  draftExperiment.value.featureIds = [...new Set([...draftExperiment.value.featureIds, feature.featureId])]
  draftExperiment.value.paramSchemas = [
    {
      tempId: `feature_param_${feature.featureId}`,
      key: feature.key,
      name: feature.name,
      type: paramType,
      required: true,
      defaultValue: controlVariant?.value,
      description: feature.description,
    },
  ]
  draftExperiment.value.variants = version.variants.map((variant, index) => ({
    tempId: `feature_variant_${variant.variantId}`,
    name: variant.name,
    description: variant.description,
    isControl: index === 0,
    trafficRatio: trafficRatios[index] ?? 0,
    params: { [feature.key]: variant.value },
    testUserIds: [],
  }))
  draftExperiment.value.trafficConfig.variantTrafficRatios = Object.fromEntries(
    draftExperiment.value.variants.map((variant) => [variant.tempId, variant.trafficRatio]),
  )
}

function syncPublishDraftVersion(versionId: EntityId) {
  featurePublishDraft.value.versionId = versionId
  if (!featureVersionDiffBaseId.value || featureVersionDiffBaseId.value === versionId) {
    featureVersionDiffBaseId.value =
      selectedFeatureVersions.value.find((version) => version.versionId !== versionId)?.versionId ?? null
  }
}

function updateFeaturePublishType(value: string | number) {
  featurePublishDraft.value.publishType = String(value) as 'manual' | 'scheduled'
  if (featurePublishDraft.value.publishType === 'manual') {
    featurePublishDraft.value.scheduledAt = ''
    featurePublishDraft.value.scheduleSteps = []
  }
}

function updatePublishPlanConfirmationEnabled(value: boolean) {
  publishPlanConfirmationEnabled.value = value
  featurePublishDraft.value.requireConfirmation = value
}

function updatePublishPlanRollbackEnabled(value: boolean) {
  publishPlanRollbackEnabled.value = value
  if (!value) {
    featurePublishDraft.value.rollbackAt = null
  } else if (!featurePublishDraft.value.rollbackAt) {
    featurePublishDraft.value.rollbackAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }
}

function createExperimentFromFeature(feature: FeatureFlag) {
  const sourceVersion = getFeatureExperimentSourceVersion(feature)
  if (!sourceVersion) {
    message.warning('当前 Feature 暂无可带入实验的版本')
    return
  }
  const runningRelatedExperiments = feature.relatedExperimentIds
    .map((experimentId) => experiments.value.find((experiment) => experiment.id === experimentId))
    .filter((experiment): experiment is Experiment => experiment?.status === 'RUNNING')
  if (
    runningRelatedExperiments.length &&
    !window.confirm('当前 Feature 已有关联实验正在运行，继续创建可能造成策略冲突。是否继续？')
  ) {
    return
  }
  applyFeatureToExperimentDraft(feature, sourceVersion)
  message.success('已将 Feature Key、变体类型和值带入实验创建流程')
  void router.push('/ab-testing/create')
}

function copyFeatureToCreateDraft(feature: FeatureFlag) {
  const sourceVersion = getFeatureExperimentSourceVersion(feature)
  if (!sourceVersion) {
    message.warning('当前 Feature 暂无可复制的版本')
    return
  }
  featureDraft.value.appId = featureFilterAppId.value && featureFilterAppId.value !== feature.appId ? featureFilterAppId.value : ''
  featureDraft.value.key = `${feature.key}_copy`
  featureDraft.value.name = `${feature.name}_副本`
  featureDraft.value.description = feature.description
  featureDraft.value.imageUrl = feature.imageUrl ?? ''
  featureDraft.value.terminalType = feature.terminalType
  featureDraft.value.featureType = feature.featureType
  featureDraft.value.owners = [...feature.owners]
  featureDraft.value.tags = [...feature.tags]
  featureDraft.value.variantType = sourceVersion.variantType
  featureDraft.value.variants = sourceVersion.variants.map((variant) => ({ ...variant }))
  featureDraft.value.defaultVariantId = sourceVersion.defaultRule.variantId ?? sourceVersion.variants[0]?.variantId
  featureDraft.value.defaultRule = {
    ...sourceVersion.defaultRule,
    conditions: sourceVersion.defaultRule.conditions.map((condition) => ({ ...condition })),
    variantWeights: sourceVersion.defaultRule.variantWeights?.map((item) => ({ ...item })),
  }
  featureDraft.value.audienceRules = sourceVersion.audienceRules.map((rule) => ({
    ...rule,
    conditions: rule.conditions.map((condition) => ({ ...condition })),
    variantWeights: rule.variantWeights?.map((item) => ({ ...item })),
  }))
  message.success('已复制配置为新 Feature，请选择目标 App 后保存')
  openFeatureSubPage('create')
}

function openFeatureHistory(feature?: FeatureFlag) {
  if (feature) {
    selectedFeatureId.value = feature.featureId
    featureHistoryAppIdFilter.value = feature.appId
    featureHistoryKeyword.value = feature.key
  } else {
    featureHistoryAppIdFilter.value = featureFilterAppId.value
    featureHistoryKeyword.value = ''
  }
  openFeatureSubPage('history', feature?.featureId)
}

function queryFeatureHistory() {
  message.success('已按当前筛选条件刷新发布历史')
}

function resetFeatureHistoryFilters() {
  featureHistoryKeyword.value = ''
  featureHistoryAppIdFilter.value = null
  featureHistoryStatusFilter.value = 'all'
  featureHistoryActionFilter.value = 'all'
  featureHistoryTagFilter.value = []
  featureHistoryOperatorFilter.value = null
  featureHistoryStartTime.value = ''
  featureHistoryEndTime.value = ''
}

function queryFeatureLifecycle() {
  message.success('已按当前筛选条件刷新生命周期')
}

function resetFeatureLifecycleFilters() {
  featureLifecycleStartTime.value = ''
  featureLifecycleEndTime.value = ''
  featureLifecycleActionFilter.value = 'all'
  featureLifecycleOperatorFilter.value = null
}

function queryFeatureLogs() {
  message.success('已按当前筛选条件刷新操作日志')
}

function resetFeatureLogFilters() {
  featureLogKeyword.value = ''
  featureLogActionFilter.value = 'all'
  featureLogOperatorFilter.value = null
  featureLogStartTime.value = ''
  featureLogEndTime.value = ''
}

function downloadFeatureLifecycleData() {
  if (!selectedFeature.value) {
    message.warning('请先选择 Feature')
    return
  }
  const rows = featureLifecycleTrendSeries.value.flatMap((series) =>
    series.points.map((point) => ({
      featureKey: selectedFeature.value?.key ?? '',
      variant: series.name,
      date: point.date,
      requestCount: point.requestCount,
      hitUsers: point.hitUsers,
    })),
  )
  const header = ['featureKey', 'variant', 'date', 'requestCount', 'hitUsers']
  const csv = [
    header.join(','),
    ...rows.map((row) => header.map((key) => JSON.stringify(row[key as keyof typeof row] ?? '')).join(',')),
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${selectedFeature.value.key}_lifecycle_usage.csv`
  anchor.click()
  URL.revokeObjectURL(url)
  message.success('生命周期使用趋势数据已下载')
}

function resetFeatureFilters() {
  featureKeyword.value = ''
  featureFilterAppId.value = defaultFeatureFilterAppId.value
  featureFilterStatuses.value = []
  featureFilterPublishStatuses.value = []
  featureFilterTerminalTypes.value = []
  featureFilterTags.value = []
  featureFilterOwnerId.value = null
  featurePage.value = 1
  message.success('已恢复默认筛选条件')
}

function queryFeatureList() {
  featurePage.value = 1
  message.success('已按当前筛选条件刷新 Feature 列表')
}

function openCreateFeaturePage() {
  if (!canCreateFeature.value) {
    message.warning('你暂无新建 Feature 权限，请联系管理员开通协作者权限。')
    return
  }
  if (hasMultipleFeatureApps.value && !featureFilterAppId.value) {
    message.warning('请选择应用后再创建 Feature')
    return
  }
  if (featureFilterAppId.value) featureDraft.value.appId = featureFilterAppId.value
  openFeatureSubPage('create')
}

function updateFeatureDraftRuleVariant(value: EntityId) {
  ensureFeatureDraftRules()
  const rule = featureDraft.value.audienceRules?.[0]
  if (rule) rule.variantId = value
}

function updateFeatureDraftDefaultVariant(value: EntityId) {
  featureDraft.value.defaultVariantId = value
  ensureFeatureDraftRules()
  if (featureDraft.value.defaultRule) featureDraft.value.defaultRule.variantId = value
}

function ensureFeatureDraftRules() {
  const firstVariantId = featureDraft.value.variants[0]?.variantId
  const secondVariantId = featureDraft.value.variants[1]?.variantId ?? firstVariantId
  if (!featureDraft.value.defaultVariantId && firstVariantId) featureDraft.value.defaultVariantId = firstVariantId
  if (!featureDraft.value.defaultRule) {
    featureDraft.value.defaultRule = {
      ruleId: 'else',
      name: '默认规则',
      order: 999,
      conditions: [],
      deliveryType: firstVariantId ? 'single_variant' : 'no_value',
      variantId: firstVariantId,
    }
  }
  if (!featureDraft.value.audienceRules?.length) {
    featureDraft.value.audienceRules = [
      {
        ruleId: 'rule_core_user',
        name: '核心用户',
        order: 1,
        conditions: [{ fieldSource: 'user_property', fieldName: 'city', operator: 'in', value: ['北京', '上海'] }],
        deliveryType: 'single_variant',
        variantId: secondVariantId,
      },
    ]
  }
}

function addFeatureDraftVariant() {
  if (featureDraft.value.variantType === 'boolean') {
    message.warning('boolean 类型只能保留 true / false 两个变体')
    return
  }
  const index = featureDraft.value.variants.length + 1
  const variantId = `variant_${Date.now()}`
  featureDraft.value.variants.push({
    variantId,
    name: `变体 ${index}`,
    value: featureDraft.value.variantType === 'number' ? 0 : featureDraft.value.variantType === 'json' ? {} : '',
    description: '新增变体',
  })
  ensureFeatureDraftRules()
  void nextTick(() => featureDraftVariantNameRefs.value[variantId]?.focus?.())
}

function removeFeatureDraftVariant(variantId: EntityId) {
  if (featureDraft.value.variantType === 'boolean') {
    message.warning('boolean 类型变体不允许删除')
    return
  }
  if (featureDraft.value.variants.length <= 1) {
    message.warning('至少保留一个变体')
    return
  }
  const referenced = featureDraft.value.audienceRules?.some(
    (rule) => rule.variantId === variantId || rule.variantWeights?.some((item) => item.variantId === variantId),
  ) || featureDraft.value.defaultRule?.variantId === variantId
  if (referenced && !window.confirm('该变体已被发布受众规则引用，删除后相关规则将变为无效。确认删除吗？')) {
    return
  }
  featureDraft.value.variants = featureDraft.value.variants.filter((variant) => variant.variantId !== variantId)
  if (featureDraft.value.defaultVariantId === variantId) featureDraft.value.defaultVariantId = featureDraft.value.variants[0]?.variantId
  if (featureDraft.value.defaultRule?.variantId === variantId) featureDraft.value.defaultRule.variantId = featureDraft.value.defaultVariantId
  featureDraft.value.audienceRules?.forEach((rule) => {
    if (rule.variantId === variantId) rule.variantId = featureDraft.value.defaultVariantId
    if (rule.variantWeights) rule.variantWeights = rule.variantWeights.filter((item) => item.variantId !== variantId)
  })
}

function addFeatureVersionVariant() {
  if (featureVersionDraft.value.variantType === 'boolean') {
    message.warning('boolean 类型只能保留 true / false 两个变体')
    return
  }
  const index = featureVersionDraft.value.variants.length + 1
  featureVersionDraft.value.variants.push({
    variantId: `version_variant_${Date.now()}`,
    name: `候选变体 ${index}`,
    value: featureVersionDraft.value.variantType === 'number' ? 0 : featureVersionDraft.value.variantType === 'json' ? {} : '',
    description: '新增版本变体',
  })
}

function removeFeatureVersionVariant(variantId: EntityId) {
  if (featureVersionDraft.value.variantType === 'boolean') {
    message.warning('boolean 类型变体不允许删除')
    return
  }
  if (featureVersionDraft.value.variants.length <= 1) {
    message.warning('至少保留一个变体')
    return
  }
  const onlineVersion = selectedCurrentFeatureVersion.value
  if (
    onlineVersion &&
    ['gray', 'publish_confirm', 'full'].includes(onlineVersion.versionStatus) &&
    onlineVersion.variants.length <= 1 &&
    onlineVersion.variants.some((variant) => variant.variantId === variantId)
  ) {
    message.warning('线上唯一变体不可删除，请复制为新 Feature 或新增其他变体后再创建新版本')
    return
  }
  const referenced =
    featureVersionDraft.value.audienceRules.some(
      (rule) => rule.variantId === variantId || rule.variantWeights?.some((item) => item.variantId === variantId),
    ) || featureVersionDraft.value.defaultRule.variantId === variantId
  if (referenced && !window.confirm('该变体已被发布受众规则引用，删除后相关规则将切换到默认变体。确认删除吗？')) {
    return
  }
  featureVersionDraft.value.variants = featureVersionDraft.value.variants.filter((variant) => variant.variantId !== variantId)
  const fallbackVariantId = featureVersionDraft.value.variants[0]?.variantId
  if (featureVersionDraft.value.defaultRule.variantId === variantId) {
    featureVersionDraft.value.defaultRule.variantId = fallbackVariantId
  }
  featureVersionDraft.value.audienceRules.forEach((rule) => {
    if (rule.variantId === variantId) rule.variantId = fallbackVariantId
    if (rule.variantWeights) rule.variantWeights = rule.variantWeights.filter((item) => item.variantId !== variantId)
  })
}

function addFeatureVariable() {
  const index = featureVariableDrafts.value.length + 1
  featureVariableDrafts.value.push({
    id: `feature_variable_${Date.now()}`,
    name: `变量 ${index}`,
    key: `custom_field_${index}`,
    type: 'string',
    description: '自定义变量',
    required: false,
    defaultValue: '',
  })
}

function removeFeatureVariable(id: string) {
  const variable = featureVariableDrafts.value.find((item) => item.id === id)
  if (!variable) return
  const referencedRules = featureDraft.value.audienceRules?.filter((rule) =>
    rule.conditions.some((condition) => condition.fieldSource === 'custom_variable' && condition.fieldName === variable.key),
  ) ?? []
  if (referencedRules.length && !window.confirm('该变量已被受众规则引用，删除后会同步删除引用条件。确认删除吗？')) {
    return
  }
  featureVariableDrafts.value = featureVariableDrafts.value.filter((item) => item.id !== id)
  featureDraft.value.audienceRules?.forEach((rule) => {
    rule.conditions = rule.conditions.filter(
      (condition) => !(condition.fieldSource === 'custom_variable' && condition.fieldName === variable.key),
    )
    if (!rule.conditions.length) rule.name = `${rule.name.replace(/（无效）$/, '')}（无效）`
  })
}

function updateFeatureDraftRuleValue(value: string) {
  ensureFeatureDraftRules()
  const condition = featureDraft.value.audienceRules?.[0]?.conditions[0]
  if (!condition) return
  condition.value = parseFeatureAudienceValue(value, condition.operator)
}

function addFeatureAudienceRule() {
  ensureFeatureDraftRules()
  const rules = featureDraft.value.audienceRules ?? []
  const index = rules.length + 1
  rules.push({
    ruleId: `rule_${Date.now()}`,
    name: `规则 ${index}`,
    order: index,
    conditions: [],
    deliveryType: 'no_value',
  })
  featureDraft.value.audienceRules = rules
}

function removeFeatureAudienceRule(ruleId: EntityId) {
  featureDraft.value.audienceRules = (featureDraft.value.audienceRules ?? []).filter((rule) => rule.ruleId !== ruleId)
  normalizeFeatureAudienceRuleOrders()
}

function moveFeatureAudienceRule(ruleId: EntityId, direction: -1 | 1) {
  const rules = [...(featureDraft.value.audienceRules ?? [])].sort((left, right) => left.order - right.order)
  const index = rules.findIndex((rule) => rule.ruleId === ruleId)
  const nextIndex = index + direction
  if (index < 0 || nextIndex < 0 || nextIndex >= rules.length) return
  const [rule] = rules.splice(index, 1)
  if (!rule) return
  rules.splice(nextIndex, 0, rule)
  featureDraft.value.audienceRules = rules
  normalizeFeatureAudienceRuleOrders()
}

function startFeatureAudienceRuleDrag(ruleId: EntityId) {
  draggedFeatureAudienceRuleId.value = ruleId
}

function dropFeatureAudienceRule(targetRuleId: EntityId) {
  const sourceRuleId = draggedFeatureAudienceRuleId.value
  draggedFeatureAudienceRuleId.value = null
  if (!sourceRuleId || sourceRuleId === targetRuleId) return
  const rules = [...(featureDraft.value.audienceRules ?? [])].sort((left, right) => left.order - right.order)
  const sourceIndex = rules.findIndex((rule) => rule.ruleId === sourceRuleId)
  const targetIndex = rules.findIndex((rule) => rule.ruleId === targetRuleId)
  if (sourceIndex < 0 || targetIndex < 0) return
  const [sourceRule] = rules.splice(sourceIndex, 1)
  if (!sourceRule) return
  rules.splice(targetIndex, 0, sourceRule)
  featureDraft.value.audienceRules = rules
  normalizeFeatureAudienceRuleOrders()
}

function normalizeFeatureAudienceRuleOrders() {
  featureDraft.value.audienceRules?.forEach((rule, index) => {
    rule.order = index + 1
  })
}

function addFeatureAudienceCondition(rule: AudienceRule) {
  rule.conditions.push({
    fieldSource: 'user_property',
    fieldName: '',
    operator: 'eq',
    value: '',
  })
}

function removeFeatureAudienceCondition(rule: AudienceRule, conditionIndex: number) {
  rule.conditions.splice(conditionIndex, 1)
  if (!rule.conditions.length) rule.name = `${rule.name.replace(/（无效）$/, '')}（无效）`
}

function updateFeatureAudienceConditionSource(
  condition: AudienceRule['conditions'][number],
  source: AudienceRule['conditions'][number]['fieldSource'],
) {
  condition.fieldSource = source
  condition.fieldName = ''
  condition.value = ''
}

function updateFeatureAudienceConditionOperator(
  condition: AudienceRule['conditions'][number],
  operator: AudienceRule['conditions'][number]['operator'],
) {
  condition.operator = operator
  condition.value = parseFeatureAudienceValue(formatFeatureAudienceValue(condition.value), operator)
}

function updateFeatureAudienceConditionValue(condition: AudienceRule['conditions'][number], value: string) {
  condition.value = parseFeatureAudienceValue(value, condition.operator)
}

function updateFeatureAudienceRuleDelivery(rule: AudienceRule, deliveryType: AudienceRule['deliveryType']) {
  rule.deliveryType = deliveryType
  const firstVariantId = featureDraft.value.variants[0]?.variantId
  if (deliveryType === 'single_variant') {
    rule.variantId = rule.variantId ?? firstVariantId
    rule.variantWeights = undefined
  } else if (deliveryType === 'multi_variant') {
    rule.variantId = undefined
    const ratios = getEvenTrafficRatios(featureDraft.value.variants.length)
    rule.variantWeights = featureDraft.value.variants.map((variant, index) => ({
      variantId: variant.variantId,
      weight: ratios[index] ?? 0,
    }))
  } else {
    rule.variantId = undefined
    rule.variantWeights = undefined
  }
}

function updateFeatureAudienceVariantWeight(rule: AudienceRule, variantId: EntityId, weight: number | null) {
  if (!rule.variantWeights) rule.variantWeights = []
  const target = rule.variantWeights.find((item) => item.variantId === variantId)
  if (target) {
    target.weight = weight ?? 0
  } else {
    rule.variantWeights.push({ variantId, weight: weight ?? 0 })
  }
}

async function copyFeatureCreateCodeSample() {
  try {
    await navigator.clipboard.writeText(featureCreateCodeSample.value)
    message.success('示例代码已复制')
  } catch {
    message.warning('复制失败，请手动选择代码')
  }
}

async function copySelectedFeatureCodeSnippet() {
  try {
    await navigator.clipboard.writeText(selectedFeatureCodeSnippet.value)
    message.success('嵌入代码已复制')
  } catch {
    message.warning('复制失败，请手动选择代码')
  }
}

async function copySelectedFeatureVersionCodeSnippet() {
  try {
    await navigator.clipboard.writeText(selectedFeatureVersionCodeSnippet.value)
    message.success('版本代码示例已复制')
  } catch {
    message.warning('复制失败，请手动选择代码')
  }
}

function focusFeatureVersionDiff() {
  document.getElementById('feature-version-diff-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function validateFeatureDraft() {
  ensureFeatureDraftRules()
  const errors: string[] = []
  const key = featureDraft.value.key.trim()
  const name = featureDraft.value.name.trim()
  if (!featureDraft.value.appId) errors.push('请选择适用 App')
  if (!key) errors.push('请输入 Key 名称')
  if (key.length > 200) errors.push('Key 最长不超过 200 个字符')
  if (key && !/^[A-Za-z0-9_]+$/.test(key)) errors.push('Key 仅支持英文字符、数字、下划线')
  if (featureFlags.value.some((feature) => feature.key === key)) errors.push('Feature Key 必须全局唯一')
  if (!name) errors.push('请输入 Feature 名称')
  if (name.length > 100) errors.push('Feature 名称最长不超过 100 个字符')
  if (name && !/^[\u4e00-\u9fa5A-Za-z0-9_]+$/.test(name)) errors.push('Feature 名称不支持特殊符号')
  if (featureFlags.value.some((feature) => feature.name === name)) errors.push('Feature 名称必须全局唯一')
  if (featureDraft.value.description.length > 2048) errors.push('Feature 描述最长不超过 2048 个字符')
  if (featureDraft.value.tags.length > 10) errors.push('标签最多 10 个')
  if (featureDraft.value.tags.some((tag) => tag.length > 20)) errors.push('单个标签最长 20 个字符')
  if (new Set(featureDraft.value.tags.map((tag) => tag.toLowerCase())).size !== featureDraft.value.tags.length) {
    errors.push('标签已存在')
  }
  if (!featureDraft.value.owners.length) errors.push('至少配置一个 Owner')
  const variableKeys = new Set<string>()
  featureVariableDrafts.value.forEach((variable) => {
    if (!variable.name.trim()) errors.push('变量名称不能为空')
    if (!variable.key.trim()) errors.push('变量 Key 不能为空')
    if (variable.key && !/^[A-Za-z0-9_]+$/.test(variable.key)) errors.push(`变量 Key「${variable.key}」仅支持英文、数字、下划线`)
    if (variableKeys.has(variable.key)) errors.push(`变量 Key「${variable.key}」重复`)
    variableKeys.add(variable.key)
    if (variable.type === 'number' && variable.defaultValue && !Number.isFinite(Number(variable.defaultValue))) {
      errors.push(`变量「${variable.name}」默认值必须是数字`)
    }
    if (variable.type === 'boolean' && variable.defaultValue && !['true', 'false'].includes(variable.defaultValue)) {
      errors.push(`变量「${variable.name}」默认值必须是 true 或 false`)
    }
    if (variable.type === 'json' && variable.defaultValue) {
      try {
        JSON.parse(variable.defaultValue)
      } catch {
        errors.push(`变量「${variable.name}」默认值必须是合法 JSON`)
      }
    }
  })
  if (!featureDraft.value.variants.length) errors.push('至少配置一个变体')
  if (!featureDraft.value.variants.some((variant) => variant.variantId === featureDraft.value.defaultVariantId)) {
    errors.push('请选择存在于变体列表中的默认变体')
  }
  const defaultRule = featureDraft.value.defaultRule
  if (!defaultRule || defaultRule.ruleId !== 'else') errors.push('必须存在 else 默认规则')
  ;(featureDraft.value.audienceRules ?? []).forEach((rule) => {
    if (!rule.name.trim()) errors.push('受众规则名称不能为空')
    if (!rule.conditions.length) errors.push(`受众规则「${rule.name || rule.ruleId}」至少需要一个过滤条件`)
    rule.conditions.forEach((condition) => {
      if (!condition.fieldName) errors.push(`受众规则「${rule.name}」存在未选择字段的条件`)
      if (!condition.operator) errors.push(`受众规则「${rule.name}」存在未选择操作符的条件`)
      const operatorNeedsValue = !['is_null', 'is_not_null'].includes(condition.operator)
      const emptyArray = Array.isArray(condition.value) && condition.value.length === 0
      if (operatorNeedsValue && (condition.value === undefined || condition.value === '' || emptyArray)) {
        errors.push(`受众规则「${rule.name}」存在未填写值的条件`)
      }
    })
    if (rule.deliveryType === 'single_variant' && !rule.variantId) errors.push(`受众规则「${rule.name}」请选择下发变体`)
  })
  errors.push(
    ...collectFeatureVariantErrors(
      featureDraft.value.variantType,
      featureDraft.value.variants,
      featureDraft.value.audienceRules ?? [],
      featureDraft.value.defaultRule,
    ),
  )
  featureDraft.value.variants.forEach((variant) => {
    validateFeatureParameterValue(variant.value).forEach((error) => {
      errors.push(`变体「${variant.name || variant.variantId}」${error}`)
    })
  })
  featureCreateErrors.value = [...new Set(errors)]
  return featureCreateErrors.value.length === 0
}

function updateFeatureDraftVariantValue(variantId: EntityId, value: string) {
  const variant = featureDraft.value.variants.find((item) => item.variantId === variantId)
  if (!variant) return
  variant.value = parseFeatureVariantValue(value, featureDraft.value.variantType)
}

function updateFeatureVersionVariantValue(variantId: EntityId, value: string) {
  const variant = featureVersionDraft.value.variants.find((item) => item.variantId === variantId)
  if (!variant) return
  variant.value = parseFeatureVariantValue(value, featureVersionDraft.value.variantType)
}

function updateFeatureVersionRuleValue(value: string) {
  const condition = featureVersionDraft.value.audienceRules[0]?.conditions[0]
  if (!condition) return
  condition.value = value.includes(',') ? value.split(',').map((item) => item.trim()).filter(Boolean) : value
}

async function createFeatureFlag() {
  if (!validateFeatureDraft()) {
    message.warning(featureCreateErrors.value[0] ?? '请修正 Feature 配置')
    return
  }
  const result = await abStore.createFeatureFlag()
  message[result.feature ? 'success' : 'warning'](result.message)
  if (result.feature) openFeatureSubPage('detail', result.feature.featureId)
}

async function createFeatureFlagAndPublish() {
  if (!validateFeatureDraft()) {
    message.warning(featureCreateErrors.value[0] ?? '请修正 Feature 配置')
    return
  }
  const result = await abStore.createFeatureFlag()
  if (!result.feature || !result.version) {
    message.warning(result.message)
    return
  }
  selectedFeatureId.value = result.feature.featureId
  featurePublishDraft.value.versionId = result.version.versionId
  featurePublishDraft.value.publishType = 'manual'
  featurePublishDraft.value.publishTraffic = featureCreatePublishTraffic.value
  featurePublishDraft.value.description = ''
  message.success('Feature 已保存，请确认发布配置')
  openFeatureSubPage('publish', result.feature.featureId)
}

async function createFeatureVersion() {
  const result = await abStore.createFeatureVersion()
  message[result.version ? 'success' : 'warning'](result.message)
}

function cloneFeatureVersionToDraft() {
  const source = selectedFeatureVersionForAction.value
  if (!source) {
    message.warning('请先选择一个版本')
    return
  }
  featureVersionDraft.value.variantType = source.variantType
  featureVersionDraft.value.variants = source.variants.map((variant) => ({ ...variant }))
  featureVersionDraft.value.audienceRules = source.audienceRules.map((rule) => ({
    ...rule,
    conditions: rule.conditions.map((condition) => ({ ...condition })),
    variantWeights: rule.variantWeights?.map((item) => ({ ...item })),
  }))
  featureVersionDraft.value.defaultRule = {
    ...source.defaultRule,
    conditions: source.defaultRule.conditions.map((condition) => ({ ...condition })),
    variantWeights: source.defaultRule.variantWeights?.map((item) => ({ ...item })),
  }
  featureVersionDraft.value.expectedFeatureUpdatedAt = selectedFeature.value?.updatedAt
  message.success('已复制所选版本，可编辑后创建新版本')
}

async function disableSelectedFeatureVersion() {
  if (!selectedFeatureVersionForAction.value) {
    message.warning('请先选择版本')
    return
  }
  if (!window.confirm(`确认禁用 ${selectedFeatureVersionForAction.value.versionNo} 吗？禁用后不可发布、不可编辑。`)) return
  const result = await abStore.disableSelectedFeatureVersion(selectedFeatureVersionForAction.value.versionId)
  message[result.version ? 'success' : 'warning'](result.message)
}

function requestPublishSelectedFeatureVersion() {
  if (!canPublishSelectedFeatureVersion.value) {
    message.warning('当前版本状态不允许发布')
    return
  }
  if (!featurePublishDraft.value.description.trim()) {
    message.warning('请输入发布描述')
    return
  }
  featurePublishConfirmVisible.value = true
}

async function publishSelectedFeatureVersion() {
  const result = await abStore.publishSelectedFeatureVersion()
  message[result.feature ? 'success' : 'warning'](result.message)
  if (result.feature) featurePublishConfirmVisible.value = false
}

async function rollbackSelectedFeature() {
  if (!canRollbackSelectedFeature.value) {
    message.warning('仅灰度中、发布确认或已全量 Feature 可以回滚')
    return
  }
  if (!window.confirm('确认回滚当前 Feature 吗？系统将优先恢复上一个已全量版本；无历史全量版本时会关闭 Feature。')) return
  const result = await abStore.rollbackSelectedFeature()
  message[result.feature ? 'success' : 'warning'](result.message)
}

async function cancelSelectedFeaturePublish() {
  if (!canCancelSelectedPublish.value) {
    message.warning('当前版本没有可取消的发布')
    return
  }
  if (!window.confirm('确认取消当前发布吗？已生成的发布计划会标记为取消。')) return
  const result = await abStore.cancelSelectedFeaturePublish()
  message[result.feature ? 'success' : 'warning'](result.message)
}

async function createWhitelistTest() {
  syncWhitelistDefaultRuleUsers()
  if (whitelistDraft.value.versionMode === 'custom') {
    whitelistDraft.value.versionId = undefined
    whitelistDraft.value.customVariants = featureVersionDraft.value.variants.map((variant) => ({ ...variant }))
    whitelistDraft.value.customAudienceRules = featureVersionDraft.value.audienceRules.map((rule) => ({
      ...rule,
      conditions: rule.conditions.map((condition) => ({ ...condition })),
      variantWeights: rule.variantWeights?.map((item) => ({ ...item })),
    }))
  }
  const result = await abStore.createWhitelistTest()
  message[result.test ? 'success' : 'warning'](result.message)
}

async function changeFeatureLifecycle(action: 'enable' | 'disable' | 'delete', feature = selectedFeature.value) {
  if (!feature) {
    message.warning('请选择 Feature')
    return
  }
  selectedFeatureId.value = feature.featureId
  const confirmText =
    action === 'disable'
      ? '确认关闭 Feature 吗？关闭后全部流量使用本地默认值。'
      : action === 'delete'
        ? `确认删除 Feature「${feature.name}」吗？删除后不可恢复，代码中继续读取该 key 时将使用本地默认值。`
        : '确认开启 Feature 吗？'
  if (!window.confirm(confirmText)) return
  const result = await abStore.changeSelectedFeatureLifecycle(action)
  message[result.feature ? 'success' : 'warning'](result.message)
}

async function updateFeaturePermission(featureType: string | number) {
  if (!selectedFeature.value || !canOperateFeature(selectedFeature.value, 'manage_feature_permission')) {
    message.warning('当前用户暂无 Feature 权限管理能力')
    return null
  }
  const result = await abStore.updateSelectedFeaturePermission(String(featureType) as FeatureFlag['featureType'])
  message[result.feature ? 'success' : 'warning'](result.message)
  return result
}

function getFeaturePermissionSwitchConfirmText(feature: FeatureFlag, featureType: FeatureFlag['featureType']) {
  if (feature.featureType === featureType) return ''
  return featureType === 'private'
    ? '确认切换为私有 Feature 吗？切换后普通用户将不可见该 Feature，仅集团管理员、应用管理员、Feature 创建者和 Owner 可查看或协作。'
    : '确认切换为公开 Feature 吗？切换后普通用户可查看列表、详情、操作历史和发布历史，写操作仍仅协作者可用。'
}

function openFeaturePermissionModal(feature = selectedFeature.value) {
  if (!feature) {
    message.warning('请选择 Feature')
    return
  }
  selectedFeatureId.value = feature.featureId
  if (!canOperateFeature(feature, 'manage_feature_permission')) {
    message.warning('当前用户暂无 Feature 权限管理能力')
    return
  }
  featurePermissionDraftType.value = feature.featureType
  featurePermissionModalVisible.value = true
}

async function saveFeaturePermissionDraft() {
  const feature = selectedFeature.value
  if (!feature) {
    message.warning('请选择 Feature')
    return
  }
  const confirmText = getFeaturePermissionSwitchConfirmText(feature, featurePermissionDraftType.value)
  if (confirmText && !window.confirm(confirmText)) return
  const result = await updateFeaturePermission(featurePermissionDraftType.value)
  if (result?.feature) featurePermissionModalVisible.value = false
}

function generateFeaturePublishPlan() {
  const firstTime = featurePublishDraft.value.scheduledAt
    ? new Date(featurePublishDraft.value.scheduledAt)
    : new Date(Date.now() + publishPlanFrequencyHours.value * 60 * 60 * 1000)
  const targetTraffic = featurePublishDraft.value.publishTraffic
  const stepTraffic = Math.max(1, publishPlanStepTraffic.value)
  const steps = []
  let traffic = Math.min(stepTraffic, targetTraffic)
  let stepNo = 1
  while (traffic < targetTraffic) {
    steps.push({
      stepNo,
      publishTime: new Date(firstTime.getTime() + (stepNo - 1) * publishPlanFrequencyHours.value * 60 * 60 * 1000).toISOString(),
      traffic,
    })
    stepNo += 1
    traffic = Math.min(targetTraffic, traffic + stepTraffic)
  }
  steps.push({
    stepNo,
    publishTime: new Date(firstTime.getTime() + (stepNo - 1) * publishPlanFrequencyHours.value * 60 * 60 * 1000).toISOString(),
    traffic: targetTraffic,
  })
  featurePublishDraft.value.publishType = 'scheduled'
  featurePublishDraft.value.scheduledAt = steps[0]?.publishTime
  featurePublishDraft.value.scheduleSteps = steps
  if (publishPlanRollbackEnabled.value) {
    featurePublishDraft.value.rollbackAt = new Date(firstTime.getTime() + stepNo * publishPlanFrequencyHours.value * 60 * 60 * 1000).toISOString()
  }
  featurePublishDraft.value.requireConfirmation = publishPlanConfirmationEnabled.value
  message.success('已生成灰度发布计划')
}

async function refreshWhitelistTests() {
  await abStore.refreshFeatureDomain()
  message.success('白名单列表已刷新')
}

async function refreshFeatureDomain() {
  await abStore.refreshFeatureDomain()
  message.success('Feature 数据已刷新')
}

function copyWhitelistToDraft(test: WhitelistTest) {
  whitelistDraft.value.name = `${test.name} 副本`
  whitelistDraft.value.versionMode = test.versionMode ?? (test.versionId ? 'existing' : 'custom')
  whitelistDraft.value.versionId = test.versionId
  whitelistDraft.value.expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
  whitelistDraft.value.customVariants = test.customVariants?.map((variant) => ({ ...variant }))
  whitelistDraft.value.customAudienceRules = test.customAudienceRules?.map((rule) => ({
    ...rule,
    conditions: rule.conditions.map((condition) => ({ ...condition })),
    variantWeights: rule.variantWeights?.map((item) => ({ ...item })),
  }))
  whitelistDraft.value.ruleUserIds = Object.fromEntries(
    Object.entries(test.ruleUserIds).map(([ruleId, userIds]) => [ruleId, [...userIds]]),
  )
  whitelistUserIdsText.value = Object.values(test.ruleUserIds).flat().join(',')
  message.success('白名单配置已复制到表单')
}

async function copyWhitelistTest(testId: EntityId) {
  const result = await abStore.copyWhitelistTest(testId)
  message[result.test ? 'success' : 'warning'](result.message)
}

async function terminateWhitelistTest(testId: EntityId) {
  const result = await abStore.terminateWhitelistTest(testId)
  message[result.test ? 'success' : 'warning'](result.message)
}

async function deleteWhitelistTest(testId: EntityId) {
  if (!window.confirm('确认删除该白名单测试吗？')) return
  const result = await abStore.deleteWhitelistTest(testId)
  message.success(result.message)
}

function buildSolidifyFeatureKey(raw: string) {
  const seed = raw
    .trim()
    .replace(/[^A-Za-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
  return `${seed || 'experiment_feature'}_solidified`.slice(0, 200)
}

async function syncSolidifyExperiment(experimentId: EntityId) {
  featureSolidifyDraft.value.experimentId = experimentId
  await abStore.loadPlanningBundle(experimentId)
  const bundle = abStore.planningBundle
  const experiment = bundle?.experiment
  const winner = bundle?.variants.find((variant) => !variant.isControl) ?? bundle?.variants[0]
  if (winner) {
    featureSolidifyDraft.value.winnerVariantId = winner.id
    featureSolidifyDraft.value.variantRollouts = bundle?.variants.map((variant) => ({
      experimentVariantId: variant.id,
      traffic: variant.id === winner.id ? 100 : 0,
    }))
    featureSolidifyDraft.value.variantOverrides = bundle?.variants.map((variant) => ({
      experimentVariantId: variant.id,
      name: variant.name,
      description: variant.description ?? '',
    }))
  }
  if (experiment) {
    const paramKey = bundle?.paramSchemas[0]?.key ?? Object.keys(winner?.params ?? {})[0] ?? experiment.name
    featureSolidifyDraft.value.featureKey = buildSolidifyFeatureKey(paramKey)
    featureSolidifyDraft.value.featureName = `${experiment.name} 固化`
    featureSolidifyDraft.value.description = `由实验「${experiment.name}」固化生成，推荐优胜组：${winner?.name ?? '待选择'}。`
    featureSolidifyDraft.value.ownerIds = [experiment.ownerId]
    featureSolidifyDraft.value.tags = [...new Set([...experiment.tags, '实验固化'])].slice(0, 10)
    featureSolidifyDraft.value.appId = experiment.appId
    featureSolidifyDraft.value.terminalType = experiment.type === 'CLIENT_CODE' || experiment.type === 'VISUAL' ? 'client' : 'server'
    featureSolidifyDraft.value.featureType = experiment.visibility === 'PRIVATE' ? 'private' : 'public'
  }
}

function updateSolidifyVariantTraffic(experimentVariantId: EntityId, traffic: number | null) {
  const rows = featureSolidifyDraft.value.variantRollouts ?? []
  const index = rows.findIndex((item) => item.experimentVariantId === experimentVariantId)
  if (index >= 0) {
    rows[index] = { experimentVariantId, traffic: traffic ?? 0 }
  } else {
    rows.push({ experimentVariantId, traffic: traffic ?? 0 })
  }
  featureSolidifyDraft.value.variantRollouts = rows
}

function getSolidifyVariantTraffic(experimentVariantId: EntityId) {
  return featureSolidifyDraft.value.variantRollouts?.find((item) => item.experimentVariantId === experimentVariantId)?.traffic ?? 0
}

function getSolidifyVariantOverrideValue(experimentVariantId: EntityId, field: 'name' | 'description') {
  const override = featureSolidifyDraft.value.variantOverrides?.find((item) => item.experimentVariantId === experimentVariantId)
  const variant = planningBundle.value?.variants.find((item) => item.id === experimentVariantId)
  return override?.[field] ?? (field === 'name' ? variant?.name : variant?.description) ?? ''
}

function updateSolidifyVariantOverride(
  experimentVariantId: EntityId,
  field: 'name' | 'description',
  value: string,
) {
  const rows = [...(featureSolidifyDraft.value.variantOverrides ?? [])]
  const index = rows.findIndex((item) => item.experimentVariantId === experimentVariantId)
  const fallbackVariant = planningBundle.value?.variants.find((item) => item.id === experimentVariantId)
  const nextRow = {
    experimentVariantId,
    name: fallbackVariant?.name ?? '',
    description: fallbackVariant?.description ?? '',
    ...(index >= 0 ? rows[index] : {}),
    [field]: value,
  }
  if (index >= 0) rows.splice(index, 1, nextRow)
  else rows.push(nextRow)
  featureSolidifyDraft.value.variantOverrides = rows
}

function formatSolidifyVariantValue(variant: ExperimentVariant) {
  const value = getSolidifyVariantValue(variant)
  return typeof value === 'string' ? value : JSON.stringify(value)
}

function nextSolidifyStep() {
  if (solidifyStep.value === 1 && !featureSolidifyDraft.value.winnerVariantId) {
    message.warning('请选择至少一个胜出分组')
    return
  }
  if (solidifyStep.value === 1 && Math.abs(solidifyRolloutTotal.value - 100) > 0.001) {
    message.warning('多组固化比例合计必须等于 100%')
    return
  }
  if (solidifyStep.value === 2 && (!featureSolidifyDraft.value.featureKey || !featureSolidifyDraft.value.featureName)) {
    message.warning('请确认 Feature Key 和名称')
    return
  }
  if (solidifyStep.value === 2 && !/^[A-Za-z0-9_]+$/.test(featureSolidifyDraft.value.featureKey.trim())) {
    message.warning('Feature Key 仅支持英文字符、数字、下划线')
    return
  }
  if (solidifyStep.value === 2 && (!featureSolidifyDraft.value.ownerIds?.length || !featureSolidifyDraft.value.appId)) {
    message.warning('请确认 Owner 和适用 App')
    return
  }
  if (solidifyStep.value === 2 && solidifyExistingFeatureWarning.value.includes('不兼容')) {
    message.warning(solidifyExistingFeatureWarning.value)
    return
  }
  if (solidifyStep.value === 2 && solidifyExistingFeatureWarning.value.includes('其他 App')) {
    message.warning(solidifyExistingFeatureWarning.value)
    return
  }
  solidifyStep.value = Math.min(3, solidifyStep.value + 1)
}

async function solidifyExperimentToFeature() {
  const result = await abStore.solidifyExperimentToFeatureFromDraft()
  message[result.feature ? 'success' : 'warning'](result.message)
  if (result.feature && result.version) {
    featurePublishDraft.value.versionId = result.version.versionId
    openFeatureSubPage('publish', result.feature.featureId)
  }
}

async function openReportSolidify() {
  if (!selectedReportExperimentId.value) {
    message.warning('请先选择实验报告')
    return
  }
  await syncSolidifyExperiment(selectedReportExperimentId.value)
  void router.push('/ab-testing/features/solidify')
}

function applyMustSeeMetricsToDraft() {
  abStore.applyMustSeeMetricsToDraft()
  message.success('必看指标已带入实验指标快照')
}

function updateDraftVariantParam(
  variantTempId: EntityId,
  key: string,
  value: string,
  type: 'NUMBER' | 'STRING' | 'BOOLEAN' | 'JSON',
) {
  const variant = draftExperiment.value.variants.find((item) => item.tempId === variantTempId)
  if (!variant) return
  if (type === 'NUMBER') {
    variant.params[key] = Number(value)
  } else if (type === 'BOOLEAN') {
    variant.params[key] = value === 'true'
  } else if (type === 'JSON') {
    try {
      variant.params[key] = JSON.parse(value)
    } catch {
      variant.params[key] = value
    }
  } else {
    variant.params[key] = value
  }
}

async function runTrafficCalculator() {
  await abStore.runTrafficCalculator()
}

async function runFeatureDecision() {
  await abStore.runFeatureDecision()
}

async function applyHitTemplate(templateId: string | number | null) {
  if (!templateId) return
  const result = abStore.applyHitQueryTemplate(String(templateId))
  message.info(result.message)
}

async function queryHits() {
  const result = await abStore.queryExperimentHits()
  message.info(result.message)
}

function downloadHitResults() {
  const result = abStore.downloadHitQueryResults()
  message.info(result.message)
}

async function diagnoseHit() {
  const result = await abStore.diagnoseExperimentHit()
  message.info(result.message)
}

async function createDedupTask() {
  const result = await abStore.createDataDedupTask()
  message.success(result.message)
}

async function runDedupTask(taskId: EntityId) {
  const result = await abStore.runDataDedupTask(taskId)
  message.success(result.message)
}

async function downloadDedupTask(taskId: EntityId) {
  const result = await abStore.downloadDataDedupTask(taskId)
  message.info(result.message)
}

async function saveBoard() {
  const result = await abStore.saveExperimentBoard()
  message.success(result.message)
  if (result.board?.id && (boardCreateMode.value || boardRouteBoardId.value !== result.board.id)) {
    await router.replace(`/ab-testing/boards/${result.board.id}/edit`)
  }
}

async function addBoardWidget() {
  const result = await abStore.addBoardWidget()
  message.info(result.message)
}

async function removeBoardWidget(widgetId: EntityId) {
  const result = await abStore.removeBoardWidget(widgetId)
  message.info(result.message)
}

async function moveBoardWidget(widgetId: EntityId, direction: 'up' | 'down') {
  const result = await abStore.moveBoardWidget(widgetId, direction)
  message.info(result.message)
}

async function copyBoardLink() {
  const result = await abStore.copyExperimentBoardLink()
  message.success(result.message)
}

async function calculateBoardDiff() {
  const result = await abStore.calculateBoardDiff()
  message.info(result.message)
}

function resetBoardDraftForCreate() {
  boardDraft.value = {
    name: '新建实验看板',
    description: '用于实验复盘和日常监控。',
    visibility: 'PUBLIC',
    authorizedUserIds: [],
    timeConfig: {
      mode: 'relative',
      range: '7d',
      granularity: 'day',
    },
  }
}

function openBoardList() {
  void router.push('/ab-testing/boards')
}

function openBoardCreate() {
  selectedBoardId.value = ''
  resetBoardDraftForCreate()
  void router.push('/ab-testing/boards/create')
}

function openBoardEdit(boardId = selectedBoardId.value) {
  if (!boardId) {
    message.warning('请先选择看板')
    return
  }
  selectedBoardId.value = boardId
  void router.push(`/ab-testing/boards/${boardId}/edit`)
}

function openBoardView(boardId = selectedBoardId.value) {
  if (!boardId) {
    message.warning('请先选择看板')
    return
  }
  selectedBoardId.value = boardId
  void router.push(`/ab-testing/boards/${boardId}/view`)
}

function boardWidgetExperimentName(widget: ExperimentBoardWidget) {
  return boardWidgetExperiment(widget)?.name ?? widget.experimentId ?? '全部实验'
}

function boardWidgetMetricTrend(widget: ExperimentBoardWidget) {
  if (widget.metricId) return mustSeeTrends.value.find((trend) => trend.metricId === widget.metricId)
  return mustSeeTrends.value[0]
}

function boardWidgetExperiment(widget: ExperimentBoardWidget) {
  return widget.experimentId ? experiments.value.find((experiment) => experiment.id === widget.experimentId) : runningExperiments.value[0] ?? experiments.value[0]
}

function boardWidgetAlarm() {
  return activeAlarms.value[0]
}

function boardWidgetMetricValue(widget: ExperimentBoardWidget) {
  return formatMetricValue(boardWidgetMetricTrend(widget)?.currentValue ?? null)
}

function boardWidgetMetricGroup(widget: ExperimentBoardWidget) {
  return boardWidgetMetricTrend(widget)?.metricGroupName ?? '未绑定指标组'
}

function boardWidgetTrendPoints(widget: ExperimentBoardWidget) {
  return boardWidgetMetricTrend(widget)?.points ?? []
}

function boardWidgetExperimentStatusLabel(widget: ExperimentBoardWidget) {
  const experiment = boardWidgetExperiment(widget)
  return experiment ? statusLabels[experiment.status] : '未绑定'
}

function boardWidgetExperimentStatusType(widget: ExperimentBoardWidget) {
  const experiment = boardWidgetExperiment(widget)
  return experiment ? statusType(experiment.status) : 'default'
}

function boardWidgetExperimentTraffic(widget: ExperimentBoardWidget) {
  return boardWidgetExperiment(widget)?.trafficRatio ?? 0
}

function boardWidgetAlarmLevelType() {
  const alarm = boardWidgetAlarm()
  if (alarm?.level === 'critical') return 'error'
  if (alarm?.level === 'warning') return 'warning'
  return 'info'
}

function resetActionConfirmChecks() {
  actionConfirmChecks.value = {
    impact: false,
    cache: false,
    risk: false,
    restartLimit: false,
  }
}

function openHighRiskActionConfirm(experiment: Experiment, action: AbExperimentAction) {
  pendingAction.value = { experiment, action }
  resetActionConfirmChecks()
  actionConfirmVisible.value = true
}

async function executeExperimentAction(experiment: Experiment, action: AbExperimentAction) {
  const result = await abStore.transitionExperiment(experiment.id, action)
  message.info(result.message)
}

async function handleExperimentAction(experiment: Experiment, action: AbExperimentAction) {
  if (highRiskActionSet.has(action)) {
    openHighRiskActionConfirm(experiment, action)
    return
  }
  await executeExperimentAction(experiment, action)
}

async function confirmHighRiskAction() {
  if (!pendingAction.value || !canConfirmHighRiskAction.value) return
  const { experiment, action } = pendingAction.value
  actionConfirmVisible.value = false
  pendingAction.value = null
  await executeExperimentAction(experiment, action)
}

async function handleExperimentUiAction(experiment: Experiment, action: ExperimentUiAction) {
  if (action === 'view_report') {
    selectedReportExperimentId.value = experiment.id
    activeReportTab.value = 'conclusion'
    void router.push(`/ab-testing/experiments/${experiment.id}/report?tab=conclusion`)
    return
  }
  if (action === 'permission' || action === 'manage_permission') {
    await openPermissionModal(experiment)
    return
  }
  if (action === 'copy') {
    draftExperiment.value.name = `${experiment.name} 副本`
    draftExperiment.value.type = experiment.type
    draftExperiment.value.description = experiment.description
    draftExperiment.value.tags = [...experiment.tags]
    draftExperiment.value.metricIds = [...experiment.metricIds]
    abStore.persistDraft()
    message.success('已复制基础信息到创建草稿')
    void router.push('/ab-testing/create')
    return
  }
  if (action === 'edit') {
    selectedExperimentId.value = experiment.id
    await abStore.loadPlanningBundle(experiment.id)
    message.info('已载入实验配置，可在详情区做安全编辑或进入创建页复制调整')
    return
  }
  if (action === 'solidify_feature') {
    featureSolidifyDraft.value.experimentId = experiment.id
    await syncSolidifyExperiment(experiment.id)
    void router.push('/ab-testing/features/solidify')
    return
  }
  if (action === 'delete') {
    if (!window.confirm(`确认删除「${experiment.name}」？`)) return
    await executeExperimentAction(experiment, 'archive')
    return
  }
  if (action === 'diagnose') {
    selectedExperimentId.value = experiment.id
    message.info('已定位实验，可在实验工具箱继续查看命中诊断')
    void router.push('/ab-testing/tools')
    return
  }
  if (action === 'history') {
    selectedExperimentId.value = experiment.id
    message.info('操作历史已在实验详情与首页时间线中同步展示')
    return
  }
  if (action === 'parent_child' || action === 'reverse') {
    draftExperiment.value.type = action === 'parent_child' ? 'PARENT_CHILD' : 'REVERSE'
    if (action === 'parent_child') {
      draftExperiment.value.specialConfig.parentChild.parentExperimentId = experiment.id
    } else {
      draftExperiment.value.specialConfig.reverse.sourceExperimentId = experiment.id
    }
    abStore.persistDraft()
    void router.push('/ab-testing/create')
    return
  }
  await handleExperimentAction(experiment, action)
}

async function handleMoreAction(experiment: Experiment, key: string | number) {
  await handleExperimentUiAction(experiment, String(key) as ExperimentUiAction)
}

async function applyBatchTag() {
  const result = await abStore.applyBatchTagToSelected()
  message.info(result.message)
}

async function archiveSelectedExperiments() {
  if (!window.confirm('确认归档选中的实验？')) return
  const result = await abStore.archiveSelectedExperiments()
  message.info(result.message)
}

function exportSelectedExperiments() {
  const result = abStore.exportSelectedExperiments()
  message.info(result.message)
}

async function openPermissionModal(experiment: Experiment) {
  selectedExperimentId.value = experiment.id
  const grants = await abStore.loadExperimentPermissions(experiment.id)
  permissionDraft.value = {
    experimentId: experiment.id,
    visibility: experiment.visibility,
    grants: grants.length
      ? grants.map((grant) => ({ ...grant }))
      : experiment.collaboratorIds.map((userId) => {
          const member = appMemberOptions.value.find((item) => item.value === userId)
          const now = new Date().toISOString()
          return {
            id: `grant_local_${userId}`,
            experimentId: experiment.id,
            subjectType: 'USER',
            subjectId: userId,
            subjectName: member?.label.split(' · ')[0] ?? userId,
            permissionType: 'collaborate',
            remark: '',
            createdAt: now,
            updatedAt: now,
          } satisfies ExperimentPermissionGrant
        }),
  }
  permissionModalVisible.value = true
}

function addPermissionGrant() {
  const firstMember = appMemberOptions.value[0]
  const now = new Date().toISOString()
  permissionDraft.value.grants.push({
    id: `grant_draft_${Date.now()}`,
    experimentId: permissionDraft.value.experimentId,
    subjectType: 'USER',
    subjectId: String(firstMember?.value ?? ''),
    subjectName: firstMember?.label.split(' · ')[0] ?? '',
    permissionType: 'view',
    remark: '',
    createdAt: now,
    updatedAt: now,
  })
}

function removePermissionGrant(grantId: EntityId) {
  permissionDraft.value.grants = permissionDraft.value.grants.filter((grant) => grant.id !== grantId)
}

function updatePermissionSubjectType(grant: ExperimentPermissionGrant, subjectType: string) {
  grant.subjectType = subjectType as ExperimentPermissionGrant['subjectType']
  const firstOption =
    grant.subjectType === 'USER' ? permissionSubjectOptions.value.userOptions[0] : permissionSubjectOptions.value.roleOptions[0]
  grant.subjectId = String(firstOption?.value ?? '')
  grant.subjectName = firstOption?.label.split(' · ')[0] ?? ''
}

function updatePermissionSubject(grant: ExperimentPermissionGrant, subjectId: string) {
  const options =
    grant.subjectType === 'USER' ? permissionSubjectOptions.value.userOptions : permissionSubjectOptions.value.roleOptions
  const option = options.find((item) => item.value === subjectId)
  grant.subjectId = subjectId
  grant.subjectName = option?.label.split(' · ')[0] ?? subjectId
}

async function savePermissionDraft() {
  const result = await abStore.saveExperimentPermissions(permissionDraft.value.experimentId, {
    visibility: permissionDraft.value.visibility,
    grants: permissionDraft.value.grants.map((grant) => ({
      ...grant,
      permissionType: grant.permissionType as ExperimentPermissionType,
    })),
  })
  message[result.experiment ? 'success' : 'warning'](result.message)
  if (result.experiment) permissionModalVisible.value = false
}

async function saveSafeExperimentEdit() {
  const result = await abStore.saveSafeExperimentEdit()
  message.info(result.message)
}

async function scaleSelectedExperimentTraffic() {
  const result = await abStore.scaleSelectedExperimentTraffic()
  message.info(result.message)
}

async function operateSmoothTask(action: 'pause' | 'rollback' | 'skip' | 'refresh' | 'retry') {
  const result = await abStore.operateSelectedSmoothTask(action)
  message.info(result.message)
  if (action === 'refresh') smoothLogModalVisible.value = true
}

async function closeVariant(variantId: EntityId) {
  const result = await abStore.closeVariant(variantId)
  message.info(result.message)
}

async function exportReport(reportType: ReportExportTask['reportType'] = 'overview') {
  if (!reportExportPermission.value.allowed) {
    message.warning(reportExportPermission.value.reason || '暂无导出权限')
    return
  }
  const result = await abStore.exportReport(reportType)
  message.info(result.message)
}

function currentReportFilter(): Partial<ReportFilter> {
  return {
    ...reportMetricFilter.value,
    filters: reportFilterRows.value.map((filter) => ({
      fieldType: filter.fieldType,
      fieldName: filter.fieldName,
      operator: filter.operator,
      value: filter.value?.includes(',') ? filter.value.split(',').map((item) => item.trim()).filter(Boolean) : filter.value,
    })),
    cohorts: cohortFilterIds.value.map((cohortId) => ({
      cohortId,
      cohortName: reportCohortOptions.value.find((option) => option.value === cohortId)?.label ?? cohortId,
    })),
  }
}

async function refreshReport(filter?: Partial<ReportFilter>) {
  if (!selectedReportExperimentId.value) return
  reportRefreshing.value = true
  statisticCardVisible.value = false
  try {
    await abStore.loadReport(selectedReportExperimentId.value, filter)
    message.success('报告数据已刷新')
  } finally {
    reportRefreshing.value = false
  }
}

async function copyReportLink() {
  const url = new URL(window.location.href)
  if (selectedReportExperimentId.value) url.searchParams.set('experimentId', selectedReportExperimentId.value)
  url.searchParams.set('tab', activeReportTab.value)
  try {
    await navigator.clipboard.writeText(url.toString())
    message.success('已复制当前报告链接')
  } catch {
    message.warning('复制失败，请手动复制浏览器地址')
  }
}

function goToMetricDetail(metricId: EntityId) {
  selectedCoreMetricId.value = metricId
  activeReportTab.value = 'metrics'
}

function viewMetricTrend(metricId: EntityId) {
  selectedCoreMetricId.value = metricId
  activeTrendView.value = 'day'
  void nextTick(() => document.getElementById('core-trend-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

function openStatisticCard(metric: MetricStatisticResult, result: MetricVersionResult) {
  const baseline = metric.versionResults.find((item) => item.significance === 'baseline')
  statisticCardState.value = { metric, result, baseline }
  statisticCardVisible.value = true
}

function clearStatisticCard() {
  statisticCardState.value = null
}

function toggleTrendVersion(versionId: EntityId) {
  hiddenTrendVersionIds.value = hiddenTrendVersionIds.value.includes(versionId)
    ? hiddenTrendVersionIds.value.filter((item) => item !== versionId)
    : [...hiddenTrendVersionIds.value, versionId]
}

function resetTrendLegend() {
  hiddenTrendVersionIds.value = []
}

function downloadTrendChart() {
  message.success('已生成当前图表 PNG 导出任务')
}

async function downloadTrendData() {
  await exportReport('metrics')
}

function isGranularityAllowed(granularity: ReportFilter['timeGranularity']) {
  const status = selectedReportExperiment.value?.status ?? reportOverview.value?.status
  if (granularity === 'day') return true
  if (status === 'RUNNING') return true
  if (status === 'ENDED' && reportOverview.value?.endTime?.slice(0, 10) === new Date().toISOString().slice(0, 10)) return true
  return false
}

function createUiId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function addReportFilterRow() {
  reportFilterRows.value.push({
    id: createUiId('filter'),
    fieldType: 'user_property',
    fieldName: 'city',
    operator: 'in',
    value: '',
  })
}

function removeReportFilterRow(id: EntityId) {
  reportFilterRows.value = reportFilterRows.value.filter((row) => row.id !== id)
}

function clearReportAdvancedFilters() {
  reportFilterRows.value = []
  cohortFilterIds.value = []
  selectedFilterTemplateId.value = null
}

async function queryReportMetrics() {
  if (!isGranularityAllowed(reportMetricFilter.value.timeGranularity)) {
    reportMetricFilter.value.timeGranularity = 'day'
    message.warning('当前实验状态不支持该时间粒度，已为你切换为天级数据。')
  }
  await refreshReport(currentReportFilter())
  const filterCount = reportFilterRows.value.length + cohortFilterIds.value.length
  message.success(filterCount ? `已按 ${filterCount} 个 AND 条件刷新指标数据` : '已按默认条件刷新指标数据')
}

function resetReportMetricFilters() {
  reportMetricFilter.value = {
    timeGranularity: 'day',
    startTime: reportOverview.value?.startTime?.slice(0, 10) ?? '2026-05-20',
    endTime: reportOverview.value?.dataUpdatedAt?.slice(0, 10) ?? '2026-05-28',
    dataMode: 'after_experiment',
  }
  clearReportAdvancedFilters()
  message.info('已恢复默认查询条件')
}

function applyReportFilterTemplate(templateId: EntityId | null) {
  if (!templateId) return
  const template = availableFilterTemplates.value.find((item) => item.templateId === templateId)
  if (!template) return
  reportFilterRows.value = template.filters.map((filter) => ({
    ...filter,
    value: Array.isArray(filter.value) ? filter.value.join(',') : filter.value === undefined ? '' : String(filter.value),
    id: createUiId('filter'),
  }))
  selectedFilterTemplateId.value = templateId
  message.success(`已应用过滤模板：${template.templateName}`)
  void queryReportMetrics()
}

function saveCurrentFilterTemplate() {
  if (!reportFilterRows.value.length) {
    message.warning('当前至少存在一个高级筛选条件后才能保存模板')
    return
  }
  const templateName = `自定义过滤模板 ${localFilterTemplates.value.length + 1}`
  localFilterTemplates.value.push({
    templateId: createUiId('tpl'),
    templateName,
    templateDesc: '从当前数据指标筛选条件保存',
    scope: 'experiment',
    experimentId: selectedReportExperimentId.value,
    appId: selectedReportExperiment.value?.appId ?? 'app_news',
    creator: permissionContext.value.userId,
    filters: reportFilterRows.value.map((filter) => ({
      fieldType: filter.fieldType,
      fieldName: filter.fieldName,
      operator: filter.operator,
      value: filter.value?.includes(',') ? filter.value.split(',').map((item) => item.trim()).filter(Boolean) : filter.value,
    })),
    createdAt: new Date().toISOString(),
  })
  message.success('过滤模板保存成功')
}

function setMetricSort(key: MetricSortKey) {
  if (metricSortKey.value === key) {
    metricSortAsc.value = !metricSortAsc.value
  } else {
    metricSortKey.value = key
    metricSortAsc.value = key === 'version'
  }
}

function metricSortValue(result: MetricVersionResult, key: MetricSortKey) {
  if (key === 'version') return reportVersionName(result.versionId)
  return result[key] ?? Number.NEGATIVE_INFINITY
}

function setMetricGroupSort(metricId: EntityId) {
  if (metricGroupSortMetricId.value === metricId) {
    metricGroupSortAsc.value = !metricGroupSortAsc.value
  } else {
    metricGroupSortMetricId.value = metricId
    metricGroupSortAsc.value = false
  }
}

function metricDisplayRawValue(result?: MetricVersionResult) {
  if (!result) return Number.NEGATIVE_INFINITY
  if (metricDiffDisplay.value === 'value') return result.metricValue ?? Number.NEGATIVE_INFINITY
  if (metricDiffDisplay.value === 'diffAbs') return result.diffAbs ?? Number.NEGATIVE_INFINITY
  return result.diffRel ?? Number.NEGATIVE_INFINITY
}

function metricDisplayValue(result?: MetricVersionResult) {
  if (!result) return '-'
  if (metricDiffDisplay.value === 'value') return formatMetricValue(result.metricValue)
  if (metricDiffDisplay.value === 'diffAbs') return formatMetricValue(result.diffAbs)
  return formatRatio(result.diffRel)
}

function metricGroupCellClass(result?: MetricVersionResult) {
  return result?.significance ?? 'neutral'
}

function shiftDate(date: string, offsetDays: number) {
  const next = new Date(`${date}T00:00:00`)
  next.setDate(next.getDate() + offsetDays)
  return next.toISOString().slice(0, 10)
}

function isRetentionWindowAvailable(cohortDate: string, day: number) {
  const updatedAt = new Date(`${(reportOverview.value?.dataUpdatedAt ?? new Date().toISOString()).slice(0, 10)}T00:00:00`)
  const target = new Date(`${cohortDate}T00:00:00`)
  target.setDate(target.getDate() + day)
  return target <= updatedAt
}

function retentionRowKey(versionId: EntityId, cohortDate: string) {
  return `${versionId}-${cohortDate}`
}

function toggleRetentionRow(versionId: EntityId, cohortDate: string) {
  const key = retentionRowKey(versionId, cohortDate)
  expandedRetentionRows.value = expandedRetentionRows.value.includes(key)
    ? expandedRetentionRows.value.filter((item) => item !== key)
    : [...expandedRetentionRows.value, key]
}

function retentionPointWidth(value: number) {
  const max = Math.max(...retentionTrendRows.value.flatMap((row) => row.points.map((point) => point.value)), 0.01)
  return `${Math.max(4, (value / max) * 100)}%`
}

function funnelStepWidth(value: number) {
  return `${Math.max(12, (value / funnelMaxUsers.value) * 100)}%`
}

function exportFunnelData() {
  void exportReport('funnel')
}

function exportFunnelImage() {
  message.success('已生成漏斗图图片导出任务')
}

function addDifferenceGroup() {
  differenceGroups.value.push({
    id: createUiId('diff_group'),
    name: `群体 ${differenceGroups.value.length + 1}`,
    field: 'city',
    operator: 'in',
    value: '',
  })
}

function removeDifferenceGroup(groupId: EntityId) {
  if (differenceGroups.value.length <= 1) return
  differenceGroups.value = differenceGroups.value.filter((group) => group.id !== groupId)
}

function runDifferenceAnalysis() {
  if (differenceValidationMessage.value) {
    message.warning(differenceValidationMessage.value)
    return
  }
  message.success('差异分析已按当前群体配置刷新')
}

function addHeatmapRegion() {
  if (heatmapRegions.value.length >= 5) {
    message.warning('单页面最多圈选 5 个区域')
    return
  }
  const index = heatmapRegions.value.length + 1
  heatmapRegions.value.push({
    id: createUiId('region'),
    name: `圈选区域 ${index}`,
    x: 12 + index * 9,
    y: 26 + index * 8,
    width: 24,
    height: 10,
  })
}

function removeHeatmapRegion(regionId: EntityId) {
  heatmapRegions.value = heatmapRegions.value.filter((region) => region.id !== regionId)
}

function heatmapRegionMetrics(region: HeatmapRegion) {
  const baseClicks = selectedHeatmapVersion.value?.clickCount ?? 0
  const areaWeight = (region.width * region.height) / 10000
  const clicks = Math.max(120, Math.round(baseClicks * areaWeight * 2.6))
  const users = Math.round(clicks * 0.72)
  return {
    clicks,
    users,
    share: baseClicks ? clicks / baseClicks : 0,
    ctr: users ? clicks / users / 10 : 0,
  }
}

function mabBarWidth(value: number, maxValue: number) {
  return `${Math.max(4, (Math.abs(value) / Math.max(maxValue, 0.01)) * 100)}%`
}

function mabTrendValue(value: number) {
  return mabTrendMode.value === 'relative' ? formatRatio(value) : formatMetricValue(value)
}

function openSensitiveCreateModal() {
  const failed = sensitiveCreateRequirements.value.find((item) => !item.passed)
  if (failed) {
    message.warning(failed.detail)
    return
  }
  const control = reportOverview.value?.versions.find((version) => version.isControl)
  const treatment = reportOverview.value?.versions.find((version) => !version.isControl)
  sensitiveTaskDraft.value = {
    name: `${reportOverview.value?.experimentName ?? selectedReportExperiment.value?.name ?? '实验'}敏感人群洞察`,
    metricId: selectedCoreMetric.value?.metricId ?? coreMetricsForReport.value[0]?.metricId ?? null,
    treatmentVariantId: treatment?.versionId ?? sensitiveVariantOptions.value[0]?.value ?? null,
    controlVariantId: control?.versionId ?? sensitiveVariantOptions.value[1]?.value ?? null,
    direction: 'positive',
    attributeFields: ['city', 'os', 'coin_balance', 'active_days'],
    timeRange: `${reportMetricFilter.value.startTime} ~ ${reportMetricFilter.value.endTime}`,
  }
  sensitiveCreateVisible.value = true
}

function validateSensitiveDraft() {
  const draft = sensitiveTaskDraft.value
  if (!draft.name.trim()) return '请填写任务名称'
  if (!draft.metricId) return '请选择分析指标'
  if (!draft.treatmentVariantId || !draft.controlVariantId) return '请选择实验版本和对照版本'
  if (draft.treatmentVariantId === draft.controlVariantId) return '实验版本和对照版本不能相同'
  if (draft.attributeFields.length < 4) return '至少选择 4 个特征字段，避免模型解释不稳定'
  return ''
}

function createSensitiveTask() {
  const error = validateSensitiveDraft()
  if (error) {
    message.warning(error)
    return
  }
  const draft = sensitiveTaskDraft.value
  const task: SensitiveInsightTask = {
    id: createUiId('sensitive_task'),
    experimentId: selectedReportExperimentId.value ?? '',
    metricId: draft.metricId!,
    treatmentVariantId: draft.treatmentVariantId!,
    controlVariantId: draft.controlVariantId!,
    name: draft.name.trim(),
    direction: draft.direction,
    status: 'running',
    stage: 'data_preparing',
    progress: 12,
    createdAt: new Date().toISOString(),
  }
  sensitiveTasks.value = [task, ...sensitiveTasks.value]
  selectedSensitiveTaskId.value = task.id
  sensitiveTaskStatusTab.value = 'running'
  sensitiveCreateVisible.value = false
  message.success('敏感人群洞察任务已创建')
}

function refreshSensitiveTask(task: SensitiveInsightTask) {
  if (task.status !== 'running') {
    message.info('任务状态已刷新')
    return
  }
  const nextProgress = Math.min(100, task.progress + 28)
  task.progress = nextProgress
  if (nextProgress >= 80) task.stage = 'model_predicting'
  if (nextProgress >= 100) {
    task.status = 'completed'
    task.stage = 'result_output'
    task.result = {
      discovered: true,
      sensitiveUsers: Math.round((reportOverview.value?.entryUsers ?? 100000) * 0.16),
      totalUsers: reportOverview.value?.entryUsers ?? 100000,
      topFeatures: sensitiveTaskDraft.value.attributeFields.slice(0, 4).map((field) => reportFieldOptions.value.find((option) => option.value === field)?.label ?? field),
      segments: [
        { condition: '金币余额 < 300 且近 7 日活跃 >= 5', users: 28640, liftRel: 0.218, pValue: 0.011, significance: 'positive' },
        { condition: 'Android 且广告入口=金币不足弹窗', users: 18420, liftRel: 0.174, pValue: 0.024, significance: 'positive' },
      ],
    }
    sensitiveTaskStatusTab.value = 'completed'
  }
  message.success('任务状态已刷新')
}

function terminateSensitiveTask(task: SensitiveInsightTask) {
  if (task.status !== 'running') {
    message.info('仅运行中任务支持终止')
    return
  }
  task.status = 'terminated'
  task.progress = 100
  sensitiveTaskStatusTab.value = 'terminated'
  message.info('任务已终止')
}

function viewSensitiveTaskConfig(task: SensitiveInsightTask) {
  selectedSensitiveTaskId.value = task.id
  sensitiveConfigVisible.value = true
}

function openSensitiveSegment(task: SensitiveInsightTask, condition?: string) {
  selectedSensitiveTaskId.value = task.id
  selectedSensitiveSegmentCondition.value = condition ?? task.result?.segments[0]?.condition ?? null
  sensitiveSegmentVisible.value = true
}

function downloadSensitiveSegment() {
  void exportReport('sensitive')
}

function switchReportMetricDataMode(mode: ReportFilter['dataMode']) {
  if (mode === 'pre_aa' && !preAaAvailable.value) {
    message.warning('当前 PreAA 数据不足，暂不可查看')
    return
  }
  reportMetricFilter.value.dataMode = mode
  void queryReportMetrics()
}

function openGroupUserDownload() {
  if (!reportExportPermission.value.allowed) {
    message.warning(reportExportPermission.value.reason || '暂无导出权限')
    return
  }
  groupUserDownloadVisible.value = true
}

async function confirmGroupUserDownload() {
  if (!reportExportPermission.value.allowed) {
    message.warning(reportExportPermission.value.reason || '暂无导出权限')
    return
  }
  if (groupUserDownloadMode.value === 'blocked') {
    message.warning(groupUserDownloadHint.value)
    return
  }
  if (groupUserDownloadMode.value === 'async') {
    const result = await abStore.exportReport('group_users')
    message.success(result.message || '进组用户异步导出任务已创建')
  } else {
    message.success('进组用户 ID 文件已开始下载')
  }
  groupUserDownloadVisible.value = false
}

async function cancelReportExportTask(taskId: EntityId) {
  const result = await abStore.cancelReportExportTask(taskId)
  message.info(result.message)
}

async function retryReportExportTask(taskId: EntityId) {
  const result = await abStore.retryReportExportTask(taskId)
  message.info(result.message)
}

async function recoverWorkspaceState() {
  const result = await abStore.recoverWorkspaceState()
  message.success(result.message)
}

function getActionAvailability(experiment: Experiment, action: AbExperimentAction) {
  const permission = canUseAbAction(permissionContext.value, action, getExperimentPermissionLevel(experiment))
  if (!permission.allowed) {
    return { available: false, reason: permission.reason }
  }
  return getExperimentActionAvailability(experiment.status, action, {
    hasPermission: permission.allowed,
    smoothTaskRunning: planningBundle.value?.smoothTask?.status === 'RUNNING',
    uniformDiversionReady: planningBundle.value?.uniformConfig?.status !== 'FAILED',
  })
}

function statusType(status: AbExperimentStatus) {
  if (status === 'RUNNING') return 'success'
  if (['DEBUGGING', 'READY', 'PAUSED'].includes(status)) return 'warning'
  if (['STOPPED', 'ENDED', 'ARCHIVED'].includes(status)) return 'default'
  if (status === 'FROZEN') return 'error'
  return 'info'
}

function significanceType(value: string) {
  if (value === 'positive') return 'success'
  if (value === 'negative' || value === 'error') return 'error'
  if (value === 'insufficient') return 'warning'
  return 'info'
}

function significanceLabel(value?: string | null) {
  const labels: Record<string, string> = {
    baseline: '基准版本',
    positive: '正向显著',
    negative: '负向显著',
    neutral: '不显著',
    insufficient: '数据不足',
    error: '计算异常',
  }
  return value ? labels[value] ?? value : '-'
}

function reportVersionName(versionId?: EntityId | null) {
  if (!versionId) return '-'
  return (
    reportOverview.value?.versions.find((version) => version.versionId === versionId)?.versionName ??
    mabReport.value?.arms.find((arm) => arm.armId === versionId)?.name ??
    versionId
  )
}

function formatConfidenceInterval(value?: [number, number] | null) {
  if (!value) return '-'
  return `${formatRatio(value[0])} ~ ${formatRatio(value[1])}`
}

function statisticExplanation(value?: string | null) {
  if (value === 'positive') return '在当前样本量和置信水平下，实验版本相对基准版本有统计显著提升。'
  if (value === 'negative') return '在当前样本量和置信水平下，实验版本相对基准版本有统计显著下降。'
  if (value === 'insufficient') return '当前样本量或指标事件量不足，暂时无法稳定判断实验效果。'
  if (value === 'error') return '当前指标计算异常，请优先检查事件上报、版本信息和指标配置。'
  return '当前置信区间跨过 0，无法确认实验版本优于或劣于基准版本。'
}

function trendVersionColor(versionId: EntityId) {
  const index = Math.max(0, allTrendVersionIds.value.indexOf(versionId))
  return trendPalette[index % trendPalette.length]
}

function trendBarStyle(entry: { versionId: EntityId; point: { value: number } }) {
  return {
    height: `${Math.max((entry.point.value / trendMaxValue.value) * 100, 6)}%`,
    backgroundColor: trendVersionColor(entry.versionId),
  }
}

function trendRangeStyle(entry: { point: { lowerBound?: number; upperBound?: number } }) {
  const lower = entry.point.lowerBound ?? 0
  const upper = entry.point.upperBound ?? lower
  const range = Math.max(((upper - lower) / trendMaxValue.value) * 100, 8)
  return {
    height: `${range}%`,
  }
}

function exportTaskStatusType(value: string) {
  if (value === 'success') return 'success'
  if (value === 'failed') return 'error'
  if (value === 'canceled') return 'default'
  return 'warning'
}

function hitStatusType(value: string) {
  if (value === 'hit' || value === 'whitelist') return 'success'
  if (value === 'excluded') return 'warning'
  return 'default'
}

function diagnosisStatusType(value: string) {
  if (value === 'pass') return 'success'
  if (value === 'blocked') return 'error'
  return 'warning'
}

function dedupStatusType(value: string) {
  if (value === 'success') return 'success'
  if (value === 'failed') return 'error'
  if (value === 'running') return 'warning'
  return 'info'
}

function boardDiffStatusType(value: string) {
  if (value === 'up') return 'success'
  if (value === 'down') return 'error'
  return 'default'
}

function optionLabel(options: Array<{ label: string; value: string }>, value?: string | null) {
  if (!value) return '-'
  return options.find((option) => option.value === value)?.label ?? value
}

function boardWidgetTypeLabel(value: ExperimentBoardWidget['type']) {
  return optionLabel(boardWidgetTypeOptions, value)
}

function boardWidgetDataSourceLabel(value: ExperimentBoardWidget['dataSource']) {
  return optionLabel(boardDataSourceOptions, value)
}

function boardWidgetResourceLabel(widget: ExperimentBoardWidget) {
  if (widget.metricId) return metrics.value.find((metric) => metric.id === widget.metricId)?.name ?? widget.metricId
  if (widget.experimentId) return experiments.value.find((experiment) => experiment.id === widget.experimentId)?.name ?? widget.experimentId
  if (widget.type === 'experiment_health') return '全部实验'
  if (widget.type === 'alarm') return '启用报警'
  if (widget.type === 'diff') return '看板 Diff'
  return widget.text ? '自定义说明' : '未绑定数据'
}

function draftCheckType(level: string) {
  if (level === 'PASS') return 'success'
  if (level === 'ERROR') return 'error'
  return 'warning'
}

function formatPercent(value: number | null | undefined, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-'
  return `${value.toFixed(digits)}%`
}

function formatRatio(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-'
  return `${(value * 100).toFixed(digits)}%`
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-'
  return value.toLocaleString('zh-CN')
}

function formatMetricValue(value: number | null) {
  if (value === null) return '-'
  if (Math.abs(value) < 1) return formatRatio(value)
  return value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

function compactTrendBarHeight(points: Array<{ value: number }>, value: number) {
  const maxValue = Math.max(...points.map((point) => point.value).filter(Number.isFinite), 1)
  return Math.min(64, Math.max((value / maxValue) * 64, 8))
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  return value.slice(0, 16).replace('T', ' ')
}

function getHistoryFilterTime(value: string, endOfDay = false) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(trimmed) && endOfDay ? `${trimmed}T23:59:59` : trimmed
  const timestamp = new Date(normalized).getTime()
  return Number.isFinite(timestamp) ? timestamp : null
}

function formatFeatureLogAction(action: string) {
  const labels: Record<string, string> = {
    create_feature: '创建 Feature',
    create_feature_version: '创建版本',
    '发布 Feature 灰度': '发布 Feature',
    publish_plan: '发布计划',
    publish_feature: '发布 Feature',
    schedule_feature_publish: '定时发布',
    schedule_feature_publish_failed: '定时发布失败',
    cancel_feature_publish: '取消发布',
    rollback_feature: '回滚 Feature',
    rollback_feature_close: '回滚并关闭',
    disable_feature_version: '禁用版本',
    feature_enable: '开启 Feature',
    feature_disable: '关闭 Feature',
    feature_delete: '删除 Feature',
    feature_permission_update: '更新权限',
    create_whitelist_test: '创建白名单',
    terminate_whitelist_test: '终止白名单',
    copy_whitelist_test: '复制白名单',
    delete_whitelist_test: '删除白名单',
    solidify_experiment_to_feature: '实验固化',
  }
  return labels[action] ?? action
}

function formatFeatureLogObjectType(type: OperationLog['objectType']) {
  const labels: Record<OperationLog['objectType'], string> = {
    EXPERIMENT: '实验',
    METRIC_GROUP: '指标组',
    METRIC_TEMPLATE: '指标模板',
    FEATURE: 'Feature',
    FEATURE_VERSION: 'Feature 版本',
    ALARM_TASK: '报警任务',
    BOARD: '实验看板',
    AD_ACCOUNT: '广告账户',
    ASSET: '素材',
  }
  return labels[type] ?? type
}

function getFeatureFromLog(log: OperationLog) {
  if (log.objectType === 'FEATURE') {
    return featureFlags.value.find((feature) => feature.featureId === log.objectId)
  }
  if (log.objectType === 'FEATURE_VERSION') {
    const version = featureVersions.value.find((item) => item.versionId === log.objectId)
    return featureFlags.value.find((feature) => feature.featureId === version?.featureId)
  }
  const featurePayload = log.after?.feature
  if (featurePayload && typeof featurePayload === 'object' && 'featureId' in featurePayload) {
    const featureId = String((featurePayload as Pick<FeatureFlag, 'featureId'>).featureId)
    return featureFlags.value.find((feature) => feature.featureId === featureId)
  }
  return undefined
}

function asObjectRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? value as Record<string, unknown> : undefined
}

function getPayloadString(payload: Record<string, unknown> | undefined, key: string) {
  const value = payload?.[key]
  return typeof value === 'string' ? value : ''
}

function getPayloadNumber(payload: Record<string, unknown> | undefined, key: string) {
  const value = payload?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function getFeaturePlanFromLog(log: OperationLog): PublishPlan | undefined {
  const afterPlan = asObjectRecord(log.after?.plan)
  const beforePlan = asObjectRecord(log.before?.plan)
  const planPayload = afterPlan ?? beforePlan
  if (planPayload && 'publishId' in planPayload && 'versionId' in planPayload) {
    return planPayload as unknown as PublishPlan
  }
  return publishPlans.value.find((plan) => plan.versionId === log.objectId)
}

function getFeatureVersionFromLog(log: OperationLog) {
  const plan = getFeaturePlanFromLog(log)
  const payloadVersionId =
    getPayloadString(log.after, 'versionId') ||
    getPayloadString(log.before, 'versionId') ||
    getPayloadString(log.after, 'currentVersionId') ||
    getPayloadString(log.before, 'currentVersionId') ||
    plan?.versionId ||
    (log.objectType === 'FEATURE_VERSION' ? log.objectId : '')
  return featureVersions.value.find((version) => version.versionId === payloadVersionId)
}

function formatFeatureVersionRef(versionId?: EntityId) {
  if (!versionId) return '-'
  const version = featureVersions.value.find((item) => item.versionId === versionId)
  return version ? `${version.versionNo} · ${featurePublishStatusLabels[version.versionStatus]}` : versionId
}

function getFeatureHistoryVersionNo(log: OperationLog) {
  return getFeatureVersionFromLog(log)?.versionNo ?? formatFeatureVersionRef(getFeaturePlanFromLog(log)?.versionId)
}

function getFeatureHistoryPublishType(log: OperationLog) {
  const plan = getFeaturePlanFromLog(log)
  if (
    plan?.publishType === 'scheduled' ||
    log.action === 'schedule_feature_publish' ||
    log.action === 'schedule_feature_publish_failed'
  ) return '定时自动发布'
  if (plan?.publishType === 'manual' || log.action === 'publish_feature' || log.action === '发布 Feature 灰度') return '手动发布'
  return '-'
}

function getFeatureHistoryTraffic(log: OperationLog) {
  const afterTraffic = getPayloadNumber(log.after, 'publishTraffic')
  if (afterTraffic !== null) return formatPercent(afterTraffic)
  const beforeTraffic = getPayloadNumber(log.before, 'publishTraffic')
  if (beforeTraffic !== null && ['cancel_feature_publish', 'rollback_feature', 'rollback_feature_close'].includes(log.action)) return formatPercent(0)
  const plan = getFeaturePlanFromLog(log)
  const lastStepTraffic = plan?.steps.at(-1)?.traffic
  return typeof lastStepTraffic === 'number' ? formatPercent(lastStepTraffic) : '-'
}

function getFeatureHistoryDescription(log: OperationLog) {
  const plan = getFeaturePlanFromLog(log)
  const afterDescription = getPayloadString(log.after, 'description')
  const beforeDescription = getPayloadString(log.before, 'description')
  return plan?.description || afterDescription || beforeDescription || formatFeatureLogAction(log.action)
}

function getFeatureLogObjectLabel(log: OperationLog) {
  const feature = getFeatureFromLog(log)
  if (log.objectType === 'FEATURE') return feature?.name ?? log.objectId
  if (log.objectType === 'FEATURE_VERSION') return getFeatureHistoryVersionNo(log)
  return log.objectId
}

function getFeatureLogResultLabel(log: OperationLog) {
  const status = formatFeatureLogStatus(log)
  if (status !== '-') return status
  if (log.action.includes('delete')) return '已删除'
  if (log.action.includes('copy')) return '已复制'
  if (log.action.includes('create')) return '已创建'
  if (log.action.includes('update')) return '已更新'
  return '已记录'
}

function getFeatureHistoryBeforeVersion(log: OperationLog) {
  const versionId =
    getPayloadString(log.before, 'currentVersionId') ||
    getPayloadString(log.before, 'versionId') ||
    (log.objectType === 'FEATURE_VERSION' ? log.objectId : '')
  return formatFeatureVersionRef(versionId)
}

function getFeatureHistoryAfterVersion(log: OperationLog) {
  const plan = getFeaturePlanFromLog(log)
  const versionId =
    getPayloadString(log.after, 'currentVersionId') ||
    getPayloadString(log.after, 'versionId') ||
    plan?.versionId ||
    (log.objectType === 'FEATURE_VERSION' ? log.objectId : '')
  return formatFeatureVersionRef(versionId)
}

function getFeatureHistoryAudience(log: OperationLog, side: 'before' | 'after') {
  const payload = side === 'before' ? log.before : log.after
  const versionId =
    getPayloadString(payload, 'currentVersionId') ||
    getPayloadString(payload, 'versionId') ||
    getFeaturePlanFromLog(log)?.versionId ||
    (log.objectType === 'FEATURE_VERSION' ? log.objectId : '')
  const version = featureVersions.value.find((item) => item.versionId === versionId)
  if (!version) return '-'
  const activeRules = version.audienceRules.filter((rule) => rule.deliveryType !== 'no_value')
  return `${activeRules.length} 条 if 规则；else ${version.defaultRule.deliveryType === 'no_value' ? '不下发参数值' : '下发参数值'}`
}

function getFeatureHistoryBeforeTraffic(log: OperationLog) {
  const traffic = getPayloadNumber(log.before, 'publishTraffic')
  return traffic === null ? '-' : formatPercent(traffic)
}

function getFeatureHistoryAfterTraffic(log: OperationLog) {
  const traffic = getPayloadNumber(log.after, 'publishTraffic')
  if (traffic !== null) return formatPercent(traffic)
  if (['cancel_feature_publish', 'rollback_feature', 'rollback_feature_close', 'feature_disable'].includes(log.action)) return formatPercent(0)
  return getFeatureHistoryTraffic(log)
}

function formatFeatureHistoryValue(value: unknown) {
  if (value === undefined || value === null || value === '') return '-'
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? String(value)
    : JSON.stringify(value)
}

function getFeatureHistoryDiffRows(log: OperationLog) {
  const before = log.before ?? {}
  const after = log.after ?? {}
  const labels: Record<string, string> = {
    status: 'Feature 开关状态',
    publishStatus: '发布状态',
    versionStatus: '版本状态',
    currentVersionId: '当前版本',
    versionId: '版本',
    publishTraffic: '发布流量',
    featureType: 'Feature 类型',
    plan: '发布计划',
  }
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].map((key) => ({
    key,
    field: labels[key] ?? key,
    before: formatFeatureHistoryValue(before[key]),
    after: formatFeatureHistoryValue(after[key]),
  }))
}

function getFeatureLogStatus(log: OperationLog) {
  const status =
    log.after?.versionStatus ??
    log.after?.publishStatus ??
    log.after?.status ??
    log.before?.versionStatus ??
    log.before?.publishStatus ??
    log.before?.status
  return typeof status === 'string' ? status : ''
}

function formatFeatureLogStatus(log: OperationLog) {
  const status = getFeatureLogStatus(log)
  if (status === 'failed') return '失败'
  return (featurePublishStatusLabels[status as FeaturePublishStatus] ?? featureStatusLabels[status as FeatureStatus] ?? status) || '-'
}

function featureLogSearchText(log: OperationLog, feature?: FeatureFlag) {
  return [
    formatFeatureLogAction(log.action),
    log.action,
    log.objectId,
    log.operatorName,
    feature?.name,
    feature?.key,
    JSON.stringify(log.before ?? {}),
    JSON.stringify(log.after ?? {}),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function formatFeatureLogPayload(payload?: Record<string, unknown>) {
  return JSON.stringify(payload ?? {}, null, 2)
}

function openFeatureLogDetail(log: OperationLog) {
  selectedFeatureLogId.value = log.id
  featureLogDetailVisible.value = true
}

function formatFeatureHistoryDetailForCopy(log: OperationLog) {
  const feature = getFeatureFromLog(log)
  return JSON.stringify(
    {
      feature: feature ? { name: feature.name, key: feature.key, appId: feature.appId } : null,
      action: formatFeatureLogAction(log.action),
      beforeVersion: getFeatureHistoryBeforeVersion(log),
      afterVersion: getFeatureHistoryAfterVersion(log),
      beforeTraffic: getFeatureHistoryBeforeTraffic(log),
      afterTraffic: getFeatureHistoryAfterTraffic(log),
      operator: log.operatorName,
      time: formatDateTime(log.createdAt),
      description: getFeatureHistoryDescription(log),
      diff: getFeatureHistoryDiffRows(log),
    },
    null,
    2,
  )
}

async function copySelectedFeatureLogDetail() {
  if (!selectedFeatureLog.value) return
  await navigator.clipboard.writeText(formatFeatureHistoryDetailForCopy(selectedFeatureLog.value))
  message.success('发布历史详情已复制')
}

function jumpToFeatureFromLog(log = selectedFeatureLog.value) {
  if (!log) return
  const feature = getFeatureFromLog(log)
  if (!feature) {
    message.warning('未找到关联 Feature')
    return
  }
  selectedFeatureId.value = feature.featureId
  featureLogDetailVisible.value = false
  openFeatureSubPage('detail', feature.featureId)
}

function getMetricName(metricId: EntityId) {
  return metrics.value.find((metric) => metric.id === metricId)?.name ?? metricId
}

function getExperimentName(experimentId: EntityId) {
  return experiments.value.find((experiment) => experiment.id === experimentId)?.name ?? experimentId
}

function isReportTab(value: unknown): value is ReportPrimaryTab {
  return ['conclusion', 'metrics', 'advanced', 'heatmap', 'mab', 'sensitive'].includes(String(value))
}

function syncReportRouteState() {
  const experimentId = String(route.params.experimentId ?? route.query.experimentId ?? '')
  if (experimentId && experimentId !== selectedReportExperimentId.value) {
    selectedReportExperimentId.value = experimentId
  }
  const tab = route.query.tab
  if (isReportTab(tab)) {
    pendingReportTab.value = tab
    if (reportPrimaryTabs.value.some((item) => item.name === tab)) {
      activeReportTab.value = tab
      pendingReportTab.value = null
    }
  }
}

watch(
  [activePage, boardPageMode, boardRouteBoardId, experimentBoards],
  ([page, mode, boardId, boards]) => {
    if (page !== 'boards') return

    if (mode === 'list') return

    if (mode === 'edit' && !boardId) {
      if (selectedBoardId.value) selectedBoardId.value = ''
      resetBoardDraftForCreate()
      return
    }

    if (boardId && boards.some((board) => board.id === boardId)) {
      if (selectedBoardId.value !== boardId) selectedBoardId.value = boardId
      return
    }

    if (boardId && boards.length) {
      const fallbackBoardId = boards[0]?.id
      if (fallbackBoardId) void router.replace(`/ab-testing/boards/${fallbackBoardId}/${mode}`)
      return
    }

    if (mode === 'view') {
      const fallbackBoardId = selectedBoardId.value || boards[0]?.id
      if (fallbackBoardId) void router.replace(`/ab-testing/boards/${fallbackBoardId}/view`)
    }
  },
  { immediate: true },
)

watch(selectedExperimentId, (experimentId) => {
  if (experimentId) void abStore.loadPlanningBundle(experimentId)
})

watch(selectedReportExperimentId, (experimentId) => {
  statisticCardVisible.value = false
  hiddenTrendVersionIds.value = []
  if (experimentId) void abStore.loadReport(experimentId)
})

watch(activeReportTab, () => {
  statisticCardVisible.value = false
})

watch(selectedCoreMetricId, () => {
  statisticCardVisible.value = false
})

watch(coreMetricsForReport, (items) => {
  if (!items.length) {
    selectedCoreMetricId.value = null
    return
  }
  if (!selectedCoreMetricId.value || !items.some((metric) => metric.metricId === selectedCoreMetricId.value)) {
    selectedCoreMetricId.value = items[0]?.metricId ?? null
  }
}, { immediate: true })

watch(metricResults, (items) => {
  if (!differenceMetricId.value && items[0]) {
    differenceMetricId.value = items[0].metricId
  }
}, { immediate: true })

watch(differenceVersionOptions, (items) => {
  if (!differenceVersionIds.value.length && items[0]) {
    differenceVersionIds.value = items.slice(0, 2).map((item) => String(item.value))
  }
}, { immediate: true })

watch(funnelVersionOptions, (items) => {
  if (!selectedFunnelCompareVersionId.value && funnelReport.value?.compareVersionId) {
    selectedFunnelCompareVersionId.value = funnelReport.value.compareVersionId
  } else if (!selectedFunnelCompareVersionId.value && items[0]) {
    selectedFunnelCompareVersionId.value = String(items[0].value)
  }
  if (selectedFunnelBaselineVersionId.value === 'var_feed_control' && funnelReport.value?.baselineVersionId) {
    selectedFunnelBaselineVersionId.value = funnelReport.value.baselineVersionId
  }
}, { immediate: true })

watch(heatmapVersionOptions, (items) => {
  if (!selectedHeatmapVersionId.value && items[0]) {
    selectedHeatmapVersionId.value = String(items[0].value)
  }
}, { immediate: true })

watch(reportPrimaryTabs, (tabs) => {
  if (pendingReportTab.value && tabs.some((tab) => tab.name === pendingReportTab.value)) {
    activeReportTab.value = pendingReportTab.value
    pendingReportTab.value = null
    return
  }
  if (!tabs.some((tab) => tab.name === activeReportTab.value)) {
    activeReportTab.value = 'conclusion'
  }
}, { immediate: true })

watch(
  () => [route.params.experimentId, route.query.experimentId, route.query.tab],
  () => syncReportRouteState(),
)

watch(
  () => route.params.featureId,
  (featureId) => {
    if (typeof featureId === 'string' && featureId) {
      selectedFeatureId.value = featureId
    }
  },
  { immediate: true },
)

watch(
  [whitelistRuleOptions, () => whitelistDraft.value.versionMode, () => whitelistDraft.value.versionId],
  () => syncWhitelistDefaultRuleUsers(),
  { immediate: true },
)

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (activePage.value === 'create' && draftDirty.value) {
    event.preventDefault()
    event.returnValue = ''
  }
}

onBeforeRouteLeave((_to, _from, next) => {
  if (activePage.value !== 'create' || !draftDirty.value || window.confirm('当前实验草稿有未保存修改，确认离开？')) {
    next()
  } else {
    next(false)
  }
})

onMounted(async () => {
  window.addEventListener('beforeunload', handleBeforeUnload)
  await loadWorkspace()
  syncReportRouteState()
  abStore.startAsyncTaskPolling()
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
  abStore.stopAsyncTaskPolling()
})
</script>

<template>
  <div class="page-container ab-workbench">
    <div class="ab-page-heading">
      <div>
        <h1 class="page-title">{{ currentHeader.title }}</h1>
        <p class="page-description">{{ currentHeader.description }}</p>
      </div>
      <n-space v-if="activePage !== 'metrics'">
        <n-button secondary @click="loadWorkspace">
          <template #icon>
            <n-icon><RefreshOutline /></n-icon>
          </template>
          刷新
        </n-button>
        <n-button type="primary">
          <template #icon>
            <n-icon><DownloadOutline /></n-icon>
          </template>
          导出
        </n-button>
      </n-space>
    </div>

    <n-spin :show="loading">
      <section v-if="activePage === 'overview'" class="ab-section-stack">
        <n-grid :cols="4" :x-gap="16" :y-gap="16" responsive="screen">
          <n-gi>
            <div class="ab-stat-card stat-blue">
              <span>实验总数</span>
              <strong>{{ summary?.totalExperiments ?? 0 }}</strong>
              <small>运行中 {{ summary?.runningExperiments ?? 0 }} 个</small>
            </div>
          </n-gi>
          <n-gi>
            <div class="ab-stat-card stat-green">
              <span>Feature Flags</span>
              <strong>{{ summary?.featureFlags ?? 0 }}</strong>
              <small>启用 {{ enabledFeatures.length }} 个</small>
            </div>
          </n-gi>
          <n-gi>
            <div class="ab-stat-card stat-amber">
              <span>指标组</span>
              <strong>{{ summary?.activeMetricGroups ?? 0 }}</strong>
              <small>必看指标 {{ mustSeeTrends.length }} 个</small>
            </div>
          </n-gi>
          <n-gi>
            <div class="ab-stat-card stat-purple">
              <span>报警任务</span>
              <strong>{{ summary?.enabledAlarms ?? 0 }}</strong>
              <small>接收组 {{ receiverGroups.length }} 个</small>
            </div>
          </n-gi>
        </n-grid>

        <n-grid :cols="1" :x-gap="16" :y-gap="16" responsive="screen">
          <n-gi>
            <n-card title="运行与调试" :bordered="false">
              <div class="experiment-stack">
                <div v-for="experiment in runningExperiments" :key="experiment.id" class="experiment-row">
                  <div>
                    <strong>{{ experiment.name }}</strong>
                    <span>{{ typeLabels[experiment.type] }} · {{ experiment.owner.name }}</span>
                  </div>
                  <n-tag :type="statusType(experiment.status)" size="small">
                    {{ statusLabels[experiment.status] }}
                  </n-tag>
                </div>
              </div>
            </n-card>
          </n-gi>
        </n-grid>

        <n-card title="最近操作日志" :bordered="false">
          <n-timeline>
            <n-timeline-item
              v-for="log in operationLogs.slice(0, 6)"
              :key="log.id"
              :title="`${log.operatorName} · ${log.action}`"
              :content="`${log.objectType} / ${log.objectId}`"
              :time="formatDateTime(log.createdAt)"
            />
          </n-timeline>
        </n-card>
      </section>

      <section v-else-if="activePage === 'experiments'" class="ab-section-stack">
        <n-card :bordered="false">
          <div class="experiment-filter-bar">
            <n-space>
              <n-input v-model:value="experimentKeyword" clearable placeholder="搜索实验、ID、负责人" style="width: 240px" />
              <n-select
                v-model:value="selectedStatuses"
                multiple
                clearable
                :options="statusOptions"
                placeholder="状态"
                style="width: 220px"
              />
              <n-select
                v-model:value="selectedExperimentType"
                clearable
                :options="typeOptions"
                placeholder="实验类型"
                style="width: 220px"
              />
              <n-select
                v-model:value="selectedExperimentTags"
                multiple
                clearable
                :options="experimentTagOptions"
                placeholder="实验标签"
                style="width: 220px"
              />
              <n-select
                v-model:value="selectedExperimentOwnerId"
                clearable
                filterable
                :options="experimentOwnerOptions"
                placeholder="负责人"
                style="width: 220px"
              />
              <n-select
                v-model:value="selectedExperimentVisibility"
                :options="visibilityOptions"
                placeholder="是否私有"
                style="width: 160px"
              />
            </n-space>
            <n-space>
              <n-input v-model:value="experimentCreatedRange.start" placeholder="创建开始 YYYY-MM-DD" style="width: 170px" />
              <n-input v-model:value="experimentCreatedRange.end" placeholder="创建结束 YYYY-MM-DD" style="width: 170px" />
              <n-input v-model:value="experimentRunningRange.start" placeholder="运行开始 YYYY-MM-DD" style="width: 170px" />
              <n-input v-model:value="experimentRunningRange.end" placeholder="运行结束 YYYY-MM-DD" style="width: 170px" />
            </n-space>
          </div>
          <n-divider />
          <n-space align="center" justify="space-between">
            <n-space>
              <n-button secondary @click="abStore.resetExperimentFilters">重置</n-button>
              <n-button secondary @click="loadWorkspace">刷新</n-button>
            </n-space>
            <n-space>
              <n-button secondary @click="openTemplateCreateModal">模板创建实验</n-button>
              <n-button type="primary" @click="openCreateWizard">
                <template #icon>
                  <n-icon><AddCircleOutline /></n-icon>
                </template>
                新建实验
              </n-button>
            </n-space>
          </n-space>
        </n-card>

        <n-card v-if="selectedExperimentIds.length" :bordered="false">
          <n-space align="center" justify="space-between">
            <n-space align="center">
              <n-tag type="info">已选 {{ selectedExperimentIds.length }} 个实验</n-tag>
              <n-input v-model:value="batchTagText" placeholder="批量添加标签" style="width: 180px" />
              <n-button secondary @click="applyBatchTag">批量打标</n-button>
              <n-button secondary @click="exportSelectedExperiments">批量导出</n-button>
              <n-button secondary type="warning" @click="archiveSelectedExperiments">批量归档</n-button>
            </n-space>
          </n-space>
        </n-card>

        <n-grid :cols="3" :x-gap="16" :y-gap="16" responsive="screen">
          <n-gi :span="2">
            <n-card title="实验列表" :bordered="false">
              <n-table :bordered="false" :single-line="false" size="small">
                <thead>
                  <tr>
                    <th>
                      <n-checkbox
                        :checked="allPagedExperimentsSelected"
                        @update:checked="(checked) => abStore.togglePagedExperimentSelection(Boolean(checked))"
                      />
                    </th>
                    <th>实验</th>
                    <th>实验 ID</th>
                    <th>类型</th>
                    <th>流量</th>
                    <th>状态</th>
                    <th>可见性</th>
                    <th>运行时间</th>
                    <th>标签</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="experiment in pagedExperiments" :key="experiment.id">
                    <td>
                      <n-checkbox
                        :checked="selectedExperimentIds.includes(experiment.id)"
                        @update:checked="(checked) => abStore.toggleExperimentSelection(experiment.id, Boolean(checked))"
                      />
                    </td>
                    <td>
                      <button class="link-button" @click="selectedExperimentId = experiment.id">
                        {{ experiment.name }}
                      </button>
                      <span class="cell-subtitle">{{ experiment.owner.name }} · 创建 {{ formatDateTime(experiment.createdAt) }}</span>
                    </td>
                    <td>{{ experiment.id }}</td>
                    <td>{{ typeLabels[experiment.type] }}</td>
                    <td>
                      <n-progress type="line" :percentage="experiment.trafficRatio" :height="8" :show-indicator="false" />
                      <span class="cell-subtitle">{{ formatPercent(experiment.trafficRatio) }}</span>
                    </td>
                    <td>
                      <n-tag :type="statusType(experiment.status)" size="small">
                        {{ statusLabels[experiment.status] }}
                      </n-tag>
                    </td>
                    <td>
                      <n-tag :type="experiment.visibility === 'PUBLIC' ? 'success' : 'warning'" size="small">
                        {{ experiment.visibility === 'PUBLIC' ? '公共' : '私有' }}
                      </n-tag>
                    </td>
                    <td>
                      <span>{{ experiment.startedAt ? formatDateTime(experiment.startedAt) : '-' }}</span>
                      <span class="cell-subtitle">{{ experiment.endedAt ? formatDateTime(experiment.endedAt) : `${experiment.durationDays} 天` }}</span>
                    </td>
                    <td>
                      <n-space size="small">
                        <n-tag v-for="tag in experiment.tags.slice(0, 3)" :key="tag" size="small">{{ tag }}</n-tag>
                        <span v-if="experiment.tags.length > 3" class="cell-subtitle">+{{ experiment.tags.length - 3 }}</span>
                      </n-space>
                    </td>
                    <td>
                      <n-space size="small">
                        <n-tooltip v-for="action in rowActionMatrix[experiment.status].primary" :key="action">
                          <template #trigger>
                            <n-button
                              size="small"
                              secondary
                              :disabled="rowActionDisabled(experiment, action)"
                              @click="handleExperimentUiAction(experiment, action)"
                            >
                              {{ actionLabels[action] }}
                            </n-button>
                          </template>
                          {{ isTransitionAction(action) ? getActionAvailability(experiment, action).reason ?? actionLabels[action] : actionLabels[action] }}
                        </n-tooltip>
                        <n-dropdown
                          trigger="click"
                          :options="getMoreActionOptions(experiment)"
                          @select="(key) => handleMoreAction(experiment, key)"
                        >
                          <n-button size="small" secondary>
                            <template #icon>
                              <n-icon><EllipsisHorizontalOutline /></n-icon>
                            </template>
                          </n-button>
                        </n-dropdown>
                      </n-space>
                    </td>
                  </tr>
                </tbody>
              </n-table>
              <n-space justify="space-between" align="center" class="table-footer">
                <span class="cell-subtitle">共 {{ filteredExperimentTotal }} 个实验</span>
                <n-pagination
                  v-model:page="experimentPage"
                  v-model:page-size="experimentPageSize"
                  :item-count="filteredExperimentTotal"
                  :page-sizes="[5, 10, 20]"
                  show-size-picker
                />
              </n-space>
            </n-card>
          </n-gi>

          <n-gi>
            <n-card title="实验详情" :bordered="false">
              <template v-if="selectedExperiment">
                <n-descriptions :column="1" label-placement="left" size="small">
                  <n-descriptions-item label="实验 ID">{{ selectedExperiment.id }}</n-descriptions-item>
                  <n-descriptions-item label="目标">{{ selectedExperiment.goal }}</n-descriptions-item>
                  <n-descriptions-item label="风险">{{ selectedExperiment.riskNote ?? '无' }}</n-descriptions-item>
                  <n-descriptions-item label="指标">
                    <n-space size="small">
                      <n-tag v-for="metricId in selectedExperiment.metricIds" :key="metricId" size="small">
                        {{ getMetricName(metricId) }}
                      </n-tag>
                    </n-space>
                  </n-descriptions-item>
                </n-descriptions>
                <n-divider />
                <n-space size="small">
                  <n-button
                    size="small"
                    secondary
                    :disabled="!getActionAvailability(selectedExperiment, 'freeze').available"
                    @click="handleExperimentAction(selectedExperiment, 'freeze')"
                  >
                    冻结
                  </n-button>
                  <n-button
                    size="small"
                    secondary
                    :disabled="!getActionAvailability(selectedExperiment, 'resume').available"
                    @click="handleExperimentAction(selectedExperiment, 'resume')"
                  >
                    恢复
                  </n-button>
                  <n-button
                    size="small"
                    secondary
                    :disabled="!getActionAvailability(selectedExperiment, 'restart').available"
                    @click="handleExperimentAction(selectedExperiment, 'restart')"
                  >
                    重启
                  </n-button>
                  <n-button
                    size="small"
                    secondary
                    :disabled="rowActionDisabled(selectedExperiment, 'solidify_feature')"
                    @click="handleExperimentUiAction(selectedExperiment, 'solidify_feature')"
                  >
                    固化至 Feature
                  </n-button>
                </n-space>
                <n-divider />
                <div class="mini-section">
                  <strong>运行中安全编辑</strong>
                  <n-input v-model:value="safeEditDraft.name" placeholder="实验名称" />
                  <n-input v-model:value="safeEditDraft.riskNote" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" />
                  <n-input v-model:value="safeEditDraft.tagsText" placeholder="标签，逗号分隔" />
                  <n-button secondary block @click="saveSafeExperimentEdit">保存安全编辑</n-button>
                </div>
                <n-divider />
                <div class="mini-section">
                  <strong>扩缩量</strong>
                  <n-input-number
                    v-model:value="scaleTrafficDraft.targetTrafficRatio"
                    :min="1"
                    :max="100"
                    style="width: 100%"
                  />
                  <n-input-number
                    v-model:value="scaleTrafficDraft.smoothDurationMinutes"
                    :min="10"
                    :max="1440"
                    style="width: 100%"
                  />
                  <n-button secondary block @click="scaleSelectedExperimentTraffic">创建扩缩量任务</n-button>
                </div>
                <n-divider />
                <div class="mini-section">
                  <strong>版本参数</strong>
                  <div v-for="variant in planningBundle?.variants" :key="variant.id" class="variant-line">
                    <span>{{ variant.name }}</span>
                    <n-space size="small">
                      <n-tag size="small" :type="variant.status === 'ACTIVE' ? 'success' : 'default'">
                        {{ variant.status }}
                      </n-tag>
                      <n-tag size="small">{{ formatPercent(variant.trafficRatio) }}</n-tag>
                      <n-button
                        size="tiny"
                        secondary
                        :disabled="variant.isControl || variant.status !== 'ACTIVE'"
                        :title="
                          variant.isControl
                            ? '对照组不可关闭'
                            : variant.status !== 'ACTIVE'
                              ? '仅运行中的实验组可关闭'
                              : '关闭该实验组'
                        "
                        @click="closeVariant(variant.id)"
                      >
                        关闭组
                      </n-button>
                    </n-space>
                  </div>
                </div>
                <div class="mini-section">
                  <strong>分流配置</strong>
                  <p>
                    {{ planningBundle?.diversionConfig?.decisionIdType ?? '-' }} /
                    {{ planningBundle?.diversionConfig?.exposureMode ?? '-' }}
                  </p>
                </div>
                <div class="mini-section">
                  <strong>平滑生效</strong>
                  <template v-if="planningBundle?.smoothTask">
                    <n-space align="center">
                      <n-tag :type="smoothTaskStatusType" size="small">{{ planningBundle.smoothTask.status }}</n-tag>
                      <span>
                        {{ formatPercent(planningBundle.smoothTask.currentTrafficRatio) }} /
                        {{ formatPercent(planningBundle.smoothTask.targetTrafficRatio) }}
                      </span>
                    </n-space>
                    <n-progress type="line" :percentage="smoothTaskProgress" :height="10" />
                    <small>
                      {{ planningBundle.smoothTask.action }} · {{ planningBundle.smoothTask.durationMinutes }} 分钟 ·
                      预计 {{ formatDateTime(planningBundle.smoothTask.expectedFinishedAt) }}
                    </small>
                    <n-space size="small">
                      <n-button
                        size="tiny"
                        secondary
                        :loading="smoothTaskOperating"
                        :disabled="planningBundle.smoothTask.status !== 'RUNNING'"
                        @click="operateSmoothTask('pause')"
                      >
                        暂停
                      </n-button>
                      <n-button size="tiny" secondary :loading="smoothTaskOperating" @click="operateSmoothTask('rollback')">
                        回滚
                      </n-button>
                      <n-button size="tiny" secondary :loading="smoothTaskOperating" @click="operateSmoothTask('skip')">
                        跳过
                      </n-button>
                      <n-button size="tiny" secondary :loading="smoothTaskOperating" @click="operateSmoothTask('refresh')">
                        刷新
                      </n-button>
                      <n-button
                        size="tiny"
                        secondary
                        :loading="smoothTaskOperating"
                        :disabled="!['FAILED', 'PAUSED', 'ROLLED_BACK'].includes(planningBundle.smoothTask.status)"
                        @click="operateSmoothTask('retry')"
                      >
                        重试
                      </n-button>
                      <n-button size="tiny" secondary @click="smoothLogModalVisible = true">日志</n-button>
                    </n-space>
                  </template>
                  <p v-else>未启用</p>
                </div>
              </template>
              <n-empty v-else description="暂无实验" />
            </n-card>
          </n-gi>
        </n-grid>
      </section>

      <section v-else-if="activePage === 'create'" class="ab-section-stack">
        <n-card class="ab-create-steps" :bordered="false">
          <n-steps :current="currentCreateStep">
            <n-step
              v-for="(step, index) in createSteps"
              :key="step"
              :title="step"
              :status="abStore.canOpenCreateStep(index + 1) ? undefined : 'wait'"
              @click="goToCreateStep(index + 1)"
            />
          </n-steps>
        </n-card>

        <n-grid :cols="3" :x-gap="16" :y-gap="16" responsive="screen">
          <n-gi :span="2">
            <n-card :title="currentCreateStepTitle" :bordered="false">
              <template v-if="currentCreateStep === 1">
                <div class="type-grid">
                  <button
                    v-for="item in experimentTypes"
                    :key="item.value"
                    class="type-card"
                    :class="{ selected: draftExperiment.type === item.value, disabled: !item.available }"
                    :disabled="abStore.isDraftFieldLocked('type')"
                    @click="chooseExperimentType(item)"
                  >
                    <div class="type-card-title">
                      <strong>{{ item.label }}</strong>
                      <n-tag :type="item.available ? 'success' : 'warning'" size="small">
                        {{ item.available ? '可用' : '不可用' }}
                      </n-tag>
                    </div>
                    <small>{{ item.value }}</small>
                    <span>{{ item.description }}</span>
                    <em v-if="!item.available">{{ item.reason }}</em>
                  </button>
                </div>
              </template>

              <template v-else-if="currentCreateStep === 2">
                <n-grid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
                  <n-gi>
                    <label class="field-label">实验名称</label>
                    <n-input v-model:value="draftExperiment.name" placeholder="输入实验名称" />
                  </n-gi>
                  <n-gi>
                    <label class="field-label">实验负责人</label>
                    <n-select
                      v-model:value="draftExperiment.ownerId"
                      filterable
                      :options="appMemberOptions"
                    />
                  </n-gi>
                  <n-gi :span="2">
                    <label class="field-label">实验描述</label>
                    <n-input
                      v-model:value="draftExperiment.description"
                      type="textarea"
                      :maxlength="1000"
                      show-count
                      :autosize="{ minRows: 2, maxRows: 4 }"
                    />
                  </n-gi>
                  <n-gi>
                    <label class="field-label">协作者</label>
                    <n-select
                      v-model:value="draftExperiment.collaboratorIds"
                      multiple
                      clearable
                      filterable
                      :options="appMemberOptions"
                    />
                  </n-gi>
                  <n-gi>
                    <label class="field-label">所属业务线</label>
                    <n-select
                      v-model:value="draftExperiment.businessLineId"
                      clearable
                      :options="businessLineOptions"
                    />
                  </n-gi>
                  <n-gi>
                    <label class="field-label">可见范围</label>
                    <n-select
                      v-model:value="draftExperiment.visibility"
                      :options="[
                        { label: '公开', value: 'PUBLIC' },
                        { label: '私有', value: 'PRIVATE' },
                      ]"
                    />
                  </n-gi>
                  <n-gi>
                    <label class="field-label">实验标签</label>
                    <n-select
                      :value="draftExperiment.tags"
                      multiple
                      tag
                      filterable
                      clearable
                      :max-tag-count="4"
                      :options="experimentTagOptions"
                      placeholder="选择或输入标签，最多 20 个"
                      @update:value="updateDraftTags"
                    />
                    <small class="cell-subtitle">{{ draftExperiment.tags.length }} / 20</small>
                  </n-gi>
                  <n-gi>
                    <label class="field-label">实验时长</label>
                    <n-input-number v-model:value="draftExperiment.durationDays" :min="1" :max="90" style="width: 100%" />
                    <small v-if="draftDurationWarning" class="cell-subtitle warning-text">{{ draftDurationWarning }}</small>
                  </n-gi>
                  <n-gi>
                    <label class="field-label">实验流量</label>
                    <n-input-number
                      v-model:value="draftExperiment.trafficConfig.experimentTrafficRatio"
                      :min="0.01"
                      :max="100"
                      :step="0.01"
                      style="width: 100%"
                    />
                  </n-gi>
                  <n-gi :span="2">
                    <label class="field-label">实验目标</label>
                    <n-input
                      v-model:value="draftExperiment.goal"
                      type="textarea"
                      placeholder="说明策略变化、影响用户/场景、目标指标和预期提升"
                      :autosize="{ minRows: 3, maxRows: 5 }"
                    />
                  </n-gi>
                  <n-gi :span="2">
                    <label class="field-label">风险说明</label>
                    <n-input v-model:value="draftExperiment.riskNote" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" />
                  </n-gi>
                </n-grid>
              </template>

              <template v-else-if="currentCreateStep === 3">
                <div class="wizard-stack">
                  <div class="wizard-card">
                    <div class="wizard-card-head">
                      <div>
                        <strong>测试白名单命中规则</strong>
                        <span>配置测试用户是否仍需满足受众规则，避免调试命中口径和正式分流不一致。</span>
                      </div>
                    </div>
                    <n-select
                      v-model:value="draftExperiment.testUserAudienceRequirement"
                      :options="testUserAudienceRequirementOptions"
                    />
                  </div>
                  <div class="wizard-toolbar">
                    <n-space>
                      <n-button secondary @click="abStore.addDraftVariant">新增实验组</n-button>
                      <n-button secondary @click="abStore.rebalanceDraftVariantTraffic">平均分配流量</n-button>
                      <n-button secondary @click="abStore.addDraftParamSchema">新增参数</n-button>
                      <n-button type="primary" secondary @click="openParamPreview()">预览参数</n-button>
                    </n-space>
                  </div>
                  <div v-for="variant in draftExperiment.variants" :key="variant.tempId" class="wizard-card">
                    <div class="wizard-card-head">
                      <div>
                        <strong>{{ variant.name }}</strong>
                        <span>{{ variant.isControl ? '对照组' : '实验组' }}</span>
                      </div>
                      <n-space size="small">
                        <n-input-number v-model:value="variant.trafficRatio" :min="1" :max="99" style="width: 120px" />
                        <n-button size="small" secondary :disabled="variant.isControl" @click="setDraftControlVariant(variant)">
                          设为对照
                        </n-button>
                        <n-button size="small" secondary @click="copyDraftVariant(variant)">复制</n-button>
                        <n-button size="small" secondary :disabled="variant.isControl" @click="removeDraftVariant(variant)">删除</n-button>
                        <n-button size="small" secondary @click="openParamPreview(variant.tempId)">预览</n-button>
                      </n-space>
                    </div>
                    <n-grid :cols="2" :x-gap="12" :y-gap="12" responsive="screen">
                      <n-gi>
                        <label class="field-label">版本名称</label>
                        <n-input v-model:value="variant.name" />
                      </n-gi>
                      <n-gi>
                        <label class="field-label">版本描述</label>
                        <n-input v-model:value="variant.description" />
                      </n-gi>
                      <n-gi>
                        <label class="field-label">测试用户</label>
                        <n-input :value="variant.testUserIds.join(',')" @update:value="(value) => (variant.testUserIds = value.split(',').map((item) => item.trim()).filter(Boolean))" />
                      </n-gi>
                      <n-gi v-for="schema in draftExperiment.paramSchemas" :key="`${variant.tempId}-${schema.tempId}`">
                        <div class="param-field-head">
                          <label class="field-label">{{ schema.name }} / {{ schema.key }}</label>
                          <n-space size="small">
                            <n-button size="tiny" secondary @click="abStore.restoreDraftParamDefault(variant.tempId, schema.key)">默认</n-button>
                            <n-button size="tiny" secondary @click="abStore.clearDraftParamValue(variant.tempId, schema.key)">清空</n-button>
                            <n-button v-if="schema.type === 'JSON'" size="tiny" secondary @click="formatJsonParam(variant, schema.key)">
                              校验/格式化
                            </n-button>
                          </n-space>
                        </div>
                        <n-select
                          v-if="schema.type === 'BOOLEAN'"
                          :value="String(variant.params[schema.key])"
                          :options="[
                            { label: 'true', value: 'true' },
                            { label: 'false', value: 'false' },
                          ]"
                          @update:value="(value) => updateDraftVariantParam(variant.tempId, schema.key, String(value), schema.type)"
                        />
                        <n-input
                          v-else
                          :type="schema.type === 'JSON' ? 'textarea' : 'text'"
                          :autosize="schema.type === 'JSON' ? { minRows: 2, maxRows: 6 } : undefined"
                          :value="formatParamValue(variant.params[schema.key])"
                          @update:value="(value) => updateDraftVariantParam(variant.tempId, schema.key, value, schema.type)"
                        />
                      </n-gi>
                    </n-grid>
                  </div>
                  <n-divider />
                  <div class="wizard-card">
                    <div class="wizard-card-head">
                      <div>
                        <strong>参数模板</strong>
                        <span>定义功能控制项，所有版本会同步生成参数值输入框。</span>
                      </div>
                      <n-button secondary @click="abStore.addDraftParamSchema">新增参数</n-button>
                    </div>
                    <div class="param-schema-list">
                      <div v-for="schema in draftExperiment.paramSchemas" :key="schema.tempId" class="param-schema-row">
                        <n-grid :cols="6" :x-gap="10" :y-gap="10" responsive="screen">
                          <n-gi>
                            <label class="field-label">参数 Key</label>
                            <n-input :value="schema.key" @update:value="(value) => updateDraftParamKey(schema, value)" />
                          </n-gi>
                          <n-gi>
                            <label class="field-label">参数名称</label>
                            <n-input v-model:value="schema.name" />
                          </n-gi>
                          <n-gi>
                            <label class="field-label">参数类型</label>
                            <n-select
                              :value="schema.type"
                              :options="paramTypeOptions"
                              @update:value="(value) => updateDraftParamType(schema, String(value))"
                            />
                          </n-gi>
                          <n-gi>
                            <label class="field-label">默认值</label>
                            <n-input
                              :value="formatParamValue(schema.defaultValue)"
                              @update:value="(value) => updateDraftParamDefault(schema, value)"
                            />
                          </n-gi>
                          <n-gi>
                            <label class="field-label">是否必填</label>
                            <n-checkbox v-model:checked="schema.required">必填</n-checkbox>
                          </n-gi>
                          <n-gi>
                            <label class="field-label">操作</label>
                            <n-space size="small">
                              <n-button size="tiny" secondary @click="copyDraftParam(schema)">复制</n-button>
                              <n-button size="tiny" secondary @click="copyControlParamToTreatments(schema.key)">从对照组复制</n-button>
                              <n-button size="tiny" secondary @click="removeDraftParam(schema)">删除</n-button>
                            </n-space>
                          </n-gi>
                          <n-gi :span="6">
                            <label class="field-label">参数说明</label>
                            <n-input v-model:value="schema.description" />
                          </n-gi>
                        </n-grid>
                      </div>
                    </div>
                  </div>
                  <div
                    v-if="!['CLIENT_CODE', 'SERVER_CODE'].includes(draftExperiment.type)"
                    class="wizard-card"
                    :class="{ 'locked-panel': abStore.isDraftFieldLocked('specialConfig') }"
                  >
                    <div class="wizard-card-head">
                      <div>
                        <strong>{{ typeLabels[draftExperiment.type] }}专属配置</strong>
                        <span>按实验类型补齐 PRD 要求的专属字段。</span>
                      </div>
                      <n-space>
                        <n-tag v-if="abStore.isDraftFieldLocked('specialConfig')" type="warning" size="small">模板固化</n-tag>
                        <n-tag size="small">{{ draftExperiment.type }}</n-tag>
                      </n-space>
                    </div>

                    <n-grid
                      v-if="draftExperiment.type === 'SPLIT_URL'"
                      :cols="2"
                      :x-gap="12"
                      :y-gap="12"
                      responsive="screen"
                    >
                      <n-gi>
                        <label class="field-label">匹配模式</label>
                        <n-select
                          v-model:value="draftExperiment.specialConfig.splitUrl.matchMode"
                          :options="splitUrlMatchModeOptions"
                        />
                      </n-gi>
                      <n-gi>
                        <label class="field-label">Fallback URL</label>
                        <n-input v-model:value="draftExperiment.specialConfig.splitUrl.fallbackUrl" />
                      </n-gi>
                      <n-gi>
                        <label class="field-label">透传 Query</label>
                        <n-checkbox v-model:checked="draftExperiment.specialConfig.splitUrl.preserveQueryString">
                          保留原始查询参数
                        </n-checkbox>
                      </n-gi>
                      <n-gi v-for="variant in draftExperiment.variants" :key="`split-${variant.tempId}`">
                        <label class="field-label">{{ variant.name }} URL</label>
                        <n-input v-model:value="draftExperiment.specialConfig.splitUrl.urls[variant.tempId]" />
                        <div v-if="draftExperiment.specialConfig.splitUrl.rules[variant.tempId]" class="split-rule-row">
                          <n-select
                            v-model:value="draftExperiment.specialConfig.splitUrl.rules[variant.tempId]!.matchType"
                            :options="splitUrlRuleTypeOptions"
                          />
                          <n-input
                            v-model:value="draftExperiment.specialConfig.splitUrl.rules[variant.tempId]!.pattern"
                            placeholder="匹配路径、完整 URL 或正则"
                          />
                          <n-checkbox v-model:checked="draftExperiment.specialConfig.splitUrl.rules[variant.tempId]!.caseSensitive">
                            区分大小写
                          </n-checkbox>
                        </div>
                      </n-gi>
                    </n-grid>

                    <div v-else-if="draftExperiment.type === 'PUSH'" class="wizard-stack">
                      <n-grid :cols="2" :x-gap="12" :y-gap="12" responsive="screen">
                        <n-gi>
                          <label class="field-label">推送通道</label>
                          <n-input v-model:value="draftExperiment.specialConfig.push.channel" />
                        </n-gi>
                        <n-gi>
                          <label class="field-label">触达范围</label>
                          <n-select
                            v-model:value="draftExperiment.specialConfig.push.touchRange"
                            :options="segmentSelectOptions"
                          />
                        </n-gi>
                        <n-gi>
                          <label class="field-label">发送模式</label>
                          <n-select
                            v-model:value="draftExperiment.specialConfig.push.sendMode"
                            :options="pushSendModeOptions"
                          />
                        </n-gi>
                        <n-gi>
                          <label class="field-label">单用户频控</label>
                          <n-input-number
                            v-model:value="draftExperiment.specialConfig.push.frequencyCapPerUser"
                            :min="1"
                            :max="10"
                            style="width: 100%"
                          />
                        </n-gi>
                        <n-gi>
                          <label class="field-label">免打扰时段</label>
                          <n-space align="center">
                            <n-checkbox v-model:checked="draftExperiment.specialConfig.push.quietHours.enabled">启用</n-checkbox>
                            <n-input v-model:value="draftExperiment.specialConfig.push.quietHours.start" style="width: 88px" />
                            <n-input v-model:value="draftExperiment.specialConfig.push.quietHours.end" style="width: 88px" />
                          </n-space>
                        </n-gi>
                        <n-gi>
                          <label class="field-label">审核状态</label>
                          <n-select
                            v-model:value="draftExperiment.specialConfig.push.approvalStatus"
                            :options="pushApprovalStatusOptions"
                          />
                        </n-gi>
                        <n-gi>
                          <label class="field-label">发送演练</label>
                          <n-checkbox v-model:checked="draftExperiment.specialConfig.push.rehearsalChecked">
                            已完成测试设备演练
                          </n-checkbox>
                        </n-gi>
                        <n-gi>
                          <label class="field-label">
                            {{ draftExperiment.specialConfig.push.sendMode === 'TRIGGER' ? '触发条件' : '发送时间' }}
                          </label>
                          <n-input
                            v-if="draftExperiment.specialConfig.push.sendMode === 'TRIGGER'"
                            v-model:value="draftExperiment.specialConfig.push.triggerCondition"
                          />
                          <n-input v-else v-model:value="draftExperiment.specialConfig.push.sendTime" />
                        </n-gi>
                      </n-grid>
                      <div v-for="variant in draftExperiment.variants" :key="`push-${variant.tempId}`" class="param-schema-row">
                        <n-grid :cols="3" :x-gap="10" :y-gap="10" responsive="screen">
                          <n-gi>
                            <label class="field-label">{{ variant.name }}标题</label>
                            <n-input v-model:value="draftExperiment.specialConfig.push.titles[variant.tempId]" />
                          </n-gi>
                          <n-gi>
                            <label class="field-label">正文</label>
                            <n-input v-model:value="draftExperiment.specialConfig.push.contents[variant.tempId]" />
                          </n-gi>
                          <n-gi>
                            <label class="field-label">跳转地址</label>
                            <n-input v-model:value="draftExperiment.specialConfig.push.actionUrls[variant.tempId]" />
                          </n-gi>
                        </n-grid>
                      </div>
                    </div>

                    <div v-else-if="draftExperiment.type === 'MVT'" class="wizard-stack">
                      <n-grid :cols="3" :x-gap="12" :y-gap="12" responsive="screen">
                        <n-gi>
                          <label class="field-label">组合生成</label>
                          <n-checkbox v-model:checked="draftExperiment.specialConfig.mvt.autoGenerateCombinations">
                            自动生成组合版本
                          </n-checkbox>
                        </n-gi>
                        <n-gi>
                          <label class="field-label">流量分配</label>
                          <n-select
                            v-model:value="draftExperiment.specialConfig.mvt.trafficAllocationMode"
                            :options="mvtAllocationModeOptions"
                          />
                        </n-gi>
                        <n-gi>
                          <label class="field-label">主实验元素</label>
                          <n-select
                            v-model:value="draftExperiment.specialConfig.mvt.primaryElementId"
                            :options="mvtElementOptions"
                          />
                        </n-gi>
                      </n-grid>
                      <div class="wizard-toolbar">
                        <span class="cell-subtitle">当前组合数：{{ mvtCombinationCount }}</span>
                        <n-button secondary @click="abStore.addMvtElement">新增实验元素</n-button>
                      </div>
                      <div v-for="element in draftExperiment.specialConfig.mvt.elements" :key="element.id" class="param-schema-row">
                        <div class="wizard-card-head">
                          <n-input v-model:value="element.name" placeholder="元素名称" />
                          <n-space size="small">
                            <n-button size="tiny" secondary @click="abStore.addMvtElementVariant(element.id)">新增变体</n-button>
                            <n-button size="tiny" secondary @click="abStore.removeMvtElement(element.id)">删除元素</n-button>
                          </n-space>
                        </div>
                        <div class="mvt-variant-grid">
                          <div v-for="(_item, index) in element.variants" :key="`${element.id}-${index}`" class="compact-row">
                            <span>变体 {{ index + 1 }}</span>
                            <n-space size="small" align="center">
                              <n-input v-model:value="element.variants[index]" size="small" />
                              <n-button
                                size="tiny"
                                secondary
                                :disabled="element.variants.length <= 1"
                                @click="abStore.removeMvtElementVariant(element.id, index)"
                              >
                                删除
                              </n-button>
                            </n-space>
                          </div>
                        </div>
                      </div>
                    </div>

                    <n-grid
                      v-else-if="draftExperiment.type === 'MAB'"
                      :cols="3"
                      :x-gap="12"
                      :y-gap="12"
                      responsive="screen"
                    >
                      <n-gi>
                        <label class="field-label">算法</label>
                        <n-select
                          v-model:value="draftExperiment.specialConfig.mab.algorithm"
                          :options="mabAlgorithmOptions"
                        />
                      </n-gi>
                      <n-gi>
                        <label class="field-label">优化指标</label>
                        <n-select
                          v-model:value="draftExperiment.specialConfig.mab.optimizationMetricId"
                          :options="metrics.map((metric) => ({ label: metric.name, value: metric.id }))"
                        />
                      </n-gi>
                      <n-gi>
                        <label class="field-label">初始探索流量</label>
                        <n-input-number
                          v-model:value="draftExperiment.specialConfig.mab.explorationTrafficRatio"
                          :min="1"
                          :max="80"
                          style="width: 100%"
                        />
                      </n-gi>
                      <n-gi>
                        <label class="field-label">奖励窗口（小时）</label>
                        <n-input-number
                          v-model:value="draftExperiment.specialConfig.mab.rewardWindowHours"
                          :min="1"
                          :max="168"
                          style="width: 100%"
                        />
                      </n-gi>
                      <n-gi>
                        <label class="field-label">单臂最小样本</label>
                        <n-input-number
                          v-model:value="draftExperiment.specialConfig.mab.minSamplePerArm"
                          :min="100"
                          :max="1000000"
                          style="width: 100%"
                        />
                      </n-gi>
                      <n-gi>
                        <label class="field-label">护栏指标</label>
                        <n-select
                          v-model:value="draftExperiment.specialConfig.mab.guardrailMetricIds"
                          multiple
                          :options="metrics.map((metric) => ({ label: metric.name, value: metric.id }))"
                        />
                      </n-gi>
                      <n-gi>
                        <label class="field-label">自动停止</label>
                        <n-checkbox v-model:checked="draftExperiment.specialConfig.mab.autoStopEnabled">
                          达到置信门槛后停止探索
                        </n-checkbox>
                      </n-gi>
                    </n-grid>

                    <div
                      v-else-if="['PERSONALIZATION_WEB', 'PERSONALIZATION_CODE'].includes(draftExperiment.type)"
                      class="wizard-stack"
                    >
                      <n-grid :cols="3" :x-gap="12" :y-gap="12" responsive="screen">
                        <n-gi>
                          <label class="field-label">冲突处理</label>
                          <n-select
                            v-model:value="draftExperiment.specialConfig.personalization.conflictStrategy"
                            :options="personalizationConflictOptions"
                          />
                        </n-gi>
                        <n-gi>
                          <label class="field-label">默认版本</label>
                          <n-select
                            v-model:value="draftExperiment.specialConfig.personalization.defaultVariantTempId"
                            :options="variantTempOptions"
                          />
                        </n-gi>
                        <n-gi>
                          <label class="field-label">兜底内容</label>
                          <n-input v-model:value="draftExperiment.specialConfig.personalization.fallbackContent" />
                        </n-gi>
                      </n-grid>
                      <div class="wizard-toolbar">
                        <span class="cell-subtitle">多命中时按优先级从小到大生效。</span>
                        <n-button secondary @click="abStore.addPersonalizationAudience">新增人群</n-button>
                      </div>
                      <div
                        v-for="audience in draftExperiment.specialConfig.personalization.audiences"
                        :key="audience.id"
                        class="param-schema-row"
                      >
                        <n-grid :cols="5" :x-gap="10" :y-gap="10" responsive="screen">
                          <n-gi>
                            <label class="field-label">人群名称</label>
                            <n-input v-model:value="audience.name" />
                          </n-gi>
                          <n-gi>
                            <label class="field-label">命中版本</label>
                            <n-select v-model:value="audience.variantTempId" :options="variantTempOptions" />
                          </n-gi>
                          <n-gi>
                            <label class="field-label">优先级</label>
                            <n-input-number v-model:value="audience.priority" :min="1" :max="99" style="width: 100%" />
                          </n-gi>
                          <n-gi>
                            <label class="field-label">保留组比例</label>
                            <n-input-number v-model:value="audience.holdoutRatio" :min="0" :max="50" style="width: 100%" />
                          </n-gi>
                          <n-gi>
                            <label class="field-label">操作</label>
                            <n-button size="small" secondary @click="abStore.removePersonalizationAudience(audience.id)">
                              删除
                            </n-button>
                          </n-gi>
                          <n-gi :span="5">
                            <label class="field-label">人群规则</label>
                            <n-input v-model:value="audience.rule" />
                          </n-gi>
                        </n-grid>
                      </div>
                    </div>

                    <n-grid
                      v-else-if="draftExperiment.type === 'PARENT_CHILD'"
                      :cols="2"
                      :x-gap="12"
                      :y-gap="12"
                      responsive="screen"
                    >
                      <n-gi>
                        <label class="field-label">父实验</label>
                        <n-select
                          v-model:value="draftExperiment.specialConfig.parentChild.parentExperimentId"
                          :options="parentExperimentOptions"
                        />
                      </n-gi>
                      <n-gi>
                        <label class="field-label">父版本</label>
                        <n-select
                          v-model:value="draftExperiment.specialConfig.parentChild.parentVariantId"
                          :options="parentVariantOptions"
                        />
                      </n-gi>
                      <n-gi>
                        <label class="field-label">子实验占父版本流量</label>
                        <n-input-number
                          v-model:value="draftExperiment.specialConfig.parentChild.childTrafficRatio"
                          :min="1"
                          :max="100"
                          style="width: 100%"
                        />
                      </n-gi>
                      <n-gi>
                        <label class="field-label">继承受众</label>
                        <n-checkbox v-model:checked="draftExperiment.specialConfig.parentChild.inheritAudience">
                          沿用父实验受众规则
                        </n-checkbox>
                      </n-gi>
                      <n-gi>
                        <label class="field-label">流量继承</label>
                        <n-select
                          v-model:value="draftExperiment.specialConfig.parentChild.trafficInheritanceMode"
                          :options="parentTrafficModeOptions"
                        />
                      </n-gi>
                      <n-gi>
                        <label class="field-label">父实验停止策略</label>
                        <n-select
                          v-model:value="draftExperiment.specialConfig.parentChild.stopPolicy"
                          :options="[
                            { label: '暂停子实验', value: 'PAUSE' },
                            { label: '停止子实验', value: 'STOP' },
                          ]"
                        />
                      </n-gi>
                    </n-grid>

                    <n-grid
                      v-else-if="draftExperiment.type === 'REVERSE'"
                      :cols="2"
                      :x-gap="12"
                      :y-gap="12"
                      responsive="screen"
                    >
                      <n-gi>
                        <label class="field-label">来源实验</label>
                        <n-select
                          v-model:value="draftExperiment.specialConfig.reverse.sourceExperimentId"
                          :options="endedExperimentOptions"
                        />
                      </n-gi>
                      <n-gi>
                        <label class="field-label">原对照组</label>
                        <n-select
                          v-model:value="draftExperiment.specialConfig.reverse.sourceControlVariantId"
                          :options="reverseControlVariantOptions"
                        />
                      </n-gi>
                      <n-gi>
                        <label class="field-label">建议反转流量</label>
                        <n-input-number
                          v-model:value="draftExperiment.specialConfig.reverse.suggestedTrafficRatio"
                          :min="1"
                          :max="30"
                          style="width: 100%"
                        />
                      </n-gi>
                      <n-gi>
                        <label class="field-label">保留人群来源</label>
                        <n-select
                          v-model:value="draftExperiment.specialConfig.reverse.holdoutSource"
                          :options="reverseHoldoutSourceOptions"
                        />
                      </n-gi>
                      <n-gi>
                        <label class="field-label">观察天数</label>
                        <n-input-number
                          v-model:value="draftExperiment.specialConfig.reverse.observationDays"
                          :min="1"
                          :max="60"
                          style="width: 100%"
                        />
                      </n-gi>
                      <n-gi>
                        <label class="field-label">回滚策略</label>
                        <n-select
                          v-model:value="draftExperiment.specialConfig.reverse.rollbackPolicy"
                          :options="rollbackPolicyOptions"
                        />
                      </n-gi>
                    </n-grid>

                    <div v-else-if="draftExperiment.type === 'AD'" class="wizard-stack">
                      <n-grid :cols="3" :x-gap="12" :y-gap="12" responsive="screen">
                        <n-gi>
                          <label class="field-label">广告账户</label>
                          <n-select v-model:value="draftExperiment.specialConfig.ad.accountId" :options="adAccountOptions" />
                        </n-gi>
                        <n-gi>
                          <label class="field-label">投放项目</label>
                          <n-input v-model:value="draftExperiment.specialConfig.ad.projectId" />
                        </n-gi>
                        <n-gi>
                          <label class="field-label">授权校验</label>
                          <n-checkbox v-model:checked="draftExperiment.specialConfig.ad.authorizationChecked">
                            外部平台授权已通过
                          </n-checkbox>
                        </n-gi>
                        <n-gi :span="3">
                          <label class="field-label">策略说明</label>
                          <n-input v-model:value="draftExperiment.specialConfig.ad.strategy" />
                        </n-gi>
                      </n-grid>
                      <div class="wizard-card">
                        <div class="wizard-card-head">
                          <div>
                            <strong>广告账户管理</strong>
                            <span>绑定外部平台账户并展示授权状态。</span>
                          </div>
                        </div>
                        <div v-for="account in draftExperiment.specialConfig.ad.accounts" :key="account.id" class="param-schema-row">
                          <n-grid :cols="4" :x-gap="10" :y-gap="10" responsive="screen">
                            <n-gi><n-input v-model:value="account.name" placeholder="账户名称" /></n-gi>
                            <n-gi><n-select v-model:value="account.platform" :options="adPlatformOptions" /></n-gi>
                            <n-gi><n-select v-model:value="account.status" :options="adAccountStatusOptions" /></n-gi>
                            <n-gi><n-tag :type="account.status === 'AUTHORIZED' ? 'success' : 'warning'">{{ account.status }}</n-tag></n-gi>
                          </n-grid>
                        </div>
                      </div>
                      <div class="wizard-card">
                        <div class="wizard-card-head">
                          <div>
                            <strong>资产管理</strong>
                            <span>素材需审核通过后才允许提交实验。</span>
                          </div>
                          <n-button secondary @click="abStore.addAdAsset">新增资产</n-button>
                        </div>
                        <div v-for="asset in draftExperiment.specialConfig.ad.assets" :key="asset.id" class="param-schema-row">
                          <n-grid :cols="4" :x-gap="10" :y-gap="10" responsive="screen">
                            <n-gi><n-input v-model:value="asset.name" placeholder="资产名称" /></n-gi>
                            <n-gi><n-select v-model:value="asset.type" :options="adAssetTypeOptions" /></n-gi>
                            <n-gi><n-select v-model:value="asset.reviewStatus" :options="adReviewStatusOptions" /></n-gi>
                            <n-gi><n-button size="small" secondary @click="abStore.removeAdAsset(asset.id)">删除</n-button></n-gi>
                          </n-grid>
                        </div>
                      </div>
                      <div class="wizard-card">
                        <div class="wizard-card-head">
                          <div>
                            <strong>投放配置与审核排期</strong>
                            <span>预算、出价、版位和审核状态共同决定是否可启动。</span>
                          </div>
                        </div>
                        <n-grid :cols="3" :x-gap="12" :y-gap="12" responsive="screen">
                          <n-gi>
                            <label class="field-label">投放目标</label>
                            <n-select v-model:value="draftExperiment.specialConfig.ad.deliveryConfig.objective" :options="adObjectiveOptions" />
                          </n-gi>
                          <n-gi>
                            <label class="field-label">日预算</label>
                            <n-input-number v-model:value="draftExperiment.specialConfig.ad.deliveryConfig.dailyBudget" :min="1" style="width: 100%" />
                          </n-gi>
                          <n-gi>
                            <label class="field-label">出价策略</label>
                            <n-select v-model:value="draftExperiment.specialConfig.ad.deliveryConfig.bidStrategy" :options="bidStrategyOptions" />
                          </n-gi>
                          <n-gi>
                            <label class="field-label">版位</label>
                            <n-select
                              v-model:value="draftExperiment.specialConfig.ad.deliveryConfig.placements"
                              multiple
                              tag
                              :options="draftExperiment.specialConfig.ad.deliveryConfig.placements.map((item) => ({ label: item, value: item }))"
                            />
                          </n-gi>
                          <n-gi>
                            <label class="field-label">开始时间</label>
                            <n-input v-model:value="draftExperiment.specialConfig.ad.deliveryConfig.startAt" />
                          </n-gi>
                          <n-gi>
                            <label class="field-label">结束时间</label>
                            <n-input v-model:value="draftExperiment.specialConfig.ad.deliveryConfig.endAt" />
                          </n-gi>
                          <n-gi>
                            <label class="field-label">审核状态</label>
                            <n-select v-model:value="draftExperiment.specialConfig.ad.reviewSchedule.auditStatus" :options="adAuditStatusOptions" />
                          </n-gi>
                          <n-gi>
                            <label class="field-label">审核人</label>
                            <n-input v-model:value="draftExperiment.specialConfig.ad.reviewSchedule.reviewer" />
                          </n-gi>
                          <n-gi>
                            <label class="field-label">排期时间</label>
                            <n-input v-model:value="draftExperiment.specialConfig.ad.reviewSchedule.scheduledAt" />
                          </n-gi>
                          <n-gi :span="3">
                            <label class="field-label">审核备注</label>
                            <n-input v-model:value="draftExperiment.specialConfig.ad.reviewSchedule.note" />
                          </n-gi>
                        </n-grid>
                      </div>
                    </div>

                    <div v-else-if="draftExperiment.type === 'VISUAL'" class="wizard-stack">
                      <n-grid :cols="3" :x-gap="12" :y-gap="12" responsive="screen">
                        <n-gi>
                          <label class="field-label">页面 URL</label>
                          <n-input v-model:value="draftExperiment.specialConfig.visual.pageUrl" />
                        </n-gi>
                        <n-gi>
                          <label class="field-label">编辑器状态</label>
                          <n-select
                            v-model:value="draftExperiment.specialConfig.visual.editorStatus"
                            :options="[
                              { label: '未配置', value: 'NOT_CONFIGURED' },
                              { label: '已配置', value: 'CONFIGURED' },
                            ]"
                          />
                        </n-gi>
                        <n-gi>
                          <label class="field-label">扩展检测</label>
                          <n-checkbox v-model:checked="draftExperiment.specialConfig.visual.extensionDetected">
                            浏览器扩展已检测
                          </n-checkbox>
                        </n-gi>
                        <n-gi>
                          <label class="field-label">热力图</label>
                          <n-checkbox v-model:checked="draftExperiment.specialConfig.visual.heatmapEnabled">
                            创建报告热力图
                          </n-checkbox>
                        </n-gi>
                        <n-gi>
                          <label class="field-label">当前元素</label>
                          <n-select
                            v-model:value="draftExperiment.specialConfig.visual.selectedElementId"
                            :options="visualElementOptions"
                          />
                        </n-gi>
                        <n-gi>
                          <label class="field-label">编辑器操作</label>
                          <n-button secondary @click="abStore.addVisualElement">添加元素</n-button>
                        </n-gi>
                      </n-grid>
                      <div v-for="element in draftExperiment.specialConfig.visual.elements" :key="element.id" class="param-schema-row">
                        <n-grid :cols="6" :x-gap="10" :y-gap="10" responsive="screen">
                          <n-gi><n-input v-model:value="element.name" placeholder="元素名称" /></n-gi>
                          <n-gi><n-input v-model:value="element.selector" placeholder="CSS Selector" /></n-gi>
                          <n-gi><n-select v-model:value="element.variantTempId" :options="variantTempOptions" /></n-gi>
                          <n-gi><n-select v-model:value="element.property" :options="visualPropertyOptions" /></n-gi>
                          <n-gi><n-input v-model:value="element.newValue" placeholder="实验值" /></n-gi>
                          <n-gi><n-button size="small" secondary @click="abStore.removeVisualElement(element.id)">删除</n-button></n-gi>
                          <n-gi :span="6">
                            <n-input v-model:value="element.originalValue" placeholder="原始值，用于回滚与差异预览" />
                          </n-gi>
                        </n-grid>
                      </div>
                    </div>
                  </div>
                </div>
              </template>

              <template v-else-if="currentCreateStep === 4">
                <n-grid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
                  <n-gi>
                    <label class="field-label">分流 ID 类型</label>
                    <n-select
                      v-model:value="draftExperiment.diversionConfig.decisionIdType"
                      :options="[
                        { label: 'UID', value: 'uid' },
                        { label: 'DID', value: 'did' },
                        { label: 'UUID', value: 'uuid' },
                        { label: 'Device ID', value: 'device_id' },
                        { label: '自定义', value: 'custom' },
                      ]"
                    />
                  </n-gi>
                  <n-gi>
                    <label class="field-label">分流 ID 字段</label>
                    <n-input v-model:value="draftExperiment.diversionConfig.decisionIdField" />
                  </n-gi>
                  <n-gi>
                    <label class="field-label">App Key</label>
                    <n-input v-model:value="draftExperiment.diversionConfig.appKey" />
                  </n-gi>
                  <n-gi>
                    <label class="field-label">曝光模式</label>
                    <n-select
                      v-model:value="draftExperiment.diversionConfig.exposureMode"
                      :options="[
                        { label: '自动曝光', value: 'AUTO' },
                        { label: '手动曝光', value: 'MANUAL' },
                      ]"
                    />
                  </n-gi>
                </n-grid>
                <n-divider />
                <div class="wizard-card">
                  <div class="wizard-card-head">
                    <div>
                      <strong>受众条件</strong>
                      <span>支持组间 AND/OR、组内 AND/OR 与请求必填校验。</span>
                    </div>
                    <n-space>
                      <n-select
                        v-model:value="draftExperiment.diversionConfig.filter.relation"
                        :options="audienceRelationOptions"
                        style="width: 120px"
                      />
                      <n-button secondary @click="abStore.addAudienceGroup">新增条件组</n-button>
                    </n-space>
                  </div>
                  <div class="audience-group-list">
                    <div
                      v-for="group in draftExperiment.diversionConfig.filter.groups"
                      :key="group.id"
                      class="audience-group-card"
                    >
                      <div class="wizard-card-head">
                        <n-space align="center">
                          <strong>条件组</strong>
                          <n-select v-model:value="group.relation" :options="audienceRelationOptions" style="width: 120px" />
                        </n-space>
                        <n-space size="small">
                          <n-button size="small" secondary @click="abStore.addAudienceCondition(group.id)">新增条件</n-button>
                          <n-button
                            size="small"
                            secondary
                            :disabled="draftExperiment.diversionConfig.filter.groups.length <= 1"
                            @click="abStore.removeAudienceGroup(group.id)"
                          >
                            删除组
                          </n-button>
                        </n-space>
                      </div>
                      <div
                        v-for="condition in group.conditions"
                        :key="condition.id"
                        class="audience-condition-row"
                      >
                        <n-select
                          :value="condition.source"
                          :options="audienceSourceOptions"
                          @update:value="(value) => abStore.updateAudienceConditionSource(condition.id, value)"
                        />
                        <n-select
                          :value="condition.field"
                          :options="audienceFieldOptions(condition.source)"
                          @update:value="(value) => abStore.updateAudienceConditionField(condition.id, value)"
                        />
                        <n-select
                          :value="condition.operator"
                          :options="audienceOperatorOptions"
                          @update:value="(value) => abStore.updateAudienceConditionOperator(condition.id, value)"
                        />
                        <n-input
                          :disabled="['is_null', 'is_not_null'].includes(condition.operator)"
                          :value="formatAudienceValue(condition)"
                          placeholder="多个值用逗号分隔"
                          @update:value="(value) => abStore.updateAudienceConditionValue(condition.id, value)"
                        />
                        <n-checkbox v-model:checked="condition.requiredInRequest">请求必填</n-checkbox>
                        <n-button
                          size="tiny"
                          secondary
                          :disabled="group.conditions.length <= 1"
                          @click="abStore.removeAudienceCondition(group.id, condition.id)"
                        >
                          删除
                        </n-button>
                      </div>
                    </div>
                  </div>
                  <n-divider />
                  <div class="audience-estimate">
                    <n-button type="primary" secondary :loading="audienceEstimate.status === 'running'" @click="estimateAudience">
                      预估受众
                    </n-button>
                    <div class="preview-grid">
                      <div>
                        <span>预估用户</span>
                        <strong>{{ formatNumber(audienceEstimate.estimatedUsers) }}</strong>
                      </div>
                      <div>
                        <span>过滤比例</span>
                        <strong>{{ formatPercent(audienceEstimate.filterRatio * 100) }}</strong>
                      </div>
                      <div>
                        <span>状态</span>
                        <strong>{{ audienceEstimate.message }}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </template>

              <template v-else-if="currentCreateStep === 5">
                <div class="wizard-stack">
                  <div class="wizard-card">
                    <div class="wizard-card-head">
                      <div>
                        <strong>流量层与互斥域</strong>
                        <span>当前实验按 {{ draftTerminalType }} 类型筛选可用流量层。</span>
                      </div>
                      <n-tag size="small">{{ draftTerminalType }}</n-tag>
                    </div>
                    <n-grid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
                      <n-gi>
                        <label class="field-label">流量层</label>
                        <n-select
                          v-model:value="draftExperiment.trafficConfig.trafficLayerId"
                          :disabled="abStore.isDraftFieldLocked('trafficLayer')"
                          :options="compatibleTrafficLayerOptions"
                        />
                      </n-gi>
                      <n-gi>
                        <label class="field-label">实验流量</label>
                        <n-input-number
                          v-model:value="draftExperiment.trafficConfig.experimentTrafficRatio"
                          :min="0.01"
                          :max="100"
                          :step="0.01"
                          style="width: 100%"
                        />
                      </n-gi>
                      <n-gi>
                        <label class="field-label">启用互斥</label>
                        <n-checkbox v-model:checked="draftExperiment.trafficConfig.useMutex">加入互斥域</n-checkbox>
                      </n-gi>
                      <n-gi>
                        <label class="field-label">互斥域</label>
                        <n-select
                          v-model:value="draftExperiment.trafficConfig.mutexDomainId"
                          :disabled="!draftExperiment.trafficConfig.useMutex"
                          :options="compatibleMutexDomainOptions"
                        />
                      </n-gi>
                      <n-gi>
                        <label class="field-label">体验一致性</label>
                        <n-checkbox v-model:checked="draftExperiment.trafficConfig.experienceConsistencyEnabled">
                          同一分流 ID 始终命中同一版本
                        </n-checkbox>
                      </n-gi>
                    </n-grid>
                    <div v-if="draftSelectedMutexDomain" class="condition-pill">
                      {{ draftSelectedMutexDomain.name }} · 已占用实验 {{ draftSelectedMutexDomain.runningExperimentIds.length }} 个
                    </div>
                  </div>

                  <div class="wizard-card">
                    <div class="wizard-card-head">
                      <div>
                        <strong>生效方式</strong>
                        <span>支持立即生效和平滑扩量。</span>
                      </div>
                    </div>
                    <n-grid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
                      <n-gi>
                        <label class="field-label">生效方式</label>
                        <n-select
                          v-model:value="draftExperiment.trafficConfig.effectiveMode"
                          :options="[
                            { label: '立即生效', value: 'IMMEDIATE' },
                            { label: '平滑生效', value: 'SMOOTH' },
                          ]"
                        />
                      </n-gi>
                      <n-gi>
                        <label class="field-label">平滑时长</label>
                        <n-input-number
                          v-model:value="draftExperiment.trafficConfig.smoothDurationMinutes"
                          :min="1"
                          :max="1440"
                          style="width: 100%"
                        />
                      </n-gi>
                    </n-grid>
                  </div>

                  <div class="wizard-card">
                    <div class="wizard-card-head">
                      <div>
                        <strong>增强分流均匀性</strong>
                        <span>提交前需要完成调平任务，状态成功后才能进入调试。</span>
                      </div>
                      <n-tag :type="uniformStatusTagType" size="small">{{ draftUniformStatusLabel }}</n-tag>
                    </div>
                    <n-grid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
                      <n-gi>
                        <label class="field-label">是否启用</label>
                        <n-checkbox
                          :checked="draftExperiment.trafficConfig.uniformDiversionEnabled"
                          :disabled="uniformConfigLocked"
                          @update:checked="updateUniformEnabled"
                        >
                          启用分流均匀性检查
                        </n-checkbox>
                      </n-gi>
                      <n-gi>
                        <label class="field-label">调平模式</label>
                        <n-select
                          :value="draftExperiment.trafficConfig.uniformDiversionMode"
                          :disabled="uniformConfigLocked"
                          :options="[
                            { label: '指标调平', value: 'METRIC' },
                            { label: '人群调平', value: 'SEGMENT' },
                          ]"
                          @update:value="updateUniformMode"
                        />
                      </n-gi>
                      <n-gi v-if="draftExperiment.trafficConfig.uniformDiversionMode === 'METRIC'">
                        <label class="field-label">调平指标（最多 3 个）</label>
                        <n-select
                          :value="draftExperiment.trafficConfig.uniformMetricIds"
                          multiple
                          :max-tag-count="3"
                          :disabled="uniformConfigLocked"
                          :options="metrics.map((metric) => ({ label: metric.name, value: metric.id }))"
                          @update:value="updateUniformMetrics"
                        />
                        <small v-if="uniformMetricLimitReached">已达到 3 个指标上限</small>
                      </n-gi>
                      <n-gi v-else>
                        <label class="field-label">调平人群</label>
                        <n-select
                          :value="draftExperiment.trafficConfig.uniformSegmentIds"
                          multiple
                          :disabled="uniformConfigLocked"
                          :options="segmentSelectOptions"
                          @update:value="updateUniformSegments"
                        />
                      </n-gi>
                      <n-gi>
                        <label class="field-label">历史窗口</label>
                        <n-grid :cols="2" :x-gap="8">
                          <n-gi>
                            <n-input
                              v-model:value="draftExperiment.trafficConfig.uniformDateRange.startDate"
                              :disabled="uniformConfigLocked"
                            />
                          </n-gi>
                          <n-gi>
                            <n-input
                              v-model:value="draftExperiment.trafficConfig.uniformDateRange.endDate"
                              :disabled="uniformConfigLocked"
                            />
                          </n-gi>
                        </n-grid>
                      </n-gi>
                      <n-gi>
                        <label class="field-label">最大调平次数</label>
                        <n-input-number
                          v-model:value="draftExperiment.trafficConfig.uniformMaxRunTimes"
                          :disabled="uniformConfigLocked"
                          :min="1"
                          :max="500"
                          style="width: 100%"
                        />
                      </n-gi>
                      <n-gi>
                        <label class="field-label">P 值阈值</label>
                        <n-input-number
                          v-model:value="draftExperiment.trafficConfig.uniformPValueThreshold"
                          :disabled="uniformConfigLocked"
                          :step="0.01"
                          :min="0.01"
                          :max="0.2"
                          style="width: 100%"
                        />
                      </n-gi>
                    </n-grid>
                    <n-space class="full-button">
                      <n-button
                        type="primary"
                        secondary
                        :disabled="!draftExperiment.trafficConfig.uniformDiversionEnabled || uniformConfigLocked"
                        :loading="uniformTaskRunning"
                        @click="runUniformDiversion"
                      >
                        {{ draftExperiment.trafficConfig.uniformStatus === 'FAILED' ? '重新调平' : '开始调平' }}
                      </n-button>
                      <n-button
                        secondary
                        :disabled="draftExperiment.trafficConfig.uniformStatus !== 'RUNNING'"
                        @click="cancelUniformDiversion"
                      >
                        取消任务
                      </n-button>
                      <n-button
                        secondary
                        :disabled="!draftExperiment.trafficConfig.uniformTaskId"
                        @click="uniformDetailModalVisible = true"
                      >
                        查看详情
                      </n-button>
                      <n-button
                        secondary
                        :disabled="draftExperiment.trafficConfig.uniformStatus !== 'SUCCESS' || draftExperiment.trafficConfig.uniformResultApplied"
                        @click="applyUniformResult"
                      >
                        应用结果
                      </n-button>
                      <n-button
                        secondary
                        :disabled="!draftExperiment.trafficConfig.uniformConfigLocked"
                        @click="unlockUniformResult"
                      >
                        取消应用
                      </n-button>
                      <n-button secondary @click="runTrafficCalculator">同步计算样本量建议</n-button>
                    </n-space>
                    <div v-if="draftExperiment.trafficConfig.uniformTaskId" class="condition-pill">
                      任务 ID：{{ draftExperiment.trafficConfig.uniformTaskId }}
                    </div>
                    <div v-if="draftExperiment.trafficConfig.uniformConfigLocked" class="condition-pill">
                      已应用调平结果，配置处于锁定状态
                    </div>
                  </div>
                </div>
              </template>

              <template v-else>
                <div class="metric-selector-filter-panel">
                  <n-input v-model:value="draftMetricFilters.keyword" clearable placeholder="搜索指标组、指标名称、描述、Owner" />
                  <n-select
                    v-model:value="draftMetricFilters.type"
                    :options="[
                      { label: '全部类型', value: 'all' },
                      { label: '事件指标', value: 'event' },
                      { label: '留存指标', value: 'retention' },
                      { label: '漏斗指标', value: 'funnel' },
                    ]"
                  />
                  <n-select
                    v-model:value="draftMetricFilters.mustSee"
                    :options="[
                      { label: '全部指标', value: 'all' },
                      { label: '仅必看', value: 'yes' },
                      { label: '非必看', value: 'no' },
                    ]"
                  />
                  <n-select
                    v-model:value="draftMetricFilters.permissionType"
                    :options="[
                      { label: '全部权限', value: 'all' },
                      { label: '公共指标组', value: 'public' },
                      { label: '私有指标组', value: 'private' },
                    ]"
                  />
                  <n-select v-model:value="draftMetricFilters.ownerId" :options="draftMetricOwnerOptions" />
                </div>
                <n-grid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
                  <n-gi>
                    <label class="field-label">核心指标</label>
                    <n-select
                      :value="draftExperiment.coreMetricId"
                      clearable
                      :disabled="abStore.isDraftFieldLocked('metrics')"
                      :options="draftCoreMetricOptions"
                      placeholder="选择 1 个核心指标"
                      @update:value="(value) => handleDraftCoreMetricChange(value as EntityId | null)"
                    />
                    <label class="field-label metric-role-label">关注指标</label>
                    <n-select
                      :value="draftExperiment.focusMetricIds"
                      multiple
                      clearable
                      :disabled="abStore.isDraftFieldLocked('metrics')"
                      :options="draftFocusMetricOptions"
                      placeholder="可选择多个关注指标，最多一个漏斗指标"
                      @update:value="(value) => handleDraftFocusMetricChange(value as EntityId[])"
                    />
                    <n-button class="full-button" secondary @click="applyMustSeeMetricsToDraft">
                      自动带入必看指标
                    </n-button>
                    <div class="template-apply-row">
                      <n-select
                        v-model:value="draftMetricTemplateId"
                        clearable
                        :options="draftMetricTemplateOptions"
                        placeholder="选择指标模板"
                      />
                      <n-button secondary @click="applyMetricTemplateToExperimentDraft">应用模板</n-button>
                    </div>
                    <n-button class="full-button" secondary :disabled="!draftMetricSnapshots.length" @click="saveDraftMetricsAsTemplate">
                      已选指标存为模板
                    </n-button>
                  </n-gi>
                  <n-gi>
                    <label class="field-label">关联 Feature</label>
                    <n-select
                      v-model:value="draftExperiment.featureIds"
                      multiple
                      clearable
                      :options="featureFlags.map((feature) => ({ label: feature.name, value: feature.featureId }))"
                    />
                  </n-gi>
                  <n-gi>
                    <label class="field-label">多重比较</label>
                    <n-checkbox v-model:checked="draftExperiment.trafficConfig.multiComparisonCorrection">
                      已启用或确认多重比较校正
                    </n-checkbox>
                  </n-gi>
                  <n-gi>
                    <label class="field-label">样本量口径</label>
                    <div class="condition-pill">
                      MDE {{ formatRatio(draftExperiment.trafficConfig.planningMdeValue ?? 0) }} · 建议流量
                      {{ formatRatio(draftExperiment.trafficConfig.planningRecommendedTrafficRatio ?? 0) }}
                    </div>
                  </n-gi>
                </n-grid>
                <n-divider />
                <div class="snapshot-list">
                  <div v-if="draftCoreMetric" class="snapshot-row">
                    <div>
                      <strong>{{ draftCoreMetric.name }}</strong>
                      <span>{{ draftCoreMetric.description }}</span>
                    </div>
                    <n-space size="small">
                      <n-tag type="success" size="small">核心指标</n-tag>
                      <n-tag size="small">{{ draftCoreMetric.metricCategory }}</n-tag>
                    </n-space>
                  </div>
                  <div v-for="metric in draftFocusMetrics" :key="metric.id" class="snapshot-row">
                    <div>
                      <strong>{{ metric.name }}</strong>
                      <span>{{ metric.description }}</span>
                    </div>
                    <n-space size="small">
                      <n-tag type="info" size="small">关注指标</n-tag>
                      <n-tag size="small">{{ metric.metricCategory }}</n-tag>
                      <n-tag v-if="metric.isMustSee" type="success" size="small">必看</n-tag>
                    </n-space>
                  </div>
                  <n-empty v-if="!draftCoreMetric && !draftFocusMetrics.length" size="small" description="请先选择核心指标" />
                </div>
                <div v-if="draftMetricFlexibleRows.length" class="report-panel">
                  <n-space align="center" justify="space-between">
                    <div>
                      <strong>灵活属性绑定</strong>
                      <p class="report-text muted">实验创建时为灵活属性填写本次实验实际口径，报告页按同一口径展示。</p>
                    </div>
                  </n-space>
                  <div class="advanced-filter-list">
                    <div v-for="row in draftMetricFlexibleRows" :key="`${row.metric.id}-${row.property.id}`" class="advanced-filter-row">
                      <div class="condition-pill">{{ row.metric.name }} · {{ row.property.scope }}</div>
                      <div class="condition-pill">{{ row.property.propertyName }} {{ row.property.defaultOperator }}</div>
                      <n-input
                        :value="row.value"
                        placeholder="属性值，多个值用逗号分隔"
                        @update:value="(value) => updateFlexibleDraftValue(row.metric.id, row.property.id, value)"
                      />
                      <div class="condition-pill">报告口径：{{ row.property.propertyName }} {{ row.property.defaultOperator }} {{ row.value || '全部' }}</div>
                    </div>
                  </div>
                </div>
                <n-divider />
                <div class="preview-grid">
                  <div>
                    <span>类型</span>
                    <strong>{{ typeLabels[draftExperiment.type] }}</strong>
                  </div>
                  <div>
                    <span>版本</span>
                    <strong>{{ draftExperiment.variants.length }}</strong>
                  </div>
                  <div>
                    <span>流量</span>
                    <strong>{{ formatPercent(draftExperiment.trafficConfig.experimentTrafficRatio) }}</strong>
                  </div>
                  <div>
                    <span>指标</span>
                    <strong>{{ draftExperiment.metricIds.length }}</strong>
                  </div>
                </div>
              </template>

              <n-divider />
              <n-space justify="space-between">
                <n-button :disabled="currentCreateStep === 1" @click="abStore.previousCreateStep">上一步</n-button>
                <n-space>
                  <n-button secondary @click="cancelCreateWizard">取消</n-button>
                  <n-button secondary @click="saveDraft">保存草稿</n-button>
                  <n-button v-if="currentCreateStep < 6" type="primary" @click="nextCreateStep">下一步</n-button>
                  <n-button v-else secondary @click="validateDraft">执行检查</n-button>
                  <n-button
                    v-if="currentCreateStep === 6"
                    type="primary"
                    :loading="draftSubmitting"
                    :disabled="!canSubmitDraft"
                    @click="submitDraftForDebug"
                  >
                    提交调试
                  </n-button>
                </n-space>
              </n-space>
            </n-card>
          </n-gi>
          <n-gi>
            <n-card :title="currentCreateStep === 1 ? '实验类型说明' : '提交前检查'" :bordered="false">
              <n-space v-if="currentCreateStep === 1 && selectedExperimentTypeInfo" vertical>
                <n-tag :type="selectedExperimentTypeInfo.available ? 'success' : 'warning'" size="small">
                  {{ selectedExperimentTypeInfo.available ? '当前可创建' : '当前不可创建' }}
                </n-tag>
                <p class="report-text">{{ selectedExperimentTypeInfo.description }}</p>
                <div class="mini-section">
                  <strong>适用场景</strong>
                  <div v-for="scene in selectedExperimentTypeInfo.scenes" :key="scene" class="condition-pill">
                    {{ scene }}
                  </div>
                </div>
                <div class="mini-section">
                  <strong>接入要求</strong>
                  <div v-for="requirement in selectedExperimentTypeInfo.requirements" :key="requirement" class="condition-pill">
                    {{ requirement }}
                  </div>
                </div>
                <div v-if="!selectedExperimentTypeInfo.available" class="condition-pill danger">
                  {{ selectedExperimentTypeInfo.reason }}
                </div>
              </n-space>
              <n-space v-else vertical>
                <n-button type="primary" block @click="validateDraft">
                  <template #icon>
                    <n-icon><ShieldCheckmarkOutline /></n-icon>
                  </template>
                  执行检查
                </n-button>
                <div v-if="draftChecks.length" class="check-list">
                  <div v-for="item in draftChecks" :key="item.code" class="check-row">
                    <n-tag :type="draftCheckType(item.level)" size="small">Step {{ item.step }}</n-tag>
                    <span>{{ item.message }}</span>
                  </div>
                </div>
                <n-empty v-else description="等待检查" />
                <div v-if="draftSubmitMessage" class="decision-result">
                  <strong>{{ draftSubmitMessage }}</strong>
                  <span v-if="lastCreatedExperimentId">实验 ID：{{ lastCreatedExperimentId }}</span>
                </div>
              </n-space>
            </n-card>
          </n-gi>
        </n-grid>

        <n-grid :cols="3" :x-gap="16" :y-gap="16" responsive="screen">
          <n-gi>
            <n-card title="版本参数" :bordered="false">
              <div v-for="variant in draftExperiment.variants" :key="variant.tempId" class="mini-section">
                <strong>{{ variant.name }}</strong>
                <p>{{ Object.entries(variant.params).map(([key, value]) => `${key}=${value}`).join('，') }}</p>
              </div>
            </n-card>
          </n-gi>
          <n-gi>
            <n-card title="受众分流" :bordered="false">
              <div
                v-for="condition in draftExperiment.diversionConfig.filter.groups.flatMap((group) => group.conditions)"
                :key="condition.id"
                class="condition-pill"
              >
                {{ condition.source }}.{{ condition.field }} {{ condition.operator }}
                {{ formatAudienceValue(condition) }}
              </div>
              <div class="condition-pill">分流 ID: {{ draftExperiment.diversionConfig.decisionIdType }}/{{ draftExperiment.diversionConfig.decisionIdField }}</div>
              <div class="condition-pill">曝光模式: {{ draftExperiment.diversionConfig.exposureMode }}</div>
              <div class="condition-pill">预估用户: {{ formatNumber(audienceEstimate.estimatedUsers) }}</div>
            </n-card>
          </n-gi>
          <n-gi>
            <n-card title="流量与调平" :bordered="false">
              <div class="condition-pill">实验流量 {{ formatPercent(draftExperiment.trafficConfig.experimentTrafficRatio) }}</div>
              <div class="condition-pill">流量层 {{ draftExperiment.trafficConfig.trafficLayerId }}</div>
              <div class="condition-pill">互斥域 {{ draftExperiment.trafficConfig.mutexDomainId }}</div>
              <div class="condition-pill">平滑生效: {{ draftExperiment.trafficConfig.smoothDurationMinutes }} 分钟</div>
              <div class="condition-pill">
                体验一致性: {{ draftExperiment.trafficConfig.experienceConsistencyEnabled ? '开启' : '关闭' }}
              </div>
              <div class="condition-pill">
                测试白名单:
                {{ draftExperiment.testUserAudienceRequirement === 'REQUIRE_AUDIENCE' ? '需满足受众规则' : '可绕过受众规则' }}
              </div>
              <div class="condition-pill">均匀性: {{ draftUniformStatusLabel }}</div>
            </n-card>
          </n-gi>
        </n-grid>
      </section>

      <section v-else-if="activePage === 'reports'" class="ab-section-stack">
        <n-card :bordered="false">
          <n-space align="center" justify="space-between">
            <div class="report-title-block">
              <span>A/B 测试 / 实验列表 / 实验详情 / 实验报告</span>
              <strong>{{ reportOverview?.experimentName ?? selectedReportExperiment?.name ?? '请选择实验' }}</strong>
            </div>
            <n-space>
              <n-select
                v-model:value="selectedReportExperimentId"
                :options="experiments.map((experiment) => ({ label: experiment.name, value: experiment.id }))"
                style="width: 320px"
              />
              <n-button secondary :loading="reportRefreshing" @click="() => refreshReport()">
                <template #icon>
                  <n-icon><RefreshOutline /></n-icon>
                </template>
                刷新
              </n-button>
              <n-button secondary @click="copyReportLink">
                <template #icon>
                  <n-icon><CopyOutline /></n-icon>
                </template>
                复制链接
              </n-button>
              <n-button secondary :disabled="!selectedReportExperimentId" @click="openReportSolidify">
                固化至 Feature
              </n-button>
              <n-tooltip :disabled="reportExportPermission.allowed">
                <template #trigger>
                  <n-button secondary :loading="reportExporting" :disabled="!reportExportPermission.allowed" @click="exportReport()">
                    <template #icon>
                      <n-icon><DownloadOutline /></n-icon>
                    </template>
                    下载报告
                  </n-button>
                </template>
                {{ reportExportPermission.reason || '暂无导出权限' }}
              </n-tooltip>
              <n-button secondary @click="reportHelpVisible = true">
                <template #icon>
                  <n-icon><HelpCircleOutline /></n-icon>
                </template>
                帮助说明
              </n-button>
            </n-space>
          </n-space>
        </n-card>

        <n-card :bordered="false">
          <div class="report-meta-grid">
            <div v-for="item in reportHeaderItems" :key="item.label">
              <span>{{ item.label }}</span>
              <template v-if="item.label === '进组人数'">
                <button class="link-button report-entry-button" @click="openGroupUserDownload">
                  {{ item.value }}
                </button>
                <button class="link-button report-policy-link" @click="groupUserPolicyVisible = true">
                  查看口径说明
                </button>
              </template>
              <strong v-else>{{ item.value }}</strong>
            </div>
          </div>
        </n-card>

        <n-card v-if="reportMetricSnapshotRows.length" :bordered="false">
          <n-space align="center" justify="space-between">
            <div>
              <strong>指标口径快照</strong>
              <p class="report-text muted">实验绑定时固化指标定义、数字格式和灵活属性值；后续编辑指标不会改写历史报告口径。</p>
            </div>
            <n-tag size="small">{{ reportMetricSnapshotRows.length }} 个快照</n-tag>
          </n-space>
          <div class="snapshot-list metric-snapshot-list">
            <div v-for="snapshot in reportMetricSnapshotRows" :key="snapshot.id" class="snapshot-row">
              <div>
                <strong>{{ snapshot.metricName }} · {{ snapshot.metricGroupName }}</strong>
                <span>
                  {{ snapshot.metricRole === 'core' ? '核心指标' : '关注指标' }} · {{ snapshot.metricCategory }} · 快照版本
                  {{ snapshot.snapshotVersion || '运行时' }} · {{ formatDateTime(snapshot.capturedAt) }}
                </span>
                <small v-if="snapshot.flexibleValues.length">
                  灵活属性：{{ snapshot.flexibleValues.map((item) => `${item.propertyName} ${item.operator ?? ''} ${Array.isArray(item.value) ? item.value.join(',') : item.value ?? '全部'}`).join('；') }}
                </small>
              </div>
              <n-space size="small">
                <n-tag size="small" :type="snapshot.statusAtBinding === 'active' ? 'success' : 'warning'">
                  绑定时{{ snapshot.statusAtBinding === 'active' ? '使用中' : '已下线' }}
                </n-tag>
                <n-button size="tiny" secondary @click="goToMetricDetail(snapshot.metricId)">指标详情</n-button>
              </n-space>
            </div>
          </div>
        </n-card>

        <n-card :bordered="false">
          <n-tabs v-model:value="activeReportTab" type="line" animated>
            <n-tab-pane
              v-for="tab in reportPrimaryTabs"
              :key="tab.name"
              :name="tab.name"
              :tab="tab.label"
            >
              <template v-if="tab.name === 'conclusion'">
                <div class="conclusion-banner" :class="reportConclusionBanner.type">
                  <div>
                    <n-tag :type="reportConclusionBanner.type">{{ reportConclusionBanner.status }}</n-tag>
                    <strong>{{ reportConclusionBanner.text }}</strong>
                    <span>{{ reportOverview?.conclusionText ?? '报告概览数据仍在计算中，当前展示可用的指标快照。' }}</span>
                  </div>
                  <div class="conclusion-action">
                    <span>建议动作</span>
                    <strong>{{ reportOverview?.recommendation ?? reportConclusionBanner.action }}</strong>
                  </div>
                </div>

                <div class="report-summary">
                  <div>
                    <span>最优版本</span>
                    <strong>{{ reportVersionName(bestMetricResult?.result.versionId) }}</strong>
                    <small v-if="bestMetricResult?.result.significance !== 'positive'">当前未达到正向显著</small>
                  </div>
                  <div>
                    <span>核心指标变化</span>
                    <strong>{{ formatRatio(bestMetricResult?.result.diffRel ?? null) }}</strong>
                    <small>{{ bestMetricResult?.metric.metricName ?? '-' }}</small>
                  </div>
                  <div>
                    <span>P-value</span>
                    <strong>{{ bestMetricResult?.result.pValue ?? '-' }}</strong>
                    <small>{{ significanceLabel(bestMetricResult?.result.significance) }}</small>
                  </div>
                  <div>
                    <span>MDE</span>
                    <strong>{{ formatRatio(bestMetricResult?.result.mde ?? null) }}</strong>
                    <small>置信区间 {{ formatConfidenceInterval(bestMetricResult?.result.confidenceInterval) }}</small>
                  </div>
                </div>

                <div class="report-panel">
                  <n-space align="center" justify="space-between">
                    <div>
                      <strong>核心指标汇总</strong>
                      <p class="report-text muted">点击差异单元格查看统计卡片，或直接定位趋势和指标详情。</p>
                    </div>
                    <n-space>
                      <n-button size="small" secondary @click="downloadTrendData">下载数据</n-button>
                      <n-button size="small" secondary @click="() => refreshReport()">刷新指标</n-button>
                    </n-space>
                  </n-space>
                  <n-table :bordered="false" :single-line="false" size="small">
                    <thead>
                      <tr>
                        <th>指标名称</th>
                        <th>指标类型</th>
                        <th>实验版本</th>
                        <th>进组人数</th>
                        <th>指标值</th>
                        <th>差异绝对值</th>
                        <th>差异相对值</th>
                        <th>P-value</th>
                        <th>置信区间</th>
                        <th>MDE</th>
                        <th>显著性</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      <template v-for="metric in coreMetricsForReport" :key="metric.metricId">
                        <tr v-for="result in metric.versionResults" :key="`${metric.metricId}-${result.versionId}`">
                          <td>
                            <button class="link-button" @click="goToMetricDetail(metric.metricId)">
                              {{ metric.metricName }}
                            </button>
                          </td>
                          <td>{{ metric.metricType }}</td>
                          <td>{{ reportVersionName(result.versionId) }}</td>
                          <td>{{ formatNumber(result.sampleSize) }}</td>
                          <td>{{ formatMetricValue(result.metricValue) }}</td>
                          <td
                            class="metric-diff-cell"
                            :class="result.significance"
                            @click="openStatisticCard(metric, result)"
                          >
                            {{ formatMetricValue(result.diffAbs) }}
                          </td>
                          <td
                            class="metric-diff-cell"
                            :class="result.significance"
                            @click="openStatisticCard(metric, result)"
                          >
                            {{ formatRatio(result.diffRel) }}
                          </td>
                          <td>{{ result.pValue ?? '-' }}</td>
                          <td>
                            <n-tooltip>
                              <template #trigger>
                                <span>{{ formatConfidenceInterval(result.confidenceInterval) }}</span>
                              </template>
                              P-value {{ result.pValue ?? '-' }} · MDE {{ formatRatio(result.mde) }} · 样本 {{ formatNumber(result.sampleSize) }}
                            </n-tooltip>
                          </td>
                          <td>{{ formatRatio(result.mde) }}</td>
                          <td>
                            <n-tag :type="significanceType(result.significance)" size="small">
                              {{ significanceLabel(result.significance) }}
                            </n-tag>
                          </td>
                          <td>
                            <n-space size="small">
                              <n-button size="tiny" secondary @click="viewMetricTrend(metric.metricId)">查看趋势</n-button>
                              <n-button size="tiny" secondary @click="openStatisticCard(metric, result)">统计卡片</n-button>
                              <n-button size="tiny" secondary @click="goToMetricDetail(metric.metricId)">指标详情</n-button>
                            </n-space>
                          </td>
                        </tr>
                      </template>
                    </tbody>
                  </n-table>
                </div>

                <div id="core-trend-section" class="report-panel">
                  <n-space align="center" justify="space-between">
                    <div>
                      <strong>核心指标趋势分析</strong>
                      <p class="report-text muted">{{ selectedCoreMetric?.metricName ?? '请选择指标' }}</p>
                    </div>
                    <n-space>
                      <n-select
                        v-model:value="selectedCoreMetricId"
                        :options="coreMetricsForReport.map((metric) => ({ label: metric.metricName, value: metric.metricId }))"
                        style="width: 220px"
                      />
                      <n-button size="small" secondary @click="downloadTrendChart">
                        <template #icon>
                          <n-icon><DownloadOutline /></n-icon>
                        </template>
                        下载图表
                      </n-button>
                      <n-button size="small" secondary @click="downloadTrendData">下载数据</n-button>
                      <n-button size="small" secondary @click="trendFullscreenVisible = true">
                        <template #icon>
                          <n-icon><ExpandOutline /></n-icon>
                        </template>
                        全屏
                      </n-button>
                    </n-space>
                  </n-space>

                  <n-tabs v-model:value="activeTrendView" type="segment" animated>
                    <n-tab-pane name="day" tab="天级趋势">
                      <div class="trend-toolbar">
                        <n-checkbox v-model:checked="trendRangeVisible">范围展示</n-checkbox>
                        <n-checkbox v-model:checked="trendPValueVisible">P-value 展示</n-checkbox>
                        <n-button size="small" secondary @click="resetTrendLegend">重置图例</n-button>
                      </div>
                      <div class="trend-legend">
                        <button
                          v-for="versionId in allTrendVersionIds"
                          :key="versionId"
                          class="trend-legend-item"
                          :class="{ muted: hiddenTrendVersionIds.includes(versionId) }"
                          :style="{ '--legend-color': trendVersionColor(versionId) }"
                          @click="toggleTrendVersion(versionId)"
                        >
                          {{ reportVersionName(versionId) }}
                        </button>
                      </div>
                      <div class="trend-chart">
                        <div v-for="row in trendChartRows" :key="row.time" class="trend-column">
                          <div class="trend-bars">
                            <n-tooltip v-for="entry in row.points" :key="`${row.time}-${entry.versionId}`">
                              <template #trigger>
                                <div class="trend-bar" :style="trendBarStyle(entry)">
                                  <i v-if="trendRangeVisible" class="trend-range" :style="trendRangeStyle(entry)" />
                                </div>
                              </template>
                              {{ row.time }} · {{ reportVersionName(entry.versionId) }} · 指标值 {{ formatMetricValue(entry.point.value) }}
                              <template v-if="trendPValueVisible"> · P-value {{ entry.point.pValue ?? '-' }}</template>
                            </n-tooltip>
                          </div>
                          <small>{{ row.time.slice(5) }}</small>
                        </div>
                      </div>
                    </n-tab-pane>
                    <n-tab-pane name="distribution" tab="概率分布">
                      <div class="distribution-list">
                        <div v-for="row in distributionRows" :key="row.result.versionId" class="distribution-row">
                          <div>
                            <strong>{{ reportVersionName(row.result.versionId) }}</strong>
                            <span>
                              均值 {{ formatMetricValue(row.result.metricValue) }} · P-value {{ row.result.pValue ?? '-' }} · MDE {{ formatRatio(row.result.mde) }}
                            </span>
                          </div>
                          <div class="distribution-curve">
                            <i :style="{ left: `${row.left}%`, width: `${row.width}%`, backgroundColor: row.color }" />
                          </div>
                          <small>置信区间 {{ formatConfidenceInterval(row.result.confidenceInterval) }}</small>
                        </div>
                      </div>
                    </n-tab-pane>
                    <n-tab-pane name="box" tab="箱型图">
                      <div class="boxplot-list">
                        <div v-for="row in boxPlotRows" :key="row.result.versionId" class="boxplot-row">
                          <span>{{ reportVersionName(row.result.versionId) }}</span>
                          <div class="boxplot-track">
                            <i class="boxplot-whisker" :style="{ left: `${row.min}%`, width: `${row.max - row.min}%`, backgroundColor: row.color }" />
                            <i class="boxplot-box" :style="{ left: `${row.q1}%`, width: `${row.q3 - row.q1}%`, borderColor: row.color }" />
                            <i class="boxplot-median" :style="{ left: `${row.median}%`, backgroundColor: row.color }" />
                          </div>
                          <strong>{{ formatMetricValue(row.result.metricValue) }}</strong>
                        </div>
                      </div>
                      <div class="condition-pill">
                        当前版本间分布若存在较大重叠，建议延长实验时间或增加样本量后再判断。
                      </div>
                    </n-tab-pane>
                  </n-tabs>
                </div>
              </template>

              <template v-else-if="tab.name === 'metrics'">
                <div class="metric-workspace">
                  <aside class="metric-left-nav">
                    <n-input v-model:value="metricSearchKeyword" clearable placeholder="搜索指标" />
                    <div v-for="group in metricNavigationGroups" :key="group.key" class="metric-nav-group">
                      <strong>{{ group.label }}</strong>
                      <button
                        v-for="metric in group.metrics"
                        :key="`${group.key}-${metric.metricId}`"
                        class="metric-nav-item"
                        :class="{ selected: selectedCoreMetricId === metric.metricId }"
                        @click="selectedCoreMetricId = metric.metricId"
                      >
                        <span>{{ metric.metricName }}</span>
                        <small>{{ metric.metricType }}</small>
                      </button>
                      <n-empty v-if="!group.metrics.length" size="small" description="当前实验未配置该类型指标" />
                    </div>
                  </aside>

                  <div class="metric-main">
                    <div class="report-panel">
                      <n-space align="center" justify="space-between">
                        <div>
                          <strong>顶部筛选区</strong>
                          <p class="report-text muted">属性过滤与用户分群之间按 AND 生效，删除条件后需点击查询。</p>
                        </div>
                        <n-space>
                          <n-button
                            size="small"
                            :type="reportMetricFilter.dataMode === 'after_experiment' ? 'primary' : 'default'"
                            secondary
                            @click="switchReportMetricDataMode('after_experiment')"
                          >
                            实验后数据
                          </n-button>
                          <n-tooltip :disabled="preAaAvailable">
                            <template #trigger>
                              <n-button
                                size="small"
                                :type="reportMetricFilter.dataMode === 'pre_aa' ? 'primary' : 'default'"
                                :disabled="!preAaAvailable"
                                secondary
                                @click="switchReportMetricDataMode('pre_aa')"
                              >
                                查看 PreAA
                              </n-button>
                            </template>
                            PreAA 数据不足，暂不可查看
                          </n-tooltip>
                        </n-space>
                      </n-space>

                      <n-grid :cols="4" :x-gap="12" :y-gap="12" responsive="screen">
                        <n-gi>
                          <label class="field-label">时间粒度</label>
                          <n-select v-model:value="reportMetricFilter.timeGranularity" :options="reportGranularityOptions" />
                        </n-gi>
                        <n-gi>
                          <label class="field-label">开始时间</label>
                          <n-input v-model:value="reportMetricFilter.startTime" placeholder="YYYY-MM-DD" />
                        </n-gi>
                        <n-gi>
                          <label class="field-label">结束时间</label>
                          <n-input v-model:value="reportMetricFilter.endTime" placeholder="YYYY-MM-DD" />
                        </n-gi>
                        <n-gi>
                          <label class="field-label">自定义过滤模板</label>
                          <n-select
                            v-model:value="selectedFilterTemplateId"
                            clearable
                            :options="reportTemplateOptions"
                            placeholder="选择模板"
                            @update:value="(value) => applyReportFilterTemplate(value ? String(value) : null)"
                          />
                        </n-gi>
                      </n-grid>

                      <div class="advanced-filter-list">
                        <div v-for="row in reportFilterRows" :key="row.id" class="advanced-filter-row">
                          <n-select v-model:value="row.fieldType" :options="reportPropertyOptions" />
                          <n-select v-model:value="row.fieldName" filterable :options="reportFieldOptions" />
                          <n-select v-model:value="row.operator" :options="reportOperatorOptions" />
                          <n-input v-model:value="row.value" placeholder="属性值，多个值可用逗号分隔" />
                          <n-button secondary @click="removeReportFilterRow(row.id)">删除</n-button>
                        </div>
                        <div v-if="!reportFilterRows.length" class="condition-pill">
                          暂无属性过滤条件
                        </div>
                      </div>

                      <n-grid :cols="2" :x-gap="12" :y-gap="12" responsive="screen">
                        <n-gi>
                          <label class="field-label">用户分群</label>
                          <n-select
                            v-model:value="cohortFilterIds"
                            multiple
                            clearable
                            :options="reportCohortOptions"
                            placeholder="选择已有用户分群"
                          />
                        </n-gi>
                        <n-gi>
                          <label class="field-label">筛选操作</label>
                          <n-space>
                            <n-button secondary @click="addReportFilterRow">添加过滤条件</n-button>
                            <n-button secondary @click="clearReportAdvancedFilters">清空筛选</n-button>
                            <n-button secondary @click="saveCurrentFilterTemplate">存为模板</n-button>
                            <n-button type="primary" @click="queryReportMetrics">查询</n-button>
                            <n-button secondary @click="resetReportMetricFilters">重置</n-button>
                          </n-space>
                        </n-gi>
                      </n-grid>
                    </div>

                    <div v-if="reportFlexibleScopeRows.length" class="report-panel">
                      <strong>报告生效口径</strong>
                      <div class="advanced-filter-list">
                        <div v-for="row in reportFlexibleScopeRows" :key="`${row.metricName}-${row.propertyName}`" class="condition-pill">
                          {{ row.metricName }} · {{ row.scope }} · {{ row.propertyName }} {{ row.operator }} {{ row.value }} · {{ row.source }}
                        </div>
                      </div>
                    </div>

                    <div class="report-panel">
                      <n-space align="center" justify="space-between">
                        <div>
                          <strong>{{ selectedCoreMetric?.metricName ?? '数据指标' }}</strong>
                          <p class="report-text muted">当前视图：{{ reportMetricViewMode === 'single' ? '单指标分析' : '指标组分析' }}</p>
                        </div>
                        <n-space>
                          <n-button
                            size="small"
                            :type="reportMetricViewMode === 'single' ? 'primary' : 'default'"
                            secondary
                            @click="reportMetricViewMode = 'single'"
                          >
                            单指标视图
                          </n-button>
                          <n-button
                            size="small"
                            :type="reportMetricViewMode === 'group' ? 'primary' : 'default'"
                            secondary
                            @click="reportMetricViewMode = 'group'"
                          >
                            指标组视图
                          </n-button>
                          <n-select
                            v-if="reportMetricViewMode === 'group'"
                            v-model:value="metricDiffDisplay"
                            :options="[
                              { label: '绝对值', value: 'value' },
                              { label: '差异绝对值', value: 'diffAbs' },
                              { label: '差异相对值', value: 'diffRel' },
                            ]"
                            style="width: 136px"
                          />
                          <n-button size="small" secondary @click="downloadTrendData">下载数据</n-button>
                        </n-space>
                      </n-space>

                      <n-table v-if="reportMetricViewMode === 'single'" :bordered="false" :single-line="false" size="small">
                        <thead>
                          <tr>
                            <th><button class="table-sort-button" @click="setMetricSort('version')">实验版本</button></th>
                            <th><button class="table-sort-button" @click="setMetricSort('sampleSize')">进组人数</button></th>
                            <th><button class="table-sort-button" @click="setMetricSort('metricValue')">指标值</button></th>
                            <th>差异绝对值</th>
                            <th><button class="table-sort-button" @click="setMetricSort('diffRel')">差异相对值</button></th>
                            <th><button class="table-sort-button" @click="setMetricSort('pValue')">P-value</button></th>
                            <th>MDE</th>
                            <th>置信区间</th>
                            <th>显著性</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr
                            v-for="result in sortedSelectedMetricRows"
                            :key="result.versionId"
                            :class="{ 'highlight-row': highlightedVersionId === result.versionId }"
                            @click="highlightedVersionId = result.versionId"
                          >
                            <td>{{ reportVersionName(result.versionId) }}</td>
                            <td>{{ formatNumber(result.sampleSize) }}</td>
                            <td>{{ formatMetricValue(result.metricValue) }}</td>
                            <td class="metric-diff-cell" :class="result.significance" @click.stop="selectedCoreMetric && openStatisticCard(selectedCoreMetric, result)">
                              {{ formatMetricValue(result.diffAbs) }}
                            </td>
                            <td class="metric-diff-cell" :class="result.significance" @click.stop="selectedCoreMetric && openStatisticCard(selectedCoreMetric, result)">
                              {{ formatRatio(result.diffRel) }}
                            </td>
                            <td>{{ result.pValue ?? '-' }}</td>
                            <td>{{ formatRatio(result.mde) }}</td>
                            <td>{{ formatConfidenceInterval(result.confidenceInterval) }}</td>
                            <td>
                              <n-tag :type="significanceType(result.significance)" size="small">
                                {{ significanceLabel(result.significance) }}
                              </n-tag>
                            </td>
                          </tr>
                        </tbody>
                      </n-table>

                      <n-table v-else :bordered="false" :single-line="false" size="small">
                        <thead>
                          <tr>
                            <th>实验版本</th>
                            <th v-for="metric in metricResults" :key="metric.metricId">
                              <button class="table-sort-button" @click="setMetricGroupSort(metric.metricId)">
                                {{ metric.metricName }}
                              </button>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr
                            v-for="row in metricGroupRows"
                            :key="row.versionId"
                            :class="{ 'highlight-row': highlightedVersionId === row.versionId }"
                            @click="highlightedVersionId = row.versionId"
                          >
                            <td>{{ reportVersionName(row.versionId) }}</td>
                            <td v-for="cell in row.cells" :key="`${row.versionId}-${cell.metric.metricId}`">
                              <n-tooltip v-if="cell.result">
                                <template #trigger>
                                  <button
                                    class="metric-group-cell"
                                    :class="metricGroupCellClass(cell.result)"
                                    @click.stop="openStatisticCard(cell.metric, cell.result)"
                                  >
                                    {{ metricDisplayValue(cell.result) }}
                                  </button>
                                </template>
                                统计卡片：{{ cell.metric.metricName }} · P-value {{ cell.result.pValue ?? '-' }} · MDE {{ formatRatio(cell.result.mde) }} · 置信区间 {{ formatConfidenceInterval(cell.result.confidenceInterval) }}
                              </n-tooltip>
                              <span v-else>-</span>
                            </td>
                          </tr>
                        </tbody>
                      </n-table>
                    </div>
                  </div>
                </div>
                <div v-if="funnelReport" class="report-panel">
                  <n-space align="center" justify="space-between">
                    <div>
                      <strong>漏斗指标分析</strong>
                      <p class="report-text muted">漏斗按 UV 计算，实验曝光事件作为前置过滤条件。</p>
                    </div>
                    <n-space>
                      <n-button
                        size="small"
                        :type="funnelViewMode === 'list' ? 'primary' : 'default'"
                        secondary
                        @click="funnelViewMode = 'list'"
                      >
                        列表视图
                      </n-button>
                      <n-button
                        size="small"
                        :type="funnelViewMode === 'chart' ? 'primary' : 'default'"
                        secondary
                        @click="funnelViewMode = 'chart'"
                      >
                        漏斗视图
                      </n-button>
                      <n-button size="small" secondary @click="exportFunnelData">下载数据</n-button>
                      <n-button size="small" secondary @click="exportFunnelImage">下载图片</n-button>
                      <n-button size="small" secondary @click="() => refreshReport()">刷新</n-button>
                    </n-space>
                  </n-space>

                  <n-grid :cols="2" :x-gap="12" :y-gap="12" responsive="screen">
                    <n-gi>
                      <label class="field-label">对比版本</label>
                      <n-select v-model:value="selectedFunnelCompareVersionId" :options="funnelVersionOptions" />
                    </n-gi>
                    <n-gi>
                      <label class="field-label">被对比版本</label>
                      <n-select v-model:value="selectedFunnelBaselineVersionId" :options="funnelBaselineOptions" />
                    </n-gi>
                  </n-grid>

                  <n-table v-if="funnelViewMode === 'list'" :bordered="false" :single-line="false" size="small">
                    <thead>
                      <tr>
                        <th>步骤</th>
                        <th>对比版本到达</th>
                        <th>被对比版本到达</th>
                        <th>整体转化率</th>
                        <th>上一步转化率</th>
                        <th>流失人数</th>
                        <th>流失率</th>
                        <th>差异相对值</th>
                        <th>置信区间</th>
                        <th>P-value</th>
                        <th>显著性</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="step in funnelStepRows" :key="step.stepNo">
                        <td>{{ step.stepNo }}. {{ step.stepName }}</td>
                        <td>{{ formatNumber(step.compareReachedUsers) }}</td>
                        <td>{{ step.baselineReachedUsers === null ? '不对比版本' : formatNumber(step.baselineReachedUsers) }}</td>
                        <td>{{ formatRatio(step.overallConversionRate) }}</td>
                        <td>{{ formatRatio(step.previousStepConversionRate) }}</td>
                        <td>{{ formatNumber(step.lostUsers) }}</td>
                        <td>{{ formatRatio(step.lostRate) }}</td>
                        <td>{{ formatRatio(step.diffRel) }}</td>
                        <td>{{ formatConfidenceInterval(step.confidenceInterval) }}</td>
                        <td>{{ step.pValue ?? '-' }}</td>
                        <td>
                          <n-tooltip>
                            <template #trigger>
                              <n-tag :type="significanceType(step.significance)" size="small">
                                {{ selectedFunnelBaselineVersionId === 'none' ? '不计算' : significanceLabel(step.significance) }}
                              </n-tag>
                            </template>
                            当前步骤：{{ step.stepName }} · 对比版本未到达 {{ formatNumber(step.lostUsers) }} · 被对比版本到达 {{ step.baselineReachedUsers === null ? '-' : formatNumber(step.baselineReachedUsers) }}
                          </n-tooltip>
                        </td>
                      </tr>
                    </tbody>
                  </n-table>

                  <div v-else class="funnel-chart">
                    <div v-for="step in funnelStepRows" :key="`chart-${step.stepNo}`" class="funnel-chart-row">
                      <span>{{ step.stepName }}</span>
                      <n-tooltip>
                        <template #trigger>
                          <div class="funnel-layer" :style="{ width: funnelStepWidth(step.compareReachedUsers) }">
                            {{ formatRatio(step.overallConversionRate) }}
                          </div>
                        </template>
                        到达人数 {{ formatNumber(step.compareReachedUsers) }} · 上一步转化 {{ formatRatio(step.previousStepConversionRate) }} · P-value {{ step.pValue ?? '-' }}
                      </n-tooltip>
                      <small>流失 {{ formatNumber(step.lostUsers) }} / {{ formatRatio(step.lostRate) }}</small>
                    </div>
                  </div>
                </div>
              </template>

              <template v-else-if="tab.name === 'advanced'">
                <div class="report-panel">
                  <n-space align="center" justify="space-between">
                    <div>
                      <strong>留存指标分析</strong>
                      <p class="report-text muted">按首次进组日期归因，支持同期群留存趋势与 N 日留存日趋势。</p>
                    </div>
                    <n-space>
                      <n-button
                        size="small"
                        :type="retentionViewMode === 'cohort' ? 'primary' : 'default'"
                        secondary
                        @click="retentionViewMode = 'cohort'"
                      >
                        同期群留存趋势
                      </n-button>
                      <n-button
                        size="small"
                        :type="retentionViewMode === 'nDay' ? 'primary' : 'default'"
                        secondary
                        @click="retentionViewMode = 'nDay'"
                      >
                        N 日留存日趋势
                      </n-button>
                      <n-select v-model:value="selectedRetentionDay" :options="retentionDayOptions" style="width: 140px" />
                      <n-button size="small" secondary @click="downloadTrendData">下载数据</n-button>
                    </n-space>
                  </n-space>

                  <div class="temporary-retention-panel">
                    <aside class="temporary-retention-list">
                      <strong>自定义留存指标</strong>
                      <n-select
                        :value="temporaryRetentionMetricId"
                        clearable
                        filterable
                        :options="retentionMetricOptionsForTemporary"
                        placeholder="选择已创建留存指标"
                        @update:value="(value) => syncTemporaryRetentionMetric(value ? String(value) : null)"
                      />
                      <p class="report-text muted">
                        选择指标后自动带出起始事件、回访事件和口径；也可以直接在右侧临时配置，不保存为指标组。
                      </p>
                    </aside>
                    <div class="temporary-retention-config">
                      <div class="temporary-retention-grid">
                        <div>
                          <label class="field-label">起始事件</label>
                          <n-select v-model:value="temporaryRetentionDraft.startEventId" filterable :options="temporaryRetentionEventOptions" />
                        </div>
                        <div>
                          <label class="field-label">回访事件</label>
                          <n-select v-model:value="temporaryRetentionDraft.returnEventId" filterable :options="temporaryRetentionEventOptions" />
                        </div>
                        <div>
                          <label class="field-label">开始日期</label>
                          <n-input v-model:value="temporaryRetentionDraft.startDate" />
                        </div>
                        <div>
                          <label class="field-label">结束日期</label>
                          <n-input v-model:value="temporaryRetentionDraft.endDate" />
                        </div>
                      </div>
                      <div class="temporary-retention-filter-grid">
                        <MetricFilterBuilder
                          :group="temporaryRetentionDraft.startFilterTree"
                          :property-options="temporaryRetentionFilterPropertyOptions"
                          :operator-options="temporaryRetentionFilterOperatorOptions"
                          title="起始事件过滤条件"
                          @property-change="handleTemporaryRetentionFilterPropertyChange"
                        />
                        <MetricFilterBuilder
                          :group="temporaryRetentionDraft.returnFilterTree"
                          :property-options="temporaryRetentionFilterPropertyOptions"
                          :operator-options="temporaryRetentionFilterOperatorOptions"
                          title="回访事件过滤条件"
                          @property-change="handleTemporaryRetentionFilterPropertyChange"
                        />
                      </div>
                      <div class="temporary-retention-actions">
                        <div>
                          <span>
                            {{
                              selectedTemporaryRetentionMetric
                                ? `已带出指标口径：${selectedTemporaryRetentionMetric.name}`
                                : '临时口径仅用于当前报告查询，不进入指标组列表。'
                            }}
                          </span>
                          <small v-if="temporaryRetentionResult">
                            查询记录：{{ temporaryRetentionResult.id }} · 起始条件 {{ temporaryRetentionResult.summary.startFilterCount }} 条 · 回访条件
                            {{ temporaryRetentionResult.summary.returnFilterCount }} 条
                          </small>
                        </div>
                        <n-button size="small" type="primary" :loading="temporaryRetentionLoading" @click="queryTemporaryRetention">查询</n-button>
                      </div>
                      <n-table v-if="temporaryRetentionResultRows.length" :bordered="false" size="small">
                        <thead>
                          <tr>
                            <th>实验版本</th>
                            <th>新进组用户</th>
                            <th v-for="day in (temporaryRetentionResult?.retentionDays ?? cohortReport?.retentionDays ?? []).slice(0, 8)" :key="day">D{{ day }}</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="row in temporaryRetentionResultRows" :key="`temporary-${row.versionId}`">
                            <td>{{ reportVersionName(row.versionId) }}</td>
                            <td>{{ formatNumber(row.newUsers) }}</td>
                            <td v-for="value in row.values.slice(0, 8)" :key="`${row.versionId}-${value}`">{{ formatRatio(value) }}</td>
                          </tr>
                        </tbody>
                      </n-table>
                    </div>
                  </div>

                  <template v-if="retentionViewMode === 'cohort'">
                    <div class="retention-trend-chart">
                      <div v-for="row in retentionTrendRows" :key="`trend-${row.versionId}`" class="retention-trend-row">
                        <strong>{{ reportVersionName(row.versionId) }}</strong>
                        <div class="retention-points">
                          <n-tooltip v-for="point in row.points" :key="`${row.versionId}-${point.day}`">
                            <template #trigger>
                              <div class="retention-point-wrap">
                                <i
                                  class="retention-point"
                                  :class="point.significance"
                                  :style="{ width: retentionPointWidth(point.value) }"
                                />
                                <small>D{{ point.day }}</small>
                              </div>
                            </template>
                            D{{ point.day }} · 留存率 {{ formatRatio(point.value) }} · 相对涨跌 {{ formatRatio(point.diffRel) }} · 置信区间 {{ formatConfidenceInterval(point.confidenceInterval) }} · P-value {{ point.pValue.toFixed(3) }}
                          </n-tooltip>
                        </div>
                      </div>
                    </div>

                    <n-table :bordered="false" :single-line="false" size="small">
                      <thead>
                        <tr>
                          <th>展开</th>
                          <th>实验版本</th>
                          <th>新进组用户</th>
                          <th>当日</th>
                          <th v-for="day in cohortReport?.retentionDays.filter((item) => item > 0)" :key="day">{{ day }} 天后</th>
                        </tr>
                      </thead>
                      <tbody>
                        <template v-for="row in retentionTrendRows" :key="`${row.versionId}-${row.cohortDate}`">
                          <tr>
                            <td>
                              <n-button size="tiny" secondary @click="toggleRetentionRow(row.versionId, row.cohortDate)">
                                {{ expandedRetentionRows.includes(retentionRowKey(row.versionId, row.cohortDate)) ? '收起' : '展开' }}
                              </n-button>
                            </td>
                            <td>{{ reportVersionName(row.versionId) }}</td>
                            <td>{{ formatNumber(row.newUsers) }}</td>
                            <td v-for="point in row.points" :key="`${row.versionId}-${point.day}`" class="metric-diff-cell" :class="point.significance">
                              <n-tooltip>
                                <template #trigger>
                                  <span>{{ formatRatio(point.value) }}</span>
                                </template>
                                相对对照组 {{ formatRatio(point.diffRel) }} · 置信区间 {{ formatConfidenceInterval(point.confidenceInterval) }}
                              </n-tooltip>
                            </td>
                          </tr>
                          <tr v-if="expandedRetentionRows.includes(retentionRowKey(row.versionId, row.cohortDate))" class="retention-detail-row">
                            <td colspan="10">
                              <div class="retention-detail-grid">
                                <div v-for="daily in retentionDailyTrendRows.filter((item) => item.versionId === row.versionId)" :key="`${row.versionId}-${daily.cohortDate}`">
                                  <strong>{{ daily.cohortDate }}</strong>
                                  <span>新进组 {{ formatNumber(daily.newUsers) }} · D{{ selectedRetentionDay }} {{ daily.available ? formatRatio(daily.value) : '观察窗口未满' }}</span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        </template>
                      </tbody>
                    </n-table>
                  </template>

                  <template v-else>
                    <div v-if="retentionWindowWarning" class="condition-pill danger">
                      {{ retentionWindowWarning }}
                    </div>
                    <div class="retention-daily-chart">
                      <div v-for="row in retentionDailyTrendRows" :key="`${row.versionId}-${row.cohortDate}`" class="retention-daily-card">
                        <span>{{ row.cohortDate }} · {{ reportVersionName(row.versionId) }}</span>
                        <strong>{{ row.available ? formatRatio(row.value) : '-' }}</strong>
                        <small>{{ row.available ? `新进组 ${formatNumber(row.newUsers)}` : `${selectedRetentionDay} 日观察窗口未满` }}</small>
                      </div>
                    </div>
                  </template>

                  <div class="condition-pill">
                    {{ retentionInterpretation }}
                  </div>
                </div>
                <div class="report-panel">
                  <n-space align="center" justify="space-between">
                    <div>
                      <strong>差异分析与群体对比</strong>
                      <p class="report-text muted">配置多个用户群体，判断整体实验结论是否适用于细分人群。</p>
                    </div>
                    <n-space>
                      <n-select
                        v-model:value="differenceMetricId"
                        :options="metricResults.map((metric) => ({ label: metric.metricName, value: metric.metricId }))"
                        style="width: 180px"
                      />
                      <n-select
                        v-model:value="differenceVersionIds"
                        multiple
                        :options="differenceVersionOptions"
                        style="width: 220px"
                      />
                      <n-button secondary @click="addDifferenceGroup">添加群体</n-button>
                      <n-button type="primary" :disabled="Boolean(differenceValidationMessage)" @click="runDifferenceAnalysis">查询</n-button>
                    </n-space>
                  </n-space>

                  <div class="difference-group-grid">
                    <div v-for="group in differenceGroups" :key="group.id" class="difference-group-card">
                      <n-input v-model:value="group.name" placeholder="群体名称，可为空" />
                      <n-select v-model:value="group.field" filterable :options="reportFieldOptions" />
                      <n-select v-model:value="group.operator" :options="reportOperatorOptions" />
                      <n-input v-model:value="group.value" placeholder="群体条件值" />
                      <n-button secondary @click="removeDifferenceGroup(group.id)">删除群体</n-button>
                    </div>
                  </div>
                  <div v-if="differenceValidationMessage" class="condition-pill danger">
                    {{ differenceValidationMessage }}
                  </div>

                  <n-grid :cols="3" :x-gap="12" :y-gap="12" responsive="screen">
                    <n-gi>
                      <div class="difference-summary-card">
                        <span>实验版本适用性</span>
                        <strong>{{ differenceResultRows.filter((row) => row.significance === 'positive').length }} 个正向群体</strong>
                      </div>
                    </n-gi>
                    <n-gi>
                      <div class="difference-summary-card">
                        <span>用户分群适用性</span>
                        <strong>{{ differenceGroups.length }} 个群体</strong>
                      </div>
                    </n-gi>
                    <n-gi>
                      <div class="difference-summary-card">
                        <span>样本不足提示</span>
                        <strong>{{ differenceResultRows.filter((row) => row.significance === 'insufficient').length }} 项</strong>
                      </div>
                    </n-gi>
                  </n-grid>

                  <n-table :bordered="false" :single-line="false" size="small">
                    <thead>
                      <tr>
                        <th>群体名称</th>
                        <th>群体条件</th>
                        <th>实验版本</th>
                        <th>进组人数</th>
                        <th>指标值</th>
                        <th>相对对照组变化</th>
                        <th>P-value</th>
                        <th>置信区间</th>
                        <th>最优策略概率</th>
                        <th>显著性</th>
                        <th>建议</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="row in differenceResultRows" :key="`${row.group.id}-${row.versionId}`">
                        <td>{{ row.group.name || '未命名群体' }}</td>
                        <td>{{ row.group.field }} {{ row.group.operator }} {{ row.group.value }}</td>
                        <td>{{ reportVersionName(row.versionId) }}</td>
                        <td>{{ formatNumber(row.sampleSize) }}</td>
                        <td>{{ formatMetricValue(row.metricValue) }}</td>
                        <td>{{ formatRatio(row.liftRel) }}</td>
                        <td>{{ row.pValue.toFixed(3) }}</td>
                        <td>{{ formatConfidenceInterval(row.confidenceInterval) }}</td>
                        <td>{{ formatRatio(row.bestProbability) }}</td>
                        <td>
                          <n-tag :type="significanceType(row.significance)" size="small">
                            {{ significanceLabel(row.significance) }}
                          </n-tag>
                        </td>
                        <td>{{ row.suggestion }}</td>
                      </tr>
                    </tbody>
                  </n-table>
                </div>
              </template>

              <template v-else-if="tab.name === 'heatmap'">
                <div v-if="heatmapReport" class="report-panel">
                  <n-space align="center" justify="space-between">
                    <div>
                      <strong>点击热力图</strong>
                      <p class="report-text muted">{{ heatmapReport.pageUrl }}</p>
                    </div>
                    <n-space>
                      <n-select v-model:value="selectedHeatmapVersionId" :options="heatmapVersionOptions" style="width: 180px" />
                      <n-button secondary @click="heatmapOverlayVisible = !heatmapOverlayVisible">
                        {{ heatmapOverlayVisible ? '隐藏热力图' : '显示热力图' }}
                      </n-button>
                      <n-button secondary :disabled="heatmapRegions.length >= 5" @click="addHeatmapRegion">新增圈选</n-button>
                      <n-button secondary @click="downloadTrendData">下载数据</n-button>
                    </n-space>
                  </n-space>

                  <div class="heatmap-analysis-grid">
                    <div class="heatmap-page-frame">
                      <div class="heatmap-page-toolbar">
                        <span>{{ reportVersionName(selectedHeatmapVersion?.versionId) }}</span>
                        <strong>点击 {{ formatNumber(selectedHeatmapVersion?.clickCount) }} · 用户 {{ formatNumber(selectedHeatmapVersion?.clickUsers) }}</strong>
                      </div>
                      <div class="heatmap-page-shot" :class="{ interactive: !heatmapOverlayVisible }">
                        <div class="mock-page-header">活动首页</div>
                        <div class="mock-page-hero">领取专属福利</div>
                        <div class="mock-page-card">推荐内容区</div>
                        <div class="mock-page-button">立即领取</div>
                        <template v-if="heatmapOverlayVisible">
                          <n-tooltip v-for="element in heatmapTopElements.slice(0, 8)" :key="element.name">
                            <template #trigger>
                              <i
                                class="heat-spot"
                                :style="{
                                  left: `${12 + (element.clicks % 64)}%`,
                                  top: `${18 + (element.clicks % 58)}%`,
                                  width: `${Math.max(24, element.share * 150)}px`,
                                  height: `${Math.max(24, element.share * 150)}px`,
                                }"
                              />
                            </template>
                            {{ element.name }} · 点击 {{ formatNumber(element.clicks) }} · 点击占比 {{ formatRatio(element.share) }}
                          </n-tooltip>
                          <div
                            v-for="region in heatmapRegions"
                            :key="region.id"
                            class="heatmap-region"
                            :style="{ left: `${region.x}%`, top: `${region.y}%`, width: `${region.width}%`, height: `${region.height}%` }"
                          >
                            <button @click="removeHeatmapRegion(region.id)">×</button>
                            <span>{{ region.name }}</span>
                          </div>
                        </template>
                      </div>
                    </div>

                    <div class="heatmap-side-panel">
                      <strong>区域圈选</strong>
                      <div v-for="region in heatmapRegions" :key="`metrics-${region.id}`" class="snapshot-row">
                        <div>
                          <strong>{{ region.name }}</strong>
                          <span>
                            点击 {{ formatNumber(heatmapRegionMetrics(region).clicks) }} · 人数 {{ formatNumber(heatmapRegionMetrics(region).users) }} · 点击率 {{ formatRatio(heatmapRegionMetrics(region).ctr) }}
                          </span>
                        </div>
                        <n-button size="tiny" secondary @click="removeHeatmapRegion(region.id)">删除</n-button>
                      </div>
                      <div class="condition-pill">
                        覆盖层展示时只能查看页面；隐藏热力图后可操作页面内容。
                      </div>
                    </div>
                  </div>

                  <div class="report-panel nested-panel">
                    <strong>元素热力图 Top 20</strong>
                    <div class="element-heatmap-chart">
                      <div v-for="element in heatmapTopElements" :key="element.name" class="element-heatmap-row">
                        <span>{{ element.name }}</span>
                        <n-tooltip>
                          <template #trigger>
                            <i :style="{ width: `${Math.max(6, element.share * 100)}%` }" />
                          </template>
                          点击 {{ formatNumber(element.clicks) }} · 占比 {{ formatRatio(element.share) }}
                        </n-tooltip>
                        <strong>{{ formatNumber(element.clicks) }}</strong>
                      </div>
                    </div>
                  </div>

                  <div v-for="hint in heatmapAnomalyHints" :key="hint" class="condition-pill danger">
                    {{ hint }}
                  </div>
                </div>
              </template>

              <template v-else-if="tab.name === 'mab'">
                <div v-if="mabReport" class="report-panel mab-workspace">
                  <div class="report-panel-header">
                    <div>
                      <strong>MAB 智能调优报告</strong>
                      <p class="report-text muted">
                        优化指标：{{ mabReport.optimizationMetric }} · 评估流量 {{ formatRatio(mabEvaluationTrafficRatio, 0) }}
                      </p>
                    </div>
                    <n-checkbox v-model:checked="mabHideOffline">隐藏下线版本</n-checkbox>
                  </div>

                  <div class="preview-grid">
                    <div>
                      <span>累计收益提升</span>
                      <strong>{{ formatRatio(mabReport.cumulativeLift) }}</strong>
                      <small>较保留评估流量的累计增益</small>
                    </div>
                    <div>
                      <span>最优版本</span>
                      <strong>{{ mabBestArm?.name ?? '-' }}</strong>
                      <small>P2BA {{ formatRatio(mabBestArm?.p2ba) }} · 指标 {{ formatMetricValue(mabBestArm?.metricValue ?? null) }}</small>
                    </div>
                    <div>
                      <span>进组用户</span>
                      <strong>{{ formatNumber(mabTotalEntryUsers) }}</strong>
                      <small>按当前可见版本汇总</small>
                    </div>
                    <div>
                      <span>调优轮次</span>
                      <strong>{{ mabReport.rounds.length }}</strong>
                      <small>最近 {{ formatDateTime(mabReport.rounds.at(-1)?.optimizedAt) }} 更新</small>
                    </div>
                  </div>

                  <div class="condition-pill danger">
                    {{ mabWinnerWarning }}
                  </div>

                  <div class="mab-report-grid">
                    <div class="report-panel nested-panel">
                      <div class="report-panel-header">
                        <strong>累计收益与收益趋势</strong>
                        <span class="report-text muted">智能调优 vs 评估流量</span>
                      </div>
                      <div class="mab-benefit-chart">
                        <div v-for="row in mabBenefitRows" :key="row.roundNo" class="mab-benefit-row">
                          <span>第 {{ row.roundNo }} 轮</span>
                          <div>
                            <i class="smart" :style="{ width: mabBarWidth(row.cumulativeLift, mabBenefitMax) }" />
                            <small>智能调优 {{ formatRatio(row.cumulativeLift) }} · 累计收益 {{ formatNumber(row.smartRevenue) }}</small>
                          </div>
                          <div>
                            <i class="evaluation" :style="{ width: mabBarWidth(row.evaluationLift, mabBenefitMax) }" />
                            <small>评估流量 {{ formatRatio(row.evaluationLift) }} · 收益 {{ formatNumber(row.evaluationRevenue) }}</small>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="report-panel nested-panel">
                      <div class="report-panel-header">
                        <strong>核心指标明细</strong>
                        <span class="report-text muted">P2BA、后验分布和当前分配</span>
                      </div>
                      <n-table size="small" :bordered="false">
                        <thead>
                          <tr>
                            <th>版本</th>
                            <th>指标</th>
                            <th>进组</th>
                            <th>P2BA</th>
                            <th>95% 分布</th>
                            <th>流量</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="arm in mabCoreRows" :key="arm.armId" :class="{ highlight: arm.armId === mabBestArm?.armId }">
                            <td>{{ arm.name }}</td>
                            <td>{{ formatMetricValue(arm.metricValue) }}</td>
                            <td>{{ formatNumber(arm.entryUsers) }}</td>
                            <td>{{ formatRatio(arm.p2ba) }}</td>
                            <td>{{ formatRatio(arm.distribution[0]) }} ~ {{ formatRatio(arm.distribution[2]) }}</td>
                            <td>
                              <n-progress type="line" :percentage="Math.round(arm.trafficRatio * 100)" :height="8" />
                            </td>
                          </tr>
                        </tbody>
                      </n-table>
                    </div>
                  </div>

                  <div class="mab-report-grid">
                    <div class="report-panel nested-panel">
                      <div class="report-panel-header">
                        <strong>绝对/相对趋势</strong>
                        <n-button-group>
                          <n-button size="small" :type="mabTrendMode === 'absolute' ? 'primary' : 'default'" @click="mabTrendMode = 'absolute'">绝对值</n-button>
                          <n-button size="small" :type="mabTrendMode === 'relative' ? 'primary' : 'default'" @click="mabTrendMode = 'relative'">相对提升</n-button>
                        </n-button-group>
                      </div>
                      <div class="mab-trend-chart">
                        <div v-for="row in mabTrendRows" :key="row.arm.armId" class="mab-trend-row">
                          <strong>{{ row.arm.name }}</strong>
                          <div>
                            <span v-for="point in row.points" :key="`${row.arm.armId}-${point.roundNo}`">
                              <i :style="{ width: mabBarWidth(point.value, mabTrendMax) }" />
                              <small>第{{ point.roundNo }}轮 {{ mabTrendValue(point.value) }}</small>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="report-panel nested-panel">
                      <div class="report-panel-header">
                        <strong>流量分配</strong>
                        <n-button-group>
                          <n-button size="small" :type="mabTrafficView === 'cumulative' ? 'primary' : 'default'" @click="mabTrafficView = 'cumulative'">累计</n-button>
                          <n-button size="small" :type="mabTrafficView === 'actual' ? 'primary' : 'default'" @click="mabTrafficView = 'actual'">实际</n-button>
                          <n-button size="small" :type="mabTrafficView === 'theoretical' ? 'primary' : 'default'" @click="mabTrafficView = 'theoretical'">理论</n-button>
                        </n-button-group>
                      </div>
                      <div class="mab-traffic-chart">
                        <div v-for="row in mabTrafficRows" :key="row.roundNo" class="mab-traffic-row">
                          <span>第 {{ row.roundNo }} 轮</span>
                          <div v-for="cell in row.cells" :key="`${row.roundNo}-${cell.armId}`">
                            <i :style="{ width: mabBarWidth(cell.value, mabTrafficMax) }" />
                            <small>{{ cell.name }} {{ formatRatio(cell.value) }}</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="report-panel nested-panel">
                    <div class="report-panel-header">
                      <div>
                        <strong>非体验一致性参数维度</strong>
                        <p class="report-text muted">MAB 按参数版本拆分收益、分布和流量，避免把动态分流误读为固定版本效果。</p>
                      </div>
                      <n-button-group>
                        <n-button size="small" :type="mabParameterView === 'online' ? 'primary' : 'default'" @click="mabParameterView = 'online'">仅在线</n-button>
                        <n-button size="small" :type="mabParameterView === 'all' ? 'primary' : 'default'" @click="mabParameterView = 'all'">全部参数</n-button>
                      </n-button-group>
                    </div>
                    <div class="mab-parameter-grid">
                      <div v-for="row in mabParameterRows" :key="row.arm.armId" class="mab-parameter-card">
                        <div>
                          <strong>{{ row.arm.name }}</strong>
                          <n-tag :type="row.arm.status === 'online' ? 'success' : 'default'" size="small">
                            {{ row.arm.status === 'online' ? '在线' : '下线' }}
                          </n-tag>
                        </div>
                        <span v-for="param in row.params" :key="`${row.arm.armId}-${param.name}`">{{ param.name }}：{{ param.value }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <n-empty v-else description="暂无 MAB 报告数据" />
              </template>

              <template v-else>
                <div class="report-panel sensitive-workspace">
                  <div class="report-panel-header">
                    <div>
                      <strong>敏感人群洞察</strong>
                      <p class="report-text muted">按指标差异识别高敏感子人群，支持任务创建、终止、配置查看、报告和下载。</p>
                    </div>
                    <n-button type="primary" :disabled="!sensitiveCreateAvailable" @click="openSensitiveCreateModal">创建任务</n-button>
                  </div>

                  <div class="sensitive-gate-grid">
                    <div
                      v-for="requirement in sensitiveCreateRequirements"
                      :key="requirement.label"
                      class="condition-pill"
                      :class="{ danger: !requirement.passed }"
                    >
                      <n-tag :type="requirement.passed ? 'success' : 'warning'" size="small">
                        {{ requirement.passed ? '通过' : '受限' }}
                      </n-tag>
                      <div>
                        <strong>{{ requirement.label }}</strong>
                        <span>{{ requirement.detail }}</span>
                      </div>
                    </div>
                  </div>

                  <n-tabs v-model:value="sensitiveTaskStatusTab" type="segment" animated>
                    <n-tab-pane v-for="statusTab in sensitiveTaskStatusTabs" :key="statusTab.value" :name="statusTab.value" :tab="statusTab.label">
                      <div v-if="filteredSensitiveTasks.length" class="sensitive-list">
                        <div v-for="task in filteredSensitiveTasks" :key="task.id" class="sensitive-task">
                          <div>
                            <strong>{{ task.name }}</strong>
                            <span>
                              {{ sensitiveStatusLabels[task.status] }} · {{ sensitiveStageLabels[task.stage] }} · {{ formatDateTime(task.createdAt) }}
                            </span>
                            <n-progress type="line" :percentage="task.progress" :height="8" />
                          </div>
                          <div class="task-actions compact">
                            <n-button size="small" secondary @click="refreshSensitiveTask(task)">刷新</n-button>
                            <n-button size="small" secondary @click="viewSensitiveTaskConfig(task)">查看配置</n-button>
                            <n-button size="small" secondary :disabled="task.status !== 'running'" @click="terminateSensitiveTask(task)">终止</n-button>
                          </div>
                        </div>
                      </div>
                      <n-empty v-else description="当前状态下暂无任务" />
                    </n-tab-pane>
                  </n-tabs>

                  <div v-if="selectedSensitiveTask" class="report-panel nested-panel">
                    <div class="report-panel-header">
                      <div>
                        <strong>{{ selectedSensitiveTask.name }}</strong>
                        <p class="report-text muted">
                          {{ getMetricName(selectedSensitiveTask.metricId) }} · {{ reportVersionName(selectedSensitiveTask.treatmentVariantId) }} vs
                          {{ reportVersionName(selectedSensitiveTask.controlVariantId) }}
                        </p>
                      </div>
                      <n-button secondary :disabled="!selectedSensitiveTask.result" @click="downloadSensitiveSegment">下载报告</n-button>
                    </div>

                    <div class="sensitive-stage-row">
                      <div v-for="stage in sensitiveTaskStageRows" :key="stage.stage" :class="stage.status">
                        <span>{{ stage.label }}</span>
                      </div>
                    </div>

                    <template v-if="selectedSensitiveTask.result">
                      <div class="preview-grid">
                        <div>
                          <span>是否发现敏感人群</span>
                          <strong>{{ selectedSensitiveTask.result.discovered ? '是' : '否' }}</strong>
                          <small>模型输出阈值已校验</small>
                        </div>
                        <div>
                          <span>敏感用户</span>
                          <strong>{{ formatNumber(selectedSensitiveTask.result.sensitiveUsers) }}</strong>
                          <small>覆盖 {{ formatRatio(selectedSensitiveTask.result.sensitiveUsers / selectedSensitiveTask.result.totalUsers) }}</small>
                        </div>
                        <div>
                          <span>特征数</span>
                          <strong>{{ sensitiveFeatureImportanceRows.length }}</strong>
                          <small>按 SHAP 重要性排序</small>
                        </div>
                      </div>

                      <div class="mab-report-grid">
                        <div class="report-panel nested-panel">
                          <strong>特征重要性</strong>
                          <div class="feature-importance-list">
                            <div v-for="feature in sensitiveFeatureImportanceRows" :key="feature.feature">
                              <span>{{ feature.feature }}</span>
                              <i :style="{ width: `${Math.max(8, feature.score * 100)}%` }" />
                              <strong>{{ formatRatio(feature.contribution) }}</strong>
                            </div>
                          </div>
                        </div>

                        <div class="report-panel nested-panel">
                          <strong>子人群报告</strong>
                          <n-table size="small" :bordered="false">
                            <thead>
                              <tr>
                                <th>子人群</th>
                                <th>人数</th>
                                <th>覆盖</th>
                                <th>相对涨跌</th>
                                <th>P-value</th>
                                <th>动作</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr v-for="segment in sensitiveCrossSegmentRows" :key="segment.condition">
                                <td>{{ segment.condition }}</td>
                                <td>{{ formatNumber(segment.users) }}</td>
                                <td>{{ formatRatio(segment.coverage) }}</td>
                                <td>{{ formatRatio(segment.liftRel) }}</td>
                                <td>{{ segment.pValue }}</td>
                                <td>
                                  <n-button text type="primary" @click="openSensitiveSegment(selectedSensitiveTask, segment.condition)">
                                    查看
                                  </n-button>
                                </td>
                              </tr>
                            </tbody>
                          </n-table>
                        </div>
                      </div>
                    </template>
                    <n-empty v-else description="任务尚未产出完整报告" />
                  </div>
                </div>

                <n-modal v-model:show="sensitiveCreateVisible" preset="card" title="创建敏感人群洞察任务" class="ab-modal-card">
                  <div class="modal-form-grid">
                    <label>
                      <span>任务名称</span>
                      <n-input v-model:value="sensitiveTaskDraft.name" />
                    </label>
                    <label>
                      <span>分析指标</span>
                      <n-select v-model:value="sensitiveTaskDraft.metricId" :options="sensitiveMetricOptions" />
                    </label>
                    <label>
                      <span>实验版本</span>
                      <n-select v-model:value="sensitiveTaskDraft.treatmentVariantId" :options="sensitiveVariantOptions" />
                    </label>
                    <label>
                      <span>对照版本</span>
                      <n-select v-model:value="sensitiveTaskDraft.controlVariantId" :options="sensitiveVariantOptions" />
                    </label>
                    <label>
                      <span>洞察方向</span>
                      <n-select
                        v-model:value="sensitiveTaskDraft.direction"
                        :options="[
                          { label: '正向敏感', value: 'positive' },
                          { label: '负向敏感', value: 'negative' },
                        ]"
                      />
                    </label>
                    <label>
                      <span>分析时间范围</span>
                      <n-input v-model:value="sensitiveTaskDraft.timeRange" />
                    </label>
                    <label class="wide">
                      <span>特征字段</span>
                      <n-select v-model:value="sensitiveTaskDraft.attributeFields" multiple :options="sensitiveAttributeOptions" />
                    </label>
                  </div>
                  <template #footer>
                    <n-space justify="end">
                      <n-button secondary @click="sensitiveCreateVisible = false">取消</n-button>
                      <n-button type="primary" @click="createSensitiveTask">创建</n-button>
                    </n-space>
                  </template>
                </n-modal>

                <n-drawer v-model:show="sensitiveConfigVisible" :width="420">
                  <n-drawer-content title="任务配置">
                    <n-descriptions v-if="selectedSensitiveTask" :column="1" bordered size="small">
                      <n-descriptions-item label="任务">{{ selectedSensitiveTask.name }}</n-descriptions-item>
                      <n-descriptions-item label="指标">{{ getMetricName(selectedSensitiveTask.metricId) }}</n-descriptions-item>
                      <n-descriptions-item label="实验版本">{{ reportVersionName(selectedSensitiveTask.treatmentVariantId) }}</n-descriptions-item>
                      <n-descriptions-item label="对照版本">{{ reportVersionName(selectedSensitiveTask.controlVariantId) }}</n-descriptions-item>
                      <n-descriptions-item label="方向">{{ selectedSensitiveTask.direction === 'positive' ? '正向敏感' : '负向敏感' }}</n-descriptions-item>
                      <n-descriptions-item label="创建时间">{{ formatDateTime(selectedSensitiveTask.createdAt) }}</n-descriptions-item>
                    </n-descriptions>
                  </n-drawer-content>
                </n-drawer>

                <n-drawer v-model:show="sensitiveSegmentVisible" :width="520">
                  <n-drawer-content title="子人群详情">
                    <div v-if="selectedSensitiveSegment" class="segment-detail">
                      <strong>{{ selectedSensitiveSegment.condition }}</strong>
                      <div class="preview-grid">
                        <div>
                          <span>用户数</span>
                          <strong>{{ formatNumber(selectedSensitiveSegment.users) }}</strong>
                        </div>
                        <div>
                          <span>相对涨跌</span>
                          <strong>{{ formatRatio(selectedSensitiveSegment.liftRel) }}</strong>
                        </div>
                        <div>
                          <span>P-value</span>
                          <strong>{{ selectedSensitiveSegment.pValue }}</strong>
                        </div>
                      </div>
                      <p class="report-text muted">该子人群可用于后续定向放量、排除规则或个性化策略配置，下载会携带人群口径和指标结果。</p>
                      <n-button type="primary" @click="downloadSensitiveSegment">下载子人群用户</n-button>
                    </div>
                  </n-drawer-content>
                </n-drawer>
              </template>
            </n-tab-pane>
          </n-tabs>
        </n-card>

        <n-grid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
          <n-gi>
            <n-card title="异常状态" :bordered="false">
              <div class="snapshot-list">
                <div v-for="item in reportQualityStates" :key="item.message" class="snapshot-row">
                  <div>
                    <strong>{{ item.level === 'error' ? '高风险' : item.level === 'warning' ? '需关注' : '正常' }}</strong>
                    <span>{{ item.message }}</span>
                  </div>
                  <n-tag :type="item.level === 'error' ? 'error' : item.level === 'warning' ? 'warning' : 'success'" size="small">
                    {{ item.level }}
                  </n-tag>
                </div>
              </div>
            </n-card>
          </n-gi>
          <n-gi>
            <n-card title="导出任务" :bordered="false">
              <div v-if="reportExportTasks.length" class="snapshot-list">
                <div v-for="task in reportExportTasks.slice(0, 5)" :key="task.id" class="snapshot-row export-task-row">
                  <div>
                    <strong>{{ task.fileName }}</strong>
                    <span>{{ task.reportType }} · {{ formatDateTime(task.updatedAt) }}</span>
                    <small v-if="task.failureReason">{{ task.failureReason }}</small>
                  </div>
                  <div class="task-actions">
                    <n-progress type="line" :percentage="task.progress" :height="8" />
                    <n-space size="small" justify="end">
                      <n-tag :type="exportTaskStatusType(task.status)" size="small">
                        {{ task.status }}
                      </n-tag>
                      <n-button
                        v-if="task.status === 'queued' || task.status === 'running'"
                        size="tiny"
                        secondary
                        @click="cancelReportExportTask(task.id)"
                      >
                        取消
                      </n-button>
                      <n-button
                        v-if="task.status === 'failed' || task.status === 'canceled'"
                        size="tiny"
                        secondary
                        @click="retryReportExportTask(task.id)"
                      >
                        重试
                      </n-button>
                    </n-space>
                  </div>
                </div>
              </div>
              <n-empty v-else description="暂无导出任务" />
            </n-card>
          </n-gi>
        </n-grid>
      </section>

      <section v-else-if="activePage === 'metrics'" class="ab-section-stack">
        <MetricManagementPanel />
      </section>

      <section v-else-if="activePage === 'features'" class="ab-section-stack feature-page">
        <n-card :bordered="false" class="feature-tabs-card">
          <n-tabs :value="activeFeatureSubPage" type="line" @update:value="handleFeatureTabChange">
            <n-tab-pane
              v-for="tab in featureSubPageTabs"
              :key="tab.name"
              :name="tab.name"
              :tab="tab.label"
              :disabled="tab.disabled"
            />
          </n-tabs>
        </n-card>

        <template v-if="featureRouteForbidden">
          <n-card title="无权限访问" :bordered="false">
            <div class="list-block">
              <strong>当前账号无法查看该私有 Feature</strong>
              <span>Feature ID：{{ featureRouteFeatureId }}</span>
              <span>请联系 Owner 添加为协作者，或返回列表查看当前可访问的 Feature。</span>
              <n-space>
                <n-button type="primary" @click="openFeatureSubPage('list')">返回列表</n-button>
                <n-button secondary @click="openFeatureSubPage('permissions', '')">查看权限说明</n-button>
              </n-space>
            </div>
          </n-card>
        </template>

        <template v-else-if="activeFeatureSubPage === 'list'">
          <n-card title="筛选搜索" :bordered="false">
            <n-grid :cols="6" :x-gap="12" :y-gap="12" responsive="screen">
              <n-gi>
                <n-input v-model:value="featureKeyword" placeholder="名称 / Key / 描述" />
              </n-gi>
              <n-gi>
                <n-select v-model:value="featureFilterAppId" clearable :options="featureAppOptions" placeholder="应用" />
              </n-gi>
              <n-gi>
                <n-select v-model:value="featureFilterStatuses" multiple clearable :options="featureStatusOptions" placeholder="开关状态" />
              </n-gi>
              <n-gi>
                <n-select v-model:value="featureFilterPublishStatuses" multiple clearable :options="featurePublishStatusOptions" placeholder="发布状态" />
              </n-gi>
              <n-gi>
                <n-select v-model:value="featureFilterTerminalTypes" multiple clearable :options="featureTerminalOptions" placeholder="终端类型" />
              </n-gi>
              <n-gi>
                <n-select v-model:value="featureFilterTags" multiple clearable :options="featureTagOptions" placeholder="标签" />
              </n-gi>
              <n-gi>
                <n-space>
                  <n-select v-model:value="featureFilterOwnerId" clearable :options="featureOwnerOptions" placeholder="Owner" style="width: 150px" />
                  <n-button type="primary" secondary @click="queryFeatureList">查询</n-button>
                  <n-button secondary @click="resetFeatureFilters">重置</n-button>
                </n-space>
              </n-gi>
            </n-grid>
          </n-card>

          <n-card title="Feature 表格" :bordered="false">
            <template #header-extra>
              <n-space>
                <n-button secondary @click="openFeatureHistory()">发布历史</n-button>
                <n-button type="primary" :disabled="!canOpenCreateFeatureFromList" :title="createFeatureButtonHint" @click="openCreateFeaturePage">+ 创建 Feature</n-button>
              </n-space>
            </template>
            <n-table :bordered="false" size="small">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Key</th>
                  <th>终端</th>
                  <th>应用</th>
                  <th>类型</th>
                  <th>状态</th>
                  <th>生效版本</th>
                  <th>Owner</th>
                  <th>标签</th>
                  <th>最近更新</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="feature in pagedFeatureFlags"
                  :key="feature.featureId"
                  :class="{ selected: selectedFeatureId === feature.featureId }"
                  @click="handleFeatureRowSelect(feature)"
                >
                  <td>
                    <button class="text-link" @click.stop="openFeatureSubPage('detail', feature.featureId)">
                      {{ feature.name }}
                    </button>
                    <small>{{ feature.description }}</small>
                  </td>
                  <td>{{ feature.key }}</td>
                  <td>{{ feature.terminalType === 'client' ? '客户端' : '服务端' }}</td>
                  <td>{{ feature.appId }}</td>
                  <td>{{ feature.featureType === 'public' ? '公共 Feature' : '私有 Feature' }}</td>
                  <td>
                    <n-space size="small">
                      <n-tag :type="feature.status === 'enabled' ? 'success' : 'default'" size="small">
                        {{ featureStatusLabels[feature.status] }}
                      </n-tag>
                      <n-tag size="small">{{ featurePublishStatusLabels[feature.publishStatus] }}</n-tag>
                    </n-space>
                  </td>
                  <td>{{ getFeatureCurrentVersionLabel(feature) }}</td>
                  <td>{{ feature.owners.join('、') }}</td>
                  <td>
                    <n-space size="small">
                      <n-tag v-for="tag in feature.tags.slice(0, 3)" :key="tag" size="small">{{ tag }}</n-tag>
                      <n-tag v-if="feature.tags.length > 3" size="small">+{{ feature.tags.length - 3 }}</n-tag>
                    </n-space>
                  </td>
                  <td>{{ formatDateTime(feature.updatedAt) }}</td>
                  <td>
                    <n-space size="small">
                      <n-button size="tiny" secondary @click.stop="openFeatureSubPage('detail', feature.featureId)">查看</n-button>
                      <n-button
                        size="tiny"
                        secondary
                        :disabled="!canEditFeature(feature)"
                        @click.stop="openFeatureSubPage('versions', feature.featureId)"
                      >
                        编辑
                      </n-button>
                      <n-button
                        size="tiny"
                        secondary
                        :disabled="!canCreateExperimentFromFeature(feature)"
                        @click.stop="createExperimentFromFeature(feature)"
                      >
                        创建实验
                      </n-button>
                      <n-button
                        size="tiny"
                        secondary
                        :disabled="!canOperateFeature(feature, 'create_feature')"
                        @click.stop="openFeatureSubPage('whitelist', feature.featureId)"
                      >
                        白名单
                      </n-button>
                      <n-button
                        size="tiny"
                        secondary
                        :disabled="!canOperateFeature(feature, 'publish_feature') || !getFeaturePublishActionLabel(feature)"
                        @click.stop="openFeaturePublish(feature)"
                      >
                        {{ getFeaturePublishActionLabel(feature) || '发布' }}
                      </n-button>
                      <n-button
                        size="tiny"
                        secondary
                        :disabled="!canOperateFeature(feature, 'manage_feature_permission')"
                        @click.stop="openFeaturePermissionModal(feature)"
                      >
                        权限
                      </n-button>
                      <n-button size="tiny" secondary @click.stop="openFeatureHistory(feature)">历史</n-button>
                      <n-button
                        size="tiny"
                        secondary
                        type="error"
                        :disabled="!canDeleteFeature(feature)"
                        @click.stop="changeFeatureLifecycle('delete', feature)"
                      >
                        删除
                      </n-button>
                    </n-space>
                  </td>
                </tr>
              </tbody>
            </n-table>
            <n-empty v-if="!pagedFeatureFlags.length" description="没有匹配的 Feature" />
            <div class="table-footer">
              <span>共 {{ filteredFeatureFlags.length }} 个 Feature</span>
              <n-pagination v-model:page="featurePage" v-model:page-size="featurePageSize" :item-count="filteredFeatureFlags.length" :page-sizes="[8, 16, 32]" show-size-picker />
            </div>
          </n-card>
        </template>

        <template v-else-if="activeFeatureSubPage === 'create'">
          <div class="feature-create-layout">
            <n-card title="创建 Feature" :bordered="false" class="feature-create-main-card">
              <template #header-extra>
                <n-space size="small">
                  <n-tag size="small">草稿不线上生效</n-tag>
                  <n-tag size="small">发布受众按 if / else 生效</n-tag>
                </n-space>
              </template>
                <div id="feature-create-section-basic" class="feature-form-section">
                  <strong>1. 基本信息</strong>
                  <n-grid :cols="2" :x-gap="12" :y-gap="12" responsive="screen">
                    <n-gi>
                      <label class="field-label">适用 App</label>
                      <n-space align="center">
                        <n-select v-model:value="featureDraft.appId" tag :options="featureAppOptions" placeholder="选择或输入 App" style="width: 260px" />
                        <n-tooltip trigger="hover">
                          <template #trigger>
                            <n-button size="small" secondary>信息</n-button>
                          </template>
                          <div class="list-block compact">
                            <span>App：{{ selectedFeatureAppInfo.appId || '未选择' }}</span>
                            <span>Feature 数：{{ selectedFeatureAppInfo.featureCount }}</span>
                            <span>{{ selectedFeatureAppInfo.permission }}</span>
                          </div>
                        </n-tooltip>
                        <n-button size="small" secondary :disabled="!featureDraft.appId" @click="clearFeatureDraftApp">删除</n-button>
                      </n-space>
                    </n-gi>
                    <n-gi>
                      <label class="field-label">Key 名称</label>
                      <n-input v-model:value="featureDraft.key" placeholder="new_user_gift_switch" @focus="featureCreateHelpKey = 'basic'" @blur="validateFeatureDraft" />
                    </n-gi>
                    <n-gi>
                      <label class="field-label">Feature 名称</label>
                      <n-input v-model:value="featureDraft.name" placeholder="新用户礼包开关" @focus="featureCreateHelpKey = 'basic'" @blur="validateFeatureDraft" />
                    </n-gi>
                    <n-gi>
                      <label class="field-label">终端 / 类型</label>
                      <n-space>
                        <n-select v-model:value="featureDraft.terminalType" :options="featureTerminalOptions" style="width: 140px" />
                        <n-select v-model:value="featureDraft.featureType" :options="featureTypeOptions" style="width: 140px" />
                      </n-space>
                    </n-gi>
                    <n-gi :span="2">
                      <label class="field-label">描述</label>
                      <n-input v-model:value="featureDraft.description" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" />
                    </n-gi>
                    <n-gi :span="2">
                      <label class="field-label">上传配图</label>
                      <div class="feature-image-uploader">
                        <input type="file" accept="image/png,image/jpeg,image/webp" @change="handleFeatureImageUpload" />
                        <n-space v-if="featureDraft.imageUrl" size="small" align="center">
                          <button class="image-preview-button" type="button" @click="openFeatureVariantPreview(featureDraft.imageUrl)">
                            <img :src="featureDraft.imageUrl" alt="Feature 配图预览" />
                          </button>
                          <n-button size="tiny" secondary @click="featureDraft.imageUrl = ''">删除</n-button>
                        </n-space>
                        <small>支持 PNG、JPG/JPEG、WebP，最多 1 张，单张不超过 5MB。</small>
                      </div>
                    </n-gi>
                    <n-gi>
                      <label class="field-label">Owners</label>
                      <n-select
                        :value="featureDraft.owners"
                        multiple
                        filterable
                        :options="featureOwnerSelectOptions"
                        placeholder="搜索用户名 / 邮箱 / 工号"
                        @update:value="updateFeatureDraftOwners"
                      />
                    </n-gi>
                    <n-gi>
                      <label class="field-label">标签</label>
                      <n-select
                        :value="featureDraft.tags"
                        multiple
                        tag
                        filterable
                        clearable
                        :options="featureDraftTagOptions"
                        placeholder="选择或输入标签，最多 10 个"
                        @update:value="updateFeatureDraftTags"
                      />
                    </n-gi>
                  </n-grid>
                </div>

                <n-divider />
                <div id="feature-create-section-variables" class="feature-form-section">
                  <n-space justify="space-between" align="center">
                    <strong>2. 自定义变量</strong>
                    <n-button size="small" secondary @click="addFeatureVariable">添加变量</n-button>
                  </n-space>
                  <div v-for="variable in featureVariableDrafts" :key="variable.id" class="feature-variable-row">
                    <n-input v-model:value="variable.name" size="small" placeholder="变量名称" />
                    <n-input v-model:value="variable.key" size="small" placeholder="变量 Key" />
                    <n-select v-model:value="variable.type" size="small" :options="featureVariableTypeOptions" />
                    <n-input v-model:value="variable.defaultValue" size="small" placeholder="默认值" />
                    <n-input v-model:value="variable.description" size="small" placeholder="描述" />
                    <n-checkbox v-model:checked="variable.required">必传</n-checkbox>
                    <n-button size="tiny" secondary @click="removeFeatureVariable(variable.id)">删除</n-button>
                  </div>
                </div>

                <n-divider />
                <div id="feature-create-section-variants" class="feature-form-section">
                  <n-space justify="space-between" align="center">
                    <strong>3. 设置变体</strong>
                    <n-space>
                      <n-select v-model:value="featureDraft.variantType" :options="featureVariantTypeOptions" style="width: 160px" />
                      <n-button v-if="featureDraft.variantType !== 'boolean'" size="small" secondary @click="addFeatureDraftVariant">添加变体</n-button>
                    </n-space>
                  </n-space>
                  <div v-for="variant in featureDraft.variants" :key="variant.variantId" class="variant-editor-row">
                    <n-input v-model:value="variant.variantId" size="small" placeholder="变体 ID" />
                    <n-input :ref="(element) => setFeatureDraftVariantNameRef(variant.variantId, element)" v-model:value="variant.name" size="small" placeholder="变体名称" />
                    <n-input
                      :value="String(variant.value)"
                      size="small"
                      placeholder="变体值"
                      @update:value="(value) => updateFeatureDraftVariantValue(variant.variantId, value)"
                    />
                    <n-input v-model:value="variant.description" size="small" placeholder="说明" />
                    <div class="variant-image-cell">
                      <input type="file" accept="image/png,image/jpeg,image/webp" @change="(event) => handleFeatureDraftVariantImageUpload(variant.variantId, event)" />
                      <n-space v-if="variant.imageUrl" size="small">
                        <n-button size="tiny" secondary @click="openFeatureVariantPreview(variant.imageUrl)">预览</n-button>
                        <n-button size="tiny" secondary @click="variant.imageUrl = ''">删除</n-button>
                      </n-space>
                    </div>
                    <n-button size="tiny" secondary :disabled="featureDraft.variantType === 'boolean'" @click="removeFeatureDraftVariant(variant.variantId)">删除</n-button>
                  </div>
                  <label class="field-label">else 默认规则</label>
                  <n-select :value="featureDraft.defaultVariantId" :options="featureDraftVariantOptions" placeholder="默认变体" @update:value="updateFeatureDraftDefaultVariant" />
                  <div v-if="featureDraft.variantType !== 'boolean'" class="feature-param-validation">
                    <n-space justify="space-between" align="center">
                      <strong>参数校验</strong>
                      <n-checkbox v-model:checked="featureParamValidation.enabled">开启参数校验</n-checkbox>
                    </n-space>
                    <template v-if="featureParamValidation.enabled">
                      <n-grid v-if="featureDraft.variantType === 'string'" :cols="4" :x-gap="8" :y-gap="8" responsive="screen">
                        <n-gi><n-input-number v-model:value="featureParamValidation.stringMinLength" clearable placeholder="最小长度" style="width: 100%" /></n-gi>
                        <n-gi><n-input-number v-model:value="featureParamValidation.stringMaxLength" clearable placeholder="最大长度" style="width: 100%" /></n-gi>
                        <n-gi><n-input v-model:value="featureParamValidation.stringPattern" placeholder="正则表达式" /></n-gi>
                        <n-gi><n-input v-model:value="featureParamValidation.stringEnums" placeholder="枚举值，逗号分隔" /></n-gi>
                      </n-grid>
                      <n-grid v-else-if="featureDraft.variantType === 'number'" :cols="4" :x-gap="8" :y-gap="8" responsive="screen">
                        <n-gi><n-input-number v-model:value="featureParamValidation.numberMin" clearable placeholder="最小值" style="width: 100%" /></n-gi>
                        <n-gi><n-input-number v-model:value="featureParamValidation.numberMax" clearable placeholder="最大值" style="width: 100%" /></n-gi>
                        <n-gi><n-input-number v-model:value="featureParamValidation.numberDecimalPlaces" :min="0" :max="5" placeholder="小数位" style="width: 100%" /></n-gi>
                        <n-gi><n-checkbox v-model:checked="featureParamValidation.numberAllowNegative">允许负数</n-checkbox></n-gi>
                      </n-grid>
                      <n-grid v-else :cols="3" :x-gap="8" :y-gap="8" responsive="screen">
                        <n-gi><n-input v-model:value="featureParamValidation.jsonRequiredFields" placeholder="必填字段，逗号分隔" /></n-gi>
                        <n-gi><n-input v-model:value="featureParamValidation.jsonFieldTypes" placeholder="字段类型，如 price:number" /></n-gi>
                        <n-gi><n-input v-model:value="featureParamValidation.jsonSchemaText" placeholder="JSON Schema" /></n-gi>
                      </n-grid>
                      <n-space align="center">
                        <n-input v-model:value="featureParamValidation.testValue" placeholder="输入测试值" style="width: 320px" />
                        <n-button secondary @click="testFeatureParameterValidation">测试校验</n-button>
                        <n-tag v-if="featureParamValidation.testResult" :type="featureParamValidation.testResult === '测试校验通过' ? 'success' : 'warning'">
                          {{ featureParamValidation.testResult }}
                        </n-tag>
                      </n-space>
                    </template>
                  </div>
                </div>

                <n-divider />
                <div id="feature-create-section-audience" class="feature-form-section">
                  <n-space justify="space-between" align="center">
                    <strong>4. 发布受众</strong>
                    <n-button size="small" secondary @click="addFeatureAudienceRule">添加受众规则</n-button>
                  </n-space>
                  <div
                    v-for="(rule, ruleIndex) in featureDraft.audienceRules"
                    :key="rule.ruleId"
                    class="feature-audience-rule"
                    :class="{ dragging: draggedFeatureAudienceRuleId === rule.ruleId }"
                    draggable="true"
                    @dragstart="startFeatureAudienceRuleDrag(rule.ruleId)"
                    @dragover.prevent
                    @drop="dropFeatureAudienceRule(rule.ruleId)"
                    @dragend="draggedFeatureAudienceRuleId = null"
                  >
                    <n-space justify="space-between" align="center">
                      <n-space align="center">
                        <n-tag size="small">拖拽排序</n-tag>
                        <n-tag size="small">if</n-tag>
                        <n-input v-model:value="rule.name" size="small" placeholder="规则名称" style="width: 180px" />
                        <n-tag size="small">顺序 {{ rule.order }}</n-tag>
                      </n-space>
                      <n-space size="small">
                        <n-button size="tiny" secondary :disabled="ruleIndex === 0" @click="moveFeatureAudienceRule(rule.ruleId, -1)">上移</n-button>
                        <n-button size="tiny" secondary :disabled="ruleIndex === (featureDraft.audienceRules?.length ?? 0) - 1" @click="moveFeatureAudienceRule(rule.ruleId, 1)">下移</n-button>
                        <n-button size="tiny" secondary @click="addFeatureAudienceCondition(rule)">添加条件</n-button>
                        <n-button size="tiny" secondary type="error" @click="removeFeatureAudienceRule(rule.ruleId)">删除规则</n-button>
                      </n-space>
                    </n-space>
                    <div v-if="!rule.conditions.length" class="validation-list muted-validation">
                      <span>新增规则默认无过滤条件，发布范围为“不下发参数值”。保存前需补充条件。</span>
                    </div>
                    <div v-for="(condition, conditionIndex) in rule.conditions" :key="`${rule.ruleId}_${conditionIndex}`" class="feature-condition-row">
                      <n-select
                        :value="condition.fieldSource"
                        size="small"
                        :options="featureAudienceSourceOptions"
                        @update:value="(value) => updateFeatureAudienceConditionSource(condition, value)"
                      />
                      <n-select v-model:value="condition.fieldName" size="small" filterable :options="featureAudienceFieldOptions(condition.fieldSource)" placeholder="字段" />
                      <n-select
                        :value="condition.operator"
                        size="small"
                        :options="featureAudienceOperatorOptions"
                        @update:value="(value) => updateFeatureAudienceConditionOperator(condition, value)"
                      />
                      <n-input
                        :value="formatFeatureAudienceValue(condition.value)"
                        size="small"
                        placeholder="值，多个用逗号"
                        @update:value="(value) => updateFeatureAudienceConditionValue(condition, value)"
                      />
                      <n-button size="tiny" secondary @click="removeFeatureAudienceCondition(rule, conditionIndex)">删除条件</n-button>
                    </div>
                    <div class="feature-delivery-row">
                      <n-select :value="rule.deliveryType" size="small" :options="featureDeliveryTypeOptions" @update:value="(value) => updateFeatureAudienceRuleDelivery(rule, value)" />
                      <n-select
                        v-if="rule.deliveryType === 'single_variant'"
                        v-model:value="rule.variantId"
                        size="small"
                        :options="featureDraftVariantOptions"
                        placeholder="命中变体"
                      />
                      <div v-else-if="rule.deliveryType === 'multi_variant'" class="feature-weight-grid">
                        <div v-for="variant in featureDraft.variants" :key="variant.variantId" class="feature-weight-row">
                          <span>{{ variant.name }}</span>
                          <n-input-number
                            :value="rule.variantWeights?.find((item) => item.variantId === variant.variantId)?.weight ?? 0"
                            size="small"
                            :min="0"
                            :max="100"
                            @update:value="(value) => updateFeatureAudienceVariantWeight(rule, variant.variantId, value)"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="feature-audience-rule feature-audience-else">
                    <n-space align="center">
                      <n-tag size="small">else</n-tag>
                      <span>默认规则</span>
                    </n-space>
                    <div class="feature-delivery-row">
                      <n-select
                        :value="featureDraft.defaultRule?.deliveryType"
                        size="small"
                        :options="featureDeliveryTypeOptions.filter((option) => option.value !== 'multi_variant')"
                        @update:value="(value) => featureDraft.defaultRule && updateFeatureAudienceRuleDelivery(featureDraft.defaultRule, value)"
                      />
                      <n-select
                        v-if="featureDraft.defaultRule?.deliveryType === 'single_variant'"
                        v-model:value="featureDraft.defaultRule.variantId"
                        size="small"
                        :options="featureDraftVariantOptions"
                        placeholder="默认变体"
                      />
                    </div>
                  </div>
                </div>

                <n-divider />
                <div id="feature-create-section-code" class="feature-form-section">
                  <n-space justify="space-between" align="center">
                    <strong>5. 示例代码</strong>
                    <n-button size="small" secondary @click="copyFeatureCreateCodeSample">复制</n-button>
                  </n-space>
                  <pre class="code-block">{{ featureCreateCodeSample }}</pre>
                </div>

                <div v-if="featureCreateErrors.length" class="validation-list">
                  <span v-for="error in featureCreateErrors" :key="error">{{ error }}</span>
                </div>
                <n-divider />
                <n-space justify="end">
                  <span id="feature-create-section-actions" aria-hidden="true"></span>
                  <n-button secondary @click="openFeatureSubPage('list')">取消</n-button>
                  <n-button secondary @click="createFeatureFlag">保存草稿</n-button>
                  <n-input-number v-model:value="featureCreatePublishTraffic" :min="1" :max="100" style="width: 140px" />
                  <n-button type="primary" @click="createFeatureFlagAndPublish">保存并发布</n-button>
                </n-space>
              </n-card>
              <n-card title="字段说明" :bordered="false" class="feature-create-help-card">
                <div class="list-block">
                  <button
                    v-for="section in featureCreateHelpSections"
                    :key="section.key"
                    type="button"
                    class="help-section-link"
                    :class="{ active: featureCreateHelpKey === section.key }"
                    @click="scrollFeatureCreateSection(section.key)"
                  >
                    {{ section.label }}
                  </button>
                  <strong>{{ activeFeatureCreateHelp.label }}</strong>
                  <span>{{ activeFeatureCreateHelp.description }}</span>
                </div>
              </n-card>
          </div>
        </template>

        <template v-else-if="activeFeatureSubPage === 'detail'">
          <div class="feature-detail-layout">
            <n-card :title="selectedFeature?.name ?? 'Feature 详情'" :bordered="false" class="feature-detail-main-card">
              <template #header-extra>
                <n-space v-if="selectedFeature" size="small">
                  <n-button size="small" secondary :disabled="!canEditFeature(selectedFeature)" @click="openFeatureSubPage('versions')">编辑</n-button>
                  <n-button size="small" secondary :disabled="!canCreateExperimentFromFeature(selectedFeature)" @click="createExperimentFromFeature(selectedFeature)">创建实验</n-button>
                  <n-button size="small" secondary :disabled="!selectedFeatureCanCollaborate" @click="openFeatureSubPage('whitelist')">白名单</n-button>
                  <n-button size="small" type="primary" secondary :disabled="!selectedFeatureCanPublish || !getFeaturePublishActionLabel(selectedFeature)" @click="openFeatureSubPage('publish')">
                    {{ getFeaturePublishActionLabel(selectedFeature) || '发布 / 回滚' }}
                  </n-button>
                  <n-button size="small" secondary :disabled="!selectedFeatureCanManagePermission" @click="openFeaturePermissionModal(selectedFeature)">权限设置</n-button>
                  <n-button size="small" secondary :disabled="!selectedFeatureCanDelete || selectedFeature.status !== 'disabled'" @click="changeFeatureLifecycle('enable')">开启</n-button>
                  <n-button size="small" secondary :disabled="!selectedFeatureCanDelete || selectedFeature.status !== 'enabled'" @click="changeFeatureLifecycle('disable')">关闭</n-button>
                  <n-button size="small" secondary type="error" :disabled="!canDeleteFeature(selectedFeature)" @click="changeFeatureLifecycle('delete')">删除</n-button>
                  <n-button size="small" secondary @click="copyFeatureToCreateDraft(selectedFeature)">复制新建</n-button>
                </n-space>
              </template>

              <template v-if="selectedFeature">
                <div class="feature-kpi-grid">
                  <div>
                    <span>Key</span>
                    <strong>{{ selectedFeature.key }}</strong>
                  </div>
                  <div>
                    <span>当前版本</span>
                    <strong>{{ selectedCurrentFeatureVersion?.versionNo ?? selectedLatestFeatureVersion?.versionNo ?? '-' }}</strong>
                  </div>
                  <div>
                    <span>开关状态</span>
                    <strong>{{ featureStatusLabels[selectedFeature.status] }}</strong>
                  </div>
                  <div>
                    <span>发布状态</span>
                    <strong>{{ featurePublishStatusLabels[selectedFeature.publishStatus] }}</strong>
                  </div>
                </div>
                <n-divider />
                <n-descriptions :column="2" label-placement="left" size="small" bordered>
                  <n-descriptions-item label="Feature 名称">{{ selectedFeature.name }}</n-descriptions-item>
                  <n-descriptions-item label="Key">{{ selectedFeature.key }}</n-descriptions-item>
                  <n-descriptions-item label="应用">{{ selectedFeature.appId }}（已发布后不可直接改范围，跨 App 请复制新建）</n-descriptions-item>
                  <n-descriptions-item label="终端">{{ selectedFeature.terminalType === 'client' ? '客户端' : '服务端' }}</n-descriptions-item>
                  <n-descriptions-item label="类型">{{ selectedFeature.featureType === 'public' ? '公共 Feature' : '私有 Feature' }}</n-descriptions-item>
                  <n-descriptions-item label="当前版本">{{ selectedCurrentFeatureVersion?.versionNo ?? selectedLatestFeatureVersion?.versionNo ?? '-' }}</n-descriptions-item>
                  <n-descriptions-item label="开关">{{ featureStatusLabels[selectedFeature.status] }}</n-descriptions-item>
                  <n-descriptions-item label="发布">{{ featurePublishStatusLabels[selectedFeature.publishStatus] }}</n-descriptions-item>
                  <n-descriptions-item label="权限">{{ selectedFeaturePermission }}</n-descriptions-item>
                  <n-descriptions-item label="Owner">{{ selectedFeature.owners.map(getMemberDisplay).join('、') }}</n-descriptions-item>
                  <n-descriptions-item label="标签">
                    <n-space size="small">
                      <n-tag v-for="tag in selectedFeature.tags" :key="tag" size="small">{{ tag }}</n-tag>
                      <span v-if="!selectedFeature.tags.length">-</span>
                    </n-space>
                  </n-descriptions-item>
                  <n-descriptions-item label="最近更新">{{ formatDateTime(selectedFeature.updatedAt) }}</n-descriptions-item>
                  <n-descriptions-item label="关联实验" :span="2">
                    {{ selectedFeature.relatedExperimentIds.map(getExperimentName).join('、') || '-' }}
                  </n-descriptions-item>
                  <n-descriptions-item label="描述" :span="2">{{ selectedFeature.description }}</n-descriptions-item>
                </n-descriptions>
                <n-divider />
                <div class="feature-entry-grid">
                  <n-button secondary @click="openFeatureSubPage('versions')">版本列表</n-button>
                  <n-button secondary @click="openFeatureSubPage('versions')">发布受众</n-button>
                  <n-button secondary @click="openFeatureSubPage('code')">嵌入代码</n-button>
                  <n-button secondary @click="openFeatureSubPage('whitelist')">白名单</n-button>
                  <n-button secondary @click="openFeatureSubPage('lifecycle')">生命周期</n-button>
                  <n-button secondary @click="openFeatureSubPage('permissions')">权限</n-button>
                  <n-button secondary @click="openFeatureSubPage('logs')">操作日志</n-button>
                </div>
              </template>
              <n-empty v-else description="请选择 Feature" />
            </n-card>

            <div class="feature-detail-grid">
              <n-card title="当前版本" :bordered="false" class="feature-fixed-card">
                <div v-if="selectedFeatureVersionForAction" class="feature-version-summary">
                  <div>
                    <strong>{{ selectedFeatureVersionForAction.versionNo }}</strong>
                    <n-tag size="small">{{ featurePublishStatusLabels[selectedFeatureVersionForAction.versionStatus] }}</n-tag>
                  </div>
                  <span>{{ selectedFeatureVersionForAction.variantType }} · 发布流量 {{ formatPercent(selectedFeatureVersionForAction.publishTraffic) }}</span>
                  <div class="feature-mini-list">
                    <div v-for="variant in selectedFeatureVersionForAction.variants" :key="variant.variantId" class="condition-pill">
                      <strong>{{ variant.name }}</strong>
                      <span>{{ formatFeatureVariantValue(variant.value) }}</span>
                    </div>
                  </div>
                  <div class="feature-mini-list">
                    <strong>发布受众</strong>
                    <div v-for="rule in selectedFeatureVersionForAction.audienceRules" :key="rule.ruleId" class="condition-pill">
                      <span>{{ rule.name }}：{{ describeAudienceConditions(rule) }}；{{ describeAudienceDelivery(rule, selectedFeatureVersionForAction) }}</span>
                    </div>
                    <div class="condition-pill">
                      <span>else：{{ describeAudienceDelivery(selectedFeatureVersionForAction.defaultRule, selectedFeatureVersionForAction) }}</span>
                    </div>
                  </div>
                </div>
                <n-empty v-else description="暂无版本" />
              </n-card>

              <n-card title="清理提示" :bordered="false" class="feature-fixed-card">
                <div class="feature-mini-list">
                  <div v-for="hint in featureCleanupHints" :key="hint" class="condition-pill">
                    <span>{{ hint }}</span>
                  </div>
                </div>
              </n-card>

              <n-card title="最近操作" :bordered="false" class="feature-fixed-card feature-detail-wide-card">
                <div v-if="selectedFeatureLogs.length" class="feature-mini-list">
                  <div v-for="log in selectedFeatureLogs.slice(0, 5)" :key="log.id" class="snapshot-row">
                    <div>
                      <strong>{{ formatFeatureLogAction(log.action) }}</strong>
                      <span>{{ log.operatorName }} · {{ formatDateTime(log.createdAt) }}</span>
                    </div>
                    <n-tag size="small">{{ formatFeatureLogStatus(log) }}</n-tag>
                  </div>
                </div>
                <n-empty v-else description="暂无操作日志" />
              </n-card>
            </div>
          </div>
        </template>

        <template v-else-if="activeFeatureSubPage === 'versions'">
          <div class="feature-version-workspace">
            <n-card title="版本列表" :bordered="false" class="feature-version-list-card">
              <template #header-extra>
                <n-button size="small" type="primary" secondary :disabled="!selectedFeatureCanPublish" @click="openFeatureSubPage('publish')">去发布</n-button>
              </template>
              <div class="feature-version-list feature-scroll-list">
                <button
                  v-for="version in selectedFeatureVersions"
                  :key="version.versionId"
                  class="version-card link-card"
                  :class="{ selected: featurePublishDraft.versionId === version.versionId }"
                  @click="syncPublishDraftVersion(version.versionId)"
                >
                  <div>
                    <strong>{{ version.versionNo }}</strong>
                    <span>{{ featurePublishStatusLabels[version.versionStatus] }} · {{ version.variantType }}</span>
                    <small>创建人 {{ getMemberDisplay(version.createdBy) }} · {{ formatDateTime(version.createdAt) }}</small>
                    <small>{{ formatFeatureVersionVariantSummary(version) }}</small>
                  </div>
                  <n-space vertical size="small" align="end">
                    <n-tag>{{ formatPercent(version.publishTraffic) }}</n-tag>
                    <n-tag v-if="isFeatureVersionCurrent(version)" type="success" size="small">当前生效</n-tag>
                  </n-space>
                </button>
                <n-empty v-if="!selectedFeatureVersions.length" description="暂无版本" />
              </div>
            </n-card>

            <n-card title="版本详情与编辑" :bordered="false" class="feature-version-editor-card">
              <div class="feature-scroll-list">
                <div v-if="selectedFeatureVersionForAction" class="mini-section">
                  <n-space justify="space-between" align="center">
                    <strong>版本详情</strong>
                    <n-space size="small">
                      <n-button size="small" secondary :disabled="!selectedFeatureVersionCanEdit" @click="cloneFeatureVersionToDraft">编辑为新版本</n-button>
                      <n-button size="small" type="primary" secondary :disabled="!selectedFeatureCanPublish || !canPublishSelectedFeatureVersion" @click="openFeatureSubPage('publish')">发布</n-button>
                      <n-button size="small" secondary :disabled="!selectedFeatureCanPublish || !canRollbackSelectedFeature" @click="rollbackSelectedFeature">回滚</n-button>
                      <n-button size="small" secondary type="warning" :disabled="!canDisableSelectedFeatureVersion" @click="disableSelectedFeatureVersion">禁用</n-button>
                      <n-button size="small" secondary @click="focusFeatureVersionDiff">查看差异</n-button>
                    </n-space>
                  </n-space>
                  <n-descriptions :column="3" size="small" bordered>
                    <n-descriptions-item label="版本号">{{ selectedFeatureVersionForAction.versionNo }}</n-descriptions-item>
                    <n-descriptions-item label="状态">{{ featurePublishStatusLabels[selectedFeatureVersionForAction.versionStatus] }}</n-descriptions-item>
                    <n-descriptions-item label="是否当前生效">{{ isFeatureVersionCurrent(selectedFeatureVersionForAction) ? '是' : '否' }}</n-descriptions-item>
                    <n-descriptions-item label="创建人">{{ getMemberDisplay(selectedFeatureVersionForAction.createdBy) }}</n-descriptions-item>
                    <n-descriptions-item label="创建时间">{{ formatDateTime(selectedFeatureVersionForAction.createdAt) }}</n-descriptions-item>
                    <n-descriptions-item label="发布流量">{{ formatPercent(selectedFeatureVersionForAction.publishTraffic) }}</n-descriptions-item>
                    <n-descriptions-item label="变体类型">{{ optionLabel(featureVariantTypeOptions, selectedFeatureVersionForAction.variantType) }}</n-descriptions-item>
                    <n-descriptions-item label="版本说明" :span="2">
                      未发布版本不影响线上；禁用版本不可编辑、不可发布、不可恢复。
                    </n-descriptions-item>
                  </n-descriptions>

                  <n-table :bordered="false" size="small">
                    <thead>
                      <tr>
                        <th>变体</th>
                        <th>值</th>
                        <th>描述</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="variant in selectedFeatureVersionForAction.variants" :key="variant.variantId">
                        <td>{{ variant.name }}</td>
                        <td><code>{{ formatFeatureVariantValue(variant.value) }}</code></td>
                        <td>{{ variant.description || '-' }}</td>
                      </tr>
                    </tbody>
                  </n-table>

                  <div class="feature-mini-list">
                    <strong>发布受众</strong>
                    <div v-for="rule in selectedFeatureVersionForAction.audienceRules" :key="rule.ruleId" class="condition-pill">
                      <span>{{ rule.name }} · {{ describeAudienceConditions(rule) }} · {{ describeAudienceDelivery(rule, selectedFeatureVersionForAction) }}</span>
                    </div>
                    <div class="condition-pill">
                      <span>else 默认规则 · {{ describeAudienceDelivery(selectedFeatureVersionForAction.defaultRule, selectedFeatureVersionForAction) }}</span>
                    </div>
                  </div>

                  <div class="feature-mini-list">
                    <n-space justify="space-between" align="center">
                      <strong>代码示例</strong>
                      <n-button size="small" secondary @click="copySelectedFeatureVersionCodeSnippet">复制</n-button>
                    </n-space>
                    <pre class="code-block compact-code">{{ selectedFeatureVersionCodeSnippet }}</pre>
                  </div>
                </div>

                <div class="mini-section">
                  <strong>变体配置</strong>
                  <n-select v-model:value="featureVersionDraft.variantType" :options="featureVariantTypeOptions" disabled />
                  <div v-for="variant in featureVersionDraft.variants" :key="variant.variantId" class="variant-editor-row">
                    <n-input v-model:value="variant.variantId" size="small" :disabled="!selectedFeatureVersionCanEdit" />
                    <n-input v-model:value="variant.name" size="small" :disabled="!selectedFeatureVersionCanEdit" />
                    <n-input :value="String(variant.value)" size="small" :disabled="!selectedFeatureVersionCanEdit" @update:value="(value) => updateFeatureVersionVariantValue(variant.variantId, value)" />
                    <n-input v-model:value="variant.description" size="small" :disabled="!selectedFeatureVersionCanEdit" />
                    <div class="variant-image-cell">
                      <input type="file" accept="image/png,image/jpeg,image/webp" :disabled="!selectedFeatureVersionCanEdit" @change="(event) => handleFeatureVersionVariantImageUpload(variant.variantId, event)" />
                      <n-space v-if="variant.imageUrl" size="small">
                        <n-button size="tiny" secondary @click="openFeatureVariantPreview(variant.imageUrl)">预览</n-button>
                        <n-button size="tiny" secondary :disabled="!selectedFeatureVersionCanEdit" @click="variant.imageUrl = ''">删除</n-button>
                      </n-space>
                    </div>
                    <n-button size="tiny" secondary :disabled="!selectedFeatureVersionCanEdit || featureVersionDraft.variantType === 'boolean'" @click="removeFeatureVersionVariant(variant.variantId)">删除</n-button>
                  </div>
                  <n-space>
                    <n-button size="small" secondary :disabled="!selectedFeatureVersionCanEdit || featureVersionDraft.variantType === 'boolean'" @click="addFeatureVersionVariant">添加变体</n-button>
                    <n-button size="small" secondary :disabled="!selectedFeatureVersionCanEdit" @click="cloneFeatureVersionToDraft">编辑为新版本</n-button>
                    <n-button size="small" type="primary" secondary :disabled="!selectedFeatureVersionCanEdit" @click="createFeatureVersion">创建版本</n-button>
                  </n-space>
                </div>

                <div class="mini-section">
                  <strong>受众规则</strong>
                  <div class="feature-version-rule-grid">
                    <n-input v-model:value="featureVersionRuleName" :disabled="!selectedFeatureVersionCanEdit" placeholder="受众规则名称" />
                    <n-input v-model:value="featureVersionRuleFieldName" :disabled="!selectedFeatureVersionCanEdit" placeholder="字段" />
                    <n-input v-model:value="featureVersionRuleValueText" :disabled="!selectedFeatureVersionCanEdit" placeholder="值，多个用逗号" />
                    <n-select v-model:value="featureVersionRuleVariantId" :disabled="!selectedFeatureVersionCanEdit" :options="featureVersionVariantOptions" placeholder="命中变体" />
                  </div>
                </div>

                <div id="feature-version-diff-panel" class="mini-section">
                  <strong>版本差异</strong>
                  <n-space align="center">
                    <span>对比基准</span>
                    <n-select v-model:value="featureVersionDiffBaseId" clearable :options="selectedFeatureVersions.map((version) => ({ label: `${version.versionNo} · ${featurePublishStatusLabels[version.versionStatus]}`, value: version.versionId }))" style="width: 220px" />
                  </n-space>
                  <n-table :bordered="false" size="small">
                    <thead>
                      <tr>
                        <th>字段</th>
                        <th>旧值</th>
                        <th>新值</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="row in selectedFeatureVersionDiffRows" :key="row.key">
                        <td>{{ row.field }}</td>
                        <td><code>{{ row.before }}</code></td>
                        <td><code>{{ row.after }}</code></td>
                      </tr>
                    </tbody>
                  </n-table>
                  <n-empty v-if="!selectedFeatureVersionDiffRows.length" description="暂无版本差异" />
                </div>
              </div>
            </n-card>
          </div>
        </template>

        <template v-else-if="activeFeatureSubPage === 'code'">
          <n-card title="嵌入代码" :bordered="false" class="feature-code-card">
            <template #header-extra>
              <n-space v-if="selectedFeature" size="small">
                <n-tag size="small">{{ selectedFeature.terminalType }}</n-tag>
                <n-tag size="small">{{ selectedCurrentFeatureVersion?.versionNo ?? selectedLatestFeatureVersion?.versionNo ?? '未发布' }}</n-tag>
              </n-space>
            </template>
            <div v-if="selectedFeature" class="feature-code-layout">
              <div>
                <pre class="code-block">{{ selectedFeatureCodeSnippet }}</pre>
                <n-button secondary @click="copySelectedFeatureCodeSnippet">复制代码</n-button>
              </div>
              <div class="feature-code-notes">
                <strong>接入说明</strong>
                <span>Runtime 优先级：白名单测试 > A/B 实验 > Feature Flag > 本地默认值。</span>
                <span>客户端和服务端读取同一 Key，但上下文参数应保持稳定。</span>
                <span>发布或回滚只改变线上决策，不需要重新发版。</span>
              </div>
            </div>
            <n-empty v-else description="请选择 Feature" />
          </n-card>
        </template>

        <template v-else-if="activeFeatureSubPage === 'publish'">
          <n-grid :cols="2" :x-gap="16" :y-gap="16" responsive="screen" class="feature-dual-grid">
            <n-gi>
              <n-card title="发布 / 回滚侧边页" :bordered="false" class="feature-fixed-tall-card">
                <n-space vertical size="large">
                  <div class="mini-section">
                    <strong>1. 确认发布信息</strong>
                    <n-descriptions v-if="selectedFeature" :column="2" size="small" bordered>
                      <n-descriptions-item v-for="row in featurePublishConfirmRows" :key="row.label" :label="row.label">
                        {{ row.value }}
                      </n-descriptions-item>
                      <n-descriptions-item label="当前线上版本">
                        {{ selectedCurrentFeatureVersion?.versionNo ?? '-' }}
                      </n-descriptions-item>
                      <n-descriptions-item label="待操作版本状态">
                        {{ selectedFeatureVersionForAction ? featurePublishStatusLabels[selectedFeatureVersionForAction.versionStatus] : '-' }}
                      </n-descriptions-item>
                    </n-descriptions>
                    <n-empty v-else description="请选择 Feature" />
                    <div class="plan-card">
                      <strong>版本差异</strong>
                      <n-table v-if="selectedFeatureVersionDiffRows.length" :bordered="false" size="small">
                        <thead>
                          <tr>
                            <th>差异字段</th>
                            <th>旧值</th>
                            <th>新值</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="row in selectedFeatureVersionDiffRows" :key="row.key">
                            <td>{{ row.field }}</td>
                            <td><code>{{ row.before }}</code></td>
                            <td><code>{{ row.after }}</code></td>
                          </tr>
                        </tbody>
                      </n-table>
                      <span v-else>暂无版本差异</span>
                    </div>
                  </div>

                  <div class="mini-section">
                    <strong>2. 配置发布方案</strong>
                    <n-grid :cols="2" :x-gap="12" :y-gap="12" responsive="screen">
                      <n-gi>
                        <label class="field-label">待发布版本</label>
                        <n-select :value="featurePublishDraft.versionId" :options="featureVersionOptions" placeholder="选择版本" @update:value="syncPublishDraftVersion" />
                      </n-gi>
                      <n-gi>
                        <label class="field-label">发布方案</label>
                        <n-select :value="featurePublishDraft.publishType" :options="publishTypeOptions" @update:value="updateFeaturePublishType" />
                      </n-gi>
                      <n-gi>
                        <label class="field-label">初始发布流量 / 目标流量</label>
                        <n-input-number v-model:value="featurePublishDraft.publishTraffic" :min="1" :max="100" style="width: 100%" />
                      </n-gi>
                      <n-gi>
                        <label class="field-label">发布确认</label>
                        <n-checkbox :checked="publishPlanConfirmationEnabled" @update:checked="updatePublishPlanConfirmationEnabled">提交前二次确认</n-checkbox>
                      </n-gi>
                    </n-grid>
                    <div v-if="featurePublishDraft.publishType === 'manual'" class="plan-card">
                      <strong>手动发布</strong>
                      <span>初始发布流量为 {{ formatPercent(featurePublishDraft.publishTraffic) }}；100% 进入已全量，小于 100% 进入灰度中。</span>
                    </div>
                    <div v-else class="mini-section">
                      <n-grid :cols="3" :x-gap="8" :y-gap="8" responsive="screen">
                        <n-gi>
                          <label class="field-label">首次发布时间</label>
                          <n-input v-model:value="featurePublishDraft.scheduledAt" placeholder="必须晚于当前时间" />
                        </n-gi>
                        <n-gi>
                          <label class="field-label">发布频率（小时）</label>
                          <n-input-number v-model:value="publishPlanFrequencyHours" :min="1" :max="168" style="width: 100%" />
                        </n-gi>
                        <n-gi>
                          <label class="field-label">每次增加流量</label>
                          <n-input-number v-model:value="publishPlanStepTraffic" :min="1" :max="100" style="width: 100%" />
                        </n-gi>
                      </n-grid>
                      <n-button secondary :disabled="!selectedFeatureCanPublish" @click="generateFeaturePublishPlan">一键设置发布计划</n-button>
                      <div v-if="featurePublishDraft.scheduleSteps?.length" class="plan-card">
                        <strong>发布计划列表</strong>
                        <span v-for="step in featurePublishDraft.scheduleSteps" :key="step.stepNo">
                          Step {{ step.stepNo }} · {{ formatDateTime(step.publishTime) }} · {{ formatPercent(step.traffic) }}
                        </span>
                        <small>最后一条计划流量等于目标流量 {{ formatPercent(featurePublishDraft.publishTraffic) }}。</small>
                      </div>
                    </div>
                    <n-space align="center">
                      <n-checkbox :checked="publishPlanRollbackEnabled" @update:checked="updatePublishPlanRollbackEnabled">是否定时下线</n-checkbox>
                      <n-input v-if="publishPlanRollbackEnabled" v-model:value="featurePublishDraft.rollbackAt" placeholder="定时下线时间" style="width: 260px" />
                    </n-space>
                    <div class="validation-list">
                      <span>开启定时下线后到时自动回滚；无上一个全量版本时关闭 Feature 并使用本地默认值。</span>
                      <span>已回滚、已禁用、已取消发布版本不可直接发布。</span>
                    </div>
                  </div>

                  <div class="mini-section">
                    <strong>3. 确认并提交</strong>
                    <n-input v-model:value="featurePublishDraft.description" type="textarea" :autosize="{ minRows: 2, maxRows: 3 }" placeholder="发布描述，必填且进入发布历史和操作日志" />
                    <n-space>
                      <n-button type="primary" :disabled="!selectedFeatureCanPublish || !canPublishSelectedFeatureVersion" @click="requestPublishSelectedFeatureVersion">确认发布</n-button>
                      <n-button secondary :disabled="!selectedFeatureCanPublish || !canRollbackSelectedFeature" @click="rollbackSelectedFeature">回滚 Feature</n-button>
                      <n-button secondary type="warning" :disabled="!selectedFeatureCanPublish || !canCancelSelectedPublish" @click="cancelSelectedFeaturePublish">取消发布</n-button>
                    </n-space>
                    <div class="validation-list">
                      <span>提交发布会校验发布描述、发布方案和发布计划，并弹出二次确认。</span>
                      <span>回滚优先恢复上一个已全量版本；无历史全量版本时关闭 Feature。</span>
                    </div>
                  </div>
                </n-space>
              </n-card>
            </n-gi>
            <n-gi>
              <n-card title="发布计划" :bordered="false" class="feature-fixed-tall-card">
                <div v-for="plan in selectedPublishPlans" :key="plan.publishId" class="plan-card">
                  <strong>{{ plan.description }}</strong>
                  <span v-for="step in plan.steps" :key="step.stepNo">
                    Step {{ step.stepNo }} · {{ formatDateTime(step.publishTime) }} · {{ formatPercent(step.traffic) }}
                  </span>
                </div>
                <n-empty v-if="!selectedPublishPlans.length" description="暂无发布计划" />
              </n-card>
            </n-gi>
          </n-grid>
        </template>

        <template v-else-if="activeFeatureSubPage === 'whitelist'">
          <n-grid :cols="2" :x-gap="16" :y-gap="16" responsive="screen" class="feature-dual-grid">
            <n-gi>
              <n-card title="新建白名单" :bordered="false" class="feature-fixed-tall-card">
                <n-space vertical>
                  <div class="validation-list warning-validation">
                    <span>白名单无需发布即可生效，优先级高于 A/B 实验和 Feature。</span>
                    <span>提交成功后状态为生效中，预计 1 分钟内生效；到期或终止后 Runtime 不再使用该配置。</span>
                  </div>
                  <n-input v-model:value="whitelistDraft.name" placeholder="白名单名称" />
                  <n-select v-model:value="whitelistDraft.versionMode" :options="whitelistModeOptions" placeholder="测试版本类型" />
                  <n-select
                    v-if="whitelistDraft.versionMode !== 'custom'"
                    v-model:value="whitelistDraft.versionId"
                    :options="featureVersionOptions"
                    placeholder="选择已有 Feature 版本"
                  />
                  <div v-else class="plan-card">
                    <strong>自定义变体</strong>
                    <span>将使用右侧“新建版本”区域中的变体和受众规则作为本次白名单测试配置。</span>
                    <small>{{ featureVersionDraft.variants.map((variant) => `${variant.name}:${JSON.stringify(variant.value)}`).join(' / ') }}</small>
                  </div>
                  <n-input v-model:value="whitelistDraft.expiresAt" placeholder="失效时间，最多 7 天" />
                  <div class="whitelist-rule-list">
                    <strong>规则与白名单用户</strong>
                    <div v-for="option in whitelistRuleOptions" :key="option.value" class="whitelist-rule-row">
                      <n-checkbox
                        :checked="Object.prototype.hasOwnProperty.call(whitelistDraft.ruleUserIds, option.value)"
                        @update:checked="(checked) => setWhitelistRuleEnabled(option.value, Boolean(checked))"
                      />
                      <span>{{ option.label }}</span>
                      <n-input
                        :value="getWhitelistRuleUserText(option.value)"
                        size="small"
                        placeholder="用户 ID，逗号分隔，同一测试内不可重复"
                        @update:value="(value) => updateWhitelistRuleUsers(option.value, value)"
                      />
                    </div>
                    <small>每条启用规则至少配置 1 个白名单用户；同一测试内用户不能重复出现在多个规则。</small>
                  </div>
                  <n-button type="primary" block :disabled="!selectedFeatureCanCollaborate" @click="createWhitelistTest">提交测试</n-button>
                </n-space>
              </n-card>
            </n-gi>
            <n-gi>
              <n-card title="白名单列表" :bordered="false" class="feature-fixed-tall-card">
                <n-space align="center">
                  <n-input v-model:value="whitelistKeyword" placeholder="按名称、创建人、用户搜索" />
                  <n-select v-model:value="whitelistStatusFilter" :options="whitelistStatusOptions" style="width: 140px" />
                  <n-button secondary @click="refreshWhitelistTests">刷新</n-button>
                </n-space>
                <n-divider />
                <n-table v-if="filteredSelectedWhitelistTests.length" :bordered="false" size="small">
                  <thead>
                    <tr>
                      <th>名称</th>
                      <th>版本模式</th>
                      <th>版本</th>
                      <th>状态</th>
                      <th>失效时间</th>
                      <th>创建人</th>
                      <th>创建时间</th>
                      <th>规则 / 用户</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="test in filteredSelectedWhitelistTests" :key="test.id">
                      <td>{{ test.name }}</td>
                      <td>{{ getWhitelistModeLabel(test) }}</td>
                      <td>{{ getWhitelistVersionLabel(test) }}</td>
                      <td>
                        <n-tag :type="getWhitelistStatusType(test.status)" size="small">{{ getWhitelistStatusLabel(test.status) }}</n-tag>
                      </td>
                      <td>{{ formatDateTime(test.expiresAt) }}</td>
                      <td>{{ getMemberDisplay(test.createdBy) }}</td>
                      <td>{{ formatDateTime(test.createdAt) }}</td>
                      <td><small>{{ formatWhitelistRuleUsers(test) }}</small></td>
                      <td>
                        <n-space size="small">
                          <n-button size="tiny" secondary @click="copyWhitelistToDraft(test)">复制到表单</n-button>
                          <n-button size="tiny" secondary :disabled="!selectedFeatureCanCollaborate" @click="copyWhitelistTest(test.id)">复制</n-button>
                          <n-button size="tiny" secondary :disabled="!selectedFeatureCanCollaborate || test.status !== 'active'" @click="terminateWhitelistTest(test.id)">终止</n-button>
                          <n-button size="tiny" secondary type="error" :disabled="!selectedFeatureCanCollaborate" @click="deleteWhitelistTest(test.id)">删除</n-button>
                        </n-space>
                      </td>
                    </tr>
                  </tbody>
                </n-table>
                <n-empty v-if="!filteredSelectedWhitelistTests.length" description="暂无白名单测试" />
              </n-card>
            </n-gi>
          </n-grid>
        </template>

        <template v-else-if="activeFeatureSubPage === 'solidify'">
          <n-card title="实验固化三步流程" :bordered="false">
            <n-steps :current="solidifyStep">
              <n-step title="选择全量组" />
              <n-step title="确认 Feature 信息" />
              <n-step title="进入发布流程" />
            </n-steps>
            <n-divider />
            <div v-if="solidifyStep === 1" class="mini-section">
              <n-select :value="featureSolidifyDraft.experimentId" :options="solidifiableExperimentOptions" placeholder="选择实验" @update:value="syncSolidifyExperiment" />
              <n-descriptions v-if="solidifyExperiment" :column="2" size="small" bordered>
                <n-descriptions-item label="实验名称">{{ solidifyExperiment.name }}</n-descriptions-item>
                <n-descriptions-item label="实验 ID">{{ solidifyExperiment.id }}</n-descriptions-item>
                <n-descriptions-item label="状态">{{ statusLabels[solidifyExperiment.status] }}</n-descriptions-item>
                <n-descriptions-item label="参数 Key">{{ solidifyParamKeys.join('、') || '-' }}</n-descriptions-item>
                <n-descriptions-item label="推荐优胜组">{{ solidifyWinnerVariant?.name ?? '请选择胜出组' }}</n-descriptions-item>
                <n-descriptions-item label="固化类型">{{ optionLabel(featureVariantTypeOptions, solidifyGeneratedVariantType) }}</n-descriptions-item>
              </n-descriptions>
              <div v-if="solidifyExperimentConflict" class="validation-list">
                <span>{{ solidifyExperimentConflict }}</span>
                <span>Runtime 优先级：白名单测试 > A/B 实验 > Feature Flag > 本地默认值。</span>
              </div>
              <div class="plan-card">
                <strong>指标结论与优胜组</strong>
                <span v-for="row in solidifyMetricConclusionRows" :key="row">{{ row }}</span>
              </div>
              <n-table :bordered="false" size="small">
                <thead>
                  <tr>
                    <th>实验分组</th>
                    <th>分组配置</th>
                    <th>当前实验流量</th>
                    <th>固化比例</th>
                    <th>胜出组</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="variant in planningBundle?.variants ?? []" :key="variant.id">
                    <td>{{ variant.name }}</td>
                    <td><code>{{ formatSolidifyVariantValue(variant) }}</code></td>
                    <td>{{ formatPercent(variant.trafficRatio) }}</td>
                    <td>
                      <n-input-number :value="getSolidifyVariantTraffic(variant.id)" :min="0" :max="100" @update:value="(value) => updateSolidifyVariantTraffic(variant.id, value)" />
                    </td>
                    <td>
                      <n-checkbox :checked="featureSolidifyDraft.winnerVariantId === variant.id" @update:checked="() => featureSolidifyDraft.winnerVariantId = variant.id" />
                    </td>
                  </tr>
                </tbody>
              </n-table>
              <small>固化比例合计：{{ formatPercent(solidifyRolloutTotal) }}</small>
            </div>
            <div v-else-if="solidifyStep === 2" class="mini-section">
              <n-grid :cols="2" :x-gap="12" :y-gap="12" responsive="screen">
                <n-gi>
                  <label class="field-label">Feature Key</label>
                  <n-input v-model:value="featureSolidifyDraft.featureKey" placeholder="Feature Key" />
                </n-gi>
                <n-gi>
                  <label class="field-label">Feature 名称</label>
                  <n-input v-model:value="featureSolidifyDraft.featureName" placeholder="Feature 名称" />
                </n-gi>
                <n-gi>
                  <label class="field-label">适用 App</label>
                  <n-select v-model:value="featureSolidifyDraft.appId" :options="featureAppOptions" placeholder="适用 App" />
                </n-gi>
                <n-gi>
                  <label class="field-label">终端类型</label>
                  <n-select v-model:value="featureSolidifyDraft.terminalType" :options="featureTerminalOptions" />
                </n-gi>
                <n-gi>
                  <label class="field-label">Feature 类型</label>
                  <n-select v-model:value="featureSolidifyDraft.featureType" :options="featureTypeOptions" />
                </n-gi>
                <n-gi>
                  <label class="field-label">Owners</label>
                  <n-select v-model:value="featureSolidifyDraft.ownerIds" multiple filterable :options="featureOwnerSelectOptions" placeholder="选择 Owner" />
                </n-gi>
                <n-gi>
                  <label class="field-label">标签</label>
                  <n-select v-model:value="featureSolidifyDraft.tags" multiple tag filterable :options="featureTagOptions" placeholder="选择或输入标签" />
                </n-gi>
                <n-gi>
                  <label class="field-label">描述</label>
                  <n-input v-model:value="featureSolidifyDraft.description" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" placeholder="Feature 描述" />
                </n-gi>
              </n-grid>
              <div v-if="solidifyExistingFeatureWarning" class="validation-list">
                <span>{{ solidifyExistingFeatureWarning }}</span>
              </div>
              <n-table :bordered="false" size="small">
                <thead>
                  <tr>
                    <th>来源分组</th>
                    <th>固化变体名称</th>
                    <th>参数值</th>
                    <th>变体描述</th>
                    <th>比例</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="variant in solidifySelectedVariants" :key="variant.id">
                    <td>{{ variant.name }}</td>
                    <td>
                      <n-input
                        :value="getSolidifyVariantOverrideValue(variant.id, 'name')"
                        placeholder="变体名称"
                        @update:value="(value) => updateSolidifyVariantOverride(variant.id, 'name', value)"
                      />
                    </td>
                    <td><code>{{ formatSolidifyVariantValue(variant) }}</code></td>
                    <td>
                      <n-input
                        :value="getSolidifyVariantOverrideValue(variant.id, 'description')"
                        placeholder="变体描述"
                        @update:value="(value) => updateSolidifyVariantOverride(variant.id, 'description', value)"
                      />
                    </td>
                    <td>{{ formatPercent(getSolidifyVariantTraffic(variant.id)) }}</td>
                  </tr>
                </tbody>
              </n-table>
              <p class="card-desc">固化会生成未发布 Feature 版本，不会直接影响线上；发布流量将在下一步配置。</p>
            </div>
            <div v-else class="mini-section">
              <n-descriptions :column="2" size="small" bordered>
                <n-descriptions-item label="Feature">{{ featureSolidifyDraft.featureName }}</n-descriptions-item>
                <n-descriptions-item label="Key">{{ featureSolidifyDraft.featureKey }}</n-descriptions-item>
                <n-descriptions-item label="App">{{ featureSolidifyDraft.appId }}</n-descriptions-item>
                <n-descriptions-item label="Owner">{{ featureSolidifyDraft.ownerIds?.join('、') }}</n-descriptions-item>
                <n-descriptions-item label="变体类型">{{ optionLabel(featureVariantTypeOptions, solidifyGeneratedVariantType) }}</n-descriptions-item>
                <n-descriptions-item label="固化分组">{{ solidifySelectedVariants.map((variant) => variant.name).join('、') }}</n-descriptions-item>
              </n-descriptions>
              <n-input-number v-model:value="featureSolidifyDraft.rolloutTraffic" :min="1" :max="100" style="width: 240px" />
              <p class="card-desc">生成 Feature 后会自动跳转到发布 / 回滚页，由发布流程控制线上生效。</p>
            </div>
            <n-divider />
            <n-space justify="end">
              <n-button secondary :disabled="solidifyStep === 1" @click="solidifyStep = Math.max(1, solidifyStep - 1)">上一步</n-button>
              <n-button v-if="solidifyStep < 3" type="primary" @click="nextSolidifyStep">下一步</n-button>
              <n-button v-else type="primary" @click="solidifyExperimentToFeature">生成未发布 Feature 版本</n-button>
            </n-space>
          </n-card>
        </template>

        <template v-else-if="activeFeatureSubPage === 'history'">
          <n-card title="发布历史" :bordered="false">
            <div class="validation-list muted-validation">
              <span>发布历史用于全局查看 Feature 发布、回滚、取消发布、关闭等线上变更操作，历史记录不可删除。</span>
            </div>
            <n-divider />
            <n-grid :cols="6" :x-gap="12" :y-gap="12" responsive="screen">
              <n-gi>
                <label class="field-label">名称 / Key</label>
                <n-input v-model:value="featureHistoryKeyword" placeholder="Feature 名称、Key、操作人" />
              </n-gi>
              <n-gi>
                <label class="field-label">应用</label>
                <n-select v-model:value="featureHistoryAppIdFilter" clearable :options="featureAppOptions" placeholder="应用" />
              </n-gi>
              <n-gi>
                <label class="field-label">发布状态</label>
                <n-select v-model:value="featureHistoryStatusFilter" :options="featureHistoryStatusOptions" />
              </n-gi>
              <n-gi>
                <label class="field-label">标签</label>
                <n-select v-model:value="featureHistoryTagFilter" multiple clearable :options="featureTagOptions" placeholder="标签" />
              </n-gi>
              <n-gi>
                <label class="field-label">开始时间</label>
                <n-input v-model:value="featureHistoryStartTime" placeholder="YYYY-MM-DD 或完整时间" />
              </n-gi>
              <n-gi>
                <label class="field-label">结束时间</label>
                <n-input v-model:value="featureHistoryEndTime" placeholder="YYYY-MM-DD 或完整时间" />
              </n-gi>
              <n-gi>
                <label class="field-label">操作人</label>
                <n-select v-model:value="featureHistoryOperatorFilter" clearable :options="featureHistoryOperatorOptions" placeholder="操作人" />
              </n-gi>
              <n-gi>
                <label class="field-label">操作类型</label>
                <n-select v-model:value="featureHistoryActionFilter" :options="featureHistoryActionOptions" />
              </n-gi>
              <n-gi>
                <label class="field-label">筛选操作</label>
                <n-space>
                  <n-button type="primary" @click="queryFeatureHistory">查询</n-button>
                  <n-button secondary @click="resetFeatureHistoryFilters">重置</n-button>
                  <n-button secondary @click="refreshFeatureDomain">刷新</n-button>
                </n-space>
              </n-gi>
            </n-grid>
            <n-divider />
            <n-table :bordered="false" size="small">
              <thead>
                <tr>
                  <th>Feature 名称</th>
                  <th>Key</th>
                  <th>App</th>
                  <th>版本号</th>
                  <th>发布类型</th>
                  <th>发布状态</th>
                  <th>发布流量</th>
                  <th>操作人</th>
                  <th>操作时间</th>
                  <th>发布描述</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="log in filteredFeaturePublishHistoryRows" :key="log.id">
                  <td>{{ getFeatureFromLog(log)?.name ?? log.objectId }}</td>
                  <td><code>{{ getFeatureFromLog(log)?.key ?? '-' }}</code></td>
                  <td>{{ getFeatureFromLog(log)?.appId ?? '-' }}</td>
                  <td>{{ getFeatureHistoryVersionNo(log) }}</td>
                  <td>{{ getFeatureHistoryPublishType(log) }}</td>
                  <td>{{ formatFeatureLogStatus(log) }}</td>
                  <td>{{ getFeatureHistoryTraffic(log) }}</td>
                  <td>{{ log.operatorName }}</td>
                  <td>{{ formatDateTime(log.createdAt) }}</td>
                  <td>{{ getFeatureHistoryDescription(log) }}</td>
                  <td>
                    <n-space size="small">
                      <n-button size="tiny" secondary @click="openFeatureLogDetail(log)">查看详情</n-button>
                      <n-button size="tiny" secondary @click="jumpToFeatureFromLog(log)">跳转 Feature</n-button>
                    </n-space>
                  </td>
                </tr>
              </tbody>
            </n-table>
            <n-empty v-if="!filteredFeaturePublishHistoryRows.length" description="暂无匹配的发布历史" />
          </n-card>
        </template>

        <template v-else-if="activeFeatureSubPage === 'lifecycle'">
          <n-space vertical>
            <n-card title="生命周期提示卡片" :bordered="false">
              <n-grid :cols="4" :x-gap="12" :y-gap="12" responsive="screen">
                <n-gi v-for="row in featureLifecyclePromptRows" :key="row.rule">
                  <div class="lifecycle-prompt-card">
                    <n-tag :type="row.type" size="small">{{ row.status }}</n-tag>
                    <strong>{{ row.rule }}</strong>
                    <span>{{ row.detail }}</span>
                  </div>
                </n-gi>
              </n-grid>
              <n-empty v-if="!featureLifecyclePromptRows.length" description="请选择 Feature" />
            </n-card>

            <n-card title="时间范围筛选" :bordered="false">
              <n-grid :cols="5" :x-gap="12" :y-gap="12" responsive="screen">
                <n-gi>
                  <label class="field-label">开始时间</label>
                  <n-input v-model:value="featureLifecycleStartTime" placeholder="YYYY-MM-DD 或完整时间" />
                </n-gi>
                <n-gi>
                  <label class="field-label">结束时间</label>
                  <n-input v-model:value="featureLifecycleEndTime" placeholder="YYYY-MM-DD 或完整时间" />
                </n-gi>
                <n-gi>
                  <label class="field-label">操作类型</label>
                  <n-select v-model:value="featureLifecycleActionFilter" :options="featureLifecycleActionOptions" />
                </n-gi>
                <n-gi>
                  <label class="field-label">操作人</label>
                  <n-select v-model:value="featureLifecycleOperatorFilter" clearable :options="featureLifecycleOperatorOptions" placeholder="操作人" />
                </n-gi>
                <n-gi>
                  <label class="field-label">筛选操作</label>
                  <n-space>
                    <n-button type="primary" @click="queryFeatureLifecycle">查询</n-button>
                    <n-button secondary @click="resetFeatureLifecycleFilters">重置</n-button>
                  </n-space>
                </n-gi>
              </n-grid>
            </n-card>

            <n-grid :cols="2" :x-gap="16" :y-gap="16" responsive="screen" class="feature-card-grid">
              <n-gi>
                <n-card title="重点操作 Timeline" :bordered="false" class="feature-medium-card lifecycle-card">
                  <n-timeline>
                    <n-timeline-item v-for="item in selectedFeatureLifecycleItems" :key="item.id" :title="item.actionLabel" :time="formatDateTime(item.createdAt)">
                      <div class="lifecycle-timeline-row">
                        <span>{{ item.operatorName }} · {{ item.description }}</span>
                        <small>版本：{{ item.versionLabel }} · 关联实验：{{ item.experimentLabel }}</small>
                      </div>
                    </n-timeline-item>
                  </n-timeline>
                  <n-empty v-if="!selectedFeatureLifecycleItems.length" description="暂无匹配的生命周期记录" />
                </n-card>
              </n-gi>
              <n-gi>
                <n-card title="使用趋势" :bordered="false" class="feature-medium-card lifecycle-card">
                  <n-space justify="space-between" align="center">
                    <n-button-group>
                      <n-button size="small" :type="featureLifecycleMetricMode === 'requests' ? 'primary' : 'default'" @click="featureLifecycleMetricMode = 'requests'">请求次数</n-button>
                      <n-button size="small" :type="featureLifecycleMetricMode === 'users' ? 'primary' : 'default'" @click="featureLifecycleMetricMode = 'users'">命中人数</n-button>
                    </n-button-group>
                    <n-button size="small" secondary @click="downloadFeatureLifecycleData">
                      <template #icon><n-icon><DownloadOutline /></n-icon></template>
                      下载数据
                    </n-button>
                  </n-space>
                  <div v-if="featureLifecycleTrendSeries.length" class="lifecycle-chart">
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                      <polyline
                        v-for="series in featureLifecycleTrendSeries"
                        :key="series.variantId"
                        :points="series.polyline"
                        :stroke="series.color"
                        fill="none"
                        stroke-width="2"
                        vector-effect="non-scaling-stroke"
                      />
                    </svg>
                    <template v-for="series in featureLifecycleTrendSeries" :key="`${series.variantId}_points`">
                      <n-tooltip v-for="point in series.points" :key="`${series.variantId}_${point.date}`">
                        <template #trigger>
                          <span
                            class="lifecycle-chart-point"
                            :style="{ left: `${point.x}%`, top: `${point.y}%`, backgroundColor: series.color }"
                          />
                        </template>
                        <span>{{ point.date }} · {{ series.name }} · 请求次数 {{ formatNumber(point.requestCount) }} · 命中人数 {{ formatNumber(point.hitUsers) }}</span>
                      </n-tooltip>
                    </template>
                  </div>
                  <div class="trend-legend">
                    <span
                      v-for="series in featureLifecycleTrendSeries"
                      :key="series.variantId"
                      class="trend-legend-item"
                      :style="{ '--legend-color': series.color }"
                    >
                      {{ series.name }}
                    </span>
                  </div>
                  <n-empty v-if="!featureLifecycleTrendSeries.length" description="请选择 Feature" />
                </n-card>
              </n-gi>
              <n-gi>
                <n-card title="变体使用占比" :bordered="false" class="feature-medium-card lifecycle-card">
                  <div class="lifecycle-summary-grid">
                    <div>
                      <span>总请求次数</span>
                      <strong>{{ formatNumber(featureVariantUsageSummary.totalRequests) }}</strong>
                    </div>
                    <div>
                      <span>不下发参数值占比</span>
                      <strong>{{ formatPercent(featureVariantUsageSummary.noValueRatio, 1) }}</strong>
                    </div>
                    <div>
                      <span>本地默认值占比</span>
                      <strong>{{ formatPercent(featureVariantUsageSummary.localDefaultRatio, 1) }}</strong>
                    </div>
                  </div>
                  <n-table v-if="featureVariantUsageRows.length" :bordered="false" size="small">
                    <thead>
                      <tr>
                        <th>变体</th>
                        <th>请求次数</th>
                        <th>占比</th>
                        <th>命中人数</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="variant in featureVariantUsageRows" :key="variant.variantId">
                        <td>{{ variant.name }}</td>
                        <td>{{ formatNumber(variant.requestCount) }}</td>
                        <td>{{ formatPercent(variant.ratio, 1) }}</td>
                        <td>{{ formatNumber(variant.sampleUsers) }}</td>
                      </tr>
                    </tbody>
                  </n-table>
                  <n-empty v-if="!featureVariantUsageRows.length" description="暂无变体占比" />
                </n-card>
              </n-gi>
              <n-gi>
                <n-card title="最近一次变更" :bordered="false" class="feature-medium-card lifecycle-card">
                  <n-table v-if="featureRecentChangeRows.length" :bordered="false" size="small">
                    <thead>
                      <tr>
                        <th>变体</th>
                        <th>当前值</th>
                        <th>最近一次变更时间</th>
                        <th>最近一次使用时间</th>
                        <th>最近一次使用量</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="row in featureRecentChangeRows" :key="row.variantId">
                        <td>{{ row.name }}</td>
                        <td><code>{{ row.value }}</code></td>
                        <td>{{ formatDateTime(row.lastChangedAt) }}</td>
                        <td>{{ row.lastUsedAt }}</td>
                        <td>{{ formatNumber(row.lastUsage) }}</td>
                      </tr>
                    </tbody>
                  </n-table>
                  <div class="validation-list">
                    <span>最近一次变更：{{ selectedFeature ? formatDateTime(selectedFeature.updatedAt) : '-' }}</span>
                    <span>版本数：{{ selectedFeatureVersions.length }}</span>
                    <span>当前发布流量：{{ formatPercent(selectedCurrentFeatureVersion?.publishTraffic ?? 0) }}</span>
                    <span v-for="hint in featureCleanupHints" :key="hint">{{ hint }}</span>
                  </div>
                </n-card>
              </n-gi>
            </n-grid>
          </n-space>
        </template>

        <template v-else-if="activeFeatureSubPage === 'permissions'">
          <n-space vertical size="large">
            <n-card title="权限管理" :bordered="false">
              <n-descriptions v-if="selectedFeature" :column="2" bordered size="small">
                <n-descriptions-item label="Feature">{{ selectedFeature.name }}</n-descriptions-item>
                <n-descriptions-item label="当前权限">{{ featurePermissionCurrentLevelLabel }}</n-descriptions-item>
                <n-descriptions-item label="Feature 类型">
                  <n-space align="center">
                    <n-tag>{{ selectedFeature.featureType === 'public' ? '公开' : '私有' }}</n-tag>
                    <n-button size="small" secondary :disabled="!selectedFeatureCanManagePermission" @click="openFeaturePermissionModal(selectedFeature)">打开权限管理</n-button>
                  </n-space>
                </n-descriptions-item>
                <n-descriptions-item label="当前权限说明">
                  {{ selectedFeature.featureType === 'public' ? '公共 Feature 对普通用户可见；写操作仍需要协作者权限。' : '私有 Feature 仅集团管理员、应用管理员、创建者和 Owner 可见。' }}
                </n-descriptions-item>
                <n-descriptions-item label="默认类型">
                  新创建 Feature 默认为公开 Feature。
                </n-descriptions-item>
                <n-descriptions-item label="访问拦截">
                  无权限用户直接访问私有 Feature URL 时展示无权限页面。
                </n-descriptions-item>
              </n-descriptions>
              <n-empty v-else description="请选择 Feature" />
            </n-card>

            <n-card title="权限层级" :bordered="false">
              <n-table :bordered="false" :single-line="false" size="small">
                <thead>
                  <tr>
                    <th>权限</th>
                    <th>覆盖范围</th>
                    <th>边界</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in featurePermissionScopeRows" :key="row.name">
                    <td><strong>{{ row.name }}</strong></td>
                    <td>{{ row.content }}</td>
                    <td>{{ row.boundary }}</td>
                  </tr>
                </tbody>
              </n-table>
            </n-card>

            <n-card title="预置角色" :bordered="false">
              <n-table :bordered="false" :single-line="false" size="small">
                <thead>
                  <tr>
                    <th>角色</th>
                    <th>公共 Feature</th>
                    <th>私有 Feature</th>
                    <th>说明</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in featurePermissionRoleRows" :key="row.role">
                    <td><strong>{{ row.role }}</strong></td>
                    <td>{{ row.publicFeature }}</td>
                    <td>{{ row.privateFeature }}</td>
                    <td>{{ row.note }}</td>
                  </tr>
                </tbody>
              </n-table>
            </n-card>

            <n-card title="当前 Feature 操作能力" :bordered="false">
              <n-table v-if="selectedFeature" :bordered="false" :single-line="false" size="small">
                <thead>
                  <tr>
                    <th>操作</th>
                    <th>状态</th>
                    <th>说明</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in featurePermissionActionRows" :key="row.action">
                    <td>{{ row.action }}</td>
                    <td>
                      <n-tag :type="row.allowed ? 'success' : 'warning'" size="small">
                        {{ row.allowed ? '可用' : '不可用' }}
                      </n-tag>
                    </td>
                    <td>{{ row.note }}</td>
                  </tr>
                </tbody>
              </n-table>
              <n-empty v-else description="请选择 Feature" />
            </n-card>
          </n-space>
        </template>

        <template v-else-if="activeFeatureSubPage === 'logs'">
          <n-space vertical size="large">
            <n-card title="操作日志" :bordered="false">
              <template #header-extra>
                <n-space v-if="selectedFeature" size="small">
                  <n-button secondary size="small" @click="openFeatureSubPage('detail')">Feature 详情</n-button>
                  <n-button secondary size="small" @click="refreshFeatureDomain">刷新</n-button>
                </n-space>
              </template>
              <n-descriptions v-if="selectedFeature" :column="3" bordered size="small">
                <n-descriptions-item label="Feature">{{ selectedFeature.name }}</n-descriptions-item>
                <n-descriptions-item label="Key">{{ selectedFeature.key }}</n-descriptions-item>
                <n-descriptions-item label="App">{{ selectedFeature.appId }}</n-descriptions-item>
                <n-descriptions-item label="当前版本">{{ formatFeatureVersionRef(selectedFeature.currentVersionId) }}</n-descriptions-item>
                <n-descriptions-item label="日志范围">
                  单个 Feature 的创建、编辑、发布、回滚、关闭、开启、权限和白名单操作记录
                </n-descriptions-item>
                <n-descriptions-item label="保留规则">删除 Feature 后已产生的操作日志保留</n-descriptions-item>
              </n-descriptions>
              <n-empty v-else description="请选择 Feature" />
            </n-card>

            <n-card title="筛选搜索" :bordered="false">
              <n-grid :cols="6" :x-gap="12" :y-gap="12" responsive="screen">
                <n-gi>
                  <label class="field-label">关键词</label>
                  <n-input v-model:value="featureLogKeyword" placeholder="操作、对象、操作人、内容" />
                </n-gi>
                <n-gi>
                  <label class="field-label">操作类型</label>
                  <n-select v-model:value="featureLogActionFilter" :options="featureLogActionOptions" />
                </n-gi>
                <n-gi>
                  <label class="field-label">操作人</label>
                  <n-select v-model:value="featureLogOperatorFilter" clearable :options="featureLogOperatorOptions" placeholder="操作人" />
                </n-gi>
                <n-gi>
                  <label class="field-label">开始时间</label>
                  <n-input v-model:value="featureLogStartTime" placeholder="YYYY-MM-DD 或完整时间" />
                </n-gi>
                <n-gi>
                  <label class="field-label">结束时间</label>
                  <n-input v-model:value="featureLogEndTime" placeholder="YYYY-MM-DD 或完整时间" />
                </n-gi>
                <n-gi>
                  <label class="field-label">筛选操作</label>
                  <n-space>
                    <n-button type="primary" @click="queryFeatureLogs">查询</n-button>
                    <n-button secondary @click="resetFeatureLogFilters">重置</n-button>
                  </n-space>
                </n-gi>
              </n-grid>
            </n-card>

            <n-card title="操作记录" :bordered="false">
              <n-table v-if="filteredSelectedFeatureLogs.length" :bordered="false" :single-line="false" size="small">
                <thead>
                  <tr>
                    <th>操作类型</th>
                    <th>操作对象</th>
                    <th>对象 ID</th>
                    <th>关联版本</th>
                    <th>操作人</th>
                    <th>操作时间</th>
                    <th>结果</th>
                    <th>操作说明</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="log in filteredSelectedFeatureLogs" :key="log.id">
                    <td>{{ formatFeatureLogAction(log.action) }}</td>
                    <td>{{ formatFeatureLogObjectType(log.objectType) }} · {{ getFeatureLogObjectLabel(log) }}</td>
                    <td><code>{{ log.objectId }}</code></td>
                    <td>{{ getFeatureHistoryAfterVersion(log) }}</td>
                    <td>{{ log.operatorName }}</td>
                    <td>{{ formatDateTime(log.createdAt) }}</td>
                    <td>
                      <n-tag size="small">{{ getFeatureLogResultLabel(log) }}</n-tag>
                    </td>
                    <td>{{ getFeatureHistoryDescription(log) }}</td>
                    <td>
                      <n-button size="tiny" secondary @click="openFeatureLogDetail(log)">打开详情</n-button>
                    </td>
                  </tr>
                </tbody>
              </n-table>
              <n-empty v-else description="暂无操作日志" />
            </n-card>
          </n-space>
        </template>
      </section>

      <section v-if="false" class="ab-section-stack">
        <n-grid :cols="4" :x-gap="16" :y-gap="16" responsive="screen">
          <n-gi>
            <n-card title="Feature 列表" :bordered="false">
              <div class="feature-list">
                <button
                  v-for="feature in featureFlags"
                  :key="feature.featureId"
                  class="feature-row"
                  :class="{ selected: selectedFeatureId === feature.featureId }"
                  @click="selectedFeatureId = feature.featureId"
                >
                  <strong>{{ feature.name }}</strong>
                  <span>{{ feature.key }}</span>
                  <n-tag :type="feature.status === 'enabled' ? 'success' : 'default'" size="small">
                    {{ feature.publishStatus }}
                  </n-tag>
                </button>
              </div>
              <n-divider />
              <div class="mini-section">
                <strong>新建 Feature</strong>
                <n-input v-model:value="featureDraft.key" placeholder="Feature Key" />
                <n-input v-model:value="featureDraft.name" placeholder="名称" />
                <n-input v-model:value="featureDraft.description" type="textarea" :autosize="{ minRows: 2, maxRows: 3 }" />
                <n-grid :cols="2" :x-gap="8">
                  <n-gi>
                    <n-select v-model:value="featureDraft.terminalType" :options="featureTerminalOptions" />
                  </n-gi>
                  <n-gi>
                    <n-select v-model:value="featureDraft.featureType" :options="featureTypeOptions" />
                  </n-gi>
                </n-grid>
                <n-input v-model:value="featureDraftOwnersText" placeholder="Owner ID，逗号分隔" />
                <n-input v-model:value="featureDraftTagsText" placeholder="标签，逗号分隔" />
                <n-select v-model:value="featureDraft.variantType" :options="featureVariantTypeOptions" />
                <div v-for="variant in featureDraft.variants" :key="variant.variantId" class="compact-row">
                  <span>{{ variant.name }}</span>
                  <n-input
                    :value="String(variant.value)"
                    size="small"
                    @update:value="(value) => updateFeatureDraftVariantValue(variant.variantId, value)"
                  />
                </div>
                <n-select
                  v-model:value="featureDraft.defaultVariantId"
                  :options="featureDraftVariantOptions"
                  placeholder="默认版本"
                />
                <n-button type="primary" block @click="createFeatureFlag">创建 Feature</n-button>
              </div>
            </n-card>
          </n-gi>
          <n-gi :span="3">
            <n-card :title="selectedFeature?.name ?? 'Feature 详情'" :bordered="false">
              <n-descriptions v-if="selectedFeature" :column="2" label-placement="left" size="small">
                <n-descriptions-item label="Key">{{ selectedFeature?.key }}</n-descriptions-item>
                <n-descriptions-item label="终端">{{ selectedFeature?.terminalType }}</n-descriptions-item>
                <n-descriptions-item label="类型">{{ selectedFeature?.featureType }}</n-descriptions-item>
                <n-descriptions-item label="生命周期">{{ selectedFeature?.status }}</n-descriptions-item>
                <n-descriptions-item label="发布状态">{{ selectedFeature?.publishStatus }}</n-descriptions-item>
                <n-descriptions-item label="当前版本">
                  {{ selectedCurrentFeatureVersion?.versionNo ?? '-' }}
                </n-descriptions-item>
                <n-descriptions-item label="关联实验">
                  {{ selectedFeature?.relatedExperimentIds.map(getExperimentName).join('、') || '-' }}
                </n-descriptions-item>
              </n-descriptions>
              <n-empty v-else description="暂无 Feature" />
              <n-divider />
              <n-space v-if="selectedFeature">
                <n-button size="small" secondary @click="changeFeatureLifecycle('enable')">启用</n-button>
                <n-button size="small" secondary @click="changeFeatureLifecycle('disable')">停用</n-button>
                <n-button size="small" secondary type="error" @click="changeFeatureLifecycle('delete')">删除</n-button>
              </n-space>
              <n-divider />
              <n-grid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
                <n-gi>
                  <div class="mini-section">
                    <strong>版本历史</strong>
                    <div class="feature-version-list">
                      <button
                        v-for="version in selectedFeatureVersions"
                        :key="version.versionId"
                        class="version-card link-card"
                        :class="{ selected: featurePublishDraft.versionId === version.versionId }"
                        @click="featurePublishDraft.versionId = version.versionId"
                      >
                        <div>
                          <strong>{{ version.versionNo }}</strong>
                          <span>{{ version.versionStatus }} · {{ version.variantType }}</span>
                          <small>
                            {{ version.variants.map((variant) => `${variant.name}:${JSON.stringify(variant.value)}`).join(' / ') }}
                          </small>
                        </div>
                        <n-tag>{{ formatPercent(version.publishTraffic) }}</n-tag>
                      </button>
                    </div>
                  </div>
                </n-gi>
                <n-gi>
                  <div class="mini-section">
                    <strong>新建版本</strong>
                    <n-select v-model:value="featureVersionDraft.variantType" :options="featureVariantTypeOptions" disabled />
                    <div v-for="variant in featureVersionDraft.variants" :key="variant.variantId" class="compact-row">
                      <n-input v-model:value="variant.name" size="small" />
                      <n-input
                        :value="String(variant.value)"
                        size="small"
                        @update:value="(value) => updateFeatureVersionVariantValue(variant.variantId, value)"
                      />
                    </div>
                    <n-input
                      v-model:value="featureVersionRuleName"
                      placeholder="受众规则名称"
                    />
                    <n-grid :cols="2" :x-gap="8">
                      <n-gi>
                        <n-input
                          v-model:value="featureVersionRuleFieldName"
                          placeholder="字段"
                        />
                      </n-gi>
                      <n-gi>
                        <n-input
                          v-model:value="featureVersionRuleValueText"
                          placeholder="值，多个用逗号"
                        />
                      </n-gi>
                    </n-grid>
                    <n-select
                      v-model:value="featureVersionRuleVariantId"
                      :options="featureVersionVariantOptions"
                      placeholder="命中版本"
                    />
                    <n-select
                      v-model:value="featureVersionDraft.defaultRule.variantId"
                      :options="featureVersionVariantOptions"
                      placeholder="默认版本"
                    />
                    <n-button secondary block @click="createFeatureVersion">创建版本</n-button>
                  </div>
                </n-gi>
              </n-grid>
            </n-card>
          </n-gi>
        </n-grid>

        <n-grid :cols="3" :x-gap="16" :y-gap="16" responsive="screen">
          <n-gi>
            <n-card title="发布与回滚" :bordered="false">
              <n-space vertical>
                <n-select
                  v-model:value="featurePublishDraft.versionId"
                  :options="featureVersionOptions"
                  placeholder="选择版本"
                />
                <n-select v-model:value="featurePublishDraft.publishType" :options="publishTypeOptions" />
                <n-input-number
                  v-model:value="featurePublishDraft.publishTraffic"
                  :min="1"
                  :max="100"
                  style="width: 100%"
                />
                <n-input
                  v-if="featurePublishDraft.publishType === 'scheduled'"
                  v-model:value="featurePublishDraft.scheduledAt"
                  placeholder="2026-05-30T10:00:00+02:00"
                />
                <n-input
                  v-model:value="featurePublishDraft.description"
                  type="textarea"
                  :autosize="{ minRows: 2, maxRows: 3 }"
                />
                <n-space>
                  <n-button type="primary" @click="requestPublishSelectedFeatureVersion">发布</n-button>
                  <n-button secondary @click="rollbackSelectedFeature">回滚到所选版本</n-button>
                </n-space>
              </n-space>
              <n-divider />
              <div v-for="plan in selectedPublishPlans" :key="plan.publishId" class="plan-card">
                <strong>{{ plan.description }}</strong>
                <span v-for="step in plan.steps" :key="step.stepNo">
                  Step {{ step.stepNo }} · {{ formatDateTime(step.publishTime) }} · {{ formatPercent(step.traffic) }}
                </span>
              </div>
            </n-card>
          </n-gi>
          <n-gi>
            <n-card title="白名单测试" :bordered="false">
              <n-space vertical>
                <n-input v-model:value="whitelistDraft.name" placeholder="白名单名称" />
                <n-select
                  v-model:value="whitelistDraft.versionId"
                  :options="featureVersionOptions"
                  placeholder="绑定版本"
                />
                <n-input v-model:value="whitelistDraft.expiresAt" placeholder="到期时间" />
                <n-input
                  v-model:value="whitelistUserIdsText"
                  type="textarea"
                  :autosize="{ minRows: 2, maxRows: 4 }"
                  placeholder="用户 ID，逗号分隔"
                />
                <n-button secondary block @click="createWhitelistTest">创建白名单</n-button>
              </n-space>
              <n-divider />
              <div v-for="test in selectedWhitelistTests" :key="test.id" class="plan-card">
                <strong>{{ test.name }}</strong>
                <span>{{ test.status }} · 到期 {{ formatDateTime(test.expiresAt) }}</span>
                <small>{{ Object.values(test.ruleUserIds).flat().join('、') }}</small>
              </div>
            </n-card>
          </n-gi>
          <n-gi>
            <n-card title="Runtime 决策" :bordered="false">
              <n-space vertical>
                <n-input v-model:value="decisionTester.userId" placeholder="用户 ID" />
                <n-input v-model:value="decisionTester.city" placeholder="城市" />
                <n-input v-model:value="decisionTester.os" placeholder="系统" />
                <n-space>
                  <n-checkbox v-model:checked="decisionTester.inWhitelist">白名单</n-checkbox>
                  <n-checkbox v-model:checked="decisionTester.inExperiment">实验命中</n-checkbox>
                </n-space>
                <n-button type="primary" block @click="runFeatureDecision">执行决策</n-button>
                <div v-if="featureDecision" class="decision-result">
                  <strong>{{ featureDecision?.variantName ?? featureDecision?.featureKey }}</strong>
                  <span>{{ featureDecision?.decisionSource }} · {{ featureDecision?.decisionReason }}</span>
                  <code>{{ JSON.stringify(featureDecision?.value) }}</code>
                </div>
              </n-space>
            </n-card>
          </n-gi>
        </n-grid>

        <n-grid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
          <n-gi>
            <n-card title="实验固化为 Feature" :bordered="false">
              <n-space vertical>
                <n-select
                  :value="featureSolidifyDraft.experimentId"
                  :options="runningExperiments.map((experiment) => ({ label: experiment.name, value: experiment.id }))"
                  placeholder="选择实验"
                  @update:value="syncSolidifyExperiment"
                />
                <n-grid :cols="2" :x-gap="8">
                  <n-gi>
                    <n-input v-model:value="featureSolidifyDraft.featureKey" placeholder="Feature Key" />
                  </n-gi>
                  <n-gi>
                    <n-input v-model:value="featureSolidifyDraft.featureName" placeholder="Feature 名称" />
                  </n-gi>
                </n-grid>
                <n-select
                  v-model:value="featureSolidifyDraft.winnerVariantId"
                  :options="solidifyVariantOptions"
                  placeholder="胜出实验组"
                />
                <n-input-number
                  v-model:value="featureSolidifyDraft.rolloutTraffic"
                  :min="1"
                  :max="100"
                  style="width: 100%"
                />
                <n-button type="primary" block @click="solidifyExperimentToFeature">固化并灰度发布</n-button>
              </n-space>
            </n-card>
          </n-gi>
          <n-gi>
            <n-card title="Runtime 优先级" :bordered="false">
              <div class="priority-lane">
                <span>白名单</span>
                <span>实验命中</span>
                <span>Feature 受众规则</span>
                <span>默认规则</span>
                <span>本地默认值</span>
              </div>
              <n-divider />
              <div class="list-block">
                <strong>当前生效版本</strong>
                <span>
                  {{ selectedFeature?.name ?? '-' }} /
                  {{ selectedCurrentFeatureVersion?.versionNo ?? selectedLatestFeatureVersion?.versionNo ?? '-' }}
                </span>
                <span>
                  发布流量 {{ formatPercent(selectedCurrentFeatureVersion?.publishTraffic ?? 0) }} ·
                  状态 {{ selectedFeature?.publishStatus ?? '-' }}
                </span>
              </div>
            </n-card>
          </n-gi>
        </n-grid>
      </section>

      <section v-else-if="activePage === 'traffic'" class="ab-section-stack traffic-page">
        <div class="traffic-summary-grid">
          <article class="traffic-summary-card">
            <span>流量层</span>
            <strong>{{ trafficLayers.length }}</strong>
            <small>平均已用 {{ formatPercent(trafficLayerUsedAverage) }} / 可用 {{ formatPercent(trafficLayerAvailableAverage) }}</small>
          </article>
          <article class="traffic-summary-card">
            <span>互斥域</span>
            <strong>{{ mutexDomainCount }}</strong>
            <small>{{ occupiedMutexDomainCount }} 个占用中，{{ mutexDomainCount - occupiedMutexDomainCount }} 个空闲</small>
          </article>
          <article class="traffic-summary-card">
            <span>推荐流量</span>
            <strong>{{ trafficRecommendation ? formatRatio(trafficRecommendation.recommendedTrafficRatio) : '-' }}</strong>
            <small>{{ trafficRecommendation ? `每组 ${formatNumber(trafficRecommendation.sampleSizePerGroup)} 用户` : '等待计算' }}</small>
          </article>
        </div>

        <div class="traffic-section-heading">
          <div>
            <strong>流量资源配置</strong>
            <span>流量层负责分配实验流量池，互斥域负责隔离不能同时命中的实验。</span>
          </div>
        </div>

        <div class="traffic-resource-grid">
          <n-card title="1. 流量层配额" :bordered="false" class="traffic-card traffic-resource-card">
            <template #header-extra>
              <n-tag size="small">{{ trafficLayers.length }} 层</n-tag>
            </template>
            <div class="traffic-card-layout">
              <div class="traffic-scroll-list">
                <article v-for="layer in trafficLayers" :key="layer.id" class="traffic-layer-card">
                  <div class="traffic-row-head">
                    <div>
                      <strong>{{ layer.name }}</strong>
                      <span>{{ layer.description }}</span>
                    </div>
                    <n-space size="small">
                      <n-tag size="small">{{ layer.experimentType }}</n-tag>
                      <n-button size="tiny" secondary @click="abStore.editTrafficLayer(layer.id)">编辑</n-button>
                      <n-button size="tiny" secondary @click="removeTrafficLayer(layer.id)">删除</n-button>
                    </n-space>
                  </div>
                  <div class="traffic-progress-row">
                    <n-progress type="line" :percentage="layer.usedTrafficRatio" :height="10" />
                    <strong>{{ formatPercent(layer.usedTrafficRatio) }}</strong>
                  </div>
                  <span>已用 {{ formatPercent(layer.usedTrafficRatio) }} · 可用 {{ formatPercent(layer.availableTrafficRatio) }}</span>
                </article>
                <n-empty v-if="!trafficLayers.length" size="small" description="暂无流量层" />
              </div>

              <div class="traffic-form-panel">
                <strong>{{ trafficLayerDraft.id ? '编辑流量层' : '新建流量层' }}</strong>
                <div class="traffic-form-grid">
                  <n-input v-model:value="trafficLayerDraft.name" placeholder="流量层名称" />
                  <n-select
                    v-model:value="trafficLayerDraft.experimentType"
                    :options="[
                      { label: '客户端', value: 'CLIENT' },
                      { label: '服务端', value: 'SERVER' },
                    ]"
                  />
                  <n-input-number
                    v-model:value="trafficLayerDraft.totalTrafficRatio"
                    :min="1"
                    :max="100"
                    style="width: 100%"
                  />
                  <n-input
                    v-model:value="trafficLayerDraft.description"
                    class="traffic-form-wide"
                    type="textarea"
                    :autosize="{ minRows: 2, maxRows: 3 }"
                    placeholder="流量层说明"
                  />
                </div>
                <n-space>
                  <n-button type="primary" secondary @click="saveTrafficLayer">
                    {{ trafficLayerDraft.id ? '保存流量层' : '创建流量层' }}
                  </n-button>
                  <n-button secondary @click="abStore.resetTrafficLayerDraft">重置</n-button>
                </n-space>
              </div>
            </div>
          </n-card>

          <n-card title="2. 互斥域划分" :bordered="false" class="traffic-card traffic-resource-card">
            <template #header-extra>
              <n-tag size="small">{{ mutexDomainGroups.length }} 组 / {{ mutexDomainCount }} 域</n-tag>
            </template>
            <div class="traffic-card-layout">
              <div class="traffic-scroll-list">
                <article v-for="group in mutexDomainGroups" :key="group.id" class="mutex-group-card">
                  <div class="traffic-row-head">
                    <div>
                      <strong>{{ group.name }}</strong>
                      <span>{{ group.description }}</span>
                    </div>
                    <n-space size="small">
                      <n-tag size="small">{{ group.experimentType }}</n-tag>
                      <n-button size="tiny" secondary @click="abStore.editMutexGroup(group.id)">编辑组</n-button>
                      <n-button size="tiny" secondary @click="removeMutexGroup(group.id)">删除组</n-button>
                    </n-space>
                  </div>
                  <div class="mutex-domain-list">
                    <div v-for="domain in group.domains" :key="domain.id" class="mutex-domain-row">
                      <div>
                        <strong>{{ domain.name }}</strong>
                        <span>{{ domain.runningExperimentIds.length ? '占用中' : '空闲' }}</span>
                      </div>
                      <n-space size="small">
                        <n-tag size="small">{{ formatPercent(domain.trafficRatio) }}</n-tag>
                        <n-button size="tiny" secondary @click="abStore.editMutexDomain(group.id, domain.id)">编辑</n-button>
                        <n-button size="tiny" secondary @click="removeMutexDomain(group.id, domain.id)">删除</n-button>
                      </n-space>
                    </div>
                  </div>
                </article>
                <n-empty v-if="!mutexDomainGroups.length" size="small" description="暂无互斥域组" />
              </div>

              <div class="traffic-form-panel mutex-form-panel">
                <div class="traffic-form-block">
                  <strong>{{ mutexGroupDraft.id ? '编辑互斥域组' : '新建互斥域组' }}</strong>
                  <n-input v-model:value="mutexGroupDraft.name" placeholder="互斥域组名称" />
                  <n-input v-model:value="mutexGroupDraft.description" type="textarea" :autosize="{ minRows: 2, maxRows: 3 }" />
                  <n-select
                    v-model:value="mutexGroupDraft.experimentType"
                    :options="[
                      { label: '客户端', value: 'CLIENT' },
                      { label: '服务端', value: 'SERVER' },
                    ]"
                  />
                  <n-space>
                    <n-button type="primary" secondary @click="saveMutexGroup">
                      {{ mutexGroupDraft.id ? '保存域组' : '创建域组' }}
                    </n-button>
                    <n-button secondary @click="abStore.resetMutexGroupDraft">重置</n-button>
                  </n-space>
                </div>
                <div class="traffic-form-block">
                  <strong>{{ mutexDomainDraft.id ? '编辑互斥域' : '新建互斥域' }}</strong>
                  <n-select v-model:value="mutexDomainDraft.groupId" :options="mutexGroupOptions" />
                  <n-input v-model:value="mutexDomainDraft.name" placeholder="互斥域名称" />
                  <n-input-number
                    v-model:value="mutexDomainDraft.trafficRatio"
                    :min="1"
                    :max="100"
                    style="width: 100%"
                  />
                  <n-space>
                    <n-button type="primary" secondary @click="saveMutexDomain">
                      {{ mutexDomainDraft.id ? '保存互斥域' : '创建互斥域' }}
                    </n-button>
                    <n-button secondary @click="abStore.resetMutexDomainDraft(mutexDomainDraft.groupId)">重置</n-button>
                  </n-space>
                </div>
              </div>
            </div>
          </n-card>
        </div>

        <div class="traffic-section-heading">
          <div>
            <strong>流量测算</strong>
            <span>根据用户规模、版本数、MDE 和过滤比例计算实验建议流量。</span>
          </div>
        </div>

        <div class="traffic-calculation-grid">
          <n-card title="3. 流量计算器" :bordered="false" class="traffic-card traffic-calculator-card">
            <div class="traffic-calculator-grid">
              <div>
                <label class="field-label">预估用户</label>
                <n-input-number v-model:value="trafficCalculator.estimatedTotalUsers" :min="1" style="width: 100%" />
              </div>
              <div>
                <label class="field-label">版本数</label>
                <n-input-number v-model:value="trafficCalculator.versionCount" :min="2" :max="12" style="width: 100%" />
              </div>
              <div>
                <label class="field-label">MDE</label>
                <n-input-number v-model:value="trafficCalculator.mdeValue" :step="0.01" :min="0.01" style="width: 100%" />
              </div>
              <div>
                <label class="field-label">过滤比例</label>
                <n-input-number v-model:value="trafficCalculator.trafficFilterRatio" :step="0.01" :min="0.01" :max="1" style="width: 100%" />
              </div>
            </div>
            <n-button type="primary" class="full-button" @click="runTrafficCalculator">计算推荐流量</n-button>
          </n-card>

          <n-card title="推荐结果" :bordered="false" class="traffic-card traffic-result-card">
            <template v-if="trafficRecommendation">
              <div class="traffic-result-content">
                <div class="recommendation-grid traffic-recommendation-grid">
                  <div>
                    <span>每组样本</span>
                    <strong>{{ formatNumber(trafficRecommendation.sampleSizePerGroup) }}</strong>
                  </div>
                  <div>
                    <span>建议流量</span>
                    <strong>{{ formatRatio(trafficRecommendation.recommendedTrafficRatio) }}</strong>
                  </div>
                  <div>
                    <span>总样本量</span>
                    <strong>{{ formatNumber(trafficRecommendation.recommendedTotalSampleSize) }}</strong>
                  </div>
                </div>
                <p class="report-text muted">{{ trafficRecommendation.suggestions.join('；') }}</p>
              </div>
            </template>
            <div v-else class="traffic-empty-result">
              <n-empty description="等待计算" />
            </div>
          </n-card>
        </div>
      </section>

      <section v-else-if="activePage === 'tools'" class="ab-section-stack tools-page">
        <n-card title="命中查询" :bordered="false" class="tool-card tool-query-card">
          <div class="tool-query-grid">
            <div class="tool-field">
              <label class="field-label">模板</label>
              <n-select
                v-model:value="hitQueryDraft.templateId"
                clearable
                :options="hitQueryTemplates.map((template) => ({ label: template.name, value: template.id }))"
                @update:value="applyHitTemplate"
              />
            </div>
            <div class="tool-field">
              <label class="field-label">ID 类型</label>
              <n-select v-model:value="hitQueryDraft.subjectType" :options="hitSubjectTypeOptions" />
            </div>
            <div class="tool-field tool-field-primary">
              <label class="field-label">查询 ID</label>
              <n-input v-model:value="hitQueryDraft.subjectId" placeholder="输入 uid / did / ssid" />
            </div>
            <div class="tool-field">
              <label class="field-label">实验过滤</label>
              <n-select
                v-model:value="hitQueryDraft.experimentId"
                clearable
                :options="experiments.map((experiment) => ({ label: experiment.name, value: experiment.id }))"
              />
            </div>
            <div class="tool-field">
              <label class="field-label">命中状态</label>
              <n-select v-model:value="hitQueryDraft.hitStatus" :options="hitStatusOptions" />
            </div>
            <div class="tool-field tool-sort-field">
              <label class="field-label">排序</label>
              <div class="tool-sort-controls">
                <n-select v-model:value="hitQueryDraft.sortBy" :options="hitSortOptions" />
                <n-select v-model:value="hitQueryDraft.sortOrder" :options="sortOrderOptions" />
              </div>
            </div>
          </div>
          <div class="tool-actions">
            <n-button type="primary" :loading="hitQueryLoading" @click="queryHits">查询</n-button>
            <n-button secondary @click="downloadHitResults">下载结果</n-button>
          </div>
          <div class="tool-result-panel">
            <n-table v-if="hitQueryResults.length" :bordered="false" size="small">
              <thead>
                <tr>
                  <th>实验</th>
                  <th>状态</th>
                  <th>版本</th>
                  <th>来源</th>
                  <th>流量桶</th>
                  <th>原因</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in hitQueryResults" :key="item.id">
                  <td>{{ item.experimentName }}</td>
                  <td><n-tag :type="hitStatusType(item.hitStatus)" size="small">{{ item.hitStatus }}</n-tag></td>
                  <td>{{ item.variantName }}</td>
                  <td>{{ item.decisionSource }}</td>
                  <td>{{ item.trafficBucket }}</td>
                  <td>{{ item.reason }}</td>
                </tr>
              </tbody>
            </n-table>
            <n-empty v-else size="small" description="暂无查询结果" />
          </div>
        </n-card>

        <div class="tools-split-grid">
          <n-card title="命中诊断" :bordered="false" class="tool-card tool-diagnosis-card">
            <div class="tool-panel tool-diagnosis-panel">
              <div class="tool-inline-form">
                <n-input v-model:value="hitDiagnosisDraft.subjectId" placeholder="输入待诊断用户 ID" />
                <n-select
                  v-model:value="hitDiagnosisDraft.experimentId"
                  :options="experiments.map((experiment) => ({ label: experiment.name, value: experiment.id }))"
                />
                <n-button type="primary" @click="diagnoseHit">开始诊断</n-button>
              </div>
              <div class="tool-diagnosis-scroll">
                <template v-if="hitDiagnosisResult">
                  <div class="condition-pill">
                    {{ hitDiagnosisResult.experimentName }} · {{ hitDiagnosisResult.finalDecision }}
                  </div>
                  <div class="snapshot-list">
                    <div v-for="stage in hitDiagnosisResult.stages" :key="stage.stage" class="snapshot-row tool-list-row">
                      <div>
                        <strong>{{ stage.stage }}</strong>
                        <span>{{ stage.message }}</span>
                      </div>
                      <n-tag :type="diagnosisStatusType(stage.status)" size="small">{{ stage.status }}</n-tag>
                    </div>
                  </div>
                </template>
                <div v-else class="tool-empty">
                  <n-empty size="small" description="等待诊断" />
                </div>
              </div>
            </div>
          </n-card>

          <n-card title="异步任务" :bordered="false" class="tool-card">
            <div class="tool-panel">
              <div class="tool-status-line">
                <n-tag :type="asyncPolling ? 'success' : 'default'">
                  {{ asyncPolling ? '轮询中' : '已暂停' }}
                </n-tag>
                <n-tag v-if="asyncLastPolledAt" type="info">
                  {{ formatDateTime(asyncLastPolledAt) }}
                </n-tag>
                <n-tag v-if="asyncPollingError" type="error">{{ asyncPollingError }}</n-tag>
              </div>
              <div class="tool-actions">
                <n-button size="small" secondary @click="abStore.startAsyncTaskPolling()">开始轮询</n-button>
                <n-button size="small" secondary @click="abStore.stopAsyncTaskPolling()">停止轮询</n-button>
                <n-button size="small" secondary @click="abStore.refreshAsyncTasks()">立即刷新</n-button>
                <n-button size="small" secondary @click="recoverWorkspaceState">恢复状态</n-button>
              </div>
              <div class="tool-task-list">
                <div class="condition-pill">增强分流调平 · 可取消 · 可重试</div>
                <div class="condition-pill">
                  报告导出 · 运行 {{ reportExportQueueHealth.running }} · 失败 {{ reportExportQueueHealth.failed }} · 取消 {{ reportExportQueueHealth.canceled }}
                </div>
                <div class="condition-pill">敏感人群洞察 · 模型训练中</div>
                <div v-if="loadError" class="condition-pill danger">加载异常 · {{ loadError }}</div>
              </div>
            </div>
          </n-card>
        </div>

        <n-card title="数据查重" :bordered="false" class="tool-card">
          <div class="tool-dedup-form">
            <n-input v-model:value="dataDedupDraft.name" placeholder="任务名称" />
            <n-select
              v-model:value="dataDedupDraft.experimentId"
              clearable
              :options="experiments.map((experiment) => ({ label: experiment.name, value: experiment.id }))"
              placeholder="实验"
            />
            <n-select v-model:value="dataDedupDraft.scope" :options="dedupScopeOptions" />
            <n-select v-model:value="dataDedupDraft.schedule" :options="dedupScheduleOptions" />
            <n-input-number v-model:value="dataDedupDraft.windowMinutes" :min="1" :max="1440" />
            <n-button type="primary" @click="createDedupTask">创建查重任务</n-button>
          </div>
          <div class="tool-table-panel">
            <n-table :bordered="false" size="small">
              <thead>
                <tr>
                  <th>任务</th>
                  <th>范围</th>
                  <th>运行</th>
                  <th>重复率</th>
                  <th>更新时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="task in dataDedupTasks" :key="task.id">
                  <td>
                    <strong>{{ task.name }}</strong>
                    <span class="cell-subtitle">{{ getExperimentName(task.experimentId ?? '') }}</span>
                  </td>
                  <td>{{ task.scope }} · {{ task.windowMinutes }} 分钟</td>
                  <td><n-tag :type="dedupStatusType(task.status)" size="small">{{ task.schedule }} / {{ task.status }}</n-tag></td>
                  <td>{{ formatRatio(task.duplicateRate) }} · {{ task.duplicateRows }} 行</td>
                  <td>{{ formatDateTime(task.updatedAt) }}</td>
                  <td>
                    <n-space size="small">
                      <n-button size="small" secondary @click="runDedupTask(task.id)">
                        {{ task.schedule === 'daily' ? '立即运行' : '运行' }}
                      </n-button>
                      <n-button size="small" secondary @click="downloadDedupTask(task.id)">下载</n-button>
                    </n-space>
                  </td>
                </tr>
              </tbody>
            </n-table>
          </div>
        </n-card>
      </section>

      <section v-else-if="activePage === 'boards'" class="ab-section-stack board-page">
        <template v-if="boardPageMode === 'list'">
          <n-card title="看板列表" :bordered="false" class="board-list-card">
            <template #header-extra>
              <n-button type="primary" @click="openBoardCreate">新建看板</n-button>
            </template>
            <div v-if="experimentBoards.length" class="board-list">
              <article
                v-for="board in experimentBoards"
                :key="board.id"
                class="board-list-row"
                :class="{ active: board.id === selectedBoardId }"
              >
                <div class="board-list-main">
                  <strong>{{ board.name }}</strong>
                  <span>{{ board.description }}</span>
                  <div class="board-list-meta">
                    <n-tag size="small" :type="board.visibility === 'PUBLIC' ? 'success' : 'warning'">
                      {{ board.visibility === 'PUBLIC' ? '公共看板' : '私有看板' }}
                    </n-tag>
                    <span>组件 {{ board.widgets.length }}</span>
                    <span>{{ optionLabel(boardRangeOptions, board.timeConfig.range) }} / {{ optionLabel(boardGranularityOptions, board.timeConfig.granularity) }}</span>
                    <span>更新 {{ formatDateTime(board.updatedAt) }}</span>
                  </div>
                </div>
                <div class="board-list-actions">
                  <n-button size="small" type="primary" secondary @click="openBoardView(board.id)">查看</n-button>
                  <n-button size="small" secondary @click="openBoardEdit(board.id)">编辑</n-button>
                </div>
              </article>
            </div>
            <n-empty v-else description="暂无看板">
              <template #extra>
                <n-button type="primary" @click="openBoardCreate">新建看板</n-button>
              </template>
            </n-empty>
          </n-card>
        </template>

        <template v-else-if="boardPageMode === 'edit'">
          <n-card :title="boardCreateMode ? '创建看板' : '看板配置'" :bordered="false" class="board-management-card board-edit-card">
            <template #header-extra>
              <n-space size="small">
                <n-button secondary @click="openBoardList">返回列表</n-button>
                <n-button v-if="selectedBoardId" secondary @click="openBoardView()">查看看板</n-button>
                <n-button type="primary" @click="saveBoard">{{ boardCreateMode ? '保存并进入编辑' : '保存配置' }}</n-button>
                <n-button v-if="selectedBoardId" secondary @click="copyBoardLink">复制链接</n-button>
                <n-button v-if="selectedBoardId" secondary @click="calculateBoardDiff">计算 Diff</n-button>
              </n-space>
            </template>
            <div class="board-form-layout">
              <div class="board-form-grid">
                <div v-if="!boardCreateMode" class="board-field">
                  <label class="field-label">当前看板</label>
                  <n-select
                    :value="selectedBoardId"
                    :options="experimentBoards.map((board) => ({ label: board.name, value: board.id }))"
                    @update:value="(value) => openBoardEdit(String(value))"
                  />
                </div>
                <div class="board-field">
                  <label class="field-label">看板名称</label>
                  <n-input v-model:value="boardDraft.name" />
                </div>
                <div class="board-field">
                  <label class="field-label">可见范围</label>
                  <n-select v-model:value="boardDraft.visibility" :options="visibilityOptions.slice(1)" />
                </div>
                <div class="board-field">
                  <label class="field-label">时间范围</label>
                  <n-select v-model:value="boardDraft.timeConfig.range" :options="boardRangeOptions" />
                </div>
                <div class="board-field">
                  <label class="field-label">粒度</label>
                  <n-select v-model:value="boardDraft.timeConfig.granularity" :options="boardGranularityOptions" />
                </div>
                <div class="board-field">
                  <label class="field-label">开始时间</label>
                  <n-input v-model:value="boardDraft.timeConfig.startTime" :disabled="boardDraft.timeConfig.range !== 'custom'" />
                </div>
                <div class="board-field">
                  <label class="field-label">结束时间</label>
                  <n-input v-model:value="boardDraft.timeConfig.endTime" :disabled="boardDraft.timeConfig.range !== 'custom'" />
                </div>
                <div class="board-field board-description-field">
                  <label class="field-label">描述</label>
                  <n-input v-model:value="boardDraft.description" />
                </div>
              </div>
              <aside class="board-access-panel">
                <label class="field-label">授权用户</label>
                <n-select
                  v-model:value="boardDraft.authorizedUserIds"
                  multiple
                  clearable
                  filterable
                  max-tag-count="responsive"
                  :options="appMemberOptions"
                />
                <span>私有看板仅授权用户可见；公共看板仍会记录协作者范围。</span>
              </aside>
            </div>
          </n-card>

          <div class="board-editor-layout">
            <n-card title="添加组件" :bordered="false" class="board-add-card">
              <div v-if="selectedBoardId" class="board-widget-form">
                <n-select v-model:value="boardWidgetDraft.type" :options="boardWidgetTypeOptions" />
                <n-input v-model:value="boardWidgetDraft.title" placeholder="组件标题" />
                <n-select v-model:value="boardWidgetDraft.dataSource" :options="boardDataSourceOptions" />
                <n-select
                  v-model:value="boardWidgetDraft.metricId"
                  clearable
                  :options="metrics.map((metric) => ({ label: metric.name, value: metric.id }))"
                  placeholder="指标"
                />
                <n-select
                  v-model:value="boardWidgetDraft.experimentId"
                  clearable
                  :options="experiments.map((experiment) => ({ label: experiment.name, value: experiment.id }))"
                  placeholder="实验"
                />
                <n-input v-model:value="boardWidgetDraft.text" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" />
                <n-button type="primary" block @click="addBoardWidget">添加到看板</n-button>
              </div>
              <n-empty v-else description="保存看板后可添加组件" />
            </n-card>
            <n-card :title="selectedBoard?.name ?? '看板组件'" :bordered="false" class="board-widget-card">
              <div v-if="selectedBoardId && selectedBoardWidgets.length" class="board-widget-list">
                <div v-for="widget in selectedBoardWidgets" :key="widget.id" class="board-widget-row">
                  <div>
                    <strong>{{ widget.title }}</strong>
                    <span>
                      {{ boardWidgetTypeLabel(widget.type) }} · {{ boardWidgetDataSourceLabel(widget.dataSource) }} · {{ boardWidgetResourceLabel(widget) }} · 排序 {{ widget.order }}
                    </span>
                    <small v-if="widget.text">{{ widget.text }}</small>
                  </div>
                  <div class="board-widget-actions">
                    <n-button size="small" secondary @click="moveBoardWidget(widget.id, 'up')">上移</n-button>
                    <n-button size="small" secondary @click="moveBoardWidget(widget.id, 'down')">下移</n-button>
                    <n-button size="small" secondary @click="removeBoardWidget(widget.id)">删除</n-button>
                  </div>
                </div>
              </div>
              <n-empty v-else :description="selectedBoardId ? '暂无组件' : '保存后可维护组件'" />
            </n-card>
          </div>

          <n-card v-if="boardDiffResults.length" title="Diff 计算结果" :bordered="false" class="board-diff-card">
            <div class="snapshot-list">
              <div v-for="item in boardDiffResults" :key="item.id" class="snapshot-row">
                <div>
                  <strong>{{ item.title }}</strong>
                  <span>基线 {{ formatMetricValue(item.baselineValue) }} / 当前 {{ formatMetricValue(item.currentValue) }}</span>
                </div>
                <n-tag :type="boardDiffStatusType(item.status)" size="small">
                  {{ formatMetricValue(item.diffAbs) }} · {{ formatRatio(item.diffRel) }}
                </n-tag>
              </div>
            </div>
          </n-card>
        </template>

        <template v-else>
          <n-card :title="selectedBoard?.name ?? '看板查看'" :bordered="false" class="board-view-header">
            <template #header-extra>
              <n-space size="small">
                <n-button secondary @click="openBoardList">返回列表</n-button>
                <n-button v-if="selectedBoardId" secondary @click="openBoardEdit()">编辑看板</n-button>
                <n-button v-if="selectedBoardId" secondary @click="copyBoardLink">复制链接</n-button>
              </n-space>
            </template>
            <div v-if="selectedBoard" class="board-view-summary">
              <p>{{ selectedBoard.description }}</p>
              <div class="board-view-tags">
                <n-tag size="small" :type="selectedBoard.visibility === 'PUBLIC' ? 'success' : 'warning'">
                  {{ selectedBoard.visibility === 'PUBLIC' ? '公共看板' : '私有看板' }}
                </n-tag>
                <n-tag size="small">{{ optionLabel(boardRangeOptions, selectedBoard.timeConfig.range) }}</n-tag>
                <n-tag size="small">{{ optionLabel(boardGranularityOptions, selectedBoard.timeConfig.granularity) }}</n-tag>
                <n-tag size="small">组件 {{ selectedBoard.widgets.length }}</n-tag>
              </div>
            </div>
            <n-empty v-else description="看板不存在">
              <template #extra>
                <n-button secondary @click="openBoardList">返回列表</n-button>
              </template>
            </n-empty>
          </n-card>

          <div v-if="selectedBoard" class="board-view-grid">
            <article
              v-for="widget in boardViewWidgets"
              :key="widget.id"
              class="board-view-widget"
              :class="`board-view-widget-${widget.type}`"
            >
              <div class="board-view-widget-head">
                <div>
                  <strong>{{ widget.title }}</strong>
                  <span>{{ boardWidgetTypeLabel(widget.type) }} · {{ boardWidgetDataSourceLabel(widget.dataSource) }} · {{ boardWidgetResourceLabel(widget) }}</span>
                </div>
                <n-tag size="small">排序 {{ widget.order }}</n-tag>
              </div>

              <div class="board-view-widget-body">
                <template v-if="widget.type === 'metric'">
                  <div class="board-view-metric-head">
                    <div>
                      <strong class="board-value">{{ boardWidgetMetricValue(widget) }}</strong>
                      <span>{{ boardWidgetMetricGroup(widget) }}</span>
                    </div>
                  </div>
                  <div v-if="boardWidgetTrendPoints(widget).length" class="trend-strip compact">
                    <div
                      v-for="point in boardWidgetTrendPoints(widget)"
                      :key="point.time"
                      :style="{ height: `${compactTrendBarHeight(boardWidgetTrendPoints(widget), point.value)}px` }"
                    />
                  </div>
                  <span v-if="boardWidgetTrendPoints(widget).length" class="board-view-footnote">
                    日环比 {{ formatRatio(boardWidgetTrendPoints(widget)[boardWidgetTrendPoints(widget).length - 1]?.dayOverDay) }}
                  </span>
                  <n-empty v-else size="small" description="暂无指标趋势" />
                </template>

                <template v-else-if="widget.type === 'experiment_health'">
                  <div class="board-view-health-head">
                    <strong>{{ boardWidgetExperimentName(widget) }}</strong>
                    <n-tag :type="boardWidgetExperimentStatusType(widget)" size="small">
                      {{ boardWidgetExperimentStatusLabel(widget) }}
                    </n-tag>
                  </div>
                  <n-progress type="line" :percentage="boardWidgetExperimentTraffic(widget)" :height="10" />
                  <span class="board-view-footnote">流量占比 {{ formatPercent(boardWidgetExperimentTraffic(widget)) }}</span>
                </template>

                <template v-else-if="widget.type === 'alarm'">
                  <div v-if="boardWidgetAlarm()" class="board-view-alarm">
                    <div>
                      <strong>{{ boardWidgetAlarm()?.name }}</strong>
                      <span>{{ boardWidgetAlarm()?.description }}</span>
                    </div>
                    <n-tag :type="boardWidgetAlarmLevelType()" size="small">{{ boardWidgetAlarm()?.level }}</n-tag>
                  </div>
                  <n-empty v-else size="small" description="暂无启用报警" />
                </template>

                <template v-else-if="widget.type === 'diff'">
                  <div v-if="boardDiffResults.length" class="board-view-diff-list">
                    <div v-for="item in boardDiffResults" :key="item.id" class="board-view-diff-row">
                      <div>
                        <strong>{{ item.title }}</strong>
                        <span>基线 {{ formatMetricValue(item.baselineValue) }} / 当前 {{ formatMetricValue(item.currentValue) }}</span>
                      </div>
                      <n-tag :type="boardDiffStatusType(item.status)" size="small">
                        {{ formatRatio(item.diffRel) }}
                      </n-tag>
                    </div>
                  </div>
                  <div v-else class="board-view-empty-action">
                    <n-empty size="small" description="暂无 Diff 结果" />
                    <n-button size="small" secondary @click="calculateBoardDiff">计算 Diff</n-button>
                  </div>
                </template>

                <template v-else>
                  <p class="board-view-text">{{ widget.text || '暂无说明' }}</p>
                </template>
              </div>
            </article>

            <n-empty v-if="!boardViewWidgets.length" class="board-view-empty" description="暂无组件，请先编辑看板添加组件">
              <template #extra>
                <n-button type="primary" @click="openBoardEdit()">编辑看板</n-button>
              </template>
            </n-empty>
          </div>
        </template>
      </section>
    </n-spin>

    <n-modal
      v-model:show="statisticCardVisible"
      preset="card"
      title="统计卡片"
      class="statistic-card-modal"
      :bordered="false"
      segmented
      @after-leave="clearStatisticCard"
    >
      <n-space v-if="statisticCardState" vertical>
        <div class="report-summary statistic-summary">
          <div>
            <span>指标名称</span>
            <strong>{{ statisticCardState.metric.metricName }}</strong>
          </div>
          <div>
            <span>实验版本</span>
            <strong>{{ reportVersionName(statisticCardState.result.versionId) }}</strong>
          </div>
          <div>
            <span>基准版本</span>
            <strong>{{ reportVersionName(statisticCardState.baseline?.versionId) }}</strong>
          </div>
          <div>
            <span>显著性</span>
            <strong>{{ significanceLabel(statisticCardState.result.significance) }}</strong>
          </div>
        </div>
        <n-table :bordered="false" size="small">
          <tbody>
            <tr>
              <td>指标值</td>
              <td>{{ reportVersionName(statisticCardState.result.versionId) }}：{{ formatMetricValue(statisticCardState.result.metricValue) }}</td>
              <td>{{ reportVersionName(statisticCardState.baseline?.versionId) }}：{{ formatMetricValue(statisticCardState.baseline?.metricValue ?? null) }}</td>
            </tr>
            <tr>
              <td>相对变化</td>
              <td colspan="2">{{ formatRatio(statisticCardState.result.diffRel) }}</td>
            </tr>
            <tr>
              <td>置信区间</td>
              <td colspan="2">{{ formatConfidenceInterval(statisticCardState.result.confidenceInterval) }}</td>
            </tr>
            <tr>
              <td>P-value</td>
              <td colspan="2">{{ statisticCardState.result.pValue ?? '-' }}</td>
            </tr>
            <tr>
              <td>MDE</td>
              <td colspan="2">{{ formatRatio(statisticCardState.result.mde) }}</td>
            </tr>
          </tbody>
        </n-table>
        <div class="condition-pill">
          {{ statisticExplanation(statisticCardState.result.significance) }}
        </div>
      </n-space>
    </n-modal>

    <n-modal
      v-model:show="groupUserDownloadVisible"
      preset="card"
      title="下载进组用户"
      class="statistic-card-modal"
      :bordered="false"
      segmented
    >
      <n-space vertical>
        <div class="report-summary statistic-summary">
          <div>
            <span>进组人数</span>
            <strong>{{ formatNumber(groupUserDownloadCount) }}</strong>
          </div>
          <div>
            <span>导出方式</span>
            <strong>{{ groupUserDownloadMode === 'blocked' ? '已拦截' : groupUserDownloadMode === 'async' ? '异步导出' : '直接下载' }}</strong>
          </div>
        </div>
        <div class="condition-pill" :class="{ danger: groupUserDownloadMode === 'blocked' }">
          {{ groupUserDownloadHint }}
        </div>
        <div class="download-field-grid">
          <n-tag v-for="field in groupUserDownloadFields" :key="field" size="small">
            {{ field }}
          </n-tag>
        </div>
        <n-space justify="space-between">
          <n-button secondary @click="groupUserPolicyVisible = true">查看口径说明</n-button>
          <n-space>
            <n-button secondary @click="groupUserDownloadVisible = false">取消</n-button>
            <n-button type="primary" :disabled="groupUserDownloadMode === 'blocked'" @click="confirmGroupUserDownload">
              确认下载
            </n-button>
          </n-space>
        </n-space>
      </n-space>
    </n-modal>

    <n-drawer v-model:show="groupUserPolicyVisible" :width="520" placement="right">
      <n-drawer-content title="进组用户口径说明" closable>
        <div class="help-grid">
          <div>
            <strong>统一进组依据</strong>
            <span>普通实验使用 abtest_exposure，推送实验使用 rangers_push_send；同一用户在同一实验版本内只计算一次。</span>
          </div>
          <div>
            <strong>体验一致性</strong>
            <span>开启体验一致性时，用户始终归属于首次命中的实验版本；关闭时，MAB 报告按参数维度解释。</span>
          </div>
          <div>
            <strong>导出限制</strong>
            <span>单次最多导出 500 万条；超过 10 万条进入异步任务，完成后在消息中心提示下载。</span>
          </div>
          <div>
            <strong>下载权限</strong>
            <span>实验管理员、实验创建者可下载；协作者根据项目权限判断；只读用户默认不可下载。</span>
          </div>
        </div>
      </n-drawer-content>
    </n-drawer>

    <n-modal
      v-model:show="reportHelpVisible"
      preset="card"
      title="报告指标说明"
      class="param-preview-modal"
      :bordered="false"
      segmented
    >
      <div class="help-grid">
        <div>
          <strong>P-value</strong>
          <span>用于辅助判断当前差异是否可能由随机波动导致，默认小于 0.05 才进入显著判断。</span>
        </div>
        <div>
          <strong>置信区间</strong>
          <span>展示指标变化率的不确定范围；区间跨过 0 时通常不能判断版本优劣。</span>
        </div>
        <div>
          <strong>MDE</strong>
          <span>当前样本条件下能稳定检出的最小差异，MDE 越小表示检验灵敏度越高。</span>
        </div>
        <div>
          <strong>进组人数</strong>
          <span>按实验曝光事件去重统计，同一用户在同一实验版本内只计算一次。</span>
        </div>
      </div>
    </n-modal>

    <n-modal
      v-model:show="trendFullscreenVisible"
      preset="card"
      :title="`${selectedCoreMetric?.metricName ?? '核心指标'} · ${activeTrendView === 'day' ? '天级趋势' : activeTrendView === 'distribution' ? '概率分布' : '箱型图'}`"
      class="report-fullscreen-modal"
      :bordered="false"
      segmented
    >
      <div class="report-panel fullscreen-panel">
        <div v-if="activeTrendView === 'day'" class="trend-chart trend-chart-fullscreen">
          <div v-for="row in trendChartRows" :key="`full-${row.time}`" class="trend-column">
            <div class="trend-bars">
              <n-tooltip v-for="entry in row.points" :key="`full-${row.time}-${entry.versionId}`">
                <template #trigger>
                  <div class="trend-bar" :style="trendBarStyle(entry)">
                    <i v-if="trendRangeVisible" class="trend-range" :style="trendRangeStyle(entry)" />
                  </div>
                </template>
                {{ row.time }} · {{ reportVersionName(entry.versionId) }} · 指标值 {{ formatMetricValue(entry.point.value) }}
              </n-tooltip>
            </div>
            <small>{{ row.time.slice(5) }}</small>
          </div>
        </div>
        <div v-else-if="activeTrendView === 'distribution'" class="distribution-list">
          <div v-for="row in distributionRows" :key="`full-${row.result.versionId}`" class="distribution-row">
            <div>
              <strong>{{ reportVersionName(row.result.versionId) }}</strong>
              <span>均值 {{ formatMetricValue(row.result.metricValue) }} · 置信区间 {{ formatConfidenceInterval(row.result.confidenceInterval) }}</span>
            </div>
            <div class="distribution-curve">
              <i :style="{ left: `${row.left}%`, width: `${row.width}%`, backgroundColor: row.color }" />
            </div>
          </div>
        </div>
        <div v-else class="boxplot-list">
          <div v-for="row in boxPlotRows" :key="`full-${row.result.versionId}`" class="boxplot-row">
            <span>{{ reportVersionName(row.result.versionId) }}</span>
            <div class="boxplot-track">
              <i class="boxplot-whisker" :style="{ left: `${row.min}%`, width: `${row.max - row.min}%`, backgroundColor: row.color }" />
              <i class="boxplot-box" :style="{ left: `${row.q1}%`, width: `${row.q3 - row.q1}%`, borderColor: row.color }" />
              <i class="boxplot-median" :style="{ left: `${row.median}%`, backgroundColor: row.color }" />
            </div>
            <strong>{{ formatMetricValue(row.result.metricValue) }}</strong>
          </div>
        </div>
      </div>
    </n-modal>

    <n-modal
      v-model:show="actionConfirmVisible"
      preset="card"
      :title="actionConfirmInfo.title"
      class="param-preview-modal"
      :bordered="false"
      segmented
    >
      <n-space vertical>
        <div class="check-list">
          <div class="check-row">
            <n-tag type="warning" size="small">影响说明</n-tag>
            <span>{{ actionConfirmInfo.impact }}</span>
          </div>
          <div class="check-row">
            <n-tag type="info" size="small">缓存提示</n-tag>
            <span>{{ actionConfirmInfo.cacheHint }}</span>
          </div>
          <div class="check-row">
            <n-tag type="error" size="small">风险提示</n-tag>
            <span>{{ actionConfirmInfo.risk }}</span>
          </div>
          <div v-if="pendingAction?.action === 'restart'" class="check-row">
            <n-tag :type="actionConfirmInfo.restartBlocked ? 'error' : 'success'" size="small">24 小时限制</n-tag>
            <span>{{ actionConfirmInfo.restartHint }}</span>
          </div>
        </div>
        <n-space vertical>
          <n-checkbox v-model:checked="actionConfirmChecks.impact">已阅读并确认影响范围</n-checkbox>
          <n-checkbox v-model:checked="actionConfirmChecks.cache">已确认缓存刷新或缓存残留提示</n-checkbox>
          <n-checkbox v-model:checked="actionConfirmChecks.risk">已接受缩量、冻结或真实流量风险</n-checkbox>
          <n-checkbox
            v-if="pendingAction?.action === 'restart'"
            v-model:checked="actionConfirmChecks.restartLimit"
            :disabled="actionConfirmInfo.restartBlocked"
          >
            已确认满足 24 小时重启限制
          </n-checkbox>
        </n-space>
        <n-space justify="end">
          <n-button secondary @click="actionConfirmVisible = false">取消</n-button>
          <n-button type="primary" :disabled="!canConfirmHighRiskAction" @click="confirmHighRiskAction">
            确认执行
          </n-button>
        </n-space>
      </n-space>
    </n-modal>

    <n-modal
      v-model:show="templateModalVisible"
      preset="card"
      title="模板创建实验"
      class="param-preview-modal"
      :bordered="false"
      segmented
    >
      <n-space vertical>
        <n-select
          v-model:value="selectedTemplateId"
          :options="abStore.experimentTemplateOptions.map((template) => ({ label: template.name, value: template.id }))"
        />
        <div class="template-grid">
          <button
            v-for="template in abStore.experimentTemplateOptions"
            :key="template.id"
            class="link-card template-card"
            :class="{ selected: selectedTemplateId === template.id }"
            @click="selectedTemplateId = template.id"
          >
            <strong>{{ template.name }}</strong>
            <span>{{ typeLabels[template.type] }}</span>
            <small>{{ template.description }}</small>
            <n-space size="small">
              <n-tag v-for="tag in template.tags" :key="tag" size="small">{{ tag }}</n-tag>
            </n-space>
            <n-space size="small">
              <n-tag v-for="field in template.lockedFields" :key="field" type="warning" size="small">
                固化 {{ templateLockedFieldLabels[field] }}
              </n-tag>
            </n-space>
            <small>默认 {{ template.defaultDurationDays }} 天 · {{ formatPercent(template.defaultTrafficRatio) }} 流量</small>
          </button>
        </div>
        <n-space justify="end">
          <n-button secondary @click="templateModalVisible = false">取消</n-button>
          <n-button type="primary" @click="applySelectedTemplate">使用模板</n-button>
        </n-space>
      </n-space>
    </n-modal>

    <n-drawer v-model:show="featureLogDetailVisible" placement="right" :width="680">
      <n-drawer-content :title="activeFeatureSubPage === 'logs' ? '操作日志详情' : '发布历史详情'">
        <n-space v-if="selectedFeatureLog" vertical>
          <n-descriptions :column="2" bordered size="small">
            <n-descriptions-item label="Feature">{{ getFeatureFromLog(selectedFeatureLog)?.name ?? selectedFeatureLog.objectId }}</n-descriptions-item>
            <n-descriptions-item label="Key">{{ getFeatureFromLog(selectedFeatureLog)?.key ?? '-' }}</n-descriptions-item>
            <n-descriptions-item label="App">{{ getFeatureFromLog(selectedFeatureLog)?.appId ?? '-' }}</n-descriptions-item>
            <n-descriptions-item label="操作类型">{{ formatFeatureLogAction(selectedFeatureLog.action) }}</n-descriptions-item>
            <n-descriptions-item label="操作前版本">{{ getFeatureHistoryBeforeVersion(selectedFeatureLog) }}</n-descriptions-item>
            <n-descriptions-item label="操作后版本">{{ getFeatureHistoryAfterVersion(selectedFeatureLog) }}</n-descriptions-item>
            <n-descriptions-item label="操作前流量">{{ getFeatureHistoryBeforeTraffic(selectedFeatureLog) }}</n-descriptions-item>
            <n-descriptions-item label="操作后流量">{{ getFeatureHistoryAfterTraffic(selectedFeatureLog) }}</n-descriptions-item>
            <n-descriptions-item label="发布状态">{{ formatFeatureLogStatus(selectedFeatureLog) }}</n-descriptions-item>
            <n-descriptions-item label="发布类型">{{ getFeatureHistoryPublishType(selectedFeatureLog) }}</n-descriptions-item>
            <n-descriptions-item label="操作人">{{ selectedFeatureLog.operatorName }}</n-descriptions-item>
            <n-descriptions-item label="时间">{{ formatDateTime(selectedFeatureLog.createdAt) }}</n-descriptions-item>
            <n-descriptions-item label="描述">{{ getFeatureHistoryDescription(selectedFeatureLog) }}</n-descriptions-item>
          </n-descriptions>
          <n-grid :cols="2" :x-gap="12" :y-gap="12" responsive="screen">
            <n-gi>
              <label class="field-label">操作前受众</label>
              <div class="condition-pill">{{ getFeatureHistoryAudience(selectedFeatureLog, 'before') }}</div>
            </n-gi>
            <n-gi>
              <label class="field-label">操作后受众</label>
              <div class="condition-pill">{{ getFeatureHistoryAudience(selectedFeatureLog, 'after') }}</div>
            </n-gi>
          </n-grid>
          <strong>版本差异</strong>
          <n-table v-if="getFeatureHistoryDiffRows(selectedFeatureLog).length" :bordered="false" size="small">
            <thead>
              <tr>
                <th>差异字段</th>
                <th>操作前</th>
                <th>操作后</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in getFeatureHistoryDiffRows(selectedFeatureLog)" :key="row.key">
                <td>{{ row.field }}</td>
                <td><code>{{ row.before }}</code></td>
                <td><code>{{ row.after }}</code></td>
              </tr>
            </tbody>
          </n-table>
          <n-empty v-else description="暂无版本差异" />
          <n-grid :cols="2" :x-gap="12" responsive="screen">
            <n-gi>
              <label class="field-label">原始变更前</label>
              <pre class="code-block">{{ formatFeatureLogPayload(selectedFeatureLog.before) }}</pre>
            </n-gi>
            <n-gi>
              <label class="field-label">原始变更后</label>
              <pre class="code-block">{{ formatFeatureLogPayload(selectedFeatureLog.after) }}</pre>
            </n-gi>
          </n-grid>
          <n-space justify="end">
            <n-button secondary @click="copySelectedFeatureLogDetail">复制详情</n-button>
            <n-button secondary @click="jumpToFeatureFromLog()">跳转 Feature</n-button>
            <n-button type="primary" @click="featureLogDetailVisible = false">关闭</n-button>
          </n-space>
        </n-space>
        <n-empty v-else description="请选择日志" />
      </n-drawer-content>
    </n-drawer>

    <n-modal
      v-model:show="featurePublishConfirmVisible"
      preset="card"
      title="确认发布 Feature"
      class="permission-modal"
      :bordered="false"
      segmented
    >
      <n-space vertical>
        <n-descriptions :column="2" bordered size="small">
          <n-descriptions-item v-for="row in featurePublishConfirmRows" :key="row.label" :label="row.label">
            {{ row.value }}
          </n-descriptions-item>
        </n-descriptions>
        <strong>版本差异</strong>
        <n-table v-if="selectedFeatureVersionDiffRows.length" :bordered="false" size="small">
          <thead>
            <tr>
              <th>差异字段</th>
              <th>旧值</th>
              <th>新值</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in selectedFeatureVersionDiffRows" :key="row.key">
              <td>{{ row.field }}</td>
              <td><code>{{ row.before }}</code></td>
              <td><code>{{ row.after }}</code></td>
            </tr>
          </tbody>
        </n-table>
        <n-empty v-else description="暂无版本差异" />
        <div class="validation-list warning-validation">
          <span>确认发布后将按当前发布计划对线上用户生效。</span>
          <span v-if="featurePublishDraft.publishType === 'scheduled'">定时发布未到首次发布时间前可取消发布。</span>
        </div>
        <n-space justify="end">
          <n-button secondary @click="featurePublishConfirmVisible = false">取消</n-button>
          <n-button type="primary" @click="publishSelectedFeatureVersion">确认发布</n-button>
        </n-space>
      </n-space>
    </n-modal>

    <n-modal
      v-model:show="featureImagePreviewVisible"
      preset="card"
      title="配图预览"
      class="param-preview-modal"
      :bordered="false"
      segmented
    >
      <img v-if="featureVariantPreviewUrl" :src="featureVariantPreviewUrl" alt="Feature 配图预览" class="feature-image-modal-preview" />
      <n-empty v-else description="暂无配图" />
    </n-modal>

    <n-modal
      v-model:show="featurePermissionModalVisible"
      preset="card"
      title="Feature 权限管理"
      class="permission-modal"
      :bordered="false"
      segmented
    >
      <n-space vertical>
        <n-descriptions v-if="selectedFeature" :column="2" bordered size="small">
          <n-descriptions-item label="Feature">{{ selectedFeature.name }}</n-descriptions-item>
          <n-descriptions-item label="当前权限">{{ featurePermissionCurrentLevelLabel }}</n-descriptions-item>
          <n-descriptions-item label="Owner">{{ selectedFeature.owners.join('、') }}</n-descriptions-item>
          <n-descriptions-item label="当前权限说明">
            {{ featurePermissionDraftHint }}
          </n-descriptions-item>
        </n-descriptions>
        <n-grid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
          <n-gi>
            <label class="field-label">Feature 类型</label>
            <n-select v-model:value="featurePermissionDraftType" :options="featureTypeOptions" />
          </n-gi>
          <n-gi>
            <label class="field-label">生效规则</label>
            <div class="condition-pill">
              {{ featurePermissionDraftHint }}
            </div>
          </n-gi>
        </n-grid>
        <n-space justify="end">
          <n-button secondary @click="featurePermissionModalVisible = false">取消</n-button>
          <n-button type="primary" :disabled="!selectedFeatureCanManagePermission" @click="saveFeaturePermissionDraft">确定</n-button>
        </n-space>
      </n-space>
    </n-modal>

    <n-modal
      v-model:show="permissionModalVisible"
      preset="card"
      title="实验权限管理"
      class="permission-modal"
      :bordered="false"
      segmented
    >
      <n-space vertical>
        <n-grid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
          <n-gi>
            <label class="field-label">公开/私有</label>
            <n-select v-model:value="permissionDraft.visibility" :options="visibilityOptions.slice(1)" />
          </n-gi>
          <n-gi>
            <label class="field-label">授权说明</label>
            <div class="condition-pill">
              {{ permissionDraft.visibility === 'PUBLIC' ? '公共实验对应用成员可见' : '私有实验仅 Owner 与授权对象可见' }}
            </div>
          </n-gi>
        </n-grid>
        <n-divider />
        <n-space justify="space-between" align="center">
          <span class="cell-subtitle">已添加 {{ permissionDraft.grants.length }} 条授权</span>
          <n-button secondary @click="addPermissionGrant">添加用户/角色</n-button>
        </n-space>
        <n-table v-if="permissionDraft.grants.length" :bordered="false" :single-line="false" size="small">
          <thead>
            <tr>
              <th>对象类型</th>
              <th>用户/角色</th>
              <th>权限</th>
              <th>有效期</th>
              <th>备注</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="grant in permissionDraft.grants" :key="grant.id">
              <td>
                <n-select
                  :value="grant.subjectType"
                  :options="permissionSubjectTypeOptions"
                  @update:value="(value) => updatePermissionSubjectType(grant, String(value))"
                />
              </td>
              <td>
                <n-select
                  :value="grant.subjectId"
                  filterable
                  :options="grant.subjectType === 'USER' ? permissionSubjectOptions.userOptions : permissionSubjectOptions.roleOptions"
                  @update:value="(value) => updatePermissionSubject(grant, String(value))"
                />
              </td>
              <td>
                <n-select v-model:value="grant.permissionType" :options="permissionTypeOptions" />
              </td>
              <td>
                <n-input v-model:value="grant.expiresAt" placeholder="YYYY-MM-DD，可为空" />
              </td>
              <td>
                <n-input v-model:value="grant.remark" placeholder="授权原因或备注" />
              </td>
              <td>
                <n-button size="small" secondary @click="removePermissionGrant(grant.id)">移除</n-button>
              </td>
            </tr>
          </tbody>
        </n-table>
        <n-empty v-else description="暂无授权对象" />
        <n-space justify="end">
          <n-button secondary @click="permissionModalVisible = false">取消</n-button>
          <n-button type="primary" @click="savePermissionDraft">保存权限</n-button>
        </n-space>
      </n-space>
    </n-modal>

    <n-modal
      v-model:show="previewModalVisible"
      preset="card"
      title="参数预览"
      class="param-preview-modal"
      :bordered="false"
      segmented
    >
      <n-grid :cols="3" :x-gap="16" :y-gap="16" responsive="screen">
        <n-gi>
          <n-select v-model:value="previewVariantTempId" :options="previewVariantOptions" />
          <div class="preview-version-list">
            <button
              v-for="variant in draftExperiment.variants"
              :key="variant.tempId"
              class="link-card preview-version-card"
              :class="{ selected: previewVariantTempId === variant.tempId }"
              @click="previewVariantTempId = variant.tempId"
            >
              <strong>{{ variant.name }}</strong>
              <span>{{ variant.isControl ? '对照组' : '实验组' }} · {{ formatPercent(variant.trafficRatio) }}</span>
            </button>
          </div>
        </n-gi>
        <n-gi :span="2">
          <div class="param-preview-json">
            <pre>{{ previewJson }}</pre>
          </div>
          <n-divider />
          <div class="mini-section">
            <strong>与对照组差异</strong>
            <div v-if="previewDiffEntries.length" class="check-list">
              <div v-for="entry in previewDiffEntries" :key="entry.key" class="check-row">
                <n-tag size="small">{{ entry.key }}</n-tag>
                <span>对照 {{ entry.control }} / 当前 {{ entry.current }}</span>
              </div>
            </div>
            <n-empty v-else description="暂无差异" />
          </div>
        </n-gi>
      </n-grid>
    </n-modal>

    <n-modal
      v-model:show="uniformDetailModalVisible"
      preset="card"
      title="增强分流均匀性详情"
      class="param-preview-modal"
      :bordered="false"
      segmented
    >
      <n-space vertical>
        <n-space align="center">
          <n-tag :type="uniformStatusTagType" size="small">{{ draftUniformStatusLabel }}</n-tag>
          <span v-if="uniformTaskDetail.taskId">任务 ID：{{ uniformTaskDetail.taskId }}</span>
          <span>运行 {{ uniformTaskDetail.runTimes }} / {{ uniformTaskDetail.maxRunTimes }} 次</span>
          <span>P 值阈值 {{ uniformTaskDetail.pValueThreshold }}</span>
        </n-space>
        <n-progress type="line" :percentage="uniformTaskDetail.progress" :height="10" />
        <div class="preview-grid">
          <div>
            <span>最低 P 值</span>
            <strong>{{ uniformTaskDetail.minPValue ?? '-' }}</strong>
          </div>
          <div>
            <span>均衡分</span>
            <strong>{{ uniformTaskDetail.balanceScore ?? '-' }}</strong>
          </div>
          <div>
            <span>应用状态</span>
            <strong>{{ uniformTaskDetail.locked ? '已锁定' : '未锁定' }}</strong>
          </div>
        </div>
        <n-table v-if="uniformTaskDetail.metricResults.length" :bordered="false" size="small">
          <thead>
            <tr>
              <th>指标</th>
              <th>P 值</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in uniformTaskDetail.metricResults" :key="item.metricId">
              <td>{{ item.metricName }}</td>
              <td>{{ item.pValue }}</td>
              <td>
                <n-tag :type="item.passed ? 'success' : 'error'" size="small">
                  {{ item.passed ? '通过' : '未通过' }}
                </n-tag>
              </td>
            </tr>
          </tbody>
        </n-table>
        <n-table v-if="uniformTaskDetail.segmentResults.length" :bordered="false" size="small">
          <thead>
            <tr>
              <th>人群</th>
              <th>样本量</th>
              <th>P 值</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in uniformTaskDetail.segmentResults" :key="item.segmentId">
              <td>{{ item.segmentName }}</td>
              <td>{{ formatNumber(item.sampleSize) }}</td>
              <td>{{ item.pValue }}</td>
              <td>
                <n-tag :type="item.passed ? 'success' : 'error'" size="small">
                  {{ item.passed ? '通过' : '未通过' }}
                </n-tag>
              </td>
            </tr>
          </tbody>
        </n-table>
        <div class="mini-section">
          <strong>任务日志</strong>
          <div v-for="log in uniformTaskDetail.logs" :key="log.id" class="condition-pill">
            {{ formatDateTime(log.createdAt) }} · {{ log.message }}
          </div>
          <n-empty v-if="!uniformTaskDetail.logs.length" description="暂无日志" />
        </div>
      </n-space>
    </n-modal>

    <n-modal
      v-model:show="smoothLogModalVisible"
      preset="card"
      title="平滑生效任务日志"
      class="param-preview-modal"
      :bordered="false"
      segmented
    >
      <n-space v-if="planningBundle?.smoothTask" vertical>
        <n-space align="center">
          <n-tag :type="smoothTaskStatusType" size="small">{{ planningBundle.smoothTask.status }}</n-tag>
          <span>任务 ID：{{ planningBundle.smoothTask.id }}</span>
          <span>
            {{ formatPercent(planningBundle.smoothTask.currentTrafficRatio) }} /
            {{ formatPercent(planningBundle.smoothTask.targetTrafficRatio) }}
          </span>
        </n-space>
        <n-progress type="line" :percentage="smoothTaskProgress" :height="10" />
        <div class="snapshot-list">
          <div v-for="log in selectedSmoothTaskLogs" :key="log.id" class="snapshot-row">
            <div>
              <strong>{{ log.action }}</strong>
              <span>{{ formatDateTime(log.createdAt) }} · {{ log.operatorName }}</span>
              <small>{{ JSON.stringify(log.after ?? {}) }}</small>
            </div>
          </div>
        </div>
        <n-empty v-if="!selectedSmoothTaskLogs.length" description="暂无操作日志" />
      </n-space>
      <n-empty v-else description="暂无平滑任务" />
    </n-modal>
  </div>
</template>

<style scoped>
.ab-workbench {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.ab-page-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.experiment-filter-bar {
  display: grid;
  gap: 12px;
}

.experiment-filter-bar :deep(.n-space) {
  flex-wrap: wrap;
}

.table-footer {
  margin-top: 14px;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.template-card {
  min-height: 150px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #ffffff;
}

.template-card span,
.template-card small {
  color: #64748b;
  line-height: 1.5;
}

.permission-modal {
  width: min(1080px, calc(100vw - 32px));
}

.warning-text {
  color: #b45309;
}

.locked-panel {
  position: relative;
  opacity: 0.78;
}

.locked-panel :deep(.n-input),
.locked-panel :deep(.n-select),
.locked-panel :deep(.n-checkbox),
.locked-panel :deep(.n-button) {
  pointer-events: none;
}

	.ab-section-stack {
	  display: flex;
	  flex-direction: column;
	  gap: 16px;
	}

	.ab-create-steps {
	  position: sticky;
	  top: 12px;
	  z-index: 3;
	}

.ab-stat-card {
  min-height: 126px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 18px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
}

.ab-stat-card span,
.report-summary span,
.recommendation-grid span,
.cell-subtitle,
.card-desc,
.feature-row span,
.version-card span,
.plan-card span,
.traffic-layer span,
.alarm-row span,
.sensitive-task span {
  color: #64748b;
  font-size: 12px;
}

.ab-stat-card strong {
  color: #0f172a;
  font-size: 34px;
  line-height: 1.1;
}

.ab-stat-card small {
  color: #475569;
}

.stat-blue {
  border-left: 4px solid #2563eb;
}

.stat-green {
  border-left: 4px solid #16a34a;
}

.stat-amber {
  border-left: 4px solid #d97706;
}

.stat-purple {
  border-left: 4px solid #7c3aed;
}

.experiment-stack,
.coverage-list,
.feature-list,
.sensitive-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.experiment-row,
.coverage-row,
.variant-line,
.feature-row,
.version-card,
.plan-card,
.traffic-layer,
.mutex-domain,
.sensitive-task,
.health-row,
.alarm-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  background: #ffffff;
}

.experiment-row > div,
.coverage-row > div,
.alarm-row > div,
.sensitive-task > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.link-button,
.type-card,
.feature-row,
.link-card {
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.link-button {
  color: #2563eb;
  font-weight: 600;
  padding: 0;
}

.cell-subtitle {
  display: block;
  margin-top: 4px;
}

.mini-section,
.list-block,
.tool-panel,
.mutex-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tools-page {
  gap: 18px;
}

.tool-card {
  min-width: 0;
}

.tool-query-card :deep(.n-card__content),
.tool-card :deep(.n-card__content) {
  min-width: 0;
}

.tool-query-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  align-items: end;
}

.tool-field,
.tool-field > * {
  min-width: 0;
}

.tool-sort-controls {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) 96px;
  gap: 8px;
}

.tool-actions,
.tool-status-line {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.tool-actions {
  margin-top: 14px;
}

.tool-result-panel {
  min-height: 112px;
  margin-top: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  background: #f8fafc;
  overflow-x: auto;
}

.tool-result-panel :deep(.n-empty) {
  min-height: 88px;
  justify-content: center;
}

.tools-split-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
  align-items: stretch;
}

.tool-inline-form {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(220px, 1fr) auto;
  gap: 10px;
  align-items: center;
}

.tool-empty {
  min-height: 100%;
  display: grid;
  place-items: center;
  border: 1px dashed #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}

.tool-diagnosis-card {
  height: 380px;
  overflow: hidden;
}

.tool-diagnosis-card :deep(.n-card-content) {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.tool-diagnosis-panel {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.tool-diagnosis-scroll {
  min-height: 0;
  flex: 1;
  display: grid;
  gap: 10px;
  overflow-y: auto;
  padding-right: 4px;
}

.tool-diagnosis-scroll .snapshot-list {
  align-content: start;
}

.tool-list-row {
  align-items: flex-start;
}

.tool-task-list {
  display: grid;
  gap: 10px;
}

.tool-dedup-form {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  align-items: center;
}

.tool-dedup-form > * {
  min-width: 0;
}

.tool-dedup-form :deep(.n-input-number) {
  width: 100%;
}

.tool-table-panel {
  margin-top: 14px;
  overflow-x: auto;
}

.mini-section + .mini-section {
  margin-top: 16px;
}

.mini-section p,
.report-text {
  margin: 0;
  color: #334155;
  line-height: 1.7;
}

.muted {
  color: #64748b;
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

	.type-card {
	  min-height: 96px;
	  border: 1px solid #e5e7eb;
	  border-radius: 8px;
	  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
	  background: #ffffff;
	}

	.type-card.disabled {
	  cursor: not-allowed;
	  opacity: 0.68;
	  background: #f8fafc;
	}

	.type-card-title,
	.param-field-head,
	.wizard-toolbar {
	  display: flex;
	  align-items: center;
	  justify-content: space-between;
	  gap: 10px;
	}

	.type-card small {
	  color: #94a3b8;
	  font-size: 11px;
	  font-weight: 700;
	}

	.type-card em {
	  color: #b45309;
	  font-size: 12px;
	  font-style: normal;
	  line-height: 1.5;
	}

.type-card.selected,
.feature-row.selected,
.link-card.selected {
  border-color: #2563eb;
  background: #eff6ff;
}

.type-card span {
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.field-label {
  display: block;
  margin-bottom: 6px;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
}

.check-list,
.metric-links,
.feature-version-list,
.mab-grid,
.funnel-list,
.heatmap-grid,
.recommendation-grid,
.wizard-stack,
.preview-grid,
.snapshot-list {
  display: grid;
  gap: 12px;
}

.check-row,
.condition-pill,
.decision-result {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px 12px;
  background: #f8fafc;
}

.condition-pill.danger {
  border-color: #fecaca;
  background: #fef2f2;
  color: #991b1b;
}

.export-task-row {
  align-items: flex-start;
}

.task-actions {
  min-width: 180px;
  display: grid;
  gap: 8px;
}

.compact-row {
  display: grid;
  grid-template-columns: minmax(86px, 0.8fr) minmax(0, 1.2fr);
  gap: 8px;
  align-items: center;
}

.compact-row span {
  min-width: 0;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
}

.link-card {
  width: 100%;
  cursor: pointer;
}

.version-card small,
.plan-card small {
  color: #64748b;
  line-height: 1.5;
}

.priority-lane {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.priority-lane span {
  min-height: 42px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
  color: #1e3a8a;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
}

.feature-page {
  gap: 16px;
}

.feature-tabs-card :deep(.n-card__content),
.feature-tabs-card :deep(.n-card-content) {
  padding-bottom: 10px;
}

.feature-create-layout,
.feature-detail-layout {
  display: grid;
  gap: 16px;
}

.feature-create-layout {
  grid-template-columns: minmax(0, 1fr) 260px;
  align-items: start;
}

.feature-create-main-card :deep(.n-card-header),
.feature-detail-main-card :deep(.n-card-header),
.feature-code-card :deep(.n-card-header) {
  align-items: flex-start;
  gap: 12px;
}

.feature-create-main-card :deep(.n-card-header__extra),
.feature-detail-main-card :deep(.n-card-header__extra),
.feature-code-card :deep(.n-card-header__extra) {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.feature-create-help-card {
  min-height: 132px;
  position: sticky;
  top: 16px;
}

.help-section-link {
  appearance: none;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  color: #334155;
  cursor: pointer;
  font: inherit;
  padding: 6px 10px;
  text-align: left;
}

.help-section-link.active {
  background: #e0f2fe;
  border-color: #7dd3fc;
  color: #075985;
}

.feature-form-section {
  display: grid;
  gap: 12px;
}

.feature-form-section > strong,
.feature-code-notes strong {
  color: #0f172a;
  font-size: 16px;
}

.variant-editor-row {
  display: grid;
  grid-template-columns: minmax(110px, 0.9fr) minmax(120px, 1fr) minmax(140px, 1fr) minmax(160px, 1.2fr) minmax(150px, 1fr) auto;
  gap: 8px;
  align-items: center;
}

.feature-variable-row,
.feature-condition-row,
.feature-delivery-row {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) minmax(120px, 1fr) minmax(110px, 0.8fr) minmax(120px, 1fr) minmax(160px, 1.2fr) auto auto;
  gap: 8px;
  align-items: center;
}

.feature-condition-row {
  grid-template-columns: minmax(120px, 1fr) minmax(150px, 1fr) minmax(120px, 1fr) minmax(150px, 1fr) auto;
}

.feature-delivery-row {
  grid-template-columns: minmax(160px, 220px) minmax(0, 1fr);
}

.feature-audience-rule {
  display: grid;
  gap: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  background: #ffffff;
}

.feature-audience-rule[draggable="true"] {
  cursor: grab;
}

.feature-audience-rule.dragging {
  border-color: #38bdf8;
  background: #f0f9ff;
  opacity: 0.86;
}

.feature-audience-else {
  border-style: dashed;
  background: #f8fafc;
}

.feature-weight-grid {
  display: grid;
  gap: 8px;
}

.feature-weight-row {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) 120px;
  gap: 8px;
  align-items: center;
}

.whitelist-rule-list {
  display: grid;
  gap: 10px;
}

.whitelist-rule-list > strong {
  color: #0f172a;
  font-size: 14px;
}

.whitelist-rule-list small {
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.whitelist-rule-row {
  min-width: 0;
  display: grid;
  grid-template-columns: auto minmax(180px, 0.9fr) minmax(220px, 1.1fr);
  gap: 8px;
  align-items: center;
}

.whitelist-rule-row > span {
  min-width: 0;
  color: #475569;
  font-size: 12px;
  line-height: 1.5;
}

.feature-image-uploader,
.feature-param-validation,
.variant-image-cell {
  min-width: 0;
  display: grid;
  gap: 8px;
}

.feature-image-uploader small {
  color: #64748b;
  font-size: 12px;
}

.image-preview-button {
  width: 112px;
  height: 72px;
  padding: 0;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  cursor: pointer;
}

.image-preview-button img,
.feature-image-modal-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.feature-image-modal-preview {
  max-height: 70vh;
  object-fit: contain;
}

.warning-validation {
  border-color: #fed7aa;
  background: #fff7ed;
  color: #9a3412;
}

.muted-validation {
  border-color: #cbd5e1;
  background: #f8fafc;
  color: #475569;
}

.validation-list {
  display: grid;
  gap: 8px;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 12px;
  background: #fef2f2;
  color: #991b1b;
}

.code-block {
  max-height: 420px;
  overflow: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 14px;
  background: #0f172a;
  color: #e2e8f0;
  white-space: pre-wrap;
  word-break: break-word;
}

.compact-code {
  max-height: 220px;
}

.feature-kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.feature-kpi-grid > div,
.feature-code-notes {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  background: #f8fafc;
}

.feature-kpi-grid span,
.feature-version-summary span,
.feature-code-notes span {
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.feature-kpi-grid strong {
  display: block;
  margin-top: 6px;
  color: #0f172a;
  font-size: 20px;
  line-height: 1.2;
}

.feature-entry-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
}

.feature-detail-grid,
.feature-version-workspace,
.feature-code-layout {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  align-items: stretch;
}

.feature-detail-wide-card {
  grid-column: 1 / -1;
}

.feature-fixed-card {
  height: 280px;
  overflow: hidden;
}

.feature-fixed-card :deep(.n-card__content),
.feature-fixed-card :deep(.n-card-content),
.feature-fixed-tall-card :deep(.n-card__content),
.feature-fixed-tall-card :deep(.n-card-content),
.feature-medium-card :deep(.n-card__content),
.feature-medium-card :deep(.n-card-content),
.feature-version-list-card :deep(.n-card__content),
.feature-version-list-card :deep(.n-card-content),
.feature-version-editor-card :deep(.n-card__content),
.feature-version-editor-card :deep(.n-card-content) {
  min-height: 0;
  overflow-y: auto;
}

.feature-version-summary,
.feature-mini-list,
.feature-code-notes {
  min-height: 0;
  display: grid;
  gap: 10px;
}

.feature-version-summary > div:first-child {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.feature-mini-list {
  max-height: 184px;
  overflow-y: auto;
  padding-right: 4px;
}

.feature-version-workspace {
  grid-template-columns: minmax(320px, 380px) minmax(0, 1fr);
}

.feature-version-list-card,
.feature-version-editor-card {
  height: 640px;
  overflow: hidden;
}

.feature-scroll-list {
  max-height: 542px;
  overflow-y: auto;
  padding-right: 4px;
}

.feature-version-rule-grid,
.feature-calculation-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.feature-code-layout {
  grid-template-columns: minmax(0, 1.35fr) minmax(260px, 0.65fr);
}

.feature-code-layout > div:first-child {
  min-width: 0;
  display: grid;
  gap: 12px;
}

.feature-code-notes {
  align-content: start;
}

.feature-dual-grid {
  align-items: stretch;
}

.feature-fixed-tall-card {
  height: 560px;
  overflow: hidden;
}

.feature-medium-card {
  height: 320px;
  overflow: hidden;
}

.lifecycle-card {
  min-width: 0;
}

.lifecycle-prompt-card,
.lifecycle-summary-grid > div {
  min-height: 112px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lifecycle-prompt-card strong,
.lifecycle-summary-grid strong {
  color: #0f172a;
  font-size: 18px;
}

.lifecycle-prompt-card span,
.lifecycle-summary-grid span,
.lifecycle-timeline-row span,
.lifecycle-timeline-row small {
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.lifecycle-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 10px;
}

.lifecycle-chart {
  position: relative;
  height: 178px;
  margin-top: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
  overflow: hidden;
}

.lifecycle-chart svg {
  position: absolute;
  inset: 12px;
  width: calc(100% - 24px);
  height: calc(100% - 24px);
}

.lifecycle-chart-point {
  position: absolute;
  width: 8px;
  height: 8px;
  border: 2px solid #ffffff;
  border-radius: 999px;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.12);
}

.lifecycle-timeline-row {
  display: grid;
  gap: 4px;
}

.wizard-card {
	  border: 1px solid #e5e7eb;
	  border-radius: 8px;
	  padding: 14px;
	  background: #ffffff;
	}

	.param-schema-list,
	.preview-version-list {
	  display: flex;
	  flex-direction: column;
	  gap: 10px;
	}

	.param-schema-row {
	  border: 1px solid #e5e7eb;
	  border-radius: 8px;
	  padding: 12px;
	  background: #f8fafc;
	}

	.preview-version-list {
	  margin-top: 12px;
	}

	.preview-version-card {
	  width: 100%;
	  border: 1px solid #e5e7eb;
	  border-radius: 8px;
	  padding: 10px 12px;
	  display: flex;
	  flex-direction: column;
	  gap: 4px;
	  background: #ffffff;
	}

	.preview-version-card span {
	  color: #64748b;
	  font-size: 12px;
	}

	.param-preview-modal {
	  width: min(920px, calc(100vw - 32px));
	}

	.param-preview-json {
	  max-height: 420px;
	  overflow: auto;
	  border: 1px solid #e5e7eb;
	  border-radius: 8px;
	  padding: 12px;
	  background: #0f172a;
	}

	.param-preview-json pre {
	  margin: 0;
	  color: #e2e8f0;
	  white-space: pre-wrap;
	  word-break: break-word;
	}

.wizard-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.wizard-card-head > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.wizard-card-head span,
.preview-grid span {
  color: #64748b;
  font-size: 12px;
}

.condition-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.audience-group-list,
.mvt-variant-grid {
  display: grid;
  gap: 12px;
}

.audience-group-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  background: #f8fafc;
}

.audience-condition-row {
  display: grid;
  grid-template-columns: minmax(110px, 0.8fr) minmax(120px, 1fr) minmax(110px, 0.8fr) minmax(160px, 1.2fr) 96px 58px;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
}

.audience-estimate {
  display: grid;
  gap: 12px;
}

.traffic-row-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.traffic-row-head > div,
.mutex-domain > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mutex-domain small {
  color: #64748b;
  font-size: 12px;
}

.snapshot-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px 12px;
  background: #ffffff;
}

.snapshot-row > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.snapshot-row span {
  color: #64748b;
  font-size: 12px;
}

.metric-snapshot-list small {
  color: #64748b;
  font-size: 12px;
}

.condition-pill,
.decision-result {
  margin-bottom: 10px;
}

.report-title-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.report-title-block span,
.report-meta-grid span,
.conclusion-action span,
.distribution-row span,
.distribution-row small,
.boxplot-row span,
.help-grid span {
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.report-title-block strong {
  color: #0f172a;
  font-size: 18px;
}

.report-meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.report-meta-grid > div {
  min-height: 76px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 8px;
  background: #ffffff;
}

.report-meta-grid strong {
  color: #0f172a;
  font-size: 15px;
  line-height: 1.35;
}

.report-entry-button {
  width: fit-content;
  color: #0f172a;
  font-size: 20px;
}

.report-policy-link {
  width: fit-content;
  font-size: 12px;
}

.report-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.report-summary > div,
.recommendation-grid > div {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.report-summary strong,
.recommendation-grid strong,
.board-value {
  color: #0f172a;
  font-size: 20px;
}

.report-summary small {
  color: #64748b;
  font-size: 12px;
}

.statistic-summary {
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  margin-bottom: 0;
}

.statistic-summary strong {
  font-size: 16px;
}

.conclusion-banner,
.report-panel {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 14px;
  background: #ffffff;
}

.conclusion-banner {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  border-left-width: 4px;
}

.conclusion-banner > div:first-child,
.conclusion-action,
.report-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.conclusion-banner strong {
  color: #0f172a;
  font-size: 18px;
}

.conclusion-banner span {
  color: #475569;
  line-height: 1.6;
}

.conclusion-banner.success {
  border-left-color: #16a34a;
  background: #f0fdf4;
}

.conclusion-banner.error {
  border-left-color: #dc2626;
  background: #fef2f2;
}

.conclusion-banner.warning {
  border-left-color: #d97706;
  background: #fffbeb;
}

.conclusion-banner.info {
  border-left-color: #2563eb;
  background: #eff6ff;
}

.metric-diff-cell {
  cursor: pointer;
  border-radius: 6px;
  font-weight: 700;
}

.metric-diff-cell.positive {
  background: #dcfce7;
  color: #166534;
}

.metric-diff-cell.negative,
.metric-diff-cell.error {
  background: #fee2e2;
  color: #991b1b;
}

.metric-diff-cell.neutral,
.metric-diff-cell.insufficient {
  background: #f8fafc;
  color: #475569;
}

.metric-workspace {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 16px;
  align-items: flex-start;
}

.metric-selector-filter-panel {
  display: grid;
  grid-template-columns: minmax(220px, 1.2fr) repeat(4, minmax(120px, 0.7fr));
  gap: 10px;
  margin-bottom: 14px;
}

.metric-left-nav {
  position: sticky;
  top: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: calc(100vh - 160px);
  overflow: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  background: #ffffff;
}

.metric-nav-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metric-nav-group strong {
  color: #0f172a;
  font-size: 13px;
}

.metric-nav-item {
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 9px 10px;
  background: #f8fafc;
  color: #0f172a;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
}

.metric-nav-item.selected {
  border-color: #2563eb;
  background: #eff6ff;
}

.metric-nav-item small,
.download-field-grid {
  color: #64748b;
  font-size: 12px;
}

.metric-main,
.advanced-filter-list {
  display: grid;
  gap: 12px;
}

.advanced-filter-row {
  display: grid;
  grid-template-columns: minmax(110px, 0.8fr) minmax(130px, 1fr) minmax(120px, 0.8fr) minmax(180px, 1.2fr) 64px;
  gap: 8px;
  align-items: center;
}

.template-apply-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  margin-top: 12px;
}

.metric-role-label {
  margin-top: 12px;
}

.table-sort-button {
  border: 0;
  padding: 0;
  background: transparent;
  color: #0f172a;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
}

.highlight-row td {
  background: #eff6ff;
}

.metric-group-cell {
  width: 100%;
  min-height: 32px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #ffffff;
  color: #0f172a;
  cursor: pointer;
  font-weight: 700;
}

.metric-group-cell.positive {
  border-color: #bbf7d0;
  background: #dcfce7;
  color: #166534;
}

.metric-group-cell.negative,
.metric-group-cell.error {
  border-color: #fecaca;
  background: #fee2e2;
  color: #991b1b;
}

.metric-group-cell.baseline {
  background: #f8fafc;
  color: #334155;
}

.download-field-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.retention-trend-chart,
.retention-daily-chart,
.difference-group-grid,
.heatmap-analysis-grid {
  display: grid;
  gap: 12px;
}

.temporary-retention-panel {
  display: grid;
  grid-template-columns: minmax(220px, 0.7fr) minmax(0, 1.3fr);
  gap: 12px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  padding: 12px;
  background: #eff6ff;
}

.temporary-retention-list,
.temporary-retention-config {
  display: grid;
  gap: 10px;
  align-content: start;
}

.temporary-retention-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.temporary-retention-filter-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.temporary-retention-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}

.temporary-retention-actions span {
  color: #475569;
  font-size: 13px;
}

.temporary-retention-actions > div {
  display: grid;
  gap: 4px;
}

.temporary-retention-actions small {
  color: #64748b;
}

.retention-trend-row {
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  background: #ffffff;
}

.retention-points {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(70px, 1fr));
  gap: 8px;
}

.retention-point-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.retention-point {
  display: block;
  min-width: 8px;
  height: 10px;
  border-radius: 999px;
  background: #94a3b8;
}

.retention-point.positive {
  background: #16a34a;
}

.retention-point.negative {
  background: #dc2626;
}

.retention-point-wrap small,
.retention-daily-card small,
.funnel-chart-row small {
  color: #64748b;
  font-size: 11px;
}

.retention-detail-row td {
  background: #f8fafc;
}

.retention-detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px;
}

.retention-detail-grid > div,
.retention-daily-card,
.difference-summary-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.retention-daily-chart {
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}

.retention-daily-card span,
.difference-summary-card span {
  color: #64748b;
  font-size: 12px;
}

.funnel-chart {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 14px;
  background: #f8fafc;
}

.funnel-chart-row {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr) 140px;
  gap: 10px;
  align-items: center;
}

.funnel-layer {
  min-width: 96px;
  max-width: 100%;
  border-radius: 8px;
  padding: 10px 12px;
  background: linear-gradient(90deg, #2563eb, #16a34a);
  color: #ffffff;
  font-weight: 700;
  text-align: center;
}

.difference-group-grid {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.difference-group-card {
  display: grid;
  gap: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  background: #f8fafc;
}

.heatmap-analysis-grid {
  grid-template-columns: minmax(360px, 1.3fr) minmax(260px, 0.7fr);
  align-items: flex-start;
}

.heatmap-page-frame,
.heatmap-side-panel,
.nested-panel {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  background: #ffffff;
}

.heatmap-page-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  color: #64748b;
  font-size: 12px;
}

.heatmap-page-shot {
  position: relative;
  min-height: 520px;
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: linear-gradient(180deg, #eff6ff 0%, #ffffff 38%, #f8fafc 100%);
}

.heatmap-page-shot.interactive {
  outline: 2px solid #22c55e;
  outline-offset: 2px;
}

.mock-page-header,
.mock-page-hero,
.mock-page-card,
.mock-page-button {
  position: absolute;
  left: 10%;
  right: 10%;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.mock-page-header {
  top: 5%;
  height: 9%;
  background: #0f172a;
  color: #ffffff;
}

.mock-page-hero {
  top: 18%;
  height: 24%;
  background: #bfdbfe;
  color: #1e3a8a;
  font-size: 22px;
}

.mock-page-card {
  top: 50%;
  height: 18%;
  background: #e2e8f0;
  color: #334155;
}

.mock-page-button {
  top: 76%;
  left: 26%;
  right: 26%;
  height: 10%;
  background: #ef4444;
  color: #ffffff;
}

.heat-spot {
  position: absolute;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  background: rgba(239, 68, 68, 0.38);
  box-shadow: 0 0 0 16px rgba(245, 158, 11, 0.22), 0 0 34px rgba(220, 38, 38, 0.48);
}

.heatmap-region {
  position: absolute;
  border: 2px dashed #2563eb;
  border-radius: 8px;
  background: rgba(37, 99, 235, 0.12);
  color: #1e3a8a;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6px;
  padding: 6px;
}

.heatmap-region button {
  border: 0;
  border-radius: 999px;
  width: 20px;
  height: 20px;
  background: #1d4ed8;
  color: #ffffff;
  cursor: pointer;
}

.heatmap-side-panel {
  display: grid;
  gap: 10px;
}

.element-heatmap-chart {
  display: grid;
  gap: 8px;
}

.element-heatmap-row {
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr) 88px;
  gap: 10px;
  align-items: center;
}

.element-heatmap-row i {
  display: block;
  min-width: 12px;
  height: 12px;
  border-radius: 999px;
  background: linear-gradient(90deg, #f97316, #ef4444);
}

.mab-workspace,
.sensitive-workspace {
  display: grid;
  gap: 14px;
}

.mab-report-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 12px;
}

.mab-benefit-chart,
.mab-trend-chart,
.mab-traffic-chart,
.feature-importance-list {
  display: grid;
  gap: 10px;
}

.mab-benefit-row,
.mab-trend-row,
.mab-traffic-row {
  display: grid;
  gap: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px;
  background: #f8fafc;
}

.mab-benefit-row {
  grid-template-columns: 78px minmax(0, 1fr) minmax(0, 1fr);
  align-items: center;
}

.mab-benefit-row i,
.mab-trend-row i,
.mab-traffic-row i,
.feature-importance-list i {
  display: block;
  min-width: 8px;
  height: 10px;
  border-radius: 999px;
  background: #2563eb;
}

.mab-benefit-row i.evaluation {
  background: #d97706;
}

.mab-trend-row {
  grid-template-columns: 96px minmax(0, 1fr);
  align-items: center;
}

.mab-trend-row > div,
.mab-traffic-row > div {
  display: grid;
  gap: 6px;
}

.mab-trend-row span,
.mab-traffic-row div {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 150px;
  gap: 8px;
  align-items: center;
}

.mab-traffic-row {
  grid-template-columns: 80px minmax(0, 1fr);
}

.mab-parameter-grid,
.sensitive-gate-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}

.mab-parameter-card {
  display: grid;
  gap: 6px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  background: #f8fafc;
}

.mab-parameter-card > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.mab-parameter-card span,
.mab-benefit-row small,
.mab-trend-row small,
.mab-traffic-row small,
.sensitive-gate-grid span {
  color: #64748b;
  font-size: 12px;
}

.sensitive-task {
  align-items: flex-start;
}

.task-actions.compact {
  min-width: 220px;
  grid-template-columns: repeat(3, auto);
  align-items: center;
}

.sensitive-stage-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(110px, 1fr));
  gap: 8px;
}

.sensitive-stage-row > div {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px;
  text-align: center;
  color: #64748b;
  background: #f8fafc;
}

.sensitive-stage-row .finish {
  border-color: #bbf7d0;
  color: #166534;
  background: #f0fdf4;
}

.sensitive-stage-row .process {
  border-color: #bfdbfe;
  color: #1d4ed8;
  background: #eff6ff;
}

.feature-importance-list > div {
  display: grid;
  grid-template-columns: 130px minmax(0, 1fr) 70px;
  gap: 10px;
  align-items: center;
}

.feature-importance-list i {
  background: linear-gradient(90deg, #16a34a, #2563eb);
}

.modal-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.modal-form-grid label {
  display: grid;
  gap: 6px;
}

.modal-form-grid .wide,
.segment-detail {
  grid-column: 1 / -1;
}

.segment-detail {
  display: grid;
  gap: 14px;
}

.trend-toolbar,
.trend-legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin: 12px 0;
}

.trend-legend-item {
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  padding: 5px 10px;
  background: #ffffff;
  color: #0f172a;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
}

.trend-legend-item::before {
  content: '';
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 6px;
  border-radius: 999px;
  background: var(--legend-color);
}

.trend-legend-item.muted {
  opacity: 0.38;
}

.trend-chart {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(42px, 1fr));
  gap: 8px;
  min-height: 220px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}

.trend-chart-fullscreen {
  min-height: 440px;
}

.trend-column {
  display: grid;
  grid-template-rows: 1fr auto;
  gap: 8px;
  min-width: 0;
}

.trend-bars {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 4px;
  min-height: 170px;
}

.trend-chart-fullscreen .trend-bars {
  min-height: 380px;
}

.trend-bar {
  position: relative;
  width: 12px;
  min-height: 8px;
  border-radius: 6px 6px 2px 2px;
}

.trend-range {
  position: absolute;
  left: 50%;
  bottom: 100%;
  width: 4px;
  min-height: 8px;
  transform: translateX(-50%);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.22);
}

.trend-column small {
  color: #64748b;
  font-size: 11px;
  text-align: center;
}

.distribution-list,
.boxplot-list,
.help-grid {
  display: grid;
  gap: 12px;
}

.distribution-row,
.boxplot-row,
.help-grid > div {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  background: #ffffff;
}

.distribution-row {
  display: grid;
  gap: 10px;
}

.distribution-row > div:first-child,
.help-grid > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.distribution-curve {
  position: relative;
  height: 48px;
  border-radius: 999px;
  background: linear-gradient(90deg, #f1f5f9, #e2e8f0);
  overflow: hidden;
}

.distribution-curve i {
  position: absolute;
  top: 8px;
  height: 32px;
  border-radius: 999px;
  opacity: 0.72;
}

.boxplot-row {
  display: grid;
  grid-template-columns: 140px minmax(180px, 1fr) 100px;
  align-items: center;
  gap: 12px;
}

.boxplot-track {
  position: relative;
  height: 38px;
}

.boxplot-whisker,
.boxplot-box,
.boxplot-median {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
}

.boxplot-whisker {
  height: 3px;
  border-radius: 999px;
}

.boxplot-box {
  height: 26px;
  border: 2px solid;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.7);
}

.boxplot-median {
  width: 3px;
  height: 32px;
  border-radius: 999px;
}

.statistic-card-modal {
  width: min(760px, calc(100vw - 32px));
}

.report-fullscreen-modal {
  width: min(1180px, calc(100vw - 32px));
}

.fullscreen-panel {
  min-height: 480px;
}

.trend-strip {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 120px;
  margin-top: 16px;
  padding: 12px;
  border-radius: 8px;
  background: #f8fafc;
  overflow: hidden;
}

.trend-strip.compact {
  height: 88px;
  padding: 8px;
}

.trend-strip div {
  width: 8px;
  min-height: 8px;
  border-radius: 4px 4px 0 0;
  background: #2563eb;
}

.funnel-step,
.heatmap-card,
.mab-arm {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.heatmap-grid,
.mab-grid,
.recommendation-grid,
.preview-grid {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.preview-grid > div {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #f8fafc;
}

.preview-grid strong {
  color: #0f172a;
  font-size: 18px;
}

.heatmap-canvas {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 140px;
  border-radius: 8px;
  padding: 12px;
  background: linear-gradient(135deg, #e0f2fe 0%, #fef3c7 58%, #fee2e2 100%);
}

.heatmap-canvas i {
  display: block;
  min-width: 96px;
  border-radius: 6px;
  padding: 6px 8px;
  background: rgba(239, 68, 68, 0.72);
  color: #ffffff;
  font-style: normal;
  font-size: 12px;
}

.feature-row {
  width: 100%;
}

.plan-card {
  align-items: flex-start;
  flex-direction: column;
}

.decision-result {
  align-items: flex-start;
  flex-direction: column;
}

.decision-result code {
  color: #0f172a;
  white-space: normal;
  word-break: break-all;
}

.traffic-layer {
  align-items: stretch;
  flex-direction: column;
}

.traffic-page {
  gap: 16px;
}

.traffic-summary-grid,
.traffic-resource-grid,
.traffic-calculation-grid {
  display: grid;
  gap: 16px;
}

.traffic-summary-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.traffic-summary-card {
  min-height: 118px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 18px;
  background: #ffffff;
}

.traffic-summary-card span,
.traffic-summary-card small,
.traffic-section-heading span,
.traffic-layer-card span,
.mutex-group-card span,
.mutex-domain-row span {
  color: #64748b;
  font-size: 13px;
  line-height: 1.5;
}

.traffic-summary-card strong {
  color: #0f172a;
  font-size: 30px;
  line-height: 1;
}

.traffic-section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.traffic-section-heading > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.traffic-section-heading strong {
  color: #0f172a;
  font-size: 20px;
}

.traffic-resource-grid,
.traffic-calculation-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: stretch;
}

.traffic-card {
  min-width: 0;
  overflow: hidden;
}

.traffic-card :deep(.n-card-header) {
  align-items: flex-start;
  gap: 12px;
}

.traffic-card :deep(.n-card-header__extra) {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.traffic-resource-card {
  height: 680px;
}

.traffic-resource-card :deep(.n-card__content),
.traffic-resource-card :deep(.n-card-content) {
  min-height: 0;
  overflow: hidden;
}

.traffic-card-layout {
  height: 570px;
  min-height: 0;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 14px;
}

.traffic-scroll-list {
  min-height: 0;
  display: grid;
  align-content: start;
  gap: 12px;
  overflow-y: auto;
  padding-right: 4px;
}

.traffic-layer-card,
.mutex-group-card {
  min-width: 0;
  display: grid;
  gap: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 14px;
  background: #ffffff;
}

.traffic-layer-card strong,
.mutex-group-card strong,
.mutex-domain-row strong,
.traffic-form-panel strong {
  color: #0f172a;
  font-size: 15px;
}

.traffic-progress-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
}

.traffic-form-panel {
  min-width: 0;
  display: grid;
  gap: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 14px;
  background: #f8fafc;
}

.traffic-form-grid,
.traffic-calculator-grid {
  display: grid;
  gap: 12px;
}

.traffic-form-grid {
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.9fr) minmax(0, 0.9fr);
}

.traffic-form-wide {
  grid-column: 1 / -1;
}

.mutex-form-panel {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
}

.traffic-form-block {
  min-width: 0;
  display: grid;
  gap: 10px;
}

.mutex-domain-list {
  display: grid;
  gap: 8px;
}

.mutex-domain-row {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px 12px;
  background: #f8fafc;
}

.mutex-domain-row > div {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.traffic-calculator-card,
.traffic-result-card {
  height: 320px;
}

.traffic-calculator-card :deep(.n-card__content),
.traffic-result-card :deep(.n-card__content),
.traffic-calculator-card :deep(.n-card-content),
.traffic-result-card :deep(.n-card-content) {
  min-height: 0;
  overflow: hidden;
}

.traffic-calculator-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.traffic-result-content {
  min-height: 0;
  display: grid;
  gap: 14px;
}

.traffic-recommendation-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.traffic-recommendation-grid > div {
  min-height: 96px;
  background: #f8fafc;
}

.traffic-empty-result {
  min-height: 210px;
  display: grid;
  place-items: center;
}

.board-page {
  gap: 20px;
}

.board-list-card :deep(.n-card-content) {
  min-height: 0;
}

.board-list {
  display: grid;
  gap: 12px;
}

.board-list-row {
  min-height: 104px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 18px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px 18px;
  background: #ffffff;
}

.board-list-row.active {
  border-color: #86efac;
  background: #f7fef9;
}

.board-list-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.board-list-main strong {
  color: #0f172a;
  font-size: 18px;
}

.board-list-main > span,
.board-list-meta {
  color: #64748b;
  font-size: 13px;
  line-height: 1.5;
}

.board-list-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}

.board-list-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.board-management-card :deep(.n-card-header) {
  align-items: flex-start;
  gap: 16px;
}

.board-management-card :deep(.n-card-header__extra) {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.board-management-card {
  overflow: hidden;
}

.board-management-card :deep(.n-card-content) {
  min-height: 0;
  overflow: visible;
}

.board-form-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
  gap: 18px;
  align-items: stretch;
}

.board-form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px 16px;
  min-width: 0;
}

.board-field {
  min-width: 0;
}

.board-field-wide {
  grid-column: 1 / -1;
}

.board-description-field {
  grid-column: span 2;
}

.board-access-panel {
  min-width: 0;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 14px;
  background: #f8fafc;
  overflow: hidden;
}

.board-access-panel > span {
  display: block;
  margin-top: 8px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.board-access-panel :deep(.n-base-selection-tags) {
  max-height: 62px;
  overflow-y: auto;
}

.board-editor-layout {
  display: grid;
  grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
  gap: 16px;
  align-items: stretch;
}

.board-add-card,
.board-widget-card {
  height: 420px;
  overflow: hidden;
}

.board-add-card :deep(.n-card-content),
.board-widget-card :deep(.n-card-content) {
  min-height: 0;
  overflow: hidden;
}

.board-add-card :deep(.n-card-content) {
  overflow-y: auto;
}

.board-widget-form,
.board-widget-list {
  display: grid;
  gap: 12px;
}

.board-widget-form > * {
  min-width: 0;
}

.board-widget-list {
  max-height: 312px;
  overflow-y: auto;
  padding-right: 4px;
}

.board-widget-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px 14px;
  background: #ffffff;
}

.board-widget-row > div:first-child {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.board-widget-row strong,
.board-metric-head strong:first-child {
  color: #0f172a;
  font-size: 16px;
}

.board-widget-row span,
.board-widget-row small {
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.board-widget-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.board-diff-card :deep(.n-card-content) {
  max-height: 320px;
  overflow-y: auto;
}

.board-view-header :deep(.n-card-header) {
  align-items: flex-start;
  gap: 16px;
}

.board-view-header :deep(.n-card-header__extra) {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.board-view-summary {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.board-view-summary p,
.board-view-footnote,
.board-view-widget-head span,
.board-view-text,
.board-view-diff-row span,
.board-view-alarm span,
.board-view-metric-head span {
  color: #64748b;
  font-size: 13px;
  line-height: 1.5;
}

.board-view-summary p,
.board-view-text {
  margin: 0;
}

.board-view-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.board-view-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  align-items: stretch;
}

.board-view-widget {
  min-width: 0;
  height: 280px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 18px;
  background: #ffffff;
  overflow: hidden;
}

.board-view-widget-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.board-view-widget-head > div,
.board-view-metric-head > div,
.board-view-alarm > div,
.board-view-diff-row > div {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.board-view-widget-head strong,
.board-view-health-head strong,
.board-view-alarm strong,
.board-view-diff-row strong {
  color: #0f172a;
  font-size: 16px;
}

.board-view-widget-body {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.board-view-metric-head,
.board-view-health-head,
.board-view-alarm,
.board-view-diff-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.board-view-widget .trend-strip {
  margin-top: 0;
  flex: 1;
  min-height: 92px;
}

.board-view-diff-list,
.board-view-text {
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}

.board-view-diff-list {
  display: grid;
  gap: 10px;
}

.board-view-diff-row {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px 12px;
  background: #f8fafc;
}

.board-view-empty-action {
  min-height: 0;
  flex: 1;
  display: grid;
  place-items: center;
  gap: 10px;
}

.board-view-empty {
  grid-column: 1 / -1;
  min-height: 240px;
  display: grid;
  place-items: center;
}

.full-button {
  width: 100%;
  margin-top: 16px;
}

.health-row {
  grid-template-columns: minmax(180px, 1fr) 140px 80px;
  display: grid;
}

.health-row.board-health-row {
  grid-template-columns: minmax(0, 1fr) minmax(120px, 160px) auto;
}

.trend-strip.compact {
  justify-content: flex-start;
  gap: 6px;
}

@media (max-width: 1100px) {
  .board-form-layout {
    grid-template-columns: 1fr;
  }

  .board-editor-layout {
    grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
  }

  .traffic-resource-grid,
  .traffic-calculation-grid {
    grid-template-columns: 1fr;
  }

  .traffic-resource-card,
  .traffic-calculator-card,
  .traffic-result-card {
    height: auto;
  }

  .traffic-card-layout {
    height: auto;
  }

  .traffic-scroll-list {
    max-height: 360px;
  }

  .feature-create-layout,
  .feature-version-workspace,
  .feature-code-layout {
    grid-template-columns: 1fr;
  }

  .feature-create-help-card {
    position: static;
  }

  .feature-version-list-card,
  .feature-version-editor-card,
  .feature-fixed-tall-card,
  .feature-medium-card {
    height: auto;
  }

  .feature-scroll-list {
    max-height: 360px;
  }
}

@media (max-width: 960px) {
  .ab-page-heading,
  .report-summary {
    grid-template-columns: 1fr;
  }

  .ab-page-heading {
    flex-direction: column;
  }

  .template-apply-row {
    grid-template-columns: 1fr;
  }

  .health-row {
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }

  .board-form-grid,
  .board-editor-layout,
  .board-view-grid,
  .traffic-summary-grid,
  .traffic-resource-grid,
  .traffic-calculation-grid,
  .traffic-form-grid,
  .mutex-form-panel,
  .traffic-calculator-grid,
  .feature-kpi-grid,
  .feature-detail-grid,
  .feature-version-rule-grid,
  .variant-editor-row,
  .feature-variable-row,
  .feature-condition-row,
  .feature-delivery-row,
  .feature-weight-row,
  .tools-split-grid,
  .tool-query-grid,
  .tool-inline-form,
  .tool-dedup-form {
    grid-template-columns: 1fr;
  }

  .board-widget-row,
  .board-list-row {
    display: grid;
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .board-list-actions {
    justify-content: flex-start;
  }

  .board-widget-actions {
    justify-content: flex-start;
  }

  .audience-condition-row,
  .advanced-filter-row,
  .metric-workspace,
  .metric-selector-filter-panel,
  .boxplot-row,
  .temporary-retention-panel,
  .temporary-retention-grid,
  .temporary-retention-filter-grid,
  .temporary-retention-actions,
  .retention-trend-row,
  .funnel-chart-row,
  .heatmap-analysis-grid,
  .element-heatmap-row {
    grid-template-columns: 1fr;
  }

  .metric-left-nav {
    position: static;
    max-height: none;
  }
}
</style>
