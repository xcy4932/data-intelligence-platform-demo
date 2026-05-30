import {
  organizationIdentityAccessContexts,
  organizationIdentityAuditLogs,
  organizationIdentityBindings,
  organizationIdentityConflicts,
  organizationIdentityDepartmentDeleteImpactsByDepartmentId,
  organizationIdentityDepartmentMembersByDepartmentId,
  organizationIdentityDepartments,
  organizationIdentityDepartmentTree,
  organizationIdentityEmptyThirdPartySeed,
  organizationIdentityLicenseAssignments,
  organizationIdentityLicenseOperationRecords,
  organizationIdentityLicenseSummaries,
  organizationIdentityNoThirdPartyAccessContext,
  organizationIdentityPolicy,
  organizationIdentityRoles,
  organizationIdentityRoleMembers,
  organizationIdentityTenant,
  organizationIdentityUserDeleteImpactsByUserId,
  organizationIdentityUserDetails,
  organizationIdentityUserEditableDetailsByUserId,
  organizationIdentityUserGroupDetails,
  organizationIdentityUserGroups,
  organizationIdentityUsers,
} from '@/mock/organizationIdentity'
import type { EntityId } from '@/types/common'
import {
  createIdentityAuditLog,
  validateIdentityAuditRecordPayload,
} from '@/utils/organizationIdentityAudit'
import {
  emitIdentityRefreshForTopics,
  identityRefreshTopics,
} from '@/utils/organizationIdentityRefresh'
import type {
  AuditLog,
  DateRangeFilter,
  Department,
  DepartmentDeleteImpact,
  DepartmentListFilter,
  DepartmentMember,
  DepartmentTreeNode,
  IdentityAccessContext,
  IdentityBinding,
  IdentityBindingListFilter,
  IdentityConflict,
  IdentityPermissionKey,
  IdentityProvider,
  LicenseAssignment,
  LicenseListFilter,
  LicenseOperationRecord,
  LicenseType,
  PaginatedResult,
  PaginationParams,
  Role,
  RoleMemberListFilter,
  RefreshChangeType,
  RefreshTopic,
  ServiceError,
  ServiceResult,
  SortOrder,
  Tenant,
  TenantIdentityPolicy,
  TenantLicenseSummary,
  User,
  UserDetail,
  UserEditableDetail,
  UserGroup,
  UserGroupDetail,
  UserGroupListFilter,
  UserListFilter,
  AuditLogListFilter,
} from '@/types/organizationIdentity'
import type { IdentityAuditRecordPayload } from '@/utils/organizationIdentityAudit'

export type IdentityAccessContextKey = keyof typeof organizationIdentityAccessContexts
export type TenantLicenseScenario = keyof typeof organizationIdentityLicenseSummaries

export interface OrganizationIdentityServiceOptions {
  access_context_key?: IdentityAccessContextKey
  delay_ms?: number
  license_scenario?: TenantLicenseScenario
  mock_error_code?: ServiceError['code']
  mock_error_message?: string
  no_third_party?: boolean
}

export interface OrganizationIdentityListQuery<TFilter extends object = Record<string, unknown>> {
  keyword?: string
  filters?: Partial<TFilter>
  pagination?: Partial<PaginationParams>
  sort_by?: string
  sort_order?: SortOrder
}

export interface DepartmentDetail {
  department: Department
  tree_node?: DepartmentTreeNode
  members: DepartmentMember[]
  delete_impact?: DepartmentDeleteImpact
  audit_logs: AuditLog[]
}

export interface LicenseOverview {
  summary: TenantLicenseSummary
  assignments: LicenseAssignment[]
  operation_records: LicenseOperationRecord[]
  is_full: boolean
  warning_level: 'none' | 'high_usage' | 'exhausted'
}

export interface LicenseTypeOption {
  license_type: LicenseType
  disabled: boolean
  disabled_reason?: ServiceError['code']
}

export interface LicenseOptionsResult {
  options: LicenseTypeOption[]
  summary: TenantLicenseSummary
}

export interface UserCreationIdentityPolicy {
  available_auth_types: User['auth_type'][]
  default_auth_type: User['auth_type']
  sso_enabled: boolean
  password_login_enabled: boolean
  sms_verification_enabled: boolean
  email_notification_enabled: boolean
  third_party_providers: IdentityProvider[]
}

export interface EmptyThirdPartySeed {
  access_context: IdentityAccessContext
  configured_providers: IdentityProvider[]
  bindings: IdentityBinding[]
  conflicts: IdentityConflict[]
  overview: {
    bound_user_count: number
    unbound_user_count: number
    conflict_count: number
    latest_sync_at: string | null
    sync_failure_count: number
  }
}

export interface CreateUserPayload {
  username: string
  display_name: string
  email?: string | null
  mobile?: string | null
  employee_no?: string | null
  department_id?: EntityId | null
  position?: string | null
  source_type?: User['source_type']
  auth_type?: User['auth_type']
  user_type?: User['user_type']
  assign_license?: boolean
  send_activation_notice?: boolean
}

export type UpdateUserPayload = Partial<
  Omit<User, 'user_id' | 'created_at' | 'updated_at' | 'disabled_at' | 'deleted_at'>
>

export interface DeleteUserPayload {
  transfer_to_user_id?: EntityId
  confirm_text?: string
}

export type CreateDepartmentPayload = Pick<Department, 'department_name'> &
  Partial<Omit<Department, 'department_id' | 'department_name' | 'created_at' | 'updated_at'>>

export type UpdateDepartmentPayload = Partial<Omit<Department, 'department_id' | 'created_at' | 'updated_at'>>

export type CreateUserGroupPayload = Pick<UserGroup, 'group_name' | 'group_type' | 'owner_user_id'> &
  Partial<Omit<UserGroup, 'group_id' | 'group_name' | 'group_type' | 'owner_user_id' | 'created_at' | 'updated_at'>>

export type UpdateUserGroupPayload = Partial<Omit<UserGroup, 'group_id' | 'created_at' | 'updated_at'>>

export interface AssignLicensePayload {
  license_type: LicenseType
  assigned_by?: EntityId | null
}

export interface ReleaseLicensePayload {
  release_reason?: string | null
}

export type RecordIdentityAuditLogPayload = IdentityAuditRecordPayload

const defaultDelay = 160

const clone = <T>(payload: T): T => JSON.parse(JSON.stringify(payload)) as T

const identityAuditLogStore: AuditLog[] = clone(organizationIdentityAuditLogs)

const now = (): string => new Date().toISOString()

const makeId = (prefix: string): string => `${prefix}_${Date.now()}_${Math.round(Math.random() * 10000)}`

const serviceErrorMessages: Record<ServiceError['code'], string> = {
  validation_error: '参数校验失败',
  no_permission: '当前用户无权执行该操作',
  not_found: '资源不存在',
  network_error: '网络异常，请稍后重试',
  conflict: '数据冲突，请刷新后重试',
  license_exhausted: '当前 License 已用完',
  export_limit_exceeded: '导出数量超过限制',
  business_blocked: '当前业务状态阻止该操作',
  partial_success: '操作部分成功',
  file_format_error: '文件格式不符合要求',
  file_size_exceeded: '文件大小超过限制',
  import_validation_error: '导入数据校验失败',
  duplicate_value: '存在重复值',
}

