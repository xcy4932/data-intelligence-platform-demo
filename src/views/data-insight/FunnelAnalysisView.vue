<script setup lang="ts">
import '@/components/charts/chartRegister'
import type { EChartsOption } from 'echarts'
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
  NGi,
  NGrid,
  NInput,
  NInputNumber,
  NIcon,
  NModal,
  NPopover,
  NRadioButton,
  NRadioGroup,
  NSelect,
  NSpace,
  NSpin,
  NStatistic,
  NSwitch,
  NTag,
  NTooltip,
} from 'naive-ui'
import type { DataTableColumns, SelectGroupOption, SelectOption } from 'naive-ui'
import dayjs from 'dayjs'
import { computed, h, onMounted, reactive, ref } from 'vue'
import type { VNode, VNodeChild } from 'vue'
import VChart from 'vue-echarts'
import { PencilOutline, RefreshOutline, ShareSocialOutline, TrashOutline } from '@vicons/ionicons5'
import { funnelAnalysisService } from '@/services/funnelAnalysisService'
import type {
  EventDefinition,
  EventProperty,
  EventPropertyDataType,
  FilterCondition,
  FilterOperator,
  FilterSourceType,
  UserAttribute,
  UserSegmentOption,
  UserTag,
} from '@/types/eventAnalysis'
import type {
  FunnelAnalysisMode,
  FunnelChartType,
  FunnelComparisonGroup,
  FunnelConversionWindow,
  FunnelDashboardRefreshPolicy,
  FunnelCompareMode,
  FunnelGroupBy,
  FunnelGroupFieldType,
  FunnelIdType,
  FunnelMetricAggregator,
  FunnelMode,
  FunnelPathVariant,
  FunnelQueryRequest,
  FunnelQueryResponse,
  FunnelQueryState,
  FunnelRelationProperty,
  FunnelRelationPropertyMapping,
  FunnelRelationPropertySourceType,
  FunnelStep,
  FunnelStepMetric,
  FunnelStepResult,
  FunnelTemplate,
  FunnelTimeGranularity,
  FunnelUserRecord,
  FunnelUserType,
  FunnelViewConfig,
} from '@/types/funnelAnalysis'

type DateRangeValue = [number, number]
type FunnelFilterTarget = 'step' | 'global' | 'comparison' | 'metric'
type FunnelSaveWidgetType = 'funnel_steps' | 'funnel_trend' | 'funnel_duration' | 'funnel_table'
type FunnelSelectOption = SelectOption | SelectGroupOption
type FunnelSelectLeafOption = SelectOption & {
  funnelKind?: 'mine' | 'shared' | 'deleted'
  templateId?: string
}
type FunnelCompareSelectValue = 'none' | Extract<FunnelCompareMode, 'previous_period' | 'custom'>
type FunnelSelectValue = string

const CREATE_FUNNEL_SELECT_VALUE = '__create_funnel__'
const DRAFT_FUNNEL_SELECT_VALUE = '__draft_funnel__'
const DELETED_FUNNEL_SELECT_PREFIX = '__deleted_funnel__:'

interface FunnelMetricCard {
  label: string
  value: string
  desc: string
}

interface FunnelDetailRow {
  key: string
  stepId: string
  group: string
  windowBucket: string
  stepName: string
  reachedCount: number
  lostCount: number
  previousConversionRate: number
  overallConversionRate: number
  previousLostRate: number
  avgDuration: string
  selectedMetricValue: string
  compareSelectedMetricValue?: string
  selectedMetricDelta?: string
  compareReachedCount?: number
  reachedCountDelta?: string
  compareLostCount?: number
  lostCountDelta?: string
  comparePreviousConversionRate?: number
  previousConversionDelta?: string
  compareOverallConversionRate?: number
  overallConversionDelta?: string
  comparePreviousLostRate?: number
  previousLostDelta?: string
  compareAvgDuration?: string
  avgDurationDelta?: string
  compareSimultaneousMetricValue?: number | string
  simultaneousMetricDelta?: string
  simultaneousMetricValue: number | string
  children?: FunnelDetailRow[]
}

const loading = ref(false)
const metadataLoading = ref(false)
const queryState = ref<FunnelQueryState>('idle')
const notice = ref('')
const errorMessage = ref('')
const result = ref<FunnelQueryResponse | null>(null)
const users = ref<FunnelUserRecord[]>([])
const metadataEvents = ref<EventDefinition[]>([])
const metadataUserAttributes = ref<UserAttribute[]>([])
const metadataUserTags = ref<UserTag[]>([])
const metadataUserSegments = ref<UserSegmentOption[]>([])
const templates = ref<FunnelTemplate[]>([])
const deletedFunnels = ref<FunnelTemplate[]>([])
const selectedUserType = ref<FunnelUserType>('converted')
const showTemplateModal = ref(false)
const showFilterModal = ref(false)
const showGroupModal = ref(false)
const showComparisonModal = ref(false)
const showMetricModal = ref(false)
const showRelationModal = ref(false)
const showMultiPathModal = ref(false)
const showUserDrawer = ref(false)
const showSaveAnalysisModal = ref(false)
const showSaveDashboardModal = ref(false)
const showMicroscopeModal = ref(false)
const showShareFunnelModal = ref(false)
const showRenameFunnelModal = ref(false)
const showDeleteFunnelModal = ref(false)
const showPurgeFunnelModal = ref(false)
const showSegmentModal = ref(false)
const showAnnotationModal = ref(false)
const showExportModal = ref(false)
const showTimeRangePopover = ref(false)
const showCompareTimePopover = ref(false)
const showFunnelSelectMenu = ref(false)
const stepsExpanded = ref(false)
const funnelName = ref('广告观看转化漏斗')
const funnelNameDraft = ref('')
const funnelRenameTarget = ref<FunnelTemplate | null>(null)
const funnelPendingDelete = ref<FunnelTemplate | null>(null)
const funnelPendingPurge = ref<FunnelTemplate | null>(null)
const funnelPendingShare = ref<FunnelTemplate | null>(null)
const hoveredFunnelId = ref('')
const hoveredDeletedFunnelId = ref('')
const selectedFunnelId = ref('')
const timeShortcut = ref('last_30_days')
const filterTarget = ref<FunnelFilterTarget>('global')
const filterTargetStepId = ref('')
const filterTargetGroupId = ref('')
const filterParentId = ref('')
const metricTargetStepId = ref('')
const activeStepId = ref('')

const projectId = ref('game_ad_ops')
const idType = ref<FunnelIdType>('user_id')
const funnelMode = ref<FunnelMode>('ordered')
const calculationType = ref<'UV' | 'PV'>('UV')
const allowEventReuse = ref(false)
const relationRestrictEnabled = ref(false)
const timezone = ref('UTC+8')
const steps = ref<FunnelStep[]>([])
const globalFilters = ref<FilterCondition[]>([])
const comparisonGroups = ref<FunnelComparisonGroup[]>([])
const groupBys = ref<FunnelGroupBy[]>([])
const relationProperties = ref<FunnelRelationProperty[]>([])
const multiPathBaseStepOrder = ref(2)
const multiPathVariants = ref<FunnelPathVariant[]>([])
const conversionWindow = reactive<FunnelConversionWindow>({
  mode: 'preset',
  value: 7,
  unit: 'day',
  restrictWithinSelectedTimeRange: false,
})
const multiPathEnabled = ref(false)
const timeRange = ref<DateRangeValue>([
  dayjs('2026-04-21').valueOf(),
  dayjs('2026-05-20').valueOf(),
])
const compareTimeRange = ref<DateRangeValue>([
  dayjs('2026-03-22').valueOf(),
  dayjs('2026-04-20').valueOf(),
])
const granularity = ref<FunnelTimeGranularity>('day')
const compareMode = ref<FunnelCompareSelectValue>('none')
const analysisMode = ref<FunnelAnalysisMode>('steps')
const chartType = ref<FunnelChartType>('conversion_funnel')
const selectedMetric = ref<FunnelViewConfig['selectedMetric']>('previous_conversion_rate')

const filterDraft = reactive({
  logic: 'AND' as FilterCondition['logic'],
  sourceType: 'user_property' as FilterSourceType,
  field: '',
  operator: 'equals' as FilterOperator,
  valueText: '',
})

const groupDraft = reactive({
  fieldType: 'user_property' as FunnelGroupFieldType,
  fieldName: '',
  groupMode: 'single' as FunnelGroupBy['groupMode'],
  selectedValuesText: '',
})

const comparisonDraft = reactive({
  id: '',
  name: '',
  color: '#18a058',
  enabled: true,
  filters: [] as FilterCondition[],
})

const metricDraft = reactive({
  metricName: '',
  eventName: '',
  aggregator: 'PV' as FunnelMetricAggregator,
  propertyName: '',
  percentile: 90,
})

const virtualRelationProperties: EventProperty[] = [
  {
    propertyName: 'virtual_session_id',
    displayName: '虚拟会话 ID',
    dataType: 'string',
    propertyType: 'event_property',
    availableOperators: ['equals', 'not_equals', 'in', 'not_in'],
  },
  {
    propertyName: 'virtual_ad_request_id',
    displayName: '虚拟广告请求 ID',
    dataType: 'string',
    propertyType: 'event_property',
    availableOperators: ['equals', 'not_equals', 'in', 'not_in'],
  },
  {
    propertyName: 'virtual_order_trace_id',
    displayName: '虚拟订单链路 ID',
    dataType: 'string',
    propertyType: 'event_property',
    availableOperators: ['equals', 'not_equals', 'in', 'not_in'],
  },
]

const relationDraft = reactive({
  id: '',
  mappings: [] as FunnelRelationPropertyMapping[],
})

const pathDraft = reactive({
  id: '',
  name: '',
  changedStepOrder: 2,
  eventName: '',
})

const saveAnalysisForm = reactive({
  name: '广告观看转化漏斗分析',
  description: '保存当前漏斗步骤、窗口、筛选、分组、图表和表格状态。',
  tags: '漏斗, 广告, 转化',
  spaceType: 'personal' as 'personal' | 'team',
})

const saveDashboardForm = reactive({
  title: '广告观看漏斗转化图',
  dashboardId: 'personal_ad_monitor',
  widgetType: 'funnel_steps' as FunnelSaveWidgetType,
  refreshPolicy: 'daily' as FunnelDashboardRefreshPolicy,
  timeMode: 'relative' as 'fixed' | 'relative',
})

const shareFunnelForm = reactive({
  members: [] as string[],
  teams: [] as string[],
})

const shareMemberOptions: SelectOption[] = [
  { label: 'Mia Chen · 运营策略', value: 'mia_chen' },
  { label: 'Alex Li · 数据分析', value: 'alex_li' },
  { label: 'Chaoyang Xu · 产品负责人', value: 'chaoyang_xu' },
  { label: 'Nina Wang · 商业化运营', value: 'nina_wang' },
  { label: 'Leo Zhang · 增长运营', value: 'leo_zhang' },
]

const shareTeamOptions: SelectOption[] = [
  { label: '运营团队', value: 'ops_team' },
  { label: '数据分析团队', value: 'data_analysis_team' },
  { label: '商业化团队', value: 'monetization_team' },
  { label: '增长实验小组', value: 'growth_experiment_team' },
]

const timezoneOptions: SelectOption[] = [
  { label: 'UTC+8 北京时间', value: 'UTC+8' },
  { label: 'UTC+1 欧洲中部时间', value: 'UTC+1' },
]

const eventOptions = computed<SelectOption[]>(() =>
  metadataEvents.value.map((event) => ({
    label: `${event.displayName} ${event.eventName}`,
    value: event.eventName,
  })),
)

const funnelSelectOptions = computed<FunnelSelectOption[]>(() => {
  const myFunnels = templates.value.filter((template) => template.ownerId === 'current_user')
  const sharedFunnels = templates.value.filter((template) => template.ownerId !== 'current_user')
  const draftOption: SelectOption[] = selectedFunnelId.value
    ? []
    : [{ label: funnelName.value || '未命名漏斗', value: DRAFT_FUNNEL_SELECT_VALUE }]
  const deletedOptions: FunnelSelectLeafOption[] = deletedFunnels.value.map((template) => ({
    label: template.name,
    value: `${DELETED_FUNNEL_SELECT_PREFIX}${template.id}`,
    funnelKind: 'deleted',
    templateId: template.id,
  }))

  return [
    {
      label: '+ 新建漏斗',
      value: CREATE_FUNNEL_SELECT_VALUE,
    },
    ...draftOption,
    {
      type: 'group',
      key: 'my-funnels',
      label: '我创建的漏斗',
      children: myFunnels.map((template) => ({
        label: template.name,
        value: template.id,
        funnelKind: 'mine',
        templateId: template.id,
      })),
    },
    {
      type: 'group',
      key: 'shared-funnels',
      label: '别人分享给我的漏斗',
      children: sharedFunnels.map((template) => ({
        label: template.name,
        value: template.id,
        funnelKind: 'shared',
        templateId: template.id,
      })),
    },
    {
      type: 'group',
      key: 'deleted-funnels',
      label: '最近删除',
      children: deletedOptions,
    },
  ]
})

const currentFunnelSelectValue = computed(() => selectedFunnelId.value || DRAFT_FUNNEL_SELECT_VALUE)

const funnelSelectMenuWidth = computed(() => {
  const labels = [
    funnelName.value,
    ...templates.value.map((template) => template.name),
    ...deletedFunnels.value.map((template) => template.name),
  ].filter(Boolean)
  const maxLength = labels.reduce((current, label) => Math.max(current, label.length), 0)

  return Math.min(680, Math.max(480, maxLength * 14 + 180))
})

const funnelSelectMenuProps = computed(() => ({
  class: 'funnel-select-menu',
  style: {
    '--n-height': '420px',
    width: `${funnelSelectMenuWidth.value}px`,
    maxWidth: 'calc(100vw - 48px)',
  },
}))

const funnelOptionRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '14px',
  width: '100%',
  maxWidth: '100%',
  boxSizing: 'border-box',
  minHeight: '34px',
  padding: '4px 8px',
  borderRadius: '6px',
  cursor: 'pointer',
} as const

const funnelOptionNameStyle = {
  minWidth: '0',
  maxWidth: 'calc(100% - 96px)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const

const funnelOptionActionsStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: '12px',
} as const

const hoveredFunnelOptionStyle = {
  margin: '-4px -8px',
  padding: '6px 12px',
  borderRadius: '6px',
  background: '#f3f6f8',
} as const

const renderFunnelSelectOption = ({ node, option }: { node: VNode, option: SelectOption, selected: boolean }): VNodeChild => {
  const item = option as FunnelSelectLeafOption
  if (!item.funnelKind || !item.templateId) {
    return node
  }

  if (item.funnelKind !== 'deleted') {
    const canManage = item.funnelKind === 'mine'
    const isSelected = selectedFunnelId.value === item.templateId
    const isHovered = hoveredFunnelId.value === item.templateId

    return h('div', {
      class: ['funnel-option-row', isSelected ? 'selected' : '', isHovered ? 'hovered' : ''],
      style: isHovered
        ? { ...funnelOptionRowStyle, ...hoveredFunnelOptionStyle }
        : funnelOptionRowStyle,
      onClick: (event: MouseEvent) => {
        event.stopPropagation()
        switchFunnel(item.templateId ?? '')
        showFunnelSelectMenu.value = false
      },
      onMouseenter: () => {
        hoveredFunnelId.value = item.templateId ?? ''
      },
      onMouseleave: () => {
        if (hoveredFunnelId.value === item.templateId) {
          hoveredFunnelId.value = ''
        }
      },
    }, [
      h('span', {
        class: 'funnel-option-name',
        style: isHovered
          ? { ...funnelOptionNameStyle, color: '#18a058', fontWeight: '600' }
          : funnelOptionNameStyle,
        title: String(option.label ?? ''),
      }, String(option.label ?? '')),
      isHovered
        ? h('span', { class: 'funnel-option-actions', style: funnelOptionActionsStyle }, [
            canManage
              ? h(
                  NButton,
                  {
                    circle: true,
                    text: true,
                    size: 'tiny',
                    title: '修改名称',
                    onClick: (event: MouseEvent) => {
                      event.stopPropagation()
                      startEditFunnelName(item.templateId)
                    },
                  },
                  { icon: () => h(NIcon, null, { default: () => h(PencilOutline) }) },
                )
              : null,
            h(
              NButton,
              {
                circle: true,
                text: true,
                size: 'tiny',
                title: '分享',
                onClick: (event: MouseEvent) => {
                  event.stopPropagation()
                  shareCurrentFunnel(item.templateId)
                },
              },
              { icon: () => h(NIcon, null, { default: () => h(ShareSocialOutline) }) },
            ),
            canManage
              ? h(
                  NButton,
                  {
                    circle: true,
                    text: true,
                    size: 'tiny',
                    type: 'error',
                    title: '删除',
                    onClick: (event: MouseEvent) => {
                      event.stopPropagation()
                      deleteCurrentFunnel(item.templateId)
                    },
                  },
                  { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) },
                )
              : null,
          ])
        : null,
    ])
  }

  const isHovered = hoveredDeletedFunnelId.value === item.templateId
  return h('div', {
    class: 'deleted-funnel-option',
    style: funnelOptionRowStyle,
    onMouseenter: () => {
      hoveredDeletedFunnelId.value = item.templateId ?? ''
    },
    onMouseleave: () => {
      if (hoveredDeletedFunnelId.value === item.templateId) {
        hoveredDeletedFunnelId.value = ''
      }
    },
  }, [
    h('span', {
      class: 'deleted-funnel-name',
      style: {
        ...funnelOptionNameStyle,
        color: '#667085',
      },
      title: String(option.label ?? ''),
    }, String(option.label ?? '')),
    isHovered
      ? h('span', { class: 'deleted-funnel-actions', style: funnelOptionActionsStyle }, [
          h(
            NButton,
            {
              circle: true,
              text: true,
              size: 'tiny',
              title: '恢复',
              onClick: (event: MouseEvent) => {
                event.stopPropagation()
                restoreDeletedFunnel(item.templateId ?? '')
              },
            },
            { icon: () => h(NIcon, null, { default: () => h(RefreshOutline) }) },
          ),
          h(
            NButton,
            {
              circle: true,
              text: true,
              size: 'tiny',
              type: 'error',
              title: '彻底删除',
              onClick: (event: MouseEvent) => {
                event.stopPropagation()
                openPurgeFunnelModal(item.templateId ?? '')
              },
            },
            { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) },
          ),
        ])
      : null,
  ])
}

