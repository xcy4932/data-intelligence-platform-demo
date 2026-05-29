# A/B 测试配置管理 PRD 对齐清单

源 PRD：`/Users/xuchaoyang/Desktop/prd文档/A:B 测试-配置管理 PRD.docx`

本文档按《A/B 测试-配置管理 PRD》逐章节记录验收项。后续每轮开发前先核对本清单，锁定本轮要补齐的 PRD 条目；每轮开发后更新状态、证据和剩余缺口，直到所有条目完成。

## 维护规则

- 每次开发前：先阅读本文件，确认本轮目标属于哪个 PRD 章节，不新增偏离 PRD 的功能范围。
- 每次开发后：把已完成项改为 `[x]`，保留待补齐项为 `[ ]`，并在“本轮记录”补充开发结果、验证方式和遗留风险。
- 验收口径：只有页面交互、状态规则、mock/service 数据、类型约束、权限控制、异常边界和必要测试均能闭环时，才可勾选对应条目。
- 证据口径：勾选时优先写明相关页面、服务、类型、工具函数、测试或浏览器验收结果，避免只写“已做”。

## 初始代码基线

- 已发现：配置管理路由已接入 `src/router/index.ts`，包含 Feature 列表、创建、实验固化、发布历史、生命周期、权限、日志、详情、版本、代码、白名单、发布/回滚等入口。
- 已发现：Feature Flag 相关类型、mock 服务、状态规则和 Runtime 决策单测已存在于 `src/types/abTesting.ts`、`src/services/abTestingService.ts`、`src/utils/abTestingRules.ts`、`tests/ab-testing-rules.test.mjs`。
- 待核验：现有工作台是否逐条覆盖 PRD 的字段、按钮、状态、边界提示、发布计划、白名单规则、权限矩阵和生命周期图表；不得因为已有入口就直接判定完成。

## 1. 文档定位

- [x] 配置管理模块围绕 Feature Flag 建模，覆盖功能开关、动态配置、灰度发布、人群定向、实验固化、版本回滚、白名单、权限、发布历史和生命周期治理。
- [x] 页面、按钮、状态、交互、数据规则均达到可直接进入前端、后端、接口和状态机开发的粒度。

## 2. 产品目标

- [x] 支持新功能随代码部署后不立即全量生效，可由平台动态开启。
- [x] 支持按人群、城市、系统、版本、用户分群等条件动态下发策略。
- [x] 支持 A/B 实验优胜组固化为 Feature 并进入发布流程。
- [x] 支持灰度、定时发布、定时下线和秒级回滚。
- [x] 支持全局发布历史，用于线上异常排查。
- [x] 支持生命周期治理，识别冗余配置和技术债。
- [x] 支持角色隔离查看、编辑、发布、回滚和权限管理能力。

## 3. 核心概念

- [x] Feature 使用唯一 key 标识，研发可通过 key 读取动态配置值。
- [x] 变体支持 `boolean`、`string`、`number`、`json` 四种类型，并落实对应校验规则。
- [x] 发布受众按 `if / else` 规则执行，多条 if 自上而下匹配，命中第一条后停止，else 默认规则兜底。
- [x] 规则内多个过滤条件为 AND，多条受众规则为按顺序判断的 OR 关系。
- [x] Runtime 优先级固定为：白名单测试 > A/B 实验 > Feature Flag > 本地默认值。
- [x] Feature 关闭、未发布或无命中规则时，SDK/服务端返回本地默认值。

## 4. 功能范围

- [x] Feature 列表页。
- [x] 创建 Feature 页面。
- [x] 实验固化至 Feature 页面。
- [x] Feature 详情页。
- [x] Feature 版本管理页。
- [x] 嵌入代码页。
- [x] 白名单测试页。
- [x] 发布 / 回滚侧边页。
- [x] 发布历史页。
- [x] 生命周期管理页。
- [x] 权限管理页。
- [x] 操作日志页。

## 5. Feature 列表页

- [x] 页面入口为左侧导航 `A/B 测试 > 配置管理 > Feature 列表`。
- [x] 顶部操作区包含“+ 创建 Feature”，按协作者权限、查看权限和 App 选择状态控制显示/置灰。
- [x] 创建 Feature 点击后进入手动创建流程，单 App 自动带入，多 App 要求选择 App，无权限展示指定提示。
- [x] 行内“创建关联实验”按协作者权限、未删除、存在可用版本、具备实验创建权限控制。
- [x] 创建关联实验能带入 Feature key、变体类型和变体值；存在运行中关联实验时二次确认。
- [x] 发布历史入口可从导航或列表快捷进入，并支持带入当前 App 或 Feature key。
- [x] 筛选区包含应用、Feature 状态、发布状态、终端类型、标签、Owner、名称/Key 搜索、查询、重置。
- [x] 搜索规则覆盖关键词模糊、标签精确、多筛选 AND、多状态 OR、重置后自动查询。
- [x] 默认筛选覆盖最近一次 App、全部状态、空关键词、全部标签和 Owner。
- [x] 表格展示 Feature 名称、Key、Owner、终端、App、标签、Feature 类型、开关状态、发布状态、当前生效版本、最近更新时间、操作。
- [x] 标签最多展示 3 个，超出展示 `+N`。
- [x] 无查看权限用户不可见私有 Feature。
- [x] 行内操作覆盖查看、编辑、创建实验、白名单、发布/回滚、权限管理、删除。
- [x] 编辑在协作者、未删除、未禁用且非发布确认中才可用；核心配置保存生成新版本且默认未发布。
- [x] 发布/回滚按钮名称随未发布、灰度中、发布确认、已全量、已回滚等状态变化。
- [x] 删除仅在协作者、关闭状态、无运行中关联实验、无灰度中或待发布版本时可用。
- [x] 删除二次确认文案、删除后列表移除、历史和日志保留、Runtime 不再下发、SDK 返回默认值。

