export type VisualFieldDataType = 'string' | 'number' | 'date' | 'datetime' | 'boolean' | 'geo' | 'unknown'
export type VisualFieldType = 'dimension' | 'measure'
export type VisualFieldSource = 'dataset' | 'personal' | 'calculated' | 'group' | 'dynamic' | 'lod'

export type VisualChartType =
  | 'table'
  | 'pivot_table'
  | 'trend_table'
  | 'detail_table'
  | 'okr_table'
  | 'metric_card'
  | 'metric_trend'
  | 'column'
  | 'bar'
  | 'line'
  | 'area'
  | 'dual_axis'
  | 'combo'
  | 'pie'
  | 'map'
  | 'scatter'
  | 'circle_view'
  | 'histogram'
  | 'word_cloud'
  | 'funnel'
  | 'radar'
  | 'sankey'
  | 'gauge'
  | 'progress'
  | 'waterfall'
  | 'sparkline'
  | 'pivot_chart'
  | 'bi_bar'

export type VisualFieldSlotKey =
  | 'dimensions'
  | 'measures'
  | 'rowDimensions'
  | 'columnDimensions'
  | 'dateDimensions'
  | 'xAxis'
  | 'yAxis'
  | 'secondaryYAxis'
  | 'color'
  | 'size'
  | 'detail'
  | 'tooltip'
  | 'filters'

export type AggregationType = 'sum' | 'avg' | 'count' | 'count_distinct' | 'max' | 'min'
export type DateGranularity =
  | 'year'
  | 'quarter'
  | 'month'
  | 'week'
  | 'day'
  | 'hour'
  | 'minute'
  | 'second'
  | 'weekday'
  | 'day_of_month'
  | 'month_of_year'

export interface AliasConfig {
  mode: 'manual' | 'bind_field'
  mappings?: Array<{ rawValue: string, aliasValue: string }>
  sourceFieldId?: string
  aliasFieldId?: string
}

export interface GroupFieldConfig {
  mode: 'text_group' | 'numeric_bin'
  sourceFieldId: string
  groups?: Array<{ groupName: string, values: string[] }>
  bins?: Array<{ name: string, min?: number, max?: number, includeMin: boolean, includeMax: boolean }>
  unmatchedStrategy: 'keep_original' | 'set_null' | 'set_other'
  otherGroupName?: string
}

export interface GeoRoleConfig {
  role: 'country' | 'province' | 'city' | 'district' | 'latitude' | 'longitude' | 'latlng'
  mappingMode: 'auto' | 'manual'
  mappings?: Array<{ rawValue: string, matchedGeoId: string, matchedName: string }>
}

export interface VisualField {
  id: string
  datasetId: string
  name: string
  displayName: string
  originName?: string
  fieldType: VisualFieldType
  dataType: VisualFieldDataType
  semanticType?: 'normal' | 'date' | 'geo' | 'longitude' | 'latitude'
  source: VisualFieldSource
  expression?: string
  aggregation?: AggregationType
  dateGranularity?: DateGranularity
  aliasConfig?: AliasConfig
  groupConfig?: GroupFieldConfig
  hierarchyId?: string
  geoRole?: GeoRoleConfig
  permission: {
    editable: boolean
    deletable: boolean
    canSetAlias: boolean
    canSetGeoRole: boolean
  }
}

export interface DatasetOption {
  id: string
  name: string
  description?: string
  ownerName: string
  lastVisitedAt?: string
  updatedAt: string
  accessMode: 'extract' | 'direct'
  fieldCount: number
  rowCount?: number
  permission: 'view' | 'edit' | 'none'
}

export type DataSourceConfig =
  | {
    sourceType: 'dataset'
    datasetId: string
    datasetName: string
    accessMode: 'extract' | 'direct'
  }
  | {
    sourceType: 'local_file'
    tempDatasetId: string
    fileName: string
    fileType: 'csv' | 'xlsx' | 'xls'
    fileSize: number
    expireAt: string
  }

