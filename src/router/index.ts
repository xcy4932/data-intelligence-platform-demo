import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import EventAnalysisView from '@/views/data-insight/EventAnalysisView.vue'
import AttributionAnalysisView from '@/views/data-insight/AttributionAnalysisView.vue'
import DistributionAnalysisView from '@/views/data-insight/DistributionAnalysisView.vue'
import FunnelAnalysisView from '@/views/data-insight/FunnelAnalysisView.vue'
import HeatmapAnalysisView from '@/views/data-insight/HeatmapAnalysisView.vue'
import LtvAnalysisView from '@/views/data-insight/LtvAnalysisView.vue'
import RetentionAnalysisView from '@/views/data-insight/RetentionAnalysisView.vue'
import UserPathAnalysisView from '@/views/data-insight/UserPathAnalysisView.vue'
import DashboardView from '@/views/dashboard/DashboardView.vue'
import AssetCollectionView from '@/views/analysis-center/AssetCollectionView.vue'
import DashboardDetailView from '@/views/analysis-center/DashboardDetailView.vue'
import DashboardListView from '@/views/analysis-center/DashboardListView.vue'
import SavedAnalysisListView from '@/views/analysis-center/SavedAnalysisListView.vue'
import DataConnectionsView from '@/views/metadata/DataConnectionsView.vue'
import DatasetDetailView from '@/views/metadata/DatasetDetailView.vue'
import DatasetListView from '@/views/metadata/DatasetListView.vue'
import DatasetsView from '@/views/metadata/DatasetsView.vue'
import IdMappingView from '@/views/metadata/IdMappingView.vue'
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
          path: 'metadata/datasets',
          component: DatasetListView,
          meta: { title: '数据集', module: '元数据管理' },
        },
        {
          path: 'metadata/datasets/create',
          component: DatasetsView,
          meta: { title: '创建数据集', module: '元数据管理' },
        },
        {
          path: 'metadata/datasets/:datasetId',
          component: DatasetDetailView,
          meta: { title: '数据集详情', module: '元数据管理' },
        },
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
          path: 'metadata/reports',
          component: PlaceholderPage,
          meta: { title: '报表管理', module: '元数据管理' },
        },
        {
          path: 'data-fusion/connections',
          component: DataConnectionsView,
          meta: { title: '数据连接', module: '元数据管理', connectionMode: 'list' },
        },
        {
          path: 'data-fusion/connections/new',
          component: DataConnectionsView,
          meta: { title: '新建数据连接', module: '元数据管理', connectionMode: 'select' },
        },
        {
          path: 'data-fusion/connections/new/:connectorType',
          component: DataConnectionsView,
          meta: { title: '配置数据连接', module: '元数据管理', connectionMode: 'create' },
        },
        {
          path: 'data-fusion/connections/:connectionId/edit',
          component: DataConnectionsView,
          meta: { title: '编辑数据连接', module: '元数据管理', connectionMode: 'edit' },
        },
        {
          path: 'data-fusion/connections/:connectionId/ingestion',
          component: DataConnectionsView,
          meta: { title: '接入任务', module: '元数据管理', connectionMode: 'detail', activeTab: 'assets' },
        },
        {
          path: 'data-fusion/connections/:connectionId/runs',
          component: DataConnectionsView,
          meta: { title: '运行记录', module: '元数据管理', connectionMode: 'detail', activeTab: 'runs' },
        },
        {
          path: 'data-fusion/connections/:connectionId/assets',
          component: DataConnectionsView,
          meta: { title: '连接产物', module: '元数据管理', connectionMode: 'detail', activeTab: 'assets' },
        },
        {
          path: 'data-fusion/connections/:connectionId/lineage',
          component: DataConnectionsView,
          meta: { title: '数据连接血缘', module: '元数据管理', connectionMode: 'detail', activeTab: 'lineage' },
        },
        {
          path: 'data-fusion/connections/:connectionId',
          component: DataConnectionsView,
          meta: { title: '数据连接详情', module: '元数据管理', connectionMode: 'detail' },
        },
        {
          path: 'data-fusion/id-mapping',
          component: IdMappingView,
          meta: { title: 'ID 图谱构建', module: '元数据管理', idmTab: 'home' },
        },
        {
          path: 'data-fusion/id-mapping/subjects',
          component: IdMappingView,
          meta: { title: '主体管理', module: '元数据管理', idmTab: 'home' },
        },
        {
          path: 'data-fusion/id-mapping/subjects/:subjectId/oneid',
          component: IdMappingView,
          meta: { title: 'OneID 探查', module: '元数据管理', idmTab: 'explore' },
        },
        {
          path: 'data-fusion/id-mapping/subjects/:subjectId/ids',
          component: IdMappingView,
          meta: { title: 'ID 类型配置', module: '元数据管理', idmTab: 'ids' },
        },
        {
          path: 'data-fusion/id-mapping/subjects/:subjectId/relations',
          component: IdMappingView,
          meta: { title: '参考关系配置', module: '元数据管理', idmTab: 'relations' },
        },
        {
          path: 'data-fusion/id-mapping/subjects/:subjectId/graph',
          component: IdMappingView,
          meta: { title: 'OneID 图谱', module: '元数据管理', idmTab: 'graph' },
        },
        {
          path: 'data-fusion/id-mapping/cross-subject-relations',
          component: IdMappingView,
          meta: { title: '多主体关系', module: '元数据管理', idmTab: 'cross' },
        },
        {
          path: 'data-fusion/id-mapping/tasks',
          component: IdMappingView,
          meta: { title: 'ID-Mapping 任务', module: '元数据管理', idmTab: 'tasks' },
        },
        {
          path: 'data-fusion/id-mapping/lineage',
          component: IdMappingView,
          meta: { title: 'ID 血缘管理', module: '元数据管理', idmTab: 'lineage' },
        },
        {
          path: 'data-fusion/id-mapping/explore',
          component: IdMappingView,
          meta: { title: 'ID 数据探查', module: '元数据管理', idmTab: 'explore' },
        },
        {
          path: 'data-fusion/id-mapping/settings',
          component: IdMappingView,
          meta: { title: 'ID-Mapping 高级配置', module: '元数据管理', idmTab: 'settings' },
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
          path: 'data-insight/user-path',
          component: UserPathAnalysisView,
          meta: { title: '用户路径', module: '数据洞察' },
        },
        {
          path: 'data-insight/heatmap',
          component: HeatmapAnalysisView,
          meta: { title: '热力图分析', module: '数据洞察' },
        },
        {
          path: 'data-insight/distribution',
          component: DistributionAnalysisView,
          meta: { title: '分布分析', module: '数据洞察' },
        },
        {
          path: 'data-insight/attribution',
          component: AttributionAnalysisView,
          meta: { title: '归因分析', module: '数据洞察' },
        },
        {
          path: 'data-insight/ltv',
          component: LtvAnalysisView,
          meta: { title: 'LTV 分析', module: '数据洞察' },
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
