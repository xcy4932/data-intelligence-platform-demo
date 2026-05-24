<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  NAlert,
  NButton,
  NCheckbox,
  NDataTable,
  NIcon,
  NList,
  NListItem,
  NSelect,
  NSpace,
  NSteps,
  NStep,
  NTabPane,
  NTabs,
  NTag,
  NUpload,
} from 'naive-ui'
import type { DataTableColumns, DataTableRowKey, UploadFileInfo } from 'naive-ui'
import { ArrowBackOutline, CloudDownloadOutline, CloudUploadOutline } from '@vicons/ionicons5'
import { visualModelingService } from '@/services/visualModelingService'
import type {
  ExportResource,
  ExportResult,
  ImportExecuteResult,
  ImportParseResult,
} from '@/types/visualModeling'

const router = useRouter()
const loading = ref(false)
const resources = ref<ExportResource[]>([])
const selectedTaskIds = ref<DataTableRowKey[]>([])
const includePermission = ref(false)
const exportResult = ref<ExportResult | null>(null)
const feedback = ref('正在加载可迁移资源。')
const feedbackType = ref<'success' | 'warning' | 'error' | 'info'>('info')
const importFileName = ref('')
const parseResult = ref<ImportParseResult | null>(null)
const executeResult = ref<ImportExecuteResult | null>(null)

const selectedResources = computed(() => resources.value.filter((resource) => selectedTaskIds.value.includes(resource.taskId)))

const exportColumns: DataTableColumns<ExportResource> = [
  { type: 'selection', multiple: true },
  { title: '任务名称', key: 'taskName', minWidth: 220 },
  { title: '任务所有者', key: 'ownerName', width: 130 },
  { title: '保存路径', key: 'folderPath', width: 160 },
  { title: '创建时间', key: 'createdAt', width: 180, sorter: 'default' },
  {
    title: '输出权限',
    key: 'canExportOutputDataset',
    width: 110,
    render: (row) =>
      h(
        NTag,
        { size: 'small', type: row.canExportOutputDataset ? 'success' : 'warning', bordered: false },
        { default: () => (row.canExportOutputDataset ? '可导出' : '需映射') },
      ),
  },
]

const importTaskColumns: DataTableColumns = [
  { title: '任务', key: 'name' },
  { title: '导入方式', key: 'mode', render: (row) => (row.mode === 'overwrite' ? '覆盖导入' : '新建导入') },
  {
    title: '校验',
    key: 'valid',
    render: (row) =>
      h(NTag, { size: 'small', type: row.valid ? 'success' : 'error', bordered: false }, { default: () => (row.valid ? '通过' : row.reason) }),
  },
]

async function loadResources() {
  loading.value = true
  try {
    resources.value = await visualModelingService.listExportResources()
    feedback.value = '已加载可导出的离线手动创建任务；实时任务、系统任务和标签输出任务不会进入导出范围。'
    feedbackType.value = 'success'
  } catch (error) {
    feedback.value = error instanceof Error ? error.message : '加载失败'
    feedbackType.value = 'error'
  } finally {
    loading.value = false
  }
}

async function exportResources() {
  try {
    exportResult.value = await visualModelingService.exportResources(selectedTaskIds.value.map(String), includePermission.value)
    feedback.value = `已生成资源包 ${exportResult.value.fileName}。`
    feedbackType.value = 'success'
  } catch (error) {
    feedback.value = error instanceof Error ? error.message : '导出失败'
    feedbackType.value = 'error'
  }
}

function handleUploadChange(options: { file: UploadFileInfo }) {
  importFileName.value = options.file.name
  parseResult.value = null
  executeResult.value = null
}

async function parseImport() {
  try {
    parseResult.value = await visualModelingService.parseImport(importFileName.value)
    feedback.value = '资源包解析完成，请检查映射关系后执行导入。'
    feedbackType.value = 'success'
  } catch (error) {
    feedback.value = error instanceof Error ? error.message : '解析失败'
    feedbackType.value = 'error'
  }
}

