# 组织与身份中心 IMPLEMENTATION MAP

## 基本信息

- PRD 编号：001
- 模块：组织与身份中心
- PRD 文件：`docs/prd/001-组织与身份中心 PRD.md`
- 实施目录：`docs/implementation/001_组织与身份中心/`
- 当前状态：In Progress
- 拆解原则：保留 OIC 主编号，过大的主切片拆成 `OIC-xxxA/B/C` 子切片；每个子切片必须能在一次 Codex run 中独立完成、验证、更新进度，并且不越界实现后续切片。

## 现有代码上下文

- 路由集中在 `src/router/index.ts`，左侧导航集中在 `src/layouts/MainLayout.vue`。
- 业务页面多使用 Vue 3 + Naive UI，服务层通常为 `src/services/*Service.ts` 调用 `src/mock/*` 并复用 `src/types/*`。
- 当前没有组织与身份中心相关业务代码；后续建议新增 `src/views/organization-identity/`、`src/components/business/organization-identity/`、`src/services/organizationIdentityService.ts`、`src/types/organizationIdentity.ts`、`src/mock/organizationIdentity.ts`。

## 切片状态

- Not Started：尚未实施。
- Ready：已被选为下一步。
- In Progress：正在实施。
- Done：实现并通过检查。
- Blocked：等待依赖或人工决策。

## 拆分摘要

- OIC-001 拆为 8 个基础切片：路由与菜单、权限矩阵、核心类型与枚举、mock seed 数据、service contract、通用状态组件、审计日志基础模型、跨页面刷新事件机制。
- OIC-005 拆为 4 个用户列表切片：页面壳与权限态、统计与筛选、表格与分页、刷新与导出。
- OIC-006 拆为 4 个添加用户切片：基础表单、认证与密码、关系选择、License 与保存。
- OIC-007 拆为 4 个详情抽屉切片：抽屉框架、组织/用户组/角色、License/第三方/安全、日志与跨页交互。
- OIC-011 拆为 3 个导入切片：模板上传、预览校验、提交结果。
- OIC-024 拆为 4 个 License 操作切片：列表、单用户操作、批量操作、日志刷新。
- OIC-025 拆为 4 个个人资料切片：资料只读、修改资料、修改密码、绑定与设备。
- OIC-026 拆为 3 个审计收口切片：写入接入、日志查询、全模块覆盖回归。

## 推荐执行顺序

### 第一阶段：基础设施

目标：先建立稳定的数据契约、mock 数据、service 契约、入口、权限、通用状态、审计基础与刷新机制，避免后续页面各自补临时实现。

执行顺序：

1. OIC-001C 核心类型与枚举
2. OIC-001D Mock Seed 数据
3. OIC-001E Service Contract
4. OIC-001A 路由与菜单
5. OIC-001B 权限矩阵
6. OIC-001F 通用状态组件
7. OIC-001G 审计日志基础模型
8. OIC-001H 跨页面刷新事件机制

### 第二阶段：用户管理主链路

目标：先完成用户管理列表和详情主链路，再接入新增、编辑、状态变更、删除、批量导入与批量操作。

执行顺序：

1. OIC-005A 用户管理页面壳与权限态
2. OIC-005B 用户统计与搜索筛选
3. OIC-005C 用户表格、分页与行操作状态
4. OIC-005D 刷新、导出与列表刷新规则
5. OIC-006A 添加用户基础信息表单
6. OIC-006B 认证方式、初始密码与激活通知
7. OIC-006C 组织关系、用户组与角色选择
8. OIC-006D License 分配与创建提交
9. OIC-007A 用户详情抽屉框架与基本信息
10. OIC-007B 组织关系、用户组与角色标签页
11. OIC-007C License、第三方账号与安全标签页
12. OIC-007D 操作记录、跨页跳转与详情刷新
13. OIC-008 编辑用户
14. OIC-009 用户启用、禁用与账号辅助操作
15. OIC-010 单用户删除与资产交接
16. OIC-011A 批量导入模板与文件上传
17. OIC-011B 批量导入预览与行级校验
18. OIC-011C 批量导入提交、进度与结果
19. OIC-012 用户批量操作与导出收口

### 第三阶段：部门与组织架构

目标：完成部门树、详情、同步入口、部门 CRUD 和部门成员管理，并保证用户详情中的组织关系能同步刷新。

执行顺序：

1. OIC-013 部门树与部门详情只读
2. OIC-014 部门新建、编辑与删除
3. OIC-015 部门成员管理

### 第四阶段：用户组与角色成员

目标：完成用户组列表、新建、详情、成员、子组和角色成员关系，支撑后续权限中心引用身份关系。

执行顺序：

1. OIC-016 用户组列表与新建
2. OIC-017 用户组详情基本信息与删除
3. OIC-018 用户组成员管理
4. OIC-019 用户组子组管理与循环校验
5. OIC-020 角色成员关系管理

### 第五阶段：第三方绑定、License、个人资料

目标：完成外部身份绑定、License 策略与分配释放，以及普通用户自助资料、安全和绑定能力。

执行顺序：

1. OIC-021 第三方账号绑定列表与冲突视图
2. OIC-022 第三方账号手动绑定、解绑与重新匹配
3. OIC-023 License 用量与策略
4. OIC-024A 用户 License 与待分配列表
5. OIC-024B 单用户 License 分配与释放
6. OIC-024C License 批量分配与释放
7. OIC-024D License 操作记录与刷新收口
8. OIC-025A 个人资料只读页
9. OIC-025B 修改个人资料
10. OIC-025C 修改密码与账号安全
11. OIC-025D 个人第三方绑定与登录设备联动

### 第六阶段：审计日志收口与全局回归

目标：统一补齐所有写操作审计日志、日志查询表格和跨页面刷新一致性，作为 PRD 进入验收前的收口阶段。

执行顺序：

1. OIC-026A 审计日志写入接入
2. OIC-026B 审计日志查询表格
3. OIC-026C 全模块审计覆盖与一致性回归

## 切片拆解

### OIC-001A 路由与菜单

- 切片 ID：OIC-001A
- PRD 章节：5、6.1.5
- 页面或模块：组织与身份中心一级菜单、二级菜单、基础路由
- 功能目标：建立组织与身份中心的页面入口、路由 meta、面包屑标题和受控页面壳，不实现业务内容。
- 前置依赖：无
- 阻塞后续：OIC-001B-H、OIC-002、OIC-003、OIC-005、OIC-013、OIC-016、OIC-020、OIC-021、OIC-023、OIC-025
- 影响页面：全模块入口、个人资料入口
- 涉及组件：`MainLayout.vue`、`router/index.ts`、拟新增基础页面壳
- 涉及数据对象：IdentityMenuItem、IdentityRouteMeta
- 涉及 service 方法：暂不调用业务 service；可预留 `getIdentityAccessContext`
- 完成后必须刷新的数据：菜单选中态、面包屑、路由标题
- 必须写入的审计日志：无；路由访问不写操作日志
- 状态要求：默认、路由不存在 404、无权限 403、菜单禁用/隐藏
- 权限要求：先接入静态 mock 权限位，后续由 OIC-001B 收口
- 校验要求：路由路径和菜单 key 一致；License 菜单先可受配置开关控制
- 交互要求：点击菜单进入对应路由；普通页面壳不能出现假操作按钮
- 人工验收点：切换各二级菜单时，标题、选中态、面包屑正确
- 验收标准：
  - [x] 左侧出现“组织与身份中心”一级菜单。
  - [x] 9 个 PRD 二级入口均有路由或受控壳层。
  - [x] 未授权路由展示 403，不展示空业务列表。
  - [x] 无业务假按钮或 TODO-only 操作。
- 当前状态：Done

### OIC-001B 权限矩阵

- 切片 ID：OIC-001B
- PRD 章节：3、5、19
- 页面或模块：组织与身份中心权限上下文
- 功能目标：定义系统管理员、组织管理员、用户管理员、普通用户的菜单和操作权限矩阵。
- 前置依赖：OIC-001A
- 阻塞后续：所有需要权限判断的页面和操作切片
- 影响页面：概览、企业信息、用户管理、部门、用户组、角色成员、第三方绑定、License、个人资料
- 涉及组件：拟新增 `OrgIdentityPermissionGuard`、权限工具函数
- 涉及数据对象：IdentityRole、IdentityPermissionKey、IdentityAccessContext、ManageScope
- 涉及 service 方法：`getIdentityAccessContext`、`canAccessIdentityPage`、`canPerformIdentityAction`
- 完成后必须刷新的数据：菜单可见项、页面 403 状态、按钮可用状态
- 必须写入的审计日志：无；权限判断不写操作日志
- 状态要求：权限加载中、加载失败、无权限、只读、可操作
- 权限要求：严格覆盖 PRD 3.1 与 5 中各角色可见菜单
- 校验要求：普通用户只能看到个人资料；未开启 License 隐藏 License 管理；第三方身份源未配置仍展示第三方绑定入口；菜单和路由必须共用同一 mock 权限上下文选项
- 交互要求：无权限按钮隐藏或禁用时必须有一致策略；不可泄露超范围数据
- 人工验收点：切换 mock 当前角色时菜单和操作区同步变化
- 验收标准：
  - [x] 系统管理员看到全部入口。
  - [x] 组织管理员看不到企业信息和 License 策略入口。
  - [x] 用户管理员只看到概览、用户管理、第三方账号绑定、个人资料。
  - [x] 普通用户只看到个人资料。
  - [x] License 未开启时 License 管理不出现在菜单中。
  - [x] `MainLayout.vue` 和 `router/index.ts` 共用统一 mock access options 获取权限上下文。
  - [x] 支持切换 `system_admin`、`organization_admin`、`user_admin`、`normal_user`、License 未开启和无第三方身份源测试场景。
- 当前状态：Done

### OIC-001C 核心类型与枚举

- 切片 ID：OIC-001C
- PRD 章节：4、18、20
- 页面或模块：共享类型定义
- 功能目标：定义组织与身份中心核心对象、枚举、列表查询参数和通用返回结构。
- 前置依赖：无
- 阻塞后续：OIC-001D、OIC-001E、所有 service 和页面切片
- 影响页面：全模块
- 涉及组件：无纯组件；新增 `src/types/organizationIdentity.ts`
- 涉及数据对象：Tenant、User、Department、UserGroup、IdentityBinding、LicenseAssignment、RoleMember、AuditLog、ImportJob、RefreshTopic
- 涉及 service 方法：无；为 service contract 提供类型
- 完成后必须刷新的数据：无
- 必须写入的审计日志：无；类型定义不写日志
- 状态要求：类型需覆盖 pending/active/disabled/deleted、bound/unbound/conflict/invalid、occupied/released/pending 等状态
- 权限要求：类型中包含权限 key、角色和管理范围
- 校验要求：枚举值与 PRD 字段一致，不使用 UI 文案作为数据值
- 交互要求：无
- 人工验收点：检查类型字段覆盖 PRD 表格字段，后续 mock 无需临时补字段
- 验收标准：
  - [x] Tenant 字段覆盖 PRD 4.1。
  - [x] User 字段覆盖 PRD 4.2 和状态流转枚举。
  - [x] Department、UserGroup、IdentityBinding、LicenseAssignment 字段完整。
  - [x] AuditLog 字段覆盖 PRD 18。
  - [x] 查询、分页、权限上下文类型可复用。
- 当前状态：Done

### OIC-001D Mock Seed 数据

