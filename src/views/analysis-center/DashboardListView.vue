<script setup lang="ts">
import {
  NAlert,
  NButton,
  NCard,
  NDataTable,
  NEmpty,
  NGi,
  NGrid,
  NInput,
  NModal,
  NSelect,
  NSpace,
  NSpin,
  NTag,
} from 'naive-ui'
import type { DataTableColumns, SelectOption, TagProps } from 'naive-ui'
import { computed, h, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { analysisCenterService } from '@/services/analysisCenterService'
import type {
  AnalysisCenterSpace,
  DashboardAsset,
  DashboardAssetStatus,
  DashboardCreatePayload,
  DashboardFilters,
  DashboardLayoutTemplate,
  SavedAnalysisViewMode,
  ShareAssetPayload,
  SharePrincipal,
  SpaceCreatePayload,
} from '@/types/analysisCenter'

const router = useRouter()
const loading = ref(false)
const actionNotice = ref('')
const dashboards = ref<DashboardAsset[]>([])
const availableTags = ref<string[]>([])
const viewMode = ref<SavedAnalysisViewMode>('card')
const createModalVisible = ref(false)
const renameModalVisible = ref(false)
const spaceModalVisible = ref(false)
const shareModalVisible = ref(false)
const renamingDashboard = ref<DashboardAsset | null>(null)
const sharingDashboard = ref<DashboardAsset | null>(null)
const renameValue = ref('')
const spaces = ref<AnalysisCenterSpace[]>([])
const shareMembers = ref<SharePrincipal[]>([])
const shareTeams = ref<SharePrincipal[]>([])
const sharedMembers = ref<SharePrincipal[]>([])
const sharedTeams = ref<SharePrincipal[]>([])
const createDraft = ref<DashboardCreatePayload>({
  name: '',
  description: '',
  spaceType: 'personal',
  spaceId: 'space-personal',
  visibility: 'private',
  layoutTemplate: 'blank',
  tags: [],
})
const spaceDraft = ref<SpaceCreatePayload>({
  name: '',
  type: 'team',
  description: '',
})
const editingSpaceId = ref('')
const editingSpaceName = ref('')
const shareDraft = ref<ShareAssetPayload>({
  assetId: '',
  assetType: 'dashboard',
  visibility: 'team',
  targetSpaceId: 'space-team-operation',
  allowCopy: true,
  addMemberIds: [],
  addTeamIds: [],
  removeMemberIds: [],
  removeTeamIds: [],
})
const shareLink = ref('')
const filters = ref<DashboardFilters>({
  keyword: '',
  spaceType: 'all',
  visibility: 'all',
  owner: 'all',
  tags: [],
  updatedAt: 'all',
  status: 'all',
  sortMode: 'updated_desc',
})

let searchTimer: number | undefined

const spaceTypeLabelMap: Record<DashboardAsset['spaceType'], string> = {
  personal: '个人空间',
  team: '团队空间',
  public: '公共空间',
}

const visibilityLabelMap: Record<DashboardAsset['visibility'], string> = {
  private: '仅自己可见',
  team: '团队可见',
  public: '公开',
}

const statusLabelMap: Record<DashboardAssetStatus, string> = {
  normal: '正常',
  has_error_widget: '组件异常',
  no_permission: '无权限',
  archived: '已归档',
}

const layoutTemplateLabelMap: Record<DashboardLayoutTemplate, string> = {
  blank: '空白看板',
  operation_monitoring: '运营监控模板',
  retention_analysis: '留存分析模板',
  experiment_review: '实验复盘模板',
  executive_overview: '管理层概览模板',
}

const spaceTypeOptions: SelectOption[] = [
  { label: '全部空间', value: 'all' },
  { label: '个人空间', value: 'personal' },
  { label: '团队空间', value: 'team' },
  { label: '公共空间', value: 'public' },
]

const visibilityOptions: SelectOption[] = [
  { label: '全部可见范围', value: 'all' },
  { label: '仅自己', value: 'private' },
  { label: '团队可见', value: 'team' },
  { label: '公开', value: 'public' },
]

const createVisibilityOptions: SelectOption[] = [
  { label: '仅自己可见', value: 'private' },
  { label: '团队成员可见', value: 'team' },
  { label: '公开', value: 'public', disabled: true },
]

const ownerOptions: SelectOption[] = [
  { label: '全部创建人', value: 'all' },
  { label: '我创建的', value: 'me' },
  { label: '团队成员创建的', value: 'team' },
]

const updatedOptions: SelectOption[] = [
  { label: '全部时间', value: 'all' },
  { label: '今天', value: 'today' },
  { label: '最近 7 天', value: 'last_7_days' },
  { label: '最近 30 天', value: 'last_30_days' },
]

const sortOptions: SelectOption[] = [
  { label: '最近更新优先', value: 'updated_desc' },
  { label: '最早更新优先', value: 'updated_asc' },
  { label: '名称 A-Z', value: 'name_asc' },
]

const layoutTemplateOptions: SelectOption[] = Object.entries(layoutTemplateLabelMap).map(([value, label]) => ({
  label,
  value,
}))

const tagOptions = computed<SelectOption[]>(() =>
  availableTags.value.map((tag) => ({
    label: tag,
    value: tag,
  })),
)
const writableSpaceOptions = computed<SelectOption[]>(() =>
  spaces.value.map((space) => ({
    label: `${space.name} · ${space.type === 'team' ? '团队' : space.type === 'public' ? '公共' : '个人'}`,
    value: space.id,
    disabled: !space.canWrite,
  })),
)
const shareMemberOptions = computed<SelectOption[]>(() =>
  shareMembers.value.map((member) => ({
    label: `${member.name} · ${member.description ?? '成员'}`,
    value: member.id,
  })),
)
const shareTeamOptions = computed<SelectOption[]>(() =>
  shareTeams.value.map((team) => ({
    label: `${team.name} · ${team.description ?? '团队'}`,
    value: team.id,
  })),
)
const currentSharedMemberOptions = computed<SelectOption[]>(() =>
  sharedMembers.value.map((member) => ({ label: member.name, value: member.id })),
)
const currentSharedTeamOptions = computed<SelectOption[]>(() =>
  sharedTeams.value.map((team) => ({ label: team.name, value: team.id })),
)

const loadList = async (): Promise<void> => {
  loading.value = true

  try {
    const result = await analysisCenterService.getDashboardList(filters.value)
    dashboards.value = result.items
    availableTags.value = result.tags
  } finally {
    loading.value = false
  }
}

const loadSpaces = async (): Promise<void> => {
  spaces.value = await analysisCenterService.getSpaces()
}

const scheduleLoad = (): void => {
  window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    void loadList()
  }, 300)
}

