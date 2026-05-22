<script setup lang="ts">
import {
  NAlert,
  NButton,
  NCard,
  NCheckbox,
  NDataTable,
  NDrawer,
  NDrawerContent,
  NEmpty,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NModal,
  NRadioButton,
  NRadioGroup,
  NSelect,
  NSpace,
  NSwitch,
  NTabPane,
  NTabs,
  NTag,
} from 'naive-ui'
import type { DataTableColumns, DataTableRowKey, SelectOption } from 'naive-ui'
import { computed, h, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { idMappingService } from '@/services/idMappingService'
import type {
  IdmAuditLog,
  IdmCompositePart,
  IdmConfigVersion,
  IdmCorrectionSetting,
  IdmCrossSubjectRelation,
  IdmCrossSubjectPreviewRow,
  IdmDataPreviewRow,
  IdmDataset,
  IdmGraphConfig,
  IdmGraphEdge,
  IdmGraphNode,
  IdmIdKind,
  IdmIdTemplate,
  IdmIdType,
  IdmLineageEdge,
  IdmLineageGraph,
  IdmLineageNode,
  IdmOneIdChangeLog,
  IdmOneIdMappingResult,
  IdmOnlineService,
  IdmPermission,
  IdmReferenceRelation,
  IdmRelationPreviewRow,
  IdmSubject,
  IdmSubjectType,
  IdmTask,
  IdmTaskDag,
  IdmTaskRunRecord,
  IdmTaskStatus,
  IdmValidationItem,
  IdmVisibilityRule,
} from '@/types/idMapping'

type TabKey = 'home' | 'ids' | 'relations' | 'graph' | 'tasks' | 'explore' | 'lineage' | 'cross' | 'settings'
type IdmRouteMeta = {
  idmTab?: TabKey
}
type ExploreQueryMode = 'ID_TO_ONEID' | 'ONEID_TO_ID'
type LineageDirection = 'ALL' | 'UPSTREAM' | 'DOWNSTREAM'
type LineageNodeTypeFilter = IdmLineageNode['type'] | 'ALL'
type LineageStatusFilter = IdmTaskStatus | 'ALL' | 'NO_STATUS'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const notice = ref('正在加载 ID 图谱配置。')
const activeTab = ref<TabKey>('home')
const permission = ref<IdmPermission | null>(null)
const subjects = ref<IdmSubject[]>([])
const overviewCards = ref<Array<{ label: string, value: string, tone?: 'success' | 'warning' | 'error' }>>([])
const alerts = ref<Array<{ id: string, level: string, title: string, description: string, subjectId?: string, actionText?: string }>>([])
const selectedSubjectId = ref('subj_user')
const idTypes = ref<IdmIdType[]>([])
const idTemplates = ref<IdmIdTemplate[]>([])
const datasets = ref<IdmDataset[]>([])
const dataPreviewRows = ref<IdmDataPreviewRow[]>([])
const relationPreviewRows = ref<IdmRelationPreviewRow[]>([])
const relationValidationItems = ref<IdmValidationItem[]>([])
const relations = ref<IdmReferenceRelation[]>([])
const graph = ref<IdmGraphConfig | null>(null)
const selectedGraphNodeId = ref('')
const selectedGraphEdgeId = ref('')
const validationItems = ref<IdmValidationItem[]>([])
const tasks = ref<IdmTask[]>([])
const taskRuns = ref<IdmTaskRunRecord[]>([])
const taskDag = ref<IdmTaskDag | null>(null)
const selectedTask = ref<IdmTask | null>(null)
const mappingResults = ref<IdmOneIdMappingResult[]>([])
const changeLogs = ref<IdmOneIdChangeLog[]>([])
const lineageGraph = ref<IdmLineageGraph | null>(null)
const lineageLoading = ref(false)
const selectedLineageNodeId = ref('')
const lineageKeyword = ref('')
const lineageDirection = ref<LineageDirection>('ALL')
const lineageNodeTypeFilter = ref<LineageNodeTypeFilter>('ALL')
const lineageStatusFilter = ref<LineageStatusFilter>('ALL')
const crossRelations = ref<IdmCrossSubjectRelation[]>([])
const crossPreviewRows = ref<IdmCrossSubjectPreviewRow[]>([])
const crossKeyword = ref('')
const crossStatusFilter = ref<IdmCrossSubjectRelation['status'] | 'ALL'>('ALL')
const selectedCrossRelation = ref<IdmCrossSubjectRelation | null>(null)
const onlineServices = ref<IdmOnlineService[]>([])
const visibilityRules = ref<IdmVisibilityRule[]>([])
const auditLogs = ref<IdmAuditLog[]>([])
const correctionSetting = ref<IdmCorrectionSetting | null>(null)
const configVersions = ref<IdmConfigVersion[]>([])
const subjectKeyword = ref('')
const taskKeyword = ref('')
const taskStatusFilter = ref<IdmTaskStatus | 'ALL'>('ALL')
const taskTypeFilter = ref<IdmTask['taskType'] | 'ALL'>('ALL')
const selectedTaskIds = ref<DataTableRowKey[]>([])
const taskActionLoading = ref(false)
const taskDrawerTab = ref<'dag' | 'runs' | 'detail'>('dag')
const draggedNodeId = ref('')
const exploreLoading = ref(false)
const exploreChangeKeyword = ref('')
const selectedMapping = ref<IdmOneIdMappingResult | null>(null)
const showMappingDrawer = ref(false)

const showSubjectModal = ref(false)
const showTemplateModal = ref(false)
const showIdModal = ref(false)
const showRelationModal = ref(false)
const showTaskDrawer = ref(false)
const showCrossModal = ref(false)
const showRunConfirm = ref(false)
const showRunAllConfirm = ref(false)
const showDeleteIdModal = ref(false)
const showDeleteRelationModal = ref(false)
const showPublishConfirm = ref(false)
const showGraphEdgeModal = ref(false)
const showOnlineServiceModal = ref(false)
const showVisibilityModal = ref(false)
const pendingRunTask = ref<IdmTask | null>(null)
const pendingDeleteId = ref<IdmIdType | null>(null)
const pendingDeleteRelation = ref<IdmReferenceRelation | null>(null)
const publishSubjectId = ref('')
const publishWarnings = ref<IdmValidationItem[]>([])
const publishing = ref(false)
const publishFeedback = ref('')
const editingIdTypeId = ref('')
const editingRelationId = ref('')
const editingGraphEdgeId = ref('')
const editingCrossRelationId = ref('')

const subjectForm = reactive({
  subjectType: 'USER' as IdmSubjectType,
  subjectName: '用户',
  subjectCode: 'user_2',
  description: '新的用户身份主体。',
  status: 'ENABLED' as IdmSubject['status'],
})

const idForm = reactive({
  idKind: 'SINGLE' as IdmIdKind,
  idName: '邮箱',
  idCode: 'email_sha256',
  channelIdentifier: 'EMAIL' as IdmIdType['channelIdentifier'],
  idDataType: 'STRING' as IdmIdType['idDataType'],
  dataSourceType: 'OFFLINE_REALTIME' as IdmIdType['dataSourceType'],
  datasetId: 'ds_user_identity_full',
  idField: 'phone_md5',
  partitionField: 'p_date',
  partitionFormat: 'yyyyMMdd',
  updateMode: 'FULL' as IdmIdType['updateMode'],
  dimensionDatasetId: 'ds_wechat_openid_relation',
  dimensionValueField: 'appid',
  dimensionNameField: 'appid',
  partOneName: 'APPID',
  partOneCode: 'appid',
  partOneField: 'appid',
  partTwoName: 'OpenID',
  partTwoCode: 'openid',
  partTwoField: 'openid',
})

const relationForm = reactive({
  relationName: '邮箱绑定用户关系',
  relationDesc: '手机号、设备或微信生态 ID 参考 UID 生成 OneID。',
  datasetId: 'ds_user_identity_full',
  sourceIdTypeId: '',
  targetIdTypeId: 'id_uid',
  sourceField: 'phone_md5',
  targetField: 'uid',
  partitionField: 'p_date',
  partitionFormat: 'yyyyMMdd',
  updateMode: 'FULL' as IdmReferenceRelation['updateMode'],
  mappingType: 'MANY_TO_ONE' as IdmReferenceRelation['mappingType'],
  strategyEnabled: true,
  strategyField: 'updated_at',
  strategyType: 'LATEST' as IdmReferenceRelation['strategyType'],
  unbindEnabled: false,
})

const graphEdgeForm = reactive({
  sourceIdTypeId: '',
  targetIdTypeId: '',
  relationId: '',
})

const exploreForm = reactive({
  queryMode: 'ID_TO_ONEID' as ExploreQueryMode,
  env: 'ALL',
  idTypeCode: 'phone_md5',
  idValues: '8f14e45fceea167a5a36dedd4bea2543\noaid_orphan_0922\nuid_900001',
  abnormalOnly: false,
  includeRelated: true,
})

const lineageForm = reactive({
  objectType: 'ID_TYPE',
  objectName: '设备 ID',
  depth: 3,
})

const crossForm = reactive({
  relationName: '人车购买关系',
  relationDesc: '用户购买车辆后的多主体转换关系。',
  datasetId: 'ds_user_identity_full',
  datasetName: 'dwd_user_vehicle_purchase_relation_df',
  partitionField: 'p_date',
  partitionFormat: 'yyyyMMdd',
  updateMode: 'FULL' as IdmReferenceRelation['updateMode'],
  subjectAName: '用户',
  subjectAIdTypeName: '用户 ID',
  subjectAField: 'uid',
  subjectBName: '车辆',
  subjectBIdTypeName: 'VIN',
  subjectBField: 'vin',
  aToBMode: 'ONE_TO_MANY' as IdmCrossSubjectRelation['aToBMode'],
  bToAMode: 'ONE_TO_ONE' as IdmCrossSubjectRelation['bToAMode'],
  strategyField: 'updated_at',
  strategyType: 'LATEST' as IdmCrossSubjectRelation['strategyType'],
})

const onlineServiceForm = reactive({
  serviceName: '用户 OneID 实时查询服务',
  serviceObject: 'SUBJECT' as IdmOnlineService['serviceObject'],
  subjectName: '用户',
  idTypeNames: ['用户 ID', '手机号 MD5'],
  returnFields: ['base_id', 'related_ids', 'config_version'],
  qpsLimit: 5000,
  enabled: true,
  authType: 'TOKEN' as IdmOnlineService['authType'],
  remark: '营销触达与实时画像使用。',
})

const visibilityForm = reactive({
  targetType: 'ROLE' as IdmVisibilityRule['targetType'],
  targetName: '普通分析用户',
  disabledSubjects: ['车辆'],
  disabledIdTypes: ['手机号 MD5'],
})

const subjectOptions = computed<SelectOption[]>(() =>
  subjects.value.map((subject) => ({ label: `${subject.subjectName}（${subject.subjectCode}）`, value: subject.id })),
)

const selectedSubject = computed(() =>
  subjects.value.find((subject) => subject.id === selectedSubjectId.value) ?? subjects.value[0],
)

const datasetOptions = computed<SelectOption[]>(() =>
  datasets.value
    .filter((dataset) => dataset.type === 'HIVE' && dataset.updateCycle === 'DAY')
    .map((dataset) => ({ label: dataset.name, value: dataset.id })),
)

const selectedIdDataset = computed(() => datasets.value.find((dataset) => dataset.id === idForm.datasetId))

const selectedDimensionDataset = computed(() => datasets.value.find((dataset) => dataset.id === idForm.dimensionDatasetId))

const selectedRelationDataset = computed(() => datasets.value.find((dataset) => dataset.id === relationForm.datasetId))

const selectedCrossDataset = computed(() => datasets.value.find((dataset) => dataset.id === crossForm.datasetId))

const datasetFieldOptions = computed<SelectOption[]>(() =>
  selectedIdDataset.value?.fields
    .filter((field) => !field.isPartition)
    .map((field) => ({ label: `${field.displayName} ${field.name} · ${field.dataType}`, value: field.name }))
  ?? [],
)

const idPartitionFieldOptions = computed<SelectOption[]>(() =>
  selectedIdDataset.value?.fields
    .filter((field) => field.isPartition)
    .map((field) => ({ label: `${field.displayName} ${field.name}`, value: field.name }))
  ?? [],
)

const dimensionFieldOptions = computed<SelectOption[]>(() =>
  selectedDimensionDataset.value?.fields
    .filter((field) => !field.isPartition)
    .map((field) => ({ label: `${field.displayName} ${field.name} · ${field.dataType}`, value: field.name }))
  ?? [],
)

const relationFieldOptions = computed<SelectOption[]>(() =>
  selectedRelationDataset.value?.fields
    .filter((field) => !field.isPartition)
    .map((field) => ({ label: `${field.displayName} ${field.name} · ${field.dataType}`, value: field.name }))
  ?? [],
)

const relationPartitionFieldOptions = computed<SelectOption[]>(() =>
  selectedRelationDataset.value?.fields
    .filter((field) => field.isPartition)
    .map((field) => ({ label: `${field.displayName} ${field.name}`, value: field.name }))
  ?? [],
)

const relationStrategyFieldOptions = computed<SelectOption[]>(() =>
  selectedRelationDataset.value?.fields
    .filter((field) => field.dataType === 'DATETIME' || field.dataType === 'NUMBER')
    .map((field) => ({ label: `${field.displayName} ${field.name} · ${field.dataType}`, value: field.name }))
  ?? [],
)

const crossDatasetFieldOptions = computed<SelectOption[]>(() =>
  selectedCrossDataset.value?.fields
    .filter((field) => !field.isPartition)
    .map((field) => ({ label: `${field.displayName} ${field.name} · ${field.dataType}`, value: field.name }))
  ?? [],
)

const crossPartitionFieldOptions = computed<SelectOption[]>(() =>
  selectedCrossDataset.value?.fields
    .filter((field) => field.isPartition)
    .map((field) => ({ label: `${field.displayName} ${field.name}`, value: field.name }))
  ?? [],
)

const crossStrategyFieldOptions = computed<SelectOption[]>(() =>
  selectedCrossDataset.value?.fields
    .filter((field) => field.dataType === 'DATETIME' || field.dataType === 'NUMBER')
    .map((field) => ({ label: `${field.displayName} ${field.name} · ${field.dataType}`, value: field.name }))
  ?? [],
)

const idTypeOptions = computed<SelectOption[]>(() =>
  idTypes.value.map((idType) => ({ label: `${idType.idName} ${idType.idCode}`, value: idType.id })),
)

const idTypeCodeOptions = computed<SelectOption[]>(() =>
  idTypes.value.map((idType) => ({ label: `${idType.idName} ${idType.idCode}`, value: idType.idCode })),
)

const idTypeNameOptions = computed<SelectOption[]>(() =>
  idTypes.value.map((idType) => ({ label: idType.idName, value: idType.idName })),
)

const joinedGraphNodes = computed<IdmGraphNode[]>(() => graph.value?.nodes.filter((node) => node.joined) ?? [])

const joinedGraphNodeIds = computed<Set<string>>(() => new Set(joinedGraphNodes.value.map((node) => node.idTypeId)))

const availableGraphIdTypes = computed(() =>
  idTypes.value.map((idType) => ({
    idType,
    joined: joinedGraphNodeIds.value.has(idType.id),
    available: idType.isGraphAvailable && idType.status !== 'DATA_NOT_CONFIGURED',
  })),
)

const graphNodeOptions = computed<SelectOption[]>(() =>
  joinedGraphNodes.value.map((node) => ({ label: `${node.idName} ${node.idCode}`, value: node.idTypeId })),
)

const selectedGraphNode = computed(() =>
  joinedGraphNodes.value.find((node) => node.idTypeId === selectedGraphNodeId.value),
)

const selectedGraphEdge = computed(() =>
  graph.value?.edges.find((edge) => edge.id === selectedGraphEdgeId.value),
)

const graphRelationOptions = computed<SelectOption[]>(() =>
  relations.value
    .filter((relation) =>
      (!graphEdgeForm.sourceIdTypeId || relation.sourceIdTypeId === graphEdgeForm.sourceIdTypeId)
      && (!graphEdgeForm.targetIdTypeId || relation.targetIdTypeId === graphEdgeForm.targetIdTypeId),
    )
    .map((relation) => ({
      label: `${relation.relationName}（${relation.sourceIdName} → ${relation.targetIdName}）`,
      value: relation.id,
    })),
)

const graphSummary = computed(() => {
  const joined = joinedGraphNodes.value.length
  const edges = graph.value?.edges.length ?? 0
  const errors = validationItems.value.filter((item) => item.level === 'ERROR').length
  const warnings = validationItems.value.filter((item) => item.level === 'WARNING').length
  return { joined, edges, errors, warnings }
})

const taskRows = computed(() =>
  tasks.value.filter((task) => {
    const keyword = taskKeyword.value.trim().toLowerCase()
    const matchKeyword = !keyword
      || task.taskName.toLowerCase().includes(keyword)
      || task.tableName.toLowerCase().includes(keyword)
      || task.owner.toLowerCase().includes(keyword)
      || task.idTypeCode?.toLowerCase().includes(keyword)
    const matchType = taskTypeFilter.value === 'ALL' || task.taskType === taskTypeFilter.value
    const matchStatus = taskStatusFilter.value === 'ALL' || task.status === taskStatusFilter.value
    return matchKeyword && matchType && matchStatus
  }),
)

const taskStats = computed(() => {
  const rows = taskRows.value
  const finished = rows.filter((task) => task.durationSeconds)
  const averageDuration = finished.length
    ? Math.round(finished.reduce((sum, task) => sum + (task.durationSeconds ?? 0), 0) / finished.length)
    : 0
  return {
    total: rows.length,
    success: rows.filter((task) => task.status === 'SUCCESS').length,
    failed: rows.filter((task) => task.status === 'FAILED').length,
    running: rows.filter((task) => task.status === 'RUNNING').length,
    waiting: rows.filter((task) => task.status === 'WAITING').length,
    averageDuration,
  }
})

const selectedTasks = computed(() => {
  const idSet = new Set(selectedTaskIds.value.map(String))
  return taskRows.value.filter((task) => idSet.has(task.id))
})

const exploreValues = computed(() =>
  exploreForm.idValues.split(/\n|,/).map((value) => value.trim()).filter(Boolean),
)

const filteredMappingResults = computed(() =>
  exploreForm.abnormalOnly
    ? mappingResults.value.filter((row) => row.abnormal)
    : mappingResults.value,
)

const selectedMappingChanges = computed(() => {
  const keyword = exploreChangeKeyword.value.trim().toLowerCase()
  return changeLogs.value.filter((item) => {
    const matchKeyword = !keyword
      || item.idTypeCode.toLowerCase().includes(keyword)
      || item.idValue.toLowerCase().includes(keyword)
      || item.oldBaseId.toLowerCase().includes(keyword)
      || item.newBaseId.toLowerCase().includes(keyword)
      || item.taskName.toLowerCase().includes(keyword)
    const matchSelected = !selectedMapping.value
      || item.idValue === selectedMapping.value.idValue
      || item.oldBaseId === selectedMapping.value.baseId
      || item.newBaseId === selectedMapping.value.baseId
    return matchKeyword && matchSelected
  })
})

const exploreSummary = computed(() => {
  const rows = mappingResults.value
  const hitRows = rows.filter((row) => row.baseId && !row.abnormal)
  const abnormalRows = rows.filter((row) => row.abnormal)
  const relatedCount = rows.reduce((sum, row) => sum + row.relatedIds.length, 0)
  return {
    inputCount: exploreValues.value.length,
    resultCount: rows.length,
    hitCount: hitRows.length,
    abnormalCount: abnormalRows.length,
    relatedCount,
    changeCount: selectedMappingChanges.value.length,
  }
})

const lineageNodeMap = computed(() => new Map(lineageGraph.value?.nodes.map((node) => [node.id, node]) ?? []))

const currentLineageNode = computed(() => {
  const nodes = lineageGraph.value?.nodes ?? []
  const selectedNode = nodes.find((node) => node.id === selectedLineageNodeId.value)
  if (selectedNode) {
    return selectedNode
  }
  const keyword = lineageForm.objectName.trim().toLowerCase()
  return nodes.find((node) => node.label.toLowerCase().includes(keyword)) ?? nodes[0]
})

const visibleLineageNodeIds = computed(() => {
  if (!lineageGraph.value || !currentLineageNode.value) {
    return new Set<string>()
  }
  return collectLineageNodeIds(currentLineageNode.value.id, lineageDirection.value, lineageForm.depth)
})

const filteredLineageNodes = computed(() => {
  const keyword = lineageKeyword.value.trim().toLowerCase()
  return (lineageGraph.value?.nodes ?? []).filter((node) => {
    const inScope = !visibleLineageNodeIds.value.size || visibleLineageNodeIds.value.has(node.id)
    const matchKeyword = !keyword
      || node.label.toLowerCase().includes(keyword)
      || node.type.toLowerCase().includes(keyword)
      || node.description?.toLowerCase().includes(keyword)
      || node.owner?.toLowerCase().includes(keyword)
    const matchType = lineageNodeTypeFilter.value === 'ALL' || node.type === lineageNodeTypeFilter.value
    const matchStatus = lineageStatusFilter.value === 'ALL'
      || (lineageStatusFilter.value === 'NO_STATUS' ? !node.status : node.status === lineageStatusFilter.value)
    return inScope && matchKeyword && matchType && matchStatus
  })
})

const filteredLineageNodeIds = computed(() => new Set(filteredLineageNodes.value.map((node) => node.id)))

const filteredLineageEdges = computed(() => {
  const keyword = lineageKeyword.value.trim().toLowerCase()
  return (lineageGraph.value?.edges ?? []).filter((edge) => {
    const source = lineageNodeMap.value.get(edge.source)
    const target = lineageNodeMap.value.get(edge.target)
    const inScope = filteredLineageNodeIds.value.has(edge.source) && filteredLineageNodeIds.value.has(edge.target)
    const matchKeyword = !keyword
      || edge.relationName.toLowerCase().includes(keyword)
      || edge.rule?.toLowerCase().includes(keyword)
      || source?.label.toLowerCase().includes(keyword)
      || target?.label.toLowerCase().includes(keyword)
    return inScope && matchKeyword
  })
})

const lineageStats = computed(() => {
  const currentId = currentLineageNode.value?.id
  const upstream = currentId ? collectLineageNodeIds(currentId, 'UPSTREAM', lineageForm.depth).size - 1 : 0
  const downstream = currentId ? collectLineageNodeIds(currentId, 'DOWNSTREAM', lineageForm.depth).size - 1 : 0
  const highImpact = filteredLineageEdges.value.filter((edge) => edge.impactLevel === 'HIGH').length
  return {
    nodes: filteredLineageNodes.value.length,
    edges: filteredLineageEdges.value.length,
    upstream,
    downstream,
    highImpact,
  }
})

const lineageImpactRows = computed(() => {
  const currentId = currentLineageNode.value?.id
  if (!currentId) {
    return []
  }
  const downstreamIds = collectLineageNodeIds(currentId, 'DOWNSTREAM', lineageForm.depth)
  return filteredLineageEdges.value
    .filter((edge) => downstreamIds.has(edge.target))
    .map((edge) => {
      const target = lineageNodeMap.value.get(edge.target)
      return {
        id: `${edge.source}-${edge.target}`,
        objectName: target?.label ?? edge.target,
        objectType: target?.type ?? 'DATASET',
        relationName: edge.relationName,
        impactLevel: edge.impactLevel,
        status: edge.status,
        owner: target?.owner ?? '-',
        updatedAt: target?.updatedAt ?? edge.updatedAt,
      }
    })
})

const filteredCrossRelations = computed(() => {
  const keyword = crossKeyword.value.trim().toLowerCase()
  return crossRelations.value.filter((relation) => {
    const matchKeyword = !keyword
      || relation.relationName.toLowerCase().includes(keyword)
      || relation.relationDesc?.toLowerCase().includes(keyword)
      || relation.datasetName.toLowerCase().includes(keyword)
      || relation.subjectAName.toLowerCase().includes(keyword)
      || relation.subjectBName.toLowerCase().includes(keyword)
      || relation.owner?.toLowerCase().includes(keyword)
    const matchStatus = crossStatusFilter.value === 'ALL' || relation.status === crossStatusFilter.value
    return matchKeyword && matchStatus
  })
})

const crossStats = computed(() => {
  const rows = filteredCrossRelations.value
  const totalCount = rows.reduce((sum, relation) => sum + (relation.relationCount ?? 0), 0)
  const averageQuality = rows.length
    ? rows.reduce((sum, relation) => sum + (relation.qualityScore ?? 0), 0) / rows.length
    : 0
  return {
    total: rows.length,
    published: rows.filter((relation) => relation.status === 'PUBLISHED').length,
    draft: rows.filter((relation) => relation.status === 'DRAFT').length,
    offline: rows.filter((relation) => relation.status === 'OFFLINE').length,
    totalCount,
    averageQuality,
  }
})

const crossImpactObjects = computed(() =>
  (selectedCrossRelation.value?.downstreamObjects ?? []).map((name, index) => ({
    name,
    type: index === 0 ? '分析模型' : index === 1 ? '看板组件' : '运营任务',
    status: selectedCrossRelation.value?.status === 'PUBLISHED' ? '已生效' : '待发布',
  })),
)

const canEdit = computed(() => Boolean(permission.value?.canEdit))
const canRun = computed(() => Boolean(permission.value?.canRun))
const canDelete = computed(() => Boolean(permission.value?.canDelete))

const subjectTypeOptions: SelectOption[] = [
  { label: '用户 USER', value: 'USER' },
  { label: '车辆 VEHICLE', value: 'VEHICLE' },
  { label: '门店 SHOP', value: 'SHOP' },
  { label: '商品 ITEM', value: 'ITEM' },
  { label: '自定义 CUSTOM', value: 'CUSTOM' },
]

const channelOptions: SelectOption[] = [
  { label: 'UID', value: 'UID' },
  { label: '手机号 Phone', value: 'PHONE' },
  { label: '邮箱 Email', value: 'EMAIL' },
  { label: 'IDFA', value: 'IDFA' },
  { label: 'OAID', value: 'OAID' },
  { label: 'IMEI', value: 'IMEI' },
  { label: 'OpenID', value: 'OPENID' },
  { label: 'UnionID', value: 'UNIONID' },
  { label: 'Custom', value: 'CUSTOM' },
]

const dataSourceOptions: SelectOption[] = [
  { label: '不配置数据源', value: 'DATA_NOT_CONFIGURED' },
  { label: '仅实时', value: 'REALTIME_ONLY' },
  { label: '离线 + 实时', value: 'OFFLINE_REALTIME' },
]

const idDataTypeOptions: SelectOption[] = [
  { label: '字符串 STRING', value: 'STRING' },
  { label: '数值 NUMBER', value: 'NUMBER' },
]

const partitionFormatOptions: SelectOption[] = [
  { label: 'yyyyMMdd', value: 'yyyyMMdd' },
  { label: 'yyyy-MM-dd', value: 'yyyy-MM-dd' },
  { label: 'yyyyMMddHH', value: 'yyyyMMddHH' },
]

const updateModeOptions: SelectOption[] = [
  { label: '全量更新', value: 'FULL' },
  { label: '增量更新', value: 'INCREMENTAL' },
]

const previewColumns: DataTableColumns<IdmDataPreviewRow> = [
  { title: '序号', key: 'rowNo', width: 70 },
  { title: '当前 ID 字段值', key: 'idValue', minWidth: 180 },
  { title: '分区日期', key: 'partitionValue', width: 120 },
  { title: '原始字段值', key: 'rawValue', minWidth: 260 },
  {
    title: '质量',
    key: 'qualityFlag',
    width: 110,
    render: (row) => h(NTag, { type: row.qualityFlag === 'VALID' ? 'success' : row.qualityFlag === 'EMPTY' ? 'error' : 'warning' }, {
      default: () => row.qualityFlag === 'VALID' ? '有效' : row.qualityFlag === 'EMPTY' ? '空值' : '重复',
    }),
  },
]

const relationPreviewColumns: DataTableColumns<IdmRelationPreviewRow> = [
  { title: '序号', key: 'rowNo', width: 70 },
  { title: '来源 ID 值', key: 'sourceValue', minWidth: 180, render: (row) => row.sourceValue || '-' },
  { title: '目标 ID 值', key: 'targetValue', minWidth: 180, render: (row) => row.targetValue || '-' },
  { title: '分区日期', key: 'partitionValue', width: 120 },
  { title: '策略值', key: 'strategyValue', minWidth: 160, render: (row) => row.strategyValue || '-' },
  { title: '重复组大小', key: 'duplicateGroupSize', width: 110 },
  { title: '策略后目标', key: 'resolvedTargetValue', minWidth: 170, render: (row) => row.resolvedTargetValue ?? '-' },
  {
    title: '质量',
    key: 'qualityFlag',
    width: 130,
    render: (row) => {
      const typeMap: Record<IdmRelationPreviewRow['qualityFlag'], 'success' | 'warning' | 'error'> = {
        VALID: 'success',
        DUPLICATED_SOURCE: 'warning',
        EMPTY_FIELD: 'error',
        STRATEGY_EMPTY: 'warning',
      }
      const textMap: Record<IdmRelationPreviewRow['qualityFlag'], string> = {
        VALID: '有效',
        DUPLICATED_SOURCE: '来源重复',
        EMPTY_FIELD: '字段空值',
        STRATEGY_EMPTY: '策略空值',
      }
      return h(NTag, { type: typeMap[row.qualityFlag] }, { default: () => textMap[row.qualityFlag] })
    },
  },
]

function tabPath(tab: TabKey): string {
  const subjectId = selectedSubjectId.value || 'subj_user'
  const map: Record<TabKey, string> = {
    home: '/data-fusion/id-mapping',
    ids: `/data-fusion/id-mapping/subjects/${subjectId}/ids`,
    relations: `/data-fusion/id-mapping/subjects/${subjectId}/relations`,
    graph: `/data-fusion/id-mapping/subjects/${subjectId}/graph`,
    tasks: '/data-fusion/id-mapping/tasks',
    explore: '/data-fusion/id-mapping/explore',
    lineage: '/data-fusion/id-mapping/lineage',
    cross: '/data-fusion/id-mapping/cross-subject-relations',
    settings: '/data-fusion/id-mapping/settings',
  }
  return map[tab]
}

function syncStateFromRoute() {
  const meta = route.meta as IdmRouteMeta
  if (meta.idmTab) {
    activeTab.value = meta.idmTab
  }
  const subjectId = route.params.subjectId
  if (typeof subjectId === 'string') {
    selectedSubjectId.value = subjectId
  }
}

function handleTabChange(tab: string) {
  const nextTab = tab as TabKey
  activeTab.value = nextTab
  const nextPath = tabPath(nextTab)
  if (route.path !== nextPath) {
    router.push(nextPath)
  }
}

const mappingTypeOptions: SelectOption[] = [
  { label: '1:1', value: 'ONE_TO_ONE' },
  { label: '1:N', value: 'ONE_TO_MANY' },
  { label: 'N:1', value: 'MANY_TO_ONE' },
  { label: 'N:N', value: 'MANY_TO_MANY' },
]

const mappingTypeDescription = computed(() => {
  const map: Record<IdmReferenceRelation['mappingType'], string> = {
    ONE_TO_ONE: '一个来源 ID 只参考一个目标 ID，适合强绑定账号、手机号等高确定性关系。',
    ONE_TO_MANY: '一个来源 ID 可参考多个目标 ID，保存时必须通过策略字段明确最终归属。',
    MANY_TO_ONE: '多个来源 ID 可参考同一个目标 ID，适合设备、OpenID 等归并到 UID 的场景。',
    MANY_TO_MANY: '来源和目标都可能多值，建议仅在有明确策略和解绑规则时使用。',
  }
  return map[relationForm.mappingType]
})

const relationPreviewSummary = computed(() => {
  const total = relationPreviewRows.value.length
  const valid = relationPreviewRows.value.filter((row) => row.qualityFlag === 'VALID').length
  const duplicated = relationPreviewRows.value.filter((row) => row.qualityFlag === 'DUPLICATED_SOURCE').length
  const invalid = relationPreviewRows.value.filter((row) => row.qualityFlag === 'EMPTY_FIELD' || row.qualityFlag === 'STRATEGY_EMPTY').length
  return `预览 ${total} 行，正常 ${valid} 行，重复 ${duplicated} 行，需关注 ${invalid} 行。`
})

const strategyOptions: SelectOption[] = [
  { label: '最新', value: 'LATEST' },
  { label: '最早', value: 'EARLIEST' },
  { label: '最大', value: 'MAX' },
  { label: '最小', value: 'MIN' },
]

const taskStatusOptions: SelectOption[] = [
  { label: '全部状态', value: 'ALL' },
  { label: '成功', value: 'SUCCESS' },
  { label: '失败', value: 'FAILED' },
  { label: '运行中', value: 'RUNNING' },
  { label: '等待', value: 'WAITING' },
  { label: '未运行', value: 'NOT_RUN' },
  { label: '已取消', value: 'CANCELED' },
]

const taskTypeOptions: SelectOption[] = [
  { label: '全部类型', value: 'ALL' },
  { label: 'OneID 生成', value: 'ONEID_GENERATE' },
  { label: 'ID 数据同步', value: 'ID_SYNC' },
  { label: '参考关系生成', value: 'RELATION_GENERATE' },
  { label: '参考关系同步', value: 'RELATION_SYNC' },
  { label: '多主体关系生成', value: 'CROSS_SUBJECT_GENERATE' },
]

const crossStatusOptions: SelectOption[] = [
  { label: '全部状态', value: 'ALL' },
  { label: '草稿', value: 'DRAFT' },
  { label: '已发布', value: 'PUBLISHED' },
  { label: '已下线', value: 'OFFLINE' },
]

const envOptions: SelectOption[] = [
  { label: '全部', value: 'ALL' },
  { label: '离线', value: 'OFFLINE' },
  { label: '实时', value: 'REALTIME' },
]

const exploreModeOptions: SelectOption[] = [
  { label: 'ID 查 OneID', value: 'ID_TO_ONEID' },
  { label: 'OneID 反查关联 ID', value: 'ONEID_TO_ID' },
]

const lineageObjectTypeOptions: SelectOption[] = [
  { label: 'ID 类型', value: 'ID_TYPE' },
  { label: 'OneID 任务', value: 'ONEID_TASK' },
  { label: '标签', value: 'TAG' },
  { label: '分群', value: 'SEGMENT' },
  { label: '在线服务', value: 'ONLINE_SERVICE' },
  { label: '数据集', value: 'DATASET' },
  { label: '运营任务', value: 'MARKETING' },
]

const lineageDirectionOptions: SelectOption[] = [
  { label: '全部血缘', value: 'ALL' },
  { label: '只看上游', value: 'UPSTREAM' },
  { label: '只看下游', value: 'DOWNSTREAM' },
]

const lineageNodeTypeOptions: SelectOption[] = [
  { label: '全部节点', value: 'ALL' },
  { label: '数据集', value: 'DATASET' },
  { label: 'ID 类型', value: 'ID_TYPE' },
  { label: 'OneID 任务', value: 'ONEID_TASK' },
  { label: '标签', value: 'TAG' },
  { label: '分群', value: 'SEGMENT' },
  { label: '在线服务', value: 'ONLINE_SERVICE' },
  { label: '运营任务', value: 'MARKETING' },
]

const lineageStatusOptions: SelectOption[] = [
  { label: '全部状态', value: 'ALL' },
  { label: '成功', value: 'SUCCESS' },
  { label: '等待', value: 'WAITING' },
  { label: '运行中', value: 'RUNNING' },
  { label: '失败', value: 'FAILED' },
  { label: '无任务状态', value: 'NO_STATUS' },
]

const correctionScopeOptions: SelectOption[] = [
  { label: '可视化建模任务', value: 'VISUAL_MODELING' },
  { label: '数据档案详情', value: 'PROFILE_DETAIL' },
  { label: '行为 / 明细数据', value: 'BEHAVIOR_DETAIL' },
]

const onlineServiceObjectOptions: SelectOption[] = [
  { label: '主体 OneID 服务', value: 'SUBJECT' },
  { label: '多主体转换服务', value: 'CROSS_RELATION' },
]

const onlineAuthOptions: SelectOption[] = [
  { label: 'Token 鉴权', value: 'TOKEN' },
  { label: 'AK/SK 鉴权', value: 'AKSK' },
]

const visibilityTargetOptions: SelectOption[] = [
  { label: '角色', value: 'ROLE' },
  { label: '用户组', value: 'USER_GROUP' },
  { label: '用户', value: 'USER' },
]

const subjectColumns = computed<DataTableColumns<IdmSubject>>(() => [
  { title: '主体名称', key: 'subjectName', fixed: 'left', width: 130 },
  { title: '英文标识', key: 'subjectCode', width: 120 },
  {
    title: '主体类型',
    key: 'subjectType',
    width: 110,
    render: (row) => h(NTag, { type: row.subjectType === 'USER' ? 'success' : 'info' }, { default: () => row.subjectType }),
  },
  { title: 'ID 类型', key: 'idTypeCount', width: 90 },
  { title: '参考关系', key: 'relationCount', width: 100 },
  {
    title: '配置状态',
    key: 'configStatus',
    width: 130,
    render: (row) => h(NTag, { type: statusTagType(row.configStatus) }, { default: () => configStatusText(row.configStatus) }),
  },
  {
    title: '任务状态',
    key: 'latestTaskStatus',
    width: 110,
    render: (row) => h(NTag, { type: taskTagType(row.latestTaskStatus) }, { default: () => taskStatusText(row.latestTaskStatus) }),
  },
  { title: '最近发布', key: 'lastPublishedAt', width: 170, render: (row) => row.lastPublishedAt ?? '-' },
  { title: '最近运行', key: 'lastRunAt', width: 170, render: (row) => row.lastRunAt ?? '-' },
  { title: '创建人', key: 'createdBy', width: 120 },
  {
    title: '操作',
    key: 'actions',
    fixed: 'right',
    width: 320,
    render: (row) => h(NSpace, { size: 8 }, {
      default: () => [
        h(NButton, { text: true, type: 'primary', onClick: () => openSubjectConfig(row.id) }, { default: () => '编辑配置' }),
        h(NButton, { text: true, onClick: () => openGraph(row.id) }, { default: () => '查看图谱' }),
        h(NButton, { text: true, onClick: () => openTaskForSubject(row.id) }, { default: () => '查看任务' }),
        h(NButton, { text: true, type: 'primary', disabled: !canEdit.value, onClick: () => openPublishConfirm(row.id) }, { default: () => '发布' }),
        h(NButton, { text: true, type: 'error', disabled: !canDelete.value, onClick: () => deleteSubject(row.id) }, { default: () => '删除' }),
      ],
    }),
  },
])

const idTypeColumns = computed<DataTableColumns<IdmIdType>>(() => [
  { title: 'ID 名称', key: 'idName', fixed: 'left', width: 150 },
  { title: '英文标识', key: 'idCode', width: 140 },
  { title: '类型', key: 'idKind', width: 100, render: (row) => row.idKind === 'COMPOSITE' ? '组合 ID' : '单一 ID' },
  { title: '数据类型', key: 'idDataType', width: 100 },
  { title: '渠道标识', key: 'channelIdentifier', width: 110 },
  { title: '数据来源', key: 'dataSourceType', width: 130, render: (row) => dataSourceText(row.dataSourceType) },
  { title: '数据集', key: 'datasetName', minWidth: 220, render: (row) => row.datasetName ?? '-' },
  { title: '更新方式', key: 'updateMode', width: 100, render: (row) => row.updateMode ?? '-' },
  {
    title: '可入图谱',
    key: 'isGraphAvailable',
    width: 100,
    render: (row) => h(NTag, { type: row.isGraphAvailable ? 'success' : 'warning' }, { default: () => row.isGraphAvailable ? '可用' : '不可用' }),
  },
  {
    title: '状态',
    key: 'status',
    width: 120,
    render: (row) => h(NTag, { type: row.status === 'JOINED_GRAPH' ? 'success' : row.status === 'DATA_NOT_CONFIGURED' ? 'warning' : 'info' }, { default: () => idStatusText(row.status) }),
  },
  {
    title: '操作',
    key: 'actions',
    fixed: 'right',
    width: 180,
    render: (row) => h(NSpace, { size: 8 }, {
      default: () => [
        h(NButton, { text: true, type: 'primary', disabled: !canEdit.value, onClick: () => editIdType(row) }, { default: () => '编辑' }),
        h(NButton, { text: true, onClick: () => openLineageFor(`ID 类型 ${row.idName}`) }, { default: () => '血缘' }),
        h(NButton, { text: true, type: 'error', disabled: !canDelete.value, onClick: () => openDeleteIdType(row) }, { default: () => '删除' }),
      ],
    }),
  },
])

const relationColumns = computed<DataTableColumns<IdmReferenceRelation>>(() => [
  { title: '关系名称', key: 'relationName', fixed: 'left', width: 180 },
  { title: '描述', key: 'relationDesc', minWidth: 220, render: (row) => row.relationDesc ?? '-' },
  { title: '来源 ID', key: 'sourceIdName', width: 130 },
  { title: '参考 ID', key: 'targetIdName', width: 130 },
  { title: '字段映射', key: 'fieldMapping', minWidth: 190, render: (row) => `${row.sourceField} → ${row.targetField}` },
  { title: '映射方式', key: 'mappingType', width: 110, render: (row) => mappingTypeText(row.mappingType) },
  { title: '数据集', key: 'datasetName', minWidth: 220 },
  { title: '分区', key: 'partitionField', width: 150, render: (row) => `${row.partitionField} / ${row.partitionFormat}` },
  { title: '策略', key: 'strategyType', width: 150, render: (row) => row.strategyEnabled ? `${row.strategyField ?? '策略字段'} / ${row.strategyType}` : '默认' },
  { title: '解绑', key: 'unbindEnabled', width: 80, render: (row) => row.unbindEnabled ? '开启' : '关闭' },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) => h(NTag, { type: row.status === 'PUBLISHED' ? 'success' : 'warning' }, { default: () => row.status === 'PUBLISHED' ? '已发布' : '草稿' }),
  },
  {
    title: '操作',
    key: 'actions',
    fixed: 'right',
    width: 260,
    render: (row) => h(NSpace, { size: 8 }, {
      default: () => [
        h(NButton, { text: true, type: 'primary', disabled: !canEdit.value, onClick: () => editRelation(row) }, { default: () => '编辑' }),
        h(NButton, { text: true, disabled: !canEdit.value, onClick: () => copyRelation(row.id) }, { default: () => '复制' }),
        h(NButton, { text: true, onClick: () => previewRelationFromRow(row) }, { default: () => '预览' }),
        h(NButton, { text: true, type: 'error', disabled: !canDelete.value, onClick: () => openDeleteRelation(row) }, { default: () => '删除' }),
      ],
    }),
  },
])

