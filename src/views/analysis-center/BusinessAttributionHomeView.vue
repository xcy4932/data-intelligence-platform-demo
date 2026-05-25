<script setup lang="ts">
import {
  NAlert,
  NButton,
  NCard,
  NDataTable,
  NDrawer,
  NDrawerContent,
  NDropdown,
  NForm,
  NFormItem,
  NGi,
  NGrid,
  NInput,
  NModal,
  NSelect,
  NSpace,
  NSpin,
  NSwitch,
  NTabPane,
  NTabs,
  NTag,
  NText,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, DropdownOption, SelectOption, TagProps } from 'naive-ui'
import { computed, h, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  businessAttributionPermissionLabels,
  businessAttributionReportTypeLabels,
  businessAttributionStatusLabels,
  currentBusinessAttributionUser,
} from '@/mock/businessAttribution'
import { buildEmbedUrl, businessAttributionService } from '@/services/businessAttributionService'
import type {
  AttributionHomeTab,
  AttributionHomeToolbar,
  AttributionPermissionRole,
  AttributionReportCard,
  AttributionSubscription,
  CreateAttributionConfigForm,
  PermissionGrant,
} from '@/types/businessAttribution'

const router = useRouter()
const message = useMessage()
const loading = ref(false)
const cards = ref<AttributionReportCard[]>([])
const activeTab = ref<AttributionHomeTab>('CREATED_BY_ME')
const createVisible = ref(false)
const permissionVisible = ref(false)
const subscriptionVisible = ref(false)
const embedVisible = ref(false)
const deleteConfirmVisible = ref(false)
const selectedCard = ref<AttributionReportCard | null>(null)
const deleteCandidate = ref<AttributionReportCard | null>(null)
const permissions = ref<PermissionGrant[]>([])
const embedLink = ref('')
const toolbar = reactive<AttributionHomeToolbar>({
  searchKeyword: '',
  reportTypeFilter: 'ALL',
  statusFilter: 'ALL',
  createButtonVisible: true,
})
const createForm = reactive<CreateAttributionConfigForm>({
  name: '',
  description: '',
})
const permissionDraft = reactive<PermissionGrant>({
  id: '',
  resourceId: '',
  granteeType: 'USER',
  granteeId: '',
  granteeName: '',
  role: 'VIEW',
})
const subscriptionDraft = reactive<AttributionSubscription>({
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
const embedOptions = reactive({
  onlyRootCause: false,
  advance: true,
  inline: true,
  hideNavigation: false,
  pureTable: false,
})

const reportTypeOptions: SelectOption[] = [
  { label: '全部报告类型', value: 'ALL' },
  ...Object.entries(businessAttributionReportTypeLabels).map(([value, label]) => ({ label, value })),
]

const statusOptions: SelectOption[] = [
  { label: '全部状态', value: 'ALL' },
  ...Object.entries(businessAttributionStatusLabels).map(([value, label]) => ({ label, value })),
]

const roleOptions: SelectOption[] = Object.entries(businessAttributionPermissionLabels).map(([value, label]) => ({
  label,
  value,
}))

const granteeOptions: SelectOption[] = [
  { label: 'Chaoyang Xu · 用户', value: 'user_chaoyang' },
  { label: '数据分析团队 · 用户', value: 'user_analytics' },
  { label: '增长分析组 · 用户组', value: 'group_growth' },
  { label: '支付运营组 · 用户组', value: 'group_payment_ops' },
]

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

const canCreate = computed(() => createForm.name.trim().length > 0 && createForm.name.trim().length <= 50)

function optionLabel(option: SelectOption | undefined): string {
  if (!option) return ''
  return typeof option.label === 'string' ? option.label : String(option.value ?? '')
}

function getRunStatusType(status: AttributionReportCard['lastRunStatus']): TagProps['type'] {
  if (status === 'SUCCESS') return 'success'
  if (status === 'FAILED') return 'error'
  if (status === 'RUNNING') return 'warning'
  return 'default'
}

function getPermissionType(role: AttributionPermissionRole): TagProps['type'] {
  if (role === 'MANAGE') return 'success'
  if (role === 'EDIT') return 'warning'
  return 'info'
}

function canEdit(card: AttributionReportCard): boolean {
  return ['EDIT', 'MANAGE'].includes(card.permission)
}

function canManage(card: AttributionReportCard): boolean {
  return card.permission === 'MANAGE'
}

async function loadCards(): Promise<void> {
  loading.value = true
  try {
    cards.value = await businessAttributionService.listCards(activeTab.value, toolbar)
  } finally {
    loading.value = false
  }
}

function openCreateDrawer(): void {
  createForm.name = ''
  createForm.description = ''
  createVisible.value = true
}

async function createConfig(): Promise<void> {
  try {
    const config = await businessAttributionService.createConfig(createForm)
    createVisible.value = false
    message.success('归因配置已创建，正在进入配置编辑。')
    await router.push(`/insight/attribution/config/${config.id}/edit`)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '创建失败')
  }
}

function openReport(card: AttributionReportCard): void {
  void router.push(`/analysis-center/business-attribution/reports/${card.configId}`)
}

function openConfig(card: AttributionReportCard): void {
  void router.push(`/analysis-center/business-attribution/config/${card.configId}/edit`)
}

async function runTrial(card: AttributionReportCard): Promise<void> {
  try {
    const result = await businessAttributionService.runTrial(card.configId)
    if (result.state === 'SUCCESS') {
      message.success(result.message)
    } else {
      message.error(result.message)
    }
    await loadCards()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '试运算失败')
  }
}

