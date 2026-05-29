<script setup lang="ts">
import '@/components/charts/chartRegister'
import {
  AddOutline,
  BarChartOutline,
  CloudDownloadOutline,
  CreateOutline,
  PlayOutline,
  SaveOutline,
  SearchOutline,
  SettingsOutline,
  Star,
  StarOutline,
} from '@vicons/ionicons5'
import type { EChartsOption } from 'echarts'
import {
  NAlert,
  NButton,
  NCard,
  NCheckbox,
  NCheckboxGroup,
  NDataTable,
  NDatePicker,
  NDropdown,
  NEmpty,
  NForm,
  NFormItem,
  NGi,
  NGrid,
  NIcon,
  NInput,
  NModal,
  NPagination,
  NPopconfirm,
  NRadio,
  NRadioButton,
  NRadioGroup,
  NSelect,
  NSpace,
  NSpin,
  NStatistic,
  NSwitch,
  NTabPane,
  NTabs,
  NTag,
  NTooltip,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, DropdownOption, SelectOption, TagProps } from 'naive-ui'
import VChart from 'vue-echarts'
import { computed, h, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  groupProfileInsightService,
  groupProfileReportTypeLabels,
  groupProfileSortModeLabels,
  groupProfileStatusLabels,
  groupProfileUpdateModeLabels,
} from '@/services/groupProfileInsightService'
import type { EntityId } from '@/types/common'
import type {
  GroupProfileChart,
  GroupProfileChartGroup,
  GroupProfileChartType,
  GroupProfileCondition,
  GroupProfileDownloadFormat,
  GroupProfileAuditLog,
  GroupProfileLabelValueInsight,
  GroupProfileMetricChartConfig,
  GroupProfileMetricDimensionType,
  GroupProfileMetricDimensionOption,
  GroupProfileMetricPoint,
  GroupProfileMetricSourceType,
  GroupProfilePermissionLevel,
  GroupProfilePrincipalType,
  GroupProfileQueryTask,
  GroupProfileQueryTaskChartResult,
  GroupProfileRatioMode,
  GroupProfileResourceType,
  GroupProfileReport,
  GroupProfileReportPermission,
  GroupProfileReportSearchFilters,
  GroupProfileReportType,
  GroupProfileSaveSegmentMode,
  GroupProfileScheduleTask,
  GroupProfileSegmentOption,
  GroupProfileSortMode,
  GroupProfileTaskStatus,
  GroupProfileTemplate,
  GroupProfileTemplateScope,
  GroupProfileTemplateType,
  GroupProfileTgiCalculationType,
  GroupProfileTgiBaseType,
  GroupProfileTgiConfig,
  GroupProfileUpdateMode,
  GroupProfileWorkbenchData,
} from '@/types/groupProfileInsight'
import type { ProfileSubjectType } from '@/types/profile'

type PageMode = 'list' | 'new' | 'detail' | 'edit' | 'templates' | 'tgi'
type ChartClickEvent = { name?: string }
type ChartGroupDraft = { id: EntityId; name: string; chartIds: EntityId[] }
type FormulaValidationResult = { ok: boolean; message?: string }
type SegmentOverviewRow = { id: EntityId; role: string; segmentName: string; estimatedCount: number; share: number; topFeature: string }
type MultiSegmentOverviewRow = { id: EntityId; labelName: string; targetValue: string; targetRatio: number; compareLift: number; conclusion: string }
type LabelDetailRow = { id: EntityId; chartTitle: string; tagName: string; tagValue: string; uv: number; ratio: number; effectiveRatio: number; tgi: number; updatedAt: string }
type CrossAnalysisRow = { id: EntityId; rowLabel: string; columnLabel: string; uv: number; ratio: number; tgi: number }
type CustomRuleConditionDraft = {
  id: EntityId
  source: GroupProfileCondition['source']
  field: EntityId
  operator: string
  value: string
  relation: 'include' | 'exclude'
}

const route = useRoute()
const router = useRouter()
const message = useMessage()

const loading = ref(false)
const tableLoading = ref(false)
const actionLoading = ref(false)
const workbench = ref<GroupProfileWorkbenchData>()
const reportRows = ref<GroupProfileReport[]>([])
const reportTotal = ref(0)
const currentReport = ref<GroupProfileReport>()
const reportDraft = ref<GroupProfileReport>()
const currentQueryTask = ref<GroupProfileQueryTask>()
const reportQueryTasks = ref<GroupProfileQueryTask[]>([])
const reportScheduleTasks = ref<GroupProfileScheduleTask[]>([])
const activeDetailTab = ref<'interpretation' | 'label' | 'metric'>('interpretation')
const selectedChartId = ref<EntityId>('')
const expandedChart = ref<GroupProfileChart>()
const metricConfigChartId = ref<EntityId>('')
const selectedTemplateId = ref<EntityId>('')

const filters = ref<GroupProfileReportSearchFilters>({
  keyword: '',
  groupIds: [],
  subjectTypes: [],
  reportTypes: [],
  creatorIds: [],
  updateModes: [],
  favoriteState: 'all',
  createdRange: null,
  updatedRange: null,
  page: 1,
  pageSize: 10,
})

const subjectModalVisible = ref(false)
const selectedCreateSubject = ref<ProfileSubjectType>('user')
const segmentSelectVisible = ref(false)
const segmentSelectRole = ref<'target' | 'compare'>('target')
const segmentKeyword = ref('')
const segmentSubjectFilter = ref<ProfileSubjectType | 'all'>('all')
const segmentGroupFilter = ref<EntityId | 'all'>('all')
const segmentStatusFilter = ref<'all' | GroupProfileSegmentOption['status']>('all')
const selectedSegmentId = ref<EntityId>('')
const labelSelectVisible = ref(false)
const labelKeyword = ref('')
const labelGroupFilter = ref<string>('all')
const selectedLabelIds = ref<EntityId[]>([])
const customRuleVisible = ref(false)
const customRuleRole = ref<'target' | 'compare'>('target')
const customRuleDraft = ref({
  name: '自定义圈选目标人群',
  outputIdType: 'OneID',
  satisfyLogic: 'all' as 'all' | 'any',
  excludeLogic: 'any' as 'all' | 'any',
  satisfyConditions: [] as CustomRuleConditionDraft[],
  excludeConditions: [] as CustomRuleConditionDraft[],
})
const permissionModalVisible = ref(false)
const permissionDraft = ref<GroupProfileReportPermission[]>([])
const permissionPrincipalName = ref('广告运营用户组')
const permissionPrincipalType = ref<GroupProfilePrincipalType>('group')
const permissionLevel = ref<GroupProfilePermissionLevel>('view')
const scheduleModalVisible = ref(false)
const scheduleDraft = ref({ updateMode: 'manual' as GroupProfileUpdateMode, executeTime: '09:00', startDate: '2026-05-28', endDate: '', queuePolicy: 'queue' as 'queue' | 'skip' })
const downloadModalVisible = ref(false)
const downloadTarget = ref<GroupProfileReport>()
const downloadFormat = ref<GroupProfileDownloadFormat>('excel')
const includeAiSummary = ref(true)
const downloadMessage = ref('')
const copyModalVisible = ref(false)
const copyName = ref('')
const copyKeepDailySchedule = ref(false)
const copyTargetReport = ref<GroupProfileReport>()
const deleteTarget = ref<GroupProfileReport>()
const deleteChartTarget = ref<GroupProfileChart>()
const auditModalVisible = ref(false)
const auditRows = ref<GroupProfileAuditLog[]>([])
const auditSelectedLog = ref<GroupProfileAuditLog>()
const auditTargetReportId = ref<EntityId | 'all'>('all')
const descriptionModalVisible = ref(false)
const descriptionDraft = ref('')
const chartTitleModalVisible = ref(false)
const chartTitleDraft = ref('')
const chartTitleTargetId = ref<EntityId>('')
const saveSegmentModalVisible = ref(false)
const saveSegmentMode = ref<GroupProfileSaveSegmentMode>('selected_tags')
const saveSegmentName = ref('画像洞察沉淀分群')
const saveSegmentDescription = ref('')
const saveSegmentLogic = ref<'all' | 'any'>('all')
const saveSegmentOutputIdType = ref('OneID')
const saveSegmentGroupId = ref('report-group-ad')
const saveSegmentSelectedIds = ref<EntityId[]>([])
const saveSegmentSourceSegmentIds = ref<EntityId[]>([])
const templateModalVisible = ref(false)
const templateDraft = ref({
  id: '',
  name: '我的群体画像模板',
  description: '',
  templateType: 'label' as GroupProfileTemplateType,
  scope: 'personal' as GroupProfileTemplateScope,
})
const templatePermissionModalVisible = ref(false)
const templatePermissionTarget = ref<GroupProfileTemplate>()
const templatePermissionDraft = ref<GroupProfileReportPermission[]>([])
const groupModalVisible = ref(false)
const groupModeDraft = ref<'taxonomy' | 'custom'>('taxonomy')
const chartGroupDraft = ref<ChartGroupDraft[]>([])
const draggedChartId = ref<EntityId>('')
const draggedGroupId = ref<EntityId>('')
const valueDisplayModalVisible = ref(false)
const valueDisplayChartId = ref<EntityId>('')
const valueDisplayDraft = ref<string[]>([])
const linkageModalVisible = ref(false)
const linkageChartId = ref<EntityId>('')
const linkageSelectedTagIds = ref<EntityId[]>([])
const metricModalVisible = ref(false)
const metricDraft = ref({
  title: '新建指标图表',
  chartType: 'line' as GroupProfileMetricChartConfig['chartType'],
  xAxisType: 'time' as GroupProfileMetricDimensionType,
  xAxisField: 'event_date',
  yAxisSourceType: 'defined_metric' as GroupProfileMetricSourceType,
  yAxisMetricId: 'metric-ad-watch-pv',
  dateMode: 'dynamic' as 'single' | 'fixed' | 'dynamic',
  singleDate: '2026-05-27',
  startDate: '2026-05-21',
  endDate: '2026-05-27',
  dynamicValue: 'last_7_days' as 'last_7_days' | 'last_30_days' | 'this_week' | 'this_month' | 'last_month',
  newMetricName: '报告内新建指标',
  newMetricDescription: '报告内临时创建，仅随当前报告保存。',
  newMetricGroupName: '报告指标',
  newMetricType: 'single' as 'single' | 'formula',
  conditionSource: 'behavior' as 'behavior' | 'detail' | 'tag' | 'attribute',
  conditionResourceId: 'behavior-ad-watch',
  displayFormat: 'integer' as GroupProfileMetricChartConfig['displayFormat'],
  idType: 'OneID',
  formula: '广告完成次数 / 广告开始次数',
})
const tgiModalVisible = ref(false)
const tgiDraft = ref({
  id: '',
  name: '自定义 TGI',
  subjectType: 'user' as ProfileSubjectType,
  calculationType: 'label_ratio' as GroupProfileTgiCalculationType,
  baseType: 'segment' as GroupProfileTgiBaseType,
  baseSegmentId: 'segment-high-value-active',
  baseTagId: 'tag-city-tier',
  scope: 'project' as 'project' | 'report' | 'template',
  scopeTargetName: '全项目',
})

const currentPage = computed<PageMode>(() => String(route.meta.groupProfilePage ?? 'list') as PageMode)
const permissions = computed(() => workbench.value?.permissions)
const featureFlags = computed(() => workbench.value?.featureFlags)
const groups = computed(() => workbench.value?.groups ?? [])
const subjects = computed(() => workbench.value?.subjects ?? [])
const labels = computed(() => workbench.value?.labels ?? [])
const resourcePermissions = computed(() => workbench.value?.resourcePermissions ?? [])
const metricDimensionOptions = computed(() => workbench.value?.metricDimensionOptions ?? [])
const metricDefinitions = computed(() => workbench.value?.metricDefinitions ?? [])
const templates = computed(() => workbench.value?.templates ?? [])
const tgiConfigs = computed(() => workbench.value?.tgiConfigs ?? [])
const segmentOptions = computed(() => workbench.value?.segmentOptions ?? [])
const editable = computed(() => currentPage.value === 'new' || currentPage.value === 'edit')
const activeReport = computed(() => (editable.value ? reportDraft.value : currentReport.value))
const hasMetricAbility = computed(() => Boolean(featureFlags.value?.metricAnalysisPurchased && permissions.value?.metricAnalysis))
const selectedChart = computed(() => activeReport.value?.charts.find((chart) => chart.id === selectedChartId.value))
const selectedChartValues = computed(() => (selectedChart.value ? sortedLabelValues(selectedChart.value) : []))
const linkedChartIds = computed(() => new Set(activeReport.value?.charts.flatMap((chart) => chart.linkageConfig.linkedChartIds) ?? []))
const latestQueryTask = computed(() => currentQueryTask.value ?? reportQueryTasks.value[0])
const latestScheduleTask = computed(() => reportScheduleTasks.value[0])
const dataPermissionNote = computed(() => {
  const report = activeReport.value
  if (!featureFlags.value?.dataPermissionEnabled || !report?.dataPermissionSnapshot) return ''
  return `报告结果按创建人「${report.dataPermissionSnapshot.ownerName}」的数据权限计算；存为分群、联动、下钻等二次操作会按当前用户资源权限重新校验。`
})

const subjectOptions = computed<SelectOption[]>(() => subjects.value.map((subject) => ({ label: `${subject.name} - ${subject.description}`, value: subject.type })))
const groupOptions = computed<SelectOption[]>(() => groups.value.map((group) => ({ label: group.name, value: group.id })))
const segmentSubjectOptions = computed<SelectOption[]>(() => [{ label: '全部主体', value: 'all' }, ...subjects.value.map((subject) => ({ label: subject.name, value: subject.type }))])
const segmentGroupOptions = computed<SelectOption[]>(() => [{ label: '全部分组', value: 'all' }, ...groups.value.map((group) => ({ label: group.name, value: group.id }))])
const segmentStatusOptions: SelectOption[] = [
  { label: '全部状态', value: 'all' },
  { label: '可用', value: 'available' },
  { label: '空结果', value: 'empty' },
  { label: '已失效', value: 'invalid' },
]
const creatorOptions = computed<SelectOption[]>(() => {
  const creators = new Map<EntityId, string>()
  workbench.value?.reports.forEach((report) => creators.set(report.creator.id, report.creator.name))
  return [...creators.entries()].map(([value, label]) => ({ label, value }))
})
const reportTypeOptions: SelectOption[] = [
  { label: '标签分析', value: 'label' },
  { label: '指标分析', value: 'metric' },
  { label: '混合报告', value: 'mixed' },
]
const updateModeOptions: SelectOption[] = [
  { label: '手动更新', value: 'manual' },
  { label: '按天更新', value: 'daily' },
]
const sortOptions: SelectOption[] = Object.entries(groupProfileSortModeLabels).map(([value, label]) => ({ label, value }))
const labelGroupOptions = computed<SelectOption[]>(() => [
  { label: '全部标签组', value: 'all' },
  ...[...new Set(labels.value.map((label) => label.groupName))].map((groupName) => ({ label: groupName, value: groupName })),
])
const metricDimensionFieldOptions = computed<SelectOption[]>(() =>
  metricDimensionOptions.value
    .filter((option) => option.dimensionType === metricDraft.value.xAxisType)
    .map((option) => ({
      label: `${option.groupName} / ${option.name}${option.permission ? '' : '（无权限）'}`,
      value: option.field,
      disabled: !option.permission,
    })),
)
const selectedMetricDimensionOption = computed<GroupProfileMetricDimensionOption | undefined>(() =>
  metricDimensionOptions.value.find((option) => option.dimensionType === metricDraft.value.xAxisType && option.field === metricDraft.value.xAxisField),
)
const metricConditionResourceOptions = computed<SelectOption[]>(() => {
  const resourceType = metricDraft.value.conditionSource as GroupProfileResourceType
  return resourcePermissions.value
    .filter((resource) => resource.resourceType === resourceType)
    .map((resource) => ({
      label: `${resource.groupName} / ${resource.resourceName}${resource.permission ? '' : '（无权限）'}`,
      value: resource.resourceId,
      disabled: !resource.permission,
    }))
})
const metricTagOptions = computed<SelectOption[]>(() =>
  labels.value.map((label) => ({
    label: `${label.groupName} / ${label.name}${label.permission ? '' : '（无权限）'}`,
    value: label.id,
    disabled: !label.permission,
  })),
)
const metricDisplayFormatOptions: SelectOption[] = [
  { label: '整数', value: 'integer' },
  { label: '小数', value: 'decimal' },
  { label: '百分比整数', value: 'percent_integer' },
  { label: '百分比小数', value: 'percent_decimal' },
]
const metricIdTypeOptions: SelectOption[] = [
  { label: 'OneID', value: 'OneID' },
  { label: '手机号 MD5', value: '手机号 MD5' },
  { label: '设备 ID', value: '设备 ID' },
]
const metricConditionSourceOptions: SelectOption[] = [
  { label: '行为', value: 'behavior' },
  { label: '明细', value: 'detail' },
  { label: '标签', value: 'tag' },
  { label: '属性', value: 'attribute' },
]
const chartTypeOptions: SelectOption[] = [
  { label: '柱状图', value: 'column' },
  { label: '条形图', value: 'bar' },
  { label: '饼状图', value: 'pie' },
  { label: '环状图', value: 'donut' },
  { label: '表格', value: 'table' },
]
const metricChartTypeOptions: SelectOption[] = [
  { label: '折线图', value: 'line' },
  { label: '柱状图', value: 'column' },
  { label: '卡片', value: 'card' },
  { label: '表格', value: 'table' },
]
const metricXAxisOptions: SelectOption[] = [
  { label: '时间', value: 'time' },
  { label: '标签', value: 'tag' },
  { label: '分群', value: 'segment' },
  { label: '属性', value: 'attribute' },
  { label: '明细属性', value: 'detail' },
  { label: '行为属性', value: 'behavior' },
]
const metricSourceOptions: SelectOption[] = [
  { label: '标签', value: 'tag' },
  { label: '已有指标', value: 'defined_metric' },
  { label: '新建指标', value: 'new_metric' },
]
const metricOptions = computed<SelectOption[]>(() => metricDefinitions.value.map((metric) => ({ label: `${metric.name} / ${metric.groupName}`, value: metric.id })))
const labelOptions = computed<SelectOption[]>(() => labels.value.filter((label) => label.permission).map((label) => ({ label: `${label.groupName} / ${label.name}`, value: label.id })))
const filteredLabels = computed(() => {
  const keyword = labelKeyword.value.trim().toLowerCase()
  return labels.value
    .filter((label) => label.permission)
    .filter((label) => labelGroupFilter.value === 'all' || label.groupName === labelGroupFilter.value)
    .filter((label) => !keyword || label.name.toLowerCase().includes(keyword) || label.groupName.toLowerCase().includes(keyword))
})
const filteredSegmentOptions = computed(() => {
  const keyword = segmentKeyword.value.trim().toLowerCase()
  return segmentOptions.value
    .filter((segment) => segmentSubjectFilter.value === 'all' || segment.subjectType === segmentSubjectFilter.value)
    .filter((segment) => segmentGroupFilter.value === 'all' || segment.groupId === segmentGroupFilter.value)
    .filter((segment) => segmentStatusFilter.value === 'all' || segment.status === segmentStatusFilter.value)
    .filter((segment) => segment.permission)
    .filter((segment) => segment.name.toLowerCase().includes(keyword) || segment.creator.name.toLowerCase().includes(keyword))
})
const targetSegments = computed(() => activeReport.value?.segments.filter((segment) => segment.role === 'target') ?? [])
const compareSegments = computed(() => activeReport.value?.segments.filter((segment) => segment.role === 'compare') ?? [])
const labelCharts = computed(() =>
  [...(activeReport.value?.charts.filter((chart) => chart.analysisType === 'label' && !linkedChartIds.value.has(chart.id)) ?? [])].sort((a, b) => a.orderIndex - b.orderIndex),
)
const metricCharts = computed(() => [...(activeReport.value?.charts.filter((chart) => chart.analysisType === 'metric') ?? [])].sort((a, b) => a.orderIndex - b.orderIndex))
const topFeatures = computed(() => (activeReport.value ? topFeaturesFor(activeReport.value) : []))
const segmentOverviewRows = computed<SegmentOverviewRow[]>(() => {
  const report = activeReport.value
  if (!report) return []
  const total = Math.max(1, report.segments.reduce((sum, segment) => sum + segment.estimatedCount, 0))
  return report.segments.map((segment, index) => ({
    id: segment.id,
    role: segment.role === 'target' ? '目标分群' : '对比分群',
    segmentName: segment.segmentName,
    estimatedCount: segment.estimatedCount,
    share: Number(((segment.estimatedCount / total) * 100).toFixed(2)),
    topFeature: topFeatures.value[index]?.tagName ? `${topFeatures.value[index]?.tagName}=${topFeatures.value[index]?.tagValue}` : '暂无显著标签',
  }))
})
const multiSegmentOverviewRows = computed<MultiSegmentOverviewRow[]>(() =>
  labelCharts.value.slice(0, 6).map((chart) => {
    const topValue = sortedLabelValues(chart)[0]
    const compareLift = topValue ? Number((valueTgi(topValue, chart) / 100).toFixed(2)) : 0
    return {
      id: chart.id,
      labelName: chart.labelConfig?.tagName ?? chart.title,
      targetValue: topValue?.value ?? '暂无',
      targetRatio: topValue ? valueRatio(topValue, chart) : 0,
      compareLift,
      conclusion: compareLift >= 1.2 ? '目标分群显著高于基准' : compareLift <= 0.8 ? '目标分群低于基准' : '与基准接近',
    }
  }),
)
const labelDetailRows = computed<LabelDetailRow[]>(() =>
  labelCharts.value
    .flatMap((chart) =>
      sortedLabelValues(chart).map((value) => ({
        id: value.id,
        chartTitle: chart.title,
        tagName: value.tagName,
        tagValue: value.value,
        uv: value.uv,
        ratio: valueRatio(value, chart),
        effectiveRatio: value.labelEffectiveRatio,
        tgi: valueTgi(value, chart),
        updatedAt: value.dataUpdatedAt,
      })),
    )
    .sort((a, b) => b.tgi - a.tgi)
    .slice(0, 40),
)
const crossAnalysisRows = computed<CrossAnalysisRow[]>(() => {
  const [firstChart, secondChart] = labelCharts.value
  if (!firstChart || !secondChart) return []
  const firstRows = sortedLabelValues(firstChart).slice(0, 4)
  const secondRows = sortedLabelValues(secondChart).slice(0, 4)
  return firstRows.flatMap((rowA, rowIndex) =>
    secondRows.map((rowB, columnIndex) => {
      const seed = makeStableSeed(`${rowA.value}:${rowB.value}:${rowIndex}:${columnIndex}`)
      const uv = Math.max(180, Math.round((rowA.uv * rowB.uv) / Math.max(1, rowA.segmentTotal) * (0.72 + (seed % 24) / 100)))
      const ratio = Number(((uv / Math.max(1, rowA.segmentTotal)) * 100).toFixed(2))
      const tgi = Math.max(60, Math.round(((valueTgi(rowA, firstChart) + valueTgi(rowB, secondChart)) / 2) * (0.82 + (seed % 18) / 100)))
      return {
        id: `${rowA.id}-${rowB.id}`,
        rowLabel: rowA.value,
        columnLabel: rowB.value,
        uv,
        ratio,
        tgi,
      }
    }),
  )
})
const crossAnalysisOption = computed<EChartsOption>(() => {
  const rowLabels = [...new Set(crossAnalysisRows.value.map((row) => row.rowLabel))]
  const columnLabels = [...new Set(crossAnalysisRows.value.map((row) => row.columnLabel))]
  return {
    tooltip: {
      position: 'top',
      formatter: (params: unknown) => {
        const item = params as { data?: [number, number, number, number, number] }
        const data = item.data
        return data ? `${rowLabels[data[1] ?? 0]} × ${columnLabels[data[0] ?? 0]}<br/>UV：${formatNumber(data[2] ?? 0)}<br/>占比：${data[3]}%<br/>TGI：${data[4]}` : ''
      },
    },
    grid: { top: 32, right: 24, bottom: 64, left: 88 },
    xAxis: { type: 'category', data: columnLabels, axisLabel: { interval: 0, rotate: 18 } },
    yAxis: { type: 'category', data: rowLabels },
    visualMap: { min: 60, max: 220, calculable: true, orient: 'horizontal', left: 'center', bottom: 0 },
    series: [
      {
        type: 'heatmap',
        data: crossAnalysisRows.value.map((row) => [columnLabels.indexOf(row.columnLabel), rowLabels.indexOf(row.rowLabel), row.uv, row.ratio, row.tgi]),
        label: { show: true, formatter: (params: unknown) => String(((params as { data?: number[] }).data?.[4] ?? '')) },
      },
    ],
  }
})
const tgiSegmentOptions = computed<SelectOption[]>(() =>
  segmentOptions.value
    .filter((segment) => segment.subjectType === tgiDraft.value.subjectType)
    .map((segment) => ({
      label: `${segment.name} / ${formatNumber(segment.count)} 人${segment.permission ? '' : '（无权限）'}`,
      value: segment.id,
      disabled: !segment.permission || segment.status === 'invalid',
    })),
)
const tgiTagOptions = computed<SelectOption[]>(() =>
  labels.value.map((label) => ({
    label: `${label.groupName} / ${label.name}${label.permission ? '' : '（无权限）'}`,
    value: label.id,
    disabled: !label.permission,
  })),
)
const tgiFormulaPreview = computed(() => {
  const baseName =
    tgiDraft.value.baseType === 'segment'
      ? segmentOptions.value.find((segment) => segment.id === tgiDraft.value.baseSegmentId)?.name
      : labels.value.find((label) => label.id === tgiDraft.value.baseTagId)?.name
  const numerator = tgiDraft.value.calculationType === 'label_ratio' ? '目标分群标签占比' : '目标分群标签有效占比'
  const denominator = tgiDraft.value.calculationType === 'label_ratio' ? '基准标签占比' : '基准标签有效占比'
  return `${numerator} / ${baseName ?? '所选基准'}${denominator} * 100`
})
const customRuleSourceOptions: SelectOption[] = [
  { label: '标签', value: 'tag' },
  { label: '行为', value: 'behavior' },
  { label: '属性', value: 'attribute' },
  { label: '明细', value: 'detail' },
  { label: '人群包', value: 'segment' },
]
const customRuleOperatorOptions: SelectOption[] = [
  { label: '等于', value: 'eq' },
  { label: '不等于', value: 'neq' },
  { label: '包含', value: 'in' },
  { label: '不包含', value: 'not_in' },
  { label: '大于', value: 'gt' },
  { label: '小于', value: 'lt' },
  { label: '近 N 天发生', value: 'occurred_recently' },
]
const copyCanKeepDailySchedule = computed(() => Boolean(permissions.value?.createDailyReport && copyTargetReport.value?.updateMode === 'daily'))
const auditActionLabels: Record<string, string> = {
  create_report: '创建报告',
  edit_report: '编辑报告',
  delete_report: '删除报告',
  download_report: '下载报告',
  copy_embed_link: '复制嵌出链接',
  grant_report: '授权报告',
  revoke_report: '撤销授权',
  save_segment: '存为分群',
  create_template: '模板操作',
  share_template: '共享模板',
  update_tgi: '更新 TGI',
  query_report: '查询报告',
  copy_report: '复制报告',
}
const auditColumns = computed<DataTableColumns<GroupProfileAuditLog>>(() => [
  { title: '时间', key: 'createdAt', width: 170, render: (row) => formatDateTime(row.createdAt) },
  { title: '操作', key: 'action', width: 120, render: (row) => auditActionLabels[row.action] ?? row.action },
  { title: '资源', key: 'resourceName', minWidth: 180, render: (row) => row.resourceName ?? row.resourceId ?? row.reportId ?? '-' },
  { title: '操作者', key: 'userName', width: 120 },
  { title: '请求 ID', key: 'requestId', width: 150 },
  {
    title: '详情',
    key: 'detail',
    width: 100,
    render: (row) => h(NButton, { size: 'small', onClick: () => (auditSelectedLog.value = row) }, { default: () => '查看 JSON' }),
  },
])
const scatterOption = computed<EChartsOption>(() => ({
  grid: { top: 28, right: 28, bottom: 42, left: 48 },
  tooltip: {
    trigger: 'item',
    formatter: (params: unknown) => {
      const item = params as { data?: [number, number, number, string, string] }
      const data = item.data
      return data ? `${data[3]} / ${data[4]}<br/>占比：${data[0]}%<br/>TGI：${data[1]}<br/>UV：${formatNumber(data[2])}` : ''
    },
  },
  xAxis: { type: 'value', name: '占比', axisLabel: { formatter: '{value}%' } },
  yAxis: { type: 'value', name: 'TGI' },
  series: [
    {
      type: 'scatter',
      symbolSize: (value: unknown) => {
        const data = value as number[]
        return Math.max(10, Math.min(36, Math.sqrt(data[2] ?? 0) / 4))
      },
      data: topFeatures.value.map((item) => [item.ratio, item.tgi, item.uv, item.tagName, item.tagValue]),
      markLine: { symbol: 'none', data: [{ yAxis: 100 }], lineStyle: { type: 'dashed', color: '#8b95a5' } },
    },
  ],
}))

