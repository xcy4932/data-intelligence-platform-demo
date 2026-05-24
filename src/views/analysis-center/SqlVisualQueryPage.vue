<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NAlert,
  NButton,
  NDatePicker,
  NEmpty,
  NForm,
  NFormItem,
  NGi,
  NGrid,
  NInput,
  NModal,
  NRadio,
  NRadioButton,
  NRadioGroup,
  NSelect,
  NSpace,
  NSwitch,
  NTabPane,
  NTabs,
  NTag,
} from 'naive-ui'
import type { SelectOption } from 'naive-ui'
import { sqlQueryService } from '@/services/sqlQueryService'
import type {
  SqlQueryJob,
  SqlResultPage,
  SqlResultColumn,
  SqlRoutineRunRecord,
  SqlRoutineScheduleType,
  SqlRoutineTask,
  SqlTemporaryDataset,
  SqlVisualChart,
} from '@/types/sqlQuery'

type FeedbackType = 'success' | 'warning' | 'error' | 'info'
type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'scatter' | 'metric' | 'table'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const dataset = ref<SqlTemporaryDataset | null>(null)
const sourceJob = ref<SqlQueryJob | null>(null)
const resultPreview = ref<SqlResultPage | null>(null)
const chart = ref<SqlVisualChart | null>(null)
const routines = ref<SqlRoutineTask[]>([])
const routineRuns = ref<SqlRoutineRunRecord[]>([])
const selectedRoutineId = ref('')
const saveModalVisible = ref(false)
const routineModalVisible = ref(false)
const activeTab = ref('preview')
const fieldKeyword = ref('')
const fieldTypeFilter = ref('all')
const feedback = reactive<{ type: FeedbackType, message: string }>({
  type: 'info',
  message: '正在加载 SQL 查询临时数据集。',
})
const saveDraft = reactive({
  chartName: '订单趋势图',
  targetProjectId: 'project_001',
  folderId: '默认目录',
  datasetName: '订单趋势_SQL结果',
  description: '',
})
const routineDraft = reactive({
  syncType: 'full_overwrite' as 'full_overwrite' | 'partition_overwrite',
  partitionField: '',
  scheduleType: 'daily' as SqlRoutineScheduleType,
  scheduleStartAt: Date.now(),
  executeTime: '08:00',
  scheduleCron: '0 0 8 * * ?',
  notifyEnabled: true,
  notifyUserIds: ['user_001'],
})
const chartConfig = reactive({
  type: 'bar' as ChartType,
  dimension: '',
  measure: '',
  series: '',
  limit: 12,
})
const projectOptions: SelectOption[] = [
  { label: '增长分析项目', value: 'project_001' },
  { label: '经营驾驶舱项目', value: 'project_002' },
]
const scheduleOptions: SelectOption[] = [
  { label: '每日', value: 'daily' },
  { label: '每周', value: 'weekly' },
  { label: '每月', value: 'monthly' },
  { label: 'Cron', value: 'cron' },
]
const notifyUserOptions: SelectOption[] = [
  { label: 'Chaoyang Xu', value: 'user_001' },
  { label: '数据平台值班组', value: 'team_oncall' },
]
const chartTypeOptions: Array<{ label: string, value: ChartType }> = [
  { label: '柱状图', value: 'bar' },
  { label: '折线图', value: 'line' },
  { label: '面积图', value: 'area' },
  { label: '饼图', value: 'pie' },
  { label: '散点图', value: 'scatter' },
  { label: '指标卡', value: 'metric' },
  { label: '明细表', value: 'table' },
]
const chartPalette = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#4b5563']

