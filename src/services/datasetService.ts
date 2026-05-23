import {
  makePreviewResult,
  mockDatasetFolders,
  mockDatasetModels,
  mockDatasets,
  mockLineageEdges,
  mockLineageNodes,
  mockMaskRules,
  mockPermissionRules,
  mockSourceTables,
  mockSyncConfigs,
  mockSyncTasks,
} from '@/mock/datasets'
import type {
  CurrentUserContext,
  DataMaskRule,
  Dataset,
  DatasetField,
  DatasetDraftPayload,
  DatasetFolder,
  DatasetLineageEdge,
  DatasetLineageNode,
  DatasetListFilter,
  DatasetPreviewRow,
  DatasetSensitivityLevel,
  DatasetModel,
  DatasetPermissionRule,
  DesensitizationOperationLog,
  MaskingRuleConfig,
  MaskingScene,
  PreviewResult,
  SourceField,
  SourceTableItem,
  SqlValidationResult,
  SyncConfig,
  SyncTask,
} from '@/types/dataset'

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

let datasets = clone(mockDatasets)
const folders = clone(mockDatasetFolders)
const models = clone(mockDatasetModels)
const syncConfigs = clone(mockSyncConfigs)
const syncTasks = clone(mockSyncTasks)
const permissionRules = clone(mockPermissionRules)
const maskRules = clone(mockMaskRules)
const desensitizationLogs: DesensitizationOperationLog[] = []

const nowText = (): string => '2026-05-23 11:30:00'

const demoCurrentUser: CurrentUserContext = {
  userId: 'current_user',
  userGroupIds: ['team_ops', 'team_operation', 'team_viewer'],
  roleIds: ['role_dataset_viewer', 'role_dashboard_viewer'],
}

const defaultMaskingScenes: MaskingScene[] = [
  'preview',
  'visual_query',
  'dashboard',
  'download',
  'subscription',
  'monitor',
  'embed',
  'saved_analysis',
]

const fieldKeyAliases: Record<string, string[]> = {
  user_id: ['user_id', 'userId'],
  coin_balance_level: ['coin_balance_level', 'coinBalanceLevel', 'groupName', 'dimensionValue'],
  revenue: ['revenue', 'adRevenue'],
  ad_position: ['ad_position', 'adPosition'],
  game_type: ['game_type', 'gameType'],
  payment_status: ['payment_status', 'paymentStatus'],
  pay_amount: ['pay_amount', 'payAmount'],
  ticket_payload: ['ticket_payload', 'ticketPayload'],
}

function normalizeText(value: string | undefined): string {
  return String(value ?? '').trim().toLowerCase()
}

function currentDesensitizationVersion(dataset: Dataset): number {
  return dataset.desensitizationVersion ?? 1
}

function assertDesensitizationVersion(dataset: Dataset, expectedVersion?: number): void {
  if (expectedVersion !== undefined && expectedVersion !== currentDesensitizationVersion(dataset)) {
    throw new Error('脱敏配置已被他人修改，请刷新后重新编辑')
  }
}

function appendDesensitizationLog(
  datasetId: string,
  operationType: DesensitizationOperationLog['operationType'],
  beforeValue?: unknown,
  afterValue?: unknown,
): void {
  desensitizationLogs.unshift({
    id: `mask_audit_${Date.now()}_${desensitizationLogs.length}`,
    datasetId,
    operatorId: demoCurrentUser.userId,
    operatorName: 'Chaoyang Xu',
    operationType,
    beforeValue,
    afterValue,
    operatedAt: nowText(),
  })
}

function touchDesensitizationConfig(
  dataset: Dataset,
  operationType: DesensitizationOperationLog['operationType'],
  beforeValue?: unknown,
  afterValue?: unknown,
): void {
  dataset.desensitizationVersion = currentDesensitizationVersion(dataset) + 1
  dataset.updatedAt = nowText()
  appendDesensitizationLog(dataset.id, operationType, beforeValue, afterValue)
}

function getRulesForDataset(datasetId: string): DataMaskRule[] {
  return maskRules.filter((rule) => rule.datasetId === datasetId)
}

export function shouldMaskUser(
  scope: Pick<DataMaskRule, 'scopeMode' | 'scopeMembers'>,
  currentUser: CurrentUserContext = demoCurrentUser,
): boolean {
  const matched = (scope.scopeMembers ?? []).some((member) => {
    if (member.memberType === 'user') {
      return member.memberId === currentUser.userId
    }
    if (member.memberType === 'team') {
      return currentUser.userGroupIds.includes(member.memberId)
    }
    if (member.memberType === 'role') {
      return currentUser.roleIds.includes(member.memberId)
    }
    return false
  })

  return scope.scopeMode === 'members_masked_others_unmasked' ? matched : !matched
}

function hasScene(rule: DataMaskRule, scene: MaskingScene): boolean {
  return (rule.scenes?.length ? rule.scenes : defaultMaskingScenes).includes(scene)
}

function isIntegerLike(value: unknown): boolean {
  return Number.isInteger(Number(value))
}

function validateMaskRule(rule: DataMaskRule, fields: DatasetField[] = []): string {
  if (!rule.fieldName.trim()) {
    return '请选择需要脱敏的字段'
  }
  if (fields.length > 0 && !fields.some((field) => field.name === rule.fieldName || field.id === rule.fieldId)) {
    return `字段「${rule.fieldName}」已不存在，请删除该脱敏配置`
  }
  if (!rule.ruleType) {
    return '请选择脱敏规则'
  }
  if (!rule.scopeMode) {
    return '请选择生效范围模式'
  }
  if (!rule.scenes?.length) {
    return '请至少选择一个脱敏生效场景'
  }

  const config = rule.ruleConfig
  if (!config) {
    return '请配置脱敏规则参数'
  }
  if (!config.replacementChar || config.replacementChar.length !== 1) {
    return '替换符必须为 1 个字符'
  }
  if (rule.ruleType === 'custom_middle') {
    if (!isIntegerLike(config.keepPrefixLength) || Number(config.keepPrefixLength) < 0) {
      return '保留前缀位数必须为大于等于 0 的整数'
    }
    if (!isIntegerLike(config.keepSuffixLength) || Number(config.keepSuffixLength) < 0) {
      return '保留后缀位数必须为大于等于 0 的整数'
    }
  }
  if (rule.ruleType === 'custom_head_tail') {
    if (!isIntegerLike(config.keepStartIndex) || Number(config.keepStartIndex) < 1) {
      return '起始位次必须为大于等于 1 的整数'
    }
    if (!isIntegerLike(config.keepEndIndex) || Number(config.keepEndIndex) < 1) {
      return '结束位次必须为大于等于 1 的整数'
    }
    if (Number(config.keepStartIndex) > Number(config.keepEndIndex)) {
      return '起始位次不能大于结束位次'
    }
  }
  if ((rule.ruleType === 'custom_before_special_char' || rule.ruleType === 'custom_after_special_char') && !config.specialChar) {
    return '请输入特殊字符'
  }
  return ''
}

