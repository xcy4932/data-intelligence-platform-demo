import {
  profileAuditLogs,
  profileBehaviorConfigs,
  profileBehaviorEvents,
  profileBoards,
  profileConditionCatalog,
  profileCurrentUser,
  profileDetailConfigs,
  profileFavorites,
  profileFeatureFlags,
  profileIndividuals,
  profileListConfigs,
  profilePermissionSet,
  profileRelationGraphs,
  profileSubjects,
  profileUserColumnConfigs,
} from '@/mock/profiles'
import type { EntityId } from '@/types/common'
import type {
  ProfileAuditLog,
  ProfileBehaviorConfig,
  ProfileBehaviorEvent,
  ProfileBehaviorPropertyFilter,
  ProfileBehaviorQuery,
  ProfileBehaviorResponse,
  ProfileBoard,
  ProfileCondition,
  ProfileConditionCatalogItem,
  ProfileCustomRule,
  ProfileCustomSearchRequest,
  ProfileDetailConfig,
  ProfileExactSearchRequest,
  ProfileFavorite,
  ProfileIndividual,
  ProfileListColumn,
  ProfileListConfig,
  ProfileLogic,
  ProfilePermissionSet,
  ProfileRelationGraph,
  ProfileSearchResponse,
  ProfileSearchResultRow,
  ProfileSubject,
  ProfileSubjectType,
  ProfileUserColumnConfig,
  ProfileWorkbenchData,
} from '@/types/profile'

const clone = <T>(payload: T): T => (payload === undefined ? payload : (JSON.parse(JSON.stringify(payload)) as T))

const resolveMock = <T>(payload: T, delay = 160): Promise<T> =>
  new Promise((resolve) => {
    globalThis.setTimeout(() => resolve(clone(payload)), delay)
  })

const now = (): string => new Date().toISOString()

const makeId = (prefix: string): string => `${prefix}-${Date.now()}-${Math.round(Math.random() * 10000)}`

const normalize = (value: unknown): string => String(value ?? '').trim().toLowerCase()

const storageKey = 'profile-workbench-state-v2'

let persistentStateHydrated = false

interface PersistedProfileState {
  boards: ProfileBoard[]
  listConfigs: ProfileListConfig[]
  detailConfigs: ProfileDetailConfig[]
  behaviorConfigs: ProfileBehaviorConfig[]
  favorites: ProfileFavorite[]
  userColumnConfigs: ProfileUserColumnConfig[]
  auditLogs: ProfileAuditLog[]
}

function replaceArray<T>(target: T[], source: T[]): void {
  target.splice(0, target.length, ...source)
}

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

function hydratePersistentState(): void {
  if (persistentStateHydrated) {
    return
  }
  persistentStateHydrated = true
  if (!canUseLocalStorage()) {
    return
  }
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) {
      return
    }
    const state = JSON.parse(raw) as Partial<PersistedProfileState>
    if (state.boards?.length) replaceArray(profileBoards, state.boards)
    if (state.listConfigs?.length) replaceArray(profileListConfigs, state.listConfigs)
    if (state.detailConfigs?.length) replaceArray(profileDetailConfigs, state.detailConfigs)
    if (state.behaviorConfigs?.length) replaceArray(profileBehaviorConfigs, state.behaviorConfigs)
    if (state.favorites) replaceArray(profileFavorites, state.favorites)
    if (state.userColumnConfigs) replaceArray(profileUserColumnConfigs, state.userColumnConfigs)
    if (state.auditLogs) replaceArray(profileAuditLogs, state.auditLogs.slice(0, 200))
  } catch {
    window.localStorage.removeItem(storageKey)
  }
}

function persistPersistentState(): void {
  if (!canUseLocalStorage()) {
    return
  }
  const state: PersistedProfileState = {
    boards: profileBoards,
    listConfigs: profileListConfigs,
    detailConfigs: profileDetailConfigs,
    behaviorConfigs: profileBehaviorConfigs,
    favorites: profileFavorites,
    userColumnConfigs: profileUserColumnConfigs,
    auditLogs: profileAuditLogs.slice(0, 200),
  }
  window.localStorage.setItem(storageKey, JSON.stringify(state))
}

const getBoard = (boardId: EntityId): ProfileBoard | undefined => profileBoards.find((board) => board.id === boardId)

const getSubject = (subjectType: ProfileSubjectType): ProfileSubject | undefined => profileSubjects.find((subject) => subject.type === subjectType)

const getListConfig = (boardId: EntityId): ProfileListConfig | undefined => profileListConfigs.find((config) => config.boardId === boardId)

