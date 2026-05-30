<script setup lang="ts">
import { computed } from 'vue'
import type { PermissionDecision } from '@/types/organizationIdentity'
import OrgIdentityStateBlock from './OrgIdentityStateBlock.vue'
import type { OrgIdentityStateKind } from './OrgIdentityStateBlock.vue'

const props = withDefaults(
  defineProps<{
    decision?: PermissionDecision | null
    deniedState?: Extract<OrgIdentityStateKind, '403' | 'disabled'>
    loadingTitle?: string
    loadingDescription?: string
    deniedTitle?: string
    deniedDescription?: string
    compact?: boolean
  }>(),
  {
    decision: null,
    deniedState: '403',
    loadingTitle: undefined,
    loadingDescription: undefined,
    deniedTitle: undefined,
    deniedDescription: undefined,
    compact: false,
  },
)

const isAllowed = computed(() => props.decision?.allowed === true)
const state = computed<OrgIdentityStateKind>(() => {
  if (!props.decision) {
    return 'loading'
  }

  return props.deniedState
})
const title = computed(() => {
  if (!props.decision) {
    return props.loadingTitle
  }

  return props.deniedTitle
})
const description = computed(() => {
  if (!props.decision) {
    return props.loadingDescription
  }

  return props.deniedDescription ?? props.decision.message
})
</script>

<template>
  <slot v-if="isAllowed" />
  <org-identity-state-block
    v-else
    :state="state"
    :title="title"
    :description="description"
    :compact="compact"
  />
</template>
