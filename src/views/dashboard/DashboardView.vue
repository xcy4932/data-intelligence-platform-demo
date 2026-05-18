<script setup lang="ts">
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
} from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'
import {
  NAlert,
  NButton,
  NCard,
  NEmpty,
  NGi,
  NGrid,
  NProgress,
  NSpace,
  NSpin,
  NStatistic,
  NTag,
} from 'naive-ui'
import type { TagProps } from 'naive-ui'
import { computed, onMounted, ref } from 'vue'
import VChart from 'vue-echarts'
import { dashboardService } from '@/services/dashboardService'
import type { AlertEvent } from '@/types/alert'
import type { DashboardKpiCard, DashboardOverview, DashboardRecommendation } from '@/types/dashboard'
import type { Experiment, ExperimentGroup, ExperimentMetricResult } from '@/types/experiment'
import type { MetricValueFormat } from '@/types/metric'

use([CanvasRenderer, GridComponent, LegendComponent, LineChart, MarkLineComponent, TooltipComponent])

interface ExperimentGroupResultView {
  group: ExperimentGroup
  value: number
  liftRate: number
  confidence: number
  isWinner: boolean
}

const dashboard = ref<DashboardOverview | null>(null)
const loading = ref(true)
const errorMessage = ref('')

const kpiCards = computed<DashboardKpiCard[]>(() => dashboard.value?.kpiCards ?? [])

const adWatchTrendPanel = computed(() =>
  dashboard.value?.trendPanels.find((panel) => panel.metricId === 'metric-ad-watch-count'),
)

const adWatchAlert = computed<AlertEvent | undefined>(() =>
  dashboard.value?.alertEvents.find((alert) =>
    alert.relatedMetricIds.includes('metric-ad-watch-count'),
  ),
)

const adWatchAnomalyDate = computed(() => adWatchAlert.value?.dateRange.start.slice(5))

const primaryRecommendation = computed<DashboardRecommendation | undefined>(
  () => dashboard.value?.recommendations[0],
)

const activeCampaign = computed(() => dashboard.value?.activeCampaigns[0])

const currentExperiment = computed<Experiment | undefined>(() => dashboard.value?.runningExperiments[0])

const primaryExperimentMetric = computed<ExperimentMetricResult | undefined>(() =>
  currentExperiment.value?.metricResults.find((metric) => metric.role === 'primary'),
)

const experimentGroupResults = computed<ExperimentGroupResultView[]>(() => {
  const experiment = currentExperiment.value
  const metric = primaryExperimentMetric.value

  if (!experiment || !metric) {
    return []
  }

  return experiment.groups.map((group) => {
    const groupResult = metric.groupResults.find((result) => result.groupId === group.id)

    return {
      group,
      value: groupResult?.value ?? 0,
      liftRate: groupResult?.liftRate ?? 0,
      confidence: groupResult?.confidence ?? 0,
      isWinner: metric.winnerGroupId === group.id,
    }
  })
})

const adWatchChartOption = computed<EChartsOption>(() => {
  const trend = adWatchTrendPanel.value?.trend ?? []

  return {
    color: ['#d03050', '#18a058', '#8a8f98'],
    grid: {
      top: 48,
      right: 24,
      bottom: 28,
      left: 56,
    },
    legend: {
      top: 8,
      right: 16,
      itemWidth: 10,
      itemHeight: 10,
    },
    tooltip: {
      trigger: 'axis',
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: trend.map((point) => point.date.slice(5)),
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: '{value}',
      },
      splitLine: {
        lineStyle: {
          color: '#edf0f5',
        },
      },
    },
    series: [
      {
        name: '实际值',
        type: 'line',
        smooth: true,
        symbolSize: 7,
          data: trend.map((point) => point.value),
        markLine: adWatchAnomalyDate.value
          ? {
              symbol: 'none',
              lineStyle: {
                color: '#d03050',
                type: 'dashed',
              },
              data: [{ xAxis: adWatchAnomalyDate.value }],
            }
          : undefined,
      },
      {
        name: '目标值',
        type: 'line',
        smooth: true,
        symbol: 'none',
        data: trend.map((point) => point.target),
      },
      {
        name: '基线',
        type: 'line',
        smooth: true,
        symbol: 'none',
        data: trend.map((point) => point.baseline),
      },
    ],
  }
})

const formatNumber = (value: number): string => new Intl.NumberFormat('zh-CN').format(value)

