import { mockEventMetadata } from './eventAnalysis'
import type {
  AggregatedPathEdge,
  AggregatedPathNode,
  HiddenNodeGroup,
  UserPathActionResult,
  UserPathDashboardWidgetPayload,
  UserPathEventConfig,
  UserPathFilterCondition,
  UserPathMetadata,
  UserPathNodeType,
  UserPathQueryRequest,
  UserPathQueryResponse,
  UserPathSample,
  UserPathSampleResponse,
  UserPathUserListResponse,
  SavedUserPathAnalysisPayload,
} from '@/types/userPathAnalysis'

interface RawPathEvent {
  eventId: string
  subjectId: string
  eventName: string
  eventDisplayName: string
  eventTime: string
  serverTime: string
  properties: Record<string, string | number | boolean>
  userProperties: Record<string, string | number | boolean>
}

interface PathInstanceNode {
  stepIndex: number
  nodeKey: string
  nodeLabel: string
  nodeType: UserPathNodeType
  eventName?: string
  eventTime?: string
  originalEventName?: string
  originalEventDisplayName?: string
}

interface PathInstance {
  pathInstanceId: string
  subjectId: string
  nodes: PathInstanceNode[]
}

const dropOffNode = {
  nodeKey: '__DROP_OFF__',
  nodeLabel: '流失',
  nodeType: 'DROP_OFF' as const,
}

const unselectedNode = {
  nodeKey: '__UNSELECTED__',
  nodeLabel: '未选中事件',
  nodeType: 'UNSELECTED_EVENT' as const,
}

const noPreviousNode = {
  nodeKey: '__NO_PREVIOUS__',
  nodeLabel: '无前序事件',
  nodeType: 'NO_PREVIOUS_EVENT' as const,
}

const moreNode = {
  nodeKey: '__MORE_GROUP__',
  nodeLabel: '更多分组',
  nodeType: 'MORE_GROUP' as const,
}

const eventDisplayNameMap = new Map(mockEventMetadata.events.map((event) => [event.eventName, event.displayName]))

const eventName = (name: string): string => eventDisplayNameMap.get(name) ?? name

export const mockUserPathMetadata: UserPathMetadata = {
  eventMetadata: mockEventMetadata,
}

export const defaultUserPathFilters: UserPathFilterCondition[] = [
  {
    id: 'path_filter_active_user',
    relation: 'AND',
    fieldType: 'cohort',
    fieldName: 'seg_active_7d',
    fieldDisplayName: '用户分群',
    operator: 'in',
    value: ['seg_active_7d'],
    displayValue: '近 7 日活跃用户',
    childFilters: [],
  },
]

export const createDefaultPathEvent = (eventNameValue: string, index: number, isCoreEvent = false): UserPathEventConfig => ({
  id: `${isCoreEvent ? 'core' : 'path_event'}_${eventNameValue}_${index}`,
  eventName: eventNameValue,
  eventDisplayName: eventName(eventNameValue),
  alias: eventName(eventNameValue),
  isCoreEvent,
  filters: {
    relation: 'AND',
    conditions: [],
  },
})