## 6. 创建 Feature 页面

- [x] 页面入口为 `配置管理 > Feature 列表 > + 创建 Feature`。
- [x] 页面采用分区表单：基本信息、适用 App、自定义变量、设置变体、发布受众、示例代码、底部按钮。
- [x] 右侧固定字段说明区域，点击字段后滚动到对应说明。
- [x] 基本信息字段覆盖 Key、Feature 名称、描述、配图、标签、Owners、终端类型。
- [x] Key 必填、全局唯一、仅英文/数字/下划线、最长 200 字符、创建后不可修改，并在失焦和保存时校验。
- [x] Feature 名称必填、全局唯一、支持中英文/数字/下划线、最长 100 字符、不允许特殊符号。
- [x] Feature 描述支持常见字符、最长 2048 字符，并在详情、版本、发布确认和搜索中使用。
- [x] 上传配图支持 PNG、JPG/JPEG、WebP，最多 1 张、单张不超过 5MB，支持上传、重新上传、删除、预览。
- [x] 标签支持选择已有、输入新标签、最多 10 个、单个 20 字符、大小写不敏感去重、Enter 创建、删除和错误提示。
- [x] Owners 默认当前创建人，支持搜索用户名/邮箱/工号、多选，至少保留 1 个 Owner。
- [x] Owner 默认拥有协作者权限，可编辑、发布、回滚、关闭和管理权限。
- [x] 终端类型为客户端/服务端，创建后不可修改。
- [x] 适用 App 必填，至少绑定 1 个 App，只能选择有权限的 App，可默认带入当前 App。
- [x] 已发布 Feature 不允许直接修改 App 范围，跨 App 使用需复制或新建。
- [x] App 操作支持添加、删除、查看基础信息浮层。
- [x] 自定义变量字段覆盖名称、Key、类型、描述、是否必传、默认值。
- [x] 变量 Key 在当前 Feature 内唯一，仅支持英文、数字、下划线。
- [x] 必传变量未传入时，运行时不能命中依赖该变量的规则。
- [x] 删除被受众规则引用的变量前需二次确认，确认后自动删除引用条件；无剩余条件的规则标记无效。
- [x] 变体类型支持 boolean、string、number、json，创建后不可修改。
- [x] 非 boolean 类型支持参数校验开关；关闭校验清空规则但保留变体值。
- [x] string 校验支持最小长度、最大长度、正则、枚举值。
- [x] number 校验支持最小值、最大值、小数位、是否允许负数。
- [x] json 校验支持 JSON Schema、必填字段、字段类型。
- [x] 提供测试校验入口，能输入测试值并验证规则。
- [x] 变体列表字段覆盖名称、值、描述、配图。
- [x] boolean 默认生成 true/false 两个变体，不允许新增第三个，不允许修改实际值，不允许删除。
- [x] string 变体值不能为空且不可重复，枚举校验开启时必须在枚举范围内。
- [x] number 变体值必须合法，整数位最多 10 位，小数位最多 5 位，并符合范围和负数限制。
- [x] json 变体值必须合法，支持多层嵌套、Schema 校验、格式化和错误行定位提示。
- [x] 添加变体仅在 string/number/json 显示，新增后自动聚焦名称输入框。
- [x] 删除变体至少保留 1 个；被规则引用时二次确认；线上唯一变体和 boolean 变体不可删除。
- [x] 发布受众分为 if 自定义规则和 else 最终默认规则。
- [x] 添加受众规则后默认无过滤条件，发布范围默认为“不下发参数值”，标题自动为“规则 N”。
- [x] 受众规则支持拖拽排序、上移、下移，排序保存新版本后才生效。
- [x] 过滤条件支持用户属性、设备属性、事件属性、自定义变量、用户分群等来源。
- [x] 操作符覆盖等于、不等于、包含、不包含、大于、小于等 PRD 要求。
- [x] 规则发布范围支持不下发、单一变体、多变体按比例下发。
- [x] 多变体比例合计必须为 100%，否则不可保存和发布。
- [x] else 默认规则必须存在，支持下发变体或不下发参数值。
- [x] 示例代码按终端类型生成接入代码，支持复制，并展示 key、默认值和请求上下文。
- [x] 底部按钮覆盖保存草稿、保存并发布、取消；保存草稿不影响线上，保存并发布进入发布流程。

