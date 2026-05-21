import {
  createDistributionDashboardResult,
  createDistributionResult,
  createSavedDistributionResult,
  defaultDistributionComparisonGroups,
  defaultDistributionFilter,
  defaultDistributionGroupBys,
  mockDistributionMetadata,
} from '@/mock/distributionAnalysis'
import type {
  DistributionActionResult,
  DistributionComparisonGroup,
  DistributionDashboardWidgetPayload,
  DistributionGroupBy,
  DistributionMetadata,
  DistributionQueryRequest,
  DistributionQueryResponse,
  DistributionSavedAnalysisPayload,
  DistributionUserFilterConfig,
} from '@/types/distributionAnalysis'

const MOCK_DELAY = 260

const resolveMock = <T>(payload: T): Promise<T> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(payload), MOCK_DELAY)
  })

export const distributionAnalysisService = {
  getMetadata: (): Promise<DistributionMetadata> =>
    resolveMock(mockDistributionMetadata),
  getDefaultUserFilter: (): Promise<DistributionUserFilterConfig> =>
    resolveMock({ ...defaultDistributionFilter, conditions: [...defaultDistributionFilter.conditions] }),
  getDefaultGroupBys: (): Promise<DistributionGroupBy[]> =>
    resolveMock(defaultDistributionGroupBys.map((group) => ({ ...group }))),
  getDefaultComparisonGroups: (): Promise<DistributionComparisonGroup[]> =>
    resolveMock(defaultDistributionComparisonGroups.map((group) => ({
      ...group,
      userFilter: {
        ...group.userFilter,
        conditions: group.userFilter.conditions.map((condition) => ({ ...condition })),
      },
    }))),
  runAnalysis: (query: DistributionQueryRequest): Promise<DistributionQueryResponse> =>
    resolveMock(createDistributionResult(query)),
  saveAnalysis: (payload: DistributionSavedAnalysisPayload): Promise<DistributionActionResult> =>
    resolveMock(createSavedDistributionResult(payload)),
  saveWidgetToDashboard: (payload: DistributionDashboardWidgetPayload): Promise<DistributionActionResult> =>
    resolveMock(createDistributionDashboardResult(payload)),
}
