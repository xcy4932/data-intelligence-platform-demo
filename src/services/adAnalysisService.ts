import {
  adAccessDecisionMessage,
} from './adAnalysisServiceMessages'
import { buildAdDownloadFileName, createXlsxDataUrl } from './adAnalysisDownload'
import {
  compareAdVersion,
  getAdQueryFailure,
  getAdReportGateFailure,
  validateAdMetricFormula,
  validateMediaEventChain,
  validateTemplateMetricFormulas,
} from './adAnalysisRules'
import { createSegmentFromAdAnalysisExport } from '@/services/segmentService'
import {
  adAdvertisers,
  adBehaviorOptions,
  adChannels,
  adCreatives,
  adEventOptions,
  adGroups,
  adPlans,
  adSubjectOptions,
  buildSystemMetrics,
  createAdEffectResult,
  createAdMediaResult,
  createAdReportResult,
  mockAdAccessContext,
  mockAdAuditLogs,
  mockAdReports,
  mockAdTemplates,
} from '@/mock/adAnalysis'
import type {
  AdAccessContext,
  AdAccessContextPatch,
  AdAccessDecision,
  AdAnalysisReport,
  AdApiMutationResult,
  AdAuditLog,
  AdBehaviorEventConfig,
  AdDataPrerequisiteStatus,
  AdDownloadRequest,
  AdDownloadResult,
  AdEffectQueryRequest,
  AdEffectResult,
  AdExportSegmentPayload,
  AdExportSegmentResult,
  AdMediaQueryRequest,
  AdMediaResult,
  AdMetadataTemplate,
  AdMetricConfig,
  AdReferenceData,
  AdReportQueryRequest,
  AdReportResult,
  AdReportSavePayload,
  AdReportSearchRequest,
  AdReportSearchResponse,
  AdTemplateSavePayload,
  AdValidationResult,
} from '@/types/adAnalysis'

export { validateAdMetricFormula } from './adAnalysisRules'

const MOCK_DELAY = 240
const API_BASE = '/api/ad-analysis'
const DATA_FUSION_API_BASE = '/api/data-fusion'
const SEGMENT_API_BASE = '/api/user-insight/segments'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const resolveMock = <T>(payload: T, delay = MOCK_DELAY): Promise<T> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(clone(payload)), delay)
  })

let accessContext = clone(mockAdAccessContext)
let templates = clone(mockAdTemplates)
let reports = clone(mockAdReports)
let auditLogs: AdAuditLog[] = clone(mockAdAuditLogs)

const currentUserId = () => accessContext.userId
const currentUserName = () => accessContext.userName

const useMockBackend = () =>
  import.meta.env.VITE_AD_ANALYSIS_API_MODE !== 'api' && import.meta.env.PROD !== true

const unwrapApiResponse = async <T>(response: Response): Promise<T> => {
  const json = await response.json().catch(() => undefined) as
    | { success?: boolean, code?: number, message?: string, data?: T }
    | T
    | undefined

  if (!response.ok) {
    const message = json && typeof json === 'object' && 'message' in json ? String(json.message) : `请求失败：${response.status}`
    throw new Error(message)
  }

  if (json && typeof json === 'object' && 'success' in json && json.success === false) {
    throw new Error(String(json.message ?? '请求失败，请稍后重试。'))
  }

  if (json === undefined && response.status !== 204) {
    throw new Error('接口未返回可识别的数据。')
  }

  if (json && typeof json === 'object' && 'data' in json) {
    return json.data as T
  }

  return json as T
}

const apiRequest = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json')
  }
  headers.set('X-Project-Id', accessContext.projectId)

  const response = await fetch(path, {
    ...init,
    headers,
    credentials: 'include',
  })

  return unwrapApiResponse<T>(response)
}

const requestOrMock = async <T>(
  path: string,
  init: RequestInit,
  mockFactory: () => Promise<T> | T,
): Promise<T> => {
  if (useMockBackend()) {
    return mockFactory()
  }

  return apiRequest<T>(path, init)
}

const toJsonBody = (payload: unknown) => JSON.stringify(payload)

const createId = (prefix: string) => `${prefix}_${Date.now()}_${Math.round(Math.random() * 10000)}`

const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ')

const getTemplateName = (templateId: string) =>
  templates.find((template) => template.id === templateId)?.name ?? '未知模板'

const recordAudit = (
  action: string,
  sourceConfig: Record<string, unknown>,
  ids: {
    reportId?: string
    templateId?: string
    entityId?: string
    entityName?: string
    sourceType?: string
    requestId?: string
  } = {},
) => {
  auditLogs.unshift({
    id: createId('audit'),
    userId: currentUserId(),
    userName: currentUserName(),
    action,
    actionLabel: action,
    reportId: ids.reportId,
    templateId: ids.templateId,
    entityId: ids.entityId,
    entityName: ids.entityName,
    sourceType: ids.sourceType,
    sourceConfig,
    requestId: ids.requestId,
    ip: '127.0.0.1',
    createdAt: now(),
  })
}

const persistAudit = async (
  action: string,
  sourceConfig: Record<string, unknown>,
  ids: Parameters<typeof recordAudit>[2] = {},
) => {
  recordAudit(action, sourceConfig, ids)
  if (!useMockBackend()) {
    await apiRequest<AdApiMutationResult>(`${API_BASE}/audit-logs`, {
      method: 'POST',
      body: toJsonBody({
        action,
        ...ids,
        source_config: sourceConfig,
      }),
    })
  }
}

