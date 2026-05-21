<script setup lang="ts">
import '@/components/charts/chartRegister'
import type { EChartsOption } from 'echarts'
import dayjs from 'dayjs'
import {
  NAlert,
  NButton,
  NCard,
  NCheckbox,
  NDataTable,
  NDatePicker,
  NDrawer,
  NDrawerContent,
  NEmpty,
  NInput,
  NInputNumber,
  NModal,
  NPagination,
  NRadioButton,
  NRadioGroup,
  NSelect,
  NSlider,
  NSpace,
  NSpin,
  NSwitch,
  NTag,
} from 'naive-ui'
import type { DataTableColumns, SelectOption } from 'naive-ui'
import { computed, h, onMounted, reactive, ref } from 'vue'
import VChart from 'vue-echarts'
import { heatmapAnalysisService } from '@/services/heatmapAnalysisService'
import type {
  HeatmapAnalysisType,
  HeatmapClickPoint,
  HeatmapClickedUser,
  HeatmapComparisonRow,
  HeatmapCreatePayload,
  HeatmapElementStat,
  HeatmapListFilter,
  HeatmapListItem,
  HeatmapMobileSessionStatus,
  HeatmapMode,
  HeatmapQueryConfig,
  HeatmapQueryResult,
  HeatmapReachSection,
  HeatmapShareScope,
  HeatmapVersion,
} from '@/types/heatmapAnalysis'

type DateRangeValue = [number, number]
type ListTrendMetric = 'pv' | 'uv' | 'clickCount'

interface DetailUserFilter {
  id: string
  relation: 'AND' | 'OR'
  source: '用户属性' | '用户标签' | '用户分群'
  field: string
  operator: '等于' | '不等于' | '属于' | '不属于' | '包含'
  value: string
}

const listLoading = ref(false)
const detailLoading = ref(false)
const previewLoading = ref(false)
const heatmaps = ref<HeatmapListItem[]>([])
const activeHeatmap = ref<HeatmapListItem | null>(null)
const query = ref<HeatmapQueryConfig | null>(null)
const result = ref<HeatmapQueryResult | null>(null)
const preview48h = ref<Array<{ hour: string, pv: number }>>([])
const pageState = ref<'list' | 'detail' | 'mobile_create'>('list')
const notice = ref('已加载热力图列表。')
const selectedElementKey = ref<string>('hero_live')
const selectedPointId = ref<string>('')
const selectedReachIndex = ref<number>(1)
const clickedUsers = ref<HeatmapClickedUser[]>([])
const clickedUserKeyword = ref('')
const abnormalOnly = ref(false)
const showCreateTypeModal = ref(false)
const showWebCreateDrawer = ref(false)
const showUserDrawer = ref(false)
const showVersionDrawer = ref(false)
const showShareModal = ref(false)
const showSaveAnalysisModal = ref(false)
const showDashboardModal = ref(false)
const showDeleteModal = ref(false)
const pendingDeleteHeatmap = ref<HeatmapListItem | null>(null)
const showRenameModal = ref(false)
const pendingRenameHeatmap = ref<HeatmapListItem | null>(null)
const showNewVersionModal = ref(false)
const showFullscreenModal = ref(false)
const showHelpModal = ref(false)
const listTrendMetric = ref<ListTrendMetric>('clickCount')
const listPage = ref(1)
const listPageSize = ref(6)
const listUpdatedRange = ref<DateRangeValue | null>(null)
const abnormalPointOnly = ref(false)
const editingVersionId = ref<string>('')
const shareResultUrl = ref('')
const shareQrText = ref('')

const listFilter = reactive<HeatmapListFilter>({
  keyword: '',
  platform: 'all',
  analysisType: 'all',
  creator: 'all',
  sortBy: 'updated_at_desc',
})

const customDateRange = ref<DateRangeValue>([
  dayjs('2026-05-20').valueOf(),
  dayjs('2026-05-20').valueOf(),
])

const webCreateForm = reactive({
  name: '央视频首页热力图',
  baseUrl: 'https://www.yangshipin.cn',
  versionName: '默认版本',
  versionDesc: '首次创建热图底图。',
  description: '用于演示网页端点击热图、点位云图、触达率图和改版对比。',
  definitionType: 'url' as 'url' | 'title',
  domain: 'www.yangshipin.cn',
  pagePath: '/',
  queryOperator: 'any',
  queryValue: '*',
  pageTitle: '央视频',
  titleOperator: 'contains' as 'equals' | 'contains' | 'regex',
  hashEnabled: false,
  hashPath: '',
  hashQueryValue: '',
  clickHeatmap: true,
  pointHeatmap: true,
  reachHeatmap: true,
  comparison: true,
  clickedUsers: true,
})

const mobileSessionStatus = ref<HeatmapMobileSessionStatus>('waiting_scan')
const mobileForm = reactive({
  name: '移动端结算页热力图',
  pageName: '小游戏结算页',
  scheme: 'demo-app://settlement',
})

const saveAnalysisForm = reactive({
  name: '央视频首页热力图分析',
  folder: '个人空间 / 我的分析',
  description: '保存当前热力图查询配置，包括模式、版本、筛选、透明度和选中元素。',
  favorite: false,
})

const dashboardForm = reactive({
  title: '央视频首页热力图快照',
  dashboard: '个人空间 / 数据概览',
  widgetType: 'heatmap_snapshot' as 'heatmap_metric' | 'heatmap_snapshot' | 'heatmap_rank' | 'heatmap_reach' | 'heatmap_comparison' | 'heatmap_trend',
  refreshPolicy: 'open' as 'open' | 'hourly' | 'manual' | 'snapshot',
  timeRangePolicy: 'follow_current' as 'follow_current' | 'fixed',
  size: 'large' as 'medium' | 'large',
})

const shareForm = reactive({
  shareName: '央视频首页热力图分享',
  scope: 'project' as HeatmapShareScope,
  specifiedTargets: ['user_mia', 'team_growth'] as string[],
  expiresInDays: 7,
  allowUserList: false,
  allowCopy: false,
  passwordEnabled: false,
  password: '',
})

const newVersionForm = reactive({
  versionName: '新版首页实验版',
  versionDesc: '新增会员权益横幅和赛事直播入口。',
  baseUrl: 'https://www.yangshipin.cn',
  validStartTime: '2026-05-21 00:00:00',
  validEndTime: '',
  setDefault: false,
})

const detailUserFilters = ref<DetailUserFilter[]>([
  {
    id: 'uf_default_1',
    relation: 'AND',
    source: '用户标签',
    field: '金币余额等级',
    operator: '等于',
    value: '低金币',
  },
])

const comparisonForm = reactive({
  leftDateRange: [
    dayjs('2026-05-08').valueOf(),
    dayjs('2026-05-14').valueOf(),
  ] as DateRangeValue,
  rightDateRange: [
    dayjs('2026-05-15').valueOf(),
    dayjs('2026-05-20').valueOf(),
  ] as DateRangeValue,
  leftDevice: 'all' as HeatmapQueryConfig['deviceType'],
  rightDevice: 'all' as HeatmapQueryConfig['deviceType'],
  leftUserFilterText: '',
  rightUserFilterText: '用户标签.金币余额等级 等于 低金币',
  syncMode: true,
})

const renameForm = reactive({
  name: '',
})

const platformOptions: SelectOption[] = [
  { label: '全部端', value: 'all' },
  { label: '网页端', value: 'web' },
  { label: '移动端', value: 'mobile' },
]

const analysisTypeOptions: SelectOption[] = [
  { label: '全部类型', value: 'all' },
  { label: '点击热图', value: 'click_heatmap' },
  { label: '点位云图', value: 'point_heatmap' },
  { label: '触达率图', value: 'reach_heatmap' },
  { label: '改版对比', value: 'comparison' },
]

const creatorOptions: SelectOption[] = [
  { label: '全部创建人', value: 'all' },
  { label: 'Chaoyang Xu', value: 'Chaoyang Xu' },
  { label: 'Mia Chen', value: 'Mia Chen' },
]

const sortOptions: SelectOption[] = [
  { label: '最近更新', value: 'updated_at_desc' },
  { label: '创建时间', value: 'created_at_desc' },
  { label: '昨日 PV', value: 'yesterday_pv_desc' },
  { label: '昨日点击数', value: 'yesterday_click_desc' },
  { label: '昨日跳出率', value: 'bounce_rate_desc' },
]

const listTrendMetricOptions: SelectOption[] = [
  { label: '趋势：点击数', value: 'clickCount' },
  { label: '趋势：PV', value: 'pv' },
  { label: '趋势：UV', value: 'uv' },
]

const dateRangeOptions: SelectOption[] = [
  { label: '昨天', value: 'yesterday' },
  { label: '过去 7 天', value: 'last_7_days' },
  { label: '过去 14 天', value: 'last_14_days' },
  { label: '自定义', value: 'custom' },
]

const deviceOptions: SelectOption[] = [
  { label: '全部设备', value: 'all' },
  { label: 'PC', value: 'pc' },
  { label: 'Mobile', value: 'mobile' },
  { label: 'Tablet', value: 'tablet' },
]

const browserOptions: SelectOption[] = [
  { label: '全部浏览器', value: 'all' },
  { label: 'Chrome', value: 'Chrome' },
  { label: 'Safari', value: 'Safari' },
  { label: 'Firefox', value: 'Firefox' },
  { label: 'Edge', value: 'Edge' },
]

const osOptions: SelectOption[] = [
  { label: '全部系统', value: 'all' },
  { label: 'Windows', value: 'Windows' },
  { label: 'macOS', value: 'macOS' },
  { label: 'iOS', value: 'iOS' },
  { label: 'Android', value: 'Android' },
]

const modeOptions: SelectOption[] = [
  { label: '点击热图', value: 'click_heatmap' },
  { label: '点位云图', value: 'point_heatmap' },
  { label: '触达率图', value: 'reach_heatmap' },
  { label: '改版对比', value: 'comparison' },
]

const userFilterSourceOptions: SelectOption[] = [
  { label: '用户属性', value: '用户属性' },
  { label: '用户标签', value: '用户标签' },
  { label: '用户分群', value: '用户分群' },
]

const userFilterFieldOptions: SelectOption[] = [
  { label: '金币余额等级', value: '金币余额等级' },
  { label: '活跃等级', value: '活跃等级' },
  { label: '流失风险', value: '流失风险' },
  { label: '付费状态', value: '付费状态' },
  { label: '近 7 日活跃用户', value: '近 7 日活跃用户' },
]

const userFilterOperatorOptions: SelectOption[] = [
  { label: '等于', value: '等于' },
  { label: '不等于', value: '不等于' },
  { label: '属于', value: '属于' },
  { label: '不属于', value: '不属于' },
  { label: '包含', value: '包含' },
]

const titleOperatorOptions: SelectOption[] = [
  { label: '等于', value: 'equals' },
  { label: '包含', value: 'contains' },
  { label: '正则匹配', value: 'regex' },
]

const pointGranularityOptions: SelectOption[] = [
  { label: '精细', value: 'fine' },
  { label: '标准', value: 'standard' },
  { label: '粗略', value: 'coarse' },
]

const reachSectionTypeOptions: SelectOption[] = [
  { label: '按屏分段', value: 'screen' },
  { label: '按百分比分段', value: 'percent' },
]

