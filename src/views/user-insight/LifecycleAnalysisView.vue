<script setup lang="ts">
import '@/components/charts/chartRegister'
import type { EChartsOption } from 'echarts'
import {
  AddOutline,
  AnalyticsOutline,
  ArrowBackOutline,
  CloudDownloadOutline,
  EyeOutline,
  GitNetworkOutline,
  OpenOutline,
  PencilOutline,
  RefreshOutline,
  SearchOutline,
  SettingsOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import dayjs from 'dayjs'
import {
  NAlert,
  NButton,
  NCard,
  NCheckbox,
  NCheckboxGroup,
  NDataTable,
  NDatePicker,
  NDescriptions,
  NDescriptionsItem,
  NDivider,
  NDrawer,
  NDrawerContent,
  NDropdown,
  NEmpty,
  NForm,
  NFormItem,
  NGi,
  NGrid,
  NIcon,
  NInput,
  NInputNumber,
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
  NTabPane,
  NTabs,
  NTag,
  NTooltip,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, DropdownOption, SelectOption, TagProps } from 'naive-ui'
import { computed, h, nextTick, onMounted, reactive, ref, watch } from 'vue'
import VChart from 'vue-echarts'
import { useRoute, useRouter } from 'vue-router'
import {
  lifecycleAnalysisService,
  lifecycleCrowdRangeLabels,
  lifecyclePathEdgeSummary,
  lifecyclePathStatusLabels,
  lifecyclePathUpdateModeLabels,
  lifecyclePermissionLabels,
  lifecycleReportStatusLabels,
  lifecycleTrendMetricLabels,
} from '@/services/lifecycleAnalysisService'
import type {
  LifecycleAuditLog,
  LifecycleAuthorization,
  LifecycleAuthPrincipalType,
  LifecycleBusinessChart,
  LifecycleBusinessChartDataRow,
  LifecycleChartFilterCondition,
  LifecycleChartFilterLogic,
  LifecycleChartFilterOperator,
  LifecycleChartFilterSource,
  LifecycleChartType,
  LifecycleCrowdRange,
  LifecycleExportAuthTarget,
  LifecycleExportSegmentPayload,
  LifecycleExportSegmentResult,
  LifecycleInsightPayload,
  LifecyclePath,
  LifecyclePathEdge,
  LifecyclePathNode,
  LifecyclePathPayload,
  LifecyclePermissionType,
  LifecycleReport,
  LifecycleStage,
  LifecycleStageSnapshot,
  LifecycleTransitionEdge,
  LifecycleTransitionNode,
  LifecycleTransitionResult,
  LifecycleTrendMetric,
  LifecycleTrendPoint,
  LifecycleTrendRangeKey,
  LifecycleTransitionSourceType,
} from '@/types/lifecycleAnalysis'

type DateRangeValue = [number, number]
type LifecyclePageMode = 'list' | 'detail'

const route = useRoute()
const router = useRouter()
const message = useMessage()

const dateFormat = 'YYYY-MM-DD'
const defaultPageSize = 10

const loading = ref(false)
const detailLoading = ref(false)
const pageMode = computed<LifecyclePageMode>(() => route.params.reportId || route.query.tagId ? 'detail' : 'list')

const filterOptions = reactive({
  subjects: [] as SelectOption[],
  stages: [] as SelectOption[],
  creators: [] as SelectOption[],
})

const listFilters = reactive({
  keyword: '',
  subjectTypes: [] as string[],
  stageValues: [] as string[],
  creatorIds: [] as string[],
  createdRange: null as DateRangeValue | null,
  page: 1,
  pageSize: defaultPageSize,
})
const reportRows = ref<LifecycleReport[]>([])
const reportTotal = ref(0)

const currentReport = ref<LifecycleReport | null>(null)
const activeTab = ref('assets')
const isDemoMode = ref(false)
const returnReportId = ref('')
const switchReportModalVisible = ref(false)
const switchReportKeyword = ref('')
const switchReportLoading = ref(false)
const switchReportRows = ref<LifecycleReport[]>([])
const switchSelectedReportId = ref('')

const analysisDate = ref(dayjs('2026-05-26').valueOf())
const assets = ref<LifecycleStageSnapshot[]>([])
const selectedStageValue = ref('')

const trendRangeKey = ref<LifecycleTrendRangeKey>('last_7_days')
const trendDateRange = ref<DateRangeValue>([
  dayjs('2026-05-20').valueOf(),
  dayjs('2026-05-26').valueOf(),
])
const trendMetric = ref<LifecycleTrendMetric>('total')
const trendStageValues = ref<string[]>([])
const trendView = ref<'chart' | 'table'>('chart')
const trendPoints = ref<LifecycleTrendPoint[]>([])

const transitionDateRange = ref<DateRangeValue>([
  dayjs('2026-05-20').valueOf(),
  dayjs('2026-05-26').valueOf(),
])
const transitionStageValues = ref<string[]>([])
const transitionResult = ref<LifecycleTransitionResult | null>(null)
const selectedTransitionNode = ref<LifecycleTransitionNode | null>(null)
const selectedTransitionEdge = ref<LifecycleTransitionEdge | null>(null)
const transitionActionModalVisible = ref(false)
const transitionDirectionDrawerVisible = ref(false)
const transitionDirectionMode = ref<'inflow' | 'outflow'>('inflow')
const transitionDirectionNode = ref<LifecycleTransitionNode | null>(null)

const businessCharts = ref<LifecycleBusinessChart[]>([])
const chartRowsMap = ref<Record<string, LifecycleBusinessChartDataRow[]>>({})
const chartLoadingIds = ref<string[]>([])
const showChartModal = ref(false)
const showLargeChartModal = ref(false)
const editingChartId = ref('')
const largeChart = ref<LifecycleBusinessChart | null>(null)
const chartDateRange = ref<DateRangeValue>([
  dayjs('2026-05-20').valueOf(),
  dayjs('2026-05-26').valueOf(),
])
const chartForm = reactive({
  title: '',
  stageValues: [] as string[],
  chartType: 'line' as LifecycleChartType,
  dimension: 'time',
  metric: '用户数',
  filters: '',
  filterLogic: 'and' as LifecycleChartFilterLogic,
  sort: 'desc' as 'asc' | 'desc',
  topN: 10,
})
const chartFilterConditions = ref<LifecycleChartFilterCondition[]>([])
const chartInitialSnapshot = ref('')
const chartSaving = ref(false)
const deleteChartModalVisible = ref(false)
const deleteChartTarget = ref<LifecycleBusinessChart | null>(null)

const paths = ref<LifecyclePath[]>([])
const selectedPathId = ref('')
const pathZoom = ref(1)
const pathFullscreen = ref(false)
const selectedPathNode = ref<LifecyclePathNode | null>(null)
const pathModalVisible = ref(false)
const editingPathId = ref('')
const deletePathModalVisible = ref(false)
const deletePathTarget = ref<LifecyclePath | null>(null)
const pathNodeDetailVisible = ref(false)
const pathNodeDetailTarget = ref<LifecyclePathNode | null>(null)
const pathDateRange = ref<DateRangeValue>([
  dayjs('2026-05-20').valueOf(),
  dayjs('2026-05-26').valueOf(),
])
const draggingNodeIndex = ref<number | null>(null)
const pathDraft = reactive<LifecyclePathPayload>({
  name: '',
  description: '',
  updateMode: 'manual',
  dailyExecuteTime: '08:30',
  periodConfig: {
    quickKey: 'last_7_days',
    startDate: '2026-05-20',
    endDate: '2026-05-26',
  },
  targetSegmentId: '',
  targetSegmentName: '全量用户',
  nodes: [],
})

const exportModalVisible = ref(false)
const exportEstimate = ref<number | null>(null)
const exportEstimating = ref(false)
const exportSaving = ref(false)
const exportResult = ref<LifecycleExportSegmentResult | null>(null)
const exportForm = reactive({
  sourceType: 'stage' as LifecycleTransitionSourceType,
  sourceName: '生命周期阶段',
  stageValues: [] as string[],
  crowdRange: 'all' as LifecycleCrowdRange,
  outputIdType: 'user_id',
  segmentName: '',
  description: '',
  authTargets: [] as LifecycleExportAuthTarget[],
  groupIds: [] as string[],
  updateMode: 'on_demand' as 'on_demand' | 'daily',
})
const exportAuthTargetKeys = ref<string[]>([])
const exportSourceConfig = ref<Record<string, unknown> | undefined>(undefined)
const exportDateRange = ref<DateRangeValue>([
  dayjs('2026-05-26').valueOf(),
  dayjs('2026-05-26').valueOf(),
])

const insightModalVisible = ref(false)
const insightSaving = ref(false)
const insightForm = reactive({
  insightObject: 'single' as 'single' | 'merged',
  stageValues: [] as string[],
  reportName: '',
  entryMode: 'direct' as 'direct' | 'stay',
})
const insightSource = ref<{
  sourceType?: LifecycleTransitionSourceType
  sourceName?: string
  crowdRange?: LifecycleCrowdRange
  timeRange?: [string, string]
  sourceConfig?: Record<string, unknown>
}>({})

const authModalVisible = ref(false)
const authTargetReport = ref<LifecycleReport | null>(null)
const authorizations = ref<LifecycleAuthorization[]>([])
const authGlobalMode = ref(false)
const globalAuthReportRows = ref<LifecycleReport[]>([])
const globalAuthReportId = ref('')
const authDraft = reactive({
  principalType: 'user' as LifecycleAuthPrincipalType,
  principalIds: [] as string[],
  permissions: ['view'] as LifecyclePermissionType[],
})
const authEditingId = ref('')

const deleteModalVisible = ref(false)
const deleteTargetReport = ref<LifecycleReport | null>(null)

const auditDrawerVisible = ref(false)
const auditLogs = ref<LifecycleAuditLog[]>([])

const selectResources = computed(() => lifecycleAnalysisService.getSelectResources(currentReport.value?.id))

const trendRangeOptions: SelectOption[] = [
  { label: '过去 7 天', value: 'last_7_days' },
  { label: '过去 14 天', value: 'last_14_days' },
  { label: '过去 3 个月', value: 'last_3_months' },
  { label: '过去 6 个月', value: 'last_6_months' },
  { label: '过去 12 个月', value: 'last_12_months' },
  { label: '自定义', value: 'custom' },
]

const chartTypeOptions: SelectOption[] = [
  { label: '折线图', value: 'line' },
  { label: '柱状图', value: 'bar' },
  { label: '环形图', value: 'donut' },
  { label: '指标卡', value: 'metric' },
  { label: '表格', value: 'table' },
]

const dimensionOptions: SelectOption[] = [
  { label: '时间', value: 'time' },
  { label: '渠道', value: 'channel' },
  { label: '标签', value: 'tag' },
  { label: '属性', value: 'attribute' },
  { label: '行为属性', value: 'event_property' },
]

const metricOptions: SelectOption[] = [
  { label: '用户数', value: '用户数' },
  { label: '行为次数', value: '行为次数' },
  { label: '停留时间', value: '停留时间' },
  { label: '成交金额', value: '成交金额' },
  { label: '复购次数', value: '复购次数' },
]

const attributeFilterOptions = [
  { label: '城市等级', value: 'profile.city_tier', sourceName: '用户属性', values: ['一线', '新一线', '二线', '三线及以下'] },
  { label: '会员等级', value: 'profile.member_level', sourceName: '会员属性', values: ['普通会员', '银卡会员', '金卡会员', '黑金会员'] },
  { label: '最近活跃天数', value: 'profile.active_days_30d', sourceName: '行为属性', values: [] },
  { label: '客单价', value: 'profile.avg_order_amount', sourceName: '交易属性', values: [] },
  { label: '最近渠道', value: 'profile.last_channel', sourceName: '渠道属性', values: ['自然流量', '信息流广告', '私域触达', '搜索渠道', '线下活动'] },
]

const eventFieldOptions = [
  { label: '渠道', value: 'channel', values: ['自然流量', '信息流广告', '私域触达', '搜索渠道', '线下活动'] },
  { label: '终端', value: 'device_type', values: ['iOS', 'Android', 'Web', '小程序'] },
  { label: '活动名称', value: 'campaign_name', values: ['618 预热', '会员召回', '新品试驾', '复购券包'] },
  { label: '金额', value: 'amount', values: [] },
]

const principalResourceOptions: Record<LifecycleAuthPrincipalType, Array<{ label: string; value: string; name: string }>> = {
  user: [
    { label: '林哲', value: 'u-growth', name: '林哲' },
    { label: '许澄', value: 'u-insight', name: '许澄' },
    { label: '陈乔', value: 'u-sales', name: '陈乔' },
  ],
  user_group: [
    { label: '增长运营组', value: 'group-growth', name: '增长运营组' },
    { label: '会员运营组', value: 'group-member', name: '会员运营组' },
  ],
  role: [
    { label: '增长运营角色', value: 'role-growth', name: '增长运营角色' },
    { label: '项目管理员', value: 'role-admin', name: '项目管理员' },
  ],
  department: [
    { label: '用户洞察团队', value: 'dept-insight', name: '用户洞察团队' },
    { label: '增长运营团队', value: 'dept-growth', name: '增长运营团队' },
  ],
}

const permissionOptions = computed(() =>
  Object.entries(lifecyclePermissionLabels).map(([value, label]) => ({ label, value })),
)

const principalOptions = computed<SelectOption[]>(() => principalResourceOptions[authDraft.principalType])

const exportPrincipalOptions = computed<SelectOption[]>(() => {
  const typeLabels: Record<LifecycleAuthPrincipalType, string> = {
    user: '用户',
    user_group: '用户组',
    role: '角色',
    department: '部门',
  }
  return (Object.entries(principalResourceOptions) as Array<[LifecycleAuthPrincipalType, Array<{ label: string; value: string; name: string }>]>
  ).flatMap(([type, options]) => options.map((option) => ({
    label: `${option.label} / ${typeLabels[type]}`,
    value: `${type}:${option.value}`,
  })))
})

const globalAuthReportOptions = computed<SelectOption[]>(() =>
  globalAuthReportRows.value.map((report) => ({ label: `${report.name} / ${report.subjectName}`, value: report.id })),
)

const stageOptions = computed<SelectOption[]>(() =>
  (currentReport.value?.stages ?? [])
    .filter((stage) => stage.visible)
    .map((stage) => ({ label: `${stage.name} ${stage.value}`, value: stage.value })),
)

const activeStages = computed<LifecycleStage[]>(() =>
  currentReport.value?.stages.filter((stage) => stage.visible) ?? [],
)

const currentPath = computed(() => paths.value.find((path) => path.id === selectedPathId.value) ?? null)

const chartFilterSourceOptions: SelectOption[] = [
  { label: '标签条件', value: 'tag' },
  { label: '行为条件', value: 'event' },
  { label: '属性条件', value: 'attribute' },
]

const chartFilterLogicOptions: SelectOption[] = [
  { label: '满足全部条件', value: 'and' },
  { label: '满足任一条件', value: 'or' },
]

const chartFilterOperatorOptions: SelectOption[] = [
  { label: '等于', value: 'equals' },
  { label: '不等于', value: 'not_equals' },
  { label: '包含', value: 'contains' },
  { label: '不包含', value: 'not_contains' },
  { label: '属于', value: 'in' },
  { label: '不属于', value: 'not_in' },
  { label: '大于', value: 'greater_than' },
  { label: '大于等于', value: 'greater_equal' },
  { label: '小于', value: 'less_than' },
  { label: '小于等于', value: 'less_equal' },
  { label: '介于', value: 'between' },
  { label: '有值', value: 'has_value' },
  { label: '无值', value: 'no_value' },
]

const noValueOperators = new Set<LifecycleChartFilterOperator>(['has_value', 'no_value'])
const multiValueOperators = new Set<LifecycleChartFilterOperator>(['in', 'not_in'])

const pathPeriodQuickOptions: SelectOption[] = [
  { label: '最近 7 天', value: 'last_7_days' },
  { label: '最近 14 天', value: 'last_14_days' },
  { label: '最近 30 天', value: 'last_30_days' },
  { label: '自定义', value: 'custom' },
]

const chartFormSnapshot = computed(() => JSON.stringify({
  ...chartForm,
  timeRange: toDateRangeStrings(chartDateRange.value),
  filterConditions: chartFilterConditions.value,
}))

const isChartFormDirty = computed(() => chartInitialSnapshot.value !== chartFormSnapshot.value)

const exportSaveDisabled = computed(() =>
  exportEstimating.value
  || exportEstimate.value === null
  || exportEstimate.value === 0
  || !exportForm.stageValues.length
  || !exportForm.outputIdType
  || !exportForm.segmentName.trim(),
)

const transitionDirectionRows = computed(() => {
  const node = transitionDirectionNode.value
  const result = transitionResult.value
  if (!node || !result) return []
  return result.edges.filter((edge) => transitionDirectionMode.value === 'inflow' ? edge.toStage === node.stageValue : edge.fromStage === node.stageValue)
})

const transitionActionTitle = computed(() => {
  if (selectedTransitionNode.value) return `阶段节点：${selectedTransitionNode.value.stageName}`
  if (selectedTransitionEdge.value) return `流转连线：${selectedTransitionEdge.value.fromStageName} → ${selectedTransitionEdge.value.toStageName}`
  return '关系流转'
})

const pathTagOptions = computed<SelectOption[]>(() => selectResources.value.tags.map((tag) => ({ label: tag.label, value: tag.value })))

const canMutateDetail = computed(() => Boolean(currentReport.value && !currentReport.value.isDemo))

const maxDataDate = computed(() => currentReport.value?.maxDataDate ?? '2026-05-26')

const formattedAnalysisDate = computed(() => dayjs(analysisDate.value).format(dateFormat))

const assetTotal = computed(() => assets.value.reduce((sum, item) => sum + item.totalCount, 0))

const trendTableRows = computed(() =>
  trendPoints.value.map((point, index) => ({ ...point, key: `${point.date}-${point.stageValue}-${index}` })),
)

const detailMoreOptions = computed<DropdownOption[]>(() => {
  const report = currentReport.value
  if (!report) return []
  const options: DropdownOption[] = [
    ...(report.permissions.manageAuthorization && !report.isDemo ? [{ label: '权限管理', key: 'auth' }] : []),
    ...(report.permissions.manageReport && report.permissions.deleteLifecycleTag && !report.isDemo ? [{ label: '删除报告', key: 'delete' }] : []),
    { label: '刷新数据', key: 'refresh' },
    { label: '查看标签详情', key: 'tag-detail' },
    { label: '跳转标签管理', key: 'tag-manage' },
    { label: '审计日志', key: 'audit' },
  ]
  return options
})

const formatNumber = (value: number): string => new Intl.NumberFormat('zh-CN').format(value)

const formatDateTime = (value: string): string => dayjs(value).format('YYYY-MM-DD HH:mm')

const formatPercent = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '--'
  return `${value.toFixed(2)}%`
}

