# 事件分析模块 PRD

## 模块定位

事件分析模块位于 `数据洞察 -> 事件分析`，是面向数据分析师、运营人员和产品经理的行为分析工作台。它基于用户行为事件构建指标，通过筛选、分组、对照、趋势、异常诊断和用户下钻，定位业务指标波动原因，并把分析结论转化为用户分群、智能运营任务和 A/B 测试方案。

本 Demo 的核心主线：

广告观看次数下降 -> 事件分析定位原因 -> 保存用户分群 -> 创建智能运营任务 -> 创建 A/B 测试 -> 效果评估。

## 页面结构

页面采用左侧配置、右侧结果的工作台结构：

- 顶部操作区：标题、模板选择、保存分析、保存到看板、下载数据、创建人群、创建运营任务、创建 A/B 实验。
- 左侧配置区：指标配置、细分筛选、属性分组、对照组配置。
- 右侧结果区：时间与图表配置、核心指标卡、趋势折线图、贡献度柱形图、明细表、异常诊断面板、用户详情抽屉。

默认加载“广告观看下降分析模板”，避免演示时进入空白页面。

## 字段设计

核心类型包括：

- `EventDefinition`
- `EventProperty`
- `EventMetricConfig`
- `MetricOperator`
- `FilterCondition`
- `GroupByConfig`
- `ComparisonGroup`
- `MetricTrendPoint`
- `DimensionContribution`
- `EventAnalysisDetailRow`
- `AnomalyDiagnosis`
- `RecommendedAction`

所有 mock 和 service 返回值必须有 TypeScript 类型，不允许使用 `any`。

## Mock 数据设计

Mock 数据围绕广告观看下降场景：

- 过去 14 天广告观看次数整体下降。
- 下降主要发生在低金币高活跃用户。
- 金币不足弹窗广告位下降贡献最高。
- 斗地主场景下降明显。
- 该人群约 28,640 人。
- 系统建议创建低金币用户激励广告任务，并通过 A/B 测试验证三种策略。

Mock 数据至少包含：

- 10 个事件定义。
- 6 个指标配置。
- 14 条趋势数据。
- 5 条异常贡献维度。
- 20 条明细数据。
- 30 条受影响用户。

## 开发任务

1. 创建 `src/types/eventAnalysis.ts`。
2. 创建 `src/mock/eventAnalysis.ts`。
3. 创建 `src/services/eventAnalysisService.ts`。
4. 创建 `src/views/data-insight/EventAnalysisView.vue`。
5. 增加 `/data-insight/event-analysis` 路由。
6. 将数据洞察菜单中的“指标分析”改为“事件分析”。
7. 接入 ECharts 趋势图和贡献度图。
8. 实现明细表行点击打开用户详情抽屉。
9. 实现存为用户分群、创建运营任务、创建 A/B 实验的下游跳转。

## 验收标准

- 访问 `/data-insight/event-analysis` 可进入页面。
- 默认展示广告观看下降分析模板。
- 页面可讲清楚广告观看下降、异常诊断、目标人群、运营任务和实验验证链路。
- 指标配置、筛选配置、属性分组、对照组、指标卡、趋势图、贡献度图、明细表、异常诊断、用户详情抽屉完整可见。
- 页面数据来自 `eventAnalysisService`。
- `npm run lint`、`npm run type-check`、`npm run build` 通过。
