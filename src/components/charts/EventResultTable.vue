<script setup lang="ts">
import { NAlert, NButton, NDataTable, NEmpty, NSelect, NSpace, NSpin, NTag } from 'naive-ui'
import type { DataTableColumns, DataTableRowKey } from 'naive-ui'
import { computed, h, ref, watch } from 'vue'
import type { EventAnalysisDetailRow } from '@/types/eventAnalysis'
import type { EventChartProps } from './chartTypes'

type DetailColumnKey =
  | 'date'
  | 'comparisonGroup'
  | 'coinBalanceLevel'
  | 'adPosition'
  | 'gameType'

interface TransposeRow {
  metricName: string
  [key: string]: string | number
}

type PivotAggregationMode = 'sum' | 'distinct' | 'max' | 'min' | 'avg'

interface PivotRow extends Omit<EventAnalysisDetailRow, 'id'> {
  id: string
  dimensionName: string
  dimensionValue: string
  level: number
  rowType: 'group' | 'detail'
  sourceRows: EventAnalysisDetailRow[]
  children?: PivotRow[]
}

interface PivotDimension {
  key: 'coinBalanceLevel' | 'adPosition' | 'gameType' | 'date'
  name: string
}

const props = defineProps<
  EventChartProps & {
    selectedMetricId?: string
    showGrowthColumns?: boolean
  }
>()

const emit = defineEmits<{
  'open-users': [row: EventAnalysisDetailRow]
  'filter-detail': [field: string, value: string]
}>()

const pivotAggregationMode = ref<PivotAggregationMode>('sum')
const pivotExpandedRowKeys = ref<DataTableRowKey[]>([])

const formatNumber = (value: number): string => new Intl.NumberFormat('zh-CN').format(value)
const formatCurrency = (value: number): string => `¥${formatNumber(value)}`
const formatRate = (value: number): string => `${value.toFixed(1)}%`

const metricSortKeyMap: Record<string, keyof EventAnalysisDetailRow> = {
  metric_ad_watch_pv: 'adWatchPv',
  metric_ad_watch_uv: 'adWatchUv',
  metric_ad_watch_per_user: 'adWatchPerUser',
  metric_ad_complete_rate: 'adCompleteRate',
  metric_ad_revenue: 'adRevenue',
  metric_ad_click_rate: 'wowChange',
}

const metricDefinitions: Array<{
  key: NumericMetricKey
  name: string
  format: (value: number) => string
}> = [
  { key: 'adWatchPv', name: '广告观看次数', format: formatNumber },
  { key: 'adWatchUv', name: '广告观看人数', format: formatNumber },
  { key: 'adWatchPerUser', name: '人均观看次数', format: (value) => value.toFixed(2) },
  { key: 'adCompleteRate', name: '广告完成率', format: formatRate },
  { key: 'adRevenue', name: '广告收益', format: formatCurrency },
  { key: 'wowChange', name: '环比变化', format: formatRate },
  { key: 'yoyChange', name: '同比增长 %', format: formatRate },
  { key: 'contributionRate', name: '下降贡献度', format: formatRate },
  { key: 'affectedUsers', name: '影响用户数', format: formatNumber },
]

type NumericMetricKey =
  | 'adWatchPv'
  | 'adWatchUv'
  | 'adWatchPerUser'
  | 'adCompleteRate'
  | 'adRevenue'
  | 'wowChange'
  | 'yoyChange'
  | 'contributionRate'
  | 'affectedUsers'

const pivotDimensions: PivotDimension[] = [
  { key: 'coinBalanceLevel', name: '金币余额等级' },
  { key: 'adPosition', name: '广告位' },
  { key: 'gameType', name: '游戏类型' },
  { key: 'date', name: '日期' },
]

const pivotAggregationOptions: Array<{ label: string, value: PivotAggregationMode }> = [
  { label: '总计', value: 'sum' },
  { label: '去重', value: 'distinct' },
  { label: '最大值', value: 'max' },
  { label: '最小值', value: 'min' },
  { label: '均值', value: 'avg' },
]

