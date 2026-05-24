import {
  defaultSqlColumns,
  makeTableInfo,
  mockSqlColumns,
  mockSqlConnections,
  mockSqlDatabases,
  mockSqlFolders,
  mockSqlHistories,
  mockSqlJobs,
  mockSqlLogs,
  mockSqlPartitions,
  mockSqlResultColumns,
  mockSqlTables,
  mockSqlWorkbooks,
  sqlQueryFeatureSwitch,
  sqlQueryPermission,
  supportedSqlSourceTypes,
} from '@/mock/sqlQuery'
import type {
  SqlDataSourceType,
  SqlFolder,
  SqlMetadataConnection,
  SqlMetadataTable,
  SqlParseResult,
  SqlQueryFeatureSwitch,
  SqlQueryHistory,
  SqlQueryJob,
  SqlQueryJobStatus,
  SqlQueryLog,
  SqlQueryPermissionState,
  SqlResultColumn,
  SqlResultDownloadTask,
  SqlResultPage,
  SqlResultQueryParams,
  SqlRoutineRunRecord,
  SqlRoutineScheduleType,
  SqlRoutineTask,
  SqlTableColumn,
  SqlTableInfo,
  SqlTablePartition,
  SqlTemporaryDataset,
  SqlTemporaryDatasetCleanupResult,
  SqlVariableConfig,
  SqlVariableType,
  SqlVisualChart,
  SqlWorkbook,
} from '@/types/sqlQuery'

export const SQL_VARIABLE_REGEX = /\{\{\s*([\u4e00-\u9fa5A-Za-z0-9_-]{1,64})\s*\}\}/g

interface SqlQueryServiceState {
  folders: SqlFolder[]
  workbooks: SqlWorkbook[]
  jobs: SqlQueryJob[]
  histories: SqlQueryHistory[]
  logs: SqlQueryLog[]
  resultsByJobId: Record<string, { columns: SqlResultColumn[], rows: Array<Record<string, unknown>> }>
  downloads: SqlResultDownloadTask[]
  temporaryDatasets: SqlTemporaryDataset[]
  charts: SqlVisualChart[]
  routines: SqlRoutineTask[]
  routineRuns: SqlRoutineRunRecord[]
}

export interface CreateWorkbookPayload {
  projectId: string
  folderId: string | null
  name: string
  description?: string
  sqlContent: string
  dataSourceType?: SqlDataSourceType
  connectionId?: string
  databaseName?: string
  resourceId?: string
  variableConfigs: SqlVariableConfig[]
}

export interface ExecuteSqlPayload {
  projectId: string
  workbookId?: string
  temporaryQueryId?: string
  dataSourceType: SqlDataSourceType
  connectionId: string
  databaseName: string
  resourceId?: string
  rawSql: string
  variableValues: Record<string, string>
}

export interface SaveChartPayload {
  temporaryDatasetId: string
  targetProjectId: string
  chartName: string
  datasetName: string
  description?: string
  chartConfig: Record<string, unknown>
}

export interface CreateRoutinePayload {
  projectId: string
  chartId: string
  datasetId: string
  syncType: 'full_overwrite' | 'partition_overwrite'
  partitionField?: string
  scheduleType: SqlRoutineScheduleType
  scheduleCron?: string
  scheduleStartAt: string
  executeTime: string
  notifyEnabled: boolean
  notifyUserIds: string[]
}

const storageKey = 'sql_query_demo_state_v1'
const currentUserId = 'current_user'
const currentUserName = 'Chaoyang Xu'
const projectId = 'project_001'

const delay = async (ms = 120): Promise<void> => {
  await new Promise((resolve) => window.setTimeout(resolve, ms))
}

const clone = <T>(value: T): T => {
  try {
    return structuredClone(value)
  } catch {
    return JSON.parse(JSON.stringify(value)) as T
  }
}

const pad = (value: number): string => String(value).padStart(2, '0')

