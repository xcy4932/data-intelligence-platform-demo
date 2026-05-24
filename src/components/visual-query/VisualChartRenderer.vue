<script setup lang="ts">
import '@/components/charts/chartRegister'
import { computed, ref } from 'vue'
import { registerMap } from 'echarts/core'
import type { EChartsOption } from 'echarts'
import VChart from 'vue-echarts'
import { NEmpty, NTag } from 'naive-ui'
import type { QueryResult, QueryResultColumn, VisualQueryState } from '@/types/visualAnalysis'

type QueryRow = Record<string, string | number | boolean | null>
type ChartParam = {
  name?: string
  value?: unknown
  data?: { row?: QueryRow, name?: string, value?: unknown }
  seriesName?: string
}

const props = defineProps<{
  result: QueryResult | null
  state: VisualQueryState
}>()

const emit = defineEmits<{
  annotate: [payload: { label: string, value: string | number }]
  editAnnotation: [id: string]
  moveAnnotation: [payload: { id: string, x: number, y: number }]
}>()

const demoChinaMap = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { name: '四川' }, geometry: { type: 'Polygon', coordinates: [[[0.4, 4.2], [2.8, 3.5], [4.2, 4.8], [3.2, 6.8], [1.0, 6.4], [0.4, 4.2]]] } },
    { type: 'Feature', properties: { name: '北京' }, geometry: { type: 'Polygon', coordinates: [[[5.7, 1.4], [6.8, 1.2], [7.3, 2.1], [6.2, 2.6], [5.5, 2.0], [5.7, 1.4]]] } },
    { type: 'Feature', properties: { name: '江苏' }, geometry: { type: 'Polygon', coordinates: [[[6.3, 3.0], [8.2, 2.8], [8.9, 4.4], [7.2, 5.1], [6.1, 4.2], [6.3, 3.0]]] } },
    { type: 'Feature', properties: { name: '上海' }, geometry: { type: 'Polygon', coordinates: [[[8.6, 4.6], [9.4, 4.8], [9.3, 5.5], [8.5, 5.4], [8.6, 4.6]]] } },
    { type: 'Feature', properties: { name: '浙江' }, geometry: { type: 'Polygon', coordinates: [[[6.6, 5.1], [8.5, 5.4], [8.2, 7.2], [6.5, 6.9], [5.9, 5.8], [6.6, 5.1]]] } },
    { type: 'Feature', properties: { name: '广东' }, geometry: { type: 'Polygon', coordinates: [[[4.0, 7.3], [6.5, 7.0], [7.3, 8.5], [4.8, 9.1], [3.6, 8.2], [4.0, 7.3]]] } },
  ],
}

registerMap('demo-china', demoChinaMap as Parameters<typeof registerMap>[1])

const rows = computed(() => props.result?.rows ?? [])
const columns = computed(() => props.result?.columns ?? [])
const dimensionColumns = computed(() => columns.value.filter((column) => column.fieldType === 'dimension'))
const measureColumns = computed(() => columns.value.filter((column) => column.fieldType === 'measure'))
const primaryDimension = computed(() => dimensionColumns.value[0] ?? columns.value[0])
const secondaryDimension = computed(() => dimensionColumns.value[1] ?? dimensionColumns.value[0])
const tertiaryDimension = computed(() => dimensionColumns.value[2] ?? secondaryDimension.value)
const primaryMeasure = computed(() => measureColumns.value[0] ?? columns.value.find((column) => column.dataType === 'number'))
const secondaryMeasure = computed(() => measureColumns.value[1] ?? measureColumns.value[0])
const paletteColors = computed(() => props.state.palette?.colors.length ? props.state.palette.colors : ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#0891b2', '#7c3aed'])
const chartType = computed(() => props.state.chart.type)
const chartRows = computed(() => {
  const filtered = rows.value.filter((row) => labelValue(row) !== props.state.analysis.total.displayName)
  return filtered.length ? filtered : rows.value
})
const chartLabels = computed(() => chartRows.value.map((row) => labelValue(row)))
const values = computed(() => chartRows.value.map((row) => numericValue(row, primaryMeasure.value)))
const secondValues = computed(() => chartRows.value.map((row) => numericValue(row, secondaryMeasure.value)))
const maxValue = computed(() => Math.max(...values.value.map(Math.abs), ...secondValues.value.map(Math.abs), 1))
const totalValue = computed(() => values.value.reduce((sum, value) => sum + value, 0))
const latestValue = computed(() => values.value.at(-1) ?? values.value[0] ?? 0)
const targetValue = computed(() => {
  const configured = props.state.chart.gauge?.targetValue
  if (configured && configured > 0) return configured
  return secondValues.value[0] || maxValue.value
})

const hoveredRow = ref<QueryRow | null>(null)
const tooltipPosition = ref({ x: 0, y: 0 })

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'number') return formatMetric(value)
  return String(value)
}