function isMaskRuleComplete(rule: DataMaskRule, fields: DatasetField[] = []): boolean {
  return Boolean(rule.enabled && !validateMaskRule(rule, fields))
}

export function calculateSensitivityStatus(isSensitive: boolean, maskingFields: DataMaskRule[]): DatasetSensitivityLevel {
  if (!isSensitive) return 'non_sensitive'
  if (maskingFields.length === 0) return 'sensitive_unmasked'
  return maskingFields.every((rule) => isMaskRuleComplete(rule)) ? 'sensitive_masked' : 'sensitive_unmasked'
}

function recalculateDatasetSensitivity(datasetId: string, options?: { forceSensitive?: boolean }): Dataset | undefined {
  const dataset = datasets.find((item) => item.id === datasetId)
  if (!dataset) return undefined
  const current = dataset.sensitivityLevel ?? 'unclassified'
  if (!options?.forceSensitive && (current === 'non_sensitive' || current === 'unclassified')) {
    return dataset
  }
  dataset.sensitivityLevel = calculateSensitivityStatus(true, getRulesForDataset(datasetId))
  dataset.updatedAt = nowText()
  return dataset
}

function repeatMask(text: string, replacementChar: string): string {
  return replacementChar.repeat(text.length)
}

export function maskDatasetValue(value: unknown, rule: Pick<DataMaskRule, 'ruleType' | 'ruleConfig'>): unknown {
  if (value === null || value === undefined) return value
  const text = String(value)
  if (!text) return text

  const config: MaskingRuleConfig = rule.ruleConfig ?? { replacementChar: '*' }
  const replacement = config.replacementChar || '*'

  if (rule.ruleType === 'preset_name') {
    return `${text.slice(0, 1)}${replacement.repeat(Math.max(text.length - 1, 0))}`
  }
  if (rule.ruleType === 'preset_email') {
    const atIndex = text.indexOf('@')
    if (atIndex < 0) return repeatMask(text, replacement)
    return `${replacement.repeat(atIndex)}${text.slice(atIndex)}`
  }
  if (rule.ruleType === 'preset_contact' || rule.ruleType === 'preset_china_id_general' || rule.ruleType === 'preset_china_citizen_id') {
    return text.length <= 3 ? repeatMask(text, replacement) : `${text.slice(0, 3)}${replacement.repeat(text.length - 3)}`
  }
  if (rule.ruleType === 'preset_full_mask') {
    return repeatMask(text, replacement)
  }
  if (rule.ruleType === 'custom_head_tail') {
    const keepStart = Math.max(Number(config.keepStartIndex ?? 1), 1)
    const keepEnd = Math.max(Number(config.keepEndIndex ?? keepStart), keepStart)
    const end = Math.min(keepEnd, text.length)
    return text
      .split('')
      .map((char, index) => {
        const position = index + 1
        return position >= keepStart && position <= end ? char : replacement
      })
      .join('')
  }
  if (rule.ruleType === 'custom_before_special_char' || rule.ruleType === 'custom_after_special_char') {
    const specialChar = config.specialChar || '@'
    const index = text.indexOf(specialChar)
    if (index < 0) return repeatMask(text, replacement)
    const before = text.slice(0, index)
    const after = text.slice(index + specialChar.length)
    return rule.ruleType === 'custom_before_special_char'
      ? `${replacement.repeat(before.length)}${specialChar}${after}`
      : `${before}${specialChar}${replacement.repeat(after.length)}`
  }

  const prefix = Math.max(Number(config.keepPrefixLength ?? 0), 0)
  const suffix = Math.max(Number(config.keepSuffixLength ?? 0), 0)
  if (prefix + suffix >= text.length) return text
  return `${text.slice(0, prefix)}${replacement.repeat(text.length - prefix - suffix)}${text.slice(text.length - suffix)}`
}

function snakeToCamel(value: string): string {
  return value.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase())
}

function keysForMaskRule(rule: Pick<DataMaskRule, 'fieldName'>): string[] {
  return Array.from(new Set([rule.fieldName, snakeToCamel(rule.fieldName), ...(fieldKeyAliases[rule.fieldName] ?? [])]))
}

function runtimeMaskRules(datasetId: string, scene: MaskingScene, currentUser: CurrentUserContext): DataMaskRule[] {
  const dataset = datasets.find((item) => item.id === datasetId)
  if (!dataset || dataset.sensitivityLevel === 'non_sensitive' || dataset.sensitivityLevel === 'unclassified') {
    return []
  }
  const fields = getOrCreateModel(datasetId).outputFields
  return getRulesForDataset(datasetId).filter(
    (rule) => rule.enabled && hasScene(rule, scene) && isMaskRuleComplete(rule, fields) && shouldMaskUser(rule, currentUser),
  )
}

function applyRuntimeMaskingToRows<T extends object>(
  datasetId: string,
  rows: T[],
  scene: MaskingScene,
  currentUser: CurrentUserContext = demoCurrentUser,
): T[] {
  const rules = runtimeMaskRules(datasetId, scene, currentUser)
  if (!rules.length) return clone(rows)
  return rows.map((row) => {
    const nextRow = { ...row } as Record<string, unknown>
    rules.forEach((rule) => {
      keysForMaskRule(rule).forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(nextRow, key)) {
          nextRow[key] = maskDatasetValue(nextRow[key], rule)
        }
      })
    })
    return nextRow as T
  })
}

function maskFieldDisplayValue(
  datasetId: string,
  fieldName: string,
  value: unknown,
  scene: MaskingScene,
  currentUser: CurrentUserContext = demoCurrentUser,
): unknown {
  const rule = runtimeMaskRules(datasetId, scene, currentUser).find((item) => item.fieldName === fieldName)
  return rule ? maskDatasetValue(value, rule) : value
}

function fieldToDatasetField(field: SourceField, nodeId: string): DatasetField {
  const isNumber = ['number', 'integer', 'decimal'].includes(field.fieldType)
  const isTime = ['date', 'datetime'].includes(field.fieldType)
  return {
    id: `out_${nodeId}_${field.name}`,
    name: field.name,
    displayName: field.displayName,
    fieldType: field.fieldType,
    semanticType: field.isPrimaryKey ? 'id' : isTime ? 'time' : isNumber ? 'measure' : 'dimension',
    aggregation: isNumber ? 'sum' : field.isPrimaryKey ? 'count_distinct' : 'none',
    visible: true,
    sortable: true,
    isPrimaryKey: field.isPrimaryKey,
    isPartitionField: field.isPartitionField,
    sourceNodeId: nodeId,
    sourceFieldName: field.name,
  }
}

