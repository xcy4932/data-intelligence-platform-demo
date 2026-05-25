<script setup lang="ts">
import {
  NAlert,
  NButton,
  NCard,
  NCheckbox,
  NDataTable,
  NDivider,
  NEmpty,
  NForm,
  NFormItem,
  NGi,
  NGrid,
  NInput,
  NInputNumber,
  NModal,
  NPopconfirm,
  NRadio,
  NRadioGroup,
  NSelect,
  NSlider,
  NSpace,
  NStep,
  NSteps,
  NSwitch,
  NTag,
  NText,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, SelectOption } from 'naive-ui'
import { computed, h, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  businessAttributionDatasets,
  businessAttributionReportTypeLabels,
  businessAttributionStatusLabels,
  initialBusinessAttributionConfigs,
} from '@/mock/businessAttribution'
import {
  businessAttributionService,
  deriveComparePeriod,
  inferDimensionAlgorithm,
  validatePartitionFilter,
  validateWebTabUrl,
} from '@/services/businessAttributionService'
import type {
  AnalysisTreeEdge,
  AnalysisTreeNode,
  AttributionConfig,
  AttributionReportType,
  DimensionAttributionView,
  FilterCondition,
  MetricAttributionFormula,
  PermissionGrant,
  TrialRunResult,
  WebTabConfig,
} from '@/types/businessAttribution'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const loading = ref(false)
const saving = ref(false)
const activeStep = ref(1)
const config = ref<AttributionConfig | null>(null)
const trialResult = ref<TrialRunResult | null>(null)
const datasets = ref(businessAttributionDatasets)
const webTabModalVisible = ref(false)
const permissionVisible = ref(false)
const permissions = ref<PermissionGrant[]>([])
const webTabDraft = reactive({
  url: '',
})
const permissionDraft = reactive<PermissionGrant>({
  id: '',
  resourceId: '',
  granteeType: 'USER',
  granteeId: '',
  granteeName: '',
  role: 'VIEW',
})

const stepItems = [
  '选择归因类型',
  '配置核心指标',
  '业务日期与对比',
  '筛选条件',
  '专项参数',
  '配置分组维度',
  '配置核心指标异动',
  '网页 Tab',
  '保存并试运算',
]

const reportTypeOptions = Object.entries(businessAttributionReportTypeLabels).map(([value, label]) => ({
  label,
  value,
  description:
    value === 'ANOMALY'
      ? '检测核心指标是否显著偏高或偏低'
      : value === 'DIMENSION_ATTRIBUTION'
        ? '定位维度和值对指标变化的贡献'
        : value === 'METRIC_ATTRIBUTION'
          ? '解释相关指标、公式因子或过程指标贡献'
          : '把指标、筛选、异动和归因节点编排成分析树',
}))

const aggregateOptions: SelectOption[] = [
  { label: 'SUM', value: 'SUM' },
  { label: 'COUNT', value: 'COUNT' },
  { label: 'COUNT DISTINCT', value: 'COUNT_DISTINCT' },
  { label: 'AVG', value: 'AVG' },
  { label: '已聚合表达式 AGG', value: 'AGG' },
]

const granularityOptions: SelectOption[] = [
  { label: '日', value: 'DAY' },
  { label: '周', value: 'WEEK' },
  { label: '双周', value: 'BIWEEK' },
  { label: '月', value: 'MONTH' },
  { label: '双月', value: 'BIMONTH' },
]

const weekdayOptions: SelectOption[] = [
  { label: '周一', value: 1 },
  { label: '周二', value: 2 },
  { label: '周三', value: 3 },
  { label: '周四', value: 4 },
  { label: '周五', value: 5 },
  { label: '周六', value: 6 },
  { label: '周日', value: 7 },
]

const filterOperatorOptions: SelectOption[] = [
  { label: '等于', value: 'EQ' },
  { label: '属于', value: 'IN' },
  { label: '区间', value: 'BETWEEN' },
  { label: '大于等于', value: 'GTE' },
  { label: '小于等于', value: 'LTE' },
  { label: '包含', value: 'CONTAINS' },
  { label: '为空', value: 'IS_NULL' },
  { label: '不为空', value: 'IS_NOT_NULL' },
]

const viewTypeOptions: SelectOption[] = [
  { label: '下钻视角', value: 'DRILLDOWN' },
  { label: '组合视角', value: 'COMBINATION' },
  { label: '自动发现', value: 'AUTO_DISCOVERY' },
]

const algorithmOptions: SelectOption[] = [
  { label: '定基法 Adtributor', value: 'ADTRIBUTOR' },
  { label: '占比加权法 Proportion', value: 'PROPORTION' },
  { label: '剔除法 Drop', value: 'DROP' },
]

const factorOrderOptions: SelectOption[] = [
  { label: '按贡献率降序', value: 'CONTRIBUTION_DESC' },
  { label: '按配置顺序', value: 'CONFIG_ORDER' },
]

const formulaModeOptions: SelectOption[] = [
  { label: '乘法公式', value: 'MULTIPLICATIVE' },
  { label: '复合公式', value: 'COMPOSITE_FORMULA' },
  { label: '相关性归因', value: 'CORRELATION' },
]

const granteeTypeOptions: SelectOption[] = [
  { label: '用户', value: 'USER' },
  { label: '用户组', value: 'USER_GROUP' },
]

const permissionRoleOptions: SelectOption[] = [
  { label: '查看', value: 'VIEW' },
  { label: '编辑', value: 'EDIT' },
  { label: '管理', value: 'MANAGE' },
]

const selectedDataset = computed(() => datasets.value.find((dataset) => dataset.id === config.value?.coreMetric.datasetId))
const datasetOptions = computed<SelectOption[]>(() => datasets.value.map((dataset) => ({ label: dataset.name, value: dataset.id })))
const metricOptions = computed<SelectOption[]>(() => selectedDataset.value?.metrics.map((metric) => ({ label: metric.label, value: metric.value })) ?? [])
const dateFieldOptions = computed<SelectOption[]>(() => selectedDataset.value?.dateFields.map((field) => ({ label: field.label, value: field.value })) ?? [])
const dimensionOptions = computed<SelectOption[]>(() => selectedDataset.value?.dimensions.map((dimension) => ({ label: dimension.label, value: dimension.value })) ?? [])
const fieldOptions = computed<SelectOption[]>(() => [
  ...(selectedDataset.value?.dateFields ?? []).map((field) => ({ label: field.label, value: field.value })),
  ...(selectedDataset.value?.dimensions ?? []).map((field) => ({ label: field.label, value: field.value })),
  ...(selectedDataset.value?.metrics ?? []).map((field) => ({ label: field.label, value: field.value })),
  { label: '分区日期 p_date', value: 'p_date' },
])
const hasPartitionFilter = computed(() => validatePartitionFilter(config.value?.filterConfig))
const canSwitchType = computed(() => !config.value?.reportTypeLocked)
const saveDisabled = computed(() => !config.value?.reportType || !hasPartitionFilter.value)

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function configId(): string {
  return String(route.params.configId)
}