- 切片 ID：OIC-001D
- PRD 章节：4、7、8、9、11、12、13、14、15、16、18
- 页面或模块：组织身份 mock 数据集
- 功能目标：提供覆盖主要状态、权限、空态、错误态可模拟的种子数据。
- 前置依赖：OIC-001C
- 阻塞后续：所有需要列表、详情、操作反馈的页面切片
- 影响页面：全模块
- 涉及组件：无；新增 `src/mock/organizationIdentity.ts`
- 涉及数据对象：Tenant、User、Department、UserGroup、Role、IdentityBinding、LicenseAssignment、AuditLog、LoginDevice、OverviewStats
- 涉及 service 方法：无；供 OIC-001E 消费
- 完成后必须刷新的数据：无
- 必须写入的审计日志：无；seed 初始化不写操作日志
- 状态要求：至少包含 active、pending、disabled、deleted 用户；local 和外部同步对象；License 已满/未满；第三方冲突；无第三方身份源空态配置
- 权限要求：提供系统管理员、组织管理员、用户管理员、普通用户四种上下文样例
- 校验要求：唯一字段和引用关系一致；deleted 用户字段保留期可模拟
- 交互要求：mock 数据能支撑页面筛选、禁用原因和操作后刷新
- 人工验收点：手动检查 seed 覆盖所有 PRD 高风险边界
- 验收标准：
  - [x] 有不同状态用户和唯一系统管理员样例。
  - [x] 有部门树、用户组父子组、角色成员样例。
  - [x] 有第三方绑定冲突、唯一登录方式和无第三方身份源空态样例。
  - [x] 有 License 不足、待分配、已占用样例。
  - [x] 有操作日志和登录设备样例。
- 当前状态：Done

### OIC-001E Service Contract

- 切片 ID：OIC-001E
- PRD 章节：20
- 页面或模块：前端 service 契约
- 功能目标：建立 `organizationIdentityService` 的只读和写操作方法签名、mock 延迟、错误模拟和 clone 保护。
- 前置依赖：OIC-001C、OIC-001D
- 阻塞后续：所有页面数据读取和业务操作切片
- 影响页面：全模块
- 涉及组件：无；新增 `src/services/organizationIdentityService.ts`
- 涉及数据对象：所有核心对象和列表分页响应
- 涉及 service 方法：`getIdentityAccessContext`、`getTenantInfo`、`listUsers`、`getUserDetail`、`listDepartments`、`listUserGroups`、`listRoles`、`listIdentityBindings`、`getLicenseOverview`、`getMyProfile`、`listIdentityAuditLogs` 等基础契约
- 完成后必须刷新的数据：由调用方决定；service 需提供刷新所需返回值
- 必须写入的审计日志：写方法需预留 audit action 参数或内部记录点
- 状态要求：支持成功、业务失败、权限失败、资源不存在、网络失败模拟
- 权限要求：service 返回数据必须按当前 access context 过滤或附带 no_permission
- 校验要求：写方法参数类型明确；不在视觉组件中拼业务规则
- 交互要求：所有 service 方法返回 Promise，贴合现有 mock service 风格
- 人工验收点：后续页面能直接引用契约，不需要新增临时 service
- 验收标准：
  - [x] service 方法覆盖 PRD 20 七类后端服务。
  - [x] 只读方法支持分页、筛选和详情。
  - [x] 写方法具备成功/失败返回。
  - [x] 权限失败和资源不存在可模拟。
  - [x] 返回对象不暴露可被 UI 直接误改的共享引用。
- 当前状态：Done

### OIC-001F 通用状态组件

- 切片 ID：OIC-001F
- PRD 章节：6
- 页面或模块：通用状态与权限展示
- 功能目标：提供组织身份模块复用的加载、空、错误、无权限、禁用原因、成功/失败反馈基础组件。
- 前置依赖：OIC-001A、OIC-001B
- 阻塞后续：所有列表、详情、弹窗切片
- 影响页面：全模块
- 涉及组件：拟新增 `OrgIdentityStateBlock`、`OrgIdentityPermissionGuard`、`DisabledReasonTip`
- 涉及数据对象：StateKind、PermissionDecision、DisabledReason
- 涉及 service 方法：无；消费 `getIdentityAccessContext`
- 完成后必须刷新的数据：无；提供 retry 事件给页面刷新
- 必须写入的审计日志：无
- 状态要求：loading、empty、filtered-empty、error、403、404、disabled、success、failure
- 权限要求：无权限状态不可泄露列表数据；禁用状态要展示原因
- 校验要求：筛选空态和无数据空态文案区分
- 交互要求：错误态提供重新加载；空态按钮按权限展示
- 人工验收点：在基础页面壳中可切换各种状态预览
- 验收标准：
  - [x] 支持 PRD 6.1.4 和 6.1.5 文案差异。
  - [x] 403、404、网络错误展示不同。
  - [x] retry 回调可被页面接入。
  - [x] 有创建权限时空态可显示主按钮，无权限不显示。
  - [x] retry 与主按钮展示由显式 `showRetry` / `showPrimaryAction` props 控制，不依赖事件监听推断。
- 当前状态：Done

### OIC-001G 审计日志基础模型

- 切片 ID：OIC-001G
- PRD 章节：18、20.7
- 页面或模块：审计日志基础模型与记录工具
- 功能目标：建立身份审计日志字段、动作枚举和基础记录工具，供后续写操作复用。
- 前置依赖：OIC-001C、OIC-001D、OIC-001E
- 阻塞后续：所有写操作切片、OIC-026
- 影响页面：概览最近操作、用户详情操作记录、用户组详情操作记录、License 操作记录
- 涉及组件：无；后续 OIC-026B 实现表格组件
- 涉及数据对象：IdentityAuditLog、AuditAction、AuditTargetType、AuditResult
- 涉及 service 方法：`recordIdentityAuditLog`、`listIdentityAuditLogs`
- 完成后必须刷新的数据：auditLogs、overview.recentLogs
- 必须写入的审计日志：本切片实现记录能力，不为自身写日志
- 状态要求：记录成功、记录失败、查询空、查询错误
- 权限要求：日志查询按角色和管理范围过滤
- 校验要求：日志必须包含操作人、时间、模块、动作、对象类型/ID/名称、原值、新值、结果、失败原因、请求 IP
- 交互要求：写操作调用后可以触发跨页面日志刷新事件
- 人工验收点：手动调用示例写入后，列表查询能看到完整字段
- 验收标准：
  - [x] 25 类 PRD 操作都有 action 枚举。
  - [x] 成功和失败日志都能表示。
  - [x] 原值/新值支持结构化展示。
  - [x] 请求 IP、操作人、失败原因字段存在。
- 当前状态：Done

### OIC-001H 跨页面刷新事件机制

- 切片 ID：OIC-001H
- PRD 章节：6、9-16、18
- 页面或模块：组织身份跨页面刷新
- 功能目标：建立轻量刷新事件主题，保证用户、部门、用户组、License、绑定和日志变更后相关页面能刷新。
- 前置依赖：OIC-001C、OIC-001E
- 阻塞后续：所有写操作后的数据一致性
- 影响页面：用户管理、用户详情、部门、用户组、角色成员、第三方绑定、License、个人资料、概览
- 涉及组件：可新增刷新事件工具；页面后续订阅
- 涉及数据对象：RefreshTopic、RefreshPayload
- 涉及 service 方法：无业务 service；可提供 `emitIdentityRefresh`、`subscribeIdentityRefresh`
- 完成后必须刷新的数据：按 topic 包括 users、userDetail、departments、groups、roles、bindings、licenses、profile、auditLogs、overview
- 必须写入的审计日志：无；刷新事件不写日志
- 状态要求：刷新成功、刷新失败、重复刷新去重
- 权限要求：刷新只触发重新读取，不绕过 service 权限过滤
- 校验要求：topic 命名稳定，payload 包含对象 ID 和变更类型
- 交互要求：操作成功后相关页面无须全量刷新浏览器即可同步关键数据
- 人工验收点：后续任意写操作完成后，相关列表和日志区域自动更新
- 验收标准：
  - [x] 至少定义 users、departments、groups、roles、bindings、licenses、profile、auditLogs、overview topics。
  - [x] 订阅可以取消，避免组件卸载后继续触发。
  - [x] 写操作可按 topic 触发局部刷新。
  - [x] 刷新事件不替代 service 权限校验。
- 当前状态：Done

### OIC-002 组织与身份概览

- 切片 ID：OIC-002
- PRD 章节：7
- 页面或模块：概览
- 功能目标：展示统计卡片、待处理事项、用户增长趋势、第三方绑定概览、快捷入口、最近操作记录。
- 前置依赖：OIC-001A、OIC-001B、OIC-001E、OIC-001F
- 阻塞后续：无；但为后续入口跳转提供导航验证
- 影响页面：概览、用户管理、部门、用户组、第三方绑定、License
- 涉及组件：`OrganizationOverviewView`、`OverviewMetricCards`、`TodoListPanel`、`IdentityTrendChart`、`QuickActionPanel`、`RecentIdentityLogs`
- 涉及数据对象：OverviewStats、IdentityTodoItem、IdentityAuditLog、PermissionDecision
- 涉及 service 方法：`getOrganizationOverview`、`getIdentityTodoItems`、`getRecentIdentityLogs`
- 完成后必须刷新的数据：overviewStats、todoItems、recentLogs
- 必须写入的审计日志：无；只读概览不写日志
- 状态要求：默认、加载骨架、无数据、加载失败、无权限、跳转目标无权限
- 权限要求：管理员类角色可见；普通用户不可见；快捷入口按权限隐藏
- 校验要求：统计数值不可为负；License 未开启时隐藏 License 卡片和待办
- 交互要求：卡片和待办按钮按 PRD 带筛选跳转
- 人工验收点：点击每张卡片跳转后的筛选条件正确
- 验收标准：
  - [ ] 8 类统计卡按配置显示或隐藏。
  - [ ] 待处理事项按钮按 PRD 跳转。
  - [ ] 无目标权限时卡片不可点击并提示。
  - [ ] 最近操作记录读取审计日志。
- 当前状态：Ready

### OIC-003 企业/集团信息查看与编辑

- 切片 ID：OIC-003
- PRD 章节：8.1-8.4
- 页面或模块：企业/集团信息
- 功能目标：查看租户基本信息、License 概况和基础身份策略，并允许系统管理员编辑名称、LOGO、默认语言、默认时区。
- 前置依赖：OIC-001A、OIC-001B、OIC-001E、OIC-001F、OIC-001G
- 阻塞后续：OIC-004
- 影响页面：企业/集团信息、概览 License 概况、License 管理
- 涉及组件：`TenantInfoView`、`TenantBasicInfoPanel`、`TenantLicenseSummaryPanel`、`TenantIdentityPolicyPanel`、`TenantEditForm`
- 涉及数据对象：Tenant、TenantLicenseSummary、TenantIdentityPolicy、TenantUpdatePayload、AuditLog
- 涉及 service 方法：`getTenantInfo`、`getTenantLicenseSummary`、`getTenantIdentityPolicy`、`updateTenantInfo`、`recordIdentityAuditLog`
- 完成后必须刷新的数据：tenantInfo、tenantLicenseSummary、tenantIdentityPolicy、overviewStats、auditLogs
- 必须写入的审计日志：修改企业信息
- 状态要求：默认查看、编辑态、加载、空、错误、无权限、保存中、保存成功、保存失败
- 权限要求：仅系统管理员且租户 active 可编辑；其他角色只读或无入口
- 校验要求：企业名称 2-60 字符且非全空格；LOGO 仅 PNG/JPG/JPEG 且不超过 2MB；语言和时区必须在支持列表内
- 交互要求：取消有未保存确认；保存失败保留输入
- 人工验收点：尝试非法 LOGO、空名称、非系统管理员访问
- 验收标准：
  - [ ] 系统管理员可进入编辑态并保存。
  - [ ] 非系统管理员不显示编辑按钮。
  - [ ] 页面展示基本信息、管理员信息入口区域、License 概况和身份策略。
  - [ ] 校验失败不提交 service。
  - [ ] 保存成功刷新企业信息并写日志。