const stepOrderOptions = computed<SelectOption[]>(() =>
  steps.value.map((step) => ({
    label: `步骤 ${step.order}：${step.alias || step.eventDisplayName || '未命名步骤'}`,
    value: step.order,
  })),
)

const getEventByName = (eventName: string): EventDefinition | undefined =>
  metadataEvents.value.find((event) => event.eventName === eventName)

const getStepByOrder = (order: number): FunnelStep | undefined =>
  steps.value.find((step) => step.order === order)

const getStepEventProperties = (stepId: string): EventProperty[] => {
  const step = steps.value.find((item) => item.id === stepId)
  return getEventByName(step?.eventName ?? '')?.properties ?? []
}

const metricEventProperties = computed<EventProperty[]>(() =>
  getEventByName(metricDraft.eventName)?.properties ?? [],
)

const stepEventProperties = computed<EventProperty[]>(() => {
  if (filterTarget.value === 'metric') {
    return metricEventProperties.value
  }

  if (!filterTargetStepId.value && !metricTargetStepId.value) {
    return metadataEvents.value.flatMap((event) => event.properties)
  }

  const targetStepId = filterTargetStepId.value || metricTargetStepId.value
  return getStepEventProperties(targetStepId)
})

const eventPropertyOptions = computed<SelectOption[]>(() =>
  stepEventProperties.value.map((property) => ({
    label: `${property.displayName} ${property.propertyName}`,
    value: property.propertyName,
  })),
)

const userPropertyOptions = computed<SelectOption[]>(() =>
  metadataUserAttributes.value.map((property) => ({
    label: `${property.displayName} ${property.field}`,
    value: property.field,
  })),
)

const userTagOptions = computed<SelectOption[]>(() =>
  metadataUserTags.value.map((tag) => ({
    label: `${tag.displayName} ${tag.field}`,
    value: tag.field,
  })),
)

const segmentOptions = computed<SelectOption[]>(() =>
  metadataUserSegments.value.map((segment) => ({
    label: `${segment.name} ${segment.estimatedUsers.toLocaleString()} 人`,
    value: segment.id,
  })),
)

const commonPropertyOptions = computed<SelectOption[]>(() => {
  const commonProperties = metadataEvents.value.flatMap((event) =>
    event.properties.filter((property) => property.propertyType === 'common_property'),
  )
  const uniqueProperties = new Map<string, EventProperty>()
  commonProperties.forEach((property) => uniqueProperties.set(property.propertyName, property))

  return Array.from(uniqueProperties.values()).map((property) => ({
    label: `${property.displayName} ${property.propertyName}`,
    value: property.propertyName,
  }))
})

const virtualPropertyOptions = computed<SelectOption[]>(() =>
  virtualRelationProperties.map((property) => ({
    label: `${property.displayName} ${property.propertyName}`,
    value: property.propertyName,
  })),
)

const filterFieldOptions = computed<SelectOption[]>(() => {
  if (filterDraft.sourceType === 'event_property') {
    return eventPropertyOptions.value
  }

  if (filterDraft.sourceType === 'user_property') {
    return userPropertyOptions.value
  }

  if (filterDraft.sourceType === 'user_tag') {
    return userTagOptions.value
  }

  if (filterDraft.sourceType === 'segment') {
    return segmentOptions.value
  }

  if (filterDraft.sourceType === 'common_property') {
    return commonPropertyOptions.value
  }

  return eventOptions.value
})

const filterSourceOptions = computed<SelectOption[]>(() => {
  const baseOptions: SelectOption[] = [
    { label: '公共属性', value: 'common_property' },
    { label: '用户属性', value: 'user_property' },
    { label: '用户标签', value: 'user_tag' },
    { label: '用户分群', value: 'segment' },
    { label: '行为圈选', value: 'behavior' },
    { label: '动态匹配', value: 'dynamic_match' },
  ]

  if (filterTarget.value === 'step' || filterTarget.value === 'metric') {
    return [
      { label: '事件属性', value: 'event_property' },
      ...baseOptions.slice(0, 3),
    ]
  }

  return baseOptions
})

const filterOperatorOptions = computed<SelectOption[]>(() => {
  if (filterDraft.sourceType === 'segment') {
    return [
      { label: '属于', value: 'in' },
      { label: '不属于', value: 'not_in' },
    ]
  }

  if (filterDraft.sourceType === 'behavior') {
    return [
      { label: '做过', value: 'done' },
      { label: '没做过', value: 'not_done' },
      { label: '依次做过', value: 'sequence_done' },
    ]
  }

  return [
    { label: '等于', value: 'equals' },
    { label: '不等于', value: 'not_equals' },
    { label: '属于', value: 'in' },
    { label: '不属于', value: 'not_in' },
    { label: '包含', value: 'contains' },
    { label: '正则匹配', value: 'regex' },
    { label: '大于', value: 'gt' },
    { label: '大于等于', value: 'gte' },
    { label: '小于', value: 'lt' },
    { label: '小于等于', value: 'lte' },
  ]
})

const groupFieldOptions = computed<SelectOption[]>(() => {
  if (groupDraft.fieldType === 'event_property') {
    return metadataEvents.value.flatMap((event) =>
      event.properties.map((property) => ({
        label: `${event.displayName} · ${property.displayName}`,
        value: property.propertyName,
      })),
    )
  }

  if (groupDraft.fieldType === 'user_tag') {
    return userTagOptions.value
  }

  if (groupDraft.fieldType === 'cohort') {
    return segmentOptions.value
  }

  if (groupDraft.fieldType === 'event_time') {
    return [
      { label: '小时', value: 'hour' },
      { label: '天', value: 'day' },
      { label: '周', value: 'week' },
    ]
  }

  return userPropertyOptions.value
})

const numericEventPropertyOptions = computed<SelectOption[]>(() =>
  metricEventProperties.value
    .filter((property) => property.dataType === 'number')
    .map((property) => ({
      label: `${property.displayName} ${property.propertyName}`,
      value: property.propertyName,
    })),
)

const relationPropertyOptionsByStep = computed<Record<string, SelectOption[]>>(() =>
  steps.value.reduce<Record<string, SelectOption[]>>((options, step) => {
    options[step.id] = getStepEventProperties(step.id).map((property) => ({
      label: `${property.displayName} ${property.propertyName} · ${property.dataType}`,
      value: property.propertyName,
    }))
    return options
  }, {}),
)

const relationSourceOptions: Array<SelectOption & { value: FunnelRelationPropertySourceType }> = [
  { label: '事件属性', value: 'event_property' },
  { label: '公共属性', value: 'common_property' },
  { label: '用户属性', value: 'user_property' },
  { label: '用户标签', value: 'user_tag' },
  { label: '虚拟属性', value: 'virtual_property' },
]

const relationSummary = computed(() => {
  if (!relationProperties.value.length) {
    return '未配置关联属性'
  }

  return `${relationProperties.value.length} 组关联属性`
})

const multiPathSummary = computed(() => {
  if (!multiPathEnabled.value) {
    return '未启用'
  }

  return `${multiPathVariants.value.length} 条替代路径`
})

const needsMetricProperty = computed(() =>
  ['SUM', 'AVG', 'MAX', 'MIN', 'MEDIAN', 'PERCENTILE'].includes(metricDraft.aggregator),
)

const validSteps = computed(() => steps.value.filter((step) => step.eventName))

const stepAutoCollapseThreshold = 4
const visibleSteps = computed(() =>
  stepsExpanded.value || steps.value.length <= stepAutoCollapseThreshold
    ? steps.value
    : steps.value.slice(0, 3),
)

const hiddenStepCount = computed(() => Math.max(steps.value.length - visibleSteps.value.length, 0))

const metricCards = computed<FunnelMetricCard[]>(() => {
  const summary = result.value?.summary

  return [
    {
      label: '首步触达用户',
      value: summary ? summary.firstStepCount.toLocaleString() : '-',
      desc: '进入漏斗第一步的人数。',
    },
    {
      label: '最终转化用户',
      value: summary ? summary.finalStepCount.toLocaleString() : '-',
      desc: '完成最后一步的人数。',
    },
    {
      label: '整体转化率',
      value: summary ? `${summary.overallConversionRate}%` : '-',
      desc: '最终步骤 / 首步骤。',
    },
    {
      label: '总流失用户',
      value: summary ? summary.totalLostCount.toLocaleString() : '-',
      desc: '各步骤间流失用户合计。',
    },
    {
      label: '平均转化时长',
      value: summary ? formatDuration(summary.avgDurationMs) : '-',
      desc: '首步到终步平均耗时。',
    },
  ]
})

const chartTitle = computed(() => {
  if (analysisMode.value === 'trend') {
    return '转化趋势'
  }

  if (analysisMode.value === 'duration') {
    return '转化时长分布'
  }

  return funnelMode.value === 'ordered' ? '有序转化漏斗' : '无序转化漏斗'
})

const chartSubtitle = computed(() =>
  [
    calculationType.value,
    `${granularity.value} 粒度`,
    `指标：${selectedMetricLabel.value}`,
    `${validSteps.value.length} 个步骤`,
    `${groupBys.value.length} 个分组`,
    relationProperties.value.length ? relationSummary.value : '',
    multiPathEnabled.value ? multiPathSummary.value : '',
  ].filter(Boolean).join(' · '),
)

const selectedMetricLabel = computed(() =>
  selectedMetricOptions.find((option) => option.value === selectedMetric.value)?.label ?? '上步转化率',
)

const selectedMetricUnit = computed(() =>
  selectedMetric.value === 'avg_duration' || selectedMetric.value === 'median_duration'
    ? '秒'
    : selectedMetric.value === 'reached_count' || selectedMetric.value === 'lost_count'
      ? '人'
      : '%',
)

const getStepMetricValue = (step: FunnelStepResult): number => {
  if (selectedMetric.value === 'overall_conversion_rate') {
    return step.overallConversionRate
  }

  if (selectedMetric.value === 'reached_count') {
    return step.reachedCount
  }

  if (selectedMetric.value === 'lost_count') {
    return step.lostCount
  }

  if (selectedMetric.value === 'avg_duration') {
    return Math.round(step.avgDurationMs / 1000)
  }

  if (selectedMetric.value === 'median_duration') {
    return Math.round(step.medianDurationMs / 1000)
  }

  return step.previousConversionRate
}

const formatSelectedMetricValue = (step: FunnelStepResult): string => {
  if (selectedMetric.value === 'previous_conversion_rate' && step.stepOrder === 1) {
    return '-'
  }

  const value = getStepMetricValue(step)
  if (selectedMetricUnit.value === '%') {
    return `${value}%`
  }

  return `${value.toLocaleString()} ${selectedMetricUnit.value}`
}

const chartStepSeries = computed<Array<{ name: string, steps: FunnelStepResult[] }>>(() => {
  if (!result.value) {
    return []
  }

  return [
    { name: '当前漏斗', steps: result.value.steps },
    ...result.value.comparisonGroups.map((group) => ({
      name: formatGroupValues(group.groupValues),
      steps: group.steps,
    })),
  ]
})

const clampPercent = (value: number): number => Number(Math.min(Math.max(value, 0), 100).toFixed(2))

const getCompareStep = (step: FunnelStepResult): FunnelStepResult => {
  const previousConversionRate = step.stepOrder === 1 ? 100 : clampPercent(step.previousConversionRate + 2.4)
  const overallConversionRate = clampPercent(step.overallConversionRate + 2.1)

  return {
    ...step,
    reachedCount: Math.round(step.reachedCount * 1.08),
    lostCount: Math.round(step.lostCount * 1.06),
    previousConversionRate,
    overallConversionRate,
    previousLostRate: step.stepOrder === 1 ? 0 : Number((100 - previousConversionRate).toFixed(2)),
    overallLostRate: Number((100 - overallConversionRate).toFixed(2)),
    avgDurationMs: Math.round(step.avgDurationMs * 1.12),
    medianDurationMs: Math.round(step.medianDurationMs * 1.08),
    simultaneousMetricValue: step.simultaneousMetricValue ? Math.round(step.simultaneousMetricValue * 1.1) : undefined,
  }
}

const funnelChartOption = computed<EChartsOption>(() => {
  if (!result.value || result.value.steps.length === 0) {
    return {}
  }

  if (analysisMode.value === 'trend') {
    const trend = [...result.value.trend, ...result.value.comparisonTrend]
    const seriesKeys = Array.from(new Set(trend.map((point) => point.seriesKey)))
    return {
      tooltip: { trigger: 'axis' },
      legend: { top: 0, right: 0 },
      grid: { top: 54, left: 56, right: 28, bottom: 48 },
      xAxis: {
        type: 'category',
        data: Array.from(new Set(trend.map((point) => point.timeBucket))).map((date) => date.slice(5)),
      },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: `{value}${selectedMetricUnit.value === '%' ? '%' : ''}` },
      },
      dataZoom: [{ type: 'inside' }, { type: 'slider', bottom: 6, height: 18 }],
      series: seriesKeys.map((key) => ({
        name: key,
        type: 'line',
        smooth: true,
        data: trend
          .filter((point) => point.seriesKey === key)
          .map((point) => selectedMetric.value === 'reached_count'
            ? point.count
            : selectedMetric.value === 'lost_count'
              ? Math.round(point.count * 0.32)
              : selectedMetric.value === 'avg_duration'
                ? 180 + point.value
                : selectedMetric.value === 'median_duration'
                  ? 130 + point.value
                  : point.value),
      })),
    }
  }

  if (analysisMode.value === 'duration') {
    const durationSeries = [
      { name: '当前漏斗', histogram: result.value.duration.histogram },
      ...result.value.comparisonDuration.map((group) => ({
        name: group.groupName,
        histogram: group.histogram,
      })),
    ]
    const histogram = result.value.duration.histogram
    return {
      tooltip: { trigger: 'axis' },
      legend: { top: 0, right: 0 },
      grid: { top: 36, left: 56, right: 28, bottom: 48 },
      xAxis: {
        type: 'category',
        data: histogram.map((bucket) => `${bucket.bucketStart}-${bucket.bucketEnd}s`),
      },
      yAxis: { type: 'value' },
      series: durationSeries.map((series) => ({
          name: series.name,
          type: 'bar',
          data: series.histogram.map((bucket) => selectedMetric.value === 'lost_count'
            ? Math.round(bucket.count * 0.28)
            : selectedMetric.value === 'previous_conversion_rate' || selectedMetric.value === 'overall_conversion_rate'
              ? bucket.ratio
              : bucket.count),
      })),
    }
  }

  if (chartType.value === 'bar') {
    return {
      tooltip: { trigger: 'axis' },
      legend: { top: 0, right: 0 },
      grid: { top: 36, left: 56, right: 28, bottom: 44 },
      xAxis: { type: 'category', data: result.value.steps.map((step) => step.stepName) },
      yAxis: { type: 'value' },
      series: chartStepSeries.value.map((series) => ({
          name: series.name,
          type: 'bar',
          data: series.steps.map(getStepMetricValue),
      })),
    }
  }

  const seriesCount = chartStepSeries.value.length
  return {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: chartStepSeries.value.map((series, index) => {
      const width = Math.max(24, Math.floor(82 / seriesCount))
      const left = seriesCount === 1 ? 8 : 5 + index * (90 / seriesCount)

      return {
        name: series.name,
        type: 'funnel',
        top: 24,
        bottom: 42,
        left: `${left}%`,
        width: `${width}%`,
        sort: 'none',
        gap: 3,
        label: {
          formatter: `{b}\n{c}${selectedMetricUnit.value}`,
        },
        data: series.steps.map((step) => ({
          name: step.stepName,
          value: getStepMetricValue(step),
        })),
      }
    }),
  }
})

const detailRows = computed<FunnelDetailRow[]>(() => {
  if (!result.value) {
    return []
  }

  const withWindowChildren = (group: string, step: FunnelStepResult, sourceSteps: FunnelStepResult[], suffix = ''): FunnelDetailRow => {
    const compareStep = compareMode.value === 'none' ? undefined : getCompareStep(step)
    const row = createDetailRow(group, step, suffix, compareStep)
    const stepIndex = sourceSteps.findIndex((item) => item.stepId === step.stepId)
    const previousStep = stepIndex > 0 ? sourceSteps[stepIndex - 1] : undefined
    const nextStep = stepIndex >= 0 ? sourceSteps[stepIndex + 1] : undefined
    const comparePreviousStep = previousStep ? getCompareStep(previousStep) : undefined
    const compareNextStep = nextStep ? getCompareStep(nextStep) : undefined
    const timeBuckets = getTimeBucketLabels()
    const ratios = getTimeBucketRatios(timeBuckets.length)
    row.children = timeBuckets.map((label, index) => {
      const ratio = ratios[index] ?? 0
      return createDetailRow(
        group,
        createWindowStep(step, ratio, index, previousStep, nextStep),
        `${suffix}_${label}`,
        compareStep ? createWindowStep(compareStep, ratio, index, comparePreviousStep, compareNextStep) : undefined,
        label,
      )
    })

    return row
  }

  if (!result.value.groups.length) {
    return result.value.steps.map((step) => withWindowChildren('全部用户', step, result.value?.steps ?? []))
  }

  return result.value.groups.flatMap((group) =>
    group.steps.map((step) => withWindowChildren(formatGroupValues(group.groupValues), step, group.steps, group.groupKey)),
  )
})

