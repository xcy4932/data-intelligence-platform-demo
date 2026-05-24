<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NAlert,
  NButton,
  NDropdown,
  NIcon,
  NInput,
  NModal,
  NSelect,
  NSpace,
  NSpin,
  NTag,
} from 'naive-ui'
import type { DropdownOption, SelectOption } from 'naive-ui'
import {
  ArrowBackOutline,
  ArrowRedoOutline,
  ArrowUndoOutline,
  CheckmarkCircleOutline,
  EllipsisHorizontalOutline,
  PlayOutline,
  SaveOutline,
  WarningOutline,
} from '@vicons/ionicons5'
import DataPreviewPanel from '@/components/business/visual-modeling/DataPreviewPanel.vue'
import ModelingCanvas from '@/components/business/visual-modeling/ModelingCanvas.vue'
import NodeConfigPanel from '@/components/business/visual-modeling/NodeConfigPanel.vue'
import OperatorPanel from '@/components/business/visual-modeling/OperatorPanel.vue'
import RunTaskModal from '@/components/business/visual-modeling/RunTaskModal.vue'
import TaskValidateDrawer from '@/components/business/visual-modeling/TaskValidateDrawer.vue'
import { visualModelingService } from '@/services/visualModelingService'
import type {
  ModelingNode,
  OperatorDefinition,
  OperatorType,
  PreviewResult,
  RunTaskPayload,
  ValidationResult,
  VisualModelingDAG,
  VisualModelingTask,
} from '@/types/visualModeling'

const route = useRoute()
const router = useRouter()
const taskId = computed(() => String(route.params.taskId ?? ''))

const loading = ref(true)
const saving = ref(false)
const validating = ref(false)
const previewLoading = ref(false)
const task = ref<VisualModelingTask | null>(null)
const operators = ref<OperatorDefinition[]>([])
const selectedNodeId = ref('')
const selectedNode = computed(() => task.value?.dag.nodes.find((node) => node.id === selectedNodeId.value) ?? null)
const upstreamFields = computed(() =>
  task.value && selectedNodeId.value ? visualModelingService.getUpstreamFields(task.value, selectedNodeId.value) : [],
)
const draftChanged = ref(false)
const saveStatus = ref<'saved' | 'unsaved' | 'saving' | 'failed'>('saved')
const feedback = ref('')
const feedbackType = ref<'success' | 'warning' | 'error' | 'info'>('info')
const validationResult = ref<ValidationResult | null>(null)
const showValidateDrawer = ref(false)
const showRunModal = ref(false)
const showLeaveModal = ref(false)
const showDeleteNodeModal = ref(false)
const showDeleteTaskModal = ref(false)
const showDownstreamModal = ref(false)
const pendingDeleteNodeId = ref('')
const downstreamSourceId = ref('')
const previewResult = ref<PreviewResult | null>(null)
const undoStack = ref<VisualModelingDAG[]>([])
const redoStack = ref<VisualModelingDAG[]>([])
let autosaveTimer: number | undefined

const staticOptions = visualModelingService.getStaticOptions()
const queueOptions: SelectOption[] = staticOptions.queues.map((queue) => ({
  label: queue.name,
  value: queue.id,
  disabled: !queue.available,
}))

const downstreamOptions = computed<SelectOption[]>(() => {
  if (!task.value || !downstreamSourceId.value) return []
  const source = task.value.dag.nodes.find((node) => node.id === downstreamSourceId.value)
  if (!source) return []
  return operators.value
    .filter((operator) => {
      if (operator.category === '数据输入' || !operator.allowedTaskTypes.includes(task.value?.taskType ?? 'offline') || operator.unavailableReason) {
        return false
      }
      const tempNode = visualModelingService.createNode(operator.type, task.value!, source.x + 260, source.y)
      const tempTask = {
        ...task.value!,
        dag: {
          ...task.value!.dag,
          nodes: [...task.value!.dag.nodes, tempNode],
        },
      }
      return visualModelingService.validateConnection(tempTask, source.id, tempNode.id).valid
    })
    .map((operator) => ({ label: `${operator.category} / ${operator.name}`, value: operator.type }))
})

