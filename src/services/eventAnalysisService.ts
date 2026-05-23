import {
  mockAffectedUsers,
  mockAnalysisResult,
  mockComparisonGroups,
  mockDashboardLocations,
  mockDefaultTemplate,
  mockDetailRows,
  mockDownloadTasks,
  mockEventDefinitions,
  mockEventMetadata,
  mockGroupByConfigs,
  mockMetricCards,
  mockMetricTrend,
} from '@/mock/eventAnalysis'
import { datasetService } from '@/services/datasetService'
import type {
  AffectedUser,
  ComparisonGroup,
  DashboardLocation,
  DownloadTask,
  DownloadTaskPayload,
  EventAnalysisDetailRow,
  EventAnalysisMetricCard,
  EventAnalysisQueryConfig,
  EventAnalysisResult,
  EventAnalysisTemplate,
  EventDefinition,
  EventMetadata,
  GroupByConfig,
  MetricTrendPoint,
  MockActionResult,
  SaveAnalysisConfigPayload,
  SavedAnalysis,
  SaveAsSegmentPayload,
  SaveDashboardPayload,
} from '@/types/eventAnalysis'

const MOCK_DELAY = 300
const EVENT_ANALYSIS_DATASET_ID = 'ds_low_coin_behavior_assoc'
const savedAnalyses: SavedAnalysis[] = []

const resolveMock = <T>(payload: T): Promise<T> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(payload), MOCK_DELAY)
  })

const clone = <T>(value: T): T => {
  try {
    return structuredClone(value)
  } catch {
    return JSON.parse(JSON.stringify(value)) as T
  }
}

function dimensionToMaskingField(dimension: string): string | undefined {
  if (dimension.includes('金币')) return 'coin_balance_level'
  if (dimension.includes('广告位')) return 'ad_position'
  if (dimension.includes('用户')) return 'user_id'
  return undefined
}

function maskDisplayValue(fieldName: string | undefined, value: string | number): string | number {
  if (!fieldName) return value
  return datasetService.maskFieldDisplayValue(EVENT_ANALYSIS_DATASET_ID, fieldName, value, 'visual_query') as string | number
}

function maskAnalysisResult(result: EventAnalysisResult, queryConfig: EventAnalysisQueryConfig): EventAnalysisResult {
  const selectedGroup = queryConfig.groupByConfigs.find((group) => group.id === queryConfig.chartConfig.selectedGroupById)
  const groupField = selectedGroup?.field
  const nextResult = clone(result)

  nextResult.tableRows = datasetService.applyRuntimeMaskingToRows(
    EVENT_ANALYSIS_DATASET_ID,
    nextResult.tableRows,
    'visual_query',
  )
  nextResult.groupSummaries = nextResult.groupSummaries.map((row) => {
    const fieldName = groupField ?? dimensionToMaskingField(row.dimension)
    return {
      ...row,
      groupName: String(maskDisplayValue(fieldName, row.groupName)),
    }
  })
  nextResult.percentageSeries = nextResult.percentageSeries.map((point) => ({
    ...point,
    groupName: String(maskDisplayValue(groupField, point.groupName)),
  }))
  nextResult.anomalyDiagnosis = {
    ...nextResult.anomalyDiagnosis,
    contributions: nextResult.anomalyDiagnosis.contributions.map((item) => {
      const fieldName = dimensionToMaskingField(item.dimension)
      return {
        ...item,
        dimensionValue: String(maskDisplayValue(fieldName, item.dimensionValue)),
      }
    }),
  }

  return nextResult
}

export const getEventMetadata = (): Promise<EventMetadata> => resolveMock(mockEventMetadata)

export const getDefaultTemplate = (): Promise<EventAnalysisTemplate> => resolveMock(mockDefaultTemplate)

export const runAnalysis = (queryConfig: EventAnalysisQueryConfig): Promise<EventAnalysisResult> => {
  const selectedGroupValue = queryConfig.chartConfig.selectedGroupValues[0]

  if (!selectedGroupValue) {
    return resolveMock(maskAnalysisResult(mockAnalysisResult, queryConfig))
  }

  const result = maskAnalysisResult(mockAnalysisResult, queryConfig)

  return resolveMock(result)
}

export const getAffectedUsers = (rowId?: string): Promise<AffectedUser[]> => {
  if (!rowId) {
    return resolveMock(datasetService.applyRuntimeMaskingToRows(EVENT_ANALYSIS_DATASET_ID, mockAffectedUsers, 'visual_query'))
  }

  const startIndex = rowId.length % 10

  return resolveMock(
    datasetService.applyRuntimeMaskingToRows(EVENT_ANALYSIS_DATASET_ID, mockAffectedUsers.slice(startIndex, startIndex + 30), 'visual_query'),
  )
}

