<script setup lang="ts">
import { h, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NAlert, NButton, NDataTable, NIcon, NInput, NModal, NSpace } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { ArrowBackOutline, RefreshOutline, TrashOutline } from '@vicons/ionicons5'
import { visualModelingService } from '@/services/visualModelingService'
import type { VisualModelingTask } from '@/types/visualModeling'

const router = useRouter()
const loading = ref(false)
const tasks = ref<VisualModelingTask[]>([])
const feedback = ref('正在加载回收站。')
const feedbackType = ref<'success' | 'warning' | 'error' | 'info'>('info')
const showRestoreModal = ref(false)
const showPermanentDeleteModal = ref(false)
const pendingTask = ref<VisualModelingTask | null>(null)
const restoreName = ref('')

const columns: DataTableColumns<VisualModelingTask> = [
  { title: '任务名称', key: 'name', minWidth: 220 },
  { title: '删除人', key: 'deletedBy', width: 120, render: (row) => row.deletedBy ?? '-' },
  { title: '删除时间', key: 'deletedAt', width: 180, render: (row) => row.deletedAt ?? '-' },
  { title: '自动清除时间', key: 'expireDeleteAt', width: 180, render: (row) => row.expireDeleteAt ?? '-' },
  {
    title: '操作',
    key: 'actions',
    width: 220,
    render: (row) =>
      h(NSpace, { size: 8 }, () => [
        h(
          NButton,
          {
            size: 'small',
            secondary: true,
            icon: () => h(NIcon, null, { default: () => h(RefreshOutline) }),
            onClick: () => openRestore(row),
          },
          { default: () => '恢复' },
        ),
        h(
          NButton,
          {
            size: 'small',
            secondary: true,
            type: 'error',
            icon: () => h(NIcon, null, { default: () => h(TrashOutline) }),
            onClick: () => openPermanentDelete(row),
          },
          { default: () => '彻底删除' },
        ),
      ]),
  },
]

async function loadData() {
  loading.value = true
  try {
    tasks.value = await visualModelingService.listRecycleBin()
    feedback.value = '已加载已删除任务。'
    feedbackType.value = 'success'
  } catch (error) {
    feedback.value = error instanceof Error ? error.message : '加载失败'
    feedbackType.value = 'error'
  } finally {
    loading.value = false
  }
}

function openRestore(task: VisualModelingTask) {
  pendingTask.value = task
  restoreName.value = task.name
  showRestoreModal.value = true
}

async function confirmRestore() {
  if (!pendingTask.value) return
  try {
    await visualModelingService.restoreTask(pendingTask.value.id, restoreName.value)
    showRestoreModal.value = false
    feedback.value = '任务已恢复到原目录；如原目录不存在，将恢复到默认目录。'
    feedbackType.value = 'success'
    await loadData()
  } catch (error) {
    feedback.value = error instanceof Error ? error.message : '恢复失败'
    feedbackType.value = 'error'
  }
}

function openPermanentDelete(task: VisualModelingTask) {
  pendingTask.value = task
  showPermanentDeleteModal.value = true
}

async function confirmPermanentDelete() {
  if (!pendingTask.value) return
  await visualModelingService.permanentlyDeleteTask(pendingTask.value.id)
  showPermanentDeleteModal.value = false
  feedback.value = '任务配置已彻底删除，输出数据集未删除。'
  feedbackType.value = 'warning'
  await loadData()
}

onMounted(loadData)
</script>

<template>
  <main class="page-container recycle-page">
    <header class="page-header">
      <div>
        <n-button quaternary size="small" @click="router.push('/metadata/visual-modeling')">
          <template #icon><n-icon><arrow-back-outline /></n-icon></template>
          返回
        </n-button>
        <h1 class="page-title">可视化建模回收站</h1>
        <p class="page-description">恢复已删除任务，或在确认后彻底删除任务配置。</p>
      </div>
    </header>

    <n-alert :type="feedbackType" :bordered="false">{{ feedback }}</n-alert>
    <n-data-table
      class="recycle-table"
      :loading="loading"
      :columns="columns"
      :data="tasks"
      :pagination="{ pageSize: 20 }"
    />

    <n-modal v-model:show="showRestoreModal" preset="card" title="恢复任务" class="restore-modal">
      <p class="modal-copy">如果任务名称冲突，需要重命名后恢复。</p>
      <n-input v-model:value="restoreName" placeholder="恢复后的任务名称" />
      <template #footer>
        <n-space justify="end">
          <n-button @click="showRestoreModal = false">取消</n-button>
          <n-button type="primary" @click="confirmRestore">恢复</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal
      v-model:show="showPermanentDeleteModal"
      preset="dialog"
      title="彻底删除"
      positive-text="确认彻底删除"
      negative-text="取消"
      @positive-click="confirmPermanentDelete"
    >
      后端将物理删除任务配置；已输出的数据集不会被删除，运行记录可按审计要求保留或匿名化。
    </n-modal>
  </main>
</template>

<style scoped lang="scss">
.recycle-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  justify-content: space-between;
}

.recycle-table {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
}

.restore-modal {
  width: 480px;
}

.modal-copy {
  margin-top: 0;
  color: #64748b;
}
</style>
