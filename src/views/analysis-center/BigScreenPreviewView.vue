<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useMessage } from 'naive-ui'
import { useRoute, useRouter } from 'vue-router'
import BigScreenRuntimeShell from '@/components/big-screen/BigScreenRuntimeShell.vue'
import { bigScreenService } from '@/services/bigScreenService'
import type { BigScreenPreviewSession } from '@/types/bigScreen'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const loading = ref(false)
const session = ref<BigScreenPreviewSession | null>(null)
const activePageId = ref('')

const loadPreview = async (): Promise<void> => {
  loading.value = true

  try {
    const result = await bigScreenService.getBigScreenPreview(String(route.params.previewSessionId))
    session.value = result
    activePageId.value = result.startPageId
  } catch (error) {
    message.error(error instanceof Error ? error.message : '预览会话加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadPreview)
</script>

<template>
  <BigScreenRuntimeShell
    v-model:page-id="activePageId"
    :snapshot="session?.snapshot"
    :title="session?.snapshot.name ?? '数字大屏预览'"
    :subtitle="session?.sourceType === 'version' ? '版本预览' : '草稿预览'"
    :loading="loading"
    source="preview"
    empty-title="预览内容不可用"
    empty-description="请返回编辑器重新生成预览会话。"
  >
    <template #actions>
        <n-button @click="router.back()">返回</n-button>
    </template>
  </BigScreenRuntimeShell>
</template>
