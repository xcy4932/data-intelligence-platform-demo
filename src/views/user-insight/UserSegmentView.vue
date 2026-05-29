<script setup lang="ts">
import {
  AddOutline,
  AnalyticsOutline,
  ArrowBackOutline,
  CloudDownloadOutline,
  CopyOutline,
  GitNetworkOutline,
  PencilOutline,
  PlayOutline,
  RefreshOutline,
  SaveOutline,
  SettingsOutline,
  ShareSocialOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import {
  NAlert,
  NButton,
  NCard,
  NCheckbox,
  NCheckboxGroup,
  NCollapse,
  NCollapseItem,
  NDataTable,
  NDescriptions,
  NDescriptionsItem,
  NDivider,
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
  NProgress,
  NRadio,
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
  NUpload,
  NUploadDragger,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, DropdownOption, SelectOption, TagProps, UploadFileInfo } from 'naive-ui'
import { computed, h, onMounted, ref, watch } from 'vue'
import type { Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  segmentEncryptionLabels,
  segmentLineageAssetLabels,
  segmentLineageDirectionLabels,
  segmentRunStatusLabels,
  segmentRunTypeLabels,
  segmentService,
  segmentStatusLabels,
  segmentStatusTagTypes,
  segmentTypeLabels,
  segmentUpdateModeLabels,
} from '@/services/segmentService'
import type { EntityId } from '@/types/common'
import type {
  SegmentAuthorization,
  SegmentApplication,
  SegmentCondition,
  SegmentConditionOperator,
  SegmentCreateMethod,
  SegmentCreatePayload,
  SegmentDownloadFormat,
  SegmentEncryptionType,
  SegmentExportFile,
  SegmentGroup,
  SegmentGroupFilterLogic,
  SegmentLineageAssetType,
  SegmentLineageDirection,
  SegmentLineageNode,
  SegmentOneIdFilter,
  SegmentRecord,
  SegmentRuleConfig,
  SegmentRunRecord,
  SegmentRunStatus,
  SegmentSplitPackageDraft,
  SegmentSplitPreviewRow,
  SegmentStatus,
  SegmentTemplate,
  SegmentType,
  SegmentUpdateMode,
  SegmentVersion,
  SegmentWorkbenchData,
} from '@/types/segment'

type SegmentPage = 'home' | 'create' | 'detail' | 'runs' | 'lineage' | 'groups' | 'conversion' | 'edit'
type SegmentTableRow = SegmentRecord & { depth: number }
type ColumnKey =
  | 'name'
  | 'id'
  | 'subjectName'
  | 'outputIdType'
  | 'count'
  | 'status'
  | 'updateMode'
  | 'scheduledEnabled'
  | 'groupIds'
  | 'ttlDays'
  | 'creator'
  | 'creatorId'
  | 'editor'
  | 'editorId'
  | 'updatedAt'
  | 'actions'

const route = useRoute()
const router = useRouter()
const message = useMessage()

const loading = ref(false)
const actionLoading = ref(false)
const workbench = ref<SegmentWorkbenchData>()
const versions = ref<SegmentVersion[]>([])
const runRecords = ref<SegmentRunRecord[]>([])
const lineageNodes = ref<SegmentLineageNode[]>([])
const selectedSegmentIds = ref<EntityId[]>([])
const expandedSegmentIds = ref<EntityId[]>(['segment-low-coin-high-active'])
const detailActiveTab = ref('basic')

const keyword = ref('')
const onlyMine = ref(false)
const filterSegmentId = ref('')
const filterIdTypes = ref<string[]>([])
const filterEncryptions = ref<SegmentEncryptionType[]>([])
const filterCountMin = ref<number | null>(null)
const filterCountMax = ref<number | null>(null)
const filterGroupIds = ref<EntityId[]>([])
const groupFilterLogic = ref<SegmentGroupFilterLogic>('any')
const filterStatuses = ref<SegmentStatus[]>([])
const filterSubjectIds = ref<EntityId[]>([])
const filterUpdateModes = ref<SegmentUpdateMode[]>([])
const filterTypes = ref<SegmentType[]>([])
const filterTtlMin = ref<number | null>(null)
const filterTtlMax = ref<number | null>(null)
const filterCreatedRange = ref('all')
const filterUpdatedRange = ref('all')

const columnStorageKey = 'user-segment-table-columns'
const defaultColumns: ColumnKey[] = ['name', 'id', 'subjectName', 'outputIdType', 'count', 'status', 'updateMode', 'groupIds', 'ttlDays', 'creator', 'updatedAt', 'actions']
const visibleColumns = ref<ColumnKey[]>(readStoredColumns())
const columnModalVisible = ref(false)
const columnDraft = ref<ColumnKey[]>([...visibleColumns.value])

const createEntryVisible = ref(false)
const selectedCreateMethod = ref<SegmentCreateMethod>('rule')
const selectedCreateSubject = ref<EntityId>('subject-user')
const draft = ref<SegmentCreatePayload>(segmentService.buildDefaultCreatePayload('rule'))
const pendingCreatePayload = ref<SegmentCreatePayload>()
const activeMultiSubjectId = ref<EntityId>('subject-user')
const estimateLoading = ref(false)
const estimateResult = ref<{ baseCount: number; idTypeCounts: Record<string, number>; coverageRate: number; failedReason?: string }>()
const autoEstimate = ref(true)
const showMoreIdTypes = ref(false)
const uploadFileName = ref('segment_upload.csv')
const uploadFileSizeMb = ref(4)
const uploadFileList = ref<UploadFileInfo[]>([])
const uploadFileContent = ref('')
const templateSaveVisible = ref(false)
const templateSelectVisible = ref(false)
const templateDraft = ref({ name: '我的分群模板', type: 'personal' as SegmentTemplate['type'], description: '' })
const selectedTemplateId = ref<EntityId>('')

const authModalVisible = ref(false)
const authTargetIds = ref<EntityId[]>([])
const authDraft = ref({
  type: 'user' as SegmentAuthorization['principalType'],
  id: 'u-operator',
  name: '运营同学',
  permission: 'view' as SegmentAuthorization['permission'],
})

const groupAssignVisible = ref(false)
const groupAssignTargetIds = ref<EntityId[]>([])
const groupAssignDraft = ref<EntityId[]>([])
const groupAssignSingleDraft = ref<EntityId | null>(null)

const serviceModalVisible = ref(false)
const serviceTarget = ref<SegmentRecord>()
const serviceDraft = ref({ status: 'disabled' as SegmentRecord['service']['status'], serviceKey: '', qpsLimit: 100, authType: 'token' as SegmentRecord['service']['authType'], expiresAt: '' })

const ttlModalVisible = ref(false)
const ttlTarget = ref<SegmentRecord>()
const ttlDraft = ref(32)

const deleteModalVisible = ref(false)
const deleteTargetIds = ref<EntityId[]>([])

const downloadModalVisible = ref(false)
const downloadTarget = ref<SegmentRecord>()
const downloadDraft = ref({
  versionId: '',
  format: 'csv',
  encrypted: false,
  masked: false,
  description: '',
  scope: 'target_only',
})

const splitModalVisible = ref(false)
const splitTarget = ref<SegmentRecord>()
const splitDraft = ref({
  mode: 'random',
  strategy: 'ratio',
  namingRule: '按实验组命名',
  packageCount: 2,
  advancedLabel: '城市等级',
  advancedLogic: 'top_n',
  advancedTopN: 5,
})
const splitPackages = ref<SegmentSplitPackageDraft[]>([
  { id: 'pkg-a', name: '实验组 A', ratio: 50, limitCount: 10000 },
  { id: 'pkg-b', name: '实验组 B', ratio: 50, limitCount: 10000 },
])
const splitPreview = ref<SegmentSplitPreviewRow[]>([])

const groupModalVisible = ref(false)
const groupEditing = ref<SegmentGroup>()
const groupDraft = ref({ name: '', description: '' })
const groupDeleteTarget = ref<SegmentGroup>()

const runStatusFilter = ref<SegmentRunStatus | 'all'>('all')
const runTypeFilter = ref('all')
const runDateRange = ref('7d')
const lineageViewMode = ref<'graph' | 'list'>('graph')
const lineageDirectionFilter = ref<'all' | SegmentLineageDirection>('all')
const lineageAssetTypes = ref<SegmentLineageAssetType[]>([])
const lineageNodeVisible = ref(false)
const selectedLineageNode = ref<SegmentLineageNode>()
const runViewModalVisible = ref(false)
const activeRunView = ref<SegmentRunRecord>()
const activeContractIds = ref<string[]>(['contract-list', 'contract-save'])

let estimateTimer: number | undefined

function readStoredColumns(): ColumnKey[] {
  try {
    const stored = JSON.parse(window.localStorage.getItem(columnStorageKey) ?? '[]') as ColumnKey[]
    return stored.length ? stored : defaultColumns
  } catch {
    return defaultColumns
  }
}

function renderIcon(icon: Component) {
  return () => h(NIcon, null, { default: () => h(icon) })
}

const currentPage = computed<SegmentPage>(() => String(route.meta.segmentPage ?? 'home') as SegmentPage)
const currentSegmentId = computed(() => String(route.params.segmentId ?? ''))
const permissions = computed(() => workbench.value?.permissions)
const featureFlags = computed(() => workbench.value?.featureFlags)
const groups = computed(() => workbench.value?.groups ?? [])
const segments = computed(() => workbench.value?.segments ?? [])
const subjects = computed(() => workbench.value?.subjects ?? [])
const idTypes = computed(() => workbench.value?.idTypes ?? [])
const templates = computed(() => workbench.value?.templates ?? [])
const authorizations = computed(() => workbench.value?.authorizations ?? [])
const authorizationPrincipals = computed(() => workbench.value?.authorizationPrincipals ?? [])
const conditionCatalog = computed(() => workbench.value?.conditionCatalog ?? [])
const backendContracts = computed(() => workbench.value?.backendContracts ?? [])
const currentSegment = computed(() => segments.value.find((item) => item.id === currentSegmentId.value) ?? segments.value.find((item) => item.id === downloadTarget.value?.id))
const parentSegments = computed(() => segments.value.filter((item) => !item.parentId))
const selectedRows = computed(() => segments.value.filter((item) => selectedSegmentIds.value.includes(item.id)))
const isBatchGroupAssign = computed(() => groupAssignTargetIds.value.length > 1)

const editableRule = computed<SegmentRuleConfig>(() => {
  const config = draft.value.multiSubject
  if (draft.value.method === 'multi_subject' && config) {
    const activeId = config.participantSubjectIds.includes(activeMultiSubjectId.value)
      ? activeMultiSubjectId.value
      : config.targetSubjectId
    if (!config.subjectRules[activeId]) {
      config.subjectRules[activeId] = segmentService.buildDefaultCreatePayload('rule').rule
    }
    return config.subjectRules[activeId]
  }
  return draft.value.rule
})

const editableRuleSubjectLabel = computed(() => {
  if (draft.value.method !== 'multi_subject') {
    return ''
  }
  return `当前配置主体：${getSubjectName(activeMultiSubjectId.value)}`
})

const activeMultiSubjectOptions = computed<SelectOption[]>(() =>
  (draft.value.multiSubject?.participantSubjectIds ?? []).map((subjectId) => ({ label: getSubjectName(subjectId), value: subjectId })),
)
const primaryRelation = computed(() => draft.value.multiSubject?.relations[0])

const subjectOptions = computed<SelectOption[]>(() => subjects.value.map((item) => ({ label: item.name, value: item.id })))
const idTypeOptions = computed<SelectOption[]>(() => idTypes.value.map((item) => ({ label: `${item.label} · ${getSubjectName(item.subjectId)}`, value: item.id })))
const groupOptions = computed<SelectOption[]>(() => groups.value.map((item) => ({ label: `${item.name}（${item.segmentCount}）`, value: item.id })))
const statusOptions = computed<SelectOption[]>(() => Object.entries(segmentStatusLabels).filter(([key]) => key !== 'deleted').map(([value, label]) => ({ label, value })))
const typeOptions = computed<SelectOption[]>(() => Object.entries(segmentTypeLabels).map(([value, label]) => ({ label, value })))
const updateModeOptions = computed<SelectOption[]>(() => Object.entries(segmentUpdateModeLabels).map(([value, label]) => ({ label, value })))
const encryptionOptions = computed<SelectOption[]>(() => Object.entries(segmentEncryptionLabels).map(([value, label]) => ({ label, value })))
const templateOptions = computed<SelectOption[]>(() => templates.value.map((item) => ({ label: `${item.name} · ${templateTypeLabel(item.type)}`, value: item.id })))
const runStatusOptions = computed<SelectOption[]>(() => [{ label: '全部运行状态', value: 'all' }, ...Object.entries(segmentRunStatusLabels).map(([value, label]) => ({ label, value }))])
const lineageAssetOptions = computed<SelectOption[]>(() => Object.entries(segmentLineageAssetLabels).map(([value, label]) => ({ label, value })))
const authPrincipalOptions = computed<SelectOption[]>(() =>
  authorizationPrincipals.value.map((item) => ({ label: `${item.name} · ${principalTypeLabel(item.type)}${item.department ? ` · ${item.department}` : ''}`, value: item.id })),
)
const authPrincipalOptionsByType = computed<SelectOption[]>(() =>
  authorizationPrincipals.value
    .filter((item) => item.type === authDraft.value.type)
    .map((item) => ({ label: `${item.name}${item.department ? ` · ${item.department}` : ''}`, value: item.id })),
)

const createMethodOptions = computed(() => [
  {
    value: 'rule' as SegmentCreateMethod,
    label: '规则创建分群',
    description: '基于标签、行为、属性、明细数据和已有分群配置满足与排除条件。',
    premium: false,
    disabled: false,
  },
  {
    value: 'upload' as SegmentCreateMethod,
    label: '上传分群',
    description: '上传 txt/csv ID 文件，支持匹配全量用户、ID 类型转换和模板下载。',
    premium: false,
    disabled: false,
  },
  {
    value: 'advanced_manual' as SegmentCreateMethod,
    label: '高级人工分群',
    description: '支持替换、追加、剔除、文件变更、已有分群变更和 API 更新。',
    premium: true,
    disabled: !featureFlags.value?.advancedManualPurchased || !permissions.value?.advancedManual,
  },
  {
    value: 'multi_subject' as SegmentCreateMethod,
    label: '多主体圈选',
    description: '最多选择 3 个主体，通过主体关系交集并投影到目标输出主体。',
    premium: true,
    disabled: !featureFlags.value?.multiSubjectEnabled || !permissions.value?.multiSubject,
  },
])

const filteredSegments = computed(() => {
  const normalizedKeyword = keyword.value.trim().toLowerCase()
  const nowMs = new Date('2026-05-27T23:59:59+02:00').getTime()
  const createdDays = filterCreatedRange.value === '7d' ? 7 : filterCreatedRange.value === '30d' ? 30 : 0
  const updatedDays = filterUpdatedRange.value === '7d' ? 7 : filterUpdatedRange.value === '30d' ? 30 : 0

  return segments.value.filter((segment) => {
    const creatorName = segment.creator.name.toLowerCase()
    const matchesKeyword = !normalizedKeyword || segment.name.toLowerCase().includes(normalizedKeyword) || creatorName.includes(normalizedKeyword)
    const matchesId = !filterSegmentId.value.trim() || segment.id.includes(filterSegmentId.value.trim())
    const matchesMine = !onlyMine.value || segment.creator.id === 'u-xucheng'
    const matchesIdType = !filterIdTypes.value.length || filterIdTypes.value.includes(segment.outputIdType)
    const matchesEncryption = !filterEncryptions.value.length || filterEncryptions.value.includes(segment.encryptionType)
    const matchesMinCount = filterCountMin.value === null || segment.count >= filterCountMin.value
    const matchesMaxCount = filterCountMax.value === null || segment.count <= filterCountMax.value
    const matchesStatus = !filterStatuses.value.length || filterStatuses.value.includes(segment.status)
    const matchesSubject = !filterSubjectIds.value.length || filterSubjectIds.value.includes(segment.subjectId)
    const matchesUpdate = !filterUpdateModes.value.length || filterUpdateModes.value.includes(segment.updateMode)
    const matchesType = !filterTypes.value.length || filterTypes.value.includes(segment.type)
    const matchesMinTtl = filterTtlMin.value === null || segment.ttlDays >= filterTtlMin.value
    const matchesMaxTtl = filterTtlMax.value === null || segment.ttlDays <= filterTtlMax.value
    const matchesGroup =
      !filterGroupIds.value.length ||
      (groupFilterLogic.value === 'any'
        ? filterGroupIds.value.some((groupId) => segment.groupIds.includes(groupId))
        : filterGroupIds.value.every((groupId) => segment.groupIds.includes(groupId)))
    const matchesCreated = !createdDays || nowMs - new Date(segment.createdAt).getTime() <= createdDays * 86400000
    const matchesUpdated = !updatedDays || nowMs - new Date(segment.updatedAt).getTime() <= updatedDays * 86400000

    return matchesKeyword && matchesId && matchesMine && matchesIdType && matchesEncryption && matchesMinCount && matchesMaxCount && matchesStatus && matchesSubject && matchesUpdate && matchesType && matchesMinTtl && matchesMaxTtl && matchesGroup && matchesCreated && matchesUpdated
  })
})

const tableRows = computed<SegmentTableRow[]>(() => {
  const filteredIds = new Set(filteredSegments.value.map((item) => item.id))
  const rows: SegmentTableRow[] = []
  parentSegments.value.forEach((segment) => {
    if (filteredIds.has(segment.id)) {
      rows.push({ ...segment, depth: 0 })
    }
    if (expandedSegmentIds.value.includes(segment.id)) {
      segment.childIds
        .map((id) => segments.value.find((item) => item.id === id))
        .filter((item): item is SegmentRecord => Boolean(item))
        .forEach((child) => {
          if (filteredIds.has(child.id) || filteredIds.has(segment.id)) {
            rows.push({ ...child, depth: 1 })
          }
        })
    }
  })
  return rows
})

const listStats = computed(() => {
  const active = segments.value.filter((item) => item.status !== 'deleted')
  const total = active.length
  const running = active.filter((item) => item.status === 'running' || item.status === 'waiting').length
  const failed = active.filter((item) => item.status === 'failed').length
  const latestCount = active.reduce((sum, item) => sum + item.count, 0)
  return { total, running, failed, latestCount }
})

const runRows = computed(() => {
  const nowMs = new Date('2026-05-27T23:59:59+02:00').getTime()
  const days = runDateRange.value === '7d' ? 7 : runDateRange.value === '30d' ? 30 : 0
  return runRecords.value.filter((record) => {
    const matchesStatus = runStatusFilter.value === 'all' || record.status === runStatusFilter.value
    const matchesType = runTypeFilter.value === 'all' || record.taskType === runTypeFilter.value
    const matchesDate = !days || nowMs - new Date(record.startedAt).getTime() <= days * 86400000
    return matchesStatus && matchesType && matchesDate
  })
})

const filteredLineageNodes = computed(() => {
  return lineageNodes.value.filter((node) => {
    const matchesDirection = lineageDirectionFilter.value === 'all' || node.direction === lineageDirectionFilter.value
    const matchesType = !lineageAssetTypes.value.length || lineageAssetTypes.value.includes(node.assetType)
    return matchesDirection && matchesType
  })
})

const currentSegmentAuthorizations = computed(() => {
  const ids = new Set(currentSegment.value?.authorizationIds ?? [])
  return authorizations.value.filter((item) => ids.has(item.id))
})

const selectedDeleteSummary = computed(() => {
  const rows = segments.value.filter((item) => deleteTargetIds.value.includes(item.id))
  return {
    deletable: rows.filter((item) => item.permissions.canDelete),
    blocked: rows.filter((item) => !item.permissions.canDelete),
    impactCount: rows.reduce((sum, item) => sum + item.lineageImpactCount, 0),
  }
})

const tableColumns = computed<DataTableColumns<SegmentTableRow>>(() => {
  const columnMap: Record<ColumnKey, DataTableColumns<SegmentTableRow>[number]> = {
    name: {
      title: '分群名称',
      key: 'name',
      fixed: 'left',
      minWidth: 280,
      render: (row) =>
        h('div', { class: ['segment-name-cell', row.depth ? 'is-child' : ''] }, [
          row.childIds.length
            ? h(NButton, { text: true, size: 'tiny', onClick: () => toggleExpanded(row.id) }, () => expandedSegmentIds.value.includes(row.id) ? '▼' : '▶')
            : h('span', { class: 'expand-placeholder' }, ''),
          h(NButton, { text: true, type: 'primary', onClick: () => openDetail(row.id) }, () => row.name),
          row.parentId ? h(NTag, { size: 'small', type: 'info' }, () => '子包') : null,
        ]),
    },
    id: { title: '分群 ID', key: 'id', minWidth: 220 },
    subjectName: { title: '所属主体', key: 'subjectName', width: 110 },
    outputIdType: { title: 'ID 类型', key: 'outputIdType', width: 110, render: (row) => getIdTypeLabel(row.outputIdType) },
    count: {
      title: '分群数量',
      key: 'count',
      width: 130,
      render: (row) => h(NButton, { text: true, type: 'primary', onClick: () => openRuns(row.id) }, () => formatNumber(row.count)),
    },
    status: {
      title: '状态',
      key: 'status',
      width: 110,
      render: (row) => h(NTag, { size: 'small', type: segmentStatusTagTypes[row.status] }, () => segmentStatusLabels[row.status]),
    },
    updateMode: { title: '更新方式', key: 'updateMode', width: 120, render: (row) => segmentUpdateModeLabels[row.updateMode] },
    scheduledEnabled: { title: '是否到点更新', key: 'scheduledEnabled', width: 120, render: (row) => row.scheduledEnabled ? '是' : '否' },
    groupIds: {
      title: '分组',
      key: 'groupIds',
      minWidth: 180,
      render: (row) => h(NSpace, { size: 4 }, () => getGroupNames(row.groupIds).map((name) => h(NTag, { size: 'small' }, () => name))),
    },
    ttlDays: { title: 'TTL', key: 'ttlDays', width: 90, render: (row) => `${row.ttlDays} 天` },
    creator: { title: '创建人', key: 'creator', width: 120, render: (row) => row.creator.name },
    creatorId: { title: '创建人 ID', key: 'creatorId', width: 140, render: (row) => row.creator.id },
    editor: { title: '编辑人', key: 'editor', width: 120, render: (row) => row.editor.name },
    editorId: { title: '编辑人 ID', key: 'editorId', width: 140, render: (row) => row.editor.id },
    updatedAt: { title: '更新时间', key: 'updatedAt', width: 170, render: (row) => formatDateTime(row.updatedAt) },
    actions: {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 260,
      render: (row) =>
        h(NSpace, { size: 8 }, () => [
          h(NButton, { text: true, type: 'primary', onClick: () => openDetail(row.id) }, () => '详情'),
          h(NButton, { text: true, disabled: !row.permissions.canEdit, onClick: () => editSegment(row) }, () => '编辑'),
          h(NButton, { text: true, disabled: !row.permissions.canUpdate || row.status === 'running', onClick: () => updateSegment(row.id) }, () => '更新'),
          h(NDropdown, { options: getRowActionOptions(row), onSelect: (key: string) => handleRowAction(key, row) }, { default: () => h(NButton, { text: true }, () => '更多') }),
        ]),
    },
  }

  return [
    { type: 'selection', fixed: 'left', width: 48, disabled: (row) => Boolean(row.parentId) },
    ...visibleColumns.value.map((key) => columnMap[key]),
  ]
})

const versionColumns: DataTableColumns<SegmentVersion> = [
  { title: '版本 ID', key: 'id', minWidth: 180 },
  { title: '版本号', key: 'versionNo', width: 90 },
  { title: '分群数量', key: 'count', width: 120, render: (row) => formatNumber(row.count) },
  { title: '状态', key: 'status', width: 100, render: (row) => h(NTag, { size: 'small', type: row.status === 'success' ? 'success' : row.status === 'failed' ? 'error' : 'info' }, () => segmentRunStatusLabels[row.status]) },
  { title: '数据分区', key: 'dataPartitionTime', width: 120 },
  { title: '开始时间', key: 'startedAt', width: 170, render: (row) => formatDateTime(row.startedAt) },
  { title: '结束时间', key: 'endedAt', width: 170, render: (row) => formatDateTime(row.endedAt) },
  { title: '当前版本', key: 'isLatest', width: 100, render: (row) => row.isLatest ? '是' : '否' },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    render: (row) => h(NButton, { text: true, type: 'primary', disabled: row.status !== 'success', onClick: () => openDownload(currentSegment.value, row.id) }, () => '下载历史分群包'),
  },
]

