import type {
  ChartConfig,
  ChartDefinition,
  FieldSlots,
  SlotField,
  VisualChartType,
  VisualField,
  VisualFieldDataType,
  VisualFieldSlotKey,
  VisualFieldType,
} from '@/types/visualAnalysis'

const anyDataType: VisualFieldDataType[] = ['string', 'number', 'date', 'datetime', 'boolean', 'geo', 'unknown']
const dimensionTypes: VisualFieldDataType[] = ['string', 'date', 'datetime', 'boolean', 'geo']
const dateTypes: VisualFieldDataType[] = ['date', 'datetime']
const numberTypes: VisualFieldDataType[] = ['number']
const allFields: VisualFieldType[] = ['dimension', 'measure']

const slot = (
  label: string,
  accepts: VisualFieldType[],
  dataTypes: VisualFieldDataType[],
  min: number,
  max: number,
): { label: string, accepts: VisualFieldType[], dataTypes: VisualFieldDataType[], min: number, max: number, required: boolean } => ({
  label,
  accepts,
  dataTypes,
  min,
  max,
  required: min > 0,
})

export const slotLabels: Record<VisualFieldSlotKey, string> = {
  dimensions: '维度',
  measures: '指标',
  rowDimensions: '行维度',
  columnDimensions: '列维度',
  dateDimensions: '日期',
  xAxis: 'X 轴',
  yAxis: 'Y 轴',
  secondaryYAxis: '次 Y 轴',
  color: '颜色',
  size: '尺寸',
  detail: '明细',
  tooltip: '提示信息',
  filters: '筛选',
}