function formatMetric(value: unknown): string {
  const number = Number(value)
  if (!Number.isFinite(number)) return '-'
  if (Math.abs(number) >= 100000000) return `${(number / 100000000).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}亿`
  if (Math.abs(number) >= 10000) return `${(number / 10000).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}万`
  if (Math.abs(number) > 0 && Math.abs(number) < 1) return `${(number * 100).toFixed(1)}%`
  return number.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

function rawValue(row: QueryRow, column?: QueryResultColumn): string | number {
  if (!column) return 0
  const value = row[column.name]
  return typeof value === 'number' ? value : String(value ?? '')
}

function numericValue(row: QueryRow, column?: QueryResultColumn): number {
  return Number(rawValue(row, column) || 0)
}

function labelValue(row: QueryRow, column = primaryDimension.value): string {
  return String(rawValue(row, column) || '总计')
}

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] ?? char))
}

function tooltipHtml(row?: QueryRow | null): string {
  if (!row) return ''
  const title = labelValue(row)
  const selectedColumns = props.state.tooltip.displayFields.length
    ? columns.value.filter((column) => props.state.tooltip.displayFields.includes(column.fieldId))
    : [...dimensionColumns.value.slice(0, 2), ...measureColumns.value.slice(0, 4)]
  const lines = selectedColumns.map((column) => `
    <div class="visual-tooltip-row">
      <span>${escapeHtml(column.displayName)}</span>
      <strong>${escapeHtml(formatCell(row[column.name]))}</strong>
    </div>
  `).join('')
  const custom = props.state.tooltip.customText ? `<p>${escapeHtml(props.state.tooltip.customText)}</p>` : ''
  return `<div class="visual-tooltip"><h4>${escapeHtml(title)}</h4>${lines}${custom}</div>`
}

function echartsTooltipFormatter(params: unknown): string {
  const list = Array.isArray(params) ? params as ChartParam[] : [params as ChartParam]
  const row = list.find((item) => item.data?.row)?.data?.row
  if (row) return tooltipHtml(row)
  const title = list[0]?.name ?? ''
  const lines = list.map((item) => `
    <div class="visual-tooltip-row">
      <span>${escapeHtml(item.seriesName ?? '')}</span>
      <strong>${escapeHtml(formatCell(Array.isArray(item.value) ? item.value.at(-1) : item.value))}</strong>
    </div>
  `).join('')
  return `<div class="visual-tooltip"><h4>${escapeHtml(title)}</h4>${lines}</div>`
}

function resolvedTooltipTrigger(defaultTrigger: 'axis' | 'item'): 'axis' | 'item' {
  if (defaultTrigger === 'item') return 'item'
  if (props.state.tooltip.trigger === 'item') return 'item'
  return 'axis'
}

function baseOption(trigger: 'axis' | 'item' = 'axis'): EChartsOption {
  return {
    color: paletteColors.value,
    animationDuration: 420,
    tooltip: {
      show: props.state.tooltip.enabled,
      trigger: resolvedTooltipTrigger(trigger),
      confine: true,
      appendToBody: true,
      formatter: echartsTooltipFormatter,
    },
    legend: {
      show: props.state.chart.style.showLegend,
      top: 0,
      type: 'scroll',
    },
  }
}

function seriesData(column: QueryResultColumn | undefined, sourceRows = chartRows.value): Array<{ name: string, value: number, row: QueryRow }> {
  return sourceRows.map((row) => ({ name: labelValue(row), value: numericValue(row, column), row }))
}

function markLine(): Record<string, unknown> | undefined {
  const line = props.state.analysis.referenceLines.find((item) => item.enabled)
  if (!line) return undefined
  return {
    silent: true,
    symbol: 'none',
    label: { formatter: line.label || '参考线' },
    lineStyle: { type: line.lineType, color: '#dc2626', width: 1.5 },
    data: [{ type: line.type === 'constant' ? undefined : line.type, yAxis: line.type === 'constant' ? line.value : undefined }],
  }
}

