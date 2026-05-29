import dayjs from 'dayjs'
import {
  lifecycleAuditLogs,
  lifecycleAuthorizations,
  lifecycleBackendAuditRecords,
  lifecycleBusinessCharts,
  lifecycleEventOptions,
  lifecycleExportSegmentLogs,
  lifecycleOutputIdTypes,
  lifecyclePaths,
  lifecyclePermissionSet,
  lifecycleProjectAuthorizationLinks,
  lifecycleReports,
  lifecycleSegmentGroups,
  lifecycleStageSnapshots,
  lifecycleTargetSegments,
} from '@/mock/lifecycleAnalysis'
import { tagDefinitions, tagPermissions } from '@/mock/tags'
import { groupProfileInsightService } from '@/services/groupProfileInsightService'
import { segmentService } from '@/services/segmentService'
import { tagService } from '@/services/tagService'
import type { EntityId, Owner } from '@/types/common'
import type {
  LifecycleAuditLog,
  LifecycleAuthorization,
  LifecycleBackendAuditRecord,
  LifecycleBackendAuditResourceType,
  LifecycleBusinessChart,
  LifecycleChartDownloadFile,
  LifecycleChartFilterCondition,
  LifecycleChartFilterOperator,
  LifecycleBusinessChartDataRow,
  LifecycleCrowdRange,
  LifecycleExportSegmentLog,
  LifecycleExportSegmentPayload,
  LifecycleExportSegmentResult,
  LifecycleFilterOptions,
  LifecycleInsightPayload,
  LifecycleInsightResult,
  LifecyclePath,
  LifecyclePathEdge,
  LifecyclePathNode,
  LifecyclePathPayload,
  LifecyclePermissionType,
  LifecycleProjectAuthorizationLink,
  LifecycleReport,
  LifecycleReportStatus,
  LifecycleResourcePermissionSnapshot,
  LifecycleReportSearchFilters,
  LifecycleReportSearchResult,
  LifecycleStageSnapshot,
  LifecycleTransitionEdge,
  LifecycleTransitionResult,
  LifecycleTrendMetric,
  LifecycleTrendPoint,
} from '@/types/lifecycleAnalysis'
import type { TagDefinition } from '@/types/tag'

const delay = 180
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const resolveMock = <T>(payload: T, timeout = delay): Promise<T> =>
  new Promise((resolve) => {
    window.setTimeout(() => resolve(clone(payload)), timeout)
  })

const makeId = (prefix: string): string => `${prefix}-${Date.now()}-${Math.round(Math.random() * 10000)}`
const formatDate = (date: dayjs.Dayjs): string => date.format('YYYY-MM-DD')
const now = (): string => new Date().toISOString()

const allLifecycleEventNames = lifecycleEventOptions.map((event) => event.value)
const allLifecycleSegmentIds = lifecycleTargetSegments.map((segment) => segment.value)

const defaultResourcePermissions = (report: LifecycleReport): LifecycleResourcePermissionSnapshot => ({
  allowedSubjectTypes: [report.subjectType],
  allowedTagIds: [report.tagId],
  allowedEventNames: allLifecycleEventNames,
  allowedSegmentIds: allLifecycleSegmentIds,
  rowAccessRatio: 1,
  projectAuthorizationId: `project-auth-${report.id}`,
  projectAuthorizationName: '项目中心 / 按内容管理 / 生命周期分析资源',
  syncedAt: now(),
  deniedReasons: {},
})

const ensureResourcePermissions = (report: LifecycleReport): LifecycleResourcePermissionSnapshot => {
  if (!report.resourcePermissions) {
    report.resourcePermissions = defaultResourcePermissions(report)
  }
  return report.resourcePermissions
}

const hasSubjectAccess = (report: LifecycleReport): boolean => {
  const resourcePermissions = ensureResourcePermissions(report)
  return resourcePermissions.allowedSubjectTypes.includes(report.subjectType)
}

const hasTagAccess = (report: LifecycleReport, tagId?: EntityId): boolean => {
  if (!tagId) return true
  return ensureResourcePermissions(report).allowedTagIds.includes(tagId)
}

const hasEventAccess = (report: LifecycleReport, eventName?: string): boolean => {
  if (!eventName) return true
  return ensureResourcePermissions(report).allowedEventNames.includes(eventName)
}

const hasSegmentAccess = (report: LifecycleReport, segmentId?: EntityId): boolean => {
  if (!segmentId) return true
  return ensureResourcePermissions(report).allowedSegmentIds.includes(segmentId)
}

const hasStageAccess = (report: LifecycleReport, stageValue: string): boolean => {
  const resourcePermissions = ensureResourcePermissions(report)
  return hasTagAccess(report, report.tagId) && (!resourcePermissions.allowedStageValues?.length || resourcePermissions.allowedStageValues.includes(stageValue))
}

const applyRowAccess = (report: LifecycleReport, value: number): number => Math.max(0, Math.round(value * ensureResourcePermissions(report).rowAccessRatio))

