import {
  segmentAuthorizations,
  segmentAuthorizationPrincipals,
  segmentBackendContracts,
  segmentConditionCatalog,
  segmentFeatureFlags,
  segmentGroups,
  segmentIdTypes,
  segmentLineageNodes,
  segmentPermissionSet,
  segmentRunRecords,
  segments,
  segmentSubjects,
  segmentTemplates,
  segmentVersions,
  userSegments,
} from '@/mock/segments'
import type { EntityId, Owner } from '@/types/common'
import type {
  SegmentAuthorization,
  SegmentAuthorizationPrincipal,
  SegmentCreateMethod,
  SegmentCreatePayload,
  SegmentDownloadFormat,
  SegmentDownloadRequest,
  SegmentEncryptionType,
  SegmentExportFile,
  SegmentGroup,
  SegmentLineageNode,
  SegmentLineageAssetType,
  SegmentLineageDirection,
  SegmentPrincipalType,
  SegmentRecord,
  SegmentRuleConfig,
  SegmentRunRecord,
  SegmentRunStatus,
  SegmentRunType,
  SegmentScheduleConfig,
  SegmentServiceConfig,
  SegmentSplitPackageDraft,
  SegmentSplitPreviewRow,
  SegmentStatus,
  SegmentTemplate,
  SegmentType,
  SegmentUpdateMode,
  SegmentUploadParseResult,
  SegmentVersion,
  UserSegment,
} from '@/types/segment'

const clone = <T>(payload: T): T => (payload === undefined ? payload : (JSON.parse(JSON.stringify(payload)) as T))

const resolveMock = <T>(payload: T, delay = 160): Promise<T> =>
  new Promise((resolve) => {
    globalThis.setTimeout(() => resolve(clone(payload)), delay)
  })

const now = (): string => new Date().toISOString()

const today = (): string => new Date().toISOString().slice(0, 10)

const makeId = (prefix: string): string => `${prefix}-${Date.now()}-${Math.round(Math.random() * 10000)}`

const currentUser = {
  id: 'u-xucheng',
  name: '许澄',
  department: '用户洞察团队',
}

const csvEscape = (value: unknown): string => {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

const toCsv = (headers: string[], rows: Array<Array<unknown>>): string =>
  [headers.map(csvEscape).join(','), ...rows.map((row) => row.map(csvEscape).join(','))].join('\n')

const stableHash = (value: string): string => {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}

const protectId = (value: string, request: SegmentDownloadRequest): string => {
  if (request.encrypted) {
    return `enc_${stableHash(value)}_${stableHash(`${request.description}:${value}`)}`
  }
  if (request.masked) {
    return `${value.slice(0, 3)}****${value.slice(-4)}`
  }
  return value
}

const cloneRule = (rule?: SegmentRuleConfig): SegmentRuleConfig => clone(rule ?? defaultRule())

const flattenOneIdFilters = (payload: SegmentCreatePayload) =>
  payload.oneIdFilterGroups.length
    ? payload.oneIdFilterGroups.flatMap((group) => group.filters)
    : payload.oneIdFilters

export interface SegmentFromMultiDimPayload {
  id: EntityId
  name: string
  description: string
  subjectType: string
  subjectName: string
  outputIdType: string
  count: number
  groupIds: EntityId[]
  authObjects: Array<{ type: SegmentPrincipalType; id: EntityId; name: string }>
  creator: Owner
  sourceReportId: EntityId
  sourceReportName: string
  selectedComboIds: EntityId[]
  exportType: 'positive_sample' | 'expanded_population'
  comboRelation: 'any' | 'all'
}

export interface SegmentFromLifecyclePayload {
  id: EntityId
  name: string
  description: string
  subjectType: string
  subjectName: string
  outputIdType: string
  count: number
  groupIds: EntityId[]
  authObjects: Array<{ type: SegmentPrincipalType; id: EntityId; name: string }>
  creator: Owner
  sourceReportId: EntityId
  sourceReportName: string
  sourceType: string
  sourceName: string
  crowdRange: string
  stageNames: string[]
  timeRange: [string, string]
  updateMode: 'on_demand' | 'daily'
  sourceConfig?: Record<string, unknown>
}

export interface SegmentFromAdAnalysisPayload {
  id: EntityId
  name: string
  description: string
  outputIdType: string
  count: number
  groupIds: EntityId[]
  authTargets: string[]
  creator: Owner
  sourceReportId?: EntityId
  sourceReportName: string
  sourceType: string
  sourceName: string
  sourceConfig: Record<string, unknown>
}

export const segmentTypeLabels: Record<SegmentType, string> = {
  rule: '规则创建',
  upload: '上传分群',
  advanced_manual: '高级人工分群',
  subject_convert: '主体转换',
  multi_subject: '多主体圈选',
  split_child: '拆包子包',
}

export const segmentStatusLabels: Record<SegmentStatus, string> = {
  pending: '待计算',
  waiting: '等待依赖',
  running: '计算中',
  success: '成功',
  failed: '失败',
  expired: '已过期',
  deleted: '已删除',
}

export const segmentStatusTagTypes: Record<SegmentStatus, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  pending: 'default',
  waiting: 'warning',
  running: 'info',
  success: 'success',
  failed: 'error',
  expired: 'warning',
  deleted: 'default',
}

export const segmentRunStatusLabels: Record<SegmentRunStatus, string> = {
  success: '成功',
  failed: '失败',
  running: '运行中',
  waiting: '等待中',
}

export const segmentRunTypeLabels: Record<SegmentRunType, string> = {
  manual: '手动更新',
  daily: '按天更新',
  scheduled: '到点更新',
  initial: '创建初始化',
  split: '拆包任务',
  subject_convert: '主体转换',
  upload_replace: '上传覆盖',
  manual_change: '人工变更',
}

export const segmentUpdateModeLabels: Record<SegmentUpdateMode, string> = {
  manual: '按需更新',
  daily: '按天更新',
  scheduled: '到点更新',
}

export const segmentEncryptionLabels: Record<SegmentEncryptionType, string> = {
  none: '不加密',
  sha256: 'SHA256',
  sm3: 'SM3',
  md5: 'MD5',
}

export const segmentLineageAssetLabels: Record<SegmentLineageAssetType, string> = {
  tag: '标签',
  segment: '分群',
  data_source: '数据源',
  relation_model: '关系模型',
  analysis: '分析资产',
  api: 'API 服务',
  campaign: '触达任务',
  experiment: '实验',
}

export const segmentLineageDirectionLabels: Record<SegmentLineageDirection, string> = {
  upstream: '上游依赖',
  downstream: '下游应用',
}

const syncGroupCounts = (): void => {
  segmentGroups.forEach((group) => {
    group.segmentCount = segments.filter((segment) => segment.status !== 'deleted' && segment.groupIds.includes(group.id)).length
    group.updatedAt = group.updatedAt || now()
  })
}

const getSubjectName = (subjectId: EntityId): string => segmentSubjects.find((item) => item.id === subjectId)?.name ?? '用户'

const defaultDependency = (): SegmentScheduleConfig['dependency'] => ({
  mode: 'recommended',
  dependencies: [
    { id: 'dep-user-id', name: '用户 OneID 映射任务', type: 'id_task', ready: true },
    { id: 'dep-tag-daily', name: '标签离线日更任务', type: 'tag_task', ready: true },
  ],
})

const defaultSchedule = (): SegmentScheduleConfig => ({
  updateMode: 'manual',
  scheduledHours: [],
  dependency: defaultDependency(),
})

const defaultRule = (): SegmentCreatePayload['rule'] => ({
  computeMode: 'offline',
  subjectMode: 'single',
  satisfyLogic: 'and',
  satisfyGroups: [
    {
      id: makeId('rule-group'),
      name: '条件组1',
      logic: 'and',
      conditions: [
        {
          id: makeId('condition'),
          source: 'tag',
          sourceName: '活跃标签',
          field: 'active_days_7d',
          label: '近 7 日活跃天数',
          operator: 'greater_than',
          value: 3,
          timeRange: '最近 7 天',
        },
      ],
    },
  ],
})

const inferSegmentType = (method: SegmentCreatePayload['method']): SegmentType => {
  if (method === 'rule') {
    return 'rule'
  }

  if (method === 'upload') {
    return 'upload'
  }

  if (method === 'advanced_manual') {
    return 'advanced_manual'
  }

  if (method === 'multi_subject') {
    return 'multi_subject'
  }

  return 'subject_convert'
}

