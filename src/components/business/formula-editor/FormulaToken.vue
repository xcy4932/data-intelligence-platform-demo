<script setup lang="ts">
import { NTag } from 'naive-ui'
import type { TagProps } from 'naive-ui'
import type { FormulaToken } from '@/types/formula'

const props = defineProps<{
  token: FormulaToken
}>()

const emit = defineEmits<{
  remove: [tokenId: string]
}>()

const tagType: TagProps['type'] =
  props.token.type === 'operator' ? 'warning' : props.token.type === 'constant' ? 'success' : 'info'
</script>

<template>
  <n-tag closable :type="tagType" @close="emit('remove', token.id)">
    {{ token.label }}
  </n-tag>
</template>