async function rerun(card: AttributionReportCard): Promise<void> {
  try {
    await businessAttributionService.rerunReport(card.configId, undefined, true)
    message.success('已使用原报告快照重跑，并触发订阅推送。')
    await loadCards()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '重跑失败')
  }
}

async function toggleRegular(card: AttributionReportCard): Promise<void> {
  const nextEnabled = card.regularStatus !== 'ENABLED'
  await businessAttributionService.toggleRegularRun(card.configId, nextEnabled)
  message.success(nextEnabled ? '已恢复例行运算，明天开始重新执行。' : '已暂停例行运算。')
  await loadCards()
}

async function skipSystemPause(card: AttributionReportCard): Promise<void> {
  try {
    await businessAttributionService.skipSystemPause(card.configId)
    message.success('已跳过 30 天未访问自动暂停，本配置会继续例行运算。')
    await loadCards()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '跳过暂停失败')
  }
}

async function runRegularNow(card: AttributionReportCard): Promise<void> {
  try {
    const report = await businessAttributionService.regularRun(card.configId)
    if (report) {
      message.success('例行运算已完成，并已触发订阅与 WebHook 投递。')
    } else {
      message.warning('当前配置不满足例行运算条件。')
    }
    await loadCards()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '例行运算失败')
  }
}

async function duplicate(card: AttributionReportCard): Promise<void> {
  const config = await businessAttributionService.duplicateConfig(card.configId)
  message.success(`已复制为「${config.name}」。`)
  await loadCards()
}

async function removeConfig(card: AttributionReportCard): Promise<void> {
  await businessAttributionService.deleteConfig(card.configId)
  message.success(card.embeddedInDashboard ? '配置已删除；已有仪表盘嵌入页面将无法加载。' : '配置已删除。')
  await loadCards()
}

function openDeleteConfirm(card: AttributionReportCard): void {
  deleteCandidate.value = card
  deleteConfirmVisible.value = true
}

async function confirmRemoveConfig(): Promise<void> {
  if (!deleteCandidate.value) return
  const card = deleteCandidate.value
  deleteConfirmVisible.value = false
  deleteCandidate.value = null
  await removeConfig(card)
}

async function copyLink(card: AttributionReportCard): Promise<void> {
  const link = `${window.location.origin}/analysis-center/business-attribution/reports/${card.configId}`
  await navigator.clipboard?.writeText(link)
  message.success('报告链接已复制。')
}

async function openPermissionModal(card: AttributionReportCard): Promise<void> {
  selectedCard.value = card
  permissionDraft.id = ''
  permissionDraft.resourceId = card.configId
  permissionDraft.granteeType = 'USER'
  permissionDraft.granteeId = ''
  permissionDraft.granteeName = ''
  permissionDraft.role = 'VIEW'
  permissions.value = await businessAttributionService.listPermissions(card.configId)
  permissionVisible.value = true
}