function cartesianOption(horizontal = false): EChartsOption {
  const measures = measureColumns.value.slice(0, 6)
  const option: EChartsOption = {
    ...baseOption('axis'),
    grid: { top: 56, right: 28, bottom: horizontal ? 34 : 72, left: horizontal ? 118 : 58, containLabel: true },
    dataZoom: chartRows.value.length > 12 ? [{ type: 'inside' }, { type: 'slider', height: 18, bottom: 8 }] : undefined,
    xAxis: horizontal ? { type: 'value' } : { type: 'category', data: chartLabels.value, axisLabel: { rotate: chartLabels.value.length > 8 ? 28 : 0 } },
    yAxis: horizontal ? { type: 'category', data: chartLabels.value, inverse: true } : { type: 'value' },
    series: measures.map((measure, index) => ({
      name: measure.displayName,
      type: 'bar',
      stack: props.state.chart.style.stack ? 'total' : undefined,
      barMaxWidth: 34,
      label: { show: props.state.chart.style.showLabel, formatter: ({ value }: { value: unknown }) => formatMetric(value) },
      markLine: index === 0 ? markLine() : undefined,
      data: seriesData(measure),
    })),
  }
  return option
}

function lineOption(area = false): EChartsOption {
  return {
    ...baseOption('axis'),
    grid: { top: 56, right: 28, bottom: 64, left: 58, containLabel: true },
    dataZoom: chartRows.value.length > 12 ? [{ type: 'inside' }, { type: 'slider', height: 18, bottom: 8 }] : undefined,
    xAxis: { type: 'category', data: chartLabels.value, boundaryGap: false },
    yAxis: { type: 'value' },
    series: measureColumns.value.slice(0, 6).map((measure, index) => ({
      name: measure.displayName,
      type: 'line',
      smooth: props.state.chart.style.smooth,
      areaStyle: area ? { opacity: 0.16 } : undefined,
      symbolSize: 7,
      label: { show: props.state.chart.style.showLabel },
      markLine: index === 0 ? markLine() : undefined,
      data: seriesData(measure),
    })),
  }
}

function dualAxisOption(combo = false): EChartsOption {
  return {
    ...baseOption('axis'),
    grid: { top: 56, right: 64, bottom: 64, left: 58, containLabel: true },
    dataZoom: chartRows.value.length > 12 ? [{ type: 'inside' }] : undefined,
    xAxis: { type: 'category', data: chartLabels.value },
    yAxis: [
      { type: 'value', name: primaryMeasure.value?.displayName },
      { type: 'value', name: secondaryMeasure.value?.displayName },
    ],
    series: [
      {
        name: primaryMeasure.value?.displayName,
        type: combo ? 'bar' : 'line',
        barMaxWidth: 28,
        data: seriesData(primaryMeasure.value),
      },
      {
        name: secondaryMeasure.value?.displayName,
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        data: seriesData(secondaryMeasure.value),
      },
    ],
  }
}

function pieOption(): EChartsOption {
  return {
    ...baseOption('item'),
    series: [{
      name: primaryMeasure.value?.displayName,
      type: 'pie',
      radius: ['42%', '70%'],
      center: ['42%', '54%'],
      avoidLabelOverlap: true,
      label: { show: props.state.chart.style.showLabel, formatter: '{b}\n{d}%' },
      data: seriesData(primaryMeasure.value, chartRows.value.slice(0, 12)),
    }],
  }
}

function mapOption(): EChartsOption {
  return {
    ...baseOption('item'),
    visualMap: {
      min: 0,
      max: maxValue.value,
      left: 12,
      bottom: 12,
      inRange: { color: ['#dbeafe', '#2563eb'] },
      text: ['高', '低'],
    },
    series: [{
      name: primaryMeasure.value?.displayName,
      type: 'map',
      map: 'demo-china',
      layoutCenter: ['52%', '54%'],
      layoutSize: '82%',
      roam: true,
      selectedMode: 'single',
      emphasis: { label: { show: true } },
      itemStyle: { borderColor: '#ffffff', borderWidth: 1.2 },
      label: { show: true, color: '#344054' },
      data: chartRows.value.map((row) => ({ name: labelValue(row), value: numericValue(row, primaryMeasure.value), row })),
    }],
  }
}

function scatterOption(bubble = false): EChartsOption {
  const data = chartRows.value.slice(0, 80).map((row, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(chartRows.value.length, 1)
    return bubble
      ? { name: labelValue(row), value: [Math.cos(angle) * 100, Math.sin(angle) * 100, numericValue(row, primaryMeasure.value)], row }
      : { name: labelValue(row), value: [numericValue(row, primaryMeasure.value), numericValue(row, secondaryMeasure.value), numericValue(row, measureColumns.value[2]) || numericValue(row, primaryMeasure.value)], row }
  })
  return {
    ...baseOption('item'),
    grid: { top: 48, right: 28, bottom: 48, left: 58, containLabel: true },
    xAxis: { show: !bubble, type: 'value', name: bubble ? '' : primaryMeasure.value?.displayName },
    yAxis: { show: !bubble, type: 'value', name: bubble ? '' : secondaryMeasure.value?.displayName },
    series: [{
      name: bubble ? '圆视图' : '散点',
      type: 'scatter',
      symbolSize: (value: number[]) => Math.max(10, Math.min(54, (Number(value[2]) / maxValue.value) * 48)),
      label: { show: bubble, formatter: '{b}', color: '#fff', fontWeight: 700 },
      data,
    }],
  }
}

