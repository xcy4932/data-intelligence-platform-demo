<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { NBreadcrumb, NBreadcrumbItem, NResult, NTag, NText } from 'naive-ui'

const route = useRoute()

const title = computed(() => String(route.meta.title ?? '组织与身份中心'))
const pageKey = computed(() => String(route.meta.pageKey ?? ''))
const breadcrumbItems = computed(() => {
  const breadcrumb = route.meta.breadcrumb
  return Array.isArray(breadcrumb) ? breadcrumb.map(String) : ['组织与身份中心', title.value]
})
const isForbidden = computed(() => route.meta.shellState === 'forbidden')
</script>

<template>
  <section class="organization-shell">
    <n-breadcrumb>
      <n-breadcrumb-item v-for="item in breadcrumbItems" :key="item">
        {{ item }}
      </n-breadcrumb-item>
    </n-breadcrumb>

    <div class="shell-heading">
      <div>
        <h1>{{ title }}</h1>
        <n-text depth="3">组织与身份中心</n-text>
      </div>
      <n-tag :type="isForbidden ? 'error' : 'warning'" round>
        {{ isForbidden ? '403' : '待实现' }}
      </n-tag>
    </div>

    <div class="shell-state">
      <n-result
        :status="isForbidden ? '403' : 'info'"
        :title="isForbidden ? '暂无访问权限' : `${title}待实现`"
        :description="
          isForbidden
            ? '该入口已接入受控权限状态，具体权限矩阵将在后续切片收口。'
            : '当前仅完成路由、菜单、面包屑和基础页面壳；业务内容将在后续切片逐步实现。'
        "
      />
      <n-text depth="3" class="page-key">pageKey: {{ pageKey }}</n-text>
    </div>
  </section>
</template>

<style scoped lang="scss">
.organization-shell {
  min-height: 100%;
  padding: 24px;
}

.shell-heading {
  margin-top: 16px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.shell-heading h1 {
  margin: 0 0 6px;
  font-size: 24px;
  line-height: 1.3;
  font-weight: 700;
}

.shell-state {
  margin-top: 24px;
  min-height: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.page-key {
  margin-top: 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
}
</style>