## 7. 实验固化至 Feature

- [x] 入口来自实验详情页、实验报告页或配置管理固化入口。
- [x] 固化流程包含选择全量组、确认 Feature 信息、发布 Feature 三步。
- [x] 支持选择单个实验分组固化为单一变体。
- [x] 支持选择多个实验分组并按流量比例固化，多组比例合计必须为 100%。
- [x] 固化页面展示实验名称、实验 ID、状态、参数 key、分组、分组配置、指标结论和推荐优胜组。
- [x] 固化生成的 Feature 信息可编辑，包括 key、名称、描述、Owner、标签、适用 App、终端类型、变体配置。
- [x] 固化时校验 Feature key 唯一性；固化到已有 Feature 时校验权限和兼容性。
- [x] 页面必须提示实验优先级高于 Feature，运行中实验不会被 Feature 全量配置覆盖。
- [x] 固化后生成未发布 Feature 或新版本，必须通过发布流程后才线上生效。

## 8. Feature 详情与版本管理

- [x] Feature 详情入口来自列表名称、查看操作和相关跳转。
- [x] 详情页展示基础信息、版本列表、发布受众、嵌入代码、白名单、生命周期、权限和操作日志入口。
- [x] 顶部信息展示名称、Key、App、终端、类型、Owner、标签、开关状态、发布状态、当前版本、关联实验、最近更新时间。
- [x] 顶部按钮覆盖编辑、创建实验、白名单、发布/回滚、权限管理、关闭/开启、删除，并按权限和状态置灰。
- [x] 左侧版本列表展示版本号、状态、创建人、创建时间、发布流量、是否当前生效。
- [x] 右侧版本详情展示基本信息、变体列表、发布受众、默认规则、代码示例、版本差异。
- [x] 版本操作覆盖编辑为新版本、发布、回滚、禁用、查看差异。
- [x] 每次核心配置变更必须生成新版本，未发布版本不影响线上。
- [x] 禁用版本不可编辑、不可发布、不可恢复。
- [x] Feature 关闭后所有流量使用本地默认值。
- [x] 嵌入代码页根据客户端/服务端展示示例代码和复制入口。

## 9. 白名单测试

- [x] 白名单入口来自 Feature 详情 Tab 或列表行内白名单操作。
- [x] 白名单无需发布即可生效，优先级高于 A/B 实验和 Feature。
- [x] 白名单列表展示名称、版本模式、版本、状态、失效时间、创建人、创建时间、操作。
- [x] 新建白名单字段覆盖测试名称、测试版本/自定义配置、失效时间、规则、白名单用户。
- [x] 失效时间最多 7 天，过期后自动失效。
- [x] 支持基于已有版本测试，也支持自定义变体和自定义受众规则。
- [x] 每条启用规则至少有一个白名单用户，用户 ID 格式必须合法。
- [x] 同一测试内用户不能重复出现在多个规则，重复时提示所在规则。
- [x] 提交时校验名称、版本、失效时间、规则用户、用户 ID、变体和受众完整性。
- [x] 提交成功后状态变为生效中，并提示预计 1 分钟内生效。
- [x] 支持复制、终止、删除白名单测试。
- [x] 终止白名单需二次确认，终止后 Runtime 不再使用该配置，并写入日志。

## 10. 发布 / 回滚 Feature

- [x] 入口来自详情页、列表操作、创建后保存并发布、实验固化后发布。
- [x] 侧边页结构包含确认发布信息、配置发布方案、确认并提交。
- [x] 确认发布信息展示 Feature 名称、Key、App、版本号、变体类型、发布人、版本差异和发布描述。
- [x] 发布描述必填、最长 500 字符，并进入发布历史和操作日志。
- [x] 发布方案支持手动发布和定时自动发布。
- [x] 手动发布字段覆盖初始发布流量、是否定时下线、定时下线时间、发布确认。
- [x] 初始发布流量范围为 1%-100%；100% 后状态已全量，小于 100% 后状态灰度中。
- [x] 开启定时下线后到时自动回滚；无上一个全量版本时关闭 Feature 并使用本地默认值。
- [x] 定时自动发布字段覆盖首次发布时间、发布频率、每次增加流量、目标流量、一键设置、发布计划列表。
- [x] 一键设置可生成多条发布时间和流量计划，最后一条等于目标流量。
- [x] 发布计划校验覆盖时间递增、流量递增、范围 1%-100%、最后等于目标流量、首次发布时间晚于当前时间。
- [x] 新版本流量未达到 100% 时，先通过稳定哈希判断是否进入新版本发布流量。
- [x] 哈希因子为 `appId + featureKey + targetVersionId + userId`，同一用户在同一版本发布阶段稳定命中。
- [x] 未命中新版本流量时，存在上一个全量版本则走上一个全量版本，否则本地默认值。
- [x] 提交发布校验发布描述、发布方案和发布计划，并展示二次确认弹窗。
- [x] 提交后按手动 100%、手动 <100%、定时未到开始时间、定时已到开始时间更新状态。
- [x] 可回滚状态为灰度中、发布确认、已全量；未发布、已回滚、已禁用不可回滚。
- [x] 回滚需二次确认，回滚后当前版本变为已回滚，优先恢复上一个已全量版本。
- [x] 无历史全量版本时回滚后关闭 Feature，已回滚版本不可直接再次发布。
- [x] 定时自动发布未到首次发布时间前支持取消发布，取消后保留上一个全量版本或关闭 Feature。

