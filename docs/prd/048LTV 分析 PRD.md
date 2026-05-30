**LTV 分析 PRD**

**1. 功能定位**

LTV 分析用于衡量某一批起始用户在后续生命周期内持续产生的真实营收价值。

本产品中的 LTV 不是预测模型，不做未来收入预测，只计算已经发生的真实营收数据。用户通过配置“起始事件”定义某一天的目标用户 cohort，再配置一个或多个“营收事件”计算这些用户从起始日到第 n 天累计产生的收入，最终得到 LTV0、LTV1、LTV2……LTV30、LTV60、LTV 至今等指标。

核心问题：

某一天进入产品、注册、激活、首次启动、首次完成某行为的用户，后续每天平均带来了多少收入？

不同日期进入的用户，LTV 表现是否有差异？

不同渠道、版本、系统、地区、用户分群的 LTV 是否不同？

内购收入和广告收入分别贡献了多少 LTV？

某一天的新增用户在第 1 天、第 7 天、第 30 天是否已经覆盖获客成本？

本功能必须支持两类营收：

1. 内购事件营收：通过某个事件的数值属性求和，例如支付金额、充值金额、订单金额。

2. 广告事件营收：通过广告事件次数乘以对应日期 eCPM / 1000 计算广告收入。

**2. 页面入口与整体布局**

**2.1 页面入口**

页面路径：

数据洞察/ LTV 分析

页面支持 3 种打开方式：

1. 新建空白 LTV 分析。

2. 从保存分析打开。

3. 从看板组件跳转回原分析。

**2.2 页面整体结构**

页面分为 7 个区域：

| **区域** | **位置** | **作用** |
| --- | --- | --- |
| 顶部操作区 | 页面顶部 | 项目、主体、统计口径、查询、重置、保存分析、保存到看板、导出 |
| 起始事件配置区 | 页面上半部分左侧 | 定义每日起始用户 cohort |
| 营收事件配置区 | 起始事件下方 | 配置内购营收事件、广告营收事件，可添加多个 LTV 指标 |
| 全局筛选与对照组区 | 配置区右侧 | 配置目标用户筛选、对照组 |
| 属性分组区 | 配置区下方 | 按用户属性、事件属性、用户标签拆分 LTV |
| 图表展示区 | 页面中部 | LTV 趋势图、LTV 对比图 |
| 明细表格区 | 页面底部 | 金字塔表格，展示日期、新增用户数、LTV0-LTVn |

**2.3 首次进入默认状态**

首次进入页面：

| **配置项** | **默认值** |
| --- | --- |
| 起始事件 | 未选择 |
| 起始事件过滤 | 无 |
| 营收事件 | 空 |
| 营收事件类型 | 未选择 |
| 细分筛选 | 全部用户 |
| 对照组 | 无 |
| 属性分组 | 无 |
| 时间范围 | 最近 7 天 |
| 图表模式 | LTV 趋势 |
| 趋势对象 | 总体 |
| LTV 对比指标 | LTV0 |
| 展示指标 | 汇总 LTV |
| LTV 窗口 | LTV0-LTV10、LTV14、LTV30、LTV60、LTV 至今 |
| 表格小数位 | 2 位 |
| 保存状态 | 未保存 |

空状态：

请选择起始事件和至少一个营收事件后开始 LTV 分析

主按钮：

选择起始事件

**3. 核心概念**

**3.1 起始事件**

起始事件用于定义每日 cohort。

例如：

App 激活

注册成功

首次登录

应用启动

完成新手引导

首次进入游戏

首次下单

系统按日期统计触发起始事件的去重用户数，作为该日期的“起始用户数”或“新增用户数”。文档中明确说明，LTV 分析通过统计某一天触发“起始事件”的用户 uid 来统计当天新增用户数。

数据结构：

type StartEventConfig = {

eventName: string;

eventDisplayName: string;

filters?: FilterGroup;

deduplication: {

subjectType: "user\_id" | "device\_id" | "account\_id" | "anonymous\_id" | "custom\_id";

strategy: "once\_per\_day" | "first\_time\_only";

};

};

默认去重规则：

once\_per\_day

即同一个用户在同一天多次触发起始事件，只计为该日期的 1 个起始用户。

可选增强规则：

first\_time\_only

表示只把用户历史首次触发起始事件的日期作为 cohort 日期，适合严格“新用户 LTV”。

**3.2 起始用户数**

定义：

$$
\text{StartUsers}\_{d}=\text{CountDistinctUsers}(\text{StartEvent on day }d)。
$$

其中：

d = 起始日期

StartUsers\_d = d 日触发起始事件的去重用户数

如果起始事件配置了过滤条件，只有满足过滤条件的事件才用于生成 cohort。

示例：

起始事件：注册成功

过滤条件：注册方式 = 手机号

日期：2026-05-01

StartUsers\_2026-05-01 = 2026-05-01 当天注册方式为手机号的去重用户数

**3.3 营收事件**

营收事件用于计算起始用户后续产生的收入。

支持两类：

1. 内购事件指标

2. 广告事件指标

一个 LTV 分析最多支持 10 个营收事件指标。文档中也说明，可通过“+LTV 指标”添加多个营收事件指标，最多支持 10 个，并且每个营收事件都支持过滤条件。

通用结构：

type RevenueMetricConfig =

| IAPRevenueMetricConfig

| AdRevenueMetricConfig;

type BaseRevenueMetricConfig = {

id: string;

name: string;

type: "IAP" | "AD";

eventName: string;

eventDisplayName: string;

filters?: FilterGroup;

enabled: boolean;

};

**3.4 LTVn**

LTVn 表示某日起始用户从起始日到第 n 天累计产生的人均收入。

例如：

LTV0：起始日当天累计收入 / 起始用户数

LTV1：起始日当天 + 第 1 天累计收入 / 起始用户数

LTV7：起始日当天到第 7 天累计收入 / 起始用户数

LTV30：起始日当天到第 30 天累计收入 / 起始用户数

通用公式：

