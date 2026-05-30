import type { EntityId, ISODateTimeString } from '@/types/common'
import type {
  AuditAction,
  AuditLog,
  AuditResult,
  AuditTargetType,
  AuditValue,
} from '@/types/organizationIdentity'

export const prdIdentityAuditActions = [
  'create_user',
  'edit_user',
  'disable_user',
  'enable_user',
  'delete_user',
  'batch_import_users',
  'batch_delete_users',
  'edit_department',
  'create_department',
  'delete_department',
  'create_user_group',
  'edit_user_group',
  'delete_user_group',
  'add_user_group_member',
  'remove_user_group_member',
  'add_role_member',
  'remove_role_member',
  'bind_identity',
  'unbind_identity',
  'assign_license',
  'release_license',
  'edit_license_policy',
  'edit_tenant',
  'add_system_admin',
  'remove_system_admin',
] as const satisfies readonly AuditAction[]

export type PrdIdentityAuditAction = (typeof prdIdentityAuditActions)[number]

export const prdIdentityAuditActionCount = 25

export interface IdentityAuditActionDefinition {
  action: PrdIdentityAuditAction
  label: string
  default_target_type: AuditTargetType
}

export const prdIdentityAuditActionDefinitions: Record<
  PrdIdentityAuditAction,
  IdentityAuditActionDefinition
> = {
  create_user: { action: 'create_user', label: '新建用户', default_target_type: 'user' },
  edit_user: { action: 'edit_user', label: '编辑用户', default_target_type: 'user' },
  disable_user: { action: 'disable_user', label: '禁用用户', default_target_type: 'user' },
  enable_user: { action: 'enable_user', label: '启用用户', default_target_type: 'user' },
  delete_user: { action: 'delete_user', label: '删除用户', default_target_type: 'user' },
  batch_import_users: { action: 'batch_import_users', label: '批量导入用户', default_target_type: 'import_job' },
  batch_delete_users: { action: 'batch_delete_users', label: '批量删除用户', default_target_type: 'user' },
  edit_department: { action: 'edit_department', label: '修改部门', default_target_type: 'department' },
  create_department: { action: 'create_department', label: '新建部门', default_target_type: 'department' },
  delete_department: { action: 'delete_department', label: '删除部门', default_target_type: 'department' },
  create_user_group: { action: 'create_user_group', label: '新建用户组', default_target_type: 'user_group' },
  edit_user_group: { action: 'edit_user_group', label: '编辑用户组', default_target_type: 'user_group' },
  delete_user_group: { action: 'delete_user_group', label: '删除用户组', default_target_type: 'user_group' },
  add_user_group_member: {
    action: 'add_user_group_member',
    label: '添加用户组成员',
    default_target_type: 'user_group',
  },
  remove_user_group_member: {
    action: 'remove_user_group_member',
    label: '移除用户组成员',
    default_target_type: 'user_group',
  },
  add_role_member: { action: 'add_role_member', label: '添加角色成员', default_target_type: 'role' },
  remove_role_member: { action: 'remove_role_member', label: '移除角色成员', default_target_type: 'role' },
  bind_identity: { action: 'bind_identity', label: '绑定第三方账号', default_target_type: 'identity_binding' },
  unbind_identity: { action: 'unbind_identity', label: '解绑第三方账号', default_target_type: 'identity_binding' },
  assign_license: { action: 'assign_license', label: '分配 License', default_target_type: 'license_assignment' },
  release_license: { action: 'release_license', label: '释放 License', default_target_type: 'license_assignment' },
  edit_license_policy: { action: 'edit_license_policy', label: '修改 License 策略', default_target_type: 'license_policy' },
  edit_tenant: { action: 'edit_tenant', label: '修改企业信息', default_target_type: 'tenant' },
  add_system_admin: { action: 'add_system_admin', label: '添加系统管理员', default_target_type: 'tenant' },
  remove_system_admin: { action: 'remove_system_admin', label: '移除系统管理员', default_target_type: 'tenant' },
}

const prdIdentityAuditActionSet: ReadonlySet<AuditAction> = new Set(prdIdentityAuditActions)

export const isPrdIdentityAuditAction = (action: AuditAction): action is PrdIdentityAuditAction =>
  prdIdentityAuditActionSet.has(action)

export interface IdentityAuditRecordBasePayload {
  log_id?: EntityId
  operator_user_id: EntityId
  operator_name: string
  operated_at?: ISODateTimeString
  module_name?: AuditLog['module_name']
  action: AuditAction
  target_type: AuditTargetType
  target_id: EntityId
  target_name: string
  old_value?: AuditValue
  new_value?: AuditValue
  request_ip: string
}

