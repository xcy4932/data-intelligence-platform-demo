import {
  mockAuditLogs,
  mockConnectorDefinitions,
  mockDataConnections,
  mockDefaultDeleteImpact,
  mockDeleteImpacts,
  mockGeneratedDatasets,
  mockIngestionJobs,
  mockModelingTasks,
  mockPreviewResults,
  mockTestRecords,
} from '@/mock/dataConnections'
import type {
  DataConnection,
  DataConnectionAuditLog,
  DataConnectionColumnType,
  DataConnectionConfig,
  DataConnectionDataset,
  DataConnectionDeleteImpact,
  DataConnectionFormPayload,
  DataConnectionIngestionJob,
  DataConnectionLineageEdge,
  DataConnectionLineageNode,
  DataConnectionListFilter,
  DataConnectionModelingTask,
  DataConnectionPermission,
  DataConnectionPreviewResult,
  DataConnectionPreviewStructureType,
  DataConnectionStatus,
  DataConnectionTableSchema,
  DataConnectionTestRecord,
  DataConnectorDefinition,
} from '@/types/dataConnection'

const delay = async (ms = 180): Promise<void> => {
  await new Promise((resolve) => window.setTimeout(resolve, ms))
}

const clone = <T>(value: T): T => {
  try {
    return structuredClone(value)
  } catch {
    return JSON.parse(JSON.stringify(value)) as T
  }
}

let connections = clone(mockDataConnections)
let testRecords = clone(mockTestRecords)
let ingestionJobs = clone(mockIngestionJobs)
let generatedDatasets = clone(mockGeneratedDatasets)
let modelingTasks = clone(mockModelingTasks)
let auditLogs = clone(mockAuditLogs)

function nowText(): string {
  return '2026-05-23 11:00:00'
}

function createAudit(connectionId: string, action: string, message: string): void {
  auditLogs.unshift({
    id: `audit_${Date.now()}`,
    connectionId,
    action,
    operator: 'Chaoyang Xu',
    message,
    createdAt: nowText(),
  })
}

function getConnector(connectorType: string): DataConnectorDefinition {
  const connector = mockConnectorDefinitions.find((item) => item.connectorType === connectorType)
  if (!connector) {
    throw new Error('未知连接器类型')
  }
  return connector
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim().toLowerCase()
}

function matchesKeyword(connection: DataConnection, keyword?: string): boolean {
  if (!keyword) {
    return true
  }
  const value = normalizeText(keyword)
  return [
    connection.connectionName,
    connection.connectorName,
    connection.sourceSystem,
    connection.owner,
    connection.createdBy,
    ...connection.tags,
  ].some((item) => normalizeText(item).includes(value))
}

function dateInRange(value: string | undefined, start?: string, end?: string): boolean {
  if (!start && !end) {
    return true
  }
  if (!value) {
    return false
  }
  const dateValue = value.slice(0, 10)
  return (!start || dateValue >= start) && (!end || dateValue <= end)
}

function maskConfig(config: DataConnectionConfig, secretKeys: string[]): DataConnectionConfig {
  const next = clone(config)
  secretKeys.forEach((key) => {
    if (key in next) {
      next[key] = '******'
    }
  })
  return next
}

function sanitizeConfig(config: DataConnectionConfig): DataConnectionConfig {
  return Object.fromEntries(Object.entries(config).filter(([key]) => !key.startsWith('__')))
}