## 11. 发布历史页

- [x] 页面入口为 `配置管理 > 发布历史`。
- [x] 用于全局查看 Feature 发布、回滚、取消发布、关闭等线上变更操作。
- [x] 筛选项覆盖应用、发布状态、发布时间、标签、名称/Key、操作人、查询、重置。
- [x] 表格展示 Feature 名称、Key、App、版本号、发布类型、发布状态、发布流量、操作人、操作时间、发布描述、操作。
- [x] 查看详情打开抽屉，展示基础信息、操作类型、操作前后版本、操作前后受众、操作前后流量、操作人、时间、描述、版本差异。
- [x] 详情抽屉支持复制详情、跳转 Feature、关闭。
- [x] 发布历史不可删除。

## 12. 生命周期管理

- [x] 生命周期入口为 Feature 详情页 Tab。
- [x] 页面结构包含生命周期提示卡片、时间范围筛选、重点操作 Timeline、使用趋势、变体使用占比、最近一次变更。
- [x] 提示卡片覆盖近 30 天无请求、已关闭超过 30 天、长期无变更但高频使用、多次回滚等规则。
- [x] Timeline 展示创建、编辑、发布、开启 A/B 实验、回滚、关闭 Feature、开启 Feature、权限变更、白名单测试。
- [x] Timeline 每条记录展示操作类型、精确到分钟的时间、操作人、描述、关联版本、关联实验。
- [x] Timeline 支持按时间范围、操作类型、操作人筛选。
- [x] 使用趋势图支持请求次数/命中人数切换，每个变体一条折线，Tooltip 展示日期、变体、请求次数、命中人数。
- [x] 使用趋势支持下载数据。
- [x] 变体使用占比展示总请求次数、各变体请求次数、各变体占比、不下发参数值占比、本地默认值占比。
- [x] 最近一次变更表展示变体、当前值、最近一次变更时间、最近一次使用时间、最近一次使用量。

## 13. 权限管理

- [x] 权限分为查看权限和协作者权限。
- [x] 查看权限支持列表、详情、操作历史、发布历史查看。
- [x] 协作者权限支持新建、编辑、发布、回滚、开启、关闭、关联实验、白名单、删除、权限管理。
- [x] 预置角色覆盖集团管理员、应用管理员、Feature 创建者、普通用户、无权限用户。
- [x] 集团管理员、应用管理员、Feature 创建者/Owner 对公共和私有 Feature 均为协作者。
- [x] 普通用户可查看公共 Feature，不可见私有 Feature。
- [x] 新创建 Feature 默认为公共 Feature。
- [x] 权限管理入口来自列表操作和详情页权限设置。
- [x] 权限弹窗字段覆盖 Feature 类型、当前权限说明、确定、取消。
- [x] 切换私有/公共 Feature 时展示 PRD 指定确认提示。
- [x] 只有协作者可修改 Feature 类型；无权限访问 URL 时展示无权限页面。

## 13A. 操作日志页

- [x] 页面入口来自 Feature 详情页操作日志 Tab，并支持 Feature 级直达 URL。
- [x] 页面用于查看单个 Feature 的操作记录。
- [x] 操作记录覆盖创建 Feature、创建版本、发布、回滚、关闭、开启、权限变更、白名单测试等关键操作。
- [x] 筛选区覆盖关键词、操作类型、操作人、开始时间、结束时间、查询和重置。
- [x] 表格展示操作类型、操作对象、对象 ID、关联版本、操作人、操作时间、结果、操作说明和详情入口。
- [x] 详情抽屉展示 Feature 基础信息、操作前后版本、操作前后受众、操作前后流量、操作人、时间、描述、版本差异、原始变更前后内容。
- [x] 详情抽屉支持复制详情、跳转 Feature、关闭。
- [x] Feature 删除、关闭、白名单、权限等操作写入操作日志；已产生的操作日志保留。

## 14. Runtime 决策逻辑

