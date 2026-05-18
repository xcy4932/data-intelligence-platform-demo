<script setup lang="ts">
import './chartRegister'
import type { EChartsOption } from 'echarts'
import { NEmpty, NSpin } from 'naive-ui'
import { computed } from 'vue'
import VChart from 'vue-echarts'
import type { EventChartProps } from './chartTypes'

const props = defineProps<EventChartProps>()

const option = computed<EChartsOption>(() => {
  const trend = props.result?.metricTrend ?? []
  const cards = props.result?.metricCards ?? []
  const firstType: 'line' | 'bar' = props.config.dualAxisRenderMode === 'line_line' ? 'line' : 'bar'
  const secondType: 'line' | 'bar' = props.config.dualAxisRenderMode === 'bar_bar' ? 'bar' : 'line'
  const leftMetricIds = props.config.leftAxisMetricIds?.length
    ? props.config.leftAxisMetricIds
    : props.config.selectedMetricIds.slice(0, 1)
  const rightMetricIds = props.config.rightAxisMetricIds?.length
    ? props.config.rightAxisMetricIds
    : props.config.selectedMetricIds.slice(1, 2)
  const baseCard = cards.find((card) => card.metricId === 'metric_ad_watch_pv') ?? cards[0]
  const currentBaseValue = Math.max(baseCard?.value ?? 1, 1)
  const buildMetricSeries = (metricId: string, axisIndex: 0 | 1) => {
    const card = cards.find((item) => item.metricId === metricId)
    const ratio = (card?.value ?? currentBaseValue) / currentBaseValue

    return {
      name: card?.metricName ?? metricId,
      type: axisIndex === 0 ? firstType : secondType,
      yAxisIndex: axisIndex,
      data: trend.map((point) =>
        Number((point.actualValue * ratio).toFixed(card && card.precision > 0 ? card.precision : 0)),
      ),
      label: { show: props.config.showDataLabel },
    }
  }

  return {
    color: ['#2080f0', '#18a058', '#d03050', '#f0a020'],
    grid: { top: 44, right: 58, bottom: 30, left: 58 },
    legend: { top: 8, show: props.config.showLegend },
    tooltip: { trigger: 'axis', show: props.config.showTooltip },
    xAxis: { type: 'category', data: trend.map((row) => row.date.slice(5)) },
    yAxis: [
      { type: 'value', name: '主坐标轴' },
      { type: 'value', name: '次坐标轴', axisLabel: { formatter: '{value}' } },
    ],
    series: [
      ...leftMetricIds.map((metricId) => buildMetricSeries(metricId, 0)),
      ...rightMetricIds.map((metricId) => buildMetricSeries(metricId, 1)),
    ],
  }
})
</script>

<template>
  <n-spin :show="loading">
    <v-chart v-if="result?.metricTrend.length" class="event-chart" :option="option" autoresize />
    <n-empty v-else description="暂无双轴图数据" />
  </n-spin>
</template>

<style scoped lang="scss">
.event-chart {
  width: 100%;
  height: 320px;
}
</style>
