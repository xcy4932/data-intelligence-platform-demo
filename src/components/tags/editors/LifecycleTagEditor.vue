<script setup lang="ts">
import { computed } from 'vue'
import { NAlert } from 'naive-ui'
import TagRuleBuilder from '@/components/tags/TagRuleBuilder.vue'
import type { TagCreatePayload, TagValueRule } from '@/types/tag'

defineOptions({ name: 'LifecycleTagEditor' })

const draft = defineModel<TagCreatePayload>('draft', { required: true })

const emit = defineEmits<{
  change: []
}>()

const values = computed<TagValueRule[]>({
  get: () => draft.value.rule.values ?? [],
  set: (nextValues) => {
    draft.value.rule.values = nextValues
  },
})
</script>

<template>
  <div class="lifecycle-editor">
    <n-alert type="info">
      生命周期标签按阶段顺序产出标签值，每个阶段拥有独立的满足条件和排除条件，阶段数量限制为 2-8 个。
    </n-alert>
    <TagRuleBuilder v-model:values="values" tag-type="lifecycle" @change="emit('change')" />
  </div>
</template>

<style scoped>
.lifecycle-editor {
  display: grid;
  gap: 12px;
}
</style>
