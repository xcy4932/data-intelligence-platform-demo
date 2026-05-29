import {
  abAlarmTasks,
  abCoverageMatrix,
  abCohortReports,
  abDataDedupTasks,
  abDiversionConfigs,
  abExperimentBoards,
  abExperimentVariants,
  abExperiments,
  abExperimentPermissionGrants,
  abExperimentTemplates,
  abFeatureFlags,
  abFeatureVersions,
  abFilterTemplates,
  abFunnelReports,
  abHeatmapReports,
  abHitQueryTemplates,
  abMabReports,
  abMetricGroups,
  abMetricResults,
  abMetrics,
  abMetricTemplates,
  abMutexDomainGroups,
  abOperationLogs,
  abParamSchemas,
  abPublishPlans,
  abReceiverGroups,
  abReportOverviews,
  abSensitiveInsightTasks,
  abSmoothEffectTasks,
  abTrafficConfigs,
  abTrafficLayers,
  abTrendPoints,
  abUniformDiversionConfigs,
  abWhitelistTests,
  abMustSeeMetricTrends,
} from '@/mock/abTesting'
import type {
  AbExperimentAction,
  AbExperimentStatus,
  AlarmTask,
  BackendIntegrationStatus,
  BoardDiffResult,
  DataDedupTask,
  DataDedupTaskDraft,
  DiversionConfig,
  Experiment,
  ExperimentBoard,
  ExperimentBoardDraft,
  ExperimentDraft,
  ExperimentDraftValidationResult,
  ExperimentParamSchema,
  ExperimentPermissionGrant,
  ExperimentPermissionUpdatePayload,
  ExperimentReportOverview,
  ExperimentTemplate,
  ExperimentTrafficConfig,
  ExperimentVariant,
  FeatureDecisionResult,
  FeatureFlag,
  FeatureFlagDraft,
  FeatureLifecycleAction,
  FeaturePublishRequest,
  FeatureSolidifyRequest,
  FeatureVersion,
  FeatureVersionDraft,
  HitDiagnosisResult,
  HitQueryRequest,
  HitQueryResult,
  HitQueryTemplate,
  Metric,
  MetricGroup,
  OperationLog,
  PublishPlan,
  ReportExportTask,
  ReportFilter,
  SmoothEffectTaskOperation,
  SmoothEffectTask,
  UniformDiversionConfig,
  WhitelistTest,
  WhitelistTestDraft,
} from '@/types/abTesting'
import type { EntityId } from '@/types/common'
import {
  calculateSmoothTraffic,
  calculateTrafficRecommendation,
  evaluateFeatureDecision,
  getExperimentActionAvailability,
  validateExperimentParamValue,
  validateTrafficRatios,
} from '@/utils/abTestingRules'

const resolveMock = <T>(payload: T, delay = 180): Promise<T> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(payload), delay)
  })

const findExperiment = (experimentId: EntityId) =>
  abExperiments.find((experiment) => experiment.id === experimentId)

const findFeature = (featureId: EntityId) =>
  abFeatureFlags.find((feature) => feature.featureId === featureId)

const findFeatureVersion = (versionId: EntityId) =>
  abFeatureVersions.find((version) => version.versionId === versionId)

const currentOperator = { id: 'user_growth_lin', name: '林哲', department: '增长运营团队' }
const appMembers = [
  currentOperator,
  { id: 'user_data_zhou', name: '周婧', department: '商业化数据团队' },
  { id: 'user_product_xu', name: '许澄', department: '产品体验团队' },
  { id: 'user_qa_chen', name: '陈悦', department: '质量保障团队' },
]

const createId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

const nowIso = () => new Date().toISOString()

const paramKeyPattern = /^[A-Za-z_][A-Za-z0-9_]*$/