export const resolveAdAccessDecision = (context: AdAccessContext): AdAccessDecision => {
  const reasons: AdAccessDecision['reasons'] = []

  if (context.isNewUser && compareAdVersion(context.currentVersion, '1.26') >= 0) {
    reasons.push('version_closed')
  }

  if (!context.modulePurchased) reasons.push('not_purchased')
  if (!context.moduleDeployed) reasons.push('not_deployed')
  if (!context.permissions.viewAnalysis) reasons.push('no_permission')
  if (!context.dataFusionReady) reasons.push('data_not_ready')
  if (!context.idMappingReady) reasons.push('id_mapping_not_ready')
  if (!context.monitoringDataReady) reasons.push('monitoring_data_not_ready')

  return {
    available: reasons.length === 0,
    reasons,
    message: reasons.length > 0 ? adAccessDecisionMessage(reasons[0]!) : undefined,
  }
}

const validateDateRange = (start: string, end: string): AdValidationResult => {
  if (!start || !end) return { valid: false, message: '请选择时间范围。' }
  const startTime = new Date(`${start}T00:00:00`).getTime()
  const endTime = new Date(`${end}T00:00:00`).getTime()
  if (startTime > endTime) return { valid: false, message: '开始时间不能晚于结束时间。' }
  const days = Math.floor((endTime - startTime) / 86_400_000) + 1
  if (days > 30) return { valid: false, message: '最多支持选择30天。' }
  return { valid: true }
}

const validateTemplatePayload = (payload: AdTemplateSavePayload): AdValidationResult => {
  if (!payload.name.trim()) return { valid: false, message: '请输入模板名称。' }
  if (payload.name.trim().length > 100) return { valid: false, message: '模板名称最多 100 字。' }
  const duplicated = templates.some(
    (template) =>
      template.status !== 'deleted' &&
      template.id !== payload.id &&
      template.name.trim() === payload.name.trim(),
  )
  if (duplicated) return { valid: false, message: '同项目内不允许创建重复模板名称。' }
  if (!payload.subjectType) return { valid: false, message: '请选择主体。' }
  if (payload.behaviorEventConfig.length === 0) {
    return { valid: false, message: '至少配置 1 个广告行为事件。' }
  }

  const displayNames = new Set<string>()
  const orders = new Set<number>()
  const behaviorEvents = new Set<string>()
  for (const event of payload.behaviorEventConfig) {
    if (!event.adBehavior || !event.eventName || !event.displayName.trim() || !event.orderIndex) {
      return { valid: false, message: '每个广告行为事件配置必须完整。' }
    }
    if (behaviorEvents.has(`${event.adBehavior}:${event.eventName}`)) {
      return { valid: false, message: '行为事件不能重复配置为同一广告行为。' }
    }
    if (displayNames.has(event.displayName.trim())) {
      return { valid: false, message: '展示名称不能重复。' }
    }
    if (orders.has(event.orderIndex)) {
      return { valid: false, message: '顺序不能重复。' }
    }
    behaviorEvents.add(`${event.adBehavior}:${event.eventName}`)
    displayNames.add(event.displayName.trim())
    orders.add(event.orderIndex)
  }

  if (payload.metricConfig.length === 0) {
    return { valid: false, message: '指标列表不能为空。' }
  }

  const metricNames = new Set<string>()
  for (const metric of payload.metricConfig) {
    if (!metric.name.trim()) return { valid: false, message: '请输入指标名称。' }
    if (metricNames.has(metric.name.trim())) {
      return { valid: false, message: '同一模板下指标名称不允许重复。' }
    }
    const formulaResult = validateAdMetricFormula(
      metric.formula,
      metric.conditions.map((condition) => condition.variable),
    )
    if (!formulaResult.valid) return formulaResult
    metricNames.add(metric.name.trim())
  }

  return { valid: true }
}

const validateReportPayload = (payload: AdReportSavePayload): AdValidationResult => {
  if (!payload.name.trim()) return { valid: false, message: '请输入报告名称。' }
  if (payload.name.trim().length > 100) return { valid: false, message: '报告名称最多 100 字。' }
  if (!payload.templateId) return { valid: false, message: '请选择元数据模板。' }
  const template = templates.find((item) => item.id === payload.templateId)
  if (!template || template.status !== 'enabled') return { valid: false, message: '模板必须处于启用状态。' }
  if (!payload.reportType) return { valid: false, message: '请选择报告类型。' }
  return { valid: true }
}

const allowedChannels = () =>
  adChannels.filter((channel) => accessContext.dataPermission.channelIds.includes(channel.id))

const allowedAdvertisers = () =>
  adAdvertisers.filter(
    (advertiser) =>
      accessContext.dataPermission.advertiserIds.includes(advertiser.id) &&
      accessContext.dataPermission.channelIds.includes(advertiser.channelId ?? ''),
  )

const allowedAdGroups = () =>
  adGroups.filter(
    (group) =>
      accessContext.dataPermission.adGroupIds.includes(group.id) &&
      accessContext.dataPermission.advertiserIds.includes(group.advertiserId ?? '') &&
      accessContext.dataPermission.channelIds.includes(group.channelId ?? ''),
  )

