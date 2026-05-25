<script setup lang="ts">
import {
  NAlert,
  NButton,
  NCard,
  NCheckboxGroup,
  NDataTable,
  NForm,
  NFormItem,
  NGi,
  NGrid,
  NInput,
  NModal,
  NSpace,
  NSwitch,
  NTag,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { h, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { businessAttributionService } from '@/services/businessAttributionService'
import type { WebHookConfig, WebHookDeliveryRecord } from '@/types/businessAttribution'

const router = useRouter()
const message = useMessage()
const loading = ref(false)
const modalVisible = ref(false)
const webhooks = ref<WebHookConfig[]>([])
const deliveries = ref<WebHookDeliveryRecord[]>([])
const draft = reactive<WebHookConfig>({
  id: '',
  projectId: 'project_demo',
  name: '',
  url: 'https://example.com/openapi/attribution/report',
  secret: '',
  subscribedEvents: ['ATTRIBUTION_REPORT'],
  enabled: true,
  createdAt: '',
  updatedAt: '',
})

const eventOptions = [
  { label: '归因报告 ATTRIBUTION_REPORT', value: 'ATTRIBUTION_REPORT' },
  { label: '指标分析树 ANALYSIS_TREE', value: 'ANALYSIS_TREE' },
]

const reportPayloadExample = JSON.stringify(
  {
    secret: 'demo-secret',
    event: {
      channel: 'insight',
      timestamp: 1779696000000,
      title: 'insight_report',
      payload: {
        calculationDay: '2026-05-17',
        reportType: 'ANOMALY | DIM_CONTRIBUTE | MEASURE_CONTRIBUTE',
        reportLink: '/analysis-center/business-attribution/reports/{configId}?calculationDay=Latest',
        sceneId: '{configId}',
        sceneGroupId: '{configId}',
        bigEvents: [{ title: '大事件名称', impact: '影响描述', date: '2026-05-16' }],
        reportUrl: '/openapi/attribution/report/{reportId}',
        token: '8 小时有效访问 token',
        detail: ['异常指标拆解、维度归因结果或指标归因结果'],
      },
    },
  },
  null,
  2,
)

const analysisTreePayloadExample = JSON.stringify(
  {
    stage1Meta: {
      taskId: '{configId}',
      reportId: 20260517,
      submitJobId: 96960000,
      name: '广告经营分析树',
      user: 'Chaoyang Xu',
      appId: 10001,
      baseDateStr: '2026-05-10',
      cmpDateStr: '2026-05-17',
      generateType: 'regular | custom',
      granularity: 'day | week | biweek | month | bimonth',
      components: ['metric', 'limit', 'trendAnomaly', 'dimensionContributionGroup', 'metricContributionGroup', 'text'],
    },
    stage2DetailOpenApi: {
      method: 'POST',
      url: '/openapi/attribution/analysis-tree/components/detail',
      body: {
        taskId: '{configId}',
        reportId: 20260517,
        componentId: '{nodeId}',
        query: [{ path: ['channel', 'ad_position'], cursor: '', limit: 50 }],
      },
    },
  },
  null,
  2,
)

async function loadData(): Promise<void> {
  loading.value = true
  try {
    const result = await businessAttributionService.listWebhooks()
    webhooks.value = result.webhooks
    deliveries.value = result.deliveries
  } finally {
    loading.value = false
  }
}

function openCreate(): void {
  Object.assign(draft, {
    id: '',
    projectId: 'project_demo',
    name: '归因报告接收端',
    url: 'https://example.com/openapi/attribution/report',
    secret: 'demo-secret',
    subscribedEvents: ['ATTRIBUTION_REPORT'],
    enabled: true,
  })
  modalVisible.value = true
}

function openEdit(row: WebHookConfig): void {
  Object.assign(draft, JSON.parse(JSON.stringify(row)) as WebHookConfig)
  modalVisible.value = true
}

async function saveDraft(): Promise<void> {
  try {
    await businessAttributionService.saveWebhook({ ...draft })
    modalVisible.value = false
    message.success('WebHook 配置已保存。')
    await loadData()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '保存失败')
  }
}

async function testWebhook(row: WebHookConfig): Promise<void> {
  try {
    await businessAttributionService.testWebhook(row.id)
    message.success('测试推送成功，接收方返回 code=0。')
    await loadData()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '测试失败')
  }
}

function updateEvents(value: Array<string | number>): void {
  draft.subscribedEvents = value as WebHookConfig['subscribedEvents']
}