function resolveMember(userId?: string) {
  return appMembers.find((member) => member.id === userId) ?? currentOperator
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

function isGoalDetailed(goal?: string) {
  const normalized = goal?.trim() ?? ''
  if (normalized.length < 20) return false
  const hasStrategy = /(验证|策略|方案|功能|文案|页面|算法|推荐|按钮|实验)/.test(normalized)
  const hasAudience = /(用户|人群|场景|访问|设备|地域|城市|客群)/.test(normalized)
  const hasMetric = /(指标|点击|转化|留存|播放|时长|收入|CTR|率|MDE)/i.test(normalized)
  const hasLift = /(提升|降低|增长|减少|优化|改善|预期|%|百分点|\d+)/.test(normalized)
  return hasStrategy && hasAudience && hasMetric && hasLift
}

const createdMockStorageKey = 'ab-testing:mock-created-state:v1'

interface CreatedMockState {
  experiments: Experiment[]
  variants: ExperimentVariant[]
  paramSchemas: ExperimentParamSchema[]
  diversionConfigs: DiversionConfig[]
  trafficConfigs: ExperimentTrafficConfig[]
  uniformConfigs: UniformDiversionConfig[]
  smoothTasks: SmoothEffectTask[]
  permissionGrants: ExperimentPermissionGrant[]
  metricGroups: MetricGroup[]
  metrics: Metric[]
  reportExportTasks: ReportExportTask[]
  featureFlags: FeatureFlag[]
  featureVersions: FeatureVersion[]
  publishPlans: PublishPlan[]
  whitelistTests: WhitelistTest[]
  dataDedupTasks: DataDedupTask[]
  experimentBoards: ExperimentBoard[]
  operationLogs: OperationLog[]
}

function getMockStorage() {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function readCreatedMockState(): CreatedMockState {
  const emptyState: CreatedMockState = {
    experiments: [],
    variants: [],
    paramSchemas: [],
    diversionConfigs: [],
    trafficConfigs: [],
    uniformConfigs: [],
    smoothTasks: [],
    permissionGrants: [],
    metricGroups: [],
    metrics: [],
    reportExportTasks: [],
    featureFlags: [],
    featureVersions: [],
    publishPlans: [],
    whitelistTests: [],
    dataDedupTasks: [],
    experimentBoards: [],
    operationLogs: [],
  }
  const raw = getMockStorage()?.getItem(createdMockStorageKey)
  if (!raw) return emptyState
  try {
    return { ...emptyState, ...JSON.parse(raw) }
  } catch {
    return emptyState
  }
}

const abReportExportTasks: ReportExportTask[] = [
  {
    id: 'export_failed_metric_snapshot',
    experimentId: 'exp_feed_strategy',
    reportType: 'metrics',
    fileName: 'Feed 推荐策略实验-metrics-report.xlsx',
    status: 'failed',
    progress: 72,
    failureReason: '指标快照版本缺失，已允许重试并重新拉取快照。',
    createdBy: currentOperator.id,
    createdAt: '2026-05-28T16:00:00+02:00',
    updatedAt: '2026-05-28T16:03:00+02:00',
  },
]

function advanceReportExportQueue() {
  const changedTasks: ReportExportTask[] = []
  for (const task of abReportExportTasks) {
    if (task.status === 'queued') {
      task.status = 'running'
      task.progress = Math.max(task.progress, 18)
      task.updatedAt = nowIso()
      changedTasks.push({ ...task })
    } else if (task.status === 'running') {
      task.progress = Math.min(100, task.progress + 32)
      task.updatedAt = nowIso()
      if (task.progress >= 100) {
        task.status = 'success'
        task.downloadUrl = `/mock-downloads/abtest/${task.experimentId}/${task.reportType}.xlsx`
      }
      changedTasks.push({ ...task })
    }
  }
  if (changedTasks.length) persistCreatedMockState({ reportExportTasks: changedTasks })
}

function upsertById<T extends { id: EntityId }>(target: T[], items: T[]) {
  for (const item of items) {
    if (!target.some((existing) => existing.id === item.id)) target.unshift(item)
  }
}

function mergeById<T extends { id: EntityId }>(target: T[], items: T[]) {
  for (const item of items) {
    const index = target.findIndex((existing) => existing.id === item.id)
    if (index >= 0) {
      target.splice(index, 1, item)
    } else {
      target.unshift(item)
    }
  }
}

function mergeByKey<T>(target: T[], items: T[], getKey: (item: T) => EntityId) {
  for (const item of items) {
    const index = target.findIndex((existing) => getKey(existing) === getKey(item))
    if (index >= 0) {
      target.splice(index, 1, item)
    } else {
      target.unshift(item)
    }
  }
}

function applyCreatedMockState() {
  const state = readCreatedMockState()
  mergeById(abExperiments, state.experiments)
  mergeById(abExperimentVariants, state.variants)
  mergeById(abParamSchemas, state.paramSchemas)
  if (state.diversionConfigs.length) {
    for (const config of state.diversionConfigs) {
      if (!abDiversionConfigs.some((existing) => existing.experimentId === config.experimentId)) {
        abDiversionConfigs.push(config)
      }
    }
  }
  if (state.trafficConfigs.length) {
    for (const config of state.trafficConfigs) {
      if (!abTrafficConfigs.some((existing) => existing.experimentId === config.experimentId)) {
        abTrafficConfigs.push(config)
      }
    }
  }
  if (state.uniformConfigs.length) {
    for (const config of state.uniformConfigs) {
      if (!abUniformDiversionConfigs.some((existing) => existing.experimentId === config.experimentId)) {
        abUniformDiversionConfigs.push(config)
      }
    }
  }
  mergeById(abSmoothEffectTasks, state.smoothTasks)
  mergeById(abExperimentPermissionGrants, state.permissionGrants)
  mergeById(abMetricGroups, state.metricGroups)
  mergeById(abMetrics, state.metrics)
  mergeById(abReportExportTasks, state.reportExportTasks)
  mergeByKey(abFeatureFlags, state.featureFlags, (item) => item.featureId)
  mergeByKey(abFeatureVersions, state.featureVersions, (item) => item.versionId)
  mergeByKey(abPublishPlans, state.publishPlans, (item) => item.publishId)
  mergeById(abWhitelistTests, state.whitelistTests)
  mergeById(abDataDedupTasks, state.dataDedupTasks)
  mergeById(abExperimentBoards, state.experimentBoards)
  upsertById(abOperationLogs, state.operationLogs)
}

function persistCreatedMockState(addition: Partial<CreatedMockState>) {
  const state = readCreatedMockState()
  const incomingPermissionExperimentIds = new Set((addition.permissionGrants ?? []).map((grant) => grant.experimentId))
  const nextState: CreatedMockState = {
    experiments: [...(addition.experiments ?? []), ...state.experiments].filter(
      (item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index,
    ),
    variants: [...(addition.variants ?? []), ...state.variants].filter(
      (item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index,
    ),
    paramSchemas: [...(addition.paramSchemas ?? []), ...state.paramSchemas].filter(
      (item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index,
    ),
    diversionConfigs: [...(addition.diversionConfigs ?? []), ...state.diversionConfigs].filter(
      (item, index, items) => items.findIndex((candidate) => candidate.experimentId === item.experimentId) === index,
    ),
    trafficConfigs: [...(addition.trafficConfigs ?? []), ...state.trafficConfigs].filter(
      (item, index, items) => items.findIndex((candidate) => candidate.experimentId === item.experimentId) === index,
    ),
    uniformConfigs: [...(addition.uniformConfigs ?? []), ...state.uniformConfigs].filter(
      (item, index, items) => items.findIndex((candidate) => candidate.experimentId === item.experimentId) === index,
    ),
    smoothTasks: [...(addition.smoothTasks ?? []), ...state.smoothTasks].filter(
      (item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index,
    ),
    permissionGrants: [
      ...(addition.permissionGrants ?? []),
      ...state.permissionGrants.filter((grant) => !incomingPermissionExperimentIds.has(grant.experimentId)),
    ].filter(
      (item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index,
    ),
    metricGroups: [...(addition.metricGroups ?? []), ...state.metricGroups].filter(
      (item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index,
    ),
    metrics: [...(addition.metrics ?? []), ...state.metrics].filter(
      (item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index,
    ),
    reportExportTasks: [...(addition.reportExportTasks ?? []), ...state.reportExportTasks].filter(
      (item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index,
    ),
    featureFlags: [...(addition.featureFlags ?? []), ...state.featureFlags].filter(
      (item, index, items) => items.findIndex((candidate) => candidate.featureId === item.featureId) === index,
    ),
    featureVersions: [...(addition.featureVersions ?? []), ...state.featureVersions].filter(
      (item, index, items) => items.findIndex((candidate) => candidate.versionId === item.versionId) === index,
    ),
    publishPlans: [...(addition.publishPlans ?? []), ...state.publishPlans].filter(
      (item, index, items) => items.findIndex((candidate) => candidate.publishId === item.publishId) === index,
    ),
    whitelistTests: [...(addition.whitelistTests ?? []), ...state.whitelistTests].filter(
      (item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index,
    ),
    dataDedupTasks: [...(addition.dataDedupTasks ?? []), ...state.dataDedupTasks].filter(
      (item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index,
    ),
    experimentBoards: [...(addition.experimentBoards ?? []), ...state.experimentBoards].filter(
      (item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index,
    ),
    operationLogs: [...(addition.operationLogs ?? []), ...state.operationLogs].filter(
      (item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index,
    ),
  }
  getMockStorage()?.setItem(createdMockStorageKey, JSON.stringify(nextState))
}

applyCreatedMockState()

export const abTestingApiPaths = {
  workspaceSummary: '/api/abtest/workspace/summary',
  experiments: '/api/abtest/experiments',
  experiment: (experimentId: EntityId) => `/api/abtest/experiments/${experimentId}`,
  experimentVariants: (experimentId: EntityId) => `/api/abtest/experiments/${experimentId}/variants`,
  experimentParams: (experimentId: EntityId) => `/api/abtest/experiments/${experimentId}/params`,
  experimentPlanning: (experimentId: EntityId) => `/api/abtest/experiments/${experimentId}/planning-bundle`,
  experimentTemplates: '/api/abtest/experiment-templates',
  experimentValidate: '/api/abtest/experiments/validate',
  experimentSubmitDebug: '/api/abtest/experiments/submit-debug',
  experimentTransition: (experimentId: EntityId) => `/api/abtest/experiments/${experimentId}/status-transition`,
  experimentSafeEdit: (experimentId: EntityId) => `/api/abtest/experiments/${experimentId}/safe-edit`,
  experimentScaleTraffic: (experimentId: EntityId) => `/api/abtest/experiments/${experimentId}/traffic-scale`,
  experimentCloseVariant: (experimentId: EntityId, variantId: EntityId) =>
    `/api/abtest/experiments/${experimentId}/variants/${variantId}/close`,
  experimentPermissions: (experimentId: EntityId) => `/api/abtest/experiments/${experimentId}/permissions`,
  hitQuery: '/api/abtest/tools/hit-query',
  hitQueryTemplates: '/api/abtest/tools/hit-query/templates',
  hitDiagnosis: '/api/abtest/tools/hit-diagnosis',
  dataDedupTasks: '/api/abtest/tools/data-dedup-tasks',
  dataDedupTaskRun: (taskId: EntityId) => `/api/abtest/tools/data-dedup-tasks/${taskId}/run`,
  dataDedupTaskDownload: (taskId: EntityId) => `/api/abtest/tools/data-dedup-tasks/${taskId}/download`,
  experimentBoards: '/api/abtest/boards',
  experimentBoard: (boardId: EntityId) => `/api/abtest/boards/${boardId}`,
  experimentBoardWidgets: (boardId: EntityId) => `/api/abtest/boards/${boardId}/widgets`,
  experimentBoardShare: (boardId: EntityId) => `/api/abtest/boards/${boardId}/share-link`,
  experimentBoardDiff: (boardId: EntityId) => `/api/abtest/boards/${boardId}/diff`,
  trafficCalculator: '/api/abtest/traffic/calculator',
  trafficLayers: '/api/abtest/traffic/layers',
  mutexDomains: '/api/abtest/traffic/mutex-domain-groups',
  uniformDiversionStart: '/api/abtest/traffic/rerandomization-tasks',
  uniformDiversionTask: (taskId: EntityId) => `/api/abtest/traffic/rerandomization-tasks/${taskId}`,
  uniformDiversionCancel: (taskId: EntityId) => `/api/abtest/traffic/rerandomization-tasks/${taskId}/cancel`,
  uniformDiversionApply: (taskId: EntityId) => `/api/abtest/traffic/rerandomization-tasks/${taskId}/apply`,
  smoothTask: (taskId: EntityId) => `/api/abtest/smooth-effect-tasks/${taskId}`,
  smoothTaskOperation: (taskId: EntityId, action: SmoothEffectTaskOperation) =>
    `/api/abtest/smooth-effect-tasks/${taskId}/${action}`,
  audienceEstimate: '/api/abtest/audience-estimate',
  runtimeDecision: '/api/abtest/runtime/decision',
  operationLogs: '/api/abtest/operation-logs',
  metricGroups: (appId: EntityId) => `/api/apps/${appId}/metric-groups`,
  metrics: (appId: EntityId) => `/api/apps/${appId}/metrics`,
  metricTemplates: (appId: EntityId) => `/api/apps/${appId}/metric-templates`,
  alarmTasks: (appId: EntityId) => `/api/apps/${appId}/metric-alarm-tasks`,
  receiverGroups: (appId: EntityId) => `/api/apps/${appId}/metric-receiver-groups`,
  mustSeeTrends: (appId: EntityId) => `/api/apps/${appId}/metric-must-see-trends`,
  reportOverview: (experimentId: EntityId) => `/api/abtest/reports/${experimentId}/overview`,
  reportMetrics: (experimentId: EntityId) => `/api/abtest/reports/${experimentId}/metrics`,
  reportFunnel: (metricId: EntityId) => `/api/abtest/reports/funnels/${metricId}`,
  reportCohort: (metricId: EntityId) => `/api/abtest/reports/cohorts/${metricId}`,
  reportHeatmap: (experimentId: EntityId) => `/api/abtest/reports/${experimentId}/heatmap`,
  reportMab: (experimentId: EntityId) => `/api/abtest/reports/${experimentId}/mab`,
  reportExportTasks: (experimentId: EntityId) => `/api/abtest/reports/${experimentId}/export-tasks`,
  reportExportTaskCancel: (taskId: EntityId) => `/api/abtest/report-export-tasks/${taskId}/cancel`,
  reportExportTaskRetry: (taskId: EntityId) => `/api/abtest/report-export-tasks/${taskId}/retry`,
  sensitiveInsightTasks: (experimentId?: EntityId) =>
    experimentId ? `/api/abtest/insight-tasks?experimentId=${experimentId}` : '/api/abtest/insight-tasks',
  featureFlags: '/api/feature-flags',
  featureFlag: (featureId: EntityId) => `/api/feature-flags/${featureId}`,
  featureVersions: (featureId: EntityId) => `/api/feature-flags/${featureId}/versions`,
  featureVersionPublish: (featureId: EntityId, versionId: EntityId) =>
    `/api/feature-flags/${featureId}/versions/${versionId}/publish`,
  featureRollback: (featureId: EntityId) => `/api/feature-flags/${featureId}/rollback`,
  featureLifecycle: (featureId: EntityId) => `/api/feature-flags/${featureId}/lifecycle`,
  featurePublishPlans: '/api/feature-flags/publish-plans',
  featureWhitelistTests: '/api/feature-flags/whitelist-tests',
  featureWhitelistTestsByFeature: (featureId: EntityId) => `/api/feature-flags/${featureId}/whitelist-tests`,
  featureSolidify: '/api/feature-flags/solidify-from-experiment',
  featureDecision: '/api/feature-flags/runtime/decision',
} as const

export const getAbBackendIntegrationStatus = (): Promise<BackendIntegrationStatus> => {
  const mode = import.meta.env.VITE_ABTEST_API_MODE === 'api' ? 'api' : 'mock'
  const baseUrl = import.meta.env.VITE_ABTEST_API_BASE ?? ''
  return resolveMock({
    mode,
    persistence: mode === 'api' ? 'backend' : 'localStorage',
    baseUrl: baseUrl || '未配置，当前使用前端 Mock',
    permissionGuard: mode === 'api' ? 'backend' : 'mock',
    operationLogStore: mode === 'api' ? 'backend' : 'localStorage',
    capabilities: [
      {
        id: 'real_api_contract',
        label: '真实 API 契约',
        status: 'api_contract',
        apiPath: abTestingApiPaths.experimentSubmitDebug,
        note: '实验提交、校验、流量层、互斥域、调平和平滑任务路径已固定，当前未切到真实服务。',
      },
      {
        id: 'permission_check',
        label: '权限校验',
        status: mode === 'api' ? 'ready' : 'backend_required',
        apiPath: abTestingApiPaths.operationLogs,
        note: '前端展示权限审计，最终鉴权需由后端按资源和角色兜底。',
      },
      {
        id: 'async_task',
        label: '异步任务状态',
        status: mode === 'api' ? 'ready' : 'mocked',
        apiPath: abTestingApiPaths.smoothTask('taskId'),
        note: '前端以任务状态为准刷新 UI；Mock 使用内存与 localStorage 模拟轮询。',
      },
      {
        id: 'sdk_diversion',
        label: 'SDK / 分流服务',
        status: 'backend_required',
        apiPath: abTestingApiPaths.runtimeDecision,
        note: 'Runtime 决策、曝光去重、分流 ID 稳定性需要真实 SDK 或分流 Agent 接入。',
      },
      {
        id: 'audience_traffic_compute',
        label: '受众预估与真实流量计算',
        status: 'backend_required',
        apiPath: abTestingApiPaths.audienceEstimate,
        note: '当前用公式与 Mock 数据估算，真实口径需要数仓/画像服务返回。',
      },
      {
        id: 'diagnosis_query',
        label: '命中查询与诊断接口',
        status: mode === 'api' ? 'ready' : 'api_contract',
        apiPath: `${abTestingApiPaths.hitQuery} / ${abTestingApiPaths.hitDiagnosis}`,
        note: 'PRD 第 35 章用户命中查询、命中诊断、模板、下载接口已进入契约；Mock 仍使用本地规则生成结果。',
      },
      {
        id: 'dedup_tasks',
        label: '数据查重任务接口',
        status: mode === 'api' ? 'ready' : 'api_contract',
        apiPath: abTestingApiPaths.dataDedupTasks,
        note: '支持创建任务、每日运行、手动运行和下载结果，真实去重需日志明细服务接入。',
      },
      {
        id: 'experiment_boards',
        label: '实验看板接口',
        status: mode === 'api' ? 'ready' : 'api_contract',
        apiPath: abTestingApiPaths.experimentBoards,
        note: '看板 CRUD、组件、授权、复制链接和 diff 计算路径已固定，真实图表数据需后端聚合服务。',
      },
    ],
    requiredBackends: [
      '实验 CRUD 与提交调试 API',
      '权限校验与操作日志持久化',
      '调平/平滑异步任务队列',
      'SDK 或分流服务 Runtime 决策',
      '受众预估与真实流量计算服务',
      '命中查询/诊断与下载服务',
      '数据查重任务与日志明细服务',
      '实验看板聚合与分享授权服务',
    ],
  })
}

export const getAbWorkspaceSummary = () =>
  resolveMock({
    totalExperiments: abExperiments.length,
    runningExperiments: abExperiments.filter((item) => item.status === 'RUNNING').length,
    debuggingExperiments: abExperiments.filter((item) => item.status === 'DEBUGGING').length,
    featureFlags: abFeatureFlags.length,
    activeMetricGroups: abMetricGroups.filter((item) => item.status === 'active').length,
    enabledAlarms: abAlarmTasks.filter((item) => item.enabled).length,
    coverage: abCoverageMatrix,
  })

export const getAbExperiments = (filters?: {
  keyword?: string
  statuses?: AbExperimentStatus[]
  type?: string
}): Promise<Experiment[]> => {
  const keyword = filters?.keyword?.trim().toLowerCase()
  return resolveMock(
    abExperiments.filter((experiment) => {
      const keywordMatched =
        !keyword ||
        experiment.name.toLowerCase().includes(keyword) ||
        experiment.id.toLowerCase().includes(keyword) ||
        experiment.owner.name.toLowerCase().includes(keyword)
      const statusMatched = !filters?.statuses?.length || filters.statuses.includes(experiment.status)
      const typeMatched = !filters?.type || experiment.type === filters.type
      return keywordMatched && statusMatched && typeMatched
    }),
  )
}

export const getAbExperiment = (experimentId: EntityId): Promise<Experiment | undefined> =>
  resolveMock(findExperiment(experimentId))

export const getAbExperimentVariants = (experimentId: EntityId) =>
  resolveMock(abExperimentVariants.filter((variant) => variant.experimentId === experimentId))

export const getAbExperimentParamSchemas = (experimentId: EntityId) =>
  resolveMock(abParamSchemas.filter((schema) => schema.experimentId === experimentId))

export const getAbExperimentPlanningBundle = (experimentId: EntityId) =>
  resolveMock({
    experiment: findExperiment(experimentId),
    variants: abExperimentVariants.filter((variant) => variant.experimentId === experimentId),
    paramSchemas: abParamSchemas.filter((schema) => schema.experimentId === experimentId),
    diversionConfig: abDiversionConfigs.find((config) => config.experimentId === experimentId),
    trafficConfig: abTrafficConfigs.find((config) => config.experimentId === experimentId),
    uniformConfig: abUniformDiversionConfigs.find((config) => config.experimentId === experimentId),
    smoothTask: abSmoothEffectTasks.find((task) => task.experimentId === experimentId),
  })

export const validateAbExperimentDraft = (
  draft: ExperimentDraft | Partial<Experiment>,
): Promise<ExperimentDraftValidationResult> => {
  const richDraft = 'variants' in draft && Array.isArray(draft.variants) ? draft : null
  const duplicateName = Boolean(
    draft.name?.trim() &&
      abExperiments.some(
        (experiment) =>
          ['RUNNING', 'DEBUGGING'].includes(experiment.status) && experiment.name.trim() === draft.name?.trim(),
      ),
  )
  const items: ExperimentDraftValidationResult['items'] = [
    {
      level: draft.type ? 'PASS' : 'ERROR',
      code: 'EXPERIMENT_TYPE_REQUIRED',
      message: draft.type ? '实验类型已选择' : '请选择实验类型',
      step: 1,
    },
    {
      level: draft.name?.trim() && draft.name.length <= 100 && !duplicateName ? 'PASS' : 'ERROR',
      code: 'EXPERIMENT_NAME_REQUIRED',
      message: duplicateName
        ? '同一应用下运行中或调试中实验名称不可重复'
        : draft.name?.trim() && draft.name.length <= 100
          ? '实验名称已填写'
          : '请输入 1-100 字实验名称',
      step: 2,
    },
    {
      level: (draft.description?.length ?? 0) <= 1000 ? 'PASS' : 'ERROR',
      code: 'EXPERIMENT_DESCRIPTION_LENGTH',
      message: (draft.description?.length ?? 0) <= 1000 ? '实验描述长度合法' : '实验描述最多 1000 字',
      step: 2,
    },
    {
      level: isGoalDetailed(draft.goal) ? 'PASS' : 'ERROR',
      code: 'GOAL_TOO_SIMPLE',
      message: isGoalDetailed(draft.goal) ? '实验目标完整' : '实验目标需说明策略、用户、指标和预期提升',
      step: 2,
    },
  ]

  if (richDraft) {
    const variantTraffic = richDraft.variants.map((variant) => variant.trafficRatio)
    const variantTrafficValidation = validateTrafficRatios(variantTraffic)
    const paramKeys = richDraft.paramSchemas.map((schema) => schema.key.trim()).filter(Boolean)
    const paramKeySet = new Set(paramKeys)
    const variantNames = richDraft.variants.map((variant) => variant.name.trim()).filter(Boolean)
    const invalidParamKey = richDraft.paramSchemas.find((schema) => schema.key.trim() && !paramKeyPattern.test(schema.key.trim()))
    const layer = abTrafficLayers.find((item) => item.id === richDraft.trafficConfig.trafficLayerId)
    const mutexDomain = abMutexDomainGroups
      .flatMap((group) => group.domains)
      .find((domain) => domain.id === richDraft.trafficConfig.mutexDomainId)
    const missingParamBinding = richDraft.paramSchemas.some((schema) =>
      richDraft.variants.some((variant) => schema.required && variant.params[schema.key] === undefined),
    )
    const invalidParamValue = richDraft.paramSchemas.flatMap((schema) =>
      richDraft.variants
        .map((variant) => ({
          schema,
          variant,
          result: validateExperimentParamValue(schema.type, variant.params[schema.key], schema.required),
        }))
        .filter((item) => !item.result.valid),
    )[0]
    const invalidAudienceCondition = richDraft.diversionConfig.filter.groups
      .flatMap((group) => group.conditions)
      .find((condition) => {
        const operatorNeedsValue = !['is_null', 'is_not_null'].includes(condition.operator)
        const emptyArray = Array.isArray(condition.value) && condition.value.length === 0
        return !condition.field.trim() || (operatorNeedsValue && (condition.value === undefined || condition.value === '' || emptyArray))
      })
    const smoothValid =
      richDraft.trafficConfig.effectiveMode === 'IMMEDIATE' ||
      ((richDraft.trafficConfig.smoothDurationMinutes ?? 0) >= 1 &&
        (richDraft.trafficConfig.smoothDurationMinutes ?? 0) <= 1440)
    const uniformReady =
      !richDraft.trafficConfig.uniformDiversionEnabled || richDraft.trafficConfig.uniformStatus === 'SUCCESS'
    const metricComparisonCount = Math.max(1, richDraft.metricIds.length) * Math.max(1, richDraft.variants.length - 1)
    const needsMultipleComparisonCorrection = metricComparisonCount > 1
    const hasMultipleComparisonCorrection = richDraft.trafficConfig.multiComparisonCorrection === true
    const mdeValue = richDraft.trafficConfig.planningMdeValue
    const mdeTooSmall = typeof mdeValue === 'number' && mdeValue < 0.02
    const recommendedTrafficRatio = richDraft.trafficConfig.planningRecommendedTrafficRatio
    const configuredTrafficRatio = richDraft.trafficConfig.experimentTrafficRatio / 100
    const estimatedReachableUsers =
      (richDraft.trafficConfig.planningEstimatedUsers ?? 0) *
      (richDraft.trafficConfig.planningTrafficFilterRatio ?? 1) *
      configuredTrafficRatio
    const estimatedTrafficInsufficient =
      typeof recommendedTrafficRatio === 'number'
        ? configuredTrafficRatio + 0.0001 < recommendedTrafficRatio
        : estimatedReachableUsers > 0 && estimatedReachableUsers < richDraft.variants.length * 5000
    const decisionIdField = richDraft.diversionConfig.decisionIdField.trim().toLowerCase()
    const stableDecisionId =
      richDraft.diversionConfig.decisionIdType !== 'custom' &&
      ['uid', 'user_id', 'device_id', 'did', 'uuid'].includes(decisionIdField) &&
      !/(session|request|trace|time|timestamp|random)/i.test(decisionIdField)
    const smoothDuration = richDraft.trafficConfig.smoothDurationMinutes ?? 0
    const smoothDurationSuggestionPass =
      richDraft.trafficConfig.effectiveMode === 'IMMEDIATE' || (smoothDuration >= 10 && smoothDuration <= 720)

    items.push(
      {
        level: richDraft.tags.length <= 20 ? 'PASS' : 'ERROR',
        code: 'EXPERIMENT_TAG_LIMIT',
        message: richDraft.tags.length <= 20 ? '实验标签数量合法' : '单个实验最多 20 个标签',
        step: 2,
      },
      {
        level: richDraft.durationDays >= 7 ? 'PASS' : 'WARN',
        code: 'EXPERIMENT_DURATION_SHORT',
        message:
          richDraft.durationDays >= 7
            ? '实验时长满足完整周期建议'
            : '实验周期过短，可能无法覆盖完整工作日与周末周期',
        step: 2,
      },
      {
        level: richDraft.variants.length >= 2 && richDraft.variants.length <= 20 ? 'PASS' : 'ERROR',
        code: 'VARIANT_COUNT',
        message:
          richDraft.variants.length >= 2 && richDraft.variants.length <= 20
            ? '至少包含 2 个实验版本'
            : '普通实验至少 2 个版本，最多 20 个版本',
        step: 3,
      },
      {
        level: variantNames.length === richDraft.variants.length && new Set(variantNames).size === variantNames.length ? 'PASS' : 'ERROR',
        code: 'VARIANT_NAME_UNIQUE',
        message:
          variantNames.length === richDraft.variants.length && new Set(variantNames).size === variantNames.length
            ? '版本名称唯一'
            : '版本名称不能为空，且同一实验内不可重复',
        step: 3,
      },
      {
        level: richDraft.variants.filter((variant) => variant.isControl).length === 1 ? 'PASS' : 'ERROR',
        code: 'CONTROL_VARIANT',
        message:
          richDraft.variants.filter((variant) => variant.isControl).length === 1
            ? '对照组唯一'
            : '必须且只能有一个对照组',
        step: 3,
      },
      {
        level: variantTrafficValidation.valid ? 'PASS' : 'ERROR',
        code: 'VARIANT_TRAFFIC_RATIO',
        message: variantTrafficValidation.valid
          ? '版本流量比例合计 100%'
          : variantTrafficValidation.message ?? '版本流量比例不合法',
        step: 3,
      },
      {
        level:
          paramKeys.length === richDraft.paramSchemas.length &&
          paramKeySet.size === paramKeys.length &&
          !invalidParamKey
            ? 'PASS'
            : 'ERROR',
        code: 'PARAM_SCHEMA_KEY',
        message: invalidParamKey
          ? '参数 Key 只能包含字母、数字、下划线，且不能以数字开头'
          : paramKeys.length === richDraft.paramSchemas.length && paramKeySet.size === paramKeys.length
            ? '参数 Key 唯一且完整'
            : '参数 Key 不能为空且不能重复',
        step: 3,
      },
      {
        level: missingParamBinding ? 'ERROR' : 'PASS',
        code: 'PARAM_BINDING',
        message: missingParamBinding ? '必填参数需要在每个版本中配置值' : '版本参数绑定完整',
        step: 3,
      },
      {
        level: invalidParamValue ? 'ERROR' : 'PASS',
        code: 'PARAM_VALUE_TYPE',
        message: invalidParamValue
          ? `${invalidParamValue.variant.name} / ${invalidParamValue.schema.name}: ${invalidParamValue.result.message}`
          : '版本参数值类型合法',
        step: 3,
      },
      {
        level: richDraft.diversionConfig.decisionIdField.trim() ? 'PASS' : 'ERROR',
        code: 'DECISION_ID_REQUIRED',
        message: richDraft.diversionConfig.decisionIdField.trim() ? '分流 ID 已配置' : '请配置分流 ID 字段',
        step: 4,
      },
      {
        level: richDraft.diversionConfig.filter.groups.length > 0 ? 'PASS' : 'WARN',
        code: 'AUDIENCE_FILTER',
        message: richDraft.diversionConfig.filter.groups.length > 0 ? '受众条件已配置' : '未配置受众条件，将命中全量用户',
        step: 4,
      },
      {
        level:
          richDraft.diversionConfig.filter.groups.length > 0 &&
          richDraft.diversionConfig.filter.groups.every((group) => group.conditions.length > 0) &&
          !invalidAudienceCondition
            ? 'PASS'
            : 'ERROR',
        code: 'AUDIENCE_RULES',
        message:
          richDraft.diversionConfig.filter.groups.length > 0 &&
          richDraft.diversionConfig.filter.groups.every((group) => group.conditions.length > 0) &&
          !invalidAudienceCondition
            ? '受众 AND/OR 条件合法'
            : '请至少配置一个完整受众条件组',
        step: 4,
      },
      {
        level:
          richDraft.trafficConfig.experimentTrafficRatio >= 0.01 &&
          richDraft.trafficConfig.experimentTrafficRatio <= 100
            ? 'PASS'
            : 'ERROR',
        code: 'EXPERIMENT_TRAFFIC_RANGE',
        message:
          richDraft.trafficConfig.experimentTrafficRatio >= 0.01 &&
          richDraft.trafficConfig.experimentTrafficRatio <= 100
            ? '实验流量范围合法'
            : '实验流量必须在 0.01%-100% 之间',
        step: 5,
      },
      {
        level: richDraft.trafficConfig.trafficLayerId ? 'PASS' : 'ERROR',
        code: 'TRAFFIC_LAYER_REQUIRED',
        message: richDraft.trafficConfig.trafficLayerId ? `已选择流量层：${layer?.name ?? richDraft.trafficConfig.trafficLayerId}` : '请选择流量层',
        step: 5,
      },
      {
        level:
          !layer || richDraft.trafficConfig.experimentTrafficRatio <= layer.availableTrafficRatio ? 'PASS' : 'ERROR',
        code: 'TRAFFIC_LAYER_CAPACITY',
        message:
          !layer || richDraft.trafficConfig.experimentTrafficRatio <= layer.availableTrafficRatio
            ? '实验流量未超过流量层可用比例'
            : '实验流量超过当前流量层可用比例',
        step: 5,
      },
      {
        level:
          !richDraft.trafficConfig.useMutex ||
          (richDraft.trafficConfig.mutexDomainId && (!mutexDomain || mutexDomain.runningExperimentIds.length === 0))
            ? 'PASS'
            : 'ERROR',
        code: 'MUTEX_DOMAIN_AVAILABLE',
        message:
          !richDraft.trafficConfig.useMutex ||
          (richDraft.trafficConfig.mutexDomainId && (!mutexDomain || mutexDomain.runningExperimentIds.length === 0))
            ? '互斥域可用'
            : `该互斥域已有 ${mutexDomain?.runningExperimentIds.length ?? 0} 个运行中实验，不允许强制加入`,
        step: 5,
      },
      {
        level: smoothValid ? 'PASS' : 'ERROR',
        code: 'SMOOTH_DURATION',
        message: smoothValid ? '平滑生效时间合法' : '平滑生效时间必须在 1-1440 分钟之间',
        step: 5,
      },
      {
        level: uniformReady ? 'PASS' : 'ERROR',
        code: 'UNIFORM_DIVERSION_READY',
        message: uniformReady ? '增强分流均匀性状态满足提交要求' : '开启增强分流均匀性后，需先调平成功',
        step: 5,
      },
      {
        level: richDraft.metricIds.length > 0 ? 'PASS' : 'ERROR',
        code: 'METRIC_SNAPSHOT',
        message: richDraft.metricIds.length > 0 ? '已绑定指标快照' : '请至少选择一个实验指标',
        step: 6,
      },
      {
        level: !needsMultipleComparisonCorrection || hasMultipleComparisonCorrection ? 'PASS' : 'WARN',
        code: 'MULTIPLE_COMPARISON_CORRECTION',
        message:
          !needsMultipleComparisonCorrection || hasMultipleComparisonCorrection
            ? '多重比较校正已确认'
            : `当前有 ${metricComparisonCount} 个指标/版本比较，建议启用多重比较校正`,
        step: 6,
      },
      {
        level: mdeTooSmall ? 'WARN' : 'PASS',
        code: 'MDE_TOO_SMALL',
        message: mdeTooSmall
          ? `当前 MDE ${Math.round((mdeValue ?? 0) * 10000) / 100}% 偏小，建议提高 MDE、延长周期或扩大受众`
          : 'MDE 阈值处于可评估范围',
        step: 6,
      },
      {
        level: estimatedTrafficInsufficient ? 'WARN' : 'PASS',
        code: 'TRAFFIC_ESTIMATE_SUFFICIENT',
        message: estimatedTrafficInsufficient
          ? '预计流量低于样本量建议，建议提高流量、延长实验周期或减少版本数'
          : '预计流量满足当前样本量建议',
        step: 6,
      },
      {
        level: stableDecisionId ? 'PASS' : 'WARN',
        code: 'DECISION_ID_STABILITY',
        message: stableDecisionId
          ? '分流 ID 稳定性满足要求'
          : '分流 ID 建议使用 uid、did、device_id 等稳定字段，避免会话级或随机字段',
        step: 6,
      },
      {
        level: smoothDurationSuggestionPass ? 'PASS' : 'WARN',
        code: 'SMOOTH_DURATION_SUGGESTION',
        message: smoothDurationSuggestionPass
          ? '平滑生效时间建议已满足'
          : '平滑时间建议控制在 10-720 分钟，过短易抖动，过长会拖慢调试节奏',
        step: 6,
      },
    )

    if (richDraft.type === 'SPLIT_URL') {
      const urls = richDraft.variants.map((variant) => richDraft.specialConfig.splitUrl.urls[variant.tempId]?.trim() ?? '')
      const valid = urls.every(Boolean) && urls.every((url) => /^https?:\/\//.test(url)) && new Set(urls).size === urls.length
      const rulesValid =
        richDraft.specialConfig.splitUrl.matchMode === 'SIMPLE' ||
        richDraft.variants.every((variant) => {
          const rule = richDraft.specialConfig.splitUrl.rules[variant.tempId]
          return rule?.pattern?.trim() && rule.matchType
        })
      items.push({
        level: valid && rulesValid ? 'PASS' : 'ERROR',
        code: 'SPLIT_URL_CONFIG',
        message:
          valid && rulesValid
            ? '多链接版本 URL 与匹配规则已配置'
            : '多链接实验每个版本 URL 必填且不可重复，精准匹配模式需配置每个版本的匹配规则',
        step: 3,
      })
    }
    if (richDraft.type === 'PUSH') {
      const push = richDraft.specialConfig.push
      const missingVariantCopy = richDraft.variants.some(
        (variant) => !push.titles[variant.tempId]?.trim() || !push.contents[variant.tempId]?.trim(),
      )
      const valid = Boolean(
        push.channel &&
          push.touchRange &&
          push.frequencyCapPerUser > 0 &&
          push.rehearsalChecked &&
          push.approvalStatus === 'APPROVED' &&
          (push.sendMode === 'TRIGGER' ? push.triggerCondition : push.sendTime) &&
          !missingVariantCopy,
      )
      items.push({
        level: valid ? 'PASS' : 'ERROR',
        code: 'PUSH_CONFIG',
        message: valid ? '推送配置、频控、演练和审核均已完成' : '推送实验需配置通道、触达范围、频控、发送规则、版本内容，并完成演练和审核',
        step: 3,
      })
    }
    if (richDraft.type === 'MVT') {
      const elements = richDraft.specialConfig.mvt.elements
      const valid =
        elements.length >= 2 &&
        elements.every((element) => element.name.trim() && element.variants.length >= 2) &&
        Boolean(richDraft.specialConfig.mvt.primaryElementId)
      const combinationCount = elements.reduce((total, element) => total * Math.max(element.variants.length, 1), 1)
      items.push({
        level: valid ? 'PASS' : 'ERROR',
        code: 'MVT_CONFIG',
        message: valid ? 'MVT 元素、主元素和变体数量合法' : 'MVT 至少配置 2 个实验元素、主元素，且每个元素至少 2 个变体',
        step: 3,
      })
      if (valid && combinationCount > 12) {
        items.push({
          level: 'WARN',
          code: 'MVT_SAMPLE_RISK',
          message: `MVT 将生成 ${combinationCount} 个组合版本，请确认样本量充足`,
          step: 3,
        })
      }
    }
    if (richDraft.type === 'MAB') {
      const mab = richDraft.specialConfig.mab
      const mabValid =
        Boolean(mab.optimizationMetricId) &&
        mab.explorationTrafficRatio > 0 &&
        mab.rewardWindowHours > 0 &&
        mab.minSamplePerArm > 0
      items.push({
        level: mabValid ? 'PASS' : 'ERROR',
        code: 'MAB_CONFIG',
        message: mabValid ? 'MAB 算法、优化指标、奖励窗口和最小样本已配置' : 'MAB 实验必须配置算法、唯一优化指标、探索流量、奖励窗口和最小样本',
        step: 3,
      })
    }
    if (['PERSONALIZATION_WEB', 'PERSONALIZATION_CODE'].includes(richDraft.type)) {
      const audiences = richDraft.specialConfig.personalization.audiences
      const priorities = audiences.map((audience) => audience.priority)
      const valid =
        audiences.length > 0 &&
        audiences.every((audience) => audience.name.trim() && audience.rule.trim() && audience.variantTempId && audience.holdoutRatio >= 0) &&
        new Set(priorities).size === priorities.length
      items.push({
        level: valid ? 'PASS' : 'ERROR',
        code: 'PERSONALIZATION_CONFIG',
        message: valid ? '个性化人群、策略版本、保留组和优先级已配置' : '个性化实验需配置人群规则、绑定版本、保留组并保证优先级唯一',
        step: 3,
      })
    }
    if (richDraft.type === 'PARENT_CHILD') {
      const parentChild = richDraft.specialConfig.parentChild
      items.push({
        level:
          parentChild.parentExperimentId &&
          parentChild.parentVariantId &&
          parentChild.childTrafficRatio > 0 &&
          parentChild.trafficInheritanceMode
            ? 'PASS'
            : 'ERROR',
        code: 'PARENT_CHILD_CONFIG',
        message: parentChild.parentExperimentId && parentChild.parentVariantId ? '父实验、父版本和子实验流量已配置' : '父子实验需选择运行中的父实验及父实验版本',
        step: 3,
      })
    }
    if (richDraft.type === 'REVERSE') {
      const reverse = richDraft.specialConfig.reverse
      items.push({
        level:
          reverse.sourceExperimentId &&
          reverse.sourceControlVariantId &&
          reverse.suggestedTrafficRatio > 0 &&
          reverse.observationDays > 0
            ? 'PASS'
            : 'ERROR',
        code: 'REVERSE_CONFIG',
        message: reverse.sourceExperimentId && reverse.sourceControlVariantId ? '反转实验来源和候选对照流量已配置' : '反转实验需关联原实验和原对照组',
        step: 3,
      })
    }
    if (richDraft.type === 'AD') {
      const ad = richDraft.specialConfig.ad
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
        message: adValid ? '广告账户、资产、投放配置、审核和排期已完成' : '广告实验需绑定已授权账户、项目、审核通过资产、投放配置和审核排期',
        step: 3,
      })
    }
    if (richDraft.type === 'VISUAL') {
      const visual = richDraft.specialConfig.visual
      const visualValid =
        /^https?:\/\//.test(visual.pageUrl) &&
        visual.extensionDetected &&
        visual.editorStatus === 'CONFIGURED' &&
        visual.elements.length > 0 &&
        visual.elements.every((element) => element.selector.trim() && element.newValue.trim())
      items.push({
        level: visualValid ? 'PASS' : 'ERROR',
        code: 'VISUAL_CONFIG',
        message: visualValid ? '可视化编辑器、扩展检测、元素编辑和热力图配置完整' : '可视化实验需配置页面 URL、扩展检测、编辑器状态和至少一个可编辑元素',
        step: 3,
      })
    }

    for (const schema of richDraft.paramSchemas) {
      const values = richDraft.variants.map((variant) => variant.params[schema.key])
      if (hasHardcodedGroupParam(schema.key, values)) {
        items.push({
          level: 'WARN',
          code: `PARAM_HARDCODE_${schema.tempId}`,
          message: `${schema.key} 可能按实验组编号设计，建议改为功能控制项`,
          step: 3,
        })
      }
    }
  } else {
    items.push({
      level: 'WARN',
      code: 'MDE_REVIEW',
      message: '建议在提交前确认 MDE 与业务 ROI 匹配',
      step: 6,
    })
  }

  return resolveMock({
    passed: !items.some((item) => item.level === 'ERROR'),
    items,
  })
}

export const submitAbExperimentForDebug = async (
  draft: ExperimentDraft,
): Promise<{ experiment?: Experiment; validation: ExperimentDraftValidationResult; message: string }> => {
  const validation = await validateAbExperimentDraft(draft)
  if (!validation.passed) {
    return resolveMock({ validation, message: '提交失败，请先处理检查项' })
  }

  const experimentId = createId('exp')
  const createdAt = nowIso()
  const variantIdMap = new Map(draft.variants.map((variant) => [variant.tempId, createId('var')]))
  const experiment: Experiment = {
    id: experimentId,
    appId: draft.appId,
    name: draft.name,
    description: draft.description,
    type: draft.type,
    status: 'DEBUGGING',
    ownerId: draft.ownerId,
    owner: resolveMember(draft.ownerId),
    collaboratorIds: draft.collaboratorIds,
    visibility: draft.visibility,
    businessLineId: draft.businessLineId,
    goal: draft.goal,
    riskNote: draft.riskNote,
    tags: draft.tags,
    durationDays: draft.durationDays,
    trafficRatio: draft.trafficConfig.experimentTrafficRatio,
    metricIds: draft.metricIds,
    featureIds: draft.featureIds,
    createdAt,
    updatedAt: createdAt,
  }

  const variants: ExperimentVariant[] = draft.variants.map((variant) => ({
    id: variantIdMap.get(variant.tempId) ?? createId('var'),
    experimentId,
    name: variant.name,
    description: variant.description,
    isControl: variant.isControl,
    status: 'ACTIVE',
    trafficRatio: variant.trafficRatio,
    params: variant.params,
    testUserIds: variant.testUserIds,
    createdAt,
    updatedAt: createdAt,
  }))

  const paramSchemas: ExperimentParamSchema[] = draft.paramSchemas.map((schema) => ({
    id: createId('param'),
    experimentId,
    key: schema.key,
    name: schema.name,
    type: schema.type,
    required: schema.required,
    defaultValue: schema.defaultValue,
    description: schema.description,
  }))

  const diversionConfig: DiversionConfig = {
    experimentId,
    ...draft.diversionConfig,
  }

  const trafficConfig: ExperimentTrafficConfig = {
    experimentId,
    useMutex: draft.trafficConfig.useMutex,
    trafficLayerId: draft.trafficConfig.trafficLayerId,
    mutexDomainId: draft.trafficConfig.mutexDomainId,
    experimentTrafficRatio: draft.trafficConfig.experimentTrafficRatio,
    variantTrafficRatios: Object.fromEntries(
      draft.variants.map((variant) => [variantIdMap.get(variant.tempId) ?? variant.tempId, variant.trafficRatio]),
    ),
    effectiveMode: draft.trafficConfig.effectiveMode,
    smoothDurationMinutes: draft.trafficConfig.smoothDurationMinutes,
    experienceConsistencyEnabled: draft.trafficConfig.experienceConsistencyEnabled,
  }

  const uniformConfig: UniformDiversionConfig = {
    experimentId,
    enabled: draft.trafficConfig.uniformDiversionEnabled,
    mode: draft.trafficConfig.uniformDiversionMode,
    metricIds: draft.trafficConfig.uniformDiversionMode === 'METRIC' ? draft.trafficConfig.uniformMetricIds : undefined,
    segmentIds: draft.trafficConfig.uniformDiversionMode === 'SEGMENT' ? draft.trafficConfig.uniformSegmentIds : undefined,
    dateRange: draft.trafficConfig.uniformDateRange,
    maxRunTimes: draft.trafficConfig.uniformMaxRunTimes,
    pValueThreshold: draft.trafficConfig.uniformPValueThreshold,
    status: draft.trafficConfig.uniformDiversionEnabled ? draft.trafficConfig.uniformStatus : 'CANCELED',
    taskId: draft.trafficConfig.uniformTaskId,
  }

  const smoothTask: SmoothEffectTask | null =
    draft.trafficConfig.effectiveMode === 'SMOOTH'
      ? {
          id: createId('smooth'),
          experimentId,
          action: 'START',
          startTrafficRatio: 0,
          targetTrafficRatio: draft.trafficConfig.experimentTrafficRatio,
          currentTrafficRatio: 0,
          durationMinutes: draft.trafficConfig.smoothDurationMinutes ?? 120,
          startedAt: createdAt,
          expectedFinishedAt: new Date(
            new Date(createdAt).getTime() + (draft.trafficConfig.smoothDurationMinutes ?? 120) * 60000,
          ).toISOString(),
          status: 'RUNNING',
        }
      : null

  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'EXPERIMENT',
    objectId: experimentId,
    action: 'submit_debug',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before: { status: 'DRAFT' },
    after: { status: 'DEBUGGING', source: 'create_wizard' },
    createdAt,
  }

  abExperiments.unshift(experiment)
  abExperimentVariants.push(...variants)
  abParamSchemas.push(...paramSchemas)
  abDiversionConfigs.push(diversionConfig)
  abTrafficConfigs.push(trafficConfig)
  abUniformDiversionConfigs.push(uniformConfig)
  if (smoothTask) abSmoothEffectTasks.push(smoothTask)
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({
    experiments: [experiment],
    variants,
    paramSchemas,
    diversionConfigs: [diversionConfig],
    trafficConfigs: [trafficConfig],
    uniformConfigs: [uniformConfig],
    smoothTasks: smoothTask ? [smoothTask] : [],
    operationLogs: [operationLog],
  })

  return resolveMock({ experiment, validation, message: '实验已提交调试' })
}

export const transitionAbExperiment = async (
  experimentId: EntityId,
  action: AbExperimentAction,
): Promise<{ experiment?: Experiment; message: string }> => {
  const experiment = findExperiment(experimentId)
  if (!experiment) return resolveMock({ message: '实验不存在' })

  const availability = getExperimentActionAvailability(experiment.status, action, {
    hasPermission: true,
    smoothTaskRunning: abSmoothEffectTasks.some((task) => task.experimentId === experimentId && task.status === 'RUNNING'),
    uniformDiversionReady:
      abUniformDiversionConfigs.find((config) => config.experimentId === experimentId)?.status !== 'FAILED',
  })
  if (!availability.available || !availability.nextStatus) {
    return resolveMock({ experiment, message: availability.reason ?? '当前状态不可执行该操作' })
  }
  if (action === 'restart' && Date.now() - new Date(experiment.updatedAt).getTime() < 24 * 60 * 60 * 1000) {
    return resolveMock({ experiment, message: '距离上次状态变更不足 24 小时，暂不可重启实验' })
  }

  const beforeStatus = experiment.status
  experiment.status = availability.nextStatus
  experiment.updatedAt = nowIso()
  const operationLog: OperationLog = {
    id: `log_${Date.now()}`,
    objectType: 'EXPERIMENT',
    objectId: experimentId,
    action,
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before: { status: beforeStatus },
    after: { status: availability.nextStatus },
    createdAt: experiment.updatedAt,
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ experiments: [experiment], operationLogs: [operationLog] })
  return resolveMock({ experiment, message: '操作成功' })
}

export const safeEditAbExperiment = (
  experimentId: EntityId,
  patch: Pick<Partial<Experiment>, 'name' | 'goal' | 'riskNote' | 'tags' | 'metricIds'>,
): Promise<{ experiment?: Experiment; message: string }> => {
  const experiment = findExperiment(experimentId)
  if (!experiment) return resolveMock({ message: '实验不存在' })
  if (!['DEBUGGING', 'READY', 'RUNNING', 'PAUSED'].includes(experiment.status)) {
    return resolveMock({ experiment, message: '当前状态不支持安全编辑' })
  }
  const before = {
    name: experiment.name,
    goal: experiment.goal,
    riskNote: experiment.riskNote,
    tags: experiment.tags,
    metricIds: experiment.metricIds,
  }
  if (patch.name !== undefined) experiment.name = patch.name
  if (patch.goal !== undefined) experiment.goal = patch.goal
  if (patch.riskNote !== undefined) experiment.riskNote = patch.riskNote
  if (patch.tags !== undefined) experiment.tags = patch.tags
  if (patch.metricIds !== undefined) experiment.metricIds = patch.metricIds
  experiment.updatedAt = nowIso()
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'EXPERIMENT',
    objectId: experimentId,
    action: 'safe_edit',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before,
    after: patch,
    createdAt: experiment.updatedAt,
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ experiments: [experiment], operationLogs: [operationLog] })
  return resolveMock({ experiment, message: '运行中安全编辑已保存' })
}

export const getAbExperimentPermissionGrants = (experimentId?: EntityId): Promise<ExperimentPermissionGrant[]> =>
  resolveMock(
    experimentId
      ? abExperimentPermissionGrants.filter((grant) => grant.experimentId === experimentId)
      : abExperimentPermissionGrants,
  )

export const updateAbExperimentPermissions = (
  experimentId: EntityId,
  payload: ExperimentPermissionUpdatePayload,
): Promise<{ experiment?: Experiment; grants: ExperimentPermissionGrant[]; message: string }> => {
  const experiment = findExperiment(experimentId)
  if (!experiment) return resolveMock({ grants: [], message: '实验不存在' })
  const before = {
    visibility: experiment.visibility,
    collaboratorIds: [...experiment.collaboratorIds],
    grants: abExperimentPermissionGrants.filter((grant) => grant.experimentId === experimentId),
  }
  const now = nowIso()
  const normalizedGrants = payload.grants.map((grant) => ({
    ...grant,
    id: grant.id || createId('grant'),
    experimentId,
    subjectName: grant.subjectName || grant.subjectId,
    updatedAt: now,
    createdAt: grant.createdAt || now,
  }))
  experiment.visibility = payload.visibility
  experiment.collaboratorIds = normalizedGrants
    .filter((grant) => grant.subjectType === 'USER' && grant.permissionType === 'collaborate')
    .map((grant) => grant.subjectId)
  experiment.updatedAt = now

  for (let index = abExperimentPermissionGrants.length - 1; index >= 0; index -= 1) {
    if (abExperimentPermissionGrants[index]?.experimentId === experimentId) {
      abExperimentPermissionGrants.splice(index, 1)
    }
  }
  abExperimentPermissionGrants.unshift(...normalizedGrants)

  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'EXPERIMENT',
    objectId: experimentId,
    action: 'update_permission',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before,
    after: {
      visibility: experiment.visibility,
      collaboratorIds: experiment.collaboratorIds,
      grants: normalizedGrants,
    },
    createdAt: now,
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({
    experiments: [experiment],
    permissionGrants: normalizedGrants,
    operationLogs: [operationLog],
  })
  return resolveMock({ experiment, grants: normalizedGrants, message: '权限配置已保存' })
}

export const scaleAbExperimentTraffic = (
  experimentId: EntityId,
  targetTrafficRatio: number,
  smoothDurationMinutes = 120,
): Promise<{ experiment?: Experiment; smoothTask?: SmoothEffectTask; message: string }> => {
  const experiment = findExperiment(experimentId)
  if (!experiment) return resolveMock({ message: '实验不存在' })
  if (!['DEBUGGING', 'READY', 'RUNNING', 'PAUSED'].includes(experiment.status)) {
    return resolveMock({ experiment, message: '当前状态不支持扩缩量' })
  }
  const currentTrafficRatio = experiment.trafficRatio
  experiment.trafficRatio = targetTrafficRatio
  experiment.updatedAt = nowIso()
  const trafficConfig = abTrafficConfigs.find((config) => config.experimentId === experimentId)
  if (trafficConfig) {
    trafficConfig.experimentTrafficRatio = targetTrafficRatio
    trafficConfig.effectiveMode = 'SMOOTH'
    trafficConfig.smoothDurationMinutes = smoothDurationMinutes
  }
  const smoothTask: SmoothEffectTask = {
    id: createId('smooth'),
    experimentId,
    action: targetTrafficRatio > currentTrafficRatio ? 'EXPAND' : 'STOP',
    startTrafficRatio: currentTrafficRatio,
    targetTrafficRatio,
    currentTrafficRatio,
    durationMinutes: smoothDurationMinutes,
    startedAt: experiment.updatedAt,
    expectedFinishedAt: new Date(new Date(experiment.updatedAt).getTime() + smoothDurationMinutes * 60000).toISOString(),
    status: 'RUNNING',
  }
  abSmoothEffectTasks.unshift(smoothTask)
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'EXPERIMENT',
    objectId: experimentId,
    action: 'scale_traffic',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before: { trafficRatio: currentTrafficRatio },
    after: { trafficRatio: targetTrafficRatio, smoothDurationMinutes },
    createdAt: experiment.updatedAt,
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({
    experiments: [experiment],
    trafficConfigs: trafficConfig ? [trafficConfig] : [],
    smoothTasks: [smoothTask],
    operationLogs: [operationLog],
  })
  return resolveMock({ experiment, smoothTask, message: '扩缩量任务已创建' })
}

function syncExperimentTrafficFromSmoothTask(task: SmoothEffectTask) {
  const experiment = findExperiment(task.experimentId)
  const trafficConfig = abTrafficConfigs.find((config) => config.experimentId === task.experimentId)
  if (experiment) {
    experiment.trafficRatio = task.currentTrafficRatio
    experiment.updatedAt = nowIso()
  }
  if (trafficConfig) {
    trafficConfig.experimentTrafficRatio = task.currentTrafficRatio
    trafficConfig.effectiveMode = 'SMOOTH'
    trafficConfig.smoothDurationMinutes = task.durationMinutes
  }
  return { experiment, trafficConfig }
}

export const refreshSmoothEffectTask = (taskId: EntityId): Promise<{ smoothTask?: SmoothEffectTask; message: string }> => {
  const task = abSmoothEffectTasks.find((item) => item.id === taskId)
  if (!task) return resolveMock({ message: '平滑任务不存在' })
  if (task.status === 'RUNNING') {
    const currentTrafficRatio = calculateSmoothTraffic(task)
    const reachedTarget =
      task.targetTrafficRatio >= task.startTrafficRatio
        ? currentTrafficRatio >= task.targetTrafficRatio
        : currentTrafficRatio <= task.targetTrafficRatio
    task.currentTrafficRatio = reachedTarget ? task.targetTrafficRatio : currentTrafficRatio
    if (reachedTarget) task.status = 'FINISHED'
    syncExperimentTrafficFromSmoothTask(task)
    persistCreatedMockState({ smoothTasks: [task] })
  }
  return resolveMock({ smoothTask: task, message: '平滑任务状态已刷新' }, 120)
}

export const operateSmoothEffectTask = async (
  taskId: EntityId,
  action: SmoothEffectTaskOperation,
): Promise<{ smoothTask?: SmoothEffectTask; message: string }> => {
  if (action === 'refresh') return refreshSmoothEffectTask(taskId)
  const task = abSmoothEffectTasks.find((item) => item.id === taskId)
  if (!task) return resolveMock({ message: '平滑任务不存在' })

  const before = {
    status: task.status,
    currentTrafficRatio: task.currentTrafficRatio,
    startTrafficRatio: task.startTrafficRatio,
  }
  const now = nowIso()

  if (action === 'pause') {
    if (task.status !== 'RUNNING') return resolveMock({ smoothTask: task, message: '仅运行中的平滑任务可暂停' })
    task.currentTrafficRatio = calculateSmoothTraffic(task)
    task.status = 'PAUSED'
  } else if (action === 'rollback') {
    task.currentTrafficRatio = task.startTrafficRatio
    task.status = 'ROLLED_BACK'
  } else if (action === 'skip') {
    task.currentTrafficRatio = task.targetTrafficRatio
    task.status = 'FINISHED'
  } else if (action === 'retry') {
    if (!['FAILED', 'PAUSED', 'ROLLED_BACK'].includes(task.status)) {
      return resolveMock({ smoothTask: task, message: '当前任务状态无需重试' })
    }
    task.startTrafficRatio = task.currentTrafficRatio
    task.startedAt = now
    task.expectedFinishedAt = new Date(new Date(now).getTime() + task.durationMinutes * 60000).toISOString()
    task.status = 'RUNNING'
    task.failureReason = undefined
  }

  const synced = syncExperimentTrafficFromSmoothTask(task)
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'EXPERIMENT',
    objectId: task.experimentId,
    action: `smooth_${action}`,
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before,
    after: {
      status: task.status,
      currentTrafficRatio: task.currentTrafficRatio,
      targetTrafficRatio: task.targetTrafficRatio,
    },
    createdAt: now,
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({
    experiments: synced.experiment ? [synced.experiment] : [],
    trafficConfigs: synced.trafficConfig ? [synced.trafficConfig] : [],
    smoothTasks: [task],
    operationLogs: [operationLog],
  })
  const messages: Record<SmoothEffectTaskOperation, string> = {
    pause: '平滑任务已暂停',
    rollback: '平滑任务已回滚到起始流量',
    skip: '平滑任务已跳过并直接到目标流量',
    refresh: '平滑任务状态已刷新',
    retry: '平滑任务已重新开始',
  }
  return resolveMock({ smoothTask: task, message: messages[action] })
}

export const closeAbExperimentVariant = (
  experimentId: EntityId,
  variantId: EntityId,
): Promise<{ variant?: ExperimentVariant; message: string }> => {
  const variant = abExperimentVariants.find((item) => item.experimentId === experimentId && item.id === variantId)
  if (!variant) return resolveMock({ message: '实验版本不存在' })
  if (variant.isControl) return resolveMock({ variant, message: '对照组不能关闭' })
  const before = { status: variant.status, trafficRatio: variant.trafficRatio }
  variant.status = 'CLOSED'
  variant.updatedAt = nowIso()
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'EXPERIMENT',
    objectId: experimentId,
    action: 'close_variant',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before,
    after: { variantId, status: variant.status, trafficRatio: variant.trafficRatio },
    createdAt: variant.updatedAt,
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ variants: [variant], operationLogs: [operationLog] })
  return resolveMock({ variant, message: '实验组已关闭，原流量保留在关闭组，不释放也不分配给其他组' })
}

export const calculateAbTraffic = (input: Parameters<typeof calculateTrafficRecommendation>[0]) =>
  resolveMock(calculateTrafficRecommendation(input), 260)

export const getAbTrafficLayers = () => resolveMock(abTrafficLayers)
export const getAbMutexDomainGroups = () => resolveMock(abMutexDomainGroups)

export const getAbMetricGroups = (): Promise<MetricGroup[]> => resolveMock(abMetricGroups)
export const getAbMetrics = (): Promise<Metric[]> => resolveMock(abMetrics)
export const getAbMetricTemplates = () => resolveMock(abMetricTemplates)
export const getAbAlarmTasks = (): Promise<AlarmTask[]> => resolveMock(abAlarmTasks)
export const getAbReceiverGroups = () => resolveMock(abReceiverGroups)
export const getAbMustSeeMetricTrends = () => resolveMock(abMustSeeMetricTrends)

export const createAbMetricGroup = (payload: {
  appId: EntityId
  name: string
  description: string
  type: MetricGroup['type']
  permissionType: MetricGroup['permissionType']
  metricIds?: EntityId[]
}): Promise<{ group: MetricGroup; message: string }> => {
  const createdAt = nowIso()
  const group: MetricGroup = {
    id: createId('mg'),
    appId: payload.appId,
    name: payload.name.trim(),
    description: payload.description.trim(),
    type: payload.type,
    status: 'active',
    ownerId: currentOperator.id,
    owner: currentOperator,
    creatorId: currentOperator.id,
    permissionType: payload.permissionType,
    authorizedUserIds: payload.permissionType === 'private' ? [currentOperator.id] : [],
    metricIds: payload.metricIds ?? [],
    relatedExperimentIds: [],
    createdAt,
    updatedAt: createdAt,
  }
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'METRIC_GROUP',
    objectId: group.id,
    action: 'create',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    after: { name: group.name, type: group.type },
    createdAt,
  }
  abMetricGroups.unshift(group)
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ metricGroups: [group], operationLogs: [operationLog] })
  return resolveMock({ group, message: '指标组已创建' })
}

export const copyAbMetricGroup = (groupId: EntityId): Promise<{ group?: MetricGroup; message: string }> => {
  const source = abMetricGroups.find((group) => group.id === groupId)
  if (!source) return resolveMock({ message: '指标组不存在' })
  const createdAt = nowIso()
  const group: MetricGroup = {
    ...source,
    id: createId('mg_copy'),
    name: `${source.name} 副本`,
    ownerId: currentOperator.id,
    owner: currentOperator,
    creatorId: currentOperator.id,
    relatedExperimentIds: [],
    createdAt,
    updatedAt: createdAt,
  }
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'METRIC_GROUP',
    objectId: group.id,
    action: 'copy',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before: { sourceGroupId: source.id },
    after: { name: group.name },
    createdAt,
  }
  abMetricGroups.unshift(group)
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ metricGroups: [group], operationLogs: [operationLog] })
  return resolveMock({ group, message: '指标组已复制' })
}

export const mergeAbMetricGroups = (
  groupIds: EntityId[],
): Promise<{ group?: MetricGroup; message: string }> => {
  const sources = abMetricGroups.filter((group) => groupIds.includes(group.id))
  if (sources.length < 2) return resolveMock({ message: '请至少选择两个指标组合并' })
  const createdAt = nowIso()
  const metricIds = [...new Set(sources.flatMap((group) => group.metricIds))]
  const relatedExperimentIds = [...new Set(sources.flatMap((group) => group.relatedExperimentIds))]
  const group: MetricGroup = {
    id: createId('mg_merge'),
    appId: sources[0]?.appId ?? 'app_news',
    name: `${sources.map((item) => item.name).join(' + ')} 合并组`,
    description: '由多个指标组合并生成，保留原指标口径快照。',
    type: sources[0]?.type ?? 'event',
    status: 'active',
    ownerId: currentOperator.id,
    owner: currentOperator,
    creatorId: currentOperator.id,
    permissionType: sources.some((item) => item.permissionType === 'private') ? 'private' : 'public',
    authorizedUserIds: [...new Set(sources.flatMap((group) => group.authorizedUserIds))],
    metricIds,
    relatedExperimentIds,
    createdAt,
    updatedAt: createdAt,
  }
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'METRIC_GROUP',
    objectId: group.id,
    action: 'merge',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before: { sourceGroupIds: groupIds },
    after: { metricIds },
    createdAt,
  }
  abMetricGroups.unshift(group)
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ metricGroups: [group], operationLogs: [operationLog] })
  return resolveMock({ group, message: '指标组已合并' })
}

