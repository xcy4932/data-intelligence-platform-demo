import type {
  IdentityAccessContext,
  IdentityAdminRole,
  IdentityPageKey,
  IdentityPermissionKey,
  PermissionDecision,
} from '@/types/organizationIdentity'

export type OrganizationIdentityAccessContextKey = IdentityAdminRole

export interface OrganizationIdentityAccessOptions {
  access_context_key: OrganizationIdentityAccessContextKey
  license_management_enabled: boolean
  no_third_party: boolean
}

export interface OrganizationIdentityServiceAccessOptions {
  access_context_key: OrganizationIdentityAccessContextKey
}

export interface OrganizationIdentityMenuItem {
  pageKey: IdentityPageKey
  label: string
  path: string
  routeSegment: string
}

const localOrganizationIdentityAccessOptions: OrganizationIdentityAccessOptions = {
  access_context_key: 'system_admin',
  license_management_enabled: true,
  no_third_party: false,
}

const organizationIdentityAccessContextKeys = new Set<OrganizationIdentityAccessContextKey>([
  'system_admin',
  'organization_admin',
  'user_admin',
  'normal_user',
])

const getEnvValue = (key: string): string | undefined => {
  const value = import.meta.env[key]
  return value === undefined ? undefined : String(value)
}

const getEnvBoolean = (key: string, fallback: boolean): boolean => {
  const value = getEnvValue(key)
  if (value === undefined) {
    return fallback
  }

  const normalized = value.trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false
  }

  return fallback
}

const getEnvAccessContextKey = (): OrganizationIdentityAccessContextKey => {
  const value = getEnvValue('VITE_ORGANIZATION_IDENTITY_ACCESS_CONTEXT')

  if (organizationIdentityAccessContextKeys.has(value as OrganizationIdentityAccessContextKey)) {
    return value as OrganizationIdentityAccessContextKey
  }

  return localOrganizationIdentityAccessOptions.access_context_key
}

export const currentOrganizationIdentityAccessContextKey = getEnvAccessContextKey()

export const getCurrentOrganizationIdentityAccessOptions = (): OrganizationIdentityAccessOptions => {
  const licenseEnabled = getEnvBoolean(
    'VITE_ORGANIZATION_IDENTITY_LICENSE_MANAGEMENT_ENABLED',
    localOrganizationIdentityAccessOptions.license_management_enabled,
  )
  const licenseDisabled = getEnvBoolean('VITE_ORGANIZATION_IDENTITY_LICENSE_DISABLED', false)

  return {
    access_context_key: currentOrganizationIdentityAccessContextKey,
    license_management_enabled: licenseDisabled ? false : licenseEnabled,
    no_third_party: getEnvBoolean(
      'VITE_ORGANIZATION_IDENTITY_NO_THIRD_PARTY',
      localOrganizationIdentityAccessOptions.no_third_party,
    ),
  }
}

export const getOrganizationIdentityServiceAccessOptions = (
  options: OrganizationIdentityAccessOptions = getCurrentOrganizationIdentityAccessOptions(),
): OrganizationIdentityServiceAccessOptions => ({
  access_context_key: options.access_context_key,
})

export const organizationIdentityMenuItems: OrganizationIdentityMenuItem[] = [
  { pageKey: 'overview', label: '概览', path: '/organization-identity/overview', routeSegment: 'overview' },
  { pageKey: 'tenant_info', label: '企业/集团信息', path: '/organization-identity/tenant', routeSegment: 'tenant' },
  { pageKey: 'users', label: '用户管理', path: '/organization-identity/users', routeSegment: 'users' },
  {
    pageKey: 'departments',
    label: '部门与组织架构',
    path: '/organization-identity/departments',
    routeSegment: 'departments',
  },
  { pageKey: 'user_groups', label: '用户组管理', path: '/organization-identity/user-groups', routeSegment: 'user-groups' },
  {
    pageKey: 'role_members',
    label: '角色成员关系',
    path: '/organization-identity/role-members',
    routeSegment: 'role-members',
  },
  {
    pageKey: 'identity_bindings',
    label: '第三方账号绑定',
    path: '/organization-identity/identity-bindings',
    routeSegment: 'identity-bindings',
  },
  { pageKey: 'licenses', label: 'License 管理', path: '/organization-identity/licenses', routeSegment: 'licenses' },
  { pageKey: 'profile', label: '个人资料', path: '/organization-identity/profile', routeSegment: 'profile' },
]