function sourceTableToNode(source: SourceTableItem, index: number): DatasetModel['nodes'][number] {
  return {
    id: `node_${source.id}_${Date.now()}`,
    type: source.tableType === 'topic' || source.tableType === 'file' ? 'table' : 'table',
    alias: source.displayName,
    sourceMode: source.sourceMode,
    connectionId: source.connectionId,
    connectionName: source.connectionName,
    databaseName: source.databaseName,
    schemaName: source.schemaName,
    tableName: source.tableName,
    selectedFields: clone(source.fields),
    preFilters: [],
    position: { x: 80 + index * 280, y: 90 },
    status: source.hasPermission ? 'normal' : 'permission_denied',
  }
}

function datasetToNode(sourceDataset: Dataset, index: number): DatasetModel['nodes'][number] {
  const sourceModel = getOrCreateModel(sourceDataset.id)
  const selectedFields: SourceField[] = sourceModel.outputFields.map((field) => ({
    id: field.id,
    name: field.name,
    displayName: field.displayName,
    fieldType: field.fieldType,
    description: field.description,
    isPrimaryKey: field.semanticType === 'id' || field.isPrimaryKey,
    isPartitionField: field.isPartitionField,
  }))

  return {
    id: `node_${sourceDataset.id}_${Date.now()}_${index}`,
    type: sourceDataset.sourceMode === 'theme' ? 'theme_dataset' : 'dataset',
    alias: sourceDataset.name,
    sourceMode: sourceDataset.sourceMode,
    connectionId: sourceDataset.connectionId,
    connectionName: sourceDataset.connectionName,
    databaseName: sourceDataset.databaseName,
    tableName: sourceDataset.tableName,
    datasetId: sourceDataset.id,
    selectedFields,
    preFilters: [],
    position: { x: 80 + index * 280, y: 90 },
    status: sourceDataset.permission === 'none' ? 'permission_denied' : 'normal',
  }
}

function createDefaultSyncConfig(datasetId: string): SyncConfig {
  return {
    datasetId,
    enabled: true,
    frequency: 'daily',
    scheduleText: '每天 08:00',
    dependencyDatasetIds: [],
    dependencyStrategy: 'none',
    alertOnFailure: true,
    alertReceivers: ['Chaoyang Xu'],
    performance: { parallelism: 4, memoryGb: 8, timeoutMinutes: 60 },
    advancedParams: {
      write_mode: 'overwrite_partition',
      retry_times: 2,
    },
  }
}

function firstSourceTable(): SourceTableItem {
  const source = mockSourceTables[0]
  if (!source) {
    throw new Error('没有可用的数据来源')
  }
  return source
}

function getOrCreateModel(datasetId: string): DatasetModel {
  if (models[datasetId]) {
    return models[datasetId]
  }
  const dataset = datasets.find((item) => item.id === datasetId)
  const fallbackSource = firstSourceTable()
  const node = sourceTableToNode(fallbackSource, 0)
  const model: DatasetModel = {
    datasetId,
    nodes: [node],
    edges: [],
    outputFields: node.selectedFields.map((field) => fieldToDatasetField(field, node.id)),
    modelFilter: { logic: 'AND', conditions: [] },
    previewLimit: 100,
    version: dataset?.status === 'draft' ? 1 : 2,
  }
  models[datasetId] = model
  return model
}

function isSensitiveCandidate(field: DatasetField): boolean {
  const identityKeywords = [
    'id',
    'uid',
    'user',
    'phone',
    'mobile',
    'email',
    'contact',
    'openid',
    'unionid',
    'device',
    'oaid',
    'amount',
    'revenue',
    'coin',
    'profile',
    'payload',
  ]
  const text = `${field.name} ${field.displayName} ${field.semanticType}`.toLowerCase()
  return field.semanticType === 'id' || field.fieldType === 'json' || identityKeywords.some((keyword) => text.includes(keyword))
}

function demoMaskSample(field: DatasetField): string {
  const text = `${field.name} ${field.displayName}`.toLowerCase()
  if (text.includes('phone') || text.includes('mobile')) return '13812345678'
  if (text.includes('email')) return 'mike.chen@datacorp.com'
  if (text.includes('device') || text.includes('oaid')) return 'oaid_f3c1_9a20'
  if (text.includes('open') || text.includes('union')) return 'union_928cc2'
  if (text.includes('amount') || text.includes('revenue')) return '426.58'
  if (field.fieldType === 'json') return '{"phone":"13812345678","channel":"natural"}'
  return field.semanticType === 'id' ? 'uid_839201' : 'low_coin'
}

function demoMaskRuleForField(datasetId: string, field: DatasetField, index: number): DataMaskRule {
  const text = `${field.name} ${field.displayName}`.toLowerCase()
  const isJson = field.fieldType === 'json'
  const isMoney = text.includes('amount') || text.includes('revenue')
  const isContact = text.includes('phone') || text.includes('mobile')
  const isEmail = text.includes('email')
  const ruleType: NonNullable<DataMaskRule['ruleType']> = isJson
    ? 'preset_full_mask'
    : isContact
      ? 'preset_contact'
      : isEmail
        ? 'preset_email'
        : isMoney
          ? 'custom_head_tail'
          : 'custom_middle'
  const method: DataMaskRule['method'] = ruleType === 'preset_full_mask' ? 'replace' : isMoney ? 'rounding' : 'partial'
  const ruleConfig: NonNullable<DataMaskRule['ruleConfig']> = isJson
    ? { replacementChar: '*', fixedReplacement: '{"masked":true}' }
    : isMoney
      ? { replacementChar: '*', keepStartIndex: 1, keepEndIndex: 3 }
      : { replacementChar: '*', keepPrefixLength: 4, keepSuffixLength: 2 }
  const sample = demoMaskSample(field)
  return {
    id: `mask_${datasetId}_${field.name}_${index}`,
    datasetId,
    fieldId: field.id,
    fieldName: field.name,
    fieldDisplayName: field.displayName,
    fieldType: field.fieldType,
    semanticType: field.semanticType,
    method,
    ruleType,
    ruleConfig,
    scopeMode: 'members_unmasked_others_masked',
    scopeMembers: [{ memberType: 'team', memberId: 'team_ops_admin', memberName: '智能运营组' }],
    scenes: ['preview', 'visual_query', 'dashboard', 'download', 'saved_analysis'],
    restrictedCapabilities: ['alias_bypass', 'group_by', 'format', 'calculated_field', 'download_original'],
    example: `${sample} → ${ruleType === 'preset_full_mask' ? ruleConfig.fixedReplacement : '已脱敏'}`,
    enabled: true,
    createdBy: '系统推荐',
    createdAt: nowText(),
    updatedBy: '系统推荐',
    updatedAt: nowText(),
  }
}

