<script setup lang="ts">
import { computed } from 'vue'
import { NButton, NInput, NSelect, NTag } from 'naive-ui'
import type { MetricFilter, MetricFilterGroup } from '@/types/abTesting'

defineOptions({ name: 'MetricFilterBuilder' })

type FilterDraft = Omit<MetricFilter, 'value'> & { value?: string }
export type FilterGroupDraft = Omit<MetricFilterGroup, 'conditions' | 'groups'> & {
  conditions: FilterDraft[]
  groups: FilterGroupDraft[]
}

const props = withDefaults(
  defineProps<{
    group: FilterGroupDraft
    title?: string
    propertyOptions: Array<{ label: string; value: string; disabled?: boolean }>
    operatorOptions: Array<{ label: string; value: string; disabled?: boolean }>
    level?: number
    maxDepth?: number
  }>(),
  {
    title: '过滤条件',
    level: 0,
    maxDepth: 3,
  },
)

const emit = defineEmits<{
  propertyChange: [filter: FilterDraft, propertyId: string]
}>()

const canAddChildGroup = computed(() => props.level < props.maxDepth - 1)

function createTempId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function createFilter(): FilterDraft {
  return {
    id: createTempId('filter'),
    propertyId: '',
    propertySource: 'event',
    operator: '=',
    value: '',
  }
}

function createGroup(): FilterGroupDraft {
  return {
    id: createTempId('filter_group'),
    relation: 'AND',
    conditions: [createFilter()],
    groups: [],
  }
}

function addCondition() {
  props.group.conditions.push(createFilter())
}

function removeCondition(filterId: string) {
  props.group.conditions = props.group.conditions.filter((filter) => filter.id !== filterId)
}

function addChildGroup() {
  props.group.groups.push(createGroup())
}

function removeChildGroup(groupId: string) {
  props.group.groups = props.group.groups.filter((group) => group.id !== groupId)
}
</script>

<template>
  <div class="filter-builder" :class="{ nested: level > 0 }">
    <div class="filter-builder-head">
      <div>
        <strong>{{ title }}</strong>
        <span>{{ group.conditions.length }} 条条件，{{ group.groups.length }} 个子组</span>
      </div>
      <div class="filter-actions">
        <n-select
          v-model:value="group.relation"
          size="small"
          :options="[
            { label: '全部满足 AND', value: 'AND' },
            { label: '任一满足 OR', value: 'OR' },
          ]"
        />
        <n-button size="small" secondary @click="addCondition">添加条件</n-button>
        <n-button v-if="canAddChildGroup" size="small" secondary @click="addChildGroup">添加条件组</n-button>
      </div>
    </div>

    <div class="condition-list">
      <div v-for="filter in group.conditions" :key="filter.id" class="condition-row">
        <n-tag size="small" :type="group.relation === 'AND' ? 'info' : 'warning'">{{ group.relation }}</n-tag>
        <n-select
          :value="filter.propertyId"
          :options="propertyOptions"
          filterable
          placeholder="属性"
          @update:value="(value) => emit('propertyChange', filter, String(value))"
        />
        <n-select v-model:value="filter.operator" :options="operatorOptions" placeholder="运算符" />
        <n-input v-model:value="filter.value" placeholder="属性值" />
        <n-button secondary @click="removeCondition(filter.id)">删除</n-button>
      </div>
    </div>

    <div v-if="group.groups.length" class="child-group-list">
      <div v-for="child in group.groups" :key="child.id" class="child-group-shell">
        <MetricFilterBuilder
          :group="child"
          :property-options="propertyOptions"
          :operator-options="operatorOptions"
          :level="level + 1"
          :max-depth="maxDepth"
          title="子条件组"
          @property-change="(...args) => emit('propertyChange', ...args)"
        />
        <n-button size="small" secondary type="error" @click="removeChildGroup(child.id)">删除条件组</n-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.filter-builder {
  display: grid;
  gap: 10px;
  border: 1px solid #d9e2ec;
  border-radius: 8px;
  padding: 10px;
  background: #ffffff;
}

.filter-builder.nested {
  border-style: dashed;
  background: #f8fafc;
}

.filter-builder-head,
.filter-actions,
.condition-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-builder-head {
  justify-content: space-between;
}

.filter-builder-head > div:first-child {
  display: grid;
  gap: 2px;
}

.filter-builder-head span {
  color: #64748b;
  font-size: 12px;
}

.filter-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.filter-actions :deep(.n-select) {
  width: 150px;
}

.condition-list,
.child-group-list {
  display: grid;
  gap: 8px;
}

.condition-row {
  display: grid;
  grid-template-columns: 58px minmax(160px, 1fr) minmax(130px, 0.75fr) minmax(160px, 1fr) 76px;
}

.child-group-shell {
  display: grid;
  gap: 8px;
}

.child-group-shell > .n-button {
  justify-self: end;
}

@media (max-width: 900px) {
  .filter-builder-head,
  .condition-row {
    align-items: stretch;
    grid-template-columns: 1fr;
  }

  .filter-builder-head {
    display: grid;
  }

  .filter-actions {
    justify-content: flex-start;
  }
}
</style>
