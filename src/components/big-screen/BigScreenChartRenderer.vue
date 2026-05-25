<script setup lang="ts">
import '@/components/charts/chartRegister'
import { computed } from 'vue'
import type { CSSProperties } from 'vue'
import VChart from 'vue-echarts'
import type { BigScreenComponent, BigScreenFilterConfig } from '@/types/bigScreen'
import { adaptBigScreenChartData } from './chartDataAdapter'
import { buildBigScreenChartOption } from './chartOptionFactory'

const props = withDefaults(
  defineProps<{
    component: BigScreenComponent
    scale?: number
    runtimeFilters?: BigScreenFilterConfig[]
  }>(),
  {
    scale: 1,
    runtimeFilters: () => [],
  },
)

const emit = defineEmits<{
  chartClick: [payload: Record<string, unknown>]
}>()

const nonEChartTypes = new Set([
  'metricCard',
  'flipNumber',
  'rankingList',
  'table',
  'singleValueDonut',
  'wordCloud',
  'circleView',
  'waterWave',
])

const dataView = computed(() => adaptBigScreenChartData(props.component, props.runtimeFilters))
const chartRows = computed(() => dataView.value.rows)
const dimensionRows = computed(() => dataView.value.dimensionRows)

const colors = computed<string[]>(() =>
  Array.isArray(props.component.style.colorScheme)
    ? props.component.style.colorScheme as string[]
    : ['#38bdf8', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'],
)

const chartOption = computed(() => buildBigScreenChartOption(props.component, dataView.value))

const chartState = computed(() => {
  if (props.component.layout.width < 120 || props.component.layout.height < 80) {
    return {
      type: 'warning',
      title: '组件尺寸过小',
      description: '请放大组件或使用自动布局重新整理',
    }
  }

  const error = dataView.value.diagnostics.find((item) => item.severity === 'error')
  if (error) {
    return {
      type: 'error',
      title: '字段配置异常',
      description: error.message,
    }
  }

  const warning = dataView.value.diagnostics.find((item) => item.code === 'empty-data')
  if (warning) {
    return {
      type: 'warning',
      title: '暂无数据',
      description: warning.message,
    }
  }

  return null
})

const primaryValue = computed(() =>
  dimensionRows.value.reduce((sum, row) => sum + row.value, 0),
)

const tableRows = computed(() => dimensionRows.value.slice(0, Number(props.component.style.scrollRows ?? 6)))

const rankingRows = computed(() =>
  [...dimensionRows.value]
    .sort((left, right) => right.value - left.value)
    .slice(0, 6),
)

const getFieldNumber = (slot: string, fallback: string, fallbackValue = 0): number => {
  const row = chartRows.value[0] ?? {}
  const fieldName = dataView.value.fields[slot] ?? fallback
  return Number(row[fieldName] ?? row[fallback] ?? fallbackValue)
}

const singleValuePercent = computed(() => {
  const value = getFieldNumber('value', 'value')
  const max = Math.max(1, getFieldNumber('max', 'target', Number(props.component.style.max ?? 100)))
  return Math.max(0, Math.min(100, (value / max) * 100))
})

const metricValue = computed(() => {
  if (props.component.type === 'flipNumber') {
    return Number(chartRows.value[0]?.[dataView.value.fields.measure ?? 'value'] ?? primaryValue.value).toLocaleString('zh-CN')
  }
  return primaryValue.value.toLocaleString('zh-CN')
})

const waterPercent = computed(() => {
  const raw = getFieldNumber('value', 'value')
  const max = Number(props.component.style.max ?? 1)
  return Math.max(0, Math.min(100, (raw / max) * 100))
})

const wordRows = computed(() =>
  dimensionRows.value.slice(0, 12).map((row, index) => ({
    ...row,
    size: Math.max(16, Math.min(42, 16 + row.value / 520)),
    color: colors.value[index % colors.value.length],
  })),
)

const circleRows = computed(() => {
  const max = Math.max(1, ...dimensionRows.value.map((row) => row.value))
  return dimensionRows.value.slice(0, 8).map((row, index) => ({
    ...row,
    size: 48 + (row.value / max) * 86,
    color: colors.value[index % colors.value.length],
  }))
})

const rootStyle = computed<CSSProperties>(() => ({
  '--chart-scale': props.scale,
} as CSSProperties))

const shouldShowState = computed(() =>
  Boolean(chartState.value) && (!nonEChartTypes.has(props.component.type) || chartState.value?.type === 'error'),
)

const handleChartClick = (params: unknown): void => {
  const eventParams = params as {
    name?: string
    value?: unknown
    data?: unknown
    seriesName?: string
    dataIndex?: number
  }

  emit('chartClick', {
    name: eventParams.name,
    value: eventParams.value,
    data: eventParams.data,
    seriesName: eventParams.seriesName,
    dataIndex: eventParams.dataIndex,
  })
}
</script>

<template>
  <div class="chart-renderer" :style="rootStyle">
    <div v-if="shouldShowState && chartState" :class="['chart-state', chartState.type]">
      <strong>{{ chartState.title }}</strong>
      <span>{{ chartState.description }}</span>
    </div>

    <template v-else-if="component.type === 'metricCard'">
      <div class="metric-card" :style="{ borderColor: String(component.style.color ?? colors[0]) }">
        <span>{{ component.style.mainLabel ?? component.style.title ?? component.name }}</span>
        <strong>{{ metricValue }}{{ component.style.suffix ?? '' }}</strong>
        <small>{{ component.style.trendLabel ?? '较上期持平' }}</small>
      </div>
    </template>

    <template v-else-if="component.type === 'flipNumber'">
      <div class="flip-number">
        <span>{{ component.style.prefix }}</span>
        <strong>{{ metricValue }}</strong>
        <span>{{ component.style.suffix }}</span>
      </div>
    </template>

    <template v-else-if="component.type === 'rankingList'">
      <div class="ranking-list">
        <div v-for="(row, index) in rankingRows" :key="row.category" class="ranking-row">
          <b>{{ index + 1 }}</b>
          <span>{{ row.category }}</span>
          <i><em :style="{ width: `${Math.min(100, row.value / Math.max(1, rankingRows[0]?.value ?? 1) * 100)}%` }" /></i>
          <strong>{{ row.value.toLocaleString('zh-CN') }}</strong>
        </div>
      </div>
    </template>

    <template v-else-if="component.type === 'table'">
      <table class="chart-table">
        <thead>
          <tr>
            <th v-if="component.style.rowNumberVisible">#</th>
            <th>维度</th>
            <th>指标</th>
            <th>对比</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in tableRows" :key="`${row.category}-${index}`">
            <td v-if="component.style.rowNumberVisible">{{ index + 1 }}</td>
            <td>{{ row.category }}</td>
            <td>{{ row.value.toLocaleString('zh-CN') }}</td>
            <td>{{ row.compareValue.toLocaleString('zh-CN') }}</td>
          </tr>
        </tbody>
      </table>
    </template>

    <template v-else-if="component.type === 'singleValueDonut'">
      <div class="single-donut">
        <div class="donut-ring" :style="{ background: `conic-gradient(${colors[0]} ${singleValuePercent}%, rgba(148, 163, 184, 0.18) 0)` }">
          <div>
            <strong>{{ Math.round(singleValuePercent) }}{{ component.style.suffix ?? '%' }}</strong>
            <span>{{ component.style.centerLabel ?? component.name }}</span>
          </div>
        </div>
      </div>
    </template>

    <template v-else-if="component.type === 'wordCloud'">
      <div class="word-cloud">
        <span v-for="word in wordRows" :key="word.category" :style="{ fontSize: `${word.size}px`, color: word.color }">
          {{ word.category }}
        </span>
      </div>
    </template>

    <template v-else-if="component.type === 'circleView'">
      <div class="circle-view">
        <span
          v-for="circle in circleRows"
          :key="circle.category"
          :style="{ width: `${circle.size}px`, height: `${circle.size}px`, background: `${circle.color}55`, borderColor: circle.color }"
        >
          {{ circle.category }}
        </span>
      </div>
    </template>

    <template v-else-if="component.type === 'waterWave'">
      <div class="water-wave">
        <div class="water-circle">
          <div class="water-fill" :style="{ height: `${waterPercent}%`, background: colors[0] }" />
          <strong>{{ Math.round(waterPercent) }}{{ component.style.unit ?? '%' }}</strong>
        </div>
        <span>{{ component.style.title ?? component.name }}</span>
      </div>
    </template>

    <template v-else>
      <div class="echart-title">{{ component.style.title || component.name }}</div>
      <VChart class="echart" :option="chartOption" autoresize @click="handleChartClick" />
    </template>
  </div>
</template>

<style scoped lang="scss">
.chart-renderer {
  position: relative;
  width: 100%;
  height: 100%;
  color: #e2e8f0;
}

.chart-state {
  width: 100%;
  height: 100%;
  display: grid;
  place-content: center;
  gap: 6px;
  box-sizing: border-box;
  padding: 16px;
  border: 1px dashed rgba(148, 163, 184, 0.38);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.72);
  text-align: center;
}

