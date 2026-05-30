import type { EntityId } from '@/types/common'
import type {
  ActionDecision,
  AssetTransferPlan,
  AuditLog,
  BatchActionResult,
  Department,
  DepartmentDeleteImpact,
  DepartmentMember,
  DepartmentTreeNode,
  ExportTask,
  IdentityAccessContext,
  IdentityBinding,
  IdentityConflict,
  IdentityPageKey,
  IdentityPermissionKey,
  ImportJob,
  LicenseAssignment,
  LicenseOperationRecord,
  ManageScope,
  PermissionDecision,
  PermissionDecisionReason,
  RefreshPayload,
  Role,
  RoleMember,
  RoleMembership,
  Tenant,
  TenantIdentityPolicy,
  TenantLicenseSummary,
  User,
  UserActionDecisionMap,
  UserDeleteImpact,
  UserDetail,
  UserEditableDetail,
  UserGroup,
  UserGroupDeleteImpact,
  UserGroupDetail,
  UserGroupJoinMethod,
  UserGroupMember,
  UserGroupSubgroup,
  UserOrganizationInfo,
  LoginDevice,
  UserReadonlyReason,
} from '@/types/organizationIdentity'

export const organizationIdentityMockIds = {
  tenant: 'tenant_data_intelligence',
  users: {
    systemAdmin: 'user_sys_admin',
    organizationAdmin: 'user_org_admin',
    userAdmin: 'user_user_admin',
    normalActive: 'user_normal_active',
    pendingLocal: 'user_pending_local',
    disabledLocal: 'user_disabled_local',
    deletedLocal: 'user_deleted_local',
    externalSync: 'user_external_sync',
  },
  departments: {
    company: 'dept_company',
    engineering: 'dept_engineering',
    dataPlatform: 'dept_data_platform',
    growth: 'dept_growth',
    salesSync: 'dept_sales_sync',
    emptyLocal: 'dept_empty_local',
    ldapArchive: 'dept_ldap_archive',
  },
  groups: {
    dataReaders: 'group_data_readers',
    analyticsCore: 'group_analytics_core',
    growthProject: 'group_growth_project',
    salesSync: 'group_sales_sync',
    legacyDisabled: 'group_legacy_disabled',
  },
  roles: {
    systemAdmin: 'role_system_admin',
    organizationAdmin: 'role_organization_admin',
    userAdmin: 'role_user_admin',
    biViewer: 'role_bi_viewer',
    growthOwner: 'role_growth_owner',
  },
  projects: {
    growth: 'project_growth_001',
    biPlatform: 'project_bi_platform',
  },
} as const

const now = '2026-05-30T09:00:00+02:00'
const createdAt = '2026-01-08T09:30:00+02:00'

const userSystemAdmin: User = {
  user_id: organizationIdentityMockIds.users.systemAdmin,
  username: 'sys.admin',
  display_name: '沈砚',
  email: 'shen.yan@example.com',
  mobile: '+8613800000001',
  employee_no: 'E0001',
  avatar_url: '/avatars/org/sys-admin.png',
  department_id: organizationIdentityMockIds.departments.dataPlatform,
  position: '平台负责人',
  user_type: 'internal',
  source_type: 'local',
  auth_type: 'mixed',
  status: 'active',
  license_status: 'occupied',
  last_login_at: '2026-05-30T08:10:00+02:00',
  created_at: createdAt,
  updated_at: now,
}

const userOrganizationAdmin: User = {
  user_id: organizationIdentityMockIds.users.organizationAdmin,
  username: 'org.admin',
  display_name: '林知夏',
  email: 'lin.zhixia@example.com',
  mobile: '+8613800000002',
  employee_no: 'E0101',
  avatar_url: '/avatars/org/org-admin.png',
  department_id: organizationIdentityMockIds.departments.dataPlatform,
  position: '数据平台经理',
  user_type: 'internal',
  source_type: 'local',
  auth_type: 'password',
  status: 'active',
  license_status: 'occupied',
  last_login_at: '2026-05-29T18:30:00+02:00',
  created_at: '2026-01-10T10:20:00+02:00',
  updated_at: now,
}

const userUserAdmin: User = {
  user_id: organizationIdentityMockIds.users.userAdmin,
  username: 'user.ops',
  display_name: '周望',
  email: 'zhou.wang@example.com',
  mobile: '+8613800000003',
  employee_no: 'E0201',
  avatar_url: '/avatars/org/user-admin.png',
  department_id: organizationIdentityMockIds.departments.growth,
  position: '用户运营',
  user_type: 'internal',
  source_type: 'feishu',
  auth_type: 'mixed',
  status: 'active',
  license_status: 'occupied',
  last_login_at: '2026-05-29T16:42:00+02:00',
  created_at: '2026-02-01T11:00:00+02:00',
  updated_at: now,
}

const userNormalActive: User = {
  user_id: organizationIdentityMockIds.users.normalActive,
  username: 'analyst.chen',
  display_name: '陈一诺',
  email: 'chen.yinuo@example.com',
  mobile: '+8613800000004',
  employee_no: 'E0301',
  avatar_url: '/avatars/org/analyst.png',
  department_id: organizationIdentityMockIds.departments.growth,
  position: '增长分析师',
  user_type: 'internal',
  source_type: 'local',
  auth_type: 'password',
  status: 'active',
  license_status: 'not_occupied',
  last_login_at: '2026-05-28T19:12:00+02:00',
  created_at: '2026-02-12T09:40:00+02:00',
  updated_at: now,
}

const userPendingLocal: User = {
  user_id: organizationIdentityMockIds.users.pendingLocal,
  username: 'new.joiner',
  display_name: '顾新然',
  email: 'gu.xinran@example.com',
  mobile: '+8613800000005',
  employee_no: 'E0401',
  avatar_url: null,
  department_id: organizationIdentityMockIds.departments.dataPlatform,
  position: '数据开发工程师',
  user_type: 'internal',
  source_type: 'local',
  auth_type: 'password',
  status: 'pending',
  license_status: 'pending',
  last_login_at: null,
  created_at: '2026-05-29T09:20:00+02:00',
  updated_at: '2026-05-29T09:20:00+02:00',
}

const userDisabledLocal: User = {
  user_id: organizationIdentityMockIds.users.disabledLocal,
  username: 'temp.disabled',
  display_name: '许遥',
  email: 'xu.yao@example.com',
  mobile: '+8613800000006',
  employee_no: 'E0501',
  avatar_url: '/avatars/org/disabled.png',
  department_id: organizationIdentityMockIds.departments.salesSync,
  position: '销售运营',
  user_type: 'internal',
  source_type: 'local',
  auth_type: 'password',
  status: 'disabled',
  license_status: 'not_occupied',
  last_login_at: '2026-05-12T13:05:00+02:00',
  created_at: '2026-03-05T14:10:00+02:00',
  updated_at: '2026-05-20T15:35:00+02:00',
  disabled_at: '2026-05-20T15:35:00+02:00',
}

const userDeletedLocal: User = {
  user_id: organizationIdentityMockIds.users.deletedLocal,
  username: 'former.owner',
  display_name: '陆行舟',
  email: 'lu.xingzhou@example.com',
  mobile: '+8613800000007',
  employee_no: 'E0601',
  avatar_url: null,
  department_id: null,
  position: '原项目负责人',
  user_type: 'internal',
  source_type: 'local',
  auth_type: 'password',
  status: 'deleted',
  license_status: 'not_occupied',
  last_login_at: '2026-04-18T10:20:00+02:00',
  created_at: '2026-01-18T16:00:00+02:00',
  updated_at: '2026-05-18T17:45:00+02:00',
  disabled_at: '2026-05-16T09:00:00+02:00',
  deleted_at: '2026-05-18T17:45:00+02:00',
}

const userExternalSync: User = {
  user_id: organizationIdentityMockIds.users.externalSync,
  username: 'wecom.sales',
  display_name: '韩澈',
  email: 'han.che@example.com',
  mobile: '+8613800000008',
  employee_no: 'WX1008',
  avatar_url: '/avatars/org/external-sync.png',
  department_id: organizationIdentityMockIds.departments.salesSync,
  position: '大客户经理',
  user_type: 'external',
  source_type: 'wecom',
  auth_type: 'sso',
  status: 'active',
  license_status: 'occupied',
  last_login_at: '2026-05-30T07:44:00+02:00',
  created_at: '2026-03-16T12:00:00+02:00',
  updated_at: '2026-05-30T07:50:00+02:00',
}

export const organizationIdentityUsers: User[] = [
  userSystemAdmin,
  userOrganizationAdmin,
  userUserAdmin,
  userNormalActive,
  userPendingLocal,
  userDisabledLocal,
  userDeletedLocal,
  userExternalSync,
]

export const organizationIdentityTenant: Tenant = {
  tenant_id: organizationIdentityMockIds.tenant,
  tenant_name: '星河数据智能集团',
  tenant_logo_url: '/logos/data-intelligence.svg',
  tenant_code: 'DI-ORG-001',
  admin_user_ids: [organizationIdentityMockIds.users.systemAdmin],
  license_policy: 'manual_assign',
  max_license_count: 4,
  used_license_count: 4,
  status: 'active',
  created_at: createdAt,
  updated_at: now,
}

export const organizationIdentityPolicy: TenantIdentityPolicy = {
  tenant_id: organizationIdentityMockIds.tenant,
  default_language: 'zh-CN',
  default_timezone: 'Asia/Shanghai',
  sso_enabled: true,
  password_login_enabled: true,
  sms_verification_enabled: true,
  email_notification_enabled: true,
  third_party_providers: ['feishu', 'wecom', 'dingtalk', 'saml', 'email'],
  profile_editable_fields: ['avatar_url', 'display_name', 'position'],
}

export const organizationIdentityLicenseSummaries: Record<'full' | 'available', TenantLicenseSummary> = {
  full: {
    tenant_id: organizationIdentityMockIds.tenant,
    license_policy: 'manual_assign',
    max_license_count: 4,
    used_license_count: 4,
    remaining_license_count: 0,
    pending_assignment_count: 1,
    disabled_released_count: 3,
    usage_rate: 100,
  },
  available: {
    tenant_id: organizationIdentityMockIds.tenant,
    license_policy: 'manual_assign',
    max_license_count: 6,
    used_license_count: 4,
    remaining_license_count: 2,
    pending_assignment_count: 1,
    disabled_released_count: 3,
    usage_rate: 66.67,
  },
}

