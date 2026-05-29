import { groupProfileInsightService } from './groupProfileInsightService'
import type { EntityId } from '@/types/common'
import type {
  GroupProfileActionResult,
  GroupProfileAuditLog,
  GroupProfileDownloadPayload,
  GroupProfileDownloadTask,
  GroupProfileDuplicateReportOptions,
  GroupProfileQueryTask,
  GroupProfileReport,
  GroupProfileReportPermission,
  GroupProfileReportSearchFilters,
  GroupProfileReportSearchResult,
  GroupProfileSaveReportPayload,
  GroupProfileSaveSegmentPayload,
  GroupProfileScheduleTask,
  GroupProfileTemplate,
  GroupProfileTgiConfig,
  GroupProfileWorkbenchData,
} from '@/types/groupProfileInsight'
import type { ProfileSubjectType } from '@/types/profile'

export const groupProfileApiEndpoints = {
  workbench: 'GET /api/v1/group-profile/workbench',
  reports: 'GET /api/v1/group-profile/reports',
  report: 'GET /api/v1/group-profile/reports/{reportId}',
  saveReport: 'POST /api/v1/group-profile/reports',
  queryTask: 'POST /api/v1/group-profile/reports/{reportId}/query-tasks',
  queryTaskPoll: 'GET /api/v1/group-profile/query-tasks/{taskId}',
  reportTasks: 'GET /api/v1/group-profile/reports/{reportId}/tasks',
  duplicateReport: 'POST /api/v1/group-profile/reports/{reportId}/copies',
  deleteReport: 'DELETE /api/v1/group-profile/reports/{reportId}',
  permissions: 'PUT /api/v1/group-profile/reports/{reportId}/permissions',
  downloads: 'POST /api/v1/group-profile/download-tasks',
  saveSegment: 'POST /api/v1/group-profile/reports/{reportId}/segments',
  templates: 'POST /api/v1/group-profile/templates',
  templatePermissions: 'PUT /api/v1/group-profile/templates/{templateId}/permissions',
  tgiConfigs: 'POST /api/v1/group-profile/tgi-configs',
  auditLogs: 'GET /api/v1/group-profile/audit-logs',
} as const

export interface GroupProfileInsightRepository {
  getWorkbenchData(): Promise<GroupProfileWorkbenchData>
  searchReports(filters: GroupProfileReportSearchFilters): Promise<GroupProfileReportSearchResult>
  getReport(reportId: EntityId): Promise<GroupProfileReport | undefined>
  buildDraftReport(subjectType: ProfileSubjectType): GroupProfileReport
  saveReport(payload: GroupProfileSaveReportPayload): Promise<GroupProfileActionResult>
  createReportQueryTask(reportId: EntityId): Promise<GroupProfileQueryTask | undefined>
  getReportQueryTask(taskId: EntityId): Promise<GroupProfileQueryTask | undefined>
  getReportTasks(reportId: EntityId): Promise<{ queryTasks: GroupProfileQueryTask[]; scheduleTasks: GroupProfileScheduleTask[] }>
  duplicateReport(reportId: EntityId, name?: string, options?: GroupProfileDuplicateReportOptions): Promise<GroupProfileActionResult>
  deleteReport(reportId: EntityId): Promise<GroupProfileActionResult>
  updateReportPermissions(reportId: EntityId, permissions: GroupProfileReportPermission[]): Promise<GroupProfileActionResult>
  createDownloadTask(payload: GroupProfileDownloadPayload): Promise<GroupProfileDownloadTask>
  saveSegmentFromReport(payload: GroupProfileSaveSegmentPayload): Promise<GroupProfileActionResult>
  saveTemplate(template: GroupProfileTemplate): Promise<GroupProfileActionResult>
  updateTemplatePermissions(templateId: EntityId, permissions: GroupProfileReportPermission[]): Promise<GroupProfileActionResult>
  saveTgiConfig(config: GroupProfileTgiConfig): Promise<GroupProfileActionResult>
  getAuditLogs(reportId?: EntityId): Promise<GroupProfileAuditLog[]>
}

