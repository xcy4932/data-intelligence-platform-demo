<script setup lang="ts">
import { NAlert, NButton, NSelect, NSpace, NTag } from 'naive-ui'
import type { SelectOption } from 'naive-ui'

defineProps<{
  metricOptions: SelectOption[]
}>()

const emit = defineEmits<{
  selectMetric: [metricId: string]
  createCondition: []
}>()
</script>

<template>
  <n-space vertical>
    <n-tag size="small" type="info">已配置指标</n-tag>
    <n-select
      :options="metricOptions"
      placeholder="从已配置指标中选择"
      @update:value="(value) => emit('selectMetric', String(value))"
    />
    <n-tag size="small">新建计算条件</n-tag>
    <n-button size="small" secondary @click="emit('createCondition')">
      新建事件计算条件
    </n-button>
    <n-alert type="info" :show-icon="false">
      选择已有指标或新建计算条件后，会加入计算条件列表；公式指标可单独控制每个条件是否参与属性分组。
    </n-alert>
  </n-space>
</template>
