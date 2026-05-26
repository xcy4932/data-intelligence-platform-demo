<script setup lang="ts">
import { computed, h, ref } from 'vue'
import type { Component } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import type { MenuOption } from 'naive-ui'
import {
  NAvatar,
  NBreadcrumb,
  NBreadcrumbItem,
  NButton,
  NIcon,
  NLayout,
  NLayoutContent,
  NLayoutHeader,
  NLayoutSider,
  NMenu,
  NSpace,
  NText,
} from 'naive-ui'
import {
  AnalyticsOutline,
  BarChartOutline,
  BookmarkOutline,
  BusinessOutline,
  GitNetworkOutline,
  HomeOutline,
  PeopleOutline,
  PieChartOutline,
  SettingsOutline,
  ShieldCheckmarkOutline,
  TrailSignOutline,
} from '@vicons/ionicons5'

function renderIcon(icon: Component) {
  return () => h(NIcon, null, { default: () => h(icon) })
}

const collapsed = ref(false)
const route = useRoute()
const router = useRouter()

const menuOptions: MenuOption[] = [
  {
    label: '首页驾驶舱',
    key: '/dashboard',
    icon: renderIcon(HomeOutline),
  },
  {
    label: '数据资产管理',
    key: 'data-assets',
    icon: renderIcon(BusinessOutline),
    children: [
      { label: '数据目录', key: '/data-assets/catalog' },
      { label: '域管理', key: '/data-assets/domain' },
      { label: '血缘管理', key: '/data-assets/lineage' },
      { label: '数据质量', key: '/data-assets/quality' },
      { label: '数据字典', key: '/data-assets/dictionary' },
      { label: '数据产品', key: '/data-assets/products' },
    ],
  },
  {
    label: '可视化分析',
    key: 'analysis-center',
    icon: renderIcon(BookmarkOutline),
    children: [
      { label: '数据可视化', key: '/analysis-center/visual-query' },
      { label: '保存分析', key: '/analysis-center/saved-analyses' },
      { label: '仪表盘', key: '/analysis-center/dashboards' },
      { label: '数字大屏', key: '/analysis-center/big-screens' },
      { label: 'SQL 查询', key: '/analysis-center/sql-query' },
      { label: '业务归因分析', key: '/analysis-center/business-attribution' },
      { label: '最近访问', key: '/analysis-center/recent' },
      { label: '收藏夹', key: '/analysis-center/favorites' },
      { label: '回收站', key: '/analysis-center/recycle-bin' },
    ],
  },
  {
    label: '元数据管理',
    key: 'metadata',
    icon: renderIcon(GitNetworkOutline),
    children: [
      { label: '数据集', key: '/metadata/datasets' },
      { label: '指标管理', key: '/metadata/metrics' },
      { label: '维度管理', key: '/metadata/dimensions' },
      { label: '报表管理', key: '/metadata/reports' },
      { label: '可视化建模', key: '/metadata/visual-modeling' },
      {
        label: '行为数据管理',
        key: 'metadata-behavior-data',
        children: [
          {
            label: '数据接入',
            key: 'metadata-behavior-access',
            children: [
              { label: '接入概览', key: '/data-management/access/overview' },
              { label: '数据上报地址', key: '/data-management/access/report-url' },
              { label: '数据格式', key: '/data-management/access/schema' },
              { label: '可视化数据集成', key: '/data-management/access/visual-integration' },
            ],
          },
          {
            label: '元数据管理',
            key: 'metadata-behavior-metadata',
            children: [
              { label: '一般事件', key: '/data-management/metadata/events' },
              { label: '事件属性', key: '/data-management/metadata/event-properties' },
              { label: '用户属性', key: '/data-management/metadata/user-properties' },
              { label: '虚拟事件', key: '/data-management/metadata/virtual-events' },
              { label: '虚拟属性', key: '/data-management/metadata/virtual-properties' },
              { label: '圈选事件', key: '/data-management/metadata/visual-events' },
              { label: '被动和关系事件', key: '/data-management/metadata/passive-relation-events' },
              { label: '会话管理', key: '/data-management/metadata/session' },
              { label: '自定义 Session', key: '/data-management/metadata/custom-session' },
            ],
          },
          {
            label: '分类管理功能',
            key: 'metadata-behavior-efficiency',
            children: [
              { label: '事件分类', key: '/data-management/efficiency/event-categories' },
              { label: '维度字典', key: '/data-management/efficiency/dimension-dictionary' },
              { label: '埋点血缘', key: '/data-management/efficiency/lineage' },
            ],
          },
          {
            label: '埋点验证',
            key: 'metadata-behavior-tracking',
            children: [
              { label: '埋点实时验证', key: '/data-management/tracking/realtime-verify' },
              { label: '验证报告', key: '/data-management/tracking/reports' },
            ],
          },
          {
            label: '数据治理',
            key: 'metadata-behavior-governance',
            children: [
              { label: '数据治理看板', key: '/data-management/governance/dashboard' },
              { label: '数据入库明细', key: '/data-management/governance/ingestion-detail' },
              { label: '校验规则配置', key: '/data-management/governance/rules' },
              { label: '告警管理', key: '/data-management/governance/alerts' },
              { label: '成本治理分析', key: '/data-management/governance/cost' },
            ],
          },
        ],
      },
      { label: '数据连接', key: '/data-fusion/connections' },
      { label: 'ID 图谱构建', key: '/data-fusion/id-mapping' },
    ],
  },
  {
    label: '用户洞察',
    key: 'user-insight',
    icon: renderIcon(PeopleOutline),
    children: [
      { label: '标签管理', key: '/user-insight/tags' },
      { label: '标签订阅', key: '/user-insight/tag-subscriptions' },
      { label: '用户分群', key: '/user-insight/segments' },
      { label: '用户画像', key: '/user-insight/profiles' },
    ],
  },
  {
    label: '数据洞察',
    key: 'data-insight',
    icon: renderIcon(PieChartOutline),
    children: [
      { label: '事件分析', key: '/data-insight/event-analysis' },
      { label: '漏斗分析', key: '/data-insight/funnel' },
      { label: '留存分析', key: '/data-insight/retention' },
      { label: '用户路径', key: '/data-insight/user-path' },
      { label: '热力图分析', key: '/data-insight/heatmap' },
      { label: '分布分析', key: '/data-insight/distribution' },
      { label: '归因分析', key: '/data-insight/attribution' },
      { label: 'LTV 分析', key: '/data-insight/ltv' },
    ],
  },
  {
    label: '智能运营',
    key: 'intelligent-operation',
    icon: renderIcon(TrailSignOutline),
    children: [
      { label: '运营概览', key: '/intelligent-operation/overview' },
      { label: '人群圈选', key: '/intelligent-operation/audience' },
      { label: '策略中心', key: '/intelligent-operation/strategies' },
      { label: '运营任务', key: '/intelligent-operation/campaigns' },
      { label: '触达中心', key: '/intelligent-operation/channels' },
      { label: '效果评估', key: '/intelligent-operation/evaluation' },
    ],
  },
  {
    label: 'A/B 测试',
    key: 'ab-testing',
    icon: renderIcon(AnalyticsOutline),
    children: [
      { label: '实验概览', key: '/ab-testing/overview' },
      { label: '实验列表', key: '/ab-testing/experiments' },
      { label: '实验创建', key: '/ab-testing/create' },
      { label: '实验结果', key: '/ab-testing/results' },
    ],
  },
  {
    label: '监控中心',
    key: 'monitoring',
    icon: renderIcon(BarChartOutline),
    children: [
      { label: '监控面板', key: '/monitoring/dashboard' },
      { label: '数据摄取监控', key: '/monitoring/ingestion' },
      { label: '指标监控', key: '/monitoring/metrics' },
      { label: '告警配置', key: '/monitoring/alerts' },
      { label: '日志浏览器', key: '/monitoring/logs' },
    ],
  },
  {
    label: '工作流审批',
    key: 'workflow',
    icon: renderIcon(ShieldCheckmarkOutline),
    children: [
      { label: '待办审批', key: '/workflow/todos' },
      { label: '审批流配置', key: '/workflow/config' },
    ],
  },
  {
    label: '系统管理',
    key: 'system',
    icon: renderIcon(SettingsOutline),
    children: [
      { label: '用户管理', key: '/system/users' },
      { label: '角色管理', key: '/system/roles' },
      { label: '权限管理', key: '/system/permissions' },
      { label: '数据隐私', key: '/system/privacy' },
    ],
  },
]