function optionLabel(option: SelectOption | undefined): string {
  if (!option) return ''
  return typeof option.label === 'string' ? option.label : String(option.value ?? '')
}

function displayDecimalPlaces(): number {
  const format = config.value?.coreMetric.displayFormat
  return format && 'decimalPlaces' in format ? format.decimalPlaces ?? 2 : 2
}

function updateDisplayDecimalPlaces(value: number | null): void {
  if (!config.value) return
  const format = config.value.coreMetric.displayFormat
  if ('decimalPlaces' in format) {
    format.decimalPlaces = value ?? 0
  }
}

function updateThousandsSeparator(value: boolean): void {
  if (!config.value || config.value.coreMetric.displayFormat.type !== 'NUMBER') return
  config.value.coreMetric.displayFormat.useThousandsSeparator = value
}

function updateCustomFormat(value: string): void {
  if (!config.value) return
  config.value.coreMetric.displayFormat = {
    type: 'CUSTOM',
    rules: [
      {
        condition: value.split('=>')[0]?.trim() || 'default',
        format: value.split('=>')[1]?.trim() || '原始值',
      },
    ],
  }
}

function setReportType(type: AttributionReportType): void {
  if (!config.value || config.value.reportTypeLocked) return
  config.value.reportType = type
  ensureTypeDefaults(type)
}

function ensureTypeDefaults(type: AttributionReportType): void {
  if (!config.value) return

  if (type === 'ANOMALY' && !config.value.anomalyConfig) {
    config.value.anomalyConfig = clone(initialBusinessAttributionConfigs[0]!.anomalyConfig!)
  }

  if (type === 'DIMENSION_ATTRIBUTION' && !config.value.dimensionAttributionConfig) {
    config.value.dimensionAttributionConfig = clone(initialBusinessAttributionConfigs[1]!.dimensionAttributionConfig!)
  }

  if (type === 'METRIC_ATTRIBUTION' && !config.value.metricAttributionConfig) {
    config.value.metricAttributionConfig = clone(initialBusinessAttributionConfigs[2]!.metricAttributionConfig!)
  }

  if (type === 'ANALYSIS_TREE' && !config.value.analysisTreeConfig) {
    config.value.analysisTreeConfig = clone(initialBusinessAttributionConfigs[3]!.analysisTreeConfig!)
  }
}

function updateDataset(datasetId: string): void {
  if (!config.value) return
  const dataset = datasets.value.find((item) => item.id === datasetId)
  if (!dataset) return
  const metric = dataset.metrics[0]
  config.value.coreMetric.datasetId = dataset.id
  config.value.coreMetric.datasetName = dataset.name
  config.value.businessDate.dateField = dataset.dateFields[0]?.value ?? ''
  config.value.compareConfig = deriveComparePeriod(config.value.businessDate, config.value.compareConfig.generatedBy)

  if (metric) {
    config.value.coreMetric.metricId = metric.value
    config.value.coreMetric.metricName = metric.label
    config.value.coreMetric.metricExpression = metric.expression
    config.value.coreMetric.aggregate = metric.aggregateLocked ? 'AGG' : 'SUM'
    config.value.coreMetric.aggregateLocked = metric.aggregateLocked
  }
}

function updateBusinessDate(): void {
  if (!config.value) return
  config.value.compareConfig = deriveComparePeriod(config.value.businessDate, config.value.compareConfig.generatedBy)
}

function updateMetric(metricId: string): void {
  if (!config.value) return
  const metric = selectedDataset.value?.metrics.find((item) => item.value === metricId)
  if (!metric) return
  config.value.coreMetric.metricId = metric.value
  config.value.coreMetric.metricName = metric.label
  config.value.coreMetric.metricExpression = metric.expression
  config.value.coreMetric.aggregate = metric.aggregateLocked ? 'AGG' : 'SUM'
  config.value.coreMetric.aggregateLocked = metric.aggregateLocked

  if (config.value.dimensionAttributionConfig) {
    config.value.dimensionAttributionConfig.attributionViews.forEach((view) => {
      view.algorithm = inferDimensionAlgorithm(metric.expression)
    })
  }
}

function addAndGroup(): void {
  if (!config.value) return
  if (!config.value.filterConfig) {
    config.value.filterConfig = { andGroups: [] }
  }
  config.value.filterConfig.andGroups.push({
    id: `fg_${Date.now()}`,
    conditions: [createFilterCondition()],
  })
}

function createFilterCondition(): FilterCondition {
  return {
    fieldId: 'p_date',
    fieldName: 'p_date',
    fieldType: 'DATE',
    operator: 'BETWEEN',
    value: ['2026-05-04', '2026-05-17'],
  }
}

function addOrCondition(groupIndex: number): void {
  config.value?.filterConfig?.andGroups[groupIndex]?.conditions.push(createFilterCondition())
}

function removeCondition(groupIndex: number, conditionIndex: number): void {
  const group = config.value?.filterConfig?.andGroups[groupIndex]
  if (!group) return
  group.conditions.splice(conditionIndex, 1)
  if (group.conditions.length === 0) {
    config.value?.filterConfig?.andGroups.splice(groupIndex, 1)
  }
}

function updateFilterField(condition: FilterCondition, fieldName: string): void {
  condition.fieldId = fieldName
  condition.fieldName = fieldName
  condition.fieldType = fieldName.includes('date') || fieldName === 'p_date' ? 'DATE' : fieldName.startsWith('f_') || fieldName.startsWith('p_') ? 'NUMBER' : 'STRING'
}

