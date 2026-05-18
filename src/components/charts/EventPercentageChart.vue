<script setup lang="ts">
import './chartRegister'
import type { EChartsOption } from 'echarts'
import { NEmpty, NSpin } from 'naive-ui'
import { computed } from 'vue'
import VChart from 'vue-echarts'
import type { EventChartProps } from './chartTypes'

const props = defineProps<EventChartProps>()

const option = computed<EChartsOption>(() => {
  const rows = props.result?.percentageSeries ?? []
  const dates = Array.from(new Set(rows.map((row) => row.date.slice(5))))
  const groups = Array.from(new Set(rows.map((row) => row.groupName)))

  return {
    color: ['#d03050', '#2080f0', '#18a058'],
    grid: { top: 44, right: 24, bottom: 30, left: 58 },
    legend: { top: 8, show: props.config.showLegend },
    tooltip: { trigger: 'axis', show: props.config.showTooltip },
    xAxis: { type: 'category', data: dates },
    yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
    series: groups.map((group) => ({
      name: group,
      type: 'bar',
      stack: 'percentage',
      data: dates.map((date) => rows.find((row) => row.date.slice(5) === date && row.groupName === group)?.value ?? 0),
    })),
  }
})
</script>

<template>
  <n-spin :show="loading">
    <v-chart v-if="result?.percentageSeries.length" class="event-chart" :option="option" autoresize />
    <n-empty v-else description="暂无百分比图数据" />
  </n-spin>
</template>

<style scoped lang="scss">
.event-chart {
  width: 100%;
  height: 320px;
}
</style>
