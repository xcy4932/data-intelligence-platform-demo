<script setup lang="ts">
import './chartRegister'
import type { EChartsOption } from 'echarts'
import { NEmpty, NSpin } from 'naive-ui'
import { computed } from 'vue'
import VChart from 'vue-echarts'
import type { ChartClickParams, EventChartProps } from './chartTypes'

const props = defineProps<EventChartProps>()

const emit = defineEmits<{
  'filter-detail': [field: string, value: string]
}>()

const option = computed<EChartsOption>(() => {
  const rows = props.result?.groupSummaries.slice(0, props.config.topN ?? 10) ?? []
  const horizontal = props.config.barDirection === 'horizontal'
  const names = rows.map((row) => row.groupName)
  const values = rows.map((row) =>
    props.config.displayMode === 'percentage' ? row.percentage : row.value,
  )

  return {
    color: ['#d03050'],
    grid: { top: 24, right: 24, bottom: horizontal ? 24 : 48, left: horizontal ? 98 : 48 },
    tooltip: { trigger: 'axis', show: props.config.showTooltip },
    xAxis: horizontal
      ? { type: 'value', axisLabel: { formatter: props.config.displayMode === 'percentage' ? '{value}%' : '{value}' } }
      : { type: 'category', data: names, axisLabel: { rotate: 24 } },
    yAxis: horizontal ? { type: 'category', data: names } : { type: 'value' },
    series: [{ name: '下降贡献', type: 'bar', barWidth: 18, data: values, label: { show: props.config.showDataLabel } }],
  }
})

const handleClick = (params: ChartClickParams): void => {
  if (params.name) {
    emit('filter-detail', 'dimensionValue', params.name)
  }
}
</script>

<template>
  <n-spin :show="loading">
    <v-chart v-if="result?.groupSummaries.length" class="event-chart" :option="option" autoresize @click="handleClick" />
    <n-empty v-else description="暂无分组数据" />
  </n-spin>
</template>

<style scoped lang="scss">
.event-chart {
  width: 100%;
  height: 320px;
}
</style>