const success = <T>(data: T): ServiceResult<T> => ({ success: true, data })

const failure = <T>(
  code: ServiceError['code'],
  message = serviceErrorMessages[code],
  field_errors?: Record<string, string>,
): ServiceResult<T> => ({
  success: false,
  error: {
    code,
    message,
    field_errors,
  },
})

const simulatedFailure = <T>(options: OrganizationIdentityServiceOptions): ServiceResult<T> | null => {
  if (!options.mock_error_code) {
    return null
  }

  return failure<T>(
    options.mock_error_code,
    options.mock_error_message ?? serviceErrorMessages[options.mock_error_code],
  )
}

const resolveService = <T>(
  producer: () => ServiceResult<T>,
  options: OrganizationIdentityServiceOptions = {},
): Promise<ServiceResult<T>> =>
  new Promise((resolve) => {
    globalThis.setTimeout(() => {
      const simulated = simulatedFailure<T>(options)

      if (simulated) {
        resolve(clone(simulated))
        return
      }

      try {
        resolve(clone(producer()))
      } catch {
        resolve(failure<T>('network_error'))
      }
    }, options.delay_ms ?? defaultDelay)
  })

const getAccessContext = (options: OrganizationIdentityServiceOptions = {}): IdentityAccessContext => {
  if (options.no_third_party) {
    return organizationIdentityNoThirdPartyAccessContext
  }

  return organizationIdentityAccessContexts[options.access_context_key ?? 'system_admin']
}

const requirePermission = <T>(
  permission: IdentityPermissionKey,
  options: OrganizationIdentityServiceOptions,
): ServiceResult<T> | null => {
  const context = getAccessContext(options)

  if (!context.permissions.includes(permission)) {
    return failure<T>('no_permission')
  }

  return null
}

const requireAnyPermission = <T>(
  permissions: IdentityPermissionKey[],
  options: OrganizationIdentityServiceOptions,
): ServiceResult<T> | null => {
  const context = getAccessContext(options)

  if (!permissions.some((permission) => context.permissions.includes(permission))) {
    return failure<T>('no_permission')
  }

  return null
}

const emitSuccessfulIdentityRefresh = (
  topics: RefreshTopic | readonly RefreshTopic[],
  changeType: RefreshChangeType,
  targetId?: EntityId,
  relatedUserIds?: EntityId[],
): void => {
  emitIdentityRefreshForTopics(topics, {
    change_type: changeType,
    target_id: targetId,
    related_user_ids: relatedUserIds,
  })
}

const userRefreshTopics = (
  userId: EntityId,
  options: OrganizationIdentityServiceOptions,
): RefreshTopic[] => {
  const topics: RefreshTopic[] = [
    identityRefreshTopics.users,
    identityRefreshTopics.userDetail,
    identityRefreshTopics.auditLogs,
    identityRefreshTopics.overview,
  ]

  if (userId === getAccessContext(options).current_user_id) {
    topics.push(identityRefreshTopics.profile)
  }

  return topics
}

const auditTargetRefreshTopics = (auditLog: AuditLog): RefreshTopic[] => {
  const topics: RefreshTopic[] = [identityRefreshTopics.auditLogs, identityRefreshTopics.overview]

  if (auditLog.target_type === 'user') {
    topics.push(identityRefreshTopics.users, identityRefreshTopics.userDetail)
  }

  if (auditLog.target_type === 'profile') {
    topics.push(identityRefreshTopics.profile)
  }

  if (auditLog.target_type === 'department') {
    topics.push(identityRefreshTopics.departments)
  }

  if (auditLog.target_type === 'user_group') {
    topics.push(identityRefreshTopics.groups)
  }

  if (auditLog.target_type === 'role') {
    topics.push(identityRefreshTopics.roles)
  }

  if (auditLog.target_type === 'identity_binding') {
    topics.push(identityRefreshTopics.bindings)
  }

  if (auditLog.target_type === 'license_assignment' || auditLog.target_type === 'license_policy') {
    topics.push(identityRefreshTopics.licenses)
  }

  if (auditLog.target_type === 'tenant') {
    topics.push(identityRefreshTopics.tenant)
  }

  return topics
}

const includesKeyword = (keyword: string | undefined, values: Array<string | null | undefined>): boolean => {
  if (!keyword?.trim()) {
    return true
  }

  const normalizedKeyword = keyword.trim().toLowerCase()
  return values.some((value) => value?.toLowerCase().includes(normalizedKeyword))
}

const matchesDateRange = (value: string | null | undefined, range?: DateRangeFilter): boolean => {
  if (!value || !range) {
    return true
  }

  const date = value.slice(0, 10)
  return (!range.start || date >= range.start) && (!range.end || date <= range.end)
}

const sortValue = <T extends object>(item: T, sortBy?: string): string | number => {
  if (!sortBy) {
    return ''
  }

  const value = (item as Record<string, unknown>)[sortBy]

  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string') {
    return value
  }

  return ''
}

const applySort = <T extends object>(items: T[], sortBy?: string, sortOrder: SortOrder = 'desc'): T[] => {
  if (!sortBy) {
    return [...items]
  }

  return [...items].sort((left, right) => {
    const leftValue = sortValue(left, sortBy)
    const rightValue = sortValue(right, sortBy)

    if (leftValue === rightValue) {
      return 0
    }

    const result = leftValue > rightValue ? 1 : -1
    return sortOrder === 'asc' ? result : -result
  })
}

const paginate = <T extends object>(
  items: T[],
  query: OrganizationIdentityListQuery = {},
): PaginatedResult<T> => {
  const page = Math.max(query.pagination?.page ?? 1, 1)
  const pageSize = query.pagination?.page_size ?? 20
  const sorted = applySort(items, query.sort_by, query.sort_order)
  const start = (page - 1) * pageSize

  return {
    items: sorted.slice(start, start + pageSize),
    pagination: {
      page,
      page_size: pageSize,
      total: items.length,
    },
  }
}

const findDepartmentNode = (
  nodes: DepartmentTreeNode[],
  departmentId: EntityId,
): DepartmentTreeNode | undefined => {
  for (const node of nodes) {
    if (node.department_id === departmentId) {
      return node
    }

    const child = findDepartmentNode(node.children, departmentId)

    if (child) {
      return child
    }
  }

  return undefined
}

const userById = (userId: EntityId): User | undefined =>
  organizationIdentityUsers.find((user) => user.user_id === userId)

const userIsInManageScope = (userId: EntityId, context: IdentityAccessContext): boolean => {
  const scope = context.manage_scope

  if (scope.scope_type === 'tenant') {
    return true
  }

  if (scope.user_ids.includes(userId)) {
    return true
  }

  const user = userById(userId)
  return Boolean(user?.department_id && scope.department_ids.includes(user.department_id))
}