watch(
  filters,
  () => scheduleLoad(),
  { deep: true },
)

const formatTime = (value: string): string => value.replace('T', ' ').slice(0, 16)

const getStatusTagType = (status: DashboardAssetStatus): TagProps['type'] => {
  if (status === 'has_error_widget') {
    return 'error'
  }

  if (status === 'no_permission') {
    return 'warning'
  }

  if (status === 'archived') {
    return 'default'
  }

  return 'success'
}

const getVisibilityTagType = (visibility: DashboardAsset['visibility']): TagProps['type'] => {
  if (visibility === 'public') {
    return 'warning'
  }

  if (visibility === 'team') {
    return 'info'
  }

  return 'default'
}

const openDashboard = (dashboard: DashboardAsset, mode?: 'edit'): void => {
  void router.push({
    path: `/analysis-center/dashboards/${dashboard.id}`,
    query: mode ? { mode } : undefined,
  })
}

const duplicateDashboard = async (dashboard: DashboardAsset): Promise<void> => {
  const duplicated = await analysisCenterService.duplicateDashboard(dashboard.id)
  actionNotice.value = `已复制为「${duplicated.name}」。`
  await loadList()
}

const deleteDashboard = async (dashboard: DashboardAsset): Promise<void> => {
  const result = await analysisCenterService.deleteDashboard(dashboard.id)
  actionNotice.value = result.message
  await loadList()
}

