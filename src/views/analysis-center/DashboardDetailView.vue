<script setup lang="ts">
import '@/components/charts/chartRegister'
import type { EChartsOption } from 'echarts'
import {
  NAlert,
  NButton,
  NCard,
  NDataTable,
  NEmpty,
  NInput,
  NModal,
  NSelect,
  NSpace,
  NSpin,
  NTag,
} from 'naive-ui'
import type { DataTableColumns, TagProps } from 'naive-ui'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import VChart from 'vue-echarts'
import { analysisCenterService } from '@/services/analysisCenterService'
import type {
  AnalysisCenterSpace,
  DashboardAsset,
  DashboardGlobalFilter,
  DashboardWidgetAsset,
  DashboardWidgetTableRow,
  ShareAssetPayload,
  SharePrincipal,
} from '@/types/analysisCenter'

const route = useRoute()
const router = useRouter()
const dashboard = ref<DashboardAsset | null>(null)
const loading = ref(false)
const refreshing = ref(false)
const editMode = ref(route.query.mode === 'edit')
const actionNotice = ref('')
const renameWidgetVisible = ref(false)
const shareModalVisible = ref(false)
const renamingWidget = ref<DashboardWidgetAsset | null>(null)
const widgetTitleDraft = ref('')
const spaces = ref<AnalysisCenterSpace[]>([])
const shareMembers = ref<SharePrincipal[]>([])
const shareTeams = ref<SharePrincipal[]>([])
const sharedMembers = ref<SharePrincipal[]>([])
const sharedTeams = ref<SharePrincipal[]>([])
const shareDraft = ref<ShareAssetPayload>({
  assetId: '',
  assetType: 'dashboard',
  visibility: 'team',
  targetSpaceId: 'space-team-operation',
  allowCopy: true,
  addMemberIds: [],
  addTeamIds: [],
  removeMemberIds: [],
  removeTeamIds: [],
})
const shareLink = ref('')

const dashboardId = computed(() => String(route.params.dashboardId ?? ''))
const globalFilters = computed<DashboardGlobalFilter[]>(() => dashboard.value?.globalFilters ?? [])
const writableSpaceOptions = computed(() =>
  spaces.value.map((space) => ({
    label: `${space.name} · ${space.type === 'team' ? '团队' : space.type === 'public' ? '公共' : '个人'}`,
    value: space.id,
    disabled: !space.canWrite,
  })),
)
const shareMemberOptions = computed(() =>
  shareMembers.value.map((member) => ({
    label: `${member.name} · ${member.description ?? '成员'}`,
    value: member.id,
  })),
)
const shareTeamOptions = computed(() =>
  shareTeams.value.map((team) => ({
    label: `${team.name} · ${team.description ?? '团队'}`,
    value: team.id,
  })),
)
const currentSharedMemberOptions = computed(() =>
  sharedMembers.value.map((member) => ({ label: member.name, value: member.id })),
)
const currentSharedTeamOptions = computed(() =>
  sharedTeams.value.map((team) => ({ label: team.name, value: team.id })),
)

const statusLabelMap: Record<DashboardWidgetAsset['status'], string> = {
  normal: '正常',
  loading: '刷新中',
  empty: '暂无数据',
  error: '查询失败',
  invalid: '配置失效',
}

const widgetTypeLabelMap: Record<DashboardWidgetAsset['widgetType'], string> = {
  metric_card: '指标卡',
  line: '折线图',
  stacked: '堆叠图',
  bar: '柱形图',
  dual_axis: '双轴图',
  donut: '环形图',
  pie: '饼图',
  percentage: '百分比图',
  cumulative: '累积图',
  table: '表格',
  retention_heatmap: '留存热力图',
  funnel: '漏斗图',
  distribution: '分布图',
}

const widgetTableColumns: DataTableColumns<DashboardWidgetTableRow> = [
  { title: '维度', key: 'dimension', minWidth: 160 },
  { title: '指标', key: 'metric', width: 130 },
  { title: '值', key: 'value', width: 110 },
  { title: '变化', key: 'change', width: 100 },
]

const formatTime = (value?: string): string => value ? value.replace('T', ' ').slice(0, 16) : '-'

