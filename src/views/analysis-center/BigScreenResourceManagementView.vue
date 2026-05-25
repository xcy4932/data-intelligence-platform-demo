<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useMessage } from 'naive-ui'
import { useRouter } from 'vue-router'
import { bigScreenService } from '@/services/bigScreenService'
import type {
  BigScreenResourceAsset,
  BigScreenResourceAssetCategory,
  BigScreenResourceAssetType,
  BigScreenTemplate,
  UpdateBigScreenTemplateRequest,
} from '@/types/bigScreen'

const router = useRouter()
const message = useMessage()
const loading = ref(false)
const activeTab = ref<'templates' | 'assets' | 'fonts'>('templates')
const templates = ref<BigScreenTemplate[]>([])
const assets = ref<BigScreenResourceAsset[]>([])
const templateKeyword = ref('')
const templateCreator = ref('')
const templateSortMode = ref<'updated_desc' | 'updated_asc' | 'name_asc'>('updated_desc')
const assetKeyword = ref('')
const assetCategory = ref<BigScreenResourceAssetCategory | 'all'>('all')
const editTemplateVisible = ref(false)
const applyTemplateVisible = ref(false)
const uploadAssetVisible = ref(false)
const editingTemplate = ref<BigScreenTemplate | null>(null)
const applyingTemplate = ref<BigScreenTemplate | null>(null)
const templateEditDraft = ref<UpdateBigScreenTemplateRequest>({
  name: '',
  description: '',
  scope: 'project',
  coverUrl: '',
})
const applyTemplateDraft = ref({
  name: '',
  description: '',
})
const uploadDraft = ref({
  name: '',
  type: 'image' as BigScreenResourceAssetType,
  category: 'background-frame' as BigScreenResourceAssetCategory,
  fileUrl: '',
  fileSizeMb: 1,
  mimeType: 'image/png',
  extension: 'png',
  fontFamily: '',
  licenseConfirmed: false,
})

const templateSortOptions = [
  { label: '最近更新优先', value: 'updated_desc' },
  { label: '最早更新优先', value: 'updated_asc' },
  { label: '模板名称 A-Z', value: 'name_asc' },
]

const scopeOptions = [
  { label: '私有', value: 'private' },
  { label: '项目内', value: 'project' },
  { label: '共享', value: 'shared' },
]

const assetTypeOptions = [
  { label: '图片素材', value: 'image' },
  { label: '视频素材', value: 'video' },
  { label: '自定义字体', value: 'font' },
  { label: '模板封面', value: 'template-cover' },
]

const categoryOptions = [
  { label: '全部分类', value: 'all' },
  { label: '主标题', value: 'main-title' },
  { label: '小标题', value: 'sub-title' },
  { label: '背景框', value: 'background-frame' },
  { label: '装饰线', value: 'decoration-line' },
  { label: '图标', value: 'icon' },
  { label: '其他', value: 'other' },
  { label: '字体', value: 'font' },
]

const designAssets = computed(() => assets.value.filter((asset) => asset.type !== 'font'))
const fontAssets = computed(() => assets.value.filter((asset) => asset.type === 'font'))

const formatDateTime = (value: string): string => new Date(value).toLocaleString('zh-CN')
const formatSize = (size: number): string => size >= 1024 * 1024
  ? `${(size / 1024 / 1024).toFixed(1)} MB`
  : `${Math.max(1, Math.round(size / 1024))} KB`

const getTemplateCoverStyle = (template: BigScreenTemplate): Record<string, string> => {
  const cover = template.coverUrl || 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 50%, #14b8a6 100%)'
  return cover.startsWith('linear-gradient')
    ? { background: cover }
    : { backgroundImage: `url(${cover})` }
}

const loadTemplates = async (): Promise<void> => {
  templates.value = await bigScreenService.listBigScreenTemplates({
    keyword: templateKeyword.value,
    creator: templateCreator.value,
    sortMode: templateSortMode.value,
  })
}

