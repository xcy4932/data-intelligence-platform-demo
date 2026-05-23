<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NAlert,
  NButton,
  NCard,
  NCheckbox,
  NDataTable,
  NDropdown,
  NEmpty,
  NInput,
  NInputNumber,
  NModal,
  NPagination,
  NSelect,
  NSpace,
  NSwitch,
  NTabPane,
  NTabs,
  NTag,
} from 'naive-ui'
import type { DataTableColumns, DropdownOption, SelectOption, TagProps } from 'naive-ui'
import { datasetService } from '@/services/datasetService'
import type {
  DataMaskRule,
  Dataset,
  DatasetField,
  DatasetLineageEdge,
  DatasetLineageNode,
  DatasetModel,
  DatasetPermission,
  DatasetPermissionRule,
  DatasetPreviewRow,
  DatasetSensitivityLevel,
  FieldType,
  MaskMethod,
  MaskingRestrictedCapability,
  MaskingRuleConfig,
  MaskingRuleType,
  MaskingScene,
  MaskingScopeMember,
  MaskingScopeMemberType,
  MaskingScopeMode,
  PreviewResult,
  SemanticType,
  SensitivityChoice,
  SyncConfig,
  SyncTask,
  SyncTaskStatus,
} from '@/types/dataset'

type DetailTab = 'preview' | 'schema' | 'sync' | 'model' | 'lineage' | 'permission' | 'stats' | 'logs'
type ModalName =
  | 'permission'
  | 'fieldImpact'
  | 'deleteImpact'
  | 'transferOwner'
  | 'transferAlarm'
  | 'mirror'
  | 'ready'
  | 'excel'
  | 'syncLog'
  | 'syncTaskDetail'
  | 'syncBatch'
  | 'previewFilter'
  | 'lineageImpact'
  | 'permissionException'
  | 'maskRule'
  | 'maskDelete'
  | null

type PreviewTableRow = DatasetPreviewRow & { __key: string }

interface AccessLog {
  id: string
  user: string
  action: string
  module: string
  accessAt: string
  rows: number
}

interface OperationLog {
  id: string
  operator: string
  action: string
  detail: string
  createdAt: string
}

interface ImpactItem {
  id: string
  type: 'dashboard' | 'analysis' | 'sync' | 'permission'
  name: string
  owner: string
  risk: 'low' | 'medium' | 'high'
  resourcePath?: string
  lastVisitedAt?: string
  fieldNames?: string[]
  blockedReason?: string
}

interface SyncTaskStep {
  id: string
  stage: string
  status: SyncTaskStatus
  startedAt: string
  durationSeconds: number
  rowCount: number
  message: string
}

interface SyncQualityCheck {
  id: string
  name: string
  status: 'passed' | 'warning' | 'failed'
  detail: string
}

interface LineageImpactResource {
  id: string
  name: string
  resourceType: 'dashboard' | 'chart' | 'dataset' | 'analysis' | 'monitor'
  owner: string
  visitCount: number
  risk: ImpactItem['risk']
  description: string
}

const route = useRoute()
const router = useRouter()
const validDetailTabs = new Set<DetailTab>(['preview', 'schema', 'sync', 'model', 'lineage', 'permission', 'stats', 'logs'])

function normalizeDetailTab(value: unknown): DetailTab {
  if (value === 'mask') return 'permission'
  return validDetailTabs.has(value as DetailTab) ? (value as DetailTab) : 'preview'
}

const loading = ref(false)
const dataset = ref<Dataset | null>(null)
const model = ref<DatasetModel | null>(null)
const preview = ref<PreviewResult | null>(null)
const syncConfig = ref<SyncConfig | null>(null)
const syncTasks = ref<SyncTask[]>([])
const lineageNodes = ref<DatasetLineageNode[]>([])
const lineageEdges = ref<DatasetLineageEdge[]>([])
const permissionRules = ref<DatasetPermissionRule[]>([])
const maskRules = ref<DataMaskRule[]>([])

const activeTab = ref<DetailTab>(normalizeDetailTab(route.query.tab))
const activeModal = ref<ModalName>(null)
const feedback = ref('正在加载数据集详情。')
const feedbackType = ref<'success' | 'warning' | 'error'>('success')
const previewFieldKeyword = ref('')
const previewPage = ref(1)
const previewPageSize = ref(20)
const schemaKeyword = ref('')
const schemaEditing = ref(false)
const fieldImpactName = ref('')
const excelText = ref('用户 ID,user_id,string,ID 字段\n广告收益,revenue,decimal,广告产生的预估收入')
const selectedTask = ref<SyncTask | null>(null)
const selectedField = ref<DatasetField | null>(null)
const selectedLineageNode = ref<DatasetLineageNode | null>(null)
const lineageDirection = ref<'all' | 'upstream' | 'downstream'>('all')
const lineageDepth = ref(2)
const impactAcknowledged = ref(false)
const deleteConfirmName = ref('')
const schemaDirty = ref(false)
const permissionForm = ref({
  subjectType: 'team' as DatasetPermissionRule['subjectType'],
  subjectName: '运营分析团队',
  permissions: ['view'] as DatasetPermission[],
  rowRule: '',
  columnRule: '',
})
const ownerForm = ref({ owner: 'Mia Chen' })
const alarmForm = ref({ owner: '运营值班组' })
const readyForm = ref({
  enabled: true,
  expression: 'last_partition_ready = true',
  timeoutMinutes: 30,
})
const mirrorForm = ref({
  enabled: true,
  targetProject: '运营分析项目',
  refreshMode: '跟随源数据集同步',
})
const previewFilterForm = ref({
  fieldName: '',
  operator: 'equals',
  value: '',
})

const permissionLevelOptions: SelectOption[] = [
  { label: '预览', value: 'read_preview' },
  { label: '查看', value: 'view' },
  { label: '编辑', value: 'edit' },
  { label: '管理', value: 'admin' },
]
const maskForm = ref({
  fieldName: 'user_id',
  ruleId: '',
  method: 'partial' as MaskMethod,
  ruleType: 'custom_middle' as MaskingRuleType,
  replacementChar: '*',
  keepPrefixLength: 6,
  keepSuffixLength: 2,
  keepStartIndex: 1,
  keepEndIndex: 3,
  specialChar: '@',
  fixedReplacement: '***',
  scopeMode: 'members_masked_others_unmasked' as MaskingScopeMode,
  scopeMemberType: 'team' as MaskingScopeMemberType,
  scopeMemberName: '运营分析团队',
  scopeMembers: [{ memberType: 'team', memberId: 'team_ops', memberName: '运营分析团队' }] as MaskingScopeMember[],
  scenes: ['preview', 'visual_query', 'dashboard', 'download', 'saved_analysis'] as MaskingScene[],
  restrictedCapabilities: ['alias_bypass', 'calculated_field', 'download_original'] as MaskingRestrictedCapability[],
  example: 'uid_83****01',
  enabled: true,
})
const deletingMaskRule = ref<DataMaskRule | null>(null)
const maskPreviewSample = ref('uid_839201')

const accessLogs = ref<AccessLog[]>([
  { id: 'access_1', user: 'Chaoyang Xu', action: '可视化查询', module: '事件分析', accessAt: '2026-05-22 10:10:00', rows: 18200 },
  { id: 'access_2', user: 'Mia Chen', action: '保存到看板', module: '数据看板', accessAt: '2026-05-21 18:40:00', rows: 8600 },
  { id: 'access_3', user: '运营值班组', action: '订阅监控', module: '监控中心', accessAt: '2026-05-20 09:30:00', rows: 3200 },
])
const operationLogs = ref<OperationLog[]>([
  { id: 'op_1', operator: 'Chaoyang Xu', action: '更新字段说明', detail: '批量补充广告位、收益字段描述。', createdAt: '2026-05-22 09:45:00' },
  { id: 'op_2', operator: 'Mia Chen', action: '新增授权', detail: '授权运营分析团队查看数据集。', createdAt: '2026-05-21 17:30:00' },
  { id: 'op_3', operator: '系统', action: '同步完成', detail: '抽取 18,642,000 行数据。', createdAt: '2026-05-22 08:00:00' },
])
const impacts = ref<ImpactItem[]>([
  {
    id: 'impact_1',
    type: 'dashboard',
    name: '广告监控看板 / 广告观看趋势',
    owner: '运营团队',
    risk: 'high',
    resourcePath: '/dashboard/ad-monitor',
    lastVisitedAt: '2026-05-22 10:30:00',
    fieldNames: ['ad_position', 'revenue', 'user_id'],
    blockedReason: '删除字段会导致看板组件查询失败',
  },
  {
    id: 'impact_2',
    type: 'analysis',
    name: '事件分析：广告观看下降',
    owner: 'Chaoyang Xu',
    risk: 'medium',
    resourcePath: '/data-insight/event-analysis?savedAnalysisId=saved_ad_decline',
    lastVisitedAt: '2026-05-21 18:00:00',
    fieldNames: ['ad_position', 'game_type', 'coin_balance_level'],
  },
  {
    id: 'impact_3',
    type: 'sync',
    name: '低金币用户行为关联数据集',
    owner: 'Mia Chen',
    risk: 'medium',
    resourcePath: '/metadata/datasets/ds_low_coin_behavior_assoc',
    lastVisitedAt: '2026-05-22 08:40:00',
    fieldNames: ['user_id', 'coin_balance_level'],
  },
  {
    id: 'impact_4',
    type: 'permission',
    name: '运营分析团队行列权限',
    owner: '平台管理员',
    risk: 'low',
    lastVisitedAt: '2026-05-20 09:20:00',
    fieldNames: ['user_id', 'revenue'],
    blockedReason: '字段被行列权限引用，需先移除权限规则',
  },
])

const lineageImpactResources = ref<LineageImpactResource[]>([
  {
    id: 'chart_ad_watch_trend',
    name: '广告观看次数趋势图',
    resourceType: 'chart',
    owner: '运营分析团队',
    visitCount: 428,
    risk: 'high',
    description: '字段 ad_position 与 revenue 被用于图表维度和指标。',
  },
  {
    id: 'dashboard_ads',
    name: '广告监控看板',
    resourceType: 'dashboard',
    owner: '运营团队',
    visitCount: 1260,
    risk: 'high',
    description: '看板依赖当前数据集的同步结果和行列权限。',
  },
  {
    id: 'saved_event_decline',
    name: '广告观看下降保存分析',
    resourceType: 'analysis',
    owner: 'Chaoyang Xu',
    visitCount: 86,
    risk: 'medium',
    description: '保存分析会在打开时重新查询当前数据集。',
  },
  {
    id: 'monitor_ad_watch',
    name: '广告观看异常订阅',
    resourceType: 'monitor',
    owner: '运营值班组',
    visitCount: 31,
    risk: 'medium',
    description: '订阅在同步完成后触发，依赖数据就绪状态。',
  },
])

const datasetId = computed(() => String(route.params.datasetId || ''))
const canEdit = computed(() => ['edit', 'admin'].includes(dataset.value?.permission ?? 'none') && !dataset.value?.readonly)
const canManage = computed(() => dataset.value?.permission === 'admin' && !dataset.value?.readonly)
const canRunSync = computed(() => canEdit.value && dataset.value?.sourceMode === 'extract')
const runningSyncTask = computed(() => syncTasks.value.find((task) => ['running', 'waiting', 'created'].includes(task.status)) ?? null)

const permissionSummary = computed(() => {
  const resourceRuleCount = permissionRules.value.length
  const rowRuleCount = permissionRules.value.filter((rule) => Boolean(rule.rowRule)).length
  const columnRuleCount = permissionRules.value.filter((rule) => Boolean(rule.columnRule)).length
  return {
    resourceRuleCount,
    rowRuleCount,
    columnRuleCount,
    maskRuleCount: maskRules.value.filter((rule) => rule.enabled).length,
    unmatchedPolicy: '未命中行权限的成员默认不可见任何行；列权限采用更严格规则合并。',
  }
})

const sensitivityLevel = computed<DatasetSensitivityLevel>(() => dataset.value?.sensitivityLevel ?? 'unclassified')
const activeMaskRules = computed(() => maskRules.value.filter((rule) => rule.enabled))
const canEditMasking = computed(() => canEdit.value && sensitivityLevel.value !== 'non_sensitive')
const maskFieldOptions = computed<SelectOption[]>(() =>
  (model.value?.outputFields ?? []).map((field) => {
    const configured = maskRules.value.some((rule) => rule.fieldName === field.name && rule.id !== maskForm.value.ruleId)
    return {
      label: `${field.displayName} ${field.name}${configured ? '（已配置）' : ''}`,
      value: field.name,
      disabled: configured,
    }
  }),
)
const maskStatus = computed(() => {
  const hasCompleteRule = activeMaskRules.value.some((rule) => isMaskRuleComplete(rule))
  if (sensitivityLevel.value === 'unclassified') {
    return { type: 'warning' as const, text: '待定级', detail: '请先判断该数据集是否包含敏感字段。' }
  }
  if (sensitivityLevel.value === 'non_sensitive') {
    return { type: 'success' as const, text: '非涉敏', detail: '当前数据集无需字段脱敏。' }
  }
  if (sensitivityLevel.value === 'sensitive_unmasked') {
    return { type: 'error' as const, text: '涉敏未脱敏', detail: '下载、订阅和嵌入将被限制，请补充字段脱敏规则。' }
  }
  return hasCompleteRule
    ? { type: 'success' as const, text: '涉敏已脱敏', detail: '脱敏规则已应用到预览、查询、看板和下载场景。' }
    : { type: 'warning' as const, text: '规则不完整', detail: '至少需要一条启用且完整的字段脱敏规则。' }
})
const maskPreviewRows = computed(() =>
  activeMaskRules.value.map((rule) => ({
    id: rule.id,
    fieldName: maskFieldLabel(rule),
    originalValue: sampleValueForRule(rule),
    maskedValue: applyMaskToValue(sampleValueForRule(rule), rule),
    rule: maskRuleLabel(rule),
    scope: maskScopeLabel(rule),
    scenes: maskSceneSummary(rule),
  })),
)