const auditLogIsInManageScope = (log: AuditLog, context: IdentityAccessContext): boolean => {
  const scope = context.manage_scope

  if (scope.scope_type === 'tenant') {
    return true
  }

  if (userIsInManageScope(log.operator_user_id, context)) {
    return true
  }

  if (log.target_type === 'user' || log.target_type === 'profile') {
    return userIsInManageScope(log.target_id, context)
  }

  if (log.target_type === 'department') {
    return scope.department_ids.includes(log.target_id)
  }

  if (log.target_type === 'user_group') {
    return scope.user_group_ids.includes(log.target_id)
  }

  if (log.target_type === 'identity_binding') {
    const binding = organizationIdentityBindings.find((item) => item.binding_id === log.target_id)
    return binding ? userIsInManageScope(binding.user_id, context) : false
  }

  if (log.target_type === 'license_assignment') {
    const assignment = organizationIdentityLicenseAssignments.find((item) => item.assignment_id === log.target_id)
    return assignment ? userIsInManageScope(assignment.user_id, context) : false
  }

  return false
}

const licenseSummary = (options: OrganizationIdentityServiceOptions = {}): TenantLicenseSummary =>
  organizationIdentityLicenseSummaries[options.license_scenario ?? 'full']

const userIdsInGroup = (groupId: EntityId): EntityId[] =>
  organizationIdentityUserGroupDetails
    .find((detail) => detail.group.group_id === groupId)
    ?.members.map((member) => member.user_id) ?? []

const userIdsInRole = (roleId: EntityId): EntityId[] =>
  organizationIdentityRoleMembers.filter((member) => member.role_id === roleId).map((member) => member.user_id)

const filterUsers = (query: OrganizationIdentityListQuery<UserListFilter> = {}): User[] => {
  const filters = query.filters ?? {}

  return organizationIdentityUsers.filter((user) => {
    if ((!filters.status || filters.status === 'all') && user.status === 'deleted') {
      return false
    }

    return (
      includesKeyword(query.keyword, [
        user.username,
        user.display_name,
        user.email,
        user.mobile,
        user.employee_no,
      ]) &&
      (!filters.status || filters.status === 'all' || user.status === filters.status) &&
      (!filters.source_type || filters.source_type === 'all' || user.source_type === filters.source_type) &&
      (!filters.auth_type || filters.auth_type === 'all' || user.auth_type === filters.auth_type) &&
      (!filters.license_status ||
        filters.license_status === 'all' ||
        user.license_status === filters.license_status) &&
      (!filters.department_id || user.department_id === filters.department_id) &&
      (!filters.group_id || userIdsInGroup(filters.group_id).includes(user.user_id)) &&
      (!filters.role_id || userIdsInRole(filters.role_id).includes(user.user_id)) &&
      matchesDateRange(user.last_login_at, filters.last_login_range) &&
      matchesDateRange(user.created_at, filters.created_range)
    )
  })
}

const filterDepartments = (query: OrganizationIdentityListQuery<DepartmentListFilter> = {}): Department[] => {
  const filters = query.filters ?? {}

  return organizationIdentityDepartments.filter(
    (department) =>
      includesKeyword(query.keyword, [department.department_name, department.department_code]) &&
      (!filters.status || filters.status === 'all' || department.status === filters.status) &&
      (!filters.source_type || filters.source_type === 'all' || department.source_type === filters.source_type) &&
      (filters.parent_department_id === undefined ||
        department.parent_department_id === filters.parent_department_id),
  )
}

const filterUserGroups = (query: OrganizationIdentityListQuery<UserGroupListFilter> = {}): UserGroup[] => {
  const filters = query.filters ?? {}

  return organizationIdentityUserGroups.filter(
    (group) =>
      includesKeyword(query.keyword ?? filters.group_name, [group.group_name, group.display_name]) &&
      (!filters.group_type || filters.group_type === 'all' || group.group_type === filters.group_type) &&
      (!filters.source_type || filters.source_type === 'all' || group.source_type === filters.source_type) &&
      (!filters.status || filters.status === 'all' || group.status === filters.status) &&
      (!filters.owner_user_id || group.owner_user_id === filters.owner_user_id) &&
      (!filters.project_id || group.project_id === filters.project_id),
  )
}

const filterRoles = (query: OrganizationIdentityListQuery<RoleMemberListFilter> = {}): Role[] => {
  const filters = query.filters ?? {}

  return organizationIdentityRoles.filter((role) => {
    if (filters.role_id && role.role_id !== filters.role_id) {
      return false
    }

    const memberFiltersEnabled = Boolean(filters.user_status || filters.department_id || filters.join_method)

    if (!memberFiltersEnabled) {
      return includesKeyword(query.keyword, [role.role_name, role.role_type])
    }

    const members = organizationIdentityRoleMembers.filter((member) => member.role_id === role.role_id)

    return (
      includesKeyword(query.keyword, [role.role_name, role.role_type]) &&
      members.some((member) => {
        const user = userById(member.user_id)

        return (
          (!filters.join_method || member.join_method === filters.join_method) &&
          (!filters.user_status || filters.user_status === 'all' || user?.status === filters.user_status) &&
          (!filters.department_id || user?.department_id === filters.department_id)
        )
      })
    )
  })
}

const filterBindings = (
  query: OrganizationIdentityListQuery<IdentityBindingListFilter> = {},
  options: OrganizationIdentityServiceOptions = {},
): IdentityBinding[] => {
  if (options.no_third_party) {
    return []
  }

  const filters = query.filters ?? {}

  return organizationIdentityBindings.filter((binding) => {
    const user = userById(binding.user_id)

    return (
      includesKeyword(query.keyword, [
        binding.external_user_id,
        binding.external_display_name,
        binding.external_email,
        binding.external_mobile,
        user?.username,
        user?.display_name,
      ]) &&
      (!filters.provider || filters.provider === 'all' || binding.provider === filters.provider) &&
      (!filters.binding_status ||
        filters.binding_status === 'all' ||
        binding.binding_status === filters.binding_status) &&
      (!filters.user_status || filters.user_status === 'all' || user?.status === filters.user_status) &&
      matchesDateRange(binding.last_sync_at, filters.last_sync_range)
    )
  })
}

const filterLicenseAssignments = (
  query: OrganizationIdentityListQuery<LicenseListFilter> = {},
): LicenseAssignment[] => {
  const filters = query.filters ?? {}

  return organizationIdentityLicenseAssignments.filter((assignment) => {
    const user = userById(assignment.user_id)

    return (
      includesKeyword(query.keyword, [user?.username, user?.display_name, user?.email]) &&
      (!filters.user_status || filters.user_status === 'all' || user?.status === filters.user_status) &&
      (!filters.license_status ||
        filters.license_status === 'all' ||
        assignment.status === filters.license_status ||
        user?.license_status === filters.license_status) &&
      (!filters.license_type || filters.license_type === 'all' || assignment.license_type === filters.license_type) &&
      (!filters.department_id || user?.department_id === filters.department_id)
    )
  })
}

