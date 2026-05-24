<script setup lang="ts">
import { NButton, NDrawer, NDrawerContent, NEmpty, NList, NListItem, NSpace, NTag } from 'naive-ui'
import type { ValidationError, ValidationResult } from '@/types/visualModeling'

defineProps<{
  show: boolean
  result: ValidationResult | null
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  locate: [nodeId: string]
}>()

function itemKey(item: ValidationError, index: number): string {
  return `${item.nodeId ?? 'global'}-${item.field ?? 'none'}-${index}`
}
</script>

<template>
  <n-drawer :show="show" width="420" @update:show="emit('update:show', $event)">
    <n-drawer-content title="任务校验">
      <template v-if="result">
        <n-space class="summary" align="center">
          <n-tag :type="result.valid ? 'success' : 'error'" :bordered="false">
            {{ result.valid ? '校验通过' : '存在错误' }}
          </n-tag>
          <span>{{ result.errors.length }} 个错误</span>
          <span>{{ result.warnings.length }} 个提醒</span>
        </n-space>

        <n-list v-if="result.errors.length" bordered class="issue-list">
          <template #header>错误</template>
          <n-list-item v-for="(error, index) in result.errors" :key="itemKey(error, index)">
            <div class="issue-row">
              <div>
                <n-tag size="small" type="error" :bordered="false">{{ error.field ?? '全局' }}</n-tag>
                <p>{{ error.message }}</p>
              </div>
              <n-button v-if="error.nodeId" size="tiny" secondary @click="emit('locate', error.nodeId)">定位</n-button>
            </div>
          </n-list-item>
        </n-list>

        <n-list v-if="result.warnings.length" bordered class="issue-list">
          <template #header>提醒</template>
          <n-list-item v-for="(warning, index) in result.warnings" :key="itemKey(warning, index)">
            <div class="issue-row">
              <div>
                <n-tag size="small" type="warning" :bordered="false">{{ warning.field ?? '全局' }}</n-tag>
                <p>{{ warning.message }}</p>
              </div>
              <n-button v-if="warning.nodeId" size="tiny" secondary @click="emit('locate', warning.nodeId)">定位</n-button>
            </div>
          </n-list-item>
        </n-list>

        <n-empty v-if="result.valid && !result.warnings.length" description="没有发现错误或提醒" />
      </template>
      <n-empty v-else description="点击校验后展示结果" />
    </n-drawer-content>
  </n-drawer>
</template>

<style scoped lang="scss">
.summary {
  margin-bottom: 14px;
  color: #475569;
  font-size: 13px;
}

.issue-list {
  margin-bottom: 14px;
}

.issue-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.issue-row p {
  margin: 6px 0 0;
  color: #334155;
  font-size: 13px;
  line-height: 1.5;
}
</style>