const getWidgetStatusType = (status: DashboardWidgetAsset['status']): TagProps['type'] => {
  if (status === 'normal') {
    return 'success'
  }

  if (status === 'error' || status === 'invalid') {
    return 'error'
  }

  if (status === 'empty') {
    return 'warning'
  }

  return 'info'
}

const loadDashboard = async (): Promise<void> => {
  loading.value = true

  try {
    dashboard.value = await analysisCenterService.getDashboard(dashboardId.value)
  } finally {
    loading.value = false
  }
}

const loadSpaces = async (): Promise<void> => {
  spaces.value = await analysisCenterService.getSpaces()
}

const updateGlobalFilter = (filterId: string, value: string): void => {
  if (!dashboard.value?.globalFilters) {
    return
  }

  dashboard.value.globalFilters = dashboard.value.globalFilters.map((filter) =>
    filter.id === filterId ? { ...filter, value } : filter,
  )
  actionNotice.value = '全局筛选已变更，相关组件将按新条件刷新。'
}

const refreshDashboard = async (): Promise<void> => {
  if (!dashboard.value) {
    return
  }

  refreshing.value = true

  try {
    dashboard.value = await analysisCenterService.refreshDashboard(dashboard.value.id, globalFilters.value)
    actionNotice.value = dashboard.value.errorWidgetCount > 0
      ? `看板已刷新，${dashboard.value.errorWidgetCount} 个组件刷新失败。`
      : '看板已刷新。'
  } finally {
    refreshing.value = false
  }
}

const refreshWidget = async (widget: DashboardWidgetAsset): Promise<void> => {
  if (!dashboard.value) {
    return
  }

  const refreshedWidget = await analysisCenterService.refreshWidget(dashboard.value.id, widget.id)
  dashboard.value.widgets = dashboard.value.widgets.map((item) =>
    item.id === refreshedWidget.id ? refreshedWidget : item,
  )
  actionNotice.value = `组件「${refreshedWidget.title}」已刷新。`
}

const openSourceAnalysis = (widget: DashboardWidgetAsset): void => {
  if (widget.sourceAnalysisId) {
    void router.push(`/data-insight/event-analysis?savedAnalysisId=${widget.sourceAnalysisId}`)
  }
}

const requestRenameWidget = (widget: DashboardWidgetAsset): void => {
  renamingWidget.value = widget
  widgetTitleDraft.value = widget.title
  renameWidgetVisible.value = true
}

const submitWidgetTitle = async (): Promise<void> => {
  if (!dashboard.value || !renamingWidget.value) {
    return
  }

  const title = widgetTitleDraft.value.trim()
  const duplicate = dashboard.value.widgets.some(
    (widget) => widget.id !== renamingWidget.value?.id && widget.title === title,
  )

  if (!title) {
    actionNotice.value = '组件标题不能为空。'
    return
  }

  if (title.length > 50) {
    actionNotice.value = '组件标题不能超过 50 个字符。'
    return
  }

  if (duplicate) {
    actionNotice.value = '同一看板内组件标题不能重复。'
    return
  }

  const updatedWidget = await analysisCenterService.updateWidgetTitle(
    dashboard.value.id,
    renamingWidget.value.id,
    title,
  )
  dashboard.value.widgets = dashboard.value.widgets.map((widget) =>
    widget.id === updatedWidget.id ? updatedWidget : widget,
  )
  renameWidgetVisible.value = false
  actionNotice.value = '组件标题已更新。'
}

const duplicateWidget = (widget: DashboardWidgetAsset): void => {
  if (!dashboard.value) {
    return
  }

  const duplicatedWidget: DashboardWidgetAsset = {
    ...widget,
    id: `${widget.id}_copy_${Date.now()}`,
    title: `${widget.title} 副本`,
  }
  dashboard.value.widgets = [...dashboard.value.widgets, duplicatedWidget]
  dashboard.value.widgetCount = dashboard.value.widgets.length
  actionNotice.value = `已复制组件「${widget.title}」。`
}

const deleteWidget = async (widget: DashboardWidgetAsset): Promise<void> => {
  if (!dashboard.value) {
    return
  }

  const result = await analysisCenterService.deleteWidget(dashboard.value.id, widget.id)
  dashboard.value.widgets = dashboard.value.widgets.filter((item) => item.id !== widget.id)
  dashboard.value.widgetCount = dashboard.value.widgets.length
  actionNotice.value = result.message
}

