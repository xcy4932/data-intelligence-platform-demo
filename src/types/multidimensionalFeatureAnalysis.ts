import type { EntityId, ISODateTimeString, Owner } from './common'
import type { ProfileSubjectType } from './profile'

export type MultiDimReportStatus = 'calculating' | 'success' | 'failed' | 'deleted' | 'invalid'
export type MultiDimNegativeType = 'population_random' | 'segment_random' | 'custom_segment'
export type MultiDimLabelSelectionMode = 'system_recommend' | 'custom'
export type MultiDimComboValueCount = 1 | 2 | 3
export type MultiDimPrincipalType = 'user' | 'group' | 'role' | 'department'
export type MultiDimExportType = 'positive_sample' | 'expanded_population'
export type MultiDimComboRelation = 'any' | 'all'
export type MultiDimAuditAction =
  | 'create_report'
  | 'edit_report'
  | 'delete_report'
  | 'grant_report'
  | 'revoke_report'
  | 'favorite_report'
  | 'unfavorite_report'
  | 'recalculate_report'
  | 'view_failure_reason'
  | 'save_segment'
  | 'jump_segment'

export interface MultiDimPermissionSet {
  viewReport: boolean
  mutateReport: boolean
  createSegment: boolean
  projectAdmin: boolean
}

export interface MultiDimSubjectOption {
  type: ProfileSubjectType
  name: string
  description: string
  idTypes: Array<{ id: string; label: string }>
  permission: boolean
}

export interface MultiDimPrincipal {
  id: EntityId
  type: MultiDimPrincipalType
  name: string
  department: string
}

export interface MultiDimSegmentOption {
  id: EntityId
  name: string
  subjectType: ProfileSubjectType
  subjectName: string
  outputIdType: string
  groupId: EntityId
  groupName: string
  count: number
  status: 'available' | 'empty' | 'invalid' | 'deleted'
  permission: boolean
  updatedAt: ISODateTimeString
}

export interface MultiDimTagOption {
  id: EntityId
  name: string
  directory: string
  tagType: string
  subjectType: ProfileSubjectType
  valueType: 'single' | 'multi' | 'number' | 'text'
  coverageRate: number
  valueCount: number
  values: string[]
  recommendReason: string
  sourceType: MultiDimLabelSelectionMode
  status: 'available' | 'data_not_ready' | 'deleted' | 'invalid'
  permission: boolean
}

export interface MultiDimReportPermission {
  id: EntityId
  reportId: EntityId
  authType: MultiDimPrincipalType
  authId: EntityId
  authName: string
  permission: 'view'
  createdBy: Owner
  createdAt: ISODateTimeString
}

export interface MultiDimRuntimePermission {
  canView: boolean
  canMutate: boolean
  canDelete: boolean
  canAuthorize: boolean
  canSaveSegment: boolean
}

export interface MultiDimFailureReason {
  failedAt: ISODateTimeString
  stage: string
  reason: string
  suggestion: string
}

export interface MultiDimComboItem {
  tagId: EntityId
  tagName: string
  tagValue: string
  directory: string
  tagType: string
  permission: boolean
  invalid?: boolean
}

export interface MultiDimFeatureCombo {
  id: EntityId
  reportId: EntityId
  comboItems: MultiDimComboItem[]
  score: number
  precisionRate: number
  recallRate: number
  positiveHitCount: number
  negativeHitCount: number
  expandedCount: number
  rankNo: number
}

export interface MultiDimInterpretation {
  topComboId: EntityId
  title: string
  expansionDescription: string
  marketingSuggestion: string
}

export interface MultiDimReportLabel {
  id: EntityId
  reportId: EntityId
  tagId: EntityId
  tagName: string
  directory: string
  tagType: string
  sourceType: MultiDimLabelSelectionMode
  permission: boolean
  status: MultiDimTagOption['status']
  createdAt: ISODateTimeString
}