const dateFieldOptions = computed<SelectOption[]>(() =>
  (dataset.value?.schema ?? [])
    .filter((field) => field.displayType === 'date' || field.displayType === 'datetime')
    .map((field) => ({ label: `${field.name} · ${field.type}`, value: field.name })),
)
const routineEnabledReason = computed(() => {
  if (!chart.value) return '未保存图表不可配置例行'
  if (!sourceJob.value) return '源查询任务不存在'
  if ((sourceJob.value.resultSizeBytes ?? 0) > 1_073_741_824) return '当前查询结果超过 1GB'
  return ''
})
const selectedRoutine = computed(() => routines.value.find((routine) => routine.id === selectedRoutineId.value) ?? routines.value[0])
const complexFields = computed(() => (dataset.value?.schema ?? []).filter((field) => field.displayType === 'array_as_string' || field.displayType === 'map_as_string'))
const numericFields = computed(() => (dataset.value?.schema ?? []).filter((field) => field.displayType === 'number'))
const preferredMeasureFields = computed(() => numericFields.value.filter((field) => !isIdentifierField(field.name)))
const dimensionFields = computed(() =>
  (dataset.value?.schema ?? []).filter((field) => field.displayType !== 'array_as_string' && field.displayType !== 'map_as_string'),
)
const seriesFields = computed(() =>
  dimensionFields.value.filter(
    (field) =>
      field.name !== chartConfig.dimension &&
      field.name !== chartConfig.measure &&
      field.displayType !== 'number',
  ),
)
const fieldTypeOptions = computed<SelectOption[]>(() => {
  const counts = new Map<string, number>()
  ;(dataset.value?.schema ?? []).forEach((field) => counts.set(field.displayType, (counts.get(field.displayType) ?? 0) + 1))
  return [
    { label: `全部字段 (${dataset.value?.schema.length ?? 0})`, value: 'all' },
    ...Array.from(counts.entries()).map(([type, count]) => ({ label: `${type} (${count})`, value: type })),
  ]
})
const filteredFields = computed(() => {
  const keyword = fieldKeyword.value.trim().toLowerCase()
  return (dataset.value?.schema ?? []).filter((field) => {
    const typeMatched = fieldTypeFilter.value === 'all' || field.displayType === fieldTypeFilter.value
    const keywordMatched = !keyword || field.name.toLowerCase().includes(keyword) || field.type.toLowerCase().includes(keyword)
    return typeMatched && keywordMatched
  })
})
const fieldStats = computed(() => {
  const schema = dataset.value?.schema ?? []
  return {
    total: schema.length,
    dimensions: dimensionFields.value.length,
    measures: numericFields.value.length,
    complex: complexFields.value.length,
  }
})
const dimensionOptions = computed<SelectOption[]>(() =>
  dimensionFields.value.map((field) => ({ label: `${field.name} · ${field.displayType}`, value: field.name })),
)
const measureOptions = computed<SelectOption[]>(() => {
  const preferred = preferredMeasureFields.value.map((field) => ({ label: `${field.name} · ${field.type}`, value: field.name }))
  const identifiers = numericFields.value
    .filter((field) => isIdentifierField(field.name))
    .map((field) => ({ label: `${field.name} · 标识字段，不建议求和`, value: field.name }))
  return [...preferred, ...identifiers]
})
const seriesOptions = computed<SelectOption[]>(() => [
  { label: '不拆分系列', value: '' },
  ...seriesFields.value
    .map((field) => ({ label: `${field.name} · ${field.displayType}`, value: field.name })),
])
const selectedDimensionName = computed(() => chartConfig.dimension || dimensionFields.value[0]?.name || '')
const selectedMeasureName = computed(() => chartConfig.measure || preferredMeasureFields.value[0]?.name || numericFields.value[0]?.name || '')
const groupedChartData = computed(() => {
  const rows = resultPreview.value?.rows ?? []
  const dimension = selectedDimensionName.value
  const measure = selectedMeasureName.value
  const seriesField = chartConfig.series
  const grouped = new Map<string, Map<string, number>>()
  rows.forEach((row) => {
    const key = dimension ? formatCell(row[dimension]) || '-' : '全部'
    const seriesKey = seriesField ? formatCell(row[seriesField]) || '空值' : '总计'
    const value = measure ? Number(row[measure] ?? 0) : 1
    const seriesMap = grouped.get(key) ?? new Map<string, number>()
    seriesMap.set(seriesKey, (seriesMap.get(seriesKey) ?? 0) + (Number.isFinite(value) ? value : 0))
    grouped.set(key, seriesMap)
  })
  return grouped
})
const chartSeriesNames = computed(() => {
  const totals = new Map<string, number>()
  groupedChartData.value.forEach((seriesMap) => {
    seriesMap.forEach((value, key) => totals.set(key, (totals.get(key) ?? 0) + value))
  })
  return Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, chartConfig.series ? 6 : 1)
    .map(([name]) => name)
})
const chartRows = computed(() => {
  return Array.from(groupedChartData.value.entries())
    .map(([label, seriesMap]) => ({
      label,
      value: Array.from(seriesMap.values()).reduce((sum, value) => sum + value, 0),
      series: chartSeriesNames.value.map((name) => ({ name, value: seriesMap.get(name) ?? 0 })),
    }))
    .slice(0, chartConfig.limit)
})
const chartSeries = computed(() =>
  chartSeriesNames.value.map((name, index) => ({
    name,
    color: chartPalette[index % chartPalette.length] ?? '#2563eb',
    values: chartRows.value.map((row) => ({ label: row.label, value: row.series.find((item) => item.name === name)?.value ?? 0 })),
  })),
)
const chartMaxValue = computed(() =>
  Math.max(
    ...chartRows.value.map((row) => row.value),
    ...chartSeries.value.flatMap((series) => series.values.map((point) => point.value)),
    1,
  ),
)
const chartTotalValue = computed(() => chartRows.value.reduce((sum, row) => sum + row.value, 0))
const pieSlices = computed(() => {
  let start = 0
  return chartRows.value.map((row, index) => {
    const deg = chartTotalValue.value ? (row.value / chartTotalValue.value) * 360 : 0
    const slice = { ...row, start, end: start + deg, color: chartPalette[index % chartPalette.length] ?? '#2563eb' }
    start += deg
    return slice
  })
})
const pieGradient = computed(() =>
  pieSlices.value.length
    ? `conic-gradient(${pieSlices.value.map((slice) => `${slice.color} ${slice.start}deg ${slice.end}deg`).join(', ')})`
    : '#e5e7eb',
)
const chartRecommendation = computed(() => {
  if (!numericFields.value.length) return '当前结果没有数值字段，建议使用明细表查看数据。'
  if (selectedMeasureName.value && isIdentifierField(selectedMeasureName.value)) return '当前指标像 ID 字段，建议切换为金额、次数、数量等可聚合指标。'
  if (dateFieldOptions.value.length) return '检测到日期字段，适合使用折线图、面积图或柱状图观察趋势。'
  if (dimensionFields.value.length > 1) return '检测到多个维度字段，可通过系列拆分比较不同分组。'
  return '当前结果适合使用指标卡、柱状图或饼图查看聚合结果。'
})