const maskFormPreview = computed(() => {
  const draft = maskFormToRule()
  const original = maskPreviewSample.value || sampleValueForRule(draft)
  return {
    original,
    masked: applyMaskToValue(original, draft),
  }
})

const syncSummary = computed(() => {
  const success = syncTasks.value.filter((task) => task.status === 'success').length
  const failed = syncTasks.value.filter((task) => task.status === 'failed').length
  const running = syncTasks.value.filter((task) => ['running', 'waiting', 'created'].includes(task.status)).length
  const latest = syncTasks.value[0]
  return {
    success,
    failed,
    running,
    latest,
    successRate: syncTasks.value.length ? Math.round((success / syncTasks.value.length) * 100) : 0,
    nextRunAt: dataset.value?.sourceMode === 'extract' ? '2026-05-24 08:00:00' : '直连实时查询',
  }
})

const selectedTaskSteps = computed<SyncTaskStep[]>(() => {
  const task = selectedTask.value
  if (!task) return []
  const failed = task.status === 'failed'
  return [
    {
      id: 'step_dependency',
      stage: '依赖检查',
      status: failed ? 'success' : task.status,
      startedAt: task.startedAt,
      durationSeconds: 42,
      rowCount: 0,
      message: syncConfig.value?.dependencyStrategy === 'all_success' ? '上游依赖全部就绪。' : '无需等待上游依赖。',
    },
    {
      id: 'step_extract',
      stage: '读取源数据',
      status: failed ? 'failed' : task.status,
      startedAt: task.startedAt,
      durationSeconds: task.durationSeconds ? Math.max(90, Math.floor(task.durationSeconds * 0.42)) : 90,
      rowCount: task.rowCount ?? 0,
      message: failed ? task.errorMessage ?? '读取源数据失败。' : '已读取最近业务分区。',
    },
    {
      id: 'step_write',
      stage: '写入目标表',
      status: failed ? 'waiting' : task.status,
      startedAt: task.finishedAt ?? task.startedAt,
      durationSeconds: task.durationSeconds ? Math.max(60, Math.floor(task.durationSeconds * 0.36)) : 60,
      rowCount: task.rowCount ?? 0,
      message: failed ? '上一步失败，写入阶段未执行。' : '目标表分区写入完成。',
    },
  ]
})

const selectedTaskQualityChecks = computed<SyncQualityCheck[]>(() => {
  const task = selectedTask.value
  if (!task) return []
  const zeroRows = (task.rowCount ?? 0) === 0
  return [
    {
      id: 'quality_rows',
      name: '产出行数',
      status: zeroRows ? 'failed' : 'passed',
      detail: zeroRows ? '本次产出为 0 行，需要检查源表分区或筛选条件。' : `产出 ${formatCount(task.rowCount ?? 0)} 行。`,
    },
    {
      id: 'quality_schema',
      name: '字段结构',
      status: task.status === 'failed' ? 'failed' : 'passed',
      detail: task.status === 'failed' ? task.errorMessage ?? '字段结构校验失败。' : '字段数量和类型与当前模型一致。',
    },
    {
      id: 'quality_sla',
      name: '同步 SLA',
      status: (task.durationSeconds ?? 0) > (syncConfig.value?.performance.timeoutMinutes ?? 60) * 60 ? 'warning' : 'passed',
      detail: `任务耗时 ${formatDuration(task.durationSeconds)}，超时阈值 ${syncConfig.value?.performance.timeoutMinutes ?? 60} 分钟。`,
    },
  ]
})

const impactedResourcesForSelectedField = computed(() => {
  const field = selectedField.value
  if (!field) return impacts.value
  return impacts.value.filter((item) => !item.fieldNames || item.fieldNames.includes(field.name) || item.fieldNames.includes(field.displayName))
})

const fieldBlockers = computed(() => {
  const field = selectedField.value
  if (!field || !model.value) return []
  const blockers: string[] = []
  if (dataset.value?.readonly || dataset.value?.sourceMode === 'theme') blockers.push('主题或只读数据集字段不允许删除。')
  if (field.isPrimaryKey || field.semanticType === 'id') blockers.push('ID 字段被用于查询主体和去重口径，不允许直接删除。')
  const usedByJoin = model.value.edges.some((edge) =>
    edge.joinConfig?.conditions.some((condition) => condition.leftField === field.name || condition.rightField === field.name),
  )
  if (usedByJoin) blockers.push('字段被 Join 关联条件引用，请先调整模型关系。')
  const usedByPermission = permissionRules.value.some((rule) =>
    [rule.rowRule, rule.columnRule].some((text) => String(text ?? '').includes(field.name) || String(text ?? '').includes(field.displayName)),
  )
  if (usedByPermission) blockers.push('字段被行列权限规则引用，请先修改权限规则。')
  const usedByExpression = (model.value.outputFields ?? []).some((item) => item.expression?.includes(field.name))
  if (usedByExpression) blockers.push('字段被计算字段表达式引用，请先删除或改写派生字段。')
  return blockers
})

const canDeleteSelectedField = computed(() => fieldBlockers.value.length === 0 && canEdit.value)

const lineageStats = computed(() => {
  const downstream = lineageImpactResources.value
  return {
    chartCount: downstream.filter((item) => item.resourceType === 'chart').length,
    dashboardCount: downstream.filter((item) => item.resourceType === 'dashboard').length,
    datasetCount: downstream.filter((item) => item.resourceType === 'dataset').length,
    visitCount: downstream.reduce((sum, item) => sum + item.visitCount, 0),
  }
})

const visiblePreviewFields = computed(() => {
  const keyword = previewFieldKeyword.value.trim().toLowerCase()
  return (preview.value?.fields ?? []).filter((field) => {
    if (!keyword) return true
    return [field.name, field.displayName, field.description].some((value) => String(value ?? '').toLowerCase().includes(keyword))
  })
})

const previewRows = computed<PreviewTableRow[]>(() =>
  (preview.value?.rows ?? []).map((row, index) => ({ ...row, __key: `preview_${index}` })),
)

const pagedPreviewRows = computed(() => {
  const start = (previewPage.value - 1) * previewPageSize.value
  return previewRows.value.slice(start, start + previewPageSize.value)
})

const filteredFields = computed(() => {
  const keyword = schemaKeyword.value.trim().toLowerCase()
  return (model.value?.outputFields ?? []).filter((field) => {
    if (!keyword) return true
    return [field.name, field.displayName, field.description, field.semanticType].some((value) =>
      String(value ?? '').toLowerCase().includes(keyword),
    )
  })
})

const previewColumns = computed<DataTableColumns<PreviewTableRow>>(() =>
  visiblePreviewFields.value.map((field) => ({
    title: field.displayName,
    key: field.name,
    minWidth: 130,
    render(row) {
      return h('span', { class: field.semanticType === 'measure' ? 'number-cell' : '' }, String(row[field.name] ?? '-'))
    },
  })),
)

const schemaColumns = computed<DataTableColumns<DatasetField>>(() => [
  {
    title: '字段名',
    key: 'name',
    width: 170,
    fixed: 'left',
    render(row) {
      return h('div', [h('strong', row.displayName), h('div', { class: 'muted' }, row.name)])
    },
  },
  {
    title: '显示名',
    key: 'displayName',
    minWidth: 160,
    render(row) {
      if (!schemaEditing.value) return row.displayName
      return h(NInput, {
        value: row.displayName,
        'onUpdate:value': (value: string) => updateField(row.id, { displayName: value }),
      })
    },
  },
  {
    title: '类型',
    key: 'fieldType',
    width: 110,
    render(row) {
      return h(NTag, { size: 'small' }, { default: () => row.fieldType })
    },
  },
  {
    title: '语义类型',
    key: 'semanticType',
    minWidth: 150,
    render(row) {
      if (!schemaEditing.value) return semanticLabel(row.semanticType)
      return h(NSelect, {
        value: row.semanticType,
        options: semanticOptions,
        'onUpdate:value': (value: DatasetField['semanticType']) => updateField(row.id, { semanticType: value }),
      })
    },
  },
  {
    title: '默认聚合',
    key: 'aggregation',
    minWidth: 150,
    render(row) {
      if (!schemaEditing.value) return aggregationLabel(row.aggregation)
      return h(NSelect, {
        value: row.aggregation,
        options: aggregationOptions,
        'onUpdate:value': (value: DatasetField['aggregation']) => updateField(row.id, { aggregation: value }),
      })
    },
  },
  {
    title: '可见',
    key: 'visible',
    width: 90,
    render(row) {
      return h(NSwitch, {
        value: row.visible,
        disabled: !schemaEditing.value,
        'onUpdate:value': (value: boolean) => updateField(row.id, { visible: value }),
      })
    },
  },
  {
    title: '描述',
    key: 'description',
    minWidth: 220,
    render(row) {
      if (!schemaEditing.value) return row.description || '-'
      return h(NInput, {
        value: row.description ?? '',
        placeholder: '请输入字段说明',
        'onUpdate:value': (value: string) => updateField(row.id, { description: value }),
      })
    },
  },
  {
    title: '操作',
    key: 'impact',
    width: 170,
    fixed: 'right',
    render(row) {
      return h(
        NSpace,
        { size: 8 },
        {
          default: () => [
            h(
              NButton,
              {
                text: true,
                type: 'primary',
                onClick: () => openFieldImpact(row),
              },
              { default: () => '影响分析' },
            ),
            h(
              NButton,
              {
                text: true,
                type: 'error',
                disabled: !schemaEditing.value || !canEdit.value,
                onClick: () => requestDeleteField(row),
              },
              { default: () => '删除' },
            ),
          ],
        },
      )
    },
  },
])

const syncTaskColumns: DataTableColumns<SyncTask> = [
  { title: '任务名称', key: 'taskName', minWidth: 180 },
  {
    title: '状态',
    key: 'status',
    width: 110,
    render(row) {
      return h(NTag, { size: 'small', type: syncStatusType(row.status) }, { default: () => syncTaskStatusLabel(row.status) })
    },
  },
  { title: '开始时间', key: 'startedAt', minWidth: 160 },
  { title: '结束时间', key: 'finishedAt', minWidth: 160, render: (row) => row.finishedAt ?? '-' },
  { title: '数据量', key: 'rowCount', width: 120, render: (row) => formatCount(row.rowCount ?? 0) },
  { title: '耗时', key: 'durationSeconds', width: 100, render: (row) => formatDuration(row.durationSeconds) },
  {
    title: '操作',
    key: 'actions',
    width: 230,
    fixed: 'right',
    render(row) {
      return h(
        NSpace,
        { size: 8 },
        {
          default: () => [
            h(NButton, { text: true, type: 'primary', onClick: () => openSyncTaskDetail(row) }, { default: () => '详情' }),
            h(NButton, { text: true, type: 'primary', onClick: () => openSyncLog(row) }, { default: () => '日志' }),
            h(
              NButton,
              { text: true, type: 'primary', disabled: row.status === 'running', onClick: () => rerunTask(row) },
              { default: () => '重跑' },
            ),
            h(
              NButton,
              { text: true, type: 'error', disabled: row.status !== 'running', onClick: () => cancelTask(row) },
              { default: () => '取消' },
            ),
          ],
        },
      )
    },
  },
]

const permissionColumns: DataTableColumns<DatasetPermissionRule> = [
  { title: '授权对象', key: 'subjectName', minWidth: 160 },
  {
    title: '类型',
    key: 'subjectType',
    width: 100,
    render(row) {
      return subjectTypeLabel(row.subjectType)
    },
  },
  {
    title: '权限',
    key: 'permission',
    minWidth: 180,
    render(row) {
      return permissionLabels(row)
    },
  },
  { title: '行权限', key: 'rowRule', minWidth: 220, render: (row) => row.rowRule ?? '-' },
  { title: '列权限', key: 'columnRule', minWidth: 220, render: (row) => row.columnRule ?? '-' },
  {
    title: '操作',
    key: 'actions',
    width: 140,
    render(row) {
      return h(
        NSpace,
        { size: 8 },
        {
          default: () => [
            h(NButton, { text: true, type: 'primary', onClick: () => copyPermission(row) }, { default: () => '复制' }),
            h(NButton, { text: true, type: 'error', onClick: () => removePermission(row.id) }, { default: () => '删除' }),
          ],
        },
      )
    },
  },
]