export const chartDefinitions: ChartDefinition[] = [
  {
    type: 'table',
    label: '表格',
    group: '表格',
    description: '按维度和指标展示汇总表。',
    defaultDimensionSlot: 'dimensions',
    defaultMeasureSlot: 'measures',
    slots: {
      dimensions: slot('维度', ['dimension'], dimensionTypes, 0, 12),
      measures: slot('指标', ['measure'], numberTypes, 0, 12),
      filters: slot('筛选', allFields, anyDataType, 0, 20),
    },
  },
  {
    type: 'pivot_table',
    label: '透视表',
    group: '表格',
    description: '按行列维度交叉汇总指标。',
    defaultDimensionSlot: 'rowDimensions',
    defaultMeasureSlot: 'measures',
    slots: {
      rowDimensions: slot('行维度', ['dimension'], dimensionTypes, 1, 6),
      columnDimensions: slot('列维度', ['dimension'], dimensionTypes, 1, 6),
      measures: slot('指标', ['measure'], numberTypes, 1, 6),
      filters: slot('筛选', allFields, anyDataType, 0, 20),
    },
  },
  {
    type: 'trend_table',
    label: '趋势分析表',
    group: '表格',
    description: '在表格中展开时间趋势、同比和环比。',
    defaultDimensionSlot: 'dateDimensions',
    defaultMeasureSlot: 'measures',
    slots: {
      dateDimensions: slot('日期', ['dimension'], dateTypes, 1, 2),
      dimensions: slot('分组维度', ['dimension'], dimensionTypes, 0, 4),
      measures: slot('指标', ['measure'], numberTypes, 1, 8),
    },
  },
  {
    type: 'detail_table',
    label: '明细表',
    group: '表格',
    description: '展示查询明细行，不强制聚合。',
    defaultDimensionSlot: 'dimensions',
    defaultMeasureSlot: 'measures',
    slots: {
      dimensions: slot('明细维度', ['dimension'], dimensionTypes, 1, 20),
      measures: slot('明细指标', ['measure'], numberTypes, 0, 12),
      filters: slot('筛选', allFields, anyDataType, 0, 20),
    },
  },
  {
    type: 'okr_table',
    label: 'OKR 表格',
    group: '表格',
    description: '按目标、当前值和完成率展示 OKR。',
    defaultDimensionSlot: 'dimensions',
    defaultMeasureSlot: 'measures',
    slots: {
      dimensions: slot('目标维度', ['dimension'], dimensionTypes, 1, 4),
      measures: slot('当前指标', ['measure'], numberTypes, 1, 4),
      secondaryYAxis: slot('目标值', ['measure'], numberTypes, 0, 1),
    },
  },
  {
    type: 'metric_card',
    label: '指标卡',
    group: '指标',
    description: '突出展示单个关键指标。',
    defaultDimensionSlot: 'dimensions',
    defaultMeasureSlot: 'measures',
    slots: {
      measures: slot('指标', ['measure'], numberTypes, 1, 1),
      tooltip: slot('提示信息', allFields, anyDataType, 0, 6),
    },
  },
  {
    type: 'metric_trend',
    label: '指标趋势图',
    group: '指标',
    description: '展示指标当前值和时间趋势。',
    defaultDimensionSlot: 'dateDimensions',
    defaultMeasureSlot: 'measures',
    slots: {
      dateDimensions: slot('日期', ['dimension'], dateTypes, 1, 1),
      measures: slot('指标', ['measure'], numberTypes, 1, 2),
    },
  },
  {
    type: 'column',
    label: '柱状图',
    group: '基础图表',
    description: '纵向比较分类指标。',
    defaultDimensionSlot: 'dimensions',
    defaultMeasureSlot: 'measures',
    slots: {
      dimensions: slot('维度', ['dimension'], dimensionTypes, 1, 2),
      measures: slot('指标', ['measure'], numberTypes, 1, 6),
      color: slot('颜色', ['dimension'], dimensionTypes, 0, 1),
    },
  },
  {
    type: 'bar',
    label: '条形图',
    group: '基础图表',
    description: '横向比较分类指标。',
    defaultDimensionSlot: 'dimensions',
    defaultMeasureSlot: 'measures',
    slots: {
      dimensions: slot('维度', ['dimension'], dimensionTypes, 1, 2),
      measures: slot('指标', ['measure'], numberTypes, 1, 6),
      color: slot('颜色', ['dimension'], dimensionTypes, 0, 1),
    },
  },
  {
    type: 'line',
    label: '折线图',
    group: '趋势图表',
    description: '展示连续趋势变化。',
    defaultDimensionSlot: 'dateDimensions',
    defaultMeasureSlot: 'measures',
    slots: {
      dateDimensions: slot('日期', ['dimension'], dateTypes, 1, 1),
      dimensions: slot('分组维度', ['dimension'], dimensionTypes, 0, 1),
      measures: slot('指标', ['measure'], numberTypes, 1, 6),
      color: slot('颜色', ['dimension'], dimensionTypes, 0, 1),
    },
  },
  {
    type: 'area',
    label: '面积图',
    group: '趋势图表',
    description: '展示趋势累计和结构变化。',
    defaultDimensionSlot: 'dateDimensions',
    defaultMeasureSlot: 'measures',
    slots: {
      dateDimensions: slot('日期', ['dimension'], dateTypes, 1, 1),
      measures: slot('指标', ['measure'], numberTypes, 1, 6),
      color: slot('颜色', ['dimension'], dimensionTypes, 0, 1),
    },
  },
  {
    type: 'dual_axis',
    label: '双轴图',
    group: '组合图表',
    description: '用双 Y 轴比较不同量纲指标。',
    defaultDimensionSlot: 'xAxis',
    defaultMeasureSlot: 'yAxis',
    slots: {
      xAxis: slot('X 轴', ['dimension'], [...dimensionTypes, ...dateTypes], 1, 1),
      yAxis: slot('左轴指标', ['measure'], numberTypes, 1, 3),
      secondaryYAxis: slot('右轴指标', ['measure'], numberTypes, 1, 3),
    },
  },
  {
    type: 'combo',
    label: '组合图',
    group: '组合图表',
    description: '柱线组合展示多指标。',
    defaultDimensionSlot: 'xAxis',
    defaultMeasureSlot: 'yAxis',
    slots: {
      xAxis: slot('X 轴', ['dimension'], [...dimensionTypes, ...dateTypes], 1, 1),
      yAxis: slot('柱指标', ['measure'], numberTypes, 1, 4),
      secondaryYAxis: slot('线指标', ['measure'], numberTypes, 0, 4),
    },
  },
  {
    type: 'pie',
    label: '饼图',
    group: '占比图表',
    description: '展示各分类占比。',
    defaultDimensionSlot: 'dimensions',
    defaultMeasureSlot: 'measures',
    slots: {
      dimensions: slot('分类维度', ['dimension'], dimensionTypes, 1, 1),
      measures: slot('指标', ['measure'], numberTypes, 1, 1),
    },
  },
  {
    type: 'map',
    label: '地图',
    group: '空间图表',
    description: '按地理角色展示区域指标。',
    defaultDimensionSlot: 'dimensions',
    defaultMeasureSlot: 'measures',
    slots: {
      dimensions: slot('地理维度', ['dimension'], ['geo', 'string'], 1, 1),
      measures: slot('指标', ['measure'], numberTypes, 1, 1),
    },
  },
  {
    type: 'scatter',
    label: '散点图',
    group: '分布图表',
    description: '展示两个数值字段的相关性。',
    defaultDimensionSlot: 'detail',
    defaultMeasureSlot: 'xAxis',
    slots: {
      xAxis: slot('X 指标', ['measure'], numberTypes, 1, 1),
      yAxis: slot('Y 指标', ['measure'], numberTypes, 1, 1),
      size: slot('尺寸', ['measure'], numberTypes, 0, 1),
      color: slot('颜色', ['dimension'], dimensionTypes, 0, 1),
      detail: slot('明细', ['dimension'], dimensionTypes, 0, 2),
    },
  },
  {
    type: 'circle_view',
    label: '圆视图',
    group: '分布图表',
    description: '用气泡大小展示分类指标。',
    defaultDimensionSlot: 'dimensions',
    defaultMeasureSlot: 'measures',
    slots: {
      dimensions: slot('分类维度', ['dimension'], dimensionTypes, 1, 1),
      measures: slot('指标', ['measure'], numberTypes, 1, 1),
      color: slot('颜色', ['dimension'], dimensionTypes, 0, 1),
    },
  },
  {
    type: 'histogram',
    label: '直方图',
    group: '分布图表',
    description: '展示数值字段的区间分布。',
    defaultDimensionSlot: 'dimensions',
    defaultMeasureSlot: 'measures',
    slots: {
      measures: slot('分布指标', ['measure'], numberTypes, 1, 1),
    },
  },
  {
    type: 'word_cloud',
    label: '词云',
    group: '文本图表',
    description: '按词频或指标大小展示文本。',
    defaultDimensionSlot: 'dimensions',
    defaultMeasureSlot: 'measures',
    slots: {
      dimensions: slot('文本维度', ['dimension'], ['string'], 1, 1),
      measures: slot('权重指标', ['measure'], numberTypes, 1, 1),
    },
  },
  {
    type: 'funnel',
    label: '漏斗图',
    group: '流程图表',
    description: '展示业务流程转化关系。',
    defaultDimensionSlot: 'dimensions',
    defaultMeasureSlot: 'measures',
    slots: {
      dimensions: slot('阶段维度', ['dimension'], dimensionTypes, 1, 1),
      measures: slot('指标', ['measure'], numberTypes, 1, 1),
    },
  },
  {
    type: 'radar',
    label: '雷达图',
    group: '对比图表',
    description: '在同一坐标系比较多维评分。',
    defaultDimensionSlot: 'dimensions',
    defaultMeasureSlot: 'measures',
    slots: {
      dimensions: slot('维度', ['dimension'], dimensionTypes, 1, 2),
      measures: slot('指标', ['measure'], numberTypes, 1, 8),
    },
  },
  {
    type: 'sankey',
    label: '桑基图',
    group: '流程图表',
    description: '展示多层级流向和流量大小。',
    defaultDimensionSlot: 'dimensions',
    defaultMeasureSlot: 'measures',
    slots: {
      dimensions: slot('流向维度', ['dimension'], dimensionTypes, 2, 6),
      measures: slot('流量指标', ['measure'], numberTypes, 1, 1),
    },
  },
  {
    type: 'gauge',
    label: '仪表图',
    group: '目标图表',
    description: '展示当前值相对目标值的完成度。',
    defaultDimensionSlot: 'dimensions',
    defaultMeasureSlot: 'measures',
    slots: {
      measures: slot('当前值', ['measure'], numberTypes, 1, 1),
      secondaryYAxis: slot('目标值', ['measure'], numberTypes, 0, 1),
    },
  },
  {
    type: 'progress',
    label: '进度图',
    group: '目标图表',
    description: '以进度条展示目标完成情况。',
    defaultDimensionSlot: 'dimensions',
    defaultMeasureSlot: 'measures',
    slots: {
      dimensions: slot('分类维度', ['dimension'], dimensionTypes, 0, 1),
      measures: slot('当前值', ['measure'], numberTypes, 1, 1),
      secondaryYAxis: slot('目标值', ['measure'], numberTypes, 0, 1),
    },
  },
  {
    type: 'waterfall',
    label: '瀑布图',
    group: '结构图表',
    description: '展示结构贡献或变化过程。',
    defaultDimensionSlot: 'dimensions',
    defaultMeasureSlot: 'measures',
    slots: {
      dimensions: slot('维度', ['dimension'], dimensionTypes, 1, 1),
      measures: slot('指标', ['measure'], numberTypes, 1, 1),
    },
  },
  {
    type: 'sparkline',
    label: '迷你图',
    group: '趋势图表',
    description: '在紧凑列表中展示小型趋势线。',
    defaultDimensionSlot: 'dateDimensions',
    defaultMeasureSlot: 'measures',
    slots: {
      dateDimensions: slot('日期', ['dimension'], dateTypes, 1, 1),
      measures: slot('指标', ['measure'], numberTypes, 1, 1),
      dimensions: slot('分组维度', ['dimension'], dimensionTypes, 0, 1),
    },
  },
  {
    type: 'pivot_chart',
    label: '透视图表',
    group: '组合图表',
    description: '按行列维度拆分基础图表。',
    defaultDimensionSlot: 'dimensions',
    defaultMeasureSlot: 'measures',
    slots: {
      dimensions: slot('图表维度', ['dimension'], dimensionTypes, 1, 1),
      rowDimensions: slot('行维度', ['dimension'], dimensionTypes, 0, 3),
      columnDimensions: slot('列维度', ['dimension'], dimensionTypes, 0, 3),
      measures: slot('指标', ['measure'], numberTypes, 1, 1),
    },
  },
  {
    type: 'bi_bar',
    label: '双向条形图',
    group: '对比图表',
    description: '展示正反分类数据对比。',
    defaultDimensionSlot: 'dimensions',
    defaultMeasureSlot: 'yAxis',
    slots: {
      dimensions: slot('维度', ['dimension'], dimensionTypes, 1, 1),
      yAxis: slot('正向指标', ['measure'], numberTypes, 1, 1),
      secondaryYAxis: slot('反向指标', ['measure'], numberTypes, 1, 1),
    },
  },
]

