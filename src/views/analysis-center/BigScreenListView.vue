<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useMessage, type DropdownOption } from 'naive-ui'
import { useRouter } from 'vue-router'
import { bigScreenService } from '@/services/bigScreenService'
import type {
  BigScreen,
  BigScreenDevToolsCheckResult,
  BigScreenDeviceMode,
  BigScreenLayoutPresetType,
  BigScreenListFilters,
  BigScreenListStats,
  BigScreenRatioType,
  BigScreenStatus,
  BigScreenTemplate,
  BigScreenVersion,
  CreateBigScreenTemplateRequest,
  PublishBigScreenRequest,
} from '@/types/bigScreen'

const router = useRouter()
const message = useMessage()
const loading = ref(false)
const screens = ref<BigScreen[]>([])
const stats = ref<BigScreenListStats>({
  total: 0,
  draft: 0,
  published: 0,
  offline: 0,
})
const filters = ref<BigScreenListFilters>({
  keyword: '',
  status: 'all',
  deviceMode: 'all',
  sortMode: 'updated_desc',
})
const createModalVisible = ref(false)
const createDraft = ref({
  name: '',
  description: '',
  deviceMode: 'pc' as BigScreenDeviceMode,
  ratioType: '16:9' as BigScreenRatioType,
  canvasWidth: 1920,
  canvasHeight: 1080,
  layoutPreset: 'blank' as BigScreenLayoutPresetType,
  templateId: '',
})
const templates = ref<BigScreenTemplate[]>([])
const publishModalVisible = ref(false)
const publishingScreen = ref<BigScreen | null>(null)
const publishVersions = ref<BigScreenVersion[]>([])
const publishDraft = ref<PublishBigScreenRequest>({
  publishType: 'latest',
  accessMode: 'public',
  tokenExpireSeconds: 8400,
})
const publishResult = ref('')
const publishSecretKey = ref('')
const publishViewUrl = ref('')
const sharingTokenUrl = ref('')
const publishCheckLoading = ref(false)
const publishCheckResult = ref<BigScreenDevToolsCheckResult | null>(null)
const versionModalVisible = ref(false)
const versionScreen = ref<BigScreen | null>(null)
const versions = ref<BigScreenVersion[]>([])
const versionNameDraft = ref('')
const renameVersionId = ref('')
const renameVersionValue = ref('')
const shareTemplateVisible = ref(false)
const sharingScreen = ref<BigScreen | null>(null)
const shareTemplateDraft = ref<CreateBigScreenTemplateRequest>({
  name: '',
  description: '',
  scope: 'project',
  isDesensitized: true,
  coverUrl: '',
})

const statusOptions = [
  { label: '全部状态', value: 'all' },
  { label: '草稿', value: 'draft' },
  { label: '已发布', value: 'published' },
  { label: '已下线', value: 'offline' },
]

const deviceOptions = [
  { label: '全部端', value: 'all' },
  { label: 'PC 大屏', value: 'pc' },
  { label: '移动端', value: 'mobile' },
]

const sortOptions = [
  { label: '最近更新优先', value: 'updated_desc' },
  { label: '最早更新优先', value: 'updated_asc' },
  { label: '名称 A-Z', value: 'name_asc' },
]

const createDeviceOptions = [
  { label: 'PC 大屏 1920x1080', value: 'pc' },
  { label: '移动端 375x812', value: 'mobile' },
]

const ratioOptions = [
  { label: '16:9 信息屏 1920x1080', value: '16:9' },
  { label: '32:9 拼接屏 3840x1080', value: '32:9' },
  { label: '自定义尺寸', value: 'custom' },
]

const layoutPresetOptions = [
  { label: '空白画布', value: 'blank' },
  { label: '16:9 稀疏信息布局', value: 'sparse-center' },
  { label: '16:9 密集信息布局', value: 'dense-center' },
  { label: '无主视觉网格布局', value: 'no-main-visual' },
  { label: '32:9 三列拼接屏', value: 'wide-32-9-three-column' },
  { label: '32:9 中心聚焦', value: 'wide-32-9-center-focus' },
]

const templateOptions = computed(() => [
  { label: '不使用模板', value: '' },
  ...templates.value.map((template) => ({
    label: `${template.name}${template.isDesensitized ? ' · 已脱敏' : ''}`,
    value: template.id,
  })),
])