- 当前状态：Not Started

### OIC-004 系统管理员成员管理

- 切片 ID：OIC-004
- PRD 章节：8.5
- 页面或模块：企业/集团信息 - 管理员信息
- 功能目标：展示系统管理员列表，支持搜索添加 active 用户为系统管理员、移除系统管理员。
- 前置依赖：OIC-003、OIC-005A、OIC-001G、OIC-001H
- 阻塞后续：用户删除/禁用中的唯一系统管理员判断
- 影响页面：企业信息、用户管理、个人资料权限
- 涉及组件：`TenantAdminTable`、`AddTenantAdminModal`
- 涉及数据对象：TenantAdmin、User、AuditLog
- 涉及 service 方法：`listTenantAdmins`、`searchAdminCandidates`、`addTenantAdmins`、`removeTenantAdmin`
- 完成后必须刷新的数据：tenantAdmins、accessContext、users、auditLogs
- 必须写入的审计日志：添加系统管理员、移除系统管理员
- 状态要求：表格默认、加载、空、错误、无权限、添加/移除中、成功、失败、按钮禁用
- 权限要求：仅系统管理员可添加/移除；至少保留 1 名；当前用户不能移除自己
- 校验要求：只能添加 active 且非系统管理员用户；未选择时确定禁用
- 交互要求：搜索按用户名、姓名、邮箱、手机号；移除二次确认
- 人工验收点：唯一管理员、当前用户、disabled 用户候选三个边界
- 验收标准：
  - [ ] 已是系统管理员的用户不出现在候选项。
  - [ ] 唯一系统管理员移除按钮禁用并展示原因。
  - [ ] 当前用户不能移除自己。
  - [ ] 添加/移除后刷新管理员列表、用户权限和日志。
- 当前状态：Not Started

### OIC-005A 用户管理页面壳与权限态

- 切片 ID：OIC-005A
- PRD 章节：9.1-9.3、6.1.4、6.1.5
- 页面或模块：用户管理
- 功能目标：建立用户管理页面结构、权限态、顶部操作占位策略和基础布局，不实现列表业务。
- 前置依赖：OIC-001A、OIC-001B、OIC-001F
- 阻塞后续：OIC-005B-D、OIC-006、OIC-007、OIC-008、OIC-009、OIC-010、OIC-011、OIC-012
- 影响页面：用户管理
- 涉及组件：`UserManagementView`
- 涉及数据对象：IdentityAccessContext、UserPermissionDecision
- 涉及 service 方法：`getIdentityAccessContext`
- 完成后必须刷新的数据：accessContext
- 必须写入的审计日志：无
- 状态要求：默认、加载权限、无权限 403、页面错误、空布局
- 权限要求：系统管理员、组织管理员、用户管理员可进入；普通用户无入口
- 校验要求：无权限不展示任何用户数据
- 交互要求：顶部按钮在未实现切片前不得显示可点击假动作
- 人工验收点：普通用户访问用户管理路由显示 403
- 验收标准：
  - [ ] 用户管理路由可进入页面壳。
  - [ ] 无权限时展示 403。
  - [ ] 页面结构包含统计区、筛选区、列表区、批量操作区位置。
  - [ ] 不出现尚未实现但可点击的假按钮。
- 当前状态：Not Started

### OIC-005B 用户统计与搜索筛选

- 切片 ID：OIC-005B
- PRD 章节：9.4、9.5、6.1.1
- 页面或模块：用户管理 - 统计与筛选
- 功能目标：实现顶部统计卡、关键词搜索、基础/高级筛选、重置和筛选条件状态。
- 前置依赖：OIC-005A、OIC-001E、OIC-001F
- 阻塞后续：OIC-005C、OIC-005D
- 影响页面：用户管理
- 涉及组件：`UserStatsCards`、`UserFilterBar`
- 涉及数据对象：UserStats、UserListFilter、Department、UserGroup、Role
- 涉及 service 方法：`getUserStats`、`listDepartments`、`listUserGroups`、`listRoles`
- 完成后必须刷新的数据：userStats、userListFilter
- 必须写入的审计日志：无；搜索筛选不写操作日志
- 状态要求：统计加载、筛选选项加载、选项空、加载失败、无权限
- 权限要求：筛选候选项按管理范围过滤
- 校验要求：搜索仅点击搜索或 Enter 触发；清空输入不自动搜索；重置清空全部条件并回第一页
- 交互要求：统计卡点击写入对应筛选条件；高级筛选收起后条件继续生效且显示蓝点
- 人工验收点：状态卡筛选、重置、收起高级筛选后再搜索
- 验收标准：
  - [ ] 搜索占位文案为“搜索用户名、姓名、邮箱、手机号、工号”。
  - [ ] 支持 PRD 9.5.2 全部筛选项。
  - [ ] 高级筛选条件生效时显示标记。
  - [ ] 筛选变化通知列表回到第 1 页。
- 当前状态：Not Started

### OIC-005C 用户表格、分页与行操作状态

- 切片 ID：OIC-005C
- PRD 章节：9.6、6.1.2
- 页面或模块：用户管理 - 用户列表
- 功能目标：实现用户表格列、row key、分页、状态标签、用户名打开详情和不同状态的行操作展示。
- 前置依赖：OIC-005B
- 阻塞后续：OIC-006、OIC-007、OIC-008、OIC-009、OIC-010、OIC-012
- 影响页面：用户管理、用户详情抽屉
- 涉及组件：`UserTable`
- 涉及数据对象：User、UserStatus、LicenseStatus、PaginationState、UserActionDecision
- 涉及 service 方法：`listUsers`
- 完成后必须刷新的数据：users、pagination、selectedUsers
- 必须写入的审计日志：无；只读列表不写日志
- 状态要求：表格加载、无数据、筛选空、错误、403、404、行操作禁用
- 权限要求：列表数据按系统管理员/组织管理员/用户管理员范围过滤；deleted 默认不展示，筛选后可展示
- 校验要求：默认每页 20，支持 20/50/100；页码变化保留筛选；筛选变化回第一页
- 交互要求：点击用户名或查看打开详情抽屉入口；不同用户状态展示 PRD 对应操作集合
- 人工验收点：active/pending/disabled/deleted 四种行操作和标签是否正确
- 验收标准：
  - [ ] 表格包含 PRD 9.6.1 所有字段。
  - [ ] row key 使用 `user_id`。
  - [ ] 四种用户状态标签文案和颜色区分。
  - [ ] 分页大小和页码行为符合 PRD。
  - [ ] deleted 用户不可编辑、启用或重置密码。
- 当前状态：Not Started

### OIC-005D 刷新、导出与列表刷新规则

- 切片 ID：OIC-005D
- PRD 章节：9.7、6.1.3
- 页面或模块：用户管理 - 顶部按钮
- 功能目标：实现刷新当前筛选、导出确认和导出超限/失败反馈。
- 前置依赖：OIC-005C、OIC-001G
- 阻塞后续：OIC-012
- 影响页面：用户管理、审计日志
- 涉及组件：`UserManagementView` 顶部操作区、导出确认弹窗
- 涉及数据对象：UserListFilter、ExportTask、AuditLog
- 涉及 service 方法：`exportUsers`、`recordIdentityAuditLog`
- 完成后必须刷新的数据：users、userStats、auditLogs
- 必须写入的审计日志：导出用户
- 状态要求：刷新中、导出确认、导出中、导出成功、导出失败、导出超限
- 权限要求：导出按钮按导出权限显示；无权限不展示
- 校验要求：导出当前筛选条件下全部数据；文件名格式为 `用户管理_导出时间.xlsx`
- 交互要求：刷新不清空筛选；导出前必须确认
- 人工验收点：设置筛选后导出，确认导出使用筛选条件
- 验收标准：
  - [ ] 刷新保留筛选和当前页。
  - [ ] 导出前出现确认弹窗。
  - [ ] 导出超限展示“导出数据量超过上限，请缩小筛选范围后重试”。
  - [ ] 导出成功或失败均写入审计日志。
- 当前状态：Not Started

### OIC-006A 添加用户基础信息表单

- 切片 ID：OIC-006A
- PRD 章节：9.8.1-9.8.3
- 页面或模块：用户管理 - 添加用户弹窗基础字段
- 功能目标：实现添加用户弹窗的打开、关闭、基础字段、初始值、基础校验和未保存确认。
- 前置依赖：OIC-005A、OIC-001F
- 阻塞后续：OIC-006B-D
- 影响页面：用户管理
- 涉及组件：`UserEditorModal`
- 涉及数据对象：UserCreateDraft、Department
- 涉及 service 方法：`checkUserUnique`
- 完成后必须刷新的数据：无；本切片不提交创建
- 必须写入的审计日志：无；未产生写操作
- 状态要求：初始、编辑中、校验错误、关闭确认、选项加载失败
- 权限要求：有新增用户权限才显示入口；普通用户无入口
- 校验要求：用户名、姓名、邮箱、手机号、工号、部门基础规则；用户名格式和长度按 PRD
- 交互要求：取消/关闭时若表单有变更需二次确认
- 人工验收点：逐项输入非法用户名、全空格姓名、非法邮箱/手机号
- 验收标准：
  - [ ] 弹窗字段包含 PRD 基础字段。
  - [ ] 用户名必填、唯一、格式、长度校验可见。
  - [ ] 姓名非全空格校验可见。
  - [ ] 邮箱/手机号格式校验可见。
  - [ ] 关闭未保存表单会二次确认。
- 当前状态：Not Started

### OIC-006B 认证方式、初始密码与激活通知

- 切片 ID：OIC-006B
- PRD 章节：9.8.3、17.1
- 页面或模块：用户管理 - 添加用户认证配置
- 功能目标：实现认证方式联动、初始密码生成方式、激活通知和密码策略校验。
- 前置依赖：OIC-006A、OIC-001E
- 阻塞后续：OIC-006D
- 影响页面：用户管理
- 涉及组件：`InitialPasswordPanel`
- 涉及数据对象：AuthType、PasswordMode、PasswordPolicy、UserCreateDraft
- 涉及 service 方法：`getTenantIdentityPolicy`、`generateInitialPassword`
- 完成后必须刷新的数据：UserCreateDraft
- 必须写入的审计日志：无；未产生创建写操作
- 状态要求：策略加载、SSO 未配置禁用、密码生成成功/失败、字段隐藏/显示
- 权限要求：租户未配置 SSO 时不可选择 SSO；纯 SSO 隐藏初始密码
- 校验要求：手动密码满足安全策略；首次登录自设密码必须填写邮箱；随机密码需 12 位且包含大小写字母、数字、特殊字符
- 交互要求：认证方式变化联动密码字段和激活通知要求
- 人工验收点：无 SSO 配置、首次登录自设密码但无邮箱、手动弱密码
- 验收标准：
  - [ ] password/sso/mixed 三种认证方式联动正确。
  - [ ] SSO 未配置时相关选项禁用。
  - [ ] 首次登录自设密码强制邮箱。
  - [ ] 随机密码生成后可在创建成功阶段展示。
- 当前状态：Not Started

### OIC-006C 组织关系、用户组与角色选择

