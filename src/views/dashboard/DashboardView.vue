<script setup lang="ts">
import { NCard, NGrid, NGi, NStatistic, NTag, NTimeline, NTimelineItem } from 'naive-ui'
</script>

<template>
  <div class="page-container">
    <h1 class="page-title">首页驾驶舱</h1>
    <p class="page-description">
      用于演示从指标异常发现，到用户洞察、智能运营、A/B 测试和效果评估的完整闭环。
    </p>

    <n-grid :cols="4" :x-gap="16" :y-gap="16">
      <n-gi>
        <n-card>
          <n-statistic label="今日活跃用户" value="128,430" />
          <n-tag type="success" size="small">+8.6%</n-tag>
        </n-card>
      </n-gi>

      <n-gi>
        <n-card>
          <n-statistic label="广告观看次数" value="356,920" />
          <n-tag type="warning" size="small">-12.4%</n-tag>
        </n-card>
      </n-gi>

      <n-gi>
        <n-card>
          <n-statistic label="运营任务执行中" value="18" />
          <n-tag type="info" size="small">5 个待审批</n-tag>
        </n-card>
      </n-gi>

      <n-gi>
        <n-card>
          <n-statistic label="运行中实验" value="7" />
          <n-tag type="success" size="small">2 个显著提升</n-tag>
        </n-card>
      </n-gi>
    </n-grid>

    <n-grid :cols="2" :x-gap="16" style="margin-top: 16px">
      <n-gi>
        <n-card title="智能运营建议">
          <n-timeline>
            <n-timeline-item
              type="warning"
              title="广告观看次数下降"
              content="低金币用户广告观看率连续 3 天下滑，建议创建激励广告入口优化任务。"
            />
            <n-timeline-item
              type="info"
              title="召回人群推荐"
              content="系统识别出 7 日未登录但历史付费较高用户 12,840 人。"
            />
            <n-timeline-item
              type="success"
              title="实验结果"
              content="金币不足弹窗引导实验 B 组广告观看率提升 18.6%。"
            />
          </n-timeline>
        </n-card>
      </n-gi>

      <n-gi>
        <n-card title="Demo 演示主线">
          <n-timeline>
            <n-timeline-item
              title="1. 发现指标异常"
              content="从首页或监控中心发现广告观看次数下降。"
            />
            <n-timeline-item title="2. 分析原因" content="进入指标分析、漏斗分析、留存分析。" />
            <n-timeline-item title="3. 圈选人群" content="基于标签和行为筛选目标用户。" />
            <n-timeline-item title="4. 创建运营任务" content="配置策略、触达方式和执行时间。" />
            <n-timeline-item title="5. 配置 A/B 测试" content="比较不同运营策略的真实效果。" />
            <n-timeline-item title="6. 复盘效果" content="沉淀为指标监控和运营策略资产。" />
          </n-timeline>
        </n-card>
      </n-gi>
    </n-grid>
  </div>
</template>
