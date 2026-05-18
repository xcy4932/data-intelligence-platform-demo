<script setup lang="ts">
import { NButton, NTooltip } from 'naive-ui'
import type { ChartConfig, ChartType, EventAnalysisResult } from '@/types/eventAnalysis'

const props = defineProps<{
  value: ChartType
  result: EventAnalysisResult | null
  config: ChartConfig
}>()

const emit = defineEmits<{
  'update:value': [value: ChartType]
}>()

const chartTypes: Array<{ type: ChartType; label: string }> = [
  { type: 'line', label: '折线' },
  { type: 'stacked', label: '堆叠' },
  { type: 'bar', label: '柱形' },
  { type: 'dual_axis', label: '双轴' },
  { type: 'donut', label: '环形' },
  { type: 'pie', label: '饼图' },
  { type: 'percentage', label: '百分比' },
  { type: 'cumulative', label: '累积' },
]

const getDisabledReason = (type: ChartType): string => {
  if (!props.result) {
    return '请先开始分析'
  }

  if ((type === 'pie' || type === 'donut') && props.result.groupSummaries.length === 0) {
    return '饼图和环形图需要至少一个属性分组'
  }

  if (type === 'dual_axis' && props.config.selectedMetricIds.length < 1) {
    return '双轴图需要至少一个左轴指标和一个右轴指标'
  }

  return ''
}
</script>

<template>
  <div class="chart-switcher">
    <n-tooltip v-for="item in chartTypes" :key="item.type" trigger="hover">
      <template #trigger>
        <n-button
          size="small"
          :type="value === item.type ? 'primary' : 'default'"
          :disabled="Boolean(getDisabledReason(item.type))"
          @click="emit('update:value', item.type)"
        >
          {{ item.label }}
        </n-button>
      </template>
      {{ getDisabledReason(item.type) || `切换到${item.label}图，不重新查询` }}
    </n-tooltip>
  </div>
</template>

<style scoped lang="scss">
.chart-switcher {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