const nowText = (date = new Date()): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`

const dateOnly = (date = new Date()): string => nowText(date).slice(0, 10)

const compactTimestamp = (date = new Date()): string =>
  `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`

const parseTextTime = (value?: string): number => {
  if (!value) return Date.now()
  const parsed = Date.parse(value.replace(' ', 'T'))
  return Number.isNaN(parsed) ? Date.now() : parsed
}

const isPast = (value: string): boolean => {
  const parsed = Date.parse(value.replace(' ', 'T'))
  return !Number.isNaN(parsed) && parsed < Date.now()
}

function makeResultRows(total = 128): Array<Record<string, unknown>> {
  const products = ['手机', '电脑', '家电', '服饰', '运动装备', '美妆套装']
  const categories = ['手机', '电脑', '家电', '服饰']
  return Array.from({ length: total }, (_, index) => {
    const day = 1 + (index % 24)
    const product = products[index % products.length] ?? '手机'
    const category = categories[index % categories.length] ?? '手机'
    return {
      order_id: 202605240000 + index + 1,
      product_name: product,
      category,
      amount: Number((99 + index * 13.7).toFixed(2)),
      order_date: `2026-05-${pad(day)}`,
      tags: ['高价值', index % 2 === 0 ? '新客' : '复购'],
      ext: { channel: index % 2 === 0 ? 'app' : 'web', city: index % 3 === 0 ? '上海' : '杭州' },
    }
  })
}

const defaultResults: SqlQueryServiceState['resultsByJobId'] = {
  job_seed_success: { columns: mockSqlResultColumns, rows: makeResultRows(128) },
  job_seed_expired: {
    columns: [
      { name: 'active_date', type: 'date', displayType: 'date', nullable: false, index: 0 },
      { name: 'active_uv', type: 'bigint', displayType: 'number', nullable: false, index: 1 },
    ],
    rows: Array.from({ length: 31 }, (_, index) => ({ active_date: `2026-04-${pad(index + 1)}`, active_uv: 42000 + index * 137 })),
  },
}

const defaultState: SqlQueryServiceState = {
  folders: mockSqlFolders,
  workbooks: mockSqlWorkbooks,
  jobs: mockSqlJobs,
  histories: mockSqlHistories,
  logs: mockSqlLogs,
  resultsByJobId: defaultResults,
  downloads: [],
  temporaryDatasets: [],
  charts: [],
  routines: [],
  routineRuns: [],
}

function readState(): SqlQueryServiceState {
  if (typeof window === 'undefined') {
    return clone(defaultState)
  }
  const stored = window.localStorage.getItem(storageKey)
  if (!stored) {
    return clone(defaultState)
  }
  try {
    return { ...clone(defaultState), ...(JSON.parse(stored) as SqlQueryServiceState) }
  } catch {
    return clone(defaultState)
  }
}

function writeState(state: SqlQueryServiceState): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(storageKey, JSON.stringify(state))
}

let state = readState()

function cleanupExpiredTemporaryDatasets(): SqlTemporaryDatasetCleanupResult {
  const deletedDatasetIds: string[] = []
  state.temporaryDatasets.forEach((dataset) => {
    if ((dataset.status === 'creating' || dataset.status === 'ready' || dataset.status === 'failed') && isPast(dataset.expiredAt)) {
      dataset.status = 'expired'
      deletedDatasetIds.push(dataset.id)
    }
  })
  if (deletedDatasetIds.length) {
    writeState(state)
  }
  return { expiredCount: deletedDatasetIds.length, deletedDatasetIds }
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim().toLowerCase()
}

function activeFolders(): SqlFolder[] {
  return state.folders.filter((folder) => !folder.deletedAt)
}

function activeWorkbooks(): SqlWorkbook[] {
  const deletedFolderIds = new Set(state.folders.filter((folder) => folder.deletedAt).map((folder) => folder.id))
  return state.workbooks.filter((workbook) => workbook.status === 'saved' && !deletedFolderIds.has(workbook.folderId ?? ''))
}

function findConnection(connectionId: string): SqlMetadataConnection | undefined {
  return mockSqlConnections.find((connection) => connection.id === connectionId)
}

function assertFolderName(parentId: string | null, name: string, exceptId?: string): void {
  const trimmed = name.trim()
  if (!trimmed || trimmed.length > 64) {
    throw new Error('文件夹名称需为 1-64 个字符')
  }
  if (/[\\/:\*\?"<>\|]/.test(trimmed)) {
    throw new Error('文件夹名称不能包含特殊字符')
  }
  const duplicate = activeFolders().some(
    (folder) => folder.parentId === parentId && folder.id !== exceptId && normalizeText(folder.name) === normalizeText(trimmed),
  )
  if (duplicate) {
    throw new Error('当前目录下已存在同名文件夹')
  }
}

function assertWorkbookName(folderId: string | null, name: string, exceptId?: string): void {
  const trimmed = name.trim()
  if (!trimmed || trimmed.length > 64) {
    throw new Error('查询名称需为 1-64 个字符')
  }
  const duplicate = activeWorkbooks().some(
    (workbook) => (workbook.folderId ?? null) === folderId && workbook.id !== exceptId && normalizeText(workbook.name) === normalizeText(trimmed),
  )
  if (duplicate) {
    throw new Error('同一文件夹下已存在同名查询文件')
  }
}

function folderDescendantIds(folderId: string): string[] {
  const ids = [folderId]
  activeFolders()
    .filter((folder) => folder.parentId === folderId)
    .forEach((folder) => ids.push(...folderDescendantIds(folder.id)))
  return ids
}

function appendLog(jobId: string, level: SqlQueryLog['level'], message: string): void {
  state.logs.push({ id: makeId('log'), jobId, level, message, timestamp: nowText() })
}

function sourceTableKey(connectionId: string, databaseName: string): string {
  return `${connectionId}:${databaseName}`
}

function quoteTableName(type: SqlDataSourceType, databaseName: string, tableName: string): string {
  if (type === 'DATA_LAKE_API') {
    return `${databaseName}.${tableName}`
  }
  return `\`${databaseName}\`.\`${tableName}\``
}

function getTableColumns(tableName: string): SqlTableColumn[] {
  return clone(mockSqlColumns[tableName] ?? defaultSqlColumns)
}

function columnsToResultColumns(columns: SqlTableColumn[]): SqlResultColumn[] {
  return columns.map((column, index) => {
    const type = column.type.toLowerCase()
    const displayType: SqlResultColumn['displayType'] = type.includes('array')
      ? 'array_as_string'
      : type.includes('map')
        ? 'map_as_string'
        : type.includes('int') || type.includes('decimal') || type.includes('double')
          ? 'number'
          : type.includes('date') && !type.includes('time')
            ? 'date'
            : type.includes('time')
              ? 'datetime'
              : 'string'
    return { name: column.name, type: column.type, displayType, nullable: column.nullable, index }
  })
}

export function extractSqlVariables(sql: string): string[] {
  const result: string[] = []
  for (const match of sql.matchAll(SQL_VARIABLE_REGEX)) {
    const name = match[1]?.trim()
    if (name && !result.includes(name)) {
      result.push(name)
    }
  }
  return result
}

export function defaultVariableConfig(name: string, type: SqlVariableType = 'text'): SqlVariableConfig {
  return {
    name,
    type,
    required: true,
    defaultValue: '',
    options: type === 'dropdown' ? ['选项一'] : [],
    dateFormat:
      type === 'date'
        ? 'YYYY-MM-DD'
        : type === 'datetime_minute'
          ? 'YYYY-MM-DD HH:mm'
          : type === 'datetime_second'
            ? 'YYYY-MM-DD HH:mm:ss'
            : undefined,
    createdFromSql: true,
    updatedAt: nowText(),
  }
}

export function compileSql(rawSql: string, variableValues: Record<string, string>): string {
  return rawSql.replace(SQL_VARIABLE_REGEX, (_, variableName: string) => {
    const normalizedName = variableName.trim()
    const value = variableValues[normalizedName]
    if (value === undefined || value === null || value === '') {
      throw new Error(`变量「${normalizedName}」不能为空`)
    }
    return value
  })
}

