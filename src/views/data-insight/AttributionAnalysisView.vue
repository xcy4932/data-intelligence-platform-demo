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
  NStatistic,
  NSwitch,
  NTag,
} from 'naive-ui'
import type { DataTableColumns, SelectOption } from 'naive-ui'
import { computed, h, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import VChart from 'vue-echarts'
import { attributionModelLabels, createDefaultEventNode, createDefaultPropertyNode } from '@/mock/attributionAnalysis'
import { attributionAnalysisService } from '@/services/attributionAnalysisService'
import type { EventDefinition, EventProperty } from '@/types/eventAnalysis'
import type {
  AttributionDashboardWidgetPayload,
  AttributionEventNode,
  AttributionFilterCondition,
  AttributionFilterOperator,
  AttributionFilterRelation,
  AttributionMetadata,
  AttributionModelType,
  AttributionPath,
  AttributionPathResponse,
  AttributionPlatformType,
  AttributionPropertyNode,
  AttributionPropertyScope,
  AttributionQueryRequest,
  AttributionQueryResponse,
  AttributionQueryState,
  AttributionResultMode,
  AttributionResultRow,
  AttributionSortBy,
  AttributionSubjectType,
  AttributionUserListResponse,
  AttributionWindowConfig,
  LookbackWindow,
  ProcessEvent,
  RelationProperty,
  SavedAttributionAnalysisPayload,
  SegmentFilter,
  TargetMetricAggregator,
  TouchPoint,
} from '@/types/attributionAnalysis'

type DateRangeValue = [number, number]

interface ModelCompareRow {
  attributionKey: string
  attributionLabel: string
  [key: string]: string | number
}

interface ChartClickParams {
  name?: string
  seriesName?: string
}

const metadataLoading = ref(false)
const loading = ref(false)
const queryState = ref<AttributionQueryState>('idle')
const notice = ref('')
const errorMessage = ref('')
const metadata = ref<AttributionMetadata | null>(null)
const result = ref<AttributionQueryResponse | null>(null)
const usersResult = ref<AttributionUserListResponse | null>(null)
const pathsResult = ref<AttributionPathResponse | null>(null)
const showUserDrawer = ref(false)
const showPathDrawer = ref(false)
const showSaveAnalysisModal = ref(false)
const showSaveDashboardModal = ref(false)
const selectedAttributionLabel = ref('')
const router = useRouter()

const subjectType = ref<AttributionSubjectType>('user_id')
const platformType = ref<AttributionPlatformType>('app')
const timezone = ref('UTC+8 北京时间')
const attributionType = ref<'event' | 'property'>('event')
const targetEventName = ref('')
const targetMetricAggregator = ref<TargetMetricAggregator>('COUNT')
const targetMetricPropertyName = ref('')
const eventNodes = ref<AttributionEventNode[]>([])
const propertyNode = reactive<AttributionPropertyNode>(createDefaultPropertyNode())
const includeOtherConversions = ref(false)
const processEnabled = ref(false)
const processRelation = ref<'ALL_REQUIRED' | 'ANY_REQUIRED'>('ALL_REQUIRED')
const processEvents = ref<ProcessEvent[]>([])
const segmentFilter = reactive<SegmentFilter>({ relation: 'AND', conditions: [] })
const selectedModels = ref<AttributionModelType[]>(['LAST_TOUCH'])
const selectedModel = ref<AttributionModelType>('LAST_TOUCH')
const resultMode = ref<AttributionResultMode>('table')
const sortBy = ref<AttributionSortBy>('contribution_desc')
const showUnknown = ref(true)
const showOthers = ref(true)
const quickRange = ref('last_7_days')
const dateRange = ref<DateRangeValue>([
  dayjs('2026-05-15').valueOf(),
  dayjs('2026-05-21').valueOf(),
])
const lookbackWindow = reactive<LookbackWindow>({
  value: 7,
  unit: 'day',
})
const timeDecayHalfLife = ref(7)
const positionFirstWeight = ref(40)
const positionLastWeight = ref(40)
const attributionWindowConfig = reactive<AttributionWindowConfig>({
  click: {
    enabled: true,
    value: 7,
    unit: 'day',
    matchMethods: ['device_id'],
  },
  impression: {
    enabled: false,
    value: 24,
    unit: 'hour',
  },
  reAttribution: {
    value: 90,
    unit: 'day',
  },
  deepEventPostback: {
    value: 60,
    unit: 'day',
  },
  webPropertyMode: 'recent_ad_property',
})

const saveAnalysisForm = reactive({
  name: '未命名归因分析',
  folder: '个人空间 / 我的分析',
  description: '',
  tags: '归因分析,广告',
  timeMode: 'relative' as 'fixed' | 'relative',
  favorite: false,
})

const dashboardForm = reactive({
  title: '归因贡献度组件',
  dashboard: '个人空间 / 运营监控看板',
  widgetType: 'attribution_table' as AttributionDashboardWidgetPayload['widgetType'],
  refreshPolicy: 'daily' as AttributionDashboardWidgetPayload['refreshPolicy'],
})

const subjectOptions: SelectOption[] = [
  { label: '用户 ID', value: 'user_id' },
  { label: '设备 ID', value: 'device_id' },
  { label: '账号 ID', value: 'account_id' },
  { label: '匿名 ID', value: 'anonymous_id' },
  { label: '自定义主体', value: 'custom_id' },
]

const platformOptions: SelectOption[] = [
  { label: '移动 App', value: 'app' },
  { label: 'Web 网页', value: 'web' },
  { label: '微信小程序', value: 'mini_program' },
  { label: '通用站内事件', value: 'internal' },
]

const targetMetricOptions: SelectOption[] = [
  { label: '目标事件次数 COUNT', value: 'COUNT' },
  { label: '触发用户数 USER_COUNT', value: 'USER_COUNT' },
  { label: '数值属性求和 SUM', value: 'SUM' },
  { label: '数值属性均值 AVG', value: 'AVG' },
  { label: '最大值 MAX', value: 'MAX' },
  { label: '最小值 MIN', value: 'MIN' },
]

const modelOptions: SelectOption[] = [
  { label: '首次归因', value: 'FIRST_TOUCH' },
  { label: '末次归因', value: 'LAST_TOUCH' },
  { label: '线性归因', value: 'LINEAR' },
  { label: '位置归因', value: 'POSITION_BASED' },
  { label: '时间衰减归因', value: 'TIME_DECAY' },
]

const resultModeOptions: SelectOption[] = [
  { label: '贡献度表格', value: 'table' },
  { label: '柱状图', value: 'bar' },
  { label: '趋势图', value: 'trend' },
  { label: '模型对比', value: 'model_compare' },
  { label: '路径明细', value: 'path_detail' },
]

const sortOptions: SelectOption[] = [
  { label: '贡献度降序', value: 'contribution_desc' },
  { label: '贡献度升序', value: 'contribution_asc' },
  { label: '转化目标降序', value: 'target_metric_desc' },
  { label: '触发次数降序', value: 'trigger_count_desc' },
  { label: '相关性降序', value: 'correlation_desc' },
]

const filterFieldTypeOptions: SelectOption[] = [
  { label: '事件属性', value: 'event_property' },
  { label: '公共属性', value: 'event_public_property' },
  { label: '用户属性', value: 'user_property' },
  { label: '用户标签', value: 'user_tag' },
  { label: '用户分群', value: 'cohort' },
  { label: '广告属性', value: 'ad_property' },
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

const clickMatchMethodOptions: SelectOption[] = [
  { label: '设备号精准匹配', value: 'device_id' },
  { label: '设备指纹', value: 'fingerprint' },
  { label: '剪贴板', value: 'clipboard' },
  { label: 'SRN 媒体', value: 'srn' },
]

const webPropertyModeOptions: SelectOption[] = [
  { label: '最近广告属性', value: 'recent_ad_property' },
  { label: '首次广告属性', value: 'first_ad_property' },
  { label: '单次访问属性', value: 'session_ad_property' },
  { label: '落地页广告属性', value: 'landing_page_ad_property' },
]

const attributionPropertyOptions = computed<SelectOption[]>(() =>
  (metadata.value?.recommendedProperties ?? [])
    .filter((property) => property.platformTypes.includes(platformType.value))
    .map((property) => ({
      label: `${property.propertyDisplayName} ${property.propertyName}`,
      value: `${property.propertyScope}:${property.propertyName}`,
    })),
)

const eventOptions = computed<SelectOption[]>(() =>
  (metadata.value?.eventMetadata.events ?? []).map((event) => ({
    label: `${event.displayName} ${event.eventName}`,
    value: event.eventName,
  })),
)

const selectedTargetEvent = computed<EventDefinition | undefined>(() =>
  metadata.value?.eventMetadata.events.find((event) => event.eventName === targetEventName.value),
)

const targetMetricPropertyOptions = computed<SelectOption[]>(() =>
  (selectedTargetEvent.value?.properties ?? [])
    .filter((property) => property.dataType === 'number')
    .map((property) => ({
      label: `${property.displayName} ${property.propertyName}`,
      value: property.propertyName,
    })),
)

const propertyFieldOptions = computed<SelectOption[]>(() => {
  const eventProperties = metadata.value?.eventMetadata.events.flatMap((event) => event.properties) ?? []
  const eventOptionsFromProperties = eventProperties.map((property) => ({
    label: `${property.displayName} ${property.propertyName}`,
    value: property.propertyName,
  }))
  const userAttributeOptions = metadata.value?.eventMetadata.userAttributes.map((field) => ({
    label: `${field.displayName} ${field.field}`,
    value: field.field,
  })) ?? []
  const tagOptions = metadata.value?.eventMetadata.userTags.map((tag) => ({
    label: `${tag.displayName} ${tag.field}`,
    value: tag.field,
  })) ?? []

  return [...eventOptionsFromProperties, ...userAttributeOptions, ...tagOptions]
})

const activeModelResult = computed(() =>
  result.value?.models.find((model) => model.modelType === selectedModel.value)
  ?? result.value?.models[0]
  ?? null,
)

const activeRows = computed<AttributionResultRow[]>(() => activeModelResult.value?.rows ?? [])

const modelCompareRows = computed<ModelCompareRow[]>(() => {
  const rowMap = new Map<string, ModelCompareRow>()

  result.value?.models.forEach((model) => {
    model.rows.forEach((row) => {
      const current = rowMap.get(row.attributionKey) ?? {
        attributionKey: row.attributionKey,
        attributionLabel: row.attributionLabel,
      }
      current[model.modelType] = row.contributionRate
      rowMap.set(row.attributionKey, current)
    })
  })

  return Array.from(rowMap.values())
})

const selectedMetricLabel = computed(() => {
  if (targetMetricAggregator.value === 'COUNT') return '目标事件次数'
  if (targetMetricAggregator.value === 'USER_COUNT') return '目标用户数'
  const property = targetMetricPropertyOptions.value.find((item) => item.value === targetMetricPropertyName.value)
  return `${property?.label ?? '数值属性'} ${targetMetricAggregator.value}`
})

const canRunAnalysis = computed(() => {
  if (!targetEventName.value || selectedModels.value.length === 0) return false
  if (['SUM', 'AVG', 'MAX', 'MIN'].includes(targetMetricAggregator.value) && !targetMetricPropertyName.value) return false
  if (attributionType.value === 'event') return eventNodes.value.length > 0
  return Boolean(propertyNode.propertyName)
})

const buildFilter = (relation: AttributionFilterRelation = 'AND'): AttributionFilterCondition => ({
  id: `attr_filter_${Date.now()}_${Math.random().toString(16).slice(2)}`,
  relation,
  fieldType: 'user_property',
  fieldName: 'channel',
  fieldDisplayName: '获客渠道',
  operator: 'eq',
  value: 'natural',
  displayValue: '自然量',
  childFilters: [],
})

const buildPresetFilter = (config: {
  id: string
  relation?: AttributionFilterRelation
  fieldType: AttributionPropertyScope
  fieldName: string
  fieldDisplayName: string
  operator: AttributionFilterOperator
  value: AttributionFilterCondition['value']
  displayValue: string
  childFilters?: AttributionFilterCondition[]
}): AttributionFilterCondition => ({
  id: config.id,
  relation: config.relation ?? 'AND',
  fieldType: config.fieldType,
  fieldName: config.fieldName,
  fieldDisplayName: config.fieldDisplayName,
  operator: config.operator,
  value: config.value,
  displayValue: config.displayValue,
  childFilters: config.childFilters ?? [],
})

const cloneFilter = (filter: AttributionFilterCondition): AttributionFilterCondition => ({
  ...filter,
  id: `attr_filter_copy_${Date.now()}_${Math.random().toString(16).slice(2)}`,
  childFilters: filter.childFilters?.map(cloneFilter) ?? [],
})

const markDirty = () => {
  if (queryState.value !== 'loading') {
    queryState.value = 'dirty'
  }
}

const findEvent = (eventName: string): EventDefinition | undefined =>
  metadata.value?.eventMetadata.events.find((event) => event.eventName === eventName)

const findEventProperty = (eventName: string, propertyName: string): EventProperty | undefined =>
  findEvent(eventName)?.properties.find((property) => property.propertyName === propertyName)

const getEventPropertyOptions = (eventName: string, dataType?: EventProperty['dataType']): SelectOption[] =>
  (findEvent(eventName)?.properties ?? [])
    .filter((property) => !dataType || property.dataType === dataType)
    .map((property) => ({
      label: `${property.displayName} ${property.propertyName}`,
      value: property.propertyName,
    }))

const updateTargetMetricProperty = () => {
  const property = findEventProperty(targetEventName.value, targetMetricPropertyName.value)
  return property
    ? {
        propertyName: property.propertyName,
        propertyDisplayName: property.displayName,
        propertyType: property.dataType,
      }
    : {}
}

const updateEventNodeName = (node: AttributionEventNode, eventName: string) => {
  const event = findEvent(eventName)
  node.eventName = eventName
  node.eventDisplayName = event?.displayName ?? eventName
  if (!node.alias || node.alias.startsWith('待归因事件')) {
    node.alias = event?.displayName ?? eventName
  }
  markDirty()
}

const updateEventNodeGroupBy = (node: AttributionEventNode, fieldName: string | null) => {
  if (!fieldName) {
    node.groupBy = undefined
    markDirty()
    return
  }

  const option = propertyFieldOptions.value.find((item) => item.value === fieldName)
  node.groupBy = {
    fieldType: 'event_property',
    fieldName,
    fieldDisplayName: String(option?.label ?? fieldName).split(' ')[0] ?? fieldName,
    topN: 10,
  }
  markDirty()
}

const updatePropertyNode = (value: string) => {
  const [scope, propertyName] = value.split(':') as [AttributionPropertyScope, string]
  const property = metadata.value?.recommendedProperties.find(
    (item) => item.propertyScope === scope && item.propertyName === propertyName,
  )

  propertyNode.propertyScope = scope
  propertyNode.propertyName = propertyName
  propertyNode.propertyDisplayName = property?.propertyDisplayName ?? propertyName
  markDirty()
}

const addEventNode = () => {
  if (eventNodes.value.length >= 10) {
    notice.value = 'Demo 阶段最多支持 10 个待归因事件。'
    return
  }

  eventNodes.value.push(createDefaultEventNode(eventNodes.value.length))
  markDirty()
}

const copyEventNode = (node: AttributionEventNode) => {
  if (eventNodes.value.length >= 10) {
    notice.value = 'Demo 阶段最多支持 10 个待归因事件。'
    return
  }

  eventNodes.value.push({
    ...node,
    id: `attr_node_copy_${Date.now()}`,
    alias: `${node.alias} 副本`,
    filters: node.filters.map(cloneFilter),
  })
  markDirty()
}

const removeEventNode = (nodeId: string) => {
  eventNodes.value = eventNodes.value.filter((node) => node.id !== nodeId)
  markDirty()
}

const addNodeFilter = (node: AttributionEventNode) => {
  node.filters.push(buildFilter(node.filters.length === 0 ? 'AND' : 'AND'))
  markDirty()
}

const removeNodeFilter = (node: AttributionEventNode, filterId: string) => {
  node.filters = node.filters.filter((filter) => filter.id !== filterId)
  markDirty()
}

const addChildFilter = (filter: AttributionFilterCondition) => {
  filter.childFilters = [...(filter.childFilters ?? []), buildFilter('AND')]
  markDirty()
}

const removeChildFilter = (filter: AttributionFilterCondition, childFilterId: string) => {
  filter.childFilters = (filter.childFilters ?? []).filter((childFilter) => childFilter.id !== childFilterId)
  markDirty()
}

const addPropertyFilter = () => {
  propertyNode.filters.push(buildFilter(propertyNode.filters.length === 0 ? 'AND' : 'AND'))
  markDirty()
}

const removePropertyFilter = (filterId: string) => {
  propertyNode.filters = propertyNode.filters.filter((filter) => filter.id !== filterId)
  markDirty()
}

const addTargetFilter = () => {
  targetFilters.value.push(buildFilter(targetFilters.value.length === 0 ? 'AND' : 'AND'))
  markDirty()
}

const removeTargetFilter = (filterId: string) => {
  targetFilters.value = targetFilters.value.filter((filter) => filter.id !== filterId)
  markDirty()
}

const addSegmentFilter = () => {
  segmentFilter.conditions.push(buildFilter(segmentFilter.conditions.length === 0 ? 'AND' : 'AND'))
  markDirty()
}

const removeSegmentFilter = (filterId: string) => {
  segmentFilter.conditions = segmentFilter.conditions.filter((filter) => filter.id !== filterId)
  markDirty()
}

const addProcessEvent = () => {
  const event = findEvent('game_start') ?? metadata.value?.eventMetadata.events[0]
  processEvents.value.push({
    id: `process_${Date.now()}`,
    eventName: event?.eventName ?? '',
    eventDisplayName: event?.displayName ?? '过程事件',
    filters: [],
    relationProperties: [],
  })
  processEnabled.value = true
  markDirty()
}

const updateProcessEventName = (processEvent: ProcessEvent, eventName: string) => {
  const event = findEvent(eventName)
  processEvent.eventName = eventName
  processEvent.eventDisplayName = event?.displayName ?? eventName
  markDirty()
}

const removeProcessEvent = (eventId: string) => {
  processEvents.value = processEvents.value.filter((event) => event.id !== eventId)
  markDirty()
}

const addProcessFilter = (processEvent: ProcessEvent) => {
  processEvent.filters.push(buildFilter(processEvent.filters.length === 0 ? 'AND' : 'AND'))
  markDirty()
}

const removeProcessFilter = (processEvent: ProcessEvent, filterId: string) => {
  processEvent.filters = processEvent.filters.filter((filter) => filter.id !== filterId)
  markDirty()
}

const addRelationProperty = (processEvent: ProcessEvent) => {
  const sourceProperty = findEvent(processEvent.eventName)?.properties.find((property) => property.dataType === 'string')
  const targetProperty = selectedTargetEvent.value?.properties.find((property) => property.dataType === sourceProperty?.dataType)
  const relation: RelationProperty = {
    id: `relation_${Date.now()}`,
    leftEventId: processEvent.id,
    leftEventName: processEvent.eventName,
    leftPropertyName: sourceProperty?.propertyName ?? 'product_id',
    leftPropertyDisplayName: sourceProperty?.displayName ?? '商品 ID',
    rightEventId: 'target',
    rightEventName: targetEventName.value,
    rightPropertyName: targetProperty?.propertyName ?? sourceProperty?.propertyName ?? 'product_id',
    rightPropertyDisplayName: targetProperty?.displayName ?? sourceProperty?.displayName ?? '商品 ID',
    propertyType: sourceProperty?.dataType ?? 'string',
  }

  processEvent.relationProperties.push(relation)
  markDirty()
}

const updateRelationLeftProperty = (processEvent: ProcessEvent, relation: RelationProperty, propertyName: string) => {
  const property = findEventProperty(processEvent.eventName, propertyName)
  relation.leftPropertyName = propertyName
  relation.leftPropertyDisplayName = property?.displayName ?? propertyName
  relation.propertyType = property?.dataType ?? relation.propertyType
  const currentRightProperty = findEventProperty(targetEventName.value, relation.rightPropertyName)

  if (currentRightProperty?.dataType !== relation.propertyType) {
    const rightProperty = selectedTargetEvent.value?.properties.find((item) => item.dataType === relation.propertyType)
    relation.rightPropertyName = rightProperty?.propertyName ?? ''
    relation.rightPropertyDisplayName = rightProperty?.displayName ?? '请选择目标属性'
  }
  markDirty()
}

const updateRelationRightProperty = (relation: RelationProperty, propertyName: string) => {
  const property = findEventProperty(targetEventName.value, propertyName)
  relation.rightPropertyName = propertyName
  relation.rightPropertyDisplayName = property?.displayName ?? propertyName
  markDirty()
}

const removeRelationProperty = (processEvent: ProcessEvent, relationId: string) => {
  processEvent.relationProperties = processEvent.relationProperties.filter((relation) => relation.id !== relationId)
  markDirty()
}

const targetFilters = ref<AttributionFilterCondition[]>([])

const currentDateRangeLabel = computed(() =>
  `${dayjs(dateRange.value[0]).format('YYYY-MM-DD')} 至 ${dayjs(dateRange.value[1]).format('YYYY-MM-DD')}`,
)

const applyQuickRange = (value: string) => {
  const end = dayjs('2026-05-21')
  const daysMap: Record<string, number> = {
    today: 1,
    yesterday: 1,
    last_7_days: 7,
    last_14_days: 14,
    last_30_days: 30,
  }
  const days = daysMap[value] ?? 7
  const actualEnd = value === 'yesterday' ? end.subtract(1, 'day') : end
  dateRange.value = [actualEnd.subtract(days - 1, 'day').valueOf(), actualEnd.valueOf()]
  quickRange.value = value
  markDirty()
}

const buildQuery = (): AttributionQueryRequest => {
  const event = selectedTargetEvent.value
  const metricProperty = updateTargetMetricProperty()

  return {
    projectId: 'demo_project',
    subject: {
      subjectType: subjectType.value,
      displayName: subjectOptions.find((item) => item.value === subjectType.value)?.label as string,
    },
    platformType: platformType.value,
    timezone: timezone.value,
    targetEvent: event
      ? {
          eventName: event.eventName,
          eventDisplayName: event.displayName,
          filters: targetFilters.value,
          metric: {
            aggregator: targetMetricAggregator.value,
            ...metricProperty,
          },
        }
      : undefined,
    attributionConfig: attributionType.value === 'event'
      ? {
          attributionType: 'event',
          nodes: eventNodes.value,
          includeOtherConversions: includeOtherConversions.value,
        }
      : {
          attributionType: 'property',
          propertyNode: { ...propertyNode, filters: [...propertyNode.filters] },
        },
    processEventConfig: {
      enabled: processEnabled.value,
      events: processEvents.value,
      relation: processRelation.value,
    },
    segmentFilter,
    queryTime: {
      startTime: dayjs(dateRange.value[0]).format('YYYY-MM-DD'),
      endTime: dayjs(dateRange.value[1]).format('YYYY-MM-DD'),
      granularity: 'day',
      timezone: timezone.value,
    },
    lookbackWindow,
    selectedModels: selectedModels.value,
    modelOptions: {
      timeDecay: {
        halfLifeValue: timeDecayHalfLife.value,
        halfLifeUnit: 'day',
      },
      positionBased: {
        firstWeight: positionFirstWeight.value,
        lastWeight: positionLastWeight.value,
        middleWeight: Math.max(100 - positionFirstWeight.value - positionLastWeight.value, 0),
      },
    },
    attributionWindowConfig: {
      click: {
        enabled: attributionWindowConfig.click.enabled,
        value: attributionWindowConfig.click.value,
        unit: attributionWindowConfig.click.unit,
        matchMethods: [...attributionWindowConfig.click.matchMethods],
      },
      impression: {
        enabled: attributionWindowConfig.impression.enabled,
        value: attributionWindowConfig.impression.value,
        unit: 'hour',
      },
      reAttribution: { ...attributionWindowConfig.reAttribution },
      deepEventPostback: { ...attributionWindowConfig.deepEventPostback },
      webPropertyMode: attributionWindowConfig.webPropertyMode,
    },
    viewConfig: {
      resultMode: resultMode.value,
      sortBy: sortBy.value,
      showUnknown: showUnknown.value,
      showOthers: showOthers.value,
    },
  }
}

const validateQuery = (): string | null => {
  if (!targetEventName.value) return '请选择目标事件。'
  if (['SUM', 'AVG', 'MAX', 'MIN'].includes(targetMetricAggregator.value) && !targetMetricPropertyName.value) {
    return '请选择目标事件的数值属性。'
  }
  if (attributionType.value === 'event' && eventNodes.value.length === 0) {
    return '请至少配置一个待归因事件。'
  }
  if (attributionType.value === 'property' && !propertyNode.propertyName) {
    return '请选择待归因属性。'
  }
  if (lookbackWindow.value < 1) return '回溯期不能小于 1。'
  if (lookbackWindow.unit === 'day' && lookbackWindow.value > 90) return '默认最大回溯期为 90 天。'
  if (selectedModels.value.length === 0) return '请至少选择一种归因模型。'
  if (attributionType.value === 'property' && includeOtherConversions.value) return '属性归因不支持也计算其他转化。'
  if (selectedModels.value.includes('POSITION_BASED') && positionFirstWeight.value + positionLastWeight.value > 100) {
    return '位置归因首末权重之和不能超过 100%。'
  }
  if (attributionWindowConfig.click.enabled && attributionWindowConfig.click.matchMethods.includes('fingerprint') && attributionWindowConfig.click.unit === 'day' && attributionWindowConfig.click.value > 1) {
    return '设备指纹模糊匹配最长支持 24 小时。'
  }
  if (attributionWindowConfig.impression.enabled && (attributionWindowConfig.impression.value < 1 || attributionWindowConfig.impression.value > 24)) {
    return '展示归因窗口仅支持 1-24 小时。'
  }

  return null
}

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
  const response = await attributionAnalysisService.runAnalysis(buildQuery())
  result.value = response
  selectedModel.value = response.models[0]?.modelType ?? selectedModel.value
  queryState.value = response.models.length ? 'success' : 'empty'
  notice.value = response.models.length
    ? `归因分析完成，已生成 ${response.models.length} 个模型结果。`
    : '当前条件下暂无归因结果，请调整目标事件或待归因节点。'
  loading.value = false
}

const findRowByLabel = (label?: string, modelType: AttributionModelType = selectedModel.value): AttributionResultRow | undefined =>
  result.value?.models
    .find((model) => model.modelType === modelType)
    ?.rows.find((row) => row.attributionLabel === label)

const findRowByKey = (attributionKey: string, modelType: AttributionModelType = selectedModel.value): AttributionResultRow | undefined =>
  result.value?.models
    .find((model) => model.modelType === modelType)
    ?.rows.find((row) => row.attributionKey === attributionKey)

const createVirtualRow = (
  attributionKey: string,
  attributionLabel: string,
  modelType: AttributionModelType = selectedModel.value,
): AttributionResultRow => ({
  rowId: `${modelType}_${attributionKey}`,
  attributionKey,
  attributionLabel,
  nodeType: attributionKey === 'unknown' ? 'unknown' : attributionKey === 'others' || attributionKey === 'other_event' ? 'other' : 'event',
  triggerCount: 0,
  validTriggerCount: 0,
  validTriggerRate: 0,
  targetMetricValue: 0,
  contributionRate: 0,
  modelType,
})

const openUsers = async (row: AttributionResultRow) => {
  if (!result.value) return

  selectedAttributionLabel.value = row.attributionLabel
  usersResult.value = await attributionAnalysisService.getUsers(result.value.queryId, row.attributionLabel)
  showUserDrawer.value = true
}

const openPaths = async (row?: AttributionResultRow) => {
  selectedAttributionLabel.value = row?.attributionLabel ?? '全部路径'
  pathsResult.value = await attributionAnalysisService.getPaths(buildQuery(), row?.attributionKey)
  showPathDrawer.value = true
}

const openUsersByAttribution = async (
  attributionKey: string,
  attributionLabel: string,
  modelType: AttributionModelType = selectedModel.value,
) => {
  await openUsers(findRowByKey(attributionKey, modelType) ?? createVirtualRow(attributionKey, attributionLabel, modelType))
}

const openPathsByAttribution = async (
  attributionKey: string,
  attributionLabel: string,
  modelType: AttributionModelType = selectedModel.value,
) => {
  await openPaths(findRowByKey(attributionKey, modelType) ?? createVirtualRow(attributionKey, attributionLabel, modelType))
}

const handleBarChartClick = async (params: ChartClickParams) => {
  const row = findRowByLabel(params.name)
  if (row) {
    await openUsers(row)
  }
}

const handleBarChartDoubleClick = async (params: ChartClickParams) => {
  const row = findRowByLabel(params.name)
  if (row) {
    await openPaths(row)
  }
}

const handleTrendChartClick = async (params: ChartClickParams) => {
  const row = findRowByLabel(params.seriesName)
  if (row) {
    await openUsers(row)
  }
}

const handleTrendChartDoubleClick = async (params: ChartClickParams) => {
  const row = findRowByLabel(params.seriesName)
  if (row) {
    await openPaths(row)
  }
}

const openTouchUsers = async (touch: TouchPoint, modelType: AttributionModelType) => {
  await openUsersByAttribution(touch.attributionKey, touch.attributionValue, modelType)
}

const openTouchPaths = async (touch: TouchPoint, modelType: AttributionModelType) => {
  await openPathsByAttribution(touch.attributionKey, touch.attributionValue, modelType)
}

const exportUsers = (row: AttributionResultRow) => {
  notice.value = `已生成「${row.attributionLabel}」命中用户 ID 导出任务。`
}

const copyAttributionCondition = (row: AttributionResultRow) => {
  notice.value = `已复制归因条件：${modelName(row.modelType)} / ${row.attributionLabel}。`
}

const jumpToEventAnalysis = (row: AttributionResultRow) => {
  notice.value = `正在跳转事件分析，携带归因节点「${row.attributionLabel}」。`
  router.push('/data-insight/event-analysis')
}

const saveAnalysis = async () => {
  const payload: SavedAttributionAnalysisPayload = {
    name: saveAnalysisForm.name,
    description: saveAnalysisForm.description,
    tags: saveAnalysisForm.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    queryConfig: buildQuery(),
    timeMode: saveAnalysisForm.timeMode,
    favorite: saveAnalysisForm.favorite,
  }
  const response = await attributionAnalysisService.saveAnalysis(payload)
  notice.value = response.message
  showSaveAnalysisModal.value = false
}

const saveWidgetToDashboard = async () => {
  const payload: AttributionDashboardWidgetPayload = {
    title: dashboardForm.title,
    widgetType: dashboardForm.widgetType,
    dashboard: dashboardForm.dashboard,
    sourceQueryConfig: buildQuery(),
    refreshPolicy: dashboardForm.refreshPolicy,
  }
  const response = await attributionAnalysisService.saveWidgetToDashboard(payload)
  notice.value = response.message
  showSaveDashboardModal.value = false
}

const formatNumber = (value: number): string =>
  new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(value)

const formatPercent = (value: number): string =>
  `${(value * 100).toFixed(1)}%`

const modelName = (modelType: AttributionModelType): string => attributionModelLabels[modelType]

const resultColumns = computed<DataTableColumns<AttributionResultRow>>(() => [
  {
    title: '排名',
    key: 'rank',
    width: 72,
    render: (_row, index) => index + 1,
  },
  {
    title: '待归因节点',
    key: 'attributionLabel',
    width: 180,
    fixed: 'left',
  },
  {
    title: '归因模型',
    key: 'modelType',
    width: 120,
    render: (row) => modelName(row.modelType),
  },
  {
    title: '相关性',
    key: 'correlation',
    sorter: 'default',
    width: 100,
    render: (row) => row.correlation === undefined ? '-' : row.correlation.toFixed(2),
  },
  {
    title: '触发次数',
    key: 'triggerCount',
    sorter: 'default',
    width: 120,
    render: (row) => formatNumber(row.triggerCount),
  },
  {
    title: '有效转化触发次数',
    key: 'validTriggerCount',
    sorter: 'default',
    width: 160,
    render: (row) => formatNumber(row.validTriggerCount),
  },
  {
    title: '有效触发率',
    key: 'validTriggerRate',
    sorter: 'default',
    width: 120,
    render: (row) => formatPercent(row.validTriggerRate),
  },
  {
    title: '转化目标',
    key: 'targetMetricValue',
    sorter: 'default',
    width: 120,
    render: (row) => formatNumber(row.targetMetricValue),
  },
  {
    title: '贡献度',
    key: 'contributionRate',
    sorter: 'default',
    width: 120,
    render: (row) => formatPercent(row.contributionRate),
  },
  {
    title: '操作',
    key: 'actions',
    width: 420,
    fixed: 'right',
    render: (row) => h(NSpace, { size: 8 }, {
      default: () => [
        h(NButton, { size: 'small', text: true, type: 'primary', onClick: () => openUsers(row) }, { default: () => '查看用户' }),
        h(NButton, { size: 'small', text: true, type: 'primary', onClick: () => openPaths(row) }, { default: () => '查看路径' }),
        h(NButton, { size: 'small', text: true, type: 'primary', onClick: () => { notice.value = '已生成保存分群任务。' } }, { default: () => '保存分群' }),
        h(NButton, { size: 'small', text: true, type: 'primary', onClick: () => exportUsers(row) }, { default: () => '导出用户' }),
        h(NButton, { size: 'small', text: true, type: 'primary', onClick: () => jumpToEventAnalysis(row) }, { default: () => '事件分析' }),
        h(NButton, { size: 'small', text: true, onClick: () => copyAttributionCondition(row) }, { default: () => '复制条件' }),
      ],
    }),
  },
])

const compareColumns = computed<DataTableColumns<ModelCompareRow>>(() => {
  const baseColumns: DataTableColumns<ModelCompareRow> = [
    { title: '待归因节点', key: 'attributionLabel', fixed: 'left', width: 180 },
  ]
  const modelColumns = selectedModels.value.map((modelType) => ({
    title: modelName(modelType),
    key: modelType,
    width: 220,
    render: (row: ModelCompareRow) => {
      const value = row[modelType]
      if (typeof value !== 'number') {
        return '-'
      }

      return h(NSpace, { size: 8, align: 'center', wrap: false }, {
        default: () => [
          h(NButton, {
            size: 'small',
            text: true,
            type: 'primary',
            onClick: () => openUsersByAttribution(row.attributionKey, row.attributionLabel, modelType),
          }, { default: () => formatPercent(value) }),
          h(NButton, {
            size: 'tiny',
            onClick: () => openUsersByAttribution(row.attributionKey, row.attributionLabel, modelType),
          }, { default: () => '用户' }),
          h(NButton, {
            size: 'tiny',
            onClick: () => openPathsByAttribution(row.attributionKey, row.attributionLabel, modelType),
          }, { default: () => '路径' }),
        ],
      })
    },
  }))

  return [...baseColumns, ...modelColumns]
})

const pathColumns = computed<DataTableColumns<AttributionPath>>(() => [
  { title: '主体 ID', key: 'subjectId', width: 120 },
  { title: '目标事件时间', key: 'targetEventTime', width: 180 },
  {
    title: '归因路径',
    key: 'touches',
    minWidth: 520,
    render: (row) => h(NSpace, { size: 6, align: 'center', wrap: true }, {
      default: () => row.touches.flatMap((touch, index) => [
        h(NButton, {
          size: 'small',
          secondary: true,
          type: 'primary',
          onClick: () => openTouchUsers(touch, row.modelType),
        }, { default: () => touch.attributionValue }),
        h(NButton, {
          size: 'tiny',
          text: true,
          type: 'primary',
          onClick: () => openTouchPaths(touch, row.modelType),
        }, { default: () => '路径' }),
        ...(index < row.touches.length - 1 ? ['→'] : []),
      ]),
    }),
  },
  {
    title: '模型',
    key: 'modelType',
    width: 120,
    render: (row) => modelName(row.modelType),
  },
  {
    title: '分配权重',
    key: 'touchWeights',
    minWidth: 260,
    render: (row) => row.touchWeights.map((weight) => `${weight.attributionLabel} ${formatPercent(weight.weight)}`).join('；'),
  },
])

const userColumns = computed<DataTableColumns<{
  subjectId: string
  targetEventId: string
  targetEventTime: string
  targetMetricValue: number
  attributedValue: number
  attributionWeight: number
  pathSummary: string
}>>(() => [
  { title: '用户/主体 ID', key: 'subjectId', width: 130 },
  { title: '目标事件 ID', key: 'targetEventId', width: 180 },
  { title: '目标事件时间', key: 'targetEventTime', width: 180 },
  {
    title: '目标指标值',
    key: 'targetMetricValue',
    width: 120,
    render: (row) => formatNumber(row.targetMetricValue),
  },
  {
    title: '归因贡献值',
    key: 'attributedValue',
    width: 120,
    render: (row) => formatNumber(row.attributedValue),
  },
  {
    title: '归因权重',
    key: 'attributionWeight',
    width: 120,
    render: (row) => formatPercent(row.attributionWeight),
  },
  { title: '路径摘要', key: 'pathSummary', minWidth: 220 },
])

const barOption = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'axis' },
  grid: { top: 36, left: 56, right: 24, bottom: 48 },
  xAxis: { type: 'category', data: activeRows.value.map((row) => row.attributionLabel), axisLabel: { interval: 0, rotate: 22 } },
  yAxis: { type: 'value', axisLabel: { formatter: (value: number) => `${value}%` } },
  series: [
    {
      type: 'bar',
      data: activeRows.value.map((row) => Number((row.contributionRate * 100).toFixed(2))),
      itemStyle: { color: '#18a058' },
      label: { show: true, position: 'top', formatter: '{c}%' },
    },
  ],
}))

