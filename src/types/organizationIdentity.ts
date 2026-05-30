import type { EntityId, ISODateString, ISODateTimeString } from './common'

export type TenantLicensePolicy = 'auto_join' | 'manual_assign'
export type TenantStatus = 'active' | 'suspended'

export type UserType = 'internal' | 'external' | 'service'
export type UserSourceType = 'local' | 'ldap' | 'ad' | 'feishu' | 'wecom' | 'dingtalk' | 'sso'
export type DepartmentSourceType = 'local' | 'ldap' | 'ad' | 'feishu' | 'wecom' | 'dingtalk'
export type UserAuthType = 'password' | 'sso' | 'mixed'
export type UserStatus = 'pending' | 'active' | 'disabled' | 'deleted'
export type UserLicenseStatus = 'occupied' | 'not_occupied' | 'pending'

export type DepartmentStatus = 'active' | 'disabled'

export type UserGroupType = 'department' | 'system' | 'project' | 'custom'
export type UserGroupSourceType = 'local' | 'external'
export type UserGroupStatus = 'active' | 'disabled'

export type IdentityProvider = 'feishu' | 'wecom' | 'dingtalk' | 'ldap' | 'ad' | 'saml' | 'oidc' | 'email'
export type IdentityBindingStatus = 'bound' | 'unbound' | 'conflict' | 'invalid'

export type LicenseType = 'full' | 'viewer' | 'developer' | 'admin'
export type LicenseAssignmentStatus = 'occupied' | 'released' | 'pending'

export type IdentityAdminRole = 'system_admin' | 'organization_admin' | 'user_admin' | 'normal_user'
export type ManageScopeType = 'tenant' | 'department_tree' | 'departments' | 'projects' | 'self'

export type IdentityPageKey =
  | 'overview'
  | 'tenant_info'
  | 'users'
  | 'departments'
  | 'user_groups'
  | 'role_members'
  | 'identity_bindings'
  | 'licenses'
  | 'profile'

export type IdentityPermissionKey =
  | 'view_overview'
  | 'view_tenant'
  | 'edit_tenant'
  | 'manage_tenant_admins'
  | 'view_users'
  | 'create_user'
  | 'import_users'
  | 'edit_user'
  | 'disable_user'
  | 'enable_user'
  | 'delete_user'
  | 'batch_disable_users'
  | 'batch_delete_users'
  | 'send_activation_notice'
  | 'reset_user_password'
  | 'view_user_login_records'
  | 'view_user_operation_logs'
  | 'view_user_permission_summary'
  | 'download_user_import_template'
  | 'submit_user_import'
  | 'export_users'
  | 'view_departments'
  | 'create_department'
  | 'edit_department'
  | 'delete_department'
  | 'manage_department_members'
  | 'sync_organization'
  | 'export_departments'
  | 'view_user_groups'
  | 'create_user_group'
  | 'edit_user_group'
  | 'disable_user_group'
  | 'enable_user_group'
  | 'delete_user_group'
  | 'manage_user_group_members'
  | 'manage_user_group_subgroups'
  | 'export_user_groups'
  | 'view_role_members'
  | 'add_role_members'
  | 'remove_role_members'
  | 'view_identity_bindings'
  | 'manage_identity_bindings'
  | 'unbind_identity_binding'
  | 'view_license'
  | 'manage_license_policy'
  | 'assign_license'
  | 'release_license'
  | 'batch_assign_license'
  | 'batch_release_license'
  | 'view_license_records'
  | 'view_profile'
  | 'edit_profile'
  | 'change_password'
  | 'bind_own_identity'
  | 'unbind_own_identity'
  | 'manage_login_devices'
  | 'view_login_devices'
  | 'logout_own_device'
  | 'logout_other_devices'
  | 'view_audit_logs'
  | 'export_audit_logs'

export type PermissionDecisionReason =
  | 'allowed'
  | 'no_permission'
  | 'out_of_scope'
  | 'feature_disabled'
  | 'license_disabled'
  | 'tenant_suspended'
  | 'source_readonly'
  | 'self_operation_forbidden'
  | 'last_system_admin'
  | 'deleted_user'
  | 'license_exhausted'
  | 'only_login_method'
  | 'pending_user'
  | 'disabled_user'
  | 'external_sync'
  | 'has_blocking_references'
  | 'has_untransferred_assets'
  | 'not_active_user'
  | 'duplicate_value'