function splitSqlStatements(sql: string): string[] {
  const statements: string[] = []
  let current = ''
  let single = false
  let double = false
  let backtick = false
  let lineComment = false
  let blockComment = false

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index] ?? ''
    const next = sql[index + 1] ?? ''

    if (lineComment) {
      if (char === '\n') {
        lineComment = false
        current += char
      }
      continue
    }
    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false
        index += 1
      }
      continue
    }
    if (!single && !double && !backtick && char === '-' && next === '-') {
      lineComment = true
      index += 1
      continue
    }
    if (!single && !double && !backtick && char === '/' && next === '*') {
      blockComment = true
      index += 1
      continue
    }
    if (char === "'" && !double && !backtick) {
      single = !single
    } else if (char === '"' && !single && !backtick) {
      double = !double
    } else if (char === '`' && !single && !double) {
      backtick = !backtick
    }
    if (char === ';' && !single && !double && !backtick) {
      if (current.trim()) statements.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  if (current.trim()) statements.push(current.trim())
  return statements
}

function statementKeyword(sql: string): string {
  const keyword = sql.trim().match(/^([a-zA-Z]+)/)?.[1]?.toUpperCase() ?? ''
  return keyword === 'WITH' ? 'SELECT' : keyword
}

function findTables(sql: string, databaseName: string): Array<{ databaseName: string, tableName: string }> {
  const tables: Array<{ databaseName: string, tableName: string }> = []
  const tableRegex = /\b(?:FROM|JOIN)\s+([`"\w.]+)/gi
  for (const match of sql.matchAll(tableRegex)) {
    const raw = (match[1] ?? '').replace(/[`"]/g, '')
    const parts = raw.split('.').filter(Boolean)
    const tableName = parts.at(-1)
    const dbName = parts.length > 1 ? parts.at(-2) : databaseName
    if (tableName && dbName) {
      tables.push({ databaseName: dbName, tableName })
    }
  }
  return tables
}

function validateReadOnlyStatement(sql: string): string | null {
  const statements = splitSqlStatements(sql)
  if (statements.length !== 1) {
    return '当前仅支持执行单一 SQL 语句，如需执行多个查询，请在不同查询框中分别执行。'
  }
  const allowed = ['SELECT', 'SHOW', 'DESCRIBE', 'DESC', 'EXPLAIN']
  const keyword = statementKeyword(statements[0] ?? '')
  if (!allowed.includes(keyword)) {
    return 'SQL 查询模块仅支持查询类语句，不支持执行数据变更或数据库管理语句。'
  }
  return null
}

function validateTablePermission(compiledSql: string): string | null {
  const lower = compiledSql.toLowerCase()
  const deniedTables = Object.values(mockSqlTables)
    .flat()
    .filter((table) => !table.hasPermission)
    .map((table) => table.name.toLowerCase())
  const denied = deniedTables.find((tableName) => lower.includes(tableName))
  return denied ? `无权限访问表：${denied}` : null
}

function createHistoryForJob(job: SqlQueryJob): void {
  if (state.histories.some((history) => history.jobId === job.id)) {
    return
  }
  const connection = findConnection(job.connectionId)
  state.histories.unshift({
    id: makeId('his'),
    projectId: job.projectId,
    workbookId: job.workbookId,
    jobId: job.id,
    sqlSnapshot: job.rawSql,
    dataSourceType: job.dataSourceType,
    connectionId: job.connectionId,
    connectionName: connection?.name ?? '原数据连接不可用',
    databaseName: job.databaseName,
    status: job.status,
    resultRowCount: job.resultRowCount,
    resultExpired: job.resultExpired,
    errorMessage: job.errorMessage,
    executedBy: currentUserName,
    executedAt: job.finishedAt ?? nowText(),
    durationMs: job.durationMs,
  })
}

function finalizeJob(job: SqlQueryJob): SqlQueryJob {
  if (['success', 'failed', 'cancelled', 'timeout'].includes(job.status)) {
    return job
  }

  const shouldFail = job.compiledSql.toLowerCase().includes('runtime_error')
  job.finishedAt = nowText()
  job.durationMs = Math.max(1200, Date.now() - parseTextTime(job.startedAt ?? job.createdAt))

  if (shouldFail) {
    job.status = 'failed'
    job.errorCode = 'SQL_SYNTAX_ERROR'
    job.errorMessage = 'SQL 语法错误：第 2 行第 10 列附近存在异常'
    appendLog(job.id, 'ERROR', '执行引擎返回错误：SQL 语法错误')
  } else {
    const emptyResult = /limit\s+0/i.test(job.compiledSql) || /where\s+1\s*=\s*0/i.test(job.compiledSql)
    const largeResult = /large_result/i.test(job.compiledSql)
    const tableName = findTables(job.compiledSql, job.databaseName)[0]?.tableName ?? 'orders'
    const columns = columnsToResultColumns(getTableColumns(tableName))
    const rows = emptyResult ? [] : makeResultRows(128)
    job.status = 'success'
    job.resultRowCount = rows.length
    job.resultColumnCount = columns.length
    job.resultStorageId = `result_${job.id}`
    job.resultExpired = false
    job.resultSizeBytes = largeResult ? 1_610_612_736 : rows.length * columns.length * 128
    state.resultsByJobId[job.id] = { columns, rows }
    appendLog(job.id, 'INFO', `执行完成，结果落盘成功，共 ${rows.length} 行`)
    const workbook = state.workbooks.find((item) => item.id === job.workbookId)
    if (workbook) {
      workbook.lastExecutedAt = job.finishedAt
      workbook.updatedAt = job.finishedAt
    }
  }

  createHistoryForJob(job)
  writeState(state)
  return job
}

function refreshJobStatus(job: SqlQueryJob): SqlQueryJob {
  if (!job.id) {
    throw new Error('查询任务不存在')
  }
  if (['success', 'failed', 'cancelled', 'timeout'].includes(job.status)) {
    return job
  }
  const elapsed = Date.now() - parseTextTime(job.createdAt)
  const nextStatus: SqlQueryJobStatus =
    elapsed < 500 ? 'parsing' : elapsed < 1000 ? 'waiting' : elapsed < 2400 ? 'running' : 'success'
  if (nextStatus === 'success') {
    return finalizeJob(job)
  }
  if (job.status !== nextStatus) {
    job.status = nextStatus
    if (nextStatus === 'parsing') appendLog(job.id, 'INFO', '解析 SQL 与变量快照')
    if (nextStatus === 'waiting') appendLog(job.id, 'INFO', '等待执行资源')
    if (nextStatus === 'running') appendLog(job.id, 'INFO', '执行引擎开始运行')
    writeState(state)
  }
  return job
}

function sanitizeFileName(value: string): string {
  return value.trim().replace(/[\\/:\*\?"<>\|\s]+/g, '_')
}

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value)
  if (text.includes(',') || text.includes('"') || text.includes('\n') || text.includes('\r')) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

function toCsv(columns: SqlResultColumn[], rows: Array<Record<string, unknown>>): string {
  const header = columns.map((column) => escapeCsvCell(column.name)).join(',')
  const body = rows.map((row) => columns.map((column) => escapeCsvCell(row[column.name])).join(','))
  return [header, ...body].join('\n')
}

function sortRows(rows: Array<Record<string, unknown>>, column: string, order: 'asc' | 'desc'): Array<Record<string, unknown>> {
  return [...rows].sort((a, b) => {
    const left = a[column]
    const right = b[column]
    if (left === null || left === undefined) return 1
    if (right === null || right === undefined) return -1
    const leftValue = typeof left === 'object' ? JSON.stringify(left) : left
    const rightValue = typeof right === 'object' ? JSON.stringify(right) : right
    const result = typeof leftValue === 'number' && typeof rightValue === 'number'
      ? leftValue - rightValue
      : String(leftValue).localeCompare(String(rightValue), 'zh-Hans-CN')
    return order === 'asc' ? result : -result
  })
}

function applyResultQuery(
  columns: SqlResultColumn[],
  rows: Array<Record<string, unknown>>,
  params: SqlResultQueryParams,
): SqlResultPage {
  let queriedRows = [...rows]
  if (params.filterColumn && params.filterValue) {
    const keyword = params.filterValue
    queriedRows = queriedRows.filter((row) => {
      const value = row[params.filterColumn!]
      const text = typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')
      if (params.filterMode === 'equals') {
        return text === keyword
      }
      return text.includes(keyword)
    })
  }
  if (params.sortColumn && params.sortOrder) {
    queriedRows = sortRows(queriedRows, params.sortColumn, params.sortOrder)
  }
  const start = (params.page - 1) * params.pageSize
  return {
    columns,
    rows: queriedRows.slice(start, start + params.pageSize),
    page: params.page,
    pageSize: params.pageSize,
    totalRows: queriedRows.length,
  }
}

export const sqlQueryService = {
  supportedSourceTypes: supportedSqlSourceTypes,

  async getFeatureSwitch(): Promise<SqlQueryFeatureSwitch> {
    await delay(60)
    return clone(sqlQueryFeatureSwitch)
  },

  async getPermissions(): Promise<SqlQueryPermissionState> {
    await delay(60)
    return clone(sqlQueryPermission)
  },

  async listFolders(): Promise<SqlFolder[]> {
    await delay()
    return clone(activeFolders().sort((a, b) => a.sortIndex - b.sortIndex))
  },

  async createFolder(parentId: string | null, name: string): Promise<SqlFolder> {
    await delay()
    const realParentId = parentId ?? 'root'
    assertFolderName(realParentId, name)
    const folder: SqlFolder = {
      id: makeId('folder'),
      projectId,
      parentId: realParentId,
      name: name.trim(),
      sortIndex: activeFolders().length + 1,
      createdBy: currentUserId,
      createdAt: nowText(),
      updatedBy: currentUserId,
      updatedAt: nowText(),
    }
    state.folders.push(folder)
    writeState(state)
    return clone(folder)
  },

  async renameFolder(folderId: string, name: string): Promise<SqlFolder> {
    await delay()
    if (folderId === 'root') {
      throw new Error('根目录不可重命名')
    }
    const folder = state.folders.find((item) => item.id === folderId)
    if (!folder || folder.deletedAt) {
      throw new Error('文件夹不存在')
    }
    assertFolderName(folder.parentId, name, folderId)
    folder.name = name.trim()
    folder.updatedBy = currentUserId
    folder.updatedAt = nowText()
    writeState(state)
    return clone(folder)
  },

  async deleteFolder(folderId: string): Promise<void> {
    await delay()
    if (folderId === 'root') {
      throw new Error('根目录不可删除')
    }
    const ids = folderDescendantIds(folderId)
    const deletedAt = nowText()
    state.folders.forEach((folder) => {
      if (ids.includes(folder.id)) {
        folder.deletedAt = deletedAt
        folder.updatedAt = deletedAt
      }
    })
    state.workbooks.forEach((workbook) => {
      if (ids.includes(workbook.folderId ?? '')) {
        workbook.status = 'deleted'
        workbook.updatedAt = deletedAt
      }
    })
    writeState(state)
  },

  async listWorkbooks(): Promise<SqlWorkbook[]> {
    await delay()
    return clone(activeWorkbooks().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))
  },

  async getWorkbook(workbookId: string): Promise<SqlWorkbook> {
    await delay()
    const workbook = activeWorkbooks().find((item) => item.id === workbookId)
    if (!workbook) throw new Error('查询文件不存在或已删除')
    return clone(workbook)
  },

  async createWorkbook(payload: CreateWorkbookPayload): Promise<SqlWorkbook> {
    await delay()
    const folderId = payload.folderId ?? 'root'
    assertWorkbookName(folderId, payload.name)
    const workbook: SqlWorkbook = {
      id: makeId('wb'),
      projectId: payload.projectId,
      folderId,
      name: payload.name.trim(),
      description: payload.description,
      sqlContent: payload.sqlContent,
      dataSourceType: payload.dataSourceType,
      connectionId: payload.connectionId,
      databaseName: payload.databaseName,
      resourceId: payload.resourceId,
      variableConfigs: clone(payload.variableConfigs),
      ownerId: currentUserId,
      ownerName: currentUserName,
      status: 'saved',
      createdBy: currentUserId,
      createdAt: nowText(),
      updatedBy: currentUserId,
      updatedAt: nowText(),
    }
    state.workbooks.push(workbook)
    writeState(state)
    return clone(workbook)
  },

  async updateWorkbook(workbookId: string, payload: Partial<CreateWorkbookPayload>): Promise<SqlWorkbook> {
    await delay()
    const workbook = state.workbooks.find((item) => item.id === workbookId && item.status === 'saved')
    if (!workbook) throw new Error('查询文件不存在或已删除')
    const nextFolderId = payload.folderId ?? workbook.folderId ?? 'root'
    const nextName = payload.name ?? workbook.name
    assertWorkbookName(nextFolderId, nextName, workbookId)
    workbook.folderId = nextFolderId
    workbook.name = nextName.trim()
    workbook.description = payload.description ?? workbook.description
    workbook.sqlContent = payload.sqlContent ?? workbook.sqlContent
    workbook.dataSourceType = payload.dataSourceType ?? workbook.dataSourceType
    workbook.connectionId = payload.connectionId ?? workbook.connectionId
    workbook.databaseName = payload.databaseName ?? workbook.databaseName
    workbook.resourceId = payload.resourceId ?? workbook.resourceId
    workbook.variableConfigs = payload.variableConfigs ? clone(payload.variableConfigs) : workbook.variableConfigs
    workbook.updatedBy = currentUserId
    workbook.updatedAt = nowText()
    writeState(state)
    return clone(workbook)
  },

  async deleteWorkbook(workbookId: string): Promise<void> {
    await delay()
    const workbook = state.workbooks.find((item) => item.id === workbookId)
    if (!workbook) throw new Error('查询文件不存在')
    workbook.status = 'deleted'
    workbook.updatedAt = nowText()
    writeState(state)
  },

  async copyWorkbook(workbookId: string): Promise<SqlWorkbook> {
    await delay()
    const workbook = activeWorkbooks().find((item) => item.id === workbookId)
    if (!workbook) throw new Error('查询文件不存在')
    const baseName = `${workbook.name}_副本`
    let nextName = baseName
    let index = 2
    while (activeWorkbooks().some((item) => (item.folderId ?? null) === (workbook.folderId ?? null) && item.name === nextName)) {
      nextName = `${baseName}_${index}`
      index += 1
    }
    return this.createWorkbook({
      projectId: workbook.projectId,
      folderId: workbook.folderId,
      name: nextName,
      description: workbook.description,
      sqlContent: workbook.sqlContent,
      dataSourceType: workbook.dataSourceType,
      connectionId: workbook.connectionId,
      databaseName: workbook.databaseName,
      resourceId: workbook.resourceId,
      variableConfigs: workbook.variableConfigs,
    })
  },

  async moveWorkbook(workbookId: string, targetFolderId: string | null): Promise<SqlWorkbook> {
    return this.updateWorkbook(workbookId, { folderId: targetFolderId ?? 'root' })
  },

  async getConnections(type: SqlDataSourceType): Promise<SqlMetadataConnection[]> {
    await delay()
    return clone(mockSqlConnections.filter((connection) => connection.type === type && connection.permission === 'readable'))
  },

  async getDatabases(connectionId: string, keyword = ''): Promise<string[]> {
    await delay()
    const connection = findConnection(connectionId)
    if (!connection || connection.permission !== 'readable') {
      throw new Error('无该数据连接访问权限')
    }
    const normalized = normalizeText(keyword)
    return clone((mockSqlDatabases[connectionId] ?? []).filter((database) => !normalized || normalizeText(database).includes(normalized)))
  },

  async getTables(params: { connectionId: string, databaseName: string, keyword?: string, page?: number, pageSize?: number }): Promise<{ items: SqlMetadataTable[], total: number }> {
    await delay()
    const key = sourceTableKey(params.connectionId, params.databaseName)
    const normalized = normalizeText(params.keyword)
    const allItems = (mockSqlTables[key] ?? []).filter((table) => !normalized || normalizeText(table.name).includes(normalized))
    const page = params.page ?? 1
    const pageSize = params.pageSize ?? 50
    return { items: clone(allItems.slice((page - 1) * pageSize, page * pageSize)), total: allItems.length }
  },

  async getTableColumns(tableName: string): Promise<SqlTableColumn[]> {
    await delay()
    return getTableColumns(tableName)
  },

  async getTablePreview(tableName: string): Promise<SqlResultPage> {
    await delay()
    const columns = columnsToResultColumns(getTableColumns(tableName))
    return {
      columns,
      rows: makeResultRows(20),
      page: 1,
      pageSize: 20,
      totalRows: 20,
    }
  },

  async getTablePartitions(tableName: string): Promise<SqlTablePartition[]> {
    await delay()
    return clone(mockSqlPartitions[tableName] ?? [])
  },

  async getTableInfo(params: { tableName: string, databaseName: string, connectionId: string, tableType: 'table' | 'view', comment?: string }): Promise<SqlTableInfo> {
    await delay()
    const connection = findConnection(params.connectionId)
    return makeTableInfo(params.tableName, params.databaseName, connection?.name ?? '原数据连接不可用', params.tableType, params.comment)
  },

  makeInsertTableName(type: SqlDataSourceType, databaseName: string, tableName: string): string {
    return quoteTableName(type, databaseName, tableName)
  },

  async makeSelectTemplate(type: SqlDataSourceType, databaseName: string, tableName: string): Promise<string> {
    const columns = await this.getTableColumns(tableName)
    const selectedColumns = columns.slice(0, 20).map((column) => column.name)
    return `SELECT\n  ${selectedColumns.join(',\n  ')}\nFROM ${quoteTableName(type, databaseName, tableName)}\nLIMIT 100`
  },

  async formatSql(sql: string): Promise<string> {
    await delay()
    if (!sql.trim()) {
      throw new Error('SQL 内容不能为空')
    }
    let formatted = sql.trim().replace(/\s+/g, ' ')
    const replacements: Array<[RegExp, string]> = [
      [/\bselect\b/gi, 'SELECT'],
      [/\bfrom\b/gi, '\nFROM'],
      [/\bwhere\b/gi, '\nWHERE'],
      [/\band\b/gi, '\n  AND'],
      [/\bor\b/gi, '\n  OR'],
      [/\bgroup\s+by\b/gi, '\nGROUP BY'],
      [/\border\s+by\b/gi, '\nORDER BY'],
      [/\blimit\b/gi, '\nLIMIT'],
      [/\bwith\b/gi, 'WITH'],
    ]
    replacements.forEach(([pattern, replacement]) => {
      formatted = formatted.replace(pattern, replacement)
    })
    return formatted.replace(/,\s*/g, ',\n  ').replace(/\n\s*\n/g, '\n').trim()
  },

  async parseSql(payload: ExecuteSqlPayload): Promise<SqlParseResult> {
    await delay()
    if (!payload.rawSql.trim()) {
      return { valid: false, errors: [{ message: 'SQL 内容不能为空' }] }
    }
    if (!payload.dataSourceType || !payload.connectionId || !payload.databaseName) {
      return { valid: false, errors: [{ message: '请选择数据源类型、数据连接和数据库' }] }
    }
    const databases = mockSqlDatabases[payload.connectionId] ?? []
    if (!databases.includes(payload.databaseName)) {
      return { valid: false, errors: [{ message: '当前数据库不存在或无权限访问，请重新选择数据库。' }] }
    }
    let compiledSql = ''
    try {
      compiledSql = compileSql(payload.rawSql, payload.variableValues)
    } catch (error) {
      return { valid: false, errors: [{ message: error instanceof Error ? error.message : '变量校验失败' }] }
    }
    const statementError = validateReadOnlyStatement(compiledSql)
    if (statementError) {
      return { valid: false, errors: [{ line: 1, column: 1, message: statementError }] }
    }
    const permissionError = validateTablePermission(compiledSql)
    if (permissionError) {
      return { valid: false, errors: [{ line: 1, column: 1, message: permissionError }] }
    }
    if (/select\s+from/i.test(compiledSql) || /syntax_error/i.test(compiledSql)) {
      return { valid: false, errors: [{ line: 1, column: 8, message: 'SQL 语法错误：缺少字段或 FROM 关键字' }] }
    }
    const tables = findTables(compiledSql, payload.databaseName)
    const tableName = tables[0]?.tableName ?? 'orders'
    const columns = columnsToResultColumns(getTableColumns(tableName))
    return {
      valid: true,
      compiledSql,
      statementType: statementKeyword(compiledSql),
      columns,
      tables,
    }
  },

  async executeSql(payload: ExecuteSqlPayload): Promise<SqlQueryJob> {
    const parseResult = await this.parseSql(payload)
    if (!parseResult.valid) {
      throw new Error(parseResult.errors?.[0]?.message ?? 'SQL 解析失败')
    }
    const timestamp = nowText()
    const job: SqlQueryJob = {
      id: makeId('job'),
      projectId: payload.projectId,
      workbookId: payload.workbookId,
      temporaryQueryId: payload.temporaryQueryId,
      dataSourceType: payload.dataSourceType,
      connectionId: payload.connectionId,
      databaseName: payload.databaseName,
      resourceId: payload.resourceId,
      rawSql: payload.rawSql,
      compiledSql: parseResult.compiledSql ?? payload.rawSql,
      sqlHash: String(Math.abs((parseResult.compiledSql ?? payload.rawSql).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0))),
      variableValueSnapshot: clone(payload.variableValues),
      status: 'created',
      startedAt: timestamp,
      createdBy: currentUserId,
      createdAt: timestamp,
    }
    state.jobs.unshift(job)
    appendLog(job.id, 'INFO', '创建查询任务')
    writeState(state)
    return clone(job)
  },

  async getJob(jobId: string): Promise<SqlQueryJob> {
    await delay(80)
    const job = state.jobs.find((item) => item.id === jobId)
    if (!job) throw new Error('查询任务不存在')
    return clone(refreshJobStatus(job))
  },

  async cancelJob(jobId: string): Promise<SqlQueryJob> {
    await delay()
    const job = state.jobs.find((item) => item.id === jobId)
    if (!job) throw new Error('查询任务不存在')
    job.status = 'cancelled'
    job.finishedAt = nowText()
    job.durationMs = Date.now() - parseTextTime(job.startedAt)
    appendLog(jobId, 'WARN', '用户停止查询')
    createHistoryForJob(job)
    writeState(state)
    return clone(job)
  },

  async getResultPage(jobId: string, params: SqlResultQueryParams): Promise<SqlResultPage> {
    await delay()
    const sourceJob = state.jobs.find((item) => item.id === jobId)
    if (!sourceJob) {
      throw new Error('查询任务不存在')
    }
    const job = refreshJobStatus(sourceJob)
    if (job.status !== 'success') {
      throw new Error('查询尚未成功')
    }
    if (job.resultExpired) {
      throw new Error('查询结果已过期，请重新运行 SQL。')
    }
    const result = state.resultsByJobId[jobId]
    if (!result) {
      throw new Error('结果存储不存在')
    }
    return applyResultQuery(clone(result.columns), clone(result.rows), params)
  },

  async getLogs(jobId: string): Promise<SqlQueryLog[]> {
    await delay(80)
    return clone(state.logs.filter((log) => log.jobId === jobId).sort((a, b) => a.timestamp.localeCompare(b.timestamp)))
  },

  async listHistories(workbookId?: string): Promise<SqlQueryHistory[]> {
    await delay()
    return clone(state.histories.filter((history) => !workbookId || history.workbookId === workbookId))
  },

  async createDownloadTask(jobId: string, encoding: 'UTF-8' | 'GBK', workbookTitle: string): Promise<SqlResultDownloadTask> {
    await delay()
    const sourceJob = state.jobs.find((item) => item.id === jobId)
    if (!sourceJob) {
      throw new Error('查询任务不存在')
    }
    const job = refreshJobStatus(sourceJob)
    if (job.status !== 'success') {
      throw new Error('查询完成后才可下载')
    }
    if (job.resultExpired) {
      throw new Error('查询结果已过期，请重新运行 SQL。')
    }
    const result = state.resultsByJobId[jobId]
    if (!result) throw new Error('结果存储不存在')
    if (result.rows.length > 1_000_000) {
      throw new Error('查询结果超过下载上限，请缩小查询范围后重试。')
    }
    const csvText = toCsv(result.columns, result.rows)
    const fileName = `SQL查询结果_${sanitizeFileName(workbookTitle)}_${compactTimestamp()}_${jobId}.csv`
    const task: SqlResultDownloadTask = {
      id: makeId('download'),
      jobId,
      projectId: job.projectId,
      encoding,
      fileFormat: 'CSV',
      status: 'success',
      fileName,
      fileSizeBytes: new Blob([csvText]).size,
      downloadUrl: `local://${fileName}`,
      csvText,
      createdBy: currentUserId,
      createdAt: nowText(),
      expiredAt: nowText(new Date(Date.now() + 24 * 60 * 60 * 1000)),
    }
    state.downloads.unshift(task)
    appendLog(jobId, 'INFO', `创建 ${encoding} CSV 下载任务：${fileName}`)
    writeState(state)
    return clone(task)
  },

  async createVisualizationDataset(jobId: string): Promise<SqlTemporaryDataset> {
    await delay()
    cleanupExpiredTemporaryDatasets()
    const sourceJob = state.jobs.find((item) => item.id === jobId)
    if (!sourceJob) {
      throw new Error('查询任务不存在')
    }
    const job = refreshJobStatus(sourceJob)
    if (job.status !== 'success' || job.resultExpired) {
      throw new Error('查询成功且结果未过期后才可新建图表')
    }
    const result = state.resultsByJobId[jobId]
    if (!result) throw new Error('结果存储不存在')
    const dataset: SqlTemporaryDataset = {
      id: makeId('tmp_ds'),
      projectId: job.projectId,
      jobId,
      name: `SQL查询临时数据集_${compactTimestamp()}`,
      originType: 'SQL_QUERY_RESULT',
      schema: clone(result.columns),
      status: 'creating',
      expiredAt: nowText(new Date(Date.now() + 24 * 60 * 60 * 1000)),
      createdBy: currentUserId,
      createdAt: nowText(),
    }
    state.temporaryDatasets.unshift(dataset)
    writeState(state)
    return clone(dataset)
  },

  async getVisualizationDataset(datasetId: string): Promise<SqlTemporaryDataset> {
    await delay()
    cleanupExpiredTemporaryDatasets()
    const dataset = state.temporaryDatasets.find((item) => item.id === datasetId)
    if (!dataset) throw new Error('临时数据集不存在')
    const elapsed = Date.now() - parseTextTime(dataset.createdAt)
    if (dataset.status === 'creating' && elapsed > 1200) {
      dataset.status = 'ready'
      writeState(state)
    }
    return clone(dataset)
  },

  async cleanupTemporaryDatasets(): Promise<SqlTemporaryDatasetCleanupResult> {
    await delay()
    return cleanupExpiredTemporaryDatasets()
  },

  async createChart(payload: SaveChartPayload): Promise<SqlVisualChart> {
    await delay()
    const dataset = state.temporaryDatasets.find((item) => item.id === payload.temporaryDatasetId)
    if (!dataset) throw new Error('临时数据集不存在')
    if (dataset.status === 'expired') throw new Error('临时数据集已过期，请重新运行 SQL 后再保存图表')
    const sourceJob = state.jobs.find((item) => item.id === dataset.jobId)
    if (!sourceJob) throw new Error('源查询任务不存在')
    const job = refreshJobStatus(sourceJob)
    if (state.charts.some((chart) => chart.projectId === payload.targetProjectId && chart.chartName === payload.chartName.trim())) {
      throw new Error('目标项目下已存在同名图表')
    }
    if (state.charts.some((chart) => chart.projectId === payload.targetProjectId && chart.datasetName === payload.datasetName.trim())) {
      throw new Error('目标项目下已存在同名数据集')
    }
    const chart: SqlVisualChart = {
      id: makeId('chart'),
      projectId: payload.targetProjectId,
      temporaryDatasetId: dataset.id,
      datasetId: makeId('dataset'),
      chartName: payload.chartName.trim(),
      datasetName: payload.datasetName.trim(),
      description: payload.description,
      sourceSqlJobId: job.id,
      sqlSnapshot: job.rawSql,
      connectionId: job.connectionId,
      databaseName: job.databaseName,
      saved: true,
      createdAt: nowText(),
    }
    dataset.status = 'converted'
    state.charts.unshift(chart)
    writeState(state)
    return clone(chart)
  },

  async getChart(chartId: string): Promise<SqlVisualChart> {
    await delay()
    const chart = state.charts.find((item) => item.id === chartId)
    if (!chart) throw new Error('图表不存在')
    return clone(chart)
  },

  async getChartByTemporaryDataset(temporaryDatasetId: string): Promise<SqlVisualChart | null> {
    await delay()
    const chart = state.charts.find((item) => item.temporaryDatasetId === temporaryDatasetId && item.saved)
    return chart ? clone(chart) : null
  },

  async getJobResultSnapshot(jobId: string): Promise<{ job: SqlQueryJob, result: SqlResultPage }> {
    const job = await this.getJob(jobId)
    const result = await this.getResultPage(jobId, { page: 1, pageSize: 20 })
    return { job, result }
  },

  async createRoutine(payload: CreateRoutinePayload): Promise<SqlRoutineTask> {
    await delay()
    const chart = state.charts.find((item) => item.id === payload.chartId && item.saved)
    if (!chart) {
      throw new Error('只有已保存的 SQL 查询图表可以配置例行')
    }
    const sourceJob = state.jobs.find((item) => item.id === chart.sourceSqlJobId)
    if (!sourceJob) throw new Error('源查询任务不存在')
    const job = refreshJobStatus(sourceJob)
    if ((job.resultSizeBytes ?? 0) > 1_073_741_824) {
      throw new Error('当前 SQL 查询结果超过 1GB 上限，无法创建例行')
    }
    if (payload.syncType === 'partition_overwrite' && !payload.partitionField) {
      throw new Error('分区覆盖需要选择可作为分区的日期字段')
    }
    if (payload.scheduleType === 'cron' && !/^(\S+\s+){5}\S+$/.test(payload.scheduleCron ?? '')) {
      throw new Error('Cron 表达式必须符合 Quartz Cron 格式')
    }
    if (payload.scheduleType === 'cron') {
      const minuteField = (payload.scheduleCron ?? '').split(/\s+/)[1] ?? ''
      const interval = minuteField.match(/\/(\d+)/)?.[1]
      if (interval && Number(interval) < 30) {
        throw new Error('Cron 最小执行间隔不能小于 30 分钟')
      }
    }
    const routine: SqlRoutineTask = {
      id: makeId('routine'),
      projectId: payload.projectId,
      chartId: chart.id,
      datasetId: payload.datasetId,
      sourceSqlJobId: chart.sourceSqlJobId,
      sqlSnapshot: chart.sqlSnapshot,
      connectionId: chart.connectionId,
      databaseName: chart.databaseName,
      syncType: payload.syncType,
      partitionField: payload.partitionField,
      scheduleType: payload.scheduleType,
      scheduleCron: payload.scheduleCron,
      scheduleStartAt: payload.scheduleStartAt,
      executeTime: payload.executeTime,
      notifyEnabled: payload.notifyEnabled,
      notifyUserIds: payload.notifyUserIds,
      enabled: true,
      maxResultSizeBytes: 1_073_741_824,
      status: 'enabled',
      createdBy: currentUserId,
      createdAt: nowText(),
      updatedAt: nowText(),
    }
    state.routines.unshift(routine)
    state.routineRuns.unshift({
      id: makeId('routine_run'),
      routineId: routine.id,
      status: 'success',
      startedAt: nowText(),
      finishedAt: nowText(),
      durationMs: 2100,
      resultSizeBytes: job.resultSizeBytes,
      resultRowCount: job.resultRowCount,
      logs: ['创建 SQL 例行任务', '读取保存图表时生成的数据集 SQL 快照', '首次调度校验成功'],
    })
    writeState(state)
    return clone(routine)
  },

  async listRoutines(chartId: string): Promise<SqlRoutineTask[]> {
    await delay()
    return clone(state.routines.filter((routine) => routine.chartId === chartId && routine.status !== 'deleted'))
  },

  async listRoutineRuns(routineId: string): Promise<SqlRoutineRunRecord[]> {
    await delay()
    return clone(state.routineRuns.filter((run) => run.routineId === routineId))
  },

  async pauseRoutine(routineId: string): Promise<void> {
    await delay()
    const routine = state.routines.find((item) => item.id === routineId)
    if (!routine) throw new Error('例行任务不存在')
    routine.status = 'paused'
    routine.enabled = false
    routine.updatedAt = nowText()
    writeState(state)
  },

  async resumeRoutine(routineId: string): Promise<void> {
    await delay()
    const routine = state.routines.find((item) => item.id === routineId)
    if (!routine) throw new Error('例行任务不存在')
    routine.status = 'enabled'
    routine.enabled = true
    routine.updatedAt = nowText()
    writeState(state)
  },

  async deleteRoutine(routineId: string): Promise<void> {
    await delay()
    const routine = state.routines.find((item) => item.id === routineId)
    if (!routine) throw new Error('例行任务不存在')
    routine.status = 'deleted'
    routine.enabled = false
    routine.updatedAt = nowText()
    writeState(state)
  },

  async runRoutineOnce(routineId: string): Promise<SqlRoutineRunRecord> {
    await delay()
    const routine = state.routines.find((item) => item.id === routineId && item.status === 'enabled')
    if (!routine) throw new Error('仅启用状态可手动运行一次')
    const sourceJob = state.jobs.find((item) => item.id === routine.sourceSqlJobId)
    if (!sourceJob) throw new Error('源查询任务不存在')
    const job = refreshJobStatus(sourceJob)
    const overLimit = (job.resultSizeBytes ?? 0) > 1_073_741_824
    const run: SqlRoutineRunRecord = {
      id: makeId('routine_run'),
      routineId,
      status: overLimit ? 'failed' : 'success',
      startedAt: nowText(),
      finishedAt: nowText(),
      durationMs: 2300,
      resultSizeBytes: job.resultSizeBytes,
      resultRowCount: overLimit ? undefined : job.resultRowCount,
      errorMessage: overLimit ? '本次 SQL 例行结果超过 1GB 上限，请缩小查询分区或日期范围后重试。' : undefined,
      logs: overLimit
        ? ['读取例行 SQL 快照', '执行结果超过 1GB 上限', '保留旧数据集数据，本次更新失败']
        : ['读取例行 SQL 快照', '执行 SQL 成功', '覆盖目标数据集完成'],
    }
    state.routineRuns.unshift(run)
    writeState(state)
    return clone(run)
  },
}