const runColumns: DataTableColumns<SegmentRunRecord> = [
  { title: '任务 ID', key: 'id', minWidth: 190 },
  { title: '任务类型', key: 'taskType', width: 130, render: (row) => segmentRunTypeLabels[row.taskType] },
  { title: '运行状态', key: 'status', width: 110, render: (row) => h(NTag, { size: 'small', type: row.status === 'success' ? 'success' : row.status === 'failed' ? 'error' : row.status === 'waiting' ? 'warning' : 'info' }, () => segmentRunStatusLabels[row.status]) },
  { title: '分群数量', key: 'count', width: 120, render: (row) => row.count === undefined ? '-' : formatNumber(row.count) },
  { title: '开始时间', key: 'startedAt', width: 170, render: (row) => formatDateTime(row.startedAt) },
  { title: '结束时间', key: 'endedAt', width: 170, render: (row) => formatDateTime(row.endedAt) },
  { title: '耗时', key: 'durationMs', width: 110, render: (row) => row.durationMs ? `${Math.round(row.durationMs / 1000)} 秒` : '-' },
  { title: '触发人', key: 'triggerBy', width: 110 },
  { title: '失败原因', key: 'errorMessage', minWidth: 220, render: (row) => row.errorMessage || '-' },
  {
    title: '操作',
    key: 'actions',
    width: 210,
    render: (row) => h(NSpace, { size: 8 }, () => [
      h(NButton, { text: true, type: 'primary', onClick: () => openRunView(row) }, () => '查看运行视图'),
      h(NButton, { text: true, disabled: row.status !== 'success', onClick: () => openDownload(currentSegment.value) }, () => '下载历史分群包'),
    ]),
  },
]

const lineageColumns: DataTableColumns<SegmentLineageNode> = [
  { title: '资产名称', key: 'assetName', minWidth: 220 },
  { title: '资产类型', key: 'assetType', width: 110, render: (row) => segmentLineageAssetLabels[row.assetType] },
  { title: '方向', key: 'direction', width: 120, render: (row) => h(NTag, { size: 'small', type: row.direction === 'upstream' ? 'info' : 'success' }, () => segmentLineageDirectionLabels[row.direction]) },
  { title: '层级', key: 'level', width: 90, render: (row) => `${row.level} 层` },
  { title: '依赖关系', key: 'relationType', minWidth: 160 },
  { title: '负责人', key: 'owner', width: 130, render: (row) => row.owner.name },
  { title: '更新时间', key: 'updatedAt', width: 170, render: (row) => formatDateTime(row.updatedAt) },
  { title: '操作', key: 'actions', width: 100, render: (row) => h(NButton, { text: true, type: 'primary', onClick: () => openLineageNode(row) }, () => '查看') },
]

const groupColumns: DataTableColumns<SegmentGroup> = [
  { title: '分组名称', key: 'name', minWidth: 180 },
  { title: '分组描述', key: 'description', minWidth: 260 },
  { title: '分群数量', key: 'segmentCount', width: 110 },
  { title: '创建人', key: 'creator', width: 120, render: (row) => row.creator.name },
  { title: '创建时间', key: 'createdAt', width: 170, render: (row) => formatDateTime(row.createdAt) },
  { title: '更新时间', key: 'updatedAt', width: 170, render: (row) => formatDateTime(row.updatedAt) },
  {
    title: '操作',
    key: 'actions',
    width: 140,
    render: (row) => h(NSpace, { size: 8 }, () => [
      h(NButton, { text: true, type: 'primary', onClick: () => openGroupModal(row) }, () => '编辑'),
      h(NButton, { text: true, type: 'error', onClick: () => { groupDeleteTarget.value = row } }, () => '删除'),
    ]),
  },
]

async function loadWorkbench(): Promise<void> {
  loading.value = true
  try {
    workbench.value = await segmentService.getSegmentWorkbenchData()
  } finally {
    loading.value = false
  }
}

async function loadDetailData(segmentId: EntityId): Promise<void> {
  if (!segmentId) {
    return
  }
  const [versionRows, runRowsValue, lineageRows] = await Promise.all([
    segmentService.getSegmentVersions(segmentId),
    segmentService.getSegmentRunRecords(segmentId),
    segmentService.getSegmentLineage(segmentId),
  ])
  versions.value = versionRows
  runRecords.value = runRowsValue
  lineageNodes.value = lineageRows
}

function resetFilters(): void {
  keyword.value = ''
  onlyMine.value = false
  filterSegmentId.value = ''
  filterIdTypes.value = []
  filterEncryptions.value = []
  filterCountMin.value = null
  filterCountMax.value = null
  filterGroupIds.value = []
  groupFilterLogic.value = 'any'
  filterStatuses.value = []
  filterSubjectIds.value = []
  filterUpdateModes.value = []
  filterTypes.value = []
  filterTtlMin.value = null
  filterTtlMax.value = null
  filterCreatedRange.value = 'all'
  filterUpdatedRange.value = 'all'
}

function toggleExpanded(segmentId: EntityId): void {
  expandedSegmentIds.value = expandedSegmentIds.value.includes(segmentId)
    ? expandedSegmentIds.value.filter((id) => id !== segmentId)
    : [...expandedSegmentIds.value, segmentId]
}

function openCreateEntry(): void {
  if (!permissions.value?.createSegment) {
    message.warning('暂无创建分群权限，请联系项目管理员开通。')
    return
  }
  createEntryVisible.value = true
}

function confirmCreateEntry(): void {
  const method = selectedCreateMethod.value
  const option = createMethodOptions.value.find((item) => item.value === method)
  if (option?.disabled) {
    message.warning('该功能为增值功能，请联系商务或管理员开通。')
    return
  }
  createEntryVisible.value = false
  void router.push(`/user-insight/segments/create/${method}?subject=${selectedCreateSubject.value}`)
}

function resetDraft(method: SegmentCreateMethod | 'subject_convert'): void {
  if (pendingCreatePayload.value && method === 'rule') {
    draft.value = pendingCreatePayload.value
    pendingCreatePayload.value = undefined
  } else {
    draft.value = segmentService.buildDefaultCreatePayload(method)
  }
  const subject = String(route.query.subject ?? '')
  if (subject) {
    draft.value.subjectId = subject
  }
  uploadFileName.value = 'segment_upload.csv'
  uploadFileSizeMb.value = 4
  uploadFileList.value = []
  uploadFileContent.value = ''
  syncMultiSubjectConfig()
  estimateResult.value = undefined
  showMoreIdTypes.value = false
}

async function loadEditDraft(segmentId: EntityId): Promise<void> {
  const result = await segmentService.buildPayloadFromSegment(segmentId)
  message[result.ok ? 'success' : 'warning'](result.message)
  if (result.ok && result.payload) {
    draft.value = result.payload
    uploadFileName.value = result.payload.upload?.latestFileName ?? uploadFileName.value
    uploadFileSizeMb.value = result.payload.upload?.latestParseResult ? Math.max(1, Math.round(result.payload.upload.latestParseResult.rawRows / 18000)) : uploadFileSizeMb.value
    syncMultiSubjectConfig()
    void queryEstimate()
  } else {
    void router.push('/user-insight/segments')
  }
}

