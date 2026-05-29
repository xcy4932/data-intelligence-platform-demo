<script setup lang="ts">
import {
  AddOutline,
  ArrowBackOutline,
  ChevronBackOutline,
  ChevronForwardOutline,
  ContractOutline,
  CopyOutline,
  ExpandOutline,
  GitNetworkOutline,
  ListOutline,
  OpenOutline,
  RefreshOutline,
  SaveOutline,
  SearchOutline,
  SettingsOutline,
  Star,
  StarOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import {
  NAlert,
  NAvatar,
  NBadge,
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
  NSwitch,
  NTabPane,
  NTabs,
  NTag,
  NThing,
  NTooltip,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, DropdownOption, SelectOption } from 'naive-ui'
import { computed, h, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  profileConditionOperatorLabels,
  profileConditionSourceLabels,
  profileService,
  profileTabLabels,
} from '@/services/profileService'
import type { EntityId } from '@/types/common'
import type {
  ProfileBehaviorConfig,
  ProfileBehaviorEvent,
  ProfileBehaviorPropertyFilter,
  ProfileBehaviorQuery,
  ProfileBoard,
  ProfileCondition,
  ProfileCustomRule,
  ProfileDetailConfig,
  ProfileDetailTab,
  ProfileGraphViewMode,
  ProfileIndividual,
  ProfileListColumn,
  ProfileListConfig,
  ProfileLogic,
  ProfileRelationEdge,
  ProfileRelationGraph,
  ProfileSearchMode,
  ProfileSearchResultRow,
  ProfileSubjectType,
  ProfileTag,
  ProfileTagDisplayMode,
  ProfileWorkbenchData,
} from '@/types/profile'

type ProfilePage = 'search' | 'detail' | 'config'
type ConfigTab = 'boards' | 'list' | 'detail' | 'behavior' | 'metadata' | 'audit'

const route = useRoute()
const router = useRouter()
const message = useMessage()

const loading = ref(false)
const actionLoading = ref(false)
const workbench = ref<ProfileWorkbenchData>()

const selectedSubjectType = ref<ProfileSubjectType>('user')
const selectedBoardId = ref<EntityId>('')
const searchMode = ref<ProfileSearchMode>('exact')
const exactIdType = ref('')
const exactIdValue = ref('')
const includeLatestId = ref(false)
const resultLoading = ref(false)
const resultRows = ref<ProfileSearchResultRow[]>([])
const resultColumns = ref<ProfileListColumn[]>([])
const resultTotal = ref(0)
const page = ref(1)
const pageSize = ref(20)
const selectedRowKeys = ref<EntityId[]>([])
const hasSearched = ref(false)

const customRule = ref<ProfileCustomRule>(profileService.buildDefaultRule())
const customFilterVisible = ref(false)
const customSummary = ref('')
const estimateLoading = ref(false)
const estimateCount = ref(0)
const secondaryIdType = ref('')
const secondaryIdValue = ref('')

const columnModalVisible = ref(false)
const columnSearch = ref('')
const columnDraft = ref<string[]>([])
const draggingColumnKey = ref('')

const detailLoading = ref(false)
const detail = ref<ProfileIndividual>()
const detailActiveTab = ref<ProfileDetailTab>('overview')
const openedJourneyNodeId = ref<EntityId>('')
const overviewScrollIndex = ref(0)
const moreDrawerVisible = ref(false)
const moreDrawerTitle = ref('')
const moreDrawerTags = ref<ProfileTag[]>([])
const moreDrawerSegments = ref<ProfileIndividual['segments']>([])

const behaviorLoading = ref(false)
const behaviorRows = ref<ProfileBehaviorEvent[]>([])
const behaviorCursor = ref<string | undefined>()
const behaviorHasMore = ref(false)
const expandedEventIds = ref<EntityId[]>([])
const behaviorFilters = ref({
  platform: 'all',
  process: 'all',
  category: '',
  eventName: 'all',
  timeRange: '30d',
})
const behaviorCustomRange = ref<[number, number] | null>(null)
const behaviorPropertyFilters = ref<ProfileBehaviorPropertyFilter[]>([])

const tagDisplayMode = ref<ProfileTagDisplayMode>('tree')
const selectedTagGroup = ref('all')
const tagKeyword = ref('')
const tagSort = ref<'updatedAt' | 'name' | 'category'>('updatedAt')

const relationLoading = ref(false)
const relationGraph = ref<ProfileRelationGraph>()
const relationViewMode = ref<ProfileGraphViewMode>('graph')
const relationZoom = ref(1)
const relationFullscreen = ref(false)
const selectedRelationEdge = ref<ProfileRelationEdge>()
const focusIdentityType = ref('')

const configTab = ref<ConfigTab>('boards')
const configBoardId = ref<EntityId>('')
const boardModalVisible = ref(false)
const boardEditingId = ref<EntityId>('')
const boardDraft = ref({
  name: '',
  subjectType: 'user' as ProfileSubjectType,
  description: '',
  isDefault: false,
})
const listDraft = ref({
  defaultColumns: [] as string[],
  searchableIdTypes: [] as string[],
  allowLatestId: false,
})
const detailDraft = ref({
  archiveFields: [] as string[],
  overviewComponents: [] as string[],
  enabledTabs: [] as ProfileDetailTab[],
  globalDescription: '',
})
const behaviorDraft = ref({
  categories: [] as ProfileBehaviorConfig['categories'],
  hiddenEvents: [] as string[],
  hiddenProperties: [] as string[],
  platforms: [] as string[],
  processes: [] as string[],
  defaultTimeRange: '30d' as ProfileBehaviorConfig['defaultTimeRange'],
})
const categoryModalVisible = ref(false)
const categoryDraft = ref({
  name: '',
  tableName: 'dwd_user_event_log',
  events: [] as string[],
  description: '',
})

const currentPage = computed<ProfilePage>(() => String(route.meta.profilePage ?? 'search') as ProfilePage)
const permissions = computed(() => workbench.value?.permissions)
const featureFlags = computed(() => workbench.value?.featureFlags)
const subjects = computed(() => workbench.value?.subjects ?? [])
const boards = computed(() => workbench.value?.boards.filter((board) => board.status === 'enabled') ?? [])
const boardsForSubject = computed(() => boards.value.filter((board) => board.subjectType === selectedSubjectType.value))
const currentBoard = computed(() => boards.value.find((board) => board.id === selectedBoardId.value))
const currentListConfig = computed(() => profileService.getListConfig(selectedBoardId.value))
const currentDetailConfig = computed(() => profileService.getDetailConfig(selectedBoardId.value))
const currentBehaviorConfig = computed(() => profileService.getBehaviorConfig(selectedBoardId.value))
const currentSubject = computed(() => subjects.value.find((subject) => subject.type === selectedSubjectType.value))

const hasNoConfig = computed(() => Boolean(featureFlags.value) && !featureFlags.value?.profileConfigured)
const noProfilePermission = computed(() => Boolean(permissions.value) && !permissions.value?.viewProfile)
const canShowRelationTab = computed(() => Boolean(permissions.value?.relationGraph && permissions.value.multiSubject && featureFlags.value?.multiSubjectEnabled))

const subjectOptions = computed<SelectOption[]>(() =>
  subjects.value.map((subject) => ({
    label: `${subject.name} - ${subject.description}`,
    value: subject.type,
  })),
)

const boardOptionsForSubject = computed<SelectOption[]>(() =>
  boardsForSubject.value.map((board) => ({
    label: board.isDefault ? `${board.name}（默认）` : board.name,
    value: board.id,
  })),
)

const boardSelectOptions = computed<SelectOption[]>(() =>
  boards.value.map((board) => ({
    label: `${board.name} / ${subjectName(board.subjectType)}${board.isDefault ? ' / 默认' : ''}`,
    value: board.id,
  })),
)

const idTypeOptions = computed<SelectOption[]>(() => {
  const subject = currentSubject.value
  const config = currentListConfig.value
  if (!subject || !config) {
    return []
  }
  return subject.idTypes
    .filter((item) => config.searchableIdTypes.includes(item.id))
    .filter((item) => !item.sensitive || permissions.value?.userAttribute)
    .map((item) => ({ label: item.label, value: item.id }))
})

const columnOptions = computed<SelectOption[]>(() =>
  (currentListConfig.value?.availableColumns ?? [])
    .filter((column) => column.required || Boolean(permissions.value?.[column.permission]))
    .map((column) => ({ label: `${column.title}${column.realtimeSupported ? ' / 实时' : ' / 离线'}`, value: column.key })),
)

const filteredColumnOptions = computed(() => {
  const keyword = columnSearch.value.trim().toLowerCase()
  const columns = currentListConfig.value?.availableColumns ?? []
  return columns.filter((column) => {
    const allowed = column.required || Boolean(permissions.value?.[column.permission])
    if (!allowed) {
      return false
    }
    return !keyword || column.title.toLowerCase().includes(keyword) || column.key.toLowerCase().includes(keyword)
  })
})

const conditionCatalogOptions = computed<SelectOption[]>(() =>
  (workbench.value?.conditionCatalog ?? [])
    .filter((item) => Boolean(permissions.value?.[item.permission]))
    .map((item) => ({
      label: `${profileConditionSourceLabels[item.source]} / ${item.label}`,
      value: item.id,
    })),
)

const operatorOptions = computed<SelectOption[]>(() =>
  Object.entries(profileConditionOperatorLabels).map(([value, label]) => ({
    label,
    value,
  })),
)

const recentIdOptions = computed(() => {
  const keyword = exactIdValue.value.trim().toLowerCase()
  const options = profileService.getRecentSearchOptions(selectedSubjectType.value, exactIdType.value)
  if (!keyword) {
    return options
  }
  return options.filter((option) => `${option.label} ${option.value}`.toLowerCase().includes(keyword))
})

const resultStatsText = computed(() => {
  if (!hasSearched.value) {
    return '默认不自动检索，请输入条件后查询。'
  }
  return `共命中 ${resultTotal.value.toLocaleString()} 个体，当前展示第 ${page.value} 页。`
})

const resultTableColumns = computed<DataTableColumns<ProfileSearchResultRow>>(() => {
  const dynamicColumns: DataTableColumns<ProfileSearchResultRow> = resultColumns.value
    .filter((column) => !['baseId', 'displayName'].includes(column.key))
    .map((column) => ({
      title: column.title,
      key: column.key,
      width: column.width,
      render: (row) => renderCell(row, column),
    }))
  return [
    { type: 'selection', width: 44 },
    {
      title: '基准 ID / 主 ID',
      key: 'baseId',
      width: 190,
      fixed: 'left',
      render: (row) =>
        h(NSpace, { vertical: true, size: 2 }, () => [
          h(
            NButton,
            {
              text: true,
              type: 'primary',
              disabled: !row.viewable,
              onClick: () => openDetail(row),
            },
            () => row.baseId,
          ),
          h('span', { class: 'subtle' }, `${row.primaryIdType}: ${row.primaryIdMaskedValue}`),
        ]),
    },
    {
      title: '昵称/名称',
      key: 'displayName',
      width: 150,
      fixed: 'left',
      render: (row) => h('strong', row.displayName),
    },
    {
      title: '标签',
      key: 'tags',
      minWidth: 220,
      render: (row) =>
        h(NSpace, { size: 6 }, () =>
          row.tags.map((tag) =>
            h(
              NTag,
              {
                size: 'small',
                type: tag.groupId === 'value' ? 'success' : tag.groupId === 'service' ? 'warning' : 'info',
              },
              () => `${tag.name}:${tag.value}`,
            ),
          ),
        ),
    },
    ...dynamicColumns,
    {
      title: '收藏',
      key: 'favorite',
      width: 88,
      render: (row) =>
        h(
          NButton,
          {
            quaternary: true,
            circle: true,
            disabled: !row.viewable,
            onClick: () => toggleRowFavorite(row),
          },
          { icon: () => h(NIcon, null, { default: () => h(row.favorite ? Star : StarOutline) }) },
        ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (row) =>
        h(
          NButton,
          {
            text: true,
            type: 'primary',
            disabled: !row.viewable,
            onClick: () => openDetail(row),
          },
          () => '查看详情',
        ),
    },
  ]
})

const visibleOverviewCards = computed(() => (detail.value?.overviewCards ?? []).filter((card) => Boolean(permissions.value?.[card.permission])))
const shownOverviewCards = computed(() => visibleOverviewCards.value.slice(overviewScrollIndex.value, overviewScrollIndex.value + 5))
const journeyNodes = computed(() => (detail.value?.journey ?? []).slice(0, currentDetailConfig.value?.journeyConfig.maxNodes ?? 14))

const tagGroups = computed(() => {
  const tags = (detail.value?.tags ?? []).filter((tag) => tag.permission && permissions.value?.tagResource)
  const map = new Map<string, { id: string; name: string; tags: ProfileTag[] }>()
  tags.forEach((tag) => {
    if (!map.has(tag.groupId)) {
      map.set(tag.groupId, { id: tag.groupId, name: tag.groupName, tags: [] })
    }
    map.get(tag.groupId)?.tags.push(tag)
  })
  return [...map.values()]
})

const filteredTags = computed(() => {
  const keyword = tagKeyword.value.trim().toLowerCase()
  const tags = (detail.value?.tags ?? []).filter((tag) => tag.permission && permissions.value?.tagResource)
  const groupFiltered = selectedTagGroup.value === 'all' ? tags : tags.filter((tag) => tag.groupId === selectedTagGroup.value)
  return groupFiltered
    .filter((tag) => !keyword || tag.name.toLowerCase().includes(keyword) || tag.value.toLowerCase().includes(keyword))
    .sort((a, b) => {
      if (tagSort.value === 'name') {
        return a.name.localeCompare(b.name, 'zh-Hans-CN')
      }
      if (tagSort.value === 'category') {
        return a.categoryName.localeCompare(b.categoryName, 'zh-Hans-CN') || a.name.localeCompare(b.name, 'zh-Hans-CN')
      }
      return Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
    })
})

const behaviorPlatformOptions = computed<SelectOption[]>(() => [
  { label: '全部平台', value: 'all' },
  ...(currentBehaviorConfig.value?.platforms ?? []).map((platform) => ({ label: platform, value: platform })),
])

const behaviorProcessOptions = computed<SelectOption[]>(() => [
  { label: '全部流程', value: 'all' },
  ...(currentBehaviorConfig.value?.processes.filter((item) => item !== '全部流程') ?? []).map((process) => ({ label: process, value: process })),
])

const behaviorCategoryOptions = computed<SelectOption[]>(() => [
  { label: '全部分类', value: '' },
  ...(currentBehaviorConfig.value?.categories ?? []).map((category) => ({ label: category.name, value: category.id })),
])

const behaviorEventOptions = computed<SelectOption[]>(() => {
  const config = currentBehaviorConfig.value
  if (!config) {
    return [{ label: '全部事件', value: 'all' }]
  }
  const category = config.categories.find((item) => item.id === behaviorFilters.value.category)
  const eventNames = category?.events ?? config.categories.flatMap((item) => item.events)
  return [
    { label: '全部事件', value: 'all' },
    ...unique(eventNames)
      .filter((eventName) => !config.hiddenEvents.includes(eventName))
      .map((eventName) => ({ label: eventDisplayName(eventName), value: eventName })),
  ]
})

const relationTableColumns = computed<DataTableColumns<ProfileRelationGraph['tableRows'][number]>>(() => [
  { title: '主体名称', key: 'subjectName', width: 120 },
  { title: 'ID 类型', key: 'idType', width: 110 },
  { title: 'ID 值', key: 'maskedValue', width: 160 },
  { title: '关系名称', key: 'relationName', width: 150 },
  {
    title: '关键标签',
    key: 'keyTags',
    minWidth: 180,
    render: (row) => h(NSpace, { size: 6 }, () => row.keyTags.map((tag) => h(NTag, { size: 'small', type: 'info' }, () => tag))),
  },
  { title: '关键属性', key: 'keyAttributes', minWidth: 220, render: (row) => row.keyAttributes.join(' / ') },
  { title: '更新时间', key: 'updatedAt', width: 170, render: (row) => formatDateTime(row.updatedAt) },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    render: (row) =>
      h(NSpace, { size: 8 }, () => [
        h(
          NButton,
          {
            text: true,
            type: 'primary',
            disabled: !row.viewable,
            onClick: () => jumpRelationDetail(row.subjectType, row.idValue),
          },
          () => '查看详情',
        ),
        row.copyable
          ? h(
              NButton,
              {
                text: true,
                onClick: () => copyText(row.idValue),
              },
              () => '复制ID',
            )
          : null,
      ]),
  },
])

const boardActionOptions = (row: ProfileBoard): DropdownOption[] => [
  { label: '进入检索列表配置', key: 'config-list' },
  { label: '进入详情页配置', key: 'config-detail' },
  { label: '进入行为细查配置', key: 'config-behavior' },
  { type: 'divider', key: 'divider-1' },
  { label: '复制为新看板', key: 'duplicate' },
  { label: '前台预览', key: 'preview' },
  { type: 'divider', key: 'divider-2' },
  { label: row.isDefault ? '已是默认看板' : '设为默认看板', key: 'default', disabled: row.isDefault },
]

const identityColumns = computed<DataTableColumns<ProfileRelationGraph['identities'][number]>>(() => [
  { title: 'ID 类型', key: 'idTypeLabel', width: 140 },
  { title: 'ID 值', key: 'maskedValue', minWidth: 220 },
  { title: '是否主 ID', key: 'isPrimary', width: 110, render: (row) => (row.isPrimary ? '是' : '否') },
  { title: '是否脱敏', key: 'masked', width: 110, render: (row) => (row.masked ? '是' : '否') },
  { title: '来源', key: 'source', width: 150 },
  { title: '更新时间', key: 'updatedAt', width: 170, render: (row) => formatDateTime(row.updatedAt) },
  {
    title: '操作',
    key: 'actions',
    width: 90,
    render: (row) =>
      row.copyable && (!row.sensitive || permissions.value?.copySensitiveId)
        ? h(NButton, { text: true, type: 'primary', onClick: () => copyText(row.value) }, () => '复制')
        : h('span', { class: 'subtle' }, '无权限'),
  },
])

const boardColumns = computed<DataTableColumns<ProfileBoard>>(() => [
  { title: '看板名称', key: 'name', minWidth: 170 },
  { title: '主体', key: 'subjectType', width: 110, render: (row) => subjectName(row.subjectType) },
  { title: '描述', key: 'description', minWidth: 260 },
  { title: '默认看板', key: 'isDefault', width: 110, render: (row) => h(NTag, { type: row.isDefault ? 'success' : 'default', size: 'small' }, () => (row.isDefault ? '默认' : '普通')) },
  { title: '创建人', key: 'createdBy', width: 120, render: (row) => row.createdBy.name },
  { title: '更新时间', key: 'updatedAt', width: 170, render: (row) => formatDateTime(row.updatedAt) },
  {
    title: '操作',
    key: 'actions',
    width: 220,
    render: (row) =>
      h(NSpace, { size: 8 }, () => [
        h(
          NButton,
          {
            text: true,
            type: 'primary',
            onClick: () => openBoardModal(row),
          },
          () => '编辑',
        ),
        h(
          NDropdown,
          {
            trigger: 'click',
            options: boardActionOptions(row),
            onSelect: (key) => handleBoardManagementAction(String(key), row),
          },
          {
            default: () =>
              h(
                NButton,
                {
                  text: true,
                  type: 'primary',
                },
                () => '更多',
              ),
          },
        ),
        h(
          NPopconfirm,
          {
            positiveText: '删除',
            negativeText: '取消',
            onPositiveClick: () => deleteBoard(row.id),
          },
          {
            trigger: () =>
              h(
                NButton,
                {
                  text: true,
                  type: 'error',
                },
                () => '删除',
              ),
            default: () => '确认删除该看板？同一主体至少保留 1 个看板。',
          },
        ),
      ]),
  },
])

const auditColumns = computed<DataTableColumns<ProfileWorkbenchData['auditLogs'][number]>>(() => [
  { title: '操作人', key: 'userId', width: 130 },
  { title: '动作', key: 'action', width: 130 },
  { title: '主体', key: 'subjectType', width: 100, render: (row) => subjectName(row.subjectType) },
  { title: 'ID 类型', key: 'idType', width: 120 },
  { title: '查询/访问 ID', key: 'idValueMasked', minWidth: 160 },
  { title: '看板', key: 'boardId', minWidth: 180, render: (row) => profileService.getBoard(row.boardId ?? '')?.name ?? row.boardId ?? '-' },
  { title: '返回数量', key: 'resultCount', width: 110, render: (row) => row.resultCount ?? '-' },
  { title: 'IP', key: 'ip', width: 120 },
  { title: '时间', key: 'timestamp', width: 170, render: (row) => formatDateTime(row.timestamp) },
])

function unique<T>(values: T[]): T[] {
  return [...new Set(values)]
}

function subjectName(subjectType: ProfileSubjectType): string {
  return subjects.value.find((subject) => subject.type === subjectType)?.name ?? subjectType
}

function formatDateTime(value: string): string {
  return value ? value.replace('T', ' ').slice(0, 16) : '-'
}

function renderCell(row: ProfileSearchResultRow, column: ProfileListColumn) {
  const value = row.values[column.key] ?? row.values[column.field] ?? '-'
  if (column.type === 'tag') {
    return h(NTag, { size: 'small', type: String(value).includes('A') || Number(value) > 80 ? 'success' : 'info' }, () => String(value))
  }
  if (column.type === 'segment') {
    return h('span', { class: 'clamp-text' }, String(value))
  }
  return String(value)
}

function eventDisplayName(eventName: string): string {
  const event = behaviorRows.value.find((item) => item.eventName === eventName)
  const fallback: Record<string, string> = {
    ad_click: '广告点击',
    wechat_article_read: '微信文章阅读',
    gmp_sdk_logs: 'GMP触达',
    miniapp_browse: '权益页浏览',
    vehicle_config_view: '车型配置查看',
    store_detail_view: '门店详情查看',
    coupon_receive: '领券',
    test_drive_book: '试驾预约',
    order_submit: '订单提交',
    service_ticket_create: '客服工单',
    vehicle_check: '车辆检查',
    app_feedback: 'App 反馈',
    refund_apply: '退款申请',
  }
  return event?.displayName ?? fallback[eventName] ?? eventName
}

function setDefaultBoardForSubject(subjectType: ProfileSubjectType): void {
  const queryBoardId = String(route.query.boardId ?? '')
  const querySubject = String(route.query.subject ?? '')
  const subject = subjects.value.find((item) => item.type === querySubject)?.type ?? subjectType
  selectedSubjectType.value = subject
  const availableBoards = boards.value.filter((board) => board.subjectType === subject)
  const queryBoard = availableBoards.find((board) => board.id === queryBoardId)
  const defaultBoard = availableBoards.find((board) => board.isDefault) ?? availableBoards[0]
  selectedBoardId.value = queryBoard?.id ?? defaultBoard?.id ?? ''
  syncBoardDefaults()
}

function syncBoardDefaults(): void {
  const config = profileService.getBoardConfig(selectedBoardId.value)
  const idOptions = idTypeOptions.value
  exactIdType.value = idOptions.length === 1 ? String(idOptions[0]?.value ?? '') : exactIdType.value || String(idOptions[0]?.value ?? '')
  includeLatestId.value = Boolean(config.listConfig?.allowLatestId && includeLatestId.value)
  resultColumns.value = config.visibleColumns
  columnDraft.value = config.visibleColumns.map((column) => column.key)
  listDraft.value = {
    defaultColumns: [...(config.listConfig?.defaultColumns ?? [])],
    searchableIdTypes: [...(config.listConfig?.searchableIdTypes ?? [])],
    allowLatestId: Boolean(config.listConfig?.allowLatestId),
  }
  detailDraft.value = {
    archiveFields: [...(config.detailConfig?.archiveFields ?? [])],
    overviewComponents: [...(config.detailConfig?.overviewComponents ?? [])],
    enabledTabs: [...(config.detailConfig?.enabledTabs ?? [])],
    globalDescription: config.detailConfig?.globalDescription ?? '',
  }
  behaviorDraft.value = {
    categories: [...(config.behaviorConfig?.categories ?? [])],
    hiddenEvents: [...(config.behaviorConfig?.hiddenEvents ?? [])],
    hiddenProperties: [...(config.behaviorConfig?.hiddenProperties ?? [])],
    platforms: [...(config.behaviorConfig?.platforms ?? [])],
    processes: [...(config.behaviorConfig?.processes ?? [])],
    defaultTimeRange: config.behaviorConfig?.defaultTimeRange ?? '30d',
  }
}

function clearResults(): void {
  resultRows.value = []
  resultTotal.value = 0
  selectedRowKeys.value = []
  page.value = 1
  hasSearched.value = false
}

function handleBoardSelect(key: string | number): void {
  selectedBoardId.value = String(key)
  const board = profileService.getBoard(selectedBoardId.value)
  if (board) {
    selectedSubjectType.value = board.subjectType
  }
  if (currentPage.value === 'detail') {
    syncBoardDefaults()
    void router.replace({ query: { ...route.query, boardId: selectedBoardId.value } }).then(() => loadDetail())
    return
  }
  exactIdValue.value = ''
  secondaryIdValue.value = ''
  customSummary.value = ''
  clearResults()
  syncBoardDefaults()
}

function handleSubjectChange(): void {
  const defaultBoard = boards.value.find((board) => board.subjectType === selectedSubjectType.value && board.isDefault) ?? boardsForSubject.value[0]
  selectedBoardId.value = defaultBoard?.id ?? ''
  exactIdValue.value = ''
  exactIdType.value = ''
  customSummary.value = ''
  clearResults()
  syncBoardDefaults()
}

async function executeExactSearch(): Promise<void> {
  if (!permissions.value?.searchProfile) {
    message.warning('暂无检索权限')
    return
  }
  if (!exactIdType.value) {
    message.warning('请选择ID类型')
    return
  }
  const input = exactIdValue.value.trim()
  if (!input) {
    message.warning('请输入具体ID')
    return
  }
  if (exactIdType.value === 'mobile' && !/^1\d{10}$/.test(input) && !/^\d{3}\*{4}\d{4}$/.test(input)) {
    message.warning('手机号格式不符合当前项目规则')
    return
  }
  resultLoading.value = true
  try {
    const response = await profileService.searchExact({
      boardId: selectedBoardId.value,
      subjectType: selectedSubjectType.value,
      idType: exactIdType.value,
      idValue: input,
      includeLatestId: includeLatestId.value,
      page: page.value,
      pageSize: pageSize.value,
    })
    applySearchResponse(response)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '查询失败，请稍后重试')
  } finally {
    resultLoading.value = false
  }
}