$$
\text{LTV}*{d,n}=\frac{\sum*{u\in C\_d}\sum\_{t=d}^{d+n}\text{Revenue}(u,t)}{|C\_d|}。
$$

其中：

C\_d = d 日起始用户集合

|C\_d| = d 日起始用户数

Revenue(u,t) = 用户 u 在日期 t 产生的营收

**3.5 汇总 LTV**

当配置多个营收事件时，系统需要同时计算：

1. 每个营收事件自己的 LTVn。

2. 汇总 LTVn。

汇总 LTVn 公式：

$$
\text{TotalLTV}*{d,n}=\sum*{m=1}^{M}\text{LTV}\_{d,n}^{(m)}。
$$

其中：

M = 已启用的营收指标数量

文档中也说明，汇总 LTVn 等于所有内购事件 LTVn 加所有广告事件 LTVn，并默认展示在图表区。

**4. 起始事件配置**

**4.1 选择起始事件**

**功能逻辑**

起始事件用于圈定 LTV 分析的 cohort。用户必须先选择起始事件，否则不能查询。

**交互逻辑**

点击起始事件选择框：

1. 打开事件选择器。

2. 支持按事件中文名、英文名、事件描述搜索。

3. 支持按事件分类筛选。

4. 支持最近使用事件。

5. 支持收藏事件。

6. 选择事件后关闭选择器。

7. 回填事件显示名。

8. 清空当前查询结果。

9. 页面进入未保存状态。

事件选择器返回：

type EventOption = {

eventName: string;

eventDisplayName: string;

eventType: "normal" | "virtual" | "visual";

description?: string;

hasPermission: boolean;

};

若用户选择无权限事件：

不允许选择，并提示：你没有权限使用该事件，请联系管理员。

**4.2 起始事件过滤条件**

**功能逻辑**

起始事件过滤用于限制哪些起始事件可以进入 cohort。

例如：

注册成功 且 渠道 = 广告投放

应用启动 且 query\_type 不为空

App 激活 且 安装类型 = new

过滤结构：

type FilterGroup = {

relation: "AND" | "OR";

conditions: Array<FilterCondition | FilterGroup>;

};

type FilterCondition = {

fieldType:

| "event\_property"

| "event\_public\_property"

| "user\_property"

| "user\_tag"

| "cohort"

| "subject\_property";

fieldName: string;

operator:

| "eq"

| "neq"

| "in"

| "not\_in"

| "contains"

| "not\_contains"

| "gt"

| "gte"

| "lt"

| "lte"

| "between"

| "is\_null"

| "not\_null";

value: any;

};

**交互逻辑**

点击起始事件右侧过滤按钮：

1. 打开过滤条件浮层。

2. 默认显示“+ 添加条件”。

3. 用户点击添加条件后，出现字段选择器、操作符选择器和值输入框。

4. 多个条件默认 AND。

5. 用户可切换 AND / OR。

6. 支持最多两层嵌套。

7. 点击确定时校验所有条件完整性。

8. 如果存在未完成条件，条件行标红，并提示“请完善过滤条件”。

9. 保存成功后，浮层关闭。

10. 查询结果清空，页面进入未保存状态。

**4.3 起始用户去重策略**

**功能逻辑**

起始用户数必须去重，否则一个用户一天多次触发起始事件会导致 LTV 分母膨胀。

支持两种策略：

| **策略** | **含义** | **适用场景** |
| --- | --- | --- |
| once\_per\_day | 同一用户每天最多进入一次 cohort | 活跃用户 LTV、启动 LTV |
| first\_time\_only | 用户历史首次触发起始事件时进入 cohort | 新用户 LTV、注册 LTV |

字段：

type StartUserDeduplicationStrategy = "once\_per\_day" | "first\_time\_only";

默认：

once\_per\_day

**交互逻辑**

高级设置中提供：

起始用户口径：

- 每日触发去重

- 历史首次触发

切换后：

1. 清空查询结果。

2. 页面进入未保存状态。

3. 提示“起始用户口径已变更，请重新查询。”

**5. 内购事件指标**

**5.1 功能逻辑**

内购事件指标通过事件数值属性求和计算收入。

示例：

事件：支付成功

属性：pay\_amount

利润比例：100%

过滤条件：订单状态 = 成功

用户在起始日到第 n 天产生的所有支付成功事件，其 pay\_amount 累计求和，再乘以利润比例，作为内购营收。文档也说明，内购事件指标选择营收事件及属性后，会对配置的事件属性累计求和，并支持配置利润比例，最多 3 位小数；营收效果数据为属性累计值乘以利润比例。

**5.2 数据结构**

type IAPRevenueMetricConfig = BaseRevenueMetricConfig & {

type: "IAP";

propertyName: string;

propertyDisplayName: string;

propertyType: "number";

profitRatio: number;

currency?: string;

};

示例：

{

"id": "revenue\_1",

"name": "内购收入",

"type": "IAP",

"eventName": "pay\_success",

"eventDisplayName": "支付成功",

"propertyName": "pay\_amount",

"propertyDisplayName": "支付金额",

"propertyType": "number",

"profitRatio": 1,

"currency": "CNY",

"enabled": true

}

**5.3 配置交互**

点击：

+ LTV 指标

选择：

内购事件指标

配置流程：

1. 系统新增一个营收指标卡片。

2. 用户选择营收事件。

3. 系统加载该事件的数值属性。

4. 用户选择收入属性。

5. 用户输入利润比例。

6. 用户可添加事件过滤条件。

7. 用户可修改指标名称。

8. 点击查询时统一校验。

**5.4 利润比例输入规则**

字段：

profitRatio: number;

输入展示：

百分比输入框，例如 100%、85.5%、12.345%

存储值：

100% 存储为 1

85.5% 存储为 0.855

12.345% 存储为 0.12345

校验规则：

| **校验项** | **规则** |
| --- | --- |
| 是否必填 | 必填 |
| 最小值 | 0 |
| 最大值 | 100% |
| 小数位 | 最多 3 位百分比小数 |
| 空值 | 不允许查询 |
| 非数字 | 不允许查询 |

错误提示：