function syncMultiSubjectConfig(): void {
  const config = draft.value.multiSubject
  if (!config) {
    activeMultiSubjectId.value = draft.value.subjectId
    return
  }
  config.participantSubjectIds = [...new Set(config.participantSubjectIds)].slice(0, 3)
  if (!config.participantSubjectIds.length) {
    config.participantSubjectIds = [config.targetSubjectId || draft.value.subjectId]
  }
  const primarySubjectId = config.participantSubjectIds[0] ?? config.targetSubjectId
  const secondarySubjectId = config.participantSubjectIds[1] ?? primarySubjectId
  if (!config.participantSubjectIds.includes(config.targetSubjectId)) {
    config.targetSubjectId = primarySubjectId
  }
  if (!config.participantSubjectIds.includes(activeMultiSubjectId.value)) {
    activeMultiSubjectId.value = config.targetSubjectId
  }
  config.participantSubjectIds.forEach((subjectId) => {
    if (!config.subjectRules[subjectId]) {
      config.subjectRules[subjectId] = segmentService.buildDefaultCreatePayload('rule').rule
    }
  })
  Object.keys(config.subjectRules).forEach((subjectId) => {
    if (!config.participantSubjectIds.includes(subjectId)) {
      delete config.subjectRules[subjectId]
    }
  })
  if (!config.relations.length) {
    config.relations.push({
      sourceSubjectId: primarySubjectId,
      targetSubjectId: secondarySubjectId,
      relationModelId: 'rel-custom',
      relationModelName: '自定义主体关系',
      direction: 'forward',
      condition: '关系有效',
    })
  }
  draft.value.subjectId = config.targetSubjectId
}

async function queryEstimate(): Promise<void> {
  estimateLoading.value = true
  try {
    estimateResult.value = await segmentService.estimateSegment(draft.value)
  } finally {
    estimateLoading.value = false
  }
}

function scheduleAutoEstimate(): void {
  if (!autoEstimate.value || !['create', 'conversion', 'edit'].includes(currentPage.value)) {
    return
  }
  window.clearTimeout(estimateTimer)
  estimateTimer = window.setTimeout(() => {
    void queryEstimate()
  }, 800)
}

async function parseUpload(): Promise<void> {
  if (!draft.value.upload) {
    return
  }
  const result = await segmentService.parseUploadFile(uploadFileName.value, uploadFileSizeMb.value, draft.value.upload.inputIdType, uploadFileContent.value)
  message[result.ok ? 'success' : 'warning'](result.message)
  if (result.ok && result.result) {
    draft.value.upload.latestFileName = uploadFileName.value
    draft.value.upload.latestParseResult = result.result
    draft.value.outputIdType = draft.value.upload.outputIdType
    void queryEstimate()
  }
}

async function handleUploadChange(options: { fileList: UploadFileInfo[] }): Promise<void> {
  uploadFileList.value = options.fileList
  const latest = options.fileList.at(-1)
  if (!latest) {
    uploadFileContent.value = ''
    return
  }
  uploadFileName.value = latest.name
  const size = latest.file?.size ?? 0
  uploadFileSizeMb.value = Math.max(1, Number((size / 1024 / 1024).toFixed(2)))
  uploadFileContent.value = latest.file ? await latest.file.text() : ''
}

async function downloadUploadTemplate(): Promise<void> {
  if (!draft.value.upload?.inputIdType) {
    message.warning('请先选择录入 ID 类型。')
    return
  }
  const result = await segmentService.downloadUploadTemplate(draft.value.upload.inputIdType)
  message[result.ok ? 'success' : 'warning'](result.message)
  if (result.file) {
    triggerClientDownload(result.file)
  }
}

async function saveSegment(): Promise<void> {
  actionLoading.value = true
  try {
    if (draft.value.upload) {
      draft.value.outputIdType = draft.value.upload.outputIdType
    }
    if (draft.value.subjectConversion) {
      draft.value.subjectId = draft.value.subjectConversion.targetSubjectId
    }
    syncMultiSubjectConfig()
    const result = currentPage.value === 'edit' && currentSegmentId.value
      ? await segmentService.updateSegmentDetail(currentSegmentId.value, draft.value)
      : await segmentService.createSegment(draft.value)
    message[result.ok ? 'success' : 'warning'](result.message)
    if (result.ok) {
      await loadWorkbench()
      void router.push(currentPage.value === 'edit' && currentSegmentId.value ? `/user-insight/segments/${currentSegmentId.value}` : '/user-insight/segments')
    }
  } finally {
    actionLoading.value = false
  }
}

async function saveTemplate(): Promise<void> {
  const result = await segmentService.saveTemplate(draft.value, templateDraft.value.name, templateDraft.value.type, templateDraft.value.description)
  message[result.ok ? 'success' : 'warning'](result.message)
  if (result.ok) {
    templateSaveVisible.value = false
    await loadWorkbench()
  }
}

async function applyTemplate(): Promise<void> {
  const result = await segmentService.applyTemplate(selectedTemplateId.value)
  message[result.ok ? 'success' : 'warning'](result.message)
  if (result.ok && result.payload) {
    draft.value = { ...draft.value, ...result.payload }
    templateSelectVisible.value = false
    void queryEstimate()
  }
}

function addSatisfyGroup(): void {
  const rule = editableRule.value
  const index = rule.satisfyGroups.length + 1
  rule.satisfyGroups.push({ id: `rule-group-${Date.now()}`, name: `条件组${index}`, logic: 'and', conditions: [] })
}

function removeSatisfyGroup(groupId: EntityId): void {
  const rule = editableRule.value
  if (rule.satisfyGroups.length <= 1) {
    message.warning('满足条件至少保留 1 个条件组。')
    return
  }
  rule.satisfyGroups = rule.satisfyGroups.filter((group) => group.id !== groupId)
}

function addCondition(groupId: EntityId): void {
  const group = editableRule.value.satisfyGroups.find((item) => item.id === groupId)
  if (!group) {
    return
  }
  group.conditions.push(buildCondition())
}

function removeCondition(groupId: EntityId, conditionId: EntityId): void {
  const group = editableRule.value.satisfyGroups.find((item) => item.id === groupId)
  if (group) {
    group.conditions = group.conditions.filter((condition) => condition.id !== conditionId)
  }
}

function getConditionCatalogOptions(source: SegmentCondition['source']): SelectOption[] {
  return conditionCatalog.value
    .filter((item) => item.source === source)
    .map((item) => ({
      label: `${item.label}${item.realtimeSupported ? '' : ' · 仅离线'}`,
      value: item.id,
    }))
}

function applyConditionCatalog(condition: SegmentCondition, catalogId: EntityId): void {
  const catalog = conditionCatalog.value.find((item) => item.id === catalogId)
  if (!catalog) {
    return
  }
  condition.source = catalog.source
  condition.sourceName = catalog.sourceName
  condition.field = catalog.field
  condition.label = catalog.label
  condition.operator = catalog.defaultOperator
  condition.value = catalog.defaultValue
  condition.timeRange = catalog.timeRange
  condition.aggregate = catalog.aggregate
}

function changeConditionSource(condition: SegmentCondition, source: string): void {
  condition.source = source as SegmentCondition['source']
  const first = conditionCatalog.value.find((item) => item.source === condition.source)
  if (first) {
    applyConditionCatalog(condition, first.id)
  }
}

function addExcludeGroup(): void {
  editableRule.value.excludeGroup = { id: `exclude-${Date.now()}`, name: '排除条件', logic: 'and', conditions: [buildCondition('segment')] }
}

function addExcludeCondition(): void {
  if (!editableRule.value.excludeGroup) {
    addExcludeGroup()
    return
  }
  editableRule.value.excludeGroup.conditions.push(buildCondition('segment'))
}

function removeExcludeCondition(conditionId: EntityId): void {
  const group = editableRule.value.excludeGroup
  if (!group) {
    return
  }
  group.conditions = group.conditions.filter((condition) => condition.id !== conditionId)
}

function buildCondition(source: SegmentCondition['source'] = 'tag'): SegmentCondition {
  return {
    id: `condition-${Date.now()}-${Math.round(Math.random() * 1000)}`,
    source,
    sourceName: source === 'behavior' ? '行为事件' : source === 'attribute' ? '用户属性' : source === 'detail' ? '明细数据' : source === 'segment' ? '已有分群' : '标签',
    field: source === 'behavior' ? 'purchase' : source === 'segment' ? 'segment-low-coin-high-active' : 'active_days_7d',
    label: source === 'behavior' ? '最近 30 天购买商品次数' : source === 'segment' ? '低金币高活跃用户' : '近 7 日活跃天数',
    operator: source === 'segment' ? 'in' : 'greater_than',
    value: source === 'segment' ? '属于' : 1,
    timeRange: source === 'behavior' ? '最近 30 天' : undefined,
    aggregate: source === 'behavior' ? '次数' : undefined,
  }
}

function buildOneIdFilter(): SegmentOneIdFilter {
  return { id: `oneid-${Date.now()}-${Math.round(Math.random() * 1000)}`, profileType: '会员档案', field: 'member_status', operator: 'equals', value: '有效' }
}

function addOneIdFilterGroup(): void {
  const index = draft.value.oneIdFilterGroups.length + 1
  draft.value.oneIdFilterGroups.push({
    id: `oneid-group-${Date.now()}`,
    name: `子档案条件组${index}`,
    logic: 'and',
    filters: [buildOneIdFilter()],
  })
}

function removeOneIdFilterGroup(groupId: EntityId): void {
  draft.value.oneIdFilterGroups = draft.value.oneIdFilterGroups.filter((group) => group.id !== groupId)
  draft.value.oneIdFilters = draft.value.oneIdFilterGroups.flatMap((group) => group.filters)
}

function addOneIdFilter(groupId?: EntityId): void {
  if (!draft.value.oneIdFilterGroups.length) {
    addOneIdFilterGroup()
    return
  }
  const group = draft.value.oneIdFilterGroups.find((item) => item.id === groupId) ?? draft.value.oneIdFilterGroups[0]
  group?.filters.push(buildOneIdFilter())
}

function removeOneIdFilter(groupId: EntityId, filterId: EntityId): void {
  const group = draft.value.oneIdFilterGroups.find((item) => item.id === groupId)
  if (!group) {
    return
  }
  group.filters = group.filters.filter((item) => item.id !== filterId)
  if (!group.filters.length) {
    removeOneIdFilterGroup(groupId)
  }
  draft.value.oneIdFilters = draft.value.oneIdFilterGroups.flatMap((item) => item.filters)
}

function clearOneIdFilters(): void {
  draft.value.oneIdFilterGroups = []
  draft.value.oneIdFilters = []
}

function openDetail(segmentId: EntityId): void {
  void router.push(`/user-insight/segments/${segmentId}`)
}

function openRuns(segmentId: EntityId): void {
  void router.push(`/user-insight/segments/${segmentId}/runs`)
}

function openLineage(segmentId: EntityId): void {
  void router.push(`/user-insight/segments/${segmentId}/lineage`)
}

function editSegment(segment: SegmentRecord): void {
  if (!segment.permissions.canEdit) {
    message.warning('暂无编辑权限。')
    return
  }
  void router.push(`/user-insight/segments/${segment.id}/edit`)
}

async function updateSegment(segmentId: EntityId): Promise<void> {
  const result = await segmentService.triggerSegmentUpdate(segmentId)
  message[result.ok ? 'success' : 'warning'](result.message)
  await loadWorkbench()
  await loadDetailData(segmentId)
}

async function copySegment(segment: SegmentRecord): Promise<void> {
  const result = await segmentService.copySegment(segment.id)
  message[result.ok ? 'success' : 'warning'](result.message)
  if (result.ok && result.payload) {
    pendingCreatePayload.value = result.payload
    void router.push('/user-insight/segments/create/rule?from=copy')
  }
}

function openAuth(segmentIds: EntityId[]): void {
  authTargetIds.value = segmentIds
  syncAuthPrincipal(authDraft.value.id)
  authModalVisible.value = true
}

async function confirmAuth(): Promise<void> {
  syncAuthPrincipal(authDraft.value.id)
  const result = await segmentService.authorizeSegments(authTargetIds.value, authDraft.value)
  message[result.ok ? 'success' : 'warning'](result.message)
  authModalVisible.value = false
  await loadWorkbench()
}

function syncAuthPrincipal(principalId: EntityId): void {
  const principal = authorizationPrincipals.value.find((item) => item.id === principalId)
  if (!principal) {
    return
  }
  authDraft.value.id = principal.id
  authDraft.value.name = principal.name
  authDraft.value.type = principal.type
}

function changeAuthPrincipalType(type: string): void {
  authDraft.value.type = type as SegmentAuthorization['principalType']
  const first = authorizationPrincipals.value.find((item) => item.type === authDraft.value.type)
  if (first) {
    syncAuthPrincipal(first.id)
  }
}

function openGroupAssign(segmentIds: EntityId[]): void {
  groupAssignTargetIds.value = segmentIds
  const first = segments.value.find((item) => item.id === segmentIds[0])
  if (segmentIds.length > 1) {
    groupAssignSingleDraft.value = first?.groupIds[0] ?? null
    groupAssignDraft.value = []
  } else {
    groupAssignDraft.value = first?.groupIds ?? []
    groupAssignSingleDraft.value = null
  }
  groupAssignVisible.value = true
}

async function confirmGroupAssign(): Promise<void> {
  const targetGroupIds = isBatchGroupAssign.value
    ? groupAssignSingleDraft.value ? [groupAssignSingleDraft.value] : []
    : groupAssignDraft.value
  if (isBatchGroupAssign.value && targetGroupIds.length !== 1) {
    message.warning('批量管理分组一次只能选择 1 个分组。')
    return
  }
  const result = await segmentService.updateSegmentGroups(groupAssignTargetIds.value, targetGroupIds)
  message[result.ok ? 'success' : 'warning'](result.message)
  groupAssignVisible.value = false
  await loadWorkbench()
}

function openService(segment: SegmentRecord | undefined): void {
  if (!segment) {
    return
  }
  serviceTarget.value = segment
  serviceDraft.value = {
    status: segment.service.status,
    serviceKey: segment.service.serviceKey ?? '',
    qpsLimit: segment.service.qpsLimit,
    authType: segment.service.authType,
    expiresAt: segment.service.expiresAt ?? '',
  }
  serviceModalVisible.value = true
}

async function confirmService(): Promise<void> {
  if (!serviceTarget.value) {
    return
  }
  const result = await segmentService.updateSegmentService(serviceTarget.value.id, {
    ...serviceDraft.value,
    expiresAt: serviceDraft.value.expiresAt || undefined,
  })
  message[result.ok ? 'success' : 'warning'](result.message)
  serviceModalVisible.value = false
  await loadWorkbench()
}

function openTtl(segment: SegmentRecord | undefined): void {
  if (!segment) {
    return
  }
  ttlTarget.value = segment
  ttlDraft.value = segment.ttlDays
  ttlModalVisible.value = true
}

async function confirmTtl(): Promise<void> {
  if (!ttlTarget.value) {
    return
  }
  const result = await segmentService.updateSegmentTtl(ttlTarget.value.id, ttlDraft.value)
  message[result.ok ? 'success' : 'warning'](result.message)
  ttlModalVisible.value = false
  await loadWorkbench()
}

function openDelete(segmentIds: EntityId[]): void {
  deleteTargetIds.value = segmentIds
  deleteModalVisible.value = true
}

async function confirmDelete(): Promise<void> {
  const result = await segmentService.deleteSegments(deleteTargetIds.value)
  message[result.ok ? 'success' : 'warning'](result.message)
  selectedSegmentIds.value = []
  deleteModalVisible.value = false
  await loadWorkbench()
  if (currentSegmentId.value && deleteTargetIds.value.includes(currentSegmentId.value)) {
    void router.push('/user-insight/segments')
  }
}

