<script setup lang="ts">
import { NButton, NInput, NInputNumber, NSelect, NSpace } from 'naive-ui'
import type { EntityId } from '@/types/common'
import type { TagRuleCondition, TagRuleGroup } from '@/types/tag'

defineOptions({ name: 'TagConditionGroupEditor' })

const group = defineModel<TagRuleGroup>('group', { required: true })

const props = withDefaults(defineProps<{
  title?: string
  muted?: boolean
  depth?: number
  maxDepth?: number
}>(), {
  title: '筛选条件',
  muted: false,
  depth: 0,
  maxDepth: 1,
})

const emit = defineEmits<{
  change: []
}>()

const sourceOptions = [
  { label: '标签', value: 'tag' },
  { label: '用户属性', value: 'attribute' },
  { label: '行为数据', value: 'behavior' },
  { label: '明细数据', value: 'detail' },
  { label: 'SQL 结果', value: 'sql' },
  { label: '模型输出', value: 'model' },
]

const operatorOptions = ['等于', '不等于', '大于', '大于等于', '小于', '小于等于', '包含', '不包含', '为空', '不为空', 'like', '正则匹配'].map((value) => ({ label: value, value }))

const dateModeOptions = [
  { label: '动态日期', value: 'dynamic' },
  { label: '固定日期', value: 'fixed' },
  { label: '单个日期', value: 'single' },
]

const dateRangeOptions = [
  '今天',
  '昨天',
  '最近 7 天，包含今天',
  '最近 30 天，不包含今天',
  '本周',
  '上周',
  '本月',
  '上月',
  '最近 3 月',
  '最近 1 年',
  '固定日期 2026-05-01 至 2026-05-25',
].map((value) => ({ label: value, value }))

const behaviorPathOptions = [
  'App 启动 > 浏览详情 > 留资',
  '广告曝光 > 点击广告 > 预约试驾',
  '浏览车系 > 收藏车系 > 到店',
  '支付订单 > 售后服务',
].map((value) => ({ label: value, value }))

const aggregateOptions = ['不聚合', '总次数', '去重计数', '求和', '平均值', '最大值', '最小值'].map((value) => ({ label: value, value }))

const newCondition = (): TagRuleCondition => ({
  id: `cond-${Date.now()}-${Math.round(Math.random() * 1000)}`,
  sourceType: 'behavior',
  sourceName: '行为数据',
  field: '浏览商品详情页',
  operator: '大于等于',
  value: '1',
  dateMode: 'dynamic',
  dateRange: '最近 7 天，包含今天',
  behaviorPath: behaviorPathOptions[0]?.value,
  aggregateMethod: '不聚合',
})

const markChanged = (): void => {
  emit('change')
}

const addCondition = (): void => {
  group.value.conditions = [...group.value.conditions, newCondition()]
  markChanged()
}

const removeCondition = (conditionId: EntityId): void => {
  group.value.conditions = group.value.conditions.filter((condition) => condition.id !== conditionId)
  markChanged()
}

const conditionChildGroups = (condition: TagRuleCondition): TagRuleGroup[] => {
  if (!condition.childGroups?.length && condition.childGroup) {
    condition.childGroups = [condition.childGroup]
    condition.childGroup = undefined
  }
  condition.childGroups?.forEach((childGroup) => {
    childGroup.relation ??= 'and'
  })
  return condition.childGroups ?? []
}

const addChildGroup = (condition: TagRuleCondition): void => {
  condition.childGroups = [
    ...conditionChildGroups(condition),
    {
      id: `child-${condition.id}-${Date.now()}`,
      relation: 'and',
      logic: 'and',
      conditions: [newCondition()],
      groups: [],
    },
  ]
  markChanged()
}

const removeChildGroup = (condition: TagRuleCondition, childGroupId: EntityId): void => {
  condition.childGroups = conditionChildGroups(condition).filter((childGroup) => childGroup.id !== childGroupId)
  if (!condition.childGroups.length) {
    condition.childGroups = undefined
  }
  markChanged()
}

const updateChildGroup = (condition: TagRuleCondition, childGroupId: EntityId, nextGroup: TagRuleGroup): void => {
  condition.childGroups = conditionChildGroups(condition).map((childGroup) => (childGroup.id === childGroupId ? nextGroup : childGroup))
  markChanged()
}

const syncConditionSource = (condition: TagRuleCondition): void => {
  const label = sourceOptions.find((item) => item.value === condition.sourceType)?.label
  condition.sourceName = label ?? condition.sourceName
  if (condition.sourceType === 'behavior') {
    condition.behaviorPath ||= behaviorPathOptions[0]?.value
    condition.dateMode ||= 'dynamic'
    condition.dateRange ||= dateRangeOptions[2]?.value
  }
  markChanged()
}
</script>

