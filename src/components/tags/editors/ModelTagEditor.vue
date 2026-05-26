<script setup lang="ts">
import { NAlert, NButton, NFormItem, NInput } from 'naive-ui'
import type { TagCreatePayload } from '@/types/tag'

defineOptions({ name: 'ModelTagEditor' })

const draft = defineModel<TagCreatePayload>('draft', { required: true })

const emit = defineEmits<{
  change: []
  openModeling: []
}>()
</script>

<template>
  <div class="type-editor">
    <n-alert type="info">
      自定义模型标签通过可视化建模流程输出为标签；这里只保留输出节点回流标签体系所需的任务 ID 和结果说明。
    </n-alert>
    <n-form-item label="模型任务 ID">
      <n-input v-model:value="draft.rule.modelTaskId" placeholder="vm-task-churn-risk" @input="emit('change')" />
    </n-form-item>
    <n-button type="primary" @click="emit('openModeling')">进入可视化建模</n-button>
  </div>
</template>

<style scoped>
.type-editor {
  display: grid;
  gap: 12px;
  max-width: 720px;
}
</style>
