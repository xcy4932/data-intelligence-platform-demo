import type {
  BigScreenComponent,
  BigScreenDataBindingConfig,
  BigScreenFilterConfig,
  BigScreenReferenceLineConfig,
  BigScreenSortConfig,
  BigScreenTableColumn,
  BigScreenTableSchema,
} from '@/types/bigScreen'

export interface BigScreenChartDimensionRow {
  category: string
  series: string
  value: number
  compareValue: number
  target: number
  raw: Record<string, unknown>
}

export interface ResolvedReferenceLine extends BigScreenReferenceLineConfig {
  resolvedValue?: number
  invalidReason?: string
}

export const inferDataType = (value: unknown): BigScreenTableColumn['dataType'] => {
  if (typeof value === 'number') {
    return 'number'
  }

  if (typeof value === 'boolean') {
    return 'boolean'
  }

  if (value && typeof value === 'object') {
    return 'object'
  }

  const text = String(value ?? '')

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return 'date'
  }

  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(text)) {
    return 'datetime'
  }

  return Number.isFinite(Number(text)) && text.trim() !== '' ? 'number' : 'string'
}

export const normalizeColumnName = (name: string, index: number, usedNames: Set<string>): string => {
  const baseName = name.trim() || `field_${index + 1}`
  let nextName = baseName
  let suffix = 2

  while (usedNames.has(nextName)) {
    nextName = `${baseName}_${suffix}`
    suffix += 1
  }

  usedNames.add(nextName)
  return nextName
}

export const inferTableSchema = (rows: Array<Record<string, unknown>>): BigScreenTableSchema => {
  const sourceKeys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
  const usedNames = new Set<string>()
  const normalizedKeys = sourceKeys.map((key, index) => normalizeColumnName(key, index, usedNames))
  const keyMap = Object.fromEntries(sourceKeys.map((key, index) => [key, normalizedKeys[index] ?? key]))
  const normalizedRows = rows.map((row, rowIndex) => ({
    id: `row-${rowIndex + 1}`,
    values: Object.fromEntries(sourceKeys.map((key) => [keyMap[key], row[key] ?? null])),
  }))

  return {
    columns: normalizedKeys.map((name, index) => {
      const sampleValue = normalizedRows.find((row) => row.values[name] !== undefined && row.values[name] !== null)?.values[name]
      const dataType = inferDataType(sampleValue)

      return {
        id: `field-${index + 1}`,
        name,
        displayName: sourceKeys[index]?.trim() || name,
        dataType,
        role: dataType === 'number' ? 'measure' : dataType === 'object' ? 'unknown' : 'dimension',
        sourceFieldPath: sourceKeys[index],
      }
    }),
    rows: normalizedRows,
  }
}

const normalizeObjectArray = (rows: Array<Record<string, unknown>>): Array<Record<string, unknown>> => {
  if (!rows.length) {
    return rows
  }

  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
  return rows.map((row) => Object.fromEntries(keys.map((key) => [key, row[key] ?? null])))
}

export const normalizeRawRows = (rawData: unknown): Array<Record<string, unknown>> => {
  if (Array.isArray(rawData)) {
    if (rawData.length === 0) {
      return []
    }

    const rows = rawData.map((row) => row && typeof row === 'object' && !Array.isArray(row)
      ? row as Record<string, unknown>
      : { value: row })

    return normalizeObjectArray(rows)
  }

  if (rawData && typeof rawData === 'object') {
    const record = rawData as Record<string, unknown>
    const preferredArray = ['data', 'rows', 'list', 'items', 'records']
      .map((key) => record[key])
      .find(Array.isArray)
    const firstArray = preferredArray ?? Object.values(record).find(Array.isArray)

    if (Array.isArray(firstArray)) {
      return normalizeRawRows(firstArray)
    }

    return [record]
  }

  if (rawData === undefined || rawData === null) {
    throw new Error('返回结果为空，无法转换为二维表')
  }

  return [{ value: rawData }]
}

