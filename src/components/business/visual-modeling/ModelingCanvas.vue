<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { NButton, NEmpty, NIcon, NTag, NTooltip } from 'naive-ui'
import { AddOutline, ChevronDownOutline, ChevronUpOutline, GitBranchOutline, TrashOutline } from '@vicons/ionicons5'
import type { ModelingNode, OperatorType, VisualModelingTask } from '@/types/visualModeling'

const props = withDefaults(
  defineProps<{
    task: VisualModelingTask
    selectedNodeId?: string
    readonly?: boolean
  }>(),
  {
    selectedNodeId: '',
    readonly: false,
  },
)

const emit = defineEmits<{
  select: [nodeId: string]
  move: [nodeId: string, x: number, y: number]
  delete: [nodeId: string]
  connect: [sourceNodeId: string, targetNodeId: string]
  addDownstream: [sourceNodeId: string]
  addAt: [operatorType: OperatorType, x: number, y: number]
  scale: [scale: number]
}>()

const canvasRef = ref<HTMLElement | null>(null)
const connectingSourceId = ref('')
const dragState = ref<{ nodeId: string, startX: number, startY: number, originX: number, originY: number } | null>(null)
const expandedNodeIds = ref<Set<string>>(new Set())
const minNodeWidth = 220
const minNodeHeight = 104
const maxExpandedNodeHeight = 260

const nodeMap = computed(() => new Map(props.task.dag.nodes.map((node) => [node.id, node])))
const currentScale = computed(() => props.task.dag.canvas.scale || 1)

function nodeWidth(node: ModelingNode): number {
  return Math.max(node.width, minNodeWidth)
}

function nodeHeight(node: ModelingNode): number {
  const expandedFields = isFieldsExpanded(node.id) ? visibleFields(node).length : 0
  if (expandedFields === 0) {
    return Math.max(node.height, minNodeHeight)
  }
  const expandedHeight = 12 + Math.min(expandedFields, 5) * 28
  return Math.max(node.height, Math.min(minNodeHeight + expandedHeight, maxExpandedNodeHeight))
}

function visibleFields(node: ModelingNode) {
  return node.schema?.fields ?? []
}

function isFieldsExpanded(nodeId: string): boolean {
  return expandedNodeIds.value.has(nodeId)
}

function toggleFields(nodeId: string) {
  const next = new Set(expandedNodeIds.value)
  if (next.has(nodeId)) {
    next.delete(nodeId)
  } else {
    next.add(nodeId)
  }
  expandedNodeIds.value = next
}

const edgePaths = computed(() => {
  return props.task.dag.edges
    .map((edge) => {
      const source = nodeMap.value.get(edge.sourceNodeId)
      const target = nodeMap.value.get(edge.targetNodeId)
      if (!source || !target) {
        return null
      }
      const x1 = source.x + nodeWidth(source)
      const y1 = source.y + nodeHeight(source) / 2
      const x2 = target.x
      const y2 = target.y + nodeHeight(target) / 2
      const mid = Math.max(60, Math.abs(x2 - x1) / 2)
      return {
        id: edge.id,
        path: `M ${x1} ${y1} C ${x1 + mid} ${y1}, ${x2 - mid} ${y2}, ${x2} ${y2}`,
        sourceId: source.id,
        targetId: target.id,
      }
    })
    .filter((path): path is { id: string, path: string, sourceId: string, targetId: string } => Boolean(path))
})

function statusType(node: ModelingNode): 'success' | 'warning' | 'error' | 'default' {
  if (node.validationStatus === 'valid') return 'success'
  if (node.validationStatus === 'warning') return 'warning'
  if (node.validationStatus === 'invalid') return 'error'
  return 'default'
}

function statusText(node: ModelingNode): string {
  if (node.validationStatus === 'valid') return '已通过'
  if (node.validationStatus === 'warning') return '有提醒'
  if (node.validationStatus === 'invalid') return '未完成'
  return '待校验'
}

function selectNode(nodeId: string) {
  if (connectingSourceId.value && connectingSourceId.value !== nodeId) {
    emit('connect', connectingSourceId.value, nodeId)
    connectingSourceId.value = ''
    return
  }
  emit('select', nodeId)
}

function startConnecting(nodeId: string) {
  if (props.readonly) return
  connectingSourceId.value = connectingSourceId.value === nodeId ? '' : nodeId
  emit('select', nodeId)
}

function startMove(event: PointerEvent, node: ModelingNode) {
  if (props.readonly) return
  const target = event.target as HTMLElement
  if (target.closest('button') || target.closest('.node-fields')) {
    return
  }
  dragState.value = {
    nodeId: node.id,
    startX: event.clientX,
    startY: event.clientY,
    originX: node.x,
    originY: node.y,
  }
  window.addEventListener('pointermove', handleMove)
  window.addEventListener('pointerup', stopMove)
}