const toDateRangeStrings = (range: DateRangeValue): [string, string] => [
  dayjs(range[0]).format(dateFormat),
  dayjs(range[1]).format(dateFormat),
]

const tagType = (type: 'success' | 'warning' | 'error' | 'info' | 'default'): TagProps['type'] => type

const reportStatusTagType = (status: LifecycleReport['status']): TagProps['type'] => {
  if (status === 'enabled') return 'success'
  if (status === 'disabled') return 'warning'
  return 'error'
}

const pathStatusTagType = (status: LifecyclePath['status']): TagProps['type'] => {
  if (status === 'success') return 'success'
  if (status === 'calculating') return 'info'
  return 'error'
}

const disableFutureDate = (timestamp: number): boolean =>
  dayjs(timestamp).isAfter(dayjs(maxDataDate.value), 'day')

const reportColumns: DataTableColumns<LifecycleReport> = [
  {
    title: '报告名称',
    key: 'name',
    minWidth: 220,
    render: (row) => h(NButton, { text: true, type: 'primary', onClick: () => void openReport(row) }, { default: () => row.name }),
  },
  { title: '主体', key: 'subjectName', width: 100 },
  {
    title: '生命周期阶段',
    key: 'stages',
    minWidth: 260,
    render: (row) => h(NSpace, { size: 6 }, {
      default: () => row.stages.map((stage) => h(NTag, { size: 'small', bordered: false, color: { color: `${stage.color}18`, textColor: stage.color } }, { default: () => stage.name })),
    }),
  },
  { title: '创建人', key: 'creatorName', width: 110 },
  {
    title: '创建时间',
    key: 'createdAt',
    width: 130,
    render: (row) => dayjs(row.createdAt).format('YYYY-MM-DD'),
  },
  {
    title: '最近更新时间',
    key: 'updatedAt',
    width: 150,
    render: (row) => dayjs(row.updatedAt).format('YYYY-MM-DD HH:mm'),
  },
  {
    title: '状态',
    key: 'status',
    width: 90,
    render: (row) => h(NTag, { size: 'small', type: reportStatusTagType(row.status) }, { default: () => lifecycleReportStatusLabels[row.status] }),
  },
  {
    title: '操作',
    key: 'actions',
    width: 230,
    fixed: 'right',
    render: (row) => h(NSpace, { size: 6 }, {
      default: () => [
        row.permissions.viewReport && row.permissions.tagResourceView
          ? h(NButton, { text: true, type: 'primary', size: 'small', onClick: () => void openReport(row) }, { default: () => '查看' })
          : null,
        row.permissions.manageAuthorization
          ? h(NButton, { text: true, size: 'small', onClick: () => void openAuthModal(row) }, { default: () => '权限管理' })
          : null,
        row.permissions.deleteLifecycleTag && row.permissions.manageReport
          ? h(NButton, { text: true, type: 'error', size: 'small', onClick: () => openDeleteModal(row) }, { default: () => '删除' })
          : null,
      ],
    }),
  },
]

const trendColumns: DataTableColumns<LifecycleTrendPoint & { key: string }> = [
  { title: '日期', key: 'date', width: 120 },
  { title: '生命周期阶段', key: 'stageName', width: 140 },
  { title: '指标类型', key: 'metricType', render: (row) => lifecycleTrendMetricLabels[row.metricType] },
  { title: '人数', key: 'count', render: (row) => formatNumber(row.count) },
  { title: '环比', key: 'changeRate', render: (row) => formatPercent(row.changeRate) },
]

const authColumns: DataTableColumns<LifecycleAuthorization> = [
  { title: '授权对象', key: 'principalName' },
  {
    title: '对象类型',
    key: 'principalType',
    render: (row) => ({ user: '用户', user_group: '用户组', role: '角色', department: '部门' })[row.principalType],
  },
  {
    title: '权限类型',
    key: 'permissions',
    render: (row) => h(NSpace, { size: 6 }, {
      default: () => row.permissions.map((permission) => h(NTag, { size: 'small' }, { default: () => lifecyclePermissionLabels[permission] })),
    }),
  },
  {
    title: '标签查看权限',
    key: 'tagViewGranted',
    render: (row) => row.tagViewGranted ? `已同步 ${row.tagPermissionSyncedAt ? formatDateTime(row.tagPermissionSyncedAt) : ''}` : '未自动同步',
  },
  {
    title: '项目中心联动',
    key: 'projectAuthorizationName',
    render: (row) => row.projectAuthorizationId ? row.projectAuthorizationName : '未同步',
  },
  { title: '授权人', key: 'grantedBy' },
  { title: '授权时间', key: 'grantedAt', render: (row) => formatDateTime(row.grantedAt) },
  {
    title: '操作',
    key: 'actions',
    width: 130,
    render: (row) => h(NSpace, { size: 6 }, {
      default: () => [
        h(NButton, { text: true, type: 'primary', size: 'small', onClick: () => editAuthorization(row) }, { default: () => '更新' }),
        h(NPopconfirm, { onPositiveClick: () => void revokeAuthorization(row) }, {
          trigger: () => h(NButton, { text: true, type: 'error', size: 'small' }, { default: () => '取消' }),
          default: () => '取消授权后，生命周期分析权限会立即失效；标签查看权限按策略保留。',
        }),
      ],
    }),
  },
]

const auditColumns: DataTableColumns<LifecycleAuditLog> = [
  { title: '操作时间', key: 'createdAt', width: 170, render: (row) => formatDateTime(row.createdAt) },
  { title: '操作用户', key: 'userName', width: 110 },
  { title: '操作类型', key: 'action', width: 170 },
  { title: '目标对象', key: 'targetId', render: (row) => row.targetId || '-' },
  { title: '变更前', key: 'before', render: (row) => row.before || '-' },
  { title: '变更后', key: 'after', render: (row) => row.after || '-' },
  { title: 'IP', key: 'ip', width: 120 },
]

const switchReportColumns: DataTableColumns<LifecycleReport> = [
  {
    title: '报告名称',
    key: 'name',
    minWidth: 220,
    render: (row) => h(NButton, { text: true, type: 'primary', onClick: () => { switchSelectedReportId.value = row.id } }, { default: () => row.name }),
  },
  { title: '主体', key: 'subjectName', width: 90 },
  {
    title: '生命周期阶段',
    key: 'stages',
    minWidth: 230,
    render: (row) => h(NSpace, { size: 6 }, {
      default: () => row.stages.map((stage) => h(NTag, { size: 'small', bordered: false }, { default: () => stage.name })),
    }),
  },
  { title: '创建人', key: 'creatorName', width: 110 },
  { title: '更新时间', key: 'updatedAt', width: 150, render: (row) => dayjs(row.updatedAt).format('YYYY-MM-DD HH:mm') },
  {
    title: '选择',
    key: 'select',
    width: 90,
    render: (row) => h(NButton, {
      size: 'small',
      type: switchSelectedReportId.value === row.id ? 'primary' : 'default',
      onClick: () => { switchSelectedReportId.value = row.id },
    }, { default: () => switchSelectedReportId.value === row.id ? '已选择' : '选择' }),
  },
]

const businessTableColumns: DataTableColumns<LifecycleBusinessChartDataRow> = [
  { title: '维度值', key: 'name' },
  { title: '生命周期阶段', key: 'stageName' },
  { title: '指标值', key: 'value', render: (row) => formatNumber(row.value) },
]

const transitionEdgeColumns: DataTableColumns<LifecycleTransitionEdge> = [
  { title: '起始阶段', key: 'fromStageName' },
  { title: '目标阶段', key: 'toStageName' },
  { title: '流转人数', key: 'userCount', render: (row) => formatNumber(row.userCount) },
  { title: '起始阶段占比', key: 'fromRatio', render: (row) => formatPercent(row.fromRatio) },
  { title: '目标阶段占比', key: 'toRatio', render: (row) => formatPercent(row.toRatio) },
  {
    title: '操作',
    key: 'actions',
    render: (row) => h(NSpace, { size: 6 }, {
      default: () => [
        h(NButton, { text: true, size: 'small', onClick: () => selectTransitionEdge(row) }, { default: () => '查看' }),
        currentReport.value?.isDemo
          ? null
          : h(NButton, { text: true, type: 'primary', size: 'small', disabled: !currentReport.value?.permissions.createSegment, onClick: () => openExportFromTransition(row) }, { default: () => '导出' }),
      ],
    }),
  },
]

const trendChartOption = computed<EChartsOption>(() => {
  const stageNames = [...new Set(trendPoints.value.map((point) => point.stageName))]
  const dates = [...new Set(trendPoints.value.map((point) => point.date))]
  return {
    color: activeStages.value.map((stage) => stage.color),
    tooltip: { trigger: 'axis' },
    legend: { type: 'scroll', top: 0 },
    grid: { left: 44, right: 24, top: 48, bottom: 40 },
    xAxis: { type: 'category', data: dates },
    yAxis: { type: 'value' },
    series: stageNames.map((stageName) => ({
      name: stageName,
      type: 'line',
      smooth: true,
      showSymbol: false,
      data: dates.map((date) => trendPoints.value.find((point) => point.date === date && point.stageName === stageName)?.count ?? 0),
    })),
  }
})

const transitionChartOption = computed<EChartsOption>(() => {
  const result = transitionResult.value
  if (!result) return {}
  const data = result.nodes.map((node) => ({
    name: `${node.side === 'from' ? '起始' : '结束'}-${node.stageName}`,
    nodeId: node.id,
    stageValue: node.stageValue,
    side: node.side,
    value: node.userCount,
    itemStyle: {
      color: currentReport.value?.stages.find((stage) => stage.value === node.stageValue)?.color,
      borderColor: selectedStageValue.value === node.stageValue ? '#111827' : '#ffffff',
      borderWidth: selectedStageValue.value === node.stageValue ? 3 : 1,
    },
  }))
  const links = result.edges.map((edge) => ({
    edgeId: edge.id,
    source: `起始-${edge.fromStageName}`,
    target: `结束-${edge.toStageName}`,
    value: edge.userCount,
  }))
  return {
    tooltip: { trigger: 'item', triggerOn: 'mousemove' },
    series: [{
      type: 'sankey',
      data,
      links,
      emphasis: { focus: 'adjacency' },
      lineStyle: { color: 'gradient', curveness: 0.5 },
      label: { color: '#1f2937' },
    }],
  }
})

const optionForBusinessChart = (chart: LifecycleBusinessChart): EChartsOption => {
  const rows = chartRowsMap.value[chart.id] ?? []
  if (chart.chartType === 'donut') {
    return {
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      series: [{ type: 'pie', radius: ['46%', '68%'], data: rows.map((row) => ({ name: row.name, value: row.value })) }],
    }
  }
  if (chart.chartType === 'bar') {
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 44, right: 20, top: 18, bottom: 42 },
      xAxis: { type: 'category', data: rows.map((row) => row.name) },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: rows.map((row) => row.value), itemStyle: { color: '#2563eb' } }],
    }
  }
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 44, right: 20, top: 18, bottom: 42 },
    xAxis: { type: 'category', data: rows.map((row) => row.name) },
    yAxis: { type: 'value' },
    series: [{ type: 'line', smooth: true, showSymbol: false, data: rows.map((row) => row.value), itemStyle: { color: '#16a34a' } }],
  }
}

const chartActionOptions = (_chart: LifecycleBusinessChart): DropdownOption[] => {
  const report = currentReport.value
  const options: DropdownOption[] = []
  if (report?.permissions.editReport && !report.isDemo) {
    options.push({ label: '编辑', key: 'edit' }, { label: '删除', key: 'delete' })
  }
  options.push({ label: '刷新', key: 'refresh' }, { label: '放大', key: 'large' })
  if (report?.permissions.downloadChartData && !report.isDemo) {
    options.push({ label: '下载数据', key: 'download' })
  }
  return options
}

const pathMoreOptions = computed<DropdownOption[]>(() => [
  ...(currentReport.value?.permissions.managePath && !currentReport.value?.isDemo
    ? [
        { label: '编辑路径', key: 'edit' },
        { label: '删除路径', key: 'delete' },
        { label: '重新计算路径', key: 'recalculate' },
      ]
    : []),
])

async function loadFilterOptions(): Promise<void> {
  const options = await lifecycleAnalysisService.getFilterOptions()
  filterOptions.subjects = options.subjects
  filterOptions.stages = options.stages
  filterOptions.creators = options.creators
}

async function loadReports(): Promise<void> {
  loading.value = true
  try {
    const createdRange = listFilters.createdRange ? toDateRangeStrings(listFilters.createdRange) : null
    const result = await lifecycleAnalysisService.searchReports({
      keyword: listFilters.keyword,
      subjectTypes: listFilters.subjectTypes,
      stageValues: listFilters.stageValues,
      creatorIds: listFilters.creatorIds,
      createdRange,
      page: listFilters.page,
      pageSize: listFilters.pageSize,
    })
    reportRows.value = result.records
    reportTotal.value = result.total
  } finally {
    loading.value = false
  }
}

function submitListSearch(): void {
  listFilters.page = 1
  void loadReports()
}

async function loadFromRoute(): Promise<void> {
  if (pageMode.value === 'list') {
    isDemoMode.value = false
    currentReport.value = null
    await loadFilterOptions()
    await loadReports()
    return
  }

  const tagId = String(route.query.tagId ?? '')
  if (tagId && !route.params.reportId) {
    try {
      const report = await lifecycleAnalysisService.getReportByTagId(tagId)
      await router.replace({ path: `/user-insight/lifecycle-analysis/${report.id}`, query: { from: 'tag', tagId } })
      return
    } catch (error) {
      message.error(error instanceof Error ? error.message : '暂无该生命周期分析报告查看权限。')
      await router.replace('/user-insight/lifecycle-analysis')
      return
    }
  }

  const reportId = String(route.params.reportId)
  if (reportId) {
    await loadDetail(reportId)
  }
}

async function loadDetail(reportId: string): Promise<void> {
  detailLoading.value = true
  try {
    const report = await lifecycleAnalysisService.getReport(reportId)
    currentReport.value = report
    activeTab.value = 'assets'
    analysisDate.value = dayjs(report.latestDataDate).valueOf()
    selectedStageValue.value = report.stages.find((stage) => stage.visible)?.value ?? ''
    trendStageValues.value = selectedStageValue.value ? [selectedStageValue.value] : []
    transitionStageValues.value = report.stages.filter((stage) => stage.visible).map((stage) => stage.value)
    applyTrendQuickRange('last_7_days')
    transitionDateRange.value = [
      dayjs(report.maxDataDate).subtract(6, 'day').valueOf(),
      dayjs(report.maxDataDate).valueOf(),
    ]
    await Promise.all([
      loadAssets(),
      loadBusinessCharts(),
      loadPaths(),
      loadAuthorizations(report.id),
      loadAuditLogs(report.id),
    ])
  } catch (error) {
    message.error(error instanceof Error ? error.message : '报告加载失败')
    await router.replace('/user-insight/lifecycle-analysis')
  } finally {
    detailLoading.value = false
  }
}

async function loadAssets(): Promise<void> {
  const report = currentReport.value
  if (!report) return
  assets.value = await lifecycleAnalysisService.getAssets(report.id, formattedAnalysisDate.value)
  await Promise.all([loadTrend(), loadTransition(), ...businessCharts.value.map((chart) => loadBusinessChartData(chart))])
}

async function loadTrend(): Promise<void> {
  const report = currentReport.value
  if (!report) return
  const [startDate, endDate] = toDateRangeStrings(trendDateRange.value)
  if (dayjs(endDate).diff(dayjs(startDate), 'month', true) > 12) {
    message.warning('趋势分析最多支持查看过去 12 个月，请缩短自定义时间范围。')
    trendDateRange.value = [dayjs(endDate).subtract(12, 'month').valueOf(), dayjs(endDate).valueOf()]
    return loadTrend()
  }
  trendPoints.value = await lifecycleAnalysisService.getTrend(report.id, {
    startDate,
    endDate,
    stageValues: trendStageValues.value,
    metricType: trendMetric.value,
  })
}

async function loadTransition(): Promise<void> {
  const report = currentReport.value
  if (!report) return
  const [startDate, endDate] = toDateRangeStrings(transitionDateRange.value)
  transitionResult.value = await lifecycleAnalysisService.getTransition(report.id, {
    startDate,
    endDate,
    stageValues: transitionStageValues.value,
  })
  if (selectedStageValue.value) {
    selectedTransitionNode.value = transitionResult.value.nodes.find((node) => node.stageValue === selectedStageValue.value) ?? null
  }
}