function histogramOption(): EChartsOption {
  const sorted = [...values.value].sort((a, b) => a - b)
  const min = sorted[0] ?? 0
  const max = sorted.at(-1) ?? min
  const step = Math.max((max - min) / 8, 1)
  const bins = Array.from({ length: 8 }, (_, index) => {
    const from = min + step * index
    const to = index === 7 ? max : from + step
    const count = sorted.filter((value) => value >= from && value <= to).length
    return { label: `${formatMetric(from)}-${formatMetric(to)}`, count }
  })
  return {
    ...baseOption('axis'),
    grid: { top: 40, right: 24, bottom: 72, left: 48 },
    xAxis: { type: 'category', data: bins.map((bin) => bin.label), axisLabel: { rotate: 24 } },
    yAxis: { type: 'value', name: '频次' },
    series: [{ name: '频次', type: 'bar', barMaxWidth: 42, data: bins.map((bin) => bin.count) }],
  }
}

function funnelOption(): EChartsOption {
  const data = seriesData(primaryMeasure.value, chartRows.value.slice(0, 8))
    .sort((left, right) => right.value - left.value)
  return {
    ...baseOption('item'),
    series: [{
      name: primaryMeasure.value?.displayName,
      type: 'funnel',
      left: '12%',
      top: 44,
      bottom: 20,
      width: '76%',
      minSize: '18%',
      maxSize: '92%',
      sort: 'descending',
      gap: 3,
      label: {
        show: true,
        formatter: (params: { name?: string, value?: unknown }) => `${params.name ?? ''}  ${formatMetric(params.value)}`,
      },
      data,
    }],
  }
}

function radarOption(): EChartsOption {
  const sourceRows = chartRows.value.slice(0, 8)
  return {
    ...baseOption('item'),
    radar: {
      radius: '62%',
      indicator: sourceRows.map((row) => ({ name: labelValue(row), max: maxValue.value })),
    },
    series: [{
      name: primaryMeasure.value?.displayName,
      type: 'radar',
      areaStyle: { opacity: 0.16 },
      data: [{
        name: primaryMeasure.value?.displayName,
        value: sourceRows.map((row) => numericValue(row, primaryMeasure.value)),
      }],
    }],
  }
}

function sankeyOption(): EChartsOption {
  const nodeNames = new Set<string>()
  const linkMap = new Map<string, { source: string, target: string, value: number, row: QueryRow }>()
  chartRows.value.forEach((row) => {
    const path = [labelValue(row, primaryDimension.value), labelValue(row, secondaryDimension.value), labelValue(row, tertiaryDimension.value)].filter(Boolean)
    path.forEach((name) => nodeNames.add(name))
    for (let index = 0; index < path.length - 1; index += 1) {
      const source = path[index] ?? ''
      const target = path[index + 1] ?? ''
      const key = `${source}->${target}`
      const current = linkMap.get(key) ?? { source, target, value: 0, row }
      current.value += numericValue(row, primaryMeasure.value)
      linkMap.set(key, current)
    }
  })
  return {
    ...baseOption('item'),
    series: [{
      name: '流向',
      type: 'sankey',
      top: 28,
      bottom: 24,
      left: 16,
      right: 110,
      nodeGap: 12,
      nodeAlign: 'justify',
      emphasis: { focus: 'adjacency' },
      lineStyle: { color: 'gradient', curveness: 0.5 },
      data: Array.from(nodeNames).map((name) => ({ name })),
      links: Array.from(linkMap.values()),
    }],
  }
}

function gaugeOption(): EChartsOption {
  const percent = Math.min((latestValue.value / Math.max(targetValue.value, 1)) * 100, 160)
  return {
    ...baseOption('item'),
    series: [{
      name: primaryMeasure.value?.displayName,
      type: 'gauge',
      min: 0,
      max: 100,
      progress: { show: true, roundCap: true, width: 16 },
      axisLine: { lineStyle: { width: 16 } },
      pointer: { show: props.state.chart.gauge?.showPointer },
      detail: { formatter: `${formatMetric(latestValue.value)}\n{value}%`, fontSize: 20, lineHeight: 30 },
      data: [{ value: Number(percent.toFixed(1)), name: `目标 ${formatMetric(targetValue.value)}` }],
    }],
  }
}