- [x] Runtime 决策顺序为 Feature 是否存在、有效白名单、运行中 A/B 实验、Feature 是否开启、可生效发布版本、发布流量、新版本受众规则、发布范围、else 默认规则、本地默认值。
- [x] 命中白名单时返回白名单测试配置。
- [x] 命中运行中 A/B 实验时返回实验配置，且优先级高于 Feature。
- [x] Feature 关闭、缺失、无可生效版本、未命中发布流量或规则不下发时返回本地默认值。
- [x] 返回结构覆盖 `featureKey`、`value`、`variantId`、`variantName`、`versionId`、`decisionSource`、`decisionReason`、`ruleId`、`isDefaultValue`。
- [x] `decisionSource` 枚举为 `whitelist`、`experiment`、`feature`、`local_default`。

## 15. 核心数据结构

- [x] `Feature` 覆盖 featureId、appId、key、name、description、terminalType、featureType、status、publishStatus、currentVersionId、owners、tags、createdBy、createdAt、updatedAt。
- [x] `Feature Version` 覆盖 versionId、featureId、versionNo、versionStatus、variantType、variants、audienceRules、defaultRule、createdBy、createdAt。
- [x] `Audience Rule` 覆盖 ruleId、name、order、conditions、deliveryType、variantId 或 variantWeights。
- [x] 多变体发布结构支持 `variantWeights`。
- [x] `Publish Plan` 覆盖 publishId、featureId、versionId、publishType、description、steps、rollbackAt、createdBy。
- [x] 前端类型、mock 数据和服务返回字段与 PRD 结构一致，必要差异需在本文件记录。

## 16. 接口设计建议

- [x] Feature 列表：`GET /api/feature-flags`，支持 appId、keyword、publishStatus、tags、owner、page、pageSize。
- [x] 创建 Feature：`POST /api/feature-flags`。
- [x] 编辑 Feature 生成新版本：`POST /api/feature-flags/{featureId}/versions`。
- [x] 发布 Feature：`POST /api/feature-flags/{featureId}/versions/{versionId}/publish`。
- [x] 回滚 Feature：`POST /api/feature-flags/{featureId}/versions/{versionId}/rollback`。
- [x] 关闭 Feature：`POST /api/feature-flags/{featureId}/disable`。
- [x] 开启 Feature：`POST /api/feature-flags/{featureId}/enable`。
- [x] 白名单测试：`POST /api/feature-flags/{featureId}/whitelists`。
- [x] 发布历史：`GET /api/feature-flags/publish-history`。
- [x] 生命周期：`GET /api/feature-flags/{featureId}/lifecycle`。
- [x] 权限设置：`POST /api/feature-flags/{featureId}/permission`。
- [x] mock service 方法命名和参数结构与接口设计保持可替换关系。

## 17. 状态机

- [x] Feature 开关状态包含 `enabled`、`disabled`、`deleted`。
- [x] Feature 开关状态只允许 `enabled -> disabled`、`disabled -> enabled`、`disabled -> deleted`。
- [x] `enabled` 状态不可删除。
- [x] 发布状态包含 `unpublished`、`pending_publish`、`gray`、`publish_confirm`、`full`、`rolled_back`、`disabled`。
- [x] 发布状态流转覆盖未发布到待发布/灰度/全量，待发布到灰度/取消，灰度到全量/回滚，发布确认到灰度/回滚，全量到回滚，未发布到禁用，回滚到禁用。
- [x] 代码中的额外状态如 `canceled` 需与 PRD 的取消发布语义对齐并记录差异。

差异记录：代码保留 `canceled` 作为历史版本的取消发布结果；Feature 当前发布态在取消后按 PRD 语义回到上一个全量版本，若无历史全量版本则关闭为 `disabled`。

## 18. 异常与边界场景

- [x] Feature Key 重复时创建失败并提示 key 已存在。
- [x] 编辑时线上版本变化，保存前提示“当前 Feature 已被他人修改，请刷新后重试”。
- [x] 发布计划时间早于当前时间时不允许提交。
- [x] 定时发布执行失败时状态标记失败并通知 Owner。
- [x] 回滚无历史全量版本时关闭 Feature 并使用本地默认值。
- [x] 白名单过期后自动失效。
- [x] 普通用户访问私有 Feature URL 时返回无权限页面。
- [x] Feature 关闭或删除后 SDK 请求返回本地默认值。
- [x] 多变体比例不等于 100% 时不允许保存并发布。
- [x] JSON 变体格式错误时不允许保存。
- [x] 参数校验规则变化导致旧变体不合法时保存阻断并要求修正。

## 19. 端到端验收标准

