<script setup lang="ts">
import { computed, ref } from 'vue'
import { NButton, NDataTable, NEmpty, NSelect, NSpin, NTabPane, NTabs, NTag } from 'naive-ui'
import type { DataTableColumns, SelectOption } from 'naive-ui'
import type { FieldSchema, ModelingNode, PreviewResult } from '@/types/visualModeling'

const props = defineProps<{
  node: ModelingNode | null
  preview: PreviewResult | null
  loading: boolean
}>()

const emit = defineEmits<{
  refresh: [limit: number]
}>()

const limit = ref(100)

const limitOptions: SelectOption[] = [10, 50, 100, 500, 1000].map((value) => ({
  label: `${value} 行`,
  value,
}))

const schemaColumns: DataTableColumns<FieldSchema> = [
  { title: '字段名', key: 'name', width: 150 },
  { title: '类型', key: 'type', width: 120 },
  {
    title: '是否可空',
    key: 'nullable',
    width: 90,
    render: (row) => (row.nullable ? '是' : '否'),
  },
  { title: '角色', key: 'role', width: 110 },
  { title: '来源节点', key: 'sourceNodeId', width: 130 },
  { title: '描述', key: 'comment' },
]

const rowColumns = computed<DataTableColumns<Record<string, string | number | boolean | null>>>(() => {
  const fields = props.preview?.fields ?? props.node?.schema?.fields ?? []
  return fields.slice(0, 12).map((field) => ({
    title: field.displayName ? `${field.displayName}\n${field.name}` : field.name,
    key: field.name,
    minWidth: 130,
    ellipsis: { tooltip: true },
  }))
})

const metricRows = computed(() => {
  const metrics = props.preview?.metrics ?? {}
  return Object.entries(metrics).map(([name, value]) => ({ name, value }))
})
</script>

<template>
  <section class="preview-panel">
    <div class="preview-head">
      <div>
        <div class="panel-title">数据预览</div>
        <div class="panel-subtitle">{{ node ? node.displayName : '选择节点后展示表结构、明细和日志' }}</div>
      </div>
      <div v-if="node" class="preview-actions">
        <n-select v-model:value="limit" size="small" :options="limitOptions" class="limit-select" />
        <n-button size="small" secondary :loading="loading" @click="emit('refresh', limit)">预览</n-button>
      </div>
    </div>

    <n-spin :show="loading">
      <n-tabs v-if="node" type="line" animated size="small" class="preview-tabs">
        <n-tab-pane name="schema" tab="表结构">
          <n-data-table
            size="small"
            :columns="schemaColumns"
            :data="preview?.fields ?? node.schema?.fields ?? []"
            :pagination="{ pageSize: 6 }"
          />
        </n-tab-pane>
        <n-tab-pane name="rows" tab="明细数据">
          <n-empty v-if="!preview" description="请点击预览获取当前节点样例数据" />
          <n-data-table
            v-else
            size="small"
            :columns="rowColumns"
            :data="preview.rows"
            :scroll-x="Math.max(rowColumns.length * 130, 800)"
            :pagination="{ pageSize: 5 }"
          />
        </n-tab-pane>
        <n-tab-pane name="logs" tab="执行日志">
          <div v-if="preview?.logs.length" class="log-list">
            <div v-for="log in preview.logs" :key="`${log.time}-${log.content}`" class="log-row">
              <span>{{ log.time }}</span>
              <n-tag size="small" :type="log.level === 'ERROR' ? 'error' : log.level === 'WARN' ? 'warning' : 'info'">
                {{ log.level }}
              </n-tag>
              <span>{{ log.content }}</span>
            </div>
          </div>
          <n-empty v-else description="暂无执行日志" />
        </n-tab-pane>
        <n-tab-pane v-if="node.type.includes('evaluation')" name="evaluation" tab="评估结果">
          <div v-if="metricRows.length" class="metric-grid">
            <div v-for="metric in metricRows" :key="metric.name" class="metric-item">
              <span>{{ metric.name }}</span>
              <strong>{{ metric.value }}</strong>
            </div>
          </div>
          <div v-if="preview?.confusionMatrix?.length" class="matrix-list">
            <div class="matrix-title">混淆矩阵</div>
            <div v-for="item in preview.confusionMatrix" :key="`${item.actual}-${item.predicted}`" class="matrix-row">
              <span>真实 {{ item.actual }} / 预测 {{ item.predicted }}</span>
              <strong>{{ item.count }}</strong>
            </div>
          </div>
          <n-empty v-if="!metricRows.length" description="点击预览后展示评估指标" />
        </n-tab-pane>
      </n-tabs>
      <n-empty v-else class="preview-empty" description="选择节点后展示表结构、明细数据、执行日志和评估结果" />
    </n-spin>
  </section>
</template>

<style scoped lang="scss">
.preview-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 12px 16px;
  border-top: 1px solid #e5e7eb;
  background: #ffffff;
}

.preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.panel-title {
  font-size: 14px;
  font-weight: 650;
  color: #111827;
}

.panel-subtitle {
  margin-top: 2px;
  color: #6b7280;
  font-size: 12px;
}

.preview-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.limit-select {
  width: 96px;
}

.preview-tabs {
  min-height: 0;
  flex: 1;
  margin-top: 8px;
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.log-row {
  display: grid;
  grid-template-columns: 72px 64px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(90px, 1fr));
  gap: 10px;
}

.metric-item {
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}

.metric-item span,
.matrix-title,
.matrix-row span {
  color: #64748b;
  font-size: 12px;
}

.metric-item strong {
  display: block;
  margin-top: 4px;
  color: #111827;
  font-size: 20px;
}

.matrix-list {
  max-width: 480px;
  margin-top: 12px;
}

.matrix-row {
  display: flex;
  justify-content: space-between;
  padding: 7px 0;
  border-bottom: 1px solid #e5e7eb;
}

.preview-empty {
  margin-top: 34px;
}
</style>