const trendOption = computed<EChartsOption>(() => {
  const model = selectedModel.value
  const trend = result.value?.trend.filter((item) => item.modelType === model) ?? []
  const buckets = Array.from(new Set(trend.map((item) => item.timeBucket)))
  const labels = activeRows.value.slice(0, 5).map((row) => row.attributionLabel)
  const series = labels.map((label) => ({
    name: label,
    type: 'line' as const,
    smooth: true,
    data: buckets.map((bucket) => {
      const point = trend.find((item) => item.timeBucket === bucket)?.rows.find((row) => row.attributionLabel === label)
      return point ? Number((point.contributionRate * 100).toFixed(2)) : 0
    }),
  }))

  return {
    tooltip: { trigger: 'axis' },
    legend: { top: 0 },
    grid: { top: 48, left: 56, right: 24, bottom: 40 },
    xAxis: { type: 'category', data: buckets },
    yAxis: { type: 'value', axisLabel: { formatter: (value: number) => `${value}%` } },
    series,
  }
})

const createDemoEventNode = (
  index: number,
  eventName: string,
  alias: string,
  filters: AttributionFilterCondition[] = [],
): AttributionEventNode => {
  const event = metadata.value?.eventMetadata.events.find((item) => item.eventName === eventName)

  return {
    ...createDefaultEventNode(index),
    id: `demo_node_${eventName}`,
    eventName,
    eventDisplayName: event?.displayName ?? alias,
    alias,
    filters,
  }
}