async function executeCustomSearch(): Promise<void> {
  if (!permissions.value?.searchProfile) {
    message.warning('暂无检索权限')
    return
  }
  if (!customRule.value.satisfyGroups.length && customRule.value.sourceModule === 'manual') {
    message.warning('请至少配置一个满足条件')
    return
  }
  resultLoading.value = true
  try {
    const response = await profileService.searchCustom({
      boardId: selectedBoardId.value,
      subjectType: selectedSubjectType.value,
      rule: customRule.value,
      includeLatestId: includeLatestId.value,
      secondaryIdType: secondaryIdType.value || undefined,
      secondaryIdValue: secondaryIdValue.value.trim() || undefined,
      page: page.value,
      pageSize: pageSize.value,
    })
    customSummary.value = profileService.describeRule(customRule.value)
    applySearchResponse(response)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '查询失败，请稍后重试')
  } finally {
    resultLoading.value = false
  }
}

async function executeSearch(resetPage = true): Promise<void> {
  if (resetPage) {
    page.value = 1
  }
  if (searchMode.value === 'exact') {
    await executeExactSearch()
  } else {
    await executeCustomSearch()
  }
}

function applySearchResponse(response: Awaited<ReturnType<typeof profileService.searchExact>>): void {
  resultRows.value = response.rows
  resultColumns.value = response.columns
  resultTotal.value = response.total
  hasSearched.value = true
  if (!response.total) {
    message.info('未找到匹配的个体')
  }
}