function progressOption(): EChartsOption {
  return {
    ...baseOption('axis'),
    grid: { top: 46, right: 64, bottom: 34, left: 118, containLabel: true },
    xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
    yAxis: { type: 'category', data: chartLabels.value, inverse: true },
    series: [{
      name: '完成率',
      type: 'bar',
      barMaxWidth: 18,
      label: { show: true, formatter: '{c}%' },
      data: chartRows.value.map((row) => ({
        name: labelValue(row),
        value: Number(((numericValue(row, primaryMeasure.value) / Math.max(numericValue(row, secondaryMeasure.value) || targetValue.value, 1)) * 100).toFixed(1)),
        row,
      })),
    }],
  }
}

function waterfallOption(): EChartsOption {
  let total = 0
  const helper: number[] = []
  const positive: Array<number | '-'> = []
  const negative: Array<number | '-'> = []
  chartRows.value.forEach((row) => {
    const value = numericValue(row, primaryMeasure.value)
    if (value >= 0) {
      helper.push(total)
      positive.push(value)
      negative.push('-')
      total += value
    } else {
      helper.push(total + value)
      positive.push('-')
      negative.push(Math.abs(value))
      total += value
    }
  })
  return {
    ...baseOption('axis'),
    grid: { top: 48, right: 28, bottom: 64, left: 58, containLabel: true },
    xAxis: { type: 'category', data: chartLabels.value, axisLabel: { rotate: 24 } },
    yAxis: { type: 'value' },
    series: [
      { name: '占位', type: 'bar', stack: 'waterfall', itemStyle: { borderColor: 'transparent', color: 'transparent' }, emphasis: { disabled: true }, data: helper },
      { name: '增加', type: 'bar', stack: 'waterfall', data: positive },
      { name: '减少', type: 'bar', stack: 'waterfall', data: negative, itemStyle: { color: '#dc2626' } },
    ],
  }
}

function pivotChartOption(): EChartsOption {
  const xLabels = Array.from(new Set(chartRows.value.map((row) => labelValue(row, primaryDimension.value)))).slice(0, 12)
  const seriesNames = Array.from(new Set(chartRows.value.map((row) => labelValue(row, secondaryDimension.value)))).slice(0, 6)
  return {
    ...baseOption('axis'),
    grid: { top: 56, right: 28, bottom: 70, left: 58, containLabel: true },
    xAxis: { type: 'category', data: xLabels },
    yAxis: { type: 'value' },
    series: seriesNames.map((name) => ({
      name,
      type: 'bar',
      stack: props.state.chart.style.stack ? 'pivot' : undefined,
      data: xLabels.map((label) => {
        const matches = chartRows.value.filter((row) => labelValue(row, primaryDimension.value) === label && labelValue(row, secondaryDimension.value) === name)
        return {
          name: label,
          value: matches.reduce((sum, row) => sum + numericValue(row, primaryMeasure.value), 0),
          row: matches[0],
        }
      }),
    })),
  }
}

function biBarOption(): EChartsOption {
  return {
    ...baseOption('axis'),
    grid: { top: 48, right: 40, bottom: 34, left: 110, containLabel: true },
    xAxis: { type: 'value', axisLabel: { formatter: (value: number) => formatMetric(Math.abs(value)) } },
    yAxis: { type: 'category', data: chartLabels.value, inverse: true },
    series: [
      { name: secondaryMeasure.value?.displayName, type: 'bar', stack: 'total', data: chartRows.value.map((row) => ({ name: labelValue(row), value: -numericValue(row, secondaryMeasure.value), row })) },
      { name: primaryMeasure.value?.displayName, type: 'bar', stack: 'total', data: seriesData(primaryMeasure.value) },
    ],
  }
}

const echartsOption = computed<EChartsOption>(() => {
  if (chartType.value === 'column') return cartesianOption(false)
  if (chartType.value === 'bar') return cartesianOption(true)
  if (chartType.value === 'line') return lineOption(false)
  if (chartType.value === 'area') return lineOption(true)
  if (chartType.value === 'dual_axis') return dualAxisOption(false)
  if (chartType.value === 'combo') return dualAxisOption(true)
  if (chartType.value === 'pie') return pieOption()
  if (chartType.value === 'map') return mapOption()
  if (chartType.value === 'scatter') return scatterOption(false)
  if (chartType.value === 'circle_view') return scatterOption(true)
  if (chartType.value === 'histogram') return histogramOption()
  if (chartType.value === 'funnel') return funnelOption()
  if (chartType.value === 'radar') return radarOption()
  if (chartType.value === 'sankey') return sankeyOption()
  if (chartType.value === 'gauge') return gaugeOption()
  if (chartType.value === 'progress') return progressOption()
  if (chartType.value === 'waterfall') return waterfallOption()
  if (chartType.value === 'pivot_chart') return pivotChartOption()
  if (chartType.value === 'bi_bar') return biBarOption()
  if (chartType.value === 'metric_trend') return lineOption(false)
  return cartesianOption(false)
})

