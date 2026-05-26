import {
  currentTagPermissions,
  tagAssessments,
  tagCategories,
  tagDefinitions,
  tagDistributions,
  tagHistories,
  tagMetadataFields,
  tagOperationLogs,
  tagPermissions,
  tagRuleVersions,
  tagRunRecords,
  tagTemplates,
} from '@/mock/tags'
import type { EntityId } from '@/types/common'
import type {
  TagBulkResult,
  TagCategory,
  TagCreatePayload,
  TagDependencyRisk,
  TagDefinition,
  TagDetailBundle,
  TagEmptyValueStrategy,
  TagEstimateResult,
  TagFrequencyConfig,
  TagLineageNode,
  TagListFilters,
  TagMetadataField,
  TagOperationLog,
  TagPermission,
  TagRuleCondition,
  TagRuleGroup,
  TagRunRecord,
  TagRunStatus,
  TagSqlParseResult,
  TagStatus,
  TagTemplate,
  TagTtlConfig,
  TagType,
  TagUploadResult,
  TagValueDistribution,
  TagValueType,
} from '@/types/tag'

const resolveMock = <T>(payload: T, delay = 160): Promise<T> =>
  new Promise((resolve) => {
    window.setTimeout(() => resolve(clone(payload)), delay)
  })

const clone = <T>(value: T): T => (value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T))

const now = (): string => new Date().toISOString()

const today = (): string => new Date().toISOString().slice(0, 10)

const makeId = (prefix: string): string => `${prefix}-${Date.now()}-${Math.round(Math.random() * 10000)}`

const emptyAssessment = {
  lastUsedDays: 0,
  internalUsageCount: 0,
  internalReferenceCount: 0,
  internalQueryCount: 0,
  externalCallCount: 0,
  apiCallCount: 0,
  p95LatencyMs: 0,
  errorRate: 0,
}

export const tagTypeLabels: Record<TagType, string> = {
  rule: '规则标签',
  statistic: '统计标签',
  first_last: '首末次标签',
  preference: '偏好标签',
  priority: '排序标签',
  calculation: '运算标签',
  lifecycle: '生命周期标签',
  rfm: 'RFM 标签',
  import: '导入标签',
  manual: '人工录入标签',
  sql: 'SQL 标签',
  model: '自定义模型标签',
}

export const tagValueTypeLabels: Record<TagValueType, string> = {
  text: '文本型',
  integer: '整数型',
  decimal: '小数型',
  multi_text: '多值文本型',
  multi_integer: '多值数值型',
  multi_decimal: '多值小数型',
  date: '日期型',
  datetime: '时间日期型',
  multi_date: '多值日期型',
  multi_datetime: '多值时间日期型',
}

export const tagStatusLabels: Record<TagStatus, string> = {
  draft: '草稿态',
  online: '已上架',
  offline: '已下架',
  deleted: '已删除',
}

export const tagRunStatusLabels: Record<TagRunStatus, string> = {
  running: '运行中',
  success: '运行成功',
  failed: '运行失败',
  waiting: '等待就绪',
  stopped: '已停止',
  other: '其他',
}

export const emptyValueStrategyLabels: Record<TagEmptyValueStrategy, string> = {
  empty: '计算为空时保留空缺',
  keep_previous: '计算为空时保留历史值',
}

export const tagTypeGroups: Array<{ label: string; types: TagType[] }> = [
  { label: '规则构建', types: ['rule', 'statistic', 'first_last', 'preference', 'priority', 'calculation'] },
  { label: '模型构建', types: ['lifecycle', 'rfm', 'model'] },
  { label: '数据导入', types: ['import', 'manual', 'sql'] },
]

const syncCategoryCounts = (): void => {
  const activeTags = tagDefinitions.filter((item) => item.status !== 'deleted')
  tagCategories.forEach((category) => {
    if (category.id === 'cat-root') {
      category.tagCount = activeTags.length
      return
    }
    category.tagCount = activeTags.filter((item) => item.categoryId === category.id).length
  })
}

const childCategoryIds = (categoryId: EntityId): EntityId[] => {
  const direct = tagCategories.filter((item) => item.parentId === categoryId).map((item) => item.id)
  return [...direct, ...direct.flatMap((id) => childCategoryIds(id))]
}

const validateCategoryName = (name: string, parentId: EntityId | null, selfId?: EntityId): string => {
  const trimmed = name.trim()
  if (!trimmed) {
    return '名称必填'
  }
  if (trimmed.length > 50) {
    return '名称长度限制为 1-50 个字符'
  }
  const duplicated = tagCategories.some((item) => item.parentId === parentId && item.id !== selfId && item.name === trimmed)
  if (duplicated) {
    return '同一父级下目录名称不可重复'
  }
  return ''
}