function resetExactSearch(): void {
  exactIdValue.value = ''
  exactIdType.value = idTypeOptions.value.length === 1 ? String(idTypeOptions.value[0]?.value ?? '') : String(idTypeOptions.value[0]?.value ?? '')
  includeLatestId.value = false
  clearResults()
}

function clearCustomSearch(): void {
  customRule.value = profileService.buildDefaultRule()
  customSummary.value = ''
  secondaryIdValue.value = ''
  clearResults()
}

function handleModeChange(value: string): void {
  searchMode.value = value as ProfileSearchMode
  if (searchMode.value === 'exact') {
    secondaryIdValue.value = ''
  } else {
    exactIdValue.value = ''
  }
  clearResults()
}

function openColumnModal(): void {
  columnDraft.value = resultColumns.value.length ? resultColumns.value.map((column) => column.key) : currentListConfig.value?.defaultColumns ?? []
  columnModalVisible.value = true
}

function moveColumn(key: string, direction: -1 | 1): void {
  const index = columnDraft.value.indexOf(key)
  const nextIndex = index + direction
  if (index < 0 || nextIndex < 0 || nextIndex >= columnDraft.value.length) {
    return
  }
  const next = [...columnDraft.value]
  const [item] = next.splice(index, 1)
  if (item) {
    next.splice(nextIndex, 0, item)
    columnDraft.value = next
  }
}

function dropColumn(targetKey: string): void {
  const sourceKey = draggingColumnKey.value
  draggingColumnKey.value = ''
  if (!sourceKey || sourceKey === targetKey) {
    return
  }
  const sourceIndex = columnDraft.value.indexOf(sourceKey)
  const targetIndex = columnDraft.value.indexOf(targetKey)
  if (sourceIndex < 0 || targetIndex < 0) {
    return
  }
  const next = [...columnDraft.value]
  const [item] = next.splice(sourceIndex, 1)
  if (!item) {
    return
  }
  next.splice(targetIndex, 0, item)
  columnDraft.value = next
}

async function saveColumns(): Promise<void> {
  const required = (currentListConfig.value?.availableColumns ?? []).filter((column) => column.required).map((column) => column.key)
  const columns = unique([...required, ...columnDraft.value])
  await profileService.saveUserColumns(selectedBoardId.value, columns)
  syncBoardDefaults()
  if (hasSearched.value) {
    resultColumns.value = profileService.getBoardConfig(selectedBoardId.value).visibleColumns
  }
  columnModalVisible.value = false
  message.success('个人自定义列已保存')
}

function restoreDefaultColumns(): void {
  columnDraft.value = [...(currentListConfig.value?.defaultColumns ?? [])]
}

async function toggleRowFavorite(row: ProfileSearchResultRow): Promise<void> {
  try {
    const favorite = await profileService.toggleFavorite(selectedBoardId.value, row.subjectType, row.baseId)
    row.favorite = favorite
    message.success(favorite ? '收藏成功' : '已取消收藏')
  } catch {
    message.error(row.favorite ? '取消收藏失败，请稍后重试' : '收藏失败，请稍后重试')
  }
}

async function toggleDetailFavorite(): Promise<void> {
  if (!detail.value) {
    return
  }
  try {
    const favorite = await profileService.toggleFavorite(selectedBoardId.value, detail.value.subjectType, detail.value.baseId)
    message.success(favorite ? '收藏成功' : '已取消收藏')
    if (hasSearched.value) {
      const row = resultRows.value.find((item) => item.baseId === detail.value?.baseId)
      if (row) {
        row.favorite = favorite
      }
    }
  } catch {
    message.error('收藏失败，请稍后重试')
  }
}

function openDetail(row: ProfileSearchResultRow): void {
  if (!row.viewable) {
    message.warning('暂无该个体画像查看权限。')
    return
  }
  sessionStorage.setItem(
    'profile-list-state',
    JSON.stringify({
      selectedSubjectType: selectedSubjectType.value,
      selectedBoardId: selectedBoardId.value,
      searchMode: searchMode.value,
      exactIdType: exactIdType.value,
      exactIdValue: exactIdValue.value,
      includeLatestId: includeLatestId.value,
      customRule: customRule.value,
      customSummary: customSummary.value,
      secondaryIdType: secondaryIdType.value,
      secondaryIdValue: secondaryIdValue.value,
      page: page.value,
      pageSize: pageSize.value,
      hasSearched: hasSearched.value,
      scrollY: window.scrollY,
    }),
  )
  void router.push({
    path: `/user-insight/profiles/${row.subjectType}/${row.baseId}`,
    query: { boardId: selectedBoardId.value },
  })
}

async function loadDetail(): Promise<void> {
  const subjectType = String(route.params.subjectType || selectedSubjectType.value) as ProfileSubjectType
  const baseId = String(route.params.baseId || '')
  const boardId = String(route.query.boardId || selectedBoardId.value)
  if (!baseId) {
    return
  }
  selectedSubjectType.value = subjectType
  if (boardId) {
    selectedBoardId.value = boardId
  } else {
    setDefaultBoardForSubject(subjectType)
  }
  syncBoardDefaults()
  detailLoading.value = true
  try {
    detail.value = await profileService.getDetail(selectedBoardId.value, subjectType, baseId)
    if (!detail.value) {
      message.warning('当前个体暂无可展示画像信息。')
    }
    detailActiveTab.value = currentDetailConfig.value?.enabledTabs[0] ?? 'overview'
    await Promise.all([queryBehavior(true), loadRelationGraph()])
  } catch (error) {
    message.error(error instanceof Error ? error.message : '暂无该个体画像查看权限。')
  } finally {
    detailLoading.value = false
  }
}

function backToList(): void {
  const stored = sessionStorage.getItem('profile-list-state')
  if (stored) {
    try {
      const state = JSON.parse(stored) as {
        selectedSubjectType: ProfileSubjectType
        selectedBoardId: EntityId
        searchMode: ProfileSearchMode
        exactIdType: string
        exactIdValue: string
        includeLatestId: boolean
        customRule: ProfileCustomRule
        customSummary: string
        secondaryIdType: string
        secondaryIdValue: string
        page: number
        pageSize: number
        hasSearched: boolean
        scrollY?: number
      }
      selectedSubjectType.value = state.selectedSubjectType
      selectedBoardId.value = state.selectedBoardId
      searchMode.value = state.searchMode
      exactIdType.value = state.exactIdType
      exactIdValue.value = state.exactIdValue
      includeLatestId.value = state.includeLatestId
      customRule.value = state.customRule
      customSummary.value = state.customSummary
      secondaryIdType.value = state.secondaryIdType
      secondaryIdValue.value = state.secondaryIdValue
      page.value = state.page
      pageSize.value = state.pageSize
      void router.push('/user-insight/profiles').then(() => {
        if (state.hasSearched) {
          void executeSearch(false).then(() => {
            void nextTick(() => window.scrollTo({ top: state.scrollY ?? 0 }))
          })
        }
      })
      return
    } catch {
      sessionStorage.removeItem('profile-list-state')
    }
  }
  void router.push('/user-insight/profiles')
}

function addConditionGroup(type: 'satisfy' | 'exclude'): void {
  const group = {
    id: `group-${Date.now()}`,
    name: type === 'satisfy' ? `条件组${customRule.value.satisfyGroups.length + 1}` : `排除组${customRule.value.excludeGroups.length + 1}`,
    logic: 'and' as ProfileLogic,
    conditions: [profileService.buildCondition()],
  }
  if (type === 'satisfy') {
    customRule.value.satisfyGroups.push(group)
  } else {
    customRule.value.excludeGroups.push(group)
  }
}

function removeConditionGroup(type: 'satisfy' | 'exclude', groupId: EntityId): void {
  if (type === 'satisfy') {
    customRule.value.satisfyGroups = customRule.value.satisfyGroups.filter((group) => group.id !== groupId)
  } else {
    customRule.value.excludeGroups = customRule.value.excludeGroups.filter((group) => group.id !== groupId)
  }
}

function addCondition(group: { conditions: ProfileCondition[] }): void {
  group.conditions.push(profileService.buildCondition())
}

function removeCondition(group: { conditions: ProfileCondition[] }, conditionId: EntityId): void {
  group.conditions = group.conditions.filter((condition) => condition.id !== conditionId)
}

function replaceCondition(group: { conditions: ProfileCondition[] }, index: number, catalogId: string): void {
  group.conditions.splice(index, 1, profileService.buildCondition(catalogId))
}

function conditionCatalogId(condition: ProfileCondition): string {
  return workbench.value?.conditionCatalog.find((item) => item.field === condition.field && item.source === condition.source)?.id ?? ''
}

async function estimateCustomRule(): Promise<void> {
  estimateLoading.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 180))
  estimateCount.value = profileService.estimateRule(customRule.value, selectedSubjectType.value)
  estimateLoading.value = false
}

async function confirmCustomFilter(): Promise<void> {
  if (!customRule.value.satisfyGroups.some((group) => group.conditions.length)) {
    message.warning('请至少配置一个满足条件')
    return
  }
  customFilterVisible.value = false
  await executeSearch(true)
}

function openMoreTags(title: string, tags: ProfileTag[]): void {
  moreDrawerTitle.value = title
  moreDrawerTags.value = tags
  moreDrawerSegments.value = []
  moreDrawerVisible.value = true
}

function openMoreSegments(title: string, segments: ProfileIndividual['segments']): void {
  moreDrawerTitle.value = title
  moreDrawerTags.value = []
  moreDrawerSegments.value = segments
  moreDrawerVisible.value = true
}