const scopeOptions = [
  { label: '私有', value: 'private' },
  { label: '项目内', value: 'project' },
  { label: '共享', value: 'shared' },
]

const publishTypeOptions = computed(() => [
  { label: '当前画板最新内容', value: 'latest' },
  ...publishVersions.value.map((version) => ({
    label: `${version.name} · V${version.versionNo}${version.status === 'published' ? ' · 已发布' : ''}`,
    value: version.id,
  })),
])

const statusLabelMap: Record<BigScreenStatus, string> = {
  draft: '草稿',
  published: '已发布',
  offline: '已下线',
}

const statusTypeMap: Record<BigScreenStatus, 'default' | 'success' | 'warning'> = {
  draft: 'default',
  published: 'success',
  offline: 'warning',
}

const accessModeOptions = [
  { label: '公开访问', value: 'public' },
  { label: '密码验证', value: 'password' },
  { label: 'Token 验证', value: 'token' },
]

const statsCards = computed(() => [
  { label: '全部大屏', value: stats.value.total },
  { label: '草稿', value: stats.value.draft },
  { label: '已发布', value: stats.value.published },
  { label: '已下线', value: stats.value.offline },
])

const publishBlockingIssues = computed(() =>
  (publishCheckResult.value?.issues ?? []).filter((issue) => issue.severity === 'error'),
)

const publishWarningIssues = computed(() =>
  (publishCheckResult.value?.issues ?? []).filter((issue) => issue.severity === 'warning'),
)

const customRatioWarning = computed(() => {
  if (createDraft.value.ratioType !== 'custom') {
    return ''
  }

  const ratio = createDraft.value.canvasWidth / Math.max(1, createDraft.value.canvasHeight)
  return ratio < 1 || ratio > 5 ? '当前比例非常规，请确认是否适配目标屏幕' : ''
})

const formatDateTime = (value?: string): string => value ? new Date(value).toLocaleString('zh-CN') : '-'

const getScreenPageSummary = (screen: BigScreen): string => `${screen.pages.length} 页 / ${screen.components.length} 组件`

let filterApplyTimer: number | undefined

const loadScreens = async (): Promise<void> => {
  loading.value = true

  try {
    const result = await bigScreenService.listBigScreens(filters.value)
    screens.value = result.items
    stats.value = result.stats
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载数字大屏失败')
  } finally {
    loading.value = false
  }
}

const scheduleLoadScreens = (): void => {
  if (filterApplyTimer) {
    window.clearTimeout(filterApplyTimer)
  }

  filterApplyTimer = window.setTimeout(() => {
    filterApplyTimer = undefined
    loadScreens()
  }, 220)
}

const getScreenMoreActionOptions = (screen: BigScreen): DropdownOption[] => [
  ...(screen.status === 'published'
    ? [{ label: '查看发布页', key: 'openPublished' }]
    : []),
  { label: '版本管理', key: 'versions' },
  { label: '共享为模板', key: 'shareTemplate' },
  { label: screen.status === 'published' ? '重新发布' : '发布', key: 'publish' },
  ...(screen.status === 'published'
    ? [{ label: '下线', key: 'offline' }]
    : []),
  { type: 'divider', key: 'danger-divider' },
  { label: '删除', key: 'delete' },
]

const handleScreenActionSelect = (screen: BigScreen, key: string | number): void => {
  if (key === 'openPublished') {
    openPublished(screen)
  } else if (key === 'versions') {
    openVersionModal(screen)
  } else if (key === 'shareTemplate') {
    openShareTemplate(screen)
  } else if (key === 'publish') {
    openPublishModal(screen)
  } else if (key === 'offline') {
    handleOffline(screen)
  } else if (key === 'delete') {
    handleDeleteScreen(screen)
  }
}

const loadTemplates = async (): Promise<void> => {
  templates.value = await bigScreenService.listBigScreenTemplates({ sortMode: 'updated_desc' })
}

const loadPublishVersions = async (screenId: string): Promise<void> => {
  publishVersions.value = await bigScreenService.listBigScreenVersions(screenId)
}

