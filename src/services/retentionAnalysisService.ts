import {
  createRetentionDashboardResult,
  createRetentionResult,
  createSavedRetentionResult,
  mockRetentionComparisonGroups,
  mockRetentionCustomWindows,
  mockRetentionExtraMetrics,
  mockRetentionGroupBys,
  mockRetentionMetadata,
  mockRetentionUserFilter,
  mockRetentionUsers,
} from '@/mock/retentionAnalysis'
import type {
  RetentionActionResult,
  RetentionComparisonGroup,
  RetentionCustomWindow,
  RetentionDashboardWidgetPayload,
  RetentionExtraMetric,
  RetentionGroupBy,
  RetentionMetadata,
  RetentionQueryRequest,
  RetentionQueryResponse,
  RetentionSavedAnalysisPayload,
  RetentionUserFilterGroup,
  RetentionUserRecord,
} from '@/types/retentionAnalysis'

const MOCK_DELAY = 280

const resolveMock = <T>(payload: T): Promise<T> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(payload), MOCK_DELAY)
  })

export const getRetentionMetadata = (): Promise<RetentionMetadata> =>
  resolveMock(mockRetentionMetadata)

export const getDefaultUserFilter = (): Promise<RetentionUserFilterGroup> =>
  resolveMock({ ...mockRetentionUserFilter })

export const getDefaultComparisonGroups = (): Promise<RetentionComparisonGroup[]> =>
  resolveMock(mockRetentionComparisonGroups.map((group) => ({ ...group, userFilter: { ...group.userFilter } })))

export const getDefaultGroupBys = (): Promise<RetentionGroupBy[]> =>
  resolveMock(mockRetentionGroupBys.map((group) => ({ ...group })))

export const getDefaultCustomWindows = (): Promise<RetentionCustomWindow[]> =>
  resolveMock(mockRetentionCustomWindows.map((window) => ({ ...window })))

export const getDefaultExtraMetrics = (): Promise<RetentionExtraMetric[]> =>
  resolveMock(mockRetentionExtraMetrics.map((metric) => ({ ...metric, filters: [...metric.filters] })))

export const runRetentionAnalysis = (
  query: RetentionQueryRequest,
  metricMode: 'retention' | 'churn',
  selectedWindowKey: string,
): Promise<RetentionQueryResponse> =>
  resolveMock(createRetentionResult(query, metricMode, selectedWindowKey))

export const getRetentionUsers = (): Promise<RetentionUserRecord[]> =>
  resolveMock(mockRetentionUsers)

export const saveRetentionAnalysis = (
  payload: RetentionSavedAnalysisPayload,
): Promise<RetentionActionResult> => {
  const result = createSavedRetentionResult(payload)

  return resolveMock({
    success: true,
    id: result.id,
    message: result.message,
  })
}

export const saveRetentionWidgetToDashboard = (
  payload: RetentionDashboardWidgetPayload,
): Promise<RetentionActionResult> => {
  const result = createRetentionDashboardResult(payload)

  return resolveMock({
    success: true,
    id: result.id,
    message: result.message,
  })
}

export const retentionAnalysisService = {
  getRetentionMetadata,
  getDefaultUserFilter,
  getDefaultComparisonGroups,
  getDefaultGroupBys,
  getDefaultCustomWindows,
  getDefaultExtraMetrics,
  runRetentionAnalysis,
  getRetentionUsers,
  saveRetentionAnalysis,
  saveRetentionWidgetToDashboard,
}
