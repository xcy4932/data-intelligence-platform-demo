<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NAlert,
  NButton,
  NDataTable,
  NDescriptions,
  NDescriptionsItem,
  NIcon,
  NModal,
  NSelect,
  NSpace,
  NTabPane,
  NTabs,
  NTag,
} from 'naive-ui'
import type { DataTableColumns, SelectOption } from 'naive-ui'
import { ArrowBackOutline, CreateOutline, PlayOutline } from '@vicons/ionicons5'
import ModelingCanvas from '@/components/business/visual-modeling/ModelingCanvas.vue'
import RunTaskModal from '@/components/business/visual-modeling/RunTaskModal.vue'
import { visualModelingService } from '@/services/visualModelingService'
import type {
  LineageNode,
  ModelingNode,
  RunTaskPayload,
  TaskRunRecord,
  VisualModelingTask,
} from '@/types/visualModeling'

const route = useRoute()
const router = useRouter()
const taskId = computed(() => String(route.params.taskId ?? ''))

const loading = ref(false)
const task = ref<VisualModelingTask | null>(null)
const runs = ref<TaskRunRecord[]>([])
const lineageNodes = ref<LineageNode[]>([])
const activeTab = ref(String(route.query.tab ?? 'overview'))
const feedback = ref('')
const feedbackType = ref<'success' | 'warning' | 'error' | 'info'>('info')
const selectedNodeId = ref('')
const previewNodeId = ref('')
const previewMode = ref<'schema' | 'rows'>('schema')
const lineageMode = ref<'graph' | 'table'>('graph')
const resourceTypeFilter = ref<'all' | LineageNode['type']>('all')
const showRunModal = ref(false)
const showRerunModal = ref(false)
const pendingRun = ref<TaskRunRecord | null>(null)

const nodesForPreview = computed<SelectOption[]>(() =>
  task.value?.dag.nodes
    .filter((node) => node.category === '数据输入' || node.category === '输出')
    .map((node) => ({ label: node.displayName, value: node.id })) ?? [],
)

const selectedPreviewNode = computed(() => task.value?.dag.nodes.find((node) => node.id === previewNodeId.value) ?? null)

const filteredLineageNodes = computed(() => {
  if (resourceTypeFilter.value === 'all') return lineageNodes.value
  return lineageNodes.value.filter((node) => node.type === resourceTypeFilter.value)
})

const lineageTypeOptions: SelectOption[] = [
  { label: '全部类型', value: 'all' },
  { label: '数据连接', value: 'connection' },
  { label: '输入数据集', value: 'input_dataset' },
  { label: '当前任务', value: 'task' },
  { label: '输出数据集', value: 'output_dataset' },
  { label: '分析', value: 'analysis' },
  { label: '仪表盘', value: 'dashboard' },
  { label: '标签', value: 'tag' },
]

function taskTypeText(task: VisualModelingTask): string {
  return task.taskType === 'offline' ? '离线任务' : '实时任务'
}

function runModeText(task: VisualModelingTask): string {
  if (task.taskType === 'realtime') return '持续运行'
  return task.runMode === 'manual' ? '手动运行' : `周期运行 ${task.scheduleConfig?.time ?? ''}`
}

function runStatusType(status: TaskRunRecord['status']): 'success' | 'error' | 'warning' | 'info' | 'default' {
  if (status === 'success') return 'success'
  if (status === 'failed' || status === 'terminated') return 'error'
  if (status === 'partial_success') return 'warning'
  if (status === 'running' || status === 'waiting_dependency' || status === 'waiting_schedule') return 'info'
  return 'default'
}

function runStatusText(status: TaskRunRecord['status']): string {
  const map = {
    waiting_schedule: '等待调度',
    waiting_dependency: '等待依赖',
    running: '运行中',
    success: '成功',
    failed: '失败',
    terminated: '终止',
    partial_success: '部分成功',
  }
  return map[status]
}

const runColumns: DataTableColumns<TaskRunRecord> = [
  { title: '业务日期', key: 'businessDate', width: 135 },
  { title: '运行类型', key: 'runType', width: 100, render: (row) => (row.runType === 'rerun' ? '重跑' : row.runType === 'schedule' ? '周期' : '手动') },
  {
    title: '状态',
    key: 'status',
    width: 105,
    render: (row) => h(NTag, { size: 'small', type: runStatusType(row.status), bordered: false }, { default: () => runStatusText(row.status) }),
  },
  { title: '开始时间', key: 'startedAt', width: 170, render: (row) => row.startedAt ?? '-' },
  { title: '结束时间', key: 'finishedAt', width: 170, render: (row) => row.finishedAt ?? '-' },
  { title: '耗时', key: 'durationSeconds', width: 90, render: (row) => (row.durationSeconds ? `${row.durationSeconds}s` : '-') },
  {
    title: '输出表',
    key: 'outputs',
    minWidth: 180,
    render: (row) => row.outputRecords.map((output) => output.outputName).join('，'),
  },
  {
    title: '操作',
    key: 'actions',
    width: 220,
    render: (row) =>
      h(NSpace, { size: 6 }, () => [
        h(NButton, { size: 'small', secondary: true, onClick: () => askRerun(row) }, { default: () => '重跑' }),
        row.status === 'running' || row.status === 'waiting_dependency' || row.status === 'waiting_schedule'
          ? h(NButton, { size: 'small', secondary: true, type: 'error', onClick: () => terminate(row) }, { default: () => '终止' })
          : null,
        h(NButton, { size: 'small', secondary: true, onClick: () => showLogs(row) }, { default: () => '日志' }),
      ]),
  },
]