const rows = computed(() => {
  const sourceRows = props.result?.tableRows ?? []
  const sortKey = props.selectedMetricId ? metricSortKeyMap[props.selectedMetricId] : undefined

  if (!sortKey) {
    return sourceRows
  }

  return [...sourceRows].sort((rowA, rowB) => {
    const valueA = rowA[sortKey]
    const valueB = rowB[sortKey]

    return typeof valueA === 'number' && typeof valueB === 'number' ? valueB - valueA : 0
  })
})

const uniqueOptions = (key: DetailColumnKey) =>
  Array.from(new Set(rows.value.map((row) => row[key]))).map((value) => ({
    label: value,
    value,
  }))

const renderDimensionLink = (
  row: EventAnalysisDetailRow,
  key: DetailColumnKey,
  value: string,
) =>
  h(
    'button',
    {
      class: 'dimension-link',
      onClick: () => emit('filter-detail', key, value),
    },
    value,
  )

const renderNumberLink = (row: EventAnalysisDetailRow, value: number, formatter = formatNumber) =>
  h(
    'button',
    {
      class: 'number-link',
      onClick: () => emit('open-users', row),
    },
    formatter(value),
  )

const renderPivotNumber = (row: PivotRow, value: number, formatter = formatNumber) => {
  if (row.rowType === 'detail') {
    return renderNumberLink(row.sourceRows[0] ?? row, value, formatter)
  }

  return h('span', { class: 'pivot-aggregate-value' }, formatter(value))
}

const aggregateMetricValue = (
  sourceRows: EventAnalysisDetailRow[],
  key: NumericMetricKey,
  mode: PivotAggregationMode,
): number => {
  const values = sourceRows.map((row) => row[key])

  if (values.length === 0) {
    return 0
  }

  if (mode === 'distinct') {
    return new Set(values.map((value) => value.toFixed(6))).size
  }

  if (mode === 'max') {
    return Math.max(...values)
  }

  if (mode === 'min') {
    return Math.min(...values)
  }

  if (mode === 'avg') {
    return values.reduce((sum, value) => sum + value, 0) / values.length
  }

  return values.reduce((sum, value) => sum + value, 0)
}

const createPivotGroupRow = (
  id: string,
  dimension: PivotDimension,
  dimensionValue: string,
  level: number,
  sourceRows: EventAnalysisDetailRow[],
): PivotRow => {
  const firstRow = sourceRows[0]

  return {
    id,
    date: firstRow?.date ?? '',
    comparisonGroup: firstRow?.comparisonGroup ?? '全部',
    userGroup: firstRow?.userGroup ?? '全部',
    coinBalanceLevel: firstRow?.coinBalanceLevel ?? '',
    adPosition: firstRow?.adPosition ?? '',
    gameType: firstRow?.gameType ?? '',
    paymentStatus: firstRow?.paymentStatus ?? '',
    appVersion: firstRow?.appVersion ?? '',
    dimensionName: dimension.name,
    dimensionValue,
    level,
    rowType: 'group',
    sourceRows,
    adWatchPv: aggregateMetricValue(sourceRows, 'adWatchPv', pivotAggregationMode.value),
    adWatchUv: aggregateMetricValue(sourceRows, 'adWatchUv', pivotAggregationMode.value),
    adWatchPerUser: aggregateMetricValue(sourceRows, 'adWatchPerUser', pivotAggregationMode.value),
    adCompleteRate: aggregateMetricValue(sourceRows, 'adCompleteRate', pivotAggregationMode.value),
    adRevenue: aggregateMetricValue(sourceRows, 'adRevenue', pivotAggregationMode.value),
    wowChange: aggregateMetricValue(sourceRows, 'wowChange', pivotAggregationMode.value),
    yoyChange: aggregateMetricValue(sourceRows, 'yoyChange', pivotAggregationMode.value),
    contributionRate: aggregateMetricValue(sourceRows, 'contributionRate', pivotAggregationMode.value),
    affectedUsers: aggregateMetricValue(sourceRows, 'affectedUsers', pivotAggregationMode.value),
  }
}

