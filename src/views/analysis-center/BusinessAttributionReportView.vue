<script setup lang="ts">
import '@/components/charts/chartRegister'
import type { EChartsOption } from 'echarts'
import {
  NAlert,
  NButton,
  NCard,
  NDataTable,
  NDropdown,
  NEmpty,
  NFormItem,
  NGi,
  NGrid,
  NInput,
  NInputNumber,
  NModal,
  NRadioButton,
  NRadioGroup,
  NSelect,
  NSpace,
  NSpin,
  NSwitch,
  NTabPane,
  NTabs,
  NTag,
  NText,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, DropdownOption, SelectOption } from 'naive-ui'
import { computed, h, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import VChart from 'vue-echarts'
import { businessAttributionReportTypeLabels } from '@/mock/businessAttribution'
import {
  applyAnalysisTreeVisibleConfig,
  applyReportVisibleConfig,
  buildEmbedUrl,
  businessAttributionService,
  createDownloadRows,
  parseFeatureConfig,
} from '@/services/businessAttributionService'
import type {
  AnalysisTreeNode,
  AttributionReport,
  DimensionAttributionRow,
  DimensionViewDisplayMode,
  MetricAttributionFormulaResult,
  ReportDateOption,
} from '@/types/businessAttribution'

type AnalysisTreeReport = Extract<AttributionReport, { reportType: 'ANALYSIS_TREE' }>

const route = useRoute()
const router = useRouter()
const message = useMessage()
const loading = ref(false)
const report = ref<AttributionReport | null>(null)
const reportDates = ref<ReportDateOption[]>([])
const selectedCalculationDay = ref<string>('Latest')
const activeWebTab = ref('report')
const customRunVisible = ref(false)
const embedVisible = ref(false)
const nodeDetailVisible = ref(false)
const selectedNodeId = ref('')
const topN = ref(10)
const topNEnabled = ref(true)
const topNSortBy = ref<'ABS_CONTRIBUTION_RATE' | 'ABS_CONTRIBUTION_VALUE' | 'ABS_DIFF' | 'ABS_POP'>('ABS_CONTRIBUTION_RATE')
const anomalySortBy = ref<'deviationDegree' | 'absDiff' | 'absPercent'>('deviationDegree')
const advancedMode = ref(false)
const dimensionDisplayMode = ref<DimensionViewDisplayMode>('TABLE')
const activeDimensionViewId = ref('')
const selectedTrendItems = ref<string[]>([])
const rootCauseExpanded = ref(true)
const yoyMode = ref<'pop' | 'diff' | 'raw'>('pop')
const metricOrderMode = ref<'CONTRIBUTION_DESC' | 'CONFIG_ORDER'>('CONTRIBUTION_DESC')
const focusedAnomalyMetricName = ref('')
const customRun = reactive({
  baseStart: '2026-05-04',
  baseEnd: '2026-05-10',
  compareStart: '2026-05-11',
  compareEnd: '2026-05-17',
})
const embedLink = ref('')

const visibleConfig = computed(() => applyReportVisibleConfig(parseFeatureConfig(String(route.query.Feature ?? ''))))
const analysisTreeVisibleConfig = computed(() => applyAnalysisTreeVisibleConfig(parseFeatureConfig(String(route.query.Feature ?? '')) as never))
const inlineMode = computed(() => route.query.Inline === 'true' || route.query.inline === 'true')
const onlyRootCause = computed(() => route.query.OnlyRootCause === 'True' && Boolean(route.query.Algorithms))
const advanceVisible = computed(() => route.query.Advance !== 'False')

const primary = computed(() => (report.value && 'primary' in report.value ? report.value.primary : null))
const analysisTreeReport = computed<AnalysisTreeReport | null>(() => {
  const current = report.value
  return current && 'treeResult' in current ? (current as AnalysisTreeReport) : null
})
const activeDimensionView = computed(() =>
  report.value?.reportType === 'DIMENSION_ATTRIBUTION'
    ? (report.value.viewResults.find((view) => view.viewId === activeDimensionViewId.value) ?? report.value.viewResults[0])
    : null,
)
const selectedNodeDetail = computed(() =>
  analysisTreeReport.value?.treeResult.details.find((detail) => detail.nodeId === selectedNodeId.value),
)

const selectedAnalysisTreeNode = computed(() =>
  analysisTreeReport.value?.treeResult.nodes.find((node) => node.id === selectedNodeId.value),
)

const dateOptions = computed<SelectOption[]>(() =>
  [
    { label: 'Latest · 最新成功报告', value: 'Latest' },
    ...reportDates.value.map((item) => ({
      label: `${item.label} · ${item.generateType} · ${item.runStatus}`,
      value: item.calculationDay,
    })),
  ],
)

const topNSortOptions: SelectOption[] = [
  { label: '贡献率绝对值', value: 'ABS_CONTRIBUTION_RATE' },
  { label: '贡献值绝对值', value: 'ABS_CONTRIBUTION_VALUE' },
  { label: '差值绝对值', value: 'ABS_DIFF' },
  { label: '差异百分比绝对值', value: 'ABS_POP' },
]

const anomalySortOptions: SelectOption[] = [
  { label: '异常程度', value: 'deviationDegree' },
  { label: '差值绝对值', value: 'absDiff' },
  { label: '差异百分比绝对值', value: 'absPercent' },
]

const dimensionViewOptions = computed<SelectOption[]>(() =>
  report.value?.reportType === 'DIMENSION_ATTRIBUTION'
    ? report.value.viewResults.map((view) => ({ label: `${view.viewName} · ${view.algorithm}`, value: view.viewId }))
    : [],
)

const displayModeLabels: Record<DimensionViewDisplayMode, string> = {
  TABLE: '表格',
  WATERFALL: '瀑布图',
  BREAKDOWN_TREE: '拆解树',
}

const analysisTreeNodeTypeLabels: Record<string, string> = {
  metric: '指定指标',
  limit: '筛选',
  metricContribution: '指标贡献',
  metricContributionGroup: '指标拆解组',
  dimensionContribution: '维度贡献',
  dimensionContributionGroup: '维度拆解组',
  anomaly: '异动',
  trendAnomaly: '趋势异动',
  text: '文本结论',
}

const analysisTreeStatusLabels: Record<AnalysisTreeNode['status'], string> = {
  unready: '未就绪',
  running: '运行中',
  finish: '完成',
  failed: '失败',
  wontDrill: '不下钻',
}

const analysisTreeGranularityLabels: Record<string, string> = {
  DAY: '日',
  WEEK: '周',
  BIWEEK: '双周',
  MONTH: '月',
  BIMONTH: '双月',
}

const activeDisplayModeOptions = computed<SelectOption[]>(() =>
  (activeDimensionView.value?.displayModes ?? ['TABLE']).map((mode) => ({ label: displayModeLabels[mode], value: mode })),
)

const sortedDimensionRows = computed(() => {
  const rows = [...(activeDimensionView.value?.rows ?? [])]
  rows.sort((a, b) => {
    if (topNSortBy.value === 'ABS_CONTRIBUTION_VALUE') return Math.abs(b.contributionValue) - Math.abs(a.contributionValue)
    if (topNSortBy.value === 'ABS_DIFF') return Math.abs(b.diff) - Math.abs(a.diff)
    if (topNSortBy.value === 'ABS_POP') return Math.abs(b.pop ?? 0) - Math.abs(a.pop ?? 0)
    return Math.abs(b.contributionRate) - Math.abs(a.contributionRate)
  })
  return topNEnabled.value ? rows.slice(0, topN.value) : rows
})

const sortedAnomalyDimensionRows = computed(() => {
  if (report.value?.reportType !== 'ANOMALY') return []
  const rows = [...report.value.dimensionRows]
  rows.sort((a, b) => {
    if (anomalySortBy.value === 'absDiff') return Math.abs(b.diff) - Math.abs(a.diff)
    if (anomalySortBy.value === 'absPercent') return Math.abs(b.changePercent ?? 0) - Math.abs(a.changePercent ?? 0)
    return (b.deviationDegree ?? 0) - (a.deviationDegree ?? 0)
  })
  return rows.slice(0, topN.value)
})

const visibleRootCauses = computed(() => {
  if (report.value?.reportType !== 'DIMENSION_ATTRIBUTION') return []
  return rootCauseExpanded.value ? report.value.rootCauses : report.value.rootCauses.slice(0, 3)
})

const focusedAnomalyMetric = computed(() => {
  if (report.value?.reportType !== 'ANOMALY') return null
  return report.value.metricDisassemblyRows.find((row) => row.metricName === focusedAnomalyMetricName.value) ?? report.value.metricDisassemblyRows[0] ?? null
})

const selectedDimensionTrendRows = computed(() => {
  const rows = activeDimensionView.value?.rows ?? []
  return rows.filter((row) => selectedTrendItems.value.includes(row.pathValue.join('/')))
})

const analysisTreeStats = computed(() => {
  if (!analysisTreeReport.value) return []
  const nodes = analysisTreeReport.value.treeResult.nodes
  const count = (status: AnalysisTreeNode['status']) => nodes.filter((node) => node.status === status).length
  return [
    { label: '节点总数', value: nodes.length, type: 'default' },
    { label: '完成', value: count('finish'), type: 'success' },
    { label: '失败', value: count('failed'), type: 'error' },
    { label: '未就绪', value: count('unready'), type: 'warning' },
    { label: '不下钻', value: count('wontDrill'), type: 'default' },
  ] as const
})

const analysisTreeNodeMap = computed(() => {
  if (!analysisTreeReport.value) return new Map<string, AnalysisTreeNode>()
  return new Map(analysisTreeReport.value.treeResult.nodes.map((node) => [node.id, node]))
})

const analysisTreeFailedNodes = computed(() => analysisTreeReport.value?.treeResult.nodes.filter((node) => node.status === 'failed') ?? [])

const analysisTreeReadableGranularity = computed(() => {
  const baseStart = report.value?.compareConfig.basePeriod.start
  const baseEnd = report.value?.compareConfig.basePeriod.end
  if (!baseStart || !baseEnd) return '周'
  const dayCount = Math.abs(new Date(baseEnd).getTime() - new Date(baseStart).getTime()) / 86_400_000 + 1
  if (dayCount === 1) return analysisTreeGranularityLabels.DAY
  if (dayCount === 7) return analysisTreeGranularityLabels.WEEK
  if (dayCount === 14) return analysisTreeGranularityLabels.BIWEEK
  if (dayCount >= 28 && dayCount <= 31) return analysisTreeGranularityLabels.MONTH
  return analysisTreeGranularityLabels.WEEK
})

const analysisTreeLevels = computed(() => {
  if (!analysisTreeReport.value) return []
  const nodes = analysisTreeReport.value.treeResult.nodes
  const edges = analysisTreeReport.value.treeResult.edges
  const levelMap = new Map(nodes.map((node) => [node.id, 0]))

  for (let pass = 0; pass < nodes.length; pass += 1) {
    edges.forEach((edge) => {
      const fromLevel = levelMap.get(edge.fromNodeId) ?? 0
      const toLevel = levelMap.get(edge.toNodeId) ?? 0
      if (fromLevel + 1 > toLevel) {
        levelMap.set(edge.toNodeId, fromLevel + 1)
      }
    })
  }

  const levels: AnalysisTreeNode[][] = []
  nodes.forEach((node) => {
    const level = levelMap.get(node.id) ?? 0
    levels[level] ??= []
    levels[level]!.push(node)
  })
  return levels
})

const analysisTreeEdgeRows = computed(() => {
  if (!analysisTreeReport.value) return []
  const byId = new Map(analysisTreeReport.value.treeResult.nodes.map((node) => [node.id, node]))
  return analysisTreeReport.value.treeResult.edges.map((edge) => ({
    from: byId.get(edge.fromNodeId)?.name ?? edge.fromNodeId,
    to: byId.get(edge.toNodeId)?.name ?? edge.toNodeId,
    relation: `${edge.fromNodeId} -> ${edge.toNodeId}`,
  }))
})

const analysisTreeNodeRows = computed(() => {
  if (!analysisTreeReport.value) return []
  return analysisTreeReport.value.treeResult.nodes.map((node, index) => ({
    order: index + 1,
    name: node.name,
    type: node.type,
    typeLabel: analysisTreeNodeTypeLabels[node.type] ?? node.type,
    status: node.status,
    statusLabel: analysisTreeStatusLabels[node.status],
    parents: node.parentId.join(', ') || '-',
    nextNodes: node.nextId.join(', ') || '-',
    nlg: node.nlg ?? node.msg ?? '-',
  }))
})

const selectedNodeParents = computed(() => selectedAnalysisTreeNode.value?.parentId.map((id) => analysisTreeNodeMap.value.get(id)?.name ?? id) ?? [])
const selectedNodeChildren = computed(() => selectedAnalysisTreeNode.value?.nextId.map((id) => analysisTreeNodeMap.value.get(id)?.name ?? id) ?? [])

const selectedNodeDetailColumns = computed<DataTableColumns<Record<string, string | number>>>(() => {
  const keys = Object.keys(selectedNodeDetail.value?.rows[0] ?? {})
  const labels: Record<string, string> = {
    action: '处理',
    baseValue: '基准值',
    compareValue: '观察值',
    contributionRate: '贡献率',
    contributionValue: '贡献值',
    date: '日期',
    diff: '差值',
    dimension: '维度',
    metric: '指标',
    path: '路径',
    status: '状态',
  }
  return keys.map((key) => ({
    title: labels[key] ?? key,
    key,
    ellipsis: { tooltip: true },
    render: (row) => {
      const value = row[key]
      if (typeof value === 'number') return formatNumber(value)
      return value
    },
  }))
})

const analysisTreeWebhookMetaPayload = computed(() => {
  const current = analysisTreeReport.value
  if (!current) return ''
  return JSON.stringify(
    {
      taskId: `task_${current.reportId}`,
      reportId: current.reportId,
      submitJobId: 10001,
      name: current.configName,
      user: 'Chaoyang Xu',
      appId: 10001,
      baseDateStr: `${current.compareConfig.basePeriod.start} ~ ${current.compareConfig.basePeriod.end}`,
      cmpDateStr: `${current.compareConfig.comparePeriod.start} ~ ${current.compareConfig.comparePeriod.end}`,
      generateType: current.generateType.toLowerCase(),
      granularity: analysisTreeReadableGranularity.value,
      components: current.treeResult.nodes.map((node) => ({
        id: node.id,
        type: node.type,
        name: node.name,
        parentId: node.parentId,
        nextId: node.nextId,
        status: node.status,
        msg: node.msg,
        nlg: node.nlg,
        params: node.params,
      })),
    },
    null,
    2,
  )
})

const selectedAnalysisTreePayload = computed(() => {
  const node = selectedAnalysisTreeNode.value
  if (!node) return ''
  const needsTopn = ['metricContribution', 'metricContributionGroup', 'dimensionContribution', 'dimensionContributionGroup'].includes(node.type)
  return JSON.stringify(
    {
      user: 'Chaoyang Xu',
      appId: 10001,
      componentId: node.id,
      ...(needsTopn ? { topn: 50 } : {}),
      ...(node.params ?? {}),
      note:
        node.type === 'dimensionContributionGroup'
          ? '维度拆解组按 params.query 分批请求，避免单次数据过大。'
          : node.type.includes('anomaly')
            ? '异动节点不需要 topn。'
            : '节点明细由阶段二 OpenAPI 获取。',
    },
    null,
    2,
  )
})

let reportLoadSeq = 0

function configId(): string {
  return String(route.params.configId)
}

function formatNumber(value?: number | null): string {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(value)
}

function formatPercent(value?: number | null): string {
  if (value === null || value === undefined) return '-'
  return `${(value * 100).toFixed(1)}%`
}

function factorTagType(value?: string) {
  return value === 'POSITIVE' ? 'success' : 'error'
}

function analysisTreeStatusTagType(status?: AnalysisTreeNode['status'] | string) {
  if (status === 'finish') return 'success'
  if (status === 'failed') return 'error'
  if (status === 'running' || status === 'unready') return 'warning'
  return 'default'
}

async function loadReport(): Promise<void> {
  const seq = (reportLoadSeq += 1)
  loading.value = true
  try {
    const queryDay = String(route.query.calculationDay ?? route.query.CalculationDay ?? selectedCalculationDay.value ?? 'Latest')
    selectedCalculationDay.value = queryDay
    const [dates, nextReport] = await Promise.all([
      businessAttributionService.listReportDates(configId()),
      businessAttributionService.getReport(configId(), queryDay),
    ])
    if (seq !== reportLoadSeq) return

    reportDates.value = dates
    activeWebTab.value = 'report'

    if (nextReport.reportType === 'DIMENSION_ATTRIBUTION') {
      rootCauseExpanded.value = true
      const view = nextReport.viewResults.find((item) => item.viewId === activeDimensionViewId.value) ?? nextReport.viewResults[0]
      activeDimensionViewId.value = view?.viewId ?? ''
      if (view && !view.displayModes.includes(dimensionDisplayMode.value)) {
        dimensionDisplayMode.value = view.displayModes[0] ?? 'TABLE'
      }
      selectedTrendItems.value = view?.rows.slice(0, 6).map((row) => row.pathValue.join('/')) ?? []
    }

    if (nextReport.reportType === 'ANOMALY') {
      focusedAnomalyMetricName.value = nextReport.metricDisassemblyRows[0]?.metricName ?? ''
    }

    if (nextReport.reportType === 'ANALYSIS_TREE') {
      const detailNodeId = nextReport.treeResult.details[0]?.nodeId
      selectedNodeId.value =
        nextReport.treeResult.nodes.find((node) => node.status === 'failed')?.id ??
        nextReport.treeResult.nodes.find((node) => node.id === detailNodeId)?.id ??
        nextReport.treeResult.nodes.find((node) => node.type === 'text')?.id ??
        nextReport.treeResult.nodes[0]?.id ??
        ''
    }

    report.value = nextReport
  } catch (error) {
    if (seq === reportLoadSeq) {
      message.error(error instanceof Error ? error.message : '报告加载失败')
    }
  } finally {
    if (seq === reportLoadSeq) {
      loading.value = false
    }
  }
}

function updateGroupValue(value: string): void {
  if (!report.value) return
  report.value.activeGroupValue = value
  message.success(`已切换到分组：${value}`)
}

function updateDimensionView(value: string): void {
  activeDimensionViewId.value = value
  const view = activeDimensionView.value
  if (!view) return
  if (!view.displayModes.includes(dimensionDisplayMode.value)) {
    dimensionDisplayMode.value = view.displayModes[0] ?? 'TABLE'
  }
  selectedTrendItems.value = view.rows.slice(0, 6).map((row) => row.pathValue.join('/'))
}

function addDimensionTrendItem(row: DimensionAttributionRow): void {
  const key = row.pathValue.join('/')
  if (selectedTrendItems.value.includes(key)) return
  selectedTrendItems.value = [...selectedTrendItems.value, key]
}

function anomalyMetricRowProps(row: Record<string, unknown>) {
  const metricName = String(row.metricName ?? '')
  return {
    class: metricName === focusedAnomalyMetricName.value ? 'row-selected' : '',
    onClick: () => {
      focusedAnomalyMetricName.value = metricName
    },
  }
}

function metricRowsForFormula(formula: MetricAttributionFormulaResult): MetricAttributionFormulaResult['rows'] {
  const rows = [...formula.rows]
  if (metricOrderMode.value === 'CONTRIBUTION_DESC') {
    rows.sort((a, b) => Math.abs(b.contributionRate) - Math.abs(a.contributionRate))
  }
  return rows
}

function openSubscriptionFromReport(): void {
  void router.push({ path: '/analysis-center/business-attribution/subscriptions', query: { configId: configId() } })
}

const reportActionOptions = computed<DropdownOption[]>(() => [
  { label: '新建订阅', key: 'subscription' },
  { label: '复制链接', key: 'copyLink' },
  { label: '嵌出报告', key: 'embed' },
  { label: '自定义运算', key: 'customRun' },
  { type: 'divider', key: 'divider-run' },
  { label: '重跑报告', key: 'rerun' },
])

function handleReportActionSelect(key: string | number): void {
  const action = String(key)
  if (action === 'subscription') openSubscriptionFromReport()
  if (action === 'copyLink') void copyCurrentLink()
  if (action === 'embed') openEmbedModal()
  if (action === 'customRun') {
    customRunVisible.value = true
  }
  if (action === 'rerun') void rerun(false)
}

function updateCalculationDay(value: string): void {
  void router.replace({
    path: route.path,
    query: { ...route.query, calculationDay: value },
  })
  selectedCalculationDay.value = value
  void loadReport()
}

async function rerun(triggerSubscription = false): Promise<void> {
  if (!report.value) return
  try {
    const next = await businessAttributionService.rerunReport(report.value.configId, report.value.reportId, triggerSubscription)
    message.success(triggerSubscription ? '重跑成功，并已触发订阅推送。' : '重跑成功。')
    selectedCalculationDay.value = next.calculationDay
    await loadReport()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '重跑失败')
  }
}

