<script setup lang="ts">
import {
  NAlert,
  NButton,
  NCard,
  NCheckbox,
  NDescriptions,
  NDescriptionsItem,
  NDivider,
  NDropdown,
  NEmpty,
  NForm,
  NFormItem,
  NGi,
  NGrid,
  NInput,
  NInputNumber,
  NModal,
  NProgress,
  NRadio,
  NRadioGroup,
  NSelect,
  NSpace,
  NSpin,
  NStep,
  NSteps,
  NSwitch,
  NTabPane,
  NTabs,
  NTag,
  useMessage,
} from 'naive-ui'
import type { DropdownOption, SelectOption, TagProps } from 'naive-ui'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TagCreateRuleEditor from '@/components/tags/TagCreateRuleEditor.vue'
import {
  emptyValueStrategyLabels,
  tagRunStatusLabels,
  tagService,
  tagStatusLabels,
  tagStatusLabels as statusLabels,
  tagTypeGroups,
  tagTypeLabels,
  tagValueTypeLabels,
} from '@/services/tagService'
import type { EntityId } from '@/types/common'
import type {
  TagBulkResult,
  TagCategory,
  TagCreatePayload,
  TagDependencyRisk,
  TagDefinition,
  TagDetailBundle,
  TagLineageNode,
  TagListFilters,
  TagEstimateResult,
  TagMetadataField,
  TagOperationLog,
  TagPermission,
  TagPermissionSet,
  TagRuleGroup,
  TagRuleVersion,
  TagRunRecord,
  TagRunStatus,
  TagSqlParseResult,
  TagStatus,
  TagTemplate,
  TagTtlConfig,
  TagType,
  TagUploadResult,
  TagValueRule,
  TagValueType,
} from '@/types/tag'

type TagPage = 'home' | 'manage' | 'templates' | 'metadata' | 'create' | 'edit' | 'detail'
type ManagerView = 'ops' | 'operation' | 'custom'
type SavedTagView = { id: EntityId; name: string; view: ManagerView; pageSize: number; filters: Partial<TagListFilters> }
type WorkbenchPreference = { managerView?: ManagerView; pageSize?: number; savedViews?: SavedTagView[] }

const route = useRoute()
const router = useRouter()
const message = useMessage()
const preferenceStorageKey = 'tag-system-workbench-preference'

const readWorkbenchPreference = (): WorkbenchPreference => {
  try {
    return JSON.parse(window.localStorage.getItem(preferenceStorageKey) ?? '{}') as WorkbenchPreference
  } catch {
    return {}
  }
}

const initialPreference = readWorkbenchPreference()

const loading = ref(false)
const actionLoading = ref(false)
const notice = ref('')
const tags = ref<TagDefinition[]>([])
const categories = ref<TagCategory[]>([])
const metadataFields = ref<TagMetadataField[]>([])
const templates = ref<TagTemplate[]>([])
const allCreators = ref<string[]>([])
const detailBundle = ref<TagDetailBundle>()
const searchKeyword = ref('')
const selectedCategoryId = ref<EntityId>('cat-root')
const selectedTagIds = ref<EntityId[]>([])
const managerStatus = ref<TagStatus | 'all'>('all')
const selectedTypes = ref<TagType[]>([])
const selectedValueTypes = ref<TagValueType[]>([])
const selectedRunStatuses = ref<TagRunStatus[]>([])
const selectedCreator = ref<string>('all')
const metadataFilters = ref<Record<EntityId, string | string[]>>({})
const managerView = ref<ManagerView>(initialPreference.managerView ?? 'ops')
const pageSize = ref(initialPreference.pageSize ?? 20)
const pageIndex = ref(1)
const savedViews = ref<SavedTagView[]>(initialPreference.savedViews ?? [])
const currentStep = ref(1)
const estimateResult = ref<TagEstimateResult>()
const estimateSnapshot = ref('')
const sqlResult = ref<TagSqlParseResult>()
const uploadResult = ref<TagUploadResult>()
const manualUploadFile = ref<File>()
const draft = ref<TagCreatePayload>(tagService.buildDefaultCreatePayload('rule'))
const detailActiveTab = ref('distribution')
const tagPermissionSet = ref<TagPermissionSet>()
const draggingCategoryId = ref<EntityId>('')
const draggingTagId = ref<EntityId>('')
const checkedTemplateIds = ref<EntityId[]>([])

const categoryModalVisible = ref(false)
const categoryMode = ref<'create_child' | 'create_sibling' | 'rename'>('create_child')
const categoryDraftName = ref('')
const categoryContextId = ref<EntityId>('cat-root')

const shelfModalVisible = ref(false)
const shelfStatus = ref<Extract<TagStatus, 'online' | 'offline'>>('online')
const shelfIds = ref<EntityId[]>([])
const shelfAcknowledged = ref(false)
const shelfRisks = ref<TagDependencyRisk[]>([])

const deleteModalVisible = ref(false)
const deleteTarget = ref<TagDefinition>()
const deleteConfirmName = ref('')

const moveModalVisible = ref(false)
const moveIds = ref<EntityId[]>([])
const moveTargetCategoryId = ref<EntityId>('cat-uncategorized')

const runModalVisible = ref(false)
const runIds = ref<EntityId[]>([])
const runRange = ref({ start: '2026-05-25', end: '2026-05-25', overwrite: true })

const authModalVisible = ref(false)
const authTarget = ref<TagDefinition>()
const authTargetIds = ref<EntityId[]>([])
const authRows = ref<TagPermission[]>([])
const authDraft = ref({ principalType: 'user' as 'user' | 'group', principalName: '', permission: 'view' as 'view' | 'edit' | 'manage' })

const serviceModalVisible = ref(false)
const serviceTarget = ref<TagDefinition>()
const serviceDraft = ref({ enabled: false, qpsLimit: 5000, cacheTtlSeconds: 60 })

const retentionModalVisible = ref(false)
const retentionTarget = ref<TagDefinition>()
const retentionDraft = ref<TagTtlConfig>({ strategy: 'system', unit: 'day' })

const adminsModalVisible = ref(false)
const adminsTarget = ref<TagDefinition>()

const customViewModalVisible = ref(false)
const customViewName = ref('我的标签视图')

const bulkRenameModalVisible = ref(false)
const bulkRenameRows = ref<Array<{ tagId: EntityId; oldName: string; newName: string }>>([])

const bulkMetadataModalVisible = ref(false)
const bulkMetadataDraft = ref<Record<EntityId, string | string[]>>({ 'meta-sensitive': '内部' })

const syncModalVisible = ref(false)
const syncProjectId = ref('project-growth')

const segmentModalVisible = ref(false)
const segmentDraft = ref({ name: '', value: '', rule: '' })

const runLogModalVisible = ref(false)
const activeRunLog = ref<TagRunRecord>()

const operationLogModalVisible = ref(false)
const activeOperationLog = ref<TagOperationLog>()

const lineageMode = ref<'graph' | 'list'>('graph')
const lineageDirection = ref<'all' | TagLineageNode['direction']>('all')
const historyGrain = ref<'day' | 'week' | 'month'>('day')
const historyRange = ref('2026-05-19 至 2026-05-25')

const sqlLineageModalVisible = ref(false)
const sqlLineageMode = ref<'table_to_profile' | 'profile_to_table'>('table_to_profile')
const sqlLineageKeyword = ref('cdp.orders')

const metadataModalVisible = ref(false)
const metadataDraft = ref({
  id: '' as EntityId,
  name: '',
  dataType: 'text' as TagMetadataField['dataType'],
  required: false,
  enumValuesText: '',
  quickFilterEnabled: false,
  description: '',
})

let searchTimer: number | undefined

const currentPage = computed<TagPage>(() => String(route.meta.tagPage ?? 'home') as TagPage)
const currentTagId = computed(() => String(route.params.tagId ?? ''))
const currentCreateType = computed<TagType>(() => String(route.params.tagType ?? 'rule') as TagType)
const isEditing = computed(() => currentPage.value === 'edit')
const selectedTags = computed(() => tags.value.filter((item) => selectedTagIds.value.includes(item.id)))
const ruleBuilderType = computed<Extract<TagType, 'rule' | 'lifecycle'>>(() => (draft.value.type === 'lifecycle' ? 'lifecycle' : 'rule'))
const draftRuleValues = computed<TagValueRule[]>({
  get: () => draft.value.rule.values ?? [],
  set: (values) => {
    draft.value.rule.values = values
  },
})
const selectedFieldIds = computed(() => new Set((draft.value.rule.selectedFields ?? []).map((field) => field.id)))
const compatibleFieldOptions = computed(() =>
  fieldOptions.filter((field) => draft.value.type === 'calculation' || field.valueType === draft.value.valueType),
)
const draftFilterGroup = computed<TagRuleGroup>({
  get: () => {
    if (!draft.value.rule.filterGroup) {
      draft.value.rule.filterGroup = { id: 'filter-root', logic: 'and', conditions: [], groups: [] }
    }
    return draft.value.rule.filterGroup
  },
  set: (group) => {
    draft.value.rule.filterGroup = group
  },
})
const calculationResultBounds = computed({
  get: () => {
    if (!draft.value.rule.resultBounds) {
      draft.value.rule.resultBounds = {}
    }
    return draft.value.rule.resultBounds
  },
  set: (bounds: { min?: number; max?: number }) => {
    draft.value.rule.resultBounds = bounds
  },
})
const currentDetail = computed(() => detailBundle.value?.tag)
const detailRuns = computed(() => detailBundle.value?.runs ?? [])
const detailDistributions = computed(() => detailBundle.value?.distributions ?? [])
const detailHistory = computed(() => detailBundle.value?.history ?? [])
const detailRuleVersions = computed(() => detailBundle.value?.ruleVersions ?? [])
const detailLineage = computed(() => {
  const nodes = detailBundle.value?.lineage ?? []
  return lineageDirection.value === 'all' ? nodes : nodes.filter((node) => node.direction === lineageDirection.value)
})
const detailLogs = computed(() => detailBundle.value?.operationLogs ?? [])
const detailPermissions = computed(() => detailBundle.value?.permissions ?? [])
const canCreate = computed(() => tagPermissionSet.value?.createTag ?? true)
const canViewTagSystem = computed(() => tagPermissionSet.value?.viewTagSystem ?? true)

const categoryOptions = computed<SelectOption[]>(() =>
  flattenCategories.value
    .filter((item) => item.id !== 'cat-root')
    .map((item) => ({
      label: `${'　'.repeat(Math.max(item.level - 2, 0))}${item.name}`,
      value: item.id,
      disabled: !item.canEdit && !item.system,
    })),
)

const flattenCategories = computed<TagCategory[]>(() => {
  const result: TagCategory[] = []
  const visit = (parentId: EntityId | null) => {
    categories.value
      .filter((item) => item.parentId === parentId)
      .sort((a, b) => a.sort - b.sort)
      .forEach((item) => {
        result.push(item)
        visit(item.id)
      })
  }
  visit(null)
  return result
})

const createMenuOptions = computed<DropdownOption[]>(() =>
  tagTypeGroups.map((group) => ({
    type: 'group',
    label: group.label,
    key: group.label,
	    children: group.types.map((type) => ({
	      key: type,
	      label: tagTypeLabels[type],
	      disabled: !(tagPermissionSet.value?.createTypes ?? group.types).includes(type)
	        || (type === 'sql' && tagPermissionSet.value?.sqlPrivateDeployment === false),
	    })),
	  })),
	)

const valueTypeOptions = computed<SelectOption[]>(() =>
  Object.entries(tagValueTypeLabels).map(([value, label]) => ({ label, value })),
)

const typeOptions = computed<SelectOption[]>(() => Object.entries(tagTypeLabels).map(([value, label]) => ({ label, value })))

const statusOptions = computed<SelectOption[]>(() => [
  { label: '全部上下架状态', value: 'all' },
  ...Object.entries(statusLabels).filter(([value]) => value !== 'deleted').map(([value, label]) => ({ label, value })),
])

const runStatusOptions = computed<SelectOption[]>(() => Object.entries(tagRunStatusLabels).map(([value, label]) => ({ label, value })))

const creatorOptions = computed<SelectOption[]>(() => [
  { label: '全部创建人', value: 'all' },
  ...allCreators.value.map((name) => ({ label: name, value: name })),
])

const quickMetadataFields = computed(() => metadataFields.value.filter((item) => item.quickFilterEnabled).slice(0, 3))

const totalPages = computed(() => Math.max(1, Math.ceil(tags.value.length / pageSize.value)))
const pagedTags = computed(() => {
  const start = (pageIndex.value - 1) * pageSize.value
  return tags.value.slice(start, start + pageSize.value)
})
const pageTabs = [
  { label: '标签管理', path: '/user-insight/tags', page: 'home' },
  { label: '标签模板', path: '/user-insight/tags/templates', page: 'templates' },
  { label: '元信息管理', path: '/user-insight/tags/metadata', page: 'metadata' },
]

const wizardSteps = ['基础信息', '规则或数据来源', '展示与输出', '预估数量', '创建完成']
const rfmMetricKeys: Array<'R' | 'F' | 'M'> = ['R', 'F', 'M']

const fieldOptions = [
  { id: 'manual_gender', name: '性别-人工', valueType: 'text' as TagValueType },
  { id: 'model_gender', name: '性别-推断', valueType: 'text' as TagValueType },
  { id: 'profile_gender', name: '性别-注册资料', valueType: 'text' as TagValueType },
  { id: 'member_level', name: '会员等级', valueType: 'text' as TagValueType },
  { id: 'birthday', name: '生日', valueType: 'date' as TagValueType },
  { id: 'last_login_time', name: '最近登录时间', valueType: 'datetime' as TagValueType },
  { id: 'used_credit', name: '动用金额', valueType: 'decimal' as TagValueType },
  { id: 'credit_limit', name: '授信额度', valueType: 'decimal' as TagValueType },
  { id: 'last_pay_days', name: '最近消费距今天数', valueType: 'integer' as TagValueType },
  { id: 'order_count', name: '购买频率', valueType: 'integer' as TagValueType },
  { id: 'pay_amount', name: '消费金额', valueType: 'decimal' as TagValueType },
]

const dateRangeOptions = ['今天', '昨天', '最近 7 天，包含今天', '最近 30 天，不包含今天', '本周', '本月', '固定日期 2026-05-01 至 2026-05-25'].map((value) => ({ label: value, value }))

const behaviorPathOptions = ['App 启动 > 浏览详情 > 留资', '广告曝光 > 点击广告 > 预约试驾', '浏览车系 > 收藏车系 > 到店', '支付订单 > 售后服务'].map((value) => ({ label: value, value }))

const ruleSourceOptions = [
  { label: '行为事件表', value: 'behavior' },
  { label: '业务明细表', value: 'detail' },
  { label: '用户属性表', value: 'attribute' },
  { label: '已有标签', value: 'tag' },
]

const dataSourceOptions = [
  { label: '行为事件表', value: '行为事件表' },
  { label: '订单明细表', value: '订单明细表' },
  { label: '会员主数据表', value: '会员主数据表' },
  { label: '用户属性宽表', value: '用户属性宽表' },
]

const eventOptions = ['App 启动', '浏览商品详情页', '提交留资', '预约试驾', '支付订单', '售后服务'].map((value) => ({ label: value, value }))
const detailTableOptions = ['订单明细表', '线索明细表', '试驾明细表', '售后工单表'].map((value) => ({ label: value, value }))
const attributeTableOptions = ['用户属性宽表', '会员主数据表', '车辆归属表'].map((value) => ({ label: value, value }))
const aggregateMethodOptions = ['总次数', '天数', '连续天数', '去重计数', '求和', '平均值', '最大值', '最小值'].map((value) => ({ label: value, value }))
const compareOperatorOptions = ['大于', '大于等于', '等于', '小于等于', '小于'].map((value) => ({ label: value, value }))
const outputModeOptions = [
  { label: '具体时间点', value: 'event_time' },
  { label: '距今天数', value: 'days_since' },
  { label: '事件/明细属性', value: 'attribute' },
]
const preferenceMetricOptions = [
  { label: '出现次数最多', value: 'count_most' },
  { label: '数值最大', value: 'numeric_max' },
  { label: '求和最高', value: 'sum' },
  { label: '平均值最高', value: 'average' },
]
const rfmSourceOptions = [
  { label: '明细数据', value: 'detail' },
  { label: '属性数据', value: 'attribute' },
  { label: '已有标签', value: 'tag' },
]
const rfmCompareOptions = [
  { label: '平均值', value: 'average' },
  { label: '中位数', value: 'median' },
  { label: '自定义阈值', value: 'custom' },
]
const importSourceFields = [
  { sourceField: 'level', sourceType: 'string', label: '会员等级', valueType: 'text' as TagValueType },
  { sourceField: 'city', sourceType: 'string', label: '会员城市', valueType: 'text' as TagValueType },
  { sourceField: 'age', sourceType: 'integer', label: '年龄', valueType: 'integer' as TagValueType },
  { sourceField: 'last_pay_date', sourceType: 'date', label: '最近消费日期', valueType: 'date' as TagValueType },
  { sourceField: 'total_amount', sourceType: 'decimal', label: '累计消费金额', valueType: 'decimal' as TagValueType },
]

