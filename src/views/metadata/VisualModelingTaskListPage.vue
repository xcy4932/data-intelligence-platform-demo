<script setup lang="ts">
import { computed, h, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NAlert,
  NButton,
  NDataTable,
  NForm,
  NFormItem,
  NIcon,
  NInput,
  NModal,
  NRadio,
  NRadioGroup,
  NSelect,
  NSpace,
  NTag,
} from 'naive-ui'
import type { DataTableColumns, SelectOption } from 'naive-ui'
import {
  AddOutline,
  ArchiveOutline,
  CloudUploadOutline,
  CreateOutline,
  PlayOutline,
  StopCircleOutline,
  TimeOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import RunTaskModal from '@/components/business/visual-modeling/RunTaskModal.vue'
import { visualModelingService } from '@/services/visualModelingService'
import type {
  CreateTaskPayload,
  RunTaskPayload,
  TaskListFilter,
  VisualModelingPermission,
  VisualModelingRunMode,
  VisualModelingTask,
  VisualModelingTaskType,
} from '@/types/visualModeling'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const creating = ref(false)
const feedback = ref('正在加载可视化建模任务。')
const feedbackType = ref<'success' | 'warning' | 'error' | 'info'>('info')
const permission = ref<VisualModelingPermission | null>(null)
const tasks = ref<VisualModelingTask[]>([])
const allTasks = ref<VisualModelingTask[]>([])
const searchInput = ref('')
const runModeFilter = ref<'all' | VisualModelingRunMode>('all')
const ownerFilter = ref<'all' | 'mine'>('all')
const sortValue = ref<TaskListFilter['sort']>('lastRunAt_desc')
const showCreateModal = ref(false)
const showDeleteModal = ref(false)
const showRunModal = ref(false)
const pendingDeleteTask = ref<VisualModelingTask | null>(null)
const runTask = ref<VisualModelingTask | null>(null)
let searchTimer: number | undefined

const staticOptions = visualModelingService.getStaticOptions()

const createForm = reactive<CreateTaskPayload>({
  name: '',
  description: '',
  taskType: 'offline',
  folderId: 'folder_default',
  runMode: 'manual',
  resourceQueueId: 'queue_001',
})
const scheduleTime = ref('02:00')
const nameCheckMessage = ref('')
const createError = ref('')

const statusFilter = computed(() => String(route.query.status ?? 'all') as TaskListFilter['status'])

const runModeOptions: SelectOption[] = [
  { label: '全部', value: 'all' },
  { label: '手动运行', value: 'manual' },
  { label: '周期运行', value: 'schedule' },
]

const ownerOptions: SelectOption[] = [
  { label: '所有人', value: 'all' },
  { label: '只看我的', value: 'mine' },
]

const sortOptions: SelectOption[] = [
  { label: '最近运行时间降序', value: 'lastRunAt_desc' },
  { label: '最近运行时间升序', value: 'lastRunAt_asc' },
  { label: '创建时间降序', value: 'createdAt_desc' },
  { label: '创建时间升序', value: 'createdAt_asc' },
]

const taskTypeOptions: Array<{ label: string, value: VisualModelingTaskType }> = [
  { label: '离线任务', value: 'offline' },
  { label: '实时任务', value: 'realtime' },
]

const folderOptions: SelectOption[] = staticOptions.folders.map((folder) => ({ label: folder.name, value: folder.id }))
const queueOptions: SelectOption[] = staticOptions.queues.map((queue) => ({
  label: queue.name,
  value: queue.id,
  disabled: !queue.available,
}))

const stats = computed(() => {
  const values = {
    success: allTasks.value.filter((task) => task.lastRunStatus === 'success').length,
    failed: allTasks.value.filter((task) => task.lastRunStatus === 'failed' || task.lastRunStatus === 'terminated').length,
    running: allTasks.value.filter((task) =>
      ['running', 'waiting_dependency', 'waiting_schedule'].includes(String(task.lastRunStatus)),
    ).length,
    other: allTasks.value.filter((task) => !task.lastRunStatus).length,
  }
  return [
    { key: 'success', label: '运行成功', value: values.success },
    { key: 'failed', label: '运行失败', value: values.failed },
    { key: 'running', label: '正在运行', value: values.running },
    { key: 'other', label: '其他', value: values.other },
  ]
})

function runStatusText(task: VisualModelingTask): string {
  if (!task.lastRunStatus) return '未运行'
  const map = {
    waiting_schedule: '等待调度',
    waiting_dependency: '等待依赖',
    running: '运行中',
    success: '成功',
    failed: '失败',
    terminated: '终止',
    partial_success: '部分成功',
  }
  return map[task.lastRunStatus]
}

function statusTagType(task: VisualModelingTask): 'success' | 'error' | 'warning' | 'info' | 'default' {
  if (task.lastRunStatus === 'success') return 'success'
  if (task.lastRunStatus === 'failed' || task.lastRunStatus === 'terminated') return 'error'
  if (task.lastRunStatus === 'partial_success') return 'warning'
  if (task.lastRunStatus === 'running' || task.lastRunStatus === 'waiting_dependency' || task.lastRunStatus === 'waiting_schedule') return 'info'
  return 'default'
}

function taskTypeText(type: VisualModelingTaskType): string {
  return type === 'offline' ? '离线' : '实时'
}

function runModeText(mode: VisualModelingRunMode, taskType: VisualModelingTaskType): string {
  if (taskType === 'realtime') return '持续运行'
  return mode === 'manual' ? '手动' : '周期'
}

function listNodeNames(task: VisualModelingTask, category: '数据输入' | '输出'): string {
  const names = task.dag.nodes
    .filter((node) => node.category === category)
    .map((node) => String(node.config.datasetName ?? node.config.topic ?? node.config.tagName ?? node.displayName))
  return names.length ? names.join('，') : '-'
}

function iconButton(icon: unknown) {
  return { icon: () => h(NIcon, null, { default: () => h(icon as never) }) }
}

const columns = computed<DataTableColumns<VisualModelingTask>>(() => [
  {
    title: '任务名称',
    key: 'name',
    width: 220,
    fixed: 'left',
    render: (row) =>
      h(
        NButton,
        { text: true, type: 'primary', onClick: () => router.push(`/visual-modeling/tasks/${row.id}/detail`) },
        { default: () => row.name },
      ),
  },
  {
    title: '任务类型',
    key: 'taskType',
    width: 95,
    render: (row) => h(NTag, { size: 'small', type: row.taskType === 'realtime' ? 'info' : 'success', bordered: false }, { default: () => taskTypeText(row.taskType) }),
  },
  { title: '输入', key: 'inputs', minWidth: 190, ellipsis: { tooltip: true }, render: (row) => listNodeNames(row, '数据输入') },
  { title: '输出', key: 'outputs', minWidth: 210, ellipsis: { tooltip: true }, render: (row) => listNodeNames(row, '输出') },
  { title: '运行方式', key: 'runMode', width: 100, render: (row) => runModeText(row.runMode, row.taskType) },
  {
    title: '最近运行状态',
    key: 'lastRunStatus',
    width: 120,
    render: (row) => h(NTag, { size: 'small', type: statusTagType(row), bordered: false }, { default: () => runStatusText(row) }),
  },
  { title: '最近运行时间', key: 'lastRunAt', width: 170, render: (row) => row.lastRunAt ?? '-' },
  { title: '创建人', key: 'createdBy', width: 110 },
  { title: '更新时间', key: 'updatedAt', width: 170 },
  {
    title: '操作',
    key: 'actions',
    width: 330,
    fixed: 'right',
    render: (row) =>
      h(NSpace, { size: 4 }, () => [
        permission.value?.canRun
          ? h(NButton, { size: 'small', secondary: true, ...iconButton(PlayOutline), onClick: () => openRun(row) }, { default: () => '运行' })
          : null,
        row.taskType === 'realtime' && row.lastRunStatus === 'running'
          ? h(
              NButton,
              {
                size: 'small',
                secondary: true,
                type: 'warning',
                ...iconButton(StopCircleOutline),
                onClick: () => terminateTask(row),
              },
              { default: () => '终止' },
            )
          : null,
        h(
          NButton,
          {
            size: 'small',
            secondary: true,
            ...iconButton(TimeOutline),
            onClick: () => router.push(`/visual-modeling/tasks/${row.id}/detail?tab=runRecords`),
          },
          { default: () => '记录' },
        ),
        permission.value?.canEdit || row.ownerId === 'current_user'
          ? h(
              NButton,
              {
                size: 'small',
                secondary: true,
                ...iconButton(CreateOutline),
                onClick: () => router.push(`/visual-modeling/tasks/${row.id}/edit`),
              },
              { default: () => '编辑' },
            )
          : null,
        permission.value?.canDelete || row.ownerId === 'current_user'
          ? h(NButton, { size: 'small', secondary: true, type: 'error', ...iconButton(TrashOutline), onClick: () => openDelete(row) }, { default: () => '删除' })
          : null,
      ]),
  },
])

async function loadData() {
  loading.value = true
  try {
    permission.value = await visualModelingService.getPermission()
    const filter: TaskListFilter = {
      status: statusFilter.value,
      runMode: runModeFilter.value,
      owner: ownerFilter.value,
      sort: sortValue.value,
      keyword: searchInput.value.trim(),
    }
    const [list, all] = await Promise.all([
      visualModelingService.listTasks(filter),
      visualModelingService.listTasks({ sort: 'lastRunAt_desc' }),
    ])
    tasks.value = list
    allTasks.value = all
    feedback.value = '已加载可视化建模任务。'
    feedbackType.value = 'success'
  } catch (error) {
    feedback.value = error instanceof Error ? error.message : '加载失败'
    feedbackType.value = 'error'
  } finally {
    loading.value = false
  }
}

function toggleStatus(key: string) {
  const next = statusFilter.value === key ? 'all' : key
  router.replace({ query: { ...route.query, status: next === 'all' ? undefined : next } })
}

function scheduleSearch() {
  window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    router.replace({ query: { ...route.query, keyword: searchInput.value.trim() || undefined } })
    loadData()
  }, 500)
}