function goTagDetail(tag: ProfileTag): void {
  if (!permissions.value?.tagResource) {
    message.warning('暂无标签体系权限')
    return
  }
  if (tag.deleted) {
    message.warning('标签不存在')
    return
  }
  void router.push(`/user-insight/tags/${tag.id}`)
}

function goSegmentDetail(segmentId: EntityId, permission: boolean, deleted?: boolean): void {
  if (!permissions.value?.segmentView || !permission) {
    message.warning('暂无分群查看权限')
    return
  }
  if (deleted) {
    message.warning('分群已删除')
    return
  }
  void router.push(`/user-insight/segments/${segmentId}`)
}

async function queryBehavior(reset = false): Promise<void> {
  if (!detail.value || !currentDetailConfig.value?.enabledTabs.includes('behavior')) {
    return
  }
  const customRange = behaviorCustomRange.value
  if (behaviorFilters.value.timeRange === 'custom') {
    if (!customRange) {
      message.warning('请选择自定义时间范围')
      return
    }
    const [start, end] = customRange
    if (start > end) {
      message.warning('开始时间不能晚于结束时间')
      return
    }
    if (end > Date.now()) {
      message.warning('结束时间不能晚于当前时间')
      return
    }
    const maxRangeDays = currentBehaviorConfig.value?.maxRangeDays ?? 180
    if (end - start > maxRangeDays * 24 * 60 * 60 * 1000) {
      message.warning('查询时间范围过大，请缩小时间范围。')
      return
    }
  }
  if (reset) {
    behaviorCursor.value = undefined
    behaviorRows.value = []
    expandedEventIds.value = []
  }
  behaviorLoading.value = true
  const query: ProfileBehaviorQuery = {
    boardId: selectedBoardId.value,
    subjectType: detail.value.subjectType,
    baseId: detail.value.baseId,
    platform: behaviorFilters.value.platform,
    process: behaviorFilters.value.process,
    category: behaviorFilters.value.category,
    eventName: behaviorFilters.value.eventName,
    propertyFilters: behaviorPropertyFilters.value,
    timeRange: behaviorFilters.value.timeRange as ProfileBehaviorQuery['timeRange'],
    startTime: customRange ? new Date(customRange[0]).toISOString() : undefined,
    endTime: customRange ? new Date(customRange[1]).toISOString() : undefined,
    cursor: behaviorCursor.value,
    limit: 50,
  }
  try {
    const response = await profileService.queryBehavior(query)
    behaviorRows.value = reset ? response.rows : [...behaviorRows.value, ...response.rows]
    behaviorCursor.value = response.nextCursor
    behaviorHasMore.value = response.hasMore
  } catch (error) {
    message.error(error instanceof Error ? error.message : '行为细查查询失败')
  } finally {
    behaviorLoading.value = false
  }
}

function resetBehaviorFilters(): void {
  behaviorFilters.value = {
    platform: 'all',
    process: 'all',
    category: '',
    eventName: 'all',
    timeRange: currentBehaviorConfig.value?.defaultTimeRange ?? '30d',
  }
  behaviorCustomRange.value = null
  behaviorPropertyFilters.value = []
  void queryBehavior(true)
}

function addBehaviorPropertyFilter(): void {
  behaviorPropertyFilters.value.push({
    id: `property-${Date.now()}`,
    field: 'status_code',
    label: '状态码',
    operator: 'equals',
    value: '',
  })
}

function removeBehaviorPropertyFilter(id: EntityId): void {
  behaviorPropertyFilters.value = behaviorPropertyFilters.value.filter((filter) => filter.id !== id)
}

function toggleEventDetail(eventId: EntityId): void {
  expandedEventIds.value = expandedEventIds.value.includes(eventId)
    ? expandedEventIds.value.filter((id) => id !== eventId)
    : [...expandedEventIds.value, eventId]
}

function groupedBehaviorRows(): Array<{ date: string; rows: ProfileBehaviorEvent[] }> {
  const map = new Map<string, ProfileBehaviorEvent[]>()
  behaviorRows.value.forEach((event) => {
    const date = event.occurredAt.slice(0, 10)
    map.set(date, [...(map.get(date) ?? []), event])
  })
  return [...map.entries()].map(([date, rows]) => ({ date, rows }))
}

async function loadRelationGraph(): Promise<void> {
  if (!detail.value) {
    return
  }
  relationLoading.value = true
  try {
    relationGraph.value = await profileService.getRelationGraph(detail.value.subjectType, detail.value.baseId)
  } finally {
    relationLoading.value = false
  }
}

function zoomRelation(delta: number): void {
  relationZoom.value = Math.min(1.6, Math.max(0.7, Number((relationZoom.value + delta).toFixed(2))))
}

function fitRelation(): void {
  relationZoom.value = 1
}

function jumpRelationDetail(subjectType: ProfileSubjectType, idValue: string): void {
  const targetBoard = boards.value.find((board) => board.subjectType === subjectType && board.isDefault) ?? boards.value.find((board) => board.subjectType === subjectType)
  if (!targetBoard) {
    message.warning('暂无看板配置')
    return
  }
  void router.push({
    path: `/user-insight/profiles/${subjectType}/${idValue}`,
    query: { boardId: targetBoard.id },
  })
}

function focusIdentity(idType: string): void {
  detailActiveTab.value = 'relation'
  relationViewMode.value = 'table'
  focusIdentityType.value = idType
  message.info('已定位到关系图谱的身份信息表格')
}

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    message.success('已复制')
  } catch {
    message.warning('复制失败，请检查浏览器权限')
  }
}

async function setDefaultBoard(boardId: EntityId): Promise<void> {
  await profileService.updateBoardDefault(boardId)
  await loadWorkbench(false)
  configBoardId.value = boardId
  message.success('默认看板已更新')
}

function openBoardModal(board?: ProfileBoard): void {
  if (board) {
    boardEditingId.value = board.id
    boardDraft.value = {
      name: board.name,
      subjectType: board.subjectType,
      description: board.description,
      isDefault: board.isDefault,
    }
  } else {
    boardEditingId.value = ''
    boardDraft.value = { name: '', subjectType: selectedSubjectType.value, description: '', isDefault: false }
  }
  boardModalVisible.value = true
}

function closeBoardModal(): void {
  boardModalVisible.value = false
  boardEditingId.value = ''
  boardDraft.value = { name: '', subjectType: selectedSubjectType.value, description: '', isDefault: false }
}

function goBoardConfig(boardId: EntityId, tab: ConfigTab): void {
  configBoardId.value = boardId
  configTab.value = tab
  syncConfigDrafts(boardId)
}

async function duplicateBoard(boardId: EntityId): Promise<void> {
  actionLoading.value = true
  try {
    const result = await profileService.duplicateBoard(boardId)
    message[result.ok ? 'success' : 'warning'](result.message)
    if (result.ok && result.board) {
      await loadWorkbench(false)
      configBoardId.value = result.board.id
      configTab.value = 'list'
      syncConfigDrafts(result.board.id)
    }
  } finally {
    actionLoading.value = false
  }
}

function previewBoard(row: ProfileBoard): void {
  void router.push({
    path: '/user-insight/profiles',
    query: { subject: row.subjectType, boardId: row.id },
  })
}

function handleBoardManagementAction(key: string, row: ProfileBoard): void {
  if (key === 'config-list') {
    goBoardConfig(row.id, 'list')
    return
  }
  if (key === 'config-detail') {
    goBoardConfig(row.id, 'detail')
    return
  }
  if (key === 'config-behavior') {
    goBoardConfig(row.id, 'behavior')
    return
  }
  if (key === 'duplicate') {
    void duplicateBoard(row.id)
    return
  }
  if (key === 'preview') {
    previewBoard(row)
    return
  }
  if (key === 'default') {
    void setDefaultBoard(row.id)
  }
}

async function deleteBoard(boardId: EntityId): Promise<void> {
  const result = await profileService.deleteBoard(boardId)
  message[result.ok ? 'success' : 'warning'](result.message)
  if (!result.ok) {
    return
  }
  await loadWorkbench(false)
  configBoardId.value = boards.value[0]?.id ?? ''
  selectedBoardId.value = selectedBoardId.value === boardId ? configBoardId.value : selectedBoardId.value
  syncBoardDefaults()
  syncConfigDrafts()
}

async function createBoard(saveAndConfig = false): Promise<void> {
  actionLoading.value = true
  try {
    const result = boardEditingId.value
      ? await profileService.updateBoard(boardEditingId.value, {
          name: boardDraft.value.name,
          description: boardDraft.value.description,
          isDefault: boardDraft.value.isDefault,
        })
      : await profileService.createBoard(boardDraft.value)
    message[result.ok ? 'success' : 'warning'](result.message)
    if (result.ok && result.board) {
      closeBoardModal()
      await loadWorkbench(false)
      configBoardId.value = result.board.id
      selectedBoardId.value = selectedBoardId.value === result.board.id ? result.board.id : selectedBoardId.value
      if (saveAndConfig) {
        configBoardId.value = result.board.id
        configTab.value = 'list'
        syncConfigDrafts(result.board.id)
      }
    }
  } finally {
    actionLoading.value = false
  }
}

function syncConfigDrafts(boardId = configBoardId.value): void {
  const config = profileService.getBoardConfig(boardId)
  listDraft.value = {
    defaultColumns: [...(config.listConfig?.defaultColumns ?? [])],
    searchableIdTypes: [...(config.listConfig?.searchableIdTypes ?? [])],
    allowLatestId: Boolean(config.listConfig?.allowLatestId),
  }
  detailDraft.value = {
    archiveFields: [...(config.detailConfig?.archiveFields ?? [])],
    overviewComponents: [...(config.detailConfig?.overviewComponents ?? [])],
    enabledTabs: [...(config.detailConfig?.enabledTabs ?? [])],
    globalDescription: config.detailConfig?.globalDescription ?? '',
  }
  behaviorDraft.value = {
    categories: [...(config.behaviorConfig?.categories ?? [])],
    hiddenEvents: [...(config.behaviorConfig?.hiddenEvents ?? [])],
    hiddenProperties: [...(config.behaviorConfig?.hiddenProperties ?? [])],
    platforms: [...(config.behaviorConfig?.platforms ?? [])],
    processes: [...(config.behaviorConfig?.processes ?? [])],
    defaultTimeRange: config.behaviorConfig?.defaultTimeRange ?? '30d',
  }
}

async function saveListConfig(): Promise<void> {
  await profileService.updateListConfig(configBoardId.value, listDraft.value)
  await loadWorkbench(false)
  message.success('检索列表配置已保存')
}

async function saveDetailConfig(): Promise<void> {
  await profileService.updateDetailConfig(configBoardId.value, detailDraft.value)
  await loadWorkbench(false)
  message.success('详情页配置已保存')
}

async function saveBehaviorConfig(): Promise<void> {
  await profileService.updateBehaviorConfig(configBoardId.value, behaviorDraft.value)
  await loadWorkbench(false)
  message.success('行为细查配置已保存')
}

function addBehaviorCategory(): void {
  if (!categoryDraft.value.name.trim()) {
    message.warning('分类名称不能为空')
    return
  }
  if (!categoryDraft.value.events.length) {
    message.warning('至少选择一个行为事件')
    return
  }
  if (behaviorDraft.value.categories.some((category) => category.name === categoryDraft.value.name)) {
    message.warning('同一看板下分类名称不允许重复')
    return
  }
  behaviorDraft.value.categories.push({
    id: `cat-${Date.now()}`,
    name: categoryDraft.value.name,
    tableName: categoryDraft.value.tableName,
    events: [...categoryDraft.value.events],
    description: categoryDraft.value.description,
  })
  categoryDraft.value = { name: '', tableName: 'dwd_user_event_log', events: [], description: '' }
  categoryModalVisible.value = false
}

function removeBehaviorCategory(categoryId: EntityId): void {
  behaviorDraft.value.categories = behaviorDraft.value.categories.filter((category) => category.id !== categoryId)
}

async function loadWorkbench(showLoading = true): Promise<void> {
  if (showLoading) {
    loading.value = true
  }
  try {
    workbench.value = await profileService.getWorkbenchData()
    if (!selectedBoardId.value) {
      setDefaultBoardForSubject('user')
    }
    if (!configBoardId.value) {
      configBoardId.value = selectedBoardId.value || boards.value[0]?.id || ''
    }
    syncBoardDefaults()
    syncConfigDrafts()
  } finally {
    loading.value = false
  }
}

