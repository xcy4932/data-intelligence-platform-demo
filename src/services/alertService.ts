import { alertEvents } from '@/mock/alerts'
import type { AlertEvent } from '@/types/alert'
import type { EntityId } from '@/types/common'

const resolveMock = <T>(payload: T): Promise<T> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(payload), 180)
  })

export const getAlertEvents = (): Promise<AlertEvent[]> => resolveMock(alertEvents)

export const getAlertById = (alertId: EntityId): Promise<AlertEvent | undefined> =>
  resolveMock(alertEvents.find((alert) => alert.id === alertId))

export const getOpenAlerts = (): Promise<AlertEvent[]> =>
  resolveMock(alertEvents.filter((alert) => alert.status === 'open' || alert.status === 'acknowledged'))

export const getAlertsByMetric = (metricId: EntityId): Promise<AlertEvent[]> =>
  resolveMock(alertEvents.filter((alert) => alert.relatedMetricIds.includes(metricId)))

export const getAlertsBySegment = (segmentId: EntityId): Promise<AlertEvent[]> =>
  resolveMock(alertEvents.filter((alert) => alert.impactedSegmentIds.includes(segmentId)))

export const alertService = {
  getAlertEvents,
  getAlertById,
  getOpenAlerts,
  getAlertsByMetric,
  getAlertsBySegment,
}