const filterAuditLogs = (
  query: OrganizationIdentityListQuery<AuditLogListFilter> = {},
  options: OrganizationIdentityServiceOptions = {},
): AuditLog[] => {
  const filters = query.filters ?? {}
  const context = getAccessContext(options)

  return identityAuditLogStore.filter(
    (log) =>
      auditLogIsInManageScope(log, context) &&
      includesKeyword(query.keyword, [log.operator_name, log.target_name, log.request_ip]) &&
      (!filters.action || filters.action === 'all' || log.action === filters.action) &&
      (!filters.target_type || filters.target_type === 'all' || log.target_type === filters.target_type) &&
      (!filters.target_id || log.target_id === filters.target_id) &&
      (!filters.operator_user_id || log.operator_user_id === filters.operator_user_id) &&
      (!filters.result || filters.result === 'all' || log.result === filters.result) &&
      matchesDateRange(log.operated_at, filters.operated_range),
  )
}

const detailFromUser = (user: User): UserDetail => ({
  user,
  organization: {
    user_id: user.user_id,
    primary_department:
      organizationIdentityDepartments.find((department) => department.department_id === user.department_id) ?? null,
    department_path: [],
    department_manager: null,
    position: user.position,
    manager_user: null,
    subordinate_users: [],
  },
  user_groups: [],
  roles: [],
  license: null,
  identity_bindings: [],
  login_devices: [],
  audit_logs: [],
  action_decisions: {},
})

export const getIdentityAccessContext = (
  options: OrganizationIdentityServiceOptions = {},
): Promise<ServiceResult<IdentityAccessContext>> =>
  resolveService(() => success(getAccessContext(options)), options)

export const getTenantInfo = (options: OrganizationIdentityServiceOptions = {}): Promise<ServiceResult<Tenant>> =>
  resolveService(() => requirePermission<Tenant>('view_tenant', options) ?? success(organizationIdentityTenant), options)

export const getTenantLicenseSummary = (
  options: OrganizationIdentityServiceOptions = {},
): Promise<ServiceResult<TenantLicenseSummary>> =>
  resolveService(
    () => requirePermission<TenantLicenseSummary>('view_license', options) ?? success(licenseSummary(options)),
    options,
  )

export const getTenantIdentityPolicy = (
  options: OrganizationIdentityServiceOptions = {},
): Promise<ServiceResult<TenantIdentityPolicy>> =>
  resolveService(() => {
    const blocked = requirePermission<TenantIdentityPolicy>('view_tenant', options)

    if (blocked) {
      return blocked
    }

    if (options.no_third_party) {
      return success({
        ...organizationIdentityPolicy,
        sso_enabled: false,
        third_party_providers: [],
      })
    }

    return success(organizationIdentityPolicy)
  }, options)

export const getUserCreationIdentityPolicy = (
  options: OrganizationIdentityServiceOptions = {},
): Promise<ServiceResult<UserCreationIdentityPolicy>> =>
  resolveService(() => {
    const blocked = requireAnyPermission<UserCreationIdentityPolicy>(['create_user', 'edit_user'], options)

    if (blocked) {
      return blocked
    }

    const policy = options.no_third_party
      ? {
          ...organizationIdentityPolicy,
          sso_enabled: false,
          third_party_providers: [],
        }
      : organizationIdentityPolicy
    const availableAuthTypes: User['auth_type'][] = []

    if (policy.password_login_enabled) {
      availableAuthTypes.push('password')
    }

    if (policy.sso_enabled) {
      availableAuthTypes.push('sso')
    }

    if (policy.password_login_enabled && policy.sso_enabled) {
      availableAuthTypes.push('mixed')
    }

    return success({
      available_auth_types: availableAuthTypes,
      default_auth_type: availableAuthTypes[0] ?? 'password',
      sso_enabled: policy.sso_enabled,
      password_login_enabled: policy.password_login_enabled,
      sms_verification_enabled: policy.sms_verification_enabled,
      email_notification_enabled: policy.email_notification_enabled,
      third_party_providers: policy.third_party_providers,
    })
  }, options)

export const listDepartmentOptions = (
  options: OrganizationIdentityServiceOptions = {},
): Promise<ServiceResult<Department[]>> =>
  resolveService(() => {
    const blocked = requireAnyPermission<Department[]>(['create_user', 'edit_user'], options)

    if (blocked) {
      return blocked
    }

    return success(organizationIdentityDepartments.filter((department) => department.status === 'active'))
  }, options)

export const listManageableUserGroups = (
  options: OrganizationIdentityServiceOptions = {},
): Promise<ServiceResult<UserGroup[]>> =>
  resolveService(() => {
    const blocked = requireAnyPermission<UserGroup[]>(['create_user', 'edit_user'], options)

    if (blocked) {
      return blocked
    }

    const context = getAccessContext(options)
    const manageableGroupIds = new Set(context.manage_scope.user_group_ids)

    return success(
      organizationIdentityUserGroups.filter(
        (group) =>
          group.status === 'active' &&
          (context.manage_scope.scope_type === 'tenant' || manageableGroupIds.has(group.group_id)),
      ),
    )
  }, options)

export const listAssignableRoles = (
  options: OrganizationIdentityServiceOptions = {},
): Promise<ServiceResult<Role[]>> =>
  resolveService(() => {
    const blocked = requireAnyPermission<Role[]>(['create_user', 'edit_user'], options)

    if (blocked) {
      return blocked
    }

    return success(
      organizationIdentityRoles.filter((role) => role.status === 'active' && role.role_id !== 'role_system_admin'),
    )
  }, options)

export const listLicenseOptions = (
  options: OrganizationIdentityServiceOptions = {},
): Promise<ServiceResult<LicenseOptionsResult>> =>
  resolveService(() => {
    const blocked = requireAnyPermission<LicenseOptionsResult>(
      ['create_user', 'edit_user', 'assign_license'],
      options,
    )

    if (blocked) {
      return blocked
    }

    const summary = licenseSummary(options)
    const disabled = summary.remaining_license_count <= 0
    const licenseTypes: LicenseType[] = ['full', 'viewer', 'developer', 'admin']

    return success({
      summary,
      options: licenseTypes.map((licenseType) => ({
        license_type: licenseType,
        disabled,
        disabled_reason: disabled ? 'license_exhausted' : undefined,
      })),
    })
  }, options)

export const listUsers = (
  query: OrganizationIdentityListQuery<UserListFilter> = {},
  options: OrganizationIdentityServiceOptions = {},
): Promise<ServiceResult<PaginatedResult<User>>> =>
  resolveService(
    () => requirePermission<PaginatedResult<User>>('view_users', options) ?? success(paginate(filterUsers(query), query)),
    options,
  )

export const getUserDetail = (
  userId: EntityId,
  options: OrganizationIdentityServiceOptions = {},
): Promise<ServiceResult<UserDetail>> =>
  resolveService(() => {
    const blocked = requirePermission<UserDetail>('view_users', options)

    if (blocked) {
      return blocked
    }

    const detail = organizationIdentityUserDetails.find((item) => item.user.user_id === userId)
    return detail
      ? success({
          ...detail,
          audit_logs: identityAuditLogStore.filter((log) => log.target_type === 'user' && log.target_id === userId),
        })
      : failure<UserDetail>('not_found')
  }, options)