const detailColumns = computed<DataTableColumns<FunnelDetailRow>>(() => {
  const actionColumn: DataTableColumns<FunnelDetailRow>[number] = {
    title: '操作',
    key: 'actions',
    width: 220,
    render: () =>
      h(
        NSpace,
        { size: 8 },
        {
          default: () => [
            h(NButton, { text: true, type: 'primary', onClick: () => openMicroscope() }, { default: () => '显微镜' }),
            h(NButton, { text: true, onClick: () => openUserDrawer('converted') }, { default: () => '查看用户' }),
            h(NButton, { text: true, onClick: () => (showSegmentModal.value = true) }, { default: () => '存为分群' }),
          ],
        },
      ),
  }

  const baseColumns: DataTableColumns<FunnelDetailRow> = [
    {
      title: '分组',
      key: 'group',
      sorter: 'default',
      fixed: 'left',
      width: 120,
    },
    {
      title: '转化窗口',
      key: 'windowBucket',
      sorter: 'default',
      width: 130,
    },
    {
      title: '步骤',
      key: 'stepName',
      sorter: 'default',
      width: 160,
    },
  ]

  if (compareMode.value !== 'none') {
    return [
      ...baseColumns,
      {
        title: `当前指标：${selectedMetricLabel.value}`,
        key: 'selectedMetricCompareGroup',
        children: [
          { title: '当前', key: 'selectedMetricValue', render: (row) => row.selectedMetricValue },
          { title: '对比期', key: 'compareSelectedMetricValue', render: (row) => row.compareSelectedMetricValue ?? '-' },
          { title: '变化', key: 'selectedMetricDelta', render: (row) => row.selectedMetricDelta ?? '-' },
        ],
      },
      {
        title: '触达用户',
        key: 'reachedCompareGroup',
        children: [
          {
            title: '当前',
            key: 'reachedCount',
            sorter: (rowA, rowB) => rowA.reachedCount - rowB.reachedCount,
            render: (row) =>
              h(
                NButton,
                { text: true, type: 'primary', onClick: () => openUserDrawer('reached') },
                { default: () => row.reachedCount.toLocaleString() },
              ),
          },
          { title: '对比期', key: 'compareReachedCount', render: (row) => row.compareReachedCount?.toLocaleString() ?? '-' },
          { title: '变化', key: 'reachedCountDelta', render: (row) => row.reachedCountDelta ?? '-' },
        ],
      },
      {
        title: '流失用户',
        key: 'lostCompareGroup',
        children: [
          {
            title: '当前',
            key: 'lostCount',
            sorter: (rowA, rowB) => rowA.lostCount - rowB.lostCount,
            render: (row) =>
              h(
                NButton,
                { text: true, type: 'error', onClick: () => openUserDrawer('lost') },
                { default: () => row.lostCount.toLocaleString() },
              ),
          },
          { title: '对比期', key: 'compareLostCount', render: (row) => row.compareLostCount?.toLocaleString() ?? '-' },
          { title: '变化', key: 'lostCountDelta', render: (row) => row.lostCountDelta ?? '-' },
        ],
      },
      {
        title: '上步转化率',
        key: 'previousConversionCompareGroup',
        children: [
          { title: '当前', key: 'previousConversionRate', render: (row) => isFirstStepRow(row) ? '-' : `${row.previousConversionRate}%` },
          {
            title: '对比期',
            key: 'comparePreviousConversionRate',
            render: (row) => isFirstStepRow(row)
              ? '-'
              : row.comparePreviousConversionRate !== undefined ? `${row.comparePreviousConversionRate}%` : '-',
          },
          { title: '变化', key: 'previousConversionDelta', render: (row) => row.previousConversionDelta ?? '-' },
        ],
      },
      {
        title: '整体转化率',
        key: 'overallConversionCompareGroup',
        children: [
          { title: '当前', key: 'overallConversionRate', render: (row) => `${row.overallConversionRate}%` },
          { title: '对比期', key: 'compareOverallConversionRate', render: (row) => row.compareOverallConversionRate !== undefined ? `${row.compareOverallConversionRate}%` : '-' },
          { title: '变化', key: 'overallConversionDelta', render: (row) => row.overallConversionDelta ?? '-' },
        ],
      },
      {
        title: '上步流失率',
        key: 'previousLostCompareGroup',
        children: [
          { title: '当前', key: 'previousLostRate', render: (row) => isFirstStepRow(row) ? '-' : `${row.previousLostRate}%` },
          {
            title: '对比期',
            key: 'comparePreviousLostRate',
            render: (row) => isFirstStepRow(row)
              ? '-'
              : row.comparePreviousLostRate !== undefined ? `${row.comparePreviousLostRate}%` : '-',
          },
          { title: '变化', key: 'previousLostDelta', render: (row) => row.previousLostDelta ?? '-' },
        ],
      },
      {
        title: '平均耗时',
        key: 'avgDurationCompareGroup',
        children: [
          { title: '当前', key: 'avgDuration', render: (row) => row.avgDuration },
          { title: '对比期', key: 'compareAvgDuration', render: (row) => row.compareAvgDuration ?? '-' },
          { title: '变化', key: 'avgDurationDelta', render: (row) => row.avgDurationDelta ?? '-' },
        ],
      },
      {
        title: '同时显示指标',
        key: 'simultaneousMetricCompareGroup',
        children: [
          { title: '当前', key: 'simultaneousMetricValue', render: (row) => row.simultaneousMetricValue },
          { title: '对比期', key: 'compareSimultaneousMetricValue', render: (row) => row.compareSimultaneousMetricValue ?? '-' },
          { title: '变化', key: 'simultaneousMetricDelta', render: (row) => row.simultaneousMetricDelta ?? '-' },
        ],
      },
      actionColumn,
    ]
  }

  return [
    ...baseColumns,
    {
      title: `当前指标：${selectedMetricLabel.value}`,
      key: 'selectedMetricValue',
    },
    {
      title: '触达用户',
      key: 'reachedCount',
      sorter: (rowA, rowB) => rowA.reachedCount - rowB.reachedCount,
      render: (row) =>
        h(
          NButton,
          { text: true, type: 'primary', onClick: () => openUserDrawer('reached') },
          { default: () => row.reachedCount.toLocaleString() },
        ),
    },
    {
      title: '流失用户',
      key: 'lostCount',
      sorter: (rowA, rowB) => rowA.lostCount - rowB.lostCount,
      render: (row) =>
        h(
          NButton,
          { text: true, type: 'error', onClick: () => openUserDrawer('lost') },
          { default: () => row.lostCount.toLocaleString() },
        ),
    },
    {
      title: '上步转化率',
      key: 'previousConversionRate',
      sorter: (rowA, rowB) => rowA.previousConversionRate - rowB.previousConversionRate,
      render: (row) => isFirstStepRow(row) ? '-' : `${row.previousConversionRate}%`,
    },
    {
      title: '整体转化率',
      key: 'overallConversionRate',
      sorter: (rowA, rowB) => rowA.overallConversionRate - rowB.overallConversionRate,
      render: (row) => `${row.overallConversionRate}%`,
    },
    {
      title: '上步流失率',
      key: 'previousLostRate',
      sorter: (rowA, rowB) => rowA.previousLostRate - rowB.previousLostRate,
      render: (row) => isFirstStepRow(row) ? '-' : `${row.previousLostRate}%`,
    },
    { title: '平均耗时', key: 'avgDuration' },
    { title: '同时显示指标', key: 'simultaneousMetricValue' },
    actionColumn,
  ]
})

const userColumns: DataTableColumns<FunnelUserRecord> = [
  { title: '用户 ID', key: 'userId', fixed: 'left', width: 130 },
  { title: '首步时间', key: 'firstStepTime', width: 180 },
  { title: '到达时间', key: 'reachedStepTime', width: 180 },
  { title: '流失步骤', key: 'lostAfterStepId', width: 140 },
  {
    title: '转化耗时',
    key: 'durationMs',
    width: 140,
    render: (row) => row.durationMs ? formatDuration(row.durationMs) : '-',
  },
  { title: '分组值', key: 'groupValue', width: 120 },
  { title: '路径', key: 'pathName', width: 140 },
]

const idTypeOptions: Array<SelectOption & { value: FunnelIdType }> = [
  { label: '用户 ID', value: 'user_id' },
  { label: '设备 ID', value: 'device_id' },
  { label: '账号 ID', value: 'account_id' },
  { label: '自定义 ID', value: 'custom_id' },
]

const granularityOptions: Array<SelectOption & { value: FunnelTimeGranularity }> = [
  { label: '分钟', value: 'minute' },
  { label: '小时', value: 'hour' },
  { label: '天', value: 'day' },
  { label: '周', value: 'week' },
  { label: '月', value: 'month', disabled: true },
]

const analysisModeOptions: Array<SelectOption & { value: FunnelAnalysisMode }> = [
  { label: '步骤转化', value: 'steps' },
  { label: '转化趋势', value: 'trend' },
  { label: '转化时长', value: 'duration' },
]

const chartTypeOptions = computed<Array<SelectOption & { value: FunnelChartType }>>(() => {
  if (analysisMode.value === 'trend') {
    return [{ label: '趋势折线图', value: 'line' }]
  }

  if (analysisMode.value === 'duration') {
    return [
      { label: '耗时直方图', value: 'duration_histogram' },
      { label: '耗时箱线统计', value: 'duration_boxplot', disabled: true },
    ]
  }

  return [
    { label: '转化漏斗', value: 'conversion_funnel' },
    { label: '基础漏斗', value: 'basic_funnel' },
    { label: '柱形图', value: 'bar' },
  ]
})

const selectedMetricOptions: Array<SelectOption & { value: FunnelViewConfig['selectedMetric'] }> = [
  { label: '上步转化率', value: 'previous_conversion_rate' },
  { label: '整体转化率', value: 'overall_conversion_rate' },
  { label: '触达人数', value: 'reached_count' },
  { label: '流失人数', value: 'lost_count' },
  { label: '平均耗时', value: 'avg_duration' },
  { label: '中位耗时', value: 'median_duration' },
]

const metricAggregatorOptions: Array<SelectOption & { value: FunnelMetricAggregator }> = [
  { label: '总次数 PV', value: 'PV' },
  { label: '触发用户 UV', value: 'UV' },
  { label: '求和 SUM', value: 'SUM' },
  { label: '平均值 AVG', value: 'AVG' },
  { label: '最大值 MAX', value: 'MAX' },
  { label: '最小值 MIN', value: 'MIN' },
  { label: '中位数 MEDIAN', value: 'MEDIAN' },
  { label: '分位数 PERCENTILE', value: 'PERCENTILE' },
]

const groupSourceOptions: Array<SelectOption & { value: FunnelGroupFieldType }> = [
  { label: '事件属性', value: 'event_property' },
  { label: '用户属性', value: 'user_property' },
  { label: '用户标签', value: 'user_tag' },
  { label: '用户分群', value: 'cohort' },
  { label: '事件时间', value: 'event_time' },
]

const colorPalette = ['#18a058', '#2080f0', '#f0a020', '#d03050', '#8a2be2']

const getOptionLabel = (options: SelectOption[], value: string): string => {
  const option = options.find((item) => String(item.value) === value)
  return typeof option?.label === 'string' ? option.label.split(' ')[0] ?? value : value
}

const formatDateLabel = (timestamp: number): string => dayjs(timestamp).format('YYYY-MM-DD')

const timeRangeLabel = computed(() =>
  `${formatDateLabel(timeRange.value[0])} 至 ${formatDateLabel(timeRange.value[1])}`,
)

const timeShortcutOptions = computed<SelectOption[]>(() => [
  { label: '今天', value: 'today' },
  { label: '昨天', value: 'yesterday' },
  { label: '过去 7 天', value: 'last_7_days' },
  { label: '过去 14 天', value: 'last_14_days' },
  { label: '过去 30 天', value: 'last_30_days' },
  { label: '过去 60 天', value: 'last_60_days' },
  { label: `自定义：${timeRangeLabel.value}`, value: 'custom' },
])

const compareModeOptions = computed<SelectOption[]>(() => [
  { label: '不对比', value: 'none' },
  { label: '上一周期', value: 'previous_period' },
  { label: '自定义时间', value: 'custom' },
])

const selectedFunnel = computed(() =>
  templates.value.find((template) => template.id === selectedFunnelId.value),
)

const selectedFunnelIsMine = computed(() => selectedFunnel.value?.ownerId === 'current_user')
const canSaveCurrentFunnel = computed(() => !selectedFunnel.value || selectedFunnelIsMine.value)

const formatDuration = (ms: number): string => {
  const totalSeconds = Math.round(ms / 1000)
  if (totalSeconds < 60) {
    return `${totalSeconds} 秒`
  }

  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes < 60) {
    return `${minutes} 分 ${seconds} 秒`
  }

  return `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分`
}

const formatGroupValues = (values: Record<string, string | number>): string =>
  Object.entries(values).map(([key, value]) => `${key}: ${value}`).join(' / ') || '全部用户'

const getTimeBucketLabels = (): string[] => {
  const start = dayjs(timeRange.value[0])
  const end = dayjs(timeRange.value[1])

  if (granularity.value === 'minute') {
    const minuteCount = Math.min(end.diff(start, 'minute') + 1, 60)
    return Array.from({ length: Math.max(minuteCount, 1) }, (_, index) =>
      start.add(index, 'minute').format('HH:mm'),
    )
  }

  if (granularity.value === 'hour') {
    return Array.from({ length: 24 }, (_, index) => `${String(index).padStart(2, '0')}:00-${String(index + 1).padStart(2, '0')}:00`)
  }

  if (granularity.value === 'week') {
    const labels: string[] = []
    let cursor = start.startOf('week')
    const finalWeek = end.startOf('week')
    while (cursor.isBefore(finalWeek) || cursor.isSame(finalWeek)) {
      labels.push(`${cursor.format('MM-DD')} 周`)
      cursor = cursor.add(1, 'week')
    }
    return labels
  }

  const labels: string[] = []
  let cursor = start.startOf('day')
  const finalDay = end.startOf('day')
  while (cursor.isBefore(finalDay) || cursor.isSame(finalDay)) {
    labels.push(cursor.format('YYYY-MM-DD'))
    cursor = cursor.add(1, 'day')
  }
  return labels
}

const getTimeBucketRatios = (total: number): number[] => {
  if (total <= 1) {
    return [1]
  }

  const weights = Array.from({ length: total }, (_, index) => {
    if (granularity.value === 'hour') {
      const peak = 14
      const distance = Math.abs(index - peak)
      return 0.45 + Math.max(0, 1 - distance / 14) * 1.25
    }

    return 1 + (index - (total - 1) / 2) * 0.025
  })
  const totalWeight = weights.reduce((sum, weight) => sum + Math.max(weight, 0.1), 0)

  return weights.map((weight) => Number((Math.max(weight, 0.1) / totalWeight).toFixed(5)))
}

const createWindowStep = (
  step: FunnelStepResult,
  ratio: number,
  index: number,
  previousStep?: FunnelStepResult,
  nextStep?: FunnelStepResult,
): FunnelStepResult => {
  const rateOffset = step.stepOrder === 1 ? 0 : ((index % 7) - 3) * 0.38
  const reachedCount = Math.round(step.reachedCount * ratio)
  const previousReachedCount = previousStep ? Math.round(previousStep.reachedCount * ratio) : reachedCount
  const nextReachedCount = nextStep ? Math.round(nextStep.reachedCount * ratio) : reachedCount
  const previousConversionRate = step.stepOrder === 1
    ? 100
    : Number(Math.min(Math.max((reachedCount / Math.max(previousReachedCount, 1)) * 100 + rateOffset, 0), 100).toFixed(2))
  const overallConversionRate = Number(Math.min(Math.max(step.overallConversionRate + rateOffset * 0.8, 0), 100).toFixed(2))
  const durationFactor = 0.92 + (index % 6) * 0.035

  return {
    ...step,
    reachedCount,
    lostCount: nextStep ? Math.max(reachedCount - nextReachedCount, 0) : 0,
    previousConversionRate,
    overallConversionRate,
    previousLostRate: Number((100 - previousConversionRate).toFixed(2)),
    overallLostRate: Number((100 - overallConversionRate).toFixed(2)),
    avgDurationMs: Math.round(step.avgDurationMs * durationFactor),
    medianDurationMs: Math.round(step.medianDurationMs * durationFactor),
    simultaneousMetricValue: step.simultaneousMetricValue ? Math.round(step.simultaneousMetricValue * ratio) : undefined,
  }
}

const formatCountDelta = (current: number, compare?: number): string | undefined => {
  if (compare === undefined || compare === 0) {
    return undefined
  }

  const rate = Number((((current - compare) / compare) * 100).toFixed(2))
  return `${rate > 0 ? '+' : ''}${rate}%`
}

const formatPointDelta = (current: number, compare?: number): string | undefined => {
  if (compare === undefined) {
    return undefined
  }

  const delta = Number((current - compare).toFixed(2))
  return `${delta > 0 ? '+' : ''}${delta}pp`
}

const formatDurationDelta = (currentMs: number, compareMs?: number): string | undefined => {
  if (compareMs === undefined || compareMs === 0) {
    return undefined
  }

  const rate = Number((((currentMs - compareMs) / compareMs) * 100).toFixed(2))
  return `${rate > 0 ? '+' : ''}${rate}%`
}

