import { experiments } from '@/mock/experiments'
import type { EntityId } from '@/types/common'
import type { Experiment, ExperimentGroup, ExperimentMetricResult } from '@/types/experiment'

const resolveMock = <T>(payload: T): Promise<T> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(payload), 180)
  })

export const getExperiments = (): Promise<Experiment[]> => resolveMock(experiments)

export const getExperimentById = (experimentId: EntityId): Promise<Experiment | undefined> =>
  resolveMock(experiments.find((experiment) => experiment.id === experimentId))

export const getExperimentsBySegment = (segmentId: EntityId): Promise<Experiment[]> =>
  resolveMock(experiments.filter((experiment) => experiment.targetSegmentIds.includes(segmentId)))

export const getExperimentByCampaignId = (campaignId: EntityId): Promise<Experiment | undefined> =>
  resolveMock(experiments.find((experiment) => experiment.relatedCampaignId === campaignId))

export const getExperimentGroups = (experimentId: EntityId): Promise<ExperimentGroup[]> => {
  const experiment = experiments.find((item) => item.id === experimentId)

  return resolveMock(experiment?.groups ?? [])
}

export const getExperimentMetricResults = (
  experimentId: EntityId,
): Promise<ExperimentMetricResult[]> => {
  const experiment = experiments.find((item) => item.id === experimentId)

  return resolveMock(experiment?.metricResults ?? [])
}

export const experimentService = {
  getExperiments,
  getExperimentById,
  getExperimentsBySegment,
  getExperimentByCampaignId,
  getExperimentGroups,
  getExperimentMetricResults,
}