const taskColumns = computed<DataTableColumns<IdmTask>>(() => [
  { type: 'selection', fixed: 'left', width: 48 },
  { title: '任务名称', key: 'taskName', fixed: 'left', width: 190 },
  { title: '任务类型', key: 'taskType', width: 140, render: (row) => taskTypeText(row.taskType) },
  { title: '主体', key: 'subjectName', width: 100, render: (row) => row.subjectName ?? '-' },
  { title: '库表名', key: 'tableName', minWidth: 220 },
  { title: '身份标识', key: 'idTypeCode', width: 110, render: (row) => row.idTypeCode ?? '-' },
  { title: '创建时间', key: 'createdAt', width: 170 },
  { title: '最近运行', key: 'lastRunAt', width: 170, render: (row) => row.lastRunAt ?? '-' },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) => h(NTag, { type: taskTagType(row.status) }, { default: () => taskStatusText(row.status) }),
  },
  { title: '耗时', key: 'durationSeconds', width: 100, render: (row) => formatDuration(row.durationSeconds) },
  {
    title: '操作',
    key: 'actions',
    fixed: 'right',
    width: 430,
    render: (row) => h(NSpace, { size: 8 }, {
      default: () => [
        h(NButton, { text: true, type: 'primary', onClick: () => openTaskDrawer(row, 'dag') }, { default: () => '运行视图' }),
        h(NButton, { text: true, onClick: () => openTaskDrawer(row, 'runs') }, { default: () => '运行记录' }),
        h(NButton, { text: true, onClick: () => rerunWithUpstream(row), disabled: !canRun.value || row.status === 'RUNNING' }, { default: () => '连同上游重跑' }),
        h(NButton, { text: true, type: 'primary', disabled: !canRun.value || row.status === 'RUNNING', onClick: () => askRerun(row) }, { default: () => '重新运行' }),
        row.status === 'RUNNING'
          ? h(NButton, { text: true, type: 'success', disabled: !canRun.value, onClick: () => finishTask(row, 'SUCCESS') }, { default: () => '模拟完成' })
          : null,
        row.status === 'RUNNING' || row.status === 'WAITING'
          ? h(NButton, { text: true, type: 'error', disabled: !canRun.value, onClick: () => cancelTask(row) }, { default: () => '取消' })
          : null,
      ],
    }),
  },
])

const mappingColumns: DataTableColumns<IdmOneIdMappingResult> = [
  { title: 'ID 类型', key: 'idTypeName', width: 130 },
  {
    title: 'ID 值',
    key: 'idValue',
    width: 260,
    ellipsis: { tooltip: true },
    cellProps: () => ({ class: 'mapping-id-cell' }),
    render: (row) => h('span', { class: 'cell-mono', title: row.idValue }, row.idValue),
  },
  {
    title: 'OneID',
    key: 'baseId',
    width: 210,
    render: (row) => row.baseId
      ? h(NButton, { text: true, type: 'primary', class: 'cell-link-mono', onClick: () => copyOneId(row.baseId ?? '') }, { default: () => row.baseId })
      : '-',
  },
  { title: '来源环境', key: 'env', width: 100 },
  { title: '生成任务', key: 'taskName', width: 180, render: (row) => row.taskName ?? '-' },
  { title: '最近更新', key: 'updatedAt', width: 170, render: (row) => row.updatedAt ?? '-' },
  {
    title: '异常',
    key: 'abnormal',
    width: 220,
    render: (row) => row.abnormal
      ? h(NTag, { type: 'error' }, { default: () => row.abnormalReason ?? '异常' })
      : h(NTag, { type: 'success' }, { default: () => '正常' }),
  },
  {
    title: '关联 ID',
    key: 'relatedIds',
    minWidth: 240,
    render: (row) => {
      if (!exploreForm.includeRelated) {
        return '已隐藏'
      }
      if (!row.relatedIds.length) {
        return '-'
      }
      return h('div', { class: 'related-inline-list' }, row.relatedIds.slice(0, 3).map((item) =>
        h(NTag, { size: 'small', round: true }, { default: () => `${item.idTypeName}: ${item.idValue}` }),
      ))
    },
  },
  {
    title: '操作',
    key: 'actions',
    fixed: 'right',
    width: 300,
    render: (row) => h(NSpace, { size: 8 }, {
      default: () => [
        h(NButton, { text: true, type: 'primary', onClick: () => inspectMapping(row) }, { default: () => '查看详情' }),
        h(NButton, { text: true, onClick: () => openLineageFor(`${row.idTypeName} ${row.idValue}`) }, { default: () => '血缘' }),
        h(NButton, { text: true, onClick: () => openMappingChanges(row) }, { default: () => '重组变化' }),
        h(NButton, { text: true, onClick: () => exportOneId(row) }, { default: () => '导出' }),
      ],
    }),
  },
]