function handleMove(event: PointerEvent) {
  const state = dragState.value
  if (!state) return
  const deltaX = (event.clientX - state.startX) / currentScale.value
  const deltaY = (event.clientY - state.startY) / currentScale.value
  emit('move', state.nodeId, Math.max(0, Math.round(state.originX + deltaX)), Math.max(0, Math.round(state.originY + deltaY)))
}

function stopMove() {
  dragState.value = null
  window.removeEventListener('pointermove', handleMove)
  window.removeEventListener('pointerup', stopMove)
}

function handleDrop(event: DragEvent) {
  if (props.readonly) return
  const type = event.dataTransfer?.getData('application/x-visual-modeling-operator') as OperatorType
  if (!type || !canvasRef.value) {
    return
  }
  const rect = canvasRef.value.getBoundingClientRect()
  const x = (event.clientX - rect.left + canvasRef.value.scrollLeft) / currentScale.value
  const y = (event.clientY - rect.top + canvasRef.value.scrollTop) / currentScale.value
  emit('addAt', type, Math.max(24, Math.round(x)), Math.max(24, Math.round(y)))
}

function zoom(delta: number) {
  const next = Math.min(1.4, Math.max(0.65, Number((currentScale.value + delta).toFixed(2))))
  emit('scale', next)
}

onBeforeUnmount(() => {
  stopMove()
})
</script>

<template>
  <div class="canvas-shell">
    <div class="canvas-toolbar">
      <n-button size="tiny" secondary :disabled="currentScale <= 0.65" @click="zoom(-0.1)">-</n-button>
      <span class="zoom-text">{{ Math.round(currentScale * 100) }}%</span>
      <n-button size="tiny" secondary :disabled="currentScale >= 1.4" @click="zoom(0.1)">+</n-button>
      <n-button size="tiny" secondary @click="emit('scale', 1)">1:1</n-button>
    </div>

    <div
      ref="canvasRef"
      class="canvas-viewport"
      @click="connectingSourceId = ''"
      @dragover.prevent
      @drop.prevent="handleDrop"
    >
      <n-empty v-if="task.dag.nodes.length === 0" class="empty-canvas" description="从左侧添加输入节点或算子开始建模" />

      <div class="flow-space" :style="{ transform: `scale(${currentScale})` }">
        <svg class="edge-layer" width="2400" height="1400" viewBox="0 0 2400 1400">
          <defs>
            <marker id="vm-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M 0 0 L 8 4 L 0 8 z" fill="#94a3b8" />
            </marker>
          </defs>
          <path
            v-for="edge in edgePaths"
            :key="edge.id"
            class="edge-path"
            :class="{ active: edge.sourceId === selectedNodeId || edge.targetId === selectedNodeId }"
            :d="edge.path"
            marker-end="url(#vm-arrow)"
          />
        </svg>

        <div
          v-for="node in task.dag.nodes"
          :key="node.id"
          class="canvas-node"
          :class="[
            `status-${node.validationStatus}`,
            { selected: node.id === selectedNodeId, connecting: node.id === connectingSourceId },
          ]"
          :style="{ left: `${node.x}px`, top: `${node.y}px`, width: `${nodeWidth(node)}px`, height: `${nodeHeight(node)}px` }"
          @click.stop="selectNode(node.id)"
          @pointerdown="startMove($event, node)"
        >
          <div class="node-port input" v-if="node.inputPorts.length" />
          <div class="node-port output" v-if="node.outputPorts.length" />
          <div class="node-title-row">
            <span class="node-category">{{ node.category }}</span>
            <n-tag size="small" :bordered="false" :type="statusType(node)">{{ statusText(node) }}</n-tag>
          </div>
          <div class="node-name">{{ node.displayName }}</div>
          <div class="node-meta">
            <span>{{ node.outputPorts.length ? '可接下游' : '最终输出' }}</span>
            <button
              type="button"
              class="field-toggle"
              :aria-label="isFieldsExpanded(node.id) ? '收起字段' : '展开字段'"
              @click.stop="toggleFields(node.id)"
            >
              <span>{{ node.schema?.fields.length ?? 0 }} 字段</span>
              <n-icon size="13">
                <component :is="isFieldsExpanded(node.id) ? ChevronUpOutline : ChevronDownOutline" />
              </n-icon>
            </button>
          </div>
          <div v-if="isFieldsExpanded(node.id)" class="node-fields">
            <span
              v-for="field in visibleFields(node)"
              :key="field.name"
              class="field-chip"
              :title="`${field.displayName ?? field.name} / ${field.name} / ${field.type}`"
            >
              {{ field.displayName ?? field.name }} · {{ field.type }}
            </span>
          </div>
          <div v-if="!readonly" class="node-actions">
            <n-tooltip trigger="hover">
              <template #trigger>
                <button type="button" class="icon-btn" @click.stop="startConnecting(node.id)">
                  <n-icon><git-branch-outline /></n-icon>
                </button>
              </template>
              连线
            </n-tooltip>
            <n-tooltip trigger="hover">
              <template #trigger>
                <button type="button" class="icon-btn" @click.stop="emit('addDownstream', node.id)">
                  <n-icon><add-outline /></n-icon>
                </button>
              </template>
              添加下游
            </n-tooltip>
            <n-tooltip trigger="hover">
              <template #trigger>
                <button type="button" class="icon-btn danger" @click.stop="emit('delete', node.id)">
                  <n-icon><trash-outline /></n-icon>
                </button>
              </template>
              删除
            </n-tooltip>
          </div>
        </div>
      </div>

      <div class="minimap">
        <div class="minimap-title">小地图</div>
        <div class="minimap-body">
          <span
            v-for="node in task.dag.nodes"
            :key="node.id"
            class="mini-node"
            :class="{ selected: node.id === selectedNodeId }"
            :style="{ left: `${node.x / 18}px`, top: `${node.y / 18}px` }"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.canvas-shell {
  position: relative;
  height: 100%;
  background: #f8fafc;
}