function resetCreateForm() {
  createForm.name = ''
  createForm.description = ''
  createForm.taskType = 'offline'
  createForm.folderId = 'folder_default'
  createForm.runMode = 'manual'
  createForm.resourceQueueId = 'queue_001'
  scheduleTime.value = '02:00'
  nameCheckMessage.value = ''
  createError.value = ''
}

async function checkName() {
  const result = await visualModelingService.checkName(createForm.name, createForm.folderId)
  nameCheckMessage.value = result.message
}

async function createTask() {
  creating.value = true
  createError.value = ''
  try {
    const payload: CreateTaskPayload = {
      ...createForm,
      runMode: createForm.taskType === 'realtime' ? 'manual' : createForm.runMode,
      scheduleConfig:
        createForm.runMode === 'schedule' && createForm.taskType === 'offline'
          ? { frequency: 'daily', time: scheduleTime.value, dependencyStrategy: 'all_success' }
          : undefined,
    }
    const result = await visualModelingService.createTask(payload)
    showCreateModal.value = false
    await router.push(`/visual-modeling/tasks/${result.taskId}/edit`)
  } catch (error) {
    createError.value = error instanceof Error ? error.message : '创建失败'
  } finally {
    creating.value = false
  }
}

function openRun(task: VisualModelingTask) {
  runTask.value = task
  showRunModal.value = true
}

