import {
  createDefaultLtvQuery,
  createEmptyAdMetric,
  createEmptyIapMetric,
  createLtvDashboardResult,
  createLtvResult,
  createLtvRevenueBreakdown,
  createLtvUsers,
  createSavedLtvResult,
  mockLtvMetadata,
} from '@/mock/ltvAnalysis'
import type {
  LtvActionResult,
  LtvDashboardWidgetPayload,
  LtvDrilldownContext,
  LtvMetadata,
  LtvQueryRequest,
  LtvQueryResponse,
  LtvRevenueBreakdownRecord,
  LtvRevenueMetric,
  LtvSavedAnalysisPayload,
  LtvUserRecord,
} from '@/types/ltvAnalysis'

const MOCK_DELAY = 260

const resolveMock = <T>(payload: T): Promise<T> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(payload), MOCK_DELAY)
  })

export const ltvAnalysisService = {
  getMetadata: (): Promise<LtvMetadata> => resolveMock(mockLtvMetadata),
  getDefaultQuery: (): Promise<LtvQueryRequest> => resolveMock(createDefaultLtvQuery()),
  createRevenueMetric: (type: 'iap' | 'ad', index: number): Promise<LtvRevenueMetric> =>
    resolveMock(type === 'iap' ? createEmptyIapMetric(index) : createEmptyAdMetric(index)),
  runAnalysis: (query: LtvQueryRequest): Promise<LtvQueryResponse> =>
    resolveMock(createLtvResult(query)),
  getUsers: (context: Pick<LtvDrilldownContext, 'cohortDate' | 'groupName'>): Promise<LtvUserRecord[]> =>
    resolveMock(createLtvUsers(context)),
  getRevenueBreakdown: (context: LtvDrilldownContext): Promise<LtvRevenueBreakdownRecord[]> =>
    resolveMock(createLtvRevenueBreakdown(context)),
  saveAnalysis: (payload: LtvSavedAnalysisPayload): Promise<LtvActionResult> =>
    resolveMock(createSavedLtvResult(payload)),
  saveWidgetToDashboard: (payload: LtvDashboardWidgetPayload): Promise<LtvActionResult> =>
    resolveMock(createLtvDashboardResult(payload)),
}
