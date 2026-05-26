<script setup lang="ts">
import { NButton, NInput, NSelect, NSpace } from 'naive-ui'
import TagConditionGroupEditor from './TagConditionGroupEditor.vue'
import type { EntityId } from '@/types/common'
import type { TagRuleGroup, TagType, TagValueRule } from '@/types/tag'

const values = defineModel<TagValueRule[]>('values', { required: true })

const props = defineProps<{
  tagType: Extract<TagType, 'rule' | 'lifecycle'>
}>()

const emit = defineEmits<{
  change: []
}>()

const markChanged = (): void => {
  emit('change')
}

const emptyGroup = (prefix: string): TagRuleGroup => ({
  id: `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`,
  logic: 'and',
  conditions: [],
  groups: [],
})

const addRuleValue = (): void => {
  const nextIndex = values.value.length + 1
  values.value = [
    ...values.value,
    {
      id: `draft-value-${Date.now()}`,
      name: props.tagType === 'lifecycle' ? `阶段 ${nextIndex}` : `标签值 ${nextIndex}`,
      priority: nextIndex,
      include: emptyGroup('include'),
      exclude: { ...emptyGroup('exclude'), logic: 'or' },
    },
  ]
  markChanged()
}

const duplicateRuleValue = (value: TagValueRule): void => {
  values.value = [
    ...values.value,
    {
      ...JSON.parse(JSON.stringify(value)),
      id: `draft-value-${Date.now()}`,
      name: `${value.name}_副本`,
      priority: values.value.length + 1,
    },
  ]
  markChanged()
}

const removeRuleValue = (valueId: EntityId): void => {
  if (values.value.length <= (props.tagType === 'lifecycle' ? 2 : 1)) return
  values.value = values.value.filter((item) => item.id !== valueId)
  markChanged()
}

const moveRuleValue = (valueId: EntityId, direction: -1 | 1): void => {
  const index = values.value.findIndex((item) => item.id === valueId)
  const nextIndex = index + direction
  if (index < 0 || nextIndex < 0 || nextIndex >= values.value.length) return
  const next = [...values.value]
  const [item] = next.splice(index, 1)
  if (!item) return
  next.splice(nextIndex, 0, item)
  values.value = next.map((value, order) => ({ ...value, priority: order + 1 }))
  markChanged()
}

const applyLifecycleModel = (model: 'AIPL' | '5A'): void => {
  const names = model === 'AIPL'
    ? ['认知', '兴趣', '购买', '忠诚']
    : ['了解', '吸引', '问询', '行动', '拥护']
  values.value = names.map((name, index) => ({
    id: `life-${model}-${index}`,
    name,
    priority: index + 1,
    include: emptyGroup(`include-${index}`),
    exclude: { ...emptyGroup(`exclude-${index}`), logic: 'or' },
  }))
  markChanged()
}
</script>

<template>
  <div class="rule-value-list">
    <div v-if="tagType === 'lifecycle'" class="lifecycle-model-actions">
      <span>模型阶段</span>
      <n-button size="small" @click="applyLifecycleModel('AIPL')">套用 AIPL</n-button>
      <n-button size="small" @click="applyLifecycleModel('5A')">套用 5A</n-button>
      <small>可继续重命名、复制、删除或新增阶段，最多 8 个阶段。</small>
    </div>

    <div v-for="(value, index) in values" :key="value.id" class="rule-value-card">
      <div class="rule-card-head">
        <n-input v-model:value="value.name" :placeholder="tagType === 'lifecycle' ? '阶段名称' : '标签值名称'" @input="markChanged" />
        <n-space>
          <n-select
            v-model:value="value.priority"
            size="small"
            :options="values.map((_, order) => ({ label: `优先级 ${order + 1}`, value: order + 1 }))"
            @update:value="markChanged"
          />
          <n-button size="small" :disabled="index === 0" @click="moveRuleValue(value.id, -1)">上移</n-button>
          <n-button size="small" :disabled="index === values.length - 1" @click="moveRuleValue(value.id, 1)">下移</n-button>
          <n-button size="small" @click="duplicateRuleValue(value)">复制</n-button>
          <n-button size="small" type="error" :disabled="values.length <= (tagType === 'lifecycle' ? 2 : 1)" @click="removeRuleValue(value.id)">删除</n-button>
        </n-space>
      </div>
      <div class="condition-columns">
        <TagConditionGroupEditor v-model:group="value.include" title="满足条件" @change="markChanged" />
        <TagConditionGroupEditor v-model:group="value.exclude" title="排除条件" muted @change="markChanged" />
      </div>
    </div>
    <n-button :disabled="tagType === 'lifecycle' && values.length >= 8" @click="addRuleValue">
      {{ tagType === 'lifecycle' ? '添加新的标签值' : '新增标签值' }}
    </n-button>
  </div>
</template>

<style scoped>
.rule-value-list {
  display: grid;
  gap: 12px;
}

.lifecycle-model-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  color: #475569;
}

.lifecycle-model-actions small {
  color: #64748b;
}

.rule-value-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  display: grid;
  gap: 12px;
}

.rule-card-head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.rule-card-head > :deep(.n-input) {
  flex: 1;
}

.condition-columns {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  align-items: stretch;
}

.condition-columns > * {
  min-width: 0;
}

@media (max-width: 1200px) {
  .rule-card-head,
  .condition-columns,
  .lifecycle-model-actions {
    display: grid;
  }
}
</style>
