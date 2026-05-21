import { mockEventMetadata } from './eventAnalysis'
import type {
  AttributionActionResult,
  AttributionDashboardWidgetPayload,
  AttributionEventNode,
  AttributionFilterCondition,
  AttributionMetadata,
  AttributionModelType,
  AttributionPath,
  AttributionPathResponse,
  AttributionPropertyNode,
  AttributionQueryRequest,
  AttributionQueryResponse,
  AttributionResultRow,
  AttributionTrendResult,
  AttributionUserListResponse,
  RecommendedAttributionProperty,
  SavedAttributionAnalysisPayload,
  TouchPoint,
} from '@/types/attributionAnalysis'

const modelLabelMap: Record<AttributionModelType, string> = {
  FIRST_TOUCH: '首次归因',
  LAST_TOUCH: '末次归因',
  LINEAR: '线性归因',
  POSITION_BASED: '位置归因',
  TIME_DECAY: '时间衰减归因',
}

export const attributionModelLabels = modelLabelMap

export const recommendedAttributionProperties: RecommendedAttributionProperty[] = [
  { propertyScope: 'user_property', propertyName: 'utm_source', propertyDisplayName: '最近 UTM 来源', propertyType: 'string', platformTypes: ['app', 'web', 'mini_program'] },
  { propertyScope: 'user_property', propertyName: 'utm_campaign', propertyDisplayName: '最近 UTM 活动', propertyType: 'string', platformTypes: ['app', 'web', 'mini_program'] },
  { propertyScope: 'user_property', propertyName: 'first_utm_source', propertyDisplayName: '首次 UTM 来源', propertyType: 'string', platformTypes: ['app', 'web', 'mini_program'] },
  { propertyScope: 'ad_property', propertyName: 'campaign_name', propertyDisplayName: '广告活动名称', propertyType: 'string', platformTypes: ['app', 'web', 'mini_program'] },
  { propertyScope: 'ad_property', propertyName: 'creative_name', propertyDisplayName: '广告创意名称', propertyType: 'string', platformTypes: ['app', 'web'] },
  { propertyScope: 'ad_property', propertyName: 'tr_admaster', propertyDisplayName: '优化师', propertyType: 'string', platformTypes: ['app'] },
  { propertyScope: 'event_public_property', propertyName: 'channel', propertyDisplayName: '访问渠道', propertyType: 'string', platformTypes: ['web', 'internal'] },
  { propertyScope: 'user_property', propertyName: 'activation_channel', propertyDisplayName: '激活渠道', propertyType: 'string', platformTypes: ['app', 'mini_program'] },
  { propertyScope: 'user_tag', propertyName: 'payment_potential', propertyDisplayName: '付费潜力', propertyType: 'string', platformTypes: ['app', 'web', 'mini_program', 'internal'] },
]

export const mockAttributionMetadata: AttributionMetadata = {
  eventMetadata: mockEventMetadata,
  recommendedProperties: recommendedAttributionProperties,
}

export const defaultAttributionFilters: AttributionFilterCondition[] = [
  {
    id: 'attr_filter_active',
    relation: 'AND',
    fieldType: 'cohort',
    fieldName: 'seg_active_7d',
    fieldDisplayName: '用户分群',
    operator: 'in',
    value: ['seg_active_7d'],
    displayValue: '近 7 日活跃用户',
  },
]

const defaultEventNodeNames = ['ad_exposure', 'ad_click', 'ad_watch_start', 'reward_claim']

const findEventDisplayName = (eventName: string): string =>
  mockEventMetadata.events.find((event) => event.eventName === eventName)?.displayName ?? eventName

export const createDefaultEventNode = (index: number): AttributionEventNode => {
  const eventName = defaultEventNodeNames[index % defaultEventNodeNames.length] ?? 'ad_exposure'

  return {
    id: `attr_node_${Date.now()}_${index}`,
    nodeType: 'event',
    eventName,
    eventDisplayName: findEventDisplayName(eventName),
    alias: findEventDisplayName(eventName),
    filters: [],
  }
}

export const createDefaultPropertyNode = (): AttributionPropertyNode => ({
  id: 'attr_property_node_default',
  nodeType: 'property',
  sourceEventName: 'app_launch',
  propertyScope: 'user_property',
  propertyName: 'utm_source',
  propertyDisplayName: '最近 UTM 来源',
  valueLimit: 10,
  includeUnknown: true,
  includeOthers: true,
  filters: [],
})