const validateCreatePayload = (payload: SegmentCreatePayload, options: { requireCreatePermission?: boolean } = { requireCreatePermission: true }): string => {
  if (options.requireCreatePermission !== false && !segmentPermissionSet.createSegment) {
    return '暂无创建分群权限，请联系项目管理员开通。'
  }

  if (!payload.name.trim()) {
    return '分群名称不能为空。'
  }

  if (payload.name.trim().length > 100) {
    return '分群名称不能超过 100 个字符。'
  }

  if (!payload.subjectId) {
    return '请选择分群主体。'
  }

  if (!payload.outputIdType) {
    return '请选择输出 ID 类型。'
  }

  const outputIdType = payload.upload?.outputIdType || payload.outputIdType
  const outputOption = segmentIdTypes.find((item) => item.id === outputIdType)
  const expectedSubjectId = payload.method === 'subject_convert' ? payload.subjectConversion?.targetSubjectId : payload.subjectId
  if (outputOption && expectedSubjectId && outputOption.subjectId !== expectedSubjectId) {
    return '输出 ID 类型必须属于当前输出主体。'
  }

  if (payload.ttlDays < 1 || payload.ttlDays > 730) {
    return 'TTL 必须在 1-730 天之间。'
  }

  if (payload.sampling.enabled && (!payload.sampling.keepCount || payload.sampling.keepCount <= 0 || !Number.isInteger(payload.sampling.keepCount))) {
    return '抽样保留数量必须为正整数。'
  }

  if (payload.method === 'rule' && !payload.rule.satisfyGroups.some((group) => group.conditions.length > 0)) {
    return '请至少配置一个满足条件。'
  }

  for (const group of payload.oneIdFilterGroups) {
    for (const filter of group.filters) {
      if (!filter.profileType.trim()) {
        return 'OneID 子档案过滤的档案类型必填。'
      }
      if (!filter.field.trim()) {
        return 'OneID 子档案过滤的字段必填。'
      }
      if (!filter.operator) {
        return 'OneID 子档案过滤的运算符必填。'
      }
      if (!['has_value', 'no_value'].includes(filter.operator) && !filter.value.trim()) {
        return 'OneID 子档案过滤当前运算符需要填写值。'
      }
    }
  }

  if ((payload.method === 'upload' || payload.method === 'advanced_manual') && !payload.upload?.latestFileName) {
    return '请先上传并解析分群文件。'
  }

  if (payload.schedule.updateMode === 'scheduled' && !payload.schedule.scheduledHours.length) {
    return '到点更新至少需要选择 1 个执行时间。'
  }

  if (payload.schedule.updateMode === 'daily' && payload.schedule.dailyTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(payload.schedule.dailyTime)) {
    return '按天执行时间格式应为 HH:mm。'
  }

  if (payload.schedule.startDate && payload.schedule.endDate && payload.schedule.startDate > payload.schedule.endDate) {
    return '有效更新周期的起始日期不能晚于终止日期。'
  }

  if (payload.method === 'subject_convert') {
    const config = payload.subjectConversion
    if (!config?.sourceSegmentId) {
      return '请选择需要转换的分群文件。'
    }
    if (!config.targetSubjectId) {
      return '请选择输出主体。'
    }
    if (config.sourceSubjectId === config.targetSubjectId) {
      return '输出主体不能等于源主体。'
    }
    if (!config.relationModelId) {
      return '请选择关系模型。'
    }
  }

  if (payload.method === 'multi_subject') {
    const config = payload.multiSubject
    if (!config || config.participantSubjectIds.length < 2) {
      return '多主体圈选至少选择 2 个主体。'
    }
    if (config.participantSubjectIds.length > 3) {
      return '多主体圈选最多支持 3 个主体。'
    }
    if (!config.participantSubjectIds.includes(config.targetSubjectId)) {
      return '目标输出主体必须属于参与主体。'
    }
    if (!config.relations.length) {
      return '请选择主体关系模型。'
    }
  }

  return ''
}

export const buildDefaultCreatePayload = (method: SegmentCreateMethod | 'subject_convert' = 'rule'): SegmentCreatePayload => ({
  method,
  name: method === 'subject_convert' ? '主体转换分群' : method === 'multi_subject' ? '多主体圈选分群' : '',
  description: '',
  subjectId: 'subject-user',
  outputIdType: 'oneid',
  encryptionType: 'none',
  groupIds: [],
  authorizationIds: [],
  ttlDays: 32,
  rule: defaultRule(),
  oneIdFilters: [],
  oneIdFilterLogic: 'and',
  oneIdFilterGroups: [],
  sampling: { enabled: false, systemLimit: 3000000 },
  schedule: defaultSchedule(),
  upload: method === 'upload' || method === 'advanced_manual'
    ? {
        inputIdType: 'oneid',
        outputIdType: 'oneid',
        matchAllUsers: method === 'advanced_manual',
        allowOneIdAutoIncrement: false,
        changeMode: method === 'advanced_manual' ? 'replace' : undefined,
        changeSource: method === 'advanced_manual' ? 'file' : undefined,
      }
    : undefined,
  multiSubject: method === 'multi_subject'
    ? {
        targetSubjectId: 'subject-user',
        participantSubjectIds: ['subject-user', 'subject-store'],
        relations: [
          {
            sourceSubjectId: 'subject-user',
            targetSubjectId: 'subject-store',
            relationModelId: 'rel-user-store-visit',
            relationModelName: '用户-门店到访关系',
            direction: 'forward',
            condition: '最近 30 天到访 >= 1',
          },
        ],
        subjectRules: {
          'subject-user': defaultRule(),
          'subject-store': defaultRule(),
        },
        downloadScope: 'target_only',
      }
    : undefined,
  subjectConversion: method === 'subject_convert'
    ? {
        sourceSegmentId: 'segment-premium-vehicles',
        sourceSubjectId: 'subject-vehicle',
        targetSubjectId: 'subject-user',
        relationModelId: 'rel-vehicle-owner',
        relationModelName: '车辆-用户购买关系',
        direction: 'reverse',
        condition: '当前有效车主',
      }
    : undefined,
})

export const getSegmentWorkbenchData = () => {
  syncGroupCounts()
  return resolveMock({
    permissions: segmentPermissionSet,
    featureFlags: segmentFeatureFlags,
    subjects: segmentSubjects,
    idTypes: segmentIdTypes,
    groups: segmentGroups,
    segments: segments.filter((segment) => segment.status !== 'deleted' && !segment.physicalDeleted),
    authorizations: segmentAuthorizations,
    templates: segmentTemplates,
    authorizationPrincipals: segmentAuthorizationPrincipals,
    conditionCatalog: segmentConditionCatalog,
    backendContracts: segmentBackendContracts,
  })
}

export const getSegmentById = (segmentId: EntityId): Promise<SegmentRecord | undefined> =>
  resolveMock(segments.find((segment) => segment.id === segmentId && !segment.physicalDeleted))

export const getSegmentVersions = (segmentId: EntityId): Promise<SegmentVersion[]> =>
  resolveMock(segmentVersions.filter((version) => version.segmentId === segmentId))

export const getSegmentRunRecords = (segmentId: EntityId): Promise<SegmentRunRecord[]> =>
  resolveMock(segmentRunRecords.filter((record) => record.segmentId === segmentId))

export const getSegmentLineage = (segmentId: EntityId): Promise<SegmentLineageNode[]> =>
  resolveMock(segmentLineageNodes.filter((node) => node.segmentId === segmentId))

export const estimateSegment = (payload: SegmentCreatePayload): Promise<{ baseCount: number; idTypeCounts: Record<string, number>; coverageRate: number; failedReason?: string }> => {
  if ((payload.method === 'upload' || payload.method === 'advanced_manual') && payload.upload?.latestParseResult) {
    const baseCount = payload.upload.latestParseResult.matchedIds
    return resolveMock({
      baseCount,
      idTypeCounts: {
        [payload.upload.outputIdType]: baseCount,
        oneid: baseCount,
        mobile: Math.round(baseCount * 0.78),
      },
      coverageRate: Number(((baseCount / 538000) * 100).toFixed(2)),
    }, 240)
  }

  const rules = payload.method === 'multi_subject' && payload.multiSubject
    ? Object.values(payload.multiSubject.subjectRules)
    : [payload.rule]
  const hasRealtimeIssue = rules.some((rule) =>
    rule.computeMode === 'realtime' && rule.satisfyGroups.some((group) => group.conditions.some((condition) => condition.source === 'detail' || condition.source === 'segment')),
  )
  if (hasRealtimeIssue) {
    return resolveMock({
      baseCount: 0,
      idTypeCounts: {},
      coverageRate: 0,
      failedReason: '当前条件不支持实时分群，请调整条件或切换为离线分群。',
    })
  }

  const conditionCount = rules.reduce((sum, rule) => sum + rule.satisfyGroups.reduce((inner, group) => inner + group.conditions.length, 0), 0)
  const relationPenalty = payload.method === 'multi_subject' ? (payload.multiSubject?.participantSubjectIds.length ?? 1) * 7200 : 0
  const conversionPenalty = payload.method === 'subject_convert' ? 13800 : 0
  const oneIdFilterCount = flattenOneIdFilters(payload).length
  const oneIdGroupPenalty = payload.oneIdFilterGroups.length > 1 ? payload.oneIdFilterGroups.length * 2400 : 0
  const baseCount = Math.max(3600, 128000 - conditionCount * 16700 - oneIdFilterCount * 8200 - oneIdGroupPenalty - relationPenalty - conversionPenalty)
  const sampledCount = payload.sampling.enabled && payload.sampling.keepCount ? Math.min(baseCount, payload.sampling.keepCount) : baseCount

  return resolveMock({
    baseCount: sampledCount,
    idTypeCounts: {
      oneid: sampledCount,
      mobile: Math.round(sampledCount * 0.82),
      member_id: Math.round(sampledCount * 0.91),
      device_id: Math.round(sampledCount * 1.34),
    },
    coverageRate: Number(((sampledCount / 538000) * 100).toFixed(2)),
  }, 360)
}

export const parseUploadFile = (fileName: string, sizeMb: number, inputIdType: string, content = ''): Promise<{ ok: boolean; message: string; result?: SegmentUploadParseResult }> => {
  if (!inputIdType) {
    return resolveMock({ ok: false, message: '请先选择录入ID类型。' })
  }

  if (!/\.(txt|csv)$/i.test(fileName)) {
    return resolveMock({ ok: false, message: '文件格式不支持。' })
  }

  if (sizeMb > 1024) {
    return resolveMock({ ok: false, message: '文件超过 1G。' })
  }

  const rows = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line, index) => !(index === 0 && /id|mobile|oneid|member/i.test(line)))
  const normalizedRows = rows.map((line) => line.split(',')[0]?.trim() ?? '').filter(Boolean)
  const hasContent = normalizedRows.length > 0
  const rawRows = hasContent ? normalizedRows.length : Math.max(12000, Math.round(sizeMb * 18000))
  const duplicateIds = hasContent ? rawRows - new Set(normalizedRows).size : Math.round(rawRows * 0.024)
  const invalidPattern = inputIdType === 'mobile' ? /^1\d{10}$/ : /^[A-Za-z0-9_@.-]{3,64}$/
  const invalidIds = hasContent ? normalizedRows.filter((id) => !invalidPattern.test(id)).length : Math.round(rawRows * 0.006)
  const validIds = Math.max(0, rawRows - duplicateIds - invalidIds)
  const unmatchedIds = hasContent ? Math.round(validIds * 0.01) : Math.round(validIds * 0.018)

  return resolveMock({
    ok: true,
    message: '文件解析成功。',
    result: {
      rawRows,
      validIds,
      duplicateIds,
      invalidIds,
      matchedIds: validIds - unmatchedIds,
      unmatchedIds,
      failedReasons: invalidIds ? [`${invalidIds} 行 ID 格式不合法`] : [],
    },
  }, 520)
}