const reportColumns = computed<DataTableColumns<GroupProfileReport>>(() => [
  {
    title: '报告名称',
    key: 'name',
    minWidth: 230,
    render: (row) =>
      h(
        NButton,
        { text: true, type: 'primary', onClick: () => void router.push(`/user-insight/group-profiles/${row.id}`) },
        { default: () => row.name },
      ),
  },
  { title: '分组', key: 'groupName', width: 120 },
  { title: '主体', key: 'subjectName', width: 90 },
  {
    title: '类型',
    key: 'reportType',
    width: 110,
    render: (row) => h(NTag, { size: 'small', type: reportTypeTag(row.reportType) }, { default: () => groupProfileReportTypeLabels[row.reportType] }),
  },
  { title: '创建人', key: 'creator', width: 110, render: (row) => row.creator.name },
  { title: '更新方式', key: 'updateMode', width: 110, render: (row) => groupProfileUpdateModeLabels[row.updateMode] },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) => h(NTag, { size: 'small', type: statusTag(row.status) }, { default: () => groupProfileStatusLabels[row.status] }),
  },
  { title: '最近更新时间', key: 'updatedAt', width: 170, render: (row) => formatDateTime(row.updatedAt) },
  {
    title: '收藏',
    key: 'favorite',
    width: 72,
    render: (row) =>
      h(
        NButton,
        { text: true, onClick: () => void toggleFavorite(row) },
        { icon: () => h(NIcon, null, { default: () => h(row.favorite ? Star : StarOutline) }) },
      ),
  },
  {
    title: '操作',
    key: 'actions',
    width: 220,
    fixed: 'right',
    render: (row) =>
      h(NSpace, { size: 6 }, () => [
        row.runtimePermission.canView
          ? h(NButton, { size: 'small', onClick: () => void router.push(`/user-insight/group-profiles/${row.id}`) }, { default: () => '查看' })
          : null,
        row.runtimePermission.canEdit
          ? h(NButton, { size: 'small', onClick: () => void router.push(`/user-insight/group-profiles/${row.id}/edit`) }, { default: () => '编辑' })
          : null,
        h(
          NDropdown,
          { options: rowActionOptions(row), onSelect: (key: string) => handleRowAction(key, row) },
          { default: () => h(NButton, { size: 'small' }, { default: () => '更多' }) },
        ),
      ]),
  },
])

const templateColumns = computed<DataTableColumns<GroupProfileTemplate>>(() => [
  { title: '模板名称', key: 'name', minWidth: 220 },
  { title: '模板类型', key: 'templateType', width: 120, render: (row) => (row.templateType === 'label' ? '标签分析模板' : '指标分析模板') },
  { title: '模板范围', key: 'scope', width: 110, render: (row) => templateScopeLabel(row.scope) },
  { title: '创建人', key: 'creator', width: 110, render: (row) => row.creator.name },
  { title: '更新时间', key: 'updatedAt', width: 170, render: (row) => formatDateTime(row.updatedAt) },
  {
    title: '操作',
    key: 'actions',
    width: 260,
    render: (row) =>
      h(NSpace, { size: 6 }, () => [
        h(NButton, { size: 'small', onClick: () => useTemplate(row) }, { default: () => '使用' }),
        row.runtimePermission.canEdit ? h(NButton, { size: 'small', onClick: () => openTemplateModal(row) }, { default: () => '编辑' }) : null,
        row.runtimePermission.canShare ? h(NButton, { size: 'small', onClick: () => openTemplatePermission(row) }, { default: () => '权限管理' }) : null,
        row.runtimePermission.canDelete
          ? h(NPopconfirm, { onPositiveClick: () => void deleteTemplate(row) }, { trigger: () => h(NButton, { size: 'small', type: 'error' }, { default: () => '删除' }), default: () => '删除模板不影响已创建报告，确认删除？' })
          : null,
      ]),
  },
])

const tgiColumns = computed<DataTableColumns<GroupProfileTgiConfig>>(() => [
  { title: 'TGI 名称', key: 'name', minWidth: 190 },
  { title: '主体', key: 'subjectName', width: 90 },
  { title: '计算方式', key: 'calculationType', width: 150, render: (row) => (row.calculationType === 'label_ratio' ? '标签占比' : '标签有效占比') },
  {
    title: '基准',
    key: 'baseSegmentName',
    minWidth: 210,
    render: (row) => `${row.baseType === 'tag' ? '标签' : '人群包'} / ${row.baseType === 'tag' ? row.baseTagName : row.baseSegmentName}`,
  },
  { title: '适用范围', key: 'scopeTargetName', width: 160 },
  {
    title: '状态',
    key: 'status',
    width: 90,
    render: (row) => h(NTag, { size: 'small', type: row.status === 'enabled' ? 'success' : row.status === 'invalid' ? 'error' : 'default' }, { default: () => (row.status === 'enabled' ? '启用' : row.status === 'invalid' ? '失效' : '停用') }),
  },
  { title: '更新时间', key: 'updatedAt', width: 170, render: (row) => formatDateTime(row.updatedAt) },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    render: (row) => h(NButton, { size: 'small', onClick: () => openTgiModal(row) }, { default: () => '编辑' }),
  },
])

const queryTaskChartColumns: DataTableColumns<GroupProfileQueryTaskChartResult> = [
  { title: '图表', key: 'chartTitle', minWidth: 180 },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) => h(NTag, { size: 'small', type: chartResultTag(row.status) }, { default: () => chartResultLabel(row.status) }),
  },
  { title: '失败原因', key: 'errorMessage', minWidth: 220, render: (row) => row.errorMessage ?? '-' },
]

onMounted(async () => {
  await initWorkbench()
  await loadByRoute()
})

watch(
  () => route.fullPath,
  async () => {
    await loadByRoute()
  },
)

watch(
  () => [
    filters.value.groupIds,
    filters.value.subjectTypes,
    filters.value.reportTypes,
    filters.value.creatorIds,
    filters.value.updateModes,
    filters.value.favoriteState,
    filters.value.createdRange,
    filters.value.updatedRange,
    filters.value.page,
    filters.value.pageSize,
  ],
  () => {
    if (currentPage.value === 'list') void searchReports()
  },
  { deep: true },
)

watch(
  () => metricDraft.value.xAxisType,
  () => {
    const firstAvailable = metricDimensionOptions.value.find((option) => option.dimensionType === metricDraft.value.xAxisType && option.permission)
    metricDraft.value.xAxisField = firstAvailable?.field ?? ''
  },
)

watch(
  () => metricDraft.value.conditionSource,
  () => {
    const firstAvailable = resourcePermissions.value.find((resource) => resource.resourceType === metricDraft.value.conditionSource && resource.permission)
    metricDraft.value.conditionResourceId = firstAvailable?.resourceId ?? ''
  },
)

watch(
  () => metricDraft.value.yAxisSourceType,
  () => {
    if (metricDraft.value.yAxisSourceType === 'tag') metricDraft.value.yAxisMetricId = labels.value.find((label) => label.permission)?.id ?? ''
    if (metricDraft.value.yAxisSourceType === 'defined_metric') metricDraft.value.yAxisMetricId = metricDefinitions.value[0]?.id ?? ''
  },
)

async function initWorkbench(): Promise<void> {
  loading.value = true
  try {
    workbench.value = await groupProfileInsightService.getWorkbenchData()
  } finally {
    loading.value = false
  }
}

async function loadByRoute(): Promise<void> {
  if (!workbench.value) await initWorkbench()
  if (currentPage.value === 'list') {
    currentReport.value = undefined
    reportDraft.value = undefined
    currentQueryTask.value = undefined
    reportQueryTasks.value = []
    reportScheduleTasks.value = []
    await searchReports()
    return
  }
  if (currentPage.value === 'new') {
    const subject = String(route.query.subject || 'user') as ProfileSubjectType
    reportDraft.value = groupProfileInsightService.buildDraftReport(subject)
    currentReport.value = undefined
    currentQueryTask.value = undefined
    reportQueryTasks.value = []
    reportScheduleTasks.value = []
    activeDetailTab.value = 'label'
    return
  }
  if (currentPage.value === 'templates' || currentPage.value === 'tgi') {
    currentReport.value = undefined
    reportDraft.value = undefined
    currentQueryTask.value = undefined
    reportQueryTasks.value = []
    reportScheduleTasks.value = []
    return
  }
  const reportId = String(route.params.reportId ?? '')
  if (!reportId) return
  loading.value = true
  try {
    const report = await groupProfileInsightService.getReport(reportId)
    if (!report) {
      message.error('报告不存在或已删除')
      await router.push('/user-insight/group-profiles')
      return
    }
    currentReport.value = report
    reportDraft.value = currentPage.value === 'edit' ? cloneReport(report) : undefined
    activeDetailTab.value = route.path.includes('/metric-analysis') ? 'metric' : route.path.includes('/label-analysis') ? 'label' : 'interpretation'
    await loadReportTasks(report.id)
  } finally {
    loading.value = false
  }
}

async function loadReportTasks(reportId: EntityId): Promise<void> {
  const tasks = await groupProfileInsightService.getReportTasks(reportId)
  reportQueryTasks.value = tasks.queryTasks
  reportScheduleTasks.value = tasks.scheduleTasks
  currentQueryTask.value = tasks.queryTasks[0]
}

async function searchReports(): Promise<void> {
  tableLoading.value = true
  try {
    const result = await groupProfileInsightService.searchReports(filters.value)
    reportRows.value = result.rows
    reportTotal.value = result.total
  } finally {
    tableLoading.value = false
  }
}

function resetFilters(): void {
  filters.value.keyword = ''
  filters.value.groupIds = []
  filters.value.subjectTypes = []
  filters.value.reportTypes = []
  filters.value.creatorIds = []
  filters.value.updateModes = []
  filters.value.favoriteState = 'all'
  filters.value.createdRange = null
  filters.value.updatedRange = null
  filters.value.page = 1
  void searchReports()
}

function cloneReport(report: GroupProfileReport): GroupProfileReport {
  return JSON.parse(JSON.stringify(report)) as GroupProfileReport
}

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function syncReportType(report: GroupProfileReport): void {
  const hasLabel = report.charts.some((chart) => chart.analysisType === 'label')
  const hasMetric = report.charts.some((chart) => chart.analysisType === 'metric')
  report.reportType = hasLabel && hasMetric ? 'mixed' : hasMetric ? 'metric' : 'label'
}

function mainCharts(report: GroupProfileReport): GroupProfileChart[] {
  const linkedIds = new Set(report.charts.flatMap((chart) => chart.linkageConfig.linkedChartIds))
  return report.charts.filter((chart) => !linkedIds.has(chart.id)).sort((a, b) => a.orderIndex - b.orderIndex)
}

function linkedChartsFor(chart: GroupProfileChart): GroupProfileChart[] {
  const report = activeReport.value
  if (!report) return []
  return chart.linkageConfig.linkedChartIds
    .map((id) => report.charts.find((item) => item.id === id))
    .filter((item): item is GroupProfileChart => Boolean(item))
    .sort((a, b) => a.orderIndex - b.orderIndex)
}

function findLabel(labelId: EntityId): (typeof labels.value)[number] | undefined {
  return labels.value.find((label) => label.id === labelId)
}

function resourceTypeForDimension(type: GroupProfileMetricDimensionType): GroupProfileResourceType | undefined {
  if (type === 'tag') return 'tag'
  if (type === 'behavior') return 'behavior'
  if (type === 'detail') return 'detail'
  if (type === 'attribute') return 'attribute'
  return undefined
}

function resourceCheckMessage(resourceType: GroupProfileResourceType, resourceId?: EntityId): string {
  const result = groupProfileInsightService.checkResourcePermission(resourceType, resourceId)
  return result.ok ? '' : result.message
}

function assertResourceForAction(resourceType: GroupProfileResourceType, resourceId: EntityId | undefined, actionName: string): boolean {
  const result = groupProfileInsightService.checkResourcePermission(resourceType, resourceId)
  if (!result.ok) {
    message.warning(`${actionName}需按当前用户资源权限重新校验：${result.message}`)
    return false
  }
  return true
}

function chartResourceFailure(chart: GroupProfileChart): string | undefined {
  if (chart.analysisType === 'label') return resourceCheckMessage('tag', chart.labelConfig?.tagId) || undefined
  const config = chart.metricConfig
  if (!config) return '指标图表配置缺失。'
  const dimensionResourceType = resourceTypeForDimension(config.xAxisType)
  if (dimensionResourceType) {
    const dimensionMessage = resourceCheckMessage(dimensionResourceType, config.xAxisField)
    if (dimensionMessage) return dimensionMessage
  }
  if (config.yAxisSourceType === 'tag') {
    const tagMessage = resourceCheckMessage('tag', config.yAxisMetricId)
    if (tagMessage) return tagMessage
  }
  if (config.yAxisSourceType === 'defined_metric') {
    const metric = metricDefinitions.value.find((item) => item.id === config.yAxisMetricId)
    if (!metric) return '指标不存在或已删除。'
    if (metric.conditionSource && metric.conditionResourceId) {
      const metricMessage = resourceCheckMessage(metric.conditionSource, metric.conditionResourceId)
      if (metricMessage) return metricMessage
    }
  }
  if (config.yAxisSourceType === 'new_metric' && config.metric?.conditionSource && config.metric.conditionResourceId) {
    const metricMessage = resourceCheckMessage(config.metric.conditionSource, config.metric.conditionResourceId)
    if (metricMessage) return metricMessage
  }
  return undefined
}

function assertChartForAction(chart: GroupProfileChart | undefined, actionName: string): boolean {
  if (!chart) return false
  const failure = chartResourceFailure(chart)
  if (!failure) return true
  message.warning(`${actionName}需按当前用户资源权限重新校验：${failure}`)
  return false
}

function makeStableSeed(value: string): number {
  return [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0)
}

function buildLabelValues(labelId: EntityId, chartId: EntityId, seedText = ''): GroupProfileLabelValueInsight[] {
  const label = findLabel(labelId)
  if (!label) return []
  const seed = makeStableSeed(`${labelId}:${seedText}`)
  const segmentTotal = Math.max(1200, targetSegments.value.reduce((sum, segment) => sum + segment.estimatedCount, 0) || 46820)
  const tagValidUv = Math.max(label.values.length * 900, Math.round(segmentTotal * (0.82 + (seed % 12) / 100)))
  const weights = label.values.map((_, index) => Math.max(8, 42 - index * 7 + ((seed + index * 11) % 19)))
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0)
  return label.values.map((value, index) => {
    const uv = Math.max(120, Math.round((tagValidUv * (weights[index] ?? 1)) / weightTotal))
    const projectValueUv = Math.max(1000, Math.round(180000 + ((seed + index * 7919) % 560000)))
    const projectTagValidUv = 2_100_000
    const projectTotalUv = 2_400_000
    const labelRatio = Number(((uv / segmentTotal) * 100).toFixed(2))
    const labelEffectiveRatio = Number(((uv / tagValidUv) * 100).toFixed(2))
    const marketTgi = Number(((uv / segmentTotal / (projectValueUv / projectTotalUv)) * 100).toFixed(0))
    const labelTgi = Number(((uv / tagValidUv / (projectValueUv / projectTagValidUv)) * 100).toFixed(0))
    return {
      id: `${chartId}-value-${index}`,
      tagId: label.id,
      tagName: label.name,
      tagGroup: label.groupName,
      value,
      taxonomyOrder: index + 1,
      uv,
      segmentTotal,
      tagValidUv,
      projectValueUv,
      projectTotalUv,
      projectTagValidUv,
      labelRatio,
      labelEffectiveRatio,
      marketTgi,
      labelTgi,
      dataUpdatedAt: activeReport.value?.dataUpdatedAt ?? new Date().toISOString().slice(0, 10),
      permission: label.permission,
      selected: false,
    }
  })
}