function ensureDemoMaskRules(datasetId: string): DataMaskRule[] {
  const existingRules = maskRules.filter((rule) => rule.datasetId === datasetId)
  if (existingRules.length) return existingRules

  const model = getOrCreateModel(datasetId)
  const candidates = model.outputFields.filter(isSensitiveCandidate)
  const fields = (candidates.length ? candidates : model.outputFields).slice(0, 3)
  if (!fields.length) return []

  const generatedRules = fields.map((field, index) => demoMaskRuleForField(datasetId, field, index + 1))
  maskRules.push(...generatedRules)

  const dataset = datasets.find((item) => item.id === datasetId)
  if (dataset && dataset.sensitivityLevel !== 'non_sensitive') {
    dataset.sensitivityLevel = 'sensitive_masked'
  }

  return generatedRules
}

function downstreamForDataset(datasetId: string): DatasetLineageNode[] {
  const common: DatasetLineageNode[] = [
    { id: `${datasetId}_detail_page`, name: '数据集详情与权限管理', nodeType: 'analysis', level: 'downstream' },
  ]
  const map: Record<string, DatasetLineageNode[]> = {
    ds_ad_watch_detail: [
      { id: 'analysis_event', name: '事件分析：广告观看下降', nodeType: 'analysis', level: 'downstream' },
      { id: 'dashboard_ads', name: '广告监控看板', nodeType: 'dashboard', level: 'downstream' },
      { id: 'ds_low_coin_behavior_assoc', name: '低金币用户行为关联数据集', nodeType: 'dataset', level: 'downstream' },
    ],
    ds_low_coin_behavior_assoc: [
      { id: 'analysis_ltv', name: 'LTV 分析：低金币用户价值', nodeType: 'analysis', level: 'downstream' },
      { id: 'dashboard_ops', name: '智能运营复盘看板', nodeType: 'dashboard', level: 'downstream' },
    ],
    ds_payment_success: [
      { id: 'analysis_ltv_payment', name: 'LTV 分析：付费用户价值', nodeType: 'analysis', level: 'downstream' },
      { id: 'analysis_attribution_payment', name: '归因分析：付费转化贡献', nodeType: 'analysis', level: 'downstream' },
    ],
    ds_realtime_behavior_las: [
      { id: 'analysis_heatmap_las', name: '热力图分析：实时点击', nodeType: 'analysis', level: 'downstream' },
      { id: 'analysis_path_las', name: '路径分析：实时行为路径', nodeType: 'analysis', level: 'downstream' },
    ],
    ds_ad_cost_daily_file: [
      { id: 'analysis_roi_file', name: '归因分析：渠道 ROI', nodeType: 'analysis', level: 'downstream' },
    ],
    ds_campaign_roi_sql: [
      { id: 'dashboard_roi_sql', name: '投放 ROI 看板', nodeType: 'dashboard', level: 'downstream' },
    ],
    ds_service_ticket_json: [
      { id: 'analysis_ticket_risk', name: '用户洞察：投诉风险分析', nodeType: 'analysis', level: 'downstream' },
    ],
  }
  return map[datasetId] ?? common
}

function buildDatasetLineage(datasetId?: string): { nodes: DatasetLineageNode[]; edges: DatasetLineageEdge[] } {
  if (!datasetId) {
    return { nodes: clone(mockLineageNodes), edges: clone(mockLineageEdges) }
  }
  const dataset = datasets.find((item) => item.id === datasetId)
  if (!dataset) {
    return { nodes: clone(mockLineageNodes), edges: clone(mockLineageEdges) }
  }
  const model = getOrCreateModel(datasetId)
  const connectionNodes = model.nodes
    .filter((node) => Boolean(node.connectionId))
    .map<DatasetLineageNode>((node) => ({
      id: node.connectionId ?? `${node.id}_connection`,
      name: node.connectionName ?? '未知连接',
      nodeType: 'connection',
      level: 'upstream',
    }))
  const tableNodes = model.nodes.map<DatasetLineageNode>((node) => ({
    id: node.datasetId ?? node.tableName ?? node.id,
    name: node.alias,
    nodeType: node.datasetId ? 'dataset' : 'table',
    level: 'upstream',
  }))
  const currentNode: DatasetLineageNode = {
    id: dataset.id,
    name: dataset.name,
    nodeType: 'dataset',
    level: 'current',
  }
  const downstreamNodes = downstreamForDataset(datasetId)
  const uniqueNodes = [...connectionNodes, ...tableNodes, currentNode, ...downstreamNodes].filter(
    (node, index, list) => list.findIndex((item) => item.id === node.id) === index,
  )
  const upstreamEdges = model.nodes.flatMap<DatasetLineageEdge>((node) => {
    const sourceId = node.datasetId ?? node.tableName ?? node.id
    const edges: DatasetLineageEdge[] = [
      {
        id: `lineage_${node.id}_dataset`,
        source: sourceId,
        target: dataset.id,
        relation: node.type === 'custom_sql' ? 'SQL 建模' : node.sourceMode === 'direct' ? '直连读取' : '抽取建模',
      },
    ]
    if (node.connectionId) {
      edges.unshift({
        id: `lineage_${node.connectionId}_${sourceId}`,
        source: node.connectionId,
        target: sourceId,
        relation: '读取连接',
      })
    }
    return edges
  })
  const downstreamEdges = downstreamNodes.map<DatasetLineageEdge>((node) => ({
    id: `lineage_${dataset.id}_${node.id}`,
    source: dataset.id,
    target: node.id,
    relation: node.nodeType === 'dashboard' ? '看板组件' : node.nodeType === 'dataset' ? '下游建模' : '查询分析',
  }))
  return { nodes: uniqueNodes, edges: [...upstreamEdges, ...downstreamEdges] }
}

function matchesDataset(dataset: Dataset, filter?: DatasetListFilter): boolean {
  if (!filter) {
    return true
  }
  if (filter.section && dataset.section !== filter.section) {
    return false
  }
  if (filter.datasetType && filter.datasetType !== 'all' && dataset.datasetType !== filter.datasetType) {
    return false
  }
  if (filter.status && filter.status !== 'all' && dataset.status !== filter.status) {
    return false
  }
  if (filter.owner && filter.owner !== 'all' && dataset.owner !== filter.owner) {
    return false
  }
  const keyword = normalizeText(filter.keyword)
  if (!keyword) {
    return true
  }
  return [dataset.name, dataset.description, dataset.owner, dataset.connectionName, ...dataset.tags].some((item) =>
    normalizeText(item).includes(keyword),
  )
}

