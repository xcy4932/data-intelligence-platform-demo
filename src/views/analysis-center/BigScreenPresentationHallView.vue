<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useMessage } from 'naive-ui'
import { useRouter } from 'vue-router'
import { bigScreenService } from '@/services/bigScreenService'
import type {
  BigScreen,
  BigScreenPresentationItem,
  BigScreenPresentationPlan,
} from '@/types/bigScreen'

const router = useRouter()
const message = useMessage()
const loading = ref(false)
const plans = ref<BigScreenPresentationPlan[]>([])
const screens = ref<BigScreen[]>([])
const editorVisible = ref(false)
const editingPlanId = ref('')
const planDraft = ref({
  name: '',
  loopMode: 'loop' as BigScreenPresentationPlan['loopMode'],
  status: 'active' as BigScreenPresentationPlan['status'],
  items: [] as BigScreenPresentationItem[],
})
const addItemDraft = ref({
  screenId: '',
  durationSeconds: 30,
})

const screenOptions = computed(() =>
  screens.value.map((screen) => ({
    label: `${screen.name}${screen.status === 'published' ? '' : '（请先发布）'}`,
    value: screen.id,
    disabled: screen.status !== 'published',
  })),
)

const planStats = computed(() => ({
  total: plans.value.length,
  active: plans.value.filter((plan) => plan.status === 'active').length,
  draft: plans.value.filter((plan) => plan.status === 'draft').length,
}))

const formatDateTime = (value: string): string => new Date(value).toLocaleString('zh-CN')
const getPlanTotalDuration = (plan: BigScreenPresentationPlan): number =>
  plan.items.reduce((sum, item) => sum + item.durationSeconds, 0)
const getDurationText = (seconds: number): string =>
  seconds >= 60 ? `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒` : `${seconds} 秒`

const loadAll = async (): Promise<void> => {
  loading.value = true

  try {
    const [planList, screenList] = await Promise.all([
      bigScreenService.listBigScreenPresentationPlans(),
      bigScreenService.listBigScreens({ keyword: '', status: 'all', deviceMode: 'all', sortMode: 'updated_desc' }),
    ])
    plans.value = planList
    screens.value = screenList.items
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载演播厅失败')
  } finally {
    loading.value = false
  }
}

const resetDraft = (): void => {
  editingPlanId.value = ''
  planDraft.value = {
    name: '',
    loopMode: 'loop',
    status: 'active',
    items: [],
  }
  addItemDraft.value = {
    screenId: '',
    durationSeconds: 30,
  }
}

const openCreate = (): void => {
  resetDraft()
  editorVisible.value = true
}

const openEdit = (plan: BigScreenPresentationPlan): void => {
  editingPlanId.value = plan.id
  planDraft.value = {
    name: plan.name,
    loopMode: plan.loopMode,
    status: plan.status,
    items: plan.items.map((item) => ({ ...item })),
  }
  addItemDraft.value = {
    screenId: '',
    durationSeconds: 30,
  }
  editorVisible.value = true
}

const addDraftItem = (): void => {
  const screen = screens.value.find((item) => item.id === addItemDraft.value.screenId)

  if (!screen) {
    message.warning('请选择要加入演播的大屏')
    return
  }

  if (screen.status !== 'published') {
    message.warning('只允许添加已发布大屏')
    return
  }

  const durationSeconds = Number(addItemDraft.value.durationSeconds)
  if (!Number.isInteger(durationSeconds) || durationSeconds < 5 || durationSeconds > 3600) {
    message.warning(durationSeconds < 5 ? '单屏播放时长不能小于 5 秒' : '单屏播放时长不能大于 3600 秒')
    return
  }

  planDraft.value.items.push({
    id: `presentation-item-draft-${Date.now()}-${planDraft.value.items.length}`,
    screenId: screen.id,
    publishedVersionId: screen.currentPublishedVersionId,
    displayName: screen.name,
    durationSeconds,
    order: planDraft.value.items.length + 1,
  })
}

const removeDraftItem = (index: number): void => {
  planDraft.value.items.splice(index, 1)
  planDraft.value.items = planDraft.value.items.map((item, itemIndex) => ({ ...item, order: itemIndex + 1 }))
}

const moveDraftItem = (index: number, direction: -1 | 1): void => {
  const nextIndex = index + direction
  if (nextIndex < 0 || nextIndex >= planDraft.value.items.length) {
    return
  }

  const items = [...planDraft.value.items]
  const current = items[index]
  const next = items[nextIndex]
  if (!current || !next) {
    return
  }

  items[index] = next
  items[nextIndex] = current
  planDraft.value.items = items.map((item, itemIndex) => ({ ...item, order: itemIndex + 1 }))
}

const savePlan = async (): Promise<void> => {
  try {
    await bigScreenService.saveBigScreenPresentationPlan(editingPlanId.value || undefined, planDraft.value)
    message.success(editingPlanId.value ? '演播方案已保存' : '演播方案已创建')
    editorVisible.value = false
    await loadAll()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '保存演播方案失败')
  }
}

const deletePlan = async (plan: BigScreenPresentationPlan): Promise<void> => {
  if (!window.confirm(`确认删除演播方案「${plan.name}」？删除后不可恢复，且不影响大屏本身。`)) {
    return
  }

  try {
    await bigScreenService.deleteBigScreenPresentationPlan(plan.id)
    message.success('演播方案已删除')
    await loadAll()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '删除演播方案失败')
  }
}

const playPlan = (plan: BigScreenPresentationPlan): void => {
  router.push(`/big-screen-presentations/${plan.id}`)
}

onMounted(loadAll)
</script>

