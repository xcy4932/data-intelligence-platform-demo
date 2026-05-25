import type { BigScreenComponent, BigScreenComponentType, BigScreenFilterConfig } from '@/types/bigScreen'
import {
  getComponentDataRows,
  resolveFieldName,
  resolveReferenceLines,
  type BigScreenChartDimensionRow,
  type ResolvedReferenceLine,
} from './dataEngine'

export interface BigScreenChartSlotRequirement {
  slot: string
  label: string
  fallbacks: string[]
  required: boolean
}

export interface BigScreenChartGroupedSeries {
  seriesName: string
  values: number[]
}

export interface BigScreenChartDataView {
  rows: Array<Record<string, unknown>>
  dimensionRows: BigScreenChartDimensionRow[]
  grouped: {
    categories: string[]
    seriesNames: string[]
    values: BigScreenChartGroupedSeries[]
  }
  fields: Record<string, string>
  referenceLines?: {
    symbol: 'none'
    label: { color: string }
    lineStyle: { type: 'dashed' }
    data: Array<{
      name: string
      yAxis: number
      lineStyle: { color: string }
      label: { formatter: string }
    }>
  }
  diagnostics: BigScreenChartDiagnostic[]
}

export interface BigScreenChartDiagnostic {
  code: 'empty-data' | 'missing-field' | 'invalid-number' | 'too-small'
  severity: 'error' | 'warning'
  message: string
  slot?: string
}

const slotRequirementMap: Partial<Record<BigScreenComponentType, BigScreenChartSlotRequirement[]>> = {
  metricCard: [
    { slot: 'primaryMeasure', label: '主指标', fallbacks: ['measure', 'value'], required: true },
    { slot: 'secondaryMeasure', label: '对比指标', fallbacks: ['compare', 'compareValue'], required: false },
  ],
  flipNumber: [{ slot: 'measure', label: '指标', fallbacks: ['value'], required: true }],
  rankingList: [
    { slot: 'dimension', label: '排行维度', fallbacks: ['category', 'name', 'label'], required: true },
    { slot: 'measure', label: '排行指标', fallbacks: ['value'], required: true },
  ],
  table: [
    { slot: 'dimension', label: '维度列', fallbacks: ['category', 'name', 'label'], required: true },
    { slot: 'measure', label: '指标列', fallbacks: ['value'], required: true },
  ],
  bidirectionalBar: [
    { slot: 'dimension', label: '维度', fallbacks: ['category', 'name', 'label'], required: true },
    { slot: 'leftMeasure', label: '左侧指标', fallbacks: ['compareValue'], required: true },
    { slot: 'rightMeasure', label: '右侧指标', fallbacks: ['value'], required: true },
  ],
  dualAxis: [
    { slot: 'dimension', label: '维度', fallbacks: ['category', 'name', 'label'], required: true },
    { slot: 'leftMeasure', label: '左轴指标', fallbacks: ['value'], required: true },
    { slot: 'rightMeasure', label: '右轴指标', fallbacks: ['compareValue'], required: true },
  ],
  scatter: [
    { slot: 'x', label: 'X 轴', fallbacks: ['compareValue', 'x'], required: true },
    { slot: 'y', label: 'Y 轴', fallbacks: ['value', 'y'], required: true },
    { slot: 'size', label: '气泡大小', fallbacks: ['target', 'size'], required: false },
    { slot: 'label', label: '标签', fallbacks: ['category', 'name', 'label'], required: false },
  ],
  sankey: [
    { slot: 'source', label: '来源节点', fallbacks: ['source', 'from'], required: true },
    { slot: 'targetNode', label: '目标节点', fallbacks: ['target', 'to'], required: true },
    { slot: 'value', label: '关系值', fallbacks: ['value'], required: true },
  ],
  singleValueDonut: [
    { slot: 'value', label: '当前值', fallbacks: ['value'], required: true },
    { slot: 'max', label: '最大值', fallbacks: ['target', 'max'], required: false },
  ],
  gauge: [{ slot: 'value', label: '当前值', fallbacks: ['value'], required: true }],
  waterWave: [{ slot: 'value', label: '当前值', fallbacks: ['value'], required: true }],
}

const defaultDimensionMeasureRequirements: BigScreenChartSlotRequirement[] = [
  { slot: 'dimension', label: '维度', fallbacks: ['category', 'name', 'label'], required: true },
  { slot: 'measure', label: '指标', fallbacks: ['value'], required: true },
]

const seriesRequirements: BigScreenChartSlotRequirement[] = [
  { slot: 'dimension', label: '维度', fallbacks: ['category', 'name', 'label'], required: true },
  { slot: 'series', label: '系列', fallbacks: ['series'], required: false },
  { slot: 'measure', label: '指标', fallbacks: ['value'], required: true },
]

const seriesChartTypes = new Set<BigScreenComponentType>([
  'groupedColumn',
  'stackedColumn',
  'percentColumn',
  'groupedBar',
  'stackedBar',
  'percentBar',
  'line',
  'area',
  'percentArea',
])

export const getBigScreenChartSlotRequirements = (type: BigScreenComponentType): BigScreenChartSlotRequirement[] => {
  if (slotRequirementMap[type]) {
    return slotRequirementMap[type] ?? []
  }

  if (seriesChartTypes.has(type)) {
    return seriesRequirements
  }

  return defaultDimensionMeasureRequirements
}

const hasField = (rows: Array<Record<string, unknown>>, fieldName: string): boolean =>
  rows.some((row) => Object.prototype.hasOwnProperty.call(row, fieldName))