const requestRename = (dashboard: DashboardAsset): void => {
  renamingDashboard.value = dashboard
  renameValue.value = dashboard.name
  renameModalVisible.value = true
}

const requestShare = (dashboard: DashboardAsset): void => {
  void loadShareMeta('dashboard', dashboard.id)
  sharingDashboard.value = dashboard
  shareLink.value = ''
  shareDraft.value = {
    assetId: dashboard.id,
    assetType: 'dashboard',
    visibility: dashboard.visibility,
    targetSpaceId: dashboard.spaceId,
    allowCopy: true,
    addMemberIds: [],
    addTeamIds: [],
    removeMemberIds: [],
    removeTeamIds: [],
  }
  shareModalVisible.value = true
}

const loadShareMeta = async (assetType: ShareAssetPayload['assetType'], assetId: string): Promise<void> => {
  const [options, grants] = await Promise.all([
    analysisCenterService.getShareOptions(),
    analysisCenterService.getAssetShareGrants(assetType, assetId),
  ])
  shareMembers.value = options.members
  shareTeams.value = options.teams
  sharedMembers.value = grants.sharedMembers
  sharedTeams.value = grants.sharedTeams
}

const submitShare = async (): Promise<void> => {
  if (!sharingDashboard.value) {
    return
  }

  const result = await analysisCenterService.shareAsset(shareDraft.value)
  if (shareDraft.value.targetSpaceId && shareDraft.value.targetSpaceId !== sharingDashboard.value.spaceId) {
    await moveDashboardToSpace(sharingDashboard.value, shareDraft.value.targetSpaceId)
  }
  shareLink.value = result.shareLink
  sharedMembers.value = result.sharedMembers
  sharedTeams.value = result.sharedTeams
  shareDraft.value.addMemberIds = []
  shareDraft.value.addTeamIds = []
  shareDraft.value.removeMemberIds = []
  shareDraft.value.removeTeamIds = []
  actionNotice.value = result.message
  await loadList()
}

const openSpaceModal = async (): Promise<void> => {
  await loadSpaces()
  spaceModalVisible.value = true
}

const submitCreateSpace = async (): Promise<void> => {
  if (!spaceDraft.value.name.trim()) {
    actionNotice.value = '请输入空间名称。'
    return
  }

  const space = await analysisCenterService.createSpace({
    ...spaceDraft.value,
    name: spaceDraft.value.name.trim(),
  })
  actionNotice.value = `已创建空间「${space.name}」。`
  spaceDraft.value = { name: '', type: 'team', description: '' }
  await loadSpaces()
}

const startRenameSpace = (space: AnalysisCenterSpace): void => {
  editingSpaceId.value = space.id
  editingSpaceName.value = space.name
}

const submitRenameSpace = async (): Promise<void> => {
  if (!editingSpaceId.value || !editingSpaceName.value.trim()) {
    return
  }

  const space = await analysisCenterService.renameSpace(editingSpaceId.value, editingSpaceName.value.trim())
  actionNotice.value = `已重命名空间为「${space.name}」。`
  editingSpaceId.value = ''
  editingSpaceName.value = ''
  await Promise.all([loadSpaces(), loadList()])
}

const deleteSpace = async (space: AnalysisCenterSpace): Promise<void> => {
  const result = await analysisCenterService.deleteSpace(space.id)
  actionNotice.value = result.message
  await loadSpaces()
}

const submitRename = async (): Promise<void> => {
  if (!renamingDashboard.value || !renameValue.value.trim()) {
    return
  }

  const renamed = await analysisCenterService.renameDashboard(renamingDashboard.value.id, renameValue.value.trim())
  actionNotice.value = `已重命名为「${renamed.name}」。`
  renameModalVisible.value = false
  await loadList()
}