const validateTagPayload = (payload: TagCreatePayload, editingId?: EntityId): string => {
  const trimmed = payload.name.trim()
  if (!trimmed) {
    return '标签名称不能为空'
  }
  if (trimmed.length > 100) {
    return '标签名称不能超过 100 个字符'
  }
  if (tagDefinitions.some((item) => item.id !== editingId && item.status !== 'deleted' && item.name === trimmed)) {
    return '当前项目下已存在同名标签，请修改标签名称'
  }
  const category = tagCategories.find((item) => item.id === payload.categoryId)
  if (!category) {
    return '请选择标签所在目录'
  }
  if (payload.emptyValueStrategy === 'keep_previous' && ['week', 'month'].includes(payload.frequency.unit)) {
    return '当前更新取值逻辑暂不支持周/月调度，请改为按天调度或选择计算为空时保留空缺'
  }
  const missingMetadata = tagMetadataFields
    .filter((field) => field.status === 'enabled' && field.required)
    .find((field) => {
      const value = payload.metadata[field.id]
      return Array.isArray(value) ? value.length === 0 : !String(value ?? '').trim()
    })
  if (missingMetadata) {
    return `请填写必填元信息：${missingMetadata.name}`
  }
  if (payload.saveAsDraft) {
    return ''
  }
  const groupHasRule = (group?: TagRuleGroup): boolean =>
    Boolean(group && (
      group.conditions.length > 0
      || group.conditions.some((condition) => groupHasRule(condition.childGroup) || (condition.childGroups ?? []).some((childGroup) => groupHasRule(childGroup)))
      || (group.groups ?? []).some((item) => groupHasRule(item))
    ))
  if (payload.type === 'rule' || payload.type === 'lifecycle') {
    const values = payload.rule.values ?? []
    if (!values.length) {
      return '请至少配置一个标签值'
    }
    const names = values.map((item) => item.name.trim())
    if (names.some((name) => !name)) {
      return '标签值名称不能为空'
    }
    if (new Set(names).size !== names.length) {
      return '同一标签下标签值不可重复'
    }
    if (names.some((name) => /[,\n，]/.test(name))) {
      return '标签值名称不可包含逗号或换行'
    }
    if (values.some((item) => !groupHasRule(item.include) && !groupHasRule(item.exclude))) {
      return '每个标签值至少需要一条满足或排除规则'
    }
    if (payload.type === 'lifecycle' && values.length < 2) {
      return '生命周期标签至少保留 2 个阶段'
    }
    if (payload.type === 'lifecycle' && values.length > 8) {
      return '生命周期标签最多 8 个阶段'
    }
    if (payload.type === 'lifecycle' && names.some((name) => /['"()、]/.test(name))) {
      return '生命周期阶段名称不支持英文引号、括号或顿点'
    }
  }
  if (payload.type === 'statistic') {
    if (!payload.rule.sourceType || !payload.rule.dataSource || !payload.rule.dateRange || !payload.rule.aggregateMethod) {
      return '统计标签需要配置数据源、日期范围和统计方式'
    }
    if (!groupHasRule(payload.rule.filterGroup)) {
      return '统计标签至少需要配置一条行为或明细筛选条件'
    }
    if (!['总次数', '天数', '连续天数'].includes(payload.rule.aggregateMethod) && !payload.rule.aggregateField?.trim()) {
      return '当前统计方式需要选择聚合字段'
    }
    if (payload.rule.aggregateMethod === '去重计数' && !payload.rule.distinctField?.trim()) {
      return '去重计数需要选择去重字段'
    }
  }
  if (payload.type === 'first_last') {
    if (!payload.rule.sourceType || !payload.rule.dataSource || !payload.rule.dateRange || !payload.rule.timeField || !payload.rule.outputMode) {
      return '首末次标签需要配置数据源、日期范围、时间字段和输出特征'
    }
    if (!groupHasRule(payload.rule.filterGroup)) {
      return '首末次标签至少需要配置一条事件或明细筛选条件'
    }
    if (payload.rule.outputMode === 'attribute' && !payload.rule.outputAttribute?.trim()) {
      return '输出事件属性时需要选择输出属性'
    }
  }
  if (payload.type === 'preference') {
    if (payload.computeType === 'realtime') {
      return '偏好标签仅支持离线计算'
    }
    if (!payload.rule.sourceType || !payload.rule.dataSource || !payload.rule.dateRange || !payload.rule.preferenceField || !payload.rule.preferenceMetric || !payload.rule.topN) {
      return '偏好标签需要配置数据源、日期范围、偏好字段、排序指标和 Top N'
    }
    if (!groupHasRule(payload.rule.filterGroup)) {
      return '偏好标签至少需要配置一条筛选条件'
    }
  }
  if (payload.type === 'priority' && (payload.rule.selectedFields?.length ?? 0) < 2) {
    return '排序标签至少需要选择 2 个字段'
  }
  if (payload.type === 'priority') {
    const fields = payload.rule.selectedFields ?? []
    if (fields.some((field) => field.valueType !== payload.valueType)) {
      return '排序标签只能选择与目标标签值类型一致的字段'
    }
  }
  if (payload.type === 'calculation') {
    const expression = payload.rule.expression?.trim() ?? ''
    const fields = payload.rule.selectedFields ?? []
    if (!fields.length || !expression) {
      return '运算标签需要选择字段并填写表达式'
    }
    if ((expression.match(/\(/g)?.length ?? 0) !== (expression.match(/\)/g)?.length ?? 0)) {
      return '表达式括号不匹配'
    }
    if (!fields.some((field) => expression.includes(field.id))) {
      return '表达式需引用至少一个已选字段'
    }
    if (/\/\s*0(?![\d.])/.test(expression)) {
      return '表达式不允许除以 0'
    }
    const unknownReference = Array.from(expression.matchAll(/[a-zA-Z_][a-zA-Z0-9_-]*/g))
      .map((match) => match[0])
      .filter((token) => !fields.some((field) => field.id === token))
      .filter((token) => !['min', 'max', 'sum', 'avg'].includes(token))
    if (unknownReference.length) {
      return `表达式引用了未选择字段：${unknownReference[0]}`
    }
    if (payload.rule.resultBounds?.min !== undefined && payload.rule.resultBounds?.max !== undefined && payload.rule.resultBounds.min > payload.rule.resultBounds.max) {
      return '运算标签结果值下限不可大于上限'
    }
  }
  if (payload.type === 'rfm') {
    const enabledMetrics = payload.rule.rfmMetrics?.filter((item) => item.enabled) ?? []
    if (enabledMetrics.length < 2) {
      return 'RFM 标签至少保留两个指标'
    }
    if (enabledMetrics.some((item) => !item.threshold.trim())) {
      return 'RFM 指标阈值不能为空'
    }
    if (!payload.rule.rfmSourceType || !payload.rule.dataSource || !payload.rule.rfmPeriod) {
      return 'RFM 标签需要配置数据来源、计算周期和指标字段'
    }
    if (enabledMetrics.some((item) => !item.field?.trim())) {
      return 'RFM 已启用指标必须选择字段或标签'
    }
    const names = payload.rule.rfmValueNames?.map((item) => item.name.trim()) ?? []
    if (!names.length || names.some((name) => !name) || new Set(names).size !== names.length) {
      return 'RFM 标签值名称不能为空且不可重复'
    }
  }
  if (payload.type === 'import') {
    if (!payload.rule.dataSource?.trim()) {
      return '导入标签需要选择数据源'
    }
    const fields = payload.rule.importFields ?? []
    if (!fields.length) {
      return '导入标签需要配置待创建字段'
    }
    if (fields.some((field) => !field.sourceField.trim() || !field.tagName.trim() || !field.categoryId || !field.valueType)) {
      return '导入字段需要配置来源字段、标签名称和路径'
    }
    const names = fields.map((field) => field.tagName.trim())
    if (new Set(names).size !== names.length) {
      return '导入标签名称不可重复'
    }
  }
  if (payload.type === 'manual' && (!payload.rule.dataSource?.trim() || !/\.(csv|xlsx)$/i.test(payload.rule.dataSource))) {
    return '上传文件不符合模板要求，请下载模板后重新上传'
  }
  if (payload.type === 'manual' && payload.valueType.startsWith('multi') && !payload.rule.manualDelimiter) {
    return '多值人工录入标签必须选择分隔符'
  }
  if (payload.type === 'sql' && !payload.rule.sql?.trim()) {
    return 'SQL 标签需要填写查询语句'
  }
  if (payload.type === 'sql' && payload.rule.sql) {
    const danger = /\b(drop|delete|insert|update|truncate|alter)\b/i.test(payload.rule.sql)
    if (danger) {
      return 'SQL 不允许包含 drop、delete、insert、update、truncate、alter 等危险语句'
    }
    const mappings = payload.rule.sqlFieldMappings ?? []
    const requiredMappings = ['subject_id', 'tag_value'] as const
    if (!requiredMappings.every((field) => mappings.some((mapping) => mapping.targetField === field && mapping.sourceColumn.trim()))) {
      return 'SQL 标签需要完成主体 ID 和标签值字段映射'
    }
  }
  if (!payload.rule.summary && payload.type !== 'model') {
    return '请至少配置一条标签规则'
  }
  return ''
}

const latestRunStatus = (tag: TagDefinition): TagRunStatus => {
  const run = tagRunRecords.find((item) => item.tagId === tag.id)
  if (run) {
    return run.status
  }
  if (tag.type === 'manual' || tag.computeType === 'realtime' || tag.status !== 'online') {
    return 'other'
  }
  return tag.latestDurationMs ? 'success' : 'waiting'
}

const matchMetadataFilters = (tag: TagDefinition, metadata?: Record<EntityId, string | string[]>): boolean => {
  if (!metadata) return true
  return Object.entries(metadata).every(([fieldId, expected]) => {
    const normalized = Array.isArray(expected) ? expected.filter(Boolean).map(String) : String(expected ?? '').trim()
    if (Array.isArray(normalized) && normalized.length === 0) return true
    if (!Array.isArray(normalized) && !normalized) return true
    const actual = tag.metadata[fieldId]
    if (Array.isArray(normalized)) {
      const actualValues = Array.isArray(actual) ? actual.map(String) : actual ? [String(actual)] : []
      return normalized.every((value) => actualValues.includes(value))
    }
    return Array.isArray(actual) ? actual.map(String).includes(normalized) : String(actual ?? '') === normalized
  })
}

const node = (id: string, name: string, assetType: TagLineageNode['assetType'], direction: TagLineageNode['direction'], level: number, status: TagLineageNode['status'] = 'normal'): TagLineageNode => ({
  id,
  name,
  assetType,
  direction,
  level,
  status,
})

const downstreamResourcesForTag = (tag: TagDefinition): TagLineageNode[] => {
  const resources: TagLineageNode[] = []
  if (tag.status !== 'draft') {
    resources.push(node(`${tag.id}-segment`, `${tag.name}营销分群`, 'segment', 'downstream', 1, tag.status === 'offline' ? 'unavailable' : 'normal'))
  }
  if (tag.onlineServiceEnabled || tag.syncedProjectIds.length > 0) {
    resources.push(node(`${tag.id}-api`, `${tag.name}在线服务 API`, 'api', 'downstream', 2, tag.status === 'offline' ? 'unavailable' : 'waiting'))
  }
  if (['lifecycle', 'rfm', 'calculation', 'sql'].includes(tag.type)) {
    resources.push(node(`${tag.id}-analysis`, `${tag.name}分析看板`, 'analysis', 'downstream', 1, tag.status === 'offline' ? 'unavailable' : 'normal'))
  }
  return resources.slice(0, Math.max(tag.downstreamDependencyCount, resources.length))
}

const lineageForTag = (tag: TagDefinition): TagLineageNode[] => {
  const upstream: TagLineageNode[] = []
  const dataSource = tag.rule.dataSource || (tag.type === 'sql' ? 'SQL 查询结果' : tag.type === 'model' ? '可视化建模任务' : '用户属性全量表')
  upstream.push(node(`${tag.id}-source`, dataSource, 'data_source', 'upstream', 1))

  if (tag.type === 'sql' && tag.rule.sql) {
    const tableMatches = Array.from(tag.rule.sql.matchAll(/\bfrom\s+([a-zA-Z0-9_.]+)/gi)).map((match) => match[1]).filter(Boolean)
    tableMatches.forEach((table, index) => {
      upstream.push(node(`${tag.id}-sql-${index}`, table!, 'data_source', 'upstream', 1))
    })
  }

  const flattenConditions = (group?: TagRuleGroup): TagRuleCondition[] => [
    ...(group?.conditions ?? []),
    ...((group?.conditions ?? []).flatMap((condition) => [
      ...flattenConditions(condition.childGroup),
      ...((condition.childGroups ?? []).flatMap((childGroup) => flattenConditions(childGroup))),
    ])),
    ...((group?.groups ?? []).flatMap((item) => flattenConditions(item))),
  ]
  const referencedTags = tag.rule.values
    ?.flatMap((value) => [...flattenConditions(value.include), ...flattenConditions(value.exclude)])
    .filter((condition) => condition.sourceType === 'tag')
    .map((condition) => condition.field || condition.sourceName)
    .filter(Boolean) ?? []
  referencedTags.forEach((name, index) => {
    upstream.push(node(`${tag.id}-ref-tag-${index}`, name, 'tag', 'upstream', 1))
  })

  return [...upstream, ...downstreamResourcesForTag(tag)]
}

const writeLog = (tagId: EntityId, actionType: TagOperationLog['actionType'], content: string): void => {
  tagOperationLogs.unshift({
    id: makeId('log'),
    tagId,
    operator: '当前用户',
    actionType,
    content,
    createdAt: now(),
  })
}

const buildTag = (payload: TagCreatePayload): TagDefinition => ({
  id: makeId('tag'),
  projectId: 'project-demo',
  subjectId: 'subject-user',
  subjectName: '用户主体',
  name: payload.name.trim(),
  description: payload.description.trim(),
  type: payload.type,
  valueType: payload.valueType,
  categoryId: payload.categoryId,
  status: payload.saveAsDraft ? 'draft' : 'online',
  computeType: payload.computeType,
  updateType: payload.computeType === 'realtime' ? 'realtime' : payload.updateType,
  frequency: payload.computeType === 'realtime' ? { unit: 'realtime' } : payload.frequency,
  emptyValueStrategy: payload.emptyValueStrategy,
  ttl: payload.updateType === 'manual' ? { strategy: 'system' } : payload.ttl,
  onlineServiceEnabled: payload.onlineServiceEnabled,
  valueSaveMode: payload.valueSaveMode,
  metadata: payload.metadata,
  rule: payload.rule,
  createdBy: { id: 'current-user', name: '当前用户', department: '用户洞察团队' },
  createdAt: now(),
  updatedAt: now(),
  latestDataDate: payload.saveAsDraft ? undefined : today(),
  latestDurationMs: payload.saveAsDraft ? undefined : 90000,
  resourceAdmins: [{ id: 'owner-admin', name: '孟澜', department: '平台管理组' }],
  permissions: { canView: true, canEdit: true, canManage: true, canShelve: true, canRun: true },
  favorite: false,
  visible: true,
  fromTemplate: false,
  downstreamDependencyCount: 0,
  syncedProjectIds: [],
})

const initialDistributionForTag = (tag: TagDefinition): TagValueDistribution[] => {
  if (tag.rule.values?.length) {
    const base = Math.max(1, tag.rule.values.length)
    return tag.rule.values.map((value, index) => ({
      value: value.name,
      count: 18000 + index * 6400,
      rate: Number((100 / base).toFixed(1)),
      sort: index + 1,
    }))
  }
  if (tag.type === 'rfm' && tag.rule.rfmValueNames?.length) {
    return tag.rule.rfmValueNames.slice(0, 8).map((value, index) => ({
      value: value.name,
      count: 9000 + index * 3200,
      rate: 8 + index * 1.8,
      sort: index + 1,
    }))
  }
  if (tag.rule.intervals?.length) {
    return tag.rule.intervals.map((item, index) => ({
      value: item.name,
      count: 12000 + index * 7600,
      rate: 16 + index * 6.5,
      sort: index + 1,
    }))
  }
  return [
    { value: tag.valueType.includes('decimal') ? '0.0-0.3' : '有值', count: 68200, rate: 62.4, sort: 1 },
    { value: '空值', count: 41080, rate: 37.6, sort: 2 },
  ]
}

const registerTag = (tag: TagDefinition, content: string): void => {
  tagDefinitions.unshift(tag)
  tagRuleVersions.unshift({
    id: makeId('rule-version'),
    tagId: tag.id,
    versionNo: 1,
    rule: tag.rule,
    isCurrent: true,
    createdBy: tag.createdBy,
    createdAt: tag.createdAt,
  })
  tagPermissions.unshift({
    id: makeId('perm'),
    tagId: tag.id,
    principalType: 'group',
    principalId: 'group-user-insight',
    principalName: '用户洞察团队',
    permission: 'manage',
    grantedBy: '当前用户',
    grantedAt: now(),
  })
  const initialDistribution = initialDistributionForTag(tag)
  tagDistributions[tag.id] = initialDistribution
  tagHistories[tag.id] = [
    { date: today(), total: initialDistribution.reduce((sum, item) => sum + item.count, 0), values: initialDistribution.map((item) => ({ value: item.value, count: item.count })) },
  ]
  tagAssessments[tag.id] = {
    lastUsedDays: 0,
    internalUsageCount: 0,
    internalReferenceCount: 0,
    internalQueryCount: 0,
    externalCallCount: 0,
    apiCallCount: 0,
    p95LatencyMs: 0,
    errorRate: 0,
  }
  writeLog(tag.id, 'create', content)
  if (tag.status === 'online') {
    tagRunRecords.unshift(makeRun(tag.id, tag.updateType === 'manual' ? 'manual' : tag.updateType === 'realtime' ? 'realtime' : 'scheduled'))
  }
}

export const getTagPermissions = (): Promise<typeof currentTagPermissions> => resolveMock(currentTagPermissions)

export const getTagCategories = (): Promise<TagCategory[]> => {
  syncCategoryCounts()
  return resolveMock(tagCategories)
}

export const getTagMetadataFields = (): Promise<TagMetadataField[]> =>
  resolveMock(tagMetadataFields.filter((item) => item.status === 'enabled'))

export const getTagTemplates = (): Promise<TagTemplate[]> => resolveMock(tagTemplates)

export const getTags = (filters: Partial<TagListFilters> = {}): Promise<TagDefinition[]> => {
  const keyword = filters.keyword?.trim().toLowerCase()
  let categoryScope: EntityId[] | undefined
  if (filters.categoryId && !filters.ignoreCategory && filters.categoryId !== 'cat-root') {
    categoryScope = [filters.categoryId, ...childCategoryIds(filters.categoryId)]
  }

  const result = tagDefinitions
    .filter((item) => item.status !== 'deleted' && item.permissions.canView)
    .filter((item) => !keyword || [item.name, item.id, item.description, item.rule.summary].join(' ').toLowerCase().includes(keyword))
    .filter((item) => !categoryScope || categoryScope.includes(item.categoryId))
    .filter((item) => !filters.types?.length || filters.types.includes(item.type))
    .filter((item) => !filters.valueTypes?.length || filters.valueTypes.includes(item.valueType))
    .filter((item) => !filters.statuses?.length || filters.statuses.includes(item.status))
    .filter((item) => !filters.runStatuses?.length || filters.runStatuses.includes(latestRunStatus(item)))
    .filter((item) => !filters.creator || filters.creator === 'all' || item.createdBy.name === filters.creator)
    .filter((item) => matchMetadataFilters(item, filters.metadata))
  return resolveMock(result.map((item) => ({ ...item, latestRunStatus: latestRunStatus(item) })))
}

export const getTagDetail = async (tagId: EntityId): Promise<TagDetailBundle | undefined> => {
  const tag = tagDefinitions.find((item) => item.id === tagId && item.status !== 'deleted' && item.permissions.canView)
  if (!tag) {
    return resolveMock(undefined)
  }
  return resolveMock({
    tag,
    ruleVersions: tagRuleVersions.filter((item) => item.tagId === tagId),
    runs: tagRunRecords.filter((item) => item.tagId === tagId),
    permissions: tagPermissions.filter((item) => item.tagId === tagId),
    distributions: tagDistributions[tagId] ?? [],
    history: tagHistories[tagId] ?? [],
    lineage: lineageForTag(tag),
    assessment: tagAssessments[tagId] ?? emptyAssessment,
    operationLogs: tagOperationLogs.filter((item) => item.tagId === tagId),
  })
}

export const getTagDependencyRisks = async (tagIds: EntityId[]): Promise<TagDependencyRisk[]> => {
  const risks = tagIds
    .map((tagId) => tagDefinitions.find((item) => item.id === tagId && item.status !== 'deleted'))
    .filter((tag): tag is TagDefinition => Boolean(tag))
    .map((tag) => {
      const resources = lineageForTag(tag).filter((item) => item.direction === 'downstream')
      return {
        tagId: tag.id,
        tagName: tag.name,
        downstreamCount: resources.length,
        resources,
        message: resources.length ? `下架后 ${resources.length} 个下游资源会被标记为上游不可用` : '暂无下游依赖风险',
      }
    })
    .filter((risk) => risk.downstreamCount > 0)
  return resolveMock(risks)
}

export const createTag = async (payload: TagCreatePayload): Promise<TagDefinition> => {
  const error = validateTagPayload(payload)
  if (error) {
    throw new Error(error)
  }
  if (payload.type === 'import' && !payload.saveAsDraft) {
    const importFields = payload.rule.importFields ?? []
    const created = importFields.map((field) => buildTag({
      ...payload,
      name: field.tagName,
      valueType: field.valueType,
      categoryId: field.categoryId,
      rule: {
        ...payload.rule,
        summary: `从数据源「${payload.rule.dataSource}」字段「${field.sourceField}」导入生成标签，强制转换${field.forceCast ? '开启' : '关闭'}。`,
        importFields: [field],
      },
    }))
    created.forEach((tag) => registerTag(tag, '通过导入标签流程批量创建字段标签。'))
    syncCategoryCounts()
    return resolveMock(created[0]!)
  }
  const tag = buildTag(payload)
  registerTag(tag, payload.saveAsDraft ? '保存草稿标签。' : '创建标签并上架。')
  syncCategoryCounts()
  return resolveMock(tag)
}

export const updateTag = async (tagId: EntityId, payload: TagCreatePayload): Promise<TagDefinition> => {
  const index = tagDefinitions.findIndex((item) => item.id === tagId)
  if (index < 0) {
    throw new Error('标签不存在')
  }
  const error = validateTagPayload(payload, tagId)
  if (error) {
    throw new Error(error)
  }
  const current = tagDefinitions[index]!
  const next: TagDefinition = {
    ...current,
    name: payload.name.trim(),
    description: payload.description.trim(),
    valueType: payload.valueType,
    categoryId: payload.categoryId,
    computeType: payload.computeType,
    updateType: payload.computeType === 'realtime' ? 'realtime' : payload.updateType,
    frequency: payload.computeType === 'realtime' ? { unit: 'realtime' } : payload.frequency,
    emptyValueStrategy: payload.emptyValueStrategy,
    ttl: payload.updateType === 'manual' ? { strategy: 'system' } : payload.ttl,
    onlineServiceEnabled: payload.onlineServiceEnabled,
    valueSaveMode: payload.valueSaveMode,
    metadata: payload.metadata,
    rule: payload.rule,
    updatedAt: now(),
  }
  tagDefinitions.splice(index, 1, next)
  tagRuleVersions.filter((item) => item.tagId === tagId).forEach((item) => {
    item.isCurrent = false
  })
  tagRuleVersions.unshift({
    id: makeId('rule-version'),
    tagId,
    versionNo: tagRuleVersions.filter((item) => item.tagId === tagId).length + 1,
    rule: payload.rule,
    isCurrent: true,
    createdBy: next.createdBy,
    createdAt: next.updatedAt,
  })
  writeLog(tagId, 'edit', '编辑标签基础信息、规则或元信息。规则修改默认影响后续分区。')
  syncCategoryCounts()
  return resolveMock(next)
}

export const copyTag = async (tagId: EntityId): Promise<TagDefinition> => {
  const source = tagDefinitions.find((item) => item.id === tagId)
  if (!source) {
    throw new Error('标签不存在')
  }
  const copied = buildTag({
    name: `${source.name}_副本`,
    description: source.description,
    type: source.type,
    valueType: source.valueType,
    categoryId: source.categoryId,
    computeType: source.computeType,
    updateType: source.updateType === 'realtime' ? 'scheduled' : source.updateType,
    frequency: source.frequency,
    emptyValueStrategy: source.emptyValueStrategy,
    ttl: source.ttl,
    onlineServiceEnabled: source.onlineServiceEnabled,
    valueSaveMode: source.valueSaveMode,
    metadata: source.metadata,
    rule: source.rule,
    saveAsDraft: true,
  })
  tagDefinitions.unshift(copied)
  writeLog(copied.id, 'create', `复制自「${source.name}」，未复制运行记录、授权记录和上下架状态。`)
  syncCategoryCounts()
  return resolveMock(copied)
}

export const toggleFavorite = async (tagId: EntityId): Promise<TagDefinition> => {
  const tag = tagDefinitions.find((item) => item.id === tagId)
  if (!tag) {
    throw new Error('标签不存在')
  }
  tag.favorite = !tag.favorite
  return resolveMock(tag)
}

export const shelveTags = async (tagIds: EntityId[], status: Extract<TagStatus, 'online' | 'offline'>): Promise<TagBulkResult> => {
  const result: TagBulkResult = { successIds: [], failures: [] }
  tagIds.forEach((id) => {
    const tag = tagDefinitions.find((item) => item.id === id)
    if (!tag) {
      result.failures.push({ tagId: id, reason: '标签不存在' })
      return
    }
    if (status === 'online' && tag.status === 'online') {
      result.failures.push({ tagId: id, reason: '标签已上架' })
      return
    }
    if (status === 'offline' && tag.status !== 'online') {
      result.failures.push({ tagId: id, reason: '仅已上架标签可下架' })
      return
    }
    tag.status = status
    tag.updatedAt = now()
    if (status === 'online') {
      tagRunRecords.unshift(makeRun(id, tag.updateType === 'manual' ? 'manual' : tag.updateType === 'realtime' ? 'realtime' : 'scheduled', 'waiting'))
      writeLog(id, 'online', '上架标签，恢复计算和下游使用。')
    } else {
      tagRunRecords
        .filter((run) => run.tagId === id && ['running', 'waiting'].includes(run.status))
        .forEach((run) => {
          run.status = 'stopped'
          run.endedAt = now()
        })
      writeLog(id, 'offline', '下架标签，暂停任务并标记下游依赖不可用。')
    }
    result.successIds.push(id)
  })
  return resolveMock(result)
}

export const deleteTag = async (tagId: EntityId, confirmName: string): Promise<void> => {
  const tag = tagDefinitions.find((item) => item.id === tagId)
  if (!tag) {
    throw new Error('标签不存在')
  }
  if (tag.name !== confirmName.trim()) {
    throw new Error('请输入标签名称确认删除')
  }
  tag.status = 'deleted'
  tag.updatedAt = now()
  writeLog(tagId, 'delete', '删除标签，元信息清除且不可恢复。')
  syncCategoryCounts()
  return resolveMock(undefined)
}

export const moveTagsCategory = async (tagIds: EntityId[], categoryId: EntityId): Promise<TagBulkResult> => {
  const category = tagCategories.find((item) => item.id === categoryId)
  if (!category) {
    throw new Error('目标分类不存在')
  }
  if (!category.canEdit && !category.system) {
    throw new Error('你暂无该目录编辑权限，请选择其他目录或联系管理员授权')
  }
  const result: TagBulkResult = { successIds: [], failures: [] }
  tagIds.forEach((id) => {
    const tag = tagDefinitions.find((item) => item.id === id)
    if (tag?.permissions.canEdit) {
      tag.categoryId = categoryId
      tag.updatedAt = now()
      writeLog(id, 'move', `移动标签到「${category.name}」。`)
      result.successIds.push(id)
    } else {
      result.failures.push({ tagId: id, reason: '无标签编辑权限' })
    }
  })
  syncCategoryCounts()
  return resolveMock(result)
}

export const createCategory = async (name: string, parentId: EntityId): Promise<TagCategory> => {
  const parent = tagCategories.find((item) => item.id === parentId)
  if (!parent) {
    throw new Error('父级分类不存在')
  }
  if (parent.level >= 4) {
    throw new Error('已达到最大目录层级')
  }
  const error = validateCategoryName(name, parentId)
  if (error) {
    throw new Error(error)
  }
  const category: TagCategory = {
    id: makeId('cat'),
    parentId,
    name: name.trim(),
    level: parent.level + 1,
    sort: tagCategories.filter((item) => item.parentId === parentId).length + 1,
    tagCount: 0,
    system: false,
    canEdit: true,
  }
  tagCategories.push(category)
  return resolveMock(category)
}

export const renameCategory = async (categoryId: EntityId, name: string): Promise<TagCategory> => {
  const category = tagCategories.find((item) => item.id === categoryId)
  if (!category) {
    throw new Error('分类不存在')
  }
  if (category.system) {
    throw new Error('系统默认目录不可重命名')
  }
  const error = validateCategoryName(name, category.parentId, categoryId)
  if (error) {
    throw new Error(error)
  }
  category.name = name.trim()
  return resolveMock(category)
}

export const deleteCategory = async (categoryId: EntityId): Promise<void> => {
  const category = tagCategories.find((item) => item.id === categoryId)
  if (!category) {
    throw new Error('分类不存在')
  }
  if (category.system) {
    throw new Error('系统默认目录不可删除')
  }
  const hasChild = tagCategories.some((item) => item.parentId === categoryId)
  const hasTags = tagDefinitions.some((item) => item.categoryId === categoryId && item.status !== 'deleted')
  if (hasChild || hasTags) {
    throw new Error('当前分类下存在标签或子分类，请先移动或删除后再操作')
  }
  const index = tagCategories.findIndex((item) => item.id === categoryId)
  tagCategories.splice(index, 1)
  return resolveMock(undefined)
}

export const reorderCategories = async (orderedIds: EntityId[]): Promise<TagCategory[]> => {
  const orderedCategories = orderedIds.map((id) => tagCategories.find((item) => item.id === id))
  if (orderedCategories.some((item) => !item)) {
    throw new Error('目录排序失败：目标目录不存在')
  }
  const parentIds = new Set(orderedCategories.map((item) => item!.parentId))
  if (parentIds.size !== 1 || orderedCategories.some((item) => item!.system)) {
    throw new Error('目录排序失败：仅支持同一父级下的普通目录排序')
  }
  orderedIds.forEach((id, index) => {
    const category = tagCategories.find((item) => item.id === id)
    if (category && !category.system) {
      category.sort = index + 1
    }
  })
  return getTagCategories()
}

export const estimateTag = async (payload: TagCreatePayload): Promise<TagEstimateResult> => {
  const error = validateTagPayload({ ...payload, name: payload.name || '临时预估标签' })
  if (error && !error.includes('同名标签')) {
    throw new Error(error)
  }
  const values = payload.rule.values?.map((item, index) => ({
    value: item.name,
    count: 22000 + index * 8700,
    rate: 18 + index * 7.4,
    sort: index + 1,
  })) ?? payload.rule.rfmValueNames?.map((item, index) => ({
    value: item.name,
    count: 9000 + index * 2800,
    rate: 6 + index * 1.6,
    sort: index + 1,
  })) ?? payload.rule.intervals?.map((item, index) => ({
    value: item.name,
    count: 16000 + index * 7300,
    rate: 14 + index * 5.2,
    sort: index + 1,
  })) ?? (payload.type === 'import'
    ? (payload.rule.importFields ?? []).map((item, index) => ({
      value: item.tagName,
      count: 52000 - index * 3200,
      rate: 48 - index * 4,
      sort: index + 1,
    }))
    : [
      { value: payload.valueType.includes('decimal') ? '0.0-0.3' : payload.type === 'preference' ? 'Top 值样例' : '有值', count: 68200, rate: 62.4, sort: 1 },
      { value: '空值', count: 41080, rate: 37.6, sort: 2 },
    ])
  return resolveMock({
    total: values.reduce((sum, item) => sum + item.count, 0),
    emptyCount: 41080,
    coverageRate: 62.4,
    values,
    message: '预估结果仅用于创建前判断，不写入标签结果表。',
  })
}

const makeRun = (
  tagId: EntityId,
  triggerType: TagRunRecord['triggerType'],
  status: TagRunRecord['status'] = 'running',
): TagRunRecord => ({
  id: makeId('run'),
  tagId,
  runDate: today(),
  partitionDate: today(),
  triggerType,
  status,
  startedAt: now(),
  endedAt: ['success', 'failed', 'stopped'].includes(status) ? now() : undefined,
  durationMs: status === 'success' ? 88000 : undefined,
  operator: triggerType === 'scheduled' || triggerType === 'realtime' ? '系统调度' : '当前用户',
  errorMessage: status === 'failed' ? '预估失败，请检查规则配置或稍后重试' : undefined,
  logUrl: `/mock/logs/${tagId}`,
})

export const runTag = async (tagId: EntityId, range: { start: string; end: string }, overwrite: boolean): Promise<TagRunRecord> => {
  const tag = tagDefinitions.find((item) => item.id === tagId)
  if (!tag) {
    throw new Error('标签不存在')
  }
  if (tag.status !== 'online') {
    throw new Error('草稿或已下架标签不可运行')
  }
  const run = makeRun(tagId, 'manual')
  run.runDate = range.start
  run.partitionDate = range.end
  run.errorMessage = overwrite ? undefined : run.errorMessage
  tagRunRecords.unshift(run)
  writeLog(tagId, 'rerun', `手动运行标签，日期范围 ${range.start} 至 ${range.end}。`)
  return resolveMock(run)
}

export const batchRunTags = async (tagIds: EntityId[], range: { start: string; end: string }): Promise<TagBulkResult> => {
  const result: TagBulkResult = { successIds: [], failures: [] }
  tagIds.forEach((id) => {
    const tag = tagDefinitions.find((item) => item.id === id)
    if (!tag || tag.status !== 'online' || !tag.permissions.canRun) {
      result.failures.push({ tagId: id, reason: '标签不支持运行或无运行权限' })
      return
    }
    const run = makeRun(id, 'manual')
    run.runDate = range.start
    run.partitionDate = range.end
    tagRunRecords.unshift(run)
    result.successIds.push(id)
  })
  return resolveMock(result)
}

export const stopRun = async (runId: EntityId): Promise<TagRunRecord> => {
  const run = tagRunRecords.find((item) => item.id === runId)
  if (!run) {
    throw new Error('运行记录不存在')
  }
  if (!['running', 'waiting'].includes(run.status)) {
    throw new Error('仅运行中或等待中的任务可停止')
  }
  run.status = 'stopped'
  run.endedAt = now()
  return resolveMock(run)
}

export const rerun = async (runId: EntityId): Promise<TagRunRecord> => {
  const run = tagRunRecords.find((item) => item.id === runId)
  if (!run) {
    throw new Error('运行记录不存在')
  }
  const next = makeRun(run.tagId, 'rerun')
  next.runDate = run.runDate
  next.partitionDate = run.partitionDate
  tagRunRecords.unshift(next)
  return resolveMock(next)
}

export const advanceMockRuns = async (): Promise<TagRunRecord[]> => {
  tagRunRecords
    .filter((run) => ['running', 'waiting'].includes(run.status))
    .forEach((run) => {
      run.status = 'success'
      run.endedAt = now()
      run.durationMs = 86000 + Math.round(Math.random() * 42000)
      const tag = tagDefinitions.find((item) => item.id === run.tagId)
      if (tag) {
        tag.latestDataDate = run.partitionDate
        tag.latestDurationMs = run.durationMs
      }
    })
  return resolveMock(tagRunRecords)
}

export const refreshTagHistory = async (tagId: EntityId, grain: 'day' | 'week' | 'month'): Promise<NonNullable<TagDetailBundle['history']>> => {
  const step = grain === 'month' ? 30 : grain === 'week' ? 7 : 1
  tagHistories[tagId] = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - index) * step)
    return {
      date: date.toISOString().slice(0, 10),
      total: 210000 + index * (grain === 'day' ? 5200 : grain === 'week' ? 16800 : 32800),
      values: [
        { value: '高意向', count: 42000 + index * 1200 },
        { value: '中意向', count: 82000 + index * 1500 },
        { value: '低意向', count: 86000 + index * 2100 },
      ],
    }
  })
  writeLog(tagId, 'metadata', `刷新${grain === 'day' ? '日' : grain === 'week' ? '周' : '月'}粒度历史趋势。`)
  return resolveMock(tagHistories[tagId] ?? [])
}

