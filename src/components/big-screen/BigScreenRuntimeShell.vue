<script setup lang="ts">
import { computed } from 'vue'
import BigScreenSnapshotRenderer from './BigScreenSnapshotRenderer.vue'
import {
  createBigScreenRuntimeContext,
  getBigScreenRuntimePageOptions,
  resolveBigScreenRuntimePageId,
} from './runtimeContext'
import type { BigScreenRuntimeSource, BigScreenSnapshot } from '@/types/bigScreen'

const props = withDefaults(
  defineProps<{
    snapshot?: BigScreenSnapshot | null
    pageId?: string
    title?: string
    subtitle?: string
    source?: BigScreenRuntimeSource
    loading?: boolean
    emptyTitle?: string
    emptyDescription?: string
    showTopbar?: boolean
  }>(),
  {
    snapshot: null,
    pageId: '',
    title: '',
    subtitle: '',
    source: 'preview',
    loading: false,
    emptyTitle: '当前大屏不可用',
    emptyDescription: '请确认内容已保存、发布或仍在有效访问期内。',
    showTopbar: true,
  },
)

const emit = defineEmits<{
  'update:pageId': [value: string]
}>()

const pageOptions = computed(() => getBigScreenRuntimePageOptions(props.snapshot))

const runtimeContext = computed(() =>
  props.snapshot ? createBigScreenRuntimeContext(props.snapshot, props.pageId, props.source) : null,
)

const resolvedPageId = computed(() => resolveBigScreenRuntimePageId(props.snapshot, props.pageId))

const runtimeTitle = computed(() => props.title || props.snapshot?.name || '数字大屏')

const handlePageChange = (value: string): void => {
  emit('update:pageId', value)
}
</script>

<template>
  <div class="big-screen-runtime-shell">
    <header v-if="showTopbar" class="runtime-topbar">
      <div class="runtime-title">
        <strong>{{ runtimeTitle }}</strong>
        <span v-if="subtitle">{{ subtitle }}</span>
      </div>
      <n-space align="center">
        <n-select
          v-if="pageOptions.length > 1"
          :value="resolvedPageId"
          :options="pageOptions"
          class="page-select"
          @update:value="handlePageChange"
        />
        <slot name="actions" :context="runtimeContext" />
      </n-space>
    </header>

    <n-spin :show="loading">
      <main v-if="snapshot" class="runtime-stage">
        <BigScreenSnapshotRenderer :snapshot="snapshot" :page-id="resolvedPageId" />
      </main>
      <main v-else class="runtime-empty">
        <h1>{{ emptyTitle }}</h1>
        <p>{{ emptyDescription }}</p>
        <slot name="empty-actions" />
      </main>
    </n-spin>
  </div>
</template>

<style scoped lang="scss">
.big-screen-runtime-shell {
  min-height: 100vh;
  background: #020617;
}

.runtime-topbar {
  min-height: 54px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 18px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(2, 6, 23, 0.95);
  color: #f8fafc;
}

.runtime-title {
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.runtime-title strong,
.runtime-title span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.runtime-title span {
  color: #94a3b8;
  font-size: 13px;
}

.page-select {
  width: 180px;
}

.runtime-stage {
  width: calc(100vw - 48px);
  margin: 0 auto;
  padding: 26px 0;
}

.runtime-empty {
  width: min(460px, calc(100vw - 40px));
  margin: 18vh auto 0;
  padding: 28px;
  border: 1px solid rgba(148, 163, 184, 0.26);
  border-radius: 8px;
  background: #fff;
}

.runtime-empty h1 {
  margin: 0 0 10px;
  color: #111827;
  font-size: 24px;
}

.runtime-empty p {
  margin: 0;
  color: #64748b;
}

@media (max-width: 720px) {
  .runtime-topbar {
    align-items: flex-start;
    flex-direction: column;
    padding: 12px 14px;
  }

  .runtime-title {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }

  .page-select {
    width: min(220px, calc(100vw - 28px));
  }

  .runtime-stage {
    width: calc(100vw - 24px);
    padding: 16px 0;
  }
}
</style>