const webhookColumns: DataTableColumns<WebHookConfig> = [
  { title: '名称', key: 'name' },
  { title: 'URL', key: 'url', ellipsis: { tooltip: true } },
  {
    title: '订阅事件',
    key: 'subscribedEvents',
    render: (row) => h(NSpace, { size: 'small' }, () => row.subscribedEvents.map((event) => h(NTag, { bordered: false }, { default: () => event }))),
  },
  {
    title: '状态',
    key: 'enabled',
    render: (row) => h(NTag, { type: row.enabled ? 'success' : 'default', bordered: false }, { default: () => (row.enabled ? '启用' : '停用') }),
  },
  { title: '更新', key: 'updatedAt' },
  {
    title: '操作',
    key: 'actions',
    render: (row) =>
      h(NSpace, { size: 'small' }, () => [
        h(NButton, { size: 'small', secondary: true, onClick: () => void testWebhook(row) }, { default: () => '测试推送' }),
        h(NButton, { size: 'small', secondary: true, onClick: () => openEdit(row) }, { default: () => '编辑' }),
      ]),
  },
]

const deliveryColumns: DataTableColumns<WebHookDeliveryRecord> = [
  { title: '时间', key: 'createdAt', width: 170 },
  { title: '事件', key: 'eventName', width: 170 },
  {
    title: '状态',
    key: 'status',
    width: 120,
    render: (row) => h(NTag, { type: row.status === 'SUCCESS' ? 'success' : row.status === 'FAILED' ? 'error' : 'warning', bordered: false }, { default: () => row.status }),
  },
  { title: '尝试次数', key: 'attempts', width: 100 },
  { title: '下次重试', key: 'nextRetryAt', width: 170 },
  { title: 'Payload 预览', key: 'payloadPreview', ellipsis: { tooltip: true } },
]

onMounted(() => {
  void loadData()
})
</script>

<template>
  <div class="page-container">
    <div class="page-heading">
      <div>
        <h1 class="page-title">WebHook 配置</h1>
        <p class="page-description">系统仅通过 POST 推送，接收方返回 code=0 视为成功；失败后每 10 秒重试一次，最多 5 次。</p>
      </div>
      <n-space>
        <n-button @click="router.push('/analysis-center/business-attribution')">返回业务归因分析</n-button>
        <n-button type="primary" @click="openCreate">新建 WebHook</n-button>
      </n-space>
    </div>

    <n-alert type="info" :show-icon="false" class="top-note">
      归因报告 Payload 包含 reportLink、reportUrl、8 小时 token 和 detail；指标分析树按“元信息 + 节点明细 OpenAPI 参数”两阶段同步。
    </n-alert>

    <n-card title="WebHook 列表" :bordered="false" class="section-card">
      <n-data-table :loading="loading" :columns="webhookColumns" :data="webhooks" />
    </n-card>

    <n-card title="投递记录" :bordered="false">
      <n-data-table :columns="deliveryColumns" :data="deliveries" />
    </n-card>

    <n-grid :cols="2" :x-gap="16" class="section-card">
      <n-gi>
        <n-card title="归因报告 Payload" :bordered="false">
          <pre class="payload-code">{{ reportPayloadExample }}</pre>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card title="指标分析树两阶段同步" :bordered="false">
          <pre class="payload-code">{{ analysisTreePayloadExample }}</pre>
        </n-card>
      </n-gi>
    </n-grid>

    <n-modal v-model:show="modalVisible" preset="card" title="WebHook 配置" class="medium-modal">
      <n-form label-placement="top">
        <n-grid :cols="2" :x-gap="12">
          <n-gi>
            <n-form-item label="名称">
              <n-input v-model:value="draft.name" />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="Secret">
              <n-input v-model:value="draft.secret" type="password" show-password-on="click" />
            </n-form-item>
          </n-gi>
          <n-gi :span="2">
            <n-form-item label="URL">
              <n-input v-model:value="draft.url" placeholder="https://..." />
            </n-form-item>
          </n-gi>
          <n-gi :span="2">
            <n-form-item label="订阅事件">
              <n-checkbox-group :value="draft.subscribedEvents" :options="eventOptions" @update:value="updateEvents" />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="启用状态">
              <n-switch v-model:value="draft.enabled" />
            </n-form-item>
          </n-gi>
        </n-grid>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="modalVisible = false">取消</n-button>
          <n-button type="primary" @click="saveDraft">保存</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<style scoped lang="scss">
.page-heading {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.top-note,
.section-card {
  margin-bottom: 16px;
}

.payload-code {
  max-height: 360px;
  margin: 0;
  overflow: auto;
  padding: 12px;
  border-radius: 8px;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 12px;
  line-height: 1.55;
}

.medium-modal {
  width: 680px;
}
</style>