const allowedAdPlans = () =>
  adPlans.filter(
    (plan) =>
      accessContext.dataPermission.adPlanIds.includes(plan.id) &&
      accessContext.dataPermission.adGroupIds.includes(plan.adGroupId ?? '') &&
      accessContext.dataPermission.advertiserIds.includes(plan.advertiserId ?? '') &&
      accessContext.dataPermission.channelIds.includes(plan.channelId ?? ''),
  )

const allowedAdCreatives = () =>
  adCreatives.filter(
    (creative) =>
      accessContext.dataPermission.adCreativeIds.includes(creative.id) &&
      accessContext.dataPermission.adPlanIds.includes(creative.adPlanId ?? '') &&
      accessContext.dataPermission.adGroupIds.includes(creative.adGroupId ?? '') &&
      accessContext.dataPermission.advertiserIds.includes(creative.advertiserId ?? '') &&
      accessContext.dataPermission.channelIds.includes(creative.channelId ?? ''),
  )

const allowedSubjectOptions = () =>
  adSubjectOptions.filter((subject) => accessContext.dataPermission.subjectTypes.includes(subject.value))

const allowedEventOptions = () =>
  adEventOptions.filter((event) => accessContext.dataPermission.subjectTypes.includes(event.subjectType))

const hasReportAccess = (report: AdAnalysisReport) => {
  if (report.status === 'deleted') return false
  const reportAllowedById =
    accessContext.dataPermission.reportIds.length === 0 ||
    accessContext.dataPermission.reportIds.includes(report.id)
  const userAllowed =
    accessContext.permissions.manageReport ||
    report.creatorId === currentUserId() ||
    report.authorizedUserIds.includes(currentUserId())
  const channelAllowed =
    report.channelIds.length === 0 ||
    report.channelIds.some((channelId) => accessContext.dataPermission.channelIds.includes(channelId))

  return reportAllowedById && userAllowed && channelAllowed
}

const visibleReports = () =>
  reports.filter(hasReportAccess)

const assertIdsAllowed = (label: string, selectedIds: string[], allowedIds: string[]) => {
  const unauthorized = selectedIds.filter((id) => !allowedIds.includes(id))
  if (unauthorized.length > 0) {
    throw new Error(`无权限查看${label}数据。`)
  }
}

const expandSelection = (selectedIds: string[], allowedIds: string[]) => {
  assertIdsAllowed('当前筛选项', selectedIds, allowedIds)
  return selectedIds.length > 0 ? selectedIds : allowedIds
}

const createDataPrerequisiteStatus = (): AdDataPrerequisiteStatus => {
  const missingItems: AdDataPrerequisiteStatus['missingItems'] = []
  if (!accessContext.dataFusionReady) missingItems.push('data_fusion')
  if (!accessContext.idMappingReady) missingItems.push('id_mapping')
  if (!accessContext.monitoringDataReady) missingItems.push('monitoring_data')

  return {
    projectId: accessContext.projectId,
    dataFusionReady: accessContext.dataFusionReady,
    idMappingReady: accessContext.idMappingReady,
    monitoringDataReady: accessContext.monitoringDataReady,
    missingItems,
  }
}

const assertQueryRuntimeReady = () => {
  const failure = getAdQueryFailure(accessContext)
  if (failure) throw new Error(failure.message)
}

const assertAdReportRuntimeReady = () => {
  const failure = getAdReportGateFailure(accessContext)
  if (failure) throw new Error(failure.message)
}

const assertTemplateMetricFormulas = (template: AdMetadataTemplate, selectedMetricIds?: string[]) => {
  const failure = validateTemplateMetricFormulas(template, selectedMetricIds)
  if (failure) throw new Error(failure.message)
}

const assertMediaEventsReady = (template: AdMetadataTemplate, eventNames: string[]) => {
  const failure = validateMediaEventChain(template, eventNames)
  if (failure) throw new Error(failure.message)
}

const createReferenceData = (): AdReferenceData => ({
  subjects: allowedSubjectOptions(),
  behaviorOptions: adBehaviorOptions,
  eventOptions: allowedEventOptions(),
  channels: allowedChannels(),
  advertisers: allowedAdvertisers(),
  adGroups: allowedAdGroups(),
  adPlans: allowedAdPlans(),
  adCreatives: allowedAdCreatives(),
})

const normalizeEffectQuery = (query: AdEffectQueryRequest): AdEffectQueryRequest => {
  const allowedChannelIds = allowedChannels().map((channel) => channel.id)
  const allowedAdvertiserIds = allowedAdvertisers().map((advertiser) => advertiser.id)
  const allowedGroupIds = allowedAdGroups().map((group) => group.id)
  const allowedPlanIds = allowedAdPlans().map((plan) => plan.id)
  const allowedCreativeIds = allowedAdCreatives().map((creative) => creative.id)

  return {
    ...query,
    channels: expandSelection(query.channels, allowedChannelIds),
    advertisers: expandSelection(query.advertisers, allowedAdvertiserIds),
    adGroups: expandSelection(query.adGroups, allowedGroupIds),
    adPlans: expandSelection(query.adPlans, allowedPlanIds),
    adCreatives: expandSelection(query.adCreatives, allowedCreativeIds),
  }
}

const normalizeMediaQuery = (query: AdMediaQueryRequest): AdMediaQueryRequest => ({
  ...query,
  channels: expandSelection(query.channels, allowedChannels().map((channel) => channel.id)),
})