export const restoreRuleVersion = async (tagId: EntityId, versionId: EntityId): Promise<TagDefinition> => {
  const tag = tagDefinitions.find((item) => item.id === tagId)
  const version = tagRuleVersions.find((item) => item.id === versionId && item.tagId === tagId)
  if (!tag || !version) {
    throw new Error('规则版本不存在')
  }
  tagRuleVersions.filter((item) => item.tagId === tagId).forEach((item) => {
    item.isCurrent = false
  })
  version.isCurrent = true
  tag.rule = clone(version.rule)
  tag.updatedAt = now()
  writeLog(tagId, 'edit', `恢复到规则版本 V${version.versionNo}。`)
  return resolveMock(tag)
}

export const savePermissions = async (tagId: EntityId, rows: Array<Omit<TagPermission, 'id' | 'tagId' | 'grantedBy' | 'grantedAt'>>): Promise<TagPermission[]> => {
  for (let index = tagPermissions.length - 1; index >= 0; index -= 1) {
    if (tagPermissions[index]?.tagId === tagId) {
      tagPermissions.splice(index, 1)
    }
  }
  rows.forEach((row) => {
    tagPermissions.push({
      ...row,
      id: makeId('perm'),
      tagId,
      grantedBy: '当前用户',
      grantedAt: now(),
    })
  })
  writeLog(tagId, 'authorize', '更新标签授权对象和权限级别。')
  return resolveMock(tagPermissions.filter((item) => item.tagId === tagId))
}

