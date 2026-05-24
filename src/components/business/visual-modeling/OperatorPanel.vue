<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Component } from 'vue'
import { NEmpty, NIcon, NInput, NScrollbar, NTag, NTooltip } from 'naive-ui'
import {
  AnalyticsOutline,
  CodeSlashOutline,
  FunnelOutline,
  GitBranchOutline,
  LayersOutline,
  ServerOutline,
  SparklesOutline,
} from '@vicons/ionicons5'
import type { OperatorCategory, OperatorDefinition, OperatorType, VisualModelingTaskType } from '@/types/visualModeling'

const props = defineProps<{
  operators: OperatorDefinition[]
  taskType: VisualModelingTaskType
}>()

const emit = defineEmits<{
  add: [operatorType: OperatorType]
}>()

const keyword = ref('')

const categoryOrder: OperatorCategory[] = ['数据输入', '数据清洗', '数据拆分', '特征工程', '自然语言处理', '机器学习', '输出']

const categoryIcons: Record<OperatorCategory, Component> = {
  数据输入: ServerOutline,
  数据清洗: FunnelOutline,
  数据拆分: GitBranchOutline,
  特征工程: SparklesOutline,
  自然语言处理: CodeSlashOutline,
  机器学习: AnalyticsOutline,
  输出: LayersOutline,
}

function iconComponent(category: OperatorCategory): Component {
  return categoryIcons[category]
}

function disabledReason(operator: OperatorDefinition): string {
  return operator.unavailableReason ?? ''
}

const sections = computed(() => {
  const text = keyword.value.trim().toLowerCase()
  return categoryOrder
    .map((category) => {
      const items = props.operators.filter((operator) => {
        const matchedCategory = operator.category === category
        const matchedTaskType = operator.allowedTaskTypes.includes(props.taskType)
        const matchedKeyword =
          !text ||
          [operator.name, operator.description, operator.type, ...operator.aliases]
            .join(' ')
            .toLowerCase()
            .includes(text)
        return matchedCategory && matchedTaskType && matchedKeyword
      })
      return { category, items }
    })
    .filter((section) => section.items.length > 0)
})

function handleDragStart(event: DragEvent, operator: OperatorDefinition) {
  if (disabledReason(operator)) {
    event.preventDefault()
    return
  }
  event.dataTransfer?.setData('application/x-visual-modeling-operator', operator.type)
}
</script>

<template>
  <aside class="operator-panel">
    <div class="panel-head">
      <div>
        <div class="panel-title">算子</div>
        <div class="panel-subtitle">{{ taskType === 'offline' ? '离线任务' : '实时任务' }}</div>
      </div>
    </div>
    <n-input v-model:value="keyword" clearable size="small" placeholder="搜索算子名称" />

    <n-scrollbar class="operator-scrollbar">
      <div v-if="sections.length" class="operator-sections">
        <section v-for="section in sections" :key="section.category" class="operator-section">
          <div class="section-title">
            <n-icon size="16">
              <component :is="iconComponent(section.category)" />
            </n-icon>
            <span>{{ section.category }}</span>
          </div>
          <n-tooltip v-for="operator in section.items" :key="operator.type" placement="right" trigger="hover">
            <template #trigger>
              <button
                class="operator-item"
                :class="{ disabled: disabledReason(operator) }"
                draggable="true"
                type="button"
                @click="!disabledReason(operator) && emit('add', operator.type)"
                @dragstart="handleDragStart($event, operator)"
              >
                <span class="operator-icon">
                  <n-icon size="16">
                    <component :is="iconComponent(operator.category)" />
                  </n-icon>
                </span>
                <span class="operator-copy">
                  <span class="operator-name">{{ operator.name }}</span>
                  <span class="operator-desc">{{ operator.description }}</span>
                </span>
                <n-tag v-if="disabledReason(operator)" size="small" :bordered="false">不可用</n-tag>
              </button>
            </template>
            {{ disabledReason(operator) || operator.description }}
          </n-tooltip>
        </section>
      </div>
      <n-empty v-else class="operator-empty" description="未找到相关算子" />
    </n-scrollbar>
  </aside>
</template>

<style scoped lang="scss">
.operator-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  padding: 14px;
  background: #ffffff;
  border-right: 1px solid #e5e7eb;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-title {
  font-size: 15px;
  font-weight: 650;
  color: #111827;
}

.panel-subtitle {
  margin-top: 2px;
  font-size: 12px;
  color: #6b7280;
}

.operator-scrollbar {
  min-height: 0;
  flex: 1;
}

.operator-sections {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-bottom: 12px;
}

.operator-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #4b5563;
  font-size: 12px;
  font-weight: 650;
}

.operator-item {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 58px;
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  color: #111827;
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.15s ease;
}

.operator-item:hover {
  border-color: #2563eb;
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.12);
  transform: translateY(-1px);
}

.operator-item.disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.operator-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #eff6ff;
  color: #2563eb;
}

.operator-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.operator-name {
  overflow: hidden;
  font-size: 13px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.operator-desc {
  overflow: hidden;
  color: #6b7280;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.operator-empty {
  margin-top: 72px;
}
</style>
