import { chartRegistry, createDefaultChartConfig, createEmptySlots, pruneSlotsForChart } from '@/components/visual-query/chartRegistry'
import {
  defaultAnnouncements,
  defaultPalettes,
  visualDatasets,
  visualFieldsByDataset,
  visualRowsByDataset,
} from '@/mock/visualAnalysis'
import type {
  AnnouncementConfig,
  DataSourceConfig,
  DatasetOption,
  ExpressionValidationResult,
  FieldRegistry,
  FilterConfig,
  PaletteConfig,
  QueryHistoryItem,
  QueryResult,
  QueryResultColumn,
  SavedVisualAnalysis,
  FieldSlots,
  SlotField,
  VisualChartType,
  VisualField,
  VisualFieldDataType,
  VisualFieldSlotKey,
  VisualQueryState,
} from '@/types/visualAnalysis'

interface TempDatasetRecord {
  source: Extract<DataSourceConfig, { sourceType: 'local_file' }>
  fields: VisualField[]
  rows: Array<Record<string, string | number | boolean | null>>
}

interface VisualAnalysisStorage {
  history: QueryHistoryItem[]
  palettes: PaletteConfig[]
  announcements: AnnouncementConfig[]
  tempDatasets: TempDatasetRecord[]
  cache: Record<string, QueryResult>
  savedAnalyses: SavedVisualAnalysis[]
  deletedSavedAnalysisIds: string[]
  sharedSavedAnalysisIds: string[]
  dashboardAnalysisIds: string[]
}

const storageKey = 'visual_analysis_demo_state_v2'
const currentUser = 'Chaoyang Xu'

const clone = <T>(value: T): T => {
  return JSON.parse(JSON.stringify(value)) as T
}

const pad = (value: number): string => String(value).padStart(2, '0')