export const createSegment = async (payload: SegmentCreatePayload): Promise<{ ok: boolean; message: string; segment?: SegmentRecord }> => {
  const validation = validateCreatePayload(payload)
  if (validation) {
    return resolveMock({ ok: false, message: validation })
  }

  const estimate = await estimateSegment(payload)
  const id = makeId('segment')
  const createdAt = now()
  const type = inferSegmentType(payload.method)
  const subjectId = payload.method === 'subject_convert' ? payload.subjectConversion?.targetSubjectId ?? payload.subjectId : payload.subjectId
  const outputIdType = payload.upload?.outputIdType || payload.outputIdType
  const status: SegmentStatus = payload.schedule.dependency.dependencies.every((item) => item.ready) ? 'running' : 'waiting'
  const segment: SegmentRecord = {
    id,
    name: payload.name.trim(),
    description: payload.description.trim(),
    type,
    subjectId,
    subjectName: getSubjectName(subjectId),
    outputIdType,
    encryptionType: payload.encryptionType,
    count: estimate.baseCount,
    status,
    updateMode: payload.schedule.updateMode,
    scheduledEnabled: payload.schedule.updateMode === 'scheduled',
    groupIds: [...payload.groupIds],
    creator: currentUser,
    editor: currentUser,
    createdAt,
    updatedAt: createdAt,
    ttlDays: payload.ttlDays,
    authorizationIds: [],
    childIds: [],
    rule: payload.method === 'upload' || payload.method === 'advanced_manual' ? undefined : clone(payload.rule),
    oneIdFilters: clone(flattenOneIdFilters(payload)),
    oneIdFilterLogic: payload.oneIdFilterLogic,
    oneIdFilterGroups: clone(payload.oneIdFilterGroups),
    sampling: clone(payload.sampling),
    schedule: clone(payload.schedule),
    upload: payload.upload ? clone(payload.upload) : undefined,
    multiSubject: payload.multiSubject ? clone(payload.multiSubject) : undefined,
    subjectConversion: payload.subjectConversion ? clone(payload.subjectConversion) : undefined,
    service: { status: 'disabled', qpsLimit: 100, authType: 'token' },
    applications: clone(segments[0]?.applications ?? []),
    permissions: {
      canView: true,
      canEdit: true,
      canDelete: true,
      canDownload: true,
      canAuthorize: true,
      canUpdate: true,
      canManageGroup: true,
      canSplit: type === 'rule' || type === 'upload',
      canConfigureService: true,
      canConfigureTtl: true,
    },
    relatedMetricIds: [],
    lineageImpactCount: type === 'multi_subject' ? 4 : type === 'subject_convert' ? 3 : 1,
  }

  payload.authorizationIds.forEach((principalId) => {
    const principal = segmentAuthorizationPrincipals.find((item) => item.id === principalId)
    if (!principal) {
      return
    }
    const auth: SegmentAuthorization = {
      id: makeId('auth'),
      segmentId: id,
      principalType: principal.type,
      principalId: principal.id,
      principalName: principal.name,
      permission: 'view',
      grantedBy: currentUser,
      grantedAt: createdAt,
    }
    segmentAuthorizations.push(auth)
    segment.authorizationIds.push(auth.id)
  })
  segments.unshift(segment)
  if (status !== 'waiting') {
    segmentVersions.unshift({
      id: makeId('ver'),
      segmentId: id,
      versionNo: 1,
      count: estimate.baseCount,
      status: 'running',
      startedAt: createdAt,
      dataPartitionTime: today(),
      fileUri: `oss://segments/${id}/v1/${outputIdType}`,
      isLatest: true,
    })
  }
  segmentRunRecords.unshift({
    id: makeId('run-initial'),
    segmentId: id,
    taskType: type === 'subject_convert' ? 'subject_convert' : 'initial',
    status: status === 'waiting' ? 'waiting' : 'running',
    startedAt: createdAt,
    count: status === 'waiting' ? undefined : estimate.baseCount,
    triggerBy: currentUser.name,
    dependencyView: payload.schedule.dependency.dependencies.map((item) => ({
      name: item.name,
      status: item.ready ? 'ready' : 'waiting',
      message: item.ready ? '已就绪' : '等待上游任务',
    })),
  })
  syncGroupCounts()

  return resolveMock({ ok: true, message: '分群已创建，初始运行任务已生成。', segment })
}

const idTypeLabel = (id: string): string => {
  const labels: Record<string, string> = {
    base_id: '基准 ID',
    oneid: 'OneID',
    one_id: 'OneID',
    mobile: '手机号',
    member_id: '会员 ID',
    device_id: '设备 ID',
    lead_id: '线索 ID',
    store_id: '门店 ID',
    vehicle_id: '车辆 ID',
    vin: 'VIN',
    sku_id: 'SKU ID',
  }
  return labels[id] ?? id
}

const ensureSegmentSubject = (payload: Pick<SegmentFromMultiDimPayload | SegmentFromLifecyclePayload, 'subjectType' | 'subjectName' | 'outputIdType'>): EntityId => {
  const subjectId = `subject-${payload.subjectType}`
  let subject = segmentSubjects.find((item) => item.id === subjectId)
  if (!subject) {
    subject = {
      id: subjectId,
      name: payload.subjectName,
      description: `由多维特征分析同步的${payload.subjectName}主体。`,
      idTypes: [payload.outputIdType],
    }
    segmentSubjects.push(subject)
  }
  if (!subject.idTypes.includes(payload.outputIdType)) {
    subject.idTypes.push(payload.outputIdType)
  }
  if (!segmentIdTypes.some((item) => item.id === payload.outputIdType)) {
    segmentIdTypes.push({
      id: payload.outputIdType,
      label: idTypeLabel(payload.outputIdType),
      subjectId,
      encryptedAtRest: payload.outputIdType === 'mobile' || payload.outputIdType === 'vin',
      encryptionSupported: true,
    })
  }
  return subjectId
}

const normalizeAdOutputIdType = (outputIdType: string): string =>
  outputIdType === 'one_id' ? 'oneid' : outputIdType

const adSegmentGroupMetadata: Record<string, { name: string; description: string }> = {
  ad_segments: {
    name: '广告投放人群',
    description: '由广告投放分析导出的投放洞察与触达人群。',
  },
  high_intent: {
    name: '高意向线索',
    description: '由广告投放分析导出的高意向线索人群。',
  },
  retargeting: {
    name: '复投实验',
    description: '用于广告复投、频控与实验验证的人群。',
  },
}

const ensureAdSegmentGroups = (groupIds: EntityId[], creator: Owner, createdAt: string): EntityId[] => {
  const ids = groupIds.length ? [...new Set(groupIds)] : ['ad_segments']
  ids.forEach((id) => {
    if (segmentGroups.some((group) => group.id === id)) return
    const metadata = adSegmentGroupMetadata[id] ?? {
      name: id,
      description: '由广告投放分析导出的用户分群分组。',
    }
    segmentGroups.push({
      id,
      name: metadata.name,
      description: metadata.description,
      segmentCount: 0,
      creator,
      createdAt,
      updatedAt: createdAt,
    })
  })
  return ids
}

const adAuthPrincipalMetadata: Record<string, { id: EntityId; name: string; type: SegmentPrincipalType; department: string }> = {
  运营组: { id: 'group-ad-ops', name: '广告运营用户组', type: 'group', department: '商业化中心' },
  销售转化组: { id: 'group-sales-conversion', name: '销售转化组', type: 'group', department: '销售转化团队' },
  项目管理员: { id: 'role-project-admin', name: '项目管理员', type: 'role', department: '平台管理员' },
}

const ensureAdAuthPrincipal = (target: string): SegmentAuthorizationPrincipal => {
  const metadata = adAuthPrincipalMetadata[target] ?? {
    id: `ad-auth-${stableHash(target)}`,
    name: target,
    type: 'group' as const,
    department: '广告投放协作',
  }
  let principal = segmentAuthorizationPrincipals.find((item) => item.id === metadata.id)
  if (!principal) {
    principal = {
      id: metadata.id,
      name: metadata.name,
      type: metadata.type,
      department: metadata.department,
    }
    segmentAuthorizationPrincipals.push(principal)
  }
  return principal
}

