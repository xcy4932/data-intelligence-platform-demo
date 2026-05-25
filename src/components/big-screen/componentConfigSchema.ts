import type { BigScreenComponentType } from '@/types/bigScreen'

export type BigScreenConfigFieldControl =
  | 'text'
  | 'textarea'
  | 'number'
  | 'slider'
  | 'color'
  | 'boolean'
  | 'select'
  | 'json'

export type BigScreenConfigFieldScope = 'component' | 'layout' | 'style' | 'dataBinding'

export interface BigScreenConfigSelectOption {
  label: string
  value: string | number | boolean
}

export interface BigScreenConfigFieldSchema {
  key: string
  label: string
  scope: BigScreenConfigFieldScope
  control: BigScreenConfigFieldControl
  defaultValue?: unknown
  placeholder?: string
  min?: number
  max?: number
  step?: number
  options?: BigScreenConfigSelectOption[]
  advanced?: boolean
}

export interface BigScreenConfigSectionSchema {
  title: string
  fields: BigScreenConfigFieldSchema[]
}

export interface BigScreenComponentConfigSchema {
  type: BigScreenComponentType | 'default'
  title: string
  sections: BigScreenConfigSectionSchema[]
}

const field = (schema: BigScreenConfigFieldSchema): BigScreenConfigFieldSchema => schema

const textFields: BigScreenConfigSectionSchema = {
  title: '文本',
  fields: [
    field({ key: 'text', label: '内容', scope: 'style', control: 'textarea', defaultValue: '' }),
    field({ key: 'fontSize', label: '字号', scope: 'style', control: 'number', min: 8, max: 120, step: 1, defaultValue: 24 }),
    field({ key: 'fontWeight', label: '字重', scope: 'style', control: 'select', defaultValue: 500, options: [
      { label: '常规', value: 400 },
      { label: '中等', value: 500 },
      { label: '加粗', value: 700 },
    ] }),
    field({ key: 'color', label: '文字颜色', scope: 'style', control: 'color', defaultValue: '#f8fafc' }),
    field({ key: 'textAlign', label: '对齐', scope: 'style', control: 'select', defaultValue: 'left', options: [
      { label: '左对齐', value: 'left' },
      { label: '居中', value: 'center' },
      { label: '右对齐', value: 'right' },
    ] }),
    field({ key: 'lineHeight', label: '行高', scope: 'style', control: 'number', min: 0.8, max: 3, step: 0.1, defaultValue: 1.2 }),
    field({ key: 'letterSpacing', label: '字距', scope: 'style', control: 'number', min: 0, max: 24, step: 1, defaultValue: 0 }),
  ],
}

const shapeFields: BigScreenConfigSectionSchema = {
  title: '图形',
  fields: [
    field({ key: 'backgroundColor', label: '填充颜色', scope: 'style', control: 'color', defaultValue: 'rgba(15, 47, 81, 0.72)' }),
    field({ key: 'borderColor', label: '边框颜色', scope: 'style', control: 'color', defaultValue: '#38bdf8' }),
    field({ key: 'borderWidth', label: '边框宽度', scope: 'style', control: 'number', min: 0, max: 20, step: 1, defaultValue: 1 }),
    field({ key: 'borderRadius', label: '圆角', scope: 'style', control: 'number', min: 0, max: 80, step: 1, defaultValue: 8 }),
    field({ key: 'shadow', label: '阴影', scope: 'style', control: 'text', defaultValue: '' }),
  ],
}

const mediaFieldMap: Partial<Record<BigScreenComponentType, BigScreenConfigSectionSchema>> = {
  image: {
    title: '图片',
    fields: [
      field({ key: 'imageUrl', label: '图片 URL', scope: 'style', control: 'text', placeholder: 'https://...' }),
      field({ key: 'objectFit', label: '填充方式', scope: 'style', control: 'select', defaultValue: 'cover', options: [
        { label: '裁切', value: 'cover' },
        { label: '包含', value: 'contain' },
        { label: '拉伸', value: 'fill' },
      ] }),
      field({ key: 'placeholderText', label: '占位文案', scope: 'style', control: 'text', defaultValue: '图片占位' }),
    ],
  },
  video: {
    title: '视频',
    fields: [
      field({ key: 'videoUrl', label: '视频 URL', scope: 'style', control: 'text' }),
      field({ key: 'posterUrl', label: '封面 URL', scope: 'style', control: 'text' }),
      field({ key: 'autoplay', label: '自动播放', scope: 'style', control: 'boolean', defaultValue: false }),
      field({ key: 'loop', label: '循环播放', scope: 'style', control: 'boolean', defaultValue: true }),
      field({ key: 'muted', label: '静音', scope: 'style', control: 'boolean', defaultValue: true }),
      field({ key: 'controls', label: '显示控件', scope: 'style', control: 'boolean', defaultValue: true }),
    ],
  },
  videoStream: {
    title: '视频流',
    fields: [
      field({ key: 'streamUrl', label: '视频流地址', scope: 'style', control: 'text' }),
      field({ key: 'streamType', label: '流类型', scope: 'style', control: 'select', defaultValue: 'hls', options: [
        { label: 'HLS', value: 'hls' },
        { label: 'FLV', value: 'flv' },
      ] }),
      field({ key: 'reconnectEnabled', label: '断流重连', scope: 'style', control: 'boolean', defaultValue: true }),
      field({ key: 'reconnectIntervalSeconds', label: '重连间隔', scope: 'style', control: 'number', min: 1, max: 120, step: 1, defaultValue: 5 }),
      field({ key: 'hiddenUnmount', label: '隐藏时卸载', scope: 'style', control: 'boolean', defaultValue: true }),
    ],
  },
  iframe: {
    title: '网页',
    fields: [
      field({ key: 'url', label: '网页 URL', scope: 'style', control: 'text' }),
      field({ key: 'sandbox', label: 'Sandbox', scope: 'style', control: 'text' }),
      field({ key: 'allowInteraction', label: '允许交互', scope: 'style', control: 'boolean', defaultValue: true }),
    ],
  },
}