<template>
  <div class="presentation-page">
    <header class="page-header">
      <div>
        <div class="eyebrow">数字大屏</div>
        <h1>演播厅</h1>
        <p>配置多个已发布大屏的播放顺序、时长和循环模式，用于展厅、会议室和监控中心投屏。</p>
      </div>
      <n-space>
        <n-button @click="router.push('/analysis-center/big-screens')">返回大屏列表</n-button>
        <n-button type="primary" @click="openCreate">新建演播方案</n-button>
      </n-space>
    </header>

    <section class="stats-grid">
      <div>
        <span>全部方案</span>
        <strong>{{ planStats.total }}</strong>
      </div>
      <div>
        <span>启用中</span>
        <strong>{{ planStats.active }}</strong>
      </div>
      <div>
        <span>草稿</span>
        <strong>{{ planStats.draft }}</strong>
      </div>
    </section>

    <n-spin :show="loading">
      <section class="plan-table">
        <div class="plan-head">
          <span>方案名称</span>
          <span>大屏数量</span>
          <span>总时长</span>
          <span>状态</span>
          <span>更新时间</span>
          <span>操作</span>
        </div>
        <div v-for="plan in plans" :key="plan.id" class="plan-row">
          <div>
            <strong>{{ plan.name }}</strong>
            <small>{{ plan.loopMode === 'loop' ? '循环播放' : '单次播放' }} · 创建人 {{ plan.createdBy }}</small>
          </div>
          <span>{{ plan.items.length }}</span>
          <span>{{ getDurationText(getPlanTotalDuration(plan)) }}</span>
          <n-tag :type="plan.status === 'active' ? 'success' : 'default'">
            {{ plan.status === 'active' ? '启用中' : '草稿' }}
          </n-tag>
          <span>{{ formatDateTime(plan.updatedAt) }}</span>
          <n-space>
            <n-button size="small" type="primary" @click="playPlan(plan)">投屏</n-button>
            <n-button size="small" @click="openEdit(plan)">编辑</n-button>
            <n-button size="small" tertiary type="error" @click="deletePlan(plan)">删除</n-button>
          </n-space>
        </div>
      </section>
      <n-empty v-if="!plans.length" description="暂无演播方案" />
    </n-spin>

    <n-modal v-model:show="editorVisible" preset="card" :title="editingPlanId ? '编辑演播方案' : '新建演播方案'" class="plan-modal">
      <n-form label-placement="top">
        <div class="form-grid">
          <n-form-item label="方案名称">
            <n-input v-model:value="planDraft.name" maxlength="50" show-count />
          </n-form-item>
          <n-form-item label="方案状态">
            <n-radio-group v-model:value="planDraft.status">
              <n-radio value="active">启用</n-radio>
              <n-radio value="draft">草稿</n-radio>
            </n-radio-group>
          </n-form-item>
        </div>
        <n-form-item label="轮播模式">
          <n-radio-group v-model:value="planDraft.loopMode">
            <n-radio value="loop">循环播放</n-radio>
            <n-radio value="once">单次播放，停在最后一屏</n-radio>
          </n-radio-group>
        </n-form-item>

        <div class="add-item-row">
          <n-select v-model:value="addItemDraft.screenId" :options="screenOptions" placeholder="选择已发布大屏" />
          <n-input-number v-model:value="addItemDraft.durationSeconds" :min="5" :max="3600" />
          <n-button @click="addDraftItem">添加大屏</n-button>
        </div>

        <div class="item-list">
          <div v-for="(item, index) in planDraft.items" :key="item.id" class="item-row">
            <span>{{ index + 1 }}</span>
            <strong>{{ item.displayName }}</strong>
            <n-input-number v-model:value="item.durationSeconds" :min="5" :max="3600" size="small" />
            <n-space>
              <n-button size="tiny" :disabled="index === 0" @click="moveDraftItem(index, -1)">上移</n-button>
              <n-button size="tiny" :disabled="index === planDraft.items.length - 1" @click="moveDraftItem(index, 1)">下移</n-button>
              <n-button size="tiny" tertiary type="error" @click="removeDraftItem(index)">删除</n-button>
            </n-space>
          </div>
          <n-empty v-if="!planDraft.items.length" description="请添加至少一个已发布大屏" />
        </div>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="editorVisible = false">取消</n-button>
          <n-button type="primary" @click="savePlan">保存方案</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<style scoped lang="scss">
.presentation-page {
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.stats-grid > div {
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.stats-grid span {
  color: #64748b;
  font-size: 13px;
}

.stats-grid strong {
  display: block;
  margin-top: 8px;
  color: #0f172a;
  font-size: 26px;
}

.plan-table {
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.plan-head,
.plan-row {
  display: grid;
  grid-template-columns: minmax(240px, 1.5fr) 100px 120px 90px 190px minmax(210px, auto);
  gap: 14px;
  align-items: center;
  padding: 13px 14px;
}

.plan-head {
  background: #f8fafc;
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
}

.plan-row {
  border-top: 1px solid #eef2f7;
}

.plan-row > div:first-child {
  display: grid;
  gap: 4px;
}

small {
  color: #64748b;
}

.plan-modal {
  width: min(920px, calc(100vw - 48px));
}

.form-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 220px;
  gap: 12px;
}

.add-item-row {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) 160px auto;
  gap: 10px;
  margin: 8px 0 14px;
}

.item-list {
  display: grid;
  gap: 8px;
}

.item-row {
  display: grid;
  grid-template-columns: 32px minmax(180px, 1fr) 150px auto;
  gap: 10px;
  align-items: center;
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}

@media (max-width: 980px) {
  .page-header,
  .stats-grid,
  .plan-head,
  .plan-row,
  .form-grid,
  .add-item-row,
  .item-row {
    grid-template-columns: 1fr;
  }

  .page-header {
    display: grid;
  }
}
</style>