export const createMetadataField = async (draft: Pick<TagMetadataField, 'name' | 'dataType' | 'required' | 'enumValues' | 'quickFilterEnabled' | 'description'>): Promise<TagMetadataField> => {
  if (!draft.name.trim()) {
    throw new Error('名称必填，不可重复')
  }
  if (tagMetadataFields.some((item) => item.name === draft.name.trim())) {
    throw new Error('名称必填，不可重复')
  }
  if (['single_select', 'multi_select'].includes(draft.dataType) && draft.enumValues.length === 0) {
    throw new Error('单选/多选元信息必须配置枚举值')
  }
  if (draft.quickFilterEnabled) {
    const quickCount = tagMetadataFields.filter((item) => item.quickFilterEnabled && item.status === 'enabled').length
    if (quickCount >= 3) {
      throw new Error('最多支持配置 3 个快捷条件')
    }
    if (draft.dataType === 'text') {
      throw new Error('只有枚举型元信息字段可设置为快捷筛选条件')
    }
  }
  const field: TagMetadataField = {
    id: makeId('meta'),
    projectId: 'project-demo',
    name: draft.name.trim(),
    dataType: draft.dataType,
    required: draft.required,
    enumValues: draft.enumValues,
    quickFilterEnabled: draft.quickFilterEnabled,
    description: draft.description,
    createdBy: '当前用户',
    createdAt: now(),
    status: 'enabled',
  }
  tagMetadataFields.push(field)
  return resolveMock(field)
}