const getConfiguredKeys = (query: AttributionQueryRequest): Array<{ key: string, label: string, nodeType: 'event' | 'property' | 'other' | 'unknown' }> => {
  const attributionConfig = query.attributionConfig

  if (attributionConfig.attributionType === 'property') {
    const base = ['facebook', 'tiktok', 'google', 'organic', 'xiaomi', 'huawei'].slice(0, attributionConfig.propertyNode.valueLimit)
    const rows: Array<{ key: string, label: string, nodeType: 'event' | 'property' | 'other' | 'unknown' }> = base.map((item) => ({
      key: `${attributionConfig.propertyNode.propertyName}:${item}`,
      label: `${attributionConfig.propertyNode.propertyDisplayName}=${item}`,
      nodeType: 'property' as const,
    }))

    if (attributionConfig.propertyNode.includeOthers) {
      rows.push({ key: 'others', label: '其他', nodeType: 'other' })
    }

    if (attributionConfig.propertyNode.includeUnknown) {
      rows.push({ key: 'unknown', label: '未知', nodeType: 'unknown' })
    }

    return rows
  }

  const nodes: Array<{ key: string, label: string, nodeType: 'event' | 'property' | 'other' | 'unknown' }> = attributionConfig.nodes.map((node) => ({
    key: node.id,
    label: node.alias || node.eventDisplayName,
    nodeType: 'event' as const,
  }))

  if (attributionConfig.includeOtherConversions) {
    nodes.push({ key: 'other_event', label: '其他事件', nodeType: 'other' })
  }

  return nodes
}

const createTimeBuckets = (startTime: string, endTime: string): string[] => {
  const buckets: string[] = []
  const cursor = new Date(`${startTime}T00:00:00`)
  const end = new Date(`${endTime}T00:00:00`)

  while (cursor <= end && buckets.length < 31) {
    buckets.push(cursor.toISOString().slice(0, 10))
    cursor.setDate(cursor.getDate() + 1)
  }

  return buckets
}

interface MockRawEvent {
  eventId: string
  subjectId: string
  eventName: string
  eventDisplayName: string
  eventTime: string
  properties: Record<string, string | number | boolean>
  userProperties: Record<string, string | number | boolean>
}

interface AttributionKeyDefinition {
  key: string
  label: string
  nodeType: 'event' | 'property' | 'other' | 'unknown'
  eventName?: string
  groupValues?: Record<string, string | number>
}

interface GeneratedAttributionPath {
  path: AttributionPath
  allTouches: TouchPoint[]
  otherConversionValue: number
}

interface ModelContribution {
  attributionKey: string
  attributionLabel: string
  nodeType: 'event' | 'property' | 'other' | 'unknown'
  targetMetricValue: number
  validTriggerCount: number
  timeBucket: string
}

interface AggregatedRowDraft {
  definition: AttributionKeyDefinition
  triggerCount: number
  validTriggerCount: number
  targetMetricValue: number
  dailyTriggerCounts: Map<string, number>
  dailyTargetValues: Map<string, number>
}

const propertyValuePool = ['facebook', 'tiktok', 'google', 'organic', 'xiaomi', 'huawei', 'unknown', 'podcast']

const createTargetMetricValue = (query: AttributionQueryRequest, index: number): number => {
  const aggregator = query.targetEvent?.metric.aggregator ?? 'COUNT'

  if (aggregator === 'SUM') {
    return 38 + (index % 7) * 16 + (index % 5) * 3
  }

  if (aggregator === 'AVG') {
    return 42 + (index % 6) * 4
  }

  if (aggregator === 'MAX') {
    return 98 + (index % 4) * 18
  }

  if (aggregator === 'MIN') {
    return 8 + (index % 5) * 2
  }

  return 1
}

const toTimestamp = (value: string): number => new Date(value).getTime()

const createEventRawTouch = (
  node: AttributionEventNode,
  target: MockRawEvent,
  pathIndex: number,
  touchIndex: number,
): MockRawEvent => {
  const hour = Math.max(1, 12 - touchIndex * 2 - (pathIndex % 3))
  const productId = String(target.properties.product_id)

  return {
    eventId: `${target.eventId}_touch_${touchIndex}`,
    subjectId: target.subjectId,
    eventName: node.eventName,
    eventDisplayName: node.eventDisplayName,
    eventTime: `${target.eventTime.slice(0, 11)}${String(hour).padStart(2, '0')}:${String(8 + touchIndex * 7).padStart(2, '0')}:00`,
    properties: {
      product_id: productId,
      ad_position: touchIndex % 2 === 0 ? '金币不足弹窗' : '任务中心',
      game_type: touchIndex % 3 === 0 ? '斗地主' : '麻将',
      campaign_name: touchIndex % 2 === 0 ? '低金币召回' : '会员试用',
    },
    userProperties: target.userProperties,
  }
}

