import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import EventAnalysisView from '@/views/data-insight/EventAnalysisView.vue'
import FunnelAnalysisView from '@/views/data-insight/FunnelAnalysisView.vue'
import RetentionAnalysisView from '@/views/data-insight/RetentionAnalysisView.vue'
import DashboardView from '@/views/dashboard/DashboardView.vue'
import AssetCollectionView from '@/views/analysis-center/AssetCollectionView.vue'
import DashboardDetailView from '@/views/analysis-center/DashboardDetailView.vue'
import DashboardListView from '@/views/analysis-center/DashboardListView.vue'
import SavedAnalysisListView from '@/views/analysis-center/SavedAnalysisListView.vue'
import PlaceholderPage from '@/views/PlaceholderPage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: MainLayout,
      redirect: '/dashboard',
      meta: { title: '数据智能运营平台' },
      children: [
        {
          path: 'dashboard',
          component: DashboardView,
          meta: { title: '首页驾驶舱', module: '首页' },
        },

        // 分析中心
        {
          path: 'analysis-center/saved-analyses',
          component: SavedAnalysisListView,
          meta: { title: '保存分析', module: '分析中心' },
        },
        {
          path: 'analysis-center/dashboards',
          component: DashboardListView,
          meta: { title: '数据看板', module: '分析中心' },
        },
        {
          path: 'analysis-center/dashboards/:dashboardId',
          component: DashboardDetailView,
          meta: { title: '看板详情', module: '分析中心' },
        },
        {
          path: 'analysis-center/recent',
          component: AssetCollectionView,
          meta: { title: '最近访问', module: '分析中心' },
        },
        {
          path: 'analysis-center/favorites',
          component: AssetCollectionView,
          meta: { title: '收藏夹', module: '分析中心' },
        },
        {
          path: 'analysis-center/recycle-bin',
          component: AssetCollectionView,
          meta: { title: '回收站', module: '分析中心' },
        },

        // 数据资产管理
        {
          path: 'data-assets/catalog',
          component: PlaceholderPage,
          meta: { title: '数据目录', module: '数据资产管理' },
        },
        {
          path: 'data-assets/domain',
          component: PlaceholderPage,
          meta: { title: '域管理', module: '数据资产管理' },
        },
        {
          path: 'data-assets/lineage',
          component: PlaceholderPage,
          meta: { title: '血缘管理', module: '数据资产管理' },
        },
        {
          path: 'data-assets/quality',
          component: PlaceholderPage,
          meta: { title: '数据质量', module: '数据资产管理' },
        },
        {
          path: 'data-assets/dictionary',
          component: PlaceholderPage,
          meta: { title: '数据字典', module: '数据资产管理' },
        },
        {
          path: 'data-assets/products',
          component: PlaceholderPage,
          meta: { title: '数据产品', module: '数据资产管理' },
        },

        // 元数据管理
        {
          path: 'metadata/metrics',
          component: PlaceholderPage,
          meta: { title: '指标管理', module: '元数据管理' },
        },
        {
          path: 'metadata/dimensions',
          component: PlaceholderPage,
          meta: { title: '维度管理', module: '元数据管理' },
        },
        {
          path: 'metadata/data-sources',
          component: PlaceholderPage,
          meta: { title: '数据源管理', module: '元数据管理' },
        },
        {
          path: 'metadata/reports',
          component: PlaceholderPage,
          meta: { title: '报表管理', module: '元数据管理' },
        },

        // 用户洞察
        {
          path: 'user-insight/tags',
          component: PlaceholderPage,
          meta: { title: '标签管理', module: '用户洞察' },
        },
        {
          path: 'user-insight/tag-subscriptions',
          component: PlaceholderPage,
          meta: { title: '标签订阅', module: '用户洞察' },
        },
        {
          path: 'user-insight/segments',
          component: PlaceholderPage,
          meta: { title: '用户分群', module: '用户洞察' },
        },
        {
          path: 'user-insight/profiles',
          component: PlaceholderPage,
          meta: { title: '用户画像', module: '用户洞察' },
        },

        // 数据洞察
        {
          path: 'data-insight/metric-analysis',
          redirect: '/data-insight/event-analysis',
        },
        {
          path: 'data-insight/event-analysis',
          component: EventAnalysisView,
          meta: { title: '事件分析', module: '数据洞察' },
        },
        {
          path: 'data-insight/funnel',
          component: FunnelAnalysisView,
          meta: { title: '漏斗分析', module: '数据洞察' },
        },
        {
          path: 'data-insight/retention',
          component: RetentionAnalysisView,
          meta: { title: '留存分析', module: '数据洞察' },
        },
        {
          path: 'data-insight/attribution',
          component: PlaceholderPage,
          meta: { title: '归因分析', module: '数据洞察' },
        },
        {
          path: 'data-insight/ltv',
          component: PlaceholderPage,
          meta: { title: 'LTV 分析', module: '数据洞察' },
        },
        {
          path: 'data-insight/prediction',
          component: PlaceholderPage,
          meta: { title: '数据预测', module: '数据洞察' },
        },

        // 智能运营
        {
          path: 'intelligent-operation/overview',
          component: PlaceholderPage,
          meta: { title: '运营概览', module: '智能运营' },
        },
        {
          path: 'intelligent-operation/audience',
          component: PlaceholderPage,
          meta: { title: '人群圈选', module: '智能运营' },
        },
        {
          path: 'intelligent-operation/strategies',
          component: PlaceholderPage,
          meta: { title: '策略中心', module: '智能运营' },
        },
        {
          path: 'intelligent-operation/campaigns',
          component: PlaceholderPage,
          meta: { title: '运营任务', module: '智能运营' },
        },
        {
          path: 'intelligent-operation/channels',
          component: PlaceholderPage,
          meta: { title: '触达中心', module: '智能运营' },
        },
        {
          path: 'intelligent-operation/evaluation',
          component: PlaceholderPage,
          meta: { title: '效果评估', module: '智能运营' },
        },

        // A/B 测试
        {
          path: 'ab-testing/overview',
          component: PlaceholderPage,
          meta: { title: '实验概览', module: 'A/B 测试' },
        },
        {
          path: 'ab-testing/experiments',
          component: PlaceholderPage,
          meta: { title: '实验列表', module: 'A/B 测试' },
        },
        {
          path: 'ab-testing/create',
          component: PlaceholderPage,
          meta: { title: '实验创建', module: 'A/B 测试' },
        },
        {
          path: 'ab-testing/results',
          component: PlaceholderPage,
          meta: { title: '实验结果', module: 'A/B 测试' },
        },

        // 监控中心
        {
          path: 'monitoring/dashboard',
          component: PlaceholderPage,
          meta: { title: '监控面板', module: '监控中心' },
        },
        {
          path: 'monitoring/ingestion',
          component: PlaceholderPage,
          meta: { title: '数据摄取监控', module: '监控中心' },
        },
        {
          path: 'monitoring/metrics',
          component: PlaceholderPage,
          meta: { title: '指标监控', module: '监控中心' },
        },
        {
          path: 'monitoring/alerts',
          component: PlaceholderPage,
          meta: { title: '告警配置', module: '监控中心' },
        },
        {
          path: 'monitoring/logs',
          component: PlaceholderPage,
          meta: { title: '日志浏览器', module: '监控中心' },
        },

        // 工作流审批
        {
          path: 'workflow/todos',
          component: PlaceholderPage,
          meta: { title: '待办审批', module: '工作流审批' },
        },
        {
          path: 'workflow/config',
          component: PlaceholderPage,
          meta: { title: '审批流配置', module: '工作流审批' },
        },

        // 系统管理
        {
          path: 'system/users',
          component: PlaceholderPage,
          meta: { title: '用户管理', module: '系统管理' },
        },
        {
          path: 'system/roles',
          component: PlaceholderPage,
          meta: { title: '角色管理', module: '系统管理' },
        },
        {
          path: 'system/permissions',
          component: PlaceholderPage,
          meta: { title: '权限管理', module: '系统管理' },
        },
        {
          path: 'system/privacy',
          component: PlaceholderPage,
          meta: { title: '数据隐私', module: '系统管理' },
        },
      ],
    },
  ],
})

export default router
