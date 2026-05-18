<script setup lang="ts">
import { NEmpty } from 'naive-ui'
import FormulaTokenChip from './FormulaToken.vue'
import type { FormulaToken } from '@/types/formula'

defineProps<{
  tokens: FormulaToken[]
}>()

const emit = defineEmits<{
  removeToken: [tokenId: string]
}>()
</script>

<template>
  <div class="formula-token-row">
    <formula-token-chip
      v-for="token in tokens"
      :key="token.id"
      :token="token"
      @remove="emit('removeToken', $event)"
    />
    <n-empty v-if="tokens.length === 0" size="small" description="从下方插入指标、常数和运算符来构建公式" />
  </div>
</template>

<style scoped>
.formula-token-row {
  display: flex;
  min-height: 40px;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
</style>