- 切片 ID：OIC-006C
- PRD 章节：9.8.2、9.8.3
- 页面或模块：用户管理 - 添加用户关系配置
- 功能目标：实现部门、用户组、角色选择和权限过滤，不提交创建。
- 前置依赖：OIC-006A、OIC-001B、OIC-001E
- 阻塞后续：OIC-006D、OIC-008
- 影响页面：用户管理、部门、用户组、角色成员
- 涉及组件：`UserRelationPicker`
- 涉及数据对象：Department、UserGroup、Role、AssignableRole、UserCreateDraft
- 涉及 service 方法：`listDepartments`、`listUserGroups`、`listAssignableRoles`
- 完成后必须刷新的数据：UserCreateDraft
- 必须写入的审计日志：无；未产生写操作
- 状态要求：选项加载、选项空、选项错误、无权限、字段禁用
- 权限要求：组织管理员只能选择管理范围内用户组和可分配角色；不允许分配系统管理员
- 校验要求：部门只能选择 active；用户组仅 active；角色仅当前管理员可分配
- 交互要求：多选用户组/角色；外部同步来源时部门不可本地修改并提示原因
- 人工验收点：组织管理员视角下候选范围是否被过滤
- 验收标准：
  - [ ] 部门选择只展示 active 部门。
  - [ ] 用户组选择只展示 active 且有管理权的用户组。
  - [ ] 角色选择不包含系统管理员角色。
  - [ ] 无候选时展示清晰空态，不阻塞非必填字段。
- 当前状态：Not Started

### OIC-006D License 分配与创建提交

- 切片 ID：OIC-006D
- PRD 章节：9.8.3、9.8.4、17.1、19.6
- 页面或模块：用户管理 - 添加用户提交
- 功能目标：接入 License 分配方式、创建用户、保存并继续添加、成功账号信息展示和列表刷新。
- 前置依赖：OIC-006A、OIC-006B、OIC-006C、OIC-001G、OIC-001H
- 阻塞后续：OIC-008、OIC-011
- 影响页面：用户管理、概览、License、用户详情、审计日志
- 涉及组件：`UserEditorModal`、账号创建成功结果弹窗
- 涉及数据对象：UserCreatePayload、LicensePolicy、LicenseAssignment、AuditLog
- 涉及 service 方法：`createUser`、`getLicensePolicy`、`recordIdentityAuditLog`、`emitIdentityRefresh`
- 完成后必须刷新的数据：users、userStats、licenseOverview、overviewStats、auditLogs
- 必须写入的审计日志：新建用户
- 状态要求：提交中、创建成功、创建失败、License 已满、通知发送失败、保存并继续添加
- 权限要求：系统管理员和用户管理员可新增；组织管理员按管理范围新增
- 校验要求：提交前聚合全部字段校验；后端唯一性失败需落到对应字段
- 交互要求：保存关闭弹窗并刷新列表；保存并继续添加清空表单并保留弹窗；随机密码创建成功后可复制
- 人工验收点：自动 License 已满、手动 License 暂不占用、保存并继续添加
- 验收标准：
  - [ ] 合法用户可成功创建。
  - [ ] 重复用户名/邮箱/手机号展示明确错误。
  - [ ] License 策略影响默认分配方式。
  - [ ] 创建成功刷新用户列表、统计、License 概览和日志。
  - [ ] 保存并继续添加会清空表单并保持弹窗打开。
- 当前状态：Not Started

### OIC-007A 用户详情抽屉框架与基本信息

- 切片 ID：OIC-007A
- PRD 章节：10.1-10.3
- 页面或模块：用户详情抽屉
- 功能目标：从列表打开详情抽屉，展示基本信息标签页和状态操作按钮占位状态。
- 前置依赖：OIC-005C、OIC-001E、OIC-001F
- 阻塞后续：OIC-007B-D、OIC-008、OIC-009、OIC-010
- 影响页面：用户管理
- 涉及组件：`UserDetailDrawer`、`UserBasicTab`
- 涉及数据对象：UserDetail、UserActionDecision
- 涉及 service 方法：`getUserDetail`
- 完成后必须刷新的数据：userDetail
- 必须写入的审计日志：无；只读详情不写日志
- 状态要求：抽屉加载、详情空、详情错误、无权限、deleted 操作禁用
- 权限要求：组织管理员仅可查看范围内用户；普通用户不可通过管理入口看他人
- 校验要求：用户 ID 必须存在；资源不存在展示 404 状态
- 交互要求：点击用户名或查看打开抽屉；关闭保留列表筛选
- 人工验收点：打开 active、pending、disabled、deleted 用户详情
- 验收标准：
  - [ ] 抽屉包含 PRD 10.2 标签结构。
  - [ ] 基本信息字段覆盖 PRD 10.3。
  - [ ] 加载/错误/无权限状态可重试。
  - [ ] deleted 用户操作按钮禁用或隐藏正确。
- 当前状态：Not Started

### OIC-007B 组织关系、用户组与角色标签页

- 切片 ID：OIC-007B
- PRD 章节：10.4-10.6
- 页面或模块：用户详情抽屉 - 组织关系/用户组/角色
- 功能目标：展示用户主部门、部门路径、上下级、所属用户组和角色成员关系。
- 前置依赖：OIC-007A
- 阻塞后续：OIC-008、OIC-018、OIC-020
- 影响页面：用户详情、部门、用户组、角色成员
- 涉及组件：`UserOrgTab`、`UserGroupsTab`、`UserRolesTab`
- 涉及数据对象：UserOrganizationInfo、UserGroupMembership、RoleMembership
- 涉及 service 方法：`getUserOrganizationInfo`、`listUserGroupMemberships`、`listUserRoleMemberships`
- 完成后必须刷新的数据：userDetail.organization、userDetail.groups、userDetail.roles
- 必须写入的审计日志：无；只读不写日志
- 状态要求：各标签加载、空、错误、无权限、继承来源不可操作
- 权限要求：操作按钮按用户列表和角色分配权限判断；系统管理员角色不可在此添加
- 校验要求：加入方式区分手动、部门继承、外部同步、动态规则
- 交互要求：查看部门跳转部门页面并定位；添加/移除按钮仅作为后续切片入口策略，不做假动作
- 人工验收点：继承用户组不可移除原因、角色权限延迟提示入口
- 验收标准：
  - [ ] 组织关系字段覆盖 PRD 10.4。
  - [ ] 用户组列表字段覆盖 PRD 10.5。
  - [ ] 角色列表字段覆盖 PRD 10.6。
  - [ ] 非手动加入关系展示不可直接移除原因。
- 当前状态：Not Started

### OIC-007C License、第三方账号与安全标签页

- 切片 ID：OIC-007C
- PRD 章节：10.7、10.8
- 页面或模块：用户详情抽屉 - License/第三方账号/安全
- 功能目标：展示用户 License 信息、第三方绑定状态、安全登录信息。
- 前置依赖：OIC-007A、OIC-001E
- 阻塞后续：OIC-022、OIC-024、OIC-025
- 影响页面：用户详情、第三方绑定、License、个人资料
- 涉及组件：`UserLicenseTab`、`UserBindingsTab`、`UserSecurityTab`
- 涉及数据对象：LicenseAssignment、IdentityBinding、LoginDevice、LoginMethod
- 涉及 service 方法：`getUserLicenseDetail`、`listUserIdentityBindings`、`getUserSecurityInfo`
- 完成后必须刷新的数据：userDetail.license、userDetail.bindings、userDetail.security
- 必须写入的审计日志：无；只读不写日志
- 状态要求：加载、空、错误、无权限、分配/释放按钮禁用、唯一登录方式解绑禁用
- 权限要求：License 操作仅 active 用户且有剩余 License；唯一登录方式不可解绑
- 校验要求：disabled/deleted 用户不可分配 License；仅登录方式绑定不可解绑
- 交互要求：查看、解绑、重新匹配按钮先按权限展示，实际操作由 OIC-022/OIC-024 实现
- 人工验收点：active/disabled/deleted 用户 License 按钮差异；唯一登录方式提示
- 验收标准：
  - [ ] License 标签页字段覆盖 PRD 10.7。
  - [ ] 第三方账号标签页字段覆盖 PRD 10.8。
  - [ ] 禁用和删除用户不可分配 License。
  - [ ] 唯一登录方式解绑按钮禁用并提示原因。
- 当前状态：Not Started

### OIC-007D 操作记录、跨页跳转与详情刷新

- 切片 ID：OIC-007D
- PRD 章节：10.2、18
- 页面或模块：用户详情抽屉 - 操作记录
- 功能目标：展示用户相关操作记录，并接入跨页面刷新事件，使用户变更后详情自动刷新。
- 前置依赖：OIC-007A、OIC-001G、OIC-001H
- 阻塞后续：OIC-008、OIC-009、OIC-010、OIC-026B
- 影响页面：用户详情、审计日志
- 涉及组件：`UserLogsTab`
- 涉及数据对象：IdentityAuditLog、RefreshTopic
- 涉及 service 方法：`listIdentityAuditLogs`、`subscribeIdentityRefresh`
- 完成后必须刷新的数据：userDetail、userAuditLogs
- 必须写入的审计日志：无；只读日志查询不写日志
- 状态要求：日志加载、空、错误、无权限、刷新中
- 权限要求：管理员按管理范围查看；普通用户不可看他人日志
- 校验要求：日志过滤对象 ID 为当前用户
- 交互要求：用户相关 topic 触发后刷新当前抽屉详情和日志
- 人工验收点：模拟用户状态变更后抽屉内容刷新
- 验收标准：
  - [ ] 操作记录标签页可展示当前用户相关日志。
  - [ ] 日志空态和错误态完整。
  - [ ] 跨页刷新事件能刷新当前用户详情。
  - [ ] 查看部门等跳转不会丢失基础路由参数。
- 当前状态：Not Started

### OIC-008 编辑用户

- 切片 ID：OIC-008
- PRD 章节：9.10
- 页面或模块：用户管理 - 编辑用户
- 功能目标：编辑本地用户基础信息、组织关系、用户组、角色、认证方式；外部同步用户仅允许编辑本地关系字段。
- 前置依赖：OIC-006C、OIC-006D、OIC-007A、OIC-007B、OIC-001G、OIC-001H
- 阻塞后续：无
- 影响页面：用户管理、用户详情、部门、用户组、角色成员、审计日志
- 涉及组件：`UserEditorModal`
- 涉及数据对象：UserEditableDetail、UserUpdatePayload、AuditLog
- 涉及 service 方法：`getUserEditableDetail`、`updateUser`、`listAssignableRoles`、`listManageableUserGroups`
- 完成后必须刷新的数据：users、userDetail、departments、groups、roles、auditLogs
- 必须写入的审计日志：编辑用户
- 状态要求：初始值加载、外部同步只读、保存中、成功、失败、无权限
- 权限要求：按角色和管理范围限制；不可通过此处分配系统管理员
- 校验要求：复用添加用户字段校验；外部同步只读字段不能提交变更
- 交互要求：从列表或详情进入；锁定字段展示原因；取消有未保存确认
- 人工验收点：本地用户与外部同步用户编辑差异
- 验收标准：
  - [ ] 本地用户可编辑 PRD 允许字段。
  - [ ] 外部同步用户关键字段只读且不能提交变更。
  - [ ] 角色变更成功后提示权限 1 分钟内生效。
  - [ ] 保存后列表、详情和日志刷新。
- 当前状态：Not Started

### OIC-009 用户启用、禁用与账号辅助操作

