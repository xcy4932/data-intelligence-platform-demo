import type { EntityId, ISODateTimeString, Owner } from './common'

export type ProfileSubjectType = 'user' | 'store' | 'vehicle' | 'product' | 'lead'

export type ProfileSearchMode = 'exact' | 'custom'

export type ProfileConditionSource = 'tag' | 'behavior' | 'attribute' | 'detail' | 'segment'

export type ProfileConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'greater_equal'
  | 'less_than'
  | 'less_equal'
  | 'between'
  | 'in'
  | 'not_in'
  | 'has_value'
  | 'no_value'

export type ProfileLogic = 'and' | 'or'

export type ProfileColumnType = 'id' | 'profile' | 'tag' | 'attribute' | 'segment' | 'identity' | 'behavior' | 'detail' | 'realtime'

export type ProfileDetailTab = 'overview' | 'behavior' | 'tags' | 'relation'

export type ProfileTagDisplayMode = 'tree' | 'flat'

export type ProfileGraphViewMode = 'graph' | 'table'

export type ProfileBehaviorOperator = ProfileConditionOperator

export interface ProfilePermissionSet {
  viewProfile: boolean
  searchProfile: boolean
  viewDetail: boolean
  tagResource: boolean
  behaviorResource: boolean
  detailData: boolean
  userAttribute: boolean
  segmentView: boolean
  relationGraph: boolean
  multiSubject: boolean
  projectConfig: boolean
  copySensitiveId: boolean
}

export interface ProfileFeatureFlags {
  profileConfigured: boolean
  multiSubjectEnabled: boolean
  behaviorFlowConfigured: boolean
  metadataDisplayNameEnabled: boolean
  propertyDictionaryEnabled: boolean
}

export interface ProfileSubject {
  type: ProfileSubjectType
  name: string
  description: string
  primaryIdType: string
  allowMultiSubjectSearch: boolean
  idTypes: ProfileIdType[]
}

export interface ProfileIdType {
  id: string
  label: string
  sensitive: boolean
  masked: boolean
  copyable: boolean
  format?: 'mobile' | 'vin' | 'openid' | 'device' | 'plain'
}

export interface ProfileBoard {
  id: EntityId
  projectId: EntityId
  subjectType: ProfileSubjectType
  name: string
  description: string
  isDefault: boolean
  status: 'enabled' | 'disabled'
  createdBy: Owner
  createdAt: ISODateTimeString
  updatedAt: ISODateTimeString
}

export interface ProfileListColumn {
  key: string
  title: string
  type: ProfileColumnType
  field: string
  width?: number
  permission: keyof ProfilePermissionSet
  realtimeSupported: boolean
  required?: boolean
  defaultVisible?: boolean
}

export interface ProfileListConfig {
  id: EntityId
  boardId: EntityId
  defaultColumns: string[]
  searchableIdTypes: string[]
  allowLatestId: boolean
  availableColumns: ProfileListColumn[]
  createdAt: ISODateTimeString
  updatedAt: ISODateTimeString
}

export interface ProfileDetailConfig {
  id: EntityId
  boardId: EntityId
  archiveFields: string[]
  overviewComponents: string[]
  journeyConfig: {
    enabled: boolean
    maxNodes: number
  }
  tagGroups: string[]
  segmentGroups: string[]
  identityConfig: {
    highlightTypes: string[]
    archiveLimit: number
  }
  enabledTabs: ProfileDetailTab[]
  globalDescription: string
}

export interface ProfileBehaviorCategory {
  id: EntityId
  name: string
  tableName: string
  events: string[]
  description: string
}

export interface ProfileBehaviorConfig {
  id: EntityId
  boardId: EntityId
  categories: ProfileBehaviorCategory[]
  hiddenEvents: string[]
  hiddenProperties: string[]
  platforms: string[]
  processes: string[]
  defaultTimeRange: 'today' | 'yesterday' | '7d' | '30d' | '90d'
  maxRangeDays: number
  createdAt: ISODateTimeString
  updatedAt: ISODateTimeString
}