const departmentCompany: Department = {
  department_id: organizationIdentityMockIds.departments.company,
  parent_department_id: null,
  department_name: '星河数据智能集团',
  department_code: 'DI',
  source_type: 'local',
  manager_user_id: organizationIdentityMockIds.users.systemAdmin,
  sort_order: 0,
  status: 'active',
  created_at: createdAt,
  updated_at: now,
}

const departmentEngineering: Department = {
  department_id: organizationIdentityMockIds.departments.engineering,
  parent_department_id: organizationIdentityMockIds.departments.company,
  department_name: '研发中心',
  department_code: 'DI-RD',
  source_type: 'local',
  manager_user_id: organizationIdentityMockIds.users.systemAdmin,
  sort_order: 10,
  status: 'active',
  created_at: '2026-01-09T09:00:00+02:00',
  updated_at: now,
}

const departmentDataPlatform: Department = {
  department_id: organizationIdentityMockIds.departments.dataPlatform,
  parent_department_id: organizationIdentityMockIds.departments.engineering,
  department_name: '数据平台部',
  department_code: 'DI-RD-DP',
  source_type: 'local',
  manager_user_id: organizationIdentityMockIds.users.organizationAdmin,
  sort_order: 10,
  status: 'active',
  created_at: '2026-01-09T09:20:00+02:00',
  updated_at: now,
}

const departmentGrowth: Department = {
  department_id: organizationIdentityMockIds.departments.growth,
  parent_department_id: organizationIdentityMockIds.departments.company,
  department_name: '增长运营部',
  department_code: 'DI-GROWTH',
  source_type: 'local',
  manager_user_id: organizationIdentityMockIds.users.userAdmin,
  sort_order: 20,
  status: 'active',
  created_at: '2026-01-12T11:00:00+02:00',
  updated_at: now,
}

const departmentSalesSync: Department = {
  department_id: organizationIdentityMockIds.departments.salesSync,
  parent_department_id: organizationIdentityMockIds.departments.company,
  department_name: '企业微信销售部',
  department_code: 'WX-SALES',
  source_type: 'wecom',
  manager_user_id: organizationIdentityMockIds.users.externalSync,
  sort_order: 30,
  status: 'active',
  created_at: '2026-03-16T11:30:00+02:00',
  updated_at: '2026-05-30T07:50:00+02:00',
}

const departmentEmptyLocal: Department = {
  department_id: organizationIdentityMockIds.departments.emptyLocal,
  parent_department_id: organizationIdentityMockIds.departments.growth,
  department_name: '待启用小组',
  department_code: 'DI-GROWTH-EMPTY',
  source_type: 'local',
  manager_user_id: organizationIdentityMockIds.users.normalActive,
  sort_order: 99,
  status: 'active',
  created_at: '2026-05-01T09:00:00+02:00',
  updated_at: '2026-05-01T09:00:00+02:00',
}

const departmentLdapArchive: Department = {
  department_id: organizationIdentityMockIds.departments.ldapArchive,
  parent_department_id: organizationIdentityMockIds.departments.company,
  department_name: 'LDAP 归档部门',
  department_code: 'LDAP-ARCHIVE',
  source_type: 'ldap',
  manager_user_id: null,
  sort_order: 90,
  status: 'disabled',
  created_at: '2026-02-01T09:00:00+02:00',
  updated_at: '2026-05-15T10:00:00+02:00',
}

export const organizationIdentityDepartments: Department[] = [
  departmentCompany,
  departmentEngineering,
  departmentDataPlatform,
  departmentGrowth,
  departmentSalesSync,
  departmentEmptyLocal,
  departmentLdapArchive,
]

const departmentMemberFromUser = (user: User): DepartmentMember => ({
  user_id: user.user_id,
  username: user.username,
  display_name: user.display_name,
  email: user.email,
  mobile: user.mobile,
  position: user.position,
  status: user.status,
  department_id: user.department_id,
  joined_at: user.created_at,
})

export const organizationIdentityDepartmentMembersByDepartmentId: Record<EntityId, DepartmentMember[]> = {
  [organizationIdentityMockIds.departments.company]: [],
  [organizationIdentityMockIds.departments.engineering]: [],
  [organizationIdentityMockIds.departments.dataPlatform]: [
    departmentMemberFromUser(userSystemAdmin),
    departmentMemberFromUser(userOrganizationAdmin),
    departmentMemberFromUser(userPendingLocal),
  ],
  [organizationIdentityMockIds.departments.growth]: [
    departmentMemberFromUser(userUserAdmin),
    departmentMemberFromUser(userNormalActive),
  ],
  [organizationIdentityMockIds.departments.salesSync]: [
    departmentMemberFromUser(userDisabledLocal),
    departmentMemberFromUser(userExternalSync),
  ],
  [organizationIdentityMockIds.departments.emptyLocal]: [],
  [organizationIdentityMockIds.departments.ldapArchive]: [],
}

const departmentDataPlatformTree: DepartmentTreeNode = {
  ...departmentDataPlatform,
  member_count: 3,
  children: [],
  path_department_ids: [
    organizationIdentityMockIds.departments.company,
    organizationIdentityMockIds.departments.engineering,
    organizationIdentityMockIds.departments.dataPlatform,
  ],
  path_department_names: ['星河数据智能集团', '研发中心', '数据平台部'],
}

const departmentEngineeringTree: DepartmentTreeNode = {
  ...departmentEngineering,
  member_count: 3,
  children: [departmentDataPlatformTree],
  path_department_ids: [
    organizationIdentityMockIds.departments.company,
    organizationIdentityMockIds.departments.engineering,
  ],
  path_department_names: ['星河数据智能集团', '研发中心'],
}

const departmentEmptyLocalTree: DepartmentTreeNode = {
  ...departmentEmptyLocal,
  member_count: 0,
  children: [],
  path_department_ids: [
    organizationIdentityMockIds.departments.company,
    organizationIdentityMockIds.departments.growth,
    organizationIdentityMockIds.departments.emptyLocal,
  ],
  path_department_names: ['星河数据智能集团', '增长运营部', '待启用小组'],
}

const departmentGrowthTree: DepartmentTreeNode = {
  ...departmentGrowth,
  member_count: 2,
  children: [departmentEmptyLocalTree],
  path_department_ids: [
    organizationIdentityMockIds.departments.company,
    organizationIdentityMockIds.departments.growth,
  ],
  path_department_names: ['星河数据智能集团', '增长运营部'],
}

const departmentSalesSyncTree: DepartmentTreeNode = {
  ...departmentSalesSync,
  member_count: 2,
  children: [],
  path_department_ids: [
    organizationIdentityMockIds.departments.company,
    organizationIdentityMockIds.departments.salesSync,
  ],
  path_department_names: ['星河数据智能集团', '企业微信销售部'],
}

const departmentLdapArchiveTree: DepartmentTreeNode = {
  ...departmentLdapArchive,
  member_count: 0,
  children: [],
  path_department_ids: [
    organizationIdentityMockIds.departments.company,
    organizationIdentityMockIds.departments.ldapArchive,
  ],
  path_department_names: ['星河数据智能集团', 'LDAP 归档部门'],
}

export const organizationIdentityDepartmentTree: DepartmentTreeNode[] = [
  {
    ...departmentCompany,
    member_count: 7,
    children: [
      departmentEngineeringTree,
      departmentGrowthTree,
      departmentSalesSyncTree,
      departmentLdapArchiveTree,
    ],
    path_department_ids: [organizationIdentityMockIds.departments.company],
    path_department_names: ['星河数据智能集团'],
  },
]

const groupDataReaders: UserGroup = {
  group_id: organizationIdentityMockIds.groups.dataReaders,
  group_name: 'data_readers',
  display_name: '全域数据查看组',
  group_type: 'system',
  description: '可查看企业内基础分析看板的系统级用户组。',
  source_type: 'local',
  owner_user_id: organizationIdentityMockIds.users.systemAdmin,
  project_id: null,
  status: 'active',
  created_at: '2026-01-15T10:00:00+02:00',
  updated_at: now,
}

const groupAnalyticsCore: UserGroup = {
  group_id: organizationIdentityMockIds.groups.analyticsCore,
  group_name: 'analytics_core',
  display_name: '分析核心组',
  group_type: 'custom',
  description: '数据分析和指标治理核心成员。',
  source_type: 'local',
  owner_user_id: organizationIdentityMockIds.users.organizationAdmin,
  project_id: null,
  status: 'active',
  created_at: '2026-02-05T09:00:00+02:00',
  updated_at: now,
}

const groupGrowthProject: UserGroup = {
  group_id: organizationIdentityMockIds.groups.growthProject,
  group_name: 'growth_project_members',
  display_name: '增长项目成员组',
  group_type: 'project',
  description: '增长项目空间的项目级用户组。',
  source_type: 'local',
  owner_user_id: organizationIdentityMockIds.users.userAdmin,
  project_id: organizationIdentityMockIds.projects.growth,
  status: 'active',
  created_at: '2026-03-01T13:30:00+02:00',
  updated_at: now,
}

const groupSalesSync: UserGroup = {
  group_id: organizationIdentityMockIds.groups.salesSync,
  group_name: 'wecom_sales_department',
  display_name: '企业微信销售同步组',
  group_type: 'department',
  description: '由企业微信销售部门自动同步的部门用户组。',
  source_type: 'external',
  owner_user_id: organizationIdentityMockIds.users.externalSync,
  project_id: null,
  status: 'active',
  created_at: '2026-03-16T12:05:00+02:00',
  updated_at: '2026-05-30T07:50:00+02:00',
}

const groupLegacyDisabled: UserGroup = {
  group_id: organizationIdentityMockIds.groups.legacyDisabled,
  group_name: 'legacy_approval_group',
  display_name: '历史审批组',
  group_type: 'custom',
  description: '待清理的历史审批流程引用用户组。',
  source_type: 'local',
  owner_user_id: organizationIdentityMockIds.users.systemAdmin,
  project_id: null,
  status: 'disabled',
  created_at: '2026-01-20T10:30:00+02:00',
  updated_at: '2026-05-10T11:00:00+02:00',
}