const comparisonViewModeOptions: SelectOption[] = [
  { label: '并排对比', value: 'side_by_side' },
  { label: '叠加差异', value: 'overlay_diff' },
  { label: '指标对比', value: 'metric_table' },
  { label: '排名变化', value: 'rank_change' },
]

const dashboardTimeRangePolicyOptions: SelectOption[] = [
  { label: '跟随当前查询范围', value: 'follow_current' },
  { label: '固定当前时间范围', value: 'fixed' },
]

const shareTargetOptions: SelectOption[] = [
  { label: 'Mia Chen', value: 'user_mia' },
  { label: 'Alex Li', value: 'user_alex' },
  { label: '运营团队', value: 'team_growth' },
  { label: '数据分析团队', value: 'team_data' },
]

const versionOptions = computed<SelectOption[]>(() =>
  (result.value?.versions ?? []).map((version) => ({
    label: `${version.versionName}${version.archived ? '（已归档）' : ''}`,
    value: version.id,
    disabled: version.archived,
  })),
)

const activeElements = computed(() => result.value?.elements ?? [])
const activePoints = computed(() => result.value?.points ?? [])
const activeReachSections = computed(() => result.value?.reachSections ?? [])
const listDateFilteredHeatmaps = computed(() => {
  if (!listUpdatedRange.value) {
    return heatmaps.value
  }

  const [start, end] = listUpdatedRange.value
  return heatmaps.value.filter((heatmap) => {
    const updatedAt = dayjs(heatmap.updatedAt).valueOf()
    return updatedAt >= start && updatedAt <= end + 24 * 60 * 60 * 1000 - 1
  })
})
const pagedHeatmaps = computed(() => {
  const start = (listPage.value - 1) * listPageSize.value
  return listDateFilteredHeatmaps.value.slice(start, start + listPageSize.value)
})
const displayedPoints = computed(() =>
  abnormalPointOnly.value
    ? activePoints.value.filter((point) => Boolean(point.anomalyType))
    : activePoints.value,
)
const rankElements = computed(() => {
  const focusedReach = activeReachSections.value.find((section) => section.sectionIndex === selectedReachIndex.value)

  if (query.value?.mode !== 'reach_heatmap' || !focusedReach) {
    return activeElements.value
  }

  return activeElements.value.filter((element) =>
    element.y >= focusedReach.startY && element.y < focusedReach.endY,
  )
})
const selectedElement = computed(() =>
  activeElements.value.find((element) => element.elementKey === selectedElementKey.value) ?? activeElements.value[0],
)
const selectedPoint = computed(() =>
  displayedPoints.value.find((point) => point.id === selectedPointId.value) ?? displayedPoints.value[0],
)
const selectedReach = computed(() =>
  activeReachSections.value.find((section) => section.sectionIndex === selectedReachIndex.value) ?? activeReachSections.value[0],
)

const previewOption = computed<EChartsOption>(() => ({
  grid: { left: 42, right: 16, top: 22, bottom: 28 },
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', data: preview48h.value.map((point) => point.hour), axisLabel: { show: false } },
  yAxis: { type: 'value' },
  series: [
    {
      name: 'PV',
      type: 'line',
      smooth: true,
      data: preview48h.value.map((point) => point.pv),
      areaStyle: { opacity: 0.16 },
    },
  ],
}))

const elementRankOption = computed<EChartsOption>(() => ({
  grid: { left: 96, right: 24, top: 20, bottom: 28 },
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'value' },
  yAxis: {
    type: 'category',
    data: rankElements.value.slice(0, 8).map((item) => item.elementText),
    inverse: true,
  },
  series: [
    {
      type: 'bar',
      data: rankElements.value.slice(0, 8).map((item) => item.clickCount),
      itemStyle: { color: '#18a058' },
    },
  ],
}))

const listTrendOption = (heatmap: HeatmapListItem): EChartsOption => ({
  grid: { left: 0, right: 0, top: 6, bottom: 0 },
  xAxis: { type: 'category', data: heatmap.trend.map((point) => point.date), show: false },
  yAxis: { type: 'value', show: false },
  series: [
    {
      type: 'line',
      smooth: true,
      symbol: 'none',
      data: heatmap.trend.map((point) => point[listTrendMetric.value]),
      areaStyle: { opacity: 0.12 },
      lineStyle: { width: 2 },
    },
  ],
})

const clickedUserColumns: DataTableColumns<HeatmapClickedUser> = [
  { title: '用户 ID', key: 'userId', width: 150 },
  { title: '首次点击时间', key: 'firstClickTime', width: 180 },
  { title: '最近点击时间', key: 'lastClickTime', width: 180 },
  { title: '点击次数', key: 'clickCount', width: 100, sorter: (left, right) => left.clickCount - right.clickCount },
  { title: '设备', key: 'device', width: 90 },
  { title: '浏览器', key: 'browser', width: 100 },
  { title: '城市', key: 'city', width: 90 },
  {
    title: '用户属性',
    key: 'userAttributes',
    width: 220,
    render: (row) => row.userAttributes.join(' / '),
  },
  {
    title: '异常标识',
    key: 'anomalyTypes',
    width: 180,
    render: (row) => row.anomalyTypes.length
      ? h(NSpace, { size: 4 }, {
          default: () => row.anomalyTypes.map((label) => h(NTag, { type: 'error', size: 'small' }, { default: () => label })),
        })
      : '-',
  },
  {
    title: '操作',
    key: 'actions',
    width: 130,
    fixed: 'right',
    render: (row) => h(NButton, { text: true, type: 'primary', onClick: () => {
      notice.value = `已打开 ${row.userId} 的行为序列演示。`
    } }, { default: () => '查看行为序列' }),
  },
]

const versionColumns: DataTableColumns<HeatmapVersion> = [
  { title: '版本名称', key: 'versionName', width: 140 },
  { title: '说明', key: 'versionDesc', minWidth: 220 },
  { title: '底图地址 / 快照', key: 'baseUrl', minWidth: 220 },
  { title: '生效开始', key: 'validStartTime', width: 160 },
  { title: '创建人', key: 'createdBy', width: 120 },
  { title: '创建时间', key: 'createdAt', width: 160 },
  {
    title: '默认版本',
    key: 'isDefault',
    width: 110,
    render: (row) => row.isDefault ? h(NTag, { type: 'success' }, { default: () => '默认' }) : '-',
  },
  {
    title: '状态',
    key: 'archived',
    width: 100,
    render: (row) => row.archived ? h(NTag, { type: 'warning' }, { default: () => '归档' }) : h(NTag, { type: 'success' }, { default: () => '可用' }),
  },
  {
    title: '操作',
    key: 'actions',
    width: 330,
    fixed: 'right',
    render: (row) => h(NSpace, { size: 8 }, {
      default: () => [
        h(NButton, { text: true, type: 'primary', disabled: row.archived, onClick: () => viewVersion(row.id) }, { default: () => '查看' }),
        h(NButton, { text: true, type: 'primary', disabled: row.isDefault || row.archived, onClick: () => setDefaultVersion(row.id) }, { default: () => '设为默认' }),
        h(NButton, { text: true, onClick: () => compareWithVersion(row.id) }, { default: () => '对比' }),
        h(NButton, { text: true, onClick: () => editVersion(row) }, { default: () => '编辑' }),
        h(NButton, { text: true, onClick: () => copyVersion(row) }, { default: () => '复制' }),
        h(NButton, { text: true, type: 'error', disabled: row.isDefault || row.archived, onClick: () => archiveVersion(row) }, { default: () => '删除' }),
      ],
    }),
  },
]

const comparisonColumns: DataTableColumns<HeatmapComparisonRow> = [
  { title: '元素', key: 'elementText', minWidth: 160 },
  { title: 'A 点击次数', key: 'leftClickCount', width: 120, render: (row) => formatNumber(row.leftClickCount) },
  { title: 'B 点击次数', key: 'rightClickCount', width: 120, render: (row) => formatNumber(row.rightClickCount) },
  { title: '点击变化', key: 'clickDelta', width: 110, render: (row) => formatSignedNumber(row.clickDelta) },
  { title: '变化率', key: 'clickDeltaRateLabel', width: 100 },
  { title: '点击率变化', key: 'clickRateDelta', width: 120, render: (row) => formatSignedPercent(row.clickRateDelta) },
  { title: '排名变化', key: 'rankChange', width: 110 },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) => h(NTag, { type: row.status === 'up' || row.status === 'new' ? 'success' : row.status === 'down' || row.status === 'disappeared' ? 'error' : 'default' }, {
      default: () => statusLabel(row.status),
    }),
  },
]

function formatNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(Math.round(value))
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function formatSeconds(value: number): string {
  return `${value.toFixed(0)} 秒`
}

function formatSignedNumber(value: number): string {
  return `${value > 0 ? '+' : ''}${formatNumber(value)}`
}

function formatSignedPercent(value: number): string {
  return `${value > 0 ? '+' : ''}${(value * 100).toFixed(1)}pp`
}

function typeLabel(type: HeatmapAnalysisType): string {
  const map: Record<HeatmapAnalysisType, string> = {
    click_heatmap: '点击热图',
    point_heatmap: '点位云图',
    reach_heatmap: '触达率图',
    comparison: '改版对比',
    clicked_users: '点击用户',
  }
  return map[type]
}

function modeLabel(mode: HeatmapMode): string {
  const map: Record<HeatmapMode, string> = {
    click_heatmap: '点击热图',
    point_heatmap: '点位云图',
    reach_heatmap: '触达率图',
    comparison: '改版对比',
  }
  return map[mode]
}

function statusLabel(status: HeatmapComparisonRow['status']): string {
  const map: Record<HeatmapComparisonRow['status'], string> = {
    new: '新增',
    disappeared: '消失',
    up: '上升',
    down: '下降',
    flat: '持平',
  }
  return map[status]
}

function getMetricChange(current: number, previous: number): string {
  if (previous === 0) {
    return current > 0 ? '新增' : '--'
  }
  const rate = (current - previous) / previous
  return `${rate > 0 ? '+' : ''}${(rate * 100).toFixed(1)}%`
}

function updateListFilter() {
  listPage.value = 1
  loadHeatmaps()
}

function updateListDateRange(value: DateRangeValue | null) {
  listUpdatedRange.value = value
  listPage.value = 1
}

function trendMetricLabel(metric: ListTrendMetric): string {
  const map: Record<ListTrendMetric, string> = {
    pv: 'PV',
    uv: 'UV',
    clickCount: '点击数',
  }
  return map[metric]
}

function buildUserFilterText(): string {
  return detailUserFilters.value
    .map((filter, index) => {
      const prefix = index === 0 ? '' : `${filter.relation} `
      return `${prefix}${filter.source}.${filter.field} ${filter.operator} ${filter.value}`
    })
    .join(' ')
}

function syncUserFilterText() {
  if (query.value) {
    query.value.userFilterText = buildUserFilterText()
  }
}

function addUserFilter() {
  detailUserFilters.value.push({
    id: `uf_${Date.now()}`,
    relation: 'AND',
    source: '用户标签',
    field: '活跃等级',
    operator: '等于',
    value: '高活跃',
  })
  syncUserFilterText()
}

function removeUserFilter(filterId: string) {
  detailUserFilters.value = detailUserFilters.value.filter((filter) => filter.id !== filterId)
  syncUserFilterText()
}