const applyDemoScenario = (defaultFilters: AttributionFilterCondition[]) => {
  subjectType.value = 'user_id'
  platformType.value = 'app'
  timezone.value = 'UTC+8 北京时间'
  attributionType.value = 'event'
  targetEventName.value = 'payment_success'
  targetMetricAggregator.value = 'SUM'
  targetMetricPropertyName.value = 'pay_amount'
  quickRange.value = 'last_7_days'
  dateRange.value = [
    dayjs('2026-05-15').valueOf(),
    dayjs('2026-05-21').valueOf(),
  ]
  lookbackWindow.value = 7
  lookbackWindow.unit = 'day'
  includeOtherConversions.value = true
  selectedModels.value = ['LAST_TOUCH', 'FIRST_TOUCH', 'LINEAR', 'POSITION_BASED', 'TIME_DECAY']
  selectedModel.value = 'LAST_TOUCH'
  resultMode.value = 'table'
  sortBy.value = 'contribution_desc'
  showUnknown.value = true
  showOthers.value = true
  timeDecayHalfLife.value = 7
  positionFirstWeight.value = 40
  positionLastWeight.value = 40

  targetFilters.value = [
    buildPresetFilter({
      id: 'demo_target_pay_amount',
      fieldType: 'event_property',
      fieldName: 'pay_amount',
      fieldDisplayName: '支付金额',
      operator: 'gte',
      value: 6,
      displayValue: '6 元以上',
      childFilters: [
        buildPresetFilter({
          id: 'demo_target_item_type',
          fieldType: 'event_property',
          fieldName: 'item_type',
          fieldDisplayName: '商品类型',
          operator: 'in',
          value: ['会员', '金币礼包'],
          displayValue: '会员 / 金币礼包',
        }),
      ],
    }),
  ]

  eventNodes.value = [
    createDemoEventNode(0, 'ad_exposure', '广告入口曝光', [
      buildPresetFilter({
        id: 'demo_node_exposure_position',
        fieldType: 'event_property',
        fieldName: 'ad_position',
        fieldDisplayName: '广告位',
        operator: 'in',
        value: ['金币不足弹窗', '任务中心'],
        displayValue: '金币不足弹窗 / 任务中心',
        childFilters: [
          buildPresetFilter({
            id: 'demo_node_exposure_channel',
            fieldType: 'user_property',
            fieldName: 'channel',
            fieldDisplayName: '获客渠道',
            operator: 'eq',
            value: '广告投放',
            displayValue: '广告投放',
          }),
        ],
      }),
    ]),
    createDemoEventNode(1, 'ad_click', '广告点击'),
    createDemoEventNode(2, 'ad_watch_start', '广告开始播放'),
    createDemoEventNode(3, 'reward_claim', '奖励领取'),
  ]

  processEnabled.value = true
  processRelation.value = 'ALL_REQUIRED'
  processEvents.value = [
    {
      id: 'demo_process_game_start',
      eventName: 'game_start',
      eventDisplayName: '开始游戏',
      relationProperties: [
        {
          id: 'demo_relation_product',
          leftEventId: 'demo_process_game_start',
          leftEventName: 'game_start',
          leftPropertyName: 'game_type',
          leftPropertyDisplayName: '游戏类型',
          rightEventId: 'target',
          rightEventName: 'payment_success',
          rightPropertyName: 'item_type',
          rightPropertyDisplayName: '商品类型',
          propertyType: 'string',
        },
      ],
      filters: [
        buildPresetFilter({
          id: 'demo_process_game_type',
          fieldType: 'event_property',
          fieldName: 'game_type',
          fieldDisplayName: '游戏类型',
          operator: 'in',
          value: ['斗地主', '麻将'],
          displayValue: '斗地主 / 麻将',
          childFilters: [
            buildPresetFilter({
              id: 'demo_process_active_level',
              fieldType: 'user_tag',
              fieldName: 'active_level',
              fieldDisplayName: '活跃等级',
              operator: 'eq',
              value: '高活跃',
              displayValue: '高活跃',
            }),
          ],
        }),
      ],
    },
  ]

  segmentFilter.conditions = [
    ...defaultFilters.map((filter) => ({
      ...filter,
      childFilters: [
        buildPresetFilter({
          id: 'demo_segment_child_coin',
          fieldType: 'user_tag',
          fieldName: 'coin_balance_level',
          fieldDisplayName: '金币余额等级',
          operator: 'eq',
          value: 'low',
          displayValue: '低金币',
        }),
      ],
    })),
    buildPresetFilter({
      id: 'demo_segment_channel',
      relation: 'AND',
      fieldType: 'user_property',
      fieldName: 'channel',
      fieldDisplayName: '获客渠道',
      operator: 'in',
      value: ['广告投放', '自然量'],
      displayValue: '广告投放 / 自然量',
    }),
  ]

  attributionWindowConfig.click.enabled = true
  attributionWindowConfig.click.value = 7
  attributionWindowConfig.click.unit = 'day'
  attributionWindowConfig.click.matchMethods = ['device_id']
  attributionWindowConfig.impression.enabled = true
  attributionWindowConfig.impression.value = 24
  attributionWindowConfig.reAttribution.value = 90
  attributionWindowConfig.deepEventPostback.value = 60
  attributionWindowConfig.webPropertyMode = 'recent_ad_property'
}

