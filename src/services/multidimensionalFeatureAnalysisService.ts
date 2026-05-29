import {
  multiDimAuditLogs,
  multiDimCurrentUser,
  multiDimCurrentUserPrincipalIds,
  multiDimPermissionSet,
  multiDimPrincipals,
  multiDimReports,
  multiDimSavedSegments,
  multiDimSegmentGroups,
  multiDimSegments,
  multiDimSubjects,
  multiDimTags,
} from '@/mock/multidimensionalFeatureAnalysis'
import { segmentService } from '@/services/segmentService'
import type { EntityId, Owner } from '@/types/common'
import type {
  MultiDimActionResult,
  MultiDimAuditAction,
  MultiDimAuditLog,
  MultiDimComboItem,
  MultiDimCreateReportPayload,
  MultiDimEstimateSegmentPayload,
  MultiDimExportType,
  MultiDimFailureReason,
  MultiDimFeatureCombo,
  MultiDimFeatureComboFilters,
  MultiDimPrincipalType,
  MultiDimReport,
  MultiDimReportLabel,
  MultiDimReportPermission,
  MultiDimReportSearchFilters,
  MultiDimReportSearchResult,
  MultiDimReportStatus,
  MultiDimRuntimePermission,
  MultiDimSaveSegmentPayload,
  MultiDimSavedSegment,
  MultiDimSegmentOption,
  MultiDimTagOption,
  MultiDimWorkbenchData,
} from '@/types/multidimensionalFeatureAnalysis'
import type { ProfileSubjectType } from '@/types/profile'

const storageKey = 'multidimensional-feature-analysis-state-v2'
const delay = 140
let hydrated = false

interface PersistedState {
  reports: MultiDimReport[]
  savedSegments: MultiDimSavedSegment[]
  auditLogs: MultiDimAuditLog[]
  segments: MultiDimSegmentOption[]
}

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
    if (state.reports?.length) replaceArray(multiDimReports, state.reports)
    if (state.savedSegments) replaceArray(multiDimSavedSegments, state.savedSegments)
    if (state.auditLogs) replaceArray(multiDimAuditLogs, state.auditLogs.slice(0, 200))
    if (state.segments?.length) replaceArray(multiDimSegments, state.segments)
  } catch {
    window.localStorage.removeItem(storageKey)
  }
}

function persist(): void {
  if (!canUseLocalStorage()) return
  const state: PersistedState = {
    reports: multiDimReports,
    savedSegments: multiDimSavedSegments,
    auditLogs: multiDimAuditLogs.slice(0, 200),
    segments: multiDimSegments,
  }
  window.localStorage.setItem(storageKey, JSON.stringify(state))
}

function auditJson(payload: unknown): string | undefined {
  if (payload === undefined) return undefined
  if (typeof payload === 'string') return payload
  return JSON.stringify(payload, null, 2)
}

function pushAudit(action: MultiDimAuditAction, reportId?: EntityId, targetId?: EntityId, before?: unknown, after?: unknown): void {
  multiDimAuditLogs.unshift({
    id: makeId('audit'),
    userId: multiDimCurrentUser.id,
    action,
    reportId,
    targetId,
    before: auditJson(before),
    after: auditJson(after),
    ip: '127.0.0.1',
    createdAt: now(),
  })
  if (multiDimAuditLogs.length > 200) multiDimAuditLogs.splice(200)
}

function isCreator(report: MultiDimReport): boolean {
  return report.creator.id === multiDimCurrentUser.id
}

function favoriteUserIdsFor(report: MultiDimReport): EntityId[] {
  return report.favoriteUserIds ?? (report.favorite ? [multiDimCurrentUser.id] : [])
}

function isFavoriteByCurrentUser(report: MultiDimReport): boolean {
  return favoriteUserIdsFor(report).includes(multiDimCurrentUser.id)
}

function hasReportGrant(report: MultiDimReport): boolean {
  return report.permissions.some(
    (item) =>
      item.permission === 'view' &&
      (multiDimCurrentUserPrincipalIds.includes(item.authId) || item.authName === multiDimCurrentUser.name),
  )
}

function runtimePermissionFor(report: MultiDimReport): MultiDimRuntimePermission {
  const canView = multiDimPermissionSet.viewReport && (isCreator(report) || multiDimPermissionSet.projectAdmin || hasReportGrant(report))
  const canMutate = canView && multiDimPermissionSet.mutateReport && (isCreator(report) || multiDimPermissionSet.projectAdmin)
  return {
    canView,
    canMutate,
    canDelete: canMutate,
    canAuthorize: canMutate,
    canSaveSegment: canView && multiDimPermissionSet.createSegment,
  }
}

function decorateReport(report: MultiDimReport): MultiDimReport {
  syncReportInvalidState(report)
  return {
    ...report,
    favoriteUserIds: favoriteUserIdsFor(report),
    favorite: isFavoriteByCurrentUser(report),
    runtimePermission: runtimePermissionFor(report),
  }
}

function subjectName(subjectType: ProfileSubjectType): string {
  return multiDimSubjects.find((subject) => subject.type === subjectType)?.name ?? '用户'
}