export const createSegmentFromMultiDimAnalysis = (payload: SegmentFromMultiDimPayload): SegmentRecord => {
  const createdAt = now()
  const subjectId = ensureSegmentSubject(payload)
  const groupIds = payload.groupIds.length ? [...payload.groupIds] : ['group-growth']
  const ruleLogic = payload.comboRelation === 'all' ? 'and' : 'or'
  const segment: SegmentRecord = {
    id: payload.id,
    name: payload.name.trim(),
    description:
      payload.description.trim() ||
      `来自多维特征分析报告「${payload.sourceReportName}」的${payload.exportType === 'expanded_population' ? '扩量后' : '正样本'}分群。`,
    type: 'rule',
    subjectId,
    subjectName: payload.subjectName,
    outputIdType: payload.outputIdType,
    encryptionType: 'none',
    count: payload.count,
    status: 'success',
    updateMode: 'manual',
    scheduledEnabled: false,
    groupIds,
    creator: payload.creator,
    editor: payload.creator,
    createdAt,
    updatedAt: createdAt,
    ttlDays: 32,
    authorizationIds: [],
    childIds: [],
    rule: {
      computeMode: 'offline',
      subjectMode: 'single',
      satisfyLogic: ruleLogic,
      satisfyGroups: [
        {
          id: makeId('rule-group-multidim'),
          name: '多维特征组合',
          logic: ruleLogic,
          conditions: payload.selectedComboIds.map((comboId, index) => ({
            id: makeId('condition-multidim'),
            source: 'segment',
            sourceName: '多维特征分析',
            field: 'feature_combo',
            label: `${payload.sourceReportName} / 特征组合 ${index + 1}`,
            operator: 'contains',
            value: comboId,
          })),
        },
      ],
    },
    oneIdFilters: [],
    oneIdFilterLogic: 'and',
    oneIdFilterGroups: [],
    sampling: { enabled: false, systemLimit: 3000000 },
    schedule: defaultSchedule(),
    service: { status: 'disabled', qpsLimit: 100, authType: 'token' },
    applications: clone(segments[0]?.applications ?? []),
    permissions: {
      canView: true,
      canEdit: true,
      canDelete: true,
      canDownload: true,
      canAuthorize: true,
      canUpdate: true,
      canManageGroup: true,
      canSplit: true,
      canConfigureService: true,
      canConfigureTtl: true,
    },
    relatedMetricIds: [],
    lineageImpactCount: 1,
  }

  payload.authObjects.forEach((principal) => {
    if (!segmentAuthorizationPrincipals.some((item) => item.id === principal.id && item.type === principal.type)) {
      segmentAuthorizationPrincipals.push({
        id: principal.id,
        name: principal.name,
        type: principal.type,
        department: '',
      })
    }
    const auth: SegmentAuthorization = {
      id: makeId('auth'),
      segmentId: segment.id,
      principalType: principal.type,
      principalId: principal.id,
      principalName: principal.name,
      permission: 'view',
      grantedBy: payload.creator,
      grantedAt: createdAt,
    }
    segmentAuthorizations.push(auth)
    segment.authorizationIds.push(auth.id)
  })

  segments.unshift(segment)
  userSegments.unshift({
    id: segment.id,
    name: segment.name,
    description: segment.description,
    status: 'active',
    owner: payload.creator,
    size: payload.count,
    coverageRate: Number(Math.min(100, Math.max(0.1, payload.count / 10000)).toFixed(2)),
    riskLevel: payload.exportType === 'expanded_population' ? 'medium' : 'low',
    refreshMode: 'manual',
    lastCalculatedAt: createdAt,
    conditions: segment.rule?.satisfyGroups.flatMap((group) => group.conditions) ?? [],
    profileMetrics: [
      { label: '特征组合数', value: payload.selectedComboIds.length, unit: '个', benchmark: 1, deltaRate: (payload.selectedComboIds.length - 1) * 100 },
      { label: '分群人数', value: payload.count, unit: '人', benchmark: payload.count, deltaRate: 0 },
    ],
    behaviorInsights: [
      {
        id: makeId('insight-multidim'),
        title: '来源于多维特征分析',
        description: `该分群由报告「${payload.sourceReportName}」按${payload.comboRelation === 'all' ? '满足所有特征组合' : '满足任意特征组合'}生成。`,
        evidenceMetricIds: [],
        confidence: 0.82,
      },
    ],
    recommendedActions: ['前往用户分群详情查看生成规则，并按业务场景配置下游触达或实验。'],
    relatedMetricIds: [],
  })
  segmentVersions.unshift({
    id: makeId('ver'),
    segmentId: segment.id,
    versionNo: 1,
    count: payload.count,
    status: 'success',
    startedAt: createdAt,
    endedAt: createdAt,
    dataPartitionTime: today(),
    fileUri: `oss://segments/${segment.id}/v1/${payload.outputIdType}`,
    isLatest: true,
  })
  segmentRunRecords.unshift({
    id: makeId('run-multidim'),
    segmentId: segment.id,
    taskType: 'initial',
    status: 'success',
    progress: 100,
    startedAt: createdAt,
    endedAt: createdAt,
    durationMs: 1800,
    count: payload.count,
    triggerBy: payload.creator.name,
    dependencyView: defaultDependency().dependencies.map((item) => ({
      name: item.name,
      status: 'ready',
      message: '已就绪',
    })),
    logEntries: [
      { time: createdAt, level: 'info', message: `由多维特征分析报告 ${payload.sourceReportId} 保存分群。` },
      { time: createdAt, level: 'info', message: '特征组合条件已固化，初始版本生成成功。' },
    ],
  })
  segmentLineageNodes.unshift({
    id: makeId('lineage'),
    segmentId: segment.id,
    assetId: payload.sourceReportId,
    assetName: payload.sourceReportName,
    assetType: 'analysis',
    direction: 'upstream',
    level: 1,
    relationType: '多维特征分析保存',
    owner: payload.creator,
    updatedAt: createdAt,
    targetRoute: `/user-insight/multidim-features/${payload.sourceReportId}`,
  })
  syncGroupCounts()

  return clone(segment)
}

export const createSegmentFromLifecycleAnalysis = (payload: SegmentFromLifecyclePayload): SegmentRecord => {
  const createdAt = now()
  const subjectId = ensureSegmentSubject(payload)
  const groupIds = payload.groupIds.length ? [...payload.groupIds] : ['group-growth']
  const segment: SegmentRecord = {
    id: payload.id,
    name: payload.name.trim(),
    description:
      payload.description.trim()
      || `来自生命周期分析报告「${payload.sourceReportName}」的${payload.sourceName}分群。`,
    type: 'rule',
    subjectId,
    subjectName: payload.subjectName,
    outputIdType: payload.outputIdType,
    encryptionType: 'none',
    count: payload.count,
    status: 'success',
    updateMode: payload.updateMode === 'daily' ? 'daily' : 'manual',
    scheduledEnabled: payload.updateMode === 'daily',
    groupIds,
    creator: payload.creator,
    editor: payload.creator,
    createdAt,
    updatedAt: createdAt,
    ttlDays: 32,
    authorizationIds: [],
    childIds: [],
    rule: {
      computeMode: 'offline',
      subjectMode: 'single',
      satisfyLogic: 'and',
      satisfyGroups: [
        {
          id: makeId('rule-group-lifecycle'),
          name: '生命周期分析导出规则',
          logic: 'and',
          conditions: [
            {
              id: makeId('condition-lifecycle-source'),
              source: 'tag',
              sourceName: '生命周期标签',
              field: payload.sourceType,
              label: payload.sourceName,
              operator: 'contains',
              value: payload.stageNames.join('、') || payload.sourceName,
              timeRange: `${payload.timeRange[0]} 至 ${payload.timeRange[1]}`,
            },
            {
              id: makeId('condition-lifecycle-range'),
              source: 'attribute',
              sourceName: '生命周期分析',
              field: 'crowd_range',
              label: '人群范围',
              operator: 'equals',
              value: payload.crowdRange,
            },
            ...(payload.sourceConfig
              ? [{
                  id: makeId('condition-lifecycle-source-config'),
                  source: 'detail' as const,
                  sourceName: '生命周期导出来源',
                  field: 'source_config',
                  label: '来源追溯',
                  operator: 'equals' as const,
                  value: JSON.stringify(payload.sourceConfig),
                }]
              : []),
          ],
        },
      ],
    },
    oneIdFilters: [],
    oneIdFilterLogic: 'and',
    oneIdFilterGroups: [],
    sampling: { enabled: false, systemLimit: 3000000 },
    schedule: {
      ...defaultSchedule(),
      updateMode: payload.updateMode === 'daily' ? 'daily' : 'manual',
      dailyTime: payload.updateMode === 'daily' ? '08:30' : undefined,
    },
    service: { status: 'disabled', qpsLimit: 100, authType: 'token' },
    applications: clone(segments[0]?.applications ?? []),
    permissions: {
      canView: true,
      canEdit: true,
      canDelete: true,
      canDownload: true,
      canAuthorize: true,
      canUpdate: true,
      canManageGroup: true,
      canSplit: true,
      canConfigureService: true,
      canConfigureTtl: true,
    },
    relatedMetricIds: [],
    lineageImpactCount: 1,
  }

  payload.authObjects.forEach((principal) => {
    if (!segmentAuthorizationPrincipals.some((item) => item.id === principal.id && item.type === principal.type)) {
      segmentAuthorizationPrincipals.push({
        id: principal.id,
        name: principal.name,
        type: principal.type,
        department: '',
      })
    }
    const auth: SegmentAuthorization = {
      id: makeId('auth'),
      segmentId: segment.id,
      principalType: principal.type,
      principalId: principal.id,
      principalName: principal.name,
      permission: 'view',
      grantedBy: payload.creator,
      grantedAt: createdAt,
    }
    segmentAuthorizations.push(auth)
    segment.authorizationIds.push(auth.id)
  })

  segments.unshift(segment)
  userSegments.unshift({
    id: segment.id,
    name: segment.name,
    description: segment.description,
    status: 'active',
    owner: payload.creator,
    size: payload.count,
    coverageRate: Number(Math.min(100, Math.max(0.1, payload.count / 10000)).toFixed(2)),
    riskLevel: payload.sourceType === 'path_edge' ? 'medium' : 'low',
    refreshMode: payload.updateMode === 'daily' ? 'daily' : 'manual',
    lastCalculatedAt: createdAt,
    conditions: segment.rule?.satisfyGroups.flatMap((group) => group.conditions) ?? [],
    profileMetrics: [
      { label: '生命周期阶段', value: payload.stageNames.length || 1, unit: '个', benchmark: 1, deltaRate: Math.max(0, payload.stageNames.length - 1) * 100 },
      { label: '分群人数', value: payload.count, unit: '人', benchmark: payload.count, deltaRate: 0 },
    ],
    behaviorInsights: [
      {
        id: makeId('insight-lifecycle'),
        title: '来源于生命周期分析',
        description: `该分群由报告「${payload.sourceReportName}」的「${payload.sourceName}」生成。`,
        evidenceMetricIds: [],
        confidence: 0.86,
      },
    ],
    recommendedActions: ['前往用户分群详情查看规则，或配置触达、实验和画像洞察。'],
    relatedMetricIds: [],
  })
  segmentVersions.unshift({
    id: makeId('ver'),
    segmentId: segment.id,
    versionNo: 1,
    count: payload.count,
    status: 'success',
    startedAt: createdAt,
    endedAt: createdAt,
    dataPartitionTime: today(),
    fileUri: `oss://segments/${segment.id}/v1/${payload.outputIdType}`,
    isLatest: true,
  })
  segmentRunRecords.unshift({
    id: makeId('run-lifecycle'),
    segmentId: segment.id,
    taskType: 'initial',
    status: 'success',
    progress: 100,
    startedAt: createdAt,
    endedAt: createdAt,
    durationMs: 1600,
    count: payload.count,
    triggerBy: payload.creator.name,
    dependencyView: defaultDependency().dependencies.map((item) => ({
      name: item.name,
      status: 'ready',
      message: '已就绪',
    })),
    logEntries: [
      { time: createdAt, level: 'info', message: `由生命周期分析报告 ${payload.sourceReportId} 导出分群。` },
      { time: createdAt, level: 'info', message: '导出规则已固化，初始版本生成成功。' },
    ],
  })
  segmentLineageNodes.unshift({
    id: makeId('lineage'),
    segmentId: segment.id,
    assetId: payload.sourceReportId,
    assetName: payload.sourceReportName,
    assetType: 'analysis',
    direction: 'upstream',
    level: 1,
    relationType: '生命周期分析导出',
    owner: payload.creator,
    updatedAt: createdAt,
    targetRoute: `/user-insight/lifecycle-analysis/${payload.sourceReportId}`,
  })
  syncGroupCounts()

  return clone(segment)
}