export interface ProfileUserColumnConfig {
  id: EntityId
  userId: EntityId
  boardId: EntityId
  columns: string[]
  updatedAt: ISODateTimeString
}

export interface ProfileFavorite {
  id: EntityId
  userId: EntityId
  boardId: EntityId
  subjectType: ProfileSubjectType
  baseId: EntityId
  createdAt: ISODateTimeString
}

export interface ProfileIdentity {
  idType: string
  idTypeLabel: string
  value: string
  maskedValue: string
  isPrimary: boolean
  masked: boolean
  sensitive: boolean
  copyable: boolean
  source: string
  updatedAt: ISODateTimeString
}

export interface ProfileTag {
  id: EntityId
  name: string
  value: string
  type: string
  categoryId: EntityId
  categoryName: string
  groupId: EntityId
  groupName: string
  source: string
  description: string
  updatedAt: ISODateTimeString
  permission: boolean
  deleted?: boolean
}

export interface ProfileSegmentRef {
  id: EntityId
  name: string
  groupName: string
  count: number
  updatedAt: ISODateTimeString
  permission: boolean
  deleted?: boolean
}

export interface ProfileArchiveField {
  key: string
  label: string
  value: string
  permission: keyof ProfilePermissionSet
  sensitive?: boolean
}

export interface ProfileOverviewCard {
  id: EntityId
  title: string
  value: string
  description: string
  updatedAt: ISODateTimeString
  permission: keyof ProfilePermissionSet
}

export interface ProfileJourneyNode {
  id: EntityId
  name: string
  status: 'done' | 'current' | 'pending' | 'empty'
  time?: string
  description: string
  details: Array<{ label: string; value: string }>
}

export interface ProfileIndividual {
  baseId: EntityId
  subjectType: ProfileSubjectType
  displayName: string
  avatarText: string
  globalDescription: string
  archive: ProfileArchiveField[]
  identities: ProfileIdentity[]
  tags: ProfileTag[]
  segments: ProfileSegmentRef[]
  overviewCards: ProfileOverviewCard[]
  journey: ProfileJourneyNode[]
  customValues: Record<string, string | number | boolean>
  relationSummary: string
  createdAt: ISODateTimeString
  updatedAt: ISODateTimeString
}

export interface ProfileSearchResultRow {
  baseId: EntityId
  subjectType: ProfileSubjectType
  displayName: string
  primaryIdType: string
  primaryIdValue: string
  primaryIdMaskedValue: string
  tags: ProfileTag[]
  values: Record<string, string | number | boolean>
  favorite: boolean
  viewable: boolean
}

export interface ProfileConditionCatalogItem {
  id: EntityId
  source: ProfileConditionSource
  sourceName: string
  field: string
  label: string
  defaultOperator: ProfileConditionOperator
  defaultValue?: string | number | boolean | Array<string | number>
  timeRange?: string
  aggregate?: string
  permission: keyof ProfilePermissionSet
  realtimeSupported: boolean
}

export interface ProfileCondition {
  id: EntityId
  source: ProfileConditionSource
  sourceName: string
  field: string
  label: string
  operator: ProfileConditionOperator
  value?: string | number | boolean | Array<string | number>
  timeRange?: string
  aggregate?: string
}

export interface ProfileRuleGroup {
  id: EntityId
  name: string
  logic: ProfileLogic
  conditions: ProfileCondition[]
}

export interface ProfileCustomRule {
  satisfyLogic: ProfileLogic
  satisfyGroups: ProfileRuleGroup[]
  excludeLogic: ProfileLogic
  excludeGroups: ProfileRuleGroup[]
  sourceModule?: 'tag' | 'segment' | 'manual'
  sourceId?: EntityId
  sourceValue?: string
}