export const matchFilter = (row: Record<string, unknown>, fieldName: string, operator: string, value: unknown): boolean => {
  const current = row[fieldName]
  const currentText = String(current ?? '')

  switch (operator) {
    case 'eq':
      return current === value || currentText === String(value ?? '')
    case 'neq':
    case 'ne':
      return current !== value && currentText !== String(value ?? '')
    case 'startsWith':
      return currentText.startsWith(String(value ?? ''))
    case 'endsWith':
      return currentText.endsWith(String(value ?? ''))
    case 'like':
    case 'contains':
      return currentText.includes(String(value ?? ''))
    case 'notContains':
    case 'notLike':
    case 'not_contains':
      return !currentText.includes(String(value ?? ''))
    case 'in':
      return Array.isArray(value) ? value.map(String).includes(currentText) : false
    case 'notIn':
    case 'not_in':
      return Array.isArray(value) ? !value.map(String).includes(currentText) : true
    case 'gt':
      return Number(current) > Number(value)
    case 'gte':
      return Number(current) >= Number(value)
    case 'lt':
      return Number(current) < Number(value)
    case 'lte':
      return Number(current) <= Number(value)
    case 'between':
    case 'betweenDate':
    case 'betweenDatetime': {
      if (!Array.isArray(value)) {
        return false
      }

      const currentNumber = Number(current)
      const startNumber = Number(value[0])
      const endNumber = Number(value[1])

      if (Number.isFinite(currentNumber) && Number.isFinite(startNumber) && Number.isFinite(endNumber)) {
        return currentNumber >= startNumber && currentNumber <= endNumber
      }

      const currentTime = new Date(String(current)).getTime()
      const startTime = new Date(String(value[0])).getTime()
      const endTime = new Date(String(value[1])).getTime()

      return Number.isFinite(currentTime) && Number.isFinite(startTime) && Number.isFinite(endTime) && currentTime >= startTime && currentTime <= endTime
    }
    case 'recent':
    case 'recentWithData': {
      const currentTime = new Date(String(current)).getTime()
      const days = typeof value === 'object' && value ? Number((value as Record<string, unknown>).days ?? 7) : Number(value ?? 7)
      return Number.isFinite(currentTime) && currentTime >= Date.now() - days * 24 * 60 * 60 * 1000
    }
    case 'timeExpression':
      return currentText === String(value ?? '')
    default:
      return true
  }
}

const applyExtraFields = (
  rows: Array<Record<string, unknown>>,
  dataBinding?: BigScreenDataBindingConfig,
): Array<Record<string, unknown>> => {
  const extraFields = dataBinding?.extraFields?.filter((field) => field.enabled) ?? []

  if (!extraFields.length) {
    return rows
  }

  return rows.map((row) => {
    const nextRow = { ...row }

    extraFields.forEach((field) => {
      try {
        nextRow[field.name] = evaluateExpression(field.expression, row)
      } catch {
        nextRow[field.name] = ''
      }
    })

    return nextRow
  })
}

const evaluateExpression = (expression: string, row: Record<string, unknown>): unknown => {
  const trimmed = expression.trim()

  if (!trimmed) {
    return ''
  }

  if (trimmed.includes('${')) {
    return trimmed.replace(/\$\{([^}]+)\}/g, (_, key: string) => String(row[key.trim()] ?? ''))
  }

  if (!/^[\w\s+\-*/().%]+$/.test(trimmed)) {
    return row[trimmed] ?? ''
  }

  const substituted = trimmed.replace(/\b[a-zA-Z_]\w*\b/g, (key) =>
    Object.prototype.hasOwnProperty.call(row, key) ? String(Number(row[key] ?? 0)) : key,
  )

  if (!/^[\d\s+\-*/().%]+$/.test(substituted)) {
    return row[trimmed] ?? ''
  }

  return Function(`"use strict"; return (${substituted})`)() as unknown
}

const applySortRules = (rows: Array<Record<string, unknown>>, sortRules: BigScreenSortConfig[] = []): Array<Record<string, unknown>> => {
  if (!sortRules.length) {
    return rows
  }

  return [...rows].sort((left, right) => {
    for (const rule of sortRules) {
      const leftValue = left[rule.fieldName]
      const rightValue = right[rule.fieldName]

      if (rule.order === 'custom' && rule.customOrder?.length) {
        const leftIndex = rule.customOrder.map(String).indexOf(String(leftValue))
        const rightIndex = rule.customOrder.map(String).indexOf(String(rightValue))
        const normalizedLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex
        const normalizedRight = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex

        if (normalizedLeft !== normalizedRight) {
          return normalizedLeft - normalizedRight
        }
      } else {
        const direction = rule.order === 'asc' ? 1 : -1
        const result = String(leftValue ?? '').localeCompare(String(rightValue ?? ''), 'zh-Hans-CN', { numeric: true })

        if (result !== 0) {
          return result * direction
        }
      }
    }

    return 0
  })
}