export const createSegmentFromAdAnalysisExport = (payload: SegmentFromAdAnalysisPayload): SegmentRecord => {
  const existing = segments.find((segment) => segment.id === payload.id)
  if (existing) return clone(existing)

  const createdAt = now()
  const outputIdType = normalizeAdOutputIdType(payload.outputIdType)
  const subjectId = ensureSegmentSubject({
    subjectType: 'user',
    subjectName: '用户',
    outputIdType,
  })
  const groupIds = ensureAdSegmentGroups(payload.groupIds, payload.creator, createdAt)
  const sourceTypeLabel: Record<string, string> = {
    detail: '明细表',
    funnel: '漏斗阶段',
    path_node: '路径节点',
    path_link: '路径链路',
    frequency: '频次分析',
    overlap: '媒体重合度',
  }
  const sourceConfigText = JSON.stringify(payload.sourceConfig)
  const segment: SegmentRecord = {
    id: payload.id,
    name: payload.name.trim(),
    description:
      payload.description.trim()
      || `来自广告投放分析「${payload.sourceName}」的${sourceTypeLabel[payload.sourceType] ?? payload.sourceType}人群。`,
    type: 'rule',
    subjectId,
    subjectName: '用户',
    outputIdType,
    encryptionType: 'none',
    count: payload.count,
    status: 'success',
    updateMode: 'manual',
    scheduledEnabled: false,
    groupIds,
    creator: payload.creator,
    editor: payload.creator,
    createdAt,
    updatedAt: createdAt,
    ttlDays: 32,
    authorizationIds: [],
    childIds: [],
    rule: {
      computeMode: 'offline',
      subjectMode: 'single',
      satisfyLogic: 'and',
      satisfyGroups: [
        {
          id: makeId('rule-group-ad-analysis'),
          name: '广告投放分析导出规则',
          logic: 'and',
          conditions: [
            {
              id: makeId('condition-ad-source'),
              source: 'detail',
              sourceName: '广告投放分析',
              field: 'source_type',
              label: sourceTypeLabel[payload.sourceType] ?? payload.sourceType,
              operator: 'equals',
              value: payload.sourceName,
            },
            {
              id: makeId('condition-ad-config'),
              source: 'detail',
              sourceName: '广告导出条件',
              field: 'source_config',
              label: '来源配置',
              operator: 'equals',
              value: sourceConfigText,
            },
          ],
        },
      ],
    },
    oneIdFilters: [],
    oneIdFilterLogic: 'and',
    oneIdFilterGroups: [],
    sampling: { enabled: false, systemLimit: 3000000 },
    schedule: defaultSchedule(),
    service: { status: 'disabled', qpsLimit: 100, authType: 'token' },
    applications: clone(segments[0]?.applications ?? []),
    permissions: {
      canView: true,
      canEdit: true,
      canDelete: true,
      canDownload: true,
      canAuthorize: true,
      canUpdate: true,
      canManageGroup: true,
      canSplit: true,
      canConfigureService: true,
      canConfigureTtl: true,
    },
    relatedMetricIds: [],
    lineageImpactCount: 1,
  }

  payload.authTargets.forEach((target) => {
    const principal = ensureAdAuthPrincipal(target)
    const auth: SegmentAuthorization = {
      id: makeId('auth'),
      segmentId: segment.id,
      principalType: principal.type,
      principalId: principal.id,
      principalName: principal.name,
      permission: 'view',
      grantedBy: payload.creator,
      grantedAt: createdAt,
    }
    segmentAuthorizations.push(auth)
    segment.authorizationIds.push(auth.id)
  })

  segments.unshift(segment)
  userSegments.unshift({
    id: segment.id,
    name: segment.name,
    description: segment.description,
    status: 'active',
    owner: payload.creator,
    size: payload.count,
    coverageRate: Number(Math.min(100, Math.max(0.1, payload.count / 10000)).toFixed(2)),
    riskLevel: payload.sourceType === 'overlap' || payload.sourceType === 'path_link' ? 'medium' : 'low',
    refreshMode: 'manual',
    lastCalculatedAt: createdAt,
    conditions: segment.rule?.satisfyGroups.flatMap((group) => group.conditions) ?? [],
    profileMetrics: [
      { label: '导出来源', value: 1, unit: '个', benchmark: 1, deltaRate: 0 },
      { label: '分群人数', value: payload.count, unit: '人', benchmark: payload.count, deltaRate: 0 },
    ],
    behaviorInsights: [
      {
        id: makeId('insight-ad-analysis'),
        title: '来源于广告投放分析',
        description: `该分群由「${payload.sourceReportName}」的「${payload.sourceName}」生成，可用于复投、触达或后续画像分析。`,
        evidenceMetricIds: [],
        confidence: 0.84,
      },
    ],
    recommendedActions: ['在用户分群详情中确认规则和授权后，再同步到触达、实验或广告复投场景。'],
    relatedMetricIds: [],
  })
  segmentVersions.unshift({
    id: makeId('ver'),
    segmentId: segment.id,
    versionNo: 1,
    count: payload.count,
    status: 'success',
    startedAt: createdAt,
    endedAt: createdAt,
    dataPartitionTime: today(),
    fileUri: `oss://segments/${segment.id}/v1/${outputIdType}`,
    isLatest: true,
  })
  segmentRunRecords.unshift({
    id: makeId('run-ad-analysis'),
    segmentId: segment.id,
    taskType: 'initial',
    status: 'success',
    progress: 100,
    startedAt: createdAt,
    endedAt: createdAt,
    durationMs: 1400,
    count: payload.count,
    triggerBy: payload.creator.name,
    dependencyView: defaultDependency().dependencies.map((item) => ({
      name: item.name,
      status: 'ready',
      message: '已就绪',
    })),
    logEntries: [
      { time: createdAt, level: 'info', message: `由广告投放分析 ${payload.sourceReportId ?? 'ad-report'} 导出分群。` },
      { time: createdAt, level: 'info', message: '导出条件已固化，初始版本生成成功。' },
    ],
  })
  segmentLineageNodes.unshift({
    id: makeId('lineage'),
    segmentId: segment.id,
    assetId: payload.sourceReportId ?? 'ad-report',
    assetName: payload.sourceReportName,
    assetType: 'analysis',
    direction: 'upstream',
    level: 1,
    relationType: '广告投放分析导出',
    owner: payload.creator,
    updatedAt: createdAt,
    targetRoute: payload.sourceReportId
      ? `/data-insight/ad-analysis/reports/${payload.sourceReportId}`
      : '/data-insight/ad-analysis/ad-report',
  })
  syncGroupCounts()

  return clone(segment)
}

export const triggerSegmentUpdate = (segmentId: EntityId): Promise<{ ok: boolean; message: string }> => {
  const segment = segments.find((item) => item.id === segmentId)
  if (!segment) {
    return resolveMock({ ok: false, message: '分群不存在。' })
  }

  if (!segment.permissions.canUpdate) {
    return resolveMock({ ok: false, message: '暂无更新分群权限。' })
  }

  if (segment.status === 'running') {
    return resolveMock({ ok: false, message: '当前分群正在更新中，请稍后再试。' })
  }

  const waiting = !segment.schedule.dependency.dependencies.every((item) => item.ready)
  segment.status = waiting ? 'waiting' : 'running'
  segment.updatedAt = now()
  segmentRunRecords.unshift({
    id: makeId('run-manual'),
    segmentId,
    taskType: 'manual',
    status: waiting ? 'waiting' : 'running',
    startedAt: segment.updatedAt,
    triggerBy: currentUser.name,
    dependencyView: segment.schedule.dependency.dependencies.map((item) => ({
      name: item.name,
      status: item.ready ? 'ready' : 'waiting',
      message: item.ready ? '已就绪' : '等待上游任务',
    })),
  })

  return resolveMock({ ok: true, message: waiting ? '上游数据任务未就绪，当前更新已进入等待状态。' : '已创建手动更新任务。' })
}

export const copySegment = (segmentId: EntityId): Promise<{ ok: boolean; message: string; payload?: SegmentCreatePayload }> => {
  const segment = segments.find((item) => item.id === segmentId)
  if (!segment) {
    return resolveMock({ ok: false, message: '分群不存在。' })
  }

  if (segment.type !== 'rule' || !segment.rule) {
    return resolveMock({ ok: false, message: '当前仅支持标签规则创建的人群包复制。' })
  }

  return resolveMock({
    ok: true,
    message: '已复制规则条件、输出 ID 类型、加密方式、任务配置和分组，授权对象不会复制。',
    payload: {
      ...buildDefaultCreatePayload('rule'),
      name: `${segment.name}_副本`,
      subjectId: segment.subjectId,
      outputIdType: segment.outputIdType,
      encryptionType: segment.encryptionType,
      groupIds: clone(segment.groupIds),
      rule: clone(segment.rule),
      oneIdFilters: clone(segment.oneIdFilters),
      oneIdFilterLogic: segment.oneIdFilterLogic ?? 'and',
      oneIdFilterGroups: clone(segment.oneIdFilterGroups ?? []),
      sampling: clone(segment.sampling),
      schedule: clone(segment.schedule),
    },
  })
}