function visibleReports(): MultiDimReport[] {
  return multiDimReports
    .map(decorateReport)
    .filter((report) => report.runtimePermission.canView)
}

function matchesFilters(report: MultiDimReport, filters: MultiDimReportSearchFilters): boolean {
  const keyword = normalize(filters.keyword)
  const keywordMatch =
    !keyword ||
    normalize(report.name).includes(keyword) ||
    normalize(report.positiveSegmentName).includes(keyword) ||
    normalize(report.negativeSourceSegmentName).includes(keyword) ||
    normalize(report.creator.name).includes(keyword)
  const createdByMeMatch = !filters.createdByMe || report.creator.id === multiDimCurrentUser.id
  const favoriteMatch = !filters.favoriteByMe || isFavoriteByCurrentUser(report)
  const sharedMatch = !filters.sharedToMe || (!isCreator(report) && hasReportGrant(report))
  const statusMatch = !filters.statuses.length || filters.statuses.includes(report.status)
  const subjectMatch = !filters.subjectTypes.length || filters.subjectTypes.includes(report.subjectType)
  return keywordMatch && createdByMeMatch && favoriteMatch && sharedMatch && statusMatch && subjectMatch
}

function paginate<T>(rows: T[], page: number, pageSize: number): T[] {
  return rows.slice((page - 1) * pageSize, page * pageSize)
}

function findSegment(segmentId?: EntityId | ''): MultiDimSegmentOption | undefined {
  if (!segmentId) return undefined
  return multiDimSegments.find((segment) => segment.id === segmentId)
}

function findTag(tagId: EntityId): MultiDimTagOption | undefined {
  return multiDimTags.find((tag) => tag.id === tagId)
}

function availableSegments(subjectType: ProfileSubjectType): MultiDimSegmentOption[] {
  return multiDimSegments.filter((segment) => segment.subjectType === subjectType && segment.permission && segment.status !== 'deleted')
}

function availableTags(subjectType: ProfileSubjectType): MultiDimTagOption[] {
  return multiDimTags.filter((tag) => tag.subjectType === subjectType && tag.permission && tag.status === 'available')
}

function resourceInvalidReason(report: MultiDimReport): string | undefined {
  const positiveSegment = findSegment(report.positiveSegmentId)
  if (!positiveSegment || positiveSegment.status === 'deleted' || positiveSegment.status === 'invalid') {
    return '引用的正显著分群已删除或不可用，报告结果按失效状态展示。'
  }

  if (report.negativeType !== 'population_random') {
    const negativeSegment = findSegment(report.negativeSourceSegmentId)
    if (!negativeSegment || negativeSegment.status === 'deleted' || negativeSegment.status === 'invalid') {
      return '引用的负显著分群已删除或不可用，报告结果按失效状态展示。'
    }
  }

  return undefined
}

function syncReportInvalidState(report: MultiDimReport): void {
  if (report.status === 'deleted' || report.status === 'calculating') return
  const invalidReason = resourceInvalidReason(report)
  if (!invalidReason) return
  report.status = 'invalid'
  report.invalidReason = invalidReason
  report.finishedAt = report.finishedAt ?? now()
}

function validateSegmentForUse(segment: MultiDimSegmentOption | undefined, label: string, subjectType: ProfileSubjectType): string | undefined {
  if (!segment) return `请选择${label}`
  if (!segment.permission) return `暂无${label}权限`
  if (segment.status === 'deleted' || segment.status === 'invalid') return `当前${label}已删除或不可用`
  if (segment.status === 'empty' || segment.count <= 0) return `当前${label}人数为0，请更换分群`
  if (segment.subjectType !== subjectType) return `${label}主体必须与报告主体一致`
  return undefined
}

function validateAuthObjects(payload: MultiDimCreateReportPayload['authObjects']): string | undefined {
  const seen = new Set<string>()
  for (const auth of payload) {
    if (!auth.id || !auth.name) return '授权对象不能为空'
    const key = `${auth.type}:${auth.id}`
    if (seen.has(key)) return '同一对象不能重复授权'
    seen.add(key)
  }
  return undefined
}