const changeColumns: DataTableColumns<IdmOneIdChangeLog> = [
  { title: '变更时间', key: 'changedAt', width: 170 },
  { title: 'ID 类型', key: 'idTypeCode', width: 120 },
  { title: 'ID 值', key: 'idValue', minWidth: 160 },
  { title: '变更前 OneID', key: 'oldBaseId', width: 180 },
  { title: '变更后 OneID', key: 'newBaseId', width: 180 },
  { title: '变更原因', key: 'changeReason', width: 150, render: (row) => changeReasonText(row.changeReason) },
  { title: '触发任务', key: 'taskName', width: 180 },
  { title: '配置版本', key: 'versionNo', width: 100 },
  { title: '操作人', key: 'operator', width: 120 },
  {
    title: '操作',
    key: 'actions',
    fixed: 'right',
    width: 120,
    render: (row) => h(NButton, { text: true, type: 'primary', onClick: () => openLineageFor(`OneID 重组 ${row.newBaseId}`) }, { default: () => '看血缘' }),
  },
]

const lineageNodeColumns: DataTableColumns<IdmLineageNode> = [
  { title: '节点名称', key: 'label', minWidth: 220 },
  { title: '类型', key: 'type', width: 130, render: (row) => lineageTypeText(row.type) },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) => row.status
      ? h(NTag, { type: taskTagType(row.status) }, { default: () => taskStatusText(row.status as IdmTaskStatus) })
      : h(NTag, { type: 'default' }, { default: () => '无状态' }),
  },
  { title: '负责人', key: 'owner', width: 130, render: (row) => row.owner ?? '-' },
  { title: '对象量', key: 'objectCount', width: 120, render: (row) => row.objectCount?.toLocaleString() ?? '-' },
  { title: '最近更新', key: 'updatedAt', width: 170, render: (row) => row.updatedAt ?? '-' },
  {
    title: '操作',
    key: 'actions',
    fixed: 'right',
    width: 260,
    render: (row) => h(NSpace, { size: 8 }, {
      default: () => [
        h(NButton, { text: true, type: 'primary', onClick: () => focusLineageNode(row) }, { default: () => '定位' }),
        h(NButton, { text: true, onClick: () => showNodeUpstream(row) }, { default: () => '上游' }),
        h(NButton, { text: true, onClick: () => showNodeDownstream(row) }, { default: () => '下游' }),
      ],
    }),
  },
]

const lineageEdgeColumns: DataTableColumns<IdmLineageEdge> = [
  { title: '上游对象', key: 'source', minWidth: 180, render: (row) => lineageNodeMap.value.get(row.source)?.label ?? row.source },
  { title: '下游对象', key: 'target', minWidth: 180, render: (row) => lineageNodeMap.value.get(row.target)?.label ?? row.target },
  { title: '关系类型', key: 'edgeType', width: 120, render: (row) => lineageEdgeTypeText(row.edgeType) },
  { title: '关系名称', key: 'relationName', minWidth: 180 },
  { title: '规则', key: 'rule', minWidth: 220, render: (row) => row.rule ?? '-' },
  {
    title: '影响',
    key: 'impactLevel',
    width: 100,
    render: (row) => h(NTag, { type: impactTagType(row.impactLevel) }, { default: () => impactLevelText(row.impactLevel) }),
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) => row.status
      ? h(NTag, { type: taskTagType(row.status) }, { default: () => taskStatusText(row.status as IdmTaskStatus) })
      : '-',
  },
  { title: '更新时间', key: 'updatedAt', width: 170 },
  {
    title: '操作',
    key: 'actions',
    fixed: 'right',
    width: 180,
    render: (row) => h(NSpace, { size: 8 }, {
      default: () => [
        h(NButton, { text: true, type: 'primary', onClick: () => focusLineageNode(lineageNodeMap.value.get(row.target)) }, { default: () => '看下游' }),
        h(NButton, { text: true, onClick: () => focusLineageNode(lineageNodeMap.value.get(row.source)) }, { default: () => '看上游' }),
      ],
    }),
  },
]

const lineageImpactColumns: DataTableColumns<{
  id: string
  objectName: string
  objectType: IdmLineageNode['type']
  relationName: string
  impactLevel: IdmLineageEdge['impactLevel']
  status?: IdmTaskStatus
  owner: string
  updatedAt: string
}> = [
  { title: '影响对象', key: 'objectName', minWidth: 180 },
  { title: '对象类型', key: 'objectType', width: 120, render: (row) => lineageTypeText(row.objectType) },
  { title: '依赖关系', key: 'relationName', minWidth: 180 },
  {
    title: '影响等级',
    key: 'impactLevel',
    width: 100,
    render: (row) => h(NTag, { type: impactTagType(row.impactLevel) }, { default: () => impactLevelText(row.impactLevel) }),
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) => row.status
      ? h(NTag, { type: taskTagType(row.status) }, { default: () => taskStatusText(row.status as IdmTaskStatus) })
      : '-',
  },
  { title: '负责人', key: 'owner', width: 130 },
  { title: '最近更新', key: 'updatedAt', width: 170 },
]

const runRecordColumns: DataTableColumns<IdmTaskRunRecord> = [
  { title: '运行日期', key: 'runDate', width: 120 },
  { title: '触发方式', key: 'triggerType', width: 100 },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) => h(NTag, { type: taskTagType(row.status) }, { default: () => taskStatusText(row.status) }),
  },
  { title: '开始时间', key: 'startTime', width: 170 },
  { title: '结束时间', key: 'endTime', width: 170, render: (row) => row.endTime ?? '-' },
  { title: '耗时', key: 'durationSeconds', width: 100, render: (row) => formatDuration(row.durationSeconds) },
  { title: '分区', key: 'partition', width: 150 },
  { title: '错误信息', key: 'errorMessage', minWidth: 220, render: (row) => row.errorMessage ?? '-' },
]

const crossColumns: DataTableColumns<IdmCrossSubjectRelation> = [
  { title: '关系名称', key: 'relationName', fixed: 'left', width: 190 },
  { title: '描述', key: 'relationDesc', minWidth: 220, render: (row) => row.relationDesc ?? '-' },
  { title: '数据集', key: 'datasetName', minWidth: 220 },
  { title: '主体 A', key: 'subjectAName', width: 120 },
  { title: '主体 B', key: 'subjectBName', width: 120 },
  { title: '字段映射', key: 'fieldMapping', minWidth: 180, render: (row) => `${row.subjectAField ?? '-'} → ${row.subjectBField ?? '-'}` },
  { title: 'A 到 B', key: 'aToBMode', width: 120, render: (row) => crossModeText(row.aToBMode) },
  { title: 'B 到 A', key: 'bToAMode', width: 120, render: (row) => crossModeText(row.bToAMode) },
  { title: '策略', key: 'strategyType', width: 140, render: (row) => row.strategyField ? `${row.strategyField} / ${row.strategyType}` : '-' },
  { title: '关系量', key: 'relationCount', width: 120, render: (row) => formatNumber(row.relationCount ?? 0) },
  { title: '质量分', key: 'qualityScore', width: 100, render: (row) => row.qualityScore ? `${row.qualityScore.toFixed(1)}%` : '-' },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) => h(NTag, { type: crossStatusTagType(row.status) }, { default: () => crossStatusText(row.status) }),
  },
  { title: '负责人', key: 'owner', width: 130, render: (row) => row.owner ?? '-' },
  { title: '更新时间', key: 'updatedAt', width: 170 },
  {
    title: '操作',
    key: 'actions',
    fixed: 'right',
    width: 390,
    render: (row) => h(NSpace, { size: 8 }, {
      default: () => [
        h(NButton, { text: true, type: 'primary', onClick: () => inspectCrossRelation(row) }, { default: () => '详情' }),
        h(NButton, { text: true, disabled: !canEdit.value, onClick: () => editCrossRelation(row) }, { default: () => '编辑' }),
        h(NButton, { text: true, onClick: () => previewCrossRelation(row) }, { default: () => '预览' }),
        h(NButton, { text: true, disabled: !canEdit.value, onClick: () => copyCrossRelation(row) }, { default: () => '复制' }),
        row.status === 'PUBLISHED'
          ? h(NButton, { text: true, disabled: !canEdit.value, onClick: () => changeCrossStatus(row, 'OFFLINE') }, { default: () => '下线' })
          : h(NButton, { text: true, type: 'success', disabled: !canEdit.value, onClick: () => changeCrossStatus(row, 'PUBLISHED') }, { default: () => '发布' }),
        h(NButton, { text: true, type: 'error', disabled: !canDelete.value || row.status === 'PUBLISHED', onClick: () => deleteCrossRelation(row) }, { default: () => '删除' }),
      ],
    }),
  },
]

const crossPreviewColumns: DataTableColumns<IdmCrossSubjectPreviewRow> = [
  { title: '主体 A', key: 'subjectAName', width: 100 },
  { title: '主体 A ID', key: 'subjectAId', width: 150 },
  { title: '主体 B', key: 'subjectBName', width: 100 },
  { title: '主体 B ID', key: 'subjectBId', width: 150 },
  { title: '关系得分', key: 'relationScore', width: 110, render: (row) => `${row.relationScore.toFixed(1)}%` },
  { title: '策略值', key: 'strategyValue', minWidth: 180 },
  { title: '最近事件', key: 'lastEventTime', width: 170 },
  {
    title: '状态',
    key: 'status',
    width: 110,
    render: (row) => h(NTag, { type: crossPreviewStatusType(row.status) }, { default: () => crossPreviewStatusText(row.status) }),
  },
]

function statusTagType(status: string): 'success' | 'warning' | 'error' | 'info' | 'default' {
  if (status === 'PUBLISHED' || status === 'SUCCESS' || status === 'EFFECTIVE') {
    return 'success'
  }
  if (status.includes('FAILED') || status === 'FAILED') {
    return 'error'
  }
  if (status === 'RUNNING' || status === 'VALIDATED') {
    return 'info'
  }
  return 'warning'
}

function taskTagType(status: IdmTaskStatus): 'success' | 'warning' | 'error' | 'info' | 'default' {
  const map: Record<IdmTaskStatus, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
    SUCCESS: 'success',
    FAILED: 'error',
    RUNNING: 'info',
    WAITING: 'warning',
    NOT_RUN: 'default',
    CANCELED: 'default',
  }
  return map[status]
}

function lineageTypeText(type: IdmLineageNode['type']): string {
  const map: Record<IdmLineageNode['type'], string> = {
    DATASET: '数据集',
    ID_TYPE: 'ID 类型',
    ONEID_TASK: 'OneID 任务',
    TAG: '用户标签',
    SEGMENT: '用户分群',
    ONLINE_SERVICE: '在线服务',
    MARKETING: '运营任务',
  }
  return map[type]
}

function lineageEdgeTypeText(type: IdmLineageEdge['edgeType']): string {
  const map: Record<IdmLineageEdge['edgeType'], string> = {
    READS: '读取',
    GENERATES: '产出',
    DEPENDS_ON: '依赖',
    SERVES: '服务',
    TRIGGERS: '触发',
    EXPORTS: '输出',
  }
  return map[type]
}

function impactLevelText(level: IdmLineageEdge['impactLevel']): string {
  const map: Record<IdmLineageEdge['impactLevel'], string> = {
    HIGH: '高',
    MEDIUM: '中',
    LOW: '低',
  }
  return map[level]
}

function impactTagType(level: IdmLineageEdge['impactLevel']): 'success' | 'warning' | 'error' {
  if (level === 'HIGH') {
    return 'error'
  }
  if (level === 'MEDIUM') {
    return 'warning'
  }
  return 'success'
}

function configStatusText(status: string): string {
  const map: Record<string, string> = {
    NOT_CONFIGURED: '未配置',
    DRAFT: '草稿',
    VALIDATED: '已预检查',
    PUBLISHED: '已发布',
    DRAFT_CHANGED: '有未发布修改',
    VALIDATE_FAILED: '预检查失败',
    PUBLISH_FAILED: '发布失败',
  }
  return map[status] ?? status
}

function taskStatusText(status: IdmTaskStatus): string {
  const map: Record<IdmTaskStatus, string> = {
    NOT_RUN: '未运行',
    WAITING: '等待',
    RUNNING: '运行中',
    SUCCESS: '成功',
    FAILED: '失败',
    CANCELED: '已取消',
  }
  return map[status]
}

function dataSourceText(type: IdmIdType['dataSourceType']): string {
  const map: Record<IdmIdType['dataSourceType'], string> = {
    DATA_NOT_CONFIGURED: '未配置',
    REALTIME_ONLY: '仅实时',
    OFFLINE_REALTIME: '离线 + 实时',
  }
  return map[type]
}

function idStatusText(status: IdmIdType['status']): string {
  const map: Record<IdmIdType['status'], string> = {
    DATA_NOT_CONFIGURED: '未配置数据源',
    REALTIME_ONLY: '仅实时',
    DATA_CONFIGURED: '已配置数据源',
    JOINED_GRAPH: '已加入图谱',
  }
  return map[status]
}

function mappingTypeText(type: IdmReferenceRelation['mappingType']): string {
  const map: Record<IdmReferenceRelation['mappingType'], string> = {
    ONE_TO_ONE: '1:1',
    ONE_TO_MANY: '1:N',
    MANY_TO_ONE: 'N:1',
    MANY_TO_MANY: 'N:N',
  }
  return map[type]
}

function taskTypeText(type: IdmTask['taskType']): string {
  const map: Record<IdmTask['taskType'], string> = {
    ONEID_GENERATE: 'OneID 生成',
    ID_SYNC: 'ID 数据同步',
    RELATION_GENERATE: '参考关系生成',
    RELATION_SYNC: '参考关系同步',
    CROSS_SUBJECT_GENERATE: '多主体关系生成',
  }
  return map[type]
}

function changeReasonText(reason: IdmOneIdChangeLog['changeReason']): string {
  const map: Record<IdmOneIdChangeLog['changeReason'], string> = {
    REFERENCE_CHANGED: '参考关系变化',
    PRIORITY_CHANGED: '优先级变化',
    STRATEGY_CHANGED: '策略变化',
    MANUAL_CORRECTION: '数据修正',
  }
  return map[reason]
}

function crossModeText(mode: IdmCrossSubjectRelation['aToBMode']): string {
  const map: Record<IdmCrossSubjectRelation['aToBMode'], string> = {
    ONE_TO_ONE: '一对一',
    ONE_TO_MANY: '一对多',
    DENY: '不允许转换',
  }
  return map[mode]
}

function crossStatusText(status: IdmCrossSubjectRelation['status']): string {
  const map: Record<IdmCrossSubjectRelation['status'], string> = {
    DRAFT: '草稿',
    PUBLISHED: '已发布',
    OFFLINE: '已下线',
  }
  return map[status]
}

function crossStatusTagType(status: IdmCrossSubjectRelation['status']): 'success' | 'warning' | 'default' {
  if (status === 'PUBLISHED') {
    return 'success'
  }
  if (status === 'DRAFT') {
    return 'warning'
  }
  return 'default'
}

function crossPreviewStatusText(status: IdmCrossSubjectPreviewRow['status']): string {
  const map: Record<IdmCrossSubjectPreviewRow['status'], string> = {
    VALID: '有效',
    DUPLICATE: '重复',
    MISSING_FIELD: '字段缺失',
  }
  return map[status]
}

function crossPreviewStatusType(status: IdmCrossSubjectPreviewRow['status']): 'success' | 'warning' | 'error' {
  if (status === 'VALID') {
    return 'success'
  }
  if (status === 'DUPLICATE') {
    return 'warning'
  }
  return 'error'
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value)
}

function formatDuration(seconds?: number): string {
  if (!seconds) {
    return '-'
  }
  if (seconds < 60) {
    return `${seconds} 秒`
  }
  return `${Math.round(seconds / 60)} 分钟`
}

function generateSubjectCode(type: IdmSubjectType) {
  const baseMap: Record<IdmSubjectType, string> = {
    USER: 'user',
    VEHICLE: 'vehicle',
    SHOP: 'shop',
    ITEM: 'item',
    CUSTOM: 'custom_subject',
  }
  const base = baseMap[type]
  const nameMap: Record<IdmSubjectType, string> = {
    USER: '用户',
    VEHICLE: '车辆',
    SHOP: '门店',
    ITEM: '商品',
    CUSTOM: '自定义主体',
  }
  let nextCode = base
  let nextName = nameMap[type]
  let index = 2
  while (subjects.value.some((subject) => subject.subjectCode === nextCode)) {
    nextCode = `${base}_${index}`
    index += 1
  }
  index = 2
  while (subjects.value.some((subject) => subject.subjectName === nextName)) {
    nextName = `${nameMap[type]} ${index}`
    index += 1
  }
  subjectForm.subjectCode = nextCode
  subjectForm.subjectName = nextName
}

function openCreateSubjectModal() {
  generateSubjectCode(subjectForm.subjectType)
  subjectForm.description = '新的身份主体。'
  subjectForm.status = 'ENABLED'
  showSubjectModal.value = true
}

async function loadBase() {
  loading.value = true
  permission.value = await idMappingService.getPermission()
  const overview = await idMappingService.getOverview()
  overviewCards.value = [
    { label: '主体总数', value: `${overview.subjectTotal}` },
    { label: '已发布主体', value: `${overview.publishedSubjectCount}`, tone: 'success' },
    { label: '待发布主体', value: `${overview.draftSubjectCount}`, tone: 'warning' },
    { label: '今日成功任务', value: `${overview.todaySuccessTaskCount}`, tone: 'success' },
    { label: '今日失败任务', value: `${overview.todayFailedTaskCount}`, tone: 'error' },
    { label: '最近运行', value: overview.latestRunAt },
  ]
  alerts.value = overview.alerts
  datasets.value = await idMappingService.getDatasets()
  subjects.value = await idMappingService.listSubjects(subjectKeyword.value)
  if (!selectedSubjectId.value && subjects.value[0]) {
    selectedSubjectId.value = subjects.value[0].id
  }
  await loadSubjectConfig()
  await loadTasks()
  await loadCrossRelations()
  await loadSettings()
  await queryOneId()
  await queryChanges()
  await queryLineage()
  loading.value = false
  notice.value = '已加载用户 ID-Mapping 配置，可按配置主流程继续演示。'
}

async function refreshSubjects() {
  subjects.value = await idMappingService.listSubjects(subjectKeyword.value)
}

async function loadSubjectConfig() {
  if (!selectedSubjectId.value) {
    return
  }
  idTypes.value = await idMappingService.listIdTypes(selectedSubjectId.value)
  relations.value = await idMappingService.listRelations(selectedSubjectId.value)
  graph.value = await idMappingService.getGraph(selectedSubjectId.value)
  configVersions.value = await idMappingService.listConfigVersions(selectedSubjectId.value)
  idTemplates.value = await idMappingService.getTemplates()
  selectedGraphNodeId.value = graph.value.nodes.find((node) => node.joined)?.idTypeId ?? ''
  selectedGraphEdgeId.value = ''
  if (!relationForm.sourceIdTypeId) {
    relationForm.sourceIdTypeId = idTypes.value.find((item) => item.id !== relationForm.targetIdTypeId)?.id ?? ''
  }
}

async function selectSubject(subjectId: string) {
  selectedSubjectId.value = subjectId
  await loadSubjectConfig()
  await loadTasks()
  if (activeTab.value === 'ids' || activeTab.value === 'relations' || activeTab.value === 'graph') {
    const nextPath = tabPath(activeTab.value)
    if (route.path !== nextPath) {
      router.push(nextPath)
    }
  }
}

function openSubjectConfig(subjectId: string) {
  selectedSubjectId.value = subjectId
  handleTabChange('ids')
  loadSubjectConfig()
}

function openGraph(subjectId: string) {
  selectedSubjectId.value = subjectId
  handleTabChange('graph')
  loadSubjectConfig()
}

function openTaskForSubject(subjectId: string) {
  selectedSubjectId.value = subjectId
  handleTabChange('tasks')
  loadTasks()
}

async function createSubject() {
  try {
    const subject = await idMappingService.createSubject(subjectForm)
    await refreshSubjects()
    selectedSubjectId.value = subject.id
    handleTabChange('ids')
    showSubjectModal.value = false
    notice.value = `主体「${subject.subjectName}」已创建，系统已初始化 OneID 配置草稿。`
    await loadSubjectConfig()
  } catch (error) {
    notice.value = error instanceof Error ? error.message : '创建主体失败'
  }
}

async function deleteSubject(subjectId: string) {
  const response = await idMappingService.deleteSubject(subjectId)
  notice.value = response.message
  await refreshSubjects()
}

function editIdType(row: IdmIdType) {
  editingIdTypeId.value = row.id
  idForm.idKind = row.idKind
  idForm.idName = row.idName
  idForm.idCode = row.idCode
  idForm.channelIdentifier = row.channelIdentifier
  idForm.idDataType = row.idDataType
  idForm.dataSourceType = row.dataSourceType
  idForm.datasetId = row.datasetId ?? 'ds_user_identity_full'
  idForm.idField = row.idField ?? ''
  idForm.partitionField = row.partitionField ?? 'p_date'
  idForm.partitionFormat = row.partitionFormat ?? 'yyyyMMdd'
  idForm.updateMode = row.updateMode ?? 'FULL'
  idForm.dimensionDatasetId = row.dimensionDatasetId ?? 'ds_wechat_openid_relation'
  idForm.dimensionValueField = row.dimensionValueField ?? 'appid'
  idForm.dimensionNameField = row.dimensionNameField ?? 'appid'
  if (row.compositeParts?.[0]) {
    idForm.partOneName = row.compositeParts[0].partName
    idForm.partOneCode = row.compositeParts[0].partCode
    idForm.partOneField = row.compositeParts[0].fieldName
  }
  if (row.compositeParts?.[1]) {
    idForm.partTwoName = row.compositeParts[1].partName
    idForm.partTwoCode = row.compositeParts[1].partCode
    idForm.partTwoField = row.compositeParts[1].fieldName
  }
  dataPreviewRows.value = []
  showIdModal.value = true
}

function openCreateIdTypeModal() {
  editingIdTypeId.value = ''
  idForm.idKind = 'SINGLE'
  idForm.idName = '邮箱'
  idForm.idCode = 'email_sha256'
  idForm.channelIdentifier = 'EMAIL'
  idForm.idDataType = 'STRING'
  idForm.dataSourceType = 'OFFLINE_REALTIME'
  idForm.datasetId = 'ds_user_identity_full'
  idForm.idField = 'phone_md5'
  idForm.partitionField = 'p_date'
  idForm.partitionFormat = 'yyyyMMdd'
  idForm.updateMode = 'FULL'
  idForm.dimensionDatasetId = 'ds_wechat_openid_relation'
  idForm.dimensionValueField = 'appid'
  idForm.dimensionNameField = 'appid'
  dataPreviewRows.value = []
  showIdModal.value = true
}

async function previewIdDataSource() {
  if (!idForm.datasetId || !idForm.idField || !idForm.partitionField) {
    notice.value = '请先选择数据集、日期分区字段和 ID 字段。'
    return
  }
  try {
    dataPreviewRows.value = await idMappingService.getDataPreview({
      datasetId: idForm.datasetId,
      idField: idForm.idField,
      partitionField: idForm.partitionField,
    })
    notice.value = '已读取最新分区前 100 条的模拟预览数据。'
  } catch (error) {
    notice.value = error instanceof Error ? error.message : '数据预览失败'
  }
}