const normalizeAdReportQuery = (query: AdReportQueryRequest): AdReportQueryRequest => ({
  ...query,
  mediaChannels: expandSelection(query.mediaChannels, allowedChannels().map((channel) => channel.id)),
  advertisers: expandSelection(query.advertisers, allowedAdvertisers().map((advertiser) => advertiser.id)),
  adGroups: expandSelection(query.adGroups, allowedAdGroups().map((group) => group.id)),
  adCreatives: expandSelection(query.adCreatives, allowedAdCreatives().map((creative) => creative.id)),
})

const assertCanUseReport = (reportId: string) => {
  const report = reports.find((item) => item.id === reportId)
  if (!report || !hasReportAccess(report)) {
    throw new Error('暂无广告投放分析权限，请联系项目管理员开通。')
  }
  return report
}

const assertReportPermission = (
  report: AdAnalysisReport,
  permission: 'downloadableUserIds' | 'exportableUserIds' | 'editableUserIds',
  message: string,
) => {
  if (accessContext.permissions.manageReport) return
  if (!report[permission].includes(currentUserId())) {
    throw new Error(message)
  }
}

const recordDataViewAudit = async (
  sourceConfig: Record<string, unknown>,
  ids: { reportId?: string, templateId?: string } = {},
) => {
  await persistAudit('查看广告主或渠道数据', sourceConfig, {
    ...ids,
    sourceType: 'ad_data_permission',
  })
}

const validateSegmentExportTarget = async (payload: AdExportSegmentPayload) => {
  const result = await requestOrMock<AdApiMutationResult>(
    `${SEGMENT_API_BASE}/export-targets/validate`,
    {
      method: 'POST',
      body: toJsonBody({
        source_type: payload.sourceType,
        output_id_type: payload.outputIdType,
        auth_targets: payload.authTargets,
        group_ids: payload.groupIds,
        estimated_users: payload.estimatedUsers,
      }),
    },
    () => {
      const validAuthTargets = ['运营组', '销售转化组', '项目管理员']
      const validGroupIds = ['ad_segments', 'high_intent', 'retargeting']
      const validOutputIdTypes = ['base_id', 'mobile', 'device_id', 'one_id']
      if (!validOutputIdTypes.includes(payload.outputIdType)) {
        throw new Error('输出 ID 类型不合法，请重新选择。')
      }
      if (payload.groupIds.length === 0 || payload.groupIds.some((groupId) => !validGroupIds.includes(groupId))) {
        throw new Error('分群分组不合法，请重新选择。')
      }
      if (payload.authTargets.some((target) => !validAuthTargets.includes(target))) {
        throw new Error('授权对象不合法，请重新选择。')
      }
      return resolveMock({ success: true })
    },
  )
  if (!result.success) {
    throw new Error(result.message ?? '用户分群模块校验未通过。')
  }
}

const applyAccessContextPatch = (patch: AdAccessContextPatch): AdAccessContext => ({
  ...accessContext,
  ...patch,
  permissions: {
    ...accessContext.permissions,
    ...(patch.permissions ?? {}),
  },
  dataPermission: {
    ...accessContext.dataPermission,
    ...(patch.dataPermission ?? {}),
  },
})

