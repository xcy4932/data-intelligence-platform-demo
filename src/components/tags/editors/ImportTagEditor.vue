<script setup lang="ts">
import { NButton, NCheckbox, NFormItem, NInput, NSelect, NSwitch, NAlert } from 'naive-ui'
import type { SelectOption } from 'naive-ui'
import type { EntityId } from '@/types/common'
import type { TagCreatePayload, TagValueType } from '@/types/tag'
import { dataSourceOptions, importSourceFields } from './tagEditorOptions'

defineOptions({ name: 'ImportTagEditor' })

const draft = defineModel<TagCreatePayload>('draft', { required: true })

const props = defineProps<{
  categoryOptions: SelectOption[]
  valueTypeOptions: SelectOption[]
}>()

const emit = defineEmits<{
  change: []
}>()

const markChanged = (): void => {
  emit('change')
}

const addImportField = (): void => {
  const fields = draft.value.rule.importFields ?? []
  fields.push({
    id: `import-field-${Date.now()}`,
    sourceField: `field_${fields.length + 1}`,
    tagName: `导入标签 ${fields.length + 1}`,
    categoryId: draft.value.categoryId || 'cat-import',
    valueType: draft.value.valueType,
  })
  draft.value.rule.importFields = fields
  markChanged()
}

const removeImportField = (fieldId: EntityId): void => {
  draft.value.rule.importFields = (draft.value.rule.importFields ?? []).filter((field) => field.id !== fieldId)
  markChanged()
}

const toggleImportField = (sourceField: string, checked: boolean): void => {
  const source = importSourceFields.find((item) => item.sourceField === sourceField)
  if (!source) return
  const fields = draft.value.rule.importFields ?? []
  if (!checked) {
    draft.value.rule.importFields = fields.filter((field) => field.sourceField !== source.sourceField)
    markChanged()
    return
  }
  if (fields.some((field) => field.sourceField === source.sourceField)) return
  draft.value.rule.importFields = [
    ...fields,
    {
      id: `import-${source.sourceField}`,
      sourceField: source.sourceField,
      sourceType: source.sourceType,
      tagName: source.label,
      categoryId: draft.value.categoryId || 'cat-import',
      valueType: source.valueType as TagValueType,
      forceCast: false,
    },
  ]
  markChanged()
}
</script>

<template>
  <div class="type-editor">
    <n-form-item label="数据源">
      <n-select v-model:value="draft.rule.dataSource" :options="dataSourceOptions" filterable @update:value="markChanged" />
    </n-form-item>

    <div class="dual-config-layout">
      <section class="config-column">
        <h3>数据源字段</h3>
        <div class="field-picker">
          <label v-for="field in importSourceFields" :key="field.sourceField" class="check-field">
            <n-checkbox
              :checked="(draft.rule.importFields ?? []).some((item) => item.sourceField === field.sourceField)"
              @update:checked="(checked) => toggleImportField(field.sourceField, checked)"
            />
            <span>{{ field.label }}</span>
            <small>{{ field.sourceField }} · {{ field.sourceType }}</small>
          </label>
        </div>
      </section>

      <section class="config-column">
        <h3>待创建标签配置</h3>
        <table class="tag-table compact">
          <thead><tr><th>来源字段</th><th>标签名称</th><th>路径</th><th>值类型</th><th>强制转换</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="field in draft.rule.importFields" :key="field.id">
              <td><n-input v-model:value="field.sourceField" placeholder="level" @input="markChanged" /></td>
              <td><n-input v-model:value="field.tagName" placeholder="会员等级" @input="markChanged" /></td>
              <td><n-select v-model:value="field.categoryId" :options="props.categoryOptions" filterable @update:value="markChanged" /></td>
              <td><n-select v-model:value="field.valueType" :options="props.valueTypeOptions" @update:value="markChanged" /></td>
              <td><n-switch v-model:value="field.forceCast" @update:value="markChanged" /></td>
              <td><n-button text size="small" type="error" @click="removeImportField(field.id)">删除</n-button></td>
            </tr>
          </tbody>
        </table>
        <n-button size="small" @click="addImportField">手动添加字段</n-button>
      </section>
    </div>

    <n-alert type="info">创建完成后会为每个待创建字段生成一个标签；强制转换失败的记录进入异常明细，不阻断其它字段导入。</n-alert>
  </div>
</template>

<style scoped>
.type-editor,
.dual-config-layout,
.config-column,
.field-picker {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.dual-config-layout {
  grid-template-columns: minmax(240px, 0.76fr) minmax(420px, 1.24fr);
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

.check-field {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 8px;
  align-items: center;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px;
}

.check-field small {
  grid-column: 2;
  color: #64748b;
}

@media (max-width: 1200px) {
  .dual-config-layout {
    grid-template-columns: 1fr;
  }
}
</style>