export type SortOrder = 'asc' | 'desc'

export interface Tenant {
  tenant_id: EntityId
  tenant_name: string
  tenant_logo_url?: string | null
  tenant_code: string
  admin_user_ids: EntityId[]
  license_policy: TenantLicensePolicy
  max_license_count: number
  used_license_count: number
  status: TenantStatus
  created_at: ISODateTimeString
  updated_at: ISODateTimeString
}

export interface TenantUpdatePayload {
  tenant_name: string
  tenant_logo_url?: string | null
  default_language: string
  default_timezone: string
}

export interface TenantIdentityPolicy {
  tenant_id: EntityId
  default_language: string
  default_timezone: string
  sso_enabled: boolean
  password_login_enabled: boolean
  sms_verification_enabled: boolean
  email_notification_enabled: boolean
  third_party_providers: IdentityProvider[]
  profile_editable_fields: ProfileEditableField[]
}

export interface TenantLicenseSummary {
  tenant_id: EntityId
  license_policy: TenantLicensePolicy
  max_license_count: number
  used_license_count: number
  remaining_license_count: number
  pending_assignment_count: number
  disabled_released_count: number
  usage_rate: number
}

export interface User {
  user_id: EntityId
  username: string
  display_name: string
  email?: string | null
  mobile?: string | null
  employee_no?: string | null
  avatar_url?: string | null
  department_id?: EntityId | null
  position?: string | null
  user_type: UserType
  source_type: UserSourceType
  auth_type: UserAuthType
  status: UserStatus
  license_status: UserLicenseStatus
  last_login_at?: ISODateTimeString | null
  created_at: ISODateTimeString
  updated_at: ISODateTimeString
  disabled_at?: ISODateTimeString | null
  deleted_at?: ISODateTimeString | null
}

export type UserEditableField =
  | 'display_name'
  | 'email'
  | 'mobile'
  | 'employee_no'
  | 'department_id'
  | 'position'
  | 'user_type'
  | 'auth_type'
  | 'user_group_ids'
  | 'role_ids'
  | 'license_status'

export type UserReadonlyReason = 'external_sync' | 'deleted_user' | 'no_permission' | 'system_admin_protected'

export interface UserEditableDetail {
  user: User
  editable_fields: UserEditableField[]
  readonly_fields: Partial<Record<UserEditableField, UserReadonlyReason>>
  manageable_group_ids: EntityId[]
  assignable_role_ids: EntityId[]
}

export interface Department {
  department_id: EntityId
  parent_department_id?: EntityId | null
  department_name: string
  department_code?: string | null
  source_type: DepartmentSourceType
  manager_user_id?: EntityId | null
  sort_order: number
  status: DepartmentStatus
  created_at: ISODateTimeString
  updated_at: ISODateTimeString
}

export interface DepartmentTreeNode extends Department {
  member_count: number
  children: DepartmentTreeNode[]
  path_department_ids: EntityId[]
  path_department_names: string[]
}

export interface DepartmentMember {
  user_id: EntityId
  username: string
  display_name: string
  email?: string | null
  mobile?: string | null
  position?: string | null
  status: UserStatus
  department_id?: EntityId | null
  joined_at?: ISODateTimeString | null
}

export interface UserGroup {
  group_id: EntityId
  group_name: string
  display_name?: string | null
  group_type: UserGroupType
  description?: string | null
  source_type: UserGroupSourceType
  owner_user_id: EntityId
  project_id?: EntityId | null
  status: UserGroupStatus
  created_at: ISODateTimeString
  updated_at: ISODateTimeString
}

export type UserGroupJoinMethod = 'manual' | 'department_inherited' | 'external_sync' | 'dynamic_rule' | 'subgroup_inherited'

export interface UserGroupMembership {
  group_id: EntityId
  group_name: string
  group_type: UserGroupType
  source_type: UserGroupSourceType
  join_method: UserGroupJoinMethod
  joined_at: ISODateTimeString
  removable: boolean
  disabled_reason?: PermissionDecisionReason
}

