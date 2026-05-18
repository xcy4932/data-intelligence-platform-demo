import type {
  BusinessDomain,
  ComparisonValue,
  DateRange,
  EntityId,
  ISODateString,
  Owner,
  TimeGranularity,
  TrendDirection,
} from './common'

export type MetricValueFormat = 'number' | 'percent' | 'currency' | 'duration'

export type MetricHealthStatus = 'normal' | 'warning' | 'critical' | 'recovering'

export type MetricRuleOperator = '>' | '>=' | '<' | '<=' | '=' | 'between'

export interface MetricRule {
  id: EntityId
  name: string
  operator: MetricRuleOperator
  threshold: number
  secondaryThreshold?: number
  window: string
  description: string
}

export interface MetricDefinition {
  id: EntityId
  name: string
  displayName: string
  domain: BusinessDomain
  description: string
  unit: string
  valueFormat: MetricValueFormat
  dimensions: string[]
  owner: Owner
  dataSourceId: EntityId
  rules: MetricRule[]
  relatedMetricIds: EntityId[]
}

export interface MetricTrendPoint {
  date: ISODateString
  value: number
  target: number
  baseline: number
  forecast?: number
  lowerBound?: number
  upperBound?: number
  annotation?: string
}

export interface MetricSummary {
  metricId: EntityId
  label: string
  value: number
  unit: string
  valueFormat: MetricValueFormat
  comparison: ComparisonValue
  status: MetricHealthStatus
}

export interface MetricBreakdownItem {
  dimension: string
  name: string
  value: number
  share: number
  deltaRate: number
  status: MetricHealthStatus
}

export interface MetricCorrelation {
  metricId: EntityId
  metricName: string
  coefficient: number
  insight: string
}

export interface MetricAnomalyWindow {
  metricId: EntityId
  detectedAt: string
  dateRange: DateRange
  expectedValue: number
  actualValue: number
  deviationRate: number
  direction: TrendDirection
  confidence: number
  rootCauseSummary: string
  impactedSegmentIds: EntityId[]
}

export interface MetricAnalysis {
  metricId: EntityId
  granularity: TimeGranularity
  trend: MetricTrendPoint[]
  breakdowns: MetricBreakdownItem[]
  correlations: MetricCorrelation[]
  anomaly: MetricAnomalyWindow
}