const createPropertyRawTouch = (
  query: AttributionQueryRequest,
  target: MockRawEvent,
  pathIndex: number,
  touchIndex: number,
): MockRawEvent => {
  const propertyNode = query.attributionConfig.attributionType === 'property'
    ? query.attributionConfig.propertyNode
    : createDefaultPropertyNode()
  const rawValue = propertyValuePool[(pathIndex + touchIndex) % propertyValuePool.length] ?? 'organic'
  const propertyValue = rawValue === 'unknown' ? '' : rawValue

  return {
    eventId: `${target.eventId}_property_touch_${touchIndex}`,
    subjectId: target.subjectId,
    eventName: propertyNode.sourceEventName || 'app_launch',
    eventDisplayName: findEventDisplayName(propertyNode.sourceEventName || 'app_launch'),
    eventTime: `${target.eventTime.slice(0, 11)}${String(Math.max(1, 10 - touchIndex * 2)).padStart(2, '0')}:${String(12 + touchIndex * 6).padStart(2, '0')}:00`,
    properties: {
      product_id: String(target.properties.product_id),
      [propertyNode.propertyName]: propertyValue,
      campaign_name: rawValue === 'unknown' ? '' : `${rawValue}_campaign`,
    },
    userProperties: {
      ...target.userProperties,
      [propertyNode.propertyName]: propertyValue,
    },
  }
}

const createTargetEvent = (query: AttributionQueryRequest, bucket: string, index: number): MockRawEvent => {
  const targetEvent = query.targetEvent
  const productId = `sku_${1000 + (index % 18)}`

  return {
    eventId: `target_${bucket}_${index}`,
    subjectId: `u_${String(10000 + index).padStart(5, '0')}`,
    eventName: targetEvent?.eventName ?? 'payment_success',
    eventDisplayName: targetEvent?.eventDisplayName ?? '支付成功',
    eventTime: `${bucket}T${String(14 + (index % 8)).padStart(2, '0')}:${String(20 + (index % 30)).padStart(2, '0')}:00`,
    properties: {
      product_id: productId,
      pay_amount: createTargetMetricValue(query, index),
      item_type: index % 2 === 0 ? '会员' : '金币礼包',
    },
    userProperties: {
      channel: index % 3 === 0 ? '广告投放' : '自然量',
      coin_balance_level: index % 4 === 0 ? 'low' : 'normal',
      payment_potential: index % 5 === 0 ? '高' : '中',
    },
  }
}

const createProcessEvents = (query: AttributionQueryRequest, target: MockRawEvent, pathIndex: number): MockRawEvent[] => {
  if (!query.processEventConfig?.enabled) {
    return []
  }

  return query.processEventConfig.events.map((event, eventIndex) => ({
    eventId: `${target.eventId}_process_${eventIndex}`,
    subjectId: target.subjectId,
    eventName: event.eventName,
    eventDisplayName: event.eventDisplayName,
    eventTime: `${target.eventTime.slice(0, 11)}${String(Math.max(1, 9 - eventIndex)).padStart(2, '0')}:${String(5 + pathIndex % 20).padStart(2, '0')}:00`,
    properties: {
      product_id: String(target.properties.product_id),
      game_type: pathIndex % 2 === 0 ? '斗地主' : '麻将',
    },
    userProperties: target.userProperties,
  }))
}

const rawTouchToTouchPoint = (
  rawEvent: MockRawEvent,
  definition: AttributionKeyDefinition,
): TouchPoint => ({
  id: rawEvent.eventId,
  nodeId: definition.key,
  nodeType: definition.nodeType === 'property' ? 'property' : 'event',
  eventId: rawEvent.eventId,
  eventName: rawEvent.eventName,
  eventDisplayName: rawEvent.eventDisplayName,
  eventTime: rawEvent.eventTime,
  attributionKey: definition.key,
  attributionValue: definition.label,
  properties: rawEvent.properties,
})