async function createIdType() {
  if (!selectedSubject.value) {
    return
  }
  try {
    const compositeParts: IdmCompositePart[] | undefined = idForm.idKind === 'COMPOSITE'
      ? [
          { partName: idForm.partOneName, partCode: idForm.partOneCode, dataType: 'STRING', fieldName: idForm.partOneField },
          { partName: idForm.partTwoName, partCode: idForm.partTwoCode, dataType: 'STRING', fieldName: idForm.partTwoField },
        ]
      : undefined
    const payload = {
      subjectId: selectedSubject.value.id,
      idName: idForm.idName,
      idCode: idForm.idCode,
      idKind: idForm.idKind,
      channelIdentifier: idForm.channelIdentifier,
      idDataType: idForm.idDataType,
      dataSourceType: idForm.dataSourceType,
      datasetId: idForm.dataSourceType === 'OFFLINE_REALTIME' ? idForm.datasetId : undefined,
      idField: idForm.idField,
      partitionField: idForm.partitionField,
      partitionFormat: idForm.partitionFormat,
      updateMode: idForm.updateMode,
      compositeParts,
      dimensionDatasetId: idForm.idKind === 'COMPOSITE' ? idForm.dimensionDatasetId : undefined,
      dimensionValueField: idForm.idKind === 'COMPOSITE' ? idForm.dimensionValueField : undefined,
      dimensionNameField: idForm.idKind === 'COMPOSITE' ? idForm.dimensionNameField : undefined,
    }
    const saved = editingIdTypeId.value
      ? await idMappingService.updateIdType(editingIdTypeId.value, payload)
      : await idMappingService.createIdType(payload)
    notice.value = editingIdTypeId.value
      ? `已更新 ID 类型「${saved.idName}」，相关配置已标记为待发布。`
      : `已创建 ID 类型「${saved.idName}」。`
    showIdModal.value = false
    editingIdTypeId.value = ''
    await loadSubjectConfig()
    await refreshSubjects()
  } catch (error) {
    notice.value = error instanceof Error ? error.message : '创建 ID 类型失败'
  }
}

async function createTemplates() {
  if (!selectedSubject.value) {
    return
  }
  const response = await idMappingService.createIdTypesFromTemplates(selectedSubject.value.id, idTemplates.value)
  notice.value = response.failedMessages.length
    ? `成功创建 ${response.created} 个 ID，失败：${response.failedMessages.join('；')}`
    : `成功创建 ${response.created} 个 ID 类型。`
  showTemplateModal.value = false
  await loadSubjectConfig()
  await refreshSubjects()
}

function openDeleteIdType(row: IdmIdType) {
  pendingDeleteId.value = row
  showDeleteIdModal.value = true
}

async function confirmDeleteIdType() {
  if (!pendingDeleteId.value) {
    return
  }
  const response = await idMappingService.deleteIdType(pendingDeleteId.value.id)
  notice.value = response.message
  showDeleteIdModal.value = false
  pendingDeleteId.value = null
  await loadSubjectConfig()
  await refreshSubjects()
}

function resetRelationForm() {
  editingRelationId.value = ''
  relationForm.relationName = '手机号绑定用户关系'
  relationForm.relationDesc = '低优先级 ID 参考高优先级 UID，生成统一 OneID。'
  relationForm.datasetId = 'ds_user_identity_full'
  relationForm.sourceIdTypeId = idTypes.value.find((item) => item.id !== 'id_uid')?.id ?? idTypes.value[0]?.id ?? ''
  relationForm.targetIdTypeId = idTypes.value.find((item) => item.id === 'id_uid')?.id ?? idTypes.value[0]?.id ?? ''
  relationForm.sourceField = idTypes.value.find((item) => item.id === relationForm.sourceIdTypeId)?.idField ?? 'phone_md5'
  relationForm.targetField = idTypes.value.find((item) => item.id === relationForm.targetIdTypeId)?.idField ?? 'uid'
  relationForm.partitionField = 'p_date'
  relationForm.partitionFormat = 'yyyyMMdd'
  relationForm.updateMode = 'FULL'
  relationForm.mappingType = 'MANY_TO_ONE'
  relationForm.strategyEnabled = true
  relationForm.strategyField = selectedRelationDataset.value?.fields.find((field) => field.dataType === 'DATETIME')?.name ?? 'updated_at'
  relationForm.strategyType = 'LATEST'
  relationForm.unbindEnabled = false
  relationPreviewRows.value = []
  relationValidationItems.value = []
}

function relationPayload() {
  if (!selectedSubject.value) {
    return null
  }
  return {
    subjectId: selectedSubject.value.id,
    relationName: relationForm.relationName,
    relationDesc: relationForm.relationDesc,
    datasetId: relationForm.datasetId,
    sourceIdTypeId: relationForm.sourceIdTypeId,
    targetIdTypeId: relationForm.targetIdTypeId,
    sourceField: relationForm.sourceField,
    targetField: relationForm.targetField,
    partitionField: relationForm.partitionField,
    partitionFormat: relationForm.partitionFormat,
    updateMode: relationForm.updateMode,
    mappingType: relationForm.mappingType,
    strategyEnabled: relationForm.strategyEnabled,
    strategyField: relationForm.strategyEnabled ? relationForm.strategyField : undefined,
    strategyType: relationForm.strategyEnabled ? relationForm.strategyType : undefined,
    unbindEnabled: relationForm.unbindEnabled,
  }
}

function openCreateRelationModal() {
  resetRelationForm()
  showRelationModal.value = true
}

function editRelation(row: IdmReferenceRelation) {
  editingRelationId.value = row.id
  relationForm.relationName = row.relationName
  relationForm.relationDesc = row.relationDesc ?? ''
  relationForm.datasetId = row.datasetId
  relationForm.sourceIdTypeId = row.sourceIdTypeId
  relationForm.targetIdTypeId = row.targetIdTypeId
  relationForm.sourceField = row.sourceField
  relationForm.targetField = row.targetField
  relationForm.partitionField = row.partitionField
  relationForm.partitionFormat = row.partitionFormat
  relationForm.updateMode = row.updateMode
  relationForm.mappingType = row.mappingType
  relationForm.strategyEnabled = row.strategyEnabled
  relationForm.strategyField = row.strategyField ?? selectedRelationDataset.value?.fields.find((field) => field.dataType === 'DATETIME')?.name ?? ''
  relationForm.strategyType = row.strategyType ?? 'LATEST'
  relationForm.unbindEnabled = row.unbindEnabled
  relationPreviewRows.value = []
  relationValidationItems.value = []
  showRelationModal.value = true
}

async function validateRelationConfig() {
  const payload = relationPayload()
  if (!payload) {
    return
  }
  relationValidationItems.value = await idMappingService.validateRelation(payload, editingRelationId.value || undefined)
  const errorCount = relationValidationItems.value.filter((item) => item.level === 'ERROR').length
  notice.value = errorCount
    ? `参考关系校验发现 ${errorCount} 个阻塞问题，请修正后保存。`
    : '参考关系校验通过，可保存草稿。'
}

async function previewRelationData() {
  const payload = relationPayload()
  if (!payload) {
    return
  }
  try {
    relationPreviewRows.value = await idMappingService.previewRelationData(payload)
    notice.value = '已生成关系数据预览，包含重复、空值和策略归属示例。'
  } catch (error) {
    notice.value = error instanceof Error ? error.message : '关系数据预览失败'
  }
}

async function previewRelationFromRow(row: IdmReferenceRelation) {
  editRelation(row)
  await previewRelationData()
}

async function saveRelationConfig() {
  if (!selectedSubject.value) {
    return
  }
  const payload = relationPayload()
  if (!payload) {
    return
  }
  try {
    relationValidationItems.value = await idMappingService.validateRelation(payload, editingRelationId.value || undefined)
    if (relationValidationItems.value.some((item) => item.level === 'ERROR')) {
      notice.value = '参考关系配置存在阻塞问题，请先处理校验结果。'
      return
    }
    const relation = editingRelationId.value
      ? await idMappingService.updateRelation(editingRelationId.value, payload)
      : await idMappingService.createRelation(payload)
    notice.value = editingRelationId.value
      ? `已更新参考关系「${relation.relationName}」，图谱配置已标记为待发布。`
      : `已创建参考关系「${relation.relationName}」，发布后参与 OneID 生成。`
    showRelationModal.value = false
    editingRelationId.value = ''
    await loadSubjectConfig()
    await refreshSubjects()
  } catch (error) {
    notice.value = error instanceof Error ? error.message : '保存参考关系失败'
  }
}

async function copyRelation(relationId: string) {
  try {
    const relation = await idMappingService.copyRelation(relationId)
    notice.value = `已复制参考关系「${relation.relationName}」，可继续编辑后发布。`
    await loadSubjectConfig()
    await refreshSubjects()
  } catch (error) {
    notice.value = error instanceof Error ? error.message : '复制参考关系失败'
  }
}

function openDeleteRelation(row: IdmReferenceRelation) {
  pendingDeleteRelation.value = row
  showDeleteRelationModal.value = true
}

async function confirmDeleteRelation() {
  if (!pendingDeleteRelation.value) {
    return
  }
  const response = await idMappingService.deleteRelation(pendingDeleteRelation.value.id)
  notice.value = response.message
  showDeleteRelationModal.value = false
  pendingDeleteRelation.value = null
  await loadSubjectConfig()
  await refreshSubjects()
}

function dragNode(nodeId: string) {
  draggedNodeId.value = nodeId
}

function markGraphChanged() {
  if (!graph.value) {
    return
  }
  graph.value.configStatus = graph.value.configStatus === 'PUBLISHED' ? 'DRAFT_CHANGED' : 'DRAFT'
  validationItems.value = []
}

function normalizeLocalGraphNodes() {
  if (!graph.value) {
    return
  }
  graph.value.nodes = graph.value.nodes
    .filter((node) => node.joined)
    .map((node, index) => ({ ...node, priority: index + 1, isBaseCandidate: index === 0 }))
}

function addGraphNode(idType: IdmIdType, insertIndex?: number) {
  if (!graph.value) {
    return
  }
  if (!idType.isGraphAvailable || idType.status === 'DATA_NOT_CONFIGURED') {
    notice.value = `${idType.idName} 未配置可用离线数据源，不能加入 OneID 图谱。`
    return
  }
  if (graph.value.nodes.some((node) => node.idTypeId === idType.id && node.joined)) {
    notice.value = `${idType.idName} 已在 OneID 图谱中。`
    return
  }
  const nextNode: IdmGraphNode = {
    idTypeId: idType.id,
    idName: idType.idName,
    idCode: idType.idCode,
    priority: graph.value.nodes.length + 1,
    isBaseCandidate: false,
    joined: true,
    warning: undefined,
  }
  const nodes = graph.value.nodes.filter((node) => node.idTypeId !== idType.id)
  const targetIndex = insertIndex ?? nodes.length
  nodes.splice(targetIndex, 0, nextNode)
  graph.value.nodes = nodes
  normalizeLocalGraphNodes()
  selectedGraphNodeId.value = idType.id
  markGraphChanged()
  notice.value = `已将 ${idType.idName} 加入 OneID 图谱。`
}

function removeGraphNode(node: IdmGraphNode) {
  if (!graph.value) {
    return
  }
  graph.value.nodes = graph.value.nodes.filter((item) => item.idTypeId !== node.idTypeId)
  graph.value.edges = graph.value.edges.filter((edge) => edge.sourceIdTypeId !== node.idTypeId && edge.targetIdTypeId !== node.idTypeId)
  normalizeLocalGraphNodes()
  selectedGraphNodeId.value = graph.value.nodes[0]?.idTypeId ?? ''
  selectedGraphEdgeId.value = ''
  markGraphChanged()
  notice.value = `已从图谱移除 ${node.idName}，相关参考边也已移除。`
}

function setGraphBaseNode(node: IdmGraphNode) {
  if (!graph.value) {
    return
  }
  const nodes = graph.value.nodes.filter((item) => item.idTypeId !== node.idTypeId)
  nodes.unshift(node)
  graph.value.nodes = nodes
  normalizeLocalGraphNodes()
  selectedGraphNodeId.value = node.idTypeId
  markGraphChanged()
}

function dropNode(targetNodeId: string) {
  if (!graph.value || !draggedNodeId.value || draggedNodeId.value === targetNodeId) {
    return
  }
  const nodes = [...graph.value.nodes]
  const fromIndex = nodes.findIndex((node) => node.idTypeId === draggedNodeId.value)
  const toIndex = nodes.findIndex((node) => node.idTypeId === targetNodeId)
  if (fromIndex < 0 && toIndex >= 0) {
    const draggedIdType = idTypes.value.find((item) => item.id === draggedNodeId.value)
    if (draggedIdType) {
      addGraphNode(draggedIdType, toIndex)
    }
    draggedNodeId.value = ''
    return
  }
  if (fromIndex < 0 || toIndex < 0) {
    return
  }
  const [movedNode] = nodes.splice(fromIndex, 1)
  if (!movedNode) {
    return
  }
  nodes.splice(toIndex, 0, movedNode)
  graph.value.nodes = nodes.map((node, index) => ({ ...node, priority: index + 1, isBaseCandidate: index === 0 }))
  draggedNodeId.value = ''
  selectedGraphNodeId.value = movedNode.idTypeId
  markGraphChanged()
}

function dropOnGraphCanvas() {
  if (!draggedNodeId.value) {
    return
  }
  const draggedIdType = idTypes.value.find((item) => item.id === draggedNodeId.value)
  if (draggedIdType) {
    addGraphNode(draggedIdType)
  }
  draggedNodeId.value = ''
}

function selectGraphNode(node: IdmGraphNode) {
  selectedGraphNodeId.value = node.idTypeId
  selectedGraphEdgeId.value = ''
}

function selectGraphEdge(edgeId: string) {
  selectedGraphEdgeId.value = edgeId
  selectedGraphNodeId.value = ''
}

function openCreateGraphEdge() {
  editingGraphEdgeId.value = ''
  graphEdgeForm.sourceIdTypeId = joinedGraphNodes.value.find((node) => !node.isBaseCandidate)?.idTypeId ?? joinedGraphNodes.value[0]?.idTypeId ?? ''
  graphEdgeForm.targetIdTypeId = joinedGraphNodes.value.find((node) => node.isBaseCandidate)?.idTypeId ?? joinedGraphNodes.value[1]?.idTypeId ?? ''
  const matchedRelation = relations.value.find((relation) =>
    relation.sourceIdTypeId === graphEdgeForm.sourceIdTypeId && relation.targetIdTypeId === graphEdgeForm.targetIdTypeId,
  ) ?? relations.value[0]
  graphEdgeForm.relationId = matchedRelation?.id ?? ''
  showGraphEdgeModal.value = true
}

function editGraphEdge(edge: IdmGraphEdge) {
  editingGraphEdgeId.value = edge.id
  graphEdgeForm.sourceIdTypeId = edge.sourceIdTypeId
  graphEdgeForm.targetIdTypeId = edge.targetIdTypeId
  graphEdgeForm.relationId = edge.relationId
  showGraphEdgeModal.value = true
}

function saveGraphEdge() {
  if (!graph.value) {
    return
  }
  const relation = relations.value.find((item) => item.id === graphEdgeForm.relationId)
  if (!relation) {
    notice.value = '请先选择一条可用参考关系。'
    return
  }
  if (graphEdgeForm.sourceIdTypeId === graphEdgeForm.targetIdTypeId) {
    notice.value = '参考边的来源 ID 和目标 ID 不能相同。'
    return
  }
  if (!joinedGraphNodeIds.value.has(graphEdgeForm.sourceIdTypeId) || !joinedGraphNodeIds.value.has(graphEdgeForm.targetIdTypeId)) {
    notice.value = '参考边两端 ID 必须先加入图谱。'
    return
  }
  const nextEdge: IdmGraphEdge = {
    id: editingGraphEdgeId.value || `edge_${Date.now()}`,
    sourceIdTypeId: graphEdgeForm.sourceIdTypeId,
    targetIdTypeId: graphEdgeForm.targetIdTypeId,
    relationId: relation.id,
    relationName: relation.relationName,
    strategyText: relation.strategyEnabled ? `按${relation.strategyField ?? '策略字段'}取${relation.strategyType ?? 'LATEST'}` : '默认参考',
  }
  graph.value.edges = editingGraphEdgeId.value
    ? graph.value.edges.map((edge) => edge.id === editingGraphEdgeId.value ? nextEdge : edge)
    : [nextEdge, ...graph.value.edges]
  selectedGraphEdgeId.value = nextEdge.id
  selectedGraphNodeId.value = ''
  showGraphEdgeModal.value = false
  markGraphChanged()
}

function deleteGraphEdge(edgeId: string) {
  if (!graph.value) {
    return
  }
  const edge = graph.value.edges.find((item) => item.id === edgeId)
  graph.value.edges = graph.value.edges.filter((item) => item.id !== edgeId)
  selectedGraphEdgeId.value = ''
  markGraphChanged()
  notice.value = edge ? `已移除参考边「${edge.relationName}」。` : '已移除参考边。'
}

async function saveGraphDraft() {
  if (!graph.value) {
    return
  }
  graph.value = await idMappingService.saveGraphDraft(graph.value)
  notice.value = 'OneID 图谱草稿已保存，配置状态已标记为待发布。'
  await refreshSubjects()
}

async function validateGraph() {
  if (!selectedSubject.value) {
    return
  }
  validationItems.value = graph.value && graph.value.subjectId === selectedSubject.value.id
    ? await idMappingService.validateGraphDraft(graph.value)
    : await idMappingService.validateGraph(selectedSubject.value.id)
  notice.value = validationItems.value.some((item) => item.level === 'ERROR')
    ? '预检查存在 Error，请修正后再发布。'
    : '预检查完成，当前仅存在可接受的 Warning / Info。'
}

async function publishCurrentSubject(subjectId = selectedSubject.value?.id) {
  if (!subjectId) {
    return { success: false, message: '未选择要发布的主体。' }
  }
  const response = graph.value && graph.value.subjectId === subjectId
    ? await idMappingService.publishGraphDraft(graph.value)
    : await idMappingService.publishGraph(subjectId)
  notice.value = response.message
  if (response.graph) {
    graph.value = response.graph
  }
  await refreshSubjects()
  await loadTasks()
  configVersions.value = await idMappingService.listConfigVersions(subjectId)
  if (!response.success) {
    await validateGraph()
  }
  return response
}

async function openPublishConfirm(subjectId = selectedSubject.value?.id) {
  if (!subjectId) {
    return
  }
  const items = graph.value && graph.value.subjectId === subjectId
    ? await idMappingService.validateGraphDraft(graph.value)
    : await idMappingService.validateGraph(subjectId)
  validationItems.value = items
  const errors = items.filter((item) => item.level === 'ERROR')
  if (errors.length) {
    notice.value = `预检查发现 ${errors.length} 个 Error，已阻止发布。`
    return
  }
  publishSubjectId.value = subjectId
  publishWarnings.value = items.filter((item) => item.level !== 'INFO')
  publishFeedback.value = ''
  showPublishConfirm.value = true
}