const loadAssets = async (): Promise<void> => {
  assets.value = await bigScreenService.listBigScreenAssets({
    keyword: assetKeyword.value,
    type: activeTab.value === 'fonts' ? 'font' : 'all',
    category: activeTab.value === 'fonts' ? 'font' : assetCategory.value,
  })
}

const loadAll = async (): Promise<void> => {
  loading.value = true
  try {
    await Promise.all([loadTemplates(), loadAssets()])
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载资源失败')
  } finally {
    loading.value = false
  }
}

const openEditTemplate = (template: BigScreenTemplate): void => {
  editingTemplate.value = template
  templateEditDraft.value = {
    name: template.name,
    description: template.description,
    scope: template.scope,
    coverUrl: template.coverUrl,
  }
  editTemplateVisible.value = true
}

const handleSaveTemplate = async (): Promise<void> => {
  if (!editingTemplate.value) {
    return
  }

  try {
    await bigScreenService.updateBigScreenTemplate(editingTemplate.value.id, templateEditDraft.value)
    message.success('模板信息已更新')
    editTemplateVisible.value = false
    await loadTemplates()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '模板更新失败')
  }
}

const openApplyTemplate = (template: BigScreenTemplate): void => {
  applyingTemplate.value = template
  applyTemplateDraft.value = {
    name: `${template.name.replace(/模板$/, '')}大屏`,
    description: template.description ?? '',
  }
  applyTemplateVisible.value = true
}

const handleApplyTemplate = async (): Promise<void> => {
  const template = applyingTemplate.value

  if (!template) {
    return
  }

  try {
    const screen = await bigScreenService.applyBigScreenTemplate(template.id, applyTemplateDraft.value.name, applyTemplateDraft.value.description)
    message.success('已基于模板创建大屏')
    applyTemplateVisible.value = false
    router.push(`/analysis-center/big-screens/${screen.id}/edit`)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '应用模板失败')
  }
}

const handleDeleteTemplate = async (template: BigScreenTemplate): Promise<void> => {
  if (!window.confirm(`确认删除模板「${template.name}」？删除后不可恢复，已应用该模板的大屏不受影响。`)) {
    return
  }

  try {
    await bigScreenService.deleteBigScreenTemplate(template.id)
    message.success('模板已删除')
    await loadTemplates()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '模板删除失败')
  }
}

const openUploadAsset = (type: BigScreenResourceAssetType): void => {
  uploadDraft.value = {
    name: '',
    type,
    category: type === 'font' ? 'font' : 'background-frame',
    fileUrl: '',
    fileSizeMb: type === 'video' ? 8 : 1,
    mimeType: type === 'font' ? 'font/woff2' : type === 'video' ? 'video/mp4' : 'image/png',
    extension: type === 'font' ? 'woff2' : type === 'video' ? 'mp4' : 'png',
    fontFamily: '',
    licenseConfirmed: false,
  }
  uploadAssetVisible.value = true
}

const handleUploadAsset = async (): Promise<void> => {
  try {
    const asset = await bigScreenService.uploadBigScreenAsset({
      name: uploadDraft.value.name,
      type: uploadDraft.value.type,
      category: uploadDraft.value.category,
      fileUrl: uploadDraft.value.fileUrl || `/mock-assets/${uploadDraft.value.name}.${uploadDraft.value.extension}`,
      fileSize: Math.round(uploadDraft.value.fileSizeMb * 1024 * 1024),
      mimeType: uploadDraft.value.mimeType,
      extension: uploadDraft.value.extension,
      licenseConfirmed: uploadDraft.value.licenseConfirmed,
      fontFamily: uploadDraft.value.fontFamily,
    })
    message.success(asset.warningMessage ? `上传成功，${asset.warningMessage}` : '资源已上传')
    uploadAssetVisible.value = false
    await loadAssets()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '资源上传失败')
  }
}