export const organizationIdentityUserGroups: UserGroup[] = [
  groupDataReaders,
  groupAnalyticsCore,
  groupGrowthProject,
  groupSalesSync,
  groupLegacyDisabled,
]

export const organizationIdentityUserGroupRelations = [
  {
    parent_group_id: organizationIdentityMockIds.groups.dataReaders,
    child_group_id: organizationIdentityMockIds.groups.analyticsCore,
    added_at: '2026-02-05T09:10:00+02:00',
  },
  {
    parent_group_id: organizationIdentityMockIds.groups.dataReaders,
    child_group_id: organizationIdentityMockIds.groups.growthProject,
    added_at: '2026-03-01T13:40:00+02:00',
  },
] as const

const roleSystemAdmin: Role = {
  role_id: organizationIdentityMockIds.roles.systemAdmin,
  role_name: '系统管理员',
  role_type: 'system',
  product_scope: ['platform'],
  project_scope_ids: [],
  owner_user_id: organizationIdentityMockIds.users.systemAdmin,
  member_count: 1,
  status: 'active',
}

const roleOrganizationAdmin: Role = {
  role_id: organizationIdentityMockIds.roles.organizationAdmin,
  role_name: '组织管理员',
  role_type: 'organization',
  product_scope: ['organization_identity'],
  project_scope_ids: [],
  owner_user_id: organizationIdentityMockIds.users.systemAdmin,
  member_count: 1,
  status: 'active',
}

const roleUserAdmin: Role = {
  role_id: organizationIdentityMockIds.roles.userAdmin,
  role_name: '用户管理员',
  role_type: 'organization',
  product_scope: ['organization_identity'],
  project_scope_ids: [],
  owner_user_id: organizationIdentityMockIds.users.systemAdmin,
  member_count: 1,
  status: 'active',
}

const roleBiViewer: Role = {
  role_id: organizationIdentityMockIds.roles.biViewer,
  role_name: 'BI 查看者',
  role_type: 'custom',
  product_scope: ['dashboard', 'analysis_center'],
  project_scope_ids: [organizationIdentityMockIds.projects.biPlatform],
  owner_user_id: organizationIdentityMockIds.users.organizationAdmin,
  member_count: 3,
  status: 'active',
}

const roleGrowthOwner: Role = {
  role_id: organizationIdentityMockIds.roles.growthOwner,
  role_name: '增长项目负责人',
  role_type: 'project',
  product_scope: ['project', 'analysis_center'],
  project_scope_ids: [organizationIdentityMockIds.projects.growth],
  owner_user_id: organizationIdentityMockIds.users.userAdmin,
  member_count: 2,
  status: 'active',
}

export const organizationIdentityRoles: Role[] = [
  roleSystemAdmin,
  roleOrganizationAdmin,
  roleUserAdmin,
  roleBiViewer,
  roleGrowthOwner,
]

export const organizationIdentityRoleMembers: RoleMember[] = [
  {
    role_id: organizationIdentityMockIds.roles.systemAdmin,
    user_id: organizationIdentityMockIds.users.systemAdmin,
    join_method: 'manual',
    joined_at: createdAt,
    joined_by: null,
  },
  {
    role_id: organizationIdentityMockIds.roles.organizationAdmin,
    user_id: organizationIdentityMockIds.users.organizationAdmin,
    join_method: 'manual',
    joined_at: '2026-01-10T10:30:00+02:00',
    joined_by: organizationIdentityMockIds.users.systemAdmin,
  },
  {
    role_id: organizationIdentityMockIds.roles.userAdmin,
    user_id: organizationIdentityMockIds.users.userAdmin,
    join_method: 'manual',
    joined_at: '2026-02-01T11:10:00+02:00',
    joined_by: organizationIdentityMockIds.users.systemAdmin,
  },
  {
    role_id: organizationIdentityMockIds.roles.biViewer,
    user_id: organizationIdentityMockIds.users.organizationAdmin,
    join_method: 'user_group_rule',
    joined_at: '2026-02-05T09:20:00+02:00',
    joined_by: organizationIdentityMockIds.users.systemAdmin,
  },
  {
    role_id: organizationIdentityMockIds.roles.biViewer,
    user_id: organizationIdentityMockIds.users.normalActive,
    join_method: 'manual',
    joined_at: '2026-03-01T14:00:00+02:00',
    joined_by: organizationIdentityMockIds.users.userAdmin,
  },
  {
    role_id: organizationIdentityMockIds.roles.biViewer,
    user_id: organizationIdentityMockIds.users.externalSync,
    join_method: 'external_sync',
    joined_at: '2026-03-16T12:10:00+02:00',
    joined_by: organizationIdentityMockIds.users.systemAdmin,
  },
  {
    role_id: organizationIdentityMockIds.roles.growthOwner,
    user_id: organizationIdentityMockIds.users.userAdmin,
    join_method: 'manual',
    joined_at: '2026-03-01T14:05:00+02:00',
    joined_by: organizationIdentityMockIds.users.systemAdmin,
  },
  {
    role_id: organizationIdentityMockIds.roles.growthOwner,
    user_id: organizationIdentityMockIds.users.normalActive,
    join_method: 'department_rule',
    joined_at: '2026-03-01T14:10:00+02:00',
    joined_by: organizationIdentityMockIds.users.systemAdmin,
  },
]

export const organizationIdentityBindings: IdentityBinding[] = [
  {
    binding_id: 'bind_sys_feishu',
    user_id: organizationIdentityMockIds.users.systemAdmin,
    provider: 'feishu',
    external_user_id: 'fs_ou_sys_admin',
    external_display_name: '沈砚',
    external_email: userSystemAdmin.email,
    external_mobile: userSystemAdmin.mobile,
    binding_status: 'bound',
    bound_at: '2026-01-08T10:00:00+02:00',
    last_sync_at: '2026-05-30T07:30:00+02:00',
  },
  {
    binding_id: 'bind_external_wecom',
    user_id: organizationIdentityMockIds.users.externalSync,
    provider: 'wecom',
    external_user_id: 'wx_han_che',
    external_display_name: '韩澈',
    external_email: userExternalSync.email,
    external_mobile: userExternalSync.mobile,
    binding_status: 'bound',
    bound_at: '2026-03-16T12:05:00+02:00',
    last_sync_at: '2026-05-30T07:50:00+02:00',
  },
  {
    binding_id: 'bind_pending_wecom_conflict',
    user_id: organizationIdentityMockIds.users.pendingLocal,
    provider: 'wecom',
    external_user_id: 'wx_new_joiner',
    external_display_name: '顾新然',
    external_email: userPendingLocal.email,
    external_mobile: userPendingLocal.mobile,
    binding_status: 'conflict',
    bound_at: '2026-05-29T09:25:00+02:00',
    last_sync_at: '2026-05-30T07:50:00+02:00',
  },
  {
    binding_id: 'bind_disabled_dingtalk_invalid',
    user_id: organizationIdentityMockIds.users.disabledLocal,
    provider: 'dingtalk',
    external_user_id: 'dt_xu_yao_removed',
    external_display_name: '许遥',
    external_email: userDisabledLocal.email,
    external_mobile: userDisabledLocal.mobile,
    binding_status: 'invalid',
    bound_at: '2026-03-05T14:20:00+02:00',
    last_sync_at: '2026-05-20T15:40:00+02:00',
  },
  {
    binding_id: 'bind_normal_email_unbound',
    user_id: organizationIdentityMockIds.users.normalActive,
    provider: 'email',
    external_user_id: 'mail_chen_yinuo',
    external_display_name: '陈一诺',
    external_email: userNormalActive.email,
    external_mobile: null,
    binding_status: 'unbound',
    bound_at: '2026-05-28T18:00:00+02:00',
    last_sync_at: null,
  },
]

export const organizationIdentityConflicts: IdentityConflict[] = [
  {
    conflict_id: 'conflict_wecom_new_joiner',
    binding_id: 'bind_pending_wecom_conflict',
    provider: 'wecom',
    external_user_id: 'wx_new_joiner',
    external_display_name: '顾新然',
    matched_field: 'mobile',
    candidate_user_ids: [
      organizationIdentityMockIds.users.pendingLocal,
      organizationIdentityMockIds.users.normalActive,
    ],
    status: 'pending',
    detected_at: '2026-05-30T07:50:00+02:00',
    resolved_at: null,
    resolved_by: null,
  },
]

export const organizationIdentityLicenseAssignments: LicenseAssignment[] = [
  {
    assignment_id: 'lic_sys_admin',
    user_id: organizationIdentityMockIds.users.systemAdmin,
    license_type: 'admin',
    status: 'occupied',
    assigned_by: organizationIdentityMockIds.users.systemAdmin,
    assigned_at: createdAt,
    released_at: null,
    release_reason: null,
  },
  {
    assignment_id: 'lic_org_admin',
    user_id: organizationIdentityMockIds.users.organizationAdmin,
    license_type: 'full',
    status: 'occupied',
    assigned_by: organizationIdentityMockIds.users.systemAdmin,
    assigned_at: '2026-01-10T10:35:00+02:00',
    released_at: null,
    release_reason: null,
  },
  {
    assignment_id: 'lic_user_admin',
    user_id: organizationIdentityMockIds.users.userAdmin,
    license_type: 'developer',
    status: 'occupied',
    assigned_by: organizationIdentityMockIds.users.systemAdmin,
    assigned_at: '2026-02-01T11:20:00+02:00',
    released_at: null,
    release_reason: null,
  },
  {
    assignment_id: 'lic_external_sync',
    user_id: organizationIdentityMockIds.users.externalSync,
    license_type: 'viewer',
    status: 'occupied',
    assigned_by: organizationIdentityMockIds.users.organizationAdmin,
    assigned_at: '2026-03-16T12:15:00+02:00',
    released_at: null,
    release_reason: null,
  },
  {
    assignment_id: 'lic_pending_local',
    user_id: organizationIdentityMockIds.users.pendingLocal,
    license_type: 'viewer',
    status: 'pending',
    assigned_by: null,
    assigned_at: null,
    released_at: null,
    release_reason: null,
  },
  {
    assignment_id: 'lic_disabled_local',
    user_id: organizationIdentityMockIds.users.disabledLocal,
    license_type: 'full',
    status: 'released',
    assigned_by: organizationIdentityMockIds.users.systemAdmin,
    assigned_at: '2026-03-05T14:30:00+02:00',
    released_at: '2026-05-20T15:35:00+02:00',
    release_reason: 'disabled_user',
  },
  {
    assignment_id: 'lic_deleted_local',
    user_id: organizationIdentityMockIds.users.deletedLocal,
    license_type: 'full',
    status: 'released',
    assigned_by: organizationIdentityMockIds.users.systemAdmin,
    assigned_at: '2026-01-18T16:15:00+02:00',
    released_at: '2026-05-18T17:45:00+02:00',
    release_reason: 'deleted_user',
  },
  {
    assignment_id: 'lic_normal_released',
    user_id: organizationIdentityMockIds.users.normalActive,
    license_type: 'viewer',
    status: 'released',
    assigned_by: organizationIdentityMockIds.users.organizationAdmin,
    assigned_at: '2026-03-01T14:15:00+02:00',
    released_at: '2026-05-26T10:00:00+02:00',
    release_reason: 'manual_release',
  },
]

