import {
  groupProfileAuditLogs,
  groupProfileCurrentUser,
  groupProfileFeatureFlags,
  groupProfileGroups,
  groupProfileLabels,
  groupProfileMetricDimensionOptions,
  groupProfileMetricDefinitions,
  groupProfilePermissionSet,
  groupProfileQueryTasks,
  groupProfileResourcePermissions,
  groupProfileReports,
  groupProfileScheduleTasks,
  groupProfileSegmentOptions,
  groupProfileSubjects,
  groupProfileTemplates,
  groupProfileTgiConfigs,
} from '@/mock/groupProfileInsight'
import type { EntityId } from '@/types/common'
import type {
  GroupProfileActionResult,
  GroupProfileAuditAction,
  GroupProfileAuditLog,
  GroupProfileChart,
  GroupProfileCondition,
  GroupProfileDownloadPayload,
  GroupProfileDownloadTask,
  GroupProfileDuplicateReportOptions,
  GroupProfileMetricDimensionType,
  GroupProfileQueryTask,
  GroupProfileQueryTaskChartResult,
  GroupProfileResourceType,
  GroupProfileReport,
  GroupProfileReportPermission,
  GroupProfileReportSearchFilters,
  GroupProfileReportSearchResult,
  GroupProfileRuntimePermission,
  GroupProfileSaveReportPayload,
  GroupProfileSaveSegmentPayload,
  GroupProfileScheduleTask,
  GroupProfileSegmentOption,
  GroupProfileStatus,
  GroupProfileTemplate,
  GroupProfileTgiConfig,
  GroupProfileWorkbenchData,
} from '@/types/groupProfileInsight'
import type { ProfileSubjectType } from '@/types/profile'

const storageKey = 'group-profile-insight-state-v5'

let hydrated = false

interface PersistedState {
  reports: GroupProfileReport[]
  templates: GroupProfileTemplate[]
  tgiConfigs: GroupProfileTgiConfig[]
  queryTasks: GroupProfileQueryTask[]
  scheduleTasks: GroupProfileScheduleTask[]
  auditLogs: GroupProfileAuditLog[]
  segmentOptions: GroupProfileSegmentOption[]
}

interface LifecycleInsightReportPayload {
  name: string
  description: string
  subjectType: string
  subjectName: string
  sourceReportId: EntityId
  sourceReportName: string
  tagId: EntityId
  tagName: string
  stageValues: string[]
  stageNames: string[]
  insightObject: 'single' | 'merged'
  estimatedCount: number
  resourceSummary: string
  sourceType?: string
  sourceName?: string
  crowdRange?: string
  timeRange?: [string, string]
  sourceConfig?: Record<string, unknown>
}

const delay = 160

function clone<T>(payload: T): T {
  return JSON.parse(JSON.stringify(payload)) as T
}

function resolveMock<T>(payload: T, latency = delay): Promise<T> {
  return new Promise((resolve) => {
    globalThis.setTimeout(() => resolve(clone(payload)), latency)
  })
}