function parseWebUrl() {
  try {
    const url = new URL(webCreateForm.baseUrl)
    webCreateForm.domain = url.hostname
    webCreateForm.pagePath = url.pathname || '/'
    webCreateForm.queryValue = url.search ? url.search.slice(1) : '*'
    webCreateForm.hashPath = url.hash
  } catch {
    webCreateForm.domain = ''
  }
}

function syncQuickDateRange(value: string) {
  if (!query.value) {
    return
  }
  const today = dayjs('2026-05-21')
  const rangeMap: Record<string, [string, string]> = {
    yesterday: [today.subtract(1, 'day').format('YYYY-MM-DD'), today.subtract(1, 'day').format('YYYY-MM-DD')],
    last_7_days: [today.subtract(7, 'day').format('YYYY-MM-DD'), today.subtract(1, 'day').format('YYYY-MM-DD')],
    last_14_days: [today.subtract(14, 'day').format('YYYY-MM-DD'), today.subtract(1, 'day').format('YYYY-MM-DD')],
  }
  const selected = rangeMap[value]
  query.value.dateRange.value = value as HeatmapQueryConfig['dateRange']['value']
  query.value.dateRange.type = value === 'custom' ? 'absolute' : 'relative'

  if (selected) {
    query.value.dateRange.startDate = selected[0]
    query.value.dateRange.endDate = selected[1]
    customDateRange.value = [dayjs(selected[0]).valueOf(), dayjs(selected[1]).valueOf()]
  }
}

function updateCustomDateRange(value: DateRangeValue | null) {
  if (!query.value || !value) {
    return
  }

  query.value.dateRange.type = 'absolute'
  query.value.dateRange.value = 'custom'
  query.value.dateRange.startDate = dayjs(value[0]).format('YYYY-MM-DD')
  query.value.dateRange.endDate = dayjs(value[1]).format('YYYY-MM-DD')
  customDateRange.value = value
}

function updateComparisonLeftDateRange(value: DateRangeValue | null) {
  if (value) {
    comparisonForm.leftDateRange = value
  }
}

function updateComparisonRightDateRange(value: DateRangeValue | null) {
  if (value) {
    comparisonForm.rightDateRange = value
  }
}

function syncComparisonConfig() {
  if (!query.value) {
    return
  }

  query.value.comparison.leftDateRange = {
    startDate: dayjs(comparisonForm.leftDateRange[0]).format('YYYY-MM-DD'),
    endDate: dayjs(comparisonForm.leftDateRange[1]).format('YYYY-MM-DD'),
  }
  query.value.comparison.rightDateRange = {
    startDate: dayjs(comparisonForm.rightDateRange[0]).format('YYYY-MM-DD'),
    endDate: dayjs(comparisonForm.rightDateRange[1]).format('YYYY-MM-DD'),
  }
  query.value.comparison.leftDevice = comparisonForm.leftDevice
  query.value.comparison.rightDevice = comparisonForm.rightDevice
  query.value.comparison.leftUserFilterText = comparisonForm.leftUserFilterText
  query.value.comparison.rightUserFilterText = comparisonForm.rightUserFilterText
}

async function loadHeatmaps() {
  listLoading.value = true
  heatmaps.value = await heatmapAnalysisService.listHeatmaps(listFilter)
  if (listPage.value > Math.max(1, Math.ceil(listDateFilteredHeatmaps.value.length / listPageSize.value))) {
    listPage.value = 1
  }
  listLoading.value = false
}

async function openDetail(heatmap: HeatmapListItem, mode: HeatmapMode = 'click_heatmap') {
  activeHeatmap.value = heatmap
  query.value = await heatmapAnalysisService.getDefaultQuery(heatmap.id)
  query.value.mode = mode
  hydrateComparisonFormFromQuery()
  pageState.value = 'detail'
  await runQuery()
}

async function openDetailWithQuery(heatmap: HeatmapListItem, nextQuery: HeatmapQueryConfig) {
  activeHeatmap.value = heatmap
  query.value = nextQuery
  hydrateComparisonFormFromQuery()
  pageState.value = 'detail'
  await runQuery()
}

async function openComparison(heatmap: HeatmapListItem) {
  if (heatmap.id !== 'hm_yangshipin_home') {
    notice.value = '当前热力图只有一个版本，请先创建新版本后再进行对比。'
    return
  }
  await openDetail(heatmap, 'comparison')
}

async function openListAnalysis(heatmap: HeatmapListItem, type: HeatmapAnalysisType) {
  if (type === 'comparison') {
    await openComparison(heatmap)
    return
  }

  if (type === 'clicked_users') {
    await openDetail(heatmap, 'click_heatmap')
    await openClickedUsers()
    return
  }

  await openDetail(heatmap, type)
}

async function runQuery() {
  if (!query.value) {
    return
  }
  syncUserFilterText()
  syncComparisonConfig()
  detailLoading.value = true
  result.value = await heatmapAnalysisService.queryHeatmap(query.value)
  activeHeatmap.value = result.value.heatmap
  selectedElementKey.value = query.value.selectedElementKey ?? result.value.elements[0]?.elementKey ?? ''
  selectedPointId.value = query.value.selectedPointId ?? result.value.points[0]?.id ?? ''
  notice.value = `查询完成，当前模式：${modeLabel(query.value.mode)}。`
  detailLoading.value = false
}

function hydrateComparisonFormFromQuery() {
  if (!query.value) {
    return
  }

  const comparison = query.value.comparison
  comparisonForm.leftDateRange = [
    dayjs(comparison.leftDateRange?.startDate ?? '2026-05-08').valueOf(),
    dayjs(comparison.leftDateRange?.endDate ?? '2026-05-14').valueOf(),
  ]
  comparisonForm.rightDateRange = [
    dayjs(comparison.rightDateRange?.startDate ?? '2026-05-15').valueOf(),
    dayjs(comparison.rightDateRange?.endDate ?? '2026-05-20').valueOf(),
  ]
  comparisonForm.leftDevice = comparison.leftDevice ?? 'all'
  comparisonForm.rightDevice = comparison.rightDevice ?? 'all'
  comparisonForm.leftUserFilterText = comparison.leftUserFilterText ?? ''
  comparisonForm.rightUserFilterText = comparison.rightUserFilterText ?? '用户标签.金币余额等级 等于 低金币'
}

async function refreshPreview() {
  previewLoading.value = true
  parseWebUrl()
  preview48h.value = await heatmapAnalysisService.getPreview48h()
  previewLoading.value = false
}

function selectElement(element: HeatmapElementStat) {
  selectedElementKey.value = element.elementKey
  if (query.value) {
    query.value.selectedElementKey = element.elementKey
  }
}

function selectPoint(point: HeatmapClickPoint) {
  selectedPointId.value = point.id
  selectedElementKey.value = point.elementKey ?? selectedElementKey.value
  if (query.value) {
    query.value.selectedPointId = point.id
    query.value.selectedElementKey = point.elementKey
  }
}

function resetPointFilter() {
  selectedPointId.value = displayedPoints.value[0]?.id ?? activePoints.value[0]?.id ?? ''
}

function handleElementRankChartClick(params: unknown) {
  if (!params || typeof params !== 'object' || !('name' in params)) {
    return
  }

  const name = String(params.name)
  const element = rankElements.value.find((item) => item.elementText === name)

  if (element) {
    selectElement(element)
  }
}

function selectReach(section: HeatmapReachSection) {
  selectedReachIndex.value = section.sectionIndex
  notice.value = `已选中${section.sectionName}，元素排行将聚焦该区域。`
}

async function openClickedUsers() {
  const selectedElementForQuery = selectedElement.value
  const selectedPointForQuery = selectedPoint.value
  clickedUsers.value = await heatmapAnalysisService.getClickedUsers({
    elementKey: selectedElementForQuery?.elementKey,
    pointId: selectedPointForQuery?.id,
    keyword: clickedUserKeyword.value,
    abnormalOnly: abnormalOnly.value,
  })
  showUserDrawer.value = true
}

async function refreshClickedUsers() {
  clickedUsers.value = await heatmapAnalysisService.getClickedUsers({
    elementKey: selectedElement.value?.elementKey,
    pointId: selectedPoint.value?.id,
    keyword: clickedUserKeyword.value,
    abnormalOnly: abnormalOnly.value,
  })
}

async function createWebHeatmap() {
  parseWebUrl()

  if (!webCreateForm.name.trim() || !webCreateForm.baseUrl.trim() || !webCreateForm.versionName.trim()) {
    notice.value = '请完整填写热力图名称、底图地址和版本名称。'
    return
  }

  if (!webCreateForm.domain) {
    notice.value = '底图地址格式不正确，请输入完整 URL。'
    return
  }

  const analysisTypes: HeatmapAnalysisType[] = [
    webCreateForm.clickHeatmap ? 'click_heatmap' : undefined,
    webCreateForm.pointHeatmap ? 'point_heatmap' : undefined,
    webCreateForm.reachHeatmap ? 'reach_heatmap' : undefined,
    webCreateForm.comparison ? 'comparison' : undefined,
    webCreateForm.clickedUsers ? 'clicked_users' : undefined,
  ].filter((type): type is HeatmapAnalysisType => Boolean(type))
  const payload: HeatmapCreatePayload = {
    name: webCreateForm.name,
    platform: 'web',
    analysisTypes,
    description: webCreateForm.description,
    pageGroup: {
      id: `pg_${Date.now()}`,
      name: `${webCreateForm.name}页面组`,
      baseUrl: webCreateForm.baseUrl,
      domain: webCreateForm.domain,
      definitionType: webCreateForm.definitionType,
      urlRule: {
        pathOperator: 'equals',
        pagePath: webCreateForm.pagePath,
        queryOperator: webCreateForm.queryOperator as 'empty' | 'any' | 'equals' | 'contains' | 'regex',
        queryValue: webCreateForm.queryValue,
        includeSubPath: false,
      },
      titleRule: {
        titleOperator: webCreateForm.titleOperator,
        pageTitle: webCreateForm.pageTitle,
      },
      hashRule: {
        hashEnabled: webCreateForm.hashEnabled,
        hashPathOperator: 'equals',
        hashPath: webCreateForm.hashPath,
        hashQueryOperator: webCreateForm.hashQueryValue ? 'equals' : 'empty',
        hashQueryValue: webCreateForm.hashQueryValue,
      },
      previewStatus: 'matched',
      matchedPageCount: 8,
    },
    version: {
      versionName: webCreateForm.versionName,
      versionDesc: webCreateForm.versionDesc,
      baseUrl: webCreateForm.baseUrl,
    },
  }
  const created = await heatmapAnalysisService.createHeatmap(payload)
  showWebCreateDrawer.value = false
  await loadHeatmaps()
  await openDetailWithQuery(created.heatmap, created.query)
}