export const buildPayloadFromSegment = (segmentId: EntityId): Promise<{ ok: boolean; message: string; payload?: SegmentCreatePayload }> => {
  const segment = segments.find((item) => item.id === segmentId && !item.physicalDeleted && item.status !== 'deleted')
  if (!segment) {
    return resolveMock({ ok: false, message: '分群不存在或已删除。' })
  }
  if (!segment.permissions.canEdit || segment.parentId) {
    return resolveMock({ ok: false, message: '暂无编辑权限，或当前分群为子包不支持单独编辑。' })
  }

  const method: SegmentCreatePayload['method'] =
    segment.type === 'upload'
      ? 'upload'
      : segment.type === 'advanced_manual'
        ? 'advanced_manual'
        : segment.type === 'multi_subject'
          ? 'multi_subject'
          : segment.type === 'subject_convert'
            ? 'subject_convert'
            : 'rule'
  const payload: SegmentCreatePayload = {
    ...buildDefaultCreatePayload(method),
    name: segment.name,
    description: segment.description,
    subjectId: segment.subjectId,
    outputIdType: segment.outputIdType,
    encryptionType: segment.encryptionType,
    groupIds: clone(segment.groupIds),
    authorizationIds: clone(segment.authorizationIds),
    ttlDays: segment.ttlDays,
    rule: cloneRule(segment.rule),
    oneIdFilters: clone(segment.oneIdFilters),
    oneIdFilterLogic: segment.oneIdFilterLogic ?? 'and',
    oneIdFilterGroups: clone(segment.oneIdFilterGroups ?? (segment.oneIdFilters.length ? [{ id: makeId('oneid-group'), name: '子档案条件组1', logic: 'and', filters: segment.oneIdFilters }] : [])),
    sampling: clone(segment.sampling),
    schedule: clone(segment.schedule),
    upload: segment.upload ? clone(segment.upload) : undefined,
    multiSubject: segment.multiSubject ? clone(segment.multiSubject) : undefined,
    subjectConversion: segment.subjectConversion ? clone(segment.subjectConversion) : undefined,
  }
  if (payload.upload) {
    payload.upload.changeMode = payload.upload.changeMode ?? 'replace'
    payload.outputIdType = payload.upload.outputIdType
  }

  return resolveMock({ ok: true, message: '已载入分群详情，可继续编辑。', payload })
}

export const updateSegmentDetail = async (segmentId: EntityId, payload: SegmentCreatePayload): Promise<{ ok: boolean; message: string; segment?: SegmentRecord }> => {
  const segment = segments.find((item) => item.id === segmentId && !item.physicalDeleted && item.status !== 'deleted')
  if (!segment) {
    return resolveMock({ ok: false, message: '分群不存在或已删除。' })
  }
  if (!segment.permissions.canEdit || segment.parentId) {
    return resolveMock({ ok: false, message: '暂无编辑权限，或当前分群为子包不支持单独编辑。' })
  }

  const validation = validateCreatePayload(payload, { requireCreatePermission: false })
  if (validation) {
    return resolveMock({ ok: false, message: validation })
  }

  const estimate = await estimateSegment(payload)
  const updatedAt = now()
  const previousCount = segment.count
  let nextCount = estimate.baseCount
  if ((payload.method === 'upload' || payload.method === 'advanced_manual') && payload.upload?.latestParseResult) {
    const matched = payload.upload.latestParseResult.matchedIds
    if (payload.upload.changeMode === 'append') {
      nextCount = previousCount + Math.round(matched * 0.94)
    } else if (payload.upload.changeMode === 'remove') {
      nextCount = Math.max(0, previousCount - matched)
    } else {
      nextCount = matched
    }
  }

  const subjectId = payload.method === 'subject_convert' ? payload.subjectConversion?.targetSubjectId ?? payload.subjectId : payload.subjectId
  const outputIdType = payload.upload?.outputIdType || payload.outputIdType
  segment.name = payload.name.trim()
  segment.description = payload.description.trim()
  segment.subjectId = subjectId
  segment.subjectName = getSubjectName(subjectId)
  segment.outputIdType = outputIdType
  segment.encryptionType = payload.encryptionType
  segment.count = nextCount
  segment.status = payload.schedule.dependency.dependencies.every((item) => item.ready) ? 'running' : 'waiting'
  segment.updateMode = payload.schedule.updateMode
  segment.scheduledEnabled = payload.schedule.updateMode === 'scheduled'
  segment.groupIds = clone(payload.groupIds)
  segment.editor = currentUser
  segment.updatedAt = updatedAt
  segment.ttlDays = payload.ttlDays
  segment.rule = payload.method === 'upload' || payload.method === 'advanced_manual' ? undefined : clone(payload.rule)
  segment.oneIdFilters = clone(flattenOneIdFilters(payload))
  segment.oneIdFilterLogic = payload.oneIdFilterLogic
  segment.oneIdFilterGroups = clone(payload.oneIdFilterGroups)
  segment.sampling = clone(payload.sampling)
  segment.schedule = clone(payload.schedule)
  segment.upload = payload.upload ? clone(payload.upload) : undefined
  segment.multiSubject = payload.multiSubject ? clone(payload.multiSubject) : undefined
  segment.subjectConversion = payload.subjectConversion ? clone(payload.subjectConversion) : undefined
  segment.childIds.forEach((childId) => {
    const child = segments.find((item) => item.id === childId)
    if (child) {
      child.groupIds = clone(payload.groupIds)
      child.updatedAt = updatedAt
    }
  })

  segmentRunRecords.unshift({
    id: makeId(payload.method === 'upload' || payload.method === 'advanced_manual' ? 'run-upload-replace' : 'run-change'),
    segmentId,
    taskType: payload.method === 'upload' || payload.method === 'advanced_manual' ? 'upload_replace' : 'manual_change',
    status: segment.status === 'waiting' ? 'waiting' : 'running',
    startedAt: updatedAt,
    count: nextCount,
    triggerBy: currentUser.name,
    dependencyView: payload.schedule.dependency.dependencies.map((item) => ({
      name: item.name,
      status: item.ready ? 'ready' : 'waiting',
      message: item.ready ? '已就绪' : '等待上游任务',
    })),
  })
  segmentVersions.forEach((version) => {
    if (version.segmentId === segmentId) {
      version.isLatest = false
    }
  })
  segmentVersions.unshift({
    id: makeId('ver'),
    segmentId,
    versionNo: segmentVersions.filter((version) => version.segmentId === segmentId).length + 1,
    count: nextCount,
    status: segment.status === 'waiting' ? 'waiting' : 'running',
    startedAt: updatedAt,
    dataPartitionTime: today(),
    fileUri: `oss://segments/${segmentId}/v${segmentVersions.filter((version) => version.segmentId === segmentId).length + 1}/${outputIdType}`,
    isLatest: true,
  })
  syncGroupCounts()

  return resolveMock({ ok: true, message: segment.status === 'waiting' ? '分群已保存，更新任务等待上游依赖。' : '分群已保存，更新任务已生成。', segment })
}

export const updateSegmentGroups = (segmentIds: EntityId[], groupIds: EntityId[]): Promise<{ ok: boolean; message: string; skipped: string[] }> => {
  const skipped: string[] = []
  segmentIds.forEach((id) => {
    const segment = segments.find((item) => item.id === id)
    if (!segment) {
      return
    }
    if (segment.parentId) {
      skipped.push(segment.name)
      return
    }
    segment.groupIds = [...groupIds]
    segment.updatedAt = now()
    segment.childIds.forEach((childId) => {
      const child = segments.find((item) => item.id === childId)
      if (child) {
        child.groupIds = [...groupIds]
      }
    })
  })
  syncGroupCounts()

  return resolveMock({ ok: true, message: skipped.length ? `已更新可修改分群，${skipped.length} 个子包继承母包分组，不能单独修改。` : '分组已更新。', skipped })
}

export const authorizeSegments = (
  segmentIds: EntityId[],
  principal: { type: SegmentAuthorization['principalType']; id: EntityId; name: string; permission: SegmentAuthorization['permission'] },
): Promise<{ ok: boolean; message: string; failed: string[] }> => {
  const failed: string[] = []
  segmentIds.forEach((id) => {
    const segment = segments.find((item) => item.id === id)
    if (!segment || !segment.permissions.canAuthorize) {
      failed.push(segment?.name ?? id)
      return
    }
    const auth: SegmentAuthorization = {
      id: makeId('auth'),
      segmentId: id,
      principalType: principal.type,
      principalId: principal.id,
      principalName: principal.name,
      permission: principal.permission,
      grantedBy: currentUser,
      grantedAt: now(),
    }
    segmentAuthorizations.push(auth)
    segment.authorizationIds.push(auth.id)
  })

  return resolveMock({ ok: true, message: failed.length ? `授权完成，${failed.length} 个分群因权限不足失败。` : '授权已生效。', failed })
}

export const updateSegmentService = (segmentId: EntityId, config: SegmentServiceConfig): Promise<{ ok: boolean; message: string }> => {
  const segment = segments.find((item) => item.id === segmentId)
  if (!segment) {
    return resolveMock({ ok: false, message: '分群不存在。' })
  }
  if (!segment.permissions.canConfigureService) {
    return resolveMock({ ok: false, message: '暂无服务配置权限。' })
  }

  segment.service = {
    ...config,
    serviceKey: config.status === 'enabled' ? config.serviceKey || `seg_${segment.id.replaceAll('-', '_')}` : config.serviceKey,
    lastChangedAt: now(),
  }
  segment.updatedAt = now()

  return resolveMock({ ok: true, message: config.status === 'enabled' ? 'API 服务已开启。' : 'API 服务配置已保存。' })
}

export const updateSegmentTtl = (segmentId: EntityId, ttlDays: number): Promise<{ ok: boolean; message: string }> => {
  const segment = segments.find((item) => item.id === segmentId)
  if (!segment) {
    return resolveMock({ ok: false, message: '分群不存在。' })
  }
  if (!Number.isInteger(ttlDays) || ttlDays < 1 || ttlDays > 730) {
    return resolveMock({ ok: false, message: 'TTL 必须在 1-730 天之间。' })
  }
  if (!segment.permissions.canConfigureTtl) {
    return resolveMock({ ok: false, message: '暂无 TTL 配置权限。' })
  }

  segment.ttlDays = ttlDays
  segment.updatedAt = now()

  return resolveMock({ ok: true, message: 'TTL 已保存，已清理的历史版本不会恢复。' })
}