const applySnapshotPermissions = (report: LifecycleReport, snapshot: LifecycleStageSnapshot): LifecycleStageSnapshot => ({
  ...snapshot,
  totalCount: applyRowAccess(report, snapshot.totalCount),
  previousTotalCount: applyRowAccess(report, snapshot.previousTotalCount),
  newCount: applyRowAccess(report, snapshot.newCount),
  lostCount: applyRowAccess(report, snapshot.lostCount),
})

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const sanitizeFileName = (value: string): string => value.replace(/[\\/:*?"<>|]/g, '_').slice(0, 80) || '生命周期分析'

const buildExcelHtml = (title: string, metaRows: string[][], headers: string[], rows: string[][]): string => `
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      table { border-collapse: collapse; font-family: Arial, sans-serif; }
      th, td { border: 1px solid #d9e2ec; padding: 6px 10px; }
      th { background: #eff6ff; font-weight: 700; }
      .title { font-size: 18px; font-weight: 700; }
    </style>
  </head>
  <body>
    <table>
      <tr><td class="title" colspan="${Math.max(headers.length, 2)}">${escapeHtml(title)}</td></tr>
      ${metaRows.map((row) => `<tr><td>${escapeHtml(row[0])}</td><td colspan="${Math.max(headers.length - 1, 1)}">${escapeHtml(row[1])}</td></tr>`).join('')}
      <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr>
      ${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}
    </table>
  </body>
</html>`

const activeReports = (): LifecycleReport[] => {
  syncLifecycleReportsFromTags()
  return lifecycleReports.filter((report) => report.status !== 'deleted' && report.permissions.viewReport && !report.isDemo && hasSubjectAccess(report) && hasTagAccess(report, report.tagId))
}

const findReport = (reportId: EntityId): LifecycleReport => {
  syncLifecycleReportsFromTags()
  const report = lifecycleReports.find((item) => item.id === reportId && item.status !== 'deleted')
  if (!report) {
    throw new Error('暂无该生命周期分析报告查看权限。')
  }
  return report
}

const findReportByTagId = (tagId: EntityId): LifecycleReport | undefined => {
  syncLifecycleReportsFromTags()
  return lifecycleReports.find((item) => item.tagId === tagId && item.status !== 'deleted')
}

const reportStageName = (report: LifecycleReport, stageValue: string): string =>
  report.stages.find((stage) => stage.value === stageValue)?.name ?? stageValue

const stageSnapshotsForDate = (reportId: EntityId, date: string): LifecycleStageSnapshot[] =>
  lifecycleStageSnapshots.filter((snapshot) => snapshot.reportId === reportId && snapshot.date === date)

const rangeDates = (startDate: string, endDate: string): string[] => {
  const result: string[] = []
  let cursor = dayjs(startDate)
  const end = dayjs(endDate)
  while (cursor.isBefore(end) || cursor.isSame(end, 'day')) {
    result.push(formatDate(cursor))
    cursor = cursor.add(1, 'day')
  }
  return result
}

const normalizeReportDate = (report: LifecycleReport, date?: string): string => {
  if (!date) return report.latestDataDate
  return dayjs(date).isAfter(dayjs(report.maxDataDate)) ? report.maxDataDate : date
}

const effectiveChartRange = (report: LifecycleReport, chart: LifecycleBusinessChart, analysisDate?: string): [string, string] => {
  if (!analysisDate) return chart.timeRange
  const end = dayjs(normalizeReportDate(report, analysisDate))
  const originalStart = dayjs(chart.timeRange[0])
  const originalEnd = dayjs(chart.timeRange[1])
  const daySpan = Math.max(originalEnd.diff(originalStart, 'day'), 0)
  return [formatDate(end.subtract(daySpan, 'day')), formatDate(end)]
}

const chartOperatorLabels: Record<LifecycleChartFilterOperator, string> = {
  equals: '等于',
  not_equals: '不等于',
  contains: '包含',
  not_contains: '不包含',
  greater_than: '大于',
  greater_equal: '大于等于',
  less_than: '小于',
  less_equal: '小于等于',
  between: '介于',
  in: '属于',
  not_in: '不属于',
  has_value: '有值',
  no_value: '无值',
}

const noValueChartOperators = new Set<LifecycleChartFilterOperator>(['has_value', 'no_value'])

const chartFilterSummary = (condition: LifecycleChartFilterCondition): string => {
  const prefix = `${condition.sourceName}.${condition.label}`
  const operator = chartOperatorLabels[condition.operator]
  if (noValueChartOperators.has(condition.operator)) return `${prefix} ${operator}`
  const value = condition.operator === 'between'
    ? `${condition.value} ~ ${condition.value2 ?? ''}`
    : condition.value
  const time = condition.source === 'event' && condition.timeRange ? `（${condition.timeRange[0]} 至 ${condition.timeRange[1]}）` : ''
  return `${prefix} ${operator} ${value}${time}`
}

const chartFilterText = (chart: LifecycleBusinessChart): string => {
  if (!chart.filterConditions?.length) return chart.filters || '无'
  return chart.filterConditions.map(chartFilterSummary).join(chart.filterLogic === 'or' ? ' 或 ' : ' 且 ')
}

const chartFilterWeight = (condition: LifecycleChartFilterCondition): number => {
  if (noValueChartOperators.has(condition.operator)) return 0.97
  if (condition.operator === 'between') return 0.86
  if (condition.operator === 'in' || condition.operator === 'not_in') return 0.9
  if (condition.operator.includes('greater') || condition.operator.includes('less')) return 0.88
  return 0.92
}

const validateBusinessChartPayload = (report: LifecycleReport, payload: LifecycleBusinessChart): string => {
  if (!payload.title.trim()) return '图表名称必填。'
  if (payload.title.trim().length > 80) return '图表名称不能超过 80 个字符。'
  if (!payload.stageValues.length) return '生命周期阶段必选。'
  if (payload.stageValues.some((stageValue) => !hasStageAccess(report, stageValue))) return '暂无所选生命周期阶段资源权限。'
  if (!payload.metric) return '度量必选。'
  if (!payload.timeRange?.[0] || !payload.timeRange?.[1] || dayjs(payload.timeRange[0]).isAfter(dayjs(payload.timeRange[1]))) return '图表时间范围不合法。'
  if (dayjs(payload.timeRange[1]).isAfter(dayjs(report.maxDataDate))) return '图表结束时间不能晚于最大数据时间。'
  const duplicated = lifecycleBusinessCharts.some((chart) => chart.reportId === report.id && chart.id !== payload.id && chart.title === payload.title.trim())
  if (duplicated) return '同一报告内图表名称不允许重复。'
  for (const condition of payload.filterConditions ?? []) {
    if (condition.source === 'tag' && !hasTagAccess(report, condition.sourceId || condition.field)) return `暂无标签「${condition.sourceName}」资源权限。`
    if (condition.source === 'event' && !hasEventAccess(report, condition.sourceId || condition.field.split('.')[0])) return `暂无行为事件「${condition.sourceName}」资源权限。`
    if (!condition.field) return '筛选条件字段必填。'
    if (!condition.operator) return '筛选条件运算符必填。'
    if (!noValueChartOperators.has(condition.operator) && !condition.value.trim()) return '筛选条件值必填。'
    if (condition.operator === 'between' && !condition.value2?.trim()) return '介于条件需要填写结束值。'
    if (condition.source === 'event' && (!condition.timeRange?.[0] || !condition.timeRange?.[1])) return '行为筛选条件需要选择统计时间范围。'
  }
  return ''
}

const sourceConfigCount = (payload: LifecycleExportSegmentPayload): number | undefined => {
  const count = payload.sourceConfig?.userCount
  return typeof count === 'number' && Number.isFinite(count) ? Math.max(0, Math.round(count)) : undefined
}

const nextDailyRunAt = (report: LifecycleReport, dailyExecuteTime?: string): string | undefined => {
  if (!dailyExecuteTime) return undefined
  const nextDay = dayjs().isAfter(dayjs(report.maxDataDate), 'day') ? dayjs().add(1, 'day') : dayjs(report.maxDataDate).add(1, 'day')
  return `${formatDate(nextDay)}T${dailyExecuteTime}:00+02:00`
}

const completePathCalculationLater = (report: LifecycleReport, pathId: EntityId): void => {
  globalThis.setTimeout(() => {
    const path = lifecyclePaths.find((item) => item.id === pathId && item.reportId === report.id)
    if (!path || path.status !== 'calculating') return
    recalculatePathMetrics(report, path)
    path.status = 'success'
    path.lastRunAt = now()
    path.nextRunAt = path.updateMode === 'daily' ? nextDailyRunAt(report, path.dailyExecuteTime) : undefined
    addAuditLog(report, '路径计算完成', path.id, '计算中', '成功')
  }, 650)
}

const processDuePathSchedules = (report: LifecycleReport): void => {
  lifecyclePaths
    .filter((path) => path.reportId === report.id && path.updateMode === 'daily' && path.nextRunAt && !dayjs(path.nextRunAt).isAfter(dayjs()) && path.status !== 'calculating')
    .forEach((path) => {
      path.status = 'calculating'
      addAuditLog(report, '按天更新路径任务触发', path.id, path.lastRunAt, path.nextRunAt)
      completePathCalculationLater(report, path.id)
    })
}

const addAuditLog = (report: LifecycleReport, action: string, targetId?: EntityId, before?: string, after?: string): void => {
  const log: LifecycleAuditLog = {
    id: makeId('audit'),
    userId: 'u-current',
    userName: 'Chaoyang Xu',
    action,
    reportId: report.id,
    tagId: report.tagId,
    targetId,
    before,
    after,
    ip: '127.0.0.1',
    createdAt: now(),
  }
  lifecycleAuditLogs.unshift(log)
  lifecycleBackendAuditRecords.unshift({
    id: makeId('backend-audit'),
    module: 'lifecycle_analysis',
    action,
    resourceType: auditResourceType(action),
    resourceId: targetId ?? report.id,
    reportId: report.id,
    tagId: report.tagId,
    userId: log.userId,
    userName: log.userName,
    before,
    after,
    ip: log.ip,
    createdAt: log.createdAt,
  })
  if (lifecycleBackendAuditRecords.length > 300) lifecycleBackendAuditRecords.splice(300)
}

const auditResourceType = (action: string): LifecycleBackendAuditResourceType => {
  if (action.includes('标签') || action.includes('删除生命周期')) return 'tag'
  if (action.includes('图表') || action.includes('下载数据')) return 'chart'
  if (action.includes('路径')) return 'path'
  if (action.includes('授权') || action.includes('权限')) return 'authorization'
  if (action.includes('分群')) return 'segment'
  if (action.includes('Demo')) return 'demo'
  return 'report'
}

const lifecyclePermissionToTagLevel = (permissions: LifecyclePermissionType[]): 'view' | 'edit' | 'manage' | undefined => {
  if (permissions.includes('report_manage')) return 'manage'
  if (permissions.includes('edit')) return 'edit'
  return undefined
}

const tagPermissionRank: Record<'view' | 'edit' | 'manage', number> = {
  view: 1,
  edit: 2,
  manage: 3,
}

const tagPrincipalType = (principalType: LifecycleAuthorization['principalType']): 'user' | 'group' =>
  principalType === 'user' ? 'user' : 'group'

const syncTagViewPermission = (report: LifecycleReport, authorization: LifecycleAuthorization): void => {
  const targetLevel = lifecyclePermissionToTagLevel(authorization.permissions)
  if (!targetLevel) return
  const principalType = tagPrincipalType(authorization.principalType)
  const existing = tagPermissions.find((permission) =>
    permission.tagId === report.tagId
    && permission.principalType === principalType
    && permission.principalId === authorization.principalId,
  )
  if (existing) {
    if (tagPermissionRank[targetLevel] > tagPermissionRank[existing.permission]) {
      existing.permission = targetLevel
    }
    existing.principalName = authorization.principalName
    existing.grantedAt = now()
    existing.grantedBy = 'Chaoyang Xu'
  } else {
    tagPermissions.push({
      id: makeId('perm-lifecycle'),
      tagId: report.tagId,
      principalType,
      principalId: authorization.principalId,
      principalName: authorization.principalName,
      permission: targetLevel,
      grantedBy: 'Chaoyang Xu',
      grantedAt: now(),
    })
  }
  authorization.tagViewGranted = true
  authorization.tagPermissionSyncedAt = now()
}

const upsertProjectAuthorizationLink = (report: LifecycleReport, authorization: LifecycleAuthorization): LifecycleProjectAuthorizationLink => {
  const existing = lifecycleProjectAuthorizationLinks.find((link) =>
    link.reportId === report.id
    && link.principalId === authorization.principalId
    && link.principalType === authorization.principalType,
  )
  const syncedAt = now()
  const link: LifecycleProjectAuthorizationLink = {
    id: existing?.id ?? makeId('project-auth'),
    reportId: report.id,
    principalType: authorization.principalType,
    principalId: authorization.principalId,
    principalName: authorization.principalName,
    permissions: [...authorization.permissions],
    tagPermissionLevel: lifecyclePermissionToTagLevel(authorization.permissions),
    source: 'project_center',
    syncedAt,
  }
  if (existing) Object.assign(existing, link)
  else lifecycleProjectAuthorizationLinks.push(link)
  authorization.projectAuthorizationId = link.id
  authorization.projectAuthorizationName = '项目中心 / 按内容管理 / 生命周期分析资源'
  return link
}

const generatedReportColors = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2', '#be123c', '#4f46e5']

const tagStatusToReportStatus = (status: TagDefinition['status']): LifecycleReportStatus => {
  if (status === 'deleted') return 'deleted'
  if (status === 'online') return 'enabled'
  return 'disabled'
}

const subjectTypeFromTag = (tag: TagDefinition): string => tag.subjectId.replace(/^subject-/, '') || tag.subjectId

const ensureSnapshotsForReport = (report: LifecycleReport): void => {
  const existingStageValues = new Set(lifecycleStageSnapshots.filter((snapshot) => snapshot.reportId === report.id).map((snapshot) => snapshot.stageValue))
  const missingStages = report.stages.filter((stage) => !existingStageValues.has(stage.value))
  if (!missingStages.length) return

  const end = dayjs(report.maxDataDate)
  missingStages.forEach((stage, stageIndex) => {
    let previous = 0
    const base = 12000 - stageIndex * 1200
    for (let offset = 370; offset >= 0; offset -= 1) {
      const date = end.subtract(offset, 'day')
      const dayIndex = 370 - offset
      const total = Math.max(0, Math.round(base + dayIndex * (18 + stage.order * 4) + Math.sin((dayIndex + stage.order * 7) / 13) * 420))
      const growth = dayGrowth(total, previous)
      lifecycleStageSnapshots.push({
        id: `${report.id}-${stage.value}-${date.format('YYYYMMDD')}`,
        reportId: report.id,
        stageValue: stage.value,
        date: date.format('YYYY-MM-DD'),
        totalCount: report.status === 'disabled' ? 0 : total,
        previousTotalCount: previous,
        dayGrowthRate: report.status === 'disabled' ? null : growth,
        noComparableReason: previous === 0 && total > 0 ? '前日人数为0，无法计算环比' : undefined,
        newCount: report.status === 'disabled' ? 0 : Math.max(0, Math.round(total * 0.025)),
        lostCount: report.status === 'disabled' ? 0 : Math.max(0, Math.round(total * 0.015)),
      })
      previous = total
    }
  })
}

function syncLifecycleReportsFromTags(): void {
  tagDefinitions
    .filter((tag) => tag.type === 'lifecycle')
    .forEach((tag) => {
      const values = tag.rule.values ?? []
      const existing = lifecycleReports.find((report) => report.tagId === tag.id)
      if (!values.length && !existing) return

      const status = tagStatusToReportStatus(tag.status)
      const stages = values.map((value, index) => ({
        value: value.name,
        name: value.name,
        english: tag.rule.lifecycleModel === 'AIPL' ? ['Awareness', 'Interest', 'Purchase', 'Loyalty'][index] ?? 'Custom' : tag.rule.lifecycleModel === '5A' ? ['Aware', 'Appeal', 'Ask', 'Act', 'Advocate'][index] ?? 'Custom' : 'Custom',
        description: `${tag.name}的生命周期阶段，规则来自标签体系。`,
        color: generatedReportColors[index % generatedReportColors.length]!,
        order: index + 1,
        visible: true,
      }))
      const latestDataDate = tag.latestDataDate ?? dayjs().format('YYYY-MM-DD')
      if (existing) {
        existing.name = tag.name
        existing.tagName = tag.name
        existing.subjectType = subjectTypeFromTag(tag)
        existing.subjectName = tag.subjectName.replace(/主体$/, '') || tag.subjectName
        existing.stages = stages
        existing.creatorId = tag.createdBy.id
        existing.creatorName = tag.createdBy.name
        existing.createdAt = tag.createdAt
        existing.updatedAt = tag.updatedAt
        existing.latestDataDate = latestDataDate
        existing.maxDataDate = latestDataDate
        existing.status = status
        existing.resourcePermissions = {
          ...defaultResourcePermissions(existing),
          ...ensureResourcePermissions(existing),
          allowedSubjectTypes: [existing.subjectType],
          allowedTagIds: Array.from(new Set([...ensureResourcePermissions(existing).allowedTagIds, tag.id])),
          syncedAt: now(),
        }
        existing.unavailableReason = status === 'disabled' ? '生命周期标签尚未上线或已被禁用，报告不可正常分析。' : undefined
        ensureSnapshotsForReport(existing)
        return
      }
      if (status === 'deleted' || tag.status === 'draft') return
      const report: LifecycleReport = {
        id: `lcr-${tag.id}`,
        tagId: tag.id,
        tagName: tag.name,
        name: tag.name,
        subjectType: subjectTypeFromTag(tag),
        subjectName: tag.subjectName.replace(/主体$/, '') || tag.subjectName,
        stages,
        creatorId: tag.createdBy.id,
        creatorName: tag.createdBy.name,
        createdAt: tag.createdAt,
        updatedAt: tag.updatedAt,
        latestDataDate,
        maxDataDate: latestDataDate,
        status,
        permissions: lifecyclePermissionSet,
        resourcePermissions: {
          allowedSubjectTypes: [subjectTypeFromTag(tag)],
          allowedTagIds: [tag.id],
          allowedEventNames: allLifecycleEventNames,
          allowedSegmentIds: allLifecycleSegmentIds,
          rowAccessRatio: 1,
          projectAuthorizationId: `project-auth-lcr-${tag.id}`,
          projectAuthorizationName: '项目中心 / 按内容管理 / 生命周期分析资源',
          syncedAt: now(),
          deniedReasons: {},
        },
        unavailableReason: status === 'disabled' ? '生命周期标签尚未上线或已被禁用，报告不可正常分析。' : undefined,
      }
      lifecycleReports.push(report)
      ensureSnapshotsForReport(report)
    })
}

const dayGrowth = (current: number, previous: number): number | null => {
  if (previous === 0 && current === 0) return 0
  if (previous === 0) return null
  return Number(((current / previous - 1) * 100).toFixed(2))
}

const estimateFromSnapshots = (report: LifecycleReport, stageValues: string[], crowdRange: LifecycleCrowdRange, date: string): number => {
  const snapshots = stageSnapshotsForDate(report.id, date).filter((snapshot) =>
    (!stageValues.length || stageValues.includes(snapshot.stageValue)) && hasStageAccess(report, snapshot.stageValue),
  )
  const metric = crowdRange === 'new'
    ? 'newCount'
    : crowdRange === 'lost'
      ? 'lostCount'
      : 'totalCount'
  return snapshots.reduce((sum, snapshot) => sum + applyRowAccess(report, Number(snapshot[metric])), 0)
}

const recalculatePathMetrics = (report: LifecycleReport, path: LifecyclePath): LifecyclePath => {
  const latest = stageSnapshotsForDate(report.id, report.latestDataDate)
    .filter((snapshot) => hasStageAccess(report, snapshot.stageValue))
    .map((snapshot) => applySnapshotPermissions(report, snapshot))
  const base = Math.max(latest[0]?.totalCount ?? 1, 1)
  path.nodes = path.nodes
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((node, index, nodes) => {
      const stage = report.stages[index] ?? report.stages[report.stages.length - 1]
      const snapshot = latest.find((item) => item.stageValue === stage?.value)
      const previousCount = index === 0 ? base : (nodes[index - 1]?.userCount ?? base)
      const userCount = snapshot ? Math.max(0, Math.round(snapshot.totalCount * (0.72 - index * 0.06))) : Math.max(0, Math.round(previousCount * 0.72))
      const lostCount = Math.max(0, Math.round(previousCount - userCount))
      return {
        ...node,
        pathId: path.id,
        orderIndex: index + 1,
        userCount,
        ratio: Number((userCount / base * 100).toFixed(2)),
        lostCount,
        lostRate: Number((lostCount / Math.max(previousCount, 1) * 100).toFixed(2)),
        conversionRate: index === 0 ? 100 : Number((userCount / Math.max(previousCount, 1) * 100).toFixed(2)),
      }
    })
  path.edges = path.nodes.slice(0, -1).map((node, index) => {
    const next = path.nodes[index + 1]!
    return {
      id: `${path.id}-edge-${index + 1}`,
      fromNodeId: node.id,
      toNodeId: next.id,
      userCount: next.userCount,
      conversionRate: Number((next.userCount / Math.max(node.userCount, 1) * 100).toFixed(2)),
      lostCount: Math.max(0, node.userCount - next.userCount),
    }
  })
  path.updatedAt = now()
  return path
}

const normalizePathPayload = (report: LifecycleReport, payload: LifecyclePathPayload, pathId = makeId('lcp')): LifecyclePath => {
  const nodes: LifecyclePathNode[] = payload.nodes
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((node, index, nodes) => ({
      id: node.id ?? `${pathId}-node-${index + 1}`,
      pathId,
      nodeType: index === 0 ? 'start' : index === nodes.length - 1 ? 'end' : 'middle',
      nodeName: node.nodeName,
      conditionType: node.conditionType,
      conditionConfig: node.conditionConfig,
      windowValue: node.windowValue,
      windowUnit: node.windowUnit,
      orderIndex: index + 1,
      userCount: 0,
      ratio: 0,
      lostCount: 0,
      lostRate: 0,
      conversionRate: 0,
    }))
  const path: LifecyclePath = {
    id: pathId,
    reportId: report.id,
    name: payload.name.trim(),
    description: payload.description.trim(),
    updateMode: payload.updateMode,
    dailyExecuteTime: payload.dailyExecuteTime,
    periodConfig: payload.periodConfig,
    targetSegmentId: payload.targetSegmentId,
    targetSegmentName: payload.targetSegmentName || '全量用户',
    status: 'calculating',
    nextRunAt: payload.updateMode === 'daily' ? nextDailyRunAt(report, payload.dailyExecuteTime) : undefined,
    lastRunAt: undefined,
    creatorId: 'u-current',
    creatorName: 'Chaoyang Xu',
    createdAt: now(),
    updatedAt: now(),
    nodes,
    edges: [],
  }
  return recalculatePathMetrics(report, path)
}

const validatePathPayload = (report: LifecycleReport, payload: LifecyclePathPayload, editingId?: EntityId): string => {
  if (!report.permissions.managePath) return '暂无管理路径跃迁权限。'
  if (!payload.name.trim()) return '路径名称必填。'
  if (payload.name.trim().length > 100) return '路径名称不能超过 100 个字符。'
  const duplicated = lifecyclePaths.some((path) => path.reportId === report.id && path.id !== editingId && path.name === payload.name.trim())
  if (duplicated) return '同一报告内路径名称不允许重复。'
  if (!payload.updateMode) return '更新频次必填。'
  if (payload.updateMode === 'daily' && !payload.dailyExecuteTime) return '按天更新需要配置每日执行时间。'
  if (!payload.periodConfig.startDate || !payload.periodConfig.endDate || dayjs(payload.periodConfig.startDate).isAfter(dayjs(payload.periodConfig.endDate))) {
    return '分析周期不合法。'
  }
  if (dayjs(payload.periodConfig.endDate).isAfter(dayjs(report.maxDataDate))) return '结束时间不能晚于最大数据时间。'
  if (payload.nodes.length < 2) return '起始事件和终止事件必填。'
  const first = payload.nodes[0]!
  const last = payload.nodes[payload.nodes.length - 1]!
  if (!first.nodeName.trim() || !last.nodeName.trim()) return '起始事件和终止事件必填。'
  if (first.nodeName.trim() === last.nodeName.trim() && first.conditionType === last.conditionType) return '起始事件和终止事件不能完全相同。'
  const invalidNode = payload.nodes.find((node) => !node.nodeName.trim() || !node.conditionType || node.windowValue <= 0)
  if (invalidNode) return '每个中间节点配置必须完整，窗口期必须大于 0。'
  const incompleteTagNode = payload.nodes.find((node) => node.conditionType === 'tag' && (!node.conditionConfig.tagId || !node.conditionConfig.tagValue))
  if (incompleteTagNode) return '标签节点必须选择标签和标签值。'
  const incompleteEventNode = payload.nodes.find((node) => node.conditionType === 'event' && !node.conditionConfig.eventName)
  if (incompleteEventNode) return '行为事件节点必须选择事件。'
  const deniedTagNode = payload.nodes.find((node) => node.conditionConfig.tagId && !hasTagAccess(report, node.conditionConfig.tagId))
  if (deniedTagNode) return `暂无标签「${deniedTagNode.conditionConfig.tagName ?? deniedTagNode.conditionConfig.tagId}」资源权限。`
  const deniedEventNode = payload.nodes.find((node) => node.conditionConfig.eventName && !hasEventAccess(report, node.conditionConfig.eventName))
  if (deniedEventNode) return `暂无行为事件「${deniedEventNode.conditionConfig.eventDisplayName ?? deniedEventNode.conditionConfig.eventName}」资源权限。`
  if (payload.targetSegmentId) {
    const targetSegment = lifecycleTargetSegments.find((segment) => segment.value === payload.targetSegmentId)
    if (!targetSegment) return '目标分群不存在或已删除。'
    if (targetSegment.subjectType !== report.subjectType) return '目标分群主体必须与生命周期标签主体一致。'
    if (targetSegment.status !== 'available') return '目标分群状态必须为可用。'
    if (!hasSegmentAccess(report, payload.targetSegmentId)) return '暂无目标分群资源权限。'
  }
  return ''
}

export const lifecycleAnalysisService = {
  getFilterOptions(): Promise<LifecycleFilterOptions> {
    const reports = activeReports()
    const subjectMap = new Map<string, string>()
    const stageMap = new Map<string, string>()
    const creatorMap = new Map<string, string>()
    reports.forEach((report) => {
      subjectMap.set(report.subjectType, report.subjectName)
      creatorMap.set(report.creatorId, report.creatorName)
      report.stages.forEach((stage) => stage.visible && stageMap.set(stage.value, stage.name))
    })
    return resolveMock({
      subjects: [...subjectMap].map(([value, label]) => ({ label, value })),
      stages: [...stageMap].map(([value, label]) => ({ label, value })),
      creators: [...creatorMap].map(([value, label]) => ({ label, value })),
    })
  },

  searchReports(filters: LifecycleReportSearchFilters): Promise<LifecycleReportSearchResult> {
    const keyword = filters.keyword.trim().toLowerCase()
    const filtered = activeReports().filter((report) => {
      const keywordMatched = !keyword || report.name.toLowerCase().includes(keyword) || report.creatorName.toLowerCase().includes(keyword)
      const subjectMatched = !filters.subjectTypes.length || filters.subjectTypes.includes(report.subjectType)
      const stageMatched = !filters.stageValues.length || report.stages.some((stage) => filters.stageValues.includes(stage.value))
      const creatorMatched = !filters.creatorIds.length || filters.creatorIds.includes(report.creatorId)
      const createdMatched = !filters.createdRange || (
        !dayjs(report.createdAt).isBefore(dayjs(filters.createdRange[0]), 'day')
        && !dayjs(report.createdAt).isAfter(dayjs(filters.createdRange[1]), 'day')
      )
      return keywordMatched && subjectMatched && stageMatched && creatorMatched && createdMatched
    })
    const start = (filters.page - 1) * filters.pageSize
    return resolveMock({
      records: filtered.slice(start, start + filters.pageSize),
      total: filtered.length,
      page: filters.page,
      pageSize: filters.pageSize,
      permissions: lifecyclePermissionSet,
    })
  },

  getReport(reportId: EntityId): Promise<LifecycleReport> {
    const report = findReport(reportId)
    if (!hasSubjectAccess(report) || !hasTagAccess(report, report.tagId)) return Promise.reject(new Error('暂无该生命周期分析报告资源权限。'))
    addAuditLog(report, '查看生命周期报告')
    return resolveMock(report)
  },

  getReportByTagId(tagId: EntityId): Promise<LifecycleReport> {
    const report = findReportByTagId(tagId)
    if (!report || !report.permissions.viewReport || !report.permissions.tagResourceView || !hasSubjectAccess(report) || !hasTagAccess(report, report.tagId)) {
      return Promise.reject(new Error('暂无该生命周期分析报告查看权限。'))
    }
    addAuditLog(report, '从标签详情进入生命周期报告')
    return resolveMock(report)
  },

  getDemoReport(sourceReportId?: EntityId): Promise<LifecycleReport> {
    const report = lifecycleReports.find((item) => item.isDemo)
    if (!report) return Promise.reject(new Error('Demo 报告不存在。'))
    if (sourceReportId) {
      const source = findReport(sourceReportId)
      addAuditLog(source, '查看 Demo', report.id, source.name, report.name)
    }
    return resolveMock(report)
  },

  getAssets(reportId: EntityId, date?: string, stageValues: string[] = []): Promise<LifecycleStageSnapshot[]> {
    const report = findReport(reportId)
    const safeDate = normalizeReportDate(report, date)
    const snapshots = stageSnapshotsForDate(report.id, safeDate).filter((snapshot) =>
      (!stageValues.length || stageValues.includes(snapshot.stageValue))
      && report.stages.some((stage) => stage.value === snapshot.stageValue && stage.visible)
      && hasStageAccess(report, snapshot.stageValue)
    ).map((snapshot) => applySnapshotPermissions(report, snapshot))
    return resolveMock(snapshots)
  },

  getTrend(reportId: EntityId, params: { startDate: string; endDate: string; stageValues: string[]; metricType: LifecycleTrendMetric }): Promise<LifecycleTrendPoint[]> {
    const report = findReport(reportId)
    const endDate = dayjs(params.endDate).isAfter(dayjs(report.maxDataDate)) ? report.maxDataDate : params.endDate
    const startDate = dayjs(params.startDate).isBefore(dayjs(report.maxDataDate).subtract(12, 'month'))
      ? formatDate(dayjs(report.maxDataDate).subtract(12, 'month'))
      : params.startDate
    const dates = rangeDates(startDate, endDate)
    const stageValues = (params.stageValues.length ? params.stageValues : report.stages.filter((stage) => stage.visible).map((stage) => stage.value))
      .filter((stageValue) => hasStageAccess(report, stageValue))
    const points = dates.flatMap((date) =>
      stageSnapshotsForDate(report.id, date)
        .filter((snapshot) => stageValues.includes(snapshot.stageValue))
        .map((snapshot) => applySnapshotPermissions(report, snapshot))
        .map((snapshot) => {
          const count = params.metricType === 'total' ? snapshot.totalCount : params.metricType === 'new' ? snapshot.newCount : snapshot.lostCount
          const previous = params.metricType === 'total' ? snapshot.previousTotalCount : Math.round(count * 0.92)
          return {
            date,
            stageValue: snapshot.stageValue,
            stageName: reportStageName(report, snapshot.stageValue),
            metricType: params.metricType,
            count,
            previousCount: previous,
            changeRate: dayGrowth(count, previous),
          }
        }),
    )
    return resolveMock(points)
  },

  getTransition(reportId: EntityId, params: { startDate: string; endDate: string; stageValues: string[] }): Promise<LifecycleTransitionResult> {
    const report = findReport(reportId)
    const startDate = normalizeReportDate(report, params.startDate)
    const endDate = normalizeReportDate(report, params.endDate)
    const fromSnapshots = stageSnapshotsForDate(report.id, startDate)
      .filter((snapshot) => hasStageAccess(report, snapshot.stageValue))
      .map((snapshot) => applySnapshotPermissions(report, snapshot))
    const toSnapshots = stageSnapshotsForDate(report.id, endDate)
      .filter((snapshot) => hasStageAccess(report, snapshot.stageValue))
      .map((snapshot) => applySnapshotPermissions(report, snapshot))
    const selected = (params.stageValues.length ? params.stageValues : report.stages.map((stage) => stage.value))
      .filter((stageValue) => hasStageAccess(report, stageValue))
    const nodes = [
      ...fromSnapshots.filter((item) => selected.includes(item.stageValue)).map((snapshot) => ({
        id: `from-${snapshot.stageValue}`,
        stageValue: snapshot.stageValue,
        stageName: reportStageName(report, snapshot.stageValue),
        side: 'from' as const,
        userCount: snapshot.totalCount,
        retainedCount: Math.round(snapshot.totalCount * 0.62),
        newCount: snapshot.newCount,
        lostCount: snapshot.lostCount,
      })),
      ...toSnapshots.filter((item) => selected.includes(item.stageValue)).map((snapshot) => ({
        id: `to-${snapshot.stageValue}`,
        stageValue: snapshot.stageValue,
        stageName: reportStageName(report, snapshot.stageValue),
        side: 'to' as const,
        userCount: snapshot.totalCount,
        retainedCount: Math.round(snapshot.totalCount * 0.65),
        newCount: snapshot.newCount,
        lostCount: snapshot.lostCount,
      })),
    ]
    const edges: LifecycleTransitionEdge[] = []
    fromSnapshots.filter((item) => selected.includes(item.stageValue)).forEach((from, fromIndex) => {
      const orderedTargets = [from.stageValue, report.stages[fromIndex + 1]?.value, report.stages[fromIndex - 1]?.value].filter(Boolean) as string[]
      orderedTargets.forEach((toValue, targetIndex) => {
        if (!selected.includes(toValue)) return
        const to = toSnapshots.find((snapshot) => snapshot.stageValue === toValue)
        if (!to) return
        const weight = targetIndex === 0 ? 0.52 : targetIndex === 1 ? 0.28 : 0.08
        const userCount = Math.round(Math.min(from.totalCount * weight, to.totalCount * (targetIndex === 0 ? 0.55 : 0.32)))
        if (userCount <= 0) return
        edges.push({
          id: `edge-${from.stageValue}-${toValue}`,
          fromStage: from.stageValue,
          fromStageName: reportStageName(report, from.stageValue),
          toStage: toValue,
          toStageName: reportStageName(report, toValue),
          userCount,
          fromRatio: Number((userCount / Math.max(from.totalCount, 1) * 100).toFixed(2)),
          toRatio: Number((userCount / Math.max(to.totalCount, 1) * 100).toFixed(2)),
        })
      })
    })
    return resolveMock({ nodes, edges, startDate, endDate })
  },

  getBusinessCharts(reportId: EntityId): Promise<LifecycleBusinessChart[]> {
    return resolveMock(lifecycleBusinessCharts.filter((chart) => chart.reportId === reportId))
  },

  getBusinessChartData(report: LifecycleReport, chart: LifecycleBusinessChart, analysisDate?: string): Promise<LifecycleBusinessChartDataRow[]> {
    const chartRange = effectiveChartRange(report, chart, analysisDate)
    const dates = rangeDates(chartRange[0], chartRange[1]).slice(-14)
    const stageNames = chart.stageValues.map((value) => reportStageName(report, value))
    const filterFactors = chart.filterConditions?.map(chartFilterWeight) ?? []
    const filterFactor = filterFactors.length
      ? chart.filterLogic === 'or'
        ? Math.max(...filterFactors)
        : filterFactors.reduce((value, factor) => value * factor, 1)
      : 1
    const rows = chart.chartType === 'line'
      ? dates.flatMap((date, index) => stageNames.map((stageName, stageIndex) => ({
        name: date.slice(5),
        value: applyRowAccess(report, Math.round((4200 + index * 160 + stageIndex * 500 + Math.sin(index / 2) * 360) * filterFactor)),
        stageName,
        date,
      })))
      : ['自然流量', '信息流广告', '私域触达', '搜索渠道', '线下活动', '转介绍'].slice(0, chart.topN).map((name, index) => ({
        name,
        value: applyRowAccess(report, Math.round(((chart.topN - index) * 860 + index * 120 + chart.stageValues.length * 300) * filterFactor)),
        stageName: stageNames[index % Math.max(stageNames.length, 1)] ?? '全部阶段',
      }))
    return resolveMock(rows)
  },

  async downloadBusinessChartData(reportId: EntityId, chartId: EntityId, analysisDate?: string): Promise<LifecycleChartDownloadFile> {
    const report = findReport(reportId)
    if (!report.permissions.downloadChartData) return Promise.reject(new Error('暂无图表数据下载权限。'))
    const chart = lifecycleBusinessCharts.find((item) => item.id === chartId && item.reportId === report.id)
    if (!chart) return Promise.reject(new Error('图表不存在。'))
    const chartRange = effectiveChartRange(report, chart, analysisDate)
    const rows = await lifecycleAnalysisService.getBusinessChartData(report, chart, analysisDate)
    const header = ['维度值', '生命周期阶段', '指标值', '日期']
    const tableRows = rows.map((row) => [row.name, row.stageName, String(row.value), row.date ?? ''])
    const html = buildExcelHtml(`${report.name}-${chart.title}`, [
      ['报告名称', report.name],
      ['图表名称', chart.title],
      ['指标', chart.metric],
      ['维度', chart.dimension],
      ['时间范围', `${chartRange[0]} 至 ${chartRange[1]}`],
      ['筛选条件', chartFilterText(chart)],
      ['权限快照', `${ensureResourcePermissions(report).projectAuthorizationName}，行权限比例 ${Math.round(ensureResourcePermissions(report).rowAccessRatio * 100)}%`],
    ], header, tableRows)
    addAuditLog(report, '下载数据', chart.id, undefined, chart.title)
    return {
      fileName: `${sanitizeFileName(report.name)}-${sanitizeFileName(chart.title)}-图表数据.xls`,
      mimeType: 'application/vnd.ms-excel;charset=utf-8',
      content: html,
    }
  },

  saveBusinessChart(payload: LifecycleBusinessChart): Promise<LifecycleBusinessChart> {
    const report = findReport(payload.reportId)
    if (!report.permissions.editReport) return Promise.reject(new Error('暂无编辑生命周期分析报告权限。'))
    const error = validateBusinessChartPayload(report, payload)
    if (error) return Promise.reject(new Error(error))
    const existingIndex = lifecycleBusinessCharts.findIndex((chart) => chart.id === payload.id)
    const saved = { ...payload, title: payload.title.trim(), filters: chartFilterText(payload), id: payload.id || makeId('lcc'), updatedAt: now(), error: false }
    if (existingIndex >= 0) {
      lifecycleBusinessCharts.splice(existingIndex, 1, saved)
      addAuditLog(report, '编辑图表', saved.id)
    } else {
      lifecycleBusinessCharts.unshift(saved)
      addAuditLog(report, '添加图表', saved.id)
    }
    return resolveMock(saved)
  },

  deleteBusinessChart(reportId: EntityId, chartId: EntityId): Promise<boolean> {
    const report = findReport(reportId)
    if (!report.permissions.editReport) return Promise.reject(new Error('暂无编辑生命周期分析报告权限。'))
    const index = lifecycleBusinessCharts.findIndex((chart) => chart.id === chartId)
    if (index >= 0) lifecycleBusinessCharts.splice(index, 1)
    addAuditLog(report, '删除图表', chartId)
    return resolveMock(true)
  },

  refreshBusinessChart(reportId: EntityId, chartId: EntityId): Promise<LifecycleBusinessChart> {
    const report = findReport(reportId)
    const chart = lifecycleBusinessCharts.find((item) => item.id === chartId)
    if (!chart) return Promise.reject(new Error('图表不存在。'))
    chart.error = false
    chart.updatedAt = now()
    addAuditLog(report, '刷新图表', chartId)
    return resolveMock(chart, 420)
  },

  getPaths(reportId: EntityId): Promise<LifecyclePath[]> {
    const report = findReport(reportId)
    processDuePathSchedules(report)
    return resolveMock(lifecyclePaths.filter((path) => path.reportId === reportId))
  },

  quickCreatePath(reportId: EntityId): Promise<LifecyclePath> {
    const report = findReport(reportId)
    if (!report.permissions.managePath) return Promise.reject(new Error('暂无管理路径跃迁权限。'))
    const id = makeId('lcp')
    const nodes = report.stages.map((stage, index) => ({
      nodeType: index === 0 ? 'start' as const : index === report.stages.length - 1 ? 'end' as const : 'middle' as const,
      nodeName: stage.name,
      conditionType: 'tag' as const,
      conditionConfig: {
        tagId: report.tagId,
        tagName: report.tagName,
        tagValue: stage.name,
      },
      windowValue: index + 1,
      windowUnit: 'day' as const,
      orderIndex: index + 1,
    }))
    const path = normalizePathPayload(report, {
      name: '默认路径',
      description: '系统根据生命周期阶段顺序创建。',
      updateMode: 'manual',
      periodConfig: {
        quickKey: 'last_7_days',
        startDate: formatDate(dayjs(report.maxDataDate).subtract(6, 'day')),
        endDate: report.maxDataDate,
      },
      targetSegmentId: undefined,
      targetSegmentName: '全量用户',
      nodes,
    }, id)
    path.status = 'success'
    lifecyclePaths.push(path)
    addAuditLog(report, '新建路径', path.id)
    return resolveMock(path, 360)
  },

  savePath(reportId: EntityId, payload: LifecyclePathPayload, editingId?: EntityId): Promise<LifecyclePath> {
    const report = findReport(reportId)
    const error = validatePathPayload(report, payload, editingId)
    if (error) return Promise.reject(new Error(error))
    const path = normalizePathPayload(report, payload, editingId)
    const index = lifecyclePaths.findIndex((item) => item.id === editingId)
    if (index >= 0) {
      path.createdAt = lifecyclePaths[index]!.createdAt
      lifecyclePaths.splice(index, 1, path)
      addAuditLog(report, '编辑路径', path.id)
    } else {
      lifecyclePaths.push(path)
      addAuditLog(report, '新建路径', path.id)
    }
    completePathCalculationLater(report, path.id)
    return resolveMock(path, 420)
  },

  deletePath(reportId: EntityId, pathId: EntityId): Promise<boolean> {
    const report = findReport(reportId)
    if (!report.permissions.managePath) return Promise.reject(new Error('暂无管理路径跃迁权限。'))
    const index = lifecyclePaths.findIndex((path) => path.id === pathId)
    if (index >= 0) lifecyclePaths.splice(index, 1)
    addAuditLog(report, '删除路径', pathId)
    return resolveMock(true)
  },

  recalculatePath(reportId: EntityId, pathId: EntityId): Promise<LifecyclePath> {
    const report = findReport(reportId)
    if (!report.permissions.managePath) return Promise.reject(new Error('暂无管理路径跃迁权限。'))
    const path = lifecyclePaths.find((item) => item.id === pathId)
    if (!path) return Promise.reject(new Error('路径不存在。'))
    path.status = 'calculating'
    const recalculated = recalculatePathMetrics(report, path)
    addAuditLog(report, '重新计算路径', pathId, '计算中', '成功')
    completePathCalculationLater(report, path.id)
    return resolveMock(recalculated, 420)
  },

  estimateExport(payload: LifecycleExportSegmentPayload): Promise<number> {
    const report = findReport(payload.reportId)
    if (!report.permissions.createSegment) return resolveMock(0)
    const sourceCount = sourceConfigCount(payload)
    const count = sourceCount !== undefined
      ? sourceCount
      : payload.crowdRange === 'transition_node' || payload.sourceType === 'transition_node'
        ? Math.round(estimateFromSnapshots(report, payload.stageValues, 'all', payload.timeRange[1]) * 0.64)
      : payload.crowdRange === 'transition' || payload.sourceType === 'transition'
        ? Math.round(estimateFromSnapshots(report, payload.stageValues, 'all', payload.timeRange[1]) * 0.28)
      : payload.crowdRange === 'path_edge' || payload.sourceType === 'path_edge'
        ? Math.round(estimateFromSnapshots(report, payload.stageValues, 'all', payload.timeRange[1]) * 0.24)
      : payload.crowdRange === 'path_node' || payload.sourceType === 'path_node'
        ? Math.round(estimateFromSnapshots(report, payload.stageValues, 'all', payload.timeRange[1]) * 0.42)
        : estimateFromSnapshots(report, payload.stageValues, payload.crowdRange, payload.timeRange[1])
    return resolveMock(Math.max(0, count), 280)
  },

  exportSegment(payload: LifecycleExportSegmentPayload): Promise<LifecycleExportSegmentResult> {
    const report = findReport(payload.reportId)
    if (!report.permissions.createSegment) return Promise.reject(new Error('暂无创建分群权限，请联系管理员开通。'))
    if (!payload.stageValues.length) return Promise.reject(new Error('生命周期阶段必选。'))
    if (!payload.outputIdType) return Promise.reject(new Error('输出 ID 类型必填。'))
    if (!payload.segmentName.trim()) return Promise.reject(new Error('分群名称必填。'))
    return lifecycleAnalysisService.estimateExport(payload).then((segmentCount) => {
      if (segmentCount <= 0) {
        return { segmentId: '', segmentCount, status: 'empty', message: '当前导出规则下暂无可保存用户。' }
      }
      const creator: Owner = { id: 'u-current', name: 'Chaoyang Xu', department: '用户洞察团队' }
      const segment = segmentService.createSegmentFromLifecycleAnalysis({
        id: makeId('segment-lifecycle'),
        name: payload.segmentName,
        description: payload.description,
        subjectType: report.subjectType,
        subjectName: report.subjectName,
        outputIdType: payload.outputIdType,
        count: segmentCount,
        groupIds: payload.groupIds,
        authObjects: payload.authTargets.map((target) => ({
          type: target.principalType === 'user_group' ? 'group' : target.principalType,
          id: target.principalId,
          name: target.principalName,
        })),
        creator,
        sourceReportId: report.id,
        sourceReportName: report.name,
        sourceType: payload.sourceType,
        sourceName: payload.sourceName,
        crowdRange: lifecycleCrowdRangeLabels[payload.crowdRange],
        stageNames: payload.stageValues.map((value) => reportStageName(report, value)),
        timeRange: payload.timeRange,
        updateMode: payload.updateMode,
        sourceConfig: payload.sourceConfig ?? {
          stageValues: payload.stageValues,
          crowdRange: payload.crowdRange,
          timeRange: payload.timeRange,
          outputIdType: payload.outputIdType,
        },
      })
      const log: LifecycleExportSegmentLog = {
        id: makeId('lesl'),
        reportId: report.id,
        sourceType: payload.sourceType,
        sourceConfig: payload.sourceConfig ?? {
          stageValues: payload.stageValues,
          crowdRange: payload.crowdRange,
          timeRange: payload.timeRange,
          outputIdType: payload.outputIdType,
        },
        segmentId: segment.id,
        segmentName: segment.name,
        segmentCount,
        creatorId: creator.id,
        creatorName: creator.name,
        createdAt: now(),
      }
      lifecycleExportSegmentLogs.unshift(log)
      addAuditLog(report, '导出分群', segment.id, undefined, payload.segmentName)
      return {
        segmentId: segment.id,
        segmentCount,
        status: 'success',
        message: '分群导出成功。',
      }
    })
  },

  createInsight(payload: LifecycleInsightPayload): Promise<LifecycleInsightResult> {
    const report = findReport(payload.reportId)
    if (!report.permissions.viewGroupProfile) return Promise.reject(new Error('暂无群体画像洞察权限。'))
    if (!payload.stageValues.length) return Promise.reject(new Error('请选择需要洞察的生命周期阶段。'))
    const stageValues = payload.stageValues.filter((stageValue) => hasStageAccess(report, stageValue))
    if (!stageValues.length) return Promise.reject(new Error('暂无所选生命周期阶段资源权限。'))
    const sourceUserCount = payload.sourceConfig?.userCount
    const estimatedCount = typeof sourceUserCount === 'number' && Number.isFinite(sourceUserCount)
      ? Math.max(0, Math.round(sourceUserCount))
      : estimateFromSnapshots(report, stageValues, 'all', report.latestDataDate)
    const insightTargetName = payload.sourceName || `${stageValues.map((value) => reportStageName(report, value)).join('、')} 阶段人群`
    const created = groupProfileInsightService.createReportFromLifecycleInsight({
      name: payload.reportName,
      description: `由生命周期分析「${report.name}」生成，分析对象为 ${insightTargetName}。`,
      subjectType: report.subjectType,
      subjectName: report.subjectName,
      sourceReportId: report.id,
      sourceReportName: report.name,
      tagId: report.tagId,
      tagName: report.tagName,
      stageValues,
      stageNames: stageValues.map((value) => reportStageName(report, value)),
      insightObject: payload.insightObject,
      estimatedCount,
      resourceSummary: `${ensureResourcePermissions(report).projectAuthorizationName}，已按生命周期标签、底层标签、事件和行权限生成画像对象。`,
      sourceType: payload.sourceType,
      sourceName: payload.sourceName,
      crowdRange: payload.crowdRange ? lifecycleCrowdRangeLabels[payload.crowdRange] : undefined,
      timeRange: payload.timeRange,
      sourceConfig: payload.sourceConfig,
    })
    addAuditLog(report, '洞察分群', created.id, undefined, payload.reportName)
    return resolveMock({
      reportId: created.id,
      redirectPath: `/user-insight/group-profiles/${created.id}`,
      message: '已将选中阶段人群作为群体画像分析对象。',
    })
  },

  getAuthorizations(reportId: EntityId): Promise<LifecycleAuthorization[]> {
    return resolveMock(lifecycleAuthorizations.filter((item) => item.reportId === reportId))
  },

  switchReport(fromReportId: EntityId, toReportId: EntityId): Promise<LifecycleReport> {
    const fromReport = findReport(fromReportId)
    const toReport = findReport(toReportId)
    addAuditLog(fromReport, '切换分析报告', toReport.id, fromReport.name, toReport.name)
    return resolveMock(toReport)
  },

  saveAuthorizations(reportId: EntityId, principals: Array<{ type: LifecycleAuthorization['principalType']; id: string; name: string }>, permissions: LifecyclePermissionType[]): Promise<LifecycleAuthorization[]> {
    const report = findReport(reportId)
    if (!report.permissions.manageAuthorization) return Promise.reject(new Error('暂无生命周期分析管理权限。'))
    const before = lifecycleAuthorizations.filter((item) => item.reportId === reportId && principals.some((principal) => principal.id === item.principalId))
    principals.forEach((principal) => {
      const existing = lifecycleAuthorizations.find((item) => item.reportId === reportId && item.principalId === principal.id)
      const tagViewGranted = Boolean(lifecyclePermissionToTagLevel(permissions))
      let authorization: LifecycleAuthorization
      if (existing) {
        existing.permissions = [...permissions]
        existing.principalType = principal.type
        existing.principalName = principal.name
        existing.tagViewGranted = tagViewGranted
        existing.grantedAt = now()
        authorization = existing
      } else {
        authorization = {
          id: makeId('lca'),
          reportId,
          principalType: principal.type,
          principalId: principal.id,
          principalName: principal.name,
          permissions: [...permissions],
          tagViewGranted,
          projectAuthorizationId: '',
          projectAuthorizationName: '',
          grantedBy: 'Chaoyang Xu',
          grantedAt: now(),
        }
        lifecycleAuthorizations.push(authorization)
      }
      const link = upsertProjectAuthorizationLink(report, authorization)
      if (tagViewGranted) syncTagViewPermission(report, authorization)
      link.tagPermissionLevel = lifecyclePermissionToTagLevel(authorization.permissions)
    })
    addAuditLog(report, '授权生命周期分析权限', undefined, JSON.stringify(before), JSON.stringify({ principals, permissions }))
    return lifecycleAnalysisService.getAuthorizations(reportId)
  },

  revokeAuthorization(reportId: EntityId, authorizationId: EntityId): Promise<LifecycleAuthorization[]> {
    const report = findReport(reportId)
    if (!report.permissions.manageAuthorization) return Promise.reject(new Error('暂无生命周期分析管理权限。'))
    const index = lifecycleAuthorizations.findIndex((authorization) => authorization.id === authorizationId && authorization.reportId === reportId)
    if (index < 0) return lifecycleAnalysisService.getAuthorizations(reportId)
    const [removed] = lifecycleAuthorizations.splice(index, 1)
    if (removed) {
      const linkIndex = lifecycleProjectAuthorizationLinks.findIndex((link) =>
        link.reportId === reportId
        && link.principalType === removed.principalType
        && link.principalId === removed.principalId,
      )
      if (linkIndex >= 0) lifecycleProjectAuthorizationLinks.splice(linkIndex, 1)
      addAuditLog(report, '取消生命周期分析权限', removed.principalId, JSON.stringify(removed), 'revoke')
    }
    return lifecycleAnalysisService.getAuthorizations(reportId)
  },

  async deleteReport(reportId: EntityId): Promise<boolean> {
    const report = findReport(reportId)
    if (!report.permissions.deleteLifecycleTag || !report.permissions.manageReport) return Promise.reject(new Error('暂无删除生命周期标签及报告权限。'))
    const before = clone(report)
    const tag = tagDefinitions.find((item) => item.id === report.tagId)
    if (tag) {
      await tagService.deleteTag(report.tagId, tag.name)
    }
    report.status = 'deleted'
    report.updatedAt = now()
    addAuditLog(report, '删除生命周期标签及报告', report.tagId, JSON.stringify(before), 'deleted')
    return resolveMock(true, 360)
  },

  refreshReport(reportId: EntityId): Promise<LifecycleReport> {
    const report = findReport(reportId)
    report.updatedAt = now()
    addAuditLog(report, '刷新数据')
    return resolveMock(report, 420)
  },

  getAuditLogs(reportId: EntityId): Promise<LifecycleAuditLog[]> {
    return resolveMock(lifecycleAuditLogs.filter((item) => item.reportId === reportId))
  },

  getBackendAuditRecords(reportId: EntityId): Promise<LifecycleBackendAuditRecord[]> {
    return resolveMock(lifecycleBackendAuditRecords.filter((item) => item.reportId === reportId))
  },

  getExportSegmentLogs(reportId: EntityId): Promise<LifecycleExportSegmentLog[]> {
    return resolveMock(lifecycleExportSegmentLogs.filter((item) => item.reportId === reportId))
  },

  getSelectResources(reportId?: EntityId) {
    const report = reportId ? lifecycleReports.find((item) => item.id === reportId && item.status !== 'deleted') : undefined
    const resourcePermissions = report ? ensureResourcePermissions(report) : undefined
    const allowedTagIds = new Set(resourcePermissions?.allowedTagIds ?? tagDefinitions.map((tag) => tag.id))
    const allowedEvents = new Set(resourcePermissions?.allowedEventNames ?? lifecycleEventOptions.map((event) => event.value))
    const allowedSegments = new Set(resourcePermissions?.allowedSegmentIds ?? lifecycleTargetSegments.map((segment) => segment.value))
    const tags = tagDefinitions
      .filter((tag) => tag.status !== 'deleted' && allowedTagIds.has(tag.id))
      .map((tag) => ({
        label: tag.name,
        value: tag.id,
        values: tag.rule.values?.map((value) => ({ label: value.name, value: value.name })) ?? [],
      }))
    if (report && allowedTagIds.has(report.tagId) && !tags.some((tag) => tag.value === report.tagId)) {
      tags.unshift({
        label: report.tagName,
        value: report.tagId,
        values: report.stages.map((stage) => ({ label: stage.name, value: stage.name })),
      })
    }
    return {
      outputIdTypes: lifecycleOutputIdTypes,
      segmentGroups: lifecycleSegmentGroups,
      targetSegments: lifecycleTargetSegments.filter((segment) =>
        allowedSegments.has(segment.value)
        && segment.status === 'available'
        && (!report || !segment.value || segment.subjectType === report.subjectType),
      ).map((segment) => ({
        ...segment,
        label: segment.value ? segment.label : `全量${report?.subjectName ?? '用户'}`,
      })),
      events: lifecycleEventOptions.filter((event) => allowedEvents.has(event.value)),
      tags,
      resourcePermissions,
    }
  },
}

export const lifecycleReportStatusLabels: Record<LifecycleReport['status'], string> = {
  enabled: '启用',
  disabled: '不可用',
  deleted: '已删除',
}

export const lifecycleTrendMetricLabels: Record<LifecycleTrendMetric, string> = {
  total: '总用户趋势',
  new: '新增用户趋势',
  lost: '流失用户趋势',
}

export const lifecycleCrowdRangeLabels: Record<LifecycleCrowdRange, string> = {
  all: '当前阶段全部人群',
  new: '当日新增',
  lost: '当日流失',
  transition_node: '关系流转节点人群',
  transition: '流转人群',
  path_node: '路径节点人群',
  path_edge: '路径跃迁转化路径',
}

export const lifecyclePathStatusLabels: Record<LifecyclePath['status'], string> = {
  calculating: '计算中',
  success: '成功',
  failed: '失败',
}

export const lifecyclePathUpdateModeLabels: Record<LifecyclePath['updateMode'], string> = {
  manual: '手动更新',
  daily: '按天更新',
}

export const lifecyclePermissionLabels: Record<LifecyclePermissionType, string> = {
  view: '查看',
  edit: '编辑',
  manage_path: '管理路径跃迁',
  report_manage: '报告管理',
}

export const lifecyclePathEdgeSummary = (edge: LifecyclePathEdge | undefined, nodes: LifecyclePathNode[]): string => {
  if (!edge) return ''
  const from = nodes.find((node) => node.id === edge.fromNodeId)?.nodeName ?? edge.fromNodeId
  const to = nodes.find((node) => node.id === edge.toNodeId)?.nodeName ?? edge.toNodeId
  return `${from} → ${to}`
}