export const chartRegistry: Record<VisualChartType, ChartDefinition> = chartDefinitions.reduce(
  (result, chart) => ({ ...result, [chart.type]: chart }),
  {} as Record<VisualChartType, ChartDefinition>,
)

export const allSlotKeys: VisualFieldSlotKey[] = [
  'dimensions',
  'measures',
  'rowDimensions',
  'columnDimensions',
  'dateDimensions',
  'xAxis',
  'yAxis',
  'secondaryYAxis',
  'color',
  'size',
  'detail',
  'tooltip',
  'filters',
]

export function createEmptySlots(): FieldSlots {
  return {
    dimensions: [],
    measures: [],
    rowDimensions: [],
    columnDimensions: [],
    dateDimensions: [],
    xAxis: [],
    yAxis: [],
    secondaryYAxis: [],
    color: [],
    size: [],
    detail: [],
    tooltip: [],
    filters: [],
  }
}

export function createDefaultChartConfig(type: VisualChartType = 'table'): ChartConfig {
  return {
    type,
    title: '未命名图表',
    description: '',
    style: {
      showLegend: true,
      showLabel: true,
      stack: false,
      smooth: true,
      displayMode: 'standard',
    },
    axis: {
      xTitle: '',
      yTitle: '',
      secondaryYTitle: '',
    },
    gauge: {
      min: 0,
      max: 100,
      targetValue: 100,
      showPointer: true,
    },
    waterfall: {
      mode: 'structure',
      showTotal: true,
      totalLabel: '总计',
    },
    pivot: {
      showRowHeader: true,
      showColumnHeader: true,
      displayMode: 'standard',
    },
  }
}