function validateCreatePayload(payload: MultiDimCreateReportPayload): string | undefined {
  if (!multiDimPermissionSet.mutateReport) return '暂无创建多维特征分析报告权限'
  if (!payload.name.trim()) return '请输入任务名称'
  if (payload.name.trim().length > 100) return '任务名称最多 100 个字'
  if (!payload.subjectType) return '请选择主体'
  const subject = multiDimSubjects.find((item) => item.type === payload.subjectType && item.permission)
  if (!subject) return '当前项目暂无可分析主体'
  if (!availableSegments(payload.subjectType).length) return '当前暂无可用分群，请先创建或申请分群权限'
  if (!availableTags(payload.subjectType).length) return '当前暂无可参与分析的标签，请联系管理员配置标签权限'
  const positiveSegment = findSegment(payload.positiveSegmentId)
  const positiveError = validateSegmentForUse(positiveSegment, '正显著分群', payload.subjectType)
  if (positiveError) return positiveError

  if (payload.negativeType === 'segment_random' || payload.negativeType === 'custom_segment') {
    const label = payload.negativeType === 'segment_random' ? '指定分群' : '负样本分群'
    const negativeSegment = findSegment(payload.negativeSourceSegmentId)
    const negativeError = validateSegmentForUse(negativeSegment, label, payload.subjectType)
    if (negativeError) return negativeError
    if (payload.negativeType === 'segment_random' && negativeSegment && positiveSegment && negativeSegment.count - Math.round(positiveSegment.count * 0.18) <= 0) {
      return '指定分群剔除正样本后人数不足，请更换分群或选择其他负样本方式'
    }
    if (payload.negativeType === 'custom_segment' && negativeSegment?.id === positiveSegment?.id) {
      return '剔除重叠用户后负样本为空，请更换负样本分群'
    }
  }

  const selectedTags = payload.selectedTagIds.map(findTag).filter(Boolean) as MultiDimTagOption[]
  if (selectedTags.length === 0) return '请选择参与分析标签'
  if (selectedTags.length > 200) return '最多可选择200个标签参与分析'
  const unavailableTag = selectedTags.find((tag) => tag.subjectType !== payload.subjectType || !tag.permission || tag.status !== 'available')
  if (unavailableTag) return `标签「${unavailableTag.name}」不可参与分析`
  if (![1, 2, 3].includes(payload.comboValueCount)) return '输出特征组合标签值数量必须为 1、2 或 3'
  return validateAuthObjects(payload.authObjects)
}