export const saveAnalysisConfig = (
  payload: SaveAnalysisConfigPayload,
): Promise<MockActionResult> =>
  new Promise((resolve) => {
    setTimeout(() => {
      const now = new Date().toISOString()
      const existingIndex = payload.analysisId
        ? savedAnalyses.findIndex((analysis) => analysis.id === payload.analysisId)
        : -1
      const id = payload.analysisId ?? `analysis_${Date.now()}`
      const previous = existingIndex >= 0 ? savedAnalyses[existingIndex] : undefined
      const savedAnalysis: SavedAnalysis = {
        ...payload.savedAnalysis,
        id,
        name: payload.name,
        description: payload.description,
        visibility: payload.visibility,
        folderId: payload.folderId,
        tags: payload.tags,
        version: previous ? previous.version + 1 : 1,
        createdAt: previous?.createdAt ?? now,
        updatedAt: now,
      }

      if (existingIndex >= 0) {
        savedAnalyses.splice(existingIndex, 1, savedAnalysis)
      } else {
        savedAnalyses.unshift(savedAnalysis)
      }

      resolve({
        success: true,
        id,
        message: previous ? `分析「${payload.name}」修改已保存` : `分析「${payload.name}」已保存`,
      })
    }, MOCK_DELAY)
  })

export const saveAsSegment = (payload: SaveAsSegmentPayload): Promise<MockActionResult> =>
  resolveMock({
    success: true,
    id: 'seg_low_coin_ad_decline',
    message: `用户分群草稿「${payload.segmentName}」已生成，预计 ${payload.estimatedUsers} 人`,
  })

export const saveToDashboard = (payload: SaveDashboardPayload): Promise<MockActionResult> =>
  resolveMock({
    success: payload.chartName.trim().length > 0,
    id: `dashboard_chart_${payload.dashboardId}`,
    message: `组件「${payload.chartName}」已保存到看板`,
  })

export const createDownloadTask = (payload: DownloadTaskPayload): Promise<DownloadTask> =>
  new Promise((resolve) => {
    const containsMaskedFields = ['user_id', 'coin_balance_level'].some((fieldName) =>
      datasetService.isFieldMaskedForCurrentUser(EVENT_ANALYSIS_DATASET_ID, fieldName, 'download'),
    )
    if (containsMaskedFields) {
      datasetService.recordDesensitizationAudit(EVENT_ANALYSIS_DATASET_ID, 'download_masked_data', undefined, payload)
    }
    setTimeout(() => {
      resolve({
        id: `download_${Date.now()}`,
        name: payload.range === 'page_result' ? '事件分析页面结果 masked=true' : '事件分析更多数据 masked=true',
        range: payload.range,
        contents: payload.contents,
        format: payload.format,
        status: payload.range === 'page_result' ? 'completed' : 'created',
        createdAt: '2026-05-15T12:00:00+02:00',
        masked: containsMaskedFields,
        auditNote: containsMaskedFields ? '已按当前用户权限执行后端脱敏并记录下载审计。' : '当前下载不包含命中脱敏字段。',
      })
    }, MOCK_DELAY)
  })

export const getDashboardLocations = (): Promise<DashboardLocation[]> =>
  resolveMock(mockDashboardLocations)

export const getDownloadTasks = (): Promise<DownloadTask[]> => resolveMock(mockDownloadTasks)

export const getEventDefinitions = (): Promise<EventDefinition[]> => resolveMock(mockEventDefinitions)

export const getDefaultAnalysisTemplate = (): Promise<EventAnalysisTemplate> =>
  getDefaultTemplate()

export const getMetricCards = (): Promise<EventAnalysisMetricCard[]> => resolveMock(mockMetricCards)

export const getMetricTrend = (): Promise<MetricTrendPoint[]> => resolveMock(mockMetricTrend)

export const getComparisonGroups = (): Promise<ComparisonGroup[]> => resolveMock(mockComparisonGroups)

export const getGroupByConfigs = (): Promise<GroupByConfig[]> => resolveMock(mockGroupByConfigs)

export const getDetailRows = (): Promise<EventAnalysisDetailRow[]> => resolveMock(mockDetailRows)

export const eventAnalysisService = {
  getEventMetadata,
  getDefaultTemplate,
  runAnalysis,
  getAffectedUsers,
  saveAnalysisConfig,
  saveAsSegment,
  saveToDashboard,
  createDownloadTask,
  getDashboardLocations,
  getDownloadTasks,
  getEventDefinitions,
  getDefaultAnalysisTemplate,
  getMetricCards,
  getMetricTrend,
  getComparisonGroups,
  getGroupByConfigs,
  getDetailRows,
}