请输入 0% 到 100% 之间的利润比例，最多支持 3 位小数。

**5.5 内购收入计算**

对某日起始 cohort：

$$
\text{IAPRevenue}*{d,n}^{(m)}=\sum*{u\in C\_d}\sum\_{t=d}^{d+n}\sum\_{e\in E\_{u,t}^{(m)}}\text{propertyValue}(e)\times \text{profitRatio}\_{m}。
$$

内购 LTV：

$$
\text{IAPLTV}*{d,n}^{(m)}=\frac{\text{IAPRevenue}*{d,n}^{(m)}}{|C\_d|}。
$$

规则：

1. 只统计属于 C\_d 的用户。

2. 只统计日期范围 d 到 d+n 内发生的营收事件。

3. 只统计满足营收事件过滤条件的事件。

4. propertyValue 必须为数值。

5. propertyValue 为空、非数值时，该事件不计入收入。

6. profitRatio 先转换为小数后参与计算。

7. 最终 LTV 展示保留 2 位小数，底层计算保留高精度 decimal。

**6. 广告事件指标**

**6.1 功能逻辑**

广告事件指标通过广告事件次数和每日 eCPM 计算广告收入。

示例：

事件：广告展示完成

事件次数：720

当日 eCPM：65

广告收入 = 720 \* 65 / 1000 = 46.8

广告 LTV：

$$
\text{AdLTV}*{d,n}^{(m)}=\frac{\sum*{u\in C\_d}\sum\_{t=d}^{d+n}\text{AdPV}*{u,t}^{(m)}\times \frac{\text{eCPM}*{t}^{(m)}}{1000}}{|C\_d|}。
$$

文档中的广告事件指标公式也是：广告点击次数乘以每日 eCPM / 1000 后累计，再除以当天新增用户数。

**6.2 数据结构**

type AdRevenueMetricConfig = BaseRevenueMetricConfig & {

type: "AD";

ecpmFileId: string;

ecpmMapping: Array<{

date: string;

ecpm: number;

}>;

ecpmMissingStrategy: "ERROR" | "FILL\_ZERO" | "USE\_PREVIOUS";

};

示例：

{

"id": "revenue\_2",

"name": "广告收入",

"type": "AD",

"eventName": "ad\_show\_complete",

"eventDisplayName": "广告展示完成",

"ecpmFileId": "file\_123",

"ecpmMissingStrategy": "ERROR",

"enabled": true

}

**6.3 配置交互**

点击：

+ LTV 指标

选择：

广告事件指标

配置流程：

1. 系统新增广告营收指标卡片。

2. 用户选择广告事件。

3. 用户可配置广告事件过滤条件。

4. 用户点击“下载 eCPM 模板”。

5. 系统下载模板文件。

6. 用户填写日期和 eCPM。

7. 用户上传 eCPM 文件。

8. 前端上传到后端解析。

9. 后端返回解析结果、错误行、日期覆盖范围。

10. 如果解析无错误，卡片展示上传成功、日期范围、记录数。

11. 如果解析有错误，展示错误表格，不允许查询。

**6.4 eCPM 模板格式**

模板字段：

| **字段** | **类型** | **必填** | **示例** |
| --- | --- | --- | --- |
| date | date | 是 | 2026-05-01 |
| ecpm | number | 是 | 65 |

CSV 示例：

date,ecpm

2026-05-01,65

2026-05-02,58

2026-05-03,72

解析规则：

1. date 必须为 YYYY-MM-DD。

2. ecpm 必须为非负数字。

3. 同一日期重复出现时，默认以后出现的值覆盖前面的值，并在解析结果中给出 warning。

4. 空行跳过。

5. 表头缺失时解析失败。

6. date 或 ecpm 任一字段为空时，该行失败。

**6.5 eCPM 缺失处理**

由于查询时间范围和 LTV 窗口会扩展到未来若干天，eCPM 文件可能缺少某些日期。

字段：

ecpmMissingStrategy: "ERROR" | "FILL\_ZERO" | "USE\_PREVIOUS";

默认：

ERROR

策略含义：

| **策略** | **逻辑** |
| --- | --- |
| ERROR | 缺少任一需要日期的 eCPM 时，查询失败 |
| FILL\_ZERO | 缺失日期 eCPM 按 0 计算 |
| USE\_PREVIOUS | 使用最近一个早于该日期的 eCPM |

交互：

1. 用户上传 eCPM 后，系统根据当前时间范围和最大 LTV 窗口检查日期覆盖。

2. 如果缺失日期且策略为 ERROR，查询按钮置灰。

3. 提示：“eCPM 文件缺少 2026-05-10 至 2026-05-15 的数据，请补充后再查询。”

4. 用户可在高级设置中切换缺失策略。

5. 切换为 FILL\_ZERO 或 USE\_PREVIOUS 后允许查询，但图表上方展示黄色提示。

**6.6 广告收入计算**

对某个广告指标 m：

AdPV\_{u,t}^{(m)} = 用户 u 在日期 t 触发广告事件 m 的次数

eCPM\_t^{(m)} = 指标 m 在日期 t 的 eCPM

每日广告收入：

$$
\text{AdRevenue}*{u,t}^{(m)}=\text{AdPV}*{u,t}^{(m)}\times\frac{\text{eCPM}\_{t}^{(m)}}{1000}。
$$

累计广告收入：

$$
\text{AdRevenue}*{d,n}^{(m)}=\sum*{u\in C\_d}\sum\_{t=d}^{d+n}\text{AdPV}*{u,t}^{(m)}\times\frac{\text{eCPM}*{t}^{(m)}}{1000}。
$$

广告 LTV：

$$
\text{AdLTV}*{d,n}^{(m)}=\frac{\text{AdRevenue}*{d,n}^{(m)}}{|C\_d|}。
$$

**7. 多营收指标配置**

**7.1 功能逻辑**

用户可以添加多个营收指标，系统分别计算每个指标 LTV，并计算汇总 LTV。

限制：

1. 最多添加 10 个营收指标。

2. 内购事件和广告事件可以混合添加。