const maskColumns: DataTableColumns<DataMaskRule> = [
  {
    title: '字段',
    key: 'fieldName',
    minWidth: 180,
    render(row) {
      const fieldMissing = !maskFieldExists(row)
      return h('div', { class: 'field-name-cell' }, [
        h('strong', {}, maskFieldLabel(row)),
        h('span', {}, `${row.fieldName} · ${fieldTypeLabel(row.fieldType)} · ${semanticLabel(row.semanticType)}`),
        fieldMissing ? h(NTag, { type: 'error', size: 'small' }, { default: () => '字段异常' }) : null,
      ])
    },
  },
  {
    title: '脱敏规则',
    key: 'ruleType',
    minWidth: 160,
    render(row) {
      return h(NSpace, { size: 6, vertical: true }, {
        default: () => [
          h(NTag, { type: isMaskRuleComplete(row) ? 'success' : 'warning', size: 'small' }, { default: () => maskRuleLabel(row) }),
          h('span', { class: 'muted' }, maskRuleConfigSummary(row)),
        ],
      })
    },
  },
  { title: '生效范围', key: 'scope', minWidth: 180, render: (row) => maskScopeLabel(row) },
  { title: '应用场景', key: 'scenes', minWidth: 190, render: (row) => maskSceneSummary(row) },
  { title: '绕过限制', key: 'restrictedCapabilities', minWidth: 180, render: (row) => maskRestrictedSummary(row) },
  { title: '示例', key: 'example', minWidth: 170, render: (row) => `${sampleValueForRule(row)} → ${applyMaskToValue(sampleValueForRule(row), row)}` },
  {
    title: '启用',
    key: 'enabled',
    width: 90,
    render(row) {
      return h(NSwitch, { value: row.enabled, disabled: !canEditMasking.value, 'onUpdate:value': () => toggleMask(row) })
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 130,
    render(row) {
      return h(NSpace, { size: 8 }, {
        default: () => [
          h(NButton, { text: true, type: 'primary', disabled: !canEditMasking.value, onClick: () => openMaskRule(row) }, { default: () => '编辑' }),
          h(NButton, { text: true, type: 'error', disabled: !canEditMasking.value, onClick: () => confirmDeleteMaskRule(row) }, { default: () => '删除' }),
        ],
      })
    },
  },
]

const accessColumns: DataTableColumns<AccessLog> = [
  { title: '访问人', key: 'user', width: 150 },
  { title: '动作', key: 'action', width: 130 },
  { title: '模块', key: 'module', width: 130 },
  { title: '访问时间', key: 'accessAt', minWidth: 160 },
  { title: '扫描行数', key: 'rows', width: 130, render: (row) => formatCount(row.rows) },
]

const operationColumns: DataTableColumns<OperationLog> = [
  { title: '操作人', key: 'operator', width: 150 },
  { title: '动作', key: 'action', width: 150 },
  { title: '详情', key: 'detail', minWidth: 260 },
  { title: '时间', key: 'createdAt', width: 170 },
]

const semanticOptions: SelectOption[] = [
  { label: '维度', value: 'dimension' },
  { label: '指标', value: 'measure' },
  { label: '时间', value: 'time' },
  { label: '地理', value: 'geo' },
  { label: 'ID', value: 'id' },
  { label: '未知', value: 'unknown' },
]

const aggregationOptions: SelectOption[] = [
  { label: '求和', value: 'sum' },
  { label: '平均', value: 'avg' },
  { label: '计数', value: 'count' },
  { label: '去重计数', value: 'count_distinct' },
  { label: '最大值', value: 'max' },
  { label: '最小值', value: 'min' },
  { label: '无', value: 'none' },
]

const maskRuleOptions: SelectOption[] = [
  { label: '姓名预置', value: 'preset_name' },
  { label: '邮箱预置', value: 'preset_email' },
  { label: '联系方式预置', value: 'preset_contact' },
  { label: '证件号通用预置', value: 'preset_china_id_general' },
  { label: '中国身份证预置', value: 'preset_china_citizen_id' },
  { label: '全量遮盖', value: 'preset_full_mask' },
  { label: '自定义中间遮盖', value: 'custom_middle' },
  { label: '自定义起止遮盖', value: 'custom_head_tail' },
  { label: '特殊字符前遮盖', value: 'custom_before_special_char' },
  { label: '特殊字符后遮盖', value: 'custom_after_special_char' },
]

const maskScopeOptions: SelectOption[] = [
  { label: '命中成员看脱敏值，其他成员看原值', value: 'members_masked_others_unmasked' },
  { label: '命中成员看原值，其他成员看脱敏值', value: 'members_unmasked_others_masked' },
]

const maskScopeMemberTypeOptions: SelectOption[] = [
  { label: '成员', value: 'user' },
  { label: '团队', value: 'team' },
  { label: '角色', value: 'role' },
]

const maskSceneOptions: SelectOption[] = [
  { label: '数据预览', value: 'preview' },
  { label: '可视化查询', value: 'visual_query' },
  { label: '数据看板', value: 'dashboard' },
  { label: '下载导出', value: 'download' },
  { label: '订阅', value: 'subscription' },
  { label: '监控', value: 'monitor' },
  { label: '嵌入', value: 'embed' },
  { label: '保存分析重查', value: 'saved_analysis' },
]

const maskRestrictedOptions: SelectOption[] = [
  { label: '字段别名绕过', value: 'alias_bypass' },
  { label: '分组聚合绕过', value: 'group_by' },
  { label: '格式化绕过', value: 'format' },
  { label: '计算字段绕过', value: 'calculated_field' },
  { label: '下载原值', value: 'download_original' },
]

const moreOptions = computed<DropdownOption[]>(() => [
  { label: '跨项目镜像配置', key: 'mirror', disabled: !canManage.value },
  { label: '归因分析配置', key: 'attribution', disabled: !canEdit.value },
  { label: '转移所有者', key: 'transferOwner', disabled: !canManage.value },
  { label: '转移告警人', key: 'transferAlarm', disabled: !canEdit.value },
  { label: '数据就绪配置', key: 'ready', disabled: !canEdit.value },
  { type: 'divider', key: 'divider' },
  { label: '删除数据集', key: 'delete', disabled: !canManage.value },
])

function setFeedback(message: string, type: typeof feedbackType.value = 'success') {
  feedback.value = message
  feedbackType.value = type
}

async function loadDetail() {
  if (!datasetId.value) return
  loading.value = true
  try {
    const [nextDataset, nextModel, nextSyncConfig, nextSyncTasks, nextLineage, nextPermissions, nextMasks] =
      await Promise.all([
        datasetService.getDataset(datasetId.value),
        datasetService.getDatasetModel(datasetId.value),
        datasetService.getSyncConfig(datasetId.value),
        datasetService.listSyncTasks(datasetId.value),
        datasetService.getLineage(datasetId.value),
        datasetService.listPermissionRules(datasetId.value),
        datasetService.listMaskRules(datasetId.value),
      ])
    dataset.value = nextDataset
    model.value = nextModel
    preview.value = await datasetService.previewModel(nextModel)
    syncConfig.value = nextSyncConfig
    syncTasks.value = nextSyncTasks
    lineageNodes.value = nextLineage.nodes
    lineageEdges.value = nextLineage.edges
    selectedLineageNode.value = nextLineage.nodes.find((node) => node.level === 'current') ?? nextLineage.nodes[0] ?? null
    permissionRules.value = nextPermissions
    maskRules.value = nextMasks
    schemaDirty.value = false
    selectedTask.value = nextSyncTasks[0] ?? null
    setFeedback('已加载数据集详情。')
  } catch {
    setFeedback('数据集详情加载失败，请返回列表重新选择。', 'error')
  } finally {
    loading.value = false
  }
}

function openModal(name: ModalName) {
  activeModal.value = name
}

function closeModal(show: boolean) {
  if (!show) activeModal.value = null
}

function handleMoreSelect(key: string) {
  if (key === 'attribution') {
    setFeedback('已打开归因分析配置入口，本 Demo 使用当前数据集作为付费归因底表。')
    void router.push(`/data-insight/attribution?datasetId=${datasetId.value}`)
    return
  }
  if (key === 'delete') {
    deleteConfirmName.value = ''
    impactAcknowledged.value = false
    activeModal.value = 'deleteImpact'
    return
  }
  activeModal.value = key as ModalName
}

function updateField(fieldId: string, patch: Partial<DatasetField>) {
  if (!model.value) return
  model.value.outputFields = model.value.outputFields.map((field) => (field.id === fieldId ? { ...field, ...patch } : field))
  schemaDirty.value = true
}

async function saveSchema() {
  if (!dataset.value || !model.value) return
  const invalidField = model.value.outputFields.find((field) => !field.displayName.trim())
  if (invalidField) {
    setFeedback(`字段「${invalidField.name}」显示名不能为空。`, 'error')
    return
  }
  dataset.value = await datasetService.saveDataset(dataset.value, model.value, syncConfig.value ?? undefined)
  preview.value = await datasetService.previewModel(model.value)
  schemaEditing.value = false
  schemaDirty.value = false
  addOperation('更新表结构', '保存字段显示名、语义类型、默认聚合与可见性。')
  setFeedback('表结构已保存，并刷新了数据预览。')
}

function openFieldImpact(field: DatasetField) {
  selectedField.value = field
  fieldImpactName.value = field.displayName
  impactAcknowledged.value = false
  activeModal.value = 'fieldImpact'
}

function requestDeleteField(field: DatasetField) {
  selectedField.value = field
  fieldImpactName.value = field.displayName
  impactAcknowledged.value = false
  activeModal.value = 'fieldImpact'
}

async function confirmDeleteField() {
  if (!selectedField.value || !model.value || !canDeleteSelectedField.value) return
  const removedField = selectedField.value
  model.value.outputFields = model.value.outputFields.filter((field) => field.id !== removedField.id)
  schemaDirty.value = true
  preview.value = await datasetService.previewModel(model.value)
  activeModal.value = null
  addOperation('删除字段', `删除字段：${removedField.displayName}（${removedField.name}）`)
  setFeedback(`字段「${removedField.displayName}」已从输出结构移除，请保存字段配置后生效。`, 'warning')
}

function applyExcelBatch() {
  if (!model.value) return
  const rows = excelText.value
    .split('\n')
    .map((line) => line.split(',').map((item) => item.trim()))
    .filter((items) => items.length >= 2)
  model.value.outputFields = model.value.outputFields.map((field) => {
    const match = rows.find((items) => items[1] === field.name || items[0] === field.displayName)
    if (!match) return field
    return {
      ...field,
      displayName: match[0] || field.displayName,
      description: match[3] || field.description,
    }
  })
  schemaDirty.value = true
  activeModal.value = null
  setFeedback(`已按 Excel 文本批量更新 ${rows.length} 条字段配置。`)
}

async function triggerSync() {
  if (!dataset.value) return
  if (!canRunSync.value) {
    setFeedback(dataset.value.sourceMode === 'direct' ? '直连数据集不生成离线同步任务。' : '当前账号无权运行同步任务。', 'error')
    return
  }
  const task = await datasetService.triggerSync(dataset.value.id)
  syncTasks.value.unshift(task)
  dataset.value = await datasetService.getDataset(dataset.value.id)
  addOperation('手动同步', '提交数据集同步任务。')
  setFeedback('已提交同步任务。')
}

async function rerunTask(task: SyncTask) {
  const nextTask = await datasetService.rerunSyncTask(task.id)
  syncTasks.value = syncTasks.value.map((item) => (item.id === task.id ? nextTask : item))
  addOperation('重跑同步任务', nextTask.taskName)
  setFeedback('已重新运行同步任务。')
}

function openSyncLog(task: SyncTask) {
  selectedTask.value = task
  activeModal.value = 'syncLog'
}

function openSyncTaskDetail(task: SyncTask) {
  selectedTask.value = task
  activeModal.value = 'syncTaskDetail'
}

async function cancelTask(task: SyncTask) {
  const nextTask = await datasetService.cancelSyncTask(task.id)
  syncTasks.value = syncTasks.value.map((item) => (item.id === task.id ? nextTask : item))
  addOperation('取消同步任务', nextTask.taskName)
  setFeedback('同步任务已取消。', 'warning')
}

function submitBatchSync() {
  if (!canRunSync.value) {
    setFeedback('当前数据集不支持批量补数。', 'error')
    return
  }
  activeModal.value = null
  setFeedback('已按当前依赖策略批量补数，任务进入等待队列。')
  addOperation('批量补数', '按 2026-05-15 至 2026-05-22 范围补跑同步。')
}

async function savePermission() {
  if (!dataset.value) return
  if (!permissionForm.value.subjectName.trim()) {
    setFeedback('请输入授权对象。', 'error')
    return
  }
  const selectedPermissions = normalizePermissions(permissionForm.value.permissions)
  if (!selectedPermissions.length) {
    setFeedback('请至少选择一项权限。', 'error')
    return
  }
  const rule: DatasetPermissionRule = {
    id: `perm_${Date.now()}`,
    datasetId: dataset.value.id,
    subjectType: permissionForm.value.subjectType,
    subjectName: permissionForm.value.subjectName.trim(),
    permission: highestPermission(selectedPermissions),
    permissions: selectedPermissions,
    rowRule: permissionForm.value.rowRule || undefined,
    columnRule: permissionForm.value.columnRule || undefined,
  }
  const saved = await datasetService.savePermissionRule(rule)
  permissionRules.value.push(saved)
  activeModal.value = null
  addOperation('新增授权', `${saved.subjectName}：${permissionLabels(saved)}`)
  setFeedback('权限规则已保存。')
}

function copyPermission(rule: DatasetPermissionRule) {
  permissionRules.value.push({ ...rule, id: `perm_copy_${Date.now()}`, subjectName: `${rule.subjectName} 副本` })
  setFeedback('已复制权限规则，可继续调整。')
}

function removePermission(ruleId: string) {
  permissionRules.value = permissionRules.value.filter((rule) => rule.id !== ruleId)
  addOperation('删除授权', ruleId)
  setFeedback('权限规则已删除。')
}

async function updateSensitivityChoice(choice: SensitivityChoice) {
  if (!dataset.value) return
  const nextLevel: DatasetSensitivityLevel = choice === 'sensitive' ? 'sensitive_unmasked' : 'non_sensitive'
  try {
    dataset.value = await datasetService.updateDatasetSensitivity(
      dataset.value.id,
      nextLevel,
      dataset.value.desensitizationVersion ?? 1,
    )
    if (model.value) {
      preview.value = await datasetService.previewModel(model.value)
    }
    addOperation('更新涉敏定级', nextLevel === 'non_sensitive' ? '标记为不涉敏' : '标记为涉敏')
    setFeedback(
      nextLevel === 'non_sensitive'
        ? '已标记为不涉敏，预览和下载将按原始值展示。'
        : '已标记为涉敏，请继续配置脱敏字段和生效范围。',
      nextLevel === 'non_sensitive' ? 'success' : 'warning',
    )
  } catch (error) {
    setFeedback(error instanceof Error ? error.message : '涉敏定级更新失败。', 'error')
  }
}

async function toggleMask(rule: DataMaskRule) {
  if (!dataset.value) return
  try {
    const nextRule = await datasetService.toggleMaskRule(rule.id, dataset.value.desensitizationVersion ?? 1)
    maskRules.value = maskRules.value.map((item) => (item.id === rule.id ? nextRule : item))
    dataset.value = await datasetService.getDataset(dataset.value.id)
    if (model.value) {
      preview.value = await datasetService.previewModel(model.value)
    }
    setFeedback(nextRule.enabled ? '脱敏规则已启用。' : '脱敏规则已停用。')
  } catch (error) {
    setFeedback(error instanceof Error ? error.message : '脱敏规则状态更新失败。', 'error')
  }
}

function openMaskRule(rule?: DataMaskRule) {
  const firstField = model.value?.outputFields[0]
  if (rule) {
    maskForm.value = {
      ruleId: rule.id,
      fieldName: rule.fieldName,
      ruleType: rule.ruleType ?? 'custom_middle',
      method: rule.method,
      replacementChar: rule.ruleConfig?.replacementChar ?? '*',
      keepPrefixLength: rule.ruleConfig?.keepPrefixLength ?? 6,
      keepSuffixLength: rule.ruleConfig?.keepSuffixLength ?? 2,
      keepStartIndex: rule.ruleConfig?.keepStartIndex ?? 1,
      keepEndIndex: rule.ruleConfig?.keepEndIndex ?? 3,
      specialChar: rule.ruleConfig?.specialChar ?? '@',
      fixedReplacement: rule.ruleConfig?.fixedReplacement ?? '***',
      scopeMode: rule.scopeMode ?? 'members_masked_others_unmasked',
      scopeMemberType: rule.scopeMembers?.[0]?.memberType ?? 'team',
      scopeMemberName: '',
      scopeMembers: rule.scopeMembers?.length
        ? [...rule.scopeMembers]
        : [{ memberType: 'team', memberId: 'team_ops', memberName: '运营分析团队' }],
      scenes: rule.scenes?.length ? [...rule.scenes] : ['preview', 'visual_query', 'dashboard', 'download', 'saved_analysis'],
      restrictedCapabilities: rule.restrictedCapabilities?.length
        ? [...rule.restrictedCapabilities]
        : ['alias_bypass', 'calculated_field', 'download_original'],
      example: rule.example || applyMaskToValue(sampleValueForRule(rule), rule),
      enabled: rule.enabled,
    }
  } else {
    maskForm.value = {
      ruleId: '',
      fieldName: firstField?.name ?? 'user_id',
      method: 'partial',
      ruleType: 'custom_middle',
      replacementChar: '*',
      keepPrefixLength: 6,
      keepSuffixLength: 2,
      keepStartIndex: 1,
      keepEndIndex: 3,
      specialChar: '@',
      fixedReplacement: '***',
      scopeMode: 'members_masked_others_unmasked',
      scopeMemberType: 'team',
      scopeMemberName: '运营分析团队',
      scopeMembers: [{ memberType: 'team', memberId: 'team_ops', memberName: '运营分析团队' }],
      scenes: ['preview', 'visual_query', 'dashboard', 'download', 'saved_analysis'],
      restrictedCapabilities: ['alias_bypass', 'calculated_field', 'download_original'],
      example: 'uid_839201 → uid_83****01',
      enabled: true,
    }
  }
  maskPreviewSample.value = sampleValueForRule(maskFormToRule())
  activeModal.value = 'maskRule'
}

async function saveMaskRule() {
  if (!dataset.value) return
  if (!maskForm.value.fieldName) {
    setFeedback('请选择需要脱敏的字段。', 'error')
    return
  }
  if (sensitivityLevel.value === 'non_sensitive') {
    setFeedback('请先将数据集标记为涉敏，再配置脱敏规则。', 'error')
    return
  }
  const rule = maskFormToRule()
  const validationError = datasetService.validateMaskRule(rule, model.value?.outputFields ?? [])
  if (validationError) {
    setFeedback(validationError, 'error')
    return
  }
  const exists = maskRules.value.some((item) => item.id === rule.id)
  try {
    const saved = await datasetService.saveMaskRule(rule, dataset.value.desensitizationVersion ?? 1)
    maskRules.value = exists ? maskRules.value.map((item) => (item.id === saved.id ? saved : item)) : [...maskRules.value, saved]
    dataset.value = await datasetService.getDataset(dataset.value.id)
    if (model.value) {
      preview.value = await datasetService.previewModel(model.value)
    }
    activeModal.value = null
    addOperation(exists ? '更新脱敏规则' : '新增脱敏规则', `${rule.fieldName} · ${maskRuleLabel(rule)}`)
    setFeedback('脱敏规则已保存，并将在预览、查询、看板和下载中生效。')
  } catch (error) {
    setFeedback(error instanceof Error ? error.message : '脱敏规则保存失败。', 'error')
  }
}

function maskFormToRule(): DataMaskRule {
  const field = model.value?.outputFields.find((item) => item.name === maskForm.value.fieldName)
  const draft: DataMaskRule = {
    id:
      maskForm.value.ruleId ||
      maskRules.value.find((item) => item.fieldName === maskForm.value.fieldName)?.id ||
      `mask_${Date.now()}`,
    datasetId: dataset.value?.id ?? '',
    fieldId: field?.id,
    fieldName: maskForm.value.fieldName,
    fieldDisplayName: field?.displayName,
    fieldType: field?.fieldType,
    semanticType: field?.semanticType,
    method: ruleTypeToMethod(maskForm.value.ruleType),
    ruleType: maskForm.value.ruleType,
    ruleConfig: buildMaskRuleConfig(),
    scopeMode: maskForm.value.scopeMode,
    scopeMembers: [...maskForm.value.scopeMembers],
    scenes: [...maskForm.value.scenes],
    restrictedCapabilities: [...maskForm.value.restrictedCapabilities],
    example: '',
    enabled: maskForm.value.enabled,
    createdBy: 'Chaoyang Xu',
    createdAt: '2026-05-23 11:30:00',
    updatedBy: 'Chaoyang Xu',
    updatedAt: '2026-05-23 11:30:00',
  }
  draft.example = `${sampleValueForRule(draft)} → ${applyMaskToValue(sampleValueForRule(draft), draft)}`
  return draft
}

function addMaskScopeMember() {
  const memberName = maskForm.value.scopeMemberName.trim()
  if (!memberName) return
  const member: MaskingScopeMember = {
    memberType: maskForm.value.scopeMemberType,
    memberId: `${maskForm.value.scopeMemberType}_${Date.now()}`,
    memberName,
  }
  maskForm.value.scopeMembers = [...maskForm.value.scopeMembers, member]
  maskForm.value.scopeMemberName = ''
}

function removeMaskScopeMember(memberId: string) {
  maskForm.value.scopeMembers = maskForm.value.scopeMembers.filter((member) => member.memberId !== memberId)
}

function confirmDeleteMaskRule(rule: DataMaskRule) {
  deletingMaskRule.value = rule
  activeModal.value = 'maskDelete'
}

async function deleteMaskRule() {
  if (!deletingMaskRule.value || !dataset.value) return
  try {
    await datasetService.deleteMaskRule(deletingMaskRule.value.id, dataset.value.desensitizationVersion ?? 1)
    maskRules.value = maskRules.value.filter((rule) => rule.id !== deletingMaskRule.value?.id)
    dataset.value = await datasetService.getDataset(dataset.value.id)
    if (model.value) {
      preview.value = await datasetService.previewModel(model.value)
    }
    addOperation('删除脱敏规则', deletingMaskRule.value.fieldName)
    deletingMaskRule.value = null
    activeModal.value = null
    setFeedback('脱敏规则已删除，数据集涉敏状态已重新计算。')
  } catch (error) {
    setFeedback(error instanceof Error ? error.message : '脱敏规则删除失败。', 'error')
  }
}

function simulatePermission() {
  const teamRule = permissionRules.value.find((rule) => rule.subjectType === 'team') ?? permissionRules.value[0]
  const message = teamRule
    ? `已按「${teamRule.subjectName}」模拟查询：资源权限 ${permissionLabels(teamRule)}，行权限 ${teamRule.rowRule ?? '全量'}，列权限 ${teamRule.columnRule ?? '无额外限制'}。`
    : '暂无权限规则，未命中成员默认不可访问该数据集。'
  setFeedback(message, teamRule ? 'success' : 'warning')
}

function saveTransferOwner() {
  if (!dataset.value) return
  dataset.value.owner = ownerForm.value.owner
  activeModal.value = null
  addOperation('转移所有者', `新所有者：${ownerForm.value.owner}`)
  setFeedback('数据集所有者已转移。')
}

function saveTransferAlarm() {
  if (!dataset.value) return
  dataset.value.alarmOwner = alarmForm.value.owner
  activeModal.value = null
  addOperation('转移告警人', `新告警人：${alarmForm.value.owner}`)
  setFeedback('告警人已更新。')
}

function saveReadyConfig() {
  activeModal.value = null
  addOperation('更新数据就绪配置', readyForm.value.expression)
  setFeedback('数据就绪配置已保存。')
}

function saveMirrorConfig() {
  activeModal.value = null
  addOperation('更新跨项目镜像配置', `${mirrorForm.value.targetProject} · ${mirrorForm.value.refreshMode}`)
  setFeedback('跨项目镜像配置已保存。')
}

async function deleteDataset() {
  if (!dataset.value) return
  if (runningSyncTask.value) {
    setFeedback('当前存在运行中的同步任务，请先取消任务再删除数据集。', 'error')
    return
  }
  if (deleteConfirmName.value !== dataset.value.name) {
    setFeedback('请输入完整数据集名称以确认删除。', 'error')
    return
  }
  if (!impactAcknowledged.value) {
    setFeedback('请先确认删除影响。', 'error')
    return
  }
  await datasetService.deleteDataset(dataset.value.id)
  activeModal.value = null
  setFeedback('数据集已移入回收站。')
  await router.push('/metadata/datasets')
}

function handleStatusClick() {
  if (!dataset.value) return
  if (dataset.value.status === 'sync_failed' || dataset.value.status === 'syncing') {
    activeTab.value = 'sync'
    setFeedback('已切换到同步状态，可查看失败原因和任务日志。', dataset.value.status === 'sync_failed' ? 'warning' : 'success')
    return
  }
  if (dataset.value.status === 'deleted' || dataset.value.status === 'disabled') {
    setFeedback('当前数据集不可用，请先恢复或启用后再操作。', 'error')
    return
  }
  if (dataset.value.readonly || dataset.value.sourceMode === 'theme') {
    activeModal.value = 'mirror'
    return
  }
  setFeedback('当前数据集状态正常。')
}

function openVisualQuery() {
  if (!dataset.value || !model.value) return
  if (dataset.value.status === 'deleted' || dataset.value.status === 'disabled') {
    setFeedback('当前数据集不可用，无法进入可视化查询。', 'error')
    return
  }
  if (dataset.value.permission === 'none') {
    setFeedback('当前账号暂无该数据集查询权限。', 'error')
    return
  }
  if (!model.value.outputFields.some((field) => field.visible)) {
    setFeedback('当前数据集暂无可用于分析的字段，请先检查字段配置。', 'error')
    return
  }
  void router.push(dataset.value.defaultVisualQueryUrl || `/data-insight/event-analysis?datasetId=${datasetId.value}`)
}

function openEditor() {
  if (!dataset.value) return
  if (dataset.value.readonly || dataset.value.sourceMode === 'theme') {
    setFeedback('该数据集为系统主题数据集或只读数据集，不支持在当前项目内编辑。', 'error')
    return
  }
  if (runningSyncTask.value) {
    setFeedback('当前存在运行中的同步任务，编辑后可能影响后续同步。已保留运行记录，请谨慎修改。', 'warning')
  }
  void router.push(`/metadata/datasets/create?datasetId=${datasetId.value}`)
}

function openLineageImpact(node?: DatasetLineageNode) {
  selectedLineageNode.value = node ?? null
  activeModal.value = 'lineageImpact'
}

function viewLineageDetail() {
  activeModal.value = null
  activeTab.value = 'lineage'
  setFeedback('已切换到血缘视图，并高亮当前数据集下游影响范围。', 'warning')
}

function notifyLineageOwners() {
  activeModal.value = null
  setFeedback('已生成血缘影响通知草稿。')
}

function refreshPreview() {
  if (!model.value) return
  void datasetService.previewModel(model.value).then((result) => {
    preview.value = result
    setFeedback('预览数据已刷新。')
  })
}

function applyPreviewFilter() {
  activeModal.value = null
  setFeedback(`已添加临时预览筛选：${previewFilterForm.value.fieldName || '字段'} ${previewFilterForm.value.operator} ${previewFilterForm.value.value}。`)
}

function addOperation(action: string, detail: string) {
  operationLogs.value.unshift({
    id: `op_${Date.now()}`,
    operator: 'Chaoyang Xu',
    action,
    detail,
    createdAt: '2026-05-23 11:30:00',
  })
}

function formatCount(value: number): string {
  return value.toLocaleString('zh-CN')
}

function formatSize(value: number): string {
  if (value >= 1024 * 1024 * 1024) return `${(value / 1024 / 1024 / 1024).toFixed(1)} GB`
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`
  if (value >= 1024) return `${(value / 1024).toFixed(0)} KB`
  return `${value} B`
}

function formatDuration(value?: number): string {
  if (!value) return '-'
  if (value < 60) return `${value} 秒`
  return `${Math.floor(value / 60)} 分 ${value % 60} 秒`
}

function statusLabel(status: Dataset['status']): string {
  const map: Record<Dataset['status'], string> = {
    draft: '草稿',
    editing: '编辑中',
    validating: '校验中',
    saved: '已保存',
    syncing: '同步中',
    sync_success: '同步成功',
    sync_failed: '同步失败',
    disabled: '已停用',
    deleted: '回收站',
  }
  return map[status]
}

function statusType(status: Dataset['status']): TagProps['type'] {
  if (status === 'sync_success' || status === 'saved') return 'success'
  if (status === 'sync_failed' || status === 'deleted') return 'error'
  if (status === 'syncing' || status === 'validating') return 'warning'
  return 'default'
}

function syncTaskStatusLabel(status: SyncTaskStatus): string {
  const map: Record<SyncTaskStatus, string> = {
    created: '已创建',
    waiting: '等待中',
    running: '运行中',
    success: '成功',
    failed: '失败',
    canceled: '已取消',
  }
  return map[status]
}

function syncStatusType(status: SyncTaskStatus): TagProps['type'] {
  if (status === 'success') return 'success'
  if (status === 'failed' || status === 'canceled') return 'error'
  if (status === 'running' || status === 'waiting') return 'warning'
  return 'default'
}

function permissionLabel(permission: DatasetPermission): string {
  const map: Record<DatasetPermission, string> = {
    none: '无权限',
    read_preview: '预览',
    view: '查看',
    edit: '编辑',
    admin: '管理',
  }
  return map[permission]
}

function permissionLabels(rule: DatasetPermissionRule): string {
  const permissions = normalizePermissions(rule.permissions?.length ? rule.permissions : [rule.permission])
  return permissions.map(permissionLabel).join('、')
}

function normalizePermissions(permissions: DatasetPermission[]): DatasetPermission[] {
  const order: DatasetPermission[] = ['read_preview', 'view', 'edit', 'admin']
  const selected = new Set<DatasetPermission>(permissions.filter((permission) => permission !== 'none'))
  return order.filter((permission) => selected.has(permission))
}

function highestPermission(permissions: DatasetPermission[]): DatasetPermission {
  const normalized = normalizePermissions(permissions)
  return normalized.at(-1) ?? 'none'
}

function subjectTypeLabel(type: DatasetPermissionRule['subjectType']): string {
  return type === 'user' ? '成员' : type === 'team' ? '团队' : '角色'
}

function semanticLabel(value?: SemanticType): string {
  if (!value) return '未识别'
  return String(semanticOptions.find((option) => option.value === value)?.label ?? value)
}

function aggregationLabel(value: DatasetField['aggregation']): string {
  return String(aggregationOptions.find((option) => option.value === value)?.label ?? value)
}

function maskMethodLabel(value: MaskMethod): string {
  const map: Record<MaskMethod, string> = {
    none: '不脱敏',
    hash: '哈希',
    partial: '部分隐藏',
    rounding: '数值取整',
    replace: '固定替换',
  }
  return map[value]
}

function fieldTypeLabel(value?: FieldType): string {
  return value ?? 'unknown'
}

function maskRuleLabel(rule: DataMaskRule): string {
  return String(maskRuleOptions.find((option) => option.value === rule.ruleType)?.label ?? maskMethodLabel(rule.method))
}

function maskFieldLabel(rule: DataMaskRule): string {
  return rule.fieldDisplayName ? `${rule.fieldDisplayName}` : rule.fieldName
}

function maskFieldExists(rule: DataMaskRule): boolean {
  return Boolean(model.value?.outputFields.some((field) => field.name === rule.fieldName || field.id === rule.fieldId))
}

function maskRuleConfigSummary(rule: DataMaskRule): string {
  const config = rule.ruleConfig
  if (!config) return '使用默认遮盖参数'
  if (rule.ruleType === 'custom_middle') {
    return `保留前 ${config.keepPrefixLength ?? 0} 位、后 ${config.keepSuffixLength ?? 0} 位`
  }
  if (rule.ruleType === 'custom_head_tail') {
    return `保留第 ${config.keepStartIndex ?? 1} 到 ${config.keepEndIndex ?? 1} 位`
  }
  if (rule.ruleType === 'custom_before_special_char') {
    return `遮盖 ${config.specialChar ?? '@'} 前内容`
  }
  if (rule.ruleType === 'custom_after_special_char') {
    return `遮盖 ${config.specialChar ?? '@'} 后内容`
  }
  return `替换符 ${config.replacementChar || '*'}`
}

function maskScopeLabel(rule: DataMaskRule): string {
  const members = rule.scopeMembers?.map((member) => member.memberName).join('、') || '未配置成员'
  const mode =
    rule.scopeMode === 'members_unmasked_others_masked'
      ? '命中成员看原值，其他成员看脱敏值'
      : '命中成员看脱敏值，其他成员看原值'
  return `${mode}：${members}`
}

function maskSceneSummary(rule: DataMaskRule): string {
  const scenes = rule.scenes?.length ? rule.scenes : ['preview', 'visual_query']
  return scenes
    .map((scene) => String(maskSceneOptions.find((option) => option.value === scene)?.label ?? scene))
    .join('、')
}

function maskRestrictedSummary(rule: DataMaskRule): string {
  const capabilities = rule.restrictedCapabilities ?? []
  if (!capabilities.length) return '未限制'
  return capabilities
    .map((capability) => String(maskRestrictedOptions.find((option) => option.value === capability)?.label ?? capability))
    .join('、')
}

function isMaskRuleComplete(rule: DataMaskRule): boolean {
  return datasetService.isMaskRuleComplete(rule, model.value?.outputFields ?? [])
}

function ruleTypeToMethod(ruleType: MaskingRuleType): MaskMethod {
  if (ruleType === 'preset_full_mask') return 'replace'
  if (ruleType === 'preset_name' || ruleType === 'preset_email' || ruleType === 'preset_contact') return 'partial'
  if (ruleType === 'preset_china_id_general' || ruleType === 'preset_china_citizen_id') return 'partial'
  return 'partial'
}

function buildMaskRuleConfig(): MaskingRuleConfig {
  return {
    replacementChar: maskForm.value.replacementChar || '*',
    keepPrefixLength: maskForm.value.keepPrefixLength,
    keepSuffixLength: maskForm.value.keepSuffixLength,
    keepStartIndex: maskForm.value.keepStartIndex,
    keepEndIndex: maskForm.value.keepEndIndex,
    specialChar: maskForm.value.specialChar || '@',
    fixedReplacement: maskForm.value.fixedReplacement || '***',
  }
}

function sampleValueForRule(rule: DataMaskRule): string {
  if (rule.example?.includes('→')) {
    return rule.example.split('→')[0]?.trim() ?? maskPreviewSample.value
  }
  if (rule.fieldType === 'decimal' || rule.fieldType === 'number') return '68.42'
  if (rule.fieldType === 'integer') return '839201'
  if (rule.fieldType === 'json') return '{"phone":"13800138000","reason":"金币扣减异常"}'
  if (rule.fieldName.includes('email')) return 'chaoyang.xu@example.com'
  if (rule.fieldName.includes('phone')) return '13800138000'
  if (rule.fieldName.includes('id')) return 'uid_839201'
  if (rule.fieldName.includes('coin')) return '低金币'
  return maskPreviewSample.value || 'sensitive_value'
}

function maskRepeated(value: string, replacementChar: string): string {
  return replacementChar.repeat(value.length)
}

function applyMaskToValue(value: string, rule: Pick<DataMaskRule, 'method' | 'ruleType' | 'ruleConfig'>): string {
  if (rule.method === 'none') return String(value)
  return String(datasetService.maskDatasetValue(value, rule) ?? '')
}

function impactTypeLabel(type: ImpactItem['type']): string {
  return type === 'dashboard' ? '看板' : type === 'analysis' ? '保存分析' : type === 'sync' ? '同步链路' : '权限规则'
}

function riskType(risk: ImpactItem['risk']): TagProps['type'] {
  return risk === 'high' ? 'error' : risk === 'medium' ? 'warning' : 'success'
}

function riskLabel(risk: ImpactItem['risk']): string {
  return risk === 'high' ? '高风险' : risk === 'medium' ? '中风险' : '低风险'
}

function lineageResourceTypeLabel(type: LineageImpactResource['resourceType']): string {
  const map: Record<LineageImpactResource['resourceType'], string> = {
    dashboard: '看板',
    chart: '图表',
    dataset: '数据集',
    analysis: '保存分析',
    monitor: '监控订阅',
  }
  return map[type]
}

watch(
  () => route.params.datasetId,
  () => {
    void loadDetail()
  },
)

watch(
  () => route.query.tab,
  (tab) => {
    activeTab.value = normalizeDetailTab(tab)
  },
)

watch(activeTab, (tab) => {
  void router.replace({ query: { ...route.query, tab } })
})

onMounted(() => {
  void loadDetail()
})
</script>

<template>
  <div class="dataset-detail-page">
    <div class="page-header">
      <div>
        <n-button text class="back-button" @click="router.push('/metadata/datasets')">返回列表</n-button>
        <h1>{{ dataset?.name ?? '数据集详情' }}</h1>
        <p>{{ dataset?.description ?? '加载数据集的结构、同步、权限、血缘与访问情况。' }}</p>
      </div>
      <n-space>
        <n-button :disabled="!canManage" @click="openModal('permission')">权限分配</n-button>
        <n-button :disabled="!dataset" @click="openVisualQuery">可视化查询</n-button>
        <n-button :disabled="!canEdit" @click="openEditor">编辑</n-button>
        <n-dropdown trigger="click" :options="moreOptions" @select="handleMoreSelect">
          <n-button :disabled="!dataset">更多</n-button>
        </n-dropdown>
      </n-space>
    </div>

    <n-alert :type="feedbackType" closable class="feedback-alert">
      {{ feedback }}
    </n-alert>

    <n-card v-if="dataset" :bordered="false" class="summary-card">
      <div class="summary-title">
        <div>
          <n-tag :type="statusType(dataset.status)" class="clickable-tag" @click="handleStatusClick">
            {{ statusLabel(dataset.status) }}
          </n-tag>
        </div>
        <span>更新时间：{{ dataset.updatedAt }}</span>
      </div>
      <div class="stat-grid">
        <div>
          <span>所有者</span>
          <strong>{{ dataset.owner }}</strong>
        </div>
        <div>
          <span>告警人</span>
          <strong>{{ dataset.alarmOwner ?? '未配置' }}</strong>
        </div>
        <div>
          <span>最近同步</span>
          <strong>{{ dataset.lastSyncAt ?? '无同步' }}</strong>
        </div>
        <div>
          <span>数据量</span>
          <strong>{{ formatCount(dataset.rowCount) }} 行</strong>
        </div>
        <div>
          <span>字段数</span>
          <strong>{{ dataset.fieldCount }}</strong>
        </div>
        <div>
          <span>数据大小</span>
          <strong>{{ formatSize(dataset.dataSizeBytes ?? 0) }}</strong>
        </div>
      </div>
    </n-card>

    <n-card v-if="!dataset && !loading" :bordered="false">
      <n-empty description="未找到该数据集，请返回列表重新选择。" />
    </n-card>

    <n-tabs v-if="dataset" v-model:value="activeTab" type="line" animated class="detail-tabs">
      <n-tab-pane name="preview" tab="数据预览">
        <n-card :bordered="false">
          <div class="tab-toolbar">
            <div>
              <h2>数据预览</h2>
              <p>支持字段搜索、临时筛选、分页和刷新预览数据。</p>
            </div>
            <n-space>
              <n-input v-model:value="previewFieldKeyword" clearable placeholder="搜索字段" />
              <n-button @click="openModal('previewFilter')">临时筛选</n-button>
              <n-button :loading="loading" @click="refreshPreview">刷新预览</n-button>
            </n-space>
          </div>
          <n-alert v-if="preview?.warning" type="warning" class="inline-alert">
            {{ preview.warning }}
          </n-alert>
          <n-data-table
            :columns="previewColumns"
            :data="pagedPreviewRows"
            :loading="loading"
            :row-key="(row) => row.__key"
            :scroll-x="Math.max(900, visiblePreviewFields.length * 150)"
            :max-height="430"
          />
          <div class="pagination-row">
            <span>样本量：{{ preview?.sampleSize ?? 0 }} 行</span>
            <n-pagination
              v-model:page="previewPage"
              v-model:page-size="previewPageSize"
              :item-count="previewRows.length"
              :page-sizes="[10, 20, 50]"
              show-size-picker
            />
          </div>
        </n-card>
      </n-tab-pane>

      <n-tab-pane name="schema" tab="表结构">
        <n-card :bordered="false">
          <div class="tab-toolbar">
            <div>
              <h2>表结构</h2>
              <p>管理字段显示名、语义类型、默认聚合、可见性和字段影响。</p>
            </div>
            <n-space>
              <n-input v-model:value="schemaKeyword" clearable placeholder="搜索字段名 / 描述 / 语义" />
              <n-button @click="openModal('excel')">Excel 批量修改</n-button>
              <n-button v-if="!schemaEditing" :disabled="!canEdit" type="primary" @click="schemaEditing = true">编辑字段</n-button>
              <template v-else>
                <n-button @click="schemaEditing = false">取消</n-button>
                <n-button type="primary" @click="saveSchema">保存字段</n-button>
              </template>
            </n-space>
          </div>
          <n-alert v-if="schemaDirty" type="warning" class="inline-alert">
            字段配置已修改但尚未保存。字段删除、改名或语义变更会影响下游看板、保存分析、权限规则和同步链路。
          </n-alert>
          <n-data-table
            :columns="schemaColumns"
            :data="filteredFields"
            :row-key="(row) => row.id"
            :scroll-x="1180"
            :max-height="520"
          />
        </n-card>
      </n-tab-pane>

      <n-tab-pane name="sync" tab="同步状态">
        <n-card :bordered="false">
          <div class="tab-toolbar">
            <div>
              <h2>同步状态</h2>
              <p>查看同步配置、任务记录、失败原因，并支持手动同步和批量补数。</p>
            </div>
            <n-space>
              <n-button @click="openModal('ready')">数据就绪配置</n-button>
              <n-button :disabled="!canRunSync" @click="openModal('syncBatch')">批量补数</n-button>
              <n-button :disabled="!canRunSync" type="primary" @click="triggerSync">立即同步</n-button>
            </n-space>
          </div>
          <div class="stat-grid compact">
            <div>
              <span>成功任务</span>
              <strong>{{ syncSummary.success }}</strong>
            </div>
            <div>
              <span>失败任务</span>
              <strong>{{ syncSummary.failed }}</strong>
            </div>
            <div>
              <span>运行中</span>
              <strong>{{ syncSummary.running }}</strong>
            </div>
            <div>
              <span>成功率</span>
              <strong>{{ syncSummary.successRate }}%</strong>
            </div>
          </div>
          <n-alert v-if="dataset.sourceMode === 'direct'" type="info" class="inline-alert">
            当前数据集为直连模式，不生成离线同步任务；查询会直接访问源连接，数据就绪策略仅用于看板刷新提示。
          </n-alert>
          <n-alert v-else-if="runningSyncTask" type="warning" class="inline-alert">
            当前存在运行中的同步任务「{{ runningSyncTask.taskName }}」，编辑模型或删除数据集前需先等待完成或取消任务。
          </n-alert>
          <div class="sync-config-grid">
            <div>
              <span>同步方式</span>
              <strong>{{ dataset.sourceMode === 'direct' ? '直连实时查询' : syncConfig?.scheduleText ?? '未配置' }}</strong>
            </div>
            <div>
              <span>依赖策略</span>
              <strong>{{ syncConfig?.dependencyStrategy ?? 'none' }}</strong>
            </div>
            <div>
              <span>失败告警</span>
              <strong>{{ syncConfig?.alertOnFailure ? '开启' : '关闭' }}</strong>
            </div>
            <div>
              <span>超时</span>
              <strong>{{ syncConfig?.performance.timeoutMinutes ?? 0 }} 分钟</strong>
            </div>
            <div>
              <span>下次运行</span>
              <strong>{{ syncSummary.nextRunAt }}</strong>
            </div>
          </div>
          <n-data-table
            :columns="syncTaskColumns"
            :data="syncTasks"
            :row-key="(row) => row.id"
            :scroll-x="1000"
            :max-height="420"
          />
        </n-card>
      </n-tab-pane>

      <n-tab-pane name="model" tab="模型信息">
        <n-card :bordered="false">
          <div class="tab-toolbar">
            <div>
              <h2>模型信息</h2>
              <p>展示数据来源、Join / Union 关系、模型后置筛选和输出字段。</p>
            </div>
            <n-button :disabled="!canEdit" @click="router.push(`/metadata/datasets/create?datasetId=${datasetId}`)">
              打开模型编辑器
            </n-button>
          </div>
          <div class="model-grid">
            <div v-for="node in model?.nodes" :key="node.id" class="model-node-card">
              <strong>{{ node.alias }}</strong>
              <span>{{ node.connectionName ?? '自定义节点' }} · {{ node.databaseName ?? '-' }} / {{ node.tableName ?? '-' }}</span>
              <div>{{ node.selectedFields.length }} 个字段 · {{ node.preFilters.length }} 个前置筛选</div>
            </div>
          </div>
          <div class="relation-list">
            <div v-for="edge in model?.edges" :key="edge.id">
              <n-tag :type="edge.relationType === 'join' ? 'success' : 'info'">{{ edge.relationType.toUpperCase() }}</n-tag>
              <span>{{ edge.joinConfig?.expression || edge.unionConfig?.unionType || '未配置关系' }}</span>
            </div>
          </div>
          <h3>输出字段</h3>
          <div class="field-chip-list">
            <n-tag v-for="field in model?.outputFields" :key="field.id" round>
              {{ field.displayName }}
            </n-tag>
          </div>
        </n-card>
      </n-tab-pane>

      <n-tab-pane name="lineage" tab="血缘视图">
        <n-card :bordered="false">
          <div class="tab-toolbar">
            <div>
              <h2>血缘视图</h2>
              <p>按上下游方向和层级查看数据集影响范围。</p>
            </div>
            <n-space>
              <n-select v-model:value="lineageDirection" :options="[
                { label: '全部血缘', value: 'all' },
                { label: '仅上游', value: 'upstream' },
                { label: '仅下游', value: 'downstream' },
              ]" />
              <n-input-number v-model:value="lineageDepth" :min="1" :max="5" />
              <n-button @click="setFeedback('血缘图已导出为 PNG。')">导出血缘图</n-button>
            </n-space>
          </div>
          <div class="stat-grid compact">
            <div>
              <span>下游图表</span>
              <strong>{{ lineageStats.chartCount }}</strong>
            </div>
            <div>
              <span>下游看板</span>
              <strong>{{ lineageStats.dashboardCount }}</strong>
            </div>
            <div>
              <span>下游数据集</span>
              <strong>{{ lineageStats.datasetCount }}</strong>
            </div>
            <div>
              <span>近 30 日访问</span>
              <strong>{{ formatCount(lineageStats.visitCount) }}</strong>
            </div>
          </div>
          <div class="lineage-board">
            <div
              v-for="node in lineageNodes.filter((item) => lineageDirection === 'all' || item.level === lineageDirection || item.level === 'current')"
              :key="node.id"
              :class="['lineage-node', node.level, { selected: selectedLineageNode?.id === node.id }]"
              @click="selectedLineageNode = node"
            >
              <strong>{{ node.name }}</strong>
              <span>{{ node.nodeType }} · {{ node.level }}</span>
            </div>
          </div>
          <div class="lineage-impact-panel">
            <div>
              <h3>选中节点</h3>
              <p v-if="selectedLineageNode">
                {{ selectedLineageNode.name }} · {{ selectedLineageNode.nodeType }} · {{ selectedLineageNode.level }}
              </p>
              <p v-else class="muted">点击血缘节点后，可查看节点负责人、风险和下游影响。</p>
            </div>
            <n-button :disabled="!selectedLineageNode" @click="openLineageImpact(selectedLineageNode ?? undefined)">查看影响清单</n-button>
          </div>
          <h3>下游影响资源</h3>
          <div class="impact-list compact-list">
            <div v-for="item in lineageImpactResources" :key="item.id">
              <n-tag :type="riskType(item.risk)">{{ riskLabel(item.risk) }}</n-tag>
              <strong>{{ lineageResourceTypeLabel(item.resourceType) }} · {{ item.name }}</strong>
              <span>{{ item.owner }} · 近 30 日访问 {{ formatCount(item.visitCount) }} 次</span>
            </div>
          </div>
          <div class="relation-list">
            <div v-for="edge in lineageEdges" :key="edge.id">
              <span>{{ edge.source }}</span>
              <strong>→ {{ edge.relation }} →</strong>
              <span>{{ edge.target }}</span>
            </div>
          </div>
        </n-card>
      </n-tab-pane>

      <n-tab-pane name="permission" tab="数据权限">
        <n-card :bordered="false">
          <div class="tab-toolbar">
            <div>
              <h2>数据权限</h2>
              <p>管理资源权限、行权限、列权限和字段脱敏规则。</p>
            </div>
            <n-button :disabled="!canManage" type="primary" @click="openModal('permission')">新增授权</n-button>
          </div>
          <div class="stat-grid compact">
            <div>
              <span>资源授权</span>
              <strong>{{ permissionSummary.resourceRuleCount }}</strong>
            </div>
            <div>
              <span>行权限</span>
              <strong>{{ permissionSummary.rowRuleCount }}</strong>
            </div>
            <div>
              <span>列权限</span>
              <strong>{{ permissionSummary.columnRuleCount }}</strong>
            </div>
            <div>
              <span>字段脱敏</span>
              <strong>{{ permissionSummary.maskRuleCount }}</strong>
            </div>
          </div>
          <n-alert type="info" class="inline-alert">
            {{ permissionSummary.unmatchedPolicy }}权限会同时作用于预览、可视化查询、看板刷新和保存分析重新查询。
          </n-alert>
          <div class="section-title-row">
            <h3>资源授权与行列权限</h3>
            <n-button @click="simulatePermission">模拟校验</n-button>
          </div>
          <n-data-table
            :columns="permissionColumns"
            :data="permissionRules"
            :row-key="(row) => row.id"
            :scroll-x="960"
          />
          <section class="masking-panel">
            <div class="masking-status">
              <div>
                <h3>字段脱敏</h3>
                <p>按字段配置脱敏规则和生效范围，统一作用于预览、可视化查询、看板、下载和保存分析重查。</p>
              </div>
              <n-tag :type="maskStatus.type">{{ maskStatus.text }}</n-tag>
            </div>
            <n-alert :type="maskStatus.type" class="inline-alert">
              {{ maskStatus.detail }}
            </n-alert>
            <div class="sensitivity-actions">
              <div>
                <strong>涉敏定级</strong>
                <span>当前状态：{{ maskStatus.text }}，版本 v{{ dataset?.desensitizationVersion ?? 1 }}</span>
              </div>
              <n-space>
                <n-button
                  size="small"
                  :disabled="!canEdit || sensitivityLevel !== 'unclassified'"
                  @click="updateSensitivityChoice('sensitive')"
                >
                  标记为涉敏
                </n-button>
                <n-button
                  size="small"
                  :disabled="!canEdit || sensitivityLevel !== 'unclassified'"
                  @click="updateSensitivityChoice('non_sensitive')"
                >
                  标记为不涉敏
                </n-button>
                <n-button
                  v-if="sensitivityLevel === 'non_sensitive'"
                  size="small"
                  type="warning"
                  :disabled="!canEdit"
                  @click="updateSensitivityChoice('sensitive')"
                >
                  改为涉敏
                </n-button>
                <n-button
                  v-if="sensitivityLevel !== 'non_sensitive' && sensitivityLevel !== 'unclassified'"
                  size="small"
                  :disabled="!canEdit"
                  @click="updateSensitivityChoice('non_sensitive')"
                >
                  改为不涉敏
                </n-button>
              </n-space>
            </div>
            <div class="section-title-row">
              <h3>脱敏字段配置</h3>
              <n-space>
                <n-button type="primary" :disabled="!canEditMasking" @click="openMaskRule()">
                  新增脱敏规则
                </n-button>
              </n-space>
            </div>
            <n-alert v-if="sensitivityLevel === 'non_sensitive'" type="info" class="inline-alert">
              当前数据集标记为非涉敏，不需要配置字段脱敏。如后续发现敏感字段，请先切换为涉敏级别。
            </n-alert>
            <n-data-table :columns="maskColumns" :data="maskRules" :row-key="(row) => row.id" :scroll-x="1320" />
            <div class="section-title-row">
              <div>
                <h3>预览效果</h3>
                <p class="muted">用于确认同一字段在不同规则、不同场景下的最终展示值。</p>
              </div>
              <n-input v-model:value="maskPreviewSample" clearable placeholder="输入样例值" class="mask-preview-input" />
            </div>
            <div class="mask-preview-grid">
              <div v-for="row in maskPreviewRows" :key="row.fieldName" class="mask-preview-card">
                <span>{{ row.fieldName }}</span>
                <strong>{{ row.maskedValue }}</strong>
                <p>{{ row.originalValue }} · {{ row.rule }}</p>
              </div>
            </div>
            <n-alert type="warning" class="inline-alert">
              字段别名、分组聚合、格式化、计算字段和下载原值会继承字段脱敏限制，避免通过二次加工绕过脱敏。
            </n-alert>
          </section>
        </n-card>
      </n-tab-pane>

      <n-tab-pane name="stats" tab="访问统计">
        <n-card :bordered="false">
          <div class="tab-toolbar">
            <div>
              <h2>访问统计</h2>
              <p>查看近期访问、扫描行数和使用模块，辅助治理低价值数据集。</p>
            </div>
            <n-button @click="setFeedback('访问统计报表已导出。')">导出统计</n-button>
          </div>
          <div class="stat-grid compact">
            <div>
              <span>近 7 日访问</span>
              <strong>{{ accessLogs.length * 42 }}</strong>
            </div>
            <div>
              <span>访问成员</span>
              <strong>{{ new Set(accessLogs.map((item) => item.user)).size }}</strong>
            </div>
            <div>
              <span>下游资产</span>
              <strong>{{ impacts.length }}</strong>
            </div>
            <div>
              <span>扫描行数</span>
              <strong>{{ formatCount(accessLogs.reduce((sum, item) => sum + item.rows, 0)) }}</strong>
            </div>
          </div>
          <n-data-table :columns="accessColumns" :data="accessLogs" :row-key="(row) => row.id" />
        </n-card>
      </n-tab-pane>

      <n-tab-pane name="logs" tab="操作日志">
        <n-card :bordered="false">
          <div class="tab-toolbar">
            <div>
              <h2>操作日志</h2>
              <p>记录基础信息、表结构、权限、同步和删除等关键操作。</p>
            </div>
            <n-button @click="setFeedback('操作日志已导出。')">导出日志</n-button>
          </div>
          <n-data-table :columns="operationColumns" :data="operationLogs" :row-key="(row) => row.id" />
        </n-card>
      </n-tab-pane>
    </n-tabs>

    <n-modal :show="activeModal === 'permission'" preset="card" title="权限分配" class="dataset-modal" @update:show="closeModal">
      <div class="modal-form">
        <label>授权对象类型</label>
        <n-select v-model:value="permissionForm.subjectType" :options="[
          { label: '成员', value: 'user' },
          { label: '团队', value: 'team' },
          { label: '角色', value: 'role' },
        ]" />
        <label>授权对象</label>
        <n-input v-model:value="permissionForm.subjectName" placeholder="输入成员、团队或角色名称" />
        <label>权限</label>
        <n-select
          v-model:value="permissionForm.permissions"
          multiple
          filterable
          :max-tag-count="3"
          :options="permissionLevelOptions"
          placeholder="可同时选择预览、查看、编辑、管理"
        />
        <label>行权限</label>
        <n-input v-model:value="permissionForm.rowRule" placeholder="例如 coin_balance_level = '低金币'" />
        <label>列权限</label>
        <n-input v-model:value="permissionForm.columnRule" placeholder="例如 隐藏 user_id 明文" />
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="activeModal = null">取消</n-button>
          <n-button type="primary" @click="savePermission">保存授权</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal :show="activeModal === 'excel'" preset="card" title="Excel 批量修改字段" class="dataset-modal wide" @update:show="closeModal">
      <p class="muted">一行一个字段：显示名, 字段名, 类型, 描述。Demo 会按字段名匹配并更新显示名和描述。</p>
      <n-input v-model:value="excelText" type="textarea" :rows="8" />
      <template #footer>
        <n-space justify="end">
          <n-button @click="activeModal = null">取消</n-button>
          <n-button type="primary" @click="applyExcelBatch">应用修改</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal :show="activeModal === 'fieldImpact'" preset="card" title="字段变更影响分析" class="dataset-modal wide" @update:show="closeModal">
      <n-alert :type="fieldBlockers.length ? 'error' : 'warning'">
        字段「{{ fieldImpactName }}」会影响下游查询、权限规则和同步链路。{{ fieldBlockers.length ? '当前存在阻断项，暂不能删除。' : '确认影响后可删除，保存字段配置后生效。' }}
      </n-alert>
      <div class="impact-summary-grid">
        <div>
          <span>影响资源</span>
          <strong>{{ impactedResourcesForSelectedField.length }}</strong>
        </div>
        <div>
          <span>高风险</span>
          <strong>{{ impactedResourcesForSelectedField.filter((item) => item.risk === 'high').length }}</strong>
        </div>
        <div>
          <span>阻断项</span>
          <strong>{{ fieldBlockers.length }}</strong>
        </div>
      </div>
      <div v-if="fieldBlockers.length" class="blocker-list">
        <strong>阻断规则</strong>
        <p v-for="item in fieldBlockers" :key="item">{{ item }}</p>
      </div>
      <div class="impact-list">
        <div v-for="item in impactedResourcesForSelectedField" :key="item.id">
          <n-tag :type="riskType(item.risk)">{{ riskLabel(item.risk) }}</n-tag>
          <div>
            <strong>{{ impactTypeLabel(item.type) }} · {{ item.name }}</strong>
            <span>{{ item.owner }} · {{ item.resourcePath ?? '无路径' }} · 最近访问 {{ item.lastVisitedAt ?? '-' }}</span>
            <p v-if="item.blockedReason" class="muted">{{ item.blockedReason }}</p>
          </div>
        </div>
      </div>
      <n-checkbox v-model:checked="impactAcknowledged">
        我已确认字段变更影响，并知道保存后下游资产会按新结构重新查询。
      </n-checkbox>
      <template #footer>
        <n-space justify="end">
          <n-button @click="viewLineageDetail">查看血缘详情</n-button>
          <n-button @click="activeModal = null">关闭</n-button>
          <n-button
            type="error"
            :disabled="!impactAcknowledged || !canDeleteSelectedField"
            @click="confirmDeleteField"
          >
            删除字段
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal :show="activeModal === 'deleteImpact'" preset="card" title="删除数据集影响确认" class="dataset-modal wide" @update:show="closeModal">
      <n-alert type="error">删除后会移入回收站，下游看板、保存分析和同步链路可能不可用。</n-alert>
      <n-alert v-if="runningSyncTask" type="warning" class="inline-alert">
        当前存在运行中的同步任务「{{ runningSyncTask.taskName }}」，需先取消或等待完成后再删除。
      </n-alert>
      <div class="impact-list">
        <div v-for="item in impacts" :key="item.id">
          <n-tag :type="riskType(item.risk)">{{ riskLabel(item.risk) }}</n-tag>
          <div>
            <strong>{{ item.name }}</strong>
            <span>{{ impactTypeLabel(item.type) }} · {{ item.owner }} · {{ item.resourcePath ?? '无路径' }}</span>
          </div>
        </div>
      </div>
      <div class="modal-form confirm-form">
        <label>确认名称</label>
        <n-input v-model:value="deleteConfirmName" :placeholder="`请输入：${dataset?.name ?? ''}`" />
      </div>
      <n-checkbox v-model:checked="impactAcknowledged">
        我已确认删除影响，知道下游看板、保存分析、监控订阅和同步链路可能不可用。
      </n-checkbox>
      <template #footer>
        <n-space justify="end">
          <n-button @click="activeModal = null">取消</n-button>
          <n-button
            type="error"
            :disabled="!impactAcknowledged || deleteConfirmName !== dataset?.name || Boolean(runningSyncTask)"
            @click="deleteDataset"
          >
            确认删除
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal :show="activeModal === 'transferOwner'" preset="card" title="转移所有者" class="dataset-modal" @update:show="closeModal">
      <div class="modal-form">
        <label>新所有者</label>
        <n-input v-model:value="ownerForm.owner" placeholder="请输入成员名称" />
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="activeModal = null">取消</n-button>
          <n-button type="primary" @click="saveTransferOwner">确认转移</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal :show="activeModal === 'transferAlarm'" preset="card" title="转移告警人" class="dataset-modal" @update:show="closeModal">
      <div class="modal-form">
        <label>新告警人</label>
        <n-input v-model:value="alarmForm.owner" placeholder="请输入成员或团队" />
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="activeModal = null">取消</n-button>
          <n-button type="primary" @click="saveTransferAlarm">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal :show="activeModal === 'ready'" preset="card" title="数据就绪配置" class="dataset-modal" @update:show="closeModal">
      <div class="modal-form">
        <label>启用</label>
        <n-switch v-model:value="readyForm.enabled" />
        <label>就绪表达式</label>
        <n-input v-model:value="readyForm.expression" />
        <label>等待超时</label>
        <n-input-number v-model:value="readyForm.timeoutMinutes" :min="5" :max="240" />
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="activeModal = null">取消</n-button>
          <n-button type="primary" @click="saveReadyConfig">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal :show="activeModal === 'mirror'" preset="card" title="跨项目镜像配置" class="dataset-modal" @update:show="closeModal">
      <div class="modal-form">
        <label>启用镜像</label>
        <n-switch v-model:value="mirrorForm.enabled" />
        <label>目标项目</label>
        <n-input v-model:value="mirrorForm.targetProject" />
        <label>刷新方式</label>
        <n-select v-model:value="mirrorForm.refreshMode" :options="[
          { label: '跟随源数据集同步', value: '跟随源数据集同步' },
          { label: '每日 9 点刷新', value: '每日 9 点刷新' },
          { label: '手动刷新', value: '手动刷新' },
        ]" />
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="activeModal = null">取消</n-button>
          <n-button type="primary" @click="saveMirrorConfig">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal :show="activeModal === 'syncLog'" preset="card" title="同步日志" class="dataset-modal wide" @update:show="closeModal">
      <div class="log-box">
        <p v-for="line in selectedTask?.logLines" :key="line">{{ line }}</p>
      </div>
      <n-alert v-if="selectedTask?.errorMessage" type="error">{{ selectedTask.errorMessage }}</n-alert>
    </n-modal>

    <n-modal :show="activeModal === 'syncTaskDetail'" preset="card" title="同步任务详情" class="dataset-modal wide" @update:show="closeModal">
      <div v-if="selectedTask" class="task-detail">
        <div class="impact-summary-grid">
          <div>
            <span>任务状态</span>
            <strong>{{ syncTaskStatusLabel(selectedTask.status) }}</strong>
          </div>
          <div>
            <span>产出行数</span>
            <strong>{{ formatCount(selectedTask.rowCount ?? 0) }}</strong>
          </div>
          <div>
            <span>耗时</span>
            <strong>{{ formatDuration(selectedTask.durationSeconds) }}</strong>
          </div>
        </div>
        <h3>运行步骤</h3>
        <div class="step-list">
          <div v-for="step in selectedTaskSteps" :key="step.id">
            <n-tag :type="syncStatusType(step.status)">{{ syncTaskStatusLabel(step.status) }}</n-tag>
            <div>
              <strong>{{ step.stage }}</strong>
              <span>{{ step.startedAt }} · {{ formatDuration(step.durationSeconds) }} · {{ formatCount(step.rowCount) }} 行</span>
              <p>{{ step.message }}</p>
            </div>
          </div>
        </div>
        <h3>质量检查</h3>
        <div class="step-list">
          <div v-for="check in selectedTaskQualityChecks" :key="check.id">
            <n-tag :type="check.status === 'passed' ? 'success' : check.status === 'warning' ? 'warning' : 'error'">
              {{ check.status === 'passed' ? '通过' : check.status === 'warning' ? '预警' : '失败' }}
            </n-tag>
            <div>
              <strong>{{ check.name }}</strong>
              <p>{{ check.detail }}</p>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="activeModal = null">关闭</n-button>
          <n-button v-if="selectedTask" @click="openSyncLog(selectedTask)">查看日志</n-button>
          <n-button
            v-if="selectedTask"
            type="primary"
            :disabled="selectedTask.status === 'running'"
            @click="rerunTask(selectedTask)"
          >
            重新运行
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal :show="activeModal === 'syncBatch'" preset="card" title="批量补数" class="dataset-modal" @update:show="closeModal">
      <p class="muted">将按当前同步配置补跑最近 7 天分区，保留历史任务记录。</p>
      <template #footer>
        <n-space justify="end">
          <n-button @click="activeModal = null">取消</n-button>
          <n-button type="primary" @click="submitBatchSync">提交补数</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal :show="activeModal === 'lineageImpact'" preset="card" title="血缘影响清单" class="dataset-modal wide" @update:show="closeModal">
      <n-alert type="warning">
        当前数据集变更会影响下游看板、保存分析、监控订阅和派生数据集。发布前建议通知负责人并确认刷新窗口。
      </n-alert>
      <div class="impact-list">
        <div v-for="item in lineageImpactResources" :key="item.id">
          <n-tag :type="riskType(item.risk)">{{ riskLabel(item.risk) }}</n-tag>
          <div>
            <strong>{{ lineageResourceTypeLabel(item.resourceType) }} · {{ item.name }}</strong>
            <span>{{ item.owner }} · 近 30 日访问 {{ formatCount(item.visitCount) }} 次</span>
            <p class="muted">{{ item.description }}</p>
          </div>
        </div>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="activeModal = null">关闭</n-button>
          <n-button @click="notifyLineageOwners">生成通知</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal :show="activeModal === 'maskRule'" preset="card" title="字段脱敏规则" class="dataset-modal wide" @update:show="closeModal">
      <div class="modal-form">
        <label>字段</label>
        <n-select
          v-model:value="maskForm.fieldName"
          filterable
          :options="maskFieldOptions"
        />
        <label>规则类型</label>
        <n-select v-model:value="maskForm.ruleType" :options="maskRuleOptions" />
        <label>替换符</label>
        <n-input v-model:value="maskForm.replacementChar" maxlength="1" />
        <template v-if="maskForm.ruleType === 'custom_middle'">
          <label>保留位数</label>
          <div class="rule-config-grid">
            <n-input-number v-model:value="maskForm.keepPrefixLength" :min="0" :max="20" placeholder="前缀" />
            <n-input-number v-model:value="maskForm.keepSuffixLength" :min="0" :max="20" placeholder="后缀" />
          </div>
        </template>
        <template v-if="maskForm.ruleType === 'custom_head_tail'">
          <label>保留区间（从 1 开始）</label>
          <div class="rule-config-grid">
            <n-input-number v-model:value="maskForm.keepStartIndex" :min="1" :max="80" placeholder="起始位次" />
            <n-input-number v-model:value="maskForm.keepEndIndex" :min="1" :max="80" placeholder="结束位次" />
          </div>
        </template>
        <template v-if="maskForm.ruleType === 'custom_before_special_char' || maskForm.ruleType === 'custom_after_special_char'">
          <label>特殊字符</label>
          <n-input v-model:value="maskForm.specialChar" maxlength="3" placeholder="例如 @" />
        </template>
        <template v-if="maskForm.ruleType === 'preset_full_mask'">
          <label>固定替换</label>
          <n-input v-model:value="maskForm.fixedReplacement" placeholder="例如 ***" />
        </template>
        <label>生效范围</label>
        <n-select v-model:value="maskForm.scopeMode" :options="maskScopeOptions" />
        <label>成员范围</label>
        <div class="mask-scope-editor">
          <div class="rule-config-grid three">
            <n-select v-model:value="maskForm.scopeMemberType" :options="maskScopeMemberTypeOptions" />
            <n-input v-model:value="maskForm.scopeMemberName" placeholder="输入成员、团队或角色" />
            <n-button @click="addMaskScopeMember">添加</n-button>
          </div>
          <div class="mask-member-list">
            <n-tag
              v-for="member in maskForm.scopeMembers"
              :key="member.memberId"
              closable
              @close="removeMaskScopeMember(member.memberId)"
            >
              {{ member.memberName }}
            </n-tag>
          </div>
        </div>
        <label>应用场景</label>
        <n-select
          v-model:value="maskForm.scenes"
          multiple
          filterable
          :max-tag-count="3"
          :options="maskSceneOptions"
        />
        <label>防绕过限制</label>
        <n-select
          v-model:value="maskForm.restrictedCapabilities"
          multiple
          filterable
          :max-tag-count="3"
          :options="maskRestrictedOptions"
        />
        <label>启用</label>
        <n-switch v-model:value="maskForm.enabled" />
      </div>
      <div class="mask-modal-preview">
        <div>
          <span>原始值</span>
          <strong>{{ maskFormPreview.original }}</strong>
        </div>
        <div>
          <span>脱敏后</span>
          <strong>{{ maskFormPreview.masked }}</strong>
        </div>
      </div>
      <n-alert type="info" class="inline-alert">
        规则保存后会作用于数据预览、可视化查询、看板刷新、下载导出和保存分析重新查询；具备原值权限的成员仍会进入审计记录。
      </n-alert>
      <template #footer>
        <n-space justify="end">
          <n-button @click="activeModal = null">取消</n-button>
          <n-button type="primary" @click="saveMaskRule">保存脱敏</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal :show="activeModal === 'maskDelete'" preset="card" title="删除脱敏规则" class="dataset-modal compact" @update:show="closeModal">
      <n-alert type="warning" class="inline-alert">
        删除后，该字段在预览、查询、看板和下载场景将不再按此规则脱敏，请确认不会造成敏感数据暴露。
      </n-alert>
      <p>
        字段：
        <strong>{{ deletingMaskRule ? maskFieldLabel(deletingMaskRule) : '-' }}</strong>
      </p>
      <template #footer>
        <n-space justify="end">
          <n-button @click="activeModal = null">取消</n-button>
          <n-button type="error" @click="deleteMaskRule">确认删除</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal :show="activeModal === 'previewFilter'" preset="card" title="预览临时筛选" class="dataset-modal" @update:show="closeModal">
      <div class="modal-form">
        <label>字段</label>
        <n-select
          v-model:value="previewFilterForm.fieldName"
          :options="(preview?.fields ?? []).map((field) => ({ label: field.displayName, value: field.name }))"
        />
        <label>操作符</label>
        <n-select v-model:value="previewFilterForm.operator" :options="[
          { label: '等于', value: 'equals' },
          { label: '包含', value: 'contains' },
          { label: '不为空', value: 'is_not_null' },
        ]" />
        <label>值</label>
        <n-input v-model:value="previewFilterForm.value" />
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="activeModal = null">取消</n-button>
          <n-button type="primary" @click="applyPreviewFilter">应用筛选</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<style scoped>
.dataset-detail-page {
  padding: 24px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 16px;
}

.back-button {
  margin-bottom: 8px;
}

.page-header h1 {
  margin: 0;
  font-size: 28px;
}

.page-header p,
.tab-toolbar p,
.muted {
  color: #667085;
}

.feedback-alert,
.summary-card,
.detail-tabs {
  margin-bottom: 16px;
}

.summary-title,
.tab-toolbar,
.pagination-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.summary-title > div,
.field-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.stat-grid.compact {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-bottom: 16px;
}

.stat-grid div,
.sync-config-grid div,
.model-node-card,
.impact-summary-grid div {
  padding: 16px;
  border-radius: 8px;
  background: #f8fafc;
}

.stat-grid span,
.sync-config-grid span,
.model-node-card span,
.impact-summary-grid span {
  display: block;
  color: #667085;
  font-size: 13px;
  margin-bottom: 8px;
}

.stat-grid strong {
  font-size: 20px;
}

.inline-alert {
  margin-bottom: 12px;
}

.clickable-tag {
  cursor: pointer;
}

.sync-config-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.model-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.relation-list,
.impact-list {
  display: grid;
  gap: 10px;
  margin: 16px 0;
}

.relation-list div,
.impact-list div {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 1px solid #eaecf0;
  border-radius: 8px;
}

.impact-list div > div {
  display: grid;
  gap: 4px;
  padding: 0;
  border: 0;
}

.compact-list {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.section-title-row,
.lineage-impact-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 18px 0 12px;
}

.impact-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 14px 0;
}

.impact-summary-grid strong {
  font-size: 20px;
}

.blocker-list {
  display: grid;
  gap: 6px;
  margin: 14px 0;
  padding: 14px;
  border: 1px solid #fecdca;
  border-radius: 8px;
  background: #fffbfa;
}

.blocker-list p {
  margin: 0;
  color: #b42318;
}

.lineage-board {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  min-height: 220px;
  padding: 18px;
  border: 1px dashed #d0d5dd;
  border-radius: 8px;
  background-image:
    linear-gradient(#eaecf0 1px, transparent 1px),
    linear-gradient(90deg, #eaecf0 1px, transparent 1px);
  background-size: 32px 32px;
}

.lineage-node {
  align-self: center;
  padding: 14px;
  border: 1px solid #d0d5dd;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.lineage-node:hover,
.lineage-node.selected {
  border-color: #17b26a;
  box-shadow: 0 8px 24px rgba(16, 24, 40, 0.08);
  transform: translateY(-1px);
}

.lineage-node.current {
  border-color: #17b26a;
  background: #ecfdf3;
}

.lineage-node.downstream {
  border-color: #84caff;
  background: #eff8ff;
}

.lineage-node span {
  display: block;
  margin-top: 8px;
  color: #667085;
}

.number-cell {
  color: #099250;
  font-weight: 700;
}

.modal-form {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
}

.modal-form label {
  color: #344054;
  font-weight: 700;
}

.confirm-form {
  margin: 14px 0;
}

.task-detail {
  display: grid;
  gap: 14px;
}

.step-list {
  display: grid;
  gap: 10px;
}

.step-list > div {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  gap: 12px;
  padding: 12px;
  border: 1px solid #eaecf0;
  border-radius: 8px;
}

.step-list span {
  display: block;
  margin-top: 4px;
  color: #667085;
}

.step-list p {
  margin: 6px 0 0;
  color: #475467;
}

.dataset-modal {
  width: 560px;
}

.dataset-modal.wide {
  width: 760px;
}

.dataset-modal.compact {
  width: 480px;
}

.field-name-cell,
.mask-scope-editor,
.mask-preview-card,
.mask-field-item > div {
  display: grid;
  gap: 4px;
}

.field-name-cell span,
.mask-field-item span,
.mask-preview-card span {
  color: #667085;
  font-size: 13px;
}

.masking-panel {
  display: grid;
  gap: 14px;
  margin-top: 22px;
}

.masking-status {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.sensitivity-actions {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}

.sensitivity-actions > div:first-child {
  display: grid;
  gap: 4px;
}

.sensitivity-actions span {
  color: #64748b;
  font-size: 12px;
}

.masking-status h3,
.masking-status p {
  margin: 0;
}

.masking-status p {
  margin-top: 6px;
  color: #667085;
}

.mask-preview-input {
  width: 260px;
}

.mask-preview-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.mask-preview-card,
.mask-modal-preview > div {
  padding: 14px;
  border: 1px solid #eaecf0;
  border-radius: 8px;
  background: #f8fafc;
}

.mask-preview-card strong,
.mask-modal-preview strong {
  overflow-wrap: anywhere;
}

.mask-preview-card p {
  margin: 0;
  color: #667085;
}

.rule-config-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.rule-config-grid.three {
  grid-template-columns: 120px minmax(0, 1fr) 88px;
}

.mask-member-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mask-modal-preview {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 16px 0;
}

.mask-modal-preview span {
  display: block;
  margin-bottom: 8px;
  color: #667085;
}

.mask-field-list {
  display: grid;
  gap: 10px;
  max-height: 420px;
  overflow: auto;
  margin-top: 14px;
}

.mask-field-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid #eaecf0;
  border-radius: 8px;
  background: #fff;
}

.mask-field-item:hover {
  border-color: #17b26a;
  background: #f6fef9;
}

.mask-field-item.disabled {
  background: #f8fafc;
  opacity: 0.78;
}

.log-box {
  max-height: 360px;
  overflow: auto;
  padding: 14px;
  border-radius: 8px;
  background: #101828;
  color: #ecfdf3;
}

.log-box p {
  margin: 0 0 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

@media (max-width: 1440px) {
  .stat-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .model-grid,
  .sync-config-grid,
  .lineage-board,
  .compact-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .page-header,
  .tab-toolbar {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
