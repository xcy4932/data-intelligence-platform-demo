<script setup lang="ts">
import {
  NAlert,
  NButton,
  NCard,
  NDataTable,
  NEmpty,
  NInput,
  NSelect,
  NSpace,
  NSpin,
  NTag,
} from 'naive-ui'
import type { DataTableColumns, SelectOption } from 'naive-ui'
import { computed, h, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { analysisCenterService } from '@/services/analysisCenterService'
import type { AnalysisCenterAssetItem, AnalysisCenterAssetType } from '@/types/analysisCenter'

type CollectionMode = 'recent' | 'favorites' | 'recycle'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const actionNotice = ref('')
const keyword = ref('')
const assetTypeFilter = ref<AnalysisCenterAssetType | 'all'>('all')
const items = ref<AnalysisCenterAssetItem[]>([])

const mode = computed<CollectionMode>(() => {
  if (route.path.includes('favorites')) {
    return 'favorites'
  }

  if (route.path.includes('recycle-bin')) {
    return 'recycle'
  }

  return 'recent'
})

const pageCopy = computed(() => {
  if (mode.value === 'favorites') {
    return {
      title: '收藏夹',
      description: '管理你主动收藏的重要保存分析和仪表盘。',
      empty: '暂无收藏内容。',
    }
  }

  if (mode.value === 'recycle') {
    return {
      title: '回收站',
      description: '恢复或永久删除被删除的分析资产。',
      empty: '回收站为空。',
    }
  }

  return {
    title: '最近访问',
    description: '快速回到近期使用的保存分析和仪表盘。',
    empty: '暂无最近访问记录。',
  }
})

const typeLabelMap: Record<AnalysisCenterAssetType, string> = {
  saved_analysis: '保存分析',
  dashboard: '仪表盘',
  dashboard_widget: '仪表盘组件',
  temporary_query: '临时查询',
}

const typeOptions: SelectOption[] = [
  { label: '全部类型', value: 'all' },
  { label: '保存分析', value: 'saved_analysis' },
  { label: '仪表盘', value: 'dashboard' },
  { label: '仪表盘组件', value: 'dashboard_widget' },
  { label: '临时查询', value: 'temporary_query' },
]

const filteredItems = computed(() => {
  const normalizedKeyword = keyword.value.trim().toLowerCase()

  return items.value.filter((item) => {
    const matchesKeyword =
      !normalizedKeyword ||
      item.assetName.toLowerCase().includes(normalizedKeyword) ||
      item.description.toLowerCase().includes(normalizedKeyword) ||
      item.tags.some((tag) => tag.toLowerCase().includes(normalizedKeyword))
    const matchesType = assetTypeFilter.value === 'all' || item.assetType === assetTypeFilter.value

    return matchesKeyword && matchesType
  })
})

const formatTime = (value?: string): string => value ? value.replace('T', ' ').slice(0, 16) : '-'

const getMainTime = (item: AnalysisCenterAssetItem): string => {
  if (mode.value === 'favorites') {
    return formatTime(item.favoritedAt)
  }

  if (mode.value === 'recycle') {
    return formatTime(item.deletedAt)
  }

  return formatTime(item.visitedAt)
}

const getRemainDays = (item: AnalysisCenterAssetItem): string => {
  if (!item.expireAt) {
    return '-'
  }

  const expireAt = new Date(item.expireAt).getTime()
  const now = new Date('2026-05-18T23:59:59+02:00').getTime()
  const days = Math.max(Math.ceil((expireAt - now) / 86400000), 0)

  return `${days} 天`
}

const loadItems = async (): Promise<void> => {
  loading.value = true

  try {
    if (mode.value === 'favorites') {
      items.value = await analysisCenterService.getFavorites()
    } else if (mode.value === 'recycle') {
      items.value = await analysisCenterService.getRecycleBin()
    } else {
      items.value = await analysisCenterService.getRecentVisits()
    }
  } finally {
    loading.value = false
  }
}

const openAsset = (item: AnalysisCenterAssetItem): void => {
  if (item.assetType === 'dashboard') {
    void router.push(`/analysis-center/dashboards/${item.assetId}`)
    return
  }

  if (item.assetType === 'saved_analysis') {
    void router.push(`/data-insight/event-analysis?savedAnalysisId=${item.assetId}`)
  }
}

const removeRecent = async (item: AnalysisCenterAssetItem): Promise<void> => {
  const result = await analysisCenterService.removeRecentVisit(item.id)
  actionNotice.value = result.message
  await loadItems()
}

const clearRecent = async (): Promise<void> => {
  const result = await analysisCenterService.clearRecentVisits()
  actionNotice.value = result.message
  await loadItems()
}

const removeFavorite = async (item: AnalysisCenterAssetItem): Promise<void> => {
  if (item.assetType === 'dashboard') {
    await analysisCenterService.toggleDashboardFavorite(item.assetId)
  } else if (item.assetType === 'saved_analysis') {
    await analysisCenterService.toggleSavedAnalysisFavorite(item.assetId)
  }

  actionNotice.value = `已取消收藏「${item.assetName}」。`
  await loadItems()
}

const restoreItem = async (item: AnalysisCenterAssetItem): Promise<void> => {
  const result = await analysisCenterService.restoreRecycleItem(item.id)
  actionNotice.value = result.message
  await loadItems()
}

const permanentlyDeleteItem = async (item: AnalysisCenterAssetItem): Promise<void> => {
  const result = await analysisCenterService.permanentlyDeleteRecycleItem(item.id)
  actionNotice.value = result.message
  await loadItems()
}

const columns = computed<DataTableColumns<AnalysisCenterAssetItem>>(() => [
  {
    title: '名称',
    key: 'assetName',
    minWidth: 220,
    render: (row) => h(NButton, { text: true, type: 'primary', onClick: () => openAsset(row) }, () => row.assetName),
  },
  {
    title: '类型',
    key: 'assetType',
    width: 110,
    render: (row) => h(NTag, { size: 'small', type: row.assetType === 'dashboard' ? 'info' : 'success' }, () => typeLabelMap[row.assetType]),
  },
  { title: '来源模块', key: 'moduleName', width: 120 },
  { title: '描述', key: 'description', minWidth: 260 },
  {
    title: '标签',
    key: 'tags',
    minWidth: 180,
    render: (row) => h(NSpace, { size: 4 }, () => row.tags.map((tag) => h(NTag, { size: 'small' }, () => tag))),
  },
  { title: '创建人', key: 'ownerName', width: 130 },
  {
    title: mode.value === 'favorites' ? '收藏时间' : mode.value === 'recycle' ? '删除时间' : '访问时间',
    key: 'mainTime',
    width: 160,
    render: (row) => getMainTime(row),
  },
  ...(mode.value === 'recycle'
    ? [
        { title: '原位置', key: 'originalLocation', minWidth: 180 },
        { title: '删除人', key: 'deletedByName', width: 120 },
        { title: '剩余保留', key: 'remainDays', width: 110, render: (row: AnalysisCenterAssetItem) => getRemainDays(row) },
      ] satisfies DataTableColumns<AnalysisCenterAssetItem>
    : []),
  {
    title: '操作',
    key: 'actions',
    fixed: 'right',
    width: mode.value === 'recycle' ? 170 : 190,
    render: (row) => {
      if (mode.value === 'recycle') {
        return h(NSpace, { size: 8 }, () => [
          h(NButton, { size: 'tiny', text: true, type: 'primary', onClick: () => restoreItem(row) }, () => '恢复'),
          h(NButton, { size: 'tiny', text: true, type: 'error', onClick: () => permanentlyDeleteItem(row) }, () => '永久删除'),
        ])
      }

      if (mode.value === 'favorites') {
        return h(NSpace, { size: 8 }, () => [
          h(NButton, { size: 'tiny', text: true, type: 'primary', onClick: () => openAsset(row) }, () => '打开'),
          h(NButton, { size: 'tiny', text: true, onClick: () => removeFavorite(row) }, () => '取消收藏'),
        ])
      }

      return h(NSpace, { size: 8 }, () => [
        h(NButton, { size: 'tiny', text: true, type: 'primary', onClick: () => openAsset(row) }, () => '打开'),
        h(NButton, { size: 'tiny', text: true, onClick: () => removeRecent(row) }, () => '移除记录'),
      ])
    },
  },
])

watch(mode, () => {
  keyword.value = ''
  assetTypeFilter.value = 'all'
  actionNotice.value = ''
  void loadItems()
})

onMounted(() => {
  void loadItems()
})
</script>

<template>
  <div class="page-container asset-collection-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ pageCopy.title }}</h1>
        <p class="page-description">{{ pageCopy.description }}</p>
      </div>
      <n-space>
        <n-button v-if="mode === 'recent'" size="small" @click="clearRecent">清空最近访问</n-button>
        <n-button size="small" @click="loadItems">刷新</n-button>
      </n-space>
    </div>

    <n-alert v-if="actionNotice" type="success" :show-icon="false" class="notice-alert">
      {{ actionNotice }}
    </n-alert>

    <n-card :bordered="false" class="filter-card">
      <div class="filter-grid">
        <n-input v-model:value="keyword" clearable placeholder="搜索名称、描述或标签" />
        <n-select v-model:value="assetTypeFilter" :options="typeOptions" />
      </div>
    </n-card>

    <n-spin :show="loading">
      <n-data-table
        v-if="filteredItems.length"
        :columns="columns"
        :data="filteredItems"
        :pagination="{ pageSize: 10 }"
        :scroll-x="mode === 'recycle' ? 1380 : 1120"
        size="small"
      />
      <n-empty v-else :description="pageCopy.empty" />
    </n-spin>
  </div>
</template>

<style scoped lang="scss">
.asset-collection-page {
  display: grid;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.notice-alert {
  margin: 0;
}

.filter-grid {
  display: grid;
  grid-template-columns: minmax(320px, 1fr) 220px;
  gap: 12px;
}
</style>