function buildConnection(payload: DataConnectionFormPayload, id?: string): DataConnection {
  const connector = getConnector(payload.connectorType)
  const existing = id ? connections.find((connection) => connection.id === id) : null
  const authorizedByForm = payload.config.__authorized === true
  const secretKeys = connector.fields.filter((field) => field.secret).map((field) => field.key)
  const maskedConfig = maskConfig(sanitizeConfig(payload.config), secretKeys)

  return {
    id: id ?? `conn_${Date.now()}`,
    projectId: 'demo_project',
    connectionName: payload.connectionName,
    connectorType: connector.connectorType,
    connectorName: connector.connectorName,
    connectorCategory: connector.connectorCategory,
    categoryName: connector.categoryName,
    sourceSystem: payload.sourceSystem,
    description: payload.description,
    owner: payload.owner,
    tags: payload.tags,
    visibility: payload.visibility,
    status: existing?.status ?? 'SAVED',
    authStatus: existing?.authStatus ?? (connector.requiresAuth && !authorizedByForm ? 'NOT_AUTHORIZED' : 'AUTH_SUCCESS'),
    testStatus: existing?.testStatus ?? (connector.supportsTest ? 'NOT_TESTED' : 'NOT_TESTED'),
    ingestStatus: existing?.ingestStatus ?? 'NOT_STARTED',
    supportsTest: connector.supportsTest,
    supportsPreview: connector.supportsPreview,
    supportsOneClickIngest: connector.supportsOneClickIngest,
    datasetCount: existing?.datasetCount ?? 0,
    modelingTaskCount: existing?.modelingTaskCount ?? 0,
    createdBy: existing?.createdBy ?? 'Chaoyang Xu',
    updatedBy: 'Chaoyang Xu',
    createdAt: existing?.createdAt ?? nowText(),
    updatedAt: nowText(),
    recentTestTime: existing?.recentTestTime,
    recentIngestTime: existing?.recentIngestTime,
    config: maskedConfig,
    secretKeys,
  }
}

const categoryPreviewKey: Partial<Record<DataConnectorDefinition['connectorCategory'], string>> = {
  RELATIONAL_DB: 'mysql',
  DATA_WAREHOUSE: 'hive',
  OLAP: 'clickhouse',
  NOSQL: 'mongodb',
  FILE: 'file_like',
  OBJECT_STORAGE: 'file_like',
  API: 'rest_api',
  STREAMING: 'kafka',
  BEHAVIOR: 'behavior_like',
  AD_PLATFORM: 'oceanengine',
  WECHAT: 'wechat_like',
  PUBLIC_DATA: 'calendar_public',
  CONTENT: 'rest_api',
}

const semiStructuredTypes = new Set<DataConnectionColumnType>(['JSON', 'ARRAY', 'MAP'])
const unstructuredTypes = new Set<DataConnectionColumnType>(['BINARY'])

function inferStructureType(
  connector: DataConnectorDefinition,
  table: DataConnectionTableSchema,
): DataConnectionPreviewStructureType {
  if (table.columns.some((column) => unstructuredTypes.has(column.type))) {
    return 'UNSTRUCTURED'
  }
  if (
    table.columns.some((column) => semiStructuredTypes.has(column.type)) ||
    ['NOSQL', 'API', 'STREAMING', 'BEHAVIOR', 'CONTENT'].includes(connector.connectorCategory)
  ) {
    return 'SEMI_STRUCTURED'
  }
  return 'STRUCTURED'
}

function normalizePreviewResult(
  result: DataConnectionPreviewResult,
  connector: DataConnectorDefinition,
): DataConnectionPreviewResult {
  const normalized = clone(result)
  const tableCount = Math.max(normalized.tables.length, 1)
  normalized.tables = normalized.tables.map((table, index) => {
    const rowEstimate =
      table.rowEstimate ?? (index === 0 ? normalized.rowEstimate : Math.round(normalized.rowEstimate / tableCount))
    const previewRows = table.previewRows ?? (index === 0 ? normalized.previewRows : [])
    return {
      ...table,
      rowEstimate,
      previewRows,
      structureType: table.structureType ?? inferStructureType(connector, table),
    }
  })
  normalized.previewRows = normalized.tables[0]?.previewRows ?? normalized.previewRows
  return normalized
}

function previewForType(connectorType: string): DataConnectionPreviewResult {
  const connector = getConnector(connectorType)
  const direct = mockPreviewResults[connectorType]
  if (direct) {
    return normalizePreviewResult(direct, connector)
  }

  const previewKey = categoryPreviewKey[connector.connectorCategory] ?? 'mysql'
  const result = clone((mockPreviewResults[previewKey] ?? mockPreviewResults.mysql) as DataConnectionPreviewResult)
  result.message = `${connector.connectorName} 连接成功，已读取表结构和样例数据。`
  result.schemas = [connector.connectorType]
  result.tables = result.tables.map((table) => ({
    ...table,
    schema: connector.connectorType,
    tableName: `${connector.connectorType}_${table.tableName}`,
  }))
  return normalizePreviewResult(result, connector)
}