function addDimensionDrilldown(): void {
  const anomaly = config.value?.anomalyConfig
  if (!anomaly) return
  anomaly.dimensionDrilldowns ??= []
  anomaly.dimensionDrilldowns.push({
    id: `drill_${Date.now()}`,
    name: `维度拆解 ${anomaly.dimensionDrilldowns.length + 1}`,
    dimensions: [{ fieldId: 'channel', fieldName: 'channel', displayName: '渠道' }],
  })
}

function addMetricDisassembly(): void {
  const anomaly = config.value?.anomalyConfig
  if (!anomaly) return
  anomaly.metricDisassemblies ??= []
  anomaly.metricDisassemblies.push({
    id: `formula_${Date.now()}`,
    formulaName: `指标拆解 ${anomaly.metricDisassemblies.length + 1}`,
    expression: '广告观看次数 * eCPM / 1000',
    factors: [{ metricId: 'f_watch_count', metricName: '广告观看次数', aggregate: 'AGG' }],
  })
}

function updateDrilldownDimensions(pathIndex: number, values: string[]): void {
  const path = config.value?.anomalyConfig?.dimensionDrilldowns?.[pathIndex]
  if (!path) return
  path.dimensions = values.map((value) => ({
    fieldId: value,
    fieldName: value,
    displayName: optionLabel(dimensionOptions.value.find((item) => item.value === value)).split(' ')[0] ?? value,
  }))
}

function updateDimensionViewDimensions(view: DimensionAttributionView, values: string[]): void {
  view.dimensions = values.map((value) => ({
    fieldId: value,
    fieldName: value,
    displayName: optionLabel(dimensionOptions.value.find((item) => item.value === value)).split(' ')[0] ?? value,
  }))
}

function addDimensionView(): void {
  const dimensionConfig = config.value?.dimensionAttributionConfig
  if (!dimensionConfig) return
  dimensionConfig.attributionViews.push({
    id: `view_${Date.now()}`,
    name: `归因视角 ${dimensionConfig.attributionViews.length + 1}`,
    viewType: 'DRILLDOWN',
    algorithm: inferDimensionAlgorithm(config.value?.coreMetric.metricExpression ?? ''),
    dimensions: [{ fieldId: 'channel', fieldName: 'channel', displayName: '渠道' }],
    topN: 10,
  })
}

function addMetricFormula(): void {
  const metricConfig = config.value?.metricAttributionConfig
  if (!metricConfig) return
  metricConfig.formulas.push({
    id: `formula_${Date.now()}`,
    name: `指标归因公式 ${metricConfig.formulas.length + 1}`,
    attributionMode: 'MULTIPLICATIVE',
    factorDisplayOrder: 'CONTRIBUTION_DESC',
    multiplicativeConfig: {
      factors: [
        { id: `factor_${Date.now()}_1`, metricName: '广告观看次数', datasetId: 'ds_ad_watch_detail', metricId: 'f_watch_count', aggregate: 'AGG', dateField: 'event_date', displayFormat: { type: 'NUMBER' } },
        { id: `factor_${Date.now()}_2`, metricName: 'eCPM', datasetId: 'ds_ad_watch_detail', metricId: 'f_ecpm', aggregate: 'AVG', dateField: 'event_date', displayFormat: { type: 'NUMBER', decimalPlaces: 2 } },
      ],
    },
  })
}

function addFactor(formula: MetricAttributionFormula): void {
  const factor = {
    id: `factor_${Date.now()}`,
    metricName: `过程指标 ${Date.now().toString().slice(-4)}`,
    datasetId: config.value?.coreMetric.datasetId ?? 'ds_ad_watch_detail',
    metricId: config.value?.coreMetric.metricId ?? 'f_revenue',
    aggregate: 'AGG' as const,
    dateField: config.value?.businessDate.dateField ?? 'event_date',
    displayFormat: { type: 'NUMBER' as const },
  }

  if (formula.attributionMode === 'MULTIPLICATIVE') {
    formula.multiplicativeConfig ??= { factors: [] }
    formula.multiplicativeConfig.factors.push(factor)
  }

  if (formula.attributionMode === 'COMPOSITE_FORMULA') {
    formula.compositeFormulaConfig ??= { expression: 'A + B', factors: [] }
    formula.compositeFormulaConfig.factors.push(factor)
  }

  if (formula.attributionMode === 'CORRELATION') {
    formula.correlationConfig ??= { processMetrics: [], modelConfig: { algorithm: 'XGBOOST_SHAP', trainTestSplitRatio: 0.8, minHistoryPeriods: 30 } }
    formula.correlationConfig.processMetrics.push(factor)
  }
}

function updateFormulaMode(formula: MetricAttributionFormula, mode: MetricAttributionFormula['attributionMode']): void {
  formula.attributionMode = mode
  if (mode === 'MULTIPLICATIVE') {
    formula.multiplicativeConfig ??= { factors: [] }
  }
  if (mode === 'COMPOSITE_FORMULA') {
    formula.compositeFormulaConfig ??= { expression: '广告观看次数 * eCPM / 1000', factors: [] }
  }
  if (mode === 'CORRELATION') {
    formula.correlationConfig ??= { processMetrics: [], modelConfig: { algorithm: 'XGBOOST_SHAP', trainTestSplitRatio: 0.8, minHistoryPeriods: 30 } }
  }
}

function addGroupDimension(): void {
  if (!config.value) return
  config.value.groupDimensions ??= []
  config.value.groupDimensions.push({ fieldId: 'channel', fieldName: '渠道' })
}

function updateGroupDimension(index: number, fieldId: string): void {
  if (!config.value?.groupDimensions) return
  const label = optionLabel(dimensionOptions.value.find((item) => item.value === fieldId)).split(' ')[0] ?? fieldId
  config.value.groupDimensions[index] = { fieldId, fieldName: label }
}

function openWebTabModal(): void {
  webTabDraft.url = ''
  webTabModalVisible.value = true
}

function addWebTab(): void {
  if (!config.value) return
  if (!validateWebTabUrl(webTabDraft.url)) {
    message.error('URL 必须以 http:// 或 https:// 开头。')
    return
  }
  config.value.webTabs ??= []
  config.value.webTabs.push({
    id: `tab_${Date.now()}`,
    title: `网页 ${config.value.webTabs.length + 1}`,
    url: webTabDraft.url.trim(),
    order: config.value.webTabs.length + 1,
  })
  webTabModalVisible.value = false
}

