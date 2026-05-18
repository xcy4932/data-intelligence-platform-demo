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

  return {
    tooltip: { trigger: 'item', show: props.config.showTooltip },
    legend: { bottom: 0, show: props.config.showLegend },
    series: [
      {
        name: '分组占比',
        type: 'pie',
        radius: ['45%', '68%'],
        data: rows.map((row) => ({ name: row.groupName, value: row.value })),
        label: { show: props.config.showDataLabel },
      },
    ],
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
    <n-empty v-else description="环形图需要属性分组数据" />
  </n-spin>
</template>

<style scoped lang="scss">
.event-chart {
  width: 100%;
  height: 320px;
}
</style>