const nowText = (date = new Date()): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`

const makeId = (prefix: string): string => `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`

const defaultStorage: VisualAnalysisStorage = {
  history: [],
  palettes: defaultPalettes,
  announcements: defaultAnnouncements,
  tempDatasets: [],
  cache: {},
  savedAnalyses: [],
  deletedSavedAnalysisIds: [],
  sharedSavedAnalysisIds: [],
  dashboardAnalysisIds: [],
}

function readStorage(): VisualAnalysisStorage {
  if (typeof window === 'undefined') return clone(defaultStorage)
  const stored = window.localStorage.getItem(storageKey)
  if (!stored) return clone(defaultStorage)
  try {
    const parsed = JSON.parse(stored) as Partial<VisualAnalysisStorage>
    return {
      history: parsed.history ?? [],
      palettes: parsed.palettes ?? defaultPalettes,
      announcements: parsed.announcements ?? defaultAnnouncements,
      tempDatasets: parsed.tempDatasets ?? [],
      cache: parsed.cache ?? {},
      savedAnalyses: parsed.savedAnalyses ?? [],
      deletedSavedAnalysisIds: parsed.deletedSavedAnalysisIds ?? [],
      sharedSavedAnalysisIds: parsed.sharedSavedAnalysisIds ?? [],
      dashboardAnalysisIds: parsed.dashboardAnalysisIds ?? [],
    }
  } catch {
    return clone(defaultStorage)
  }
}

function writeStorage(next: VisualAnalysisStorage): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(storageKey, JSON.stringify(next))
}

let storage = readStorage()

const delay = async (ms = 120): Promise<void> => {
  await new Promise((resolve) => window.setTimeout(resolve, ms))
}

function findDataset(datasetId: string): DatasetOption {
  const dataset = visualDatasets.find((item) => item.id === datasetId)
  if (!dataset) throw new Error('数据集加载失败，请稍后重试。')
  return dataset
}

function createFieldRegistry(fields: VisualField[]): FieldRegistry {
  return {
    datasetFields: clone(fields.filter((field) => field.source === 'dataset')),
    personalFields: clone(fields.filter((field) => field.source === 'personal' || field.source === 'calculated' || field.source === 'lod')),
    hierarchyFields: clone(fields.filter((field) => field.source === 'dynamic' && Boolean(field.hierarchyId))),
    groupFields: clone(fields.filter((field) => field.source === 'group')),
    dynamicFields: clone(fields.filter((field) => field.source === 'dynamic' && !field.hierarchyId)),
  }
}

export function flattenFields(registry: FieldRegistry): VisualField[] {
  return [
    ...registry.datasetFields,
    ...registry.personalFields,
    ...registry.hierarchyFields,
    ...registry.groupFields,
    ...registry.dynamicFields,
  ]
}

export function createDefaultVisualState(datasetId = 'ds_ad_watch_detail'): VisualQueryState {
  const dataset = findDataset(datasetId)
  const fields = clone(visualFieldsByDataset[dataset.id] ?? [])
  return {
    id: makeId('vq'),
    name: '未命名分析',
    source: {
      sourceType: 'dataset',
      datasetId: dataset.id,
      datasetName: dataset.name,
      accessMode: dataset.accessMode,
    },
    fields: createFieldRegistry(fields),
    chart: createDefaultChartConfig('table'),
    fieldSlots: createEmptySlots(),
    filters: [],
    dynamicControls: [],
    analysis: {
      sort: {
        enabled: false,
        fieldId: '',
        order: 'desc',
        manualOrder: [],
      },
      topN: {
        enabled: false,
        mode: 'result_rows',
        direction: 'top',
        n: 10,
        orderByMeasureId: '',
        includeOthers: false,
        othersLabel: '其他',
      },
      total: {
        enabled: false,
        displayName: '总计',
        position: 'top',
        basis: 'displayed_data',
        calculation: 'auto',
      },
      percentage: {
        enabled: false,
        measureId: '',
        basis: 'displayed_data',
        newFieldName: '占比',
      },
      compare: {
        enabled: false,
        groups: [
          { id: 'compare_current', name: '当前', filters: [] },
          { id: 'compare_target', name: '对照', filters: [] },
        ],
        measureIds: [],
      },
      periodCompare: {
        enabled: false,
        measureIds: [],
        dateFieldId: '',
        compareTypes: ['yoy', 'mom'],
        displayMode: 'both',
      },
      referenceLines: [
        {
          id: 'ref_avg',
          enabled: false,
          axis: 'y',
          type: 'average',
          label: '平均值',
          lineType: 'dashed',
          showLabel: true,
        },
      ],
      tableCalculation: {
        enabled: false,
        calculationType: 'running_sum',
        measureId: '',
        computeArea: 'table',
        addressing: 'down',
        newFieldName: '表计算',
      },
    },
    queryConfig: {
      autoQuery: false,
      cacheEnabled: true,
      samplingEnabled: false,
      samplingRows: 200,
      limit: 1000,
      timeoutMs: 60000,
    },
    annotations: [],
    tooltip: {
      enabled: true,
      trigger: 'item',
      displayFields: [],
      customText: '',
      linkedChartIds: [],
    },
    palette: clone(defaultPalettes[0]),
    uiState: {
      queryStatus: 'idle',
      activeRightTab: 'chart',
      activeBottomTab: 'result',
      cacheHit: false,
      sampled: false,
    },
    version: 1,
    updatedAt: nowText(),
  }
}

const savedFieldIds = {
  date: 'f_event_date',
  time: 'f_event_time',
  province: 'f_province',
  city: 'f_city',
  channel: 'f_channel',
  adPosition: 'f_ad_position',
  gameType: 'f_game_type',
  funnelStage: 'f_funnel_stage',
  keyword: 'f_keyword',
  revenue: 'f_revenue',
  watchCount: 'f_watch_count',
  activeUv: 'f_active_uv',
  conversionRate: 'f_conversion_rate',
  cost: 'f_cost',
  target: 'f_target',
  change: 'f_change',
}

const savedChartTypes: VisualChartType[] = [
  'column',
  'table',
  'pivot_table',
  'trend_table',
  'detail_table',
  'okr_table',
  'metric_card',
  'metric_trend',
  'bar',
  'line',
  'area',
  'dual_axis',
  'combo',
  'pie',
  'map',
  'scatter',
  'circle_view',
  'histogram',
  'word_cloud',
  'funnel',
  'radar',
  'sankey',
  'gauge',
  'progress',
  'waterfall',
  'sparkline',
  'pivot_chart',
  'bi_bar',
]

function slotFor(fieldId: string, fields: VisualField[]): SlotField[] {
  const field = fieldById(fields, fieldId)
  return field
    ? [{
      fieldId: field.id,
      displayName: field.displayName,
      aggregation: field.aggregation,
      dateGranularity: field.dateGranularity,
      visible: true,
    }]
    : []
}

function assignSlots(slots: FieldSlots, fields: VisualField[], slotKey: VisualFieldSlotKey, fieldIds: string[]): void {
  slots[slotKey] = fieldIds.flatMap((fieldId) => slotFor(fieldId, fields))
}

function makeSavedChartSlots(type: VisualChartType, fields: VisualField[]): FieldSlots {
  const slots = createEmptySlots()
  const ids = savedFieldIds
  if (type === 'table') {
    assignSlots(slots, fields, 'dimensions', [ids.date, ids.channel, ids.city])
    assignSlots(slots, fields, 'measures', [ids.revenue, ids.watchCount, ids.activeUv])
  } else if (type === 'pivot_table') {
    assignSlots(slots, fields, 'rowDimensions', [ids.channel])
    assignSlots(slots, fields, 'columnDimensions', [ids.adPosition])
    assignSlots(slots, fields, 'measures', [ids.revenue, ids.watchCount])
  } else if (type === 'trend_table') {
    assignSlots(slots, fields, 'dateDimensions', [ids.date])
    assignSlots(slots, fields, 'dimensions', [ids.channel])
    assignSlots(slots, fields, 'measures', [ids.revenue, ids.watchCount])
  } else if (type === 'detail_table') {
    assignSlots(slots, fields, 'dimensions', [ids.date, ids.channel, ids.city, ids.adPosition])
    assignSlots(slots, fields, 'measures', [ids.revenue, ids.watchCount])
  } else if (type === 'okr_table') {
    assignSlots(slots, fields, 'dimensions', [ids.channel])
    assignSlots(slots, fields, 'measures', [ids.revenue])
    assignSlots(slots, fields, 'secondaryYAxis', [ids.target])
  } else if (type === 'metric_card' || type === 'histogram') {
    assignSlots(slots, fields, 'measures', [ids.revenue])
  } else if (type === 'metric_trend') {
    assignSlots(slots, fields, 'dateDimensions', [ids.date])
    assignSlots(slots, fields, 'measures', [ids.revenue])
  } else if (type === 'column') {
    assignSlots(slots, fields, 'dimensions', [ids.date])
    assignSlots(slots, fields, 'measures', [ids.revenue])
    assignSlots(slots, fields, 'color', [ids.channel])
  } else if (type === 'bar') {
    assignSlots(slots, fields, 'dimensions', [ids.channel])
    assignSlots(slots, fields, 'measures', [ids.revenue])
    assignSlots(slots, fields, 'color', [ids.adPosition])
  } else if (type === 'line' || type === 'area') {
    assignSlots(slots, fields, 'dateDimensions', [ids.date])
    assignSlots(slots, fields, 'measures', [ids.revenue])
    assignSlots(slots, fields, 'color', [ids.channel])
  } else if (type === 'dual_axis' || type === 'combo') {
    assignSlots(slots, fields, 'xAxis', [ids.date])
    assignSlots(slots, fields, 'yAxis', [ids.revenue])
    assignSlots(slots, fields, 'secondaryYAxis', [ids.cost])
  } else if (type === 'pie') {
    assignSlots(slots, fields, 'dimensions', [ids.channel])
    assignSlots(slots, fields, 'measures', [ids.revenue])
  } else if (type === 'map') {
    assignSlots(slots, fields, 'dimensions', [ids.province])
    assignSlots(slots, fields, 'measures', [ids.revenue])
  } else if (type === 'scatter') {
    assignSlots(slots, fields, 'xAxis', [ids.revenue])
    assignSlots(slots, fields, 'yAxis', [ids.watchCount])
    assignSlots(slots, fields, 'size', [ids.activeUv])
    assignSlots(slots, fields, 'color', [ids.channel])
    assignSlots(slots, fields, 'detail', [ids.city])
  } else if (type === 'circle_view') {
    assignSlots(slots, fields, 'dimensions', [ids.channel])
    assignSlots(slots, fields, 'measures', [ids.activeUv])
    assignSlots(slots, fields, 'color', [ids.adPosition])
  } else if (type === 'word_cloud') {
    assignSlots(slots, fields, 'dimensions', [ids.keyword])
    assignSlots(slots, fields, 'measures', [ids.watchCount])
  } else if (type === 'funnel') {
    assignSlots(slots, fields, 'dimensions', [ids.funnelStage])
    assignSlots(slots, fields, 'measures', [ids.watchCount])
  } else if (type === 'radar') {
    assignSlots(slots, fields, 'dimensions', [ids.channel])
    assignSlots(slots, fields, 'measures', [ids.revenue, ids.watchCount, ids.activeUv])
  } else if (type === 'sankey') {
    assignSlots(slots, fields, 'dimensions', [ids.channel, ids.adPosition, ids.province])
    assignSlots(slots, fields, 'measures', [ids.watchCount])
  } else if (type === 'gauge') {
    assignSlots(slots, fields, 'measures', [ids.revenue])
    assignSlots(slots, fields, 'secondaryYAxis', [ids.target])
  } else if (type === 'progress') {
    assignSlots(slots, fields, 'dimensions', [ids.channel])
    assignSlots(slots, fields, 'measures', [ids.revenue])
    assignSlots(slots, fields, 'secondaryYAxis', [ids.target])
  } else if (type === 'waterfall') {
    assignSlots(slots, fields, 'dimensions', [ids.channel])
    assignSlots(slots, fields, 'measures', [ids.change])
  } else if (type === 'sparkline') {
    assignSlots(slots, fields, 'dateDimensions', [ids.date])
    assignSlots(slots, fields, 'dimensions', [ids.channel])
    assignSlots(slots, fields, 'measures', [ids.revenue])
  } else if (type === 'pivot_chart') {
    assignSlots(slots, fields, 'dimensions', [ids.channel])
    assignSlots(slots, fields, 'rowDimensions', [ids.adPosition])
    assignSlots(slots, fields, 'columnDimensions', [ids.province])
    assignSlots(slots, fields, 'measures', [ids.revenue])
  } else if (type === 'bi_bar') {
    assignSlots(slots, fields, 'dimensions', [ids.channel])
    assignSlots(slots, fields, 'yAxis', [ids.revenue])
    assignSlots(slots, fields, 'secondaryYAxis', [ids.cost])
  }
  return pruneSlotsForChart(type, slots)
}

function applyAdvancedSavedFeatures(state: VisualQueryState): void {
  const fields = flattenFields(state.fields)
  const ids = savedFieldIds
  const datasetId = 'ds_ad_watch_detail'
  const channel = fieldById(fields, ids.channel)
  const adPosition = fieldById(fields, ids.adPosition)
  const province = fieldById(fields, ids.province)
  const revenue = fieldById(fields, ids.revenue)
  const target = fieldById(fields, ids.target)
  if (!channel || !adPosition || !province || !revenue) return

  state.dynamicControls = [
    {
      id: 'saved_dynamic_dimension',
      type: 'dimension',
      label: '动态维度',
      candidateFieldIds: [ids.channel, ids.adPosition, ids.city, ids.province],
      selectedFieldId: ids.channel,
    },
    {
      id: 'saved_dynamic_measure',
      type: 'measure',
      label: '动态指标',
      candidateFieldIds: [ids.revenue, ids.watchCount, ids.activeUv, ids.cost],
      selectedFieldId: ids.revenue,
    },
  ]
  state.fields.dynamicFields = [
    {
      ...channel,
      id: 'saved_dynamic_dimension',
      name: 'saved_dynamic_dimension',
      displayName: '动态维度',
      source: 'dynamic',
      permission: { editable: true, deletable: true, canSetAlias: true, canSetGeoRole: false },
    },
    {
      ...revenue,
      id: 'saved_dynamic_measure',
      name: 'saved_dynamic_measure',
      displayName: '动态指标',
      source: 'dynamic',
      permission: { editable: true, deletable: true, canSetAlias: false, canSetGeoRole: false },
    },
  ]
  state.fields.personalFields = [
    {
      id: 'saved_calc_rate',
      datasetId,
      name: 'saved_calc_rate',
      displayName: '收益达成率',
      fieldType: 'measure',
      dataType: 'number',
      source: 'calculated',
      expression: target ? `[${revenue.displayName}] / [${target.displayName}]` : `[${revenue.displayName}]`,
      aggregation: 'sum',
      permission: { editable: true, deletable: true, canSetAlias: false, canSetGeoRole: false },
    },
  ]
  state.fields.groupFields = [
    {
      id: 'saved_group_channel',
      datasetId,
      name: 'saved_group_channel',
      displayName: '渠道分组',
      fieldType: 'dimension',
      dataType: 'string',
      source: 'group',
      groupConfig: {
        mode: 'text_group',
        sourceFieldId: ids.channel,
        groups: [{ groupName: '核心渠道', values: ['自然流量', '巨量引擎', '腾讯广告'] }],
        unmatchedStrategy: 'set_other',
        otherGroupName: '其他渠道',
      },
      permission: { editable: true, deletable: true, canSetAlias: true, canSetGeoRole: false },
    },
  ]
  state.fields.hierarchyFields = [
    {
      id: 'saved_hierarchy_geo',
      datasetId,
      name: 'saved_hierarchy_geo',
      displayName: '省市广告位层级',
      fieldType: 'dimension',
      dataType: 'string',
      source: 'dynamic',
      hierarchyId: 'saved_geo_hierarchy',
      expression: [ids.province, ids.city, ids.adPosition].join(' > '),
      permission: { editable: true, deletable: true, canSetAlias: false, canSetGeoRole: false },
    },
  ]

  const nextFields = flattenFields(state.fields)
  const slots = createEmptySlots()
  assignSlots(slots, nextFields, 'dimensions', [ids.date, 'saved_dynamic_dimension'])
  assignSlots(slots, nextFields, 'measures', ['saved_dynamic_measure', 'saved_calc_rate'])
  assignSlots(slots, nextFields, 'color', ['saved_group_channel'])
  state.fieldSlots = pruneSlotsForChart('column', slots)
  state.filters = [
    {
      id: 'saved_filter_dimension',
      type: 'dimension',
      fieldId: ids.channel,
      inputMode: 'manual',
      operator: 'in',
      value: '自然流量,巨量引擎',
      logic: 'AND',
    },
    {
      id: 'saved_filter_metric',
      type: 'metric',
      fieldId: ids.revenue,
      metricScope: 'result',
      operator: 'gte',
      value: 1000,
      logic: 'AND',
    },
    {
      id: 'saved_filter_date',
      type: 'date',
      fieldId: ids.date,
      dateMode: 'fixed',
      operator: 'between',
      startValue: '2026-05-01',
      endValue: '2026-05-20',
      logic: 'AND',
    },
    {
      id: 'saved_filter_combined',
      type: 'combined',
      fieldId: '',
      operator: 'equals',
      value: '',
      logic: 'OR',
      children: [
        { id: 'saved_filter_child_1', type: 'dimension', fieldId: ids.channel, inputMode: 'condition', operator: 'contains', value: '流量', logic: 'AND' },
        { id: 'saved_filter_child_2', type: 'dimension', fieldId: ids.adPosition, inputMode: 'sub_query', operator: 'in', subQueryText: '激励视频,开屏,信息流', logic: 'AND' },
      ],
    },
    {
      id: 'saved_filter_cascade',
      type: 'cascade',
      fieldId: ids.adPosition,
      parentFieldId: ids.province,
      inputMode: 'condition',
      operator: 'contains',
      value: '',
      logic: 'AND',
    },
  ]
  state.analysis.sort = {
    enabled: true,
    fieldId: ids.date,
    order: 'asc',
    manualOrder: ['自然流量', '巨量引擎', '腾讯广告'],
  }
  state.analysis.topN = {
    enabled: true,
    mode: 'dimension_items',
    direction: 'top',
    n: 12,
    dimensionFieldId: ids.channel,
    orderByMeasureId: ids.revenue,
    includeOthers: true,
    othersLabel: '其他',
  }
  state.analysis.total = {
    enabled: true,
    displayName: '总计',
    position: 'bottom',
    basis: 'displayed_data',
    calculation: 'auto',
  }
  state.analysis.percentage.enabled = true
  state.analysis.percentage.measureId = ids.revenue
  state.analysis.compare.enabled = true
  state.analysis.compare.measureIds = [ids.revenue]
  state.analysis.periodCompare.enabled = true
  state.analysis.periodCompare.dateFieldId = ids.date
  state.analysis.periodCompare.measureIds = [ids.revenue]
  state.analysis.referenceLines[0]!.enabled = true
  state.analysis.tableCalculation.enabled = true
  state.analysis.tableCalculation.measureId = ids.revenue
  state.tooltip = {
    enabled: true,
    trigger: 'item',
    displayFields: [ids.channel, ids.revenue, 'saved_calc_rate'],
    customText: '保存分析：覆盖筛选、分析计算、动态字段、标注、Tooltip 与配色。',
    linkedChartIds: [],
  }
  state.annotations = [
    {
      id: 'saved_annotation_point',
      type: 'point',
      fieldId: ids.channel,
      value: '自然流量',
      content: '关键数据点',
      position: { x: 58, y: 22 },
    },
    {
      id: 'saved_annotation_range',
      type: 'range',
      dateFieldId: ids.date,
      startDate: '2026-05-06',
      endDate: '2026-05-12',
      content: '活动周期',
      position: { x: 22, y: 28 },
    },
  ]
  state.palette = clone(defaultPalettes[1] ?? defaultPalettes[0])
  state.uiState.activeRightTab = 'enhance'
}

function makeSavedVisualAnalysis(type: VisualChartType, index: number): SavedVisualAnalysis {
  const enhanced = type === 'column'
  const state = createDefaultVisualState('ds_ad_watch_detail')
  const chartLabel = chartRegistry[type].label
  state.id = `saved_visual_${type}`
  state.name = enhanced ? '综合功能验收分析' : `${chartLabel}保存分析`
  state.chart = {
    ...createDefaultChartConfig(type),
    title: enhanced ? '综合功能验收分析' : `${chartLabel}保存分析`,
    description: enhanced ? '覆盖筛选、字段、分析、增强和查询辅助配置。' : `用于演示${chartLabel}的保存分析配置。`,
  }
  state.fieldSlots = makeSavedChartSlots(type, flattenFields(state.fields))
  state.analysis.topN.orderByMeasureId = savedFieldIds.revenue
  state.analysis.percentage.measureId = savedFieldIds.revenue
  state.analysis.compare.measureIds = [savedFieldIds.revenue]
  state.analysis.periodCompare.measureIds = [savedFieldIds.revenue]
  state.analysis.periodCompare.dateFieldId = savedFieldIds.date
  state.analysis.tableCalculation.measureId = savedFieldIds.revenue
  state.tooltip.displayFields = [savedFieldIds.channel, savedFieldIds.revenue]
  state.updatedAt = `2026-05-${String(24 - Math.min(index, 20)).padStart(2, '0')} 10:${String(index).padStart(2, '0')}:00`
  if (['trend_table', 'metric_trend', 'line', 'area', 'sparkline'].includes(type)) {
    state.analysis.periodCompare.enabled = true
  }
  if (['line', 'area', 'dual_axis', 'combo', 'column', 'bar'].includes(type)) {
    state.analysis.referenceLines[0]!.enabled = true
  }
  if (['table', 'pivot_table', 'trend_table', 'detail_table'].includes(type)) {
    state.analysis.total.enabled = true
    state.analysis.percentage.enabled = true
  }
  if (['pie', 'bar', 'column', 'funnel', 'word_cloud', 'circle_view'].includes(type)) {
    state.analysis.topN.enabled = true
    state.analysis.topN.n = 8
    state.analysis.topN.dimensionFieldId = savedFieldIds.channel
    state.analysis.topN.includeOthers = true
  }
  if (enhanced) {
    applyAdvancedSavedFeatures(state)
  }

  return {
    id: `saved_visual_${type}`,
    name: state.name ?? `${chartLabel}保存分析`,
    description: enhanced
      ? '一份综合保存分析，覆盖字段、筛选、分析计算、查询辅助和图表增强。'
      : `预置${chartLabel}配置，选择后自动恢复并查询。`,
    chartType: type,
    featureTags: enhanced
      ? ['数据源', '字段', '筛选', '图表', '分析', '查询辅助', '增强']
      : [chartLabel, chartRegistry[type].group],
    updatedAt: state.updatedAt ?? nowText(),
    state,
  }
}

function createSavedVisualAnalyses(): SavedVisualAnalysis[] {
  return savedChartTypes.map((type, index) => makeSavedVisualAnalysis(type, index))
}

function savedFeatureTags(state: VisualQueryState): string[] {
  const tags = new Set<string>([
    chartRegistry[state.chart.type].label,
    chartRegistry[state.chart.type].group,
  ])
  if (state.filters.length) tags.add('筛选')
  if (state.dynamicControls.length || flattenFields(state.fields).some((field) => field.source !== 'dataset')) tags.add('字段')
  if (
    state.analysis.sort.enabled ||
    state.analysis.topN.enabled ||
    state.analysis.total.enabled ||
    state.analysis.percentage.enabled ||
    state.analysis.compare.enabled ||
    state.analysis.periodCompare.enabled ||
    state.analysis.referenceLines.some((line) => line.enabled) ||
    state.analysis.tableCalculation.enabled
  ) {
    tags.add('分析')
  }
  if (state.annotations.length || state.tooltip.enabled || state.palette) tags.add('增强')
  if (state.queryConfig.cacheEnabled || state.queryConfig.samplingEnabled || state.queryConfig.autoQuery) tags.add('查询辅助')
  return Array.from(tags)
}

function mergedSavedVisualAnalyses(): SavedVisualAnalysis[] {
  const hidden = new Set(storage.deletedSavedAnalysisIds)
  const merged = new Map<string, SavedVisualAnalysis>()
  createSavedVisualAnalyses()
    .filter((analysis) => !hidden.has(analysis.id))
    .forEach((analysis) => merged.set(analysis.id, analysis))
  storage.savedAnalyses
    .filter((analysis) => !hidden.has(analysis.id))
    .forEach((analysis) => merged.set(analysis.id, analysis))
  return Array.from(merged.values()).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}

export async function listSavedVisualAnalyses(keyword = ''): Promise<SavedVisualAnalysis[]> {
  await delay()
  const normalized = keyword.trim().toLowerCase()
  return clone(mergedSavedVisualAnalyses().filter((analysis) =>
    !normalized ||
    analysis.name.toLowerCase().includes(normalized) ||
    analysis.description.toLowerCase().includes(normalized) ||
    analysis.featureTags.some((tag) => tag.toLowerCase().includes(normalized)),
  ))
}

export async function saveCurrentVisualAnalysis(input: {
  analysisId?: string
  name: string
  description?: string
  state: VisualQueryState
  overwrite?: boolean
}): Promise<SavedVisualAnalysis> {
  await delay()
  const name = input.name.trim()
  if (!name) throw new Error('保存分析名称不能为空')
  const updatedAt = nowText()
  const id = input.overwrite && input.analysisId ? input.analysisId : makeId('saved_visual_custom')
  const nextState = clone(input.state)
  nextState.id = id
  nextState.name = name
  nextState.updatedAt = updatedAt
  nextState.uiState = {
    ...nextState.uiState,
    queryStatus: 'idle',
    cacheHit: false,
    sampled: false,
    errorMessage: '',
  }
  const saved: SavedVisualAnalysis = {
    id,
    name,
    description: input.description?.trim() || `${chartRegistry[nextState.chart.type].label}保存分析`,
    chartType: nextState.chart.type,
    featureTags: savedFeatureTags(nextState),
    updatedAt,
    state: nextState,
  }
  storage.savedAnalyses = [saved, ...storage.savedAnalyses.filter((analysis) => analysis.id !== id)]
  storage.deletedSavedAnalysisIds = storage.deletedSavedAnalysisIds.filter((item) => item !== id)
  writeStorage(storage)
  return clone(saved)
}

export async function deleteSavedVisualAnalysis(id: string): Promise<{ success: boolean, message: string }> {
  await delay()
  const exists = mergedSavedVisualAnalyses().some((analysis) => analysis.id === id)
  if (!exists) throw new Error('保存分析不存在或已删除')
  const builtinExists = createSavedVisualAnalyses().some((analysis) => analysis.id === id)
  storage.savedAnalyses = storage.savedAnalyses.filter((analysis) => analysis.id !== id)
  if (builtinExists && !storage.deletedSavedAnalysisIds.includes(id)) {
    storage.deletedSavedAnalysisIds.push(id)
  }
  storage.sharedSavedAnalysisIds = storage.sharedSavedAnalysisIds.filter((item) => item !== id)
  storage.dashboardAnalysisIds = storage.dashboardAnalysisIds.filter((item) => item !== id)
  writeStorage(storage)
  return { success: true, message: '保存分析已删除。' }
}

export async function shareSavedVisualAnalysis(id: string): Promise<{ shareUrl: string, message: string }> {
  await delay()
  const analysis = mergedSavedVisualAnalyses().find((item) => item.id === id)
  if (!analysis) throw new Error('请先选择可分享的保存分析')
  if (!storage.sharedSavedAnalysisIds.includes(id)) storage.sharedSavedAnalysisIds.push(id)
  writeStorage(storage)
  const baseUrl = typeof window === 'undefined'
    ? '/analysis-center/visual-query'
    : `${window.location.origin}${window.location.pathname}`
  const shareUrl = `${baseUrl}?analysis=${encodeURIComponent(id)}`
  return { shareUrl, message: `分享链接已生成：${analysis.name}` }
}

export async function addSavedAnalysisToDashboard(id: string): Promise<{ success: boolean, message: string }> {
  await delay()
  const analysis = mergedSavedVisualAnalyses().find((item) => item.id === id)
  if (!analysis) throw new Error('请先选择可加入仪表盘的保存分析')
  if (!storage.dashboardAnalysisIds.includes(id)) storage.dashboardAnalysisIds.push(id)
  writeStorage(storage)
  return { success: true, message: `已添加到仪表盘：${analysis.name}` }
}

export async function listDatasetOptions(keyword = ''): Promise<DatasetOption[]> {
  await delay()
  const normalized = keyword.trim().toLowerCase()
  return visualDatasets
    .filter((dataset) => dataset.permission !== 'none')
    .filter((dataset) => !normalized || dataset.name.toLowerCase().includes(normalized))
    .sort((a, b) => (b.lastVisitedAt ?? '').localeCompare(a.lastVisitedAt ?? ''))
    .map((dataset) => clone(dataset))
}

export async function getDatasetFields(datasetId: string): Promise<VisualField[]> {
  await delay()
  return clone(visualFieldsByDataset[datasetId] ?? [])
}

function tempDataset(source: DataSourceConfig): TempDatasetRecord | undefined {
  if (source.sourceType !== 'local_file') return undefined
  return storage.tempDatasets.find((item) => item.source.tempDatasetId === source.tempDatasetId)
}

export async function getRowsForSource(source: DataSourceConfig): Promise<Array<Record<string, string | number | boolean | null>>> {
  await delay()
  if (source.sourceType === 'local_file') {
    const temp = tempDataset(source)
    if (!temp) throw new Error('本地文件临时数据已过期，请重新上传')
    return clone(temp.rows)
  }
  return clone(visualRowsByDataset[source.datasetId] ?? [])
}

export async function getFieldsForSource(source: DataSourceConfig): Promise<VisualField[]> {
  await delay()
  if (source.sourceType === 'local_file') {
    const temp = tempDataset(source)
    if (!temp) throw new Error('本地文件临时数据已过期，请重新上传')
    return clone(temp.fields)
  }
  return getDatasetFields(source.datasetId)
}

function inferDataType(values: Array<string | number | boolean | null>): VisualFieldDataType {
  const filled = values.filter((value) => value !== null && value !== '')
  if (!filled.length) return 'unknown'
  if (filled.every((value) => !Number.isNaN(Number(value)))) return 'number'
  if (filled.every((value) => !Number.isNaN(Date.parse(String(value))))) {
    return filled.some((value) => String(value).includes(':')) ? 'datetime' : 'date'
  }
  return 'string'
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let current = ''
  let row: string[] = []
  let quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] ?? ''
    const next = text[index + 1] ?? ''
    if (char === '"' && quoted && next === '"') {
      current += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      row.push(current)
      current = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1
      row.push(current)
      if (row.some((cell) => cell.trim())) rows.push(row)
      row = []
      current = ''
    } else {
      current += char
    }
  }
  row.push(current)
  if (row.some((cell) => cell.trim())) rows.push(row)
  return rows
}

function normalizeCell(value: string, dataType: VisualFieldDataType): string | number | boolean | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (dataType === 'number') return Number(trimmed)
  if (dataType === 'boolean') return trimmed === 'true' || trimmed === '是'
  return trimmed
}

export async function createLocalFileDataset(file: File, text?: string): Promise<{ source: DataSourceConfig, fields: VisualField[] }> {
  await delay(220)
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!['csv', 'xlsx', 'xls'].includes(ext)) {
    throw new Error('仅支持 CSV / Excel 文件')
  }
  if (file.size > 500 * 1024 * 1024) {
    throw new Error('文件大小不能超过 500MB')
  }

  const tempDatasetId = makeId('tmp_file')
  const expireDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const source: DataSourceConfig = {
    sourceType: 'local_file',
    tempDatasetId,
    fileName: file.name,
    fileType: ext as 'csv' | 'xlsx' | 'xls',
    fileSize: file.size,
    expireAt: nowText(expireDate),
  }

  let headers: string[]
  let rawRows: string[][]
  if (ext === 'csv' && text) {
    const parsed = parseCsv(text)
    headers = (parsed[0] ?? []).map((item, index) => item.trim() || `字段${index + 1}`)
    rawRows = parsed.slice(1, 101)
  } else {
    headers = ['日期', '城市', '渠道', '收入', '订单数', '目标值']
    rawRows = Array.from({ length: 36 }, (_, index) => [
      `2026-05-${pad((index % 20) + 1)}`,
      ['上海', '杭州', '广州', '北京'][index % 4] ?? '上海',
      ['自然流量', '巨量引擎', '小红书'][index % 3] ?? '自然流量',
      String(5200 + index * 186),
      String(60 + (index % 12) * 7),
      String(6800 + index * 160),
    ])
  }
  if (!headers.length) throw new Error('文件未识别到字段名')

  const dataTypes = headers.map((_, index) => inferDataType(rawRows.map((row) => row[index] ?? null)))
  const fields: VisualField[] = headers.map((header, index) => {
    const dataType = dataTypes[index] ?? 'string'
    const isMeasure = dataType === 'number'
    return {
      id: `${tempDatasetId}_f_${index}`,
      datasetId: tempDatasetId,
      name: header,
      displayName: header,
      fieldType: isMeasure ? 'measure' : 'dimension',
      dataType,
      semanticType: dataType === 'date' || dataType === 'datetime' ? 'date' : 'normal',
      source: 'dataset',
      aggregation: isMeasure ? 'sum' : undefined,
      dateGranularity: dataType === 'date' || dataType === 'datetime' ? 'day' : undefined,
      permission: {
        editable: true,
        deletable: false,
        canSetAlias: !isMeasure,
        canSetGeoRole: !isMeasure,
      },
    }
  })
  const rows = rawRows.map((row) =>
    headers.reduce<Record<string, string | number | boolean | null>>((result, header, index) => {
      result[header] = normalizeCell(row[index] ?? '', dataTypes[index] ?? 'string')
      return result
    }, {}),
  )

  storage.tempDatasets = storage.tempDatasets.filter((item) => item.source.tempDatasetId !== tempDatasetId)
  storage.tempDatasets.push({ source, fields, rows })
  writeStorage(storage)
  return { source, fields }
}

function fieldById(fields: VisualField[], fieldId: string): VisualField | undefined {
  return fields.find((field) => field.id === fieldId)
}

function cellValue(row: Record<string, string | number | boolean | null>, field?: VisualField): string | number | boolean | null {
  if (!field) return null
  return row[field.name] ?? null
}

function splitInputValues(value?: string | number, valueList?: Array<string | number>): string[] {
  if (valueList?.length) return valueList.map(String)
  return String(value ?? '')
    .split(/[,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function compareRange(value: string | number | boolean | null, start?: string | number, end?: string | number): boolean {
  const text = String(value ?? '')
  const valueDate = Date.parse(text)
  const startDate = Date.parse(String(start ?? ''))
  const endDate = Date.parse(String(end ?? ''))
  if (!Number.isNaN(valueDate) && (!Number.isNaN(startDate) || !Number.isNaN(endDate))) {
    return (Number.isNaN(startDate) || valueDate >= startDate) && (Number.isNaN(endDate) || valueDate <= endDate)
  }
  return Number(value) >= Number(start) && Number(value) <= Number(end)
}

function passesFilter(row: Record<string, string | number | boolean | null>, filter: FilterConfig, fields: VisualField[]): boolean {
  if (!filter.fieldId && filter.type !== 'combined') return true
  if (filter.type === 'combined' && filter.children?.length) {
    return filter.logic === 'AND'
      ? filter.children.every((child) => passesFilter(row, child, fields))
      : filter.children.some((child) => passesFilter(row, child, fields))
  }
  const field = fieldById(fields, filter.fieldId)
  const value = cellValue(row, field)
  const text = String(value ?? '')
  const target = String(filter.value ?? '')
  if (filter.inputMode === 'manual') return splitInputValues(filter.value, filter.valueList).includes(text)
  if (filter.inputMode === 'sub_query') return splitInputValues(filter.subQueryText ?? filter.value, filter.valueList).includes(text)
  if (filter.dateMode === 'fixed' && filter.operator !== 'between') return compareRange(value, filter.startValue ?? filter.value, filter.endValue ?? filter.value)
  if (filter.operator === 'equals') return text === target
  if (filter.operator === 'not_equals') return text !== target
  if (filter.operator === 'contains') return text.includes(target)
  if (filter.operator === 'in') return splitInputValues(filter.value, filter.valueList).includes(text)
  if (filter.operator === 'gt') return Number(value) > Number(filter.value)
  if (filter.operator === 'gte') return Number(value) >= Number(filter.value)
  if (filter.operator === 'lt') return Number(value) < Number(filter.value)
  if (filter.operator === 'lte') return Number(value) <= Number(filter.value)
  if (filter.operator === 'between') return compareRange(value, filter.startValue, filter.endValue)
  if (filter.operator === 'last_n_days') {
    const dateValue = Date.parse(text)
    if (Number.isNaN(dateValue)) return true
    const days = Number(filter.value ?? 7)
    return dateValue >= Date.now() - days * 24 * 60 * 60 * 1000
  }
  return true
}

function isResultMetricFilter(filter: FilterConfig): boolean {
  return filter.type === 'metric' && filter.metricScope === 'result'
}

function applyAlias(value: string | number | boolean | null, field: VisualField): string | number | boolean | null {
  if (!field.aliasConfig?.mappings?.length) return value
  const matched = field.aliasConfig.mappings.find((item) => item.rawValue === String(value ?? ''))
  return matched?.aliasValue || value
}

function applyVirtualFields(
  rows: Array<Record<string, string | number | boolean | null>>,
  fields: VisualField[],
  state: VisualQueryState,
): Array<Record<string, string | number | boolean | null>> {
  return rows.map((row) => {
    const next = { ...row }
    fields.forEach((field) => {
      if (field.source === 'group' && field.groupConfig) {
        const source = fieldById(fields, field.groupConfig.sourceFieldId)
        const sourceValue = source ? next[source.name] : null
        if (field.groupConfig.mode === 'text_group') {
          const matched = field.groupConfig.groups?.find((group) => group.values.includes(String(sourceValue ?? '')))
          next[field.name] = matched?.groupName ?? (field.groupConfig.unmatchedStrategy === 'keep_original' ? String(sourceValue ?? '') : field.groupConfig.otherGroupName ?? '其他')
        } else {
          const number = Number(sourceValue ?? 0)
          const matched = field.groupConfig.bins?.find((bin) =>
            (bin.min === undefined || (bin.includeMin ? number >= bin.min : number > bin.min)) &&
            (bin.max === undefined || (bin.includeMax ? number <= bin.max : number < bin.max)),
          )
          next[field.name] = matched?.name ?? field.groupConfig.otherGroupName ?? '其他'
        }
      }
      if (field.hierarchyId && field.expression) {
        next[field.name] = field.expression
          .split(' > ')
          .map((fieldId) => {
            const source = fieldById(fields, fieldId)
            return source ? String(next[source.name] ?? '') : ''
          })
          .filter(Boolean)
          .join(' / ')
      }
      const dynamic = state.dynamicControls.find((control) => control.id === field.id)
      if (dynamic) {
        const source = fieldById(fields, dynamic.selectedFieldId)
        next[field.name] = source ? next[source.name] ?? null : null
      }
      if ((field.source === 'calculated' || field.source === 'lod') && field.expression) {
        const refs = [...field.expression.matchAll(/\[([^\]]+)\]/g)]
          .map((match) => match[1] ?? '')
          .map((name) => fields.find((item) => item.displayName === name || item.name === name))
          .filter((item): item is VisualField => Boolean(item))
        if (refs.length >= 2 && field.expression.includes('/')) {
          const left = Number(next[refs[0]?.name ?? ''] ?? 0)
          const right = Number(next[refs[1]?.name ?? ''] ?? 0)
          next[field.name] = right ? Number((left / right).toFixed(4)) : 0
        } else if (refs[0]) {
          next[field.name] = next[refs[0].name] ?? null
        } else {
          next[field.name] = field.fieldType === 'measure' ? 1 : field.displayName
        }
      }
    })
    return next
  })
}

function selectedSlotFields(state: VisualQueryState, keys: VisualFieldSlotKey[]): SlotField[] {
  const result: SlotField[] = []
  keys.forEach((key) => {
    state.fieldSlots[key].forEach((field) => {
      if (!result.some((item) => item.fieldId === field.fieldId)) result.push(field)
    })
  })
  return result
}

function collectQueryDimensions(state: VisualQueryState, fields: VisualField[]): VisualField[] {
  const slots = selectedSlotFields(state, ['dateDimensions', 'dimensions', 'rowDimensions', 'columnDimensions', 'xAxis', 'color', 'detail'])
  return slots
    .map((slotField) => fieldById(fields, slotField.fieldId))
    .filter((field): field is VisualField => Boolean(field && field.fieldType === 'dimension'))
}

function collectQueryMeasures(state: VisualQueryState, fields: VisualField[]): VisualField[] {
  const slots = selectedSlotFields(state, ['measures', 'yAxis', 'secondaryYAxis', 'xAxis', 'size'])
  return slots
    .map((slotField) => fieldById(fields, slotField.fieldId))
    .filter((field): field is VisualField => Boolean(field && field.fieldType === 'measure'))
}

function uniqueFields(fields: VisualField[]): VisualField[] {
  return fields.filter((field, index, list) => list.findIndex((item) => item.id === field.id) === index)
}

function aggregateRows(
  rows: Array<Record<string, string | number | boolean | null>>,
  dimensions: VisualField[],
  measures: VisualField[],
): Array<Record<string, string | number | boolean | null>> {
  if (!dimensions.length && !measures.length) return rows
  if (!dimensions.length) {
    return [
      measures.reduce<Record<string, string | number | boolean | null>>((result, measure) => {
        result[measure.name] = rows.reduce((sum, row) => sum + Number(row[measure.name] ?? 0), 0)
        return result
      }, { 分组: '总计' }),
    ]
  }
  const groups = new Map<string, { values: Record<string, string | number | boolean | null>, count: number }>()
  rows.forEach((row) => {
    const key = dimensions.map((dimension) => String(row[dimension.name] ?? '空值')).join('|||')
    const current = groups.get(key) ?? {
      values: dimensions.reduce<Record<string, string | number | boolean | null>>((result, dimension) => {
        result[dimension.name] = applyAlias(row[dimension.name] ?? '空值', dimension)
        return result
      }, {}),
      count: 0,
    }
    current.count += 1
    measures.forEach((measure) => {
      const oldValue = Number(current.values[measure.name] ?? 0)
      current.values[measure.name] = oldValue + Number(row[measure.name] ?? 0)
    })
    groups.set(key, current)
  })
  return Array.from(groups.values()).map((group) => {
    measures.forEach((measure) => {
      if (measure.aggregation === 'avg') {
        group.values[measure.name] = Number(group.values[measure.name] ?? 0) / Math.max(group.count, 1)
      }
      if (measure.aggregation === 'count') {
        group.values[measure.name] = group.count
      }
    })
    return group.values
  })
}

function sortRows(rows: QueryResult['rows'], state: VisualQueryState, fields: VisualField[]): QueryResult['rows'] {
  if (!state.analysis.sort.enabled || !state.analysis.sort.fieldId) return rows
  const field = fieldById(fields, state.analysis.sort.fieldId)
  if (!field) return rows
  return [...rows].sort((a, b) => {
    const left = a[field.name]
    const right = b[field.name]
    if (state.analysis.sort.order === 'manual') {
      const leftIndex = state.analysis.sort.manualOrder.indexOf(String(left))
      const rightIndex = state.analysis.sort.manualOrder.indexOf(String(right))
      if (leftIndex >= 0 || rightIndex >= 0) {
        return (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex) - (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex)
      }
      return 0
    }
    const modifier = state.analysis.sort.order === 'asc' ? 1 : -1
    if (typeof left === 'number' && typeof right === 'number') return (left - right) * modifier
    return String(left ?? '').localeCompare(String(right ?? '')) * modifier
  })
}

function applyTopN(rows: QueryResult['rows'], state: VisualQueryState, fields: VisualField[]): QueryResult['rows'] {
  if (!state.analysis.topN.enabled) return rows
  const measure = fieldById(fields, state.analysis.topN.orderByMeasureId)
  const n = Math.max(1, Number(state.analysis.topN.n) || 10)
  const sorted = measure
    ? [...rows].sort((a, b) => (Number(b[measure.name] ?? 0) - Number(a[measure.name] ?? 0)) * (state.analysis.topN.direction === 'top' ? 1 : -1))
    : [...rows]
  const kept = sorted.slice(0, n)
  if (!state.analysis.topN.includeOthers || !measure || sorted.length <= n) return kept
  const othersValue = sorted.slice(n).reduce((sum, row) => sum + Number(row[measure.name] ?? 0), 0)
  const dimension = fieldById(fields, state.analysis.topN.dimensionFieldId ?? '')
  if (!dimension) return kept
  return [
    ...kept,
    {
      [dimension.name]: state.analysis.topN.othersLabel,
      [measure.name]: othersValue,
    },
  ]
}

function applyDerivedColumns(rows: QueryResult['rows'], state: VisualQueryState, fields: VisualField[]): { rows: QueryResult['rows'], columns: QueryResultColumn[] } {
  const derivedColumns: QueryResultColumn[] = []
  let nextRows = rows.map((row) => ({ ...row }))
  const percentageField = fieldById(fields, state.analysis.percentage.measureId)
  if (state.analysis.percentage.enabled && percentageField) {
    const total = nextRows.reduce((sum, row) => sum + Number(row[percentageField.name] ?? 0), 0)
    nextRows = nextRows.map((row) => ({
      ...row,
      [state.analysis.percentage.newFieldName]: total ? Number(row[percentageField.name] ?? 0) / total : 0,
    }))
    derivedColumns.push({
      fieldId: 'derived_percentage',
      name: state.analysis.percentage.newFieldName,
      displayName: state.analysis.percentage.newFieldName,
      dataType: 'number',
      fieldType: 'measure',
    })
  }
  const tableCalcField = fieldById(fields, state.analysis.tableCalculation.measureId)
  if (state.analysis.tableCalculation.enabled && tableCalcField) {
    let running = 0
    const values = nextRows.map((row) => Number(row[tableCalcField.name] ?? 0))
    const sorted = [...values].sort((a, b) => b - a)
    nextRows = nextRows.map((row, index) => {
      const value = Number(row[tableCalcField.name] ?? 0)
      running += value
      const previous = index > 0 ? values[index - 1] ?? 0 : value
      const nextValue =
        state.analysis.tableCalculation.calculationType === 'total_percent'
          ? value / Math.max(values.reduce((sum, item) => sum + item, 0), 1)
          : state.analysis.tableCalculation.calculationType === 'difference'
            ? value - previous
            : state.analysis.tableCalculation.calculationType === 'percent_difference'
              ? previous ? (value - previous) / previous : 0
              : state.analysis.tableCalculation.calculationType === 'rank'
                ? sorted.indexOf(value) + 1
                : state.analysis.tableCalculation.calculationType === 'moving_average'
                  ? values.slice(Math.max(0, index - 2), index + 1).reduce((sum, item) => sum + item, 0) / Math.min(index + 1, 3)
                  : running
      return { ...row, [state.analysis.tableCalculation.newFieldName]: Number(nextValue.toFixed(4)) }
    })
    derivedColumns.push({
      fieldId: 'derived_table_calc',
      name: state.analysis.tableCalculation.newFieldName,
      displayName: state.analysis.tableCalculation.newFieldName,
      dataType: 'number',
      fieldType: 'measure',
    })
  }
  return { rows: nextRows, columns: derivedColumns }
}

function applyPeriodCompareColumns(rows: QueryResult['rows'], state: VisualQueryState, fields: VisualField[]): { rows: QueryResult['rows'], columns: QueryResultColumn[] } {
  if (!state.analysis.periodCompare.enabled) return { rows, columns: [] }
  const measure = fieldById(fields, state.analysis.periodCompare.measureIds[0] || state.analysis.percentage.measureId || state.analysis.topN.orderByMeasureId)
    ?? fields.find((field) => field.fieldType === 'measure')
  if (!measure) return { rows, columns: [] }
  const nextRows = rows.map((row, index) => {
    const current = Number(row[measure.name] ?? 0)
    const previous = Number(rows[index - 1]?.[measure.name] ?? 0)
    const samePeriod = Number(rows[index - 7]?.[measure.name] ?? 0)
    const yoyRate = samePeriod ? (current - samePeriod) / samePeriod : null
    const momRate = previous ? (current - previous) / previous : null
    return {
      ...row,
      同比: yoyRate === null ? null : Number(yoyRate.toFixed(4)),
      环比: momRate === null ? null : Number(momRate.toFixed(4)),
    }
  })
  return {
    rows: nextRows,
    columns: [
      { fieldId: 'derived_yoy', name: '同比', displayName: '同比', dataType: 'number', fieldType: 'measure' },
      { fieldId: 'derived_mom', name: '环比', displayName: '环比', dataType: 'number', fieldType: 'measure' },
    ],
  }
}

function applyCompareColumns(rows: QueryResult['rows'], state: VisualQueryState, fields: VisualField[]): { rows: QueryResult['rows'], columns: QueryResultColumn[] } {
  if (!state.analysis.compare.enabled || state.analysis.compare.groups.length < 2) return { rows, columns: [] }
  const measureIds = state.analysis.compare.measureIds.length ? state.analysis.compare.measureIds : [state.analysis.topN.orderByMeasureId]
  const measures = measureIds.map((id) => fieldById(fields, id)).filter((field): field is VisualField => Boolean(field))
  if (!measures.length) return { rows, columns: [] }
  const nextRows = rows.map((row, index) => {
    const additions = state.analysis.compare.groups.reduce<Record<string, number>>((result, group, groupIndex) => {
      measures.forEach((measure) => {
        result[`${group.name}_${measure.displayName}`] = Number((Number(row[measure.name] ?? 0) * (1 + (groupIndex - 0.5) * 0.12 + (index % 3) * 0.015)).toFixed(2))
      })
      return result
    }, {})
    return { ...row, ...additions }
  })
  return {
    rows: nextRows,
    columns: state.analysis.compare.groups.flatMap((group) =>
      measures.map((measure) => ({
        fieldId: `compare_${group.id}_${measure.id}`,
        name: `${group.name}_${measure.displayName}`,
        displayName: `${group.name}_${measure.displayName}`,
        dataType: 'number' as const,
        fieldType: 'measure' as const,
      })),
    ),
  }
}

function applyTotalRow(
  rows: QueryResult['rows'],
  basisRows: QueryResult['rows'],
  state: VisualQueryState,
  columns: QueryResultColumn[],
): QueryResult['rows'] {
  if (!state.analysis.total.enabled || !rows.length) return rows
  const measureColumns = columns.filter((column) => column.fieldType === 'measure')
  if (!measureColumns.length) return rows
  const totalRow = columns.reduce<Record<string, string | number | boolean | null>>((result, column, index) => {
    if (index === 0) {
      result[column.name] = state.analysis.total.displayName
      return result
    }
    if (column.fieldType !== 'measure') {
      result[column.name] = ''
      return result
    }
    const values = basisRows.map((row) => Number(row[column.name] ?? 0)).filter(Number.isFinite)
    const calc = state.analysis.total.calculation
    const value =
      calc === 'avg'
        ? values.reduce((sum, item) => sum + item, 0) / Math.max(values.length, 1)
        : calc === 'max'
          ? Math.max(...values, 0)
          : calc === 'min'
            ? Math.min(...values, 0)
            : values.reduce((sum, item) => sum + item, 0)
    result[column.name] = Number(value.toFixed(4))
    return result
  }, {})
  return state.analysis.total.position === 'top' ? [totalRow, ...rows] : [...rows, totalRow]
}

function buildColumns(selected: VisualField[], derived: QueryResultColumn[]): QueryResultColumn[] {
  return [
    ...selected.map((field) => ({
      fieldId: field.id,
      name: field.name,
      displayName: field.displayName,
      dataType: field.dataType,
      fieldType: field.fieldType,
    })),
    ...derived,
  ]
}

function filterToSql(filter: FilterConfig, fields: VisualField[]): string {
  if (filter.type === 'combined' && filter.children?.length) {
    return `(${filter.children.map((child) => filterToSql(child, fields)).join(` ${filter.logic} `)})`
  }
  const field = fieldById(fields, filter.fieldId)
  const name = field?.name ?? filter.fieldId
  if (filter.inputMode === 'sub_query') return `${name} IN (${filter.subQueryText || 'sub_query'})`
  if (filter.inputMode === 'manual') return `${name} IN (${splitInputValues(filter.value, filter.valueList).join(', ')})`
  if (filter.operator === 'between') return `${name} BETWEEN ${filter.startValue ?? ''} AND ${filter.endValue ?? ''}`
  return `${name} ${filter.operator} ${filter.value ?? ''}`
}

function compileSql(state: VisualQueryState, dimensions: VisualField[], measures: VisualField[], fields: VisualField[]): string {
  const select = [...dimensions.map((field) => field.name), ...measures.map((field) => `${field.aggregation ?? 'sum'}(${field.name}) AS ${field.name}`)]
  const sourceName = state.source.sourceType === 'dataset' ? state.source.datasetName : state.source.fileName
  const where = state.filters.length ? `\nWHERE ${state.filters.map((filter) => filterToSql(filter, fields)).join(' AND ')}` : ''
  const groupBy = dimensions.length ? `\nGROUP BY ${dimensions.map((field) => field.name).join(', ')}` : ''
  return `SELECT ${select.length ? select.join(', ') : '*'}\nFROM ${sourceName}${where}${groupBy}\nLIMIT ${state.queryConfig.limit}`
}

function cacheKey(state: VisualQueryState): string {
  const snapshot = clone(state)
  snapshot.uiState = {
    queryStatus: 'idle',
    activeRightTab: snapshot.uiState.activeRightTab,
    activeBottomTab: snapshot.uiState.activeBottomTab,
    cacheHit: false,
    sampled: false,
  }
  return JSON.stringify(snapshot)
}

function saveHistory(item: QueryHistoryItem): void {
  storage.history = [item, ...storage.history.filter((history) => history.id !== item.id)].slice(0, 50)
  writeStorage(storage)
}

export async function executeVisualQuery(state: VisualQueryState): Promise<QueryResult> {
  await delay(360)
  const key = cacheKey(state)
  if (state.queryConfig.cacheEnabled && storage.cache[key]) {
    return { ...clone(storage.cache[key]), cacheHit: true }
  }
  const fields = flattenFields(state.fields)
  const sourceRows = await getRowsForSource(state.source)
  const preparedRows = applyVirtualFields(sourceRows, fields, state)
  const detailFilters = state.filters.filter((filter) => !isResultMetricFilter(filter))
  const resultMetricFilters = state.filters.filter(isResultMetricFilter)
  const filtered = preparedRows.filter((row) => detailFilters.every((filter) => passesFilter(row, filter, fields)))
  const sampledRows =
    state.queryConfig.samplingEnabled && filtered.length > (state.queryConfig.samplingRows ?? 200)
      ? filtered.filter((_, index) => index % Math.ceil(filtered.length / (state.queryConfig.samplingRows ?? 200)) === 0)
      : filtered
  const dimensions = collectQueryDimensions(state, fields)
  const visibleMeasures = collectQueryMeasures(state, fields)
  const resultFilterMeasures = resultMetricFilters
    .map((filter) => fieldById(fields, filter.fieldId))
    .filter((field): field is VisualField => Boolean(field && field.fieldType === 'measure'))
  const measures = uniqueFields([...visibleMeasures, ...resultFilterMeasures])
  const selected = [...dimensions, ...visibleMeasures]
  const shouldReturnDetail = state.chart.type === 'detail_table' || (!dimensions.length && !measures.length)
  const baseRows = shouldReturnDetail
    ? sampledRows.slice(0, state.queryConfig.limit).map((row) => {
      const rowFields = selected.length ? selected : fields.slice(0, 8)
      return rowFields.reduce<Record<string, string | number | boolean | null>>((result, field) => {
          result[field.name] = field.fieldType === 'dimension' ? applyAlias(row[field.name] ?? null, field) : row[field.name] ?? null
          return result
        }, {})
      })
    : aggregateRows(sampledRows, dimensions, measures)
  const resultFilteredRows = resultMetricFilters.length
    ? baseRows.filter((row) => resultMetricFilters.every((filter) => passesFilter(row, filter, fields)))
    : baseRows
  const sortedBaseRows = sortRows(resultFilteredRows, state, fields)
  const topRows = applyTopN(sortedBaseRows, state, fields).slice(0, state.queryConfig.limit)
  const derived = applyDerivedColumns(topRows, state, fields)
  const periodCompare = applyPeriodCompareColumns(derived.rows, state, fields)
  const compare = applyCompareColumns(periodCompare.rows, state, fields)
  const columns = buildColumns(
    shouldReturnDetail && !selected.length ? fields.slice(0, 8) : selected,
    [...derived.columns, ...periodCompare.columns, ...compare.columns],
  )
  const finalRows = applyTotalRow(
    compare.rows,
    state.analysis.total.basis === 'full_data' ? sortedBaseRows : compare.rows,
    state,
    columns,
  )
  const result: QueryResult = {
    columns,
    rows: finalRows,
    totalRows: filtered.length,
    queryId: makeId('query'),
    executedSql: compileSql(state, dimensions, measures, fields),
    durationMs: 220 + Math.round(Math.random() * 220),
    cacheHit: false,
    sampled: state.queryConfig.samplingEnabled,
  }
  if (state.queryConfig.cacheEnabled) {
    storage.cache[key] = clone(result)
  }
  saveHistory({
    id: makeId('history'),
    datasetId: state.source.sourceType === 'dataset' ? state.source.datasetId : state.source.tempDatasetId,
    queryTime: nowText(),
    status: 'success',
    chartType: state.chart.type,
    durationMs: result.durationMs,
    operatorName: currentUser,
    configSnapshot: clone(state),
    sql: result.executedSql,
  })
  writeStorage(storage)
  return result
}

export async function listQueryHistory(datasetId?: string): Promise<QueryHistoryItem[]> {
  await delay()
  return clone(storage.history.filter((item) => !datasetId || item.datasetId === datasetId))
}

export async function listPalettes(): Promise<PaletteConfig[]> {
  await delay()
  return clone(storage.palettes)
}

export async function savePalette(input: Omit<PaletteConfig, 'id' | 'createdBy' | 'updatedAt'>): Promise<PaletteConfig> {
  await delay()
  if (!input.name.trim()) throw new Error('名称不能为空')
  if (!input.colors.length) throw new Error('至少包含 1 个颜色')
  if (input.colors.some((color) => !/^#[0-9a-f]{6}$/i.test(color))) throw new Error('颜色必须是合法 HEX')
  const duplicate = storage.palettes.some((palette) => palette.scope === input.scope && palette.name === input.name)
  if (duplicate) throw new Error('同一作用域下名称不能重复')
  const palette: PaletteConfig = {
    ...input,
    id: makeId('palette'),
    createdBy: currentUser,
    updatedAt: nowText(),
  }
  storage.palettes.push(palette)
  writeStorage(storage)
  return clone(palette)
}

export async function getAnnouncement(datasetId: string): Promise<AnnouncementConfig | null> {
  await delay()
  return clone(storage.announcements.find((item) => item.datasetId === datasetId && item.enabled) ?? null)
}

export async function saveAnnouncement(input: Omit<AnnouncementConfig, 'id' | 'updatedBy' | 'updatedAt'>): Promise<AnnouncementConfig> {
  await delay()
  const announcement: AnnouncementConfig = {
    ...input,
    id: makeId('ann'),
    updatedBy: currentUser,
    updatedAt: nowText(),
  }
  storage.announcements = [announcement, ...storage.announcements.filter((item) => item.datasetId !== input.datasetId)]
  writeStorage(storage)
  return clone(announcement)
}

export function validateExpression(expression: string, fields: VisualField[]): ExpressionValidationResult {
  const trimmed = expression.trim()
  if (!trimmed) return { valid: false, errorMessage: '表达式不能为空', position: { line: 1, column: 1 } }
  const stack: string[] = []
  for (let index = 0; index < trimmed.length; index += 1) {
    const char = trimmed[index]
    if (char === '(') stack.push(char)
    if (char === ')') {
      if (!stack.length) return { valid: false, errorMessage: '括号不匹配', position: { line: 1, column: index + 1 } }
      stack.pop()
    }
  }
  if (stack.length) return { valid: false, errorMessage: '括号不匹配', position: { line: 1, column: trimmed.length } }
  const fieldRefs = [...trimmed.matchAll(/\[([^\]]+)\]/g)].map((match) => match[1] ?? '')
  const missing = fieldRefs.find((name) => !fields.some((field) => field.displayName === name || field.name === name))
  if (missing) return { valid: false, errorMessage: `字段不存在：${missing}`, position: { line: 1, column: trimmed.indexOf(missing) + 1 } }
  const functions = ['count', 'sum', 'avg', 'max', 'min', 'abs', 'round', 'ceil', 'floor', 'concat', 'substring', 'replace', 'length', 'extractAll', 'toDate', 'toStartOfMonth', 'dateDiff', 'now', 'if', 'multiIf', 'case', 'arrayJoin', 'fixed', 'include', 'exclude', 'TOTAL', 'RUNNING_SUM', 'RANK', 'LOOKUP']
  const called = [...trimmed.matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)].map((match) => match[1] ?? '')
  const unknown = called.find((name) => !functions.some((fn) => fn.toLowerCase() === name.toLowerCase()))
  if (unknown) return { valid: false, errorMessage: `函数不存在：${unknown}`, position: { line: 1, column: trimmed.indexOf(unknown) + 1 } }
  if (/\{\s*(FIXED|INCLUDE|EXCLUDE)/i.test(trimmed) && !/(sum|avg|count|max|min)\s*\(/i.test(trimmed)) {
    return { valid: false, errorMessage: 'LOD 内必须包含聚合表达式', position: { line: 1, column: 1 } }
  }
  return {
    valid: true,
    dataType: /(sum|avg|max|min|count|TOTAL|RUNNING_SUM|RANK|LOOKUP)\s*\(/i.test(trimmed) ? 'number' : 'string',
  }
}

export function updateFieldInRegistry(registry: FieldRegistry, field: VisualField): FieldRegistry {
  const next = clone(registry)
  const groups: Array<keyof FieldRegistry> = ['datasetFields', 'personalFields', 'hierarchyFields', 'groupFields', 'dynamicFields']
  groups.forEach((key) => {
    const index = next[key].findIndex((item) => item.id === field.id)
    if (index >= 0) next[key][index] = field
  })
  return next
}
