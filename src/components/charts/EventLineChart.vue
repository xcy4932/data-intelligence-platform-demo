<script setup lang="ts">
import './chartRegister'
import type { EChartsOption } from 'echarts'
import { NEmpty, NSpin } from 'naive-ui'
import { computed, ref } from 'vue'
import VChart from 'vue-echarts'
import type { ChartClickParams, EventChartProps } from './chartTypes'

const props = defineProps<EventChartProps>()
const zoomResetVersion = ref(0)

const emit = defineEmits<{
  'select-anomaly': [date: string]
}>()

const option = computed<EChartsOption>(() => {
  const trend = props.result?.metricTrend ?? []
  const cards = props.result?.metricCards ?? []
  const selectedMetricIds = props.config.selectedMetricIds.length
    ? props.config.selectedMetricIds
    : cards.map((card) => card.metricId)
  const selectedCards = selectedMetricIds
    .map((metricId) => cards.find((card) => card.metricId === metricId))
    .filter((card): card is NonNullable<typeof card> => Boolean(card))
  const baseCard = cards.find((card) => card.metricId === 'metric_ad_watch_pv') ?? selectedCards[0]
  const currentBaseValue = Math.max(baseCard?.value ?? 1, 1)
  const actualSeries = selectedCards.map((card, index) => {
    const ratio = card.value / currentBaseValue

    return {
      name: card.metricName,
      type: 'line' as const,
      smooth: true,
      symbolSize: 7,
      data: trend.map((point) =>
        Number((point.actualValue * ratio).toFixed(card.precision > 0 ? card.precision : 0)),
      ),
      markPoint:
        index === 0 && props.config.showAnomalyPoint
          ? {
              symbolSize: 48,
              label: { formatter: '异常' },
              data: trend
                .filter((point) => point.isAnomaly)
                .map((point) => ({
                  name: point.anomalyLevel ?? '异常',
                  coord: [point.date.slice(5), Number((point.actualValue * ratio).toFixed(0))],
                  value: Number((point.actualValue * ratio).toFixed(0)),
                  itemStyle: { color: '#d03050' },
                })),
            }
          : undefined,
      label: { show: props.config.showDataLabel },
    }
  })
  const showReferenceSeries = selectedCards.length <= 1

  return {
    color: ['#d03050', '#2080f0', '#18a058', '#c2c8d1', '#c2c8d1'],
    grid: { top: 44, right: 24, bottom: 72, left: 58 },
    legend: { top: 8, right: 12, show: props.config.showLegend },
    tooltip: { trigger: 'axis', show: props.config.showTooltip },
    dataZoom: [
      { id: `inside-${zoomResetVersion.value}`, type: 'inside', xAxisIndex: 0, filterMode: 'none', start: 0, end: 100 },
      { id: `slider-${zoomResetVersion.value}`, type: 'slider', xAxisIndex: 0, height: 22, bottom: 18, filterMode: 'none', start: 0, end: 100 },
    ],
    xAxis: { type: 'category', boundaryGap: false, data: trend.map((point) => point.date.slice(5)) },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#edf0f5' } } },
    series: [
      ...actualSeries,
      {
        name: '上一周期',
        type: 'line' as const,
        smooth: true,
        symbol: 'none',
        data: props.config.showCompareLine && showReferenceSeries ? trend.map((point) => point.compareValue) : [],
      },
      {
        name: '预测参考',
        type: 'line' as const,
        smooth: true,
        symbol: 'none',
        data: props.config.showPredictionBand && showReferenceSeries ? trend.map((point) => point.expectedValue ?? null) : [],
      },
      {
        name: '预测上界',
        type: 'line' as const,
        smooth: true,
        symbol: 'none',
        lineStyle: { type: 'dashed' },
        data: props.config.showPredictionBand && showReferenceSeries ? trend.map((point) => point.upperBound ?? null) : [],
      },
      {
        name: '预测下界',
        type: 'line' as const,
        smooth: true,
        symbol: 'none',
        lineStyle: { type: 'dashed' },
        data: props.config.showPredictionBand && showReferenceSeries ? trend.map((point) => point.lowerBound ?? null) : [],
      },
    ],
  }
})

const handleClick = (params: ChartClickParams): void => {
  const anomaly = props.result?.anomalyPoints[params.dataIndex ?? -1]

  if (params.componentType === 'markPoint') {
    emit('select-anomaly', anomaly?.date ?? '2026-05-15')
  }
}

const handleDoubleClick = (): void => {
  zoomResetVersion.value += 1
}
</script>

<template>
  <n-spin :show="loading">
    <v-chart
      v-if="result?.metricTrend.length"
      class="event-chart"
      :option="option"
      autoresize
      @click="handleClick"
      @dblclick="handleDoubleClick"
    />
    <n-empty v-else description="当前条件下暂无图表数据，请调整时间范围或筛选条件。" />
  </n-spin>
</template>

<style scoped lang="scss">
.event-chart {
  width: 100%;
  height: 320px;
}
</style>