function restoreLinkedQuery(): void {
  const tagId = String(route.query.tagId ?? '')
  const tagValue = String(route.query.tagValue ?? '')
  const segmentId = String(route.query.segmentId ?? '')
  const subject = String(route.query.subject ?? '')
  if (subjects.value.some((item) => item.type === subject)) {
    selectedSubjectType.value = subject as ProfileSubjectType
    handleSubjectChange()
  }
  if (tagId) {
    searchMode.value = 'custom'
    customRule.value = {
      satisfyLogic: 'and',
      satisfyGroups: [
        {
          id: 'link-tag-group',
          name: tagValue ? `标签 ${tagValue}` : '标签联动条件',
          logic: 'and',
          conditions: [],
        },
      ],
      excludeLogic: 'and',
      excludeGroups: [],
      sourceModule: 'tag',
      sourceId: tagId,
      sourceValue: tagValue,
    }
    void executeSearch(true)
  }
  if (segmentId) {
    searchMode.value = 'custom'
    customRule.value = {
      satisfyLogic: 'and',
      satisfyGroups: [
        {
          id: 'link-segment-group',
          name: '分群联动条件',
          logic: 'and',
          conditions: [],
        },
      ],
      excludeLogic: 'and',
      excludeGroups: [],
      sourceModule: 'segment',
      sourceId: segmentId,
    }
    void executeSearch(true)
  }
}

watch(selectedBoardId, () => {
  syncBoardDefaults()
})

watch(configBoardId, (boardId) => {
  syncConfigDrafts(boardId)
})

watch(
  () => route.fullPath,
  async () => {
    if (!workbench.value) {
      return
    }
    if (currentPage.value === 'detail') {
      await loadDetail()
    }
  },
)

watch(page, () => {
  if (hasSearched.value) {
    void executeSearch(false)
  }
})

watch(pageSize, () => {
  if (hasSearched.value) {
    page.value = 1
    void executeSearch(false)
  }
})

onMounted(async () => {
  await loadWorkbench()
  if (currentPage.value === 'detail') {
    await loadDetail()
  } else {
    restoreLinkedQuery()
  }
})
</script>

