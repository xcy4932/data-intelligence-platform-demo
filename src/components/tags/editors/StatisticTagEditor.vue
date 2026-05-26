<script setup lang="ts">
import { NGi, NGrid, NFormItem, NInput, NSelect } from 'naive-ui'
import SourceFilterBlock from './SourceFilterBlock.vue'
import type { TagCreatePayload } from '@/types/tag'
import { aggregateMethodOptions, compareOperatorOptions, fieldSelectOptions } from './tagEditorOptions'

defineOptions({ name: 'StatisticTagEditor' })

const draft = defineModel<TagCreatePayload>('draft', { required: true })

const emit = defineEmits<{
  change: []
}>()

const markChanged = (): void => {
  emit('change')
}
</script>

<template>
  <div class="type-editor">
    <SourceFilterBlock v-model:draft="draft" :source-scope="['behavior', 'detail']" @change="markChanged" />

    <section class="type-section">
      <h3>统计规则</h3>
      <n-grid :cols="3" :x-gap="16">
        <n-gi>
          <n-form-item label="统计方式">
            <n-select v-model:value="draft.rule.aggregateMethod" :options="aggregateMethodOptions" @update:value="markChanged" />
          </n-form-item>
        </n-gi>
        <n-gi v-if="!['总次数', '天数', '连续天数'].includes(draft.rule.aggregateMethod ?? '')">
          <n-form-item label="聚合字段">
            <n-select v-model:value="draft.rule.aggregateField" :options="fieldSelectOptions" filterable @update:value="markChanged" />
          </n-form-item>
        </n-gi>
        <n-gi v-if="draft.rule.aggregateMethod === '去重计数'">
          <n-form-item label="去重字段">
            <n-select v-model:value="draft.rule.distinctField" :options="fieldSelectOptions" filterable @update:value="markChanged" />
          </n-form-item>
        </n-gi>
        <n-gi>
          <n-form-item label="聚合后判断">
            <div class="inline-fields">
              <n-select v-model:value="draft.rule.postAggregateOperator" :options="compareOperatorOptions" @update:value="markChanged" />
              <n-input v-model:value="draft.rule.postAggregateValue" placeholder="阈值" @input="markChanged" />
            </div>
          </n-form-item>
        </n-gi>
      </n-grid>
    </section>
  </div>
</template>

<style scoped>
.type-editor,
.type-section {
  display: grid;
  gap: 12px;
}

.type-section {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
}

.type-section h3 {
  margin: 0;
  font-size: 15px;
}

.inline-fields {
  display: grid;
  grid-template-columns: minmax(120px, 180px) minmax(120px, 1fr);
  gap: 8px;
  width: 100%;
}
</style>