function createDatasetFromDraft(payload: DatasetDraftPayload): Dataset {
  const id = `ds_${Date.now()}`
  const source = payload.connectionId
    ? mockSourceTables.find((table) => table.connectionId === payload.connectionId) ?? firstSourceTable()
    : firstSourceTable()
  const sensitivityLevel: DatasetSensitivityLevel =
    payload.sensitivityChoice === 'sensitive'
      ? 'sensitive_unmasked'
      : payload.sensitivityChoice === 'non_sensitive'
        ? 'non_sensitive'
        : 'unclassified'
  return {
    id,
    name: payload.name ?? (payload.datasetType === 'associated' ? '未命名关联数据集' : '未命名数据集'),
    description: '通过数据集创建流程生成的草稿配置。',
    datasetType: payload.datasetType,
    sourceMode: payload.sourceMode,
    folderId: payload.folderId ?? 'folder_ad',
    section: 'custom',
    owner: 'Chaoyang Xu',
    visibility: 'team',
    permission: 'admin',
    readonly: false,
    status: 'draft',
    storageEngine: source.storageEngine,
    connectionId: source.connectionId,
    connectionName: source.connectionName,
    databaseName: source.databaseName,
    tableName: source.tableName,
    rowCount: 0,
    fieldCount: 0,
    tags: payload.datasetType === 'associated' ? ['关联数据集'] : ['新建数据集'],
    sensitivityLevel,
    desensitizationVersion: 1,
    createdAt: nowText(),
    updatedAt: nowText(),
  }
}

function deriveAssociatedSensitivity(sourceDatasetIds: string[]): DatasetSensitivityLevel {
  const sourceStatuses = sourceDatasetIds
    .map((datasetId) => datasets.find((dataset) => dataset.id === datasetId)?.sensitivityLevel ?? 'unclassified')
  if (!sourceStatuses.length || sourceStatuses.includes('unclassified')) return 'unclassified'
  if (sourceStatuses.includes('sensitive_unmasked')) return 'sensitive_unmasked'
  if (sourceStatuses.includes('sensitive_masked')) return 'sensitive_masked'
  return 'non_sensitive'
}

function resolveNodeDatasetId(node: DatasetModel['nodes'][number]): string | undefined {
  if (node.datasetId) return node.datasetId
  return datasets.find(
    (dataset) =>
      dataset.tableName &&
      node.tableName &&
      dataset.tableName === node.tableName &&
      dataset.connectionId === node.connectionId,
  )?.id
}

function syncAssociatedMaskRules(dataset: Dataset, model: DatasetModel): void {
  if (dataset.sourceMode !== 'associated') return
  const sourceDatasetIds = model.nodes.map(resolveNodeDatasetId).filter(Boolean) as string[]
  dataset.sensitivityLevel = deriveAssociatedSensitivity(sourceDatasetIds)
  const inheritedRules: DataMaskRule[] = []
  const seenFields = new Set(
    maskRules
      .filter((rule) => rule.datasetId === dataset.id && rule.createdBy !== '系统继承')
      .map((rule) => rule.fieldName),
  )

  model.nodes.forEach((node) => {
    const sourceDatasetId = resolveNodeDatasetId(node)
    if (!sourceDatasetId) return
    const sourceDataset = datasets.find((item) => item.id === sourceDatasetId)
    const sourceRules =
      sourceDataset?.sensitivityLevel === 'sensitive_masked' && getRulesForDataset(sourceDatasetId).length === 0
        ? ensureDemoMaskRules(sourceDatasetId).filter((rule) => rule.enabled)
        : getRulesForDataset(sourceDatasetId).filter((rule) => rule.enabled)
    sourceRules.forEach((rule) => {
      const outputField = model.outputFields.find(
        (field) =>
          field.sourceNodeId === node.id &&
          (field.sourceFieldName === rule.fieldName || field.name === rule.fieldName || field.id === rule.fieldId),
      )
      if (!outputField || seenFields.has(outputField.name)) return
      seenFields.add(outputField.name)
      inheritedRules.push({
        ...clone(rule),
        id: `mask_${dataset.id}_${outputField.name}_${rule.id}`,
        datasetId: dataset.id,
        fieldId: outputField.id,
        fieldName: outputField.name,
        fieldDisplayName: outputField.displayName,
        fieldType: outputField.fieldType,
        semanticType: outputField.semanticType,
        createdBy: '系统继承',
        createdAt: nowText(),
        updatedBy: '系统继承',
        updatedAt: nowText(),
      })
    })
  })

  for (let index = maskRules.length - 1; index >= 0; index -= 1) {
    const rule = maskRules[index]
    if (rule?.datasetId === dataset.id && rule.createdBy === '系统继承') {
      maskRules.splice(index, 1)
    }
  }
  maskRules.push(...inheritedRules)
  if (dataset.sensitivityLevel !== 'non_sensitive' && dataset.sensitivityLevel !== 'unclassified') {
    recalculateDatasetSensitivity(dataset.id, { forceSensitive: true })
  }
}