export interface UserGroupMember {
  user_id: EntityId
  username: string
  display_name: string
  email?: string | null
  department_id?: EntityId | null
  department_name?: string | null
  status: UserStatus
  join_method: UserGroupJoinMethod
  joined_at: ISODateTimeString
  removable: boolean
  disabled_reason?: PermissionDecisionReason
}

export interface UserGroupSubgroup {
  group_id: EntityId
  group_name: string
  group_type: UserGroupType
  source_type: UserGroupSourceType
  owner_user_id: EntityId
  member_count: number
  subgroup_count: number
  status: UserGroupStatus
  added_at: ISODateTimeString
  removable: boolean
  disabled_reason?: PermissionDecisionReason
}

export interface UserGroupDetail {
  group: UserGroup
  owner?: User | null
  member_count: number
  subgroup_count: number
  authorized_resource_count: number
  members: UserGroupMember[]
  subgroups: UserGroupSubgroup[]
  audit_logs: AuditLog[]
}

export interface IdentityBinding {
  binding_id: EntityId
  user_id: EntityId
  provider: IdentityProvider
  external_user_id: string
  external_display_name?: string | null
  external_email?: string | null
  external_mobile?: string | null
  binding_status: IdentityBindingStatus
  bound_at: ISODateTimeString
  last_sync_at?: ISODateTimeString | null
}

export type IdentityMatchField = 'external_user_id' | 'email' | 'mobile' | 'employee_no' | 'username'

export interface IdentityConflict {
  conflict_id: EntityId
  binding_id?: EntityId | null
  provider: IdentityProvider
  external_user_id: string
  external_display_name?: string | null
  matched_field: IdentityMatchField
  candidate_user_ids: EntityId[]
  status: 'pending' | 'resolved' | 'ignored'
  detected_at: ISODateTimeString
  resolved_at?: ISODateTimeString | null
  resolved_by?: EntityId | null
}

export interface LicenseAssignment {
  assignment_id: EntityId
  user_id: EntityId
  license_type: LicenseType
  status: LicenseAssignmentStatus
  assigned_by?: EntityId | null
  assigned_at?: ISODateTimeString | null
  released_at?: ISODateTimeString | null
  release_reason?: string | null
}

export interface LicenseOperationRecord {
  record_id: EntityId
  user_id: EntityId
  assignment_id?: EntityId | null
  action: 'assign_license' | 'release_license' | 'batch_assign_license' | 'batch_release_license'
  license_type?: LicenseType | null
  operator_user_id: EntityId
  operated_at: ISODateTimeString
  result: AuditResult
  failure_reason?: string | null
}

export type RoleType = 'system' | 'organization' | 'project' | 'custom'
export type RoleStatus = 'active' | 'disabled'
export type RoleMemberJoinMethod = 'manual' | 'department_rule' | 'user_group_rule' | 'external_sync'

export interface Role {
  role_id: EntityId
  role_name: string
  role_type: RoleType
  product_scope: string[]
  project_scope_ids: EntityId[]
  owner_user_id?: EntityId | null
  member_count: number
  status: RoleStatus
}

export interface RoleMember {
  role_id: EntityId
  user_id: EntityId
  join_method: RoleMemberJoinMethod
  joined_at: ISODateTimeString
  joined_by?: EntityId | null
}

export interface RoleMembership {
  role_id: EntityId
  role_name: string
  role_type: RoleType
  product_scope: string[]
  project_scope_ids: EntityId[]
  join_method: RoleMemberJoinMethod
  joined_at: ISODateTimeString
  removable: boolean
  disabled_reason?: PermissionDecisionReason
}

export interface UserOrganizationInfo {
  user_id: EntityId
  primary_department?: Department | null
  department_path: Department[]
  department_manager?: User | null
  position?: string | null
  manager_user?: User | null
  subordinate_users: User[]
}

export interface UserDetail {
  user: User
  organization: UserOrganizationInfo
  user_groups: UserGroupMembership[]
  roles: RoleMembership[]
  license?: LicenseAssignment | null
  identity_bindings: IdentityBinding[]
  login_devices: LoginDevice[]
  audit_logs: AuditLog[]
  action_decisions: UserActionDecisionMap
}

