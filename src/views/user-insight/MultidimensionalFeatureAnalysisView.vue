<script setup lang="ts">
import {
  AddOutline,
  ArrowBackOutline,
  CreateOutline,
  EllipsisHorizontalOutline,
  PlayOutline,
  RefreshOutline,
  SaveOutline,
  SearchOutline,
  ShareSocialOutline,
  Star,
  StarOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import {
  NAlert,
  NButton,
  NCard,
  NCheckbox,
  NDataTable,
  NDescriptions,
  NDescriptionsItem,
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
  NRadio,
  NRadioButton,
  NRadioGroup,
  NSelect,
  NSpace,
  NSpin,
  NStatistic,
  NTag,
  NTooltip,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, DropdownOption, SelectOption, TagProps } from 'naive-ui'
import { computed, h, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  multiDimExportTypeLabels,
  multiDimNegativeTypeLabels,
  multidimensionalFeatureAnalysisService,
  multiDimReportStatusLabels,
  multiDimReportStatusTagTypes,
} from '@/services/multidimensionalFeatureAnalysisService'
import type { EntityId } from '@/types/common'
import type {
  MultiDimComboRelation,
  MultiDimCreateReportPayload,
  MultiDimEstimateSegmentPayload,
  MultiDimExportType,
  MultiDimFeatureCombo,
  MultiDimFeatureComboFilters,
  MultiDimPrincipalType,
  MultiDimReport,
  MultiDimReportPermission,
  MultiDimReportSearchFilters,
  MultiDimReportStatus,
  MultiDimSaveSegmentPayload,
  MultiDimTagOption,
  MultiDimWorkbenchData,
} from '@/types/multidimensionalFeatureAnalysis'
import type { ProfileSubjectType } from '@/types/profile'

type PageMode = 'list' | 'new' | 'edit' | 'detail'
type PrincipalSelectValue = `${MultiDimPrincipalType}:${EntityId}`

const route = useRoute()
const router = useRouter()
const message = useMessage()

const loading = ref(false)
const tableLoading = ref(false)
const actionLoading = ref(false)
const workbench = ref<MultiDimWorkbenchData>()
const reportRows = ref<MultiDimReport[]>([])
const reportTotal = ref(0)
const currentReport = ref<MultiDimReport>()
const pollingTimer = ref<number>()

const filters = ref<MultiDimReportSearchFilters>({
  keyword: '',
  createdByMe: false,
  favoriteByMe: false,
  sharedToMe: false,
  statuses: [],
  subjectTypes: [],
  page: 1,
  pageSize: 10,
})

const draft = ref<MultiDimCreateReportPayload>({
  name: '',
  subjectType: 'user',
  positiveSegmentId: '',
  negativeType: 'population_random',
  negativeSourceSegmentId: '',
  labelSelectionMode: 'system_recommend',
  selectedTagIds: [],
  comboValueCount: 3,
  authObjects: [],
})
const draftDirty = ref(false)
const leaveConfirmVisible = ref(false)
const pendingLeaveAction = ref<(() => void) | null>(null)
const subjectConfirmVisible = ref(false)
const pendingSubjectType = ref<ProfileSubjectType>()
const customTagKeyword = ref('')
const activeTagDirectory = ref('all')

const permissionModalVisible = ref(false)
const permissionTarget = ref<MultiDimReport>()
const permissionDraft = ref<MultiDimReportPermission[]>([])
const permissionPrincipalValues = ref<PrincipalSelectValue[]>([])

const deleteModalVisible = ref(false)
const deleteTarget = ref<MultiDimReport>()
const failureModalVisible = ref(false)
const failureTarget = ref<MultiDimReport>()
const recalculateModalVisible = ref(false)
const recalculateTarget = ref<MultiDimReport>()
const tagModalVisible = ref(false)
const featureFilterModalVisible = ref(false)
const comboDetailVisible = ref(false)
const comboDetailTarget = ref<MultiDimFeatureCombo>()
const interpretationCollapsed = ref(false)

const selectedComboIds = ref<EntityId[]>([])
const comboPage = ref(1)
const comboPageSize = ref(20)
const comboFilters = ref<MultiDimFeatureComboFilters>({
  scoreMin: null,
  scoreMax: null,
  precisionMin: null,
  precisionMax: null,
  recallMin: null,
  recallMax: null,
  positiveCountMin: null,
  positiveCountMax: null,
  expandedCountMin: null,
  expandedCountMax: null,
  tagNames: [],
  valueKeyword: '',
})

const saveSegmentVisible = ref(false)
const saveSuccessVisible = ref(false)
const savedSegmentId = ref<EntityId>()
const saveEstimateLoading = ref(false)
const saveEstimate = ref<{ ok: boolean; count: number; message: string }>()
const saveDraft = ref<Omit<MultiDimSaveSegmentPayload, 'reportId' | 'selectedComboIds'>>({
  exportType: 'expanded_population',
  comboRelation: 'any',
  outputIdType: 'oneid',
  segmentName: '',
  description: '',
  authObjects: [],
  groupIds: ['group-growth'],
})
const savePrincipalValues = ref<PrincipalSelectValue[]>([])
const saveSelectedComboIds = ref<EntityId[]>([])
const saveSubmitDisabled = computed(() =>
  saveEstimateLoading.value ||
  !saveEstimate.value?.ok ||
  !saveDraft.value.segmentName.trim() ||
  saveSelectedComboIds.value.length === 0,
)

const pageMode = computed<PageMode>(() => String(route.meta.multiDimPage ?? 'list') as PageMode)
const permissions = computed(() => workbench.value?.permissions)
const hasAnyReport = computed(() => (workbench.value?.reports ?? []).length > 0)
const listIsIntro = computed(() => pageMode.value === 'list' && !hasAnyReport.value && !filters.value.keyword && !filters.value.createdByMe && !filters.value.favoriteByMe && !filters.value.sharedToMe)
const hasAnyAvailableSegment = computed(() =>
  (workbench.value?.segments ?? []).some((segment) => segment.permission && segment.status === 'available' && segment.count > 0),
)
const hasAnyAvailableTag = computed(() =>
  (workbench.value?.tags ?? []).some((tag) => tag.permission && tag.status === 'available'),
)
const createPrerequisiteError = computed(() => {
  if (pageMode.value !== 'new') return ''
  if (!permissions.value?.mutateReport) return '暂无创建多维特征分析报告权限'
  if (!subjectOptions.value.length) return '当前项目暂无可分析主体'
  if (!hasAnyAvailableSegment.value) return '当前暂无可用分群，请先创建或申请分群权限'
  if (!hasAnyAvailableTag.value) return '当前暂无可参与分析的标签，请联系管理员配置标签权限'
  return ''
})
const canSubmitReport = computed(() => {
  if (pageMode.value === 'new') return !createPrerequisiteError.value
  return Boolean(currentReport.value?.runtimePermission.canMutate && currentReport.value.status !== 'calculating')
})

const subjectOptions = computed<SelectOption[]>(() =>
  (workbench.value?.subjects ?? [])
    .filter((subject) => subject.permission)
    .map((subject) => ({ label: subject.name, value: subject.type, description: subject.description })),
)

const currentSubject = computed(() => workbench.value?.subjects.find((subject) => subject.type === draft.value.subjectType))
const usableSegments = computed(() =>
  (workbench.value?.segments ?? []).filter((segment) => segment.subjectType === draft.value.subjectType && segment.permission && segment.status !== 'deleted'),
)
const segmentOptions = computed<SelectOption[]>(() =>
  usableSegments.value.map((segment) => ({
    label: `${segment.name} / ${segment.count.toLocaleString()} 人`,
    value: segment.id,
    disabled: segment.status !== 'available' || segment.count <= 0,
  })),
)
const positiveSegment = computed(() => workbench.value?.segments.find((segment) => segment.id === draft.value.positiveSegmentId))
const negativeSegment = computed(() => workbench.value?.segments.find((segment) => segment.id === draft.value.negativeSourceSegmentId))
const overlapTip = computed(() => {
  if (!positiveSegment.value || !negativeSegment.value || draft.value.negativeType === 'population_random') return ''
  const overlap = Math.min(Math.round(positiveSegment.value.count * 0.12), Math.round(negativeSegment.value.count * 0.35))
  if (draft.value.negativeType === 'custom_segment') return `正负样本预计存在 ${overlap.toLocaleString()} 个重叠用户，系统将从负样本中自动剔除后计算。`
  return `指定分群抽样前会先排除约 ${overlap.toLocaleString()} 个正样本用户。`
})

const subjectTags = computed(() => (workbench.value?.tags ?? []).filter((tag) => tag.subjectType === draft.value.subjectType))
const recommendedTags = computed(() =>
  subjectTags.value.filter((tag) => tag.sourceType === 'system_recommend' && tag.permission && tag.status === 'available').slice(0, 200),
)
const selectedTags = computed(() => subjectTags.value.filter((tag) => draft.value.selectedTagIds.includes(tag.id)))
const customTagDirectoryOptions = computed(() => {
  const directories = [...new Set(subjectTags.value.map((tag) => tag.directory))]
  return [
    {
      directory: 'all',
      label: '全部标签',
      count: subjectTags.value.length,
      selectedCount: selectedTags.value.length,
    },
    ...directories.map((directory) => {
      const rows = subjectTags.value.filter((tag) => tag.directory === directory)
      return {
        directory,
        label: directory,
        count: rows.length,
        selectedCount: rows.filter((tag) => draft.value.selectedTagIds.includes(tag.id)).length,
      }
    }),
  ]
})
const filteredCustomTags = computed(() => {
  const keyword = customTagKeyword.value.trim().toLowerCase()
  return subjectTags.value.filter((tag) => {
    const directoryMatch = activeTagDirectory.value === 'all' || tag.directory === activeTagDirectory.value
    const keywordMatch =
      !keyword ||
      [tag.name, tag.directory, tag.tagType, tag.recommendReason, tag.values.join(' ')].some((item) => item.toLowerCase().includes(keyword))
    return directoryMatch && keywordMatch
  })
})
const customTagGroups = computed(() => {
  const groups = new Map<string, MultiDimTagOption[]>()
  filteredCustomTags.value.forEach((tag) => {
    const rows = groups.get(tag.directory) ?? []
    rows.push(tag)
    groups.set(tag.directory, rows)
  })
  return [...groups.entries()].map(([directory, rows]) => ({
    directory,
    rows,
    availableCount: rows.filter((tag) => tag.permission && tag.status === 'available').length,
    selectedCount: rows.filter((tag) => draft.value.selectedTagIds.includes(tag.id)).length,
  }))
})

const principalOptions = computed<SelectOption[]>(() =>
  (workbench.value?.principals ?? []).map((principal) => ({
    label: `${principal.name} / ${principal.department}`,
    value: `${principal.type}:${principal.id}` satisfies PrincipalSelectValue,
  })),
)
const reportStatusOptions = computed<SelectOption[]>(() =>
  (['calculating', 'success', 'failed', 'deleted', 'invalid'] as MultiDimReportStatus[]).map((status) => ({ label: multiDimReportStatusLabels[status], value: status })),
)
const reportSubjectFilterOptions = computed(() => subjectOptions.value)
const segmentGroupOptions = computed<SelectOption[]>(() => (workbench.value?.segmentGroups ?? []).map((group) => ({ label: group.name, value: group.id })))
const currentOutputIdOptions = computed<SelectOption[]>(() => {
  const type = currentReport.value?.subjectType ?? draft.value.subjectType
  return (workbench.value?.subjects.find((subject) => subject.type === type)?.idTypes ?? []).map((item) => ({ label: item.label, value: item.id }))
})

const tagModalRows = computed(() => currentReport.value?.labels ?? [])
const topCombo = computed(() => {
  const report = currentReport.value
  if (!report?.featureCombos.length) return undefined
  return report.featureCombos.find((combo) => combo.id === report.interpretation?.topComboId) ?? report.featureCombos[0]
})
const comboTagNameOptions = computed<SelectOption[]>(() => {
  const names = new Set<string>()
  currentReport.value?.featureCombos.forEach((combo) => combo.comboItems.forEach((item) => names.add(item.tagName)))
  return [...names].map((name) => ({ label: name, value: name }))
})
const filteredCombos = computed(() => multidimensionalFeatureAnalysisService.filterFeatureCombos(currentReport.value?.featureCombos ?? [], comboFilters.value))
const pagedCombos = computed(() => filteredCombos.value.slice((comboPage.value - 1) * comboPageSize.value, comboPage.value * comboPageSize.value))
const invisibleSelectedCount = computed(() => selectedComboIds.value.filter((id) => !filteredCombos.value.some((combo) => combo.id === id)).length)

function icon(iconComponent: unknown) {
  return () => h(NIcon, null, { default: () => h(iconComponent as never) })
}

function formatDate(value?: string): string {
  if (!value) return '--'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function comboText(combo: MultiDimFeatureCombo): string {
  return combo.comboItems.map((item) => `${item.tagName}=${item.tagValue}`).join(' AND ')
}

function comboItemText(combo: MultiDimFeatureCombo, index: number): string {
  const item = combo.comboItems[index]
  return item ? `${item.tagName} = ${item.tagValue}` : '--'
}

function comboCanSaveSegment(combo: MultiDimFeatureCombo): boolean {
  return combo.comboItems.every((item) => item.permission && !item.invalid)
}

function canEditReport(report: MultiDimReport): boolean {
  return report.runtimePermission.canMutate && report.status !== 'calculating'
}

function canRecalculateReport(report: MultiDimReport): boolean {
  return report.runtimePermission.canMutate && report.status !== 'calculating' && report.status !== 'deleted'
}

function reportActionOptions(report: MultiDimReport): DropdownOption[] {
  const options: DropdownOption[] = []
  if (canEditReport(report)) options.push({ label: '编辑', key: 'edit' })
  if (report.runtimePermission.canAuthorize) options.push({ label: '权限管理', key: 'permission' })
  if (report.status === 'failed') options.push({ label: '失败原因', key: 'failure' })
  if (report.runtimePermission.canDelete) options.push({ label: '删除', key: 'delete' })
  return options.length ? options : [{ label: '暂无更多操作', key: 'none', disabled: true }]
}

function handleReportAction(key: string | number, report: MultiDimReport): void {
  if (key === 'edit') {
    void router.push(`/user-insight/multidim-features/${report.id}/edit`)
    return
  }
  if (key === 'permission') {
    openPermissionModal(report)
    return
  }
  if (key === 'failure') {
    openFailureModal(report)
    return
  }
  if (key === 'delete') {
    deleteTarget.value = report
    deleteModalVisible.value = true
  }
}

function statusTagType(status: MultiDimReportStatus): TagProps['type'] {
  return multiDimReportStatusTagTypes[status]
}

function parsePrincipal(value: PrincipalSelectValue) {
  const [type, id] = value.split(':') as [MultiDimPrincipalType, EntityId]
  const principal = workbench.value?.principals.find((item) => item.type === type && item.id === id)
  return principal ? { type, id, name: principal.name } : undefined
}

function syncDraftAuth(values: PrincipalSelectValue[]): void {
  draft.value.authObjects = values.map(parsePrincipal).filter(Boolean) as MultiDimCreateReportPayload['authObjects']
  draftDirty.value = true
}

function syncSaveAuth(values: PrincipalSelectValue[]): void {
  saveDraft.value.authObjects = values.map(parsePrincipal).filter(Boolean) as MultiDimSaveSegmentPayload['authObjects']
}

function tagSelectable(tag: MultiDimTagOption): boolean {
  return tag.permission && tag.status === 'available'
}

function tagUnavailableReason(tag: MultiDimTagOption): string {
  if (!tag.permission) return '无权限'
  if (tag.status === 'data_not_ready') return '数据未就绪'
  if (tag.status !== 'available') return '已失效'
  return ''
}

function setCustomTagSelected(tag: MultiDimTagOption, checked: boolean): void {
  if (!tagSelectable(tag)) return
  const current = new Set(draft.value.selectedTagIds)
  if (checked) {
    if (current.has(tag.id)) return
    if (current.size >= 200) {
      message.warning('最多可选择200个标签参与分析。')
      return
    }
    current.add(tag.id)
  } else {
    current.delete(tag.id)
  }
  draft.value.selectedTagIds = [...current]
  draftDirty.value = true
}

function selectCustomTagGroup(directory: string): void {
  const current = new Set(draft.value.selectedTagIds)
  const rows = filteredCustomTags.value.filter((tag) => tag.directory === directory && tagSelectable(tag))
  let overflow = false
  rows.forEach((tag) => {
    if (current.has(tag.id)) return
    if (current.size >= 200) {
      overflow = true
      return
    }
    current.add(tag.id)
  })
  draft.value.selectedTagIds = [...current]
  draftDirty.value = true
  if (overflow) message.warning('最多可选择200个标签参与分析。')
}

function clearCustomTagGroup(directory: string): void {
  const rows = new Set(filteredCustomTags.value.filter((tag) => tag.directory === directory).map((tag) => tag.id))
  draft.value.selectedTagIds = draft.value.selectedTagIds.filter((id) => !rows.has(id))
  draftDirty.value = true
}

function clearCustomTagSelection(): void {
  draft.value.selectedTagIds = []
  draftDirty.value = true
}

function resetCustomTagFilters(): void {
  customTagKeyword.value = ''
  activeTagDirectory.value = 'all'
}

function defaultFilters(): MultiDimFeatureComboFilters {
  return {
    scoreMin: null,
    scoreMax: null,
    precisionMin: null,
    precisionMax: null,
    recallMin: null,
    recallMax: null,
    positiveCountMin: null,
    positiveCountMax: null,
    expandedCountMin: null,
    expandedCountMax: null,
    tagNames: [],
    valueKeyword: '',
  }
}

function resetReportFilters(): void {
  filters.value.keyword = ''
  filters.value.createdByMe = false
  filters.value.favoriteByMe = false
  filters.value.sharedToMe = false
  filters.value.statuses = []
  filters.value.subjectTypes = []
  filters.value.page = 1
  void searchReports()
}

function submitReportSearch(): void {
  filters.value.page = 1
  void searchReports()
}

async function loadWorkbench(): Promise<void> {
  workbench.value = await multidimensionalFeatureAnalysisService.getWorkbenchData()
}

async function searchReports(): Promise<void> {
  tableLoading.value = true
  try {
    const result = await multidimensionalFeatureAnalysisService.searchReports(filters.value)
    reportRows.value = result.rows
    reportTotal.value = result.total
  } finally {
    tableLoading.value = false
  }
}

async function loadReport(reportId: EntityId, enablePolling = true): Promise<void> {
  loading.value = true
  try {
    currentReport.value = await multidimensionalFeatureAnalysisService.getReport(reportId)
    selectedComboIds.value = []
    comboFilters.value = defaultFilters()
    comboPage.value = 1
    if (enablePolling) setupPolling()
    else if (pollingTimer.value) {
      window.clearInterval(pollingTimer.value)
      pollingTimer.value = undefined
    }
  } finally {
    loading.value = false
  }
}

async function refreshPage(): Promise<void> {
  loading.value = true
  try {
    await loadWorkbench()
    if (pageMode.value === 'list') await searchReports()
    if (pageMode.value === 'new') resetDraft()
    if (pageMode.value === 'edit' && typeof route.params.reportId === 'string') {
      await loadReport(route.params.reportId, false)
      if (!currentReport.value) {
        message.error('报告不存在、已删除或暂无查看权限。')
        await router.replace('/user-insight/multidim-features')
        return
      }
      if (currentReport.value && !currentReport.value.runtimePermission.canMutate) {
        message.error('暂无编辑该报告的权限。')
        await router.replace(`/user-insight/multidim-features/${currentReport.value.id}`)
        return
      }
      if (currentReport.value) populateDraftFromReport(currentReport.value)
    }
    if (pageMode.value === 'detail' && typeof route.params.reportId === 'string') await loadReport(route.params.reportId)
  } finally {
    loading.value = false
  }
}

function resetDraft(): void {
  const defaultSubject = (subjectOptions.value[0]?.value as ProfileSubjectType | undefined) ?? 'user'
  draft.value = {
    name: '',
    subjectType: defaultSubject,
    positiveSegmentId: '',
    negativeType: 'population_random',
    negativeSourceSegmentId: '',
    labelSelectionMode: 'system_recommend',
    selectedTagIds: [],
    comboValueCount: 3,
    authObjects: [],
  }
  permissionPrincipalValues.value = []
  applyRecommendedTags()
  draftDirty.value = false
}

function populateDraftFromReport(report: MultiDimReport): void {
  const authObjects = report.permissions.map((permission) => ({
    type: permission.authType,
    id: permission.authId,
    name: permission.authName,
  }))
  draft.value = {
    name: report.name,
    subjectType: report.subjectType,
    positiveSegmentId: report.positiveSegmentId,
    negativeType: report.negativeType,
    negativeSourceSegmentId: report.negativeType === 'population_random' ? '' : report.negativeSourceSegmentId ?? '',
    labelSelectionMode: report.labels.some((label) => label.sourceType === 'custom') ? 'custom' : 'system_recommend',
    selectedTagIds: report.labels.map((label) => label.tagId),
    comboValueCount: report.comboValueCount,
    authObjects,
  }
  permissionPrincipalValues.value = authObjects.map((item) => `${item.type}:${item.id}` as PrincipalSelectValue)
  draftDirty.value = false
}

function applyRecommendedTags(): void {
  if (draft.value.labelSelectionMode !== 'system_recommend') return
  draft.value.selectedTagIds = recommendedTags.value.map((tag) => tag.id).slice(0, 200)
}

function handleSubjectSelect(next: ProfileSubjectType): void {
  const hasConfig = Boolean(draft.value.positiveSegmentId || draft.value.negativeSourceSegmentId || draft.value.selectedTagIds.length)
  if (hasConfig && next !== draft.value.subjectType) {
    pendingSubjectType.value = next
    subjectConfirmVisible.value = true
    return
  }
  applySubject(next)
}

function applySubject(next: ProfileSubjectType): void {
  draft.value.subjectType = next
  draft.value.positiveSegmentId = ''
  draft.value.negativeSourceSegmentId = ''
  customTagKeyword.value = ''
  activeTagDirectory.value = 'all'
  if (draft.value.labelSelectionMode === 'system_recommend') applyRecommendedTags()
  else draft.value.selectedTagIds = []
  draftDirty.value = true
  subjectConfirmVisible.value = false
}

function confirmSubjectChange(): void {
  if (pendingSubjectType.value) applySubject(pendingSubjectType.value)
}

function tryLeave(action: () => void): void {
  if (!draftDirty.value) {
    action()
    return
  }
  pendingLeaveAction.value = action
  leaveConfirmVisible.value = true
}

function confirmLeave(): void {
  leaveConfirmVisible.value = false
  draftDirty.value = false
  pendingLeaveAction.value?.()
  pendingLeaveAction.value = null
}

async function submitReport(): Promise<void> {
  if (!canSubmitReport.value) {
    message.warning(createPrerequisiteError.value || '当前报告正在计算中，暂不支持编辑保存')
    return
  }
  actionLoading.value = true
  try {
    const result =
      pageMode.value === 'edit' && typeof route.params.reportId === 'string'
        ? await multidimensionalFeatureAnalysisService.updateReport(route.params.reportId, draft.value)
        : await multidimensionalFeatureAnalysisService.createReport(draft.value)
    if (!result.ok || !result.id) {
      message.error(result.message)
      return
    }
    message.success(result.message)
    draftDirty.value = false
    await router.push(`/user-insight/multidim-features/${result.id}`)
  } finally {
    actionLoading.value = false
  }
}

async function toggleFavorite(report: MultiDimReport): Promise<void> {
  const result = await multidimensionalFeatureAnalysisService.toggleFavorite(report.id)
  if (!result.ok) {
    message.error(result.message || (report.favorite ? '取消收藏失败，请稍后重试' : '收藏失败，请稍后重试'))
    return
  }
  message.success(result.message)
  await loadWorkbench()
  await searchReports()
}

function openPermissionModal(report: MultiDimReport): void {
  permissionTarget.value = report
  permissionDraft.value = report.permissions.map((item) => ({ ...item }))
  permissionPrincipalValues.value = report.permissions.map((item) => `${item.authType}:${item.authId}` as PrincipalSelectValue)
  permissionModalVisible.value = true
}

function syncPermissionDraft(values: PrincipalSelectValue[]): void {
  if (!permissionTarget.value) return
  permissionDraft.value = values.map((value) => {
    const principal = parsePrincipal(value)
    if (!principal || !permissionTarget.value) return undefined
    return multidimensionalFeatureAnalysisService.makePermission(permissionTarget.value.id, principal.type, principal.id, principal.name)
  }).filter(Boolean) as MultiDimReportPermission[]
}

function removePermissionDraft(permission: MultiDimReportPermission): void {
  const key = `${permission.authType}:${permission.authId}`
  permissionDraft.value = permissionDraft.value.filter((item) => `${item.authType}:${item.authId}` !== key)
  permissionPrincipalValues.value = permissionPrincipalValues.value.filter((value) => value !== key)
}

async function savePermissions(): Promise<void> {
  if (!permissionTarget.value) return
  actionLoading.value = true
  try {
    const result = await multidimensionalFeatureAnalysisService.updatePermissions(permissionTarget.value.id, permissionDraft.value)
    if (!result.ok) {
      message.error(result.message)
      return
    }
    message.success(result.message)
    permissionModalVisible.value = false
    await loadWorkbench()
    if (pageMode.value === 'list') await searchReports()
    if (pageMode.value === 'detail') currentReport.value = await multidimensionalFeatureAnalysisService.getReport(permissionTarget.value.id)
  } finally {
    actionLoading.value = false
  }
}

function openFailureModal(report: MultiDimReport): void {
  failureTarget.value = report
  failureModalVisible.value = true
  void multidimensionalFeatureAnalysisService.recordFailureReasonView(report.id)
}

async function deleteReport(): Promise<void> {
  if (!deleteTarget.value) return
  actionLoading.value = true
  try {
    const result = await multidimensionalFeatureAnalysisService.deleteReport(deleteTarget.value.id)
    if (!result.ok) {
      message.error(result.message)
      return
    }
    message.success(result.message)
    deleteModalVisible.value = false
    if (pageMode.value === 'detail') await router.push('/user-insight/multidim-features')
    await loadWorkbench()
    await searchReports()
  } finally {
    actionLoading.value = false
  }
}

async function recalculateReport(): Promise<void> {
  if (!recalculateTarget.value) return
  actionLoading.value = true
  try {
    const result = await multidimensionalFeatureAnalysisService.recalculateReport(recalculateTarget.value.id)
    if (!result.ok) {
      message.error(result.message)
      return
    }
    message.success(result.message)
    recalculateModalVisible.value = false
    if (pageMode.value === 'detail') await loadReport(recalculateTarget.value.id)
    else await searchReports()
  } finally {
    actionLoading.value = false
  }
}

function setupPolling(): void {
  if (pollingTimer.value) window.clearInterval(pollingTimer.value)
  if (currentReport.value?.status !== 'calculating') return
  pollingTimer.value = window.setInterval(async () => {
    if (!currentReport.value) return
    const next = await multidimensionalFeatureAnalysisService.pollReport(currentReport.value.id)
    if (next) currentReport.value = next
    if (next?.status !== 'calculating' && pollingTimer.value) {
      window.clearInterval(pollingTimer.value)
      pollingTimer.value = undefined
    }
  }, 5000)
}

async function handleSegmentJump(report: MultiDimReport, segmentId?: EntityId, permission = true, status = 'available'): Promise<void> {
  if (!segmentId) return
  if (!permission) {
    message.warning('暂无该分群查看权限')
    return
  }
  if (status === 'deleted' || status === 'invalid') {
    message.warning('该分群已删除或不可用')
    return
  }
  await multidimensionalFeatureAnalysisService.recordSegmentJump(report.id, segmentId)
  await router.push(`/user-insight/segments/${segmentId}`)
}

function resetComboFilters(): void {
  comboFilters.value = defaultFilters()
  comboPage.value = 1
}

function openComboDetail(combo: MultiDimFeatureCombo): void {
  comboDetailTarget.value = combo
  comboDetailVisible.value = true
}

function openSaveSegment(comboIds: EntityId[], exportType: MultiDimExportType = 'expanded_population'): void {
  const report = currentReport.value
  if (!report) return
  if (!report.runtimePermission.canSaveSegment) {
    message.warning('暂无创建分群权限，请联系管理员开通')
    return
  }
  if (report.status !== 'success') {
    message.warning('只有计算成功的报告可以存为分群')
    return
  }
  if (!comboIds.length) {
    message.warning('请至少选择一个特征组合')
    return
  }
  const combos = comboIds.map((id) => report.featureCombos.find((combo) => combo.id === id)).filter(Boolean) as MultiDimFeatureCombo[]
  if (combos.length !== comboIds.length) {
    message.warning('所选特征组合不存在或已失效')
    return
  }
  if (combos.some((combo) => !comboCanSaveSegment(combo))) {
    message.warning('所选特征组合包含无权限或失效标签，不能存为分群')
    return
  }
  saveSelectedComboIds.value = comboIds
  const firstCombo = combos[0]
  saveDraft.value = {
    exportType,
    comboRelation: 'any',
    outputIdType: String(currentOutputIdOptions.value[0]?.value ?? 'oneid'),
    segmentName: firstCombo ? `${report.name}_${exportType === 'expanded_population' ? '扩量' : '正样本'}分群` : `${report.name}_模型推荐分群`,
    description: firstCombo ? `来源：${report.name}；特征组合：${comboText(firstCombo)}` : `来源：${report.name}`,
    authObjects: [],
    groupIds: ['group-growth'],
  }
  savePrincipalValues.value = []
  saveEstimate.value = undefined
  saveSegmentVisible.value = true
  void refreshEstimate()
}

function handleDraftSegmentJump(segmentId?: EntityId): void {
  const segment = workbench.value?.segments.find((item) => item.id === segmentId)
  if (!segment) return
  void router.push(`/user-insight/segments/${segment.id}`)
}

async function refreshEstimate(): Promise<void> {
  if (!currentReport.value || !saveSegmentVisible.value) return
  const payload: MultiDimEstimateSegmentPayload = {
    reportId: currentReport.value.id,
    selectedComboIds: saveSelectedComboIds.value,
    exportType: saveDraft.value.exportType,
    comboRelation: saveDraft.value.comboRelation,
    outputIdType: saveDraft.value.outputIdType,
  }
  saveEstimateLoading.value = true
  try {
    saveEstimate.value = await multidimensionalFeatureAnalysisService.estimateSegment(payload)
  } finally {
    saveEstimateLoading.value = false
  }
}

async function submitSaveSegment(): Promise<void> {
  if (!currentReport.value) return
  if (saveSubmitDisabled.value) {
    message.warning(saveEstimate.value?.message || '请补充分群配置并等待预估成功')
    return
  }
  actionLoading.value = true
  try {
    const result = await multidimensionalFeatureAnalysisService.saveSegment({
      reportId: currentReport.value.id,
      selectedComboIds: saveSelectedComboIds.value,
      ...saveDraft.value,
    })
    if (!result.ok) {
      message.error(result.message)
      return
    }
    savedSegmentId.value = result.id
    saveSegmentVisible.value = false
    saveSuccessVisible.value = true
    await loadWorkbench()
  } finally {
    actionLoading.value = false
  }
}

function renderRate(value: number) {
  return h(NTag, { type: value >= 0.8 ? 'success' : value >= 0.6 ? 'info' : 'warning', bordered: false }, { default: () => percent(value) })
}

const reportColumns = computed<DataTableColumns<MultiDimReport>>(() => [
  {
    title: '',
    key: 'favorite',
    width: 54,
    render: (row) =>
      h(
        NButton,
        { text: true, type: row.favorite ? 'warning' : 'default', onClick: () => void toggleFavorite(row) },
        { icon: row.favorite ? icon(Star) : icon(StarOutline) },
      ),
  },
  {
    title: '报告名称',
    key: 'name',
    width: 230,
    render: (row) =>
      h(
        NButton,
        { text: true, type: 'primary', onClick: () => router.push(`/user-insight/multidim-features/${row.id}`) },
        { default: () => row.name },
      ),
  },
  {
    title: '正显著分群',
    key: 'positiveSegmentName',
    width: 190,
    render: (row) =>
      h(
        NButton,
        { text: true, onClick: () => void handleSegmentJump(row, row.positiveSegmentId, row.positiveSegmentPermission, row.positiveSegmentStatus) },
        { default: () => row.positiveSegmentName },
      ),
  },
  {
    title: '负显著分群',
    key: 'negative',
    width: 220,
    render: (row) => {
      const label = multidimensionalFeatureAnalysisService.reportNegativeDisplay(row)
      if (row.negativeType === 'population_random') return h(NTag, { bordered: false }, { default: () => label })
      return h(
        NButton,
        { text: true, onClick: () => void handleSegmentJump(row, row.negativeSourceSegmentId, row.negativeSegmentPermission, row.negativeSegmentStatus) },
        { default: () => label },
      )
    },
  },
  { title: '计算完成时间', key: 'finishedAt', width: 150, render: (row) => formatDate(row.finishedAt) },
  { title: '主体', key: 'subjectName', width: 90 },
  { title: '创建人', key: 'creator', width: 110, render: (row) => row.creator.name },
  {
    title: '报告状态',
    key: 'status',
    width: 110,
    render: (row) => h(NTag, { type: statusTagType(row.status), bordered: false }, { default: () => multiDimReportStatusLabels[row.status] }),
  },
  {
    title: '操作',
    key: 'actions',
    width: 220,
    fixed: 'right',
    render: (row) =>
      h(NSpace, { size: 6, wrap: false, class: 'table-actions' }, {
        default: () => [
          h(NButton, { size: 'small', onClick: () => router.push(`/user-insight/multidim-features/${row.id}`) }, { default: () => '查看' }),
          row.status === 'failed' && canRecalculateReport(row)
            ? h(NButton, { size: 'small', type: 'primary', onClick: () => { recalculateTarget.value = row; recalculateModalVisible.value = true } }, { default: () => '重算' })
            : null,
          h(
            NDropdown,
            { trigger: 'click', options: reportActionOptions(row), onSelect: (key: string | number) => handleReportAction(key, row) },
            { default: () => h(NButton, { size: 'small', quaternary: true, renderIcon: icon(EllipsisHorizontalOutline) }, { default: () => '更多' }) },
          ),
        ],
      }),
  },
])

const comboColumns = computed<DataTableColumns<MultiDimFeatureCombo>>(() => [
  { type: 'selection', width: 48 },
  { title: '序号', key: 'rankNo', width: 70, sorter: (a, b) => a.rankNo - b.rankNo },
  { title: '特征名称和值1', key: 'item1', width: 210, render: (row) => comboItemText(row, 0) },
  { title: '特征名称和值2', key: 'item2', width: 210, render: (row) => comboItemText(row, 1) },
  { title: '特征名称和值3', key: 'item3', width: 210, render: (row) => comboItemText(row, 2) },
  { title: '特征组合综合评分', key: 'score', width: 150, sorter: (a, b) => a.score - b.score, render: (row) => row.score.toFixed(3) },
  { title: '精确率', key: 'precisionRate', width: 110, sorter: (a, b) => a.precisionRate - b.precisionRate, render: (row) => renderRate(row.precisionRate) },
  { title: '召回率', key: 'recallRate', width: 110, sorter: (a, b) => a.recallRate - b.recallRate, render: (row) => renderRate(row.recallRate) },
  { title: '正样本中的人数', key: 'positiveHitCount', width: 140, sorter: (a, b) => a.positiveHitCount - b.positiveHitCount, render: (row) => row.positiveHitCount.toLocaleString() },
  { title: '扩量后的人数', key: 'expandedCount', width: 140, sorter: (a, b) => a.expandedCount - b.expandedCount, render: (row) => row.expandedCount.toLocaleString() },
  {
    title: '操作',
    key: 'actions',
    width: 190,
    fixed: 'right',
    render: (row) =>
      h(NSpace, { size: 8 }, {
        default: () => [
          h(NButton, { size: 'small', onClick: () => openComboDetail(row) }, { default: () => '查看详情' }),
          h(
            NButton,
            {
              size: 'small',
              disabled: !currentReport.value?.runtimePermission.canSaveSegment || !comboCanSaveSegment(row),
              onClick: () => openSaveSegment([row.id]),
            },
            { default: () => '存为分群' },
          ),
        ],
      }),
  },
])

watch(
  () => route.fullPath,
  () => {
    void refreshPage()
  },
)

watch(
  () => [draft.value.labelSelectionMode, draft.value.subjectType],
  () => {
    if (pageMode.value === 'new' && draft.value.labelSelectionMode === 'system_recommend') applyRecommendedTags()
  },
)

watch(comboFilters, () => {
  comboPage.value = 1
}, { deep: true })

watch(
  () => [saveDraft.value.exportType, saveDraft.value.comboRelation, saveDraft.value.outputIdType, saveSelectedComboIds.value.join(',')],
  () => {
    void refreshEstimate()
  },
)

onMounted(() => {
  void refreshPage()
})

onUnmounted(() => {
  if (pollingTimer.value) window.clearInterval(pollingTimer.value)
})
</script>

<template>
  <main class="multidim-page">
    <n-alert v-if="permissions && !permissions.viewReport" type="warning" title="暂无多维特征分析查看权限">
      当前账号不会展示多维特征分析入口，请联系管理员开通后再访问。
    </n-alert>

    <n-spin v-else :show="loading">
      <section v-if="pageMode === 'list'" class="page-section">
        <div class="page-header">
          <div>
            <h1>多维特征分析</h1>
            <p>基于正负样本自动挖掘最能区分目标人群的标签值组合，沉淀可用于下游运营的分群规则。</p>
          </div>
          <n-tooltip v-if="!permissions?.mutateReport" trigger="hover">
            <template #trigger>
              <n-button type="primary" disabled :render-icon="icon(AddOutline)">新建报告</n-button>
            </template>
            暂无多维特征分析报告创建权限，请联系管理员开通。
          </n-tooltip>
          <n-button v-else type="primary" :render-icon="icon(AddOutline)" @click="router.push('/user-insight/multidim-features/new')">
            新建报告
          </n-button>
        </div>

        <n-card v-if="listIsIntro" :bordered="false" class="intro-card">
          <div class="intro-grid">
            <div>
              <h2>从经验圈人，升级为模型辅助圈人</h2>
              <p>输入正显著分群和负显著分群，系统会自动组合标签值，输出综合评分、精确率、召回率、正样本人数和扩量后人数。</p>
              <n-space>
                <n-button type="primary" :disabled="!permissions?.mutateReport" :render-icon="icon(AddOutline)" @click="router.push('/user-insight/multidim-features/new')">
                  新建报告
                </n-button>
                <n-button @click="searchReports">查看历史报告</n-button>
              </n-space>
            </div>
            <div class="highlight-list">
              <div>正负样本输入，辅助模型训练</div>
              <div>基于模型精准预测，推荐最佳标签组合</div>
              <div>按显著度、覆盖率、人群数量保存人群包</div>
            </div>
          </div>
        </n-card>

        <n-card :bordered="false" class="filter-card">
          <div class="filter-one-line">
            <div class="filter-search-group">
              <n-input
                v-model:value="filters.keyword"
                clearable
                class="search-input"
                placeholder="搜索报告名称"
                @keyup.enter="submitReportSearch"
              >
                <template #prefix>
                  <n-icon><SearchOutline /></n-icon>
                </template>
              </n-input>
              <n-button type="primary" :render-icon="icon(SearchOutline)" @click="submitReportSearch">搜索</n-button>
            </div>
            <div class="filter-checks">
              <n-checkbox v-model:checked="filters.createdByMe" @update:checked="() => { filters.page = 1; searchReports() }">我创建的</n-checkbox>
              <n-checkbox v-model:checked="filters.favoriteByMe" @update:checked="() => { filters.page = 1; searchReports() }">我收藏的</n-checkbox>
              <n-checkbox v-model:checked="filters.sharedToMe" @update:checked="() => { filters.page = 1; searchReports() }">他人授权给我</n-checkbox>
            </div>
            <n-select v-model:value="filters.statuses" multiple clearable class="filter-select" placeholder="报告状态" :options="reportStatusOptions" @update:value="() => { filters.page = 1; searchReports() }" />
            <n-select v-model:value="filters.subjectTypes" multiple clearable class="filter-select" placeholder="主体" :options="reportSubjectFilterOptions" @update:value="() => { filters.page = 1; searchReports() }" />
            <n-button class="filter-reset-button" :render-icon="icon(RefreshOutline)" @click="resetReportFilters">
              重置
            </n-button>
          </div>
        </n-card>

        <n-card :bordered="false">
          <n-data-table :columns="reportColumns" :data="reportRows" :loading="tableLoading" :bordered="false" :scroll-x="1460" />
          <n-empty v-if="!tableLoading && reportRows.length === 0" class="empty-block" :description="hasAnyReport ? '未找到符合条件的报告，请调整搜索或筛选条件。' : permissions?.mutateReport ? '暂无多维特征分析报告，你可以点击“新建报告”创建第一份报告。' : '暂无可查看的多维特征分析报告。'">
            <template v-if="hasAnyReport" #extra>
              <n-button @click="resetReportFilters">重置筛选</n-button>
            </template>
          </n-empty>
          <div class="pagination-row">
            <n-pagination v-model:page="filters.page" v-model:page-size="filters.pageSize" show-size-picker :page-sizes="[10, 20, 50, 100]" :item-count="reportTotal" @update:page="searchReports" @update:page-size="() => { filters.page = 1; searchReports() }" />
          </div>
        </n-card>
      </section>

      <section v-else-if="pageMode === 'new' || pageMode === 'edit'" class="page-section">
        <div class="page-header">
          <n-space align="center">
            <n-button quaternary :render-icon="icon(ArrowBackOutline)" @click="tryLeave(() => router.push(pageMode === 'edit' && currentReport ? `/user-insight/multidim-features/${currentReport.id}` : '/user-insight/multidim-features'))">返回</n-button>
            <div>
              <h1>{{ pageMode === 'edit' ? '编辑多维特征分析报告' : '新建多维特征分析报告' }}</h1>
              <p>{{ pageMode === 'edit' ? '保存后将按最新配置重新发起计算任务。' : '保存后将创建报告并发起计算任务，推荐进入详情页查看计算中状态。' }}</p>
            </div>
          </n-space>
          <n-space>
            <n-button @click="tryLeave(() => router.push(pageMode === 'edit' && currentReport ? `/user-insight/multidim-features/${currentReport.id}` : '/user-insight/multidim-features'))">取消</n-button>
            <n-button type="primary" :loading="actionLoading" :disabled="!canSubmitReport" :render-icon="icon(SaveOutline)" @click="submitReport">保存</n-button>
          </n-space>
        </div>

        <n-alert v-if="!permissions?.mutateReport" type="warning" :title="pageMode === 'edit' ? '暂无编辑多维特征分析报告权限' : '暂无创建多维特征分析报告权限'" />
        <n-alert v-else-if="createPrerequisiteError" type="warning" :title="createPrerequisiteError" />

        <n-grid :cols="24" :x-gap="16" :y-gap="16">
          <n-gi :span="24">
            <n-card title="基本信息" :bordered="false">
              <n-form label-placement="left" label-width="110">
                <n-grid :cols="24" :x-gap="16">
                  <n-gi :span="12">
                    <n-form-item label="任务名称" required>
                      <n-input v-model:value="draft.name" maxlength="100" show-count placeholder="请输入任务名称" @update:value="draftDirty = true" />
                    </n-form-item>
                  </n-gi>
                  <n-gi :span="12">
                    <n-form-item label="主体" required>
                      <n-select :value="draft.subjectType" :options="subjectOptions" placeholder="请选择主体" @update:value="handleSubjectSelect" />
                    </n-form-item>
                  </n-gi>
                  <n-gi :span="24">
                    <n-form-item label="授权对象">
                      <n-select v-model:value="permissionPrincipalValues" multiple clearable :options="principalOptions" placeholder="可选，授权对象仅获得查看权限" @update:value="syncDraftAuth" />
                    </n-form-item>
                  </n-gi>
                </n-grid>
              </n-form>
            </n-card>
          </n-gi>

          <n-gi :span="14">
            <n-card title="分析样本配置" :bordered="false">
              <n-form label-placement="top">
                <n-form-item label="正显著分群" required>
                  <n-select v-model:value="draft.positiveSegmentId" filterable clearable :options="segmentOptions" placeholder="只能选择已创建且有权限的人群包" @update:value="draftDirty = true" />
                </n-form-item>
                <n-alert v-if="positiveSegment" type="info" :show-icon="false" class="inline-alert">
                  {{ positiveSegment.name }}，{{ positiveSegment.count.toLocaleString() }} 人，更新时间 {{ formatDate(positiveSegment.updatedAt) }}
                  <n-button text type="primary" @click="handleDraftSegmentJump(positiveSegment.id)">
                    查看分群
                  </n-button>
                </n-alert>
                <n-form-item label="负显著分群" required>
                  <n-radio-group v-model:value="draft.negativeType" class="negative-cards" @update:value="() => { draft.negativeSourceSegmentId = ''; draftDirty = true }">
                    <n-radio value="population_random">大盘随机抽样</n-radio>
                    <n-radio value="segment_random">指定分群随机抽样</n-radio>
                    <n-radio value="custom_segment">自定义分群</n-radio>
                  </n-radio-group>
                </n-form-item>
                <n-alert v-if="draft.negativeType === 'population_random'" type="info" class="inline-alert">
                  系统将在当前主体大盘中排除正显著分群后随机抽样，抽样结果随报告计算版本固定。
                </n-alert>
                <n-form-item v-else :label="draft.negativeType === 'segment_random' ? '指定分群' : '负样本分群'" required>
                  <n-select v-model:value="draft.negativeSourceSegmentId" filterable clearable :options="segmentOptions" placeholder="请选择当前主体下有权限且人数大于 0 的分群" @update:value="draftDirty = true" />
                </n-form-item>
                <n-alert v-if="overlapTip" type="warning" class="inline-alert">{{ overlapTip }}</n-alert>
              </n-form>
            </n-card>
          </n-gi>

          <n-gi :span="10">
            <n-card title="特征组合配置" :bordered="false">
              <n-form label-placement="top">
                <n-form-item label="输出特征组合包含的标签值数量" required>
                  <n-select v-model:value="draft.comboValueCount" :options="[{ label: '1 个标签值', value: 1 }, { label: '2 个标签值', value: 2 }, { label: '3 个标签值', value: 3 }]" @update:value="draftDirty = true" />
                </n-form-item>
                <n-alert type="warning" class="inline-alert">
                  标签值数量越大，组合搜索空间越大，报告计算耗时可能越长。默认推荐 3 个标签值。
                </n-alert>
                <n-descriptions :column="1" size="small" class="subject-desc">
                  <n-descriptions-item label="当前主体">{{ currentSubject?.name ?? '--' }}</n-descriptions-item>
                  <n-descriptions-item label="可输出 ID">{{ currentSubject?.idTypes.map((item) => item.label).join('、') ?? '--' }}</n-descriptions-item>
                </n-descriptions>
              </n-form>
            </n-card>
          </n-gi>

          <n-gi :span="24">
            <n-card title="参与分析标签配置" :bordered="false">
              <n-space vertical size="large">
                <n-radio-group v-model:value="draft.labelSelectionMode" @update:value="() => { applyRecommendedTags(); draftDirty = true }">
                  <n-radio-button value="system_recommend">系统推荐</n-radio-button>
                  <n-radio-button value="custom">自定义选择</n-radio-button>
                </n-radio-group>

                <template v-if="draft.labelSelectionMode === 'system_recommend'">
                  <n-alert v-if="recommendedTags.length === 0" type="warning">当前暂无可推荐标签，请使用自定义选择。</n-alert>
                  <n-data-table
                    :columns="[
                      { title: '标签名称', key: 'name' },
                      { title: '标签目录', key: 'directory' },
                      { title: '覆盖率', key: 'coverageRate', render: (row: any) => `${row.coverageRate}%` },
                      { title: '标签值数量', key: 'valueCount' },
                      { title: '推荐原因', key: 'recommendReason' },
                      { title: '操作', key: 'actions', render: (row: any) => h(NButton, { size: 'small', onClick: () => { draft.selectedTagIds = draft.selectedTagIds.filter((id) => id !== row.id); draftDirty = true } }, { default: () => '移除' }) },
                    ]"
                    :data="selectedTags"
                    :bordered="false"
                    :pagination="{ pageSize: 8 }"
                  />
                </template>

                <template v-else>
                  <div class="tag-picker">
                    <div class="tag-picker-toolbar">
                      <n-input
                        v-model:value="customTagKeyword"
                        clearable
                        class="tag-search-input"
                        placeholder="搜索标签名称、目录、类型或标签值"
                      >
                        <template #prefix>
                          <n-icon><SearchOutline /></n-icon>
                        </template>
                      </n-input>
                      <n-button @click="resetCustomTagFilters">重置</n-button>
                    </div>

                    <div class="tag-picker-body">
                      <aside class="tag-directory-panel">
                        <button
                          v-for="item in customTagDirectoryOptions"
                          :key="item.directory"
                          type="button"
                          class="tag-directory-button"
                          :class="{ active: activeTagDirectory === item.directory }"
                          @click="activeTagDirectory = item.directory"
                        >
                          <span>{{ item.label }}</span>
                          <span>{{ item.selectedCount }}/{{ item.count }}</span>
                        </button>
                      </aside>

                      <section class="tag-result-panel">
                        <div class="tag-result-header">
                          <span>可选标签 {{ filteredCustomTags.length }} 个</span>
                          <span>已选 {{ selectedTags.length }}/200</span>
                        </div>
                        <n-empty v-if="customTagGroups.length === 0" description="未找到符合条件的标签" class="tag-empty" />
                        <div v-else class="tag-group-list">
                          <section v-for="group in customTagGroups" :key="group.directory" class="tag-group">
                            <div class="tag-group-header">
                              <div>
                                <strong>{{ group.directory }}</strong>
                                <span>{{ group.selectedCount }}/{{ group.availableCount }} 已选</span>
                              </div>
                              <n-space size="small">
                                <n-button size="tiny" :disabled="group.availableCount === 0" @click="selectCustomTagGroup(group.directory)">全选本组</n-button>
                                <n-button size="tiny" :disabled="group.selectedCount === 0" @click="clearCustomTagGroup(group.directory)">清空本组</n-button>
                              </n-space>
                            </div>
                            <div class="tag-row-list">
                              <div
                                v-for="tag in group.rows"
                                :key="tag.id"
                                class="tag-row"
                                :class="{ disabled: !tagSelectable(tag), selected: draft.selectedTagIds.includes(tag.id) }"
                              >
                                <n-checkbox
                                  :checked="draft.selectedTagIds.includes(tag.id)"
                                  :disabled="!tagSelectable(tag)"
                                  @update:checked="(checked) => setCustomTagSelected(tag, Boolean(checked))"
                                />
                                <div class="tag-row-main">
                                  <div class="tag-row-title">
                                    <strong>{{ tag.name }}</strong>
                                    <n-tag size="small" :type="tagSelectable(tag) ? 'success' : 'warning'" :bordered="false">
                                      {{ tagSelectable(tag) ? '可用' : tagUnavailableReason(tag) }}
                                    </n-tag>
                                  </div>
                                  <div class="tag-row-meta">
                                    {{ tag.tagType }} · 覆盖率 {{ tag.coverageRate }}% · 标签值 {{ tag.valueCount }} 个
                                  </div>
                                </div>
                              </div>
                            </div>
                          </section>
                        </div>
                      </section>

                      <aside class="selected-tag-panel">
                        <div class="selected-tag-header">
                          <strong>已选标签</strong>
                          <n-button text type="primary" :disabled="selectedTags.length === 0" @click="clearCustomTagSelection">清空</n-button>
                        </div>
                        <div v-if="selectedTags.length" class="selected-tag-list">
                          <n-tag
                            v-for="tag in selectedTags"
                            :key="tag.id"
                            closable
                            :bordered="false"
                            @close="setCustomTagSelected(tag, false)"
                          >
                            {{ tag.name }}
                          </n-tag>
                        </div>
                        <n-empty v-else size="small" description="尚未选择标签" />
                      </aside>
                    </div>
                  </div>
                </template>
              </n-space>
            </n-card>
          </n-gi>
        </n-grid>
      </section>

      <section v-else class="page-section">
        <n-empty v-if="!currentReport" description="报告不存在、已删除或暂无查看权限。">
          <template #extra>
            <n-button @click="router.push('/user-insight/multidim-features')">返回列表</n-button>
          </template>
        </n-empty>

        <template v-else>
          <div class="page-header">
            <n-space align="center">
              <n-button quaternary :render-icon="icon(ArrowBackOutline)" @click="router.push('/user-insight/multidim-features')">返回</n-button>
              <div>
                <h1>{{ currentReport.name }}</h1>
                <p>顶部为报告配置摘要，下方展示要点解读和多维特征分析结果明细。</p>
              </div>
            </n-space>
            <n-space>
              <n-button v-if="canEditReport(currentReport)" :render-icon="icon(CreateOutline)" @click="router.push(`/user-insight/multidim-features/${currentReport.id}/edit`)">编辑</n-button>
              <n-button v-if="currentReport.runtimePermission.canAuthorize" :render-icon="icon(ShareSocialOutline)" @click="openPermissionModal(currentReport)">权限管理</n-button>
              <n-button v-if="canRecalculateReport(currentReport)" :render-icon="icon(PlayOutline)" @click="() => { recalculateTarget = currentReport; recalculateModalVisible = true }">重新计算</n-button>
              <n-button v-if="currentReport.runtimePermission.canDelete" type="error" ghost :render-icon="icon(TrashOutline)" @click="() => { deleteTarget = currentReport; deleteModalVisible = true }">删除</n-button>
            </n-space>
          </div>

          <n-card :bordered="false" class="summary-card">
            <n-descriptions :column="4" bordered label-placement="top">
              <n-descriptions-item label="报告状态">
                <n-tag :type="statusTagType(currentReport.status)" :bordered="false">{{ multiDimReportStatusLabels[currentReport.status] }}</n-tag>
              </n-descriptions-item>
              <n-descriptions-item label="主体">{{ currentReport.subjectName }}</n-descriptions-item>
              <n-descriptions-item label="创建人">{{ currentReport.creator.name }}</n-descriptions-item>
              <n-descriptions-item label="创建时间">{{ formatDate(currentReport.createdAt) }}</n-descriptions-item>
              <n-descriptions-item label="正显著分群">
                <n-button text type="primary" @click="handleSegmentJump(currentReport, currentReport.positiveSegmentId, currentReport.positiveSegmentPermission, currentReport.positiveSegmentStatus)">
                  {{ currentReport.positiveSegmentName }}（{{ currentReport.positiveSegmentCount.toLocaleString() }}）
                </n-button>
              </n-descriptions-item>
              <n-descriptions-item label="负显著分群">
                <n-tooltip v-if="currentReport.negativeType === 'population_random'" trigger="hover">
                  <template #trigger>
                    <n-tag :bordered="false">大盘随机抽样</n-tag>
                  </template>
                  负样本由大盘随机抽样生成，无对应用户分群详情。
                </n-tooltip>
                <n-button v-else text type="primary" @click="handleSegmentJump(currentReport, currentReport.negativeSourceSegmentId, currentReport.negativeSegmentPermission, currentReport.negativeSegmentStatus)">
                  {{ multidimensionalFeatureAnalysisService.reportNegativeDisplay(currentReport) }}
                </n-button>
              </n-descriptions-item>
              <n-descriptions-item label="参与分析标签">
                <n-space size="small">
                  <n-tag v-for="tag in currentReport.labels.slice(0, 4)" :key="tag.id" :type="tag.permission ? 'default' : 'warning'" :bordered="false">
                    {{ tag.permission ? tag.tagName : '无权限标签' }}
                  </n-tag>
                  <n-button v-if="currentReport.labels.length > 4" text type="primary" @click="tagModalVisible = true">+{{ currentReport.labels.length - 4 }}</n-button>
                </n-space>
              </n-descriptions-item>
              <n-descriptions-item label="特征组合标签值数量">{{ currentReport.comboValueCount }}</n-descriptions-item>
              <n-descriptions-item label="计算完成时间">{{ formatDate(currentReport.finishedAt) }}</n-descriptions-item>
            </n-descriptions>
          </n-card>

          <n-alert v-if="currentReport.status === 'invalid'" type="warning" title="报告已失效" class="state-alert">
            {{ currentReport.invalidReason || '引用资源已删除或权限失效。' }}
          </n-alert>

          <n-card v-if="currentReport.status === 'calculating'" :bordered="false" class="state-card">
            <n-spin size="large" />
            <h2>报告正在计算中</h2>
            <p>计算完成后将自动展示分析结果；页面按 5 秒间隔轮询任务状态。</p>
          </n-card>

          <n-card v-else-if="currentReport.status === 'failed'" :bordered="false" class="state-card failed">
            <h2>计算失败</h2>
            <p>{{ currentReport.failureReason?.reason }}</p>
            <n-space>
              <n-button v-if="canRecalculateReport(currentReport)" type="primary" @click="() => { recalculateTarget = currentReport; recalculateModalVisible = true }">重新计算</n-button>
              <n-button @click="router.push('/user-insight/multidim-features')">返回列表</n-button>
              <n-button @click="openFailureModal(currentReport)">查看失败原因</n-button>
            </n-space>
          </n-card>

          <template v-else-if="currentReport.status === 'success'">
            <n-card :bordered="false" class="interpretation-card">
              <div class="section-title-row">
                <h2>要点解读</h2>
                <n-button text type="primary" @click="interpretationCollapsed = !interpretationCollapsed">{{ interpretationCollapsed ? '展开' : '收起' }}</n-button>
              </div>
              <div v-if="!interpretationCollapsed && topCombo" class="interpretation-content">
                <div>
                  <p class="lead-text">{{ currentReport.interpretation?.title }}</p>
                  <p>{{ currentReport.interpretation?.expansionDescription }}</p>
                  <p>{{ currentReport.interpretation?.marketingSuggestion }}</p>
                </div>
                <n-space>
                  <n-statistic label="综合评分" :value="topCombo.score.toFixed(3)" />
                  <n-statistic label="精确率" :value="percent(topCombo.precisionRate)" />
                  <n-statistic label="召回率" :value="percent(topCombo.recallRate)" />
                  <n-statistic label="扩量后人数" :value="topCombo.expandedCount.toLocaleString()" />
                </n-space>
                <n-button type="primary" :disabled="!currentReport.runtimePermission.canSaveSegment" @click="openSaveSegment([topCombo.id], 'expanded_population')">
                  一键保存扩量后分群
                </n-button>
              </div>
            </n-card>

            <n-card :bordered="false">
              <div class="section-title-row">
                <div>
                  <h2>多维特征分析结果明细</h2>
                  <p>默认按综合评分降序展示，综合评分 = 精确率 * 0.8 + 召回率 * 0.2。</p>
                </div>
                <n-space>
                  <n-button @click="featureFilterModalVisible = true">特征组合筛选</n-button>
                  <n-tooltip v-if="!currentReport.runtimePermission.canSaveSegment" trigger="hover">
                    <template #trigger>
                      <n-button disabled>存为分群</n-button>
                    </template>
                    暂无创建分群权限，请联系管理员开通。
                  </n-tooltip>
                  <n-button v-else type="primary" :disabled="selectedComboIds.length === 0" @click="openSaveSegment(selectedComboIds)">
                    存为分群
                  </n-button>
                </n-space>
              </div>

              <n-space class="combo-filter-bar" align="center" wrap>
                <n-input v-model:value="comboFilters.valueKeyword" clearable placeholder="搜索标签值" class="small-input" />
                <n-select v-model:value="comboFilters.tagNames" multiple clearable :options="comboTagNameOptions" placeholder="标签名称" class="filter-select" />
                <n-input-number v-model:value="comboFilters.scoreMin" :min="0" :max="1" :step="0.01" placeholder="评分下限" class="number-input" />
                <n-input-number v-model:value="comboFilters.scoreMax" :min="0" :max="1" :step="0.01" placeholder="评分上限" class="number-input" />
                <n-button @click="resetComboFilters">清空筛选</n-button>
              </n-space>
              <n-alert v-if="invisibleSelectedCount > 0" type="warning" class="inline-alert">
                已选择 {{ selectedComboIds.length }} 个特征组合，其中 {{ invisibleSelectedCount }} 个当前不可见，存为分群时仍会生效。
              </n-alert>

              <n-empty v-if="currentReport.featureCombos.length === 0" description="当前配置下暂无有效特征组合，请尝试增加参与分析标签、调整正负样本或降低特征组合复杂度。">
                <template #extra>
                  <n-space>
                    <n-button @click="router.push(`/user-insight/multidim-features/${currentReport.id}/edit`)">返回编辑</n-button>
                    <n-button v-if="canRecalculateReport(currentReport)" type="primary" @click="() => { recalculateTarget = currentReport; recalculateModalVisible = true }">重新计算</n-button>
                  </n-space>
                </template>
              </n-empty>
              <n-empty v-else-if="filteredCombos.length === 0" description="未找到符合条件的特征组合，请调整筛选条件。">
                <template #extra>
                  <n-button @click="resetComboFilters">清空筛选</n-button>
                </template>
              </n-empty>
              <template v-else>
                <n-data-table
                  :columns="comboColumns"
                  :data="pagedCombos"
                  :bordered="false"
                  :row-key="(row: MultiDimFeatureCombo) => row.id"
                  :checked-row-keys="selectedComboIds"
                  :scroll-x="1600"
                  @update:checked-row-keys="(keys) => { selectedComboIds = keys.map(String) }"
                />
                <div class="pagination-row">
                  <n-pagination v-model:page="comboPage" v-model:page-size="comboPageSize" show-size-picker :page-sizes="[10, 20, 50, 100]" :item-count="filteredCombos.length" />
                </div>
              </template>
            </n-card>
          </template>
        </template>
      </section>
    </n-spin>

    <n-modal v-model:show="leaveConfirmVisible" preset="dialog" title="确认离开" positive-text="确认离开" negative-text="继续编辑" @positive-click="confirmLeave">
      当前报告配置尚未保存，离开后已填写内容将丢失，是否确认离开？
    </n-modal>

    <n-modal v-model:show="subjectConfirmVisible" preset="dialog" title="切换主体" positive-text="继续" negative-text="取消" @positive-click="confirmSubjectChange">
      切换主体将清空已选择的分群和标签配置，是否继续？
    </n-modal>

    <n-modal v-model:show="permissionModalVisible" preset="card" title="权限管理" class="modal-card">
      <n-alert type="info" class="inline-alert">多维特征分析报告授权仅支持查看权限，不支持授予编辑权限。</n-alert>
      <n-form label-placement="top">
        <n-form-item label="授权对象">
          <n-select v-model:value="permissionPrincipalValues" multiple clearable :options="principalOptions" placeholder="用户、用户组、角色、部门" @update:value="syncPermissionDraft" />
        </n-form-item>
        <n-form-item label="权限类型">
          <n-tag type="info" :bordered="false">查看权限</n-tag>
        </n-form-item>
        <n-form-item label="已授权对象">
          <n-space v-if="permissionDraft.length" size="small" wrap>
            <n-tag
              v-for="permission in permissionDraft"
              :key="`${permission.authType}:${permission.authId}`"
              closable
              :bordered="false"
              @close="removePermissionDraft(permission)"
            >
              {{ permission.authName }}
            </n-tag>
          </n-space>
          <n-empty v-else size="small" description="暂无已授权对象" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="permissionModalVisible = false">取消</n-button>
          <n-button type="primary" :loading="actionLoading" @click="savePermissions">确定</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="deleteModalVisible" preset="dialog" title="删除报告" positive-text="确认删除" negative-text="取消" :positive-button-props="{ type: 'error', loading: actionLoading }" @positive-click="deleteReport">
      删除后，该多维特征分析报告将无法恢复，报告中的计算结果、授权关系和收藏关系也会一并删除。请确认是否继续？
    </n-modal>

    <n-modal v-model:show="failureModalVisible" preset="card" title="失败原因" class="modal-card">
      <n-descriptions v-if="failureTarget" :column="1" bordered>
        <n-descriptions-item label="报告名称">{{ failureTarget.name }}</n-descriptions-item>
        <n-descriptions-item label="失败时间">{{ formatDate(failureTarget.failureReason?.failedAt) }}</n-descriptions-item>
        <n-descriptions-item label="失败阶段">{{ failureTarget.failureReason?.stage }}</n-descriptions-item>
        <n-descriptions-item label="失败原因">{{ failureTarget.failureReason?.reason }}</n-descriptions-item>
        <n-descriptions-item label="建议处理方式">{{ failureTarget.failureReason?.suggestion }}</n-descriptions-item>
      </n-descriptions>
      <template #footer>
        <n-space justify="end">
          <n-button @click="failureModalVisible = false">关闭</n-button>
          <n-button v-if="failureTarget && canRecalculateReport(failureTarget)" type="primary" @click="() => { recalculateTarget = failureTarget; failureModalVisible = false; recalculateModalVisible = true }">重新计算</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="recalculateModalVisible" preset="dialog" title="重新计算" positive-text="确认重新计算" negative-text="取消" :positive-button-props="{ loading: actionLoading }" @positive-click="recalculateReport">
      系统将基于当前报告配置重新发起计算。计算期间报告结果不可用，请确认是否继续？
    </n-modal>

    <n-modal v-model:show="tagModalVisible" preset="card" title="参与分析标签" class="modal-card">
      <n-data-table
        :columns="[
          { title: '标签名称', key: 'tagName', render: (row: any) => row.permission ? row.tagName : '无权限标签' },
          { title: '标签目录', key: 'directory' },
          { title: '标签类型', key: 'tagType' },
          { title: '状态', key: 'status', render: (row: any) => row.status === 'available' ? '可用' : '失效标签' },
        ]"
        :data="tagModalRows"
        :bordered="false"
      />
    </n-modal>

    <n-modal v-model:show="featureFilterModalVisible" preset="card" title="特征组合筛选" class="modal-card">
      <n-grid :cols="2" :x-gap="16" :y-gap="12">
        <n-gi><n-input-number v-model:value="comboFilters.precisionMin" :min="0" :max="100" placeholder="精确率下限 %" /></n-gi>
        <n-gi><n-input-number v-model:value="comboFilters.precisionMax" :min="0" :max="100" placeholder="精确率上限 %" /></n-gi>
        <n-gi><n-input-number v-model:value="comboFilters.recallMin" :min="0" :max="100" placeholder="召回率下限 %" /></n-gi>
        <n-gi><n-input-number v-model:value="comboFilters.recallMax" :min="0" :max="100" placeholder="召回率上限 %" /></n-gi>
        <n-gi><n-input-number v-model:value="comboFilters.positiveCountMin" :min="0" placeholder="正样本人数下限" /></n-gi>
        <n-gi><n-input-number v-model:value="comboFilters.positiveCountMax" :min="0" placeholder="正样本人数上限" /></n-gi>
        <n-gi><n-input-number v-model:value="comboFilters.expandedCountMin" :min="0" placeholder="扩量后人数下限" /></n-gi>
        <n-gi><n-input-number v-model:value="comboFilters.expandedCountMax" :min="0" placeholder="扩量后人数上限" /></n-gi>
      </n-grid>
      <template #footer>
        <n-space justify="end">
          <n-button @click="resetComboFilters">清空筛选</n-button>
          <n-button type="primary" @click="featureFilterModalVisible = false">确定</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="comboDetailVisible" preset="card" title="特征组合详情" class="modal-card">
      <n-space v-if="comboDetailTarget" vertical size="large">
        <n-descriptions :column="2" bordered label-placement="top">
          <n-descriptions-item label="特征组合">{{ comboText(comboDetailTarget) }}</n-descriptions-item>
          <n-descriptions-item label="序号">{{ comboDetailTarget.rankNo }}</n-descriptions-item>
          <n-descriptions-item label="综合评分">{{ comboDetailTarget.score.toFixed(3) }}</n-descriptions-item>
          <n-descriptions-item label="精确率">{{ percent(comboDetailTarget.precisionRate) }}</n-descriptions-item>
          <n-descriptions-item label="召回率">{{ percent(comboDetailTarget.recallRate) }}</n-descriptions-item>
          <n-descriptions-item label="正样本中的人数">{{ comboDetailTarget.positiveHitCount.toLocaleString() }}</n-descriptions-item>
          <n-descriptions-item label="负样本中的人数">{{ comboDetailTarget.negativeHitCount.toLocaleString() }}</n-descriptions-item>
          <n-descriptions-item label="扩量后的人数">{{ comboDetailTarget.expandedCount.toLocaleString() }}</n-descriptions-item>
        </n-descriptions>
        <n-data-table
          :columns="[
            { title: '标签名称', key: 'tagName' },
            { title: '标签值', key: 'tagValue' },
            { title: '标签目录', key: 'directory' },
            { title: '标签类型', key: 'tagType' },
            { title: '状态', key: 'permission', render: (row: any) => row.permission && !row.invalid ? '可用于生成分群' : '无权限或已失效' },
          ]"
          :data="comboDetailTarget.comboItems"
          :bordered="false"
        />
      </n-space>
      <template #footer>
        <n-space justify="end">
          <n-button @click="comboDetailVisible = false">关闭</n-button>
          <n-button
            v-if="comboDetailTarget"
            type="primary"
            :disabled="!currentReport?.runtimePermission.canSaveSegment || !comboCanSaveSegment(comboDetailTarget)"
            @click="() => { if (comboDetailTarget) { comboDetailVisible = false; openSaveSegment([comboDetailTarget.id]) } }"
          >
            存为分群
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="saveSegmentVisible" preset="card" title="存为分群" class="modal-card">
      <n-form label-placement="top">
        <n-form-item label="导出人群类型" required>
          <n-radio-group v-model:value="saveDraft.exportType">
            <n-radio value="positive_sample">正样本人群</n-radio>
            <n-radio value="expanded_population">扩量后人群</n-radio>
          </n-radio-group>
        </n-form-item>
        <n-form-item label="组合关系" required>
          <n-radio-group v-model:value="saveDraft.comboRelation">
            <n-radio value="any">满足任意特征组合</n-radio>
            <n-radio value="all">满足所有特征组合</n-radio>
          </n-radio-group>
        </n-form-item>
        <n-grid :cols="2" :x-gap="16">
          <n-gi>
            <n-form-item label="输出 ID 类型" required>
              <n-select v-model:value="saveDraft.outputIdType" :options="currentOutputIdOptions" />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="分组">
              <n-select v-model:value="saveDraft.groupIds" multiple :options="segmentGroupOptions" />
            </n-form-item>
          </n-gi>
        </n-grid>
        <n-form-item label="分群名称" required>
          <n-input v-model:value="saveDraft.segmentName" placeholder="请输入新分群名称" />
        </n-form-item>
        <n-form-item label="分群描述">
          <n-input v-model:value="saveDraft.description" type="textarea" placeholder="分群说明" />
        </n-form-item>
        <n-form-item label="授权给">
          <n-select v-model:value="savePrincipalValues" multiple clearable :options="principalOptions" placeholder="授权用户、用户组、角色、部门" @update:value="syncSaveAuth" />
        </n-form-item>
        <n-alert :type="saveEstimate?.ok ? 'success' : 'warning'" class="inline-alert">
          <n-spin :show="saveEstimateLoading" size="small">
            预估人数：{{ saveEstimate?.ok ? saveEstimate.count.toLocaleString() : '--' }}。{{ saveEstimate?.message ?? '选择导出配置后自动预估。' }}
          </n-spin>
        </n-alert>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="saveSegmentVisible = false">取消</n-button>
          <n-button type="primary" :loading="actionLoading" :disabled="saveSubmitDisabled" @click="submitSaveSegment">确定</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="saveSuccessVisible" preset="dialog" title="分群保存成功" positive-text="前往用户分群" negative-text="继续查看报告" @positive-click="() => savedSegmentId && router.push(`/user-insight/segments/${savedSegmentId}`)">
      分群保存成功，可前往用户分群模块查看和编辑。
    </n-modal>
  </main>