function buildLabelChart(labelId: EntityId, report: GroupProfileReport, options: { title?: string; groupName?: string; seedText?: string; idPrefix?: string } = {}): GroupProfileChart | undefined {
  const label = findLabel(labelId)
  if (!label || !label.permission) return undefined
  const source = groupProfileInsightService.buildDefaultCharts(report.id).find((chart) => chart.labelConfig?.tagId === labelId)
  const chart = source ? groupProfileInsightService.cloneChartsForReport([source], report.id)[0] : undefined
  const chartId = `${options.idPrefix ?? 'label-chart'}-${labelId}-${Date.now()}-${Math.round(Math.random() * 1000)}`
  const nextChart: GroupProfileChart = chart
    ? {
        ...chart,
        id: chartId,
        reportId: report.id,
      }
    : {
        id: chartId,
        reportId: report.id,
        chartType: label.valueType === 'multi' ? 'donut' : 'bar',
        analysisType: 'label',
        title: `${label.name}分布`,
        labelConfig: {
          tagId: label.id,
          tagName: label.name,
          tagGroup: label.groupName,
          selectedValues: label.values,
          topN: 10,
          linkageTagIds: [],
        },
        labelValues: [],
        metricPoints: [],
        sortConfig: report.globalSortMode,
        displayConfig: { visibleValues: label.values, topN: 10, ratioMode: report.ratioMode, showTgi: report.showTgi },
        linkageConfig: { enabled: false, selectedValue: undefined, linkedChartIds: [], linkedTagIds: [] },
        groupName: label.groupName,
        orderIndex: report.charts.length + 1,
        status: 'success',
      }
  nextChart.title = options.title ?? nextChart.title
  nextChart.groupName = options.groupName ?? label.groupName
  nextChart.orderIndex = report.charts.length + 1
  nextChart.sortConfig = report.globalSortMode
  nextChart.displayConfig = {
    ...nextChart.displayConfig,
    visibleValues: label.values,
    ratioMode: report.ratioMode,
    showTgi: report.showTgi,
  }
  nextChart.labelValues = buildLabelValues(label.id, nextChart.id, options.seedText)
  nextChart.labelConfig = {
    ...nextChart.labelConfig,
    tagId: label.id,
    tagName: label.name,
    tagGroup: label.groupName,
    selectedValues: label.values,
    topN: nextChart.displayConfig.topN,
    linkageTagIds: nextChart.labelConfig?.linkageTagIds ?? [],
  }
  nextChart.linkageConfig = { enabled: false, linkedChartIds: [], linkedTagIds: [] }
  return nextChart
}

function reportTypeTag(type: GroupProfileReportType): TagProps['type'] {
  if (type === 'label') return 'info'
  if (type === 'metric') return 'warning'
  return 'success'
}

function statusTag(status: GroupProfileReport['status']): TagProps['type'] {
  if (status === 'success') return 'success'
  if (status === 'failed' || status === 'invalid') return 'error'
  if (status === 'partial_success') return 'warning'
  if (status === 'running') return 'info'
  return 'default'
}

function taskStatusLabel(status: GroupProfileTaskStatus): string {
  const labels: Record<GroupProfileTaskStatus, string> = {
    created: '已创建',
    queued: '排队中',
    running: '运行中',
    completed: '已完成',
    failed: '失败',
    skipped: '已跳过',
  }
  return labels[status]
}

function taskStatusTag(status: GroupProfileTaskStatus): TagProps['type'] {
  if (status === 'completed') return 'success'
  if (status === 'failed') return 'error'
  if (status === 'skipped' || status === 'queued') return 'warning'
  if (status === 'running' || status === 'created') return 'info'
  return 'default'
}

function queryStageLabel(stage: GroupProfileQueryTask['stage']): string {
  const labels: Record<GroupProfileQueryTask['stage'], string> = {
    created: '任务创建',
    validating: '权限校验',
    calculating: '图表计算',
    writing: '写入结果',
    done: '已结束',
  }
  return labels[stage]
}

function chartResultLabel(status: GroupProfileQueryTaskChartResult['status']): string {
  if (status === 'success') return '成功'
  if (status === 'failed') return '失败'
  if (status === 'pending_query') return '待查询'
  return '运行中'
}

function chartResultTag(status: GroupProfileQueryTaskChartResult['status']): TagProps['type'] {
  if (status === 'success') return 'success'
  if (status === 'failed') return 'error'
  if (status === 'running') return 'info'
  return 'warning'
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value)
}

function formatDateTime(value: string): string {
  return value.replace('T', ' ').slice(0, 16)
}

function templateScopeLabel(scope: GroupProfileTemplateScope): string {
  if (scope === 'personal') return '个人模板'
  if (scope === 'project') return '项目模板'
  return '共享模板'
}

function rowActionOptions(row: GroupProfileReport): DropdownOption[] {
  const options: DropdownOption[] = []
  if (row.runtimePermission.canAuthorize) options.push({ label: '权限管理', key: 'permission' })
  if (row.runtimePermission.canCopy) options.push({ label: '复制报告', key: 'copy' })
  if (row.runtimePermission.canDownload) options.push({ label: '下载', key: 'download' })
  if (row.runtimePermission.canView) options.push({ label: '审计日志', key: 'audit' })
  if (row.runtimePermission.canDelete) options.push({ label: '删除', key: 'delete' })
  return options
}

function chartActionOptions(chart: GroupProfileChart): DropdownOption[] {
  const base: DropdownOption[] = [
    { label: '修改标题', key: 'title' },
    { label: '排序', key: 'sort' },
    { label: '调整标签值展示', key: 'values' },
    { label: '图表联动', key: 'linkage' },
    { label: '放大图表', key: 'expand' },
  ]
  if (chart.analysisType === 'metric') {
    return [
      { label: '编辑图表', key: 'metric-edit' },
      { label: '刷新图表', key: 'refresh' },
      { label: '下载图表数据', key: 'download' },
      { label: '放大图表', key: 'expand' },
      { label: '删除图表', key: 'delete' },
    ]
  }
  return [...base, { label: '存为分群', key: 'segment' }, { label: '删除图表', key: 'delete' }]
}

function handleRowAction(key: string, report: GroupProfileReport): void {
  if (key === 'permission') openPermissionModal(report)
  if (key === 'copy') openCopyModal(report)
  if (key === 'download') openDownloadModal(report)
  if (key === 'audit') void openAuditModal(report)
  if (key === 'delete') deleteTarget.value = report
}

function handleChartAction(key: string, chart: GroupProfileChart): void {
  selectedChartId.value = chart.id
  if (key === 'title') openChartTitleModal(chart)
  if (key === 'values') openValueDisplayModal(chart)
  if (key === 'linkage') openLinkageModal(chart)
  if (key === 'expand') expandedChart.value = chart
  if (key === 'segment') openSaveSegmentModal(chart)
  if (key === 'delete') requestDeleteChart(chart)
  if (key === 'metric-edit') openMetricModal(chart)
  if (key === 'refresh') message.success('图表已进入待查询状态，请点击查询报告刷新数据。')
  if (key === 'download') downloadSingleChart(chart)
  if (key === 'sort') {
    chart.sortConfig = nextSortMode(chart.sortConfig)
    message.success(`当前图表已切换为：${groupProfileSortModeLabels[chart.sortConfig]}`)
  }
}

function nextSortMode(mode: GroupProfileSortMode): GroupProfileSortMode {
  const keys = Object.keys(groupProfileSortModeLabels) as GroupProfileSortMode[]
  const index = keys.indexOf(mode)
  return keys[(index + 1) % keys.length] ?? 'taxonomy'
}

function openCreateSubjectModal(): void {
  if (!permissions.value?.createManualReport) {
    message.warning('暂无群体画像报告创建权限，请联系项目管理员开通。')
    return
  }
  const defaultSubject = subjects.value.find((subject) => subject.default)
  selectedCreateSubject.value = defaultSubject?.type ?? 'user'
  subjectModalVisible.value = true
}

async function confirmCreateReport(): Promise<void> {
  const availableSegment = segmentOptions.value.some((segment) => segment.subjectType === selectedCreateSubject.value && segment.permission)
  subjectModalVisible.value = false
  await router.push({ path: '/user-insight/group-profiles/new', query: { subject: selectedCreateSubject.value } })
  if (!availableSegment) {
    message.warning('当前主体下暂无可用分群，请先创建或申请分群权限。')
  }
}

function openSegmentSelect(role: 'target' | 'compare'): void {
  segmentSelectRole.value = role
  selectedSegmentId.value = ''
  segmentKeyword.value = ''
  segmentSubjectFilter.value = activeReport.value?.subjectType ?? 'all'
  segmentGroupFilter.value = 'all'
  segmentStatusFilter.value = 'available'
  segmentSelectVisible.value = true
}

function confirmSegmentSelect(): void {
  const report = reportDraft.value
  const segment = segmentOptions.value.find((item) => item.id === selectedSegmentId.value)
  if (!report || !segment) return
  if (!assertResourceForAction('segment', segment.id, '选择分群包')) return
  if (segment.subjectType !== report.subjectType) {
    message.error('分群主体必须与报告主体一致。')
    return
  }
  if (segmentSelectRole.value === 'compare' && report.segments.some((item) => item.segmentId === segment.id && item.role === 'target')) {
    message.error('对比分群与目标分群一致，无法形成差异对比。')
    return
  }
  if (segmentSelectRole.value === 'compare' && compareSegments.value.length >= 5) {
    message.warning('对比分群最多支持 5 个，避免图表难以阅读。')
    return
  }
  report.segments.push({
    id: `report-segment-${Date.now()}`,
    segmentId: segment.id,
    reportId: report.id,
    segmentName: segment.name,
    originalName: segment.name,
    role: segmentSelectRole.value,
    sourceType: 'existing',
    subjectType: report.subjectType,
    subjectName: report.subjectName,
    outputIdType: segment.outputIdType,
    estimatedCount: segment.count,
    estimateStatus: segment.status === 'invalid' ? 'failed' : 'success',
    failedReason: segment.status === 'invalid' ? '分群已失效' : undefined,
  })
  segmentSelectVisible.value = false
}

function openCustomRule(role: 'target' | 'compare'): void {
  customRuleRole.value = role
  customRuleDraft.value = {
    name: role === 'target' ? '自定义圈选目标人群' : '自定义圈选对比分群',
    outputIdType: 'OneID',
    satisfyLogic: 'all',
    excludeLogic: 'any',
    satisfyConditions: [makeCustomRuleCondition('include', 'tag')],
    excludeConditions: [makeCustomRuleCondition('exclude', 'segment')],
  }
  customRuleVisible.value = true
}

function makeCustomRuleCondition(relation: 'include' | 'exclude', source: GroupProfileCondition['source'] = 'tag'): CustomRuleConditionDraft {
  const condition: CustomRuleConditionDraft = {
    id: `rule-condition-${Date.now()}-${Math.round(Math.random() * 1000)}`,
    source,
    field: '',
    operator: relation === 'include' ? 'in' : 'not_in',
    value: '',
    relation,
  }
  condition.field = fieldOptionsForRuleCondition(condition)[0]?.value as string
  condition.value = defaultValueForRuleCondition(condition)
  return condition
}

function ruleSourceToResourceType(source: GroupProfileCondition['source']): GroupProfileResourceType | undefined {
  if (source === 'tag') return 'tag'
  if (source === 'behavior') return 'behavior'
  if (source === 'detail') return 'detail'
  if (source === 'attribute') return 'attribute'
  if (source === 'segment') return 'segment'
  return undefined
}

function fieldOptionsForRuleCondition(condition: CustomRuleConditionDraft): SelectOption[] {
  if (condition.source === 'tag') {
    return labels.value.map((label) => ({
      label: `${label.groupName} / ${label.name}${label.permission ? '' : '（无权限）'}`,
      value: label.id,
      disabled: !label.permission,
    }))
  }
  if (condition.source === 'segment') {
    return segmentOptions.value
      .filter((segment) => !activeReport.value || segment.subjectType === activeReport.value.subjectType)
      .map((segment) => ({
        label: `${segment.groupName} / ${segment.name}${segment.permission ? '' : '（无权限）'}`,
        value: segment.id,
        disabled: !segment.permission || segment.status === 'invalid',
      }))
  }
  const resourceType = ruleSourceToResourceType(condition.source)
  return resourcePermissions.value
    .filter((resource) => resource.resourceType === resourceType)
    .map((resource) => ({
      label: `${resource.groupName} / ${resource.resourceName}${resource.permission ? '' : '（无权限）'}`,
      value: resource.resourceId,
      disabled: !resource.permission,
    }))
}

function valueOptionsForRuleCondition(condition: CustomRuleConditionDraft): SelectOption[] {
  if (condition.source === 'tag') return findLabel(condition.field)?.values.map((value) => ({ label: value, value })) ?? []
  if (condition.source === 'segment') return [{ label: '属于该人群包', value: 'in_segment' }]
  if (condition.source === 'behavior') return [{ label: '近 7 天发生', value: 'last_7_days' }, { label: '近 30 天发生', value: 'last_30_days' }, { label: '累计次数 >= 3', value: 'count_gte_3' }]
  if (condition.source === 'detail') return [{ label: '有明细记录', value: 'exists' }, { label: '明细次数 >= 1', value: 'count_gte_1' }, { label: '明细金额 > 0', value: 'amount_gt_0' }]
  if (condition.source === 'attribute') return [{ label: '一线/新一线', value: 'tier_1_or_new_1' }, { label: 'iOS', value: 'ios' }, { label: 'Android', value: 'android' }]
  return []
}

function defaultValueForRuleCondition(condition: CustomRuleConditionDraft): string {
  return String(valueOptionsForRuleCondition(condition)[0]?.value ?? '')
}

function updateRuleConditionSource(condition: CustomRuleConditionDraft, source: GroupProfileCondition['source']): void {
  condition.source = source
  condition.field = fieldOptionsForRuleCondition(condition)[0]?.value as string
  condition.operator = source === 'behavior' ? 'occurred_recently' : condition.relation === 'include' ? 'in' : 'not_in'
  condition.value = defaultValueForRuleCondition(condition)
}

function updateRuleConditionField(condition: CustomRuleConditionDraft, field: EntityId): void {
  condition.field = field
  condition.value = defaultValueForRuleCondition(condition)
}

function addRuleCondition(relation: 'include' | 'exclude'): void {
  const target = relation === 'include' ? customRuleDraft.value.satisfyConditions : customRuleDraft.value.excludeConditions
  target.push(makeCustomRuleCondition(relation))
}

function removeRuleCondition(relation: 'include' | 'exclude', conditionId: EntityId): void {
  if (relation === 'include') customRuleDraft.value.satisfyConditions = customRuleDraft.value.satisfyConditions.filter((condition) => condition.id !== conditionId)
  else customRuleDraft.value.excludeConditions = customRuleDraft.value.excludeConditions.filter((condition) => condition.id !== conditionId)
}

function customRuleConditionLabel(condition: CustomRuleConditionDraft): string {
  if (condition.source === 'tag') return findLabel(condition.field)?.name ?? condition.field
  if (condition.source === 'segment') return segmentOptions.value.find((segment) => segment.id === condition.field)?.name ?? condition.field
  return resourcePermissions.value.find((resource) => resource.resourceId === condition.field)?.resourceName ?? condition.field
}

function normalizeCustomRuleCondition(condition: CustomRuleConditionDraft): GroupProfileCondition | undefined {
  const resourceType = ruleSourceToResourceType(condition.source)
  if (resourceType && !assertResourceForAction(resourceType, condition.field, '配置自定义圈选')) return undefined
  return {
    id: condition.id,
    source: condition.source,
    sourceName: customRuleSourceOptions.find((option) => option.value === condition.source)?.label as string,
    field: condition.field,
    label: customRuleConditionLabel(condition),
    operator: customRuleOperatorOptions.find((option) => option.value === condition.operator)?.label as string,
    value: condition.value,
    relation: condition.relation,
  }
}

function confirmCustomRule(): void {
  const report = reportDraft.value
  if (!report) return
  if (!customRuleDraft.value.name.trim()) {
    message.error('请输入自定义圈选名称。')
    return
  }
  const satisfyConditions = customRuleDraft.value.satisfyConditions.map(normalizeCustomRuleCondition)
  const excludeConditions = customRuleDraft.value.excludeConditions.map(normalizeCustomRuleCondition)
  if (satisfyConditions.some((condition) => !condition) || excludeConditions.some((condition) => !condition)) return
  if (!satisfyConditions.length) {
    message.error('至少配置 1 个满足条件。')
    return
  }
  report.segments.push({
    id: `report-segment-custom-${Date.now()}`,
    reportId: report.id,
    segmentName: customRuleDraft.value.name,
    originalName: customRuleDraft.value.name,
    role: customRuleRole.value,
    sourceType: 'custom_rule',
    subjectType: report.subjectType,
    subjectName: report.subjectName,
    outputIdType: customRuleDraft.value.outputIdType,
    ruleConfig: {
      satisfyLogic: customRuleDraft.value.satisfyLogic,
      satisfyConditions: satisfyConditions.filter((condition): condition is GroupProfileCondition => Boolean(condition)),
      excludeLogic: customRuleDraft.value.excludeLogic,
      excludeConditions: excludeConditions.filter((condition): condition is GroupProfileCondition => Boolean(condition)),
      version: 1,
    },
    estimatedCount: 0,
    estimateStatus: 'pending',
  })
  customRuleVisible.value = false
}

function removeSegment(segmentId: EntityId): void {
  const report = reportDraft.value
  if (!report) return
  report.segments = report.segments.filter((segment) => segment.id !== segmentId)
}

async function estimateSegments(): Promise<void> {
  const report = reportDraft.value
  if (!report) return
  if (!report.segments.length) {
    message.error('请先配置分析对象。')
    return
  }
  actionLoading.value = true
  try {
    report.segments.forEach((segment) => (segment.estimateStatus = 'running'))
    reportDraft.value = await groupProfileInsightService.estimateSegments(report)
    message.success('分群预估完成。')
  } finally {
    actionLoading.value = false
  }
}

function addDefaultCharts(): void {
  const report = reportDraft.value
  if (!report) return
  const exists = new Set(report.charts.map((chart) => chart.title))
  const charts = groupProfileInsightService.buildDefaultCharts(report.id).filter((chart) => !exists.has(chart.title))
  report.charts.push(...charts)
  syncReportType(report)
  activeDetailTab.value = 'label'
  message.success('已生成默认标签分析图表。')
}

function openLabelSelect(): void {
  const report = reportDraft.value
  if (!report) {
    message.info('请先进入新建或编辑报告后再选择标签。')
    return
  }
  selectedLabelIds.value = report.charts
    .filter((chart) => chart.analysisType === 'label' && !linkedChartIds.value.has(chart.id))
    .flatMap((chart) => (chart.labelConfig?.tagId ? [chart.labelConfig.tagId] : []))
  labelKeyword.value = ''
  labelGroupFilter.value = 'all'
  labelSelectVisible.value = true
}

function confirmLabelSelect(): void {
  const report = reportDraft.value
  if (!report) return
  const allowedIds = selectedLabelIds.value.filter((labelId) => findLabel(labelId)?.permission)
  if (!allowedIds.length) {
    message.error('请至少选择 1 个有权限的标签。')
    return
  }
  const keepIds = new Set(allowedIds)
  const mainLabelCharts = report.charts.filter((chart) => chart.analysisType === 'label' && !linkedChartIds.value.has(chart.id))
  const removedSourceIds = new Set(mainLabelCharts.filter((chart) => !keepIds.has(chart.labelConfig?.tagId ?? '')).map((chart) => chart.id))
  const removedLinkedIds = new Set(mainLabelCharts.filter((chart) => removedSourceIds.has(chart.id)).flatMap((chart) => chart.linkageConfig.linkedChartIds))
  report.charts = report.charts.filter((chart) => !removedSourceIds.has(chart.id) && !removedLinkedIds.has(chart.id))
  const existingLabelIds = new Set(report.charts.filter((chart) => chart.analysisType === 'label').flatMap((chart) => (chart.labelConfig?.tagId ? [chart.labelConfig.tagId] : [])))
  allowedIds.forEach((labelId) => {
    if (existingLabelIds.has(labelId)) return
    const chart = buildLabelChart(labelId, report)
    if (chart) report.charts.push(chart)
  })
  report.charts.forEach((chart, index) => (chart.orderIndex = index + 1))
  syncReportType(report)
  activeDetailTab.value = 'label'
  labelSelectVisible.value = false
  const deniedCount = selectedLabelIds.value.length - allowedIds.length
  message.success(deniedCount > 0 ? `已应用标签选择，并跳过 ${deniedCount} 个无权限标签。` : '已应用标签选择。')
}

function useTemplate(template: GroupProfileTemplate): void {
  const report = reportDraft.value
  if (!report) {
    message.info('请先进入新建或编辑报告后再使用模板。')
    return
  }
  const sourceCharts = template.config.charts?.length
    ? groupProfileInsightService.cloneChartsForReport(template.config.charts, report.id)
    : [
        ...template.config.labels.flatMap((labelId) => {
          const chart = buildLabelChart(labelId, report)
          return chart ? [chart] : []
        }),
        ...groupProfileInsightService.buildDefaultCharts(report.id).filter((chart) => template.config.metrics.includes(chart.metricConfig?.yAxisMetricId ?? '')),
      ]
  const allowedCharts = sourceCharts.filter((chart) => chart.analysisType !== 'label' || labels.value.some((label) => label.id === chart.labelConfig?.tagId && label.permission))
  const removedCount = sourceCharts.length - allowedCharts.length
  if (!allowedCharts.length) {
    message.error('模板中的图表均无权限或不可用，使用失败。')
    return
  }
  const allowedChartIds = new Set(allowedCharts.map((chart) => chart.id))
  report.charts = allowedCharts.map((chart, index) => ({
    ...chart,
    reportId: report.id,
    orderIndex: index + 1,
    linkageConfig: {
      ...chart.linkageConfig,
      linkedChartIds: chart.linkageConfig.linkedChartIds.filter((id) => allowedChartIds.has(id)),
    },
    sortConfig: chart.analysisType === 'label' ? template.config.sortMode : chart.sortConfig,
    displayConfig: {
      ...chart.displayConfig,
      ratioMode: report.ratioMode,
      showTgi: report.showTgi,
    },
  }))
  report.chartGroups = (template.config.chartGroups?.length ? cloneValue(template.config.chartGroups) : report.chartGroups).map((group, index) => ({ ...group, orderIndex: index + 1 }))
  report.groupMode = template.config.groupMode
  report.globalSortMode = template.config.sortMode
  syncReportType(report)
  selectedTemplateId.value = template.id
  message.success(removedCount > 0 ? `模板已应用，已自动剔除 ${removedCount} 个无权限标签。` : '模板已应用。')
}

function formatMetricPointValue(value: number, displayFormat: GroupProfileMetricChartConfig['displayFormat']): string {
  if (displayFormat === 'integer') return formatNumber(Math.round(value))
  if (displayFormat === 'decimal') return value.toFixed(2)
  if (displayFormat === 'percent_integer') return `${Math.round(value * 100)}%`
  return `${(value * 100).toFixed(2)}%`
}

function metricDimensionValues(report: GroupProfileReport): string[] {
  if (metricDraft.value.xAxisType === 'segment') return report.segments.map((segment) => segment.segmentName)
  if (metricDraft.value.xAxisType === 'time') return ['05-21', '05-22', '05-23', '05-24', '05-25', '05-26', '05-27']
  if (metricDraft.value.xAxisType === 'tag') return findLabel(metricDraft.value.xAxisField)?.values ?? []
  const option = selectedMetricDimensionOption.value
  if (metricDraft.value.xAxisType === 'attribute') {
    if (option?.field === 'attribute-device-os') return ['iOS', 'Android', 'HarmonyOS']
    return ['一线', '新一线', '二线', '三线及以下']
  }
  if (metricDraft.value.xAxisType === 'detail') {
    if (option?.field === 'detail-pay-order') return ['0 单', '1 单', '2-3 单', '4 单以上']
    return ['曝光', '点击', '开始', '完成']
  }
  if (metricDraft.value.xAxisType === 'behavior') {
    if (option?.field === 'behavior-pay-order') return ['未支付', '小额支付', '中额支付', '高额支付']
    return ['0 次', '1-2 次', '3-5 次', '6 次以上']
  }
  return ['整体']
}