export const organizationIdentityLicenseOperationRecords: LicenseOperationRecord[] = [
  {
    record_id: 'lic_op_assign_user_admin',
    user_id: organizationIdentityMockIds.users.userAdmin,
    assignment_id: 'lic_user_admin',
    action: 'assign_license',
    license_type: 'developer',
    operator_user_id: organizationIdentityMockIds.users.systemAdmin,
    operated_at: '2026-02-01T11:20:00+02:00',
    result: 'success',
  },
  {
    record_id: 'lic_op_release_disabled',
    user_id: organizationIdentityMockIds.users.disabledLocal,
    assignment_id: 'lic_disabled_local',
    action: 'release_license',
    license_type: 'full',
    operator_user_id: organizationIdentityMockIds.users.systemAdmin,
    operated_at: '2026-05-20T15:35:00+02:00',
    result: 'success',
  },
  {
    record_id: 'lic_op_batch_full',
    user_id: organizationIdentityMockIds.users.pendingLocal,
    assignment_id: 'lic_pending_local',
    action: 'batch_assign_license',
    license_type: 'viewer',
    operator_user_id: organizationIdentityMockIds.users.organizationAdmin,
    operated_at: '2026-05-29T10:00:00+02:00',
    result: 'failure',
    failure_reason: 'license_exhausted',
  },
]

export const organizationIdentityLoginDevices: LoginDevice[] = [
  {
    device_id: 'device_sys_current',
    user_id: organizationIdentityMockIds.users.systemAdmin,
    is_current: true,
    login_ip: '10.10.1.8',
    login_at: '2026-05-30T08:10:00+02:00',
    browser: 'Chrome 125',
    operating_system: 'macOS 15',
  },
  {
    device_id: 'device_sys_backup',
    user_id: organizationIdentityMockIds.users.systemAdmin,
    is_current: false,
    login_ip: '10.10.1.18',
    login_at: '2026-05-29T21:00:00+02:00',
    browser: 'Safari 18',
    operating_system: 'iOS 19',
  },
  {
    device_id: 'device_org_admin',
    user_id: organizationIdentityMockIds.users.organizationAdmin,
    is_current: true,
    login_ip: '10.10.2.11',
    login_at: '2026-05-29T18:30:00+02:00',
    browser: 'Edge 125',
    operating_system: 'Windows 12',
  },
  {
    device_id: 'device_normal_current',
    user_id: organizationIdentityMockIds.users.normalActive,
    is_current: true,
    login_ip: '10.10.3.21',
    login_at: '2026-05-28T19:12:00+02:00',
    browser: 'Chrome 125',
    operating_system: 'Windows 12',
  },
  {
    device_id: 'device_normal_tablet',
    user_id: organizationIdentityMockIds.users.normalActive,
    is_current: false,
    login_ip: '10.10.3.28',
    login_at: '2026-05-27T09:40:00+02:00',
    browser: 'Safari 18',
    operating_system: 'iPadOS 19',
  },
  {
    device_id: 'device_external_sso',
    user_id: organizationIdentityMockIds.users.externalSync,
    is_current: true,
    login_ip: '10.10.4.31',
    login_at: '2026-05-30T07:44:00+02:00',
    browser: 'Chrome 125',
    operating_system: 'macOS 15',
  },
]

export const organizationIdentityAuditLogs: AuditLog[] = [
  {
    log_id: 'audit_create_pending_user',
    operator_user_id: organizationIdentityMockIds.users.userAdmin,
    operator_name: userUserAdmin.display_name,
    operated_at: '2026-05-29T09:20:00+02:00',
    module_name: 'organization_identity',
    action: 'create_user',
    target_type: 'user',
    target_id: organizationIdentityMockIds.users.pendingLocal,
    target_name: userPendingLocal.display_name,
    old_value: null,
    new_value: { status: 'pending', department_id: organizationIdentityMockIds.departments.dataPlatform },
    result: 'success',
    request_ip: '10.10.2.45',
  },
  {
    log_id: 'audit_send_activation_notice',
    operator_user_id: organizationIdentityMockIds.users.userAdmin,
    operator_name: userUserAdmin.display_name,
    operated_at: '2026-05-29T09:22:00+02:00',
    module_name: 'organization_identity',
    action: 'send_activation_notice',
    target_type: 'user',
    target_id: organizationIdentityMockIds.users.pendingLocal,
    target_name: userPendingLocal.display_name,
    result: 'success',
    request_ip: '10.10.2.45',
  },
  {
    log_id: 'audit_disable_user',
    operator_user_id: organizationIdentityMockIds.users.systemAdmin,
    operator_name: userSystemAdmin.display_name,
    operated_at: '2026-05-20T15:35:00+02:00',
    module_name: 'organization_identity',
    action: 'disable_user',
    target_type: 'user',
    target_id: organizationIdentityMockIds.users.disabledLocal,
    target_name: userDisabledLocal.display_name,
    old_value: { status: 'active', license_status: 'occupied' },
    new_value: { status: 'disabled', license_status: 'not_occupied' },
    result: 'success',
    request_ip: '10.10.1.8',
  },
  {
    log_id: 'audit_delete_user',
    operator_user_id: organizationIdentityMockIds.users.systemAdmin,
    operator_name: userSystemAdmin.display_name,
    operated_at: '2026-05-18T17:45:00+02:00',
    module_name: 'organization_identity',
    action: 'delete_user',
    target_type: 'user',
    target_id: organizationIdentityMockIds.users.deletedLocal,
    target_name: userDeletedLocal.display_name,
    old_value: { status: 'disabled' },
    new_value: { status: 'deleted', asset_transfer_plan_id: 'transfer_deleted_local' },
    result: 'success',
    request_ip: '10.10.1.8',
  },
  {
    log_id: 'audit_add_group_member',
    operator_user_id: organizationIdentityMockIds.users.organizationAdmin,
    operator_name: userOrganizationAdmin.display_name,
    operated_at: '2026-03-01T14:00:00+02:00',
    module_name: 'organization_identity',
    action: 'add_user_group_member',
    target_type: 'user_group',
    target_id: organizationIdentityMockIds.groups.growthProject,
    target_name: groupGrowthProject.display_name ?? groupGrowthProject.group_name,
    new_value: { user_id: organizationIdentityMockIds.users.normalActive },
    result: 'success',
    request_ip: '10.10.2.11',
  },
  {
    log_id: 'audit_add_role_member',
    operator_user_id: organizationIdentityMockIds.users.systemAdmin,
    operator_name: userSystemAdmin.display_name,
    operated_at: '2026-03-01T14:05:00+02:00',
    module_name: 'organization_identity',
    action: 'add_role_member',
    target_type: 'role',
    target_id: organizationIdentityMockIds.roles.growthOwner,
    target_name: roleGrowthOwner.role_name,
    new_value: { user_id: organizationIdentityMockIds.users.userAdmin },
    result: 'success',
    request_ip: '10.10.1.8',
  },
  {
    log_id: 'audit_bind_identity',
    operator_user_id: organizationIdentityMockIds.users.systemAdmin,
    operator_name: userSystemAdmin.display_name,
    operated_at: '2026-03-16T12:05:00+02:00',
    module_name: 'organization_identity',
    action: 'bind_identity',
    target_type: 'identity_binding',
    target_id: 'bind_external_wecom',
    target_name: 'wecom:wx_han_che',
    new_value: { user_id: organizationIdentityMockIds.users.externalSync, provider: 'wecom' },
    result: 'success',
    request_ip: '10.10.1.8',
  },
  {
    log_id: 'audit_assign_license_failed',
    operator_user_id: organizationIdentityMockIds.users.organizationAdmin,
    operator_name: userOrganizationAdmin.display_name,
    operated_at: '2026-05-29T10:00:00+02:00',
    module_name: 'organization_identity',
    action: 'batch_assign_license',
    target_type: 'license_assignment',
    target_id: 'lic_pending_local',
    target_name: userPendingLocal.display_name,
    new_value: { license_type: 'viewer' },
    result: 'failure',
    failure_reason: 'license_exhausted',
    request_ip: '10.10.2.11',
  },
  {
    log_id: 'audit_sync_organization',
    operator_user_id: organizationIdentityMockIds.users.systemAdmin,
    operator_name: userSystemAdmin.display_name,
    operated_at: '2026-05-30T07:50:00+02:00',
    module_name: 'organization_identity',
    action: 'sync_organization',
    target_type: 'department',
    target_id: organizationIdentityMockIds.departments.salesSync,
    target_name: departmentSalesSync.department_name,
    new_value: { provider: 'wecom', updated_user_count: 2, conflict_count: 1 },
    result: 'success',
    request_ip: '10.10.1.8',
  },
  {
    log_id: 'audit_logout_devices',
    operator_user_id: organizationIdentityMockIds.users.normalActive,
    operator_name: userNormalActive.display_name,
    operated_at: '2026-05-28T19:30:00+02:00',
    module_name: 'organization_identity',
    action: 'logout_devices',
    target_type: 'login_device',
    target_id: 'device_normal_tablet',
    target_name: 'Safari 18 / iPadOS 19',
    result: 'success',
    request_ip: '10.10.3.21',
  },
]