export const updateMetadataField = async (fieldId: EntityId, patch: Partial<TagMetadataField>): Promise<TagMetadataField> => {
  const field = tagMetadataFields.find((item) => item.id === fieldId)
  if (!field) {
    throw new Error('元信息字段不存在')
  }
  if (patch.name !== undefined) {
    const trimmed = patch.name.trim()
    if (!trimmed || tagMetadataFields.some((item) => item.id !== fieldId && item.name === trimmed)) {
      throw new Error('名称必填，不可重复')
    }
    patch.name = trimmed
  }
  if (patch.dataType && ['single_select', 'multi_select'].includes(patch.dataType) && !patch.enumValues?.length) {
    throw new Error('单选/多选元信息必须配置枚举值')
  }
  if (patch.quickFilterEnabled) {
    const quickCount = tagMetadataFields.filter((item) => item.id !== fieldId && item.quickFilterEnabled && item.status === 'enabled').length
    if (quickCount >= 3) {
      throw new Error('最多支持配置 3 个快捷条件')
    }
    const nextType = patch.dataType ?? field.dataType
    if (nextType === 'text') {
      throw new Error('只有枚举型元信息字段可设置为快捷筛选条件')
    }
  }
  Object.assign(field, patch)
  return resolveMock(field)
}

export const deleteMetadataField = async (fieldId: EntityId): Promise<void> => {
  const field = tagMetadataFields.find((item) => item.id === fieldId)
  if (field) {
    field.status = 'disabled'
  }
  return resolveMock(undefined)
}