const groupRowsByDimension = (
  sourceRows: EventAnalysisDetailRow[],
  dimensionIndex: number,
  parentKey: string,
): PivotRow[] => {
  const dimension = pivotDimensions[dimensionIndex]

  if (!dimension) {
    return sourceRows.map((row) => ({
      ...row,
      dimensionName: '明细',
      dimensionValue: `${row.date} · ${row.comparisonGroup}`,
      level: pivotDimensions.length,
      rowType: 'detail',
      sourceRows: [row],
    }))
  }

  const groups = new Map<string, EventAnalysisDetailRow[]>()

  sourceRows.forEach((row) => {
    const value = row[dimension.key]
    const groupRows = groups.get(value) ?? []
    groupRows.push(row)
    groups.set(value, groupRows)
  })

  return Array.from(groups.entries()).map(([dimensionValue, groupedRows]) => {
    const rowId = `${parentKey}-${dimension.key}-${dimensionValue}`
    const groupRow = createPivotGroupRow(rowId, dimension, dimensionValue, dimensionIndex, groupedRows)
    groupRow.children = groupRowsByDimension(groupedRows, dimensionIndex + 1, rowId)

    return groupRow
  })
}

const pivotRows = computed<PivotRow[]>(() => groupRowsByDimension(rows.value, 0, 'pivot'))

const collectExpandableKeys = (items: PivotRow[]): DataTableRowKey[] =>
  items.flatMap((item) => [
    item.id,
    ...(item.children ? collectExpandableKeys(item.children) : []),
  ])

const collectExpandableKeysByLevel = (items: PivotRow[], maxLevel: number): DataTableRowKey[] =>
  items.flatMap((item) => [
    ...(item.level < maxLevel ? [item.id] : []),
    ...(item.children ? collectExpandableKeysByLevel(item.children, maxLevel) : []),
  ])

watch(
  pivotRows,
  (items) => {
    pivotExpandedRowKeys.value = collectExpandableKeysByLevel(items, 1)
  },
  { immediate: true },
)

const createFilterColumn = (
  title: string,
  key: DetailColumnKey,
  width: number,
): DataTableColumns<EventAnalysisDetailRow>[number] => ({
  title,
  key,
  width,
  filterOptions: uniqueOptions(key),
  filter: (value, row) => row[key] === value,
  render: (row) => renderDimensionLink(row, key, row[key]),
})

const columns = computed<DataTableColumns<EventAnalysisDetailRow>>(() => {
  const baseColumns: DataTableColumns<EventAnalysisDetailRow> = [
    createFilterColumn('日期', 'date', 108),
    createFilterColumn('对照组', 'comparisonGroup', 150),
    createFilterColumn('金币余额等级', 'coinBalanceLevel', 122),
    createFilterColumn('广告位', 'adPosition', 132),
    createFilterColumn('游戏类型', 'gameType', 96),
    {
      title: '广告观看次数',
      key: 'adWatchPv',
      width: 124,
      sorter: (rowA, rowB) => rowA.adWatchPv - rowB.adWatchPv,
      render: (row) => renderNumberLink(row, row.adWatchPv),
    },
    {
      title: '广告观看人数',
      key: 'adWatchUv',
      width: 124,
      sorter: (rowA, rowB) => rowA.adWatchUv - rowB.adWatchUv,
      render: (row) => renderNumberLink(row, row.adWatchUv),
    },
    {
      title: '人均观看次数',
      key: 'adWatchPerUser',
      width: 122,
      sorter: (rowA, rowB) => rowA.adWatchPerUser - rowB.adWatchPerUser,
      render: (row) => row.adWatchPerUser.toFixed(2),
    },
    {
      title: '广告完成率',
      key: 'adCompleteRate',
      width: 112,
      sorter: (rowA, rowB) => rowA.adCompleteRate - rowB.adCompleteRate,
      render: (row) => formatRate(row.adCompleteRate),
    },
    {
      title: '广告收益',
      key: 'adRevenue',
      width: 112,
      sorter: (rowA, rowB) => rowA.adRevenue - rowB.adRevenue,
      render: (row) => formatCurrency(row.adRevenue),
    },
    {
      title: '环比变化',
      key: 'wowChange',
      width: 104,
      sorter: (rowA, rowB) => rowA.wowChange - rowB.wowChange,
      render: (row) =>
        h(NTag, { type: row.wowChange < -10 ? 'error' : 'warning', size: 'small' }, () =>
          formatRate(row.wowChange),
        ),
    },
  ]

  if (props.showGrowthColumns) {
    baseColumns.push(
      {
        title: '环比增长 %',
        key: 'wowGrowth',
        width: 112,
        sorter: (rowA, rowB) => rowA.wowChange - rowB.wowChange,
        render: (row) => formatRate(row.wowChange),
      },
      {
        title: '同比增长 %',
        key: 'yoyChange',
        width: 112,
        sorter: (rowA, rowB) => rowA.yoyChange - rowB.yoyChange,
        render: (row) => formatRate(row.yoyChange),
      },
    )
  }

  baseColumns.push(
    {
      title: '下降贡献度',
      key: 'contributionRate',
      width: 112,
      sorter: (rowA, rowB) => rowA.contributionRate - rowB.contributionRate,
      render: (row) => formatRate(row.contributionRate),
    },
    {
      title: '影响用户数',
      key: 'affectedUsers',
      width: 112,
      sorter: (rowA, rowB) => rowA.affectedUsers - rowB.affectedUsers,
      render: (row) => renderNumberLink(row, row.affectedUsers),
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 220,
      render: (row) =>
        h(NSpace, { size: 6 }, () => [
          h(NButton, { size: 'tiny', text: true, type: 'primary', onClick: () => emit('open-users', row) }, () => '查看用户'),
          h(NButton, { size: 'tiny', text: true }, () => '存为分群'),
          h(NButton, { size: 'tiny', text: true }, () => '创建任务'),
          h(NButton, { size: 'tiny', text: true }, () => '创建实验'),
        ]),
    },
  )

  return baseColumns
})

