<script setup lang="ts">
import { computed } from 'vue'
import { NButton, NEmpty, NFormItem, NInput, NInputNumber, NRadio, NRadioGroup, NSelect, NSpace } from 'naive-ui'
import TagConditionGroupEditor from '@/components/tags/TagConditionGroupEditor.vue'
import type { EntityId } from '@/types/common'
import type { TagCreatePayload, TagRuleGroup } from '@/types/tag'
import { ensureRuleGroup, fieldOptions, selectedFieldIds, tagValueTypeShortLabels } from './tagEditorOptions'

defineOptions({ name: 'CalculationTagEditor' })

const draft = defineModel<TagCreatePayload>('draft', { required: true })

const emit = defineEmits<{
  change: []
}>()

const selectedIds = computed(() => selectedFieldIds(draft.value.rule.selectedFields))

const filterGroup = computed<TagRuleGroup>({
  get: () => ensureRuleGroup(draft.value, 'filterGroup', 'calculation-filter'),
  set: (group) => {
    draft.value.rule.filterGroup = group
  },
})

const excludeGroup = computed<TagRuleGroup>({
  get: () => ensureRuleGroup(draft.value, 'excludeGroup', 'calculation-exclude'),
  set: (group) => {
    draft.value.rule.excludeGroup = group
  },
})

const calculationResultBounds = computed({
  get: () => {
    draft.value.rule.resultBounds ??= {}
    return draft.value.rule.resultBounds
  },
  set: (bounds: { min?: number; max?: number }) => {
    draft.value.rule.resultBounds = bounds
  },
})

const markChanged = (): void => {
  emit('change')
}

const addSelectedField = (fieldId: EntityId): void => {
  const field = fieldOptions.find((item) => item.id === fieldId)
  if (!field || selectedIds.value.has(field.id)) return
  draft.value.rule.selectedFields = [...(draft.value.rule.selectedFields ?? []), field]
  draft.value.rule.assignmentRules = [
    ...(draft.value.rule.assignmentRules ?? []),
    { fieldId: field.id, mode: ['text', 'multi_text'].includes(field.valueType) ? 'enum' : 'raw', mappings: [] },
  ]
  draft.value.rule.summary ||= '基于已选字段进行表达式运算。'
  markChanged()
}

const removeSelectedField = (fieldId: EntityId): void => {
  draft.value.rule.selectedFields = (draft.value.rule.selectedFields ?? []).filter((field) => field.id !== fieldId)
  draft.value.rule.assignmentRules = (draft.value.rule.assignmentRules ?? []).filter((rule) => rule.fieldId !== fieldId)
  markChanged()
}

const insertExpressionToken = (token: string): void => {
  draft.value.rule.expression = `${draft.value.rule.expression ?? ''} ${token}`.trim()
  markChanged()
}

const assignmentRuleFor = (fieldId: EntityId) => {
  const rules = draft.value.rule.assignmentRules ?? []
  let rule = rules.find((item) => item.fieldId === fieldId)
  if (!rule) {
    rule = { fieldId, mode: 'raw', mappings: [] }
    draft.value.rule.assignmentRules = [...rules, rule]
  }
  return rule
}

const addAssignmentMapping = (fieldId: EntityId): void => {
  const rule = assignmentRuleFor(fieldId)
  rule.mappings = [
    ...rule.mappings,
    { id: `mapping-${Date.now()}`, label: `取值 ${rule.mappings.length + 1}`, value: rule.mappings.length + 1 },
  ]
  markChanged()
}

const removeAssignmentMapping = (fieldId: EntityId, mappingId: EntityId): void => {
  const rule = assignmentRuleFor(fieldId)
  rule.mappings = rule.mappings.filter((item) => item.id !== mappingId)
  markChanged()
}
</script>