- [x] Feature 列表支持按应用、状态、标签、Owner、名称、Key 筛选。
- [x] 无权限用户看不到私有 Feature。
- [x] 点击 Feature 名称可进入详情。
- [x] 协作者可创建、编辑、发布、回滚、删除、权限管理；查看权限用户只能查看。
- [x] 创建 Feature 时 Key 和 Feature 名称全局唯一，Key 创建后不可修改。
- [x] boolean、string、number、json 四种变体类型按 PRD 规则校验。
- [x] 发布受众按 if/else 逻辑配置，多条 if 按顺序匹配，命中第一条后停止，else 默认规则必须存在。
- [x] 保存草稿不影响线上，保存并发布必须进入发布流程。
- [x] 可以从实验详情页固化 Feature，支持单个分组和多个分组按流量比例固化。
- [x] 固化生成的 Feature 信息可编辑，展示实验优先级高于 Feature 的提示，发布后才线上生效。
- [x] 白名单无需发布即可生效，失效时间最多 7 天，用户不能在同一测试内重复出现在多个规则。
- [x] 白名单提交后约 1 分钟内生效，过期或终止后不再影响决策。
- [x] 发布支持手动发布、定时自动发布、一键生成灰度计划。
- [x] 发布流量未达 100% 时状态为灰度中，达到 100% 时状态为已全量。
- [x] 灰度中和已全量版本可回滚，回滚优先恢复上一个已全量版本，无历史全量版本时关闭 Feature。
- [x] 已回滚版本不能直接再次发布。
- [x] 每次核心配置变更生成新版本，未发布版本不影响线上，禁用版本不可编辑/发布/恢复。
- [x] 版本详情展示基本信息、变体、发布受众、代码、版本差异。
- [x] 发布、回滚、取消发布、关闭 Feature 均进入发布历史，支持筛选、详情和版本差异，历史不可删除。
- [x] 生命周期 Timeline 展示关键事件、精确到分钟的时间、操作人、最近一次变更、使用趋势、变体占比和长期无使用清理提示。
- [x] 权限管理支持查看权限和协作者权限，公共 Feature 普通用户可见，私有 Feature 普通用户不可见，只有协作者可修改 Feature 类型。
- [x] 无权限访问 Feature URL 时展示无权限页面。

## 本轮记录

