import type { DashboardOverview, DashboardRecommendation, DashboardStoryStep } from '@/types/dashboard'
import { alertEvents } from './alerts'
import { operationCampaigns } from './campaigns'
import { experiments } from './experiments'
import { metricAnalyses, metricSummaries } from './metrics'
import { userSegments } from './segments'

export const dashboardStorySteps: DashboardStoryStep[] = [
  {
    id: 'story-detect-anomaly',
    order: 1,
    title: '发现指标异常',
    moduleName: '监控中心',
    routePath: '/monitoring/metrics',
    status: 'completed',
    summary: '广告观看次数连续 3 天下滑，系统触发 critical 告警。',
  },
  {
    id: 'story-analyze-metric',
    order: 2,
    title: '定位异常原因',
    moduleName: '数据洞察',
    routePath: '/data-insight/event-analysis',
    status: 'completed',
    summary: '下滑集中在低金币高活跃用户与金币不足弹窗入口。',
  },
  {
    id: 'story-create-segment',
    order: 3,
    title: '识别目标人群',
    moduleName: '用户洞察',
    routePath: '/user-insight/segments',
    status: 'completed',
    summary: '圈选 46,820 名低金币高活跃用户，推荐即时激励策略。',
  },
  {
    id: 'story-run-campaign',
    order: 4,
    title: '创建智能运营任务',
    moduleName: '智能运营',
    routePath: '/intelligent-operation/campaigns',
    status: 'current',
    summary: '任务通过弹窗和任务横幅强化广告换金币价值表达。',
  },
  {
    id: 'story-ab-test',
    order: 5,
    title: '配置 A/B 测试',
    moduleName: 'A/B 测试',
    routePath: '/ab-testing/experiments',
    status: 'current',
    summary: '比较原始提示、固定奖励、阶梯奖励三种策略效果。',
  },
  {
    id: 'story-evaluate',
    order: 6,
    title: '输出效果评估',
    moduleName: '效果评估',
    routePath: '/intelligent-operation/evaluation',
    status: 'next',
    summary: '固定奖励方案收益稳定，建议先扩大到 80% 目标用户。',
  },
]

export const dashboardRecommendations: DashboardRecommendation[] = [
  {
    id: 'rec-rollout-fixed-reward',
    title: '低金币高活跃用户激励广告任务',
    reason: 'B 组广告观看率提升 18.7%，留存防护指标稳定，适合先行扩大。',
    priority: 'high',
    expectedImpact: '预计月增广告收入 43.8 万元',
    actionRoute: '/intelligent-operation/evaluation',
  },
  {
    id: 'rec-keep-streak-observing',
    title: '保留阶梯奖励小流量观察',
    reason: 'C 组观看次数提升最高，但 7 日留存略低于基线，需要继续验证。',
    priority: 'medium',
    expectedImpact: '若风险收敛，可再提升 3% 到 5% 广告观看次数',
    actionRoute: '/ab-testing/reports',
  },
  {
    id: 'rec-fix-android-entry',
    title: '联动客户端修复 Android 入口样式',
    reason: 'Android 8.7.0 的金币不足入口转化低于其他版本，是异常贡献来源之一。',
    priority: 'medium',
    expectedImpact: '预计恢复 1.8 万到 2.4 万次日广告观看',
    actionRoute: '/data-insight/attribution',
  },
]

const adWatchAnalysis = metricAnalyses.find((analysis) => analysis.metricId === 'metric-ad-watch-count')
const adWatchRateAnalysis = metricAnalyses.find((analysis) => analysis.metricId === 'metric-ad-watch-rate')

const dashboardKpiMetricIds = [
  'metric-dau',
  'metric-ad-watch-count',
  'metric-ad-watch-rate',
  'metric-retention-d1',
]

const activeCampaigns = operationCampaigns.filter((campaign) => campaign.status === 'active')
const runningExperiments = experiments.filter(
  (experiment) => experiment.status === 'active' || experiment.status === 'analyzing',
)

export const dashboardOverview: DashboardOverview = {
  generatedAt: '2026-05-17T09:30:00+02:00',
  kpiCards: [
    ...dashboardKpiMetricIds.flatMap((metricId) => {
      const summary = metricSummaries.find((item) => item.metricId === metricId)

      if (!summary) {
        return []
      }

      return [
        {
          ...summary,
          icon:
            summary.metricId === 'metric-ad-watch-count'
              ? 'warning'
              : summary.metricId === 'metric-ad-watch-rate'
                ? 'conversion'
                : summary.metricId === 'metric-retention-d1'
                  ? 'retention'
                  : 'activity',
          routePath: '/monitoring/metrics',
        },
      ]
    }),
    {
      metricId: 'dashboard-running-experiments',
      label: '当前运行实验数',
      value: runningExperiments.length,
      unit: '个',
      valueFormat: 'number',
      comparison: {
        current: runningExperiments.length,
        previous: 0,
        delta: runningExperiments.length,
        deltaRate: 100,
        trend: 'up',
      },
      status: 'normal',
      icon: 'experiment',
      routePath: '/ab-testing/experiments',
    },
    {
      metricId: 'dashboard-active-campaigns',
      label: '执行中运营任务数',
      value: activeCampaigns.length,
      unit: '个',
      valueFormat: 'number',
      comparison: {
        current: activeCampaigns.length,
        previous: 0,
        delta: activeCampaigns.length,
        deltaRate: 100,
        trend: 'up',
      },
      status: 'normal',
      icon: 'campaign',
      routePath: '/intelligent-operation/campaigns',
    },
  ],
  alertEvents,
  focusSegments: userSegments.filter((segment) =>
    ['segment-low-coin-high-active', 'segment-android-low-coin'].includes(segment.id),
  ),
  activeCampaigns,
  runningExperiments,
  recommendations: dashboardRecommendations,
  trendPanels: [
    {
      title: '广告观看次数趋势',
      metricId: 'metric-ad-watch-count',
      direction: 'down',
      trend: adWatchAnalysis?.trend ?? [],
    },
    {
      title: '广告观看率趋势',
      metricId: 'metric-ad-watch-rate',
      direction: 'down',
      trend: adWatchRateAnalysis?.trend ?? [],
    },
  ],
  storySteps: dashboardStorySteps,
}
