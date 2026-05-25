<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useMessage } from 'naive-ui'
import { useRoute, useRouter } from 'vue-router'
import BigScreenRuntimeShell from '@/components/big-screen/BigScreenRuntimeShell.vue'
import { bigScreenService } from '@/services/bigScreenService'
import type { BigScreenPresentationRuntime, BigScreenPresentationRuntimeItem } from '@/types/bigScreen'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const loading = ref(false)
const runtime = ref<BigScreenPresentationRuntime | null>(null)
const currentIndex = ref(0)
const activePageId = ref('')
const tickLeft = ref(0)
let timer: number | undefined

const playableItems = computed<BigScreenPresentationRuntimeItem[]>(() =>
  (runtime.value?.items ?? []).filter((item) => item.state === 'ok' && item.snapshot),
)

const currentItem = computed(() => playableItems.value[currentIndex.value] ?? null)
const currentSnapshot = computed(() => currentItem.value?.snapshot ?? null)

const currentMetaText = computed(() =>
  currentItem.value
    ? `${currentIndex.value + 1} / ${playableItems.value.length} · ${currentItem.value.displayName} · ${tickLeft.value} 秒`
    : '当前方案无可播放大屏',
)

const clearTimer = (): void => {
  if (timer) {
    window.clearInterval(timer)
    timer = undefined
  }
}

const goNext = (): void => {
  const items = playableItems.value
  const plan = runtime.value?.plan

  if (!items.length || !plan) {
    return
  }

  if (currentIndex.value >= items.length - 1) {
    if (plan.loopMode === 'once') {
      tickLeft.value = 0
      clearTimer()
      return
    }

    currentIndex.value = 0
    return
  }

  currentIndex.value += 1
}

const startTimer = (): void => {
  clearTimer()
  const item = currentItem.value

  if (!item) {
    return
  }

  tickLeft.value = item.durationSeconds
  timer = window.setInterval(() => {
    tickLeft.value -= 1
    if (tickLeft.value <= 0) {
      goNext()
    }
  }, 1000)
}

const loadRuntime = async (): Promise<void> => {
  loading.value = true

  try {
    const result = await bigScreenService.getBigScreenPresentationRuntime(String(route.params.planId))
    runtime.value = result
    currentIndex.value = 0
    const skipped = result.items.filter((item) => item.state !== 'ok')
    if (skipped.length) {
      message.warning(`有 ${skipped.length} 个大屏不可播放，投屏时会自动跳过`)
    }
    if (!result.items.some((item) => item.state === 'ok')) {
      message.error('当前方案无可播放大屏')
    }
    startTimer()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载演播方案失败')
  } finally {
    loading.value = false
  }
}

watch(currentItem, () => {
  activePageId.value = currentSnapshot.value?.homePageId ?? ''
  startTimer()
})

onMounted(loadRuntime)
onBeforeUnmount(clearTimer)
</script>

<template>
  <BigScreenRuntimeShell
    v-model:page-id="activePageId"
    :snapshot="currentSnapshot"
    :title="runtime?.plan.name ?? '演播厅'"
    :subtitle="currentMetaText"
    :loading="loading"
    source="presentation"
    empty-title="当前方案无可播放大屏"
    empty-description="请确认方案中至少包含一个已发布且可访问的大屏。"
  >
    <template #actions>
        <n-button size="small" @click="goNext">下一屏</n-button>
        <n-button size="small" @click="router.push('/analysis-center/big-screens/presentation-hall')">退出</n-button>
    </template>
  </BigScreenRuntimeShell>
</template>