3. 每个指标可单独启用或禁用。

4. 禁用指标不参与查询、不参与汇总 LTV。

5. 指标名称可自定义。

6. 指标名称不可为空。

7. 同一事件可以被添加多次，但必须通过不同过滤条件或不同名称区分。

**7.2 添加指标交互**

点击：

+ LTV 指标

如果当前指标数 < 10：

1. 弹出类型选择菜单：内购事件指标 / 广告事件指标。

2. 用户选择类型。

3. 新增对应指标卡片。

4. 卡片滚动到可视区域。

5. 页面进入未保存状态。

如果当前指标数 = 10：

按钮置灰，Tooltip：最多支持添加 10 个 LTV 指标。

**7.3 删除指标交互**

点击指标卡片右上角删除按钮：

1. 如果当前只有 1 个指标，允许删除，但查询按钮变为不可用。

2. 如果该指标已有配置，弹出确认：“删除后该指标配置将不可恢复，是否继续？”

3. 用户确认后删除。

4. 汇总 LTV 自动重新计算配置依赖。

5. 清空当前图表结果。

**7.4 启用/禁用指标**

每个指标卡片提供开关：

启用

逻辑：

1. enabled = false 时，卡片置灰。

2. 禁用指标不参与校验。

3. 禁用指标不参与查询。

4. 禁用指标不参与汇总 LTV。

5. 至少需要一个 enabled = true 的指标才能查询。

**8. 细分筛选与对照组**

**8.1 细分筛选**

**功能逻辑**

细分筛选用于限制参与 LTV 分析的起始用户范围。

支持：

用户分群

用户属性

用户标签

公共属性

行为圈选

动态圈选

文档中说明，LTV 分析支持细分筛选，可按用户群、公共属性等条件组合过滤用户，并且这些条件之间为“并且”关系。

数据结构：

type SegmentFilterConfig = {

relation: "AND" | "OR";

conditions: Array<FilterCondition | FilterGroup>;

};

执行顺序：

1. 先根据起始事件筛选出候选起始用户。

2. 再应用细分筛选，得到最终 cohort 用户。

3. 后续营收只统计最终 cohort 用户产生的营收。

**8.2 筛选交互**

点击：

+ 添加筛选条件

流程：

1. 用户选择筛选类型。

2. 用户选择字段。

3. 用户选择操作符。

4. 用户输入或选择值。

5. 多个条件默认 AND。

6. 支持切换 AND / OR。

7. 支持最多两层条件组。

8. 未完成条件不允许查询。

**8.3 对照组**

**功能逻辑**

对照组用于比较不同人群的 LTV。

例如：

iOS 用户 vs Android 用户

自然新增用户 vs 广告新增用户

新版本用户 vs 老版本用户

高价值渠道 vs 普通渠道

数据结构：

type ComparisonGroupConfig = {

id: string;

name: string;

filter: SegmentFilterConfig;

};

交互逻辑：

1. 点击“+ 对照组”。

2. 系统新增一个对照组卡片，默认名为“对照组 1”。

3. 用户配置该对照组筛选条件。

4. 最多支持 10 个对照组。

5. 开启对照组后，图表系列按对照组拆分。

6. 表格中增加 groupName 维度。

7. 如果同时开启属性分组，系统提示维度较多，默认不允许同时开启；V2 可支持。

V1 规则：

对照组与属性分组互斥。

原因：

避免 group × attributeValue × date × ltvWindow 维度爆炸。

**9. 属性分组**

**9.1 功能逻辑**

属性分组用于按属性值拆分 LTV 结果。

例如：

按操作系统分组查看 LTV

按 App 版本分组查看 LTV

按渠道分组查看 LTV

按用户标签分组查看 LTV

文档说明，LTV 分析支持事件属性、用户属性、用户标签等最多 20 层分组，但当前不支持选择营收事件相关属性作为分组属性；如果某用户在不同分组值下产生营收，对应分组都会统计该用户的营收。

**9.2 数据结构**

type LTVGroupByConfig = {

enabled: boolean;

groups: Array<{

id: string;

fieldType:

| "start\_event\_property"

| "user\_property"

| "user\_tag"

| "subject\_property";

fieldName: string;

fieldDisplayName: string;

valueLimit: number;

includeOthers: boolean;

includeUnknown: boolean;

}>;

};

V1 限制：

1. 最多支持 1 个属性分组。

2. 不允许选择营收事件属性。

3. 默认展示 Top 10 分组值。

4. 超出 Top 10 的分组值合并为“其他”。

5. 空值进入“未知”。

V2 可扩展：

最多 20 层分组。

**9.3 分组归属规则**

用户属于某个分组值的判断顺序：

1. 如果 fieldType = start\_event\_property，则取用户触发起始事件时的属性值。

2. 如果同一用户同一天多次触发起始事件，则取该用户当天最早一次起始事件的属性值。

3. 如果 fieldType = user\_property，则取用户在查询计算时刻或起始日快照的属性值。

4. 如果 fieldType = user\_tag，则取用户在起始日是否命中标签。

5. 属性为空则进入“未知”。

配置项：

userPropertySnapshotMode: "QUERY\_TIME" | "COHORT\_DAY";

默认：

COHORT\_DAY

**9.4 分组计算规则**

如果不分组：

同一用户在一个 cohort 中只计一次，营收汇总后进入该日期总 LTV。

如果分组：

1. 用户按分组值进入对应分组 cohort。

2. 分组内 StartUsers 独立计算。

3. 分组内 Revenue 独立计算。

4. 分组 LTV = 分组 Revenue / 分组 StartUsers。

如果某用户同时命中多个分组值：

1. 多值用户会分别进入每个分组。

2. 每个分组都单独统计该用户和对应营收。

3. 因此各分组 StartUsers 之和可能大于总体 StartUsers。

4. 图表需要展示提示：“多值分组下，各分组合计可能大于总体。”

**10. 时间范围与 LTV 窗口**

**10.1 查询时间范围**

查询时间范围限定起始事件发生日期。

字段：

type LTVTimeConfig = {

startDate: string;

endDate: string;

timezone: string;

};

