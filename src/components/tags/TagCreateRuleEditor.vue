<script setup lang="ts">
import type { SelectOption } from 'naive-ui'
import CalculationTagEditor from './editors/CalculationTagEditor.vue'
import FirstLastTagEditor from './editors/FirstLastTagEditor.vue'
import ImportTagEditor from './editors/ImportTagEditor.vue'
import LifecycleTagEditor from './editors/LifecycleTagEditor.vue'
import ManualTagEditor from './editors/ManualTagEditor.vue'
import ModelTagEditor from './editors/ModelTagEditor.vue'
import PreferenceTagEditor from './editors/PreferenceTagEditor.vue'
import PriorityTagEditor from './editors/PriorityTagEditor.vue'
import RfmTagEditor from './editors/RfmTagEditor.vue'
import RuleTagEditor from './editors/RuleTagEditor.vue'
import SqlTagEditor from './editors/SqlTagEditor.vue'
import StatisticTagEditor from './editors/StatisticTagEditor.vue'
import type { TagCreatePayload, TagSqlParseResult, TagUploadResult } from '@/types/tag'

defineOptions({ name: 'TagCreateRuleEditor' })

const draft = defineModel<TagCreatePayload>('draft', { required: true })
const sqlResult = defineModel<TagSqlParseResult | undefined>('sqlResult', { required: true })
const uploadResult = defineModel<TagUploadResult | undefined>('uploadResult', { required: true })

const props = defineProps<{
  categoryOptions: SelectOption[]
  valueTypeOptions: SelectOption[]
}>()

const emit = defineEmits<{
  change: []
  openLineage: []
  openModeling: []
}>()
</script>

<template>
  <RuleTagEditor v-if="draft.type === 'rule'" v-model:draft="draft" @change="emit('change')" />
  <StatisticTagEditor v-else-if="draft.type === 'statistic'" v-model:draft="draft" @change="emit('change')" />
  <FirstLastTagEditor v-else-if="draft.type === 'first_last'" v-model:draft="draft" @change="emit('change')" />
  <PreferenceTagEditor v-else-if="draft.type === 'preference'" v-model:draft="draft" @change="emit('change')" />
  <PriorityTagEditor v-else-if="draft.type === 'priority'" v-model:draft="draft" @change="emit('change')" />
  <CalculationTagEditor v-else-if="draft.type === 'calculation'" v-model:draft="draft" @change="emit('change')" />
  <LifecycleTagEditor v-else-if="draft.type === 'lifecycle'" v-model:draft="draft" @change="emit('change')" />
  <RfmTagEditor v-else-if="draft.type === 'rfm'" v-model:draft="draft" @change="emit('change')" />
  <ImportTagEditor
    v-else-if="draft.type === 'import'"
    v-model:draft="draft"
    :category-options="props.categoryOptions"
    :value-type-options="props.valueTypeOptions"
    @change="emit('change')"
  />
  <ManualTagEditor v-else-if="draft.type === 'manual'" v-model:draft="draft" v-model:upload-result="uploadResult" @change="emit('change')" />
  <SqlTagEditor v-else-if="draft.type === 'sql'" v-model:draft="draft" v-model:sql-result="sqlResult" @change="emit('change')" @open-lineage="emit('openLineage')" />
  <ModelTagEditor v-else v-model:draft="draft" @change="emit('change')" @open-modeling="emit('openModeling')" />
</template>