const timeFields: BigScreenConfigSectionSchema = {
  title: '时间',
  fields: [
    field({ key: 'format', label: '格式', scope: 'style', control: 'text', defaultValue: 'YYYY-MM-DD HH:mm:ss' }),
    field({ key: 'timezone', label: '时区', scope: 'style', control: 'select', defaultValue: 'local', options: [
      { label: '本地', value: 'local' },
      { label: 'UTC', value: 'utc' },
    ] }),
    field({ key: 'fontSize', label: '字号', scope: 'style', control: 'number', min: 8, max: 80, step: 1, defaultValue: 24 }),
    field({ key: 'color', label: '字体颜色', scope: 'style', control: 'color', defaultValue: '#e2e8f0' }),
    field({ key: 'textAlign', label: '对齐', scope: 'style', control: 'select', defaultValue: 'left', options: [
      { label: '左对齐', value: 'left' },
      { label: '居中', value: 'center' },
      { label: '右对齐', value: 'right' },
    ] }),
  ],
}

const containerFields: BigScreenConfigSectionSchema = {
  title: '容器',
  fields: [
    field({ key: 'direction', label: '排列方向', scope: 'style', control: 'select', defaultValue: 'row', options: [
      { label: '横向', value: 'row' },
      { label: '纵向', value: 'column' },
    ] }),
    field({ key: 'itemsPerLine', label: '行内个数', scope: 'style', control: 'number', min: 1, max: 12, step: 1, defaultValue: 3 }),
    field({ key: 'horizontalGap', label: '横向间距', scope: 'style', control: 'number', min: 0, max: 80, step: 1, defaultValue: 12 }),
    field({ key: 'verticalGap', label: '纵向间距', scope: 'style', control: 'number', min: 0, max: 80, step: 1, defaultValue: 12 }),
    field({ key: 'paginationEnabled', label: '分页', scope: 'style', control: 'boolean', defaultValue: true }),
    field({ key: 'pageSize', label: '分页大小', scope: 'style', control: 'number', min: 1, max: 100, step: 1, defaultValue: 6 }),
  ],
}

const controlFields: BigScreenConfigSectionSchema = {
  title: '控件',
  fields: [
    field({ key: 'placeholder', label: '占位文案', scope: 'style', control: 'text' }),
    field({ key: 'value', label: '默认值', scope: 'style', control: 'text' }),
    field({ key: 'options', label: '选项 JSON', scope: 'style', control: 'json', defaultValue: [] }),
    field({ key: 'treeData', label: '树数据 JSON', scope: 'style', control: 'json', defaultValue: [], advanced: true }),
  ],
}

