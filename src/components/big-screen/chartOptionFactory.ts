import type { EChartsOption } from 'echarts'
import type { BigScreenComponent } from '@/types/bigScreen'
import type { BigScreenChartDataView } from './chartDataAdapter'

type EChartsAnimationEasing = NonNullable<EChartsOption['animationEasing']>

const baseGrid = {
  top: 40,
  right: 24,
  bottom: 36,
  left: 52,
}

const axisStyle = {
  axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.42)' } },
  axisTick: { show: false },
  axisLabel: { color: '#94a3b8' },
  splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.16)' } },
}

const getColors = (component: BigScreenComponent): string[] =>
  Array.isArray(component.style.colorScheme)
    ? component.style.colorScheme as string[]
    : ['#38bdf8', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']

const getColor = (colors: string[], index: number): string => colors[index] ?? colors[0] ?? '#38bdf8'

const getAxisStyle = (component: BigScreenComponent, axis: 'x' | 'y') => ({
  ...axisStyle,
  show: axis === 'x'
    ? Boolean(component.style.xAxisVisible)
    : Boolean(component.style.yAxisVisible),
})

const normalizeEasing = (component: BigScreenComponent): EChartsAnimationEasing => {
  const easingMap: Record<string, EChartsAnimationEasing> = {
    linear: 'linear',
    'ease-in': 'cubicIn',
    'ease-out': 'cubicOut',
    'ease-in-out': 'cubicInOut',
    cubicIn: 'cubicIn',
    cubicOut: 'cubicOut',
    cubicInOut: 'cubicInOut',
  }

  return easingMap[String(component.style.animationEasing ?? 'cubicOut')] ?? 'cubicOut'
}

const getAnimationConfig = (
  component: BigScreenComponent,
): Pick<EChartsOption, 'animation' | 'animationDuration' | 'animationEasing'> => ({
  animation: Boolean(component.style.animationEnabled),
  animationDuration: Number(component.style.animationDurationMs ?? 800),
  animationEasing: normalizeEasing(component),
})

const getChartTitle = (component: BigScreenComponent): string =>
  String(component.style.title || component.name)

const getResponsiveGrid = (component: BigScreenComponent) => {
  const compact = component.layout.width < 380 || component.layout.height < 260
  return compact
    ? { top: 30, right: 14, bottom: 24, left: 40 }
    : baseGrid
}

const getCommonOption = (component: BigScreenComponent, colors: string[]) => ({
  backgroundColor: 'transparent',
  ...getAnimationConfig(component),
  color: colors,
})

const buildColumnBarOption = (
  component: BigScreenComponent,
  dataView: BigScreenChartDataView,
  type: 'bar' | 'line' | 'area',
): EChartsOption => {
  const isHorizontal = ['groupedBar', 'stackedBar', 'percentBar', 'bidirectionalBar'].includes(component.type)
  const isStacked = ['stackedColumn', 'percentColumn', 'stackedBar', 'percentBar', 'percentArea'].includes(component.type)
  const isPercent = ['percentColumn', 'percentBar', 'percentArea'].includes(component.type)
  const colors = getColors(component)
  const source = dataView.grouped
  const grid = getResponsiveGrid(component)
  const series = source.values.map((item) => {
    const values = isPercent
      ? item.values.map((value, index) => {
          const total = source.values.reduce((sum, seriesItem) => sum + (seriesItem.values[index] ?? 0), 0)
          return total > 0 ? Number(((value / total) * 100).toFixed(2)) : 0
        })
      : item.values

    return {
      name: item.seriesName,
      type: type === 'area' ? 'line' : type,
      stack: isStacked ? 'total' : undefined,
      smooth: Boolean(component.style.smooth),
      areaStyle: type === 'area' ? { opacity: Number(component.style.areaOpacity ?? 0.24) } : undefined,
      label: { show: Boolean(component.style.valueLabelVisible), color: '#e2e8f0' },
      markLine: dataView.referenceLines,
      data: values,
    }
  })

  return {
    ...getCommonOption(component, colors),
    tooltip: { trigger: 'axis' },
    legend: {
      show: Boolean(component.style.legendVisible) && component.layout.width >= 300,
      top: 8,
      right: 12,
      textStyle: { color: '#94a3b8' },
    },
    grid,
    xAxis: isHorizontal
      ? { type: 'value', ...getAxisStyle(component, 'x'), max: isPercent ? 100 : undefined }
      : { type: 'category', data: source.categories, ...getAxisStyle(component, 'x') },
    yAxis: isHorizontal
      ? { type: 'category', data: source.categories, ...getAxisStyle(component, 'y') }
      : { type: 'value', ...getAxisStyle(component, 'y'), max: isPercent ? 100 : undefined },
    series: series as unknown as EChartsOption['series'],
  }
}

const buildBidirectionalOption = (
  component: BigScreenComponent,
  dataView: BigScreenChartDataView,
): EChartsOption => {
  const colors = getColors(component)
  const rows = dataView.dimensionRows.slice(0, 6)
  return {
    ...getCommonOption(component, [getColor(colors, 3), getColor(colors, 0)]),
    tooltip: { trigger: 'axis' },
    legend: { show: Boolean(component.style.legendVisible), top: 8, right: 12, textStyle: { color: '#94a3b8' } },
    grid: { top: 44, right: 24, bottom: 26, left: 68 },
    xAxis: { type: 'value', ...getAxisStyle(component, 'x') },
    yAxis: { type: 'category', data: rows.map((row) => row.category), ...getAxisStyle(component, 'y') },
    series: [
      { name: '左侧指标', type: 'bar', label: { show: Boolean(component.style.valueLabelVisible), color: '#e2e8f0' }, markLine: dataView.referenceLines, data: rows.map((row) => -Math.abs(row.compareValue)) },
      { name: '右侧指标', type: 'bar', label: { show: Boolean(component.style.valueLabelVisible), color: '#e2e8f0' }, markLine: dataView.referenceLines, data: rows.map((row) => row.value) },
    ],
  }
}

const buildDualAxisOption = (
  component: BigScreenComponent,
  dataView: BigScreenChartDataView,
): EChartsOption => {
  const colors = getColors(component)
  const rows = dataView.dimensionRows.slice(0, 8)
  return {
    ...getCommonOption(component, [getColor(colors, 0), getColor(colors, 1)]),
    tooltip: { trigger: 'axis' },
    legend: { show: Boolean(component.style.legendVisible), top: 8, right: 12, textStyle: { color: '#94a3b8' } },
    grid: getResponsiveGrid(component),
    xAxis: { type: 'category', data: rows.map((row) => row.category), ...getAxisStyle(component, 'x') },
    yAxis: [
      { type: 'value', ...getAxisStyle(component, 'y') },
      { type: 'value', ...getAxisStyle(component, 'y') },
    ],
    series: [
      { name: '柱', type: 'bar', label: { show: Boolean(component.style.valueLabelVisible), color: '#e2e8f0' }, markLine: dataView.referenceLines, data: rows.map((row) => row.value) },
      { name: '线', type: 'line', yAxisIndex: 1, smooth: true, label: { show: Boolean(component.style.valueLabelVisible), color: '#e2e8f0' }, markLine: dataView.referenceLines, data: rows.map((row) => row.compareValue) },
    ],
  }
}

const buildPieOption = (
  component: BigScreenComponent,
  dataView: BigScreenChartDataView,
): EChartsOption => {
  const isDonut = component.type === 'donut'
  const isRose = component.type === 'rose'
  const compact = component.layout.width < 320 || component.layout.height < 260
  return {
    ...getCommonOption(component, getColors(component)),
    tooltip: { trigger: 'item' },
    legend: {
      show: Boolean(component.style.legendVisible) && !compact,
      bottom: 0,
      textStyle: { color: '#94a3b8' },
    },
    series: [
      {
        name: getChartTitle(component),
        type: 'pie',
        radius: isDonut ? ['44%', '68%'] : isRose ? ['16%', '70%'] : compact ? '58%' : '66%',
        roseType: isRose ? 'radius' : undefined,
        center: ['50%', compact ? '54%' : '52%'],
        label: { show: Boolean(component.style.valueLabelVisible) && !compact, color: '#e2e8f0' },
        data: dataView.dimensionRows.slice(0, 8).map((row) => ({ name: row.category, value: row.value })),
      },
    ],
  }
}

const buildScatterOption = (
  component: BigScreenComponent,
  dataView: BigScreenChartDataView,
): EChartsOption => {
  const xField = dataView.fields.x ?? 'compareValue'
  const yField = dataView.fields.y ?? 'value'
  const sizeField = dataView.fields.size ?? 'target'
  const labelField = dataView.fields.label ?? 'category'
  return {
    ...getCommonOption(component, getColors(component)),
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const data = (params as { data?: unknown }).data

        return Array.isArray(data)
          ? `${data[3] ?? ''}<br/>X: ${data[0] ?? '--'}<br/>Y: ${data[1] ?? '--'}`
          : ''
      },
    },
    grid: getResponsiveGrid(component),
    xAxis: { type: 'value', ...getAxisStyle(component, 'x') },
    yAxis: { type: 'value', ...getAxisStyle(component, 'y') },
    series: [
      {
        name: getChartTitle(component),
        type: 'scatter',
        symbolSize: (data: [number, number, number]) => Math.max(12, Math.min(54, Number(data[2] ?? 0) / 360)),
        markLine: dataView.referenceLines,
        data: dataView.rows.map((row) => [
          Number(row[xField] ?? 0),
          Number(row[yField] ?? 0),
          Number(row[sizeField] ?? 100),
          String(row[labelField] ?? row.category ?? ''),
        ]),
      },
    ],
  }
}