.chart-state strong {
  color: #f8fafc;
  font-size: calc(14px * var(--chart-scale));
}

.chart-state span {
  color: #94a3b8;
  font-size: calc(12px * var(--chart-scale));
}

.chart-state.error {
  border-color: rgba(248, 113, 113, 0.62);
}

.chart-state.error strong {
  color: #fecaca;
}

.echart {
  width: 100%;
  height: 100%;
}

.echart-title {
  position: absolute;
  top: 6px;
  left: 8px;
  z-index: 1;
  max-width: calc(100% - 16px);
  overflow: hidden;
  color: #e2e8f0;
  font-size: calc(14px * var(--chart-scale));
  text-overflow: ellipsis;
  white-space: nowrap;
  pointer-events: none;
}

.metric-card,
.flip-number {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
  padding: calc(22px * var(--chart-scale));
  border: 1px solid #38bdf8;
  border-radius: 8px;
  background: rgba(8, 17, 31, 0.82);
}

.metric-card span,
.metric-card small,
.flip-number span {
  color: #9fb7d1;
}

.metric-card strong,
.flip-number strong {
  color: #f8fafc;
  font-size: calc(34px * var(--chart-scale));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.flip-number {
  flex-direction: row;
  align-items: center;
}

.flip-number strong {
  padding: 8px 12px;
  border-radius: 6px;
  background: rgba(56, 189, 248, 0.16);
  font-variant-numeric: tabular-nums;
}

.ranking-list {
  width: 100%;
  height: 100%;
  display: grid;
  align-content: center;
  gap: 10px;
  padding: 16px;
  box-sizing: border-box;
}

.ranking-row {
  display: grid;
  grid-template-columns: 26px minmax(54px, 76px) minmax(0, 1fr) minmax(58px, 82px);
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.ranking-row span,
.ranking-row strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ranking-row b {
  color: #38bdf8;
}

.ranking-row i {
  height: 8px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.2);
  overflow: hidden;
}

.ranking-row em {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #38bdf8;
}

.ranking-row strong {
  text-align: right;
  color: #f8fafc;
}

.chart-table {
  width: 100%;
  height: 100%;
  border-collapse: collapse;
  background: rgba(15, 23, 42, 0.78);
  color: #e2e8f0;
  table-layout: fixed;
}

.chart-table th,
.chart-table td {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chart-table th {
  background: rgba(56, 189, 248, 0.14);
  color: #bae6fd;
}

.single-donut,
.word-cloud,
.circle-view,
.water-wave {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.donut-ring {
  width: min(72%, 210px);
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border-radius: 50%;
}

.donut-ring > div {
  width: 64%;
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #08111f;
}

.donut-ring strong {
  color: #f8fafc;
  font-size: 28px;
}

.donut-ring span {
  color: #94a3b8;
}

.word-cloud {
  flex-wrap: wrap;
  align-content: center;
  gap: 12px 16px;
  padding: 16px;
  box-sizing: border-box;
  overflow: hidden;
}

.circle-view {
  flex-wrap: wrap;
  gap: 12px;
  padding: 16px;
  box-sizing: border-box;
  overflow: hidden;
}

.circle-view span {
  display: grid;
  place-items: center;
  border: 1px solid;
  border-radius: 50%;
  color: #f8fafc;
  font-size: 13px;
}

.water-wave {
  flex-direction: column;
  gap: 12px;
}

.water-circle {
  position: relative;
  width: min(70%, 180px);
  aspect-ratio: 1;
  overflow: hidden;
  display: grid;
  place-items: center;
  border: 1px solid rgba(56, 189, 248, 0.6);
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.82);
}

.water-fill {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0.58;
}

.water-circle strong {
  position: relative;
  z-index: 1;
  color: #f8fafc;
  font-size: 30px;
}
</style>