const submitCreateDashboard = async (): Promise<void> => {
  if (!createDraft.value.name.trim()) {
    actionNotice.value = '请输入看板名称'
    return
  }

  if (createDraft.value.name.trim().length > 50) {
    actionNotice.value = '看板名称不能超过 50 个字符'
    return
  }

  const dashboard = await analysisCenterService.createDashboard({
    ...createDraft.value,
    name: createDraft.value.name.trim(),
  })
  createModalVisible.value = false
  actionNotice.value = `看板「${dashboard.name}」已创建。`
  void router.push(`/analysis-center/dashboards/${dashboard.id}?mode=edit`)
}

const updateCreateSpace = (spaceId: string): void => {
  const space = spaces.value.find((item) => item.id === spaceId)

  createDraft.value.spaceId = spaceId
  createDraft.value.spaceType = space?.type ?? 'personal'
  createDraft.value.visibility = space?.type === 'team' ? 'team' : space?.type === 'public' ? 'public' : 'private'
}

const moveDashboardToSpace = async (dashboard: DashboardAsset, spaceId: string): Promise<void> => {
  const moved = await analysisCenterService.moveDashboardToSpace(dashboard.id, spaceId)
  actionNotice.value = `已移动「${moved.name}」到「${moved.spaceName}」。`
  await Promise.all([loadSpaces(), loadList()])
}

const columns = computed<DataTableColumns<DashboardAsset>>(() => [
  {
    title: '看板名称',
    key: 'name',
    minWidth: 220,
    sorter: (rowA, rowB) => rowA.name.localeCompare(rowB.name, 'zh-CN'),
    render: (row) => h(NButton, { text: true, type: 'primary', onClick: () => openDashboard(row) }, () => row.name),
  },
  {
    title: '所属空间',
    key: 'spaceName',
    width: 130,
    render: (row) => row.spaceName,
  },
  {
    title: '可见范围',
    key: 'visibility',
    width: 120,
    render: (row) =>
      h(NTag, { size: 'small', type: getVisibilityTagType(row.visibility) }, () => visibilityLabelMap[row.visibility]),
  },
  { title: '描述', key: 'description', minWidth: 240 },
  { title: '组件数量', key: 'widgetCount', width: 100, sorter: (rowA, rowB) => rowA.widgetCount - rowB.widgetCount },
  {
    title: '最近刷新',
    key: 'lastRefreshedAt',
    width: 150,
    sorter: (rowA, rowB) => rowA.lastRefreshedAt.localeCompare(rowB.lastRefreshedAt),
    render: (row) => formatTime(row.lastRefreshedAt),
  },
  { title: '创建人', key: 'ownerName', width: 120 },
  {
    title: '标签',
    key: 'tags',
    minWidth: 180,
    render: (row) => h(NSpace, { size: 4 }, () => row.tags.map((tag) => h(NTag, { size: 'small' }, () => tag))),
  },
  {
    title: '状态',
    key: 'status',
    width: 110,
    render: (row) =>
      h(NTag, { size: 'small', type: getStatusTagType(row.status) }, () =>
        row.status === 'has_error_widget' ? `${row.errorWidgetCount} 个组件异常` : statusLabelMap[row.status],
      ),
  },
  {
    title: '操作',
    key: 'actions',
    fixed: 'right',
    width: 280,
    render: (row) =>
      h(NSpace, { size: 6 }, () => [
        h(NButton, { size: 'tiny', text: true, type: 'primary', onClick: () => openDashboard(row) }, () => '打开'),
        h(NButton, { size: 'tiny', text: true, onClick: () => openDashboard(row, 'edit') }, () => '编辑'),
        h(NButton, { size: 'tiny', text: true, onClick: () => duplicateDashboard(row) }, () => '复制'),
        h(NButton, { size: 'tiny', text: true, onClick: () => requestRename(row) }, () => '重命名'),
        h(NButton, { size: 'tiny', text: true, onClick: () => requestShare(row) }, () => '分享'),
        h(NButton, { size: 'tiny', text: true, type: 'error', onClick: () => deleteDashboard(row) }, () => '删除'),
      ]),
  },
])