export const enableTemplate = async (templateIds: EntityId[]): Promise<TagBulkResult> => {
  const result: TagBulkResult = { successIds: [], failures: [] }
  templateIds.forEach((id) => {
    const template = tagTemplates.find((item) => item.id === id)
    if (!template) {
      result.failures.push({ tagId: id, reason: '模板不存在' })
      return
    }
    if (template.status === 'created') {
      result.failures.push({ tagId: id, reason: '已创建过的模板不可重复创建' })
      return
    }
    const tag = buildTag({
      name: template.name,
      description: template.description,
      type: template.tagType,
      valueType: template.tagType === 'preference' ? 'multi_text' : 'text',
      categoryId: template.lifecycleTemplate ? 'cat-lifecycle' : 'cat-behavior',
      computeType: 'offline',
      updateType: 'scheduled',
      frequency: { unit: 'day', time: '08:00' },
      emptyValueStrategy: 'empty',
      ttl: { strategy: 'system', unit: 'day' },
      onlineServiceEnabled: false,
      valueSaveMode: 'single',
      metadata: {
        'meta-owner': '用户洞察团队',
        'meta-source': '行业模板',
        'meta-sensitive': '内部',
        'meta-channel': ['站内触达'],
      },
      rule: {
        type: template.tagType,
        summary: template.ruleSummary,
        lifecycleModel: template.lifecycleTemplate ? 'custom' : undefined,
      },
    })
    tag.fromTemplate = true
    tagDefinitions.unshift(tag)
    template.status = 'created'
    result.successIds.push(tag.id)
  })
  syncCategoryCounts()
  return resolveMock(result)
}

export const parseSql = async (sql: string): Promise<TagSqlParseResult> => {
  if (!sql.trim()) {
    return resolveMock({ ok: false, message: 'SQL 解析失败，请根据错误信息修改后重试', columns: [], previewRows: [] })
  }
  if (/\b(drop|delete|insert|update|truncate|alter)\b/i.test(sql)) {
    return resolveMock({ ok: false, message: 'SQL 不允许执行危险语句', columns: [], previewRows: [] })
  }
  if (!/select/i.test(sql) || !/user_id|subject_id/i.test(sql) || !/tag_value/i.test(sql)) {
    return resolveMock({
      ok: false,
      message: 'SQL 必须返回主体 ID 字段和标签值字段',
      columns: [],
      previewRows: [],
    })
  }
  return resolveMock({
    ok: true,
    message: '解析通过，返回字段可映射到当前主体。',
    columns: [
      { name: 'user_id', type: 'string' },
      { name: 'tag_value', type: 'string' },
    ],
    previewRows: [
      { user_id: 'u_10001', tag_value: '高价值' },
      { user_id: 'u_10002', tag_value: '中价值' },
      { user_id: 'u_10003', tag_value: '高价值' },
    ],
  })
}

export const formatSql = (sql: string): Promise<string> => {
  const formatted = sql
    .replace(/\s+/g, ' ')
    .replace(/\bselect\b/i, 'SELECT')
    .replace(/\bfrom\b/i, '\nFROM')
    .replace(/\bwhere\b/i, '\nWHERE')
    .replace(/\blimit\b/i, '\nLIMIT')
  return resolveMock(formatted.trim())
}

export const previewUpload = async (fileName: string, valueType: TagValueType, fileText?: string): Promise<TagUploadResult> => {
  if (!/\.(csv|xlsx)$/i.test(fileName)) {
    throw new Error('上传文件不符合模板要求，请下载模板后重新上传')
  }
  if (/\.csv$/i.test(fileName) && fileText !== undefined) {
    const lines = fileText.split(/\r?\n/).filter((line) => line.trim())
    const header = lines[0]
      ?.split(/,|\t/)
      .map((item) => item.trim().replace(/^"|"$/g, '').toLowerCase()) ?? []
    const hasSubject = header.includes('user_id') || header.includes('member_id') || header.includes('subject_id')
    const hasValue = header.includes('tag_value')
    if (!hasSubject || !hasValue) {
      throw new Error('上传文件结构错误：首行必须包含 user_id 或 member_id，以及 tag_value 字段')
    }
    if (lines.length < 2) {
      throw new Error('上传文件结构错误：文件内至少需要一行标签数据')
    }
    const invalidWidthLine = lines.slice(1).findIndex((line) => line.split(/,|\t/).length < header.length)
    if (invalidWidthLine >= 0) {
      throw new Error(`上传文件结构错误：第 ${invalidWidthLine + 2} 行字段数量与表头不一致`)
    }
  }
  return resolveMock({
    successRows: valueType === 'date' ? 948 : 982,
    failedRows: valueType === 'date' ? 12 : 3,
    errors: [
      { row: 17, reason: '标签值无法转换为所选类型' },
      { row: 42, reason: '上传用户 ID 重复' },
    ],
  })
}