export class HttpGroupProfileInsightRepository implements GroupProfileInsightRepository {
  constructor(private readonly baseUrl: string) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      credentials: 'include',
      ...init,
    })
    if (!response.ok) throw new Error(`群体画像接口请求失败：${response.status}`)
    return (await response.json()) as T
  }

  getWorkbenchData(): Promise<GroupProfileWorkbenchData> {
    return this.request('/api/v1/group-profile/workbench')
  }

  searchReports(filters: GroupProfileReportSearchFilters): Promise<GroupProfileReportSearchResult> {
    return this.request('/api/v1/group-profile/reports/search', { method: 'POST', body: JSON.stringify(filters) })
  }

  getReport(reportId: EntityId): Promise<GroupProfileReport | undefined> {
    return this.request(`/api/v1/group-profile/reports/${reportId}`)
  }

  buildDraftReport(subjectType: ProfileSubjectType): GroupProfileReport {
    return groupProfileInsightService.buildDraftReport(subjectType)
  }

  saveReport(payload: GroupProfileSaveReportPayload): Promise<GroupProfileActionResult> {
    return this.request('/api/v1/group-profile/reports', { method: 'POST', body: JSON.stringify(payload) })
  }

  createReportQueryTask(reportId: EntityId): Promise<GroupProfileQueryTask | undefined> {
    return this.request(`/api/v1/group-profile/reports/${reportId}/query-tasks`, { method: 'POST' })
  }

  getReportQueryTask(taskId: EntityId): Promise<GroupProfileQueryTask | undefined> {
    return this.request(`/api/v1/group-profile/query-tasks/${taskId}`)
  }

  getReportTasks(reportId: EntityId): Promise<{ queryTasks: GroupProfileQueryTask[]; scheduleTasks: GroupProfileScheduleTask[] }> {
    return this.request(`/api/v1/group-profile/reports/${reportId}/tasks`)
  }

  duplicateReport(reportId: EntityId, name?: string, options?: GroupProfileDuplicateReportOptions): Promise<GroupProfileActionResult> {
    return this.request(`/api/v1/group-profile/reports/${reportId}/copies`, { method: 'POST', body: JSON.stringify({ name, ...options }) })
  }

  deleteReport(reportId: EntityId): Promise<GroupProfileActionResult> {
    return this.request(`/api/v1/group-profile/reports/${reportId}`, { method: 'DELETE' })
  }

  updateReportPermissions(reportId: EntityId, permissions: GroupProfileReportPermission[]): Promise<GroupProfileActionResult> {
    return this.request(`/api/v1/group-profile/reports/${reportId}/permissions`, { method: 'PUT', body: JSON.stringify({ permissions }) })
  }

  createDownloadTask(payload: GroupProfileDownloadPayload): Promise<GroupProfileDownloadTask> {
    return this.request('/api/v1/group-profile/download-tasks', { method: 'POST', body: JSON.stringify(payload) })
  }

  saveSegmentFromReport(payload: GroupProfileSaveSegmentPayload): Promise<GroupProfileActionResult> {
    return this.request(`/api/v1/group-profile/reports/${payload.reportId}/segments`, { method: 'POST', body: JSON.stringify(payload) })
  }

  saveTemplate(template: GroupProfileTemplate): Promise<GroupProfileActionResult> {
    return this.request('/api/v1/group-profile/templates', { method: 'POST', body: JSON.stringify(template) })
  }

  updateTemplatePermissions(templateId: EntityId, permissions: GroupProfileReportPermission[]): Promise<GroupProfileActionResult> {
    return this.request(`/api/v1/group-profile/templates/${templateId}/permissions`, { method: 'PUT', body: JSON.stringify({ permissions }) })
  }

  saveTgiConfig(config: GroupProfileTgiConfig): Promise<GroupProfileActionResult> {
    return this.request('/api/v1/group-profile/tgi-configs', { method: 'POST', body: JSON.stringify(config) })
  }

  getAuditLogs(reportId?: EntityId): Promise<GroupProfileAuditLog[]> {
    const query = reportId ? `?reportId=${encodeURIComponent(reportId)}` : ''
    return this.request(`/api/v1/group-profile/audit-logs${query}`)
  }
}

export const groupProfileInsightRepository: GroupProfileInsightRepository =
  import.meta.env.VITE_GROUP_PROFILE_API_BASE_URL
    ? new HttpGroupProfileInsightRepository(import.meta.env.VITE_GROUP_PROFILE_API_BASE_URL)
    : groupProfileInsightService