const identityPageKeySet = new Set<IdentityPageKey>(organizationIdentityMenuItems.map((item) => item.pageKey))

const rolePageMatrix: Record<IdentityAdminRole, readonly IdentityPageKey[]> = {
  system_admin: organizationIdentityMenuItems.map((item) => item.pageKey),
  organization_admin: ['overview', 'users', 'departments', 'user_groups', 'role_members', 'profile'],
  user_admin: ['overview', 'users', 'identity_bindings', 'profile'],
  normal_user: ['profile'],
}

const organizationAdminPermissions: readonly IdentityPermissionKey[] = [
  'view_overview',
  'view_users',
  'edit_user',
  'disable_user',
  'enable_user',
  'send_activation_notice',
  'reset_user_password',
  'view_user_login_records',
  'view_user_operation_logs',
  'view_user_permission_summary',
  'export_users',
  'view_departments',
  'create_department',
  'edit_department',
  'manage_department_members',
  'sync_organization',
  'export_departments',
  'view_user_groups',
  'create_user_group',
  'edit_user_group',
  'disable_user_group',
  'enable_user_group',
  'manage_user_group_members',
  'manage_user_group_subgroups',
  'export_user_groups',
  'view_role_members',
  'add_role_members',
  'remove_role_members',
  'view_profile',
  'edit_profile',
  'change_password',
  'view_login_devices',
  'logout_own_device',
  'logout_other_devices',
  'view_audit_logs',
  'export_audit_logs',
]

const userAdminPermissions: readonly IdentityPermissionKey[] = [
  'view_overview',
  'view_users',
  'create_user',
  'import_users',
  'edit_user',
  'disable_user',
  'enable_user',
  'batch_disable_users',
  'send_activation_notice',
  'reset_user_password',
  'view_user_login_records',
  'view_user_operation_logs',
  'view_user_permission_summary',
  'download_user_import_template',
  'submit_user_import',
  'export_users',
  'view_identity_bindings',
  'manage_identity_bindings',
  'view_profile',
  'edit_profile',
  'change_password',
  'view_login_devices',
  'logout_own_device',
  'logout_other_devices',
]

const normalUserPermissions: readonly IdentityPermissionKey[] = [
  'view_profile',
  'edit_profile',
  'change_password',
  'bind_own_identity',
  'unbind_own_identity',
  'view_login_devices',
  'logout_own_device',
  'logout_other_devices',
]

const roleActionMatrix: Record<IdentityAdminRole, readonly IdentityPermissionKey[] | 'all'> = {
  system_admin: 'all',
  organization_admin: organizationAdminPermissions,
  user_admin: userAdminPermissions,
  normal_user: normalUserPermissions,
}

// roleActionMatrix is the role-level upper bound. The returned accessContext permissions/action_permissions
// still represent the current mock user's actual permissions, and object-level scope checks stay in later
// business services or page action decisions.
const licensePermissionKeys = new Set<IdentityPermissionKey>([
  'view_license',
  'manage_license_policy',
  'assign_license',
  'release_license',
  'batch_assign_license',
  'batch_release_license',
  'view_license_records',
])

const thirdPartyUnavailablePermissionKeys = new Set<IdentityPermissionKey>([
  'manage_identity_bindings',
  'unbind_identity_binding',
])

const allow = (): PermissionDecision => ({ allowed: true, reason: 'allowed' })

const deny = (reason: PermissionDecision['reason'], message: string): PermissionDecision => ({
  allowed: false,
  reason,
  message,
})

export const isIdentityPageKey = (value: unknown): value is IdentityPageKey =>
  typeof value === 'string' && identityPageKeySet.has(value as IdentityPageKey)