function setFeedback(type: FeedbackType, message: string): void {
  feedback.type = type
  feedback.message = message
}

function formatDate(timestamp: number | null): string {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function isIdentifierField(name: string): boolean {
  return /(^id$|_id$|id$|编号|主键|key$)/i.test(name)
}

function setDefaultChartConfig(): void {
  const firstDate = (dataset.value?.schema ?? []).find((field) => field.displayType === 'date' || field.displayType === 'datetime')
  const firstDimension = firstDate ?? dimensionFields.value[0]
  const firstMeasure = preferredMeasureFields.value[0] ?? numericFields.value[0]
  chartConfig.dimension = firstDimension?.name ?? ''
  chartConfig.measure = firstMeasure?.name ?? ''
  chartConfig.type = firstMeasure ? (firstDate ? 'line' : 'bar') : 'table'
  chartConfig.series = ''
}

function fieldTagType(field: SqlResultColumn): 'success' | 'info' | 'warning' | 'error' | 'default' {
  if (field.displayType === 'number') return 'success'
  if (field.displayType === 'date' || field.displayType === 'datetime') return 'warning'
  if (field.displayType === 'array_as_string' || field.displayType === 'map_as_string') return 'info'
  return 'default'
}

function formatMetric(value: number): string {
  if (!Number.isFinite(value)) return '-'
  if (Math.abs(value) >= 100000000) return `${(value / 100000000).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}亿`
  if (Math.abs(value) >= 10000) return `${(value / 10000).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}万`
  return value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

function barHeight(value: number): string {
  return `${Math.max(8, (value / chartMaxValue.value) * 145)}px`
}

function scatterLeft(index: number): string {
  const count = Math.max(1, chartRows.value.length - 1)
  return `${6 + (index / count) * 88}%`
}

function scatterBottom(value: number): string {
  return `${12 + (value / chartMaxValue.value) * 76}%`
}

function shortLabel(value: string): string {
  const text = value.includes(' ') ? value.split(' ')[0] ?? value : value
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(5)
  if (text.length > 12) return `${text.slice(0, 10)}...`
  return text
}

function pointsForSeries(rows: Array<{ label: string, value: number }>): Array<{ label: string, value: number, x: number, y: number }> {
  if (rows.length <= 1) {
    return rows.map((row) => ({ ...row, x: 40, y: 90 - (row.value / chartMaxValue.value) * 70 }))
  }
  return rows.map((row, index) => ({
    ...row,
    x: 36 + (index / (rows.length - 1)) * 528,
    y: 178 - (row.value / chartMaxValue.value) * 142,
  }))
}

function pointsToPolyline(points: Array<{ x: number, y: number }>): string {
  return points.map((point) => `${point.x},${point.y}`).join(' ')
}

function pointsToArea(points: Array<{ x: number, y: number }>): string {
  if (!points.length) return ''
  return `36,190 ${pointsToPolyline(points)} 564,190`
}

function seriesPolyline(series: { values: Array<{ label: string, value: number }> }): string {
  return pointsToPolyline(pointsForSeries(series.values))
}

function seriesArea(series: { values: Array<{ label: string, value: number }> }): string {
  return pointsToArea(pointsForSeries(series.values))
}

function seriesPointList(series: { values: Array<{ label: string, value: number }> }): Array<{ label: string, value: number, x: number, y: number }> {
  return pointsForSeries(series.values)
}

function changeChartType(value: string): void {
  chartConfig.type = value as ChartType
  if (chartConfig.type === 'pie' || chartConfig.type === 'metric' || chartConfig.type === 'table') {
    chartConfig.series = ''
  }
  if (chartConfig.type === 'metric' && !chartConfig.measure) {
    chartConfig.measure = preferredMeasureFields.value[0]?.name ?? numericFields.value[0]?.name ?? ''
  }
}

watch(seriesFields, (fields) => {
  if (chartConfig.series && !fields.some((field) => field.name === chartConfig.series)) {
    chartConfig.series = ''
  }
})

async function initialize(): Promise<void> {
  loading.value = true
  try {
    const datasetId = String(route.query.datasetId ?? '')
    const jobId = String(route.query.jobId ?? '')
    if (!datasetId || !jobId) {
      throw new Error('缺少 SQL 查询临时数据集参数')
    }
    await sqlQueryService.cleanupTemporaryDatasets()
    let currentDataset = await sqlQueryService.getVisualizationDataset(datasetId)
    for (let index = 0; index < 8 && currentDataset.status === 'creating'; index += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 300))
      currentDataset = await sqlQueryService.getVisualizationDataset(datasetId)
    }
    dataset.value = currentDataset
    const snapshot = await sqlQueryService.getJobResultSnapshot(jobId)
    sourceJob.value = snapshot.job
    resultPreview.value = snapshot.result
    setDefaultChartConfig()
    chart.value = await sqlQueryService.getChartByTemporaryDataset(datasetId)
    await loadRoutines()
    if (currentDataset.status === 'ready') {
      setFeedback('success', '临时数据集已就绪，可配置图表并保存。')
    } else if (currentDataset.status === 'converted') {
      setFeedback('success', '图表已保存，临时数据集已转为正式数据集。')
    } else if (currentDataset.status === 'expired') {
      setFeedback('warning', '临时数据集已过期，请返回 SQL 查询重新生成。')
    } else {
      setFeedback('warning', '数据集正在生成中，稍后可继续配置图表。')
    }
  } catch (error) {
    setFeedback('error', error instanceof Error ? error.message : '可视化查询加载失败')
  } finally {
    loading.value = false
  }
}