const projectOptions = [
  { label: '增长运营项目', value: 'project-growth' },
  { label: '客服触达项目', value: 'project-service' },
  { label: '经销商运营项目', value: 'project-dealer' },
]

const persistWorkbenchPreference = (): void => {
  window.localStorage.setItem(preferenceStorageKey, JSON.stringify({
    managerView: managerView.value,
    pageSize: pageSize.value,
    savedViews: savedViews.value,
  }))
}

const buildEstimateSignature = (): string => JSON.stringify({
  valueType: draft.value.valueType,
  computeType: draft.value.computeType,
  updateType: draft.value.updateType,
  frequency: draft.value.frequency,
  emptyValueStrategy: draft.value.emptyValueStrategy,
  ttl: draft.value.ttl,
  onlineServiceEnabled: draft.value.onlineServiceEnabled,
  valueSaveMode: draft.value.valueSaveMode,
  metadata: draft.value.metadata,
  rule: draft.value.rule,
})

const markDraftChanged = (): void => {
  if (estimateResult.value) {
    estimateResult.value = undefined
    estimateSnapshot.value = ''
    notice.value = '规则或展示配置已变更，请重新预估后再提交。'
  }
}

const metadataTextValue = (fieldId: EntityId): string => {
  const value = draft.value.metadata[fieldId]
  return Array.isArray(value) ? value.join('、') : String(value ?? '')
}

const metadataSelectValue = (field: TagMetadataField): string | string[] | null => {
  const value = draft.value.metadata[field.id]
  if (field.dataType === 'multi_select') {
    return Array.isArray(value) ? value : value ? [String(value)] : []
  }
  return Array.isArray(value) ? value[0] ?? null : value ? String(value) : null
}

const setMetadataValue = (fieldId: EntityId, value: string | number | Array<string | number> | null): void => {
  if (Array.isArray(value)) {
    draft.value.metadata[fieldId] = value.map(String)
    return
  }
  draft.value.metadata[fieldId] = value === null ? '' : String(value)
}

const metadataFilterValue = (field: TagMetadataField): string | string[] | null => {
  const value = metadataFilters.value[field.id]
  if (field.dataType === 'multi_select') {
    return Array.isArray(value) ? value : value ? [String(value)] : []
  }
  return Array.isArray(value) ? value[0] ?? null : value ? String(value) : null
}

const setMetadataFilterValue = (fieldId: EntityId, value: string | number | Array<string | number> | null): void => {
  if (Array.isArray(value)) {
    metadataFilters.value[fieldId] = value.map(String)
    return
  }
  if (value === null || value === '') {
    delete metadataFilters.value[fieldId]
    return
  }
  metadataFilters.value[fieldId] = String(value)
}

const setBulkMetadataValue = (fieldId: EntityId, value: string | number | Array<string | number> | null): void => {
  if (Array.isArray(value)) {
    bulkMetadataDraft.value[fieldId] = value.map(String)
    return
  }
  if (value === null || value === '') {
    delete bulkMetadataDraft.value[fieldId]
    return
  }
  bulkMetadataDraft.value[fieldId] = String(value)
}

const runStatusOfTag = (tag: TagDefinition): TagRunRecord['status'] => {
  if (tag.latestRunStatus) {
    return tag.latestRunStatus
  }
  const run = detailBundle.value?.tag.id === tag.id ? detailRuns.value[0] : undefined
  if (run) {
    return run.status
  }
  if (tag.type === 'manual' || tag.computeType === 'realtime') {
    return 'other'
  }
  if (tag.status !== 'online') {
    return 'other'
  }
  return tag.latestDurationMs ? 'success' : 'waiting'
}

const tagActionOptions = (tag: TagDefinition): DropdownOption[] => [
  { label: '查看详情', key: 'detail' },
  { label: '运行记录', key: 'runs' },
  { label: '更新', key: 'run', disabled: tag.status !== 'online' || !tag.permissions.canRun },
  { label: '复制', key: 'copy', disabled: !tag.permissions.canEdit },
  { label: '授权给', key: 'auth', disabled: !tag.permissions.canManage },
  { label: '查看资源管理员', key: 'admins' },
  { type: 'divider', key: 'divider-1' },
  { label: '上架标签', key: 'online', disabled: tag.status === 'online' || !tag.permissions.canShelve },
  { label: '下架标签', key: 'offline', disabled: tag.status !== 'online' || !tag.permissions.canShelve },
  { label: '移动分组', key: 'move', disabled: !tag.permissions.canEdit },
  { label: '服务配置', key: 'service', disabled: !tag.permissions.canEdit },
  { label: '设置保留版本数', key: 'retention', disabled: !tag.permissions.canEdit || tag.updateType === 'manual' },
  { type: 'divider', key: 'divider-2' },
  { label: '删除标签', key: 'delete', disabled: !tag.permissions.canManage },
]

const handleTagAction = (key: string | number, tag: TagDefinition): void => {
  const action = String(key)
  if (action === 'detail' || action === 'runs') {
    openDetail(tag.id)
    if (action === 'runs') detailActiveTab.value = 'runs'
    return
  }
  if (action === 'run') {
    openRunModal([tag.id])
    return
  }
  if (action === 'copy') {
    void copyTag(tag.id)
    return
  }
  if (action === 'auth') {
    void openAuthModal(tag)
    return
  }
  if (action === 'admins') {
    openAdminsModal(tag)
    return
  }
  if (action === 'online' || action === 'offline') {
    openShelfModal([tag.id], action === 'online' ? 'online' : 'offline')
    return
  }
  if (action === 'move') {
    openMoveModal([tag.id])
    return
  }
  if (action === 'service') {
    openServiceModal(tag)
    return
  }
  if (action === 'retention') {
    openRetentionModal(tag)
    return
  }
  if (action === 'delete') {
    openDeleteModal(tag)
  }
}

const statusTagType = (status: TagStatus): TagProps['type'] => {
  if (status === 'online') return 'success'
  if (status === 'offline') return 'warning'
  if (status === 'deleted') return 'error'
  return 'default'
}

const runStatusTagType = (status: TagRunRecord['status']): TagProps['type'] => {
  if (status === 'success') return 'success'
  if (status === 'failed') return 'error'
  if (status === 'running') return 'warning'
  if (status === 'waiting') return 'info'
  return 'default'
}

const categoryName = (categoryId: EntityId): string => categories.value.find((item) => item.id === categoryId)?.name ?? '未分类'

const formatTime = (value?: string): string => (value ? value.replace('T', ' ').slice(0, 16) : '-')

const formatDuration = (value?: number): string => {
  if (!value) return '-'
  if (value < 1000) return `${value} ms`
  return `${Math.round(value / 1000)} 秒`
}

const summarizeRuleGroup = (group?: TagRuleGroup): string => {
  if (!group) return '未配置'
  const parts = [
    ...group.conditions.map((condition) => {
      const source = condition.sourceName || condition.sourceType
      const date = condition.dateRange ? `（${condition.dateRange}）` : ''
      const aggregate = condition.aggregateMethod && condition.aggregateMethod !== '不聚合' ? `，${condition.aggregateMethod}${condition.aggregateField ? `(${condition.aggregateField})` : ''}` : ''
      const childGroups = [
        ...(condition.childGroup ? [condition.childGroup] : []),
        ...(condition.childGroups ?? []),
      ]
      const child = childGroups.length
        ? `；二级筛选：${childGroups.map((childGroup) => `${childGroup.relation === 'or' ? '或' : '且'} ${summarizeRuleGroup(childGroup)}`).join('；')}`
        : ''
      return `${source}${date}：${condition.field} ${condition.operator} ${condition.value}${aggregate}${child}`
    }),
    ...(group.groups ?? []).map((item) => `(${summarizeRuleGroup(item)})`),
  ].filter(Boolean)
  return parts.length ? parts.join(group.logic === 'and' ? ' 且 ' : ' 或 ') : '未配置'
}

const loadBase = async (): Promise<void> => {
  const [nextCategories, nextMetadata, nextTemplates, nextPermissions, creatorSource] = await Promise.all([
    tagService.getTagCategories(),
    tagService.getTagMetadataFields(),
    tagService.getTagTemplates(),
    tagService.getTagPermissions(),
    tagService.getTags({ categoryId: 'cat-root' }),
  ])
  categories.value = nextCategories
  metadataFields.value = nextMetadata
  templates.value = nextTemplates
  tagPermissionSet.value = nextPermissions
  allCreators.value = Array.from(new Set(creatorSource.map((item) => item.createdBy.name)))
}

const loadTags = async (): Promise<void> => {
  loading.value = true
  try {
    const statuses = ['home', 'manage'].includes(currentPage.value) && managerStatus.value !== 'all' ? [managerStatus.value] : undefined
    const filters: Partial<TagListFilters> = {
      keyword: searchKeyword.value,
      categoryId: selectedCategoryId.value,
      ignoreCategory: Boolean(searchKeyword.value.trim()),
      statuses,
      types: selectedTypes.value,
      valueTypes: selectedValueTypes.value,
      runStatuses: selectedRunStatuses.value,
      creator: selectedCreator.value,
      metadata: metadataFilters.value,
    }
    tags.value = await tagService.getTags(filters)
    selectedTagIds.value = selectedTagIds.value.filter((id) => tags.value.some((tag) => tag.id === id))
    pageIndex.value = Math.min(pageIndex.value, Math.max(1, Math.ceil(tags.value.length / pageSize.value)))
  } finally {
    loading.value = false
  }
}

const loadDetail = async (tagId = currentTagId.value): Promise<void> => {
  if (!tagId) return
  loading.value = true
  try {
    detailBundle.value = await tagService.getTagDetail(tagId)
  } finally {
    loading.value = false
  }
}

const scheduleLoadTags = (): void => {
  window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    void loadTags()
  }, 300)
}

const ensureDraftRuleDefaults = (): void => {
  draft.value.rule.filterGroup ??= { id: 'filter-root', logic: 'and', conditions: [], groups: [] }
  draft.value.rule.excludeGroup ??= { id: 'exclude-root', logic: 'or', conditions: [], groups: [] }
  if (draft.value.type === 'calculation') {
    draft.value.rule.resultBounds ??= { min: 0, max: 1 }
    draft.value.rule.assignmentRules ??= []
    draft.value.rule.fieldBounds ??= []
  }
  if (draft.value.type === 'manual') {
    draft.value.rule.manualIdType ??= 'user_id'
    if (draft.value.valueType.startsWith('multi')) draft.value.rule.manualDelimiter ??= ','
  }
  if (draft.value.type === 'rfm') {
    draft.value.rule.rfmSourceType ??= 'detail'
    draft.value.rule.rfmPeriod ??= '最近 180 天，不包含今天'
    draft.value.rule.rfmValueNames ??= [
      { code: 'HHH', name: '重要价值客户' },
      { code: 'LHH', name: '重要唤回客户' },
      { code: 'HLH', name: '重要深耕客户' },
      { code: 'HHL', name: '重要挽留客户' },
      { code: 'HLL', name: '潜力客户' },
      { code: 'LHL', name: '新客户' },
      { code: 'LLH', name: '一般维持客户' },
      { code: 'LLL', name: '流失客户' },
    ]
  }
}

const prepareCreateDraft = async (): Promise<void> => {
  estimateResult.value = undefined
  estimateSnapshot.value = ''
  sqlResult.value = undefined
  uploadResult.value = undefined
  manualUploadFile.value = undefined
  currentStep.value = 1
  if (isEditing.value && currentTagId.value) {
    const bundle = await tagService.getTagDetail(currentTagId.value)
    if (bundle) {
      detailBundle.value = bundle
      draft.value = {
        name: bundle.tag.name,
        description: bundle.tag.description,
        type: bundle.tag.type,
        valueType: bundle.tag.valueType,
        categoryId: bundle.tag.categoryId,
        computeType: bundle.tag.computeType,
        updateType: bundle.tag.updateType === 'realtime' ? 'scheduled' : bundle.tag.updateType,
        frequency: bundle.tag.frequency,
        emptyValueStrategy: bundle.tag.emptyValueStrategy,
        ttl: bundle.tag.ttl,
        onlineServiceEnabled: bundle.tag.onlineServiceEnabled,
        valueSaveMode: bundle.tag.valueSaveMode,
        metadata: { ...bundle.tag.metadata },
        rule: { ...bundle.tag.rule },
      }
      ensureDraftRuleDefaults()
    }
    return
  }
  draft.value = tagService.buildDefaultCreatePayload(currentCreateType.value)
  ensureDraftRuleDefaults()
}

const refreshCurrentPage = async (): Promise<void> => {
  await loadBase()
  if (['home', 'manage'].includes(currentPage.value)) {
    if (route.query.output === 'tag' && route.query.modelTaskId) {
      const tag = await tagService.createModelOutputTag(String(route.query.modelTaskId))
      notice.value = `可视化建模任务已输出为标签「${tag.name}」。`
      void router.replace('/user-insight/tags')
    }
    await loadTags()
  }
  if (currentPage.value === 'detail') {
    await loadDetail()
  }
  if (['create', 'edit'].includes(currentPage.value)) {
    await prepareCreateDraft()
  }
}

const navigateTab = (path: string): void => {
  void router.push(path)
}

const handleCreateSelect = (key: string | number): void => {
  const type = String(key) as TagType
  if (type === 'model') {
    message.info('自定义模型标签将进入可视化建模，并通过输出节点写回标签体系。')
    void router.push({ path: '/metadata/visual-modeling', query: { output: 'tag', returnTo: '/user-insight/tags', modelTaskId: 'vm-task-churn-risk' } })
    return
  }
  void router.push(`/user-insight/tags/create/${type}`)
}

const openDetail = (tagId: EntityId): void => {
  void router.push(`/user-insight/tags/${tagId}`)
}

const openEdit = (tagId: EntityId): void => {
  void router.push(`/user-insight/tags/${tagId}/edit`)
}

const openCategoryModal = (mode: typeof categoryMode.value, categoryId: EntityId): void => {
  categoryMode.value = mode
  categoryContextId.value = categoryId
  const category = categories.value.find((item) => item.id === categoryId)
  categoryDraftName.value = mode === 'rename' ? category?.name ?? '' : ''
  categoryModalVisible.value = true
}

const submitCategory = async (): Promise<void> => {
  actionLoading.value = true
  try {
    if (categoryMode.value === 'rename') {
      await tagService.renameCategory(categoryContextId.value, categoryDraftName.value)
      message.success('分类已重命名')
    } else {
      const context = categories.value.find((item) => item.id === categoryContextId.value)
      const parentId = categoryMode.value === 'create_sibling' ? context?.parentId ?? 'cat-root' : categoryContextId.value
      await tagService.createCategory(categoryDraftName.value, parentId)
      message.success('分类已创建')
    }
    categoryModalVisible.value = false
    await loadBase()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '创建失败，请重试')
  } finally {
    actionLoading.value = false
  }
}

const submitDeleteCategory = async (categoryId: EntityId): Promise<void> => {
  try {
    await tagService.deleteCategory(categoryId)
    if (selectedCategoryId.value === categoryId) selectedCategoryId.value = 'cat-root'
    message.success('分类已删除')
    await loadBase()
    await loadTags()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '当前分类下存在标签或子分类，请先移动或删除后再操作')
  }
}

const beginDragCategory = (categoryId: EntityId): void => {
  draggingCategoryId.value = categoryId
  draggingTagId.value = ''
}

const beginDragTag = (tagId: EntityId): void => {
  draggingTagId.value = tagId
  draggingCategoryId.value = ''
}