const schemaColumns: DataTableColumns = [
  { title: '字段名', key: 'name' },
  { title: '类型', key: 'type' },
  { title: '是否可空', key: 'nullable', render: (row) => (row.nullable ? '是' : '否') },
  { title: '角色', key: 'role' },
  { title: '描述', key: 'comment' },
]

function rowColumns(node: ModelingNode | null): DataTableColumns {
  return (node?.schema?.fields ?? []).slice(0, 8).map((field) => ({
    title: field.displayName ?? field.name,
    key: field.name,
    minWidth: 130,
  }))
}

function previewRows(node: ModelingNode | null) {
  const fields = node?.schema?.fields ?? []
  return [
    Object.fromEntries(fields.map((field) => [field.name, field.type.includes('int') || field.type.includes('double') || field.type === 'decimal' ? 128 : `${field.name}_sample`])),
    Object.fromEntries(fields.map((field) => [field.name, field.type.includes('int') || field.type.includes('double') || field.type === 'decimal' ? 256 : `${field.name}_sample_2`])),
  ]
}

async function loadData() {
  loading.value = true
  try {
    const current = await visualModelingService.getTask(taskId.value)
    if (!current) {
      feedback.value = '任务不存在或无权限访问。'
      feedbackType.value = 'error'
      return
    }
    task.value = current
    runs.value = await visualModelingService.listRuns(current.id)
    const lineage = await visualModelingService.getLineage(current.id)
    lineageNodes.value = lineage.nodes
    selectedNodeId.value = current.dag.nodes[0]?.id ?? ''
    previewNodeId.value = nodesForPreview.value[0]?.value as string ?? ''
    feedback.value = '已加载任务详情。'
    feedbackType.value = 'success'
  } catch (error) {
    feedback.value = error instanceof Error ? error.message : '加载失败'
    feedbackType.value = 'error'
  } finally {
    loading.value = false
  }
}

async function submitRun(payload: RunTaskPayload) {
  if (!task.value) return
  try {
    await visualModelingService.runTask(task.value.id, payload)
    feedback.value = '任务已提交运行。'
    feedbackType.value = 'success'
    showRunModal.value = false
    await loadData()
  } catch (error) {
    feedback.value = error instanceof Error ? error.message : '提交运行失败'
    feedbackType.value = 'error'
  }
}

function askRerun(run: TaskRunRecord) {
  pendingRun.value = run
  showRerunModal.value = true
}

async function confirmRerun() {
  if (!pendingRun.value) return
  await visualModelingService.rerun(pendingRun.value.id)
  showRerunModal.value = false
  feedback.value = '已按当前任务配置提交重跑。'
  feedbackType.value = 'success'
  await loadData()
}

async function terminate(run: TaskRunRecord) {
  await visualModelingService.terminateRun(run.id)
  feedback.value = '任务已终止，已写入成功的输出不会自动回滚。'
  feedbackType.value = 'warning'
  await loadData()
}

function showLogs(run: TaskRunRecord) {
  feedback.value = run.logLines.join('  ')
  feedbackType.value = run.status === 'failed' ? 'error' : 'info'
}

watch(activeTab, (tab) => {
  router.replace({ query: { ...route.query, tab } })
})

onMounted(loadData)
</script>

