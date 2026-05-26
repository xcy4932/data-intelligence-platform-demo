<script setup lang="ts">
import { computed } from 'vue'
import { NAlert, NFormItem, NGi, NGrid, NInput, NInputNumber, NSelect, NSwitch } from 'naive-ui'
import TagConditionGroupEditor from '@/components/tags/TagConditionGroupEditor.vue'
import type { TagCreatePayload, TagRuleGroup } from '@/types/tag'
import { dataSourceOptions, dateRangeOptions, ensureRuleGroup, fieldOptions, rfmCompareOptions, rfmSourceOptions } from './tagEditorOptions'

defineOptions({ name: 'RfmTagEditor' })

const draft = defineModel<TagCreatePayload>('draft', { required: true })

const emit = defineEmits<{
  change: []
}>()

const rfmMetricKeys: Array<'R' | 'F' | 'M'> = ['R', 'F', 'M']

const filterGroup = computed<TagRuleGroup>({
  get: () => ensureRuleGroup(draft.value, 'filterGroup', 'rfm-filter'),
  set: (group) => {
    draft.value.rule.filterGroup = group
  },
})

const excludeGroup = computed<TagRuleGroup>({
  get: () => ensureRuleGroup(draft.value, 'excludeGroup', 'rfm-exclude'),
  set: (group) => {
    draft.value.rule.excludeGroup = group
  },
})

const markChanged = (): void => {
  emit('change')
}

const metricOf = (metricKey: 'R' | 'F' | 'M') => draft.value.rule.rfmMetrics?.find((item) => item.key === metricKey)

const setRfmMetricEnabled = (metricKey: 'R' | 'F' | 'M', enabled: boolean): void => {
  draft.value.rule.rfmMetrics = (draft.value.rule.rfmMetrics ?? []).map((metric) => (metric.key === metricKey ? { ...metric, enabled } : metric))
  markChanged()
}

const setRfmMetricField = (metricKey: 'R' | 'F' | 'M', field: string): void => {
  draft.value.rule.rfmMetrics = (draft.value.rule.rfmMetrics ?? []).map((metric) => (metric.key === metricKey ? { ...metric, field } : metric))
  markChanged()
}

const setRfmMetricCompareType = (metricKey: 'R' | 'F' | 'M', compareType: 'average' | 'median' | 'custom'): void => {
  draft.value.rule.rfmMetrics = (draft.value.rule.rfmMetrics ?? []).map((metric) => (metric.key === metricKey ? { ...metric, compareType } : metric))
  markChanged()
}

const setRfmMetricCustomThreshold = (metricKey: 'R' | 'F' | 'M', customThreshold: number | null): void => {
  draft.value.rule.rfmMetrics = (draft.value.rule.rfmMetrics ?? []).map((metric) => (metric.key === metricKey ? { ...metric, customThreshold: customThreshold ?? undefined } : metric))
  markChanged()
}

const setRfmMetricThreshold = (metricKey: 'R' | 'F' | 'M', threshold: string): void => {
  draft.value.rule.rfmMetrics = (draft.value.rule.rfmMetrics ?? []).map((metric) => (metric.key === metricKey ? { ...metric, threshold } : metric))
  markChanged()
}

const setRfmValueName = (code: string, name: string): void => {
  draft.value.rule.rfmValueNames = (draft.value.rule.rfmValueNames ?? []).map((item) => (item.code === code ? { ...item, name } : item))
  markChanged()
}
</script>

<template>
  <div class="type-editor">
    <section class="config-column">
      <h3>RFM 数据口径</h3>
      <n-grid :cols="3" :x-gap="16">
        <n-gi>
          <n-form-item label="数据来源">
            <n-select v-model:value="draft.rule.rfmSourceType" :options="rfmSourceOptions" @update:value="markChanged" />
          </n-form-item>
        </n-gi>
        <n-gi>
          <n-form-item label="数据档案 / 标签组">
            <n-select v-model:value="draft.rule.dataSource" :options="dataSourceOptions" filterable @update:value="markChanged" />
          </n-form-item>
        </n-gi>
        <n-gi>
          <n-form-item label="计算周期">
            <n-select v-model:value="draft.rule.rfmPeriod" :options="dateRangeOptions" @update:value="markChanged" />
          </n-form-item>
        </n-gi>
      </n-grid>
    </section>

    <div class="rfm-grid">
      <label v-for="metric in rfmMetricKeys" :key="metric">
        <strong>{{ metric }}</strong>
        <n-switch :value="metricOf(metric)?.enabled ?? true" @update:value="(value) => setRfmMetricEnabled(metric, value)" />
        <n-select
          :value="metricOf(metric)?.field"
          :options="fieldOptions.map((field) => ({ label: `${field.name}（${field.id}）`, value: field.id }))"
          filterable
          placeholder="指标字段/标签"
          @update:value="(value) => setRfmMetricField(metric, String(value ?? ''))"
        />
        <n-select :value="metricOf(metric)?.compareType" :options="rfmCompareOptions" @update:value="(value) => setRfmMetricCompareType(metric, value as 'average' | 'median' | 'custom')" />
        <n-input-number v-if="metricOf(metric)?.compareType === 'custom'" :value="metricOf(metric)?.customThreshold" placeholder="自定义阈值" @update:value="(value) => setRfmMetricCustomThreshold(metric, value)" />
        <n-input :value="metricOf(metric)?.threshold" placeholder="配置高/低阈值规则" @update:value="(value) => setRfmMetricThreshold(metric, value)" />
      </label>
    </div>

    <n-alert type="info">R 数值越小越好，F/M 数值越大越好；至少保留两个指标，关闭指标后不会参与价值类型组合。</n-alert>

    <table class="tag-table compact">
      <thead><tr><th>组合编码</th><th>价值类型名称</th></tr></thead>
      <tbody>
        <tr v-for="item in draft.rule.rfmValueNames" :key="item.code">
          <td>{{ item.code }}</td>
          <td><n-input :value="item.name" @update:value="(value) => setRfmValueName(item.code, String(value ?? ''))" /></td>
        </tr>
      </tbody>
    </table>

    <div class="condition-stack">
      <TagConditionGroupEditor v-model:group="filterGroup" title="RFM 计算口径筛选" @change="markChanged" />
      <TagConditionGroupEditor v-model:group="excludeGroup" title="排除主体" muted @change="markChanged" />
    </div>
  </div>
</template>

<style scoped>
.type-editor,
.config-column,
.condition-stack {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.config-column {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
}

.config-column h3 {
  margin: 0;
  font-size: 15px;
}

.rfm-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.rfm-grid label {
  display: grid;
  gap: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
}

@media (max-width: 1200px) {
  .rfm-grid {
    grid-template-columns: 1fr;
  }
}
</style>