export interface SlotField {
  fieldId: string
  displayName: string
  aggregation?: AggregationType
  dateGranularity?: DateGranularity
  visible?: boolean
}

export interface FieldSlots {
  dimensions: SlotField[]
  measures: SlotField[]
  rowDimensions: SlotField[]
  columnDimensions: SlotField[]
  dateDimensions: SlotField[]
  xAxis: SlotField[]
  yAxis: SlotField[]
  secondaryYAxis: SlotField[]
  color: SlotField[]
  size: SlotField[]
  detail: SlotField[]
  tooltip: SlotField[]
  filters: SlotField[]
}

export interface SlotRule {
  label: string
  accepts: VisualFieldType[]
  dataTypes: VisualFieldDataType[]
  min: number
  max: number
  required?: boolean
}

export interface ChartDefinition {
  type: VisualChartType
  label: string
  group: string
  description: string
  slots: Partial<Record<VisualFieldSlotKey, SlotRule>>
  defaultDimensionSlot: VisualFieldSlotKey
  defaultMeasureSlot: VisualFieldSlotKey
}

export interface ChartConfig {
  type: VisualChartType
  subType?: string
  title?: string
  description?: string
  style: {
    showLegend: boolean
    showLabel: boolean
    stack: boolean
    smooth: boolean
    displayMode: 'standard' | 'fit_width'
  }
  axis?: {
    xTitle?: string
    yTitle?: string
    secondaryYTitle?: string
  }
  gauge?: {
    min: number
    max: number
    targetValue?: number
    showPointer: boolean
  }
  waterfall?: {
    mode: 'structure' | 'change'
    showTotal: boolean
    totalLabel: string
  }
  pivot?: {
    showRowHeader: boolean
    showColumnHeader: boolean
    displayMode: 'standard' | 'fit_width'
  }
}

export type FilterType = 'dimension' | 'metric' | 'date' | 'combined' | 'cascade'
export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'in'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'last_n_days'

export interface FilterConfig {
  id: string
  type: FilterType
  fieldId: string
  operator: FilterOperator
  inputMode?: 'exact' | 'condition' | 'manual' | 'sub_query'
  metricScope?: 'result' | 'detail'
  dateMode?: 'dynamic' | 'fixed'
  value?: string | number
  valueList?: Array<string | number>
  startValue?: string | number
  endValue?: string | number
  subQueryText?: string
  logic: 'AND' | 'OR'
  children?: FilterConfig[]
  parentFieldId?: string
}

export interface DynamicControlConfig {
  id: string
  type: 'dimension' | 'measure'
  label: string
  candidateFieldIds: string[]
  selectedFieldId: string
}

export interface AnalysisConfig {
  sort: {
    enabled: boolean
    fieldId: string
    order: 'asc' | 'desc' | 'manual'
    manualOrder: string[]
  }
  topN: {
    enabled: boolean
    mode: 'result_rows' | 'dimension_items'
    direction: 'top' | 'bottom'
    n: number
    dimensionFieldId?: string
    orderByMeasureId: string
    includeOthers: boolean
    othersLabel: string
  }
  total: {
    enabled: boolean
    displayName: string
    position: 'top' | 'bottom'
    basis: 'full_data' | 'displayed_data'
    calculation: 'auto' | 'sum' | 'avg' | 'max' | 'min'
  }
  percentage: {
    enabled: boolean
    measureId: string
    basis: 'full_data' | 'displayed_data'
    newFieldName: string
  }
  compare: {
    enabled: boolean
    groups: Array<{ id: string, name: string, filters: FilterConfig[] }>
    measureIds: string[]
  }
  periodCompare: {
    enabled: boolean
    measureIds: string[]
    dateFieldId: string
    compareTypes: Array<'yoy' | 'mom'>
    displayMode: 'value' | 'rate' | 'both'
  }
  referenceLines: Array<{
    id: string
    enabled: boolean
    axis: 'x' | 'y'
    type: 'constant' | 'average' | 'max' | 'min' | 'median'
    value?: number
    measureId?: string
    label: string
    lineType: 'solid' | 'dashed'
    showLabel: boolean
  }>
  tableCalculation: {
    enabled: boolean
    calculationType: 'total_percent' | 'running_sum' | 'difference' | 'percent_difference' | 'rank' | 'moving_average'
    measureId: string
    computeArea: 'table' | 'row' | 'column' | 'pane'
    addressing: 'down' | 'across'
    newFieldName: string
  }
}