async function createMobileHeatmap() {
  const payload: HeatmapCreatePayload = {
    name: mobileForm.name,
    platform: 'mobile',
    analysisTypes: ['click_heatmap', 'point_heatmap', 'reach_heatmap', 'clicked_users'],
    description: '移动端扫码同步页面快照创建。',
    pageGroup: {
      id: `pg_mobile_${Date.now()}`,
      name: mobileForm.pageName,
      baseUrl: mobileForm.scheme,
      domain: 'mobile-app',
      definitionType: 'title',
      urlRule: {
        pathOperator: 'equals',
        pagePath: mobileForm.scheme,
        queryOperator: 'any',
        queryValue: '*',
        includeSubPath: false,
      },
      titleRule: {
        titleOperator: 'equals',
        pageTitle: mobileForm.pageName,
      },
      hashRule: {
        hashEnabled: false,
        hashPathOperator: 'equals',
        hashPath: '',
        hashQueryOperator: 'empty',
        hashQueryValue: '',
      },
      previewStatus: 'matched',
      matchedPageCount: 1,
    },
    version: {
      versionName: '默认版本',
      versionDesc: '移动端同步快照。',
      baseUrl: mobileForm.scheme,
      snapshotUrl: 'mobile_demo_snapshot',
    },
  }
  const created = await heatmapAnalysisService.createHeatmap(payload)
  await loadHeatmaps()
  await openDetailWithQuery(created.heatmap, created.query)
}

async function openShareForHeatmap(heatmap: HeatmapListItem) {
  activeHeatmap.value = heatmap
  query.value = await heatmapAnalysisService.getDefaultQuery(heatmap.id)
  shareForm.shareName = `${heatmap.name}分享`
  shareResultUrl.value = ''
  shareQrText.value = ''
  showShareModal.value = true
}

async function openDashboardForHeatmap(heatmap: HeatmapListItem) {
  activeHeatmap.value = heatmap
  query.value = await heatmapAnalysisService.getDefaultQuery(heatmap.id)
  dashboardForm.title = `${heatmap.name}组件`
  showDashboardModal.value = true
}

async function copyHeatmap(heatmap: HeatmapListItem) {
  const response = await heatmapAnalysisService.copyHeatmap(heatmap.id)
  notice.value = response.message
  await loadHeatmaps()
}

function openRenameHeatmap(heatmap: HeatmapListItem) {
  pendingRenameHeatmap.value = heatmap
  renameForm.name = heatmap.name
  showRenameModal.value = true
}

async function confirmRenameHeatmap() {
  if (!pendingRenameHeatmap.value) {
    return
  }

  const response = await heatmapAnalysisService.renameHeatmap(pendingRenameHeatmap.value.id, renameForm.name)
  notice.value = response.message
  showRenameModal.value = false
  pendingRenameHeatmap.value = null
  await loadHeatmaps()
}

function askDeleteHeatmap(heatmap: HeatmapListItem) {
  pendingDeleteHeatmap.value = heatmap
  showDeleteModal.value = true
}

async function confirmDeleteHeatmap() {
  if (!pendingDeleteHeatmap.value) {
    return
  }
  const response = await heatmapAnalysisService.deleteHeatmap(pendingDeleteHeatmap.value.id)
  notice.value = response.message
  showDeleteModal.value = false
  pendingDeleteHeatmap.value = null
  pageState.value = 'list'
  await loadHeatmaps()
}

async function setDefaultVersion(versionId: string) {
  if (!activeHeatmap.value || !query.value) {
    return
  }
  const response = await heatmapAnalysisService.setDefaultVersion(activeHeatmap.value.id, versionId)
  notice.value = response.message
  query.value.versionId = versionId
  await runQuery()
}

function compareWithVersion(versionId: string) {
  if (!query.value) {
    return
  }
  query.value.mode = 'comparison'
  query.value.comparison.leftVersionId = versionId
  showVersionDrawer.value = false
  runQuery()
}

async function viewVersion(versionId: string) {
  if (!query.value) {
    return
  }

  query.value.versionId = versionId
  showVersionDrawer.value = false
  await runQuery()
}

async function createVersion() {
  if (!activeHeatmap.value) {
    return
  }
  const payload = {
    versionName: newVersionForm.versionName,
    versionDesc: newVersionForm.versionDesc,
    baseUrl: newVersionForm.baseUrl,
    validStartTime: newVersionForm.validStartTime,
    validEndTime: newVersionForm.validEndTime,
    setDefault: newVersionForm.setDefault,
  }
  const response = editingVersionId.value
    ? await heatmapAnalysisService.updateVersion(activeHeatmap.value.id, editingVersionId.value, payload)
    : await heatmapAnalysisService.createVersion(activeHeatmap.value.id, payload)
  notice.value = response.message
  showNewVersionModal.value = false
  editingVersionId.value = ''
  await runQuery()
}

function openCreateVersionModal() {
  editingVersionId.value = ''
  newVersionForm.versionName = '新版首页实验版'
  newVersionForm.versionDesc = '新增会员权益横幅和赛事直播入口。'
  newVersionForm.baseUrl = result.value?.currentVersion.baseUrl ?? 'https://www.yangshipin.cn'
  newVersionForm.validStartTime = '2026-05-21 00:00:00'
  newVersionForm.validEndTime = ''
  newVersionForm.setDefault = false
  showNewVersionModal.value = true
}

function editVersion(row: HeatmapVersion) {
  editingVersionId.value = row.id
  newVersionForm.versionName = row.versionName
  newVersionForm.versionDesc = row.versionDesc
  newVersionForm.baseUrl = row.baseUrl
  newVersionForm.validStartTime = row.validStartTime ?? ''
  newVersionForm.validEndTime = row.validEndTime ?? ''
  newVersionForm.setDefault = row.isDefault
  showNewVersionModal.value = true
}

async function copyVersion(row: HeatmapVersion) {
  if (!activeHeatmap.value) {
    return
  }
  const response = await heatmapAnalysisService.copyVersion(activeHeatmap.value.id, row.id)
  notice.value = response.message
  await runQuery()
}

async function archiveVersion(row: HeatmapVersion) {
  if (!activeHeatmap.value) {
    return
  }
  const response = await heatmapAnalysisService.archiveVersion(activeHeatmap.value.id, row.id)
  notice.value = response.message
  await runQuery()
}

async function saveAnalysis() {
  if (!query.value) {
    return
  }
  syncUserFilterText()
  syncComparisonConfig()
  const response = await heatmapAnalysisService.saveAnalysis({
    name: saveAnalysisForm.name,
    folder: saveAnalysisForm.folder,
    description: saveAnalysisForm.description,
    favorite: saveAnalysisForm.favorite,
    config: query.value,
  })
  showSaveAnalysisModal.value = false
  notice.value = response.message
}

async function saveToDashboard() {
  if (!query.value) {
    return
  }
  syncUserFilterText()
  syncComparisonConfig()
  const response = await heatmapAnalysisService.saveToDashboard({
    title: dashboardForm.title,
    dashboard: dashboardForm.dashboard,
    widgetType: dashboardForm.widgetType,
    refreshPolicy: dashboardForm.refreshPolicy,
    timeRangePolicy: dashboardForm.timeRangePolicy,
    size: dashboardForm.size,
    config: query.value,
  })
  showDashboardModal.value = false
  notice.value = response.message
}

async function shareHeatmap() {
  if (!query.value) {
    return
  }
  syncUserFilterText()
  syncComparisonConfig()
  const response = await heatmapAnalysisService.shareHeatmap({
    shareName: shareForm.shareName,
    scope: shareForm.scope,
    specifiedTargets: shareForm.scope === 'specified' ? shareForm.specifiedTargets : undefined,
    expiresInDays: shareForm.expiresInDays,
    allowUserList: shareForm.allowUserList,
    allowCopy: shareForm.allowCopy,
    passwordEnabled: shareForm.passwordEnabled,
    password: shareForm.password,
    config: query.value,
  })
  shareResultUrl.value = response.shareUrl ?? ''
  shareQrText.value = response.qrCodeText ?? ''
  notice.value = `${response.message}${response.shareUrl ? ` ${response.shareUrl}` : ''}`
}

function exportHeatmapImage() {
  notice.value = '已导出当前热图截图（Demo）。'
}