export const offlineAbMetricGroup = (groupId: EntityId): Promise<{ group?: MetricGroup; message: string }> => {
  const group = abMetricGroups.find((item) => item.id === groupId)
  if (!group) return resolveMock({ message: '指标组不存在' })
  const before = { status: group.status }
  group.status = 'offline'
  group.updatedAt = nowIso()
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'METRIC_GROUP',
    objectId: group.id,
    action: 'offline',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before,
    after: { status: group.status },
    createdAt: group.updatedAt,
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ metricGroups: [group], operationLogs: [operationLog] })
  return resolveMock({ group, message: '指标组已下线' })
}

export const toggleAbMetricMustSee = (
  metricId: EntityId,
  isMustSee: boolean,
): Promise<{ metric?: Metric; message: string }> => {
  const metric = abMetrics.find((item) => item.id === metricId)
  if (!metric) return resolveMock({ message: '指标不存在' })
  const before = { isMustSee: metric.isMustSee }
  metric.isMustSee = isMustSee
  metric.updatedAt = nowIso()
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'METRIC_GROUP',
    objectId: metric.metricGroupId,
    action: 'toggle_must_see_metric',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before,
    after: { metricId, isMustSee },
    createdAt: metric.updatedAt,
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ metrics: [metric], operationLogs: [operationLog] })
  return resolveMock({ metric, message: isMustSee ? '已设为必看指标' : '已取消必看指标' })
}