const pivotColumns = computed<DataTableColumns<PivotRow>>(() => [
  {
    title: '分组层级',
    key: 'dimensionValue',
    fixed: 'left',
    width: 220,
    render: (row) =>
      h('div', { class: ['pivot-dimension-cell', `level-${row.level}`] }, [
        h('strong', row.dimensionValue),
        h('span', `${row.dimensionName} · ${row.sourceRows.length} 条明细`),
      ]),
  },
  {
    title: '对照组',
    key: 'comparisonGroup',
    width: 150,
    render: (row) => row.rowType === 'detail'
      ? renderDimensionLink(row.sourceRows[0] ?? row, 'comparisonGroup', row.comparisonGroup)
      : '汇总',
  },
  {
    title: '广告观看次数',
    key: 'adWatchPv',
    width: 124,
    sorter: (rowA, rowB) => rowA.adWatchPv - rowB.adWatchPv,
    render: (row) => renderPivotNumber(row, row.adWatchPv),
  },
  {
    title: '广告观看人数',
    key: 'adWatchUv',
    width: 124,
    sorter: (rowA, rowB) => rowA.adWatchUv - rowB.adWatchUv,
    render: (row) => renderPivotNumber(row, row.adWatchUv),
  },
  {
    title: '人均观看次数',
    key: 'adWatchPerUser',
    width: 122,
    sorter: (rowA, rowB) => rowA.adWatchPerUser - rowB.adWatchPerUser,
    render: (row) => row.adWatchPerUser.toFixed(2),
  },
  {
    title: '广告完成率',
    key: 'adCompleteRate',
    width: 112,
    sorter: (rowA, rowB) => rowA.adCompleteRate - rowB.adCompleteRate,
    render: (row) => formatRate(row.adCompleteRate),
  },
  {
    title: '广告收益',
    key: 'adRevenue',
    width: 112,
    sorter: (rowA, rowB) => rowA.adRevenue - rowB.adRevenue,
    render: (row) => formatCurrency(row.adRevenue),
  },
  {
    title: '环比变化',
    key: 'wowChange',
    width: 104,
    sorter: (rowA, rowB) => rowA.wowChange - rowB.wowChange,
    render: (row) => formatRate(row.wowChange),
  },
  {
    title: '下降贡献度',
    key: 'contributionRate',
    width: 112,
    sorter: (rowA, rowB) => rowA.contributionRate - rowB.contributionRate,
    render: (row) => formatRate(row.contributionRate),
  },
  {
    title: '影响用户数',
    key: 'affectedUsers',
    width: 112,
    sorter: (rowA, rowB) => rowA.affectedUsers - rowB.affectedUsers,
    render: (row) => renderPivotNumber(row, row.affectedUsers),
  },
])