- 切片 ID：OIC-009
- PRD 章节：9.6、9.11、9.12、19.1-19.3
- 页面或模块：用户管理 - 状态操作
- 功能目标：支持禁用、启用、发送激活通知、重置密码、复制账号信息、查看登录记录/操作日志入口。
- 前置依赖：OIC-005C、OIC-007A、OIC-001G、OIC-001H
- 阻塞后续：OIC-010、OIC-012、OIC-024
- 影响页面：用户管理、用户详情、License、审计日志
- 涉及组件：`DisableUserConfirmModal`、`EnableUserConfirmModal`、`ResetPasswordModal`
- 涉及数据对象：User、LicenseAssignment、LoginSession、AuditLog
- 涉及 service 方法：`disableUser`、`enableUser`、`sendActivationNotice`、`resetUserPassword`、`listUserLoginRecords`
- 完成后必须刷新的数据：users、userDetail、licenseOverview、userLicenses、auditLogs
- 必须写入的审计日志：禁用用户、启用用户、重置本地账号密码、发送激活通知
- 状态要求：确认弹窗、操作中、阻断禁用、成功、失败、无权限、刷新失败
- 权限要求：当前用户不能禁用自己；唯一系统管理员不可禁用；不可操作超范围或系统管理员
- 校验要求：重置密码满足密码策略；发送激活通知仅 pending 用户；deleted 用户不可操作
- 交互要求：禁用/启用必须确认；更多菜单只显示可执行项
- 人工验收点：当前用户、唯一系统管理员、deleted 用户操作边界
- 验收标准：
  - [ ] 禁用会释放 License 并失效会话。
  - [ ] 启用不恢复历史会话。
  - [ ] 当前用户不能禁用自己。
  - [ ] 唯一系统管理员禁用按钮禁用并提示。
  - [ ] 操作后刷新用户、License 和日志。
- 当前状态：Not Started

### OIC-010 单用户删除与资产交接

- 切片 ID：OIC-010
- PRD 章节：9.13、17.2、19.1-19.3
- 页面或模块：用户管理 - 删除用户
- 功能目标：实现删除前影响检查、资产交接、确认删除三步流程。
- 前置依赖：OIC-005C、OIC-007A、OIC-009、OIC-001G、OIC-001H
- 阻塞后续：OIC-012
- 影响页面：用户管理、用户详情、部门、用户组、角色成员、License、审计日志
- 涉及组件：`DeleteUserWizard`、`UserDeleteImpactStep`、`AssetTransferStep`、`DangerConfirmStep`
- 涉及数据对象：UserDeleteImpact、AssetTransferPlan、User、AuditLog
- 涉及 service 方法：`checkUserDeleteImpact`、`transferUserAssets`、`deleteUser`、`searchActiveUsers`
- 完成后必须刷新的数据：users、userStats、departments、groups、roles、licenseOverview、auditLogs
- 必须写入的审计日志：删除用户
- 状态要求：检查加载、阻断项、非阻断项、接收人选择、删除中、成功、失败
- 权限要求：仅系统管理员可删除；当前用户和唯一系统管理员不可删除
- 校验要求：接收人 active、同租户、非本人；高危确认输入“确认删除”
- 交互要求：三步弹窗支持上一步/取消；取消未完成交接需确认
- 人工验收点：未转交资产、运行中任务、部门负责人、唯一系统管理员
- 验收标准：
  - [ ] 阻断项存在时不能进入删除提交。
  - [ ] 非阻断负责人项要求选择替代负责人。
  - [ ] 有资产时必须选择接收人。
  - [ ] 未输入“确认删除”不能提交。
  - [ ] 删除后用户状态为 deleted 并释放 License。
- 当前状态：Not Started

### OIC-011A 批量导入模板与文件上传

- 切片 ID：OIC-011A
- PRD 章节：9.9.1-9.9.3
- 页面或模块：用户管理 - 批量导入
- 功能目标：实现导入弹窗步骤、模板下载、文件点击/拖拽上传和文件级校验。
- 前置依赖：OIC-005A、OIC-001E、OIC-001F
- 阻塞后续：OIC-011B、OIC-011C
- 影响页面：用户管理
- 涉及组件：`UserImportModal`、`ImportTemplateStep`、`ImportUploadStep`
- 涉及数据对象：UserImportTemplate、ImportFileState、ImportJob
- 涉及 service 方法：`downloadUserImportTemplate`、`validateUserImportFileMeta`
- 完成后必须刷新的数据：importJobDraft
- 必须写入的审计日志：无；仅下载模板和文件校验不写业务操作日志
- 状态要求：初始、模板下载中、上传中、文件格式错误、大小错误、行数错误、无权限
- 权限要求：系统管理员和用户管理员可导入；组织管理员按范围导入；普通用户无入口
- 校验要求：XLSX/CSV、10MB、最多 5000 行、表头完整
- 交互要求：点击上传和拖拽上传均可；失败保留弹窗
- 人工验收点：上传非 CSV/XLSX、超 10MB、表头缺失文件
- 验收标准：
  - [ ] 弹窗包含 4 步流程展示。
  - [ ] 模板字段覆盖 PRD 9.9.2。
  - [ ] 文件格式、大小、表头、行数校验可见。
  - [ ] 文件级校验失败不能进入预览。
- 当前状态：Not Started

### OIC-011B 批量导入预览与行级校验

- 切片 ID：OIC-011B
- PRD 章节：9.9.3-9.9.4、17.1
- 页面或模块：用户管理 - 导入预览
- 功能目标：展示预览表格、通过/警告/错误状态和行级错误原因。
- 前置依赖：OIC-011A、OIC-001E
- 阻塞后续：OIC-011C
- 影响页面：用户管理
- 涉及组件：`ImportPreviewTable`
- 涉及数据对象：UserImportPreviewRow、ImportValidationStatus、Department、UserGroup、Role
- 涉及 service 方法：`validateUserImportRows`
- 完成后必须刷新的数据：importPreviewRows、importValidationSummary
- 必须写入的审计日志：无；预校验不写操作日志
- 状态要求：校验中、预览空、错误行、警告行、全部通过、校验失败
- 权限要求：角色和用户组可分配性按当前管理员过滤
- 校验要求：必填、用户名/邮箱/手机号唯一、部门编码存在、用户组存在、角色可分配
- 交互要求：错误行不可提交；警告行可提交但需要确认
- 人工验收点：重复用户名、部门不存在、不可分配角色、警告行
- 验收标准：
  - [ ] 预览表格包含 PRD 9.9.4 全部列。
  - [ ] 错误行展示明确错误原因。
  - [ ] 错误行存在时提交按钮禁用。
  - [ ] 警告行存在时提交前要求确认。
- 当前状态：Not Started

### OIC-011C 批量导入提交、进度与结果

- 切片 ID：OIC-011C
- PRD 章节：9.9.5、17.1、18
- 页面或模块：用户管理 - 导入提交
- 功能目标：提交导入、展示进度、成功/失败/跳过数、下载结果文件并刷新用户列表。
- 前置依赖：OIC-011B、OIC-001G、OIC-001H
- 阻塞后续：无
- 影响页面：用户管理、概览、License、审计日志
- 涉及组件：`ImportResultPanel`
- 涉及数据对象：ImportJob、ImportResult、AuditLog
- 涉及 service 方法：`submitUserImport`、`getUserImportProgress`、`downloadUserImportResult`、`recordIdentityAuditLog`
- 完成后必须刷新的数据：users、userStats、licenseOverview、overviewStats、auditLogs
- 必须写入的审计日志：批量导入用户
- 状态要求：提交确认、导入中、部分成功、成功、失败、结果下载失败
- 权限要求：沿用 OIC-011A 导入权限
- 校验要求：错误行存在禁止提交；警告行确认后提交
- 交互要求：导入中显示进度条；完成后可下载结果文件
- 人工验收点：部分失败导入、警告确认导入、下载结果
- 验收标准：
  - [ ] 导入过程中展示进度。
  - [ ] 完成后展示成功、失败、跳过数量。
  - [ ] 支持下载导入结果文件。
  - [ ] 导入完成刷新用户列表、统计、License 和日志。
- 当前状态：Not Started

### OIC-012 用户批量操作与导出收口

- 切片 ID：OIC-012
- PRD 章节：6.1.3、9.7、9.13.5
- 页面或模块：用户管理 - 批量操作
- 功能目标：补齐批量禁用、批量删除、批量导出、批量结果反馈。
- 前置依赖：OIC-005D、OIC-009、OIC-010、OIC-001G、OIC-001H
- 阻塞后续：无
- 影响页面：用户管理、用户详情、License、审计日志
- 涉及组件：`UserBatchActionBar`、`BatchDeleteUserWizard`、`BatchResultDrawer`
- 涉及数据对象：BatchActionResult、UserDeleteImpact、AuditLog
- 涉及 service 方法：`batchDisableUsers`、`batchCheckUserDeleteImpact`、`batchDeleteUsers`、`exportUsers`
- 完成后必须刷新的数据：users、userStats、licenseOverview、auditLogs
- 必须写入的审计日志：批量禁用用户、批量删除用户、导出用户
- 状态要求：未选择禁用、处理中、部分成功、全部成功、失败、导出超限、刷新失败
- 权限要求：批量删除不能包含系统管理员和当前用户；逐条校验权限
- 校验要求：存在阻断项整批不可提交；批量删除需确认数量和资产交接
- 交互要求：底部操作条随选择出现；危险操作必须确认；结果支持失败明细
- 人工验收点：混合选择 active/disabled/deleted/系统管理员/当前用户
- 验收标准：
  - [ ] 未选择用户时批量操作不可用。
  - [ ] 系统管理员和当前用户不能被批量删除。
  - [ ] 阻断项存在时整批不可提交。
  - [ ] 批量结果展示成功和失败明细。
  - [ ] 操作后刷新列表、统计、License 和日志。
- 当前状态：Not Started

### OIC-013 部门树与部门详情只读

- 切片 ID：OIC-013
- PRD 章节：11.1-11.4、11.6、17.3
- 页面或模块：部门与组织架构
- 功能目标：实现左侧部门树、搜索定位、展开/收起、同步组织架构入口和右侧部门详情/成员列表只读。
- 前置依赖：OIC-001A、OIC-001B、OIC-001E、OIC-001F
- 阻塞后续：OIC-014、OIC-015
- 影响页面：部门与组织架构、用户详情
- 涉及组件：`DepartmentOrgView`、`DepartmentTreePanel`、`DepartmentDetailPanel`、`DepartmentMemberTable`、`OrgSyncProgressDrawer`
- 涉及数据对象：Department、DepartmentTreeNode、DepartmentMember、OrgSyncReport
- 涉及 service 方法：`getDepartmentTree`、`getDepartmentDetail`、`searchDepartments`、`startOrgSync`、`getOrgSyncReport`
- 完成后必须刷新的数据：departmentTree、departmentDetail、syncReport
- 必须写入的审计日志：同步组织架构触发结果可记录外部同步日志；不记录普通只读
- 状态要求：树加载、空、搜索空、错误、无权限、同步中、同步成功、同步失败
- 权限要求：系统管理员和组织管理员可见；用户管理员不可编辑部门树；普通用户无入口
- 校验要求：搜索按部门名称/编码；同步失败展示失败原因和日志入口
- 交互要求：点击树节点加载详情；搜索结果高亮定位；同步需确认
- 人工验收点：外部同步失败、搜索无结果、无权限访问
- 验收标准：
  - [ ] 左右布局符合 PRD。
  - [ ] 部门节点展示名称、人数、来源、状态。
  - [ ] 搜索结果可定位节点。
  - [ ] 同步组织架构需确认并展示进度。
- 当前状态：Not Started

### OIC-014 部门新建、编辑与删除