const selectedKeys = computed(() => [route.path])
const inlineReportMode = computed(() => route.path.includes('/business-attribution/reports/') && String(route.query.Inline ?? route.query.inline) === 'true')

const breadcrumbItems = computed(() => {
  const matched = route.matched.filter((item) => item.meta?.title)
  return matched.map((item) => String(item.meta.title))
})

function handleMenuSelect(key: string) {
  if (key.startsWith('/')) {
    router.push(key)
  }
}
</script>

<template>
  <n-layout has-sider class="main-layout">
    <n-layout-sider
      v-if="!inlineReportMode"
      bordered
      collapse-mode="width"
      :collapsed-width="64"
      :width="248"
      :collapsed="collapsed"
      show-trigger
      @collapse="collapsed = true"
      @expand="collapsed = false"
    >
      <div class="logo-area">
        <div class="logo-mark">D</div>
        <div v-if="!collapsed" class="logo-text">
          <div class="logo-title">DataOps Demo</div>
          <div class="logo-subtitle">智能数据运营平台</div>
        </div>
      </div>

      <n-menu
        :collapsed="collapsed"
        :collapsed-width="64"
        :collapsed-icon-size="20"
        :options="menuOptions"
        :value="selectedKeys[0]"
        @update:value="handleMenuSelect"
      />
    </n-layout-sider>

    <n-layout>
      <n-layout-header v-if="!inlineReportMode" bordered class="layout-header">
        <div>
          <n-breadcrumb>
            <n-breadcrumb-item v-for="item in breadcrumbItems" :key="item">
              {{ item }}
            </n-breadcrumb-item>
          </n-breadcrumb>
        </div>

        <n-space align="center">
          <n-button secondary size="small">演示模式</n-button>
          <n-avatar round size="small">X</n-avatar>
          <n-text>Chaoyang Xu</n-text>
        </n-space>
      </n-layout-header>

      <n-layout-content class="layout-content">
        <router-view />
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<style scoped lang="scss">
.main-layout {
  height: 100vh;
}

.logo-area {
  height: 64px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 18px;
}

.logo-mark {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: #2563eb;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
}

.logo-title {
  font-size: 16px;
  font-weight: 700;
}

.logo-subtitle {
  margin-top: 2px;
  font-size: 12px;
  color: #6b7280;
}

.layout-header {
  height: 56px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: white;
}

.layout-content {
  height: calc(100vh - 56px);
  overflow: auto;
  background: #f5f7fb;
}
</style>
