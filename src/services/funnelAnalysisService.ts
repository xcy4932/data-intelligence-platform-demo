import {
  createFunnelResult,
  mockDefaultComparisonGroups,
  mockFunnelMetadata,
  mockFunnelUsers,
  saveFunnelAnalysisResult,
  saveFunnelDashboardResult,
} from '@/mock/funnelAnalysis'
import type {
  FunnelActionResult,
  FunnelComparisonGroup,
  FunnelDashboardWidgetPayload,
  FunnelMetadata,
  FunnelQueryRequest,
  FunnelQueryResponse,
  FunnelSavedAnalysisPayload,
  FunnelUserRecord,
} from '@/types/funnelAnalysis'

const MOCK_DELAY = 260

const cloneMock = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const withDelay = <T>(value: T, delay = MOCK_DELAY): Promise<T> =>
  new Promise((resolve) => {
    window.setTimeout(() => resolve(cloneMock(value)), delay)
  })

export const funnelAnalysisService = {
  getMetadata(): Promise<FunnelMetadata> {
    return withDelay(mockFunnelMetadata, 180)
  },

  getDefaultComparisonGroups(): Promise<FunnelComparisonGroup[]> {
    return withDelay(mockDefaultComparisonGroups, 120)
  },

  runAnalysis(query: FunnelQueryRequest): Promise<FunnelQueryResponse> {
    return withDelay(createFunnelResult(query), 420)
  },

  getUsers(): Promise<FunnelUserRecord[]> {
    return withDelay(mockFunnelUsers, 220)
  },

  saveAnalysis(payload: FunnelSavedAnalysisPayload): Promise<FunnelActionResult> {
    return withDelay(saveFunnelAnalysisResult(payload), 320)
  },

  saveWidgetToDashboard(payload: FunnelDashboardWidgetPayload): Promise<FunnelActionResult> {
    return withDelay(saveFunnelDashboardResult(payload), 320)
  },
}