export const applyOrganizationIdentityAccessOptions = (
  accessContext: IdentityAccessContext,
  options: OrganizationIdentityAccessOptions = getCurrentOrganizationIdentityAccessOptions(),
): IdentityAccessContext => {
  const pagePermissions = { ...accessContext.page_permissions }
  const actionPermissions = { ...accessContext.action_permissions }
  let permissions = [...accessContext.permissions]

  if (!options.license_management_enabled) {
    pagePermissions.licenses = deny('license_disabled', 'License 管理未开启。')
    licensePermissionKeys.forEach((permissionKey) => {
      actionPermissions[permissionKey] = deny('license_disabled', 'License 管理未开启。')
    })
    permissions = permissions.filter((permissionKey) => !licensePermissionKeys.has(permissionKey))
  }

  if (options.no_third_party) {
    thirdPartyUnavailablePermissionKeys.forEach((permissionKey) => {
      actionPermissions[permissionKey] = deny('feature_disabled', '企业未配置第三方身份源。')
    })
    permissions = permissions.filter((permissionKey) => !thirdPartyUnavailablePermissionKeys.has(permissionKey))
  }

  return {
    ...accessContext,
    permissions,
    page_permissions: pagePermissions,
    action_permissions: actionPermissions,
    license_management_enabled: options.license_management_enabled,
    third_party_identity_configured: options.no_third_party ? false : accessContext.third_party_identity_configured,
  }
}

const hasRolePageAccess = (accessContext: IdentityAccessContext, pageKey: IdentityPageKey): boolean =>
  accessContext.roles.some((role) => rolePageMatrix[role].includes(pageKey))

const hasRoleActionAccess = (accessContext: IdentityAccessContext, permissionKey: IdentityPermissionKey): boolean =>
  accessContext.roles.some((role) => {
    const actionMatrix = roleActionMatrix[role]
    return actionMatrix === 'all' || actionMatrix.includes(permissionKey)
  })

export const canAccessIdentityPage = (
  pageKey: IdentityPageKey,
  accessContext: IdentityAccessContext,
): PermissionDecision => {
  if (pageKey === 'licenses' && !accessContext.license_management_enabled) {
    return deny('license_disabled', 'License 管理未开启。')
  }

  if (!hasRolePageAccess(accessContext, pageKey)) {
    return deny('no_permission', '当前角色无权访问该页面。')
  }

  const pageDecision = accessContext.page_permissions[pageKey]
  if (pageDecision && !pageDecision.allowed) {
    return pageDecision
  }

  if (!accessContext.enabled_pages.includes(pageKey)) {
    return deny('no_permission', '当前访问范围未包含该页面。')
  }

  return allow()
}

export const getOrganizationIdentityPageDecision = (
  pageKey: IdentityPageKey,
  accessContext: IdentityAccessContext,
): PermissionDecision => canAccessIdentityPage(pageKey, accessContext)

export const canPerformIdentityAction = (
  permissionKey: IdentityPermissionKey,
  accessContext: IdentityAccessContext,
): PermissionDecision => {
  if (licensePermissionKeys.has(permissionKey) && !accessContext.license_management_enabled) {
    return deny('license_disabled', 'License 管理未开启。')
  }

  if (!hasRoleActionAccess(accessContext, permissionKey)) {
    return deny('no_permission', '当前角色无权执行该操作。')
  }

  const actionDecision = accessContext.action_permissions[permissionKey]
  if (actionDecision && !actionDecision.allowed) {
    return actionDecision
  }

  if (!accessContext.permissions.includes(permissionKey)) {
    return deny('no_permission', '当前访问上下文未包含该操作权限。')
  }

  return allow()
}

export const getVisibleOrganizationIdentityMenuItems = (
  accessContext: IdentityAccessContext,
): OrganizationIdentityMenuItem[] =>
  organizationIdentityMenuItems.filter((item) => canAccessIdentityPage(item.pageKey, accessContext).allowed)