const moreOptions: DropdownOption[] = [
  { label: '另存为', key: 'copy' },
  { label: '权限分配', key: 'permission' },
  { label: '删除任务', key: 'delete' },
]

function clone<T>(value: T): T {
  try {
    return structuredClone(value)
  } catch {
    return JSON.parse(JSON.stringify(value)) as T
  }
}

function selectedSaveTag() {
  if (saveStatus.value === 'saving') return { type: 'info' as const, text: '保存中' }
  if (saveStatus.value === 'failed') return { type: 'error' as const, text: '保存失败' }
  if (saveStatus.value === 'unsaved') return { type: 'warning' as const, text: '未保存' }
  return { type: 'success' as const, text: '已保存' }
}

function markChanged(recordUndo = true) {
  if (!task.value) return
  if (recordUndo) {
    undoStack.value.push(clone(task.value.dag))
    if (undoStack.value.length > 30) {
      undoStack.value.shift()
    }
    redoStack.value = []
  }
  draftChanged.value = true
  saveStatus.value = 'unsaved'
  window.clearTimeout(autosaveTimer)
  autosaveTimer = window.setTimeout(() => {
    void autosave()
  }, 3000)
}

async function autosave() {
  if (!task.value || !draftChanged.value) return
  saveStatus.value = 'saving'
  try {
    task.value = await visualModelingService.saveDraft(task.value)
    draftChanged.value = false
    saveStatus.value = 'saved'
  } catch (error) {
    saveStatus.value = 'failed'
    feedback.value = error instanceof Error ? error.message : '自动保存失败，可手动重试'
    feedbackType.value = 'error'
  }
}

async function copyTask() {
  if (!task.value) return
  try {
    if (draftChanged.value) {
      const saved = await saveTask()
      if (!saved) return
    }
    const result = await visualModelingService.cloneTask(task.value.id)
    feedback.value = '已另存为新任务草稿。'
    feedbackType.value = 'success'
    await router.push(`/visual-modeling/tasks/${result.taskId}/edit`)
    await loadTask()
  } catch (error) {
    feedback.value = error instanceof Error ? error.message : '另存为失败'
    feedbackType.value = 'error'
  }
}

async function loadTask() {
  loading.value = true
  try {
    const current = await visualModelingService.getTask(taskId.value)
    if (!current) {
      feedback.value = '任务不存在或无权限访问。'
      feedbackType.value = 'error'
      return
    }
    task.value = current
    operators.value = await visualModelingService.listOperators(current.taskType)
    selectedNodeId.value = current.dag.nodes[0]?.id ?? ''
    saveStatus.value = 'saved'
    draftChanged.value = false
    feedback.value = '已加载编辑器。'
    feedbackType.value = 'success'
  } catch (error) {
    feedback.value = error instanceof Error ? error.message : '加载编辑器失败'
    feedbackType.value = 'error'
  } finally {
    loading.value = false
  }
}

function findFreePosition(x: number, y: number): { x: number, y: number } {
  if (!task.value) return { x, y }
  let nextX = x
  let nextY = y
  const overlaps = (left: number, top: number) =>
    task.value?.dag.nodes.some((node) => Math.abs(node.x - left) < 150 && Math.abs(node.y - top) < 70) ?? false
  while (overlaps(nextX, nextY)) {
    nextX += 24
    nextY += 24
  }
  return { x: nextX, y: nextY }
}