export const getUserEditableDetail = (
  userId: EntityId,
  options: OrganizationIdentityServiceOptions = {},
): Promise<ServiceResult<UserEditableDetail>> =>
  resolveService(() => {
    const blocked = requirePermission<UserEditableDetail>('edit_user', options)

    if (blocked) {
      return blocked
    }

    const detail = organizationIdentityUserEditableDetailsByUserId[userId]
    return detail ? success(detail) : failure<UserEditableDetail>('not_found')
  }, options)

export const listDepartments = (
  query: OrganizationIdentityListQuery<DepartmentListFilter> = {},
  options: OrganizationIdentityServiceOptions = {},
): Promise<ServiceResult<PaginatedResult<Department>>> =>
  resolveService(
    () =>
      requirePermission<PaginatedResult<Department>>('view_departments', options) ??
      success(paginate(filterDepartments(query), query)),
    options,
  )

export const getDepartmentTree = (
  options: OrganizationIdentityServiceOptions = {},
): Promise<ServiceResult<DepartmentTreeNode[]>> =>
  resolveService(
    () => requirePermission<DepartmentTreeNode[]>('view_departments', options) ?? success(organizationIdentityDepartmentTree),
    options,
  )

export const getDepartmentDetail = (
  departmentId: EntityId,
  options: OrganizationIdentityServiceOptions = {},
): Promise<ServiceResult<DepartmentDetail>> =>
  resolveService(() => {
    const blocked = requirePermission<DepartmentDetail>('view_departments', options)

    if (blocked) {
      return blocked
    }

    const department = organizationIdentityDepartments.find((item) => item.department_id === departmentId)

    if (!department) {
      return failure<DepartmentDetail>('not_found')
    }

    return success({
      department,
      tree_node: findDepartmentNode(organizationIdentityDepartmentTree, departmentId),
      members: organizationIdentityDepartmentMembersByDepartmentId[departmentId] ?? [],
      delete_impact: organizationIdentityDepartmentDeleteImpactsByDepartmentId[departmentId],
      audit_logs: identityAuditLogStore.filter(
        (log) => log.target_type === 'department' && log.target_id === departmentId,
      ),
    })
  }, options)

export const listUserGroups = (
  query: OrganizationIdentityListQuery<UserGroupListFilter> = {},
  options: OrganizationIdentityServiceOptions = {},
): Promise<ServiceResult<PaginatedResult<UserGroup>>> =>
  resolveService(
    () =>
      requirePermission<PaginatedResult<UserGroup>>('view_user_groups', options) ??
      success(paginate(filterUserGroups(query), query)),
    options,
  )

export const getUserGroupDetail = (
  groupId: EntityId,
  options: OrganizationIdentityServiceOptions = {},
): Promise<ServiceResult<UserGroupDetail>> =>
  resolveService(() => {
    const blocked = requirePermission<UserGroupDetail>('view_user_groups', options)

    if (blocked) {
      return blocked
    }

    const detail = organizationIdentityUserGroupDetails.find((item) => item.group.group_id === groupId)
    return detail
      ? success({
          ...detail,
          audit_logs: identityAuditLogStore.filter(
            (log) => log.target_type === 'user_group' && log.target_id === groupId,
          ),
        })
      : failure<UserGroupDetail>('not_found')
  }, options)

export const listRoles = (
  query: OrganizationIdentityListQuery<RoleMemberListFilter> = {},
  options: OrganizationIdentityServiceOptions = {},
): Promise<ServiceResult<PaginatedResult<Role>>> =>
  resolveService(
    () => requirePermission<PaginatedResult<Role>>('view_role_members', options) ?? success(paginate(filterRoles(query), query)),
    options,
  )

export const listIdentityBindings = (
  query: OrganizationIdentityListQuery<IdentityBindingListFilter> = {},
  options: OrganizationIdentityServiceOptions = {},
): Promise<ServiceResult<PaginatedResult<IdentityBinding>>> =>
  resolveService(
    () =>
      requirePermission<PaginatedResult<IdentityBinding>>('view_identity_bindings', options) ??
      success(paginate(filterBindings(query, options), query)),
    options,
  )

export const listIdentityConflicts = (
  query: OrganizationIdentityListQuery = {},
  options: OrganizationIdentityServiceOptions = {},
): Promise<ServiceResult<PaginatedResult<IdentityConflict>>> =>
  resolveService(
    () =>
      requirePermission<PaginatedResult<IdentityConflict>>('view_identity_bindings', options) ??
      success(paginate(options.no_third_party ? [] : organizationIdentityConflicts, query)),
    options,
  )

export const getEmptyThirdPartySeed = (
  options: OrganizationIdentityServiceOptions = {},
): Promise<ServiceResult<EmptyThirdPartySeed>> =>
  resolveService(
    () => requirePermission<EmptyThirdPartySeed>('view_identity_bindings', options) ?? success(organizationIdentityEmptyThirdPartySeed),
    { ...options, no_third_party: true },
  )

export const getLicenseOverview = (
  options: OrganizationIdentityServiceOptions = {},
): Promise<ServiceResult<LicenseOverview>> =>
  resolveService(() => {
    const blocked = requirePermission<LicenseOverview>('view_license', options)

    if (blocked) {
      return blocked
    }

    const summary = licenseSummary(options)
    const warningLevel = summary.remaining_license_count === 0 ? 'exhausted' : summary.usage_rate >= 90 ? 'high_usage' : 'none'

    return success({
      summary,
      assignments: organizationIdentityLicenseAssignments,
      operation_records: organizationIdentityLicenseOperationRecords,
      is_full: summary.remaining_license_count === 0,
      warning_level: warningLevel,
    })
  }, options)

export const listLicenseAssignments = (
  query: OrganizationIdentityListQuery<LicenseListFilter> = {},
  options: OrganizationIdentityServiceOptions = {},
): Promise<ServiceResult<PaginatedResult<LicenseAssignment>>> =>
  resolveService(
    () =>
      requirePermission<PaginatedResult<LicenseAssignment>>('view_license', options) ??
      success(paginate(filterLicenseAssignments(query), query)),
    options,
  )

export const getMyProfile = (
  options: OrganizationIdentityServiceOptions = {},
): Promise<ServiceResult<UserDetail>> =>
  resolveService(() => {
    const blocked = requirePermission<UserDetail>('view_profile', options)

    if (blocked) {
      return blocked
    }

    const currentUserId = getAccessContext(options).current_user_id
    const detail = organizationIdentityUserDetails.find((item) => item.user.user_id === currentUserId)
    return detail
      ? success({
          ...detail,
          audit_logs: identityAuditLogStore.filter(
            (log) =>
              (log.target_type === 'user' || log.target_type === 'profile') &&
              log.target_id === currentUserId,
          ),
        })
      : failure<UserDetail>('not_found')
  }, options)

export const listIdentityAuditLogs = (
  query: OrganizationIdentityListQuery<AuditLogListFilter> = {},
  options: OrganizationIdentityServiceOptions = {},
): Promise<ServiceResult<PaginatedResult<AuditLog>>> =>
  resolveService(
    () =>
      requirePermission<PaginatedResult<AuditLog>>('view_audit_logs', options) ??
      success(paginate(filterAuditLogs(query, options), query)),
    options,
  )