const handleDeleteAsset = async (asset: BigScreenResourceAsset): Promise<void> => {
  const text = asset.usageCount > 0
    ? `资源「${asset.name}」正在被 ${asset.usageCount} 个地方使用，删除后相关组件可能无法正常显示，确认继续？`
    : `确认删除资源「${asset.name}」？`

  if (!window.confirm(text)) {
    return
  }

  try {
    const result = await bigScreenService.deleteBigScreenAsset(asset.id)
    message.success(result.message)
    await loadAssets()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '资源删除失败')
  }
}

onMounted(loadAll)
</script>

<template>
  <div class="resource-page">
    <header class="page-header">
      <div>
        <div class="eyebrow">数字大屏</div>
        <h1>资源管理</h1>
        <p>管理大屏模板、设计素材和自定义字体，模板应用后会生成独立大屏。</p>
      </div>
      <n-space>
        <n-button @click="router.push('/analysis-center/big-screens')">返回大屏列表</n-button>
        <n-button type="primary" @click="openUploadAsset(activeTab === 'fonts' ? 'font' : 'image')">上传资源</n-button>
      </n-space>
    </header>

    <n-spin :show="loading">
      <n-tabs v-model:value="activeTab" type="line" animated @update:value="loadAssets">
        <n-tab-pane name="templates" tab="大屏模板">
          <section class="toolbar">
            <n-input v-model:value="templateKeyword" placeholder="搜索模板名称或说明" clearable @keyup.enter="loadTemplates" />
            <n-input v-model:value="templateCreator" placeholder="按创建人筛选" clearable @keyup.enter="loadTemplates" />
            <n-select v-model:value="templateSortMode" :options="templateSortOptions" />
            <n-button @click="loadTemplates">筛选</n-button>
          </section>

          <section class="template-grid">
            <article v-for="template in templates" :key="template.id" class="template-card">
              <div class="template-cover" :style="getTemplateCoverStyle(template)">
                <span>{{ template.isDesensitized ? '已脱敏' : '未脱敏' }}</span>
              </div>
              <div class="card-body">
                <strong>{{ template.name }}</strong>
                <p>{{ template.description || '暂无模板说明' }}</p>
                <div class="meta-row">
                  <span>{{ template.scope === 'private' ? '私有' : template.scope === 'project' ? '项目内' : '共享' }}</span>
                  <span>{{ template.createdBy }}</span>
                  <span>{{ formatDateTime(template.updatedAt) }}</span>
                </div>
                <n-space>
                  <n-button size="small" type="primary" @click="openApplyTemplate(template)">应用</n-button>
                  <n-button size="small" @click="openEditTemplate(template)">修改信息</n-button>
                  <n-button size="small" tertiary type="error" @click="handleDeleteTemplate(template)">删除</n-button>
                </n-space>
              </div>
            </article>
          </section>
          <n-empty v-if="!templates.length" description="暂无可用模板" />
        </n-tab-pane>

        <n-tab-pane name="assets" tab="设计素材">
          <section class="toolbar assets-toolbar">
            <n-input v-model:value="assetKeyword" placeholder="搜索素材名称" clearable @keyup.enter="loadAssets" />
            <n-select v-model:value="assetCategory" :options="categoryOptions" />
            <n-button @click="loadAssets">筛选</n-button>
            <n-button type="primary" @click="openUploadAsset('image')">上传图片</n-button>
            <n-button @click="openUploadAsset('video')">上传视频</n-button>
          </section>

          <section class="asset-table">
            <div class="asset-head">
              <span>素材</span>
              <span>分类</span>
              <span>来源</span>
              <span>大小</span>
              <span>使用</span>
              <span>操作</span>
            </div>
            <div v-for="asset in designAssets" :key="asset.id" class="asset-row">
              <div>
                <strong>{{ asset.name }}</strong>
                <small>{{ asset.extension }} · {{ asset.mimeType }}</small>
                <small v-if="asset.warningMessage" class="warning-text">{{ asset.warningMessage }}</small>
              </div>
              <span>{{ categoryOptions.find((item) => item.value === asset.category)?.label ?? asset.category }}</span>
              <span>{{ asset.source === 'official' ? '官方' : '本地上传' }}</span>
              <span>{{ formatSize(asset.fileSize) }}</span>
              <span>{{ asset.usageCount }}</span>
              <n-space>
                <n-button size="small" @click="message.info('编辑器素材面板将展示该资源')">查看</n-button>
                <n-button size="small" tertiary type="error" @click="handleDeleteAsset(asset)">删除</n-button>
              </n-space>
            </div>
          </section>
          <n-empty v-if="!designAssets.length" description="暂无设计素材" />
        </n-tab-pane>

        <n-tab-pane name="fonts" tab="自定义字体">
          <section class="toolbar font-toolbar">
            <n-input v-model:value="assetKeyword" placeholder="搜索字体名称" clearable @keyup.enter="loadAssets" />
            <n-button @click="loadAssets">筛选</n-button>
            <n-button type="primary" @click="openUploadAsset('font')">上传字体</n-button>
          </section>

          <section class="font-grid">
            <article v-for="font in fontAssets" :key="font.id" class="font-card">
              <div class="font-preview" :style="{ fontFamily: font.fontFamily || font.name }">Aa 123 数据大屏</div>
              <strong>{{ font.name }}</strong>
              <span>{{ font.extension }} · {{ formatSize(font.fileSize) }} · 使用 {{ font.usageCount }}</span>
              <span>{{ font.licenseConfirmed ? '已确认授权声明' : '未记录授权声明' }}</span>
              <n-space>
                <n-button size="small" @click="message.info('字体已进入编辑器字体下拉候选')">预览</n-button>
                <n-button size="small" tertiary type="error" :disabled="font.usageCount > 0" @click="handleDeleteAsset(font)">
                  删除
                </n-button>
              </n-space>
            </article>
          </section>
          <n-empty v-if="!fontAssets.length" description="暂无自定义字体" />
        </n-tab-pane>
      </n-tabs>
    </n-spin>

    <n-modal v-model:show="editTemplateVisible" preset="card" title="修改模板信息" class="small-modal">
      <n-form label-placement="top">
        <n-form-item label="模板名称">
          <n-input v-model:value="templateEditDraft.name" maxlength="50" show-count />
        </n-form-item>
        <n-form-item label="范围">
          <n-select v-model:value="templateEditDraft.scope" :options="scopeOptions" />
        </n-form-item>
        <n-form-item label="封面地址或渐变">
          <n-input v-model:value="templateEditDraft.coverUrl" />
        </n-form-item>
        <n-form-item label="描述">
          <n-input v-model:value="templateEditDraft.description" type="textarea" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="editTemplateVisible = false">取消</n-button>
          <n-button type="primary" @click="handleSaveTemplate">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="applyTemplateVisible" preset="card" title="应用模板创建大屏" class="small-modal">
      <n-form label-placement="top">
        <n-form-item label="新大屏名称">
          <n-input v-model:value="applyTemplateDraft.name" maxlength="50" show-count />
        </n-form-item>
        <n-form-item label="说明">
          <n-input v-model:value="applyTemplateDraft.description" type="textarea" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="applyTemplateVisible = false">取消</n-button>
          <n-button type="primary" @click="handleApplyTemplate">创建并进入编辑器</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="uploadAssetVisible" preset="card" title="上传资源" class="small-modal">
      <n-form label-placement="top">
        <n-form-item label="资源类型">
          <n-select v-model:value="uploadDraft.type" :options="assetTypeOptions" />
        </n-form-item>
        <n-form-item label="资源名称">
          <n-input v-model:value="uploadDraft.name" placeholder="请输入资源名称" />
        </n-form-item>
        <n-form-item label="分类">
          <n-select v-model:value="uploadDraft.category" :options="categoryOptions.filter((item) => item.value !== 'all')" />
        </n-form-item>
        <n-form-item label="文件地址">
          <n-input v-model:value="uploadDraft.fileUrl" placeholder="模拟上传后生成的文件地址，可留空" />
        </n-form-item>
        <div class="form-grid">
          <n-form-item label="大小 MB">
            <n-input-number v-model:value="uploadDraft.fileSizeMb" :min="0.01" :max="200" />
          </n-form-item>
          <n-form-item label="扩展名">
            <n-input v-model:value="uploadDraft.extension" />
          </n-form-item>
        </div>
        <n-form-item label="MIME Type">
          <n-input v-model:value="uploadDraft.mimeType" />
        </n-form-item>
        <n-form-item v-if="uploadDraft.type === 'font'" label="字体族名称">
          <n-input v-model:value="uploadDraft.fontFamily" placeholder="例如 SourceHanSansCN" />
        </n-form-item>
        <n-checkbox v-if="uploadDraft.type === 'font'" v-model:checked="uploadDraft.licenseConfirmed">
          我确认该字体为开源或拥有合法商业授权
        </n-checkbox>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="uploadAssetVisible = false">取消</n-button>
          <n-button type="primary" @click="handleUploadAsset">上传</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<style scoped lang="scss">