const applyTopN = (
  rows: Array<Record<string, unknown>>,
  dataBinding?: BigScreenDataBindingConfig,
): Array<Record<string, unknown>> => {
  const topN = dataBinding?.topN

  if (!topN?.enabled || topN.mode === 'all') {
    return rows
  }

  const measureField = topN.measureField ?? resolveFieldName(dataBinding, ['measure', 'primaryMeasure', 'value'], ['value'])
  const rankedRows = [...rows].sort((left, right) => Number(right[measureField] ?? 0) - Number(left[measureField] ?? 0))

  return topN.mode === 'bottom'
    ? rankedRows.slice(-topN.count).reverse()
    : rankedRows.slice(0, topN.count)
}

export const applyDataPipeline = (
  rows: Array<Record<string, unknown>>,
  dataBinding?: BigScreenDataBindingConfig,
  runtimeFilters: BigScreenFilterConfig[] = [],
): Array<Record<string, unknown>> => {
  const rowsWithExtraFields = applyExtraFields(rows, dataBinding)
  const filters = [...(dataBinding?.filterRules ?? []), ...runtimeFilters]
  const filteredRows = rowsWithExtraFields.filter((row) =>
    filters.every((filter) => matchFilter(row, filter.fieldName, filter.operator, filter.value)),
  )
  const sortedRows = applySortRules(filteredRows, dataBinding?.sortRules ?? [])

  return applyTopN(sortedRows, dataBinding)
}

export const getRawRowsFromComponent = (component: BigScreenComponent): Array<Record<string, unknown>> => {
  const parsedRows = component.dataBinding?.lastQueryState?.parsedTable?.rows.map((row) => row.values) ?? []

  return parsedRows.length ? parsedRows : component.dataBinding?.staticRows ?? []
}

export const getComponentDataRows = (
  component: BigScreenComponent,
  runtimeFilters: BigScreenFilterConfig[] = [],
): Array<Record<string, unknown>> =>
  applyDataPipeline(getRawRowsFromComponent(component), component.dataBinding, runtimeFilters)

export const resolveFieldName = (
  dataBinding: BigScreenDataBindingConfig | undefined,
  slotNames: string[],
  fallbacks: string[],
): string => {
  for (const slotName of slotNames) {
    const fieldName = dataBinding?.fieldSlots?.[slotName]?.[0]

    if (fieldName) {
      return fieldName
    }
  }

  for (const slotName of slotNames) {
    const fieldName = dataBinding?.fields.find((field) => field.slot === slotName)?.fieldName

    if (fieldName) {
      return fieldName
    }
  }

  return fallbacks[0] ?? 'value'
}

export const buildChartDimensionRows = (
  component: BigScreenComponent,
  runtimeFilters: BigScreenFilterConfig[] = [],
): BigScreenChartDimensionRow[] => {
  const rows = getComponentDataRows(component, runtimeFilters)
  const dataBinding = component.dataBinding
  const dimensionField = resolveFieldName(dataBinding, ['dimension', 'category', 'x', 'word', 'label'], ['category', 'name', 'label'])
  const seriesField = resolveFieldName(dataBinding, ['series', 'split'], ['series'])
  const valueField = resolveFieldName(dataBinding, ['measure', 'primaryMeasure', 'value', 'y', 'weight'], ['value'])
  const compareField = resolveFieldName(dataBinding, ['secondaryMeasure', 'leftMeasure', 'rightMeasure', 'compare'], ['compareValue'])
  const targetField = resolveFieldName(dataBinding, ['target', 'max', 'size'], ['target'])

  return rows.map((row) => ({
    category: String(row[dimensionField] ?? row.category ?? row.name ?? row.label ?? '--'),
    series: String(row[seriesField] ?? row.series ?? '本期'),
    value: Number(row[valueField] ?? row.value ?? 0),
    compareValue: Number(row[compareField] ?? row.compareValue ?? 0),
    target: Number(row[targetField] ?? row.target ?? 100),
    raw: row,
  }))
}

export const resolveReferenceLines = (
  component: BigScreenComponent,
  runtimeFilters: BigScreenFilterConfig[] = [],
): ResolvedReferenceLine[] => {
  const rows = getComponentDataRows(component, runtimeFilters)
  const lines = component.dataBinding?.referenceLines?.filter((line) => line.visible) ?? []

  return lines.map((line) => {
    if (typeof line.value === 'number') {
      return { ...line, resolvedValue: line.value }
    }

    const values = rows.map((row) => Number(row[line.fieldName] ?? 0)).filter(Number.isFinite)

    if (!values.length) {
      return { ...line, invalidReason: '当前参考线无有效数值' }
    }

    const resolvedValue = line.value === 'avg'
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : line.value === 'max'
        ? Math.max(...values)
        : Math.min(...values)

    return { ...line, resolvedValue }
  })
}