async function saveChart(): Promise<void> {
  if (!dataset.value) return
  try {
    const saved = await sqlQueryService.createChart({
      temporaryDatasetId: dataset.value.id,
      targetProjectId: saveDraft.targetProjectId,
      chartName: saveDraft.chartName,
      datasetName: saveDraft.datasetName,
      description: saveDraft.description,
      chartConfig: {
        type: chartConfig.type,
        dimensions: chartConfig.dimension ? [chartConfig.dimension] : [],
        measures: chartConfig.measure ? [chartConfig.measure] : [],
        series: chartConfig.series ? [chartConfig.series] : [],
        limit: chartConfig.limit,
      },
    })
    chart.value = saved
    saveModalVisible.value = false
    await loadRoutines()
    setFeedback('success', '图表已保存，临时数据集已转为正式数据集。')
  } catch (error) {
    setFeedback('error', error instanceof Error ? error.message : '保存图表失败')
  }
}

async function loadRoutines(): Promise<void> {
  if (!chart.value) return
  routines.value = await sqlQueryService.listRoutines(chart.value.id)
  selectedRoutineId.value = routines.value[0]?.id ?? ''
  if (selectedRoutine.value) {
    routineRuns.value = await sqlQueryService.listRoutineRuns(selectedRoutine.value.id)
  }
}

async function saveRoutine(): Promise<void> {
  if (!chart.value) {
    setFeedback('warning', '未保存图表不可配置例行')
    return
  }
  if (routineDraft.syncType === 'partition_overwrite' && !routineDraft.partitionField) {
    setFeedback('error', '分区覆盖需要选择可作为分区的日期字段')
    return
  }
  try {
    const routine = await sqlQueryService.createRoutine({
      projectId: chart.value.projectId,
      chartId: chart.value.id,
      datasetId: chart.value.datasetId,
      syncType: routineDraft.syncType,
      partitionField: routineDraft.syncType === 'partition_overwrite' ? routineDraft.partitionField : undefined,
      scheduleType: routineDraft.scheduleType,
      scheduleStartAt: formatDate(routineDraft.scheduleStartAt),
      executeTime: routineDraft.executeTime,
      scheduleCron: routineDraft.scheduleType === 'cron' ? routineDraft.scheduleCron : undefined,
      notifyEnabled: routineDraft.notifyEnabled,
      notifyUserIds: routineDraft.notifyEnabled ? routineDraft.notifyUserIds : [],
    })
    routineModalVisible.value = false
    await loadRoutines()
    selectedRoutineId.value = routine.id
    setFeedback('success', 'SQL 例行配置已启用。')
  } catch (error) {
    setFeedback('error', error instanceof Error ? error.message : '例行保存失败')
  }
}

async function refreshRoutineRuns(): Promise<void> {
  if (!selectedRoutine.value) return
  routineRuns.value = await sqlQueryService.listRoutineRuns(selectedRoutine.value.id)
}

async function runOnce(routine: SqlRoutineTask): Promise<void> {
  try {
    await sqlQueryService.runRoutineOnce(routine.id)
    await refreshRoutineRuns()
    setFeedback('success', '已触发一次手动运行。')
  } catch (error) {
    setFeedback('error', error instanceof Error ? error.message : '手动运行失败')
  }
}

async function pauseRoutine(routine: SqlRoutineTask): Promise<void> {
  await sqlQueryService.pauseRoutine(routine.id)
  await loadRoutines()
  setFeedback('warning', '例行任务已暂停。')
}

async function resumeRoutine(routine: SqlRoutineTask): Promise<void> {
  await sqlQueryService.resumeRoutine(routine.id)
  await loadRoutines()
  setFeedback('success', '例行任务已启用。')
}

async function deleteRoutine(routine: SqlRoutineTask): Promise<void> {
  if (!window.confirm('删除例行配置不会删除图表和数据集，确认删除？')) return
  await sqlQueryService.deleteRoutine(routine.id)
  await loadRoutines()
  setFeedback('success', '例行配置已删除。')
}

onMounted(() => {
  void initialize()
})
</script>