const createEventDefinitions = (query: AttributionQueryRequest): AttributionKeyDefinition[] => {
  if (query.attributionConfig.attributionType !== 'event') {
    return []
  }

  const definitions: AttributionKeyDefinition[] = query.attributionConfig.nodes.map((node) => ({
    key: node.id,
    label: node.alias || node.eventDisplayName,
    nodeType: 'event' as const,
    eventName: node.eventName,
    groupValues: node.groupBy
      ? { [node.groupBy.fieldDisplayName]: node.groupBy.fieldName === 'ad_position' ? '金币不足弹窗' : '高价值' }
      : undefined,
  }))

  if (query.attributionConfig.includeOtherConversions) {
    definitions.push({
      key: 'other_event',
      label: '其他事件',
      nodeType: 'other',
      eventName: 'other_event',
      groupValues: undefined,
    })
  }

  return definitions
}

const resolvePropertyDefinition = (
  query: AttributionQueryRequest,
  rawTouch: MockRawEvent,
): AttributionKeyDefinition | null => {
  if (query.attributionConfig.attributionType !== 'property') {
    return null
  }

  const propertyNode = query.attributionConfig.propertyNode
  const rawValue = rawTouch.userProperties[propertyNode.propertyName] ?? rawTouch.properties[propertyNode.propertyName]
  const stringValue = rawValue === undefined || rawValue === '' ? '未知' : String(rawValue)

  if (stringValue === '未知' && !propertyNode.includeUnknown) {
    return null
  }

  const knownValues = propertyValuePool.filter((item) => item !== 'unknown').slice(0, propertyNode.valueLimit)
  const normalizedValue = knownValues.includes(stringValue)
    ? stringValue
    : propertyNode.includeOthers
      ? '其他'
      : null

  if (!normalizedValue) {
    return null
  }

  return {
    key: normalizedValue === '未知' || normalizedValue === '其他'
      ? normalizedValue === '未知' ? 'unknown' : 'others'
      : `${propertyNode.propertyName}:${normalizedValue}`,
    label: normalizedValue === '未知' || normalizedValue === '其他'
      ? normalizedValue
      : `${propertyNode.propertyDisplayName}=${normalizedValue}`,
    nodeType: normalizedValue === '未知' ? 'unknown' : normalizedValue === '其他' ? 'other' : 'property',
    eventName: rawTouch.eventName,
  }
}

const isInsideLookback = (targetTime: string, touchTime: string, query: AttributionQueryRequest): boolean => {
  const unitMsMap: Record<AttributionQueryRequest['lookbackWindow']['unit'], number> = {
    minute: 60 * 1000,
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
  }
  const targetTimestamp = toTimestamp(targetTime)
  const touchTimestamp = toTimestamp(touchTime)
  const lowerBound = targetTimestamp - query.lookbackWindow.value * unitMsMap[query.lookbackWindow.unit]

  return touchTimestamp <= targetTimestamp && touchTimestamp >= lowerBound
}

const passesProcessRequirement = (query: AttributionQueryRequest, processEvents: MockRawEvent[]): boolean => {
  if (!query.processEventConfig?.enabled || query.processEventConfig.events.length === 0) {
    return true
  }

  if (query.processEventConfig.relation === 'ANY_REQUIRED') {
    return processEvents.length > 0
  }

  const matchedNames = new Set(processEvents.map((event) => event.eventName))
  return query.processEventConfig.events.every((event) => matchedNames.has(event.eventName))
}