const buildFunnelOption = (
  component: BigScreenComponent,
  dataView: BigScreenChartDataView,
): EChartsOption => ({
  ...getCommonOption(component, getColors(component)),
  tooltip: { trigger: 'item' },
  series: [
    {
      name: getChartTitle(component),
      type: 'funnel',
      top: 48,
      bottom: 24,
      left: '12%',
      width: '76%',
      label: { show: Boolean(component.style.valueLabelVisible), color: '#e2e8f0' },
      data: dataView.dimensionRows.map((row) => ({ name: row.category, value: row.value })),
    },
  ],
})

const buildSankeyOption = (
  component: BigScreenComponent,
  dataView: BigScreenChartDataView,
): EChartsOption => {
  const sourceField = dataView.fields.source ?? 'source'
  const targetField = dataView.fields.targetNode ?? dataView.fields.target ?? 'target'
  const valueField = dataView.fields.value ?? dataView.fields.measure ?? 'value'
  const names = Array.from(new Set(dataView.rows.flatMap((row) => [String(row[sourceField] ?? ''), String(row[targetField] ?? '')]))).filter(Boolean)
  return {
    ...getCommonOption(component, getColors(component)),
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'sankey',
        top: 48,
        bottom: 20,
        left: 16,
        right: 24,
        data: names.map((name) => ({ name })),
        links: dataView.rows.map((row) => ({
          source: String(row[sourceField] ?? ''),
          target: String(row[targetField] ?? ''),
          value: Number(row[valueField] ?? 0),
        })).filter((link) => link.source && link.target),
        label: { show: Boolean(component.style.valueLabelVisible), color: '#e2e8f0' },
        lineStyle: { color: 'gradient', opacity: 0.45 },
      },
    ],
  }
}

