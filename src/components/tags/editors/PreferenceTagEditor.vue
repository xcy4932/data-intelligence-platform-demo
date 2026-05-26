<script setup lang="ts">
import { NGi, NGrid, NFormItem, NInput, NInputNumber, NSelect, NAlert } from 'naive-ui'
import SourceFilterBlock from './SourceFilterBlock.vue'
import type { TagCreatePayload } from '@/types/tag'
import { preferenceFieldOptions, preferenceMetricOptions } from './tagEditorOptions'

defineOptions({ name: 'PreferenceTagEditor' })

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
    <n-alert v-if="draft.computeType === 'realtime'" type="warning">
      偏好标签按分组排序计算，仅支持离线计算，请在基础信息中切换为离线计算。
    </n-alert>
    <SourceFilterBlock v-model:draft="draft" :source-scope="['behavior', 'detail']" @change="markChanged" />

    <section class="type-section">
      <h3>偏好规则</h3>
      <n-grid :cols="3" :x-gap="16">
        <n-gi>
          <n-form-item label="偏好对象字段">
            <n-select v-model:value="draft.rule.preferenceField" :options="preferenceFieldOptions" filterable @update:value="markChanged" />
          </n-form-item>
        </n-gi>
        <n-gi>
          <n-form-item label="排序指标">
            <n-select v-model:value="draft.rule.preferenceMetric" :options="preferenceMetricOptions" @update:value="markChanged" />
          </n-form-item>
        </n-gi>
        <n-gi>
          <n-form-item label="Top N 与稳定排序">
            <div class="inline-fields">
              <n-input-number v-model:value="draft.rule.topN" :min="1" :max="20" @update:value="markChanged" />
              <n-input v-model:value="draft.rule.tieBreaker" placeholder="排序相同时的规则" @input="markChanged" />
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
  grid-template-columns: 92px minmax(140px, 1fr);
  gap: 8px;
  width: 100%;
}
</style>