- 切片 ID：OIC-014
- PRD 章节：11.5、11.7、11.8
- 页面或模块：部门与组织架构 - 部门 CRUD
- 功能目标：支持新建一级部门/子部门、编辑本地部门、删除空本地部门。
- 前置依赖：OIC-013、OIC-001G、OIC-001H
- 阻塞后续：OIC-015
- 影响页面：部门与组织架构、用户管理、用户详情、审计日志
- 涉及组件：`DepartmentEditorModal`、`DeleteDepartmentConfirm`
- 涉及数据对象：Department、DepartmentPayload、DepartmentDeleteImpact、AuditLog
- 涉及 service 方法：`createDepartment`、`updateDepartment`、`deleteDepartment`、`checkDepartmentDeleteImpact`
- 完成后必须刷新的数据：departmentTree、departmentDetail、users、auditLogs
- 必须写入的审计日志：新建部门、修改部门、删除部门
- 状态要求：表单初始、保存中、外部同步只读、删除禁用、成功、失败、无权限
- 权限要求：系统管理员可管理全部；组织管理员按授权范围；外部同步部门关键字段不可本地编辑
- 校验要求：部门名称必填且同父级唯一；编码租户唯一；上级部门不可为自身/子部门；负责人 active；排序值整数
- 交互要求：删除确认展示部门名称；不可删除 hover 展示原因
- 人工验收点：同名部门、循环上级、外部部门、非空部门删除
- 验收标准：
  - [ ] 可创建一级部门和子部门。
  - [ ] 同级部门名称不可重复。
  - [ ] 不允许将部门移动到自身子部门下。
  - [ ] 有子部门、用户或规则引用时不可删除。
  - [ ] 写操作后刷新部门树和日志。
- 当前状态：Not Started

### OIC-015 部门成员管理

- 切片 ID：OIC-015
- PRD 章节：11.9
- 页面或模块：部门与组织架构 - 成员管理
- 功能目标：支持添加成员、移动成员主部门、移除成员和导出成员。
- 前置依赖：OIC-013、OIC-014、OIC-005C、OIC-001G、OIC-001H
- 阻塞后续：无
- 影响页面：部门与组织架构、用户管理、用户详情、审计日志
- 涉及组件：`DepartmentMemberPickerModal`、`MoveDepartmentConfirm`
- 涉及数据对象：DepartmentMember、User、AuditLog
- 涉及 service 方法：`searchActiveUsers`、`addDepartmentMembers`、`removeDepartmentMember`、`exportDepartmentMembers`
- 完成后必须刷新的数据：departmentDetail、departmentTree、users、userDetail、auditLogs
- 必须写入的审计日志：修改部门、编辑用户
- 状态要求：成员表加载、空、错误、无权限、操作禁用、成功、失败
- 权限要求：系统管理员和授权组织管理员可操作；用户管理员按范围控制用户部门变更
- 校验要求：仅 active 用户可选；已在部门用户不可选；已有主部门时需确认移动
- 交互要求：用户选择弹窗支持搜索、多选；移除成员需确认；导出需确认
- 人工验收点：移动已有主部门用户、移除成员后用户详情同步
- 验收标准：
  - [ ] 添加成员仅可选择 active 用户。
  - [ ] 已在该部门用户不可重复选择。
  - [ ] 移动主部门前有确认。
  - [ ] 移除成员不影响登录、用户组和角色。
  - [ ] 成员变更后刷新部门和用户详情。
- 当前状态：Not Started

### OIC-016 用户组列表与新建

- 切片 ID：OIC-016
- PRD 章节：12.1-12.5
- 页面或模块：用户组管理
- 功能目标：实现用户组类型树、用户组列表、筛选、分页、刷新、导出和新建用户组。
- 前置依赖：OIC-001A、OIC-001B、OIC-001E、OIC-001F、OIC-001G、OIC-001H
- 阻塞后续：OIC-017、OIC-018、OIC-019
- 影响页面：用户组管理、用户详情、权限中心跳转、审计日志
- 涉及组件：`UserGroupManagementView`、`UserGroupTypeTree`、`UserGroupTable`、`UserGroupEditorModal`
- 涉及数据对象：UserGroup、ProjectRef、UserGroupPayload、AuditLog
- 涉及 service 方法：`listUserGroups`、`createUserGroup`、`exportUserGroups`、`searchActiveUsers`、`listProjects`
- 完成后必须刷新的数据：groups、groupStats、auditLogs
- 必须写入的审计日志：新建用户组、导出用户组
- 状态要求：默认、加载、空、筛选空、错误、无权限、创建中、成功、失败
- 权限要求：系统管理员可建系统级/自定义组；组织管理员可建范围内项目级组；无创建权限空态不展示主按钮
- 校验要求：用户组名称必填且租户唯一；负责人 active；项目级必填项目；系统级不可填项目
- 交互要求：创建成功后提示是否立即前往权限中心授权
- 人工验收点：系统级/项目级字段联动、重复组名、无创建权限空态
- 验收标准：
  - [ ] 用户组类型树包含部门、系统级、项目级、自定义。
  - [ ] 列表字段覆盖 PRD 12.4.3。
  - [ ] 新建弹窗字段覆盖 PRD 12.5.1。
  - [ ] 项目级必须选项目，系统级不可选项目。
  - [ ] 创建成功刷新列表并写日志。
- 当前状态：Not Started

### OIC-017 用户组详情基本信息与删除

- 切片 ID：OIC-017
- PRD 章节：12.6、12.7、12.10
- 页面或模块：用户组详情
- 功能目标：展示用户组详情基本信息、授权摘要、操作记录，并支持编辑、启用/禁用、删除和前往授权。
- 前置依赖：OIC-016、OIC-001G、OIC-001H
- 阻塞后续：OIC-018、OIC-019
- 影响页面：用户组管理、用户详情、审计日志
- 涉及组件：`UserGroupDetailView`、`UserGroupBasicPanel`、`DeleteUserGroupModal`
- 涉及数据对象：UserGroupDetail、UserGroupDeleteImpact、AuditLog
- 涉及 service 方法：`getUserGroupDetail`、`updateUserGroup`、`disableUserGroup`、`enableUserGroup`、`checkUserGroupDeleteImpact`、`deleteUserGroup`
- 完成后必须刷新的数据：groups、groupDetail、users、userDetail、auditLogs
- 必须写入的审计日志：编辑用户组、删除用户组
- 状态要求：详情加载、空、错误、无权限、外部来源只读、删除阻断/警告、成功、失败
- 权限要求：有管理权用户可编辑；来源非 local 不可删除；被审批/系统配置引用不可删除
- 校验要求：编辑复用创建规则；删除需输入用户组名称；被资源授权引用时展示影响
- 交互要求：点击名称进入详情；前往授权跳转权限中心并带入用户组
- 人工验收点：被授权资源引用、审批引用、外部来源用户组
- 验收标准：
  - [ ] 基本信息字段覆盖 PRD 12.7。
  - [ ] 来源非 local 时删除不可用。
  - [ ] 删除确认展示成员数、子组数、授权资源数和影响。
  - [ ] 删除需输入用户组名称。
  - [ ] 删除后刷新列表、详情相关用户和日志。
- 当前状态：Not Started

### OIC-018 用户组成员管理

- 切片 ID：OIC-018
- PRD 章节：12.8
- 页面或模块：用户组详情 - 成员
- 功能目标：实现成员列表、添加成员、移除成员、批量移除。
- 前置依赖：OIC-017、OIC-005C、OIC-001G、OIC-001H
- 阻塞后续：无
- 影响页面：用户组详情、用户详情、角色/权限继承摘要、审计日志
- 涉及组件：`UserGroupMembersTab`、`GroupMemberPickerModal`、`BatchRemoveMembersConfirm`
- 涉及数据对象：UserGroupMember、User、AuditLog
- 涉及 service 方法：`listUserGroupMembers`、`addUserGroupMembers`、`removeUserGroupMember`、`batchRemoveUserGroupMembers`
- 完成后必须刷新的数据：groupMembers、groupDetail、users、userDetail、auditLogs
- 必须写入的审计日志：添加用户组成员、移除用户组成员
- 状态要求：表格默认、加载、空、错误、无权限、继承成员禁用、成功、失败
- 权限要求：仅有用户组管理权限者可添加/移除；继承成员不可直接移除
- 校验要求：仅 active 用户可选；已在组中不可选；批量移除跳过继承成员并提示
- 交互要求：成员搜索按用户名/姓名/邮箱；移除和批量移除均需确认
- 人工验收点：手动成员、子组继承成员、批量混合移除
- 验收标准：
  - [ ] 成员列表字段覆盖 PRD 12.8.1。
  - [ ] 添加成员只展示 active 且不在组内用户。
  - [ ] 子组继承成员不可直接移除并提示原因。
  - [ ] 批量移除自动跳过继承成员并展示结果。
  - [ ] 成员变更刷新成员数、用户详情和日志。
- 当前状态：Not Started

### OIC-019 用户组子组管理与循环校验

- 切片 ID：OIC-019
- PRD 章节：12.9、19.5
- 页面或模块：用户组详情 - 子组
- 功能目标：支持添加子组、移除子组，并校验父子组循环引用。
- 前置依赖：OIC-017、OIC-001G、OIC-001H
- 阻塞后续：OIC-018 继承成员准确性
- 影响页面：用户组详情、用户详情、权限继承摘要、审计日志
- 涉及组件：`UserGroupSubgroupsTab`、`SubgroupPickerModal`
- 涉及数据对象：UserGroup、SubgroupRelation、AuditLog
- 涉及 service 方法：`listUserGroupSubgroups`、`searchAvailableSubgroups`、`addUserGroupSubgroups`、`removeUserGroupSubgroup`、`validateGroupCycle`
- 完成后必须刷新的数据：groupSubgroups、groupMembers、groupDetail、userDetail、auditLogs
- 必须写入的审计日志：编辑用户组、添加用户组成员关系、移除用户组成员关系
- 状态要求：默认、加载、空、错误、无权限、循环禁用、成功、失败
- 权限要求：有用户组管理权限者可操作；部门用户组/外部组按来源限制
- 校验要求：不可选择自身、父级组、会形成循环的组
- 交互要求：添加弹窗展示不可选原因；移除只解除关系不删除子组，必须确认
- 人工验收点：A 包 B、B 包 C 后，C 不能包 A
- 验收标准：
  - [ ] 不允许选择当前组自身。
  - [ ] 不允许选择父级组。
  - [ ] 不允许形成循环嵌套。
  - [ ] 移除子组不删除子组本身。
  - [ ] 子组变化刷新继承成员和日志。
- 当前状态：Not Started

### OIC-020 角色成员关系管理

- 切片 ID：OIC-020
- PRD 章节：13
- 页面或模块：角色成员关系
- 功能目标：实现角色列表、角色成员详情、添加成员、移除成员、前往权限配置。
- 前置依赖：OIC-001A、OIC-001B、OIC-001E、OIC-001F、OIC-005C、OIC-001G、OIC-001H
- 阻塞后续：OIC-006C、OIC-008 的角色候选准确性
- 影响页面：角色成员关系、用户详情、审计日志
- 涉及组件：`RoleMemberManagementView`、`RoleListPanel`、`RoleMembersTable`、`RoleMemberPickerModal`
- 涉及数据对象：Role、RoleMember、User、AuditLog
- 涉及 service 方法：`listRoles`、`listRoleMembers`、`addRoleMembers`、`removeRoleMember`
- 完成后必须刷新的数据：roles、roleMembers、users、userDetail、auditLogs
- 必须写入的审计日志：添加角色成员、移除角色成员
- 状态要求：列表/成员默认、加载、空、错误、无权限、规则加入禁用、成功、失败
- 权限要求：系统管理员可管理全部；组织管理员仅管理范围内角色；系统管理员角色不可在此移除
- 校验要求：仅 active 用户可选；已在角色中不可选；只能添加当前管理员有权分配角色
- 交互要求：点击角色右侧展示成员；添加成功提示权限 1 分钟内生效
- 人工验收点：规则加入成员、系统管理员角色、无权限角色
- 验收标准：
  - [ ] 角色列表字段覆盖 PRD 13.4。
  - [ ] 成员列表字段覆盖 PRD 13.5。
  - [ ] 添加成员只展示 active 且未加入用户。
  - [ ] 规则加入成员不可直接移除。
  - [ ] 系统管理员角色移除需指向企业信息页面处理。