const getDetailConfig = (boardId: EntityId): ProfileDetailConfig | undefined => profileDetailConfigs.find((config) => config.boardId === boardId)

const getBehaviorConfig = (boardId: EntityId): ProfileBehaviorConfig | undefined => profileBehaviorConfigs.find((config) => config.boardId === boardId)

const getUserColumnConfig = (boardId: EntityId): ProfileUserColumnConfig | undefined =>
  profileUserColumnConfigs.find((config) => config.boardId === boardId && config.userId === profileCurrentUser.id)

const hasPermission = (permission: keyof ProfilePermissionSet): boolean => Boolean(profilePermissionSet[permission])

const unique = <T>(values: T[]): T[] => [...new Set(values)]

const sourceLabels: Record<ProfileConditionCatalogItem['source'], string> = {
  tag: '标签条件',
  behavior: '行为条件',
  attribute: '用户属性',
  detail: '明细数据',
  segment: '已有分群',
}

const operatorLabels: Record<string, string> = {
  equals: '等于',
  not_equals: '不等于',
  contains: '包含',
  not_contains: '不包含',
  greater_than: '大于',
  greater_equal: '大于等于',
  less_than: '小于',
  less_equal: '小于等于',
  between: '介于',
  in: '属于',
  not_in: '不属于',
  has_value: '有值',
  no_value: '无值',
}

function pushAudit(log: Omit<ProfileAuditLog, 'userId' | 'timestamp' | 'ip'>): void {
  profileAuditLogs.unshift({
    userId: profileCurrentUser.id,
    timestamp: now(),
    ip: '127.0.0.1',
    ...log,
  })
  if (profileAuditLogs.length > 200) {
    profileAuditLogs.splice(200)
  }
  persistPersistentState()
}

function favoriteFor(boardId: EntityId, subjectType: ProfileSubjectType, baseId: EntityId): ProfileFavorite | undefined {
  return profileFavorites.find((item) => item.userId === profileCurrentUser.id && item.boardId === boardId && item.subjectType === subjectType && item.baseId === baseId)
}

function resolveVisibleColumns(boardId: EntityId): ProfileListColumn[] {
  const listConfig = getListConfig(boardId)
  if (!listConfig) {
    return []
  }
  const userConfig = getUserColumnConfig(boardId)
  const requestedKeys = userConfig?.columns.length ? userConfig.columns : listConfig.defaultColumns
  const allowedColumns = listConfig.availableColumns.filter((column) => column.required || hasPermission(column.permission))
  const keyed = new Map(allowedColumns.map((column) => [column.key, column]))
  const ordered = requestedKeys.map((key) => keyed.get(key)).filter((column): column is ProfileListColumn => Boolean(column))
  const required = allowedColumns.filter((column) => column.required && !ordered.some((item) => item.key === column.key))
  return [...required, ...ordered]
}

function individualMatchesExact(individual: ProfileIndividual, request: ProfileExactSearchRequest): boolean {
  const value = normalize(request.idValue)
  if (!value) {
    return false
  }
  if (request.idType === 'base_id') {
    return normalize(individual.baseId).includes(value)
  }
  return individual.identities.some((identity) => {
    if (identity.idType !== request.idType) {
      return false
    }
    return normalize(identity.value).includes(value) || normalize(identity.maskedValue).includes(value)
  })
}

function matchComparable(value: unknown, condition: ProfileCondition): boolean {
  const actual = String(value ?? '')
  const expected = condition.value
  if (condition.operator === 'has_value') {
    return actual.length > 0
  }
  if (condition.operator === 'no_value') {
    return actual.length === 0
  }
  if (Array.isArray(expected)) {
    const expectedValues = expected.map((item) => normalize(item))
    if (condition.operator === 'not_in') {
      return !expectedValues.includes(normalize(actual))
    }
    return expectedValues.includes(normalize(actual))
  }
  const expectedText = normalize(expected)
  const actualText = normalize(actual)
  const actualNumber = Number(actual)
  const expectedNumber = Number(expected)
  switch (condition.operator) {
    case 'equals':
      return actualText === expectedText
    case 'not_equals':
      return actualText !== expectedText
    case 'contains':
      return actualText.includes(expectedText)
    case 'not_contains':
      return !actualText.includes(expectedText)
    case 'greater_than':
      return Number.isFinite(actualNumber) && Number.isFinite(expectedNumber) && actualNumber > expectedNumber
    case 'greater_equal':
      return Number.isFinite(actualNumber) && Number.isFinite(expectedNumber) && actualNumber >= expectedNumber
    case 'less_than':
      return Number.isFinite(actualNumber) && Number.isFinite(expectedNumber) && actualNumber < expectedNumber
    case 'less_equal':
      return Number.isFinite(actualNumber) && Number.isFinite(expectedNumber) && actualNumber <= expectedNumber
    case 'in':
      return actualText === expectedText || actualText.includes(expectedText)
    case 'not_in':
      return actualText !== expectedText && !actualText.includes(expectedText)
    default:
      return true
  }
}