默认：

最近 7 天

含义：

只统计 startDate 至 endDate 期间触发起始事件的用户 cohort。

后续营收统计范围会根据最大 LTV 窗口自动延展：

营收查询结束日期 = endDate + maxLTVWindow

如果 maxLTVWindow = LTV 至今：

营收查询结束日期 = 当前日期

**10.2 LTV 窗口**

系统固定支持真实值窗口：

LTV0

LTV1

LTV2

LTV3

LTV4

LTV5

LTV6

LTV7

LTV8

LTV9

LTV10

LTV14

LTV30

LTV60

LTV至今

文档中提到真实值计算包括 LTV1-10、LTV14、LTV30、LTV60、LTV 至今；表格表头从 LTV0 到 LTVn 展示。

数据结构：

type LTVWindow =

| { type: "DAY"; dayOffset: number }

| { type: "UNTIL\_NOW" };

默认展示：

const defaultLTVWindows: LTVWindow[] = [

{ type: "DAY", dayOffset: 0 },

{ type: "DAY", dayOffset: 1 },

{ type: "DAY", dayOffset: 2 },

{ type: "DAY", dayOffset: 3 },

{ type: "DAY", dayOffset: 4 },

{ type: "DAY", dayOffset: 5 },

{ type: "DAY", dayOffset: 6 },

{ type: "DAY", dayOffset: 7 },

{ type: "DAY", dayOffset: 8 },

{ type: "DAY", dayOffset: 9 },

{ type: "DAY", dayOffset: 10 },

{ type: "DAY", dayOffset: 14 },

{ type: "DAY", dayOffset: 30 },

{ type: "DAY", dayOffset: 60 },

{ type: "UNTIL\_NOW" }

];

**10.3 不完整窗口处理**

如果某个 cohort 日期距离当前日期不足 n 天，例如今天是 2026-05-21，cohort 日期是 2026-05-20，则 LTV7 不完整。

字段：

incompleteWindowDisplayMode: "SHOW\_PARTIAL" | "SHOW\_EMPTY" | "SHOW\_WITH\_WARNING";

默认：

SHOW\_WITH\_WARNING

规则：

| **模式** | **逻辑** |
| --- | --- |
| SHOW\_PARTIAL | 展示已有真实收入 |
| SHOW\_EMPTY | 未满窗口显示 “-” |
| SHOW\_WITH\_WARNING | 展示已有真实收入，但单元格标记为未完整 |

V1 默认：

未满窗口展示已有真实收入，并在 Tooltip 中提示“该窗口尚未完整，仅包含截至当前日期的真实收入”。

**11. LTV 计算引擎**

**11.1 中间数据结构**

**Cohort**

type LTVCohort = {

cohortDate: string;

groupKey?: string;

groupValue?: string;

subjectIds: string[];

startUserCount: number;

};

**Revenue Daily**

type LTVRevenueDaily = {

cohortDate: string;

revenueDate: string;

dayOffset: number;

metricId: string;

revenueType: "IAP" | "AD";

revenueAmount: Decimal;

subjectCount: number;

eventCount: number;

};

**LTV Cell**

type LTVCell = {

cohortDate: string;

windowKey: string;

dayOffset?: number;

metricId: string | "TOTAL";

cumulativeRevenue: Decimal;

startUserCount: number;

ltvValue: Decimal;

isComplete: boolean;

};

**11.2 Cohort 生成算法**

1. 根据查询时间范围查询起始事件。

2. 应用起始事件过滤条件。

3. 按 subjectId + cohortDate 去重。

4. 如果 deduplication = first\_time\_only，则只保留每个 subjectId 历史首次起始事件日期。

5. 应用细分筛选。

6. 应用属性分组。

7. 生成 cohortDate 维度的 subjectIds 集合。

伪代码：

function buildCohorts(events: RawEvent[], config: LTVQueryRequest): LTVCohort[] {

const matchedStartEvents = filterStartEvents(events, config.startEvent);

const deduped = deduplicateStartUsers(matchedStartEvents, config.startEvent.deduplication);

const segmented = applySegmentFilter(deduped, config.segmentFilter);

return groupCohorts(segmented, config.groupBy);

}

**11.3 内购营收计算算法**

1. 对每个 cohortDate 获取该 cohort 的 subjectIds。

2. 查询这些用户从 cohortDate 到 maxRevenueDate 的营收事件。

3. 应用营收事件过滤条件。

4. 读取数值属性。

5. 排除空值、非数值。

6. revenueAmount = 属性值 \* profitRatio。

7. 按 cohortDate、revenueDate、metricId 聚合 revenueAmount。

伪代码：

function calculateIAPRevenue(

cohort: LTVCohort,

metric: IAPRevenueMetricConfig,

events: RawEvent[]

): LTVRevenueDaily[] {

return events

.filter(e => cohort.subjectIds.includes(e.subjectId))

.filter(e => e.eventName === metric.eventName)

.filter(e => matchFilters(e, metric.filters))

.map(e => {

const value = toDecimal(e.properties[metric.propertyName]);

if (value === null) return null;

return {

cohortDate: cohort.cohortDate,

revenueDate: toDate(e.eventTime),

dayOffset: diffDays(cohort.cohortDate, toDate(e.eventTime)),

metricId: metric.id,

revenueType: "IAP",

revenueAmount: value.mul(metric.profitRatio),

subjectCount: 1,

eventCount: 1

};

})

.filter(Boolean)

.groupBy(["cohortDate", "revenueDate", "metricId"]);

}

**11.4 广告营收计算算法**

1. 对每个 cohortDate 获取该 cohort 的 subjectIds。

2. 查询这些用户从 cohortDate 到 maxRevenueDate 的广告事件。

3. 应用广告事件过滤条件。

4. 按日期统计广告事件次数 PV。

5. 获取对应日期 eCPM。

6. revenueAmount = PV \* eCPM / 1000。

7. 按 cohortDate、revenueDate、metricId 聚合。

伪代码：