const initialize = async () => {
  metadataLoading.value = true
  metadata.value = await attributionAnalysisService.getMetadata()
  const defaultFilters = await attributionAnalysisService.getDefaultFilters()
  applyDemoScenario(defaultFilters)
  metadataLoading.value = false
  await runAnalysis()
}

onMounted(() => {
  initialize()
})
</script>

<template>
  <div class="attribution-page">
    <div class="page-header">
      <div>
        <h1>归因分析</h1>
        <p>衡量事件、渠道、活动、广告属性对目标转化的贡献，支持多模型对比和路径下钻。</p>
      </div>
      <n-space>
        <n-button @click="showSaveAnalysisModal = true">保存分析</n-button>
        <n-button @click="showSaveDashboardModal = true">保存到看板</n-button>
        <n-button type="primary" :loading="loading" :disabled="!canRunAnalysis" @click="runAnalysis">开始归因</n-button>
      </n-space>
    </div>

    <n-alert v-if="notice" type="success" closable class="page-alert" @close="notice = ''">
      {{ notice }}
    </n-alert>
    <n-alert v-if="errorMessage" type="error" closable class="page-alert" @close="errorMessage = ''">
      {{ errorMessage }}
    </n-alert>

    <n-spin :show="metadataLoading">
      <div class="analysis-layout">
        <div class="config-panel">
          <n-card title="1. 目标事件" :bordered="false" class="config-card">
            <div class="form-grid">
              <label>识别主体</label>
              <n-select v-model:value="subjectType" :options="subjectOptions" @update:value="markDirty" />

              <label>端类型</label>
              <n-select v-model:value="platformType" :options="platformOptions" @update:value="markDirty" />

              <label>目标事件</label>
              <n-select
                v-model:value="targetEventName"
                filterable
                clearable
                placeholder="搜索并选择支付、注册、广告完成等目标事件"
                :options="eventOptions"
                @update:value="markDirty"
              />

              <label>目标指标</label>
              <n-select v-model:value="targetMetricAggregator" :options="targetMetricOptions" @update:value="markDirty" />

              <template v-if="['SUM', 'AVG', 'MAX', 'MIN'].includes(targetMetricAggregator)">
                <label>数值属性</label>
                <n-select
                  v-model:value="targetMetricPropertyName"
                  filterable
                  placeholder="选择目标事件数值属性"
                  :options="targetMetricPropertyOptions"
                  @update:value="markDirty"
                />
              </template>
            </div>

            <div class="section-toolbar">
              <strong>目标事件过滤</strong>
              <n-button size="small" @click="addTargetFilter">+ 添加过滤</n-button>
            </div>
            <div v-if="targetFilters.length === 0" class="muted">未配置目标事件过滤。</div>
            <div v-for="(filter, index) in targetFilters" :key="filter.id" class="filter-row">
              <div class="filter-main-line">
                <n-select
                  v-if="index > 0"
                  v-model:value="filter.relation"
                  class="logic-select"
                  :options="[{ label: 'AND', value: 'AND' }, { label: 'OR', value: 'OR' }]"
                  @update:value="markDirty"
                />
                <div v-else class="logic-placeholder" />
                <n-select v-model:value="filter.fieldType" :options="filterFieldTypeOptions" @update:value="markDirty" />
                <n-select v-model:value="filter.fieldName" filterable :options="propertyFieldOptions" @update:value="markDirty" />
              </div>
              <div class="filter-value-line">
                <n-select v-model:value="filter.operator" :options="filterOperatorOptions" @update:value="markDirty" />
                <n-input v-model:value="filter.displayValue" placeholder="条件值" @update:value="markDirty" />
                <n-button size="tiny" @click="addChildFilter(filter)">+ 二级</n-button>
                <n-button text type="error" @click="removeTargetFilter(filter.id)">删除</n-button>
              </div>
              <div v-if="filter.childFilters?.length" class="filter-child-list">
                <div v-for="childFilter in filter.childFilters ?? []" :key="childFilter.id" class="child-filter-row">
                  <div class="filter-main-line">
                    <n-select
                      v-model:value="childFilter.relation"
                      class="logic-select"
                      :options="[{ label: 'AND', value: 'AND' }, { label: 'OR', value: 'OR' }]"
                      @update:value="markDirty"
                    />
                    <n-select v-model:value="childFilter.fieldType" :options="filterFieldTypeOptions" @update:value="markDirty" />
                    <n-select v-model:value="childFilter.fieldName" filterable :options="propertyFieldOptions" @update:value="markDirty" />
                  </div>
                  <div class="filter-value-line">
                    <n-select v-model:value="childFilter.operator" :options="filterOperatorOptions" @update:value="markDirty" />
                    <n-input v-model:value="childFilter.displayValue" placeholder="二级条件值" @update:value="markDirty" />
                    <span class="child-filter-label">二级筛选</span>
                    <n-button text type="error" @click="removeChildFilter(filter, childFilter.id)">删除</n-button>
                  </div>
                </div>
              </div>
            </div>
          </n-card>

          <n-card title="2. 待归因节点" :bordered="false" class="config-card">
            <n-radio-group v-model:value="attributionType" @update:value="markDirty">
              <n-radio-button value="event">事件归因</n-radio-button>
              <n-radio-button value="property">属性归因</n-radio-button>
            </n-radio-group>

            <template v-if="attributionType === 'event'">
              <div class="section-toolbar">
                <strong>待归因事件</strong>
                <n-space>
                  <n-checkbox v-model:checked="includeOtherConversions" @update:checked="markDirty">也计算其他转化</n-checkbox>
                  <n-button size="small" @click="addEventNode">+ 添加事件</n-button>
                </n-space>
              </div>

              <n-empty v-if="eventNodes.length === 0" description="请添加至少一个待归因事件。" />
              <div v-for="node in eventNodes" :key="node.id" class="node-card">
                <div class="node-head">
                  <strong>{{ node.alias || node.eventDisplayName }}</strong>
                  <n-space size="small">
                    <n-button text @click="copyEventNode(node)">复制</n-button>
                    <n-button text type="error" @click="removeEventNode(node.id)">删除</n-button>
                  </n-space>
                </div>
                <div class="form-grid compact">
                  <label>事件</label>
                  <n-select
                    :value="node.eventName"
                    filterable
                    :options="eventOptions"
                    @update:value="(value) => updateEventNodeName(node, String(value))"
                  />
                  <label>别名</label>
                  <n-input v-model:value="node.alias" @update:value="markDirty" />
                  <label>属性分组</label>
                  <n-select
                    :value="node.groupBy?.fieldName"
                    clearable
                    placeholder="可选：按属性值拆贡献"
                    :options="propertyFieldOptions"
                    @update:value="(value) => updateEventNodeGroupBy(node, value === null ? null : String(value))"
                  />
                </div>
                <div class="section-toolbar slim">
                  <span>事件过滤 {{ node.filters.length }}</span>
                  <n-button size="tiny" @click="addNodeFilter(node)">+ 过滤</n-button>
                </div>
                <div v-for="(filter, index) in node.filters" :key="filter.id" class="filter-row compact-row">
                  <div class="filter-main-line">
                    <n-select
                      v-if="index > 0"
                      v-model:value="filter.relation"
                      class="logic-select"
                      :options="[{ label: 'AND', value: 'AND' }, { label: 'OR', value: 'OR' }]"
                      @update:value="markDirty"
                    />
                    <div v-else class="logic-placeholder" />
                    <n-select v-model:value="filter.fieldType" :options="filterFieldTypeOptions" @update:value="markDirty" />
                    <n-select v-model:value="filter.fieldName" filterable :options="propertyFieldOptions" @update:value="markDirty" />
                  </div>
                  <div class="filter-value-line">
                    <n-select v-model:value="filter.operator" :options="filterOperatorOptions" @update:value="markDirty" />
                    <n-input v-model:value="filter.displayValue" placeholder="条件值" @update:value="markDirty" />
                    <n-button size="tiny" @click="addChildFilter(filter)">+ 二级</n-button>
                    <n-button text type="error" @click="removeNodeFilter(node, filter.id)">删除</n-button>
                  </div>
                  <div v-if="filter.childFilters?.length" class="filter-child-list">
                    <div v-for="childFilter in filter.childFilters ?? []" :key="childFilter.id" class="child-filter-row">
                      <div class="filter-main-line">
                        <n-select
                          v-model:value="childFilter.relation"
                          class="logic-select"
                          :options="[{ label: 'AND', value: 'AND' }, { label: 'OR', value: 'OR' }]"
                          @update:value="markDirty"
                        />
                        <n-select v-model:value="childFilter.fieldType" :options="filterFieldTypeOptions" @update:value="markDirty" />
                        <n-select v-model:value="childFilter.fieldName" filterable :options="propertyFieldOptions" @update:value="markDirty" />
                      </div>
                      <div class="filter-value-line">
                        <n-select v-model:value="childFilter.operator" :options="filterOperatorOptions" @update:value="markDirty" />
                        <n-input v-model:value="childFilter.displayValue" placeholder="二级条件值" @update:value="markDirty" />
                        <span class="child-filter-label">二级筛选</span>
                        <n-button text type="error" @click="removeChildFilter(filter, childFilter.id)">删除</n-button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <template v-else>
              <div class="form-grid">
                <label>归因属性</label>
                <n-select
                  :value="`${propertyNode.propertyScope}:${propertyNode.propertyName}`"
                  filterable
                  :options="attributionPropertyOptions"
                  @update:value="(value) => updatePropertyNode(String(value))"
                />
                <label>来源事件</label>
                <n-select v-model:value="propertyNode.sourceEventName" clearable filterable :options="eventOptions" @update:value="markDirty" />
                <label>Top N</label>
                <n-input-number v-model:value="propertyNode.valueLimit" :min="1" :max="50" @update:value="markDirty" />
              </div>
              <n-space class="switch-line">
                <n-checkbox v-model:checked="propertyNode.includeUnknown" @update:checked="markDirty">展示未知</n-checkbox>
                <n-checkbox v-model:checked="propertyNode.includeOthers" @update:checked="markDirty">合并其他</n-checkbox>
              </n-space>
              <div class="section-toolbar slim">
                <span>属性值过滤 {{ propertyNode.filters.length }}</span>
                <n-button size="tiny" @click="addPropertyFilter">+ 过滤</n-button>
              </div>
              <div v-for="(filter, index) in propertyNode.filters" :key="filter.id" class="filter-row compact-row">
                <div class="filter-main-line">
                  <n-select
                    v-if="index > 0"
                    v-model:value="filter.relation"
                    class="logic-select"
                    :options="[{ label: 'AND', value: 'AND' }, { label: 'OR', value: 'OR' }]"
                    @update:value="markDirty"
                  />
                  <div v-else class="logic-placeholder" />
                  <n-select v-model:value="filter.fieldType" :options="filterFieldTypeOptions" @update:value="markDirty" />
                  <n-select v-model:value="filter.fieldName" filterable :options="propertyFieldOptions" @update:value="markDirty" />
                </div>
                <div class="filter-value-line">
                  <n-select v-model:value="filter.operator" :options="filterOperatorOptions" @update:value="markDirty" />
                  <n-input v-model:value="filter.displayValue" placeholder="条件值" @update:value="markDirty" />
                  <n-button size="tiny" @click="addChildFilter(filter)">+ 二级</n-button>
                  <n-button text type="error" @click="removePropertyFilter(filter.id)">删除</n-button>
                </div>
                <div v-if="filter.childFilters?.length" class="filter-child-list">
                  <div v-for="childFilter in filter.childFilters ?? []" :key="childFilter.id" class="child-filter-row">
                    <div class="filter-main-line">
                      <n-select
                        v-model:value="childFilter.relation"
                        class="logic-select"
                        :options="[{ label: 'AND', value: 'AND' }, { label: 'OR', value: 'OR' }]"
                        @update:value="markDirty"
                      />
                      <n-select v-model:value="childFilter.fieldType" :options="filterFieldTypeOptions" @update:value="markDirty" />
                      <n-select v-model:value="childFilter.fieldName" filterable :options="propertyFieldOptions" @update:value="markDirty" />
                    </div>
                    <div class="filter-value-line">
                      <n-select v-model:value="childFilter.operator" :options="filterOperatorOptions" @update:value="markDirty" />
                      <n-input v-model:value="childFilter.displayValue" placeholder="二级条件值" @update:value="markDirty" />
                      <span class="child-filter-label">二级筛选</span>
                      <n-button text type="error" @click="removeChildFilter(filter, childFilter.id)">删除</n-button>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </n-card>

          <n-card title="3. 过程事件与关联属性" :bordered="false" class="config-card">
            <n-space vertical>
              <n-space align="center">
                <n-switch v-model:value="processEnabled" @update:value="markDirty" />
                <span>要求目标事件前发生过程事件</span>
                <n-select
                  v-model:value="processRelation"
                  class="small-select"
                  :options="[{ label: '全部必须发生', value: 'ALL_REQUIRED' }, { label: '任意一个发生', value: 'ANY_REQUIRED' }]"
                  @update:value="markDirty"
                />
                <n-button size="small" @click="addProcessEvent">+ 过程事件</n-button>
              </n-space>
              <div v-if="processEvents.length === 0" class="muted">未配置过程事件。</div>
              <div v-for="processEvent in processEvents" :key="processEvent.id" class="node-card">
                <div class="node-head">
                  <strong>{{ processEvent.eventDisplayName }}</strong>
                  <n-button text type="error" @click="removeProcessEvent(processEvent.id)">删除</n-button>
                </div>
                <div class="form-grid compact">
                  <label>事件</label>
                  <n-select
                    :value="processEvent.eventName"
                    filterable
                    :options="eventOptions"
                    @update:value="(value) => updateProcessEventName(processEvent, String(value))"
                  />
                  <label>关联属性</label>
                  <n-button size="small" @click="addRelationProperty(processEvent)">+ 添加关联属性</n-button>
                </div>
                <div v-for="relation in processEvent.relationProperties" :key="relation.id" class="relation-row">
                  <n-select
                    :value="relation.leftPropertyName"
                    filterable
                    :options="getEventPropertyOptions(processEvent.eventName)"
                    @update:value="(value) => updateRelationLeftProperty(processEvent, relation, String(value))"
                  />
                  <span>=</span>
                  <n-select
                    :value="relation.rightPropertyName"
                    filterable
                    :options="getEventPropertyOptions(targetEventName, relation.propertyType)"
                    @update:value="(value) => updateRelationRightProperty(relation, String(value))"
                  />
                  <n-tag size="small">{{ relation.propertyType }}</n-tag>
                  <n-button text type="error" @click="removeRelationProperty(processEvent, relation.id)">删除</n-button>
                </div>
                <div class="section-toolbar slim">
                  <span>过程事件过滤 {{ processEvent.filters.length }}</span>
                  <n-button size="tiny" @click="addProcessFilter(processEvent)">+ 过滤</n-button>
                </div>
                <div v-for="(filter, index) in processEvent.filters" :key="filter.id" class="filter-row compact-row">
                  <div class="filter-main-line">
                    <n-select
                      v-if="index > 0"
                      v-model:value="filter.relation"
                      class="logic-select"
                      :options="[{ label: 'AND', value: 'AND' }, { label: 'OR', value: 'OR' }]"
                      @update:value="markDirty"
                    />
                    <div v-else class="logic-placeholder" />
                    <n-select v-model:value="filter.fieldType" :options="filterFieldTypeOptions" @update:value="markDirty" />
                    <n-select v-model:value="filter.fieldName" filterable :options="propertyFieldOptions" @update:value="markDirty" />
                  </div>
                  <div class="filter-value-line">
                    <n-select v-model:value="filter.operator" :options="filterOperatorOptions" @update:value="markDirty" />
                    <n-input v-model:value="filter.displayValue" placeholder="条件值" @update:value="markDirty" />
                    <n-button size="tiny" @click="addChildFilter(filter)">+ 二级</n-button>
                    <n-button text type="error" @click="removeProcessFilter(processEvent, filter.id)">删除</n-button>
                  </div>
                  <div v-if="filter.childFilters?.length" class="filter-child-list">
                    <div v-for="childFilter in filter.childFilters ?? []" :key="childFilter.id" class="child-filter-row">
                      <div class="filter-main-line">
                        <n-select
                          v-model:value="childFilter.relation"
                          class="logic-select"
                          :options="[{ label: 'AND', value: 'AND' }, { label: 'OR', value: 'OR' }]"
                          @update:value="markDirty"
                        />
                        <n-select v-model:value="childFilter.fieldType" :options="filterFieldTypeOptions" @update:value="markDirty" />
                        <n-select v-model:value="childFilter.fieldName" filterable :options="propertyFieldOptions" @update:value="markDirty" />
                      </div>
                      <div class="filter-value-line">
                        <n-select v-model:value="childFilter.operator" :options="filterOperatorOptions" @update:value="markDirty" />
                        <n-input v-model:value="childFilter.displayValue" placeholder="二级条件值" @update:value="markDirty" />
                        <span class="child-filter-label">二级筛选</span>
                        <n-button text type="error" @click="removeChildFilter(filter, childFilter.id)">删除</n-button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </n-space>
          </n-card>

          <n-card title="4. 筛选、窗口与模型" :bordered="false" class="config-card">
            <div class="form-grid">
              <label>查询周期</label>
              <n-space>
                <n-select
                  v-model:value="quickRange"
                  class="medium-select"
                  :options="[
                    { label: '今天', value: 'today' },
                    { label: '昨天', value: 'yesterday' },
                    { label: '最近 7 天', value: 'last_7_days' },
                    { label: '最近 14 天', value: 'last_14_days' },
                    { label: '最近 30 天', value: 'last_30_days' },
                  ]"
                  @update:value="(value) => applyQuickRange(String(value))"
                />
                <n-date-picker v-model:value="dateRange" type="daterange" clearable @update:value="markDirty" />
              </n-space>

              <label>回溯期</label>
              <n-space>
                <n-input-number v-model:value="lookbackWindow.value" :min="1" :max="90" @update:value="markDirty" />
                <n-select
                  v-model:value="lookbackWindow.unit"
                  class="small-select"
                  :options="[{ label: '分钟', value: 'minute' }, { label: '小时', value: 'hour' }, { label: '天', value: 'day' }]"
                  @update:value="markDirty"
                />
              </n-space>

              <label>归因模型</label>
              <n-select
                v-model:value="selectedModels"
                multiple
                :options="modelOptions"
                @update:value="markDirty"
              />

              <label>半衰期</label>
              <n-input-number v-model:value="timeDecayHalfLife" :min="1" :max="30" @update:value="markDirty">
                <template #suffix>天</template>
              </n-input-number>

              <label>位置归因权重</label>
              <n-space>
                <n-input-number v-model:value="positionFirstWeight" :min="0" :max="100" @update:value="markDirty">
                  <template #prefix>首</template>
                  <template #suffix>%</template>
                </n-input-number>
                <n-input-number v-model:value="positionLastWeight" :min="0" :max="100" @update:value="markDirty">
                  <template #prefix>末</template>
                  <template #suffix>%</template>
                </n-input-number>
              </n-space>
            </div>

            <div class="window-config">
              <div class="window-title">广告归因窗口</div>
              <div class="window-grid">
                <div class="window-item">
                  <n-checkbox v-model:checked="attributionWindowConfig.click.enabled" @update:checked="markDirty">点击归因</n-checkbox>
                  <n-space>
                    <n-input-number v-model:value="attributionWindowConfig.click.value" :min="1" :max="30" @update:value="markDirty" />
                    <n-select
                      v-model:value="attributionWindowConfig.click.unit"
                      class="mini-select"
                      :options="[{ label: '小时', value: 'hour' }, { label: '天', value: 'day' }]"
                      @update:value="markDirty"
                    />
                  </n-space>
                  <n-select
                    v-model:value="attributionWindowConfig.click.matchMethods"
                    multiple
                    placeholder="匹配方式"
                    :options="clickMatchMethodOptions"
                    @update:value="markDirty"
                  />
                </div>
                <div class="window-item">
                  <n-checkbox v-model:checked="attributionWindowConfig.impression.enabled" @update:checked="markDirty">展示归因</n-checkbox>
                  <n-space>
                    <n-input-number v-model:value="attributionWindowConfig.impression.value" :min="1" :max="24" @update:value="markDirty" />
                    <n-tag>小时</n-tag>
                  </n-space>
                  <div class="muted">点击归因优先于展示归因。</div>
                </div>
                <div class="window-item">
                  <span class="window-label">再归因窗口</span>
                  <n-input-number v-model:value="attributionWindowConfig.reAttribution.value" :min="1" :max="365" @update:value="markDirty">
                    <template #suffix>天</template>
                  </n-input-number>
                  <div class="muted">默认用于卸载重装识别。</div>
                </div>
                <div class="window-item">
                  <span class="window-label">深度事件回传</span>
                  <n-input-number v-model:value="attributionWindowConfig.deepEventPostback.value" :min="1" :max="180" @update:value="markDirty">
                    <template #suffix>天</template>
                  </n-input-number>
                  <n-select
                    v-model:value="attributionWindowConfig.webPropertyMode"
                    :options="webPropertyModeOptions"
                    @update:value="markDirty"
                  />
                </div>
              </div>
            </div>

            <div class="section-toolbar">
              <strong>细分筛选</strong>
              <n-button size="small" @click="addSegmentFilter">+ 添加筛选</n-button>
            </div>
            <div v-if="segmentFilter.conditions.length === 0" class="muted">全部用户参与归因分析。</div>
            <div v-for="(filter, index) in segmentFilter.conditions" :key="filter.id" class="filter-row">
              <div class="filter-main-line">
                <n-select
                  v-if="index > 0"
                  v-model:value="filter.relation"
                  class="logic-select"
                  :options="[{ label: 'AND', value: 'AND' }, { label: 'OR', value: 'OR' }]"
                  @update:value="markDirty"
                />
                <div v-else class="logic-placeholder" />
                <n-select v-model:value="filter.fieldType" :options="filterFieldTypeOptions" @update:value="markDirty" />
                <n-select v-model:value="filter.fieldName" filterable :options="propertyFieldOptions" @update:value="markDirty" />
              </div>
              <div class="filter-value-line">
                <n-select v-model:value="filter.operator" :options="filterOperatorOptions" @update:value="markDirty" />
                <n-input v-model:value="filter.displayValue" placeholder="条件值" @update:value="markDirty" />
                <n-button size="tiny" @click="addChildFilter(filter)">+ 二级</n-button>
                <n-button text type="error" @click="removeSegmentFilter(filter.id)">删除</n-button>
              </div>
              <div v-if="filter.childFilters?.length" class="filter-child-list">
                <div v-for="childFilter in filter.childFilters ?? []" :key="childFilter.id" class="child-filter-row">
                  <div class="filter-main-line">
                    <n-select
                      v-model:value="childFilter.relation"
                      class="logic-select"
                      :options="[{ label: 'AND', value: 'AND' }, { label: 'OR', value: 'OR' }]"
                      @update:value="markDirty"
                    />
                    <n-select v-model:value="childFilter.fieldType" :options="filterFieldTypeOptions" @update:value="markDirty" />
                    <n-select v-model:value="childFilter.fieldName" filterable :options="propertyFieldOptions" @update:value="markDirty" />
                  </div>
                  <div class="filter-value-line">
                    <n-select v-model:value="childFilter.operator" :options="filterOperatorOptions" @update:value="markDirty" />
                    <n-input v-model:value="childFilter.displayValue" placeholder="二级条件值" @update:value="markDirty" />
                    <span class="child-filter-label">二级筛选</span>
                    <n-button text type="error" @click="removeChildFilter(filter, childFilter.id)">删除</n-button>
                  </div>
                </div>
              </div>
            </div>
          </n-card>
        </div>

        <div class="result-panel">
          <n-card :bordered="false" class="toolbar-card">
            <div class="result-toolbar">
              <div>
                <h3>归因结果</h3>
                <p>{{ currentDateRangeLabel }} · 回溯 {{ lookbackWindow.value }} {{ lookbackWindow.unit }} · {{ selectedMetricLabel }}</p>
              </div>
              <n-space>
                <n-select v-model:value="resultMode" class="medium-select" :options="resultModeOptions" />
                <n-select v-model:value="selectedModel" class="medium-select" :options="modelOptions" />
                <n-select v-model:value="sortBy" class="medium-select" :options="sortOptions" @update:value="markDirty" />
              </n-space>
            </div>
            <div class="status-line">
              <n-tag :type="queryState === 'success' ? 'success' : queryState === 'dirty' ? 'warning' : queryState === 'error' ? 'error' : 'default'">
                查询状态：{{ queryState }}
              </n-tag>
              <n-space>
                <n-checkbox v-model:checked="showUnknown" @update:checked="markDirty">展示未知</n-checkbox>
                <n-checkbox v-model:checked="showOthers" @update:checked="markDirty">展示其他</n-checkbox>
              </n-space>
            </div>
          </n-card>

          <n-empty v-if="!result && queryState !== 'loading'" class="empty-state" description="请选择目标事件和至少一个待归因节点后开始归因分析">
            <template #extra>
              <n-button type="primary" @click="targetEventName = 'payment_success'">选择目标事件</n-button>
            </template>
          </n-empty>

          <template v-if="result">
            <div class="summary-grid">
              <n-card :bordered="false">
                <n-statistic label="目标事件数" :value="formatNumber(result.summary.targetEventCount)" />
                <p>查询周期内命中的目标转化。</p>
              </n-card>
              <n-card :bordered="false">
                <n-statistic label="已归因转化目标" :value="formatNumber(result.summary.attributedTargetMetric)" />
                <p>已分配给触点的目标指标。</p>
              </n-card>
              <n-card :bordered="false">
                <n-statistic label="未归因转化" :value="formatNumber(result.summary.unattributedTargetMetric)" />
                <p>回溯期内未命中触点。</p>
              </n-card>
              <n-card :bordered="false">
                <n-statistic label="归因覆盖率" :value="formatPercent(result.summary.attributedRate)" />
                <p>{{ result.metadata.lookbackWindowLabel }} 回溯窗口。</p>
              </n-card>
            </div>

            <n-card :bordered="false" class="result-card">
              <template v-if="resultMode === 'table'">
                <div class="card-title-row">
                  <h3>贡献度表格</h3>
                  <n-button @click="notice = '已生成贡献结果 Excel 导出任务。'">导出 Excel</n-button>
                </div>
                <n-data-table
                  :columns="resultColumns"
                  :data="activeRows"
                  :scroll-x="1380"
                  :pagination="{ pageSize: 10 }"
                />
              </template>

              <template v-else-if="resultMode === 'bar'">
                <div class="card-title-row">
                  <h3>Top N 节点贡献柱状图</h3>
                  <span>{{ modelName(selectedModel) }} · 单击查看用户，双击查看路径</span>
                </div>
                <v-chart
                  class="result-chart"
                  :option="barOption"
                  autoresize
                  @click="handleBarChartClick"
                  @dblclick="handleBarChartDoubleClick"
                />
              </template>

              <template v-else-if="resultMode === 'trend'">
                <div class="card-title-row">
                  <h3>贡献趋势图</h3>
                  <span>{{ modelName(selectedModel) }} · 单击查看用户，双击查看路径</span>
                </div>
                <v-chart
                  class="result-chart"
                  :option="trendOption"
                  autoresize
                  @click="handleTrendChartClick"
                  @dblclick="handleTrendChartDoubleClick"
                />
              </template>

              <template v-else-if="resultMode === 'model_compare'">
                <div class="card-title-row">
                  <h3>模型对比表</h3>
                  <span>贡献度口径</span>
                </div>
                <n-data-table
                  :columns="compareColumns"
                  :data="modelCompareRows"
                  :scroll-x="900"
                  :pagination="{ pageSize: 10 }"
                />
              </template>

              <template v-else>
                <div class="card-title-row">
                  <h3>路径明细</h3>
                  <n-button @click="openPaths()">刷新路径样本</n-button>
                </div>
                <n-data-table
                  :columns="pathColumns"
                  :data="result.pathSamples"
                  :scroll-x="1180"
                  :pagination="{ pageSize: 8 }"
                />
              </template>
            </n-card>
          </template>
        </div>
      </div>
    </n-spin>

    <n-modal v-model:show="showSaveAnalysisModal" preset="card" title="保存归因分析" class="small-modal">
      <n-space vertical>
        <n-input v-model:value="saveAnalysisForm.name" placeholder="分析名称" />
        <n-input v-model:value="saveAnalysisForm.description" type="textarea" placeholder="分析描述" />
        <n-select v-model:value="saveAnalysisForm.folder" :options="[{ label: '个人空间 / 我的分析', value: '个人空间 / 我的分析' }, { label: '团队空间 / 运营团队', value: '团队空间 / 运营团队' }]" />
        <n-input v-model:value="saveAnalysisForm.tags" placeholder="标签，逗号分隔" />
        <n-radio-group v-model:value="saveAnalysisForm.timeMode">
          <n-radio-button value="relative">相对时间</n-radio-button>
          <n-radio-button value="fixed">固定时间</n-radio-button>
        </n-radio-group>
        <n-checkbox v-model:checked="saveAnalysisForm.favorite">设为常用分析</n-checkbox>
        <n-button type="primary" block @click="saveAnalysis">保存分析</n-button>
      </n-space>
    </n-modal>

    <n-modal v-model:show="showSaveDashboardModal" preset="card" title="保存到看板" class="small-modal">
      <n-space vertical>
        <n-input v-model:value="dashboardForm.title" placeholder="组件名称" />
        <n-select v-model:value="dashboardForm.dashboard" :options="[{ label: '个人空间 / 运营监控看板', value: '个人空间 / 运营监控看板' }, { label: '团队空间 / 增长日报', value: '团队空间 / 增长日报' }]" />
        <n-select v-model:value="dashboardForm.widgetType" :options="[{ label: '贡献表', value: 'attribution_table' }, { label: '柱状图', value: 'attribution_bar' }, { label: '趋势图', value: 'attribution_trend' }, { label: '模型对比', value: 'attribution_model_compare' }]" />
        <n-select v-model:value="dashboardForm.refreshPolicy" :options="[{ label: '手动刷新', value: 'manual' }, { label: '每小时', value: 'hourly' }, { label: '每日', value: 'daily' }]" />
        <n-button type="primary" block @click="saveWidgetToDashboard">保存到看板</n-button>
      </n-space>
    </n-modal>

    <n-drawer v-model:show="showUserDrawer" width="720">
      <n-drawer-content :title="`用户列表：${selectedAttributionLabel}`">
        <n-data-table
          :columns="userColumns"
          :data="usersResult?.users ?? []"
          :pagination="{ pageSize: 8 }"
          :scroll-x="1080"
        />
      </n-drawer-content>
    </n-drawer>

    <n-drawer v-model:show="showPathDrawer" width="780">
      <n-drawer-content :title="`归因路径：${selectedAttributionLabel}`">
        <n-data-table
          :columns="pathColumns"
          :data="pathsResult?.paths ?? []"
          :pagination="{ pageSize: 8 }"
          :scroll-x="1180"
        />
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<style scoped lang="scss">
.attribution-page {
  padding: 24px;
  background: #f3f6fa;
  min-height: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: flex-start;
  margin-bottom: 16px;

  h1 {
    margin: 0 0 8px;
    font-size: 30px;
    color: #111827;
  }

  p {
    margin: 0;
    color: #667085;
    font-size: 15px;
  }
}

