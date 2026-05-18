<script setup lang="ts">
import { NEmpty, NGi, NGrid, NSpin, NStatistic, NTag } from 'naive-ui'
import type { TagProps } from 'naive-ui'
import type { EventChartProps } from './chartTypes'

const props = defineProps<EventChartProps>()

const formatNumber = (value: number): string => new Intl.NumberFormat('zh-CN').format(value)

const formatValue = (value: number, unit: string, precision: number): string => {
  if (unit === '元') {
    return `¥${formatNumber(value)}`
  }

  if (unit === '%') {
    return `${value.toFixed(precision)}%`
  }

  return `${formatNumber(Number(value.toFixed(precision)))} ${unit}`
}

const getTagType = (value: number): TagProps['type'] => (value < -10 ? 'error' : value < 0 ? 'warning' : 'success')
</script>

<template>
  <n-spin :show="loading">
    <n-grid v-if="result?.metricCards.length" :cols="3" :x-gap="12" :y-gap="12">
      <n-gi
        v-for="card in result.metricCards.filter((item) => !props.config.selectedMetricIds.length || props.config.selectedMetricIds.includes(item.metricId))"
        :key="card.id"
      >
        <div class="metric-card-chart-item">
          <n-statistic
            :label="card.metricName"
            :value="formatValue(card.value, card.unit, card.precision)"
          />
          <n-tag :type="getTagType(card.changeRate)" size="small">
            {{ card.changeRate > 0 ? '+' : '' }}{{ card.changeRate.toFixed(1) }}%
          </n-tag>
        </div>
      </n-gi>
    </n-grid>
    <n-empty v-else description="暂无指标卡数据" />
  </n-spin>
</template>

<style scoped lang="scss">
.metric-card-chart-item {
  min-height: 112px;
  padding: 16px;
  border: 1px solid #edf0f5;
  border-radius: 8px;
  background: #fafbfc;
}
</style>