function buildMetricPointsForDraft(report: GroupProfileReport): GroupProfileMetricPoint[] {
  const dimensions = metricDimensionValues(report)
  const segments = metricDraft.value.xAxisType === 'segment' ? report.segments : report.segments.filter((segment) => segment.role === 'target').slice(0, 2)
  const displayFormat = metricDraft.value.displayFormat
  return dimensions.flatMap((dimension, dimensionIndex) =>
    segments.map((segment, segmentIndex) => {
      const seed = makeStableSeed(`${metricDraft.value.title}:${metricDraft.value.yAxisMetricId}:${dimension}:${segment.segmentName}`)
      const percentMetric = displayFormat === 'percent_decimal' || displayFormat === 'percent_integer'
      const value = percentMetric
        ? Number((0.12 + ((seed + dimensionIndex * 13 + segmentIndex * 7) % 58) / 100).toFixed(4))
        : Math.max(16, Math.round(420 + ((seed + dimensionIndex * 97 + segmentIndex * 43) % 7800)))
      return {
        dimension,
        segmentName: segment.segmentName,
        value,
        formattedValue: formatMetricPointValue(value, displayFormat),
        ratio: percentMetric ? Number((value * 100).toFixed(2)) : undefined,
      }
    }),
  )
}

function validateMetricFormula(formula: string): FormulaValidationResult {
  const expression = formula.trim()
  if (!expression) return { ok: false, message: '组合指标公式不能为空。' }
  const knownMetricNames = [
    ...metricDefinitions.value.map((metric) => metric.name),
    '广告完成次数',
    '广告开始次数',
    '广告观看次数',
    '游戏局数',
    '付费金额',
    '付费用户数',
    '活跃天数',
  ]
  const referencedNames = knownMetricNames.filter((name) => expression.includes(name))
  if (!referencedNames.length) return { ok: false, message: '公式中至少引用 1 个已有指标或原子指标。' }
  let normalized = expression
  ;[...knownMetricNames].sort((a, b) => b.length - a.length).forEach((name) => {
    normalized = normalized.split(name).join('1')
  })
  normalized = normalized.replace(/\s+/g, '')
  if (/[^0-9+\-*/().]/.test(normalized)) return { ok: false, message: '公式中存在未识别的指标名或非法字符。' }
  let depth = 0
  for (const char of normalized) {
    if (char === '(') depth += 1
    if (char === ')') depth -= 1
    if (depth < 0) return { ok: false, message: '公式括号不匹配。' }
  }
  if (depth !== 0) return { ok: false, message: '公式括号不匹配。' }
  if (/^[*/)]/.test(normalized) || /[+\-*/(]$/.test(normalized)) return { ok: false, message: '公式开头或结尾不能是无效运算符。' }
  if (/[+\-*/]{2,}/.test(normalized)) return { ok: false, message: '公式中存在连续运算符。' }
  if (/\/0(?:\.0+)?(?![\d.])/.test(normalized)) return { ok: false, message: '公式中不能除以 0。' }
  return { ok: true }
}

function previewMetricFormula(): void {
  if (metricDraft.value.yAxisSourceType === 'new_metric' && metricDraft.value.newMetricType === 'formula') {
    const formulaValidation = validateMetricFormula(metricDraft.value.formula)
    if (!formulaValidation.ok) {
      message.error(formulaValidation.message ?? '公式校验失败。')
      return
    }
  }
  message.info('预览成功：将生成所选维度与指标的图表结构。')
}

function openMetricModal(chart?: GroupProfileChart): void {
  if (!hasMetricAbility.value) {
    message.warning('指标分析为增值模块，如需使用请联系商务人员。')
    return
  }
  if (!reportDraft.value?.segments.length) {
    message.error('请先配置分群并完成预估。')
    return
  }
  metricConfigChartId.value = chart?.id ?? ''
  metricDraft.value.title = chart?.title ?? '广告观看次数趋势'
  metricDraft.value.chartType = (chart?.metricConfig?.chartType ?? 'line') as GroupProfileMetricChartConfig['chartType']
  metricDraft.value.xAxisType = chart?.metricConfig?.xAxisType ?? 'time'
  metricDraft.value.xAxisField = chart?.metricConfig?.xAxisField ?? 'event_date'
  metricDraft.value.yAxisSourceType = chart?.metricConfig?.yAxisSourceType ?? 'defined_metric'
  metricDraft.value.yAxisMetricId = chart?.metricConfig?.yAxisMetricId ?? 'metric-ad-watch-pv'
  metricDraft.value.newMetricName = chart?.metricConfig?.metric?.name ?? '报告内新建指标'
  metricDraft.value.newMetricDescription = chart?.metricConfig?.metric?.description ?? '报告内临时创建，仅随当前报告保存。'
  metricDraft.value.newMetricGroupName = chart?.metricConfig?.metric?.groupName ?? '报告指标'
  metricDraft.value.newMetricType = chart?.metricConfig?.metric?.buildType ?? 'single'
  metricDraft.value.conditionSource = chart?.metricConfig?.metric?.conditionSource ?? 'behavior'
  metricDraft.value.conditionResourceId = chart?.metricConfig?.metric?.conditionResourceId ?? 'behavior-ad-watch'
  metricDraft.value.displayFormat = chart?.metricConfig?.displayFormat ?? chart?.metricConfig?.metric?.displayFormat ?? 'integer'
  metricDraft.value.idType = chart?.metricConfig?.metric?.idType ?? 'OneID'
  metricDraft.value.formula = chart?.metricConfig?.metric?.formula ?? '广告完成次数 / 广告开始次数'
  if (metricDraft.value.yAxisSourceType === 'tag' && !labels.value.some((label) => label.id === metricDraft.value.yAxisMetricId && label.permission)) {
    metricDraft.value.yAxisMetricId = labels.value.find((label) => label.permission)?.id ?? ''
  }
  if (!selectedMetricDimensionOption.value?.permission) {
    metricDraft.value.xAxisField = metricDimensionOptions.value.find((option) => option.dimensionType === metricDraft.value.xAxisType && option.permission)?.field ?? ''
  }
  metricModalVisible.value = true
}

function confirmMetricChart(): void {
  const report = reportDraft.value
  if (!report) return
  if (!metricDraft.value.title.trim()) {
    message.error('图表标题不能为空。')
    return
  }
  const dimensionOption = selectedMetricDimensionOption.value
  if (!dimensionOption) {
    message.error('请选择有效的 X 轴字段。')
    return
  }
  if (!dimensionOption.permission) {
    message.error(dimensionOption.reason ?? '暂无该维度字段权限。')
    return
  }
  if (metricDraft.value.yAxisSourceType === 'defined_metric') {
    const metric = metricDefinitions.value.find((item) => item.id === metricDraft.value.yAxisMetricId)
    if (!metric) {
      message.error('请选择有效的已有指标。')
      return
    }
    if (metric.conditionSource && metric.conditionResourceId && !assertResourceForAction(metric.conditionSource, metric.conditionResourceId, '配置已有指标')) return
  }
  if (metricDraft.value.yAxisSourceType === 'tag' && !assertResourceForAction('tag', metricDraft.value.yAxisMetricId, '配置标签指标')) {
    return
  }
  if (metricDraft.value.yAxisSourceType === 'new_metric' && !metricDraft.value.newMetricName.trim()) {
    message.error('新建指标名称不能为空。')
    return
  }
  if (metricDraft.value.yAxisSourceType === 'new_metric' && metricDraft.value.newMetricType === 'single' && !assertResourceForAction(metricDraft.value.conditionSource, metricDraft.value.conditionResourceId, '配置新建指标')) {
    return
  }
  if (metricDraft.value.yAxisSourceType === 'new_metric' && metricDraft.value.newMetricType === 'formula') {
    const formulaValidation = validateMetricFormula(metricDraft.value.formula)
    if (!formulaValidation.ok) {
      message.error(formulaValidation.message ?? '公式校验失败。')
      return
    }
  }
  if (metricDraft.value.chartType === 'line' && metricDraft.value.xAxisType !== 'time') {
    message.error('折线图必须选择时间或连续可排序维度。')
    return
  }
  if (metricDraft.value.chartType === 'card' && metricDraft.value.xAxisType !== 'segment') {
    message.error('卡片图建议使用分群维度展示单个指标值。')
    return
  }
  const endDate = metricDraft.value.dateMode === 'fixed' ? metricDraft.value.endDate : metricDraft.value.dateMode === 'single' ? metricDraft.value.singleDate : '2026-05-27'
  if (metricDraft.value.dateMode === 'fixed' && new Date(metricDraft.value.startDate).getTime() > new Date(metricDraft.value.endDate).getTime()) {
    message.error('固定时间区间的开始日期不能晚于结束日期。')
    return
  }
  if (new Date(endDate).getTime() > Date.now()) {
    message.error('数据计算时间不能晚于当前日期。')
    return
  }
  const chart: GroupProfileChart = {
    id: metricConfigChartId.value || `metric-chart-${Date.now()}`,
    reportId: report.id,
    chartType: metricDraft.value.chartType === 'column' ? 'column' : metricDraft.value.chartType,
    analysisType: 'metric',
    title: metricDraft.value.title,
    metricConfig: {
      chartType: metricDraft.value.chartType,
      xAxisType: metricDraft.value.xAxisType,
      xAxisField: metricDraft.value.xAxisField,
      yAxisSourceType: metricDraft.value.yAxisSourceType,
      yAxisMetricId: metricDraft.value.yAxisMetricId,
      metric:
        metricDraft.value.yAxisSourceType === 'new_metric'
          ? {
              id: `metric-custom-${Date.now()}`,
              name: metricDraft.value.newMetricName,
              description: metricDraft.value.newMetricDescription,
              groupName: metricDraft.value.newMetricGroupName,
              buildType: metricDraft.value.newMetricType,
              conditionSource: metricDraft.value.newMetricType === 'single' ? metricDraft.value.conditionSource : undefined,
              conditionResourceId: metricDraft.value.newMetricType === 'single' ? metricDraft.value.conditionResourceId : undefined,
              displayFormat: metricDraft.value.displayFormat,
              idType: metricDraft.value.idType,
              formula: metricDraft.value.newMetricType === 'formula' ? metricDraft.value.formula : undefined,
            }
          : undefined,
      dateRange:
        metricDraft.value.dateMode === 'single'
          ? { mode: 'single', singleDate: metricDraft.value.singleDate }
          : metricDraft.value.dateMode === 'fixed'
            ? { mode: 'fixed', startDate: metricDraft.value.startDate, endDate: metricDraft.value.endDate }
            : { mode: 'dynamic', dynamicValue: metricDraft.value.dynamicValue },
      displayFormat: metricDraft.value.displayFormat,
    },
    labelValues: [],
    metricPoints: metricDraft.value.chartType === 'card' ? buildMetricPointsForDraft(report).slice(0, 2) : buildMetricPointsForDraft(report),
    sortConfig: 'taxonomy',
    displayConfig: { visibleValues: [], topN: 10, ratioMode: report.ratioMode, showTgi: report.showTgi },
    linkageConfig: { enabled: false, linkedChartIds: [], linkedTagIds: [] },
    groupName: '指标表现',
    orderIndex: report.charts.length + 1,
    status: 'pending_query',
  }
  const index = report.charts.findIndex((item) => item.id === chart.id)
  if (index >= 0) report.charts.splice(index, 1, chart)
  else report.charts.push(chart)
  syncReportType(report)
  metricModalVisible.value = false
  activeDetailTab.value = 'metric'
  message.success('指标图表配置已保存，点击查询报告后生成图表数据。')
}

async function saveReport(): Promise<void> {
  const report = reportDraft.value
  if (!report) return
  if (!report.name.trim()) {
    message.error('请输入报告名称。')
    return
  }
  actionLoading.value = true
  try {
    const firstSave = !workbench.value?.reports.some((item) => item.id === report.id)
    const result = await groupProfileInsightService.saveReport({ report, firstSave })
    if (!result.ok) {
      message.error(result.message)
      return
    }
    message.success(result.message)
    await initWorkbench()
    if (result.id) await router.push(`/user-insight/group-profiles/${result.id}`)
  } finally {
    actionLoading.value = false
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function buildDraftQueryResult(report: GroupProfileReport): GroupProfileQueryTaskChartResult[] {
  return report.charts.map((chart) => {
    const failure = chartResourceFailure(chart)
    return {
      chartId: chart.id,
      chartTitle: chart.title,
      status: failure ? 'failed' : 'success',
      errorMessage: failure,
    }
  })
}

async function queryReport(): Promise<void> {
  const report = activeReport.value
  if (!report) return
  if (report.segments.some((segment) => segment.estimateStatus !== 'success')) {
    message.error('请先完成分群预估。')
    return
  }
  if (!report.charts.length) {
    if (editable.value && reportDraft.value) addDefaultCharts()
    else {
      message.error('请至少配置一个图表。')
      return
    }
  }
  actionLoading.value = true
  try {
    if (editable.value && reportDraft.value) {
      const taskId = `draft-query-task-${Date.now()}`
      currentQueryTask.value = {
        id: taskId,
        reportId: report.id,
        taskType: 'manual',
        status: 'running',
        stage: 'validating',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pollCount: 0,
        chartResults: report.charts.map((chart) => ({ chartId: chart.id, chartTitle: chart.title, status: 'running' })),
        message: '任务已创建，正在按当前用户资源权限校验图表。',
      }
      await wait(220)
      currentQueryTask.value = { ...currentQueryTask.value, stage: 'calculating', pollCount: 1, updatedAt: new Date().toISOString(), message: '资源校验完成，正在计算图表数据。' }
      await wait(220)
      const chartResults = buildDraftQueryResult(report)
      chartResults.forEach((result) => {
        const chart = report.charts.find((item) => item.id === result.chartId)
        if (!chart) return
        chart.status = result.status === 'failed' ? 'failed' : 'success'
        chart.errorMessage = result.errorMessage
      })
      const failedCount = chartResults.filter((item) => item.status === 'failed').length
      reportDraft.value.status = failedCount === chartResults.length ? 'failed' : failedCount ? 'partial_success' : 'success'
      reportDraft.value.dataUpdatedAt = new Date().toISOString().slice(0, 10)
      currentQueryTask.value = {
        ...currentQueryTask.value,
        status: failedCount === chartResults.length ? 'failed' : 'completed',
        stage: 'done',
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pollCount: 2,
        chartResults,
        message: failedCount ? `查询完成，${failedCount} 个图表因资源权限或配置失效失败。` : '查询完成，所有图表已刷新。',
      }
      if (failedCount) message.warning(currentQueryTask.value.message)
      else message.success(currentQueryTask.value.message)
      return
    }
    const task = await groupProfileInsightService.createReportQueryTask(report.id)
    if (!task) {
      message.error('查询任务创建失败，报告不存在或已删除。')
      return
    }
    currentQueryTask.value = task
    let latestTask: GroupProfileQueryTask | undefined = task
    for (let index = 0; index < 5; index += 1) {
      await wait(260)
      latestTask = await groupProfileInsightService.getReportQueryTask(task.id)
      if (latestTask) currentQueryTask.value = latestTask
      if (latestTask?.status === 'completed' || latestTask?.status === 'failed') break
    }
    const updated = await groupProfileInsightService.getReport(report.id)
    if (updated) currentReport.value = updated
    await loadReportTasks(report.id)
    if (latestTask?.status === 'completed') {
      const failedCount = latestTask.chartResults.filter((item) => item.status === 'failed').length
      if (failedCount) message.warning(latestTask.message)
      else message.success(latestTask.message)
    } else if (latestTask?.status === 'queued') {
      message.warning('查询任务已排队，将在上一任务完成后继续。')
    } else if (latestTask?.status === 'failed') {
      message.error(latestTask.message)
    }
  } finally {
    actionLoading.value = false
  }
}

function openDescriptionModal(): void {
  const report = reportDraft.value
  if (!report) return
  descriptionDraft.value = report.description
  descriptionModalVisible.value = true
}

function confirmDescription(): void {
  if (descriptionDraft.value.length > 200) {
    message.error('描述最多 200 字。')
    return
  }
  if (reportDraft.value) reportDraft.value.description = descriptionDraft.value
  descriptionModalVisible.value = false
}

function openPermissionModal(report?: GroupProfileReport): void {
  const target = report ?? activeReport.value
  if (!target) return
  permissionDraft.value = cloneReport(target).permissions
  permissionModalVisible.value = true
}

function addPermission(): void {
  const duplicate = permissionDraft.value.some((item) => item.principalName === permissionPrincipalName.value)
  if (duplicate) {
    permissionDraft.value = permissionDraft.value.map((item) =>
      item.principalName === permissionPrincipalName.value ? { ...item, permission: permissionLevel.value } : item,
    )
    return
  }
  const permission = groupProfileInsightService.makePermission(activeReport.value?.id ?? reportDraft.value?.id ?? '', permissionPrincipalName.value, permissionLevel.value)
  permission.principalType = permissionPrincipalType.value
  permissionDraft.value.push(permission)
}

async function confirmPermissions(): Promise<void> {
  const report = activeReport.value
  if (!report) return
  const result = await groupProfileInsightService.updateReportPermissions(report.id, permissionDraft.value)
  if (!result.ok) {
    message.error(result.message)
    return
  }
  message.success(result.message)
  permissionModalVisible.value = false
  await initWorkbench()
  await loadByRoute()
}

function openScheduleModal(): void {
  const report = reportDraft.value ?? activeReport.value
  if (!report) return
  scheduleDraft.value = {
    updateMode: report.updateMode,
    executeTime: report.scheduleConfig.executeTime ?? '09:00',
    startDate: report.scheduleConfig.startDate ?? '2026-05-28',
    endDate: report.scheduleConfig.endDate ?? '',
    queuePolicy: report.scheduleConfig.queuePolicy ?? 'queue',
  }
  scheduleModalVisible.value = true
}

function confirmSchedule(): void {
  const report = reportDraft.value
  if (!report) {
    scheduleModalVisible.value = false
    return
  }
  if (scheduleDraft.value.updateMode === 'daily' && !permissions.value?.createDailyReport) {
    message.error('暂无按天定时更新权限。')
    return
  }
  if (scheduleDraft.value.updateMode === 'daily' && !scheduleDraft.value.executeTime) {
    message.error('执行时间必填。')
    return
  }
  report.updateMode = scheduleDraft.value.updateMode
  report.scheduleConfig = {
    updateMode: scheduleDraft.value.updateMode,
    executeTime: scheduleDraft.value.updateMode === 'daily' ? scheduleDraft.value.executeTime : undefined,
    startDate: scheduleDraft.value.updateMode === 'daily' ? scheduleDraft.value.startDate : undefined,
    endDate: scheduleDraft.value.updateMode === 'daily' && scheduleDraft.value.endDate ? scheduleDraft.value.endDate : undefined,
    queuePolicy: scheduleDraft.value.updateMode === 'daily' ? scheduleDraft.value.queuePolicy : 'queue',
  }
  scheduleModalVisible.value = false
}

function openDownloadModal(report?: GroupProfileReport): void {
  if (!report?.runtimePermission.canDownload) {
    message.warning('暂无报告下载权限。')
    return
  }
  downloadTarget.value = report
  downloadMessage.value = ''
  downloadFormat.value = 'excel'
  downloadModalVisible.value = true
}

function escapeHtml(value: string | number | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_')
}

function triggerDownload(fileName: string, blob: Blob): void {
  if (typeof document === 'undefined') return
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = safeFileName(fileName)
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 500)
}

function buildExcelHtml(report: GroupProfileReport): string {
  const summaryRows = [
    ['报告名称', report.name],
    ['报告描述', report.description || ''],
    ['主体', report.subjectName],
    ['报告类型', groupProfileReportTypeLabels[report.reportType]],
    ['更新方式', groupProfileUpdateModeLabels[report.updateMode]],
    ['数据更新时间', report.dataUpdatedAt],
    ['分群', report.segments.map((segment) => `${segment.segmentName}(${segment.role === 'target' ? '目标' : '对比'})`).join('、')],
  ]
  const labelRows = report.charts
    .filter((chart) => chart.analysisType === 'label')
    .flatMap((chart) =>
      sortedLabelValues(chart).map((item) => [
        chart.title,
        chart.groupName,
        item.tagName,
        item.value,
        item.uv,
        `${item.labelRatio}%`,
        `${item.labelEffectiveRatio}%`,
        currentRatioMode(report, chart) === 'effective' ? item.labelTgi : item.marketTgi,
        item.dataUpdatedAt,
      ]),
    )
  const metricRows = report.charts
    .filter((chart) => chart.analysisType === 'metric')
    .flatMap((chart) => chart.metricPoints.map((point) => [chart.title, chart.groupName, point.dimension, point.segmentName, point.formattedValue]))
  const featureRows = topFeaturesFor(report).map((feature) => [feature.tagName, feature.tagValue, feature.uv, `${feature.ratio}%`, feature.tgi])
  const table = (title: string, headers: string[], rows: Array<Array<string | number>>) => `
    <h2>${escapeHtml(title)}</h2>
    <table border="1">
      <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>`
  return `
    <html>
      <head><meta charset="utf-8" /></head>
      <body>
        ${table('报告概览', ['字段', '内容'], summaryRows)}
        ${includeAiSummary.value ? table('自动总结', ['标签', '标签值', 'UV', '占比', 'TGI'], featureRows) : ''}
        ${table('标签分析明细', ['图表', '分组', '标签', '标签值', 'UV', '标签占比', '标签有效占比', 'TGI', '数据更新时间'], labelRows)}
        ${table('指标分析明细', ['图表', '分组', '维度', '分群', '指标值'], metricRows)}
      </body>
    </html>`
}

function buildSingleChartExcelHtml(report: GroupProfileReport, chart: GroupProfileChart): string {
  const table = (title: string, headers: string[], rows: Array<Array<string | number>>) => `
    <h2>${escapeHtml(title)}</h2>
    <table border="1">
      <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>`
  const summaryRows = [
    ['报告名称', report.name],
    ['图表名称', chart.title],
    ['图表分组', chart.groupName],
    ['图表类型', chart.analysisType === 'label' ? '标签分析' : '指标分析'],
    ['下载口径', '当前用户二次操作权限校验后的单图明细'],
    ['数据更新时间', report.dataUpdatedAt],
  ]
  const detailRows =
    chart.analysisType === 'label'
      ? sortedLabelValues(chart).map((item) => [
          item.tagName,
          item.value,
          item.uv,
          `${item.labelRatio}%`,
          `${item.labelEffectiveRatio}%`,
          valueTgi(item, chart),
          item.dataUpdatedAt,
        ])
      : chart.metricPoints.map((point) => [point.dimension, point.segmentName, point.formattedValue, point.value])
  return `
    <html>
      <head><meta charset="utf-8" /></head>
      <body>
        ${table('单图概览', ['字段', '内容'], summaryRows)}
        ${
          chart.analysisType === 'label'
            ? table('标签图表明细', ['标签', '标签值', 'UV', '标签占比', '标签有效占比', 'TGI', '数据更新时间'], detailRows)
            : table('指标图表明细', ['维度', '分群', '指标展示值', '指标原始值'], detailRows)
        }
      </body>
    </html>`
}

function downloadSingleChart(chart: GroupProfileChart): void {
  const report = activeReport.value
  if (!report) return
  if (!report.runtimePermission.canDownload) {
    message.warning('暂无报告下载权限。')
    return
  }
  if (!assertChartForAction(chart, '下载单图明细')) return
  const fileName = `${report.name}-${chart.title}-单图明细.xls`
  triggerDownload(fileName, new Blob([buildSingleChartExcelHtml(report, chart)], { type: 'application/vnd.ms-excel;charset=utf-8' }))
  message.success('单图明细 Excel 已生成。')
}

function wrapCanvasText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  const words = text.split('')
  let line = ''
  let nextY = y
  words.forEach((word) => {
    const testLine = `${line}${word}`
    if (context.measureText(testLine).width > maxWidth && line) {
      context.fillText(line, x, nextY)
      line = word
      nextY += lineHeight
      return
    }
    line = testLine
  })
  if (line) context.fillText(line, x, nextY)
  return nextY + lineHeight
}