function calculateAdRevenue(

cohort: LTVCohort,

metric: AdRevenueMetricConfig,

events: RawEvent[]

): LTVRevenueDaily[] {

const dailyPV = countEventsByDate(events, {

subjectIds: cohort.subjectIds,

eventName: metric.eventName,

filters: metric.filters,

startDate: cohort.cohortDate

});

return dailyPV.map(row => {

const ecpm = resolveEcpm(metric, row.date);

return {

cohortDate: cohort.cohortDate,

revenueDate: row.date,

dayOffset: diffDays(cohort.cohortDate, row.date),

metricId: metric.id,

revenueType: "AD",

revenueAmount: new Decimal(row.pv).mul(ecpm).div(1000),

subjectCount: row.subjectCount,

eventCount: row.pv

};

});

}

**11.5 累计 LTV 计算算法**

对每个 cohortDate、metricId、window：

1. 找到 dayOffset <= n 的每日营收。

2. 求和得到 cumulativeRevenue。

3. ltvValue = cumulativeRevenue / startUserCount。

伪代码：

function calculateLTVCells(

cohort: LTVCohort,

dailyRevenue: LTVRevenueDaily[],

windows: LTVWindow[]

): LTVCell[] {

return windows.flatMap(window => {

const includedRevenue = dailyRevenue.filter(row => {

if (window.type === "UNTIL\_NOW") return true;

return row.dayOffset >= 0 && row.dayOffset <= window.dayOffset;

});

const groupedByMetric = groupByMetric(includedRevenue);

return Object.entries(groupedByMetric).map(([metricId, rows]) => {

const cumulativeRevenue = sumDecimal(rows.map(r => r.revenueAmount));

const ltvValue =

cohort.startUserCount === 0

? new Decimal(0)

: cumulativeRevenue.div(cohort.startUserCount);

return {

cohortDate: cohort.cohortDate,

windowKey: formatWindowKey(window),

dayOffset: window.type === "DAY" ? window.dayOffset : undefined,

metricId,

cumulativeRevenue,

startUserCount: cohort.startUserCount,

ltvValue,

isComplete: isWindowComplete(cohort.cohortDate, window)

};

});

});

}

**11.6 总体 LTV 计算**

总体 LTV 不是简单平均每天的 LTV，而是按起始用户数加权平均。文档中总体 LTVn 的公式也是用每日新增用户数乘以每日 LTVn 后求和，再除以总新增用户数。

公式：

$$
\text{OverallLTV}*{n}=\frac{\sum*{d}(\text{StartUsers}*{d}\times \text{LTV}*{d,n})}{\sum\_{d}\text{StartUsers}\_{d}}。
$$

等价于：

$$
\text{OverallLTV}*{n}=\frac{\sum*{d}\text{CumulativeRevenue}*{d,n}}{\sum*{d}\text{StartUsers}\_{d}}。
$$

伪代码：

function calculateOverallLTV(rows: LTVCell[]): OverallLTVRow[] {

const groupedByWindowAndMetric = groupBy(rows, ["windowKey", "metricId"]);

return Object.entries(groupedByWindowAndMetric).map(([key, cells]) => {

const totalRevenue = sumDecimal(cells.map(c => c.cumulativeRevenue));

const totalStartUsers = sum(cells.map(c => c.startUserCount));

return {

windowKey: cells[0].windowKey,

metricId: cells[0].metricId,

startUserCount: totalStartUsers,

cumulativeRevenue: totalRevenue,

ltvValue: totalStartUsers === 0 ? new Decimal(0) : totalRevenue.div(totalStartUsers)

};

});

}

**12. 图表展示**

**12.1 图表模式**

支持两种模式：

1. LTV 趋势

2. LTV 对比

文档中也明确图表可切换 LTV 趋势与 LTV 对比：趋势用于查看总体或某一天从 LTV1 到 LTVn 的变化；对比用于查看不同日期用户群体在某个 LTVn 指标上的数据表现。

**12.2 LTV 趋势图**

**功能逻辑**

LTV 趋势图用于查看某个 cohort 或总体的 LTV 随生命周期天数增长的曲线。

横轴：

LTV0、LTV1、LTV2、...、LTV10、LTV14、LTV30、LTV60、LTV至今

纵轴：

LTV 金额

趋势对象：

总体

某一个起始日期

某一个分组值

某一个对照组

数据来源：

如果选择总体：使用 OverallLTV。

如果选择某一天：使用该 cohortDate 的 LTVCell。

如果选择分组：使用 groupValue 对应 LTVCell。

**交互逻辑**

图表上方控件：

图表模式：LTV趋势 / LTV对比

趋势对象：总体 / 指定日期

展示指标：汇总LTV / 某个营收指标

切换趋势对象：

1. 用户点击趋势对象下拉框。

2. 下拉选项包含“总体”和查询时间范围内每个起始日期。

3. 如果开启分组，选项格式为：日期 + 分组值。

4. 用户选择后，图表重新渲染，不重新查询。

5. 表格不受影响。

Tooltip：

起始日期：2026-05-01

窗口：LTV7

起始用户数：10,000

累计营收：25,000.00

人均 LTV：2.50

窗口状态：完整 / 未完整

**12.3 LTV 对比图**

**功能逻辑**

LTV 对比图用于对比不同起始日期在某一个 LTV 窗口上的表现。

横轴：

起始日期

纵轴：

指定 LTVn 数值

可选指标：

LTV0

LTV1

...

LTV10

LTV14

LTV30

LTV60

LTV至今

**交互逻辑**

图表上方控件：

对比指标：LTV0 / LTV1 / ... / LTV至今

展示指标：汇总LTV / 内购收入 / 广告收入 / 指定营收指标

切换对比指标：

1. 用户选择新的 LTV 窗口。

2. 前端从已有 response 中读取对应 windowKey 数据。

3. 重新渲染折线图。

4. 不重新请求接口。

Tooltip：

起始日期：2026-05-01

指标：LTV7

起始用户数：10,000

累计营收：25,000.00

LTV：2.50

**13. LTV 明细表**

**13.1 表格结构**

表格呈金字塔结构：