export type AuditAction =
  | 'create_user'
  | 'edit_user'
  | 'disable_user'
  | 'enable_user'
  | 'delete_user'
  | 'send_activation_notice'
  | 'reset_user_password'
  | 'batch_import_users'
  | 'batch_disable_users'
  | 'batch_delete_users'
  | 'edit_department'
  | 'create_department'
  | 'delete_department'
  | 'add_department_member'
  | 'remove_department_member'
  | 'move_department_member'
  | 'sync_organization'
  | 'create_user_group'
  | 'edit_user_group'
  | 'disable_user_group'
  | 'enable_user_group'
  | 'delete_user_group'
  | 'add_user_group_member'
  | 'remove_user_group_member'
  | 'add_role_member'
  | 'remove_role_member'
  | 'bind_identity'
  | 'unbind_identity'
  | 'manual_bind_identity'
  | 'rematch_identity'
  | 'assign_license'
  | 'release_license'
  | 'batch_assign_license'
  | 'batch_release_license'
  | 'edit_license_policy'
  | 'edit_tenant'
  | 'add_system_admin'
  | 'remove_system_admin'
  | 'export_users'
  | 'export_departments'
  | 'export_user_groups'
  | 'export_role_members'
  | 'export_identity_bindings'
  | 'export_license_assignments'
  | 'export_audit_logs'
  | 'download_import_template'
  | 'download_import_result'
  | 'change_password'
  | 'logout_devices'
  | 'edit_profile'

export type AuditTargetType =
  | 'tenant'
  | 'user'
  | 'department'
  | 'user_group'
  | 'role'
  | 'identity_binding'
  | 'license_assignment'
  | 'license_policy'
  | 'profile'
  | 'login_device'
  | 'import_job'
  | 'export_task'

export type AuditResult = 'success' | 'failure'
export type AuditValue = string | number | boolean | null | AuditValue[] | { [key: string]: AuditValue }

export interface AuditLog {
  log_id: EntityId
  operator_user_id: EntityId
  operator_name: string
  operated_at: ISODateTimeString
  module_name: 'organization_identity'
  action: AuditAction
  target_type: AuditTargetType
  target_id: EntityId
  target_name: string
  old_value?: AuditValue
  new_value?: AuditValue
  result: AuditResult
  failure_reason?: string | null
  request_ip: string
}

export type ImportFileFormat = 'xlsx' | 'csv'
export type ImportJobStep = 'download_template' | 'upload_file' | 'preview_validation' | 'submit_import'
export type ImportJobStatus = 'draft' | 'uploaded' | 'validating' | 'ready' | 'importing' | 'completed' | 'failed'
export type ImportRowValidationStatus = 'passed' | 'warning' | 'error'

export interface ImportPreviewRow {
  row_number: number
  username: string
  display_name: string
  email?: string | null
  mobile?: string | null
  employee_no?: string | null
  department_code?: string | null
  department_name?: string | null
  group_names: string[]
  role_names: string[]
  auth_type: UserAuthType
  license_assign?: 'yes' | 'no' | null
  validation_status: ImportRowValidationStatus
  error_reasons: string[]
  warnings: string[]
}

export interface ImportJob {
  import_job_id: EntityId
  file_name?: string | null
  file_format?: ImportFileFormat | null
  file_size_bytes?: number | null
  current_step: ImportJobStep
  status: ImportJobStatus
  total_rows: number
  passed_rows: number
  warning_rows: number
  error_rows: number
  success_count: number
  failure_count: number
  skipped_count: number
  progress_percent: number
  preview_rows: ImportPreviewRow[]
  result_file_url?: string | null
  created_by: EntityId
  created_at: ISODateTimeString
  updated_at: ISODateTimeString
}

export type RefreshTopic =
  | 'tenant'
  | 'users'
  | 'user_detail'
  | 'departments'
  | 'user_groups'
  | 'roles'
  | 'identity_bindings'
  | 'licenses'
  | 'profile'
  | 'audit_logs'
  | 'overview'

