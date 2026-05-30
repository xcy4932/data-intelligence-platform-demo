<template>
  <section class="not-found-view">
    <n-result
      status="404"
      title="页面不存在"
      description="当前访问的地址没有匹配到可用页面。"
    />
  </section>
</template>

<script setup lang="ts">
import { NResult } from 'naive-ui'
</script>

<style scoped lang="scss">
.not-found-view {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #fff;
}
</style>