async function confirmPublishGraph() {
  if (publishing.value) {
    return
  }
  publishing.value = true
  publishFeedback.value = ''
  try {
    const subjectId = publishSubjectId.value || selectedSubject.value?.id
    const response = await publishCurrentSubject(subjectId)
    publishFeedback.value = response.message
    if (response.success) {
      showPublishConfirm.value = false
      publishSubjectId.value = ''
      publishWarnings.value = []
      handleTabChange('tasks')
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '发布失败，请稍后重试。'
    publishFeedback.value = message
    notice.value = message
  } finally {
    publishing.value = false
  }
}

async function restoreGraphVersion(versionId: string) {
  try {
    graph.value = await idMappingService.restoreConfigVersion(versionId)
    selectedGraphNodeId.value = graph.value.nodes[0]?.idTypeId ?? ''
    selectedGraphEdgeId.value = ''
    validationItems.value = []
    notice.value = '已将历史版本恢复为草稿，请预检查后重新发布。'
    await refreshSubjects()
  } catch (error) {
    notice.value = error instanceof Error ? error.message : '恢复版本失败'
  }
}

async function loadTasks() {
  tasks.value = await idMappingService.listTasks({
    subjectId: activeTab.value === 'tasks' ? selectedSubjectId.value : undefined,
    status: taskStatusFilter.value,
  })
  const validIds = new Set(tasks.value.map((task) => task.id))
  selectedTaskIds.value = selectedTaskIds.value.filter((id) => validIds.has(String(id)))
}

function askRerun(task: IdmTask) {
  pendingRunTask.value = task
  showRunConfirm.value = true
}

async function confirmRerunTask() {
  if (!pendingRunTask.value) {
    return
  }
  taskActionLoading.value = true
  try {
    const response = await idMappingService.rerunTask(pendingRunTask.value.id)
    notice.value = response.message
    showRunConfirm.value = false
    pendingRunTask.value = null
    await loadTasks()
    await refreshOpenTask()
  } finally {
    taskActionLoading.value = false
  }
}

async function confirmRunAllTasks() {
  taskActionLoading.value = true
  try {
    const response = await idMappingService.runAllTasks(selectedSubjectId.value)
    notice.value = response.message
    showRunAllConfirm.value = false
    await loadTasks()
    await refreshSubjects()
    await refreshOpenTask()
  } finally {
    taskActionLoading.value = false
  }
}

async function batchRunSelectedTasks() {
  if (!selectedTasks.value.length) {
    notice.value = '请先选择要运行的任务。'
    return
  }
  taskActionLoading.value = true
  try {
    const response = await idMappingService.runTasks(selectedTasks.value.map((task) => task.id))
    notice.value = response.message
    selectedTaskIds.value = []
    await loadTasks()
    await refreshSubjects()
    await refreshOpenTask()
  } finally {
    taskActionLoading.value = false
  }
}

async function rerunWithUpstream(task: IdmTask) {
  taskActionLoading.value = true
  try {
    const response = await idMappingService.rerunTaskWithUpstream(task.id)
    notice.value = response.message
    await loadTasks()
    await refreshSubjects()
    await refreshOpenTask()
  } finally {
    taskActionLoading.value = false
  }
}

async function cancelTask(task: IdmTask) {
  taskActionLoading.value = true
  try {
    const response = await idMappingService.cancelTask(task.id)
    notice.value = response.message
    await loadTasks()
    await refreshSubjects()
    await refreshOpenTask()
  } finally {
    taskActionLoading.value = false
  }
}

async function finishTask(task: IdmTask, status: Extract<IdmTaskStatus, 'SUCCESS' | 'FAILED'>) {
  taskActionLoading.value = true
  try {
    const response = await idMappingService.finishTask(task.id, status)
    notice.value = response.message
    await loadTasks()
    await refreshSubjects()
    await refreshOpenTask()
  } finally {
    taskActionLoading.value = false
  }
}

async function openTaskDrawer(task: IdmTask, tab: 'dag' | 'runs' | 'detail' = 'dag') {
  selectedTask.value = task
  taskDrawerTab.value = tab
  taskDag.value = await idMappingService.getTaskDag(task.id)
  taskRuns.value = await idMappingService.getTaskRuns(task.id)
  showTaskDrawer.value = true
}

async function refreshOpenTask() {
  if (!selectedTask.value) {
    return
  }
  const latestTask = tasks.value.find((task) => task.id === selectedTask.value?.id)
  if (!latestTask) {
    return
  }
  selectedTask.value = latestTask
  taskDag.value = await idMappingService.getTaskDag(latestTask.id)
  taskRuns.value = await idMappingService.getTaskRuns(latestTask.id)
}

async function queryOneId() {
  exploreLoading.value = true
  try {
    mappingResults.value = await idMappingService.queryOneId({
      idTypeCode: exploreForm.idTypeCode,
      idValues: exploreValues.value,
      env: exploreForm.env,
      queryMode: exploreForm.queryMode,
    })
    selectedMapping.value = mappingResults.value[0] ?? null
    await queryChanges()
    notice.value = `已完成 ${exploreValues.value.length} 个 ID 的映射探查，命中 ${exploreSummary.value.hitCount} 条，异常 ${exploreSummary.value.abnormalCount} 条。`
  } finally {
    exploreLoading.value = false
  }
}

async function queryChanges() {
  changeLogs.value = await idMappingService.queryOneIdChanges({
    keyword: exploreChangeKeyword.value,
    baseId: selectedMapping.value?.baseId,
  })
}

function collectLineageNodeIds(rootId: string, direction: LineageDirection, depth: number): Set<string> {
  const graphValue = lineageGraph.value
  const result = new Set<string>([rootId])
  if (!graphValue) {
    return result
  }
  const maxDepth = Math.max(1, depth)
  const queue: Array<{ id: string, level: number }> = [{ id: rootId, level: 0 }]
  while (queue.length) {
    const current = queue.shift()
    if (!current || current.level >= maxDepth) {
      continue
    }
    const nextEdges = graphValue.edges.filter((edge) => {
      if (direction === 'UPSTREAM') {
        return edge.target === current.id
      }
      if (direction === 'DOWNSTREAM') {
        return edge.source === current.id
      }
      return edge.source === current.id || edge.target === current.id
    })
    for (const edge of nextEdges) {
      const nextId = direction === 'UPSTREAM'
        ? edge.source
        : direction === 'DOWNSTREAM'
          ? edge.target
          : edge.source === current.id ? edge.target : edge.source
      if (!result.has(nextId)) {
        result.add(nextId)
        queue.push({ id: nextId, level: current.level + 1 })
      }
    }
  }
  return result
}

async function queryLineage() {
  lineageLoading.value = true
  try {
    lineageGraph.value = await idMappingService.getLineage(lineageForm)
    const matchedNode = lineageGraph.value.nodes.find((node) =>
      node.label.toLowerCase().includes(lineageForm.objectName.trim().toLowerCase()),
    ) ?? lineageGraph.value.nodes[0]
    selectedLineageNodeId.value = matchedNode?.id ?? ''
    notice.value = `已加载「${lineageForm.objectName || matchedNode?.label || '当前对象'}」的血缘，包含 ${lineageGraph.value.nodes.length} 个节点和 ${lineageGraph.value.edges.length} 条依赖关系。`
  } finally {
    lineageLoading.value = false
  }
}

function openLineageFor(objectName: string) {
  lineageForm.objectName = objectName
  handleTabChange('lineage')
  queryLineage()
}

function focusLineageNode(node?: IdmLineageNode) {
  if (!node) {
    return
  }
  selectedLineageNodeId.value = node.id
  lineageForm.objectName = node.label
  notice.value = `已定位到「${node.label}」，可继续查看它的上游来源、下游影响和依赖明细。`
}

function showNodeUpstream(node: IdmLineageNode) {
  focusLineageNode(node)
  lineageDirection.value = 'UPSTREAM'
  notice.value = `正在查看「${node.label}」的上游来源。`
}

function showNodeDownstream(node: IdmLineageNode) {
  focusLineageNode(node)
  lineageDirection.value = 'DOWNSTREAM'
  notice.value = `正在查看「${node.label}」的下游影响。`
}

function inspectLineageNode(node: IdmLineageNode) {
  focusLineageNode(node)
  notice.value = `${node.label}：${node.description ?? `类型 ${node.type}，当前状态 ${node.status ? taskStatusText(node.status) : '正常'}。`}`
}

async function refreshLineageDependencies() {
  await queryLineage()
  notice.value = '已刷新血缘依赖，节点、边关系和影响对象已同步更新。'
}

function exportLineageGraph() {
  const lines = [
    ['对象类型', '上游对象', '下游对象', '关系类型', '关系名称', '规则', '影响等级', '状态', '更新时间'].join(','),
    ...filteredLineageEdges.value.map((edge) => [
      lineageForm.objectType,
      lineageNodeMap.value.get(edge.source)?.label ?? edge.source,
      lineageNodeMap.value.get(edge.target)?.label ?? edge.target,
      lineageEdgeTypeText(edge.edgeType),
      edge.relationName,
      edge.rule ?? '',
      impactLevelText(edge.impactLevel),
      edge.status ? taskStatusText(edge.status) : '',
      edge.updatedAt,
    ].join(',')),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${lineageForm.objectName || 'oneid-lineage'}-血缘.csv`
  link.click()
  URL.revokeObjectURL(url)
  notice.value = `已导出 ${filteredLineageEdges.value.length} 条血缘依赖。`
}

function inspectMapping(row: IdmOneIdMappingResult) {
  selectedMapping.value = row
  showMappingDrawer.value = true
  notice.value = row.baseId
    ? `${row.idTypeName}「${row.idValue}」当前映射到 ${row.baseId}，关联 ${row.relatedIds.length} 个 ID。`
    : `${row.idTypeName}「${row.idValue}」暂无 OneID，请检查数据源、参考关系或任务状态。`
}

async function openMappingChanges(row: IdmOneIdMappingResult) {
  selectedMapping.value = row
  exploreForm.idTypeCode = row.idTypeCode
  changeLogs.value = await idMappingService.queryOneIdChanges({
    idTypeCode: row.idTypeCode,
    idValue: row.idValue,
    baseId: row.baseId,
  })
  notice.value = `已刷新 ${row.idTypeName}「${row.idValue}」相关的 OneID 重组变化。`
}

function fillExploreExample() {
  exploreForm.queryMode = 'ID_TO_ONEID'
  exploreForm.idTypeCode = 'phone_md5'
  exploreForm.idValues = '8f14e45fceea167a5a36dedd4bea2543\noaid_orphan_0922\nuid_900001\nunknown_low_priority_0522'
  notice.value = '已填充手机号、设备和 UID 的混合探查示例。'
}

function clearExploreValues() {
  exploreForm.idValues = ''
  mappingResults.value = []
  selectedMapping.value = null
  notice.value = '已清空待查询 ID。'
}

function copyOneId(baseId: string) {
  if (!baseId) {
    return
  }
  notice.value = `已复制 OneID：${baseId}。`
}

function exportOneId(row: IdmOneIdMappingResult) {
  notice.value = `已生成「${row.idTypeName} ${row.idValue}」的映射导出任务，包含 ${row.relatedIds.length} 个关联 ID。`
}

function exportMappingResults() {
  notice.value = `已模拟导出 ${filteredMappingResults.value.length} 条 OneID 映射结果。`
}

async function loadCrossRelations() {
  crossRelations.value = await idMappingService.listCrossSubjectRelations()
  selectedCrossRelation.value = selectedCrossRelation.value
    ? crossRelations.value.find((relation) => relation.id === selectedCrossRelation.value?.id) ?? crossRelations.value[0] ?? null
    : crossRelations.value[0] ?? null
  if (selectedCrossRelation.value && crossPreviewRows.value.length === 0) {
    fillCrossForm(selectedCrossRelation.value)
    crossPreviewRows.value = await idMappingService.previewCrossSubjectRelation(crossForm)
  }
}

function resetCrossForm() {
  editingCrossRelationId.value = ''
  crossForm.relationName = '人车购买关系'
  crossForm.relationDesc = '用户购买车辆后的多主体转换关系。'
  crossForm.datasetId = 'ds_user_identity_full'
  crossForm.datasetName = 'dwd_user_vehicle_purchase_relation_df'
  crossForm.partitionField = 'p_date'
  crossForm.partitionFormat = 'yyyyMMdd'
  crossForm.updateMode = 'FULL'
  crossForm.subjectAName = '用户'
  crossForm.subjectAIdTypeName = '用户 ID'
  crossForm.subjectAField = 'uid'
  crossForm.subjectBName = '车辆'
  crossForm.subjectBIdTypeName = 'VIN'
  crossForm.subjectBField = 'vin'
  crossForm.aToBMode = 'ONE_TO_MANY'
  crossForm.bToAMode = 'ONE_TO_ONE'
  crossForm.strategyField = 'updated_at'
  crossForm.strategyType = 'LATEST'
  crossPreviewRows.value = []
}

function openCreateCrossRelation() {
  resetCrossForm()
  showCrossModal.value = true
}

function fillCrossForm(relation: IdmCrossSubjectRelation) {
  editingCrossRelationId.value = relation.id
  crossForm.relationName = relation.relationName
  crossForm.relationDesc = relation.relationDesc ?? ''
  crossForm.datasetId = relation.datasetId ?? 'ds_user_identity_full'
  crossForm.datasetName = relation.datasetName
  crossForm.partitionField = relation.partitionField ?? 'p_date'
  crossForm.partitionFormat = relation.partitionFormat ?? 'yyyyMMdd'
  crossForm.updateMode = relation.updateMode ?? 'FULL'
  crossForm.subjectAName = relation.subjectAName
  crossForm.subjectAIdTypeName = relation.subjectAIdTypeName
  crossForm.subjectAField = relation.subjectAField ?? ''
  crossForm.subjectBName = relation.subjectBName
  crossForm.subjectBIdTypeName = relation.subjectBIdTypeName
  crossForm.subjectBField = relation.subjectBField ?? ''
  crossForm.aToBMode = relation.aToBMode
  crossForm.bToAMode = relation.bToAMode
  crossForm.strategyField = relation.strategyField ?? ''
  crossForm.strategyType = relation.strategyType ?? 'LATEST'
}

function editCrossRelation(relation: IdmCrossSubjectRelation) {
  selectedCrossRelation.value = relation
  fillCrossForm(relation)
  showCrossModal.value = true
}

function inspectCrossRelation(relation: IdmCrossSubjectRelation) {
  selectedCrossRelation.value = relation
  notice.value = `已选中「${relation.relationName}」，可查看转换规则、下游影响和预览样例。`
}

async function previewCrossRelation(relation?: IdmCrossSubjectRelation) {
  if (relation) {
    selectedCrossRelation.value = relation
    fillCrossForm(relation)
  }
  crossPreviewRows.value = await idMappingService.previewCrossSubjectRelation(crossForm)
  notice.value = `已生成「${crossForm.relationName}」的关系预览，包含 ${crossPreviewRows.value.length} 条样例数据。`
}

async function createCrossRelation() {
  const relation = editingCrossRelationId.value
    ? await idMappingService.updateCrossSubjectRelation(editingCrossRelationId.value, crossForm)
    : await idMappingService.createCrossSubjectRelation(crossForm)
  notice.value = editingCrossRelationId.value
    ? `已更新多主体关系「${relation.relationName}」。`
    : `已创建多主体关系「${relation.relationName}」。`
  showCrossModal.value = false
  selectedCrossRelation.value = relation
  await loadCrossRelations()
}

async function copyCrossRelation(relation: IdmCrossSubjectRelation) {
  const copied = await idMappingService.copyCrossSubjectRelation(relation.id)
  selectedCrossRelation.value = copied
  notice.value = `已复制为「${copied.relationName}」，可继续编辑后发布。`
  await loadCrossRelations()
}

async function changeCrossStatus(relation: IdmCrossSubjectRelation, status: IdmCrossSubjectRelation['status']) {
  const updated = await idMappingService.changeCrossSubjectStatus(relation.id, status)
  selectedCrossRelation.value = updated
  notice.value = status === 'PUBLISHED'
    ? `多主体关系「${updated.relationName}」已发布，下游服务可使用该转换关系。`
    : `多主体关系「${updated.relationName}」已下线，下游将停止使用该关系。`
  await loadCrossRelations()
}

async function deleteCrossRelation(relation: IdmCrossSubjectRelation) {
  const response = await idMappingService.deleteCrossSubjectRelation(relation.id)
  notice.value = response.message
  selectedCrossRelation.value = null
  await loadCrossRelations()
}

function authorizeIdMapping() {
  notice.value = '已打开项目中心授权流程：可将 ID Mapping 管理员权限授予指定成员或角色。Demo 中授权结果写入审计日志。'
}

async function loadSettings() {
  const settings = await idMappingService.getSettings()
  onlineServices.value = settings.onlineServices
  correctionSetting.value = settings.correctionSetting
  visibilityRules.value = settings.visibilityRules
  auditLogs.value = settings.auditLogs
}

async function saveCorrectionSetting() {
  if (!correctionSetting.value) {
    return
  }
  correctionSetting.value = await idMappingService.updateCorrectionSetting(correctionSetting.value)
  notice.value = 'OneID 数据修正设置已保存。'
  await loadSettings()
}

async function saveOnlineServices() {
  onlineServices.value = await idMappingService.updateOnlineServices(onlineServices.value)
  notice.value = '在线服务配置已保存，开关、QPS 与返回字段将在 mock 服务中生效。'
  await loadSettings()
}

async function createOnlineService() {
  try {
    const service = await idMappingService.createOnlineService({
      serviceName: onlineServiceForm.serviceName,
      serviceObject: onlineServiceForm.serviceObject,
      subjectName: onlineServiceForm.subjectName,
      idTypeNames: onlineServiceForm.idTypeNames,
      returnFields: onlineServiceForm.returnFields,
      qpsLimit: onlineServiceForm.qpsLimit,
      enabled: onlineServiceForm.enabled,
      authType: onlineServiceForm.authType,
      remark: onlineServiceForm.remark,
    })
    notice.value = `在线服务「${service.serviceName}」已创建。`
    showOnlineServiceModal.value = false
    await loadSettings()
  } catch (error) {
    notice.value = error instanceof Error ? error.message : '创建在线服务失败'
  }
}

async function saveVisibilityRules() {
  visibilityRules.value = await idMappingService.updateVisibilityRules(visibilityRules.value)
  notice.value = '主体及 ID 可见范围已保存。'
  await loadSettings()
}

async function createVisibilityRule() {
  try {
    const rule = await idMappingService.createVisibilityRule({
      targetType: visibilityForm.targetType,
      targetName: visibilityForm.targetName,
      disabledSubjects: visibilityForm.disabledSubjects,
      disabledIdTypes: visibilityForm.disabledIdTypes,
    })
    notice.value = `可见范围规则「${rule.targetName}」已创建。`
    showVisibilityModal.value = false
    await loadSettings()
  } catch (error) {
    notice.value = error instanceof Error ? error.message : '创建可见范围规则失败'
  }
}

watch(() => relationForm.datasetId, () => {
  const fields = relationFieldOptions.value
  relationForm.sourceField = String(fields[0]?.value ?? '')
  relationForm.targetField = String(fields[1]?.value ?? fields[0]?.value ?? '')
  relationForm.partitionField = String(relationPartitionFieldOptions.value[0]?.value ?? '')
  relationForm.strategyField = String(relationStrategyFieldOptions.value[0]?.value ?? '')
  relationPreviewRows.value = []
  relationValidationItems.value = []
}, { flush: 'sync' })

watch(() => relationForm.sourceIdTypeId, (idTypeId) => {
  const idType = idTypes.value.find((item) => item.id === idTypeId)
  if (idType?.idField && relationFieldOptions.value.some((option) => option.value === idType.idField)) {
    relationForm.sourceField = idType.idField
  }
})

watch(() => relationForm.targetIdTypeId, (idTypeId) => {
  const idType = idTypes.value.find((item) => item.id === idTypeId)
  if (idType?.idField && relationFieldOptions.value.some((option) => option.value === idType.idField)) {
    relationForm.targetField = idType.idField
  }
})

watch(() => graphEdgeForm.relationId, (relationId) => {
  const relation = relations.value.find((item) => item.id === relationId)
  if (!relation) {
    return
  }
  if (joinedGraphNodeIds.value.has(relation.sourceIdTypeId)) {
    graphEdgeForm.sourceIdTypeId = relation.sourceIdTypeId
  }
  if (joinedGraphNodeIds.value.has(relation.targetIdTypeId)) {
    graphEdgeForm.targetIdTypeId = relation.targetIdTypeId
  }
})

watch([() => graphEdgeForm.sourceIdTypeId, () => graphEdgeForm.targetIdTypeId], () => {
  const currentRelation = relations.value.find((item) => item.id === graphEdgeForm.relationId)
  if (
    currentRelation
    && currentRelation.sourceIdTypeId === graphEdgeForm.sourceIdTypeId
    && currentRelation.targetIdTypeId === graphEdgeForm.targetIdTypeId
  ) {
    return
  }
  graphEdgeForm.relationId = String(graphRelationOptions.value[0]?.value ?? '')
})

watch(() => route.fullPath, async () => {
  const previousTab = activeTab.value
  const previousSubjectId = selectedSubjectId.value
  syncStateFromRoute()
  if (previousSubjectId !== selectedSubjectId.value) {
    await loadSubjectConfig()
  }
  if (previousTab !== activeTab.value && activeTab.value === 'tasks') {
    await loadTasks()
  }
})

onMounted(async () => {
  syncStateFromRoute()
  await loadBase()
})
</script>

<template>
  <div class="idm-page">
    <template v-if="permission && !permission.canView">
      <n-empty description="你没有 ID-Mapping 配置查看权限，请联系管理员授权。" />
    </template>

    <template v-else>
      <div class="page-header">
        <div>
          <h1>ID 图谱构建</h1>
          <p>配置主体、ID 类型、参考关系和 OneID 生成图谱，统一跨渠道用户身份。</p>
        </div>
      </div>

      <n-alert v-if="notice" class="status-alert" type="success" closable @close="notice = ''">
        {{ notice }}
      </n-alert>

      <n-card class="overview-card">
        <div class="overview-grid">
          <div v-for="card in overviewCards" :key="card.label" class="overview-item" :class="card.tone">
            <span>{{ card.label }}</span>
            <strong>{{ card.value }}</strong>
          </div>
        </div>
      </n-card>

      <n-tabs v-model:value="activeTab" type="line" animated class="module-tabs" @update:value="handleTabChange">
        <n-tab-pane name="home" tab="ID 图谱首页">
          <div class="content-grid">
            <n-card title="主体列表" class="main-card">
              <template #header-extra>
                <n-space>
                  <n-input v-model:value="subjectKeyword" clearable placeholder="搜索主体名称 / 英文标识" @update:value="refreshSubjects" />
                  <n-button :disabled="!canEdit" type="primary" @click="openCreateSubjectModal">新建主体</n-button>
                </n-space>
              </template>
              <n-data-table :columns="subjectColumns" :data="subjects" :scroll-x="1700" />
            </n-card>

            <n-card title="异常提示" class="side-card">
              <div class="alert-list">
                <n-alert
                  v-for="item in alerts"
                  :key="item.id"
                  :type="item.level === 'ERROR' ? 'error' : item.level === 'WARNING' ? 'warning' : 'info'"
                  :title="item.title"
                >
                  {{ item.description }}
                </n-alert>
              </div>
            </n-card>
          </div>
        </n-tab-pane>

        <n-tab-pane name="ids" tab="ID 类型配置">
          <n-card class="main-card">
            <template #header>
              <div class="section-title">
                <strong>ID 类型配置</strong>
                <span>创建 ID 类型只是准备阶段，必须配置数据源并加入 OneID 图谱后才参与计算。</span>
              </div>
            </template>
            <template #header-extra>
              <n-space>
                <n-select v-model:value="selectedSubjectId" :options="subjectOptions" class="subject-select" @update:value="(value) => selectSubject(String(value))" />
                <n-button :disabled="!canEdit" @click="showTemplateModal = true">模板批量创建</n-button>
                <n-button :disabled="!canEdit" type="primary" @click="openCreateIdTypeModal">自定义创建</n-button>
              </n-space>
            </template>
            <n-data-table :columns="idTypeColumns" :data="idTypes" :scroll-x="1700" />
          </n-card>
        </n-tab-pane>

        <n-tab-pane name="relations" tab="参考关系">
          <n-card class="main-card">
            <template #header>
              <div class="section-title">
                <strong>参考关系配置</strong>
                <span>参考关系只服务于同一主体内部 ID 融合，不等于多主体转换关系。</span>
              </div>
            </template>
            <template #header-extra>
              <n-space>
                <n-select v-model:value="selectedSubjectId" :options="subjectOptions" class="subject-select" @update:value="(value) => selectSubject(String(value))" />
                <n-button :disabled="!canEdit" type="primary" @click="openCreateRelationModal">新建参考关系</n-button>
              </n-space>
            </template>
            <n-data-table :columns="relationColumns" :data="relations" :scroll-x="1900" />
          </n-card>
        </n-tab-pane>

        <n-tab-pane name="graph" tab="OneID 图谱">
          <div class="graph-layout">
            <n-card class="main-card">
              <template #header>
                <div class="section-title">
                  <strong>{{ selectedSubject?.subjectName ?? '主体' }} OneID 生成图谱</strong>
                  <span>从左侧加入 ID，拖拽调整优先级，并通过参考边定义 OneID 生成顺序。</span>
                </div>
              </template>
              <template #header-extra>
                <n-space>
                  <n-button :disabled="!canEdit || !graph" @click="saveGraphDraft">保存草稿</n-button>
                  <n-button :disabled="!graph" @click="validateGraph">预检查</n-button>
                  <n-button type="primary" :disabled="!canEdit" @click="openPublishConfirm()">发布配置</n-button>
                  <n-button type="primary" :disabled="!canRun" @click="showRunAllConfirm = true">运行任务</n-button>
                </n-space>
              </template>

              <div v-if="graph" class="graph-summary-grid">
                <div><span>已入图 ID</span><strong>{{ graphSummary.joined }}</strong></div>
                <div><span>参考边</span><strong>{{ graphSummary.edges }}</strong></div>
                <div><span>Error</span><strong>{{ graphSummary.errors }}</strong></div>
                <div><span>Warning</span><strong>{{ graphSummary.warnings }}</strong></div>
              </div>

              <div v-if="graph" class="graph-editor-grid">
                <aside class="graph-palette">
                  <div class="section-title compact">
                    <strong>可加入 ID</strong>
                    <span>可拖拽到画布，也可点击加入。</span>
                  </div>
                  <div
                    v-for="item in availableGraphIdTypes"
                    :key="item.idType.id"
                    class="palette-id"
                    :class="{ joined: item.joined, disabled: !item.available }"
                    draggable="true"
                    @dragstart="dragNode(item.idType.id)"
                  >
                    <div>
                      <strong>{{ item.idType.idName }}</strong>
                      <span>{{ item.idType.idCode }} · {{ dataSourceText(item.idType.dataSourceType) }}</span>
                    </div>
                    <n-button size="small" :disabled="!canEdit || item.joined || !item.available" @click="addGraphNode(item.idType)">
                      {{ item.joined ? '已加入' : '加入' }}
                    </n-button>
                  </div>
                </aside>

                <section class="graph-canvas" @dragover.prevent @drop="dropOnGraphCanvas">
                  <div class="graph-canvas-header">
                    <div>
                      <strong>图谱画布</strong>
                      <span>优先级数字越小，越先生成或复用 OneID。</span>
                    </div>
                    <n-button size="small" :disabled="!canEdit || joinedGraphNodes.length < 2" @click="openCreateGraphEdge">添加参考边</n-button>
                  </div>
                  <div v-if="joinedGraphNodes.length" class="graph-node-list">
                    <div
                      v-for="node in joinedGraphNodes"
                      :key="node.idTypeId"
                      draggable="true"
                      class="graph-node"
                      :class="{ base: node.isBaseCandidate, active: selectedGraphNodeId === node.idTypeId }"
                      @click="selectGraphNode(node)"
                      @dragstart="dragNode(node.idTypeId)"
                      @dragover.prevent
                      @drop="dropNode(node.idTypeId)"
                    >
                      <div>
                        <strong>{{ node.priority }}. {{ node.idName }}</strong>
                        <span>{{ node.idCode }}</span>
                        <em v-if="node.warning">{{ node.warning }}</em>
                      </div>
                      <n-space>
                        <n-tag :type="node.isBaseCandidate ? 'success' : 'info'" size="small">
                          {{ node.isBaseCandidate ? 'BaseID 候选' : '参考 ID' }}
                        </n-tag>
                        <n-button text size="small" :disabled="!canEdit" @click.stop="setGraphBaseNode(node)">设为最高优</n-button>
                        <n-button text size="small" type="error" :disabled="!canEdit" @click.stop="removeGraphNode(node)">移除</n-button>
                      </n-space>
                    </div>
                  </div>
                  <n-empty v-else description="请从左侧加入至少一个 ID。" />

                  <div class="graph-edge-board">
                    <div class="graph-canvas-header">
                      <strong>参考边</strong>
                      <span>方向应为低优 ID → 高优 ID。</span>
                    </div>
                    <div
                      v-for="edge in graph.edges"
                      :key="edge.id"
                      class="graph-edge-row"
                      :class="{ active: selectedGraphEdgeId === edge.id }"
                      @click="selectGraphEdge(edge.id)"
                    >
                      <div>
                        <strong>{{ edge.relationName }}</strong>
                        <span>{{ idTypes.find((idType) => idType.id === edge.sourceIdTypeId)?.idName ?? edge.sourceIdTypeId }} → {{ idTypes.find((idType) => idType.id === edge.targetIdTypeId)?.idName ?? edge.targetIdTypeId }}</span>
                        <em>{{ edge.strategyText }}</em>
                      </div>
                      <n-space>
                        <n-button text size="small" :disabled="!canEdit" @click.stop="editGraphEdge(edge)">编辑</n-button>
                        <n-button text size="small" type="error" :disabled="!canEdit" @click.stop="deleteGraphEdge(edge.id)">移除</n-button>
                      </n-space>
                    </div>
                    <n-empty v-if="!graph.edges.length" description="暂无参考边，可点击添加参考边。" size="small" />
                  </div>
                </section>

                <aside class="graph-inspector">
                  <div class="section-title compact">
                    <strong>配置面板</strong>
                    <span>选中节点或参考边后可编辑。</span>
                  </div>
                  <div v-if="selectedGraphNode" class="inspector-card">
                    <strong>{{ selectedGraphNode.idName }}</strong>
                    <span>{{ selectedGraphNode.idCode }} · 优先级 {{ selectedGraphNode.priority }}</span>
                    <n-space>
                      <n-button size="small" :disabled="!canEdit || selectedGraphNode.isBaseCandidate" @click="setGraphBaseNode(selectedGraphNode)">设为最高优</n-button>
                      <n-button size="small" type="error" :disabled="!canEdit" @click="removeGraphNode(selectedGraphNode)">移出图谱</n-button>
                    </n-space>
                  </div>
                  <div v-else-if="selectedGraphEdge" class="inspector-card">
                    <strong>{{ selectedGraphEdge.relationName }}</strong>
                    <span>{{ selectedGraphEdge.strategyText }}</span>
                    <n-space>
                      <n-button size="small" :disabled="!canEdit" @click="editGraphEdge(selectedGraphEdge)">编辑边</n-button>
                      <n-button size="small" type="error" :disabled="!canEdit" @click="deleteGraphEdge(selectedGraphEdge.id)">移除边</n-button>
                    </n-space>
                  </div>
                  <n-empty v-else description="请选择一个节点或参考边。" size="small" />

                  <div class="graph-options">
                    <strong>高级策略</strong>
                    <n-checkbox v-model:checked="graph.options.reuseHistoryOneId" @update:checked="markGraphChanged">复用历史 OneID</n-checkbox>
                    <n-checkbox v-model:checked="graph.options.forceOneToOneForHighPriority" @update:checked="markGraphChanged">高优 ID 强制一对一</n-checkbox>
                    <n-checkbox v-model:checked="graph.options.allowOneIdChange" @update:checked="markGraphChanged">允许 OneID 变化</n-checkbox>
                    <n-checkbox v-model:checked="graph.options.recordChangeLog" @update:checked="markGraphChanged">记录变化日志</n-checkbox>
                    <n-checkbox v-model:checked="graph.options.triggerDataCorrection" @update:checked="markGraphChanged">触发数据修正</n-checkbox>
                    <n-checkbox v-model:checked="graph.options.realtimeOfflineMerge" @update:checked="markGraphChanged">离线与实时融合</n-checkbox>
                    <n-checkbox v-model:checked="graph.options.silenceDefaultStrategy" @update:checked="markGraphChanged">默认策略保持沉默</n-checkbox>
                  </div>
                </aside>
              </div>
            </n-card>

            <n-card title="参考边与预检查" class="side-card">
              <div v-if="graph?.edges.length" class="edge-list">
                <div v-for="edge in graph.edges" :key="edge.id">
                  <strong>{{ edge.relationName }}</strong>
                  <span>{{ edge.strategyText }}</span>
                </div>
              </div>
              <n-empty v-else description="暂无参考边，请先配置参考关系。" />
              <div class="validation-list">
                <n-alert
                  v-for="item in validationItems"
                  :key="item.id"
                  :type="item.level === 'ERROR' ? 'error' : item.level === 'WARNING' ? 'warning' : 'info'"
                  :title="item.code"
                >
                  {{ item.message }}
                </n-alert>
              </div>
              <div class="version-list">
                <h4>发布版本</h4>
                <div v-for="version in configVersions" :key="version.id" class="version-item">
                  <strong>v{{ version.versionNo }} · {{ version.publishStatus === 'PUBLISHED' ? '当前线上' : '历史版本' }}</strong>
                  <span>{{ version.publishedBy }} · {{ version.publishedAt }}</span>
                  <em>{{ version.changeSummary }}</em>
                  <n-button size="small" :disabled="!canEdit" @click="restoreGraphVersion(version.id)">恢复为草稿</n-button>
                </div>
                <n-empty v-if="!configVersions.length" description="暂无发布版本。" size="small" />
              </div>
            </n-card>
          </div>
        </n-tab-pane>

        <n-tab-pane name="tasks" tab="任务信息">
          <n-card class="main-card">
            <template #header>
              <div class="section-title">
                <strong>ID-Mapping 任务</strong>
                <span>发布和运行分离；重跑会保留运行记录，并按 DAG 调度下游依赖。</span>
              </div>
            </template>
            <template #header-extra>
              <n-space>
                <n-button :loading="taskActionLoading" @click="loadTasks">刷新任务</n-button>
                <n-button :disabled="!canRun || !selectedTasks.length" :loading="taskActionLoading" @click="batchRunSelectedTasks">
                  运行选中任务
                </n-button>
                <n-button :disabled="!canRun" :loading="taskActionLoading" type="primary" @click="showRunAllConfirm = true">运行全部任务</n-button>
              </n-space>
            </template>
            <div class="task-filter-row">
              <n-input v-model:value="taskKeyword" clearable placeholder="搜索任务名称 / 表名 / Owner / ID 标识" />
              <n-select v-model:value="selectedSubjectId" :options="subjectOptions" @update:value="loadTasks" />
              <n-select v-model:value="taskStatusFilter" :options="taskStatusOptions" @update:value="loadTasks" />
              <n-select v-model:value="taskTypeFilter" :options="taskTypeOptions" />
            </div>
            <div class="mini-overview">
              <div>总任务数 <strong>{{ taskStats.total }}</strong></div>
              <div>成功 <strong>{{ taskStats.success }}</strong></div>
              <div>失败 <strong>{{ taskStats.failed }}</strong></div>
              <div>运行中 <strong>{{ taskStats.running }}</strong></div>
              <div>等待 <strong>{{ taskStats.waiting }}</strong></div>
              <div>平均耗时 <strong>{{ formatDuration(taskStats.averageDuration) }}</strong></div>
            </div>
            <n-data-table
              v-model:checked-row-keys="selectedTaskIds"
              :columns="taskColumns"
              :data="taskRows"
              :loading="taskActionLoading"
              :row-key="(row) => row.id"
              :scroll-x="1900"
            />
          </n-card>
        </n-tab-pane>

        <n-tab-pane name="explore" tab="数据探查">
          <div class="explore-layout">
            <n-card class="main-card">
              <template #header>
                <div class="section-title">
                  <div class="explore-title">
                    <strong>OneID 数据探查</strong>
                    <span>批量查询 ID 映射、异常原因、关联 ID 与重组变化。</span>
                  </div>
                  <n-space>
                    <n-button @click="fillExploreExample">填充示例</n-button>
                    <n-button @click="clearExploreValues">清空</n-button>
                    <n-button type="primary" :loading="exploreLoading" @click="queryOneId">查询映射</n-button>
                  </n-space>
                </div>
              </template>

              <div class="explore-query-panel">
                <div class="explore-query-grid">
                  <label>
                    <span>查询方式</span>
                    <n-select v-model:value="exploreForm.queryMode" :options="exploreModeOptions" />
                  </label>
                  <label>
                    <span>主体</span>
                    <n-select v-model:value="selectedSubjectId" :options="subjectOptions" />
                  </label>
                  <label>
                    <span>数据环境</span>
                    <n-select v-model:value="exploreForm.env" :options="envOptions" />
                  </label>
                  <label>
                    <span>ID 类型</span>
                    <n-select v-model:value="exploreForm.idTypeCode" :options="idTypeCodeOptions" filterable />
                  </label>
                </div>
                <label class="explore-value-input">
                  <span>{{ exploreForm.queryMode === 'ONEID_TO_ID' ? 'OneID 列表' : 'ID 值列表' }}</span>
                  <n-input
                    v-model:value="exploreForm.idValues"
                    type="textarea"
                    placeholder="一行一个 ID 值，支持逗号分隔，Demo 最多模拟 1000 个"
                    :autosize="{ minRows: 3, maxRows: 5 }"
                  />
                </label>

                <div class="explore-switch-row">
                  <n-checkbox v-model:checked="exploreForm.abnormalOnly">只看异常映射</n-checkbox>
                  <n-checkbox v-model:checked="exploreForm.includeRelated">展示关联 ID</n-checkbox>
                  <span>{{ exploreValues.length }} 个待查询 ID</span>
                </div>
              </div>

              <div class="explore-summary-grid">
                <div><span>输入 ID</span><strong>{{ exploreSummary.inputCount }}</strong></div>
                <div><span>返回结果</span><strong>{{ exploreSummary.resultCount }}</strong></div>
                <div><span>命中 OneID</span><strong class="success">{{ exploreSummary.hitCount }}</strong></div>
                <div><span>异常映射</span><strong class="error">{{ exploreSummary.abnormalCount }}</strong></div>
                <div><span>关联 ID</span><strong>{{ exploreSummary.relatedCount }}</strong></div>
                <div><span>重组变化</span><strong>{{ exploreSummary.changeCount }}</strong></div>
              </div>

              <div class="table-toolbar">
                <span>映射结果</span>
                <n-space>
                  <n-button :disabled="!filteredMappingResults.length" @click="exportMappingResults">导出结果</n-button>
                  <n-button :disabled="!selectedMapping" @click="selectedMapping && openMappingChanges(selectedMapping)">刷新当前重组</n-button>
                </n-space>
              </div>

              <n-data-table
                class="mapping-result-table"
                :columns="mappingColumns"
                :data="filteredMappingResults"
                :loading="exploreLoading"
                :scroll-x="1860"
                :row-key="(row) => `${row.idTypeCode}-${row.idValue}`"
                size="small"
              />
            </n-card>

            <div class="explore-side-stack">
              <n-card title="当前命中详情" class="side-card">
                <template v-if="selectedMapping">
                  <div class="mapping-detail-card">
                    <div class="mapping-detail-title">
                      <strong>{{ selectedMapping.idTypeName }}</strong>
                      <n-tag :type="selectedMapping.abnormal ? 'error' : 'success'">
                        {{ selectedMapping.abnormal ? '异常' : '正常' }}
                      </n-tag>
                    </div>
                    <span class="mono-text">{{ selectedMapping.idValue }}</span>
                    <div class="mapping-detail-grid">
                      <div><span>OneID</span><strong>{{ selectedMapping.baseId ?? '-' }}</strong></div>
                      <div><span>环境</span><strong>{{ selectedMapping.env }}</strong></div>
                      <div><span>生成任务</span><strong>{{ selectedMapping.taskName ?? '-' }}</strong></div>
                      <div><span>最近更新</span><strong>{{ selectedMapping.updatedAt ?? '-' }}</strong></div>
                    </div>
                    <n-alert v-if="selectedMapping.abnormal" type="warning" title="异常原因">
                      {{ selectedMapping.abnormalReason }}
                    </n-alert>
                    <div class="related-id-list">
                      <strong>关联 ID</strong>
                      <span v-if="!selectedMapping.relatedIds.length">暂无关联 ID</span>
                      <n-tag v-for="item in selectedMapping.relatedIds" :key="`${item.idTypeName}-${item.idValue}`" round>
                        {{ item.idTypeName }}：{{ item.idValue }}
                      </n-tag>
                    </div>
                    <n-space>
                      <n-button size="small" type="primary" @click="inspectMapping(selectedMapping)">打开详情</n-button>
                      <n-button size="small" @click="openLineageFor(`${selectedMapping.idTypeName} ${selectedMapping.idValue}`)">查看血缘</n-button>
                    </n-space>
                  </div>
                </template>
                <n-empty v-else description="查询或选择一条映射结果后查看详情。" />
              </n-card>

              <n-card title="OneID 重组变化" class="side-card">
                <div class="change-filter">
                  <n-input v-model:value="exploreChangeKeyword" placeholder="搜索 ID / OneID / 任务" clearable />
                  <n-button :loading="exploreLoading" @click="queryChanges">刷新</n-button>
                </div>
                <n-data-table :columns="changeColumns" :data="selectedMappingChanges" :scroll-x="1420" size="small" />
              </n-card>
            </div>
          </div>
        </n-tab-pane>

        <n-tab-pane name="lineage" tab="血缘管理">
          <div class="lineage-management-layout">
            <n-card class="main-card lineage-main-card">
              <template #header>
                <div class="section-title">
                  <div>
                    <strong>OneID 血缘管理</strong>
                    <span>查询 ID、任务、标签、分群和在线服务之间的上下游依赖与影响范围。</span>
                  </div>
                  <n-space>
                    <n-button :loading="lineageLoading" @click="refreshLineageDependencies">刷新血缘</n-button>
                    <n-button :disabled="!filteredLineageEdges.length" @click="exportLineageGraph">导出血缘</n-button>
                    <n-button type="primary" :loading="lineageLoading" @click="queryLineage">查询血缘</n-button>
                  </n-space>
                </div>
              </template>

              <div class="lineage-query-panel">
                <label>
                  <span>对象类型</span>
                  <n-select v-model:value="lineageForm.objectType" :options="lineageObjectTypeOptions" />
                </label>
                <label>
                  <span>对象名称 / ID</span>
                  <n-input v-model:value="lineageForm.objectName" placeholder="输入对象名称、任务名、标签或服务名" />
                </label>
                <label>
                  <span>查询深度</span>
                  <n-input-number v-model:value="lineageForm.depth" :min="1" :max="5" />
                </label>
                <label>
                  <span>血缘方向</span>
                  <n-select v-model:value="lineageDirection" :options="lineageDirectionOptions" />
                </label>
              </div>

              <div class="lineage-filter-row">
                <n-input v-model:value="lineageKeyword" clearable placeholder="搜索节点、负责人、关系名称或规则" />
                <n-select v-model:value="lineageNodeTypeFilter" :options="lineageNodeTypeOptions" />
                <n-select v-model:value="lineageStatusFilter" :options="lineageStatusOptions" />
              </div>

              <div class="mini-overview lineage-overview">
                <div>当前节点 <strong>{{ currentLineageNode?.label ?? '-' }}</strong></div>
                <div>可见节点 <strong>{{ lineageStats.nodes }}</strong></div>
                <div>依赖关系 <strong>{{ lineageStats.edges }}</strong></div>
                <div>上游来源 <strong>{{ lineageStats.upstream }}</strong></div>
                <div>下游影响 <strong>{{ lineageStats.downstream }}</strong></div>
                <div>高影响关系 <strong>{{ lineageStats.highImpact }}</strong></div>
              </div>

              <div v-if="lineageGraph" class="lineage-board">
                <div class="lineage-layer">
                  <div class="lineage-layer-title">上游来源</div>
                  <button
                    v-for="node in filteredLineageNodes.filter((item) => currentLineageNode && collectLineageNodeIds(currentLineageNode.id, 'UPSTREAM', lineageForm.depth).has(item.id) && item.id !== currentLineageNode.id)"
                    :key="node.id"
                    class="lineage-node-card"
                    :class="[node.type.toLowerCase(), { active: selectedLineageNodeId === node.id }]"
                    type="button"
                    @click="inspectLineageNode(node)"
                  >
                    <strong>{{ node.label }}</strong>
                    <span>{{ lineageTypeText(node.type) }}</span>
                    <n-tag v-if="node.status" size="small" :type="taskTagType(node.status)">{{ taskStatusText(node.status) }}</n-tag>
                  </button>
                  <n-empty v-if="lineageStats.upstream === 0" description="暂无上游来源" size="small" />
                </div>
                <div class="lineage-layer current">
                  <div class="lineage-layer-title">当前对象</div>
                  <button
                    v-if="currentLineageNode"
                    class="lineage-node-card active"
                    :class="currentLineageNode.type.toLowerCase()"
                    type="button"
                    @click="inspectLineageNode(currentLineageNode)"
                  >
                    <strong>{{ currentLineageNode.label }}</strong>
                    <span>{{ lineageTypeText(currentLineageNode.type) }}</span>
                    <n-tag v-if="currentLineageNode.status" size="small" :type="taskTagType(currentLineageNode.status)">
                      {{ taskStatusText(currentLineageNode.status) }}
                    </n-tag>
                  </button>
                </div>
                <div class="lineage-layer">
                  <div class="lineage-layer-title">下游影响</div>
                  <button
                    v-for="node in filteredLineageNodes.filter((item) => currentLineageNode && collectLineageNodeIds(currentLineageNode.id, 'DOWNSTREAM', lineageForm.depth).has(item.id) && item.id !== currentLineageNode.id)"
                    :key="node.id"
                    class="lineage-node-card"
                    :class="[node.type.toLowerCase(), { active: selectedLineageNodeId === node.id }]"
                    type="button"
                    @click="inspectLineageNode(node)"
                  >
                    <strong>{{ node.label }}</strong>
                    <span>{{ lineageTypeText(node.type) }}</span>
                    <n-tag v-if="node.status" size="small" :type="taskTagType(node.status)">{{ taskStatusText(node.status) }}</n-tag>
                  </button>
                  <n-empty v-if="lineageStats.downstream === 0" description="暂无下游影响" size="small" />
                </div>
              </div>

              <n-empty v-else description="请输入对象后查询血缘。" />

              <div class="lineage-tables">
                <n-card title="节点清单" size="small">
                  <n-data-table
                    :columns="lineageNodeColumns"
                    :data="filteredLineageNodes"
                    :loading="lineageLoading"
                    :scroll-x="1180"
                    size="small"
                  />
                </n-card>
                <n-card title="依赖边关系" size="small">
                  <n-data-table
                    :columns="lineageEdgeColumns"
                    :data="filteredLineageEdges"
                    :loading="lineageLoading"
                    :scroll-x="1450"
                    size="small"
                  />
                </n-card>
              </div>
            </n-card>

            <div class="lineage-side-stack">
              <n-card title="节点详情" class="side-card">
                <template v-if="currentLineageNode">
                  <div class="lineage-detail">
                    <div class="mapping-detail-title">
                      <strong>{{ currentLineageNode.label }}</strong>
                      <n-tag>{{ lineageTypeText(currentLineageNode.type) }}</n-tag>
                    </div>
                    <p>{{ currentLineageNode.description ?? '暂无说明。' }}</p>
                    <div class="mapping-detail-grid">
                      <div><span>负责人</span><strong>{{ currentLineageNode.owner ?? '-' }}</strong></div>
                      <div><span>对象量</span><strong>{{ currentLineageNode.objectCount?.toLocaleString() ?? '-' }}</strong></div>
                      <div><span>状态</span><strong>{{ currentLineageNode.status ? taskStatusText(currentLineageNode.status) : '无状态' }}</strong></div>
                      <div><span>最近更新</span><strong>{{ currentLineageNode.updatedAt ?? '-' }}</strong></div>
                    </div>
                    <n-space>
                      <n-button size="small" @click="currentLineageNode && showNodeUpstream(currentLineageNode)">查看上游</n-button>
                      <n-button size="small" @click="currentLineageNode && showNodeDownstream(currentLineageNode)">查看下游</n-button>
                      <n-button size="small" type="primary" @click="openLineageFor(currentLineageNode.label)">重新查询</n-button>
                    </n-space>
                  </div>
                </template>
                <n-empty v-else description="请选择一个血缘节点。" />
              </n-card>

              <n-card title="下游影响对象" class="side-card">
                <n-data-table
                  :columns="lineageImpactColumns"
                  :data="lineageImpactRows"
                  :scroll-x="1080"
                  size="small"
                />
              </n-card>
            </div>
          </div>
        </n-tab-pane>

        <n-tab-pane name="cross" tab="多主体关系">
          <div class="cross-management-layout">
            <n-card class="main-card cross-main-card">
              <template #header>
                <div class="section-title">
                  <div>
                    <strong>多主体转换关系</strong>
                    <span>管理用户与门店、设备、车辆等主体之间的转换规则，供分析、圈选、看板和运营任务复用。</span>
                  </div>
                  <n-space>
                    <n-button :disabled="!canEdit" type="primary" @click="openCreateCrossRelation">新建主体转换关系</n-button>
                  </n-space>
                </div>
              </template>

              <div class="cross-filter-row">
                <n-input v-model:value="crossKeyword" clearable placeholder="搜索关系名称、主体、数据集或负责人" />
                <n-select v-model:value="crossStatusFilter" :options="crossStatusOptions" />
              </div>

              <div class="mini-overview cross-overview">
                <div>关系总数 <strong>{{ crossStats.total }}</strong></div>
                <div>已发布 <strong>{{ crossStats.published }}</strong></div>
                <div>草稿 <strong>{{ crossStats.draft }}</strong></div>
                <div>已下线 <strong>{{ crossStats.offline }}</strong></div>
                <div>关系量 <strong>{{ formatNumber(crossStats.totalCount) }}</strong></div>
                <div>平均质量 <strong>{{ crossStats.averageQuality.toFixed(1) }}%</strong></div>
              </div>

              <n-data-table
                :columns="crossColumns"
                :data="filteredCrossRelations"
                :row-key="(row) => row.id"
                :scroll-x="2200"
                size="small"
              />

              <n-card title="关系预览" size="small" class="cross-preview-card">
                <template #header-extra>
                  <n-button size="small" :disabled="!selectedCrossRelation" @click="selectedCrossRelation && previewCrossRelation(selectedCrossRelation)">刷新预览</n-button>
                </template>
                <n-data-table
                  :columns="crossPreviewColumns"
                  :data="crossPreviewRows"
                  :scroll-x="1120"
                  size="small"
                />
              </n-card>
            </n-card>

            <div class="cross-side-stack">
              <n-card title="关系详情" class="side-card">
                <template v-if="selectedCrossRelation">
                  <div class="cross-detail-card">
                    <div class="mapping-detail-title">
                      <strong>{{ selectedCrossRelation.relationName }}</strong>
                      <n-tag :type="crossStatusTagType(selectedCrossRelation.status)">{{ crossStatusText(selectedCrossRelation.status) }}</n-tag>
                    </div>
                    <p>{{ selectedCrossRelation.relationDesc ?? '暂无描述。' }}</p>
                    <div class="mapping-detail-grid">
                      <div><span>主体 A</span><strong>{{ selectedCrossRelation.subjectAName }} · {{ selectedCrossRelation.subjectAIdTypeName }}</strong></div>
                      <div><span>主体 B</span><strong>{{ selectedCrossRelation.subjectBName }} · {{ selectedCrossRelation.subjectBIdTypeName }}</strong></div>
                      <div><span>A 到 B</span><strong>{{ crossModeText(selectedCrossRelation.aToBMode) }}</strong></div>
                      <div><span>B 到 A</span><strong>{{ crossModeText(selectedCrossRelation.bToAMode) }}</strong></div>
                      <div><span>字段映射</span><strong>{{ selectedCrossRelation.subjectAField ?? '-' }} → {{ selectedCrossRelation.subjectBField ?? '-' }}</strong></div>
                      <div><span>转换策略</span><strong>{{ selectedCrossRelation.strategyField ?? '-' }} / {{ selectedCrossRelation.strategyType ?? '-' }}</strong></div>
                      <div><span>关系量</span><strong>{{ formatNumber(selectedCrossRelation.relationCount ?? 0) }}</strong></div>
                      <div><span>质量分</span><strong>{{ selectedCrossRelation.qualityScore?.toFixed(1) ?? '-' }}%</strong></div>
                    </div>
                    <n-space>
                      <n-button size="small" type="primary" @click="editCrossRelation(selectedCrossRelation)">编辑</n-button>
                      <n-button size="small" @click="previewCrossRelation(selectedCrossRelation)">预览</n-button>
                      <n-button size="small" @click="openLineageFor(selectedCrossRelation.relationName)">看血缘</n-button>
                    </n-space>
                  </div>
                </template>
                <n-empty v-else description="请选择一条多主体关系。" />
              </n-card>

              <n-card title="下游使用对象" class="side-card">
                <div v-if="crossImpactObjects.length" class="cross-impact-list">
                  <div v-for="item in crossImpactObjects" :key="item.name">
                    <strong>{{ item.name }}</strong>
                    <span>{{ item.type }} · {{ item.status }}</span>
                  </div>
                </div>
                <n-empty v-else description="暂无下游使用对象。" />
              </n-card>
            </div>
          </div>
        </n-tab-pane>

        <n-tab-pane name="settings" tab="高级配置">
          <div class="settings-grid">
	            <n-card title="授权 ID Mapping 配置权限">
	              <p class="muted">当前角色：{{ permission?.role }}。可授权 ID Mapping 管理员编辑图谱配置。</p>
	              <n-button :disabled="!permission?.canAuthorize" @click="authorizeIdMapping">进入项目中心授权</n-button>
	            </n-card>
	            <n-card title="在线服务配置">
	              <template #header-extra>
	                <n-space>
	                  <n-button size="small" @click="showOnlineServiceModal = true">新增服务</n-button>
	                  <n-button size="small" type="primary" @click="saveOnlineServices">保存服务配置</n-button>
	                </n-space>
	              </template>
	              <div v-for="service in onlineServices" :key="service.id" class="service-item">
	                <strong>{{ service.serviceName }}</strong>
	                <span>{{ service.subjectName }} · {{ service.idTypeNames.join('、') }} · QPS {{ formatNumber(service.qpsLimit) }}</span>
	                <n-switch v-model:value="service.enabled" />
	              </div>
	            </n-card>
	            <n-card title="主体及 ID 可见范围">
	              <template #header-extra>
	                <n-space>
	                  <n-button size="small" @click="showVisibilityModal = true">新增规则</n-button>
	                  <n-button size="small" type="primary" @click="saveVisibilityRules">保存可见范围</n-button>
	                </n-space>
	              </template>
	              <div v-for="rule in visibilityRules" :key="rule.id" class="service-item">
	                <strong>{{ rule.targetName }}</strong>
	                <span>禁用主体：{{ rule.disabledSubjects.join('、') }}；禁用 ID：{{ rule.disabledIdTypes.join('、') }}</span>
              </div>
            </n-card>
            <n-card v-if="correctionSetting" title="OneID 数据修正">
              <div class="settings-form">
                <n-switch v-model:value="correctionSetting.enabled" />启用历史 OneID 修正
                <n-select
                  v-model:value="correctionSetting.correctionScope"
                  multiple
                  :options="correctionScopeOptions"
                />
                <n-input-number v-model:value="correctionSetting.maxBackfillDays" :min="1" :max="180" />
                <n-button type="primary" @click="saveCorrectionSetting">保存设置</n-button>
              </div>
            </n-card>
            <n-card title="审计日志">
              <div v-for="log in auditLogs" :key="log.id" class="audit-item">
                <strong>{{ log.action }}</strong>
                <span>{{ log.operator }} · {{ log.objectName }} · {{ log.createdAt }}</span>
              </div>
            </n-card>
          </div>
        </n-tab-pane>
      </n-tabs>

      <n-modal v-model:show="showSubjectModal" preset="card" title="新建主体" class="idm-modal">
        <n-form label-placement="left" label-width="120">
          <n-form-item label="主体类型">
            <n-select v-model:value="subjectForm.subjectType" :options="subjectTypeOptions" @update:value="(value) => generateSubjectCode(value as IdmSubjectType)" />
          </n-form-item>
          <n-form-item label="主体名称">
            <n-input v-model:value="subjectForm.subjectName" maxlength="30" />
          </n-form-item>
          <n-form-item label="英文标识">
            <n-input v-model:value="subjectForm.subjectCode" />
          </n-form-item>
          <n-form-item label="主体描述">
            <n-input v-model:value="subjectForm.description" type="textarea" maxlength="200" />
          </n-form-item>
          <n-form-item label="是否启用">
            <n-switch :value="subjectForm.status === 'ENABLED'" @update:value="(value) => subjectForm.status = value ? 'ENABLED' : 'DISABLED'" />
          </n-form-item>
        </n-form>
        <template #footer>
          <n-space justify="end">
            <n-button @click="showSubjectModal = false">取消</n-button>
            <n-button type="primary" @click="createSubject">确定</n-button>
          </n-space>
        </template>
      </n-modal>

      <n-modal v-model:show="showTemplateModal" preset="card" title="模板批量创建 ID 类型" class="wide-modal">
        <div class="template-list">
          <div v-for="template in idTemplates" :key="template.id" class="template-row">
            <n-checkbox v-model:checked="template.selected" />
            <n-input v-model:value="template.idName" />
            <n-input v-model:value="template.idCode" />
            <n-select v-model:value="template.channelIdentifier" :options="channelOptions" />
            <span>推荐优先级 {{ template.recommendedPriority }}</span>
          </div>
        </div>
        <template #footer>
          <n-space justify="end">
            <n-button @click="showTemplateModal = false">取消</n-button>
            <n-button type="primary" @click="createTemplates">批量创建</n-button>
          </n-space>
        </template>
      </n-modal>

      <n-modal v-model:show="showIdModal" preset="card" :title="editingIdTypeId ? '编辑 ID 类型' : '自定义创建 ID 类型'" class="idm-modal">
        <n-form label-placement="left" label-width="130">
          <n-form-item label="ID 类型">
            <n-radio-group v-model:value="idForm.idKind">
              <n-radio-button value="SINGLE">单一 ID</n-radio-button>
              <n-radio-button value="COMPOSITE">组合 ID</n-radio-button>
            </n-radio-group>
          </n-form-item>
          <n-form-item label="ID 名称">
            <n-input v-model:value="idForm.idName" />
          </n-form-item>
          <n-form-item label="ID 英文标识">
            <n-input v-model:value="idForm.idCode" :disabled="Boolean(editingIdTypeId)" />
          </n-form-item>
          <n-form-item label="渠道识别标识">
            <n-select v-model:value="idForm.channelIdentifier" :options="channelOptions" />
          </n-form-item>
          <n-form-item label="ID 数据类型">
            <n-select v-model:value="idForm.idDataType" :options="idDataTypeOptions" />
          </n-form-item>
          <template v-if="idForm.idKind === 'COMPOSITE'">
            <n-form-item label="ID1">
              <div class="inline-triplet">
                <n-input v-model:value="idForm.partOneName" placeholder="名称" />
                <n-input v-model:value="idForm.partOneCode" placeholder="英文标识" />
                <n-select v-model:value="idForm.partOneField" :options="datasetFieldOptions" placeholder="字段" />
              </div>
            </n-form-item>
            <n-form-item label="ID2">
              <div class="inline-triplet">
                <n-input v-model:value="idForm.partTwoName" placeholder="名称" />
                <n-input v-model:value="idForm.partTwoCode" placeholder="英文标识" />
                <n-select v-model:value="idForm.partTwoField" :options="datasetFieldOptions" placeholder="字段" />
              </div>
            </n-form-item>
            <n-form-item label="组合预览">
              <div class="formula-preview">
                normalize({{ idForm.partOneField || 'ID1 字段' }}) + "::" + normalize({{ idForm.partTwoField || 'ID2 字段' }}) → hash_{{ idForm.partOneCode }}_{{ idForm.partTwoCode }}
              </div>
            </n-form-item>
            <n-form-item label="高级维表">
              <div class="inline-triplet">
                <n-select v-model:value="idForm.dimensionDatasetId" :options="datasetOptions" placeholder="维度数据集" />
                <n-select v-model:value="idForm.dimensionValueField" :options="dimensionFieldOptions" placeholder="维度值字段" />
                <n-select v-model:value="idForm.dimensionNameField" :options="dimensionFieldOptions" placeholder="维度展示名字段" />
              </div>
            </n-form-item>
          </template>
          <n-form-item label="数据来源">
            <n-select v-model:value="idForm.dataSourceType" :options="dataSourceOptions" />
          </n-form-item>
          <n-form-item v-if="idForm.dataSourceType === 'OFFLINE_REALTIME'" label="Hive 数据集">
            <n-select v-model:value="idForm.datasetId" :options="datasetOptions" />
          </n-form-item>
          <n-form-item v-if="idForm.dataSourceType === 'OFFLINE_REALTIME'" label="日期分区字段">
            <n-select v-model:value="idForm.partitionField" :options="idPartitionFieldOptions" />
          </n-form-item>
          <n-form-item v-if="idForm.dataSourceType === 'OFFLINE_REALTIME'" label="分区格式 / 更新">
            <div class="inline-pair">
              <n-select v-model:value="idForm.partitionFormat" :options="partitionFormatOptions" />
              <n-select v-model:value="idForm.updateMode" :options="updateModeOptions" />
            </div>
          </n-form-item>
          <n-form-item v-if="idForm.dataSourceType === 'OFFLINE_REALTIME'" label="ID 对应字段">
            <n-select v-model:value="idForm.idField" :options="datasetFieldOptions" />
          </n-form-item>
          <n-form-item v-if="idForm.dataSourceType === 'OFFLINE_REALTIME'" label="数据预览">
            <div class="preview-block">
              <n-button @click="previewIdDataSource">预览最新分区前 100 条</n-button>
              <n-data-table v-if="dataPreviewRows.length" size="small" :columns="previewColumns" :data="dataPreviewRows" :scroll-x="760" />
            </div>
          </n-form-item>
        </n-form>
        <template #footer>
          <n-space justify="end">
            <n-button @click="showIdModal = false">取消</n-button>
            <n-button type="primary" @click="createIdType">保存</n-button>
          </n-space>
        </template>
      </n-modal>

      <n-modal
        v-model:show="showRelationModal"
        preset="card"
        :title="editingRelationId ? '编辑参考关系' : '新建参考关系'"
        class="wide-modal"
      >
        <n-form label-placement="left" label-width="130">
          <n-form-item label="关系名称">
            <n-input v-model:value="relationForm.relationName" maxlength="50" show-count />
          </n-form-item>
          <n-form-item label="关系描述">
            <n-input v-model:value="relationForm.relationDesc" type="textarea" maxlength="120" show-count />
          </n-form-item>
          <n-form-item label="关系数据集">
            <n-select v-model:value="relationForm.datasetId" :options="datasetOptions" />
          </n-form-item>
          <n-form-item label="分区字段">
            <div class="inline-pair">
              <n-select v-model:value="relationForm.partitionField" :options="relationPartitionFieldOptions" placeholder="日期分区字段" />
              <n-select v-model:value="relationForm.partitionFormat" :options="partitionFormatOptions" placeholder="分区格式" />
            </div>
          </n-form-item>
          <n-form-item label="更新方式">
            <n-select v-model:value="relationForm.updateMode" :options="updateModeOptions" />
          </n-form-item>
          <n-form-item label="来源 ID">
            <n-select v-model:value="relationForm.sourceIdTypeId" :options="idTypeOptions" />
          </n-form-item>
          <n-form-item label="来源字段">
            <n-select v-model:value="relationForm.sourceField" :options="relationFieldOptions" />
          </n-form-item>
          <n-form-item label="参考 ID">
            <n-select v-model:value="relationForm.targetIdTypeId" :options="idTypeOptions" />
          </n-form-item>
          <n-form-item label="目标字段">
            <n-select v-model:value="relationForm.targetField" :options="relationFieldOptions" />
          </n-form-item>
          <n-form-item label="映射方式">
            <n-select v-model:value="relationForm.mappingType" :options="mappingTypeOptions" />
          </n-form-item>
          <n-form-item label="映射说明">
            <div class="formula-preview">{{ mappingTypeDescription }}</div>
          </n-form-item>
          <n-form-item label="参考策略">
            <div class="relation-strategy">
              <n-switch v-model:value="relationForm.strategyEnabled" />启用策略
              <n-select
                v-model:value="relationForm.strategyField"
                :disabled="!relationForm.strategyEnabled"
                :options="relationStrategyFieldOptions"
                class="small-select"
                placeholder="策略字段"
              />
              <n-select
                v-model:value="relationForm.strategyType"
                :disabled="!relationForm.strategyEnabled"
                :options="strategyOptions"
                class="small-select"
              />
            </div>
          </n-form-item>
          <n-form-item label="解绑策略">
            <n-switch v-model:value="relationForm.unbindEnabled" />允许解绑后重新归属
          </n-form-item>
          <n-form-item label="校验与预览">
            <div class="preview-block">
              <n-space>
                <n-button @click="validateRelationConfig">校验配置</n-button>
                <n-button @click="previewRelationData">预览关系数据</n-button>
              </n-space>
              <div v-if="relationValidationItems.length" class="validation-list">
                <n-alert
                  v-for="item in relationValidationItems"
                  :key="item.id"
                  :type="item.level === 'ERROR' ? 'error' : item.level === 'WARNING' ? 'warning' : 'info'"
                  :title="item.code"
                >
                  {{ item.message }}
                </n-alert>
              </div>
              <n-alert v-if="relationPreviewRows.length" type="info" :title="relationPreviewSummary" />
              <n-data-table
                v-if="relationPreviewRows.length"
                size="small"
                :columns="relationPreviewColumns"
                :data="relationPreviewRows"
                :scroll-x="1260"
              />
            </div>
          </n-form-item>
        </n-form>
        <template #footer>
          <n-space justify="end">
            <n-button @click="showRelationModal = false">取消</n-button>
            <n-button type="primary" @click="saveRelationConfig">保存</n-button>
          </n-space>
        </template>
      </n-modal>

      <n-modal
        v-model:show="showDeleteRelationModal"
        preset="dialog"
        title="删除参考关系"
        positive-text="确认删除"
        negative-text="取消"
        @positive-click="confirmDeleteRelation"
      >
        删除参考关系「{{ pendingDeleteRelation?.relationName }}」后，相关图谱边会从草稿中移除，需重新发布后才会影响线上 OneID 计算。
      </n-modal>

      <n-modal
        v-model:show="showGraphEdgeModal"
        preset="card"
        :title="editingGraphEdgeId ? '编辑参考边' : '添加参考边'"
        class="idm-modal"
      >
        <n-form label-placement="left" label-width="110">
          <n-form-item label="来源 ID">
            <n-select v-model:value="graphEdgeForm.sourceIdTypeId" :options="graphNodeOptions" />
          </n-form-item>
          <n-form-item label="目标 ID">
            <n-select v-model:value="graphEdgeForm.targetIdTypeId" :options="graphNodeOptions" />
          </n-form-item>
          <n-form-item label="参考关系">
            <n-select v-model:value="graphEdgeForm.relationId" :options="graphRelationOptions" placeholder="选择同方向参考关系" />
          </n-form-item>
          <n-alert type="info" title="参考边方向">
            建议按“低优先级 ID → 高优先级 ID”配置。例如设备 ID 参考用户 ID，命中关系后复用用户 ID 所在 OneID。
          </n-alert>
        </n-form>
        <template #footer>
          <n-space justify="end">
            <n-button @click="showGraphEdgeModal = false">取消</n-button>
            <n-button type="primary" @click="saveGraphEdge">保存参考边</n-button>
          </n-space>
        </template>
      </n-modal>

	      <n-modal v-model:show="showRunConfirm" preset="dialog" title="重新运行任务" positive-text="继续重跑" negative-text="取消" @positive-click="confirmRerunTask">
	        重新运行该任务可能导致 OneID 结果变化，并使下游标签、分群、画像和营销数据短暂不一致。是否继续？
	      </n-modal>

	      <n-modal v-model:show="showRunAllConfirm" preset="dialog" title="运行全部 ID-Mapping 任务" positive-text="确认运行" negative-text="取消" @positive-click="confirmRunAllTasks">
	        将按当前主体触发可运行的 ID 数据同步、参考关系生成和 OneID 生成任务。任务运行完成前，下游标签、画像、分群和营销触达可能短暂使用旧版本 OneID。
	      </n-modal>

	      <n-modal v-model:show="showPublishConfirm" preset="card" title="发布 OneID 图谱配置确认" class="idm-modal">
	        <n-alert type="warning" title="发布后会更新线上 OneID 配置">
	          发布会生成新的配置版本，并触发 / 更新 ID-Mapping 任务。OneID 结果可能重组，下游标签、分群、画像、营销触达和在线查询服务会在任务更新后使用新结果。
	        </n-alert>
	        <n-alert v-if="publishFeedback" class="modal-feedback" :type="publishFeedback.includes('失败') || publishFeedback.includes('禁止') ? 'error' : 'info'">
	          {{ publishFeedback }}
	        </n-alert>
	        <div class="delete-impact">
	          <strong>{{ subjects.find((subject) => subject.id === publishSubjectId)?.subjectName ?? selectedSubject?.subjectName }} OneID 图谱</strong>
	          <span>当前 ID 类型：{{ idTypes.length }} 个；参考关系：{{ relations.length }} 条；下游依赖：{{ selectedSubject?.downstreamDependencyCount ?? 0 }} 个。</span>
	          <span>预检查：{{ publishWarnings.length ? `存在 ${publishWarnings.length} 个 Warning` : '无阻塞项' }}</span>
	        </div>
	        <div v-if="publishWarnings.length" class="validation-list">
	          <n-alert v-for="item in publishWarnings" :key="item.id" type="warning" :title="item.code">
	            {{ item.message }}
	          </n-alert>
	        </div>
	        <template #footer>
	          <n-space justify="end">
	            <n-button :disabled="publishing" @click="showPublishConfirm = false">取消</n-button>
	            <n-button type="primary" :loading="publishing" @click="confirmPublishGraph">确认发布</n-button>
	          </n-space>
	        </template>
	      </n-modal>

      <n-modal v-model:show="showDeleteIdModal" preset="card" title="删除 ID 类型确认" class="idm-modal">
        <n-alert type="error" title="删除后不可恢复">
          删除 ID 后，该 ID 绑定的 OneID 数据会在下次任务更新时被清空；相关参考关系、多主体关系、在线服务、标签、分群、画像和营销任务都可能受到影响。
        </n-alert>
        <div v-if="pendingDeleteId" class="delete-impact">
          <strong>{{ pendingDeleteId.idName }}（{{ pendingDeleteId.idCode }}）</strong>
          <span>数据源：{{ pendingDeleteId.datasetName ?? '未配置' }}</span>
          <span>状态：{{ idStatusText(pendingDeleteId.status) }}</span>
          <span>下游影响：OneID 图谱、参考关系、在线查询服务、用户标签、用户分群。</span>
        </div>
        <template #footer>
          <n-space justify="end">
            <n-button @click="showDeleteIdModal = false">取消</n-button>
            <n-button type="error" @click="confirmDeleteIdType">确认删除</n-button>
          </n-space>
        </template>
      </n-modal>

	      <n-modal v-model:show="showCrossModal" preset="card" :title="editingCrossRelationId ? '编辑主体转换关系' : '新建主体转换关系'" class="idm-modal">
        <n-form label-placement="left" label-width="130">
	          <n-form-item label="关系名称">
	            <n-input v-model:value="crossForm.relationName" />
	          </n-form-item>
	          <n-form-item label="关系描述">
	            <n-input v-model:value="crossForm.relationDesc" type="textarea" />
	          </n-form-item>
	          <n-form-item label="关系数据集">
	            <div class="inline-pair">
	              <n-select v-model:value="crossForm.datasetId" :options="datasetOptions" />
	              <n-input v-model:value="crossForm.datasetName" placeholder="展示库表名" />
	            </div>
	          </n-form-item>
	          <n-form-item label="分区 / 更新">
	            <div class="inline-triplet">
	              <n-select v-model:value="crossForm.partitionField" :options="crossPartitionFieldOptions" />
	              <n-select v-model:value="crossForm.partitionFormat" :options="partitionFormatOptions" />
	              <n-select v-model:value="crossForm.updateMode" :options="updateModeOptions" />
	            </div>
	          </n-form-item>
	          <n-form-item label="主体 A">
	            <div class="inline-triplet">
	              <n-input v-model:value="crossForm.subjectAName" />
	              <n-input v-model:value="crossForm.subjectAIdTypeName" placeholder="主体 A ID" />
	              <n-select v-model:value="crossForm.subjectAField" :options="crossDatasetFieldOptions" placeholder="主体 A 字段" />
	            </div>
	          </n-form-item>
	          <n-form-item label="主体 B">
	            <div class="inline-triplet">
	              <n-input v-model:value="crossForm.subjectBName" />
	              <n-input v-model:value="crossForm.subjectBIdTypeName" placeholder="主体 B ID" />
	              <n-select v-model:value="crossForm.subjectBField" :options="crossDatasetFieldOptions" placeholder="主体 B 字段" />
	            </div>
	          </n-form-item>
          <n-form-item label="A 到 B">
            <n-select v-model:value="crossForm.aToBMode" :options="[
              { label: '一对一', value: 'ONE_TO_ONE' },
              { label: '一对多', value: 'ONE_TO_MANY' },
              { label: '不允许转换', value: 'DENY' },
            ]" />
          </n-form-item>
	          <n-form-item label="B 到 A">
	            <n-select v-model:value="crossForm.bToAMode" :options="[
	              { label: '一对一', value: 'ONE_TO_ONE' },
	              { label: '一对多', value: 'ONE_TO_MANY' },
	              { label: '不允许转换', value: 'DENY' },
	            ]" />
	          </n-form-item>
	          <n-form-item label="转换策略">
	            <div class="inline-pair">
	              <n-select v-model:value="crossForm.strategyField" :options="crossStrategyFieldOptions" />
	              <n-select v-model:value="crossForm.strategyType" :options="strategyOptions" />
	            </div>
	          </n-form-item>
        </n-form>
        <template #footer>
          <n-space justify="end">
            <n-button @click="showCrossModal = false">取消</n-button>
            <n-button @click="previewCrossRelation()">预览样例</n-button>
            <n-button type="primary" @click="createCrossRelation">{{ editingCrossRelationId ? '保存修改' : '保存草稿' }}</n-button>
          </n-space>
        </template>
	      </n-modal>

	      <n-modal v-model:show="showOnlineServiceModal" preset="card" title="新增在线服务" class="idm-modal">
	        <n-form label-placement="left" label-width="130">
	          <n-form-item label="服务名称">
	            <n-input v-model:value="onlineServiceForm.serviceName" maxlength="50" />
	          </n-form-item>
	          <n-form-item label="服务对象">
	            <n-select v-model:value="onlineServiceForm.serviceObject" :options="onlineServiceObjectOptions" />
	          </n-form-item>
	          <n-form-item label="主体 / 关系">
	            <n-input v-model:value="onlineServiceForm.subjectName" />
	          </n-form-item>
	          <n-form-item label="支持 ID">
	            <n-select v-model:value="onlineServiceForm.idTypeNames" multiple filterable tag :options="idTypeNameOptions" />
	          </n-form-item>
	          <n-form-item label="返回字段">
	            <n-select v-model:value="onlineServiceForm.returnFields" multiple tag :options="[
	              { label: 'base_id', value: 'base_id' },
	              { label: 'related_ids', value: 'related_ids' },
	              { label: 'config_version', value: 'config_version' },
	              { label: 'updated_at', value: 'updated_at' },
	            ]" />
	          </n-form-item>
	          <n-form-item label="QPS / 鉴权">
	            <div class="inline-pair">
	              <n-input-number v-model:value="onlineServiceForm.qpsLimit" :min="100" :max="100000" />
	              <n-select v-model:value="onlineServiceForm.authType" :options="onlineAuthOptions" />
	            </div>
	          </n-form-item>
	          <n-form-item label="是否启用">
	            <n-switch v-model:value="onlineServiceForm.enabled" />
	          </n-form-item>
	          <n-form-item label="备注">
	            <n-input v-model:value="onlineServiceForm.remark" type="textarea" />
	          </n-form-item>
	        </n-form>
	        <template #footer>
	          <n-space justify="end">
	            <n-button @click="showOnlineServiceModal = false">取消</n-button>
	            <n-button type="primary" @click="createOnlineService">保存服务</n-button>
	          </n-space>
	        </template>
	      </n-modal>

	      <n-modal v-model:show="showVisibilityModal" preset="card" title="新增可见范围规则" class="idm-modal">
	        <n-form label-placement="left" label-width="130">
	          <n-form-item label="授权对象类型">
	            <n-select v-model:value="visibilityForm.targetType" :options="visibilityTargetOptions" />
	          </n-form-item>
	          <n-form-item label="授权对象">
	            <n-input v-model:value="visibilityForm.targetName" maxlength="30" />
	          </n-form-item>
	          <n-form-item label="禁用主体">
	            <n-select v-model:value="visibilityForm.disabledSubjects" multiple tag :options="subjectOptions.map((item) => ({ label: String(item.label).split('（')[0], value: String(item.label).split('（')[0] }))" />
	          </n-form-item>
	          <n-form-item label="禁用 ID">
	            <n-select v-model:value="visibilityForm.disabledIdTypes" multiple tag :options="idTypeNameOptions" />
	          </n-form-item>
	        </n-form>
	        <template #footer>
	          <n-space justify="end">
	            <n-button @click="showVisibilityModal = false">取消</n-button>
	            <n-button type="primary" @click="createVisibilityRule">保存规则</n-button>
	          </n-space>
	        </template>
	      </n-modal>

      <n-drawer v-model:show="showMappingDrawer" width="760">
        <n-drawer-content :title="selectedMapping ? `${selectedMapping.idTypeName} 映射详情` : '映射详情'">
          <template v-if="selectedMapping">
            <div class="mapping-drawer-summary">
              <div>
                <span>ID 值</span>
                <strong>{{ selectedMapping.idValue }}</strong>
              </div>
              <div>
                <span>OneID</span>
                <strong>{{ selectedMapping.baseId ?? '-' }}</strong>
              </div>
              <div>
                <span>映射状态</span>
                <n-tag :type="selectedMapping.abnormal ? 'error' : 'success'">
                  {{ selectedMapping.abnormal ? '异常' : '正常' }}
                </n-tag>
              </div>
              <div>
                <span>最近更新</span>
                <strong>{{ selectedMapping.updatedAt ?? '-' }}</strong>
              </div>
            </div>

            <n-alert v-if="selectedMapping.abnormal" type="warning" title="异常诊断">
              {{ selectedMapping.abnormalReason }} 建议检查 ID 类型是否入图、参考关系是否发布以及对应生成任务是否成功。
            </n-alert>

            <div class="drawer-section">
              <div class="section-title compact">
                <strong>关联 ID</strong>
                <span>{{ selectedMapping.relatedIds.length }} 个</span>
              </div>
              <div class="related-id-list drawer-list">
                <n-tag v-for="item in selectedMapping.relatedIds" :key="`${item.idTypeName}-${item.idValue}`" round>
                  {{ item.idTypeName }}：{{ item.idValue }}
                </n-tag>
                <n-empty v-if="!selectedMapping.relatedIds.length" description="暂无关联 ID。" />
              </div>
            </div>

            <div class="drawer-section">
              <div class="section-title compact">
                <strong>重组变化</strong>
                <n-button size="small" @click="openMappingChanges(selectedMapping)">刷新变化</n-button>
              </div>
              <n-data-table :columns="changeColumns" :data="selectedMappingChanges" :scroll-x="1420" size="small" />
            </div>

          </template>
          <template #footer>
            <n-space v-if="selectedMapping" justify="end">
              <n-button @click="openLineageFor(`${selectedMapping.idTypeName} ${selectedMapping.idValue}`)">查看血缘</n-button>
              <n-button type="primary" @click="exportOneId(selectedMapping)">导出该映射</n-button>
            </n-space>
          </template>
        </n-drawer-content>
      </n-drawer>

      <n-drawer v-model:show="showTaskDrawer" width="860">
        <n-drawer-content :title="selectedTask?.taskName ?? '任务详情'">
          <template v-if="selectedTask">
            <div class="task-detail-header">
              <div>
                <n-tag :type="taskTagType(selectedTask.status)">{{ taskStatusText(selectedTask.status) }}</n-tag>
                <span>{{ taskTypeText(selectedTask.taskType) }} · {{ selectedTask.owner }}</span>
              </div>
              <n-space>
                <n-button size="small" :disabled="!canRun || selectedTask.status === 'RUNNING'" :loading="taskActionLoading" @click="askRerun(selectedTask)">重新运行</n-button>
                <n-button size="small" :disabled="!canRun || selectedTask.status === 'RUNNING'" :loading="taskActionLoading" @click="rerunWithUpstream(selectedTask)">连同上游重跑</n-button>
                <n-button v-if="selectedTask.status === 'RUNNING'" size="small" type="success" :loading="taskActionLoading" @click="finishTask(selectedTask, 'SUCCESS')">模拟完成</n-button>
                <n-button v-if="selectedTask.status === 'RUNNING' || selectedTask.status === 'WAITING'" size="small" type="error" :loading="taskActionLoading" @click="cancelTask(selectedTask)">取消任务</n-button>
              </n-space>
            </div>

            <div class="task-detail-grid">
              <div><span>主体</span><strong>{{ selectedTask.subjectName ?? '-' }}</strong></div>
              <div><span>库表</span><strong>{{ selectedTask.tableName }}</strong></div>
              <div><span>身份标识</span><strong>{{ selectedTask.idTypeCode ?? '-' }}</strong></div>
              <div><span>最近运行</span><strong>{{ selectedTask.lastRunAt ?? '-' }}</strong></div>
              <div><span>耗时</span><strong>{{ formatDuration(selectedTask.durationSeconds) }}</strong></div>
              <div><span>上下游</span><strong>{{ selectedTask.upstreamTaskIds.length }} 上游 / {{ selectedTask.downstreamTaskIds.length }} 下游</strong></div>
            </div>

            <n-tabs v-model:value="taskDrawerTab" type="line" animated>
              <n-tab-pane name="dag" tab="运行视图">
                <div v-if="taskDag" class="dag-board">
                  <div v-for="node in taskDag.nodes" :key="node.id" class="dag-node" :class="{ current: node.id === selectedTask.id }">
                    <strong>{{ node.label }}</strong>
                    <span>{{ node.type }}</span>
                    <n-tag :type="taskTagType(node.status)" size="small">{{ taskStatusText(node.status) }}</n-tag>
                    <em>{{ node.startedAt ?? '-' }} → {{ node.endedAt ?? '未结束' }}</em>
                  </div>
                </div>
                <div v-if="taskDag?.edges.length" class="dag-edges">
                  {{ taskDag.edges.map((edge) => `${edge.source} → ${edge.target}`).join(' / ') }}
                </div>
              </n-tab-pane>
              <n-tab-pane name="runs" tab="运行记录">
                <n-data-table :columns="runRecordColumns" :data="taskRuns" :scroll-x="1200" />
              </n-tab-pane>
              <n-tab-pane name="detail" tab="失败诊断">
                <div class="task-diagnosis">
                  <n-alert
                    :type="selectedTask.status === 'FAILED' ? 'error' : selectedTask.status === 'RUNNING' ? 'info' : 'success'"
                    :title="selectedTask.status === 'FAILED' ? '最近一次运行失败' : '当前任务暂无阻塞错误'"
                  >
                    {{ selectedTask.status === 'FAILED' ? '建议先查看上游数据分区、ID 字段空值率和参考关系策略，再执行连同上游重跑。' : '任务依赖、分区和运行记录处于可管理状态。' }}
                  </n-alert>
                  <n-space>
                    <n-button :disabled="selectedTask.status !== 'FAILED'" :loading="taskActionLoading" type="primary" @click="rerunWithUpstream(selectedTask)">按建议重跑</n-button>
                    <n-button @click="openLineageFor(selectedTask.taskName)">查看血缘影响</n-button>
                  </n-space>
                </div>
              </n-tab-pane>
            </n-tabs>
          </template>
        </n-drawer-content>
      </n-drawer>
    </template>
  </div>
</template>

<style scoped>
.idm-page {
  min-height: 100%;
  padding: 24px;
  background: #f3f6fb;
  color: #101828;
}

.page-header,
.section-title,
.detail-filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.page-header h1 {
  margin: 0;
  font-size: 28px;
}

.page-header p,
.section-title span,
.muted {
  color: #667085;
  line-height: 1.6;
}

.status-alert,
.overview-card,
.module-tabs {
  margin-top: 16px;
}

.overview-grid,
.mini-overview,
.settings-grid {
  display: grid;
  gap: 12px;
}

.overview-grid {
  grid-template-columns: repeat(6, minmax(130px, 1fr));
}

.overview-item,
.mini-overview > div {
  padding: 14px;
  border-radius: 8px;
  background: #f8fafc;
}

.overview-item span,
.mini-overview span {
  display: block;
  color: #667085;
}

.overview-item strong,
.mini-overview strong {
  display: block;
  margin-top: 6px;
  font-size: 24px;
}

.overview-item.success strong {
  color: #18a058;
}

.overview-item.warning strong {
  color: #f59e0b;
}

.overview-item.error strong {
  color: #d03050;
}

.content-grid,
.graph-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 420px;
  gap: 16px;
}

.settings-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.main-card,
.side-card {
  border-radius: 8px;
}

	.alert-list,
	.edge-list,
	.validation-list,
	.version-list,
	.settings-form,
	.template-list {
	  display: grid;
	  gap: 10px;
	}

.subject-select {
  width: 260px;
}

.small-select {
  width: 180px;
}

.task-filter-row {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) 260px 180px 220px;
  gap: 12px;
  margin-bottom: 14px;
}

.modal-feedback {
  margin-top: 12px;
}

.graph-board {
  display: grid;
  gap: 10px;
  padding: 16px;
  border: 1px solid #d0d5dd;
  border-radius: 10px;
  background: #f8fafc;
}

.graph-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.graph-summary-grid > div {
  padding: 12px;
  border-radius: 8px;
  background: #f8fafc;
}

.graph-summary-grid span {
  display: block;
  color: #667085;
}

.graph-summary-grid strong {
  display: block;
  margin-top: 6px;
  font-size: 22px;
}

.graph-editor-grid {
  display: grid;
  grid-template-columns: 230px minmax(360px, 1fr) 280px;
  gap: 14px;
  align-items: start;
}

.graph-palette,
.graph-canvas,
.graph-inspector {
  min-height: 420px;
  padding: 14px;
  border: 1px solid #e4e7ec;
  border-radius: 10px;
  background: #fff;
}

.graph-palette {
  display: grid;
  align-content: start;
  gap: 10px;
  max-height: 620px;
  overflow: auto;
}

.section-title.compact {
  gap: 2px;
  margin-bottom: 4px;
}

.palette-id {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px;
  border: 1px solid #e4e7ec;
  border-radius: 8px;
  background: #f8fafc;
  cursor: grab;
}

.palette-id.joined {
  border-color: #7cd9a6;
  background: #f0fdf4;
}

.palette-id.disabled {
  color: #98a2b3;
  cursor: not-allowed;
}

.palette-id span,
.graph-canvas-header span,
.graph-edge-row span,
.graph-edge-row em,
.inspector-card span {
  display: block;
  margin-top: 4px;
  color: #667085;
  font-style: normal;
}

.graph-canvas {
  display: grid;
  align-content: start;
  gap: 14px;
  background: #f8fafc;
}

.graph-canvas-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.graph-node-list,
.graph-edge-board,
.graph-inspector {
  display: grid;
  align-content: start;
  gap: 10px;
}

.graph-edge-board {
  padding-top: 12px;
  border-top: 1px dashed #d0d5dd;
}

.graph-edge-row,
.inspector-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e4e7ec;
  border-radius: 8px;
  background: #fff;
}

.graph-edge-row {
  cursor: pointer;
}

.priority-lane {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #667085;
}

.graph-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px;
  border: 1px solid #e4e7ec;
  border-radius: 8px;
  background: #fff;
  cursor: grab;
}

.graph-node.active,
.graph-edge-row.active {
  border-color: #2563eb;
  box-shadow: inset 0 0 0 1px #2563eb;
}

.graph-node.joined {
  border-color: #7cd9a6;
  background: #f0fdf4;
}

.graph-node.base {
  border-color: #2563eb;
}

.graph-node span,
.graph-node em,
	.edge-list span,
	.version-item span,
	.version-item em,
	.service-item span,
	.audit-item span {
	  display: block;
	  margin-top: 4px;
	  color: #667085;
  font-style: normal;
}

.graph-node em {
  color: #d03050;
}

.graph-options {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.mini-overview {
  grid-template-columns: repeat(6, minmax(120px, 1fr));
  margin-bottom: 14px;
}

.task-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.task-detail-header > div {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #667085;
}

.task-detail-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.task-detail-grid > div {
  padding: 12px;
  border-radius: 8px;
  background: #f8fafc;
}

.task-detail-grid span {
  display: block;
  color: #667085;
}

.task-detail-grid strong {
  display: block;
  margin-top: 6px;
  word-break: break-all;
}

.explore-form {
  display: grid;
  grid-template-columns: 180px 160px 220px minmax(260px, 1fr) 120px;
  gap: 12px;
  align-items: start;
  margin-bottom: 14px;
}

.explore-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 500px;
  gap: 16px;
  align-items: start;
}

.explore-layout > .main-card,
.explore-side-stack,
.side-card {
  min-width: 0;
}

.explore-side-stack {
  display: grid;
  gap: 16px;
}

.explore-query-panel {
  display: grid;
  gap: 12px;
  margin-bottom: 14px;
  padding: 14px;
  border: 1px solid #e4e7ec;
  border-radius: 10px;
  background: #f8fafc;
}

.explore-query-grid {
  display: grid;
  grid-template-columns: 180px minmax(220px, 1fr) 150px minmax(240px, 1fr);
  gap: 12px;
  align-items: end;
}

.explore-title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
}

.explore-query-grid label,
.explore-value-input {
  display: grid;
  gap: 6px;
  color: #344054;
  font-weight: 600;
}

.explore-value-input {
  width: 100%;
}

.explore-value-input :deep(.n-input) {
  background: #fff;
}

.explore-switch-row,
.table-toolbar,
.mapping-detail-title,
.change-filter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.explore-switch-row {
  justify-content: flex-start;
  color: #667085;
}

.explore-summary-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(100px, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.explore-summary-grid > div,
.mapping-drawer-summary > div {
  padding: 12px;
  border-radius: 8px;
  background: #f8fafc;
}

.explore-summary-grid span,
.mapping-drawer-summary span,
.mapping-detail-grid span {
  display: block;
  color: #667085;
}

.explore-summary-grid strong,
.mapping-drawer-summary strong,
.mapping-detail-grid strong {
  display: block;
  margin-top: 5px;
  word-break: break-all;
}

.explore-summary-grid strong {
  font-size: 22px;
}

.success {
  color: #18a058;
}

.error {
  color: #d03050;
}

.table-toolbar {
  margin-bottom: 12px;
}

.table-toolbar > span {
  font-weight: 700;
}

.mapping-detail-card {
  display: grid;
  gap: 12px;
}

.mapping-detail-grid,
.mapping-drawer-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.mono-text {
  color: #667085;
  word-break: break-all;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.cell-mono,
.cell-link-mono :deep(.n-button__content) {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: bottom;
  white-space: nowrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.cell-link-mono {
  max-width: 190px;
  overflow: hidden;
}

.mapping-result-table {
  max-width: 100%;
}

.mapping-result-table :deep(.n-data-table-th),
.mapping-result-table :deep(.n-data-table-td) {
  white-space: nowrap;
  vertical-align: middle;
}

.mapping-result-table :deep(.n-data-table-td) {
  height: 56px;
}

.mapping-result-table :deep(.mapping-id-cell) {
  min-width: 260px;
  max-width: 260px;
  overflow: hidden;
}

.mapping-result-table :deep(.mapping-id-cell .cell-mono) {
  width: 240px;
  max-width: 240px;
}

.related-id-list,
.related-inline-list,
.drawer-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.related-id-list {
  align-items: center;
  min-width: 0;
}

.related-id-list > strong {
  width: 100%;
}

.related-id-list :deep(.n-tag),
.related-inline-list :deep(.n-tag) {
  max-width: 100%;
}

.related-id-list :deep(.n-tag__content),
.related-inline-list :deep(.n-tag__content) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.change-filter {
  margin-bottom: 12px;
}

.drawer-section {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.lineage-management-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 460px;
  gap: 16px;
  align-items: start;
}

.lineage-management-layout > .main-card,
.lineage-side-stack,
.lineage-main-card,
.lineage-side-stack .side-card {
  min-width: 0;
}

.lineage-query-panel,
.lineage-filter-row {
  display: grid;
  gap: 12px;
  margin-bottom: 14px;
}

.lineage-query-panel {
  grid-template-columns: 160px minmax(260px, 1fr) 120px 180px;
  padding: 14px;
  border: 1px solid #e4e7ec;
  border-radius: 10px;
  background: #f8fafc;
}

.lineage-query-panel label {
  display: grid;
  gap: 6px;
  color: #344054;
  font-weight: 600;
}

.lineage-filter-row {
  grid-template-columns: minmax(260px, 1fr) 180px 160px;
}

.lineage-overview {
  margin-bottom: 14px;
}

.lineage-board {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(180px, 0.75fr) minmax(0, 1fr);
  gap: 12px;
  margin-bottom: 16px;
  padding: 16px;
  border: 1px solid #d0d5dd;
  border-radius: 10px;
  background: linear-gradient(180deg, #f8fafc 0%, #fff 100%);
}

.lineage-layer {
  display: grid;
  align-content: start;
  gap: 10px;
  min-height: 220px;
  padding: 12px;
  border-radius: 10px;
  background: #fff;
}

.lineage-layer.current {
  background: #ecfdf3;
}

.lineage-layer-title {
  color: #667085;
  font-weight: 700;
}

.lineage-node-card {
  display: grid;
  gap: 6px;
  width: 100%;
  padding: 12px;
  border: 1px solid #e4e7ec;
  border-radius: 8px;
  background: #fff;
  color: #101828;
  cursor: pointer;
  text-align: left;
}

.lineage-node-card:hover,
.lineage-node-card.active {
  border-color: #18a058;
  box-shadow: inset 0 0 0 1px #18a058;
}

.lineage-node-card span {
  color: #667085;
}

.lineage-node-card.id_type,
.lineage-node-card.oneid_task {
  border-left: 4px solid #18a058;
}

.lineage-node-card.dataset {
  border-left: 4px solid #64748b;
}

.lineage-node-card.tag,
.lineage-node-card.segment {
  border-left: 4px solid #2563eb;
}

.lineage-node-card.online_service,
.lineage-node-card.marketing {
  border-left: 4px solid #f59e0b;
}

.lineage-side-stack,
.lineage-tables,
.lineage-detail {
  display: grid;
  gap: 16px;
}

.lineage-detail p {
  margin: 0;
  color: #667085;
}

.cross-management-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 420px;
  gap: 16px;
  align-items: start;
}

.cross-management-layout > .main-card,
.cross-main-card,
.cross-side-stack,
.cross-side-stack .side-card {
  min-width: 0;
}

.cross-filter-row {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) 180px;
  gap: 12px;
  margin-bottom: 14px;
}

.cross-overview {
  margin-bottom: 14px;
}

.cross-preview-card {
  margin-top: 16px;
}

.cross-side-stack,
.cross-detail-card,
.cross-impact-list {
  display: grid;
  gap: 16px;
}

.cross-detail-card p {
  margin: 0;
  color: #667085;
}

.cross-impact-list > div {
  display: grid;
  gap: 4px;
  padding: 12px;
  border: 1px solid #e4e7ec;
  border-radius: 8px;
  background: #f8fafc;
}

.cross-impact-list span {
  color: #667085;
}

.lineage-canvas,
.dag-board {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 18px;
  border: 1px dashed #d0d5dd;
  border-radius: 10px;
  background: #f8fafc;
}

.lineage-node,
.dag-node {
  min-width: 160px;
  padding: 12px;
  border: 1px solid #e4e7ec;
  border-radius: 8px;
  background: #fff;
}

.dag-node.current {
  border-color: #18a058;
  box-shadow: inset 0 0 0 1px #18a058;
}

.dag-node em {
  display: block;
  margin-top: 6px;
  color: #667085;
  font-style: normal;
}

.lineage-node.id_type,
.lineage-node.oneid_task {
  border-color: #18a058;
}

.lineage-node.tag,
.lineage-node.segment {
  border-color: #2563eb;
}

.lineage-edges {
  margin-top: 12px;
  color: #667085;
}

.dag-edges,
.task-diagnosis {
  display: grid;
  gap: 12px;
  margin-top: 12px;
  color: #667085;
}

	.service-item,
	.version-item,
	.audit-item {
	  padding: 12px;
	  border: 1px solid #e4e7ec;
	  border-radius: 8px;
	  background: #fff;
	}

	.version-list {
	  margin-top: 14px;
	}

	.version-list h4 {
	  margin: 4px 0 0;
	}

	.lineage-node {
	  cursor: pointer;
	}

.idm-modal {
  width: 640px;
}

.wide-modal {
  width: 900px;
}

.template-row,
.inline-triplet {
  display: grid;
  grid-template-columns: 40px repeat(4, minmax(120px, 1fr));
  gap: 10px;
  align-items: center;
}

.inline-triplet {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  width: 100%;
}

.inline-pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  width: 100%;
}

.formula-preview {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f0fdf4;
  color: #027a48;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.preview-block {
  display: grid;
  gap: 10px;
  width: 100%;
}

.relation-strategy {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.delete-impact {
  display: grid;
  gap: 8px;
  margin-top: 14px;
  padding: 14px;
  border-radius: 8px;
  background: #f8fafc;
  color: #475467;
}

.delete-impact strong {
  color: #101828;
}

.full-button {
  width: 100%;
  margin-bottom: 12px;
}

@media (max-width: 1280px) {
  .overview-grid,
  .settings-grid,
  .content-grid,
  .graph-layout,
  .graph-editor-grid,
  .explore-layout,
  .explore-query-grid,
  .lineage-management-layout,
  .lineage-query-panel,
  .lineage-filter-row,
  .lineage-board,
  .cross-management-layout,
  .cross-filter-row,
  .task-filter-row,
  .task-detail-grid {
    grid-template-columns: 1fr;
  }

  .explore-form {
    grid-template-columns: 1fr 1fr;
  }

  .explore-summary-grid,
  .mapping-detail-grid,
  .mapping-drawer-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
