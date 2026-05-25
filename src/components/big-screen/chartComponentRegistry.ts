import type { BigScreenComponentType, BigScreenDataBindingConfig } from '@/types/bigScreen'
import type { DefaultComponentRegistryItem } from './defaultComponentRegistry'

export type BigScreenChartCategory =
  | '指标展示类'
  | '表格类'
  | '柱状图类'
  | '条形图类'
  | '趋势类'
  | '组合图类'
  | '占比类'
  | '分布关系类'
  | '流程转化类'
  | '多维评估类'
  | '进度状态类'

interface ChartRegistrySeed {
  type: BigScreenComponentType
  name: string
  chartCategory: BigScreenChartCategory
  width: number
  height: number
  fields: BigScreenDataBindingConfig['fields']
  staticRows: Array<Record<string, unknown>>
  style?: Record<string, unknown>
}

const commonChartStyle = {
  title: '',
  colorScheme: ['#38bdf8', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'],
  legendVisible: true,
  valueLabelVisible: false,
  xAxisVisible: true,
  yAxisVisible: true,
  atmosphere: 'none',
  animationEnabled: true,
  animationDurationMs: 800,
  animationEasing: 'ease-out',
}

const baseRows = [
  { category: '华东', series: '本期', value: 12860, compareValue: 9600, target: 15000 },
  { category: '华南', series: '本期', value: 9420, compareValue: 7600, target: 12000 },
  { category: '西南', series: '本期', value: 6210, compareValue: 5300, target: 8000 },
  { category: '华北', series: '本期', value: 8120, compareValue: 6900, target: 10000 },
  { category: '华东', series: '上期', value: 10860, compareValue: 9200, target: 15000 },
  { category: '华南', series: '上期', value: 8420, compareValue: 7000, target: 12000 },
]

const relationRows = [
  { source: '曝光', target: '点击', value: 12860 },
  { source: '点击', target: '注册', value: 6420 },
  { source: '注册', target: '首看广告', value: 3120 },
  { source: '首看广告', target: '留存', value: 1260 },
]

const chartDataBinding = (seed: ChartRegistrySeed): BigScreenDataBindingConfig => ({
  sourceType: 'static',
  fields: seed.fields,
  updateMode: 'manual',
  refreshIntervalSeconds: 60,
  sortRules: [],
  filterRules: [],
  topN: {
    enabled: false,
    mode: 'all',
    count: 10,
    measureField: seed.fields.find((field) => field.fieldType === 'measure')?.fieldName,
  },
  staticRows: seed.staticRows,
})

const seedToComponent = (seed: ChartRegistrySeed): DefaultComponentRegistryItem => ({
  type: seed.type,
  name: seed.name,
  category: '图表',
  width: seed.width,
  height: seed.height,
  style: {
    ...commonChartStyle,
    title: seed.name,
    chartCategory: seed.chartCategory,
    ...seed.style,
  },
  dataBinding: chartDataBinding(seed),
})

const dimensionMeasureFields: BigScreenDataBindingConfig['fields'] = [
  { slot: 'dimension', fieldName: 'category', fieldType: 'dimension' },
  { slot: 'measure', fieldName: 'value', fieldType: 'measure', aggregation: 'sum' },
]

const seriesFields: BigScreenDataBindingConfig['fields'] = [
  { slot: 'dimension', fieldName: 'category', fieldType: 'dimension' },
  { slot: 'series', fieldName: 'series', fieldType: 'dimension' },
  { slot: 'measure', fieldName: 'value', fieldType: 'measure', aggregation: 'sum' },
]

export const chartComponentRegistry: DefaultComponentRegistryItem[] = [
  seedToComponent({
    type: 'metricCard',
    name: '指标卡',
    chartCategory: '指标展示类',
    width: 360,
    height: 180,
    fields: [
      { slot: 'primaryMeasure', fieldName: 'value', fieldType: 'measure', aggregation: 'sum' },
      { slot: 'secondaryMeasure', fieldName: 'compareValue', fieldType: 'measure', aggregation: 'sum' },
      { slot: 'dimension', fieldName: 'category', fieldType: 'dimension' },
    ],
    staticRows: baseRows.slice(0, 3),
    style: { mainLabel: '广告观看次数', suffix: '次', trendLabel: '较上期 +12.6%', color: '#38bdf8' },
  }),
  seedToComponent({
    type: 'flipNumber',
    name: '翻牌器',
    chartCategory: '指标展示类',
    width: 340,
    height: 130,
    fields: [{ slot: 'measure', fieldName: 'value', fieldType: 'measure', aggregation: 'sum' }],
    staticRows: [{ value: 356920 }],
    style: { prefix: '', suffix: '次', digitColor: '#f8fafc', separator: true },
  }),
  seedToComponent({
    type: 'rankingList',
    name: '排行榜',
    chartCategory: '指标展示类',
    width: 420,
    height: 300,
    fields: dimensionMeasureFields,
    staticRows: baseRows.slice(0, 4),
    style: { rankStyle: 'number', barVisible: true },
  }),
  seedToComponent({
    type: 'table',
    name: '表格',
    chartCategory: '表格类',
    width: 560,
    height: 320,
    fields: [
      { slot: 'dimension', fieldName: 'category', fieldType: 'dimension' },
      { slot: 'measure', fieldName: 'value', fieldType: 'measure', aggregation: 'sum' },
      { slot: 'measure', fieldName: 'compareValue', fieldType: 'measure', aggregation: 'sum' },
    ],
    staticRows: baseRows.slice(0, 4),
    style: { rowNumberVisible: true, stripe: true, scrollRows: 4, scrollIntervalSeconds: 3 },
  }),
  seedToComponent({ type: 'groupedColumn', name: '并列柱状图', chartCategory: '柱状图类', width: 520, height: 320, fields: seriesFields, staticRows: baseRows }),
  seedToComponent({ type: 'stackedColumn', name: '堆叠柱状图', chartCategory: '柱状图类', width: 520, height: 320, fields: seriesFields, staticRows: baseRows }),
  seedToComponent({ type: 'percentColumn', name: '百分比柱状图', chartCategory: '柱状图类', width: 520, height: 320, fields: seriesFields, staticRows: baseRows }),
  seedToComponent({ type: 'groupedBar', name: '并列条形图', chartCategory: '条形图类', width: 520, height: 320, fields: seriesFields, staticRows: baseRows }),
  seedToComponent({ type: 'stackedBar', name: '堆叠条形图', chartCategory: '条形图类', width: 520, height: 320, fields: seriesFields, staticRows: baseRows }),
  seedToComponent({ type: 'percentBar', name: '百分比条形图', chartCategory: '条形图类', width: 520, height: 320, fields: seriesFields, staticRows: baseRows }),
  seedToComponent({
    type: 'bidirectionalBar',
    name: '双向条形图',
    chartCategory: '条形图类',
    width: 540,
    height: 320,
    fields: [
      { slot: 'dimension', fieldName: 'category', fieldType: 'dimension' },
      { slot: 'leftMeasure', fieldName: 'compareValue', fieldType: 'measure', aggregation: 'sum' },
      { slot: 'rightMeasure', fieldName: 'value', fieldType: 'measure', aggregation: 'sum' },
    ],
    staticRows: baseRows.slice(0, 4),
  }),
  seedToComponent({ type: 'line', name: '折线图', chartCategory: '趋势类', width: 560, height: 320, fields: seriesFields, staticRows: baseRows, style: { smooth: true } }),
  seedToComponent({ type: 'area', name: '面积图', chartCategory: '趋势类', width: 560, height: 320, fields: seriesFields, staticRows: baseRows, style: { smooth: true, areaOpacity: 0.24 } }),
  seedToComponent({ type: 'percentArea', name: '百分比面积图', chartCategory: '趋势类', width: 560, height: 320, fields: seriesFields, staticRows: baseRows, style: { smooth: true, areaOpacity: 0.28 } }),
  seedToComponent({
    type: 'dualAxis',
    name: '双轴图',
    chartCategory: '组合图类',
    width: 600,
    height: 340,
    fields: [
      { slot: 'dimension', fieldName: 'category', fieldType: 'dimension' },
      { slot: 'leftMeasure', fieldName: 'value', fieldType: 'measure', aggregation: 'sum' },
      { slot: 'rightMeasure', fieldName: 'compareValue', fieldType: 'measure', aggregation: 'sum' },
    ],
    staticRows: baseRows.slice(0, 4),
  }),
  seedToComponent({ type: 'pie', name: '饼图', chartCategory: '占比类', width: 380, height: 320, fields: dimensionMeasureFields, staticRows: baseRows.slice(0, 4) }),
  seedToComponent({ type: 'donut', name: '环形图', chartCategory: '占比类', width: 380, height: 320, fields: dimensionMeasureFields, staticRows: baseRows.slice(0, 4) }),
  seedToComponent({ type: 'rose', name: '玫瑰图', chartCategory: '占比类', width: 400, height: 340, fields: dimensionMeasureFields, staticRows: baseRows.slice(0, 4) }),
  seedToComponent({
    type: 'singleValueDonut',
    name: '单值环形图',
    chartCategory: '占比类',
    width: 320,
    height: 280,
    fields: [
      { slot: 'value', fieldName: 'value', fieldType: 'measure', aggregation: 'sum' },
      { slot: 'max', fieldName: 'target', fieldType: 'measure', aggregation: 'sum' },
    ],
    staticRows: [{ value: 68, target: 100 }],
    style: { centerLabel: '完成率', suffix: '%' },
  }),
  seedToComponent({
    type: 'wordCloud',
    name: '词云',
    chartCategory: '分布关系类',
    width: 440,
    height: 300,
    fields: [
      { slot: 'word', fieldName: 'category', fieldType: 'dimension' },
      { slot: 'weight', fieldName: 'value', fieldType: 'measure', aggregation: 'sum' },
    ],
    staticRows: baseRows.slice(0, 4),
  }),
  seedToComponent({
    type: 'scatter',
    name: '散点图',
    chartCategory: '分布关系类',
    width: 520,
    height: 320,
    fields: [
      { slot: 'x', fieldName: 'compareValue', fieldType: 'measure', aggregation: 'sum' },
      { slot: 'y', fieldName: 'value', fieldType: 'measure', aggregation: 'sum' },
      { slot: 'size', fieldName: 'target', fieldType: 'measure', aggregation: 'sum' },
      { slot: 'label', fieldName: 'category', fieldType: 'dimension' },
    ],
    staticRows: baseRows.slice(0, 4),
  }),
  seedToComponent({ type: 'circleView', name: '圆视图', chartCategory: '分布关系类', width: 420, height: 320, fields: dimensionMeasureFields, staticRows: baseRows.slice(0, 4) }),
  seedToComponent({ type: 'funnel', name: '漏斗图', chartCategory: '流程转化类', width: 420, height: 320, fields: dimensionMeasureFields, staticRows: [
    { category: '曝光', value: 12860 },
    { category: '点击', value: 6420 },
    { category: '注册', value: 3120 },
    { category: '留存', value: 1260 },
  ] }),
  seedToComponent({
    type: 'sankey',
    name: '桑基图',
    chartCategory: '流程转化类',
    width: 600,
    height: 340,
    fields: [
      { slot: 'source', fieldName: 'source', fieldType: 'dimension' },
      { slot: 'target', fieldName: 'target', fieldType: 'dimension' },
      { slot: 'value', fieldName: 'value', fieldType: 'measure', aggregation: 'sum' },
    ],
    staticRows: relationRows,
  }),
  seedToComponent({
    type: 'radar',
    name: '雷达图',
    chartCategory: '多维评估类',
    width: 420,
    height: 340,
    fields: dimensionMeasureFields,
    staticRows: [
      { category: '增长', value: 86 },
      { category: '留存', value: 72 },
      { category: '变现', value: 68 },
      { category: '活跃', value: 91 },
      { category: '风险', value: 42 },
    ],
  }),
  seedToComponent({
    type: 'gauge',
    name: '仪表图',
    chartCategory: '进度状态类',
    width: 340,
    height: 280,
    fields: [{ slot: 'value', fieldName: 'value', fieldType: 'measure', aggregation: 'sum' }],
    staticRows: [{ value: 72 }],
    style: { min: 0, max: 100, unit: '%' },
  }),
  seedToComponent({
    type: 'waterWave',
    name: '水波图',
    chartCategory: '进度状态类',
    width: 320,
    height: 280,
    fields: [{ slot: 'value', fieldName: 'value', fieldType: 'measure', aggregation: 'sum' }],
    staticRows: [{ value: 0.68 }],
    style: { max: 1, unit: '%' },
  }),
]

export const chartComponentTypes = new Set(chartComponentRegistry.map((item) => item.type))