export const adAnalysisService = {
  getAccessContext: async (): Promise<AdAccessContext> => {
    const context = await requestOrMock<AdAccessContext>(
      `${API_BASE}/access/context`,
      { method: 'GET' },
      () => resolveMock(accessContext),
    )
    accessContext = { ...accessContext, ...context }
    return clone(accessContext)
  },
  getDataPrerequisites: (): Promise<AdDataPrerequisiteStatus> =>
    requestOrMock<AdDataPrerequisiteStatus>(
      `${DATA_FUSION_API_BASE}/ad-analysis/prerequisites`,
      { method: 'GET' },
      () => resolveMock(createDataPrerequisiteStatus()),
    ),
  getAccessDecision: async (): Promise<AdAccessDecision> =>
    requestOrMock<AdAccessDecision>(
      `${API_BASE}/access/decision`,
      { method: 'GET' },
      () => resolveMock(resolveAdAccessDecision(accessContext)),
    ),
  updateAccessContext: async (patch: AdAccessContextPatch): Promise<AdAccessContext> => {
    const context = await requestOrMock<AdAccessContext>(
      `${API_BASE}/access/context`,
      {
        method: 'PATCH',
        body: toJsonBody(patch),
      },
      () => resolveMock(applyAccessContextPatch(patch), 160),
    )
    accessContext = {
      ...accessContext,
      ...context,
      permissions: { ...accessContext.permissions, ...context.permissions },
      dataPermission: { ...accessContext.dataPermission, ...context.dataPermission },
    }
    return clone(accessContext)
  },
  getReferenceData: (): Promise<AdReferenceData> =>
    requestOrMock<AdReferenceData>(
      `${API_BASE}/reference-data`,
      { method: 'GET' },
      () => resolveMock(createReferenceData()),
    ),
  searchReports: (request: AdReportSearchRequest): Promise<AdReportSearchResponse> =>
    requestOrMock<AdReportSearchResponse>(
      `${API_BASE}/reports/search`,
      {
        method: 'POST',
        body: toJsonBody({
          keyword: request.keyword,
          report_type: request.reportType,
          creator_id: request.creatorId,
          page: request.page,
          page_size: request.pageSize,
        }),
      },
      () => {
    const keyword = request.keyword.trim().toLowerCase()
    const filtered = visibleReports().filter((report) => {
      const keywordMatched = !keyword || report.name.toLowerCase().includes(keyword)
      const typeMatched = request.reportType === 'all' || report.reportType === request.reportType
      const creatorMatched = !request.creatorId || report.creatorId === request.creatorId
      return keywordMatched && typeMatched && creatorMatched
    })
    const start = (request.page - 1) * request.pageSize
    return resolveMock({
      list: filtered.slice(start, start + request.pageSize),
      total: filtered.length,
      permissions: accessContext.permissions,
    })
      },
    ),
  listTemplates: (): Promise<AdMetadataTemplate[]> =>
    requestOrMock<AdMetadataTemplate[]>(
      `${API_BASE}/templates`,
      { method: 'GET' },
      () => resolveMock(templates.filter((template) => template.status !== 'deleted')),
    ),
  getTemplate: (templateId: string): Promise<AdMetadataTemplate | undefined> =>
    requestOrMock<AdMetadataTemplate | undefined>(
      `${API_BASE}/templates/${templateId}`,
      { method: 'GET' },
      () => resolveMock(templates.find((template) => template.id === templateId && template.status !== 'deleted')),
    ),
  getReport: (reportId: string): Promise<AdAnalysisReport | undefined> =>
    requestOrMock<AdAnalysisReport | undefined>(
      `${API_BASE}/reports/${reportId}`,
      { method: 'GET' },
      () => resolveMock(reports.find((report) => report.id === reportId && hasReportAccess(report))),
    ),
  createTemplate: async (payload: AdTemplateSavePayload): Promise<AdMetadataTemplate> => {
    const validation = validateTemplatePayload(payload)
    if (!validation.valid) throw new Error(validation.message)
    const created = await requestOrMock<AdMetadataTemplate>(
      `${API_BASE}/templates`,
      {
        method: 'POST',
        body: toJsonBody({
          name: payload.name,
          subject_type: payload.subjectType,
          description: payload.description,
          behavior_event_config: payload.behaviorEventConfig,
          metric_config: payload.metricConfig,
        }),
      },
      async () => {
    const templateId = createId('tpl')
    const normalizedEvents = payload.behaviorEventConfig.map((event, index) => ({
      ...event,
      id: event.id || createId('evt'),
      templateId,
      orderIndex: index + 1,
      displayName: event.displayName.trim(),
    }))
    const template: AdMetadataTemplate = {
      id: templateId,
      name: payload.name.trim(),
      subjectType: payload.subjectType,
      description: payload.description.trim(),
      status: 'enabled',
      creatorId: currentUserId(),
      creatorName: currentUserName(),
      createdAt: now(),
      updatedAt: now(),
      behaviorEventConfig: normalizedEvents,
      metricConfig: payload.metricConfig.map((metric) => ({
        ...metric,
        id: metric.id || createId('metric'),
        templateId,
      })),
    }
    templates.unshift(template)
        return resolveMock(template)
      },
    )
    await persistAudit('新建广告元数据模板', { name: created.name }, { templateId: created.id, entityId: created.id, entityName: created.name })
    return created
  },
  updateTemplate: async (payload: AdTemplateSavePayload): Promise<AdMetadataTemplate> => {
    const validation = validateTemplatePayload(payload)
    if (!validation.valid) throw new Error(validation.message)
    if (!payload.id) throw new Error('模板不存在。')
    const updated = await requestOrMock<AdMetadataTemplate>(
      `${API_BASE}/templates/${payload.id}`,
      {
        method: 'PUT',
        body: toJsonBody({
          name: payload.name,
          subject_type: payload.subjectType,
          description: payload.description,
          behavior_event_config: payload.behaviorEventConfig,
          metric_config: payload.metricConfig,
        }),
      },
      async () => {
    const index = templates.findIndex((template) => template.id === payload.id)
    if (index < 0) throw new Error('模板不存在。')
    const existing = templates[index]
    if (!existing) throw new Error('模板不存在。')
    const templateId = payload.id as string
    const updated: AdMetadataTemplate = {
      ...existing,
      name: payload.name.trim(),
      subjectType: payload.subjectType,
      description: payload.description.trim(),
      updatedAt: now(),
      behaviorEventConfig: payload.behaviorEventConfig.map((event, eventIndex) => ({
        ...event,
        id: event.id || createId('evt'),
        templateId,
        orderIndex: eventIndex + 1,
        displayName: event.displayName.trim(),
      })),
      metricConfig: payload.metricConfig.map((metric) => ({
        ...metric,
        id: metric.id || createId('metric'),
        templateId,
      })),
    }
    templates.splice(index, 1, updated)
    reports = reports.map((report) =>
      report.templateId === templateId ? { ...report, templateName: updated.name } : report,
    )
        return resolveMock(updated)
      },
    )
    await persistAudit('编辑广告元数据模板', { name: updated.name }, { templateId: updated.id, entityId: updated.id, entityName: updated.name })
    return updated
  },
  deleteTemplate: async (templateId: string): Promise<boolean> => {
    const result = await requestOrMock<boolean>(
      `${API_BASE}/templates/${templateId}`,
      { method: 'DELETE' },
      async () => {
    templates = templates.map((template) =>
      template.id === templateId ? { ...template, status: 'deleted', updatedAt: now() } : template,
    )
        return resolveMock(true)
      },
    )
    await persistAudit('删除广告元数据模板', {}, { templateId, entityId: templateId })
    return result
  },
  generateSystemMetrics: (templateId: string, events: AdBehaviorEventConfig[]): Promise<AdMetricConfig[]> =>
    requestOrMock<AdMetricConfig[]>(
      `${API_BASE}/templates/${templateId}/metrics/generate`,
      {
        method: 'POST',
        body: toJsonBody({ behavior_event_config: events }),
      },
      () => resolveMock(buildSystemMetrics(templateId, events)),
    ),
  validateFormula: (formula: string, variables: string[]) =>
    requestOrMock<AdValidationResult>(
      `${API_BASE}/metrics/formula/validate`,
      {
        method: 'POST',
        body: toJsonBody({ formula, variables }),
      },
      () => resolveMock(validateAdMetricFormula(formula, variables), 80),
    ),
  saveReport: async (payload: AdReportSavePayload): Promise<AdAnalysisReport> => {
    const validation = validateReportPayload(payload)
    if (!validation.valid) throw new Error(validation.message)
    if (payload.id) {
      const existingReport = assertCanUseReport(payload.id)
      assertReportPermission(existingReport, 'editableUserIds', '暂无编辑该广告分析报告的权限。')
      if (existingReport.reportType !== payload.reportType) {
        throw new Error('报告创建后不允许修改报告类型。')
      }
    }
    const endpoint = payload.id ? `${API_BASE}/reports/${payload.id}` : `${API_BASE}/reports`
    const saved = await requestOrMock<AdAnalysisReport>(
      endpoint,
      {
        method: payload.id ? 'PUT' : 'POST',
        body: toJsonBody({
          name: payload.name,
          template_id: payload.templateId,
          report_type: payload.reportType,
          default_time_range: payload.defaultTimeRange,
        }),
      },
      async () => {
    const editing = Boolean(payload.id)
    const reportId = payload.id || createId('rpt')
    const templateName = getTemplateName(payload.templateId)
    const nextReport: AdAnalysisReport = {
      id: reportId,
      name: payload.name.trim(),
      templateId: payload.templateId,
      templateName,
      reportType: payload.reportType,
      defaultTimeRange: payload.defaultTimeRange,
      channelIds: allowedChannels().map((channel) => channel.id),
      creatorId: currentUserId(),
      creatorName: currentUserName(),
      authorizedUserIds: [currentUserId()],
      editableUserIds: [currentUserId()],
      downloadableUserIds: [currentUserId()],
      exportableUserIds: [currentUserId()],
      createdAt: editing
        ? reports.find((report) => report.id === reportId)?.createdAt ?? now()
        : now(),
      updatedAt: now(),
      status: 'enabled',
    }

    if (editing) {
      const index = reports.findIndex((report) => report.id === reportId)
      if (index < 0) throw new Error('报告不存在。')
      reports.splice(index, 1, nextReport)
    } else {
      reports.unshift(nextReport)
    }

        return resolveMock(nextReport)
      },
    )
    await persistAudit(
      payload.id ? '编辑广告分析报告' : '新建广告分析报告',
      { name: saved.name, report_type: saved.reportType },
      { reportId: saved.id, templateId: saved.templateId, entityId: saved.id, entityName: saved.name },
    )
    return saved
  },
  deleteReport: (reportId: string): Promise<boolean> => {
    const report = assertCanUseReport(reportId)
    assertReportPermission(report, 'editableUserIds', '暂无删除该广告分析报告的权限。')
    return requestOrMock<boolean>(
      `${API_BASE}/reports/${reportId}`,
      { method: 'DELETE' },
      async () => {
        reports = reports.map((report) =>
          report.id === reportId ? { ...report, status: 'deleted', updatedAt: now() } : report,
        )
        return resolveMock(true)
      },
    ).then(async (result) => {
      await persistAudit('删除广告分析报告', {}, { reportId, entityId: reportId })
      return result
    })
  },
  queryEffect: async (query: AdEffectQueryRequest): Promise<AdEffectResult> => {
    assertQueryRuntimeReady()
    const dateValidation = validateDateRange(query.timeRange.start, query.timeRange.end)
    if (!dateValidation.valid) throw new Error(dateValidation.message)
    const normalizedQuery = normalizeEffectQuery(query)
    const report = assertCanUseReport(query.reportId)
    const template = templates.find((item) => item.id === report?.templateId)
    if (!template || template.status !== 'enabled') {
      throw new Error('当前报告引用的广告元数据模板已失效，无法继续查询。')
    }
    assertTemplateMetricFormulas(template, normalizedQuery.selectedMetricIds)
    await recordDataViewAudit(
      {
        channels: normalizedQuery.channels,
        advertisers: normalizedQuery.advertisers,
        ad_groups: normalizedQuery.adGroups,
        ad_plans: normalizedQuery.adPlans,
        ad_creatives: normalizedQuery.adCreatives,
      },
      { reportId: query.reportId, templateId: template.id },
    )
    const result = await requestOrMock<AdEffectResult>(
      `${API_BASE}/reports/${query.reportId}/effect/query`,
      {
        method: 'POST',
        body: toJsonBody({
          aggregate_dimensions: normalizedQuery.aggregateDimensions,
          channels: normalizedQuery.channels,
          advertisers: normalizedQuery.advertisers,
          ad_groups: normalizedQuery.adGroups,
          ad_plans: normalizedQuery.adPlans,
          ad_creatives: normalizedQuery.adCreatives,
          time_range: normalizedQuery.timeRange,
          crowd_filter: normalizedQuery.crowdFilter,
          selected_metrics: normalizedQuery.selectedMetricIds,
        }),
      },
      () => {
        const selectedMetrics = template.metricConfig.filter((metric) => normalizedQuery.selectedMetricIds.includes(metric.id))
        return resolveMock(createAdEffectResult(normalizedQuery, selectedMetrics), 520)
      },
    )
    await persistAudit('查询广告数据', normalizedQuery as unknown as Record<string, unknown>, {
      reportId: query.reportId,
      templateId: template.id,
      requestId: result.queryId,
      sourceType: 'effect_query',
    })
    return result
  },
  queryMedia: async (query: AdMediaQueryRequest): Promise<AdMediaResult> => {
    assertQueryRuntimeReady()
    if (query.channels.length === 0) throw new Error('请选择投放渠道。')
    const dateValidation = validateDateRange(query.timeRange.start, query.timeRange.end)
    if (!dateValidation.valid) throw new Error(dateValidation.message)
    if (!query.startEvent || !query.endEvent) throw new Error('请选择起点事件和终止事件。')
    const nodes = [query.startEvent, ...query.middleEvents, query.endEvent]
    if (new Set(nodes).size !== nodes.length) {
      throw new Error('起点、终点、中间节点不能完全重复。')
    }
    const normalizedQuery = normalizeMediaQuery(query)
    const report = assertCanUseReport(query.reportId)
    const template = templates.find((item) => item.id === report?.templateId)
    if (!template || template.status !== 'enabled') {
      throw new Error('当前报告引用的广告元数据模板已失效，无法继续查询。')
    }
    assertMediaEventsReady(template, nodes)
    await recordDataViewAudit({ channels: normalizedQuery.channels }, { reportId: query.reportId, templateId: template.id })
    const result = await requestOrMock<AdMediaResult>(
      `${API_BASE}/reports/${query.reportId}/media/query`,
      {
        method: 'POST',
        body: toJsonBody({
          channels: normalizedQuery.channels,
          time_range: normalizedQuery.timeRange,
          start_event: normalizedQuery.startEvent,
          end_event: normalizedQuery.endEvent,
          middle_events: normalizedQuery.middleEvents,
          crowd_filter: normalizedQuery.crowdFilter,
          conversion_steps: normalizedQuery.conversionSteps,
          frequency_event: normalizedQuery.frequencyEvent,
          overlap_event: normalizedQuery.overlapEvent,
        }),
      },
      () => resolveMock(createAdMediaResult(normalizedQuery), 520),
    )
    await persistAudit('查询广告数据', normalizedQuery as unknown as Record<string, unknown>, {
      reportId: query.reportId,
      templateId: template.id,
      requestId: result.queryId,
      sourceType: 'media_query',
    })
    return result
  },
  queryAdReport: async (query: AdReportQueryRequest): Promise<AdReportResult> => {
    assertAdReportRuntimeReady()
    const dateValidation = validateDateRange(query.timeRange.start, query.timeRange.end)
    if (!dateValidation.valid) throw new Error(dateValidation.message)
    const normalizedQuery = normalizeAdReportQuery(query)
    await recordDataViewAudit({
      channels: normalizedQuery.mediaChannels,
      advertisers: normalizedQuery.advertisers,
      ad_groups: normalizedQuery.adGroups,
      ad_creatives: normalizedQuery.adCreatives,
    })
    const result = await requestOrMock<AdReportResult>(
      `${API_BASE}/ad-report/query`,
      {
        method: 'POST',
        body: toJsonBody({
          media_channel: normalizedQuery.mediaChannels,
          advertiser: normalizedQuery.advertisers,
          ad_group: normalizedQuery.adGroups,
          ad_creative: normalizedQuery.adCreatives,
          time_range: normalizedQuery.timeRange,
          metric: normalizedQuery.metric,
        }),
      },
      () => resolveMock(createAdReportResult(normalizedQuery), 520),
    )
    await persistAudit('查询广告数据', normalizedQuery as unknown as Record<string, unknown>, {
      requestId: result.queryId,
      sourceType: 'ad_report_query',
    })
    return result
  },
  exportSegment: async (payload: AdExportSegmentPayload): Promise<AdExportSegmentResult> => {
    if (!accessContext.permissions.createSegment) throw new Error('暂无分群创建权限，请联系项目管理员开通。')
    if (!payload.outputIdType) throw new Error('请选择输出 ID 类型。')
    if (!payload.segmentName.trim()) throw new Error('请输入分群名称。')
    if (payload.estimatedUsers <= 0) throw new Error('当前规则下暂无可导出用户，无法生成分群。')
    const report = payload.reportId ? assertCanUseReport(payload.reportId) : undefined
    if (report) {
      assertReportPermission(report, 'exportableUserIds', '暂无从该报告导出分群的权限。')
    }
    await validateSegmentExportTarget(payload)
    const endpoint = payload.reportId
      ? `${API_BASE}/reports/${payload.reportId}/export-segment`
      : `${API_BASE}/ad-report/export-segment`
    const result = await requestOrMock<AdExportSegmentResult>(
      endpoint,
      {
        method: 'POST',
        body: toJsonBody({
          source_type: payload.sourceType,
          source_name: payload.sourceName,
          source_config: payload.sourceConfig,
          output_id_type: payload.outputIdType,
          segment_name: payload.segmentName,
          description: payload.description,
          auth_targets: payload.authTargets,
          group_ids: payload.groupIds,
          estimated_users: payload.estimatedUsers,
        }),
      },
      () => resolveMock({
        segmentId: createId('seg'),
        segmentName: payload.segmentName.trim(),
        createdAt: now(),
      }, 420),
    )
    if (useMockBackend()) {
      createSegmentFromAdAnalysisExport({
        id: result.segmentId,
        name: result.segmentName,
        description: payload.description,
        outputIdType: payload.outputIdType,
        count: payload.estimatedUsers,
        groupIds: payload.groupIds,
        authTargets: payload.authTargets,
        creator: {
          id: currentUserId(),
          name: currentUserName(),
          department: '广告投放分析',
        },
        sourceReportId: payload.reportId,
        sourceReportName: report?.name ?? '广告投放报表',
        sourceType: payload.sourceType,
        sourceName: payload.sourceName,
        sourceConfig: payload.sourceConfig,
      })
    }
    await persistAudit('导出分群', payload.sourceConfig, {
      reportId: payload.reportId,
      templateId: report?.templateId,
      entityId: result.segmentId,
      entityName: result.segmentName,
      sourceType: payload.sourceType,
    })
    return result
  },
  createDownloadTask: async (request: AdDownloadRequest): Promise<AdDownloadResult> => {
    if (!accessContext.permissions.downloadData) throw new Error('暂无数据下载权限，请联系项目管理员开通。')
    assertQueryRuntimeReady()
    if (request.rows.length === 0) {
      throw new Error('当前条件下暂无广告数据，请调整筛选条件或确认数据是否已接入。')
    }
    const report = request.reportId ? assertCanUseReport(request.reportId) : undefined
    if (report) {
      assertReportPermission(report, 'downloadableUserIds', '暂无下载该报告数据的权限。')
    }
    const sourceConfig = { source: request.source, ...request.sourceConfig }
    const endpoint = request.reportId
      ? `${API_BASE}/reports/${request.reportId}/downloads`
      : `${API_BASE}/downloads`
    const result = await requestOrMock<AdDownloadResult>(
      endpoint,
      {
        method: 'POST',
        body: toJsonBody({
          source: request.source,
          source_config: sourceConfig,
          report_id: request.reportId,
          format: 'xlsx',
        }),
      },
      () => resolveMock({
        taskId: createId('download'),
        fileName: buildAdDownloadFileName(request.source, new Date().toISOString().slice(0, 19)),
        fileUrl: createXlsxDataUrl(request.rows),
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        rowCount: request.rows.length,
        createdAt: now(),
        expiresAt: new Date(Date.now() + 3_600_000).toISOString().slice(0, 19).replace('T', ' '),
      }, 260),
    )
    await persistAudit('下载明细数据', sourceConfig, {
      reportId: request.reportId,
      templateId: report?.templateId,
      sourceType: 'download',
      entityId: result.taskId,
      entityName: result.fileName,
    })
    return result
  },
  recordDownload: async (source: string, config: Record<string, unknown>, reportId?: string): Promise<boolean> => {
    if (!accessContext.permissions.downloadData) throw new Error('暂无数据下载权限，请联系项目管理员开通。')
    const report = reportId ? assertCanUseReport(reportId) : undefined
    if (report) {
      assertReportPermission(report, 'downloadableUserIds', '暂无下载该报告数据的权限。')
    }
    const sourceConfig = { source, ...config }
    const result = await requestOrMock<AdApiMutationResult>(
      `${API_BASE}/downloads/audit`,
      {
        method: 'POST',
        body: toJsonBody({
          source,
          source_config: sourceConfig,
          report_id: reportId,
        }),
      },
      () => resolveMock({ success: true }),
    )
    await persistAudit('下载明细数据', sourceConfig, {
      reportId,
      templateId: report?.templateId,
      sourceType: 'download',
    })
    return result.success
  },
  recordMetricCreated: (metric: AdMetricConfig, templateId: string): Promise<void> =>
    persistAudit(
      '新建广告指标',
      {
        metric_name: metric.name,
        metric_type: metric.metricType,
        creator_type: metric.creatorType,
        formula: metric.formula,
      },
      {
        templateId,
        entityId: metric.id,
        entityName: metric.name,
        sourceType: 'metric_config',
      },
    ),
  recordMetricRemoved: (metric: AdMetricConfig, templateId: string): Promise<void> =>
    persistAudit(
      '移除广告指标',
      {
        metric_name: metric.name,
        metric_type: metric.metricType,
        creator_type: metric.creatorType,
      },
      {
        templateId,
        entityId: metric.id,
        entityName: metric.name,
        sourceType: 'metric_config',
      },
    ),
  listAuditLogs: (): Promise<AdAuditLog[]> =>
    requestOrMock<AdAuditLog[]>(
      `${API_BASE}/audit-logs?limit=20`,
      { method: 'GET' },
      () => resolveMock(auditLogs.slice(0, 20)),
    ),
}
