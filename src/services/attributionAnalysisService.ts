import {
  createAttributionDashboardResult,
  createAttributionPaths,
  createAttributionResult,
  createAttributionUsers,
  createSavedAttributionResult,
  defaultAttributionFilters,
  mockAttributionMetadata,
} from '@/mock/attributionAnalysis'
import type {
  AttributionActionResult,
  AttributionDashboardWidgetPayload,
  AttributionMetadata,
  AttributionPathResponse,
  AttributionQueryRequest,
  AttributionQueryResponse,
  AttributionUserListResponse,
  SavedAttributionAnalysisPayload,
} from '@/types/attributionAnalysis'

const MOCK_DELAY = 260

const resolveMock = <T>(payload: T): Promise<T> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(payload), MOCK_DELAY)
  })

export const attributionAnalysisService = {
  getMetadata: (): Promise<AttributionMetadata> =>
    resolveMock(mockAttributionMetadata),
  getDefaultFilters: () =>
    resolveMock(defaultAttributionFilters.map((filter) => ({ ...filter }))),
  runAnalysis: (query: AttributionQueryRequest): Promise<AttributionQueryResponse> =>
    resolveMock(createAttributionResult(query)),
  getUsers: (queryId: string, attributionLabel: string): Promise<AttributionUserListResponse> =>
    resolveMock(createAttributionUsers(queryId, attributionLabel)),
  getPaths: (query: AttributionQueryRequest, attributionKey?: string): Promise<AttributionPathResponse> =>
    resolveMock(createAttributionPaths(query, attributionKey)),
  saveAnalysis: (payload: SavedAttributionAnalysisPayload): Promise<AttributionActionResult> =>
    resolveMock(createSavedAttributionResult(payload)),
  saveWidgetToDashboard: (payload: AttributionDashboardWidgetPayload): Promise<AttributionActionResult> =>
    resolveMock(createAttributionDashboardResult(payload)),
}