</template>

<style scoped lang="scss">
.multidim-page {
  min-height: 100%;
  padding: 24px;
  color: #1f2937;
}

.page-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;

  h1 {
    margin: 0;
    font-size: 24px;
    line-height: 1.35;
    font-weight: 700;
  }

  p {
    margin: 6px 0 0;
    color: #6b7280;
  }
}

.intro-card {
  background: #ffffff;
}

.intro-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
  gap: 24px;
  align-items: center;

  h2 {
    margin: 0 0 10px;
    font-size: 22px;
  }

  p {
    max-width: 680px;
    color: #4b5563;
  }
}

.highlight-list {
  display: grid;
  gap: 10px;

  div {
    padding: 12px 14px;
    border-left: 3px solid #2563eb;
    background: #f8fafc;
    border-radius: 6px;
  }
}

.filter-card,
.summary-card,
.interpretation-card {
  background: #fff;
}

.filter-one-line {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  white-space: nowrap;
}

.filter-search-group {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.search-input {
  width: 280px;
  flex: 0 0 280px;
}

.filter-checks {
  display: flex;
  align-items: center;
  gap: 18px;
  flex: 0 0 auto;
}

.filter-select {
  width: 180px;
  flex: 0 0 180px;
}

.table-actions {
  white-space: nowrap;
}

.tag-picker {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.tag-picker-toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 14px;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
}

.tag-search-input {
  width: 360px;
  max-width: 100%;
}

.tag-picker-body {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr) 260px;
  min-height: 420px;
}