const formatCompareMetricValue = (step: FunnelStepResult | undefined): string | undefined =>
  step ? formatSelectedMetricValue(step) : undefined

const formatSelectedMetricDelta = (step: FunnelStepResult, compareStep?: FunnelStepResult): string | undefined => {
  if (!compareStep) {
    return undefined
  }

  if (selectedMetric.value === 'previous_conversion_rate' && step.stepOrder === 1) {
    return undefined
  }

  if (selectedMetric.value === 'reached_count') {
    return formatCountDelta(step.reachedCount, compareStep.reachedCount)
  }

  if (selectedMetric.value === 'lost_count') {
    return formatCountDelta(step.lostCount, compareStep.lostCount)
  }

  if (selectedMetric.value === 'avg_duration') {
    return formatDurationDelta(step.avgDurationMs, compareStep.avgDurationMs)
  }

  if (selectedMetric.value === 'median_duration') {
    return formatDurationDelta(step.medianDurationMs, compareStep.medianDurationMs)
  }

  return formatPointDelta(getStepMetricValue(step), getStepMetricValue(compareStep))
}

const isFirstStepRow = (row: FunnelDetailRow): boolean =>
  result.value?.steps[0]?.stepName === row.stepName

const createDetailRow = (
  group: string,
  step: FunnelStepResult,
  suffix = '',
  compareStep?: FunnelStepResult,
  windowBucket = '总计',
): FunnelDetailRow => ({
  key: `${suffix}_${step.stepId}_${windowBucket}`,
  stepId: step.stepId,
  group,
  windowBucket,
  stepName: step.stepName,
  reachedCount: step.reachedCount,
  lostCount: step.lostCount,
  previousConversionRate: step.previousConversionRate,
  overallConversionRate: step.overallConversionRate,
  previousLostRate: step.previousLostRate,
  avgDuration: formatDuration(step.avgDurationMs),
  selectedMetricValue: formatSelectedMetricValue(step),
  compareSelectedMetricValue: formatCompareMetricValue(compareStep),
  selectedMetricDelta: formatSelectedMetricDelta(step, compareStep),
  compareReachedCount: compareStep?.reachedCount,
  reachedCountDelta: formatCountDelta(step.reachedCount, compareStep?.reachedCount),
  compareLostCount: compareStep?.lostCount,
  lostCountDelta: formatCountDelta(step.lostCount, compareStep?.lostCount),
  comparePreviousConversionRate: compareStep?.previousConversionRate,
  previousConversionDelta: step.stepOrder === 1 ? undefined : formatPointDelta(step.previousConversionRate, compareStep?.previousConversionRate),
  compareOverallConversionRate: compareStep?.overallConversionRate,
  overallConversionDelta: formatPointDelta(step.overallConversionRate, compareStep?.overallConversionRate),
  comparePreviousLostRate: compareStep?.previousLostRate,
  previousLostDelta: step.stepOrder === 1 ? undefined : formatPointDelta(step.previousLostRate, compareStep?.previousLostRate),
  compareAvgDuration: compareStep ? formatDuration(compareStep.avgDurationMs) : undefined,
  avgDurationDelta: formatDurationDelta(step.avgDurationMs, compareStep?.avgDurationMs),
  compareSimultaneousMetricValue: compareStep?.simultaneousMetricValue ?? '-',
  simultaneousMetricDelta: typeof step.simultaneousMetricValue === 'number' && typeof compareStep?.simultaneousMetricValue === 'number'
    ? formatCountDelta(step.simultaneousMetricValue, compareStep.simultaneousMetricValue)
    : undefined,
  simultaneousMetricValue: step.simultaneousMetricValue ?? '-',
})

const cloneFilters = (filters: FilterCondition[]): FilterCondition[] =>
  filters.map((filter) => ({
    ...filter,
    childFilters: filter.childFilters ? cloneFilters(filter.childFilters) : undefined,
  }))

const appendChildFilter = (filters: FilterCondition[], parentId: string, childFilter: FilterCondition): FilterCondition[] =>
  filters.map((filter) => {
    if (filter.id === parentId) {
      return {
        ...filter,
        childFilters: [...filter.childFilters ?? [], childFilter],
      }
    }

    return {
      ...filter,
      childFilters: filter.childFilters ? appendChildFilter(filter.childFilters, parentId, childFilter) : undefined,
    }
  })

const removeChildFilterById = (filters: FilterCondition[], filterId: string): FilterCondition[] =>
  filters
    .filter((filter) => filter.id !== filterId)
    .map((filter) => ({
      ...filter,
      childFilters: filter.childFilters ? removeChildFilterById(filter.childFilters, filterId) : undefined,
    }))

const cloneStep = (step: FunnelStep, order: number): FunnelStep => {
  const stepId = `funnel_step_${Date.now()}_${order}`
  return {
    ...step,
    id: stepId,
    order,
    filters: cloneFilters(step.filters),
    simultaneousMetric: step.simultaneousMetric
      ? {
          ...step.simultaneousMetric,
          id: `step_metric_${Date.now()}_${order}`,
          stepId,
          filters: cloneFilters(step.simultaneousMetric.filters),
        }
      : undefined,
  }
}

const markDirty = (): void => {
  if (queryState.value !== 'loading') {
    queryState.value = 'dirty'
    notice.value = '配置已修改，请点击开始分析刷新结果。'
  }
}

let funnelStepSeed = 0

const createBlankStep = (order = steps.value.length + 1): FunnelStep => ({
  id: `funnel_step_${Date.now()}_${funnelStepSeed += 1}_${order}`,
  order,
  eventName: '',
  eventDisplayName: '',
  alias: `步骤 ${order}`,
  filters: [],
})

const syncStepOrders = (nextSteps: FunnelStep[]): FunnelStep[] =>
  nextSteps.map((step, index) => ({
    ...step,
    order: index + 1,
    alias: step.alias || `步骤 ${index + 1}`,
  }))

const addStep = (): void => {
  steps.value = [...steps.value, createBlankStep(steps.value.length + 1)]
  markDirty()
}

const removeStep = (stepId: string): void => {
  if (steps.value.length <= 1) {
    errorMessage.value = '至少保留一个步骤，开始分析时需要配置不少于两个有效步骤。'
    return
  }
  steps.value = syncStepOrders(steps.value.filter((step) => step.id !== stepId))
  markDirty()
}

const copyStep = (step: FunnelStep): void => {
  const index = steps.value.findIndex((item) => item.id === step.id)
  const copiedStep: FunnelStep = {
    ...step,
    id: `funnel_step_${Date.now()}`,
    alias: `${step.alias || step.eventDisplayName} 副本`,
    filters: cloneFilters(step.filters),
  }
  const nextSteps = [...steps.value]
  nextSteps.splice(index + 1, 0, copiedStep)
  steps.value = syncStepOrders(nextSteps)
  markDirty()
}

const moveStep = (stepId: string, direction: -1 | 1): void => {
  const index = steps.value.findIndex((step) => step.id === stepId)
  const nextIndex = index + direction
  if (index < 0 || nextIndex < 0 || nextIndex >= steps.value.length) {
    return
  }
  const nextSteps = [...steps.value]
  const current = nextSteps[index]
  const target = nextSteps[nextIndex]
  if (!current || !target) {
    return
  }
  nextSteps[index] = target
  nextSteps[nextIndex] = current
  steps.value = syncStepOrders(nextSteps)
  markDirty()
}

const updateStepEvent = (stepId: string, eventName: string): void => {
  const event = metadataEvents.value.find((item) => item.eventName === eventName)
  steps.value = steps.value.map((step) =>
    step.id === stepId
      ? {
          ...step,
          eventName,
          eventDisplayName: event?.displayName ?? eventName,
          alias: step.alias.startsWith('步骤 ') ? event?.displayName ?? eventName : step.alias,
          filters: [],
        }
      : step,
  )
  markDirty()
}

const updateStepAlias = (stepId: string, alias: string): void => {
  steps.value = steps.value.map((step) => step.id === stepId ? { ...step, alias } : step)
  markDirty()
}

const applyTemplate = (template: FunnelTemplate, closeModal = true): void => {
  funnelMode.value = template.config.funnelMode
  calculationType.value = template.config.calculationType
  Object.assign(conversionWindow, template.config.conversionWindow)
  steps.value = template.config.steps.map((step, index) => cloneStep(step, index + 1))
  relationProperties.value = template.config.relationProperties.map((relation) => ({
    ...relation,
    stepMappings: relation.stepMappings.map((mapping) => ({ ...mapping })),
  }))
  multiPathEnabled.value = false
  multiPathVariants.value = []
  showTemplateModal.value = !closeModal && showTemplateModal.value
  markDirty()
  runAnalysis()
}

const resetFilterDraft = (target: FunnelFilterTarget): void => {
  filterTarget.value = target
  filterDraft.logic = 'AND'
  filterDraft.sourceType = target === 'step' || target === 'metric' ? 'event_property' : 'user_property'
  filterDraft.field = ''
  filterDraft.operator = 'equals'
  filterDraft.valueText = ''
}

const openFilterModal = (target: FunnelFilterTarget, stepId = '', groupId = ''): void => {
  resetFilterDraft(target)
  filterTargetStepId.value = stepId
  metricTargetStepId.value = target === 'metric' ? stepId : metricTargetStepId.value
  filterTargetGroupId.value = groupId
  filterParentId.value = ''
  showFilterModal.value = true
}

const openChildFilterModal = (target: Extract<FunnelFilterTarget, 'global' | 'step'>, parentId: string, stepId = ''): void => {
  resetFilterDraft(target)
  filterTargetStepId.value = stepId
  filterTargetGroupId.value = ''
  filterParentId.value = parentId
  showFilterModal.value = true
}

const syncFilterDraftSource = (value: string): void => {
  filterDraft.sourceType = value as FilterSourceType
  filterDraft.field = ''
  filterDraft.valueText = ''
  filterDraft.operator = value === 'segment' ? 'in' : value === 'behavior' ? 'done' : 'equals'
}

const saveFilterCondition = (): void => {
  if (!filterDraft.field) {
    errorMessage.value = '请选择筛选字段。'
    return
  }

  if (filterDraft.sourceType !== 'behavior' && filterDraft.sourceType !== 'dynamic_match' && !filterDraft.valueText.trim()) {
    errorMessage.value = '请输入筛选值。'
    return
  }

  const fieldDisplayName = getOptionLabel(filterFieldOptions.value, filterDraft.field)
  const condition: FilterCondition = {
    id: `funnel_filter_${Date.now()}`,
    sourceType: filterDraft.sourceType,
    field: filterDraft.field,
    fieldDisplayName,
    operator: filterDraft.operator,
    value: filterDraft.sourceType === 'segment' ? filterDraft.field : filterDraft.valueText.trim() || filterDraft.field,
    displayValue: filterDraft.sourceType === 'behavior'
      ? `过去 7 天${filterDraft.operator === 'not_done' ? '没做过' : '做过'} ${fieldDisplayName}`
      : filterDraft.valueText.trim() || fieldDisplayName,
    logic: filterDraft.logic,
    eventName: filterDraft.sourceType === 'behavior' ? filterDraft.field : undefined,
    behaviorType: filterDraft.sourceType === 'behavior' ? 'done' : undefined,
    timeWindowDays: filterDraft.sourceType === 'behavior' ? 7 : undefined,
    matchEventName: filterDraft.sourceType === 'dynamic_match' ? filterDraft.field : undefined,
    matchMode: filterDraft.sourceType === 'dynamic_match' ? 'event_day' : undefined,
  }

  if (filterParentId.value && filterTarget.value === 'step') {
    steps.value = steps.value.map((step) =>
      step.id === filterTargetStepId.value
        ? { ...step, filters: appendChildFilter(step.filters, filterParentId.value, condition) }
        : step,
    )
  } else if (filterParentId.value && filterTarget.value === 'global') {
    globalFilters.value = appendChildFilter(globalFilters.value, filterParentId.value, condition)
  } else if (filterTarget.value === 'step') {
    steps.value = steps.value.map((step) =>
      step.id === filterTargetStepId.value ? { ...step, filters: [...step.filters, condition] } : step,
    )
  } else if (filterTarget.value === 'comparison') {
    if (filterTargetGroupId.value === 'draft') {
      comparisonDraft.filters = [...comparisonDraft.filters, condition]
    } else {
      comparisonGroups.value = comparisonGroups.value.map((group) =>
        group.id === filterTargetGroupId.value ? { ...group, filters: [...group.filters, condition] } : group,
      )
    }
  } else if (filterTarget.value === 'metric') {
    steps.value = steps.value.map((step) =>
      step.id === metricTargetStepId.value && step.simultaneousMetric
        ? {
            ...step,
            simultaneousMetric: {
              ...step.simultaneousMetric,
              filters: [...step.simultaneousMetric.filters, condition],
            },
          }
        : step,
    )
  } else {
    globalFilters.value = [...globalFilters.value, condition]
  }

  showFilterModal.value = false
  filterParentId.value = ''
  markDirty()
}

const removeGlobalFilter = (filterId: string): void => {
  globalFilters.value = removeChildFilterById(globalFilters.value, filterId)
  markDirty()
}

const removeStepFilter = (stepId: string, filterId: string): void => {
  steps.value = steps.value.map((step) =>
    step.id === stepId ? { ...step, filters: removeChildFilterById(step.filters, filterId) } : step,
  )
  markDirty()
}

const openGroupModal = (): void => {
  groupDraft.fieldType = 'user_property'
  groupDraft.fieldName = ''
  groupDraft.groupMode = 'single'
  groupDraft.selectedValuesText = ''
  showGroupModal.value = true
}

const saveGroupBy = (): void => {
  if (!groupDraft.fieldName) {
    errorMessage.value = '请选择分组字段。'
    return
  }

  if (groupBys.value.length >= 5) {
    errorMessage.value = 'Demo 阶段最多支持 5 个属性分组。'
    return
  }

  groupBys.value = [
    ...groupBys.value,
    {
      id: `funnel_group_${Date.now()}`,
      fieldType: groupDraft.fieldType,
      fieldName: groupDraft.fieldName,
      displayName: getOptionLabel(groupFieldOptions.value, groupDraft.fieldName),
      groupMode: groupDraft.groupMode,
      selectedValues: groupDraft.selectedValuesText
        .split('\n')
        .map((value) => value.trim())
        .filter(Boolean),
    },
  ]
  showGroupModal.value = false
  markDirty()
}

const removeGroupBy = (groupId: string): void => {
  groupBys.value = groupBys.value.filter((group) => group.id !== groupId)
  markDirty()
}

const getRelationPropertySourceOptions = (stepId: string, sourceType: FunnelRelationPropertySourceType): SelectOption[] => {
  if (sourceType === 'event_property') {
    return relationPropertyOptionsByStep.value[stepId] ?? []
  }

  if (sourceType === 'common_property') {
    return commonPropertyOptions.value
  }

  if (sourceType === 'user_property') {
    return userPropertyOptions.value
  }

  if (sourceType === 'user_tag') {
    return userTagOptions.value
  }

  return virtualPropertyOptions.value
}

const getRelationEventProperty = (stepId: string, propertyName: string): EventProperty | undefined =>
  getStepEventProperties(stepId).find((property) => property.propertyName === propertyName)

const getCommonProperty = (propertyName: string): EventProperty | undefined =>
  metadataEvents.value
    .flatMap((event) => event.properties)
    .find((property) => property.propertyType === 'common_property' && property.propertyName === propertyName)

const getRelationPropertyMeta = (
  stepId: string,
  sourceType: FunnelRelationPropertySourceType,
  propertyName: string,
): { displayName: string, dataType: EventPropertyDataType } => {
  if (sourceType === 'event_property') {
    const property = getRelationEventProperty(stepId, propertyName)
    return {
      displayName: property?.displayName ?? propertyName,
      dataType: property?.dataType ?? 'string',
    }
  }

  if (sourceType === 'common_property') {
    const property = getCommonProperty(propertyName)
    return {
      displayName: property?.displayName ?? propertyName,
      dataType: property?.dataType ?? 'string',
    }
  }

  if (sourceType === 'user_property') {
    const property = metadataUserAttributes.value.find((item) => item.field === propertyName)
    return {
      displayName: property?.displayName ?? propertyName,
      dataType: property?.dataType ?? 'string',
    }
  }

  if (sourceType === 'user_tag') {
    const tag = metadataUserTags.value.find((item) => item.field === propertyName)
    return {
      displayName: tag?.displayName ?? propertyName,
      dataType: 'string',
    }
  }

  const virtualProperty = virtualRelationProperties.find((property) => property.propertyName === propertyName)
  return {
    displayName: virtualProperty?.displayName ?? propertyName,
    dataType: virtualProperty?.dataType ?? 'string',
  }
}

const getPropertyDisplayName = (mapping: FunnelRelationPropertyMapping): string =>
  mapping.propertyDisplayName || getRelationPropertyMeta(mapping.stepId, mapping.propertySource, mapping.propertyName).displayName

const openRelationModal = (relation?: FunnelRelationProperty): void => {
  relationDraft.id = relation?.id ?? ''
  relationDraft.mappings = steps.value.map((step) => {
    const existing = relation?.stepMappings.find((mapping) => mapping.stepId === step.id)
    return {
      stepId: step.id,
      propertySource: existing?.propertySource ?? 'event_property',
      propertyName: existing?.propertyName ?? '',
      propertyDisplayName: existing?.propertyDisplayName ?? '',
      propertyType: existing?.propertyType ?? 'string',
    }
  })
  showRelationModal.value = true
}