function now(): string {
  return new Date().toISOString()
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 10000)}`
}

function normalize(value: unknown): string {
  return String(value ?? '').trim().toLowerCase()
}

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

function replaceArray<T>(target: T[], source: T[]): void {
  target.splice(0, target.length, ...source)
}

function hydrate(): void {
  if (hydrated) return
  hydrated = true
  if (!canUseLocalStorage()) return
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return
    const state = JSON.parse(raw) as Partial<PersistedState>
    if (state.reports?.length) replaceArray(groupProfileReports, state.reports)
    if (state.templates?.length) replaceArray(groupProfileTemplates, state.templates)
    if (state.tgiConfigs?.length) replaceArray(groupProfileTgiConfigs, state.tgiConfigs)
    if (state.queryTasks?.length) replaceArray(groupProfileQueryTasks, state.queryTasks)
    if (state.scheduleTasks?.length) replaceArray(groupProfileScheduleTasks, state.scheduleTasks)
    if (state.auditLogs) replaceArray(groupProfileAuditLogs, state.auditLogs.slice(0, 200))
    if (state.segmentOptions?.length) replaceArray(groupProfileSegmentOptions, state.segmentOptions)
  } catch {
    window.localStorage.removeItem(storageKey)
  }
}

function persist(): void {
  if (!canUseLocalStorage()) return
  const state: PersistedState = {
    reports: groupProfileReports,
    templates: groupProfileTemplates,
    tgiConfigs: groupProfileTgiConfigs,
    queryTasks: groupProfileQueryTasks.slice(0, 80),
    scheduleTasks: groupProfileScheduleTasks.slice(0, 80),
    auditLogs: groupProfileAuditLogs.slice(0, 200),
    segmentOptions: groupProfileSegmentOptions,
  }
  window.localStorage.setItem(storageKey, JSON.stringify(state))
}

function auditJson(payload: unknown): string | undefined {
  if (payload === undefined) return undefined
  if (typeof payload === 'string') return payload
  return JSON.stringify(payload, null, 2)
}

function pushAudit(
  action: GroupProfileAuditAction,
  resourceType: GroupProfileAuditLog['resourceType'],
  reportId?: EntityId,
  before?: unknown,
  after?: unknown,
  metadata?: GroupProfileAuditLog['metadata'],
): void {
  groupProfileAuditLogs.unshift({
    id: makeId('audit'),
    userId: groupProfileCurrentUser.id,
    userName: groupProfileCurrentUser.name,
    action,
    reportId,
    resourceType,
    resourceId: reportId,
    resourceName:
      resourceType === 'report'
        ? groupProfileReports.find((report) => report.id === reportId)?.name
        : resourceType === 'template'
          ? groupProfileTemplates.find((template) => template.id === reportId)?.name
          : groupProfileTgiConfigs.find((config) => config.id === reportId)?.name,
    before: auditJson(before),
    after: auditJson(after),
    metadata,
    requestId: makeId('req'),
    ip: '127.0.0.1',
    createdAt: now(),
  })
  if (groupProfileAuditLogs.length > 200) {
    groupProfileAuditLogs.splice(200)
  }
  persist()
}

function isCreator(report: GroupProfileReport): boolean {
  return report.creator.id === groupProfileCurrentUser.id
}

function hasReportGrant(report: GroupProfileReport, permission: 'view' | 'edit'): boolean {
  return report.permissions.some((item) => {
    if (permission === 'view') return item.permission === 'view' || item.permission === 'edit'
    return item.permission === 'edit'
  })
}

function runtimePermissionFor(report: GroupProfileReport): GroupProfileRuntimePermission {
  const projectAdmin = groupProfilePermissionSet.projectAdmin
  const canView = groupProfilePermissionSet.viewReport && (isCreator(report) || projectAdmin || hasReportGrant(report, 'view'))
  const canEdit = canView && (isCreator(report) || projectAdmin || hasReportGrant(report, 'edit'))
  const canDelete = isCreator(report) || projectAdmin
  return {
    canView,
    canEdit,
    canDelete,
    canDownload: canView && groupProfilePermissionSet.downloadReport,
    canAuthorize: canEdit && groupProfilePermissionSet.managePermission,
    canEmbed: canView && groupProfilePermissionSet.embedReport,
    canCopy: canView,
  }
}

function decorateReport(report: GroupProfileReport): GroupProfileReport {
  return { ...report, runtimePermission: runtimePermissionFor(report) }
}

function subjectName(subjectType: ProfileSubjectType): string {
  return groupProfileSubjects.find((subject) => subject.type === subjectType)?.name ?? '用户'
}

function groupName(groupId: EntityId): string {
  return groupProfileGroups.find((group) => group.id === groupId)?.name ?? '未分组'
}

function normalizeProfileSubject(subjectType: string): ProfileSubjectType {
  return groupProfileSubjects.some((subject) => subject.type === subjectType)
    ? subjectType as ProfileSubjectType
    : 'user'
}

function resourcePermission(resourceType: GroupProfileResourceType, resourceId?: EntityId): { ok: boolean; message: string } {
  if (!resourceId) return { ok: true, message: '' }
  const resource = groupProfileResourcePermissions.find((item) => item.resourceType === resourceType && item.resourceId === resourceId)
  if (!resource) return { ok: false, message: '资源不存在或已删除。' }
  if (!resource.permission) return { ok: false, message: resource.reason || `暂无${resource.resourceName}资源权限。` }
  return { ok: true, message: '' }
}

function resourceTypeForDimension(type: GroupProfileMetricDimensionType): GroupProfileResourceType | undefined {
  if (type === 'tag') return 'tag'
  if (type === 'behavior') return 'behavior'
  if (type === 'detail') return 'detail'
  if (type === 'attribute') return 'attribute'
  return undefined
}

function validateChartResources(chart: GroupProfileChart): GroupProfileQueryTaskChartResult {
  if (chart.analysisType === 'label') {
    const result = resourcePermission('tag', chart.labelConfig?.tagId)
    return {
      chartId: chart.id,
      chartTitle: chart.title,
      status: result.ok ? 'success' : 'failed',
      errorMessage: result.ok ? undefined : result.message,
    }
  }
  const config = chart.metricConfig
  if (!config) return { chartId: chart.id, chartTitle: chart.title, status: 'failed', errorMessage: '指标图表配置缺失。' }
  const dimensionResourceType = resourceTypeForDimension(config.xAxisType)
  if (dimensionResourceType) {
    const dimensionCheck = resourcePermission(dimensionResourceType, config.xAxisField)
    if (!dimensionCheck.ok) return { chartId: chart.id, chartTitle: chart.title, status: 'failed', errorMessage: dimensionCheck.message }
  }
  if (config.yAxisSourceType === 'tag') {
    const tagCheck = resourcePermission('tag', config.yAxisMetricId)
    if (!tagCheck.ok) return { chartId: chart.id, chartTitle: chart.title, status: 'failed', errorMessage: tagCheck.message }
  }
  if (config.yAxisSourceType === 'defined_metric') {
    const metric = groupProfileMetricDefinitions.find((item) => item.id === config.yAxisMetricId)
    if (!metric) return { chartId: chart.id, chartTitle: chart.title, status: 'failed', errorMessage: '指标不存在或已删除。' }
    if (metric.conditionSource && metric.conditionResourceId) {
      const metricCheck = resourcePermission(metric.conditionSource, metric.conditionResourceId)
      if (!metricCheck.ok) return { chartId: chart.id, chartTitle: chart.title, status: 'failed', errorMessage: metricCheck.message }
    }
  }
  if (config.yAxisSourceType === 'new_metric' && config.metric?.conditionSource && config.metric.conditionResourceId) {
    const metricCheck = resourcePermission(config.metric.conditionSource, config.metric.conditionResourceId)
    if (!metricCheck.ok) return { chartId: chart.id, chartTitle: chart.title, status: 'failed', errorMessage: metricCheck.message }
  }
  return { chartId: chart.id, chartTitle: chart.title, status: 'success' }
}

function reconcileInvalidState(report: GroupProfileReport): GroupProfileReport {
  const decorated = clone(report)
  const brokenSegments = decorated.segments.filter((segment) => {
    if (segment.sourceType === 'custom_rule') return false
    const source = groupProfileSegmentOptions.find((item) => item.id === segment.segmentId)
    return !source || source.status === 'invalid'
  })
  const tgiConfig = decorated.tgiConfigId ? groupProfileTgiConfigs.find((config) => config.id === decorated.tgiConfigId) : undefined
  if (brokenSegments.length) {
    decorated.status = 'invalid'
    decorated.invalidReason = `引用分群「${brokenSegments[0]?.segmentName ?? '未知分群'}」已删除或失效，请重新选择分析对象。`
    return decorated
  }
  if (tgiConfig?.status === 'invalid') {
    decorated.invalidReason = `TGI 基准「${tgiConfig.baseSegmentName || tgiConfig.baseTagName || tgiConfig.name}」已失效，相关 TGI 结果按局部失效展示。`
    if (decorated.status === 'success') decorated.status = 'partial_success'
  }
  return decorated
}

function visibleReports(): GroupProfileReport[] {
  return groupProfileReports
    .filter((report) => report.status !== 'deleted')
    .map(reconcileInvalidState)
    .map(decorateReport)
    .filter((report) => report.runtimePermission.canView)
}

function betweenTime(value: string, range?: [number, number] | null): boolean {
  if (!range) return true
  const time = Date.parse(value)
  return time >= range[0] && time <= range[1]
}

function matchesFilters(report: GroupProfileReport, filters: GroupProfileReportSearchFilters): boolean {
  const keyword = normalize(filters.keyword)
  const keywordMatch = !keyword || normalize(report.name).includes(keyword) || normalize(report.creator.name).includes(keyword)
  const groupMatch = !filters.groupIds.length || filters.groupIds.includes(report.groupId)
  const subjectMatch = !filters.subjectTypes.length || filters.subjectTypes.includes(report.subjectType)
  const typeMatch = !filters.reportTypes.length || filters.reportTypes.includes(report.reportType)
  const creatorMatch = !filters.creatorIds.length || filters.creatorIds.includes(report.creator.id)
  const updateMatch = !filters.updateModes.length || filters.updateModes.includes(report.updateMode)
  const favoriteMatch =
    filters.favoriteState === 'all' ||
    (filters.favoriteState === 'favorite' && report.favorite) ||
    (filters.favoriteState === 'not_favorite' && !report.favorite)
  return (
    keywordMatch &&
    groupMatch &&
    subjectMatch &&
    typeMatch &&
    creatorMatch &&
    updateMatch &&
    favoriteMatch &&
    betweenTime(report.createdAt, filters.createdRange) &&
    betweenTime(report.updatedAt, filters.updatedRange)
  )
}

function paginate<T>(rows: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize
  return rows.slice(start, start + pageSize)
}

function rebindChartList(charts: GroupProfileChart[], nextReportId: EntityId): GroupProfileChart[] {
  const idMap = new Map<EntityId, EntityId>()
  charts.forEach((chart) => {
    idMap.set(chart.id, makeId(chart.analysisType === 'label' ? 'label-chart' : 'metric-chart'))
  })
  return charts.map((chart, index) => ({
    ...clone(chart),
    id: idMap.get(chart.id) ?? makeId(chart.analysisType === 'label' ? 'label-chart' : 'metric-chart'),
    reportId: nextReportId,
    orderIndex: index + 1,
    linkageConfig: {
      ...chart.linkageConfig,
      linkedChartIds: chart.linkageConfig.linkedChartIds.map((id) => idMap.get(id)).filter(Boolean) as EntityId[],
    },
  }))
}

function rebindCharts(report: GroupProfileReport, nextReportId: EntityId): GroupProfileChart[] {
  return rebindChartList(report.charts, nextReportId)
}

function buildDefaultReport(subjectType: ProfileSubjectType): GroupProfileReport {
  const id = makeId('report')
  const defaultGroupId = 'report-group-growth'
  const firstSegment = groupProfileSegmentOptions.find((segment) => segment.subjectType === subjectType && segment.permission && segment.status !== 'invalid')
  return {
    id,
    name: '未命名群体画像报告',
    description: '',
    subjectType,
    subjectName: subjectName(subjectType),
    reportType: 'mixed',
    groupId: defaultGroupId,
    groupName: groupName(defaultGroupId),
    updateMode: 'manual',
    scheduleConfig: { updateMode: 'manual', queuePolicy: 'queue' },
    status: 'draft',
    creator: groupProfileCurrentUser,
    createdAt: now(),
    updatedAt: now(),
    dataUpdatedAt: today(),
    favorite: false,
    segments: firstSegment
      ? [
          {
            id: makeId('report-segment'),
            segmentId: firstSegment.id,
            reportId: id,
            segmentName: firstSegment.name,
            originalName: firstSegment.name,
            role: 'target',
            sourceType: 'existing',
            subjectType,
            subjectName: subjectName(subjectType),
            outputIdType: firstSegment.outputIdType,
            estimatedCount: firstSegment.count,
            estimateStatus: 'success',
          },
        ]
      : [],
    charts: [],
    chartGroups: [
      { id: 'chart-group-default', name: '默认分组', orderIndex: 1 },
      { id: 'chart-group-metric', name: '指标表现', orderIndex: 2 },
    ],
    globalSortMode: 'uv_ratio_desc',
    groupMode: 'taxonomy',
    ratioMode: 'population',
    showTgi: true,
    permissions: [],
    runtimePermission: {
      canView: true,
      canEdit: true,
      canDelete: true,
      canDownload: true,
      canAuthorize: true,
      canEmbed: true,
      canCopy: true,
    },
    dataPermissionSnapshot: {
      ownerId: groupProfileCurrentUser.id,
      ownerName: groupProfileCurrentUser.name,
      calculatedAt: now(),
      resourceSummary: '新建报告将按创建人当前数据权限计算。',
    },
  }
}

function sampleChartsForReport(reportId: EntityId): GroupProfileChart[] {
  const source = groupProfileReports.find((report) => report.id === 'report-low-coin-ad-profile') ?? groupProfileReports[0]
  return source ? rebindCharts(source, reportId).slice(0, 4) : []
}

function validateReport(report: GroupProfileReport): string | undefined {
  if (!report.name.trim()) return '请输入报告名称。'
  if (!report.segments.some((segment) => segment.role === 'target')) return '至少配置一个目标分群。'
  if (report.charts.length === 0) return '请至少配置一个标签分析或指标分析图表。'
  for (const segment of report.segments) {
    if (segment.sourceType === 'existing') {
      const segmentCheck = resourcePermission('segment', segment.segmentId)
      if (!segmentCheck.ok) return segmentCheck.message
    }
  }
  for (const chart of report.charts) {
    const chartResult = validateChartResources(chart)
    if (chartResult.status === 'failed') return chartResult.errorMessage
  }
  if (report.updateMode === 'daily' && !groupProfilePermissionSet.createDailyReport) return '暂无按天定时更新报告权限。'
  if (report.updateMode === 'daily' && !report.scheduleConfig.executeTime) return '请配置每天自动更新的执行时间。'
  return undefined
}

function findLatestScheduleTask(reportId: EntityId): GroupProfileScheduleTask | undefined {
  return groupProfileScheduleTasks
    .filter((task) => task.reportId === reportId)
    .sort((a, b) => Date.parse(b.scheduledAt) - Date.parse(a.scheduledAt))[0]
}

function buildScheduledAt(report: GroupProfileReport): string | undefined {
  if (report.updateMode !== 'daily' || !report.scheduleConfig.executeTime) return undefined
  const date = today()
  if (report.scheduleConfig.startDate && report.scheduleConfig.startDate > date) return undefined
  if (report.scheduleConfig.endDate && report.scheduleConfig.endDate < date) return undefined
  return `${date}T${report.scheduleConfig.executeTime}:00`
}

function hasRunningQuery(reportId: EntityId, excludeTaskId?: EntityId): boolean {
  return groupProfileQueryTasks.some((task) => task.id !== excludeTaskId && task.reportId === reportId && (task.status === 'running' || task.status === 'created'))
}

function createQueryTaskForReport(report: GroupProfileReport, taskType: 'manual' | 'scheduled', queued = false): GroupProfileQueryTask {
  const task: GroupProfileQueryTask = {
    id: makeId(taskType === 'manual' ? 'query-task' : 'schedule-query-task'),
    reportId: report.id,
    taskType,
    status: queued ? 'queued' : 'running',
    stage: queued ? 'created' : 'validating',
    createdAt: now(),
    updatedAt: now(),
    pollCount: 0,
    chartResults: report.charts.map((chart) => ({ chartId: chart.id, chartTitle: chart.title, status: queued ? 'running' : 'running' })),
    message: queued ? '上一任务仍在运行，当前任务已进入等待队列。' : '任务已创建，正在校验资源权限。',
  }
  groupProfileQueryTasks.unshift(task)
  if (groupProfileQueryTasks.length > 80) groupProfileQueryTasks.splice(80)
  return task
}

function completeQueryTask(task: GroupProfileQueryTask): GroupProfileQueryTask {
  const report = groupProfileReports.find((item) => item.id === task.reportId && item.status !== 'deleted')
  if (!report) {
    task.status = 'failed'
    task.stage = 'done'
    task.message = '报告不存在或已删除。'
    task.completedAt = now()
    task.updatedAt = now()
    return task
  }
  const before = clone(report)
  const chartResults = report.charts.map(validateChartResources)
  chartResults.forEach((result) => {
    const chart = report.charts.find((item) => item.id === result.chartId)
    if (!chart) return
    chart.status = result.status === 'failed' ? 'failed' : 'success'
    chart.errorMessage = result.errorMessage
  })
  const failedCount = chartResults.filter((result) => result.status === 'failed').length
  report.status = failedCount === chartResults.length ? 'failed' : failedCount > 0 ? 'partial_success' : 'success'
  report.dataUpdatedAt = today()
  report.updatedAt = now()
  report.dataPermissionSnapshot = {
    ownerId: report.creator.id,
    ownerName: report.creator.name,
    calculatedAt: now(),
    resourceSummary: `按创建人数据权限完成 ${chartResults.length - failedCount}/${chartResults.length} 个图表计算`,
  }
  task.chartResults = chartResults
  task.status = failedCount === chartResults.length ? 'failed' : 'completed'
  task.stage = 'done'
  task.message = failedCount > 0 ? `查询完成，${failedCount} 个图表因资源权限或配置失效失败。` : '查询完成，所有图表已刷新。'
  task.completedAt = now()
  task.updatedAt = now()
  pushAudit('query_report', 'report', report.id, before, report, { taskId: task.id, failedChartCount: failedCount })
  return task
}

function syncScheduleTaskFromQuery(task: GroupProfileQueryTask): void {
  const scheduleTask = groupProfileScheduleTasks.find((item) => item.queryTaskId === task.id)
  if (!scheduleTask) return
  if (task.status === 'running' && scheduleTask.status !== 'running') {
    scheduleTask.status = 'running'
    scheduleTask.message = '排队任务已开始执行。'
    scheduleTask.updatedAt = now()
    return
  }
  if (task.status === 'completed' || task.status === 'failed') {
    scheduleTask.status = task.status
    scheduleTask.message = task.status === 'completed' ? '定时更新已完成。' : task.message
    scheduleTask.updatedAt = now()
  }
}

function advanceQueryTask(task: GroupProfileQueryTask): GroupProfileQueryTask {
  if (task.status === 'queued' && !hasRunningQuery(task.reportId, task.id)) {
    task.status = 'running'
    task.stage = 'validating'
    task.message = '等待任务已开始运行。'
    syncScheduleTaskFromQuery(task)
  }
  if (task.status !== 'running') return task
  task.pollCount += 1
  task.updatedAt = now()
  if (task.pollCount === 1) {
    task.stage = 'calculating'
    task.message = '资源权限校验通过，正在计算图表数据。'
    return task
  }
  if (task.pollCount === 2) {
    task.stage = 'writing'
    task.message = '图表计算完成，正在写入报告结果。'
    return task
  }
  const completed = completeQueryTask(task)
  syncScheduleTaskFromQuery(completed)
  return completed
}

function advanceRunningTasksForReport(reportId: EntityId, excludeTaskId?: EntityId): void {
  for (let step = 0; step < 3; step += 1) {
    const runningTasks = groupProfileQueryTasks.filter((task) => task.id !== excludeTaskId && task.reportId === reportId && task.status === 'running')
    if (!runningTasks.length) return
    runningTasks.forEach((task) => {
      advanceQueryTask(task)
    })
  }
}

function processScheduledReports(): void {
  const currentTime = Date.now()
  groupProfileQueryTasks
    .filter((task) => task.taskType === 'scheduled' && task.status === 'running')
    .forEach((task) => {
      advanceQueryTask(task)
    })
  groupProfileReports
    .filter((report) => report.status !== 'deleted' && report.updateMode === 'daily')
    .forEach((report) => {
      const scheduledAt = buildScheduledAt(report)
      if (!scheduledAt || Date.parse(scheduledAt) > currentTime) return
      if (groupProfileScheduleTasks.some((task) => task.reportId === report.id && task.scheduledAt.slice(0, 10) === scheduledAt.slice(0, 10))) return
      const running = hasRunningQuery(report.id) || report.status === 'running'
      const queuePolicy = report.scheduleConfig.queuePolicy ?? 'queue'
      const scheduleTask: GroupProfileScheduleTask = {
        id: makeId('schedule-task'),
        reportId: report.id,
        reportName: report.name,
        scheduledAt,
        status: running && queuePolicy === 'skip' ? 'skipped' : running ? 'queued' : 'running',
        queuePolicy,
        message:
          running && queuePolicy === 'skip'
            ? '上一任务未完成，本次定时更新已跳过。'
            : running
              ? '上一任务未完成，本次定时更新进入等待队列。'
              : '定时更新任务已触发。',
        createdAt: now(),
        updatedAt: now(),
      }
      if (scheduleTask.status !== 'skipped') {
        const queryTask = createQueryTaskForReport(report, 'scheduled', scheduleTask.status === 'queued')
        scheduleTask.queryTaskId = queryTask.id
      }
      groupProfileScheduleTasks.unshift(scheduleTask)
      if (groupProfileScheduleTasks.length > 80) groupProfileScheduleTasks.splice(80)
    })
  persist()
}

export const groupProfileInsightService = {
  async getWorkbenchData(): Promise<GroupProfileWorkbenchData> {
    hydrate()
    processScheduledReports()
    return resolveMock({
      permissions: groupProfilePermissionSet,
      featureFlags: groupProfileFeatureFlags,
      subjects: groupProfileSubjects,
      groups: groupProfileGroups,
      segmentOptions: groupProfileSegmentOptions,
      labels: groupProfileLabels,
      resourcePermissions: groupProfileResourcePermissions,
      metricDimensionOptions: groupProfileMetricDimensionOptions,
      metricDefinitions: groupProfileMetricDefinitions,
      reports: visibleReports(),
      templates: groupProfileTemplates,
      tgiConfigs: groupProfileTgiConfigs,
      queryTasks: groupProfileQueryTasks,
      scheduleTasks: groupProfileScheduleTasks,
      auditLogs: groupProfileAuditLogs,
    })
  },

  async searchReports(filters: GroupProfileReportSearchFilters): Promise<GroupProfileReportSearchResult> {
    hydrate()
    processScheduledReports()
    const rows = visibleReports()
      .filter((report) => matchesFilters(report, filters))
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    return resolveMock({
      total: rows.length,
      rows: paginate(rows, filters.page, filters.pageSize),
      page: filters.page,
      pageSize: filters.pageSize,
    })
  },

  async getReport(reportId: EntityId): Promise<GroupProfileReport | undefined> {
    hydrate()
    const report = groupProfileReports.find((item) => item.id === reportId && item.status !== 'deleted')
    return resolveMock(report ? decorateReport(reconcileInvalidState(report)) : undefined)
  },

  buildDraftReport(subjectType: ProfileSubjectType): GroupProfileReport {
    return buildDefaultReport(subjectType)
  },

  buildDefaultCharts(reportId: EntityId): GroupProfileChart[] {
    return sampleChartsForReport(reportId)
  },

  cloneChartsForReport(charts: GroupProfileChart[], reportId: EntityId): GroupProfileChart[] {
    return rebindChartList(charts, reportId)
  },

  createReportFromLifecycleInsight(payload: LifecycleInsightReportPayload): GroupProfileReport {
    hydrate()
    const subjectType = normalizeProfileSubject(payload.subjectType)
    const report = buildDefaultReport(subjectType)
    const stageNames = payload.stageNames.length ? payload.stageNames : payload.stageValues
    const segmentName = payload.insightObject === 'merged'
      ? `${stageNames.join('、')} 合并生命周期人群`
      : `${stageNames[0] ?? '生命周期阶段'} 生命周期人群`
    const conditions: GroupProfileCondition[] = payload.stageValues.map((stageValue, index) => ({
      id: makeId('condition-lifecycle'),
      source: 'tag',
      sourceName: '标签',
      field: payload.tagId,
      label: payload.tagName,
      operator: '等于',
      value: stageNames[index] ?? stageValue,
      relation: 'include',
    }))
    if (payload.sourceType && payload.sourceName) {
      conditions.push({
        id: makeId('condition-lifecycle-crowd-source'),
        source: 'segment',
        sourceName: '生命周期分析对象',
        field: payload.sourceType,
        label: payload.sourceName,
        operator: '等于',
        value: payload.crowdRange ?? JSON.stringify(payload.sourceConfig ?? {}),
        relation: 'include',
      })
    }
    report.name = payload.name.trim() || `${payload.sourceReportName}_${stageNames.join('、')}_群体洞察`
    report.description = payload.description
    report.subjectType = subjectType
    report.subjectName = payload.subjectName || subjectName(subjectType)
    report.reportType = 'mixed'
    report.status = 'success'
    report.dataUpdatedAt = today()
    report.segments = [
      {
        id: makeId('report-segment-lifecycle'),
        reportId: report.id,
        segmentName,
        originalName: segmentName,
        role: 'target',
        sourceType: 'custom_rule',
        subjectType,
        subjectName: report.subjectName,
        outputIdType: subjectType === 'lead' ? 'lead_id' : 'oneid',
        ruleConfig: {
          satisfyLogic: payload.insightObject === 'merged' ? 'any' : 'all',
          satisfyConditions: conditions,
          excludeLogic: 'any',
          excludeConditions: [],
          version: 1,
        },
        estimatedCount: payload.estimatedCount,
        estimateStatus: 'success',
      },
    ]
    report.charts = sampleChartsForReport(report.id)
    report.chartGroups = [
      { id: 'chart-group-lifecycle-label', name: '生命周期标签洞察', orderIndex: 1 },
      { id: 'chart-group-lifecycle-metric', name: '生命周期指标表现', orderIndex: 2 },
    ]
    report.dataPermissionSnapshot = {
      ownerId: groupProfileCurrentUser.id,
      ownerName: groupProfileCurrentUser.name,
      calculatedAt: now(),
      resourceSummary: payload.resourceSummary,
    }
    report.runtimePermission = runtimePermissionFor(report)
    groupProfileReports.unshift(report)
    createQueryTaskForReport(report, 'manual')
    pushAudit('create_report', 'report', report.id, undefined, report, {
      source: 'lifecycle_analysis',
      sourceReportId: payload.sourceReportId,
      tagId: payload.tagId,
      stageValues: payload.stageValues.join(','),
    })
    persist()
    return clone(decorateReport(report))
  },

  async estimateSegments(report: GroupProfileReport): Promise<GroupProfileReport> {
    const estimated = clone(report)
    estimated.segments = estimated.segments.map((segment) => {
      if (segment.sourceType === 'custom_rule') {
        const conditionCount = (segment.ruleConfig?.satisfyConditions.length ?? 0) + (segment.ruleConfig?.excludeConditions.length ?? 0)
        if (conditionCount === 0) {
          return { ...segment, estimateStatus: 'failed', failedReason: '请完善分群圈选条件', estimatedCount: 0 }
        }
        return { ...segment, estimateStatus: 'success', estimatedCount: Math.max(1200, 12800 - conditionCount * 780) }
      }
      const option = groupProfileSegmentOptions.find((item) => item.id === segment.segmentId)
      if (!option) {
        return { ...segment, estimateStatus: 'failed', failedReason: '分群已删除或不可用', estimatedCount: 0 }
      }
      if (!option.permission) {
        return { ...segment, estimateStatus: 'failed', failedReason: '暂无该分群使用权限', estimatedCount: 0 }
      }
      return { ...segment, estimateStatus: 'success', estimatedCount: option.count }
    })
    return resolveMock(estimated, 420)
  },

  async saveReport(payload: GroupProfileSaveReportPayload): Promise<GroupProfileActionResult> {
    hydrate()
    const error = validateReport(payload.report)
    if (error) return resolveMock({ ok: false, message: error })
    const saved = clone(payload.report)
    const existingIndex = groupProfileReports.findIndex((report) => report.id === saved.id)
    saved.groupName = groupName(saved.groupId)
    saved.subjectName = subjectName(saved.subjectType)
    saved.updatedAt = now()
    saved.status = saved.status === 'draft' ? 'pending_query' : saved.status
    saved.scheduleConfig.nextRunAt = buildScheduledAt(saved)
    saved.dataPermissionSnapshot = saved.dataPermissionSnapshot ?? {
      ownerId: saved.creator.id,
      ownerName: saved.creator.name,
      calculatedAt: now(),
      resourceSummary: '报告尚未查询，保存了创建人数据权限快照。',
    }
    saved.runtimePermission = runtimePermissionFor(saved)
    if (existingIndex >= 0) {
      const before = clone(groupProfileReports[existingIndex])
      groupProfileReports.splice(existingIndex, 1, saved)
      pushAudit('edit_report', 'report', saved.id, before, saved, { firstSave: payload.firstSave })
    } else {
      groupProfileReports.unshift(saved)
      pushAudit('create_report', 'report', saved.id, undefined, saved, { firstSave: payload.firstSave })
    }
    persist()
    return resolveMock({ ok: true, id: saved.id, message: payload.firstSave ? '报告保存成功。' : '报告配置已保存。' })
  },

  async queryReport(reportId: EntityId): Promise<GroupProfileReport | undefined> {
    hydrate()
    const report = groupProfileReports.find((item) => item.id === reportId && item.status !== 'deleted')
    if (!report) return resolveMock(undefined)
    const task = createQueryTaskForReport(report, 'manual', hasRunningQuery(report.id))
    if (task.status === 'running') report.status = 'running'
    persist()
    await resolveMock(true, 180)
    if (task.status === 'running') completeQueryTask(task)
    persist()
    return resolveMock(decorateReport(report), 80)
  },

  async createReportQueryTask(reportId: EntityId): Promise<GroupProfileQueryTask | undefined> {
    hydrate()
    const report = groupProfileReports.find((item) => item.id === reportId && item.status !== 'deleted')
    if (!report) return resolveMock(undefined)
    if (!report.charts.length) {
      report.charts = sampleChartsForReport(report.id)
    }
    const task = createQueryTaskForReport(report, 'manual', hasRunningQuery(report.id))
    if (task.status === 'running') report.status = 'running'
    persist()
    return resolveMock(task, 100)
  },

  async getReportQueryTask(taskId: EntityId): Promise<GroupProfileQueryTask | undefined> {
    hydrate()
    const task = groupProfileQueryTasks.find((item) => item.id === taskId)
    if (!task) return resolveMock(undefined)
    advanceRunningTasksForReport(task.reportId, task.id)
    const advanced = advanceQueryTask(task)
    persist()
    return resolveMock(advanced, 160)
  },

  async getReportTasks(reportId: EntityId): Promise<{ queryTasks: GroupProfileQueryTask[]; scheduleTasks: GroupProfileScheduleTask[] }> {
    hydrate()
    processScheduledReports()
    advanceRunningTasksForReport(reportId)
    return resolveMock({
      queryTasks: groupProfileQueryTasks.filter((task) => task.reportId === reportId),
      scheduleTasks: groupProfileScheduleTasks.filter((task) => task.reportId === reportId),
    })
  },

  async duplicateReport(reportId: EntityId, name?: string, options: GroupProfileDuplicateReportOptions = {}): Promise<GroupProfileActionResult> {
    hydrate()
    const source = groupProfileReports.find((report) => report.id === reportId && report.status !== 'deleted')
    if (!source) return resolveMock({ ok: false, message: '报告不存在或已删除。' })
    if (options.keepDailySchedule && !groupProfilePermissionSet.createDailyReport) return resolveMock({ ok: false, message: '暂无按天定时更新权限，无法保留原定时策略。' })
    const keepDailySchedule = Boolean(options.keepDailySchedule && source.updateMode === 'daily')
    const id = makeId('report-copy')
    const copied: GroupProfileReport = {
      ...clone(source),
      id,
      name: name?.trim() || `${source.name}_副本`,
      updateMode: keepDailySchedule ? source.updateMode : 'manual',
      scheduleConfig: keepDailySchedule ? { ...clone(source.scheduleConfig), nextRunAt: undefined } : { updateMode: 'manual', queuePolicy: 'queue' },
      creator: groupProfileCurrentUser,
      createdAt: now(),
      updatedAt: now(),
      favorite: false,
      permissions: [],
      charts: rebindCharts(source, id),
      segments: source.segments.map((segment) => ({ ...segment, id: makeId('report-segment'), reportId: id })),
    }
    copied.scheduleConfig.nextRunAt = buildScheduledAt(copied)
    copied.runtimePermission = runtimePermissionFor(copied)
    groupProfileReports.unshift(copied)
    pushAudit('copy_report', 'report', id, source, copied, { sourceReportId: source.id, keepDailySchedule })
    persist()
    return resolveMock({ ok: true, id, message: keepDailySchedule ? '报告复制成功，已保留按天更新策略。' : '报告复制成功，副本默认手动更新。' })
  },

  async deleteReport(reportId: EntityId): Promise<GroupProfileActionResult> {
    hydrate()
    const report = groupProfileReports.find((item) => item.id === reportId)
    if (!report) return resolveMock({ ok: false, message: '报告不存在。' })
    if (!runtimePermissionFor(report).canDelete) return resolveMock({ ok: false, message: '只有报告创建者或项目管理员可以删除报告。' })
    const before = clone(report)
    report.status = 'deleted'
    report.deletedAt = now()
    pushAudit('delete_report', 'report', reportId, before, report)
    persist()
    return resolveMock({ ok: true, id: reportId, message: '报告已删除。' })
  },

  async toggleFavorite(reportId: EntityId): Promise<boolean> {
    hydrate()
    const report = groupProfileReports.find((item) => item.id === reportId)
    if (!report) return resolveMock(false)
    report.favorite = !report.favorite
    persist()
    return resolveMock(report.favorite, 80)
  },

  async updateReportPermissions(reportId: EntityId, permissions: GroupProfileReportPermission[]): Promise<GroupProfileActionResult> {
    hydrate()
    const report = groupProfileReports.find((item) => item.id === reportId)
    if (!report) return resolveMock({ ok: false, message: '报告不存在。' })
    const seen = new Set<string>()
    for (const permission of permissions) {
      const key = `${permission.principalType}:${permission.principalId}`
      if (seen.has(key)) return resolveMock({ ok: false, message: '同一授权对象不能重复授权。' })
      seen.add(key)
    }
    const before = clone(report.permissions)
    report.permissions = permissions.map((permission) => ({ ...permission, reportId }))
    report.updatedAt = now()
    pushAudit('grant_report', 'report', reportId, before, report.permissions)
    persist()
    return resolveMock({ ok: true, id: reportId, message: '权限配置已保存并立即生效。' })
  },

  async createDownloadTask(payload: GroupProfileDownloadPayload): Promise<GroupProfileDownloadTask> {
    hydrate()
    const report = groupProfileReports.find((item) => item.id === payload.reportId)
    const fileName = `${report?.name ?? '群体画像报告'}-${payload.format === 'excel' ? '界面数据' : '图表截图'}.${payload.format === 'excel' ? 'xlsx' : 'png'}`
    pushAudit('download_report', 'report', payload.reportId, undefined, { ...payload, fileName }, { format: payload.format })
    return resolveMock({
      id: makeId('download'),
      reportId: payload.reportId,
      format: payload.format,
      status: 'completed',
      fileName,
      includeAiSummary: payload.includeAiSummary,
      createdAt: now(),
      message: payload.format === 'excel' ? 'Excel 已按当前界面口径生成，包含报告信息、图表数据和可用 AI 总结。' : 'PNG 已按当前图表筛选、排序和图例状态生成。',
    })
  },

  async saveSegmentFromReport(payload: GroupProfileSaveSegmentPayload): Promise<GroupProfileActionResult> {
    hydrate()
    if (!payload.name.trim()) return resolveMock({ ok: false, message: '请输入分群名称。' })
    if (payload.mode === 'selected_tags' && payload.selectedTagValueIds.length === 0) return resolveMock({ ok: false, message: '请至少选择一个标签值。' })
    if (payload.mode === 'report_segment' && payload.segmentIds.length === 0) return resolveMock({ ok: false, message: '请选择需要保存的报告分析对象分群。' })
    const report = groupProfileReports.find((item) => item.id === payload.reportId)
    if (!report) return resolveMock({ ok: false, message: '报告不存在。' })
    if (payload.mode === 'selected_tags') {
      const selectedValueTags = report.charts.flatMap((chart) => chart.labelValues.filter((value) => payload.selectedTagValueIds.includes(value.id)).map((value) => value.tagId))
      for (const tagId of selectedValueTags) {
        const tagCheck = resourcePermission('tag', tagId)
        if (!tagCheck.ok) return resolveMock({ ok: false, message: `二次存为分群需按当前用户权限校验：${tagCheck.message}` })
      }
    }
    if (payload.mode === 'report_segment') {
      const selectedSegments = report.segments.filter((segment) => payload.segmentIds.includes(segment.id))
      for (const segment of selectedSegments) {
        const segmentCheck = resourcePermission('segment', segment.segmentId)
        if (!segmentCheck.ok) return resolveMock({ ok: false, message: `二次存为分群需按当前用户权限校验：${segmentCheck.message}` })
      }
    }
    const segment: GroupProfileSegmentOption = {
      id: makeId('segment-from-profile'),
      name: payload.name,
      subjectType: 'user',
      subjectName: '用户',
      outputIdType: payload.outputIdType,
      groupId: payload.groupId,
      groupName: groupName(payload.groupId),
      count: payload.mode === 'selected_tags' ? Math.max(1200, payload.selectedTagValueIds.length * 4200) : 28640,
      status: 'available',
      creator: groupProfileCurrentUser,
      updatedAt: now(),
      permission: true,
    }
    groupProfileSegmentOptions.unshift(segment)
    pushAudit('save_segment', 'report', payload.reportId, payload, segment)
    persist()
    return resolveMock({ ok: true, id: segment.id, message: '存为分群成功，可在用户分群模块查看。' })
  },

  async saveTemplate(template: GroupProfileTemplate): Promise<GroupProfileActionResult> {
    hydrate()
    if (!template.name.trim()) return resolveMock({ ok: false, message: '模板名称不能为空。' })
    const existingIndex = groupProfileTemplates.findIndex((item) => item.id === template.id)
    const before = existingIndex >= 0 ? clone(groupProfileTemplates[existingIndex]) : undefined
    const saved = { ...clone(template), updatedAt: now() }
    if (existingIndex >= 0) {
      groupProfileTemplates.splice(existingIndex, 1, saved)
    } else {
      groupProfileTemplates.unshift(saved)
    }
    pushAudit('create_template', 'template', saved.id, before, saved)
    persist()
    return resolveMock({ ok: true, id: saved.id, message: '模板保存成功。' })
  },

  async updateTemplatePermissions(templateId: EntityId, permissions: GroupProfileReportPermission[]): Promise<GroupProfileActionResult> {
    hydrate()
    const template = groupProfileTemplates.find((item) => item.id === templateId)
    if (!template) return resolveMock({ ok: false, message: '模板不存在。' })
    const seen = new Set<string>()
    for (const permission of permissions) {
      const key = `${permission.principalType}:${permission.principalId}`
      if (seen.has(key)) return resolveMock({ ok: false, message: '同一授权对象不能重复授权。' })
      seen.add(key)
    }
    const before = clone(template.sharedWith)
    template.sharedWith = permissions.map((permission) => ({ ...permission, reportId: templateId, permission: 'view' }))
    template.updatedAt = now()
    pushAudit('share_template', 'template', templateId, before, template.sharedWith)
    persist()
    return resolveMock({ ok: true, id: templateId, message: '模板授权已保存，共享对象可查看并使用模板。' })
  },

  async deleteTemplate(templateId: EntityId): Promise<GroupProfileActionResult> {
    hydrate()
    const index = groupProfileTemplates.findIndex((item) => item.id === templateId)
    if (index < 0) return resolveMock({ ok: false, message: '模板不存在。' })
    const [template] = groupProfileTemplates.splice(index, 1)
    pushAudit('create_template', 'template', templateId, template, { status: 'deleted' })
    persist()
    return resolveMock({ ok: true, id: templateId, message: '模板已删除，不影响已生成报告。' })
  },

  async saveTgiConfig(config: GroupProfileTgiConfig): Promise<GroupProfileActionResult> {
    hydrate()
    if (!config.name.trim()) return resolveMock({ ok: false, message: 'TGI 名称不能为空。' })
    const baseSegment = config.baseType === 'segment' ? groupProfileSegmentOptions.find((segment) => segment.id === config.baseSegmentId) : undefined
    const baseTag = config.baseType === 'tag' ? groupProfileLabels.find((label) => label.id === config.baseTagId) : undefined
    if (config.baseType === 'segment') {
      if (!baseSegment) return resolveMock({ ok: false, message: '请选择有效的基准分群。' })
      const segmentCheck = resourcePermission('segment', baseSegment.id)
      if (!segmentCheck.ok) return resolveMock({ ok: false, message: segmentCheck.message })
      if (baseSegment.subjectType !== config.subjectType) return resolveMock({ ok: false, message: '基准分群主体必须与报告主体一致。' })
      if (baseSegment.count <= 0) return resolveMock({ ok: false, message: '基准分群数量不能为 0。' })
    }
    if (config.baseType === 'tag') {
      if (!baseTag) return resolveMock({ ok: false, message: '请选择有效的基准标签。' })
      const tagCheck = resourcePermission('tag', baseTag.id)
      if (!tagCheck.ok) return resolveMock({ ok: false, message: tagCheck.message })
    }
    const saved: GroupProfileTgiConfig = {
      ...config,
      baseSegmentId: config.baseType === 'segment' ? config.baseSegmentId : '',
      baseSegmentName: config.baseType === 'segment' ? (baseSegment?.name ?? '') : (baseTag?.name ?? ''),
      baseSegmentCount: config.baseType === 'segment' ? (baseSegment?.count ?? 0) : Math.max(1000, (baseTag?.values.length ?? 1) * 360000),
      baseTagId: config.baseType === 'tag' ? baseTag?.id : undefined,
      baseTagName: config.baseType === 'tag' ? baseTag?.name : undefined,
      subjectName: subjectName(config.subjectType),
      formulaPreview:
        config.calculationType === 'label_ratio'
          ? `目标分群标签占比 / ${config.baseType === 'segment' ? baseSegment?.name : baseTag?.name}标签占比 * 100`
          : `目标分群标签有效占比 / ${config.baseType === 'segment' ? baseSegment?.name : baseTag?.name}标签有效占比 * 100`,
      status: 'enabled',
      updatedAt: now(),
    }
    const existingIndex = groupProfileTgiConfigs.findIndex((item) => item.id === saved.id)
    const before = existingIndex >= 0 ? clone(groupProfileTgiConfigs[existingIndex]) : undefined
    if (existingIndex >= 0) groupProfileTgiConfigs.splice(existingIndex, 1, saved)
    else groupProfileTgiConfigs.unshift(saved)
    pushAudit('update_tgi', 'tgi', saved.id, before, saved)
    persist()
    return resolveMock({ ok: true, id: saved.id, message: 'TGI 配置已保存。' })
  },

  async copyEmbedLink(reportId: EntityId): Promise<string> {
    hydrate()
    const path = `${window.location.origin}/user-insight/group-profiles/${reportId}?embedded=true`
    pushAudit('copy_embed_link', 'report', reportId, undefined, { embedUrl: path })
    return resolveMock(path, 80)
  },

  async getAuditLogs(reportId?: EntityId): Promise<GroupProfileAuditLog[]> {
    hydrate()
    return resolveMock(groupProfileAuditLogs.filter((log) => !reportId || log.reportId === reportId || log.resourceId === reportId))
  },

  makePermission(reportId: EntityId, principalName: string, level: 'view' | 'edit'): GroupProfileReportPermission {
    return {
      id: makeId('permission'),
      reportId,
      principalType: principalName.includes('组') ? 'group' : principalName.includes('角色') ? 'role' : principalName.includes('部门') ? 'department' : 'user',
      principalId: makeId('principal'),
      principalName,
      permission: level,
      createdBy: groupProfileCurrentUser,
      createdAt: now(),
    }
  },

  checkResourcePermission(resourceType: GroupProfileResourceType, resourceId?: EntityId): { ok: boolean; message: string } {
    return resourcePermission(resourceType, resourceId)
  },

  latestScheduleTask(reportId: EntityId): GroupProfileScheduleTask | undefined {
    hydrate()
    const task = findLatestScheduleTask(reportId)
    return task ? clone(task) : undefined
  },
}

export const groupProfileStatusLabels: Record<GroupProfileStatus, string> = {
  draft: '草稿',
  pending_query: '待查询',
  running: '计算中',
  success: '成功',
  failed: '失败',
  partial_success: '部分成功',
  deleted: '已删除',
  invalid: '已失效',
}

export const groupProfileReportTypeLabels: Record<GroupProfileReport['reportType'], string> = {
  label: '标签分析',
  metric: '指标分析',
  mixed: '混合报告',
}

export const groupProfileUpdateModeLabels: Record<GroupProfileReport['updateMode'], string> = {
  manual: '手动更新',
  daily: '按天更新',
}

export const groupProfileSortModeLabels: Record<GroupProfileReport['globalSortMode'], string> = {
  taxonomy: '标签体系中的排序',
  value_asc: '标签值升序',
  value_desc: '标签值降序',
  uv_ratio_asc: 'UV 占比升序',
  uv_ratio_desc: 'UV 占比降序',
  tgi_asc: 'TGI 值升序',
  tgi_desc: 'TGI 值降序',
}