onMounted(() => {
  void loadList()
  void loadSpaces()
})
</script>

<template>
  <div class="page-container dashboard-list-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">数据看板</h1>
        <p class="page-description">管理你保存的数据概览和长期监控看板。</p>
      </div>
      <n-space>
        <n-button size="small" @click="loadList">刷新</n-button>
        <n-button size="small" secondary @click="openSpaceModal">管理空间</n-button>
        <n-button size="small" type="primary" @click="createModalVisible = true">新建看板</n-button>
      </n-space>
    </div>

    <n-alert v-if="actionNotice" type="success" :show-icon="false" class="notice-alert">
      {{ actionNotice }}
    </n-alert>

    <n-card :bordered="false" class="filter-card">
      <n-grid :cols="6" :x-gap="10" :y-gap="10">
        <n-gi :span="2">
          <n-input v-model:value="filters.keyword" clearable placeholder="搜索看板名称 / 描述" />
        </n-gi>
        <n-gi>
          <n-select v-model:value="filters.spaceType" :options="spaceTypeOptions" />
        </n-gi>
        <n-gi>
          <n-select v-model:value="filters.visibility" :options="visibilityOptions" />
        </n-gi>
        <n-gi>
          <n-select v-model:value="filters.owner" :options="ownerOptions" />
        </n-gi>
        <n-gi>
          <n-select v-model:value="filters.updatedAt" :options="updatedOptions" />
        </n-gi>
        <n-gi :span="2">
          <n-select v-model:value="filters.tags" :options="tagOptions" multiple clearable placeholder="标签筛选" />
        </n-gi>
        <n-gi>
          <n-select
            v-model:value="filters.status"
            :options="[
              { label: '全部状态', value: 'all' },
              { label: '正常', value: 'normal' },
              { label: '组件异常', value: 'has_error_widget' },
              { label: '无权限', value: 'no_permission' },
              { label: '已归档', value: 'archived' },
            ]"
          />
        </n-gi>
      </n-grid>
    </n-card>

    <div class="toolbar-row">
      <n-space>
        <n-button :type="viewMode === 'card' ? 'primary' : 'default'" size="small" @click="viewMode = 'card'">卡片视图</n-button>
        <n-button :type="viewMode === 'table' ? 'primary' : 'default'" size="small" @click="viewMode = 'table'">表格视图</n-button>
      </n-space>
      <n-select v-model:value="filters.sortMode" :options="sortOptions" size="small" class="sort-select" />
    </div>

    <n-spin :show="loading">
      <template v-if="dashboards.length">
        <div v-if="viewMode === 'card'" class="dashboard-card-grid">
          <n-card v-for="dashboard in dashboards" :key="dashboard.id" :bordered="false" class="dashboard-card">
            <div class="dashboard-card-header">
              <div>
                <h3>{{ dashboard.name }}</h3>
                <n-space :size="6">
                  <n-tag size="small" type="info">{{ spaceTypeLabelMap[dashboard.spaceType] }}</n-tag>
                  <n-tag size="small">{{ dashboard.spaceName }}</n-tag>
                  <n-tag size="small" :type="getVisibilityTagType(dashboard.visibility)">
                    {{ visibilityLabelMap[dashboard.visibility] }}
                  </n-tag>
                  <n-tag size="small" :type="getStatusTagType(dashboard.status)">
                    {{ dashboard.status === 'has_error_widget' ? `${dashboard.errorWidgetCount} 个组件异常` : statusLabelMap[dashboard.status] }}
                  </n-tag>
                </n-space>
              </div>
            </div>
            <p class="dashboard-description">{{ dashboard.description }}</p>
            <div class="dashboard-summary">
              <span>组件数量：{{ dashboard.widgetCount }}</span>
              <span>最近刷新：{{ formatTime(dashboard.lastRefreshedAt) }}</span>
              <span>所属空间：{{ dashboard.spaceName }}</span>
              <span>创建人：{{ dashboard.ownerName }}</span>
            </div>
            <div class="tag-row">
              <n-tag v-for="tag in dashboard.tags" :key="tag" size="small">{{ tag }}</n-tag>
            </div>
            <div class="dashboard-card-footer">
              <n-space>
                <n-button size="small" type="primary" @click="openDashboard(dashboard)">打开</n-button>
                <n-button size="small" @click="openDashboard(dashboard, 'edit')">编辑</n-button>
                <n-button size="small" @click="duplicateDashboard(dashboard)">复制</n-button>
                <n-button size="small" @click="requestRename(dashboard)">重命名</n-button>
                <n-button size="small" @click="requestShare(dashboard)">分享</n-button>
                <n-button size="small" type="error" secondary @click="deleteDashboard(dashboard)">删除</n-button>
              </n-space>
            </div>
          </n-card>
        </div>

        <n-data-table
          v-else
          :columns="columns"
          :data="dashboards"
          :pagination="{ pageSize: 8 }"
          :scroll-x="1420"
          size="small"
        />
      </template>
      <n-empty v-else description="未找到匹配的数据看板。" />
    </n-spin>

    <n-modal v-model:show="createModalVisible" preset="card" title="新建看板" class="small-modal">
      <n-space vertical>
        <n-input v-model:value="createDraft.name" maxlength="50" show-count placeholder="看板名称" />
        <n-input v-model:value="createDraft.description" type="textarea" placeholder="看板描述" />
        <n-select
          :value="createDraft.spaceId"
          :options="writableSpaceOptions"
          placeholder="所属空间"
          @update:value="(value) => updateCreateSpace(String(value))"
        />
        <n-select v-model:value="createDraft.visibility" :options="createVisibilityOptions" placeholder="可见范围" />
        <n-select v-model:value="createDraft.layoutTemplate" :options="layoutTemplateOptions" placeholder="布局模板" />
        <n-select v-model:value="createDraft.tags" :options="tagOptions" multiple tag filterable placeholder="标签" />
        <n-space justify="end">
          <n-button @click="createModalVisible = false">取消</n-button>
          <n-button type="primary" @click="submitCreateDashboard">创建</n-button>
        </n-space>
      </n-space>
    </n-modal>

    <n-modal v-model:show="renameModalVisible" preset="card" title="重命名看板" class="small-modal">
      <n-space vertical>
        <n-input v-model:value="renameValue" maxlength="50" show-count placeholder="请输入新名称" />
        <n-space justify="end">
          <n-button @click="renameModalVisible = false">取消</n-button>
          <n-button type="primary" @click="submitRename">保存</n-button>
        </n-space>
      </n-space>
    </n-modal>

    <n-modal v-model:show="spaceModalVisible" preset="card" title="空间管理" class="space-modal">
      <n-space vertical>
        <n-card size="small" title="新建空间">
          <n-grid :cols="3" :x-gap="10" :y-gap="10">
            <n-gi>
              <n-input v-model:value="spaceDraft.name" placeholder="空间名称" />
            </n-gi>
            <n-gi>
              <n-select
                v-model:value="spaceDraft.type"
                :options="[
                  { label: '个人空间', value: 'personal' },
                  { label: '团队空间', value: 'team' },
                  { label: '公共空间', value: 'public', disabled: true },
                ]"
              />
            </n-gi>
            <n-gi>
              <n-button type="primary" block @click="submitCreateSpace">创建空间</n-button>
            </n-gi>
            <n-gi :span="3">
              <n-input v-model:value="spaceDraft.description" placeholder="空间说明" />
            </n-gi>
          </n-grid>
        </n-card>

        <div v-for="space in spaces" :key="space.id" class="space-row">
          <div>
            <strong>{{ space.name }}</strong>
            <span>{{ space.type === 'team' ? '团队空间' : space.type === 'public' ? '公共空间' : '个人空间' }} · {{ space.assetCount }} 个资产 · {{ space.ownerName }}</span>
          </div>
          <n-space>
            <n-input
              v-if="editingSpaceId === space.id"
              v-model:value="editingSpaceName"
              size="small"
              placeholder="新空间名称"
            />
            <n-button
              v-if="editingSpaceId === space.id"
              size="small"
              type="primary"
              @click="submitRenameSpace"
            >
              保存
            </n-button>
            <n-button v-else size="small" :disabled="!space.canWrite" @click="startRenameSpace(space)">重命名</n-button>
            <n-button size="small" type="error" secondary :disabled="!space.canDelete || space.assetCount > 0" @click="deleteSpace(space)">删除</n-button>
          </n-space>
        </div>
      </n-space>
    </n-modal>

    <n-modal v-model:show="shareModalVisible" preset="card" title="分享数据看板" class="small-modal">
      <n-space vertical>
        <n-alert type="info" :show-icon="false">
          分享对象：{{ sharingDashboard?.name }}
        </n-alert>
        <n-select
          v-model:value="shareDraft.visibility"
          :options="[
            { label: '仅自己可见', value: 'private' },
            { label: '团队成员可见', value: 'team' },
            { label: '公开访问', value: 'public' },
          ]"
          placeholder="可见范围"
        />
        <n-select v-model:value="shareDraft.targetSpaceId" :options="writableSpaceOptions" placeholder="目标空间" />
        <n-card size="small" title="新增分享对象">
          <n-space vertical>
            <n-select
              v-model:value="shareDraft.addMemberIds"
              :options="shareMemberOptions"
              multiple
              filterable
              clearable
              placeholder="选择一个或多个成员"
            />
            <n-select
              v-model:value="shareDraft.addTeamIds"
              :options="shareTeamOptions"
              multiple
              filterable
              clearable
              placeholder="选择一个或多个团队"
            />
          </n-space>
        </n-card>
        <n-card size="small" title="取消分享对象">
          <n-space vertical>
            <div class="share-current">
              <span>当前成员</span>
              <n-tag v-for="member in sharedMembers" :key="member.id" size="small">{{ member.name }}</n-tag>
            </div>
            <n-select
              v-model:value="shareDraft.removeMemberIds"
              :options="currentSharedMemberOptions"
              multiple
              clearable
              placeholder="选择要取消分享的成员"
            />
            <div class="share-current">
              <span>当前团队</span>
              <n-tag v-for="team in sharedTeams" :key="team.id" size="small" type="info">{{ team.name }}</n-tag>
            </div>
            <n-select
              v-model:value="shareDraft.removeTeamIds"
              :options="currentSharedTeamOptions"
              multiple
              clearable
              placeholder="选择要取消分享的团队"
            />
          </n-space>
        </n-card>
        <n-button type="primary" @click="submitShare">生成分享链接</n-button>
        <n-input v-if="shareLink" :value="shareLink" readonly />
        <n-space justify="end">
          <n-button @click="shareModalVisible = false">关闭</n-button>
        </n-space>
      </n-space>
    </n-modal>
  </div>
</template>

<style scoped lang="scss">
.dashboard-list-page {
  display: grid;
  gap: 16px;
}

.page-header,
.toolbar-row,
.dashboard-card-header,
.dashboard-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.notice-alert {
  margin: 0;
}

.sort-select {
  width: 160px;
}

.dashboard-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.dashboard-card h3 {
  margin: 0 0 8px;
  color: #111827;
  font-size: 16px;
}

.dashboard-description {
  margin: 12px 0;
  color: #4b5563;
  font-size: 13px;
  line-height: 1.7;
}

.dashboard-summary {
  display: grid;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f8fafc;
  color: #6b7280;
  font-size: 12px;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}

.dashboard-card-footer {
  margin-top: 14px;
}

.space-modal {
  width: 720px;
}

.space-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px;
  border: 1px solid #edf0f5;
  border-radius: 8px;
}

.space-row div:first-child {
  display: grid;
  gap: 4px;
}

.space-row span {
  color: #6b7280;
  font-size: 12px;
}

.share-current {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  color: #6b7280;
  font-size: 12px;
}
</style>
