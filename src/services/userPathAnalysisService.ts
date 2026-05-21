import {
  createSavedUserPathResult,
  createUserPathDashboardResult,
  createUserPathResult,
  createUserPathSamples,
  createUserPathUsers,
  defaultUserPathFilters,
  mockUserPathMetadata,
} from '@/mock/userPathAnalysis'
import type {
  SavedUserPathAnalysisPayload,
  UserPathActionResult,
  UserPathDashboardWidgetPayload,
  UserPathFilterCondition,
  UserPathMetadata,
  UserPathQueryRequest,
  UserPathQueryResponse,
  UserPathSampleResponse,
  UserPathUserListResponse,
} from '@/types/userPathAnalysis'

const MOCK_DELAY = 260

const resolveMock = <T>(payload: T): Promise<T> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(payload), MOCK_DELAY)
  })

const cloneFilter = (filter: UserPathFilterCondition): UserPathFilterCondition => ({
  ...filter,
  childFilters: filter.childFilters?.map(cloneFilter) ?? [],
})

export const userPathAnalysisService = {
  getMetadata: (): Promise<UserPathMetadata> =>
    resolveMock(mockUserPathMetadata),
  getDefaultFilters: (): Promise<UserPathFilterCondition[]> =>
    resolveMock(defaultUserPathFilters.map(cloneFilter)),
  runAnalysis: (query: UserPathQueryRequest): Promise<UserPathQueryResponse> =>
    resolveMock(createUserPathResult(query)),
  getUsers: (queryId: string, label: string): Promise<UserPathUserListResponse> =>
    resolveMock(createUserPathUsers(queryId, label)),
  getPathSamples: (queryId: string, label: string): Promise<UserPathSampleResponse> =>
    resolveMock(createUserPathSamples(queryId, label)),
  saveAnalysis: (payload: SavedUserPathAnalysisPayload): Promise<UserPathActionResult> =>
    resolveMock(createSavedUserPathResult(payload)),
  saveWidgetToDashboard: (payload: UserPathDashboardWidgetPayload): Promise<UserPathActionResult> =>
    resolveMock(createUserPathDashboardResult(payload)),
}