function openDownload(segment: SegmentRecord | undefined, versionId = ''): void {
  if (!segment) {
    return
  }
  if (!segment.permissions.canDownload || !permissions.value?.downloadSegment) {
    message.warning('暂无下载分群文件权限。')
    return
  }
  downloadTarget.value = segment
  downloadDraft.value = {
    versionId,
    format: 'csv',
    encrypted: segment.encryptionType !== 'none',
    masked: false,
    description: '',
    scope: segment.type === 'multi_subject' && featureFlags.value?.multiSubjectDownloadAllEnabled ? 'target_only' : 'target_only',
  }
  downloadModalVisible.value = true
}

async function confirmDownload(): Promise<void> {
  if (!downloadTarget.value) {
    return
  }
  if (downloadDraft.value.encrypted && downloadTarget.value.encryptionType === 'none' && !getIdType(downloadTarget.value.outputIdType)?.encryptionSupported) {
    message.warning('当前项目未配置所选加密算法。')
    return
  }
  const result = await segmentService.downloadSegmentPackage(downloadTarget.value.id, {
    versionId: downloadDraft.value.versionId || undefined,
    format: downloadDraft.value.format as SegmentDownloadFormat,
    encrypted: downloadDraft.value.encrypted,
    masked: downloadDraft.value.masked,
    description: downloadDraft.value.description,
    scope: downloadDraft.value.scope as 'target_only' | 'all_process_segments',
  })
  message[result.ok ? 'success' : 'warning'](result.message)
  if (result.file) {
    triggerClientDownload(result.file)
    downloadModalVisible.value = false
  }
}

function openSplit(segment: SegmentRecord): void {
  if (!segment.permissions.canSplit) {
    message.warning('暂无拆包权限或当前分群不支持拆包。')
    return
  }
  splitTarget.value = segment
  splitPreview.value = []
  splitModalVisible.value = true
}

async function previewSplit(): Promise<void> {
  if (!splitTarget.value) {
    return
  }
  if (splitDraft.value.mode === 'advanced' && (!featureFlags.value?.advancedSplitPurchased || !permissions.value?.advancedSplit)) {
    message.warning('高级拆包为增值功能，请联系商务或管理员开通。')
    return
  }
  const result = await segmentService.calculateSplitPreview(
    splitTarget.value.id,
    splitDraft.value.strategy as 'limit_count' | 'limit_package_count' | 'ratio',
    splitPackages.value,
    splitDraft.value.packageCount,
    {
      mode: splitDraft.value.mode as 'random' | 'advanced',
      advancedLabel: splitDraft.value.advancedLabel,
      advancedLogic: splitDraft.value.advancedLogic as 'include' | 'exclude' | 'top_n' | 'exclude_then_top_n',
      advancedTopN: splitDraft.value.advancedTopN,
      namingRule: splitDraft.value.namingRule,
    },
  )
  message[result.ok ? 'success' : 'warning'](result.message)
  splitPreview.value = result.preview
}

async function confirmSplit(): Promise<void> {
  if (!splitTarget.value) {
    return
  }
  const result = await segmentService.splitSegment(splitTarget.value.id, splitPreview.value)
  message[result.ok ? 'success' : 'warning'](result.message)
  if (result.ok) {
    splitModalVisible.value = false
    expandedSegmentIds.value = [...new Set([...expandedSegmentIds.value, splitTarget.value.id])]
    await loadWorkbench()
  }
}

function addSplitPackage(): void {
  splitPackages.value.push({ id: `pkg-${Date.now()}`, name: `子包 ${splitPackages.value.length + 1}`, ratio: 0, limitCount: 1000 })
}

function removeSplitPackage(id: EntityId): void {
  splitPackages.value = splitPackages.value.filter((item) => item.id !== id)
}

function openGroupModal(group?: SegmentGroup): void {
  groupEditing.value = group
  groupDraft.value = { name: group?.name ?? '', description: group?.description ?? '' }
  groupModalVisible.value = true
}

async function saveGroup(): Promise<void> {
  const result = groupEditing.value
    ? await segmentService.updateGroup(groupEditing.value.id, groupDraft.value.name, groupDraft.value.description)
    : await segmentService.createGroup(groupDraft.value.name, groupDraft.value.description)
  message[result.ok ? 'success' : 'warning'](result.message)
  if (result.ok) {
    groupModalVisible.value = false
    await loadWorkbench()
  }
}

async function deleteGroup(): Promise<void> {
  if (!groupDeleteTarget.value) {
    return
  }
  const result = await segmentService.deleteGroup(groupDeleteTarget.value.id)
  message[result.ok ? 'success' : 'warning'](result.message)
  groupDeleteTarget.value = undefined
  await loadWorkbench()
}

function openRunView(row: SegmentRunRecord): void {
  activeRunView.value = row
  runViewModalVisible.value = true
}

async function refreshRunView(): Promise<void> {
  if (!activeRunView.value) {
    return
  }
  const result = await segmentService.completeRunRecord(activeRunView.value.id)
  message[result.ok ? 'success' : 'warning'](result.message)
  if (result.ok && result.segmentId) {
    await loadWorkbench()
    await loadDetailData(result.segmentId)
    activeRunView.value = runRecords.value.find((record) => record.id === activeRunView.value?.id)
    runViewModalVisible.value = false
  }
}

async function retryRunView(): Promise<void> {
  if (!activeRunView.value) {
    return
  }
  const result = await segmentService.retryRunRecord(activeRunView.value.id)
  message[result.ok ? 'success' : 'warning'](result.message)
  if (result.ok && result.run) {
    await loadWorkbench()
    await loadDetailData(result.run.segmentId)
    activeRunView.value = result.run
  }
}

function openLineageNode(row: SegmentLineageNode): void {
  selectedLineageNode.value = row
  lineageNodeVisible.value = true
}

function openLineageAsset(): void {
  if (!selectedLineageNode.value?.targetRoute) {
    message.info('该资产暂无可跳转页面。')
    return
  }
  void router.push({
    path: selectedLineageNode.value.targetRoute,
    query: {
      fromSegmentId: currentSegmentId.value,
      lineageAssetId: selectedLineageNode.value.assetId,
    },
  })
}

function saveColumns(): void {
  visibleColumns.value = [...columnDraft.value]
  window.localStorage.setItem(columnStorageKey, JSON.stringify(visibleColumns.value))
  columnModalVisible.value = false
}

function resetColumns(): void {
  columnDraft.value = [...defaultColumns]
}

function downloadRunRecords(): void {
  if (!currentSegmentId.value) {
    return
  }
  triggerClientDownload(segmentService.exportRunRecords(currentSegmentId.value, runRows.value))
  message.success('已导出当前筛选条件下的运行记录。')
}

function downloadLineage(): void {
  if (!currentSegmentId.value) {
    return
  }
  triggerClientDownload(segmentService.exportLineage(currentSegmentId.value, filteredLineageNodes.value))
  message.success('已导出当前筛选条件下的血缘表。')
}

function getRowActionOptions(row: SegmentRecord): DropdownOption[] {
  return [
    { label: '下载 ID 列表', key: 'download', disabled: !row.permissions.canDownload },
    { label: '复制分群包', key: 'copy', disabled: row.type !== 'rule' },
    { label: '修改分组', key: 'group', disabled: row.parentId ? true : !row.permissions.canManageGroup },
    { label: '授权', key: 'auth', disabled: !row.permissions.canAuthorize },
    { label: '服务配置', key: 'service', disabled: !row.permissions.canConfigureService },
    { label: 'TTL 配置', key: 'ttl', disabled: !row.permissions.canConfigureTtl },
    { label: '拆包', key: 'split', disabled: !row.permissions.canSplit },
    { label: '个体画像洞察', key: 'profile', disabled: !row.permissions.canView },
    { label: '数据血缘', key: 'lineage' },
    { label: '删除', key: 'delete', disabled: !row.permissions.canDelete },
  ]
}

function handleRowAction(key: string, row: SegmentRecord): void {
  if (key === 'download') openDownload(row)
  if (key === 'copy') void copySegment(row)
  if (key === 'group') openGroupAssign([row.id])
  if (key === 'auth') openAuth([row.id])
  if (key === 'service') openService(row)
  if (key === 'ttl') openTtl(row)
  if (key === 'split') openSplit(row)
  if (key === 'profile') void router.push({ path: '/user-insight/profiles', query: { segmentId: row.id, subject: row.subjectId.replace('subject-', ''), source: 'segment' } })
  if (key === 'lineage') openLineage(row.id)
  if (key === 'delete') openDelete([row.id])
}

function handleBatchAction(action: 'delete' | 'auth' | 'group'): void {
  if (!selectedSegmentIds.value.length) {
    message.warning('请先选择分群。')
    return
  }
  if (action === 'delete') openDelete(selectedSegmentIds.value)
  if (action === 'auth') openAuth(selectedSegmentIds.value)
  if (action === 'group') openGroupAssign(selectedSegmentIds.value)
}

function openApplication(app: SegmentApplication, segment: SegmentRecord): void {
  const latestVersion = versions.value.find((item) => item.segmentId === segment.id && item.isLatest)
  const queryPool: Record<string, string> = {
    segmentId: segment.id,
    segmentName: segment.name,
    subjectId: segment.subjectId,
    idType: segment.outputIdType,
    versionId: latestVersion?.id ?? '',
    count: String(segment.count),
  }
  const query = Object.fromEntries((app.queryKeys ?? ['segmentId']).map((key) => [key, queryPool[key] ?? '']).filter(([, value]) => value))
  void router.push({ path: app.targetRoute, query })
}

function getGroupNames(groupIds: EntityId[]): string[] {
  return groups.value.filter((group) => groupIds.includes(group.id)).map((group) => group.name)
}

function getSubjectName(subjectId: EntityId): string {
  return subjects.value.find((item) => item.id === subjectId)?.name ?? subjectId
}

function getIdType(id: string) {
  return idTypes.value.find((item) => item.id === id)
}

function getIdTypeLabel(id: string): string {
  return getIdType(id)?.label ?? id
}

function templateTypeLabel(type: SegmentTemplate['type']): string {
  if (type === 'system') return '系统模板'
  if (type === 'project') return '项目模板'
  return '个人模板'
}

function principalTypeLabel(type: SegmentAuthorization['principalType']): string {
  if (type === 'user') return '用户'
  if (type === 'group') return '用户组'
  if (type === 'role') return '角色'
  return '部门'
}

function formatDateTime(value?: string): string {
  return value ? value.replace('T', ' ').slice(0, 16) : '-'
}

function formatNumber(value: number): string {
  return value.toLocaleString('zh-CN')
}

