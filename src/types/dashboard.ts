import type { AlertEvent } from './alert'
import type { OperationCampaign } from './campaign'
import type { EntityId, ISODateTimeString, TrendDirection } from './common'
import type { Experiment } from './experiment'
import type { MetricSummary, MetricTrendPoint } from './metric'
import type { UserSegment } from './segment'

export interface DashboardKpiCard extends MetricSummary {
  icon: string
  routePath: string
}

export interface DashboardStoryStep {
  id: EntityId
  order: number
  title: string
  moduleName: string
  routePath: string
  status: 'completed' | 'current' | 'next'
  summary: string
}

export interface DashboardRecommendation {
  id: EntityId
  title: string
  reason: string
  priority: 'low' | 'medium' | 'high'
  expectedImpact: string
  actionRoute: string
}

export interface DashboardTrendPanel {
  title: string
  metricId: EntityId
  direction: TrendDirection
  trend: MetricTrendPoint[]
}

export interface DashboardOverview {
  generatedAt: ISODateTimeString
  kpiCards: DashboardKpiCard[]
  alertEvents: AlertEvent[]
  focusSegments: UserSegment[]
  activeCampaigns: OperationCampaign[]
  runningExperiments: Experiment[]
  recommendations: DashboardRecommendation[]
  trendPanels: DashboardTrendPanel[]
  storySteps: DashboardStoryStep[]
}