const createGeneratedPaths = (query: AttributionQueryRequest): GeneratedAttributionPath[] => {
  const buckets = createTimeBuckets(query.queryTime.startTime, query.queryTime.endTime)
  const pathCount = Math.max(buckets.length * 16, 48)
  const eventDefinitions = createEventDefinitions(query)
  const configuredEventNodes = query.attributionConfig.attributionType === 'event'
    ? query.attributionConfig.nodes
    : []
  const modelType = query.selectedModels[0] ?? 'LAST_TOUCH'

  return Array.from({ length: pathCount }, (_, pathIndex) => {
    const bucket = buckets[pathIndex % buckets.length] ?? query.queryTime.endTime
    const target = createTargetEvent(query, bucket, pathIndex)
    const processEvents = createProcessEvents(query, target, pathIndex)
    const targetMetricValue = createTargetMetricValue(query, pathIndex)
    const rawTouches = query.attributionConfig.attributionType === 'event'
      ? configuredEventNodes
        .filter((_node, nodeIndex) => pathIndex % 9 !== 0 && (nodeIndex <= pathIndex % configuredEventNodes.length || pathIndex % 5 === 0))
        .map((node, touchIndex) => createEventRawTouch(node, target, pathIndex, touchIndex))
      : Array.from({ length: pathIndex % 8 === 0 ? 0 : 1 + (pathIndex % 3) }, (_item, touchIndex) =>
        createPropertyRawTouch(query, target, pathIndex, touchIndex),
      )
    const touches = rawTouches
      .filter((rawTouch) => isInsideLookback(target.eventTime, rawTouch.eventTime, query))
      .map((rawTouch) => {
        if (query.attributionConfig.attributionType === 'event') {
          const nodeDefinition = eventDefinitions.find((definition) => definition.eventName === rawTouch.eventName)
          return nodeDefinition ? rawTouchToTouchPoint(rawTouch, nodeDefinition) : null
        }

        const propertyDefinition = resolvePropertyDefinition(query, rawTouch)
        return propertyDefinition ? rawTouchToTouchPoint(rawTouch, propertyDefinition) : null
      })
      .filter((touch): touch is TouchPoint => touch !== null)
      .sort((left, right) => toTimestamp(left.eventTime) - toTimestamp(right.eventTime))
    const isProcessMatched = passesProcessRequirement(query, processEvents)
    const finalTouches = isProcessMatched ? touches : []
    const isOtherConversion = query.attributionConfig.attributionType === 'event'
      && query.attributionConfig.includeOtherConversions
      && finalTouches.length === 0
    const path: AttributionPath = {
      pathId: `attr_path_${pathIndex}`,
      subjectId: target.subjectId,
      targetEventId: target.eventId,
      targetEventName: target.eventName,
      targetEventDisplayName: target.eventDisplayName,
      targetEventTime: target.eventTime,
      targetMetricValue,
      modelType,
      touches: finalTouches,
      touchWeights: [],
      processEvents: processEvents.map((event) => ({
        eventId: event.eventId,
        eventName: event.eventName,
        eventDisplayName: event.eventDisplayName,
        eventTime: event.eventTime,
        properties: event.properties,
      })),
    }

    return {
      path,
      allTouches: finalTouches,
      otherConversionValue: isOtherConversion ? targetMetricValue : 0,
    }
  })
}

const createWeights = (
  touches: TouchPoint[],
  targetTime: string,
  modelType: AttributionModelType,
  query: AttributionQueryRequest,
): Map<string, number> => {
  const weights = new Map<string, number>()

  if (touches.length === 0) {
    return weights
  }

  if (modelType === 'FIRST_TOUCH') {
    weights.set(touches[0]?.id ?? '', 1)
    return weights
  }

  if (modelType === 'LAST_TOUCH') {
    weights.set(touches[touches.length - 1]?.id ?? '', 1)
    return weights
  }

  if (modelType === 'LINEAR') {
    const weight = 1 / touches.length
    touches.forEach((touch) => weights.set(touch.id, weight))
    return weights
  }

  if (modelType === 'POSITION_BASED') {
    if (touches.length === 1) {
      weights.set(touches[0]?.id ?? '', 1)
      return weights
    }

    if (touches.length === 2) {
      weights.set(touches[0]?.id ?? '', 0.5)
      weights.set(touches[1]?.id ?? '', 0.5)
      return weights
    }

    const firstWeight = query.modelOptions.positionBased.firstWeight / 100
    const lastWeight = query.modelOptions.positionBased.lastWeight / 100
    const middleWeight = Math.max(1 - firstWeight - lastWeight, 0) / (touches.length - 2)
    touches.forEach((touch, index) => {
      if (index === 0) weights.set(touch.id, firstWeight)
      else if (index === touches.length - 1) weights.set(touch.id, lastWeight)
      else weights.set(touch.id, middleWeight)
    })
    return weights
  }

  const halfLifeMs = query.modelOptions.timeDecay.halfLifeValue
    * (query.modelOptions.timeDecay.halfLifeUnit === 'day' ? 24 : 1)
    * 60
    * 60
    * 1000
  const rawWeights = touches.map((touch) => {
    const distanceMs = Math.max(0, toTimestamp(targetTime) - toTimestamp(touch.eventTime))
    return {
      touchId: touch.id,
      value: Math.pow(0.5, distanceMs / halfLifeMs),
    }
  })
  const total = rawWeights.reduce((sum, item) => sum + item.value, 0)
  rawWeights.forEach((item) => weights.set(item.touchId, total === 0 ? 0 : item.value / total))

  return weights
}