async function triggerPngDownload(report: GroupProfileReport, fileName: string): Promise<void> {
  if (typeof document === 'undefined') return
  const charts = mainCharts(report)
  const height = Math.max(760, 270 + charts.length * 145)
  const canvas = document.createElement('canvas')
  canvas.width = 1280
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#111827'
  context.font = 'bold 32px sans-serif'
  context.fillText(report.name, 48, 58)
  context.fillStyle = '#4b5563'
  context.font = '18px sans-serif'
  const nextY = wrapCanvasText(context, report.description || '暂无报告描述', 48, 96, 960, 28)
  context.fillStyle = '#6b7280'
  context.font = '16px sans-serif'
  context.fillText(`主体：${report.subjectName}   类型：${groupProfileReportTypeLabels[report.reportType]}   数据更新时间：${report.dataUpdatedAt}`, 48, nextY + 16)
  context.fillText(`目标分群：${report.segments.filter((segment) => segment.role === 'target').map((segment) => segment.segmentName).join('、') || '未配置'}`, 48, nextY + 44)
  let y = nextY + 90
  topFeaturesFor(report).slice(0, 3).forEach((feature, index) => {
    context.fillStyle = '#eff6ff'
    context.fillRect(48 + index * 390, y, 360, 82)
    context.fillStyle = '#1f2937'
    context.font = 'bold 18px sans-serif'
    context.fillText(`${feature.tagName}=${feature.tagValue}`, 66 + index * 390, y + 30)
    context.font = '16px sans-serif'
    context.fillText(`占比 ${feature.ratio}% / TGI ${feature.tgi} / UV ${formatNumber(feature.uv)}`, 66 + index * 390, y + 58)
  })
  y += 124
  charts.forEach((chart) => {
    context.fillStyle = '#111827'
    context.font = 'bold 20px sans-serif'
    context.fillText(chart.title, 48, y)
    context.fillStyle = '#6b7280'
    context.font = '15px sans-serif'
    context.fillText(`分组：${chart.groupName} / 图表类型：${chart.chartType}`, 48, y + 26)
    if (chart.analysisType === 'label') {
      const rows = sortedLabelValues(chart).slice(0, 5)
      const maxRatio = Math.max(1, ...rows.map((row) => valueRatio(row, chart)))
      rows.forEach((row, index) => {
        const barWidth = Math.round((valueRatio(row, chart) / maxRatio) * 420)
        const rowY = y + 56 + index * 18
        context.fillStyle = '#dbeafe'
        context.fillRect(210, rowY - 12, barWidth, 12)
        context.fillStyle = '#374151'
        context.font = '14px sans-serif'
        context.fillText(row.value, 64, rowY)
        context.fillText(`${valueRatio(row, chart)}% / TGI ${valueTgi(row, chart)}`, 650, rowY)
      })
    } else {
      chart.metricPoints.slice(0, 5).forEach((point, index) => {
        context.fillStyle = '#374151'
        context.font = '14px sans-serif'
        context.fillText(`${point.dimension} · ${point.segmentName}：${point.formattedValue}`, 64, y + 56 + index * 20)
      })
    }
    y += 145
  })
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((value) => resolve(value), 'image/png'))
  if (blob) triggerDownload(fileName, blob)
}

async function confirmDownload(): Promise<void> {
  const report = downloadTarget.value ?? activeReport.value
  if (!report) return
  const task = await groupProfileInsightService.createDownloadTask({
    reportId: report.id,
    format: downloadFormat.value,
    includeAiSummary: includeAiSummary.value,
    currentRatioMode: report.ratioMode,
    currentSortMode: report.globalSortMode,
    visibleValueSnapshot: Object.fromEntries(report.charts.map((chart) => [chart.id, chart.displayConfig.visibleValues])),
  })
  if (downloadFormat.value === 'excel') {
    const fileName = task.fileName.replace(/\.xlsx$/, '.xls')
    triggerDownload(fileName, new Blob([buildExcelHtml(report)], { type: 'application/vnd.ms-excel;charset=utf-8' }))
    downloadMessage.value = `${fileName}：${task.message}`
  } else {
    await triggerPngDownload(report, task.fileName)
    downloadMessage.value = `${task.fileName}：${task.message}`
  }
  message.success('下载文件已生成。')
}

async function copyEmbedLink(): Promise<void> {
  const report = activeReport.value
  if (!report) return
  if (!report.runtimePermission.canEmbed) {
    message.warning('暂无嵌出权限。')
    return
  }
  const url = await groupProfileInsightService.copyEmbedLink(report.id)
  try {
    await navigator.clipboard.writeText(url)
    message.success('嵌出链接已复制。')
  } catch {
    message.info(url)
  }
}

function openCopyModal(report?: GroupProfileReport): void {
  const target = report ?? activeReport.value
  if (!target) return
  copyTargetReport.value = target
  copyName.value = `${target.name}_副本`
  copyKeepDailySchedule.value = Boolean(permissions.value?.createDailyReport && target.updateMode === 'daily')
  copyModalVisible.value = true
}

async function confirmCopyReport(): Promise<void> {
  const report = copyTargetReport.value
  if (!report) return
  const result = await groupProfileInsightService.duplicateReport(report.id, copyName.value, { keepDailySchedule: copyKeepDailySchedule.value })
  if (!result.ok) {
    message.error(result.message)
    return
  }
  message.success(result.message)
  copyModalVisible.value = false
  copyTargetReport.value = undefined
  await initWorkbench()
  if (result.id) await router.push(`/user-insight/group-profiles/${result.id}`)
}

async function confirmDeleteReport(): Promise<void> {
  if (!deleteTarget.value) return
  const result = await groupProfileInsightService.deleteReport(deleteTarget.value.id)
  if (!result.ok) {
    message.error(result.message)
    return
  }
  message.success(result.message)
  deleteTarget.value = undefined
  await initWorkbench()
  await router.push('/user-insight/group-profiles')
}

async function openAuditModal(report?: GroupProfileReport): Promise<void> {
  auditTargetReportId.value = report?.id ?? activeReport.value?.id ?? 'all'
  auditRows.value = await groupProfileInsightService.getAuditLogs(auditTargetReportId.value === 'all' ? undefined : auditTargetReportId.value)
  auditSelectedLog.value = auditRows.value[0]
  auditModalVisible.value = true
}

function auditJsonText(value?: string): string {
  if (!value) return '-'
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}

async function toggleFavorite(report: GroupProfileReport): Promise<void> {
  report.favorite = await groupProfileInsightService.toggleFavorite(report.id)
  await searchReports()
}

function currentRatioMode(report: GroupProfileReport | undefined, chart: GroupProfileChart | undefined): GroupProfileRatioMode {
  return chart?.displayConfig.ratioMode ?? report?.ratioMode ?? 'population'
}

function valueRatio(value: GroupProfileLabelValueInsight, chart?: GroupProfileChart): number {
  return currentRatioMode(activeReport.value, chart) === 'effective' ? value.labelEffectiveRatio : value.labelRatio
}

function valueTgi(value: GroupProfileLabelValueInsight, chart?: GroupProfileChart): number {
  return currentRatioMode(activeReport.value, chart) === 'effective' ? value.labelTgi : value.marketTgi
}

function topFeaturesFor(report: GroupProfileReport): Array<{ id: EntityId; tagName: string; tagValue: string; uv: number; ratio: number; tgi: number; score: number }> {
  const mode = currentRatioMode(report, undefined)
  const values = mainCharts(report)
    .filter((chart) => chart.analysisType === 'label')
    .flatMap((chart) => chart.labelValues)
    .filter((item) => item.permission && item.uv >= 1000)
    .map((item) => ({
      id: item.id,
      tagName: item.tagName,
      tagValue: item.value,
      uv: item.uv,
      ratio: mode === 'effective' ? item.labelEffectiveRatio : item.labelRatio,
      tgi: mode === 'effective' ? item.labelTgi : item.marketTgi,
      score: item.uv * (mode === 'effective' ? item.labelTgi : item.marketTgi),
    }))
    .sort((a, b) => b.score - a.score)
  return values.slice(0, 5)
}

function sortedLabelValues(chart: GroupProfileChart): GroupProfileLabelValueInsight[] {
  const mode = chart.sortConfig || activeReport.value?.globalSortMode || 'taxonomy'
  const visible = new Set(chart.displayConfig.visibleValues.length ? chart.displayConfig.visibleValues : chart.labelValues.map((item) => item.value))
  const rows = chart.labelValues.filter((item) => visible.has(item.value) && item.permission)
  return [...rows].sort((a, b) => {
    if (mode === 'taxonomy') return a.taxonomyOrder - b.taxonomyOrder
    if (mode === 'value_asc') return a.value.localeCompare(b.value, 'zh-CN')
    if (mode === 'value_desc') return b.value.localeCompare(a.value, 'zh-CN')
    if (mode === 'uv_ratio_asc') return valueRatio(a, chart) - valueRatio(b, chart)
    if (mode === 'uv_ratio_desc') return valueRatio(b, chart) - valueRatio(a, chart)
    if (mode === 'tgi_asc') return valueTgi(a, chart) - valueTgi(b, chart)
    return valueTgi(b, chart) - valueTgi(a, chart)
  })
}

function labelChartOption(chart: GroupProfileChart): EChartsOption {
  const rows = sortedLabelValues(chart)
  const names = rows.map((item) => item.value)
  const values = rows.map((item) => valueRatio(item, chart))
  const tgiValues = rows.map((item) => valueTgi(item, chart))
  if (chart.chartType === 'pie' || chart.chartType === 'donut') {
    return {
      tooltip: { trigger: 'item', formatter: '{b}<br/>占比：{c}%<br/>占比份额：{d}%' },
      legend: { bottom: 0 },
      series: [
        {
          type: 'pie',
          radius: chart.chartType === 'donut' ? ['45%', '68%'] : '68%',
          data: rows.map((item) => ({ name: item.value, value: valueRatio(item, chart) })),
        },
      ],
    }
  }
  const horizontal = chart.chartType === 'bar'
  return {
    grid: { top: 28, right: chart.displayConfig.showTgi ? 64 : 24, bottom: horizontal ? 28 : 54, left: horizontal ? 100 : 44 },
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
        const list = Array.isArray(params) ? (params as Array<{ dataIndex: number }>) : []
        const index = list[0]?.dataIndex ?? 0
        const item = rows[index]
        return item
          ? `${item.tagName} / ${item.value}<br/>分群用户数量：${formatNumber(item.segmentTotal)}<br/>分群有效用户数量：${formatNumber(item.tagValidUv)}<br/>标签占比：${item.labelRatio}%<br/>标签有效占比：${item.labelEffectiveRatio}%<br/>TGI：${valueTgi(item, chart)}<br/>数据更新时间：${item.dataUpdatedAt}`
          : ''
      },
    },
    legend: { top: 0 },
    xAxis: horizontal ? { type: 'value', axisLabel: { formatter: '{value}%' } } : { type: 'category', data: names, axisLabel: { interval: 0, rotate: 18 } },
    yAxis: horizontal
      ? { type: 'category', data: names }
      : [
          { type: 'value', axisLabel: { formatter: '{value}%' } },
          { type: 'value', show: chart.displayConfig.showTgi },
        ],
    series: [
      {
        name: currentRatioMode(activeReport.value, chart) === 'effective' ? '标签有效占比' : '标签占比',
        type: 'bar' as const,
        barWidth: 18,
        data: values,
      },
      ...(chart.displayConfig.showTgi
        ? [
            {
              name: currentRatioMode(activeReport.value, chart) === 'effective' ? '标签 TGI' : '大盘 TGI',
              type: horizontal ? ('bar' as const) : ('line' as const),
              yAxisIndex: horizontal ? 0 : 1,
              data: tgiValues,
              markLine: { symbol: 'none', data: [{ yAxis: horizontal ? undefined : 100, xAxis: horizontal ? 100 : undefined }], lineStyle: { type: 'dashed' as const, color: '#8b95a5' } },
            },
          ]
        : []),
    ],
  }
}

function metricChartOption(chart: GroupProfileChart): EChartsOption {
  const dimensions = [...new Set(chart.metricPoints.map((point) => point.dimension))]
  const segmentNames = [...new Set(chart.metricPoints.map((point) => point.segmentName))]
  if (chart.chartType === 'column') {
    return {
      tooltip: { trigger: 'axis' },
      legend: { top: 0 },
      grid: { top: 36, right: 24, bottom: 42, left: 56 },
      xAxis: { type: 'category', data: dimensions },
      yAxis: { type: 'value' },
      series: segmentNames.map((segmentName) => ({
        name: segmentName,
        type: 'bar',
        data: dimensions.map((dimension) => chart.metricPoints.find((point) => point.dimension === dimension && point.segmentName === segmentName)?.value ?? 0),
      })),
    }
  }
  return {
    tooltip: { trigger: 'axis' },
    legend: { top: 0 },
    grid: { top: 36, right: 24, bottom: 42, left: 56 },
    xAxis: { type: 'category', data: dimensions },
    yAxis: { type: 'value' },
    series: segmentNames.map((segmentName) => ({
      name: segmentName,
      type: 'line',
      smooth: true,
      data: dimensions.map((dimension) => chart.metricPoints.find((point) => point.dimension === dimension && point.segmentName === segmentName)?.value ?? 0),
    })),
  }
}

function removeLinkedCharts(report: GroupProfileReport, chart: GroupProfileChart): void {
  const linkedIds = new Set(chart.linkageConfig.linkedChartIds)
  report.charts = report.charts.filter((item) => !linkedIds.has(item.id))
  chart.linkageConfig.linkedChartIds = []
}

function refreshLinkedCharts(chart: GroupProfileChart): void {
  const report = activeReport.value
  if (!report || chart.analysisType !== 'label') return
  removeLinkedCharts(report, chart)
  if (!chart.linkageConfig.enabled || !chart.linkageConfig.linkedTagIds.length) return
  const selectedValue = chart.linkageConfig.selectedValue ?? sortedLabelValues(chart)[0]?.value ?? ''
  const linkedCharts = chart.linkageConfig.linkedTagIds
    .filter((tagId) => tagId !== chart.labelConfig?.tagId)
    .flatMap((tagId) => {
      const label = findLabel(tagId)
      const linkedChart = buildLabelChart(tagId, report, {
        title: `${selectedValue || '当前选中'}人群 · ${label?.name ?? '联动标签'}分布`,
        groupName: '联动分析',
        seedText: `${chart.id}:${selectedValue}:${tagId}`,
        idPrefix: 'linked-chart',
      })
      return linkedChart ? [linkedChart] : []
    })
  linkedCharts.forEach((linkedChart, index) => {
    linkedChart.orderIndex = chart.orderIndex + index + 1
  })
  chart.linkageConfig.linkedChartIds = linkedCharts.map((linkedChart) => linkedChart.id)
  report.charts.push(...linkedCharts)
}

function handleChartClick(chart: GroupProfileChart, params: unknown): void {
  const event = params as ChartClickEvent
  if (!event.name || chart.analysisType !== 'label') return
  chart.linkageConfig.selectedValue = event.name
  if (chart.linkageConfig.enabled) {
    refreshLinkedCharts(chart)
    message.info(`联动图表已切换到「${event.name}」人群。`)
  }
}

function switchRatioMode(mode: GroupProfileRatioMode): void {
  const report = reportDraft.value ?? currentReport.value
  if (!report) return
  report.ratioMode = mode
  report.charts.forEach((chart) => (chart.displayConfig.ratioMode = mode))
}

function switchShowTgi(value: boolean): void {
  const report = reportDraft.value ?? currentReport.value
  if (!report) return
  report.showTgi = value
  report.charts.forEach((chart) => (chart.displayConfig.showTgi = value))
}

function switchGlobalSort(mode: GroupProfileSortMode): void {
  const report = reportDraft.value ?? currentReport.value
  if (!report) return
  report.globalSortMode = mode
  report.charts.filter((chart) => chart.analysisType === 'label').forEach((chart) => (chart.sortConfig = mode))
}

function openGroupModal(): void {
  const report = reportDraft.value ?? currentReport.value
  if (!report) return
  groupModeDraft.value = report.groupMode
  const charts = mainCharts(report)
  const groups = report.chartGroups.length
    ? report.chartGroups
    : [...new Set(charts.map((chart) => chart.groupName))].map((name, index) => ({ id: `chart-group-${index + 1}`, name, orderIndex: index + 1 }))
  chartGroupDraft.value = groups.map((group) => ({
    id: group.id,
    name: group.name,
    chartIds: charts.filter((chart) => chart.groupName === group.name).map((chart) => chart.id),
  }))
  const assigned = new Set(chartGroupDraft.value.flatMap((group) => group.chartIds))
  const unassigned = charts.filter((chart) => !assigned.has(chart.id)).map((chart) => chart.id)
  if (unassigned.length) {
    chartGroupDraft.value.push({ id: `chart-group-unassigned-${Date.now()}`, name: '未分组', chartIds: unassigned })
  }
  groupModalVisible.value = true
}

function addChartGroup(): void {
  chartGroupDraft.value.push({ id: `chart-group-${Date.now()}`, name: `自定义分组 ${chartGroupDraft.value.length + 1}`, chartIds: [] })
}

function removeChartGroup(groupId: EntityId): void {
  const [removedGroup] = chartGroupDraft.value.filter((group) => group.id === groupId)
  chartGroupDraft.value = chartGroupDraft.value.filter((group) => group.id !== groupId)
  if (!removedGroup?.chartIds.length) return
  if (!chartGroupDraft.value.length) addChartGroup()
  chartGroupDraft.value[0]?.chartIds.push(...removedGroup.chartIds)
}

function chartTitleById(chartId: EntityId): string {
  return activeReport.value?.charts.find((chart) => chart.id === chartId)?.title ?? '未知图表'
}

function handleChartDragStart(groupId: EntityId, chartId: EntityId): void {
  draggedGroupId.value = groupId
  draggedChartId.value = chartId
}

function handleChartDrop(targetGroupId: EntityId, beforeChartId?: EntityId): void {
  if (!draggedChartId.value) return
  const sourceGroup = chartGroupDraft.value.find((group) => group.id === draggedGroupId.value)
  const targetGroup = chartGroupDraft.value.find((group) => group.id === targetGroupId)
  if (!targetGroup) return
  const sourceIndex = sourceGroup?.chartIds.indexOf(draggedChartId.value) ?? -1
  if (sourceGroup && sourceIndex >= 0) sourceGroup.chartIds.splice(sourceIndex, 1)
  const cleanTargetIds = targetGroup.chartIds.filter((id) => id !== draggedChartId.value)
  const insertIndex = beforeChartId ? Math.max(0, cleanTargetIds.indexOf(beforeChartId)) : cleanTargetIds.length
  cleanTargetIds.splice(insertIndex, 0, draggedChartId.value)
  targetGroup.chartIds = cleanTargetIds
  draggedGroupId.value = ''
  draggedChartId.value = ''
}

function moveDraftChart(group: ChartGroupDraft, chartId: EntityId, direction: -1 | 1): void {
  const index = group.chartIds.indexOf(chartId)
  const nextIndex = index + direction
  if (index < 0 || nextIndex < 0 || nextIndex >= group.chartIds.length) return
  const next = [...group.chartIds]
  ;[next[index], next[nextIndex]] = [next[nextIndex]!, next[index]!]
  group.chartIds = next
}

function confirmChartGroups(): void {
  const report = reportDraft.value ?? currentReport.value
  if (!report) return
  if (groupModeDraft.value === 'custom' && chartGroupDraft.value.some((group) => !group.name.trim())) {
    message.error('分组名称不能为空。')
    return
  }
  report.groupMode = groupModeDraft.value
  if (groupModeDraft.value === 'custom') {
    report.chartGroups = chartGroupDraft.value.map((group, index) => ({ id: group.id, name: group.name, orderIndex: index + 1 }))
    let orderIndex = 1
    chartGroupDraft.value.forEach((group) => {
      group.chartIds.forEach((chartId) => {
        const chart = report.charts.find((item) => item.id === chartId)
        if (!chart) return
        chart.groupName = group.name
        chart.orderIndex = orderIndex
        orderIndex += 1
        linkedChartsFor(chart).forEach((linkedChart) => {
          linkedChart.groupName = group.name
          linkedChart.orderIndex = orderIndex
          orderIndex += 1
        })
      })
    })
  } else {
    const orderedGroups = [...new Set(report.charts.map((chart) => chart.groupName))].map<GroupProfileChartGroup>((name, index) => ({
      id: `chart-group-taxonomy-${index + 1}`,
      name,
      orderIndex: index + 1,
    }))
    report.chartGroups = orderedGroups
  }
  groupModalVisible.value = false
  message.success('图表排序分组已保存。')
}

function openTemplateModal(template?: GroupProfileTemplate): void {
  templateDraft.value = template
    ? { id: template.id, name: template.name, description: template.description, templateType: template.templateType, scope: template.scope }
    : { id: '', name: '我的群体画像模板', description: '', templateType: activeDetailTab.value === 'metric' ? 'metric' : 'label', scope: 'personal' }
  templateModalVisible.value = true
}

