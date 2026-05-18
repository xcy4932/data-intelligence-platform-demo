import type { DateRange, EntityId, ISODateTimeString, Owner } from './common'

export type AlertSeverity = 'info' | 'warning' | 'critical'

export type AlertStatus = 'open' | 'acknowledged' | 'resolved' | 'muted'

export type AlertSource = 'metric_monitor' | 'data_quality' | 'experiment_guardrail' | 'operation'

export interface AlertAssignee {
  owner: Owner
  acknowledgedAt?: ISODateTimeString
}

export interface AlertTimelineItem {
  at: ISODateTimeString
  actor: string
  action: string
  note: string
}

export interface AlertEvent {
  id: EntityId
  title: string
  description: string
  severity: AlertSeverity
  status: AlertStatus
  source: AlertSource
  triggeredAt: ISODateTimeString
  resolvedAt?: ISODateTimeString
  dateRange: DateRange
  relatedMetricIds: EntityId[]
  impactedSegmentIds: EntityId[]
  linkedCampaignIds: EntityId[]
  assignee: AlertAssignee
  timeline: AlertTimelineItem[]
}