.canvas-toolbar {
  position: absolute;
  z-index: 5;
  top: 12px;
  left: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
}

.zoom-text {
  min-width: 42px;
  color: #475569;
  font-size: 12px;
  text-align: center;
}

.canvas-viewport {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: auto;
  background-image:
    linear-gradient(#e8edf5 1px, transparent 1px),
    linear-gradient(90deg, #e8edf5 1px, transparent 1px);
  background-size: 24px 24px;
}

.flow-space {
  position: relative;
  width: 2400px;
  height: 1400px;
  transform-origin: 0 0;
}

.edge-layer {
  position: absolute;
  inset: 0;
  overflow: visible;
  pointer-events: none;
}

.edge-path {
  fill: none;
  stroke: #94a3b8;
  stroke-linecap: round;
  stroke-width: 2;
}

.edge-path.active {
  stroke: #2563eb;
  stroke-width: 2.5;
}

.canvas-node {
  position: absolute;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 8px;
  overflow: visible;
  padding: 14px 16px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
  cursor: grab;
  user-select: none;
}

.canvas-node.selected {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.canvas-node.connecting {
  border-style: dashed;
}

.canvas-node.status-invalid {
  border-color: #dc2626;
}

.canvas-node.status-warning {
  border-color: #f59e0b;
}

.node-title-row,
.node-meta,
.node-actions {
  display: flex;
  align-items: center;
}

.node-title-row,
.node-meta {
  justify-content: space-between;
  min-width: 0;
}

.node-category {
  color: #64748b;
  font-size: 12px;
  font-weight: 650;
  line-height: 18px;
}

.node-name {
  overflow: hidden;
  min-height: 22px;
  color: #111827;
  font-size: 15px;
  font-weight: 700;
  line-height: 22px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-meta {
  color: #64748b;
  font-size: 12px;
  line-height: 18px;
}

.field-toggle {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  max-width: 96px;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: #475569;
  font: inherit;
  line-height: inherit;
  cursor: pointer;
}

.field-toggle span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-fields {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 4px;
  scrollbar-width: thin;
}

.node-fields::-webkit-scrollbar {
  width: 6px;
}

.node-fields::-webkit-scrollbar-track {
  background: transparent;
}

.node-fields::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: #cbd5e1;
}

.field-chip {
  flex: 0 0 auto;
  overflow: hidden;
  padding: 3px 6px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #f8fafc;
  color: #475569;
  font-size: 11px;
  line-height: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-actions {
  position: absolute;
  right: 8px;
  bottom: -17px;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.canvas-node:hover .node-actions,
.canvas-node.selected .node-actions {
  opacity: 1;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: #ffffff;
  color: #2563eb;
  cursor: pointer;
}

.icon-btn.danger {
  color: #dc2626;
}

.node-port {
  position: absolute;
  top: 50%;
  width: 10px;
  height: 10px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  background: #2563eb;
  transform: translateY(-50%);
}

.node-port.input {
  left: -5px;
}

.node-port.output {
  right: -5px;
}

.empty-canvas {
  position: absolute;
  top: 42%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.minimap {
  position: absolute;
  right: 14px;
  bottom: 14px;
  width: 164px;
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
}

.minimap-title {
  margin-bottom: 6px;
  color: #64748b;
  font-size: 12px;
}

.minimap-body {
  position: relative;
  height: 78px;
  border-radius: 6px;
  background: #f1f5f9;
  overflow: hidden;
}

.mini-node {
  position: absolute;
  width: 8px;
  height: 5px;
  border-radius: 2px;
  background: #94a3b8;
}

.mini-node.selected {
  background: #2563eb;
}
</style>