| **日期** | **新增用户数** | **LTV0** | **LTV1** | **LTV2** | **LTV3** | **LTV7** | **LTV14** | **LTV30** | **LTV60** | **LTV至今** |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

文档也说明，LTV 表格首列是日期，次列是新增用户数，首行表头表示从 LTV0 到 LTVn 的数值。

**13.2 单元格展示**

默认展示：

LTV 值，保留 2 位小数

例如：

48,277.63

单元格 Tooltip 展示：

日期：2026-05-01

窗口：LTV3

起始用户数：8

累计营收：450,458.00

LTV：56,307.25

内购收入：450,458.00

广告收入：0.00

窗口状态：完整

如果窗口未完整：

该窗口尚未完整，仅包含截至当前日期的真实收入。

**13.3 新增用户数点击**

点击“新增用户数”单元格：

1. 打开用户列表抽屉。

2. 展示该日期 cohort 用户。

3. 支持搜索 subjectId。

4. 支持导出用户 ID。

5. 支持保存为用户分群。

接口：

POST /api/analysis/ltv/users

请求：

type LTVUserListRequest = {

queryId: string;

cohortDate: string;

groupKey?: string;

groupValue?: string;

userType: "START\_USERS" | "REVENUE\_USERS";

windowKey?: string;

metricId?: string;

page: number;

pageSize: number;

};

**13.4 LTV 单元格点击**

点击某个 LTV 单元格：

1. 打开营收明细抽屉。

2. 展示该 cohort 在该窗口内的营收拆解。

3. 按营收指标拆分：汇总、内购事件、广告事件。

4. 展示每日营收明细。

5. 支持查看产生收入的用户列表。

6. 支持导出明细。

营收明细结构：

| **日期** | **指标名称** | **类型** | **事件次数** | **产生营收用户数** | **收入** | **累计收入** |
| --- | --- | --- | --- | --- | --- | --- |

**14. 查询接口设计**

**14.1 查询请求**

type LTVQueryRequest = {

projectId: string;

subject: {

subjectType: "user\_id" | "device\_id" | "account\_id" | "anonymous\_id" | "custom\_id";

displayName: string;

};

timezone: string;

startEvent: StartEventConfig;

revenueMetrics: RevenueMetricConfig[];

segmentFilter?: SegmentFilterConfig;

comparisonGroups?: ComparisonGroupConfig[];

groupBy?: LTVGroupByConfig;

timeConfig: LTVTimeConfig;

windows: LTVWindow[];

options: {

incompleteWindowDisplayMode: "SHOW\_PARTIAL" | "SHOW\_EMPTY" | "SHOW\_WITH\_WARNING";

userPropertySnapshotMode: "QUERY\_TIME" | "COHORT\_DAY";

decimalScale: number;

};

viewConfig: {

chartMode: "TREND" | "COMPARE";

selectedMetricId: "TOTAL" | string;

selectedWindowKey?: string;

selectedCohortDate?: string;

};

};

**14.2 查询响应**

type LTVQueryResponse = {

queryId: string;

executedAt: string;

timezone: string;

summary: {

totalStartUsers: number;

totalRevenue: string;

overallLTVToDate: string;

cohortDateCount: number;

enabledMetricCount: number;

};

windows: Array<{

windowKey: string;

label: string;

dayOffset?: number;

type: "DAY" | "UNTIL\_NOW";

}>;

metrics: Array<{

metricId: string;

metricName: string;

type: "IAP" | "AD" | "TOTAL";

enabled: boolean;

}>;

rows: Array<{

cohortDate: string;

groupKey?: string;

groupValue?: string;

comparisonGroupId?: string;

startUserCount: number;

cells: Array<{

windowKey: string;

metricId: string | "TOTAL";

cumulativeRevenue: string;

ltvValue: string;

isComplete: boolean;

}>;

}>;

overallRows: Array<{

windowKey: string;

metricId: string | "TOTAL";

startUserCount: number;

cumulativeRevenue: string;

ltvValue: string;

isComplete: boolean;

}>;

warnings?: Array<{

code: string;

message: string;

}>;

};

**15. 保存分析，也就是书签功能**

**15.1 功能定位**

保存分析保存的是 LTV 查询配置，不保存静态结果。再次打开时，按最新数据重新计算。

保存内容：

起始事件

起始事件过滤条件

起始用户去重策略

营收事件列表

内购事件属性

利润比例

广告事件 eCPM 文件引用

广告 eCPM 缺失策略

营收事件过滤条件

细分筛选

对照组

属性分组

时间范围

LTV 窗口

图表模式

选中的指标

选中的 LTVn

表格列配置

**15.2 保存结构**

type SavedLTVAnalysis = {

id: string;

analysisType: "ltv";

name: string;

description?: string;

ownerId: string;

spaceType: "personal" | "team";

folderId?: string;

tags: string[];

queryConfig: LTVQueryRequest;

viewConfig: {

chartMode: "TREND" | "COMPARE";

selectedMetricId: "TOTAL" | string;

selectedWindowKey?: string;

selectedCohortDate?: string;

visibleColumns: string[];

};

timeMode: "fixed" | "relative";

relativeTime?: {

amount: number;

unit: "day" | "week" | "month";

};

createdAt: string;

updatedAt: string;

lastOpenedAt?: string;

};

**16. 保存到看板**

**16.1 功能定位**

保存到看板用于将当前 LTV 图表或表格保存成长期监控组件。

支持保存：

1. LTV 趋势图

2. LTV 对比图

3. LTV 明细表

**16.2 看板组件结构**

type LTVDashboardWidget = {

id: string;

dashboardId: string;

widgetType: "ltv\_trend" | "ltv\_compare" | "ltv\_table";

title: string;

sourceAnalysisType: "ltv";

sourceQueryConfig: LTVQueryRequest;

chartConfig: {

chartMode: "TREND" | "COMPARE" | "TABLE";

selectedMetricId: "TOTAL" | string;

selectedWindowKey?: string;

selectedCohortDate?: string;

};

timeMode: "fixed" | "relative";

refreshPolicy: "manual" | "daily";

createdBy: string;

createdAt: string;

updatedAt: string;

};

