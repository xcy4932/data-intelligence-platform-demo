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
import type { DataTableColumns, DataTableRowKey, SelectOption, TagProps } from 'naive-ui'
import { computed, h, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { analysisCenterService } from '@/services/analysisCenterService'
import type {
  AnalysisAssetStatus,
  AnalysisCenterSpace,
  SavedAnalysisAsset,
  SavedAnalysisFilters,
  SavedAnalysisViewMode,
  ShareAssetPayload,
  SharePrincipal,
  SpaceCreatePayload,
} from '@/types/analysisCenter'
import type { SavedAnalysisType, SavedAnalysisVisibility } from '@/types/eventAnalysis'

const router = useRouter()
const loading = ref(false)
const actionNotice = ref('')
const items = ref<SavedAnalysisAsset[]>([])
const availableTags = ref<string[]>([])
const viewMode = ref<SavedAnalysisViewMode>('card')
const checkedRowKeys = ref<DataTableRowKey[]>([])
const renameModalVisible = ref(false)
const spaceModalVisible = ref(false)
const shareModalVisible = ref(false)
const renamingItem = ref<SavedAnalysisAsset | null>(null)
const sharingItem = ref<SavedAnalysisAsset | null>(null)
const renameValue = ref('')
const spaces = ref<AnalysisCenterSpace[]>([])
const shareMembers = ref<SharePrincipal[]>([])
const shareTeams = ref<SharePrincipal[]>([])
const sharedMembers = ref<SharePrincipal[]>([])
const sharedTeams = ref<SharePrincipal[]>([])
const spaceDraft = ref<SpaceCreatePayload>({
  name: '',
  type: 'team',
  description: '',
})
const editingSpaceId = ref('')
const editingSpaceName = ref('')
const shareDraft = ref<ShareAssetPayload>({
  assetId: '',
  assetType: 'saved_analysis',
  visibility: 'team',
  targetSpaceId: 'space-team-operation',
  allowCopy: true,
  addMemberIds: [],
  addTeamIds: [],
  removeMemberIds: [],
  removeTeamIds: [],
})
const shareLink = ref('')
const filters = ref<SavedAnalysisFilters>({
  keyword: '',
  analysisType: 'all',
  visibility: 'all',
  owner: 'all',
  tags: [],
  updatedAt: 'all',
  status: 'all',
  sortMode: 'updated_desc',
})

let searchTimer: number | undefined

const analysisTypeLabelMap: Record<SavedAnalysisType, string> = {
  event: '事件分析',
  retention: '留存分析',
  funnel: '漏斗分析',
  distribution: '分布分析',
  path: '路径分析',
  attribution: '归因分析',
  ltv: 'LTV 分析',
  interval: '间隔分析',
}

const visibilityLabelMap: Record<SavedAnalysisVisibility, string> = {
  private: '仅自己可见',
  team: '团队可见',
  public: '公共可见',
}

const statusLabelMap: Record<AnalysisAssetStatus, string> = {
  normal: '正常',
  invalid: '配置失效',
  no_permission: '无权限',
  archived: '已归档',
}

const analysisTypeOptions: SelectOption[] = [
  { label: '全部类型', value: 'all' },
  ...Object.entries(analysisTypeLabelMap).map(([value, label]) => ({ label, value })),
]

const visibilityOptions: SelectOption[] = [
  { label: '全部可见范围', value: 'all' },
  { label: '仅自己可见', value: 'private' },
  { label: '团队可见', value: 'team' },
  { label: '公共可见', value: 'public' },
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

const tagOptions = computed<SelectOption[]>(() =>
  availableTags.value.map((tag) => ({
    label: tag,
    value: tag,
  })),
)

const selectedCount = computed(() => checkedRowKeys.value.length)
const spaceOptions = computed<SelectOption[]>(() =>
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
    const result = await analysisCenterService.getSavedAnalysisList(filters.value)
    items.value = result.items
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

const getStatusTagType = (status: AnalysisAssetStatus): TagProps['type'] => {
  if (status === 'invalid') {
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

const getVisibilityTagType = (visibility: SavedAnalysisVisibility): TagProps['type'] => {
  if (visibility === 'public') {
    return 'warning'
  }

  if (visibility === 'team') {
    return 'info'
  }

  return 'default'
}

const formatUpdatedAt = (value: string): string => value.replace('T', ' ').slice(0, 16)

const openSavedAnalysis = (item: SavedAnalysisAsset): void => {
  const routeMap: Record<SavedAnalysisType, string> = {
    event: '/data-insight/event-analysis',
    retention: '/data-insight/retention',
    funnel: '/data-insight/funnel',
    distribution: '/data-insight/distribution',
    path: '/data-insight/path',
    attribution: '/data-insight/attribution',
    ltv: '/data-insight/ltv',
    interval: '/data-insight/interval',
  }

  void router.push({
    path: routeMap[item.analysisType],
    query: { savedAnalysisId: item.id },
  })
}

const duplicateItem = async (item: SavedAnalysisAsset): Promise<void> => {
  const duplicated = await analysisCenterService.duplicateSavedAnalysis(item.id)
  actionNotice.value = `已复制为「${duplicated.name}」。`
  await loadList()
}

const toggleFavorite = async (item: SavedAnalysisAsset): Promise<void> => {
  const nextItem = await analysisCenterService.toggleSavedAnalysisFavorite(item.id)
  actionNotice.value = nextItem.favorite ? `已收藏「${nextItem.name}」。` : `已取消收藏「${nextItem.name}」。`
  await loadList()
}

const requestRename = (item: SavedAnalysisAsset): void => {
  renamingItem.value = item
  renameValue.value = item.name
  renameModalVisible.value = true
}

const requestShare = (item: SavedAnalysisAsset): void => {
  void loadShareMeta('saved_analysis', item.id)
  sharingItem.value = item
  shareLink.value = ''
  shareDraft.value = {
    assetId: item.id,
    assetType: 'saved_analysis',
    visibility: item.visibility,
    targetSpaceId: item.spaceId,
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
  if (!sharingItem.value) {
    return
  }

  const result = await analysisCenterService.shareAsset(shareDraft.value)
  if (shareDraft.value.targetSpaceId && shareDraft.value.targetSpaceId !== sharingItem.value.spaceId) {
    await analysisCenterService.moveSavedAnalysisToSpace(sharingItem.value.id, shareDraft.value.targetSpaceId)
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
  if (!renamingItem.value || !renameValue.value.trim()) {
    return
  }

  const renamed = await analysisCenterService.renameSavedAnalysis(renamingItem.value.id, renameValue.value.trim())
  actionNotice.value = `已重命名为「${renamed.name}」。`
  renameModalVisible.value = false
  await loadList()
}

const deleteItem = async (item: SavedAnalysisAsset): Promise<void> => {
  const result = await analysisCenterService.deleteSavedAnalysis(item.id)
  actionNotice.value = result.message
  await loadList()
}

const batchDelete = async (): Promise<void> => {
  const ids = checkedRowKeys.value.map(String)

  await Promise.all(ids.map((id) => analysisCenterService.deleteSavedAnalysis(id)))
  checkedRowKeys.value = []
  actionNotice.value = `已删除 ${ids.length} 个保存分析。`
  await loadList()
}

const columns = computed<DataTableColumns<SavedAnalysisAsset>>(() => [
  { type: 'selection' },
  {
    title: '分析名称',
    key: 'name',
    minWidth: 220,
    sorter: (rowA, rowB) => rowA.name.localeCompare(rowB.name, 'zh-CN'),
    render: (row) =>
      h(NButton, { text: true, type: 'primary', onClick: () => openSavedAnalysis(row) }, () => row.name),
  },
  {
    title: '分析类型',
    key: 'analysisType',
    width: 110,
    render: (row) => analysisTypeLabelMap[row.analysisType],
  },
  { title: '描述', key: 'description', minWidth: 220 },
  { title: '所属空间', key: 'spaceName', width: 110 },
  {
    title: '可见范围',
    key: 'visibility',
    width: 120,
    render: (row) =>
      h(NTag, { size: 'small', type: getVisibilityTagType(row.visibility) }, () => visibilityLabelMap[row.visibility]),
  },
  { title: '创建人', key: 'ownerName', width: 120 },
  {
    title: '标签',
    key: 'tags',
    minWidth: 180,
    render: (row) =>
      h(NSpace, { size: 4 }, () => row.tags.map((tag) => h(NTag, { size: 'small' }, () => tag))),
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) =>
      h(NTag, { size: 'small', type: getStatusTagType(row.status) }, () => statusLabelMap[row.status]),
  },
  {
    title: '更新时间',
    key: 'updatedAt',
    width: 150,
    sorter: (rowA, rowB) => rowA.updatedAt.localeCompare(rowB.updatedAt),
    render: (row) => formatUpdatedAt(row.updatedAt),
  },
  {
    title: '操作',
    key: 'actions',
    fixed: 'right',
    width: 290,
    render: (row) =>
      h(NSpace, { size: 6 }, () => [
        h(NButton, { size: 'tiny', type: 'primary', text: true, onClick: () => openSavedAnalysis(row) }, () => '打开'),
        h(NButton, { size: 'tiny', text: true, onClick: () => duplicateItem(row) }, () => '复制'),
        h(NButton, { size: 'tiny', text: true, onClick: () => requestRename(row) }, () => '重命名'),
        h(NButton, { size: 'tiny', text: true, onClick: () => requestShare(row) }, () => '分享'),
        h(NButton, { size: 'tiny', text: true, type: 'error', onClick: () => deleteItem(row) }, () => '删除'),
      ]),
  },
])

onMounted(() => {
  void loadList()
  void loadSpaces()
})
</script>

<template>
  <div class="page-container analysis-center-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">保存分析</h1>
        <p class="page-description">
          管理你在事件分析、留存分析、漏斗分析、分布分析等模块中保存的查询配置。
        </p>
      </div>
      <n-space>
        <n-button size="small" @click="loadList">刷新</n-button>
        <n-button size="small" secondary @click="openSpaceModal">管理空间</n-button>
      </n-space>
    </div>

    <n-alert v-if="actionNotice" type="success" :show-icon="false" class="notice-alert">
      {{ actionNotice }}
    </n-alert>

    <n-card :bordered="false" class="filter-card">
      <n-grid :cols="6" :x-gap="10" :y-gap="10">
        <n-gi :span="2">
          <n-input v-model:value="filters.keyword" clearable placeholder="搜索分析名称、描述或标签" />
        </n-gi>
        <n-gi>
          <n-select v-model:value="filters.analysisType" :options="analysisTypeOptions" />
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
              { label: '配置失效', value: 'invalid' },
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
        <n-button size="small" :disabled="selectedCount === 0" @click="batchDelete">批量删除</n-button>
        <n-button size="small" :disabled="selectedCount === 0">批量移动</n-button>
      </n-space>
      <n-select v-model:value="filters.sortMode" :options="sortOptions" size="small" class="sort-select" />
    </div>

    <n-spin :show="loading">
      <template v-if="items.length">
        <div v-if="viewMode === 'card'" class="analysis-card-grid">
          <n-card v-for="item in items" :key="item.id" :bordered="false" class="analysis-card">
            <div class="analysis-card-header">
              <div>
                <h3>{{ item.name }}</h3>
                <n-space :size="6">
                  <n-tag size="small" type="info">{{ analysisTypeLabelMap[item.analysisType] }}</n-tag>
                  <n-tag size="small" :type="getVisibilityTagType(item.visibility)">
                    {{ visibilityLabelMap[item.visibility] }}
                  </n-tag>
                  <n-tag size="small" :type="getStatusTagType(item.status)">
                    {{ statusLabelMap[item.status] }}
                  </n-tag>
                </n-space>
              </div>
              <n-button text @click="toggleFavorite(item)">{{ item.favorite ? '★' : '☆' }}</n-button>
            </div>
            <p class="analysis-description">{{ item.summary }}</p>
            <div class="config-summary">
              <span>所属空间：{{ item.spaceName }}</span>
              <span>指标：{{ item.metricSummary.join('、') }}</span>
              <span>筛选：{{ item.filterSummary.join('、') }}</span>
              <span>图表：{{ item.chartSummary }}</span>
            </div>
            <n-alert v-if="item.status === 'invalid'" type="error" :show-icon="false" class="invalid-alert">
              {{ item.invalidReasons?.join('；') }}
            </n-alert>
            <div class="analysis-card-footer">
              <div>
                <span>{{ formatUpdatedAt(item.updatedAt) }}</span>
                <span>创建人：{{ item.ownerName }}</span>
              </div>
              <n-space :size="8">
                <n-button size="small" type="primary" @click="openSavedAnalysis(item)">打开</n-button>
                <n-button size="small" @click="duplicateItem(item)">复制</n-button>
                <n-button size="small" @click="requestRename(item)">重命名</n-button>
                <n-button size="small" @click="requestShare(item)">分享</n-button>
                <n-button size="small" type="error" secondary @click="deleteItem(item)">删除</n-button>
              </n-space>
            </div>
          </n-card>
        </div>

        <n-data-table
          v-else
          v-model:checked-row-keys="checkedRowKeys"
          :columns="columns"
          :data="items"
          :row-key="(row) => row.id"
          :pagination="{ pageSize: 8 }"
          :scroll-x="1580"
          size="small"
        />
      </template>
      <n-empty v-else description="未找到匹配的保存分析。" />
    </n-spin>

    <n-modal v-model:show="renameModalVisible" preset="card" title="重命名保存分析" class="small-modal">
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

    <n-modal v-model:show="shareModalVisible" preset="card" title="分享保存分析" class="small-modal">
      <n-space vertical>
        <n-alert type="info" :show-icon="false">
          分享对象：{{ sharingItem?.name }}
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
        <n-select v-model:value="shareDraft.targetSpaceId" :options="spaceOptions" placeholder="目标空间" />
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
.analysis-center-page {
  display: grid;
  gap: 16px;
}

.page-header,
.toolbar-row,
.analysis-card-header,
.analysis-card-footer {
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

.analysis-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.analysis-card h3 {
  margin: 0 0 8px;
  color: #111827;
  font-size: 16px;
}

.analysis-description {
  margin: 12px 0;
  color: #4b5563;
  font-size: 13px;
  line-height: 1.7;
}

.config-summary {
  display: grid;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f8fafc;
  color: #6b7280;
  font-size: 12px;
}

.invalid-alert {
  margin-top: 10px;
}

.analysis-card-footer {
  margin-top: 14px;
}

.analysis-card-footer div {
  display: grid;
  gap: 4px;
  color: #6b7280;
  font-size: 12px;
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
