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
  NRadioButton,
  NRadioGroup,
  NSelect,
  NSpace,
  NSpin,
  NSwitch,
  NTabPane,
  NTabs,
  NTag,
} from 'naive-ui'
import type { DataTableColumns, SelectOption } from 'naive-ui'
import { computed, h, onMounted, reactive, ref } from 'vue'
import VChart from 'vue-echarts'
import { createDefaultPathEvent } from '@/mock/userPathAnalysis'
import { userPathAnalysisService } from '@/services/userPathAnalysisService'
import type {
  AggregatedPathEdge,
  AggregatedPathNode,
  SavedUserPathAnalysisPayload,
  HiddenNodeGroup,
  UnselectedEventBreakdown,
  UserPathDashboardWidgetPayload,
  UserPathDirection,
  UserPathEventConfig,
  UserPathFilterCondition,
  UserPathFilterRelation,
  UserPathGroupByConfig,
  UserPathMetadata,
  UserPathQueryRequest,
  UserPathQueryResponse,
  UserPathQueryState,
  UserPathRatioMode,
  UserPathSampleResponse,
  UserPathSessionUnit,
  UserPathSubjectType,
  UserPathUserListResponse,
} from '@/types/userPathAnalysis'

type DateRangeValue = [number, number]

interface SankeyTooltipParams {
  dataType?: string
  name?: string
  data?: {
    id?: string
    source?: string
    target?: string
  }
}

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? value as Record<string, unknown> : {}

const toSankeyParams = (value: unknown): SankeyTooltipParams => {
  const params = toRecord(value)
  const data = toRecord(params.data)
  return {
    dataType: typeof params.dataType === 'string' ? params.dataType : undefined,
    name: typeof params.name === 'string' ? params.name : undefined,
    data: {
      id: typeof data.id === 'string' ? data.id : undefined,
      source: typeof data.source === 'string' ? data.source : undefined,
      target: typeof data.target === 'string' ? data.target : undefined,
    },
  }
}

const metadata = ref<UserPathMetadata | null>(null)
const metadataLoading = ref(false)
const loading = ref(false)
const queryState = ref<UserPathQueryState>('idle')
const notice = ref('')
const errorMessage = ref('')
const result = ref<UserPathQueryResponse | null>(null)
const selectedNode = ref<AggregatedPathNode | null>(null)
const selectedEdge = ref<AggregatedPathEdge | null>(null)
const usersResult = ref<UserPathUserListResponse | null>(null)
const pathSamples = ref<UserPathSampleResponse | null>(null)
const showDetailDrawer = ref(false)
const showSaveAnalysisModal = ref(false)
const showDashboardModal = ref(false)
const showAddEventModal = ref(false)
const candidateEventName = ref('')

const subjectType = ref<UserPathSubjectType>('user_id')
const timezone = ref('UTC+8 北京时间')
const direction = ref<UserPathDirection>('START_FROM')
const coreEventName = ref('')
const coreFilters = reactive<{ relation: UserPathFilterRelation, conditions: UserPathFilterCondition[] }>({
  relation: 'AND',
  conditions: [],
})
const intermediateEvents = ref<UserPathEventConfig[]>([])
const includeUnselectedEvents = ref(false)
const sessionIntervalValue = ref(10)
const sessionIntervalUnit = ref<UserPathSessionUnit>('minute')
const mergeConsecutiveDuplicateEvents = ref(false)
const segmentFilter = reactive<{ relation: UserPathFilterRelation, conditions: UserPathFilterCondition[] }>({
  relation: 'AND',
  conditions: [],
})
const groupBy = reactive<UserPathGroupByConfig>({
  enabled: false,
  targetEventId: '',
  fieldType: 'event_property',
  fieldName: '',
  fieldDisplayName: '',
  valueLimit: 20,
  includeOthers: true,
  includeUnknown: true,
})
const quickRange = ref('last_7_days')
const dateRange = ref<DateRangeValue>([
  dayjs('2026-05-15').valueOf(),
  dayjs('2026-05-21').valueOf(),
])
const pathStepCount = ref(5)
const maxNodesPerStep = ref(10)
const minTrafficRatio = ref(0)
const ratioMode = ref<UserPathRatioMode>('STEP')
const pinnedNodes = ref<Array<{ stepIndex: number, nodeKey: string }>>([])

const saveAnalysisForm = reactive({
  name: '未命名用户路径分析',
  folder: '个人空间 / 我的分析',
  description: '',
  tags: '用户路径,行为流向',
  timeMode: 'relative' as 'fixed' | 'relative',
  favorite: false,
})

const dashboardForm = reactive({
  title: '用户路径桑基图',
  dashboard: '个人空间 / 用户行为看板',
  timeMode: 'relative' as 'fixed' | 'relative',
  refreshPolicy: 'daily' as 'manual' | 'daily',
  inheritPermission: true,
})

const subjectOptions: SelectOption[] = [
  { label: '用户 ID', value: 'user_id' },
  { label: '设备 ID', value: 'device_id' },
  { label: '账号 ID', value: 'account_id' },
  { label: '匿名 ID', value: 'anonymous_id' },
  { label: '自定义主体', value: 'custom_id' },
]

const sessionUnitOptions: SelectOption[] = [
  { label: '秒', value: 'second' },
  { label: '分钟', value: 'minute' },
  { label: '小时', value: 'hour' },
]

const ratioModeOptions: SelectOption[] = [
  { label: '占总路径', value: 'TOTAL' },
  { label: '占当前步骤', value: 'STEP' },
  { label: '占上一节点', value: 'SOURCE' },
]

const filterFieldTypeOptions: SelectOption[] = [
  { label: '事件属性', value: 'event_property' },
  { label: '用户属性', value: 'user_property' },
  { label: '用户标签', value: 'user_tag' },
  { label: '用户分群', value: 'cohort' },
  { label: '主体属性', value: 'subject_property' },
]

const filterOperatorOptions: SelectOption[] = [
  { label: '等于', value: 'eq' },
  { label: '不等于', value: 'neq' },
  { label: '属于', value: 'in' },
  { label: '不属于', value: 'not_in' },
  { label: '包含', value: 'contains' },
  { label: '大于', value: 'gt' },
  { label: '大于等于', value: 'gte' },
  { label: '小于', value: 'lt' },
  { label: '区间', value: 'between' },
]

const relationOptions: SelectOption[] = [
  { label: 'AND', value: 'AND' },
  { label: 'OR', value: 'OR' },
]

const quickRangeOptions: SelectOption[] = [
  { label: '今天', value: 'today' },
  { label: '昨天', value: 'yesterday' },
  { label: '最近 7 天', value: 'last_7_days' },
  { label: '最近 14 天', value: 'last_14_days' },
  { label: '最近 20 天', value: 'last_20_days' },
]

const eventOptions = computed<SelectOption[]>(() =>
  (metadata.value?.eventMetadata.events ?? []).map((event) => ({
    label: `${event.displayName} ${event.eventName}`,
    value: event.eventName,
  })),
)

const coreEvent = computed(() =>
  metadata.value?.eventMetadata.events.find((event) => event.eventName === coreEventName.value),
)

const pathEventOptions = computed<SelectOption[]>(() =>
  [
    ...(coreEventName.value ? [{ label: `${coreEvent.value?.displayName ?? coreEventName.value} ${coreEventName.value}`, value: coreEventName.value }] : []),
    ...intermediateEvents.value.map((event) => ({
      label: `${event.alias || event.eventDisplayName} ${event.eventName}`,
      value: event.eventName,
    })),
  ],
)