async function confirmTemplate(): Promise<void> {
  const report = activeReport.value
  const templateCharts = report?.charts.filter((chart) => chart.analysisType === templateDraft.value.templateType) ?? []
  const template: GroupProfileTemplate = {
    id: templateDraft.value.id || `template-${Date.now()}`,
    name: templateDraft.value.name,
    description: templateDraft.value.description,
    templateType: templateDraft.value.templateType,
    scope: templateDraft.value.scope,
    config: {
      chartIds: templateCharts.map((chart) => chart.id),
      labels: templateCharts.flatMap((chart) => (chart.labelConfig?.tagId ? [chart.labelConfig.tagId] : [])),
      metrics: templateCharts.flatMap((chart) => (chart.metricConfig?.yAxisMetricId ? [chart.metricConfig.yAxisMetricId] : [])),
      groupMode: report?.groupMode ?? 'taxonomy',
      sortMode: report?.globalSortMode ?? 'taxonomy',
      charts: cloneValue(templateCharts),
      chartGroups: cloneValue(report?.chartGroups ?? []),
    },
    creator: { id: 'u-xucheng', name: '许澄', department: '用户洞察团队' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sharedWith: [],
    runtimePermission: { canUse: true, canEdit: true, canDelete: true, canShare: true },
  }
  const result = await groupProfileInsightService.saveTemplate(template)
  if (!result.ok) {
    message.error(result.message)
    return
  }
  message.success(result.message)
  templateModalVisible.value = false
  await initWorkbench()
}

async function deleteTemplate(template: GroupProfileTemplate): Promise<void> {
  const result = await groupProfileInsightService.deleteTemplate(template.id)
  if (!result.ok) {
    message.error(result.message)
    return
  }
  message.success(result.message)
  await initWorkbench()
}

function openTemplatePermission(template: GroupProfileTemplate): void {
  templatePermissionTarget.value = template
  templatePermissionDraft.value = cloneValue(template.sharedWith)
  permissionPrincipalType.value = 'group'
  permissionPrincipalName.value = '广告运营用户组'
  permissionLevel.value = 'view'
  templatePermissionModalVisible.value = true
}

function addTemplatePermission(): void {
  const duplicate = templatePermissionDraft.value.some((item) => item.principalName === permissionPrincipalName.value)
  if (duplicate) {
    templatePermissionDraft.value = templatePermissionDraft.value.map((item) =>
      item.principalName === permissionPrincipalName.value ? { ...item, permission: 'view' } : item,
    )
    return
  }
  const permission = groupProfileInsightService.makePermission(templatePermissionTarget.value?.id ?? '', permissionPrincipalName.value, 'view')
  permission.principalType = permissionPrincipalType.value
  permission.permission = 'view'
  templatePermissionDraft.value.push(permission)
}

async function confirmTemplatePermissions(): Promise<void> {
  const template = templatePermissionTarget.value
  if (!template) return
  const result = await groupProfileInsightService.updateTemplatePermissions(template.id, templatePermissionDraft.value)
  if (!result.ok) {
    message.error(result.message)
    return
  }
  message.success(result.message)
  templatePermissionModalVisible.value = false
  await initWorkbench()
}

function openValueDisplayModal(chart: GroupProfileChart): void {
  if (!assertChartForAction(chart, '调整标签值展示')) return
  valueDisplayChartId.value = chart.id
  valueDisplayDraft.value = [...chart.displayConfig.visibleValues]
  valueDisplayModalVisible.value = true
}

function confirmValueDisplay(): void {
  const report = reportDraft.value ?? currentReport.value
  const chart = report?.charts.find((item) => item.id === valueDisplayChartId.value)
  if (!chart) return
  if (!valueDisplayDraft.value.length) {
    message.error('至少选择 1 个标签值。')
    return
  }
  chart.displayConfig.visibleValues = [...valueDisplayDraft.value]
  valueDisplayModalVisible.value = false
}

function resetValueDisplay(): void {
  const report = reportDraft.value ?? currentReport.value
  const chart = report?.charts.find((item) => item.id === valueDisplayChartId.value)
  if (!chart) return
  valueDisplayDraft.value = chart.labelValues.slice(0, chart.displayConfig.topN).map((item) => item.value)
}

function openLinkageModal(chart: GroupProfileChart): void {
  if (!assertChartForAction(chart, '配置图表联动')) return
  linkageChartId.value = chart.id
  linkageSelectedTagIds.value = chart.linkageConfig.linkedTagIds.filter((tagId) => tagId !== chart.labelConfig?.tagId)
  linkageModalVisible.value = true
}

function confirmLinkage(): void {
  const report = reportDraft.value ?? currentReport.value
  const chart = report?.charts.find((item) => item.id === linkageChartId.value)
  if (!chart) return
  const selectedTagIds = [...new Set(linkageSelectedTagIds.value)].filter((tagId) => tagId !== chart.labelConfig?.tagId && findLabel(tagId)?.permission)
  const deniedCount = linkageSelectedTagIds.value.length - selectedTagIds.length
  chart.linkageConfig.enabled = selectedTagIds.length > 0
  chart.linkageConfig.linkedTagIds = selectedTagIds
  refreshLinkedCharts(chart)
  linkageModalVisible.value = false
  message.success(chart.linkageConfig.enabled ? `图表联动已配置${deniedCount > 0 ? `，已跳过 ${deniedCount} 个不可用标签` : ''}。` : '已关闭图表联动。')
}

function openChartTitleModal(chart: GroupProfileChart): void {
  chartTitleTargetId.value = chart.id
  chartTitleDraft.value = chart.title
  chartTitleModalVisible.value = true
}

function confirmChartTitle(): void {
  const report = reportDraft.value ?? currentReport.value
  const chart = report?.charts.find((item) => item.id === chartTitleTargetId.value)
  if (!chart) return
  if (!chartTitleDraft.value.trim()) {
    message.error('标题必填。')
    return
  }
  if (chartTitleDraft.value.length > 100) {
    message.error('标题最多 100 字。')
    return
  }
  chart.title = chartTitleDraft.value
  chartTitleModalVisible.value = false
}

function requestDeleteChart(chart: GroupProfileChart): void {
  if (chart.linkageConfig.linkedChartIds.length) {
    deleteChartTarget.value = chart
    return
  }
  deleteChart(chart)
}

function deleteChart(chart: GroupProfileChart): void {
  const report = reportDraft.value
  if (!report) {
    message.warning('只有编辑模式下才能删除图表。')
    return
  }
  report.charts = report.charts.filter((item) => item.id !== chart.id && !chart.linkageConfig.linkedChartIds.includes(item.id))
  deleteChartTarget.value = undefined
  syncReportType(report)
}

function switchChartType(chart: GroupProfileChart, chartType: GroupProfileChartType): void {
  chart.chartType = chartType
}

function openSaveSegmentModal(chart?: GroupProfileChart): void {
  if (chart) selectedChartId.value = chart.id
  const selected = chart ?? selectedChart.value
  if (selected && !assertChartForAction(selected, '存为分群')) return
  saveSegmentMode.value = 'selected_tags'
  saveSegmentSelectedIds.value = selectedChartValues.value.filter((item) => item.selected).map((item) => item.id)
  saveSegmentSourceSegmentIds.value = activeReport.value?.segments.map((segment) => segment.id) ?? []
  saveSegmentModalVisible.value = true
}

async function confirmSaveSegment(): Promise<void> {
  const report = activeReport.value
  if (!report) return
  const result = await groupProfileInsightService.saveSegmentFromReport({
    mode: saveSegmentMode.value,
    reportId: report.id,
    selectedTagValueIds: saveSegmentSelectedIds.value,
    segmentIds: saveSegmentSourceSegmentIds.value,
    conditionLogic: saveSegmentLogic.value,
    outputIdType: saveSegmentOutputIdType.value,
    name: saveSegmentName.value,
    description: saveSegmentDescription.value,
    authorizedTo: ['增长运营角色'],
    groupId: saveSegmentGroupId.value,
  })
  if (!result.ok) {
    message.error(result.message)
    return
  }
  message.success(result.message)
  saveSegmentModalVisible.value = false
  await initWorkbench()
}

function openTgiModal(config?: GroupProfileTgiConfig): void {
  tgiDraft.value = config
    ? {
        id: config.id,
        name: config.name,
        subjectType: config.subjectType,
        calculationType: config.calculationType,
        baseType: config.baseType,
        baseSegmentId: config.baseSegmentId,
        baseTagId: config.baseTagId ?? 'tag-city-tier',
        scope: config.scope,
        scopeTargetName: config.scopeTargetName,
      }
    : { id: `tgi-${Date.now()}`, name: '自定义 TGI', subjectType: 'user', calculationType: 'label_ratio', baseType: 'segment', baseSegmentId: 'segment-high-value-active', baseTagId: 'tag-city-tier', scope: 'project', scopeTargetName: '全项目' }
  tgiModalVisible.value = true
}

async function confirmTgi(): Promise<void> {
  if (tgiDraft.value.baseType === 'segment' && !assertResourceForAction('segment', tgiDraft.value.baseSegmentId, '配置 TGI 基准')) return
  if (tgiDraft.value.baseType === 'tag' && !assertResourceForAction('tag', tgiDraft.value.baseTagId, '配置 TGI 基准')) return
  const config: GroupProfileTgiConfig = {
    id: tgiDraft.value.id || `tgi-${Date.now()}`,
    name: tgiDraft.value.name,
    subjectType: tgiDraft.value.subjectType,
    subjectName: subjects.value.find((subject) => subject.type === tgiDraft.value.subjectType)?.name ?? '用户',
    calculationType: tgiDraft.value.calculationType,
    baseType: tgiDraft.value.baseType,
    baseSegmentId: tgiDraft.value.baseType === 'segment' ? tgiDraft.value.baseSegmentId : '',
    baseSegmentName: '',
    baseSegmentCount: 0,
    baseTagId: tgiDraft.value.baseType === 'tag' ? tgiDraft.value.baseTagId : undefined,
    baseTagName: '',
    scope: tgiDraft.value.scope,
    scopeTargetName: tgiDraft.value.scopeTargetName,
    status: 'enabled',
    formulaPreview: '',
    creator: { id: 'u-xucheng', name: '许澄', department: '用户洞察团队' },
    updatedAt: new Date().toISOString(),
  }
  const result = await groupProfileInsightService.saveTgiConfig(config)
  if (!result.ok) {
    message.error(result.message)
    return
  }
  message.success(result.message)
  tgiModalVisible.value = false
  await initWorkbench()
}
</script>

<template>
  <n-spin :show="loading">
    <div class="group-profile-page">
      <section v-if="currentPage === 'list'" class="page-section">
        <div class="page-header">
          <div>
            <h1 class="page-title">私域群体画像</h1>
            <p class="page-description">围绕目标分群生成画像报告，分析标签显著性、指标表现、TGI 差异，并沉淀为可继续运营的用户分群。</p>
          </div>
          <n-space>
            <n-tooltip v-if="!permissions?.createManualReport" trigger="hover">
              <template #trigger>
                <n-button disabled>
                  <template #icon><n-icon><AddOutline /></n-icon></template>
                  新建报告
                </n-button>
              </template>
              暂无群体画像报告创建权限，请联系项目管理员开通。
            </n-tooltip>
            <n-button v-else type="primary" @click="openCreateSubjectModal">
              <template #icon><n-icon><AddOutline /></n-icon></template>
              新建报告
            </n-button>
            <n-button v-if="permissions?.viewTemplate" @click="router.push('/user-insight/group-profiles/templates')">
              <template #icon><n-icon><SettingsOutline /></n-icon></template>
              管理模板
            </n-button>
            <n-button v-if="featureFlags?.customTgiEnabled && permissions?.manageTgi" @click="router.push('/user-insight/group-profiles/tgi')">
              TGI 配置
            </n-button>
          </n-space>
        </div>

        <n-card class="section-card" :bordered="false">
          <n-grid :cols="4" :x-gap="12" :y-gap="12">
            <n-gi>
              <n-input v-model:value="filters.keyword" placeholder="请输入报告名称或创建人" clearable @keyup.enter="searchReports">
                <template #prefix><n-icon><SearchOutline /></n-icon></template>
              </n-input>
            </n-gi>
            <n-gi><n-select v-model:value="filters.groupIds" multiple clearable placeholder="报告分组" :options="groupOptions" /></n-gi>
            <n-gi><n-select v-model:value="filters.subjectTypes" multiple clearable placeholder="主体" :options="subjectOptions" /></n-gi>
            <n-gi><n-select v-model:value="filters.reportTypes" multiple clearable placeholder="报告类型" :options="reportTypeOptions" /></n-gi>
            <n-gi><n-select v-model:value="filters.creatorIds" multiple clearable placeholder="创建人" :options="creatorOptions" /></n-gi>
            <n-gi><n-select v-model:value="filters.updateModes" multiple clearable placeholder="更新方式" :options="updateModeOptions" /></n-gi>
            <n-gi>
              <n-radio-group v-model:value="filters.favoriteState">
                <n-radio-button value="all">全部</n-radio-button>
                <n-radio-button value="favorite">我收藏的</n-radio-button>
                <n-radio-button value="not_favorite">未收藏</n-radio-button>
              </n-radio-group>
            </n-gi>
            <n-gi>
              <n-space>
                <n-button @click="searchReports">搜索</n-button>
                <n-button @click="resetFilters">重置</n-button>
              </n-space>
            </n-gi>
            <n-gi><n-date-picker v-model:value="filters.createdRange" type="daterange" clearable start-placeholder="创建开始" end-placeholder="创建结束" /></n-gi>
            <n-gi><n-date-picker v-model:value="filters.updatedRange" type="daterange" clearable start-placeholder="更新开始" end-placeholder="更新结束" /></n-gi>
          </n-grid>
        </n-card>

        <n-card class="section-card" :bordered="false">
          <n-data-table :columns="reportColumns" :data="reportRows" :loading="tableLoading" :bordered="false" :scroll-x="1480" />
          <n-empty v-if="!tableLoading && !reportRows.length" class="empty-state" :description="permissions?.createManualReport ? '暂无群体画像报告。你可以点击“新建报告”创建第一份报告。' : '暂无可查看的群体画像报告。'" />
          <div class="pagination-row">
            <n-pagination v-model:page="filters.page" v-model:page-size="filters.pageSize" :item-count="reportTotal" show-size-picker :page-sizes="[10, 20, 50]" />
          </div>
        </n-card>
      </section>

      <section v-else-if="currentPage === 'new' || currentPage === 'edit' || currentPage === 'detail'" class="page-section">
        <template v-if="activeReport">
          <div class="page-header">
            <div class="title-block">
              <n-input v-if="editable" v-model:value="activeReport.name" class="title-input" placeholder="请输入报告名称" maxlength="100" />
              <div v-else>
                <h1 class="page-title">{{ activeReport.name }}</h1>
                <p class="page-description">{{ activeReport.description || '暂无报告描述' }}</p>
              </div>
              <n-space size="small">
                <n-tag :type="statusTag(activeReport.status)">{{ groupProfileStatusLabels[activeReport.status] }}</n-tag>
                <n-tag>{{ groupProfileReportTypeLabels[activeReport.reportType] }}</n-tag>
                <n-tag>数据更新时间：{{ activeReport.dataUpdatedAt }}</n-tag>
                <n-tag v-if="featureFlags?.dataPermissionEnabled" type="info">使用创建人数据权限计算</n-tag>
              </n-space>
            </div>
            <n-space>
              <n-button v-if="!editable && activeReport.runtimePermission.canEdit" type="primary" @click="router.push(`/user-insight/group-profiles/${activeReport.id}/edit`)">
                <template #icon><n-icon><CreateOutline /></n-icon></template>
                编辑
              </n-button>
              <n-button v-if="editable" @click="openDescriptionModal">描述</n-button>
              <n-button :loading="actionLoading" @click="queryReport">
                <template #icon><n-icon><PlayOutline /></n-icon></template>
                查询报告
              </n-button>
              <n-button v-if="editable" type="primary" :loading="actionLoading" @click="saveReport">
                <template #icon><n-icon><SaveOutline /></n-icon></template>
                保存
              </n-button>
              <n-button v-if="activeReport.runtimePermission.canDownload" @click="openDownloadModal(activeReport)">
                <template #icon><n-icon><CloudDownloadOutline /></n-icon></template>
                下载
              </n-button>
              <n-dropdown
                :options="[
                  { label: '复制嵌出链接', key: 'embed' },
                  { label: '设置报告更新方式', key: 'schedule' },
                  { label: '权限管理', key: 'permission' },
                  { label: '复制报告', key: 'copy' },
                  { label: '审计日志', key: 'audit' },
                  ...(editable ? [{ label: '存为模板', key: 'template' }, { label: '图表排序分组', key: 'groups' }] : []),
                  { label: '删除报告', key: 'delete' },
                ]"
                @select="
                  (key: string) => {
                    if (key === 'embed') copyEmbedLink()
                    if (key === 'schedule') openScheduleModal()
                    if (key === 'permission') openPermissionModal()
                    if (key === 'copy') openCopyModal()
                    if (key === 'audit') openAuditModal()
                    if (key === 'template') openTemplateModal()
                    if (key === 'groups') openGroupModal()
                    if (key === 'delete') deleteTarget = activeReport
                  }
                "
              >
                <n-button>...</n-button>
              </n-dropdown>
            </n-space>
          </div>

          <n-alert v-if="activeReport.invalidReason" type="warning" class="section-card">
            {{ activeReport.invalidReason }}
          </n-alert>
          <n-alert v-if="dataPermissionNote" type="info" class="section-card">
            {{ dataPermissionNote }}
          </n-alert>
          <n-card v-if="latestQueryTask" class="section-card" :bordered="false">
            <template #header>
              <n-space justify="space-between" align="center">
                <span>最近查询任务</span>
                <n-space size="small" align="center">
                  <n-tag size="small" :type="taskStatusTag(latestQueryTask.status)">{{ taskStatusLabel(latestQueryTask.status) }}</n-tag>
                  <span class="muted">task_id：{{ latestQueryTask.id }}</span>
                </n-space>
              </n-space>
            </template>
            <n-space vertical>
              <span class="muted">{{ queryStageLabel(latestQueryTask.stage) }} / {{ latestQueryTask.message }}</span>
              <n-data-table :columns="queryTaskChartColumns" :data="latestQueryTask.chartResults" :bordered="false" size="small" />
            </n-space>
          </n-card>
          <n-alert v-if="latestScheduleTask" :type="latestScheduleTask.status === 'failed' ? 'error' : latestScheduleTask.status === 'skipped' ? 'warning' : 'info'" class="section-card">
            最近定时任务：{{ formatDateTime(latestScheduleTask.scheduledAt) }} / {{ taskStatusLabel(latestScheduleTask.status) }} / {{ latestScheduleTask.message }}
          </n-alert>

          <n-grid :cols="4" :x-gap="14" :y-gap="14" class="summary-grid">
            <n-gi>
              <n-card :bordered="false">
                <n-statistic label="目标分群人数" :value="targetSegments.reduce((sum, segment) => sum + segment.estimatedCount, 0)" />
              </n-card>
            </n-gi>
            <n-gi>
              <n-card :bordered="false">
                <n-statistic label="对比分群数" :value="compareSegments.length" />
              </n-card>
            </n-gi>
            <n-gi>
              <n-card :bordered="false">
                <n-statistic label="标签图表" :value="labelCharts.length" />
              </n-card>
            </n-gi>
            <n-gi>
              <n-card :bordered="false">
                <n-statistic label="指标图表" :value="metricCharts.length" />
              </n-card>
            </n-gi>
          </n-grid>

          <n-card class="section-card" :bordered="false">
            <template #header>
              <n-space align="center" justify="space-between">
                <span>分析对象与对比分群</span>
                <n-space v-if="editable">
                  <n-button size="small" @click="openSegmentSelect('target')">+ 人群包</n-button>
                  <n-button size="small" @click="openCustomRule('target')">自定义圈选</n-button>
                  <n-button size="small" @click="openSegmentSelect('compare')">增加对比分群</n-button>
                  <n-button size="small" :loading="actionLoading" @click="estimateSegments">预估分群</n-button>
                </n-space>
              </n-space>
            </template>
            <n-empty v-if="!activeReport.segments.length" description="当前主体下暂无可用分群，请先创建或申请分群权限。" />
            <div v-else class="segment-list">
              <div v-for="segment in activeReport.segments" :key="segment.id" class="segment-row">
                <n-space vertical size="small">
                  <n-space align="center">
                    <n-tag :type="segment.role === 'target' ? 'success' : 'info'">{{ segment.role === 'target' ? '目标分群' : '对比分群' }}</n-tag>
                    <n-input v-if="editable" v-model:value="segment.segmentName" size="small" class="segment-name-input" />
                    <strong v-else>{{ segment.segmentName }}</strong>
                    <n-tag>{{ segment.sourceType === 'existing' ? '已有分群' : '自定义圈选' }}</n-tag>
                  </n-space>
                  <span class="muted">{{ segment.originalName }} / {{ segment.outputIdType }} / {{ segment.subjectName }}</span>
                </n-space>
                <n-space align="center">
                  <n-tag :type="segment.estimateStatus === 'success' ? 'success' : segment.estimateStatus === 'failed' ? 'error' : 'default'">
                    {{ segment.estimateStatus === 'success' ? `${formatNumber(segment.estimatedCount)} 人` : segment.failedReason || segment.estimateStatus }}
                  </n-tag>
                  <n-button v-if="editable" text type="error" @click="removeSegment(segment.id)">删除</n-button>
                </n-space>
              </div>
            </div>
          </n-card>

          <n-card v-if="editable" class="section-card" :bordered="false">
            <template #header>分析方式与配置</template>
            <n-space align="center">
              <n-button type="primary" @click="addDefaultCharts">
                <template #icon><n-icon><BarChartOutline /></n-icon></template>
                标签分析
              </n-button>
              <n-button @click="openLabelSelect">选择标签</n-button>
              <n-tooltip v-if="!hasMetricAbility" trigger="hover">
                <template #trigger><n-button disabled>指标分析</n-button></template>
                指标分析为增值模块，如需使用请联系商务人员。
              </n-tooltip>
              <n-button v-else @click="openMetricModal()">添加指标图表</n-button>
              <n-select v-model:value="selectedTemplateId" class="template-select" placeholder="使用模板" clearable :options="templates.map((template) => ({ label: `${template.name} / ${templateScopeLabel(template.scope)}`, value: template.id }))" @update:value="(value) => value && useTemplate(templates.find((template) => template.id === value)!)" />
              <n-button @click="openTemplateModal()">存为模板</n-button>
            </n-space>
          </n-card>

          <n-tabs v-model:value="activeDetailTab" type="line" animated class="section-card">
            <n-tab-pane name="interpretation" tab="报告解读">
              <n-grid :cols="2" :x-gap="14" :y-gap="14">
                <n-gi>
                  <n-card :bordered="false" title="自动总结">
                    <n-empty v-if="!topFeatures.length" description="当前报告暂无足够显著特征。" />
                    <n-space v-else vertical>
                      <n-alert v-for="feature in topFeatures" :key="feature.id" type="info">
                        {{ feature.tagName }} = {{ feature.tagValue }}，占比 {{ feature.ratio }}%，TGI {{ feature.tgi }}，覆盖 {{ formatNumber(feature.uv) }} 人。
                      </n-alert>
                    </n-space>
                  </n-card>
                </n-gi>
                <n-gi>
                  <n-card :bordered="false" title="覆盖率与显著性散点图">
                    <v-chart class="chart" :option="scatterOption" autoresize />
                  </n-card>
                </n-gi>
              </n-grid>
              <n-grid :cols="2" :x-gap="14" :y-gap="14" class="interpretation-grid">
                <n-gi>
                  <n-card :bordered="false" title="单分群标签概览">
                    <n-data-table
                      :columns="[
                        { title: '角色', key: 'role', width: 90 },
                        { title: '分群', key: 'segmentName' },
                        { title: '人数', key: 'estimatedCount', render: (row: SegmentOverviewRow) => formatNumber(row.estimatedCount) },
                        { title: '占比', key: 'share', render: (row: SegmentOverviewRow) => `${row.share}%` },
                        { title: '显著特征', key: 'topFeature' },
                      ]"
                      :data="segmentOverviewRows"
                      :bordered="false"
                    />
                  </n-card>
                </n-gi>
                <n-gi>
                  <n-card :bordered="false" title="多分群标签概览">
                    <n-data-table
                      :columns="[
                        { title: '标签', key: 'labelName' },
                        { title: '目标峰值', key: 'targetValue' },
                        { title: '占比', key: 'targetRatio', render: (row: MultiSegmentOverviewRow) => `${row.targetRatio}%` },
                        { title: '提升倍数', key: 'compareLift', render: (row: MultiSegmentOverviewRow) => `${row.compareLift}x` },
                        { title: '结论', key: 'conclusion' },
                      ]"
                      :data="multiSegmentOverviewRows"
                      :bordered="false"
                    />
                  </n-card>
                </n-gi>
                <n-gi>
                  <n-card :bordered="false" title="标签详情">
                    <n-data-table
                      :columns="[
                        { title: '图表', key: 'chartTitle', minWidth: 150 },
                        { title: '标签值', key: 'tagValue', minWidth: 110 },
                        { title: 'UV', key: 'uv', render: (row: LabelDetailRow) => formatNumber(row.uv) },
                        { title: '占比', key: 'ratio', render: (row: LabelDetailRow) => `${row.ratio}%` },
                        { title: 'TGI', key: 'tgi' },
                      ]"
                      :data="labelDetailRows"
                      :bordered="false"
                      :max-height="320"
                    />
                  </n-card>
                </n-gi>
                <n-gi>
                  <n-card :bordered="false" title="交叉分析">
                    <n-empty v-if="labelCharts.length < 2" description="至少需要两个标签图表后生成交叉分析。" />
                    <v-chart v-else class="chart" :option="crossAnalysisOption" autoresize />
                  </n-card>
                </n-gi>
              </n-grid>
            </n-tab-pane>
            <n-tab-pane name="label" tab="标签分析详情">
              <n-card :bordered="false">
                <n-space justify="space-between" align="center">
                  <n-space align="center">
                    <n-radio-group :value="activeReport.ratioMode" @update:value="(value) => switchRatioMode(value as GroupProfileRatioMode)">
                      <n-radio-button value="population">人群占比</n-radio-button>
                      <n-radio-button value="effective">有效人群占比</n-radio-button>
                    </n-radio-group>
                    <n-select :value="activeReport.globalSortMode" class="sort-select" :options="sortOptions" @update:value="(value) => switchGlobalSort(value as GroupProfileSortMode)" />
                    <n-space align="center">
                      <span class="muted">TGI 展示</span>
                      <n-switch :value="activeReport.showTgi" @update:value="switchShowTgi" />
                    </n-space>
                  </n-space>
                  <n-space>
                    <n-button v-if="editable" @click="openLabelSelect">选择标签</n-button>
                    <n-button @click="openGroupModal">图表排序分组</n-button>
                    <n-button v-if="editable" @click="openTemplateModal()">存为模板</n-button>
                    <n-button @click="openSaveSegmentModal()">存为分群</n-button>
                  </n-space>
                </n-space>
              </n-card>

              <n-empty v-if="!labelCharts.length" class="empty-state" description="暂无标签分析图表，请在编辑模式中添加标签分析。" />
              <div class="chart-grid">
                <n-card v-for="chart in labelCharts" :key="chart.id" :bordered="false" class="chart-card">
                  <template #header>
                    <n-space justify="space-between" align="center">
                      <n-space align="center" size="small">
                        <span>{{ chart.title }}</span>
                        <n-tag size="small">{{ chart.groupName }}</n-tag>
                      </n-space>
                      <n-space>
                        <n-select :value="chart.chartType" size="small" class="chart-type-select" :options="chartTypeOptions" @update:value="(value) => switchChartType(chart, value as GroupProfileChartType)" />
                        <n-dropdown :options="chartActionOptions(chart)" @select="(key: string) => handleChartAction(key, chart)">
                          <n-button size="small">操作</n-button>
                        </n-dropdown>
                      </n-space>
                    </n-space>
                  </template>
                  <n-data-table
                    v-if="chart.chartType === 'table'"
                    :columns="[
                      { title: '选择', key: 'selected', render: (row: GroupProfileLabelValueInsight) => h(NCheckbox, { checked: row.selected, onUpdateChecked: (checked: boolean) => (row.selected = checked) }) },
                      { title: '标签值', key: 'value' },
                      { title: 'UV', key: 'uv', render: (row: GroupProfileLabelValueInsight) => formatNumber(row.uv) },
                      { title: activeReport.ratioMode === 'effective' ? '标签有效占比' : '标签占比', key: 'ratio', render: (row: GroupProfileLabelValueInsight) => `${valueRatio(row, chart)}%` },
                      { title: activeReport.ratioMode === 'effective' ? '标签 TGI' : '大盘 TGI', key: 'tgi', render: (row: GroupProfileLabelValueInsight) => valueTgi(row, chart) },
                    ]"
                    :data="sortedLabelValues(chart)"
                    :bordered="false"
                  />
                  <v-chart v-else class="chart" :option="labelChartOption(chart)" autoresize @click="(params: unknown) => handleChartClick(chart, params)" />
                  <n-alert v-if="chart.linkageConfig.enabled" type="info" class="chart-note">
                    主图表已启用联动。{{ chart.linkageConfig.selectedValue ? `当前选中：${chart.linkageConfig.selectedValue}` : '点击任一标签值后，右侧联动图表展示对应人群分布。' }}
                  </n-alert>
                  <div v-if="linkedChartsFor(chart).length" class="linked-chart-panel">
                    <div v-for="linkedChart in linkedChartsFor(chart)" :key="linkedChart.id" class="linked-chart-item">
                      <div class="linked-chart-title">{{ linkedChart.title }}</div>
                      <n-data-table
                        v-if="linkedChart.chartType === 'table'"
                        :columns="[
                          { title: '标签值', key: 'value' },
                          { title: activeReport.ratioMode === 'effective' ? '标签有效占比' : '标签占比', key: 'ratio', render: (row: GroupProfileLabelValueInsight) => `${valueRatio(row, linkedChart)}%` },
                          { title: activeReport.ratioMode === 'effective' ? '标签 TGI' : '大盘 TGI', key: 'tgi', render: (row: GroupProfileLabelValueInsight) => valueTgi(row, linkedChart) },
                        ]"
                        :data="sortedLabelValues(linkedChart)"
                        :bordered="false"
                      />
                      <v-chart v-else class="linked-chart" :option="labelChartOption(linkedChart)" autoresize />
                    </div>
                  </div>
                </n-card>
              </div>
            </n-tab-pane>
            <n-tab-pane name="metric" tab="指标分析详情" :disabled="!hasMetricAbility">
              <n-alert v-if="!hasMetricAbility" type="warning">指标分析为增值模块，如需使用请联系商务人员。</n-alert>
              <n-space v-else justify="space-between" class="tab-toolbar">
                <span class="muted">支持折线图、柱状图、卡片、表格；X 轴可选择时间、标签、分群、属性、明细属性和行为属性。</span>
                <n-button v-if="editable" type="primary" @click="openMetricModal()">添加图表</n-button>
              </n-space>
              <n-empty v-if="!metricCharts.length" class="empty-state" description="暂无指标分析图表。" />
              <div class="chart-grid">
                <n-card v-for="chart in metricCharts" :key="chart.id" :bordered="false" class="chart-card">
                  <template #header>
                    <n-space justify="space-between" align="center">
                      <n-space align="center" size="small">
                        <span>{{ chart.title }}</span>
                        <n-tag size="small">{{ chart.groupName }}</n-tag>
                      </n-space>
                      <n-dropdown :options="chartActionOptions(chart)" @select="(key: string) => handleChartAction(key, chart)">
                        <n-button size="small">操作</n-button>
                      </n-dropdown>
                    </n-space>
                  </template>
                  <n-alert v-if="chart.status === 'pending_query'" type="warning" class="chart-note">图表进入待查询状态，点击查询报告后刷新数据。</n-alert>
                  <n-data-table
                    v-if="chart.chartType === 'table'"
                    :columns="[
                      { title: '维度', key: 'dimension' },
                      { title: '分群', key: 'segmentName' },
                      { title: '指标值', key: 'formattedValue' },
                    ]"
                    :data="chart.metricPoints"
                    :bordered="false"
                  />
                  <div v-else-if="chart.chartType === 'card'" class="metric-card-row">
                    <n-card v-for="point in chart.metricPoints" :key="`${point.dimension}-${point.segmentName}`" class="metric-card" :bordered="false">
                      <div class="metric-card-value">{{ point.formattedValue }}</div>
                      <div class="metric-card-label">{{ point.segmentName }} / {{ point.dimension }}</div>
                    </n-card>
                  </div>
                  <v-chart v-else class="chart" :option="metricChartOption(chart)" autoresize />
                </n-card>
              </div>
            </n-tab-pane>
          </n-tabs>
        </template>
      </section>

      <section v-else-if="currentPage === 'templates'" class="page-section">
        <div class="page-header">
          <div>
            <h1 class="page-title">群体画像模板管理</h1>
            <p class="page-description">管理标签分析模板、指标分析模板、个人模板、项目模板和共享模板。</p>
          </div>
          <n-space>
            <n-button @click="router.push('/user-insight/group-profiles')">返回报告列表</n-button>
            <n-button type="primary" @click="openTemplateModal()">新建模板</n-button>
          </n-space>
        </div>
        <n-card :bordered="false">
          <n-tabs type="line">
            <n-tab-pane name="label" tab="标签分析模板">
              <n-data-table :columns="templateColumns" :data="templates.filter((template) => template.templateType === 'label')" :bordered="false" />
            </n-tab-pane>
            <n-tab-pane name="metric" tab="指标分析模板">
              <n-data-table :columns="templateColumns" :data="templates.filter((template) => template.templateType === 'metric')" :bordered="false" />
            </n-tab-pane>
          </n-tabs>
        </n-card>
      </section>

      <section v-else-if="currentPage === 'tgi'" class="page-section">
        <div class="page-header">
          <div>
            <h1 class="page-title">TGI 配置</h1>
            <p class="page-description">自定义项目大盘或业务基准分群，用于提升特定场景下的显著性计算准确率。</p>
          </div>
          <n-space>
            <n-button @click="router.push('/user-insight/group-profiles')">返回报告列表</n-button>
            <n-button type="primary" @click="openTgiModal()">新建 TGI</n-button>
          </n-space>
        </div>
        <n-card :bordered="false">
          <n-data-table :columns="tgiColumns" :data="tgiConfigs" :bordered="false" />
        </n-card>
      </section>
    </div>
  </n-spin>

  <n-modal v-model:show="subjectModalVisible" preset="card" title="选择报告主体" class="narrow-modal">
    <n-form label-placement="top">
      <n-form-item label="主体">
        <n-select v-model:value="selectedCreateSubject" :options="subjectOptions" />
      </n-form-item>
    </n-form>
    <template #footer>
      <n-space justify="end">
        <n-button @click="subjectModalVisible = false">取消</n-button>
        <n-button type="primary" @click="confirmCreateReport">确定</n-button>
      </n-space>
    </template>
  </n-modal>

  <n-modal v-model:show="segmentSelectVisible" preset="card" title="选择分群包" class="wide-modal">
    <n-grid :cols="4" :x-gap="12" :y-gap="12">
      <n-gi><n-input v-model:value="segmentKeyword" placeholder="按分群名称、创建人搜索" clearable /></n-gi>
      <n-gi><n-select v-model:value="segmentSubjectFilter" :options="segmentSubjectOptions" /></n-gi>
      <n-gi><n-select v-model:value="segmentGroupFilter" :options="segmentGroupOptions" /></n-gi>
      <n-gi><n-select v-model:value="segmentStatusFilter" :options="segmentStatusOptions" /></n-gi>
    </n-grid>
    <n-data-table
      class="modal-table"
      :columns="[
        { title: '选择', key: 'select', render: (row: GroupProfileSegmentOption) => h(NRadio, { checked: selectedSegmentId === row.id, onUpdateChecked: () => (selectedSegmentId = row.id) }) },
        { title: '分群名称', key: 'name' },
        { title: '主体', key: 'subjectName' },
        { title: '分组', key: 'groupName' },
        { title: '人数', key: 'count', render: (row: GroupProfileSegmentOption) => formatNumber(row.count) },
        { title: '状态', key: 'status' },
        { title: '创建人', key: 'creator', render: (row: GroupProfileSegmentOption) => row.creator.name },
      ]"
      :data="filteredSegmentOptions"
      :bordered="false"
    />
    <template #footer>
      <n-space justify="end">
        <n-button @click="segmentSelectVisible = false">取消</n-button>
        <n-button type="primary" @click="confirmSegmentSelect">确定</n-button>
      </n-space>
    </template>
  </n-modal>

  <n-modal v-model:show="labelSelectVisible" preset="card" title="选择分析标签" class="wide-modal">
    <n-space align="center" class="modal-toolbar">
      <n-select v-model:value="labelGroupFilter" class="template-select" :options="labelGroupOptions" />
      <n-input v-model:value="labelKeyword" placeholder="搜索标签名称或标签组" clearable />
      <span class="muted">已选择 {{ selectedLabelIds.length }} 个标签</span>
    </n-space>
    <n-checkbox-group v-model:value="selectedLabelIds">
      <div class="label-directory">
        <div v-for="label in filteredLabels" :key="label.id" class="label-option-row">
          <n-checkbox :value="label.id" :disabled="!label.permission">
            <n-space align="center" size="small">
              <span>{{ label.groupName }} / {{ label.name }}</span>
              <n-tag v-if="label.realtime" size="small" type="info">实时</n-tag>
              <n-tag v-if="!label.permission" size="small" type="error">无权限</n-tag>
            </n-space>
          </n-checkbox>
          <span class="muted">{{ label.values.join('、') }}</span>
        </div>
      </div>
    </n-checkbox-group>
    <template #footer>
      <n-space justify="space-between">
        <n-space>
          <n-button size="small" @click="selectedLabelIds = filteredLabels.filter((label) => label.permission).map((label) => label.id)">选择当前筛选</n-button>
          <n-button size="small" @click="selectedLabelIds = []">清空</n-button>
        </n-space>
        <n-space>
          <n-button @click="labelSelectVisible = false">取消</n-button>
          <n-button type="primary" @click="confirmLabelSelect">应用标签</n-button>
        </n-space>
      </n-space>
    </template>
  </n-modal>

  <n-modal v-model:show="customRuleVisible" preset="card" title="自定义圈选" class="wide-modal">
    <n-form label-placement="top">
      <n-grid :cols="2" :x-gap="12">
        <n-gi><n-form-item label="分群名称"><n-input v-model:value="customRuleDraft.name" /></n-form-item></n-gi>
        <n-gi><n-form-item label="ID 类型"><n-select v-model:value="customRuleDraft.outputIdType" :options="metricIdTypeOptions" /></n-form-item></n-gi>
      </n-grid>
      <div class="rule-editor-block">
        <n-space justify="space-between" align="center">
          <n-space align="center">
            <strong>满足条件</strong>
            <n-radio-group v-model:value="customRuleDraft.satisfyLogic">
              <n-radio value="all">全部满足</n-radio>
              <n-radio value="any">任一满足</n-radio>
            </n-radio-group>
          </n-space>
          <n-button size="small" @click="addRuleCondition('include')">新增条件</n-button>
        </n-space>
        <div v-for="condition in customRuleDraft.satisfyConditions" :key="condition.id" class="rule-condition-row">
          <n-select :value="condition.source" :options="customRuleSourceOptions" @update:value="(value) => updateRuleConditionSource(condition, value as GroupProfileCondition['source'])" />
          <n-select :value="condition.field" :options="fieldOptionsForRuleCondition(condition)" @update:value="(value) => updateRuleConditionField(condition, value as EntityId)" />
          <n-select v-model:value="condition.operator" :options="customRuleOperatorOptions" />
          <n-select v-model:value="condition.value" :options="valueOptionsForRuleCondition(condition)" filterable tag />
          <n-button text type="error" @click="removeRuleCondition('include', condition.id)">删除</n-button>
        </div>
      </div>
      <div class="rule-editor-block">
        <n-space justify="space-between" align="center">
          <n-space align="center">
            <strong>排除条件</strong>
            <n-radio-group v-model:value="customRuleDraft.excludeLogic">
              <n-radio value="all">全部满足</n-radio>
              <n-radio value="any">任一满足</n-radio>
            </n-radio-group>
          </n-space>
          <n-button size="small" @click="addRuleCondition('exclude')">新增排除</n-button>
        </n-space>
        <div v-for="condition in customRuleDraft.excludeConditions" :key="condition.id" class="rule-condition-row">
          <n-select :value="condition.source" :options="customRuleSourceOptions" @update:value="(value) => updateRuleConditionSource(condition, value as GroupProfileCondition['source'])" />
          <n-select :value="condition.field" :options="fieldOptionsForRuleCondition(condition)" @update:value="(value) => updateRuleConditionField(condition, value as EntityId)" />
          <n-select v-model:value="condition.operator" :options="customRuleOperatorOptions" />
          <n-select v-model:value="condition.value" :options="valueOptionsForRuleCondition(condition)" filterable tag />
          <n-button text type="error" @click="removeRuleCondition('exclude', condition.id)">删除</n-button>
        </div>
        <n-empty v-if="!customRuleDraft.excludeConditions.length" description="没有排除条件" />
      </div>
    </n-form>
    <template #footer>
      <n-space justify="end">
        <n-button @click="customRuleVisible = false">取消</n-button>
        <n-button type="primary" @click="confirmCustomRule">确定</n-button>
      </n-space>
    </template>
  </n-modal>

  <n-modal v-model:show="permissionModalVisible" preset="card" title="报告权限管理" class="wide-modal">
    <n-space align="center" class="modal-toolbar">
      <n-select v-model:value="permissionPrincipalType" class="small-select" :options="[{ label: '用户', value: 'user' }, { label: '用户组', value: 'group' }, { label: '角色', value: 'role' }, { label: '部门', value: 'department' }]" />
      <n-input v-model:value="permissionPrincipalName" placeholder="授权对象" />
      <n-radio-group v-model:value="permissionLevel">
        <n-radio-button value="view">查看</n-radio-button>
        <n-radio-button value="edit">编辑</n-radio-button>
      </n-radio-group>
      <n-button @click="addPermission">添加授权对象</n-button>
    </n-space>
    <n-data-table
      :columns="[
        { title: '对象', key: 'principalName' },
        { title: '类型', key: 'principalType' },
        { title: '权限', key: 'permission', render: (row: GroupProfileReportPermission) => (row.permission === 'edit' ? '编辑' : '查看') },
        { title: '操作', key: 'action', render: (row: GroupProfileReportPermission) => h(NButton, { text: true, type: 'error', onClick: () => (permissionDraft = permissionDraft.filter((item) => item.id !== row.id)) }, { default: () => '删除授权' }) },
      ]"
      :data="permissionDraft"
      :bordered="false"
    />
    <template #footer>
      <n-space justify="end">
        <n-button @click="permissionModalVisible = false">取消</n-button>
        <n-button type="primary" @click="confirmPermissions">确定</n-button>
      </n-space>
    </template>
  </n-modal>

  <n-modal v-model:show="templatePermissionModalVisible" preset="card" :title="`模板权限管理${templatePermissionTarget ? `：${templatePermissionTarget.name}` : ''}`" class="wide-modal">
    <n-alert type="info" class="chart-note">模板共享对象只能查看和使用模板，不能编辑、删除或继续转授权。</n-alert>
    <n-space align="center" class="modal-toolbar">
      <n-select v-model:value="permissionPrincipalType" class="small-select" :options="[{ label: '用户', value: 'user' }, { label: '用户组', value: 'group' }, { label: '角色', value: 'role' }, { label: '部门', value: 'department' }]" />
      <n-input v-model:value="permissionPrincipalName" placeholder="共享对象" />
      <n-button @click="addTemplatePermission">添加共享对象</n-button>
    </n-space>
    <n-data-table
      :columns="[
        { title: '对象', key: 'principalName' },
        { title: '类型', key: 'principalType' },
        { title: '权限', key: 'permission', render: () => '查看并使用' },
        { title: '操作', key: 'action', render: (row: GroupProfileReportPermission) => h(NButton, { text: true, type: 'error', onClick: () => (templatePermissionDraft = templatePermissionDraft.filter((item) => item.id !== row.id)) }, { default: () => '移除共享' }) },
      ]"
      :data="templatePermissionDraft"
      :bordered="false"
    />
    <template #footer>
      <n-space justify="end">
        <n-button @click="templatePermissionModalVisible = false">取消</n-button>
        <n-button type="primary" @click="confirmTemplatePermissions">确定</n-button>
      </n-space>
    </template>
  </n-modal>

  <n-modal v-model:show="scheduleModalVisible" preset="card" title="设置报告更新方式" class="narrow-modal">
    <n-form label-placement="top">
      <n-form-item label="更新方式">
        <n-radio-group v-model:value="scheduleDraft.updateMode">
          <n-radio value="manual">手动更新</n-radio>
          <n-radio value="daily">按天更新</n-radio>
        </n-radio-group>
      </n-form-item>
      <template v-if="scheduleDraft.updateMode === 'daily'">
        <n-form-item label="执行时间"><n-input v-model:value="scheduleDraft.executeTime" placeholder="09:00" /></n-form-item>
        <n-form-item label="生效日期"><n-input v-model:value="scheduleDraft.startDate" placeholder="YYYY-MM-DD" /></n-form-item>
        <n-form-item label="结束日期（可选）"><n-input v-model:value="scheduleDraft.endDate" placeholder="YYYY-MM-DD" /></n-form-item>
        <n-form-item label="上一任务未完成时">
          <n-radio-group v-model:value="scheduleDraft.queuePolicy">
            <n-radio value="queue">排队等待</n-radio>
            <n-radio value="skip">跳过本次</n-radio>
          </n-radio-group>
        </n-form-item>
      </template>
    </n-form>
    <n-alert v-if="latestScheduleTask" type="info" class="chart-note">
      最近任务：{{ formatDateTime(latestScheduleTask.scheduledAt) }} / {{ taskStatusLabel(latestScheduleTask.status) }} / {{ latestScheduleTask.message }}
    </n-alert>
    <template #footer>
      <n-space justify="end">
        <n-button @click="scheduleModalVisible = false">取消</n-button>
        <n-button type="primary" @click="confirmSchedule">确定</n-button>
      </n-space>
    </template>
  </n-modal>

  <n-modal v-model:show="downloadModalVisible" preset="card" title="下载报告" class="narrow-modal">
    <n-form label-placement="top">
      <n-form-item label="下载格式">
        <n-radio-group v-model:value="downloadFormat">
          <n-radio value="excel">Excel</n-radio>
          <n-radio value="png">PNG</n-radio>
        </n-radio-group>
      </n-form-item>
      <n-form-item v-if="featureFlags?.aiSummaryPurchased" label="AI 总结">
        <n-checkbox v-model:checked="includeAiSummary">Excel 中包含 AI 总结内容</n-checkbox>
      </n-form-item>
    </n-form>
    <n-alert v-if="downloadMessage" type="success">{{ downloadMessage }}</n-alert>
    <template #footer>
      <n-space justify="end">
        <n-button @click="downloadModalVisible = false">关闭</n-button>
        <n-button type="primary" @click="confirmDownload">生成下载</n-button>
      </n-space>
    </template>
  </n-modal>

  <n-modal v-model:show="copyModalVisible" preset="card" title="复制报告" class="narrow-modal">
    <n-form label-placement="top">
      <n-form-item label="副本名称"><n-input v-model:value="copyName" placeholder="副本名称" /></n-form-item>
      <n-form-item v-if="copyCanKeepDailySchedule" label="更新方式">
        <n-checkbox v-model:checked="copyKeepDailySchedule">保留原报告按天更新策略</n-checkbox>
      </n-form-item>
      <n-alert v-else-if="copyTargetReport?.updateMode === 'daily'" type="warning">当前用户暂无定时权限，复制后将默认改为手动更新。</n-alert>
    </n-form>
    <template #footer>
      <n-space justify="end">
        <n-button @click="copyModalVisible = false">取消</n-button>
        <n-button type="primary" @click="confirmCopyReport">确定</n-button>
      </n-space>
    </template>
  </n-modal>

  <n-modal :show="Boolean(deleteTarget)" preset="dialog" title="删除报告" positive-text="确认删除" negative-text="取消" @positive-click="confirmDeleteReport" @negative-click="deleteTarget = undefined" @close="deleteTarget = undefined">
    删除后，该报告将无法恢复，报告中的图表、配置、授权关系也会一并删除。请确认是否继续？
  </n-modal>

  <n-modal :show="Boolean(deleteChartTarget)" preset="dialog" title="删除联动主图" positive-text="一并删除" negative-text="取消" @positive-click="() => deleteChartTarget && deleteChart(deleteChartTarget)" @negative-click="deleteChartTarget = undefined" @close="deleteChartTarget = undefined">
    当前图表已配置联动，删除主图会一并删除 {{ deleteChartTarget?.linkageConfig.linkedChartIds.length ?? 0 }} 个联动图表。请确认是否继续？
  </n-modal>

  <n-modal v-model:show="descriptionModalVisible" preset="card" title="报告描述" class="narrow-modal">
    <n-input v-model:value="descriptionDraft" type="textarea" maxlength="200" show-count placeholder="用于说明报告目的、分析主题和主要结论。" />
    <template #footer>
      <n-space justify="end">
        <n-button @click="descriptionModalVisible = false">取消</n-button>
        <n-button type="primary" @click="confirmDescription">确定</n-button>
      </n-space>
    </template>
  </n-modal>

  <n-modal v-model:show="chartTitleModalVisible" preset="card" title="修改图表标题" class="narrow-modal">
    <n-input v-model:value="chartTitleDraft" maxlength="100" show-count />
    <template #footer>
      <n-space justify="end">
        <n-button @click="chartTitleModalVisible = false">取消</n-button>
        <n-button type="primary" @click="confirmChartTitle">确定</n-button>
      </n-space>
    </template>
  </n-modal>

  <n-modal v-model:show="saveSegmentModalVisible" preset="card" title="存为分群" class="wide-modal">
    <n-form label-placement="top">
      <n-form-item label="保存方式">
        <n-radio-group v-model:value="saveSegmentMode">
          <n-radio value="selected_tags">用分群夹中的标签生成分群</n-radio>
          <n-radio value="report_segment">保存报告分析对象中的分群</n-radio>
        </n-radio-group>
      </n-form-item>
      <n-form-item v-if="saveSegmentMode === 'selected_tags'" label="标签选择">
        <n-checkbox-group v-model:value="saveSegmentSelectedIds">
          <n-space>
            <n-checkbox v-for="value in selectedChartValues" :key="value.id" :value="value.id">{{ value.tagName }}={{ value.value }}</n-checkbox>
          </n-space>
        </n-checkbox-group>
      </n-form-item>
      <n-form-item v-else label="分群选择">
        <n-checkbox-group v-model:value="saveSegmentSourceSegmentIds">
          <n-space>
            <n-checkbox v-for="segment in activeReport?.segments ?? []" :key="segment.id" :value="segment.id">{{ segment.segmentName }}</n-checkbox>
          </n-space>
        </n-checkbox-group>
      </n-form-item>
      <n-grid :cols="2" :x-gap="12">
        <n-gi><n-form-item label="条件关系"><n-radio-group v-model:value="saveSegmentLogic"><n-radio value="all">满足所有条件</n-radio><n-radio value="any">满足任意条件</n-radio></n-radio-group></n-form-item></n-gi>
        <n-gi><n-form-item label="ID 类型"><n-input v-model:value="saveSegmentOutputIdType" /></n-form-item></n-gi>
        <n-gi><n-form-item label="分群名称"><n-input v-model:value="saveSegmentName" /></n-form-item></n-gi>
        <n-gi><n-form-item label="分组"><n-select v-model:value="saveSegmentGroupId" :options="groupOptions" /></n-form-item></n-gi>
      </n-grid>
      <n-form-item label="描述"><n-input v-model:value="saveSegmentDescription" type="textarea" /></n-form-item>
    </n-form>
    <template #footer>
      <n-space justify="end">
        <n-button @click="saveSegmentModalVisible = false">取消</n-button>
        <n-button type="primary" @click="confirmSaveSegment">确定</n-button>
      </n-space>
    </template>
  </n-modal>

  <n-modal v-model:show="templateModalVisible" preset="card" title="存为模板" class="narrow-modal">
    <n-form label-placement="top">
      <n-form-item label="模板名称"><n-input v-model:value="templateDraft.name" /></n-form-item>
      <n-form-item label="模板描述"><n-input v-model:value="templateDraft.description" type="textarea" /></n-form-item>
      <n-form-item label="模板类型"><n-radio-group v-model:value="templateDraft.templateType"><n-radio value="label">标签分析模板</n-radio><n-radio value="metric">指标分析模板</n-radio></n-radio-group></n-form-item>
      <n-form-item label="保存范围"><n-radio-group v-model:value="templateDraft.scope"><n-radio value="personal">个人模板</n-radio><n-radio value="project">项目模板</n-radio></n-radio-group></n-form-item>
    </n-form>
    <template #footer>
      <n-space justify="end">
        <n-button @click="templateModalVisible = false">取消</n-button>
        <n-button type="primary" @click="confirmTemplate">确定</n-button>
      </n-space>
    </template>
  </n-modal>

  <n-modal v-model:show="groupModalVisible" preset="card" title="图表排序分组" class="wide-modal">
    <n-radio-group v-model:value="groupModeDraft">
      <n-radio value="taxonomy">使用标签体系中的分组</n-radio>
      <n-radio value="custom">自定义分组</n-radio>
    </n-radio-group>
    <div v-if="groupModeDraft === 'custom'" class="group-editor">
      <n-button size="small" @click="addChartGroup">新增分组</n-button>
      <div v-for="group in chartGroupDraft" :key="group.id" class="group-sort-block" @dragover.prevent @drop="handleChartDrop(group.id)">
        <div class="group-row">
          <n-input v-model:value="group.name" />
          <n-tag size="small">{{ group.chartIds.length }} 个图表</n-tag>
          <n-button text type="error" @click="removeChartGroup(group.id)">删除分组</n-button>
        </div>
        <div class="chart-sort-list">
          <div
            v-for="chartId in group.chartIds"
            :key="chartId"
            class="chart-sort-item"
            draggable="true"
            @dragstart="handleChartDragStart(group.id, chartId)"
            @dragover.prevent
            @drop.stop="handleChartDrop(group.id, chartId)"
          >
            <span>{{ chartTitleById(chartId) }}</span>
            <n-space size="small">
              <n-button size="tiny" text @click="moveDraftChart(group, chartId, -1)">上移</n-button>
              <n-button size="tiny" text @click="moveDraftChart(group, chartId, 1)">下移</n-button>
            </n-space>
          </div>
          <n-empty v-if="!group.chartIds.length" description="将图表拖到这里" />
        </div>
      </div>
    </div>
    <n-alert v-else type="info" class="chart-note">使用标签体系已有分组结构，不允许编辑分组名称；报告再次更新时按最新标签体系顺序展示。</n-alert>
    <template #footer>
      <n-space justify="end">
        <n-button @click="groupModalVisible = false">取消</n-button>
        <n-button type="primary" @click="confirmChartGroups">确定</n-button>
      </n-space>
    </template>
  </n-modal>

  <n-modal v-model:show="valueDisplayModalVisible" preset="card" title="调整标签值展示" class="narrow-modal">
    <n-input placeholder="搜索标签值" class="modal-toolbar" />
    <n-checkbox-group v-model:value="valueDisplayDraft">
      <n-space vertical>
        <n-checkbox v-for="value in selectedChart?.labelValues ?? []" :key="value.value" :value="value.value">{{ value.value }} / UV {{ formatNumber(value.uv) }}</n-checkbox>
      </n-space>
    </n-checkbox-group>
    <n-space class="modal-toolbar">
      <n-button size="small" @click="valueDisplayDraft = selectedChart?.labelValues.map((item) => item.value) ?? []">全选</n-button>
      <n-button size="small" @click="valueDisplayDraft = []">取消全选</n-button>
      <n-button size="small" @click="resetValueDisplay">恢复默认</n-button>
      <span class="muted">已选择 {{ valueDisplayDraft.length }} 项</span>
    </n-space>
    <template #footer>
      <n-space justify="end">
        <n-button @click="valueDisplayModalVisible = false">取消</n-button>
        <n-button type="primary" @click="confirmValueDisplay">确定</n-button>
      </n-space>
    </template>
  </n-modal>

  <n-modal v-model:show="linkageModalVisible" preset="card" title="图表联动配置" class="narrow-modal">
    <n-form label-placement="top">
      <n-form-item label="联动标签维度">
        <n-select v-model:value="linkageSelectedTagIds" multiple clearable :options="labelOptions" />
      </n-form-item>
    </n-form>
    <template #footer>
      <n-space justify="end">
        <n-button @click="linkageModalVisible = false">取消</n-button>
        <n-button type="primary" @click="confirmLinkage">确定</n-button>
      </n-space>
    </template>
  </n-modal>

  <n-modal v-model:show="metricModalVisible" preset="card" title="指标图表配置" class="wide-modal">
    <n-form label-placement="top">
      <n-grid :cols="2" :x-gap="12">
        <n-gi><n-form-item label="图表标题"><n-input v-model:value="metricDraft.title" /></n-form-item></n-gi>
        <n-gi><n-form-item label="图表类型"><n-select v-model:value="metricDraft.chartType" :options="metricChartTypeOptions" /></n-form-item></n-gi>
        <n-gi><n-form-item label="维度（X轴）"><n-select v-model:value="metricDraft.xAxisType" :options="metricXAxisOptions" /></n-form-item></n-gi>
        <n-gi><n-form-item label="维度字段"><n-select v-model:value="metricDraft.xAxisField" :options="metricDimensionFieldOptions" /></n-form-item></n-gi>
        <n-gi><n-form-item label="指标（Y轴）"><n-select v-model:value="metricDraft.yAxisSourceType" :options="metricSourceOptions" /></n-form-item></n-gi>
        <n-gi v-if="metricDraft.yAxisSourceType === 'defined_metric'"><n-form-item label="已有指标"><n-select v-model:value="metricDraft.yAxisMetricId" :options="metricOptions" /></n-form-item></n-gi>
        <n-gi v-if="metricDraft.yAxisSourceType === 'tag'"><n-form-item label="标签指标口径"><n-select v-model:value="metricDraft.yAxisMetricId" :options="metricTagOptions" /></n-form-item></n-gi>
        <n-gi v-if="metricDraft.yAxisSourceType === 'new_metric'"><n-form-item label="新建指标名称"><n-input v-model:value="metricDraft.newMetricName" /></n-form-item></n-gi>
        <n-gi v-if="metricDraft.yAxisSourceType === 'new_metric'"><n-form-item label="指标分组"><n-input v-model:value="metricDraft.newMetricGroupName" /></n-form-item></n-gi>
        <n-gi v-if="metricDraft.yAxisSourceType === 'new_metric'" :span="2"><n-form-item label="指标描述"><n-input v-model:value="metricDraft.newMetricDescription" type="textarea" /></n-form-item></n-gi>
        <n-gi v-if="metricDraft.yAxisSourceType === 'new_metric'"><n-form-item label="指标类型"><n-radio-group v-model:value="metricDraft.newMetricType"><n-radio value="single">单一指标</n-radio><n-radio value="formula">组合指标</n-radio></n-radio-group></n-form-item></n-gi>
        <n-gi v-if="metricDraft.newMetricType === 'single' && metricDraft.yAxisSourceType === 'new_metric'"><n-form-item label="数据源"><n-select v-model:value="metricDraft.conditionSource" :options="metricConditionSourceOptions" /></n-form-item></n-gi>
        <n-gi v-if="metricDraft.newMetricType === 'single' && metricDraft.yAxisSourceType === 'new_metric'"><n-form-item label="源字段/资源"><n-select v-model:value="metricDraft.conditionResourceId" :options="metricConditionResourceOptions" /></n-form-item></n-gi>
        <n-gi v-if="metricDraft.newMetricType === 'formula' && metricDraft.yAxisSourceType === 'new_metric'" :span="2"><n-form-item label="公式预览"><n-input v-model:value="metricDraft.formula" /></n-form-item></n-gi>
        <n-gi><n-form-item label="展示格式"><n-select v-model:value="metricDraft.displayFormat" :options="metricDisplayFormatOptions" /></n-form-item></n-gi>
        <n-gi><n-form-item label="ID 类型"><n-select v-model:value="metricDraft.idType" :options="metricIdTypeOptions" /></n-form-item></n-gi>
        <n-gi><n-form-item label="数据计算时间"><n-radio-group v-model:value="metricDraft.dateMode"><n-radio value="single">单日期</n-radio><n-radio value="fixed">固定区间</n-radio><n-radio value="dynamic">动态区间</n-radio></n-radio-group></n-form-item></n-gi>
        <n-gi v-if="metricDraft.dateMode === 'dynamic'"><n-form-item label="动态日期"><n-select v-model:value="metricDraft.dynamicValue" :options="[{ label: '最近 7 天', value: 'last_7_days' }, { label: '最近 30 天', value: 'last_30_days' }, { label: '本周', value: 'this_week' }, { label: '本月', value: 'this_month' }, { label: '上月', value: 'last_month' }]" /></n-form-item></n-gi>
        <n-gi v-if="metricDraft.dateMode === 'single'"><n-form-item label="单个日期"><n-input v-model:value="metricDraft.singleDate" /></n-form-item></n-gi>
        <n-gi v-if="metricDraft.dateMode === 'fixed'"><n-form-item label="开始日期"><n-input v-model:value="metricDraft.startDate" /></n-form-item></n-gi>
        <n-gi v-if="metricDraft.dateMode === 'fixed'"><n-form-item label="结束日期"><n-input v-model:value="metricDraft.endDate" /></n-form-item></n-gi>
      </n-grid>
    </n-form>
    <template #footer>
      <n-space justify="end">
        <n-button @click="metricModalVisible = false">取消</n-button>
        <n-button @click="previewMetricFormula">预览</n-button>
        <n-button type="primary" @click="confirmMetricChart">确定</n-button>
      </n-space>
    </template>
  </n-modal>

  <n-modal v-model:show="tgiModalVisible" preset="card" title="TGI 配置" class="narrow-modal">
    <n-form label-placement="top">
      <n-form-item label="TGI 名称"><n-input v-model:value="tgiDraft.name" /></n-form-item>
      <n-form-item label="主体"><n-select v-model:value="tgiDraft.subjectType" :options="subjectOptions" /></n-form-item>
      <n-form-item label="计算方式"><n-radio-group v-model:value="tgiDraft.calculationType"><n-radio value="label_ratio">标签占比</n-radio><n-radio value="label_effective_ratio">标签有效占比</n-radio></n-radio-group></n-form-item>
      <n-form-item label="基准类型"><n-radio-group v-model:value="tgiDraft.baseType"><n-radio value="segment">人群包</n-radio><n-radio value="tag">标签</n-radio></n-radio-group></n-form-item>
      <n-form-item v-if="tgiDraft.baseType === 'segment'" label="基准人群包"><n-select v-model:value="tgiDraft.baseSegmentId" :options="tgiSegmentOptions" /></n-form-item>
      <n-form-item v-else label="基准标签"><n-select v-model:value="tgiDraft.baseTagId" :options="tgiTagOptions" /></n-form-item>
      <n-form-item label="适用范围"><n-radio-group v-model:value="tgiDraft.scope"><n-radio value="project">全项目</n-radio><n-radio value="report">指定报告</n-radio><n-radio value="template">指定模板</n-radio></n-radio-group></n-form-item>
      <n-form-item label="范围名称"><n-input v-model:value="tgiDraft.scopeTargetName" /></n-form-item>
    </n-form>
    <n-alert type="info" class="chart-note">公式预览：{{ tgiFormulaPreview }}</n-alert>
    <template #footer>
      <n-space justify="end">
        <n-button @click="tgiModalVisible = false">取消</n-button>
        <n-button type="primary" @click="confirmTgi">确定</n-button>
      </n-space>
    </template>
  </n-modal>

  <n-modal v-model:show="auditModalVisible" preset="card" title="审计日志" class="wide-modal">
    <n-space vertical>
      <n-alert type="info">审计日志记录操作人、请求 ID、资源、before/after JSON，便于追溯报告配置、权限、下载和 TGI 变更。</n-alert>
      <n-data-table :columns="auditColumns" :data="auditRows" :bordered="false" :max-height="300" />
      <n-grid v-if="auditSelectedLog" :cols="2" :x-gap="12">
        <n-gi>
          <n-card :bordered="false" title="Before JSON">
            <pre class="audit-json">{{ auditJsonText(auditSelectedLog.before) }}</pre>
          </n-card>
        </n-gi>
        <n-gi>
          <n-card :bordered="false" title="After JSON">
            <pre class="audit-json">{{ auditJsonText(auditSelectedLog.after) }}</pre>
          </n-card>
        </n-gi>
      </n-grid>
    </n-space>
    <template #footer>
      <n-space justify="end">
        <n-button @click="auditModalVisible = false">关闭</n-button>
      </n-space>
    </template>
  </n-modal>

  <n-modal :show="Boolean(expandedChart)" preset="card" :title="expandedChart?.title" class="fullscreen-modal" @update:show="(value) => !value && (expandedChart = undefined)">
    <template v-if="expandedChart">
      <v-chart v-if="expandedChart.analysisType === 'label' && expandedChart.chartType !== 'table'" class="expanded-chart" :option="labelChartOption(expandedChart)" autoresize />
      <v-chart v-else-if="expandedChart.analysisType === 'metric' && expandedChart.chartType !== 'table' && expandedChart.chartType !== 'card'" class="expanded-chart" :option="metricChartOption(expandedChart)" autoresize />
      <n-data-table v-else-if="expandedChart.analysisType === 'label'" :data="sortedLabelValues(expandedChart)" :columns="[{ title: '标签值', key: 'value' }, { title: 'UV', key: 'uv' }, { title: '占比', key: 'labelRatio' }, { title: 'TGI', key: 'marketTgi' }]" />
      <n-data-table v-else :data="expandedChart.metricPoints" :columns="[{ title: '维度', key: 'dimension' }, { title: '分群', key: 'segmentName' }, { title: '指标值', key: 'formattedValue' }]" />
    </template>
  </n-modal>