async function submitRun(payload: RunTaskPayload) {
  if (!runTask.value) return
  try {
    await visualModelingService.runTask(runTask.value.id, payload)
    feedback.value = '任务已提交运行。'
    feedbackType.value = 'success'
    showRunModal.value = false
    await loadData()
  } catch (error) {
    feedback.value = error instanceof Error ? error.message : '提交运行失败'
    feedbackType.value = 'error'
  }
}

async function terminateTask(task: VisualModelingTask) {
  try {
    await visualModelingService.terminateTask(task.id)
    feedback.value = '实时任务已终止，已写入成功的输出不会自动回滚。'
    feedbackType.value = 'warning'
    await loadData()
  } catch (error) {
    feedback.value = error instanceof Error ? error.message : '终止失败'
    feedbackType.value = 'error'
  }
}

function openDelete(task: VisualModelingTask) {
  pendingDeleteTask.value = task
  showDeleteModal.value = true
}

async function confirmDelete() {
  if (!pendingDeleteTask.value) return
  await visualModelingService.deleteTask(pendingDeleteTask.value.id)
  showDeleteModal.value = false
  feedback.value = '任务已进入回收站，15 天后自动彻底删除。'
  feedbackType.value = 'success'
  await loadData()
}

watch([statusFilter, runModeFilter, ownerFilter, sortValue], loadData)

onMounted(() => {
  searchInput.value = String(route.query.keyword ?? '')
  loadData()
})
</script>