const loadVersions = async (screenId: string): Promise<void> => {
  versions.value = await bigScreenService.listBigScreenVersions(screenId)
}

const resetCreateDraft = (): void => {
  createDraft.value = {
    name: '',
    description: '',
    deviceMode: 'pc',
    ratioType: '16:9',
    canvasWidth: 1920,
    canvasHeight: 1080,
    layoutPreset: 'blank',
    templateId: '',
  }
}

const openCreateModal = (): void => {
  resetCreateDraft()
  loadTemplates()
  createModalVisible.value = true
}

const handleRatioChange = (value: string): void => {
  createDraft.value.ratioType = value as BigScreenRatioType
  if (value === '16:9') {
    createDraft.value.canvasWidth = 1920
    createDraft.value.canvasHeight = 1080
    if (createDraft.value.layoutPreset.startsWith('wide')) {
      createDraft.value.layoutPreset = 'sparse-center'
    }
  } else if (value === '32:9') {
    createDraft.value.canvasWidth = 3840
    createDraft.value.canvasHeight = 1080
    if (!createDraft.value.layoutPreset.startsWith('wide') && createDraft.value.layoutPreset !== 'blank') {
      createDraft.value.layoutPreset = 'wide-32-9-three-column'
    }
  }
}

const handleCreate = async (): Promise<void> => {
  try {
    if (customRatioWarning.value && !window.confirm(customRatioWarning.value)) {
      return
    }

    const screen = await bigScreenService.createBigScreen({
      name: createDraft.value.name,
      description: createDraft.value.description,
      deviceMode: createDraft.value.deviceMode,
      ratioType: createDraft.value.ratioType,
      canvasWidth: createDraft.value.canvasWidth,
      canvasHeight: createDraft.value.canvasHeight,
      layoutPreset: createDraft.value.layoutPreset,
      templateId: createDraft.value.templateId || undefined,
    })
    message.success('数字大屏已创建')
    createModalVisible.value = false
    await loadScreens()
    router.push(`/analysis-center/big-screens/${screen.id}/edit`)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '创建失败')
  }
}

const openShareTemplate = (screen: BigScreen): void => {
  sharingScreen.value = screen
  shareTemplateDraft.value = {
    name: `${screen.name}模板`,
    description: screen.description,
    scope: 'project',
    isDesensitized: true,
    coverUrl: '',
    snapshot: screen.draftSnapshot,
  }
  shareTemplateVisible.value = true
}

const handleShareTemplate = async (): Promise<void> => {
  const screen = sharingScreen.value

  if (!screen) {
    return
  }

  try {
    await bigScreenService.createBigScreenTemplate(screen.id, shareTemplateDraft.value)
    message.success('已共享为模板')
    shareTemplateVisible.value = false
  } catch (error) {
    message.error(error instanceof Error ? error.message : '共享模板失败')
  }
}

const handleEdit = (screen: BigScreen): void => {
  router.push(`/analysis-center/big-screens/${screen.id}/edit`)
}

const handlePreviewDraft = async (screen: BigScreen, startPageId = screen.homePageId): Promise<void> => {
  try {
    const session = await bigScreenService.createBigScreenPreview(screen.id, {
      startPageId,
      snapshot: screen.draftSnapshot,
      sourceType: 'draft',
    })
    router.push(`/big-screen-previews/${session.id}`)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '生成预览失败')
  }
}

const handlePreviewVersion = async (version: BigScreenVersion): Promise<void> => {
  try {
    const session = await bigScreenService.createBigScreenPreview(version.screenId, {
      startPageId: version.snapshot.homePageId,
      snapshot: version.snapshot,
      sourceType: 'version',
      sourceVersionId: version.id,
    })
    router.push(`/big-screen-previews/${session.id}`)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '生成版本预览失败')
  }
}

const openPublished = (screen: BigScreen): void => {
  if (!screen.publishConfig?.viewUrl) {
    message.warning('该大屏尚未生成发布链接')
    return
  }

  router.push(screen.publishConfig.viewUrl)
}