const groupMemberFromUser = (
  user: User,
  joinMethod: UserGroupJoinMethod,
  joinedAt: string,
  removable: boolean,
  disabledReason?: PermissionDecisionReason,
): UserGroupMember => ({
  user_id: user.user_id,
  username: user.username,
  display_name: user.display_name,
  email: user.email,
  department_id: user.department_id,
  department_name:
    user.department_id === organizationIdentityMockIds.departments.dataPlatform
      ? departmentDataPlatform.department_name
      : user.department_id === organizationIdentityMockIds.departments.growth
        ? departmentGrowth.department_name
        : user.department_id === organizationIdentityMockIds.departments.salesSync
          ? departmentSalesSync.department_name
          : null,
  status: user.status,
  join_method: joinMethod,
  joined_at: joinedAt,
  removable,
  disabled_reason: disabledReason,
})

const groupSubgroupFromGroup = (
  group: UserGroup,
  memberCount: number,
  subgroupCount: number,
  addedAt: string,
): UserGroupSubgroup => ({
  group_id: group.group_id,
  group_name: group.group_name,
  group_type: group.group_type,
  source_type: group.source_type,
  owner_user_id: group.owner_user_id,
  member_count: memberCount,
  subgroup_count: subgroupCount,
  status: group.status,
  added_at: addedAt,
  removable: group.source_type === 'local',
  disabled_reason: group.source_type === 'external' ? 'external_sync' : undefined,
})

export const organizationIdentityUserGroupDetails: UserGroupDetail[] = [
  {
    group: groupDataReaders,
    owner: userSystemAdmin,
    member_count: 5,
    subgroup_count: 2,
    authorized_resource_count: 18,
    members: [
      groupMemberFromUser(userSystemAdmin, 'manual', '2026-01-15T10:05:00+02:00', true),
      groupMemberFromUser(userOrganizationAdmin, 'subgroup_inherited', '2026-02-05T09:20:00+02:00', false),
      groupMemberFromUser(userUserAdmin, 'subgroup_inherited', '2026-03-01T13:50:00+02:00', false),
      groupMemberFromUser(userNormalActive, 'subgroup_inherited', '2026-03-01T14:00:00+02:00', false),
      groupMemberFromUser(userPendingLocal, 'subgroup_inherited', '2026-05-29T09:30:00+02:00', false, 'pending_user'),
    ],
    subgroups: [
      groupSubgroupFromGroup(groupAnalyticsCore, 2, 0, '2026-02-05T09:10:00+02:00'),
      groupSubgroupFromGroup(groupGrowthProject, 2, 0, '2026-03-01T13:40:00+02:00'),
    ],
    audit_logs: organizationIdentityAuditLogs.filter((log) => log.target_id === groupDataReaders.group_id),
  },
  {
    group: groupAnalyticsCore,
    owner: userOrganizationAdmin,
    member_count: 2,
    subgroup_count: 0,
    authorized_resource_count: 9,
    members: [
      groupMemberFromUser(userOrganizationAdmin, 'manual', '2026-02-05T09:20:00+02:00', true),
      groupMemberFromUser(userPendingLocal, 'manual', '2026-05-29T09:30:00+02:00', true, 'pending_user'),
    ],
    subgroups: [],
    audit_logs: organizationIdentityAuditLogs.filter((log) => log.target_id === groupAnalyticsCore.group_id),
  },
  {
    group: groupGrowthProject,
    owner: userUserAdmin,
    member_count: 2,
    subgroup_count: 0,
    authorized_resource_count: 6,
    members: [
      groupMemberFromUser(userUserAdmin, 'manual', '2026-03-01T13:50:00+02:00', true),
      groupMemberFromUser(userNormalActive, 'manual', '2026-03-01T14:00:00+02:00', true),
    ],
    subgroups: [],
    audit_logs: organizationIdentityAuditLogs.filter((log) => log.target_id === groupGrowthProject.group_id),
  },
  {
    group: groupSalesSync,
    owner: userExternalSync,
    member_count: 2,
    subgroup_count: 0,
    authorized_resource_count: 4,
    members: [
      groupMemberFromUser(userExternalSync, 'external_sync', '2026-03-16T12:10:00+02:00', false, 'external_sync'),
      groupMemberFromUser(userDisabledLocal, 'external_sync', '2026-03-16T12:10:00+02:00', false, 'disabled_user'),
    ],
    subgroups: [],
    audit_logs: organizationIdentityAuditLogs.filter((log) => log.target_id === groupSalesSync.group_id),
  },
  {
    group: groupLegacyDisabled,
    owner: userSystemAdmin,
    member_count: 1,
    subgroup_count: 0,
    authorized_resource_count: 2,
    members: [
      groupMemberFromUser(userDeletedLocal, 'manual', '2026-01-20T10:40:00+02:00', false, 'deleted_user'),
    ],
    subgroups: [],
    audit_logs: organizationIdentityAuditLogs.filter((log) => log.target_id === groupLegacyDisabled.group_id),
  },
]

const roleMembershipFromRole = (
  role: Role,
  joinMethod: RoleMember['join_method'],
  joinedAt: string,
  removable: boolean,
  disabledReason?: PermissionDecisionReason,
): RoleMembership => ({
  role_id: role.role_id,
  role_name: role.role_name,
  role_type: role.role_type,
  product_scope: role.product_scope,
  project_scope_ids: role.project_scope_ids,
  join_method: joinMethod,
  joined_at: joinedAt,
  removable,
  disabled_reason: disabledReason,
})

const actionAllowed: ActionDecision = { allowed: true, reason: 'allowed', disabled: false }
const disabledAction = (reason: PermissionDecisionReason, message: string): ActionDecision => ({
  allowed: false,
  reason,
  message,
  disabled: true,
})

export const organizationIdentityUserActionDecisionsByUserId: Record<EntityId, UserActionDecisionMap> = {
  [organizationIdentityMockIds.users.systemAdmin]: {
    view: actionAllowed,
    edit: actionAllowed,
    disable: disabledAction('last_system_admin', '至少需要保留一名系统管理员'),
    delete: disabledAction('last_system_admin', '唯一系统管理员不可删除'),
    reset_password: actionAllowed,
    release_license: actionAllowed,
  },
  [organizationIdentityMockIds.users.organizationAdmin]: {
    view: actionAllowed,
    edit: actionAllowed,
    disable: actionAllowed,
    delete: disabledAction('has_untransferred_assets', '删除前需要完成资产交接'),
    reset_password: actionAllowed,
    release_license: actionAllowed,
  },
  [organizationIdentityMockIds.users.userAdmin]: {
    view: actionAllowed,
    edit: actionAllowed,
    disable: actionAllowed,
    delete: disabledAction('has_blocking_references', '该用户仍是增长项目负责人'),
    reset_password: actionAllowed,
    release_license: actionAllowed,
  },
  [organizationIdentityMockIds.users.normalActive]: {
    view: actionAllowed,
    edit: actionAllowed,
    disable: actionAllowed,
    delete: disabledAction('has_untransferred_assets', '仍有 3 个资源待交接'),
    assign_license: disabledAction('license_exhausted', '当前 License 已用完'),
    bind_identity: actionAllowed,
  },
  [organizationIdentityMockIds.users.pendingLocal]: {
    view: actionAllowed,
    edit: actionAllowed,
    send_activation_notice: actionAllowed,
    delete: actionAllowed,
    disable: disabledAction('pending_user', '未激活用户无需禁用'),
    reset_password: disabledAction('not_active_user', '用户未激活，不能重置密码'),
  },
  [organizationIdentityMockIds.users.disabledLocal]: {
    view: actionAllowed,
    edit: actionAllowed,
    enable: actionAllowed,
    delete: actionAllowed,
    disable: disabledAction('disabled_user', '用户已禁用'),
    reset_password: disabledAction('disabled_user', '禁用用户不可重置密码'),
  },
  [organizationIdentityMockIds.users.deletedLocal]: {
    view: actionAllowed,
    view_transfer_record: actionAllowed,
    edit: disabledAction('deleted_user', '已删除用户不可编辑'),
    enable: disabledAction('deleted_user', '已删除用户不可启用'),
    reset_password: disabledAction('deleted_user', '已删除用户不可重置密码'),
    delete: disabledAction('deleted_user', '用户已删除'),
  },
  [organizationIdentityMockIds.users.externalSync]: {
    view: actionAllowed,
    edit: disabledAction('external_sync', '外部同步用户关键字段不可本地修改'),
    disable: actionAllowed,
    delete: disabledAction('external_sync', '外部同步用户需先从源系统移除'),
    release_license: actionAllowed,
    unbind_identity: disabledAction('only_login_method', '当前账号仅绑定此登录方式，不可解绑'),
  },
}