async function loadBusinessCharts(): Promise<void> {
  const report = currentReport.value
  if (!report) return
  businessCharts.value = await lifecycleAnalysisService.getBusinessCharts(report.id)
  await Promise.all(businessCharts.value.map((chart) => loadBusinessChartData(chart)))
}

async function loadBusinessChartData(chart: LifecycleBusinessChart): Promise<void> {
  const report = currentReport.value
  if (!report) return
  chartLoadingIds.value.push(chart.id)
  try {
    chartRowsMap.value = {
      ...chartRowsMap.value,
      [chart.id]: await lifecycleAnalysisService.getBusinessChartData(report, chart, formattedAnalysisDate.value),
    }
  } finally {
    chartLoadingIds.value = chartLoadingIds.value.filter((id) => id !== chart.id)
  }
}

async function loadPaths(): Promise<void> {
  const report = currentReport.value
  if (!report) return
  const previousPathId = selectedPathId.value
  const previousNodeId = selectedPathNode.value?.id
  paths.value = await lifecycleAnalysisService.getPaths(report.id)
  selectedPathId.value = paths.value.some((path) => path.id === previousPathId) ? previousPathId : paths.value[0]?.id ?? ''
  selectedPathNode.value = currentPath.value?.nodes.find((node) => node.id === previousNodeId) ?? currentPath.value?.nodes[0] ?? null
}

async function loadAuthorizations(reportId: string): Promise<void> {
  authorizations.value = await lifecycleAnalysisService.getAuthorizations(reportId)
}

async function loadAuditLogs(reportId: string): Promise<void> {
  auditLogs.value = await lifecycleAnalysisService.getAuditLogs(reportId)
}

async function openReport(row: LifecycleReport): Promise<void> {
  if (!row.permissions.viewReport || !row.permissions.tagResourceView) {
    message.error('暂无该生命周期报告查看权限。')
    return
  }
  await router.push(`/user-insight/lifecycle-analysis/${row.id}`)
}

async function goBack(): Promise<void> {
  if (isDemoMode.value && returnReportId.value) {
    isDemoMode.value = false
    await loadDetail(returnReportId.value)
    return
  }
  if (route.query.from === 'tag' && route.query.tagId) {
    await router.push(`/user-insight/tags/${route.query.tagId}`)
    return
  }
  await router.push('/user-insight/lifecycle-analysis')
}

async function openSwitchReportModal(): Promise<void> {
  const report = currentReport.value
  if (!report) return
  switchReportModalVisible.value = true
  switchSelectedReportId.value = report.id
  switchReportKeyword.value = ''
  await loadSwitchReports()
}

async function loadSwitchReports(): Promise<void> {
  switchReportLoading.value = true
  try {
    const result = await lifecycleAnalysisService.searchReports({
      keyword: switchReportKeyword.value,
      subjectTypes: [],
      stageValues: [],
      creatorIds: [],
      createdRange: null,
      page: 1,
      pageSize: 50,
    })
    switchReportRows.value = result.records
  } finally {
    switchReportLoading.value = false
  }
}

async function confirmSwitchReport(): Promise<void> {
  const report = currentReport.value
  if (!report || !switchSelectedReportId.value) return
  if (switchSelectedReportId.value === report.id) {
    switchReportModalVisible.value = false
    return
  }
  try {
    await lifecycleAnalysisService.switchReport(report.id, switchSelectedReportId.value)
    switchReportModalVisible.value = false
    isDemoMode.value = false
    activeTab.value = 'assets'
    await router.push(`/user-insight/lifecycle-analysis/${switchSelectedReportId.value}`)
    message.success('已切换分析报告，页面筛选和日期已恢复默认状态。')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '切换分析报告失败')
  }
}

function resetFilters(): void {
  listFilters.keyword = ''
  listFilters.subjectTypes = []
  listFilters.stageValues = []
  listFilters.creatorIds = []
  listFilters.createdRange = null
  listFilters.page = 1
  void loadReports()
}

function handlePageChange(page: number): void {
  listFilters.page = page
  void loadReports()
}

function handlePageSizeChange(pageSize: number): void {
  listFilters.pageSize = pageSize
  listFilters.page = 1
  void loadReports()
}

function selectStage(stage: LifecycleStage): void {
  selectedStageValue.value = stage.value
  trendStageValues.value = [stage.value]
  selectedTransitionNode.value = transitionResult.value?.nodes.find((node) => node.stageValue === stage.value) ?? null
  selectedTransitionEdge.value = null
  void loadTrend()
}

function assetForStage(stageValue: string): LifecycleStageSnapshot | undefined {
  return assets.value.find((item) => item.stageValue === stageValue)
}

function growthIndicator(snapshot?: LifecycleStageSnapshot): string {
  if (!snapshot || snapshot.dayGrowthRate === null) return '--'
  if (snapshot.dayGrowthRate > 0) return `↑ ${formatPercent(snapshot.dayGrowthRate)}`
  if (snapshot.dayGrowthRate < 0) return `↓ ${formatPercent(Math.abs(snapshot.dayGrowthRate))}`
  return `持平 ${formatPercent(snapshot.dayGrowthRate)}`
}

function growthClass(snapshot?: LifecycleStageSnapshot): string {
  if (!snapshot || snapshot.dayGrowthRate === null) return 'neutral'
  if (snapshot.dayGrowthRate > 0) return 'up'
  if (snapshot.dayGrowthRate < 0) return 'down'
  return 'flat'
}

function stageActionOptions(): DropdownOption[] {
  return [
    ...(currentReport.value?.isDemo ? [] : [
      { label: '导出分群', key: 'export' },
      { label: '洞察此分群', key: 'insight' },
    ]),
    { label: '查看趋势', key: 'trend' },
  ]
}

function applyTrendQuickRange(key: LifecycleTrendRangeKey): void {
  trendRangeKey.value = key
  const report = currentReport.value
  if (!report || key === 'custom') return
  const end = dayjs(report.maxDataDate)
  const start = key === 'last_7_days'
    ? end.subtract(6, 'day')
    : key === 'last_14_days'
      ? end.subtract(13, 'day')
      : key === 'last_3_months'
        ? end.subtract(3, 'month')
        : key === 'last_6_months'
          ? end.subtract(6, 'month')
          : end.subtract(12, 'month')
  trendDateRange.value = [start.valueOf(), end.valueOf()]
  void loadTrend()
}

async function openDemo(): Promise<void> {
  const report = currentReport.value
  if (!report) return
  returnReportId.value = report.id
  const demo = await lifecycleAnalysisService.getDemoReport(report.id)
  isDemoMode.value = true
  currentReport.value = demo
  activeTab.value = 'assets'
  analysisDate.value = dayjs(demo.latestDataDate).valueOf()
  selectedStageValue.value = demo.stages[0]?.value ?? ''
  trendStageValues.value = selectedStageValue.value ? [selectedStageValue.value] : []
  transitionStageValues.value = demo.stages.map((stage) => stage.value)
  applyTrendQuickRange('last_7_days')
  await Promise.all([loadAssets(), loadBusinessCharts(), loadPaths(), loadAuthorizations(demo.id), loadAuditLogs(demo.id)])
}

async function handleDetailMoreSelect(key: string): Promise<void> {
  const report = currentReport.value
  if (!report) return
  if (key === 'auth') {
    await openAuthModal(report)
  }
  if (key === 'delete') {
    openDeleteModal(report)
  }
  if (key === 'refresh') {
    currentReport.value = await lifecycleAnalysisService.refreshReport(report.id)
    await loadAssets()
    message.success('数据已刷新。')
  }
  if (key === 'tag-detail') {
    await router.push(`/user-insight/tags/${report.tagId}`)
  }
  if (key === 'tag-manage') {
    await router.push('/user-insight/tags')
  }
  if (key === 'audit') {
    await loadAuditLogs(report.id)
    auditDrawerVisible.value = true
  }
}

function openStageExport(stageValue: string, crowdRange: LifecycleCrowdRange): void {
  const report = currentReport.value
  if (!report) return
  const stage = report.stages.find((item) => item.value === stageValue)
  const snapshot = assetForStage(stageValue)
  const count = crowdRange === 'new'
    ? snapshot?.newCount ?? 0
    : crowdRange === 'lost'
      ? snapshot?.lostCount ?? 0
      : snapshot?.totalCount ?? 0
  if (count <= 0) {
    message.warning('当前阶段暂无用户，无法导出分群。')
    return
  }
  openExport({
    sourceType: 'stage',
    sourceName: stage ? `生命周期阶段：${stage.name}` : '生命周期阶段',
    stageValues: [stageValue],
    crowdRange,
  })
}

function openTopExport(): void {
  openExport({
    sourceType: 'stage',
    sourceName: '顶部导出分群',
    stageValues: selectedStageValue.value ? [selectedStageValue.value] : activeStages.value.map((stage) => stage.value),
    crowdRange: 'all',
  })
}

function openExport(params: {
  sourceType: LifecycleTransitionSourceType
  sourceName: string
  stageValues: string[]
  crowdRange: LifecycleCrowdRange
  sourceConfig?: Record<string, unknown>
}): void {
  const report = currentReport.value
  if (!report) return
  if (!report.permissions.createSegment) {
    message.warning('暂无创建分群权限，请联系管理员开通。')
    return
  }
  const stageNames = params.stageValues.map((value) => reportStageLabel(value)).join('、') || '多阶段'
  exportForm.sourceType = params.sourceType
  exportForm.sourceName = params.sourceName
  exportForm.stageValues = [...params.stageValues]
  exportForm.crowdRange = params.crowdRange
  exportForm.outputIdType = selectResources.value.outputIdTypes[0]?.value ?? 'user_id'
  exportForm.segmentName = `${report.name}_${stageNames}_${lifecycleCrowdRangeLabels[params.crowdRange]}`
  exportForm.description = `来源：${params.sourceName}，按 ${formattedAnalysisDate.value} 数据生成。`
  exportForm.authTargets = []
  exportAuthTargetKeys.value = []
  exportForm.groupIds = ['group-growth']
  exportForm.updateMode = 'on_demand'
  exportSourceConfig.value = params.sourceConfig
  const sourceTimeRange = params.sourceConfig?.timeRange as [string, string] | undefined
  exportDateRange.value = sourceTimeRange
    ? [dayjs(sourceTimeRange[0]).valueOf(), dayjs(sourceTimeRange[1]).valueOf()]
    : [analysisDate.value, analysisDate.value]
  exportResult.value = null
  exportModalVisible.value = true
  void refreshExportEstimate(params.sourceConfig)
}

function reportStageLabel(stageValue: string): string {
  return currentReport.value?.stages.find((stage) => stage.value === stageValue)?.name ?? stageValue
}

function chartDisplayRange(chart: LifecycleBusinessChart): string {
  const end = dayjs(formattedAnalysisDate.value)
  const span = Math.max(dayjs(chart.timeRange[1]).diff(dayjs(chart.timeRange[0]), 'day'), 0)
  return `${end.subtract(span, 'day').format(dateFormat)} 至 ${end.format(dateFormat)}`
}

function exportAuthTargetsFromKeys(): LifecycleExportAuthTarget[] {
  return exportAuthTargetKeys.value.flatMap((key) => {
    const [type, id] = key.split(':') as [LifecycleAuthPrincipalType | undefined, string | undefined]
    if (!type || !id || !principalResourceOptions[type]) return []
    const resource = principalResourceOptions[type].find((item) => item.value === id)
    return [{
      principalType: type,
      principalId: id,
      principalName: resource?.name ?? id,
    }]
  })
}

function sourceConfigWithDefaults(config?: Record<string, unknown>): Record<string, unknown> {
  return {
    stageValues: exportForm.stageValues,
    crowdRange: exportForm.crowdRange,
    timeRange: toDateRangeStrings(exportDateRange.value),
    outputIdType: exportForm.outputIdType,
    ...(config ?? {}),
  }
}

function buildExportPayload(sourceConfig?: Record<string, unknown>): LifecycleExportSegmentPayload {
  const report = currentReport.value
  if (!report) throw new Error('报告不存在。')
  return {
    reportId: report.id,
    sourceType: exportForm.sourceType,
    sourceName: exportForm.sourceName,
    stageValues: exportForm.stageValues,
    crowdRange: exportForm.crowdRange,
    timeRange: toDateRangeStrings(exportDateRange.value),
    outputIdType: exportForm.outputIdType,
    segmentName: exportForm.segmentName,
    description: exportForm.description,
    authTargets: exportAuthTargetsFromKeys(),
    groupIds: exportForm.groupIds,
    updateMode: exportForm.updateMode,
    sourceConfig: sourceConfigWithDefaults(sourceConfig ?? exportSourceConfig.value),
  }
}

async function refreshExportEstimate(sourceConfig?: Record<string, unknown>): Promise<void> {
  if (!currentReport.value) return
  exportEstimating.value = true
  try {
    exportEstimate.value = await lifecycleAnalysisService.estimateExport(buildExportPayload(sourceConfig))
  } finally {
    exportEstimating.value = false
  }
}

async function saveExport(): Promise<void> {
  if (exportSaveDisabled.value) {
    message.warning(exportEstimating.value ? '预估人数计算中，请稍后保存。' : '请完善导出分群规则。')
    return
  }
  exportSaving.value = true
  try {
    const result = await lifecycleAnalysisService.exportSegment(buildExportPayload())
    exportResult.value = result
    if (result.status === 'success') {
      message.success(result.message)
    } else {
      message.warning(result.message)
    }
  } catch (error) {
    message.error(error instanceof Error ? error.message : '导出分群失败')
  } finally {
    exportSaving.value = false
  }
}

function openStageInsight(stageValues: string[], source?: {
  sourceType?: LifecycleTransitionSourceType
  sourceName?: string
  crowdRange?: LifecycleCrowdRange
  timeRange?: [string, string]
  sourceConfig?: Record<string, unknown>
}): void {
  const report = currentReport.value
  if (!report) return
  if (!report.permissions.viewGroupProfile) {
    message.warning('暂无群体画像洞察权限。')
    return
  }
  insightForm.stageValues = [...stageValues]
  insightForm.insightObject = stageValues.length > 1 ? 'merged' : 'single'
  insightSource.value = source ?? {}
  insightForm.reportName = source?.sourceName
    ? `${report.name}_${source.sourceName}_群体洞察`
    : stageValues.length > 1
    ? `${report.name}_多阶段群体洞察`
    : `${report.name}_${reportStageLabel(stageValues[0] ?? '')}_群体洞察`
  insightForm.entryMode = 'direct'
  insightModalVisible.value = true
}

async function saveInsight(): Promise<void> {
  const report = currentReport.value
  if (!report) return
  insightSaving.value = true
  try {
    const payload: LifecycleInsightPayload = {
      reportId: report.id,
      insightObject: insightForm.insightObject,
      stageValues: insightForm.stageValues,
      reportName: insightForm.reportName || (insightForm.stageValues.length > 1 ? `${report.name}_多阶段群体洞察` : `${report.name}_${reportStageLabel(insightForm.stageValues[0] ?? '')}_群体洞察`),
      entryMode: insightForm.entryMode,
      ...insightSource.value,
    }
    const result = await lifecycleAnalysisService.createInsight(payload)
    message.success(result.message)
    insightModalVisible.value = false
    if (payload.entryMode === 'direct') {
      await router.push(result.redirectPath)
    }
  } catch (error) {
    message.error(error instanceof Error ? error.message : '洞察分群失败')
  } finally {
    insightSaving.value = false
  }
}

function defaultChartFilterCondition(source: LifecycleChartFilterSource = 'tag'): LifecycleChartFilterCondition {
  const tag = selectResources.value.tags[0]
  const event = selectResources.value.events[0]
  const attribute = attributeFilterOptions[0]
  if (source === 'event') {
    const eventName = String(event?.value ?? 'ad_exposure')
    const field = eventFieldOptions[0]!
    return {
      id: `chart-filter-${Date.now()}-${Math.round(Math.random() * 10000)}`,
      source,
      sourceId: eventName,
      sourceName: typeof event?.label === 'string' ? event.label : '行为事件',
      field: `${eventName}.${field.value}`,
      label: field.label,
      operator: 'equals',
      value: field.values[0] ?? '',
      timeRange: toDateRangeStrings(chartDateRange.value),
    }
  }
  if (source === 'attribute') {
    return {
      id: `chart-filter-${Date.now()}-${Math.round(Math.random() * 10000)}`,
      source,
      sourceId: attribute?.value ?? 'profile.city_tier',
      sourceName: attribute?.sourceName ?? '用户属性',
      field: attribute?.value ?? 'profile.city_tier',
      label: attribute?.label ?? '属性',
      operator: 'equals',
      value: attribute?.values[0] ?? '',
    }
  }
  return {
    id: `chart-filter-${Date.now()}-${Math.round(Math.random() * 10000)}`,
    source,
    sourceId: String(tag?.value ?? currentReport.value?.tagId ?? 'tag'),
    sourceName: String(tag?.label ?? currentReport.value?.tagName ?? '生命周期标签'),
    field: String(tag?.value ?? currentReport.value?.tagId ?? 'tag'),
    label: '标签值',
    operator: 'equals',
    value: String(tag?.values?.[0]?.value ?? ''),
  }
}

function addChartFilterCondition(): void {
  chartFilterConditions.value.push(defaultChartFilterCondition())
}

function removeChartFilterCondition(index: number): void {
  chartFilterConditions.value.splice(index, 1)
}

function handleChartFilterSourceChange(condition: LifecycleChartFilterCondition, source: LifecycleChartFilterSource): void {
  Object.assign(condition, defaultChartFilterCondition(source))
}