<template>
  <div class="visual-query-page">
    <div class="visual-header">
      <div>
        <h1>可视化查询</h1>
        <p>基于 SQL 查询临时数据集配置图表，保存后可创建 SQL 例行。</p>
      </div>
      <n-space>
        <n-button secondary @click="router.push('/analysis-center/sql-query')">返回 SQL 查询</n-button>
        <n-button type="primary" :disabled="dataset?.status !== 'ready' && dataset?.status !== 'converted'" @click="saveModalVisible = true">
          保存图表
        </n-button>
        <n-button :disabled="Boolean(routineEnabledReason)" secondary @click="routineModalVisible = true">
          例行
        </n-button>
      </n-space>
    </div>

    <n-alert :type="feedback.type" :show-icon="false" class="visual-feedback">
      {{ feedback.message }}
    </n-alert>
    <n-alert v-if="routineEnabledReason" type="warning" :show-icon="false" class="visual-feedback">
      {{ routineEnabledReason }}
    </n-alert>
    <n-alert v-if="dataset" type="info" :show-icon="false" class="visual-feedback">
      当前图表基于 SQL 查询临时数据集生成。保存图表后，该临时数据集将转为正式数据集。
    </n-alert>

    <div class="visual-grid">
      <section class="visual-panel">
        <div class="section-title">
          <strong>数据集</strong>
          <n-tag :type="dataset?.status === 'ready' || dataset?.status === 'converted' ? 'success' : 'info'" :bordered="false">
            {{ dataset?.status ?? 'loading' }}
          </n-tag>
        </div>
        <div v-if="dataset" class="dataset-meta">
          <span>名称</span><strong>{{ dataset.name }}</strong>
          <span>来源</span><strong>{{ dataset.originType }}</strong>
          <span>过期时间</span><strong>{{ dataset.expiredAt }}</strong>
          <span>字段数</span><strong>{{ dataset.schema.length }}</strong>
        </div>
        <div class="field-summary">
          <div><strong>{{ fieldStats.total }}</strong><span>全部字段</span></div>
          <div><strong>{{ fieldStats.dimensions }}</strong><span>可作维度</span></div>
          <div><strong>{{ fieldStats.measures }}</strong><span>数值指标</span></div>
          <div><strong>{{ fieldStats.complex }}</strong><span>复杂类型</span></div>
        </div>
        <div class="field-toolbar">
          <n-input v-model:value="fieldKeyword" size="small" clearable placeholder="搜索字段名或类型" />
          <n-select v-model:value="fieldTypeFilter" size="small" :options="fieldTypeOptions" />
        </div>
        <div class="field-table-wrap">
          <table class="field-table">
            <thead>
              <tr><th>字段</th><th>类型</th><th>用途</th></tr>
            </thead>
            <tbody>
              <tr v-for="field in filteredFields" :key="field.name">
                <td>
                  <strong>{{ field.name }}</strong>
                  <small>{{ field.nullable ? '可空' : '必填' }}</small>
                </td>
                <td><n-tag size="small" :type="fieldTagType(field)" :bordered="false">{{ field.displayType }}</n-tag></td>
                <td>
                  <span v-if="field.displayType === 'number'">指标</span>
                  <span v-else-if="field.displayType === 'array_as_string' || field.displayType === 'map_as_string'">String 处理</span>
                  <span v-else>维度</span>
                </td>
              </tr>
            </tbody>
          </table>
          <n-empty v-if="!filteredFields.length" description="没有匹配字段" />
        </div>
        <n-alert v-if="complexFields.length" type="warning" :show-icon="false" class="local-alert">
          Map、Array 字段在 SQL 例行中按 String 处理，不支持内部元素原生聚合。
        </n-alert>
      </section>

      <section class="visual-panel chart-panel">
        <div class="section-title">
          <strong>{{ chart?.chartName ?? saveDraft.chartName }}</strong>
          <span>{{ chart ? '已保存图表' : '未保存图表' }}</span>
        </div>
        <div class="chart-config-bar">
          <n-radio-group :value="chartConfig.type" @update:value="changeChartType">
            <n-radio-button v-for="type in chartTypeOptions" :key="type.value" :value="type.value">
              {{ type.label }}
            </n-radio-button>
          </n-radio-group>
          <n-grid :cols="24" :x-gap="12" :y-gap="8">
            <n-gi :span="8">
              <n-select v-model:value="chartConfig.dimension" size="small" :options="dimensionOptions" placeholder="维度字段" />
            </n-gi>
            <n-gi :span="8">
              <n-select v-model:value="chartConfig.measure" size="small" :options="measureOptions" placeholder="指标字段" :disabled="chartConfig.type === 'table'" />
            </n-gi>
            <n-gi :span="8">
              <n-select v-model:value="chartConfig.series" size="small" :options="seriesOptions" placeholder="系列拆分" :disabled="chartConfig.type === 'pie' || chartConfig.type === 'metric' || chartConfig.type === 'table'" />
            </n-gi>
          </n-grid>
          <div class="chart-hint">{{ chartRecommendation }}</div>
        </div>

        <div class="chart-preview">
          <div class="chart-title-row">
            <div>
              <strong>{{ selectedMeasureName || '记录数' }}</strong>
              <span>按 {{ selectedDimensionName || '全部' }} 汇总<span v-if="chartConfig.series">，按 {{ chartConfig.series }} 分组</span></span>
            </div>
            <n-space v-if="chartConfig.series && chartConfig.type !== 'pie' && chartConfig.type !== 'metric' && chartConfig.type !== 'table'" size="small">
              <n-tag v-for="series in chartSeries" :key="series.name" size="small" :bordered="false">
                <i class="legend-dot" :style="{ background: series.color }" />{{ series.name }}
              </n-tag>
            </n-space>
          </div>

          <div v-if="chartConfig.type === 'metric'" class="metric-preview">
            <span>{{ chartConfig.measure || '记录数' }}</span>
            <strong>{{ formatMetric(chartTotalValue) }}</strong>
            <small>基于 {{ chartRows.length }} 个分组汇总</small>
          </div>

          <div v-else-if="chartConfig.type === 'pie'" class="pie-preview">
            <div class="pie-shape" :style="{ background: pieGradient }" />
            <div class="pie-legend">
              <div v-for="slice in pieSlices" :key="slice.label">
                <i :style="{ background: slice.color }" />
                <span>{{ slice.label }}</span>
                <strong>{{ formatMetric(slice.value) }}</strong>
              </div>
            </div>
          </div>

          <div v-else-if="chartConfig.type === 'line' || chartConfig.type === 'area'" class="line-preview">
            <svg viewBox="0 0 600 210" role="img">
              <g v-for="series in chartSeries" :key="series.name">
                <polyline v-if="chartConfig.type === 'area'" :points="seriesArea(series)" :fill="`${series.color}22`" stroke="none" />
                <polyline :points="seriesPolyline(series)" fill="none" :stroke="series.color" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
                <circle v-for="point in seriesPointList(series)" :key="`${series.name}-${point.label}`" :cx="point.x" :cy="point.y" r="4" :fill="series.color" />
              </g>
            </svg>
            <div class="axis-labels">
              <span v-for="row in chartRows" :key="row.label">{{ shortLabel(row.label) }}</span>
            </div>
          </div>

          <div v-else-if="chartConfig.type === 'scatter'" class="scatter-preview">
            <div
              v-for="(row, index) in chartRows"
              :key="row.label"
              class="scatter-dot"
              :style="{ left: scatterLeft(index), bottom: scatterBottom(row.value) }"
            >
              <span>{{ formatMetric(row.value) }}</span>
            </div>
          </div>

          <table v-else-if="chartConfig.type === 'table'" class="chart-table-preview">
            <thead>
              <tr><th v-for="column in resultPreview?.columns ?? []" :key="column.name">{{ column.name }}</th></tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in resultPreview?.rows.slice(0, 8) ?? []" :key="index">
                <td v-for="column in resultPreview?.columns ?? []" :key="column.name">{{ formatCell(row[column.name]) }}</td>
              </tr>
            </tbody>
          </table>

          <div v-else class="bar-chart">
            <div v-for="row in chartRows" :key="row.label" class="bar-item">
              <div v-if="!chartConfig.series" class="bar-value">{{ formatMetric(row.value) }}</div>
              <div class="bar-group">
                <div
                  v-for="(series, index) in row.series"
                  :key="series.name"
                  class="bar"
                  :style="{ height: barHeight(series.value), background: chartPalette[index % chartPalette.length] }"
                  :title="`${series.name}: ${formatMetric(series.value)}`"
                />
              </div>
              <span :title="row.label">{{ shortLabel(row.label) }}</span>
            </div>
          </div>
        </div>
        <n-alert type="warning" :show-icon="false" class="local-alert">
          当前图表使用固定日期范围时，例行执行后的新数据可能不会立即出现在图表中，建议使用“最近几天”。
        </n-alert>
      </section>
    </div>

    <section class="visual-panel">
      <n-tabs v-model:value="activeTab" type="line" animated>
        <n-tab-pane name="preview" tab="数据预览">
          <n-empty v-if="!resultPreview" description="暂无预览数据" />
          <table v-else class="data-table">
            <thead>
              <tr><th v-for="column in resultPreview.columns" :key="column.name">{{ column.name }}<small>{{ column.type }}</small></th></tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in resultPreview.rows.slice(0, 12)" :key="index">
                <td v-for="column in resultPreview.columns" :key="column.name">{{ formatCell(row[column.name]) }}</td>
              </tr>
            </tbody>
          </table>
        </n-tab-pane>
        <n-tab-pane name="routines" tab="SQL 例行">
          <n-empty v-if="!routines.length" description="保存图表后可配置 SQL 例行" />
          <div v-else class="routine-area">
            <div class="routine-list">
              <button
                v-for="routine in routines"
                :key="routine.id"
                type="button"
                :class="{ active: routine.id === selectedRoutine?.id }"
                @click="selectedRoutineId = routine.id; refreshRoutineRuns()"
              >
                <strong>{{ routine.syncType === 'full_overwrite' ? '全量覆盖' : '分区覆盖' }}</strong>
                <span>{{ routine.scheduleType }} · {{ routine.executeTime }} · 自 {{ routine.scheduleStartAt }} 起算 · {{ routine.status }}</span>
              </button>
            </div>
            <div v-if="selectedRoutine" class="routine-detail">
              <n-alert type="info" :show-icon="false" class="local-alert">
                该例行任务使用可视化数据集中的 SQL 逻辑。修改原 SQL 查询文件不会影响此例行。
              </n-alert>
              <div class="routine-meta">
                <span>更新起算日期</span><strong>{{ selectedRoutine.scheduleStartAt }}</strong>
                <span>数据量上限</span><strong>1GB，超限失败且不覆盖旧数据</strong>
                <span>同步方式</span><strong>{{ selectedRoutine.syncType === 'full_overwrite' ? '全量覆盖' : `分区覆盖：${selectedRoutine.partitionField}` }}</strong>
              </div>
              <n-space>
                <n-button size="small" secondary :disabled="selectedRoutine.status !== 'enabled'" @click="runOnce(selectedRoutine)">手动运行一次</n-button>
                <n-button v-if="selectedRoutine.status === 'enabled'" size="small" secondary @click="pauseRoutine(selectedRoutine)">暂停</n-button>
                <n-button v-else size="small" secondary @click="resumeRoutine(selectedRoutine)">启用</n-button>
                <n-button size="small" type="error" secondary @click="deleteRoutine(selectedRoutine)">删除</n-button>
              </n-space>
              <table class="data-table compact">
                <thead><tr><th>状态</th><th>开始时间</th><th>结束时间</th><th>行数</th><th>大小</th><th>日志</th></tr></thead>
                <tbody>
                  <tr v-for="run in routineRuns" :key="run.id">
                    <td>{{ run.status }}</td>
                    <td>{{ run.startedAt ?? '-' }}</td>
                    <td>{{ run.finishedAt ?? '-' }}</td>
                    <td>{{ run.resultRowCount ?? '-' }}</td>
                    <td>{{ run.resultSizeBytes ? `${(run.resultSizeBytes / 1024 / 1024).toFixed(2)} MB` : '-' }}</td>
                    <td>{{ run.errorMessage ?? run.logs.join(' / ') }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </n-tab-pane>
      </n-tabs>
    </section>

    <n-modal v-model:show="saveModalVisible" preset="card" title="保存图表" style="width: 620px">
      <n-form label-placement="top">
        <n-grid :cols="2" :x-gap="16">
          <n-gi>
            <n-form-item label="图表名称" required>
              <n-input v-model:value="saveDraft.chartName" />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="保存项目" required>
              <n-select v-model:value="saveDraft.targetProjectId" :options="projectOptions" />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="图表目录">
              <n-input v-model:value="saveDraft.folderId" />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="数据集名称" required>
              <n-input v-model:value="saveDraft.datasetName" />
            </n-form-item>
          </n-gi>
        </n-grid>
        <n-form-item label="描述">
          <n-input v-model:value="saveDraft.description" type="textarea" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="saveModalVisible = false">取消</n-button>
          <n-button type="primary" @click="saveChart">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="routineModalVisible" preset="card" title="SQL 例行配置" style="width: 680px">
      <n-form label-placement="top">
        <n-form-item label="同步类型" required>
          <n-radio-group v-model:value="routineDraft.syncType">
            <n-radio value="full_overwrite">全量覆盖</n-radio>
            <n-radio value="partition_overwrite">分区覆盖</n-radio>
          </n-radio-group>
        </n-form-item>
        <n-form-item v-if="routineDraft.syncType === 'partition_overwrite'" label="分区字段" required>
          <n-select v-model:value="routineDraft.partitionField" :options="dateFieldOptions" placeholder="选择日期字段" />
        </n-form-item>
        <n-grid :cols="2" :x-gap="16">
          <n-gi>
            <n-form-item label="同步频率" required>
              <n-select v-model:value="routineDraft.scheduleType" :options="scheduleOptions" />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="开始日期" required>
              <n-date-picker v-model:value="routineDraft.scheduleStartAt" type="date" />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="执行时间" required>
              <n-input v-model:value="routineDraft.executeTime" placeholder="08:00" />
            </n-form-item>
          </n-gi>
          <n-gi v-if="routineDraft.scheduleType === 'cron'">
            <n-form-item label="Cron 表达式" required>
              <n-input v-model:value="routineDraft.scheduleCron" />
            </n-form-item>
          </n-gi>
        </n-grid>
        <n-form-item label="失败通知">
          <n-switch v-model:value="routineDraft.notifyEnabled" />
        </n-form-item>
        <n-form-item v-if="routineDraft.notifyEnabled" label="通知对象" required>
          <n-select v-model:value="routineDraft.notifyUserIds" multiple :options="notifyUserOptions" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="routineModalVisible = false">取消</n-button>
          <n-button type="primary" @click="saveRoutine">保存</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<style scoped lang="scss">
.visual-query-page {
  min-height: 100%;
  padding: 20px;
}

.visual-header,
.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.visual-header {
  margin-bottom: 12px;

  h1 {
    margin: 0;
    font-size: 24px;
  }

  p {
    margin: 6px 0 0;
    color: #667085;
  }
}

.visual-feedback {
  margin-bottom: 12px;
}

.visual-grid {
  display: grid;
  grid-template-columns: 420px minmax(0, 1fr);
  align-items: start;
  gap: 12px;
  margin-bottom: 12px;
}

.visual-panel {
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.section-title {
  margin-bottom: 14px;

  span {
    color: #667085;
  }
}

.dataset-meta {
  display: grid;
  grid-template-columns: 86px 1fr;
  gap: 10px 12px;
  margin-bottom: 14px;

  span {
    color: #667085;
  }
}

.field-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 12px;

  div {
    padding: 10px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: #f8fafc;
  }

  strong,
  span {
    display: block;
  }

  strong {
    font-size: 20px;
    line-height: 1.2;
  }

  span {
    margin-top: 4px;
    color: #667085;
    font-size: 12px;
  }
}

.field-toolbar {
  display: grid;
  grid-template-columns: 1fr 150px;
  gap: 8px;
  margin-bottom: 10px;
}

.field-table-wrap {
  max-height: 300px;
  overflow: auto;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.field-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;

  th,
  td {
    padding: 8px 10px;
    border-bottom: 1px solid #eef2f7;
    text-align: left;
    vertical-align: middle;
  }

  th {
    position: sticky;
    top: 0;
    z-index: 1;
    background: #f8fafc;
    color: #667085;
    font-weight: 650;
  }

  td strong,
  td small {
    display: block;
  }

  td strong {
    color: #1f2937;
    word-break: break-all;
  }

  td small {
    margin-top: 2px;
    color: #98a2b3;
  }
}

.local-alert {
  margin-top: 12px;
}

.chart-panel {
  min-height: 0;
}

.chart-config-bar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
}