function addNode(type: OperatorType, x?: number, y?: number) {
  if (!task.value) return
  markChanged()
  const position = findFreePosition(x ?? 520, y ?? 260)
  const node = visualModelingService.createNode(type, task.value, position.x, position.y)
  task.value.dag.nodes.push(node)
  if (selectedNodeId.value) {
    const result = visualModelingService.validateConnection(task.value, selectedNodeId.value, node.id)
    if (result.valid && result.edge) {
      task.value.dag.edges.push(result.edge)
    }
  }
  selectedNodeId.value = node.id
  previewResult.value = null
}

function addNodeAt(type: OperatorType, x: number, y: number) {
  addNode(type, x, y)
}

function updateNode(node: ModelingNode) {
  if (!task.value) return
  markChanged()
  const index = task.value.dag.nodes.findIndex((item) => item.id === node.id)
  if (index >= 0) {
    task.value.dag.nodes[index] = node
  }
}

function moveNode(nodeId: string, x: number, y: number) {
  if (!task.value) return
  const node = task.value.dag.nodes.find((item) => item.id === nodeId)
  if (!node) return
  if (!draftChanged.value) {
    markChanged()
  } else {
    saveStatus.value = 'unsaved'
  }
  node.x = x
  node.y = y
}

function requestDeleteNode(nodeId: string) {
  if (!task.value) return
  const hasEdges = task.value.dag.edges.some((edge) => edge.sourceNodeId === nodeId || edge.targetNodeId === nodeId)
  pendingDeleteNodeId.value = nodeId
  if (hasEdges) {
    showDeleteNodeModal.value = true
  } else {
    confirmDeleteNode()
  }
}

function confirmDeleteNode() {
  if (!task.value || !pendingDeleteNodeId.value) return
  markChanged()
  task.value.dag.nodes = task.value.dag.nodes.filter((node) => node.id !== pendingDeleteNodeId.value)
  task.value.dag.edges = task.value.dag.edges.filter(
    (edge) => edge.sourceNodeId !== pendingDeleteNodeId.value && edge.targetNodeId !== pendingDeleteNodeId.value,
  )
  task.value.dag.nodes.forEach((node) => {
    if (task.value?.dag.edges.some((edge) => edge.targetNodeId === node.id)) {
      return
    }
    if (node.category !== '数据输入') {
      node.validationStatus = 'invalid'
      node.previewStatus = 'empty'
      node.validationErrors = [{ nodeId: node.id, message: '输入不完整' }]
    }
  })
  if (selectedNodeId.value === pendingDeleteNodeId.value) {
    selectedNodeId.value = task.value.dag.nodes[0]?.id ?? ''
  }
  pendingDeleteNodeId.value = ''
  showDeleteNodeModal.value = false
}

function connectNodes(sourceNodeId: string, targetNodeId: string) {
  if (!task.value) return
  const result = visualModelingService.validateConnection(task.value, sourceNodeId, targetNodeId)
  if (!result.valid || !result.edge) {
    feedback.value = result.message
    feedbackType.value = 'error'
    return
  }
  markChanged()
  task.value.dag.edges.push(result.edge)
  feedback.value = result.message
  feedbackType.value = 'success'
}

function openDownstream(sourceNodeId: string) {
  downstreamSourceId.value = sourceNodeId
  showDownstreamModal.value = true
}

function createDownstream(type: OperatorType) {
  if (!task.value || !downstreamSourceId.value) return
  const source = task.value.dag.nodes.find((node) => node.id === downstreamSourceId.value)
  if (!source) return
  markChanged()
  const position = findFreePosition(source.x + 260, source.y)
  const node = visualModelingService.createNode(type, task.value, position.x, position.y)
  task.value.dag.nodes.push(node)
  const result = visualModelingService.validateConnection(task.value, source.id, node.id)
  if (result.valid && result.edge) {
    task.value.dag.edges.push(result.edge)
  } else {
    feedback.value = result.message
    feedbackType.value = 'warning'
  }
  selectedNodeId.value = node.id
  showDownstreamModal.value = false
}

function updateScale(scale: number) {
  if (!task.value) return
  task.value.dag.canvas.scale = scale
}