export const deleteSegments = (segmentIds: EntityId[]): Promise<{ ok: boolean; message: string; deleted: string[]; skipped: string[] }> => {
  const deleted: string[] = []
  const skipped: string[] = []
  segmentIds.forEach((id) => {
    const segment = segments.find((item) => item.id === id)
    if (!segment) {
      return
    }
    if (!segment.permissions.canDelete) {
      skipped.push(segment.name)
      return
    }
    segment.status = 'deleted'
    segment.physicalDeleted = false
    segment.updatedAt = now()
    deleted.push(segment.name)
  })
  syncGroupCounts()

  return resolveMock({
    ok: true,
    message: skipped.length ? `已删除 ${deleted.length} 个分群，${skipped.length} 个因权限不足未删除。` : `已删除 ${deleted.length} 个分群，下游调用将返回失效状态。`,
    deleted,
    skipped,
  })
}

export const createGroup = (name: string, description: string): Promise<{ ok: boolean; message: string; group?: SegmentGroup }> => {
  const trimmed = name.trim()
  if (!segmentPermissionSet.manageGroup) {
    return resolveMock({ ok: false, message: '暂无管理分群分组权限。' })
  }
  if (!trimmed) {
    return resolveMock({ ok: false, message: '分组名称必填。' })
  }
  if (trimmed.length > 50) {
    return resolveMock({ ok: false, message: '分组名称最大 50 字。' })
  }
  if (segmentGroups.some((item) => item.name === trimmed)) {
    return resolveMock({ ok: false, message: '同项目内分组名称不允许重复。' })
  }
  if (description.length > 200) {
    return resolveMock({ ok: false, message: '分组描述最大 200 字。' })
  }

  const createdAt = now()
  const group: SegmentGroup = {
    id: makeId('group'),
    name: trimmed,
    description,
    segmentCount: 0,
    creator: currentUser,
    createdAt,
    updatedAt: createdAt,
  }
  segmentGroups.push(group)

  return resolveMock({ ok: true, message: '分组已创建，可被项目成员使用。', group })
}

export const updateGroup = (groupId: EntityId, name: string, description: string): Promise<{ ok: boolean; message: string }> => {
  const group = segmentGroups.find((item) => item.id === groupId)
  const trimmed = name.trim()
  if (!group) {
    return resolveMock({ ok: false, message: '分组不存在。' })
  }
  if (!segmentPermissionSet.manageGroup) {
    return resolveMock({ ok: false, message: '暂无管理分群分组权限。' })
  }
  if (!trimmed) {
    return resolveMock({ ok: false, message: '分组名称必填。' })
  }
  if (segmentGroups.some((item) => item.id !== groupId && item.name === trimmed)) {
    return resolveMock({ ok: false, message: '同项目内分组名称不允许重复。' })
  }

  group.name = trimmed
  group.description = description.slice(0, 200)
  group.updatedAt = now()

  return resolveMock({ ok: true, message: '分组已更新，已归属分群会自动展示新名称。' })
}

export const deleteGroup = (groupId: EntityId): Promise<{ ok: boolean; message: string }> => {
  const index = segmentGroups.findIndex((item) => item.id === groupId)
  if (index < 0) {
    return resolveMock({ ok: false, message: '分组不存在。' })
  }
  const group = segmentGroups[index]
  segmentGroups.splice(index, 1)
  segments.forEach((segment) => {
    segment.groupIds = segment.groupIds.filter((id) => id !== groupId)
  })

  return resolveMock({ ok: true, message: `已删除「${group?.name ?? '分组'}」，不会删除分群，但已移除关联关系。` })
}

export const saveTemplate = (payload: SegmentCreatePayload, name: string, type: SegmentTemplate['type'], description: string): Promise<{ ok: boolean; message: string }> => {
  if (!name.trim()) {
    return resolveMock({ ok: false, message: '模板名称不能为空。' })
  }
  if (type === 'project' && !segmentPermissionSet.projectAdmin) {
    return resolveMock({ ok: false, message: '项目模板需要管理员权限。' })
  }

  segmentTemplates.unshift({
    id: makeId('tpl'),
    name: name.trim(),
    type,
    description,
    subjectId: payload.subjectId,
    idType: payload.outputIdType,
    encryptionType: payload.encryptionType,
    sampling: clone(payload.sampling),
    rule: clone(payload.rule),
    creator: currentUser,
    createdAt: now(),
  })

  return resolveMock({ ok: true, message: '模板已保存，模板不会保存分群名称和授权对象。' })
}

export const applyTemplate = (templateId: EntityId): Promise<{ ok: boolean; message: string; payload?: Partial<SegmentCreatePayload> }> => {
  const template = segmentTemplates.find((item) => item.id === templateId)
  if (!template) {
    return resolveMock({ ok: false, message: '模板不存在。' })
  }

  return resolveMock({
    ok: true,
    message: '模板规则已应用，当前页面原规则配置已被覆盖。',
    payload: {
      subjectId: template.subjectId,
      outputIdType: template.idType,
      encryptionType: template.encryptionType,
      sampling: clone(template.sampling),
      rule: clone(template.rule),
    },
  })
}

export const calculateSplitPreview = (
  segmentId: EntityId,
  strategy: 'limit_count' | 'limit_package_count' | 'ratio',
  packages: SegmentSplitPackageDraft[],
  packageCount: number,
  options?: { mode: 'random' | 'advanced'; advancedLabel: string; advancedLogic: 'include' | 'exclude' | 'top_n' | 'exclude_then_top_n'; advancedTopN: number; namingRule: string },
): Promise<{ ok: boolean; message: string; preview: SegmentSplitPreviewRow[] }> => {
  const segment = segments.find((item) => item.id === segmentId)
  if (!segment) {
    return resolveMock({ ok: false, message: '母包不存在。', preview: [] })
  }
  if (!segment.permissions.canSplit) {
    return resolveMock({ ok: false, message: '暂无拆包权限。', preview: [] })
  }

  const groupNames = segmentGroups.filter((group) => segment.groupIds.includes(group.id)).map((group) => group.name)

  if (options?.mode === 'advanced') {
    if (!segmentPermissionSet.advancedSplit || !segmentFeatureFlags.advancedSplitPurchased) {
      return resolveMock({ ok: false, message: '高级拆包为增值功能，请联系商务或管理员开通。', preview: [] })
    }
    if (!options.advancedLabel.trim()) {
      return resolveMock({ ok: false, message: '请选择用于高级拆包的标签。', preview: [] })
    }
    const topN = Math.min(Math.max(options.advancedTopN || 1, 1), 10)
    const labelPrefix = options.namingRule.trim() || options.advancedLabel
    const preview = Array.from({ length: topN }).map((_, index) => {
      const weight = options.advancedLogic.includes('top_n') ? topN - index : index + 1
      const base = Math.max(1, Math.round(segment.count / (topN + 1) * (weight / topN)))
      return {
        name: `${segment.name}_${labelPrefix}_${index + 1}`,
        count: Math.min(segment.count, base),
        ratio: Number(((Math.min(segment.count, base) / segment.count) * 100).toFixed(2)),
        inheritedGroupNames: groupNames,
      }
    })
    return resolveMock({ ok: true, message: '已按高级拆包标签生成预览，保存后将异步产出子包。', preview })
  }

  if (strategy === 'limit_package_count') {
    if (!Number.isInteger(packageCount) || packageCount <= 0 || packageCount > 10 || packageCount > segment.count) {
      return resolveMock({ ok: false, message: '包个数必须为正整数，且不大于系统上限和母包数量。', preview: [] })
    }
    const base = Math.floor(segment.count / packageCount)
    const remainder = segment.count % packageCount
    const preview = Array.from({ length: packageCount }).map((_, index) => ({
      name: `${segment.name}_${index + 1}`,
      count: base + (index < remainder ? 1 : 0),
      ratio: Number((((base + (index < remainder ? 1 : 0)) / segment.count) * 100).toFixed(2)),
      inheritedGroupNames: groupNames,
    }))
    return resolveMock({ ok: true, message: '已按包个数平均预览，余数按顺序分配。', preview })
  }

  if (!packages.length) {
    return resolveMock({ ok: false, message: '至少配置 1 个子包。', preview: [] })
  }

  if (packages.some((item) => !item.name.trim())) {
    return resolveMock({ ok: false, message: '子包名称不能为空。', preview: [] })
  }

  if (strategy === 'ratio') {
    const totalRatio = packages.reduce((sum, item) => sum + (item.ratio ?? 0), 0)
    if (totalRatio !== 100 || packages.some((item) => !item.ratio || item.ratio <= 0)) {
      return resolveMock({ ok: false, message: '每个比例必须大于 0，比例总和必须为 100%。', preview: [] })
    }
    let allocated = 0
    const preview = packages.map((item, index) => {
      const count = index === packages.length - 1 ? segment.count - allocated : Math.round(segment.count * ((item.ratio ?? 0) / 100))
      allocated += count
      return { name: item.name, count, ratio: item.ratio ?? 0, inheritedGroupNames: groupNames }
    })
    return resolveMock({ ok: true, message: '已按比例预览，确保总数等于母包数量。', preview })
  }

  if (packages.some((item) => !item.limitCount || item.limitCount <= 0 || !Number.isInteger(item.limitCount))) {
    return resolveMock({ ok: false, message: '每个子包数量上限必须为正整数。', preview: [] })
  }
  let remaining = segment.count
  const preview = packages.map((item) => {
    const count = Math.min(remaining, item.limitCount ?? 0)
    remaining -= count
    return { name: item.name, count, ratio: Number(((count / segment.count) * 100).toFixed(2)), inheritedGroupNames: groupNames }
  })

  return resolveMock({ ok: true, message: remaining > 0 ? `${remaining.toLocaleString()} 个 ID 不进入任何子包。` : '已按数量上限预览。', preview })
}