.chart-hint {
  padding: 8px 10px;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 13px;
}

.chart-preview {
  height: 340px;
  padding: 14px;
  overflow: auto;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #f8fafc;
}

.chart-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;

  strong,
  span {
    display: block;
  }

  strong {
    color: #111827;
  }

  span {
    margin-top: 2px;
    color: #667085;
    font-size: 12px;
  }
}

.legend-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 5px;
  border-radius: 50%;
}

.bar-chart {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  height: 235px;
  padding: 12px 12px 4px;
  overflow-x: auto;
}

.bar-item {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  min-width: 54px;

  span,
  .bar-value {
    color: #667085;
    font-size: 12px;
    text-align: center;
  }
}

.bar-group {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 3px;
  width: 100%;
  height: 165px;
}

.bar {
  width: 100%;
  max-width: 34px;
  margin: 5px 0;
  border-radius: 4px 4px 0 0;
  background: #2563eb;
}

.metric-preview {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 230px;
  padding-left: 24px;

  span,
  small {
    color: #667085;
  }

  strong {
    margin: 10px 0;
    color: #111827;
    font-size: 52px;
    line-height: 1;
  }
}

.pie-preview {
  display: grid;
  grid-template-columns: 210px minmax(220px, 1fr);
  align-items: center;
  gap: 20px;
  height: 245px;
}

