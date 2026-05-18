<script setup lang="ts">
import { NGi, NGrid, NInput, NInputNumber, NSelect, NSpace, NSwitch } from 'naive-ui'
import type { FormulaDisplayConfig } from '@/types/formula'

defineProps<{
  config: FormulaDisplayConfig
}>()

const emit = defineEmits<{
  updateConfig: [config: FormulaDisplayConfig]
}>()

const updateConfig = (config: FormulaDisplayConfig, patch: Partial<FormulaDisplayConfig>): void => {
  emit('updateConfig', {
    ...config,
    ...patch,
  })
}
</script>

<template>
  <n-grid :cols="4" :x-gap="12" :y-gap="12">
    <n-gi>
      <n-select
        :value="config.format"
        :options="[
          { label: '数字', value: 'number' },
          { label: '百分比', value: 'percent' },
          { label: '货币', value: 'currency' },
        ]"
        @update:value="(value) => updateConfig(config, { format: String(value) === 'currency' ? 'currency' : String(value) === 'percent' ? 'percent' : 'number' })"
      />
    </n-gi>
    <n-gi>
      <n-input-number
        :value="config.precision"
        :min="0"
        :max="3"
        @update:value="(value) => updateConfig(config, { precision: Number(value ?? 0) })"
      />
    </n-gi>
    <n-gi>
      <n-input :value="config.unit" placeholder="单位" @update:value="(value) => updateConfig(config, { unit: value })" />
    </n-gi>
    <n-gi>
      <n-space align="center">
        <span class="config-label">展示原子指标</span>
        <n-switch
          :value="config.showAtomicMetrics"
          @update:value="(value) => updateConfig(config, { showAtomicMetrics: value })"
        />
      </n-space>
    </n-gi>
  </n-grid>
</template>

<style scoped>
.config-label {
  color: #4b5563;
  font-size: 13px;
}
</style>