function openOriginalPage() {
  const url = result.value?.currentVersion.baseUrl || activeHeatmap.value?.pageGroup?.baseUrl
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

function simulateMobileScan() {
  mobileSessionStatus.value = 'opening_app'
  window.setTimeout(() => {
    mobileSessionStatus.value = 'connected'
  }, 500)
}

function syncMobilePage() {
  mobileSessionStatus.value = 'connected'
  notice.value = '已同步手机当前页面快照。'
}

function showMobileHeatmap() {
  mobileSessionStatus.value = 'page_changed'
  notice.value = '已渲染移动端历史点击热区，可保存为热力图。'
}

function backToList() {
  pageState.value = 'list'
  result.value = null
  activeHeatmap.value = null
}

onMounted(async () => {
  await loadHeatmaps()
  await refreshPreview()
})
</script>

<template>
  <div class="heatmap-page">
    <div class="page-header">
      <div>
        <h1>热力图分析</h1>
        <p>将网页或 App 页面上的点击、误点、触达和改版差异叠加到底图上，定位真实用户行为。</p>
      </div>
      <n-space>
        <n-button v-if="pageState !== 'list'" @click="backToList">返回列表</n-button>
        <n-button @click="showSaveAnalysisModal = true" :disabled="!query">保存分析</n-button>
        <n-button @click="showDashboardModal = true" :disabled="!query">保存到看板</n-button>
        <n-button @click="showShareModal = true" :disabled="!query">分享</n-button>
        <n-button v-if="pageState === 'list'" type="primary" @click="showCreateTypeModal = true">新增热力图</n-button>
        <n-button v-else type="primary" :loading="detailLoading" @click="runQuery">刷新</n-button>
      </n-space>
    </div>

    <n-alert v-if="notice" class="status-alert" type="success" closable @close="notice = ''">
      {{ notice }}
    </n-alert>

    <template v-if="pageState === 'list'">
      <n-card class="filter-card">
        <div class="list-filter-grid">
          <n-input v-model:value="listFilter.keyword" clearable placeholder="搜索热力图名称、描述" @update:value="updateListFilter" />
          <n-select v-model:value="listFilter.platform" :options="platformOptions" @update:value="updateListFilter" />
          <n-select v-model:value="listFilter.analysisType" :options="analysisTypeOptions" @update:value="updateListFilter" />
          <n-select v-model:value="listFilter.creator" :options="creatorOptions" @update:value="updateListFilter" />
          <n-date-picker
            type="daterange"
            clearable
            :value="listUpdatedRange"
            placeholder="更新时间"
            @update:value="updateListDateRange"
          />
          <n-select v-model:value="listFilter.sortBy" :options="sortOptions" @update:value="updateListFilter" />
          <n-select v-model:value="listTrendMetric" :options="listTrendMetricOptions" />
        </div>
      </n-card>

      <n-spin :show="listLoading">
        <div class="heatmap-grid">
          <n-card v-for="heatmap in pagedHeatmaps" :key="heatmap.id" class="heatmap-card">
            <div class="card-header">
              <div>
                <h3>{{ heatmap.name }}</h3>
                <p>{{ heatmap.pageGroup?.baseUrl || '移动端快照' }}</p>
              </div>
              <n-tag :type="heatmap.platform === 'web' ? 'success' : 'info'">
                {{ heatmap.platform === 'web' ? '网页端' : '移动端' }}
              </n-tag>
            </div>
            <div class="mode-chip-row">
              <n-button
                v-for="type in heatmap.analysisTypes.slice(0, 5)"
                :key="type"
                size="tiny"
                secondary
                @click.stop="openListAnalysis(heatmap, type)"
              >
                {{ typeLabel(type) }}
              </n-button>
            </div>
            <div class="metric-row">
              <div>
                <span>PV</span>
                <strong>{{ formatNumber(heatmap.yesterday.pv) }}</strong>
                <em>{{ getMetricChange(heatmap.yesterday.pv, heatmap.previousDay.pv) }}</em>
              </div>
              <div>
                <span>UV</span>
                <strong>{{ formatNumber(heatmap.yesterday.uv) }}</strong>
                <em>{{ getMetricChange(heatmap.yesterday.uv, heatmap.previousDay.uv) }}</em>
              </div>
              <div>
                <span>点击数</span>
                <strong>{{ formatNumber(heatmap.yesterday.clickCount) }}</strong>
                <em>{{ getMetricChange(heatmap.yesterday.clickCount, heatmap.previousDay.clickCount) }}</em>
              </div>
              <div>
                <span>跳出率</span>
                <strong>{{ formatPercent(heatmap.yesterday.bounceRate) }}</strong>
                <em>{{ getMetricChange(heatmap.yesterday.bounceRate, heatmap.previousDay.bounceRate) }}</em>
              </div>
              <div>
                <span>平均停留</span>
                <strong>{{ formatSeconds(heatmap.yesterday.avgStaySeconds) }}</strong>
                <em>{{ getMetricChange(heatmap.yesterday.avgStaySeconds, heatmap.previousDay.avgStaySeconds) }}</em>
              </div>
            </div>
            <div class="card-trend">
              <div class="list-meta">近 7 日 {{ trendMetricLabel(listTrendMetric) }} 趋势</div>
              <v-chart class="mini-trend-chart" :option="listTrendOption(heatmap)" autoresize />
            </div>
            <div class="card-footer">
              <span>默认版本：{{ heatmap.currentVersionName }} · 更新于 {{ heatmap.updatedAt }}</span>
              <n-space>
                <n-button text type="primary" @click="openDetail(heatmap)">查看</n-button>
                <n-button text @click="openComparison(heatmap)">对比</n-button>
                <n-button text @click="openDashboardForHeatmap(heatmap)">保存到看板</n-button>
                <n-button text @click="copyHeatmap(heatmap)">复制</n-button>
                <n-button text @click="openRenameHeatmap(heatmap)">重命名</n-button>
                <n-button text @click="openShareForHeatmap(heatmap)">分享</n-button>
                <n-button text type="error" @click="askDeleteHeatmap(heatmap)">删除</n-button>
              </n-space>
            </div>
          </n-card>
        </div>
        <n-empty v-if="!listDateFilteredHeatmaps.length" class="empty-block" description="当前条件下暂无热力图，请调整筛选或新建热力图。" />
        <div class="list-pagination">
          <span>共 {{ listDateFilteredHeatmaps.length }} 个热力图</span>
          <n-pagination
            v-model:page="listPage"
            v-model:page-size="listPageSize"
            :item-count="listDateFilteredHeatmaps.length"
            :page-sizes="[6, 12, 18]"
            show-size-picker
          />
        </div>
      </n-spin>
    </template>

    <template v-else-if="pageState === 'mobile_create'">
      <div class="mobile-create-layout">
        <n-card title="移动端热力图配置">
          <div class="mobile-status">
            {{ mobileSessionStatus === 'waiting_scan' ? '请使用手机扫码' : mobileSessionStatus === 'opening_app' ? '正在唤起 App' : mobileSessionStatus === 'connected' ? '手机界面已连接' : '手机界面已经发生变化，点击同步当前页面' }}
          </div>
          <div class="qr-box">Demo QR</div>
          <n-space>
            <n-button @click="simulateMobileScan">模拟扫码</n-button>
            <n-button @click="syncMobilePage">同步当前页面</n-button>
            <n-button type="primary" @click="showMobileHeatmap">显示热图</n-button>
          </n-space>
        </n-card>
        <n-card title="手机页面预览">
          <div class="phone-preview">
            <div class="phone-top">小游戏结算页</div>
            <div class="reward-card">奖励领取</div>
            <div class="phone-hotspot"></div>
            <div class="phone-actions">再来一局 · 看广告翻倍</div>
          </div>
        </n-card>
        <n-card title="保存热图">
          <div class="modal-form">
            <label>热图名称</label>
            <n-input v-model:value="mobileForm.name" />
            <label>页面名称</label>
            <n-input v-model:value="mobileForm.pageName" />
            <label>Scheme</label>
            <n-input v-model:value="mobileForm.scheme" />
            <n-button type="primary" @click="createMobileHeatmap">保存并查看</n-button>
          </div>
        </n-card>
      </div>
    </template>

    <template v-else>
      <n-spin :show="detailLoading">
        <div v-if="result && query" class="detail-layout">
          <n-card class="detail-header-card">
            <div class="detail-header">
              <div>
                <h2>{{ result.heatmap.name }}</h2>
                <p>
                  {{ result.heatmap.platform === 'web' ? '网页端' : '移动端' }} ·
                  当前版本：{{ result.currentVersion.versionName }} ·
                  最近更新：{{ result.heatmap.updatedAt }}
                </p>
              </div>
              <n-space>
                <n-button @click="showVersionDrawer = true">版本管理</n-button>
                <n-button @click="openOriginalPage">在原页面打开</n-button>
                <n-button @click="showShareModal = true">分享</n-button>
              </n-space>
            </div>
          </n-card>

          <n-card class="query-card">
            <div class="query-grid">
              <label>时间范围</label>
              <n-select v-model:value="query.dateRange.value" :options="dateRangeOptions" @update:value="(value) => syncQuickDateRange(String(value))" />
              <label v-if="query.dateRange.value === 'custom'">自定义</label>
              <n-date-picker
                v-if="query.dateRange.value === 'custom'"
                type="daterange"
                :value="customDateRange"
                @update:value="updateCustomDateRange"
              />
              <label>页面版本</label>
              <n-select v-model:value="query.versionId" :options="versionOptions" />
              <label>设备</label>
              <n-select v-model:value="query.deviceType" :options="deviceOptions" />
              <label>浏览器</label>
              <n-select v-model:value="query.browser" :options="browserOptions" />
              <label>操作系统</label>
              <n-select v-model:value="query.os" :options="osOptions" />
              <n-button type="primary" @click="runQuery">查询</n-button>
            </div>
            <div class="detail-filter-panel">
              <div class="detail-filter-header">
                <div>
                  <strong>用户属性过滤</strong>
                  <span>{{ query.userFilterText || '未配置用户过滤，默认分析全部用户。' }}</span>
                </div>
                <n-button @click="addUserFilter">+ 添加条件</n-button>
              </div>
              <div
                v-for="(filter, index) in detailUserFilters"
                :key="filter.id"
                class="detail-filter-row"
              >
                <n-select
                  v-if="index > 0"
                  v-model:value="filter.relation"
                  :options="[
                    { label: 'AND', value: 'AND' },
                    { label: 'OR', value: 'OR' },
                  ]"
                  @update:value="syncUserFilterText"
                />
                <span v-else class="relation-placeholder">首个条件</span>
                <n-select v-model:value="filter.source" :options="userFilterSourceOptions" @update:value="syncUserFilterText" />
                <n-select v-model:value="filter.field" :options="userFilterFieldOptions" @update:value="syncUserFilterText" />
                <n-select v-model:value="filter.operator" :options="userFilterOperatorOptions" @update:value="syncUserFilterText" />
                <n-input v-model:value="filter.value" placeholder="筛选值" @update:value="syncUserFilterText" />
                <n-button text type="error" @click="removeUserFilter(filter.id)">删除</n-button>
              </div>
            </div>
          </n-card>

          <div class="mode-row">
            <n-radio-group v-model:value="query.mode" @update:value="runQuery">
              <n-radio-button value="click_heatmap">点击热图</n-radio-button>
              <n-radio-button value="point_heatmap">点位云图</n-radio-button>
              <n-radio-button value="reach_heatmap">触达率图</n-radio-button>
              <n-radio-button value="comparison">改版对比</n-radio-button>
            </n-radio-group>
          </div>

          <div class="summary-grid">
            <n-card>
              <span>人数 UV</span>
              <strong>{{ formatNumber(result.summary.uv) }}</strong>
            </n-card>
            <n-card>
              <span>浏览量 PV</span>
              <strong>{{ formatNumber(result.summary.pv) }}</strong>
            </n-card>
            <n-card>
              <span>点击数</span>
              <strong>{{ formatNumber(result.summary.clickCount) }}</strong>
            </n-card>
            <n-card>
              <span>跳出率</span>
              <strong>{{ formatPercent(result.summary.bounceRate) }}</strong>
            </n-card>
            <n-card>
              <span>平均停留</span>
              <strong>{{ formatSeconds(result.summary.avgStaySeconds) }}</strong>
            </n-card>
            <n-card>
              <span>平均触达深度</span>
              <strong>{{ formatPercent(result.summary.avgReachDepth) }}</strong>
            </n-card>
            <n-card>
              <span>首屏可见时长</span>
              <strong>{{ formatSeconds(result.summary.firstScreenVisibleSeconds) }}</strong>
            </n-card>
            <n-card>
              <span>页面点击率</span>
              <strong>{{ formatPercent(result.summary.pageClickRate) }}</strong>
            </n-card>
          </div>

          <n-alert v-if="result.warnings.length" type="warning">
            <div v-for="warning in result.warnings" :key="warning">{{ warning }}</div>
          </n-alert>

          <div v-if="query.mode !== 'comparison'" class="analysis-workbench">
            <n-card class="rank-card">
              <div class="section-header">
                <div>
                  <h3>{{ query.mode === 'reach_heatmap' ? '触达分段' : query.mode === 'point_heatmap' ? '点位排行' : '元素分布' }}</h3>
                  <p>点击排行或分段后，下方热图会同步高亮。</p>
                </div>
                <n-space>
                  <template v-if="query.mode === 'point_heatmap'">
                    <n-select v-model:value="query.pointGranularity" class="small-select" :options="pointGranularityOptions" @update:value="runQuery" />
                    <n-switch v-model:value="abnormalPointOnly" @update:value="resetPointFilter" />仅异常点
                  </template>
                  <template v-if="query.mode === 'reach_heatmap'">
                    <n-select v-model:value="query.reachSectionType" class="small-select" :options="reachSectionTypeOptions" @update:value="runQuery" />
                  </template>
                  <n-select v-model:value="query.sortMetric" class="small-select" :options="[
                    { label: '点击次数', value: 'click_count' },
                    { label: '点击用户数', value: 'click_user_count' },
                    { label: '点击率', value: 'click_rate' },
                    { label: '点击比', value: 'click_share' },
                    { label: '曝光点击率', value: 'exposure_click_rate' },
                  ]" @update:value="runQuery" />
                  <n-input-number v-model:value="query.topN" class="tiny-input" :min="5" :max="50" @update:value="runQuery" />
                </n-space>
              </div>
              <v-chart v-if="query.mode === 'click_heatmap'" class="rank-chart" :option="elementRankOption" autoresize @click="handleElementRankChartClick" />
              <div v-if="query.mode === 'click_heatmap'" class="rank-list">
                <button
                  v-for="element in rankElements"
                  :key="element.elementKey"
                  :class="{ active: selectedElementKey === element.elementKey }"
                  @click="selectElement(element)"
                >
                  <span>{{ element.rank }}. {{ element.elementText }}</span>
                  <strong>{{ formatNumber(element.clickCount) }}</strong>
                </button>
              </div>
              <div v-else-if="query.mode === 'point_heatmap'" class="rank-list">
                <button
                  v-for="point in displayedPoints"
                  :key="point.id"
                  :class="{ active: selectedPointId === point.id }"
                  @click="selectPoint(point)"
                >
                  <span>{{ point.elementText || '空白点位' }}</span>
                  <strong>
                    {{ formatNumber(point.count) }}
                    <n-tag v-if="point.anomalyType" size="small" type="error">{{ point.anomalyType }}</n-tag>
                  </strong>
                </button>
              </div>
              <div v-else class="rank-list">
                <button
                  v-for="section in activeReachSections"
                  :key="section.sectionIndex"
                  :class="{ active: selectedReachIndex === section.sectionIndex }"
                  @click="selectReach(section)"
                >
                  <span>{{ section.sectionName }}</span>
                  <strong>{{ formatPercent(section.reachRate) }}</strong>
                </button>
              </div>
            </n-card>

            <n-card class="renderer-card">
              <div class="toolbar">
                <n-space align="center">
                  <n-select v-model:value="query.mode" class="small-select" :options="modeOptions" @update:value="runQuery" />
                  <span>透明度</span>
                  <n-slider v-model:value="query.overlayOpacity" class="opacity-slider" :min="0" :max="1" :step="0.05" />
                  <n-switch v-model:value="query.showClickableElements" />显示可点击元素
                  <n-switch v-model:value="query.hideHeatLayer" />隐藏热图
                  <n-button @click="runQuery">刷新热图</n-button>
                  <n-button @click="openOriginalPage">原页面</n-button>
                  <n-button @click="showFullscreenModal = true">全屏</n-button>
                  <n-button @click="exportHeatmapImage">截图</n-button>
                  <n-button @click="showHelpModal = true">帮助</n-button>
                </n-space>
              </div>
              <div class="heatmap-renderer">
                <div class="mock-page">
                  <div class="site-nav">央视频 · 搜索 · 登录</div>
                  <div class="hero">焦点直播卡片</div>
                  <div class="banner">会员权益横幅</div>
                  <div class="content-grid">
                    <div>推荐内容</div>
                    <div>短视频推荐</div>
                    <div>体育赛事</div>
                  </div>
                  <div class="footer-zone">底部内容与空白区域</div>
                </div>

                <template v-if="!query.hideHeatLayer && query.mode === 'click_heatmap'">
                  <button
                    v-for="element in activeElements"
                    :key="element.elementKey"
                    class="element-hotspot"
                    :class="{ selected: selectedElementKey === element.elementKey, misclick: !element.isClickable }"
                    :style="{
                      left: `${element.x}%`,
                      top: `${element.y}%`,
                      width: `${element.width}%`,
                      height: `${element.height}%`,
                      opacity: query.overlayOpacity,
                    }"
                    :title="`${element.elementText}｜点击 ${formatNumber(element.clickCount)}｜点击率 ${formatPercent(element.clickRate)}｜点击比 ${formatPercent(element.clickShare)}｜${element.isClickable ? '可点击' : '不可点击误点'}`"
                    @click="selectElement(element)"
                  >
                    <span>{{ element.elementText }}</span>
                  </button>
                  <template v-if="query.showClickableElements">
                    <div
                      v-for="element in activeElements.filter((item) => item.isClickable)"
                      :key="`${element.elementKey}-outline`"
                      class="clickable-outline"
                      :style="{ left: `${element.x}%`, top: `${element.y}%`, width: `${element.width}%`, height: `${element.height}%` }"
                    />
                  </template>
                </template>

                <template v-if="!query.hideHeatLayer && query.mode === 'point_heatmap'">
                  <button
                    v-for="point in displayedPoints"
                    :key="point.id"
                    class="click-point"
                    :class="{ selected: selectedPointId === point.id, abnormal: point.anomalyType }"
                    :style="{
                      left: `${point.x}%`,
                      top: `${point.y}%`,
                      width: `${Math.min(56, 14 + Math.log(point.count + 1) * 5)}px`,
                      height: `${Math.min(56, 14 + Math.log(point.count + 1) * 5)}px`,
                      opacity: query.overlayOpacity,
                    }"
                    :title="`${point.elementText || '空白点位'}｜点击 ${formatNumber(point.count)}｜用户 ${formatNumber(point.userCount)}｜${point.anomalyType || '正常'}`"
                    @click="selectPoint(point)"
                  />
                </template>

                <template v-if="!query.hideHeatLayer && query.mode === 'reach_heatmap'">
                  <button
                    v-for="section in activeReachSections"
                    :key="section.sectionIndex"
                    class="reach-section"
                    :class="{ selected: selectedReachIndex === section.sectionIndex }"
                    :style="{
                      top: `${section.startY}%`,
                      height: `${section.endY - section.startY}%`,
                      opacity: Math.max(0.22, section.reachRate * query.overlayOpacity),
                    }"
                    @click="selectReach(section)"
                  >
                    {{ section.sectionName }} · {{ formatPercent(section.reachRate) }} · 点击 {{ formatNumber(section.clickCount) }}
                  </button>
                </template>
              </div>
              <div class="element-detail">
                <template v-if="query.mode === 'click_heatmap' && selectedElement">
                  <strong>{{ selectedElement.elementText }}</strong>
                  <span>事件：{{ selectedElement.eventDesc }}</span>
                  <span>点击次数：{{ formatNumber(selectedElement.clickCount) }}</span>
                  <span>点击用户：{{ formatNumber(selectedElement.clickUserCount) }}</span>
                  <span>点击率：{{ formatPercent(selectedElement.clickRate) }}</span>
                  <span>点击比：{{ formatPercent(selectedElement.clickShare) }}</span>
                  <span>曝光点击率：{{ formatPercent(selectedElement.exposureClickRate) }}</span>
                  <n-button type="primary" @click="openClickedUsers">查看点击用户</n-button>
                </template>
                <template v-else-if="query.mode === 'point_heatmap' && selectedPoint">
                  <strong>{{ selectedPoint.elementText || '空白点位' }}</strong>
                  <span>点击次数：{{ formatNumber(selectedPoint.count) }}</span>
                  <span>点击用户：{{ formatNumber(selectedPoint.userCount) }}</span>
                  <span>平均点击时间：{{ selectedPoint.avgClickSecond }} 秒</span>
                  <span>异常：{{ selectedPoint.anomalyType || '无' }}</span>
                  <n-button type="primary" @click="openClickedUsers">查看点击用户</n-button>
                </template>
                <template v-else-if="selectedReach">
                  <strong>{{ selectedReach.sectionName }}</strong>
                  <span>触达用户：{{ formatNumber(selectedReach.reachUserCount) }}</span>
                  <span>触达率：{{ formatPercent(selectedReach.reachRate) }}</span>
                  <span>平均停留：{{ (selectedReach.avgStayMs / 1000).toFixed(1) }} 秒</span>
                  <span>点击次数：{{ formatNumber(selectedReach.clickCount) }}</span>
                  <n-button type="primary" @click="openClickedUsers">查看触达用户</n-button>
                </template>
              </div>
            </n-card>
          </div>

          <n-card v-else title="改版前后对比">
            <div class="comparison-config rich-comparison-config">
              <label>A 版本</label>
              <n-select v-model:value="query.comparison.leftVersionId" :options="versionOptions" />
              <label>A 时间</label>
              <n-date-picker
                type="daterange"
                :value="comparisonForm.leftDateRange"
                @update:value="updateComparisonLeftDateRange"
              />
              <label>A 设备</label>
              <n-select v-model:value="comparisonForm.leftDevice" :options="deviceOptions" />
              <label>A 用户</label>
              <n-input v-model:value="comparisonForm.leftUserFilterText" clearable placeholder="例如：用户标签.金币余额等级 等于 低金币" />
              <label>B 版本</label>
              <n-select v-model:value="query.comparison.rightVersionId" :options="versionOptions" />
              <label>B 时间</label>
              <n-date-picker
                type="daterange"
                :value="comparisonForm.rightDateRange"
                @update:value="updateComparisonRightDateRange"
              />
              <label>B 设备</label>
              <n-select v-model:value="comparisonForm.rightDevice" :options="deviceOptions" />
              <label>B 用户</label>
              <n-input v-model:value="comparisonForm.rightUserFilterText" clearable placeholder="例如：用户标签.活跃等级 等于 高活跃" />
              <label>展示方式</label>
              <n-select v-model:value="query.comparison.viewMode" :options="comparisonViewModeOptions" />
              <n-checkbox v-model:checked="comparisonForm.syncMode">左右热图滚动同步</n-checkbox>
              <n-button type="primary" @click="runQuery">查询对比</n-button>
            </div>
            <div v-if="query.comparison.viewMode === 'side_by_side'" class="comparison-renderer">
              <div>
                <h4>版本 A</h4>
                <div class="mini-heatmap before">改版前热区</div>
              </div>
              <div>
                <h4>版本 B</h4>
                <div class="mini-heatmap after">改版后热区</div>
              </div>
            </div>
            <div v-else-if="query.comparison.viewMode === 'overlay_diff'" class="comparison-renderer comparison-full">
              <div>
                <h4>叠加差异</h4>
                <div class="mini-heatmap diff">绿色表示点击提升，红色表示点击下降</div>
              </div>
            </div>
            <n-alert v-else type="info" class="comparison-mode-alert">
              当前以{{ query.comparison.viewMode === 'metric_table' ? '指标对比表' : '排名变化表' }}展示改版差异，下方表格会突出点击数、点击率和排名变化。
            </n-alert>
            <n-data-table :columns="comparisonColumns" :data="result.comparisonRows" :pagination="{ pageSize: 6 }" />
          </n-card>
        </div>
        <n-empty v-else description="请选择一个热力图查看详情。" />
      </n-spin>
    </template>

    <n-modal v-model:show="showCreateTypeModal" preset="card" title="新增热力图" class="small-modal">
      <div class="type-grid">
        <button @click="showCreateTypeModal = false; showWebCreateDrawer = true; refreshPreview()">
          <strong>网页端</strong>
          <span>通过 URL 和页面规则创建合并页面，支持点击、点位、触达和改版对比。</span>
        </button>
        <button @click="showCreateTypeModal = false; pageState = 'mobile_create'">
          <strong>移动端</strong>
          <span>通过二维码扫码唤起 App，同步手机页面快照并保存热图。</span>
        </button>
      </div>
    </n-modal>

    <n-drawer v-model:show="showWebCreateDrawer" width="760">
      <n-drawer-content title="创建网页端热力图">
        <div class="drawer-form">
          <h3>1. 基础信息</h3>
          <label>热力图名称</label>
          <n-input v-model:value="webCreateForm.name" maxlength="50" />
          <label>底图地址</label>
          <n-input v-model:value="webCreateForm.baseUrl" @blur="parseWebUrl" />
          <label>版本名称</label>
          <n-input v-model:value="webCreateForm.versionName" />
          <label>版本说明</label>
          <n-input v-model:value="webCreateForm.versionDesc" type="textarea" />
          <label>备注</label>
          <n-input v-model:value="webCreateForm.description" type="textarea" />

          <h3>2. 页面定义方式</h3>
          <n-radio-group v-model:value="webCreateForm.definitionType">
            <n-radio-button value="url">按 URL</n-radio-button>
            <n-radio-button value="title">按标题</n-radio-button>
          </n-radio-group>

          <template v-if="webCreateForm.definitionType === 'url'">
            <label>域名</label>
            <n-input v-model:value="webCreateForm.domain" disabled />
            <label>页面路径</label>
            <n-input v-model:value="webCreateForm.pagePath" />
            <label>查询参数</label>
            <n-select v-model:value="webCreateForm.queryOperator" :options="[
              { label: '任意', value: 'any' },
              { label: '为空', value: 'empty' },
              { label: '等于', value: 'equals' },
              { label: '包含', value: 'contains' },
              { label: '正则', value: 'regex' },
            ]" />
            <n-input v-model:value="webCreateForm.queryValue" />
          </template>
          <template v-else>
            <label>标题匹配方式</label>
            <n-select v-model:value="webCreateForm.titleOperator" :options="titleOperatorOptions" />
            <label>页面标题</label>
            <n-input v-model:value="webCreateForm.pageTitle" />
          </template>

          <h3>3. Hash 匹配</h3>
          <n-checkbox v-model:checked="webCreateForm.hashEnabled">启用 Hash 匹配</n-checkbox>
          <n-input v-if="webCreateForm.hashEnabled" v-model:value="webCreateForm.hashPath" placeholder="Hash 路径，例如 /comment" />
          <n-input v-if="webCreateForm.hashEnabled" v-model:value="webCreateForm.hashQueryValue" placeholder="Hash 参数，例如 tab=hot" />

          <h3>4. 支持分析类型</h3>
          <div class="checkbox-grid">
            <n-checkbox v-model:checked="webCreateForm.clickHeatmap">点击热图</n-checkbox>
            <n-checkbox v-model:checked="webCreateForm.pointHeatmap">点位云图</n-checkbox>
            <n-checkbox v-model:checked="webCreateForm.reachHeatmap">触达率图</n-checkbox>
            <n-checkbox v-model:checked="webCreateForm.comparison">改版对比</n-checkbox>
            <n-checkbox v-model:checked="webCreateForm.clickedUsers">点击用户列表</n-checkbox>
          </div>

          <h3>5. 近 48 小时 PV 校验</h3>
          <n-spin :show="previewLoading">
            <div class="preview-panel">
              <v-chart class="preview-chart" :option="previewOption" autoresize />
              <n-alert type="success">规则已匹配 8 个页面，近 48 小时有稳定 PV，可保存。</n-alert>
            </div>
          </n-spin>
        </div>
        <template #footer>
          <n-space justify="end">
            <n-button @click="showWebCreateDrawer = false">取消</n-button>
            <n-button @click="refreshPreview">重新校验</n-button>
            <n-button type="primary" @click="createWebHeatmap">保存并查看</n-button>
          </n-space>
        </template>
      </n-drawer-content>
    </n-drawer>

    <n-drawer v-model:show="showUserDrawer" width="900">
      <n-drawer-content title="点击用户列表">
        <div class="user-drawer-header">
          <div>
            <strong>{{ selectedElement?.elementText || selectedPoint?.elementText || '选中点位' }}</strong>
            <p>点击次数 {{ formatNumber(selectedElement?.clickCount || selectedPoint?.count || 0) }} · 用户 {{ formatNumber(selectedElement?.clickUserCount || selectedPoint?.userCount || 0) }}</p>
          </div>
          <n-space>
            <n-input v-model:value="clickedUserKeyword" clearable placeholder="搜索用户 ID" @update:value="refreshClickedUsers" />
            <n-switch v-model:value="abnormalOnly" @update:value="refreshClickedUsers" />只看异常
          </n-space>
        </div>
        <n-data-table :columns="clickedUserColumns" :data="clickedUsers" :pagination="{ pageSize: 8 }" :scroll-x="1300" />
      </n-drawer-content>
    </n-drawer>

    <n-drawer v-model:show="showVersionDrawer" width="900">
      <n-drawer-content title="热图版本管理">
        <n-space class="drawer-actions">
          <n-button type="primary" @click="openCreateVersionModal">新建版本</n-button>
        </n-space>
        <n-data-table :columns="versionColumns" :data="result?.versions ?? []" :pagination="{ pageSize: 8 }" :scroll-x="1600" />
      </n-drawer-content>
    </n-drawer>

    <n-modal v-model:show="showRenameModal" preset="card" title="重命名热力图" class="small-modal">
      <div class="modal-form">
        <label>原名称</label>
        <n-input :value="pendingRenameHeatmap?.name ?? ''" readonly />
        <label>新名称</label>
        <n-input v-model:value="renameForm.name" maxlength="50" />
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showRenameModal = false">取消</n-button>
          <n-button type="primary" @click="confirmRenameHeatmap">确认修改</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showNewVersionModal" preset="card" :title="editingVersionId ? '编辑热图版本' : '新建热图版本'" class="form-modal">
      <div class="modal-form">
        <label>版本名称</label>
        <n-input v-model:value="newVersionForm.versionName" />
        <label>底图地址 / 截图</label>
        <n-input v-model:value="newVersionForm.baseUrl" />
        <label>生效开始时间</label>
        <n-input v-model:value="newVersionForm.validStartTime" />
        <label>生效结束时间</label>
        <n-input v-model:value="newVersionForm.validEndTime" placeholder="可为空" />
        <label>版本说明</label>
        <n-input v-model:value="newVersionForm.versionDesc" type="textarea" />
        <n-checkbox v-model:checked="newVersionForm.setDefault">设为默认版本</n-checkbox>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showNewVersionModal = false">取消</n-button>
          <n-button type="primary" @click="createVersion">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showShareModal" preset="card" title="分享热力图" class="form-modal">
      <div class="modal-form">
        <label>分享名称</label>
        <n-input v-model:value="shareForm.shareName" />
        <label>分享范围</label>
        <n-select v-model:value="shareForm.scope" :options="[
          { label: '仅自己', value: 'private' },
          { label: '项目内成员', value: 'project' },
          { label: '指定成员', value: 'specified' },
          { label: '公开链接', value: 'public' },
        ]" />
        <template v-if="shareForm.scope === 'specified'">
          <label>指定成员 / 团队</label>
          <n-select
            v-model:value="shareForm.specifiedTargets"
            multiple
            filterable
            :options="shareTargetOptions"
            placeholder="搜索并选择可访问成员或团队"
          />
        </template>
        <label>有效期</label>
        <n-select v-model:value="shareForm.expiresInDays" :options="[
          { label: '1 天', value: 1 },
          { label: '7 天', value: 7 },
          { label: '30 天', value: 30 },
        ]" />
        <n-checkbox v-model:checked="shareForm.allowUserList">允许查看用户列表</n-checkbox>
        <n-checkbox v-model:checked="shareForm.allowCopy">允许复制配置</n-checkbox>
        <n-checkbox v-model:checked="shareForm.passwordEnabled">访问密码</n-checkbox>
        <n-input v-if="shareForm.passwordEnabled" v-model:value="shareForm.password" placeholder="请输入访问密码" />
        <div class="qr-preview">{{ shareQrText || '二维码预览：HEATMAP SHARE' }}</div>
        <div v-if="shareResultUrl" class="share-result">
          <label>分享链接</label>
          <n-input :value="shareResultUrl" readonly />
          <span>复制该链接或二维码内容，即可按当前权限范围访问热力图。</span>
        </div>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showShareModal = false">取消</n-button>
          <n-button type="primary" @click="shareHeatmap">创建分享</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showSaveAnalysisModal" preset="card" title="保存分析" class="form-modal">
      <div class="modal-form">
        <label>名称</label>
        <n-input v-model:value="saveAnalysisForm.name" />
        <label>保存位置</label>
        <n-select v-model:value="saveAnalysisForm.folder" :options="[
          { label: '我的分析', value: '个人空间 / 我的分析' },
          { label: '团队分析', value: '团队空间 / 运营团队' },
        ]" />
        <label>描述</label>
        <n-input v-model:value="saveAnalysisForm.description" type="textarea" />
        <n-checkbox v-model:checked="saveAnalysisForm.favorite">设为常用</n-checkbox>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showSaveAnalysisModal = false">取消</n-button>
          <n-button type="primary" @click="saveAnalysis">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showDashboardModal" preset="card" title="保存到看板" class="form-modal">
      <div class="modal-form">
        <label>组件标题</label>
        <n-input v-model:value="dashboardForm.title" />
        <label>看板</label>
        <n-select v-model:value="dashboardForm.dashboard" :options="[
          { label: '个人空间 / 数据概览', value: '个人空间 / 数据概览' },
          { label: '团队空间 / 运营日报', value: '团队空间 / 运营日报' },
          { label: '公共空间 / 公司经营大盘', value: '公共空间 / 公司经营大盘' },
        ]" />
        <label>组件类型</label>
        <n-select v-model:value="dashboardForm.widgetType" :options="[
          { label: '指标卡片', value: 'heatmap_metric' },
          { label: '热力图快照', value: 'heatmap_snapshot' },
          { label: '元素排行', value: 'heatmap_rank' },
          { label: '触达率图', value: 'heatmap_reach' },
          { label: '改版对比', value: 'heatmap_comparison' },
          { label: '趋势图', value: 'heatmap_trend' },
        ]" />
        <label>刷新方式</label>
        <n-select v-model:value="dashboardForm.refreshPolicy" :options="[
          { label: '打开看板时刷新', value: 'open' },
          { label: '每小时刷新', value: 'hourly' },
          { label: '手动刷新', value: 'manual' },
          { label: '固定快照', value: 'snapshot' },
        ]" />
        <label>时间范围</label>
        <n-select v-model:value="dashboardForm.timeRangePolicy" :options="dashboardTimeRangePolicyOptions" />
        <label>组件尺寸</label>
        <n-select v-model:value="dashboardForm.size" :options="[
          { label: '中', value: 'medium' },
          { label: '大', value: 'large' },
        ]" />
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showDashboardModal = false">取消</n-button>
          <n-button type="primary" @click="saveToDashboard">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showFullscreenModal" preset="card" title="热图区全屏预览" class="fullscreen-modal">
      <div class="fullscreen-preview">
        <n-alert type="info">全屏模式会保留当前热图层、透明度、可点击元素描边和选中状态。</n-alert>
        <div class="mock-page fullscreen-mock-page">
          <div class="site-nav">央视频 · 全屏热图预览</div>
          <div class="hero">焦点直播卡片</div>
          <div class="banner">会员权益横幅</div>
          <div class="content-grid">
            <div>推荐内容</div>
            <div>短视频推荐</div>
            <div>体育赛事</div>
          </div>
          <div class="footer-zone">底部内容与空白区域</div>
        </div>
      </div>
    </n-modal>

    <n-modal v-model:show="showHelpModal" preset="card" title="热力图说明" class="form-modal">
      <div class="help-list">
        <p><strong>点击热图：</strong>按元素展示点击次数、点击用户数、点击率、点击比和不可点击误点。</p>
        <p><strong>点位云图：</strong>按点击坐标聚合，支持精细 / 标准 / 粗略粒度和异常点过滤。</p>
        <p><strong>触达率图：</strong>按屏或页面百分比分段，点击分段后元素排行会聚焦该区域。</p>
        <p><strong>改版对比：</strong>支持版本、时间、设备维度对比，并提供并排、叠加、指标表和排名变化视图。</p>
      </div>
    </n-modal>

    <n-modal v-model:show="showDeleteModal" preset="card" title="删除热力图" class="small-modal">
      <n-alert type="warning">
        {{ pendingDeleteHeatmap?.dashboardReferenced ? '该热力图已被看板组件引用，删除后相关组件将无法继续刷新。是否继续？' : '删除热力图不会删除原始埋点数据。是否继续？' }}
      </n-alert>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showDeleteModal = false">取消</n-button>
          <n-button type="error" @click="confirmDeleteHeatmap">删除</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<style scoped>