export const getAbReportOverview = (experimentId: EntityId): Promise<ExperimentReportOverview | undefined> =>
  resolveMock(abReportOverviews.find((overview) => overview.experimentId === experimentId))

export const queryAbMetricResults = (_experimentId: EntityId, _filter?: Partial<ReportFilter>) =>
  resolveMock({
    metrics: abMetricResults,
    trends: abTrendPoints,
    templates: abFilterTemplates,
  })

export const getAbFunnelReport = (metricId: EntityId) =>
  resolveMock(abFunnelReports.find((report) => report.metricId === metricId))

export const getAbCohortReport = (metricId: EntityId) =>
  resolveMock(abCohortReports.find((report) => report.metricId === metricId))

export const getAbHeatmapReport = () => resolveMock(abHeatmapReports[0])
export const getAbMabReport = (experimentId: EntityId) =>
  resolveMock(abMabReports.find((report) => report.experimentId === experimentId))
export const getAbSensitiveInsightTasks = (experimentId?: EntityId) =>
  resolveMock(
    experimentId
      ? abSensitiveInsightTasks.filter((task) => task.experimentId === experimentId)
      : abSensitiveInsightTasks,
  )

export const getAbReportExportTasks = (experimentId?: EntityId): Promise<ReportExportTask[]> =>
  {
    advanceReportExportQueue()
    return resolveMock(
      experimentId
        ? abReportExportTasks.filter((task) => task.experimentId === experimentId)
        : abReportExportTasks,
    )
  }

