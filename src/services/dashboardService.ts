import { dashboardOverview, dashboardRecommendations, dashboardStorySteps } from '@/mock/dashboard'
import type { DashboardOverview, DashboardRecommendation, DashboardStoryStep } from '@/types/dashboard'

const resolveMock = <T>(payload: T): Promise<T> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(payload), 180)
  })

export const getDashboardOverview = (): Promise<DashboardOverview> => resolveMock(dashboardOverview)

export const getDashboardRecommendations = (): Promise<DashboardRecommendation[]> =>
  resolveMock(dashboardRecommendations)

export const getDashboardStorySteps = (): Promise<DashboardStoryStep[]> => resolveMock(dashboardStorySteps)

export const dashboardService = {
  getDashboardOverview,
  getDashboardRecommendations,
  getDashboardStorySteps,
}
