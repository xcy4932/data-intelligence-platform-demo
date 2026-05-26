<script setup lang="ts">
import { computed } from 'vue'
import { NGi, NGrid, NFormItem, NSelect } from 'naive-ui'
import TagConditionGroupEditor from '@/components/tags/TagConditionGroupEditor.vue'
import type { TagCreatePayload, TagRuleGroup } from '@/types/tag'
import {
  attributeTableOptions,
  behaviorPathOptions,
  dataSourceOptions,
  dateRangeOptions,
  detailTableOptions,
  ensureRuleGroup,
  eventOptions,
  ruleSourceOptions,
} from './tagEditorOptions'

defineOptions({ name: 'SourceFilterBlock' })

const draft = defineModel<TagCreatePayload>('draft', { required: true })

const props = withDefaults(defineProps<{
  sourceScope?: Array<'behavior' | 'detail' | 'attribute' | 'tag'>
}>(), {
  sourceScope: () => ['behavior', 'detail'],
})

const emit = defineEmits<{
  change: []
}>()

const sourceOptions = computed(() => ruleSourceOptions.filter((item) => props.sourceScope.includes(item.value as 'behavior' | 'detail' | 'attribute' | 'tag')))

const filterGroup = computed<TagRuleGroup>({
  get: () => ensureRuleGroup(draft.value, 'filterGroup', `${draft.value.type}-filter`),
  set: (group) => {
    draft.value.rule.filterGroup = group
  },
})

const excludeGroup = computed<TagRuleGroup>({
  get: () => ensureRuleGroup(draft.value, 'excludeGroup', `${draft.value.type}-exclude`),
  set: (group) => {
    draft.value.rule.excludeGroup = group
  },
})

const markChanged = (): void => {
  emit('change')
}

const updateRuleSourceType = (sourceType: 'behavior' | 'detail' | 'attribute' | 'tag'): void => {
  draft.value.rule.sourceType = sourceType
  draft.value.rule.dataSource = sourceType === 'behavior'
    ? '行为事件表'
    : sourceType === 'detail'
      ? '订单明细表'
      : sourceType === 'attribute'
        ? '用户属性宽表'
        : '已有标签'
  markChanged()
}
</script>

<template>
  <div class="source-filter-block">
    <n-grid :cols="3" :x-gap="16">
      <n-gi>
        <n-form-item label="数据来源类型">
          <n-select :value="draft.rule.sourceType" :options="sourceOptions" @update:value="(value) => updateRuleSourceType(value as 'behavior' | 'detail' | 'attribute' | 'tag')" />
        </n-form-item>
      </n-gi>
      <n-gi>
        <n-form-item label="数据源">
          <n-select v-model:value="draft.rule.dataSource" :options="dataSourceOptions" filterable @update:value="markChanged" />
        </n-form-item>
      </n-gi>
      <n-gi>
        <n-form-item label="日期范围">
          <n-select v-model:value="draft.rule.dateRange" :options="dateRangeOptions" @update:value="markChanged" />
        </n-form-item>
      </n-gi>
      <n-gi v-if="draft.rule.sourceType === 'behavior'">
        <n-form-item label="事件">
          <n-select v-model:value="draft.rule.eventName" :options="eventOptions" filterable @update:value="markChanged" />
        </n-form-item>
      </n-gi>
      <n-gi v-else-if="draft.rule.sourceType === 'detail'">
        <n-form-item label="明细表">
          <n-select v-model:value="draft.rule.detailTable" :options="detailTableOptions" filterable @update:value="markChanged" />
        </n-form-item>
      </n-gi>
      <n-gi v-else-if="draft.rule.sourceType === 'attribute'">
        <n-form-item label="属性表">
          <n-select v-model:value="draft.rule.attributeTable" :options="attributeTableOptions" filterable @update:value="markChanged" />
        </n-form-item>
      </n-gi>
      <n-gi v-if="draft.rule.sourceType === 'behavior'">
        <n-form-item label="行为路径">
          <n-select v-model:value="draft.rule.behaviorPath" :options="behaviorPathOptions" filterable clearable @update:value="markChanged" />
        </n-form-item>
      </n-gi>
    </n-grid>

    <div class="condition-stack">
      <TagConditionGroupEditor v-model:group="filterGroup" title="筛选条件" @change="markChanged" />
      <TagConditionGroupEditor v-model:group="excludeGroup" title="排除条件" muted @change="markChanged" />
    </div>
  </div>
</template>

<style scoped>
.source-filter-block,
.condition-stack {
  display: grid;
  gap: 12px;
  min-width: 0;
}
</style>