.tag-directory-panel,
.selected-tag-panel {
  padding: 12px;
  background: #fbfdff;
}

.tag-directory-panel {
  border-right: 1px solid #e5e7eb;
  overflow-y: auto;
}

.tag-directory-button {
  width: 100%;
  border: 0;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  padding: 9px 10px;
  border-radius: 6px;
  color: #374151;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.tag-directory-button:hover,
.tag-directory-button.active {
  color: #0f9f5a;
  background: #ecfdf5;
}

.tag-result-panel {
  min-width: 0;
  padding: 12px 14px;
}

.tag-result-header,
.tag-group-header,
.selected-tag-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.tag-result-header {
  padding-bottom: 10px;
  color: #64748b;
}

.tag-group-list {
  display: grid;
  gap: 12px;
  max-height: 520px;
  overflow-y: auto;
  padding-right: 4px;
}

.tag-group {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.tag-group-header {
  padding: 10px 12px;
  background: #f8fafc;

  span {
    margin-left: 8px;
    color: #64748b;
    font-size: 12px;
  }
}

.tag-row-list {
  display: grid;
}

.tag-row {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  padding: 10px 12px;
  border-top: 1px solid #eef2f7;
}

.tag-row.selected {
  background: #f0fdf4;
}

.tag-row.disabled {
  color: #9ca3af;
  background: #fafafa;
}

.tag-row-main {
  min-width: 0;
}

.tag-row-title {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.tag-row-meta {
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
}

.selected-tag-panel {
  border-left: 1px solid #e5e7eb;
}

.selected-tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-content: flex-start;
  max-height: 470px;
  overflow-y: auto;
  padding-top: 12px;
}

.tag-empty {
  padding: 80px 0;
}

.small-input {
  width: 220px;
}

.number-input {
  width: 130px;
}

.inline-alert {
  margin-top: 10px;
}

.negative-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}

.subject-desc {
  margin-top: 16px;
}

.state-alert {
  margin-top: 0;
}

.state-card {
  display: grid;
  justify-items: center;
  gap: 12px;
  padding: 42px 20px;
  text-align: center;

  h2 {
    margin: 0;
    font-size: 20px;
  }

  p {
    margin: 0;
    color: #6b7280;
  }
}

.state-card.failed {
  border-top: 3px solid #dc2626;
}

.section-title-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 16px;

  h2 {
    margin: 0;
    font-size: 18px;
    line-height: 1.4;
  }

  p {
    margin: 4px 0 0;
    color: #6b7280;
  }
}

.interpretation-content {
  display: grid;
  gap: 16px;
}

.lead-text {
  font-size: 16px;
  font-weight: 600;
}

.combo-filter-bar {
  margin-bottom: 12px;
}

.pagination-row {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
}

.empty-block {
  padding: 36px 0 20px;
}

.modal-card {
  width: min(760px, calc(100vw - 48px));
}

@media (max-width: 900px) {
  .multidim-page {
    padding: 16px;
  }

  .page-header,
  .section-title-row {
    flex-direction: column;
  }

  .filter-one-line {
    align-items: stretch;
    flex-wrap: wrap;
    white-space: normal;
  }

  .filter-search-group .search-input {
    flex: 1;
  }

  .filter-select {
    flex: 1 1 180px;
  }

  .tag-picker-body {
    grid-template-columns: 1fr;
  }

  .tag-directory-panel,
  .selected-tag-panel {
    border: 0;
  }

  .intro-grid {
    grid-template-columns: 1fr;
  }
}
</style>