const openPublishModal = async (screen: BigScreen, versionId?: string): Promise<void> => {
  publishingScreen.value = screen
  publishResult.value = ''
  publishCheckResult.value = null
  publishSecretKey.value = screen.publishConfig?.tokenSecretKey ?? ''
  publishViewUrl.value = screen.publishConfig?.viewUrl ?? ''
  sharingTokenUrl.value = ''
  publishDraft.value = {
    publishType: versionId ? 'version' : 'latest',
    versionId,
    accessMode: screen.publishConfig?.accessMode ?? 'public',
    tokenExpireSeconds: screen.publishConfig?.tokenExpireSeconds ?? 8400,
  }
  await loadPublishVersions(screen.id)
  await runPublishPreflightCheck()
  publishModalVisible.value = true
}

const getPublishCheckSnapshot = (): BigScreen['draftSnapshot'] | null => {
  const screen = publishingScreen.value

  if (!screen) {
    return null
  }

  if (publishDraft.value.publishType === 'version' && publishDraft.value.versionId) {
    return publishVersions.value.find((version) => version.id === publishDraft.value.versionId)?.snapshot ?? null
  }

  return screen.draftSnapshot
}

const runPublishPreflightCheck = async (): Promise<void> => {
  const screen = publishingScreen.value
  const snapshot = getPublishCheckSnapshot()

  if (!screen || !snapshot) {
    return
  }

  publishCheckLoading.value = true

  try {
    publishCheckResult.value = await bigScreenService.runBigScreenDevToolsCheck(screen.id, snapshot)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '发布前检查失败')
  } finally {
    publishCheckLoading.value = false
  }
}

const handlePublishTypeChange = async (value: string): Promise<void> => {
  if (value === 'latest') {
    publishDraft.value.publishType = 'latest'
    publishDraft.value.versionId = undefined
    await runPublishPreflightCheck()
    return
  }

  publishDraft.value.publishType = 'version'
  publishDraft.value.versionId = value
  await runPublishPreflightCheck()
}

const handlePublish = async (): Promise<void> => {
  const screen = publishingScreen.value

  if (!screen) {
    return
  }

  if (publishBlockingIssues.value.length) {
    message.error(`发布前需先处理 ${publishBlockingIssues.value.length} 个阻断问题`)
    return
  }

  const confirmText = publishWarningIssues.value.length
    ? `检测到 ${publishWarningIssues.value.length} 个建议项，确认继续发布？`
    : '确认发布该数字大屏？发布后访问链接将展示所选版本内容。'

  if (!window.confirm(confirmText)) {
    return
  }

  try {
    const result = await bigScreenService.publishBigScreen(screen.id, publishDraft.value)
    publishSecretKey.value = result.secretKey ?? publishSecretKey.value
    publishViewUrl.value = result.viewUrl
    sharingTokenUrl.value = ''
    publishResult.value = result.secretKey
      ? `发布成功。访问地址：${result.viewUrl}，Token SecretKey：${result.secretKey}`
      : `发布成功。访问地址：${result.viewUrl}`
    message.success('数字大屏已发布')
    await loadScreens()
    if (versionScreen.value?.id === screen.id) {
      await loadVersions(screen.id)
    }
  } catch (error) {
    message.error(error instanceof Error ? error.message : '发布失败')
  }
}

const appendAccessToken = (url: string, token: string): string =>
  `${url}${url.includes('?') ? '&' : '?'}accessToken=${encodeURIComponent(token)}`

const handleCreateSharingToken = async (): Promise<void> => {
  if (!publishSecretKey.value) {
    message.warning('当前发布配置还没有 SecretKey')
    return
  }

  try {
    const result = await bigScreenService.createSharingToken(publishSecretKey.value, Number(publishDraft.value.tokenExpireSeconds ?? 8400))
    sharingTokenUrl.value = appendAccessToken(publishViewUrl.value, result.data)
    message.success('Token 访问链接已生成')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '生成 Token 失败')
  }
}

const handleOffline = async (screen: BigScreen): Promise<void> => {
  if (!window.confirm('确认下线该大屏？下线后，访问链接将无法继续查看当前大屏内容。')) {
    return
  }

  try {
    await bigScreenService.offlineBigScreen(screen.id)
    message.success('数字大屏已下线')
    await loadScreens()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '下线失败')
  }
}

