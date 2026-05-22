import {
  mockAuditLogs,
  mockCorrectionSetting,
  mockCrossSubjectRelations,
  mockIdmAlerts,
  mockIdmDatasets,
  mockIdmGraphConfigs,
  mockIdmIdTemplates,
  mockIdmIdTypes,
  mockIdmPermission,
  mockIdmRelations,
  mockIdmSubjects,
  mockIdmTaskDag,
  mockIdmTaskRuns,
  mockIdmTasks,
  mockLineageGraph,
  mockOneIdChangeLogs,
  mockOneIdMappings,
  mockOnlineServices,
  mockVisibilityRules,
} from '@/mock/idMapping'
import type {
  IdmCorrectionSetting,
  IdmConfigVersion,
  IdmCrossSubjectRelation,
  IdmCrossSubjectPreviewRow,
  IdmDataPreviewRow,
  IdmDataset,
  IdmGraphConfig,
  IdmIdKind,
  IdmIdDataType,
  IdmIdTemplate,
  IdmIdType,
  IdmLineageGraph,
  IdmOneIdChangeLog,
  IdmOneIdMappingResult,
  IdmOnlineService,
  IdmOverview,
  IdmPermission,
  IdmReferenceRelation,
  IdmRelationPreviewRow,
  IdmSubject,
  IdmSubjectType,
  IdmTask,
  IdmTaskDag,
  IdmTaskRunRecord,
  IdmTaskStatus,
  IdmValidationItem,
  IdmVisibilityRule,
} from '@/types/idMapping'

interface CreateSubjectPayload {
  subjectName: string
  subjectCode: string
  subjectType: IdmSubjectType
  description?: string
  status: IdmSubject['status']
}

interface CreateIdTypePayload {
  subjectId: string
  idName: string
  idCode: string
  idKind: IdmIdKind
  channelIdentifier: IdmIdType['channelIdentifier']
  dataSourceType: IdmIdType['dataSourceType']
  datasetId?: string
  idDataType?: IdmIdDataType
  idField?: string
  partitionField?: string
  partitionFormat?: string
  updateMode?: IdmIdType['updateMode']
  compositeParts?: IdmIdType['compositeParts']
  dimensionDatasetId?: string
  dimensionValueField?: string
  dimensionNameField?: string
}

interface CreateRelationPayload {
  subjectId: string
  relationName: string
  relationDesc?: string
  datasetId: string
  sourceIdTypeId: string
  targetIdTypeId: string
  sourceField?: string
  targetField?: string
  partitionField?: string
  partitionFormat?: string
  updateMode?: IdmReferenceRelation['updateMode']
  mappingType: IdmReferenceRelation['mappingType']
  strategyEnabled: boolean
  strategyField?: string
  strategyType?: IdmReferenceRelation['strategyType']
  unbindEnabled: boolean
}

interface CrossSubjectPayload {
  relationName: string
  relationDesc?: string
  datasetId?: string
  datasetName: string
  partitionField?: string
  partitionFormat?: string
  updateMode?: IdmReferenceRelation['updateMode']
  subjectAName: string
  subjectAIdTypeName?: string
  subjectAField?: string
  subjectBName: string
  subjectBIdTypeName?: string
  subjectBField?: string
  aToBMode: IdmCrossSubjectRelation['aToBMode']
  bToAMode: IdmCrossSubjectRelation['bToAMode']
  strategyField?: string
  strategyType?: IdmCrossSubjectRelation['strategyType']
}

function buildCrossRelation(payload: CrossSubjectPayload, relation?: IdmCrossSubjectRelation): IdmCrossSubjectRelation {
  return {
    id: relation?.id ?? `cross_${Date.now()}`,
    relationName: payload.relationName,
    relationDesc: payload.relationDesc,
    datasetId: payload.datasetId,
    datasetName: payload.datasetName,
    partitionField: payload.partitionField,
    partitionFormat: payload.partitionFormat,
    updateMode: payload.updateMode,
    subjectAName: payload.subjectAName,
    subjectAIdTypeName: payload.subjectAIdTypeName ?? '用户 ID',
    subjectAField: payload.subjectAField,
    subjectBName: payload.subjectBName,
    subjectBIdTypeName: payload.subjectBIdTypeName ?? (payload.subjectBName === '车辆' ? 'VIN' : '门店 ID'),
    subjectBField: payload.subjectBField,
    aToBMode: payload.aToBMode,
    bToAMode: payload.bToAMode,
    strategyField: payload.strategyField ?? 'updated_at',
    strategyType: payload.strategyType ?? 'LATEST',
    status: relation?.status ?? 'DRAFT',
    owner: relation?.owner ?? 'Chaoyang Xu',
    relationCount: relation?.relationCount ?? Math.round(60000 + Math.random() * 360000),
    qualityScore: relation?.qualityScore ?? 95.6,
    downstreamObjects: relation?.downstreamObjects ?? [`${payload.subjectBName}画像`, `${payload.subjectBName}运营看板`],
    updatedAt: nowText(),
  }
}

interface QueryOneIdParams {
  idTypeCode: string
  idValues: string[]
  env: string
  queryMode?: 'ID_TO_ONEID' | 'ONEID_TO_ID'
}

interface QueryOneIdChangesParams {
  keyword?: string
  idTypeCode?: string
  idValue?: string
  baseId?: string
}

const delay = async (ms = 160): Promise<void> => {
  await new Promise((resolve) => window.setTimeout(resolve, ms))
}

const clone = <T>(value: T): T => {
  try {
    return structuredClone(value)
  } catch {
    return JSON.parse(JSON.stringify(value)) as T
  }
}

let subjects = clone(mockIdmSubjects)
let idTypes = clone(mockIdmIdTypes)
let relations = clone(mockIdmRelations)
let graphs = clone(mockIdmGraphConfigs)
let tasks = clone(mockIdmTasks)
let taskRuns = clone(mockIdmTaskRuns)
let crossSubjectRelations = clone(mockCrossSubjectRelations)
let onlineServices = clone(mockOnlineServices)
let visibilityRules = clone(mockVisibilityRules)
let auditLogs = clone(mockAuditLogs)
let correctionSetting = clone(mockCorrectionSetting)
let configVersions: IdmConfigVersion[] = graphs
  .filter((graph) => graph.configStatus === 'PUBLISHED')
  .map((graph) => ({
    id: `ver_${graph.subjectId}_${graph.versionNo}`,
    subjectId: graph.subjectId,
    versionNo: graph.versionNo,
    versionName: `${getSubjectName(graph.subjectId)} OneID v${graph.versionNo}`,
    configSnapshot: graph,
    publishStatus: 'PUBLISHED',
    publishedBy: graph.publishedBy ?? 'Chaoyang Xu',
    publishedAt: graph.publishedAt ?? nowText(),
    changeSummary: '系统初始化发布版本。',
  }))

function nowText(): string {
  return '2026-05-22 10:30:00'
}

function syncSubjectCounts(subjectId: string) {
  const subject = subjects.find((item) => item.id === subjectId)
  if (!subject) {
    return
  }

  subject.idTypeCount = idTypes.filter((item) => item.subjectId === subjectId).length
  subject.relationCount = relations.filter((item) => item.subjectId === subjectId).length
  subject.updatedAt = nowText()
  subject.updatedBy = 'Chaoyang Xu'
}

function getSubjectName(subjectId: string): string {
  return subjects.find((subject) => subject.id === subjectId)?.subjectName ?? '未知主体'
}

function taskTypeTextForService(type: IdmTask['taskType']): string {
  const map: Record<IdmTask['taskType'], string> = {
    ONEID_GENERATE: 'OneID 生成',
    ID_SYNC: 'ID 数据同步',
    RELATION_GENERATE: '参考关系生成',
    RELATION_SYNC: '参考关系同步',
    CROSS_SUBJECT_GENERATE: '多主体关系生成',
  }
  return map[type]
}

function getDataset(datasetId: string): IdmDataset {
  const dataset = mockIdmDatasets.find((item) => item.id === datasetId) ?? mockIdmDatasets[0]
  if (!dataset) {
    throw new Error('暂无可用数据集')
  }
  return dataset
}

function appendAudit(action: string, objectName: string, before?: string, after?: string) {
  auditLogs = [
    {
      id: `audit_${Date.now()}_${auditLogs.length}`,
      operator: 'Chaoyang Xu',
      action,
      objectName,
      before,
      after,
      createdAt: nowText(),
    },
    ...auditLogs,
  ].slice(0, 50)
}

function nextTaskStatus(subjectId: string): IdmTaskStatus {
  const subjectTasks = tasks.filter((task) => task.subjectId === subjectId)
  if (subjectTasks.some((task) => task.status === 'RUNNING')) {
    return 'RUNNING'
  }
  if (subjectTasks.some((task) => task.status === 'FAILED')) {
    return 'FAILED'
  }
  if (subjectTasks.some((task) => task.status === 'WAITING')) {
    return 'WAITING'
  }
  if (subjectTasks.some((task) => task.status === 'NOT_RUN')) {
    return 'NOT_RUN'
  }
  return 'SUCCESS'
}

function syncTaskSubjectStatus(subjectId?: string) {
  if (!subjectId) {
    return
  }
  subjects = subjects.map((subject) =>
    subject.id === subjectId
      ? { ...subject, latestTaskStatus: nextTaskStatus(subjectId), lastRunAt: nowText(), updatedAt: nowText() }
      : subject,
  )
}