const pearson = (left: number[], right: number[]): number | undefined => {
  if (left.length < 2 || left.length !== right.length) return undefined

  const leftAvg = left.reduce((sum, value) => sum + value, 0) / left.length
  const rightAvg = right.reduce((sum, value) => sum + value, 0) / right.length
  const numerator = left.reduce((sum, value, index) => sum + (value - leftAvg) * ((right[index] ?? 0) - rightAvg), 0)
  const leftVariance = left.reduce((sum, value) => sum + Math.pow(value - leftAvg, 2), 0)
  const rightVariance = right.reduce((sum, value) => sum + Math.pow(value - rightAvg, 2), 0)
  const denominator = Math.sqrt(leftVariance * rightVariance)

  if (denominator === 0) return undefined

  return Number((numerator / denominator).toFixed(2))
}

const createRowsForModel = (
  query: AttributionQueryRequest,
  modelType: AttributionModelType,
  generatedPaths: GeneratedAttributionPath[],
  keyDefinitions: AttributionKeyDefinition[],
): AttributionResultRow[] => {
  const buckets = createTimeBuckets(query.queryTime.startTime, query.queryTime.endTime)
  const draftMap = new Map<string, AggregatedRowDraft>()
  const targetSeriesByBucket = new Map<string, number>()

  keyDefinitions.forEach((definition) => {
    draftMap.set(definition.key, {
      definition,
      triggerCount: 0,
      validTriggerCount: 0,
      targetMetricValue: 0,
      dailyTriggerCounts: new Map(),
      dailyTargetValues: new Map(),
    })
  })

  generatedPaths.forEach(({ path, allTouches, otherConversionValue }) => {
    const bucket = path.targetEventTime.slice(0, 10)
    targetSeriesByBucket.set(bucket, (targetSeriesByBucket.get(bucket) ?? 0) + path.targetMetricValue)
    allTouches.forEach((touch) => {
      const draft = draftMap.get(touch.attributionKey)
      if (!draft) return
      draft.triggerCount += 1
      draft.dailyTriggerCounts.set(bucket, (draft.dailyTriggerCounts.get(bucket) ?? 0) + 1)
    })

    if (otherConversionValue > 0) {
      const otherDraft = draftMap.get('other_event')
      if (otherDraft) {
        otherDraft.triggerCount += 1
        otherDraft.validTriggerCount += 1
        otherDraft.targetMetricValue += otherConversionValue
        otherDraft.dailyTriggerCounts.set(bucket, (otherDraft.dailyTriggerCounts.get(bucket) ?? 0) + 1)
        otherDraft.dailyTargetValues.set(bucket, (otherDraft.dailyTargetValues.get(bucket) ?? 0) + otherConversionValue)
      }
      return
    }

    const weights = createWeights(path.touches, path.targetEventTime, modelType, query)
    path.touches.forEach((touch) => {
      const weight = weights.get(touch.id) ?? 0
      const draft = draftMap.get(touch.attributionKey)
      if (!draft || weight <= 0) return

      draft.validTriggerCount += 1
      draft.targetMetricValue += path.targetMetricValue * weight
      draft.dailyTargetValues.set(bucket, (draft.dailyTargetValues.get(bucket) ?? 0) + path.targetMetricValue * weight)
    })
  })

  const contributionTotal = Array.from(draftMap.values()).reduce((sum, draft) => sum + draft.targetMetricValue, 0)
  const targetSeries = buckets.map((bucket) => targetSeriesByBucket.get(bucket) ?? 0)

  return Array.from(draftMap.values())
    .filter((draft) => draft.triggerCount > 0 || draft.targetMetricValue > 0)
    .map((draft) => {
      const triggerSeries = buckets.map((bucket) => draft.dailyTriggerCounts.get(bucket) ?? 0)
      return {
        rowId: `${modelType}_${draft.definition.key}`,
        attributionKey: draft.definition.key,
        attributionLabel: draft.definition.label,
        nodeType: draft.definition.nodeType,
        triggerCount: draft.triggerCount,
        validTriggerCount: draft.validTriggerCount,
        validTriggerRate: draft.triggerCount === 0 ? 0 : draft.validTriggerCount / draft.triggerCount,
        targetMetricValue: Number(draft.targetMetricValue.toFixed(2)),
        contributionRate: contributionTotal === 0 ? 0 : draft.targetMetricValue / contributionTotal,
        correlation: draft.definition.nodeType === 'other' || draft.definition.nodeType === 'unknown'
          ? undefined
          : pearson(triggerSeries, targetSeries),
        modelType,
        groupValues: draft.definition.groupValues,
      }
    })
    .sort((left, right) => right.contributionRate - left.contributionRate)
}