function chartFilterResourceOptions(condition: LifecycleChartFilterCondition): SelectOption[] {
  if (condition.source === 'tag') return selectResources.value.tags.map((tag) => ({ label: tag.label, value: tag.value }))
  if (condition.source === 'event') return selectResources.value.events
  return attributeFilterOptions.map((item) => ({ label: `${item.sourceName} / ${item.label}`, value: item.value }))
}

function chartFilterFieldOptions(condition: LifecycleChartFilterCondition): SelectOption[] {
  if (condition.source === 'event') return eventFieldOptions.map((item) => ({ label: item.label, value: item.value }))
  if (condition.source === 'attribute') return attributeFilterOptions.map((item) => ({ label: `${item.sourceName} / ${item.label}`, value: item.value }))
  return [{ label: '标签值', value: condition.field || condition.sourceId || 'tag_value' }]
}

function chartFilterValueOptions(condition: LifecycleChartFilterCondition): SelectOption[] {
  if (condition.source === 'tag') {
    const tag = selectResources.value.tags.find((item) => item.value === condition.sourceId)
    return tag?.values ?? []
  }
  if (condition.source === 'event') {
    const fieldName = condition.field.split('.').pop()
    const field = eventFieldOptions.find((item) => item.value === fieldName)
    return field?.values.map((value) => ({ label: value, value })) ?? []
  }
  const attribute = attributeFilterOptions.find((item) => item.value === condition.field || item.value === condition.sourceId)
  return attribute?.values.map((value) => ({ label: value, value })) ?? []
}

function handleChartFilterResourceChange(condition: LifecycleChartFilterCondition, resourceId: string): void {
  if (condition.source === 'tag') {
    const tag = selectResources.value.tags.find((item) => item.value === resourceId)
    condition.sourceId = resourceId
    condition.sourceName = String(tag?.label ?? resourceId)
    condition.field = resourceId
    condition.label = '标签值'
    condition.value = String(tag?.values?.[0]?.value ?? '')
    return
  }
  if (condition.source === 'event') {
    const event = selectResources.value.events.find((item) => item.value === resourceId)
    const field = eventFieldOptions[0]!
    condition.sourceId = resourceId
    condition.sourceName = typeof event?.label === 'string' ? event.label : resourceId
    condition.field = `${resourceId}.${field.value}`
    condition.label = field.label
    condition.value = field.values[0] ?? ''
    condition.timeRange = toDateRangeStrings(chartDateRange.value)
    return
  }
  const attribute = attributeFilterOptions.find((item) => item.value === resourceId)
  condition.sourceId = resourceId
  condition.sourceName = attribute?.sourceName ?? '主体属性'
  condition.field = resourceId
  condition.label = attribute?.label ?? resourceId
  condition.value = attribute?.values[0] ?? ''
}

function handleChartFilterFieldChange(condition: LifecycleChartFilterCondition, fieldValue: string): void {
  if (condition.source === 'event') {
    const field = eventFieldOptions.find((item) => item.value === fieldValue)
    const eventName = condition.sourceId || fieldValue.split('.')[0] || 'event'
    condition.field = `${eventName}.${fieldValue}`
    condition.label = field?.label ?? fieldValue
    condition.value = field?.values[0] ?? ''
    return
  }
  if (condition.source === 'attribute') {
    handleChartFilterResourceChange(condition, fieldValue)
  }
}

function handleChartFilterOperatorChange(condition: LifecycleChartFilterCondition, operator: LifecycleChartFilterOperator): void {
  condition.operator = operator
  if (noValueOperators.has(operator)) {
    condition.value = ''
    condition.value2 = undefined
  }
}

function setChartFilterMultiValue(condition: LifecycleChartFilterCondition, values: string[]): void {
  condition.value = values.join(',')
}

function chartFilterMultiValue(condition: LifecycleChartFilterCondition): string[] {
  return condition.value ? condition.value.split(',').filter(Boolean) : []
}

function chartFilterValuePlaceholder(condition: LifecycleChartFilterCondition): string {
  if (condition.operator === 'between') return '起始值'
  if (condition.source === 'event') return '行为属性值'
  if (condition.source === 'attribute') return '属性值'
  return '标签值'
}

function chartConditionDateRange(condition: LifecycleChartFilterCondition): DateRangeValue {
  const range = condition.timeRange ?? toDateRangeStrings(chartDateRange.value)
  return [dayjs(range[0]).valueOf(), dayjs(range[1]).valueOf()]
}

function setChartConditionDateRange(condition: LifecycleChartFilterCondition, value: DateRangeValue | null): void {
  condition.timeRange = value ? toDateRangeStrings(value) : undefined
}

function operatorLabel(operator: LifecycleChartFilterOperator): string {
  return String(chartFilterOperatorOptions.find((item) => item.value === operator)?.label ?? operator)
}

function chartFilterSummary(condition: LifecycleChartFilterCondition): string {
  if (noValueOperators.has(condition.operator)) {
    return `${condition.sourceName}.${condition.label} ${operatorLabel(condition.operator)}`
  }
  const value = condition.operator === 'between'
    ? `${condition.value || '-'} ~ ${condition.value2 || '-'}`
    : condition.value || '-'
  const time = condition.source === 'event' && condition.timeRange ? `，${condition.timeRange[0]} 至 ${condition.timeRange[1]}` : ''
  return `${condition.sourceName}.${condition.label} ${operatorLabel(condition.operator)} ${value}${time}`
}

function chartFilterDescription(): string {
  if (!chartFilterConditions.value.length) return '无筛选条件'
  const joiner = chartForm.filterLogic === 'or' ? ' 或 ' : ' 且 '
  return chartFilterConditions.value.map(chartFilterSummary).join(joiner)
}

function validateChartFilters(): string {
  for (const condition of chartFilterConditions.value) {
    if (!condition.sourceId && condition.source !== 'attribute') return '筛选条件需要选择资源。'
    if (!condition.field) return '筛选条件需要选择字段。'
    if (!condition.operator) return '筛选条件需要选择运算符。'
    if (condition.source === 'event' && !condition.timeRange) return '行为条件需要配置统计时间范围。'
    if (!noValueOperators.has(condition.operator) && !condition.value.trim()) return '筛选条件需要填写条件值。'
    if (condition.operator === 'between' && !condition.value2?.trim()) return '介于条件需要填写结束值。'
  }
  return ''
}

function closeChartModal(): void {
  showChartModal.value = false
}

function openChartModal(chart?: LifecycleBusinessChart): void {
  const report = currentReport.value
  if (!report) return
  if (!report.permissions.editReport || report.isDemo) {
    message.warning('暂无编辑生命周期分析报告权限。')
    return
  }
  editingChartId.value = chart?.id ?? ''
  chartForm.title = chart?.title ?? ''
  chartForm.stageValues = chart ? [...chart.stageValues] : selectedStageValue.value ? [selectedStageValue.value] : []
  chartForm.chartType = chart?.chartType ?? 'line'
  chartForm.dimension = chart?.dimension ?? 'time'
  chartForm.metric = chart?.metric ?? '用户数'
  chartForm.filters = chart?.filters ?? ''
  chartForm.filterLogic = chart?.filterLogic ?? 'and'
  chartFilterConditions.value = chart?.filterConditions?.map((condition) => ({ ...condition })) ?? [defaultChartFilterCondition()]
  chartForm.sort = chart?.sort ?? 'desc'
  chartForm.topN = chart?.topN ?? 10
  chartDateRange.value = chart
    ? [dayjs(chart.timeRange[0]).valueOf(), dayjs(chart.timeRange[1]).valueOf()]
    : [dayjs(report.maxDataDate).subtract(6, 'day').valueOf(), dayjs(report.maxDataDate).valueOf()]
  showChartModal.value = true
  nextTick(() => {
    chartInitialSnapshot.value = chartFormSnapshot.value
  })
}

async function saveChart(): Promise<void> {
  const report = currentReport.value
  if (!report) return
  if (!chartForm.title.trim()) {
    message.warning('图表名称必填。')
    return
  }
  if (!chartForm.stageValues.length) {
    message.warning('生命周期阶段必选。')
    return
  }
  if (!chartForm.metric) {
    message.warning('度量必选。')
    return
  }
  const filterError = validateChartFilters()
  if (filterError) {
    message.warning(filterError)
    return
  }
  chartSaving.value = true
  try {
    const saved = await lifecycleAnalysisService.saveBusinessChart({
      id: editingChartId.value,
      reportId: report.id,
      title: chartForm.title.trim(),
      stageValues: chartForm.stageValues,
      chartType: chartForm.chartType,
      dimension: chartForm.dimension,
      metric: chartForm.metric,
      timeRange: toDateRangeStrings(chartDateRange.value),
      filters: chartFilterDescription(),
      filterLogic: chartForm.filterLogic,
      filterConditions: chartFilterConditions.value.map((condition) => ({ ...condition })),
      sort: chartForm.sort,
      topN: chartForm.topN,
      updatedAt: new Date().toISOString(),
    })
    showChartModal.value = false
    message.success(editingChartId.value ? '图表已更新。' : '图表已添加。')
    await loadBusinessCharts()
    await loadBusinessChartData(saved)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '保存图表失败')
  } finally {
    chartSaving.value = false
  }
}

async function handleChartAction(key: string, chart: LifecycleBusinessChart): Promise<void> {
  if (key === 'edit') openChartModal(chart)
  if (key === 'delete') {
    deleteChartTarget.value = chart
    deleteChartModalVisible.value = true
  }
  if (key === 'refresh') {
    const refreshed = await lifecycleAnalysisService.refreshBusinessChart(chart.reportId, chart.id)
    Object.assign(chart, refreshed)
    await loadBusinessChartData(chart)
    message.success('图表已刷新。')
  }
  if (key === 'large') {
    largeChart.value = chart
    showLargeChartModal.value = true
  }
  if (key === 'download') {
    try {
      const file = await lifecycleAnalysisService.downloadBusinessChartData(chart.reportId, chart.id, formattedAnalysisDate.value)
      triggerDownload(file.fileName, file.content, file.mimeType)
      message.success('图表数据已下载。')
      await loadAuditLogs(chart.reportId)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '下载数据失败')
    }
  }
}

async function confirmDeleteChart(): Promise<void> {
  const chart = deleteChartTarget.value
  if (!chart) return
  await lifecycleAnalysisService.deleteBusinessChart(chart.reportId, chart.id)
  deleteChartModalVisible.value = false
  deleteChartTarget.value = null
  message.success('图表已删除。')
  await loadBusinessCharts()
}

function triggerDownload(fileName: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

function selectTransitionNode(node: LifecycleTransitionNode): void {
  selectedTransitionNode.value = node
  selectedTransitionEdge.value = null
}

function selectTransitionEdge(edge: LifecycleTransitionEdge): void {
  selectedTransitionEdge.value = edge
  selectedTransitionNode.value = null
}

function handleTransitionChartClick(params: { dataType?: string; name?: string; data?: unknown }): void {
  const result = transitionResult.value
  if (!result) return
  const data = (params.data ?? {}) as { source?: string; target?: string; nodeId?: string; edgeId?: string }
  if (params.dataType === 'edge' || data.edgeId || (data.source && data.target)) {
    const edge = result.edges.find((item) =>
      item.id === data.edgeId
      || (`起始-${item.fromStageName}` === data.source && `结束-${item.toStageName}` === data.target),
    )
    if (edge) {
      selectTransitionEdge(edge)
      transitionActionModalVisible.value = true
    }
    return
  }
  const node = result.nodes.find((item) =>
    item.id === data.nodeId
    || `${item.side === 'from' ? '起始' : '结束'}-${item.stageName}` === params.name,
  )
  if (node) {
    selectTransitionNode(node)
    transitionActionModalVisible.value = true
  }
}

function openTransitionDirection(node: LifecycleTransitionNode, mode: 'inflow' | 'outflow'): void {
  transitionDirectionNode.value = node
  transitionDirectionMode.value = mode
  transitionDirectionDrawerVisible.value = true
}

function transitionNodeSourceConfig(node: LifecycleTransitionNode): Record<string, unknown> {
  return {
    nodeId: node.id,
    stageValue: node.stageValue,
    stageName: node.stageName,
    side: node.side,
    userCount: node.userCount,
    newCount: node.newCount,
    lostCount: node.lostCount,
    timeRange: toDateRangeStrings(transitionDateRange.value),
  }
}

function transitionEdgeSourceConfig(edge: LifecycleTransitionEdge): Record<string, unknown> {
  return {
    edgeId: edge.id,
    fromStage: edge.fromStage,
    fromStageName: edge.fromStageName,
    toStage: edge.toStage,
    toStageName: edge.toStageName,
    userCount: edge.userCount,
    fromRatio: edge.fromRatio,
    toRatio: edge.toRatio,
    timeRange: toDateRangeStrings(transitionDateRange.value),
  }
}

function openExportFromTransitionNode(node: LifecycleTransitionNode): void {
  openExport({
    sourceType: 'transition_node',
    sourceName: `关系流转节点：${node.side === 'from' ? '起始' : '结束'}-${node.stageName}`,
    stageValues: [node.stageValue],
    crowdRange: 'transition_node',
    sourceConfig: transitionNodeSourceConfig(node),
  })
}

function openInsightFromTransitionNode(node: LifecycleTransitionNode): void {
  openStageInsight([node.stageValue], {
    sourceType: 'transition_node',
    sourceName: `关系流转节点：${node.side === 'from' ? '起始' : '结束'}-${node.stageName}`,
    crowdRange: 'transition_node',
    timeRange: toDateRangeStrings(transitionDateRange.value),
    sourceConfig: transitionNodeSourceConfig(node),
  })
}

function openInsightFromTransition(edge: LifecycleTransitionEdge): void {
  openStageInsight([edge.toStage], {
    sourceType: 'transition',
    sourceName: `流转人群：${edge.fromStageName} → ${edge.toStageName}`,
    crowdRange: 'transition',
    timeRange: toDateRangeStrings(transitionDateRange.value),
    sourceConfig: transitionEdgeSourceConfig(edge),
  })
}

function openExportFromTransition(edge: LifecycleTransitionEdge): void {
  openExport({
    sourceType: 'transition',
    sourceName: `${edge.fromStageName} → ${edge.toStageName}`,
    stageValues: [edge.toStage],
    crowdRange: 'transition',
    sourceConfig: transitionEdgeSourceConfig(edge),
  })
}

function openExportFromPathNode(node: LifecyclePathNode): void {
  openExport({
    sourceType: 'path_node',
    sourceName: `路径节点：${node.nodeName}`,
    stageValues: selectedStageValue.value ? [selectedStageValue.value] : activeStages.value.slice(0, 1).map((stage) => stage.value),
    crowdRange: 'path_node',
    sourceConfig: {
      pathId: currentPath.value?.id,
      pathName: currentPath.value?.name,
      nodeId: node.id,
      nodeName: node.nodeName,
      userCount: node.userCount,
      conditionConfig: node.conditionConfig,
      timeRange: currentPath.value ? [currentPath.value.periodConfig.startDate, currentPath.value.periodConfig.endDate] : undefined,
    },
  })
}

function openInsightFromPathNode(node: LifecyclePathNode): void {
  const path = currentPath.value
  openStageInsight(selectedStageValue.value ? [selectedStageValue.value] : activeStages.value.slice(0, 1).map((stage) => stage.value), {
    sourceType: 'path_node',
    sourceName: `路径节点：${node.nodeName}`,
    crowdRange: 'path_node',
    timeRange: path ? [path.periodConfig.startDate, path.periodConfig.endDate] : undefined,
    sourceConfig: {
      pathId: path?.id,
      pathName: path?.name,
      nodeId: node.id,
      nodeName: node.nodeName,
      userCount: node.userCount,
      conditionConfig: node.conditionConfig,
    },
  })
}

function openExportFromPathEdge(edge: LifecyclePathEdge): void {
  const path = currentPath.value
  const from = path?.nodes.find((node) => node.id === edge.fromNodeId)
  const to = path?.nodes.find((node) => node.id === edge.toNodeId)
  openExport({
    sourceType: 'path_edge',
    sourceName: `路径转化：${from?.nodeName ?? edge.fromNodeId} → ${to?.nodeName ?? edge.toNodeId}`,
    stageValues: selectedStageValue.value ? [selectedStageValue.value] : activeStages.value.slice(0, 1).map((stage) => stage.value),
    crowdRange: 'path_edge',
    sourceConfig: {
      pathId: path?.id,
      pathName: path?.name,
      edgeId: edge.id,
      fromNodeId: edge.fromNodeId,
      fromNodeName: from?.nodeName,
      toNodeId: edge.toNodeId,
      toNodeName: to?.nodeName,
      userCount: edge.userCount,
      conversionRate: edge.conversionRate,
      timeRange: path ? [path.periodConfig.startDate, path.periodConfig.endDate] : undefined,
    },
  })
}

async function quickCreatePath(): Promise<void> {
  const report = currentReport.value
  if (!report) return
  try {
    const path = await lifecycleAnalysisService.quickCreatePath(report.id)
    paths.value = await lifecycleAnalysisService.getPaths(report.id)
    selectedPathId.value = path.id
    selectedPathNode.value = path.nodes[0] ?? null
    message.success('默认路径已创建，路径状态为计算完成。')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '创建路径失败')
  }
}