.resource-page {
  min-height: 100%;
  padding: 24px;
  background: #f5f7fb;
}

.page-header {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;
}

.eyebrow {
  margin-bottom: 6px;
  color: #2563eb;
  font-size: 13px;
  font-weight: 700;
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

.toolbar {
  display: grid;
  grid-template-columns: minmax(240px, 1fr) 180px 180px auto;
  gap: 10px;
  margin-bottom: 16px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.assets-toolbar {
  grid-template-columns: minmax(240px, 1fr) 180px auto auto auto;
}

.font-toolbar {
  grid-template-columns: minmax(240px, 1fr) auto auto;
}

.template-grid,
.font-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}

.template-card,
.font-card {
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.template-cover {
  height: 138px;
  background-size: cover;
  background-position: center;
  position: relative;
}

.template-cover span {
  position: absolute;
  right: 10px;
  bottom: 10px;
  padding: 4px 8px;
  border-radius: 5px;
  background: rgba(15, 23, 42, 0.75);
  color: #fff;
  font-size: 12px;
}

.card-body,
.font-card {
  display: grid;
  gap: 10px;
  padding: 14px;
}

.card-body strong,
.font-card strong {
  color: #111827;
}

.card-body p {
  min-height: 42px;
  margin: 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: #64748b;
  font-size: 12px;
}

.asset-table {
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.asset-head,
.asset-row {
  display: grid;
  grid-template-columns: minmax(240px, 1.6fr) 120px 110px 110px 80px minmax(160px, auto);
  gap: 14px;
  align-items: center;
  padding: 12px 14px;
}

.asset-head {
  background: #f8fafc;
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
}

.asset-row {
  border-top: 1px solid #eef2f7;
}

.asset-row > div {
  display: grid;
  gap: 4px;
}

small,
.font-card span {
  color: #64748b;
  font-size: 12px;
}

.warning-text {
  color: #d97706;
}

.font-preview {
  padding: 16px;
  border-radius: 8px;
  background: #0f172a;
  color: #e0f2fe;
  font-size: 24px;
}

.small-modal {
  width: min(640px, calc(100vw - 48px));
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

@media (max-width: 980px) {
  .page-header,
  .toolbar,
  .assets-toolbar,
  .font-toolbar,
  .asset-head,
  .asset-row {
    grid-template-columns: 1fr;
  }

  .page-header {
    display: grid;
  }
}
</style>