function conditionValue(individual: ProfileIndividual, condition: ProfileCondition): unknown {
  if (condition.source === 'tag') {
    return individual.tags.find((tag) => tag.id === condition.field || tag.name === condition.label || tag.id.includes(condition.field))?.value ?? individual.customValues[condition.field]
  }
  if (condition.source === 'segment') {
    return individual.segments.some((segment) => segment.id === condition.field || segment.name === condition.label) ? '属于' : '不属于'
  }
  if (condition.source === 'behavior') {
    return profileBehaviorEvents.some((event) => event.baseId === individual.baseId && event.eventName === condition.field) ? 1 : 0
  }
  return individual.customValues[condition.field] ?? individual.archive.find((field) => field.key === condition.field || field.label === condition.label)?.value
}

function groupMatches(individual: ProfileIndividual, conditions: ProfileCondition[], logic: ProfileLogic): boolean {
  if (!conditions.length) {
    return true
  }
  const matches = conditions.map((condition) => matchComparable(conditionValue(individual, condition), condition))
  return logic === 'and' ? matches.every(Boolean) : matches.some(Boolean)
}

function customRuleMatches(individual: ProfileIndividual, rule: ProfileCustomRule): boolean {
  if (rule.sourceModule === 'tag' && rule.sourceId) {
    return individual.tags.some((tag) => tag.id === rule.sourceId || (rule.sourceValue ? tag.value === rule.sourceValue || tag.name === rule.sourceValue : false))
  }
  if (rule.sourceModule === 'segment' && rule.sourceId) {
    return individual.segments.some((segment) => segment.id === rule.sourceId)
  }
  const satisfyMatches = rule.satisfyGroups.map((group) => groupMatches(individual, group.conditions, group.logic))
  const satisfy = satisfyMatches.length ? (rule.satisfyLogic === 'and' ? satisfyMatches.every(Boolean) : satisfyMatches.some(Boolean)) : true
  const excludeMatches = rule.excludeGroups.map((group) => groupMatches(individual, group.conditions, group.logic))
  const excluded = excludeMatches.length ? (rule.excludeLogic === 'and' ? excludeMatches.every(Boolean) : excludeMatches.some(Boolean)) : false
  return satisfy && !excluded
}

function buildSearchRow(individual: ProfileIndividual, boardId: EntityId): ProfileSearchResultRow {
  const primaryIdentity = individual.identities.find((identity) => identity.isPrimary) ?? individual.identities[0]
  return {
    baseId: individual.baseId,
    subjectType: individual.subjectType,
    displayName: individual.displayName,
    primaryIdType: primaryIdentity?.idTypeLabel ?? '基准 ID',
    primaryIdValue: primaryIdentity?.value ?? individual.baseId,
    primaryIdMaskedValue: primaryIdentity?.maskedValue ?? individual.baseId,
    tags: individual.tags.filter((tag) => tag.permission && hasPermission('tagResource')).slice(0, 3),
    values: {
      baseId: individual.baseId,
      displayName: individual.displayName,
      ...individual.customValues,
    },
    favorite: Boolean(favoriteFor(boardId, individual.subjectType, individual.baseId)),
    viewable: hasPermission('viewDetail'),
  }
}

function paginate<T>(rows: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize
  return rows.slice(start, start + pageSize)
}

function propertyFilterMatches(event: ProfileBehaviorEvent, filters: ProfileBehaviorPropertyFilter[]): boolean {
  if (!filters.length) {
    return true
  }
  return filters.every((filter) => {
    const property = event.properties.find((item) => item.field === filter.field || item.label === filter.label)
    return matchComparable(property?.value ?? '', {
      id: filter.id,
      source: 'behavior',
      sourceName: '事件属性',
      field: filter.field,
      label: filter.label,
      operator: filter.operator,
      value: filter.value,
    })
  })
}

function defaultCondition(): ProfileCondition {
  const catalog = profileConditionCatalog[0]!
  return {
    id: makeId('condition'),
    source: catalog.source,
    sourceName: catalog.sourceName,
    field: catalog.field,
    label: catalog.label,
    operator: catalog.defaultOperator,
    value: clone(catalog.defaultValue),
    timeRange: catalog.timeRange,
    aggregate: catalog.aggregate,
  }
}