function triggerClientDownload(file: SegmentExportFile): void {
  const blob = new Blob([`\uFEFF${file.content}`], { type: file.mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = file.fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function methodPathToMethod(): SegmentCreateMethod | 'subject_convert' {
  if (currentPage.value === 'conversion') {
    return 'subject_convert'
  }
  const method = String(route.params.method ?? 'rule') as SegmentCreateMethod
  return ['rule', 'upload', 'advanced_manual', 'multi_subject'].includes(method) ? method : 'rule'
}

watch(
  () => route.fullPath,
  async () => {
    if (currentPage.value === 'create' || currentPage.value === 'conversion') {
      resetDraft(methodPathToMethod())
      if (currentPage.value === 'conversion') {
        draft.value.method = 'subject_convert'
      }
    }
    if (currentPage.value === 'edit') {
      await loadEditDraft(currentSegmentId.value)
    }
    if (currentPage.value === 'detail') detailActiveTab.value = 'basic'
    if (currentPage.value === 'runs') detailActiveTab.value = 'runs'
    if (currentPage.value === 'lineage') detailActiveTab.value = 'lineage'
    if (currentSegmentId.value) {
      await loadDetailData(currentSegmentId.value)
    }
  },
  { immediate: true },
)

watch(draft, scheduleAutoEstimate, { deep: true })

watch(
  () => draft.value.multiSubject?.participantSubjectIds.join('|'),
  () => {
    if (draft.value.method === 'multi_subject') {
      syncMultiSubjectConfig()
    }
  },
)

watch(
  () => draft.value.multiSubject?.targetSubjectId,
  () => {
    if (draft.value.method === 'multi_subject') {
      syncMultiSubjectConfig()
    }
  },
)

onMounted(async () => {
  await loadWorkbench()
  if (currentSegmentId.value) {
    await loadDetailData(currentSegmentId.value)
  }
  if (currentPage.value === 'create' || currentPage.value === 'conversion') {
    resetDraft(methodPathToMethod())
  }
})
</script>

<template>
  <div class="page-container segment-workbench">
    <n-spin :show="loading">
      <template v-if="!permissions || permissions.viewSegment">
        <section v-if="currentPage === 'home'">
          <div class="page-heading">
            <div>
              <h1 class="page-title">用户分群</h1>
              <p class="page-description">基于标签、行为、属性、明细、上传文件和多主体关系，创建、管理、更新、下载、授权、拆包和应用用户分群。</p>
            </div>
            <n-space>
              <n-tooltip>
                <template #trigger>
                  <n-button
                    type="primary"
                    :disabled="!permissions?.createSegment || !featureFlags?.segmentCreationEnabled"
                    :title="!permissions?.createSegment ? '暂无创建分群权限，请联系项目管理员开通。' : ''"
                    @click="openCreateEntry"
                  >
                    <template #icon><n-icon><add-outline /></n-icon></template>
                    创建分群
                  </n-button>
                </template>
                {{ permissions?.createSegment ? '选择规则创建、上传、高级人工或多主体圈选。' : '暂无创建分群权限，请联系项目管理员开通。' }}
              </n-tooltip>
              <n-button
                :disabled="!permissions?.subjectConvert || !featureFlags?.subjectConvertEnabled"
                @click="router.push('/user-insight/segments/conversion')"
              >
                <template #icon><n-icon><git-network-outline /></n-icon></template>
                分群主体转换
              </n-button>
              <n-button :disabled="!permissions?.manageGroup" @click="router.push('/user-insight/segments/groups')">
                <template #icon><n-icon><settings-outline /></n-icon></template>
                管理分组
              </n-button>
              <n-button @click="columnDraft = [...visibleColumns]; columnModalVisible = true">
                <template #icon><n-icon><settings-outline /></n-icon></template>
                编辑列
              </n-button>
            </n-space>
          </div>

          <n-grid :cols="4" :x-gap="16" :y-gap="16" class="stat-grid">
            <n-gi>
              <n-card>
                <n-statistic label="可查看分群" :value="listStats.total" />
              </n-card>
            </n-gi>
            <n-gi>
              <n-card>
                <n-statistic label="最新 ID 总量" :value="listStats.latestCount" />
              </n-card>
            </n-gi>
            <n-gi>
              <n-card>
                <n-statistic label="运行/等待中" :value="listStats.running" />
              </n-card>
            </n-gi>
            <n-gi>
              <n-card>
                <n-statistic label="失败需处理" :value="listStats.failed" />
              </n-card>
            </n-gi>
          </n-grid>

          <n-card class="filter-card">
            <n-grid :cols="4" :x-gap="12" :y-gap="12">
              <n-gi>
                <n-input v-model:value="keyword" placeholder="请输入分群名称或创建人" clearable />
              </n-gi>
              <n-gi>
                <n-input v-model:value="filterSegmentId" placeholder="分群 ID，支持母包和子包" clearable />
              </n-gi>
              <n-gi>
                <n-select v-model:value="filterIdTypes" multiple clearable placeholder="ID 类型" :options="idTypeOptions" />
              </n-gi>
              <n-gi>
                <n-select v-model:value="filterEncryptions" multiple clearable placeholder="加密方式" :options="encryptionOptions" />
              </n-gi>
              <n-gi>
                <n-space align="center" :wrap="false">
                  <n-input-number v-model:value="filterCountMin" placeholder="最小数量" clearable />
                  <span class="range-separator">至</span>
                  <n-input-number v-model:value="filterCountMax" placeholder="最大数量" clearable />
                </n-space>
              </n-gi>
              <n-gi>
                <n-select v-model:value="filterGroupIds" multiple clearable placeholder="分组" :options="groupOptions" />
              </n-gi>
              <n-gi>
                <n-radio-group v-model:value="groupFilterLogic" size="small">
                  <n-radio value="any">属于任意分组</n-radio>
                  <n-radio value="all">属于所有分组</n-radio>
                </n-radio-group>
              </n-gi>
              <n-gi>
                <n-select v-model:value="filterStatuses" multiple clearable placeholder="状态" :options="statusOptions" />
              </n-gi>
              <n-gi>
                <n-select v-model:value="filterSubjectIds" multiple clearable placeholder="所属主体" :options="subjectOptions" />
              </n-gi>
              <n-gi>
                <n-select v-model:value="filterUpdateModes" multiple clearable placeholder="更新方式" :options="updateModeOptions" />
              </n-gi>
              <n-gi>
                <n-select v-model:value="filterTypes" multiple clearable placeholder="分群类型" :options="typeOptions" />
              </n-gi>
              <n-gi>
                <n-space align="center" :wrap="false">
                  <n-input-number v-model:value="filterTtlMin" placeholder="TTL 最小" clearable />
                  <span class="range-separator">至</span>
                  <n-input-number v-model:value="filterTtlMax" placeholder="TTL 最大" clearable />
                </n-space>
              </n-gi>
              <n-gi>
                <n-select
                  v-model:value="filterCreatedRange"
                  :options="[
                    { label: '全部创建时间', value: 'all' },
                    { label: '最近 7 天', value: '7d' },
                    { label: '最近 30 天', value: '30d' },
                  ]"
                />
              </n-gi>
              <n-gi>
                <n-select
                  v-model:value="filterUpdatedRange"
                  :options="[
                    { label: '全部更新时间', value: 'all' },
                    { label: '最近 7 天', value: '7d' },
                    { label: '最近 30 天', value: '30d' },
                  ]"
                />
              </n-gi>
              <n-gi>
                <n-checkbox v-model:checked="onlyMine">我创建的</n-checkbox>
              </n-gi>
              <n-gi>
                <n-space justify="end">
                  <n-button @click="resetFilters">
                    <template #icon><n-icon><refresh-outline /></n-icon></template>
                    重置
                  </n-button>
                </n-space>
              </n-gi>
            </n-grid>
          </n-card>

          <n-card>
            <template #header>
              <div class="table-header">
                <span>分群列表</span>
                <span class="muted">搜索与筛选条件共同生效，逻辑为 AND；默认仅选择当前页。</span>
              </div>
            </template>
            <n-alert v-if="selectedSegmentIds.length" type="info" class="batch-toolbar">
              <n-space align="center" justify="space-between">
                <span>已选 {{ selectedSegmentIds.length }} 个分群。默认仅选择当前页，跨页选择需二次确认。</span>
                <n-space>
                  <n-button size="small" type="error" @click="handleBatchAction('delete')">批量删除</n-button>
                  <n-button size="small" @click="handleBatchAction('auth')">批量授权</n-button>
                  <n-button size="small" @click="handleBatchAction('group')">批量分组</n-button>
                </n-space>
              </n-space>
            </n-alert>
            <n-empty v-if="!segments.length" description="暂无分群数据。你可以点击“创建分群”开始创建。" />
            <n-empty v-else-if="!tableRows.length" description="未找到符合条件的分群，请调整搜索或筛选条件。">
              <template #extra>
                <n-button @click="resetFilters">重置筛选</n-button>
              </template>
            </n-empty>
            <n-data-table
              v-else
              v-model:checked-row-keys="selectedSegmentIds"
              :columns="tableColumns"
              :data="tableRows"
              :row-key="(row) => row.id"
              :pagination="{ pageSize: 10 }"
              :scroll-x="1800"
            />
          </n-card>
        </section>

        <section v-else-if="currentPage === 'create' || currentPage === 'conversion' || currentPage === 'edit'">
          <div class="page-heading">
            <div>
              <h1 class="page-title">{{ currentPage === 'conversion' ? '分群主体转换' : currentPage === 'edit' ? '编辑分群' : '创建分群' }}</h1>
              <p class="page-description">满足条件结果集减去排除条件结果集；支持 ID 类型、OneID 子档案过滤、加密、抽样、数量预估、模板和任务配置。</p>
            </div>
            <n-space>
              <n-button @click="router.push('/user-insight/segments')">
                <template #icon><n-icon><arrow-back-outline /></n-icon></template>
                返回
              </n-button>
              <n-button :loading="estimateLoading" @click="queryEstimate">
                <template #icon><n-icon><analytics-outline /></n-icon></template>
                查询
              </n-button>
              <n-button @click="showMoreIdTypes = !showMoreIdTypes">查看更多 ID 类型</n-button>
              <n-button @click="templateSelectVisible = true">切换模板</n-button>
              <n-button @click="templateSaveVisible = true">存为模板</n-button>
              <n-button type="primary" :loading="actionLoading" @click="saveSegment">
                <template #icon><n-icon><save-outline /></n-icon></template>
                保存
              </n-button>
              <n-button @click="router.push('/user-insight/segments')">取消</n-button>
            </n-space>
          </div>

          <n-alert v-if="draft.encryptionType !== 'none'" type="warning" class="section-alert">
            当前加密方式可能导致该分群无法在部分下游平台使用，请确认是否继续。
          </n-alert>

          <n-grid :cols="2" :x-gap="16" :y-gap="16">
            <n-gi>
              <n-card title="分群创建方式配置">
                <n-form label-placement="left" label-width="120">
                  <n-form-item label="创建方式">
                    <n-radio-group v-model:value="editableRule.computeMode" :disabled="currentPage === 'conversion'">
                      <n-radio value="offline">离线分群</n-radio>
                      <n-radio value="realtime">实时分群</n-radio>
                    </n-radio-group>
                  </n-form-item>
                  <n-form-item label="分群主体">
                    <n-radio-group v-model:value="editableRule.subjectMode" :disabled="currentPage === 'conversion'">
                      <n-radio value="single">单主体圈选</n-radio>
                      <n-radio value="multi" :disabled="!featureFlags?.multiSubjectEnabled">多主体圈选</n-radio>
                    </n-radio-group>
                  </n-form-item>
                  <n-form-item label="所属主体">
                    <n-select v-model:value="draft.subjectId" :options="subjectOptions" />
                  </n-form-item>
                  <n-form-item label="输出 ID 类型">
                    <n-select v-model:value="draft.outputIdType" :options="idTypeOptions" />
                  </n-form-item>
                </n-form>
              </n-card>
            </n-gi>
            <n-gi>
              <n-card title="数量预估区">
                <n-space vertical>
                  <n-space justify="space-between">
                    <span>规则变化后自动预估，停止操作 800ms 后触发。</span>
                    <n-switch v-model:value="autoEstimate" />
                  </n-space>
                  <n-alert v-if="estimateResult?.failedReason" type="error">{{ estimateResult.failedReason }}</n-alert>
                  <n-grid :cols="3" :x-gap="12">
                    <n-gi>
                      <n-statistic label="基准 ID 数量" :value="estimateResult?.baseCount ?? 0" />
                    </n-gi>
                    <n-gi>
                      <n-statistic label="覆盖率" :value="estimateResult?.coverageRate ?? 0" suffix="%" />
                    </n-gi>
                    <n-gi>
                      <n-statistic label="条件组" :value="editableRule.satisfyGroups.length" />
                    </n-gi>
                  </n-grid>
                  <div v-if="showMoreIdTypes && estimateResult" class="id-estimates">
                    <n-tag v-for="(count, idType) in estimateResult.idTypeCounts" :key="idType" type="info">
                      {{ getIdTypeLabel(idType) }}：{{ formatNumber(count) }}
                    </n-tag>
                  </div>
                </n-space>
              </n-card>
            </n-gi>
          </n-grid>

          <n-card v-if="draft.method === 'upload' || draft.method === 'advanced_manual'" title="上传规则配置区" class="section-card">
            <n-grid :cols="4" :x-gap="12" :y-gap="12">
              <n-gi>
                <n-form-item label="录入 ID 类型">
                  <n-select v-model:value="draft.upload!.inputIdType" :options="idTypeOptions" />
                </n-form-item>
              </n-gi>
              <n-gi>
                <n-form-item label="生成 ID 类型">
                  <n-select v-model:value="draft.upload!.outputIdType" :options="idTypeOptions" />
                </n-form-item>
              </n-gi>
              <n-gi>
                <n-form-item label="匹配全量用户">
                  <n-switch v-model:value="draft.upload!.matchAllUsers" />
                </n-form-item>
              </n-gi>
              <n-gi>
                <n-form-item label="未匹配 ID 自增 OneID">
                  <n-switch v-model:value="draft.upload!.allowOneIdAutoIncrement" :disabled="!featureFlags?.idAutoIncrementEnabled" />
                </n-form-item>
              </n-gi>
              <n-gi :span="2">
                <n-upload :default-upload="false" :file-list="uploadFileList" accept=".txt,.csv" :max="1" @change="handleUploadChange">
                  <n-upload-dragger>
                    <div>{{ uploadFileName || '拖拽或点击添加文件，支持 .txt / .csv，最大 1G' }}</div>
                    <small>{{ uploadFileSizeMb }} MB</small>
                  </n-upload-dragger>
                </n-upload>
              </n-gi>
              <n-gi>
                <n-space>
                  <n-button @click="parseUpload">解析文件</n-button>
                  <n-button @click="downloadUploadTemplate">下载模板</n-button>
                </n-space>
              </n-gi>
              <n-gi v-if="draft.method === 'advanced_manual'">
                <n-select
                  v-model:value="draft.upload!.changeMode"
                  placeholder="变更方式"
                  :options="[
                    { label: '替换全部 ID', value: 'replace' },
                    { label: '追加分群 ID', value: 'append' },
                    { label: '剔除分群 ID', value: 'remove' },
                  ]"
                />
              </n-gi>
              <n-gi v-if="draft.method === 'advanced_manual'">
                <n-select
                  v-model:value="draft.upload!.changeSource"
                  placeholder="变更来源"
                  :options="[
                    { label: '文件变更', value: 'file' },
                    { label: '已有分群变更', value: 'segment' },
                    { label: 'API 变更', value: 'api' },
                  ]"
                />
              </n-gi>
            </n-grid>
            <n-alert v-if="draft.upload?.latestParseResult" type="success" class="section-alert">
              解析结果：原始行数 {{ formatNumber(draft.upload.latestParseResult.rawRows) }}，有效 ID {{ formatNumber(draft.upload.latestParseResult.validIds) }}，
              重复 {{ formatNumber(draft.upload.latestParseResult.duplicateIds) }}，非法 {{ formatNumber(draft.upload.latestParseResult.invalidIds) }}，
              匹配成功 {{ formatNumber(draft.upload.latestParseResult.matchedIds) }}，未匹配 {{ formatNumber(draft.upload.latestParseResult.unmatchedIds) }}。
            </n-alert>
          </n-card>

          <n-card v-if="currentPage === 'conversion'" title="创建主体转换规则" class="section-card">
            <n-grid :cols="3" :x-gap="12" :y-gap="12">
              <n-gi>
                <n-form-item label="分群文件">
                  <n-select
                    v-model:value="draft.subjectConversion!.sourceSegmentId"
                    :options="segments.map((segment) => ({ label: `${segment.name} · ${segment.subjectName}`, value: segment.id }))"
                  />
                </n-form-item>
              </n-gi>
              <n-gi>
                <n-form-item label="输出主体">
                  <n-select v-model:value="draft.subjectConversion!.targetSubjectId" :options="subjectOptions" />
                </n-form-item>
              </n-gi>
              <n-gi>
                <n-form-item label="关系模型">
                  <n-input v-model:value="draft.subjectConversion!.relationModelName" />
                </n-form-item>
              </n-gi>
              <n-gi>
                <n-form-item label="关系条件">
                  <n-input v-model:value="draft.subjectConversion!.condition" />
                </n-form-item>
              </n-gi>
            </n-grid>
          </n-card>

          <n-card v-if="draft.method === 'multi_subject'" title="多主体圈选" class="section-card">
            <n-alert type="info" class="section-alert">多主体圈选最多支持 3 个主体，目标输出主体必须属于参与主体，结果按主体关系交集和输出主体投影生成。</n-alert>
            <n-grid :cols="3" :x-gap="12" :y-gap="12">
              <n-gi>
                <n-form-item label="目标输出主体">
                  <n-select v-model:value="draft.multiSubject!.targetSubjectId" :options="subjectOptions" />
                </n-form-item>
              </n-gi>
              <n-gi>
                <n-form-item label="参与主体">
                  <n-select v-model:value="draft.multiSubject!.participantSubjectIds" multiple :max-tag-count="3" :options="subjectOptions" />
                </n-form-item>
              </n-gi>
              <n-gi>
                <n-form-item label="下载范围">
                  <n-radio-group v-model:value="draft.multiSubject!.downloadScope">
                    <n-radio value="target_only">仅目标主体分群</n-radio>
                    <n-radio value="all_process_segments" :disabled="!featureFlags?.multiSubjectDownloadAllEnabled">所有过程分群</n-radio>
                  </n-radio-group>
                </n-form-item>
              </n-gi>
              <n-gi>
                <n-form-item label="规则配置主体">
                  <n-select v-model:value="activeMultiSubjectId" :options="activeMultiSubjectOptions" />
                </n-form-item>
              </n-gi>
              <template v-if="primaryRelation">
                <n-gi>
                  <n-form-item label="关系源主体">
                    <n-select v-model:value="primaryRelation.sourceSubjectId" :options="activeMultiSubjectOptions" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="关系目标主体">
                    <n-select v-model:value="primaryRelation.targetSubjectId" :options="activeMultiSubjectOptions" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="关系模型">
                    <n-input v-model:value="primaryRelation.relationModelName" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="关系方向">
                    <n-radio-group v-model:value="primaryRelation.direction">
                      <n-radio value="forward">正向</n-radio>
                      <n-radio value="reverse">反向</n-radio>
                    </n-radio-group>
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="关系条件">
                    <n-input v-model:value="primaryRelation.condition" />
                  </n-form-item>
                </n-gi>
              </template>
            </n-grid>
            <div class="relation-graph">
              <div
                v-for="subjectId in draft.multiSubject?.participantSubjectIds"
                :key="subjectId"
                class="relation-node"
                :class="{ active: subjectId === draft.multiSubject?.targetSubjectId }"
              >
                {{ getSubjectName(subjectId) }}
              </div>
              <div class="relation-edge">关系模型：{{ draft.multiSubject?.relations[0]?.relationModelName ?? '请选择关系模型' }}</div>
            </div>
          </n-card>

          <n-card title="圈选规则配置区" class="section-card">
            <div class="rule-formula">最终分群 = 满足条件结果集 - 排除条件结果集</div>
            <n-space vertical>
              <n-alert v-if="draft.method === 'multi_subject'" type="info">{{ editableRuleSubjectLabel }}</n-alert>
              <div v-for="group in editableRule.satisfyGroups" :key="group.id" class="rule-group">
                <n-space justify="space-between" align="center">
                  <n-space align="center">
                    <n-input v-model:value="group.name" maxlength="50" class="group-name-input" />
                    <n-radio-group v-model:value="group.logic" size="small">
                      <n-radio value="and">且</n-radio>
                      <n-radio value="or">或</n-radio>
                    </n-radio-group>
                    <n-tag size="small">组内 {{ group.logic === 'and' ? '取交集' : '取并集' }}</n-tag>
                  </n-space>
                  <n-space>
                    <n-button size="small" @click="addCondition(group.id)">添加条件</n-button>
                    <n-button size="small" type="error" @click="removeSatisfyGroup(group.id)">删除组</n-button>
                  </n-space>
                </n-space>
                <div v-if="!group.conditions.length" class="empty-rule-row">请添加至少一条满足条件。</div>
                <div v-for="condition in group.conditions" :key="condition.id" class="condition-row">
                  <n-select
                    v-model:value="condition.source"
                    @update:value="changeConditionSource(condition, String($event))"
                    :options="[
                      { label: '标签', value: 'tag' },
                      { label: '行为', value: 'behavior' },
                      { label: '用户属性', value: 'attribute' },
                      { label: '明细数据', value: 'detail' },
                      { label: '已有分群', value: 'segment' },
                    ]"
                  />
                  <n-select
                    :value="conditionCatalog.find((item) => item.field === condition.field && item.source === condition.source)?.id"
                    clearable
                    placeholder="选择标签/行为/字段"
                    :options="getConditionCatalogOptions(condition.source)"
                    @update:value="$event && applyConditionCatalog(condition, String($event))"
                  />
                  <n-input v-model:value="condition.label" placeholder="标签名称/字段" />
                  <n-select
                    v-model:value="condition.operator"
                    :options="[
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
                      { label: '有值', value: 'has_value' },
                      { label: '无值', value: 'no_value' },
                    ] satisfies Array<{ label: string; value: SegmentConditionOperator }>"
                  />
                  <n-input :value="String(condition.value ?? '')" placeholder="标签值/属性值/次数" @update:value="condition.value = $event" />
                  <n-button text type="error" @click="removeCondition(group.id, condition.id)">删除</n-button>
                </div>
              </div>
              <n-space>
                <n-button @click="addSatisfyGroup">添加组条件</n-button>
                <n-radio-group v-model:value="editableRule.satisfyLogic" size="small">
                  <n-radio value="and">组间且</n-radio>
                  <n-radio value="or">组间或</n-radio>
                </n-radio-group>
              </n-space>
              <n-divider />
              <div class="exclude-header">
                <div>
                  <strong>排除条件区</strong>
                  <span class="muted">可为空；为空时最终结果等于满足条件结果。</span>
                </div>
                <n-space>
                  <n-button v-if="!editableRule.excludeGroup" @click="addExcludeGroup">添加排除条件</n-button>
                  <n-button v-else @click="editableRule.excludeGroup = undefined">删除排除条件</n-button>
                </n-space>
              </div>
              <div v-if="editableRule.excludeGroup" class="rule-group exclude">
                <n-radio-group v-model:value="editableRule.excludeGroup.logic" size="small">
                  <n-radio value="and">且</n-radio>
                  <n-radio value="or">或</n-radio>
                </n-radio-group>
                <div v-for="condition in editableRule.excludeGroup.conditions" :key="condition.id" class="condition-row">
                  <n-input v-model:value="condition.sourceName" />
                  <n-input v-model:value="condition.label" />
                  <n-select
                    v-model:value="condition.operator"
                    :options="[
                      { label: '属于', value: 'in' },
                      { label: '不属于', value: 'not_in' },
                      { label: '等于', value: 'equals' },
                      { label: '不等于', value: 'not_equals' },
                    ]"
                  />
                  <n-input :value="String(condition.value ?? '')" @update:value="condition.value = $event" />
                  <n-button text type="error" @click="removeExcludeCondition(condition.id)">删除</n-button>
                </div>
                <n-button size="small" @click="addExcludeCondition">添加条件</n-button>
              </div>
            </n-space>
          </n-card>

          <n-grid :cols="2" :x-gap="16" :y-gap="16" class="section-card">
            <n-gi>
              <n-card title="ID 类型与 OneID 过滤">
                <n-space vertical>
                  <n-alert type="info">选择 OneID 作为基础查询 ID 时，可添加子 ID 过滤，避免将不符合条件的会员 ID、设备 ID 一并带出。</n-alert>
                  <n-space v-if="draft.oneIdFilterGroups.length" align="center">
                    <span class="muted">组间关系</span>
                    <n-radio-group v-model:value="draft.oneIdFilterLogic" size="small">
                      <n-radio value="and">且</n-radio>
                      <n-radio value="or">或</n-radio>
                    </n-radio-group>
                  </n-space>
                  <div v-for="group in draft.oneIdFilterGroups" :key="group.id" class="oneid-group">
                    <n-space justify="space-between" align="center">
                      <n-space align="center">
                        <n-input v-model:value="group.name" class="group-name-input" />
                        <n-radio-group v-model:value="group.logic" size="small">
                          <n-radio value="and">组内且</n-radio>
                          <n-radio value="or">组内或</n-radio>
                        </n-radio-group>
                      </n-space>
                      <n-space>
                        <n-button size="small" @click="addOneIdFilter(group.id)">添加筛选条件</n-button>
                        <n-button size="small" type="error" @click="removeOneIdFilterGroup(group.id)">删除组</n-button>
                      </n-space>
                    </n-space>
                    <div v-for="filter in group.filters" :key="filter.id" class="oneid-row">
                      <n-input v-model:value="filter.profileType" placeholder="档案类型" />
                      <n-input v-model:value="filter.field" placeholder="字段" />
                      <n-select
                        v-model:value="filter.operator"
                        :options="[
                          { label: '等于', value: 'equals' },
                          { label: '不等于', value: 'not_equals' },
                          { label: '有值', value: 'has_value' },
                          { label: '无值', value: 'no_value' },
                        ]"
                      />
                      <n-input v-model:value="filter.value" placeholder="值" />
                      <n-button text type="error" @click="removeOneIdFilter(group.id, filter.id)">删除</n-button>
                    </div>
                  </div>
                  <n-empty v-if="!draft.oneIdFilterGroups.length" description="暂无 OneID 子档案过滤条件。" />
                  <n-space>
                    <n-button @click="addOneIdFilterGroup">添加筛选组</n-button>
                    <n-button @click="addOneIdFilter()">添加筛选条件</n-button>
                    <n-button @click="clearOneIdFilters">清空</n-button>
                  </n-space>
                </n-space>
              </n-card>
            </n-gi>
            <n-gi>
              <n-card title="加密与抽样配置">
                <n-form label-placement="left" label-width="110">
                  <n-form-item label="加密方式">
                    <n-select v-model:value="draft.encryptionType" :options="encryptionOptions" />
                  </n-form-item>
                  <n-form-item label="启用抽样">
                    <n-switch v-model:value="draft.sampling.enabled" />
                  </n-form-item>
                  <n-form-item label="保留数量">
                    <n-input-number v-model:value="draft.sampling.keepCount" :disabled="!draft.sampling.enabled" :min="1" :max="draft.sampling.systemLimit" />
                  </n-form-item>
                </n-form>
              </n-card>
            </n-gi>
          </n-grid>

          <n-grid :cols="2" :x-gap="16" :y-gap="16" class="section-card">
            <n-gi>
              <n-card title="基本信息配置">
                <n-form label-placement="left" label-width="110">
                  <n-form-item label="分群名称">
                    <n-input v-model:value="draft.name" maxlength="100" placeholder="不允许仅输入空格" />
                  </n-form-item>
                  <n-form-item label="授权给">
                    <n-select
                      v-model:value="draft.authorizationIds"
                      multiple
                      clearable
                      filterable
                      :options="authPrincipalOptions"
                      placeholder="选择用户、用户组、角色或部门"
                    />
                  </n-form-item>
                  <n-form-item label="分组">
                    <n-select v-model:value="draft.groupIds" multiple clearable :options="groupOptions" />
                  </n-form-item>
                  <n-form-item label="描述">
                    <n-input v-model:value="draft.description" type="textarea" maxlength="500" placeholder="业务含义、使用场景、注意事项" />
                  </n-form-item>
                  <n-form-item label="TTL">
                    <n-input-number v-model:value="draft.ttlDays" :min="1" :max="730" />
                  </n-form-item>
                </n-form>
              </n-card>
            </n-gi>
            <n-gi>
              <n-card title="更新任务配置">
                <n-form label-placement="left" label-width="130">
                  <n-form-item label="更新频次">
                    <n-radio-group v-model:value="draft.schedule.updateMode">
                      <n-radio value="manual">按需更新</n-radio>
                      <n-radio value="scheduled">到点更新</n-radio>
                      <n-radio value="daily">按天更新</n-radio>
                    </n-radio-group>
                  </n-form-item>
                  <n-form-item label="到点更新时间">
                    <n-select
                      v-model:value="draft.schedule.scheduledHours"
                      multiple
                      :disabled="draft.schedule.updateMode !== 'scheduled'"
                      :max-tag-count="3"
                      :options="Array.from({ length: 24 }).map((_, index) => ({ label: `${String(index).padStart(2, '0')}:00`, value: `${String(index).padStart(2, '0')}:00` }))"
                    />
                  </n-form-item>
                  <n-form-item label="按天执行时间">
                    <n-input v-model:value="draft.schedule.dailyTime" :disabled="draft.schedule.updateMode !== 'daily'" placeholder="可精确到分钟，例如 08:30 或 此刻" />
                  </n-form-item>
                  <n-form-item label="有效更新周期">
                    <n-space :wrap="false">
                      <n-input v-model:value="draft.schedule.startDate" placeholder="起始日期，可空" />
                      <n-input v-model:value="draft.schedule.endDate" placeholder="终止日期，可空" />
                    </n-space>
                  </n-form-item>
                  <n-form-item label="依赖配置">
                    <n-radio-group v-model:value="draft.schedule.dependency.mode">
                      <n-radio value="recommended">推荐配置</n-radio>
                      <n-radio value="custom">自定义配置</n-radio>
                    </n-radio-group>
                  </n-form-item>
                  <div class="dependency-list">
                    <n-tag v-for="dep in draft.schedule.dependency.dependencies" :key="dep.id" :type="dep.ready ? 'success' : 'warning'">
                      {{ dep.name }} · {{ dep.ready ? '已就绪' : '等待中' }}
                    </n-tag>
                  </div>
                </n-form>
              </n-card>
            </n-gi>
          </n-grid>
        </section>

        <section v-else-if="currentPage === 'detail' || currentPage === 'runs' || currentPage === 'lineage'">
          <template v-if="currentSegment">
            <div class="page-heading">
              <div>
                <h1 class="page-title">{{ currentSegment.name }}</h1>
                <p class="page-description">{{ currentSegment.description }}</p>
              </div>
              <n-space>
                <n-button @click="router.push('/user-insight/segments')">
                  <template #icon><n-icon><arrow-back-outline /></n-icon></template>
                  返回列表
                </n-button>
                <n-button :disabled="!currentSegment.permissions.canEdit" @click="editSegment(currentSegment)">
                  <template #icon><n-icon><pencil-outline /></n-icon></template>
                  编辑详情
                </n-button>
                <n-button :disabled="!currentSegment.permissions.canUpdate || currentSegment.status === 'running'" @click="updateSegment(currentSegment.id)">
                  <template #icon><n-icon><play-outline /></n-icon></template>
                  更新
                </n-button>
                <n-button :disabled="!currentSegment.permissions.canDownload" @click="openDownload(currentSegment)">
                  <template #icon><n-icon><cloud-download-outline /></n-icon></template>
                  下载 ID 列表
                </n-button>
                <n-button @click="openAuth([currentSegment.id])">
                  <template #icon><n-icon><share-social-outline /></n-icon></template>
                  授权
                </n-button>
                <n-button @click="openGroupAssign([currentSegment.id])">修改分组</n-button>
                <n-button type="error" :disabled="!currentSegment.permissions.canDelete" @click="openDelete([currentSegment.id])">
                  <template #icon><n-icon><trash-outline /></n-icon></template>
                  删除
                </n-button>
              </n-space>
            </div>

            <n-tabs v-model:value="detailActiveTab" type="line" animated>
              <n-tab-pane name="basic" tab="基本信息">
                <n-card>
                  <n-descriptions bordered :column="3" label-placement="left">
                    <n-descriptions-item label="分群名称">{{ currentSegment.name }}</n-descriptions-item>
                    <n-descriptions-item label="分群 ID">{{ currentSegment.id }}</n-descriptions-item>
                    <n-descriptions-item label="分群类型">{{ segmentTypeLabels[currentSegment.type] }}</n-descriptions-item>
                    <n-descriptions-item label="所属主体">{{ currentSegment.subjectName }}</n-descriptions-item>
                    <n-descriptions-item label="ID 类型">{{ getIdTypeLabel(currentSegment.outputIdType) }}</n-descriptions-item>
                    <n-descriptions-item label="加密方式">{{ segmentEncryptionLabels[currentSegment.encryptionType] }}</n-descriptions-item>
                    <n-descriptions-item label="分群数量">{{ formatNumber(currentSegment.count) }}</n-descriptions-item>
                    <n-descriptions-item label="当前状态">
                      <n-tag :type="segmentStatusTagTypes[currentSegment.status]">{{ segmentStatusLabels[currentSegment.status] }}</n-tag>
                    </n-descriptions-item>
                    <n-descriptions-item label="更新方式">{{ segmentUpdateModeLabels[currentSegment.updateMode] }}</n-descriptions-item>
                    <n-descriptions-item label="是否到点更新">{{ currentSegment.scheduledEnabled ? '是' : '否' }}</n-descriptions-item>
                    <n-descriptions-item label="分组">{{ getGroupNames(currentSegment.groupIds).join('、') || '-' }}</n-descriptions-item>
                    <n-descriptions-item label="TTL">{{ currentSegment.ttlDays }} 天</n-descriptions-item>
                    <n-descriptions-item label="创建人">{{ currentSegment.creator.name }}（{{ currentSegment.creator.id }}）</n-descriptions-item>
                    <n-descriptions-item label="创建时间">{{ formatDateTime(currentSegment.createdAt) }}</n-descriptions-item>
                    <n-descriptions-item label="编辑人">{{ currentSegment.editor.name }}（{{ currentSegment.editor.id }}）</n-descriptions-item>
                    <n-descriptions-item label="更新时间">{{ formatDateTime(currentSegment.updatedAt) }}</n-descriptions-item>
                    <n-descriptions-item label="授权对象">
                      {{ currentSegmentAuthorizations.map((item) => item.principalName).join('、') || '仅创建者和管理员可见' }}
                    </n-descriptions-item>
                    <n-descriptions-item label="描述">{{ currentSegment.description || '-' }}</n-descriptions-item>
                  </n-descriptions>
                </n-card>
              </n-tab-pane>
              <n-tab-pane name="rule" tab="分群规则 / 源文件信息">
                <n-card>
                  <template v-if="currentSegment.rule">
                    <div class="rule-formula">最终分群 = 满足条件结果集 - 排除条件结果集</div>
                    <div v-for="group in currentSegment.rule.satisfyGroups" :key="group.id" class="readonly-rule-group">
                      <strong>{{ group.name }} · {{ group.logic === 'and' ? '且' : '或' }}</strong>
                      <div v-for="condition in group.conditions" :key="condition.id" class="readonly-condition">
                        {{ condition.sourceName }} / {{ condition.label }} / {{ condition.operator }} / {{ condition.value }}
                      </div>
                    </div>
                  </template>
                  <template v-else-if="currentSegment.upload">
                    <n-descriptions bordered :column="3">
                      <n-descriptions-item label="录入 ID 类型">{{ getIdTypeLabel(currentSegment.upload.inputIdType) }}</n-descriptions-item>
                      <n-descriptions-item label="生成 ID 类型">{{ getIdTypeLabel(currentSegment.upload.outputIdType) }}</n-descriptions-item>
                      <n-descriptions-item label="匹配全量用户">{{ currentSegment.upload.matchAllUsers ? '是' : '否' }}</n-descriptions-item>
                      <n-descriptions-item label="允许自增 OneID">{{ currentSegment.upload.allowOneIdAutoIncrement ? '是' : '否' }}</n-descriptions-item>
                      <n-descriptions-item label="最新文件">{{ currentSegment.upload.latestFileName ?? '-' }}</n-descriptions-item>
                      <n-descriptions-item label="变更方式">{{ currentSegment.upload.changeMode ?? '覆盖更新' }}</n-descriptions-item>
                    </n-descriptions>
                  </template>
                  <template v-else>
                    <n-empty description="暂无规则或源文件信息。" />
                  </template>
                </n-card>
              </n-tab-pane>
              <n-tab-pane name="runs" tab="分群运行记录">
                <n-card>
                  <n-space class="table-actions" justify="space-between">
                    <n-space>
                      <n-select v-model:value="runDateRange" :options="[{ label: '最近 7 天', value: '7d' }, { label: '最近 30 天', value: '30d' }, { label: '自定义时间范围', value: 'custom' }]" />
                      <n-select v-model:value="runStatusFilter" :options="runStatusOptions" />
                      <n-select v-model:value="runTypeFilter" :options="[{ label: '全部任务类型', value: 'all' }, ...Object.entries(segmentRunTypeLabels).map(([value, label]) => ({ label, value }))]" />
                    </n-space>
                    <n-space>
                      <n-button @click="loadDetailData(currentSegment.id)">查询</n-button>
                      <n-button @click="runDateRange = '7d'; runStatusFilter = 'all'; runTypeFilter = 'all'">重置</n-button>
                      <n-button @click="downloadRunRecords">下载运行记录</n-button>
                    </n-space>
                  </n-space>
                  <n-empty v-if="!runRows.length" description="暂无运行记录。分群创建或更新后，将在此展示任务记录。" />
                  <n-data-table v-else :columns="runColumns" :data="runRows" :pagination="{ pageSize: 8 }" :scroll-x="1600" />
                </n-card>
                <n-card title="分群历史详情" class="section-card">
                  <n-data-table :columns="versionColumns" :data="versions" :pagination="{ pageSize: 6 }" :scroll-x="1300" />
                </n-card>
              </n-tab-pane>
              <n-tab-pane name="lineage" tab="分群数据血缘">
                <n-card>
                  <n-space justify="space-between" class="table-actions">
                    <n-space>
                      <n-radio-group v-model:value="lineageViewMode" size="small">
                        <n-radio value="graph">图谱视图</n-radio>
                        <n-radio value="list">列表视图</n-radio>
                      </n-radio-group>
                      <n-select v-model:value="lineageDirectionFilter" :options="[{ label: '全部方向', value: 'all' }, { label: '上游依赖', value: 'upstream' }, { label: '下游依赖', value: 'downstream' }]" />
                      <n-select v-model:value="lineageAssetTypes" multiple clearable placeholder="标签、分群、数据源等" :options="lineageAssetOptions" />
                    </n-space>
                    <n-space>
                      <n-button @click="lineageDirectionFilter = 'all'; lineageAssetTypes = []">重置</n-button>
                      <n-button @click="downloadLineage">下载</n-button>
                    </n-space>
                  </n-space>
                  <n-empty v-if="!filteredLineageNodes.length" description="暂无可展示的数据血缘。" />
                  <div v-else-if="lineageViewMode === 'graph'" class="lineage-graph">
                    <div class="lineage-column">
                      <div v-for="node in filteredLineageNodes.filter((item) => item.direction === 'upstream')" :key="node.id" class="lineage-node upstream" @click="openLineageNode(node)">
                        {{ node.assetName }}
                        <small>{{ segmentLineageAssetLabels[node.assetType] }} · {{ node.level }} 层</small>
                      </div>
                    </div>
                    <div class="lineage-center">
                      {{ currentSegment.name }}
                      <small>中心分群</small>
                    </div>
                    <div class="lineage-column">
                      <div v-for="node in filteredLineageNodes.filter((item) => item.direction === 'downstream')" :key="node.id" class="lineage-node downstream" @click="openLineageNode(node)">
                        {{ node.assetName }}
                        <small>{{ segmentLineageAssetLabels[node.assetType] }} · {{ node.level }} 层</small>
                      </div>
                    </div>
                  </div>
                  <n-data-table v-else :columns="lineageColumns" :data="filteredLineageNodes" :pagination="{ pageSize: 8 }" :scroll-x="1200" />
                  <n-alert type="info" class="section-alert">上下游各最多展示 7 层，超过 7 层时系统会展示截断提示。</n-alert>
                  <n-alert v-if="filteredLineageNodes.some((node) => node.truncated)" type="warning" class="section-alert">
                    当前血缘存在超过 7 层的链路，已按 PRD 规则截断展示，可通过资产详情继续跳转查看。
                  </n-alert>
                </n-card>
              </n-tab-pane>
              <n-tab-pane name="applications" tab="分群应用">
                <n-grid :cols="4" :x-gap="16" :y-gap="16">
                  <n-gi v-for="app in currentSegment.applications" :key="app.type">
                    <n-card class="application-card">
                      <n-space vertical>
                        <n-space justify="space-between">
                          <strong>{{ app.name }}</strong>
                          <n-tag :type="app.enabled ? 'success' : 'default'">{{ app.enabled ? '可用' : '不可用' }}</n-tag>
                        </n-space>
                        <p>{{ app.description }}</p>
                        <small>{{ app.prerequisite }}</small>
                        <n-button size="small" :disabled="!app.enabled || !permissions?.downstreamApplication" @click="openApplication(app, currentSegment)">进入</n-button>
                      </n-space>
                    </n-card>
                  </n-gi>
                </n-grid>
              </n-tab-pane>
              <n-tab-pane name="service" tab="服务配置">
                <n-card>
                  <n-descriptions bordered :column="3">
                    <n-descriptions-item label="服务状态">{{ currentSegment.service.status === 'enabled' ? '已开启' : currentSegment.service.status === 'paused' ? '已停用' : '未开启' }}</n-descriptions-item>
                    <n-descriptions-item label="服务标识">{{ currentSegment.service.serviceKey ?? '-' }}</n-descriptions-item>
                    <n-descriptions-item label="调用频率">{{ currentSegment.service.qpsLimit }} QPS</n-descriptions-item>
                    <n-descriptions-item label="鉴权方式">{{ currentSegment.service.authType }}</n-descriptions-item>
                    <n-descriptions-item label="有效期">{{ currentSegment.service.expiresAt ?? '-' }}</n-descriptions-item>
                    <n-descriptions-item label="最近变更">{{ formatDateTime(currentSegment.service.lastChangedAt) }}</n-descriptions-item>
                  </n-descriptions>
                  <n-button class="section-alert" @click="openService(currentSegment)">服务配置</n-button>
                </n-card>
              </n-tab-pane>
              <n-tab-pane name="integration" tab="生产集成">
                <n-card>
                  <n-alert type="info" class="section-alert">
                    这里固化生产后端接口契约和持久化边界；当前演示环境走内存服务，真实接入时按这些契约对接数据库、调度、对象存储和权限中心。
                  </n-alert>
                  <n-collapse v-model:expanded-names="activeContractIds">
                    <n-collapse-item v-for="contract in backendContracts" :key="contract.id" :name="contract.id" :title="`${contract.method} ${contract.path}`">
                      <n-descriptions bordered :column="1">
                        <n-descriptions-item label="接口说明">{{ contract.title }}</n-descriptions-item>
                        <n-descriptions-item label="请求">{{ contract.request }}</n-descriptions-item>
                        <n-descriptions-item label="响应">{{ contract.response }}</n-descriptions-item>
                        <n-descriptions-item label="持久化">{{ contract.persistence.join('、') }}</n-descriptions-item>
                      </n-descriptions>
                    </n-collapse-item>
                  </n-collapse>
                </n-card>
              </n-tab-pane>
            </n-tabs>
          </template>
          <n-empty v-else description="暂无该分群查看权限或分群已被删除。" />
        </section>

        <section v-else-if="currentPage === 'groups'">
          <div class="page-heading">
            <div>
              <h1 class="page-title">分组管理</h1>
              <p class="page-description">分组可被项目下所有成员使用；删除分组不会删除分群，只移除关联关系，子包同步继承变化。</p>
            </div>
            <n-space>
              <n-button @click="router.push('/user-insight/segments')">
                <template #icon><n-icon><arrow-back-outline /></n-icon></template>
                返回列表
              </n-button>
              <n-button type="primary" :disabled="!permissions?.manageGroup" @click="openGroupModal()">
                <template #icon><n-icon><add-outline /></n-icon></template>
                新建分组
              </n-button>
            </n-space>
          </div>
          <n-card>
            <n-data-table :columns="groupColumns" :data="groups" :pagination="{ pageSize: 10 }" :scroll-x="1100" />
          </n-card>
        </section>
      </template>

      <n-empty v-else description="暂无用户分群模块查看权限。">
        <template #extra>
          <n-button @click="router.push('/dashboard')">返回首页</n-button>
        </template>
      </n-empty>
    </n-spin>

    <n-modal v-model:show="createEntryVisible" preset="card" title="创建分群" class="segment-modal">
      <n-space vertical>
        <div class="method-grid">
          <button
            v-for="option in createMethodOptions"
            :key="option.value"
            class="method-card"
            :class="{ active: selectedCreateMethod === option.value, disabled: option.disabled }"
            type="button"
            @click="selectedCreateMethod = option.value"
          >
            <strong>{{ option.label }}</strong>
            <span>{{ option.description }}</span>
            <n-tag v-if="option.premium" size="small" :type="option.disabled ? 'warning' : 'success'">
              {{ option.disabled ? '增值功能未开通' : '增值能力' }}
            </n-tag>
          </button>
        </div>
        <n-form-item label="选择主体">
          <n-select v-model:value="selectedCreateSubject" :options="subjectOptions" />
        </n-form-item>
      </n-space>
      <template #footer>
        <n-space justify="end">
          <n-button @click="createEntryVisible = false">取消</n-button>
          <n-button type="primary" @click="confirmCreateEntry">确定</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="columnModalVisible" preset="card" title="编辑列" class="segment-modal">
      <n-space vertical>
        <n-alert type="info">分群名称为不可取消字段；恢复默认后仍需点击确定才生效，配置保存到个人维度。</n-alert>
        <n-checkbox-group v-model:value="columnDraft">
          <div class="column-grid">
            <n-checkbox value="name" disabled>分群名称</n-checkbox>
            <n-checkbox value="id">分群 ID</n-checkbox>
            <n-checkbox value="subjectName">所属主体</n-checkbox>
            <n-checkbox value="outputIdType">ID 类型</n-checkbox>
            <n-checkbox value="count">分群数量</n-checkbox>
            <n-checkbox value="status">状态</n-checkbox>
            <n-checkbox value="updateMode">更新方式</n-checkbox>
            <n-checkbox value="scheduledEnabled">是否到点更新</n-checkbox>
            <n-checkbox value="groupIds">分组</n-checkbox>
            <n-checkbox value="ttlDays">TTL</n-checkbox>
            <n-checkbox value="creator">创建人</n-checkbox>
            <n-checkbox value="creatorId">创建人 ID</n-checkbox>
            <n-checkbox value="editor">编辑人</n-checkbox>
            <n-checkbox value="editorId">编辑人 ID</n-checkbox>
            <n-checkbox value="updatedAt">更新时间</n-checkbox>
            <n-checkbox value="actions">操作</n-checkbox>
          </div>
        </n-checkbox-group>
      </n-space>
      <template #footer>
        <n-space justify="end">
          <n-button @click="resetColumns">恢复默认</n-button>
          <n-button @click="columnModalVisible = false">取消</n-button>
          <n-button type="primary" @click="saveColumns">确定</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="authModalVisible" preset="card" title="授权" class="segment-modal">
      <n-form label-placement="left" label-width="110">
        <n-form-item label="授权对象类型">
          <n-select
            v-model:value="authDraft.type"
            @update:value="changeAuthPrincipalType(String($event))"
            :options="[
              { label: '用户', value: 'user' },
              { label: '用户组', value: 'group' },
              { label: '角色', value: 'role' },
              { label: '部门下用户', value: 'department' },
            ]"
          />
        </n-form-item>
        <n-form-item label="授权对象">
          <n-select
            v-model:value="authDraft.id"
            filterable
            :options="authPrincipalOptionsByType"
            @update:value="syncAuthPrincipal(String($event))"
          />
        </n-form-item>
        <n-form-item label="授权范围">
          <n-select
            v-model:value="authDraft.permission"
            :options="[
              { label: '查看权限', value: 'view' },
              { label: '下载权限', value: 'download' },
              { label: '编辑权限', value: 'edit' },
              { label: '管理权限', value: 'manage' },
            ]"
          />
        </n-form-item>
      </n-form>
      <n-alert type="info">被授权对象获得分群查看权限；是否拥有下载、编辑、删除能力仍取决于模块权限。授权记录会保存操作人、时间、对象和范围。</n-alert>
      <template #footer>
        <n-space justify="end">
          <n-button @click="authModalVisible = false">取消</n-button>
          <n-button type="primary" @click="confirmAuth">确定</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="groupAssignVisible" preset="card" title="修改分组" class="segment-modal">
      <n-space vertical>
        <n-select v-if="isBatchGroupAssign" v-model:value="groupAssignSingleDraft" clearable :options="groupOptions" />
        <n-select v-else v-model:value="groupAssignDraft" multiple clearable :options="groupOptions" />
        <n-alert type="info">
          {{ isBatchGroupAssign ? '批量管理分组一次只能选择 1 个分组；子包不支持单独修改分组。' : '子包不支持单独修改分组；修改母包分组后，子包同步继承。' }}
        </n-alert>
      </n-space>
      <template #footer>
        <n-space justify="end">
          <n-button @click="groupAssignVisible = false">取消</n-button>
          <n-button type="primary" @click="confirmGroupAssign">确定</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="serviceModalVisible" preset="card" title="服务配置" class="segment-modal">
      <n-form label-placement="left" label-width="110">
        <n-form-item label="API 服务">
          <n-select
            v-model:value="serviceDraft.status"
            :options="[
              { label: '未开启', value: 'disabled' },
              { label: '已开启', value: 'enabled' },
              { label: '已停用', value: 'paused' },
            ]"
          />
        </n-form-item>
        <n-form-item label="服务标识">
          <n-input v-model:value="serviceDraft.serviceKey" placeholder="开启后系统可自动生成" />
        </n-form-item>
        <n-form-item label="调用频率">
          <n-input-number v-model:value="serviceDraft.qpsLimit" :min="1" />
        </n-form-item>
        <n-form-item label="鉴权方式">
          <n-select
            v-model:value="serviceDraft.authType"
            :options="[
              { label: 'Token', value: 'token' },
              { label: 'AK/SK', value: 'ak_sk' },
              { label: '无鉴权', value: 'none' },
            ]"
          />
        </n-form-item>
        <n-form-item label="有效期">
          <n-input v-model:value="serviceDraft.expiresAt" placeholder="YYYY-MM-DD，可空" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="serviceModalVisible = false">取消</n-button>
          <n-button type="primary" @click="confirmService">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="ttlModalVisible" preset="card" title="TTL 配置" class="segment-modal">
      <n-space vertical>
        <n-descriptions bordered :column="2">
          <n-descriptions-item label="当前 TTL">{{ ttlTarget?.ttlDays ?? '-' }} 天</n-descriptions-item>
          <n-descriptions-item label="默认值">32 天</n-descriptions-item>
        </n-descriptions>
        <n-form-item label="新 TTL（天）">
          <n-input-number v-model:value="ttlDraft" :min="1" :max="730" />
        </n-form-item>
        <n-alert type="warning">TTL 只影响历史版本，不删除当前最新版本；已经被清理的历史版本不会恢复。</n-alert>
      </n-space>
      <template #footer>
        <n-space justify="end">
          <n-button @click="ttlModalVisible = false">取消</n-button>
          <n-button type="primary" @click="confirmTtl">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="downloadModalVisible" preset="card" title="下载分群包" class="segment-modal">
      <n-form label-placement="left" label-width="110">
        <n-form-item label="下载版本">
          <n-select
            v-model:value="downloadDraft.versionId"
            clearable
            placeholder="默认最新版本"
            :options="versions.map((item) => ({ label: `${item.id} · ${item.isLatest ? '最新版本' : `V${item.versionNo}`}`, value: item.id }))"
          />
        </n-form-item>
        <n-form-item label="文件格式">
          <n-radio-group v-model:value="downloadDraft.format">
            <n-radio value="txt">txt</n-radio>
            <n-radio value="csv">csv</n-radio>
            <n-radio value="gz">gz</n-radio>
          </n-radio-group>
        </n-form-item>
        <n-form-item label="是否加密">
          <n-switch v-model:value="downloadDraft.encrypted" />
        </n-form-item>
        <n-form-item label="是否脱敏">
          <n-switch v-model:value="downloadDraft.masked" />
        </n-form-item>
        <n-form-item v-if="downloadTarget?.type === 'multi_subject' && featureFlags?.multiSubjectDownloadAllEnabled" label="下载范围">
          <n-radio-group v-model:value="downloadDraft.scope">
            <n-radio value="target_only">仅目标主体分群</n-radio>
            <n-radio value="all_process_segments">所有过程分群</n-radio>
          </n-radio-group>
        </n-form-item>
        <n-form-item label="下载说明">
          <n-input v-model:value="downloadDraft.description" type="textarea" />
        </n-form-item>
      </n-form>
      <n-alert type="info">确认下载会校验权限与加密/脱敏配置；文件较大时生成下载任务。</n-alert>
      <template #footer>
        <n-space justify="end">
          <n-button @click="downloadModalVisible = false">取消</n-button>
          <n-button @click="message.info('跳转下载任务列表。')">查看下载任务</n-button>
          <n-button type="primary" @click="confirmDownload">确认下载</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="deleteModalVisible" preset="card" title="删除确认" class="segment-modal">
      <n-space vertical>
        <n-alert type="error">
          删除后，下游任务、洞察、触达、API 服务将无法继续使用该分群。请确认是否删除。
        </n-alert>
        <n-descriptions bordered :column="3">
          <n-descriptions-item label="可删除数量">{{ selectedDeleteSummary.deletable.length }}</n-descriptions-item>
          <n-descriptions-item label="不可删除数量">{{ selectedDeleteSummary.blocked.length }}</n-descriptions-item>
          <n-descriptions-item label="下游影响">{{ selectedDeleteSummary.impactCount }} 个依赖</n-descriptions-item>
        </n-descriptions>
        <n-alert v-if="selectedDeleteSummary.blocked.length" type="warning">
          不可删除：{{ selectedDeleteSummary.blocked.map((item) => item.name).join('、') }}
        </n-alert>
      </n-space>
      <template #footer>
        <n-space justify="end">
          <n-button @click="deleteModalVisible = false">取消</n-button>
          <n-button @click="deleteTargetIds[0] && openLineage(deleteTargetIds[0])">查看分群数据血缘</n-button>
          <n-button type="error" @click="confirmDelete">确认删除</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="splitModalVisible" preset="card" title="分群拆包" class="wide-modal">
      <n-grid :cols="2" :x-gap="16">
        <n-gi>
          <n-form label-placement="left" label-width="120">
            <n-form-item label="拆包方式">
              <n-radio-group v-model:value="splitDraft.mode">
                <n-radio value="random">随机拆包</n-radio>
                <n-radio value="advanced" :disabled="!featureFlags?.advancedSplitPurchased || !permissions?.advancedSplit">高级拆包</n-radio>
              </n-radio-group>
            </n-form-item>
            <n-form-item label="子包命名规则">
              <n-input v-model:value="splitDraft.namingRule" />
            </n-form-item>
            <n-form-item v-if="splitDraft.mode === 'random'" label="随机策略">
              <n-radio-group v-model:value="splitDraft.strategy">
                <n-radio value="limit_count">限制数量上限</n-radio>
                <n-radio value="limit_package_count">限制包个数</n-radio>
                <n-radio value="ratio">按比例拆包</n-radio>
              </n-radio-group>
            </n-form-item>
            <n-form-item v-if="splitDraft.strategy === 'limit_package_count'" label="子包数量">
              <n-input-number v-model:value="splitDraft.packageCount" :min="1" :max="10" />
            </n-form-item>
            <template v-if="splitDraft.strategy !== 'limit_package_count'">
              <div v-for="pkg in splitPackages" :key="pkg.id" class="split-package-row">
                <n-input v-model:value="pkg.name" placeholder="子包名称" />
                <n-input-number v-if="splitDraft.strategy === 'limit_count'" v-model:value="pkg.limitCount" placeholder="数量上限" />
                <n-input-number v-else v-model:value="pkg.ratio" placeholder="比例" />
                <n-button text type="error" @click="removeSplitPackage(pkg.id)">删除</n-button>
              </div>
              <n-button size="small" @click="addSplitPackage">添加子包</n-button>
            </template>
            <template v-if="splitDraft.mode === 'advanced'">
              <n-form-item label="拆分标签">
                <n-input v-model:value="splitDraft.advancedLabel" />
              </n-form-item>
              <n-form-item label="拆分逻辑">
                <n-select
                  v-model:value="splitDraft.advancedLogic"
                  :options="[
                    { label: '包含', value: 'include' },
                    { label: '排除', value: 'exclude' },
                    { label: '用户数量 Top N', value: 'top_n' },
                    { label: '排除后用户数量 Top N', value: 'exclude_then_top_n' },
                  ]"
                />
              </n-form-item>
              <n-form-item label="Top N">
                <n-input-number v-model:value="splitDraft.advancedTopN" :min="1" :max="10" />
              </n-form-item>
            </template>
          </n-form>
        </n-gi>
        <n-gi>
          <n-card title="结果预览">
            <n-empty v-if="!splitPreview.length" description="请先生成预览。" />
            <div v-else class="split-preview-list">
              <div v-for="row in splitPreview" :key="row.name" class="split-preview-row">
                <strong>{{ row.name }}</strong>
                <span>{{ formatNumber(row.count) }} ID · {{ row.ratio }}%</span>
                <small>继承分组：{{ row.inheritedGroupNames.join('、') || '-' }}</small>
              </div>
            </div>
          </n-card>
        </n-gi>
      </n-grid>
      <n-alert type="info" class="section-alert">子包继承母包分组，不支持单独修改分组；默认不支持对子包继续拆包，避免无限嵌套。</n-alert>
      <template #footer>
        <n-space justify="end">
          <n-button @click="splitModalVisible = false">取消</n-button>
          <n-button @click="previewSplit">生成预览</n-button>
          <n-button type="primary" :disabled="!splitPreview.length" @click="confirmSplit">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="groupModalVisible" preset="card" :title="groupEditing ? '编辑分组' : '新建分组'" class="segment-modal">
      <n-form label-placement="left" label-width="100">
        <n-form-item label="分组名称">
          <n-input v-model:value="groupDraft.name" maxlength="50" />
        </n-form-item>
        <n-form-item label="分组描述">
          <n-input v-model:value="groupDraft.description" type="textarea" maxlength="200" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="groupModalVisible = false">取消</n-button>
          <n-button type="primary" @click="saveGroup">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal :show="Boolean(groupDeleteTarget)" preset="dialog" title="删除分组" positive-text="确认删除" negative-text="取消" @positive-click="deleteGroup" @negative-click="groupDeleteTarget = undefined">
      删除分组不会删除分群，但会移除分群与该分组的关联关系。是否继续？
    </n-modal>

    <n-modal v-model:show="templateSaveVisible" preset="card" title="存为模板" class="segment-modal">
      <n-form label-placement="left" label-width="100">
        <n-form-item label="模板名称">
          <n-input v-model:value="templateDraft.name" />
        </n-form-item>
        <n-form-item label="模板类型">
          <n-radio-group v-model:value="templateDraft.type">
            <n-radio value="personal">个人模板</n-radio>
            <n-radio value="project">项目模板</n-radio>
          </n-radio-group>
        </n-form-item>
        <n-form-item label="模板描述">
          <n-input v-model:value="templateDraft.description" type="textarea" />
        </n-form-item>
      </n-form>
      <n-alert type="info">模板保存当前规则条件、主体、ID 类型、加密方式和抽样配置，不保存分群名称和授权对象。</n-alert>
      <template #footer>
        <n-space justify="end">
          <n-button @click="templateSaveVisible = false">取消</n-button>
          <n-button type="primary" @click="saveTemplate">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="templateSelectVisible" preset="card" title="切换模板" class="segment-modal">
      <n-space vertical>
        <n-alert type="warning">切换模板将覆盖当前规则配置，是否继续？</n-alert>
        <n-select v-model:value="selectedTemplateId" :options="templateOptions" placeholder="系统模板 / 项目模板 / 个人模板" />
        <n-card v-if="templates.find((item) => item.id === selectedTemplateId)" size="small">
          {{ templates.find((item) => item.id === selectedTemplateId)?.description }}
        </n-card>
      </n-space>
      <template #footer>
        <n-space justify="end">
          <n-button @click="templateSelectVisible = false">取消</n-button>
          <n-button type="primary" :disabled="!selectedTemplateId" @click="applyTemplate">确定</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="runViewModalVisible" preset="card" title="运行视图" class="segment-modal">
      <n-space v-if="activeRunView" vertical>
        <n-alert :type="activeRunView.status === 'failed' ? 'error' : activeRunView.status === 'waiting' ? 'warning' : 'info'">
          {{ activeRunView.errorMessage || `任务 ${segmentRunStatusLabels[activeRunView.status]}。` }}
        </n-alert>
        <n-progress
          type="line"
          :percentage="activeRunView.status === 'success' ? 100 : activeRunView.progress ?? (activeRunView.status === 'failed' ? 35 : activeRunView.status === 'waiting' ? 5 : 60)"
          :status="activeRunView.status === 'failed' ? 'error' : activeRunView.status === 'success' ? 'success' : 'info'"
        />
        <div class="dependency-list">
          <n-tag v-for="dep in activeRunView.dependencyView" :key="dep.name" :type="dep.status === 'ready' ? 'success' : dep.status === 'failed' ? 'error' : 'warning'">
            {{ dep.name }} · {{ dep.message }}
          </n-tag>
        </div>
        <div v-if="activeRunView.logEntries?.length" class="run-log-list">
          <div v-for="entry in activeRunView.logEntries" :key="`${entry.time}-${entry.message}`" class="run-log-row" :class="entry.level">
            <span>{{ formatDateTime(entry.time) }}</span>
            <strong>{{ entry.level }}</strong>
            <span>{{ entry.message }}</span>
          </div>
        </div>
        <n-space>
          <n-button v-if="activeRunView.status === 'failed'" @click="retryRunView">失败重试</n-button>
          <n-button v-if="activeRunView.status !== 'success'" type="primary" @click="refreshRunView">刷新任务状态</n-button>
        </n-space>
      </n-space>
    </n-modal>

    <n-modal v-model:show="lineageNodeVisible" preset="card" title="血缘资产详情" class="segment-modal">
      <n-descriptions v-if="selectedLineageNode" bordered :column="2">
        <n-descriptions-item label="资产名称">{{ selectedLineageNode.assetName }}</n-descriptions-item>
        <n-descriptions-item label="资产 ID">{{ selectedLineageNode.assetId }}</n-descriptions-item>
        <n-descriptions-item label="资产类型">{{ segmentLineageAssetLabels[selectedLineageNode.assetType] }}</n-descriptions-item>
        <n-descriptions-item label="方向">{{ segmentLineageDirectionLabels[selectedLineageNode.direction] }}</n-descriptions-item>
        <n-descriptions-item label="层级">{{ selectedLineageNode.level }} 层</n-descriptions-item>
        <n-descriptions-item label="依赖关系">{{ selectedLineageNode.relationType }}</n-descriptions-item>
        <n-descriptions-item label="负责人">{{ selectedLineageNode.owner.name }}</n-descriptions-item>
        <n-descriptions-item label="更新时间">{{ formatDateTime(selectedLineageNode.updatedAt) }}</n-descriptions-item>
        <n-descriptions-item label="链路截断">{{ selectedLineageNode.truncated ? '超过 7 层，已截断' : '否' }}</n-descriptions-item>
      </n-descriptions>
      <template #footer>
        <n-space justify="end">
          <n-button @click="lineageNodeVisible = false">关闭</n-button>
          <n-button type="primary" :disabled="!selectedLineageNode?.targetRoute" @click="openLineageAsset">查看资产</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<style scoped>
