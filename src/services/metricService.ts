import {
  metricAnalyses,
  metricDataSources,
  metricDefinitions,
  metricSummaries,
} from '@/mock/metrics'
import type { DataSourceRef, EntityId } from '@/types/common'
import type { MetricAnalysis, MetricDefinition, MetricSummary } from '@/types/metric'

const resolveMock = <T>(payload: T): Promise<T> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(payload), 180)
  })

export const getMetricDefinitions = (): Promise<MetricDefinition[]> => resolveMock(metricDefinitions)

export const getMetricDefinition = (metricId: EntityId): Promise<MetricDefinition | undefined> =>
  resolveMock(metricDefinitions.find((metric) => metric.id === metricId))

export const getMetricSummaries = (): Promise<MetricSummary[]> => resolveMock(metricSummaries)

export const getMetricAnalysis = (metricId: EntityId): Promise<MetricAnalysis | undefined> =>
  resolveMock(metricAnalyses.find((analysis) => analysis.metricId === metricId))

export const getMetricAnalyses = (): Promise<MetricAnalysis[]> => resolveMock(metricAnalyses)

export const getMetricDataSources = (): Promise<DataSourceRef[]> => resolveMock(metricDataSources)

export const metricService = {
  getMetricDefinitions,
  getMetricDefinition,
  getMetricSummaries,
  getMetricAnalysis,
  getMetricAnalyses,
  getMetricDataSources,
}