function reportLabel(reportId: EntityId, tag: MultiDimTagOption, sourceType = tag.sourceType): MultiDimReportLabel {
  return {
    id: makeId('report-label'),
    reportId,
    tagId: tag.id,
    tagName: tag.name,
    directory: tag.directory,
    tagType: tag.tagType,
    sourceType,
    permission: tag.permission,
    status: tag.status,
    createdAt: now(),
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function comboItem(tag: MultiDimTagOption, seed: number): MultiDimComboItem {
  return {
    tagId: tag.id,
    tagName: tag.name,
    tagValue: tag.values[seed % tag.values.length] ?? '有值',
    directory: tag.directory,
    tagType: tag.tagType,
    permission: tag.permission,
  }
}

function buildFeatureCombos(report: MultiDimReport): MultiDimFeatureCombo[] {
  const tags = report.labels
    .map((label) => findTag(label.tagId))
    .filter((tag): tag is MultiDimTagOption => Boolean(tag && tag.permission && tag.status === 'available'))
    .slice(0, 8)
  const groups: MultiDimComboItem[][] = []

  tags.forEach((tag, index) => {
    groups.push([comboItem(tag, index)])
  })
  if (report.comboValueCount >= 2) {
    for (let i = 0; i < tags.length; i += 1) {
      const left = tags[i]
      if (!left) continue
      for (let j = i + 1; j < tags.length; j += 1) {
        const right = tags[j]
        if (!right) continue
        groups.push([comboItem(left, i + j), comboItem(right, j + 1)])
      }
    }
  }
  if (report.comboValueCount >= 3) {
    for (let i = 0; i < tags.length; i += 1) {
      const first = tags[i]
      if (!first) continue
      for (let j = i + 1; j < tags.length; j += 1) {
        const second = tags[j]
        if (!second) continue
        for (let k = j + 1; k < tags.length; k += 1) {
          const third = tags[k]
          if (!third) continue
          groups.push([comboItem(first, i + k), comboItem(second, j + k), comboItem(third, k + 2)])
        }
      }
    }
  }

  const positiveTotal = Math.max(report.positiveSegmentCount, 1)
  return groups.slice(0, 40).map((items, index) => {
    const complexityBoost = items.length * 0.035
    const precisionRate = clamp(0.58 + complexityBoost + ((index * 17) % 18) / 100, 0.38, 0.94)
    const recallRate = clamp(0.08 + (tags.length - items.length) * 0.026 + ((index * 11) % 16) / 100, 0.03, 0.58)
    const score = Number((precisionRate * 0.8 + recallRate * 0.2).toFixed(4))
    const positiveHitCount = Math.max(12, Math.round(positiveTotal * recallRate))
    const negativeHitCount = Math.max(1, Math.round((positiveHitCount * (1 - precisionRate)) / precisionRate))
    const expansionFactor = items.length === 1 ? 6.4 : items.length === 2 ? 4.1 : 2.7
    return {
      id: makeId('combo'),
      reportId: report.id,
      comboItems: items,
      score,
      precisionRate: Number(precisionRate.toFixed(4)),
      recallRate: Number(recallRate.toFixed(4)),
      positiveHitCount,
      negativeHitCount,
      expandedCount: Math.round(positiveHitCount * expansionFactor + negativeHitCount * 1.8),
      rankNo: 0,
    }
  })
    .sort((a, b) => b.score - a.score)
    .map((combo, index) => ({ ...combo, rankNo: index + 1 }))
}

function buildInterpretation(report: MultiDimReport): MultiDimReport['interpretation'] {
  const top = report.featureCombos[0]
  if (!top) return undefined
  const comboText = top.comboItems.map((item) => `${item.tagName}=${item.tagValue}`).join('、')
  return {
    topComboId: top.id,
    title: `${comboText} 是当前正样本人群最显著的特征组合。`,
    expansionDescription: `该组合综合评分 ${top.score.toFixed(3)}，精确率 ${(top.precisionRate * 100).toFixed(1)}%，在全量私域人群中预计可扩量 ${top.expandedCount.toLocaleString()} 人。`,
    marketingSuggestion:
      `该特征组合在「${report.positiveSegmentName}」中表现显著，且具备一定扩量规模，建议将扩量后人群用于广告投放、私域触达、门店邀约或复购促进。`,
  }
}

function completeCalculatingReport(report: MultiDimReport): void {
  const brokenLabel = report.labels.find((label) => label.status !== 'available' || !label.permission)
  const positiveSegment = findSegment(report.positiveSegmentId)
  if (!positiveSegment || positiveSegment.status === 'deleted' || positiveSegment.status === 'invalid' || positiveSegment.count <= 0) {
    report.status = 'failed'
    report.finishedAt = now()
    report.failureReason = failure('样本校验', '正显著分群为空、已删除或不可用。', '请更换正显著分群后重新发起计算。')
    return
  }
  if (report.negativeType !== 'population_random') {
    const negativeSegment = findSegment(report.negativeSourceSegmentId)
    if (!negativeSegment || negativeSegment.status === 'deleted' || negativeSegment.status === 'invalid' || negativeSegment.count <= 0) {
      report.status = 'failed'
      report.finishedAt = now()
      report.failureReason = failure('样本校验', '负显著分群为空、已删除或不可用。', '请更换负显著分群后重新发起计算。')
      return
    }
    if (negativeSegment.id === positiveSegment.id) {
      report.status = 'failed'
      report.finishedAt = now()
      report.failureReason = failure('样本校验', '正负样本重叠过高，剔除重叠用户后负样本不足。', '请更换负样本分群，或改用大盘随机抽样。')
      return
    }
  }
  if (brokenLabel) {
    report.status = 'failed'
    report.finishedAt = now()
    report.failureReason = failure('标签数据读取', `参与分析标签「${brokenLabel.tagName}」已失效或无权限。`, '请剔除失效标签后重新计算。')
    return
  }
  report.featureCombos = buildFeatureCombos(report)
  if (report.featureCombos.length === 0) {
    report.status = 'failed'
    report.finishedAt = now()
    report.failureReason = failure('候选组合生成', '当前配置下暂无有效特征组合。', '请增加参与分析标签、调整正负样本或降低特征组合复杂度。')
    return
  }
  report.status = 'success'
  report.finishedAt = now()
  report.interpretation = buildInterpretation(report)
  report.failureReason = undefined
}

function failure(stage: string, reason: string, suggestion: string): MultiDimFailureReason {
  return {
    failedAt: now(),
    stage,
    reason,
    suggestion,
  }
}

function permissionFromPrincipal(reportId: EntityId, type: MultiDimPrincipalType, id: EntityId, name: string): MultiDimReportPermission {
  return {
    id: makeId('permission'),
    reportId,
    authType: type,
    authId: id,
    authName: name,
    permission: 'view',
    createdBy: multiDimCurrentUser,
    createdAt: now(),
  }
}

function statusSortValue(status: MultiDimReportStatus): number {
  const order: Record<MultiDimReportStatus, number> = {
    calculating: 4,
    failed: 3,
    invalid: 2,
    success: 1,
    deleted: 0,
  }
  return order[status]
}

function isOutputIdTypeAllowed(report: MultiDimReport, outputIdType: string): boolean {
  const subject = multiDimSubjects.find((item) => item.type === report.subjectType)
  return Boolean(subject?.idTypes.some((item) => item.id === outputIdType))
}

function comboHasUnavailableItem(combo: MultiDimFeatureCombo): boolean {
  return combo.comboItems.some((item) => !item.permission || item.invalid)
}

function estimateCount(payload: MultiDimEstimateSegmentPayload): { ok: boolean; count: number; message: string } {
  const report = multiDimReports.find((item) => item.id === payload.reportId && item.status !== 'deleted')
  if (!report) return { ok: false, count: 0, message: '报告不存在或已删除。' }
  if (!runtimePermissionFor(report).canSaveSegment) return { ok: false, count: 0, message: '暂无创建分群权限，请联系管理员开通。' }
  if (report.status !== 'success') return { ok: false, count: 0, message: '只有计算成功的报告可以存为分群。' }
  if (!isOutputIdTypeAllowed(report, payload.outputIdType)) return { ok: false, count: 0, message: '输出 ID 类型不属于当前报告主体。' }
  const combos = report.featureCombos.filter((combo) => payload.selectedComboIds.includes(combo.id))
  if (!combos.length) return { ok: false, count: 0, message: '请至少选择一个特征组合。' }
  if (combos.length !== payload.selectedComboIds.length) return { ok: false, count: 0, message: '所选特征组合不存在或已失效。' }
  if (combos.some(comboHasUnavailableItem)) return { ok: false, count: 0, message: '所选特征组合包含无权限或失效标签，不能存为分群。' }
  const countKey: keyof MultiDimFeatureCombo = payload.exportType === 'positive_sample' ? 'positiveHitCount' : 'expandedCount'
  const base =
    payload.comboRelation === 'any'
      ? Math.round(combos.reduce((sum, combo) => sum + Number(combo[countKey]), 0) * (combos.length > 1 ? 0.82 : 1))
      : Math.round(Math.min(...combos.map((combo) => Number(combo[countKey]))) * Math.pow(0.62, Math.max(0, combos.length - 1)))
  const idTypeRatio = payload.outputIdType === 'mobile' ? 0.92 : payload.outputIdType === 'device_id' ? 0.86 : 1
  const count = Math.max(0, Math.round(base * idTypeRatio))
  if (count <= 0) return { ok: false, count: 0, message: '当前条件下分群人数为0，请调整组合关系或减少特征组合。' }
  return { ok: true, count, message: '预估成功。' }
}

function reportNegativeDisplay(report: MultiDimReport): string {
  if (report.negativeType === 'population_random') return '大盘随机抽样'
  if (report.negativeType === 'segment_random') return `${report.negativeSourceSegmentName ?? '指定分群'} + 随机抽样`
  return report.negativeSourceSegmentName ?? '自定义分群'
}

export const multidimensionalFeatureAnalysisService = {
  async getWorkbenchData(): Promise<MultiDimWorkbenchData> {
    hydrate()
    return resolveMock({
      currentUser: multiDimCurrentUser,
      permissions: multiDimPermissionSet,
      subjects: multiDimSubjects,
      segments: multiDimSegments,
      tags: multiDimTags,
      principals: multiDimPrincipals,
      segmentGroups: multiDimSegmentGroups,
      reports: visibleReports(),
      savedSegments: multiDimSavedSegments,
      auditLogs: multiDimAuditLogs,
    })
  },

  async searchReports(filters: MultiDimReportSearchFilters): Promise<MultiDimReportSearchResult> {
    hydrate()
    const rows = visibleReports()
      .filter((report) => report.status !== 'deleted' || filters.statuses.includes('deleted'))
      .filter((report) => matchesFilters(report, filters))
      .sort((a, b) => statusSortValue(b.status) - statusSortValue(a.status) || Date.parse(b.createdAt) - Date.parse(a.createdAt))
    return resolveMock({
      rows: paginate(rows, filters.page, filters.pageSize),
      total: rows.length,
      page: filters.page,
      pageSize: filters.pageSize,
    })
  },

  async getReport(reportId: EntityId): Promise<MultiDimReport | undefined> {
    hydrate()
    const report = multiDimReports.find((item) => item.id === reportId && item.status !== 'deleted')
    return resolveMock(report ? decorateReport(report) : undefined)
  },

  async createReport(payload: MultiDimCreateReportPayload): Promise<MultiDimActionResult> {
    hydrate()
    const error = validateCreatePayload(payload)
    if (error) return resolveMock({ ok: false, message: error })
    const subjectType = payload.subjectType as ProfileSubjectType
    const positiveSegment = findSegment(payload.positiveSegmentId) as MultiDimSegmentOption
    const negativeSegment = findSegment(payload.negativeSourceSegmentId)
    const reportId = makeId('report')
    const selectedTags = payload.selectedTagIds.map(findTag).filter((tag): tag is MultiDimTagOption => Boolean(tag))
    const report: MultiDimReport = {
      id: reportId,
      name: payload.name.trim(),
      subjectType,
      subjectName: subjectName(subjectType),
      positiveSegmentId: positiveSegment.id,
      positiveSegmentName: positiveSegment.name,
      positiveSegmentCount: positiveSegment.count,
      positiveSegmentPermission: positiveSegment.permission,
      positiveSegmentStatus: positiveSegment.status,
      negativeType: payload.negativeType,
      negativeSourceSegmentId: negativeSegment?.id,
      negativeSourceSegmentName: negativeSegment?.name,
      negativeSourceSegmentCount: negativeSegment?.count,
      negativeSegmentPermission: negativeSegment?.permission,
      negativeSegmentStatus: negativeSegment?.status,
      negativeGeneratedSegmentName: payload.negativeType === 'population_random' ? '大盘随机抽样' : payload.negativeType === 'segment_random' ? `${negativeSegment?.name ?? '指定分群'}随机抽样` : undefined,
      negativeOverlapRemoved: payload.negativeType === 'population_random' ? Math.round(positiveSegment.count * 0.08) : payload.negativeSourceSegmentId ? Math.round(positiveSegment.count * 0.12) : 0,
      comboValueCount: payload.comboValueCount,
      status: 'calculating',
      creator: multiDimCurrentUser,
      createdAt: now(),
      favorite: false,
      favoriteUserIds: [],
      labels: selectedTags.map((tag) => reportLabel(reportId, tag, payload.labelSelectionMode)),
      featureCombos: [],
      permissions: payload.authObjects.map((item) => permissionFromPrincipal(reportId, item.type, item.id, item.name)),
      runtimePermission: { canView: true, canMutate: true, canDelete: true, canAuthorize: true, canSaveSegment: multiDimPermissionSet.createSegment },
      taskId: makeId('task'),
      pollCount: 0,
    }
    multiDimReports.unshift(report)
    pushAudit('create_report', report.id, undefined, undefined, report)
    persist()
    return resolveMock({ ok: true, id: report.id, message: '报告已创建，计算任务已发起。' })
  },

  async updateReport(reportId: EntityId, payload: MultiDimCreateReportPayload): Promise<MultiDimActionResult> {
    hydrate()
    const report = multiDimReports.find((item) => item.id === reportId && item.status !== 'deleted')
    if (!report) return resolveMock({ ok: false, message: '报告不存在或已删除。' })
    if (!runtimePermissionFor(report).canMutate) return resolveMock({ ok: false, message: '暂无编辑该报告的权限。' })
    const error = validateCreatePayload(payload)
    if (error) return resolveMock({ ok: false, message: error })

    const before = clone(report)
    const subjectType = payload.subjectType as ProfileSubjectType
    const positiveSegment = findSegment(payload.positiveSegmentId) as MultiDimSegmentOption
    const negativeSegment = findSegment(payload.negativeSourceSegmentId)
    const selectedTags = payload.selectedTagIds.map(findTag).filter((tag): tag is MultiDimTagOption => Boolean(tag))

    report.name = payload.name.trim()
    report.subjectType = subjectType
    report.subjectName = subjectName(subjectType)
    report.positiveSegmentId = positiveSegment.id
    report.positiveSegmentName = positiveSegment.name
    report.positiveSegmentCount = positiveSegment.count
    report.positiveSegmentPermission = positiveSegment.permission
    report.positiveSegmentStatus = positiveSegment.status
    report.negativeType = payload.negativeType
    report.negativeSourceSegmentId = payload.negativeType === 'population_random' ? undefined : negativeSegment?.id
    report.negativeSourceSegmentName = payload.negativeType === 'population_random' ? undefined : negativeSegment?.name
    report.negativeSourceSegmentCount = payload.negativeType === 'population_random' ? undefined : negativeSegment?.count
    report.negativeSegmentPermission = payload.negativeType === 'population_random' ? undefined : negativeSegment?.permission
    report.negativeSegmentStatus = payload.negativeType === 'population_random' ? undefined : negativeSegment?.status
    report.negativeGeneratedSegmentName =
      payload.negativeType === 'population_random'
        ? '大盘随机抽样'
        : payload.negativeType === 'segment_random'
          ? `${negativeSegment?.name ?? '指定分群'}随机抽样`
          : undefined
    report.negativeOverlapRemoved =
      payload.negativeType === 'population_random'
        ? Math.round(positiveSegment.count * 0.08)
        : payload.negativeSourceSegmentId
          ? Math.round(positiveSegment.count * 0.12)
          : 0
    report.comboValueCount = payload.comboValueCount
    report.status = 'calculating'
    report.finishedAt = undefined
    report.deletedAt = undefined
    report.labels = selectedTags.map((tag) => reportLabel(reportId, tag, payload.labelSelectionMode))
    report.featureCombos = []
    report.interpretation = undefined
    report.permissions = payload.authObjects.map((item) => permissionFromPrincipal(reportId, item.type, item.id, item.name))
    report.runtimePermission = runtimePermissionFor(report)
    report.failureReason = undefined
    report.invalidReason = undefined
    report.taskId = makeId('task')
    report.pollCount = 0
    report.favorite = isFavoriteByCurrentUser(report)

    pushAudit('edit_report', report.id, undefined, before, report)
    persist()
    return resolveMock({ ok: true, id: report.id, message: '报告已保存，计算任务已重新发起。' })
  },

  async pollReport(reportId: EntityId): Promise<MultiDimReport | undefined> {
    hydrate()
    const report = multiDimReports.find((item) => item.id === reportId && item.status !== 'deleted')
    if (!report) return resolveMock(undefined)
    if (report.status === 'calculating') {
      report.pollCount = (report.pollCount ?? 0) + 1
      if (report.pollCount >= 2) {
        completeCalculatingReport(report)
      }
      persist()
    }
    return resolveMock(decorateReport(report), 120)
  },

  async recalculateReport(reportId: EntityId): Promise<MultiDimActionResult> {
    hydrate()
    const report = multiDimReports.find((item) => item.id === reportId && item.status !== 'deleted')
    if (!report) return resolveMock({ ok: false, message: '报告不存在或已删除。' })
    if (!runtimePermissionFor(report).canMutate) return resolveMock({ ok: false, message: '暂无重新计算该报告的权限。' })
    const before = clone(report)
    report.status = 'calculating'
    report.taskId = makeId('task')
    report.pollCount = 0
    report.featureCombos = []
    report.interpretation = undefined
    report.failureReason = undefined
    report.finishedAt = undefined
    pushAudit('recalculate_report', report.id, undefined, before, report)
    persist()
    return resolveMock({ ok: true, id: report.id, message: '已重新发起计算。' })
  },

  async deleteReport(reportId: EntityId): Promise<MultiDimActionResult> {
    hydrate()
    const report = multiDimReports.find((item) => item.id === reportId)
    if (!report) return resolveMock({ ok: false, message: '报告不存在。' })
    if (!runtimePermissionFor(report).canDelete) return resolveMock({ ok: false, message: '只有报告创建者或项目管理员可以删除报告。' })
    const before = clone(report)
    report.status = 'deleted'
    report.deletedAt = now()
    report.favorite = false
    report.favoriteUserIds = []
    report.permissions = []
    pushAudit('delete_report', report.id, undefined, before, report)
    persist()
    return resolveMock({ ok: true, id: report.id, message: '报告已删除，授权关系和收藏关系已同步失效。' })
  },

  async toggleFavorite(reportId: EntityId): Promise<MultiDimActionResult> {
    hydrate()
    const report = multiDimReports.find((item) => item.id === reportId && item.status !== 'deleted')
    if (!report) return resolveMock({ ok: false, message: '报告不存在或已删除。' })
    const before = clone(favoriteUserIdsFor(report))
    const next = new Set(before)
    if (next.has(multiDimCurrentUser.id)) next.delete(multiDimCurrentUser.id)
    else next.add(multiDimCurrentUser.id)
    report.favoriteUserIds = [...next]
    report.favorite = report.favoriteUserIds.includes(multiDimCurrentUser.id)
    pushAudit(report.favorite ? 'favorite_report' : 'unfavorite_report', report.id, undefined, before, report.favoriteUserIds)
    persist()
    return resolveMock({ ok: true, id: report.id, message: report.favorite ? '已收藏报告。' : '已取消收藏。' }, 80)
  },

  async updatePermissions(reportId: EntityId, permissions: MultiDimReportPermission[]): Promise<MultiDimActionResult> {
    hydrate()
    const report = multiDimReports.find((item) => item.id === reportId && item.status !== 'deleted')
    if (!report) return resolveMock({ ok: false, message: '报告不存在或已删除。' })
    if (!runtimePermissionFor(report).canAuthorize) return resolveMock({ ok: false, message: '暂无授权该报告的权限。' })
    const seen = new Set<string>()
    for (const permission of permissions) {
      if (permission.permission !== 'view') return resolveMock({ ok: false, message: '多维特征分析报告授权仅支持查看权限。' })
      const key = `${permission.authType}:${permission.authId}`
      if (seen.has(key)) return resolveMock({ ok: false, message: '同一对象不能重复授权。' })
      seen.add(key)
    }
    const before = clone(report.permissions)
    const beforeKeys = new Set(before.map((permission) => `${permission.authType}:${permission.authId}`))
    report.permissions = permissions.map((permission) => ({ ...permission, reportId, permission: 'view' }))
    const afterKeys = new Set(report.permissions.map((permission) => `${permission.authType}:${permission.authId}`))
    const hasGranted = report.permissions.some((permission) => !beforeKeys.has(`${permission.authType}:${permission.authId}`))
    const hasRevoked = before.some((permission) => !afterKeys.has(`${permission.authType}:${permission.authId}`))
    if (hasGranted) pushAudit('grant_report', report.id, undefined, before, report.permissions)
    if (hasRevoked) pushAudit('revoke_report', report.id, undefined, before, report.permissions)
    if (!hasGranted && !hasRevoked) pushAudit('grant_report', report.id, undefined, before, report.permissions)
    persist()
    return resolveMock({ ok: true, id: report.id, message: '授权配置已保存，被授权对象仅可查看报告。' })
  },

  async estimateSegment(payload: MultiDimEstimateSegmentPayload): Promise<{ ok: boolean; count: number; message: string }> {
    hydrate()
    return resolveMock(estimateCount(payload), 360)
  },

  async saveSegment(payload: MultiDimSaveSegmentPayload): Promise<MultiDimActionResult> {
    hydrate()
    if (!multiDimPermissionSet.createSegment) return resolveMock({ ok: false, message: '暂无创建分群权限，请联系管理员开通。' })
    if (!payload.selectedComboIds.length) return resolveMock({ ok: false, message: '请至少选择一个特征组合。' })
    if (!payload.segmentName.trim()) return resolveMock({ ok: false, message: '请输入分群名称。' })
    if (payload.segmentName.trim().length > 100) return resolveMock({ ok: false, message: '分群名称最多 100 个字。' })
    if (!payload.outputIdType) return resolveMock({ ok: false, message: '请选择输出 ID 类型。' })
    if (!payload.exportType) return resolveMock({ ok: false, message: '请选择导出人群类型。' })
    if (!payload.comboRelation) return resolveMock({ ok: false, message: '请选择组合关系。' })
    const authError = validateAuthObjects(payload.authObjects)
    if (authError) return resolveMock({ ok: false, message: authError })
    if (payload.groupIds.some((groupId) => !multiDimSegmentGroups.some((group) => group.id === groupId))) return resolveMock({ ok: false, message: '分组不存在或已删除。' })
    const report = multiDimReports.find((item) => item.id === payload.reportId)
    if (!report) return resolveMock({ ok: false, message: '报告不存在。' })
    if (!runtimePermissionFor(report).canSaveSegment) return resolveMock({ ok: false, message: '暂无创建分群权限，请联系管理员开通。' })
    const estimate = estimateCount(payload)
    if (!estimate.ok) return resolveMock({ ok: false, message: estimate.message })
    const groupIds = payload.groupIds.length ? payload.groupIds : ['group-growth']
    const segmentId = makeId('segment-from-multidim')
    const segment: MultiDimSegmentOption = {
      id: segmentId,
      name: payload.segmentName.trim(),
      subjectType: report.subjectType,
      subjectName: report.subjectName,
      outputIdType: payload.outputIdType,
      groupId: groupIds[0] ?? 'group-growth',
      groupName: multiDimSegmentGroups.find((group) => group.id === groupIds[0])?.name ?? '增长运营',
      count: estimate.count,
      status: 'available',
      permission: true,
      updatedAt: now(),
    }
    segmentService.createSegmentFromMultiDimAnalysis({
      id: segment.id,
      name: segment.name,
      description: payload.description,
      subjectType: report.subjectType,
      subjectName: report.subjectName,
      outputIdType: payload.outputIdType,
      count: estimate.count,
      groupIds,
      authObjects: payload.authObjects,
      creator: multiDimCurrentUser,
      sourceReportId: report.id,
      sourceReportName: report.name,
      selectedComboIds: payload.selectedComboIds,
      exportType: payload.exportType,
      comboRelation: payload.comboRelation,
    })
    const saved: MultiDimSavedSegment = {
      id: makeId('saved-segment'),
      reportId: payload.reportId,
      segmentId,
      segmentName: segment.name,
      segmentCount: estimate.count,
      exportType: payload.exportType,
      comboRelation: payload.comboRelation,
      selectedComboIds: payload.selectedComboIds,
      createdBy: multiDimCurrentUser,
      createdAt: now(),
    }
    multiDimSegments.unshift(segment)
    multiDimSavedSegments.unshift(saved)
    pushAudit('save_segment', payload.reportId, segmentId, payload, saved)
    persist()
    return resolveMock({ ok: true, id: segmentId, message: '分群保存成功，可前往用户分群模块查看和编辑。' })
  },

  async recordFailureReasonView(reportId: EntityId): Promise<void> {
    hydrate()
    pushAudit('view_failure_reason', reportId)
    persist()
    return resolveMock(undefined, 40)
  },

  async recordSegmentJump(reportId: EntityId, segmentId?: EntityId): Promise<void> {
    hydrate()
    pushAudit('jump_segment', reportId, segmentId)
    persist()
    return resolveMock(undefined, 40)
  },

  makePermission(reportId: EntityId, principalType: MultiDimPrincipalType, principalId: EntityId, principalName: string, createdBy: Owner = multiDimCurrentUser): MultiDimReportPermission {
    return {
      id: makeId('permission'),
      reportId,
      authType: principalType,
      authId: principalId,
      authName: principalName,
      permission: 'view',
      createdBy,
      createdAt: now(),
    }
  },

  filterFeatureCombos(rows: MultiDimFeatureCombo[], filters: MultiDimFeatureComboFilters): MultiDimFeatureCombo[] {
    const keyword = normalize(filters.valueKeyword)
    return rows.filter((combo) => {
      const scoreMatch = (filters.scoreMin === null || combo.score >= filters.scoreMin) && (filters.scoreMax === null || combo.score <= filters.scoreMax)
      const precisionMatch =
        (filters.precisionMin === null || combo.precisionRate * 100 >= filters.precisionMin) &&
        (filters.precisionMax === null || combo.precisionRate * 100 <= filters.precisionMax)
      const recallMatch =
        (filters.recallMin === null || combo.recallRate * 100 >= filters.recallMin) &&
        (filters.recallMax === null || combo.recallRate * 100 <= filters.recallMax)
      const positiveMatch =
        (filters.positiveCountMin === null || combo.positiveHitCount >= filters.positiveCountMin) &&
        (filters.positiveCountMax === null || combo.positiveHitCount <= filters.positiveCountMax)
      const expandedMatch =
        (filters.expandedCountMin === null || combo.expandedCount >= filters.expandedCountMin) &&
        (filters.expandedCountMax === null || combo.expandedCount <= filters.expandedCountMax)
      const tagMatch = !filters.tagNames.length || combo.comboItems.some((item) => filters.tagNames.includes(item.tagName))
      const valueMatch = !keyword || combo.comboItems.some((item) => normalize(`${item.tagName}${item.tagValue}`).includes(keyword))
      return scoreMatch && precisionMatch && recallMatch && positiveMatch && expandedMatch && tagMatch && valueMatch
    })
  },

  reportNegativeDisplay,
}

export const multiDimReportStatusLabels: Record<MultiDimReportStatus, string> = {
  calculating: '计算中',
  success: '计算成功',
  failed: '计算失败',
  deleted: '已删除',
  invalid: '已失效',
}

export const multiDimReportStatusTagTypes: Record<MultiDimReportStatus, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  calculating: 'info',
  success: 'success',
  failed: 'error',
  deleted: 'default',
  invalid: 'warning',
}

export const multiDimNegativeTypeLabels: Record<MultiDimReport['negativeType'], string> = {
  population_random: '大盘随机抽样',
  segment_random: '指定分群随机抽样',
  custom_segment: '自定义分群',
}

export const multiDimExportTypeLabels: Record<MultiDimExportType, string> = {
  positive_sample: '正样本人群',
  expanded_population: '扩量后人群',
}