const dropOnCategory = async (target: TagCategory): Promise<void> => {
  if (draggingTagId.value) {
    await moveTags([draggingTagId.value], target.id)
    draggingTagId.value = ''
    return
  }
  if (!draggingCategoryId.value || draggingCategoryId.value === target.id) return
  const source = categories.value.find((item) => item.id === draggingCategoryId.value)
  if (!source || source.system || source.parentId !== target.parentId || target.system) {
    message.warning('该位置不支持拖拽排序')
    draggingCategoryId.value = ''
    return
  }
  const siblings = categories.value.filter((item) => item.parentId === target.parentId).sort((a, b) => a.sort - b.sort)
  const sourceIndex = siblings.findIndex((item) => item.id === source.id)
  const targetIndex = siblings.findIndex((item) => item.id === target.id)
  siblings.splice(sourceIndex, 1)
  siblings.splice(targetIndex, 0, source)
  const snapshot = categories.value.map((item) => ({ ...item }))
  try {
    await tagService.reorderCategories(siblings.map((item) => item.id))
    message.success('排序已保存')
    await loadBase()
  } catch (error) {
    categories.value = snapshot
    message.error(error instanceof Error ? `${error.message}，已恢复原排序` : '排序保存失败，已恢复原排序')
  } finally {
    draggingCategoryId.value = ''
  }
}

const moveTags = async (ids: EntityId[], categoryId: EntityId): Promise<void> => {
  try {
    const result = await tagService.moveTagsCategory(ids, categoryId)
    showBulkResult(result, '移动分组已完成')
    await loadBase()
    await loadTags()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '移动失败')
  }
}

const openMoveModal = (ids: EntityId[]): void => {
  moveIds.value = ids
  moveTargetCategoryId.value = 'cat-uncategorized'
  moveModalVisible.value = true
}

const submitMove = async (): Promise<void> => {
  await moveTags(moveIds.value, moveTargetCategoryId.value)
  moveModalVisible.value = false
}

const openShelfModal = async (ids: EntityId[], status: Extract<TagStatus, 'online' | 'offline'>): Promise<void> => {
  shelfIds.value = ids
  shelfStatus.value = status
  shelfAcknowledged.value = status === 'online'
  shelfRisks.value = status === 'offline' ? await tagService.getTagDependencyRisks(ids) : []
  shelfModalVisible.value = true
}

const submitShelf = async (): Promise<void> => {
  if (shelfStatus.value === 'offline' && !shelfAcknowledged.value) {
    message.warning('请先确认已知晓下架影响')
    return
  }
  const result = await tagService.shelveTags(shelfIds.value, shelfStatus.value)
  showBulkResult(result, shelfStatus.value === 'online' ? '上架完成' : '下架完成')
  shelfModalVisible.value = false
  await loadTags()
  if (currentPage.value === 'detail') await loadDetail()
}

const openDeleteModal = (tag: TagDefinition): void => {
  deleteTarget.value = tag
  deleteConfirmName.value = ''
  deleteModalVisible.value = true
}

const submitDeleteTag = async (): Promise<void> => {
  if (!deleteTarget.value) return
  try {
    await tagService.deleteTag(deleteTarget.value.id, deleteConfirmName.value)
    message.success('标签已删除')
    deleteModalVisible.value = false
    if (currentPage.value === 'detail') {
      void router.push('/user-insight/tags')
    } else {
      await loadTags()
    }
  } catch (error) {
    message.error(error instanceof Error ? error.message : '删除失败')
  }
}

const copyTag = async (tagId: EntityId): Promise<void> => {
  const copied = await tagService.copyTag(tagId)
  message.success(`已复制为「${copied.name}」`)
  await loadTags()
  void router.push(`/user-insight/tags/${copied.id}/edit`)
}

const toggleFavorite = async (tagId: EntityId): Promise<void> => {
  await tagService.toggleFavorite(tagId)
  if (currentPage.value === 'detail') await loadDetail()
  await loadTags()
}

const openRunModal = (ids: EntityId[]): void => {
  runIds.value = ids
  runRange.value = { start: '2026-05-25', end: '2026-05-25', overwrite: true }
  runModalVisible.value = true
}

const submitRun = async (): Promise<void> => {
  if (runIds.value.length === 1) {
    await tagService.runTag(runIds.value[0]!, { start: runRange.value.start, end: runRange.value.end }, runRange.value.overwrite)
    message.success('已生成运行任务')
  } else {
    const result = await tagService.batchRunTags(runIds.value, { start: runRange.value.start, end: runRange.value.end })
    showBulkResult(result, '批量运行已生成任务')
  }
  runModalVisible.value = false
  if (currentPage.value === 'detail') await loadDetail()
}

const advanceRuns = async (): Promise<void> => {
  await tagService.advanceMockRuns()
  message.success('运行状态已刷新')
  if (currentPage.value === 'detail') await loadDetail()
  await loadTags()
}

const stopRun = async (runId: EntityId): Promise<void> => {
  try {
    await tagService.stopRun(runId)
    message.success('任务已停止')
    await loadDetail()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '停止失败')
  }
}

const rerun = async (runId: EntityId): Promise<void> => {
  await tagService.rerun(runId)
  message.success('已重新生成运行任务')
  await loadDetail()
}

const openAuthModal = async (tag: TagDefinition): Promise<void> => {
  authTarget.value = tag
  authTargetIds.value = [tag.id]
  const bundle = await tagService.getTagDetail(tag.id)
  authRows.value = bundle?.permissions ?? []
  authDraft.value = { principalType: 'user', principalName: '', permission: 'view' }
  authModalVisible.value = true
}

const openBatchAuthModal = (): void => {
  authTarget.value = undefined
  authTargetIds.value = [...selectedTagIds.value]
  authRows.value = []
  authDraft.value = { principalType: 'group', principalName: '', permission: 'view' }
  authModalVisible.value = true
}

const addAuthRow = (): void => {
  if (!authDraft.value.principalName.trim()) {
    message.warning('请输入授权对象')
    return
  }
  authRows.value.push({
    id: `draft-${Date.now()}`,
    tagId: authTargetIds.value[0] ?? '',
    principalType: authDraft.value.principalType,
    principalId: `principal-${Date.now()}`,
    principalName: authDraft.value.principalName.trim(),
    permission: authDraft.value.permission as TagPermission['permission'],
    grantedBy: '当前用户',
    grantedAt: new Date().toISOString(),
  })
  authDraft.value.principalName = ''
}

const saveAuth = async (): Promise<void> => {
  if (!authTargetIds.value.length) return
  const rows = authRows.value.map((row) => ({
    principalType: row.principalType,
    principalId: row.principalId,
    principalName: row.principalName,
    permission: row.permission,
  }))
  await Promise.all(authTargetIds.value.map((tagId) => tagService.savePermissions(tagId, rows)))
  message.success('授权已保存')
  authModalVisible.value = false
  if (currentPage.value === 'detail') await loadDetail()
}

const openServiceModal = (tag: TagDefinition): void => {
  serviceTarget.value = tag
  serviceDraft.value = {
    enabled: tag.onlineServiceEnabled,
    qpsLimit: tag.onlineServiceEnabled ? 8000 : 5000,
    cacheTtlSeconds: 60,
  }
  serviceModalVisible.value = true
}

const submitServiceConfig = async (): Promise<void> => {
  if (!serviceTarget.value) return
  try {
    await tagService.configureOnlineService(serviceTarget.value.id, serviceDraft.value.enabled)
    message.success(serviceDraft.value.enabled ? '在线服务已开启' : '在线服务已关闭')
    serviceModalVisible.value = false
    await loadTags()
    if (currentPage.value === 'detail') await loadDetail()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '服务配置保存失败')
  }
}

const openRetentionModal = (tag: TagDefinition): void => {
  retentionTarget.value = tag
  retentionDraft.value = {
    strategy: tag.ttl.strategy,
    value: tag.ttl.value ?? 32,
    unit: tag.ttl.unit ?? (tag.frequency.unit === 'realtime' ? 'day' : tag.frequency.unit),
  }
  retentionModalVisible.value = true
}

const submitRetentionConfig = async (): Promise<void> => {
  if (!retentionTarget.value) return
  try {
    await tagService.setTagTtl(retentionTarget.value.id, retentionDraft.value)
    message.success('保留策略已保存')
    retentionModalVisible.value = false
    await loadTags()
    if (currentPage.value === 'detail') await loadDetail()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '保留策略保存失败')
  }
}

const openAdminsModal = (tag: TagDefinition): void => {
  adminsTarget.value = tag
  adminsModalVisible.value = true
}

const openSegmentModal = (value: string): void => {
  if (!currentDetail.value) return
  segmentDraft.value = {
    name: `${currentDetail.value.name}-${value}`,
    value,
    rule: `${currentDetail.value.name} = ${value}`,
  }
  segmentModalVisible.value = true
}

const createSegmentFromDistribution = (): void => {
  if (!segmentDraft.value.name.trim()) {
    message.warning('请输入分群名称')
    return
  }
  message.success(`已保存分群规则「${segmentDraft.value.name}」`)
  notice.value = `分群规则：${segmentDraft.value.rule}。后续可进入人群圈选继续配置触达策略。`
  segmentModalVisible.value = false
}

const openRunLogModal = (run: TagRunRecord): void => {
  activeRunLog.value = run
  runLogModalVisible.value = true
}

const openOperationLogModal = (log: TagOperationLog): void => {
  activeOperationLog.value = log
  operationLogModalVisible.value = true
}

const restoreLogAndRerun = async (): Promise<void> => {
  if (!currentDetail.value || !activeOperationLog.value) return
  try {
    await tagService.runTag(currentDetail.value.id, { start: '2026-05-25', end: '2026-05-25' }, true)
    message.success('已按历史操作版本生成重跑任务')
    operationLogModalVisible.value = false
    await loadDetail()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '恢复失败')
  }
}

const refreshHistory = async (): Promise<void> => {
  if (!currentDetail.value) return
  await tagService.refreshTagHistory(currentDetail.value.id, historyGrain.value)
  historyRange.value = historyGrain.value === 'day' ? '最近 7 天' : historyGrain.value === 'week' ? '最近 7 周' : '最近 7 月'
  message.success('历史趋势已刷新')
  await loadDetail()
}

const restoreRuleVersion = async (version: TagRuleVersion): Promise<void> => {
  if (!currentDetail.value) return
  try {
    await tagService.restoreRuleVersion(currentDetail.value.id, version.id)
    await tagService.runTag(currentDetail.value.id, { start: '2026-05-25', end: '2026-05-25' }, true)
    message.success(`已恢复到 V${version.versionNo} 并生成重跑任务`)
    await loadDetail()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '规则版本恢复失败')
  }
}

const downloadLineage = (): void => {
  const rows = [
    ['资产名称', '资产类型', '方向', '层级', '状态'],
    ...detailLineage.value.map((node) => [
      node.name,
      node.assetType,
      node.direction === 'upstream' ? '上游' : '下游',
      String(node.level),
      node.status,
    ]),
  ]
  downloadText(`tag-lineage-${currentDetail.value?.id ?? 'detail'}.csv`, rows.map((row) => row.join(',')).join('\n'))
  message.success('血缘数据已下载')
}

const openMetadataModal = (field?: TagMetadataField): void => {
  metadataDraft.value = {
    id: field?.id ?? '',
    name: field?.name ?? '',
    dataType: field?.dataType ?? 'text',
    required: field?.required ?? false,
    enumValuesText: field?.enumValues.join('\n') ?? '',
    quickFilterEnabled: field?.quickFilterEnabled ?? false,
    description: field?.description ?? '',
  }
  metadataModalVisible.value = true
}

const submitMetadata = async (): Promise<void> => {
  try {
    const payload = {
      name: metadataDraft.value.name,
      dataType: metadataDraft.value.dataType,
      required: metadataDraft.value.required,
      enumValues: metadataDraft.value.enumValuesText
        .split(/[,\n，]/)
        .map((item) => item.trim())
        .filter(Boolean),
      quickFilterEnabled: metadataDraft.value.quickFilterEnabled,
      description: metadataDraft.value.description,
    }
    if (metadataDraft.value.id) {
      await tagService.updateMetadataField(metadataDraft.value.id, payload)
      message.success('元信息已更新')
    } else {
      await tagService.createMetadataField(payload)
      message.success('元信息已创建')
    }
    metadataModalVisible.value = false
    await loadBase()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '保存失败')
  }
}

const deleteMetadata = async (fieldId: EntityId): Promise<void> => {
  await tagService.deleteMetadataField(fieldId)
  delete metadataFilters.value[fieldId]
  message.success('元信息已停用')
  await loadBase()
}

const enableTemplates = async (): Promise<void> => {
  const result = await tagService.enableTemplate(checkedTemplateIds.value)
  showBulkResult(result, '模板启用完成')
  checkedTemplateIds.value = []
  await loadBase()
}

const parseSql = async (): Promise<void> => {
  sqlResult.value = await tagService.parseSql(draft.value.rule.sql ?? '')
  if (sqlResult.value.ok) {
    setSqlMapping('subject_id', sqlResult.value.columns.find((item) => item.name.includes('user') || item.name.includes('subject'))?.name ?? 'user_id')
    setSqlMapping('tag_value', sqlResult.value.columns.find((item) => item.name.includes('tag_value'))?.name ?? 'tag_value')
    message.success(sqlResult.value.message)
  } else {
    message.error(sqlResult.value.message)
  }
}

const formatSql = async (): Promise<void> => {
  draft.value.rule.sql = await tagService.formatSql(draft.value.rule.sql ?? '')
  markDraftChanged()
}

const previewUpload = async (): Promise<void> => {
  try {
    const file = manualUploadFile.value
    const fileText = file && /\.csv$/i.test(file.name) ? await file.text() : undefined
    uploadResult.value = await tagService.previewUpload(draft.value.rule.dataSource ?? file?.name ?? '标签上传.csv', draft.value.valueType, fileText)
    message.success('文件校验完成')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '上传失败')
  }
}

const addSelectedField = (fieldId: EntityId): void => {
  const field = fieldOptions.find((item) => item.id === fieldId)
  if (!field) return
  if (draft.value.type === 'priority' && field.valueType !== draft.value.valueType) {
    message.warning('排序标签只能选择与标签值类型一致的字段')
    return
  }
  const selected = draft.value.rule.selectedFields ?? []
  if (selected.some((item) => item.id === field.id)) return
  draft.value.rule.selectedFields = [...selected, field]
  if (draft.value.type === 'calculation') {
    draft.value.rule.assignmentRules = [
      ...(draft.value.rule.assignmentRules ?? []),
      { fieldId: field.id, mode: ['text', 'multi_text'].includes(field.valueType) ? 'enum' : 'raw', mappings: [] },
    ]
  }
  draft.value.rule.summary ||= draft.value.type === 'priority' ? '按已选字段顺序取第一个非空值。' : '基于已选字段进行二次计算。'
  markDraftChanged()
}

const removeSelectedField = (fieldId: EntityId): void => {
  draft.value.rule.selectedFields = (draft.value.rule.selectedFields ?? []).filter((item) => item.id !== fieldId)
  draft.value.rule.assignmentRules = (draft.value.rule.assignmentRules ?? []).filter((item) => item.fieldId !== fieldId)
  draft.value.rule.fieldBounds = (draft.value.rule.fieldBounds ?? []).filter((item) => item.fieldId !== fieldId)
  markDraftChanged()
}

const moveSelectedField = (fieldId: EntityId, direction: -1 | 1): void => {
  const fields = [...(draft.value.rule.selectedFields ?? [])]
  const index = fields.findIndex((field) => field.id === fieldId)
  const nextIndex = index + direction
  if (index < 0 || nextIndex < 0 || nextIndex >= fields.length) return
  const [field] = fields.splice(index, 1)
  if (!field) return
  fields.splice(nextIndex, 0, field)
  draft.value.rule.selectedFields = fields
  markDraftChanged()
}

const insertExpressionToken = (token: string): void => {
  draft.value.rule.expression = `${draft.value.rule.expression ?? ''} ${token}`.trim()
  markDraftChanged()
}

const assignmentRuleFor = (fieldId: EntityId) => {
  const rules = draft.value.rule.assignmentRules ?? []
  let rule = rules.find((item) => item.fieldId === fieldId)
  if (!rule) {
    rule = { fieldId, mode: 'raw', mappings: [] }
    draft.value.rule.assignmentRules = [...rules, rule]
  }
  return rule
}

const addAssignmentMapping = (fieldId: EntityId): void => {
  const rule = assignmentRuleFor(fieldId)
  rule.mappings = [
    ...rule.mappings,
    { id: `mapping-${Date.now()}`, label: `取值 ${rule.mappings.length + 1}`, value: rule.mappings.length + 1 },
  ]
  markDraftChanged()
}