function openPathModal(path?: LifecyclePath): void {
  const report = currentReport.value
  if (!report) return
  if (!report.permissions.managePath || report.isDemo) {
    message.warning('暂无管理路径跃迁权限。')
    return
  }
  editingPathId.value = path?.id ?? ''
  pathDraft.name = path?.name ?? ''
  pathDraft.description = path?.description ?? ''
  pathDraft.updateMode = path?.updateMode ?? 'manual'
  pathDraft.dailyExecuteTime = path?.dailyExecuteTime ?? '08:30'
  pathDraft.periodConfig = path?.periodConfig
    ? { ...path.periodConfig }
    : {
        quickKey: 'last_7_days',
        startDate: dayjs(report.maxDataDate).subtract(6, 'day').format(dateFormat),
        endDate: report.maxDataDate,
      }
  pathDraft.targetSegmentId = path?.targetSegmentId ?? ''
  pathDraft.targetSegmentName = path?.targetSegmentName ?? '全量用户'
  pathDraft.nodes = path
    ? path.nodes.map((node) => ({
        ...node,
        conditionConfig: { ...node.conditionConfig },
      }))
    : [
        makePathDraftNode('start', report.stages[0]?.name ?? '起始事件', 1),
        makePathDraftNode('end', report.stages[report.stages.length - 1]?.name ?? '终止事件', 2),
      ]
  pathDateRange.value = [dayjs(pathDraft.periodConfig.startDate).valueOf(), dayjs(pathDraft.periodConfig.endDate).valueOf()]
  pathModalVisible.value = true
}

function applyPathQuickPeriod(value: LifecyclePathPayload['periodConfig']['quickKey']): void {
  const report = currentReport.value
  if (!report) return
  pathDraft.periodConfig.quickKey = value
  if (value === 'custom') return
  const end = dayjs(report.maxDataDate)
  const start = value === 'last_7_days'
    ? end.subtract(6, 'day')
    : value === 'last_14_days'
      ? end.subtract(13, 'day')
      : end.subtract(29, 'day')
  pathDateRange.value = [start.valueOf(), end.valueOf()]
  pathDraft.periodConfig.startDate = start.format(dateFormat)
  pathDraft.periodConfig.endDate = end.format(dateFormat)
}

function makePathDraftNode(nodeType: LifecyclePathNode['nodeType'], nodeName: string, orderIndex: number): LifecyclePathPayload['nodes'][number] {
  return {
    nodeType,
    nodeName,
    conditionType: 'tag',
    conditionConfig: {
      tagId: currentReport.value?.tagId,
      tagName: currentReport.value?.tagName,
      tagValue: nodeName,
    },
    windowValue: 1,
    windowUnit: 'day',
    orderIndex,
  }
}

function tagValueOptions(node: LifecyclePathPayload['nodes'][number]): SelectOption[] {
  const tagId = node.conditionConfig.tagId
  return selectResources.value.tags.find((tag) => tag.value === tagId)?.values ?? []
}

function handlePathNodeTagChange(node: LifecyclePathPayload['nodes'][number], tagId: string): void {
  const tag = selectResources.value.tags.find((item) => item.value === tagId)
  node.conditionConfig.tagId = tagId
  node.conditionConfig.tagName = tag?.label
  node.conditionConfig.tagValue = tag?.values[0]?.value ? String(tag.values[0].value) : ''
}

function handlePathConditionTypeChange(node: LifecyclePathPayload['nodes'][number], conditionType: LifecyclePathPayload['nodes'][number]['conditionType']): void {
  node.conditionType = conditionType
  if (conditionType === 'tag') {
    const tag = selectResources.value.tags.find((item) => item.value === currentReport.value?.tagId) ?? selectResources.value.tags[0]
    node.conditionConfig = {
      tagId: tag?.value ? String(tag.value) : currentReport.value?.tagId,
      tagName: String(tag?.label ?? currentReport.value?.tagName ?? '生命周期标签'),
      tagValue: tag?.values?.[0]?.value ? String(tag.values[0].value) : node.nodeName,
      timeLimit: node.conditionConfig.timeLimit,
    }
    return
  }
  const event = selectResources.value.events[0]
  node.conditionConfig = {
    eventName: event?.value ? String(event.value) : 'ad_exposure',
    eventDisplayName: typeof event?.label === 'string' ? event.label : '广告曝光',
    propertyFilter: '',
    timeLimit: node.conditionConfig.timeLimit,
  }
}

function handlePathNodeEventChange(node: LifecyclePathPayload['nodes'][number], eventName: string): void {
  const event = selectResources.value.events.find((item) => item.value === eventName)
  node.conditionConfig.eventName = eventName
  node.conditionConfig.eventDisplayName = typeof event?.label === 'string' ? event.label : eventName
}

function fitPathCanvas(): void {
  const nodeCount = currentPath.value?.nodes.length ?? pathDraft.nodes.length
  const baseWidth = pathFullscreen.value ? 1320 : 900
  pathZoom.value = Number(Math.max(0.62, Math.min(1.08, baseWidth / Math.max(nodeCount * 340, 1))).toFixed(2))
}

async function togglePathFullscreen(): Promise<void> {
  pathFullscreen.value = !pathFullscreen.value
  await nextTick()
  fitPathCanvas()
}

function resetPathLayout(): void {
  pathZoom.value = 1
}

function addMiddleNode(): void {
  const insertIndex = Math.max(1, pathDraft.nodes.length - 1)
  pathDraft.nodes.splice(insertIndex, 0, makePathDraftNode('middle', '中间节点', insertIndex + 1))
  syncPathDraftOrder()
}

function removePathNode(index: number): void {
  if (index === 0 || index === pathDraft.nodes.length - 1) return
  pathDraft.nodes.splice(index, 1)
  syncPathDraftOrder()
}

function syncPathDraftOrder(): void {
  pathDraft.nodes.forEach((node, index) => {
    node.orderIndex = index + 1
    node.nodeType = index === 0 ? 'start' : index === pathDraft.nodes.length - 1 ? 'end' : 'middle'
  })
}

function handleNodeDrop(index: number): void {
  const fromIndex = draggingNodeIndex.value
  draggingNodeIndex.value = null
  if (fromIndex === null || fromIndex === index || fromIndex === 0 || fromIndex === pathDraft.nodes.length - 1 || index === 0 || index === pathDraft.nodes.length - 1) return
  const [node] = pathDraft.nodes.splice(fromIndex, 1)
  if (!node) return
  pathDraft.nodes.splice(index, 0, node)
  syncPathDraftOrder()
}

async function savePath(): Promise<void> {
  const report = currentReport.value
  if (!report) return
  pathDraft.periodConfig.startDate = dayjs(pathDateRange.value[0]).format(dateFormat)
  pathDraft.periodConfig.endDate = dayjs(pathDateRange.value[1]).format(dateFormat)
  const target = selectResources.value.targetSegments.find((item) => item.value === pathDraft.targetSegmentId)
  pathDraft.targetSegmentName = target?.label ?? '全量用户'
  try {
    const saved = await lifecycleAnalysisService.savePath(report.id, {
      ...pathDraft,
      nodes: pathDraft.nodes.map((node) => ({
        ...node,
        conditionConfig: { ...node.conditionConfig },
      })),
    }, editingPathId.value || undefined)
    pathModalVisible.value = false
    paths.value = await lifecycleAnalysisService.getPaths(report.id)
    selectedPathId.value = saved.id
    selectedPathNode.value = saved.nodes[0] ?? null
    message.success('路径已保存，正在计算。')
    globalThis.setTimeout(() => {
      void loadPaths()
    }, 760)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '保存路径失败')
  }
}

async function handlePathMore(key: string): Promise<void> {
  const report = currentReport.value
  const path = currentPath.value
  if (!report || !path) return
  if (key === 'edit') openPathModal(path)
  if (key === 'delete') {
    deletePathTarget.value = path
    deletePathModalVisible.value = true
  }
  if (key === 'recalculate') {
    const recalculated = await lifecycleAnalysisService.recalculatePath(report.id, path.id)
    const index = paths.value.findIndex((item) => item.id === recalculated.id)
    if (index >= 0) paths.value.splice(index, 1, recalculated)
    selectedPathNode.value = recalculated.nodes[0] ?? null
    message.success('路径已进入计算中。')
    globalThis.setTimeout(() => {
      void loadPaths()
    }, 760)
  }
}

async function confirmDeletePath(): Promise<void> {
  const report = currentReport.value
  const path = deletePathTarget.value
  if (!report || !path) return
  await lifecycleAnalysisService.deletePath(report.id, path.id)
  deletePathModalVisible.value = false
  deletePathTarget.value = null
  paths.value = await lifecycleAnalysisService.getPaths(report.id)
  selectedPathId.value = paths.value[0]?.id ?? ''
  selectedPathNode.value = currentPath.value?.nodes[0] ?? null
  message.success('路径已删除。')
}

function openPathNodeDetail(node: LifecyclePathNode): void {
  pathNodeDetailTarget.value = node
  pathNodeDetailVisible.value = true
}

async function setPathNodeAsEndpoint(node: LifecyclePathNode, endpoint: 'start' | 'end'): Promise<void> {
  const report = currentReport.value
  const path = currentPath.value
  if (!report || !path) return
  if (!report.permissions.managePath || report.isDemo) {
    message.warning('暂无管理路径跃迁权限。')
    return
  }
  const nodes = path.nodes.filter((item) => item.id !== node.id)
  const reordered = endpoint === 'start' ? [node, ...nodes] : [...nodes, node]
  try {
    const saved = await lifecycleAnalysisService.savePath(report.id, {
      name: path.name,
      description: path.description,
      updateMode: path.updateMode,
      dailyExecuteTime: path.dailyExecuteTime,
      periodConfig: { ...path.periodConfig },
      targetSegmentId: path.targetSegmentId,
      targetSegmentName: path.targetSegmentName,
      nodes: reordered.map((item, index) => ({
        id: item.id,
        nodeType: index === 0 ? 'start' : index === reordered.length - 1 ? 'end' : 'middle',
        nodeName: item.nodeName,
        conditionType: item.conditionType,
        conditionConfig: { ...item.conditionConfig },
        windowValue: item.windowValue,
        windowUnit: item.windowUnit,
        orderIndex: index + 1,
      })),
    }, path.id)
    paths.value = await lifecycleAnalysisService.getPaths(report.id)
    selectedPathId.value = saved.id
    selectedPathNode.value = paths.value.find((item) => item.id === saved.id)?.nodes.find((item) => item.id === node.id) ?? null
    message.success(endpoint === 'start' ? '已设置为起点并重新计算。' : '已设置为终点并重新计算。')
    globalThis.setTimeout(() => {
      void loadPaths()
    }, 760)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '路径节点操作失败')
  }
}

async function openGlobalAuthModal(): Promise<void> {
  const result = await lifecycleAnalysisService.searchReports({
    keyword: '',
    subjectTypes: [],
    stageValues: [],
    creatorIds: [],
    createdRange: null,
    page: 1,
    pageSize: 100,
  })
  globalAuthReportRows.value = result.records.filter((report) => report.permissions.manageAuthorization)
  const first = globalAuthReportRows.value[0]
  if (!first) {
    message.warning('暂无可管理授权的生命周期报告。')
    return
  }
  globalAuthReportId.value = first.id
  await openAuthModal(first, true)
}

async function openAuthModal(report: LifecycleReport, globalMode = false): Promise<void> {
  authTargetReport.value = report
  authorizations.value = await lifecycleAnalysisService.getAuthorizations(report.id)
  authGlobalMode.value = globalMode
  if (globalMode) globalAuthReportId.value = report.id
  authDraft.principalType = 'user'
  authDraft.principalIds = []
  authDraft.permissions = ['view']
  authEditingId.value = ''
  authModalVisible.value = true
}

async function switchGlobalAuthReport(reportId: string): Promise<void> {
  const report = globalAuthReportRows.value.find((item) => item.id === reportId)
  if (!report) return
  authTargetReport.value = report
  authorizations.value = await lifecycleAnalysisService.getAuthorizations(report.id)
  authDraft.principalType = 'user'
  authDraft.principalIds = []
  authDraft.permissions = ['view']
  authEditingId.value = ''
}

function editAuthorization(row: LifecycleAuthorization): void {
  authEditingId.value = row.id
  authDraft.principalType = row.principalType
  authDraft.principalIds = [row.principalId]
  authDraft.permissions = [...row.permissions]
}

function normalizeAuthPermissions(values: LifecyclePermissionType[]): LifecyclePermissionType[] {
  const set = new Set(values)
  if (set.has('report_manage')) {
    set.add('view')
    set.add('edit')
    set.add('manage_path')
  }
  if (set.has('edit') || set.has('manage_path')) {
    set.add('view')
  }
  return Array.from(set)
}

function handleAuthPermissionUpdate(values: Array<string | number>): void {
  authDraft.permissions = normalizeAuthPermissions(values as LifecyclePermissionType[])
}

async function saveAuthorizations(): Promise<void> {
  const report = authTargetReport.value
  if (!report) return
  if (!authDraft.principalIds.length) {
    message.warning('请选择授权对象。')
    return
  }
  if (!authDraft.permissions.length) {
    message.warning('请选择权限类型。')
    return
  }
  authDraft.permissions = normalizeAuthPermissions(authDraft.permissions)
  const resources = principalResourceOptions[authDraft.principalType]
  const principals = authDraft.principalIds.map((id) => {
    const resource = resources.find((item) => item.value === id)
    return { type: authDraft.principalType, id, name: resource?.name ?? id }
  })
  authorizations.value = await lifecycleAnalysisService.saveAuthorizations(report.id, principals, authDraft.permissions)
  authEditingId.value = ''
  authDraft.principalIds = []
  message.success('授权变更已立即生效，已同步项目中心和标签查看权限。')
}

async function revokeAuthorization(row: LifecycleAuthorization): Promise<void> {
  const report = authTargetReport.value
  if (!report) return
  authorizations.value = await lifecycleAnalysisService.revokeAuthorization(report.id, row.id)
  message.success('已取消生命周期分析授权；标签查看权限按策略保留。')
}

function openDeleteModal(report: LifecycleReport): void {
  deleteTargetReport.value = report
  deleteModalVisible.value = true
}

async function confirmDeleteReport(): Promise<void> {
  const report = deleteTargetReport.value
  if (!report) return
  try {
    await lifecycleAnalysisService.deleteReport(report.id)
    deleteModalVisible.value = false
    message.success('生命周期标签及对应分析报告已删除。')
    if (currentReport.value?.id === report.id) {
      await router.push('/user-insight/lifecycle-analysis')
    } else {
      await loadReports()
    }
  } catch (error) {
    message.error(error instanceof Error ? error.message : '删除失败')
  }
}

async function goDeleteInTagSystem(): Promise<void> {
  const report = deleteTargetReport.value
  if (!report) return
  deleteModalVisible.value = false
  await router.push(`/user-insight/tags/${report.tagId}`)
}

watch(
  () => route.fullPath,
  () => {
    void loadFromRoute()
  },
)

watch(
  () => authDraft.principalType,
  () => {
    if (authEditingId.value) return
    authDraft.principalIds = []
  },
)

onMounted(() => {
  void loadFromRoute()
})
</script>