<template>
  <div class="page-container profile-workbench">
    <n-spin :show="loading">
      <n-alert v-if="noProfilePermission" type="error" class="section-alert">
        <n-space align="center" justify="space-between">
          <span>暂无该个体画像查看权限。</span>
          <n-button size="small" @click="router.push('/dashboard')">返回首页</n-button>
        </n-space>
      </n-alert>

      <n-empty v-else-if="hasNoConfig" description="当前项目尚未完成个体画像配置，请联系管理员在项目中心完成配置。">
        <template #extra>
          <n-space>
            <n-button @click="loadWorkbench()">刷新</n-button>
            <n-button v-if="permissions?.projectConfig" type="primary" @click="router.push('/user-insight/profile-config')">去配置</n-button>
          </n-space>
        </template>
      </n-empty>

      <template v-else>
        <section v-if="currentPage === 'search'">
          <div class="page-heading">
            <div>
              <h1 class="page-title">个体画像</h1>
              <p class="page-description">围绕某一个用户、门店、车辆或商品主体，检索并查看档案、标签、行为、分群和跨主体关系。</p>
            </div>
            <n-space>
              <n-button v-if="permissions?.projectConfig" @click="router.push('/user-insight/profile-config')">
                <template #icon><n-icon><settings-outline /></n-icon></template>
                个体画像配置
              </n-button>
              <n-button @click="openColumnModal">
                <template #icon><n-icon><list-outline /></n-icon></template>
                自定义列
              </n-button>
            </n-space>
          </div>

          <n-card class="section-card">
            <div class="profile-search-toolbar">
              <n-select v-model:value="selectedSubjectType" :options="subjectOptions" class="subject-select" @update:value="handleSubjectChange" />
              <n-select
                v-model:value="selectedBoardId"
                :options="boardOptionsForSubject"
                class="board-select"
                placeholder="选择看板"
                @update:value="handleBoardSelect"
              />
              <n-radio-group :value="searchMode" class="search-mode-toggle" @update:value="handleModeChange">
                <n-radio-button value="exact">精准筛选</n-radio-button>
                <n-radio-button value="custom">自定义筛选</n-radio-button>
              </n-radio-group>
              <span class="muted board-description">{{ currentBoard?.description }}</span>
            </div>

            <n-empty v-if="!boardsForSubject.length" description="当前主体暂无可用个体画像看板，请联系管理员配置。" />
            <template v-else>
              <div v-if="searchMode === 'exact'" class="search-panel-body">
                <n-grid :cols="24" :x-gap="12" :y-gap="12" class="search-grid">
                  <n-gi :span="5">
                    <n-select v-model:value="exactIdType" placeholder="ID类型" :options="idTypeOptions" clearable />
                  </n-gi>
                  <n-gi :span="8">
                    <n-select
                      v-model:value="exactIdValue"
                      :options="recentIdOptions"
                      placeholder="输入 ID 或选择最近查询用户"
                      filterable
                      tag
                      clearable
                      @keyup.enter="executeSearch(true)"
                    />
                  </n-gi>
                  <n-gi :span="6">
                    <n-tooltip>
                      <template #trigger>
                        <n-checkbox v-model:checked="includeLatestId" :disabled="!currentListConfig?.allowLatestId">
                          是否包含当日最新用户ID
                        </n-checkbox>
                      </template>
                      开启后将包含当日最新用户ID，查询耗时可能增加。
                    </n-tooltip>
                  </n-gi>
                  <n-gi :span="5">
                    <n-space justify="end">
                      <n-button :loading="resultLoading" :disabled="!exactIdType || !exactIdValue.trim() || !permissions?.searchProfile" type="primary" @click="executeSearch(true)">
                        <template #icon><n-icon><search-outline /></n-icon></template>
                        查询
                      </n-button>
                      <n-button @click="resetExactSearch">
                        <template #icon><n-icon><refresh-outline /></n-icon></template>
                        重置
                      </n-button>
                    </n-space>
                  </n-gi>
                </n-grid>
              </div>

              <div v-else class="search-panel-body">
                <div class="custom-search-bar">
                  <div>
                    <n-space align="center">
                      <n-button type="primary" @click="customFilterVisible = true">
                        <template #icon><n-icon><add-outline /></n-icon></template>
                        添加筛选
                      </n-button>
                      <n-tag v-if="customSummary" type="info">{{ customSummary }}</n-tag>
                      <span v-else class="muted">通过标签、行为、用户属性、明细数据和已有分群构建圈选规则。</span>
                    </n-space>
                    <n-space v-if="customSummary" class="summary-actions">
                      <n-button size="small" @click="customFilterVisible = true">编辑筛选</n-button>
                      <n-button size="small" @click="clearCustomSearch">清除筛选</n-button>
                      <n-button size="small" :loading="resultLoading" @click="executeSearch(true)">重新查询</n-button>
                    </n-space>
                  </div>
                  <n-space align="center">
                    <n-select v-model:value="secondaryIdType" class="mini-select" placeholder="ID 类型" :options="idTypeOptions" :disabled="!hasSearched" clearable />
                    <n-input v-model:value="secondaryIdValue" placeholder="结果内二次搜索 ID" :disabled="!hasSearched" clearable @keyup.enter="executeSearch(true)" />
                    <n-button :disabled="!hasSearched || !secondaryIdValue.trim()" @click="executeSearch(true)">
                      <template #icon><n-icon><search-outline /></n-icon></template>
                    </n-button>
                    <n-button :disabled="!secondaryIdValue" @click="secondaryIdValue = ''; executeSearch(true)">清空</n-button>
                  </n-space>
                </div>
              </div>
            </template>
          </n-card>

          <n-card class="section-card">
            <template #header>
              <div class="table-header">
                <span>搜索结果</span>
                <span class="muted">{{ resultStatsText }}</span>
              </div>
            </template>
            <n-alert v-if="includeLatestId" type="warning" class="section-alert">
              当前查询包含当日最新用户 ID，耗时可能增加；切换该选项后请重新点击查询。
            </n-alert>
            <n-empty v-if="!hasSearched" description="请输入精准 ID 或配置自定义筛选后查询。" />
            <n-empty v-else-if="!resultRows.length && !resultLoading" description="未找到符合条件的个体，请检查ID或调整筛选条件。">
              <template #extra>
                <n-space>
                  <n-button @click="searchMode === 'exact' ? resetExactSearch() : clearCustomSearch()">重置筛选</n-button>
                  <n-button type="primary" @click="executeSearch(true)">重新查询</n-button>
                </n-space>
              </template>
            </n-empty>
            <template v-else>
              <n-data-table
                v-model:checked-row-keys="selectedRowKeys"
                :columns="resultTableColumns"
                :data="resultRows"
                :loading="resultLoading"
                :row-key="(row) => row.baseId"
                :scroll-x="1600"
              />
              <div class="pagination-bar">
                <span class="muted">可选每页 10、20、50、100 条，切换每页条数后回到第 1 页。</span>
                <n-pagination
                  v-model:page="page"
                  v-model:page-size="pageSize"
                  show-size-picker
                  show-quick-jumper
                  :item-count="resultTotal"
                  :page-sizes="[10, 20, 50, 100]"
                />
              </div>
            </template>
          </n-card>
        </section>

        <section v-else-if="currentPage === 'detail'">
          <n-spin :show="detailLoading">
            <template v-if="detail">
              <div class="detail-header">
                <n-button @click="backToList">
                  <template #icon><n-icon><arrow-back-outline /></n-icon></template>
                  返回
                </n-button>
                <n-space align="center">
                  <n-select
                    v-model:value="selectedBoardId"
                    :options="boardOptionsForSubject"
                    class="detail-board-select"
                    placeholder="选择看板"
                    @update:value="handleBoardSelect"
                  />
                  <n-button quaternary circle @click="toggleDetailFavorite">
                    <template #icon><n-icon><star-outline /></n-icon></template>
                  </n-button>
                </n-space>
              </div>

              <div class="detail-layout">
                <aside class="archive-panel">
                  <n-avatar round :size="56">{{ detail.avatarText }}</n-avatar>
                  <h2>{{ detail.displayName }}</h2>
                  <p>{{ subjectName(detail.subjectType) }} / {{ currentBoard?.name }}</p>
                  <n-divider />
                  <n-empty v-if="!detail.archive.length" description="暂无可展示档案信息" />
                  <n-descriptions v-else :column="1" size="small" label-placement="left">
                    <n-descriptions-item v-for="field in detail.archive" :key="field.key" :label="field.label">
                      {{ permissions?.[field.permission] ? field.value || '-' : '' }}
                    </n-descriptions-item>
                  </n-descriptions>
                  <n-alert type="info" class="small-alert">
                    同一 ID 类型多个值时档案栏最多展示前 30 个；全部 ID 请在关系图谱的身份信息表格查看。
                  </n-alert>
                </aside>

                <main class="detail-main">
                  <div class="global-panel">
                    <div>
                      <h1>{{ detail.displayName }}</h1>
                      <p>{{ currentDetailConfig?.globalDescription || detail.globalDescription }}</p>
                    </div>
                    <n-space>
                      <n-tag type="info">{{ subjectName(detail.subjectType) }}</n-tag>
                      <n-tag>{{ detail.baseId }}</n-tag>
                    </n-space>
                  </div>

                  <n-tabs v-model:value="detailActiveTab" type="line" animated>
                    <n-tab-pane v-if="currentDetailConfig?.enabledTabs.includes('overview')" name="overview" tab="客户概览">
                      <section class="profile-panel">
                        <div class="panel-title">
                          <span>客户重点信息</span>
                          <n-space>
                            <n-button size="small" :disabled="overviewScrollIndex === 0" @click="overviewScrollIndex = Math.max(0, overviewScrollIndex - 1)">
                              <template #icon><n-icon><chevron-back-outline /></n-icon></template>
                            </n-button>
                            <n-button size="small" :disabled="overviewScrollIndex + 5 >= visibleOverviewCards.length" @click="overviewScrollIndex += 1">
                              <template #icon><n-icon><chevron-forward-outline /></n-icon></template>
                            </n-button>
                          </n-space>
                        </div>
                        <div class="overview-card-row">
                          <div v-for="card in shownOverviewCards" :key="card.id" class="overview-card">
                            <span>{{ card.title }}</span>
                            <strong>{{ card.value }}</strong>
                            <p>{{ card.description }}</p>
                            <small>{{ formatDateTime(card.updatedAt) }}</small>
                          </div>
                        </div>
                      </section>

                      <section v-if="journeyNodes.length" class="profile-panel">
                        <div class="panel-title">客户旅程</div>
                        <div class="journey">
                          <button
                            v-for="node in journeyNodes"
                            :key="node.id"
                            class="journey-node"
                            :class="[node.status, { active: openedJourneyNodeId === node.id }]"
                            @click="openedJourneyNodeId = openedJourneyNodeId === node.id ? '' : node.id"
                          >
                            <span>{{ node.name }}</span>
                            <strong>{{ node.time || '暂无数据' }}</strong>
                            <small>{{ node.description }}</small>
                          </button>
                        </div>
                        <div v-for="node in journeyNodes" v-show="openedJourneyNodeId === node.id" :key="`${node.id}-detail`" class="journey-detail">
                          <n-tag v-for="item in node.details" :key="item.label" type="info">{{ item.label }}：{{ item.value }}</n-tag>
                          <span v-if="!node.details.length" class="muted">该节点暂无关联详情。</span>
                        </div>
                      </section>

                      <n-grid :cols="3" :x-gap="16" :y-gap="16">
                        <n-gi>
                          <section class="profile-panel compact-panel">
                            <div class="panel-title">客户关键标签</div>
                            <div v-for="group in tagGroups" :key="group.id" class="tag-group">
                              <div class="group-title">
                                <span>{{ group.name }}</span>
                                <n-button v-if="group.tags.length > 10" size="tiny" text type="primary" @click="openMoreTags(group.name, group.tags)">更多</n-button>
                              </div>
                              <n-space>
                                <n-tag v-for="tag in group.tags.slice(0, 10)" :key="tag.id" size="small" type="info" @click="goTagDetail(tag)">
                                  {{ tag.name }}：{{ tag.value }}
                                </n-tag>
                              </n-space>
                            </div>
                          </section>
                        </n-gi>
                        <n-gi>
                          <section class="profile-panel compact-panel">
                            <div class="panel-title">所在重点分群</div>
                            <n-space>
                              <n-tag
                                v-for="segment in detail.segments.slice(0, 10)"
                                :key="segment.id"
                                size="small"
                                type="success"
                                @click="goSegmentDetail(segment.id, segment.permission, segment.deleted)"
                              >
                                {{ segment.name }}
                              </n-tag>
                              <n-button v-if="detail.segments.length > 10" size="tiny" text type="primary" @click="openMoreSegments('所在重点分群', detail.segments)">更多</n-button>
                            </n-space>
                          </section>
                        </n-gi>
                        <n-gi>
                          <section class="profile-panel compact-panel">
                            <div class="panel-title">重点身份标识</div>
                            <n-space>
                              <n-tag v-for="identity in detail.identities.slice(0, 6)" :key="`${identity.idType}-${identity.value}`" size="small" @click="focusIdentity(identity.idType)">
                                {{ identity.idTypeLabel }}：{{ identity.maskedValue }}
                              </n-tag>
                            </n-space>
                          </section>
                        </n-gi>
                      </n-grid>
                    </n-tab-pane>

                    <n-tab-pane v-if="currentDetailConfig?.enabledTabs.includes('behavior')" name="behavior" tab="行为细查">
                      <section class="profile-panel">
                        <n-grid :cols="6" :x-gap="12" :y-gap="12">
                          <n-gi><n-select v-model:value="behaviorFilters.platform" :options="behaviorPlatformOptions" placeholder="平台" /></n-gi>
                          <n-gi><n-select v-model:value="behaviorFilters.process" :options="behaviorProcessOptions" placeholder="流程" /></n-gi>
                          <n-gi><n-select v-model:value="behaviorFilters.category" :options="behaviorCategoryOptions" placeholder="事件分类" /></n-gi>
                          <n-gi><n-select v-model:value="behaviorFilters.eventName" :options="behaviorEventOptions" placeholder="事件" /></n-gi>
                          <n-gi>
                            <n-select
                              v-model:value="behaviorFilters.timeRange"
                              :options="[
                                { label: '今天', value: 'today' },
                                { label: '昨天', value: 'yesterday' },
                                { label: '最近 7 天', value: '7d' },
                                { label: '最近 30 天', value: '30d' },
                                { label: '最近 90 天', value: '90d' },
                                { label: '自定义', value: 'custom' },
                              ]"
                            />
                          </n-gi>
                          <n-gi v-if="behaviorFilters.timeRange === 'custom'" :span="2">
                            <n-date-picker
                              v-model:value="behaviorCustomRange"
                              type="datetimerange"
                              clearable
                              :is-date-disabled="(time: number) => time > Date.now()"
                            />
                          </n-gi>
                          <n-gi>
                            <n-space justify="end">
                              <n-button @click="addBehaviorPropertyFilter">添加属性条件</n-button>
                              <n-button type="primary" :loading="behaviorLoading" @click="queryBehavior(true)">查询</n-button>
                              <n-button @click="resetBehaviorFilters">重置</n-button>
                            </n-space>
                          </n-gi>
                        </n-grid>
                        <div v-for="filter in behaviorPropertyFilters" :key="filter.id" class="property-filter-row">
                          <n-input v-model:value="filter.label" placeholder="事件属性" />
                          <n-select v-model:value="filter.operator" :options="operatorOptions" />
                          <n-input v-model:value="filter.value" placeholder="属性值" />
                          <n-button text type="error" @click="removeBehaviorPropertyFilter(filter.id)">删除</n-button>
                        </div>
                      </section>

                      <section class="profile-panel behavior-panel">
                        <n-spin :show="behaviorLoading">
                          <n-empty v-if="!behaviorRows.length && !behaviorLoading" description="当前条件下暂无行为记录。">
                            <template #extra>
                              <n-button @click="resetBehaviorFilters">重置筛选</n-button>
                            </template>
                          </n-empty>
                          <div v-for="group in groupedBehaviorRows()" :key="group.date" class="timeline-date">
                            <div class="timeline-date-title">{{ group.date }}</div>
                            <div v-for="event in group.rows" :key="event.id" class="event-card">
                              <div class="event-time">{{ formatDateTime(event.occurredAt).slice(11) }}</div>
                              <div class="event-content">
                                <div class="event-title">
                                  <strong>{{ event.displayName }}</strong>
                                  <n-tag size="small">{{ event.platform }}</n-tag>
                                  <n-tag size="small" type="info">{{ event.categoryName }}</n-tag>
                                  <span class="muted">{{ event.source }}</span>
                                </div>
                                <p>{{ event.summary }}</p>
                                <n-space>
                                  <n-tag v-for="property in event.keyProperties" :key="property.label" size="small">
                                    {{ property.label }}：{{ property.value }}
                                  </n-tag>
                                  <n-button size="tiny" text type="primary" @click="toggleEventDetail(event.id)">
                                    {{ expandedEventIds.includes(event.id) ? '收起详情' : '详情' }}
                                  </n-button>
                                </n-space>
                                <div v-if="expandedEventIds.includes(event.id)" class="event-properties">
                                  <n-descriptions :column="2" size="small">
                                    <n-descriptions-item v-for="property in event.properties" :key="property.field" :label="property.label">
                                      {{ property.value }}
                                    </n-descriptions-item>
                                  </n-descriptions>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div class="load-more-row">
                            <n-button v-if="behaviorHasMore" :loading="behaviorLoading" @click="queryBehavior(false)">加载更多</n-button>
                            <span v-else-if="behaviorRows.length" class="muted">没有更多行为了。</span>
                          </div>
                        </n-spin>
                      </section>
                    </n-tab-pane>

                    <n-tab-pane v-if="currentDetailConfig?.enabledTabs.includes('tags')" name="tags" tab="用户标签">
                      <section class="profile-panel">
                        <div class="tag-toolbar">
                          <n-radio-group v-model:value="tagDisplayMode" size="small">
                            <n-radio value="tree">按目录展示</n-radio>
                            <n-radio value="flat">平铺展示</n-radio>
                          </n-radio-group>
                          <n-space>
                            <n-select
                              v-model:value="tagSort"
                              class="tag-sort"
                              :options="[
                                { label: '按更新时间排序', value: 'updatedAt' },
                                { label: '按标签名称排序', value: 'name' },
                                { label: '按标签分类排序', value: 'category' },
                              ]"
                            />
                            <n-input v-model:value="tagKeyword" class="tag-search" placeholder="搜索标签名称" clearable @keyup.enter="tagKeyword = tagKeyword.trim()" />
                          </n-space>
                        </div>
                        <div class="tag-layout" :class="{ flat: tagDisplayMode === 'flat' }">
                          <aside v-if="tagDisplayMode === 'tree'" class="tag-tree">
                            <button :class="{ active: selectedTagGroup === 'all' }" @click="selectedTagGroup = 'all'">全部标签</button>
                            <button v-for="group in tagGroups" :key="group.id" :class="{ active: selectedTagGroup === group.id }" @click="selectedTagGroup = group.id">
                              {{ group.name }} <span>{{ group.tags.length }}</span>
                            </button>
                          </aside>
                          <div class="tag-list">
                            <n-empty v-if="!filteredTags.length" description="目录无标签或未找到匹配标签。" />
                            <div v-for="tag in filteredTags" :key="tag.id" class="tag-item" @click="goTagDetail(tag)">
                              <div>
                                <strong>{{ tag.name }}</strong>
                                <p>{{ tag.description }}</p>
                              </div>
                              <n-space>
                                <n-tag type="info">{{ tag.value }}</n-tag>
                                <n-tag>{{ tag.type }}</n-tag>
                                <span class="muted">{{ tag.source }} / {{ formatDateTime(tag.updatedAt) }}</span>
                              </n-space>
                            </div>
                          </div>
                        </div>
                      </section>
                    </n-tab-pane>

                    <n-tab-pane v-if="currentDetailConfig?.enabledTabs.includes('relation')" name="relation" tab="关系图谱" :disabled="!canShowRelationTab">
                      <template #tab>
                        <n-tooltip v-if="!canShowRelationTab">
                          <template #trigger><span>关系图谱</span></template>
                          当前项目未开通多主体能力或暂无关系图谱查看权限。
                        </n-tooltip>
                        <span v-else>关系图谱</span>
                      </template>
                      <section class="profile-panel relation-panel" :class="{ fullscreen: relationFullscreen }">
                        <n-spin :show="relationLoading">
                          <n-empty v-if="!relationGraph?.nodes.length" :description="relationGraph?.emptyReason || '当前主体暂无可展示关系图谱，请确认是否已配置多主体关系。'" />
                          <template v-else>
                            <div class="relation-toolbar">
                              <n-radio-group v-model:value="relationViewMode" size="small">
                                <n-radio value="graph">图谱视图</n-radio>
                                <n-radio value="table">表格视图</n-radio>
                              </n-radio-group>
                              <n-space>
                                <n-button size="small" @click="zoomRelation(0.1)">放大</n-button>
                                <n-button size="small" @click="zoomRelation(-0.1)">缩小</n-button>
                                <n-button size="small" @click="fitRelation">适应画布</n-button>
                                <n-button size="small" @click="relationFullscreen = !relationFullscreen">
                                  <template #icon><n-icon><component :is="relationFullscreen ? ContractOutline : ExpandOutline" /></n-icon></template>
                                  {{ relationFullscreen ? '退出全屏' : '全屏' }}
                                </n-button>
                                <n-button size="small" @click="relationViewMode = 'table'">转为表格</n-button>
                              </n-space>
                            </div>
                            <div v-if="relationViewMode === 'graph'" class="graph-canvas" :style="{ transform: `scale(${relationZoom})` }">
                              <svg class="edge-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
                                <line
                                  v-for="edge in relationGraph.edges"
                                  :key="edge.id"
                                  :x1="relationGraph.nodes.find((node) => node.id === edge.source)?.x"
                                  :y1="relationGraph.nodes.find((node) => node.id === edge.source)?.y"
                                  :x2="relationGraph.nodes.find((node) => node.id === edge.target)?.x"
                                  :y2="relationGraph.nodes.find((node) => node.id === edge.target)?.y"
                                  stroke="#9ca3af"
                                  stroke-width="0.8"
                                  marker-end="url(#arrow)"
                                  @click="selectedRelationEdge = edge"
                                />
                                <defs>
                                  <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                                    <path d="M0,0 L6,3 L0,6 Z" fill="#9ca3af" />
                                  </marker>
                                </defs>
                              </svg>
                              <button
                                v-for="node in relationGraph.nodes"
                                :key="node.id"
                                class="graph-node"
                                :style="{ left: `${node.x}%`, top: `${node.y}%`, borderColor: node.color, background: `${node.color}14` }"
                                @click="node.subjectType === detail.subjectType && node.idValue === detail.baseId ? undefined : jumpRelationDetail(node.subjectType, node.idValue)"
                              >
                                <span>{{ node.subjectName }}</span>
                                <strong>{{ node.label }}</strong>
                                <small>{{ node.idValue }}</small>
                              </button>
                              <button
                                v-for="edge in relationGraph.edges"
                                :key="`${edge.id}-label`"
                                class="edge-label"
                                @click="selectedRelationEdge = edge"
                              >
                                {{ edge.relationName }}
                              </button>
                            </div>
                            <n-alert v-if="selectedRelationEdge" type="info" class="section-alert">
                              {{ selectedRelationEdge.relationName }} / {{ selectedRelationEdge.sourceName }} / {{ formatDateTime(selectedRelationEdge.updatedAt) }} / {{ selectedRelationEdge.relationId }}
                            </n-alert>
                            <n-data-table v-if="relationViewMode === 'table'" :columns="relationTableColumns" :data="relationGraph.tableRows" :pagination="false" :scroll-x="1100" />
                            <n-divider />
                            <div class="panel-title">身份信息表格</div>
                            <n-data-table
                              :row-class-name="(row) => (row.idType === focusIdentityType ? 'focused-row' : '')"
                              :columns="identityColumns"
                              :data="relationGraph.identities"
                              :pagination="false"
                              :scroll-x="900"
                            />
                          </template>
                        </n-spin>
                      </section>
                    </n-tab-pane>
                  </n-tabs>
                </main>
              </div>
            </template>
            <n-empty v-else description="当前个体暂无可展示画像信息。" />
          </n-spin>
        </section>

        <section v-else-if="currentPage === 'config'">
          <div class="page-heading">
            <div>
              <h1 class="page-title">个体画像配置</h1>
              <p class="page-description">配置主体看板、检索列表、详情页展示、行为细查规则、事件展示名与属性字典。</p>
            </div>
            <n-space>
              <n-button @click="router.push('/user-insight/profiles')">
                <template #icon><n-icon><open-outline /></n-icon></template>
                前往个体画像
              </n-button>
              <n-button type="primary" @click="openBoardModal()">
                <template #icon><n-icon><add-outline /></n-icon></template>
                新建看板
              </n-button>
            </n-space>
          </div>

          <n-card class="section-card">
            <n-space align="center">
              <span class="form-label">配置看板</span>
              <n-select v-model:value="configBoardId" class="config-board-select" :options="boardSelectOptions" />
            </n-space>
            <n-tabs v-model:value="configTab" type="line" animated class="config-tabs">
              <n-tab-pane name="boards" tab="看板管理">
                <n-data-table :columns="boardColumns" :data="boards" :pagination="{ pageSize: 10 }" :scroll-x="980" />
              </n-tab-pane>
              <n-tab-pane name="list" tab="检索列表配置">
                <n-form label-placement="left" label-width="130">
                  <n-form-item label="默认列表字段">
                    <n-checkbox-group v-model:value="listDraft.defaultColumns">
                      <n-space>
                        <n-checkbox v-for="column in profileService.getListConfig(configBoardId)?.availableColumns ?? []" :key="column.key" :value="column.key">
                          {{ column.title }}
                        </n-checkbox>
                      </n-space>
                    </n-checkbox-group>
                  </n-form-item>
                  <n-form-item label="可检索 ID 类型">
                    <n-checkbox-group v-model:value="listDraft.searchableIdTypes">
                      <n-space>
                        <n-checkbox v-for="idType in profileService.getSubject(profileService.getBoard(configBoardId)?.subjectType ?? 'user')?.idTypes ?? []" :key="idType.id" :value="idType.id">
                          {{ idType.label }}
                        </n-checkbox>
                      </n-space>
                    </n-checkbox-group>
                  </n-form-item>
                  <n-form-item label="包含当日最新 ID">
                    <n-switch v-model:value="listDraft.allowLatestId" />
                  </n-form-item>
                  <n-button type="primary" @click="saveListConfig">
                    <template #icon><n-icon><save-outline /></n-icon></template>
                    保存配置
                  </n-button>
                </n-form>
              </n-tab-pane>
              <n-tab-pane name="detail" tab="详情页配置">
                <n-form label-placement="left" label-width="130">
                  <n-form-item label="档案栏字段">
                    <n-checkbox-group v-model:value="detailDraft.archiveFields">
                      <n-space>
                        <n-checkbox v-for="field in ['avatar', 'name', 'gender', 'age', 'occupation', 'mobile', 'memberLevel', 'city', 'primaryIds', 'basicTags']" :key="field" :value="field">
                          {{ field }}
                        </n-checkbox>
                      </n-space>
                    </n-checkbox-group>
                  </n-form-item>
                  <n-form-item label="客户概览组件">
                    <n-checkbox-group v-model:value="detailDraft.overviewComponents">
                      <n-space>
                        <n-checkbox v-for="component in ['spend', 'activity', 'leadIntent', 'serviceRisk', 'coupon', 'storeVisit']" :key="component" :value="component">
                          {{ component }}
                        </n-checkbox>
                      </n-space>
                    </n-checkbox-group>
                  </n-form-item>
                  <n-form-item label="启用 Tab">
                    <n-checkbox-group v-model:value="detailDraft.enabledTabs">
                      <n-space>
                        <n-checkbox v-for="tab in ['overview', 'behavior', 'tags', 'relation']" :key="tab" :value="tab">
                          {{ profileTabLabels[tab] }}
                        </n-checkbox>
                      </n-space>
                    </n-checkbox-group>
                  </n-form-item>
                  <n-form-item label="全局描述">
                    <n-input v-model:value="detailDraft.globalDescription" type="textarea" placeholder="详情页全局描述文案，前台只读展示" />
                  </n-form-item>
                  <n-button type="primary" @click="saveDetailConfig">
                    <template #icon><n-icon><save-outline /></n-icon></template>
                    保存配置
                  </n-button>
                </n-form>
              </n-tab-pane>
              <n-tab-pane name="behavior" tab="行为细查">
                <n-space vertical size="large">
                  <div class="panel-title">
                    <span>行为分类配置</span>
                    <n-button size="small" type="primary" @click="categoryModalVisible = true">添加</n-button>
                  </div>
                  <div v-for="category in behaviorDraft.categories" :key="category.id" class="config-row">
                    <div>
                      <strong>{{ category.name }}</strong>
                      <p>{{ category.tableName }} / {{ category.description }}</p>
                      <n-space>
                        <n-tag v-for="event in category.events" :key="event" size="small">{{ eventDisplayName(event) }}</n-tag>
                      </n-space>
                    </div>
                    <n-button text type="error" @click="removeBehaviorCategory(category.id)">删除</n-button>
                  </div>
                  <n-form label-placement="left" label-width="130">
                    <n-form-item label="过滤事件">
                      <n-select
                        v-model:value="behaviorDraft.hiddenEvents"
                        multiple
                        filterable
                        tag
                        placeholder="选择不展示的事件"
                        :options="behaviorEventOptions.filter((item) => item.value !== 'all')"
                      />
                    </n-form-item>
                    <n-form-item label="过滤属性">
                      <n-select
                        v-model:value="behaviorDraft.hiddenProperties"
                        multiple
                        filterable
                        tag
                        placeholder="例如 item_id、IP 地址、current_id、设备型号、user_agent、广告计划 ID、schedule_id、event_time"
                        :options="[
                          { label: 'IP 地址', value: 'ip' },
                          { label: 'user_agent', value: 'user_agent' },
                          { label: 'current_id', value: 'current_id' },
                          { label: 'schedule_id', value: 'schedule_id' },
                          { label: 'event_time', value: 'event_time' },
                          { label: '广告计划 ID', value: 'campaign_id' },
                        ]"
                      />
                    </n-form-item>
                    <n-form-item label="默认时间范围">
                      <n-select
                        v-model:value="behaviorDraft.defaultTimeRange"
                        :options="[
                          { label: '今天', value: 'today' },
                          { label: '昨天', value: 'yesterday' },
                          { label: '最近 7 天', value: '7d' },
                          { label: '最近 30 天', value: '30d' },
                          { label: '最近 90 天', value: '90d' },
                        ]"
                      />
                    </n-form-item>
                    <n-button type="primary" @click="saveBehaviorConfig">
                      <template #icon><n-icon><save-outline /></n-icon></template>
                      保存配置
                    </n-button>
                  </n-form>
                </n-space>
              </n-tab-pane>
              <n-tab-pane name="metadata" tab="展示名与字典">
                <n-grid :cols="3" :x-gap="16" :y-gap="16">
                  <n-gi>
                    <section class="metadata-box">
                      <h3>事件名称展示名</h3>
                      <p>Finder 数据管理 > 一般事件，或 CDP 数据融合 > 元数据管理 > 事件名称。</p>
                      <n-tag>gmp_sdk_logs -> GMP触达</n-tag>
                    </section>
                  </n-gi>
                  <n-gi>
                    <section class="metadata-box">
                      <h3>事件属性展示名</h3>
                      <p>task_id、task_type、status_code、send_id、sub_task_id、channel_type、channel_id 已配置中文名。</p>
                    </section>
                  </n-gi>
                  <n-gi>
                    <section class="metadata-box">
                      <h3>属性值字典</h3>
                      <p>原始值匹配成功展示业务值；匹配失败展示原始值；字典失败不影响原始值展示。</p>
                    </section>
                  </n-gi>
                </n-grid>
                <n-alert type="info" class="section-alert">
                  行为细查前台展示会优先使用事件展示名、属性展示名和属性值字典，同时继续遵守事件过滤、属性过滤与资源权限。
                </n-alert>
              </n-tab-pane>
              <n-tab-pane name="audit" tab="审计日志">
                <n-alert type="info" class="section-alert">
                  个体检索、详情查看、行为细查、关系图谱和收藏操作都会记录审计日志；当前演示环境持久化在浏览器本地存储，后续可直接迁移到服务端审计表。
                </n-alert>
                <n-data-table :columns="auditColumns" :data="workbench?.auditLogs ?? []" :pagination="{ pageSize: 10 }" :scroll-x="1260" />
              </n-tab-pane>
            </n-tabs>
          </n-card>
        </section>
      </template>
    </n-spin>

    <n-modal v-model:show="customFilterVisible" preset="card" title="添加筛选" class="wide-modal">
      <n-space vertical size="large">
        <n-alert type="info">最终结果 = 满足条件结果 - 排除条件结果；组内和组间均支持 AND / OR。</n-alert>
        <section class="rule-section">
          <div class="panel-title">
            <span>满足条件区</span>
            <n-space>
              <n-radio-group v-model:value="customRule.satisfyLogic" size="small">
                <n-radio value="and">组间且</n-radio>
                <n-radio value="or">组间或</n-radio>
              </n-radio-group>
              <n-button size="small" @click="addConditionGroup('satisfy')">添加条件组</n-button>
            </n-space>
          </div>
          <div v-for="group in customRule.satisfyGroups" :key="group.id" class="rule-group">
            <div class="rule-group-header">
              <n-input v-model:value="group.name" size="small" class="group-name-input" />
              <n-radio-group v-model:value="group.logic" size="small">
                <n-radio value="and">且</n-radio>
                <n-radio value="or">或</n-radio>
              </n-radio-group>
              <n-button size="small" @click="addCondition(group)">添加条件</n-button>
              <n-button size="small" text type="error" @click="removeConditionGroup('satisfy', group.id)">删除条件组</n-button>
            </div>
            <div v-for="(condition, index) in group.conditions" :key="condition.id" class="condition-row">
              <n-select :value="conditionCatalogId(condition)" :options="conditionCatalogOptions" @update:value="(value) => replaceCondition(group, index, String(value))" />
              <n-select v-model:value="condition.operator" :options="operatorOptions" />
              <n-input :value="String(condition.value ?? '')" placeholder="条件值" @update:value="(value) => (condition.value = value)" />
              <n-button text type="error" @click="removeCondition(group, condition.id)">删除</n-button>
            </div>
          </div>
        </section>

        <section class="rule-section">
          <div class="panel-title">
            <span>排除条件区</span>
            <n-space>
              <n-radio-group v-model:value="customRule.excludeLogic" size="small">
                <n-radio value="and">组间且</n-radio>
                <n-radio value="or">组间或</n-radio>
              </n-radio-group>
              <n-button size="small" @click="addConditionGroup('exclude')">添加排除条件</n-button>
            </n-space>
          </div>
          <n-empty v-if="!customRule.excludeGroups.length" description="排除条件可为空，为空时不执行剔除。" />
          <div v-for="group in customRule.excludeGroups" :key="group.id" class="rule-group">
            <div class="rule-group-header">
              <n-input v-model:value="group.name" size="small" class="group-name-input" />
              <n-radio-group v-model:value="group.logic" size="small">
                <n-radio value="and">且</n-radio>
                <n-radio value="or">或</n-radio>
              </n-radio-group>
              <n-button size="small" @click="addCondition(group)">添加条件</n-button>
              <n-button size="small" text type="error" @click="removeConditionGroup('exclude', group.id)">删除排除条件</n-button>
            </div>
            <div v-for="(condition, index) in group.conditions" :key="condition.id" class="condition-row">
              <n-select :value="conditionCatalogId(condition)" :options="conditionCatalogOptions" @update:value="(value) => replaceCondition(group, index, String(value))" />
              <n-select v-model:value="condition.operator" :options="operatorOptions" />
              <n-input :value="String(condition.value ?? '')" placeholder="条件值" @update:value="(value) => (condition.value = value)" />
              <n-button text type="error" @click="removeCondition(group, condition.id)">删除</n-button>
            </div>
          </div>
        </section>

        <n-alert type="success">
          <n-space align="center" justify="space-between">
            <span>数量预估：{{ estimateCount }} 人</span>
            <n-button size="small" :loading="estimateLoading" @click="estimateCustomRule">预估数量</n-button>
          </n-space>
        </n-alert>
      </n-space>
      <template #footer>
        <n-space justify="end">
          <n-button @click="customFilterVisible = false">取消</n-button>
          <n-button @click="customRule = profileService.buildDefaultRule()">清空</n-button>
          <n-button :loading="estimateLoading" @click="estimateCustomRule">预估数量</n-button>
          <n-button type="primary" @click="confirmCustomFilter">确定</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="columnModalVisible" preset="card" title="自定义列" class="medium-modal">
      <n-space vertical>
        <n-input v-model:value="columnSearch" placeholder="搜索字段" clearable />
        <n-checkbox-group v-model:value="columnDraft">
          <div class="column-picker">
            <div
              v-for="column in filteredColumnOptions"
              :key="column.key"
              class="column-picker-row"
              :class="{ dragging: draggingColumnKey === column.key }"
              draggable="true"
              @dragstart="draggingColumnKey = column.key"
              @dragover.prevent
              @drop="dropColumn(column.key)"
            >
              <n-checkbox :value="column.key" :disabled="column.required">{{ column.title }}</n-checkbox>
              <n-space v-if="columnDraft.includes(column.key)" size="small">
                <n-button size="tiny" @click="moveColumn(column.key, -1)">上移</n-button>
                <n-button size="tiny" @click="moveColumn(column.key, 1)">下移</n-button>
              </n-space>
            </div>
          </div>
        </n-checkbox-group>
      </n-space>
      <template #footer>
        <n-space justify="space-between">
          <n-button @click="restoreDefaultColumns">恢复默认</n-button>
          <n-space>
            <n-button @click="columnModalVisible = false">取消</n-button>
            <n-button type="primary" @click="saveColumns">确定</n-button>
          </n-space>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="boardModalVisible" preset="card" :title="boardEditingId ? '编辑看板' : '新建看板'" class="medium-modal">
      <n-form label-placement="left" label-width="110">
        <n-form-item label="看板名称" required>
          <n-input v-model:value="boardDraft.name" placeholder="用于前台切换看板" />
        </n-form-item>
        <n-form-item label="主体" required>
          <n-select v-model:value="boardDraft.subjectType" :options="subjectOptions" :disabled="Boolean(boardEditingId)" />
        </n-form-item>
        <n-form-item label="描述">
          <n-input v-model:value="boardDraft.description" type="textarea" placeholder="看板说明" />
        </n-form-item>
        <n-form-item label="是否默认看板">
          <n-switch v-model:value="boardDraft.isDefault" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="closeBoardModal">取消</n-button>
          <n-button :loading="actionLoading" @click="createBoard(false)">{{ boardEditingId ? '保存' : '确定' }}</n-button>
          <n-button type="primary" :loading="actionLoading" @click="createBoard(true)">保存并配置</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="categoryModalVisible" preset="card" title="添加分类" class="medium-modal">
      <n-form label-placement="left" label-width="100">
        <n-form-item label="分类名称" required>
          <n-input v-model:value="categoryDraft.name" />
        </n-form-item>
        <n-form-item label="行为表" required>
          <n-select
            v-model:value="categoryDraft.tableName"
            :options="[
              { label: 'dwd_user_event_log', value: 'dwd_user_event_log' },
              { label: 'dwd_order_detail', value: 'dwd_order_detail' },
              { label: 'dwd_service_event_log', value: 'dwd_service_event_log' },
            ]"
          />
        </n-form-item>
        <n-form-item label="行为事件" required>
          <n-select
            v-model:value="categoryDraft.events"
            multiple
            :options="[
              { label: '广告点击', value: 'ad_click' },
              { label: '微信文章阅读', value: 'wechat_article_read' },
              { label: 'GMP触达', value: 'gmp_sdk_logs' },
              { label: '小程序浏览', value: 'miniapp_browse' },
              { label: '试驾预约', value: 'test_drive_book' },
              { label: '订单提交', value: 'order_submit' },
            ]"
          />
        </n-form-item>
        <n-form-item label="描述">
          <n-input v-model:value="categoryDraft.description" type="textarea" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="categoryModalVisible = false">取消</n-button>
          <n-button type="primary" @click="addBehaviorCategory">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-drawer v-model:show="moreDrawerVisible" :width="520" placement="right">
      <n-drawer-content :title="moreDrawerTitle">
        <n-space v-if="moreDrawerTags.length">
          <n-tag v-for="tag in moreDrawerTags" :key="tag.id" type="info" @click="goTagDetail(tag)">
            {{ tag.name }}：{{ tag.value }}
          </n-tag>
        </n-space>
        <n-space v-else>
          <n-tag v-for="segment in moreDrawerSegments" :key="segment.id" type="success" @click="goSegmentDetail(segment.id, segment.permission, segment.deleted)">
            {{ segment.name }}
          </n-tag>
        </n-space>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<style scoped lang="scss">