<template>
  <main class="page-container detail-page">
    <header class="detail-header">
      <div>
        <n-button quaternary size="small" @click="router.push('/metadata/visual-modeling')">
          <template #icon><n-icon><arrow-back-outline /></n-icon></template>
          返回
        </n-button>
        <h1 class="page-title">{{ task?.name ?? '任务详情' }}</h1>
        <p class="page-description">{{ task?.description }}</p>
      </div>
      <n-space v-if="task">
        <n-button secondary @click="router.push(`/visual-modeling/tasks/${task.id}/edit`)">
          <template #icon><n-icon><create-outline /></n-icon></template>
          编辑
        </n-button>
        <n-button type="primary" @click="showRunModal = true">
          <template #icon><n-icon><play-outline /></n-icon></template>
          运行
        </n-button>
      </n-space>
    </header>

    <n-alert v-if="feedback" :type="feedbackType" :bordered="false">{{ feedback }}</n-alert>

    <n-tabs v-model:value="activeTab" type="line" animated class="detail-tabs">
      <n-tab-pane name="overview" tab="基本信息">
        <n-descriptions v-if="task" bordered :column="3" label-placement="left">
          <n-descriptions-item label="任务名称">{{ task.name }}</n-descriptions-item>
          <n-descriptions-item label="任务类型">{{ taskTypeText(task) }}</n-descriptions-item>
          <n-descriptions-item label="创建人">{{ task.createdBy }}</n-descriptions-item>
          <n-descriptions-item label="创建时间">{{ task.createdAt }}</n-descriptions-item>
          <n-descriptions-item label="运行频率">{{ runModeText(task) }}</n-descriptions-item>
          <n-descriptions-item label="最近运行时间">{{ task.lastRunAt ?? '-' }}</n-descriptions-item>
          <n-descriptions-item label="最近修改时间">{{ task.updatedAt }}</n-descriptions-item>
          <n-descriptions-item label="保存目录">{{ task.folderName ?? '-' }}</n-descriptions-item>
          <n-descriptions-item label="资源队列">{{ task.runtimeConfig.resourceQueueName }}</n-descriptions-item>
        </n-descriptions>
      </n-tab-pane>

      <n-tab-pane name="process" tab="处理流程">
        <section v-if="task" class="readonly-canvas">
          <modeling-canvas
            :task="task"
            :selected-node-id="selectedNodeId"
            readonly
            @select="selectedNodeId = $event"
            @move="() => undefined"
            @delete="() => undefined"
            @connect="() => undefined"
            @add-downstream="() => undefined"
            @add-at="() => undefined"
            @scale="task.dag.canvas.scale = $event"
          />
        </section>
      </n-tab-pane>

      <n-tab-pane name="preview" tab="输入输出预览">
        <section class="preview-section">
          <n-space align="center">
            <n-select v-model:value="previewNodeId" :options="nodesForPreview" class="preview-select" />
            <n-select
              v-model:value="previewMode"
              :options="[
                { label: '表结构', value: 'schema' },
                { label: '明细数据', value: 'rows' },
              ]"
              class="mode-select"
            />
          </n-space>
          <n-data-table
            v-if="previewMode === 'schema'"
            :columns="schemaColumns"
            :data="selectedPreviewNode?.schema?.fields ?? []"
            :pagination="{ pageSize: 8 }"
          />
          <n-data-table
            v-else
            :columns="rowColumns(selectedPreviewNode)"
            :data="previewRows(selectedPreviewNode)"
            :scroll-x="1000"
          />
        </section>
      </n-tab-pane>

      <n-tab-pane name="runRecords" tab="运行记录">
        <n-data-table :loading="loading" :columns="runColumns" :data="runs" :scroll-x="1200" :pagination="{ pageSize: 8 }" />
      </n-tab-pane>

      <n-tab-pane name="lineage" tab="血缘视图">
        <section class="lineage-toolbar">
          <n-select v-model:value="lineageMode" :options="[{ label: '图谱模式', value: 'graph' }, { label: '表格模式', value: 'table' }]" />
          <n-select v-model:value="resourceTypeFilter" :options="lineageTypeOptions" />
        </section>
        <section v-if="lineageMode === 'graph'" class="lineage-graph">
          <div class="lineage-column">
            <div class="column-title">上游</div>
            <button v-for="node in filteredLineageNodes.filter((item) => item.level === 'upstream')" :key="node.id" type="button" class="lineage-node">
              {{ node.label }}
            </button>
          </div>
          <div class="lineage-column current">
            <div class="column-title">当前任务</div>
            <button v-for="node in filteredLineageNodes.filter((item) => item.level === 'current')" :key="node.id" type="button" class="lineage-node primary">
              {{ node.label }}
            </button>
          </div>
          <div class="lineage-column">
            <div class="column-title">下游</div>
            <button v-for="node in filteredLineageNodes.filter((item) => item.level === 'downstream')" :key="node.id" type="button" class="lineage-node">
              {{ node.label }}
            </button>
          </div>
        </section>
        <n-data-table
          v-else
          :columns="[
            { title: '资源', key: 'label' },
            { title: '类型', key: 'type' },
            { title: '层级', key: 'level' },
          ]"
          :data="filteredLineageNodes"
        />
      </n-tab-pane>
    </n-tabs>

    <run-task-modal v-model:show="showRunModal" :task="task" @submit="submitRun" />
    <n-modal
      v-model:show="showRerunModal"
      preset="dialog"
      title="确认重跑"
      positive-text="确认继续"
      negative-text="取消"
      @positive-click="confirmRerun"
    >
      重跑将使用当前任务配置重新执行该业务日期，可能覆盖已有输出结果。确认继续？
    </n-modal>
  </main>
</template>

<style scoped lang="scss">
.detail-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.detail-tabs {
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
}

.readonly-canvas {
  height: 520px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.preview-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-select {
  width: 280px;
}

.mode-select {
  width: 140px;
}

.lineage-toolbar {
  display: grid;
  grid-template-columns: 160px 180px;
  gap: 10px;
  margin-bottom: 12px;
}

.lineage-graph {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  min-height: 360px;
  padding: 20px;
  border-radius: 8px;
  background: #f8fafc;
}

.lineage-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.column-title {
  color: #64748b;
  font-size: 13px;
  font-weight: 650;
}

.lineage-node {
  width: min(100%, 260px);
  min-height: 48px;
  padding: 10px;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: #ffffff;
  color: #334155;
  cursor: pointer;
}

.lineage-node.primary {
  border-color: #2563eb;
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 700;
}
</style>
