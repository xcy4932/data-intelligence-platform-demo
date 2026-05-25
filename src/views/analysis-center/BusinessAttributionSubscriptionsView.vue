<script setup lang="ts">
import {
  NAlert,
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NGi,
  NGrid,
  NInput,
  NModal,
  NPopconfirm,
  NSelect,
  NSpace,
  NSwitch,
  NTag,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, SelectOption } from 'naive-ui'
import { computed, h, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { currentBusinessAttributionUser } from '@/mock/businessAttribution'
import { businessAttributionService } from '@/services/businessAttributionService'
import type { AttributionSubscription, SubscriptionRecipient, WebHookConfig } from '@/types/businessAttribution'

const router = useRouter()
const route = useRoute()
const message = useMessage()
const loading = ref(false)
const modalVisible = ref(false)
const subscriptions = ref<AttributionSubscription[]>([])
const webhooks = ref<WebHookConfig[]>([])
const reportNameMap = ref<Record<string, string>>({})
const recipientText = ref(currentBusinessAttributionUser.name)
const draft = reactive<AttributionSubscription>({
  id: '',
  configId: '',
  name: '',
  displayDate: 'CALCULATION_DAY',
  pushChannel: 'FEISHU_USER',
  recipients: [{ id: currentBusinessAttributionUser.id, name: currentBusinessAttributionUser.name, type: 'USER' }],
  frequency: 'AFTER_EACH_REGULAR_RUN',
  pushTime: '09:00',
  enabled: true,
  creatorId: currentBusinessAttributionUser.id,
  creatorName: currentBusinessAttributionUser.name,
  createdAt: '',
  updatedAt: '',
})

const configOptions = computed<SelectOption[]>(() =>
  Object.entries(reportNameMap.value).map(([value, label]) => ({
    label,
    value,
  })),
)

const webhookOptions = computed<SelectOption[]>(() =>
  webhooks.value
    .filter((webhook) => webhook.enabled)
    .map((webhook) => ({
      label: webhook.name,
      value: webhook.id,
    })),
)

const channelOptions: SelectOption[] = [
  { label: '飞书个人', value: 'FEISHU_USER' },
  { label: '飞书群', value: 'FEISHU_GROUP' },
  { label: '钉钉个人', value: 'DINGTALK_USER' },
  { label: '钉钉普通群', value: 'DINGTALK_GROUP' },
  { label: 'WebHook', value: 'WEBHOOK' },
]

const frequencyOptions: SelectOption[] = [
  { label: '每次例行运算后', value: 'AFTER_EACH_REGULAR_RUN' },
  { label: '每天', value: 'DAILY' },
  { label: '每周', value: 'WEEKLY' },
  { label: '每月', value: 'MONTHLY' },
]

const displayDateOptions: SelectOption[] = [
  { label: '观察日期', value: 'CALCULATION_DAY' },
  { label: '报告日期', value: 'REPORT_DAY' },
  { label: '基准日期', value: 'COMPARE_DAY' },
]

async function loadData(): Promise<void> {
  loading.value = true
  try {
    subscriptions.value = await businessAttributionService.listSubscriptions()
    const webhookResult = await businessAttributionService.listWebhooks()
    webhooks.value = webhookResult.webhooks
    const cards = [
      ...(await businessAttributionService.listCards('CREATED_BY_ME', { searchKeyword: '', reportTypeFilter: 'ALL', statusFilter: 'ALL', createButtonVisible: true })),
      ...(await businessAttributionService.listCards('SHARED_WITH_ME', { searchKeyword: '', reportTypeFilter: 'ALL', statusFilter: 'ALL', createButtonVisible: true })),
    ]
    reportNameMap.value = Object.fromEntries(cards.map((card) => [card.configId, card.name]))
  } finally {
    loading.value = false
  }
}

function splitRecipients(value: string): string[] {
  return value
    .split(/[,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function recipientTypeForChannel(channel: AttributionSubscription['pushChannel']): SubscriptionRecipient['type'] {
  if (channel === 'FEISHU_GROUP' || channel === 'DINGTALK_GROUP') return 'USER_GROUP'
  if (channel === 'WEBHOOK') return 'WEBHOOK'
  return 'USER'
}

function updateRecipientTextFromDraft(): void {
  recipientText.value = draft.recipients.map((recipient) => recipient.name).join('，')
}

function applyRecipientTextToDraft(): void {
  const type = recipientTypeForChannel(draft.pushChannel)
  draft.recipients = splitRecipients(recipientText.value).map((name, index) => ({
    id: `${type.toLowerCase()}_${index}_${name}`,
    name,
    type,
  }))
}

function updateWebhookRecipient(webhookId?: string): void {
  const selected = webhooks.value.find((webhook) => webhook.id === webhookId) ?? webhooks.value.find((webhook) => webhook.enabled)
  draft.webhookId = selected?.id
  draft.recipients = selected ? [{ id: selected.id, name: selected.name, type: 'WEBHOOK' }] : []
  updateRecipientTextFromDraft()
}

function updatePushChannel(value: string): void {
  draft.pushChannel = value as AttributionSubscription['pushChannel']
  if (draft.pushChannel === 'WEBHOOK') {
    updateWebhookRecipient(draft.webhookId)
    return
  }

  draft.webhookId = undefined
  if (draft.recipients.length === 0 || draft.recipients.every((recipient) => recipient.type === 'WEBHOOK')) {
    draft.recipients = [{ id: currentBusinessAttributionUser.id, name: currentBusinessAttributionUser.name, type: recipientTypeForChannel(draft.pushChannel) }]
  } else {
    draft.recipients = draft.recipients.map((recipient) => ({ ...recipient, type: recipientTypeForChannel(draft.pushChannel) }))
  }
  updateRecipientTextFromDraft()
}

function openCreate(): void {
  const queryConfigId = String(route.query.configId ?? '')
  const configId = configOptions.value.some((option) => option.value === queryConfigId) ? queryConfigId : String(configOptions.value[0]?.value ?? '')
  Object.assign(draft, {
    id: '',
    configId,
    name: '业务归因报告订阅',
    displayDate: 'CALCULATION_DAY',
    pushChannel: 'FEISHU_USER',
    recipients: [{ id: currentBusinessAttributionUser.id, name: currentBusinessAttributionUser.name, type: 'USER' }],
    frequency: 'AFTER_EACH_REGULAR_RUN',
    pushTime: '09:00',
    enabled: true,
    creatorId: currentBusinessAttributionUser.id,
    creatorName: currentBusinessAttributionUser.name,
  })
  updateRecipientTextFromDraft()
  modalVisible.value = true
}

function openEdit(row: AttributionSubscription): void {
  Object.assign(draft, JSON.parse(JSON.stringify(row)) as AttributionSubscription)
  updateRecipientTextFromDraft()
  modalVisible.value = true
}

async function saveDraft(): Promise<void> {
  try {
    if (draft.pushChannel === 'WEBHOOK') {
      updateWebhookRecipient(draft.webhookId)
    } else {
      applyRecipientTextToDraft()
    }
    await businessAttributionService.saveSubscription({ ...draft })
    modalVisible.value = false
    message.success('订阅已保存。')
    await loadData()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '订阅保存失败')
  }
}

async function toggle(row: AttributionSubscription): Promise<void> {
  await businessAttributionService.toggleSubscription(row.id, !row.enabled)
  message.success(row.enabled ? '订阅已停用。' : '订阅已启用。')
  await loadData()
}

async function push(row: AttributionSubscription): Promise<void> {
  try {
    await businessAttributionService.pushLatestReport(row.id)
    message.success('已使用最新成功报告发起推送。')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '推送失败')
  }
}

async function remove(row: AttributionSubscription): Promise<void> {
  await businessAttributionService.deleteSubscription(row.id)
  message.success('订阅已删除。')
  await loadData()
}

const columns: DataTableColumns<AttributionSubscription> = [
  { title: '订阅名称', key: 'name', width: 220 },
  {
    title: '归因报告',
    key: 'configId',
    render: (row) => reportNameMap.value[row.configId] ?? row.configId,
  },
  { title: '推送方式', key: 'pushChannel' },
  {
    title: '接收对象',
    key: 'recipients',
    render: (row) =>
      h(NSpace, { size: 'small' }, () =>
        row.recipients.map((recipient) => h(NTag, { bordered: false }, { default: () => `${recipient.name} · ${recipient.type}` })),
      ),
  },
  { title: '推送频率', key: 'frequency' },
  { title: '推送时间', key: 'pushTime' },
  {
    title: '状态',
    key: 'enabled',
    render: (row) => h(NTag, { type: row.enabled ? 'success' : 'default', bordered: false }, { default: () => (row.enabled ? '启用' : '停用') }),
  },
  { title: '创建人', key: 'creatorName' },
  {
    title: '操作',
    key: 'actions',
    width: 260,
    render: (row) =>
      h(NSpace, { size: 'small' }, () => [
        h(NButton, { size: 'small', secondary: true, onClick: () => void push(row) }, { default: () => '立即推送' }),
        h(NButton, { size: 'small', secondary: true, onClick: () => openEdit(row) }, { default: () => '编辑' }),
        h(NButton, { size: 'small', secondary: true, onClick: () => void toggle(row) }, { default: () => (row.enabled ? '停用' : '启用') }),
        h(
          NPopconfirm,
          { onPositiveClick: () => void remove(row) },
          {
            trigger: () => h(NButton, { size: 'small', type: 'error', secondary: true }, { default: () => '删除' }),
            default: () => '确认删除该订阅吗？',
          },
        ),
      ]),
  },
]

onMounted(() => {
  void loadData()
})
</script>

<template>
  <div class="page-container">
    <div class="page-heading">
      <div>
        <h1 class="page-title">归因订阅管理</h1>
        <p class="page-description">报告生成后可向飞书、钉钉和 WebHook 推送；新建配置会自动生成默认订阅。</p>
      </div>
      <n-space>
        <n-button @click="router.push('/analysis-center/business-attribution')">返回业务归因分析</n-button>
        <n-button type="primary" @click="openCreate">新建订阅</n-button>
      </n-space>
    </div>

    <n-alert type="info" :show-icon="false" class="top-note">
      每个归因配置保存试运算成功后会自动创建默认订阅；订阅可独立启停、立即推送最新成功报告，WebHook 订阅必须绑定一个已启用的 WebHook。
    </n-alert>

    <n-card :bordered="false">
      <n-data-table :loading="loading" :columns="columns" :data="subscriptions" />
    </n-card>

    <n-modal v-model:show="modalVisible" preset="card" title="订阅设置" class="medium-modal">
      <n-form label-placement="top">
        <n-grid :cols="2" :x-gap="12">
          <n-gi>
            <n-form-item label="订阅名称">
              <n-input v-model:value="draft.name" />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="归因报告">
              <n-select v-model:value="draft.configId" :options="configOptions" />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="展示日期">
              <n-select v-model:value="draft.displayDate" :options="displayDateOptions" />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="推送方式">
              <n-select v-model:value="draft.pushChannel" :options="channelOptions" @update:value="updatePushChannel" />
            </n-form-item>
          </n-gi>
          <n-gi v-if="draft.pushChannel === 'WEBHOOK'" :span="2">
            <n-form-item label="WebHook 配置">
              <n-select v-model:value="draft.webhookId" :options="webhookOptions" placeholder="选择已启用的 WebHook" @update:value="(value) => updateWebhookRecipient(String(value))" />
            </n-form-item>
          </n-gi>
          <n-gi v-else :span="2">
            <n-form-item label="接收对象">
              <n-input v-model:value="recipientText" type="textarea" placeholder="支持用逗号或换行分隔多个用户/群组名称" />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="推送频率">
              <n-select v-model:value="draft.frequency" :options="frequencyOptions" />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="推送时间">
              <n-input v-model:value="draft.pushTime" placeholder="09:00" />
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

.top-note {
  margin-bottom: 16px;
}

.medium-modal {
  width: 640px;
}
</style>