export type IdentityAuditRecordPayload =
  | (IdentityAuditRecordBasePayload & {
      result?: Extract<AuditResult, 'success'>
      failure_reason?: null
    })
  | (IdentityAuditRecordBasePayload & {
      result: Extract<AuditResult, 'failure'>
      failure_reason: string
    })

export interface IdentityAuditLogDefaults {
  log_id: EntityId
  operated_at: ISODateTimeString
}

export interface IdentityAuditValueChange {
  field_path: string
  old_value: string
  new_value: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isAuditValueRecord = (value: AuditValue): value is { [key: string]: AuditValue } =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const normalizeIdentityAuditValue = (value: unknown): AuditValue | undefined => {
  if (value === undefined) {
    return undefined
  }

  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : String(value)
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeIdentityAuditValue(item) ?? null)
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, normalizeIdentityAuditValue(item) ?? null]),
    )
  }

  return String(value)
}

const displayAuditValue = (value: AuditValue): string => {
  if (value === null) {
    return 'null'
  }

  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  return String(value)
}

const flattenIdentityAuditValue = (
  value: AuditValue | undefined,
  rootPath = 'value',
): Map<string, string> => {
  const rows = new Map<string, string>()
  const normalized = normalizeIdentityAuditValue(value)

  if (normalized === undefined) {
    return rows
  }

  const walk = (item: AuditValue, path: string): void => {
    if (Array.isArray(item)) {
      if (item.length === 0) {
        rows.set(path, '[]')
        return
      }

      item.forEach((child, index) => walk(child, `${path}[${index}]`))
      return
    }

    if (isAuditValueRecord(item)) {
      const entries = Object.entries(item)

      if (entries.length === 0) {
        rows.set(path, '{}')
        return
      }

      entries.forEach(([key, child]) => {
        walk(child, path === rootPath ? key : `${path}.${key}`)
      })
      return
    }

    rows.set(path, displayAuditValue(item))
  }

  walk(normalized, rootPath)
  return rows
}

export const buildIdentityAuditValueChanges = (
  oldValue?: AuditValue,
  newValue?: AuditValue,
): IdentityAuditValueChange[] => {
  const oldRows = flattenIdentityAuditValue(oldValue)
  const newRows = flattenIdentityAuditValue(newValue)
  const fieldPaths = [...new Set([...oldRows.keys(), ...newRows.keys()])].sort()

  return fieldPaths.map((fieldPath) => ({
    field_path: fieldPath,
    old_value: oldRows.get(fieldPath) ?? '',
    new_value: newRows.get(fieldPath) ?? '',
  }))
}

export const validateIdentityAuditRecordPayload = (
  payload: IdentityAuditRecordPayload,
): Record<string, string> => {
  const fieldErrors: Record<string, string> = {}
  const requiredTextFields: Array<[keyof IdentityAuditRecordBasePayload, string]> = [
    ['operator_user_id', payload.operator_user_id],
    ['operator_name', payload.operator_name],
    ['action', payload.action],
    ['target_type', payload.target_type],
    ['target_id', payload.target_id],
    ['target_name', payload.target_name],
    ['request_ip', payload.request_ip],
  ]

  requiredTextFields.forEach(([field, value]) => {
    if (typeof value !== 'string' || !value.trim()) {
      fieldErrors[field] = '必填'
    }
  })

  if (payload.result === 'failure' && !payload.failure_reason.trim()) {
    fieldErrors.failure_reason = '失败日志必须包含失败原因'
  }

  return fieldErrors
}

export const createIdentityAuditLog = (
  payload: IdentityAuditRecordPayload,
  defaults: IdentityAuditLogDefaults,
): AuditLog => {
  const result = payload.result ?? 'success'
  const oldValue = normalizeIdentityAuditValue(payload.old_value)
  const newValue = normalizeIdentityAuditValue(payload.new_value)
  const auditLog: AuditLog = {
    log_id: payload.log_id ?? defaults.log_id,
    operator_user_id: payload.operator_user_id,
    operator_name: payload.operator_name,
    operated_at: payload.operated_at ?? defaults.operated_at,
    module_name: payload.module_name ?? 'organization_identity',
    action: payload.action,
    target_type: payload.target_type,
    target_id: payload.target_id,
    target_name: payload.target_name,
    result,
    failure_reason: result === 'failure' ? payload.failure_reason : null,
    request_ip: payload.request_ip,
  }

  if (oldValue !== undefined) {
    auditLog.old_value = oldValue
  }

  if (newValue !== undefined) {
    auditLog.new_value = newValue
  }

  return auditLog
}