const removeAssignmentMapping = (fieldId: EntityId, mappingId: EntityId): void => {
  const rule = assignmentRuleFor(fieldId)
  rule.mappings = rule.mappings.filter((item) => item.id !== mappingId)
  markDraftChanged()
}

const setRfmMetricEnabled = (metricKey: 'R' | 'F' | 'M', enabled: boolean): void => {
  const metrics = draft.value.rule.rfmMetrics ?? [
    { key: 'R' as const, enabled: true, threshold: '小于等于平均值为高' },
    { key: 'F' as const, enabled: true, threshold: '大于平均值为高' },
    { key: 'M' as const, enabled: true, threshold: '大于平均值为高' },
  ]
  draft.value.rule.rfmMetrics = metrics.map((metric) => (metric.key === metricKey ? { ...metric, enabled } : metric))
  markDraftChanged()
}

const setRfmMetricThreshold = (metricKey: 'R' | 'F' | 'M', threshold: string): void => {
  const metrics = draft.value.rule.rfmMetrics ?? [
    { key: 'R' as const, enabled: true, threshold: '小于等于平均值为高' },
    { key: 'F' as const, enabled: true, threshold: '大于平均值为高' },
    { key: 'M' as const, enabled: true, threshold: '大于平均值为高' },
  ]
  draft.value.rule.rfmMetrics = metrics.map((metric) => (metric.key === metricKey ? { ...metric, threshold } : metric))
  markDraftChanged()
}

const setRfmMetricField = (metricKey: 'R' | 'F' | 'M', field: string): void => {
  const metrics = draft.value.rule.rfmMetrics ?? []
  draft.value.rule.rfmMetrics = metrics.map((metric) => (metric.key === metricKey ? { ...metric, field } : metric))
  markDraftChanged()
}

const setRfmMetricCompareType = (metricKey: 'R' | 'F' | 'M', compareType: 'average' | 'median' | 'custom'): void => {
  const metrics = draft.value.rule.rfmMetrics ?? []
  draft.value.rule.rfmMetrics = metrics.map((metric) => (metric.key === metricKey ? { ...metric, compareType } : metric))
  markDraftChanged()
}

const setRfmMetricCustomThreshold = (metricKey: 'R' | 'F' | 'M', customThreshold: number | null): void => {
  const metrics = draft.value.rule.rfmMetrics ?? []
  draft.value.rule.rfmMetrics = metrics.map((metric) => (metric.key === metricKey ? { ...metric, customThreshold: customThreshold ?? undefined } : metric))
  markDraftChanged()
}

const setRfmValueName = (code: string, name: string): void => {
  draft.value.rule.rfmValueNames = (draft.value.rule.rfmValueNames ?? []).map((item) => (item.code === code ? { ...item, name } : item))
  markDraftChanged()
}

const addInterval = (): void => {
  const intervals = draft.value.rule.intervals ?? []
  intervals.push({ id: `interval-${Date.now()}`, name: `分层 ${intervals.length + 1}`, min: intervals.length * 10, max: (intervals.length + 1) * 10 })
  draft.value.rule.intervals = intervals
  markDraftChanged()
}

const removeInterval = (id: EntityId): void => {
  draft.value.rule.intervals = (draft.value.rule.intervals ?? []).filter((item) => item.id !== id)
  markDraftChanged()
}

const addImportField = (): void => {
  const fields = draft.value.rule.importFields ?? []
  fields.push({
    id: `import-field-${Date.now()}`,
    sourceField: `field_${fields.length + 1}`,
    tagName: `导入标签 ${fields.length + 1}`,
    categoryId: draft.value.categoryId || 'cat-import',
    valueType: draft.value.valueType,
  })
  draft.value.rule.importFields = fields
  markDraftChanged()
}

const removeImportField = (fieldId: EntityId): void => {
  draft.value.rule.importFields = (draft.value.rule.importFields ?? []).filter((field) => field.id !== fieldId)
  markDraftChanged()
}

const toggleImportField = (sourceField: string, checked: boolean): void => {
  const source = importSourceFields.find((item) => item.sourceField === sourceField)
  if (!source) return
  const fields = draft.value.rule.importFields ?? []
  if (!checked) {
    draft.value.rule.importFields = fields.filter((field) => field.sourceField !== source.sourceField)
    markDraftChanged()
    return
  }
  if (fields.some((field) => field.sourceField === source.sourceField)) return
  draft.value.rule.importFields = [
    ...fields,
    {
      id: `import-${source.sourceField}`,
      sourceField: source.sourceField,
      sourceType: source.sourceType,
      tagName: source.label,
      categoryId: draft.value.categoryId || 'cat-import',
      valueType: source.valueType,
      forceCast: false,
    },
  ]
  markDraftChanged()
}

const updateRuleSourceType = (sourceType: 'behavior' | 'detail' | 'attribute' | 'tag'): void => {
  draft.value.rule.sourceType = sourceType
  draft.value.rule.dataSource = sourceType === 'behavior'
    ? '行为事件表'
    : sourceType === 'detail'
      ? '订单明细表'
      : sourceType === 'attribute'
        ? '用户属性宽表'
        : '已有标签'
  markDraftChanged()
}

const insertSqlField = (fieldName: string): void => {
  draft.value.rule.sql = `${draft.value.rule.sql ?? ''} ${fieldName}`.trim()
  sqlResult.value = undefined
  markDraftChanged()
}

const setSqlMapping = (targetField: 'subject_id' | 'tag_value' | 'partition_date', sourceColumn: string): void => {
  const mappings = draft.value.rule.sqlFieldMappings ?? []
  const current = mappings.find((item) => item.targetField === targetField)
  if (current) {
    current.sourceColumn = sourceColumn
  } else {
    mappings.push({ sourceColumn, targetField, required: targetField !== 'partition_date' })
  }
  draft.value.rule.sqlFieldMappings = mappings
  markDraftChanged()
}

const handleManualFileChange = (event: Event): void => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  manualUploadFile.value = file
  draft.value.rule.dataSource = file.name
  uploadResult.value = undefined
  markDraftChanged()
}

const validateRequiredMetadata = (): boolean => {
  const missing = metadataFields.value.find((field) => {
    if (!field.required) return false
    const value = draft.value.metadata[field.id]
    return Array.isArray(value) ? value.length === 0 : !String(value ?? '').trim()
  })
  if (missing) {
    message.error(`请填写必填元信息：${missing.name}`)
    return false
  }
  return true
}

const validateRuleValues = (): boolean => {
  const values = draft.value.rule.values ?? []
  const groupHasRule = (group?: TagRuleGroup): boolean =>
    Boolean(group && (
      group.conditions.length > 0
      || group.conditions.some((condition) => groupHasRule(condition.childGroup) || (condition.childGroups ?? []).some((childGroup) => groupHasRule(childGroup)))
      || (group.groups ?? []).some((item) => groupHasRule(item))
    ))
  if (!values.length) {
    message.error('请至少配置一个标签值')
    return false
  }
  const names = values.map((item) => item.name.trim())
  if (names.some((name) => !name)) {
    message.error('标签值名称不能为空')
    return false
  }
  if (new Set(names).size !== names.length) {
    message.error('同一标签下标签值不可重复')
    return false
  }
  if (names.some((name) => /[,\n，]/.test(name))) {
    message.error('标签值名称不可包含逗号或换行')
    return false
  }
  if (values.some((item) => !groupHasRule(item.include) && !groupHasRule(item.exclude))) {
    message.error('每个标签值至少需要一条满足或排除规则')
    return false
  }
  if (draft.value.type === 'lifecycle' && values.length < 2) {
    message.error('生命周期标签至少保留 2 个阶段')
    return false
  }
  if (draft.value.type === 'lifecycle' && values.length > 8) {
    message.error('生命周期标签最多 8 个阶段')
    return false
  }
  return true
}

const validateIntervals = (): boolean => {
  const intervals = draft.value.rule.intervals ?? []
  if (draft.value.rule.displayMode !== 'range') return true
  if (!intervals.length) {
    message.error('按数值区间展示时至少配置一个分层')
    return false
  }
  const names = intervals.map((item) => item.name.trim())
  if (names.some((name) => !name) || new Set(names).size !== names.length) {
    message.error('分层名称不能为空且不可重复')
    return false
  }
  const invalid = intervals.some((item) => item.min !== undefined && item.max !== undefined && item.min > item.max)
  if (invalid) {
    message.error('分层区间下限不可大于上限')
    return false
  }
  return true
}

const validateStep = (): boolean => {
  if (currentStep.value === 1) {
    if (!draft.value.name.trim()) {
      message.error('标签名称不能为空')
      return false
    }
    if (!draft.value.categoryId) {
      message.error('请选择标签所在目录')
      return false
    }
    if (draft.value.emptyValueStrategy === 'keep_previous' && ['week', 'month'].includes(draft.value.frequency.unit)) {
      message.error('当前更新取值逻辑暂不支持周/月调度，请改为按天调度或选择计算为空时保留空缺')
      return false
    }
    if (!validateRequiredMetadata()) {
      return false
    }
  }
  if (currentStep.value === 2) {
    if (draft.value.computeType === 'realtime' && /(未做过|全局未做过|依次做过|like|正则|topN)/i.test(draft.value.rule.summary + (draft.value.rule.sql ?? ''))) {
      message.error('当前实时标签不支持该规则逻辑，请调整配置')
      return false
    }
    if (draft.value.type === 'sql' && (!sqlResult.value || !sqlResult.value.ok)) {
      message.error('SQL 标签需要先解析通过')
      return false
    }
    if ((draft.value.type === 'rule' || draft.value.type === 'lifecycle') && !validateRuleValues()) {
      return false
    }
    const hasFilterRule = (group?: TagRuleGroup): boolean =>
      Boolean(group && (
        group.conditions.length > 0
        || group.conditions.some((condition) => hasFilterRule(condition.childGroup) || (condition.childGroups ?? []).some((childGroup) => hasFilterRule(childGroup)))
        || (group.groups ?? []).some((item) => hasFilterRule(item))
      ))
    if (draft.value.type === 'statistic') {
      if (!draft.value.rule.sourceType || !draft.value.rule.dataSource || !draft.value.rule.dateRange || !draft.value.rule.aggregateMethod || !hasFilterRule(draft.value.rule.filterGroup)) {
        message.error('统计标签需要配置数据源、日期范围、筛选条件和统计方式')
        return false
      }
      if (!['总次数', '天数', '连续天数'].includes(draft.value.rule.aggregateMethod) && !draft.value.rule.aggregateField?.trim()) {
        message.error('当前统计方式需要选择聚合字段')
        return false
      }
    }
    if (draft.value.type === 'first_last') {
      if (!draft.value.rule.sourceType || !draft.value.rule.dataSource || !draft.value.rule.dateRange || !draft.value.rule.timeField || !draft.value.rule.outputMode || !hasFilterRule(draft.value.rule.filterGroup)) {
        message.error('首末次标签需要配置数据源、日期范围、筛选条件、时间字段和输出特征')
        return false
      }
      if (draft.value.rule.outputMode === 'attribute' && !draft.value.rule.outputAttribute?.trim()) {
        message.error('输出事件属性时需要选择输出属性')
        return false
      }
    }
    if (draft.value.type === 'preference') {
      if (draft.value.computeType === 'realtime') {
        message.error('偏好标签仅支持离线计算')
        return false
      }
      if (!draft.value.rule.sourceType || !draft.value.rule.dataSource || !draft.value.rule.dateRange || !draft.value.rule.preferenceField || !draft.value.rule.preferenceMetric || !draft.value.rule.topN || !hasFilterRule(draft.value.rule.filterGroup)) {
        message.error('偏好标签需要配置数据源、日期范围、筛选条件、偏好字段、排序指标和 Top N')
        return false
      }
    }
    if (draft.value.type === 'priority' && (draft.value.rule.selectedFields?.length ?? 0) < 2) {
      message.error('排序标签至少需要选择 2 个字段')
      return false
    }
    if (draft.value.type === 'priority' && (draft.value.rule.selectedFields ?? []).some((field) => field.valueType !== draft.value.valueType)) {
      message.error('排序标签只能选择与目标标签值类型一致的字段')
      return false
    }
	    if (draft.value.type === 'calculation') {
	      const expression = draft.value.rule.expression?.trim() ?? ''
	      const selectedFields = draft.value.rule.selectedFields ?? []
	      if (!selectedFields.length || !expression) {
	        message.error('运算标签需要选择字段并填写表达式')
	        return false
	      }
      if ((expression.match(/\(/g)?.length ?? 0) !== (expression.match(/\)/g)?.length ?? 0)) {
        message.error('表达式括号不匹配')
        return false
      }
	      if (!selectedFields.some((field) => expression.includes(field.id))) {
        message.error('表达式需引用至少一个已选字段')
        return false
      }
      if (/\/\s*0(?![\d.])/.test(expression)) {
        message.error('表达式不允许除以 0')
        return false
      }
    }
    if (draft.value.type === 'rfm' && (draft.value.rule.rfmMetrics?.filter((item) => item.enabled).length ?? 0) < 2) {
      message.error('RFM 标签至少保留两个指标')
      return false
    }
    if (draft.value.type === 'rfm') {
      const enabledMetrics = draft.value.rule.rfmMetrics?.filter((item) => item.enabled) ?? []
      if (!draft.value.rule.rfmSourceType || !draft.value.rule.dataSource || !draft.value.rule.rfmPeriod || enabledMetrics.some((item) => !item.field?.trim())) {
        message.error('RFM 标签需要配置数据来源、计算周期和已启用指标字段')
        return false
      }
      const names = draft.value.rule.rfmValueNames?.map((item) => item.name.trim()) ?? []
      if (!names.length || names.some((name) => !name) || new Set(names).size !== names.length) {
        message.error('RFM 标签值名称不能为空且不可重复')
        return false
      }
    }
    if (draft.value.type === 'import') {
      const importFields = draft.value.rule.importFields ?? []
      if (!draft.value.rule.dataSource?.trim() || !importFields.length) {
        message.error('导入标签需要选择数据源并配置待创建字段')
        return false
      }
      if (importFields.some((field) => !field.sourceField.trim() || !field.tagName.trim() || !field.categoryId)) {
        message.error('导入字段需要配置来源字段、标签名称和路径')
        return false
      }
      if (new Set(importFields.map((field) => field.tagName.trim())).size !== importFields.length) {
        message.error('导入标签名称不可重复')
        return false
      }
    }
    if (draft.value.type === 'manual' && !uploadResult.value) {
      message.error('人工录入标签需要先校验上传文件')
      return false
    }
    if (!draft.value.rule.summary && draft.value.type !== 'model') {
      message.error('请至少配置一条标签规则')
      return false
    }
  }
  if (currentStep.value === 3 && !validateIntervals()) {
    return false
  }
  return true
}

const nextStep = (): void => {
  if (!validateStep()) return
  currentStep.value = Math.min(currentStep.value + 1, wizardSteps.length)
}

const prevStep = (): void => {
  currentStep.value = Math.max(currentStep.value - 1, 1)
}

const estimateDraft = async (): Promise<void> => {
  if (!validateStep()) return
  try {
    estimateResult.value = await tagService.estimateTag(draft.value)
    estimateSnapshot.value = buildEstimateSignature()
    currentStep.value = Math.max(currentStep.value, 4)
    message.success('预估完成')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '预估失败，请检查规则配置或稍后重试')
  }
}

const submitDraft = async (saveAsDraft = false): Promise<void> => {
  if (saveAsDraft) {
    const current = currentStep.value
    currentStep.value = 1
    const valid = validateStep()
    currentStep.value = current
    if (!valid) return
  } else if (!validateStep()) return
  if (!saveAsDraft && !estimateResult.value) {
    message.error('请先完成预估数量，规则或展示配置变更后需要重新预估')
    currentStep.value = 4
    return
  }
  actionLoading.value = true
  try {
    const payload = { ...draft.value, saveAsDraft }
    const tag = isEditing.value ? await tagService.updateTag(currentTagId.value, payload) : await tagService.createTag(payload)
    message.success(saveAsDraft ? '草稿已保存' : '标签已创建')
    if (!isEditing.value && draft.value.type === 'import' && !saveAsDraft) {
      notice.value = `导入标签已按 ${draft.value.rule.importFields?.length ?? 0} 个字段批量创建，当前进入第一个标签详情。`
    }
    currentStep.value = 5
    void router.push(`/user-insight/tags/${tag.id}`)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '保存失败')
  } finally {
    actionLoading.value = false
  }
}