export const createAbReportExportTask = (
  experimentId: EntityId,
  reportType: ReportExportTask['reportType'],
): Promise<{ task: ReportExportTask; message: string }> => {
  const experiment = findExperiment(experimentId)
  const createdAt = nowIso()
  const task: ReportExportTask = {
    id: createId('export'),
    experimentId,
    reportType,
    fileName: `${experiment?.name ?? experimentId}-${reportType}-report.xlsx`,
    status: 'queued',
    progress: 0,
    createdBy: currentOperator.id,
    createdAt,
    updatedAt: createdAt,
  }
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'EXPERIMENT',
    objectId: experimentId,
    action: 'export_report',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    after: { taskId: task.id, reportType, fileName: task.fileName },
    createdAt,
  }
  abReportExportTasks.unshift(task)
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ reportExportTasks: [task], operationLogs: [operationLog] })
  return resolveMock({ task, message: '报告导出任务已进入队列' }, 320)
}

export const cancelAbReportExportTask = (
  taskId: EntityId,
): Promise<{ task?: ReportExportTask; message: string }> => {
  const task = abReportExportTasks.find((item) => item.id === taskId)
  if (!task) return resolveMock({ message: '导出任务不存在' }, 120)
  if (!['queued', 'running'].includes(task.status)) {
    return resolveMock({ task, message: '当前状态不可取消' }, 120)
  }
  const before = { status: task.status, progress: task.progress }
  task.status = 'canceled'
  task.progress = Math.min(task.progress, 99)
  task.failureReason = '用户取消导出任务。'
  task.updatedAt = nowIso()
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'EXPERIMENT',
    objectId: task.experimentId,
    action: 'cancel_report_export',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before,
    after: { status: task.status, taskId: task.id },
    createdAt: task.updatedAt,
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ reportExportTasks: [{ ...task }], operationLogs: [operationLog] })
  return resolveMock({ task, message: '导出任务已取消' }, 160)
}