function copyWebTab(tab: WebTabConfig): void {
  if (!config.value?.webTabs) return
  const index = config.value.webTabs.findIndex((item) => item.id === tab.id)
  config.value.webTabs.splice(index + 1, 0, {
    ...clone(tab),
    id: `tab_${Date.now()}`,
    title: `${tab.title} 副本`,
    order: tab.order + 1,
  })
}

function addTreeNode(): void {
  const tree = config.value?.analysisTreeConfig
  if (!tree) return
  const id = `node_text_${Date.now()}`
  tree.nodes.push({
    id,
    type: 'text',
    name: `文本节点 ${tree.nodes.length + 1}`,
    parentId: [],
    nextId: [],
    status: 'unready',
    content: '输入分析说明',
  })
}

function addTreeEdge(): void {
  const tree = config.value?.analysisTreeConfig
  if (!tree || tree.nodes.length < 2) return
  const from = tree.nodes[tree.nodes.length - 2]
  const to = tree.nodes[tree.nodes.length - 1]
  if (!from || !to) return
  tree.edges.push({ fromNodeId: from.id, toNodeId: to.id })
  to.parentId = Array.from(new Set([...to.parentId, from.id]))
  from.nextId = Array.from(new Set([...from.nextId, to.id]))
}

function removeTreeEdge(edge: AnalysisTreeEdge): void {
  const tree = config.value?.analysisTreeConfig
  if (!tree) return
  tree.edges = tree.edges.filter((item) => item !== edge)
}

async function saveConfig(): Promise<void> {
  if (!config.value) return
  if (saveDisabled.value) {
    message.error(!config.value.reportType ? '必须先选择归因类型。' : '必须指定分区日期 p_date 的查询范围，否则无法进行归因运算。')
    return
  }
  saving.value = true
  try {
    trialResult.value = await businessAttributionService.saveConfigAndTrialRun(config.value)
    config.value = await businessAttributionService.getConfig(config.value.id)
    if (trialResult.value.state === 'SUCCESS') {
      message.success(trialResult.value.message)
    } else {
      message.error(trialResult.value.message)
    }
  } catch (error) {
    message.error(error instanceof Error ? error.message : '保存失败')
  } finally {
    saving.value = false
  }
}

function openReport(): void {
  if (!config.value) return
  void router.push(`/analysis-center/business-attribution/reports/${config.value.id}`)
}

function openSubscription(): void {
  if (!config.value) return
  void router.push({ path: '/analysis-center/business-attribution/subscriptions', query: { configId: config.value.id } })
}

async function openPermissionModal(): Promise<void> {
  if (!config.value) return
  permissions.value = await businessAttributionService.listPermissions(config.value.id)
  Object.assign(permissionDraft, {
    id: '',
    resourceId: config.value.id,
    granteeType: 'USER',
    granteeId: '',
    granteeName: '',
    role: 'VIEW',
  })
  permissionVisible.value = true
}

async function savePermission(): Promise<void> {
  if (!config.value) return
  if (!permissionDraft.granteeName.trim()) {
    message.error('授权对象名称必填。')
    return
  }
  try {
    await businessAttributionService.savePermission({
      ...permissionDraft,
      resourceId: config.value.id,
      granteeId: permissionDraft.granteeId.trim() || permissionDraft.granteeName.trim(),
      granteeName: permissionDraft.granteeName.trim(),
    })
    permissions.value = await businessAttributionService.listPermissions(config.value.id)
    config.value = await businessAttributionService.getConfig(config.value.id)
    message.success('权限已保存。')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '权限保存失败')
  }
}

async function removePermission(row: PermissionGrant): Promise<void> {
  try {
    await businessAttributionService.deletePermission(row.id)
    if (config.value) {
      permissions.value = await businessAttributionService.listPermissions(config.value.id)
      config.value = await businessAttributionService.getConfig(config.value.id)
    }
    message.success('权限已删除。')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '权限删除失败')
  }
}

const treeNodeColumns: DataTableColumns<AnalysisTreeNode> = [
  { title: '节点', key: 'name' },
  { title: '类型', key: 'type' },
  {
    title: '状态',
    key: 'status',
    render: (row) => h(NTag, { bordered: false, type: row.status === 'finish' ? 'success' : row.status === 'failed' ? 'error' : 'warning' }, { default: () => row.status }),
  },
  { title: '结论', key: 'nlg' },
]

const permissionColumns: DataTableColumns<PermissionGrant> = [
  { title: '授权对象', key: 'granteeName' },
  { title: '类型', key: 'granteeType' },
  {
    title: '角色',
    key: 'role',
    render: (row) => h(NTag, { bordered: false, type: row.role === 'MANAGE' ? 'success' : row.role === 'EDIT' ? 'info' : 'default' }, { default: () => row.role }),
  },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    render: (row) =>
      h(
        NPopconfirm,
        { onPositiveClick: () => void removePermission(row) },
        {
          trigger: () => h(NButton, { size: 'small', type: 'error', secondary: true }, { default: () => '删除' }),
          default: () => '确认删除该授权吗？创建者默认管理权限不可删除。',
        },
      ),
  },
]

onMounted(async () => {
  loading.value = true
  try {
    datasets.value = await businessAttributionService.getDatasets()
    config.value = await businessAttributionService.getConfig(configId())
    if (config.value.reportType) {
      ensureTypeDefaults(config.value.reportType)
    }
  } finally {
    loading.value = false
  }
})

watch(
  () => config.value?.businessDate,
  () => updateBusinessDate(),
  { deep: true },
)
</script>