const organizationInfoByUserId: Record<EntityId, UserOrganizationInfo> = {
  [organizationIdentityMockIds.users.systemAdmin]: {
    user_id: organizationIdentityMockIds.users.systemAdmin,
    primary_department: departmentDataPlatform,
    department_path: [departmentCompany, departmentEngineering, departmentDataPlatform],
    department_manager: userOrganizationAdmin,
    position: userSystemAdmin.position,
    manager_user: null,
    subordinate_users: [userOrganizationAdmin],
  },
  [organizationIdentityMockIds.users.organizationAdmin]: {
    user_id: organizationIdentityMockIds.users.organizationAdmin,
    primary_department: departmentDataPlatform,
    department_path: [departmentCompany, departmentEngineering, departmentDataPlatform],
    department_manager: userOrganizationAdmin,
    position: userOrganizationAdmin.position,
    manager_user: userSystemAdmin,
    subordinate_users: [userPendingLocal],
  },
  [organizationIdentityMockIds.users.userAdmin]: {
    user_id: organizationIdentityMockIds.users.userAdmin,
    primary_department: departmentGrowth,
    department_path: [departmentCompany, departmentGrowth],
    department_manager: userUserAdmin,
    position: userUserAdmin.position,
    manager_user: userOrganizationAdmin,
    subordinate_users: [userNormalActive],
  },
  [organizationIdentityMockIds.users.normalActive]: {
    user_id: organizationIdentityMockIds.users.normalActive,
    primary_department: departmentGrowth,
    department_path: [departmentCompany, departmentGrowth],
    department_manager: userUserAdmin,
    position: userNormalActive.position,
    manager_user: userUserAdmin,
    subordinate_users: [],
  },
  [organizationIdentityMockIds.users.pendingLocal]: {
    user_id: organizationIdentityMockIds.users.pendingLocal,
    primary_department: departmentDataPlatform,
    department_path: [departmentCompany, departmentEngineering, departmentDataPlatform],
    department_manager: userOrganizationAdmin,
    position: userPendingLocal.position,
    manager_user: userOrganizationAdmin,
    subordinate_users: [],
  },
  [organizationIdentityMockIds.users.disabledLocal]: {
    user_id: organizationIdentityMockIds.users.disabledLocal,
    primary_department: departmentSalesSync,
    department_path: [departmentCompany, departmentSalesSync],
    department_manager: userExternalSync,
    position: userDisabledLocal.position,
    manager_user: userExternalSync,
    subordinate_users: [],
  },
  [organizationIdentityMockIds.users.deletedLocal]: {
    user_id: organizationIdentityMockIds.users.deletedLocal,
    primary_department: null,
    department_path: [],
    department_manager: null,
    position: userDeletedLocal.position,
    manager_user: null,
    subordinate_users: [],
  },
  [organizationIdentityMockIds.users.externalSync]: {
    user_id: organizationIdentityMockIds.users.externalSync,
    primary_department: departmentSalesSync,
    department_path: [departmentCompany, departmentSalesSync],
    department_manager: userExternalSync,
    position: userExternalSync.position,
    manager_user: null,
    subordinate_users: [userDisabledLocal],
  },
}

const userGroupsForUser = (userId: EntityId) =>
  organizationIdentityUserGroupDetails
    .filter((detail) => detail.members.some((member) => member.user_id === userId))
    .map((detail) => {
      const member = detail.members.find((item) => item.user_id === userId)

      return {
        group_id: detail.group.group_id,
        group_name: detail.group.group_name,
        group_type: detail.group.group_type,
        source_type: detail.group.source_type,
        join_method: member?.join_method ?? 'manual',
        joined_at: member?.joined_at ?? detail.group.created_at,
        removable: member?.removable ?? true,
        disabled_reason: member?.disabled_reason,
      }
    })

const rolesForUser = (userId: EntityId): RoleMembership[] =>
  organizationIdentityRoleMembers
    .filter((member) => member.user_id === userId)
    .flatMap((member) => {
      const role = organizationIdentityRoles.find((item) => item.role_id === member.role_id)

      if (!role) {
        return []
      }

      return [
        roleMembershipFromRole(
          role,
          member.join_method,
          member.joined_at,
          member.join_method === 'manual' && role.role_id !== organizationIdentityMockIds.roles.systemAdmin,
          role.role_id === organizationIdentityMockIds.roles.systemAdmin ? 'last_system_admin' : undefined,
        ),
      ]
    })

const licenseForUser = (userId: EntityId) =>
  organizationIdentityLicenseAssignments.find((assignment) => assignment.user_id === userId) ?? null

const bindingsForUser = (userId: EntityId) =>
  organizationIdentityBindings.filter((binding) => binding.user_id === userId)

const devicesForUser = (userId: EntityId) =>
  organizationIdentityLoginDevices.filter((device) => device.user_id === userId)

const auditLogsForTarget = (targetId: EntityId) =>
  organizationIdentityAuditLogs.filter((log) => log.target_id === targetId)

const userDetailFromUser = (user: User): UserDetail => ({
  user,
  organization: organizationInfoByUserId[user.user_id] ?? {
    user_id: user.user_id,
    primary_department: null,
    department_path: [],
    department_manager: null,
    position: user.position,
    manager_user: null,
    subordinate_users: [],
  },
  user_groups: userGroupsForUser(user.user_id),
  roles: rolesForUser(user.user_id),
  license: licenseForUser(user.user_id),
  identity_bindings: bindingsForUser(user.user_id),
  login_devices: devicesForUser(user.user_id),
  audit_logs: auditLogsForTarget(user.user_id),
  action_decisions: organizationIdentityUserActionDecisionsByUserId[user.user_id] ?? {},
})

export const organizationIdentityUserDetails: UserDetail[] = organizationIdentityUsers.map(userDetailFromUser)

const editableDetail = (
  user: User,
  readonlyFields: Partial<Record<keyof UserEditableDetail['readonly_fields'], UserReadonlyReason>>,
): UserEditableDetail => ({
  user,
  editable_fields:
    user.source_type === 'local'
      ? [
          'display_name',
          'email',
          'mobile',
          'employee_no',
          'department_id',
          'position',
          'user_type',
          'auth_type',
          'user_group_ids',
          'role_ids',
          'license_status',
        ]
      : ['user_group_ids', 'role_ids', 'license_status'],
  readonly_fields: readonlyFields,
  manageable_group_ids: [
    organizationIdentityMockIds.groups.analyticsCore,
    organizationIdentityMockIds.groups.growthProject,
  ],
  assignable_role_ids: [organizationIdentityMockIds.roles.biViewer, organizationIdentityMockIds.roles.growthOwner],
})

export const organizationIdentityUserEditableDetailsByUserId: Record<EntityId, UserEditableDetail> = {
  [organizationIdentityMockIds.users.systemAdmin]: editableDetail(userSystemAdmin, {
    role_ids: 'system_admin_protected',
  }),
  [organizationIdentityMockIds.users.organizationAdmin]: editableDetail(userOrganizationAdmin, {}),
  [organizationIdentityMockIds.users.userAdmin]: editableDetail(userUserAdmin, {
    email: 'external_sync',
    mobile: 'external_sync',
    department_id: 'external_sync',
  }),
  [organizationIdentityMockIds.users.normalActive]: editableDetail(userNormalActive, {}),
  [organizationIdentityMockIds.users.pendingLocal]: editableDetail(userPendingLocal, {}),
  [organizationIdentityMockIds.users.disabledLocal]: editableDetail(userDisabledLocal, {}),
  [organizationIdentityMockIds.users.deletedLocal]: editableDetail(userDeletedLocal, {
    display_name: 'deleted_user',
    email: 'deleted_user',
    mobile: 'deleted_user',
    employee_no: 'deleted_user',
    department_id: 'deleted_user',
    position: 'deleted_user',
    user_type: 'deleted_user',
    auth_type: 'deleted_user',
    user_group_ids: 'deleted_user',
    role_ids: 'deleted_user',
    license_status: 'deleted_user',
  }),
  [organizationIdentityMockIds.users.externalSync]: editableDetail(userExternalSync, {
    display_name: 'external_sync',
    email: 'external_sync',
    mobile: 'external_sync',
    employee_no: 'external_sync',
    department_id: 'external_sync',
    auth_type: 'external_sync',
  }),
}

export const organizationIdentityUserDeleteImpactsByUserId: Record<EntityId, UserDeleteImpact> = {
  [organizationIdentityMockIds.users.systemAdmin]: {
    user_id: organizationIdentityMockIds.users.systemAdmin,
    user: userSystemAdmin,
    untransferred_asset_count: 0,
    department_id: organizationIdentityMockIds.departments.dataPlatform,
    department_name: departmentDataPlatform.department_name,
    user_group_count: 1,
    role_count: 1,
    license_occupied: true,
    is_owner: true,
    blockers: [
      {
        type: 'unique_system_admin',
        severity: 'blocking',
        message: '该用户是唯一系统管理员。',
        count: 1,
        related_ids: [organizationIdentityMockIds.roles.systemAdmin],
      },
    ],
    warnings: [],
    can_delete: false,
  },
  [organizationIdentityMockIds.users.normalActive]: {
    user_id: organizationIdentityMockIds.users.normalActive,
    user: userNormalActive,
    untransferred_asset_count: 3,
    department_id: organizationIdentityMockIds.departments.growth,
    department_name: departmentGrowth.department_name,
    user_group_count: 2,
    role_count: 2,
    license_occupied: false,
    is_owner: false,
    blockers: [
      {
        type: 'untransferred_assets',
        severity: 'blocking',
        message: '仍有 3 个资产需要交接。',
        count: 3,
        related_ids: ['asset_dashboard_growth', 'asset_dataset_orders', 'asset_metric_retention'],
      },
    ],
    warnings: [
      {
        type: 'permission_reference',
        severity: 'warning',
        message: '该用户仍被 2 条资源授权引用。',
        count: 2,
        related_ids: [organizationIdentityMockIds.groups.growthProject],
      },
    ],
    can_delete: false,
  },
  [organizationIdentityMockIds.users.pendingLocal]: {
    user_id: organizationIdentityMockIds.users.pendingLocal,
    user: userPendingLocal,
    untransferred_asset_count: 0,
    department_id: organizationIdentityMockIds.departments.dataPlatform,
    department_name: departmentDataPlatform.department_name,
    user_group_count: 2,
    role_count: 0,
    license_occupied: false,
    is_owner: false,
    blockers: [],
    warnings: [],
    can_delete: true,
  },
  [organizationIdentityMockIds.users.deletedLocal]: {
    user_id: organizationIdentityMockIds.users.deletedLocal,
    user: userDeletedLocal,
    untransferred_asset_count: 0,
    department_id: null,
    department_name: null,
    user_group_count: 1,
    role_count: 0,
    license_occupied: false,
    is_owner: false,
    blockers: [],
    warnings: [
      {
        type: 'permission_reference',
        severity: 'info',
        message: '已删除用户仅保留历史审计引用。',
        count: 1,
        related_ids: [organizationIdentityMockIds.groups.legacyDisabled],
      },
    ],
    can_delete: false,
  },
}