const buildRadarOption = (
  component: BigScreenComponent,
  dataView: BigScreenChartDataView,
): EChartsOption => ({
  ...getCommonOption(component, getColors(component)),
  radar: {
    center: ['50%', '56%'],
    radius: component.layout.width < 320 ? '52%' : '62%',
    indicator: dataView.dimensionRows.map((row) => ({ name: row.category, max: Math.max(100, row.target, row.value) })),
    axisName: { color: '#94a3b8' },
    splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.24)' } },
    splitArea: { areaStyle: { color: ['rgba(56, 189, 248, 0.05)', 'rgba(56, 189, 248, 0.02)'] } },
  },
  series: [
    {
      type: 'radar',
      areaStyle: { opacity: 0.24 },
      data: [{ name: getChartTitle(component), value: dataView.dimensionRows.map((row) => row.value) }],
    },
  ],
})

const buildGaugeOption = (
  component: BigScreenComponent,
  dataView: BigScreenChartDataView,
): EChartsOption => ({
  ...getCommonOption(component, getColors(component)),
  series: [
    {
      type: 'gauge',
      min: Number(component.style.min ?? 0),
      max: Number(component.style.max ?? 100),
      progress: { show: true, width: 14 },
      axisLine: { lineStyle: { width: 14, color: [[1, 'rgba(148, 163, 184, 0.22)']] } },
      axisLabel: { color: '#94a3b8' },
      title: { color: '#94a3b8', offsetCenter: [0, '72%'] },
      detail: { color: '#f8fafc', formatter: `{value}${component.style.unit ?? ''}`, fontSize: component.layout.height < 220 ? 18 : 24 },
      data: [{ value: dataView.dimensionRows[0]?.value ?? Number(dataView.rows[0]?.value ?? 0), name: getChartTitle(component) }],
    },
  ],
})

export const buildBigScreenChartOption = (
  component: BigScreenComponent,
  dataView: BigScreenChartDataView,
): EChartsOption => {
  switch (component.type) {
    case 'groupedColumn':
    case 'stackedColumn':
    case 'percentColumn':
    case 'groupedBar':
    case 'stackedBar':
    case 'percentBar':
      return buildColumnBarOption(component, dataView, 'bar')
    case 'line':
      return buildColumnBarOption(component, dataView, 'line')
    case 'area':
    case 'percentArea':
      return buildColumnBarOption(component, dataView, 'area')
    case 'bidirectionalBar':
      return buildBidirectionalOption(component, dataView)
    case 'dualAxis':
      return buildDualAxisOption(component, dataView)
    case 'pie':
    case 'donut':
    case 'rose':
      return buildPieOption(component, dataView)
    case 'scatter':
      return buildScatterOption(component, dataView)
    case 'funnel':
      return buildFunnelOption(component, dataView)
    case 'sankey':
      return buildSankeyOption(component, dataView)
    case 'radar':
      return buildRadarOption(component, dataView)
    case 'gauge':
      return buildGaugeOption(component, dataView)
    default:
      return buildColumnBarOption(component, dataView, 'bar')
  }
}
