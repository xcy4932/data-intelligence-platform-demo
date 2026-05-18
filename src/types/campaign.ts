import type { DateRange, EntityId, EntityStatus, ISODateTimeString, Owner } from './common'

export type CampaignPriority = 'low' | 'medium' | 'high' | 'urgent'

export type CampaignChannel = 'in_app_popup' | 'push' | 'message_center' | 'email' | 'task_banner'

export type CampaignTriggerType = 'scheduled' | 'event' | 'manual' | 'experiment'

export type CampaignStage = 'planning' | 'approval' | 'running' | 'evaluating' | 'closed'

export interface CampaignCreative {
  id: EntityId
  name: string
  channel: CampaignChannel
  title: string
  content: string
  callToAction: string
}

export interface CampaignStrategy {
  id: EntityId
  name: string
  triggerType: CampaignTriggerType
  description: string
  touchFrequencyCap: string
  rewardPolicy: string
}

export interface CampaignExecutionPlan {
  dateRange: DateRange
  channels: CampaignChannel[]
  targetSegmentIds: EntityId[]
  excludeSegmentIds: EntityId[]
  expectedReach: number
  budget: number
}

export interface CampaignEvaluationMetric {
  metricId: EntityId
  metricName: string
  baseline: number
  current: number
  liftRate: number
  conclusion: string
}

export interface OperationCampaign {
  id: EntityId
  name: string
  objective: string
  status: EntityStatus
  stage: CampaignStage
  priority: CampaignPriority
  owner: Owner
  createdAt: ISODateTimeString
  strategy: CampaignStrategy
  creatives: CampaignCreative[]
  executionPlan: CampaignExecutionPlan
  experimentId?: EntityId
  goalMetricIds: EntityId[]
  evaluationMetrics: CampaignEvaluationMetric[]
}
