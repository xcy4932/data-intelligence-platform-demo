import type { EntityId, EntityStatus, ISODateTimeString, Owner } from './common'

export type SegmentConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'between'
  | 'in'
  | 'not_in'

export type SegmentRefreshMode = 'manual' | 'hourly' | 'daily'

export type SegmentRiskLevel = 'low' | 'medium' | 'high'

export interface SegmentCondition {
  id: EntityId
  field: string
  label: string
  operator: SegmentConditionOperator
  value: string | number | boolean | Array<string | number>
}

export interface SegmentProfileMetric {
  label: string
  value: number
  unit: string
  benchmark: number
  deltaRate: number
}

export interface SegmentBehaviorInsight {
  id: EntityId
  title: string
  description: string
  evidenceMetricIds: EntityId[]
  confidence: number
}

export interface UserSegment {
  id: EntityId
  name: string
  description: string
  status: EntityStatus
  owner: Owner
  size: number
  coverageRate: number
  riskLevel: SegmentRiskLevel
  refreshMode: SegmentRefreshMode
  lastCalculatedAt: ISODateTimeString
  conditions: SegmentCondition[]
  profileMetrics: SegmentProfileMetric[]
  behaviorInsights: SegmentBehaviorInsight[]
  recommendedActions: string[]
  relatedMetricIds: EntityId[]
}