const resolveSlotField = (
  component: BigScreenComponent,
  slot: string,
  fallbacks: string[],
): string => resolveFieldName(component.dataBinding, [slot, ...fallbacks], fallbacks)

const buildFieldMap = (component: BigScreenComponent): Record<string, string> =>
  Object.fromEntries(
    getBigScreenChartSlotRequirements(component.type).map((requirement) => [
      requirement.slot,
      resolveSlotField(component, requirement.slot, requirement.fallbacks),
    ]),
  )

const buildDiagnostics = (
  component: BigScreenComponent,
  rows: Array<Record<string, unknown>>,
  dimensionRows: BigScreenChartDimensionRow[],
  fields: Record<string, string>,
): BigScreenChartDiagnostic[] => {
  const diagnostics: BigScreenChartDiagnostic[] = []

  if (!rows.length) {
    diagnostics.push({
      code: 'empty-data',
      severity: 'warning',
      message: '当前图表没有可展示的数据',
    })
    return diagnostics
  }

  getBigScreenChartSlotRequirements(component.type).forEach((requirement) => {
    const fieldName = fields[requirement.slot]
    if (requirement.required && (!fieldName || !hasField(rows, fieldName))) {
      diagnostics.push({
        code: 'missing-field',
        severity: 'error',
        slot: requirement.slot,
        message: `缺少${requirement.label}字段`,
      })
    }
  })

  const numericSlots = ['measure', 'primaryMeasure', 'leftMeasure', 'rightMeasure', 'value', 'x', 'y', 'size']
  numericSlots.forEach((slot) => {
    const fieldName = fields[slot]
    if (!fieldName || !hasField(rows, fieldName)) {
      return
    }

    const invalidCount = rows.filter((row) => !Number.isFinite(Number(row[fieldName] ?? 0))).length
    if (invalidCount > 0) {
      diagnostics.push({
        code: 'invalid-number',
        severity: 'warning',
        slot,
        message: `${fieldName} 中有 ${invalidCount} 条非数值数据`,
      })
    }
  })

  if (dimensionRows.length && dimensionRows.every((row) => row.value === 0)) {
    diagnostics.push({
      code: 'invalid-number',
      severity: 'warning',
      slot: 'measure',
      message: '指标值全部为 0，请检查字段映射或原始数据',
    })
  }

  return diagnostics
}

const normalizeReferenceMarkLine = (lines: ResolvedReferenceLine[]) => {
  const visibleLines = lines.filter((line) => line.resolvedValue !== undefined)

  if (!visibleLines.length) {
    return undefined
  }

  return {
    symbol: 'none' as const,
    label: { color: '#dbeafe' },
    lineStyle: { type: 'dashed' as const },
    data: visibleLines.map((line) => ({
      name: line.name,
      yAxis: Number(line.resolvedValue),
      lineStyle: { color: line.color },
      label: { formatter: line.name },
    })),
  }
}

export const buildBigScreenChartDimensionRows = (
  component: BigScreenComponent,
  rows: Array<Record<string, unknown>>,
  fields: Record<string, string>,
): BigScreenChartDimensionRow[] => {
  const dimensionField = fields.dimension ?? fields.category ?? fields.word ?? fields.label ?? 'category'
  const seriesField = fields.series ?? 'series'
  const valueField = fields.measure ?? fields.primaryMeasure ?? fields.value ?? fields.y ?? fields.weight ?? 'value'
  const compareField = fields.secondaryMeasure ?? fields.leftMeasure ?? fields.rightMeasure ?? fields.compare ?? 'compareValue'
  const targetField = fields.target ?? fields.max ?? fields.size ?? 'target'

  return rows.map((row) => ({
    category: String(row[dimensionField] ?? row.category ?? row.name ?? row.label ?? '--'),
    series: String(row[seriesField] ?? row.series ?? '本期'),
    value: Number(row[valueField] ?? row.value ?? 0),
    compareValue: Number(row[compareField] ?? row.compareValue ?? 0),
    target: Number(row[targetField] ?? row.target ?? 100),
    raw: row,
  }))
}

export const adaptBigScreenChartData = (
  component: BigScreenComponent,
  runtimeFilters: BigScreenFilterConfig[] = [],
): BigScreenChartDataView => {
  const rows = getComponentDataRows(component, runtimeFilters)
  const fields = buildFieldMap(component)
  const dimensionRows = buildBigScreenChartDimensionRows(component, rows, fields)
  const seriesNames = Array.from(new Set(dimensionRows.map((row) => row.series)))
  const categories = Array.from(new Set(dimensionRows.map((row) => row.category)))
  const grouped = {
    seriesNames,
    categories,
    values: seriesNames.map((seriesName) => ({
      seriesName,
      values: categories.map((category) =>
        dimensionRows.find((row) => row.category === category && row.series === seriesName)?.value ?? 0,
      ),
    })),
  }

  return {
    rows,
    dimensionRows,
    grouped,
    fields,
    referenceLines: normalizeReferenceMarkLine(resolveReferenceLines(component, runtimeFilters)),
    diagnostics: buildDiagnostics(component, rows, dimensionRows, fields),
  }
}

export const getBigScreenChartDiagnostics = (
  component: BigScreenComponent,
  runtimeFilters: BigScreenFilterConfig[] = [],
): BigScreenChartDiagnostic[] => adaptBigScreenChartData(component, runtimeFilters).diagnostics