async function savePermission(): Promise<void> {
  if (!selectedCard.value) return
  const label = optionLabel(granteeOptions.find((item) => item.value === permissionDraft.granteeId))
  permissionDraft.granteeName = label.split(' · ')[0] ?? permissionDraft.granteeId
  permissionDraft.granteeType = permissionDraft.granteeId.startsWith('group_') ? 'USER_GROUP' : 'USER'

  try {
    await businessAttributionService.savePermission({ ...permissionDraft })
    permissions.value = await businessAttributionService.listPermissions(selectedCard.value.configId)
    message.success('权限已保存。')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '权限保存失败')
  }
}

async function deletePermission(row: PermissionGrant): Promise<void> {
  if (!selectedCard.value) return
  try {
    await businessAttributionService.deletePermission(row.id)
    permissions.value = await businessAttributionService.listPermissions(selectedCard.value.configId)
    message.success('授权已移除。')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '删除失败')
  }
}

function openSubscriptionModal(card: AttributionReportCard): void {
  selectedCard.value = card
  subscriptionDraft.id = ''
  subscriptionDraft.configId = card.configId
  subscriptionDraft.name = `${card.name} 订阅`
  subscriptionDraft.displayDate = 'CALCULATION_DAY'
  subscriptionDraft.pushChannel = 'FEISHU_USER'
  subscriptionDraft.frequency = 'AFTER_EACH_REGULAR_RUN'
  subscriptionDraft.pushTime = '09:00'
  subscriptionDraft.enabled = true
  subscriptionDraft.recipients = [{ id: currentBusinessAttributionUser.id, name: currentBusinessAttributionUser.name, type: 'USER' }]
  subscriptionVisible.value = true
}

async function saveSubscription(): Promise<void> {
  try {
    await businessAttributionService.saveSubscription({ ...subscriptionDraft })
    subscriptionVisible.value = false
    message.success('订阅已创建。')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '订阅保存失败')
  }
}

function openEmbedModal(card: AttributionReportCard): void {
  selectedCard.value = card
  embedOptions.onlyRootCause = false
  embedOptions.advance = true
  embedOptions.inline = true
  embedOptions.hideNavigation = false
  embedOptions.pureTable = false
  refreshEmbedLink()
  embedVisible.value = true
}

function refreshEmbedLink(): void {
  if (!selectedCard.value) return
  const feature = {
    autoInsight: {
      reportBlockVisible: {
        navigation: !embedOptions.hideNavigation,
      },
      reportControl: {
        pureTable: embedOptions.pureTable,
      },
    },
  }

  embedLink.value = `${window.location.origin}${buildEmbedUrl(selectedCard.value.configId, {
    CalculationDay: 'Latest',
    OnlyRootCause: embedOptions.onlyRootCause ? 'True' : 'False',
    Algorithms: embedOptions.onlyRootCause ? 'Adtributor' : undefined,
    Advance: embedOptions.advance ? 'True' : 'False',
    Inline: embedOptions.inline ? 'true' : 'false',
    Feature: encodeURIComponent(JSON.stringify(feature)),
  })}`
}

async function copyEmbedLink(): Promise<void> {
  refreshEmbedLink()
  await navigator.clipboard?.writeText(embedLink.value)
  message.success('嵌入链接已复制，CalculationDay 已设置为 Latest。')
}

function cardMoreOptions(card: AttributionReportCard): DropdownOption[] {
  const options: DropdownOption[] = [
    { label: '复制链接', key: 'copyLink' },
    { label: '嵌出报告', key: 'embed' },
    { label: '复制配置', key: 'duplicate' },
  ]

  if (canManage(card)) {
    options.unshift({ label: '权限管理', key: 'permission' })
  }

  if (canEdit(card)) {
    options.unshift({ label: '新建订阅', key: 'subscription' })
    options.push({ type: 'divider', key: 'divider-run' })
    options.push({ label: '试运算', key: 'trial' })
    if (card.lastRunStatus !== 'NO_REPORT') {
      options.push({ label: '重跑并推送', key: 'rerun' })
    }
    options.push({ label: card.regularStatus === 'ENABLED' ? '暂停例行' : '恢复例行', key: 'toggleRegular' })
    if (card.pausedBySystem) {
      options.push({ label: '跳过自动暂停', key: 'skipPause' })
    }
    options.push({ label: '立即例行', key: 'regularNow' })
  }

  if (canManage(card)) {
    options.push({ type: 'divider', key: 'divider-danger' })
    options.push({ label: '删除配置', key: 'delete' })
  }

  return options
}