<template>
  <div class="page-container lifecycle-page">
    <template v-if="pageMode === 'list'">
      <div class="page-head">
        <div>
          <h1 class="page-title">生命周期分析</h1>
          <p class="page-description">
            基于已上线的生命周期标签自动生成报告，持续观察阶段规模、变化、流转和路径跃迁。
          </p>
        </div>
        <n-space>
          <n-button secondary @click="openGlobalAuthModal">
            <template #icon><n-icon :component="SettingsOutline" /></template>
            权限管理
          </n-button>
          <n-button secondary @click="router.push('/user-insight/tags/create/lifecycle')">
            <template #icon><n-icon :component="AddOutline" /></template>
            创建生命周期标签
          </n-button>
        </n-space>
      </div>

      <n-alert type="info" :bordered="false" class="section-alert">
        生命周期分析报告由标签体系中的生命周期标签自动生成。标签被禁用时报告进入不可用状态，标签删除后报告同步删除。
      </n-alert>

      <n-card class="section-card" :bordered="false">
        <n-grid :cols="24" :x-gap="12" :y-gap="12">
          <n-gi :span="7">
            <n-input
              v-model:value="listFilters.keyword"
              clearable
              placeholder="请输入报告名称或报告创建人"
              @keyup.enter="submitListSearch"
              @clear="submitListSearch"
            >
              <template #prefix>
                <button class="input-icon-button" type="button" @click="submitListSearch">
                  <n-icon :component="SearchOutline" />
                </button>
              </template>
            </n-input>
          </n-gi>
          <n-gi :span="4">
            <n-select v-model:value="listFilters.subjectTypes" multiple clearable placeholder="主体" :options="filterOptions.subjects" />
          </n-gi>
          <n-gi :span="5">
            <n-select v-model:value="listFilters.stageValues" multiple clearable placeholder="生命周期阶段" :options="filterOptions.stages" />
          </n-gi>
          <n-gi :span="4">
            <n-select v-model:value="listFilters.creatorIds" multiple clearable placeholder="创建人" :options="filterOptions.creators" />
          </n-gi>
          <n-gi :span="4">
            <n-date-picker v-model:value="listFilters.createdRange" type="daterange" clearable />
          </n-gi>
        </n-grid>
        <div class="filter-actions">
          <n-button @click="resetFilters">重置</n-button>
          <n-button type="primary" @click="submitListSearch">
            <template #icon><n-icon :component="SearchOutline" /></template>
            查询
          </n-button>
        </div>
      </n-card>

      <n-card class="section-card" :bordered="false">
        <n-data-table
          :columns="reportColumns"
          :data="reportRows"
          :loading="loading"
          :row-key="(row: LifecycleReport) => row.id"
          :scroll-x="1260"
        />
        <div class="pagination-row">
          <n-pagination
            :page="listFilters.page"
            :page-size="listFilters.pageSize"
            :item-count="reportTotal"
            show-size-picker
            :page-sizes="[10, 20, 50]"
            @update:page="handlePageChange"
            @update:page-size="handlePageSizeChange"
          />
        </div>
      </n-card>
    </template>

    <n-spin v-else :show="detailLoading">
      <template v-if="currentReport">
        <div class="detail-header">
          <n-button quaternary circle @click="goBack">
            <template #icon><n-icon :component="ArrowBackOutline" /></template>
          </n-button>
          <div class="detail-title-block">
            <div class="title-line">
              <h1 class="page-title">{{ currentReport.name }}</h1>
              <n-tag :type="reportStatusTagType(currentReport.status)" size="small">{{ lifecycleReportStatusLabels[currentReport.status] }}</n-tag>
              <n-tag v-if="currentReport.isDemo" type="info" size="small">只读 Demo</n-tag>
            </div>
            <div class="detail-meta">
              {{ currentReport.subjectName }} · 生命周期标签 {{ currentReport.tagName }} · 最新分区 {{ currentReport.latestDataDate }} · 创建人 {{ currentReport.creatorName }}
            </div>
          </div>
          <n-space class="detail-actions">
            <n-button v-if="isDemoMode" @click="goBack">返回正式报告</n-button>
            <n-button v-else @click="openSwitchReportModal">
              <template #icon><n-icon :component="OpenOutline" /></template>
              切换分析报告
            </n-button>
            <n-button v-if="!isDemoMode" secondary @click="openDemo">
              <template #icon><n-icon :component="EyeOutline" /></template>
              查看Demo
            </n-button>
            <n-tooltip v-if="!currentReport.isDemo" trigger="hover" :disabled="currentReport.permissions.createSegment">
              <template #trigger>
                <n-button type="primary" :disabled="!currentReport.permissions.createSegment" @click="openTopExport">
                  <template #icon><n-icon :component="CloudDownloadOutline" /></template>
                  导出分群
                </n-button>
              </template>
              暂无创建分群权限，请联系管理员开通。
            </n-tooltip>
            <n-tooltip v-if="!currentReport.isDemo" trigger="hover" :disabled="currentReport.permissions.viewGroupProfile">
              <template #trigger>
                <n-button :disabled="!currentReport.permissions.viewGroupProfile" @click="openStageInsight(selectedStageValue ? [selectedStageValue] : activeStages.map((stage) => stage.value))">
                  <template #icon><n-icon :component="AnalyticsOutline" /></template>
                  洞察分群
                </n-button>
              </template>
              暂无群体画像洞察权限。
            </n-tooltip>
            <n-button v-if="!currentReport.isDemo" :disabled="!currentReport.permissions.editReport" @click="openChartModal()">
              <template #icon><n-icon :component="AddOutline" /></template>
              添加图表
            </n-button>
            <n-dropdown trigger="click" :options="detailMoreOptions" @select="handleDetailMoreSelect">
              <n-button>
                <template #icon><n-icon :component="SettingsOutline" /></template>
                更多
              </n-button>
            </n-dropdown>
          </n-space>
        </div>

        <n-alert v-if="currentReport.status === 'disabled'" type="warning" :bordered="false" class="section-alert">
          {{ currentReport.unavailableReason || '生命周期标签已禁用，报告不可正常分析。' }}
        </n-alert>

        <n-card class="section-card report-switch-card" :bordered="false">
          <n-descriptions :column="4" size="small">
            <n-descriptions-item label="报告 ID">{{ currentReport.id }}</n-descriptions-item>
            <n-descriptions-item label="标签 ID">{{ currentReport.tagId }}</n-descriptions-item>
            <n-descriptions-item label="创建时间">{{ formatDateTime(currentReport.createdAt) }}</n-descriptions-item>
            <n-descriptions-item label="最近更新">{{ formatDateTime(currentReport.updatedAt) }}</n-descriptions-item>
            <n-descriptions-item label="项目中心授权">{{ currentReport.resourcePermissions.projectAuthorizationName }}</n-descriptions-item>
            <n-descriptions-item label="行权限">{{ Math.round(currentReport.resourcePermissions.rowAccessRatio * 100) }}%</n-descriptions-item>
            <n-descriptions-item label="可用事件">{{ currentReport.resourcePermissions.allowedEventNames.length }}</n-descriptions-item>
            <n-descriptions-item label="权限同步">{{ formatDateTime(currentReport.resourcePermissions.syncedAt) }}</n-descriptions-item>
          </n-descriptions>
        </n-card>

        <n-tabs v-model:value="activeTab" type="line" animated class="section-card">
          <n-tab-pane name="assets" tab="用户资产">
            <div class="section-toolbar">
              <n-space align="center">
                <span class="control-label">分析日期</span>
                <n-date-picker
                  v-model:value="analysisDate"
                  type="date"
                  :is-date-disabled="disableFutureDate"
                  @update:value="loadAssets"
                />
                <n-tag size="small">数据日期以标签最新分区为准</n-tag>
              </n-space>
              <n-space>
                <n-statistic label="可见阶段" :value="activeStages.length" />
                <n-statistic label="总用户量" :value="formatNumber(assetTotal)" />
              </n-space>
            </div>

            <n-empty v-if="!assets.length" class="large-empty" description="当前生命周期报告暂无可展示数据，请确认生命周期标签是否已生成数据。" />
            <template v-else>
              <div class="stage-grid">
                <button
                  v-for="stage in activeStages"
                  :key="stage.value"
                  class="stage-card"
                  :class="{ active: selectedStageValue === stage.value }"
                  type="button"
                  @click="selectStage(stage)"
                >
                  <div class="stage-card-head">
                    <span class="stage-dot" :style="{ background: stage.color }"></span>
                    <div>
                      <div class="stage-name">{{ stage.name }}</div>
                      <div class="stage-desc">{{ stage.english }} · {{ stage.description }}</div>
                    </div>
                  </div>
                  <div class="stage-total-row">
                    <n-dropdown
                      trigger="click"
                      :options="stageActionOptions()"
                      @select="(key: string) => key === 'export' ? openStageExport(stage.value, 'all') : key === 'insight' ? openStageInsight([stage.value]) : selectStage(stage)"
                    >
                      <div class="stage-total">{{ formatNumber(assetForStage(stage.value)?.totalCount ?? 0) }}</div>
                    </n-dropdown>
                    <span :class="['growth-chip', growthClass(assetForStage(stage.value))]">
                      {{ growthIndicator(assetForStage(stage.value)) }}
                    </span>
                  </div>
                  <div class="stage-metrics">
                    <n-tooltip trigger="hover">
                      <template #trigger>
                        <span v-if="currentReport.isDemo">当日新增 {{ formatNumber(assetForStage(stage.value)?.newCount ?? 0) }}</span>
                        <span v-else @click.stop="openStageExport(stage.value, 'new')">当日新增 {{ formatNumber(assetForStage(stage.value)?.newCount ?? 0) }}</span>
                      </template>
                      当日新增表示昨天还不在该阶段，但今天已进入该阶段的用户数。
                    </n-tooltip>
                    <n-tooltip trigger="hover">
                      <template #trigger>
                        <span v-if="currentReport.isDemo">当日流失 {{ formatNumber(assetForStage(stage.value)?.lostCount ?? 0) }}</span>
                        <span v-else @click.stop="openStageExport(stage.value, 'lost')">当日流失 {{ formatNumber(assetForStage(stage.value)?.lostCount ?? 0) }}</span>
                      </template>
                      当日流失表示昨天还在该阶段，但今天已经不在该阶段的用户数。
                    </n-tooltip>
                  </div>
                  <n-alert v-if="assetForStage(stage.value)?.noComparableReason" type="warning" :bordered="false" class="tiny-alert">
                    {{ assetForStage(stage.value)?.noComparableReason }}
                  </n-alert>
                </button>
              </div>

              <n-card class="section-card" :bordered="false">
                <div class="panel-title-row">
                  <div>
                    <h3>用户趋势分析</h3>
                    <p>支持总用户、新增用户和流失用户趋势，最多查看过去 12 个月。</p>
                  </div>
                  <n-radio-group v-model:value="trendView" size="small">
                    <n-radio-button value="chart">折线图</n-radio-button>
                    <n-radio-button value="table">表格</n-radio-button>
                  </n-radio-group>
                </div>
                <div class="control-row">
                  <n-select v-model:value="trendRangeKey" :options="trendRangeOptions" class="w-160" @update:value="(key: LifecycleTrendRangeKey) => applyTrendQuickRange(key)" />
                  <n-date-picker v-model:value="trendDateRange" type="daterange" :is-date-disabled="disableFutureDate" @update:value="loadTrend" />
                  <n-radio-group v-model:value="trendMetric" @update:value="loadTrend">
                    <n-radio-button value="total">总用户趋势</n-radio-button>
                    <n-radio-button value="new">新增用户趋势</n-radio-button>
                    <n-radio-button value="lost">流失用户趋势</n-radio-button>
                  </n-radio-group>
                  <n-select v-model:value="trendStageValues" multiple clearable :options="stageOptions" placeholder="全部阶段" class="w-260" @update:value="loadTrend" />
                </div>
                <v-chart v-if="trendView === 'chart'" class="trend-chart" :option="trendChartOption" autoresize />
                <n-data-table v-else :columns="trendColumns" :data="trendTableRows" :pagination="{ pageSize: 12 }" />
              </n-card>

              <n-card class="section-card" :bordered="false">
                <div class="panel-title-row">
                  <div>
                    <h3>业务图表</h3>
                    <p>图表配置与当前生命周期报告绑定，数据受资源权限和行权限约束。</p>
                  </div>
                  <n-button v-if="canMutateDetail" :disabled="!currentReport.permissions.editReport" @click="openChartModal()">
                    <template #icon><n-icon :component="AddOutline" /></template>
                    添加图表
                  </n-button>
                </div>
                <n-empty v-if="!businessCharts.length" description="暂无业务图表，可添加关键指标观察不同生命周期阶段表现。" />
                <div v-else class="chart-grid">
                  <div v-for="chart in businessCharts" :key="chart.id" class="chart-panel">
                    <div class="chart-panel-head">
                      <div>
                        <h4>{{ chart.title }}</h4>
                        <span>{{ chart.metric }} · {{ chart.dimension }} · {{ chartDisplayRange(chart) }}</span>
                      </div>
                      <n-dropdown trigger="click" :options="chartActionOptions(chart)" @select="(key: string) => handleChartAction(key, chart)">
                        <n-button quaternary circle>
                          <template #icon><n-icon :component="SettingsOutline" /></template>
                        </n-button>
                      </n-dropdown>
                    </div>
                    <n-spin :show="chartLoadingIds.includes(chart.id)">
                      <n-alert v-if="chart.error" type="error" :bordered="false">
                        图表数据加载失败，请稍后重试。
                        <div class="alert-actions">
                          <n-button size="small" @click="handleChartAction('refresh', chart)">重新加载</n-button>
                        </div>
                      </n-alert>
                      <n-statistic v-else-if="chart.chartType === 'metric'" label="核心指标" :value="formatNumber((chartRowsMap[chart.id] ?? []).reduce((sum, row) => sum + row.value, 0))" />
                      <n-data-table v-else-if="chart.chartType === 'table'" :columns="businessTableColumns" :data="chartRowsMap[chart.id] ?? []" :pagination="false" />
                      <v-chart v-else class="business-chart" :option="optionForBusinessChart(chart)" autoresize />
                    </n-spin>
                  </div>
                </div>
              </n-card>

              <n-card class="section-card" :bordered="false">
                <div class="panel-title-row">
                  <div>
                    <h3>关系流转</h3>
                    <p>展示用户从起始日期阶段到结束日期阶段的变化，节点和连线均可导出分群。</p>
                  </div>
                  <n-space>
                    <n-date-picker v-model:value="transitionDateRange" type="daterange" :is-date-disabled="disableFutureDate" @update:value="loadTransition" />
                    <n-select v-model:value="transitionStageValues" multiple clearable :options="stageOptions" placeholder="全部阶段" class="w-260" @update:value="loadTransition" />
                  </n-space>
                </div>
                <n-empty v-if="!transitionResult?.edges.length" description="大盘无数据，请调整时间范围或阶段筛选。" />
                <template v-else>
                  <v-chart class="transition-chart" :option="transitionChartOption" autoresize @click="handleTransitionChartClick" />
                  <div class="transition-node-row">
                    <button
                      v-for="node in transitionResult.nodes"
                      :key="node.id"
                      class="transition-node"
                      :class="{ active: selectedStageValue === node.stageValue || selectedTransitionNode?.id === node.id }"
                      type="button"
                      @click="selectTransitionNode(node)"
                    >
                      <span>{{ node.side === 'from' ? '起始' : '结束' }} · {{ node.stageName }}</span>
                      <strong>{{ formatNumber(node.userCount) }}</strong>
                      <small>新增 {{ formatNumber(node.newCount) }} / 流失 {{ formatNumber(node.lostCount) }}</small>
                    </button>
                  </div>
                  <n-data-table :columns="transitionEdgeColumns" :data="transitionResult.edges" :pagination="{ pageSize: 6 }" />
                  <n-alert v-if="selectedTransitionNode" type="info" :bordered="false" class="section-alert">
                    已选节点：{{ selectedTransitionNode.stageName }}，可导出关系流转节点人群、洞察此分群、查看阶段趋势、查看流入来源或流出方向。
                    <div class="alert-actions">
                      <n-space>
                        <n-button v-if="!currentReport.isDemo" size="small" @click="openExportFromTransitionNode(selectedTransitionNode)">导出分群</n-button>
                        <n-button v-if="!currentReport.isDemo" size="small" @click="openInsightFromTransitionNode(selectedTransitionNode)">洞察此分群</n-button>
                        <n-button size="small" @click="trendStageValues = [selectedTransitionNode.stageValue]; loadTrend()">查看阶段趋势</n-button>
                        <n-button size="small" @click="openTransitionDirection(selectedTransitionNode, 'inflow')">查看流入来源</n-button>
                        <n-button size="small" @click="openTransitionDirection(selectedTransitionNode, 'outflow')">查看流出方向</n-button>
                      </n-space>
                    </div>
                  </n-alert>
                  <n-alert v-if="selectedTransitionEdge" type="info" :bordered="false" class="section-alert">
                    已选连线：{{ selectedTransitionEdge.fromStageName }} → {{ selectedTransitionEdge.toStageName }}，流转人数 {{ formatNumber(selectedTransitionEdge.userCount) }}，
                    起始阶段占比 {{ formatPercent(selectedTransitionEdge.fromRatio) }}，目标阶段占比 {{ formatPercent(selectedTransitionEdge.toRatio) }}。
                    <div class="alert-actions">
                      <n-space>
                        <n-button v-if="!currentReport.isDemo" size="small" @click="openExportFromTransition(selectedTransitionEdge)">导出该流转人群</n-button>
                        <n-button v-if="!currentReport.isDemo" size="small" @click="openInsightFromTransition(selectedTransitionEdge)">洞察该流转人群</n-button>
                      </n-space>
                    </div>
                  </n-alert>
                </template>
              </n-card>
            </template>
          </n-tab-pane>

          <n-tab-pane name="paths" tab="路径跃迁">
            <n-card class="section-card" :class="{ 'path-fullscreen-card': pathFullscreen }" :bordered="false">
              <template v-if="!paths.length">
                <n-empty class="large-empty" description="暂无路径配置，可以快速创建一个默认分析路径，或自定义新建路径。">
                  <template #extra>
                    <n-space>
                      <n-button v-if="!currentReport.isDemo" type="primary" :disabled="!currentReport.permissions.managePath" @click="quickCreatePath">快速新建</n-button>
                      <n-button v-if="!currentReport.isDemo" :disabled="!currentReport.permissions.managePath" @click="openPathModal()">自定义新建</n-button>
                    </n-space>
                  </template>
                </n-empty>
              </template>
              <template v-else>
                <div class="panel-title-row">
                  <div>
                    <h3>路径跃迁</h3>
                    <p>针对全量用户或指定分群，分析从起始事件到终止事件的行为路径和流失节点。</p>
                  </div>
                  <n-space>
                    <n-select v-model:value="selectedPathId" :options="paths.map((path) => ({ label: path.name, value: path.id }))" class="w-220" @update:value="selectedPathNode = currentPath?.nodes[0] ?? null" />
                    <n-button v-if="!currentReport.isDemo" :disabled="!currentReport.permissions.managePath" @click="openPathModal()">
                      <template #icon><n-icon :component="AddOutline" /></template>
                      新建路径
                    </n-button>
                    <n-dropdown v-if="pathMoreOptions.length" trigger="click" :options="pathMoreOptions" @select="handlePathMore">
                      <n-button>
                        <template #icon><n-icon :component="SettingsOutline" /></template>
                        更多
                      </n-button>
                    </n-dropdown>
                  </n-space>
                </div>

                <div v-if="currentPath" class="path-summary">
                  <n-descriptions :column="6" size="small">
                    <n-descriptions-item label="分析对象">{{ currentPath.targetSegmentName || '全量用户' }}</n-descriptions-item>
                    <n-descriptions-item label="分析周期">{{ currentPath.periodConfig.startDate }} 至 {{ currentPath.periodConfig.endDate }}</n-descriptions-item>
                    <n-descriptions-item label="更新频次">{{ lifecyclePathUpdateModeLabels[currentPath.updateMode] }}</n-descriptions-item>
                    <n-descriptions-item label="下次运行">{{ currentPath.nextRunAt ? formatDateTime(currentPath.nextRunAt) : '-' }}</n-descriptions-item>
                    <n-descriptions-item label="更新时间">{{ formatDateTime(currentPath.updatedAt) }}</n-descriptions-item>
                    <n-descriptions-item label="状态">
                      <n-tag :type="pathStatusTagType(currentPath.status)" size="small">{{ lifecyclePathStatusLabels[currentPath.status] }}</n-tag>
                    </n-descriptions-item>
                  </n-descriptions>
                </div>

                <n-alert v-if="currentPath && currentPath.status === 'failed'" type="error" :bordered="false" class="section-alert">
                  当前路径配置下暂无用户完成跃迁，请调整分析周期、目标分群或路径节点。
                  <div v-if="!currentReport.isDemo" class="alert-actions">
                    <n-space>
                      <n-button size="small" @click="openPathModal(currentPath)">编辑路径</n-button>
                      <n-button size="small" @click="handlePathMore('recalculate')">重新计算</n-button>
                    </n-space>
                  </div>
                </n-alert>

                <div v-if="currentPath" class="path-toolbar">
                  <n-space>
                    <n-button size="small" @click="pathZoom = Math.min(pathZoom + 0.1, 1.6)">放大</n-button>
                    <n-button size="small" @click="pathZoom = Math.max(pathZoom - 0.1, 0.6)">缩小</n-button>
                    <n-button size="small" @click="fitPathCanvas">适应画布</n-button>
                    <n-button size="small" @click="togglePathFullscreen">{{ pathFullscreen ? '退出全屏' : '全屏' }}</n-button>
                    <n-button size="small" @click="resetPathLayout">重置布局</n-button>
                    <n-button v-if="!currentReport.isDemo" size="small" :disabled="!currentReport.permissions.managePath" @click="handlePathMore('recalculate')">刷新路径</n-button>
                  </n-space>
                </div>

                <div v-if="currentPath" class="path-canvas" :style="{ transform: `scale(${pathZoom})`, transformOrigin: 'left top' }">
                  <template v-for="(node, index) in currentPath.nodes" :key="node.id">
                    <button class="path-node-card" :class="{ active: selectedPathNode?.id === node.id }" type="button" @click="selectedPathNode = node">
                      <n-tag size="small" :type="node.nodeType === 'start' ? 'success' : node.nodeType === 'end' ? 'warning' : 'info'">
                        {{ node.nodeType === 'start' ? '起始节点' : node.nodeType === 'end' ? '终止节点' : '中间节点' }}
                      </n-tag>
                      <strong>{{ node.nodeName }}</strong>
                      <span>用户数 {{ formatNumber(node.userCount) }}</span>
                      <span>占比 {{ formatPercent(node.ratio) }}</span>
                      <span>流失 {{ formatNumber(node.lostCount) }} · {{ formatPercent(node.lostRate) }}</span>
                      <span>转化率 {{ formatPercent(node.conversionRate) }}</span>
                    </button>
                    <div v-if="index < currentPath.nodes.length - 1" class="path-edge">
                      <span>{{ lifecyclePathEdgeSummary(currentPath.edges[index], currentPath.nodes) }}</span>
                      <strong>{{ formatNumber(currentPath.edges[index]?.userCount ?? 0) }}</strong>
                      <small>转化 {{ formatPercent(currentPath.edges[index]?.conversionRate) }} / 流失 {{ formatNumber(currentPath.edges[index]?.lostCount ?? 0) }}</small>
                      <n-button
                        v-if="currentPath.edges[index] && !currentReport.isDemo"
                        text
                        size="tiny"
                        @click="openExportFromPathEdge(currentPath.edges[index]!)"
                      >
                        导出转化路径
                      </n-button>
                    </div>
                  </template>
                </div>

                <n-card v-if="selectedPathNode" class="section-card" :bordered="false">
                  <div class="panel-title-row">
                    <div>
                      <h3>节点详情：{{ selectedPathNode.nodeName }}</h3>
                      <p>{{ selectedPathNode.conditionType === 'tag' ? '标签节点' : '行为事件节点' }} · 窗口期 {{ selectedPathNode.windowValue }} {{ selectedPathNode.windowUnit }}</p>
                    </div>
                    <n-space>
                      <n-button v-if="!currentReport.isDemo" size="small" @click="openExportFromPathNode(selectedPathNode)">导出分群</n-button>
                      <n-button v-if="!currentReport.isDemo" size="small" @click="openInsightFromPathNode(selectedPathNode)">洞察此分群</n-button>
                      <n-button size="small" @click="openPathNodeDetail(selectedPathNode)">查看明细</n-button>
                      <n-button v-if="!currentReport.isDemo" size="small" @click="setPathNodeAsEndpoint(selectedPathNode, 'start')">设置为起点分析</n-button>
                      <n-button v-if="!currentReport.isDemo" size="small" @click="setPathNodeAsEndpoint(selectedPathNode, 'end')">设置为终点分析</n-button>
                    </n-space>
                  </div>
                </n-card>
              </template>
            </n-card>
          </n-tab-pane>
        </n-tabs>
      </template>
    </n-spin>

    <n-modal v-model:show="showChartModal" preset="card" :title="editingChartId ? '编辑图表' : '添加图表'" class="wide-modal">
      <n-form label-placement="left" label-width="112">
        <n-form-item label="图表名称" required>
          <n-input v-model:value="chartForm.title" placeholder="请输入图表标题" />
        </n-form-item>
        <n-form-item label="生命周期阶段" required>
          <n-select v-model:value="chartForm.stageValues" multiple :options="stageOptions" />
        </n-form-item>
        <n-form-item label="图表类型" required>
          <n-radio-group v-model:value="chartForm.chartType">
            <n-radio-button v-for="option in chartTypeOptions" :key="String(option.value)" :value="option.value">{{ option.label }}</n-radio-button>
          </n-radio-group>
        </n-form-item>
        <n-grid :cols="2" :x-gap="12">
          <n-gi>
            <n-form-item label="维度">
              <n-select v-model:value="chartForm.dimension" :options="dimensionOptions" />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="度量" required>
              <n-select v-model:value="chartForm.metric" :options="metricOptions" />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="时间范围" required>
              <n-date-picker v-model:value="chartDateRange" type="daterange" :is-date-disabled="disableFutureDate" />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="展示数量">
              <n-input-number v-model:value="chartForm.topN" :min="1" :max="50" />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="排序方式">
              <n-select v-model:value="chartForm.sort" :options="[{ label: '按数值降序', value: 'desc' }, { label: '按数值升序', value: 'asc' }]" />
            </n-form-item>
          </n-gi>
        </n-grid>
        <n-form-item label="筛选条件">
          <div class="chart-filter-list">
            <div class="chart-filter-toolbar">
              <n-radio-group v-model:value="chartForm.filterLogic" size="small">
                <n-radio-button v-for="option in chartFilterLogicOptions" :key="String(option.value)" :value="option.value">{{ option.label }}</n-radio-button>
              </n-radio-group>
              <n-button size="small" @click="addChartFilterCondition">添加条件</n-button>
            </div>
            <div v-for="(condition, index) in chartFilterConditions" :key="condition.id" class="chart-filter-row">
              <n-select
                v-model:value="condition.source"
                :options="chartFilterSourceOptions"
                class="w-120"
                @update:value="(value: LifecycleChartFilterSource) => handleChartFilterSourceChange(condition, value)"
              />
              <n-select
                :value="condition.sourceId"
                :options="chartFilterResourceOptions(condition)"
                filterable
                placeholder="选择资源"
                @update:value="(value: string) => handleChartFilterResourceChange(condition, value)"
              />
              <n-select
                :value="condition.source === 'event' ? condition.field.split('.').pop() : condition.field"
                :options="chartFilterFieldOptions(condition)"
                filterable
                placeholder="选择字段"
                @update:value="(value: string) => handleChartFilterFieldChange(condition, value)"
              />
              <n-select
                :value="condition.operator"
                :options="chartFilterOperatorOptions"
                class="w-120"
                @update:value="(value: LifecycleChartFilterOperator) => handleChartFilterOperatorChange(condition, value)"
              />
              <template v-if="noValueOperators.has(condition.operator)">
                <n-tag size="small" type="info">无需填写值</n-tag>
              </template>
              <template v-else-if="multiValueOperators.has(condition.operator) && chartFilterValueOptions(condition).length">
                <n-select
                  :value="chartFilterMultiValue(condition)"
                  multiple
                  :options="chartFilterValueOptions(condition)"
                  placeholder="选择多个值"
                  @update:value="(values: string[]) => setChartFilterMultiValue(condition, values)"
                />
              </template>
              <template v-else>
                <n-select
                  v-if="chartFilterValueOptions(condition).length"
                  v-model:value="condition.value"
                  :options="chartFilterValueOptions(condition)"
                  filterable
                  :placeholder="chartFilterValuePlaceholder(condition)"
                />
                <n-input v-else v-model:value="condition.value" :placeholder="chartFilterValuePlaceholder(condition)" />
              </template>
              <n-input
                v-if="condition.operator === 'between'"
                v-model:value="condition.value2"
                placeholder="结束值"
              />
              <n-date-picker
                v-if="condition.source === 'event'"
                :value="chartConditionDateRange(condition)"
                type="daterange"
                :is-date-disabled="disableFutureDate"
                @update:value="(value: DateRangeValue | null) => setChartConditionDateRange(condition, value)"
              />
              <n-button quaternary circle @click="removeChartFilterCondition(index)">
                <template #icon><n-icon :component="TrashOutline" /></template>
              </n-button>
              <div class="chart-filter-preview">{{ chartFilterSummary(condition) }}</div>
            </div>
            <n-alert type="info" :bordered="false">
              {{ chartFilterDescription() }}。筛选会随图表一起保存，并在下载数据时写入来源口径。
            </n-alert>
          </div>
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-popconfirm v-if="isChartFormDirty" @positive-click="closeChartModal">
            <template #trigger><n-button>取消</n-button></template>
            当前图表配置尚未保存，是否确认关闭？
          </n-popconfirm>
          <n-button v-else @click="closeChartModal">取消</n-button>
          <n-button type="primary" :loading="chartSaving" @click="saveChart">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showLargeChartModal" preset="card" :title="largeChart?.title" class="wide-modal">
      <v-chart v-if="largeChart" class="large-chart" :option="optionForBusinessChart(largeChart)" autoresize />
    </n-modal>

    <n-modal v-model:show="deleteChartModalVisible" preset="card" title="删除图表" class="medium-modal">
      <n-alert type="warning" :bordered="false">
        删除后，该业务图表配置和当前展示数据将从报告中移除。
      </n-alert>
      <template #footer>
        <n-space justify="end">
          <n-button @click="deleteChartModalVisible = false">取消</n-button>
          <n-button type="error" @click="confirmDeleteChart">确认删除</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="pathModalVisible" preset="card" :title="editingPathId ? '编辑路径' : '新建路径'" class="wide-modal">
      <n-form label-placement="left" label-width="112">
        <n-grid :cols="2" :x-gap="12">
          <n-gi>
            <n-form-item label="路径名称" required>
              <n-input v-model:value="pathDraft.name" maxlength="100" placeholder="请输入路径名称" />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="更新频次" required>
              <n-select v-model:value="pathDraft.updateMode" :options="[{ label: '手动更新', value: 'manual' }, { label: '按天更新', value: 'daily' }]" />
            </n-form-item>
          </n-gi>
          <n-gi v-if="pathDraft.updateMode === 'daily'">
            <n-form-item label="每日执行时间" required>
              <n-input v-model:value="pathDraft.dailyExecuteTime" placeholder="08:30" />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="分析周期" required>
              <n-space vertical class="full-width">
                <n-radio-group v-model:value="pathDraft.periodConfig.quickKey" @update:value="applyPathQuickPeriod">
                  <n-radio-button v-for="option in pathPeriodQuickOptions" :key="String(option.value)" :value="option.value">{{ option.label }}</n-radio-button>
                </n-radio-group>
                <n-date-picker
                  v-model:value="pathDateRange"
                  type="daterange"
                  :is-date-disabled="disableFutureDate"
                  @update:value="pathDraft.periodConfig.quickKey = 'custom'"
                />
              </n-space>
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="目标分群">
              <n-select v-model:value="pathDraft.targetSegmentId" clearable :options="selectResources.targetSegments" />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="描述">
              <n-input v-model:value="pathDraft.description" type="textarea" placeholder="路径说明" />
            </n-form-item>
          </n-gi>
        </n-grid>
        <n-divider />
        <div class="panel-title-row">
          <div>
            <h3>路径节点</h3>
            <p>起始事件固定第一位，终止事件固定最后一位，中间节点可拖拽排序。</p>
          </div>
          <n-button @click="addMiddleNode">添加中间节点</n-button>
        </div>
        <div class="path-draft-list">
          <div
            v-for="(node, index) in pathDraft.nodes"
            :key="index"
            class="path-draft-node"
            :draggable="index > 0 && index < pathDraft.nodes.length - 1"
            @dragstart="draggingNodeIndex = index"
            @dragover.prevent
            @drop="handleNodeDrop(index)"
          >
            <n-tag size="small">{{ index === 0 ? '起始事件' : index === pathDraft.nodes.length - 1 ? '终止事件' : '中间节点' }}</n-tag>
            <n-input v-model:value="node.nodeName" placeholder="节点名称" />
            <n-select
              v-model:value="node.conditionType"
              :options="[{ label: '标签', value: 'tag' }, { label: '行为事件', value: 'event' }]"
              class="w-120"
              @update:value="(value: LifecyclePathPayload['nodes'][number]['conditionType']) => handlePathConditionTypeChange(node, value)"
            />
            <template v-if="node.conditionType === 'tag'">
              <n-select
                v-model:value="node.conditionConfig.tagId"
                :options="pathTagOptions"
                placeholder="标签"
                @update:value="(value: string) => handlePathNodeTagChange(node, value)"
              />
              <n-select v-model:value="node.conditionConfig.tagValue" :options="tagValueOptions(node)" placeholder="标签值" />
            </template>
            <template v-else>
              <n-select
                v-model:value="node.conditionConfig.eventName"
                :options="selectResources.events"
                placeholder="行为事件"
                @update:value="(value: string) => handlePathNodeEventChange(node, value)"
              />
              <n-input v-model:value="node.conditionConfig.propertyFilter" placeholder="事件属性过滤，如 channel = app" />
            </template>
            <n-input v-model:value="node.conditionConfig.timeLimit" placeholder="时间限制，如 首次发生 / 09:00-21:00" />
            <n-input-number v-model:value="node.windowValue" :min="1" class="w-100" />
            <n-select v-model:value="node.windowUnit" :options="[{ label: '分钟', value: 'minute' }, { label: '小时', value: 'hour' }, { label: '天', value: 'day' }]" class="w-100" />
            <n-button quaternary circle :disabled="index === 0 || index === pathDraft.nodes.length - 1" @click="removePathNode(index)">
              <template #icon><n-icon :component="TrashOutline" /></template>
            </n-button>
          </div>
        </div>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-popconfirm @positive-click="pathModalVisible = false">
            <template #trigger><n-button>取消</n-button></template>
            若有未保存修改，确认离开后将丢弃配置。
          </n-popconfirm>
          <n-button type="primary" @click="savePath">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="deletePathModalVisible" preset="card" title="删除路径" class="medium-modal">
      <n-alert type="warning" :bordered="false">
        删除后，该路径配置、节点结果和转化路径结果将从当前生命周期报告中移除。
      </n-alert>
      <template #footer>
        <n-space justify="end">
          <n-button @click="deletePathModalVisible = false">取消</n-button>
          <n-button type="error" @click="confirmDeletePath">确认删除</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="exportModalVisible" preset="card" title="导出分群" class="wide-modal">
      <n-alert v-if="exportResult" :type="exportResult.status === 'success' ? 'success' : 'warning'" :bordered="false" class="section-alert">
        {{ exportResult.message }}<span v-if="exportResult.status === 'success'"> 预估人数 {{ formatNumber(exportResult.segmentCount) }}。</span>
        <div class="alert-actions">
          <n-space v-if="exportResult.status === 'success'">
            <n-button size="small" @click="exportModalVisible = false">继续分析</n-button>
            <n-button size="small" type="primary" @click="router.push('/user-insight/segments')">前往用户分群</n-button>
          </n-space>
        </div>
      </n-alert>
      <n-grid :cols="2" :x-gap="20">
        <n-gi>
          <h3>导出规则</h3>
          <n-form label-placement="left" label-width="112">
            <n-form-item label="导出来源" required>
              <n-input v-model:value="exportForm.sourceName" readonly />
            </n-form-item>
            <n-form-item label="生命周期阶段" required>
              <n-select v-model:value="exportForm.stageValues" multiple :options="stageOptions" @update:value="refreshExportEstimate()" />
            </n-form-item>
            <n-form-item label="人群范围" required>
              <n-radio-group v-model:value="exportForm.crowdRange" @update:value="refreshExportEstimate()">
                <n-radio value="all">当前阶段全部人群</n-radio>
                <n-radio value="new">当日新增</n-radio>
                <n-radio value="lost">当日流失</n-radio>
                <n-radio value="transition_node">关系流转节点人群</n-radio>
                <n-radio value="transition">流转人群</n-radio>
                <n-radio value="path_node">路径节点人群</n-radio>
                <n-radio value="path_edge">路径跃迁转化路径</n-radio>
              </n-radio-group>
            </n-form-item>
            <n-form-item label="时间范围" required>
              <n-date-picker v-model:value="exportDateRange" type="daterange" :is-date-disabled="disableFutureDate" @update:value="refreshExportEstimate()" />
            </n-form-item>
            <n-form-item label="输出 ID 类型" required>
              <n-select v-model:value="exportForm.outputIdType" :options="selectResources.outputIdTypes" @update:value="refreshExportEstimate()" />
            </n-form-item>
          </n-form>
        </n-gi>
        <n-gi>
          <h3>分群基本信息</h3>
          <n-form label-placement="left" label-width="112">
            <n-form-item label="分群名称" required>
              <n-input v-model:value="exportForm.segmentName" />
            </n-form-item>
            <n-form-item label="分群描述">
              <n-input v-model:value="exportForm.description" type="textarea" />
            </n-form-item>
            <n-form-item label="授权给">
              <n-select v-model:value="exportAuthTargetKeys" multiple :options="exportPrincipalOptions" placeholder="用户、用户组、角色、部门" />
            </n-form-item>
            <n-form-item label="分组">
              <n-select v-model:value="exportForm.groupIds" multiple :options="selectResources.segmentGroups" />
            </n-form-item>
            <n-form-item label="更新方式">
              <n-radio-group v-model:value="exportForm.updateMode">
                <n-radio value="on_demand">按需更新</n-radio>
                <n-radio value="daily">按天更新</n-radio>
              </n-radio-group>
            </n-form-item>
            <n-form-item label="预估人数">
              <n-spin :show="exportEstimating">
                <n-statistic :value="exportEstimate === null ? '--' : formatNumber(exportEstimate)" />
              </n-spin>
            </n-form-item>
          </n-form>
        </n-gi>
      </n-grid>
      <n-alert v-if="exportEstimate === 0" type="warning" :bordered="false">
        当前导出规则下暂无可保存用户。
      </n-alert>
      <template #footer>
        <n-space justify="end">
          <n-button @click="exportModalVisible = false">取消</n-button>
          <n-button type="primary" :loading="exportSaving" :disabled="exportSaveDisabled" @click="saveExport">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="insightModalVisible" preset="card" title="洞察分群" class="medium-modal">
      <n-form label-placement="left" label-width="120">
        <n-form-item label="洞察对象" required>
          <n-radio-group v-model:value="insightForm.insightObject">
            <n-radio value="single">单阶段洞察</n-radio>
            <n-radio value="merged">多阶段合并洞察</n-radio>
          </n-radio-group>
        </n-form-item>
        <n-form-item label="生命周期阶段" required>
          <n-select v-model:value="insightForm.stageValues" multiple :options="stageOptions" />
        </n-form-item>
        <n-form-item label="洞察报告名称">
          <n-input v-model:value="insightForm.reportName" />
        </n-form-item>
        <n-form-item label="进入方式" required>
          <n-radio-group v-model:value="insightForm.entryMode">
            <n-radio value="direct">直接进入群体画像</n-radio>
            <n-radio value="stay">创建后留在当前页</n-radio>
          </n-radio-group>
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="insightModalVisible = false">取消</n-button>
          <n-button type="primary" :loading="insightSaving" @click="saveInsight">确定</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="authModalVisible" preset="card" title="权限管理" class="wide-modal">
      <n-alert v-if="authGlobalMode" type="info" :bordered="false" class="section-alert">
        全局权限管理入口可先选择生命周期报告，再维护该报告的授权对象、权限集合和标签查看权限同步。
      </n-alert>
      <n-form v-if="authGlobalMode" label-placement="left" label-width="112" class="global-auth-form">
        <n-form-item label="生命周期报告">
          <n-select v-model:value="globalAuthReportId" :options="globalAuthReportOptions" @update:value="switchGlobalAuthReport" />
        </n-form-item>
      </n-form>
      <n-grid :cols="2" :x-gap="20">
        <n-gi>
          <h3>{{ authEditingId ? '更新授权' : '批量授权' }}</h3>
          <n-form label-placement="left" label-width="112">
            <n-form-item label="授权对象类型">
              <n-select v-model:value="authDraft.principalType" :options="[
                { label: '用户', value: 'user' },
                { label: '用户组', value: 'user_group' },
                { label: '角色', value: 'role' },
                { label: '部门', value: 'department' },
              ]" />
            </n-form-item>
            <n-form-item label="授权对象">
              <n-select v-model:value="authDraft.principalIds" multiple :options="principalOptions" />
            </n-form-item>
            <n-form-item label="权限类型">
              <n-checkbox-group
                :value="authDraft.permissions"
                class="permission-checkbox-grid"
                @update:value="handleAuthPermissionUpdate"
              >
                <n-checkbox
                  v-for="option in permissionOptions"
                  :key="String(option.value)"
                  :value="option.value"
                >
                  {{ option.label }}
                </n-checkbox>
              </n-checkbox-group>
            </n-form-item>
          </n-form>
          <n-alert type="info" :bordered="false">
            授予编辑或报告管理权限时，系统自动提供对应生命周期标签查看权限。授权和取消授权会记录审计日志。
          </n-alert>
          <div class="modal-actions-left">
            <n-space>
              <n-button type="primary" @click="saveAuthorizations">{{ authEditingId ? '更新授权' : '批量授权' }}</n-button>
              <n-button v-if="authEditingId" @click="authEditingId = ''; authDraft.principalIds = []; authDraft.permissions = ['view']">退出更新</n-button>
            </n-space>
          </div>
        </n-gi>
        <n-gi>
          <h3>已授权列表</h3>
          <n-data-table :columns="authColumns" :data="authorizations" :pagination="{ pageSize: 6 }" />
        </n-gi>
      </n-grid>
    </n-modal>

    <n-modal v-model:show="deleteModalVisible" preset="card" title="删除生命周期分析报告" class="medium-modal">
      <n-alert type="error" :bordered="false">
        删除报告会调用标签体系的删除标签逻辑。生命周期标签删除后，对应分析报告、用户资产、关系流转和路径结果都会同步删除且不可恢复；已导出的用户分群不会自动删除。
      </n-alert>
      <template #footer>
        <n-space justify="end">
          <n-button @click="deleteModalVisible = false">取消</n-button>
          <n-button @click="goDeleteInTagSystem">前往标签体系删除</n-button>
          <n-button type="error" @click="confirmDeleteReport">确认删除</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-drawer v-model:show="auditDrawerVisible" width="760">
      <n-drawer-content title="审计日志">
        <n-data-table :columns="auditColumns" :data="auditLogs" :pagination="{ pageSize: 10 }" />
      </n-drawer-content>
    </n-drawer>

    <n-modal v-model:show="transitionActionModalVisible" preset="card" :title="transitionActionTitle" class="medium-modal">
      <template v-if="selectedTransitionNode">
        <n-descriptions :column="2" bordered size="small">
          <n-descriptions-item label="阶段">{{ selectedTransitionNode.stageName }}</n-descriptions-item>
          <n-descriptions-item label="节点">{{ selectedTransitionNode.side === 'from' ? '起始节点' : '结束节点' }}</n-descriptions-item>
          <n-descriptions-item label="用户数">{{ formatNumber(selectedTransitionNode.userCount) }}</n-descriptions-item>
          <n-descriptions-item label="新增 / 流失">{{ formatNumber(selectedTransitionNode.newCount) }} / {{ formatNumber(selectedTransitionNode.lostCount) }}</n-descriptions-item>
        </n-descriptions>
        <div class="modal-actions-left">
          <n-space>
            <n-button v-if="!currentReport?.isDemo" size="small" @click="openExportFromTransitionNode(selectedTransitionNode)">导出分群</n-button>
            <n-button v-if="!currentReport?.isDemo" size="small" @click="openInsightFromTransitionNode(selectedTransitionNode)">洞察此分群</n-button>
            <n-button size="small" @click="trendStageValues = [selectedTransitionNode.stageValue]; loadTrend()">查看阶段趋势</n-button>
            <n-button size="small" @click="openTransitionDirection(selectedTransitionNode, 'inflow')">查看流入来源</n-button>
            <n-button size="small" @click="openTransitionDirection(selectedTransitionNode, 'outflow')">查看流出方向</n-button>
          </n-space>
        </div>
      </template>
      <template v-else-if="selectedTransitionEdge">
        <n-descriptions :column="2" bordered size="small">
          <n-descriptions-item label="起始阶段">{{ selectedTransitionEdge.fromStageName }}</n-descriptions-item>
          <n-descriptions-item label="目标阶段">{{ selectedTransitionEdge.toStageName }}</n-descriptions-item>
          <n-descriptions-item label="流转人数">{{ formatNumber(selectedTransitionEdge.userCount) }}</n-descriptions-item>
          <n-descriptions-item label="流转占比">{{ formatPercent(selectedTransitionEdge.fromRatio) }} / {{ formatPercent(selectedTransitionEdge.toRatio) }}</n-descriptions-item>
        </n-descriptions>
        <div class="modal-actions-left">
          <n-space>
            <n-button v-if="!currentReport?.isDemo" size="small" @click="openExportFromTransition(selectedTransitionEdge)">导出该流转人群</n-button>
            <n-button v-if="!currentReport?.isDemo" size="small" @click="openInsightFromTransition(selectedTransitionEdge)">洞察该流转人群</n-button>
          </n-space>
        </div>
      </template>
    </n-modal>

    <n-drawer v-model:show="transitionDirectionDrawerVisible" width="720">
      <n-drawer-content :title="transitionDirectionMode === 'inflow' ? '流入来源' : '流出方向'">
        <n-alert type="info" :bordered="false" class="section-alert">
          {{ transitionDirectionNode?.stageName }} 的{{ transitionDirectionMode === 'inflow' ? '流入来源' : '流出方向' }}，按当前关系流转时间范围和资源权限计算。
        </n-alert>
        <n-data-table :columns="transitionEdgeColumns" :data="transitionDirectionRows" :pagination="{ pageSize: 8 }" />
      </n-drawer-content>
    </n-drawer>

    <n-drawer v-model:show="pathNodeDetailVisible" width="640">
      <n-drawer-content :title="pathNodeDetailTarget ? `节点明细：${pathNodeDetailTarget.nodeName}` : '节点明细'">
        <n-descriptions v-if="pathNodeDetailTarget" :column="1" bordered size="small">
          <n-descriptions-item label="节点类型">{{ pathNodeDetailTarget.nodeType === 'start' ? '起始节点' : pathNodeDetailTarget.nodeType === 'end' ? '终止节点' : '中间节点' }}</n-descriptions-item>
          <n-descriptions-item label="条件类型">{{ pathNodeDetailTarget.conditionType === 'tag' ? '标签' : '行为事件' }}</n-descriptions-item>
          <n-descriptions-item label="标签 / 事件">{{ pathNodeDetailTarget.conditionConfig.tagName || pathNodeDetailTarget.conditionConfig.eventDisplayName || '-' }}</n-descriptions-item>
          <n-descriptions-item label="条件值">{{ pathNodeDetailTarget.conditionConfig.tagValue || pathNodeDetailTarget.conditionConfig.propertyFilter || '-' }}</n-descriptions-item>
          <n-descriptions-item label="时间限制">{{ pathNodeDetailTarget.conditionConfig.timeLimit || '-' }}</n-descriptions-item>
          <n-descriptions-item label="窗口期">{{ pathNodeDetailTarget.windowValue }} {{ pathNodeDetailTarget.windowUnit }}</n-descriptions-item>
          <n-descriptions-item label="用户数">{{ formatNumber(pathNodeDetailTarget.userCount) }}</n-descriptions-item>
          <n-descriptions-item label="转化率">{{ formatPercent(pathNodeDetailTarget.conversionRate) }}</n-descriptions-item>
          <n-descriptions-item label="流失">{{ formatNumber(pathNodeDetailTarget.lostCount) }} / {{ formatPercent(pathNodeDetailTarget.lostRate) }}</n-descriptions-item>
        </n-descriptions>
      </n-drawer-content>
    </n-drawer>

    <n-modal v-model:show="switchReportModalVisible" preset="card" title="切换分析报告" class="wide-modal">
      <div class="control-row">
        <n-input
          v-model:value="switchReportKeyword"
          clearable
          placeholder="搜索报告名称"
          class="w-260"
          @keyup.enter="loadSwitchReports"
          @clear="loadSwitchReports"
        >
          <template #prefix>
            <button class="input-icon-button" type="button" @click="loadSwitchReports">
              <n-icon :component="SearchOutline" />
            </button>
          </template>
        </n-input>
        <n-button type="primary" @click="loadSwitchReports">搜索</n-button>
      </div>
      <n-data-table
        :columns="switchReportColumns"
        :data="switchReportRows"
        :loading="switchReportLoading"
        :row-key="(row: LifecycleReport) => row.id"
        :row-props="(row: LifecycleReport) => ({ class: row.id === switchSelectedReportId ? 'selected-switch-row' : '' })"
        :pagination="{ pageSize: 8 }"
      />
      <template #footer>
        <n-space justify="end">
          <n-button @click="switchReportModalVisible = false">取消</n-button>
          <n-button type="primary" :disabled="!switchSelectedReportId" @click="confirmSwitchReport">确定</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<style scoped lang="scss">