<template>
  <div class="condition-group" :class="{ muted, nested: depth > 0 }">
    <div class="condition-group-head">
      <strong>{{ title }}</strong>
      <n-button size="small" @click="addCondition">添加条件</n-button>
    </div>

    <div v-if="!group.conditions.length" class="empty-group">
      尚未配置条件，请先添加一级条件。
    </div>

    <div v-for="(condition, conditionIndex) in group.conditions" :key="condition.id" class="condition-shell">
      <div v-if="conditionIndex > 0" class="condition-connector">
        <span class="connector-line" />
        <n-select
          v-model:value="group.logic"
          size="small"
          :options="[{ label: '且', value: 'and' }, { label: '或', value: 'or' }]"
          @update:value="markChanged"
        />
        <span class="connector-line" />
      </div>

      <div class="condition-card">
        <div class="condition-main-row">
          <n-select v-model:value="condition.sourceType" :options="sourceOptions" @update:value="() => syncConditionSource(condition)" />
          <n-input v-model:value="condition.field" placeholder="字段/事件/标签" @input="markChanged" />
          <n-select v-model:value="condition.operator" :options="operatorOptions" @update:value="markChanged" />
          <n-input v-model:value="condition.value" placeholder="目标值" @input="markChanged" />
          <n-space class="condition-actions">
            <n-button v-if="depth < maxDepth" size="small" @click="addChildGroup(condition)">添加二级筛选</n-button>
            <n-button size="small" type="error" @click="removeCondition(condition.id)">删除</n-button>
          </n-space>
        </div>

        <div class="condition-extra-row">
          <n-select v-model:value="condition.dateMode" :options="dateModeOptions" @update:value="markChanged" />
          <n-select v-model:value="condition.dateRange" :options="dateRangeOptions" clearable @update:value="markChanged" />
          <n-select v-if="condition.sourceType === 'behavior'" v-model:value="condition.behaviorPath" :options="behaviorPathOptions" clearable @update:value="markChanged" />
          <n-select v-model:value="condition.aggregateMethod" :options="aggregateOptions" @update:value="markChanged" />
          <n-input v-if="condition.aggregateMethod && condition.aggregateMethod !== '不聚合'" v-model:value="condition.aggregateField" placeholder="聚合字段" @input="markChanged" />
          <n-input-number v-model:value="condition.timeWindowDays" :min="1" :max="730" placeholder="窗口天数" @update:value="markChanged" />
        </div>
      </div>

      <div v-if="conditionChildGroups(condition).length" class="nested-group-shell">
        <div v-for="(childGroup, childIndex) in conditionChildGroups(condition)" :key="childGroup.id" class="child-filter-block">
          <div class="child-filter-head">
            <div class="child-filter-title">
              <span>{{ `基于「${condition.field || condition.sourceName}」的二级筛选 ${childIndex + 1}` }}</span>
              <n-select
                v-model:value="childGroup.relation"
                size="small"
                :options="[{ label: '且', value: 'and' }, { label: '或', value: 'or' }]"
                @update:value="markChanged"
              />
            </div>
            <n-button size="small" type="error" secondary @click="removeChildGroup(condition, childGroup.id)">删除二级筛选</n-button>
          </div>
          <TagConditionGroupEditor
            :group="childGroup"
            @update:group="(nextGroup) => updateChildGroup(condition, childGroup.id, nextGroup)"
            title="二级筛选条件"
            :muted="muted"
            :depth="depth + 1"
            :max-depth="maxDepth"
            @change="markChanged"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.condition-group {
  display: grid;
  gap: 10px;
  border: 1px solid #ccfbf1;
  background: #f0fdfa;
  border-radius: 8px;
  padding: 12px;
  min-width: 0;
}

.condition-group.muted {
  border-color: #fecaca;
  background: #fff1f2;
}

.condition-group.nested {
  background: #ffffff;
}

.condition-group-head {
  display: grid;
  grid-template-columns: minmax(160px, 1fr) auto;
  gap: 12px;
  align-items: center;
}

.condition-shell {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.condition-connector {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 10px;
  align-items: center;
  color: #64748b;
}

.condition-connector :deep(.n-select),
.child-filter-title :deep(.n-select) {
  width: 82px;
}

.connector-line {
  height: 1px;
  background: #d1d5db;
}

.condition-card {
  display: grid;
  gap: 8px;
  min-width: 0;
  border: 1px solid rgba(20, 184, 166, 0.16);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.72);
  padding: 10px;
}

.condition-group.muted .condition-card {
  border-color: rgba(244, 63, 94, 0.16);
}

.condition-main-row {
  display: grid;
  grid-template-columns: 116px minmax(180px, 1.2fr) 116px minmax(120px, 1fr) auto;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.condition-extra-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(158px, 1fr));
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.condition-actions {
  justify-content: flex-end;
  flex-wrap: nowrap;
  min-width: max-content;
}

.empty-group {
  color: #64748b;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  padding: 12px;
}

.nested-group-shell {
  display: grid;
  gap: 10px;
  margin-left: 20px;
  padding-left: 14px;
  border-left: 3px solid #99f6e4;
  min-width: 0;
}

.condition-group.muted .nested-group-shell {
  border-left-color: #fecaca;
}

.child-filter-block {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.child-filter-head {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) auto;
  gap: 10px;
  align-items: center;
}

.child-filter-title {
  display: flex;
  gap: 8px;
  align-items: center;
  color: #334155;
  font-weight: 600;
}

@media (max-width: 1200px) {
  .condition-main-row,
  .condition-group-head,
  .condition-connector,
  .child-filter-head {
    grid-template-columns: 1fr;
  }

  .condition-actions {
    justify-content: flex-start;
    min-width: 0;
  }
}
</style>