export interface ProfileExactSearchRequest {
  boardId: EntityId
  subjectType: ProfileSubjectType
  idType: string
  idValue: string
  includeLatestId: boolean
  page: number
  pageSize: number
}

export interface ProfileCustomSearchRequest {
  boardId: EntityId
  subjectType: ProfileSubjectType
  rule: ProfileCustomRule
  includeLatestId: boolean
  secondaryIdType?: string
  secondaryIdValue?: string
  page: number
  pageSize: number
}

export interface ProfileSearchResponse {
  total: number
  rows: ProfileSearchResultRow[]
  columns: ProfileListColumn[]
  page: number
  pageSize: number
  queryStatus: 'success' | 'failed' | 'running'
  taskId?: EntityId
}

export interface ProfileBehaviorPropertyFilter {
  id: EntityId
  field: string
  label: string
  operator: ProfileBehaviorOperator
  value?: string
}

export interface ProfileBehaviorEvent {
  id: EntityId
  baseId: EntityId
  occurredAt: ISODateTimeString
  platform: string
  process: string
  categoryId: EntityId
  categoryName: string
  eventName: string
  displayName: string
  source: string
  summary: string
  keyProperties: Array<{ label: string; value: string }>
  properties: Array<{ field: string; label: string; value: string; rawValue: string; permission: boolean }>
}

export interface ProfileBehaviorQuery {
  boardId: EntityId
  subjectType: ProfileSubjectType
  baseId: EntityId
  platform: string
  process: string
  category: string
  eventName: string
  propertyFilters: ProfileBehaviorPropertyFilter[]
  timeRange: 'today' | 'yesterday' | '7d' | '30d' | '90d' | 'custom'
  startTime?: string
  endTime?: string
  cursor?: string
  limit: number
}

export interface ProfileBehaviorResponse {
  rows: ProfileBehaviorEvent[]
  nextCursor?: string
  hasMore: boolean
  displayNames: Record<string, string>
}

export interface ProfileRelationNode {
  id: EntityId
  subjectType: ProfileSubjectType
  subjectName: string
  idType: string
  idValue: string
  label: string
  color: string
  x: number
  y: number
}

export interface ProfileRelationEdge {
  id: EntityId
  source: EntityId
  target: EntityId
  relationName: string
  sourceName: string
  updatedAt: ISODateTimeString
  relationId: EntityId
}

export interface ProfileRelationTableRow {
  id: EntityId
  subjectType: ProfileSubjectType
  subjectName: string
  idType: string
  idValue: string
  maskedValue: string
  relationName: string
  keyTags: string[]
  keyAttributes: string[]
  updatedAt: ISODateTimeString
  viewable: boolean
  copyable: boolean
}

export interface ProfileRelationGraph {
  nodes: ProfileRelationNode[]
  edges: ProfileRelationEdge[]
  tableRows: ProfileRelationTableRow[]
  identities: ProfileIdentity[]
  enabled: boolean
  emptyReason?: string
}

export interface ProfileAuditLog {
  userId: EntityId
  action: 'search' | 'view_detail' | 'view_behavior' | 'view_relation' | 'favorite'
  subjectType: ProfileSubjectType
  idType?: string
  idValueMasked?: string
  boardId?: EntityId
  timestamp: ISODateTimeString
  resultCount?: number
  ip: string
}

export interface ProfileWorkbenchData {
  permissions: ProfilePermissionSet
  featureFlags: ProfileFeatureFlags
  subjects: ProfileSubject[]
  boards: ProfileBoard[]
  listConfigs: ProfileListConfig[]
  detailConfigs: ProfileDetailConfig[]
  behaviorConfigs: ProfileBehaviorConfig[]
  columnConfigs: ProfileUserColumnConfig[]
  conditionCatalog: ProfileConditionCatalogItem[]
  auditLogs: ProfileAuditLog[]
}