export interface MultiDimReport {
  id: EntityId
  name: string
  subjectType: ProfileSubjectType
  subjectName: string
  positiveSegmentId: EntityId
  positiveSegmentName: string
  positiveSegmentCount: number
  positiveSegmentPermission: boolean
  positiveSegmentStatus: MultiDimSegmentOption['status']
  negativeType: MultiDimNegativeType
  negativeSourceSegmentId?: EntityId
  negativeSourceSegmentName?: string
  negativeSourceSegmentCount?: number
  negativeSegmentPermission?: boolean
  negativeSegmentStatus?: MultiDimSegmentOption['status']
  negativeGeneratedSegmentName?: string
  negativeOverlapRemoved?: number
  comboValueCount: MultiDimComboValueCount
  status: MultiDimReportStatus
  creator: Owner
  createdAt: ISODateTimeString
  finishedAt?: ISODateTimeString
  deletedAt?: ISODateTimeString
  favorite: boolean
  favoriteUserIds?: EntityId[]
  labels: MultiDimReportLabel[]
  featureCombos: MultiDimFeatureCombo[]
  interpretation?: MultiDimInterpretation
  permissions: MultiDimReportPermission[]
  runtimePermission: MultiDimRuntimePermission
  failureReason?: MultiDimFailureReason
  invalidReason?: string
  taskId?: EntityId
  pollCount?: number
}

export interface MultiDimCreateReportPayload {
  name: string
  subjectType: ProfileSubjectType | ''
  positiveSegmentId: EntityId | ''
  negativeType: MultiDimNegativeType
  negativeSourceSegmentId?: EntityId | ''
  labelSelectionMode: MultiDimLabelSelectionMode
  selectedTagIds: EntityId[]
  comboValueCount: MultiDimComboValueCount
  authObjects: Array<{ type: MultiDimPrincipalType; id: EntityId; name: string }>
}

export interface MultiDimReportSearchFilters {
  keyword: string
  createdByMe: boolean
  favoriteByMe: boolean
  sharedToMe: boolean
  statuses: MultiDimReportStatus[]
  subjectTypes: ProfileSubjectType[]
  page: number
  pageSize: number
}

export interface MultiDimReportSearchResult {
  rows: MultiDimReport[]
  total: number
  page: number
  pageSize: number
}

export interface MultiDimFeatureComboFilters {
  scoreMin: number | null
  scoreMax: number | null
  precisionMin: number | null
  precisionMax: number | null
  recallMin: number | null
  recallMax: number | null
  positiveCountMin: number | null
  positiveCountMax: number | null
  expandedCountMin: number | null
  expandedCountMax: number | null
  tagNames: string[]
  valueKeyword: string
}

export interface MultiDimSaveSegmentPayload {
  reportId: EntityId
  selectedComboIds: EntityId[]
  exportType: MultiDimExportType
  comboRelation: MultiDimComboRelation
  outputIdType: string
  segmentName: string
  description: string
  authObjects: Array<{ type: MultiDimPrincipalType; id: EntityId; name: string }>
  groupIds: EntityId[]
}

export interface MultiDimEstimateSegmentPayload {
  reportId: EntityId
  selectedComboIds: EntityId[]
  exportType: MultiDimExportType
  comboRelation: MultiDimComboRelation
  outputIdType: string
}

export interface MultiDimSavedSegment {
  id: EntityId
  reportId: EntityId
  segmentId: EntityId
  segmentName: string
  segmentCount: number
  exportType: MultiDimExportType
  comboRelation: MultiDimComboRelation
  selectedComboIds: EntityId[]
  createdBy: Owner
  createdAt: ISODateTimeString
}

export interface MultiDimAuditLog {
  id: EntityId
  userId: EntityId
  action: MultiDimAuditAction
  reportId?: EntityId
  targetId?: EntityId
  before?: string
  after?: string
  ip: string
  createdAt: ISODateTimeString
}

export interface MultiDimWorkbenchData {
  currentUser: Owner
  permissions: MultiDimPermissionSet
  subjects: MultiDimSubjectOption[]
  segments: MultiDimSegmentOption[]
  tags: MultiDimTagOption[]
  principals: MultiDimPrincipal[]
  segmentGroups: Array<{ id: EntityId; name: string }>
  reports: MultiDimReport[]
  savedSegments: MultiDimSavedSegment[]
  auditLogs: MultiDimAuditLog[]
}

export interface MultiDimActionResult {
  ok: boolean
  id?: EntityId
  message: string
}