const fieldOptionsByType = (fieldType: UserPathFilterCondition['fieldType']): SelectOption[] => {
  const eventProperties = metadata.value?.eventMetadata.events.flatMap((event) => event.properties) ?? []
  const userAttributes = metadata.value?.eventMetadata.userAttributes ?? []
  const userTags = metadata.value?.eventMetadata.userTags ?? []
  const cohorts = metadata.value?.eventMetadata.userSegments ?? []

  if (fieldType === 'event_property') {
    return eventProperties.map((property) => ({ label: `${property.displayName} ${property.propertyName}`, value: property.propertyName }))
  }
  if (fieldType === 'user_property' || fieldType === 'subject_property') {
    return userAttributes.map((field) => ({ label: `${field.displayName} ${field.field}`, value: field.field }))
  }
  if (fieldType === 'user_tag') {
    return userTags.map((tag) => ({ label: `${tag.displayName} ${tag.field}`, value: tag.field }))
  }
  return cohorts.map((segment) => ({ label: `${segment.name} ${segment.id}`, value: segment.id }))
}

const fieldDisplayName = (fieldType: UserPathFilterCondition['fieldType'], fieldName: string): string =>
  String(fieldOptionsByType(fieldType).find((field) => field.value === fieldName)?.label ?? fieldName).split(' ')[0] ?? fieldName

const selectedEventLabel = (eventName: string): string =>
  metadata.value?.eventMetadata.events.find((event) => event.eventName === eventName)?.displayName ?? eventName

const markDirty = () => {
  if (queryState.value !== 'loading') {
    queryState.value = 'dirty'
  }
  result.value = null
}

const updateDirection = () => {
  markDirty()
  notice.value = '路径方向已切换，请重新查询。'
}

const updateFilterFieldType = (filter: UserPathFilterCondition) => {
  filter.fieldName = ''
  filter.fieldDisplayName = ''
  markDirty()
}

const updateFilterField = (filter: UserPathFilterCondition) => {
  filter.fieldDisplayName = fieldDisplayName(filter.fieldType, filter.fieldName)
  markDirty()
}

const updateFilterValue = (filter: UserPathFilterCondition, value: string) => {
  filter.displayValue = value
  filter.value = value
  markDirty()
}

const buildFilter = (relation: UserPathFilterRelation = 'AND'): UserPathFilterCondition => ({
  id: `path_filter_${Date.now()}_${Math.random().toString(16).slice(2)}`,
  relation,
  fieldType: 'user_property',
  fieldName: 'channel',
  fieldDisplayName: '获客渠道',
  operator: 'eq',
  value: '自然量',
  displayValue: '自然量',
  childFilters: [],
})

const createDemoFilter = (
  id: string,
  relation: UserPathFilterRelation,
  fieldType: UserPathFilterCondition['fieldType'],
  fieldName: string,
  fieldDisplayName: string,
  displayValue: string,
  childFilters: UserPathFilterCondition[] = [],
): UserPathFilterCondition => ({
  id,
  relation,
  fieldType,
  fieldName,
  fieldDisplayName,
  operator: fieldType === 'cohort' ? 'in' : 'eq',
  value: fieldType === 'cohort' ? [displayValue] : displayValue,
  displayValue,
  childFilters,
})

const createDemoPathEvent = (
  eventNameValue: string,
  index: number,
  alias: string,
  filters: UserPathFilterCondition[] = [],
  isCoreEvent = false,
): UserPathEventConfig => ({
  ...createDefaultPathEvent(eventNameValue, index, isCoreEvent),
  alias,
  filters: {
    relation: 'AND',
    conditions: filters,
  },
})

const addFilter = (conditions: UserPathFilterCondition[]) => {
  conditions.push(buildFilter('AND'))
  markDirty()
}

const removeFilter = (conditions: UserPathFilterCondition[], filterId: string) => {
  const index = conditions.findIndex((condition) => condition.id === filterId)
  if (index >= 0) {
    conditions.splice(index, 1)
    markDirty()
  }
}

const addChildFilter = (filter: UserPathFilterCondition) => {
  filter.childFilters = [...(filter.childFilters ?? []), buildFilter('AND')]
  markDirty()
}

const openAddEventModal = () => {
  if (intermediateEvents.value.filter((event) => !event.isCoreEvent).length >= 13) {
    notice.value = '最多支持添加 13 个中间事件。'
    return
  }
  candidateEventName.value = ''
  showAddEventModal.value = true
}

const addPathEventByName = (eventNameValue: string) => {
  if (!eventNameValue) return false
  if (eventNameValue === coreEventName.value || intermediateEvents.value.some((event) => event.eventName === eventNameValue)) {
    notice.value = '该事件已添加。'
    return false
  }
  if (intermediateEvents.value.filter((event) => !event.isCoreEvent).length >= 13) {
    notice.value = '最多支持 13 个中间事件，请先删除其他事件。'
    return false
  }

  intermediateEvents.value.push(createDefaultPathEvent(eventNameValue, intermediateEvents.value.length))
  markDirty()
  return true
}

const confirmAddIntermediateEvent = () => {
  if (addPathEventByName(candidateEventName.value)) {
    showAddEventModal.value = false
  }
}

const removeChildFilter = (filter: UserPathFilterCondition, childFilterId: string) => {
  filter.childFilters = (filter.childFilters ?? []).filter((child) => child.id !== childFilterId)
  markDirty()
}

const applyQuickRange = (value: string) => {
  const end = dayjs('2026-05-21')
  const daysMap: Record<string, number> = {
    today: 1,
    yesterday: 1,
    last_7_days: 7,
    last_14_days: 14,
    last_20_days: 20,
  }
  const actualEnd = value === 'yesterday' ? end.subtract(1, 'day') : end
  const days = daysMap[value] ?? 7
  quickRange.value = value
  dateRange.value = [actualEnd.subtract(days - 1, 'day').valueOf(), actualEnd.valueOf()]
  markDirty()
}

const updateCoreEvent = (eventName: string | null) => {
  coreEventName.value = eventName ?? ''
  if (!eventName) {
    markDirty()
    return
  }

  if (!intermediateEvents.value.some((event) => event.eventName === eventName)) {
    intermediateEvents.value.unshift(createDefaultPathEvent(eventName, 0, true))
  }
  markDirty()
}

const removeIntermediateEvent = (eventId: string) => {
  const target = intermediateEvents.value.find((event) => event.id === eventId)
  if (target?.isCoreEvent) {
    notice.value = '核心事件不能删除，只能更换核心事件。'
    return
  }

  intermediateEvents.value = intermediateEvents.value.filter((event) => event.id !== eventId)
  if (groupBy.targetEventId === target?.eventName) {
    groupBy.enabled = false
    groupBy.targetEventId = ''
    groupBy.fieldName = ''
    groupBy.fieldDisplayName = ''
  }
  markDirty()
}

const isValueRequired = (filter: UserPathFilterCondition): boolean =>
  filter.operator !== 'is_null' && filter.operator !== 'not_null'

const validateFilters = (conditions: UserPathFilterCondition[], scope: string): string | null => {
  for (const [index, condition] of conditions.entries()) {
    if (!condition.fieldType) return `${scope}第 ${index + 1} 条条件请选择字段来源。`
    if (!condition.fieldName) return `${scope}第 ${index + 1} 条条件请选择字段。`
    if (!condition.operator) return `${scope}第 ${index + 1} 条条件请选择操作符。`
    if (isValueRequired(condition) && !condition.displayValue) return `${scope}第 ${index + 1} 条条件请输入条件值。`
    const childError = validateFilters(condition.childFilters ?? [], `${scope}第 ${index + 1} 条二级条件`)
    if (childError) return childError
  }
  return null
}

const validateQuery = (): string | null => {
  if (!coreEventName.value) return '请选择起始事件或终止事件。'
  if (pathStepCount.value < 1 || pathStepCount.value > 10) return '最多支持分析 10 步用户路径。'
  if (maxNodesPerStep.value < 1 || maxNodesPerStep.value > 10) return 'Demo 阶段单级最大节点数支持 1-10。'
  if (sessionIntervalValue.value < 1) return '会话间隔不能小于 1。'
  if (sessionIntervalUnit.value === 'second' && sessionIntervalValue.value > 3600) return '秒级会话间隔最大 3600。'
  if (sessionIntervalUnit.value === 'minute' && sessionIntervalValue.value > 1440) return '分钟级会话间隔最大 1440。'
  if (sessionIntervalUnit.value === 'hour' && sessionIntervalValue.value > 24) return '小时级会话间隔最大 24。'
  if (groupBy.enabled && !groupBy.targetEventId) return '属性分组必须选择作用事件。'
  if (groupBy.enabled && !groupBy.fieldName) return '属性分组必须选择分组字段。'
  const coreFilterError = validateFilters(coreFilters.conditions, '核心事件过滤')
  if (coreFilterError) return coreFilterError
  for (const event of intermediateEvents.value) {
    const eventFilterError = validateFilters(event.filters.conditions, `${event.alias || event.eventDisplayName}事件过滤`)
    if (eventFilterError) return eventFilterError
  }
  const segmentFilterError = validateFilters(segmentFilter.conditions, '细分筛选')
  if (segmentFilterError) return segmentFilterError
  return null
}