const usesEcharts = computed(() =>
  !['table', 'pivot_table', 'trend_table', 'detail_table', 'okr_table', 'metric_card', 'word_cloud', 'sparkline'].includes(chartType.value),
)

const sparkGroups = computed(() => {
  const grouped = new Map<string, Array<{ label: string, value: number }>>()
  chartRows.value.forEach((row) => {
    const group = labelValue(row, secondaryDimension.value)
    const list = grouped.get(group) ?? []
    list.push({ label: labelValue(row), value: numericValue(row, primaryMeasure.value) })
    grouped.set(group, list)
  })
  return Array.from(grouped.entries()).slice(0, 8).map(([name, items]) => ({ name, items }))
})

const pivotColumnLabels = computed(() =>
  Array.from(new Set(chartRows.value.map((row) => labelValue(row, secondaryDimension.value)))).slice(0, 8),
)

const pivotRows = computed(() => {
  const grouped = new Map<string, { name: string, values: Record<string, number>, total: number, row: QueryRow }>()
  chartRows.value.forEach((row) => {
    const rowName = labelValue(row, primaryDimension.value)
    const columnName = labelValue(row, secondaryDimension.value)
    const current = grouped.get(rowName) ?? { name: rowName, values: {}, total: 0, row }
    const value = numericValue(row, primaryMeasure.value)
    current.values[columnName] = (current.values[columnName] ?? 0) + value
    current.total += value
    grouped.set(rowName, current)
  })
  return Array.from(grouped.values()).slice(0, 20)
})

function pointsToText(points: Array<{ x: number, y: number }>): string {
  return points.map((point) => `${point.x},${point.y}`).join(' ')
}

function sparkPoints(items: Array<{ value: number }>): string {
  const max = Math.max(...items.map((item) => item.value), 1)
  return pointsToText(items.map((item, index) => ({
    x: 8 + index * (164 / Math.max(items.length - 1, 1)),
    y: 36 - (item.value / max) * 28,
  })))
}

function wordStyle(row: QueryRow, index: number): Record<string, string> {
  return {
    fontSize: `${14 + (numericValue(row, primaryMeasure.value) / maxValue.value) * 30}px`,
    color: paletteColors.value[index % paletteColors.value.length] ?? '#2563eb',
    transform: `rotate(${index % 5 === 0 ? -8 : index % 4 === 0 ? 8 : 0}deg)`,
  }
}

function showRowTooltip(row: QueryRow, event: MouseEvent): void {
  hoveredRow.value = row
  moveRowTooltip(event)
}

function moveRowTooltip(event: MouseEvent): void {
  const target = event.currentTarget as HTMLElement | null
  const stage = target?.closest('.chart-stage') as HTMLElement | null
  const rect = stage?.getBoundingClientRect()
  tooltipPosition.value = rect
    ? { x: event.clientX - rect.left + 18, y: event.clientY - rect.top + 18 }
    : { x: event.offsetX + 18, y: event.offsetY + 18 }
}

function hideRowTooltip(): void {
  hoveredRow.value = null
}

function emitAnnotation(row: QueryRow): void {
  emit('annotate', {
    label: labelValue(row),
    value: rawValue(row, primaryMeasure.value),
  })
}

function handleChartClick(params: unknown): void {
  const row = (params as ChartParam).data?.row
  if (row) emitAnnotation(row)
}

function moveAnnotation(event: DragEvent, id: string): void {
  const target = event.currentTarget as HTMLElement | null
  const parent = target?.parentElement
  if (!parent) return
  const rect = parent.getBoundingClientRect()
  const x = ((event.clientX - rect.left) / rect.width) * 100
  const y = ((event.clientY - rect.top) / rect.height) * 100
  emit('moveAnnotation', {
    id,
    x: Math.min(92, Math.max(2, x)),
    y: Math.min(88, Math.max(8, y)),
  })
}
</script>