async function createCustomRun(): Promise<void> {
  try {
    const next = await businessAttributionService.createCustomRun(
      configId(),
      { start: customRun.baseStart, end: customRun.baseEnd },
      { start: customRun.compareStart, end: customRun.compareEnd },
    )
    customRunVisible.value = false
    message.success('自定义运算已完成；未保存自定义报告 7 天后过期。')
    selectedCalculationDay.value = next.calculationDay
    await loadReport()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '自定义运算失败')
  }
}

function openEmbedModal(): void {
  if (!report.value) return
  embedLink.value = `${window.location.origin}${buildEmbedUrl(report.value.configId, {
    CalculationDay: 'Latest',
    Inline: 'true',
    Advance: advanceVisible.value ? 'True' : 'False',
  })}`
  embedVisible.value = true
}

async function copyCurrentLink(): Promise<void> {
  await navigator.clipboard?.writeText(window.location.href)
  message.success('报告链接已复制。')
}

async function copyEmbedLink(): Promise<void> {
  await navigator.clipboard?.writeText(embedLink.value)
  message.success('嵌入链接已复制。')
}

function downloadDimensionRows(rows: DimensionAttributionRow[], viewName: string): void {
  if (!report.value) return
  const csv = createDownloadRows(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `归因报告_维度归因_${report.value.configName}_${report.value.calculationDay}_${viewName}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function openNodeDetail(nodeId: string): void {
  if (analysisTreeVisibleConfig.value.conclusionClickEnable === false) return
  selectedNodeId.value = nodeId
  nodeDetailVisible.value = true
}

function selectAnalysisTreeNode(nodeId: string): void {
  selectedNodeId.value = nodeId
}

function openSelectedNodeDetail(): void {
  if (!selectedNodeId.value) return
  nodeDetailVisible.value = true
}

const trendChartOption = computed<EChartsOption>(() => {
  const block = primary.value
  if (!block) return {}

  const series: EChartsOption['series'] = [
    { name: '实际值', type: 'line', smooth: true, data: block.graph.self, lineStyle: { width: 3 }, itemStyle: { color: '#2563eb' } },
  ]

  if (block.graph.forecast) {
    series.push({ name: '预测值', type: 'line', smooth: true, data: block.graph.forecast, lineStyle: { type: 'dashed', width: 2 }, itemStyle: { color: '#64748b' } })
  }

  if (block.graph.upper && block.graph.lower) {
    series.push(
      { name: '上界', type: 'line', data: block.graph.upper, symbol: 'none', lineStyle: { opacity: 0 }, stack: 'confidence', areaStyle: { opacity: 0 } },
      { name: '正常波动带', type: 'line', data: block.graph.lower, symbol: 'none', lineStyle: { opacity: 0 }, stack: 'confidence', areaStyle: { color: 'rgba(37,99,235,0.14)' } },
    )
  }

  return {
    color: ['#2563eb', '#64748b', '#bfdbfe'],
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0 },
    grid: { left: 44, right: 20, top: 28, bottom: 54 },
    xAxis: { type: 'category', data: block.graph.date },
    yAxis: { type: 'value' },
    series,
  }
})

const dimensionWaterfallOption = computed<EChartsOption>(() => {
  const rows = sortedDimensionRows.value
  const values = [...rows.map((row) => row.contributionValue), rows.reduce((sum, row) => sum + row.contributionValue, 0)]
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 58, right: 20, top: 20, bottom: 56 },
    xAxis: { type: 'category', data: [...rows.map((row) => row.pathValue.join('/')), '大盘变化'] },
    yAxis: { type: 'value' },
    series: [
      {
        type: 'bar',
        name: '贡献值',
        data: values.map((value) => ({
          value,
          itemStyle: { color: value >= 0 ? '#16a34a' : '#dc2626' },
        })),
      },
    ],
  }
})

const impactScatterOption = computed<EChartsOption>(() => {
  if (report.value?.reportType !== 'DIMENSION_ATTRIBUTION') return {}
  return {
    tooltip: { trigger: 'item' },
    grid: { left: 48, right: 20, top: 20, bottom: 44 },
    xAxis: { name: '自身表现差异', type: 'value' },
    yAxis: { name: '对大盘影响', type: 'value' },
    series: [
      {
        type: 'scatter',
        symbolSize: 16,
        data: report.value.impactRows.map((row) => [row.diffWithOverall, row.impactDiff, row.dimensionValue]),
        itemStyle: { color: '#2563eb' },
      },
    ],
  }
})

const rootCauseChartOption = computed<EChartsOption>(() => {
  if (report.value?.reportType !== 'DIMENSION_ATTRIBUTION') return {}
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 44, right: 20, top: 20, bottom: 36 },
    xAxis: { type: 'category', data: report.value.rootCauses.map((item) => item.dimensionName) },
    yAxis: { type: 'value', max: 1 },
    series: [
      {
        name: 'Surprise',
        type: 'bar',
        data: report.value.rootCauses.map((item) => ({
          value: item.surprise,
          itemStyle: { color: item.isRootCause ? '#dc2626' : '#64748b' },
        })),
      },
    ],
  }
})

const anomalyMetricTrendOption = computed<EChartsOption>(() => {
  const row = focusedAnomalyMetric.value
  if (!row) return {}
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 52, right: 20, top: 28, bottom: 44 },
    xAxis: { type: 'category', data: row.graph.date },
    yAxis: { type: 'value' },
    series: [
      {
        name: row.metricName,
        type: 'line',
        smooth: true,
        data: row.graph.self,
        areaStyle: { color: 'rgba(37,99,235,0.12)' },
        lineStyle: { width: 3 },
        itemStyle: { color: '#2563eb' },
      },
    ],
  }
})

const dimensionTrendOption = computed<EChartsOption>(() => {
  const rows = selectedDimensionTrendRows.value
  const dates = primary.value?.graph.date ?? []
  const series: EChartsOption['series'] = rows.map((row, index) => {
    const base = row.cmpVal / Math.max(dates.length, 1)
    const direction = row.factor === 'POSITIVE' ? 1 : -1
    return {
      name: row.pathValue.join('/'),
      type: 'line' as const,
      smooth: true,
      data: dates.map((_, dayIndex) => {
        const raw = base * (1 + direction * 0.015 * dayIndex + index * 0.02)
        if (yoyMode.value === 'pop') return Number((((raw - base) / Math.max(base, 1)) * 100).toFixed(2))
        if (yoyMode.value === 'diff') return Math.round(raw - base)
        return Math.round(raw)
      }),
    }
  })

  return {
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, type: 'scroll' },
    grid: { left: 52, right: 20, top: 24, bottom: 58 },
    xAxis: { type: 'category', data: dates },
    yAxis: { type: 'value', axisLabel: { formatter: yoyMode.value === 'pop' ? '{value}%' : '{value}' } },
    series,
  }
})

const anomalyMetricColumns: DataTableColumns<Record<string, unknown>> = [
  { title: '指标名称', key: 'metricName' },
  { title: '观察值', key: 'compareValue', render: (row) => formatNumber(row.compareValue as number) },
  { title: '基准值', key: 'baseValue', render: (row) => formatNumber(row.baseValue as number) },
  { title: '差值', key: 'diff', render: (row) => formatNumber(row.diff as number) },
  { title: '差异百分比', key: 'changePercent', render: (row) => formatPercent(row.changePercent as number | null) },
  { title: '异常程度', key: 'deviationDegree', render: (row) => formatPercent(row.deviationDegree as number | null) },
]

const anomalyDimensionColumns: DataTableColumns<Record<string, unknown>> = [
  { title: '路径', key: 'path', render: (row) => (row.path as string[]).join(' > ') },
  { title: '维度值', key: 'pathValue', render: (row) => (row.pathValue as string[]).join(' > ') },
  { title: '观察值', key: 'compareValue', render: (row) => formatNumber(row.compareValue as number) },
  { title: '基准值', key: 'baseValue', render: (row) => formatNumber(row.baseValue as number) },
  { title: '差异百分比', key: 'changePercent', render: (row) => formatPercent(row.changePercent as number | null) },
  { title: '结论', key: 'summary' },
  { title: '显著子项', key: 'subPathAnomalyNum' },
]

const dimensionColumns = computed<DataTableColumns<DimensionAttributionRow>>(() => {
  const base: DataTableColumns<DimensionAttributionRow> = [
    { title: '路径', key: 'path', render: (row) => row.path.join(' > ') },
    { title: '维度值', key: 'pathValue', render: (row) => row.pathValue.join(' > ') },
    { title: '基准值', key: 'baseVal', render: (row) => formatNumber(row.baseVal) },
    { title: '观察值', key: 'cmpVal', render: (row) => formatNumber(row.cmpVal) },
    { title: '差值', key: 'diff', render: (row) => formatNumber(row.diff) },
    { title: '差异百分比', key: 'pop', render: (row) => formatPercent(row.pop) },
    { title: '贡献率', key: 'contributionRate', render: (row) => formatPercent(row.contributionRate) },
    { title: '贡献值', key: 'contributionValue', render: (row) => formatNumber(row.contributionValue) },
    {
      title: '方向',
      key: 'factor',
      render: (row) => h(NTag, { type: factorTagType(row.factor), bordered: false }, { default: () => (row.factor === 'POSITIVE' ? '同向' : '反向') }),
    },
  ]

  if (advancedMode.value) {
    base.push(
      { title: 'EP 值', key: 'epValue', render: (row) => formatNumber(row.epValue) },
      { title: '剔除得分', key: 'dropScore', render: (row) => formatNumber(row.dropScore) },
      { title: '种类内贡献', key: 'withinContribution', render: (row) => formatPercent(row.withinContribution) },
      { title: '种类间贡献', key: 'betweenContribution', render: (row) => formatPercent(row.betweenContribution) },
    )
  }

  return base
})

const metricColumns: DataTableColumns<Record<string, unknown>> = [
  { title: '因子', key: 'factorName' },
  { title: '基准值', key: 'baseVal', render: (row) => formatNumber(row.baseVal as number) },
  { title: '观察值', key: 'cmpVal', render: (row) => formatNumber(row.cmpVal as number) },
  { title: '差值', key: 'diff', render: (row) => formatNumber(row.diff as number) },
  { title: '差异百分比', key: 'pop', render: (row) => formatPercent(row.pop as number | null) },
  { title: '贡献值', key: 'contributionValue', render: (row) => formatNumber((row.contributionValue ?? row.shapContributionValue) as number) },
  { title: '贡献率', key: 'contributionRate', render: (row) => formatPercent(row.contributionRate as number) },
]

const impactColumns: DataTableColumns<Record<string, unknown>> = [
  { title: '维度值', key: 'dimensionValue' },
  { title: '当前值', key: 'currentMetricValue', render: (row) => formatNumber(row.currentMetricValue as number) },
  { title: '自身表现差异', key: 'diffWithOverall', render: (row) => formatPercent(row.diffWithOverall as number) },
  { title: '剔除后指标', key: 'metricValueAfterRemoval', render: (row) => formatNumber(row.metricValueAfterRemoval as number) },
  { title: '对大盘影响', key: 'impactDiff', render: (row) => formatNumber(row.impactDiff as number) },
]

const analysisTreeNodeColumns: DataTableColumns<Record<string, unknown>> = [
  { title: '执行序号', key: 'order', width: 90 },
  { title: '节点', key: 'name', width: 150 },
  { title: '类型', key: 'typeLabel', width: 120 },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) => h(NTag, { type: analysisTreeStatusTagType(String(row.status)), bordered: false }, { default: () => String(row.statusLabel ?? row.status) }),
  },
  { title: '父节点', key: 'parents', ellipsis: { tooltip: true } },
  { title: '子节点', key: 'nextNodes', ellipsis: { tooltip: true } },
  { title: '运行结论', key: 'nlg', ellipsis: { tooltip: true } },
]

const analysisTreeEdgeColumns: DataTableColumns<Record<string, unknown>> = [
  { title: '上游节点', key: 'from' },
  { title: '下游节点', key: 'to' },
  { title: '连线', key: 'relation', ellipsis: { tooltip: true } },
]

watch(
  () => route.query,
  () => {
    void loadReport()
  },
)

onMounted(() => {
  void loadReport()
})
</script>

<template>
  <div class="page-container business-attribution-report" :class="{ inline: inlineMode }">
    <div v-if="visibleConfig.navigation" class="page-heading">
      <div v-if="visibleConfig.title">
        <h1 class="page-title">{{ report?.configName || '业务归因报告' }}</h1>
        <p class="page-description">
          {{ report ? businessAttributionReportTypeLabels[report.reportType] : '' }} · {{ report?.calculationDay || '' }}
        </p>
      </div>
      <div v-else />
      <div v-if="visibleConfig.controlPane" class="report-header-actions">
        <n-button @click="router.push('/analysis-center/business-attribution')">返回首页</n-button>
        <n-button secondary @click="router.push(`/analysis-center/business-attribution/config/${configId()}/edit`)">查看配置</n-button>
        <n-button type="primary" @click="rerun(true)">重跑并推送</n-button>
        <n-dropdown trigger="click" :options="reportActionOptions" @select="handleReportActionSelect">
          <n-button secondary>更多操作</n-button>
        </n-dropdown>
      </div>
    </div>

    <n-spin :show="loading && !report">
      <template v-if="report">
        <n-card v-if="visibleConfig.tab" :bordered="false" class="top-card report-meta-card">
          <div class="report-meta-grid">
            <div class="meta-selector">
              <span>报告日期</span>
              <n-select v-model:value="selectedCalculationDay" :options="dateOptions" placeholder="历史报告日期" @update:value="(value) => updateCalculationDay(String(value))" />
            </div>
            <div class="meta-tile">
              <span>状态</span>
              <n-tag :type="report.runStatus === 'SUCCESS' ? 'success' : 'error'" size="large">{{ report.runStatus }}</n-tag>
            </div>
            <div class="meta-tile">
              <span>基准期</span>
              <strong>{{ report.compareConfig.basePeriod.start }} ~ {{ report.compareConfig.basePeriod.end }}</strong>
            </div>
            <div class="meta-tile">
              <span>观察期</span>
              <strong>{{ report.compareConfig.comparePeriod.start }} ~ {{ report.compareConfig.comparePeriod.end }}</strong>
            </div>
            <div class="meta-tile">
              <span>生成方式</span>
              <strong>{{ report.generateType }} · {{ report.generatedAt }}</strong>
            </div>
          </div>
        </n-card>

        <n-empty v-if="report.runStatus === 'FAILED'" description="该日期报告生成失败">
          <template #extra>
            <n-space>
              <n-alert type="error" :show-icon="false">失败原因：{{ primary?.summary || '配置或数据校验失败' }}</n-alert>
              <n-button type="primary" @click="rerun(false)">重跑报告</n-button>
            </n-space>
          </template>
        </n-empty>

        <template v-else>
          <n-card v-if="visibleConfig.group && report.groupOptions.length" :bordered="false" class="top-card">
            <n-space align="center">
              <strong>分组维度</strong>
              <n-tag
                v-for="group in report.groupOptions"
                :key="group.value"
                :type="group.value === report.activeGroupValue ? 'info' : 'default'"
                class="group-tag"
                round
                @click="updateGroupValue(group.value)"
              >
                {{ group.label }}
              </n-tag>
              <n-text depth="3">多个分组维度之间为 OR 关系，All 表示大盘。</n-text>
            </n-space>
          </n-card>

          <n-card v-if="visibleConfig.bigEvent && report.bigEvents.length" :bordered="false" class="top-card">
            <n-space vertical>
              <strong>大事件</strong>
              <n-space>
                <n-tag v-for="event in report.bigEvents" :key="event.title" type="warning" bordered>
                  {{ event.date }} · {{ event.title }} · {{ event.impact }}
                </n-tag>
              </n-space>
            </n-space>
          </n-card>

          <n-grid v-if="primary && visibleConfig.primary && !onlyRootCause" :cols="24" :x-gap="16" class="primary-grid">
            <n-gi :span="8">
              <n-card :bordered="false" class="primary-card">
                <n-text depth="3">{{ primary.metricName }}</n-text>
                <div class="primary-value">{{ formatNumber(primary.compareValue) }}</div>
                <n-tag :type="primary.anomalyDirection === 'NORMAL' ? 'success' : primary.anomalyDirection === 'LOWER' ? 'error' : 'warning'" size="large">
                  {{ primary.summary }}
                </n-tag>
                <div class="primary-stats">
                  <span>环比差值 {{ formatNumber(primary.diffLastPeriod) }}</span>
                  <span>环比 {{ formatPercent(primary.changePercentLastPeriod) }}</span>
                  <span>异常程度 {{ formatPercent(primary.deviationDegree) }}</span>
                </div>
              </n-card>
            </n-gi>
            <n-gi :span="16">
              <n-card :bordered="false">
                <v-chart class="chart" :option="trendChartOption" autoresize />
              </n-card>
            </n-gi>
          </n-grid>

          <template v-if="analysisTreeReport && visibleConfig.tables">
            <div class="analysis-tree-report-shell">
              <n-card v-if="analysisTreeVisibleConfig.title || analysisTreeVisibleConfig.conclusion" :bordered="false" class="tree-overview-card">
                <div class="tree-overview-header">
                  <div class="tree-overview-title">
                    <n-space align="center" size="small">
                      <n-tag bordered>{{ analysisTreeReadableGranularity }}粒度</n-tag>
                      <n-tag :type="analysisTreeFailedNodes.length ? 'error' : 'success'" bordered>
                        {{ analysisTreeFailedNodes.length ? `${analysisTreeFailedNodes.length} 个失败节点` : '全部可执行' }}
                      </n-tag>
                      <n-tag bordered>阶段一组件 {{ analysisTreeReport.treeResult.nodes.length }}</n-tag>
                    </n-space>
                    <h2 v-if="analysisTreeVisibleConfig.title">指标分析树结论</h2>
                    <p v-if="analysisTreeVisibleConfig.conclusion" class="tree-conclusion" @click="openNodeDetail('node_text')">
                      {{ analysisTreeReport.treeResult.conclusion }}
                    </p>
                  </div>
                  <div class="tree-stat-grid">
                    <div v-for="stat in analysisTreeStats" :key="stat.label" class="tree-stat">
                      <span>{{ stat.label }}</span>
                      <n-tag :type="stat.type" bordered>{{ stat.value }}</n-tag>
                    </div>
                  </div>
                </div>
              </n-card>

              <div class="tree-workbench">
                <n-card v-if="analysisTreeVisibleConfig.analysisTree" :bordered="false" class="tree-canvas-card">
                  <template #header>
                    <div class="tree-card-header">
                      <div>
                        <strong>可执行分析树</strong>
                        <span>{{ analysisTreeEdgeRows.length }} 条依赖连线</span>
                      </div>
                      <n-tag bordered>拓扑执行</n-tag>
                    </div>
                  </template>
                  <div class="analysis-tree-dag">
                    <div v-for="(level, levelIndex) in analysisTreeLevels" :key="levelIndex" class="tree-stage">
                      <div v-if="levelIndex > 0" class="stage-connector" aria-hidden="true">
                        <span class="stage-connector-line" />
                        <span class="stage-connector-arrow">→</span>
                      </div>
                      <div class="tree-level">
                        <div class="level-title">
                          <span>第 {{ levelIndex + 1 }} 层</span>
                          <em>{{ level.length }} 个节点</em>
                        </div>
                        <div class="level-node-list">
                          <button
                            v-for="node in level"
                            :key="node.id"
                            class="analysis-node"
                            :class="[node.status, { selected: selectedNodeId === node.id }]"
                            type="button"
                            @click="selectAnalysisTreeNode(node.id)"
                          >
                            <span>{{ node.name }}</span>
                            <small>{{ analysisTreeNodeTypeLabels[node.type] }} · {{ analysisTreeStatusLabels[node.status] }}</small>
                            <em v-if="node.msg">{{ node.msg }}</em>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </n-card>

                <n-card :bordered="false" class="tree-node-panel">
                  <template #header>
                    <div class="tree-card-header">
                      <div>
                        <strong>当前节点</strong>
                        <span>{{ selectedAnalysisTreeNode?.id || '-' }}</span>
                      </div>
                      <n-tag v-if="selectedAnalysisTreeNode" :type="analysisTreeStatusTagType(selectedAnalysisTreeNode.status)" bordered>
                        {{ analysisTreeStatusLabels[selectedAnalysisTreeNode.status] }}
                      </n-tag>
                    </div>
                  </template>
                  <template v-if="selectedAnalysisTreeNode">
                    <h3>{{ selectedAnalysisTreeNode.name }}</h3>
                    <n-space size="small" class="node-type-row">
                      <n-tag bordered>{{ analysisTreeNodeTypeLabels[selectedAnalysisTreeNode.type] }}</n-tag>
                      <n-tag v-if="selectedNodeDetail" type="info" bordered>{{ selectedNodeDetail.title }}</n-tag>
                    </n-space>
                    <n-alert v-if="selectedAnalysisTreeNode.msg" class="section-note" type="error" :show-icon="false">
                      {{ selectedAnalysisTreeNode.msg }}
                    </n-alert>
                    <p class="node-nlg">{{ selectedAnalysisTreeNode.nlg || '该节点暂无自动结论。' }}</p>
                    <div class="node-relations">
                      <div>
                        <span>父节点</span>
                        <strong>{{ selectedNodeParents.join('、') || '-' }}</strong>
                      </div>
                      <div>
                        <span>子节点</span>
                        <strong>{{ selectedNodeChildren.join('、') || '-' }}</strong>
                      </div>
                    </div>
                    <n-data-table
                      v-if="selectedNodeDetail"
                      class="node-detail-table"
                      :columns="selectedNodeDetailColumns"
                      :data="selectedNodeDetail.rows"
                      :pagination="false"
                      size="small"
                    />
                    <n-empty v-else description="该节点暂无阶段二明细。" />
                    <n-button class="node-detail-action" secondary @click="openSelectedNodeDetail">弹窗查看节点明细</n-button>
                  </template>
                </n-card>
              </div>

              <n-card :bordered="false" class="tree-sync-card">
                <template #header>
                  <div class="tree-card-header">
                    <div>
                      <strong>执行结果与同步参数</strong>
                      <span>节点运行、依赖连线与阶段二 OpenAPI</span>
                    </div>
                  </div>
                </template>
                <n-tabs type="line">
                  <n-tab-pane name="nodes" tab="节点运行">
                    <n-data-table :columns="analysisTreeNodeColumns" :data="analysisTreeNodeRows" size="small" />
                  </n-tab-pane>
                  <n-tab-pane name="edges" tab="连线关系">
                    <n-data-table :columns="analysisTreeEdgeColumns" :data="analysisTreeEdgeRows as Record<string, unknown>[]" size="small" />
                  </n-tab-pane>
                  <n-tab-pane name="payload" tab="OpenAPI 参数">
                    <div class="tree-payload-grid">
                      <div>
                        <div class="payload-title">阶段一 WebHook 元信息</div>
                        <pre class="tree-payload">{{ analysisTreeWebhookMetaPayload }}</pre>
                      </div>
                      <div>
                        <div class="payload-title">当前节点阶段二请求</div>
                        <pre class="tree-payload">{{ selectedAnalysisTreePayload }}</pre>
                      </div>
                    </div>
                  </n-tab-pane>
                </n-tabs>
              </n-card>
            </div>
          </template>

          <n-empty v-if="!visibleConfig.tables && (report.webTabs?.length ?? 0) === 0" description="当前嵌出参数已隐藏报告内容。" />

          <n-tabs v-if="!analysisTreeReport && (visibleConfig.tables || (report.webTabs?.length ?? 0) > 0)" v-model:value="activeWebTab" type="line" animated>
            <n-tab-pane v-if="visibleConfig.tables" name="report" tab="归因报告">
              <template v-if="report.reportType === 'ANOMALY'">
                <n-grid :cols="24" :x-gap="16">
                  <n-gi :span="10">
                    <n-card title="指标拆解" :bordered="false">
                      <n-data-table
                        :columns="anomalyMetricColumns"
                        :data="report.metricDisassemblyRows as unknown as Record<string, unknown>[]"
                        :pagination="false"
                        :row-props="anomalyMetricRowProps"
                      />
                      <n-alert class="section-note" type="info" :show-icon="false">
                        点击指标行查看该指标的观察趋势。
                      </n-alert>
                      <v-chart class="mini-chart" :option="anomalyMetricTrendOption" autoresize />
                    </n-card>
                  </n-gi>
                  <n-gi :span="14">
                    <n-card title="维度拆解" :bordered="false">
                      <n-space v-if="advanceVisible && !visibleConfig.pureTable" class="table-toolbar">
                        <n-input-number v-model:value="topN" :min="1" :max="100" />
                        <n-select v-model:value="anomalySortBy" :options="anomalySortOptions" class="toolbar-select" />
                        <n-text depth="3">按异常程度、差值或差异百分比展示 TopN。</n-text>
                      </n-space>
                      <n-data-table
                        :columns="anomalyDimensionColumns"
                        :data="sortedAnomalyDimensionRows as unknown as Record<string, unknown>[]"
                        :pagination="false"
                        :row-key="(row) => String(row.id)"
                      />
                    </n-card>
                  </n-gi>
                </n-grid>
              </template>

              <template v-if="report.reportType === 'DIMENSION_ATTRIBUTION'">
                <n-grid :cols="24" :x-gap="16">
                  <n-gi :span="8">
                    <n-card title="根因维度定位" :bordered="false">
                      <div v-for="item in visibleRootCauses" :key="item.dimensionName" class="root-cause-row">
                        <n-space justify="space-between">
                          <span>{{ item.rank }}. {{ item.dimensionName }}</span>
                          <n-tag :type="item.isRootCause ? 'error' : 'default'">Surprise {{ item.surprise }}</n-tag>
                        </n-space>
                      </div>
                      <n-space v-if="advanceVisible && !visibleConfig.pureTable" class="table-toolbar" justify="space-between" align="center">
                        <n-button size="small" secondary @click="rootCauseExpanded = !rootCauseExpanded">
                          {{ rootCauseExpanded ? '收起根因' : '展开全部根因' }}
                        </n-button>
                        <n-tag bordered>根因维度可进入下方视角继续分析</n-tag>
                      </n-space>
                      <v-chart v-if="rootCauseExpanded" class="mini-chart" :option="rootCauseChartOption" autoresize />
                    </n-card>
                  </n-gi>
                  <n-gi :span="16">
                    <n-card title="归因视角" :bordered="false">
                      <n-space v-if="advanceVisible && !visibleConfig.pureTable" class="table-toolbar" align="center">
                        <n-select v-model:value="activeDimensionViewId" :options="dimensionViewOptions" class="view-select" @update:value="(value) => updateDimensionView(String(value))" />
                        <n-radio-group v-model:value="dimensionDisplayMode">
                          <n-radio-button
                            v-for="mode in activeDisplayModeOptions"
                            :key="String(mode.value)"
                            :value="mode.value"
                          >
                            {{ mode.label }}
                          </n-radio-button>
                        </n-radio-group>
                        <n-input-number v-model:value="topN" :min="1" :max="100" />
                        <n-switch v-model:value="topNEnabled" />
                        <span>启用 TopN</span>
                        <n-select v-model:value="topNSortBy" :options="topNSortOptions" class="toolbar-select" />
                        <n-switch v-model:value="advancedMode" />
                        <span>高级模式</span>
                        <n-button size="small" secondary @click="activeDimensionView && downloadDimensionRows(sortedDimensionRows, activeDimensionView.viewName)">下载当前结果</n-button>
                        <n-button size="small" secondary @click="activeDimensionView && downloadDimensionRows(activeDimensionView.rows, `${activeDimensionView.viewName}_全量`)">下载全量</n-button>
                      </n-space>
                      <n-alert v-if="dimensionDisplayMode !== 'TABLE' && !topNEnabled && sortedDimensionRows.length > 100" type="warning" :show-icon="false" class="section-note">
                        图形模式最多建议展示 100 条，当前会保留表格全量能力，图形阅读可能受影响。
                      </n-alert>
                      <template v-if="activeDimensionView && dimensionDisplayMode === 'TABLE'">
                        <n-data-table :columns="dimensionColumns" :data="sortedDimensionRows" :pagination="false" />
                      </template>
                      <v-chart v-else-if="dimensionDisplayMode === 'WATERFALL'" class="chart" :option="dimensionWaterfallOption" autoresize />
                      <div v-else class="breakdown-tree">
                        <div v-for="row in sortedDimensionRows.slice(0, topN)" :key="row.id" class="tree-node">
                          <strong>{{ row.pathValue.join(' / ') }}</strong>
                          <span>{{ formatPercent(row.contributionRate) }} · {{ formatNumber(row.contributionValue) }}</span>
                          <n-button size="tiny" secondary class="tree-action" @click="addDimensionTrendItem(row)">加入趋势</n-button>
                          <div v-for="child in row.children?.slice(0, 1)" :key="child.id" class="tree-child">
                            {{ child.pathValue.join(' / ') }} · {{ formatPercent(child.contributionRate) }}
                          </div>
                        </div>
                      </div>
                    </n-card>
                  </n-gi>
                </n-grid>

                <n-card title="趋势图与对大盘影响" :bordered="false" class="section-card">
                  <n-alert v-if="selectedTrendItems.length === 0" type="warning" :show-icon="false">请选择至少一个维度项查看趋势。</n-alert>
                  <n-space v-if="!visibleConfig.pureTable" class="table-toolbar" align="center">
                    <n-tag v-for="item in selectedTrendItems" :key="item" closable @close="selectedTrendItems = selectedTrendItems.filter((value) => value !== item)">
                      {{ item }}
                    </n-tag>
                    <n-radio-group v-model:value="yoyMode" size="small">
                      <n-radio-button value="pop">同比/环比</n-radio-button>
                      <n-radio-button value="diff">差值</n-radio-button>
                      <n-radio-button value="raw">原值</n-radio-button>
                    </n-radio-group>
                    <n-button secondary size="small" @click="router.push('/analysis-center/visual-query')">跳转可视化查询</n-button>
                  </n-space>
                  <n-grid :cols="24" :x-gap="16">
                    <n-gi :span="14">
                      <div class="chart-panel">
                        <div class="panel-title">维度趋势</div>
                        <v-chart class="chart" :option="dimensionTrendOption" autoresize />
                      </div>
                    </n-gi>
                    <n-gi :span="10">
                      <div class="chart-panel">
                        <div class="panel-title">对大盘影响</div>
                        <v-chart class="small-chart" :option="impactScatterOption" autoresize />
                        <n-data-table
                          v-if="report.reportType === 'DIMENSION_ATTRIBUTION'"
                          :columns="impactColumns"
                          :data="report.impactRows as unknown as Record<string, unknown>[]"
                          :pagination="false"
                          size="small"
                        />
                      </div>
                    </n-gi>
                  </n-grid>
                </n-card>
              </template>

              <template v-if="report.reportType === 'METRIC_ATTRIBUTION'">
                <n-space v-if="advanceVisible && !visibleConfig.pureTable" class="table-toolbar">
                  <n-radio-group v-model:value="metricOrderMode">
                    <n-radio-button value="CONTRIBUTION_DESC">按贡献排序</n-radio-button>
                    <n-radio-button value="CONFIG_ORDER">按配置顺序</n-radio-button>
                  </n-radio-group>
                </n-space>
                <n-card v-for="formula in report.formulaResults" :key="formula.formulaId" :bordered="false" class="section-card">
                  <template #header>
                    <n-space align="center">
                      <strong>{{ formula.formulaName }}</strong>
                      <n-tag bordered>{{ formula.attributionMode }}</n-tag>
                    </n-space>
                  </template>
                  <n-alert v-if="formula.qualityWarning" type="warning" :show-icon="false" class="section-note">
                    {{ formula.qualityWarning }}
                  </n-alert>
                  <n-data-table :columns="metricColumns" :data="metricRowsForFormula(formula) as unknown as Record<string, unknown>[]" :pagination="false" />
                </n-card>
              </template>

            </n-tab-pane>

            <n-tab-pane v-for="tab in report.webTabs" :key="tab.id" :name="tab.id" :tab="tab.title">
              <n-card :bordered="false">
                <n-alert type="info" :show-icon="false">
                  外部网页 Tab：<a :href="tab.url" target="_blank">{{ tab.url }}</a>
                </n-alert>
                <iframe class="web-tab-frame" :src="tab.url" />
              </n-card>
            </n-tab-pane>
          </n-tabs>
        </template>
      </template>
    </n-spin>

    <n-modal v-model:show="customRunVisible" preset="card" title="自定义运算" class="medium-modal">
      <n-alert type="info" :show-icon="false" class="section-note">
        自定义报告是公共的，未保存时 7 天后过期，不影响例行运算和订阅。
      </n-alert>
      <n-grid :cols="2" :x-gap="12">
        <n-gi>
          <n-form-item label="基准期开始">
            <n-input v-model:value="customRun.baseStart" />
          </n-form-item>
        </n-gi>
        <n-gi>
          <n-form-item label="基准期结束">
            <n-input v-model:value="customRun.baseEnd" />
          </n-form-item>
        </n-gi>
        <n-gi>
          <n-form-item label="观察期开始">
            <n-input v-model:value="customRun.compareStart" />
          </n-form-item>
        </n-gi>
        <n-gi>
          <n-form-item label="观察期结束">
            <n-input v-model:value="customRun.compareEnd" />
          </n-form-item>
        </n-gi>
      </n-grid>
      <template #footer>
        <n-space justify="end">
          <n-button @click="customRunVisible = false">取消</n-button>
          <n-button type="primary" @click="createCustomRun">开始运算</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="embedVisible" preset="card" title="嵌入仪表盘链接" class="medium-modal">
      <n-input :value="embedLink" type="textarea" readonly />
      <template #footer>
        <n-space justify="end">
          <n-button @click="embedVisible = false">关闭</n-button>
          <n-button type="primary" @click="copyEmbedLink">复制</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="nodeDetailVisible" preset="card" title="节点明细" class="medium-modal">
      <template v-if="selectedNodeDetail">
        <h3>{{ selectedNodeDetail.title }}</h3>
        <n-data-table :columns="Object.keys(selectedNodeDetail.rows[0] ?? {}).map((key) => ({ title: key, key }))" :data="selectedNodeDetail.rows" />
      </template>
      <n-empty v-else description="该节点暂无明细或已通过参数禁用点击。" />
    </n-modal>
  </div>
</template>

<style scoped lang="scss">
.business-attribution-report.inline {
  padding: 12px;
}

.page-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.report-header-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.top-card,
.section-card,
.primary-grid {
  margin-bottom: 16px;
}

.report-meta-card {
  :deep(.n-card__content) {
    padding: 16px 18px;
  }
}

.report-meta-grid {
  display: grid;
  grid-template-columns: minmax(220px, 1.5fr) repeat(4, minmax(130px, 1fr));
  gap: 12px;
  align-items: stretch;
}

.meta-selector,
.meta-tile {
  min-height: 72px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;

  span {
    display: block;
    margin-bottom: 8px;
    color: #667085;
    font-size: 12px;
  }

  strong {
    color: #1f2937;
    font-size: 13px;
    line-height: 1.5;
  }
}

.primary-card {
  min-height: 318px;
}

.primary-value {
  margin: 10px 0 12px;
  font-size: 34px;
  font-weight: 800;
}

.primary-stats {
  display: grid;
  gap: 10px;
  margin-top: 20px;
  color: #667085;
}

.chart {
  width: 100%;
  height: 300px;
}

.small-chart {
  width: 100%;
  height: 220px;
}

.mini-chart {
  width: 100%;
  height: 220px;
}

.chart-panel {
  min-height: 300px;
}

.panel-title {
  margin-bottom: 10px;
  color: #344054;
  font-weight: 700;
}

.table-toolbar {
  margin-bottom: 12px;
}

.toolbar-select {
  width: 180px;
}

.view-select {
  width: 220px;
}

.section-note {
  margin: 12px 0 14px;
}

.business-attribution-report :deep(.n-card) {
  border-radius: 8px;
}

.group-tag {
  cursor: pointer;
}

.root-cause-row {
  padding: 12px 0;
  border-bottom: 1px solid #edf0f5;
}

.breakdown-tree {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.tree-node {
  padding: 14px;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: #f8fafc;

  span {
    display: block;
    margin-top: 8px;
    color: #667085;
  }
}

.tree-child {
  margin-top: 10px;
  padding: 10px;
  border-left: 3px solid #2563eb;
  background: #fff;
}

.tree-action {
  margin-top: 10px;
}

.analysis-tree-report-shell {
  display: grid;
  gap: 16px;
}

.tree-overview-card {
  :deep(.n-card__content) {
    padding: 22px 26px;
  }
}

.tree-overview-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 480px);
  gap: 24px;
  align-items: start;
}

.tree-overview-title {
  h2 {
    margin: 16px 0 10px;
    color: #1f2937;
    font-size: 22px;
  }
}

.tree-conclusion {
  max-width: 920px;
  margin: 0;
  color: #344054;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.75;
  cursor: pointer;
}

.tree-stat-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(72px, 1fr));
  gap: 10px;
}

.tree-stat {
  min-height: 76px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;

  span {
    display: block;
    margin-bottom: 10px;
    color: #667085;
    font-size: 12px;
  }
}

.tree-workbench {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.tree-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  strong,
  span {
    display: block;
  }

  span {
    margin-top: 4px;
    color: #667085;
    font-size: 12px;
    font-weight: 400;
  }
}

.tree-canvas-card,
.tree-node-panel,
.tree-sync-card {
  :deep(.n-card__content) {
    padding-top: 12px;
  }
}

.analysis-tree-dag {
  display: flex;
  gap: 0;
  min-height: 438px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 6px 4px 18px;
  scrollbar-color: #cbd5e1 transparent;
}

.tree-stage {
  display: flex;
  flex: 0 0 auto;
  align-items: stretch;
}

.stage-connector {
  position: relative;
  flex: 0 0 46px;
  min-height: 100%;
  margin-top: 0;
}

.stage-connector-line {
  position: absolute;
  top: 24px;
  right: 0;
  left: 0;
  height: 3px;
  border-radius: 999px;
  background: linear-gradient(90deg, #bfdbfe 0%, #2563eb 52%, #bfdbfe 100%);
}

.stage-connector-arrow {
  position: absolute;
  top: 10px;
  left: 50%;
  display: flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  transform: translateX(-50%);
  border: 0;
  border-radius: 999px;
  background: #2563eb;
  color: #fff;
  font-size: 16px;
  font-weight: 800;
  box-shadow: 0 0 0 4px #fff;
}

.tree-level {
  flex: 0 0 224px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: linear-gradient(180deg, #f8fafc 0, #f8fafc 48px, #fff 48px);
}

.level-title {
  display: flex;
  height: 48px;
  align-items: center;
  justify-content: space-between;
  margin: 0;
  padding: 0 14px;
  border-bottom: 1px solid #e5e7eb;
  color: #667085;
  font-size: 12px;
  font-weight: 700;

  span,
  em {
    display: block;
    font-style: normal;
  }

  span {
    color: #344054;
    font-size: 14px;
  }
}

.level-node-list {
  display: grid;
  gap: 12px;
  padding: 14px;
}

.analysis-node {
  display: block;
  width: 100%;
  min-height: 92px;
  padding: 14px;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: #fff;
  text-align: left;
  cursor: pointer;

  span,
  small {
    display: block;
  }

  span {
    color: #1f2937;
    font-weight: 700;
  }

  small {
    margin-top: 8px;
    color: #667085;
  }

  em {
    display: block;
    margin-top: 8px;
    color: #b42318;
    font-size: 12px;
    font-style: normal;
    line-height: 1.4;
  }

  &.finish {
    border-color: #8bd9ad;
    background: #f0fdf4;
  }

  &.failed {
    border-color: #f6aaa9;
    background: #fff1f0;
  }

  &.unready {
    border-color: #f7d37a;
    background: #fffbeb;
  }

  &.wontDrill {
    border-color: #cbd5e1;
    background: #f8fafc;
  }

  &.selected {
    border-color: #1677ff;
    box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.18);
  }
}

.tree-node-panel {
  position: static;
}

.tree-node-panel h3 {
  margin: 0 0 10px;
  color: #1f2937;
  font-size: 18px;
}

.node-type-row,
.node-detail-table,
.node-detail-action {
  margin-top: 12px;
}

.node-nlg {
  margin: 14px 0;
  color: #344054;
  line-height: 1.7;
}

.node-relations {
  display: grid;
  gap: 10px;
  margin-top: 12px;

  div {
    padding: 10px 12px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #f8fafc;
  }

  span,
  strong {
    display: block;
  }

  span {
    margin-bottom: 6px;
    color: #667085;
    font-size: 12px;
  }

  strong {
    color: #344054;
    font-size: 13px;
    line-height: 1.5;
  }
}

.tree-payload-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.payload-title {
  margin-bottom: 8px;
  color: #344054;
  font-weight: 700;
}

.tree-payload {
  max-height: 420px;
  margin: 0;
  overflow: auto;
  padding: 12px;
  border-radius: 8px;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 12px;
  line-height: 1.55;
}

.web-tab-frame {
  width: 100%;
  height: 420px;
  margin-top: 12px;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
}

.medium-modal {
  width: 560px;
}

:deep(.row-selected td) {
  background: #eff6ff;
}

@media (max-width: 1280px) {
  .report-meta-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