const buildQuery = (): UserPathQueryRequest => ({
  projectId: 'demo_project',
  subject: {
    subjectType: subjectType.value,
    displayName: subjectOptions.find((item) => item.value === subjectType.value)?.label as string,
  },
  timezone: timezone.value,
  direction: direction.value,
  coreEvent: coreEventName.value
    ? {
        eventName: coreEventName.value,
        eventDisplayName: selectedEventLabel(coreEventName.value),
        filters: {
          relation: coreFilters.relation,
          conditions: coreFilters.conditions,
        },
      }
    : undefined,
  intermediateEvents: intermediateEvents.value.filter((event) => event.eventName !== coreEventName.value),
  includeUnselectedEvents: includeUnselectedEvents.value,
  sessionConfig: {
    intervalValue: sessionIntervalValue.value,
    intervalUnit: sessionIntervalUnit.value,
  },
  mergeConsecutiveDuplicateEvents: mergeConsecutiveDuplicateEvents.value,
  segmentFilter: {
    relation: segmentFilter.relation,
    conditions: segmentFilter.conditions,
  },
  groupBy: { ...groupBy },
  timeConfig: {
    startTime: dayjs(dateRange.value[0]).format('YYYY-MM-DD'),
    endTime: dayjs(dateRange.value[1]).format('YYYY-MM-DD'),
    granularity: 'day',
  },
  viewConfig: {
    pathStepCount: pathStepCount.value,
    maxNodesPerStep: maxNodesPerStep.value,
    minTrafficRatio: minTrafficRatio.value,
    ratioMode: ratioMode.value,
    pinnedNodes: pinnedNodes.value,
  },
})

const runAnalysis = async () => {
  queryState.value = 'validating'
  errorMessage.value = ''
  const validationError = validateQuery()
  if (validationError) {
    errorMessage.value = validationError
    queryState.value = 'error'
    return
  }

  queryState.value = 'loading'
  loading.value = true
  const response = await userPathAnalysisService.runAnalysis(buildQuery())
  result.value = response
  queryState.value = response.nodes.length ? 'success' : 'empty'
  notice.value = response.nodes.length
    ? `路径分析完成，展示 ${response.summary.totalDisplayedNodes} 个节点、${response.summary.totalDisplayedEdges} 条流向。`
    : '当前条件下暂无用户路径数据。'
  loading.value = false
}

const nodeMap = computed(() => new Map((result.value?.nodes ?? []).map((node) => [node.id, node])))
const edgeMap = computed(() => new Map((result.value?.edges ?? []).map((edge) => [edge.id, edge])))