.profile-workbench {
  color: #1f2937;
}

.page-heading,
.detail-header,
.table-header,
.pagination-bar,
.custom-search-bar,
.panel-title,
.relation-toolbar,
.tag-toolbar,
.rule-group-header,
.column-picker-row,
.config-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.section-card,
.section-alert,
.config-tabs,
.summary-actions {
  margin-top: 16px;
}

.subject-select {
  width: 100%;
}

.profile-search-toolbar {
  display: grid;
  grid-template-columns: minmax(220px, 1.15fr) minmax(180px, 0.9fr) 220px minmax(160px, 1fr);
  gap: 12px;
  align-items: center;
}

.board-select,
.detail-board-select {
  width: 100%;
}

.detail-board-select {
  min-width: 260px;
}

.search-mode-toggle {
  display: flex;
  width: 100%;
}

.search-mode-toggle :deep(.n-radio-button) {
  flex: 1;
  text-align: center;
}

.board-description {
  justify-self: end;
  text-align: right;
  line-height: 1.5;
}

.search-panel-body {
  margin-top: 12px;
}

.config-board-select {
  width: 360px;
}

.mini-select {
  width: 150px;
}

.inline-tag {
  margin-left: 8px;
}

.muted,
.subtle {
  color: #6b7280;
  font-size: 13px;
}