const createPathSamplesForModel = (
  query: AttributionQueryRequest,
  generatedPaths: GeneratedAttributionPath[],
  modelType: AttributionModelType,
): AttributionPath[] =>
  generatedPaths.slice(0, 12).map(({ path }) => {
    const weights = createWeights(path.touches, path.targetEventTime, modelType, query)
    return {
      ...path,
      modelType,
      touchWeights: path.touches.map((touch) => {
        const weight = weights.get(touch.id) ?? 0
        return {
          touchId: touch.id,
          attributionLabel: touch.attributionValue,
          weight,
          attributedValue: Number((path.targetMetricValue * weight).toFixed(2)),
        }
      }),
    }
  })

const createTrend = (
  query: AttributionQueryRequest,
  rowsByModel: AttributionQueryResponse['models'],
  generatedPaths: GeneratedAttributionPath[],
): AttributionTrendResult[] => {
  const buckets = createTimeBuckets(query.queryTime.startTime, query.queryTime.endTime)

  return buckets.flatMap((bucket) =>
    rowsByModel.map((model) => {
      const bucketContributions = new Map<string, ModelContribution>()
      generatedPaths
        .filter(({ path }) => path.targetEventTime.startsWith(bucket))
        .forEach(({ path, otherConversionValue }) => {
          if (otherConversionValue > 0) {
            bucketContributions.set('other_event', {
              attributionKey: 'other_event',
              attributionLabel: '其他事件',
              nodeType: 'other',
              targetMetricValue: (bucketContributions.get('other_event')?.targetMetricValue ?? 0) + otherConversionValue,
              validTriggerCount: (bucketContributions.get('other_event')?.validTriggerCount ?? 0) + 1,
              timeBucket: bucket,
            })
            return
          }

          const weights = createWeights(path.touches, path.targetEventTime, model.modelType, query)
          path.touches.forEach((touch) => {
            const weight = weights.get(touch.id) ?? 0
            if (weight <= 0) return
            const current = bucketContributions.get(touch.attributionKey)
            bucketContributions.set(touch.attributionKey, {
              attributionKey: touch.attributionKey,
              attributionLabel: touch.attributionValue,
              nodeType: touch.nodeType,
              targetMetricValue: (current?.targetMetricValue ?? 0) + path.targetMetricValue * weight,
              validTriggerCount: (current?.validTriggerCount ?? 0) + 1,
              timeBucket: bucket,
            })
          })
        })
      const bucketTotal = Array.from(bucketContributions.values()).reduce((sum, item) => sum + item.targetMetricValue, 0)
      return {
        timeBucket: bucket,
        modelType: model.modelType,
        rows: Array.from(bucketContributions.values()).map((item) => ({
          attributionKey: item.attributionKey,
          attributionLabel: item.attributionLabel,
          targetMetricValue: Number(item.targetMetricValue.toFixed(2)),
          contributionRate: bucketTotal === 0 ? 0 : item.targetMetricValue / bucketTotal,
          triggerCount: item.validTriggerCount,
          validTriggerRate: 1,
        })),
      }
    }),
  )
}

const createKeyDefinitionsFromGeneratedPaths = (
  query: AttributionQueryRequest,
  generatedPaths: GeneratedAttributionPath[],
): AttributionKeyDefinition[] => {
  if (query.attributionConfig.attributionType === 'event') {
    return createEventDefinitions(query)
  }

  const definitionMap = new Map<string, AttributionKeyDefinition>()
  generatedPaths.forEach(({ path }) => {
    path.touches.forEach((touch) => {
      definitionMap.set(touch.attributionKey, {
        key: touch.attributionKey,
        label: touch.attributionValue,
        nodeType: touch.attributionKey === 'unknown'
          ? 'unknown'
          : touch.attributionKey === 'others'
            ? 'other'
            : 'property',
        eventName: touch.eventName,
      })
    })
  })

  return Array.from(definitionMap.values())
}