.lifecycle-page {
  color: #1f2937;
}

.page-head,
.detail-header,
.panel-title-row,
.section-toolbar,
.filter-actions,
.pagination-row,
.chart-panel-head,
.path-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.section-alert {
  margin-bottom: 16px;
}

.alert-actions {
  margin-top: 10px;
}

.section-card {
  margin-bottom: 16px;
}

.report-switch-card {
  margin-bottom: 8px;
}

.filter-actions,
.pagination-row {
  justify-content: flex-end;
  margin-top: 14px;
}

.detail-header {
  margin-bottom: 16px;
}

.detail-title-block {
  flex: 1;
}

.title-line {
  display: flex;
  align-items: center;
  gap: 10px;
}

.detail-meta,
.panel-title-row p,
.chart-panel-head span,
.stage-desc {
  color: #6b7280;
  font-size: 13px;
}

.detail-actions {
  flex-shrink: 0;
}

.control-label {
  color: #4b5563;
  font-size: 13px;
}

.input-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #64748b;
  cursor: pointer;
}

.input-icon-button:hover {
  color: #2563eb;
}

.control-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin: 14px 0;
}

.w-100 {
  width: 100px;
}

.w-120 {
  width: 120px;
}

.w-160 {
  width: 160px;
}

.w-220 {
  width: 220px;
}