const chartFields: BigScreenConfigSectionSchema = {
  title: '图表',
  fields: [
    field({ key: 'title', label: '图表标题', scope: 'style', control: 'text' }),
    field({ key: 'colorScheme', label: '配色 JSON', scope: 'style', control: 'json', defaultValue: ['#38bdf8', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'] }),
    field({ key: 'legendVisible', label: '显示图例', scope: 'style', control: 'boolean', defaultValue: true }),
    field({ key: 'valueLabelVisible', label: '显示数值标签', scope: 'style', control: 'boolean', defaultValue: false }),
    field({ key: 'xAxisVisible', label: '显示 X 轴', scope: 'style', control: 'boolean', defaultValue: true }),
    field({ key: 'yAxisVisible', label: '显示 Y 轴', scope: 'style', control: 'boolean', defaultValue: true }),
    field({ key: 'smooth', label: '平滑曲线', scope: 'style', control: 'boolean', defaultValue: true }),
    field({ key: 'animationEnabled', label: '启用动画', scope: 'style', control: 'boolean', defaultValue: true }),
    field({ key: 'animationDurationMs', label: '动画时长 ms', scope: 'style', control: 'number', min: 0, max: 10000, step: 100, defaultValue: 800 }),
  ],
}

const progressChartFields: BigScreenConfigSectionSchema = {
  title: '进度',
  fields: [
    field({ key: 'min', label: '最小值', scope: 'style', control: 'number', defaultValue: 0 }),
    field({ key: 'max', label: '最大值', scope: 'style', control: 'number', min: 1, defaultValue: 100 }),
    field({ key: 'unit', label: '单位', scope: 'style', control: 'text', defaultValue: '%' }),
    field({ key: 'centerLabel', label: '中心标签', scope: 'style', control: 'text' }),
  ],
}

const tableFields: BigScreenConfigSectionSchema = {
  title: '表格',
  fields: [
    field({ key: 'rowNumberVisible', label: '显示序号', scope: 'style', control: 'boolean', defaultValue: true }),
    field({ key: 'stripe', label: '斑马纹', scope: 'style', control: 'boolean', defaultValue: true }),
    field({ key: 'scrollRows', label: '展示行数', scope: 'style', control: 'number', min: 1, max: 50, step: 1, defaultValue: 6 }),
    field({ key: 'scrollIntervalSeconds', label: '滚动间隔秒', scope: 'style', control: 'number', min: 1, max: 60, step: 1, defaultValue: 3 }),
  ],
}

const threeDFields: BigScreenConfigSectionSchema = {
  title: '3D 场景',
  fields: [
    field({ key: 'containerConfig', label: '容器配置 JSON', scope: 'style', control: 'json', defaultValue: {} }),
    field({ key: 'diagnostics', label: '异常诊断 JSON', scope: 'style', control: 'json', defaultValue: {}, advanced: true }),
  ],
}

const defaultSchema: BigScreenComponentConfigSchema = {
  type: 'default',
  title: '组件配置',
  sections: [],
}

const schemaMap: Partial<Record<BigScreenComponentType, BigScreenComponentConfigSchema>> = {
  title: { type: 'title', title: '标题配置', sections: [textFields] },
  singleText: { type: 'singleText', title: '单行文本配置', sections: [textFields] },
  multiText: { type: 'multiText', title: '多行文本配置', sections: [textFields] },
  rectangle: { type: 'rectangle', title: '矩形配置', sections: [shapeFields] },
  circle: { type: 'circle', title: '圆形配置', sections: [shapeFields] },
  datetime: { type: 'datetime', title: '日期时间配置', sections: [timeFields] },
  date: { type: 'date', title: '日期配置', sections: [timeFields] },
  time: { type: 'time', title: '时间配置', sections: [timeFields] },
  weekday: { type: 'weekday', title: '星期配置', sections: [timeFields] },
  repeater: { type: 'repeater', title: '重复器配置', sections: [containerFields] },
  carousel: { type: 'carousel', title: '轮播配置', sections: [containerFields] },
  tabs: { type: 'tabs', title: '标签页配置', sections: [containerFields] },
  select: { type: 'select', title: '下拉配置', sections: [controlFields] },
  multiSelect: { type: 'multiSelect', title: '多选配置', sections: [controlFields] },
  treeSelect: { type: 'treeSelect', title: '树选择配置', sections: [controlFields] },
  treeMultiSelect: { type: 'treeMultiSelect', title: '树多选配置', sections: [controlFields] },
  datePicker: { type: 'datePicker', title: '日期控件配置', sections: [controlFields] },
  table: { type: 'table', title: '表格配置', sections: [chartFields, tableFields] },
  gauge: { type: 'gauge', title: '仪表图配置', sections: [chartFields, progressChartFields] },
  waterWave: { type: 'waterWave', title: '水波图配置', sections: [chartFields, progressChartFields] },
  singleValueDonut: { type: 'singleValueDonut', title: '单值环形图配置', sections: [chartFields, progressChartFields] },
  map3d: { type: 'map3d', title: '3D 地图配置', sections: [threeDFields] },
  earth3d: { type: 'earth3d', title: '3D 地球配置', sections: [threeDFields] },
}

const mediaTypes: BigScreenComponentType[] = ['image', 'video', 'videoStream', 'iframe']
const chartTypes: BigScreenComponentType[] = [
  'metricCard',
  'flipNumber',
  'rankingList',
  'groupedColumn',
  'stackedColumn',
  'percentColumn',
  'groupedBar',
  'stackedBar',
  'percentBar',
  'bidirectionalBar',
  'line',
  'area',
  'percentArea',
  'dualAxis',
  'pie',
  'donut',
  'rose',
  'wordCloud',
  'scatter',
  'circleView',
  'funnel',
  'radar',
  'sankey',
]

mediaTypes.forEach((type) => {
  const section = mediaFieldMap[type]
  if (section) {
    schemaMap[type] = { type, title: `${section.title}配置`, sections: [section] }
  }
})

chartTypes.forEach((type) => {
  if (!schemaMap[type]) {
    schemaMap[type] = { type, title: '图表配置', sections: [chartFields] }
  }
})

export const getBigScreenComponentConfigSchema = (
  type: BigScreenComponentType,
): BigScreenComponentConfigSchema => schemaMap[type] ?? defaultSchema