const toggleFavorite = async (): Promise<void> => {
  if (!dashboard.value) {
    return
  }

  dashboard.value = await analysisCenterService.toggleDashboardFavorite(dashboard.value.id)
  actionNotice.value = dashboard.value.favorite ? '已加入收藏夹。' : '已取消收藏。'
}

const requestShare = async (): Promise<void> => {
  if (!dashboard.value) {
    return
  }

  await loadSpaces()
  shareLink.value = ''
  shareDraft.value = {
    assetId: dashboard.value.id,
    assetType: 'dashboard',
    visibility: dashboard.value.visibility,
    targetSpaceId: dashboard.value.spaceId,
    allowCopy: true,
    addMemberIds: [],
    addTeamIds: [],
    removeMemberIds: [],
    removeTeamIds: [],
  }
  const [options, grants] = await Promise.all([
    analysisCenterService.getShareOptions(),
    analysisCenterService.getAssetShareGrants('dashboard', dashboard.value.id),
  ])
  shareMembers.value = options.members
  shareTeams.value = options.teams
  sharedMembers.value = grants.sharedMembers
  sharedTeams.value = grants.sharedTeams
  shareModalVisible.value = true
}

const submitShare = async (): Promise<void> => {
  if (!dashboard.value) {
    return
  }

  const result = await analysisCenterService.shareAsset(shareDraft.value)
  if (shareDraft.value.targetSpaceId && shareDraft.value.targetSpaceId !== dashboard.value.spaceId) {
    dashboard.value = await analysisCenterService.moveDashboardToSpace(dashboard.value.id, shareDraft.value.targetSpaceId)
  } else {
    dashboard.value.visibility = shareDraft.value.visibility as DashboardAsset['visibility']
  }
  shareLink.value = result.shareLink
  sharedMembers.value = result.sharedMembers
  sharedTeams.value = result.sharedTeams
  shareDraft.value.addMemberIds = []
  shareDraft.value.addTeamIds = []
  shareDraft.value.removeMemberIds = []
  shareDraft.value.removeTeamIds = []
  actionNotice.value = result.message
}

const buildChartOption = (widget: DashboardWidgetAsset): EChartsOption => {
  const names = widget.chartData.map((item) => item.name)

  if (widget.widgetType === 'donut' || widget.widgetType === 'pie') {
    return {
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      series: [
        {
          name: widget.title,
          type: 'pie',
          radius: widget.widgetType === 'donut' ? ['48%', '72%'] : '68%',
          data: widget.chartData.map((item) => ({ name: item.name, value: item.value })),
        },
      ],
    }
  }

  if (widget.widgetType === 'bar' || widget.widgetType === 'distribution') {
    return {
      grid: { top: 24, right: 16, bottom: 32, left: 56 },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: names },
      yAxis: { type: 'value' },
      series: [{ name: widget.title, type: 'bar', data: widget.chartData.map((item) => item.value) }],
    }
  }

  return {
    grid: { top: 28, right: 16, bottom: 32, left: 56 },
    tooltip: { trigger: 'axis' },
    legend: { top: 0, right: 0 },
    xAxis: { type: 'category', boundaryGap: false, data: names },
    yAxis: { type: 'value' },
    series: [
      {
        name: '当前值',
        type: 'line',
        smooth: true,
        data: widget.chartData.map((item) => item.value),
      },
      {
        name: '对比值',
        type: 'line',
        smooth: true,
        data: widget.chartData.map((item) => item.compareValue ?? null),
      },
    ],
  }
}

onMounted(() => {
  void loadDashboard()
  void loadSpaces()
})
</script>