// Most write methods are contract-level mock responses and do not persist changes back to seed data.
// Audit log writes persist to the runtime audit store so later queries can verify the recorded log.
export const createUser = (
  payload: CreateUserPayload,
  options: OrganizationIdentityServiceOptions = {},
): Promise<ServiceResult<UserDetail>> =>
  resolveService(() => {
    const blocked = requirePermission<UserDetail>('create_user', options)

    if (blocked) {
      return blocked
    }

    const duplicatedUser = organizationIdentityUsers.find(
      (user) =>
        user.username === payload.username ||
        Boolean(payload.email && user.email === payload.email) ||
        Boolean(payload.mobile && user.mobile === payload.mobile) ||
        Boolean(payload.employee_no && user.employee_no === payload.employee_no),
    )

    if (duplicatedUser) {
      return failure<UserDetail>('duplicate_value', '用户名、邮箱、手机号或工号已存在')
    }

    if (payload.assign_license && licenseSummary(options).remaining_license_count <= 0) {
      return failure<UserDetail>('license_exhausted')
    }

    const user: User = {
      user_id: makeId('user'),
      username: payload.username,
      display_name: payload.display_name,
      email: payload.email ?? null,
      mobile: payload.mobile ?? null,
      employee_no: payload.employee_no ?? null,
      avatar_url: null,
      department_id: payload.department_id ?? null,
      position: payload.position ?? null,
      user_type: payload.user_type ?? 'internal',
      source_type: payload.source_type ?? 'local',
      auth_type: payload.auth_type ?? 'password',
      status: payload.send_activation_notice ? 'pending' : 'active',
      license_status: payload.assign_license ? 'occupied' : 'not_occupied',
      last_login_at: null,
      created_at: now(),
      updated_at: now(),
    }

    const refreshTopics = payload.assign_license
      ? [...userRefreshTopics(user.user_id, options), identityRefreshTopics.licenses]
      : userRefreshTopics(user.user_id, options)

    emitSuccessfulIdentityRefresh(refreshTopics, 'created', user.user_id, [user.user_id])

    return success(detailFromUser(user))
  }, options)

export const updateUser = (
  userId: EntityId,
  payload: UpdateUserPayload,
  options: OrganizationIdentityServiceOptions = {},
): Promise<ServiceResult<UserDetail>> =>
  resolveService(() => {
    const blocked = requirePermission<UserDetail>('edit_user', options)

    if (blocked) {
      return blocked
    }

    const detail = organizationIdentityUserDetails.find((item) => item.user.user_id === userId)

    if (!detail) {
      return failure<UserDetail>('not_found')
    }

    if (detail.user.status === 'deleted') {
      return failure<UserDetail>('business_blocked', '已删除用户不可编辑')
    }

    if (detail.user.source_type !== 'local') {
      const readonlyKeys: Array<keyof UpdateUserPayload> = [
        'username',
        'display_name',
        'email',
        'mobile',
        'employee_no',
        'department_id',
      ]
      const changedReadonlyField = readonlyKeys.some((key) => payload[key] !== undefined)

      if (changedReadonlyField) {
        return failure<UserDetail>('business_blocked', '外部同步用户关键字段不可本地覆盖')
      }
    }

    const updatedDetail: UserDetail = {
      ...detail,
      user: {
        ...detail.user,
        ...payload,
        user_id: detail.user.user_id,
        updated_at: now(),
      },
    }

    emitSuccessfulIdentityRefresh(userRefreshTopics(userId, options), 'updated', userId, [userId])

    return success(updatedDetail)
  }, options)

export const disableUser = (
  userId: EntityId,
  options: OrganizationIdentityServiceOptions = {},
): Promise<ServiceResult<UserDetail>> =>
  resolveService(() => {
    const blocked = requirePermission<UserDetail>('disable_user', options)

    if (blocked) {
      return blocked
    }

    const detail = organizationIdentityUserDetails.find((item) => item.user.user_id === userId)

    if (!detail) {
      return failure<UserDetail>('not_found')
    }

    if (organizationIdentityTenant.admin_user_ids.length === 1 && organizationIdentityTenant.admin_user_ids.includes(userId)) {
      return failure<UserDetail>('business_blocked', '至少需要保留一名系统管理员')
    }

    if (detail.user.status !== 'active') {
      return failure<UserDetail>('business_blocked', '只有已启用用户可以被禁用')
    }

    const updatedDetail: UserDetail = {
      ...detail,
      user: {
        ...detail.user,
        status: 'disabled',
        license_status: 'not_occupied',
        disabled_at: now(),
        updated_at: now(),
      },
    }

    emitSuccessfulIdentityRefresh(
      [...userRefreshTopics(userId, options), identityRefreshTopics.licenses],
      'status_changed',
      userId,
      [userId],
    )

    return success(updatedDetail)
  }, options)

export const enableUser = (
  userId: EntityId,
  options: OrganizationIdentityServiceOptions = {},
): Promise<ServiceResult<UserDetail>> =>
  resolveService(() => {
    const blocked = requirePermission<UserDetail>('enable_user', options)

    if (blocked) {
      return blocked
    }

    const detail = organizationIdentityUserDetails.find((item) => item.user.user_id === userId)

    if (!detail) {
      return failure<UserDetail>('not_found')
    }

    if (detail.user.status === 'deleted') {
      return failure<UserDetail>('business_blocked', '已删除用户不可启用')
    }

    const updatedDetail: UserDetail = {
      ...detail,
      user: {
        ...detail.user,
        status: 'active',
        disabled_at: null,
        updated_at: now(),
      },
    }

    emitSuccessfulIdentityRefresh(userRefreshTopics(userId, options), 'status_changed', userId, [userId])

    return success(updatedDetail)
  }, options)

export const deleteUser = (
  userId: EntityId,
  payload: DeleteUserPayload = {},
  options: OrganizationIdentityServiceOptions = {},
): Promise<ServiceResult<UserDeleteResult>> =>
  resolveService(() => {
    const blocked = requirePermission<UserDeleteResult>('delete_user', options)

    if (blocked) {
      return blocked
    }

    const detail = organizationIdentityUserDetails.find((item) => item.user.user_id === userId)

    if (!detail) {
      return failure<UserDeleteResult>('not_found')
    }

    const impact = organizationIdentityUserDeleteImpactsByUserId[userId]

    if (impact && !impact.can_delete) {
      return failure<UserDeleteResult>('business_blocked', impact.blockers[0]?.message ?? '删除前需要处理阻断项')
    }

    const deleteResult: UserDeleteResult = {
      user_id: userId,
      deleted_user: {
        ...detail.user,
        status: 'deleted',
        license_status: 'not_occupied',
        deleted_at: now(),
        updated_at: now(),
      },
      transfer_to_user_id: payload.transfer_to_user_id ?? null,
    }

    emitSuccessfulIdentityRefresh(
      [...userRefreshTopics(userId, options), identityRefreshTopics.licenses],
      'deleted',
      userId,
      [userId],
    )

    return success(deleteResult)
  }, options)