export type RefreshChangeType = 'created' | 'updated' | 'deleted' | 'status_changed' | 'relationship_changed'

export interface RefreshPayload {
  topic: RefreshTopic
  change_type: RefreshChangeType
  target_id?: EntityId
  related_user_ids?: EntityId[]
  emitted_at: ISODateTimeString
}

export interface PaginationParams {
  page: number
  page_size: 20 | 50 | 100
}

export interface PaginationResult {
  page: number
  page_size: number
  total: number
}

export interface SortParams {
  sort_by?: string
  sort_order?: SortOrder
}

export interface DateRangeFilter {
  start?: ISODateString
  end?: ISODateString
}

export interface ListQueryParams<TFilter extends Record<string, unknown> = Record<string, unknown>>
  extends SortParams {
  keyword?: string
  filters?: TFilter
  pagination: PaginationParams
}

export interface PaginatedResult<T> {
  items: T[]
  pagination: PaginationResult
}

export interface UserListFilter {
  status?: UserStatus | 'all'
  source_type?: UserSourceType | 'all'
  auth_type?: UserAuthType | 'all'
  license_status?: UserLicenseStatus | 'all'
  department_id?: EntityId
  group_id?: EntityId
  role_id?: EntityId
  last_login_range?: DateRangeFilter
  created_range?: DateRangeFilter
}

export interface DepartmentListFilter {
  status?: DepartmentStatus | 'all'
  source_type?: DepartmentSourceType | 'all'
  parent_department_id?: EntityId | null
}

export interface UserGroupListFilter {
  group_name?: string
  group_type?: UserGroupType | 'all'
  source_type?: UserGroupSourceType | 'all'
  status?: UserGroupStatus | 'all'
  owner_user_id?: EntityId
  project_id?: EntityId
}

export interface RoleMemberListFilter {
  role_id?: EntityId
  user_status?: UserStatus | 'all'
  department_id?: EntityId
  join_method?: RoleMemberJoinMethod
}

export interface IdentityBindingListFilter {
  provider?: IdentityProvider | 'all'
  binding_status?: IdentityBindingStatus | 'all'
  user_status?: UserStatus | 'all'
  last_sync_range?: DateRangeFilter
}

export interface LicenseListFilter {
  user_status?: UserStatus | 'all'
  license_status?: LicenseAssignmentStatus | UserLicenseStatus | 'all'
  license_type?: LicenseType | 'all'
  department_id?: EntityId
}

export interface AuditLogListFilter {
  action?: AuditAction | 'all'
  target_type?: AuditTargetType | 'all'
  target_id?: EntityId
  operator_user_id?: EntityId
  operated_range?: DateRangeFilter
  result?: AuditResult | 'all'
}

export interface ManageScope {
  scope_type: ManageScopeType
  department_ids: EntityId[]
  include_child_departments: boolean
  user_group_ids: EntityId[]
  project_ids: EntityId[]
  user_ids: EntityId[]
}

export interface PermissionDecision {
  allowed: boolean
  reason: PermissionDecisionReason
  message?: string
}

export interface ActionDecision extends PermissionDecision {
  disabled: boolean
  hidden?: boolean
  confirm_required?: boolean
}

export type UserActionKey =
  | 'view'
  | 'edit'
  | 'disable'
  | 'enable'
  | 'delete'
  | 'send_activation_notice'
  | 'reset_password'
  | 'copy_account_info'
  | 'view_login_records'
  | 'view_operation_logs'
  | 'view_permission_summary'
  | 'view_transfer_record'
  | 'assign_license'
  | 'release_license'
  | 'bind_identity'
  | 'unbind_identity'
  | 'rematch_identity'

export type UserActionDecisionMap = Partial<Record<UserActionKey, ActionDecision>>
export type TableRowActionDecisionMap<TKey extends string = string> = Partial<Record<TKey, ActionDecision>>

export type PagePermissionMap = Record<IdentityPageKey, PermissionDecision>
export type ActionPermissionMap = Record<IdentityPermissionKey, PermissionDecision>