export const datasetService = {
  async listFolders(): Promise<DatasetFolder[]> {
    await delay()
    return clone(folders)
  },

  async createFolder(name: string, section: DatasetFolder['section'], parentId?: string): Promise<DatasetFolder> {
    await delay()
    const folder: DatasetFolder = {
      id: `folder_${Date.now()}`,
      name,
      section,
      parentId: parentId ?? (section === 'theme' ? 'folder_theme_root' : 'folder_custom_root'),
    }
    folders.push(folder)
    return clone(folder)
  },

  async listDatasets(filter?: DatasetListFilter): Promise<Dataset[]> {
    await delay()
    return clone(datasets.filter((dataset) => matchesDataset(dataset, filter)))
  },

  async getDataset(datasetId: string): Promise<Dataset> {
    await delay()
    const dataset = datasets.find((item) => item.id === datasetId)
    if (!dataset) {
      throw new Error('数据集不存在')
    }
    return clone(dataset)
  },

  async getDatasetModel(datasetId: string): Promise<DatasetModel> {
    await delay()
    return clone(getOrCreateModel(datasetId))
  },

  async listSourceTables(): Promise<SourceTableItem[]> {
    await delay()
    return clone(mockSourceTables)
  },

  async getTableFields(sourceTableId: string): Promise<SourceField[]> {
    await delay()
    const table = mockSourceTables.find((item) => item.id === sourceTableId)
    return clone(table?.fields ?? [])
  },

  async createDraft(payload: DatasetDraftPayload): Promise<{ dataset: Dataset; model: DatasetModel }> {
    await delay()
    const dataset = createDatasetFromDraft(payload)
    const firstSource = firstSourceTable()
    const memberSource = mockSourceTables[2] ?? firstSource
    const sourceDatasets =
      payload.datasetType === 'associated'
        ? (payload.sourceDatasetIds ?? [])
            .map((datasetId) => datasets.find((item) => item.id === datasetId))
            .filter(Boolean) as Dataset[]
        : []
    const sources = payload.datasetType === 'associated' ? [memberSource, firstSource] : [firstSource]
    const nodes = sourceDatasets.length
      ? sourceDatasets.map((sourceDataset, index) => datasetToNode(sourceDataset, index))
      : sources.map((source, index) => sourceTableToNode(source, index))
    const [sourceNode, targetNode] = nodes
    const leftJoinField = sourceNode?.selectedFields.find((field) => field.name === 'user_id')?.name ?? sourceNode?.selectedFields[0]?.name ?? 'user_id'
    const rightJoinField = targetNode?.selectedFields.find((field) => field.name === leftJoinField)?.name ??
      targetNode?.selectedFields.find((field) => field.name === 'user_id')?.name ??
      targetNode?.selectedFields[0]?.name ??
      'user_id'
    const model: DatasetModel = {
      datasetId: dataset.id,
      nodes,
      edges:
        sourceNode && targetNode
          ? [
              {
                id: `edge_${Date.now()}`,
                sourceNodeId: sourceNode.id,
                targetNodeId: targetNode.id,
                relationType: 'join',
                status: 'normal',
                joinConfig: {
                  joinType: 'left',
                  conditions: [
                    {
                      id: `join_${Date.now()}`,
                      leftField: leftJoinField,
                      rightField: rightJoinField,
                      operator: 'equals',
                      useIdMapping: true,
                    },
                  ],
                  expression: `${sourceNode.alias}.${leftJoinField} = ${targetNode.alias}.${rightJoinField}`,
                  idMappingEnabled: true,
                },
              },
            ]
          : [],
      outputFields: nodes.flatMap((node) => node.selectedFields.map((field) => fieldToDatasetField(field, node.id))),
      modelFilter: { logic: 'AND', conditions: [] },
      previewLimit: 100,
      version: 1,
    }
    datasets.unshift(dataset)
    models[dataset.id] = model
    if (dataset.sourceMode === 'associated') {
      syncAssociatedMaskRules(dataset, model)
    }
    syncConfigs.push(createDefaultSyncConfig(dataset.id))
    return { dataset: clone(dataset), model: clone(model) }
  },

  async saveDataset(dataset: Dataset, model: DatasetModel, syncConfig?: SyncConfig): Promise<Dataset> {
    await delay()
    const previous = datasets.find((item) => item.id === dataset.id)
    const normalized: Dataset = {
      ...dataset,
      status: dataset.sourceMode === 'extract' ? 'sync_success' : 'saved',
      fieldCount: model.outputFields.length,
      rowCount: dataset.rowCount || 128_600,
      updatedAt: nowText(),
      lastSyncAt: dataset.sourceMode === 'extract' ? nowText() : dataset.lastSyncAt,
      desensitizationVersion: dataset.desensitizationVersion ?? previous?.desensitizationVersion ?? 1,
    }
    const index = datasets.findIndex((item) => item.id === dataset.id)
    if (index >= 0) {
      datasets[index] = normalized
    } else {
      datasets.unshift(normalized)
    }
    models[dataset.id] = { ...clone(model), datasetId: dataset.id, version: model.version + 1 }
    if (syncConfig) {
      const configIndex = syncConfigs.findIndex((item) => item.datasetId === dataset.id)
      if (configIndex >= 0) {
        syncConfigs[configIndex] = clone(syncConfig)
      } else {
        syncConfigs.push(clone(syncConfig))
      }
    }
    if (normalized.sourceMode === 'associated') {
      syncAssociatedMaskRules(normalized, models[dataset.id] ?? model)
      touchDesensitizationConfig(normalized, 'update_sensitivity_level', previous?.sensitivityLevel, normalized.sensitivityLevel)
    } else if (!normalized.sensitivityLevel) {
      normalized.sensitivityLevel = 'unclassified'
    }
    return clone(normalized)
  },

  async copyDataset(datasetId: string): Promise<Dataset> {
    await delay()
    const dataset = datasets.find((item) => item.id === datasetId)
    if (!dataset) {
      throw new Error('数据集不存在')
    }
    const copied: Dataset = {
      ...clone(dataset),
      id: `ds_copy_${Date.now()}`,
      name: `${dataset.name} 副本`,
      readonly: false,
      status: 'draft',
      owner: 'Chaoyang Xu',
      createdAt: nowText(),
      updatedAt: nowText(),
    }
    datasets.unshift(copied)
    models[copied.id] = { ...clone(getOrCreateModel(datasetId)), datasetId: copied.id, version: 1 }
    return clone(copied)
  },

  async deleteDataset(datasetId: string): Promise<Dataset> {
    await delay()
    const dataset = datasets.find((item) => item.id === datasetId)
    if (!dataset) {
      throw new Error('数据集不存在')
    }
    dataset.status = 'deleted'
    dataset.section = 'recycle'
    dataset.folderId = 'folder_recycle'
    dataset.deletedAt = nowText()
    dataset.updatedAt = nowText()
    return clone(dataset)
  },

  async restoreDataset(datasetId: string): Promise<Dataset> {
    await delay()
    const dataset = datasets.find((item) => item.id === datasetId)
    if (!dataset) {
      throw new Error('数据集不存在')
    }
    dataset.status = 'saved'
    dataset.section = 'custom'
    dataset.folderId = 'folder_ad'
    dataset.deletedAt = undefined
    dataset.updatedAt = nowText()
    return clone(dataset)
  },

  async moveDataset(datasetId: string, folderId: string): Promise<Dataset> {
    await delay()
    const dataset = datasets.find((item) => item.id === datasetId)
    const folder = folders.find((item) => item.id === folderId)
    if (!dataset) {
      throw new Error('数据集不存在')
    }
    if (!folder || folder.readonly || folder.section !== 'custom') {
      throw new Error('目标文件夹不可用')
    }
    dataset.folderId = folderId
    dataset.section = 'custom'
    dataset.updatedAt = nowText()
    return clone(dataset)
  },

  async updateDatasetBasicInfo(
    datasetId: string,
    payload: { name: string; description?: string; folderId?: string },
  ): Promise<Dataset> {
    await delay()
    const dataset = datasets.find((item) => item.id === datasetId)
    if (!dataset) {
      throw new Error('数据集不存在')
    }
    if (dataset.readonly || dataset.sourceMode === 'theme') {
      throw new Error('当前数据集不支持修改基础信息')
    }
    const duplicated = datasets.some(
      (item) =>
        item.id !== datasetId &&
        item.folderId === (payload.folderId ?? dataset.folderId) &&
        normalizeText(item.name) === normalizeText(payload.name) &&
        item.status !== 'deleted',
    )
    if (duplicated) {
      throw new Error('当前目录下已存在同名数据集，请修改名称')
    }
    dataset.name = payload.name
    dataset.description = payload.description ?? dataset.description
    dataset.folderId = payload.folderId ?? dataset.folderId
    dataset.updatedAt = nowText()
    return clone(dataset)
  },

  async updateDatasetTags(datasetId: string, tags: string[]): Promise<Dataset> {
    await delay()
    const dataset = datasets.find((item) => item.id === datasetId)
    if (!dataset) {
      throw new Error('数据集不存在')
    }
    if (dataset.readonly || dataset.sourceMode === 'theme') {
      throw new Error('当前数据集不支持单独设置标签')
    }
    dataset.tags = clone(tags)
    dataset.updatedAt = nowText()
    return clone(dataset)
  },

  async saveUsageInstruction(datasetId: string, url: string): Promise<Dataset> {
    await delay()
    const dataset = datasets.find((item) => item.id === datasetId)
    if (!dataset) {
      throw new Error('数据集不存在')
    }
    dataset.usageInstructionUrl = url
    dataset.updatedAt = nowText()
    return clone(dataset)
  },

  async saveVisualQueryConfig(
    datasetId: string,
    config: {
      defaultVisualQueryUrl?: string
      allowSubscription: boolean
      allowMonitoring: boolean
      allowAutoQuery: boolean
      allowFilterSearchOptimization: boolean
      maxQueryDaysEnabled: boolean
      maxQueryDays?: number
      allowDropTimeoutNode: boolean
      detailFieldIds: string[]
      timeoutAccuracyLossThreshold: number
    },
  ): Promise<Dataset> {
    await delay()
    const dataset = datasets.find((item) => item.id === datasetId)
    if (!dataset) {
      throw new Error('数据集不存在')
    }
    dataset.defaultVisualQueryUrl = config.defaultVisualQueryUrl
    dataset.visualQueryConfig = clone(config)
    dataset.updatedAt = nowText()
    return clone(dataset)
  },

  async permanentDeleteDataset(datasetId: string): Promise<void> {
    await delay()
    datasets = datasets.filter((item) => item.id !== datasetId)
    delete models[datasetId]
  },

  async previewModel(model: DatasetModel): Promise<PreviewResult> {
    await delay()
    const result = clone(makePreviewResult(model.datasetId, model.outputFields.filter((field) => field.visible)))
    result.rows = applyRuntimeMaskingToRows<DatasetPreviewRow>(model.datasetId, result.rows, 'preview') as DatasetPreviewRow[]
    return result
  },

  async validateSql(sql: string): Promise<SqlValidationResult> {
    await delay()
    const normalizedSql = normalizeText(sql)
    const deniedWords = ['drop ', 'delete ', 'insert ', 'update ', 'alter ', 'truncate ', 'create ']
    if (!normalizedSql.startsWith('select')) {
      return { success: false, message: '仅支持 SELECT 查询。', fields: [] }
    }
    if (deniedWords.some((word) => normalizedSql.includes(word))) {
      return { success: false, message: '检测到 DDL/DML 或危险语句，请调整 SQL。', fields: [] }
    }
    return {
      success: true,
      message: 'SQL 校验通过，已识别 4 个输出字段。',
      fields: [
        { id: 'sql_user_id', name: 'user_id', displayName: '用户 ID', fieldType: 'string' },
        { id: 'sql_ad_position', name: 'ad_position', displayName: '广告位', fieldType: 'string' },
        { id: 'sql_watch_count', name: 'watch_count', displayName: '观看次数', fieldType: 'integer' },
        { id: 'sql_revenue', name: 'revenue', displayName: '广告收益', fieldType: 'decimal' },
      ],
    }
  },

  async formatSql(sql: string): Promise<string> {
    await delay(80)
    return sql
      .replace(/\s+from\s+/gi, '\nFROM ')
      .replace(/\s+where\s+/gi, '\nWHERE ')
      .replace(/\s+group by\s+/gi, '\nGROUP BY ')
      .replace(/\s+order by\s+/gi, '\nORDER BY ')
      .trim()
  },

  async getSyncConfig(datasetId: string): Promise<SyncConfig> {
    await delay()
    return clone(syncConfigs.find((item) => item.datasetId === datasetId) ?? createDefaultSyncConfig(datasetId))
  },

  async listSyncTasks(datasetId: string): Promise<SyncTask[]> {
    await delay()
    return clone(syncTasks.filter((task) => task.datasetId === datasetId))
  },

  async triggerSync(datasetId: string): Promise<SyncTask> {
    await delay()
    const task: SyncTask = {
      id: `sync_${Date.now()}`,
      datasetId,
      taskName: '手动同步任务',
      status: 'running',
      startedAt: nowText(),
      rowCount: 0,
      logLines: ['任务已提交', '等待资源调度'],
    }
    syncTasks.unshift(task)
    const dataset = datasets.find((item) => item.id === datasetId)
    if (dataset) {
      dataset.status = 'syncing'
      dataset.updatedAt = nowText()
    }
    return clone(task)
  },

  async rerunSyncTask(taskId: string): Promise<SyncTask> {
    await delay()
    const task = syncTasks.find((item) => item.id === taskId)
    if (!task) {
      throw new Error('同步任务不存在')
    }
    task.status = 'running'
    task.startedAt = nowText()
    task.finishedAt = undefined
    task.errorMessage = undefined
    task.logLines = ['重新运行任务', '资源已提交']
    return clone(task)
  },

  async cancelSyncTask(taskId: string): Promise<SyncTask> {
    await delay()
    const task = syncTasks.find((item) => item.id === taskId)
    if (!task) {
      throw new Error('同步任务不存在')
    }
    task.status = 'canceled'
    task.finishedAt = nowText()
    task.logLines.push('用户取消任务')
    return clone(task)
  },

  async getLineage(datasetId?: string): Promise<{ nodes: DatasetLineageNode[]; edges: DatasetLineageEdge[] }> {
    await delay()
    return clone(buildDatasetLineage(datasetId))
  },

  async listPermissionRules(datasetId: string): Promise<DatasetPermissionRule[]> {
    await delay()
    return clone(permissionRules.filter((rule) => rule.datasetId === datasetId))
  },

  async savePermissionRule(rule: DatasetPermissionRule): Promise<DatasetPermissionRule> {
    await delay()
    const index = permissionRules.findIndex((item) => item.id === rule.id)
    if (index >= 0) {
      permissionRules[index] = clone(rule)
    } else {
      permissionRules.push(clone(rule))
    }
    return clone(rule)
  },

  async listMaskRules(datasetId: string): Promise<DataMaskRule[]> {
    await delay()
    const dataset = datasets.find((item) => item.id === datasetId)
    if (dataset?.sensitivityLevel === 'sensitive_masked' && getRulesForDataset(datasetId).length === 0) {
      ensureDemoMaskRules(datasetId)
    }
    if (dataset?.sensitivityLevel === 'sensitive_unmasked' || dataset?.sensitivityLevel === 'sensitive_masked') {
      recalculateDatasetSensitivity(datasetId, { forceSensitive: true })
    }
    return clone(getRulesForDataset(datasetId))
  },

  async toggleMaskRule(ruleId: string, expectedVersion?: number): Promise<DataMaskRule> {
    await delay()
    const rule = maskRules.find((item) => item.id === ruleId)
    if (!rule) {
      throw new Error('脱敏规则不存在')
    }
    const dataset = datasets.find((item) => item.id === rule.datasetId)
    if (!dataset) {
      throw new Error('数据集不存在')
    }
    assertDesensitizationVersion(dataset, expectedVersion)
    const beforeValue = clone(rule)
    rule.enabled = !rule.enabled
    rule.updatedAt = nowText()
    rule.updatedBy = 'Chaoyang Xu'
    recalculateDatasetSensitivity(rule.datasetId, { forceSensitive: true })
    touchDesensitizationConfig(dataset, 'update_masking_rule', beforeValue, rule)
    return clone(rule)
  },

  async saveMaskRule(rule: DataMaskRule, expectedVersion?: number): Promise<DataMaskRule> {
    await delay()
    const dataset = datasets.find((item) => item.id === rule.datasetId)
    if (!dataset) {
      throw new Error('数据集不存在')
    }
    assertDesensitizationVersion(dataset, expectedVersion)
    if (dataset.sensitivityLevel === 'non_sensitive') {
      throw new Error('请先将数据集标记为涉敏，再配置脱敏规则')
    }
    const fields = getOrCreateModel(rule.datasetId).outputFields
    const validationError = validateMaskRule(rule, fields)
    if (validationError) {
      throw new Error(validationError)
    }
    const duplicated = maskRules.some(
      (item) => item.datasetId === rule.datasetId && item.id !== rule.id && item.fieldName === rule.fieldName,
    )
    if (duplicated) {
      throw new Error('该字段已添加脱敏规则，不能重复添加')
    }
    const normalized = clone(rule)
    normalized.updatedBy = 'Chaoyang Xu'
    normalized.updatedAt = nowText()
    const index = maskRules.findIndex((item) => item.id === normalized.id)
    const beforeValue = index >= 0 ? clone(maskRules[index]) : undefined
    if (index >= 0) {
      maskRules[index] = normalized
    } else {
      normalized.createdBy = normalized.createdBy ?? 'Chaoyang Xu'
      normalized.createdAt = normalized.createdAt ?? nowText()
      maskRules.push(normalized)
    }
    recalculateDatasetSensitivity(normalized.datasetId, { forceSensitive: true })
    touchDesensitizationConfig(dataset, index >= 0 ? 'update_masking_rule' : 'add_masking_field', beforeValue, normalized)
    return clone(normalized)
  },

  async deleteMaskRule(ruleId: string, expectedVersion?: number): Promise<void> {
    await delay()
    const index = maskRules.findIndex((item) => item.id === ruleId)
    if (index >= 0) {
      const rule = maskRules[index]
      if (!rule) return
      const dataset = datasets.find((item) => item.id === rule.datasetId)
      if (!dataset) {
        throw new Error('数据集不存在')
      }
      assertDesensitizationVersion(dataset, expectedVersion)
      maskRules.splice(index, 1)
      recalculateDatasetSensitivity(rule.datasetId, { forceSensitive: true })
      touchDesensitizationConfig(dataset, 'remove_masking_field', rule, undefined)
    }
  },

  async updateDatasetSensitivity(
    datasetId: string,
    sensitivityLevel: DatasetSensitivityLevel,
    expectedVersion?: number,
  ): Promise<Dataset> {
    await delay()
    const dataset = datasets.find((item) => item.id === datasetId)
    if (!dataset) {
      throw new Error('数据集不存在')
    }
    assertDesensitizationVersion(dataset, expectedVersion)
    const beforeValue = dataset.sensitivityLevel ?? 'unclassified'
    dataset.sensitivityLevel = sensitivityLevel
    if (sensitivityLevel === 'sensitive_unmasked' || sensitivityLevel === 'sensitive_masked') {
      recalculateDatasetSensitivity(datasetId, { forceSensitive: true })
    }
    touchDesensitizationConfig(dataset, 'update_sensitivity_level', beforeValue, dataset.sensitivityLevel)
    return clone(dataset)
  },

  async listDesensitizationAuditLogs(datasetId: string): Promise<DesensitizationOperationLog[]> {
    await delay()
    return clone(desensitizationLogs.filter((log) => log.datasetId === datasetId))
  },

  recordDesensitizationAudit(
    datasetId: string,
    operationType: DesensitizationOperationLog['operationType'],
    beforeValue?: unknown,
    afterValue?: unknown,
  ): void {
    appendDesensitizationLog(datasetId, operationType, beforeValue, afterValue)
  },

  getCurrentUserContext(): CurrentUserContext {
    return clone(demoCurrentUser)
  },

  isMaskRuleComplete(rule: DataMaskRule, fields: DatasetField[] = []): boolean {
    return isMaskRuleComplete(rule, fields)
  },

  validateMaskRule(rule: DataMaskRule, fields: DatasetField[] = []): string {
    return validateMaskRule(rule, fields)
  },

  maskDatasetValue(value: unknown, rule: Pick<DataMaskRule, 'ruleType' | 'ruleConfig'>): unknown {
    return maskDatasetValue(value, rule)
  },

  maskFieldDisplayValue(
    datasetId: string,
    fieldName: string,
    value: unknown,
    scene: MaskingScene,
    currentUser: CurrentUserContext = demoCurrentUser,
  ): unknown {
    return maskFieldDisplayValue(datasetId, fieldName, value, scene, currentUser)
  },

  isFieldMaskedForCurrentUser(
    datasetId: string,
    fieldName: string,
    scene: MaskingScene,
    currentUser: CurrentUserContext = demoCurrentUser,
  ): boolean {
    return runtimeMaskRules(datasetId, scene, currentUser).some((rule) => rule.fieldName === fieldName)
  },

  applyRuntimeMaskingToRows<T extends object>(
    datasetId: string,
    rows: T[],
    scene: MaskingScene,
    currentUser: CurrentUserContext = demoCurrentUser,
  ): T[] {
    return applyRuntimeMaskingToRows(datasetId, rows, scene, currentUser)
  },

  async requestPermission(datasetId: string): Promise<void> {
    await delay()
    const dataset = datasets.find((item) => item.id === datasetId)
    if (dataset) {
      dataset.permission = 'read_preview'
    }
  },
}