const transposeColumns = computed<DataTableColumns<TransposeRow>>(() => {
  const dimensions = rows.value.slice(0, 8).map((row) => `${row.date}-${row.adPosition}`)

  return [
    { title: '指标', key: 'metricName', fixed: 'left', width: 140 },
    ...dimensions.map((dimension) => ({
      title: dimension,
      key: dimension,
      width: 140,
    })),
  ]
})

const transposeRows = computed<TransposeRow[]>(() => {
  const dimensionRows = rows.value.slice(0, 8)

  return metricDefinitions.map((metric) => {
    const row: TransposeRow = { metricName: metric.name }

    dimensionRows.forEach((detailRow) => {
      const value = detailRow[metric.key]
      row[`${detailRow.date}-${detailRow.adPosition}`] =
        typeof value === 'number' ? metric.format(value) : String(value)
    })

    return row
  })
})

const transposeLimitExceeded = computed(() => {
  const metricCount = metricDefinitions.length
  const groupCount = new Set(rows.value.map((row) => `${row.date}-${row.adPosition}-${row.gameType}`)).size

  return metricCount * groupCount > 50
})
</script>

<template>
  <n-spin :show="loading">
    <template v-if="config.tableMode === 'hierarchy'">
      <div class="table-toolbar">
        <n-space align="center" justify="space-between">
          <n-space align="center">
            <span class="toolbar-label">折叠汇总口径</span>
            <n-select
              v-model:value="pivotAggregationMode"
              :options="pivotAggregationOptions"
              size="small"
              class="aggregation-select"
            />
          </n-space>
          <n-space>
            <n-button size="small" @click="pivotExpandedRowKeys = collectExpandableKeys(pivotRows)">
              展开全部
            </n-button>
            <n-button size="small" @click="pivotExpandedRowKeys = []">
              折叠全部
            </n-button>
          </n-space>
        </n-space>
      </div>
      <n-data-table
        v-if="pivotRows.length"
        v-model:expanded-row-keys="pivotExpandedRowKeys"
        :columns="pivotColumns"
        :data="pivotRows"
        :pagination="false"
        :row-key="(row) => row.id"
        :scroll-x="1280"
        size="small"
      />
      <n-empty v-else description="暂无透视数据" />
    </template>
    <template v-else-if="config.tableMode === 'transpose'">
      <n-alert v-if="transposeLimitExceeded" type="warning" :show-icon="false" class="table-alert">
        转置结果过大，当前仅展示前 8 个维度列。请减少指标或分组后查看完整转置结果。
      </n-alert>
      <n-data-table
        v-if="transposeRows.length"
        :columns="transposeColumns"
        :data="transposeRows"
        :pagination="false"
        :scroll-x="1260"
        size="small"
      />
      <n-empty v-else description="暂无转置数据" />
    </template>
    <template v-else>
      <n-data-table
        v-if="rows.length"
        :columns="columns"
        :data="rows"
        :pagination="{ pageSize: 10 }"
        :scroll-x="1880"
        size="small"
      />
      <n-empty v-else description="当前条件下暂无详细数据，请调整筛选条件或时间范围。" />
    </template>
  </n-spin>
</template>

<style scoped lang="scss">
.table-alert {
  margin-bottom: 10px;
}

.table-toolbar {
  margin-bottom: 10px;
}

.toolbar-label {
  color: #6b7280;
  font-size: 13px;
}

.aggregation-select {
  width: 120px;
}

:deep(.number-link),
:deep(.dimension-link) {
  padding: 0;
  border: 0;
  background: transparent;
  color: #2563eb;
  cursor: pointer;
}

:deep(.dimension-link) {
  color: #374151;
}

:deep(.pivot-aggregate-value) {
  color: #111827;
  font-weight: 650;
}

:deep(.pivot-dimension-cell) {
  display: grid;
  gap: 2px;
}

:deep(.pivot-dimension-cell strong) {
  color: #111827;
  font-size: 13px;
}

:deep(.pivot-dimension-cell span) {
  color: #6b7280;
  font-size: 12px;
}

:deep(.pivot-dimension-cell.level-1) {
  padding-left: 10px;
}

:deep(.pivot-dimension-cell.level-2) {
  padding-left: 20px;
}

:deep(.pivot-dimension-cell.level-3) {
  padding-left: 30px;
}
</style>
