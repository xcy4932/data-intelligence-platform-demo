import { userSegments } from '@/mock/segments'
import type { EntityId } from '@/types/common'
import type { UserSegment } from '@/types/segment'

const resolveMock = <T>(payload: T): Promise<T> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(payload), 180)
  })

export const getUserSegments = (): Promise<UserSegment[]> => resolveMock(userSegments)

export const getSegmentById = (segmentId: EntityId): Promise<UserSegment | undefined> =>
  resolveMock(userSegments.find((segment) => segment.id === segmentId))

export const getSegmentsByMetric = (metricId: EntityId): Promise<UserSegment[]> =>
  resolveMock(userSegments.filter((segment) => segment.relatedMetricIds.includes(metricId)))

export const getHighRiskSegments = (): Promise<UserSegment[]> =>
  resolveMock(userSegments.filter((segment) => segment.riskLevel === 'high'))

export const segmentService = {
  getUserSegments,
  getSegmentById,
  getSegmentsByMetric,
  getHighRiskSegments,
}
