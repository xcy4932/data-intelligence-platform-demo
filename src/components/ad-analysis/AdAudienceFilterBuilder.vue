<script setup lang="ts">
import {
  NButton,
  NInput,
  NRadioButton,
  NRadioGroup,
  NSelect,
  NSpace,
  NTag,
  NText,
} from 'naive-ui'
import type { SelectOption } from 'naive-ui'
import type {
  AdAudienceCondition,
  AdAudienceConditionFieldType,
  AdAudienceFilter,
  AdAudienceFilterType,
  AdFilterRelation,
} from '@/types/adAnalysis'

const props = defineProps<{
  modelValue: AdAudienceFilter[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: AdAudienceFilter[]]
}>()

const filterTypeMeta: Record<AdAudienceFilterType, { label: string, defaultName: string, fieldType: AdAudienceConditionFieldType }> = {
  tag: { label: '标签', defaultName: '高意向标签', fieldType: 'tag' },
  behavior: { label: '行为', defaultName: '近 7 日点击', fieldType: 'behavior' },
  segment: { label: '人群包', defaultName: '核心城市人群包', fieldType: 'segment' },
}

const includeOptions: SelectOption[] = [
  { label: '包含', value: 'include' },
  { label: '排除', value: 'exclude' },
]

const relationOptions: SelectOption[] = [
  { label: '满足全部条件 AND', value: 'AND' },
  { label: '满足任一条件 OR', value: 'OR' },
]

const conditionFieldOptions: SelectOption[] = [
  { label: '标签', value: 'tag' },
  { label: '行为', value: 'behavior' },
  { label: '人群包', value: 'segment' },
  { label: '用户属性', value: 'property' },
  { label: '明细字段', value: 'detail' },
]

const conditionOperatorOptions: SelectOption[] = [
  { label: '等于', value: 'eq' },
  { label: '不等于', value: 'neq' },
  { label: '包含任一', value: 'in' },
  { label: '不包含', value: 'not_in' },
  { label: '文本包含', value: 'contains' },
  { label: '大于', value: 'gt' },
  { label: '大于等于', value: 'gte' },
  { label: '小于', value: 'lt' },
  { label: '区间', value: 'between' },
]

const fieldOptionsByType: Record<AdAudienceConditionFieldType, SelectOption[]> = {
  tag: [
    { label: '高意向标签 tag_high_intent', value: 'tag_high_intent' },
    { label: '新能源偏好 tag_new_energy', value: 'tag_new_energy' },
  ],
  behavior: [
    { label: '广告点击 click', value: 'click' },
    { label: '留资 phone', value: 'phone' },
    { label: '预约试驾 test_drive', value: 'test_drive' },
    { label: '成交 buycar', value: 'buycar' },
  ],
  segment: [
    { label: '核心城市人群包 seg_core_city', value: 'seg_core_city' },
    { label: '30 日活跃人群 seg_active_30d', value: 'seg_active_30d' },
  ],
  property: [
    { label: '城市 city', value: 'city' },
    { label: '车型偏好 car_preference', value: 'car_preference' },
    { label: '会员等级 member_level', value: 'member_level' },
  ],
  detail: [
    { label: '广告主 advertiser_id', value: 'advertiser_id' },
    { label: '广告组 ad_group_id', value: 'ad_group_id' },
    { label: '投放成本 cost', value: 'cost' },
  ],
}

function cloneFilters() {
  return props.modelValue.map((filter) => ({
    ...filter,
    conditions: (filter.conditions ?? []).map((condition) => ({ ...condition })),
  }))
}

function emitFilters(filters: AdAudienceFilter[]) {
  emit('update:modelValue', filters)
}

function createCondition(type: AdAudienceFilterType): AdAudienceCondition {
  const fieldType = filterTypeMeta[type].fieldType
  return {
    id: `aud_cond_${Date.now()}_${Math.round(Math.random() * 1000)}`,
    fieldType,
    fieldName: String(fieldOptionsByType[fieldType][0]?.value ?? ''),
    operator: 'eq',
    value: '',
    timeRange: type === 'behavior' ? '近 7 日' : undefined,
  }
}

function addFilter(type: AdAudienceFilterType) {
  const filters = cloneFilters()
  filters.push({
    id: `aud_${Date.now()}_${Math.round(Math.random() * 1000)}`,
    type,
    name: filterTypeMeta[type].defaultName,
    operator: 'include',
    relation: 'AND',
    conditions: [createCondition(type)],
  })
  emitFilters(filters)
}

function updateFilter(index: number, patch: Partial<AdAudienceFilter>) {
  const filters = cloneFilters()
  const current = filters[index]
  if (!current) return
  filters.splice(index, 1, { ...current, ...patch })
  emitFilters(filters)
}

function removeFilter(index: number) {
  const filters = cloneFilters()
  filters.splice(index, 1)
  emitFilters(filters)
}