const openVersionModal = async (screen: BigScreen): Promise<void> => {
  versionScreen.value = screen
  versionNameDraft.value = ''
  renameVersionId.value = ''
  renameVersionValue.value = ''
  await loadVersions(screen.id)
  versionModalVisible.value = true
}

const handleCreateVersion = async (): Promise<void> => {
  const screen = versionScreen.value

  if (!screen) {
    return
  }

  try {
    await bigScreenService.createBigScreenVersion(screen.id, versionNameDraft.value)
    versionNameDraft.value = ''
    message.success('版本已创建')
    await loadVersions(screen.id)
    await loadScreens()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '创建版本失败')
  }
}

const startRenameVersion = (version: BigScreenVersion): void => {
  renameVersionId.value = version.id
  renameVersionValue.value = version.name
}

const handleRenameVersion = async (version: BigScreenVersion): Promise<void> => {
  try {
    await bigScreenService.renameBigScreenVersion(version.screenId, version.id, renameVersionValue.value)
    renameVersionId.value = ''
    renameVersionValue.value = ''
    message.success('版本名称已更新')
    await loadVersions(version.screenId)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '版本改名失败')
  }
}

const handleToggleVersionLock = async (version: BigScreenVersion): Promise<void> => {
  try {
    await bigScreenService.toggleBigScreenVersionLock(version.screenId, version.id)
    await loadVersions(version.screenId)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '版本锁定状态更新失败')
  }
}

const handleRestoreVersion = async (version: BigScreenVersion): Promise<void> => {
  if (!window.confirm('确认回滚到该版本吗？当前未保存的画板内容将被覆盖。')) {
    return
  }

  try {
    await bigScreenService.restoreBigScreenVersion(version.screenId, version.id)
    message.success('已回滚到指定版本')
    await loadVersions(version.screenId)
    await loadScreens()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '版本回滚失败')
  }
}

const handleDeleteVersion = async (version: BigScreenVersion): Promise<void> => {
  if (!window.confirm('确认删除该版本？删除后不可恢复。')) {
    return
  }

  try {
    await bigScreenService.deleteBigScreenVersion(version.screenId, version.id)
    message.success('版本已删除')
    await loadVersions(version.screenId)
    await loadScreens()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '版本删除失败')
  }
}

const openVersionPublishModal = (version: BigScreenVersion): void => {
  if (!versionScreen.value) {
    return
  }

  openPublishModal(versionScreen.value, version.id)
}

const handleDeleteScreen = async (screen: BigScreen): Promise<void> => {
  if (!window.confirm(`确认删除「${screen.name}」？`)) {
    return
  }

  try {
    await bigScreenService.deleteBigScreen(screen.id)
    message.success('数字大屏已删除')
    await loadScreens()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '删除失败')
  }
}

onMounted(async () => {
  await Promise.all([loadScreens(), loadTemplates()])
})

onBeforeUnmount(() => {
  if (filterApplyTimer) {
    window.clearTimeout(filterApplyTimer)
  }
})

watch(filters, () => {
  scheduleLoadScreens()
}, { deep: true })
</script>