export const createAttributionResult = (query: AttributionQueryRequest): AttributionQueryResponse => {
  if (!query.targetEvent || getConfiguredKeys(query).length === 0) {
    return {
      queryId: `attr_empty_${Date.now()}`,
      executedAt: new Date().toISOString(),
      timezone: query.timezone,
      summary: {
        targetEventCount: 0,
        attributedTargetMetric: 0,
        unattributedTargetMetric: 0,
        attributedRate: 0,
        modelCount: query.selectedModels.length,
      },
      models: [],
      trend: [],
      pathSamples: [],
      metadata: {
        targetEventName: '',
        targetEventDisplayName: '',
        attributionType: query.attributionConfig.attributionType,
        lookbackWindowLabel: `${query.lookbackWindow.value} ${query.lookbackWindow.unit}`,
        queryTimeLabel: `${query.queryTime.startTime} 至 ${query.queryTime.endTime}`,
      },
    }
  }

  const generatedPaths = createGeneratedPaths(query)
  const keyDefinitions = createKeyDefinitionsFromGeneratedPaths(query, generatedPaths)
  const models = query.selectedModels.map((modelType) => {
    const rows = createRowsForModel(query, modelType, generatedPaths, keyDefinitions)
    const targetMetricTotal = rows.reduce((sum, row) => sum + row.targetMetricValue, 0)
    const validTouchCount = rows.reduce((sum, row) => sum + row.validTriggerCount, 0)

    return {
      modelType,
      rows,
      totals: {
        targetMetricTotal,
        validTouchCount,
        contributionTotal: rows.reduce((sum, row) => sum + row.contributionRate, 0),
      },
    }
  })
  const attributedTargetMetric = models[0]?.totals.targetMetricTotal ?? 0
  const rawTargetMetricTotal = generatedPaths.reduce((sum, item) => sum + item.path.targetMetricValue, 0)
  const unattributedTargetMetric = Number(Math.max(rawTargetMetricTotal - attributedTargetMetric, 0).toFixed(2))
  const attributedPathCount = generatedPaths.filter((item) => item.path.touches.length > 0 || item.otherConversionValue > 0).length

  return {
    queryId: `attr_query_${Date.now()}`,
    executedAt: new Date().toISOString(),
    timezone: query.timezone,
    summary: {
      targetEventCount: generatedPaths.length,
      attributedTargetMetric,
      unattributedTargetMetric,
      attributedRate: generatedPaths.length === 0 ? 0 : attributedPathCount / generatedPaths.length,
      modelCount: query.selectedModels.length,
    },
    models,
    trend: createTrend(query, models, generatedPaths),
    pathSamples: createPathSamplesForModel(query, generatedPaths, query.selectedModels[0] ?? 'LAST_TOUCH'),
    metadata: {
      targetEventName: query.targetEvent.eventName,
      targetEventDisplayName: query.targetEvent.eventDisplayName,
      attributionType: query.attributionConfig.attributionType,
      lookbackWindowLabel: `${query.lookbackWindow.value}${query.lookbackWindow.unit === 'day' ? ' 天' : query.lookbackWindow.unit === 'hour' ? ' 小时' : ' 分钟'}`,
      queryTimeLabel: `${query.queryTime.startTime} 至 ${query.queryTime.endTime}`,
    },
  }
}

export const createAttributionUsers = (
  queryId: string,
  attributionLabel: string,
): AttributionUserListResponse => ({
  total: 168,
  users: Array.from({ length: 12 }, (_, index) => ({
    subjectId: `u_${String(20001 + index).padStart(5, '0')}`,
    targetEventId: `${queryId}_target_${index}`,
    targetEventTime: `2026-05-${String(10 + index).padStart(2, '0')} 18:${String(10 + index).padStart(2, '0')}`,
    targetMetricValue: index % 3 === 0 ? 128 : 1,
    attributedValue: index % 3 === 0 ? 64 : 0.5,
    attributionWeight: index % 2 === 0 ? 0.5 : 1,
    pathSummary: `${attributionLabel} → 支付成功`,
  })),
})

export const createAttributionPaths = (query: AttributionQueryRequest, attributionKey?: string): AttributionPathResponse => {
  const paths = createPathSamplesForModel(
    query,
    createGeneratedPaths(query),
    query.selectedModels[0] ?? 'LAST_TOUCH',
  )
  const filteredPaths = attributionKey
    ? paths.filter((path) => path.touches.some((touch) => touch.attributionKey === attributionKey))
    : paths

  return {
    total: filteredPaths.length,
    paths: filteredPaths,
  }
}

export const createSavedAttributionResult = (payload: SavedAttributionAnalysisPayload): AttributionActionResult => ({
  success: true,
  id: `saved_attr_${Date.now()}`,
  message: `已保存归因分析「${payload.name}」。`,
})

export const createAttributionDashboardResult = (payload: AttributionDashboardWidgetPayload): AttributionActionResult => ({
  success: true,
  id: `dashboard_attr_${Date.now()}`,
  message: `已保存到看板「${payload.dashboard}」。`,
})