const showBulkResult = (result: TagBulkResult, successText: string): void => {
  if (result.failures.length) {
    message.warning(`${successText}，成功 ${result.successIds.length} 个，失败 ${result.failures.length} 个`)
    notice.value = result.failures.map((item) => `${item.tagId}: ${item.reason}`).join('；')
    return
  }
  message.success(`${successText}，成功 ${result.successIds.length} 个`)
  notice.value = ''
}

const openBulkRenameModal = (): void => {
  bulkRenameRows.value = selectedTags.value.map((item) => ({
    tagId: item.id,
    oldName: item.name,
    newName: `${item.name}_批量更新`,
  }))
  bulkRenameModalVisible.value = true
}

const runBulkRename = async (): Promise<void> => {
  const result = await tagService.bulkRename(bulkRenameRows.value.map((item) => ({ tagId: item.tagId, name: item.newName })))
  showBulkResult(result, '批量重命名已保存')
  bulkRenameModalVisible.value = false
  await loadTags()
}

const openBulkMetadataModal = (): void => {
  bulkMetadataDraft.value = { 'meta-sensitive': '内部' }
  bulkMetadataModalVisible.value = true
}

const runBulkMetadata = async (): Promise<void> => {
  const result = await tagService.bulkUpdateMetadata(selectedTagIds.value, bulkMetadataDraft.value)
  showBulkResult(result, '批量修改元信息完成')
  bulkMetadataModalVisible.value = false
  await loadTags()
}

const runBulkVisible = async (visible: boolean): Promise<void> => {
  const result = await tagService.setTagsVisible(selectedTagIds.value, visible)
  showBulkResult(result, visible ? '批量显示完成' : '批量隐藏完成')
  await loadTags()
}

const runBulkSync = async (): Promise<void> => {
  const result = await tagService.syncTagsToProject(selectedTagIds.value, syncProjectId.value)
  showBulkResult(result, '同步至其他项目完成')
  syncModalVisible.value = false
}

const openSyncModal = (): void => {
  syncProjectId.value = 'project-growth'
  syncModalVisible.value = true
}

const saveCustomView = (): void => {
  const name = customViewName.value.trim()
  if (!name) {
    message.warning('请输入视图名称')
    return
  }
  const id = `view-${Date.now()}`
  savedViews.value.push({
    id,
    name,
    view: managerView.value,
    pageSize: pageSize.value,
    filters: {
      keyword: searchKeyword.value,
      categoryId: selectedCategoryId.value,
      creator: selectedCreator.value,
      types: [...selectedTypes.value],
      valueTypes: [...selectedValueTypes.value],
      statuses: managerStatus.value === 'all' ? undefined : [managerStatus.value],
      runStatuses: [...selectedRunStatuses.value],
      metadata: { ...metadataFilters.value },
    },
  })
  managerView.value = 'custom'
  customViewModalVisible.value = false
  message.success('自定义视图已保存')
}

const applyCustomView = (viewId: EntityId): void => {
  const view = savedViews.value.find((item) => item.id === viewId)
  if (!view) return
  managerView.value = view.view
  pageSize.value = view.pageSize
  searchKeyword.value = view.filters.keyword ?? ''
  selectedCategoryId.value = view.filters.categoryId ?? 'cat-root'
  selectedCreator.value = view.filters.creator ?? 'all'
  selectedTypes.value = [...(view.filters.types ?? [])]
  selectedValueTypes.value = [...(view.filters.valueTypes ?? [])]
  selectedRunStatuses.value = [...(view.filters.runStatuses ?? [])]
  managerStatus.value = view.filters.statuses?.[0] ?? 'all'
  metadataFilters.value = { ...(view.filters.metadata ?? {}) }
}

const resetWorkbench = (): void => {
  searchKeyword.value = ''
  selectedCategoryId.value = 'cat-root'
  managerStatus.value = 'all'
  selectedTypes.value = []
  selectedValueTypes.value = []
  selectedRunStatuses.value = []
  selectedCreator.value = 'all'
  metadataFilters.value = {}
  managerView.value = 'ops'
  void loadTags()
}