- 当前状态：Not Started

### OIC-021 第三方账号绑定列表与冲突视图

- 切片 ID：OIC-021
- PRD 章节：14.1-14.7、19.7
- 页面或模块：第三方账号绑定
- 功能目标：展示绑定概览、绑定列表、冲突列表、自动匹配结果状态。
- 前置依赖：OIC-001A、OIC-001B、OIC-001E、OIC-001F、OIC-005C
- 阻塞后续：OIC-022、OIC-025D
- 影响页面：第三方账号绑定、用户详情、个人资料
- 涉及组件：`IdentityBindingView`、`IdentityBindingOverview`、`IdentityBindingTable`、`IdentityConflictTable`
- 涉及数据对象：IdentityBinding、ExternalIdentityAccount、BindingOverview
- 涉及 service 方法：`getIdentityBindingOverview`、`listIdentityBindings`、`listIdentityConflicts`
- 完成后必须刷新的数据：bindingOverview、identityBindings、identityConflicts
- 必须写入的审计日志：无；只读列表不写日志
- 状态要求：默认、加载、无身份源空态、筛选空、错误、无权限、冲突状态
- 权限要求：系统管理员可管理；用户管理员可查看/处理；组织管理员按范围；无身份源显示接入提示
- 校验要求：状态值 bound/unbound/conflict/invalid；自动匹配优先级按 PRD
- 交互要求：筛选平台、绑定状态、用户状态、最近同步时间、关键词；查看打开详情抽屉
- 人工验收点：无第三方身份源、冲突账号、invalid 外部账号
- 验收标准：
  - [ ] 绑定概览展示 5 类统计。
  - [ ] 绑定列表字段覆盖 PRD 14.5。
  - [ ] 冲突账号不会自动绑定。
  - [ ] 无身份源时展示空状态和接入提示。
- 当前状态：Not Started

### OIC-022 第三方账号手动绑定、解绑与重新匹配

- 切片 ID：OIC-022
- PRD 章节：14.8-14.10、10.8、16.6
- 页面或模块：第三方账号绑定 - 操作
- 功能目标：支持手动绑定、解绑、覆盖冲突确认、重新匹配和绑定详情。
- 前置依赖：OIC-021、OIC-007C、OIC-001G、OIC-001H
- 阻塞后续：OIC-025D 完整自助绑定体验
- 影响页面：第三方账号绑定、用户详情、个人资料、审计日志
- 涉及组件：`IdentityBindingDrawer`、`ManualBindModal`、`UnbindIdentityConfirm`、`RematchResultModal`
- 涉及数据对象：IdentityBinding、LoginMethod、AuditLog
- 涉及 service 方法：`manualBindIdentity`、`unbindIdentity`、`rematchIdentityBinding`、`checkUserLoginMethods`
- 完成后必须刷新的数据：identityBindings、identityConflicts、bindingOverview、userDetail.bindings、profile.bindings、auditLogs
- 必须写入的审计日志：绑定第三方账号、解绑第三方账号
- 状态要求：详情加载、候选空、错误、无权限、唯一登录方式禁用、操作成功、操作失败
- 权限要求：管理员按范围操作；唯一登录方式不可解绑；普通用户仅能操作自己的允许平台
- 校验要求：目标用户 active；覆盖旧绑定需确认；解绑前检查其他登录方式
- 交互要求：绑定搜索平台用户；重新匹配展示唯一、无匹配或冲突结果
- 人工验收点：唯一登录方式、覆盖旧绑定、重新匹配到多个用户
- 验收标准：
  - [ ] 手动绑定可选择 active 平台用户。
  - [ ] 覆盖旧绑定前有二次确认。
  - [ ] 唯一登录方式不可解绑。
  - [ ] 重新匹配结果正确落到 bound/unbound/conflict。
  - [ ] 操作后刷新绑定列表、用户详情、个人资料和日志。
- 当前状态：Not Started

### OIC-023 License 用量与策略

- 切片 ID：OIC-023
- PRD 章节：15.1-15.5、19.6
- 页面或模块：License 管理 - 用量与策略
- 功能目标：展示 License 用量概览、使用率警告、策略查看和编辑保存。
- 前置依赖：OIC-001A、OIC-001B、OIC-001E、OIC-001F、OIC-001G、OIC-001H
- 阻塞后续：OIC-024、OIC-006D
- 影响页面：License 管理、概览、添加用户、禁用/删除用户
- 涉及组件：`LicenseManagementView`、`LicenseUsageOverview`、`LicensePolicyPanel`
- 涉及数据对象：LicenseOverview、LicensePolicy、AuditLog
- 涉及 service 方法：`getLicenseOverview`、`getLicensePolicy`、`updateLicensePolicy`
- 完成后必须刷新的数据：licenseOverview、licensePolicy、overviewStats、auditLogs
- 必须写入的审计日志：修改 License 策略
- 状态要求：默认、加载、空、错误、无权限、编辑禁用、保存成功、保存失败
- 权限要求：仅系统管理员可修改策略；未开启 License 管理时菜单隐藏
- 校验要求：策略只能 auto_join/manual_assign；切换策略不影响已占用用户；90%/100% 警告正确
- 交互要求：编辑进入编辑态；取消未保存确认；保存后刷新用量
- 人工验收点：使用率 90%、100%、策略切换后新用户规则
- 验收标准：
  - [ ] 显示总数、已占用、剩余、禁用释放、待分配、使用率。
  - [ ] 90% 使用率显示黄色警告。
  - [ ] 100% 使用率显示红色警告。
  - [ ] 策略保存写日志并刷新概览。
- 当前状态：Not Started

### OIC-024A 用户 License 与待分配列表

- 切片 ID：OIC-024A
- PRD 章节：15.6
- 页面或模块：License 管理 - 用户 License 列表
- 功能目标：实现用户 License 列表、待分配用户列表、筛选、分页、查看用户入口。
- 前置依赖：OIC-023、OIC-005C、OIC-007A
- 阻塞后续：OIC-024B-D
- 影响页面：License 管理、用户详情
- 涉及组件：`UserLicenseTable`、`PendingLicenseTable`
- 涉及数据对象：UserLicenseRow、LicenseStatus、PaginationState
- 涉及 service 方法：`listUserLicenses`、`listPendingLicenseUsers`
- 完成后必须刷新的数据：userLicenses、pendingLicenseUsers、pagination
- 必须写入的审计日志：无；只读列表不写日志
- 状态要求：列表默认、加载、空、筛选空、错误、无权限、操作禁用
- 权限要求：系统管理员可查看全部；其他角色按权限进入或无入口
- 校验要求：disabled/deleted 用户操作禁用；查看用户跳转到用户详情
- 交互要求：查看用户打开或跳转用户详情；筛选保留分页规则
- 人工验收点：active、disabled、deleted、pending License 行状态
- 验收标准：
  - [ ] 用户 License 列表字段覆盖 PRD 15.6。
  - [ ] 待分配列表可独立展示。
  - [ ] 查看用户能定位用户详情。
  - [ ] disabled/deleted 用户分配操作禁用。
- 当前状态：Not Started

### OIC-024B 单用户 License 分配与释放

- 切片 ID：OIC-024B
- PRD 章节：15.7、15.8、10.7、19.6
- 页面或模块：License 管理 - 单用户操作
- 功能目标：支持单用户分配 License、释放 License、释放原因和二次确认。
- 前置依赖：OIC-024A、OIC-001G、OIC-001H
- 阻塞后续：OIC-024C、OIC-024D
- 影响页面：License 管理、用户详情、概览、审计日志
- 涉及组件：`AssignLicenseModal`、`ReleaseLicenseConfirm`
- 涉及数据对象：LicenseAssignment、LicenseType、AuditLog
- 涉及 service 方法：`assignLicense`、`releaseLicense`、`recordIdentityAuditLog`
- 完成后必须刷新的数据：licenseOverview、userLicenses、pendingLicenseUsers、userDetail.license、overviewStats、auditLogs
- 必须写入的审计日志：分配 License、释放 License
- 状态要求：检查中、License 不足、分配中、释放确认、成功、失败、无权限
- 权限要求：仅 active 用户可分配；disabled/deleted 不可分配；剩余数必须大于 0
- 校验要求：释放需填写或选择原因；License 类型必选
- 交互要求：释放前展示“释放后无法访问需要 License 的业务产品”确认
- 人工验收点：License 剩余 0、disabled 用户、释放后个人资料仍可访问提示
- 验收标准：
  - [ ] active 用户且剩余数大于 0 才可分配。
  - [ ] License 已满时不可分配并提示。
  - [ ] 释放操作必须二次确认。
  - [ ] 操作后刷新用量、列表、用户详情和日志。
- 当前状态：Not Started

### OIC-024C License 批量分配与释放

- 切片 ID：OIC-024C
- PRD 章节：15.9
- 页面或模块：License 管理 - 批量操作
- 功能目标：支持批量分配、批量释放、逐条跳过不可操作用户和结果明细。
- 前置依赖：OIC-024B
- 阻塞后续：OIC-024D
- 影响页面：License 管理、用户管理、用户详情、审计日志
- 涉及组件：`LicenseBatchActionBar`、`BatchLicenseResultDrawer`
- 涉及数据对象：BatchLicensePayload、BatchActionResult、AuditLog
- 涉及 service 方法：`batchAssignLicenses`、`batchReleaseLicenses`
- 完成后必须刷新的数据：licenseOverview、userLicenses、pendingLicenseUsers、users、userStats、auditLogs
- 必须写入的审计日志：分配 License、释放 License
- 状态要求：未选择禁用、批量处理中、部分成功、全部成功、失败、License 不足
- 权限要求：仅 active 用户可批量分配；disabled/deleted 自动跳过；批量释放需二次确认
- 校验要求：批量分配数量不能超过剩余 License 数
- 交互要求：操作结束展示成功和失败明细
- 人工验收点：选中数量超过剩余数、混合 active/disabled/deleted
- 验收标准：
  - [ ] License 不足时阻止提交超过剩余数的分配。
  - [ ] disabled/deleted 用户自动跳过并在结果中提示。
  - [ ] 批量释放需要二次确认。
  - [ ] 操作完成刷新用量、列表和日志。
- 当前状态：Not Started

### OIC-024D License 操作记录与刷新收口

- 切片 ID：OIC-024D
- PRD 章节：15.3、18、21.5
- 页面或模块：License 管理 - 操作记录
- 功能目标：展示 License 操作记录，并确保禁用/删除用户释放 License 后本页刷新一致。
- 前置依赖：OIC-024B、OIC-024C、OIC-009、OIC-010、OIC-001H
- 阻塞后续：OIC-026C
- 影响页面：License 管理、用户管理、审计日志
- 涉及组件：`LicenseOperationLogs`
- 涉及数据对象：IdentityAuditLog、LicenseAssignment、RefreshTopic
- 涉及 service 方法：`listLicenseLogs`、`subscribeIdentityRefresh`
- 完成后必须刷新的数据：licenseLogs、licenseOverview、userLicenses
- 必须写入的审计日志：无新增；读取分配/释放/禁用/删除已有日志
- 状态要求：日志加载、空、错误、无权限、刷新中
- 权限要求：仅有 License 管理权限可查看
- 校验要求：日志按 License 相关动作过滤
- 交互要求：监听 users/licenses/auditLogs topic 触发刷新
- 人工验收点：禁用用户后 License 用量和日志立即更新
- 验收标准：
  - [ ] 操作记录显示分配、释放、禁用释放、删除释放。
  - [ ] 禁用用户后 License 自动释放体现在本页。
  - [ ] 删除用户后 License 自动释放体现在本页。
  - [ ] 跨页面刷新不需要整页重载。