export const organizationIdentityAssetTransferPlans: AssetTransferPlan[] = [
  {
    source_user_id: organizationIdentityMockIds.users.normalActive,
    receiver_user_id: organizationIdentityMockIds.users.organizationAdmin,
    asset_ids: ['asset_dashboard_growth', 'asset_dataset_orders', 'asset_metric_retention'],
    project_ids: [organizationIdentityMockIds.projects.growth],
    auto_grant_project_view: true,
    transfer_reason: '离职删除前资产交接演示数据',
  },
  {
    source_user_id: organizationIdentityMockIds.users.deletedLocal,
    receiver_user_id: organizationIdentityMockIds.users.systemAdmin,
    asset_ids: ['asset_legacy_report'],
    project_ids: [organizationIdentityMockIds.projects.biPlatform],
    auto_grant_project_view: false,
    transfer_reason: '已删除用户历史交接记录',
  },
]

export const organizationIdentityDepartmentDeleteImpactsByDepartmentId: Record<EntityId, DepartmentDeleteImpact> = {
  [organizationIdentityMockIds.departments.dataPlatform]: {
    department_id: organizationIdentityMockIds.departments.dataPlatform,
    department_name: departmentDataPlatform.department_name,
    source_type: departmentDataPlatform.source_type,
    child_department_count: 0,
    member_count: 3,
    dynamic_user_group_reference_count: 1,
    blockers: [
      {
        type: 'permission_reference',
        severity: 'blocking',
        message: '部门下仍有 3 名用户，且被动态用户组规则引用。',
        count: 3,
        related_ids: [
          organizationIdentityMockIds.users.systemAdmin,
          organizationIdentityMockIds.users.organizationAdmin,
          organizationIdentityMockIds.users.pendingLocal,
        ],
      },
    ],
    can_delete: false,
  },
  [organizationIdentityMockIds.departments.emptyLocal]: {
    department_id: organizationIdentityMockIds.departments.emptyLocal,
    department_name: departmentEmptyLocal.department_name,
    source_type: departmentEmptyLocal.source_type,
    child_department_count: 0,
    member_count: 0,
    dynamic_user_group_reference_count: 0,
    blockers: [],
    can_delete: true,
  },
  [organizationIdentityMockIds.departments.salesSync]: {
    department_id: organizationIdentityMockIds.departments.salesSync,
    department_name: departmentSalesSync.department_name,
    source_type: departmentSalesSync.source_type,
    child_department_count: 0,
    member_count: 2,
    dynamic_user_group_reference_count: 0,
    blockers: [
      {
        type: 'system_config_reference',
        severity: 'blocking',
        message: '外部同步部门不可在本地删除。',
        count: 1,
        related_ids: [organizationIdentityMockIds.departments.salesSync],
      },
    ],
    can_delete: false,
  },
}

export const organizationIdentityUserGroupDeleteImpactsByGroupId: Record<EntityId, UserGroupDeleteImpact> = {
  [organizationIdentityMockIds.groups.analyticsCore]: {
    group_id: organizationIdentityMockIds.groups.analyticsCore,
    group_name: groupAnalyticsCore.group_name,
    source_type: groupAnalyticsCore.source_type,
    member_count: 2,
    subgroup_count: 0,
    authorized_resource_count: 9,
    approval_reference_count: 0,
    system_config_reference_count: 0,
    blockers: [],
    warnings: [
      {
        type: 'permission_reference',
        severity: 'warning',
        message: '删除后 9 个资源授权将失效。',
        count: 9,
        related_ids: [organizationIdentityMockIds.groups.analyticsCore],
      },
    ],
    can_delete: true,
  },
  [organizationIdentityMockIds.groups.salesSync]: {
    group_id: organizationIdentityMockIds.groups.salesSync,
    group_name: groupSalesSync.group_name,
    source_type: groupSalesSync.source_type,
    member_count: 2,
    subgroup_count: 0,
    authorized_resource_count: 4,
    approval_reference_count: 0,
    system_config_reference_count: 1,
    blockers: [
      {
        type: 'system_config_reference',
        severity: 'blocking',
        message: '外部同步部门用户组不可本地删除。',
        count: 1,
        related_ids: [organizationIdentityMockIds.groups.salesSync],
      },
    ],
    warnings: [],
    can_delete: false,
  },
  [organizationIdentityMockIds.groups.legacyDisabled]: {
    group_id: organizationIdentityMockIds.groups.legacyDisabled,
    group_name: groupLegacyDisabled.group_name,
    source_type: groupLegacyDisabled.source_type,
    member_count: 1,
    subgroup_count: 0,
    authorized_resource_count: 2,
    approval_reference_count: 2,
    system_config_reference_count: 1,
    blockers: [
      {
        type: 'system_config_reference',
        severity: 'blocking',
        message: '仍被系统配置引用。',
        count: 1,
        related_ids: [organizationIdentityMockIds.groups.legacyDisabled],
      },
    ],
    warnings: [
      {
        type: 'permission_reference',
        severity: 'warning',
        message: '删除后历史审批引用需要迁移。',
        count: 2,
        related_ids: [organizationIdentityMockIds.groups.legacyDisabled],
      },
    ],
    can_delete: false,
  },
}

export const organizationIdentityImportJobs: ImportJob[] = [
  {
    import_job_id: 'import_users_20260529',
    file_name: 'users_import_20260529.xlsx',
    file_format: 'xlsx',
    file_size_bytes: 184320,
    current_step: 'preview_validation',
    status: 'ready',
    total_rows: 3,
    passed_rows: 1,
    warning_rows: 1,
    error_rows: 1,
    success_count: 0,
    failure_count: 0,
    skipped_count: 0,
    progress_percent: 70,
    preview_rows: [
      {
        row_number: 2,
        username: 'new.joiner',
        display_name: '顾新然',
        email: 'gu.xinran@example.com',
        mobile: '+8613800000005',
        employee_no: 'E0401',
        department_code: 'DI-RD-DP',
        department_name: departmentDataPlatform.department_name,
        group_names: [groupAnalyticsCore.group_name],
        role_names: [],
        auth_type: 'password',
        license_assign: 'yes',
        validation_status: 'warning',
        error_reasons: [],
        warnings: ['License 已满，将进入待分配状态'],
      },
      {
        row_number: 3,
        username: 'duplicate.email',
        display_name: '重复邮箱',
        email: userNormalActive.email,
        mobile: '+8613800000015',
        employee_no: 'E0402',
        department_code: 'DI-GROWTH',
        department_name: departmentGrowth.department_name,
        group_names: [groupGrowthProject.group_name],
        role_names: [roleGrowthOwner.role_name],
        auth_type: 'password',
        license_assign: 'no',
        validation_status: 'error',
        error_reasons: ['email duplicate_value'],
        warnings: [],
      },
      {
        row_number: 4,
        username: 'contractor.li',
        display_name: '李临时',
        email: 'li.contractor@example.com',
        mobile: '+8613800000016',
        employee_no: 'C0403',
        department_code: 'DI-GROWTH',
        department_name: departmentGrowth.department_name,
        group_names: [],
        role_names: [roleBiViewer.role_name],
        auth_type: 'sso',
        license_assign: 'no',
        validation_status: 'passed',
        error_reasons: [],
        warnings: [],
      },
    ],
    result_file_url: null,
    created_by: organizationIdentityMockIds.users.userAdmin,
    created_at: '2026-05-29T09:10:00+02:00',
    updated_at: '2026-05-29T09:18:00+02:00',
  },
]

export const organizationIdentityExportTasks: ExportTask[] = [
  {
    export_task_id: 'export_users_latest',
    module_name: 'users',
    file_name: 'users_20260530.xlsx',
    file_format: 'xlsx',
    status: 'success',
    total_count: organizationIdentityUsers.length,
    exported_count: organizationIdentityUsers.length,
    download_url: '/mock/downloads/users_20260530.xlsx',
    failure_reason: null,
    created_by: organizationIdentityMockIds.users.userAdmin,
    created_at: '2026-05-30T08:30:00+02:00',
    completed_at: '2026-05-30T08:31:00+02:00',
  },
  {
    export_task_id: 'export_audit_logs_running',
    module_name: 'audit_logs',
    file_name: 'audit_logs_20260530.xlsx',
    file_format: 'xlsx',
    status: 'running',
    total_count: organizationIdentityAuditLogs.length,
    exported_count: 6,
    download_url: null,
    failure_reason: null,
    created_by: organizationIdentityMockIds.users.systemAdmin,
    created_at: '2026-05-30T08:40:00+02:00',
    completed_at: null,
  },
]

export const organizationIdentityBatchActionResults: BatchActionResult[] = [
  {
    batch_id: 'batch_disable_users_20260530',
    action: 'batch_disable_users',
    total_count: 3,
    success_count: 1,
    failure_count: 1,
    skipped_count: 1,
    items: [
      {
        target_id: organizationIdentityMockIds.users.normalActive,
        target_name: userNormalActive.display_name,
        success: true,
        skipped: false,
        message: '已禁用并释放 License',
      },
      {
        target_id: organizationIdentityMockIds.users.systemAdmin,
        target_name: userSystemAdmin.display_name,
        success: false,
        skipped: false,
        error: {
          code: 'business_blocked',
          message: '唯一系统管理员不可禁用',
        },
      },
      {
        target_id: organizationIdentityMockIds.users.deletedLocal,
        target_name: userDeletedLocal.display_name,
        success: false,
        skipped: true,
        error: {
          code: 'business_blocked',
          message: '已删除用户自动跳过',
        },
      },
    ],
    created_at: '2026-05-30T08:50:00+02:00',
  },
]