export const retryAbReportExportTask = (
  taskId: EntityId,
): Promise<{ task?: ReportExportTask; message: string }> => {
  const task = abReportExportTasks.find((item) => item.id === taskId)
  if (!task) return resolveMock({ message: '导出任务不存在' }, 120)
  if (!['failed', 'canceled'].includes(task.status)) {
    return resolveMock({ task, message: '当前状态不需要重试' }, 120)
  }
  const before = { status: task.status, failureReason: task.failureReason }
  task.status = 'queued'
  task.progress = 0
  task.failureReason = undefined
  task.downloadUrl = undefined
  task.updatedAt = nowIso()
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'EXPERIMENT',
    objectId: task.experimentId,
    action: 'retry_report_export',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before,
    after: { status: task.status, taskId: task.id },
    createdAt: task.updatedAt,
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ reportExportTasks: [{ ...task }], operationLogs: [operationLog] })
  return resolveMock({ task, message: '导出任务已重新入队' }, 160)
}

export const getAbFeatureFlags = () => resolveMock(abFeatureFlags)
export const getAbFeatureVersions = (featureId?: EntityId) =>
  resolveMock(featureId ? abFeatureVersions.filter((version) => version.featureId === featureId) : abFeatureVersions)
export const getAbPublishPlans = () => resolveMock(abPublishPlans)
export const getAbWhitelistTests = () => resolveMock(abWhitelistTests)

export const createAbFeatureFlag = (
  draft: FeatureFlagDraft,
): Promise<{ feature?: FeatureFlag; version?: FeatureVersion; message: string }> => {
  const duplicated = abFeatureFlags.find(
    (feature) => feature.appId === draft.appId && feature.key.trim() === draft.key.trim(),
  )
  if (duplicated) {
    return resolveMock({ feature: duplicated, message: 'Feature Key 已存在，请使用唯一 Key' }, 120)
  }

  const createdAt = nowIso()
  const featureId = createId('feat')
  const versionId = createId('feat_ver')
  const firstVariantId = draft.variants[0]?.variantId
  const defaultVariantId = draft.defaultVariantId ?? firstVariantId
  const feature: FeatureFlag = {
    featureId,
    appId: draft.appId,
    key: draft.key.trim(),
    name: draft.name.trim(),
    description: draft.description.trim(),
    terminalType: draft.terminalType,
    featureType: draft.featureType,
    status: 'enabled',
    publishStatus: 'unpublished',
    currentVersionId: versionId,
    owners: draft.owners.length ? draft.owners : [currentOperator.id],
    tags: draft.tags,
    relatedExperimentIds: [],
    createdBy: currentOperator.id,
    createdAt,
    updatedAt: createdAt,
  }
  const version: FeatureVersion = {
    versionId,
    featureId,
    versionNo: 'V1',
    versionStatus: 'unpublished',
    variantType: draft.variantType,
    variants: draft.variants,
    audienceRules: [],
    defaultRule: {
      ruleId: 'else',
      name: '默认规则',
      order: 999,
      conditions: [],
      deliveryType: defaultVariantId ? 'single_variant' : 'no_value',
      variantId: defaultVariantId,
    },
    publishTraffic: 0,
    createdBy: currentOperator.id,
    createdAt,
  }
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'FEATURE',
    objectId: featureId,
    action: 'create_feature',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    after: { feature, version },
    createdAt,
  }
  abFeatureFlags.unshift(feature)
  abFeatureVersions.unshift(version)
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ featureFlags: [feature], featureVersions: [version], operationLogs: [operationLog] })
  return resolveMock({ feature, version, message: 'Feature 已创建，初始版本待发布' }, 180)
}