export const exportUploadErrorCsv = (result: TagUploadResult): Promise<string> => {
  const rows = [
    ['行号', '失败原因'],
    ...result.errors.map((item) => [String(item.row), item.reason]),
  ]
  return resolveMock(rows.map((row) => row.join(',')).join('\n'))
}

export const createModelOutputTag = async (taskId: EntityId): Promise<TagDefinition> => {
  const existing = tagDefinitions.find((item) => item.rule.modelTaskId === taskId && item.status !== 'deleted')
  if (existing) {
    return resolveMock(existing)
  }
  const tag = buildTag({
    name: '模型输出标签-流失风险',
    description: '由可视化建模输出节点回流到标签体系。',
    type: 'model',
    valueType: 'decimal',
    categoryId: 'cat-uncategorized',
    computeType: 'offline',
    updateType: 'manual',
    frequency: { unit: 'day', time: '08:00' },
    emptyValueStrategy: 'empty',
    ttl: { strategy: 'system' },
    onlineServiceEnabled: false,
    valueSaveMode: 'single',
    metadata: {
      'meta-owner': '数据平台团队',
      'meta-source': '数据模型',
      'meta-sensitive': '内部',
      'meta-channel': ['API'],
    },
    rule: {
      type: 'model',
      summary: '由可视化建模输出节点写入标签体系，结果为 0-1 风险分。',
      modelTaskId: taskId,
    },
  })
  tagDefinitions.unshift(tag)
  writeLog(tag.id, 'create', `可视化建模任务 ${taskId} 输出为标签。`)
  syncCategoryCounts()
  return resolveMock(tag)
}

export const bulkRename = async (renames: Array<{ tagId: EntityId; name: string }>): Promise<TagBulkResult> => {
  const result: TagBulkResult = { successIds: [], failures: [] }
  renames.forEach(({ tagId, name }) => {
    const tag = tagDefinitions.find((item) => item.id === tagId)
    if (!tag) {
      result.failures.push({ tagId, reason: '标签不存在' })
      return
    }
    if (!tag.permissions.canEdit) {
      result.failures.push({ tagId, reason: '无标签编辑权限' })
      return
    }
    if (!name.trim() || tagDefinitions.some((item) => item.id !== tagId && item.name === name.trim())) {
      result.failures.push({ tagId, reason: '新名称为空或重复' })
      return
    }
    tag.name = name.trim()
    tag.updatedAt = now()
    result.successIds.push(tagId)
  })
  return resolveMock(result)
}

export const bulkUpdateMetadata = async (tagIds: EntityId[], metadata: Record<EntityId, string | string[]>): Promise<TagBulkResult> => {
  const result: TagBulkResult = { successIds: [], failures: [] }
  tagIds.forEach((id) => {
    const tag = tagDefinitions.find((item) => item.id === id)
    if (!tag || !tag.permissions.canEdit) {
      result.failures.push({ tagId: id, reason: '无标签编辑权限' })
      return
    }
    tag.metadata = { ...tag.metadata, ...metadata }
    tag.updatedAt = now()
    result.successIds.push(id)
  })
  return resolveMock(result)
}

export const setTagsVisible = async (tagIds: EntityId[], visible: boolean): Promise<TagBulkResult> => {
  const result: TagBulkResult = { successIds: [], failures: [] }
  tagIds.forEach((id) => {
    const tag = tagDefinitions.find((item) => item.id === id)
    if (!tag) {
      result.failures.push({ tagId: id, reason: '标签不存在' })
      return
    }
    tag.visible = visible
    result.successIds.push(id)
  })
  return resolveMock(result)
}

export const configureOnlineService = async (tagId: EntityId, enabled: boolean): Promise<TagDefinition> => {
  const tag = tagDefinitions.find((item) => item.id === tagId)
  if (!tag) {
    throw new Error('标签不存在')
  }
  if (!tag.permissions.canEdit) {
    throw new Error('无标签编辑权限')
  }
  tag.onlineServiceEnabled = enabled
  tag.updatedAt = now()
  writeLog(tagId, 'edit', enabled ? '开启在线服务配置。' : '关闭在线服务配置。')
  return resolveMock(tag)
}

export const setTagTtl = async (tagId: EntityId, ttl: TagTtlConfig): Promise<TagDefinition> => {
  const tag = tagDefinitions.find((item) => item.id === tagId)
  if (!tag) {
    throw new Error('标签不存在')
  }
  if (!tag.permissions.canEdit) {
    throw new Error('无标签编辑权限')
  }
  if (tag.updateType === 'manual') {
    throw new Error('手动更新标签不展示 TTL 配置')
  }
  tag.ttl = ttl
  tag.updatedAt = now()
  writeLog(tagId, 'metadata', ttl.strategy === 'system' ? '设置保留策略为与系统一致。' : `设置保留策略为 ${ttl.value ?? 0} ${ttl.unit ?? tag.frequency.unit}。`)
  return resolveMock(tag)
}

export const syncTagsToProject = async (tagIds: EntityId[], projectId: EntityId): Promise<TagBulkResult> => {
  const result: TagBulkResult = { successIds: [], failures: [] }
  tagIds.forEach((id) => {
    const tag = tagDefinitions.find((item) => item.id === id)
    if (!tag || tag.status !== 'online' || tag.updateType === 'realtime' || tag.syncedProjectIds.includes(projectId)) {
      result.failures.push({ tagId: id, reason: '实时标签、未上架标签、已同步标签或草稿态标签不支持同步' })
      return
    }
    tag.syncedProjectIds.push(projectId)
    result.successIds.push(id)
  })
  return resolveMock(result)
}

export const exportTaskCsv = async (): Promise<string> => {
  const rows = [
    ['标签名称', '标签 ID', '创建方式', '值类型', '上下架状态', '更新方式', '最新数据时间'],
    ...tagDefinitions
      .filter((item) => item.status !== 'deleted')
      .map((item) => [
        item.name,
        item.id,
        tagTypeLabels[item.type],
        tagValueTypeLabels[item.valueType],
        tagStatusLabels[item.status],
        item.updateType,
        item.latestDataDate ?? '',
      ]),
  ]
  return resolveMock(rows.map((row) => row.join(',')).join('\n'))
}