function buildTaskRun(task: IdmTask, triggerType: IdmTaskRunRecord['triggerType']): IdmTaskRunRecord {
  return {
    id: `run_${task.id}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    taskId: task.id,
    runDate: '2026-05-22',
    triggerType,
    status: 'RUNNING',
    startTime: nowText(),
    partition: 'p_date=20260521',
  }
}

function getDatasetField(datasetId: string | undefined, fieldName: string | undefined) {
  if (!datasetId || !fieldName) {
    return undefined
  }
  return getDataset(datasetId).fields.find((field) => field.name === fieldName)
}

function ensureDatasetConfig(payload: {
  dataSourceType?: IdmIdType['dataSourceType']
  datasetId?: string
  idField?: string
  partitionField?: string
  idDataType?: IdmIdDataType
}) {
  if (payload.dataSourceType !== 'OFFLINE_REALTIME') {
    return
  }
  if (!payload.datasetId) {
    throw new Error('请选择 ID 全量数据集')
  }
  const dataset = getDataset(payload.datasetId)
  if (dataset.type !== 'HIVE') {
    throw new Error('离线 OneID 图谱仅支持 Hive 全量数据集')
  }
  if (!payload.partitionField) {
    throw new Error('请选择日期分区字段')
  }
  if (!dataset.fields.some((field) => field.name === payload.partitionField && field.isPartition)) {
    throw new Error('日期分区字段必须来自所选数据集的一级分区字段')
  }
  if (!payload.idField) {
    throw new Error('请选择 ID 对应字段')
  }
  const idField = getDatasetField(payload.datasetId, payload.idField)
  if (!idField) {
    throw new Error('所选 ID 字段不存在，请重新选择')
  }
  if (idField.dataType !== (payload.idDataType ?? 'STRING')) {
    throw new Error('当前字段类型与 ID 数据类型不一致，请重新选择字段或修改 ID 数据类型。')
  }
}

function ensureRelationFields(payload: CreateRelationPayload) {
  const dataset = getDataset(payload.datasetId)
  if (dataset.type !== 'HIVE' || dataset.updateCycle !== 'DAY') {
    throw new Error('参考关系数据集仅支持按天更新的 Hive 表')
  }
  if (!payload.partitionField || !dataset.fields.some((field) => field.name === payload.partitionField && field.isPartition)) {
    throw new Error('请选择关系数据集的日期分区字段')
  }
  if (!payload.sourceField || !payload.targetField) {
    throw new Error('来源字段、目标字段必填')
  }
  if (!getDatasetField(payload.datasetId, payload.sourceField) || !getDatasetField(payload.datasetId, payload.targetField)) {
    throw new Error('来源字段或目标字段不存在，请重新选择')
  }
  if (payload.strategyEnabled) {
    if (!payload.strategyField || !payload.strategyType) {
      throw new Error('策略字段与策略逻辑必须成对出现')
    }
    const strategyField = getDatasetField(payload.datasetId, payload.strategyField)
    if (!strategyField) {
      throw new Error('策略字段必须来自关系数据集')
    }
    if ((payload.strategyType === 'LATEST' || payload.strategyType === 'EARLIEST') && strategyField.dataType !== 'DATETIME') {
      throw new Error('最新 / 最早策略必须选择时间字段')
    }
    if ((payload.strategyType === 'MAX' || payload.strategyType === 'MIN') && strategyField.dataType !== 'NUMBER') {
      throw new Error('最大 / 最小策略必须选择数值字段')
    }
  }
}

function getRelationValidationItems(payload: CreateRelationPayload, relationId?: string): IdmValidationItem[] {
  const items: IdmValidationItem[] = []
  const sourceId = idTypes.find((item) => item.id === payload.sourceIdTypeId)
  const targetId = idTypes.find((item) => item.id === payload.targetIdTypeId)
  const dataset = mockIdmDatasets.find((item) => item.id === payload.datasetId)

  if (!payload.relationName.trim()) {
    items.push({
      id: 'relation_name_empty',
      level: 'ERROR',
      code: 'RELATION_NAME_EMPTY',
      message: '关系名称不能为空。',
      target: '关系名称',
    })
  }
  if (!sourceId || !targetId) {
    items.push({
      id: 'relation_id_type_missing',
      level: 'ERROR',
      code: 'ID_TYPE_MISSING',
      message: '请选择来源 ID 和目标 ID。',
      target: '来源 ID / 目标 ID',
    })
  } else {
    if (sourceId.id === targetId.id) {
      items.push({
        id: 'relation_same_id',
        level: 'ERROR',
        code: 'SOURCE_TARGET_SAME',
        message: '来源 ID 和目标 ID 不能相同。',
        target: sourceId.idName,
      })
    }
    if (sourceId.subjectId !== payload.subjectId || targetId.subjectId !== payload.subjectId) {
      items.push({
        id: 'relation_cross_subject',
        level: 'ERROR',
        code: 'CROSS_SUBJECT_REFERENCE',
        message: '参考关系只能连接同一主体下的 ID 类型，跨主体转换请使用多主体关系。',
        target: `${sourceId.idName} / ${targetId.idName}`,
      })
    }
    if (!sourceId.isGraphAvailable || !targetId.isGraphAvailable) {
      items.push({
        id: 'relation_data_source_missing',
        level: 'ERROR',
        code: 'ID_DATA_SOURCE_MISSING',
        message: '来源 ID 和目标 ID 都必须已配置离线数据源并可加入图谱。',
        target: `${sourceId.idName} / ${targetId.idName}`,
      })
    }
  }

  if (!dataset) {
    items.push({
      id: 'relation_dataset_missing',
      level: 'ERROR',
      code: 'RELATION_DATASET_MISSING',
      message: '请选择关系数据集。',
      target: '关系数据集',
    })
  } else if (dataset.type !== 'HIVE' || dataset.updateCycle !== 'DAY') {
    items.push({
      id: 'relation_dataset_not_hive',
      level: 'ERROR',
      code: 'RELATION_DATASET_NOT_SUPPORTED',
      message: '参考关系数据集必须是按天更新的 Hive 表。',
      target: dataset.name,
    })
  }

  try {
    ensureRelationFields(payload)
  } catch (error) {
    items.push({
      id: `relation_field_${items.length}`,
      level: 'ERROR',
      code: 'RELATION_FIELD_INVALID',
      message: error instanceof Error ? error.message : '字段配置不完整。',
      target: '字段映射',
    })
  }

  if (relations.some((relation) =>
    relation.id !== relationId
    && relation.subjectId === payload.subjectId
    && relation.sourceIdTypeId === payload.sourceIdTypeId
    && relation.targetIdTypeId === payload.targetIdTypeId
    && relation.sourceField === payload.sourceField
    && relation.targetField === payload.targetField,
  )) {
    items.push({
      id: 'relation_duplicate',
      level: 'WARNING',
      code: 'RELATION_DUPLICATED',
      message: '已存在相同来源、目标和字段映射的参考关系，请确认是否重复配置。',
      target: '参考关系',
    })
  }

  if (relations.some((relation) =>
    relation.id !== relationId
    && relation.subjectId === payload.subjectId
    && relation.sourceIdTypeId === payload.targetIdTypeId
    && relation.targetIdTypeId === payload.sourceIdTypeId,
  )) {
    items.push({
      id: 'relation_reverse_cycle',
      level: 'WARNING',
      code: 'REFERENCE_CYCLE_RISK',
      message: '当前主体已存在反向参考关系，可能形成无意义循环，请确认图谱优先级和参考方向。',
      target: '参考方向',
    })
  }

  if (payload.mappingType === 'ONE_TO_ONE' && payload.strategyEnabled) {
    items.push({
      id: 'relation_strategy_redundant',
      level: 'INFO',
      code: 'STRATEGY_RECOMMENDATION',
      message: '1:1 关系通常不需要参考策略，只有存在历史解绑或重复关系时才建议启用。',
      target: '参考策略',
    })
  }

  if (!items.some((item) => item.level === 'ERROR')) {
    items.unshift({
      id: 'relation_validation_passed',
      level: 'INFO',
      code: 'RELATION_VALID',
      message: '参考关系配置校验通过，可保存为草稿并在图谱发布后生效。',
      target: payload.relationName,
    })
  }

  return items
}

function buildRelationPreviewRows(payload: CreateRelationPayload): IdmRelationPreviewRow[] {
  const sourceCode = idTypes.find((item) => item.id === payload.sourceIdTypeId)?.idCode ?? payload.sourceField ?? 'source'
  const targetCode = idTypes.find((item) => item.id === payload.targetIdTypeId)?.idCode ?? payload.targetField ?? 'target'
  return Array.from({ length: 10 }, (_, index) => {
    const duplicated = index === 2 || index === 3
    const emptyField = index === 7
    const strategyEmpty = payload.strategyEnabled && index === 8
    const sourceValue = duplicated ? `${sourceCode}_10028602` : `${sourceCode}_${10028600 + index}`
    const targetValue = duplicated && payload.mappingType === 'ONE_TO_MANY'
      ? `${targetCode}_${900010 + index}`
      : `${targetCode}_${900000 + Math.floor(index / 2)}`
    return {
      rowNo: index + 1,
      sourceValue: emptyField ? '' : sourceValue,
      targetValue: emptyField ? '' : targetValue,
      partitionValue: '20260521',
      strategyValue: payload.strategyEnabled
        ? strategyEmpty
          ? ''
          : payload.strategyType === 'MAX'
            ? `${88 + index}`
            : payload.strategyType === 'MIN'
              ? `${10 + index}`
              : `2026-05-21 ${String(9 + index).padStart(2, '0')}:30:00`
        : undefined,
      duplicateGroupSize: duplicated ? 2 : 1,
      resolvedTargetValue: duplicated && payload.strategyEnabled ? `${targetCode}_900001` : targetValue,
      qualityFlag: emptyField
        ? 'EMPTY_FIELD'
        : strategyEmpty
          ? 'STRATEGY_EMPTY'
          : duplicated
            ? 'DUPLICATED_SOURCE'
            : 'VALID',
    }
  })
}

function buildDefaultGraph(subjectId: string): IdmGraphConfig {
  const subjectIdTypes = idTypes.filter((item) => item.subjectId === subjectId && item.isGraphAvailable)
  return {
    id: `graph_${subjectId}_${Date.now()}`,
    tenantId: 'tenant_demo',
    subjectId,
    versionNo: 1,
    configStatus: 'DRAFT',
    nodes: subjectIdTypes.map((item, index) => ({
      idTypeId: item.id,
      idName: item.idName,
      idCode: item.idCode,
      priority: item.priority || index + 1,
      isBaseCandidate: index === 0,
      joined: item.status === 'JOINED_GRAPH',
      warning: item.dataSourceType === 'DATA_NOT_CONFIGURED' ? '未配置数据源，不可加入图谱' : undefined,
    })),
    edges: relations
      .filter((relation) => relation.subjectId === subjectId)
      .map((relation) => ({
        id: `edge_${relation.id}`,
        sourceIdTypeId: relation.sourceIdTypeId,
        targetIdTypeId: relation.targetIdTypeId,
        relationId: relation.id,
        relationName: relation.relationName,
        strategyText: relation.strategyEnabled ? `按${relation.strategyField ?? '策略字段'}取${relation.strategyType ?? 'LATEST'}` : '默认参考',
      })),
    options: {
      reuseHistoryOneId: true,
      forceOneToOneForHighPriority: true,
      allowOneIdChange: true,
      recordChangeLog: true,
      triggerDataCorrection: false,
      realtimeOfflineMerge: true,
      silenceDefaultStrategy: true,
    },
    updatedAt: nowText(),
  }
}

function normalizeGraphNodes(nodes: IdmGraphConfig['nodes']): IdmGraphConfig['nodes'] {
  return nodes.map((node, index) => ({
    ...node,
    priority: index + 1,
    isBaseCandidate: index === 0,
  }))
}

function detectGraphCycle(edges: IdmGraphConfig['edges'], joinedNodeIds: string[]): boolean {
  const joined = new Set(joinedNodeIds)
  const adjacency = new Map<string, string[]>()
  edges
    .filter((edge) => joined.has(edge.sourceIdTypeId) && joined.has(edge.targetIdTypeId))
    .forEach((edge) => {
      adjacency.set(edge.sourceIdTypeId, [...(adjacency.get(edge.sourceIdTypeId) ?? []), edge.targetIdTypeId])
    })

  const visiting = new Set<string>()
  const visited = new Set<string>()
  const visit = (nodeId: string): boolean => {
    if (visiting.has(nodeId)) {
      return true
    }
    if (visited.has(nodeId)) {
      return false
    }
    visiting.add(nodeId)
    const hasCycle = (adjacency.get(nodeId) ?? []).some((nextNodeId) => visit(nextNodeId))
    visiting.delete(nodeId)
    visited.add(nodeId)
    return hasCycle
  }

  return joinedNodeIds.some((nodeId) => visit(nodeId))
}

function validateGraphConfig(graph: IdmGraphConfig): IdmValidationItem[] {
  const items: IdmValidationItem[] = []
  const subject = subjects.find((item) => item.id === graph.subjectId)
  const joinedNodes = normalizeGraphNodes(graph.nodes.filter((node) => node.joined))
  const joinedNodeIds = joinedNodes.map((node) => node.idTypeId)
  const joinedNodeSet = new Set(joinedNodeIds)
  const graphEdges = graph.edges.filter((edge) => joinedNodeSet.has(edge.sourceIdTypeId) && joinedNodeSet.has(edge.targetIdTypeId))

  if (!joinedNodes.length) {
    items.push({
      id: 'graph_empty',
      level: 'ERROR',
      code: 'GRAPH_EMPTY',
      message: 'OneID 图谱不能为空，请至少加入一个已配置数据源的 ID。',
      target: 'OneID 图谱',
    })
  }

  joinedNodes.forEach((node) => {
    const idType = idTypes.find((item) => item.id === node.idTypeId)
    if (!idType) {
      items.push({
        id: `graph_node_missing_${node.idTypeId}`,
        level: 'ERROR',
        code: 'GRAPH_NODE_MISSING',
        message: `${node.idName} 对应的 ID 类型已不存在，请从图谱中移除。`,
        target: node.idName,
      })
      return
    }
    if (!idType.isGraphAvailable || idType.status === 'DATA_NOT_CONFIGURED') {
      items.push({
        id: `graph_node_no_source_${node.idTypeId}`,
        level: 'ERROR',
        code: 'ID_DATA_SOURCE_MISSING',
        message: `${node.idName} 未配置离线全量数据源，不可参与 OneID 生成。`,
        target: node.idName,
      })
    }
    if (idType.datasetId && idType.idField && !getDatasetField(idType.datasetId, idType.idField)) {
      items.push({
        id: `graph_node_field_invalid_${node.idTypeId}`,
        level: 'ERROR',
        code: 'ID_FIELD_INVALID',
        message: `${node.idName} 的 ID 字段已失效，请重新配置数据源字段。`,
        target: node.idName,
      })
    }
  })

  joinedNodes
    .filter((node, index) => index > 0)
    .forEach((node) => {
      const hasEdge = graphEdges.some((edge) => edge.sourceIdTypeId === node.idTypeId || edge.targetIdTypeId === node.idTypeId)
      if (!hasEdge) {
        items.push({
          id: `graph_isolated_${node.idTypeId}`,
          level: 'WARNING',
          code: 'LOW_PRIORITY_ID_ISOLATED',
          message: `${node.idName} 为低优先级 ID，但未配置参考边，可能独立生成 OneID。`,
          target: node.idName,
        })
      }
    })

  graphEdges.forEach((edge) => {
    const relation = relations.find((item) => item.id === edge.relationId)
    if (!relation) {
      items.push({
        id: `graph_edge_missing_${edge.id}`,
        level: 'ERROR',
        code: 'REFERENCE_RELATION_MISSING',
        message: `参考边「${edge.relationName}」对应的参考关系已不存在。`,
        target: edge.relationName,
      })
      return
    }
    if (relation.mappingType === 'MANY_TO_MANY' && !relation.strategyEnabled) {
      items.push({
        id: `graph_edge_nn_${edge.id}`,
        level: 'WARNING',
        code: 'MANY_TO_MANY_WITHOUT_STRATEGY',
        message: `${relation.relationName} 是 N:N 关系但未配置参考策略，建议补充策略字段。`,
        target: relation.relationName,
      })
    }
  })

  if (detectGraphCycle(graphEdges, joinedNodeIds)) {
    items.push({
      id: 'graph_cycle',
      level: 'ERROR',
      code: 'REFERENCE_CYCLE',
      message: '图谱存在循环参考，会导致 OneID 生成顺序歧义，请调整参考边方向。',
      target: '参考边',
    })
  }

  if (joinedNodes.filter((node) => node.isBaseCandidate).length !== 1) {
    items.push({
      id: 'graph_base_candidate_count',
      level: 'WARNING',
      code: 'BASE_CANDIDATE_COUNT',
      message: '建议只保留一个最高优先级 BaseID 候选，避免多个源头同时生成 OneID。',
      target: 'BaseID 候选',
    })
  }

  if (graph.options.forceOneToOneForHighPriority && !graph.options.allowOneIdChange) {
    items.push({
      id: 'graph_one_to_one_locked',
      level: 'ERROR',
      code: 'ONEID_STRATEGY_CONFLICT',
      message: '高优 ID 强制一对一与禁止 OneID 变化同时开启，可能造成历史绑定无法修正。',
      target: '高级策略',
    })
  }

  if (subject && subject.downstreamDependencyCount > 0 && graph.configStatus === 'PUBLISHED') {
    items.push({
      id: 'graph_downstream_impact',
      level: 'WARNING',
      code: 'DOWNSTREAM_IMPACT',
      message: `当前主体已有 ${subject.downstreamDependencyCount} 个下游依赖，发布后需关注标签、分群、画像和营销任务。`,
      target: subject.subjectName,
    })
  }

  if (!items.some((item) => item.level === 'ERROR')) {
    items.unshift({
      id: 'graph_valid',
      level: 'INFO',
      code: 'GRAPH_VALID',
      message: 'OneID 图谱预检查通过，可发布配置。',
      target: getSubjectName(graph.subjectId),
    })
  }

  return items
}

export const idMappingService = {
  async getPermission(): Promise<IdmPermission> {
    await delay()
    return clone(mockIdmPermission)
  },

  async getOverview(): Promise<IdmOverview> {
    await delay()
    return {
      subjectTotal: subjects.length,
      publishedSubjectCount: subjects.filter((subject) => subject.configStatus === 'PUBLISHED').length,
      draftSubjectCount: subjects.filter((subject) => subject.configStatus !== 'PUBLISHED').length,
      todaySuccessTaskCount: tasks.filter((task) => task.status === 'SUCCESS').length,
      todayFailedTaskCount: tasks.filter((task) => task.status === 'FAILED').length,
      latestRunAt: tasks.map((task) => task.lastRunAt).filter((item): item is string => Boolean(item)).sort().at(-1) ?? '--',
      alerts: clone(mockIdmAlerts),
    }
  },

  async listSubjects(keyword = ''): Promise<IdmSubject[]> {
    await delay()
    const normalized = keyword.trim().toLowerCase()
    const list = normalized
      ? subjects.filter((subject) =>
          subject.subjectName.toLowerCase().includes(normalized)
          || subject.subjectCode.toLowerCase().includes(normalized),
        )
      : subjects
    return clone(list)
  },

  async createSubject(payload: CreateSubjectPayload): Promise<IdmSubject> {
    await delay()
    if (!payload.subjectName.trim()) {
      throw new Error('请输入主体名称')
    }
    if (subjects.some((subject) => subject.subjectName === payload.subjectName.trim())) {
      throw new Error('当前主体名称已存在，请修改')
    }
    if (!/^[a-z][a-z0-9_]{1,63}$/.test(payload.subjectCode)) {
      throw new Error('主体英文标识仅支持小写字母、数字、下划线，且必须以字母开头')
    }
    if (subjects.some((subject) => subject.subjectCode === payload.subjectCode)) {
      throw new Error('当前主体英文标识已存在，请修改')
    }

    const subject: IdmSubject = {
      id: `subj_${payload.subjectCode}`,
      tenantId: 'tenant_demo',
      subjectName: payload.subjectName.trim(),
      subjectCode: payload.subjectCode,
      subjectType: payload.subjectType,
      avatarType: payload.subjectType.toLowerCase(),
      description: payload.description,
      status: payload.status,
      configStatus: 'DRAFT',
      graphStatus: 'DRAFT',
      latestTaskStatus: 'NOT_RUN',
      idTypeCount: 0,
      relationCount: 0,
      createdBy: 'Chaoyang Xu',
      updatedBy: 'Chaoyang Xu',
      createdAt: nowText(),
      updatedAt: nowText(),
      downstreamDependencyCount: 0,
      isolatedLowPriorityCount: 0,
    }
    subjects = [subject, ...subjects]
    graphs = [buildDefaultGraph(subject.id), ...graphs]
    appendAudit('新建主体', subject.subjectName, undefined, 'DRAFT')
    return clone(subject)
  },

  async deleteSubject(subjectId: string): Promise<{ success: boolean, message: string }> {
    await delay()
    const subject = subjects.find((item) => item.id === subjectId)
    if (!subject) {
      return { success: false, message: '主体不存在' }
    }
    if (subject.configStatus !== 'DRAFT' || subject.downstreamDependencyCount > 0) {
      return { success: false, message: '仅草稿且无下游依赖的主体允许删除。' }
    }
    subjects = subjects.filter((item) => item.id !== subjectId)
    idTypes = idTypes.filter((item) => item.subjectId !== subjectId)
    relations = relations.filter((item) => item.subjectId !== subjectId)
    graphs = graphs.filter((item) => item.subjectId !== subjectId)
    appendAudit('删除主体', subject.subjectName, subject.configStatus, undefined)
    return { success: true, message: `已删除主体「${subject.subjectName}」。` }
  },

  async getDatasets(): Promise<IdmDataset[]> {
    await delay()
    return clone(mockIdmDatasets)
  },

  async getDataPreview(params: {
    datasetId: string
    idField: string
    partitionField: string
  }): Promise<IdmDataPreviewRow[]> {
    await delay()
    const idField = getDatasetField(params.datasetId, params.idField)
    const partitionField = getDatasetField(params.datasetId, params.partitionField)
    if (!idField || !partitionField) {
      throw new Error('预览字段不存在，请检查数据源配置')
    }
    return Array.from({ length: 8 }, (_, index) => {
      const suffix = String(10028490 + index)
      return {
        rowNo: index + 1,
        idValue: `${params.idField}_${suffix}`,
        partitionValue: '20260521',
        rawValue: `${idField.name}=${params.idField}_${suffix}; ${partitionField.name}=20260521`,
        qualityFlag: index === 4 ? 'DUPLICATED' : index === 7 ? 'EMPTY' : 'VALID',
      }
    })
  },

  async getTemplates(): Promise<IdmIdTemplate[]> {
    await delay()
    return clone(mockIdmIdTemplates)
  },

  async listIdTypes(subjectId: string): Promise<IdmIdType[]> {
    await delay()
    return clone(idTypes.filter((item) => item.subjectId === subjectId))
  },

  async createIdTypesFromTemplates(subjectId: string, templates: IdmIdTemplate[]): Promise<{ created: number, failedMessages: string[] }> {
    await delay()
    const failedMessages: string[] = []
    const created: IdmIdType[] = []
    const selected = templates.filter((template) => template.selected)

    selected.forEach((template) => {
      if (!template.idName.trim()) {
        failedMessages.push(`${template.idCode}: ID 名称不能为空`)
        return
      }
      if (idTypes.some((item) => item.idCode === template.idCode) || created.some((item) => item.idCode === template.idCode)) {
        failedMessages.push(`${template.idCode}: ID 英文标识已存在`)
        return
      }
      const idType: IdmIdType = {
        id: `id_${template.idCode}_${Date.now()}_${created.length}`,
        tenantId: 'tenant_demo',
        subjectId,
        idName: template.idName,
        idCode: template.idCode,
        idKind: 'SINGLE',
        idDataType: template.idDataType,
        channelIdentifier: template.channelIdentifier,
        sourceType: template.sourceType,
        recommendedPriority: template.recommendedPriority,
        dataSourceType: 'DATA_NOT_CONFIGURED',
        status: 'DATA_NOT_CONFIGURED',
        isGraphAvailable: false,
        priority: template.recommendedPriority,
        forceOneToOne: template.recommendedPriority <= 2,
        unbindEnabled: false,
        createdBy: 'Chaoyang Xu',
        updatedBy: 'Chaoyang Xu',
        createdAt: nowText(),
        updatedAt: nowText(),
      }
      created.push(idType)
    })

    idTypes = [...idTypes, ...created]
    syncSubjectCounts(subjectId)
    return { created: created.length, failedMessages }
  },

  async createIdType(payload: CreateIdTypePayload): Promise<IdmIdType> {
    await delay()
    if (!payload.idName.trim()) {
      throw new Error('请输入 ID 名称')
    }
    if (!/^[a-z][a-z0-9_]{1,63}$/.test(payload.idCode)) {
      throw new Error('ID 英文标识格式错误')
    }
    if (idTypes.some((item) => item.idCode === payload.idCode)) {
      throw new Error('ID 英文标识全集团内不可重复')
    }
    ensureDatasetConfig(payload)

    const dataset = payload.datasetId ? getDataset(payload.datasetId) : undefined
    const configured = payload.dataSourceType !== 'DATA_NOT_CONFIGURED'
    const status = payload.dataSourceType === 'REALTIME_ONLY'
      ? 'REALTIME_ONLY'
      : configured
        ? 'DATA_CONFIGURED'
        : 'DATA_NOT_CONFIGURED'
    const idType: IdmIdType = {
      id: `id_${payload.idCode}`,
      tenantId: 'tenant_demo',
      subjectId: payload.subjectId,
      idName: payload.idName.trim(),
      idCode: payload.idCode,
      idKind: payload.idKind,
      idDataType: payload.idDataType ?? 'STRING',
      channelIdentifier: payload.channelIdentifier,
      sourceType: payload.idKind === 'COMPOSITE' ? '组合 ID' : '自定义 ID',
      recommendedPriority: 5,
      dataSourceType: payload.dataSourceType,
      datasetId: dataset?.id,
      datasetName: dataset?.name,
      partitionField: payload.partitionField,
      partitionFormat: dataset ? payload.partitionFormat ?? 'yyyyMMdd' : undefined,
      updateMode: dataset ? payload.updateMode ?? 'FULL' : undefined,
      idField: payload.idField,
      compositeParts: payload.compositeParts,
      dimensionDatasetId: payload.dimensionDatasetId,
      dimensionValueField: payload.dimensionValueField,
      dimensionNameField: payload.dimensionNameField,
      status,
      isGraphAvailable: configured && dataset?.type === 'HIVE',
      priority: 5,
      forceOneToOne: false,
      unbindEnabled: false,
      createdBy: 'Chaoyang Xu',
      updatedBy: 'Chaoyang Xu',
      createdAt: nowText(),
      updatedAt: nowText(),
    }
    idTypes = [idType, ...idTypes]
    syncSubjectCounts(payload.subjectId)
    appendAudit('新增 ID 类型', idType.idName, undefined, idType.status)
    return clone(idType)
  },

  async updateIdType(idTypeId: string, payload: CreateIdTypePayload): Promise<IdmIdType> {
    await delay()
    const current = idTypes.find((item) => item.id === idTypeId)
    if (!current) {
      throw new Error('ID 类型不存在')
    }
    if (!payload.idName.trim()) {
      throw new Error('请输入 ID 名称')
    }
    ensureDatasetConfig(payload)
    const dataset = payload.datasetId ? getDataset(payload.datasetId) : undefined
    const configured = payload.dataSourceType !== 'DATA_NOT_CONFIGURED'
    const status = payload.dataSourceType === 'REALTIME_ONLY'
      ? 'REALTIME_ONLY'
      : current.status === 'JOINED_GRAPH' && configured
        ? 'JOINED_GRAPH'
        : configured
          ? 'DATA_CONFIGURED'
          : 'DATA_NOT_CONFIGURED'
    const updated: IdmIdType = {
      ...current,
      idName: payload.idName.trim(),
      channelIdentifier: payload.channelIdentifier,
      dataSourceType: payload.dataSourceType,
      idDataType: payload.idDataType ?? current.idDataType,
      datasetId: dataset?.id,
      datasetName: dataset?.name,
      partitionField: payload.partitionField,
      partitionFormat: dataset ? payload.partitionFormat ?? 'yyyyMMdd' : undefined,
      updateMode: dataset ? payload.updateMode ?? 'FULL' : undefined,
      idField: payload.idField,
      compositeParts: payload.compositeParts,
      dimensionDatasetId: payload.dimensionDatasetId,
      dimensionValueField: payload.dimensionValueField,
      dimensionNameField: payload.dimensionNameField,
      status,
      isGraphAvailable: configured && dataset?.type === 'HIVE',
      updatedBy: 'Chaoyang Xu',
      updatedAt: nowText(),
    }
    idTypes = idTypes.map((item) => item.id === idTypeId ? updated : item)
    subjects = subjects.map((subject) =>
      subject.id === updated.subjectId && subject.configStatus === 'PUBLISHED'
        ? { ...subject, configStatus: 'DRAFT_CHANGED', updatedAt: nowText() }
        : subject,
    )
    appendAudit('编辑 ID 类型', updated.idName, current.status, updated.status)
    return clone(updated)
  },

  async deleteIdType(idTypeId: string): Promise<{ success: boolean, message: string }> {
    await delay()
    const idType = idTypes.find((item) => item.id === idTypeId)
    if (!idType) {
      return { success: false, message: 'ID 类型不存在' }
    }
    if (relations.some((relation) => relation.sourceIdTypeId === idTypeId || relation.targetIdTypeId === idTypeId)) {
      return { success: false, message: '该 ID 已被参考关系引用，请先删除相关参考关系。' }
    }
    idTypes = idTypes.filter((item) => item.id !== idTypeId)
    graphs = graphs.map((graph) => ({
      ...graph,
      nodes: graph.nodes.filter((node) => node.idTypeId !== idTypeId),
      edges: graph.edges.filter((edge) => edge.sourceIdTypeId !== idTypeId && edge.targetIdTypeId !== idTypeId),
    }))
    syncSubjectCounts(idType.subjectId)
    appendAudit('删除 ID 类型', idType.idName, idType.status, undefined)
    return { success: true, message: `已删除 ID 类型「${idType.idName}」。` }
  },

  async listRelations(subjectId: string): Promise<IdmReferenceRelation[]> {
    await delay()
    return clone(relations.filter((relation) => relation.subjectId === subjectId))
  },

  async validateRelation(payload: CreateRelationPayload, relationId?: string): Promise<IdmValidationItem[]> {
    await delay()
    return clone(getRelationValidationItems(payload, relationId))
  },

  async previewRelationData(payload: CreateRelationPayload): Promise<IdmRelationPreviewRow[]> {
    await delay()
    const validationItems = getRelationValidationItems(payload)
    const blockingItem = validationItems.find((item) => item.level === 'ERROR')
    if (blockingItem) {
      throw new Error(blockingItem.message)
    }
    return clone(buildRelationPreviewRows(payload))
  },

  async createRelation(payload: CreateRelationPayload): Promise<IdmReferenceRelation> {
    await delay()
    const validationItems = getRelationValidationItems(payload)
    const blockingItem = validationItems.find((item) => item.level === 'ERROR')
    if (blockingItem) {
      throw new Error(blockingItem.message)
    }
    if (payload.sourceIdTypeId === payload.targetIdTypeId) {
      throw new Error('来源 ID 和目标 ID 不能相同')
    }
    const sourceId = idTypes.find((item) => item.id === payload.sourceIdTypeId)
    const targetId = idTypes.find((item) => item.id === payload.targetIdTypeId)
    if (!sourceId || !targetId) {
      throw new Error('请选择来源 ID 和参考 ID')
    }
    if (!sourceId.isGraphAvailable || !targetId.isGraphAvailable) {
      throw new Error('未配置数据源的 ID 不能创建参考关系')
    }
    ensureRelationFields(payload)
    const dataset = getDataset(payload.datasetId)
    const relation: IdmReferenceRelation = {
      id: `rel_${Date.now()}`,
      tenantId: 'tenant_demo',
      subjectId: payload.subjectId,
      relationName: payload.relationName.trim(),
      relationDesc: payload.relationDesc,
      datasetId: dataset.id,
      datasetName: dataset.name,
      partitionField: payload.partitionField ?? 'p_date',
      partitionFormat: payload.partitionFormat ?? 'yyyyMMdd',
      updateMode: payload.updateMode ?? 'FULL',
      sourceIdTypeId: payload.sourceIdTypeId,
      sourceIdName: sourceId.idName,
      sourceField: payload.sourceField ?? sourceId.idField ?? sourceId.idCode,
      targetIdTypeId: payload.targetIdTypeId,
      targetIdName: targetId.idName,
      targetField: payload.targetField ?? targetId.idField ?? targetId.idCode,
      mappingType: payload.mappingType,
      strategyEnabled: payload.strategyEnabled,
      strategyField: payload.strategyEnabled ? payload.strategyField : undefined,
      strategyType: payload.strategyEnabled ? payload.strategyType : undefined,
      unbindEnabled: payload.unbindEnabled,
      status: 'DRAFT',
      createdBy: 'Chaoyang Xu',
      updatedBy: 'Chaoyang Xu',
      createdAt: nowText(),
      updatedAt: nowText(),
    }
    relations = [relation, ...relations]
    graphs = graphs.map((graph) => graph.subjectId === payload.subjectId
      ? {
          ...graph,
          configStatus: graph.configStatus === 'PUBLISHED' ? 'DRAFT_CHANGED' : graph.configStatus,
          edges: [
            {
              id: `edge_${relation.id}`,
              sourceIdTypeId: relation.sourceIdTypeId,
              targetIdTypeId: relation.targetIdTypeId,
              relationId: relation.id,
              relationName: relation.relationName,
              strategyText: relation.strategyEnabled ? `按${relation.strategyField ?? '策略字段'}取${relation.strategyType ?? 'LATEST'}` : '默认参考',
            },
            ...graph.edges,
          ],
          updatedAt: nowText(),
        }
      : graph)
    syncSubjectCounts(payload.subjectId)
    subjects = subjects.map((subject) =>
      subject.id === payload.subjectId && subject.configStatus === 'PUBLISHED'
        ? { ...subject, configStatus: 'DRAFT_CHANGED', graphStatus: 'DRAFT', updatedAt: nowText() }
        : subject,
    )
    appendAudit('新增参考关系', relation.relationName, undefined, relation.status)
    return clone(relation)
  },

  async updateRelation(relationId: string, payload: CreateRelationPayload): Promise<IdmReferenceRelation> {
    await delay()
    const current = relations.find((item) => item.id === relationId)
    if (!current) {
      throw new Error('参考关系不存在')
    }
    const validationItems = getRelationValidationItems(payload, relationId)
    const blockingItem = validationItems.find((item) => item.level === 'ERROR')
    if (blockingItem) {
      throw new Error(blockingItem.message)
    }
    const sourceId = idTypes.find((item) => item.id === payload.sourceIdTypeId)
    const targetId = idTypes.find((item) => item.id === payload.targetIdTypeId)
    if (!sourceId || !targetId) {
      throw new Error('请选择来源 ID 和参考 ID')
    }
    const dataset = getDataset(payload.datasetId)
    const updated: IdmReferenceRelation = {
      ...current,
      subjectId: payload.subjectId,
      relationName: payload.relationName.trim(),
      relationDesc: payload.relationDesc,
      datasetId: dataset.id,
      datasetName: dataset.name,
      partitionField: payload.partitionField ?? 'p_date',
      partitionFormat: payload.partitionFormat ?? 'yyyyMMdd',
      updateMode: payload.updateMode ?? 'FULL',
      sourceIdTypeId: payload.sourceIdTypeId,
      sourceIdName: sourceId.idName,
      sourceField: payload.sourceField ?? sourceId.idField ?? sourceId.idCode,
      targetIdTypeId: payload.targetIdTypeId,
      targetIdName: targetId.idName,
      targetField: payload.targetField ?? targetId.idField ?? targetId.idCode,
      mappingType: payload.mappingType,
      strategyEnabled: payload.strategyEnabled,
      strategyField: payload.strategyEnabled ? payload.strategyField : undefined,
      strategyType: payload.strategyEnabled ? payload.strategyType : undefined,
      unbindEnabled: payload.unbindEnabled,
      status: 'DRAFT',
      updatedBy: 'Chaoyang Xu',
      updatedAt: nowText(),
    }
    relations = relations.map((item) => item.id === relationId ? updated : item)
    graphs = graphs.map((graph) => graph.subjectId === updated.subjectId
      ? {
          ...graph,
          configStatus: graph.configStatus === 'PUBLISHED' ? 'DRAFT_CHANGED' : graph.configStatus,
          edges: graph.edges.map((edge) => edge.relationId === relationId
            ? {
                ...edge,
                sourceIdTypeId: updated.sourceIdTypeId,
                targetIdTypeId: updated.targetIdTypeId,
                relationName: updated.relationName,
                strategyText: updated.strategyEnabled ? `按${updated.strategyField ?? '策略字段'}取${updated.strategyType ?? 'LATEST'}` : '默认参考',
              }
            : edge),
          updatedAt: nowText(),
        }
      : graph)
    subjects = subjects.map((subject) =>
      subject.id === updated.subjectId && subject.configStatus === 'PUBLISHED'
        ? { ...subject, configStatus: 'DRAFT_CHANGED', graphStatus: 'DRAFT', updatedAt: nowText() }
        : subject,
    )
    appendAudit('编辑参考关系', updated.relationName, current.status, updated.status)
    return clone(updated)
  },

  async copyRelation(relationId: string): Promise<IdmReferenceRelation> {
    await delay()
    const current = relations.find((item) => item.id === relationId)
    if (!current) {
      throw new Error('参考关系不存在')
    }
    const copied: IdmReferenceRelation = {
      ...current,
      id: `rel_${Date.now()}_copy`,
      relationName: `${current.relationName} 副本`,
      status: 'DRAFT',
      createdBy: 'Chaoyang Xu',
      updatedBy: 'Chaoyang Xu',
      createdAt: nowText(),
      updatedAt: nowText(),
    }
    relations = [copied, ...relations]
    graphs = graphs.map((graph) => graph.subjectId === copied.subjectId
      ? {
          ...graph,
          configStatus: graph.configStatus === 'PUBLISHED' ? 'DRAFT_CHANGED' : graph.configStatus,
          edges: [
            {
              id: `edge_${copied.id}`,
              sourceIdTypeId: copied.sourceIdTypeId,
              targetIdTypeId: copied.targetIdTypeId,
              relationId: copied.id,
              relationName: copied.relationName,
              strategyText: copied.strategyEnabled ? `按${copied.strategyField ?? '策略字段'}取${copied.strategyType ?? 'LATEST'}` : '默认参考',
            },
            ...graph.edges,
          ],
          updatedAt: nowText(),
        }
      : graph)
    syncSubjectCounts(copied.subjectId)
    subjects = subjects.map((subject) =>
      subject.id === copied.subjectId && subject.configStatus === 'PUBLISHED'
        ? { ...subject, configStatus: 'DRAFT_CHANGED', graphStatus: 'DRAFT', updatedAt: nowText() }
        : subject,
    )
    appendAudit('复制参考关系', copied.relationName, current.relationName, copied.status)
    return clone(copied)
  },

  async deleteRelation(relationId: string): Promise<{ success: boolean, message: string }> {
    await delay()
    const relation = relations.find((item) => item.id === relationId)
    if (!relation) {
      return { success: false, message: '参考关系不存在' }
    }
    relations = relations.filter((item) => item.id !== relationId)
    graphs = graphs.map((graph) => graph.subjectId === relation.subjectId
      ? {
          ...graph,
          configStatus: graph.configStatus === 'PUBLISHED' ? 'DRAFT_CHANGED' : graph.configStatus,
          edges: graph.edges.filter((edge) => edge.relationId !== relationId),
          updatedAt: nowText(),
        }
      : graph)
    syncSubjectCounts(relation.subjectId)
    subjects = subjects.map((subject) =>
      subject.id === relation.subjectId && subject.configStatus === 'PUBLISHED'
        ? { ...subject, configStatus: 'DRAFT_CHANGED', graphStatus: 'DRAFT', updatedAt: nowText() }
        : subject,
    )
    appendAudit('删除参考关系', relation.relationName, relation.status, undefined)
    return { success: true, message: `已删除参考关系「${relation.relationName}」。` }
  },

  async getGraph(subjectId: string): Promise<IdmGraphConfig> {
    await delay()
    const graph = graphs.find((item) => item.subjectId === subjectId) ?? buildDefaultGraph(subjectId)
    return clone(graph)
  },

  async saveGraphDraft(graph: IdmGraphConfig): Promise<IdmGraphConfig> {
    await delay()
    const graphSnapshot = clone(graph)
    const normalizedNodes = normalizeGraphNodes(graphSnapshot.nodes.filter((node) => node.joined))
    const joinedNodeIds = new Set(normalizedNodes.map((node) => node.idTypeId))
    const nextGraph: IdmGraphConfig = {
      ...graphSnapshot,
      nodes: normalizedNodes,
      edges: graphSnapshot.edges.filter((edge) => joinedNodeIds.has(edge.sourceIdTypeId) && joinedNodeIds.has(edge.targetIdTypeId)),
      configStatus: graphSnapshot.configStatus === 'PUBLISHED' ? 'DRAFT_CHANGED' : 'DRAFT',
      updatedAt: nowText(),
    }
    graphs = graphs.some((item) => item.id === nextGraph.id)
      ? graphs.map((item) => item.id === nextGraph.id ? nextGraph : item)
      : [nextGraph, ...graphs]
    subjects = subjects.map((subject) =>
      subject.id === nextGraph.subjectId
        ? { ...subject, configStatus: 'DRAFT_CHANGED', graphStatus: 'DRAFT', updatedAt: nowText() }
        : subject,
    )
    appendAudit('保存 OneID 图谱草稿', getSubjectName(nextGraph.subjectId), graphSnapshot.configStatus, nextGraph.configStatus)
    return clone(nextGraph)
  },

  async validateGraphDraft(graph: IdmGraphConfig): Promise<IdmValidationItem[]> {
    await delay()
    return clone(validateGraphConfig(graph))
  },

  async validateGraph(subjectId: string): Promise<IdmValidationItem[]> {
    await delay()
    const graph = graphs.find((item) => item.subjectId === subjectId) ?? buildDefaultGraph(subjectId)
    return clone(validateGraphConfig(graph))
  },

  async publishGraphDraft(graph: IdmGraphConfig): Promise<{ success: boolean, message: string, graph?: IdmGraphConfig }> {
    const savedGraph = await this.saveGraphDraft(graph)
    return this.publishGraph(savedGraph.subjectId)
  },

  async publishGraph(subjectId: string): Promise<{ success: boolean, message: string, graph?: IdmGraphConfig }> {
    await delay()
    const currentGraph = graphs.find((item) => item.subjectId === subjectId) ?? buildDefaultGraph(subjectId)
    const validationItems = validateGraphConfig(currentGraph)
    if (validationItems.some((item) => item.level === 'ERROR')) {
      return { success: false, message: '预检查存在 Error，禁止发布配置。' }
    }
    const normalizedPublishedNodes = normalizeGraphNodes(currentGraph.nodes.filter((node) => node.joined))
    const publishedNodeIds = new Set(normalizedPublishedNodes.map((node) => node.idTypeId))
    const publishedGraph: IdmGraphConfig = {
      ...currentGraph,
      nodes: normalizedPublishedNodes,
      edges: currentGraph.edges.filter((edge) => publishedNodeIds.has(edge.sourceIdTypeId) && publishedNodeIds.has(edge.targetIdTypeId)),
      versionNo: currentGraph.versionNo + 1,
      configStatus: 'PUBLISHED',
      publishedAt: nowText(),
      publishedBy: 'Chaoyang Xu',
      updatedAt: nowText(),
    }
    graphs = graphs.map((item) => item.subjectId === subjectId ? publishedGraph : item)
    configVersions = [
      {
        id: `ver_${subjectId}_${publishedGraph.versionNo}_${Date.now()}`,
        subjectId,
        versionNo: publishedGraph.versionNo,
        versionName: `${getSubjectName(subjectId)} OneID v${publishedGraph.versionNo}`,
        configSnapshot: clone(publishedGraph),
        publishStatus: 'PUBLISHED',
        publishedBy: 'Chaoyang Xu',
        publishedAt: nowText(),
        changeSummary: '发布 OneID 图谱，更新 ID 优先级、参考边和生成策略。',
      },
      ...configVersions.map((version) =>
        version.subjectId === subjectId && version.publishStatus === 'PUBLISHED'
          ? { ...version, publishStatus: 'ROLLBACKED' as const }
          : version,
      ),
    ]
    subjects = subjects.map((subject) =>
      subject.id === subjectId
        ? {
            ...subject,
            configStatus: 'PUBLISHED',
            graphStatus: 'PUBLISHED',
            latestTaskStatus: 'WAITING',
            lastPublishedAt: nowText(),
            updatedAt: nowText(),
          }
        : subject,
    )
    const taskExists = tasks.some((task) => task.id === `task_oneid_${subjectId}`)
    if (!taskExists && subjectId !== 'subj_user') {
      tasks = [
        {
          id: `task_oneid_${subjectId}`,
          taskName: `${getSubjectName(subjectId)} OneID 生成任务`,
          taskCategory: 'SUBJECT_ONEID',
          taskType: 'ONEID_GENERATE',
          subjectId,
          subjectName: getSubjectName(subjectId),
          tableName: `idm_${subjectId.replace('subj_', '')}_base_id_mapping_df`,
          createdAt: nowText(),
          status: 'WAITING',
          owner: 'IDM Scheduler',
          upstreamTaskIds: [],
          downstreamTaskIds: [],
        },
        ...tasks,
      ]
    }
    appendAudit('发布 OneID 图谱', `${getSubjectName(subjectId)} / v${publishedGraph.versionNo}`, currentGraph.configStatus, 'PUBLISHED')
    return { success: true, message: '配置已发布，OneID 任务已进入等待调度。', graph: clone(publishedGraph) }
  },

  async listConfigVersions(subjectId: string): Promise<IdmConfigVersion[]> {
    await delay()
    return clone(configVersions.filter((version) => version.subjectId === subjectId))
  },

  async restoreConfigVersion(versionId: string): Promise<IdmGraphConfig> {
    await delay()
    const version = configVersions.find((item) => item.id === versionId)
    if (!version) {
      throw new Error('配置版本不存在')
    }
    const currentGraph = graphs.find((item) => item.subjectId === version.subjectId)
    const restoredGraph: IdmGraphConfig = {
      ...clone(version.configSnapshot),
      id: currentGraph?.id ?? `graph_${version.subjectId}_${Date.now()}`,
      configStatus: 'DRAFT_CHANGED',
      updatedAt: nowText(),
    }
    graphs = graphs.some((item) => item.subjectId === version.subjectId)
      ? graphs.map((item) => item.subjectId === version.subjectId ? restoredGraph : item)
      : [restoredGraph, ...graphs]
    subjects = subjects.map((subject) =>
      subject.id === version.subjectId
        ? { ...subject, configStatus: 'DRAFT_CHANGED', graphStatus: 'DRAFT', updatedAt: nowText() }
        : subject,
    )
    appendAudit('恢复 OneID 图谱版本', version.versionName, currentGraph?.configStatus, restoredGraph.configStatus)
    return clone(restoredGraph)
  },

  async listTasks(filter: { subjectId?: string, status?: IdmTaskStatus | 'ALL' } = {}): Promise<IdmTask[]> {
    await delay()
    return clone(tasks.filter((task) => {
      const matchSubject = !filter.subjectId || task.subjectId === filter.subjectId
      const matchStatus = !filter.status || filter.status === 'ALL' || task.status === filter.status
      return matchSubject && matchStatus
    }))
  },

  async rerunTask(taskId: string): Promise<{ success: boolean, message: string }> {
    await delay()
    const task = tasks.find((item) => item.id === taskId)
    if (!task) {
      return { success: false, message: '任务不存在' }
    }
    if (task.status === 'RUNNING') {
      return { success: false, message: '任务正在运行中，不能重复运行。' }
    }
    tasks = tasks.map((item) => item.id === taskId ? { ...item, status: 'RUNNING', lastRunAt: nowText() } : item)
    taskRuns = [buildTaskRun(task, 'RERUN'), ...taskRuns]
    syncTaskSubjectStatus(task.subjectId)
    appendAudit('重新运行任务', task.taskName, task.status, 'RUNNING')
    return { success: true, message: `已重新运行「${task.taskName}」，下游依赖将按 DAG 调度。` }
  },

  async rerunTaskWithUpstream(taskId: string): Promise<{ success: boolean, message: string, changedCount: number }> {
    await delay()
    const task = tasks.find((item) => item.id === taskId)
    if (!task) {
      return { success: false, message: '任务不存在', changedCount: 0 }
    }
    const targetIds = new Set([task.id, ...task.upstreamTaskIds])
    const targetTasks = tasks.filter((item) => targetIds.has(item.id) && item.status !== 'RUNNING')
    if (!targetTasks.length) {
      return { success: false, message: '该任务及其上游任务正在运行或不可运行。', changedCount: 0 }
    }
    const runIds = new Set(targetTasks.map((item) => item.id))
    tasks = tasks.map((item) =>
      runIds.has(item.id)
        ? { ...item, status: 'RUNNING', lastRunAt: nowText() }
        : item,
    )
    taskRuns = [
      ...targetTasks.map((item) => buildTaskRun(item, 'RERUN')),
      ...taskRuns,
    ]
    syncTaskSubjectStatus(task.subjectId)
    appendAudit('连同上游重跑任务', task.taskName, task.status, 'RUNNING')
    return { success: true, message: `已触发「${task.taskName}」及 ${Math.max(targetTasks.length - 1, 0)} 个上游任务。`, changedCount: targetTasks.length }
  },

  async runTasks(taskIds: string[]): Promise<{ success: boolean, message: string, changedCount: number }> {
    await delay()
    const idSet = new Set(taskIds)
    const targetTasks = tasks.filter((task) => idSet.has(task.id) && task.status !== 'RUNNING')
    if (!targetTasks.length) {
      return { success: false, message: '所选任务都在运行中，暂无可运行任务。', changedCount: 0 }
    }
    const runIds = new Set(targetTasks.map((task) => task.id))
    tasks = tasks.map((task) =>
      runIds.has(task.id)
        ? { ...task, status: 'RUNNING', lastRunAt: nowText() }
        : task,
    )
    taskRuns = [
      ...targetTasks.map((task) => buildTaskRun(task, 'MANUAL')),
      ...taskRuns,
    ]
    Array.from(new Set(targetTasks.map((task) => task.subjectId))).forEach((subjectId) => syncTaskSubjectStatus(subjectId))
    appendAudit('批量运行任务', `${targetTasks.length} 个任务`, undefined, 'RUNNING')
    return { success: true, message: `已触发 ${targetTasks.length} 个选中任务。`, changedCount: targetTasks.length }
  },

  async cancelTask(taskId: string): Promise<{ success: boolean, message: string }> {
    await delay()
    const task = tasks.find((item) => item.id === taskId)
    if (!task) {
      return { success: false, message: '任务不存在' }
    }
    if (task.status !== 'RUNNING' && task.status !== 'WAITING') {
      return { success: false, message: '只有运行中或等待中的任务可以取消。' }
    }
    tasks = tasks.map((item) => item.id === taskId ? { ...item, status: 'CANCELED', durationSeconds: item.durationSeconds ?? 0 } : item)
    taskRuns = taskRuns.map((run) =>
      run.taskId === taskId && run.status === 'RUNNING'
        ? { ...run, status: 'CANCELED', endTime: nowText(), durationSeconds: 0, errorMessage: '用户手动取消。' }
        : run,
    )
    syncTaskSubjectStatus(task.subjectId)
    appendAudit('取消任务', task.taskName, task.status, 'CANCELED')
    return { success: true, message: `已取消「${task.taskName}」。` }
  },

  async finishTask(taskId: string, status: Extract<IdmTaskStatus, 'SUCCESS' | 'FAILED'> = 'SUCCESS'): Promise<{ success: boolean, message: string }> {
    await delay()
    const task = tasks.find((item) => item.id === taskId)
    if (!task) {
      return { success: false, message: '任务不存在' }
    }
    if (task.status !== 'RUNNING') {
      return { success: false, message: '只有运行中的任务可以模拟完成。' }
    }
    const durationSeconds = status === 'SUCCESS' ? 900 : 120
    tasks = tasks.map((item) =>
      item.id === taskId
        ? { ...item, status, durationSeconds, lastRunAt: nowText() }
        : item,
    )
    taskRuns = taskRuns.map((run) =>
      run.taskId === taskId && run.status === 'RUNNING'
        ? {
            ...run,
            status,
            endTime: nowText(),
            durationSeconds,
            errorMessage: status === 'FAILED' ? '模拟失败：上游数据质量校验未通过。' : undefined,
          }
        : run,
    )
    syncTaskSubjectStatus(task.subjectId)
    appendAudit(status === 'SUCCESS' ? '任务完成' : '任务失败', task.taskName, 'RUNNING', status)
    return { success: true, message: status === 'SUCCESS' ? `「${task.taskName}」已模拟完成。` : `「${task.taskName}」已模拟失败。` }
  },

  async runAllTasks(subjectId?: string): Promise<{ success: boolean, message: string, changedCount: number }> {
    await delay()
    const targetTasks = tasks.filter((task) => (!subjectId || task.subjectId === subjectId) && task.status !== 'RUNNING')
    if (!targetTasks.length) {
      return { success: false, message: '当前没有可运行的 ID-Mapping 任务。', changedCount: 0 }
    }
    const taskIds = new Set(targetTasks.map((task) => task.id))
    tasks = tasks.map((task) =>
      taskIds.has(task.id)
        ? { ...task, status: 'RUNNING', lastRunAt: nowText() }
        : task,
    )
    taskRuns = [
      ...targetTasks.map((task) => buildTaskRun(task, 'MANUAL')),
      ...taskRuns,
    ]
    Array.from(new Set(targetTasks.map((task) => task.subjectId))).forEach((currentSubjectId) => syncTaskSubjectStatus(currentSubjectId))
    appendAudit('手动运行全部任务', subjectId ? getSubjectName(subjectId) : '全部主体', undefined, 'RUNNING')
    return { success: true, message: `已触发 ${targetTasks.length} 个 ID-Mapping 任务，OneID 结果将在任务完成后生效。`, changedCount: targetTasks.length }
  },

  async getTaskDag(taskId: string): Promise<IdmTaskDag> {
    await delay()
    const task = tasks.find((item) => item.id === taskId)
    if (!task) {
      return clone({ ...mockIdmTaskDag, taskId })
    }
    const relatedIds = new Set([task.id, ...task.upstreamTaskIds, ...task.downstreamTaskIds])
    const relatedTasks = tasks.filter((item) => relatedIds.has(item.id))
    const nodes = relatedTasks.map((item) => ({
      id: item.id,
      label: item.taskName,
      type: taskTypeTextForService(item.taskType),
      status: item.status,
      startedAt: item.lastRunAt?.slice(11, 16),
      endedAt: item.status === 'SUCCESS' && item.durationSeconds ? nowText().slice(11, 16) : undefined,
    }))
    const edges = [
      ...task.upstreamTaskIds.map((source) => ({ source, target: task.id })),
      ...task.downstreamTaskIds.map((target) => ({ source: task.id, target })),
    ].filter((edge) => relatedIds.has(edge.source) && relatedIds.has(edge.target))
    return clone({ taskId, nodes, edges })
  },

  async getTaskRuns(taskId: string): Promise<IdmTaskRunRecord[]> {
    await delay()
    return clone(taskRuns.filter((run) => run.taskId === taskId))
  },

  async queryOneId(params: QueryOneIdParams): Promise<IdmOneIdMappingResult[]> {
    await delay()
    const values = params.idValues.map((value) => value.trim()).filter(Boolean)
    if (!values.length) {
      return []
    }

    const env: IdmOneIdMappingResult['env'] = params.env === 'REALTIME' ? 'REALTIME' : params.env === 'OFFLINE' ? 'OFFLINE' : 'ALL'
    const idType = idTypes.find((item) => item.idCode === params.idTypeCode)
    const idTypeName = idType?.idName ?? params.idTypeCode

    if (params.queryMode === 'ONEID_TO_ID') {
      return clone(values.flatMap((baseId, index): IdmOneIdMappingResult[] => {
        const matched = mockOneIdMappings.filter((item) => item.baseId === baseId)
        if (!matched.length) {
          return [{
            idTypeCode: 'base_id',
            idTypeName: 'OneID',
            idValue: baseId,
            env,
            taskName: '用户 OneID 生成任务',
            updatedAt: nowText(),
            abnormal: true,
            abnormalReason: '当前 OneID 未找到可展开的关联 ID。',
            relatedIds: [],
          }]
        }
        return matched.flatMap((item) => {
          const allIds = [
            { idTypeCode: item.idTypeCode, idTypeName: item.idTypeName, idValue: item.idValue },
            ...item.relatedIds.map((related) => ({
              idTypeCode: related.idTypeName.toLowerCase().replace(/\s+/g, '_'),
              idTypeName: related.idTypeName,
              idValue: related.idValue,
            })),
          ]
          return allIds.map((currentId, currentIndex) => ({
            idTypeCode: currentId.idTypeCode,
            idTypeName: currentId.idTypeName,
            idValue: currentId.idValue,
            baseId,
            env: item.env === 'ALL' ? env : item.env,
            taskName: item.taskName ?? '用户 OneID 生成任务',
            updatedAt: item.updatedAt ?? nowText(),
            abnormal: false,
            relatedIds: allIds
              .filter((related) => related.idValue !== currentId.idValue)
              .map((related) => ({ idTypeName: related.idTypeName, idValue: related.idValue })),
            abnormalReason: currentIndex === 0 && index > 0 ? '同一 OneID 存在多入口查询命中。' : undefined,
          }))
        })
      }))
    }

    return clone(values.map((value, index) => {
      const mocked = mockOneIdMappings.find((item) =>
        item.idValue === value || item.relatedIds.some((related) => related.idValue === value),
      )
      if (mocked) {
        const relatedHit = mocked.relatedIds.find((related) => related.idValue === value)
        return {
          ...mocked,
          idTypeCode: relatedHit ? relatedHit.idTypeName.toLowerCase().replace(/\s+/g, '_') : mocked.idTypeCode,
          idTypeName: relatedHit?.idTypeName ?? mocked.idTypeName,
          idValue: value,
          env: mocked.env === 'ALL' ? env : mocked.env,
        }
      }

      const abnormal = index % 4 === 1 || value.toLowerCase().includes('orphan') || value.toLowerCase().includes('unknown')
      return {
        idTypeCode: params.idTypeCode,
        idTypeName,
        idValue: value,
        baseId: abnormal ? undefined : `base_user_${100000 + index * 791}`,
        env,
        taskName: '用户 OneID 生成任务',
        updatedAt: '2026-05-22 08:23:40',
        abnormal,
        abnormalReason: abnormal ? '当前 ID 暂无映射结果，可能是未入图低优 ID 或数据分区未完成。' : undefined,
        relatedIds: abnormal
          ? []
          : [
              { idTypeName: '用户 ID', idValue: `uid_${839201 + index}` },
              { idTypeName: '设备 ID', idValue: `oaid_auto_${9200 + index}` },
            ],
      }
    }))
  },

  async queryOneIdChanges(params: QueryOneIdChangesParams = {}): Promise<IdmOneIdChangeLog[]> {
    await delay()
    const keyword = params.keyword?.trim().toLowerCase()
    return clone(mockOneIdChangeLogs.filter((item) => {
      const matchKeyword = !keyword
        || item.idTypeCode.toLowerCase().includes(keyword)
        || item.idValue.toLowerCase().includes(keyword)
        || item.oldBaseId.toLowerCase().includes(keyword)
        || item.newBaseId.toLowerCase().includes(keyword)
        || item.taskName.toLowerCase().includes(keyword)
      const matchIdType = !params.idTypeCode || item.idTypeCode === params.idTypeCode
      const matchIdValue = !params.idValue || item.idValue === params.idValue
      const matchBaseId = !params.baseId || item.oldBaseId === params.baseId || item.newBaseId === params.baseId
      return matchKeyword && matchIdType && matchIdValue && matchBaseId
    }))
  },

  async getLineage(params: { objectType: string, objectName: string, depth?: number }): Promise<IdmLineageGraph> {
    await delay()
    const objectName = params.objectName.trim()
    return clone({
      ...mockLineageGraph,
      objectType: params.objectType,
      objectName: objectName || mockLineageGraph.objectName,
    })
  },

  async listCrossSubjectRelations(): Promise<IdmCrossSubjectRelation[]> {
    await delay()
    return clone(crossSubjectRelations)
  },

  async createCrossSubjectRelation(payload: CrossSubjectPayload): Promise<IdmCrossSubjectRelation> {
    await delay()
    const relation = buildCrossRelation(payload)
    crossSubjectRelations = [relation, ...crossSubjectRelations]
    appendAudit('新增多主体转换关系', relation.relationName, undefined, relation.status)
    return clone(relation)
  },

  async updateCrossSubjectRelation(id: string, payload: CrossSubjectPayload): Promise<IdmCrossSubjectRelation> {
    await delay()
    const current = crossSubjectRelations.find((relation) => relation.id === id)
    if (!current) {
      throw new Error('多主体关系不存在')
    }
    const relation = buildCrossRelation(payload, current)
    crossSubjectRelations = crossSubjectRelations.map((item) => item.id === id ? relation : item)
    appendAudit('更新多主体转换关系', relation.relationName, current.status, relation.status)
    return clone(relation)
  },

  async copyCrossSubjectRelation(id: string): Promise<IdmCrossSubjectRelation> {
    await delay()
    const current = crossSubjectRelations.find((relation) => relation.id === id)
    if (!current) {
      throw new Error('多主体关系不存在')
    }
    const relation: IdmCrossSubjectRelation = {
      ...clone(current),
      id: `cross_${Date.now()}`,
      relationName: `${current.relationName} 副本`,
      status: 'DRAFT',
      updatedAt: nowText(),
    }
    crossSubjectRelations = [relation, ...crossSubjectRelations]
    appendAudit('复制多主体转换关系', relation.relationName, current.status, relation.status)
    return clone(relation)
  },

  async changeCrossSubjectStatus(id: string, status: IdmCrossSubjectRelation['status']): Promise<IdmCrossSubjectRelation> {
    await delay()
    const current = crossSubjectRelations.find((relation) => relation.id === id)
    if (!current) {
      throw new Error('多主体关系不存在')
    }
    const relation = { ...current, status, updatedAt: nowText() }
    crossSubjectRelations = crossSubjectRelations.map((item) => item.id === id ? relation : item)
    appendAudit(status === 'PUBLISHED' ? '发布多主体转换关系' : '下线多主体转换关系', relation.relationName, current.status, status)
    return clone(relation)
  },

  async deleteCrossSubjectRelation(id: string): Promise<{ success: boolean, message: string }> {
    await delay()
    const current = crossSubjectRelations.find((relation) => relation.id === id)
    if (!current) {
      return { success: false, message: '多主体关系不存在' }
    }
    crossSubjectRelations = crossSubjectRelations.filter((relation) => relation.id !== id)
    appendAudit('删除多主体转换关系', current.relationName, current.status, undefined)
    return { success: true, message: `已删除多主体关系「${current.relationName}」。` }
  },

  async previewCrossSubjectRelation(payload: CrossSubjectPayload): Promise<IdmCrossSubjectPreviewRow[]> {
    await delay()
    const subjectA = payload.subjectAName || '用户'
    const subjectB = payload.subjectBName || '对象'
    return Array.from({ length: 8 }).map((_, index) => {
      const isDuplicate = index === 2
      const isMissing = index === 6
      return {
        id: `cross_preview_${index + 1}`,
        subjectAId: `${subjectA === '用户' ? 'uid' : 'a'}_${839201 + index}`,
        subjectAName: subjectA,
        subjectBId: `${subjectB === '车辆' ? 'vin' : subjectB === '门店' ? 'shop' : 'obj'}_${1200 + index}`,
        subjectBName: subjectB,
        relationScore: isMissing ? 61.8 : isDuplicate ? 72.4 : 90.5 + index,
        strategyValue: payload.strategyType === 'MAX' ? `${1000 + index * 12}` : `2026-05-${String(22 - index).padStart(2, '0')} 10:${String(index * 6).padStart(2, '0')}:00`,
        lastEventTime: `2026-05-${String(22 - index).padStart(2, '0')} 11:${String(index * 7).padStart(2, '0')}:00`,
        status: isMissing ? 'MISSING_FIELD' : isDuplicate ? 'DUPLICATE' : 'VALID',
      }
    })
  },

  async getSettings(): Promise<{
    onlineServices: IdmOnlineService[]
    correctionSetting: IdmCorrectionSetting
    visibilityRules: IdmVisibilityRule[]
      auditLogs: typeof mockAuditLogs
    }> {
    await delay()
    return {
      onlineServices: clone(onlineServices),
      correctionSetting: clone(correctionSetting),
      visibilityRules: clone(visibilityRules),
      auditLogs: clone(auditLogs),
    }
  },

  async updateOnlineServices(services: IdmOnlineService[]): Promise<IdmOnlineService[]> {
    await delay()
    onlineServices = clone(services)
    appendAudit('保存在线服务配置', 'OneID 在线服务', undefined, `${onlineServices.length} 个服务`)
    return clone(onlineServices)
  },

  async createOnlineService(payload: Omit<IdmOnlineService, 'id'>): Promise<IdmOnlineService> {
    await delay()
    if (!payload.serviceName.trim()) {
      throw new Error('请输入在线服务名称')
    }
    const service: IdmOnlineService = {
      ...payload,
      id: `svc_${Date.now()}`,
      serviceName: payload.serviceName.trim(),
    }
    onlineServices = [service, ...onlineServices]
    appendAudit('新增在线服务', service.serviceName, undefined, service.enabled ? 'ENABLED' : 'DISABLED')
    return clone(service)
  },

  async updateVisibilityRules(rules: IdmVisibilityRule[]): Promise<IdmVisibilityRule[]> {
    await delay()
    visibilityRules = rules.map((rule) => ({ ...rule, updatedAt: nowText() }))
    appendAudit('保存可见范围', '主体及 ID 可见范围', undefined, `${visibilityRules.length} 条规则`)
    return clone(visibilityRules)
  },

  async createVisibilityRule(payload: Omit<IdmVisibilityRule, 'id' | 'updatedAt'>): Promise<IdmVisibilityRule> {
    await delay()
    if (!payload.targetName.trim()) {
      throw new Error('请输入授权对象')
    }
    const rule: IdmVisibilityRule = {
      ...payload,
      id: `vr_${Date.now()}`,
      targetName: payload.targetName.trim(),
      updatedAt: nowText(),
    }
    visibilityRules = [rule, ...visibilityRules]
    appendAudit('新增可见范围规则', rule.targetName, undefined, 'EFFECTIVE')
    return clone(rule)
  },

  async updateCorrectionSetting(setting: IdmCorrectionSetting): Promise<IdmCorrectionSetting> {
    await delay()
    correctionSetting = clone(setting)
    appendAudit('保存 OneID 数据修正设置', '历史 OneID 修正', undefined, setting.enabled ? '启用' : '停用')
    return clone(correctionSetting)
  },
}