export function canDropField(field: VisualField, slotKey: VisualFieldSlotKey, chartType: VisualChartType, slots: FieldSlots): { ok: boolean, reason?: string } {
  const rule = chartRegistry[chartType].slots[slotKey]
  if (!rule) {
    return { ok: false, reason: '当前图表不使用该区域' }
  }
  if (!rule.accepts.includes(field.fieldType)) {
    return { ok: false, reason: '当前字段类型不支持放入该区域' }
  }
  if (!rule.dataTypes.includes(field.dataType)) {
    return { ok: false, reason: '当前字段数据类型不支持放入该区域' }
  }
  if (slots[slotKey].some((item) => item.fieldId === field.id)) {
    return { ok: false, reason: '字段已在该区域' }
  }
  if (slots[slotKey].length >= rule.max) {
    return { ok: false, reason: '当前图表该区域已达到字段数量上限' }
  }
  return { ok: true }
}

export function validateChartSlots(chartType: VisualChartType, slots: FieldSlots): string[] {
  const chart = chartRegistry[chartType]
  return Object.entries(chart.slots).flatMap(([key, rule]) => {
    const slotKey = key as VisualFieldSlotKey
    const count = slots[slotKey].length
    if (!rule) return []
    if (count < rule.min) return [`${chart.label}需要至少 ${rule.min} 个${rule.label}`]
    if (count > rule.max) return [`${rule.label}最多支持 ${rule.max} 个字段`]
    return []
  })
}

export function pruneSlotsForChart(chartType: VisualChartType, slots: FieldSlots): FieldSlots {
  const next = createEmptySlots()
  const chart = chartRegistry[chartType]
  allSlotKeys.forEach((slotKey) => {
    const rule = chart.slots[slotKey]
    if (!rule) return
    next[slotKey] = slots[slotKey].slice(0, rule.max).filter((field): field is SlotField => Boolean(field))
  })
  return next
}