<template>
  <div class="big-screen-list-page">
    <header class="page-header">
      <div>
        <h1>数字大屏</h1>
        <p>管理讲述式大屏、监控大屏和发布访问链接。</p>
      </div>
      <n-space>
        <n-button secondary @click="loadScreens">刷新</n-button>
        <n-button type="primary" @click="openCreateModal">新建数字大屏</n-button>
      </n-space>
    </header>

    <section class="stats-grid">
      <div v-for="card in statsCards" :key="card.label" class="stat-card">
        <div>{{ card.label }}</div>
        <strong>{{ card.value }}</strong>
      </div>
    </section>

    <section class="toolbar">
      <n-input v-model:value="filters.keyword" placeholder="搜索大屏名称、说明、创建人" clearable />
      <n-select v-model:value="filters.status" :options="statusOptions" />
      <n-select v-model:value="filters.deviceMode" :options="deviceOptions" />
      <n-select v-model:value="filters.sortMode" :options="sortOptions" />
    </section>

    <n-spin :show="loading">
      <section v-if="screens.length" class="screen-table">
        <div class="table-head">
          <span>大屏名称</span>
          <span>状态</span>
          <span>页面与组件</span>
          <span>版本</span>
          <span>更新时间</span>
          <span>操作</span>
        </div>
        <div v-for="screen in screens" :key="screen.id" class="table-row">
          <div class="screen-name">
            <strong>{{ screen.name }}</strong>
            <small>{{ screen.description || '暂无说明' }}</small>
            <small>{{ screen.deviceMode === 'pc' ? 'PC 大屏' : '移动端' }} · 创建人 {{ screen.createdBy }}</small>
          </div>
          <div>
            <n-tag :type="statusTypeMap[screen.status]">{{ statusLabelMap[screen.status] }}</n-tag>
          </div>
          <div>{{ getScreenPageSummary(screen) }}</div>
          <div>{{ screen.versionCount }} / 20</div>
          <div>
            <div>{{ formatDateTime(screen.updatedAt) }}</div>
            <small v-if="screen.publishedAt">发布：{{ formatDateTime(screen.publishedAt) }}</small>
          </div>
          <n-space class="row-actions" :wrap="false">
            <n-button size="small" @click="handleEdit(screen)">编辑</n-button>
            <n-button size="small" @click="handlePreviewDraft(screen)">预览</n-button>
            <n-dropdown
              trigger="click"
              :options="getScreenMoreActionOptions(screen)"
              @select="handleScreenActionSelect(screen, $event)"
            >
              <n-button size="small">更多</n-button>
            </n-dropdown>
          </n-space>
        </div>
      </section>
      <n-empty v-else description="暂无数字大屏" />
    </n-spin>

    <n-modal v-model:show="createModalVisible" preset="card" title="新建数字大屏" class="screen-modal">
      <n-form label-placement="top">
        <n-form-item label="大屏名称">
          <n-input v-model:value="createDraft.name" placeholder="请输入大屏名称" maxlength="50" show-count />
        </n-form-item>
        <n-form-item label="说明">
          <n-input v-model:value="createDraft.description" type="textarea" placeholder="用于描述展示场景和受众" />
        </n-form-item>
        <n-form-item label="设备模式">
          <n-select v-model:value="createDraft.deviceMode" :options="createDeviceOptions" />
        </n-form-item>
        <n-form-item label="画布尺寸">
          <n-select :value="createDraft.ratioType" :options="ratioOptions" @update:value="handleRatioChange" />
        </n-form-item>
        <div class="form-grid">
          <n-form-item label="宽度">
            <n-input-number v-model:value="createDraft.canvasWidth" :min="1" :disabled="createDraft.ratioType !== 'custom'" />
          </n-form-item>
          <n-form-item label="高度">
            <n-input-number v-model:value="createDraft.canvasHeight" :min="1" :disabled="createDraft.ratioType !== 'custom'" />
          </n-form-item>
        </div>
        <n-alert v-if="customRatioWarning" type="warning" :bordered="false">
          {{ customRatioWarning }}
        </n-alert>
        <n-form-item label="布局模板">
          <n-select v-model:value="createDraft.layoutPreset" :options="layoutPresetOptions" />
        </n-form-item>
        <n-form-item label="应用大屏模板">
          <n-select v-model:value="createDraft.templateId" :options="templateOptions" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="createModalVisible = false">取消</n-button>
          <n-button type="primary" @click="handleCreate">创建并进入编辑器</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="publishModalVisible" preset="card" title="发布设置" class="screen-modal">
      <n-alert v-if="publishingScreen" type="info" :bordered="false">
        当前大屏：{{ publishingScreen.name }}。发布前会按所选内容生成 publishedSnapshot，线上链接保持稳定。
      </n-alert>
      <n-alert
        :type="publishBlockingIssues.length ? 'error' : publishWarningIssues.length ? 'warning' : 'success'"
        :bordered="false"
        class="publish-check-alert"
      >
        <template v-if="publishCheckLoading">
          正在执行发布前检查...
        </template>
        <template v-else-if="publishBlockingIssues.length">
          发现 {{ publishBlockingIssues.length }} 个阻断问题，请回到编辑器或 DevTools 处理后再发布。
        </template>
        <template v-else-if="publishWarningIssues.length">
          发现 {{ publishWarningIssues.length }} 个建议项，可以继续发布，但建议上线前处理。
        </template>
        <template v-else>
          发布前检查通过，当前内容可以发布。
        </template>
      </n-alert>
      <div v-if="publishCheckResult?.issues.length" class="publish-check-list">
        <div
          v-for="issue in publishCheckResult.issues.slice(0, 4)"
          :key="issue.id"
          :class="['publish-check-item', issue.severity]"
        >
          <strong>{{ issue.title }}</strong>
          <span>{{ issue.description }}</span>
        </div>
      </div>
      <n-form label-placement="top" class="modal-form">
        <n-form-item label="版本选择">
          <n-select
            :value="publishDraft.publishType === 'latest' ? 'latest' : publishDraft.versionId"
            :options="publishTypeOptions"
            @update:value="handlePublishTypeChange"
          />
        </n-form-item>
        <n-form-item label="访问加密">
          <n-radio-group v-model:value="publishDraft.accessMode">
            <n-space>
              <n-radio v-for="item in accessModeOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </n-radio>
            </n-space>
          </n-radio-group>
        </n-form-item>
        <n-form-item v-if="publishDraft.accessMode === 'password'" label="访问密码">
          <n-input v-model:value="publishDraft.password" type="password" placeholder="请输入 6-32 位密码" show-password-on="click" />
        </n-form-item>
        <n-form-item v-if="publishDraft.accessMode === 'token'" label="Token 过期时间">
          <n-input-number v-model:value="publishDraft.tokenExpireSeconds" :min="1" :max="86400" />
        </n-form-item>
	      </n-form>
	      <n-alert v-if="publishResult" type="success" :bordered="false">{{ publishResult }}</n-alert>
	      <div v-if="publishDraft.accessMode === 'token' && publishSecretKey" class="token-tool">
	        <n-button size="small" @click="handleCreateSharingToken">生成 Token 访问链接</n-button>
	        <n-input v-if="sharingTokenUrl" :value="sharingTokenUrl" readonly />
	      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="publishModalVisible = false">取消</n-button>
          <n-button
            type="primary"
            :loading="publishCheckLoading"
            :disabled="Boolean(publishBlockingIssues.length)"
            @click="handlePublish"
          >
            发布
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="versionModalVisible" preset="card" title="版本管理" class="version-modal">
      <div v-if="versionScreen" class="version-toolbar">
        <div>
          <strong>{{ versionScreen.name }}</strong>
          <span>最多保留 20 个版本，回滚不会改变线上发布版本。</span>
        </div>
        <n-space>
          <n-input v-model:value="versionNameDraft" placeholder="版本名称，默认版本N" />
          <n-button type="primary" :disabled="versions.length >= 20" @click="handleCreateVersion">新增版本</n-button>
        </n-space>
      </div>
      <div class="version-table">
        <div class="version-head">
          <span>版本</span>
          <span>创建信息</span>
          <span>状态</span>
          <span>锁定</span>
          <span>操作</span>
        </div>
        <div v-for="version in versions" :key="version.id" class="version-row">
          <div>
            <template v-if="renameVersionId === version.id">
              <n-input v-model:value="renameVersionValue" size="small" />
            </template>
            <template v-else>
              <strong>{{ version.name }}</strong>
            </template>
            <small>V{{ version.versionNo }}</small>
          </div>
          <div>
            <div>{{ formatDateTime(version.createdAt) }}</div>
            <small>{{ version.createdBy }}</small>
          </div>
          <div>
            <n-tag :type="version.status === 'published' ? 'success' : 'default'">
              {{ version.status === 'published' ? '已发布' : '历史版本' }}
            </n-tag>
          </div>
          <div>{{ version.locked ? '已锁定' : '未锁定' }}</div>
          <n-space :wrap="false">
            <n-button size="small" @click="handlePreviewVersion(version)">查看</n-button>
            <n-button size="small" @click="openVersionPublishModal(version)">发布设置</n-button>
            <n-button size="small" @click="handleRestoreVersion(version)">回滚</n-button>
            <n-button v-if="renameVersionId === version.id" size="small" type="primary" @click="handleRenameVersion(version)">保存名称</n-button>
            <n-button v-else size="small" :disabled="version.locked" @click="startRenameVersion(version)">改名</n-button>
            <n-button size="small" @click="handleToggleVersionLock(version)">{{ version.locked ? '解锁' : '锁定' }}</n-button>
            <n-button size="small" tertiary type="error" :disabled="version.locked || version.status === 'published'" @click="handleDeleteVersion(version)">
              删除
            </n-button>
          </n-space>
        </div>
        <n-empty v-if="!versions.length" description="暂无版本，点击新增版本保存当前草稿快照" />
      </div>
    </n-modal>

    <n-modal v-model:show="shareTemplateVisible" preset="card" title="共享为模板" class="screen-modal">
      <n-alert v-if="sharingScreen" type="info" :bordered="false">
        当前大屏：{{ sharingScreen.name }}。开启脱敏后，非静态数据源会转换为示例静态数据，敏感连接信息不会进入模板。
      </n-alert>
      <n-form label-placement="top" class="modal-form">
        <n-form-item label="模板名称">
          <n-input v-model:value="shareTemplateDraft.name" maxlength="50" show-count />
        </n-form-item>
        <n-form-item label="范围">
          <n-select v-model:value="shareTemplateDraft.scope" :options="scopeOptions" />
        </n-form-item>
        <n-form-item label="封面地址或渐变">
          <n-input v-model:value="shareTemplateDraft.coverUrl" placeholder="未填写时自动使用默认封面" />
        </n-form-item>
        <n-form-item label="描述">
          <n-input v-model:value="shareTemplateDraft.description" type="textarea" />
        </n-form-item>
        <n-checkbox v-model:checked="shareTemplateDraft.isDesensitized">生成模板时脱敏数据</n-checkbox>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="shareTemplateVisible = false">取消</n-button>
          <n-button type="primary" @click="handleShareTemplate">生成模板</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<style scoped lang="scss">