<template>
  <div class="page-container dashboard-detail-page">
    <n-spin :show="loading">
      <template v-if="dashboard">
        <div class="detail-header">
          <div>
            <h1 class="page-title">{{ dashboard.name }}</h1>
            <p class="page-description">{{ dashboard.description }}</p>
            <n-space :size="8">
              <n-tag size="small">{{ dashboard.spaceType === 'team' ? '团队空间' : dashboard.spaceType === 'public' ? '公共空间' : '个人空间' }}</n-tag>
              <n-tag size="small">{{ dashboard.spaceName }}</n-tag>
              <n-tag size="small" type="info">{{ dashboard.widgetCount }} 个组件</n-tag>
              <n-tag v-if="editMode" size="small" type="warning">编辑模式</n-tag>
              <n-tag v-if="dashboard.errorWidgetCount" size="small" type="error">{{ dashboard.errorWidgetCount }} 个异常组件</n-tag>
            </n-space>
          </div>
          <n-space>
            <n-button size="small" @click="router.push('/analysis-center/dashboards')">返回列表</n-button>
            <n-button size="small" :loading="refreshing" @click="refreshDashboard">刷新看板</n-button>
            <n-button size="small" @click="requestShare">分享</n-button>
            <n-button size="small" @click="toggleFavorite">{{ dashboard.favorite ? '取消收藏' : '加入收藏' }}</n-button>
            <n-button size="small" type="primary" @click="editMode = !editMode">{{ editMode ? '退出编辑' : '编辑看板' }}</n-button>
          </n-space>
        </div>

        <n-alert v-if="actionNotice" type="success" :show-icon="false" class="notice-alert">
          {{ actionNotice }}
        </n-alert>

        <n-card :bordered="false" class="filter-card">
          <div class="filter-title">全局筛选器</div>
          <div class="global-filter-grid">
            <div v-for="filter in globalFilters" :key="filter.id" class="filter-item">
              <span>{{ filter.label }}</span>
              <n-select
                :value="filter.value"
                :options="filter.options"
                size="small"
                @update:value="(value) => updateGlobalFilter(filter.id, String(value))"
              />
            </div>
          </div>
        </n-card>

        <div class="widget-grid" :class="{ 'is-editing': editMode }">
          <n-card
            v-for="widget in dashboard.widgets"
            :key="widget.id"
            :bordered="false"
            class="widget-card"
            :class="[`widget-${widget.widgetType}`, { 'widget-error': widget.status === 'error' || widget.status === 'invalid' }]"
          >
            <div class="widget-header">
              <div>
                <h3>{{ widget.title }}</h3>
                <p>{{ widget.description }}</p>
              </div>
              <n-space :size="6">
                <n-tag size="small">{{ widgetTypeLabelMap[widget.widgetType] }}</n-tag>
                <n-tag size="small" :type="getWidgetStatusType(widget.status)">
                  {{ statusLabelMap[widget.status] }}
                </n-tag>
                <n-tag v-if="!widget.acceptGlobalTime" size="small" type="warning">固定时间</n-tag>
              </n-space>
            </div>

            <div v-if="widget.status === 'error' || widget.status === 'invalid'" class="widget-state">
              <strong>{{ widget.status === 'invalid' ? '该组件配置已失效' : '组件查询失败' }}</strong>
              <span>{{ widget.errorMessage ?? '引用的分析配置无法刷新。' }}</span>
            </div>
            <div v-else-if="widget.status === 'empty'" class="widget-state">
              <n-empty description="暂无数据" />
            </div>
            <div v-else-if="widget.widgetType === 'metric_card'" class="metric-widget">
              <span class="metric-value">{{ widget.metricValue }}</span>
              <n-tag size="small" type="warning">{{ widget.metricChange }}</n-tag>
            </div>
            <n-data-table
              v-else-if="widget.widgetType === 'table'"
              :columns="widgetTableColumns"
              :data="widget.tableRows ?? []"
              size="small"
              :pagination="false"
            />
            <v-chart v-else class="dashboard-chart" :option="buildChartOption(widget)" autoresize />

            <div class="widget-footer">
              <span>最近刷新：{{ formatTime(widget.lastRefreshAt) }}</span>
              <n-space :size="8">
                <n-button size="tiny" text type="primary" @click="refreshWidget(widget)">刷新</n-button>
                <n-button size="tiny" text @click="openSourceAnalysis(widget)">来源分析</n-button>
                <n-button v-if="editMode" size="tiny" text @click="requestRenameWidget(widget)">改标题</n-button>
                <n-button v-if="editMode" size="tiny" text @click="duplicateWidget(widget)">复制</n-button>
                <n-button v-if="editMode" size="tiny" text type="error" @click="deleteWidget(widget)">删除</n-button>
              </n-space>
            </div>
          </n-card>
        </div>
      </template>
      <n-empty v-else description="未找到数据看板。" />
    </n-spin>

    <n-modal v-model:show="renameWidgetVisible" preset="card" title="编辑组件标题" class="small-modal">
      <n-space vertical>
        <n-input v-model:value="widgetTitleDraft" maxlength="50" show-count placeholder="请输入组件标题" />
        <n-space justify="end">
          <n-button @click="renameWidgetVisible = false">取消</n-button>
          <n-button type="primary" @click="submitWidgetTitle">保存</n-button>
        </n-space>
      </n-space>
    </n-modal>

    <n-modal v-model:show="shareModalVisible" preset="card" title="分享数据看板" class="small-modal">
      <n-space vertical>
        <n-alert type="info" :show-icon="false">
          分享对象：{{ dashboard?.name }}
        </n-alert>
        <n-select
          v-model:value="shareDraft.visibility"
          :options="[
            { label: '仅自己可见', value: 'private' },
            { label: '团队成员可见', value: 'team' },
            { label: '公开访问', value: 'public' },
          ]"
          placeholder="可见范围"
        />
        <n-select v-model:value="shareDraft.targetSpaceId" :options="writableSpaceOptions" placeholder="目标空间" />
        <n-card size="small" title="新增分享对象">
          <n-space vertical>
            <n-select
              v-model:value="shareDraft.addMemberIds"
              :options="shareMemberOptions"
              multiple
              filterable
              clearable
              placeholder="选择一个或多个成员"
            />
            <n-select
              v-model:value="shareDraft.addTeamIds"
              :options="shareTeamOptions"
              multiple
              filterable
              clearable
              placeholder="选择一个或多个团队"
            />
          </n-space>
        </n-card>
        <n-card size="small" title="取消分享对象">
          <n-space vertical>
            <div class="share-current">
              <span>当前成员</span>
              <n-tag v-for="member in sharedMembers" :key="member.id" size="small">{{ member.name }}</n-tag>
            </div>
            <n-select
              v-model:value="shareDraft.removeMemberIds"
              :options="currentSharedMemberOptions"
              multiple
              clearable
              placeholder="选择要取消分享的成员"
            />
            <div class="share-current">
              <span>当前团队</span>
              <n-tag v-for="team in sharedTeams" :key="team.id" size="small" type="info">{{ team.name }}</n-tag>
            </div>
            <n-select
              v-model:value="shareDraft.removeTeamIds"
              :options="currentSharedTeamOptions"
              multiple
              clearable
              placeholder="选择要取消分享的团队"
            />
          </n-space>
        </n-card>
        <n-button type="primary" @click="submitShare">生成分享链接</n-button>
        <n-input v-if="shareLink" :value="shareLink" readonly />
        <n-space justify="end">
          <n-button @click="shareModalVisible = false">关闭</n-button>
        </n-space>
      </n-space>
    </n-modal>
  </div>