<template>
  <main class="page-container visual-modeling-list">
    <header class="page-header">
      <div>
        <h1 class="page-title">可视化建模</h1>
        <p class="page-description">低代码编排输入、清洗、特征、机器学习与输出流程。</p>
      </div>
      <n-space>
        <n-button secondary @click="router.push('/metadata/visual-modeling/recycle-bin')">
          <template #icon><n-icon><archive-outline /></n-icon></template>
          回收站
        </n-button>
        <n-button secondary @click="router.push('/metadata/visual-modeling/migration')">
          <template #icon><n-icon><cloud-upload-outline /></n-icon></template>
          资源迁移
        </n-button>
        <n-button v-if="permission?.canCreate" type="primary" @click="resetCreateForm(); showCreateModal = true">
          <template #icon><n-icon><add-outline /></n-icon></template>
          新建任务
        </n-button>
      </n-space>
    </header>

    <n-alert :type="feedbackType" :bordered="false" class="feedback">{{ feedback }}</n-alert>

    <section class="stats-grid">
      <button
        v-for="item in stats"
        :key="item.key"
        type="button"
        class="stat-card"
        :class="{ active: statusFilter === item.key }"
        @click="toggleStatus(item.key)"
      >
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </button>
    </section>

    <section class="filter-bar">
      <n-input v-model:value="searchInput" clearable placeholder="搜索任务名称 / 输入 / 输出 / 创建人" @update:value="scheduleSearch" />
      <n-select v-model:value="runModeFilter" :options="runModeOptions" />
      <n-select v-model:value="ownerFilter" :options="ownerOptions" />
      <n-select v-model:value="sortValue" :options="sortOptions" />
    </section>

    <n-data-table
      class="task-table"
      :loading="loading"
      :columns="columns"
      :data="tasks"
      :scroll-x="1580"
      :pagination="{ pageSize: 20 }"
      striped
    />

    <n-modal v-model:show="showCreateModal" preset="card" title="新建可视化建模任务" class="create-modal">
      <n-alert v-if="createError" type="error" :bordered="false" class="modal-alert">{{ createError }}</n-alert>
      <n-form label-placement="top">
        <n-form-item label="任务名称" required :feedback="nameCheckMessage" :validation-status="nameCheckMessage.includes('不能') || nameCheckMessage.includes('重复') ? 'error' : undefined">
          <n-input v-model:value="createForm.name" maxlength="64" show-count placeholder="1-64 字符，不允许特殊字符" @blur="checkName" />
        </n-form-item>
        <n-form-item label="任务描述">
          <n-input v-model:value="createForm.description" type="textarea" maxlength="500" show-count :autosize="{ minRows: 2, maxRows: 5 }" />
        </n-form-item>
        <n-form-item label="任务类型" required>
          <n-radio-group v-model:value="createForm.taskType">
            <n-space>
              <n-radio v-for="option in taskTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</n-radio>
            </n-space>
          </n-radio-group>
        </n-form-item>
        <n-form-item label="保存目录">
          <n-select v-model:value="createForm.folderId" :options="folderOptions" />
        </n-form-item>
        <n-form-item v-if="createForm.taskType === 'offline'" label="运行方式" required>
          <n-radio-group v-model:value="createForm.runMode">
            <n-space>
              <n-radio value="manual">手动运行</n-radio>
              <n-radio value="schedule">周期运行</n-radio>
            </n-space>
          </n-radio-group>
        </n-form-item>
        <n-form-item v-if="createForm.taskType === 'offline' && createForm.runMode === 'schedule'" label="调度配置">
          <n-input v-model:value="scheduleTime" placeholder="例如：02:00" />
        </n-form-item>
        <n-form-item label="资源队列" required>
          <n-select v-model:value="createForm.resourceQueueId" :options="queueOptions" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showCreateModal = false">取消</n-button>
          <n-button type="primary" :loading="creating" @click="createTask">确认创建</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showDeleteModal" preset="dialog" title="删除任务" positive-text="确认删除" negative-text="取消" @positive-click="confirmDelete">
      删除后任务将进入回收站，15 天后自动彻底删除。删除期间任务不会继续调度，相关输出数据集不会被删除。确认删除？
    </n-modal>

    <run-task-modal v-model:show="showRunModal" :task="runTask" @submit="submitRun" />
  </main>
</template>

<style scoped lang="scss">
.visual-modeling-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.feedback {
  margin-top: -6px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(160px, 1fr));
  gap: 12px;
}

.stat-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 78px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  color: #475569;
  cursor: pointer;
  text-align: left;
}

.stat-card strong {
  color: #111827;
  font-size: 28px;
}

.stat-card.active {
  border-color: #2563eb;
  background: #eff6ff;
  color: #1d4ed8;
}

.filter-bar {
  display: grid;
  grid-template-columns: minmax(300px, 1.4fr) minmax(140px, 0.6fr) minmax(140px, 0.6fr) minmax(220px, 0.8fr);
  gap: 10px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
}

.task-table {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
}

.create-modal {
  width: 640px;
}

.modal-alert {
  margin-bottom: 12px;
}
</style>