export const profileConditionOperatorLabels = operatorLabels

export const profileConditionSourceLabels = sourceLabels

export const profileTabLabels: Record<string, string> = {
  overview: '客户概览',
  behavior: '行为细查',
  tags: '用户标签',
  relation: '关系图谱',
}

export const profileService = {
  async getWorkbenchData(): Promise<ProfileWorkbenchData> {
    hydratePersistentState()
    return resolveMock({
      permissions: profilePermissionSet,
      featureFlags: profileFeatureFlags,
      subjects: profileSubjects,
      boards: profileBoards,
      listConfigs: profileListConfigs,
      detailConfigs: profileDetailConfigs,
      behaviorConfigs: profileBehaviorConfigs,
      columnConfigs: profileUserColumnConfigs,
      conditionCatalog: profileConditionCatalog,
      auditLogs: profileAuditLogs,
    })
  },

  async searchExact(request: ProfileExactSearchRequest): Promise<ProfileSearchResponse> {
    if (!profilePermissionSet.searchProfile) {
      return Promise.reject(new Error('暂无检索权限'))
    }
    const board = getBoard(request.boardId)
    const subjectType = board?.subjectType ?? request.subjectType
    const rows = profileIndividuals
      .filter((individual) => individual.subjectType === subjectType)
      .filter((individual) => individualMatchesExact(individual, request))
      .map((individual) => buildSearchRow(individual, request.boardId))
    pushAudit({
      action: 'search',
      subjectType: request.subjectType,
      idType: request.idType,
      idValueMasked: request.idValue.length > 7 ? `${request.idValue.slice(0, 3)}****${request.idValue.slice(-4)}` : request.idValue,
      boardId: request.boardId,
      resultCount: rows.length,
    })
    return resolveMock({
      total: rows.length,
      rows: paginate(rows, request.page, request.pageSize),
      columns: resolveVisibleColumns(request.boardId),
      page: request.page,
      pageSize: request.pageSize,
      queryStatus: 'success',
    })
  },

  async searchCustom(request: ProfileCustomSearchRequest): Promise<ProfileSearchResponse> {
    if (!profilePermissionSet.searchProfile) {
      return Promise.reject(new Error('暂无检索权限'))
    }
    let rows = profileIndividuals
      .filter((individual) => individual.subjectType === request.subjectType)
      .filter((individual) => customRuleMatches(individual, request.rule))
    if (request.secondaryIdType && request.secondaryIdValue) {
      rows = rows.filter((individual) =>
        individualMatchesExact(individual, {
          boardId: request.boardId,
          subjectType: request.subjectType,
          idType: request.secondaryIdType ?? '',
          idValue: request.secondaryIdValue ?? '',
          includeLatestId: request.includeLatestId,
          page: 1,
          pageSize: 999,
        }),
      )
    }
    const mappedRows = rows.map((individual) => buildSearchRow(individual, request.boardId))
    pushAudit({
      action: 'search',
      subjectType: request.subjectType,
      boardId: request.boardId,
      resultCount: mappedRows.length,
    })
    return resolveMock({
      total: mappedRows.length,
      rows: paginate(mappedRows, request.page, request.pageSize),
      columns: resolveVisibleColumns(request.boardId),
      page: request.page,
      pageSize: request.pageSize,
      queryStatus: 'success',
      taskId: request.rule.sourceModule ? undefined : makeId('profile-task'),
    })
  },

  async getDetail(boardId: EntityId, subjectType: ProfileSubjectType, baseId: EntityId): Promise<ProfileIndividual | undefined> {
    if (!profilePermissionSet.viewDetail) {
      return Promise.reject(new Error('暂无该个体画像查看权限。'))
    }
    const detail = profileIndividuals.find((individual) => individual.subjectType === subjectType && individual.baseId === baseId)
    pushAudit({
      action: 'view_detail',
      subjectType,
      idType: getSubject(subjectType)?.primaryIdType,
      idValueMasked: baseId,
      boardId,
      resultCount: detail ? 1 : 0,
    })
    return resolveMock(detail)
  },

  async queryBehavior(request: ProfileBehaviorQuery): Promise<ProfileBehaviorResponse> {
    if (!profilePermissionSet.behaviorResource) {
      return Promise.reject(new Error('暂无行为资源权限'))
    }
    const config = getBehaviorConfig(request.boardId)
    const hiddenEvents = config?.hiddenEvents ?? []
    const hiddenProperties = config?.hiddenProperties ?? []
    const categoryEvents = request.category ? config?.categories.find((category) => category.id === request.category)?.events : undefined
    let rows = profileBehaviorEvents.filter((event) => event.baseId === request.baseId && !hiddenEvents.includes(event.eventName))
    if (request.platform && request.platform !== 'all') {
      rows = rows.filter((event) => event.platform === request.platform)
    }
    if (request.process && request.process !== 'all' && request.process !== '全部流程') {
      rows = rows.filter((event) => event.process === request.process)
    }
    if (categoryEvents?.length) {
      rows = rows.filter((event) => categoryEvents.includes(event.eventName))
    }
    if (request.eventName && request.eventName !== 'all') {
      rows = rows.filter((event) => event.eventName === request.eventName)
    }
    if (request.startTime && request.endTime) {
      const start = Date.parse(request.startTime)
      const end = Date.parse(request.endTime)
      rows = rows.filter((event) => {
        const occurredAt = Date.parse(event.occurredAt)
        return occurredAt >= start && occurredAt <= end
      })
    }
    rows = rows
      .filter((event) => propertyFilterMatches(event, request.propertyFilters))
      .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
      .map((event) => ({
        ...event,
        properties: event.properties.filter((property) => property.permission && !hiddenProperties.includes(property.field)),
      }))
    const cursor = Number(request.cursor ?? 0)
    const pageRows = rows.slice(cursor, cursor + request.limit)
    const nextCursor = cursor + request.limit < rows.length ? String(cursor + request.limit) : undefined
    pushAudit({
      action: 'view_behavior',
      subjectType: request.subjectType,
      boardId: request.boardId,
      resultCount: pageRows.length,
    })
    return resolveMock({
      rows: pageRows,
      nextCursor,
      hasMore: Boolean(nextCursor),
      displayNames: Object.fromEntries(pageRows.flatMap((event) => event.properties.map((property) => [property.field, property.label]))),
    })
  },

  async getRelationGraph(subjectType: ProfileSubjectType, baseId: EntityId): Promise<ProfileRelationGraph> {
    if (!profileFeatureFlags.multiSubjectEnabled || !profilePermissionSet.multiSubject || !profilePermissionSet.relationGraph) {
      return resolveMock({
        enabled: false,
        emptyReason: '当前项目未开通多主体能力或暂无关系图谱查看权限。',
        nodes: [],
        edges: [],
        tableRows: [],
        identities: [],
      })
    }
    const graph = profileRelationGraphs[baseId]
    pushAudit({
      action: 'view_relation',
      subjectType,
      idType: getSubject(subjectType)?.primaryIdType,
      idValueMasked: baseId,
      resultCount: graph?.nodes.length ?? 0,
    })
    return resolveMock(
      graph ?? {
        enabled: true,
        emptyReason: '当前个体暂无可展示关系。',
        nodes: [],
        edges: [],
        tableRows: [],
        identities: profileIndividuals.find((individual) => individual.baseId === baseId)?.identities ?? [],
      },
    )
  },

  async toggleFavorite(boardId: EntityId, subjectType: ProfileSubjectType, baseId: EntityId): Promise<boolean> {
    const existing = favoriteFor(boardId, subjectType, baseId)
    if (existing) {
      const index = profileFavorites.findIndex((item) => item.id === existing.id)
      if (index >= 0) {
        profileFavorites.splice(index, 1)
      }
      pushAudit({ action: 'favorite', subjectType, boardId, resultCount: 0 })
      persistPersistentState()
      return resolveMock(false, 80)
    }
    profileFavorites.push({
      id: makeId('favorite'),
      userId: profileCurrentUser.id,
      boardId,
      subjectType,
      baseId,
      createdAt: now(),
    })
    pushAudit({ action: 'favorite', subjectType, boardId, resultCount: 1 })
    persistPersistentState()
    return resolveMock(true, 80)
  },

  async saveUserColumns(boardId: EntityId, columns: string[]): Promise<ProfileUserColumnConfig> {
    const config = getUserColumnConfig(boardId)
    if (config) {
      config.columns = columns
      config.updatedAt = now()
      persistPersistentState()
      return resolveMock(config, 100)
    }
    const created: ProfileUserColumnConfig = {
      id: makeId('column'),
      userId: profileCurrentUser.id,
      boardId,
      columns,
      updatedAt: now(),
    }
    profileUserColumnConfigs.push(created)
    persistPersistentState()
    return resolveMock(created, 100)
  },

  async createBoard(payload: Pick<ProfileBoard, 'name' | 'subjectType' | 'description' | 'isDefault'>): Promise<{ ok: boolean; message: string; board?: ProfileBoard }> {
    if (!profilePermissionSet.projectConfig) {
      return resolveMock({ ok: false, message: '暂无项目中心配置权限' })
    }
    if (!payload.name.trim()) {
      return resolveMock({ ok: false, message: '看板名称不能为空' })
    }
    const duplicate = profileBoards.some((board) => board.subjectType === payload.subjectType && normalize(board.name) === normalize(payload.name))
    if (duplicate) {
      return resolveMock({ ok: false, message: '同一主体下看板名称不允许重复' })
    }
    if (payload.isDefault) {
      profileBoards.forEach((board) => {
        if (board.subjectType === payload.subjectType) {
          board.isDefault = false
        }
      })
    }
    const board: ProfileBoard = {
      id: makeId('board'),
      projectId: 'project-demo',
      status: 'enabled',
      createdBy: profileCurrentUser,
      createdAt: now(),
      updatedAt: now(),
      ...payload,
    }
    profileBoards.push(board)
    const defaultColumns = ['baseId', 'displayName', 'mobile', 'memberLevel', 'city', 'lastBehavior'].filter((key) => profileColumnsForSubject(payload.subjectType).some((column) => column.key === key))
    profileListConfigs.push({
      id: makeId('list-config'),
      boardId: board.id,
      defaultColumns,
      searchableIdTypes: getSubject(payload.subjectType)?.idTypes.map((item) => item.id) ?? [],
      allowLatestId: payload.subjectType === 'user',
      availableColumns: profileColumnsForSubject(payload.subjectType),
      createdAt: now(),
      updatedAt: now(),
    })
    profileDetailConfigs.push({
      id: makeId('detail-config'),
      boardId: board.id,
      archiveFields: ['name', 'mobile', 'memberLevel', 'city', 'primaryIds'],
      overviewComponents: ['activity', 'spend', 'leadIntent'],
      journeyConfig: { enabled: true, maxNodes: 14 },
      tagGroups: ['growth', 'value'],
      segmentGroups: ['growth'],
      identityConfig: { highlightTypes: getSubject(payload.subjectType)?.idTypes.map((item) => item.id).slice(0, 4) ?? [], archiveLimit: 30 },
      enabledTabs: payload.subjectType === 'user' ? ['overview', 'behavior', 'tags', 'relation'] : ['overview', 'relation'],
      globalDescription: payload.description,
    })
    persistPersistentState()
    return resolveMock({ ok: true, message: payload.isDefault ? '已创建看板，并自动取消同主体其他默认看板。' : '已创建看板。', board })
  },

  async updateBoard(boardId: EntityId, payload: Pick<ProfileBoard, 'name' | 'description' | 'isDefault'>): Promise<{ ok: boolean; message: string; board?: ProfileBoard }> {
    if (!profilePermissionSet.projectConfig) {
      return resolveMock({ ok: false, message: '暂无项目中心配置权限' })
    }
    const target = getBoard(boardId)
    if (!target) {
      return resolveMock({ ok: false, message: '看板不存在或已删除' })
    }
    if (!payload.name.trim()) {
      return resolveMock({ ok: false, message: '看板名称不能为空' })
    }
    const duplicate = profileBoards.some((board) => board.id !== boardId && board.subjectType === target.subjectType && normalize(board.name) === normalize(payload.name))
    if (duplicate) {
      return resolveMock({ ok: false, message: '同一主体下看板名称不允许重复' })
    }
    if (payload.isDefault) {
      profileBoards.forEach((board) => {
        if (board.subjectType === target.subjectType) {
          board.isDefault = board.id === boardId
        }
      })
    } else if (target.isDefault) {
      return resolveMock({ ok: false, message: '默认看板不能直接取消，请先将同主体其他看板设为默认' })
    }
    target.name = payload.name.trim()
    target.description = payload.description
    target.isDefault = payload.isDefault
    target.updatedAt = now()
    persistPersistentState()
    return resolveMock({ ok: true, message: '看板信息已保存', board: target })
  },

  async duplicateBoard(boardId: EntityId): Promise<{ ok: boolean; message: string; board?: ProfileBoard }> {
    if (!profilePermissionSet.projectConfig) {
      return resolveMock({ ok: false, message: '暂无项目中心配置权限' })
    }
    const source = getBoard(boardId)
    if (!source) {
      return resolveMock({ ok: false, message: '看板不存在或已删除' })
    }
    const baseName = `${source.name} 副本`
    let name = baseName
    let index = 2
    while (profileBoards.some((board) => board.subjectType === source.subjectType && normalize(board.name) === normalize(name))) {
      name = `${baseName} ${index}`
      index += 1
    }
    const board: ProfileBoard = {
      ...clone(source),
      id: makeId('board'),
      name,
      isDefault: false,
      createdBy: profileCurrentUser,
      createdAt: now(),
      updatedAt: now(),
    }
    profileBoards.push(board)
    const listConfig = getListConfig(boardId)
    if (listConfig) {
      profileListConfigs.push({ ...clone(listConfig), id: makeId('list-config'), boardId: board.id, createdAt: now(), updatedAt: now() })
    }
    const detailConfig = getDetailConfig(boardId)
    if (detailConfig) {
      profileDetailConfigs.push({ ...clone(detailConfig), id: makeId('detail-config'), boardId: board.id })
    }
    const behaviorConfig = getBehaviorConfig(boardId)
    if (behaviorConfig) {
      profileBehaviorConfigs.push({ ...clone(behaviorConfig), id: makeId('behavior-config'), boardId: board.id, createdAt: now(), updatedAt: now() })
    }
    persistPersistentState()
    return resolveMock({ ok: true, message: '已复制为新看板，可继续调整配置', board })
  },

  async deleteBoard(boardId: EntityId): Promise<{ ok: boolean; message: string }> {
    if (!profilePermissionSet.projectConfig) {
      return resolveMock({ ok: false, message: '暂无项目中心配置权限' })
    }
    const target = getBoard(boardId)
    if (!target) {
      return resolveMock({ ok: false, message: '看板不存在或已删除' })
    }
    const sameSubjectBoards = profileBoards.filter((board) => board.subjectType === target.subjectType)
    if (sameSubjectBoards.length <= 1) {
      return resolveMock({ ok: false, message: '同一主体至少保留 1 个看板' })
    }
    const boardIndex = profileBoards.findIndex((board) => board.id === boardId)
    if (boardIndex >= 0) {
      profileBoards.splice(boardIndex, 1)
    }
    ;[
      [profileListConfigs, (item: ProfileListConfig) => item.boardId === boardId],
      [profileDetailConfigs, (item: ProfileDetailConfig) => item.boardId === boardId],
      [profileBehaviorConfigs, (item: ProfileBehaviorConfig) => item.boardId === boardId],
      [profileFavorites, (item: ProfileFavorite) => item.boardId === boardId],
      [profileUserColumnConfigs, (item: ProfileUserColumnConfig) => item.boardId === boardId],
    ].forEach(([collection, predicate]) => {
      const rows = collection as Array<unknown>
      for (let index = rows.length - 1; index >= 0; index -= 1) {
        if ((predicate as (item: unknown) => boolean)(rows[index])) {
          rows.splice(index, 1)
        }
      }
    })
    if (target.isDefault) {
      const fallback = profileBoards.find((board) => board.subjectType === target.subjectType)
      if (fallback) {
        fallback.isDefault = true
        fallback.updatedAt = now()
      }
    }
    persistPersistentState()
    return resolveMock({ ok: true, message: '看板已删除' })
  },

  async updateBoardDefault(boardId: EntityId): Promise<void> {
    const target = getBoard(boardId)
    if (!target) {
      return resolveMock(undefined)
    }
    profileBoards.forEach((board) => {
      if (board.subjectType === target.subjectType) {
        board.isDefault = board.id === boardId
        board.updatedAt = now()
      }
    })
    persistPersistentState()
    return resolveMock(undefined, 80)
  },

  async updateListConfig(boardId: EntityId, payload: Pick<ProfileListConfig, 'defaultColumns' | 'searchableIdTypes' | 'allowLatestId'>): Promise<ProfileListConfig | undefined> {
    const config = getListConfig(boardId)
    if (config) {
      config.defaultColumns = payload.defaultColumns
      config.searchableIdTypes = payload.searchableIdTypes
      config.allowLatestId = payload.allowLatestId
      config.updatedAt = now()
      persistPersistentState()
    }
    return resolveMock(config, 100)
  },

  async updateDetailConfig(boardId: EntityId, payload: Pick<ProfileDetailConfig, 'archiveFields' | 'overviewComponents' | 'enabledTabs' | 'globalDescription'>): Promise<ProfileDetailConfig | undefined> {
    const config = getDetailConfig(boardId)
    if (config) {
      config.archiveFields = payload.archiveFields
      config.overviewComponents = payload.overviewComponents
      config.enabledTabs = payload.enabledTabs
      config.globalDescription = payload.globalDescription
      persistPersistentState()
    }
    return resolveMock(config, 100)
  },

  async updateBehaviorConfig(boardId: EntityId, payload: Pick<ProfileBehaviorConfig, 'categories' | 'hiddenEvents' | 'hiddenProperties' | 'platforms' | 'processes' | 'defaultTimeRange'>): Promise<ProfileBehaviorConfig | undefined> {
    const config = getBehaviorConfig(boardId)
    if (config) {
      config.categories = payload.categories
      config.hiddenEvents = payload.hiddenEvents
      config.hiddenProperties = payload.hiddenProperties
      config.platforms = payload.platforms
      config.processes = payload.processes
      config.defaultTimeRange = payload.defaultTimeRange
      config.updatedAt = now()
      persistPersistentState()
    }
    return resolveMock(config, 100)
  },

  buildDefaultRule(): ProfileCustomRule {
    return {
      satisfyLogic: 'and',
      satisfyGroups: [
        {
          id: makeId('rule-group'),
          name: '条件组A',
          logic: 'and',
          conditions: [defaultCondition()],
        },
      ],
      excludeLogic: 'and',
      excludeGroups: [],
      sourceModule: 'manual',
    }
  },

  buildCondition(catalogId?: EntityId): ProfileCondition {
    const catalog = profileConditionCatalog.find((item) => item.id === catalogId) ?? profileConditionCatalog[0]!
    return {
      id: makeId('condition'),
      source: catalog.source,
      sourceName: catalog.sourceName,
      field: catalog.field,
      label: catalog.label,
      operator: catalog.defaultOperator,
      value: clone(catalog.defaultValue),
      timeRange: catalog.timeRange,
      aggregate: catalog.aggregate,
    }
  },

  describeRule(rule: ProfileCustomRule): string {
    if (rule.sourceModule === 'tag') {
      const tag = profileIndividuals.flatMap((individual) => individual.tags).find((item) => item.id === rule.sourceId)
      return `已筛选：满足 标签 ${tag?.name ?? rule.sourceValue ?? rule.sourceId}`
    }
    if (rule.sourceModule === 'segment') {
      const segment = profileIndividuals.flatMap((individual) => individual.segments).find((item) => item.id === rule.sourceId)
      return `已筛选：满足 属于分群 ${segment?.name ?? rule.sourceId}`
    }
    const satisfy = rule.satisfyGroups.map((group) => group.name).join(rule.satisfyLogic === 'and' ? ' 且 ' : ' 或 ')
    const exclude = rule.excludeGroups.length ? ` 且 排除 ${rule.excludeGroups.map((group) => group.name).join(rule.excludeLogic === 'and' ? ' 且 ' : ' 或 ')}` : ''
    return `已筛选：满足 ${satisfy || '条件组A'}${exclude}`
  },

  estimateRule(rule: ProfileCustomRule, subjectType: ProfileSubjectType): number {
    return profileIndividuals.filter((individual) => individual.subjectType === subjectType && customRuleMatches(individual, rule)).length
  },

  getRecentSearchOptions(subjectType: ProfileSubjectType, idType: string, limit = 40): Array<{ label: string; value: string }> {
    const resolvedIdType = idType || getSubject(subjectType)?.primaryIdType || 'base_id'
    return profileIndividuals
      .filter((individual) => individual.subjectType === subjectType)
      .map((individual) => {
        const identity =
          resolvedIdType === 'base_id'
            ? individual.identities.find((item) => item.isPrimary) ?? individual.identities[0]
            : individual.identities.find((item) => item.idType === resolvedIdType)
        if (!identity) {
          return undefined
        }
        const mobile = individual.identities.find((item) => item.idType === 'mobile')?.maskedValue
        const memberLevel = individual.archive.find((field) => field.key === 'memberLevel')?.value
        const city = individual.archive.find((field) => field.key === 'city')?.value
        const value = identity.masked ? identity.maskedValue : identity.value
        return {
          label: ['最近查询', individual.displayName, individual.baseId, mobile, memberLevel, city, value].filter(Boolean).join(' / '),
          value,
        }
      })
      .filter((option): option is { label: string; value: string } => Boolean(option))
      .slice(0, limit)
  },

  getBoardConfig(boardId: EntityId) {
    return {
      board: getBoard(boardId),
      listConfig: getListConfig(boardId),
      detailConfig: getDetailConfig(boardId),
      behaviorConfig: getBehaviorConfig(boardId),
      visibleColumns: resolveVisibleColumns(boardId),
    }
  },

  getSubject,
  getBoard,
  getListConfig,
  getDetailConfig,
  getBehaviorConfig,
}

function profileColumnsForSubject(subjectType: ProfileSubjectType): ProfileListColumn[] {
  if (subjectType === 'user') {
    return profileListConfigs[0]?.availableColumns ?? []
  }
  return (profileListConfigs[0]?.availableColumns ?? []).filter((column) => !['mobile', 'memberLevel', 'deviceId', 'lastOrderAmount'].includes(column.key))
}