export const createAbFeatureVersion = (
  featureId: EntityId,
  draft: FeatureVersionDraft,
): Promise<{ version?: FeatureVersion; message: string }> => {
  const feature = findFeature(featureId)
  if (!feature) return resolveMock({ message: 'Feature 不存在' }, 120)

  const createdAt = nowIso()
  const nextNo = abFeatureVersions.filter((version) => version.featureId === featureId).length + 1
  const version: FeatureVersion = {
    versionId: createId('feat_ver'),
    featureId,
    versionNo: `V${nextNo}`,
    versionStatus: 'unpublished',
    variantType: draft.variantType,
    variants: draft.variants,
    audienceRules: [...draft.audienceRules].sort((left, right) => left.order - right.order),
    defaultRule: draft.defaultRule,
    publishTraffic: 0,
    createdBy: currentOperator.id,
    createdAt,
  }
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'FEATURE_VERSION',
    objectId: version.versionId,
    action: 'create_feature_version',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    after: { version },
    createdAt,
  }
  abFeatureVersions.unshift(version)
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ featureVersions: [version], operationLogs: [operationLog] })
  return resolveMock({ version, message: 'Feature 版本已创建，等待发布' }, 180)
}

export const publishAbFeatureVersion = (
  featureId: EntityId,
  request: FeaturePublishRequest,
): Promise<{ feature?: FeatureFlag; version?: FeatureVersion; plan?: PublishPlan; message: string }> => {
  const feature = findFeature(featureId)
  const version = findFeatureVersion(request.versionId)
  if (!feature || !version || version.featureId !== featureId) {
    return resolveMock({ message: 'Feature 或版本不存在' }, 120)
  }

  const createdAt = nowIso()
  const isScheduled =
    request.publishType === 'scheduled' &&
    request.scheduledAt !== undefined &&
    new Date(request.scheduledAt).getTime() > Date.now()
  const publishStatus = isScheduled
    ? 'pending_publish'
    : request.publishTraffic >= 100
      ? 'full'
      : 'gray'
  const nextVersion: FeatureVersion = {
    ...version,
    versionStatus: publishStatus,
    publishTraffic: isScheduled ? 0 : request.publishTraffic,
  }
  const nextFeature: FeatureFlag = {
    ...feature,
    status: 'enabled',
    publishStatus,
    currentVersionId: isScheduled ? feature.currentVersionId : version.versionId,
    updatedAt: createdAt,
  }
  const plan: PublishPlan = {
    publishId: createId('pub'),
    featureId,
    versionId: version.versionId,
    publishType: request.publishType,
    description: request.description,
    steps: [
      {
        stepNo: 1,
        publishTime: request.scheduledAt ?? createdAt,
        traffic: request.publishTraffic,
      },
    ],
    rollbackAt: null,
    createdBy: currentOperator.id,
  }
  const featureIndex = abFeatureFlags.findIndex((item) => item.featureId === featureId)
  const versionIndex = abFeatureVersions.findIndex((item) => item.versionId === version.versionId)
  abFeatureFlags.splice(featureIndex, 1, nextFeature)
  abFeatureVersions.splice(versionIndex, 1, nextVersion)
  abPublishPlans.unshift(plan)
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'FEATURE_VERSION',
    objectId: version.versionId,
    action: isScheduled ? 'schedule_feature_publish' : 'publish_feature',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before: { versionStatus: version.versionStatus, publishTraffic: version.publishTraffic },
    after: { versionStatus: nextVersion.versionStatus, publishTraffic: nextVersion.publishTraffic, plan },
    createdAt,
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({
    featureFlags: [nextFeature],
    featureVersions: [nextVersion],
    publishPlans: [plan],
    operationLogs: [operationLog],
  })
  return resolveMock({ feature: nextFeature, version: nextVersion, plan, message: 'Feature 发布任务已创建' }, 220)
}

export const rollbackAbFeature = (
  featureId: EntityId,
  targetVersionId?: EntityId,
): Promise<{ feature?: FeatureFlag; version?: FeatureVersion; message: string }> => {
  const feature = findFeature(featureId)
  if (!feature) return resolveMock({ message: 'Feature 不存在' }, 120)

  const candidateVersions = abFeatureVersions.filter((version) => version.featureId === featureId)
  const target =
    candidateVersions.find((version) => version.versionId === targetVersionId) ??
    candidateVersions.find((version) => version.versionId !== feature.currentVersionId) ??
    candidateVersions[0]
  if (!target) return resolveMock({ feature, message: '没有可回滚版本' }, 120)

  const createdAt = nowIso()
  const nextFeature: FeatureFlag = {
    ...feature,
    currentVersionId: target.versionId,
    publishStatus: 'rolled_back',
    status: 'enabled',
    updatedAt: createdAt,
  }
  const nextVersion: FeatureVersion = {
    ...target,
    versionStatus: 'full',
    publishTraffic: 100,
  }
  const oldCurrentVersion = feature.currentVersionId ? findFeatureVersion(feature.currentVersionId) : undefined
  const nextOldCurrentVersion =
    oldCurrentVersion && oldCurrentVersion.versionId !== nextVersion.versionId
      ? { ...oldCurrentVersion, versionStatus: 'rolled_back' as const, publishTraffic: 0 }
      : undefined
  abFeatureFlags.splice(abFeatureFlags.findIndex((item) => item.featureId === featureId), 1, nextFeature)
  abFeatureVersions.splice(abFeatureVersions.findIndex((item) => item.versionId === nextVersion.versionId), 1, nextVersion)
  if (nextOldCurrentVersion) {
    abFeatureVersions.splice(
      abFeatureVersions.findIndex((item) => item.versionId === nextOldCurrentVersion.versionId),
      1,
      nextOldCurrentVersion,
    )
  }
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'FEATURE',
    objectId: featureId,
    action: 'rollback_feature',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before: { currentVersionId: feature.currentVersionId, publishStatus: feature.publishStatus },
    after: { currentVersionId: nextFeature.currentVersionId, publishStatus: nextFeature.publishStatus },
    createdAt,
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({
    featureFlags: [nextFeature],
    featureVersions: [nextVersion, ...(nextOldCurrentVersion ? [nextOldCurrentVersion] : [])],
    operationLogs: [operationLog],
  })
  return resolveMock({ feature: nextFeature, version: nextVersion, message: 'Feature 已回滚到目标版本' }, 220)
}

export const createAbWhitelistTest = (
  featureId: EntityId,
  draft: WhitelistTestDraft,
): Promise<{ test?: WhitelistTest; message: string }> => {
  const feature = findFeature(featureId)
  if (!feature) return resolveMock({ message: 'Feature 不存在' }, 120)

  const createdAt = nowIso()
  const test: WhitelistTest = {
    id: createId('wl'),
    featureId,
    name: draft.name.trim(),
    versionId: draft.versionId,
    status: 'active',
    expiresAt: draft.expiresAt,
    ruleUserIds: draft.ruleUserIds,
    createdBy: currentOperator.id,
    createdAt,
  }
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'FEATURE',
    objectId: featureId,
    action: 'create_whitelist_test',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    after: { test },
    createdAt,
  }
  abWhitelistTests.unshift(test)
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ whitelistTests: [test], operationLogs: [operationLog] })
  return resolveMock({ test, message: '白名单测试已创建' }, 180)
}

export const changeAbFeatureLifecycle = (
  featureId: EntityId,
  action: FeatureLifecycleAction,
): Promise<{ feature?: FeatureFlag; message: string }> => {
  const feature = findFeature(featureId)
  if (!feature) return resolveMock({ message: 'Feature 不存在' }, 120)

  const createdAt = nowIso()
  const nextFeature: FeatureFlag = {
    ...feature,
    status: action === 'enable' ? 'enabled' : action === 'disable' ? 'disabled' : 'deleted',
    publishStatus: action === 'enable' ? feature.publishStatus : action === 'disable' ? 'disabled' : 'canceled',
    updatedAt: createdAt,
  }
  abFeatureFlags.splice(abFeatureFlags.findIndex((item) => item.featureId === featureId), 1, nextFeature)
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'FEATURE',
    objectId: featureId,
    action: `feature_${action}`,
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    before: { status: feature.status, publishStatus: feature.publishStatus },
    after: { status: nextFeature.status, publishStatus: nextFeature.publishStatus },
    createdAt,
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ featureFlags: [nextFeature], operationLogs: [operationLog] })
  return resolveMock({ feature: nextFeature, message: 'Feature 生命周期状态已更新' }, 180)
}

function inferFeatureVariantValue(variant: ExperimentVariant) {
  const entries = Object.entries(variant.params)
  if (entries.length === 1) return entries[0]?.[1]
  return variant.params
}

function inferFeatureVariantType(value: unknown): FeatureVersion['variantType'] {
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'string') return 'string'
  return 'json'
}

export const solidifyExperimentToFeature = (
  request: FeatureSolidifyRequest,
): Promise<{ feature?: FeatureFlag; version?: FeatureVersion; message: string }> => {
  const experiment = findExperiment(request.experimentId)
  const experimentVariants = abExperimentVariants.filter((variant) => variant.experimentId === request.experimentId)
  const winner = experimentVariants.find((variant) => variant.id === request.winnerVariantId)
  if (!experiment || !winner) return resolveMock({ message: '实验或胜出版本不存在' }, 120)

  const createdAt = nowIso()
  const existingFeature = abFeatureFlags.find(
    (feature) => feature.appId === experiment.appId && feature.key === request.featureKey.trim(),
  )
  const featureId = existingFeature?.featureId ?? createId('feat')
  const featureVariants = experimentVariants.map((variant) => ({
    variantId: `solid_${variant.id}`,
    name: variant.name,
    value: inferFeatureVariantValue(variant),
    description: variant.description ?? `${experiment.name} 固化版本`,
  }))
  const winnerFeatureVariantId = `solid_${winner.id}`
  const winnerValue = inferFeatureVariantValue(winner)
  const version: FeatureVersion = {
    versionId: createId('feat_ver'),
    featureId,
    versionNo: `V${abFeatureVersions.filter((item) => item.featureId === featureId).length + 1}`,
    versionStatus: request.rolloutTraffic >= 100 ? 'full' : 'gray',
    variantType: inferFeatureVariantType(winnerValue),
    variants: featureVariants,
    audienceRules: [],
    defaultRule: {
      ruleId: 'else',
      name: '默认规则',
      order: 999,
      conditions: [],
      deliveryType: 'single_variant',
      variantId: winnerFeatureVariantId,
    },
    publishTraffic: request.rolloutTraffic,
    createdBy: currentOperator.id,
    createdAt,
  }
  const feature: FeatureFlag = {
    ...(existingFeature ?? {
      featureId,
      appId: experiment.appId,
      key: request.featureKey.trim(),
      name: request.featureName.trim(),
      description: `由实验「${experiment.name}」固化生成。`,
      terminalType: experiment.type === 'CLIENT_CODE' || experiment.type === 'VISUAL' ? 'client' : 'server',
      featureType: experiment.visibility === 'PRIVATE' ? 'private' : 'public',
      owners: [experiment.ownerId],
      tags: [...experiment.tags, '实验固化'],
      relatedExperimentIds: [],
      createdBy: currentOperator.id,
      createdAt,
    }),
    status: 'enabled',
    publishStatus: version.versionStatus,
    currentVersionId: version.versionId,
    relatedExperimentIds: [...new Set([...(existingFeature?.relatedExperimentIds ?? []), experiment.id])],
    updatedAt: createdAt,
  }
  if (existingFeature) {
    abFeatureFlags.splice(abFeatureFlags.findIndex((item) => item.featureId === feature.featureId), 1, feature)
  } else {
    abFeatureFlags.unshift(feature)
  }
  abFeatureVersions.unshift(version)
  const operationLog: OperationLog = {
    id: createId('log'),
    objectType: 'FEATURE',
    objectId: feature.featureId,
    action: 'solidify_experiment_to_feature',
    operatorId: currentOperator.id,
    operatorName: currentOperator.name,
    after: { experimentId: experiment.id, winnerVariantId: winner.id, feature, version },
    createdAt,
  }
  abOperationLogs.unshift(operationLog)
  persistCreatedMockState({ featureFlags: [feature], featureVersions: [version], operationLogs: [operationLog] })
  return resolveMock({ feature, version, message: '实验结果已固化为 Feature' }, 240)
}

export const decideAbFeature = (input: {
  featureId: EntityId
  userId: string
  context: Record<string, unknown>
  inWhitelist?: boolean
  inExperiment?: boolean
  localDefault?: unknown
}): Promise<FeatureDecisionResult> => {
  const feature = abFeatureFlags.find((item) => item.featureId === input.featureId)
  const version = abFeatureVersions.find((item) => item.versionId === feature?.currentVersionId)
  return resolveMock(
    evaluateFeatureDecision({
      feature,
      version,
      userId: input.userId,
      context: input.context,
      inWhitelist: input.inWhitelist,
      inExperiment: input.inExperiment,
      localDefault: input.localDefault,
    }),
    120,
  )
}

export const getAbOperationLogs = (objectId?: EntityId): Promise<OperationLog[]> =>
  resolveMock(objectId ? abOperationLogs.filter((log) => log.objectId === objectId) : abOperationLogs)

export const getAbExperimentTemplates = (): Promise<ExperimentTemplate[]> => resolveMock(abExperimentTemplates)

