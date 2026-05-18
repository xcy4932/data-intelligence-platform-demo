import type { DateRange, EntityId, EntityStatus, ISODateTimeString, Owner } from './common'

export type ExperimentStatus = EntityStatus | 'analyzing'

export type ExperimentMetricRole = 'primary' | 'guardrail' | 'diagnostic'

export type ExperimentDecision = 'ship_variant' | 'keep_observing' | 'rollback' | 'inconclusive'

export interface ExperimentGroup {
  id: EntityId
  name: string
  description: string
  splitRatio: number
  isControl: boolean
  sampleUsers: number
  strategySummary: string
}

export interface ExperimentMetricResult {
  metricId: EntityId
  metricName: string
  role: ExperimentMetricRole
  baseline: number
  groupResults: Array<{
    groupId: EntityId
    value: number
    liftRate: number
    confidence: number
  }>
  winnerGroupId?: EntityId
}

export interface ExperimentEvaluation {
  decision: ExperimentDecision
  conclusion: string
  rolloutRecommendation: string
  estimatedMonthlyImpact: number
  riskNotes: string[]
}

export interface Experiment {
  id: EntityId
  name: string
  hypothesis: string
  status: ExperimentStatus
  owner: Owner
  dateRange: DateRange
  createdAt: ISODateTimeString
  targetSegmentIds: EntityId[]
  relatedCampaignId?: EntityId
  groups: ExperimentGroup[]
  metricResults: ExperimentMetricResult[]
  evaluation: ExperimentEvaluation
}