</template>

<style scoped lang="scss">
.dashboard-detail-page {
  display: grid;
  gap: 16px;
}

.detail-header,
.widget-header,
.widget-footer {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.notice-alert {
  margin: 0;
}

.filter-title {
  margin-bottom: 12px;
  color: #111827;
  font-weight: 700;
}

.global-filter-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.filter-item {
  display: grid;
  gap: 6px;
  color: #6b7280;
  font-size: 12px;
}

.widget-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.widget-card {
  min-height: 280px;
}

.widget-line,
.widget-table {
  grid-column: span 2;
}

.is-editing .widget-card {
  outline: 2px dashed #18a058;
  outline-offset: -8px;
}

.widget-error {
  background: #fff7f7;
}

.widget-header h3 {
  margin: 0 0 6px;
  color: #111827;
  font-size: 16px;
}

.widget-header p {
  margin: 0;
  color: #6b7280;
  font-size: 12px;
}

.dashboard-chart {
  width: 100%;
  height: 240px;
}

.metric-widget {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 150px;
}

.metric-value {
  color: #111827;
  font-size: 40px;
  font-weight: 700;
}

.widget-state {
  display: grid;
  gap: 8px;
  min-height: 150px;
  place-content: center;
  color: #d03050;
  text-align: center;
}

.widget-footer {
  margin-top: 14px;
  color: #6b7280;
  font-size: 12px;
}

.share-current {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  color: #6b7280;
  font-size: 12px;
}
</style>