<template>
  <div class="visual-chart-renderer">
    <n-empty v-if="!result || !rows.length" description="当前查询条件下暂无数据" />

    <div v-else class="chart-stage">
      <div class="chart-caption">
        <div>
          <strong>{{ state.chart.title || '可视化图表' }}</strong>
          <span>{{ primaryMeasure?.displayName ?? '记录数' }} · {{ primaryDimension?.displayName ?? '总计' }}</span>
        </div>
        <n-tag v-if="result.sampled" type="warning" :bordered="false">抽样数据</n-tag>
        <n-tag v-else-if="result.cacheHit" type="success" :bordered="false">命中缓存</n-tag>
      </div>

      <table v-if="['table', 'detail_table'].includes(chartType)" class="result-table">
        <thead>
          <tr><th v-for="column in columns" :key="column.name">{{ column.displayName }}</th></tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in rows.slice(0, 30)"
            :key="index"
            @click="emitAnnotation(row)"
            @mouseenter="showRowTooltip(row, $event)"
            @mousemove="moveRowTooltip"
            @mouseleave="hideRowTooltip"
          >
            <td v-for="column in columns" :key="column.name">{{ formatCell(row[column.name]) }}</td>
          </tr>
        </tbody>
      </table>

      <table v-else-if="chartType === 'pivot_table'" class="result-table pivot-table">
        <thead>
          <tr>
            <th>{{ primaryDimension?.displayName ?? '行维度' }}</th>
            <th v-for="columnLabel in pivotColumnLabels" :key="columnLabel">{{ columnLabel }}</th>
            <th>合计</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="pivotRow in pivotRows" :key="pivotRow.name" @click="emitAnnotation(pivotRow.row)" @mouseenter="showRowTooltip(pivotRow.row, $event)" @mousemove="moveRowTooltip" @mouseleave="hideRowTooltip">
            <td>{{ pivotRow.name }}</td>
            <td v-for="columnLabel in pivotColumnLabels" :key="columnLabel">{{ formatMetric(pivotRow.values[columnLabel] ?? 0) }}</td>
            <td>{{ formatMetric(pivotRow.total) }}</td>
          </tr>
        </tbody>
      </table>

      <table v-else-if="chartType === 'trend_table'" class="result-table trend-table">
        <thead>
          <tr>
            <th>时间</th>
            <th v-for="column in measureColumns" :key="column.name">{{ column.displayName }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in rows.slice(0, 24)" :key="index" @click="emitAnnotation(row)" @mouseenter="showRowTooltip(row, $event)" @mousemove="moveRowTooltip" @mouseleave="hideRowTooltip">
            <td>{{ labelValue(row) }}</td>
            <td v-for="column in measureColumns" :key="column.name">{{ formatCell(row[column.name]) }}</td>
          </tr>
        </tbody>
      </table>

      <table v-else-if="chartType === 'okr_table'" class="result-table okr-table">
        <thead>
          <tr><th>目标</th><th>当前值</th><th>目标值</th><th>完成度</th></tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in rows.slice(0, 12)" :key="index" @click="emitAnnotation(row)" @mouseenter="showRowTooltip(row, $event)" @mousemove="moveRowTooltip" @mouseleave="hideRowTooltip">
            <td>{{ labelValue(row) }}</td>
            <td>{{ formatMetric(numericValue(row, primaryMeasure)) }}</td>
            <td>{{ formatMetric(numericValue(row, secondaryMeasure) || targetValue) }}</td>
            <td><div class="inline-progress"><i :style="{ width: `${Math.min((numericValue(row, primaryMeasure) / Math.max(numericValue(row, secondaryMeasure) || targetValue, 1)) * 100, 100)}%` }" /></div></td>
          </tr>
        </tbody>
      </table>

      <button v-else-if="chartType === 'metric_card'" type="button" class="metric-card-preview" @click="emitAnnotation(chartRows[0] ?? {})" @mouseenter="showRowTooltip(chartRows[0] ?? {}, $event)" @mousemove="moveRowTooltip" @mouseleave="hideRowTooltip">
        <span>{{ primaryMeasure?.displayName ?? '指标' }}</span>
        <strong>{{ formatMetric(totalValue || latestValue) }}</strong>
        <small>目标 {{ formatMetric(targetValue) }}</small>
      </button>

      <div v-else-if="chartType === 'word_cloud'" class="word-cloud">
        <button
          v-for="(row, index) in chartRows.slice(0, 48)"
          :key="index"
          type="button"
          :style="wordStyle(row, index)"
          @click="emitAnnotation(row)"
          @mouseenter="showRowTooltip(row, $event)"
          @mousemove="moveRowTooltip"
          @mouseleave="hideRowTooltip"
        >
          {{ labelValue(row) }}
        </button>
      </div>

      <table v-else-if="chartType === 'sparkline'" class="result-table spark-table">
        <thead><tr><th>分组</th><th>迷你趋势</th><th>最新值</th></tr></thead>
        <tbody>
          <tr
            v-for="group in sparkGroups"
            :key="group.name"
            @click="emitAnnotation(chartRows.find((row) => labelValue(row, secondaryDimension) === group.name) ?? chartRows[0] ?? {})"
            @mouseenter="showRowTooltip(chartRows.find((row) => labelValue(row, secondaryDimension) === group.name) ?? chartRows[0] ?? {}, $event)"
            @mousemove="moveRowTooltip"
            @mouseleave="hideRowTooltip"
          >
            <td>{{ group.name }}</td>
            <td><svg viewBox="0 0 180 42" role="img"><polyline :points="sparkPoints(group.items)" fill="none" :stroke="paletteColors[0]" stroke-width="3" /></svg></td>
            <td>{{ formatMetric(group.items.at(-1)?.value ?? 0) }}</td>
          </tr>
        </tbody>
      </table>

      <v-chart v-else-if="usesEcharts" class="echarts-stage" :option="echartsOption" autoresize @click="handleChartClick" />
      <v-chart v-else class="echarts-stage" :option="echartsOption" autoresize @click="handleChartClick" />

      <div
        v-if="state.tooltip.enabled && hoveredRow"
        class="custom-data-tooltip"
        :style="{ left: `${tooltipPosition.x}px`, top: `${tooltipPosition.y}px` }"
        v-html="tooltipHtml(hoveredRow)"
      />

      <button
        v-for="annotation in state.annotations"
        :key="annotation.id"
        type="button"
        class="annotation-card"
        draggable="true"
        :style="{ left: `${annotation.position.x}%`, top: `${annotation.position.y}%` }"
        @click="emit('editAnnotation', annotation.id)"
        @dragend="moveAnnotation($event, annotation.id)"
      >
        {{ annotation.content }}
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.visual-chart-renderer,
.chart-stage {
  min-height: 480px;
}

.chart-stage {
  position: relative;
  overflow: hidden;
  padding: 16px;
  border: 1px solid #d0d5dd;
  border-radius: 8px;
  background: #fff;
}

.chart-caption {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 10px;

  strong,
  span {
    display: block;
  }

  strong {
    font-size: 16px;
  }

  span {
    margin-top: 3px;
    color: #667085;
    font-size: 12px;
  }
}

.echarts-stage {
  width: 100%;
  height: 390px;
}

.result-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;

  th,
  td {
    padding: 9px 10px;
    border-bottom: 1px solid #eef2f7;
    text-align: left;
    white-space: nowrap;
  }

  th {
    color: #475467;
    background: #f8fafc;
    font-weight: 650;
  }

  tr {
    cursor: pointer;
  }

  tr:hover {
    background: #f8fafc;
  }
}

