<script setup lang="ts">
import type { EventAnalysisDetailRow } from '@/types/eventAnalysis'
import type { EventChartProps } from './chartTypes'
import EventBarChart from './EventBarChart.vue'
import EventCumulativeChart from './EventCumulativeChart.vue'
import EventDonutChart from './EventDonutChart.vue'
import EventDualAxisChart from './EventDualAxisChart.vue'
import EventLineChart from './EventLineChart.vue'
import EventPercentageChart from './EventPercentageChart.vue'
import EventPieChart from './EventPieChart.vue'
import EventStackedChart from './EventStackedChart.vue'

defineProps<EventChartProps>()

const emit = defineEmits<{
  'select-anomaly': [date: string]
  'filter-detail': [field: string, value: string]
  'open-users': [row: EventAnalysisDetailRow]
}>()
</script>

<template>
  <event-line-chart
    v-if="config.chartType === 'line'"
    :result="result"
    :config="config"
    :loading="loading"
    @select-anomaly="emit('select-anomaly', $event)"
  />
  <event-stacked-chart
    v-else-if="config.chartType === 'stacked'"
    :result="result"
    :config="config"
    :loading="loading"
  />
  <event-bar-chart
    v-else-if="config.chartType === 'bar'"
    :result="result"
    :config="config"
    :loading="loading"
    @filter-detail="(field, value) => emit('filter-detail', field, value)"
  />
  <event-dual-axis-chart
    v-else-if="config.chartType === 'dual_axis'"
    :result="result"
    :config="config"
    :loading="loading"
  />
  <event-donut-chart
    v-else-if="config.chartType === 'donut'"
    :result="result"
    :config="config"
    :loading="loading"
    @filter-detail="(field, value) => emit('filter-detail', field, value)"
  />
  <event-pie-chart
    v-else-if="config.chartType === 'pie'"
    :result="result"
    :config="config"
    :loading="loading"
    @filter-detail="(field, value) => emit('filter-detail', field, value)"
  />
  <event-percentage-chart
    v-else-if="config.chartType === 'percentage'"
    :result="result"
    :config="config"
    :loading="loading"
  />
  <event-cumulative-chart
    v-else-if="config.chartType === 'cumulative'"
    :result="result"
    :config="config"
    :loading="loading"
  />
  <event-cumulative-chart v-else :result="result" :config="config" :loading="loading" />
</template>