<template>
  <div class="type-editor">
    <div class="dual-config-layout">
      <section class="config-column">
        <h3>可选标签/属性字段</h3>
        <div class="field-picker">
          <button
            v-for="field in fieldOptions"
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
        <h3>参与运算字段</h3>
        <div v-if="draft.rule.selectedFields?.length" class="selected-field-list">
          <div v-for="field in draft.rule.selectedFields" :key="field.id" class="selected-field-row">
            <div class="selected-field-head">
              <div>
                <strong>{{ field.name }}</strong>
                <span>{{ field.id }}</span>
              </div>
              <n-space>
                <n-button size="small" @click="insertExpressionToken(field.id)">插入表达式</n-button>
                <n-button size="small" type="error" @click="removeSelectedField(field.id)">删除</n-button>
              </n-space>
            </div>
            <div class="assignment-editor">
              <n-select
                v-model:value="assignmentRuleFor(field.id).mode"
                :options="[
                  { label: '使用原值', value: 'raw' },
                  { label: '枚举赋值', value: 'enum' },
                  { label: '区间赋值', value: 'range' },
                  { label: '距今天数赋值', value: 'days_since' },
                ]"
                @update:value="markChanged"
              />
              <n-input-number v-model:value="assignmentRuleFor(field.id).defaultValue" placeholder="默认分" @update:value="markChanged" />
            </div>
            <div v-if="assignmentRuleFor(field.id).mode !== 'raw'" class="mapping-list">
              <div v-for="mapping in assignmentRuleFor(field.id).mappings" :key="mapping.id" class="mapping-row">
                <n-input v-model:value="mapping.label" placeholder="枚举值/区间名" @input="markChanged" />
                <n-input-number v-if="assignmentRuleFor(field.id).mode !== 'enum'" v-model:value="mapping.min" placeholder="下限" @update:value="markChanged" />
                <n-input-number v-if="assignmentRuleFor(field.id).mode !== 'enum'" v-model:value="mapping.max" placeholder="上限" @update:value="markChanged" />
                <n-input-number v-model:value="mapping.value" placeholder="分值" @update:value="markChanged" />
                <n-button size="small" type="error" @click="removeAssignmentMapping(field.id, mapping.id)">删除</n-button>
              </div>
              <n-button size="small" @click="addAssignmentMapping(field.id)">新增赋值项</n-button>
            </div>
          </div>
        </div>
        <n-empty v-else description="请选择参与运算的字段" />
      </section>
    </div>

    <section class="config-column">
      <h3>表达式与结果处理</h3>
      <n-form-item label="表达式编辑器">
        <div class="expression-editor">
          <n-input v-model:value="draft.rule.expression" placeholder="例如 used_credit / credit_limit" @input="markChanged" />
          <n-space>
            <n-button size="small" @click="insertExpressionToken('+')">+</n-button>
            <n-button size="small" @click="insertExpressionToken('-')">-</n-button>
            <n-button size="small" @click="insertExpressionToken('*')">×</n-button>
            <n-button size="small" @click="insertExpressionToken('/')">÷</n-button>
            <n-button size="small" @click="insertExpressionToken('(')">(</n-button>
            <n-button size="small" @click="insertExpressionToken(')')">)</n-button>
          </n-space>
        </div>
      </n-form-item>
      <div class="two-column-row">
        <n-form-item label="结果值上下限">
          <div class="inline-fields">
            <n-input-number v-model:value="calculationResultBounds.min" placeholder="最小值" @update:value="markChanged" />
            <n-input-number v-model:value="calculationResultBounds.max" placeholder="最大值" @update:value="markChanged" />
          </div>
        </n-form-item>
        <n-form-item label="空值处理">
          <n-radio-group v-model:value="draft.rule.emptyHandling" @update:value="markChanged">
            <n-radio value="zero">赋 0 处理</n-radio>
            <n-radio value="discard">丢弃</n-radio>
          </n-radio-group>
        </n-form-item>
      </div>
    </section>

    <div class="condition-stack">
      <TagConditionGroupEditor v-model:group="filterGroup" title="参与计算主体筛选" @change="markChanged" />
      <TagConditionGroupEditor v-model:group="excludeGroup" title="排除主体" muted @change="markChanged" />
    </div>
  </div>
</template>

<style scoped>
.type-editor,
.dual-config-layout,
.config-column,
.field-picker,
.selected-field-list,
.condition-stack {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.dual-config-layout {
  grid-template-columns: minmax(240px, 0.78fr) minmax(360px, 1.22fr);
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
.selected-field-head span {
  color: #64748b;
}

.selected-field-row {
  display: grid;
  gap: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px;
}

.selected-field-head,
.assignment-editor,
.two-column-row,
.inline-fields {
  display: grid;
  grid-template-columns: minmax(160px, 1fr) auto;
  gap: 10px;
  align-items: center;
}

.selected-field-head > div {
  display: grid;
  gap: 3px;
}

.assignment-editor,
.two-column-row,
.inline-fields {
  grid-template-columns: repeat(2, minmax(140px, 1fr));
}

.mapping-list,
.expression-editor {
  display: grid;
  gap: 8px;
}

.mapping-row {
  display: grid;
  grid-template-columns: minmax(130px, 1fr) repeat(3, minmax(96px, 0.8fr)) auto;
  gap: 8px;
  align-items: center;
}

@media (max-width: 1200px) {
  .dual-config-layout,
  .selected-field-head,
  .assignment-editor,
  .two-column-row,
  .inline-fields,
  .mapping-row {
    grid-template-columns: 1fr;
  }
}
</style>