function handleCardMoreSelect(key: string | number, card: AttributionReportCard): void {
  const action = String(key)
  if (action === 'permission') void openPermissionModal(card)
  if (action === 'subscription') openSubscriptionModal(card)
  if (action === 'copyLink') void copyLink(card)
  if (action === 'embed') openEmbedModal(card)
  if (action === 'trial') void runTrial(card)
  if (action === 'rerun') void rerun(card)
  if (action === 'toggleRegular') void toggleRegular(card)
  if (action === 'skipPause') void skipSystemPause(card)
  if (action === 'regularNow') void runRegularNow(card)
  if (action === 'duplicate') void duplicate(card)
  if (action === 'delete') openDeleteConfirm(card)
}

const permissionColumns: DataTableColumns<PermissionGrant> = [
  { title: '授权对象', key: 'granteeName' },
  {
    title: '类型',
    key: 'granteeType',
    render: (row) => (row.granteeType === 'USER' ? '用户' : '用户组'),
  },
  {
    title: '角色',
    key: 'role',
    render: (row) => h(NTag, { type: getPermissionType(row.role), bordered: false }, { default: () => businessAttributionPermissionLabels[row.role] }),
  },
  {
    title: '操作',
    key: 'actions',
    width: 110,
    render: (row) =>
      h(
        NButton,
        {
          size: 'small',
          quaternary: true,
          type: 'error',
          onClick: () => void deletePermission(row),
        },
        { default: () => '移除' },
      ),
  },
]

onMounted(() => {
  void loadCards()
})
</script>