export const organizationIdentityRefreshEvents: RefreshPayload[] = [
  {
    topic: 'users',
    change_type: 'status_changed',
    target_id: organizationIdentityMockIds.users.disabledLocal,
    related_user_ids: [organizationIdentityMockIds.users.disabledLocal],
    emitted_at: '2026-05-20T15:35:00+02:00',
  },
  {
    topic: 'licenses',
    change_type: 'updated',
    target_id: 'lic_disabled_local',
    related_user_ids: [organizationIdentityMockIds.users.disabledLocal],
    emitted_at: '2026-05-20T15:35:00+02:00',
  },
  {
    topic: 'departments',
    change_type: 'relationship_changed',
    target_id: organizationIdentityMockIds.departments.salesSync,
    related_user_ids: [organizationIdentityMockIds.users.externalSync, organizationIdentityMockIds.users.disabledLocal],
    emitted_at: '2026-05-30T07:50:00+02:00',
  },
  {
    topic: 'user_groups',
    change_type: 'relationship_changed',
    target_id: organizationIdentityMockIds.groups.growthProject,
    related_user_ids: [organizationIdentityMockIds.users.normalActive],
    emitted_at: '2026-03-01T14:00:00+02:00',
  },
  {
    topic: 'audit_logs',
    change_type: 'created',
    target_id: 'audit_disable_user',
    related_user_ids: [organizationIdentityMockIds.users.disabledLocal],
    emitted_at: '2026-05-20T15:35:00+02:00',
  },
]

export const organizationIdentityOverviewSeed = {
  generated_at: now,
  stats: {
    total_user_count: organizationIdentityUsers.length,
    active_user_count: organizationIdentityUsers.filter((user) => user.status === 'active').length,
    disabled_user_count: organizationIdentityUsers.filter((user) => user.status === 'disabled').length,
    pending_user_count: organizationIdentityUsers.filter((user) => user.status === 'pending').length,
    department_count: organizationIdentityDepartments.length,
    user_group_count: organizationIdentityUserGroups.length,
    occupied_license_count: organizationIdentityLicenseAssignments.filter(
      (assignment) => assignment.status === 'occupied',
    ).length,
    remaining_license_count: organizationIdentityLicenseSummaries.full.remaining_license_count,
  },
  todo_counts: {
    pending_users: organizationIdentityUsers.filter((user) => user.status === 'pending').length,
    identity_conflicts: organizationIdentityConflicts.filter((conflict) => conflict.status === 'pending').length,
    pending_license_assignments: organizationIdentityLicenseAssignments.filter(
      (assignment) => assignment.status === 'pending',
    ).length,
    sync_failures: 1,
    asset_transfer_pending_count:
      organizationIdentityUserDeleteImpactsByUserId[organizationIdentityMockIds.users.normalActive]
        ?.untransferred_asset_count ?? 0,
  },
}

const identityPageKeys: IdentityPageKey[] = [
  'overview',
  'tenant_info',
  'users',
  'departments',
  'user_groups',
  'role_members',
  'identity_bindings',
  'licenses',
  'profile',
]

const identityPermissionKeys: IdentityPermissionKey[] = [
  'view_overview',
  'view_tenant',
  'edit_tenant',
  'manage_tenant_admins',
  'view_users',
  'create_user',
  'import_users',
  'edit_user',
  'disable_user',
  'enable_user',
  'delete_user',
  'batch_disable_users',
  'batch_delete_users',
  'send_activation_notice',
  'reset_user_password',
  'view_user_login_records',
  'view_user_operation_logs',
  'view_user_permission_summary',
  'download_user_import_template',
  'submit_user_import',
  'export_users',
  'view_departments',
  'create_department',
  'edit_department',
  'delete_department',
  'manage_department_members',
  'sync_organization',
  'export_departments',
  'view_user_groups',
  'create_user_group',
  'edit_user_group',
  'disable_user_group',
  'enable_user_group',
  'delete_user_group',
  'manage_user_group_members',
  'manage_user_group_subgroups',
  'export_user_groups',
  'view_role_members',
  'add_role_members',
  'remove_role_members',
  'view_identity_bindings',
  'manage_identity_bindings',
  'unbind_identity_binding',
  'view_license',
  'manage_license_policy',
  'assign_license',
  'release_license',
  'batch_assign_license',
  'batch_release_license',
  'view_license_records',
  'view_profile',
  'edit_profile',
  'change_password',
  'bind_own_identity',
  'unbind_own_identity',
  'manage_login_devices',
  'view_login_devices',
  'logout_own_device',
  'logout_other_devices',
  'view_audit_logs',
  'export_audit_logs',
]

const permissionDecision = (allowed: boolean, reason: PermissionDecisionReason = 'allowed'): PermissionDecision => ({
  allowed,
  reason,
})

const decisionMap = <TKey extends string>(
  keys: readonly TKey[],
  allowedKeys: readonly TKey[],
): Record<TKey, PermissionDecision> => {
  const allowedSet = new Set<TKey>(allowedKeys)

  return Object.fromEntries(keys.map((key) => [key, permissionDecision(allowedSet.has(key), allowedSet.has(key) ? 'allowed' : 'no_permission')])) as Record<TKey, PermissionDecision>
}

const tenantScope: ManageScope = {
  scope_type: 'tenant',
  department_ids: organizationIdentityDepartments.map((department) => department.department_id),
  include_child_departments: true,
  user_group_ids: organizationIdentityUserGroups.map((group) => group.group_id),
  project_ids: Object.values(organizationIdentityMockIds.projects),
  user_ids: organizationIdentityUsers.map((user) => user.user_id),
}

const dataPlatformScope: ManageScope = {
  scope_type: 'department_tree',
  department_ids: [
    organizationIdentityMockIds.departments.engineering,
    organizationIdentityMockIds.departments.dataPlatform,
  ],
  include_child_departments: true,
  user_group_ids: [organizationIdentityMockIds.groups.analyticsCore],
  project_ids: [organizationIdentityMockIds.projects.biPlatform],
  user_ids: [
    organizationIdentityMockIds.users.organizationAdmin,
    organizationIdentityMockIds.users.pendingLocal,
    organizationIdentityMockIds.users.normalActive,
  ],
}

const userAdminScope: ManageScope = {
  scope_type: 'departments',
  department_ids: [
    organizationIdentityMockIds.departments.dataPlatform,
    organizationIdentityMockIds.departments.growth,
  ],
  include_child_departments: false,
  user_group_ids: [
    organizationIdentityMockIds.groups.analyticsCore,
    organizationIdentityMockIds.groups.growthProject,
  ],
  project_ids: [organizationIdentityMockIds.projects.growth],
  user_ids: [
    organizationIdentityMockIds.users.userAdmin,
    organizationIdentityMockIds.users.normalActive,
    organizationIdentityMockIds.users.pendingLocal,
  ],
}

const selfScope: ManageScope = {
  scope_type: 'self',
  department_ids: [organizationIdentityMockIds.departments.growth],
  include_child_departments: false,
  user_group_ids: [organizationIdentityMockIds.groups.growthProject],
  project_ids: [],
  user_ids: [organizationIdentityMockIds.users.normalActive],
}

const makeAccessContext = (
  currentUserId: EntityId,
  roles: IdentityAccessContext['roles'],
  manageScope: ManageScope,
  enabledPages: IdentityPageKey[],
  permissions: IdentityPermissionKey[],
): IdentityAccessContext => ({
  current_user_id: currentUserId,
  tenant_id: organizationIdentityMockIds.tenant,
  roles,
  manage_scope: manageScope,
  enabled_pages: enabledPages,
  permissions,
  page_permissions: decisionMap(identityPageKeys, enabledPages),
  action_permissions: decisionMap(identityPermissionKeys, permissions),
  license_management_enabled: true,
  third_party_identity_configured: true,
})

const organizationAdminPages: IdentityPageKey[] = [
  'overview',
  'users',
  'departments',
  'user_groups',
  'role_members',
  'identity_bindings',
  'profile',
]

const organizationAdminPermissions: IdentityPermissionKey[] = [
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
  'view_identity_bindings',
  'manage_identity_bindings',
  'view_profile',
  'edit_profile',
  'change_password',
  'view_login_devices',
  'logout_own_device',
  'logout_other_devices',
  'view_audit_logs',
  'export_audit_logs',
]

const userAdminPages: IdentityPageKey[] = ['overview', 'users', 'identity_bindings', 'profile']
const userAdminPermissions: IdentityPermissionKey[] = [
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

const normalUserPages: IdentityPageKey[] = ['profile']
const normalUserPermissions: IdentityPermissionKey[] = [
  'view_profile',
  'edit_profile',
  'change_password',
  'bind_own_identity',
  'unbind_own_identity',
  'view_login_devices',
  'logout_own_device',
  'logout_other_devices',
]

export const organizationIdentityAccessContexts: Record<
  'system_admin' | 'organization_admin' | 'user_admin' | 'normal_user',
  IdentityAccessContext
> = {
  system_admin: makeAccessContext(
    organizationIdentityMockIds.users.systemAdmin,
    ['system_admin'],
    tenantScope,
    identityPageKeys,
    identityPermissionKeys,
  ),
  organization_admin: makeAccessContext(
    organizationIdentityMockIds.users.organizationAdmin,
    ['organization_admin'],
    dataPlatformScope,
    organizationAdminPages,
    organizationAdminPermissions,
  ),
  user_admin: makeAccessContext(
    organizationIdentityMockIds.users.userAdmin,
    ['user_admin'],
    userAdminScope,
    userAdminPages,
    userAdminPermissions,
  ),
  normal_user: makeAccessContext(
    organizationIdentityMockIds.users.normalActive,
    ['normal_user'],
    selfScope,
    normalUserPages,
    normalUserPermissions,
  ),
}

const noThirdPartyPermissions = identityPermissionKeys.filter(
  (permission) => permission !== 'manage_identity_bindings' && permission !== 'unbind_identity_binding',
)

export const organizationIdentityNoThirdPartyAccessContext: IdentityAccessContext = {
  ...organizationIdentityAccessContexts.system_admin,
  permissions: noThirdPartyPermissions,
  action_permissions: decisionMap(identityPermissionKeys, noThirdPartyPermissions),
  third_party_identity_configured: false,
}

export const organizationIdentityEmptyThirdPartySeed = {
  access_context: organizationIdentityNoThirdPartyAccessContext,
  configured_providers: [],
  bindings: [] as IdentityBinding[],
  conflicts: [] as IdentityConflict[],
  overview: {
    bound_user_count: 0,
    unbound_user_count: 0,
    conflict_count: 0,
    latest_sync_at: null,
    sync_failure_count: 0,
  },
}