export interface IdentityAccessContext {
  current_user_id: EntityId
  tenant_id: EntityId
  roles: IdentityAdminRole[]
  manage_scope: ManageScope
  enabled_pages: IdentityPageKey[]
  permissions: IdentityPermissionKey[]
  page_permissions: PagePermissionMap
  action_permissions: ActionPermissionMap
  license_management_enabled: boolean
  third_party_identity_configured: boolean
}

export type ProfileEditableField = 'avatar_url' | 'display_name' | 'position' | 'email' | 'mobile'

export interface LoginDevice {
  device_id: EntityId
  user_id: EntityId
  is_current: boolean
  login_ip: string
  login_at: ISODateTimeString
  browser: string
  operating_system: string
}

export type DeleteImpactSeverity = 'blocking' | 'warning' | 'info'
export type UserDeleteBlockerType =
  | 'unique_system_admin'
  | 'untransferred_assets'
  | 'unique_approval_admin'
  | 'running_critical_tasks'
export type UserDeleteWarningType = 'department_manager' | 'user_group_owner'

export interface DeleteImpactItem {
  type: UserDeleteBlockerType | UserDeleteWarningType | 'permission_reference' | 'system_config_reference'
  severity: DeleteImpactSeverity
  message: string
  count?: number
  related_ids?: EntityId[]
}

export interface UserDeleteImpact {
  user_id: EntityId
  user: User
  untransferred_asset_count: number
  department_id?: EntityId | null
  department_name?: string | null
  user_group_count: number
  role_count: number
  license_occupied: boolean
  is_owner: boolean
  blockers: DeleteImpactItem[]
  warnings: DeleteImpactItem[]
  can_delete: boolean
}

export interface AssetTransferPlan {
  source_user_id: EntityId
  receiver_user_id: EntityId
  asset_ids: EntityId[]
  project_ids: EntityId[]
  auto_grant_project_view: boolean
  transfer_reason?: string
}

export interface DepartmentDeleteImpact {
  department_id: EntityId
  department_name: string
  source_type: DepartmentSourceType
  child_department_count: number
  member_count: number
  dynamic_user_group_reference_count: number
  blockers: DeleteImpactItem[]
  can_delete: boolean
}

export interface UserGroupDeleteImpact {
  group_id: EntityId
  group_name: string
  source_type: UserGroupSourceType
  member_count: number
  subgroup_count: number
  authorized_resource_count: number
  approval_reference_count: number
  system_config_reference_count: number
  blockers: DeleteImpactItem[]
  warnings: DeleteImpactItem[]
  can_delete: boolean
}

export interface BatchActionResultItem {
  target_id: EntityId
  target_name: string
  success: boolean
  skipped: boolean
  message?: string
  error?: ServiceError
}

export interface BatchActionResult {
  batch_id: EntityId
  action: AuditAction
  total_count: number
  success_count: number
  failure_count: number
  skipped_count: number
  items: BatchActionResultItem[]
  created_at: ISODateTimeString
}

export type ExportTaskStatus = 'pending' | 'running' | 'success' | 'failed'
export type ExportFileFormat = 'xlsx'
export type ExportModuleName =
  | 'users'
  | 'departments'
  | 'user_groups'
  | 'role_members'
  | 'identity_bindings'
  | 'license_assignments'
  | 'audit_logs'

export interface ExportTask {
  export_task_id: EntityId
  module_name: ExportModuleName
  file_name: string
  file_format: ExportFileFormat
  status: ExportTaskStatus
  total_count: number
  exported_count: number
  download_url?: string | null
  failure_reason?: string | null
  created_by: EntityId
  created_at: ISODateTimeString
  completed_at?: ISODateTimeString | null
}

export interface ServiceError {
  code:
    | 'validation_error'
    | 'no_permission'
    | 'not_found'
    | 'network_error'
    | 'conflict'
    | 'license_exhausted'
    | 'export_limit_exceeded'
    | 'business_blocked'
    | 'partial_success'
    | 'file_format_error'
    | 'file_size_exceeded'
    | 'import_validation_error'
    | 'duplicate_value'
  message: string
  field_errors?: Record<string, string>
}

export type ServiceResult<T> = { success: true; data: T } | { success: false; error: ServiceError }
