<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useMessage } from 'naive-ui'
import { useRoute } from 'vue-router'
import BigScreenRuntimeShell from '@/components/big-screen/BigScreenRuntimeShell.vue'
import { bigScreenService } from '@/services/bigScreenService'
import type { BigScreenPublishedAccessResult } from '@/types/bigScreen'

const route = useRoute()
const message = useMessage()
const loading = ref(false)
const accessResult = ref<BigScreenPublishedAccessResult | null>(null)
const passwordDraft = ref('')
const activePageId = ref('')

const screenId = computed(() => String(route.params.screenId))
const accessKey = computed(() => String(route.query.accessKey ?? ''))
const accessToken = computed(() => String(route.query.accessToken ?? ''))

const loadPublished = async (password?: string): Promise<void> => {
  loading.value = true

  try {
    const result = await bigScreenService.getPublishedBigScreen(screenId.value, {
      accessKey: accessKey.value,
      accessToken: accessToken.value,
      password,
    })
    accessResult.value = result

    if (result.snapshot) {
      activePageId.value = result.snapshot.homePageId
    }
  } catch (error) {
    message.error(error instanceof Error ? error.message : '发布大屏加载失败')
  } finally {
    loading.value = false
  }
}

const handlePasswordSubmit = async (): Promise<void> => {
  await loadPublished(passwordDraft.value)
}

onMounted(() => loadPublished())
</script>

<template>
  <div class="published-page">
    <BigScreenRuntimeShell
      v-if="accessResult?.state === 'ok' && accessResult.snapshot"
      v-model:page-id="activePageId"
      :snapshot="accessResult.snapshot"
      :title="accessResult.snapshot.name"
      :loading="loading"
      subtitle="已发布"
      source="published"
    />

    <n-spin v-else :show="loading">
      <main v-if="accessResult?.state === 'password_required'" class="gate-card">
        <h1>请输入访问密码</h1>
        <p>当前数字大屏已开启密码验证。</p>
        <n-input v-model:value="passwordDraft" type="password" placeholder="访问密码" show-password-on="click" @keyup.enter="handlePasswordSubmit" />
        <n-button type="primary" block @click="handlePasswordSubmit">验证并访问</n-button>
      </main>

      <main v-else class="gate-card">
        <h1>{{ accessResult?.state === 'offline' ? '该数字大屏已下线' : '无法访问数字大屏' }}</h1>
        <p>{{ accessResult?.message ?? '大屏不存在或无访问权限' }}</p>
      </main>
    </n-spin>
  </div>
</template>

<style scoped lang="scss">
.published-page {
  min-height: 100vh;
  background: #020617;
}

.gate-card {
  width: min(420px, calc(100vw - 40px));
  margin: 18vh auto 0;
  padding: 28px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 8px;
  background: #fff;
}

.gate-card h1 {
  margin: 0 0 10px;
  color: #0f172a;
  font-size: 24px;
}

.gate-card p {
  margin: 0 0 18px;
  color: #64748b;
}

.gate-card :deep(.n-input) {
  margin-bottom: 12px;
}
</style>