.w-260 {
  width: 260px;
}

.full-width {
  width: 100%;
}

.stage-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}

.stage-card {
  min-height: 194px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  text-align: left;
  cursor: pointer;
}

.stage-card.active {
  border-color: #2563eb;
  box-shadow: 0 8px 22px rgb(37 99 235 / 12%);
}

.stage-card-head {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.stage-dot {
  width: 10px;
  height: 10px;
  margin-top: 6px;
  border-radius: 50%;
}

.stage-name {
  font-weight: 700;
}

.stage-total-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-top: 14px;
}

.stage-total {
  font-size: 28px;
  font-weight: 760;
}

.growth-chip {
  font-size: 13px;
  font-weight: 650;
}

.growth-chip.up {
  color: #16a34a;
}

.growth-chip.down {
  color: #dc2626;
}

.growth-chip.flat,
.growth-chip.neutral {
  color: #6b7280;
}

.stage-metrics {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-top: 12px;
  color: #4b5563;
  font-size: 13px;
}

.tiny-alert {
  margin-top: 10px;
  font-size: 12px;
}

.trend-chart,
.transition-chart,
.large-chart {
  width: 100%;
  height: 360px;
}

.business-chart {
  width: 100%;
  height: 260px;
}

.chart-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 14px;
}

.chart-panel {
  min-height: 342px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.chart-panel h4,
.panel-title-row h3 {
  margin: 0;
  font-size: 16px;
}

.transition-node-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
  margin: 12px 0;
}

.transition-node {
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  text-align: left;
  cursor: pointer;
}

.transition-node.active {
  border-color: #111827;
  box-shadow: 0 8px 18px rgb(17 24 39 / 12%);
}

.transition-node strong,
.transition-node span,
.transition-node small {
  display: block;
}

.chart-filter-list {
  display: grid;
  width: 100%;
  gap: 10px;
}

.chart-filter-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.chart-filter-row {
  display: grid;
  grid-template-columns: 120px minmax(160px, 1.2fr) minmax(150px, 1fr) 120px minmax(160px, 1fr) minmax(120px, 0.8fr) minmax(200px, 1fr) 42px;
  gap: 8px;
  align-items: center;
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}

.chart-filter-preview {
  grid-column: 1 / -1;
  color: #64748b;
  font-size: 12px;
}

.permission-checkbox-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(140px, 1fr));
  gap: 8px 16px;
}

.path-summary {
  margin-bottom: 12px;
}

.path-fullscreen-card {
  position: fixed;
  inset: 16px;
  z-index: 1200;
  display: flex;
  flex-direction: column;
  overflow: auto;
  background: #fff;
  box-shadow: 0 20px 60px rgb(15 23 42 / 24%);
}

.path-canvas {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 240px;
  padding: 18px;
  overflow: auto;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
}

.path-node-card {
  width: 176px;
  min-height: 190px;
  padding: 14px;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: white;
  text-align: left;
  cursor: pointer;
}

.path-node-card.active {
  border-color: #2563eb;
}

.path-node-card strong,
.path-node-card span {
  display: block;
  margin-top: 8px;
}

.path-edge {
  width: 150px;
  text-align: center;
  color: #475569;
}

.path-edge::before {
  content: '';
  display: block;
  height: 2px;
  margin-bottom: 8px;
  background: linear-gradient(90deg, #2563eb, #16a34a);
}

.path-draft-list {
  display: grid;
  gap: 10px;
}

.path-draft-node {
  display: grid;
  grid-template-columns: 84px 150px 120px 180px 150px minmax(180px, 1fr) 100px 100px 42px;
  gap: 8px;
  align-items: center;
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.large-empty {
  padding: 40px 0;
}

.wide-modal {
  width: min(1120px, 94vw);
}

.medium-modal {
  width: min(640px, 92vw);
}

.modal-actions-left {
  margin-top: 12px;
}

.global-auth-form {
  margin-bottom: 12px;
}

:deep(.selected-switch-row td) {
  background: #eff6ff;
}
</style>