- 当前状态：Not Started

### OIC-025A 个人资料只读页

- 切片 ID：OIC-025A
- PRD 章节：16.1-16.4
- 页面或模块：个人资料
- 功能目标：普通用户和管理员可查看自己的基础资料、所属组织、角色与用户组。
- 前置依赖：OIC-001A、OIC-001B、OIC-001E、OIC-001F
- 阻塞后续：OIC-025B-D
- 影响页面：个人资料、头像菜单
- 涉及组件：`PersonalProfileView`、`ProfileBasicPanel`、`ProfileOrganizationPanel`、`ProfileRolesGroupsPanel`
- 涉及数据对象：MyProfile、Department、UserGroupMembership、RoleMembership
- 涉及 service 方法：`getMyProfile`
- 完成后必须刷新的数据：myProfile
- 必须写入的审计日志：无；只读不写日志
- 状态要求：默认、加载、空、错误、无权限、字段禁用
- 权限要求：普通用户只能访问自己；所有角色都可访问自己的个人资料
- 校验要求：用户名、工号、部门、角色、用户组只读
- 交互要求：右上角头像菜单和左侧个人资料入口均可进入
- 人工验收点：普通用户只能看到个人资料入口并成功进入
- 验收标准：
  - [ ] 展示头像、姓名、用户名、邮箱、手机号、工号、职位。
  - [ ] 展示所属组织、角色与用户组。
  - [ ] 普通用户不能修改用户名、部门、角色、用户组。
  - [ ] 加载、错误、空态完整。
- 当前状态：Not Started

### OIC-025B 修改个人资料

- 切片 ID：OIC-025B
- PRD 章节：16.4.1、18
- 页面或模块：个人资料 - 修改资料
- 功能目标：支持用户按系统配置修改头像、姓名、职位等允许自助修改字段。
- 前置依赖：OIC-025A、OIC-001G、OIC-001H
- 阻塞后续：无
- 影响页面：个人资料、顶部头像、审计日志
- 涉及组件：`ProfileEditModal`
- 涉及数据对象：MyProfileUpdatePayload、ProfileEditableFieldConfig、AuditLog
- 涉及 service 方法：`getProfileEditableConfig`、`updateMyProfile`
- 完成后必须刷新的数据：myProfile、currentUserDisplay、auditLogs
- 必须写入的审计日志：修改个人资料
- 状态要求：表单初始、保存中、成功、失败、字段禁用、关闭确认
- 权限要求：只能修改自己的允许字段
- 校验要求：头像格式/大小按配置；姓名和职位按配置校验；不允许提交只读字段
- 交互要求：保存成功关闭弹窗并刷新页面；失败保留输入
- 人工验收点：尝试修改用户名、部门、角色、用户组
- 验收标准：
  - [ ] 默认允许修改头像、姓名、职位。
  - [ ] 默认不允许修改用户名、工号、部门、角色、用户组。
  - [ ] 关闭未保存表单有二次确认。
  - [ ] 保存成功刷新个人资料并写日志。
- 当前状态：Not Started

### OIC-025C 修改密码与账号安全

- 切片 ID：OIC-025C
- PRD 章节：16.5、16.7、18
- 页面或模块：个人资料 - 账号安全
- 功能目标：支持密码用户修改密码，展示登录设备并退出其他设备。
- 前置依赖：OIC-025A、OIC-001G、OIC-001H
- 阻塞后续：无
- 影响页面：个人资料、登录状态、审计日志
- 涉及组件：`ChangePasswordModal`、`LoginDevicesPanel`
- 涉及数据对象：PasswordChangePayload、LoginDevice、AuditLog
- 涉及 service 方法：`changeMyPassword`、`listMyLoginDevices`、`logoutOtherDevices`
- 完成后必须刷新的数据：myProfile.security、loginDevices、auditLogs
- 必须写入的审计日志：修改密码、退出其他设备
- 状态要求：纯 SSO 隐藏、表单校验、提交中、成功、失败、设备加载、设备空、设备错误
- 权限要求：认证方式包含 password 才展示修改密码；纯 SSO 不展示
- 校验要求：当前密码必填；新密码满足策略；确认一致；新密码不能与当前密码相同
- 交互要求：修改密码成功保留当前会话并失效其他设备；退出其他设备需确认
- 人工验收点：纯 SSO 用户、确认密码不一致、弱密码、退出其他设备
- 验收标准：
  - [ ] password/mixed 用户可看到修改密码按钮。
  - [ ] 纯 SSO 用户不展示修改密码按钮。
  - [ ] 密码校验失败不提交。
  - [ ] 修改成功后其他设备失效。
  - [ ] 退出其他设备需二次确认并写日志。
- 当前状态：Not Started

### OIC-025D 个人第三方绑定与登录设备联动

- 切片 ID：OIC-025D
- PRD 章节：16.6、16.7、14.9、18
- 页面或模块：个人资料 - 第三方账号绑定
- 功能目标：支持用户查看、绑定、解绑自己的第三方账号，并处理唯一登录方式限制。
- 前置依赖：OIC-025A、OIC-022、OIC-001G、OIC-001H
- 阻塞后续：OIC-026C
- 影响页面：个人资料、第三方账号绑定、用户详情、审计日志
- 涉及组件：`ProfileBindingPanel`
- 涉及数据对象：IdentityBinding、LoginMethod、AuditLog
- 涉及 service 方法：`bindMyIdentity`、`unbindMyIdentity`、`checkMyLoginMethods`
- 完成后必须刷新的数据：myProfile.bindings、identityBindings、userDetail.bindings、auditLogs
- 必须写入的审计日志：绑定第三方账号、解绑第三方账号
- 状态要求：绑定状态加载、授权跳转中、扫码弹窗、绑定成功、绑定失败、唯一登录方式解绑禁用
- 权限要求：用户只能操作自己的允许平台；唯一登录方式不可解绑
- 校验要求：解绑后必须仍有其他登录方式
- 交互要求：绑定跳转第三方授权或扫码，成功回到个人资料
- 人工验收点：唯一登录方式解绑、授权成功回跳、绑定失败
- 验收标准：
  - [ ] 已配置平台逐项展示绑定状态。
  - [ ] 唯一登录方式解绑按钮禁用并提示。
  - [ ] 绑定成功刷新个人资料、用户详情和绑定管理列表。
  - [ ] 解绑成功写日志并刷新相关页面。
- 当前状态：Not Started

### OIC-026A 审计日志写入接入

- 切片 ID：OIC-026A
- PRD 章节：18、20.7、21.7
- 页面或模块：所有写操作
- 功能目标：把已实现写操作统一接入 `recordIdentityAuditLog`，保证成功和失败均可记录。
- 前置依赖：OIC-001G、OIC-001H；依赖目标写操作切片已完成
- 阻塞后续：OIC-026B、OIC-026C
- 影响页面：企业信息、用户管理、部门、用户组、角色成员、第三方绑定、License、个人资料
- 涉及组件：无新增视觉组件；接入各写操作 service
- 涉及数据对象：IdentityAuditLog、AuditAction、AuditResult
- 涉及 service 方法：`recordIdentityAuditLog`
- 完成后必须刷新的数据：auditLogs、overview.recentLogs、相关详情操作记录
- 必须写入的审计日志：PRD 18 列出的全部已实现写操作
- 状态要求：写日志成功、写日志失败不吞业务结果、失败操作记录失败原因
- 权限要求：日志记录不能泄露无权限对象敏感字段
- 校验要求：日志字段完整，原值/新值结构化
- 交互要求：写操作完成后触发 auditLogs refresh topic
- 人工验收点：成功创建用户、失败删除用户、License 释放三类日志
- 验收标准：
  - [ ] 新建/编辑/禁用/启用/删除用户写日志。
  - [ ] 部门新增/编辑/删除写日志。
  - [ ] 用户组和角色成员变更写日志。
  - [ ] 第三方绑定/解绑写日志。
  - [ ] License 分配/释放/策略修改写日志。
  - [ ] 失败操作记录失败原因。
- 当前状态：Not Started

### OIC-026B 审计日志查询表格

- 切片 ID：OIC-026B
- PRD 章节：18、21.7
- 页面或模块：操作日志表格复用组件
- 功能目标：实现可复用身份操作日志表格，用于概览最近操作、用户详情、用户组详情、License 操作记录。
- 前置依赖：OIC-001G、OIC-007D、OIC-024D
- 阻塞后续：OIC-026C
- 影响页面：概览、用户详情、用户组详情、License 管理、审计日志展示区域
- 涉及组件：`IdentityAuditLogTable`
- 涉及数据对象：IdentityAuditLog、AuditLogFilter、PaginationState
- 涉及 service 方法：`listIdentityAuditLogs`
- 完成后必须刷新的数据：auditLogs、pagination
- 必须写入的审计日志：无；查询日志不写日志
- 状态要求：默认、加载、空、筛选空、错误、无权限、分页
- 权限要求：管理员按范围查看；普通用户只看自己的安全相关日志
- 校验要求：表格字段包含操作人、时间、对象、原值、新值、结果、失败原因
- 交互要求：支持按动作、对象、时间筛选；失败原因可查看
- 人工验收点：不同角色看到的日志范围不同
- 验收标准：
  - [ ] 日志表格字段覆盖 PRD 18。
  - [ ] 支持分页和筛选。
  - [ ] 空态、错误态、无权限态完整。
  - [ ] 原值/新值可读，不只展示 `[object Object]`。
- 当前状态：Not Started

### OIC-026C 全模块审计覆盖与一致性回归

- 切片 ID：OIC-026C
- PRD 章节：18、21.7
- 页面或模块：全模块审计和跨页面刷新收口
- 功能目标：对 PRD 25 类日志动作做覆盖检查，并补齐遗漏的刷新 topic 和日志展示位置。
- 前置依赖：OIC-026A、OIC-026B；所有写操作切片完成后执行
- 阻塞后续：PRD Verified
- 影响页面：全模块
- 涉及组件：所有写操作入口和日志展示组件
- 涉及数据对象：IdentityAuditLog、RefreshTopic
- 涉及 service 方法：`recordIdentityAuditLog`、`listIdentityAuditLogs`、`emitIdentityRefresh`
- 完成后必须刷新的数据：auditLogs、overviewStats、users、departments、groups、roles、bindings、licenses、profile
- 必须写入的审计日志：PRD 18 全部 25 类动作
- 状态要求：成功日志、失败日志、部分成功日志、刷新成功、刷新失败
- 权限要求：日志查看不越权；失败原因不泄露敏感数据
- 校验要求：每类动作都有对象类型、对象 ID、对象名称、原值、新值、结果
- 交互要求：写操作后相关页面可通过刷新事件得到一致数据
- 人工验收点：按 PRD 18 清单逐项触发或模拟并检查日志
- 验收标准：
  - [ ] PRD 18 的 25 类操作均可产生日志。
  - [ ] PRD 21.7 的日志验收全部通过。
  - [ ] 用户、部门、用户组、License、绑定、个人资料变更后相关页面数据一致。
  - [ ] 审计日志中的失败记录包含失败原因。
  - [ ] 无跨页面陈旧数据残留。
- 当前状态：Not Started