export interface QueryRuntimeConfig {
  autoQuery: boolean
  cacheEnabled: boolean
  samplingEnabled: boolean
  samplingRows?: number
  limit: number
  timeoutMs: number
}

export type AnnotationConfig =
  | {
    id: string
    type: 'point'
    fieldId: string
    value: string | number
    content: string
    position: { x: number, y: number }
  }
  | {
    id: string
    type: 'range'
    dateFieldId: string
    startDate: string
    endDate: string
    content: string
    position: { x: number, y: number }
  }

export interface TooltipConfig {
  enabled: boolean
  trigger: 'dimension' | 'item' | 'measure'
  displayFields: string[]
  customText?: string
  linkedChartIds?: string[]
}

export interface PaletteConfig {
  id: string
  name: string
  colors: string[]
  scope: 'personal' | 'workspace'
  createdBy: string
  updatedAt: string
}

export interface AnnouncementConfig {
  id: string
  datasetId: string
  title: string
  content: string
  enabled: boolean
  updatedBy: string
  updatedAt: string
}

export interface VisualQueryUIState {
  queryStatus: 'idle' | 'dirty' | 'validating' | 'querying' | 'success' | 'failed'
  activeRightTab: 'chart' | 'filter' | 'analysis' | 'enhance'
  activeBottomTab: 'result' | 'history' | 'sql'
  errorMessage?: string
  cacheHit: boolean
  sampled: boolean
}

export interface FieldRegistry {
  datasetFields: VisualField[]
  personalFields: VisualField[]
  hierarchyFields: VisualField[]
  groupFields: VisualField[]
  dynamicFields: VisualField[]
}

export interface VisualQueryState {
  id?: string
  name?: string
  source: DataSourceConfig
  fields: FieldRegistry
  chart: ChartConfig
  fieldSlots: FieldSlots
  filters: FilterConfig[]
  dynamicControls: DynamicControlConfig[]
  analysis: AnalysisConfig
  queryConfig: QueryRuntimeConfig
  annotations: AnnotationConfig[]
  tooltip: TooltipConfig
  palette?: PaletteConfig
  uiState: VisualQueryUIState
  version: number
  updatedAt?: string
}

export interface QueryResultColumn {
  fieldId: string
  name: string
  displayName: string
  dataType: VisualFieldDataType
  fieldType: VisualFieldType
}

export interface QueryResult {
  columns: QueryResultColumn[]
  rows: Array<Record<string, string | number | boolean | null>>
  totalRows: number
  queryId: string
  executedSql?: string
  durationMs: number
  cacheHit: boolean
  sampled: boolean
}

export interface SavedVisualAnalysis {
  id: string
  name: string
  description: string
  chartType: VisualChartType
  featureTags: string[]
  updatedAt: string
  state: VisualQueryState
}

export interface QueryHistoryItem {
  id: string
  datasetId: string
  queryTime: string
  status: 'success' | 'failed' | 'running'
  chartType: VisualChartType
  durationMs?: number
  operatorName: string
  configSnapshot: VisualQueryState
  sql?: string
  errorMessage?: string
}

export interface ExpressionValidationResult {
  valid: boolean
  dataType?: VisualFieldDataType
  errorMessage?: string
  position?: {
    line: number
    column: number
  }
}