| 日期 | 轮次 | 更新内容 | 验证 |
| --- | --- | --- | --- |
| 2026-05-29 | 初始化 | 根据 PRD 建立 1-19 章节验收清单；记录当前代码中已发现的路由、类型、mock 服务和 Runtime 测试入口；尚未逐项判定完成。 | 已读取 PRD 正文并创建本文件。 |
| 2026-05-29 | 第 1 轮开发 | 补齐 Feature 列表终端筛选、查询按钮、生效版本列、终端/类型列、标签 `+N`、发布/回滚动态按钮、删除入口与删除前置条件；加严创建 Feature 的 Key/名称/描述/标签/变体基础校验；加严发布描述、发布计划、取消发布、白名单名称/失效时间/用户 ID/重复用户/自定义变体验证；修正 Runtime 灰度流量 0% 边界。 | `npm run test:ab-testing`、`npm run type-check`、`git diff --check` 通过；本地浏览器验收 `/ab-testing/features` 与 `/ab-testing/features/create` 无控制台错误。 |
| 2026-05-29 | 第 2 轮开发 | 补齐创建 Feature 的 Feature/变体配图上传、预览、删除；新增非 boolean 参数校验开关、string/number/json 规则、测试校验入口和保存阻断；发布流程改为先弹出二次确认，展示 Feature 信息、发布人、版本差异、发布描述和影响说明。 | `npm run test:ab-testing`、`npm run type-check`、`git diff --check` 通过；本地浏览器验收 `/ab-testing/features/create` 的配图与非 boolean 参数校验区、`/ab-testing/features/feat_recommend_strategy/publish` 的发布二次确认弹窗。 |
| 2026-05-29 | 第 3 轮开发 | 创建 Feature 表单补齐标签可选可新建、Owner 可按用户名/邮箱/工号搜索多选、Key/名称失焦校验、右侧固定字段说明与点击定位；新增变体按钮仅在非 boolean 类型显示并自动聚焦名称；“保存并发布”改为保存后进入发布流程。 | `npm run test:ab-testing`、`npm run type-check`、`git diff --check` 通过；本地浏览器验收 `/ab-testing/features/create` 的 Owner/标签控件、字段说明跳转和非 boolean 新增变体入口。 |
| 2026-05-29 | 第 4 轮开发 | 补齐 Feature 列表“+ 创建 Feature”的权限和 App 选择 gating；行内创建实验带入 Feature key、变体类型、变体值和关联关系，并保留运行中关联实验二次确认；发布历史入口支持从列表或行内带入当前 App / Feature key。 | `npm run test:ab-testing`、`npm run type-check`、`git diff --check` 通过；本地浏览器验收 `/ab-testing/features`、`/ab-testing/features/history`、`/ab-testing/create`，页面错误日志为 0。 |
| 2026-05-29 | 第 5 轮开发 | 补齐创建 Feature 的 App 信息浮层/删除、完整自定义变量字段、变量 Key 校验、删除变量时清理受众引用、if/else 发布受众配置、多来源过滤条件、发布范围和示例代码复制；运行时补充自定义变量缺失时不命中规则。 | `npm run test:ab-testing`、`npm run type-check`、`git diff --check` 通过；本地浏览器验收 `/ab-testing/features/create` 的 App、变量、受众规则、示例代码控件和新增受众规则默认态，页面错误日志为 0。 |
| 2026-05-29 | 第 6 轮开发 | 补齐已发布 Feature 跨 App 复用的“复制新建”入口和 App 不可直接修改提示；受众规则支持拖拽排序并保留上移/下移；版本编辑删除变体补齐被规则引用二次确认、至少保留 1 个、boolean 和线上唯一变体不可删除。 | `npm run test:ab-testing`、`npm run type-check`、`git diff --check` 通过；本地浏览器验收 `/ab-testing/features/create` 和 Feature 详情复制新建流程，页面错误日志为 0。 |
| 2026-05-29 | 第 7 轮开发 | 补齐实验固化至 Feature：实验详情、实验报告和配置管理固化入口均可进入；固化页展示实验基础信息、参数 Key、分组配置、指标结论和推荐优胜组；Feature key、名称、描述、Owner、标签、App、终端、权限类型和变体名称/描述可编辑；服务层补充全局 Key、已有 Feature 权限、App 归属和变体类型兼容校验，固化结果保持未发布并进入发布流程。 | `npm run test:ab-testing`、`npm run type-check`、`git diff --check` 通过；本地浏览器验收 `/ab-testing/features/solidify`、`/ab-testing/reports` 报告固化入口、`/ab-testing/experiments` 实验详情固化入口，页面错误日志为 0。 |
| 2026-05-29 | 第 8 轮开发 | 补齐 Feature 详情与版本管理：详情页顶部补全名称、Key、App、终端、类型、Owner、标签、开关/发布状态、当前版本、关联实验和更新时间；按钮覆盖编辑、创建实验、白名单、发布/回滚、权限、开启/关闭、删除并按权限/状态置灰；详情页提供版本、发布受众、代码、白名单、生命周期、权限和日志入口。版本页左侧展示版本号、状态、创建人、创建时间、发布流量和当前生效标记；右侧展示版本详情、变体、受众、else 默认规则、代码示例、版本差异和版本操作；创建新版本同步 Feature 更新时间且不改变当前线上版本。 | `npm run test:ab-testing`、`npm run type-check`、`git diff --check` 通过；本地浏览器验收 `/ab-testing/features/feat_recommend_strategy` 与 `/ab-testing/features/feat_recommend_strategy/versions`，页面错误日志为 0。 |
| 2026-05-29 | 第 9 轮开发 | 补齐白名单测试：Feature 详情 Tab 与列表行内入口保留；新建区增加无需发布即可生效、优先级高于实验和 Feature、预计 1 分钟内生效的提示；白名单表单覆盖测试名称、已有版本/自定义配置、失效时间、规则与白名单用户；列表改为表格，展示名称、版本模式、版本、状态、失效时间、创建人、创建时间、规则/用户和操作；服务层创建成功返回生效中提示，删除白名单持久化记录删除状态；Runtime 单测补充白名单与实验同时命中时白名单优先。 | `npm run test:ab-testing`、`npm run type-check`、`git diff --check` 通过；浏览器打开 `/ab-testing/features/feat_recommend_strategy/whitelist` 被 Browser URL 安全策略拦截，未做浏览器点击验收。 |
| 2026-05-29 | 第 10 轮开发 | 补齐发布 / 回滚侧边页：页面按“确认发布信息、配置发布方案、确认并提交”三段展示；发布方案改为手动发布 / 定时自动发布；手动发布覆盖初始流量、发布确认、定时下线和下线时间；定时自动发布覆盖首次发布时间、发布频率、每次增加流量、目标流量、一键设置和计划列表；服务层在读取 Feature 域数据时结算到期发布计划和定时下线，定时下线到期后优先回滚上一个全量版本，无全量版本则关闭 Feature 并走本地默认值。 | `npm run test:ab-testing`、`npm run type-check`、`git diff --check` 通过；本地浏览器验收 `/ab-testing/features/feat_recommend_strategy/publish`，确认三步结构、定时自动发布字段和“一键设置发布计划”生成计划列表，截图 `/private/tmp/round10-publish-page.png`。 |
| 2026-05-29 | 第 11 轮开发 | 补齐发布历史页：入口保留在配置管理发布历史；页面说明明确用于全局查看发布、回滚、取消发布、关闭等线上变更且历史不可删除；筛选区覆盖应用、发布状态、发布时间、标签、名称/Key、操作人、查询和重置，并保留操作类型筛选；表格补齐 Feature 名称、Key、App、版本号、发布类型、发布状态、发布流量、操作人、操作时间、发布描述和操作；详情抽屉补齐基础信息、操作类型、操作前后版本、操作前后受众、操作前后流量、操作人、时间、描述、版本差异、复制详情、跳转 Feature 和关闭。 | `npm run test:ab-testing`、`npm run type-check`、`git diff --check` 通过；本地浏览器验收 `/ab-testing/features/history`，确认筛选项、表格列、详情抽屉、复制/跳转/关闭入口均渲染，错误日志为 0，截图 `/private/tmp/round11-publish-history.png`。 |
| 2026-05-29 | 第 12 轮开发 | 补齐生命周期管理页：入口从 Feature 详情 Tab 进入，并新增 Feature 级直达路由；页面包含生命周期提示卡片、时间范围筛选、重点操作 Timeline、使用趋势、变体使用占比和最近一次变更；提示卡片覆盖近 30 天无请求、已关闭超过 30 天、长期无变更但高频使用、多次回滚；Timeline 展示操作类型、分钟级时间、操作人、描述、关联版本、关联实验，并支持时间、操作类型、操作人筛选；使用趋势支持请求次数/命中人数切换、每变体折线、Tooltip 和下载数据；变体占比和最近一次变更表补齐 PRD 字段。 | `npm run test:ab-testing`、`npm run type-check`、`git diff --check` 通过；本地浏览器验收 `/ab-testing/features/feat_recommend_strategy/lifecycle`，确认生命周期提示、筛选、Timeline、趋势、下载、变体占比和最近一次变更均渲染，错误日志为 0，截图 `/private/tmp/round12-lifecycle.png`。 |
| 2026-05-29 | 第 13 轮开发 | 补齐权限管理页：新增 Feature 级权限直达路由；权限页展示当前 Feature 类型、当前权限说明、新建默认公开、无权限访问拦截、查看/协作者权限层级、预置角色矩阵和当前 Feature 操作能力；列表行内与详情页保留权限入口；权限弹窗字段对齐 Feature 类型、当前权限说明、确定、取消，并在公开/私有切换时展示确认提示；服务层兜底新建 Feature 默认为公开。 | `npm run test:ab-testing`、`npm run type-check`、`git diff --check` 通过；本地浏览器验收 `/ab-testing/features/feat_recommend_strategy/permissions`，确认权限层级、角色矩阵、操作能力和弹窗字段均渲染；验收 `/ab-testing/features/feat_login_type/permissions` 直接展示无权限页面，错误日志为 0，截图 `/private/tmp/round13-permissions.png`。 |
| 2026-05-29 | 第 14 轮开发 | 补齐操作日志页：新增 Feature 级操作日志直达路由；操作日志 Tab 从详情页进入并展示单个 Feature 的操作记录；页面补齐 Feature 基础信息、日志保留说明、关键词/操作类型/操作人/时间筛选、查询/重置、操作记录表和详情抽屉；表格展示操作类型、操作对象、对象 ID、关联版本、操作人、操作时间、结果、操作说明和详情；详情抽屉改为操作日志语义，保留复制详情、跳转 Feature 和关闭；mock 数据补充 Feature 创建、版本创建、发布和权限变更日志。 | `npm run test:ab-testing`、`npm run type-check`、`git diff --check` 通过；本地浏览器验收 `/ab-testing/features/feat_recommend_strategy/logs`，确认筛选、表格、详情抽屉和关键日志记录均渲染；关键词筛选“权限”后仅保留权限日志，错误日志为 0，截图 `/private/tmp/round14-operation-logs.png`。 |
| 2026-05-29 | 第 15 轮开发 | 补齐列表默认筛选、接口契约、状态机和受众规则验收：Feature 列表默认 App 从最近一次选择恢复，无记录时取首个可用 App，重置恢复默认 App、全部状态、空关键词、全部标签和 Owner；统一 API 路径补齐版本回滚、关闭、开启、权限、发布历史和白名单路径；新增 Feature 开关状态和发布状态流转工具函数，并在 mock service 的发布、取消发布、回滚、禁用、开启、关闭、删除中校验；Runtime 单测补齐状态机和多条 if 命中后停止判断。 | `npm run test:ab-testing`、`npm run type-check`、`git diff --check` 通过；本地浏览器验收 `/ab-testing/features` 默认 App 筛选为 `app_news` 且列表行均为该 App，验收 `/ab-testing/features/create` 默认 App 和 if/else 发布受众提示均渲染，错误日志为 0，截图 `/private/tmp/round15-feature-defaults.png`。 |
| 2026-05-29 | 第 16 轮开发 | 收尾异常边界与总体验收：编辑 Feature 生成新版本时携带 `expectedFeatureUpdatedAt`，服务层保存前若线上 Feature 已变化则提示“当前 Feature 已被他人修改，请刷新后重试”；定时发布调度遇到缺失 Feature/版本或非法发布状态流转时将发布计划标记为 `failed`，写入“定时发布失败”日志并记录失败原因和通知 Owner；发布历史和操作日志识别定时发布失败；所有 PRD 章节条目完成勾选。 | `npm run test:ab-testing`、`npm run type-check`、`git diff --check` 通过；本地浏览器验收 `/ab-testing/features/feat_recommend_strategy/versions` 与 `/ab-testing/features/history?featureKey=recommend_strategy&appId=app_mall`，页面错误日志为 0，截图 `/private/tmp/round16-final-prd.png`。 |