.page-alert {
  margin-bottom: 16px;
}

.analysis-layout {
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
.result-card,
.summary-grid :deep(.n-card) {
  border-radius: 8px;
}

.form-grid {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr);
  gap: 14px 16px;
  align-items: center;

  label {
    color: #344054;
    font-weight: 700;
  }
}

.form-grid.compact {
  grid-template-columns: 80px minmax(0, 1fr);
}

.section-toolbar,
.node-head,
.card-title-row,
.result-toolbar,
.status-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.section-toolbar {
  margin: 18px 0 10px;
}

.section-toolbar.slim {
  margin: 12px 0 8px;
  color: #667085;
}

.node-card,
.filter-row {
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  border-radius: 8px;
  padding: 14px;
  margin-top: 12px;
}

.node-head {
  margin-bottom: 12px;
}

.filter-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
}

.compact-row {
  padding: 12px;
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
  grid-template-columns: 96px minmax(0, 1fr) 72px 44px;
}

.filter-child-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-left: 20px;
  padding-left: 12px;
  border-left: 2px solid #bbf7d0;
}

.child-filter-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: 1px dashed #d7dde8;
  border-radius: 8px;
  background: #fff;
}

.child-filter-label {
  color: #16a34a;
  font-weight: 700;
  text-align: center;
}