export interface UserDeleteResult {
  user_id: EntityId
  deleted_user: User
  transfer_to_user_id: EntityId | null
}

export const createDepartment = (
  payload: CreateDepartmentPayload,
  options: OrganizationIdentityServiceOptions = {},
): Promise<ServiceResult<Department>> =>
  resolveService(() => {
    const blocked = requirePermission<Department>('create_department', options)

    if (blocked) {
      return blocked
    }

    const duplicatedName = organizationIdentityDepartments.some(
      (department) =>
        department.parent_department_id === (payload.parent_department_id ?? null) &&
        department.department_name === payload.department_name,
    )

    if (duplicatedName) {
      return failure<Department>('duplicate_value', '同一父部门下部门名称不可重复')
    }

    const department: Department = {
      department_id: makeId('dept'),
      parent_department_id: payload.parent_department_id ?? null,
      department_name: payload.department_name,
      department_code: payload.department_code ?? null,
      source_type: payload.source_type ?? 'local',
      manager_user_id: payload.manager_user_id ?? null,
      sort_order: payload.sort_order ?? 0,
      status: payload.status ?? 'active',
      created_at: now(),
      updated_at: now(),
    }

    emitSuccessfulIdentityRefresh(
      [identityRefreshTopics.departments, identityRefreshTopics.auditLogs, identityRefreshTopics.overview],
      'created',
      department.department_id,
    )

    return success(department)
  }, options)

export const updateDepartment = (
  departmentId: EntityId,
  payload: UpdateDepartmentPayload,
  options: OrganizationIdentityServiceOptions = {},
): Promise<ServiceResult<Department>> =>
  resolveService(() => {
    const blocked = requirePermission<Department>('edit_department', options)

    if (blocked) {
      return blocked
    }

    const department = organizationIdentityDepartments.find((item) => item.department_id === departmentId)

    if (!department) {
      return failure<Department>('not_found')
    }

    if (department.source_type !== 'local') {
      return failure<Department>('business_blocked', '外部同步部门不可本地编辑')
    }

    if (payload.parent_department_id === departmentId) {
      return failure<Department>('business_blocked', '上级部门不可选择自身')
    }

    const updatedDepartment: Department = {
      ...department,
      ...payload,
      department_id: department.department_id,
      updated_at: now(),
    }

    emitSuccessfulIdentityRefresh(
      [identityRefreshTopics.departments, identityRefreshTopics.auditLogs, identityRefreshTopics.overview],
      'updated',
      departmentId,
    )

    return success(updatedDepartment)
  }, options)

export const deleteDepartment = (
  departmentId: EntityId,
  options: OrganizationIdentityServiceOptions = {},
): Promise<ServiceResult<DepartmentDeleteImpact>> =>
  resolveService(() => {
    const blocked = requirePermission<DepartmentDeleteImpact>('delete_department', options)

    if (blocked) {
      return blocked
    }

    const department = organizationIdentityDepartments.find((item) => item.department_id === departmentId)

    if (!department) {
      return failure<DepartmentDeleteImpact>('not_found')
    }

    const impact = organizationIdentityDepartmentDeleteImpactsByDepartmentId[departmentId] ?? {
      department_id: department.department_id,
      department_name: department.department_name,
      source_type: department.source_type,
      child_department_count: 0,
      member_count: organizationIdentityDepartmentMembersByDepartmentId[departmentId]?.length ?? 0,
      dynamic_user_group_reference_count: 0,
      blockers: [],
      can_delete: department.source_type === 'local',
    }

    if (!impact.can_delete) {
      return failure<DepartmentDeleteImpact>('business_blocked', impact.blockers[0]?.message)
    }

    emitSuccessfulIdentityRefresh(
      [
        identityRefreshTopics.departments,
        identityRefreshTopics.users,
        identityRefreshTopics.groups,
        identityRefreshTopics.auditLogs,
        identityRefreshTopics.overview,
      ],
      'deleted',
      departmentId,
    )

    return success(impact)
  }, options)

export const createUserGroup = (
  payload: CreateUserGroupPayload,
  options: OrganizationIdentityServiceOptions = {},
): Promise<ServiceResult<UserGroup>> =>
  resolveService(() => {
    const blocked = requirePermission<UserGroup>('create_user_group', options)

    if (blocked) {
      return blocked
    }

    if (organizationIdentityUserGroups.some((group) => group.group_name === payload.group_name)) {
      return failure<UserGroup>('duplicate_value', '用户组名称已存在')
    }

    const group: UserGroup = {
      group_id: makeId('group'),
      group_name: payload.group_name,
      display_name: payload.display_name ?? payload.group_name,
      group_type: payload.group_type,
      description: payload.description ?? null,
      source_type: payload.source_type ?? 'local',
      owner_user_id: payload.owner_user_id,
      project_id: payload.project_id ?? null,
      status: payload.status ?? 'active',
      created_at: now(),
      updated_at: now(),
    }

    emitSuccessfulIdentityRefresh(
      [identityRefreshTopics.groups, identityRefreshTopics.auditLogs, identityRefreshTopics.overview],
      'created',
      group.group_id,
    )

    return success(group)
  }, options)

export const updateUserGroup = (
  groupId: EntityId,
  payload: UpdateUserGroupPayload,
  options: OrganizationIdentityServiceOptions = {},
): Promise<ServiceResult<UserGroup>> =>
  resolveService(() => {
    const blocked = requirePermission<UserGroup>('edit_user_group', options)

    if (blocked) {
      return blocked
    }

    const group = organizationIdentityUserGroups.find((item) => item.group_id === groupId)

    if (!group) {
      return failure<UserGroup>('not_found')
    }

    if (group.source_type !== 'local') {
      return failure<UserGroup>('business_blocked', '外部同步用户组不可本地编辑')
    }

    const updatedGroup: UserGroup = {
      ...group,
      ...payload,
      group_id: group.group_id,
      updated_at: now(),
    }

    emitSuccessfulIdentityRefresh(
      [identityRefreshTopics.groups, identityRefreshTopics.auditLogs, identityRefreshTopics.overview],
      'updated',
      groupId,
    )

    return success(updatedGroup)
  }, options)

export const addUserGroupMembers = (
  groupId: EntityId,
  userIds: EntityId[],
  options: OrganizationIdentityServiceOptions = {},
): Promise<ServiceResult<UserGroupDetail>> =>
  resolveService(() => {
    const blocked = requirePermission<UserGroupDetail>('manage_user_group_members', options)

    if (blocked) {
      return blocked
    }

    const detail = organizationIdentityUserGroupDetails.find((item) => item.group.group_id === groupId)

    if (!detail) {
      return failure<UserGroupDetail>('not_found')
    }

    const users = userIds.map(userById)

    if (users.some((user) => !user)) {
      return failure<UserGroupDetail>('not_found', '存在不存在的用户')
    }

    if (users.some((user) => user?.status !== 'active')) {
      return failure<UserGroupDetail>('business_blocked', '只能添加 active 用户')
    }

    const existingUserIds = new Set(detail.members.map((member) => member.user_id))
    const newMembers = users.flatMap((user) => {
      if (!user || existingUserIds.has(user.user_id)) {
        return []
      }

      return [
        {
          user_id: user.user_id,
          username: user.username,
          display_name: user.display_name,
          email: user.email,
          department_id: user.department_id,
          department_name:
            organizationIdentityDepartments.find((department) => department.department_id === user.department_id)
              ?.department_name ?? null,
          status: user.status,
          join_method: 'manual' as const,
          joined_at: now(),
          removable: true,
        },
      ]
    })

    const updatedDetail: UserGroupDetail = {
      ...detail,
      members: [...detail.members, ...newMembers],
      member_count: detail.member_count + newMembers.length,
    }

    emitSuccessfulIdentityRefresh(
      [
        identityRefreshTopics.groups,
        identityRefreshTopics.users,
        identityRefreshTopics.userDetail,
        identityRefreshTopics.auditLogs,
        identityRefreshTopics.overview,
      ],
      'relationship_changed',
      groupId,
      userIds,
    )

    return success(updatedDetail)
  }, options)