function hasSimulatedFailure(payload: DataConnectionFormPayload | DataConnection): boolean {
  const host = normalizeText(payload.config.host)
  const endpointUrl = normalizeText(payload.config.endpointUrl)
  return host.includes('fail') || endpointUrl.includes('/500') || endpointUrl.includes('error')
}

function statusAfterTest(success: boolean): DataConnectionStatus {
  return success ? 'TEST_SUCCESS' : 'TEST_FAILED'
}

function createPreviewResult(payload: DataConnectionFormPayload | DataConnection): DataConnectionPreviewResult {
  const failed = hasSimulatedFailure(payload)
  if (failed) {
    return {
      success: false,
      message: '连接测试失败，请检查地址、权限或接口状态。',
      errorCode: 'CONNECTION_UNREACHABLE',
      schemas: [],
      tables: [],
      previewRows: [],
      rowEstimate: 0,
    }
  }
  return previewForType(payload.connectorType)
}

export const dataConnectionService = {
  async getPermission(): Promise<DataConnectionPermission> {
    await delay()
    return {
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canTest: true,
      canAuthorize: true,
      canOneClickIngest: true,
      canViewSecret: false,
      role: 'PROJECT_ADMIN',
    }
  },

  async listConnectors(): Promise<DataConnectorDefinition[]> {
    await delay()
    return clone(mockConnectorDefinitions)
  },

  async listConnections(filter: DataConnectionListFilter = {}): Promise<DataConnection[]> {
    await delay()
    return clone(
      connections.filter((connection) => {
        const categoryMatches =
          !filter.connectorCategory ||
          filter.connectorCategory === 'ALL' ||
          connection.connectorCategory === filter.connectorCategory
        const typeMatches =
          !filter.connectorType ||
          filter.connectorType === 'ALL' ||
          connection.connectorType === filter.connectorType
        const statusMatches =
          !filter.status ||
          filter.status === 'ALL' ||
          connection.status === filter.status
        const creatorMatches =
          !filter.createdBy ||
          filter.createdBy === 'ALL' ||
          connection.createdBy === filter.createdBy
        const ingestMatches =
          !filter.supportsOneClickIngest ||
          filter.supportsOneClickIngest === 'ALL' ||
          (filter.supportsOneClickIngest === 'YES'
            ? connection.supportsOneClickIngest
            : !connection.supportsOneClickIngest)
        const createdAtMatches = dateInRange(connection.createdAt, filter.createdAtStart, filter.createdAtEnd)
        const recentTestMatches = dateInRange(connection.recentTestTime, filter.recentTestStart, filter.recentTestEnd)

        return (
          matchesKeyword(connection, filter.keyword) &&
          categoryMatches &&
          typeMatches &&
          statusMatches &&
          creatorMatches &&
          ingestMatches &&
          createdAtMatches &&
          recentTestMatches
        )
      }),
    )
  },

  async getConnection(connectionId: string): Promise<DataConnection | null> {
    await delay()
    const connection = connections.find((item) => item.id === connectionId)
    return connection ? clone(connection) : null
  },

  async testConnection(
    payload: DataConnectionFormPayload | { connectionId: string },
  ): Promise<DataConnectionPreviewResult> {
    await delay(520)

    const isExisting = 'connectionId' in payload
    const connection = isExisting
      ? connections.find((item) => item.id === payload.connectionId)
      : null
    const source = connection ?? (payload as DataConnectionFormPayload)
    const result = createPreviewResult(source)

    if (connection) {
      connection.status = statusAfterTest(result.success)
      connection.testStatus = result.success ? 'SUCCESS' : 'FAILED'
      connection.recentTestTime = nowText()
      connection.updatedAt = nowText()
      const record: DataConnectionTestRecord = {
        id: `test_${Date.now()}`,
        connectionId: connection.id,
        status: connection.testStatus,
        errorCode: result.errorCode,
        errorMessage: result.success ? undefined : result.message,
        testedBy: 'Chaoyang Xu',
        testedAt: nowText(),
        durationMs: result.success ? 920 : 2100,
      }
      testRecords.unshift(record)
      createAudit(
        connection.id,
        result.success ? 'TEST_SUCCESS' : 'TEST_FAILED',
        result.success ? '连接测试成功。' : result.message,
      )
    }

    return clone(result)
  },

  async previewConnection(
    payload: DataConnectionFormPayload | { connectionId: string },
  ): Promise<DataConnectionPreviewResult> {
    await delay(360)

    const isExisting = 'connectionId' in payload
    const connection = isExisting
      ? connections.find((item) => item.id === payload.connectionId)
      : null
    const source = connection ?? (payload as DataConnectionFormPayload)
    return clone(createPreviewResult(source))
  },

  async authorizeConnection(connectionId: string): Promise<DataConnection | null> {
    await delay(420)
    const connection = connections.find((item) => item.id === connectionId)
    if (!connection) {
      return null
    }
    connection.authStatus = 'AUTH_SUCCESS'
    connection.status = connection.testStatus === 'SUCCESS' ? 'TEST_SUCCESS' : 'SAVED'
    connection.updatedAt = nowText()
    createAudit(connection.id, 'AUTH_SUCCESS', '授权刷新成功。')
    return clone(connection)
  },

  async createConnection(payload: DataConnectionFormPayload): Promise<DataConnection> {
    await delay(320)
    const duplicated = connections.some((item) => item.connectionName === payload.connectionName)
    if (duplicated) {
      throw new Error('当前项目下已有同名连接，请修改连接名称。')
    }
    const connection = buildConnection(payload)
    connections.unshift(connection)
    createAudit(connection.id, 'CREATE_CONNECTION', '创建数据连接。')
    return clone(connection)
  },

  async updateConnection(connectionId: string, payload: DataConnectionFormPayload): Promise<DataConnection | null> {
    await delay(320)
    const index = connections.findIndex((item) => item.id === connectionId)
    if (index < 0) {
      return null
    }
    const duplicated = connections.some((item) => item.id !== connectionId && item.connectionName === payload.connectionName)
    if (duplicated) {
      throw new Error('当前项目下已有同名连接，请修改连接名称。')
    }
    const previous = connections[index] as DataConnection
    const next = buildConnection(payload, connectionId)
    next.status = next.supportsTest ? 'SAVED' : next.status
    next.testStatus = next.supportsTest ? 'NOT_TESTED' : next.testStatus
    if (next.authStatus === 'AUTH_SUCCESS' && payload.config.__authorized !== true) {
      next.authStatus = previous.authStatus
    }
    connections[index] = next
    createAudit(connectionId, 'UPDATE_CONNECTION', '更新连接配置，需重新测试。')
    return clone(next)
  },

  async runOneClickIngest(connectionId: string): Promise<DataConnectionIngestionJob | null> {
    await delay(720)
    const connection = connections.find((item) => item.id === connectionId)
    if (!connection || !connection.supportsOneClickIngest) {
      return null
    }

    const connector = getConnector(connection.connectorType)
    const rawDatasetId = `ds_raw_${connection.connectorType}_${Date.now()}`
    const structuredDatasetId = `ds_${connection.connectorType}_standard_${Date.now()}`
    const modelingTaskId = `model_${connection.connectorType}_${Date.now()}`
    const job: DataConnectionIngestionJob = {
      id: `ingest_${Date.now()}`,
      connectionId,
      jobStatus: 'SUCCESS',
      sourceType: connector.connectorCategory,
      rawDatasetId,
      structuredDatasetId,
      modelingTaskId,
      startedBy: 'Chaoyang Xu',
      startedAt: nowText(),
      finishedAt: nowText(),
    }
    ingestionJobs.unshift(job)
    generatedDatasets.unshift(
      {
        id: rawDatasetId,
        connectionId,
        datasetName: `raw_${connection.connectorType}_auto`,
        datasetType: 'RAW',
        storageEngine: connector.realtime ? 'Kafka' : 'Hive',
        rowCount: 128000,
        status: 'READY',
        createdAt: nowText(),
      },
      {
        id: structuredDatasetId,
        connectionId,
        datasetName: `${connection.connectorType}_standard_dataset`,
        datasetType: 'STRUCTURED',
        storageEngine: 'ClickHouse',
        rowCount: 128000,
        status: 'READY',
        createdAt: nowText(),
      },
    )
    modelingTasks.unshift({
      id: modelingTaskId,
      connectionId,
      taskName: `${connector.connectorName} 标准化建模`,
      taskType: connector.realtime ? 'REALTIME_STREAM' : 'VISUAL_MODELING',
      status: 'SUCCESS',
      outputDatasetId: structuredDatasetId,
      updatedAt: nowText(),
    })
    connection.datasetCount += 2
    connection.modelingTaskCount += 1
    connection.ingestStatus = 'SUCCESS'
    connection.status = 'INGEST_SUCCESS'
    connection.recentIngestTime = nowText()
    connection.updatedAt = nowText()
    createAudit(connectionId, 'ONE_CLICK_INGEST', '一键接入完成，已生成数据集和建模任务。')
    return clone(job)
  },

  async listTestRecords(connectionId: string): Promise<DataConnectionTestRecord[]> {
    await delay()
    return clone(testRecords.filter((item) => item.connectionId === connectionId))
  },

  async listIngestionJobs(connectionId: string): Promise<DataConnectionIngestionJob[]> {
    await delay()
    return clone(ingestionJobs.filter((item) => item.connectionId === connectionId))
  },

  async listGeneratedDatasets(connectionId: string): Promise<DataConnectionDataset[]> {
    await delay()
    return clone(generatedDatasets.filter((item) => item.connectionId === connectionId))
  },

  async listModelingTasks(connectionId: string): Promise<DataConnectionModelingTask[]> {
    await delay()
    return clone(modelingTasks.filter((item) => item.connectionId === connectionId))
  },

  async getLineage(connectionId: string): Promise<{ nodes: DataConnectionLineageNode[], edges: DataConnectionLineageEdge[] }> {
    await delay()
    const connection = connections.find((item) => item.id === connectionId)
    const connectionNode: DataConnectionLineageNode = {
      id: connectionId,
      label: connection?.connectionName ?? '数据连接',
      type: 'CONNECTION',
      status:
        connection?.status === 'TEST_FAILED' || connection?.status === 'INGEST_FAILED'
          ? 'ERROR'
          : connection?.status === 'AUTH_REQUIRED' || connection?.ingestStatus === 'CREATED'
            ? 'WARNING'
            : 'NORMAL',
    }
    const datasets = generatedDatasets.filter((item) => item.connectionId === connectionId)
    const tasks = modelingTasks.filter((item) => item.connectionId === connectionId)
    const rawDatasets = datasets.filter((item) => item.datasetType === 'RAW')
    const structuredDatasets = datasets.filter((item) => item.datasetType === 'STRUCTURED')
    const nodes: DataConnectionLineageNode[] = [
      connectionNode,
      ...datasets.map((dataset) => ({
        id: dataset.id,
        label: dataset.datasetName,
        type: dataset.datasetType === 'RAW' ? 'RAW_DATASET' as const : 'STRUCTURED_DATASET' as const,
        status:
          dataset.status === 'FAILED'
            ? 'ERROR' as const
            : dataset.status === 'CREATED'
              ? 'WARNING' as const
              : 'NORMAL' as const,
      })),
      ...tasks.map((task) => ({
        id: task.id,
        label: task.taskName,
        type: 'MODEL_TASK' as const,
        status:
          task.status === 'FAILED'
            ? 'ERROR' as const
            : task.status === 'CREATED' || task.status === 'RUNNING'
              ? 'WARNING' as const
              : 'NORMAL' as const,
      })),
    ]

    const edges: DataConnectionLineageEdge[] = []
    rawDatasets.forEach((dataset) => {
      edges.push({
        id: `edge_${connectionId}_${dataset.id}`,
        source: connectionId,
        target: dataset.id,
        relationName: '连接产出原始数据',
      })
    })

    tasks.forEach((task, index) => {
      const outputDataset = datasets.find((dataset) => dataset.id === task.outputDatasetId)
      const inputDataset = rawDatasets.find((dataset) => dataset.id !== outputDataset?.id) ?? rawDatasets[index % rawDatasets.length]
      if (inputDataset && inputDataset.id !== outputDataset?.id) {
        edges.push({
          id: `edge_${inputDataset.id}_${task.id}`,
          source: inputDataset.id,
          target: task.id,
          relationName: '建模输入',
        })
      } else {
        edges.push({
          id: `edge_${connectionId}_${task.id}`,
          source: connectionId,
          target: task.id,
          relationName: '触发任务',
        })
      }
      if (outputDataset) {
        edges.push({
          id: `edge_${task.id}_${outputDataset.id}`,
          source: task.id,
          target: outputDataset.id,
          relationName: '任务输出',
        })
      }
    })

    datasets
      .filter((dataset) => !edges.some((edge) => edge.target === dataset.id || edge.source === dataset.id))
      .forEach((dataset) => {
        edges.push({
          id: `edge_direct_${connectionId}_${dataset.id}`,
          source: connectionId,
          target: dataset.id,
          relationName: '连接产出',
        })
      })

    const downstreamSource = structuredDatasets.find((dataset) => dataset.status === 'READY')
      ?? datasets.find((dataset) => dataset.status === 'READY')
    if (connection && downstreamSource) {
      const dashboardNode: DataConnectionLineageNode = {
        id: `dash_${connectionId}`,
        label: `${connection.connectionName} 数据监控看板`,
        type: 'DASHBOARD',
        status: 'NORMAL',
      }
      nodes.push(dashboardNode)
      edges.push({
        id: `edge_${downstreamSource.id}_${dashboardNode.id}`,
        source: downstreamSource.id,
        target: dashboardNode.id,
        relationName: '看板引用',
      })

      if (['RELATIONAL_DB', 'DATA_WAREHOUSE', 'STREAMING', 'BEHAVIOR'].includes(connection.connectorCategory)) {
        const tagNode: DataConnectionLineageNode = {
          id: `tag_${connectionId}`,
          label: `${connection.connectionName} 用户标签`,
          type: 'TAG',
          status: 'NORMAL',
        }
        const segmentNode: DataConnectionLineageNode = {
          id: `seg_${connectionId}`,
          label: `${connection.connectionName} 分群圈选`,
          type: 'SEGMENT',
          status: 'NORMAL',
        }
        nodes.push(tagNode, segmentNode)
        edges.push(
          {
            id: `edge_${downstreamSource.id}_${tagNode.id}`,
            source: downstreamSource.id,
            target: tagNode.id,
            relationName: '标签计算',
          },
          {
            id: `edge_${downstreamSource.id}_${segmentNode.id}`,
            source: downstreamSource.id,
            target: segmentNode.id,
            relationName: '分群圈选',
          },
        )
      }
    }
    return { nodes: clone(nodes), edges: clone(edges) }
  },

  async listAuditLogs(connectionId: string): Promise<DataConnectionAuditLog[]> {
    await delay()
    return clone(auditLogs.filter((item) => item.connectionId === connectionId))
  },

  async getDeleteImpact(connectionId: string): Promise<DataConnectionDeleteImpact> {
    await delay()
    return clone(mockDeleteImpacts[connectionId] ?? mockDefaultDeleteImpact)
  },

  async deleteConnection(connectionId: string): Promise<boolean> {
    await delay(240)
    const impact = mockDeleteImpacts[connectionId] ?? mockDefaultDeleteImpact
    if (!impact.canDelete) {
      return false
    }
    connections = connections.filter((item) => item.id !== connectionId)
    testRecords = testRecords.filter((item) => item.connectionId !== connectionId)
    ingestionJobs = ingestionJobs.filter((item) => item.connectionId !== connectionId)
    generatedDatasets = generatedDatasets.filter((item) => item.connectionId !== connectionId)
    modelingTasks = modelingTasks.filter((item) => item.connectionId !== connectionId)
    auditLogs = auditLogs.filter((item) => item.connectionId !== connectionId)
    return true
  },
}