const buildDefaultRawEvents = (subjectIndex: number, bucket: string): RawPathEvent[] => {
  const subjectId = `u_${String(30000 + subjectIndex).padStart(5, '0')}`
  const gameType = subjectIndex % 3 === 0 ? '斗地主' : subjectIndex % 3 === 1 ? '麻将' : '德州扑克'
  const adPosition = subjectIndex % 2 === 0 ? '金币不足弹窗' : '任务中心'
  const channel = subjectIndex % 4 === 0 ? '广告投放' : subjectIndex % 4 === 1 ? '自然量' : subjectIndex % 4 === 2 ? '社交裂变' : '应用商店'
  const baseMinute = 8 + subjectIndex % 20
  const eventNames = subjectIndex % 6 === 0
    ? ['app_launch', 'game_start', 'game_end']
    : subjectIndex % 6 === 1
      ? ['app_launch', 'game_start', 'ad_exposure', 'task_center_enter', 'ad_click', 'ad_watch_start', 'ad_watch_complete', 'reward_claim']
      : subjectIndex % 6 === 2
        ? ['app_launch', 'ad_exposure', 'ad_click', 'ad_exposure', 'ad_watch_start', 'reward_claim']
        : subjectIndex % 6 === 3
          ? ['app_launch', 'task_center_enter', 'ad_exposure', 'ad_click', 'payment_success']
          : subjectIndex % 6 === 4
            ? ['app_launch', 'game_start', 'virtual_low_coin_ad_trigger', 'ad_exposure', 'ad_click', 'ad_watch_start', 'ad_watch_complete']
            : ['app_launch', 'circle_home_ad_click', 'ad_exposure', 'game_start', 'game_end', 'payment_success']

  return eventNames.map((name, eventIndex) => {
    const minute = baseMinute + eventIndex * (subjectIndex % 9 === 0 ? 14 : 3)
    const eventTime = `${bucket}T10:${String(minute).padStart(2, '0')}:00`

    return {
      eventId: `${subjectId}_${bucket}_${eventIndex}_${name}`,
      subjectId,
      eventName: name,
      eventDisplayName: eventName(name),
      eventTime,
      serverTime: eventTime,
      properties: {
        game_type: gameType,
        ad_position: adPosition,
        channel,
        app_version: subjectIndex % 3 === 0 ? '1.8.3' : '1.8.2',
      },
      userProperties: {
        channel,
        coin_balance_level: subjectIndex % 4 === 0 ? '低金币' : '正常金币',
        active_level: subjectIndex % 5 === 0 ? '高活跃' : '中活跃',
      },
    }
  })
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

const sessionIntervalMs = (query: UserPathQueryRequest): number => {
  const unitMap: Record<UserPathQueryRequest['sessionConfig']['intervalUnit'], number> = {
    second: 1000,
    minute: 60 * 1000,
    hour: 60 * 60 * 1000,
  }

  return query.sessionConfig.intervalValue * unitMap[query.sessionConfig.intervalUnit]
}

const toTimestamp = (value: string): number => new Date(value).getTime()

const rawToNode = (event: RawPathEvent, stepIndex: number, query: UserPathQueryRequest): PathInstanceNode => {
  const groupBy = query.groupBy

  if (groupBy.enabled && groupBy.targetEventId === event.eventName) {
    const groupValue = String(event.properties[groupBy.fieldName] ?? event.userProperties[groupBy.fieldName] ?? '未知属性值')
    return {
      stepIndex,
      nodeKey: `${event.eventName}:${groupBy.fieldName}:${groupValue}`,
      nodeLabel: `${event.eventDisplayName}_${groupValue}`,
      nodeType: groupValue === '未知属性值' ? 'UNKNOWN_GROUP_VALUE' : 'EVENT',
      eventName: event.eventName,
      eventTime: event.eventTime,
    }
  }

  return {
    stepIndex,
    nodeKey: event.eventName,
    nodeLabel: event.eventDisplayName,
    nodeType: 'EVENT',
    eventName: event.eventName,
    eventTime: event.eventTime,
  }
}

const pushDisplayNode = (
  nodes: PathInstanceNode[],
  node: PathInstanceNode,
  mergeConsecutiveDuplicateEvents: boolean,
) => {
  const lastNode = nodes.at(-1)
  if (mergeConsecutiveDuplicateEvents && lastNode?.nodeKey === node.nodeKey) return
  nodes.push(node)
}

const createPathInstances = (query: UserPathQueryRequest): PathInstance[] => {
  if (!query.coreEvent) return []

  const buckets = createTimeBuckets(query.timeConfig.startTime, query.timeConfig.endTime)
  const displayEventSet = new Set([
    query.coreEvent.eventName,
    ...query.intermediateEvents.map((event) => event.eventName),
  ])
  const intervalMs = sessionIntervalMs(query)
  const rawEventsBySubject = Array.from({ length: Math.max(80, buckets.length * 28) }, (_, index) =>
    buildDefaultRawEvents(index, buckets[index % buckets.length] ?? query.timeConfig.endTime),
  )
  const instances: PathInstance[] = []

  rawEventsBySubject.forEach((events, subjectIndex) => {
    const sortedEvents = events.sort((left, right) =>
      left.serverTime.localeCompare(right.serverTime) || left.eventTime.localeCompare(right.eventTime) || left.eventId.localeCompare(right.eventId),
    )
    let coreIndex = -1
    if (query.direction === 'START_FROM') {
      coreIndex = sortedEvents.findIndex((event) => event.eventName === query.coreEvent?.eventName)
    } else {
      for (let index = sortedEvents.length - 1; index >= 0; index -= 1) {
        if (sortedEvents[index]?.eventName === query.coreEvent?.eventName) {
          coreIndex = index
          break
        }
      }
    }

    if (coreIndex < 0) return

    const pathNodes: PathInstanceNode[] = []
    const coreEvent = sortedEvents[coreIndex]
    if (!coreEvent) return

    if (query.direction === 'START_FROM') {
      pushDisplayNode(pathNodes, rawToNode(coreEvent, 0, query), query.mergeConsecutiveDuplicateEvents)
      let lastRealEvent = coreEvent
      let stepIndex = 1
      let hasRealNextEvent = false

      for (let index = coreIndex + 1; index < sortedEvents.length && stepIndex <= query.viewConfig.pathStepCount; index += 1) {
        const currentEvent = sortedEvents[index]
        if (!currentEvent) continue
        if (toTimestamp(currentEvent.eventTime) - toTimestamp(lastRealEvent.eventTime) > intervalMs) break

        hasRealNextEvent = true
        lastRealEvent = currentEvent
        if (displayEventSet.has(currentEvent.eventName)) {
          pushDisplayNode(pathNodes, rawToNode(currentEvent, stepIndex, query), query.mergeConsecutiveDuplicateEvents)
          stepIndex += 1
        } else if (query.includeUnselectedEvents) {
          pushDisplayNode(pathNodes, {
            ...unselectedNode,
            stepIndex,
            originalEventName: currentEvent.eventName,
            originalEventDisplayName: currentEvent.eventDisplayName,
            eventTime: currentEvent.eventTime,
          }, query.mergeConsecutiveDuplicateEvents)
          stepIndex += 1
        }
      }

      if (!hasRealNextEvent && pathNodes.length <= query.viewConfig.pathStepCount) {
        pathNodes.push({ ...dropOffNode, stepIndex: pathNodes.length })
      }
    } else {
      pushDisplayNode(pathNodes, rawToNode(coreEvent, 0, query), query.mergeConsecutiveDuplicateEvents)
      let firstRealEvent = coreEvent
      let stepIndex = -1
      let hasPreviousEvent = false

      for (let index = coreIndex - 1; index >= 0 && Math.abs(stepIndex) <= query.viewConfig.pathStepCount; index -= 1) {
        const currentEvent = sortedEvents[index]
        if (!currentEvent) continue
        if (toTimestamp(firstRealEvent.eventTime) - toTimestamp(currentEvent.eventTime) > intervalMs) break

        hasPreviousEvent = true
        firstRealEvent = currentEvent
        if (displayEventSet.has(currentEvent.eventName)) {
          pathNodes.unshift(rawToNode(currentEvent, stepIndex, query))
          stepIndex -= 1
        } else if (query.includeUnselectedEvents) {
          pathNodes.unshift({
            ...unselectedNode,
            stepIndex,
            originalEventName: currentEvent.eventName,
            originalEventDisplayName: currentEvent.eventDisplayName,
            eventTime: currentEvent.eventTime,
          })
          stepIndex -= 1
        }
      }

      if (!hasPreviousEvent && Math.abs(stepIndex) <= query.viewConfig.pathStepCount) {
        pathNodes.unshift({ ...noPreviousNode, stepIndex })
      }
    }

    const normalizedNodes = query.direction === 'END_AT'
      ? pathNodes.map((node, index) => ({ ...node, stepIndex: index }))
      : pathNodes

    instances.push({
      pathInstanceId: `path_${subjectIndex}_${coreEvent.eventId}`,
      subjectId: coreEvent.subjectId,
      nodes: normalizedNodes.slice(0, query.viewConfig.pathStepCount + 1),
    })
  })

  return instances
}

const aggregatePaths = (query: UserPathQueryRequest, paths: PathInstance[]): UserPathQueryResponse => {
  const nodeSubjectMap = new Map<string, Set<string>>()
  const nodePathMap = new Map<string, Set<string>>()
  const nodeDraftMap = new Map<string, PathInstanceNode>()
  const unselectedSubjectMap = new Map<string, Set<string>>()
  const unselectedLabelMap = new Map<string, { stepIndex: number, eventName: string, eventDisplayName: string }>()
  const edgeSubjectMap = new Map<string, Set<string>>()
  const edgePathMap = new Map<string, Set<string>>()
  const edgeLabelMap = new Map<string, { sourceNodeId: string, targetNodeId: string, sourceLabel: string, targetLabel: string, sourceStepIndex: number, targetStepIndex: number }>()

  paths.forEach((path) => {
    path.nodes.forEach((node) => {
      const nodeId = `${node.stepIndex}_${node.nodeKey}`
      nodeDraftMap.set(nodeId, node)
      nodeSubjectMap.set(nodeId, (nodeSubjectMap.get(nodeId) ?? new Set()).add(path.subjectId))
      nodePathMap.set(nodeId, (nodePathMap.get(nodeId) ?? new Set()).add(path.pathInstanceId))
      if (node.nodeType === 'UNSELECTED_EVENT' && node.originalEventName) {
        const key = `${node.stepIndex}_${node.originalEventName}`
        unselectedSubjectMap.set(key, (unselectedSubjectMap.get(key) ?? new Set()).add(path.subjectId))
        unselectedLabelMap.set(key, {
          stepIndex: node.stepIndex,
          eventName: node.originalEventName,
          eventDisplayName: node.originalEventDisplayName ?? eventName(node.originalEventName),
        })
      }
    })

    path.nodes.slice(0, -1).forEach((sourceNode, index) => {
      const targetNode = path.nodes[index + 1]
      if (!targetNode) return
      const sourceNodeId = `${sourceNode.stepIndex}_${sourceNode.nodeKey}`
      const targetNodeId = `${targetNode.stepIndex}_${targetNode.nodeKey}`
      const edgeId = `${sourceNodeId}_${targetNodeId}`
      edgeSubjectMap.set(edgeId, (edgeSubjectMap.get(edgeId) ?? new Set()).add(path.subjectId))
      edgePathMap.set(edgeId, (edgePathMap.get(edgeId) ?? new Set()).add(path.pathInstanceId))
      edgeLabelMap.set(edgeId, {
        sourceNodeId,
        targetNodeId,
        sourceLabel: sourceNode.nodeLabel,
        targetLabel: targetNode.nodeLabel,
        sourceStepIndex: sourceNode.stepIndex,
        targetStepIndex: targetNode.stepIndex,
      })
    })
  })

  const coreUserCount = paths.length
  const stepTotals = new Map<number, number>()

  nodeSubjectMap.forEach((subjects, nodeId) => {
    const stepIndex = nodeDraftMap.get(nodeId)?.stepIndex ?? 0
    stepTotals.set(stepIndex, (stepTotals.get(stepIndex) ?? 0) + subjects.size)
  })

  const allNodes: AggregatedPathNode[] = Array.from(nodeSubjectMap.entries()).map(([nodeId, subjects]) => {
    const draft = nodeDraftMap.get(nodeId)
    const stepIndex = draft?.stepIndex ?? 0
    const stepTotal = stepTotals.get(stepIndex) ?? subjects.size

    return {
      id: nodeId,
      stepIndex,
      nodeKey: draft?.nodeKey ?? nodeId,
      nodeLabel: draft?.nodeLabel ?? nodeId,
      nodeType: draft?.nodeType ?? 'EVENT',
      eventName: draft?.eventName,
      userCount: subjects.size,
      pathCount: nodePathMap.get(nodeId)?.size ?? subjects.size,
      ratioOfTotal: coreUserCount === 0 ? 0 : subjects.size / coreUserCount,
      ratioOfStep: stepTotal === 0 ? 0 : subjects.size / stepTotal,
    }
  })

  const hiddenNodeGroups: HiddenNodeGroup[] = []
  const visibleNodeIdSet = new Set<string>()
  const mergedNodeByHiddenNode = new Map<string, string>()

  Array.from(new Set(allNodes.map((node) => node.stepIndex))).forEach((stepIndex) => {
    const nodesOfStep = allNodes
      .filter((node) => node.stepIndex === stepIndex)
      .sort((left, right) => right.userCount - left.userCount)
    const hiddenNodes = nodesOfStep.filter((node, index) => {
      const isPinned = query.viewConfig.pinnedNodes.some((pinnedNode) =>
        pinnedNode.stepIndex === node.stepIndex && pinnedNode.nodeKey === node.nodeKey,
      )
      if (isPinned) return false
      return index >= query.viewConfig.maxNodesPerStep || node.ratioOfStep * 100 < query.viewConfig.minTrafficRatio
    })
    const visibleNodes = nodesOfStep.filter((node) => !hiddenNodes.includes(node))

    visibleNodes.forEach((node) => visibleNodeIdSet.add(node.id))

    if (hiddenNodes.length > 0) {
      const mergedNodeId = `${stepIndex}_${moreNode.nodeKey}`
      visibleNodeIdSet.add(mergedNodeId)
      hiddenNodes.forEach((node) => mergedNodeByHiddenNode.set(node.id, mergedNodeId))
      hiddenNodeGroups.push({
        stepIndex,
        reason: hiddenNodes.some((node) => node.ratioOfStep * 100 < query.viewConfig.minTrafficRatio) ? 'TRAFFIC_THRESHOLD' : 'MAX_NODE_LIMIT',
        mergedIntoNodeId: mergedNodeId,
        originalNodes: hiddenNodes.map((node) => ({
          nodeKey: node.nodeKey,
          nodeLabel: node.nodeLabel,
          nodeType: node.nodeType,
          eventName: node.eventName,
          userCount: node.userCount,
          ratioOfStep: node.ratioOfStep,
        })),
      })
    }
  })

  const nodes = allNodes.filter((node) => visibleNodeIdSet.has(node.id))
  hiddenNodeGroups.forEach((group) => {
    const userCount = group.originalNodes.reduce((sum, node) => sum + node.userCount, 0)
    const stepTotal = stepTotals.get(group.stepIndex) ?? userCount
    nodes.push({
      id: group.mergedIntoNodeId,
      stepIndex: group.stepIndex,
      nodeKey: moreNode.nodeKey,
      nodeLabel: moreNode.nodeLabel,
      nodeType: moreNode.nodeType,
      userCount,
      pathCount: userCount,
      ratioOfTotal: coreUserCount === 0 ? 0 : userCount / coreUserCount,
      ratioOfStep: stepTotal === 0 ? 0 : userCount / stepTotal,
    })
  })

  const visibleNodeMap = new Map(nodes.map((node) => [node.id, node]))
  const edgeDraftMap = new Map<string, AggregatedPathEdge>()
  edgeSubjectMap.forEach((subjects, edgeId) => {
    const label = edgeLabelMap.get(edgeId)
    if (!label) return
    const sourceNodeId = mergedNodeByHiddenNode.get(label.sourceNodeId) ?? label.sourceNodeId
    const targetNodeId = mergedNodeByHiddenNode.get(label.targetNodeId) ?? label.targetNodeId
    if (!visibleNodeMap.has(sourceNodeId) || !visibleNodeMap.has(targetNodeId)) return

    const normalizedEdgeId = `${sourceNodeId}_${targetNodeId}`
    const current = edgeDraftMap.get(normalizedEdgeId)
    const sourceNode = visibleNodeMap.get(sourceNodeId)
    const existingUserCount = current?.userCount ?? 0
    const userCount = existingUserCount + subjects.size

    edgeDraftMap.set(normalizedEdgeId, {
      id: normalizedEdgeId,
      sourceNodeId,
      targetNodeId,
      sourceStepIndex: label.sourceStepIndex,
      targetStepIndex: label.targetStepIndex,
      sourceLabel: sourceNode?.nodeLabel ?? label.sourceLabel,
      targetLabel: visibleNodeMap.get(targetNodeId)?.nodeLabel ?? label.targetLabel,
      userCount,
      pathCount: (current?.pathCount ?? 0) + (edgePathMap.get(edgeId)?.size ?? subjects.size),
      ratioOfSource: sourceNode?.userCount ? userCount / sourceNode.userCount : 0,
      ratioOfTotal: coreUserCount === 0 ? 0 : userCount / coreUserCount,
    })
  })

  const unselectedTotalsByStep = new Map<number, number>()
  unselectedSubjectMap.forEach((subjects, key) => {
    const label = unselectedLabelMap.get(key)
    if (!label) return
    unselectedTotalsByStep.set(label.stepIndex, (unselectedTotalsByStep.get(label.stepIndex) ?? 0) + subjects.size)
  })
  const unselectedEventBreakdown = Array.from(unselectedSubjectMap.entries()).map(([key, subjects]) => {
    const label = unselectedLabelMap.get(key)
    const totalOfUnselected = label ? unselectedTotalsByStep.get(label.stepIndex) ?? subjects.size : subjects.size

    return {
      stepIndex: label?.stepIndex ?? 0,
      eventName: label?.eventName ?? key,
      eventDisplayName: label?.eventDisplayName ?? key,
      userCount: subjects.size,
      ratioOfUnselected: totalOfUnselected === 0 ? 0 : subjects.size / totalOfUnselected,
      ratioOfTotal: coreUserCount === 0 ? 0 : subjects.size / coreUserCount,
    }
  }).sort((left, right) => left.stepIndex - right.stepIndex || right.userCount - left.userCount)

  const steps = Array.from(new Set(nodes.map((node) => node.stepIndex)))
    .sort((left, right) => left - right)
    .map((stepIndex) => ({
      stepIndex,
      label: query.direction === 'START_FROM' ? `第 ${stepIndex} 步` : stepIndex === nodes.at(-1)?.stepIndex ? '终止事件' : `前序第 ${stepIndex + 1} 步`,
      totalUserCount: stepTotals.get(stepIndex) ?? 0,
      totalPathCount: paths.length,
    }))

  return {
    queryId: `user_path_${Date.now()}`,
    executedAt: new Date().toISOString(),
    timezone: query.timezone,
    summary: {
      coreUserCount,
      corePathCount: paths.length,
      direction: query.direction,
      pathStepCount: query.viewConfig.pathStepCount,
      totalDisplayedNodes: nodes.length,
      totalDisplayedEdges: edgeDraftMap.size,
    },
    steps,
    nodes,
    edges: Array.from(edgeDraftMap.values()),
    hiddenNodeGroups,
    unselectedEventBreakdown,
    warnings: query.sessionConfig.intervalUnit === 'second'
      ? [{ code: 'SECOND_SESSION_RISK', message: '秒级会话间隔可能受 SDK 批量上报影响，建议使用分钟级间隔。' }]
      : [],
  }
}

export const createUserPathResult = (query: UserPathQueryRequest): UserPathQueryResponse => {
  if (!query.coreEvent?.eventName) {
    return {
      queryId: `user_path_empty_${Date.now()}`,
      executedAt: new Date().toISOString(),
      timezone: query.timezone,
      summary: {
        coreUserCount: 0,
        corePathCount: 0,
        direction: query.direction,
        pathStepCount: query.viewConfig.pathStepCount,
        totalDisplayedNodes: 0,
        totalDisplayedEdges: 0,
      },
      steps: [],
      nodes: [],
      edges: [],
      hiddenNodeGroups: [],
      unselectedEventBreakdown: [],
      warnings: [],
    }
  }

  return aggregatePaths(query, createPathInstances(query))
}

export const createUserPathUsers = (queryId: string, label: string): UserPathUserListResponse => ({
  total: 128,
  users: Array.from({ length: 12 }, (_, index) => ({
    subjectId: `u_${String(36001 + index).padStart(5, '0')}`,
    pathInstanceId: `${queryId}_sample_${index}`,
    firstEventTime: `2026-05-${String(15 + index % 7).padStart(2, '0')} 10:08:00`,
    lastEventTime: `2026-05-${String(15 + index % 7).padStart(2, '0')} 10:${String(28 + index).padStart(2, '0')}:00`,
    pathSummary: `App 启动 → ${label} → 广告点击 → 广告观看完成`,
    nodeEventTime: `2026-05-${String(15 + index % 7).padStart(2, '0')} 10:${String(12 + index).padStart(2, '0')}:00`,
  })),
})

export const createUserPathSamples = (queryId: string, label: string): UserPathSampleResponse => ({
  total: 48,
  paths: Array.from({ length: 8 }, (_, index): UserPathSample => ({
    pathInstanceId: `${queryId}_path_${index}`,
    subjectId: `u_${String(39001 + index).padStart(5, '0')}`,
    nodes: ['App 启动', label, '广告点击', '广告开始播放', index % 2 === 0 ? '广告观看完成' : '流失'].map((nodeLabel, nodeIndex) => ({
      stepIndex: nodeIndex,
      nodeLabel,
      nodeType: nodeLabel === '流失' ? 'DROP_OFF' : 'EVENT',
      eventTime: `2026-05-18 10:${String(8 + nodeIndex * 3).padStart(2, '0')}:00`,
    })),
  })),
})

export const createSavedUserPathResult = (payload: SavedUserPathAnalysisPayload): UserPathActionResult => ({
  id: `saved_user_path_${Date.now()}`,
  message: `用户路径分析「${payload.name}」已保存。`,
})

export const createUserPathDashboardResult = (payload: UserPathDashboardWidgetPayload): UserPathActionResult => ({
  id: `widget_user_path_${Date.now()}`,
  message: `用户路径图「${payload.title}」已保存到看板。`,
})
