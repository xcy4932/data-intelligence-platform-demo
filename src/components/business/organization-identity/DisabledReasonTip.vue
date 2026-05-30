<script setup lang="ts">
import { computed } from 'vue'
import { NTooltip } from 'naive-ui'
import type { ActionDecision, PermissionDecision } from '@/types/organizationIdentity'

const props = withDefaults(
  defineProps<{
    decision?: PermissionDecision | ActionDecision | null
    reason?: string
    disabled?: boolean
  }>(),
  {
    decision: null,
    reason: undefined,
    disabled: true,
  },
)

const message = computed(() => props.reason ?? props.decision?.message ?? '')
const shouldShowTip = computed(() => props.disabled && Boolean(message.value))
</script>

<template>
  <n-tooltip v-if="shouldShowTip" trigger="hover">
    <template #trigger>
      <span class="disabled-reason-tip">
        <slot />
      </span>
    </template>
    {{ message }}
  </n-tooltip>
  <slot v-else />
</template>

<style scoped lang="scss">
.disabled-reason-tip {
  display: inline-flex;
  max-width: 100%;
}
</style>