function addCondition(filterIndex: number) {
  const filters = cloneFilters()
  const filter = filters[filterIndex]
  if (!filter) return
  filter.conditions = [...(filter.conditions ?? []), createCondition(filter.type)]
  emitFilters(filters)
}

function updateCondition(filterIndex: number, conditionIndex: number, patch: Partial<AdAudienceCondition>) {
  const filters = cloneFilters()
  const condition = filters[filterIndex]?.conditions?.[conditionIndex]
  if (!condition) return
  filters[filterIndex]!.conditions!.splice(conditionIndex, 1, { ...condition, ...patch })
  emitFilters(filters)
}

function changeConditionFieldType(filterIndex: number, conditionIndex: number, fieldType: AdAudienceConditionFieldType) {
  updateCondition(filterIndex, conditionIndex, {
    fieldType,
    fieldName: String(fieldOptionsByType[fieldType][0]?.value ?? ''),
  })
}

function removeCondition(filterIndex: number, conditionIndex: number) {
  const filters = cloneFilters()
  filters[filterIndex]?.conditions?.splice(conditionIndex, 1)
  emitFilters(filters)
}
</script>

<template>
  <div class="audience-builder">
    <div class="audience-builder-toolbar">
      <n-space align="center">
        <n-text strong>人群圈选条件组</n-text>
        <n-tag size="small" type="info">组间 AND</n-tag>
      </n-space>
      <n-space>
        <n-button size="small" secondary @click="addFilter('tag')">+ 标签条件</n-button>
        <n-button size="small" secondary @click="addFilter('behavior')">+ 行为条件</n-button>
        <n-button size="small" secondary @click="addFilter('segment')">+ 人群包条件</n-button>
      </n-space>
    </div>

    <div v-if="modelValue.length === 0" class="audience-empty">未配置人群圈选条件</div>

    <div v-for="(filter, filterIndex) in modelValue" :key="filter.id" class="audience-group">
      <div class="audience-group-head">
        <n-space align="center">
          <n-tag type="success">{{ filterTypeMeta[filter.type].label }}</n-tag>
          <n-input
            :value="filter.name"
            placeholder="条件组名称"
            style="width: 180px"
            @update:value="(value: string) => updateFilter(filterIndex, { name: value })"
          />
          <n-select
            :value="filter.operator"
            :options="includeOptions"
            style="width: 100px"
            @update:value="(value: 'include' | 'exclude') => updateFilter(filterIndex, { operator: value })"
          />
        </n-space>
        <n-space align="center">
          <n-radio-group
            :value="filter.relation ?? 'AND'"
            size="small"
            @update:value="(value: AdFilterRelation) => updateFilter(filterIndex, { relation: value })"
          >
            <n-radio-button v-for="option in relationOptions" :key="String(option.value)" :value="option.value">
              {{ option.label }}
            </n-radio-button>
          </n-radio-group>
          <n-button size="small" secondary @click="addCondition(filterIndex)">添加条件</n-button>
          <n-button size="small" quaternary type="error" @click="removeFilter(filterIndex)">移除组</n-button>
        </n-space>
      </div>

      <div class="audience-condition-list">
        <div v-for="(condition, conditionIndex) in filter.conditions ?? []" :key="condition.id" class="audience-condition-row">
          <n-select
            :value="condition.fieldType"
            :options="conditionFieldOptions"
            @update:value="(value: AdAudienceConditionFieldType) => changeConditionFieldType(filterIndex, conditionIndex, value)"
          />
          <n-select
            :value="condition.fieldName"
            :options="fieldOptionsByType[condition.fieldType]"
            @update:value="(value: string) => updateCondition(filterIndex, conditionIndex, { fieldName: value })"
          />
          <n-select
            :value="condition.operator"
            :options="conditionOperatorOptions"
            @update:value="(value: AdAudienceCondition['operator']) => updateCondition(filterIndex, conditionIndex, { operator: value })"
          />
          <n-input
            :value="condition.value"
            placeholder="条件值，多个用英文逗号"
            @update:value="(value: string) => updateCondition(filterIndex, conditionIndex, { value })"
          />
          <n-input
            :value="condition.timeRange"
            placeholder="时间范围"
            @update:value="(value: string) => updateCondition(filterIndex, conditionIndex, { timeRange: value })"
          />
          <n-button size="small" quaternary type="error" @click="removeCondition(filterIndex, conditionIndex)">删除</n-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.audience-builder {
  width: 100%;
}

.audience-builder-toolbar,
.audience-group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.audience-empty {
  padding: 10px 12px;
  border-radius: 6px;
  background: #f8fafc;
  color: #64748b;
  font-size: 13px;
}

.audience-group {
  padding: 12px;
  margin-top: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}

.audience-condition-list {
  display: grid;
  gap: 8px;
}

.audience-condition-row {
  display: grid;
  grid-template-columns: 120px 1.1fr 120px 1.2fr 120px 64px;
  gap: 8px;
  align-items: center;
}
</style>
