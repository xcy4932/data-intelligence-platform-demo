<script setup lang="ts">
import { NGi, NGrid, NFormItem, NRadio, NRadioGroup, NSelect } from 'naive-ui'
import SourceFilterBlock from './SourceFilterBlock.vue'
import type { TagCreatePayload } from '@/types/tag'
import { fieldSelectOptions, outputModeOptions, timeFieldOptions } from './tagEditorOptions'

defineOptions({ name: 'FirstLastTagEditor' })

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
      <h3>首末次规则</h3>
      <n-grid :cols="3" :x-gap="16">
        <n-gi>
          <n-form-item label="首末次类型">
            <n-radio-group v-model:value="draft.rule.firstLastMode" @update:value="markChanged">
              <n-radio value="first">首次发生</n-radio>
              <n-radio value="last">末次发生</n-radio>
            </n-radio-group>
          </n-form-item>
        </n-gi>
        <n-gi>
          <n-form-item label="基准时间字段">
            <n-select v-model:value="draft.rule.timeField" :options="timeFieldOptions" @update:value="markChanged" />
          </n-form-item>
        </n-gi>
        <n-gi>
          <n-form-item label="输出特征">
            <n-select v-model:value="draft.rule.outputMode" :options="outputModeOptions" @update:value="markChanged" />
          </n-form-item>
        </n-gi>
        <n-gi v-if="draft.rule.outputMode === 'attribute'">
          <n-form-item label="输出属性">
            <n-select v-model:value="draft.rule.outputAttribute" :options="fieldSelectOptions" filterable @update:value="markChanged" />
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
</style>