const downloadText = (fileName: string, content: string): void => {
  const blob = new Blob([`\ufeff${content}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

const exportCsv = async (): Promise<void> => {
  const csv = await tagService.exportTaskCsv()
  downloadText('tag-tasks.csv', csv)
  notice.value = `已生成 CSV：${csv.split('\n').length - 1} 条任务明细。`
}

const downloadManualTemplate = (): void => {
  downloadText('manual-tag-template.csv', 'user_id,tag_value\nu_10001,高意向\nu_10002,中意向')
  message.success('人工录入模板已下载')
}

const downloadUploadErrors = async (): Promise<void> => {
  if (!uploadResult.value) return
  const csv = await tagService.exportUploadErrorCsv(uploadResult.value)
  downloadText('manual-tag-upload-errors.csv', csv)
  message.success('失败明细已下载')
}

watch([searchKeyword, selectedCategoryId, managerStatus, selectedTypes, selectedValueTypes, selectedRunStatuses, selectedCreator], () => {
  pageIndex.value = 1
  if (['home', 'manage'].includes(currentPage.value)) scheduleLoadTags()
})

watch(
  () => JSON.stringify(metadataFilters.value),
  () => {
    pageIndex.value = 1
    if (['home', 'manage'].includes(currentPage.value)) scheduleLoadTags()
  },
)

watch(pageSize, () => {
  pageIndex.value = 1
})

watch(
  [managerView, pageSize, savedViews],
  () => {
    persistWorkbenchPreference()
  },
  { deep: true },
)

watch(
  buildEstimateSignature,
  (signature) => {
    if (estimateResult.value && estimateSnapshot.value && signature !== estimateSnapshot.value) {
      markDraftChanged()
    }
  },
)

watch(
  () => route.fullPath,
  async () => {
    await refreshCurrentPage()
  },
)

watch(
  () => draft.value.frequency.unit,
  (unit) => {
    if (unit !== 'realtime' && draft.value.ttl.strategy === 'custom') {
      draft.value.ttl.unit = unit
    }
  },
)

watch(
  () => draft.value.valueType,
  (valueType) => {
    draft.value.valueSaveMode = valueType.startsWith('multi') ? 'multi' : 'single'
    if (draft.value.type === 'manual' && valueType.startsWith('multi')) {
      draft.value.rule.manualDelimiter ??= ','
    }
    if (draft.value.type === 'priority') {
      draft.value.rule.selectedFields = (draft.value.rule.selectedFields ?? []).filter((field) => field.valueType === valueType)
    }
  },
)

watch(
  () => draft.value.type,
  (type) => {
    if (type === 'preference') {
      draft.value.computeType = 'offline'
    }
    ensureDraftRuleDefaults()
  },
)

onMounted(async () => {
  await refreshCurrentPage()
})
</script>

<template>
  <section class="tag-system-page">
    <div class="page-heading">
      <div>
        <p class="eyebrow">用户洞察</p>
        <h1>标签体系</h1>
        <p>基于属性、行为、SQL、模型和人工数据构建可运营、可分析、可授权的用户标签。</p>
      </div>
      <n-space>
        <n-button @click="refreshCurrentPage">刷新</n-button>
        <n-dropdown :options="createMenuOptions" trigger="click" @select="handleCreateSelect">
          <n-button type="primary" :disabled="!canCreate">新建标签</n-button>
        </n-dropdown>
      </n-space>
    </div>

    <div class="module-tabs">
      <button
        v-for="tab in pageTabs"
        :key="tab.page"
        :class="{ active: currentPage === tab.page }"
        type="button"
        @click="navigateTab(tab.path)"
      >
        {{ tab.label }}
      </button>
    </div>

    <n-alert v-if="notice" class="notice" type="warning" closable @close="notice = ''">{{ notice }}</n-alert>

    <n-spin :show="loading">
      <template v-if="currentPage === 'home'">
        <n-empty v-if="!canViewTagSystem" description="暂无权限访问标签体系，请联系项目管理员开通权限" />
        <div v-else class="tag-workbench-layout">
          <aside class="filter-panel">
	            <div class="panel-title">
	              <span>标签筛选</span>
	              <n-button v-if="tagPermissionSet?.editTagTree" size="small" secondary @click="openCategoryModal('create_child', 'cat-root')">新建分类</n-button>
	            </div>
            <div class="filter-section">
              <label>标签目录</label>
              <div
                v-for="category in flattenCategories"
                :key="category.id"
                class="tree-row"
                :class="{ selected: selectedCategoryId === category.id, system: category.system }"
                :style="{ paddingLeft: `${(category.level - 1) * 14 + 8}px` }"
                :draggable="category.canEdit && !category.system"
                @click="selectedCategoryId = category.id"
                @dragstart="beginDragCategory(category.id)"
                @dragover.prevent
                @drop="dropOnCategory(category)"
              >
                <span class="tree-name">{{ category.name }}</span>
                <n-tag size="small" :bordered="false">{{ category.tagCount }}</n-tag>
	                <span v-if="category.canEdit && tagPermissionSet?.editTagTree" class="tree-actions">
                  <button type="button" @click.stop="openCategoryModal('create_sibling', category.id)">同级</button>
                  <button type="button" @click.stop="openCategoryModal('create_child', category.id)">子级</button>
                  <button type="button" @click.stop="openCategoryModal('rename', category.id)">重命名</button>
                  <button type="button" @click.stop="submitDeleteCategory(category.id)">删除</button>
                </span>
              </div>
            </div>
            <n-form label-placement="top">
              <n-form-item label="标签名称搜索">
                <n-input v-model:value="searchKeyword" clearable placeholder="按标签名称模糊搜索" />
              </n-form-item>
	              <n-form-item label="上下架状态">
	                <n-select v-model:value="managerStatus" :options="statusOptions" />
	              </n-form-item>
	              <n-form-item label="创建方式">
	                <n-select v-model:value="selectedTypes" :options="typeOptions" multiple clearable placeholder="全部创建方式" />
	              </n-form-item>
	              <n-form-item label="值类型">
	                <n-select v-model:value="selectedValueTypes" :options="valueTypeOptions" multiple clearable placeholder="全部值类型" />
	              </n-form-item>
	              <n-form-item label="运行状态">
	                <n-select v-model:value="selectedRunStatuses" :options="runStatusOptions" multiple clearable placeholder="全部运行状态" />
	              </n-form-item>
	              <n-form-item label="创建人">
	                <n-select v-model:value="selectedCreator" :options="creatorOptions" filterable />
	              </n-form-item>
	              <n-form-item v-for="field in quickMetadataFields" :key="field.id" :label="field.name">
	                <n-select
	                  :value="metadataFilterValue(field)"
	                  :options="field.enumValues.map((item) => ({ label: item, value: item }))"
	                  clearable
	                  :multiple="field.dataType === 'multi_select'"
	                  @update:value="(value) => setMetadataFilterValue(field.id, value)"
	                />
	              </n-form-item>
            </n-form>
          </aside>

          <main class="content-panel">
            <div class="toolbar">
              <div class="toolbar-left">
                <n-select
                  v-model:value="managerView"
                  :options="[
                    { label: '运维视图', value: 'ops' },
                    { label: '运营视图', value: 'operation' },
                    { label: '自定义视图', value: 'custom' },
                  ]"
                />
	                <n-select
	                  v-model:value="pageSize"
                  :options="[
                    { label: '20 条/页', value: 20 },
                    { label: '50 条/页', value: 50 },
                    { label: '100 条/页', value: 100 },
	                  ]"
	                />
	                <n-select
	                  v-if="savedViews.length"
	                  placeholder="选择自定义视图"
	                  :options="savedViews.map((view) => ({ label: view.name, value: view.id }))"
	                  @update:value="(value) => applyCustomView(String(value))"
	                />
	              </div>
	              <n-space>
	                <n-button @click="navigateTab('/user-insight/tags/templates')">标签模板</n-button>
	                <n-button @click="exportCsv">下载</n-button>
	                <n-button @click="customViewModalVisible = true">保存为自定义视图</n-button>
	                <n-button @click="advanceRuns">刷新任务状态</n-button>
	                <n-button @click="resetWorkbench">重置</n-button>
	                <n-button circle title="刷新" @click="loadTags">↻</n-button>
	              </n-space>
            </div>
            <n-alert v-if="searchKeyword" type="info" class="soft-alert">
              搜索结果不受左侧目录限制；清空搜索词后恢复当前目录列表。
            </n-alert>

            <div v-if="selectedTagIds.length" class="batch-bar">
              <strong>已选择 {{ selectedTagIds.length }} 个标签</strong>
              <n-button size="small" @click="openShelfModal(selectedTagIds, 'online')">批量上架</n-button>
              <n-button size="small" @click="openShelfModal(selectedTagIds, 'offline')">批量下架</n-button>
              <n-button size="small" @click="openMoveModal(selectedTagIds)">移动分组</n-button>
	              <n-button size="small" @click="openBulkRenameModal">重命名</n-button>
	              <n-button size="small" @click="openBatchAuthModal">批量授权</n-button>
	              <n-button size="small" @click="openBulkMetadataModal">修改元信息</n-button>
	              <n-button size="small" @click="openRunModal(selectedTagIds)">批量运行</n-button>
	              <n-button size="small" @click="runBulkVisible(false)">批量隐藏</n-button>
	              <n-button size="small" @click="runBulkVisible(true)">批量显示</n-button>
	              <n-button size="small" @click="openSyncModal">同步至其他项目</n-button>
            </div>

            <div v-if="tags.length" class="table-wrap">
              <table class="tag-table">
                <thead>
                  <tr>
                    <th><input type="checkbox" :checked="selectedTagIds.length === tags.length && tags.length > 0" @change="selectedTagIds = selectedTagIds.length === tags.length ? [] : tags.map((item) => item.id)" /></th>
                    <th>标签名称</th>
                    <th>标签 ID</th>
                    <th>创建方式</th>
                    <th>值类型</th>
                    <th>上下架状态</th>
                    <th>运行状态</th>
                    <th>更新方式</th>
                    <th v-if="managerView !== 'operation'">执行频率</th>
                    <th>最新数据时间</th>
                    <th v-if="managerView !== 'operation'">资源管理员</th>
                    <th>最新耗时</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="tag in pagedTags" :key="tag.id">
                    <td><input v-model="selectedTagIds" type="checkbox" :value="tag.id" /></td>
                    <td><button class="link-button" type="button" @click="openDetail(tag.id)">{{ tag.name }}</button></td>
                    <td>{{ tag.id }}</td>
                    <td>{{ tagTypeLabels[tag.type] }}</td>
                    <td>{{ tagValueTypeLabels[tag.valueType] }}</td>
                    <td><n-tag size="small" :type="statusTagType(tag.status)">{{ tagStatusLabels[tag.status] }}</n-tag></td>
                    <td><n-tag size="small" :type="runStatusTagType(runStatusOfTag(tag))">{{ tagRunStatusLabels[runStatusOfTag(tag)] }}</n-tag></td>
                    <td>{{ tag.computeType === 'realtime' ? '实时更新' : tag.updateType === 'manual' ? '手动更新' : '定时更新' }}</td>
                    <td v-if="managerView !== 'operation'">{{ tag.frequency.unit === 'day' ? '每天' : tag.frequency.unit === 'week' ? '每周' : tag.frequency.unit === 'month' ? '每月' : '实时' }} {{ tag.frequency.time ?? '' }}</td>
                    <td>{{ tag.latestDataDate ?? '-' }}</td>
                    <td v-if="managerView !== 'operation'">{{ tag.resourceAdmins.map((item) => item.name).join('、') }}</td>
                    <td>{{ formatDuration(tag.latestDurationMs) }}</td>
                    <td class="action-cell">
                      <n-dropdown trigger="click" :options="tagActionOptions(tag)" @select="(key) => handleTagAction(key, tag)">
                        <n-button size="small" secondary>更多</n-button>
                      </n-dropdown>
                    </td>
                  </tr>
                </tbody>
	              </table>
	              <div class="pagination-bar">
	                <span>共 {{ tags.length }} 条，当前第 {{ pageIndex }} / {{ totalPages }} 页</span>
	                <n-space>
	                  <n-button size="small" :disabled="pageIndex <= 1" @click="pageIndex -= 1">上一页</n-button>
	                  <n-button size="small" :disabled="pageIndex >= totalPages" @click="pageIndex += 1">下一页</n-button>
	                </n-space>
	              </div>
	            </div>
            <n-empty v-else :description="searchKeyword ? '未找到相关标签，请修改关键词' : selectedCategoryId === 'cat-root' ? '暂无标签，请点击新建标签开始构建标签体系' : '当前分类暂无标签'" />
          </main>
        </div>
      </template>

      <template v-else-if="currentPage === 'templates'">
        <n-card>
          <div class="toolbar">
            <div>
              <h2>标签模板</h2>
              <p>启用行业预置标签模板，基于已完成映射的数据快速生成标签。</p>
            </div>
            <n-space>
              <n-button @click="navigateTab('/data-fusion/connections')">配置数据连接</n-button>
              <n-button @click="navigateTab('/data-fusion/id-mapping')">配置 ID 图谱</n-button>
              <n-button type="primary" :disabled="checkedTemplateIds.length === 0" @click="enableTemplates">确定启用</n-button>
            </n-space>
          </div>
          <div class="template-grid">
            <label v-for="template in templates" :key="template.id" class="template-item" :class="{ disabled: template.status === 'created' }">
              <input v-model="checkedTemplateIds" type="checkbox" :value="template.id" :disabled="template.status === 'created'" />
              <span>
                <strong>{{ template.name }}</strong>
                <n-tag v-if="template.lifecycleTemplate" size="small" type="info">生命周期模板</n-tag>
                <n-tag v-if="template.status === 'created'" size="small" type="success">已创建</n-tag>
                <small>{{ template.categoryPath }}</small>
                <em>{{ template.ruleSummary }}</em>
                <span>{{ template.description }}</span>
              </span>
            </label>
          </div>
        </n-card>
      </template>

      <template v-else-if="currentPage === 'metadata'">
        <n-card>
          <div class="toolbar">
            <div>
              <h2>标签元信息管理</h2>
              <p>补充业务负责人、口径来源、敏感等级等描述性字段，并同步到标签创建、管理列表和下游快捷筛选。</p>
            </div>
	            <n-button type="primary" @click="() => openMetadataModal()">新建标签元信息</n-button>
          </div>
          <div class="table-wrap">
            <table class="tag-table">
              <thead>
                <tr>
                  <th>元信息名称</th>
                  <th>数据类型</th>
                  <th>是否必填</th>
                  <th>枚举值</th>
                  <th>快捷筛选</th>
                  <th>创建人</th>
                  <th>创建时间</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="field in metadataFields" :key="field.id">
                  <td>{{ field.name }}</td>
                  <td>{{ field.dataType === 'text' ? '文本' : field.dataType === 'single_select' ? '单选' : '多选' }}</td>
                  <td>{{ field.required ? '是' : '否' }}</td>
                  <td>{{ field.enumValues.join('、') || '-' }}</td>
                  <td><n-tag size="small" :type="field.quickFilterEnabled ? 'success' : 'default'">{{ field.quickFilterEnabled ? '是' : '否' }}</n-tag></td>
                  <td>{{ field.createdBy }}</td>
                  <td>{{ formatTime(field.createdAt) }}</td>
                  <td>{{ field.status === 'enabled' ? '启用' : '停用' }}</td>
	                  <td>
	                    <n-space size="small">
	                      <n-button text size="small" @click="openMetadataModal(field)">编辑</n-button>
	                      <n-button text size="small" type="error" @click="deleteMetadata(field.id)">删除</n-button>
	                    </n-space>
	                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </n-card>
      </template>

      <template v-else-if="currentPage === 'detail'">
        <n-empty v-if="!currentDetail" description="暂无权限访问该页面，请联系管理员开通权限" />
        <div v-else class="detail-layout">
          <n-card>
            <div class="detail-heading">
              <div>
                <h2>{{ currentDetail.name }}</h2>
                <n-space>
                  <n-tag :type="statusTagType(currentDetail.status)">{{ tagStatusLabels[currentDetail.status] }}</n-tag>
                  <n-tag>{{ tagTypeLabels[currentDetail.type] }}</n-tag>
                  <n-tag>{{ tagValueTypeLabels[currentDetail.valueType] }}</n-tag>
                  <n-tag v-if="currentDetail.fromTemplate" type="info">系统模板</n-tag>
                </n-space>
              </div>
              <n-space>
                <n-button @click="toggleFavorite(currentDetail.id)">{{ currentDetail.favorite ? '取消收藏' : '收藏' }}</n-button>
                <n-button v-if="currentDetail.permissions.canEdit" @click="openEdit(currentDetail.id)">编辑</n-button>
                <n-button v-if="currentDetail.permissions.canManage" @click="openAuthModal(currentDetail)">授权</n-button>
                <n-button v-if="currentDetail.status !== 'online'" type="primary" @click="openShelfModal([currentDetail.id], 'online')">上架</n-button>
                <n-button v-if="currentDetail.status === 'online'" @click="openShelfModal([currentDetail.id], 'offline')">下架</n-button>
                <n-button v-if="currentDetail.type === 'lifecycle'" @click="navigateTab('/data-insight/ltv?tagId=' + currentDetail.id)">生命周期分析</n-button>
                <n-button v-if="currentDetail.permissions.canManage" type="error" @click="openDeleteModal(currentDetail)">删除</n-button>
              </n-space>
            </div>
            <n-descriptions :column="4" bordered size="small">
              <n-descriptions-item label="创建人">{{ currentDetail.createdBy.name }}</n-descriptions-item>
              <n-descriptions-item label="更新时间">{{ formatTime(currentDetail.updatedAt) }}</n-descriptions-item>
              <n-descriptions-item label="更新方式">{{ currentDetail.computeType === 'realtime' ? '实时更新' : currentDetail.updateType === 'manual' ? '手动更新' : '定时更新' }}</n-descriptions-item>
              <n-descriptions-item label="更新频率">{{ currentDetail.frequency.unit === 'day' ? '每天' : currentDetail.frequency.unit === 'week' ? '每周' : currentDetail.frequency.unit === 'month' ? '每月' : '实时' }} {{ currentDetail.frequency.time ?? '' }}</n-descriptions-item>
              <n-descriptions-item label="TTL">{{ currentDetail.ttl.strategy === 'system' ? '与系统一致' : `${currentDetail.ttl.value} ${currentDetail.ttl.unit}` }}</n-descriptions-item>
              <n-descriptions-item label="在线服务">{{ currentDetail.onlineServiceEnabled ? '开' : '关' }}</n-descriptions-item>
              <n-descriptions-item label="目录">{{ categoryName(currentDetail.categoryId) }}</n-descriptions-item>
              <n-descriptions-item label="资源管理员">{{ currentDetail.resourceAdmins.map((item) => item.name).join('、') }}</n-descriptions-item>
            </n-descriptions>
            <p class="detail-desc">{{ currentDetail.description }}</p>
          </n-card>

          <n-card>
            <n-tabs v-model:value="detailActiveTab" type="line" animated>
              <n-tab-pane name="distribution" tab="标签分布">
                <div class="metric-row">
                  <div><strong>{{ detailDistributions.reduce((sum, item) => sum + item.count, 0).toLocaleString() }}</strong><span>覆盖总人数</span></div>
                  <div><strong>62.4%</strong><span>有效覆盖率</span></div>
                  <div><strong>{{ currentDetail.latestDataDate ?? '-' }}</strong><span>数据时间</span></div>
                  <div><strong>{{ detailDistributions.length }}</strong><span>标签值数量</span></div>
                </div>
                <table class="tag-table compact">
                  <thead><tr><th>标签值</th><th>人数</th><th>占比</th><th>分布</th><th>操作</th></tr></thead>
                  <tbody>
                    <tr v-for="item in detailDistributions" :key="item.value">
                      <td>{{ item.value }}</td>
                      <td>{{ item.count.toLocaleString() }}</td>
                      <td>{{ item.rate }}%</td>
                      <td><n-progress type="line" :percentage="Math.round(item.rate)" :show-indicator="false" /></td>
                      <td>
                        <n-space size="small">
	                          <n-button text size="small" @click="openSegmentModal(item.value)">存为分群</n-button>
                          <n-button text size="small" @click="navigateTab('/user-insight/profiles?tagId=' + currentDetail.id + '&value=' + item.value)">查看个体明细</n-button>
                        </n-space>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </n-tab-pane>
	              <n-tab-pane name="history" tab="标签历史详情">
	                <div class="toolbar">
	                  <n-select v-model:value="historyGrain" :options="[{ label: '天', value: 'day' }, { label: '周', value: 'week' }, { label: '月', value: 'month' }]" />
	                  <n-input v-model:value="historyRange" readonly />
	                  <n-button @click="refreshHistory">刷新趋势</n-button>
	                </div>
                <table class="tag-table compact">
                  <thead><tr><th>日期</th><th>覆盖总数</th><th>标签值趋势</th></tr></thead>
                  <tbody>
                    <tr v-for="point in detailHistory" :key="point.date">
                      <td>{{ point.date }}</td>
                      <td>{{ point.total.toLocaleString() }}</td>
                      <td>{{ point.values.map((item) => `${item.value} ${item.count.toLocaleString()}`).join(' / ') }}</td>
                    </tr>
                  </tbody>
                </table>
              </n-tab-pane>
              <n-tab-pane name="rule" tab="创建规则">
                <n-alert v-if="currentDetail.computeType === 'realtime'" type="warning">规则修改将于次日生效；不符合新规则的用户将在次日离线校正任务中移除。</n-alert>
                <div class="rule-summary">
                  <h3>{{ tagTypeLabels[currentDetail.type] }}规则</h3>
                  <p>{{ currentDetail.rule.summary }}</p>
                  <pre v-if="currentDetail.rule.sql">{{ currentDetail.rule.sql }}</pre>
	                  <div v-if="currentDetail.rule.values?.length" class="rule-value-list">
                    <div v-for="value in currentDetail.rule.values" :key="value.id" class="rule-value-card">
                      <strong>{{ value.name }}</strong>
                      <span>满足：{{ summarizeRuleGroup(value.include) }}</span>
                      <span>排除：{{ summarizeRuleGroup(value.exclude) }}</span>
	                    </div>
	                  </div>
	                  <table class="tag-table compact">
	                    <thead><tr><th>版本</th><th>创建人</th><th>创建时间</th><th>状态</th><th>操作</th></tr></thead>
	                    <tbody>
	                      <tr v-for="version in detailRuleVersions" :key="version.id">
	                        <td>V{{ version.versionNo }}</td>
	                        <td>{{ version.createdBy.name }}</td>
	                        <td>{{ formatTime(version.createdAt) }}</td>
	                        <td><n-tag size="small" :type="version.isCurrent ? 'success' : 'default'">{{ version.isCurrent ? '当前版本' : '历史版本' }}</n-tag></td>
	                        <td><n-button text size="small" :disabled="version.isCurrent" @click="restoreRuleVersion(version)">恢复并重跑</n-button></td>
	                      </tr>
	                    </tbody>
	                  </table>
	                </div>
	              </n-tab-pane>
              <n-tab-pane name="runs" tab="运行记录">
	                <div class="toolbar">
	                  <n-button @click="() => loadDetail()">刷新</n-button>
	                  <n-button @click="advanceRuns">推进运行状态</n-button>
	                  <n-button @click="openRunModal([currentDetail.id])">批量运行</n-button>
	                </div>
                <table class="tag-table compact">
                  <thead><tr><th>运行日期</th><th>分区日期</th><th>状态</th><th>开始时间</th><th>结束时间</th><th>耗时</th><th>触发方式</th><th>运行人</th><th>失败原因</th><th>操作</th></tr></thead>
                  <tbody>
                    <tr v-for="run in detailRuns" :key="run.id">
                      <td>{{ run.runDate }}</td>
                      <td>{{ run.partitionDate }}</td>
                      <td><n-tag size="small" :type="runStatusTagType(run.status)">{{ tagRunStatusLabels[run.status] }}</n-tag></td>
                      <td>{{ formatTime(run.startedAt) }}</td>
                      <td>{{ formatTime(run.endedAt) }}</td>
                      <td>{{ formatDuration(run.durationMs) }}</td>
                      <td>{{ run.triggerType }}</td>
                      <td>{{ run.operator }}</td>
                      <td>{{ run.errorMessage ?? '-' }}</td>
                      <td>
                        <n-space size="small">
                          <n-button text size="small" @click="rerun(run.id)">重新运行</n-button>
                          <n-button v-if="['running', 'waiting'].includes(run.status)" text size="small" @click="stopRun(run.id)">停止运行</n-button>
	                          <n-button text size="small" @click="openRunLogModal(run)">查看日志</n-button>
	                          <n-button v-if="run.status === 'failed'" text size="small" @click="openRunLogModal(run)">运行视图</n-button>
                        </n-space>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </n-tab-pane>
              <n-tab-pane name="permission" tab="授权">
                <n-button type="primary" @click="openAuthModal(currentDetail)">编辑授权</n-button>
                <table class="tag-table compact">
                  <thead><tr><th>授权对象</th><th>类型</th><th>权限</th><th>授权人</th><th>授权时间</th></tr></thead>
                  <tbody>
                    <tr v-for="row in detailPermissions" :key="row.id">
                      <td>{{ row.principalName }}</td>
                      <td>{{ row.principalType === 'user' ? '用户' : '用户组' }}</td>
                      <td>{{ row.permission === 'view' ? '查看' : row.permission === 'edit' ? '编辑' : '管理' }}</td>
                      <td>{{ row.grantedBy }}</td>
                      <td>{{ formatTime(row.grantedAt) }}</td>
                    </tr>
                  </tbody>
                </table>
              </n-tab-pane>
              <n-tab-pane name="lineage" tab="标签血缘">
	                <div class="toolbar">
	                  <n-space>
	                    <n-button :type="lineageMode === 'graph' ? 'primary' : 'default'" @click="lineageMode = 'graph'">图谱视图</n-button>
	                    <n-button :type="lineageMode === 'list' ? 'primary' : 'default'" @click="lineageMode = 'list'">列表视图</n-button>
	                    <n-select
	                      v-model:value="lineageDirection"
	                      :options="[
	                        { label: '全部血缘', value: 'all' },
	                        { label: '仅上游', value: 'upstream' },
	                        { label: '仅下游', value: 'downstream' },
	                      ]"
	                    />
	                  </n-space>
	                  <n-button @click="downloadLineage">下载</n-button>
	                </div>
	                <div v-if="lineageMode === 'graph'" class="lineage-list graph">
	                  <div v-for="node in detailLineage" :key="node.id" class="lineage-node" :class="node.direction">
	                    <n-tag>{{ node.direction === 'upstream' ? '上游' : '下游' }}</n-tag>
	                    <strong>{{ node.name }}</strong>
	                    <span>{{ node.assetType }}</span>
	                    <n-tag size="small" :type="node.status === 'normal' ? 'success' : 'warning'">{{ node.status === 'normal' ? '正常' : '等待恢复' }}</n-tag>
	                  </div>
	                </div>
	                <table v-else class="tag-table compact">
	                  <thead><tr><th>资产名称</th><th>资产类型</th><th>方向</th><th>层级</th><th>状态</th></tr></thead>
	                  <tbody>
	                    <tr v-for="node in detailLineage" :key="node.id">
	                      <td>{{ node.name }}</td>
	                      <td>{{ node.assetType }}</td>
	                      <td>{{ node.direction === 'upstream' ? '上游' : '下游' }}</td>
	                      <td>{{ node.level }}</td>
	                      <td><n-tag size="small" :type="node.status === 'normal' ? 'success' : 'warning'">{{ node.status === 'normal' ? '正常' : '等待恢复' }}</n-tag></td>
	                    </tr>
	                  </tbody>
	                </table>
              </n-tab-pane>
              <n-tab-pane name="assessment" tab="价值评估">
                <div class="metric-row">
                  <div><strong>{{ detailBundle?.assessment.lastUsedDays }}</strong><span>最后一次使用距今天数</span></div>
                  <div><strong>{{ detailBundle?.assessment.internalUsageCount }}</strong><span>内部使用总次数</span></div>
                  <div><strong>{{ detailBundle?.assessment.internalReferenceCount }}</strong><span>内部引用次数</span></div>
                  <div><strong>{{ detailBundle?.assessment.apiCallCount }}</strong><span>API 调用次数</span></div>
                  <div><strong>{{ detailBundle?.assessment.p95LatencyMs }} ms</strong><span>P95 查询耗时</span></div>
                  <div><strong>{{ detailBundle?.assessment.errorRate }}%</strong><span>错误率</span></div>
                </div>
              </n-tab-pane>
              <n-tab-pane name="logs" tab="历史操作记录">
                <table class="tag-table compact">
                  <thead><tr><th>操作时间</th><th>操作人员</th><th>操作点</th><th>操作内容</th><th>变更对比</th></tr></thead>
                  <tbody>
                    <tr v-for="log in detailLogs" :key="log.id">
                      <td>{{ formatTime(log.createdAt) }}</td>
                      <td>{{ log.operator }}</td>
                      <td>{{ log.actionType }}</td>
                      <td>{{ log.content }}</td>
	                      <td><n-button text size="small" @click="openOperationLogModal(log)">变更前后对比</n-button></td>
                    </tr>
                  </tbody>
                </table>
              </n-tab-pane>
            </n-tabs>
          </n-card>
        </div>
      </template>

      <template v-else-if="currentPage === 'create' || currentPage === 'edit'">
        <n-card>
          <div class="toolbar">
            <div>
              <h2>{{ isEditing ? '编辑标签' : `新建${tagTypeLabels[draft.type]}` }}</h2>
              <p>采用统一步骤式表单，保留 PRD 中的校验、预估、保存草稿和创建完成逻辑。</p>
            </div>
            <n-button @click="navigateTab('/user-insight/tags')">返回标签体系</n-button>
          </div>
          <n-steps :current="currentStep" class="wizard-steps">
            <n-step v-for="step in wizardSteps" :key="step" :title="step" />
          </n-steps>

          <section v-if="currentStep === 1" class="wizard-section">
            <n-form label-placement="top">
              <n-grid :cols="2" :x-gap="16">
                <n-gi>
                  <n-form-item label="标签名称">
                    <n-input v-model:value="draft.name" placeholder="1-100 字符，同项目同主体下不可重复" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="路径">
                    <n-select v-model:value="draft.categoryId" :options="categoryOptions" filterable />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="标签值类型">
                    <n-select v-model:value="draft.valueType" :options="valueTypeOptions" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="计算类型">
                    <n-radio-group v-model:value="draft.computeType">
                      <n-radio value="offline">离线计算</n-radio>
                      <n-radio v-if="['rule', 'statistic', 'first_last', 'priority', 'calculation', 'lifecycle', 'sql'].includes(draft.type)" value="realtime">实时计算</n-radio>
                    </n-radio-group>
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="更新类型">
                    <n-radio-group v-model:value="draft.updateType" :disabled="draft.computeType === 'realtime'">
                      <n-radio value="scheduled">定时更新</n-radio>
                      <n-radio value="manual">手动更新</n-radio>
                    </n-radio-group>
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="标签更新取值逻辑">
                    <n-radio-group v-model:value="draft.emptyValueStrategy">
                      <n-radio value="empty">{{ emptyValueStrategyLabels.empty }}</n-radio>
                      <n-radio value="keep_previous">{{ emptyValueStrategyLabels.keep_previous }}</n-radio>
                    </n-radio-group>
                  </n-form-item>
                </n-gi>
                <n-gi v-if="draft.updateType === 'scheduled' && draft.computeType !== 'realtime'">
                  <n-form-item label="执行频率">
                    <div class="inline-fields">
                      <n-select
                        v-model:value="draft.frequency.unit"
                        :options="[
                          { label: '天', value: 'day' },
                          { label: '周', value: 'week' },
                          { label: '月', value: 'month' },
                        ]"
                      />
                      <n-input v-model:value="draft.frequency.time" placeholder="08:00" />
                    </div>
                  </n-form-item>
                </n-gi>
                <n-gi v-if="draft.updateType === 'scheduled' && draft.computeType !== 'realtime'">
                  <n-form-item label="计算结果存储保留策略">
                    <div class="inline-fields">
                      <n-select
                        v-model:value="draft.ttl.strategy"
                        :options="[
                          { label: '与系统一致', value: 'system' },
                          { label: '指定时长', value: 'custom' },
                        ]"
                      />
                      <n-input-number v-if="draft.ttl.strategy === 'custom'" v-model:value="draft.ttl.value" :min="1" />
                      <span v-if="draft.ttl.strategy === 'custom'">{{ draft.frequency.unit === 'day' ? '天' : draft.frequency.unit === 'week' ? '周' : '月' }}</span>
                    </div>
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="标签值保存类型">
                    <n-radio-group v-model:value="draft.valueSaveMode">
                      <n-radio value="single">单值</n-radio>
                      <n-radio value="multi">多值</n-radio>
                    </n-radio-group>
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="在线服务开关">
                    <n-switch v-model:value="draft.onlineServiceEnabled" />
                  </n-form-item>
                </n-gi>
              </n-grid>
              <n-form-item label="描述">
                <n-input v-model:value="draft.description" type="textarea" maxlength="500" show-count />
              </n-form-item>
              <div class="metadata-grid">
                <n-form-item v-for="field in metadataFields" :key="field.id" :label="`${field.name}${field.required ? ' *' : ''}`">
                  <n-input v-if="field.dataType === 'text'" :value="metadataTextValue(field.id)" @update:value="(value) => setMetadataValue(field.id, value)" />
                  <n-select
                    v-else
                    :value="metadataSelectValue(field)"
                    :options="field.enumValues.map((item) => ({ label: item, value: item }))"
                    :multiple="field.dataType === 'multi_select'"
                    clearable
                    @update:value="(value) => setMetadataValue(field.id, value)"
                  />
                </n-form-item>
              </div>
            </n-form>
          </section>

          <section v-else-if="currentStep === 2" class="wizard-section">
            <n-alert v-if="draft.computeType === 'realtime'" type="warning" class="soft-alert">
              实时规则仅支持实时行为数据源，不支持未做过、全局未做过、依次做过、like、正则匹配和 topN。
            </n-alert>
            <n-form label-placement="top">
              <n-form-item label="规则摘要">
                <n-input v-model:value="draft.rule.summary" type="textarea" placeholder="描述本标签规则口径。规则变更后已有预估结果会失效。" @input="markDraftChanged" />
              </n-form-item>

              <TagCreateRuleEditor
                v-model:draft="draft"
                v-model:sql-result="sqlResult"
                v-model:upload-result="uploadResult"
                :category-options="categoryOptions"
                :value-type-options="valueTypeOptions"
                @change="markDraftChanged"
                @open-lineage="sqlLineageModalVisible = true"
                @open-modeling="handleCreateSelect('model')"
              />

            </n-form>
          </section>

          <section v-else-if="currentStep === 3" class="wizard-section">
            <n-grid :cols="2" :x-gap="16">
              <n-gi>
                <n-form-item label="展示方式">
                  <n-radio-group v-model:value="draft.rule.displayMode">
                    <n-radio value="raw">按统计值划分</n-radio>
                    <n-radio value="range">按数值区间划分</n-radio>
                  </n-radio-group>
                </n-form-item>
              </n-gi>
              <n-gi>
                <n-form-item label="在线服务">
                  <n-switch v-model:value="draft.onlineServiceEnabled" />
                </n-form-item>
              </n-gi>
            </n-grid>
            <div v-if="draft.rule.displayMode === 'range'" class="interval-list">
              <div v-for="interval in draft.rule.intervals" :key="interval.id" class="interval-row">
                <n-input v-model:value="interval.name" placeholder="分层名称" />
                <n-input-number v-model:value="interval.min" placeholder="下限" />
                <n-input-number v-model:value="interval.max" placeholder="上限" />
                <n-button type="error" @click="removeInterval(interval.id)">删除</n-button>
              </div>
              <n-button @click="addInterval">增加分层</n-button>
            </div>
            <n-alert type="info">预估结果会在规则或展示配置变更后标记为已失效，需要重新预估。</n-alert>
          </section>

          <section v-else-if="currentStep === 4" class="wizard-section">
            <div class="toolbar">
              <n-button type="primary" @click="estimateDraft">预估数量</n-button>
              <span v-if="estimateResult">预估完成：覆盖率 {{ estimateResult.coverageRate }}%，总人数 {{ estimateResult.total.toLocaleString() }}</span>
            </div>
            <table v-if="estimateResult" class="tag-table compact">
              <thead><tr><th>标签值</th><th>覆盖人数</th><th>占比</th></tr></thead>
              <tbody>
                <tr v-for="item in estimateResult.values" :key="item.value">
                  <td>{{ item.value }}</td>
                  <td>{{ item.count.toLocaleString() }}</td>
                  <td>{{ item.rate }}%</td>
                </tr>
              </tbody>
            </table>
            <n-empty v-else description="请先点击预估数量" />
          </section>

          <section v-else class="wizard-section finish-state">
            <h3>{{ isEditing ? '修改完成' : '创建完成' }}</h3>
            <p>标签定义、规则版本、调度配置、授权默认记录和历史操作记录已写入模拟服务。</p>
          </section>

          <n-divider />
          <div class="wizard-actions">
            <n-button @click="navigateTab('/user-insight/tags')">取消</n-button>
            <n-button v-if="currentStep > 1" @click="prevStep">上一步</n-button>
            <n-button v-if="currentStep < 4" type="primary" @click="nextStep">下一步</n-button>
            <n-button v-if="currentStep >= 2 && currentStep < 5" @click="estimateDraft">预估数量</n-button>
            <n-button v-if="!isEditing" @click="submitDraft(true)">保存草稿</n-button>
            <n-button v-if="currentStep >= 4" type="primary" :loading="actionLoading" @click="submitDraft(false)">{{ isEditing ? '修改完成' : '创建完成' }}</n-button>
          </div>
        </n-card>
      </template>
    </n-spin>

    <n-modal v-model:show="categoryModalVisible" preset="card" class="small-modal" :title="categoryMode === 'rename' ? '重命名分类' : '新建分类'">
      <n-input v-model:value="categoryDraftName" placeholder="请输入分类名称" @keyup.enter="submitCategory" />
      <template #footer>
        <n-space justify="end">
          <n-button @click="categoryModalVisible = false">取消</n-button>
          <n-button type="primary" :loading="actionLoading" @click="submitCategory">确定</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="shelfModalVisible" preset="card" class="small-modal" :title="shelfStatus === 'online' ? '确认上架标签' : '确认下架标签'">
      <p v-if="shelfStatus === 'online'">上架后标签将开始执行更新任务，并可被下游圈选、洞察、资产输出等应用使用。</p>
      <template v-else>
	        <p>下架后该标签将暂停更新，且下游标签、分群、分析、API 调用可能不可用。</p>
	        <p>当前选择 {{ shelfIds.length }} 个标签，若存在下游依赖将同步标记为上游不可用。</p>
	        <div v-if="shelfRisks.length" class="risk-list">
	          <strong>依赖风险</strong>
	          <div v-for="risk in shelfRisks" :key="risk.tagId">
	            {{ risk.tagName }}：{{ risk.message }}
	            <small>{{ risk.resources.map((resource) => resource.name).join('、') }}</small>
	          </div>
	          <small>涉及营销分群、分析看板和 API 服务时，下架后会在血缘中标记为上游不可用。</small>
	        </div>
	        <n-checkbox v-model:checked="shelfAcknowledged">我已知晓下架影响</n-checkbox>
      </template>
      <template #footer>
        <n-space justify="end">
          <n-button @click="shelfModalVisible = false">取消</n-button>
          <n-button type="primary" @click="submitShelf">{{ shelfStatus === 'online' ? '确认上架' : '确认下架' }}</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="deleteModalVisible" preset="card" class="small-modal" title="确认删除标签">
      <p>删除后标签相关元信息将被清除，不可恢复；如下游资源依赖该标签，将导致更新任务中断。</p>
      <n-input v-model:value="deleteConfirmName" :placeholder="`请输入 ${deleteTarget?.name ?? '标签名称'} 确认删除`" />
      <template #footer>
        <n-space justify="end">
          <n-button @click="deleteModalVisible = false">取消</n-button>
          <n-button type="error" @click="submitDeleteTag">确认删除</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="moveModalVisible" preset="card" class="small-modal" title="移动分组">
      <p>确认将标签移动到该分类下吗？</p>
      <n-select v-model:value="moveTargetCategoryId" :options="categoryOptions" />
      <template #footer>
        <n-space justify="end">
          <n-button @click="moveModalVisible = false">取消</n-button>
          <n-button type="primary" @click="submitMove">确认移动</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="runModalVisible" preset="card" class="small-modal" title="手动更新">
      <n-form label-placement="top">
        <n-form-item label="运行日期范围">
          <div class="inline-fields"><n-input v-model:value="runRange.start" /><n-input v-model:value="runRange.end" /></div>
        </n-form-item>
        <n-form-item label="是否覆盖已有结果">
          <n-switch v-model:value="runRange.overwrite" />
        </n-form-item>
        <n-alert type="info">是否保留历史值按标签配置自动展示，不允许在弹窗中修改。</n-alert>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="runModalVisible = false">取消</n-button>
          <n-button type="primary" @click="submitRun">确定</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="serviceModalVisible" preset="card" class="small-modal" title="服务配置">
      <n-form label-placement="top">
        <n-form-item label="在线服务开关">
          <n-switch v-model:value="serviceDraft.enabled" />
        </n-form-item>
        <n-form-item label="QPS 上限">
          <n-input-number v-model:value="serviceDraft.qpsLimit" :min="100" :step="100" />
        </n-form-item>
        <n-form-item label="缓存有效期">
          <div class="inline-fields">
            <n-input-number v-model:value="serviceDraft.cacheTtlSeconds" :min="0" :step="10" />
            <span>秒</span>
          </div>
        </n-form-item>
        <n-alert type="info">开启后支持高 QPS 低延迟在线查询，保存后会记录历史操作。</n-alert>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="serviceModalVisible = false">取消</n-button>
          <n-button type="primary" @click="submitServiceConfig">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="retentionModalVisible" preset="card" class="small-modal" title="设置保留版本数">
      <n-form label-placement="top">
        <n-form-item label="计算结果存储保留策略">
          <n-radio-group v-model:value="retentionDraft.strategy">
            <n-radio value="system">与系统一致</n-radio>
            <n-radio value="custom">指定时长</n-radio>
          </n-radio-group>
        </n-form-item>
        <n-form-item v-if="retentionDraft.strategy === 'custom'" label="保存时长">
          <div class="inline-fields">
            <n-input-number v-model:value="retentionDraft.value" :min="1" />
            <span>{{ retentionDraft.unit === 'week' ? '周' : retentionDraft.unit === 'month' ? '月' : '天' }}</span>
          </div>
        </n-form-item>
        <n-alert type="info">TTL 单位跟随执行频率；超出保留时长的历史分区由清理任务在次日删除。</n-alert>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="retentionModalVisible = false">取消</n-button>
          <n-button type="primary" @click="submitRetentionConfig">保存</n-button>
        </n-space>
      </template>
    </n-modal>

	    <n-modal v-model:show="adminsModalVisible" preset="card" class="small-modal" title="资源管理员">
	      <div v-if="adminsTarget" class="admin-list">
	        <div v-for="admin in adminsTarget.resourceAdmins" :key="admin.id" class="admin-row">
          <strong>{{ admin.name }}</strong>
          <span>{{ admin.department }}</span>
        </div>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button type="primary" @click="adminsModalVisible = false">关闭</n-button>
	        </n-space>
	      </template>
		    </n-modal>

	    <n-modal v-model:show="customViewModalVisible" preset="card" class="small-modal" title="保存自定义视图">
	      <n-form label-placement="top">
	        <n-form-item label="视图名称">
	          <n-input v-model:value="customViewName" placeholder="请输入视图名称" />
	        </n-form-item>
	        <n-alert type="info">将保存当前筛选条件、视图类型和分页偏好。</n-alert>
	      </n-form>
	      <template #footer>
	        <n-space justify="end">
	          <n-button @click="customViewModalVisible = false">取消</n-button>
	          <n-button type="primary" @click="saveCustomView">保存</n-button>
	        </n-space>
	      </template>
	    </n-modal>

	    <n-modal v-model:show="bulkRenameModalVisible" preset="card" class="medium-modal" title="批量重命名">
	      <table class="tag-table compact">
	        <thead><tr><th>原名称</th><th>新名称</th></tr></thead>
	        <tbody>
	          <tr v-for="row in bulkRenameRows" :key="row.tagId">
	            <td>{{ row.oldName }}</td>
	            <td><n-input v-model:value="row.newName" /></td>
	          </tr>
	        </tbody>
	      </table>
	      <template #footer>
	        <n-space justify="end">
	          <n-button @click="bulkRenameModalVisible = false">取消</n-button>
	          <n-button type="primary" @click="runBulkRename">保存</n-button>
	        </n-space>
	      </template>
	    </n-modal>

	    <n-modal v-model:show="bulkMetadataModalVisible" preset="card" class="small-modal" title="批量修改元信息">
	      <n-form label-placement="top">
	        <n-form-item v-for="field in metadataFields" :key="field.id" :label="field.name">
	          <n-input v-if="field.dataType === 'text'" :value="String(bulkMetadataDraft[field.id] ?? '')" @update:value="(value) => bulkMetadataDraft[field.id] = value" />
	          <n-select
	            v-else
	            :value="bulkMetadataDraft[field.id] ?? (field.dataType === 'multi_select' ? [] : null)"
	            :options="field.enumValues.map((item) => ({ label: item, value: item }))"
	            :multiple="field.dataType === 'multi_select'"
	            clearable
	            @update:value="(value) => setBulkMetadataValue(field.id, value)"
	          />
	        </n-form-item>
	      </n-form>
	      <template #footer>
	        <n-space justify="end">
	          <n-button @click="bulkMetadataModalVisible = false">取消</n-button>
	          <n-button type="primary" @click="runBulkMetadata">保存</n-button>
	        </n-space>
	      </template>
	    </n-modal>

	    <n-modal v-model:show="syncModalVisible" preset="card" class="small-modal" title="同步至其他项目">
	      <n-form label-placement="top">
	        <n-form-item label="目标项目">
	          <n-select v-model:value="syncProjectId" :options="projectOptions" />
	        </n-form-item>
	        <n-alert type="info">实时标签、未上架标签、草稿标签和已同步标签会在结果中标记失败。</n-alert>
	      </n-form>
	      <template #footer>
	        <n-space justify="end">
	          <n-button @click="syncModalVisible = false">取消</n-button>
	          <n-button type="primary" @click="runBulkSync">同步</n-button>
	        </n-space>
	      </template>
	    </n-modal>

		    <n-modal v-model:show="segmentModalVisible" preset="card" class="small-modal" title="存为分群">
	      <n-form label-placement="top">
	        <n-form-item label="分群名称">
	          <n-input v-model:value="segmentDraft.name" />
	        </n-form-item>
	        <n-form-item label="分群规则">
	          <n-input v-model:value="segmentDraft.rule" readonly />
	        </n-form-item>
	        <n-alert type="info">该动作只保存圈选规则，不写入真实人群明细。</n-alert>
	      </n-form>
	      <template #footer>
	        <n-space justify="end">
	          <n-button @click="segmentModalVisible = false">取消</n-button>
	          <n-button type="primary" @click="createSegmentFromDistribution">保存</n-button>
	        </n-space>
	      </template>
	    </n-modal>

	    <n-modal v-model:show="runLogModalVisible" preset="card" class="medium-modal" title="运行日志">
	      <div v-if="activeRunLog" class="log-viewer">
	        <p>任务：{{ activeRunLog.id }}</p>
	        <p>分区：{{ activeRunLog.partitionDate }}，状态：{{ tagRunStatusLabels[activeRunLog.status] }}</p>
	        <pre>
[08:00:00] 加载标签定义和规则版本
[08:00:12] 校验主体 ID、标签值字段和分区日期
[08:01:06] 写入标签结果表
{{ activeRunLog.status === 'failed' ? '[08:02:31] 上游行为数据分区等待超时，任务失败' : '[08:03:02] 任务完成，输出结果可用于下游查询' }}
	        </pre>
	      </div>
	      <template #footer>
	        <n-space justify="end">
	          <n-button type="primary" @click="runLogModalVisible = false">关闭</n-button>
	        </n-space>
	      </template>
	    </n-modal>

	    <n-modal v-model:show="operationLogModalVisible" preset="card" class="medium-modal" title="变更前后对比">
	      <div v-if="activeOperationLog" class="compare-grid">
	        <div>
	          <strong>变更前</strong>
	          <pre>{{ activeOperationLog.beforeJson ?? '-' }}</pre>
	        </div>
	        <div>
	          <strong>变更后</strong>
	          <pre>{{ activeOperationLog.afterJson ?? '-' }}</pre>
	        </div>
	      </div>
	      <template #footer>
	        <n-space justify="end">
	          <n-button @click="operationLogModalVisible = false">关闭</n-button>
	          <n-button v-if="currentDetail?.permissions.canEdit" type="primary" @click="restoreLogAndRerun">恢复规则并重跑</n-button>
	        </n-space>
	      </template>
	    </n-modal>

	    <n-modal v-model:show="sqlLineageModalVisible" preset="card" class="medium-modal" title="客户底表与数据档案关系查询">
	      <n-form label-placement="top">
	        <n-form-item label="查询方向">
	          <n-radio-group v-model:value="sqlLineageMode">
	            <n-radio value="table_to_profile">按底表查询数据档案</n-radio>
	            <n-radio value="profile_to_table">按数据档案查询底表</n-radio>
	          </n-radio-group>
	        </n-form-item>
	        <n-form-item label="关键词">
	          <n-input v-model:value="sqlLineageKeyword" placeholder="请输入底表名、字段名或数据档案名称" />
	        </n-form-item>
	      </n-form>
	      <table class="tag-table compact">
	        <thead><tr><th>底表/档案</th><th>字段</th><th>关系说明</th><th>状态</th></tr></thead>
	        <tbody>
	          <tr>
	            <td>{{ sqlLineageMode === 'table_to_profile' ? sqlLineageKeyword : 'cdp.orders' }}</td>
	            <td>user_id, tag_value, biz_date</td>
	            <td>{{ sqlLineageMode === 'table_to_profile' ? '可映射到用户主体数据档案' : '由订单明细底表提供字段' }}</td>
	            <td><n-tag size="small" type="success">可用</n-tag></td>
	          </tr>
	          <tr>
	            <td>用户行为事件表</td>
	            <td>event_name, event_time</td>
	            <td>可用于 SQL 标签血缘校验和权限提示</td>
	            <td><n-tag size="small" type="warning">需确认分区</n-tag></td>
	          </tr>
	        </tbody>
	      </table>
	      <template #footer>
	        <n-space justify="end">
	          <n-button type="primary" @click="sqlLineageModalVisible = false">确定</n-button>
	        </n-space>
	      </template>
	    </n-modal>

	    <n-modal
      v-model:show="authModalVisible"
      preset="card"
      class="medium-modal"
      :title="authTarget ? '标签授权' : `批量授权 ${authTargetIds.length} 个标签`"
    >
      <div class="auth-editor">
        <n-alert v-if="!authTarget" type="info" class="soft-alert">
          批量授权会把下方授权对象保存到已选标签，权限继承规则仍为管理包含编辑和查看，编辑包含查看。
        </n-alert>
        <div class="inline-fields">
          <n-select v-model:value="authDraft.principalType" :options="[{ label: '用户', value: 'user' }, { label: '用户组', value: 'group' }]" />
          <n-input v-model:value="authDraft.principalName" placeholder="搜索授权对象" />
          <n-select v-model:value="authDraft.permission" :options="[{ label: '查看', value: 'view' }, { label: '编辑', value: 'edit' }, { label: '管理', value: 'manage' }]" />
          <n-button @click="addAuthRow">添加授权</n-button>
        </div>
        <table class="tag-table compact">
          <thead><tr><th>授权对象</th><th>类型</th><th>权限</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="(row, index) in authRows" :key="row.id">
              <td>{{ row.principalName }}</td>
              <td>{{ row.principalType === 'user' ? '用户' : '用户组' }}</td>
              <td>{{ row.permission === 'view' ? '查看' : row.permission === 'edit' ? '编辑' : '管理' }}</td>
              <td><n-button text type="error" size="small" @click="authRows.splice(index, 1)">移除</n-button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="authModalVisible = false">取消</n-button>
          <n-button type="primary" @click="saveAuth">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="metadataModalVisible" preset="card" class="small-modal" :title="metadataDraft.id ? '编辑标签元信息' : '新建标签元信息'">
      <n-form label-placement="top">
        <n-form-item label="名称"><n-input v-model:value="metadataDraft.name" /></n-form-item>
        <n-form-item label="数据类型">
          <n-radio-group v-model:value="metadataDraft.dataType">
            <n-radio value="text">文本</n-radio>
            <n-radio value="single_select">单选</n-radio>
            <n-radio value="multi_select">多选</n-radio>
          </n-radio-group>
        </n-form-item>
        <n-form-item v-if="metadataDraft.dataType !== 'text'" label="枚举值">
          <n-input v-model:value="metadataDraft.enumValuesText" type="textarea" placeholder="每行或逗号分隔一个枚举值" />
        </n-form-item>
        <n-form-item label="是否必填"><n-switch v-model:value="metadataDraft.required" /></n-form-item>
        <n-form-item label="是否用于快捷筛选"><n-switch v-model:value="metadataDraft.quickFilterEnabled" /></n-form-item>
        <n-form-item label="说明"><n-input v-model:value="metadataDraft.description" type="textarea" /></n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="metadataModalVisible = false">取消</n-button>
          <n-button type="primary" @click="submitMetadata">确定</n-button>
        </n-space>
      </template>
    </n-modal>
  </section>
</template>

<style scoped>
.tag-system-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-heading,
.toolbar,
.detail-heading,
.panel-title,
.wizard-actions,
.batch-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.page-heading h1,
.page-heading p,
.toolbar h2,
.toolbar p,
.detail-heading h2 {
  margin: 0;
}

.eyebrow {
  color: #64748b;
  font-size: 13px;
  margin-bottom: 4px;
}

.module-tabs {
  display: flex;
  gap: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.module-tabs button {
  border: 0;
  background: transparent;
  padding: 12px 14px;
  cursor: pointer;
  color: #475569;
  border-bottom: 2px solid transparent;
}

.module-tabs button.active {
  color: #0f766e;
  border-color: #0f766e;
  font-weight: 600;
}

.notice,
.soft-alert {
  margin-bottom: 12px;
}

.tag-workbench-layout {
  display: grid;
  grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
  gap: 16px;
}

.tree-panel,
.filter-panel,
.content-panel {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 14px;
}

.filter-section {
  display: grid;
  gap: 4px;
  margin-bottom: 16px;
}

.filter-section > label {
  color: #475569;
  font-size: 13px;
  font-weight: 600;
}

.tree-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  border-radius: 6px;
  cursor: pointer;
  color: #334155;
}

.tree-row.selected {
  background: #e6f6f3;
  color: #0f766e;
}

.tree-row.system {
  color: #64748b;
}

.tree-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-actions {
  display: none;
  gap: 4px;
}

.tree-row:hover .tree-actions {
  display: inline-flex;
}

.tree-actions button,
.link-button {
  border: 0;
  background: transparent;
  color: #0f766e;
  cursor: pointer;
  padding: 0;
}

.table-wrap {
  overflow-x: auto;
}

.tag-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 980px;
}

.tag-table.compact {
  min-width: 720px;
}

.tag-table th,
.tag-table td {
  padding: 10px 12px;
  border-bottom: 1px solid #e5e7eb;
  text-align: left;
  vertical-align: top;
  white-space: nowrap;
}

.action-cell {
  min-width: 180px;
}

.action-list {
  white-space: normal;
}

.toolbar-left {
  display: flex;
  flex: 1;
  min-width: 320px;
  gap: 12px;
}

.toolbar-left :deep(.n-select) {
  min-width: 180px;
}

.tag-table th {
  background: #f8fafc;
  font-size: 13px;
  color: #475569;
  font-weight: 600;
}

.batch-bar {
  justify-content: flex-start;
  flex-wrap: wrap;
  padding: 10px 12px;
  margin-bottom: 12px;
  border: 1px solid #bae6fd;
  background: #f0f9ff;
  border-radius: 8px;
}

.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding-top: 12px;
  color: #64748b;
}

.risk-list {
  display: grid;
  gap: 6px;
  margin: 12px 0;
  padding: 10px;
  border: 1px solid #fecaca;
  background: #fff1f2;
  border-radius: 8px;
  color: #7f1d1d;
}

.risk-list small {
  color: #991b1b;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
}

.template-item {
  display: flex;
  gap: 10px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
}

.template-item.disabled {
  background: #f8fafc;
  color: #64748b;
  cursor: not-allowed;
}

.template-item span {
  display: grid;
  gap: 6px;
}

.template-item small,
.template-item em {
  color: #64748b;
  font-style: normal;
}

.detail-layout,
.wizard-section {
  display: grid;
  gap: 16px;
}

.detail-desc {
  margin: 12px 0 0;
  color: #475569;
}

.metric-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.metric-row div {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  background: #f8fafc;
}

.metric-row strong {
  display: block;
  font-size: 22px;
  color: #0f172a;
}

.metric-row span,
.lineage-node span {
  color: #64748b;
}

.rule-summary pre {
  white-space: pre-wrap;
  background: #0f172a;
  color: #e2e8f0;
  padding: 12px;
  border-radius: 8px;
}

.rule-value-list,
.interval-list,
.auth-editor {
  display: grid;
  gap: 12px;
}

.rule-value-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  display: grid;
  gap: 10px;
}

.rule-card-head,
.condition-columns,
.condition-head,
.inline-fields,
.interval-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.condition-columns > div {
  flex: 1;
  display: grid;
  gap: 8px;
}

.condition-head {
  justify-content: space-between;
}

.condition-head :deep(.n-select) {
  width: 96px;
}

.condition-editor {
  display: grid;
  grid-template-columns: 120px minmax(140px, 1fr) 120px minmax(110px, 1fr) 170px minmax(150px, 1fr) auto;
  gap: 8px;
  align-items: center;
  padding: 8px;
  border: 1px solid #ccfbf1;
  background: #f0fdfa;
  border-radius: 8px;
}

.condition-editor.muted {
  border-color: #fecaca;
  background: #fff1f2;
}

.condition-chip {
  border: 1px solid #99f6e4;
  background: #f0fdfa;
  color: #115e59;
  border-radius: 16px;
  padding: 6px 10px;
  text-align: left;
}

.condition-chip.muted {
  border-color: #fecaca;
  background: #fff1f2;
  color: #991b1b;
}

.lineage-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.lineage-list.graph {
  position: relative;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.lineage-node {
  display: grid;
  gap: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
}

.lineage-node.upstream {
  border-left: 4px solid #0ea5e9;
}

.lineage-node.downstream {
  border-left: 4px solid #10b981;
}

.admin-list {
  display: grid;
  gap: 10px;
}

.admin-row {
  display: grid;
  gap: 4px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
}

.admin-row span {
  color: #64748b;
}

.log-viewer,
.compare-grid {
  display: grid;
  gap: 12px;
}

.compare-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.log-viewer pre,
.compare-grid pre {
  min-height: 120px;
  white-space: pre-wrap;
  background: #0f172a;
  color: #e2e8f0;
  padding: 12px;
  border-radius: 8px;
}

.wizard-steps {
  margin: 16px 0 20px;
}

.metadata-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px 16px;
}

.field-picker,
.selected-fields,
.rfm-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.field-picker button,
.selected-fields span {
  border: 1px solid #cbd5e1;
  background: #fff;
  border-radius: 16px;
  padding: 6px 10px;
}

.selected-fields span {
  background: #ecfeff;
  border-color: #67e8f9;
}

.selected-fields button {
  border: 0;
  background: transparent;
  cursor: pointer;
}

.rfm-grid label {
  min-width: 210px;
  display: grid;
  gap: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
}

.sql-layout {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: 12px;
  margin-bottom: 12px;
}

.sql-side {
  min-height: 180px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  color: #475569;
  background: #f8fafc;
  display: grid;
  align-content: start;
  gap: 8px;
}

.sql-side button {
  border: 1px solid #cbd5e1;
  background: #fff;
  border-radius: 6px;
  padding: 6px 8px;
  text-align: left;
  cursor: pointer;
}

.file-input {
  display: block;
  margin-bottom: 12px;
}

.finish-state {
  text-align: center;
  padding: 48px 0;
}

.small-modal {
  max-width: 560px;
}

.medium-modal {
  max-width: 820px;
}

@media (max-width: 900px) {
  .tag-workbench-layout,
  .sql-layout {
    grid-template-columns: 1fr;
  }

  .page-heading,
  .toolbar,
  .detail-heading {
    align-items: flex-start;
    flex-direction: column;
  }

	  .rule-card-head,
	  .condition-columns,
	  .condition-editor,
	  .inline-fields,
	  .interval-row {
	    align-items: stretch;
	    flex-direction: column;
	    grid-template-columns: 1fr;
	  }
}
</style>