export const getAbHitQueryTemplates = (): Promise<HitQueryTemplate[]> => resolveMock(abHitQueryTemplates)

function hashSubject(value: string) {
  return value.split('').reduce((total, char) => total + char.charCodeAt(0), 0)
}

export const queryAbExperimentHits = (request: HitQueryRequest): Promise<HitQueryResult[]> => {
  const subjectHash = hashSubject(request.subjectId || 'anonymous')
  const queriedAt = nowIso()
  const results = abExperiments
    .filter((experiment) => !request.experimentId || experiment.id === request.experimentId)
    .map((experiment, index): HitQueryResult => {
      const variants = abExperimentVariants.filter((variant) => variant.experimentId === experiment.id)
      const bucket = (subjectHash + index * 17) % 100
      const whitelist = /qa|test|ssid/i.test(request.subjectId)
      const audiencePassed = bucket % 7 !== 0
      const trafficHit = bucket < experiment.trafficRatio
      const hitStatus = whitelist ? 'whitelist' : !audiencePassed ? 'excluded' : trafficHit ? 'hit' : 'not_hit'
      const variant =
        hitStatus === 'hit' || hitStatus === 'whitelist'
          ? variants[(subjectHash + index) % Math.max(variants.length, 1)]
          : undefined
      return {
        id: createId('hit'),
        subjectId: request.subjectId,
        subjectType: request.subjectType,
        experimentId: experiment.id,
        experimentName: experiment.name,
        hitStatus,
        variantName: variant?.name ?? '-',
        decisionSource: whitelist ? 'whitelist' : !audiencePassed ? 'audience' : trafficHit ? 'traffic' : 'feature_default',
        audiencePassed,
        trafficBucket: bucket,
        reason:
          hitStatus === 'whitelist'
            ? '命中测试白名单，优先返回指定版本'
            : hitStatus === 'excluded'
              ? '未满足受众条件'
              : hitStatus === 'hit'
                ? '受众通过且落入实验流量桶'
                : '受众通过但未落入实验流量桶',
        queriedAt,
      }
    })
    .filter((result) => !request.hitStatus || request.hitStatus === 'all' || result.hitStatus === request.hitStatus)

  const sorted = [...results].sort((left, right) => {
    const direction = request.sortOrder === 'asc' ? 1 : -1
    if (request.sortBy === 'experimentName') return left.experimentName.localeCompare(right.experimentName) * direction
    if (request.sortBy === 'hitStatus') return left.hitStatus.localeCompare(right.hitStatus) * direction
    return left.queriedAt.localeCompare(right.queriedAt) * direction
  })
  return resolveMock(sorted)
}

export const diagnoseAbExperimentHit = (input: {
  subjectId: string
  experimentId: EntityId
}): Promise<HitDiagnosisResult> => {
  const experiment = findExperiment(input.experimentId) ?? abExperiments[0]
  const hit = experiment
    ? queryAbExperimentHits({
        subjectId: input.subjectId,
        subjectType: 'uid',
        experimentId: experiment.id,
        hitStatus: 'all',
        sortBy: 'queriedAt',
        sortOrder: 'desc',
      })
    : Promise.resolve([])
  return hit.then((items) => {
    const result = items[0]
    const blocked = result?.hitStatus === 'excluded' || result?.hitStatus === 'not_hit'
    return {
      id: createId('diagnosis'),
      subjectId: input.subjectId,
      experimentId: experiment?.id ?? input.experimentId,
      experimentName: experiment?.name ?? input.experimentId,
      finalDecision: result ? `${result.hitStatus} / ${result.variantName}` : '实验不存在',
      createdAt: nowIso(),
      stages: [
        { stage: 'identity', status: input.subjectId.trim() ? 'pass' : 'blocked', message: '分流 ID 已解析' },
        { stage: 'permission', status: 'pass', message: '当前用户具备诊断权限' },
        { stage: 'audience', status: result?.audiencePassed ? 'pass' : 'blocked', message: result?.audiencePassed ? '受众规则通过' : '受众规则未通过' },
        { stage: 'whitelist', status: result?.hitStatus === 'whitelist' ? 'pass' : 'warning', message: result?.hitStatus === 'whitelist' ? '白名单优先生效' : '未命中白名单' },
        { stage: 'traffic', status: blocked ? 'blocked' : 'pass', message: result?.reason ?? '无命中结果' },
        { stage: 'variant', status: result?.variantName && result.variantName !== '-' ? 'pass' : 'warning', message: `返回版本：${result?.variantName ?? '-'}` },
        { stage: 'exposure', status: blocked ? 'warning' : 'pass', message: blocked ? '未记录曝光或无需曝光' : '曝光记录可写入' },
      ],
    } satisfies HitDiagnosisResult
  })
}

export const getAbDataDedupTasks = (): Promise<DataDedupTask[]> => resolveMock(abDataDedupTasks)

export const createAbDataDedupTask = (
  draft: DataDedupTaskDraft,
): Promise<{ task: DataDedupTask; message: string }> => {
  const now = nowIso()
  const task: DataDedupTask = {
    id: createId('dedup'),
    name: draft.name,
    experimentId: draft.experimentId,
    scope: draft.scope,
    schedule: draft.schedule,
    windowMinutes: draft.windowMinutes,
    status: draft.schedule === 'daily' ? 'queued' : 'running',
    duplicateRate: 0,
    duplicateRows: 0,
    createdBy: currentOperator.id,
    createdAt: now,
    updatedAt: now,
  }
  abDataDedupTasks.unshift(task)
  persistCreatedMockState({ dataDedupTasks: [task] })
  return resolveMock({ task, message: '查重任务已创建' })
}

export const runAbDataDedupTask = (taskId: EntityId): Promise<{ task?: DataDedupTask; message: string }> => {
  const task = abDataDedupTasks.find((item) => item.id === taskId)
  if (!task) return resolveMock({ message: '查重任务不存在' })
  const seed = hashSubject(task.id)
  task.status = 'success'
  task.duplicateRows = seed % 240
  task.duplicateRate = Number((task.duplicateRows / 100000).toFixed(4))
  task.downloadUrl = `/mock-downloads/abtest/dedup/${task.id}.csv`
  task.lastRunAt = nowIso()
  task.updatedAt = task.lastRunAt
  persistCreatedMockState({ dataDedupTasks: [task] })
  return resolveMock({ task, message: '查重任务已运行完成' })
}

export const downloadAbDataDedupTask = (taskId: EntityId): Promise<{ task?: DataDedupTask; message: string }> => {
  const task = abDataDedupTasks.find((item) => item.id === taskId)
  if (!task) return resolveMock({ message: '查重任务不存在' })
  if (!task.downloadUrl) task.downloadUrl = `/mock-downloads/abtest/dedup/${task.id}.csv`
  persistCreatedMockState({ dataDedupTasks: [task] })
  return resolveMock({ task, message: `查重结果已生成：${task.downloadUrl}` })
}

export const getAbExperimentBoards = (): Promise<ExperimentBoard[]> => resolveMock(abExperimentBoards)

export const saveAbExperimentBoard = (
  draft: ExperimentBoardDraft & { id?: EntityId; widgets?: ExperimentBoard['widgets'] },
): Promise<{ board: ExperimentBoard; message: string }> => {
  const now = nowIso()
  const existing = draft.id ? abExperimentBoards.find((board) => board.id === draft.id) : undefined
  const board: ExperimentBoard = {
    id: existing?.id ?? createId('board'),
    name: draft.name,
    description: draft.description,
    ownerId: existing?.ownerId ?? currentOperator.id,
    visibility: draft.visibility,
    authorizedUserIds: draft.authorizedUserIds,
    timeConfig: draft.timeConfig,
    widgets: draft.widgets ?? existing?.widgets ?? [],
    shareToken: existing?.shareToken ?? createId('share'),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
  const index = abExperimentBoards.findIndex((item) => item.id === board.id)
  if (index >= 0) abExperimentBoards.splice(index, 1, board)
  else abExperimentBoards.unshift(board)
  persistCreatedMockState({ experimentBoards: [board] })
  return resolveMock({ board, message: existing ? '看板已保存' : '看板已创建' })
}

export const copyAbExperimentBoardLink = (boardId: EntityId): Promise<{ url: string; message: string }> => {
  const board = abExperimentBoards.find((item) => item.id === boardId)
  const token = board?.shareToken ?? createId('share')
  return resolveMock({ url: `${window.location.origin}/ab-testing/boards?share=${token}`, message: '看板链接已复制' })
}

export const calculateAbBoardDiff = (boardId: EntityId): Promise<BoardDiffResult[]> => {
  const board = abExperimentBoards.find((item) => item.id === boardId)
  const widgets = board?.widgets.filter((widget) => widget.type === 'metric' || widget.type === 'diff') ?? []
  return resolveMock(
    widgets.map((widget, index) => {
      const baseline = Number((0.2 + index * 0.04).toFixed(4))
      const current = Number((baseline * (1.04 + index * 0.02)).toFixed(4))
      const diffAbs = Number((current - baseline).toFixed(4))
      return {
        id: createId('board_diff'),
        widgetId: widget.id,
        title: widget.title,
        baselineValue: baseline,
        currentValue: current,
        diffAbs,
        diffRel: Number((diffAbs / baseline).toFixed(4)),
        status: diffAbs > 0 ? 'up' : diffAbs < 0 ? 'down' : 'flat',
      } satisfies BoardDiffResult
    }),
  )
}

export const abTestingService = {
  getWorkspaceSummary: getAbWorkspaceSummary,
  getExperiments: getAbExperiments,
  getExperiment: getAbExperiment,
  getExperimentVariants: getAbExperimentVariants,
  getExperimentParamSchemas: getAbExperimentParamSchemas,
  getExperimentPlanningBundle: getAbExperimentPlanningBundle,
  getExperimentTemplates: getAbExperimentTemplates,
  getHitQueryTemplates: getAbHitQueryTemplates,
  queryExperimentHits: queryAbExperimentHits,
  diagnoseExperimentHit: diagnoseAbExperimentHit,
  getDataDedupTasks: getAbDataDedupTasks,
  createDataDedupTask: createAbDataDedupTask,
  runDataDedupTask: runAbDataDedupTask,
  downloadDataDedupTask: downloadAbDataDedupTask,
  getExperimentBoards: getAbExperimentBoards,
  saveExperimentBoard: saveAbExperimentBoard,
  copyExperimentBoardLink: copyAbExperimentBoardLink,
  calculateBoardDiff: calculateAbBoardDiff,
  getBackendIntegrationStatus: getAbBackendIntegrationStatus,
  validateExperimentDraft: validateAbExperimentDraft,
  submitExperimentForDebug: submitAbExperimentForDebug,
  transitionExperiment: transitionAbExperiment,
  safeEditExperiment: safeEditAbExperiment,
  getExperimentPermissionGrants: getAbExperimentPermissionGrants,
  updateExperimentPermissions: updateAbExperimentPermissions,
  scaleExperimentTraffic: scaleAbExperimentTraffic,
  refreshSmoothEffectTask,
  operateSmoothEffectTask,
  closeExperimentVariant: closeAbExperimentVariant,
  calculateTraffic: calculateAbTraffic,
  getTrafficLayers: getAbTrafficLayers,
  getMutexDomainGroups: getAbMutexDomainGroups,
  getMetricGroups: getAbMetricGroups,
  getMetrics: getAbMetrics,
  getMetricTemplates: getAbMetricTemplates,
  getAlarmTasks: getAbAlarmTasks,
  getReceiverGroups: getAbReceiverGroups,
  getMustSeeMetricTrends: getAbMustSeeMetricTrends,
  createMetricGroup: createAbMetricGroup,
  copyMetricGroup: copyAbMetricGroup,
  mergeMetricGroups: mergeAbMetricGroups,
  offlineMetricGroup: offlineAbMetricGroup,
  toggleMetricMustSee: toggleAbMetricMustSee,
  getReportOverview: getAbReportOverview,
  queryMetricResults: queryAbMetricResults,
  getFunnelReport: getAbFunnelReport,
  getCohortReport: getAbCohortReport,
  getHeatmapReport: getAbHeatmapReport,
  getMabReport: getAbMabReport,
  getSensitiveInsightTasks: getAbSensitiveInsightTasks,
  getReportExportTasks: getAbReportExportTasks,
  createReportExportTask: createAbReportExportTask,
  cancelReportExportTask: cancelAbReportExportTask,
  retryReportExportTask: retryAbReportExportTask,
  getFeatureFlags: getAbFeatureFlags,
  getFeatureVersions: getAbFeatureVersions,
  getPublishPlans: getAbPublishPlans,
  getWhitelistTests: getAbWhitelistTests,
  createFeatureFlag: createAbFeatureFlag,
  createFeatureVersion: createAbFeatureVersion,
  publishFeatureVersion: publishAbFeatureVersion,
  rollbackFeature: rollbackAbFeature,
  createWhitelistTest: createAbWhitelistTest,
  changeFeatureLifecycle: changeAbFeatureLifecycle,
  solidifyExperimentToFeature,
  decideFeature: decideAbFeature,
  getOperationLogs: getAbOperationLogs,
  apiPaths: abTestingApiPaths,
}