.heatmap-page {
  min-height: 100%;
  padding: 24px;
  background: #f3f6fb;
  color: #111827;
}

.page-header,
.card-header,
.card-footer,
.detail-header,
.section-header,
.user-drawer-header,
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.page-header h1,
.detail-header h2,
.section-header h3,
.card-header h3 {
  margin: 0;
}

.page-header p,
.card-header p,
.detail-header p,
.section-header p,
.card-footer,
.muted {
  color: #667085;
  line-height: 1.6;
}

.status-alert,
.filter-card {
  margin-top: 16px;
}

.list-filter-grid {
  display: grid;
  grid-template-columns: minmax(240px, 1.6fr) repeat(6, minmax(150px, 1fr));
  gap: 12px;
}

.list-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 16px;
  color: #667085;
}

.empty-block {
  margin-top: 24px;
}

.heatmap-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(430px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.heatmap-card {
  border-radius: 8px;
}

.mode-chip-row,
.metric-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.mode-chip-row {
  align-items: center;
}

.metric-row > div {
  flex: 1;
  min-width: 110px;
  padding: 10px;
  border-radius: 6px;
  background: #f7fafc;
}

.metric-row span,
.summary-grid span {
  display: block;
  color: #667085;
  font-size: 13px;
}

.metric-row strong,
.summary-grid strong {
  display: block;
  margin-top: 6px;
  font-size: 24px;
}

.metric-row em {
  display: block;
  color: #18a058;
  font-style: normal;
  font-size: 12px;
}

.card-trend {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #edf2f7;
}

.mini-trend-chart {
  height: 82px;
  margin-top: 4px;
}

.list-meta {
  color: #667085;
  font-size: 12px;
}

.card-footer {
  flex-wrap: wrap;
  align-items: flex-start;
  margin-top: 8px;
  padding-top: 10px;
  border-top: 1px solid #edf2f7;
}

.card-footer > span {
  flex: 1 1 230px;
  min-width: 0;
}

.detail-layout {
  display: grid;
  gap: 16px;
  margin-top: 16px;
}

.query-grid {
  display: grid;
  grid-template-columns: 80px minmax(180px, 1fr) 80px minmax(180px, 1fr) 80px minmax(180px, 1fr);
  gap: 12px;
  align-items: center;
}

.query-grid label,
.drawer-form label,
.modal-form label {
  font-weight: 700;
  color: #344054;
}

.detail-filter-panel {
  display: grid;
  gap: 10px;
  margin-top: 16px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}

.detail-filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.detail-filter-header strong,
.detail-filter-header span {
  display: block;
}

.detail-filter-header span {
  margin-top: 4px;
  color: #667085;
  font-size: 13px;
}

.detail-filter-row {
  display: grid;
  grid-template-columns: 110px 130px 150px 130px minmax(140px, 1fr) 56px;
  gap: 10px;
  align-items: center;
}

.relation-placeholder {
  display: grid;
  place-items: center;
  height: 34px;
  border-radius: 6px;
  background: #fff;
  color: #98a2b3;
}

.mode-row {
  display: flex;
  justify-content: center;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(140px, 1fr));
  gap: 12px;
}