async function executeImport() {
  if (!parseResult.value) return
  executeResult.value = await visualModelingService.executeImport(parseResult.value)
  feedback.value = executeResult.value.failed ? '导入完成，存在失败任务。' : '导入完成。'
  feedbackType.value = executeResult.value.failed ? 'warning' : 'success'
}

function stepStatus(status: 'success' | 'failed' | 'running'): 'finish' | 'error' | 'process' {
  if (status === 'failed') return 'error'
  if (status === 'running') return 'process'
  return 'finish'
}

function downloadFailureDetail() {
  if (!executeResult.value?.failures.length) return
  const header = '任务名称,失败原因'
  const rows = executeResult.value.failures.map((item) => `${item.taskName},${item.reason}`)
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = '可视化建模导入失败明细.csv'
  link.click()
  window.URL.revokeObjectURL(url)
}

onMounted(loadResources)
</script>

<template>
  <main class="page-container migration-page">
    <header class="page-header">
      <div>
        <n-button quaternary size="small" @click="router.push('/metadata/visual-modeling')">
          <template #icon><n-icon><arrow-back-outline /></n-icon></template>
          返回
        </n-button>
        <h1 class="page-title">可视化建模资源迁移</h1>
        <p class="page-description">导出 .prep 资源包，或导入并映射数据集、连接、队列和权限。</p>
      </div>
    </header>

    <n-alert :type="feedbackType" :bordered="false">{{ feedback }}</n-alert>

    <n-tabs type="line" animated class="migration-tabs">
      <n-tab-pane name="export" tab="资源导出">
        <section class="toolbar">
          <n-checkbox v-model:checked="includePermission">同步导出权限信息</n-checkbox>
          <n-button type="primary" :disabled="selectedTaskIds.length === 0" @click="exportResources">
            <template #icon><n-icon><cloud-download-outline /></n-icon></template>
            导出资源包
          </n-button>
        </section>

        <n-data-table
          :loading="loading"
          :columns="exportColumns"
          :data="resources"
          :row-key="(row) => row.taskId"
          v-model:checked-row-keys="selectedTaskIds"
          :pagination="{ pageSize: 8 }"
        />

        <section v-if="selectedResources.length" class="resource-preview">
          <h3>关联资源</h3>
          <div class="resource-grid">
            <n-list bordered>
              <template #header>输入节点数据集</template>
              <n-list-item v-for="name in Array.from(new Set(selectedResources.flatMap((item) => item.inputDatasets)))" :key="name">{{ name }}</n-list-item>
            </n-list>
            <n-list bordered>
              <template #header>输出节点数据集</template>
              <n-list-item v-for="name in Array.from(new Set(selectedResources.flatMap((item) => item.outputDatasets)))" :key="name">{{ name }}</n-list-item>
            </n-list>
            <n-list bordered>
              <template #header>数据连接</template>
              <n-list-item v-for="name in Array.from(new Set(selectedResources.flatMap((item) => item.dataConnections)))" :key="name">{{ name }}</n-list-item>
            </n-list>
            <n-list bordered>
              <template #header>资源队列</template>
              <n-list-item v-for="name in Array.from(new Set(selectedResources.flatMap((item) => item.resourceQueues)))" :key="name">{{ name }}</n-list-item>
            </n-list>
          </div>
        </section>

        <n-alert v-if="exportResult" type="success" :bordered="false">
          导出文件：{{ exportResult.fileName }}；任务数 {{ exportResult.taskCount }}；关联资源 {{ exportResult.resourceCount }}。
        </n-alert>
      </n-tab-pane>

      <n-tab-pane name="import" tab="资源导入">
        <section class="import-uploader">
          <n-upload accept=".prep" :default-upload="false" :max="1" @change="handleUploadChange">
            <n-button secondary>
              <template #icon><n-icon><cloud-upload-outline /></n-icon></template>
              新建导入
            </n-button>
          </n-upload>
          <n-button type="primary" :disabled="!importFileName" @click="parseImport">解析资源包</n-button>
        </section>

        <template v-if="parseResult">
          <section class="import-block">
            <h3>{{ parseResult.packageName }}</h3>
            <n-data-table :columns="importTaskColumns" :data="parseResult.tasks" />
          </section>

          <section class="mapping-grid">
            <div>
              <h3>输入数据集映射</h3>
              <div v-for="item in parseResult.inputDatasets" :key="item.sourceName" class="mapping-row">
                <span>{{ item.sourceName }}</span>
                <n-select
                  v-model:value="item.targetDatasetId"
                  :options="[
                    { label: '广告观看明细数据集', value: 'ds_ad_watch_detail' },
                    { label: '会员画像基础数据集', value: 'ds_member_profile' },
                    { label: '支付成功订单数据集', value: 'ds_payment_success' },
                  ]"
                />
                <n-tag :type="item.compatible ? 'success' : 'error'" size="small" :bordered="false">
                  {{ item.compatible ? '结构兼容' : item.issue }}
                </n-tag>
              </div>
            </div>
            <div>
              <h3>输出数据集导入方式</h3>
              <div v-for="item in parseResult.outputDatasets" :key="item.sourceName" class="mapping-row">
                <span>{{ item.sourceName }}</span>
                <n-select
                  v-model:value="item.importAction"
                  :options="[
                    { label: '新建', value: 'create' },
                    { label: '关联已有', value: 'map_existing' },
                  ]"
                />
                <span>{{ item.targetName }}</span>
              </div>
            </div>
            <div>
              <h3>数据连接映射</h3>
              <div v-for="item in parseResult.dataConnections" :key="item.sourceName" class="mapping-row">
                <span>{{ item.sourceName }}</span>
                <n-select
                  v-model:value="item.targetConnectionId"
                  :options="[
                    { label: '行为数仓 ClickHouse', value: 'conn_clickhouse_ad' },
                    { label: '会员中心 MySQL', value: 'conn_mysql_member' },
                    { label: '实时行为 Kafka', value: 'conn_kafka_behavior' },
                  ]"
                />
                <n-tag :type="item.compatible ? 'success' : 'warning'" size="small" :bordered="false">
                  {{ item.compatible ? '可用' : '需确认' }}
                </n-tag>
              </div>
            </div>
            <div>
              <h3>资源队列映射</h3>
              <div v-for="item in parseResult.resourceQueues" :key="item.sourceName" class="mapping-row">
                <span>{{ item.sourceName }}</span>
                <n-select
                  v-model:value="item.targetQueueId"
                  :options="[
                    { label: '默认队列', value: 'queue_001' },
                    { label: '实时 Flink 队列', value: 'queue_realtime' },
                    { label: '机器学习高内存队列', value: 'queue_ml' },
                  ]"
                />
              </div>
            </div>
          </section>

          <n-space justify="end">
            <n-button type="primary" @click="executeImport">执行导入</n-button>
          </n-space>
        </template>

        <section v-if="executeResult" class="import-result">
          <n-steps vertical :current="executeResult.steps.length" status="process">
            <n-step
              v-for="step in executeResult.steps"
              :key="step.label"
              :title="step.label"
              :status="stepStatus(step.status)"
            />
          </n-steps>
          <n-alert :type="executeResult.failed ? 'warning' : 'success'" :bordered="false">
            总任务数 {{ executeResult.total }}，成功 {{ executeResult.success }}，失败 {{ executeResult.failed }}。
          </n-alert>
          <n-button v-if="executeResult.failed" secondary @click="downloadFailureDetail">下载失败明细</n-button>
        </section>
      </n-tab-pane>
    </n-tabs>
  </main>
</template>

<style scoped lang="scss">
.migration-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.migration-tabs {
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
}

.toolbar,
.import-uploader {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.resource-preview,
.import-block,
.import-result {
  margin-top: 16px;
}

.resource-preview h3,
.import-block h3,
.mapping-grid h3 {
  margin: 0 0 10px;
  font-size: 15px;
}

.resource-grid,
.mapping-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.mapping-grid {
  margin: 16px 0;
}

.mapping-row {
  display: grid;
  grid-template-columns: minmax(140px, 1fr) minmax(170px, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 8px 0;
  border-bottom: 1px solid #eef2f7;
}

.import-result {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 16px;
}
</style>