export const splitSegment = async (
  segmentId: EntityId,
  previewRows: SegmentSplitPreviewRow[],
): Promise<{ ok: boolean; message: string; childIds: EntityId[] }> => {
  const segment = segments.find((item) => item.id === segmentId)
  if (!segment) {
    return resolveMock({ ok: false, message: '母包不存在。', childIds: [] })
  }
  if (!previewRows.length) {
    return resolveMock({ ok: false, message: '请先生成结果预览。', childIds: [] })
  }

  const childIds = previewRows.map((row) => {
    const id = makeId('segment-child')
    const createdAt = now()
    segments.push({
      ...clone(segment),
      id,
      name: row.name,
      description: `由「${segment.name}」拆包生成，子包继承母包分组。`,
      type: 'split_child',
      count: row.count,
      status: 'success',
      updateMode: 'manual',
      scheduledEnabled: false,
      creator: currentUser,
      editor: currentUser,
      createdAt,
      updatedAt: createdAt,
      parentId: segment.id,
      childIds: [],
      permissions: {
        ...segment.permissions,
        canEdit: false,
        canDelete: false,
        canUpdate: false,
        canSplit: false,
        canManageGroup: false,
      },
    })
    return id
  })
  segment.childIds = [...new Set([...segment.childIds, ...childIds])]
  segment.updatedAt = now()
  segmentRunRecords.unshift({
    id: makeId('run-split'),
    segmentId,
    taskType: 'split',
    status: 'success',
    startedAt: segment.updatedAt,
    endedAt: segment.updatedAt,
    count: segment.count,
    durationMs: 120000,
    triggerBy: currentUser.name,
    dependencyView: [{ name: '母包最新版本', status: 'ready', message: '已就绪' }],
  })
  syncGroupCounts()

  return resolveMock({ ok: true, message: '拆包任务已完成，子包已继承母包分组。', childIds })
}

export const downloadUploadTemplate = (inputIdType: string): Promise<{ ok: boolean; message: string; file?: SegmentExportFile }> => {
  const option = segmentIdTypes.find((item) => item.id === inputIdType)
  if (!option) {
    return resolveMock({ ok: false, message: '请先选择录入 ID 类型。' })
  }
  const content = toCsv(
    ['id_type', 'id_value', 'remark'],
    [
      [option.id, `${option.id}_100001`, '示例 ID，请删除后上传真实 ID'],
      [option.id, `${option.id}_100002`, '每行一个 ID，支持 txt/csv'],
    ],
  )
  return resolveMock({
    ok: true,
    message: '上传模板已生成。',
    file: {
      fileName: `segment_upload_template_${option.id}.csv`,
      mimeType: 'text/csv;charset=utf-8',
      content,
    },
  })
}

export const downloadSegmentPackage = (segmentId: EntityId, request: SegmentDownloadRequest): Promise<{ ok: boolean; message: string; file?: SegmentExportFile }> => {
  const segment = segments.find((item) => item.id === segmentId && item.status !== 'deleted' && !item.physicalDeleted)
  if (!segment) {
    return resolveMock({ ok: false, message: '分群不存在或已删除。' })
  }
  if (!segment.permissions.canDownload || !segmentPermissionSet.downloadSegment) {
    return resolveMock({ ok: false, message: '暂无下载分群文件权限。' })
  }
  if (request.encrypted && segment.encryptionType === 'none' && !segmentIdTypes.find((item) => item.id === segment.outputIdType)?.encryptionSupported) {
    return resolveMock({ ok: false, message: '当前项目未配置所选加密算法。' })
  }
  const version = request.versionId
    ? segmentVersions.find((item) => item.id === request.versionId && item.segmentId === segmentId)
    : segmentVersions.find((item) => item.segmentId === segmentId && item.isLatest)
  const versionLabel = version ? `v${version.versionNo}` : 'latest'
  const rowCount = Math.min(segment.count, request.format === 'gz' ? 1200 : 600)
  const rows = Array.from({ length: rowCount }).map((_, index) => {
    const rawId = `${segment.outputIdType}_${String(index + 1).padStart(8, '0')}`
    return [protectId(rawId, request), segment.outputIdType, segment.id, version?.id ?? 'latest', request.scope]
  })
  const content = request.format === 'txt'
    ? rows.map((row) => row[0]).join('\n')
    : toCsv(['id', 'id_type', 'segment_id', 'version_id', 'download_scope'], rows)
  const suffix: SegmentDownloadFormat = request.format

  return resolveMock({
    ok: true,
    message: segment.count > rowCount ? `已生成下载文件样例，完整 ${segment.count.toLocaleString('zh-CN')} 条数据将在下载任务中异步产出。` : '分群文件已生成。',
    file: {
      fileName: `${segment.id}_${versionLabel}_${request.encrypted ? 'encrypted' : request.masked ? 'masked' : 'plain'}.${suffix}`,
      mimeType: request.format === 'csv' ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8',
      content,
    },
  }, 420)
}

export const exportRunRecords = (segmentId: EntityId, records: SegmentRunRecord[]): SegmentExportFile => ({
  fileName: `${segmentId}_run_records.csv`,
  mimeType: 'text/csv;charset=utf-8',
  content: toCsv(
    ['task_id', 'task_type', 'status', 'count', 'started_at', 'ended_at', 'duration_ms', 'trigger_by', 'error_message'],
    records.map((record) => [
      record.id,
      segmentRunTypeLabels[record.taskType],
      segmentRunStatusLabels[record.status],
      record.count ?? '',
      record.startedAt,
      record.endedAt ?? '',
      record.durationMs ?? '',
      record.triggerBy,
      record.errorMessage ?? '',
    ]),
  ),
})

export const exportLineage = (segmentId: EntityId, nodes: SegmentLineageNode[]): SegmentExportFile => ({
  fileName: `${segmentId}_lineage.csv`,
  mimeType: 'text/csv;charset=utf-8',
  content: toCsv(
    ['asset_id', 'asset_name', 'asset_type', 'direction', 'level', 'relation_type', 'owner', 'updated_at'],
    nodes.map((node) => [
      node.assetId,
      node.assetName,
      segmentLineageAssetLabels[node.assetType],
      segmentLineageDirectionLabels[node.direction],
      node.level,
      node.relationType,
      node.owner.name,
      node.updatedAt,
    ]),
  ),
})

export const completeRunRecord = (runId: EntityId): Promise<{ ok: boolean; message: string; segmentId?: EntityId }> => {
  const run = segmentRunRecords.find((item) => item.id === runId)
  if (!run) {
    return resolveMock({ ok: false, message: '运行任务不存在。' })
  }
  const segment = segments.find((item) => item.id === run.segmentId)
  if (!segment) {
    return resolveMock({ ok: false, message: '分群不存在。' })
  }
  if (run.status === 'waiting' && run.dependencyView.some((item) => item.status !== 'ready')) {
    return resolveMock({ ok: false, message: '仍有上游依赖未就绪，任务不能完成。' })
  }
  if (run.status === 'failed') {
    run.status = 'running'
    run.errorMessage = undefined
  }
  const endedAt = now()
  run.status = 'success'
  run.endedAt = endedAt
  run.durationMs = run.durationMs ?? Math.max(45000, new Date(endedAt).getTime() - new Date(run.startedAt).getTime())
  run.count = run.count ?? segment.count
  segment.status = 'success'
  segment.count = run.count
  segment.updatedAt = endedAt
  const latestVersion = segmentVersions.find((item) => item.segmentId === segment.id && item.isLatest)
  if (latestVersion) {
    latestVersion.status = 'success'
    latestVersion.endedAt = endedAt
    latestVersion.count = segment.count
  }

  return resolveMock({ ok: true, message: '运行任务已刷新为成功状态，最新分群版本已可下载。', segmentId: segment.id })
}

export const retryRunRecord = (runId: EntityId): Promise<{ ok: boolean; message: string; run?: SegmentRunRecord }> => {
  const failedRun = segmentRunRecords.find((item) => item.id === runId)
  if (!failedRun) {
    return resolveMock({ ok: false, message: '运行任务不存在。' })
  }
  if (failedRun.status !== 'failed') {
    return resolveMock({ ok: false, message: '只有失败任务支持重试。' })
  }
  const segment = segments.find((item) => item.id === failedRun.segmentId)
  if (!segment) {
    return resolveMock({ ok: false, message: '分群不存在。' })
  }
  const startedAt = now()
  const retryRun: SegmentRunRecord = {
    ...clone(failedRun),
    id: makeId('run-retry'),
    status: 'running',
    progress: 12,
    startedAt,
    endedAt: undefined,
    durationMs: undefined,
    count: undefined,
    triggerBy: currentUser.name,
    errorMessage: undefined,
    dependencyView: failedRun.dependencyView.map((item) => ({
      ...item,
      status: 'ready',
      message: item.status === 'failed' ? '重试前已补齐分区' : item.message,
    })),
    logEntries: [
      { time: startedAt, level: 'info', message: `从失败任务 ${failedRun.id} 发起重试。` },
      { time: startedAt, level: 'info', message: '依赖重新检查通过，任务已提交调度队列。' },
    ],
  }
  segment.status = 'running'
  segment.updatedAt = startedAt
  segmentRunRecords.unshift(retryRun)

  return resolveMock({ ok: true, message: '失败任务已重试，新的运行任务已生成。', run: retryRun })
}

export const getUserSegments = (): Promise<UserSegment[]> => resolveMock(userSegments)

export const getSegmentsByMetric = (metricId: EntityId): Promise<UserSegment[]> =>
  resolveMock(userSegments.filter((segment) => segment.relatedMetricIds.includes(metricId)))

export const getHighRiskSegments = (): Promise<UserSegment[]> =>
  resolveMock(userSegments.filter((segment) => segment.riskLevel === 'high'))

export const segmentService = {
  applyTemplate,
  authorizeSegments,
  buildPayloadFromSegment,
  buildDefaultCreatePayload,
  calculateSplitPreview,
  completeRunRecord,
  copySegment,
  createGroup,
  createSegment,
  createSegmentFromAdAnalysisExport,
  createSegmentFromLifecycleAnalysis,
  createSegmentFromMultiDimAnalysis,
  deleteGroup,
  deleteSegments,
  downloadSegmentPackage,
  downloadUploadTemplate,
  estimateSegment,
  exportLineage,
  exportRunRecords,
  getHighRiskSegments,
  getSegmentById,
  getSegmentLineage,
  getSegmentRunRecords,
  getSegmentVersions,
  getSegmentWorkbenchData,
  getSegmentsByMetric,
  getUserSegments,
  parseUploadFile,
  retryRunRecord,
  saveTemplate,
  splitSegment,
  triggerSegmentUpdate,
  updateGroup,
  updateSegmentDetail,
  updateSegmentGroups,
  updateSegmentService,
  updateSegmentTtl,
}