.big-screen-list-page {
  min-height: 100%;
  padding: 24px;
  background: #f5f7fb;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 18px;
}

.page-header h1 {
  margin: 0;
  color: #111827;
  font-size: 28px;
}

.page-header p {
  margin: 8px 0 0;
  color: #64748b;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.stat-card div {
  color: #64748b;
  font-size: 13px;
}

.stat-card strong {
  display: block;
  margin-top: 8px;
  color: #0f172a;
  font-size: 26px;
}

.toolbar {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) 160px 140px 160px;
  gap: 10px;
  margin-bottom: 16px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.screen-table {
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.table-head,
.table-row {
  display: grid;
  grid-template-columns: minmax(260px, 1.4fr) 100px 130px 90px 190px 168px;
  gap: 16px;
  align-items: center;
  padding: 14px 16px;
}

.table-head {
  background: #f8fafc;
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
}

.table-row {
  border-top: 1px solid #eef2f7;
}

.screen-name {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.screen-name strong {
  color: #111827;
}

small {
  color: #64748b;
}

.row-actions {
  justify-content: flex-end;
}

.screen-modal {
  width: min(640px, calc(100vw - 48px));
}

.version-modal {
  width: min(1080px, calc(100vw - 48px));
}

.modal-form {
  margin-top: 16px;
}

.publish-check-alert {
  margin-top: 12px;
}

.publish-check-list {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.publish-check-item {
  display: grid;
  gap: 3px;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-left: 3px solid #94a3b8;
  border-radius: 8px;
  background: #fff;
}

.publish-check-item.error {
  border-left-color: #ef4444;
}

.publish-check-item.warning {
  border-left-color: #f59e0b;
}

.publish-check-item strong {
  color: #111827;
  font-size: 13px;
}

.publish-check-item span {
  color: #64748b;
  font-size: 12px;
  line-height: 1.45;
}

.token-tool {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.version-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.version-toolbar div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.version-table {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.version-head,
.version-row {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) 180px 110px 90px minmax(520px, 2fr);
  gap: 14px;
  align-items: center;
  padding: 12px 14px;
}

.version-head {
  background: #f8fafc;
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
}

.version-row {
  border-top: 1px solid #eef2f7;
}

.version-row > div:first-child {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

@media (max-width: 1180px) {
  .table-head,
  .table-row,
  .version-head,
  .version-row {
    grid-template-columns: 1fr;
  }

  .toolbar,
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .row-actions {
    justify-content: flex-start;
  }
}
</style>