.pivot-table th,
.trend-table th,
.okr-table th {
  background: #eef6ff;
}

.inline-progress {
  display: block;
  overflow: hidden;
  height: 10px;
  border-radius: 999px;
  background: #eef2f7;

  i {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: #2563eb;
  }
}

.metric-card-preview {
  display: grid;
  place-items: center;
  width: 100%;
  min-height: 340px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: linear-gradient(180deg, #f8fafc, #fff);
  color: #344054;
  cursor: pointer;

  span,
  small {
    color: #667085;
  }

  strong {
    font-size: 48px;
    line-height: 1;
  }
}

.word-cloud {
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  justify-content: center;
  gap: 14px 20px;
  min-height: 360px;
  padding: 30px;

  button {
    border: 0;
    background: transparent;
    font-weight: 800;
    cursor: pointer;
    transition: transform 0.16s ease, opacity 0.16s ease;
  }

  button:hover {
    opacity: 0.78;
    transform: scale(1.08) !important;
  }
}

.spark-table svg {
  width: 180px;
  height: 42px;
}

.annotation-card {
  position: absolute;
  z-index: 4;
  max-width: 180px;
  padding: 8px 10px;
  border: 1px solid #f59e0b;
  border-radius: 8px;
  background: #fffbeb;
  color: #92400e;
  font-size: 12px;
  box-shadow: 0 10px 22px rgba(146, 64, 14, 0.16);
  cursor: grab;
}

.custom-data-tooltip {
  position: absolute;
  z-index: 8;
  min-width: 220px;
  max-width: 320px;
  pointer-events: none;
}

:global(.visual-tooltip),
.custom-data-tooltip :deep(.visual-tooltip) {
  padding: 12px;
  border: 1px solid #d0d5dd;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.98);
  color: #344054;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.16);

  h4 {
    margin: 0 0 8px;
    font-size: 14px;
  }

  p {
    margin: 8px 0 0;
    color: #667085;
    font-size: 12px;
    line-height: 1.45;
  }
}

:global(.visual-tooltip-row),
.custom-data-tooltip :deep(.visual-tooltip-row) {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 3px 0;
  font-size: 12px;

  span {
    color: #667085;
  }

  strong {
    color: #101828;
  }
}
</style>