const updateRelationMappingSource = (stepId: string, propertySource: FunnelRelationPropertySourceType): void => {
  relationDraft.mappings = relationDraft.mappings.map((mapping) =>
    mapping.stepId === stepId
      ? {
          ...mapping,
          propertySource,
          propertyName: '',
          propertyDisplayName: '',
          propertyType: 'string',
        }
      : mapping,
  )
}

const updateRelationMapping = (stepId: string, propertyName: string): void => {
  relationDraft.mappings = relationDraft.mappings.map((mapping) =>
    {
      if (mapping.stepId !== stepId) {
        return mapping
      }

      const meta = getRelationPropertyMeta(stepId, mapping.propertySource, propertyName)
      return {
        ...mapping,
        propertyName,
        propertyDisplayName: meta.displayName,
        propertyType: meta.dataType,
      }
    },
  )
}

const saveRelationProperty = (): void => {
  const mappings = relationDraft.mappings.filter((mapping) => mapping.propertyName)
  if (mappings.length < 2) {
    errorMessage.value = '关联属性至少需要选择两个步骤的属性。'
    return
  }

  const firstType = mappings[0]?.propertyType
  if (!firstType || mappings.some((mapping) => mapping.propertyType !== firstType)) {
    errorMessage.value = '关联属性要求各步骤属性类型一致。'
    return
  }

  const relation: FunnelRelationProperty = {
    id: relationDraft.id || `funnel_relation_${Date.now()}`,
    relationMode: 'all_equal',
    stepMappings: mappings,
  }

  relationProperties.value = relationDraft.id
    ? relationProperties.value.map((item) => item.id === relationDraft.id ? relation : item)
    : [...relationProperties.value, relation]
  showRelationModal.value = false
  markDirty()
}

const removeRelationProperty = (relationId: string): void => {
  relationProperties.value = relationProperties.value.filter((relation) => relation.id !== relationId)
  markDirty()
}

const openMultiPathModal = (path?: FunnelPathVariant): void => {
  pathDraft.id = path?.id ?? ''
  pathDraft.name = path?.name ?? `替代路径 ${multiPathVariants.value.length + 1}`
  pathDraft.changedStepOrder = path?.changedStepOrder ?? Math.min(2, Math.max(1, steps.value.length))
  pathDraft.eventName = path?.eventName ?? ''
  showMultiPathModal.value = true
}

const saveMultiPath = (): void => {
  if (!pathDraft.eventName) {
    errorMessage.value = '请选择替代路径事件。'
    return
  }

  if (!getStepByOrder(pathDraft.changedStepOrder)) {
    errorMessage.value = '请选择要替换的步骤。'
    return
  }

  const event = getEventByName(pathDraft.eventName)
  const path: FunnelPathVariant = {
    id: pathDraft.id || `funnel_path_${Date.now()}`,
    name: pathDraft.name.trim() || event?.displayName || '替代路径',
    changedStepOrder: pathDraft.changedStepOrder,
    eventName: pathDraft.eventName,
    eventDisplayName: event?.displayName ?? pathDraft.eventName,
  }

  multiPathVariants.value = pathDraft.id
    ? multiPathVariants.value.map((item) => item.id === pathDraft.id ? path : item)
    : [...multiPathVariants.value, path]
  multiPathEnabled.value = true
  showMultiPathModal.value = false
  markDirty()
}

const removeMultiPath = (pathId: string): void => {
  multiPathVariants.value = multiPathVariants.value.filter((path) => path.id !== pathId)
  if (!multiPathVariants.value.length) {
    multiPathEnabled.value = false
  }
  markDirty()
}

const applyTimeShortcut = (value: string): void => {
  timeShortcut.value = value
  const today = dayjs('2026-05-20')

  if (value === 'custom') {
    showTimeRangePopover.value = true
    return
  }

  if (value === 'today') {
    timeRange.value = [today.startOf('day').valueOf(), today.endOf('day').valueOf()]
  } else if (value === 'yesterday') {
    const yesterday = today.subtract(1, 'day')
    timeRange.value = [yesterday.startOf('day').valueOf(), yesterday.endOf('day').valueOf()]
  } else {
    const days = Number(value.replace('last_', '').replace('_days', ''))
    timeRange.value = [today.subtract(days - 1, 'day').startOf('day').valueOf(), today.endOf('day').valueOf()]
  }

  markDirty()
}

const syncCustomTimeRange = (): void => {
  timeShortcut.value = 'custom'
  markDirty()
}

const confirmCustomTimeRange = (): void => {
  if (granularity.value === 'minute' && dayjs(timeRange.value[1]).diff(dayjs(timeRange.value[0]), 'minute') > 60) {
    errorMessage.value = '分钟粒度仅支持选择 1 小时内的时间范围。'
    return
  }
  syncCustomTimeRange()
  showTimeRangePopover.value = false
}

const applyGranularity = (value: FunnelTimeGranularity): void => {
  granularity.value = value
  if (value === 'minute' && dayjs(timeRange.value[1]).diff(dayjs(timeRange.value[0]), 'minute') > 60) {
    const end = dayjs('2026-05-20 10:00:00')
    timeRange.value = [end.subtract(59, 'minute').valueOf(), end.valueOf()]
    timeShortcut.value = 'custom'
    notice.value = '分钟粒度已自动切换为最近 1 小时范围。'
  }
  markDirty()
}

const applyCompareMode = (value: FunnelCompareSelectValue): void => {
  compareMode.value = value
  showCompareTimePopover.value = value === 'custom'
  markDirty()
}

const confirmCustomCompareTimeRange = (): void => {
  compareMode.value = 'custom'
  showCompareTimePopover.value = false
  markDirty()
}

const startEditFunnelName = (templateId?: string): void => {
  const target = templateId
    ? templates.value.find((template) => template.id === templateId)
    : selectedFunnel.value

  if (target && target.ownerId !== 'current_user') {
    errorMessage.value = '别人分享给你的漏斗没有修改名称权限，请先另存为自己的漏斗。'
    return
  }

  funnelRenameTarget.value = target ?? null
  funnelNameDraft.value = target?.name ?? funnelName.value
  showRenameFunnelModal.value = true
}

const cancelEditFunnelName = (): void => {
  funnelNameDraft.value = ''
  funnelRenameTarget.value = null
  showRenameFunnelModal.value = false
}

const confirmEditFunnelName = (): void => {
  const nextName = funnelNameDraft.value.trim()
  if (!nextName) {
    errorMessage.value = '请输入漏斗名称。'
    return
  }

  const target = funnelRenameTarget.value
  if (target) {
    templates.value = templates.value.map((template) => template.id === target.id ? { ...template, name: nextName } : template)
    if (selectedFunnelId.value === target.id) {
      funnelName.value = nextName
    }
  } else {
    funnelName.value = nextName
  }

  funnelRenameTarget.value = null
  showRenameFunnelModal.value = false
  markDirty()
}

const saveCurrentFunnel = (): void => {
  if (!funnelName.value.trim()) {
    errorMessage.value = '请输入漏斗名称。'
    return
  }

  if (!canSaveCurrentFunnel.value) {
    errorMessage.value = '别人分享给你的漏斗不能直接保存，请使用「漏斗另存为」保存为自己的漏斗。'
    return
  }

  const existing = templates.value.find((template) => template.id === selectedFunnelId.value && template.ownerId === 'current_user')
  const savedTemplate: FunnelTemplate = {
    id: existing?.id ?? `funnel_user_${Date.now()}`,
    name: funnelName.value.trim(),
    description: '用户保存的漏斗配置，可继续编辑、复用和分享。',
    category: '自定义',
    ownerId: 'current_user',
    visibility: 'private',
    config: {
      funnelMode: funnelMode.value,
      calculationType: calculationType.value,
      conversionWindow: { ...conversionWindow },
      steps: validSteps.value.map((step, index) => ({ ...step, order: index + 1, filters: cloneFilters(step.filters) })),
      relationProperties: relationProperties.value.map((relation) => ({
        ...relation,
        stepMappings: relation.stepMappings.map((mapping) => ({ ...mapping })),
      })),
    },
    createdAt: existing?.createdAt ?? '2026-05-20T10:00:00+02:00',
    updatedAt: '2026-05-20T10:00:00+02:00',
  }

  templates.value = existing
    ? templates.value.map((template) => template.id === existing.id ? savedTemplate : template)
    : [savedTemplate, ...templates.value]
  selectedFunnelId.value = savedTemplate.id
  notice.value = `漏斗「${savedTemplate.name}」已保存。`
}

const createNewFunnel = (): void => {
  selectedFunnelId.value = ''
  funnelName.value = `未命名漏斗 ${templates.value.filter((template) => template.ownerId === 'current_user').length + 1}`
  steps.value = [createBlankStep(1), createBlankStep(2)]
  stepsExpanded.value = true
  activeStepId.value = steps.value[0]?.id ?? ''
  relationProperties.value = []
  multiPathEnabled.value = false
  multiPathVariants.value = []
  result.value = null
  markDirty()
}

const duplicateCurrentFunnel = (): void => {
  const source = selectedFunnel.value
  const copyName = `${funnelName.value || source?.name || '未命名漏斗'} 副本`
  const copiedTemplate: FunnelTemplate = {
    id: `funnel_user_copy_${Date.now()}`,
    name: copyName,
    description: source?.description ?? '从当前漏斗另存生成。',
    category: source?.category ?? '自定义',
    ownerId: 'current_user',
    visibility: 'private',
    config: {
      funnelMode: funnelMode.value,
      calculationType: calculationType.value,
      conversionWindow: { ...conversionWindow },
      steps: validSteps.value.map((step, index) => ({ ...step, order: index + 1, filters: cloneFilters(step.filters) })),
      relationProperties: relationProperties.value.map((relation) => ({
        ...relation,
        stepMappings: relation.stepMappings.map((mapping) => ({ ...mapping })),
      })),
    },
    createdAt: '2026-05-20T10:00:00+02:00',
    updatedAt: '2026-05-20T10:00:00+02:00',
  }
  templates.value = [copiedTemplate, ...templates.value]
  selectedFunnelId.value = copiedTemplate.id
  funnelName.value = copiedTemplate.name
  notice.value = `已另存为「${copiedTemplate.name}」。`
}

const deleteCurrentFunnel = (templateId?: string): void => {
  const current = templates.value.find((template) => template.id === (templateId ?? selectedFunnelId.value))
  if (!current) {
    errorMessage.value = '请先选择要删除的漏斗。'
    return
  }

  if (current.ownerId !== 'current_user') {
    errorMessage.value = '别人分享给你的漏斗不能删除，可以另存为自己的漏斗。'
    return
  }

  funnelPendingDelete.value = current
  showDeleteFunnelModal.value = true
}

const confirmDeleteCurrentFunnel = (): void => {
  const current = funnelPendingDelete.value
  if (!current) {
    return
  }

  templates.value = templates.value.filter((template) => template.id !== current.id)
  deletedFunnels.value = [current, ...deletedFunnels.value.filter((template) => template.id !== current.id)].slice(0, 7)
  if (selectedFunnelId.value === current.id) {
    selectedFunnelId.value = ''
    funnelName.value = `未命名漏斗 ${templates.value.filter((template) => template.ownerId === 'current_user').length + 1}`
    steps.value = [createBlankStep(1), createBlankStep(2)]
    result.value = null
  }
  funnelPendingDelete.value = null
  showDeleteFunnelModal.value = false
  notice.value = `漏斗「${current.name}」已删除，可在最近删除中恢复。`
}

const restoreDeletedFunnel = (templateId: string): void => {
  const deleted = deletedFunnels.value.find((template) => template.id === templateId)
  if (!deleted) {
    return
  }

  deletedFunnels.value = deletedFunnels.value.filter((template) => template.id !== templateId)
  templates.value = [deleted, ...templates.value]
  selectedFunnelId.value = deleted.id
  funnelName.value = deleted.name
  applyTemplate(deleted, false)
  notice.value = `漏斗「${deleted.name}」已恢复。`
}

const openPurgeFunnelModal = (templateId: string): void => {
  const deleted = deletedFunnels.value.find((template) => template.id === templateId)
  if (!deleted) {
    return
  }

  funnelPendingPurge.value = deleted
  showPurgeFunnelModal.value = true
}

const confirmPurgeFunnel = (): void => {
  const deleted = funnelPendingPurge.value
  if (!deleted) {
    return
  }

  deletedFunnels.value = deletedFunnels.value.filter((template) => template.id !== deleted.id)
  funnelPendingPurge.value = null
  showPurgeFunnelModal.value = false
  notice.value = `漏斗「${deleted.name}」已彻底删除。`
}

const shareCurrentFunnel = (templateId?: string): void => {
  const current = templateId
    ? templates.value.find((template) => template.id === templateId)
    : selectedFunnel.value
  if (!current) {
    errorMessage.value = '请先选择要分享的漏斗。'
    return
  }

  funnelPendingShare.value = current
  showShareFunnelModal.value = true
}

const confirmShareFunnel = (): void => {
  const members = [...shareFunnelForm.members]
  const teams = [...shareFunnelForm.teams]

  if (!members.length && !teams.length) {
    errorMessage.value = '请至少填写一个成员或团队。'
    return
  }

  showShareFunnelModal.value = false
  notice.value = `漏斗「${funnelPendingShare.value?.name ?? funnelName.value}」已分享给 ${members.length} 个成员、${teams.length} 个团队。`
  funnelPendingShare.value = null
}

const switchFunnel = (funnelId: FunnelSelectValue): void => {
  if (funnelId === CREATE_FUNNEL_SELECT_VALUE) {
    createNewFunnel()
    return
  }

  if (funnelId === DRAFT_FUNNEL_SELECT_VALUE || funnelId.startsWith(DELETED_FUNNEL_SELECT_PREFIX)) {
    return
  }

  const template = templates.value.find((item) => item.id === funnelId)
  if (!template) {
    return
  }

  selectedFunnelId.value = funnelId
  funnelName.value = template.name
  applyTemplate(template, false)
}

const openComparisonModal = (group?: FunnelComparisonGroup): void => {
  if (group) {
    comparisonDraft.id = group.id
    comparisonDraft.name = group.name
    comparisonDraft.color = group.color
    comparisonDraft.enabled = group.enabled
    comparisonDraft.filters = cloneFilters(group.filters)
  } else {
    comparisonDraft.id = ''
    comparisonDraft.name = `对照组 ${comparisonGroups.value.length + 1}`
    comparisonDraft.color = colorPalette[comparisonGroups.value.length % colorPalette.length] ?? '#18a058'
    comparisonDraft.enabled = true
    comparisonDraft.filters = []
  }
  showComparisonModal.value = true
}

const saveComparisonGroup = (): void => {
  if (!comparisonDraft.name.trim()) {
    errorMessage.value = '请输入对照组名称。'
    return
  }

  const savedGroup: FunnelComparisonGroup = {
    id: comparisonDraft.id || `funnel_compare_${Date.now()}`,
    name: comparisonDraft.name.trim(),
    color: comparisonDraft.color,
    enabled: comparisonDraft.enabled,
    filters: cloneFilters(comparisonDraft.filters),
  }

  comparisonGroups.value = comparisonDraft.id
    ? comparisonGroups.value.map((group) => group.id === comparisonDraft.id ? savedGroup : group)
    : [...comparisonGroups.value, savedGroup]
  showComparisonModal.value = false
  markDirty()
}

const copyComparisonGroup = (group: FunnelComparisonGroup): void => {
  comparisonGroups.value = [
    ...comparisonGroups.value,
    {
      ...group,
      id: `funnel_compare_${Date.now()}`,
      name: `${group.name} 副本`,
      color: colorPalette[comparisonGroups.value.length % colorPalette.length] ?? '#18a058',
      filters: cloneFilters(group.filters),
    },
  ]
  markDirty()
}

const removeComparisonGroup = (groupId: string): void => {
  comparisonGroups.value = comparisonGroups.value.filter((group) => group.id !== groupId)
  markDirty()
}

const toggleComparisonGroup = (groupId: string, enabled: boolean): void => {
  comparisonGroups.value = comparisonGroups.value.map((group) => group.id === groupId ? { ...group, enabled } : group)
  markDirty()
}

const openStepMetricModal = (step: FunnelStep): void => {
  metricTargetStepId.value = step.id
  metricDraft.metricName = step.simultaneousMetric?.metricName ?? `${step.alias || step.eventDisplayName}业务指标`
  metricDraft.eventName = step.simultaneousMetric?.eventName ?? step.eventName
  metricDraft.aggregator = step.simultaneousMetric?.aggregator ?? 'PV'
  metricDraft.propertyName = step.simultaneousMetric?.propertyName ?? ''
  metricDraft.percentile = step.simultaneousMetric?.percentile ?? 90
  showMetricModal.value = true
}

const syncMetricEvent = (eventName: string): void => {
  metricDraft.eventName = eventName
  metricDraft.propertyName = ''
}

const saveStepMetric = (): void => {
  const step = steps.value.find((item) => item.id === metricTargetStepId.value)
  if (!step) {
    return
  }

  if (!metricDraft.eventName) {
    errorMessage.value = '请选择同时指标事件。'
    return
  }

  if (needsMetricProperty.value && !metricDraft.propertyName) {
    errorMessage.value = '请选择数值属性。'
    return
  }

  const metricEvent = getEventByName(metricDraft.eventName)
  const metric: FunnelStepMetric = {
    id: step.simultaneousMetric?.id ?? `step_metric_${Date.now()}`,
    stepId: step.id,
    eventName: metricDraft.eventName,
    eventDisplayName: metricEvent?.displayName ?? metricDraft.eventName,
    metricName: metricDraft.metricName.trim() || `${step.alias || step.eventDisplayName}业务指标`,
    aggregator: metricDraft.aggregator,
    propertyName: needsMetricProperty.value ? metricDraft.propertyName : undefined,
    percentile: metricDraft.aggregator === 'PERCENTILE' ? metricDraft.percentile : undefined,
    filters: step.simultaneousMetric?.filters ?? [],
  }

  steps.value = steps.value.map((item) => item.id === step.id ? { ...item, simultaneousMetric: metric } : item)
  showMetricModal.value = false
  markDirty()
}

