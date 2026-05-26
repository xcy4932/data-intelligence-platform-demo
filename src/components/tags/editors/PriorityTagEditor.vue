<script setup lang="ts">
import { computed } from 'vue'
import { NAlert, NButton, NEmpty, NSpace } from 'naive-ui'
import type { EntityId } from '@/types/common'
import type { TagCreatePayload } from '@/types/tag'
import { fieldOptions, selectedFieldIds, tagValueTypeShortLabels } from './tagEditorOptions'

defineOptions({ name: 'PriorityTagEditor' })

const draft = defineModel<TagCreatePayload>('draft', { required: true })

const emit = defineEmits<{
  change: []
}>()

const selectedIds = computed(() => selectedFieldIds(draft.value.rule.selectedFields))
const compatibleFields = computed(() => fieldOptions.filter((field) => field.valueType === draft.value.valueType))

const markChanged = (): void => {
  emit('change')
}

const addSelectedField = (fieldId: EntityId): void => {
  const field = compatibleFields.value.find((item) => item.id === fieldId)
  if (!field || selectedIds.value.has(field.id)) return
  draft.value.rule.selectedFields = [...(draft.value.rule.selectedFields ?? []), field]
  draft.value.rule.summary ||= '按已选字段顺序取第一个非空值。'
  markChanged()
}

const removeSelectedField = (fieldId: EntityId): void => {
  draft.value.rule.selectedFields = (draft.value.rule.selectedFields ?? []).filter((field) => field.id !== fieldId)
  markChanged()
}

const moveSelectedField = (fieldId: EntityId, direction: -1 | 1): void => {
  const fields = [...(draft.value.rule.selectedFields ?? [])]
  const index = fields.findIndex((field) => field.id === fieldId)
  const nextIndex = index + direction
  if (index < 0 || nextIndex < 0 || nextIndex >= fields.length) return
  const [field] = fields.splice(index, 1)
  if (!field) return
  fields.splice(nextIndex, 0, field)
  draft.value.rule.selectedFields = fields
  markChanged()
}
</script>

<template>
  <div class="type-editor">
    <n-alert type="info">
      排序标签按字段优先级取第一个非空值，因此可选字段只展示与当前标签值类型一致的字段。
    </n-alert>
    <div class="dual-config-layout">
      <section class="config-column">
        <h3>可选标签/属性字段</h3>
        <div class="field-picker">
          <button
            v-for="field in compatibleFields"
            :key="field.id"
            type="button"
            :class="{ selected: selectedIds.has(field.id) }"
            @click="selectedIds.has(field.id) ? removeSelectedField(field.id) : addSelectedField(field.id)"
          >
            <span>{{ field.name }}</span>
            <small>{{ field.id }} · {{ tagValueTypeShortLabels[field.valueType] }}</small>
          </button>
        </div>
      </section>

      <section class="config-column">
        <h3>已选字段优先级</h3>
        <div v-if="draft.rule.selectedFields?.length" class="selected-field-list">
          <div v-for="(field, index) in draft.rule.selectedFields" :key="field.id" class="selected-field-row">
            <div>
              <strong>{{ index + 1 }}. {{ field.name }}</strong>
              <span>{{ field.id }}</span>
            </div>
            <n-space>
              <n-button size="small" :disabled="index === 0" @click="moveSelectedField(field.id, -1)">上移</n-button>
              <n-button size="small" :disabled="index === (draft.rule.selectedFields?.length ?? 0) - 1" @click="moveSelectedField(field.id, 1)">下移</n-button>
              <n-button size="small" type="error" @click="removeSelectedField(field.id)">删除</n-button>
            </n-space>
          </div>
        </div>
        <n-empty v-else description="请选择至少 2 个字段作为优先级来源" />
      </section>
    </div>
  </div>
</template>

<style scoped>
.type-editor,
.dual-config-layout,
.config-column,
.field-picker,
.selected-field-list {
  display: grid;
  gap: 12px;
}

.dual-config-layout {
  grid-template-columns: minmax(240px, 0.82fr) minmax(320px, 1.18fr);
}

.config-column {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  align-content: start;
}

.config-column h3 {
  margin: 0;
  font-size: 15px;
}

.field-picker button {
  display: grid;
  gap: 4px;
  text-align: left;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  padding: 10px;
  cursor: pointer;
}

.field-picker button.selected {
  border-color: #10b981;
  background: #ecfdf5;
}

.field-picker small,
.selected-field-row span {
  color: #64748b;
}

.selected-field-row {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) auto;
  gap: 12px;
  align-items: center;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px;
}

.selected-field-row > div {
  display: grid;
  gap: 3px;
}

@media (max-width: 1200px) {
  .dual-config-layout,
  .selected-field-row {
    grid-template-columns: 1fr;
  }
}
</style>