.pie-shape {
  width: 190px;
  height: 190px;
  border: 10px solid #fff;
  border-radius: 50%;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
}

.pie-legend {
  display: grid;
  gap: 8px;
  max-height: 235px;
  overflow: auto;
  padding-right: 4px;

  div {
    display: grid;
    grid-template-columns: 12px minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
  }

  i {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.line-preview {
  min-width: 600px;

  svg {
    width: 100%;
    height: 220px;
    border-bottom: 1px solid #d0d5dd;
    background:
      linear-gradient(#e5e7eb 1px, transparent 1px) 0 29px / 100% 35px,
      transparent;
  }
}

.axis-labels {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 18px 0;
  color: #667085;
  font-size: 12px;

  span {
    max-width: 72px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.scatter-preview {
  position: relative;
  min-width: 600px;
  height: 245px;
  border-left: 1px solid #d0d5dd;
  border-bottom: 1px solid #d0d5dd;
  background:
    linear-gradient(#e5e7eb 1px, transparent 1px) 0 24px / 100% 40px,
    linear-gradient(90deg, #e5e7eb 1px, transparent 1px) 0 0 / 80px 100%;
}

.scatter-dot {
  position: absolute;
  width: 14px;
  height: 14px;
  border: 3px solid #fff;
  border-radius: 50%;
  background: #2563eb;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);

  span {
    position: absolute;
    bottom: 16px;
    left: 50%;
    color: #475467;
    font-size: 11px;
    white-space: nowrap;
    transform: translateX(-50%);
  }
}

.chart-table-preview {
  min-width: 720px;
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;

  th,
  td {
    padding: 8px 10px;
    border-bottom: 1px solid #e5e7eb;
    text-align: left;
    white-space: nowrap;
  }

  th {
    background: #fff;
    color: #475467;
    font-weight: 650;
  }
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;

  th,
  td {
    padding: 9px 10px;
    border-bottom: 1px solid #e5e7eb;
    text-align: left;
    vertical-align: top;
  }

  th {
    background: #f8fafc;
    color: #475467;
    font-weight: 650;

    small {
      display: block;
      margin-top: 2px;
      color: #98a2b3;
      font-weight: 400;
    }
  }

  &.compact {
    margin-top: 12px;
    font-size: 12px;
  }
}

.routine-area {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 12px;
}

.routine-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.routine-list button {
  padding: 10px;
  border: 1px solid #d0d5dd;
  border-radius: 6px;
  background: #fff;
  text-align: left;
  cursor: pointer;

  &.active {
    border-color: #2563eb;
    background: #eff6ff;
  }

  span {
    display: block;
    margin-top: 4px;
    color: #667085;
  }
}

.routine-detail {
  min-width: 0;
}

.routine-meta {
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 8px 12px;
  margin: 12px 0;
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #f8fafc;

  span {
    color: #667085;
  }
}
</style>