</template>

<style scoped lang="scss">
.group-profile-page {
  padding: 20px;
}

.page-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.title-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.title-input {
  width: 520px;
  font-size: 20px;
  font-weight: 650;
}

.section-card,
.summary-grid,
.tab-toolbar {
  margin-top: 0;
}

.empty-state {
  padding: 36px 0;
}

.pagination-row {
  display: flex;
  justify-content: flex-end;
  padding-top: 14px;
}

.segment-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.segment-row,
.group-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.segment-name-input {
  width: 240px;
}

.template-select {
  width: 280px;
}

.sort-select {
  width: 180px;
}

.chart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 14px;
}

.interpretation-grid {
  margin-top: 14px;
}

.chart-card {
  min-height: 430px;
}

.chart {
  width: 100%;
  height: 320px;
}

.expanded-chart {
  width: 100%;
  height: 640px;
}

.chart-note {
  margin-top: 10px;
}

.linked-chart-panel {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
}

.linked-chart-item {
  min-width: 0;
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}

.linked-chart-title {
  margin-bottom: 8px;
  color: #374151;
  font-size: 13px;
  font-weight: 650;
}

.linked-chart {
  width: 100%;
  height: 220px;
}

.chart-type-select {
  width: 112px;
}

.metric-card-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.metric-card {
  background: #f8fafc;
}

.metric-card-value {
  font-size: 28px;
  font-weight: 700;
}

.metric-card-label,
.muted {
  color: #6b7280;
  font-size: 13px;
}

.modal-table,
.modal-toolbar,
.group-editor {
  margin-top: 12px;
}

.label-directory {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  max-height: 460px;
  margin-top: 12px;
  overflow: auto;
}

.label-option-row {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.group-sort-block {
  margin-top: 12px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}

.rule-editor-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}

.rule-condition-row {
  display: grid;
  grid-template-columns: 120px minmax(180px, 1fr) 140px minmax(160px, 1fr) 52px;
  gap: 8px;
  align-items: center;
}

.audit-json {
  max-height: 260px;
  margin: 0;
  overflow: auto;
  color: #374151;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
}

.chart-sort-list {
  display: flex;
  min-height: 56px;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}

.chart-sort-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  cursor: grab;
}

.chart-sort-item:active {
  cursor: grabbing;
}

.narrow-modal {
  width: 560px;
}

.wide-modal {
  width: 920px;
}

.fullscreen-modal {
  width: min(1120px, 92vw);
}

.small-select {
  width: 120px;
}
</style>
