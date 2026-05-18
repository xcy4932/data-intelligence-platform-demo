import type { AlertEvent } from '@/types/alert'

export const alertEvents: AlertEvent[] = [
  {
    id: 'alert-ad-watch-drop-20260513',
    title: '广告观看次数连续 3 天下滑',
    description:
      '广告观看次数较前 7 日均值下降 13.5%，主要集中在低金币高活跃用户和金币不足弹窗入口。',
    severity: 'critical',
    status: 'acknowledged',
    source: 'metric_monitor',
    triggeredAt: '2026-05-13T09:20:00+02:00',
    dateRange: {
      start: '2026-05-10',
      end: '2026-05-13',
    },
    relatedMetricIds: ['metric-ad-watch-count', 'metric-ad-watch-rate', 'metric-ad-revenue'],
    impactedSegmentIds: ['segment-low-coin-high-active'],
    linkedCampaignIds: ['campaign-low-coin-ad-recovery'],
    assignee: {
      owner: {
        id: 'owner-monetization',
        name: '周婧',
        department: '商业化数据团队',
      },
      acknowledgedAt: '2026-05-13T09:36:00+02:00',
    },
    timeline: [
      {
        at: '2026-05-13T09:20:00+02:00',
        actor: '指标监控系统',
        action: '触发告警',
        note: '连续 3 天低于动态置信下界，异常置信度 94%。',
      },
      {
        at: '2026-05-13T09:36:00+02:00',
        actor: '周婧',
        action: '确认告警',
        note: '确认不是数据延迟，进入用户分群分析。',
      },
      {
        at: '2026-05-13T10:15:00+02:00',
        actor: '智能诊断助手',
        action: '输出原因',
        note: '低金币高活跃用户贡献了 47% 的观看损失。',
      },
    ],
  },
  {
    id: 'alert-low-coin-users-growth-20260513',
    title: '低金币高活跃用户规模快速增长',
    description: '近 7 日低金币高活跃用户规模增长 17.9%，人均广告观看次数下降 18.6%。',
    severity: 'warning',
    status: 'open',
    source: 'operation',
    triggeredAt: '2026-05-13T10:05:00+02:00',
    dateRange: {
      start: '2026-05-07',
      end: '2026-05-13',
    },
    relatedMetricIds: ['metric-low-coin-active-users', 'metric-ad-watch-rate'],
    impactedSegmentIds: ['segment-low-coin-high-active', 'segment-android-low-coin'],
    linkedCampaignIds: ['campaign-low-coin-ad-recovery'],
    assignee: {
      owner: {
        id: 'owner-user-insight',
        name: '许澄',
        department: '用户洞察团队',
      },
    },
    timeline: [
      {
        at: '2026-05-13T10:05:00+02:00',
        actor: '用户洞察系统',
        action: '标记异常人群',
        note: '用户规模增长来自 Android 8.7.0 与东南亚区域。',
      },
    ],
  },
  {
    id: 'alert-experiment-guardrail-20260516',
    title: 'A/B 实验防护指标稳定',
    description: '金币消耗速度和次日留存均在防护阈值内，实验可继续扩大流量。',
    severity: 'info',
    status: 'resolved',
    source: 'experiment_guardrail',
    triggeredAt: '2026-05-16T08:45:00+02:00',
    resolvedAt: '2026-05-16T09:00:00+02:00',
    dateRange: {
      start: '2026-05-14',
      end: '2026-05-16',
    },
    relatedMetricIds: ['metric-ad-watch-rate', 'metric-retention-d7'],
    impactedSegmentIds: ['segment-low-coin-high-active'],
    linkedCampaignIds: ['campaign-low-coin-ad-recovery'],
    assignee: {
      owner: {
        id: 'owner-growth',
        name: '林哲',
        department: '增长运营团队',
      },
      acknowledgedAt: '2026-05-16T08:50:00+02:00',
    },
    timeline: [
      {
        at: '2026-05-16T08:45:00+02:00',
        actor: '实验平台',
        action: '生成防护结论',
        note: 'B 组观看率提升显著，留存无负向波动。',
      },
      {
        at: '2026-05-16T09:00:00+02:00',
        actor: '林哲',
        action: '关闭提醒',
        note: '进入效果评估与扩量审批。',
      },
    ],
  },
]