function updateQueue(queueId: string) {
  if (!task.value) return
  const queue = staticOptions.queues.find((item) => item.id === queueId)
  markChanged()
  task.value.runtimeConfig.resourceQueueId = queueId
  task.value.runtimeConfig.resourceQueueName = queue?.name ?? '默认队列'
}

function undo() {
  if (!task.value || undoStack.value.length === 0) return
  redoStack.value.push(clone(task.value.dag))
  const previous = undoStack.value.pop()
  if (previous) {
    task.value.dag = previous
    selectedNodeId.value = task.value.dag.nodes[0]?.id ?? ''
    draftChanged.value = true
    saveStatus.value = 'unsaved'
  }
}

function redo() {
  if (!task.value || redoStack.value.length === 0) return
  undoStack.value.push(clone(task.value.dag))
  const next = redoStack.value.pop()
  if (next) {
    task.value.dag = next
    selectedNodeId.value = task.value.dag.nodes[0]?.id ?? ''
    draftChanged.value = true
    saveStatus.value = 'unsaved'
  }
}

async function validateTask(openDrawer = true): Promise<ValidationResult | null> {
  if (!task.value) return null
  validating.value = true
  try {
    validationResult.value = await visualModelingService.validateTask(task.value)
    task.value.dag.nodes = task.value.dag.nodes.map((node) => {
      const nodeErrors = validationResult.value?.errors.filter((error) => error.nodeId === node.id) ?? []
      const nodeWarnings = validationResult.value?.warnings.filter((warning) => warning.nodeId === node.id) ?? []
      return {
        ...node,
        validationErrors: nodeErrors,
        validationStatus: nodeErrors.length ? 'invalid' : nodeWarnings.length ? 'warning' : 'valid',
      }
    })
    if (openDrawer) showValidateDrawer.value = true
    return validationResult.value
  } finally {
    validating.value = false
  }
}

async function saveTask(): Promise<boolean> {
  if (!task.value) return false
  saving.value = true
  saveStatus.value = 'saving'
  try {
    const result = await validateTask(false)
    if (!result?.valid) {
      showValidateDrawer.value = true
      saveStatus.value = 'failed'
      feedback.value = '任务校验未通过，请先处理错误。'
      feedbackType.value = 'error'
      return false
    }
    task.value = await visualModelingService.updateTask(task.value)
    draftChanged.value = false
    saveStatus.value = 'saved'
    feedback.value = '任务已保存。'
    feedbackType.value = 'success'
    return true
  } catch (error) {
    saveStatus.value = 'failed'
    feedback.value = error instanceof Error ? error.message : '保存失败'
    feedbackType.value = 'error'
    return false
  } finally {
    saving.value = false
  }
}

async function openRun() {
  const saved = draftChanged.value ? await saveTask() : true
  if (!saved || !task.value) return
  const result = await validateTask(false)
  if (!result?.valid) {
    showValidateDrawer.value = true
    return
  }
  if (result.warnings.length) {
    feedback.value = '存在提醒项，确认后仍可提交运行。'
    feedbackType.value = 'warning'
  }
  showRunModal.value = true
}

async function submitRun(payload: RunTaskPayload) {
  if (!task.value) return
  try {
    await visualModelingService.runTask(task.value.id, payload)
    feedback.value = '任务已提交运行。'
    feedbackType.value = 'success'
    showRunModal.value = false
    task.value = await visualModelingService.getTask(task.value.id)
  } catch (error) {
    feedback.value = error instanceof Error ? error.message : '提交运行失败'
    feedbackType.value = 'error'
  }
}