<template>
  <div class="page-container business-attribution-home">
    <div class="page-heading">
      <div>
        <h1 class="page-title">业务归因分析</h1>
        <p class="page-description">面向可视化分析的自动化归因报告，覆盖异动分析、维度归因、指标归因和指标分析树。</p>
      </div>
      <n-space>
        <n-button secondary @click="router.push('/analysis-center/business-attribution/subscriptions')">订阅管理</n-button>
        <n-button secondary @click="router.push('/analysis-center/business-attribution/webhooks')">WebHook 配置</n-button>
        <n-button type="primary" @click="openCreateDrawer">新建配置</n-button>
      </n-space>
    </div>

    <n-alert type="info" :show-icon="false" class="boundary-alert">
      当前模块位于“可视化分析 / 业务归因分析”，与“数据洞察 / 归因分析”的 UAB 体系能力互不影响。
    </n-alert>

    <n-card class="toolbar-card" :bordered="false">
      <n-grid :cols="24" :x-gap="12" :y-gap="12">
        <n-gi :span="10">
          <n-input v-model:value="toolbar.searchKeyword" clearable placeholder="搜索配置名称或描述" @update:value="loadCards" />
        </n-gi>
        <n-gi :span="5">
          <n-select v-model:value="toolbar.reportTypeFilter" :options="reportTypeOptions" @update:value="loadCards" />
        </n-gi>
        <n-gi :span="5">
          <n-select v-model:value="toolbar.statusFilter" :options="statusOptions" @update:value="loadCards" />
        </n-gi>
        <n-gi :span="4">
          <n-button block secondary @click="loadCards">刷新</n-button>
        </n-gi>
      </n-grid>
    </n-card>

    <n-tabs v-model:value="activeTab" type="line" animated @update:value="loadCards">
      <n-tab-pane name="CREATED_BY_ME" tab="我创建的" />
      <n-tab-pane name="SHARED_WITH_ME" tab="共享给我" />
    </n-tabs>

    <n-spin :show="loading">
      <div class="report-grid">
        <n-card v-for="card in cards" :key="card.configId" class="report-card" :bordered="false">
          <div class="card-head">
            <div>
              <n-space align="center" size="small">
                <n-tag v-if="card.reportType" type="info" bordered>{{ businessAttributionReportTypeLabels[card.reportType] }}</n-tag>
                <n-tag v-else bordered>未选择类型</n-tag>
                <n-tag :type="getRunStatusType(card.lastRunStatus)" bordered>{{ card.lastRunStatus }}</n-tag>
                <n-tag :type="card.regularStatus === 'ENABLED' ? 'success' : 'warning'" bordered>
                  {{ card.regularStatus === 'ENABLED' ? '例行中' : '已暂停' }}
                </n-tag>
              </n-space>
              <h3>{{ card.name }}</h3>
              <p>{{ card.description || '暂无描述' }}</p>
            </div>
            <n-tag :type="getPermissionType(card.permission)" round>{{ businessAttributionPermissionLabels[card.permission] }}</n-tag>
          </div>

          <div class="card-meta">
            <span>创建人：{{ card.creatorName }}</span>
            <span>最近报告：{{ card.lastCalculationDay || '暂无' }}</span>
            <span>更新：{{ card.updatedAt }}</span>
          </div>

          <n-alert v-if="card.embeddedInDashboard" type="warning" :show-icon="false" class="embed-warning">
            已被仪表盘嵌入，删除后嵌入页面将无法加载。
          </n-alert>

          <n-alert v-if="card.pausedBySystem" type="warning" :show-icon="false" class="embed-warning">
            该配置因 30 天未访问被系统暂停；可跳过本次自动暂停并继续例行运算。
          </n-alert>

          <div class="card-actions">
            <div class="primary-actions">
              <n-button type="primary" size="small" @click="openReport(card)">查看报告</n-button>
              <n-button v-if="canEdit(card)" size="small" secondary @click="openConfig(card)">编辑配置</n-button>
            </div>
            <n-dropdown trigger="click" :options="cardMoreOptions(card)" @select="(key) => handleCardMoreSelect(key, card)">
              <n-button size="small" secondary>更多操作</n-button>
            </n-dropdown>
          </div>
        </n-card>
      </div>
    </n-spin>

    <n-drawer v-model:show="createVisible" :width="420" placement="right">
      <n-drawer-content title="新建归因配置">
        <n-form>
          <n-form-item label="配置名称" required>
            <n-input v-model:value="createForm.name" maxlength="50" show-count placeholder="1-50 个字符" />
          </n-form-item>
          <n-form-item label="描述">
            <n-input v-model:value="createForm.description" type="textarea" maxlength="500" show-count placeholder="可选，最多 500 字符" />
          </n-form-item>
        </n-form>
        <template #footer>
          <n-space justify="end">
            <n-button @click="createVisible = false">取消</n-button>
            <n-button type="primary" :disabled="!canCreate" @click="createConfig">确定</n-button>
          </n-space>
        </template>
      </n-drawer-content>
    </n-drawer>

    <n-modal v-model:show="permissionVisible" preset="card" title="权限管理" class="wide-modal">
      <n-alert type="default" :show-icon="false" class="modal-note">
        报告权限独立于底层数据集权限；个人和用户组权限同时存在时取最高权限。
      </n-alert>
      <n-grid :cols="24" :x-gap="12">
        <n-gi :span="8">
          <n-select v-model:value="permissionDraft.granteeId" :options="granteeOptions" placeholder="选择用户或用户组" />
        </n-gi>
        <n-gi :span="6">
          <n-select v-model:value="permissionDraft.role" :options="roleOptions" />
        </n-gi>
        <n-gi :span="4">
          <n-button type="primary" :disabled="!permissionDraft.granteeId" @click="savePermission">授权</n-button>
        </n-gi>
      </n-grid>
      <n-data-table class="modal-table" :columns="permissionColumns" :data="permissions" />
    </n-modal>

    <n-modal v-model:show="subscriptionVisible" preset="card" title="新建订阅" class="medium-modal">
      <n-form>
        <n-form-item label="订阅名称">
          <n-input v-model:value="subscriptionDraft.name" />
        </n-form-item>
        <n-form-item label="展示日期">
          <n-select v-model:value="subscriptionDraft.displayDate" :options="displayDateOptions" />
        </n-form-item>
        <n-form-item label="推送方式">
          <n-select v-model:value="subscriptionDraft.pushChannel" :options="channelOptions" />
        </n-form-item>
        <n-form-item label="推送频率">
          <n-select v-model:value="subscriptionDraft.frequency" :options="frequencyOptions" />
        </n-form-item>
        <n-form-item label="推送时间">
          <n-input v-model:value="subscriptionDraft.pushTime" placeholder="09:00" />
        </n-form-item>
        <n-form-item label="启用">
          <n-switch v-model:value="subscriptionDraft.enabled" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="subscriptionVisible = false">取消</n-button>
          <n-button type="primary" @click="saveSubscription">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="embedVisible" preset="card" title="嵌出报告" class="medium-modal">
      <n-alert type="info" :show-icon="false" class="modal-note">
        嵌入链接会自动使用 CalculationDay=Latest，并移除 Trial 与 ReportId 类参数。
      </n-alert>
      <n-grid :cols="2" :x-gap="12" :y-gap="12">
        <n-gi>
          <n-space align="center" justify="space-between">
            <n-text>只展示根因明细</n-text>
            <n-switch v-model:value="embedOptions.onlyRootCause" @update:value="refreshEmbedLink" />
          </n-space>
        </n-gi>
        <n-gi>
          <n-space align="center" justify="space-between">
            <n-text>显示高级控件</n-text>
            <n-switch v-model:value="embedOptions.advance" @update:value="refreshEmbedLink" />
          </n-space>
        </n-gi>
        <n-gi>
          <n-space align="center" justify="space-between">
            <n-text>内嵌模式</n-text>
            <n-switch v-model:value="embedOptions.inline" @update:value="refreshEmbedLink" />
          </n-space>
        </n-gi>
        <n-gi>
          <n-space align="center" justify="space-between">
            <n-text>隐藏导航</n-text>
            <n-switch v-model:value="embedOptions.hideNavigation" @update:value="refreshEmbedLink" />
          </n-space>
        </n-gi>
        <n-gi>
          <n-space align="center" justify="space-between">
            <n-text>纯净表格</n-text>
            <n-switch v-model:value="embedOptions.pureTable" @update:value="refreshEmbedLink" />
          </n-space>
        </n-gi>
      </n-grid>
      <n-input class="embed-link" :value="embedLink" type="textarea" readonly />
      <template #footer>
        <n-space justify="end">
          <n-button @click="embedVisible = false">关闭</n-button>
          <n-button type="primary" @click="copyEmbedLink">复制嵌入链接</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="deleteConfirmVisible" preset="card" title="删除归因配置" class="medium-modal">
      <n-alert type="warning" :show-icon="false" class="modal-note">
        确认删除「{{ deleteCandidate?.name }}」吗？删除后会同步移除该归因配置、报告索引、订阅关系、权限关系和例行任务。
        <template v-if="deleteCandidate?.embeddedInDashboard">已有仪表盘嵌入页面将无法加载。</template>
      </n-alert>
      <template #footer>
        <n-space justify="end">
          <n-button @click="deleteConfirmVisible = false">取消</n-button>
          <n-button type="error" @click="confirmRemoveConfig">确认删除</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<style scoped lang="scss">
.page-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.boundary-alert,
.toolbar-card {
  margin-bottom: 16px;
}

.report-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.report-card {
  min-height: 286px;
}

.card-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;

  h3 {
    margin: 12px 0 8px;
    font-size: 18px;
  }

  p {
    margin: 0;
    min-height: 40px;
    color: #667085;
    line-height: 1.55;
  }
}

.card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
  margin: 18px 0 12px;
  color: #667085;
  font-size: 13px;
}

.embed-warning {
  margin-bottom: 12px;
}

.card-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 8px;
  border-top: 1px solid #edf0f5;
}

.primary-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.wide-modal {
  width: 760px;
}

.medium-modal {
  width: 560px;
}

.modal-note {
  margin-bottom: 14px;
}

.modal-table {
  margin-top: 16px;
}

.embed-link {
  margin-top: 16px;
}
</style>