<template>
  <div class="page-container business-attribution-config">
    <div class="page-heading">
      <div>
        <h1 class="page-title">归因配置编辑</h1>
        <p class="page-description">保存后会自动触发试运算；归因类型首次保存后锁定。</p>
      </div>
      <n-space>
        <n-button @click="router.push('/analysis-center/business-attribution')">返回首页</n-button>
        <n-button secondary :disabled="!config?.reportType" @click="openReport">查看报告</n-button>
        <n-button secondary :disabled="!config" @click="openSubscription">新建订阅</n-button>
        <n-button secondary :disabled="!config" @click="openPermissionModal">权限管理</n-button>
        <n-button type="primary" :loading="saving" :disabled="saveDisabled" @click="saveConfig">保存并试运算</n-button>
      </n-space>
    </div>

    <n-alert v-if="config" type="default" :show-icon="false" class="status-alert">
      当前状态：{{ businessAttributionStatusLabels[config.status] }} · 权限：{{ config.permissionSummary.currentUserRole }}
    </n-alert>

    <n-grid v-if="config" :cols="24" :x-gap="16">
      <n-gi :span="6">
        <n-card :bordered="false" class="steps-card">
          <n-steps v-model:current="activeStep" vertical>
            <n-step v-for="(step, index) in stepItems" :key="step" :title="step" :status="activeStep === index + 1 ? 'process' : 'wait'" />
          </n-steps>
        </n-card>
      </n-gi>

      <n-gi :span="18">
        <n-card :bordered="false">
          <section v-show="activeStep === 1">
            <h2>选择归因类型</h2>
            <n-alert v-if="config.reportTypeLocked" type="warning" :show-icon="false" class="section-note">
              当前配置已保存，归因类型已锁定。如需切换类型，请复制配置后重新选择。
            </n-alert>
            <n-grid :cols="2" :x-gap="12" :y-gap="12">
              <n-gi v-for="item in reportTypeOptions" :key="item.value">
                <n-card
                  class="type-card"
                  :class="{ active: config.reportType === item.value }"
                  :bordered="true"
                  @click="setReportType(item.value as AttributionReportType)"
                >
                  <n-space align="center" justify="space-between">
                    <strong>{{ item.label }}</strong>
                    <n-radio :checked="config.reportType === item.value" :disabled="!canSwitchType" />
                  </n-space>
                  <p>{{ item.description }}</p>
                </n-card>
              </n-gi>
            </n-grid>
          </section>

          <section v-show="activeStep === 2">
            <h2>配置核心指标</h2>
            <n-form label-placement="top">
              <n-grid :cols="2" :x-gap="16">
                <n-gi>
                  <n-form-item label="数据集">
                    <n-select v-model:value="config.coreMetric.datasetId" :options="datasetOptions" @update:value="updateDataset" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="指标">
                    <n-select v-model:value="config.coreMetric.metricId" :options="metricOptions" @update:value="updateMetric" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="指标表达式">
                    <n-input v-model:value="config.coreMetric.metricExpression" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="聚合方式">
                    <n-select v-model:value="config.coreMetric.aggregate" :options="aggregateOptions" :disabled="config.coreMetric.aggregateLocked" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="目标方向">
                    <n-radio-group v-model:value="config.coreMetric.goalDirection">
                      <n-space>
                        <n-radio value="HIGHER_IS_BETTER">越高越好</n-radio>
                        <n-radio value="LOWER_IS_BETTER">越低越好</n-radio>
                      </n-space>
                    </n-radio-group>
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="展示格式">
                    <n-radio-group v-model:value="config.coreMetric.displayFormat.type">
                      <n-space>
                        <n-radio value="AUTO">自动</n-radio>
                        <n-radio value="NUMBER">数值</n-radio>
                        <n-radio value="PERCENT">百分比</n-radio>
                        <n-radio value="PER_MILLE">千分比</n-radio>
                        <n-radio value="RAW">原始值</n-radio>
                        <n-radio value="PP">百分点</n-radio>
                        <n-radio value="CUSTOM">自定义</n-radio>
                      </n-space>
                    </n-radio-group>
                  </n-form-item>
                </n-gi>
                <n-gi v-if="['NUMBER', 'PERCENT', 'PER_MILLE', 'PP'].includes(config.coreMetric.displayFormat.type)">
                  <n-form-item label="小数位数">
                    <n-input-number :value="displayDecimalPlaces()" :min="0" :max="6" @update:value="updateDisplayDecimalPlaces" />
                  </n-form-item>
                </n-gi>
                <n-gi v-if="config.coreMetric.displayFormat.type === 'NUMBER'">
                  <n-form-item label="千分位">
                    <n-switch :value="config.coreMetric.displayFormat.useThousandsSeparator" @update:value="updateThousandsSeparator" />
                  </n-form-item>
                </n-gi>
                <n-gi v-if="config.coreMetric.displayFormat.type === 'CUSTOM'">
                  <n-form-item label="自定义规则">
                    <n-input
                      :value="config.coreMetric.displayFormat.rules?.map((rule) => `${rule.condition} => ${rule.format}`).join('; ')"
                      placeholder="例如 >10000 => 万元"
                      @update:value="(value) => updateCustomFormat(String(value))"
                    />
                  </n-form-item>
                </n-gi>
              </n-grid>
              <n-checkbox v-model:checked="config.coreMetric.enableDailyAverage">开启日均值展示</n-checkbox>
            </n-form>
          </section>

          <section v-show="activeStep === 3">
            <h2>业务日期与对比计算</h2>
            <n-form label-placement="top">
              <n-grid :cols="2" :x-gap="16">
                <n-gi>
                  <n-form-item label="业务日期字段">
                    <n-select v-model:value="config.businessDate.dateField" :options="dateFieldOptions" @update:value="updateBusinessDate" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="运行粒度">
                    <n-select v-model:value="config.businessDate.granularity" :options="granularityOptions" @update:value="updateBusinessDate" />
                  </n-form-item>
                </n-gi>
                <n-gi v-if="['WEEK', 'BIWEEK'].includes(config.businessDate.granularity)">
                  <n-form-item label="周期开始日">
                    <n-select v-model:value="config.businessDate.weekStartDay" :options="weekdayOptions" @update:value="updateBusinessDate" />
                  </n-form-item>
                </n-gi>
                <n-gi v-if="['WEEK', 'BIWEEK'].includes(config.businessDate.granularity)">
                  <n-form-item label="周期结束日">
                    <n-select v-model:value="config.businessDate.weekEndDay" :options="weekdayOptions" @update:value="updateBusinessDate" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="报告运行日">
                    <n-select
                      v-model:value="config.businessDate.reportRunDay!.type"
                      :options="[
                        { label: '自动今日', value: 'AUTO_TODAY' },
                        { label: '指定周几', value: 'WEEKDAY' },
                        { label: '每月几号', value: 'MONTH_DAY' },
                      ]"
                    />
                  </n-form-item>
                </n-gi>
                <n-gi v-if="config.businessDate.reportRunDay?.type !== 'AUTO_TODAY'">
                  <n-form-item label="运行日值">
                    <n-input-number v-model:value="config.businessDate.reportRunDay!.value" :min="1" :max="31" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="基准期">
                    <n-input :value="`${config.compareConfig.basePeriod.start} ~ ${config.compareConfig.basePeriod.end}`" readonly />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="观察期">
                    <n-input :value="`${config.compareConfig.comparePeriod.start} ~ ${config.compareConfig.comparePeriod.end}`" readonly />
                  </n-form-item>
                </n-gi>
              </n-grid>
            </n-form>
            <n-alert type="info" :show-icon="false">
              例行报告的基准期和观察期由业务日期规则自动推导；自定义运算可在报告页手动选择。
            </n-alert>
          </section>

          <section v-show="activeStep === 4">
            <h2>设置筛选条件</h2>
            <n-alert :type="hasPartitionFilter ? 'success' : 'error'" :show-icon="false" class="section-note">
              {{ hasPartitionFilter ? '已配置 p_date 分区日期范围。' : '必须指定分区日期 p_date 的查询范围，否则无法进行归因运算。' }}
            </n-alert>
            <div v-for="(group, groupIndex) in config.filterConfig?.andGroups" :key="group.id" class="filter-group">
              <n-space justify="space-between" align="center">
                <strong>AND 条件组 {{ groupIndex + 1 }}</strong>
                <n-button size="small" secondary @click="addOrCondition(groupIndex)">添加 OR 条件</n-button>
              </n-space>
              <div v-for="(condition, conditionIndex) in group.conditions" :key="`${group.id}_${conditionIndex}`" class="filter-row">
                <n-select :value="condition.fieldName" :options="fieldOptions" @update:value="(value) => updateFilterField(condition, String(value))" />
                <n-select v-model:value="condition.operator" :options="filterOperatorOptions" />
                <n-input v-model:value="condition.value as string" placeholder="值，多个值用逗号分隔" />
                <n-button tertiary type="error" @click="removeCondition(groupIndex, conditionIndex)">删除</n-button>
              </div>
            </div>
            <n-button dashed block @click="addAndGroup">添加 AND 条件组</n-button>
          </section>

          <section v-show="activeStep === 5">
            <h2>配置归因专项参数</h2>
            <template v-if="config.reportType === 'ANOMALY' && config.anomalyConfig">
              <n-radio-group v-model:value="config.anomalyConfig.detectionMode">
                <n-space>
                  <n-radio value="ALGORITHM">算法模式</n-radio>
                  <n-radio value="RULE">规则模式</n-radio>
                </n-space>
              </n-radio-group>
              <n-grid v-if="config.anomalyConfig.detectionMode === 'ALGORITHM' && config.anomalyConfig.algorithmConfig" :cols="2" :x-gap="16" class="block-grid">
                <n-gi>
                  <n-form-item label="算法">
                    <n-select v-model:value="config.anomalyConfig.algorithmConfig.algorithm" :options="[{ label: 'Holt-Winters', value: 'HOLT_WINTERS' }, { label: 'Prophet', value: 'PROPHET' }]" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="敏感度">
                    <n-slider v-model:value="config.anomalyConfig.algorithmConfig.sensitivity" :min="1" :max="100" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="观察窗口">
                    <n-input-number v-model:value="config.anomalyConfig.algorithmConfig.observationWindow" :min="7" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="平滑窗口">
                    <n-input-number v-model:value="config.anomalyConfig.algorithmConfig.smoothingWindow" :min="1" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-checkbox v-model:checked="config.anomalyConfig.algorithmConfig.ignoreSmallShareMetric!.enabled">
                    忽略占比低于 2% 的小流量异常项
                  </n-checkbox>
                </n-gi>
                <n-gi v-if="config.anomalyConfig.algorithmConfig.ignoreSmallShareMetric!.enabled">
                  <n-form-item label="占比指标">
                    <n-select v-model:value="config.anomalyConfig.algorithmConfig.ignoreSmallShareMetric!.metricId" :options="metricOptions" />
                  </n-form-item>
                </n-gi>
                <n-gi v-if="config.anomalyConfig.algorithmConfig.ignoreSmallShareMetric!.enabled">
                  <n-form-item label="忽略阈值">
                    <n-input-number v-model:value="config.anomalyConfig.algorithmConfig.ignoreSmallShareMetric!.threshold" :min="0.02" :step="0.01" />
                  </n-form-item>
                </n-gi>
              </n-grid>
              <n-grid v-if="config.anomalyConfig.detectionMode === 'RULE'" :cols="3" :x-gap="16" class="block-grid">
                <n-gi>
                  <n-form-item label="对比对象">
                    <n-select v-model:value="config.anomalyConfig.ruleConfig!.compareTarget" :options="[{ label: '上个周期', value: 'LAST_PERIOD' }, { label: '上周同日', value: 'LAST_WEEK_SAME_DAY' }]" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="上阈值">
                    <n-input-number v-model:value="config.anomalyConfig.ruleConfig!.upperThresholdPercent" :min="0" :step="0.01" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="下阈值">
                    <n-input-number v-model:value="config.anomalyConfig.ruleConfig!.lowerThresholdPercent" :min="0" :step="0.01" />
                  </n-form-item>
                </n-gi>
              </n-grid>
              <n-divider />
              <n-space justify="space-between">
                <strong>维度拆解路径</strong>
                <n-button size="small" secondary @click="addDimensionDrilldown">+ 维度拆解</n-button>
              </n-space>
              <div v-for="(path, index) in config.anomalyConfig.dimensionDrilldowns" :key="path.id" class="inline-card">
                <n-input v-model:value="path.name" placeholder="路径名称" />
                <n-select
                  multiple
                  :value="path.dimensions.map((dimension) => dimension.fieldId)"
                  :options="dimensionOptions"
                  @update:value="(value) => updateDrilldownDimensions(index, value as string[])"
                />
                <n-alert v-if="path.dimensions.length > 5" type="warning" :show-icon="false" class="inline-card-span">
                  每条路径最多建议 5 个维度，过多会影响运算性能。
                </n-alert>
              </div>
              <n-space justify="space-between">
                <strong>指标拆解公式</strong>
                <n-button size="small" secondary @click="addMetricDisassembly">+ 指标拆解</n-button>
              </n-space>
              <div v-for="formula in config.anomalyConfig.metricDisassemblies" :key="formula.id" class="inline-card">
                <n-input v-model:value="formula.formulaName" placeholder="公式名称" />
                <n-input v-model:value="formula.expression" placeholder="表达式" />
              </div>
            </template>

            <template v-if="config.reportType === 'DIMENSION_ATTRIBUTION' && config.dimensionAttributionConfig">
              <n-space justify="space-between">
                <div>
                  <strong>归因视角</strong>
                  <p class="muted">系统已根据指标公式推断算法，高级用户可在允许范围内切换。</p>
                </div>
                <n-button size="small" secondary @click="addDimensionView">添加视角</n-button>
              </n-space>
              <div v-for="view in config.dimensionAttributionConfig.attributionViews" :key="view.id" class="config-block">
                <n-grid :cols="4" :x-gap="12">
                  <n-gi>
                    <n-input v-model:value="view.name" placeholder="视角名称" />
                  </n-gi>
                  <n-gi>
                    <n-select v-model:value="view.viewType" :options="viewTypeOptions" />
                  </n-gi>
                  <n-gi>
                    <n-select v-model:value="view.algorithm" :options="algorithmOptions" />
                  </n-gi>
                  <n-gi>
                    <n-input-number v-model:value="view.topN" :min="1" :max="100" />
                  </n-gi>
                </n-grid>
                <n-select
                  class="block-control"
                  multiple
                  :value="view.dimensions.map((dimension) => dimension.fieldId)"
                  :options="dimensionOptions"
                  @update:value="(value) => updateDimensionViewDimensions(view, value as string[])"
                />
              </div>
              <n-space class="block-grid">
                <n-checkbox v-model:checked="config.dimensionAttributionConfig.showCoreMetricAnomaly">报告头部展示核心指标异动</n-checkbox>
                <n-checkbox v-model:checked="config.dimensionAttributionConfig.calculateCoreMetricImpact">计算对核心指标的影响</n-checkbox>
              </n-space>
            </template>

            <template v-if="config.reportType === 'METRIC_ATTRIBUTION' && config.metricAttributionConfig">
              <n-space justify="space-between">
                <strong>指标归因公式</strong>
                <n-button size="small" secondary @click="addMetricFormula">添加公式</n-button>
              </n-space>
              <div v-for="formula in config.metricAttributionConfig.formulas" :key="formula.id" class="config-block">
                <n-grid :cols="3" :x-gap="12">
                  <n-gi>
                    <n-input v-model:value="formula.name" placeholder="公式名称" />
                  </n-gi>
                  <n-gi>
                    <n-select :value="formula.attributionMode" :options="formulaModeOptions" @update:value="(value) => updateFormulaMode(formula, value as MetricAttributionFormula['attributionMode'])" />
                  </n-gi>
                  <n-gi>
                    <n-select v-model:value="formula.factorDisplayOrder" :options="factorOrderOptions" />
                  </n-gi>
                </n-grid>
                <n-input
                  v-if="formula.attributionMode === 'COMPOSITE_FORMULA'"
                  v-model:value="formula.compositeFormulaConfig!.expression"
                  class="block-control"
                  placeholder="复合公式，支持 + - * / ( )"
                />
                <div class="factor-list">
                  <n-tag
                    v-for="factor in [...(formula.multiplicativeConfig?.factors ?? []), ...(formula.compositeFormulaConfig?.factors ?? []), ...(formula.correlationConfig?.processMetrics ?? [])]"
                    :key="factor.id"
                    bordered
                  >
                    {{ factor.metricName }}
                  </n-tag>
                  <n-button size="small" secondary @click="addFactor(formula)">添加因子</n-button>
                </div>
              </div>
              <n-checkbox v-model:checked="config.metricAttributionConfig.showCoreMetricAnomaly">报告头部展示核心指标异动</n-checkbox>
            </template>

            <template v-if="config.reportType === 'ANALYSIS_TREE' && config.analysisTreeConfig">
              <n-space justify="space-between" align="center">
                <div>
                  <strong>{{ config.analysisTreeConfig.name }}</strong>
                  <p class="muted">连接节点时禁止形成循环依赖；维度拆解组节点通过 params.query 分批请求明细。</p>
                </div>
                <n-space>
                  <n-button size="small" secondary @click="addTreeNode">添加文本节点</n-button>
                  <n-button size="small" secondary @click="addTreeEdge">连接最近两个节点</n-button>
                </n-space>
              </n-space>
              <n-data-table :columns="treeNodeColumns" :data="config.analysisTreeConfig.nodes" class="block-grid" />
              <div class="edge-list">
                <n-tag v-for="edge in config.analysisTreeConfig.edges" :key="`${edge.fromNodeId}-${edge.toNodeId}`" closable @close="removeTreeEdge(edge)">
                  {{ edge.fromNodeId }} → {{ edge.toNodeId }}
                </n-tag>
              </div>
            </template>
          </section>

          <section v-show="activeStep === 6">
            <h2>配置分组维度</h2>
            <n-alert v-if="(config.groupDimensions?.length ?? 0) > 1" type="warning" :show-icon="false" class="section-note">
              多个分组维度之间为 OR 关系，通常建议只添加 1 个。
            </n-alert>
            <n-space vertical>
              <div v-for="(dimension, index) in config.groupDimensions" :key="`${dimension.fieldId}_${index}`" class="group-row">
                <n-select :value="dimension.fieldId" :options="dimensionOptions" @update:value="(value) => updateGroupDimension(index, String(value))" />
                <n-button tertiary type="error" @click="config.groupDimensions?.splice(index, 1)">删除</n-button>
              </div>
              <n-button dashed @click="addGroupDimension">添加分组维度</n-button>
            </n-space>
            <n-divider />
            <n-alert type="info" :show-icon="false">
              分组维度类似公共筛选器，报告顶部平铺展示。All 表示不分组的大盘结果，分组维度不改变归因视角内的维度配置。
            </n-alert>
          </section>

          <section v-show="activeStep === 7">
            <h2>配置核心指标异动</h2>
            <template v-if="config.reportType === 'DIMENSION_ATTRIBUTION' && config.dimensionAttributionConfig">
              <n-checkbox v-model:checked="config.dimensionAttributionConfig.showCoreMetricAnomaly">报告头部展示核心指标异动</n-checkbox>
              <n-alert v-if="config.dimensionAttributionConfig.showCoreMetricAnomaly" type="info" :show-icon="false" class="section-note">
                启用后报告头部展示本期值、基准差值、差异百分比、异动结论和预测趋势图，检测配置沿用异动分析规则。
              </n-alert>
            </template>
            <template v-else-if="config.reportType === 'METRIC_ATTRIBUTION' && config.metricAttributionConfig">
              <n-checkbox v-model:checked="config.metricAttributionConfig.showCoreMetricAnomaly">报告头部展示核心指标异动</n-checkbox>
              <n-alert v-if="config.metricAttributionConfig.showCoreMetricAnomaly" type="info" :show-icon="false" class="section-note">
                启用后报告头部展示本期值、基准差值、差异百分比、异动结论和预测趋势图，检测配置沿用异动分析规则。
              </n-alert>
            </template>
            <n-empty v-else description="异动分析和分析树无需额外开启核心指标异动展示。" />
          </section>

          <section v-show="activeStep === 8">
            <h2>创建网页 Tab</h2>
            <n-space justify="space-between" class="section-note">
              <n-text>报告中可切换查看相关仪表盘或外部页面，历史报告不受后续删除影响。</n-text>
              <n-button size="small" secondary @click="openWebTabModal">添加网页</n-button>
            </n-space>
            <div v-for="tab in config.webTabs" :key="tab.id" class="web-tab-row">
              <n-input v-model:value="tab.title" placeholder="网页标题" />
              <n-input v-model:value="tab.url" placeholder="https://..." :status="validateWebTabUrl(tab.url) ? undefined : 'error'" />
              <n-button secondary @click="copyWebTab(tab)">复制</n-button>
              <n-button tertiary type="error" @click="config.webTabs = config.webTabs?.filter((item) => item.id !== tab.id)">删除</n-button>
            </div>
          </section>

          <section v-show="activeStep === 9">
            <h2>保存并试运算</h2>
            <n-alert v-if="trialResult" :type="trialResult.state === 'SUCCESS' ? 'success' : 'error'" :show-icon="false" class="section-note">
              {{ trialResult.message }}
              <template v-if="trialResult.warnings.length">；{{ trialResult.warnings.join('；') }}</template>
            </n-alert>
            <n-grid :cols="3" :x-gap="16">
              <n-gi>
                <n-card embedded>
                  <div class="check-title">p_date 筛选</div>
                  <n-tag :type="hasPartitionFilter ? 'success' : 'error'">{{ hasPartitionFilter ? '已配置' : '缺失' }}</n-tag>
                </n-card>
              </n-gi>
              <n-gi>
                <n-card embedded>
                  <div class="check-title">归因类型</div>
                  <n-tag :type="config.reportType ? 'success' : 'error'">{{ config.reportType ? businessAttributionReportTypeLabels[config.reportType] : '未选择' }}</n-tag>
                </n-card>
              </n-gi>
              <n-gi>
                <n-card embedded>
                  <div class="check-title">类型锁定</div>
                  <n-tag :type="config.reportTypeLocked ? 'warning' : 'default'">{{ config.reportTypeLocked ? '已锁定' : '保存后锁定' }}</n-tag>
                </n-card>
              </n-gi>
            </n-grid>
            <n-space class="save-actions">
              <n-button type="primary" size="large" :loading="saving" :disabled="saveDisabled" @click="saveConfig">保存并触发试运算</n-button>
              <n-button size="large" secondary :disabled="!config.reportType" @click="openReport">查看最近报告</n-button>
            </n-space>
          </section>
        </n-card>
      </n-gi>
    </n-grid>

    <n-modal v-model:show="webTabModalVisible" preset="card" title="添加网页 Tab" class="small-modal">
      <n-form label-placement="top">
        <n-form-item label="网页 URL">
          <n-input v-model:value="webTabDraft.url" placeholder="https://example.com/dashboard" :status="webTabDraft.url && !validateWebTabUrl(webTabDraft.url) ? 'error' : undefined" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="webTabModalVisible = false">取消</n-button>
          <n-button type="primary" :disabled="!validateWebTabUrl(webTabDraft.url)" @click="addWebTab">确定</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="permissionVisible" preset="card" title="归因配置授权" class="medium-modal">
      <n-alert type="info" :show-icon="false" class="section-note">
        创建者默认拥有管理权限；只有管理权限可以新增、修改或删除授权。分享给用户组后，组内成员会继承对应权限。
      </n-alert>
      <n-grid :cols="4" :x-gap="10" class="permission-form">
        <n-gi>
          <n-select v-model:value="permissionDraft.granteeType" :options="granteeTypeOptions" />
        </n-gi>
        <n-gi>
          <n-input v-model:value="permissionDraft.granteeName" placeholder="用户或用户组名称" />
        </n-gi>
        <n-gi>
          <n-select v-model:value="permissionDraft.role" :options="permissionRoleOptions" />
        </n-gi>
        <n-gi>
          <n-button type="primary" block @click="savePermission">添加授权</n-button>
        </n-gi>
      </n-grid>
      <n-data-table :columns="permissionColumns" :data="permissions" />
      <template #footer>
        <n-space justify="end">
          <n-button @click="permissionVisible = false">关闭</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<style scoped lang="scss">
