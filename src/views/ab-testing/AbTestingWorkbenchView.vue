<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import {
  NButton,
  NCard,
  NCheckbox,
  NDescriptions,
  NDescriptionsItem,
  NDivider,
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
import type {
  AbExperimentAction,
  AbExperimentStatus,
  AbExperimentType,
  AbExperimentVisibility,
  AudienceCondition,
  AudienceConditionSource,
  Experiment,
  ExperimentPermissionGrant,
  ExperimentPermissionType,
  ExperimentDraftParamSchema,
  ExperimentDraftVariant,
  MetricStatisticResult,
  ReportExportTask,
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
    description: '命中查询、命中诊断、数据查重、导出任务、异常恢复和覆盖矩阵。',
  },
  boards: {
    title: '实验看板',
    description: '运行中实验、必看指标、报警任务和团队级实验健康度。',
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
const currentHeader = computed(() => pageHeaders[activePage.value] ?? defaultPageHeader)
const currentCreateStepTitle = computed(() => createSteps[currentCreateStep.value - 1] ?? createSteps[0])

type ReportPrimaryTab = 'conclusion' | 'metrics' | 'advanced' | 'heatmap' | 'mab' | 'sensitive'
type CoreTrendView = 'day' | 'distribution' | 'box'

type MetricVersionResult = MetricStatisticResult['versionResults'][number]

interface StatisticCardState {
  metric: MetricStatisticResult
  result: MetricVersionResult
  baseline?: MetricVersionResult
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

const trendPalette = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#db2777']

const {
  loading,
  loadError,
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
} = storeToRefs(abStore)

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
const publishTypeOptions = [
  { label: '立即发布', value: 'manual' },
  { label: '定时发布', value: 'scheduled' },
]
const featureDraftTagsText = computed({
  get: () => featureDraft.value.tags.join(','),
  set: (value: string) => {
    featureDraft.value.tags = value.split(',').map((item) => item.trim()).filter(Boolean)
  },
})
const featureDraftOwnersText = computed({
  get: () => featureDraft.value.owners.join(','),
  set: (value: string) => {
    featureDraft.value.owners = value.split(',').map((item) => item.trim()).filter(Boolean)
  },
})
const featureDraftVariantOptions = computed(() =>
  featureDraft.value.variants.map((variant) => ({ label: variant.name, value: variant.variantId })),
)
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

async function createMetricGroup() {
  const result = await abStore.createMetricGroup()
  message.success(result.message)
}

async function copyMetricGroup() {
  const result = await abStore.copyMetricGroup()
  message[result.group ? 'success' : 'warning'](result.message)
}

async function mergeMetricGroups() {
  const result = await abStore.mergeMetricGroups()
  message[result.group ? 'success' : 'warning'](result.message)
}

async function offlineMetricGroup() {
  const result = await abStore.offlineMetricGroup()
  message[result.group ? 'success' : 'warning'](result.message)
}

async function toggleMetricMustSee(metricId: EntityId, isMustSee: boolean) {
  const result = await abStore.toggleMetricMustSee(metricId, isMustSee)
  message[result.metric ? 'success' : 'warning'](result.message)
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
  const result = await abStore.createFeatureFlag()
  message[result.feature ? 'success' : 'warning'](result.message)
}

async function createFeatureVersion() {
  const result = await abStore.createFeatureVersion()
  message[result.version ? 'success' : 'warning'](result.message)
}

async function publishSelectedFeatureVersion() {
  const result = await abStore.publishSelectedFeatureVersion()
  message[result.feature ? 'success' : 'warning'](result.message)
}

async function rollbackSelectedFeature() {
  const result = await abStore.rollbackSelectedFeature()
  message[result.feature ? 'success' : 'warning'](result.message)
}

async function createWhitelistTest() {
  const result = await abStore.createWhitelistTest()
  message[result.test ? 'success' : 'warning'](result.message)
}

async function changeFeatureLifecycle(action: 'enable' | 'disable' | 'delete') {
  const result = await abStore.changeSelectedFeatureLifecycle(action)
  message[result.feature ? 'success' : 'warning'](result.message)
}

async function syncSolidifyExperiment(experimentId: EntityId) {
  featureSolidifyDraft.value.experimentId = experimentId
  await abStore.loadPlanningBundle(experimentId)
  const winner = abStore.planningBundle?.variants.find((variant) => !variant.isControl)
  if (winner) featureSolidifyDraft.value.winnerVariantId = winner.id
}

async function solidifyExperimentToFeature() {
  const result = await abStore.solidifyExperimentToFeatureFromDraft()
  message[result.feature ? 'success' : 'warning'](result.message)
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
    void router.push('/ab-testing/features')
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

async function refreshReport() {
  if (!selectedReportExperimentId.value) return
  reportRefreshing.value = true
  statisticCardVisible.value = false
  try {
    await abStore.loadReport(selectedReportExperimentId.value)
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

function budgetStatusType(value: string) {
  if (value === 'pass') return 'success'
  if (value === 'warning') return 'warning'
  return 'error'
}

function acceptanceStatusType(value: string) {
  if (value === 'passed') return 'success'
  if (value === 'covered_by_unit') return 'info'
  if (value === 'manual_required') return 'warning'
  return 'default'
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

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  return value.slice(0, 16).replace('T', ' ')
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
      <n-space>
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
                <n-grid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
                  <n-gi>
                    <label class="field-label">实验指标快照</label>
                    <n-select
                      v-model:value="draftExperiment.metricIds"
                      multiple
                      :disabled="abStore.isDraftFieldLocked('metrics')"
                      :options="metrics.map((metric) => ({ label: metric.name, value: metric.id }))"
                    />
                    <n-button class="full-button" secondary @click="applyMustSeeMetricsToDraft">
                      自动带入必看指标
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
                  <div v-for="metric in draftMetricSnapshots" :key="metric.id" class="snapshot-row">
                    <div>
                      <strong>{{ metric.name }}</strong>
                      <span>{{ metric.description }}</span>
                    </div>
                    <n-space size="small">
                      <n-tag size="small">{{ metric.metricCategory }}</n-tag>
                      <n-tag v-if="metric.isMustSee" type="success" size="small">必看</n-tag>
                    </n-space>
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
              <n-button secondary :loading="reportRefreshing" @click="refreshReport">
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
              <strong>{{ item.value }}</strong>
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
                      <n-button size="small" secondary @click="refreshReport">刷新指标</n-button>
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
                <div class="report-panel">
                  <n-space align="center" justify="space-between">
                    <div>
                      <strong>数据指标</strong>
                      <p class="report-text muted">当前保留原有指标快照，并承接后续筛选、PreAA 和模板逻辑。</p>
                    </div>
                    <n-space>
                      <n-tag v-for="template in filterTemplates" :key="template.templateId" type="info">
                        {{ template.templateName }}
                      </n-tag>
                      <n-button size="small" secondary @click="downloadTrendData">下载数据</n-button>
                    </n-space>
                  </n-space>
                  <n-table :bordered="false" size="small">
                    <thead>
                      <tr>
                        <th>指标</th>
                        <th>版本</th>
                        <th>样本</th>
                        <th>值</th>
                        <th>相对变化</th>
                        <th>P 值</th>
                        <th>显著性</th>
                      </tr>
                    </thead>
                    <tbody>
                      <template v-for="metric in metricResults" :key="metric.metricId">
                        <tr v-for="result in metric.versionResults" :key="`${metric.metricId}-${result.versionId}`">
                          <td>{{ metric.metricName }}</td>
                          <td>{{ reportVersionName(result.versionId) }}</td>
                          <td>{{ formatNumber(result.sampleSize) }}</td>
                          <td>{{ formatMetricValue(result.metricValue) }}</td>
                          <td>{{ result.diffRel === null ? '-' : formatRatio(result.diffRel) }}</td>
                          <td>{{ result.pValue ?? '-' }}</td>
                          <td>
                            <n-tag :type="significanceType(result.significance)" size="small">
                              {{ significanceLabel(result.significance) }}
                            </n-tag>
                          </td>
                        </tr>
                      </template>
                    </tbody>
                  </n-table>
                </div>
                <div v-if="funnelReport" class="report-panel">
                  <strong>漏斗指标快照</strong>
                  <div class="funnel-list">
                    <div v-for="step in funnelReport.steps" :key="step.stepNo" class="funnel-step">
                      <strong>{{ step.stepNo }}. {{ step.stepName }}</strong>
                      <n-progress type="line" :percentage="step.overallConversionRate * 100" :height="10" />
                      <span>{{ formatNumber(step.reachedUsers) }} 人 · 流失 {{ formatNumber(step.lostUsers) }}</span>
                    </div>
                  </div>
                </div>
              </template>

              <template v-else-if="tab.name === 'advanced'">
                <div class="report-panel">
                  <strong>同期群分析</strong>
                  <n-table :bordered="false" size="small">
                    <thead>
                      <tr>
                        <th>版本</th>
                        <th>同期群</th>
                        <th>新增</th>
                        <th v-for="day in cohortReport?.retentionDays" :key="day">D{{ day }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="row in cohortReport?.rows" :key="`${row.versionId}-${row.cohortDate}`">
                        <td>{{ reportVersionName(row.versionId) }}</td>
                        <td>{{ row.cohortDate }}</td>
                        <td>{{ formatNumber(row.newUsers) }}</td>
                        <td v-for="(value, index) in row.values" :key="index">{{ formatRatio(value) }}</td>
                      </tr>
                    </tbody>
                  </n-table>
                </div>
                <div class="report-panel">
                  <strong>差异分析与群体对比</strong>
                  <p class="report-text muted">入口已并入高级分析 Tab，群体配置和蒙特卡洛最优策略概率将在下一批细化。</p>
                </div>
              </template>

              <template v-else-if="tab.name === 'heatmap'">
                <div v-if="heatmapReport" class="heatmap-grid">
                  <div v-for="version in heatmapReport.versions" :key="version.versionId" class="heatmap-card">
                    <strong>{{ reportVersionName(version.versionId) }}</strong>
                    <span>点击 {{ formatNumber(version.clickCount) }} · 用户 {{ formatNumber(version.clickUsers) }}</span>
                    <div class="heatmap-canvas">
                      <i v-for="element in version.topElements" :key="element.name" :style="{ width: `${Math.max(element.share * 100, 18)}%` }">
                        {{ element.name }}
                      </i>
                    </div>
                  </div>
                </div>
              </template>

              <template v-else-if="tab.name === 'mab'">
                <div v-if="mabReport" class="mab-grid">
                  <div v-for="arm in mabReport.arms" :key="arm.armId" class="mab-arm">
                    <strong>{{ arm.name }}</strong>
                    <span>P2BA {{ formatRatio(arm.p2ba) }} · 流量 {{ formatRatio(arm.trafficRatio) }}</span>
                    <n-progress type="line" :percentage="arm.trafficRatio" :height="8" />
                  </div>
                </div>
              </template>

              <template v-else>
                <div class="sensitive-list">
                  <div v-for="task in sensitiveTasks" :key="task.id" class="sensitive-task">
                    <div>
                      <strong>{{ task.name }}</strong>
                      <span>{{ task.stage }} · {{ task.status }}</span>
                    </div>
                    <n-progress type="line" :percentage="task.progress" :height="8" />
                  </div>
                </div>
                <n-empty v-if="!sensitiveTasks.length" description="暂无分析任务，可从数据指标页创建敏感人群洞察" />
              </template>
            </n-tab-pane>
          </n-tabs>
        </n-card>

        <n-grid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
          <n-gi>
            <n-card title="异常状态" :bordered="false">
              <div class="snapshot-list">
                <div v-for="item in reportAnomalies" :key="item.message" class="snapshot-row">
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
        <n-card :bordered="false">
          <n-space align="center" justify="space-between">
            <n-space>
              <n-select
                v-model:value="selectedMetricGroupId"
                :options="metricGroups.map((group) => ({ label: group.name, value: group.id }))"
                style="width: 280px"
              />
              <n-select
                v-model:value="metricGroupMergeIds"
                multiple
                :options="metricGroups.map((group) => ({ label: group.name, value: group.id }))"
                placeholder="选择要合并的指标组"
                style="width: 320px"
              />
            </n-space>
            <n-space>
              <n-button secondary @click="copyMetricGroup">复制</n-button>
              <n-button secondary @click="mergeMetricGroups">合并</n-button>
              <n-button secondary type="warning" @click="offlineMetricGroup">下线</n-button>
            </n-space>
          </n-space>
        </n-card>

        <n-grid :cols="3" :x-gap="16" :y-gap="16" responsive="screen">
          <n-gi>
            <n-card title="创建指标组" :bordered="false">
              <n-space vertical>
                <n-input v-model:value="metricGroupDraft.name" placeholder="指标组名称" />
                <n-input v-model:value="metricGroupDraft.description" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" />
                <n-select
                  v-model:value="metricGroupDraft.type"
                  :options="[
                    { label: '事件指标组', value: 'event' },
                    { label: '留存指标组', value: 'retention' },
                    { label: '漏斗指标组', value: 'funnel' },
                  ]"
                />
                <n-select
                  v-model:value="metricGroupDraft.permissionType"
                  :options="[
                    { label: '公开', value: 'public' },
                    { label: '私有', value: 'private' },
                  ]"
                />
                <n-select
                  v-model:value="metricGroupDraft.metricIds"
                  multiple
                  :options="metrics.map((metric) => ({ label: metric.name, value: metric.id }))"
                />
                <n-button type="primary" block @click="createMetricGroup">创建指标组</n-button>
              </n-space>
            </n-card>
          </n-gi>

          <n-gi>
            <n-card :title="selectedMetricGroup?.name ?? '指标组详情'" :bordered="false">
              <template v-if="selectedMetricGroup">
                <p class="card-desc">{{ selectedMetricGroup.description }}</p>
                <n-space size="small">
                  <n-tag>{{ selectedMetricGroup.type }}</n-tag>
                  <n-tag :type="selectedMetricGroup.status === 'active' ? 'success' : 'default'">
                    {{ selectedMetricGroup.status }}
                  </n-tag>
                  <n-tag>{{ selectedMetricGroup.permissionType }}</n-tag>
                </n-space>
                <n-divider />
                <div class="metric-links">
                  <span>{{ selectedMetricGroup.metricIds.length }} 个指标</span>
                  <span>{{ selectedMetricGroup.relatedExperimentIds.length }} 个关联实验</span>
                </div>
                <n-divider />
                <div class="snapshot-list">
                  <div v-for="metric in selectedMetricGroupMetrics" :key="metric.id" class="snapshot-row">
                    <div>
                      <strong>{{ metric.name }}</strong>
                      <span>{{ metric.description }}</span>
                    </div>
                    <n-tag v-if="metric.isMustSee" type="success" size="small">必看</n-tag>
                  </div>
                </div>
              </template>
              <n-empty v-else description="请选择指标组" />
            </n-card>
          </n-gi>

          <n-gi>
            <n-card title="必看指标看板" :bordered="false">
              <div class="snapshot-list">
                <div v-for="metric in mustSeeMetrics" :key="metric.id" class="snapshot-row">
                  <div>
                    <strong>{{ metric.name }}</strong>
                    <span>{{ metric.description }}</span>
                  </div>
                  <n-tag type="success" size="small">守护</n-tag>
                </div>
              </div>
              <n-divider />
              <div class="list-block">
                <strong>趋势同步</strong>
                <span v-for="trend in mustSeeTrends" :key="trend.metricId">
                  {{ trend.metricName }} · 当前 {{ formatMetricValue(trend.currentValue) }}
                </span>
              </div>
            </n-card>
          </n-gi>
        </n-grid>

        <n-grid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
          <n-gi>
            <n-card title="指标定义" :bordered="false">
              <n-table :bordered="false" size="small">
                <thead>
                  <tr>
                    <th>指标</th>
                    <th>类型</th>
                    <th>灵活属性</th>
                    <th>格式</th>
                    <th>必看</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="metric in metrics" :key="metric.id">
                    <td>{{ metric.name }}</td>
                    <td>{{ metric.metricCategory }} / {{ metric.metricKind }}</td>
                    <td>
                      {{
                        'flexibleProperties' in metric.definition
                          ? metric.definition.flexibleProperties.map((item) => item.propertyName).join('、') || '-'
                          : '-'
                      }}
                    </td>
                    <td>{{ metric.numberFormat.type }}</td>
                    <td>
                      <n-tag :type="metric.isMustSee ? 'success' : 'default'" size="small">
                        {{ metric.isMustSee ? '是' : '否' }}
                      </n-tag>
                    </td>
                    <td>
                      <n-button size="small" secondary @click="toggleMetricMustSee(metric.id, !metric.isMustSee)">
                        {{ metric.isMustSee ? '取消必看' : '设为必看' }}
                      </n-button>
                    </td>
                  </tr>
                </tbody>
              </n-table>
            </n-card>
          </n-gi>
          <n-gi>
            <n-card title="模板、报警与接收组" :bordered="false">
              <div class="list-block">
                <strong>指标模板</strong>
                <span v-for="template in metricTemplates" :key="template.id">{{ template.name }} · {{ template.templateType }}</span>
              </div>
              <n-divider />
              <div class="list-block">
                <strong>报警任务</strong>
                <span v-for="alarm in alarmTasks" :key="alarm.id">
                  {{ alarm.name }} · {{ alarm.level }} · 触发 {{ alarm.triggerCount }} 次
                </span>
              </div>
              <n-divider />
              <div class="list-block">
                <strong>接收组</strong>
                <span v-for="group in receiverGroups" :key="group.id">
                  {{ group.name }} · {{ group.memberNames.join('、') }}
                </span>
              </div>
            </n-card>
          </n-gi>
        </n-grid>
      </section>

      <section v-else-if="activePage === 'features'" class="ab-section-stack">
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
                <n-descriptions-item label="Key">{{ selectedFeature.key }}</n-descriptions-item>
                <n-descriptions-item label="终端">{{ selectedFeature.terminalType }}</n-descriptions-item>
                <n-descriptions-item label="类型">{{ selectedFeature.featureType }}</n-descriptions-item>
                <n-descriptions-item label="生命周期">{{ selectedFeature.status }}</n-descriptions-item>
                <n-descriptions-item label="发布状态">{{ selectedFeature.publishStatus }}</n-descriptions-item>
                <n-descriptions-item label="当前版本">
                  {{ selectedCurrentFeatureVersion?.versionNo ?? '-' }}
                </n-descriptions-item>
                <n-descriptions-item label="关联实验">
                  {{ selectedFeature.relatedExperimentIds.map(getExperimentName).join('、') || '-' }}
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
                    <n-select v-model:value="featureVersionDraft.variantType" :options="featureVariantTypeOptions" />
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
                  <n-button type="primary" @click="publishSelectedFeatureVersion">发布</n-button>
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
                  <strong>{{ featureDecision.variantName ?? featureDecision.featureKey }}</strong>
                  <span>{{ featureDecision.decisionSource }} · {{ featureDecision.decisionReason }}</span>
                  <code>{{ JSON.stringify(featureDecision.value) }}</code>
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

      <section v-else-if="activePage === 'traffic'" class="ab-section-stack">
        <n-grid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
          <n-gi>
            <n-card title="流量层" :bordered="false">
              <div v-for="layer in trafficLayers" :key="layer.id" class="traffic-layer">
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
                <n-progress type="line" :percentage="layer.usedTrafficRatio" :height="10" />
                <span>已用 {{ formatPercent(layer.usedTrafficRatio) }} · 可用 {{ formatPercent(layer.availableTrafficRatio) }}</span>
              </div>
              <n-divider />
              <div class="mini-section">
                <strong>{{ trafficLayerDraft.id ? '编辑流量层' : '新建流量层' }}</strong>
                <n-input v-model:value="trafficLayerDraft.name" placeholder="流量层名称" />
                <n-input v-model:value="trafficLayerDraft.description" type="textarea" :autosize="{ minRows: 2, maxRows: 3 }" />
                <n-grid :cols="2" :x-gap="8">
                  <n-gi>
                    <n-select
                      v-model:value="trafficLayerDraft.experimentType"
                      :options="[
                        { label: '客户端', value: 'CLIENT' },
                        { label: '服务端', value: 'SERVER' },
                      ]"
                    />
                  </n-gi>
                  <n-gi>
                    <n-input-number
                      v-model:value="trafficLayerDraft.totalTrafficRatio"
                      :min="1"
                      :max="100"
                      style="width: 100%"
                    />
                  </n-gi>
                </n-grid>
                <n-space>
                  <n-button type="primary" secondary @click="saveTrafficLayer">
                    {{ trafficLayerDraft.id ? '保存流量层' : '创建流量层' }}
                  </n-button>
                  <n-button secondary @click="abStore.resetTrafficLayerDraft">重置</n-button>
                </n-space>
              </div>
            </n-card>
          </n-gi>
          <n-gi>
            <n-card title="互斥域" :bordered="false">
              <div v-for="group in mutexDomainGroups" :key="group.id" class="mutex-group">
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
                <div v-for="domain in group.domains" :key="domain.id" class="mutex-domain">
                  <div>
                    <span>{{ domain.name }}</span>
                    <small>{{ domain.runningExperimentIds.length ? '占用中' : '空闲' }}</small>
                  </div>
                  <n-space size="small">
                    <n-tag size="small">{{ formatPercent(domain.trafficRatio) }}</n-tag>
                    <n-button size="tiny" secondary @click="abStore.editMutexDomain(group.id, domain.id)">编辑</n-button>
                    <n-button size="tiny" secondary @click="removeMutexDomain(group.id, domain.id)">删除</n-button>
                  </n-space>
                </div>
              </div>
              <n-divider />
              <n-grid :cols="2" :x-gap="12" :y-gap="12" responsive="screen">
                <n-gi>
                  <div class="mini-section">
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
                </n-gi>
                <n-gi>
                  <div class="mini-section">
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
                </n-gi>
              </n-grid>
            </n-card>
          </n-gi>
        </n-grid>

        <n-grid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
          <n-gi>
            <n-card title="流量计算器" :bordered="false">
              <n-grid :cols="2" :x-gap="12" :y-gap="12">
                <n-gi>
                  <label class="field-label">预估用户</label>
                  <n-input-number v-model:value="trafficCalculator.estimatedTotalUsers" :min="1" style="width: 100%" />
                </n-gi>
                <n-gi>
                  <label class="field-label">版本数</label>
                  <n-input-number v-model:value="trafficCalculator.versionCount" :min="2" :max="12" style="width: 100%" />
                </n-gi>
                <n-gi>
                  <label class="field-label">MDE</label>
                  <n-input-number v-model:value="trafficCalculator.mdeValue" :step="0.01" :min="0.01" style="width: 100%" />
                </n-gi>
                <n-gi>
                  <label class="field-label">过滤比例</label>
                  <n-input-number v-model:value="trafficCalculator.trafficFilterRatio" :step="0.01" :min="0.01" :max="1" style="width: 100%" />
                </n-gi>
              </n-grid>
              <n-button type="primary" class="full-button" @click="runTrafficCalculator">计算推荐流量</n-button>
            </n-card>
          </n-gi>
          <n-gi>
            <n-card title="推荐结果" :bordered="false">
              <template v-if="trafficRecommendation">
                <div class="recommendation-grid">
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
              </template>
              <n-empty v-else description="等待计算" />
            </n-card>
          </n-gi>
        </n-grid>
      </section>

      <section v-else-if="activePage === 'tools'" class="ab-section-stack">
        <n-grid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
          <n-gi :span="2">
            <n-card title="命中查询" :bordered="false">
              <div class="tool-panel">
                <n-grid :cols="6" :x-gap="10" :y-gap="10" responsive="screen">
                  <n-gi>
                    <label class="field-label">模板</label>
                    <n-select
                      v-model:value="hitQueryDraft.templateId"
                      clearable
                      :options="hitQueryTemplates.map((template) => ({ label: template.name, value: template.id }))"
                      @update:value="applyHitTemplate"
                    />
                  </n-gi>
                  <n-gi>
                    <label class="field-label">ID 类型</label>
                    <n-select v-model:value="hitQueryDraft.subjectType" :options="hitSubjectTypeOptions" />
                  </n-gi>
                  <n-gi>
                    <label class="field-label">查询 ID</label>
                    <n-input v-model:value="hitQueryDraft.subjectId" placeholder="输入 uid / did / ssid" />
                  </n-gi>
                  <n-gi>
                    <label class="field-label">实验过滤</label>
                    <n-select
                      v-model:value="hitQueryDraft.experimentId"
                      clearable
                      :options="experiments.map((experiment) => ({ label: experiment.name, value: experiment.id }))"
                    />
                  </n-gi>
                  <n-gi>
                    <label class="field-label">命中状态</label>
                    <n-select v-model:value="hitQueryDraft.hitStatus" :options="hitStatusOptions" />
                  </n-gi>
                  <n-gi>
                    <label class="field-label">排序</label>
                    <n-space>
                      <n-select v-model:value="hitQueryDraft.sortBy" :options="hitSortOptions" style="width: 120px" />
                      <n-select v-model:value="hitQueryDraft.sortOrder" :options="sortOrderOptions" style="width: 88px" />
                    </n-space>
                  </n-gi>
                </n-grid>
                <n-space>
                  <n-button type="primary" :loading="hitQueryLoading" @click="queryHits">查询</n-button>
                  <n-button secondary @click="downloadHitResults">下载结果</n-button>
                </n-space>
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
                <n-empty v-else description="暂无查询结果" />
              </div>
            </n-card>
          </n-gi>
          <n-gi>
            <n-card title="命中诊断" :bordered="false">
              <div class="tool-panel">
                <n-input v-model:value="hitDiagnosisDraft.subjectId" placeholder="输入待诊断用户 ID" />
                <n-select
                  v-model:value="hitDiagnosisDraft.experimentId"
                  :options="experiments.map((experiment) => ({ label: experiment.name, value: experiment.id }))"
                />
                <n-button type="primary" @click="diagnoseHit">开始诊断</n-button>
                <template v-if="hitDiagnosisResult">
                  <div class="condition-pill">
                    {{ hitDiagnosisResult.experimentName }} · {{ hitDiagnosisResult.finalDecision }}
                  </div>
                  <div class="snapshot-list">
                    <div v-for="stage in hitDiagnosisResult.stages" :key="stage.stage" class="snapshot-row">
                      <div>
                        <strong>{{ stage.stage }}</strong>
                        <span>{{ stage.message }}</span>
                      </div>
                      <n-tag :type="diagnosisStatusType(stage.status)" size="small">{{ stage.status }}</n-tag>
                    </div>
                  </div>
                </template>
                <n-empty v-else description="等待诊断" />
              </div>
            </n-card>
          </n-gi>
          <n-gi>
            <n-card title="异步任务" :bordered="false">
              <div class="tool-panel">
                <n-space>
                  <n-tag :type="asyncPolling ? 'success' : 'default'">
                    {{ asyncPolling ? '轮询中' : '已暂停' }}
                  </n-tag>
                  <n-tag v-if="asyncLastPolledAt" type="info">
                    {{ formatDateTime(asyncLastPolledAt) }}
                  </n-tag>
                  <n-tag v-if="asyncPollingError" type="error">{{ asyncPollingError }}</n-tag>
                </n-space>
                <n-space>
                  <n-button size="small" secondary @click="abStore.startAsyncTaskPolling()">开始轮询</n-button>
                  <n-button size="small" secondary @click="abStore.stopAsyncTaskPolling()">停止轮询</n-button>
                  <n-button size="small" secondary @click="abStore.refreshAsyncTasks()">立即刷新</n-button>
                  <n-button size="small" secondary @click="recoverWorkspaceState">恢复状态</n-button>
                </n-space>
                <div class="condition-pill">增强分流调平 · 可取消 · 可重试</div>
                <div class="condition-pill">
                  报告导出 · 运行 {{ reportExportQueueHealth.running }} · 失败 {{ reportExportQueueHealth.failed }} · 取消 {{ reportExportQueueHealth.canceled }}
                </div>
                <div class="condition-pill">敏感人群洞察 · 模型训练中</div>
                <div v-if="loadError" class="condition-pill danger">加载异常 · {{ loadError }}</div>
              </div>
            </n-card>
          </n-gi>
          <n-gi :span="2">
            <n-card title="数据查重" :bordered="false">
              <div class="tool-panel">
                <n-grid :cols="5" :x-gap="10" :y-gap="10" responsive="screen">
                  <n-gi><n-input v-model:value="dataDedupDraft.name" placeholder="任务名称" /></n-gi>
                  <n-gi>
                    <n-select
                      v-model:value="dataDedupDraft.experimentId"
                      clearable
                      :options="experiments.map((experiment) => ({ label: experiment.name, value: experiment.id }))"
                      placeholder="实验"
                    />
                  </n-gi>
                  <n-gi><n-select v-model:value="dataDedupDraft.scope" :options="dedupScopeOptions" /></n-gi>
                  <n-gi><n-select v-model:value="dataDedupDraft.schedule" :options="dedupScheduleOptions" /></n-gi>
                  <n-gi>
                    <n-input-number v-model:value="dataDedupDraft.windowMinutes" :min="1" :max="1440" style="width: 100%" />
                  </n-gi>
                </n-grid>
                <n-button type="primary" @click="createDedupTask">创建查重任务</n-button>
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
          </n-gi>
        </n-grid>
        <n-grid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
          <n-gi>
            <n-card title="权限审计" :bordered="false">
              <div class="snapshot-list">
                <div v-for="item in permissionAuditItems" :key="item.id" class="snapshot-row">
                  <div>
                    <strong>{{ item.objectName }}</strong>
                    <span>{{ item.domain }} · {{ item.action }} · 需要 {{ item.requiredLevel }} / 当前 {{ item.grantedLevel }}</span>
                    <small>{{ item.reason }}</small>
                  </div>
                  <n-tag :type="item.passed ? 'success' : 'error'" size="small">
                    {{ item.passed ? '通过' : '拦截' }}
                  </n-tag>
                </div>
              </div>
            </n-card>
          </n-gi>
          <n-gi>
            <n-card title="性能预算" :bordered="false">
              <div class="snapshot-list">
                <div v-for="item in performanceBudgetItems" :key="item.id" class="snapshot-row">
                  <div>
                    <strong>{{ item.scope }}</strong>
                    <span>{{ item.measuredMs }}ms / 预算 {{ item.budgetMs }}ms</span>
                    <small>{{ item.recoveryAction }}</small>
                  </div>
                  <n-tag :type="budgetStatusType(item.status)" size="small">
                    {{ item.status }}
                  </n-tag>
                </div>
              </div>
            </n-card>
          </n-gi>
        </n-grid>
        <n-card title="后端与真实接口接入状态" :bordered="false">
          <n-space v-if="apiIntegrationStatus" vertical>
            <n-space>
              <n-tag :type="apiIntegrationStatus.mode === 'api' ? 'success' : 'warning'" size="small">
                {{ apiIntegrationStatus.mode === 'api' ? '真实 API' : 'Mock / localStorage' }}
              </n-tag>
              <n-tag size="small">权限：{{ apiIntegrationStatus.permissionGuard }}</n-tag>
              <n-tag size="small">日志：{{ apiIntegrationStatus.operationLogStore }}</n-tag>
            </n-space>
            <div class="snapshot-list">
              <div v-for="item in apiIntegrationStatus.capabilities" :key="item.id" class="snapshot-row">
                <div>
                  <strong>{{ item.label }}</strong>
                  <span>{{ item.apiPath ?? '-' }}</span>
                  <small>{{ item.note }}</small>
                </div>
                <n-tag :type="item.status === 'ready' ? 'success' : item.status === 'backend_required' ? 'warning' : 'info'" size="small">
                  {{ item.status }}
                </n-tag>
              </div>
            </div>
          </n-space>
          <n-empty v-else description="等待加载" />
        </n-card>
        <n-card title="E2E 验收用例" :bordered="false">
          <n-table :bordered="false" size="small">
            <thead>
              <tr>
                <th>模块</th>
                <th>场景</th>
                <th>证据</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in e2eAcceptanceCases" :key="item.id">
                <td>{{ item.module }}</td>
                <td>{{ item.scenario }}</td>
                <td>{{ item.evidence }}</td>
                <td>
                  <n-tag :type="acceptanceStatusType(item.status)" size="small">{{ item.status }}</n-tag>
                </td>
              </tr>
            </tbody>
          </n-table>
        </n-card>
        <n-card title="PRD 覆盖明细" :bordered="false">
          <n-progress type="line" :percentage="coverageCompletion" :height="10" />
          <n-table :bordered="false" size="small">
            <thead>
              <tr>
                <th>PRD</th>
                <th>章节</th>
                <th>实现</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in summary?.coverage" :key="`${item.prd}-${item.section}`">
                <td>{{ item.prd }}</td>
                <td>{{ item.section }}</td>
                <td>{{ item.implementation }}</td>
                <td>{{ item.status }}</td>
              </tr>
            </tbody>
          </n-table>
        </n-card>
      </section>

      <section v-else-if="activePage === 'boards'" class="ab-section-stack">
        <n-card title="看板管理" :bordered="false">
          <n-grid :cols="4" :x-gap="12" :y-gap="12" responsive="screen">
            <n-gi>
              <label class="field-label">当前看板</label>
              <n-select
                v-model:value="selectedBoardId"
                :options="experimentBoards.map((board) => ({ label: board.name, value: board.id }))"
              />
            </n-gi>
            <n-gi>
              <label class="field-label">看板名称</label>
              <n-input v-model:value="boardDraft.name" />
            </n-gi>
            <n-gi>
              <label class="field-label">可见范围</label>
              <n-select v-model:value="boardDraft.visibility" :options="visibilityOptions.slice(1)" />
            </n-gi>
            <n-gi>
              <label class="field-label">授权用户</label>
              <n-select v-model:value="boardDraft.authorizedUserIds" multiple clearable :options="appMemberOptions" />
            </n-gi>
            <n-gi>
              <label class="field-label">时间范围</label>
              <n-select v-model:value="boardDraft.timeConfig.range" :options="boardRangeOptions" />
            </n-gi>
            <n-gi>
              <label class="field-label">粒度</label>
              <n-select v-model:value="boardDraft.timeConfig.granularity" :options="boardGranularityOptions" />
            </n-gi>
            <n-gi>
              <label class="field-label">开始时间</label>
              <n-input v-model:value="boardDraft.timeConfig.startTime" :disabled="boardDraft.timeConfig.range !== 'custom'" />
            </n-gi>
            <n-gi>
              <label class="field-label">结束时间</label>
              <n-input v-model:value="boardDraft.timeConfig.endTime" :disabled="boardDraft.timeConfig.range !== 'custom'" />
            </n-gi>
            <n-gi :span="4">
              <label class="field-label">描述</label>
              <n-input v-model:value="boardDraft.description" />
            </n-gi>
          </n-grid>
          <n-space class="full-button">
            <n-button type="primary" @click="saveBoard">保存/新建看板</n-button>
            <n-button secondary @click="copyBoardLink">复制链接</n-button>
            <n-button secondary @click="calculateBoardDiff">计算 Diff</n-button>
          </n-space>
        </n-card>

        <n-grid :cols="3" :x-gap="16" :y-gap="16" responsive="screen">
          <n-gi>
            <n-card title="添加组件" :bordered="false">
              <n-space vertical>
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
              </n-space>
            </n-card>
          </n-gi>
          <n-gi :span="2">
            <n-card :title="selectedBoard?.name ?? '看板编辑页'" :bordered="false">
              <div class="snapshot-list">
                <div v-for="widget in selectedBoardWidgets" :key="widget.id" class="snapshot-row">
                  <div>
                    <strong>{{ widget.title }}</strong>
                    <span>{{ widget.type }} · {{ widget.dataSource }} · 排序 {{ widget.order }}</span>
                    <small v-if="widget.text">{{ widget.text }}</small>
                  </div>
                  <n-space size="small">
                    <n-button size="small" secondary @click="moveBoardWidget(widget.id, 'up')">上移</n-button>
                    <n-button size="small" secondary @click="moveBoardWidget(widget.id, 'down')">下移</n-button>
                    <n-button size="small" secondary @click="removeBoardWidget(widget.id)">删除</n-button>
                  </n-space>
                </div>
              </div>
              <n-empty v-if="!selectedBoardWidgets.length" description="暂无组件" />
            </n-card>
          </n-gi>
        </n-grid>

        <n-card v-if="boardDiffResults.length" title="Diff 计算结果" :bordered="false">
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

        <n-grid :cols="3" :x-gap="16" :y-gap="16" responsive="screen">
          <n-gi v-for="trend in mustSeeTrends" :key="trend.metricId">
            <n-card :title="trend.metricName" :bordered="false">
              <strong class="board-value">{{ formatMetricValue(trend.currentValue) }}</strong>
              <span class="cell-subtitle">{{ trend.metricGroupName }}</span>
              <div class="trend-strip compact">
                <div v-for="point in trend.points" :key="point.time" :style="{ height: `${Math.max(point.value * 100, 8)}px` }" />
              </div>
            </n-card>
          </n-gi>
        </n-grid>

        <n-grid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
          <n-gi>
            <n-card title="实验健康度" :bordered="false">
              <div v-for="experiment in experiments" :key="experiment.id" class="health-row">
                <span>{{ experiment.name }}</span>
                <n-progress type="line" :percentage="experiment.trafficRatio" :height="8" />
                <n-tag :type="statusType(experiment.status)" size="small">{{ statusLabels[experiment.status] }}</n-tag>
              </div>
            </n-card>
          </n-gi>
          <n-gi>
            <n-card title="报警守护" :bordered="false">
              <div v-for="alarm in activeAlarms" :key="alarm.id" class="alarm-row">
                <div>
                  <strong>{{ alarm.name }}</strong>
                  <span>{{ alarm.description }}</span>
                </div>
                <n-tag :type="alarm.level === 'critical' ? 'error' : alarm.level === 'warning' ? 'warning' : 'info'">
                  {{ alarm.level }}
                </n-tag>
              </div>
            </n-card>
          </n-gi>
        </n-grid>
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

.full-button {
  width: 100%;
  margin-top: 16px;
}

.health-row {
  grid-template-columns: minmax(180px, 1fr) 140px 80px;
  display: grid;
}

@media (max-width: 960px) {
  .ab-page-heading,
  .report-summary {
    grid-template-columns: 1fr;
  }

  .ab-page-heading {
    flex-direction: column;
  }

  .health-row {
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }

  .audience-condition-row {
    grid-template-columns: 1fr;
  }
}
</style>
