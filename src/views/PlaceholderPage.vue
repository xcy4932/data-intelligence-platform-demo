<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { NCard, NTag } from 'naive-ui'

const route = useRoute()

const title = computed(() => String(route.meta.title || '页面建设中'))
const moduleName = computed(() => String(route.meta.module || '系统模块'))
</script>

<template>
  <div class="page-container">
    <h1 class="page-title">{{ title }}</h1>
    <p class="page-description">
      当前页面属于「{{ moduleName }}」。Demo
      阶段可以先展示页面结构、核心指标卡片、筛选条件、表格和图表区域。
    </p>

    <n-card>
      <template #header>
        {{ title }}
      </template>

      <n-tag type="info">Demo Placeholder</n-tag>

      <p style="margin-top: 16px; color: #6b7280">后续基于模块文档逐个补齐该页面的业务内容。</p>
    </n-card>
  </div>
</template>