async function refreshPreview(limit: number) {
  if (!task.value || !selectedNodeId.value) return
  previewLoading.value = true
  try {
    if (draftChanged.value) {
      await visualModelingService.saveDraft(task.value)
    }
    previewResult.value = await visualModelingService.previewNode(task.value.id, selectedNodeId.value, limit)
    feedback.value = '已获取当前节点预览。'
    feedbackType.value = 'success'
  } catch (error) {
    previewResult.value = null
    feedback.value = error instanceof Error ? error.message : '预览失败'
    feedbackType.value = 'error'
  } finally {
    previewLoading.value = false
  }
}

function locateNode(nodeId: string) {
  selectedNodeId.value = nodeId
}

function goBack() {
  if (draftChanged.value) {
    showLeaveModal.value = true
    return
  }
  router.push('/metadata/visual-modeling')
}

function handleMore(key: string) {
  if (key === 'copy') {
    void copyTask()
  }
  if (key === 'permission') {
    feedback.value = '权限分配入口已打开，可为管理、编辑、查看角色授权。'
    feedbackType.value = 'info'
  }
  if (key === 'delete' && task.value) {
    showDeleteTaskModal.value = true
  }
}

async function confirmDeleteTask() {
  if (!task.value) return
  await visualModelingService.deleteTask(task.value.id)
  showDeleteTaskModal.value = false
  await router.push('/metadata/visual-modeling')
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Delete' && selectedNodeId.value && !event.metaKey && !event.ctrlKey) {
    requestDeleteNode(selectedNodeId.value)
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  loadTask()
})

