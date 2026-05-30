<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
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
  useMessage,
} from 'naive-ui'
import {
  AnalyticsOutline,
  BookmarkOutline,
  GitNetworkOutline,
  HomeOutline,
  PeopleOutline,
  PieChartOutline,
  TrailSignOutline,
} from '@vicons/ionicons5'
import { adAnalysisService } from '@/services/adAnalysisService'
import { organizationIdentityService } from '@/services/organizationIdentityService'
import { groupProfilePermissionSet } from '@/mock/groupProfileInsight'
import { multiDimPermissionSet } from '@/mock/multidimensionalFeatureAnalysis'
import { profilePermissionSet } from '@/mock/profiles'
import { segmentPermissionSet } from '@/mock/segments'
import type { AdAccessDecision } from '@/types/adAnalysis'
import type { IdentityAccessContext } from '@/types/organizationIdentity'
import {
  applyOrganizationIdentityAccessOptions,
  getCurrentOrganizationIdentityAccessOptions,
  getOrganizationIdentityServiceAccessOptions,
  getVisibleOrganizationIdentityMenuItems,
} from '@/utils/organizationIdentityPermissions'

function renderIcon(icon: Component) {
  return () => h(NIcon, null, { default: () => h(icon) })
}

const collapsed = ref(false)
const route = useRoute()
const router = useRouter()
const message = useMessage()
const adAccessLoaded = ref(false)
const adAccessDecision = ref<AdAccessDecision | null>(null)
const organizationIdentityAccessContext = ref<IdentityAccessContext | null>(null)

onMounted(async () => {
  try {
    await adAnalysisService.getAccessContext()
    adAccessDecision.value = await adAnalysisService.getAccessDecision()
  } catch {
    adAccessDecision.value = {
      available: false,
      reasons: ['no_permission'],
      message: '广告投放分析入口暂不可用。',
    }
    message.warning('广告投放分析入口暂不可用。')
  } finally {
    adAccessLoaded.value = true
  }
})

onMounted(async () => {
  const accessOptions = getCurrentOrganizationIdentityAccessOptions()
  const result = await organizationIdentityService.getIdentityAccessContext(
    getOrganizationIdentityServiceAccessOptions(accessOptions),
  )

  if (result.success) {
    organizationIdentityAccessContext.value = applyOrganizationIdentityAccessOptions(result.data, accessOptions)
    return
  }

  message.warning(result.error.message)
})

const adAnalysisMenuEntries = computed<MenuOption[]>(() => {
  if (!adAccessLoaded.value || !adAccessDecision.value) return []
  if (
    adAccessDecision.value.reasons.includes('no_permission') ||
    adAccessDecision.value.reasons.includes('version_closed')
  ) {
    return []
  }
  if (!adAccessDecision.value.available) {
    return [
      {
        label: `广告投放分析（${adAccessDecision.value.message ?? '未开通'}）`,
        key: '/data-insight/ad-analysis',
        disabled: true,
      },
    ]
  }
  return [{ label: '广告投放分析', key: '/data-insight/ad-analysis' }]
})

const organizationIdentityMenuEntries = computed<MenuOption[]>(() => {
  if (!organizationIdentityAccessContext.value) {
    return []
  }

  return getVisibleOrganizationIdentityMenuItems(organizationIdentityAccessContext.value).map((item) => ({
    label: item.label,
    key: item.path,
  }))
})

const organizationIdentityMenu = computed<MenuOption | null>(() => {
  if (!organizationIdentityMenuEntries.value.length) {
    return null
  }

  return {
    label: '组织与身份中心',
    key: 'organization-identity',
    icon: renderIcon(PeopleOutline),
    children: organizationIdentityMenuEntries.value,
  }
})

const menuOptions = computed<MenuOption[]>(() => [
  {
    label: '首页驾驶舱',
    key: '/dashboard',
    icon: renderIcon(HomeOutline),
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
  ...(organizationIdentityMenu.value ? [organizationIdentityMenu.value] : []),
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
      { label: '生命周期分析', key: '/user-insight/lifecycle-analysis' },
      ...(segmentPermissionSet.viewSegment ? [{ label: '用户分群', key: '/user-insight/segments' }] : []),
      ...(profilePermissionSet.viewProfile
        ? [
            {
              label: '用户画像',
              key: 'user-profile',
              children: [
                { label: '个体画像', key: '/user-insight/profiles' },
                ...(groupProfilePermissionSet.viewReport ? [{ label: '私域群体画像', key: '/user-insight/group-profiles' }] : []),
                ...(multiDimPermissionSet.viewReport ? [{ label: '多维特征分析', key: '/user-insight/multidim-features' }] : []),
                ...(profilePermissionSet.projectConfig ? [{ label: '个体画像配置', key: '/user-insight/profile-config' }] : []),
              ],
            },
          ]
        : []),
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
      ...adAnalysisMenuEntries.value,
      { label: 'LTV 分析', key: '/data-insight/ltv' },
    ],
  },
  {
    label: '智能运营',
    key: '/intelligent-operation/overview',
    icon: renderIcon(TrailSignOutline),
  },
  {
    label: 'A/B 测试',
    key: 'ab-testing',
    icon: renderIcon(AnalyticsOutline),
    children: [
      { label: '实验列表', key: '/ab-testing/experiments' },
      { label: '指标管理', key: '/ab-testing/metrics' },
      { label: '配置管理', key: '/ab-testing/features' },
      { label: '流量管理', key: '/ab-testing/traffic' },
      { label: '实验工具箱', key: '/ab-testing/tools' },
      { label: '实验看板', key: '/ab-testing/boards' },
    ],
  },
])

const selectedKeys = computed(() => {
  if (
    route.path === '/ab-testing' ||
    route.path === '/ab-testing/overview' ||
    route.path === '/ab-testing/create' ||
    route.path === '/ab-testing/reports' ||
    route.path.startsWith('/ab-testing/experiments')
  ) {
    return ['/ab-testing/experiments']
  }
  if (route.path.startsWith('/intelligent-operation')) {
    return ['/intelligent-operation/overview']
  }
  return [route.path]
})
const defaultExpandedMenuKeys = computed(() => (route.path.startsWith('/organization-identity') ? ['organization-identity'] : []))
const inlineReportMode = computed(() => route.path.includes('/business-attribution/reports/') && String(route.query.Inline ?? route.query.inline) === 'true')

const breadcrumbItems = computed(() => {
  const breadcrumb = route.meta.breadcrumb
  if (Array.isArray(breadcrumb) && breadcrumb.length) {
    return breadcrumb.map(String)
  }

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
        :default-expanded-keys="defaultExpandedMenuKeys"
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