.subtle {
  font-size: 12px;
}

.search-grid {
  padding-top: 0;
}

@media (max-width: 900px) {
  .profile-search-toolbar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .board-description {
    justify-self: start;
    text-align: left;
  }
}

.pagination-bar {
  margin-top: 16px;
}

.clamp-text {
  display: inline-block;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}

.wide-modal {
  width: min(1080px, 92vw);
}

.medium-modal {
  width: min(720px, 92vw);
}

.rule-section {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  background: #f9fafb;
}

.rule-group {
  margin-top: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  background: white;
}

.group-name-input {
  max-width: 180px;
}

.condition-row,
.property-filter-row {
  display: grid;
  grid-template-columns: 1.2fr 0.9fr 1fr auto;
  gap: 10px;
  align-items: center;
  margin-top: 10px;
}

.column-picker {
  max-height: 420px;
  overflow: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.column-picker-row {
  min-height: 44px;
  padding: 8px 12px;
  border-bottom: 1px solid #eef2f7;
  cursor: grab;
}

.column-picker-row:last-child {
  border-bottom: 0;
}

.column-picker-row.dragging {
  background: #eff6ff;
}

.detail-layout {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 16px;
  margin-top: 16px;
}

.archive-panel,
.global-panel,
.profile-panel {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
}

.archive-panel {
  align-self: start;
  padding: 18px;
  position: sticky;
  top: 16px;
}

.archive-panel h2 {
  margin: 12px 0 4px;
  font-size: 20px;
}

.archive-panel p,
.global-panel p,
.overview-card p,
.metadata-box p,
.config-row p,
.tag-item p,
.event-content p {
  margin: 4px 0 0;
  color: #6b7280;
  line-height: 1.6;
}

.small-alert {
  margin-top: 14px;
}

.detail-main {
  min-width: 0;
}

.global-panel {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 18px;
  margin-bottom: 16px;
}

.global-panel h1 {
  margin: 0;
  font-size: 24px;
}

.profile-panel {
  padding: 16px;
  margin-bottom: 16px;
}

.compact-panel {
  min-height: 190px;
}

.panel-title {
  margin-bottom: 12px;
  font-weight: 650;
}

.overview-card-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(160px, 1fr));
  gap: 12px;
  overflow-x: auto;
}

.overview-card {
  min-height: 142px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 14px;
  background: #f8fafc;
}

.overview-card span,
.overview-card small {
  color: #6b7280;
}

.overview-card strong {
  display: block;
  margin-top: 10px;
  font-size: 24px;
}

.journey {
  display: grid;
  grid-template-columns: repeat(5, minmax(160px, 1fr));
  gap: 12px;
  overflow-x: auto;
}

.journey-node {
  min-height: 116px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 12px;
  background: white;
  text-align: left;
  cursor: pointer;
}

.journey-node span,
.journey-node strong,
.journey-node small {
  display: block;
}

.journey-node.done {
  border-color: #16a34a;
}

.journey-node.current {
  border-color: #2563eb;
  background: #eff6ff;
}

.journey-node.pending,
.journey-node.empty {
  color: #6b7280;
  background: #f9fafb;
}

.journey-node.active {
  box-shadow: 0 0 0 2px #bfdbfe;
}

.journey-detail {
  margin-top: 12px;
}

.tag-group + .tag-group {
  margin-top: 12px;
}

.group-title {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #374151;
  font-weight: 600;
}

.behavior-panel {
  min-height: 360px;
}

.timeline-date + .timeline-date {
  margin-top: 18px;
}

.timeline-date-title {
  margin-bottom: 10px;
  color: #374151;
  font-weight: 700;
}

.event-card {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 14px;
  padding: 12px 0;
  border-top: 1px solid #eef2f7;
}

.event-time {
  color: #2563eb;
  font-weight: 650;
}

.event-title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.event-properties {
  margin-top: 10px;
  padding: 12px;
  border-radius: 8px;
  background: #f9fafb;
}

.load-more-row {
  margin-top: 14px;
  text-align: center;
}

.tag-layout {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 16px;
  margin-top: 16px;
}

.tag-layout.flat {
  grid-template-columns: 1fr;
}

.tag-search {
  max-width: 320px;
}

.tag-sort {
  width: 170px;
}

.tag-tree {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tag-tree button {
  display: flex;
  justify-content: space-between;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px 12px;
  background: white;
  cursor: pointer;
}

.tag-tree button.active {
  border-color: #2563eb;
  color: #2563eb;
  background: #eff6ff;
}

.tag-list {
  display: grid;
  gap: 10px;
}

.tag-item {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
}

.relation-panel.fullscreen {
  position: fixed;
  inset: 24px;
  z-index: 20;
  overflow: auto;
}

.graph-canvas {
  position: relative;
  height: 480px;
  transform-origin: center;
  transition: transform 0.16s ease;
}

.edge-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.graph-node {
  position: absolute;
  width: 172px;
  min-height: 84px;
  transform: translate(-50%, -50%);
  border: 2px solid;
  border-radius: 8px;
  padding: 10px;
  text-align: center;
  cursor: pointer;
}

.graph-node span,
.graph-node strong,
.graph-node small {
  display: block;
}

.edge-label {
  position: relative;
  margin: 8px;
  border: 1px solid #d1d5db;
  border-radius: 999px;
  padding: 4px 10px;
  background: white;
  color: #374151;
}

:deep(.focused-row td) {
  background: #eff6ff !important;
}

.metadata-box {
  min-height: 150px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  background: #f9fafb;
}

.metadata-box h3 {
  margin: 0 0 8px;
}

.config-row {
  align-items: flex-start;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
}

.form-label {
  font-weight: 650;
}
</style>