.filter-row :deep(.n-select),
.filter-row :deep(.n-input),
.filter-row :deep(.n-input-number) {
  min-width: 0;
}

.logic-select {
  width: 76px;
}

.logic-placeholder {
  width: 76px;
  min-width: 76px;
}

.small-select {
  width: 130px;
}

.medium-select {
  width: 180px;
}

.switch-line {
  margin-top: 14px;
}

.window-config {
  margin-top: 18px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fbfcfe;
}

.window-title {
  font-weight: 800;
  color: #344054;
  margin-bottom: 12px;
}

.window-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.window-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  padding: 12px;
  border: 1px solid #edf0f5;
  border-radius: 8px;
  background: #fff;
}

.window-label {
  font-weight: 700;
  color: #344054;
}

.mini-select {
  width: 96px;
}

.relation-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 24px minmax(0, 1fr) 70px 44px;
  gap: 10px;
  align-items: center;
  padding: 10px 0;
  border-top: 1px dashed #e5e7eb;
  color: #475467;
}

.muted {
  color: #98a2b3;
}

.result-toolbar {
  h3 {
    margin: 0 0 6px;
    font-size: 18px;
  }

  p {
    margin: 0;
    color: #667085;
  }
}

.status-line {
  margin-top: 14px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;

  p {
    margin: 10px 0 0;
    color: #667085;
  }
}

.result-card {
  min-height: 460px;
}

.result-chart {
  height: 420px;
}

.empty-state {
  background: #fff;
  border-radius: 8px;
  padding: 96px 0;
}

.small-modal {
  width: 560px;
}

@media (max-width: 1280px) {
  .analysis-layout {
    grid-template-columns: 1fr;
  }

  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