const formatMetricValue = (value: number, valueFormat: MetricValueFormat, unit: string): string => {
  if (valueFormat === 'percent') {
    return `${value.toFixed(1)}${unit}`
  }

  if (valueFormat === 'currency') {
    return `¥${formatNumber(value)}`
  }

  return `${formatNumber(value)} ${unit}`
}

const formatDeltaRate = (value: number): string => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`

const getTrendTagType = (trend: DashboardKpiCard['comparison']['trend']): TagProps['type'] => {
  if (trend === 'up') {
    return 'success'
  }

  if (trend === 'down') {
    return 'warning'
  }

  return 'default'
}

const getAlertTagType = (severity: AlertEvent['severity']): TagProps['type'] => {
  if (severity === 'critical') {
    return 'error'
  }

  if (severity === 'warning') {
    return 'warning'
  }

  return 'info'
}

const getPriorityTagType = (priority: DashboardRecommendation['priority']): TagProps['type'] => {
  if (priority === 'high') {
    return 'error'
  }

  if (priority === 'medium') {
    return 'warning'
  }

  return 'info'
}

const getConfidencePercent = (confidence: number): number => Math.round(confidence * 100)

const loadDashboard = async (): Promise<void> => {
  loading.value = true
  errorMessage.value = ''

  try {
    dashboard.value = await dashboardService.getDashboardOverview()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '首页数据加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadDashboard()
})
</script>

<template>
  <div class="page-container dashboard-page">
    <div class="dashboard-header">
      <div>
        <h1 class="page-title">首页驾驶舱</h1>
        <p class="page-description">
          从指标异常发现，到用户分群、智能运营、A/B 测试和效果评估的完整闭环。
        </p>
      </div>
      <n-tag v-if="dashboard" type="info" size="small">
        数据更新时间 {{ dashboard.generatedAt.slice(0, 16).replace('T', ' ') }}
      </n-tag>
    </div>

    <n-alert v-if="errorMessage" type="error" :show-icon="false" class="dashboard-section">
      {{ errorMessage }}
    </n-alert>

    <n-spin :show="loading">
      <n-space vertical :size="16">
        <n-grid :cols="6" :x-gap="12" :y-gap="12">
          <n-gi v-for="card in kpiCards" :key="card.metricId">
            <n-card class="kpi-card" :bordered="false">
              <n-statistic
                :label="card.label"
                :value="formatMetricValue(card.value, card.valueFormat, card.unit)"
              />
              <div class="kpi-card-footer">
                <n-tag :type="getTrendTagType(card.comparison.trend)" size="small">
                  {{ formatDeltaRate(card.comparison.deltaRate) }}
                </n-tag>
                <span>{{ card.comparison.trend === 'down' ? '较前期下降' : '较前期提升' }}</span>
              </div>
            </n-card>
          </n-gi>
        </n-grid>

        <n-grid :cols="3" :x-gap="16" :y-gap="16">
          <n-gi :span="2">
            <n-card :title="adWatchTrendPanel?.title" :bordered="false">
              <v-chart class="trend-chart" :option="adWatchChartOption" autoresize />
            </n-card>
          </n-gi>

          <n-gi>
            <n-card title="异常提醒" :bordered="false">
              <template v-if="adWatchAlert">
                <div class="alert-card-header">
                  <n-tag :type="getAlertTagType(adWatchAlert.severity)" size="small">
                    {{ adWatchAlert.severity }}
                  </n-tag>
                  <span>{{ adWatchAlert.dateRange.start }} 至 {{ adWatchAlert.dateRange.end }}</span>
                </div>
                <h3 class="panel-title">{{ adWatchAlert.title }}</h3>
                <p class="panel-text">{{ adWatchAlert.description }}</p>
                <div class="alert-timeline">
                  <div v-for="item in adWatchAlert.timeline" :key="`${item.at}-${item.action}`">
                    <strong>{{ item.action }}</strong>
                    <span>{{ item.note }}</span>
                  </div>
                </div>
              </template>
              <n-empty v-else description="暂无异常提醒" />
            </n-card>
          </n-gi>
        </n-grid>

        <n-grid :cols="2" :x-gap="16" :y-gap="16">
          <n-gi>
            <n-card title="智能运营建议" :bordered="false">
              <template v-if="primaryRecommendation">
                <div class="card-title-row">
                  <h3 class="panel-title">{{ primaryRecommendation.title }}</h3>
                  <n-tag :type="getPriorityTagType(primaryRecommendation.priority)" size="small">
                    {{ primaryRecommendation.priority }}
                  </n-tag>
                </div>
                <p class="panel-text">{{ primaryRecommendation.reason }}</p>
                <div v-if="activeCampaign" class="campaign-summary">
                  <div>
                    <span>任务</span>
                    <strong>{{ activeCampaign.name }}</strong>
                  </div>
                  <div>
                    <span>目标人群规模</span>
                    <strong>{{ formatNumber(activeCampaign.executionPlan.expectedReach) }} 人</strong>
                  </div>
                  <div>
                    <span>触达渠道</span>
                    <strong>{{ activeCampaign.executionPlan.channels.join(' / ') }}</strong>
                  </div>
                </div>
                <n-button tertiary type="primary" size="small">
                  {{ primaryRecommendation.expectedImpact }}
                </n-button>
              </template>
              <n-empty v-else description="暂无运营建议" />
            </n-card>
          </n-gi>

          <n-gi>
            <n-card title="A/B 测试摘要" :bordered="false">
              <template v-if="currentExperiment && primaryExperimentMetric">
                <div class="card-title-row">
                  <div>
                    <h3 class="panel-title">{{ currentExperiment.name }}</h3>
                    <p class="panel-text compact">{{ primaryExperimentMetric.metricName }}</p>
                  </div>
                  <n-tag type="success" size="small">{{ currentExperiment.status }}</n-tag>
                </div>

                <div class="experiment-groups">
                  <div
                    v-for="result in experimentGroupResults"
                    :key="result.group.id"
                    class="experiment-group"
                  >
                    <div class="experiment-group-header">
                      <strong>{{ result.group.name }}</strong>
                      <n-tag v-if="result.isWinner" type="success" size="small">当前最优</n-tag>
                    </div>
                    <p>{{ result.group.strategySummary }}</p>
                    <div class="experiment-metrics">
                      <span>{{ result.value.toFixed(1) }}%</span>
                      <n-tag :type="result.liftRate >= 0 ? 'success' : 'warning'" size="small">
                        {{ formatDeltaRate(result.liftRate) }}
                      </n-tag>
                    </div>
                    <n-progress
                      type="line"
                      :percentage="getConfidencePercent(result.confidence)"
                      :height="6"
                      :show-indicator="false"
                    />
                  </div>
                </div>
              </template>
              <n-empty v-else description="暂无运行中实验" />
            </n-card>
          </n-gi>
        </n-grid>
      </n-space>
    </n-spin>
  </div>
</template>

<style scoped lang="scss">
.dashboard-page {
  min-height: 100%;
}

.dashboard-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.dashboard-section {
  margin-bottom: 16px;
}

.kpi-card {
  min-height: 128px;
  background: #ffffff;
}

.kpi-card-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  color: #6b7280;
  font-size: 12px;
}

.trend-chart {
  width: 100%;
  height: 360px;
}

.alert-card-header,
.card-title-row,
.experiment-group-header,
.experiment-metrics {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.alert-card-header {
  color: #6b7280;
  font-size: 12px;
}

.panel-title {
  margin: 12px 0 8px;
  color: #111827;
  font-size: 16px;
  font-weight: 650;
}

.panel-text {
  margin: 0 0 14px;
  color: #4b5563;
  font-size: 13px;
  line-height: 1.7;
}

.panel-text.compact {
  margin-bottom: 0;
}

.alert-timeline {
  display: grid;
  gap: 10px;
  margin-top: 16px;
}

.alert-timeline div,
.campaign-summary,
.experiment-group {
  border: 1px solid #edf0f5;
  border-radius: 8px;
  background: #fafbfc;
}

.alert-timeline div {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
}

.alert-timeline strong {
  color: #111827;
  font-size: 13px;
}

.alert-timeline span {
  color: #6b7280;
  font-size: 12px;
  line-height: 1.6;
}

.campaign-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
  padding: 12px;
}

.campaign-summary div {
  display: grid;
  gap: 6px;
}

.campaign-summary span {
  color: #6b7280;
  font-size: 12px;
}

.campaign-summary strong {
  color: #111827;
  font-size: 13px;
}

.experiment-groups {
  display: grid;
  gap: 12px;
  margin-top: 14px;
}

.experiment-group {
  padding: 12px;
}

.experiment-group p {
  margin: 8px 0 10px;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.6;
}

.experiment-metrics {
  margin-bottom: 8px;
}

.experiment-metrics span {
  color: #111827;
  font-size: 18px;
  font-weight: 700;
}
</style>