export const removeUserGroupMember = (
  groupId: EntityId,
  userId: EntityId,
  options: OrganizationIdentityServiceOptions = {},
): Promise<ServiceResult<UserGroupDetail>> =>
  resolveService(() => {
    const blocked = requirePermission<UserGroupDetail>('manage_user_group_members', options)

    if (blocked) {
      return blocked
    }

    const detail = organizationIdentityUserGroupDetails.find((item) => item.group.group_id === groupId)

    if (!detail) {
      return failure<UserGroupDetail>('not_found')
    }

    const member = detail.members.find((item) => item.user_id === userId)

    if (!member) {
      return failure<UserGroupDetail>('not_found', '用户不在该用户组中')
    }

    if (!member.removable) {
      return failure<UserGroupDetail>('business_blocked', member.disabled_reason ?? '该成员不可直接移除')
    }

    const updatedDetail: UserGroupDetail = {
      ...detail,
      members: detail.members.filter((item) => item.user_id !== userId),
      member_count: Math.max(detail.member_count - 1, 0),
    }

    emitSuccessfulIdentityRefresh(
      [
        identityRefreshTopics.groups,
        identityRefreshTopics.users,
        identityRefreshTopics.userDetail,
        identityRefreshTopics.auditLogs,
        identityRefreshTopics.overview,
      ],
      'relationship_changed',
      groupId,
      [userId],
    )

    return success(updatedDetail)
  }, options)

export const assignLicense = (
  userId: EntityId,
  payload: AssignLicensePayload,
  options: OrganizationIdentityServiceOptions = {},
): Promise<ServiceResult<LicenseAssignment>> =>
  resolveService(() => {
    const blocked = requirePermission<LicenseAssignment>('assign_license', options)

    if (blocked) {
      return blocked
    }

    const user = userById(userId)

    if (!user) {
      return failure<LicenseAssignment>('not_found')
    }

    if (user.status !== 'active') {
      return failure<LicenseAssignment>('business_blocked', '只有 active 用户可分配 License')
    }

    if (licenseSummary(options).remaining_license_count <= 0) {
      return failure<LicenseAssignment>('license_exhausted')
    }

    if (organizationIdentityLicenseAssignments.some((assignment) => assignment.user_id === userId && assignment.status === 'occupied')) {
      return failure<LicenseAssignment>('business_blocked', '用户已占用 License')
    }

    const assignment: LicenseAssignment = {
      assignment_id: makeId('lic'),
      user_id: userId,
      license_type: payload.license_type,
      status: 'occupied',
      assigned_by: payload.assigned_by ?? getAccessContext(options).current_user_id,
      assigned_at: now(),
      released_at: null,
      release_reason: null,
    }

    emitSuccessfulIdentityRefresh(
      [
        identityRefreshTopics.licenses,
        identityRefreshTopics.users,
        identityRefreshTopics.userDetail,
        identityRefreshTopics.auditLogs,
        identityRefreshTopics.overview,
      ],
      'created',
      assignment.assignment_id,
      [userId],
    )

    return success(assignment)
  }, options)

export const releaseLicense = (
  userId: EntityId,
  payload: ReleaseLicensePayload = {},
  options: OrganizationIdentityServiceOptions = {},
): Promise<ServiceResult<LicenseAssignment>> =>
  resolveService(() => {
    const blocked = requirePermission<LicenseAssignment>('release_license', options)

    if (blocked) {
      return blocked
    }

    const assignment = organizationIdentityLicenseAssignments.find(
      (item) => item.user_id === userId && item.status === 'occupied',
    )

    if (!assignment) {
      return failure<LicenseAssignment>('business_blocked', '用户当前未占用 License')
    }

    const releasedAssignment: LicenseAssignment = {
      ...assignment,
      status: 'released',
      released_at: now(),
      release_reason: payload.release_reason ?? 'manual_release',
    }

    emitSuccessfulIdentityRefresh(
      [
        identityRefreshTopics.licenses,
        identityRefreshTopics.users,
        identityRefreshTopics.userDetail,
        identityRefreshTopics.auditLogs,
        identityRefreshTopics.overview,
      ],
      'updated',
      assignment.assignment_id,
      [userId],
    )

    return success(releasedAssignment)
  }, options)

export const recordIdentityAuditLog = (
  payload: RecordIdentityAuditLogPayload,
  options: OrganizationIdentityServiceOptions = {},
): Promise<ServiceResult<AuditLog>> =>
  resolveService(() => {
    const fieldErrors = validateIdentityAuditRecordPayload(payload)

    if (Object.keys(fieldErrors).length > 0) {
      return failure<AuditLog>('validation_error', '审计日志字段不完整', fieldErrors)
    }

    const auditLog = createIdentityAuditLog(payload, {
      log_id: makeId('audit'),
      operated_at: now(),
    })

    identityAuditLogStore.unshift(auditLog)
    emitSuccessfulIdentityRefresh(
      auditTargetRefreshTopics(auditLog),
      'created',
      auditLog.target_id,
      auditLog.target_type === 'user' || auditLog.target_type === 'profile' ? [auditLog.target_id] : undefined,
    )

    return success(auditLog)
  }, options)

export const organizationIdentityService = {
  getIdentityAccessContext,
  getTenantInfo,
  getTenantLicenseSummary,
  getTenantIdentityPolicy,
  getUserCreationIdentityPolicy,
  listDepartmentOptions,
  listManageableUserGroups,
  listAssignableRoles,
  listLicenseOptions,
  listUsers,
  getUserDetail,
  getUserEditableDetail,
  listDepartments,
  getDepartmentTree,
  getDepartmentDetail,
  listUserGroups,
  getUserGroupDetail,
  listRoles,
  listIdentityBindings,
  listIdentityConflicts,
  getEmptyThirdPartySeed,
  getLicenseOverview,
  listLicenseAssignments,
  getMyProfile,
  listIdentityAuditLogs,
  createUser,
  updateUser,
  disableUser,
  enableUser,
  deleteUser,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  createUserGroup,
  updateUserGroup,
  addUserGroupMembers,
  removeUserGroupMember,
  assignLicense,
  releaseLicense,
  recordIdentityAuditLog,
}