.analysis-workbench {
  display: grid;
  grid-template-columns: 420px minmax(0, 1fr);
  gap: 16px;
}

.rank-chart {
  height: 260px;
}

.rank-list {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.rank-list button {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  color: #1f2937;
  text-align: left;
  cursor: pointer;
}

.rank-list button.active {
  border-color: #18a058;
  background: #ecfdf3;
  color: #12854b;
}

.rank-list strong {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  white-space: nowrap;
}

.renderer-card {
  min-width: 0;
}

.toolbar {
  margin-bottom: 12px;
}

.opacity-slider {
  width: 160px;
}

.heatmap-renderer {
  position: relative;
  min-height: 620px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.mock-page {
  position: absolute;
  inset: 0;
  padding: 24px;
  background:
    linear-gradient(180deg, #ffffff 0%, #f8fafc 55%, #eef2ff 100%);
}

.site-nav,
.hero,
.banner,
.content-grid > div,
.footer-zone {
  border-radius: 8px;
  background: #eef4ff;
  color: #344054;
  font-weight: 700;
}

.site-nav {
  height: 42px;
  padding: 10px 16px;
  background: #f3f4f6;
}

.hero {
  height: 98px;
  margin-top: 36px;
  padding: 36px;
  font-size: 24px;
  background: #dbeafe;
}

.banner {
  height: 58px;
  margin-top: 32px;
  padding: 18px 28px;
  background: #ecfdf3;
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  margin-top: 42px;
}

.content-grid > div {
  height: 126px;
  padding: 20px;
  background: #fff7ed;
}

.footer-zone {
  height: 86px;
  margin-top: 92px;
  padding: 30px;
  background: #f8fafc;
}

.element-hotspot,
.click-point,
.reach-section,
.clickable-outline {
  position: absolute;
  z-index: 2;
}

.element-hotspot {
  display: grid;
  place-items: center;
  border: 2px solid #d03050;
  border-radius: 8px;
  background: rgba(208, 48, 80, 0.45);
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.element-hotspot.misclick {
  border-color: #f0a020;
  background: rgba(240, 160, 32, 0.48);
}

.element-hotspot.selected {
  outline: 4px solid rgba(24, 160, 88, 0.38);
}

.clickable-outline {
  border: 1px dashed #18a058;
  border-radius: 8px;
  pointer-events: none;
}

.click-point {
  border: 2px solid #fff;
  border-radius: 50%;
  background: #d03050;
  box-shadow: 0 0 0 4px rgba(208, 48, 80, 0.2);
  transform: translate(-50%, -50%);
  cursor: pointer;
}

.click-point.abnormal {
  background: #f0a020;
  box-shadow: 0 0 0 6px rgba(240, 160, 32, 0.22);
}

.click-point.selected {
  outline: 4px solid rgba(24, 160, 88, 0.5);
}

.reach-section {
  left: 0;
  width: 100%;
  border: 0;
  background: rgba(24, 160, 88, 0.48);
  color: #fff;
  font-weight: 800;
  cursor: pointer;
}

.reach-section.selected {
  box-shadow: inset 0 0 0 4px #18a058;
}

.element-detail {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-top: 12px;
  padding: 12px;
  border-radius: 8px;
  background: #f8fafc;
}

.comparison-config {
  display: grid;
  grid-template-columns: repeat(4, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.rich-comparison-config {
  grid-template-columns: 74px minmax(180px, 1fr) 74px minmax(220px, 1.2fr) 74px minmax(160px, 0.9fr);
  align-items: center;
}

.rich-comparison-config label {
  font-weight: 700;
  color: #344054;
}

.comparison-renderer {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.comparison-full {
  grid-template-columns: minmax(0, 1fr);
}

.comparison-mode-alert {
  margin-bottom: 16px;
}

.mini-heatmap {
  display: grid;
  place-items: center;
  height: 260px;
  border-radius: 8px;
  color: #fff;
  font-weight: 800;
}

.mini-heatmap.before {
  background: linear-gradient(135deg, #64748b, #94a3b8);
}

.mini-heatmap.after {
  background: linear-gradient(135deg, #18a058, #2f7de1);
}

.mini-heatmap.diff {
  background:
    radial-gradient(circle at 28% 32%, rgba(24, 160, 88, 0.92), transparent 24%),
    radial-gradient(circle at 68% 54%, rgba(208, 48, 80, 0.88), transparent 22%),
    linear-gradient(135deg, #e5e7eb, #f8fafc);
  color: #111827;
}

.type-grid,
.mobile-create-layout {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.type-grid button {
  min-height: 150px;
  padding: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
  text-align: left;
  cursor: pointer;
}

.type-grid strong,
.type-grid span {
  display: block;
}

.type-grid strong {
  margin-bottom: 10px;
  font-size: 22px;
}

.mobile-create-layout {
  grid-template-columns: 320px minmax(360px, 1fr) 360px;
  margin-top: 16px;
}

.mobile-status,
.qr-preview,
.qr-box {
  padding: 18px;
  border-radius: 8px;
  background: #ecfdf3;
  color: #12854b;
  font-weight: 800;
}

.share-result {
  display: grid;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  background: #f8fafc;
}

.share-result span {
  color: #667085;
  font-size: 13px;
}

.qr-box {
  display: grid;
  place-items: center;
  height: 220px;
  margin: 16px 0;
  border: 2px dashed #18a058;
}

.phone-preview {
  max-width: 320px;
  margin: 0 auto;
  padding: 16px;
  border: 12px solid #111827;
  border-radius: 28px;
  background: #f8fafc;
}

.phone-top,
.reward-card,
.phone-actions {
  padding: 18px;
  border-radius: 12px;
  background: #dbeafe;
  font-weight: 800;
}

.reward-card {
  height: 180px;
  margin-top: 20px;
  background: #fff7ed;
}

.phone-actions {
  margin-top: 20px;
  background: #ecfdf3;
}

.phone-hotspot {
  width: 80px;
  height: 80px;
  margin: -110px auto 40px;
  border-radius: 50%;
  background: rgba(208, 48, 80, 0.45);
}

.drawer-form,
.modal-form {
  display: grid;
  gap: 12px;
}

.drawer-form h3 {
  margin: 18px 0 0;
}

.checkbox-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.preview-panel {
  display: grid;
  gap: 12px;
}

.preview-chart {
  height: 160px;
}

.small-modal {
  width: 560px;
}

.form-modal {
  width: 620px;
}

.fullscreen-modal {
  width: min(1200px, 92vw);
}

.fullscreen-preview {
  display: grid;
  gap: 16px;
}

.fullscreen-mock-page {
  position: relative;
  min-height: 680px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.help-list {
  display: grid;
  gap: 10px;
  line-height: 1.7;
  color: #344054;
}

.drawer-actions {
  margin-bottom: 12px;
}

.small-select {
  width: 150px;
}

.tiny-input {
  width: 96px;
}

@media (max-width: 1500px) {
  .analysis-workbench,
  .mobile-create-layout {
    grid-template-columns: 1fr;
  }

  .summary-grid {
    grid-template-columns: repeat(3, minmax(140px, 1fr));
  }

  .list-filter-grid,
  .query-grid,
  .comparison-config,
  .rich-comparison-config,
  .detail-filter-row {
    grid-template-columns: repeat(2, minmax(180px, 1fr));
  }
}
</style>
