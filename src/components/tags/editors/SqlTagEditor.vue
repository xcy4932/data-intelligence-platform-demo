<script setup lang="ts">
import { NAlert, NButton, NInput, NSpace, useMessage } from 'naive-ui'
import { tagService } from '@/services/tagService'
import type { TagCreatePayload, TagSqlParseResult } from '@/types/tag'

defineOptions({ name: 'SqlTagEditor' })

const draft = defineModel<TagCreatePayload>('draft', { required: true })
const sqlResult = defineModel<TagSqlParseResult | undefined>('sqlResult', { required: true })

const emit = defineEmits<{
  change: []
  openLineage: []
}>()

const message = useMessage()

const markChanged = (): void => {
  sqlResult.value = undefined
  emit('change')
}

const setSqlMapping = (targetField: 'subject_id' | 'tag_value' | 'partition_date', sourceColumn: string): void => {
  const mappings = draft.value.rule.sqlFieldMappings ?? []
  const current = mappings.find((item) => item.targetField === targetField)
  if (current) {
    current.sourceColumn = sourceColumn
  } else {
    mappings.push({ sourceColumn, targetField, required: targetField !== 'partition_date' })
  }
  draft.value.rule.sqlFieldMappings = mappings
  emit('change')
}

const insertSqlField = (fieldName: string): void => {
  draft.value.rule.sql = `${draft.value.rule.sql ?? ''} ${fieldName}`.trim()
  markChanged()
}

const parseSql = async (): Promise<void> => {
  sqlResult.value = await tagService.parseSql(draft.value.rule.sql ?? '')
  if (sqlResult.value.ok) {
    setSqlMapping('subject_id', sqlResult.value.columns.find((item) => item.name.includes('user') || item.name.includes('subject'))?.name ?? 'user_id')
    setSqlMapping('tag_value', sqlResult.value.columns.find((item) => item.name.includes('tag_value'))?.name ?? 'tag_value')
    message.success(sqlResult.value.message)
  } else {
    message.error(sqlResult.value.message)
  }
}

const formatSql = async (): Promise<void> => {
  draft.value.rule.sql = await tagService.formatSql(draft.value.rule.sql ?? '')
  markChanged()
}

const mappingValue = (targetField: 'subject_id' | 'tag_value' | 'partition_date'): string =>
  draft.value.rule.sqlFieldMappings?.find((item) => item.targetField === targetField)?.sourceColumn ?? ''
</script>

<template>
  <div class="type-editor">
    <div class="sql-layout">
      <aside class="sql-side">
        <strong>数据档案树</strong>
        <button type="button" @click="insertSqlField('cdp.orders.user_id')">主体 ID</button>
        <button type="button" @click="insertSqlField('cdp.orders.amount')">订单金额</button>
        <button type="button" @click="insertSqlField('cdp.behavior.event_time')">行为时间</button>
        <button type="button" @click="insertSqlField('tag.tag_rfm_value')">已有标签</button>
      </aside>
      <n-input v-model:value="draft.rule.sql" type="textarea" placeholder="select user_id, tag_value from ..." @input="markChanged" />
    </div>

    <n-space>
      <n-button @click="formatSql">格式化</n-button>
      <n-button type="primary" @click="parseSql">解析</n-button>
      <n-button @click="parseSql">预览</n-button>
      <n-button @click="emit('openLineage')">查询客户底表和数据档案之间的关系</n-button>
    </n-space>

    <n-alert v-if="sqlResult" class="soft-alert" :type="sqlResult.ok ? 'success' : 'error'">
      {{ sqlResult.message }}
    </n-alert>

    <table v-if="sqlResult?.previewRows.length" class="tag-table compact">
      <thead><tr><th>user_id</th><th>tag_value</th></tr></thead>
      <tbody><tr v-for="row in sqlResult.previewRows" :key="String(row.user_id)"><td>{{ row.user_id }}</td><td>{{ row.tag_value }}</td></tr></tbody>
    </table>

    <table class="tag-table compact">
      <thead><tr><th>目标字段</th><th>来源字段</th><th>是否必填</th></tr></thead>
      <tbody>
        <tr>
          <td>主体 ID</td>
          <td><n-input :value="mappingValue('subject_id')" @update:value="(value) => setSqlMapping('subject_id', String(value ?? ''))" /></td>
          <td>是</td>
        </tr>
        <tr>
          <td>标签值</td>
          <td><n-input :value="mappingValue('tag_value')" @update:value="(value) => setSqlMapping('tag_value', String(value ?? ''))" /></td>
          <td>是</td>
        </tr>
        <tr>
          <td>分区日期</td>
          <td><n-input :value="mappingValue('partition_date')" @update:value="(value) => setSqlMapping('partition_date', String(value ?? ''))" /></td>
          <td>否</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.type-editor {
  display: grid;
  gap: 12px;
}

.sql-layout {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 12px;
  min-width: 0;
}

.sql-side {
  display: grid;
  gap: 8px;
  align-content: start;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
}

.sql-side button {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  padding: 8px 10px;
  text-align: left;
  cursor: pointer;
}

@media (max-width: 1200px) {
  .sql-layout {
    grid-template-columns: 1fr;
  }
}
</style>