.segment-workbench {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.stat-grid,
.section-card,
.filter-card {
  margin-bottom: 16px;
}

.table-header,
.table-actions,
.exclude-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.muted {
  color: #6b7280;
  font-size: 13px;
}

.range-separator {
  color: #94a3b8;
}

.batch-toolbar,
.section-alert {
  margin: 12px 0;
}

.segment-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.segment-name-cell.is-child {
  padding-left: 28px;
}

.expand-placeholder {
  display: inline-block;
  width: 18px;
}

.method-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.method-card {
  min-height: 128px;
  padding: 16px;
  border: 1px solid #d6dee8;
  border-radius: 8px;
  background: #ffffff;
  color: #1f2937;
  text-align: left;
  cursor: pointer;
}

.method-card strong,
.method-card span {
  display: block;
}

.method-card span {
  margin: 8px 0 12px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.5;
}

.method-card.active {
  border-color: #2f6fed;
  box-shadow: 0 0 0 2px rgba(47, 111, 237, 0.14);
}

.method-card.disabled {
  cursor: not-allowed;
  opacity: 0.62;
}

.column-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.rule-formula {
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  background: #eef4ff;
  color: #1f4f9a;
  font-weight: 600;
}

.rule-group {
  padding: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
}

.rule-group.exclude {
  background: #fff7ed;
}

.oneid-group {
  padding: 12px;
  border: 1px solid #dbe4ef;
  border-radius: 8px;
  background: #f8fafc;
}

.group-name-input {
  width: 180px;
}

.condition-row,
.oneid-row,
.split-package-row {
  display: grid;
  grid-template-columns: 140px 160px 180px 140px minmax(160px, 1fr) 56px;
  gap: 8px;
  align-items: center;
  margin-top: 10px;
}

.oneid-row {
  grid-template-columns: 130px 130px 120px minmax(160px, 1fr) 56px;
}

.split-package-row {
  grid-template-columns: minmax(180px, 1fr) 140px 56px;
}

.empty-rule-row {
  margin-top: 10px;
  color: #94a3b8;
}

.dependency-list,
.id-estimates {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.relation-graph,
.lineage-graph {
  display: grid;
  align-items: center;
  gap: 16px;
  margin-top: 12px;
}

.relation-graph {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.relation-node,
.lineage-center,
.lineage-node {
  padding: 14px;
  border: 1px solid #d6dee8;
  border-radius: 8px;
  background: #ffffff;
  text-align: center;
}

.relation-node.active,
.lineage-center {
  border-color: #2f6fed;
  background: #eef4ff;
  color: #1f4f9a;
  font-weight: 700;
}

.relation-edge {
  grid-column: 1 / -1;
  padding: 10px;
  border-radius: 6px;
  background: #f8fafc;
  color: #475569;
  text-align: center;
}

.lineage-graph {
  grid-template-columns: minmax(0, 1fr) 220px minmax(0, 1fr);
}

.lineage-column {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.lineage-node small,
.lineage-center small,
.split-preview-row small,
.application-card small {
  display: block;
  margin-top: 4px;
  color: #64748b;
}

.lineage-node.upstream {
  border-color: #93c5fd;
}

.lineage-node.downstream {
  border-color: #86efac;
}

.readonly-rule-group {
  margin-bottom: 12px;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.readonly-condition {
  margin-top: 8px;
  color: #475569;
}

.application-card {
  min-height: 180px;
}

.split-preview-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.split-preview-row {
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.run-log-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.run-log-row {
  display: grid;
  grid-template-columns: 130px 70px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #f8fafc;
}

.run-log-row.warning {
  border-color: #facc15;
  background: #fefce8;
}

.run-log-row.error {
  border-color: #fca5a5;
  background: #fef2f2;
}

.segment-modal {
  width: 720px;
}

.wide-modal {
  width: 1040px;
}
</style>