onBeforeUnmount(() => {
  window.clearTimeout(autosaveTimer)
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <main class="editor-page">
    <n-spin :show="loading">
      <template v-if="task">
        <header class="editor-topbar">
          <div class="topbar-left">
            <n-button quaternary circle @click="goBack">
              <template #icon><n-icon><arrow-back-outline /></n-icon></template>
            </n-button>
            <n-input
              class="task-name-input"
              :value="task.name"
              maxlength="64"
              @update:value="task.name = $event; markChanged()"
            />
            <n-tag :type="task.taskType === 'realtime' ? 'info' : 'success'" :bordered="false">
              {{ task.taskType === 'realtime' ? '实时任务' : '离线任务' }}
            </n-tag>
            <n-tag :type="selectedSaveTag().type" :bordered="false">{{ selectedSaveTag().text }}</n-tag>
          </div>
          <div class="topbar-actions">
            <n-space align="center" :wrap="false">
              <n-select
                class="queue-select"
                size="small"
                :value="task.runtimeConfig.resourceQueueId"
                :options="queueOptions"
                @update:value="updateQueue"
              />
              <n-button secondary circle title="撤销" :disabled="undoStack.length === 0" @click="undo">
                <template #icon><n-icon><arrow-undo-outline /></n-icon></template>
              </n-button>
              <n-button secondary circle title="重做" :disabled="redoStack.length === 0" @click="redo">
                <template #icon><n-icon><arrow-redo-outline /></n-icon></template>
              </n-button>
              <n-button secondary circle title="校验" :loading="validating" @click="validateTask(true)">
                <template #icon><n-icon><checkmark-circle-outline /></n-icon></template>
              </n-button>
              <n-button secondary circle title="保存" :loading="saving" @click="saveTask">
                <template #icon><n-icon><save-outline /></n-icon></template>
              </n-button>
              <n-button type="primary" @click="openRun">
                <template #icon><n-icon><play-outline /></n-icon></template>
                运行
              </n-button>
              <n-dropdown :options="moreOptions" @select="handleMore">
                <n-button quaternary circle>
                  <template #icon><n-icon><ellipsis-horizontal-outline /></n-icon></template>
                </n-button>
              </n-dropdown>
            </n-space>
          </div>
        </header>

        <n-alert v-if="task.status === 'running'" type="info" :bordered="false" class="running-tip">
          <template #icon><n-icon><warning-outline /></n-icon></template>
          任务正在运行，保存后不会影响当前运行实例，将在下次运行生效。
        </n-alert>

        <n-alert v-if="feedback" :type="feedbackType" :bordered="false" class="editor-feedback">{{ feedback }}</n-alert>

        <section class="editor-workbench">
          <operator-panel :operators="operators" :task-type="task.taskType" @add="addNode" />
          <modeling-canvas
            :task="task"
            :selected-node-id="selectedNodeId"
            @select="selectedNodeId = $event; previewResult = null"
            @move="moveNode"
            @delete="requestDeleteNode"
            @connect="connectNodes"
            @add-downstream="openDownstream"
            @add-at="addNodeAt"
            @scale="updateScale"
          />
          <node-config-panel
            :task="task"
            :node="selectedNode"
            :upstream-fields="upstreamFields"
            @update="updateNode"
          />
          <data-preview-panel
            :node="selectedNode"
            :preview="previewResult"
            :loading="previewLoading"
            @refresh="refreshPreview"
          />
        </section>

        <task-validate-drawer v-model:show="showValidateDrawer" :result="validationResult" @locate="locateNode" />
        <run-task-modal v-model:show="showRunModal" :task="task" @submit="submitRun" />

        <n-modal
          v-model:show="showDeleteNodeModal"
          preset="dialog"
          title="删除节点"
          positive-text="确认删除"
          negative-text="取消"
          @positive-click="confirmDeleteNode"
        >
          删除该节点会同时删除与其相连的上下游连线，但不会删除其他节点。确认删除？
        </n-modal>

        <n-modal
          v-model:show="showDeleteTaskModal"
          preset="dialog"
          title="删除任务"
          positive-text="确认删除"
          negative-text="取消"
          @positive-click="confirmDeleteTask"
        >
          删除后任务将进入回收站，15 天后自动彻底删除。删除期间任务不会继续调度，相关输出数据集不会被删除。确认删除？
        </n-modal>

        <n-modal v-model:show="showDownstreamModal" preset="card" title="添加下游算子" class="downstream-modal">
          <n-select
            filterable
            placeholder="选择可用下游算子"
            :options="downstreamOptions"
            @update:value="createDownstream"
          />
        </n-modal>

        <n-modal
          v-model:show="showLeaveModal"
          preset="dialog"
          title="离开编辑器"
          positive-text="保存并离开"
          negative-text="留在当前页"
          @positive-click="async () => { if (await saveTask()) router.push('/metadata/visual-modeling') }"
        >
          当前任务还有未保存变更。
        </n-modal>
      </template>
    </n-spin>
  </main>
</template>

<style scoped lang="scss">
.editor-page {
  height: calc(100vh - 65px);
  min-height: 720px;
  background: #f5f7fb;
}

.editor-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: nowrap;
  gap: 16px;
  height: 58px;
  padding: 10px 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #ffffff;
}

.topbar-left {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1 1 auto;
  gap: 10px;
}

.task-name-input {
  width: 280px;
}

.queue-select {
  width: 180px;
}

.topbar-actions {
  flex: 0 0 auto;
  flex-wrap: nowrap !important;
}

.topbar-actions :deep(.n-space) {
  flex-wrap: nowrap !important;
}

.running-tip,
.editor-feedback {
  margin: 10px 14px 0;
}

.editor-workbench {
  display: grid;
  grid-template-columns: minmax(220px, 260px) minmax(0, 1fr) minmax(320px, 370px);
  grid-template-rows: minmax(360px, 1fr) 260px;
  height: calc(100% - 58px);
  padding-top: 10px;
}

.editor-workbench > * {
  min-width: 0;
}

.editor-workbench > :nth-child(1) {
  grid-column: 1;
  grid-row: 1;
}

.editor-workbench > :nth-child(2) {
  grid-column: 2;
  grid-row: 1;
}

.editor-workbench > :nth-child(3) {
  grid-column: 3;
  grid-row: 1;
}

.editor-workbench > :nth-child(4) {
  grid-column: 1 / 4;
  grid-row: 2;
}

.downstream-modal {
  width: 520px;
}
</style>