const removeStepMetric = (stepId: string): void => {
  steps.value = steps.value.map((step) => step.id === stepId ? { ...step, simultaneousMetric: undefined } : step)
  markDirty()
}

const validateQuery = (): boolean => {
  if (validSteps.value.length < 2) {
    errorMessage.value = '漏斗分析至少需要配置 2 个有效步骤。'
    return false
  }

  if (validSteps.value.some((step) => !step.alias.trim())) {
    errorMessage.value = '步骤别名不能为空。'
    return false
  }

  if (!conversionWindow.value || !conversionWindow.unit) {
    errorMessage.value = '请配置转化窗口。'
    return false
  }

  if (timeRange.value[0] > timeRange.value[1]) {
    errorMessage.value = '时间范围配置不正确。'
    return false
  }

  if (granularity.value === 'minute' && dayjs(timeRange.value[1]).diff(dayjs(timeRange.value[0]), 'minute') > 60) {
    errorMessage.value = '分钟粒度仅支持选择 1 小时内的时间范围。'
    return false
  }

  if (relationProperties.value.some((relation) => relation.stepMappings.length < 2)) {
    errorMessage.value = '关联属性配置不完整。'
    return false
  }

  if (multiPathEnabled.value && multiPathVariants.value.length === 0) {
    errorMessage.value = '已启用多路径分析，请至少配置一条替代路径。'
    return false
  }

  return true
}

const buildQueryConfig = (): FunnelQueryRequest => ({
  projectId: projectId.value,
  idType: idType.value,
  timezone: timezone.value,
  funnelMode: funnelMode.value,
  calculationType: calculationType.value,
  countingConfig: {
    calculationType: calculationType.value,
    allowEventReuse: allowEventReuse.value,
    attributionStrategy: 'first_match',
  },
  conversionWindow: { ...conversionWindow },
  steps: validSteps.value.map((step, index) => ({ ...step, order: index + 1, filters: cloneFilters(step.filters) })),
  relationProperties: relationProperties.value.map((relation) => ({
    ...relation,
    stepMappings: relation.stepMappings.map((mapping) => ({ ...mapping })),
  })),
  globalFilters: cloneFilters(globalFilters.value),
  comparisonGroups: comparisonGroups.value.map((group) => ({ ...group, filters: cloneFilters(group.filters) })),
  groupBys: groupBys.value.map((group) => ({ ...group })),
  multiPath: {
    enabled: multiPathEnabled.value,
    baseStepOrder: multiPathBaseStepOrder.value,
    paths: multiPathVariants.value.map((path) => ({ ...path })),
  },
  timeConfig: {
    granularity: granularity.value,
    startTime: granularity.value === 'minute'
      ? dayjs(timeRange.value[0]).format('YYYY-MM-DD HH:mm:00')
      : dayjs(timeRange.value[0]).format('YYYY-MM-DD 00:00:00'),
    endTime: granularity.value === 'minute'
      ? dayjs(timeRange.value[1]).format('YYYY-MM-DD HH:mm:59')
      : dayjs(timeRange.value[1]).format('YYYY-MM-DD 23:59:59'),
    timezone: timezone.value,
    weekStartDay: 1,
    restrictWindowWithinSelectedRange: relationRestrictEnabled.value,
  },
  compareTime: {
    enabled: compareMode.value !== 'none',
    mode: compareMode.value === 'none' ? 'previous_period' : compareMode.value,
    startTime:
      compareMode.value === 'custom' ? dayjs(compareTimeRange.value[0]).format('YYYY-MM-DD 00:00:00') : undefined,
    endTime:
      compareMode.value === 'custom' ? dayjs(compareTimeRange.value[1]).format('YYYY-MM-DD 23:59:59') : undefined,
  },
  viewConfig: {
    analysisMode: analysisMode.value,
    chartType: chartType.value,
    selectedMetric: selectedMetric.value,
  },
})

const runAnalysis = async (): Promise<void> => {
  errorMessage.value = ''
  queryState.value = 'validating'
  if (!validateQuery()) {
    queryState.value = 'error'
    return
  }

  loading.value = true
  queryState.value = 'loading'
  try {
    result.value = await funnelAnalysisService.runAnalysis(buildQueryConfig())
    users.value = await funnelAnalysisService.getUsers()
    queryState.value = result.value.steps.length ? 'success' : 'empty'
    notice.value = result.value.steps.length
      ? `分析完成，当前漏斗整体转化率 ${result.value.summary.overallConversionRate}%。`
      : '当前条件下暂无漏斗数据，请调整步骤或筛选条件。'
  } catch {
    queryState.value = 'error'
    errorMessage.value = '查询失败，请稍后重试。'
  } finally {
    loading.value = false
  }
}

const openUserDrawer = (userType: FunnelUserType): void => {
  selectedUserType.value = userType
  showUserDrawer.value = true
}

const openMicroscope = (): void => {
  showMicroscopeModal.value = true
}

const saveAnalysis = async (): Promise<void> => {
  if (!saveAnalysisForm.name.trim()) {
    errorMessage.value = '请输入分析名称。'
    return
  }

  const saved = await funnelAnalysisService.saveAnalysis({
    name: saveAnalysisForm.name.trim(),
    description: saveAnalysisForm.description,
    tags: saveAnalysisForm.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    spaceType: saveAnalysisForm.spaceType,
    timeMode: 'relative',
    queryConfig: buildQueryConfig(),
    viewConfig: buildQueryConfig().viewConfig,
  })
  showSaveAnalysisModal.value = false
  queryState.value = 'success'
  notice.value = saved.message
}

const saveDashboard = async (): Promise<void> => {
  if (!saveDashboardForm.title.trim()) {
    errorMessage.value = '请输入图表名称。'
    return
  }

  const saved = await funnelAnalysisService.saveWidgetToDashboard({
    title: saveDashboardForm.title.trim(),
    dashboardId: saveDashboardForm.dashboardId,
    widgetType: saveDashboardForm.widgetType,
    refreshPolicy: saveDashboardForm.refreshPolicy,
    timeMode: saveDashboardForm.timeMode,
    queryConfig: buildQueryConfig(),
    chartConfig: buildQueryConfig().viewConfig,
  })
  showSaveDashboardModal.value = false
  notice.value = saved.message
}

const handleAnalysisModeChange = (value: string): void => {
  analysisMode.value = value as FunnelAnalysisMode
  if (analysisMode.value === 'trend') {
    chartType.value = 'line'
  } else if (analysisMode.value === 'duration') {
    chartType.value = 'duration_histogram'
  } else if (chartType.value === 'line' || chartType.value === 'duration_histogram') {
    chartType.value = 'conversion_funnel'
  }
  markDirty()
}

const onChartClick = (payload: unknown): void => {
  if (typeof payload === 'object' && payload !== null) {
    openMicroscope()
  }
}

const initializePage = async (): Promise<void> => {
  metadataLoading.value = true
  try {
    const metadata = await funnelAnalysisService.getMetadata()
    metadataEvents.value = metadata.eventMetadata.events
    metadataUserAttributes.value = metadata.eventMetadata.userAttributes
    metadataUserTags.value = metadata.eventMetadata.userTags
    metadataUserSegments.value = metadata.eventMetadata.userSegments
    const baseTemplate = metadata.templates.find((template) => template.id === 'tpl_ad_watch') ?? metadata.templates[0]
    const cloneTemplateConfig = (template: FunnelTemplate): FunnelTemplate['config'] => ({
      ...template.config,
      steps: template.config.steps.map((step) => ({ ...step })),
      relationProperties: template.config.relationProperties.map((relation) => ({
        ...relation,
        stepMappings: relation.stepMappings.map((mapping) => ({ ...mapping })),
      })),
    })
    const createMockFunnel = (
      id: string,
      name: string,
      ownerId: string,
      category: string,
      visibility: FunnelTemplate['visibility'],
    ): FunnelTemplate => ({
      ...(baseTemplate ?? metadata.templates[0]),
      id,
      name,
      description: `${name}的保存漏斗配置。`,
      category,
      ownerId,
      visibility,
      config: baseTemplate ? cloneTemplateConfig(baseTemplate) : {
        funnelMode: 'ordered',
        calculationType: 'UV',
        conversionWindow: {
          mode: 'preset',
          value: 7,
          unit: 'day',
          restrictWithinSelectedTimeRange: false,
        },
        steps: [],
        relationProperties: [],
      },
      createdAt: '2026-05-12T10:00:00+02:00',
      updatedAt: '2026-05-19T18:00:00+02:00',
    })
    templates.value = [
      {
        id: 'funnel_user_low_coin_ad',
        name: '低金币用户广告观看漏斗',
        description: '我保存的低金币用户广告入口到完成观看路径。',
        category: '广告',
        ownerId: 'current_user',
        visibility: 'private',
        config: {
          funnelMode: 'ordered',
          calculationType: 'UV',
          conversionWindow: {
            mode: 'preset',
            value: 7,
            unit: 'day',
            restrictWithinSelectedTimeRange: false,
          },
          steps: metadata.templates.find((template) => template.id === 'tpl_ad_watch')?.config.steps.map((step) => ({ ...step })) ?? [],
          relationProperties: [],
        },
        createdAt: '2026-05-18T10:00:00+02:00',
        updatedAt: '2026-05-20T09:30:00+02:00',
      },
      ...metadata.templates,
      createMockFunnel('funnel_user_newbie_ad', '新手广告引导漏斗', 'current_user', '广告', 'private'),
      createMockFunnel('funnel_user_task_center', '任务中心转化漏斗', 'current_user', '任务', 'private'),
      createMockFunnel('funnel_user_settlement_ad', '结算页激励广告漏斗', 'current_user', '广告', 'private'),
      createMockFunnel('funnel_user_coin_shortage', '金币不足召回漏斗', 'current_user', '低金币', 'private'),
      createMockFunnel('funnel_user_vip_trial', '会员试用转化漏斗', 'current_user', '付费', 'private'),
      createMockFunnel('funnel_user_season_event', '赛季活动参与漏斗', 'current_user', '活动', 'private'),
      createMockFunnel('funnel_shared_growth_ad', '增长团队广告复盘漏斗', 'growth_team', '广告', 'team'),
      createMockFunnel('funnel_shared_payment_path', '支付路径诊断漏斗', 'monetization_team', '付费', 'team'),
      createMockFunnel('funnel_shared_retention_task', '留存任务触达漏斗', 'ops_team', '留存', 'team'),
      createMockFunnel('funnel_shared_ab_compare', 'A/B 实验转化漏斗', 'data_analysis_team', '实验', 'team'),
      createMockFunnel('funnel_shared_low_coin_watch', '低金币广告观看漏斗', 'ops_team', '低金币', 'team'),
    ]
    const deletedBaseTemplate = baseTemplate
    deletedFunnels.value = deletedBaseTemplate
      ? [
          {
            ...deletedBaseTemplate,
            id: 'deleted_funnel_old_ad_entry',
            name: '旧版广告入口漏斗',
            description: '最近删除的旧版广告入口转化路径。',
            category: '广告',
            ownerId: 'current_user',
            visibility: 'private',
            createdAt: '2026-05-11T10:00:00+02:00',
            updatedAt: '2026-05-18T16:30:00+02:00',
            config: {
              ...deletedBaseTemplate.config,
              steps: deletedBaseTemplate.config.steps.map((step) => ({ ...step })),
              relationProperties: deletedBaseTemplate.config.relationProperties.map((relation) => ({
                ...relation,
                stepMappings: relation.stepMappings.map((mapping) => ({ ...mapping })),
              })),
            },
          },
          {
            ...deletedBaseTemplate,
            id: 'deleted_funnel_payment_trial',
            name: '付费转化试验漏斗',
            description: '最近删除的付费转化试验漏斗。',
            category: '付费',
            ownerId: 'current_user',
            visibility: 'private',
            createdAt: '2026-05-10T09:00:00+02:00',
            updatedAt: '2026-05-17T13:20:00+02:00',
            config: {
              ...deletedBaseTemplate.config,
              steps: deletedBaseTemplate.config.steps.map((step) => ({ ...step })),
              relationProperties: deletedBaseTemplate.config.relationProperties.map((relation) => ({
                ...relation,
                stepMappings: relation.stepMappings.map((mapping) => ({ ...mapping })),
              })),
            },
          },
          {
            ...deletedBaseTemplate,
            id: 'deleted_funnel_low_coin_popup',
            name: '低金币弹窗召回漏斗',
            description: '最近删除的低金币弹窗召回漏斗。',
            category: '低金币',
            ownerId: 'current_user',
            visibility: 'private',
            createdAt: '2026-05-08T15:00:00+02:00',
            updatedAt: '2026-05-16T11:45:00+02:00',
            config: {
              ...deletedBaseTemplate.config,
              steps: deletedBaseTemplate.config.steps.map((step) => ({ ...step })),
              relationProperties: deletedBaseTemplate.config.relationProperties.map((relation) => ({
                ...relation,
                stepMappings: relation.stepMappings.map((mapping) => ({ ...mapping })),
              })),
            },
          },
        ]
      : []
    const defaultTemplate = metadata.templates.find((template) => template.id === 'tpl_ad_watch') ?? metadata.templates[0]
    if (defaultTemplate) {
      selectedFunnelId.value = defaultTemplate.id
      funnelName.value = defaultTemplate.name
      steps.value = defaultTemplate.config.steps.map((step, index) => cloneStep(step, index + 1))
    } else {
      steps.value = [createBlankStep(), createBlankStep()]
    }
    await runAnalysis()
  } finally {
    metadataLoading.value = false
  }
}

onMounted(() => {
  initializePage()
})
</script>

