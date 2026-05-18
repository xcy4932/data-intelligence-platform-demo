import { operationCampaigns } from '@/mock/campaigns'
import type { OperationCampaign } from '@/types/campaign'
import type { EntityId } from '@/types/common'

const resolveMock = <T>(payload: T): Promise<T> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(payload), 180)
  })

export const getOperationCampaigns = (): Promise<OperationCampaign[]> => resolveMock(operationCampaigns)

export const getCampaignById = (campaignId: EntityId): Promise<OperationCampaign | undefined> =>
  resolveMock(operationCampaigns.find((campaign) => campaign.id === campaignId))

export const getCampaignsBySegment = (segmentId: EntityId): Promise<OperationCampaign[]> =>
  resolveMock(
    operationCampaigns.filter((campaign) => campaign.executionPlan.targetSegmentIds.includes(segmentId)),
  )

export const getCampaignsByExperiment = (experimentId: EntityId): Promise<OperationCampaign[]> =>
  resolveMock(operationCampaigns.filter((campaign) => campaign.experimentId === experimentId))

export const campaignService = {
  getOperationCampaigns,
  getCampaignById,
  getCampaignsBySegment,
  getCampaignsByExperiment,
}
