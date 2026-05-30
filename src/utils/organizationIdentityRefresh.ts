import type { RefreshChangeType, RefreshPayload, RefreshTopic } from '@/types/organizationIdentity'

export const identityRefreshTopics = {
  tenant: 'tenant',
  users: 'users',
  userDetail: 'user_detail',
  departments: 'departments',
  groups: 'user_groups',
  roles: 'roles',
  bindings: 'identity_bindings',
  licenses: 'licenses',
  profile: 'profile',
  auditLogs: 'audit_logs',
  overview: 'overview',
} as const satisfies Record<string, RefreshTopic>

export const identityRefreshTopicList = [
  identityRefreshTopics.tenant,
  identityRefreshTopics.users,
  identityRefreshTopics.userDetail,
  identityRefreshTopics.departments,
  identityRefreshTopics.groups,
  identityRefreshTopics.roles,
  identityRefreshTopics.bindings,
  identityRefreshTopics.licenses,
  identityRefreshTopics.profile,
  identityRefreshTopics.auditLogs,
  identityRefreshTopics.overview,
] as const satisfies readonly RefreshTopic[]

export type IdentityRefreshTopicAlias = keyof typeof identityRefreshTopics
export type IdentityRefreshListener = (payload: RefreshPayload) => void
export type UnsubscribeIdentityRefresh = () => void

export interface IdentityRefreshEmitPayload {
  topic: RefreshTopic
  change_type: RefreshChangeType
  target_id?: RefreshPayload['target_id']
  related_user_ids?: RefreshPayload['related_user_ids']
  emitted_at?: RefreshPayload['emitted_at']
}

export interface IdentityRefreshEmitResult {
  payload: RefreshPayload
  delivered_count: number
  failed_count: number
  deduped: boolean
  errors: unknown[]
}

const listenersByTopic = new Map<RefreshTopic, Set<IdentityRefreshListener>>()
const recentRefreshKeys = new Set<string>()
let recentRefreshResetTimer: ReturnType<typeof globalThis.setTimeout> | null = null

const now = (): string => new Date().toISOString()

const normalizeTopics = (topics: RefreshTopic | readonly RefreshTopic[]): RefreshTopic[] =>
  Array.from(new Set(Array.isArray(topics) ? topics : [topics]))

const refreshKey = (payload: RefreshPayload): string =>
  [
    payload.topic,
    payload.change_type,
    payload.target_id ?? '',
    [...(payload.related_user_ids ?? [])].sort().join(','),
  ].join('|')

const scheduleRecentRefreshKeyReset = (): void => {
  if (recentRefreshResetTimer) {
    return
  }

  recentRefreshResetTimer = globalThis.setTimeout(() => {
    recentRefreshKeys.clear()
    recentRefreshResetTimer = null
  }, 0)
}

const toRefreshPayload = (payload: IdentityRefreshEmitPayload): RefreshPayload => ({
  topic: payload.topic,
  change_type: payload.change_type,
  target_id: payload.target_id,
  related_user_ids: payload.related_user_ids,
  emitted_at: payload.emitted_at ?? now(),
})

export const subscribeIdentityRefresh = (
  topics: RefreshTopic | readonly RefreshTopic[],
  listener: IdentityRefreshListener,
): UnsubscribeIdentityRefresh => {
  const normalizedTopics = normalizeTopics(topics)

  normalizedTopics.forEach((topic) => {
    const listeners = listenersByTopic.get(topic) ?? new Set<IdentityRefreshListener>()
    listeners.add(listener)
    listenersByTopic.set(topic, listeners)
  })

  let subscribed = true

  return () => {
    if (!subscribed) {
      return
    }

    subscribed = false
    normalizedTopics.forEach((topic) => {
      const listeners = listenersByTopic.get(topic)

      if (!listeners) {
        return
      }

      listeners.delete(listener)

      if (listeners.size === 0) {
        listenersByTopic.delete(topic)
      }
    })
  }
}

export const emitIdentityRefresh = (payload: IdentityRefreshEmitPayload): IdentityRefreshEmitResult => {
  const refreshPayload = toRefreshPayload(payload)
  const key = refreshKey(refreshPayload)

  if (recentRefreshKeys.has(key)) {
    return {
      payload: refreshPayload,
      delivered_count: 0,
      failed_count: 0,
      deduped: true,
      errors: [],
    }
  }

  recentRefreshKeys.add(key)
  scheduleRecentRefreshKeyReset()

  const listeners = [...(listenersByTopic.get(refreshPayload.topic) ?? [])]
  const errors: unknown[] = []

  listeners.forEach((listener) => {
    try {
      listener(refreshPayload)
    } catch (error) {
      errors.push(error)
    }
  })

  return {
    payload: refreshPayload,
    delivered_count: listeners.length - errors.length,
    failed_count: errors.length,
    deduped: false,
    errors,
  }
}

export const emitIdentityRefreshForTopics = (
  topics: RefreshTopic | readonly RefreshTopic[],
  payload: Omit<IdentityRefreshEmitPayload, 'topic' | 'emitted_at'> & Pick<Partial<IdentityRefreshEmitPayload>, 'emitted_at'>,
): IdentityRefreshEmitResult[] =>
  normalizeTopics(topics).map((topic) =>
    emitIdentityRefresh({
      ...payload,
      topic,
    }),
  )