<template>
  <div class="funnel-analysis-page">
    <div class="funnel-header">
      <div>
        <h1>漏斗分析</h1>
        <p>{{ funnelName }} · 配置用户行为步骤，定位广告观看、付费转化等关键路径中的流失环节。</p>
      </div>
      <n-space>
        <n-button @click="showSaveAnalysisModal = true">保存分析</n-button>
        <n-button @click="showSaveDashboardModal = true">保存到看板</n-button>
        <n-button type="primary" :loading="loading" @click="runAnalysis">开始分析</n-button>
      </n-space>
    </div>

    <n-alert v-if="notice" class="page-alert" type="success" closable @close="notice = ''">
      {{ notice }}
    </n-alert>
    <n-alert v-if="errorMessage" class="page-alert" type="error" closable @close="errorMessage = ''">
      {{ errorMessage }}
    </n-alert>

    <div class="analysis-shell">
      <aside class="config-pane">
        <n-spin :show="metadataLoading">
          <n-card class="config-card" title="1. 漏斗基础配置">
            <div class="config-stack">
              <div class="field-line">
                <span>漏斗选择</span>
                <div class="funnel-select-shell" :title="funnelName">
                  <n-select
                    v-model:show="showFunnelSelectMenu"
                    :value="currentFunnelSelectValue"
                    :options="funnelSelectOptions"
                    :render-option="renderFunnelSelectOption"
                    :consistent-menu-width="false"
                    :menu-props="funnelSelectMenuProps"
                    filterable
                    placeholder="搜索我创建或别人分享的漏斗"
                    @update:value="(value) => switchFunnel(String(value))"
                  />
                </div>
              </div>
              <div class="field-line">
                <span>识别主体</span>
                <n-select v-model:value="idType" :options="idTypeOptions" @update:value="markDirty" />
              </div>
              <div class="field-line">
                <span>漏斗模式</span>
                <n-radio-group v-model:value="funnelMode" @update:value="markDirty">
                  <n-radio-button value="ordered">有序</n-radio-button>
                  <n-radio-button value="unordered">无序</n-radio-button>
                </n-radio-group>
              </div>
              <div class="field-line">
                <span>计算口径</span>
                <n-radio-group v-model:value="calculationType" @update:value="markDirty">
                  <n-radio-button value="UV">UV</n-radio-button>
                  <n-radio-button value="PV">PV</n-radio-button>
                </n-radio-group>
              </div>
              <div class="field-line compact">
                <span>转化窗口</span>
                <n-input-number v-model:value="conversionWindow.value" :min="1" :max="180" @update:value="markDirty" />
                <n-select
                  v-model:value="conversionWindow.unit"
                  :options="[
                    { label: '分钟', value: 'minute' },
                    { label: '小时', value: 'hour' },
                    { label: '天', value: 'day' },
                  ]"
                  @update:value="markDirty"
                />
              </div>
              <n-checkbox v-model:checked="allowEventReuse" @update:checked="markDirty">
                允许同一事件被多个步骤复用
              </n-checkbox>
              <n-checkbox v-model:checked="relationRestrictEnabled" @update:checked="markDirty">
                转化窗口限制在查询时间范围内
              </n-checkbox>
              <div class="funnel-fixed-actions">
                <n-tooltip trigger="hover" :disabled="canSaveCurrentFunnel">
                  <template #trigger>
                    <n-button block type="primary" :disabled="!canSaveCurrentFunnel" @click="saveCurrentFunnel">
                      保存漏斗
                    </n-button>
                  </template>
                  别人分享给你的漏斗不能直接保存，请使用漏斗另存为。
                </n-tooltip>
                <n-button block @click="duplicateCurrentFunnel">漏斗另存为</n-button>
              </div>
            </div>
          </n-card>

          <n-card class="config-card" title="2. 漏斗步骤">
            <n-space class="config-actions">
              <n-button size="small" @click="addStep">+ 添加步骤</n-button>
              <n-button v-if="steps.length > stepAutoCollapseThreshold" size="small" @click="stepsExpanded = !stepsExpanded">
                {{ stepsExpanded ? '折叠步骤' : `展开全部 ${steps.length} 步` }}
              </n-button>
            </n-space>

            <div v-if="steps.length" class="step-list">
              <div v-for="step in visibleSteps" :key="step.id" class="step-card" :class="{ active: activeStepId === step.id }">
                <div class="step-card-head">
                  <strong>步骤 {{ step.order }}</strong>
                  <n-space size="small">
                    <n-button text size="small" @click="moveStep(step.id, -1)">上移</n-button>
                    <n-button text size="small" @click="moveStep(step.id, 1)">下移</n-button>
                    <n-button text size="small" @click="copyStep(step)">复制</n-button>
                    <n-button text type="error" size="small" @click="removeStep(step.id)">删除</n-button>
                  </n-space>
                </div>
                <n-select
                  :value="step.eventName"
                  :options="eventOptions"
                  filterable
                  placeholder="选择事件"
                  @update:value="(value) => updateStepEvent(step.id, String(value))"
                />
                <n-input
                  :value="step.alias"
                  placeholder="步骤别名"
                  @focus="activeStepId = step.id"
                  @update:value="(value) => updateStepAlias(step.id, value)"
                />
                <div class="step-meta">
                  <n-tag size="small">过滤 {{ step.filters.length }}</n-tag>
                  <n-tag v-if="step.simultaneousMetric" type="success" size="small">
                    {{ step.simultaneousMetric.metricName }}
                  </n-tag>
                </div>
                <n-space size="small">
                  <n-button size="tiny" @click="openFilterModal('step', step.id)">步骤筛选</n-button>
                  <n-button size="tiny" @click="openStepMetricModal(step)">同时指标</n-button>
                  <n-button v-if="step.simultaneousMetric" size="tiny" @click="openFilterModal('metric', step.id)">指标筛选</n-button>
                  <n-button v-if="step.simultaneousMetric" size="tiny" @click="removeStepMetric(step.id)">移除指标</n-button>
                </n-space>
                <div v-if="step.filters.length" class="filter-tags">
                  <div v-for="filter in step.filters" :key="filter.id" class="filter-node">
                    <div class="filter-node-line">
                      <n-tag closable size="small" @close="removeStepFilter(step.id, filter.id)">
                        {{ filter.fieldDisplayName }} {{ filter.displayValue }}
                      </n-tag>
                      <n-button size="tiny" text @click="openChildFilterModal('step', filter.id, step.id)">+ 二级筛选</n-button>
                    </div>
                    <div v-if="filter.childFilters?.length" class="child-filter-list">
                      <n-tag
                        v-for="childFilter in filter.childFilters"
                        :key="childFilter.id"
                        closable
                        size="small"
                        type="info"
                        @close="removeStepFilter(step.id, childFilter.id)"
                      >
                        {{ childFilter.logic }} · {{ childFilter.fieldDisplayName }} {{ childFilter.displayValue }}
                      </n-tag>
                    </div>
                  </div>
                </div>
              </div>
              <div v-if="hiddenStepCount" class="collapsed-step-summary">
                已自动折叠 {{ hiddenStepCount }} 个步骤，避免配置区过长。
                <n-button text type="primary" @click="stepsExpanded = true">展开查看</n-button>
              </div>
            </div>
            <n-empty v-else description="暂无步骤，请添加至少两个步骤" />
          </n-card>

          <n-card class="config-card" title="3. 用户筛选 / 对照组 / 分组">
            <section class="sub-config">
              <div class="section-title">
                <strong>全局筛选</strong>
                <n-button size="tiny" @click="openFilterModal('global')">+ 筛选</n-button>
              </div>
              <div v-if="globalFilters.length" class="filter-tags">
                <div v-for="filter in globalFilters" :key="filter.id" class="filter-node">
                  <div class="filter-node-line">
                    <n-tag closable @close="removeGlobalFilter(filter.id)">
                      {{ filter.fieldDisplayName }} {{ filter.displayValue }}
                    </n-tag>
                    <n-button size="tiny" text @click="openChildFilterModal('global', filter.id)">+ 二级筛选</n-button>
                  </div>
                  <div v-if="filter.childFilters?.length" class="child-filter-list">
                    <n-tag
                      v-for="childFilter in filter.childFilters"
                      :key="childFilter.id"
                      closable
                      type="info"
                      @close="removeGlobalFilter(childFilter.id)"
                    >
                      {{ childFilter.logic }} · {{ childFilter.fieldDisplayName }} {{ childFilter.displayValue }}
                    </n-tag>
                  </div>
                </div>
              </div>
              <n-empty v-else size="small" description="未配置全局筛选" />
            </section>

            <section class="sub-config">
              <div class="section-title">
                <strong>对照组</strong>
                <n-button size="tiny" @click="openComparisonModal()">+ 对照组</n-button>
              </div>
              <div v-if="comparisonGroups.length" class="mini-list">
                <div v-for="group in comparisonGroups" :key="group.id" class="mini-row">
                  <span class="color-dot" :style="{ backgroundColor: group.color }" />
                  <strong>{{ group.name }}</strong>
                  <n-switch :value="group.enabled" size="small" @update:value="(value) => toggleComparisonGroup(group.id, value)" />
                  <n-button text size="tiny" @click="openComparisonModal(group)">编辑</n-button>
                  <n-button text size="tiny" @click="copyComparisonGroup(group)">复制</n-button>
                  <n-button text type="error" size="tiny" @click="removeComparisonGroup(group.id)">删除</n-button>
                </div>
              </div>
              <n-empty v-else size="small" description="不配置对照组时按全部用户查询" />
            </section>

            <section class="sub-config">
              <div class="section-title">
                <strong>属性分组</strong>
                <n-button size="tiny" @click="openGroupModal">+ 分组</n-button>
              </div>
              <div v-if="groupBys.length" class="mini-list">
                <div v-for="group in groupBys" :key="group.id" class="mini-row">
                  <strong>{{ group.displayName }}</strong>
                  <span>{{ group.fieldType }} · {{ group.groupMode === 'multi' ? '组合拆分' : '单列拆分' }}</span>
                  <n-button text type="error" size="tiny" @click="removeGroupBy(group.id)">删除</n-button>
                </div>
              </div>
              <n-empty v-else size="small" description="未配置属性分组" />
            </section>

            <section class="sub-config">
              <div class="section-title">
                <strong>关联属性</strong>
                <n-button size="tiny" @click="openRelationModal()">+ 关联属性</n-button>
              </div>
              <p class="muted">{{ relationSummary }}，用于限制各步骤必须属于同一广告位、订单或会话。</p>
              <div v-if="relationProperties.length" class="mini-list">
                <div v-for="relation in relationProperties" :key="relation.id" class="mini-row relation-row">
                  <strong>所有步骤属性相等</strong>
                  <span>
                    {{
                      relation.stepMappings
                        .map((mapping) => getPropertyDisplayName(mapping))
                        .join(' = ')
                    }}
                  </span>
                  <n-button text size="tiny" @click="openRelationModal(relation)">编辑</n-button>
                  <n-button text type="error" size="tiny" @click="removeRelationProperty(relation.id)">删除</n-button>
                </div>
              </div>
            </section>

            <section class="sub-config">
              <div class="section-title">
                <strong>多路径分析</strong>
                <n-switch v-model:value="multiPathEnabled" @update:value="markDirty" />
              </div>
              <p class="muted">{{ multiPathSummary }}，用于对比同一漏斗层级下不同事件路径的转化差异。</p>
              <div v-if="multiPathEnabled" class="field-line">
                <span>基准层级</span>
                <n-select v-model:value="multiPathBaseStepOrder" :options="stepOrderOptions" @update:value="markDirty" />
              </div>
              <div v-if="multiPathVariants.length" class="mini-list">
                <div v-for="path in multiPathVariants" :key="path.id" class="mini-row">
                  <strong>{{ path.name }}</strong>
                  <span>替换步骤 {{ path.changedStepOrder }} 为 {{ path.eventDisplayName }}</span>
                  <n-button text size="tiny" @click="openMultiPathModal(path)">编辑</n-button>
                  <n-button text type="error" size="tiny" @click="removeMultiPath(path.id)">删除</n-button>
                </div>
              </div>
              <n-button v-if="multiPathEnabled" block size="small" @click="openMultiPathModal()">+ 添加替代路径</n-button>
            </section>
          </n-card>
        </n-spin>
      </aside>

      <main class="result-pane">
        <n-card class="toolbar-card">
          <div class="toolbar-grid">
            <div class="toolbar-controls">
              <div class="toolbar-item toolbar-time-item">
                <span class="toolbar-label">快捷时间</span>
                <n-popover v-model:show="showTimeRangePopover" trigger="manual" placement="bottom-start">
                  <template #trigger>
                    <n-select
                      v-model:value="timeShortcut"
                      :options="timeShortcutOptions"
                      @update:value="(value) => applyTimeShortcut(String(value))"
                    />
                  </template>
                  <div class="time-popover">
                    <n-date-picker v-model:value="timeRange" :type="granularity === 'minute' ? 'datetimerange' : 'daterange'" />
                    <n-space justify="end">
                      <n-button size="small" @click="showTimeRangePopover = false">取消</n-button>
                      <n-button size="small" type="primary" @click="confirmCustomTimeRange">确定</n-button>
                    </n-space>
                  </div>
                </n-popover>
              </div>
              <div class="toolbar-item toolbar-granularity-item">
                <span class="toolbar-label">粒度</span>
                <n-select v-model:value="granularity" :options="granularityOptions" @update:value="applyGranularity" />
              </div>
              <div class="toolbar-item toolbar-compare-item">
                <span class="toolbar-label">时间对比</span>
                <n-popover v-model:show="showCompareTimePopover" trigger="manual" placement="bottom-start">
                  <template #trigger>
                    <n-select
                      v-model:value="compareMode"
                      :options="compareModeOptions"
                      @update:value="(value) => applyCompareMode(String(value) as FunnelCompareSelectValue)"
                    />
                  </template>
                  <div class="time-popover">
                    <n-date-picker v-model:value="compareTimeRange" type="daterange" />
                    <n-space justify="end">
                      <n-button size="small" @click="showCompareTimePopover = false">取消</n-button>
                      <n-button size="small" type="primary" @click="confirmCustomCompareTimeRange">确定</n-button>
                    </n-space>
                  </div>
                </n-popover>
              </div>
              <div class="toolbar-item toolbar-timezone-item">
                <span class="toolbar-label">时区</span>
                <n-select v-model:value="timezone" :options="timezoneOptions" @update:value="markDirty" />
              </div>
              <div class="toolbar-item query-status">
                <span class="toolbar-label query-state-label" :class="`query-state-${queryState}`">
                  查询状态：{{ queryState }}
                </span>
                <n-button :loading="loading" @click="runAnalysis">刷新分析</n-button>
              </div>
            </div>
          </div>
        </n-card>

        <n-grid :cols="5" :x-gap="12" class="metric-grid">
          <n-gi v-for="card in metricCards" :key="card.label">
            <n-card class="metric-card">
              <n-statistic :label="card.label" :value="card.value" />
              <p>{{ card.desc }}</p>
            </n-card>
          </n-gi>
        </n-grid>

        <n-card class="chart-card">
          <div class="chart-head">
            <div>
              <h2>{{ chartTitle }}</h2>
              <p>{{ chartSubtitle }}</p>
            </div>
            <n-space>
              <n-select
                v-model:value="analysisMode"
                class="select-md"
                :options="analysisModeOptions"
                @update:value="handleAnalysisModeChange"
              />
              <n-select
                v-model:value="chartType"
                class="select-md"
                :options="chartTypeOptions"
                @update:value="markDirty"
              />
              <n-select
                v-model:value="selectedMetric"
                class="select-md"
                :options="selectedMetricOptions"
                @update:value="notice = `图表已切换为「${selectedMetricLabel}」。`"
              />
              <n-button @click="showSaveDashboardModal = true">保存到看板</n-button>
            </n-space>
          </div>

          <div
            v-if="analysisMode === 'steps' && chartType !== 'bar' && chartStepSeries.length"
            class="funnel-chart-legend"
          >
            <n-tag
              v-for="(series, index) in chartStepSeries"
              :key="series.name"
              :bordered="false"
              :type="index === 0 ? 'success' : 'info'"
            >
              {{ index === 0 ? '当前图表' : `对照图表 ${index}` }}：{{ series.name }}
            </n-tag>
          </div>

          <n-spin :show="loading">
            <div
              v-if="result && analysisMode === 'steps' && chartType !== 'bar' && chartStepSeries.length > 1"
              class="funnel-chart-title-grid"
              :style="{ gridTemplateColumns: `repeat(${chartStepSeries.length}, minmax(0, 1fr))` }"
            >
              <div v-for="series in chartStepSeries" :key="series.name" class="funnel-chart-series-title">
                {{ series.name }}
              </div>
            </div>
            <v-chart
              v-if="result && result.steps.length"
              class="funnel-chart"
              :option="funnelChartOption"
              autoresize
              @click="onChartClick"
            />
            <n-empty v-else class="empty-chart" description="当前条件下暂无图表数据，请配置漏斗步骤并开始分析。" />
          </n-spin>
        </n-card>

        <n-card class="detail-card" title="详细数据">
          <template #header-extra>
            <n-space>
              <n-button size="small" @click="showExportModal = true">下载数据</n-button>
              <n-button size="small" @click="showSegmentModal = true">保存流失用户分群</n-button>
            </n-space>
          </template>
          <n-data-table
            :columns="detailColumns"
            :data="detailRows"
            :loading="loading"
            :pagination="{ pageSize: 10 }"
            :row-key="(row) => row.key"
            :scroll-x="compareMode === 'none' ? 1280 : 2600"
          />
        </n-card>
      </main>
    </div>

    <n-modal v-model:show="showTemplateModal" preset="card" title="漏斗模板" class="modal-md">
      <div class="template-list">
        <n-card v-for="template in templates" :key="template.id" embedded>
          <div class="template-row">
            <div>
              <h3>{{ template.name }}</h3>
              <p>{{ template.description }}</p>
              <n-tag size="small">{{ template.category }}</n-tag>
            </div>
            <n-button type="primary" @click="applyTemplate(template)">应用模板</n-button>
          </div>
        </n-card>
      </div>
    </n-modal>

    <n-modal v-model:show="showRenameFunnelModal" preset="card" title="修改漏斗名称" style="width: 360px">
      <div class="modal-form">
        <div class="rename-summary">
          <span>原名称</span>
          <strong>{{ funnelName }}</strong>
        </div>
        <div class="field-line">
          <span>新名称</span>
          <n-input
            v-model:value="funnelNameDraft"
            maxlength="50"
            placeholder="请输入新的漏斗名称"
            @keyup.enter="confirmEditFunnelName"
          />
        </div>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="cancelEditFunnelName">取消</n-button>
          <n-button type="primary" @click="confirmEditFunnelName">确认修改</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showDeleteFunnelModal" preset="card" title="确认删除漏斗" style="width: 340px">
      <div class="modal-form">
        <n-alert type="warning">
          删除后会进入“最近删除”，最多保留最近 7 个漏斗，可恢复。
        </n-alert>
        <div class="rename-summary">
          <span>将删除</span>
          <strong>{{ funnelPendingDelete?.name }}</strong>
        </div>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showDeleteFunnelModal = false">取消</n-button>
          <n-button type="error" @click="confirmDeleteCurrentFunnel">确认删除</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showPurgeFunnelModal" preset="card" title="彻底删除漏斗" style="width: 340px">
      <div class="modal-form">
        <n-alert type="error">
          彻底删除后无法恢复，请确认是否继续。
        </n-alert>
        <div class="rename-summary">
          <span>将彻底删除</span>
          <strong>{{ funnelPendingPurge?.name }}</strong>
        </div>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showPurgeFunnelModal = false">取消</n-button>
          <n-button type="error" @click="confirmPurgeFunnel">彻底删除</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showShareFunnelModal" preset="card" title="分享漏斗" class="modal-md">
      <div class="modal-form">
        <n-alert type="info">
          支持一次分享给多个指定成员和多个团队，可通过名称或角色搜索。
        </n-alert>
        <div class="field-line">
          <span>指定成员</span>
          <n-select
            v-model:value="shareFunnelForm.members"
            multiple
            filterable
            clearable
            :options="shareMemberOptions"
            placeholder="搜索成员名称或角色"
          />
        </div>
        <div class="field-line">
          <span>指定团队</span>
          <n-select
            v-model:value="shareFunnelForm.teams"
            multiple
            filterable
            clearable
            :options="shareTeamOptions"
            placeholder="搜索团队"
          />
        </div>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showShareFunnelModal = false">取消</n-button>
          <n-button type="primary" @click="confirmShareFunnel">确认分享</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showFilterModal" preset="card" title="配置筛选条件" class="modal-md">
      <div class="modal-form">
        <div class="field-line">
          <span>连接符</span>
          <n-radio-group v-model:value="filterDraft.logic">
            <n-radio-button value="AND">AND</n-radio-button>
            <n-radio-button value="OR">OR</n-radio-button>
          </n-radio-group>
        </div>
        <div class="field-line">
          <span>来源</span>
          <n-select
            :value="filterDraft.sourceType"
            :options="filterSourceOptions"
            @update:value="(value) => syncFilterDraftSource(String(value))"
          />
        </div>
        <div class="field-line">
          <span>字段</span>
          <n-select v-model:value="filterDraft.field" :options="filterFieldOptions" filterable />
        </div>
        <div class="field-line">
          <span>操作符</span>
          <n-select v-model:value="filterDraft.operator" :options="filterOperatorOptions" />
        </div>
        <div class="field-line">
          <span>值</span>
          <n-input v-model:value="filterDraft.valueText" placeholder="支持单值、多值或正则表达式" />
        </div>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showFilterModal = false">取消</n-button>
          <n-button type="primary" @click="saveFilterCondition">保存筛选</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showGroupModal" preset="card" title="属性分组" class="modal-md">
      <div class="modal-form">
        <div class="field-line">
          <span>字段来源</span>
          <n-select v-model:value="groupDraft.fieldType" :options="groupSourceOptions" @update:value="groupDraft.fieldName = ''" />
        </div>
        <div class="field-line">
          <span>分组字段</span>
          <n-select v-model:value="groupDraft.fieldName" :options="groupFieldOptions" filterable />
        </div>
        <div class="field-line">
          <span>分组方式</span>
          <n-radio-group v-model:value="groupDraft.groupMode">
            <n-radio-button value="single">单列拆分</n-radio-button>
            <n-radio-button value="multi">组合拆分</n-radio-button>
          </n-radio-group>
        </div>
        <div class="field-line">
          <span>限定值</span>
          <n-input
            v-model:value="groupDraft.selectedValuesText"
            type="textarea"
            placeholder="可选，一行一个值；为空时展示 Top 分组"
          />
        </div>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showGroupModal = false">取消</n-button>
          <n-button type="primary" @click="saveGroupBy">保存分组</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showComparisonModal" preset="card" title="对照组配置" class="modal-md">
      <div class="modal-form">
        <div class="field-line">
          <span>名称</span>
          <n-input v-model:value="comparisonDraft.name" />
        </div>
        <div class="field-line">
          <span>状态</span>
          <n-switch v-model:value="comparisonDraft.enabled" />
        </div>
        <n-space>
          <n-button size="small" @click="openFilterModal('comparison', '', 'draft')">+ 添加条件</n-button>
        </n-space>
        <div class="filter-tags">
          <n-tag v-for="filter in comparisonDraft.filters" :key="filter.id">
            {{ filter.fieldDisplayName }} {{ filter.displayValue }}
          </n-tag>
        </div>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showComparisonModal = false">取消</n-button>
          <n-button type="primary" @click="saveComparisonGroup">保存对照组</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showMetricModal" preset="card" title="同时显示指标" class="modal-md">
      <div class="modal-form">
        <div class="field-line">
          <span>指标名称</span>
          <n-input v-model:value="metricDraft.metricName" />
        </div>
        <div class="field-line">
          <span>指标事件</span>
          <n-select
            :value="metricDraft.eventName"
            :options="eventOptions"
            filterable
            placeholder="选择用于同时展示的事件"
            @update:value="(value) => syncMetricEvent(String(value))"
          />
        </div>
        <div class="field-line">
          <span>计算方式</span>
          <n-select v-model:value="metricDraft.aggregator" :options="metricAggregatorOptions" />
        </div>
        <div v-if="needsMetricProperty" class="field-line">
          <span>数值属性</span>
          <n-select v-model:value="metricDraft.propertyName" :options="numericEventPropertyOptions" filterable />
        </div>
        <div v-if="metricDraft.aggregator === 'PERCENTILE'" class="field-line">
          <span>分位数</span>
          <n-input-number v-model:value="metricDraft.percentile" :min="1" :max="99" />
        </div>
        <n-alert type="info">
          同时指标会绑定到当前漏斗步骤，结果表会在该步骤旁展示额外业务指标，例如广告收益、奖励领取次数或付费金额。
        </n-alert>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showMetricModal = false">取消</n-button>
          <n-button type="primary" @click="saveStepMetric">保存指标</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showRelationModal" preset="card" title="关联属性配置" class="modal-md">
      <div class="modal-form">
        <n-alert type="info">
          关联属性要求不同步骤中的属性值一致，常用于确保曝光、点击、播放完成属于同一个广告位、同一订单或同一会话。
        </n-alert>
        <div v-for="step in steps" :key="step.id" class="relation-mapping-row">
          <strong>步骤 {{ step.order }} · {{ step.alias || step.eventDisplayName || '未命名步骤' }}</strong>
          <n-select
            :value="relationDraft.mappings.find((mapping) => mapping.stepId === step.id)?.propertySource"
            :options="relationSourceOptions"
            @update:value="(value) => updateRelationMappingSource(step.id, value as FunnelRelationPropertySourceType)"
          />
          <n-select
            :value="relationDraft.mappings.find((mapping) => mapping.stepId === step.id)?.propertyName"
            :options="getRelationPropertySourceOptions(
              step.id,
              relationDraft.mappings.find((mapping) => mapping.stepId === step.id)?.propertySource ?? 'event_property',
            )"
            clearable
            filterable
            :placeholder="`${step.alias || step.eventDisplayName || '当前步骤'}关联字段`"
            @update:value="(value) => updateRelationMapping(step.id, String(value ?? ''))"
          />
        </div>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showRelationModal = false">取消</n-button>
          <n-button type="primary" @click="saveRelationProperty">保存关联属性</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showMultiPathModal" preset="card" title="多路径配置" class="modal-md">
      <div class="modal-form">
        <div class="field-line">
          <span>路径名称</span>
          <n-input v-model:value="pathDraft.name" placeholder="例如：任务中心入口路径" />
        </div>
        <div class="field-line">
          <span>替换步骤</span>
          <n-select v-model:value="pathDraft.changedStepOrder" :options="stepOrderOptions" />
        </div>
        <div class="field-line">
          <span>替代事件</span>
          <n-select
            v-model:value="pathDraft.eventName"
            :options="eventOptions"
            filterable
            placeholder="选择替代路径事件"
          />
        </div>
        <n-alert type="info">
          保存后将以“默认路径 vs 替代路径”的方式展示分组结果，便于比较不同入口或不同路径对转化的影响。
        </n-alert>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showMultiPathModal = false">取消</n-button>
          <n-button type="primary" @click="saveMultiPath">保存路径</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showSaveAnalysisModal" preset="card" title="保存分析" class="modal-md">
      <div class="modal-form">
        <div class="field-line">
          <span>分析名称</span>
          <n-input v-model:value="saveAnalysisForm.name" maxlength="50" />
        </div>
        <div class="field-line">
          <span>描述</span>
          <n-input v-model:value="saveAnalysisForm.description" type="textarea" />
        </div>
        <div class="field-line">
          <span>所属空间</span>
          <n-radio-group v-model:value="saveAnalysisForm.spaceType">
            <n-radio-button value="personal">个人空间</n-radio-button>
            <n-radio-button value="team">团队空间</n-radio-button>
          </n-radio-group>
        </div>
        <div class="field-line">
          <span>标签</span>
          <n-input v-model:value="saveAnalysisForm.tags" placeholder="英文逗号分隔" />
        </div>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showSaveAnalysisModal = false">取消</n-button>
          <n-button type="primary" @click="saveAnalysis">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showSaveDashboardModal" preset="card" title="保存到看板" class="modal-lg">
      <div class="dashboard-save-grid">
        <div class="modal-form">
          <div class="field-line">
            <span>图表名称</span>
            <n-input v-model:value="saveDashboardForm.title" maxlength="50" />
          </div>
          <div class="field-line">
            <span>保存对象</span>
            <n-select
              v-model:value="saveDashboardForm.widgetType"
              :options="[
                { label: '步骤漏斗图', value: 'funnel_steps' },
                { label: '转化趋势图', value: 'funnel_trend' },
                { label: '转化时长图', value: 'funnel_duration' },
                { label: '明细表格', value: 'funnel_table' },
              ]"
            />
          </div>
          <div class="field-line">
            <span>看板位置</span>
            <n-select
              v-model:value="saveDashboardForm.dashboardId"
              :options="[
                { label: '个人空间 / 广告监控', value: 'personal_ad_monitor' },
                { label: '团队空间 / 运营日报', value: 'team_operation_daily' },
                { label: '公共空间 / 公司经营大盘', value: 'public_company_overview', disabled: true },
              ]"
            />
          </div>
          <div class="field-line">
            <span>刷新方式</span>
            <n-select
              v-model:value="saveDashboardForm.refreshPolicy"
              :options="[
                { label: '手动刷新', value: 'manual' },
                { label: '每小时刷新', value: 'hourly' },
                { label: '每天刷新', value: 'daily' },
              ]"
            />
          </div>
        </div>
        <n-card embedded title="预览">
          <h3>{{ saveDashboardForm.title }}</h3>
          <p>{{ chartTitle }} · {{ chartSubtitle }}</p>
          <n-tag>{{ saveDashboardForm.refreshPolicy }}</n-tag>
          <div class="preview-box">保存后将在看板中按当前查询配置动态刷新。</div>
        </n-card>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showSaveDashboardModal = false">取消</n-button>
          <n-button type="primary" @click="saveDashboard">保存到看板</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showMicroscopeModal" preset="card" title="显微镜分析" class="modal-md">
      <n-alert type="info">
        当前漏斗最大流失集中在广告点击 → 广告开始播放。建议按广告位、金币余额等级继续拆分，并保存流失用户分群进行运营触达。
      </n-alert>
      <n-space class="modal-actions">
        <n-button @click="showSegmentModal = true">保存为分群</n-button>
        <n-button @click="showAnnotationModal = true">添加分析标注</n-button>
        <n-button @click="showExportModal = true">导出用户</n-button>
      </n-space>
    </n-modal>

    <n-modal v-model:show="showSegmentModal" preset="dialog" title="保存为用户分群">
      已生成「广告漏斗流失用户」分群保存任务，本阶段使用 mock 提示。
    </n-modal>

    <n-modal v-model:show="showAnnotationModal" preset="dialog" title="添加分析标注">
      标注已记录在当前漏斗分析视图中，本阶段使用 mock 提示。
    </n-modal>

    <n-modal v-model:show="showExportModal" preset="dialog" title="下载数据">
      已创建异步导出任务，完成后可在下载中心查看，本阶段使用 mock 提示。
    </n-modal>

    <n-drawer v-model:show="showUserDrawer" :width="760">
      <n-drawer-content :title="`${selectedUserType === 'lost' ? '流失' : '转化'}用户列表`">
        <n-grid :cols="4" :x-gap="12" class="drawer-summary">
          <n-gi>
            <n-statistic label="用户数" :value="users.length" />
          </n-gi>
          <n-gi>
            <n-statistic label="平均耗时" value="3 分 12 秒" />
          </n-gi>
          <n-gi>
            <n-statistic label="高风险占比" value="28.6%" />
          </n-gi>
          <n-gi>
            <n-statistic label="可触达用户" value="31" />
          </n-gi>
        </n-grid>
        <n-data-table
          :columns="userColumns"
          :data="users"
          :pagination="{ pageSize: 8 }"
          :scroll-x="980"
        />
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<style scoped>
.funnel-analysis-page {
  min-height: 100%;
  padding: 24px;
  background: #f4f6f9;
}

