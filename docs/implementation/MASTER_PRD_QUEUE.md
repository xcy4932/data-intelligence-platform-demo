# MASTER PRD QUEUE

## Rule

Codex must implement PRDs one by one.

Do not start the next PRD until the current PRD is Verified or explicitly advanced by the PRD automation rule.

Each Codex run may implement only one smallest coherent implementation slice.

Automation must resolve the current PRD from `docs/implementation/CURRENT_TASK.md`.

`CURRENT_TASK.md` is the single source of truth for:
- Current PRD
- Current Implementation Directory
- Current Slice
- Status

Do not hardcode a PRD implementation directory in scripts or prompts.

## Status Values

- Not Started
- Mapping
- In Progress
- Partial
- Needs Fix
- Human Review Required
- Verified
- Skipped

## Queue

| Order | PRD File | Module | Implementation Directory | Status | Current Slice | Priority | Notes |
|---|---|---|---|---|---|---|---|
| 001 | docs/prd/001-组织与身份中心 PRD.md | 组织与身份中心 | docs/implementation/001_组织与身份中心/ | In Progress | OIC-002 | P0 | OIC-001H 已完成人工复核修复，当前进入 OIC-002 组织与身份概览 |
| 002 | docs/prd/002 开放平台与集成中心 PRD.md | 开放平台与集成中心 | docs/implementation/002_开放平台与集成中心/ | Not Started | - | P0 | 依赖组织与身份、权限、审计能力 |
| 003 | docs/prd/003 权限与策略中心 PRD.md | 权限与策略中心 | docs/implementation/003_权限与策略中心/ | Not Started | - | P0 | 依赖组织、身份、角色与资源模型 |
| 004 | docs/prd/004 申请审批与流程中心 PRD.md | 申请审批与流程中心 | docs/implementation/004_申请审批与流程中心/ | Not Started | - | P0 | 依赖权限、组织、审计与通知能力 |
| 005 | docs/prd/005 审计与可观测中心 PRD.md | 审计与可观测中心 | docs/implementation/005_审计与可观测中心/ | Not Started | - | P0 | 全平台审计、日志、监控与可观测底座 |
| 006 | docs/prd/006 数据安全与合规中心 PRD.md | 数据安全与合规中心 | docs/implementation/006_数据安全与合规中心/ | Not Started | - | P0 | 依赖权限、审计、数据资源与脱敏能力 |
| 007 | docs/prd/007 数据目录与治理中心 PRD.md | 数据目录与治理中心 | docs/implementation/007_数据目录与治理中心/ | Not Started | - | P0 | 数据资产、元数据、血缘、治理规则底座 |
| 008 | docs/prd/008 系统配置中心 PRD.md | 系统配置中心 | docs/implementation/008_系统配置中心/ | Not Started | - | P0 | 全局配置、参数、字典、系统开关 |
| 009 | docs/prd/009 项目与空间中心 PRD.md | 项目与空间中心 | docs/implementation/009_项目与空间中心/ | Not Started | - | P0 | 多项目、多空间、资源隔离与协作基础 |
| 010 | docs/prd/010 资源与资产中心 PRD.md | 资源与资产中心 | docs/implementation/010_资源与资产中心/ | Not Started | - | P0 | 资源统一管理、资产登记、资产操作入口 |
| 011 | docs/prd/011 营销配置 PRD.md | 营销配置 | docs/implementation/011_营销配置/ | Not Started | - | P1 | 触达营销通道、模板、签名、账号等配置 |
| 012 | docs/prd/012 触达营销-数据分析 PRD.md | 触达营销-数据分析 | docs/implementation/012_触达营销_数据分析/ | Not Started | - | P1 | 营销触达效果、发送、回复、导出与分析 |
| 013 | docs/prd/013 触达营销-用户运营与微信运营 PRD.md | 触达营销-用户运营与微信运营 | docs/implementation/013_触达营销_用户运营与微信运营/ | Not Started | - | P1 | 用户运营、微信生态运营与触达联动 |
| 014 | docs/prd/014 触达营销-内容与资产 PRD.md | 触达营销-内容与资产 | docs/implementation/014_触达营销_内容与资产/ | Not Started | - | P1 | 内容模板、落地页、素材资产与内容管理 |
| 015 | docs/prd/015 触达营销-首页与消息触达 PRD.md | 触达营销-首页与消息触达 | docs/implementation/015_触达营销_主页与消息触达/ | Not Started | - | P1 | 营销首页、消息触达、触达概览与入口 |
| 016 | docs/prd/016 触达营销-流程画布 PRD.md | 触达营销-流程画布 | docs/implementation/016_触达营销_流程画布/ | Not Started | - | P1 | 营销旅程、流程编排、节点配置与画布交互 |
| 017 | docs/prd/017A/B 测试实验创建与管理 PRD.md | A/B 测试实验创建与管理 | docs/implementation/017_AB测试实验创建与管理/ | Not Started | - | P1 | 实验创建、管理、状态流转、命中诊断 |
| 018 | docs/prd/018A/B 测试实验前规划与设计 PRD.md | A/B 测试实验前规划与设计 | docs/implementation/018_AB测试实验前规划与设计/ | Not Started | - | P1 | 实验规划、样本、指标、分层、设计校验 |
| 019 | docs/prd/019 广告投放分析 PRD.md | 广告投放分析 | docs/implementation/019_广告投放分析/ | Not Started | - | P1 | 广告报表、媒体渠道、投放效果分析 |
| 020 | docs/prd/020 生命周期分析 PRD.md | 生命周期分析 | docs/implementation/020_生命周期分析/ | Not Started | - | P1 | 用户生命周期分层、阶段定义、转化分析 |
| 021 | docs/prd/021 多维特征分析 PRD.md | 多维特征分析 | docs/implementation/021_多维特征分析/ | Not Started | - | P1 | 多维特征、属性分布、交叉分析 |
| 022 | docs/prd/022 群体画像洞察 PRD.md | 群体画像洞察 | docs/implementation/022_群体画像洞察/ | Not Started | - | P1 | 群体画像、画像洞察、群体对比 |
| 023 | docs/prd/023 个体画像分析 PRD.md | 个体画像分析 | docs/implementation/023_个体画像分析/ | Not Started | - | P1 | 单用户画像、用户详情、行为与标签信息 |
| 024 | docs/prd/024 用户分群 PRD.md | 用户分群 | docs/implementation/024_用户分群/ | Not Started | - | P1 | 分群创建、规则配置、分群计算与应用 |
| 025 | docs/prd/025 标签体系 PRD.md | 标签体系 | docs/implementation/025_标签体系/ | Not Started | - | P1 | 标签管理、标签生产、标签应用与治理 |
| 026 | docs/prd/026 用户行为数据管理 prd.md | 用户行为数据管理 | docs/implementation/026_用户行为数据管理/ | Not Started | - | P1 | 事件、属性、埋点、会话、验证与血缘 |
| 027 | docs/prd/027 数字大屏管理与技巧 PRD.md | 数字大屏管理与技巧 | docs/implementation/027_数字大屏管理与技巧/ | Not Started | - | P2 | 大屏管理、设计准则、版本、发布与技巧 |
| 028 | docs/prd/028 数字大屏数据源与交互 PRD.md | 数字大屏数据源与交互 | docs/implementation/028_数字大屏数据源与交互/ | Not Started | - | P2 | 大屏数据源、数据刷新、交互与联动 |
| 029 | docs/prd/029 数字大屏 3D 图表组件 PRD.md | 数字大屏 3D 图表组件 | docs/implementation/029_数字大屏3D图表组件/ | Not Started | - | P2 | 3D 地图、3D 图表、空间视觉组件 |
| 030 | docs/prd/030 数字大屏图表组件 PRD.md | 数字大屏图表组件 | docs/implementation/030_数字大屏图表组件/ | Not Started | - | P2 | 柱状图、折线图、排行榜、桑基图等组件 |
| 031 | docs/prd/031 数字化大屏默认组件 PRD.md | 数字化大屏默认组件 | docs/implementation/031_数字化大屏默认组件/ | Not Started | - | P2 | 文本、图片、指标卡、装饰、基础组件 |
| 032 | docs/prd/032 数字化大屏概要 PRD.md | 数字化大屏概要 | docs/implementation/032_数字化大屏概要/ | Not Started | - | P2 | 大屏整体信息架构、编辑器、发布与运行态 |
| 033 | docs/prd/033 业务归因分析 PRD.md | 业务归因分析 | docs/implementation/033_业务归因分析/ | Not Started | - | P1 | 指标归因、维度归因、异动分析与报告 |
| 034 | docs/prd/034 仪表盘 PRD.md | 仪表盘 | docs/implementation/034_仪表盘/ | Not Started | - | P1 | 仪表盘创建、编辑、查看、模板、版本管理 |
| 035 | docs/prd/035 数据可视化 PRD.md | 数据可视化 | docs/implementation/035_数据可视化/ | Not Started | - | P1 | 图表配置、字段配置、筛选、钻取与展示 |
| 036 | docs/prd/036SQL 查询 PRD.md | SQL 查询 | docs/implementation/036_SQL查询/ | Not Started | - | P1 | SQL 编辑、执行、变量、结果、下载与可视化 |
| 037 | docs/prd/037 可视化建模 PRD.md | 可视化建模 | docs/implementation/037_可视化建模/ | Not Started | - | P1 | 数据建模、字段处理、模型关系与计算逻辑 |
| 038 | docs/prd/038 数据脱敏 PRD.md | 数据脱敏 | docs/implementation/038_数据脱敏/ | Not Started | - | P1 | 脱敏规则、字段脱敏、预览、权限与应用 |
| 039 | docs/prd/039 数据集列表 PRD.md | 数据集列表 | docs/implementation/039_数据集列表/ | Not Started | - | P1 | 数据集列表、搜索、筛选、状态、操作入口 |
| 040 | docs/prd/040 数据集管理 PRD.md | 数据集管理 | docs/implementation/040_数据集管理/ | Not Started | - | P1 | 数据集详情、编辑、权限、血缘、发布管理 |
| 041 | docs/prd/041 数据集创建 PRD.md | 数据集创建 | docs/implementation/041_数据集创建/ | Not Started | - | P1 | 数据集创建流程、字段配置、保存与校验 |
| 042 | docs/prd/042 数据连接功能 PRD.md | 数据连接功能 | docs/implementation/042_数据连接功能/ | Not Started | - | P1 | 数据源接入、连接配置、测试、同步与授权 |
| 043 | docs/prd/043ID-mapping 的 prd.md | ID Mapping | docs/implementation/043_IDMapping/ | Not Started | - | P1 | 用户 ID 映射、身份合并、主键规则与关系管理 |
| 044 | docs/prd/044A/B 测试-查看与分析实验报告 PRD.md | A/B 测试-查看与分析实验报告 | docs/implementation/044_AB测试_查看与分析实验报告/ | Not Started | - | P1 | 实验报告、指标分析、显著性、结果解读 |
| 045 | docs/prd/045A/B 测试-配置管理 PRD.md | A/B 测试-配置管理 | docs/implementation/045_AB测试_配置管理/ | Not Started | - | P1 | Feature Flag、配置管理、实验固化与调试 |
| 046 | docs/prd/046A/B 测试实验指标管理模块 PRD.md | A/B 测试实验指标管理模块 | docs/implementation/046_AB测试实验指标管理模块/ | Not Started | - | P1 | 指标组、事件指标、留存、漏斗、高级指标 |
| 047 | docs/prd/047 热力图分析 PRD.md | 热力图分析 | docs/implementation/047_热力图分析/ | Not Started | - | P1 | 网页热力、点击热力、浏览热力与页面分析 |
| 048 | docs/prd/048LTV 分析 PRD.md | LTV 分析 | docs/implementation/048_LTV分析/ | Not Started | - | P1 | LTV 分析、 cohort、收入留存与价值评估 |
| 049 | docs/prd/049 用户路径分析 PRD.md | 用户路径分析 | docs/implementation/049_用户路径分析/ | Not Started | - | P1 | 路径探索、节点分析、路径转化与流失 |
| 050 | docs/prd/050 归因分析 PRD.md | 归因分析 | docs/implementation/050_归因分析/ | Not Started | - | P1 | 归因模型、转化贡献、渠道和路径归因 |
| 051 | docs/prd/051 分布分析 PRD.md | 分布分析 | docs/implementation/051_分布分析/ | Not Started | - | P1 | 指标分布、属性分布、区间分布与明细 |
| 052 | docs/prd/052 漏斗分析 PRD.md | 漏斗分析 | docs/implementation/052_漏斗分析/ | Not Started | - | P1 | 漏斗配置、转化、流失、保存与看板复用 |
| 053 | docs/prd/053 留存分析 PRD.md | 留存分析 | docs/implementation/053_留存分析/ | Not Started | - | P1 | 留存配置、留存矩阵、 cohort、趋势与明细 |
| 054 | docs/prd/054 分析中心-保存分析 PRD.md | 分析中心-保存分析 | docs/implementation/054_分析中心_保存分析/ | Not Started | - | P1 | 保存分析、书签、概览看板复用与管理 |
| 055 | docs/prd/055 事件分析 PRD.md | 事件分析 | docs/implementation/055_事件分析/ | Not Started | - | P1 | 事件指标、分组、筛选、趋势、明细与保存 |