.page-heading {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.status-alert,
.section-note {
  margin-bottom: 16px;
}

.steps-card {
  position: sticky;
  top: 76px;
}

section h2 {
  margin: 0 0 16px;
  font-size: 18px;
}

.type-card {
  min-height: 126px;
  cursor: pointer;

  &.active {
    border-color: #2563eb;
    background: #eff6ff;
  }

  p {
    margin: 10px 0 0;
    color: #667085;
    line-height: 1.5;
  }
}

.filter-group,
.config-block,
.inline-card {
  margin-bottom: 14px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.filter-row,
.web-tab-row,
.group-row {
  display: grid;
  grid-template-columns: 1.1fr 1fr 1.6fr auto;
  gap: 10px;
  margin-top: 10px;
}

.web-tab-row {
  grid-template-columns: 1fr 2fr auto auto;
  margin-bottom: 10px;
}

.group-row {
  grid-template-columns: 1fr auto;
  max-width: 460px;
}

.block-grid,
.block-control {
  margin-top: 14px;
}

.inline-card {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 10px;
}

.inline-card-span {
  grid-column: 1 / -1;
}

.muted {
  margin: 6px 0 0;
  color: #667085;
}

.factor-list,
.edge-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.check-title {
  margin-bottom: 10px;
  color: #667085;
}

.save-actions {
  margin-top: 20px;
}

.small-modal {
  width: 460px;
}

.medium-modal {
  width: 720px;
}

.permission-form {
  margin-bottom: 14px;
}
</style>