看板内交互：

刷新

查看大图

跳转原分析

编辑标题

复制组件

删除组件

导出数据

**17. 导出功能**

**17.1 导出 Excel**

导出内容：

| **Sheet** | **内容** |
| --- | --- |
| 查询配置 | 起始事件、营收指标、筛选、分组、时间范围 |
| LTV 汇总 | overallRows |
| LTV 明细表 | cohortDate × LTV window |
| 营收拆解 | 每日每指标收入 |
| eCPM 数据 | 广告指标使用的 eCPM 日期表 |
| 用户样本 | 如果有权限，导出部分用户样本 |

**17.2 导出用户 ID**

入口：

新增用户数单元格

LTV 单元格营收用户列表

权限：

ltv:user\_export

导出字段：

subject\_id

cohort\_date

group\_value

window\_key

metric\_id

revenue\_amount

first\_revenue\_time

last\_revenue\_time

**18. 权限设计**

权限点：

| **权限** | **说明** |
| --- | --- |
| ltv:view | 查看 LTV 分析页面 |
| ltv:query | 执行查询 |
| ltv:save | 保存分析 |
| ltv:dashboard | 保存到看板 |
| ltv:export | 导出 Excel |
| ltv:user\_detail | 查看用户列表 |
| ltv:user\_export | 导出用户 ID |
| cohort:create | 保存为用户分群 |
| file:upload\_ecpm | 上传 eCPM 文件 |

权限拦截：

1. 没有 ltv:view：不可进入页面。

2. 没有事件权限：事件选择器不展示该事件。

3. 没有属性权限：属性选择器不展示该属性。

4. 没有 file:upload\_ecpm：隐藏 eCPM 上传入口。

5. 没有 user\_detail：隐藏查看用户列表。

6. 没有 cohort:create：隐藏保存为用户分群。

7. 打开保存分析时，如果部分事件或属性无权限，对应字段置灰并提示。

**19. 异常状态**

**19.1 未选择起始事件**

请选择起始事件

**19.2 未配置营收事件**

请至少配置一个启用状态的 LTV 指标

**19.3 内购指标未选数值属性**

内购事件指标必须选择一个数值属性

**19.4 利润比例非法**

利润比例必须在 0% 到 100% 之间，最多支持 3 位小数

**19.5 广告指标未上传 eCPM**

广告事件指标必须上传 eCPM 文件

**19.6 eCPM 日期缺失**

eCPM 文件缺少查询所需日期，请补充后再查询

**19.7 无起始用户**

当前条件下没有起始用户，请检查起始事件、时间范围或筛选条件

**19.8 无营收数据**

当前起始用户在所选 LTV 窗口内暂无营收数据

该状态不算查询失败，表格展示 0。

**20. 验收标准**

**20.1 配置验收**

| **编号** | **验收项** | **通过标准** |
| --- | --- | --- |
| L-001 | 起始事件 | 可选择事件并配置过滤条件 |
| L-002 | 起始用户去重 | 支持每日去重和历史首次触发 |
| L-003 | 内购指标 | 可选择事件、数值属性、利润比例 |
| L-004 | 广告指标 | 可选择广告事件并上传 eCPM 文件 |
| L-005 | 多指标 | 最多支持 10 个营收指标 |
| L-006 | 指标过滤 | 每个营收指标可独立配置过滤条件 |
| L-007 | 细分筛选 | 支持用户分群、属性、标签、行为筛选 |
| L-008 | 对照组 | 支持多用户群 LTV 对比 |
| L-009 | 属性分组 | 支持按起始事件属性、用户属性、标签分组 |
| L-010 | 时间范围 | 起始事件按查询日期生成 cohort |

**20.2 计算验收**

| **编号** | **验收项** | **通过标准** |
| --- | --- | --- |
| C-001 | 起始用户数 | 同一用户同一天只计一次 |
| C-002 | LTV0 | 起始日当天累计营收 / 起始用户数 |
| C-003 | LTVn | 起始日至第 n 天累计营收 / 起始用户数 |
| C-004 | LTV 至今 | 起始日至当前日期累计营收 / 起始用户数 |
| C-005 | 内购收入 | 数值属性求和 × 利润比例 |
| C-006 | 广告收入 | 广告事件 PV × 当日 eCPM / 1000 |
| C-007 | 汇总 LTV | 所有启用营收指标 LTV 求和 |
| C-008 | 总体 LTV | 按起始用户数加权计算 |
| C-009 | 分组 LTV | 分组内收入 / 分组内起始用户数 |
| C-010 | 未完整窗口 | 按配置展示 partial 或空值，并给出提示 |

**20.3 图表验收**

| **编号** | **验收项** | **通过标准** |
| --- | --- | --- |
| V-001 | LTV 趋势 | 可展示总体或某日期从 LTV0 到 LTVn 的曲线 |
| V-002 | LTV 对比 | 可展示不同日期在某个 LTVn 上的对比 |
| V-003 | 指标切换 | 可切换汇总 LTV、内购指标、广告指标 |
| V-004 | Tooltip | 展示起始用户数、累计收入、LTV、窗口完整性 |
| V-005 | 表格 | 展示日期、新增用户数、LTV0-LTV 至今 |
| V-006 | 单元格下钻 | 新增用户数和 LTV 单元格可查看明细 |
| V-007 | 导出 | 可导出 Excel、用户 ID |

**20.4 保存与看板验收**

| **编号** | **验收项** | **通过标准** |
| --- | --- | --- |
| S-001 | 保存分析 | 保存完整 LTV 查询配置 |
| S-002 | 打开保存分析 | 回填配置并重新查询 |
| S-003 | 另存为 | 不覆盖原分析 |
| S-004 | 保存到看板 | 可保存趋势图、对比图、明细表 |
| S-005 | 看板刷新 | 相对时间按当前日期刷新 |
| S-006 | 跳转原分析 | 从看板可回到 LTV 分析页面 |
| S-007 | 权限校验 | 无权限事件、属性、文件置灰或提示 |