export const buildDefaultCreatePayload = (type: TagType): TagCreatePayload => {
  const realtimeCapable = ['rule', 'statistic', 'first_last', 'priority', 'calculation', 'lifecycle', 'sql'].includes(type)
  const valueType: TagValueType = type === 'statistic' || type === 'first_last' ? 'integer' : type === 'calculation' || type === 'model' ? 'decimal' : type === 'preference' ? 'multi_text' : 'text'
  const updateType = type === 'manual' ? 'manual' : 'scheduled'
  const frequency: TagFrequencyConfig = { unit: 'day', time: '08:00' }
  const ttl: TagTtlConfig = updateType === 'manual' ? { strategy: 'system' } : { strategy: 'system', unit: 'day' }
  const defaultFilterGroup = (prefix: string): TagRuleGroup => ({
    id: `${prefix}-filter`,
    logic: 'and',
    conditions: [
      {
        id: `${prefix}-condition`,
        sourceType: type === 'rfm' ? 'detail' : 'behavior',
        sourceName: type === 'rfm' ? '明细数据' : '行为数据',
        field: type === 'rfm' ? '订单金额' : '浏览商品详情页',
        operator: '大于等于',
        value: '1',
        dateMode: 'dynamic',
        dateRange: '最近 30 天，不包含今天',
        behaviorPath: type === 'rfm' ? undefined : 'App 启动 > 浏览详情 > 留资',
        aggregateMethod: '不聚合',
      },
    ],
    groups: [],
  })
  const summaryByType: Partial<Record<TagType, string>> = {
    statistic: '统计选定数据源在指定时间窗口内的行为次数、天数或金额。',
    first_last: '按时间排序取首次或末次事件，输出具体时间点或距今天数。',
    preference: '按主体和偏好对象分组排序，输出 Top N 多值标签。',
    priority: '按字段优先级取第一个非空值。',
    calculation: '基于已选字段进行表达式运算。',
    rfm: '基于 R、F、M 指标生成用户价值类型。',
    import: '从指定数据源选择字段批量生成标签。',
    manual: '通过 CSV/XLSX 上传主体 ID 与标签值。',
    sql: '使用 SQL 返回主体 ID 和标签值字段。',
  }
  return {
    name: '',
    description: '',
    type,
    valueType,
    categoryId: 'cat-uncategorized',
    computeType: realtimeCapable ? 'offline' : 'offline',
    updateType,
    frequency,
    emptyValueStrategy: 'empty',
    ttl,
    onlineServiceEnabled: false,
    valueSaveMode: valueType.startsWith('multi') ? 'multi' : 'single',
    metadata: {
      'meta-owner': '用户洞察团队',
      'meta-source': '运营定义',
      'meta-sensitive': '内部',
      'meta-channel': [],
    },
    rule: {
      type,
      summary: summaryByType[type] ?? '',
      sourceType: ['statistic', 'first_last', 'preference'].includes(type) ? 'behavior' : type === 'rfm' ? 'detail' : undefined,
      dataSource: type === 'import' ? '会员主数据表' : type === 'manual' ? 'manual_tag_upload.csv' : ['statistic', 'first_last', 'preference'].includes(type) ? '行为事件表' : type === 'rfm' ? '订单明细表' : undefined,
      outputFeature: ['statistic', 'first_last', 'preference'].includes(type) ? '按主体 ID 输出标签值' : undefined,
      dateRange: ['statistic', 'first_last', 'preference'].includes(type) ? '最近 30 天，不包含今天' : undefined,
      eventName: ['statistic', 'first_last', 'preference'].includes(type) ? '浏览商品详情页' : undefined,
      detailTable: ['statistic', 'first_last', 'preference'].includes(type) ? '订单明细表' : undefined,
      attributeTable: ['statistic', 'first_last', 'preference'].includes(type) ? '用户属性宽表' : undefined,
      timeField: type === 'first_last' ? 'event_time' : undefined,
      targetField: type === 'statistic' ? 'event_id' : undefined,
      filterGroup: ['statistic', 'first_last', 'preference', 'calculation', 'rfm'].includes(type) ? defaultFilterGroup(type) : undefined,
      excludeGroup: ['statistic', 'first_last', 'preference', 'calculation', 'rfm'].includes(type) ? { id: `${type}-exclude`, logic: 'or', conditions: [], groups: [] } : undefined,
      aggregateMethod: type === 'statistic' ? '总次数' : undefined,
      aggregateField: type === 'statistic' ? 'amount' : undefined,
      distinctField: type === 'statistic' ? 'order_id' : undefined,
      postAggregateOperator: type === 'statistic' ? '大于等于' : undefined,
      postAggregateValue: type === 'statistic' ? '1' : undefined,
      behaviorPath: ['statistic', 'first_last', 'preference'].includes(type) ? 'App 启动 > 浏览详情 > 留资' : undefined,
      statisticMethod: type === 'statistic' ? '天数' : type === 'preference' ? '出现次数最多' : undefined,
      firstLastMode: type === 'first_last' ? 'first' : undefined,
      outputMode: type === 'first_last' ? 'days_since' : undefined,
      outputAttribute: type === 'first_last' ? 'channel' : undefined,
      topN: type === 'preference' ? 3 : undefined,
      sortMode: type === 'preference' ? 'count_desc' : undefined,
      preferenceMetric: type === 'preference' ? 'count_most' : undefined,
      preferenceField: type === 'preference' ? 'car_series' : undefined,
      tieBreaker: type === 'preference' ? '按属性值字典序' : undefined,
      values: type === 'rule' || type === 'lifecycle' ? [
        {
          id: 'draft-value-1',
          name: type === 'lifecycle' ? '阶段 1' : '标签值 1',
          priority: 1,
          include: defaultFilterGroup('draft-include'),
          exclude: { id: 'draft-exclude', logic: 'or', conditions: [], groups: [] },
        },
        ...(type === 'lifecycle' ? [{
          id: 'draft-value-2',
          name: '阶段 2',
          priority: 2,
          include: defaultFilterGroup('draft-include-2'),
          exclude: { id: 'draft-exclude-2', logic: 'or' as const, conditions: [], groups: [] },
        }] : []),
      ] : undefined,
      selectedFields: type === 'priority' || type === 'calculation' ? [] : undefined,
      assignmentRules: type === 'calculation' ? [] : undefined,
      expression: type === 'calculation' ? 'used_credit / credit_limit' : undefined,
      emptyHandling: type === 'calculation' ? 'discard' : undefined,
      resultBounds: type === 'calculation' ? { min: 0, max: 1 } : undefined,
      fieldBounds: type === 'calculation' ? [] : undefined,
      lifecycleModel: type === 'lifecycle' ? 'custom' : undefined,
      rfmSourceType: type === 'rfm' ? 'detail' : undefined,
      rfmPeriod: type === 'rfm' ? '最近 180 天，不包含今天' : undefined,
      rfmMetrics: type === 'rfm' ? [
        { key: 'R', enabled: true, field: 'last_pay_date', method: '距今天数', compareType: 'average', threshold: '小于等于平均值为高' },
        { key: 'F', enabled: true, field: 'order_count', method: '计数', compareType: 'average', threshold: '大于平均值为高' },
        { key: 'M', enabled: true, field: 'pay_amount', method: '求和', compareType: 'average', threshold: '大于平均值为高' },
      ] : undefined,
      rfmValueNames: type === 'rfm' ? [
        { code: 'HHH', name: '重要价值客户' },
        { code: 'LHH', name: '重要唤回客户' },
        { code: 'HLH', name: '重要深耕客户' },
        { code: 'HHL', name: '重要挽留客户' },
        { code: 'HLL', name: '潜力客户' },
        { code: 'LHL', name: '新客户' },
        { code: 'LLH', name: '一般维持客户' },
        { code: 'LLL', name: '流失客户' },
      ] : undefined,
      sql: type === 'sql' ? "select user_id, '高价值' as tag_value from cdp.orders where amount >= 5000" : undefined,
      sqlFieldMappings: type === 'sql' ? [
        { sourceColumn: 'user_id', targetField: 'subject_id', required: true },
        { sourceColumn: 'tag_value', targetField: 'tag_value', required: true },
        { sourceColumn: 'biz_date', targetField: 'partition_date', required: false },
      ] : undefined,
      manualIdType: type === 'manual' ? 'user_id' : undefined,
      manualDelimiter: type === 'manual' && valueType.startsWith('multi') ? ',' : undefined,
      uploadMode: type === 'manual' ? 'cover' : undefined,
      importFields: type === 'import' ? [
        { id: 'import-level', sourceField: 'level', sourceType: 'string', tagName: '会员等级', categoryId: 'cat-import', valueType: 'text', forceCast: false },
        { id: 'import-city', sourceField: 'city', sourceType: 'string', tagName: '会员城市', categoryId: 'cat-profile', valueType: 'text', forceCast: false },
      ] : undefined,
    },
  }
}

export const tagService = {
  getTagPermissions,
  getTagCategories,
  getTagMetadataFields,
  getTagTemplates,
  getTags,
  getTagDetail,
  getTagDependencyRisks,
  createTag,
  updateTag,
  copyTag,
  toggleFavorite,
  shelveTags,
  deleteTag,
  moveTagsCategory,
  createCategory,
  renameCategory,
  deleteCategory,
  reorderCategories,
  estimateTag,
  runTag,
  batchRunTags,
  stopRun,
  rerun,
  advanceMockRuns,
  refreshTagHistory,
  restoreRuleVersion,
  savePermissions,
  createMetadataField,
  updateMetadataField,
  deleteMetadataField,
  enableTemplate,
  parseSql,
  formatSql,
  previewUpload,
  exportUploadErrorCsv,
  createModelOutputTag,
  bulkRename,
  bulkUpdateMetadata,
  setTagsVisible,
  configureOnlineService,
  setTagTtl,
  syncTagsToProject,
  exportTaskCsv,
  buildDefaultCreatePayload,
}
