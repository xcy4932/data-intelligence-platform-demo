<script setup lang="ts">
import { computed } from 'vue'
import { NButton, NResult, NSpace, NSpin, NText } from 'naive-ui'
import type { PermissionDecision } from '@/types/organizationIdentity'

export type OrgIdentityStateKind =
  | 'loading'
  | 'empty'
  | 'filtered-empty'
  | 'error'
  | '403'
  | '404'
  | 'disabled'
  | 'success'
  | 'failure'

const defaultContent: Record<OrgIdentityStateKind, { title: string; description: string }> = {
  loading: { title: '加载中', description: '正在加载数据' },
  empty: { title: '暂无数据', description: '暂无数据' },
  'filtered-empty': { title: '暂无结果', description: '未找到符合条件的数据，请调整筛选条件后重试' },
  error: { title: '加载失败', description: '加载失败，请重试' },
  '403': { title: '暂无权限', description: '暂无权限访问该页面' },
  '404': { title: '资源不存在', description: '资源不存在或已被删除' },
  disabled: { title: '当前不可操作', description: '当前状态下该操作不可用' },
  success: { title: '操作成功', description: '操作已完成' },
  failure: { title: '操作失败', description: '操作未完成，请重试' },
}

const resultStatusMap: Record<Exclude<OrgIdentityStateKind, 'loading'>, 'info' | 'success' | 'warning' | 'error' | '403' | '404'> = {
  empty: 'info',
  'filtered-empty': 'info',
  error: 'error',
  '403': '403',
  '404': '404',
  disabled: 'warning',
  success: 'success',
  failure: 'error',
}

const props = withDefaults(
  defineProps<{
    state: OrgIdentityStateKind
    title?: string
    description?: string
    retryLabel?: string
    showRetry?: boolean
    primaryActionLabel?: string
    primaryActionDecision?: PermissionDecision | null
    showPrimaryAction?: boolean
    compact?: boolean
  }>(),
  {
    title: undefined,
    description: undefined,
    retryLabel: '重新加载',
    showRetry: false,
    primaryActionLabel: undefined,
    primaryActionDecision: null,
    showPrimaryAction: false,
    compact: false,
  },
)

const emit = defineEmits<{
  retry: []
  primaryAction: []
}>()

const resolvedTitle = computed(() => props.title ?? defaultContent[props.state].title)
const resolvedDescription = computed(() => props.description ?? defaultContent[props.state].description)
const resultStatus = computed(() => (props.state === 'loading' ? 'info' : resultStatusMap[props.state]))
const canShowRetry = computed(() => ['error', 'failure'].includes(props.state) && props.showRetry)
const canShowPrimaryAction = computed(
  () =>
    ['empty', 'filtered-empty'].includes(props.state) &&
    props.showPrimaryAction &&
    Boolean(props.primaryActionLabel) &&
    props.primaryActionDecision?.allowed === true,
)
const hasFooter = computed(() => canShowRetry.value || canShowPrimaryAction.value)
</script>

<template>
  <section class="org-identity-state-block" :class="{ 'is-compact': compact }">
    <div v-if="state === 'loading'" class="loading-state">
      <n-spin size="medium" />
      <div class="loading-copy">
        <strong>{{ resolvedTitle }}</strong>
        <n-text depth="3">{{ resolvedDescription }}</n-text>
      </div>
    </div>

    <n-result v-else :status="resultStatus" :title="resolvedTitle" :description="resolvedDescription">
      <template v-if="hasFooter" #footer>
        <n-space justify="center">
          <n-button v-if="canShowRetry" secondary @click="emit('retry')">
            {{ retryLabel }}
          </n-button>
          <n-button v-if="canShowPrimaryAction" type="primary" @click="emit('primaryAction')">
            {{ primaryActionLabel }}
          </n-button>
        </n-space>
      </template>
    </n-result>
  </section>
</template>

<style scoped lang="scss">
.org-identity-state-block {
  min-height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.org-identity-state-block.is-compact {
  min-height: 160px;
  padding: 20px 16px;
}

.loading-state {
  display: flex;
  align-items: center;
  gap: 14px;
  color: #1f2937;
}

.loading-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>
