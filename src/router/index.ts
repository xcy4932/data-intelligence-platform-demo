import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import EventAnalysisView from '@/views/data-insight/EventAnalysisView.vue'
import AttributionAnalysisView from '@/views/data-insight/AttributionAnalysisView.vue'
import AdAnalysisView from '@/views/data-insight/AdAnalysisView.vue'
import DistributionAnalysisView from '@/views/data-insight/DistributionAnalysisView.vue'
import FunnelAnalysisView from '@/views/data-insight/FunnelAnalysisView.vue'
import HeatmapAnalysisView from '@/views/data-insight/HeatmapAnalysisView.vue'
import LtvAnalysisView from '@/views/data-insight/LtvAnalysisView.vue'
import RetentionAnalysisView from '@/views/data-insight/RetentionAnalysisView.vue'
import UserPathAnalysisView from '@/views/data-insight/UserPathAnalysisView.vue'
import AbTestingWorkbenchView from '@/views/ab-testing/AbTestingWorkbenchView.vue'
import DashboardView from '@/views/dashboard/DashboardView.vue'
import AssetCollectionView from '@/views/analysis-center/AssetCollectionView.vue'
import DashboardDetailView from '@/views/analysis-center/DashboardDetailView.vue'
import DashboardListView from '@/views/analysis-center/DashboardListView.vue'
import BusinessAttributionConfigView from '@/views/analysis-center/BusinessAttributionConfigView.vue'
import BusinessAttributionHomeView from '@/views/analysis-center/BusinessAttributionHomeView.vue'
import BusinessAttributionReportView from '@/views/analysis-center/BusinessAttributionReportView.vue'
import BusinessAttributionSubscriptionsView from '@/views/analysis-center/BusinessAttributionSubscriptionsView.vue'
import BusinessAttributionWebhooksView from '@/views/analysis-center/BusinessAttributionWebhooksView.vue'
import BigScreenEditorView from '@/views/analysis-center/BigScreenEditorView.vue'
import BigScreenListView from '@/views/analysis-center/BigScreenListView.vue'
import BigScreenPresentationHallView from '@/views/analysis-center/BigScreenPresentationHallView.vue'
import BigScreenPresentationPlayerView from '@/views/analysis-center/BigScreenPresentationPlayerView.vue'
import BigScreenPreviewView from '@/views/analysis-center/BigScreenPreviewView.vue'
import BigScreenPublishedView from '@/views/analysis-center/BigScreenPublishedView.vue'
import BigScreenResourceManagementView from '@/views/analysis-center/BigScreenResourceManagementView.vue'
import SqlQueryWorkbenchPage from '@/views/analysis-center/SqlQueryWorkbenchPage.vue'
import SqlVisualQueryPage from '@/views/analysis-center/SqlVisualQueryPage.vue'
import VisualQueryPage from '@/views/analysis-center/VisualQueryPage.vue'
import SavedAnalysisListView from '@/views/analysis-center/SavedAnalysisListView.vue'
import DataConnectionsView from '@/views/metadata/DataConnectionsView.vue'
import DatasetDetailView from '@/views/metadata/DatasetDetailView.vue'
import DatasetListView from '@/views/metadata/DatasetListView.vue'
import DatasetsView from '@/views/metadata/DatasetsView.vue'
import IdMappingView from '@/views/metadata/IdMappingView.vue'
import VisualModelingDetailPage from '@/views/metadata/VisualModelingDetailPage.vue'
import VisualModelingEditorPage from '@/views/metadata/VisualModelingEditorPage.vue'
import VisualModelingMigrationPage from '@/views/metadata/VisualModelingMigrationPage.vue'
import VisualModelingRecycleBinPage from '@/views/metadata/VisualModelingRecycleBinPage.vue'
import VisualModelingTaskListPage from '@/views/metadata/VisualModelingTaskListPage.vue'
import UserBehaviorDataManagementView from '@/views/metadata/UserBehaviorDataManagementView.vue'
import IndividualProfileView from '@/views/user-insight/IndividualProfileView.vue'
import GroupProfileInsightView from '@/views/user-insight/GroupProfileInsightView.vue'
import MultidimensionalFeatureAnalysisView from '@/views/user-insight/MultidimensionalFeatureAnalysisView.vue'
import LifecycleAnalysisView from '@/views/user-insight/LifecycleAnalysisView.vue'
import TagSystemView from '@/views/user-insight/TagSystemView.vue'
import UserSegmentView from '@/views/user-insight/UserSegmentView.vue'
import PlaceholderPage from '@/views/PlaceholderPage.vue'
import { adAnalysisService } from '@/services/adAnalysisService'
import { profilePermissionSet } from '@/mock/profiles'

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

        // 可视化分析
        {
          path: 'analysis-center/visual-query',
          component: VisualQueryPage,
          meta: { title: '数据可视化', module: '可视化分析' },
        },
        {
          path: 'analysis-center/saved-analyses',
          component: SavedAnalysisListView,
          meta: { title: '保存分析', module: '可视化分析' },
        },
        {
          path: 'analysis-center/dashboards',
          component: DashboardListView,
          meta: { title: '仪表盘', module: '可视化分析' },
        },
        {
          path: 'analysis-center/big-screens',
          component: BigScreenListView,
          meta: { title: '数字大屏', module: '可视化分析' },
        },
        {
          path: 'analysis-center/big-screens/resources',
          component: BigScreenResourceManagementView,
          meta: { title: '数字大屏资源管理', module: '可视化分析' },
        },
        {
          path: 'analysis-center/big-screens/presentation-hall',
          component: BigScreenPresentationHallView,
          meta: { title: '数字大屏演播厅', module: '可视化分析' },
        },
        {
          path: 'analysis-center/big-screens/:screenId/edit',
          component: BigScreenEditorView,
          meta: { title: '数字大屏编辑器', module: '可视化分析' },
        },
        {
          path: 'analysis-center/sql-query',
          component: SqlQueryWorkbenchPage,
          meta: { title: 'SQL 查询', module: '可视化分析' },
        },
        {
          path: 'analysis-center/business-attribution',
          component: BusinessAttributionHomeView,
          meta: { title: '业务归因分析', module: '可视化分析' },
        },
        {
          path: 'analysis-center/business-attribution/config/:configId/edit',
          component: BusinessAttributionConfigView,
          meta: { title: '业务归因配置', module: '可视化分析' },
        },
        {
          path: 'analysis-center/business-attribution/reports/:configId',
          component: BusinessAttributionReportView,
          meta: { title: '业务归因报告', module: '可视化分析' },
        },
        {
          path: 'analysis-center/business-attribution/subscriptions',
          component: BusinessAttributionSubscriptionsView,
          meta: { title: '归因订阅管理', module: '可视化分析' },
        },
        {
          path: 'analysis-center/business-attribution/webhooks',
          component: BusinessAttributionWebhooksView,
          meta: { title: '归因 WebHook 配置', module: '可视化分析' },
        },
        {
          path: 'insight/attribution',
          redirect: '/analysis-center/business-attribution',
        },
        {
          path: 'insight/attribution/config/:configId/edit',
          component: BusinessAttributionConfigView,
          meta: { title: '业务归因配置', module: '可视化分析' },
        },
        {
          path: 'insight/attribution/report/:configId',
          component: BusinessAttributionReportView,
          meta: { title: '业务归因报告', module: '可视化分析' },
        },
        {
          path: 'insight/attribution/subscriptions',
          component: BusinessAttributionSubscriptionsView,
          meta: { title: '归因订阅管理', module: '可视化分析' },
        },
        {
          path: 'visual-query/create',
          component: SqlVisualQueryPage,
          meta: { title: '可视化查询', module: '可视化分析' },
        },
        {
          path: 'analysis-center/dashboards/:dashboardId',
          component: DashboardDetailView,
          meta: { title: '仪表盘详情', module: '可视化分析' },
        },
        {
          path: 'analysis-center/recent',
          component: AssetCollectionView,
          meta: { title: '最近访问', module: '可视化分析' },
        },
        {
          path: 'analysis-center/favorites',
          component: AssetCollectionView,
          meta: { title: '收藏夹', module: '可视化分析' },
        },
        {
          path: 'analysis-center/recycle-bin',
          component: AssetCollectionView,
          meta: { title: '回收站', module: '可视化分析' },
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
          path: 'metadata/visual-modeling',
          component: VisualModelingTaskListPage,
          meta: { title: '可视化建模', module: '元数据管理' },
        },
        {
          path: 'metadata/visual-modeling/recycle-bin',
          component: VisualModelingRecycleBinPage,
          meta: { title: '可视化建模回收站', module: '元数据管理' },
        },
        {
          path: 'metadata/visual-modeling/migration',
          component: VisualModelingMigrationPage,
          meta: { title: '可视化建模资源迁移', module: '元数据管理' },
        },
        {
          path: 'visual-modeling/tasks/:taskId/edit',
          component: VisualModelingEditorPage,
          meta: { title: '可视化建模编辑器', module: '元数据管理' },
        },
        {
          path: 'visual-modeling/tasks/:taskId/detail',
          component: VisualModelingDetailPage,
          meta: { title: '可视化建模详情', module: '元数据管理' },
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
        {
          path: 'data-management',
          redirect: '/data-management/access/overview',
        },
        {
          path: 'data-management/access/overview',
          component: UserBehaviorDataManagementView,
          meta: { title: '行为数据管理 - 接入概览', module: '元数据管理' },
        },
        {
          path: 'data-management/access/report-url',
          component: UserBehaviorDataManagementView,
          meta: { title: '行为数据管理 - 数据上报地址', module: '元数据管理' },
        },
        {
          path: 'data-management/access/schema',
          component: UserBehaviorDataManagementView,
          meta: { title: '行为数据管理 - 数据格式', module: '元数据管理' },
        },
        {
          path: 'data-management/access/visual-integration',
          component: UserBehaviorDataManagementView,
          meta: { title: '行为数据管理 - 可视化数据集成', module: '元数据管理' },
        },
        {
          path: 'data-management/metadata/events',
          component: UserBehaviorDataManagementView,
          meta: { title: '行为数据管理 - 一般事件', module: '元数据管理' },
        },
        {
          path: 'data-management/metadata/event-properties',
          component: UserBehaviorDataManagementView,
          meta: { title: '行为数据管理 - 事件属性', module: '元数据管理' },
        },
        {
          path: 'data-management/metadata/user-properties',
          component: UserBehaviorDataManagementView,
          meta: { title: '行为数据管理 - 用户属性', module: '元数据管理' },
        },
        {
          path: 'data-management/metadata/virtual-events',
          component: UserBehaviorDataManagementView,
          meta: { title: '行为数据管理 - 虚拟事件', module: '元数据管理' },
        },
        {
          path: 'data-management/metadata/virtual-properties',
          component: UserBehaviorDataManagementView,
          meta: { title: '行为数据管理 - 虚拟属性', module: '元数据管理' },
        },
        {
          path: 'data-management/metadata/visual-events',
          component: UserBehaviorDataManagementView,
          meta: { title: '行为数据管理 - 圈选事件', module: '元数据管理' },
        },
        {
          path: 'data-management/metadata/passive-relation-events',
          component: UserBehaviorDataManagementView,
          meta: { title: '行为数据管理 - 被动和关系事件', module: '元数据管理' },
        },
        {
          path: 'data-management/metadata/session',
          component: UserBehaviorDataManagementView,
          meta: { title: '行为数据管理 - 会话管理', module: '元数据管理' },
        },
        {
          path: 'data-management/metadata/custom-session',
          component: UserBehaviorDataManagementView,
          meta: { title: '行为数据管理 - 自定义 Session', module: '元数据管理' },
        },
        {
          path: 'data-management/efficiency/event-categories',
          component: UserBehaviorDataManagementView,
          meta: { title: '行为数据管理 - 事件分类', module: '元数据管理' },
        },
        {
          path: 'data-management/efficiency/dimension-dictionary',
          component: UserBehaviorDataManagementView,
          meta: { title: '行为数据管理 - 维度字典', module: '元数据管理' },
        },
        {
          path: 'data-management/efficiency/lineage',
          component: UserBehaviorDataManagementView,
          meta: { title: '行为数据管理 - 埋点血缘', module: '元数据管理' },
        },
        {
          path: 'data-management/tracking/realtime-verify',
          component: UserBehaviorDataManagementView,
          meta: { title: '行为数据管理 - 埋点实时验证', module: '元数据管理' },
        },
        {
          path: 'data-management/tracking/reports',
          component: UserBehaviorDataManagementView,
          meta: { title: '行为数据管理 - 验证报告', module: '元数据管理' },
        },
        {
          path: 'data-management/governance/dashboard',
          component: UserBehaviorDataManagementView,
          meta: { title: '行为数据管理 - 数据治理看板', module: '元数据管理' },
        },
        {
          path: 'data-management/governance/ingestion-detail',
          component: UserBehaviorDataManagementView,
          meta: { title: '行为数据管理 - 数据入库明细', module: '元数据管理' },
        },
        {
          path: 'data-management/governance/rules',
          component: UserBehaviorDataManagementView,
          meta: { title: '行为数据管理 - 校验规则配置', module: '元数据管理' },
        },
        {
          path: 'data-management/governance/alerts',
          component: UserBehaviorDataManagementView,
          meta: { title: '行为数据管理 - 告警管理', module: '元数据管理' },
        },
        {
          path: 'data-management/governance/cost',
          component: UserBehaviorDataManagementView,
          meta: { title: '行为数据管理 - 成本治理分析', module: '元数据管理' },
        },

        // 用户洞察
        {
          path: 'user-insight/tags',
          component: TagSystemView,
          meta: { title: '标签体系', module: '用户洞察', tagPage: 'home' },
        },
        {
          path: 'user-insight/tags/manage',
          redirect: '/user-insight/tags',
        },
        {
          path: 'user-insight/tags/templates',
          component: TagSystemView,
          meta: { title: '标签模板', module: '用户洞察', tagPage: 'templates' },
        },
        {
          path: 'user-insight/tags/metadata',
          component: TagSystemView,
          meta: { title: '标签元信息管理', module: '用户洞察', tagPage: 'metadata' },
        },
        {
          path: 'user-insight/tags/create/:tagType',
          component: TagSystemView,
          meta: { title: '新建标签', module: '用户洞察', tagPage: 'create' },
        },
        {
          path: 'user-insight/tags/:tagId/edit',
          component: TagSystemView,
          meta: { title: '编辑标签', module: '用户洞察', tagPage: 'edit' },
        },
        {
          path: 'user-insight/tags/:tagId',
          component: TagSystemView,
          meta: { title: '标签详情', module: '用户洞察', tagPage: 'detail' },
        },
        {
          path: 'user-insight/tag-subscriptions',
          component: PlaceholderPage,
          meta: { title: '标签订阅', module: '用户洞察' },
        },
        {
          path: 'user-insight/lifecycle-analysis',
          component: LifecycleAnalysisView,
          meta: { title: '生命周期分析', module: '用户洞察' },
        },
        {
          path: 'user-insight/lifecycle-analysis/:reportId',
          component: LifecycleAnalysisView,
          meta: { title: '生命周期分析详情', module: '用户洞察' },
        },
        {
          path: 'user-insight/segments',
          component: UserSegmentView,
          meta: { title: '用户分群', module: '用户洞察', segmentPage: 'home' },
        },
        {
          path: 'user-insight/segments/create/:method',
          component: UserSegmentView,
          meta: { title: '创建分群', module: '用户洞察', segmentPage: 'create' },
        },
        {
          path: 'user-insight/segments/conversion',
          component: UserSegmentView,
          meta: { title: '分群主体转换', module: '用户洞察', segmentPage: 'conversion' },
        },
        {
          path: 'user-insight/segments/groups',
          component: UserSegmentView,
          meta: { title: '分组管理', module: '用户洞察', segmentPage: 'groups' },
        },
        {
          path: 'user-insight/segments/:segmentId/edit',
          component: UserSegmentView,
          meta: { title: '编辑分群', module: '用户洞察', segmentPage: 'edit' },
        },
        {
          path: 'user-insight/segments/:segmentId/runs',
          component: UserSegmentView,
          meta: { title: '分群运行记录', module: '用户洞察', segmentPage: 'runs' },
        },
        {
          path: 'user-insight/segments/:segmentId/lineage',
          component: UserSegmentView,
          meta: { title: '分群数据血缘', module: '用户洞察', segmentPage: 'lineage' },
        },
        {
          path: 'user-insight/segments/:segmentId',
          component: UserSegmentView,
          meta: { title: '分群详情', module: '用户洞察', segmentPage: 'detail' },
        },
        {
          path: 'user-insight/profiles',
          component: IndividualProfileView,
          meta: { title: '个体画像', module: '用户洞察', profilePage: 'search' },
        },
        {
          path: 'user-insight/profile-config',
          component: IndividualProfileView,
          meta: { title: '个体画像配置', module: '用户洞察', profilePage: 'config' },
        },
        {
          path: 'user-insight/group-profiles',
          component: GroupProfileInsightView,
          meta: { title: '私域群体画像', module: '用户洞察', groupProfilePage: 'list' },
        },
        {
          path: 'user-insight/group-profiles/new',
          component: GroupProfileInsightView,
          meta: { title: '新建群体画像报告', module: '用户洞察', groupProfilePage: 'new' },
        },
        {
          path: 'user-insight/group-profiles/templates',
          component: GroupProfileInsightView,
          meta: { title: '群体画像模板管理', module: '用户洞察', groupProfilePage: 'templates' },
        },
        {
          path: 'user-insight/group-profiles/tgi',
          component: GroupProfileInsightView,
          meta: { title: '群体画像 TGI 配置', module: '用户洞察', groupProfilePage: 'tgi' },
        },
        {
          path: 'user-insight/group-profiles/:reportId/edit',
          component: GroupProfileInsightView,
          meta: { title: '编辑群体画像报告', module: '用户洞察', groupProfilePage: 'edit' },
        },
        {
          path: 'user-insight/group-profiles/:reportId/label-analysis',
          component: GroupProfileInsightView,
          meta: { title: '标签分析详情', module: '用户洞察', groupProfilePage: 'detail' },
        },
        {
          path: 'user-insight/group-profiles/:reportId/metric-analysis',
          component: GroupProfileInsightView,
          meta: { title: '指标分析详情', module: '用户洞察', groupProfilePage: 'detail' },
        },
        {
          path: 'user-insight/group-profiles/:reportId',
          component: GroupProfileInsightView,
          meta: { title: '群体画像报告详情', module: '用户洞察', groupProfilePage: 'detail' },
        },
        {
          path: 'user-insight/multidim-features',
          component: MultidimensionalFeatureAnalysisView,
          meta: { title: '多维特征分析', module: '用户洞察', multiDimPage: 'list' },
        },
        {
          path: 'user-insight/multidim-features/new',
          component: MultidimensionalFeatureAnalysisView,
          meta: { title: '新建多维特征分析报告', module: '用户洞察', multiDimPage: 'new' },
        },
        {
          path: 'user-insight/multidim-features/:reportId/edit',
          component: MultidimensionalFeatureAnalysisView,
          meta: { title: '编辑多维特征分析报告', module: '用户洞察', multiDimPage: 'edit' },
        },
        {
          path: 'user-insight/multidim-features/:reportId',
          component: MultidimensionalFeatureAnalysisView,
          meta: { title: '多维特征分析报告详情', module: '用户洞察', multiDimPage: 'detail' },
        },
        {
          path: 'user-insight/profiles/:subjectType/:baseId',
          component: IndividualProfileView,
          meta: { title: '个体画像详情', module: '用户洞察', profilePage: 'detail' },
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
          path: 'data-insight/ad-analysis',
          component: AdAnalysisView,
          meta: { title: '广告投放分析', module: '数据洞察' },
        },
        {
          path: 'data-insight/ad-analysis/templates',
          component: AdAnalysisView,
          meta: { title: '广告元数据模板', module: '数据洞察' },
        },
        {
          path: 'data-insight/ad-analysis/templates/new',
          component: AdAnalysisView,
          meta: { title: '新建广告元数据模板', module: '数据洞察' },
        },
        {
          path: 'data-insight/ad-analysis/reports/:reportId',
          component: AdAnalysisView,
          meta: { title: '广告投放分析报告', module: '数据洞察' },
        },
        {
          path: 'data-insight/ad-analysis/ad-report',
          component: AdAnalysisView,
          meta: { title: '广告投放报表', module: '数据洞察' },
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
          component: AbTestingWorkbenchView,
          meta: { title: '实验概览', module: 'A/B 测试', abPage: 'overview' },
        },
        {
          path: 'ab-testing/experiments',
          component: AbTestingWorkbenchView,
          meta: { title: '实验列表', module: 'A/B 测试', abPage: 'experiments' },
        },
        {
          path: 'ab-testing/create',
          component: AbTestingWorkbenchView,
          meta: { title: '实验创建', module: 'A/B 测试', abPage: 'create' },
        },
        {
          path: 'abtest/experiments/create/type',
          redirect: '/ab-testing/create',
        },
        {
          path: 'ab-testing/results',
          redirect: '/ab-testing/reports',
        },
        {
          path: 'ab-testing/reports',
          component: AbTestingWorkbenchView,
          meta: { title: '实验报告', module: 'A/B 测试', abPage: 'reports' },
        },
        {
          path: 'ab-testing/experiments/:experimentId/report',
          component: AbTestingWorkbenchView,
          meta: { title: '实验详情', module: 'A/B 测试', abPage: 'reports' },
        },
        {
          path: 'ab-testing/metrics',
          component: AbTestingWorkbenchView,
          meta: { title: '指标管理', module: 'A/B 测试', abPage: 'metrics' },
        },
        {
          path: 'ab-testing/features',
          component: AbTestingWorkbenchView,
          meta: { title: '配置管理', module: 'A/B 测试', abPage: 'features' },
        },
        {
          path: 'ab-testing/traffic',
          component: AbTestingWorkbenchView,
          meta: { title: '流量管理', module: 'A/B 测试', abPage: 'traffic' },
        },
        {
          path: 'ab-testing/tools',
          component: AbTestingWorkbenchView,
          meta: { title: '实验工具箱', module: 'A/B 测试', abPage: 'tools' },
        },
        {
          path: 'ab-testing/boards',
          component: AbTestingWorkbenchView,
          meta: { title: '实验看板', module: 'A/B 测试', abPage: 'boards' },
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
    {
      path: '/big-screen-previews/:previewSessionId',
      component: BigScreenPreviewView,
      meta: { title: '数字大屏预览' },
    },
    {
      path: '/big-screen-presentations/:planId',
      component: BigScreenPresentationPlayerView,
      meta: { title: '数字大屏演播厅投屏' },
    },
    {
      path: '/big-screens/published/:screenId',
      component: BigScreenPublishedView,
      meta: { title: '数字大屏发布页' },
    },
  ],
})

router.beforeEach(async (to) => {
  if (to.path.startsWith('/user-insight/profiles') && !profilePermissionSet.viewProfile) {
    return '/dashboard'
  }
  if (to.path.startsWith('/user-insight/profile-config') && !profilePermissionSet.projectConfig) {
    return '/user-insight/profiles'
  }
  if (to.path.startsWith('/data-insight/ad-analysis')) {
    try {
      await adAnalysisService.getAccessContext()
      const decision = await adAnalysisService.getAccessDecision()
      if (decision.reasons.includes('no_permission') || decision.reasons.includes('version_closed')) {
        return {
          path: '/dashboard',
          query: { adAccessDenied: decision.message ?? '暂无广告投放分析访问权限' },
        }
      }
      if (!decision.available && to.path !== '/data-insight/ad-analysis') {
        return {
          path: '/data-insight/ad-analysis',
          query: { adAccessState: decision.reasons[0] ?? 'not_available' },
        }
      }
    } catch {
      return {
        path: '/dashboard',
        query: { adAccessDenied: '广告投放分析入口暂不可用，请稍后重试' },
      }
    }
  }
  return true
})

export default router
