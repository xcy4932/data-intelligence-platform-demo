<script setup lang="ts">
import './chartRegister'
import type { EChartsOption } from 'echarts'
import { NEmpty, NSpin } from 'naive-ui'
import { computed } from 'vue'
import VChart from 'vue-echarts'
import type { EventChartProps } from './chartTypes'

const props = defineProps<EventChartProps>()

const option = computed<EChartsOption>(() => {
  const rows = props.result?.cumulativeSeries.filter((row) => row.groupName === '当前周期') ?? []

  return {
    color: ['#d03050', '#2080f0'],
    grid: { top: 44, right: 24, bottom: 30, left: 58 },
    legend: { top: 8, show: props.config.showLegend },
    tooltip: { trigger: 'axis', show: props.config.showTooltip },
    xAxis: { type: 'category', boundaryGap: false, data: rows.map((row) => row.date.slice(5)) },
    yAxis: { type: 'value' },
    series: [
      { name: '当前周期累计', type: 'line', smooth: true, areaStyle: {}, data: rows.map((row) => row.currentValue) },
      { name: '上一周期累计', type: 'line', smooth: true, data: rows.map((row) => row.compareValue) },
    ],
  }
})
</script>

<template>
  <n-spin :show="loading">
    <v-chart v-if="result?.cumulativeSeries.length" class="event-chart" :option="option" autoresize />
    <n-empty v-else description="暂无累积图数据" />
  </n-spin>
</template>

<style scoped lang="scss">
.event-chart {
  width: 100%;
  height: 320px;
}
</style>