const formatNumber = (value: number): string =>
  new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(value)

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`

const nodeColor = (node: AggregatedPathNode): string => {
  if (node.nodeType === 'DROP_OFF') return '#98a2b3'
  if (node.nodeType === 'UNSELECTED_EVENT') return '#94a3b8'
  if (node.nodeType === 'MORE_GROUP') return '#cbd5e1'
  if (node.eventName === coreEventName.value) return '#18a058'
  return '#2f80ed'
}

const nodeDisplayRatio = (node: AggregatedPathNode): number => {
  if (ratioMode.value === 'TOTAL') return node.ratioOfTotal
  if (ratioMode.value === 'SOURCE') {
    const incomingEdges = (result.value?.edges ?? []).filter((edge) => edge.targetNodeId === node.id)
    if (incomingEdges.length === 0) return 1
    return Math.max(...incomingEdges.map((edge) => edge.ratioOfSource))
  }
  return node.ratioOfStep
}

const ratioModeLabel = computed(() => {
  if (ratioMode.value === 'TOTAL') return '占总路径'
  if (ratioMode.value === 'SOURCE') return '占上一节点'
  return '占当前步骤'
})

const sankeyOption = computed<EChartsOption>(() => {
  const nodes = result.value?.nodes ?? []
  const edges = result.value?.edges ?? []

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const sankeyParams = toSankeyParams(params)
        if (sankeyParams.dataType === 'edge') {
          const edge = edgeMap.value.get(sankeyParams.data?.id ?? '')
          return edge
            ? `${edge.sourceLabel} → ${edge.targetLabel}<br/>流转人数：${formatNumber(edge.userCount)}<br/>占来源节点：${formatPercent(edge.ratioOfSource)}<br/>占总路径：${formatPercent(edge.ratioOfTotal)}`
          : ''
        }
        const node = nodeMap.value.get(sankeyParams.name ?? '')
        return node
          ? `${node.nodeLabel}<br/>到达人数：${formatNumber(node.userCount)}<br/>${ratioModeLabel.value}：${formatPercent(nodeDisplayRatio(node))}<br/>占总路径：${formatPercent(node.ratioOfTotal)}<br/>占当前步骤：${formatPercent(node.ratioOfStep)}`
          : ''
      },
    },
    series: [
      {
        type: 'sankey',
        layout: 'none',
        emphasis: { focus: 'adjacency' },
        nodeAlign: 'justify',
        nodeGap: 16,
        draggable: false,
        label: {
          formatter: (params: { name?: string }) => {
            const node = nodeMap.value.get(params.name ?? '')
            return node ? `${node.nodeLabel}\n${formatNumber(node.userCount)} · ${formatPercent(nodeDisplayRatio(node))}` : ''
          },
        },
        data: nodes.map((node) => ({
          id: node.id,
          name: node.id,
          itemStyle: { color: nodeColor(node) },
        })),
        links: edges.map((edge) => ({
          id: edge.id,
          source: edge.sourceNodeId,
          target: edge.targetNodeId,
          value: edge.userCount,
        })),
      },
    ],
  } as EChartsOption
})

const selectedIncomingEdges = computed(() =>
  selectedNode.value
    ? (result.value?.edges ?? []).filter((edge) => edge.targetNodeId === selectedNode.value?.id)
    : [],
)

const selectedOutgoingEdges = computed(() =>
  selectedNode.value
    ? (result.value?.edges ?? []).filter((edge) => edge.sourceNodeId === selectedNode.value?.id)
    : [],
)

const selectedHiddenGroup = computed<HiddenNodeGroup | null>(() =>
  selectedNode.value?.nodeType === 'MORE_GROUP'
    ? result.value?.hiddenNodeGroups.find((group) => group.mergedIntoNodeId === selectedNode.value?.id) ?? null
    : null,
)

const selectedUnselectedEvents = computed<UnselectedEventBreakdown[]>(() =>
  selectedNode.value?.nodeType === 'UNSELECTED_EVENT'
    ? (result.value?.unselectedEventBreakdown ?? []).filter((item) => item.stepIndex === selectedNode.value?.stepIndex)
    : [],
)

const addUnselectedEvent = (eventNameValue: string) => {
  if (addPathEventByName(eventNameValue)) {
    showDetailDrawer.value = false
    notice.value = '已添加为参与分析事件，请重新查询。'
  }
}

const promoteHiddenNode = async (nodeKey: string, nodeLabel: string, stepIndex: number) => {
  if (!pinnedNodes.value.some((node) => node.stepIndex === stepIndex && node.nodeKey === nodeKey)) {
    pinnedNodes.value.push({ stepIndex, nodeKey })
  }
  notice.value = `已提升展示「${nodeLabel}」，正在重新计算图表。`
  await runAnalysis()
}

const openDetailDrawer = async (label: string, node?: AggregatedPathNode, edge?: AggregatedPathEdge) => {
  if (!result.value) return
  selectedNode.value = node ?? null
  selectedEdge.value = edge ?? null
  usersResult.value = await userPathAnalysisService.getUsers(result.value.queryId, label)
  pathSamples.value = await userPathAnalysisService.getPathSamples(result.value.queryId, label)
  showDetailDrawer.value = true
}

const handleChartClick = async (params: unknown) => {
  const sankeyParams = toSankeyParams(params)
  if (sankeyParams.dataType === 'edge') {
    const edge = edgeMap.value.get(sankeyParams.data?.id ?? '')
    if (edge) await openDetailDrawer(`${edge.sourceLabel} → ${edge.targetLabel}`, undefined, edge)
    return
  }

  const node = nodeMap.value.get(sankeyParams.name ?? '')
  if (node) await openDetailDrawer(node.nodeLabel, node)
}

const setNodeAsCore = (node: AggregatedPathNode, nextDirection: UserPathDirection) => {
  if (!node.eventName) {
    notice.value = '特殊节点不能设置为核心事件。'
    return
  }

  direction.value = nextDirection
  updateCoreEvent(node.eventName)
  showDetailDrawer.value = false
  notice.value = nextDirection === 'START_FROM' ? '已设为新的起始事件，请重新查询。' : '已设为新的终止事件，请重新查询。'
}

const saveCohort = () => {
  notice.value = '已生成基于当前节点或流向的用户分群任务。'
}

const exportImage = () => {
  notice.value = '已生成当前桑基图导出图片。'
}

const exportUsers = () => {
  notice.value = '已生成用户 ID 导出任务。'
}

const exportPathDetails = () => {
  notice.value = '已生成路径明细导出任务。'
}

const resetAnalysis = () => {
  direction.value = 'START_FROM'
  coreEventName.value = ''
  coreFilters.conditions = []
  intermediateEvents.value = []
  includeUnselectedEvents.value = false
  sessionIntervalValue.value = 10
  sessionIntervalUnit.value = 'minute'
  mergeConsecutiveDuplicateEvents.value = false
  segmentFilter.conditions = []
  groupBy.enabled = false
  groupBy.targetEventId = ''
  groupBy.fieldName = ''
  groupBy.fieldDisplayName = ''
  quickRange.value = 'last_7_days'
  applyQuickRange('last_7_days')
  pathStepCount.value = 5
  maxNodesPerStep.value = 10
  minTrafficRatio.value = 0
  ratioMode.value = 'STEP'
  pinnedNodes.value = []
  result.value = null
  queryState.value = 'idle'
  notice.value = '已重置为新的空白用户路径分析。'
}

const saveAnalysis = async () => {
  const payload: SavedUserPathAnalysisPayload = {
    name: saveAnalysisForm.name,
    description: saveAnalysisForm.description,
    tags: saveAnalysisForm.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    queryConfig: buildQuery(),
    viewConfig: buildQuery().viewConfig,
    timeMode: saveAnalysisForm.timeMode,
    favorite: saveAnalysisForm.favorite,
  }
  const response = await userPathAnalysisService.saveAnalysis(payload)
  notice.value = response.message
  showSaveAnalysisModal.value = false
}

const saveWidgetToDashboard = async () => {
  const payload: UserPathDashboardWidgetPayload = {
    title: dashboardForm.title,
    dashboard: dashboardForm.dashboard,
    sourceQueryConfig: buildQuery(),
    chartConfig: buildQuery().viewConfig,
    timeMode: dashboardForm.timeMode,
    refreshPolicy: dashboardForm.refreshPolicy,
    inheritPermission: dashboardForm.inheritPermission,
  }
  const response = await userPathAnalysisService.saveWidgetToDashboard(payload)
  notice.value = response.message
  showDashboardModal.value = false
}

const nodeColumns: DataTableColumns<AggregatedPathNode> = [
  { title: '步骤', key: 'stepIndex', width: 80 },
  { title: '节点', key: 'nodeLabel', minWidth: 180 },
  { title: '类型', key: 'nodeType', width: 140 },
  { title: '到达人数', key: 'userCount', width: 120, render: (row) => formatNumber(row.userCount) },
  { title: '占总路径', key: 'ratioOfTotal', width: 120, render: (row) => formatPercent(row.ratioOfTotal) },
  { title: '占当前步骤', key: 'ratioOfStep', width: 130, render: (row) => formatPercent(row.ratioOfStep) },
  {
    title: '操作',
    key: 'actions',
    width: 220,
    render: (row) => h(NSpace, { size: 8 }, {
      default: () => [
        h(NButton, { size: 'small', text: true, type: 'primary', onClick: () => openDetailDrawer(row.nodeLabel, row) }, { default: () => '详情' }),
        h(NButton, { size: 'small', text: true, type: 'primary', onClick: saveCohort }, { default: () => '保存分群' }),
      ],
    }),
  },
]

const edgeColumns: DataTableColumns<AggregatedPathEdge> = [
  { title: '来源', key: 'sourceLabel', minWidth: 160 },
  { title: '目标', key: 'targetLabel', minWidth: 160 },
  { title: '流转人数', key: 'userCount', width: 120, render: (row) => formatNumber(row.userCount) },
  { title: '占来源节点', key: 'ratioOfSource', width: 130, render: (row) => formatPercent(row.ratioOfSource) },
  { title: '占总路径', key: 'ratioOfTotal', width: 120, render: (row) => formatPercent(row.ratioOfTotal) },
  {
    title: '操作',
    key: 'actions',
    width: 200,
    render: (row) => h(NSpace, { size: 8 }, {
      default: () => [
        h(NButton, { size: 'small', text: true, type: 'primary', onClick: () => openDetailDrawer(`${row.sourceLabel} → ${row.targetLabel}`, undefined, row) }, { default: () => '详情' }),
        h(NButton, { size: 'small', text: true, type: 'primary', onClick: saveCohort }, { default: () => '保存分群' }),
      ],
    }),
  },
]

type HiddenNodeRow = HiddenNodeGroup['originalNodes'][number]

const hiddenNodeColumns: DataTableColumns<HiddenNodeRow> = [
  { title: '原始节点', key: 'nodeLabel', minWidth: 180 },
  { title: '人数', key: 'userCount', width: 110, render: (row) => formatNumber(row.userCount) },
  { title: '占当前步骤', key: 'ratioOfStep', width: 130, render: (row) => formatPercent(row.ratioOfStep) },
  {
    title: '操作',
    key: 'actions',
    width: 180,
    render: (row) => h(NSpace, { size: 8 }, {
      default: () => [
        h(NButton, {
          size: 'small',
          text: true,
          type: 'primary',
          onClick: () => promoteHiddenNode(row.nodeKey, row.nodeLabel, selectedHiddenGroup.value?.stepIndex ?? 0),
        }, { default: () => '提升展示' }),
        row.eventName
          ? h(NButton, {
              size: 'small',
              text: true,
              type: 'primary',
              onClick: () => addPathEventByName(row.eventName ?? ''),
            }, { default: () => '加入事件' })
          : null,
      ],
    }),
  },
]

const unselectedEventColumns: DataTableColumns<UnselectedEventBreakdown> = [
  { title: '原始事件', key: 'eventDisplayName', minWidth: 180 },
  { title: '事件名', key: 'eventName', minWidth: 180 },
  { title: '人数', key: 'userCount', width: 110, render: (row) => formatNumber(row.userCount) },
  { title: '占未选中', key: 'ratioOfUnselected', width: 130, render: (row) => formatPercent(row.ratioOfUnselected) },
  { title: '占总路径', key: 'ratioOfTotal', width: 120, render: (row) => formatPercent(row.ratioOfTotal) },
  {
    title: '操作',
    key: 'actions',
    width: 170,
    render: (row) => h(NButton, {
      size: 'small',
      text: true,
      type: 'primary',
      onClick: () => addUnselectedEvent(row.eventName),
    }, { default: () => '加入事件' }),
  },
]

const userColumns: DataTableColumns<{ subjectId: string, pathInstanceId: string, firstEventTime: string, lastEventTime: string, pathSummary: string }> = [
  { title: '主体 ID', key: 'subjectId', width: 120 },
  { title: '路径实例', key: 'pathInstanceId', width: 180 },
  { title: '首次事件时间', key: 'firstEventTime', width: 170 },
  { title: '末次事件时间', key: 'lastEventTime', width: 170 },
  { title: '路径摘要', key: 'pathSummary', minWidth: 260 },
]

const sampleColumns: DataTableColumns<{ pathInstanceId: string, subjectId: string, summary: string }> = [
  { title: '路径实例', key: 'pathInstanceId', width: 180 },
  { title: '主体 ID', key: 'subjectId', width: 120 },
  { title: '路径', key: 'summary', minWidth: 360 },
]

const sampleRows = computed(() =>
  (pathSamples.value?.paths ?? []).map((path) => ({
    pathInstanceId: path.pathInstanceId,
    subjectId: path.subjectId,
    summary: path.nodes.map((node) => node.nodeLabel).join(' → '),
  })),
)

const loadDemoAnalysis = async () => {
  subjectType.value = 'user_id'
  timezone.value = 'UTC+8 北京时间'
  direction.value = 'START_FROM'
  coreEventName.value = 'app_launch'
  includeUnselectedEvents.value = true
  mergeConsecutiveDuplicateEvents.value = true
  sessionIntervalValue.value = 10
  sessionIntervalUnit.value = 'minute'
  quickRange.value = 'last_7_days'
  dateRange.value = [
    dayjs('2026-05-15').valueOf(),
    dayjs('2026-05-21').valueOf(),
  ]
  pathStepCount.value = 5
  maxNodesPerStep.value = 4
  minTrafficRatio.value = 2
  ratioMode.value = 'STEP'
  pinnedNodes.value = []

  coreFilters.conditions = [
    createDemoFilter(
      'demo_core_filter_version',
      'AND',
      'event_property',
      'app_version',
      'App 版本',
      '1.8.3',
      [
        createDemoFilter('demo_core_filter_channel', 'AND', 'user_property', 'channel', '获客渠道', '广告投放'),
      ],
    ),
  ]

  intermediateEvents.value = [
    createDemoPathEvent('app_launch', 0, '应用启动', [], true),
    createDemoPathEvent('game_start', 1, '开始游戏', [
      createDemoFilter('demo_game_type_filter', 'AND', 'event_property', 'game_type', '游戏类型', '斗地主'),
    ]),
    createDemoPathEvent('game_end', 2, '结束游戏'),
    createDemoPathEvent('ad_exposure', 3, '广告入口曝光', [
      createDemoFilter('demo_ad_position_filter', 'AND', 'event_property', 'ad_position', '广告位', '金币不足弹窗'),
    ]),
    createDemoPathEvent('ad_click', 4, '广告点击'),
    createDemoPathEvent('ad_watch_start', 5, '广告开始播放'),
    createDemoPathEvent('ad_watch_complete', 6, '广告观看完成'),
    createDemoPathEvent('reward_claim', 7, '奖励领取'),
    createDemoPathEvent('payment_success', 8, '支付成功'),
  ]

  segmentFilter.conditions = [
    createDemoFilter('demo_segment_active', 'AND', 'cohort', 'seg_active_7d', '用户分群', '近 7 日活跃用户', [
      createDemoFilter('demo_segment_os', 'AND', 'event_property', 'device_os', '设备系统', 'Android'),
    ]),
    createDemoFilter('demo_segment_coin', 'AND', 'user_tag', 'coin_balance_level', '金币余额等级', '低金币'),
    createDemoFilter('demo_segment_active_level', 'AND', 'user_tag', 'active_level', '活跃等级', '高活跃'),
  ]

  groupBy.enabled = true
  groupBy.targetEventId = 'ad_exposure'
  groupBy.fieldType = 'event_property'
  groupBy.fieldName = 'ad_position'
  groupBy.fieldDisplayName = '广告位'
  groupBy.valueLimit = 5
  groupBy.includeOthers = true
  groupBy.includeUnknown = true

  saveAnalysisForm.name = '广告观看路径流向分析'
  saveAnalysisForm.description = '从应用启动开始，观察低金币高活跃用户进入广告观看链路前后的真实行为流向。'
  saveAnalysisForm.tags = '用户路径,广告观看,低金币'
  dashboardForm.title = '广告观看路径桑基图'

  await runAnalysis()
}

const initialize = async () => {
  metadataLoading.value = true
  metadata.value = await userPathAnalysisService.getMetadata()
  metadataLoading.value = false
  await loadDemoAnalysis()
}

onMounted(() => {
  initialize()
})
</script>

<template>
  <div class="user-path-page">
    <div class="page-header">
      <div>
        <h1>用户路径分析</h1>
        <p>分析用户从某个行为开始后的真实流向，或倒推到达关键行为前的行为序列。</p>
      </div>
      <n-space>
        <n-button @click="showSaveAnalysisModal = true">保存分析</n-button>
        <n-button @click="showDashboardModal = true">保存到看板</n-button>
        <n-button @click="resetAnalysis">重置</n-button>
        <n-button @click="exportImage">导出图片</n-button>
        <n-button type="primary" :loading="loading" @click="runAnalysis">查询路径</n-button>
      </n-space>
    </div>

    <n-alert v-if="notice" type="success" closable class="page-alert" @close="notice = ''">
      {{ notice }}
    </n-alert>
    <n-alert v-if="errorMessage" type="error" closable class="page-alert" @close="errorMessage = ''">
      {{ errorMessage }}
    </n-alert>

    <n-spin :show="metadataLoading">
      <div class="path-layout">
        <div class="config-panel">
          <n-card title="1. 路径配置" :bordered="false" class="config-card">
            <div class="form-grid">
              <label>统计主体</label>
              <n-select v-model:value="subjectType" :options="subjectOptions" @update:value="markDirty" />
              <label>路径方向</label>
              <n-radio-group v-model:value="direction" @update:value="updateDirection">
                <n-radio-button value="START_FROM">开始于</n-radio-button>
                <n-radio-button value="END_AT">结束于</n-radio-button>
              </n-radio-group>
              <label>{{ direction === 'START_FROM' ? '起始事件' : '终止事件' }}</label>
              <n-select
                :value="coreEventName"
                filterable
                clearable
                placeholder="搜索事件名称 / 显示名"
                :options="eventOptions"
                @update:value="(value) => updateCoreEvent(value === null ? null : String(value))"
              />
            </div>

            <div class="section-toolbar">
              <strong>核心事件过滤</strong>
              <n-button size="small" @click="addFilter(coreFilters.conditions)">+ 添加过滤</n-button>
            </div>
            <div v-if="coreFilters.conditions.length === 0" class="muted">未配置核心事件过滤。</div>
            <div v-for="(filter, index) in coreFilters.conditions" :key="filter.id" class="filter-card">
              <div class="filter-main-line">
                <n-select
                  v-if="index > 0"
                  v-model:value="filter.relation"
                  class="logic-select"
                  :options="relationOptions"
                  @update:value="markDirty"
                />
                <div v-else class="logic-placeholder" />
                <n-select v-model:value="filter.fieldType" :options="filterFieldTypeOptions" @update:value="() => updateFilterFieldType(filter)" />
                <n-select v-model:value="filter.fieldName" filterable :options="fieldOptionsByType(filter.fieldType)" @update:value="() => updateFilterField(filter)" />
              </div>
              <div class="filter-value-line">
                <n-select v-model:value="filter.operator" :options="filterOperatorOptions" @update:value="markDirty" />
                <n-input :value="filter.displayValue" placeholder="条件值" @update:value="(value) => updateFilterValue(filter, value)" />
                <n-button size="tiny" @click="addChildFilter(filter)">+ 二级</n-button>
                <n-button text type="error" @click="removeFilter(coreFilters.conditions, filter.id)">删除</n-button>
              </div>
              <div v-if="filter.childFilters?.length" class="child-filter-list">
                <div v-for="childFilter in filter.childFilters ?? []" :key="childFilter.id" class="child-filter">
                  <n-select v-model:value="childFilter.relation" class="logic-select" :options="relationOptions" @update:value="markDirty" />
                  <n-select v-model:value="childFilter.fieldType" :options="filterFieldTypeOptions" @update:value="() => updateFilterFieldType(childFilter)" />
                  <n-select v-model:value="childFilter.fieldName" filterable :options="fieldOptionsByType(childFilter.fieldType)" @update:value="() => updateFilterField(childFilter)" />
                  <n-select v-model:value="childFilter.operator" :options="filterOperatorOptions" @update:value="markDirty" />
                  <n-input :value="childFilter.displayValue" placeholder="二级条件值" @update:value="(value) => updateFilterValue(childFilter, value)" />
                  <n-button text type="error" @click="removeChildFilter(filter, childFilter.id)">删除</n-button>
                </div>
              </div>
            </div>

            <div class="section-toolbar">
              <strong>参与分析事件</strong>
              <n-button size="small" :disabled="intermediateEvents.filter((event) => !event.isCoreEvent).length >= 13" @click="openAddEventModal">+ 添加事件</n-button>
            </div>
            <n-empty v-if="intermediateEvents.length === 0" description="选择核心事件后，系统会自动加入参与分析事件。" />
            <div v-for="event in intermediateEvents" :key="event.id" class="event-card">
              <div class="event-head">
                <strong>{{ event.alias || event.eventDisplayName }}</strong>
                <n-space size="small">
                  <n-tag v-if="event.isCoreEvent" size="small" type="success">核心</n-tag>
                  <n-button text type="error" @click="removeIntermediateEvent(event.id)">删除</n-button>
                </n-space>
              </div>
              <div class="form-grid compact">
                <label>事件</label>
                <n-select v-model:value="event.eventName" filterable :options="eventOptions" @update:value="markDirty" />
                <label>别名</label>
                <n-input v-model:value="event.alias" maxlength="30" @update:value="markDirty" />
              </div>
              <div class="section-toolbar slim">
                <span>事件过滤 {{ event.filters.conditions.length }}</span>
                <n-button size="tiny" @click="addFilter(event.filters.conditions)">+ 过滤</n-button>
              </div>
              <div v-for="(filter, index) in event.filters.conditions" :key="filter.id" class="filter-card">
                <div class="filter-main-line">
                  <n-select v-if="index > 0" v-model:value="filter.relation" class="logic-select" :options="relationOptions" @update:value="markDirty" />
                  <div v-else class="logic-placeholder" />
                  <n-select v-model:value="filter.fieldType" :options="filterFieldTypeOptions" @update:value="() => updateFilterFieldType(filter)" />
                  <n-select v-model:value="filter.fieldName" filterable :options="fieldOptionsByType(filter.fieldType)" @update:value="() => updateFilterField(filter)" />
                </div>
                <div class="filter-value-line">
                  <n-select v-model:value="filter.operator" :options="filterOperatorOptions" @update:value="markDirty" />
                  <n-input :value="filter.displayValue" placeholder="条件值" @update:value="(value) => updateFilterValue(filter, value)" />
                  <n-button size="tiny" @click="addChildFilter(filter)">+ 二级</n-button>
                  <n-button text type="error" @click="removeFilter(event.filters.conditions, filter.id)">删除</n-button>
                </div>
                <div v-if="filter.childFilters?.length" class="child-filter-list">
                  <div v-for="childFilter in filter.childFilters ?? []" :key="childFilter.id" class="child-filter">
                    <n-select v-model:value="childFilter.relation" class="logic-select" :options="relationOptions" @update:value="markDirty" />
                    <n-select v-model:value="childFilter.fieldType" :options="filterFieldTypeOptions" @update:value="() => updateFilterFieldType(childFilter)" />
                    <n-select v-model:value="childFilter.fieldName" filterable :options="fieldOptionsByType(childFilter.fieldType)" @update:value="() => updateFilterField(childFilter)" />
                    <n-select v-model:value="childFilter.operator" :options="filterOperatorOptions" @update:value="markDirty" />
                    <n-input :value="childFilter.displayValue" placeholder="二级条件值" @update:value="(value) => updateFilterValue(childFilter, value)" />
                    <n-button text type="error" @click="removeChildFilter(filter, childFilter.id)">删除</n-button>
                  </div>
                </div>
              </div>
            </div>
          </n-card>

          <n-card title="2. 分析范围" :bordered="false" class="config-card">
            <n-space vertical>
              <n-checkbox v-model:checked="includeUnselectedEvents" @update:checked="markDirty">同时计算未选中事件</n-checkbox>
              <n-checkbox v-model:checked="mergeConsecutiveDuplicateEvents" @update:checked="markDirty">合并连续重复事件</n-checkbox>
              <div class="inline-field">
                <span>会话间隔</span>
                <n-input-number v-model:value="sessionIntervalValue" :min="1" @update:value="markDirty" />
                <n-select v-model:value="sessionIntervalUnit" class="small-select" :options="sessionUnitOptions" @update:value="markDirty" />
              </div>
            </n-space>

            <div class="section-toolbar">
              <strong>细分筛选</strong>
              <n-button size="small" @click="addFilter(segmentFilter.conditions)">+ 添加筛选</n-button>
            </div>
            <div v-if="segmentFilter.conditions.length === 0" class="muted">全部用户参与路径分析。</div>
            <div v-for="(filter, index) in segmentFilter.conditions" :key="filter.id" class="filter-card">
              <div class="filter-main-line">
                <n-select v-if="index > 0" v-model:value="filter.relation" class="logic-select" :options="relationOptions" @update:value="markDirty" />
                <div v-else class="logic-placeholder" />
                <n-select v-model:value="filter.fieldType" :options="filterFieldTypeOptions" @update:value="() => updateFilterFieldType(filter)" />
                <n-select v-model:value="filter.fieldName" filterable :options="fieldOptionsByType(filter.fieldType)" @update:value="() => updateFilterField(filter)" />
              </div>
              <div class="filter-value-line">
                <n-select v-model:value="filter.operator" :options="filterOperatorOptions" @update:value="markDirty" />
                <n-input :value="filter.displayValue" placeholder="条件值" @update:value="(value) => updateFilterValue(filter, value)" />
                <n-button size="tiny" @click="addChildFilter(filter)">+ 二级</n-button>
                <n-button text type="error" @click="removeFilter(segmentFilter.conditions, filter.id)">删除</n-button>
              </div>
              <div v-if="filter.childFilters?.length" class="child-filter-list">
                <div v-for="childFilter in filter.childFilters ?? []" :key="childFilter.id" class="child-filter">
                  <n-select v-model:value="childFilter.relation" class="logic-select" :options="relationOptions" @update:value="markDirty" />
                  <n-select v-model:value="childFilter.fieldType" :options="filterFieldTypeOptions" @update:value="() => updateFilterFieldType(childFilter)" />
                  <n-select v-model:value="childFilter.fieldName" filterable :options="fieldOptionsByType(childFilter.fieldType)" @update:value="() => updateFilterField(childFilter)" />
                  <n-select v-model:value="childFilter.operator" :options="filterOperatorOptions" @update:value="markDirty" />
                  <n-input :value="childFilter.displayValue" placeholder="二级条件值" @update:value="(value) => updateFilterValue(childFilter, value)" />
                  <n-button text type="error" @click="removeChildFilter(filter, childFilter.id)">删除</n-button>
                </div>
              </div>
            </div>

            <div class="section-toolbar">
              <strong>属性分组</strong>
              <n-switch v-model:value="groupBy.enabled" @update:value="markDirty" />
            </div>
            <div v-if="groupBy.enabled" class="form-grid compact">
              <label>作用事件</label>
              <n-select v-model:value="groupBy.targetEventId" filterable :options="pathEventOptions" @update:value="markDirty" />
              <label>字段来源</label>
              <n-select v-model:value="groupBy.fieldType" :options="filterFieldTypeOptions.filter((option) => option.value !== 'cohort')" @update:value="() => { groupBy.fieldName = ''; groupBy.fieldDisplayName = ''; markDirty() }" />
              <label>分组字段</label>
              <n-select v-model:value="groupBy.fieldName" filterable :options="fieldOptionsByType(groupBy.fieldType)" @update:value="() => { groupBy.fieldDisplayName = fieldDisplayName(groupBy.fieldType, groupBy.fieldName); markDirty() }" />
              <label>Top N</label>
              <n-input-number v-model:value="groupBy.valueLimit" :min="1" :max="20" @update:value="markDirty" />
              <label>合并规则</label>
              <n-space>
                <n-checkbox v-model:checked="groupBy.includeOthers" @update:checked="markDirty">其他</n-checkbox>
                <n-checkbox v-model:checked="groupBy.includeUnknown" @update:checked="markDirty">未知</n-checkbox>
              </n-space>
            </div>
          </n-card>
        </div>

        <div class="result-panel">
          <n-card :bordered="false" class="toolbar-card">
            <div class="chart-toolbar">
              <div>
                <h3>路径图表控制</h3>
                <p>{{ dayjs(dateRange[0]).format('YYYY-MM-DD') }} 至 {{ dayjs(dateRange[1]).format('YYYY-MM-DD') }} · {{ direction === 'START_FROM' ? '开始于' : '结束于' }} {{ coreEvent?.displayName || '未选择事件' }}</p>
              </div>
              <n-space>
                <n-select v-model:value="quickRange" class="medium-select" :options="quickRangeOptions" @update:value="(value) => applyQuickRange(String(value))" />
                <n-date-picker v-model:value="dateRange" type="daterange" clearable @update:value="markDirty" />
              </n-space>
            </div>
            <div class="control-grid">
              <div>
                <span>路径步数</span>
                <n-input-number v-model:value="pathStepCount" :min="1" :max="10" @update:value="markDirty" />
              </div>
              <div>
                <span>单级最大节点数</span>
                <n-input-number v-model:value="maxNodesPerStep" :min="1" :max="10" @update:value="markDirty" />
              </div>
              <div>
                <span>流量占比阈值 %</span>
                <n-input-number v-model:value="minTrafficRatio" :min="0" :max="100" @update:value="markDirty" />
              </div>
              <div>
                <span>占比口径</span>
                <n-select v-model:value="ratioMode" :options="ratioModeOptions" @update:value="markDirty" />
              </div>
              <div>
                <span>查询状态</span>
                <n-tag :type="queryState === 'success' ? 'success' : queryState === 'dirty' ? 'warning' : queryState === 'error' ? 'error' : 'default'">{{ queryState }}</n-tag>
              </div>
            </div>
          </n-card>

          <n-alert v-if="result?.warnings.length" type="warning">
            {{ result.warnings.map((warning) => warning.message).join('；') }}
          </n-alert>

          <div class="summary-grid">
            <n-card>
              <span>核心用户数</span>
              <strong>{{ formatNumber(result?.summary.coreUserCount ?? 0) }}</strong>
            </n-card>
            <n-card>
              <span>路径实例数</span>
              <strong>{{ formatNumber(result?.summary.corePathCount ?? 0) }}</strong>
            </n-card>
            <n-card>
              <span>展示节点</span>
              <strong>{{ result?.summary.totalDisplayedNodes ?? 0 }}</strong>
            </n-card>
            <n-card>
              <span>展示流向</span>
              <strong>{{ result?.summary.totalDisplayedEdges ?? 0 }}</strong>
            </n-card>
          </div>

          <n-card :bordered="false" class="chart-card">
            <div class="card-title-row">
              <div>
                <h3>用户路径桑基图</h3>
                <p>点击节点或连线可查看详情、用户列表和路径样本。</p>
              </div>
              <n-space>
                <n-button @click="exportPathDetails">导出路径明细</n-button>
                <n-button @click="exportImage">导出图片</n-button>
                <n-button @click="runAnalysis">刷新图表</n-button>
              </n-space>
            </div>
            <n-empty v-if="!result || result.nodes.length === 0" description="请选择起始事件或终止事件后开始用户路径分析">
              <template #extra>
                <n-button type="primary" @click="updateCoreEvent('app_launch')">选择 App 启动</n-button>
              </template>
            </n-empty>
            <v-chart v-else class="sankey-chart" :option="sankeyOption" autoresize @click="handleChartClick" />
          </n-card>

          <n-card :bordered="false" class="result-card">
            <n-tabs type="line">
              <n-tab-pane name="nodes" tab="节点明细">
                <n-data-table :columns="nodeColumns" :data="result?.nodes ?? []" :pagination="{ pageSize: 8 }" />
              </n-tab-pane>
              <n-tab-pane name="edges" tab="流向明细">
                <n-data-table :columns="edgeColumns" :data="result?.edges ?? []" :pagination="{ pageSize: 8 }" />
              </n-tab-pane>
              <n-tab-pane name="hidden" tab="更多分组">
                <n-data-table
                  :columns="[
                    { title: '步骤', key: 'stepIndex' },
                    { title: '原因', key: 'reason' },
                    { title: '合并节点数', key: 'count' },
                    { title: '原始节点', key: 'labels' },
                  ]"
                  :data="(result?.hiddenNodeGroups ?? []).map((group) => ({ ...group, count: group.originalNodes.length, labels: group.originalNodes.map((node) => node.nodeLabel).join('、') }))"
                />
              </n-tab-pane>
            </n-tabs>
          </n-card>
        </div>
      </div>
    </n-spin>

    <n-drawer v-model:show="showDetailDrawer" width="780">
      <n-drawer-content :title="selectedNode ? `节点详情：${selectedNode.nodeLabel}` : selectedEdge ? `流向详情：${selectedEdge.sourceLabel} → ${selectedEdge.targetLabel}` : '路径详情'">
        <n-space vertical size="large">
          <div class="detail-actions">
            <n-button type="primary" @click="saveCohort">保存为用户分群</n-button>
            <n-button @click="exportUsers">导出用户 ID</n-button>
            <n-button v-if="selectedNode" @click="setNodeAsCore(selectedNode, 'START_FROM')">设为新的起始事件</n-button>
            <n-button v-if="selectedNode" @click="setNodeAsCore(selectedNode, 'END_AT')">设为新的终止事件</n-button>
          </div>
          <n-alert v-if="selectedNode?.nodeType === 'UNSELECTED_EVENT'" type="info">
            未选中事件节点用于展示真实发生、但未加入参与分析事件集合的行为。可将 Top 未选中事件补充为参与分析事件。
          </n-alert>
          <n-alert v-if="selectedNode?.nodeType === 'DROP_OFF'" type="warning">
            流失表示会话间隔内没有任何后续事件，而不是没有发生已配置事件。
          </n-alert>
          <div v-if="selectedNode" class="detail-metrics">
            <n-card size="small">
              <span>步骤</span>
              <strong>第 {{ selectedNode.stepIndex }} 步</strong>
            </n-card>
            <n-card size="small">
              <span>到达人数</span>
              <strong>{{ formatNumber(selectedNode.userCount) }}</strong>
            </n-card>
            <n-card size="small">
              <span>路径次数</span>
              <strong>{{ formatNumber(selectedNode.pathCount) }}</strong>
            </n-card>
            <n-card size="small">
              <span>占当前步骤</span>
              <strong>{{ formatPercent(selectedNode.ratioOfStep) }}</strong>
            </n-card>
          </div>
          <div v-if="selectedEdge" class="detail-metrics">
            <n-card size="small">
              <span>流转人数</span>
              <strong>{{ formatNumber(selectedEdge.userCount) }}</strong>
            </n-card>
            <n-card size="small">
              <span>路径次数</span>
              <strong>{{ formatNumber(selectedEdge.pathCount) }}</strong>
            </n-card>
            <n-card size="small">
              <span>占来源节点</span>
              <strong>{{ formatPercent(selectedEdge.ratioOfSource) }}</strong>
            </n-card>
            <n-card size="small">
              <span>占总路径</span>
              <strong>{{ formatPercent(selectedEdge.ratioOfTotal) }}</strong>
            </n-card>
          </div>
          <n-tabs>
            <n-tab-pane v-if="selectedNode" name="flows" tab="上下游流向">
              <n-space vertical>
                <div>
                  <strong>上游 Top 10</strong>
                  <n-data-table :columns="edgeColumns" :data="selectedIncomingEdges" :pagination="{ pageSize: 5 }" />
                </div>
                <div>
                  <strong>下游 Top 10</strong>
                  <n-data-table :columns="edgeColumns" :data="selectedOutgoingEdges" :pagination="{ pageSize: 5 }" />
                </div>
              </n-space>
            </n-tab-pane>
            <n-tab-pane v-if="selectedNode?.nodeType === 'UNSELECTED_EVENT'" name="unselected" tab="未选中事件">
              <n-data-table :columns="unselectedEventColumns" :data="selectedUnselectedEvents" :pagination="{ pageSize: 8 }" />
            </n-tab-pane>
            <n-tab-pane v-if="selectedNode?.nodeType === 'MORE_GROUP'" name="more" tab="更多分组">
              <n-data-table :columns="hiddenNodeColumns" :data="selectedHiddenGroup?.originalNodes ?? []" :pagination="{ pageSize: 8 }" />
            </n-tab-pane>
            <n-tab-pane name="users" tab="用户列表">
              <n-data-table :columns="userColumns" :data="usersResult?.users ?? []" :pagination="{ pageSize: 6 }" />
            </n-tab-pane>
            <n-tab-pane name="samples" tab="路径样本">
              <n-data-table :columns="sampleColumns" :data="sampleRows" :pagination="{ pageSize: 6 }" />
            </n-tab-pane>
          </n-tabs>
        </n-space>
      </n-drawer-content>
    </n-drawer>

    <n-modal v-model:show="showAddEventModal" preset="card" title="添加参与分析事件" class="small-modal">
      <n-space vertical>
        <n-select
          v-model:value="candidateEventName"
          filterable
          clearable
          placeholder="搜索事件名称 / 显示名"
          :options="eventOptions"
        />
        <n-alert type="info">
          中间参与分析事件最多 13 个；路径只识别这些事件、核心事件和特殊合并节点。
        </n-alert>
        <n-space justify="end">
          <n-button @click="showAddEventModal = false">取消</n-button>
          <n-button type="primary" :disabled="!candidateEventName" @click="confirmAddIntermediateEvent">添加事件</n-button>
        </n-space>
      </n-space>
    </n-modal>

    <n-modal v-model:show="showSaveAnalysisModal" preset="card" title="保存分析" class="small-modal">
      <n-space vertical>
        <n-input v-model:value="saveAnalysisForm.name" placeholder="分析名称" />
        <n-select v-model:value="saveAnalysisForm.folder" :options="[{ label: '个人空间 / 我的分析', value: '个人空间 / 我的分析' }, { label: '团队空间 / 运营团队', value: '团队空间 / 运营团队' }]" />
        <n-input v-model:value="saveAnalysisForm.description" type="textarea" placeholder="描述" />
        <n-input v-model:value="saveAnalysisForm.tags" placeholder="标签，逗号分隔" />
        <n-radio-group v-model:value="saveAnalysisForm.timeMode">
          <n-radio-button value="relative">相对时间</n-radio-button>
          <n-radio-button value="fixed">固定时间</n-radio-button>
        </n-radio-group>
        <n-switch v-model:value="saveAnalysisForm.favorite">
          <template #checked>常用</template>
          <template #unchecked>不设为常用</template>
        </n-switch>
        <n-button type="primary" block @click="saveAnalysis">保存</n-button>
      </n-space>
    </n-modal>

    <n-modal v-model:show="showDashboardModal" preset="card" title="保存到看板" class="small-modal">
      <n-space vertical>
        <n-input v-model:value="dashboardForm.title" placeholder="图表名称" />
        <n-select v-model:value="dashboardForm.dashboard" :options="[{ label: '个人空间 / 用户行为看板', value: '个人空间 / 用户行为看板' }, { label: '团队空间 / 增长日报', value: '团队空间 / 增长日报' }]" />
        <n-radio-group v-model:value="dashboardForm.timeMode">
          <n-radio-button value="relative">相对时间</n-radio-button>
          <n-radio-button value="fixed">固定时间</n-radio-button>
        </n-radio-group>
        <n-select v-model:value="dashboardForm.refreshPolicy" :options="[{ label: '手动刷新', value: 'manual' }, { label: '每日刷新', value: 'daily' }]" />
        <n-checkbox v-model:checked="dashboardForm.inheritPermission">继承看板权限</n-checkbox>
        <n-button type="primary" block @click="saveWidgetToDashboard">保存到看板</n-button>
      </n-space>
    </n-modal>
  </div>
</template>

<style scoped lang="scss">
.user-path-page {
  min-height: 100%;
  padding: 24px;
  background: #f3f6fa;
}

.page-header,
.section-toolbar,
.event-head,
.card-title-row,
.chart-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.page-header {
  margin-bottom: 16px;

  h1 {
    margin: 0 0 8px;
    font-size: 30px;
    color: #111827;
  }

  p {
    margin: 0;
    color: #667085;
  }
}

.page-alert {
  margin-bottom: 16px;
}

.path-layout {
  display: grid;
  grid-template-columns: 520px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.config-panel,
.result-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.config-card,
.toolbar-card,
.chart-card,
.result-card,
.summary-grid :deep(.n-card) {
  border-radius: 8px;
}

.form-grid {
  display: grid;
  grid-template-columns: 100px minmax(0, 1fr);
  gap: 14px 16px;
  align-items: center;

  label {
    font-weight: 700;
    color: #344054;
  }
}

.form-grid.compact {
  grid-template-columns: 72px minmax(0, 1fr);
}

.section-toolbar {
  margin: 18px 0 10px;
  align-items: center;
}

.section-toolbar.slim {
  margin: 12px 0 8px;
  color: #667085;
}

.event-card,
.filter-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
  padding: 12px;
  margin-top: 10px;
}

.event-head {
  align-items: center;
  margin-bottom: 12px;
}

.filter-main-line,
.filter-value-line {
  display: grid;
  gap: 10px;
  align-items: center;
}

.filter-main-line {
  grid-template-columns: 76px minmax(0, 1fr) minmax(0, 1fr);
}

.filter-value-line {
  margin-top: 10px;
  grid-template-columns: 96px minmax(0, 1fr) 72px 44px;
}

.child-filter-list {
  margin-top: 10px;
  margin-left: 20px;
  padding-left: 12px;
  border-left: 2px solid #bbf7d0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.child-filter {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;
  align-items: center;
}

.logic-select,
.logic-placeholder {
  width: 76px;
}

.inline-field {
  display: grid;
  grid-template-columns: 80px minmax(0, 1fr) 120px;
  gap: 10px;
  align-items: center;
}

.small-select {
  width: 120px;
}

.medium-select {
  width: 180px;
}

.muted {
  color: #667085;
}

.chart-toolbar {
  align-items: center;
  margin-bottom: 16px;

  h3 {
    margin: 0 0 6px;
  }

  p {
    margin: 0;
    color: #667085;
  }
}

.control-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;

  > div {
    display: flex;
    flex-direction: column;
    gap: 8px;
    color: #344054;
    font-weight: 700;
  }
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;

  :deep(.n-card__content) {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  span {
    color: #667085;
  }

  strong {
    font-size: 26px;
    color: #111827;
  }
}

.chart-card {
  min-height: 520px;
}

.sankey-chart {
  width: 100%;
  height: 460px;
}

.detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.detail-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;

  :deep(.n-card__content) {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  span {
    color: #667085;
  }

  strong {
    color: #111827;
    font-size: 18px;
  }
}

.small-modal {
  width: 560px;
}

.filter-card :deep(.n-select),
.filter-card :deep(.n-input),
.filter-card :deep(.n-input-number) {
  min-width: 0;
}

@media (max-width: 1280px) {
  .path-layout {
    grid-template-columns: 1fr;
  }

  .control-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
