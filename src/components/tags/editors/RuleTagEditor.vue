<script setup lang="ts">
import { computed } from 'vue'
import TagRuleBuilder from '@/components/tags/TagRuleBuilder.vue'
import type { TagCreatePayload, TagValueRule } from '@/types/tag'

defineOptions({ name: 'RuleTagEditor' })

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
  <TagRuleBuilder v-model:values="values" tag-type="rule" @change="emit('change')" />
</template>