.funnel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 16px;
}

.funnel-header h1,
.chart-head h2 {
  margin: 0;
  color: #101828;
}

.funnel-header p,
.chart-head p,
.metric-card p,
.muted {
  margin: 8px 0 0;
  color: #667085;
}

.page-alert {
  margin-bottom: 12px;
}

.analysis-shell {
  display: grid;
  grid-template-columns: 390px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.config-pane {
  position: sticky;
  top: 12px;
  max-height: calc(100vh - 120px);
  overflow: auto;
}

.config-card,
.toolbar-card,
.chart-card,
.detail-card {
  margin-bottom: 16px;
  border-radius: 8px;
}

.config-stack,
.modal-form {
  display: grid;
  gap: 12px;
}

.field-line {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
}

.field-line > span {
  color: #344054;
  font-weight: 600;
}

.field-line.compact {
  grid-template-columns: 92px 1fr 1fr;
}

.funnel-fixed-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.funnel-select-shell {
  position: relative;
  min-width: 0;
}

.funnel-option-row,
.deleted-funnel-option {
  display: grid;
  grid-template-columns: minmax(0, 1fr) max-content;
  align-items: center;
  column-gap: 18px;
  width: 100%;
  min-width: 0;
}

.funnel-option-name,
.deleted-funnel-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.funnel-option-actions,
.deleted-funnel-actions {
  display: flex;
  flex-shrink: 0;
  gap: 18px;
  justify-content: flex-end;
}

.deleted-funnel-name {
  color: #667085;
}

.deleted-funnel-actions {
  display: none;
}

.deleted-funnel-option:hover .deleted-funnel-actions,
.n-base-select-option:hover .deleted-funnel-actions {
  display: flex;
}

:global(.funnel-select-menu) {
  max-width: calc(100vw - 48px);
}

:global(.funnel-select-menu .n-base-select-option__content),
:global(.funnel-select-menu .n-base-select-option__content > *) {
  display: block;
  flex: 1;
  width: 100%;
  min-width: 0;
}

:global(.funnel-select-menu .n-base-select-option) {
  min-height: 40px;
  margin: 2px 8px;
  border-radius: 6px;
}

:global(.funnel-select-menu .n-base-select-group-header) {
  margin: 10px 8px 4px;
  padding: 10px 8px 4px;
  border-top: 1px solid #eef0f4;
  color: #667085;
  font-weight: 600;
}

:global(.funnel-select-menu .n-base-select-group-header:first-child) {
  margin-top: 0;
  border-top: 0;
}

.funnel-fixed-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.rename-summary {
  display: grid;
  gap: 6px;
  padding: 12px;
  border-radius: 8px;
  background: #f5f7fa;
}

.rename-summary span {
  color: #667085;
  font-size: 12px;
}

.rename-summary strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.config-actions,
.modal-actions {
  margin-bottom: 12px;
}

.step-list,
.template-list,
.mini-list {
  display: grid;
  gap: 10px;
}

.step-card {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid #e4e7ec;
  border-radius: 8px;
  background: #fbfcfe;
}

.step-card.active {
  border-color: #18a058;
  box-shadow: 0 0 0 2px rgba(24, 160, 88, 0.08);
}

.step-card-head,
.section-title,
.template-row,
.chart-head,
.mini-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.step-meta,
.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-node {
  display: grid;
  gap: 6px;
  width: 100%;
}

.filter-node-line,
.child-filter-list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.child-filter-list {
  margin-left: 18px;
  padding-left: 10px;
  border-left: 2px solid #d0d5dd;
}

.collapsed-step-summary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 46px;
  padding: 10px 12px;
  border: 1px dashed #d0d5dd;
  border-radius: 8px;
  color: #667085;
  background: #f9fafb;
}

.sub-config {
  padding: 12px 0;
  border-top: 1px solid #eef0f4;
}

.mini-row {
  padding: 8px 0;
  border-bottom: 1px solid #eef0f4;
}

.relation-mapping-row {
  display: grid;
  grid-template-columns: minmax(130px, 1fr) 150px minmax(0, 1.4fr);
  align-items: center;
  gap: 10px;
}

.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.toolbar-grid {
  display: block;
}

.toolbar-controls {
  display: grid;
  grid-template-columns: minmax(220px, 280px) 108px 168px 220px 136px;
  align-items: end;
  gap: 12px;
  min-width: 0;
}

.toolbar-item {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.toolbar-label {
  color: #344054;
  font-weight: 600;
  line-height: 1;
}

.toolbar-time-item {
  width: 280px;
}

.toolbar-granularity-item {
  width: 108px;
}

.toolbar-compare-item {
  width: 168px;
}

.toolbar-timezone-item {
  width: 220px;
}

.time-popover {
  display: grid;
  width: 360px;
  gap: 12px;
}

.query-status {
  width: 136px;
  white-space: nowrap;
}

.query-status :deep(.n-button) {
  width: 100%;
  justify-content: center;
}

.query-state-label {
  overflow: hidden;
  text-overflow: ellipsis;
}

.query-state-success {
  color: #18a058;
}

.query-state-dirty {
  color: #f0a020;
}

.query-state-error {
  color: #d03050;
}

.metric-grid {
  margin-bottom: 16px;
}

.metric-grid :deep(.n-grid-item) {
  display: flex;
}

.metric-card {
  width: 100%;
  min-height: 168px;
}

.metric-card :deep(.n-card__content) {
  display: flex;
  height: 100%;
  flex-direction: column;
  justify-content: center;
}

.chart-head {
  margin-bottom: 12px;
}

.funnel-chart-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 4px 0 12px;
}

.funnel-chart-title-grid {
  display: grid;
  gap: 24px;
  margin: 18px 56px -8px;
}

.funnel-chart-series-title {
  min-width: 0;
  overflow: hidden;
  color: #344054;
  font-weight: 700;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.select-md {
  width: 150px;
}

.funnel-chart {
  width: 100%;
  height: 430px;
}

.empty-chart {
  height: 430px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-md {
  width: 720px;
}

.modal-xxs {
  width: 280px;
}

.modal-xs {
  width: 420px;
}

.modal-sm {
  width: 520px;
}

.modal-lg {
  width: 920px;
}

.dashboard-save-grid {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 18px;
}

.preview-box {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 180px;
  margin-top: 16px;
  border: 1px dashed #d0d5dd;
  border-radius: 8px;
  color: #667085;
}

.drawer-summary {
  margin-bottom: 16px;
}

@media (max-width: 1280px) {
  .analysis-shell {
    grid-template-columns: 1fr;
  }

  .config-pane {
    position: static;
    max-height: none;
  }

  .toolbar-grid {
    align-items: stretch;
  }

  .toolbar-controls {
    grid-template-columns: repeat(2, minmax(160px, 1fr));
    flex: 1 1 100%;
  }

  .toolbar-time-item,
  .toolbar-granularity-item,
  .toolbar-compare-item,
  .toolbar-timezone-item {
    width: auto;
  }

  .query-status {
    width: 100%;
  }
}
</style>
