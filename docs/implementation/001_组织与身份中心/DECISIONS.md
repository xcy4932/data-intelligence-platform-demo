# 组织与身份中心 DECISIONS

## D001 - PRD 文件路径使用实际文件名

- 日期：2026-05-30
- 决策：实施文档以 `docs/prd/001-组织与身份中心 PRD.md` 作为当前 PRD 文件。
- 原因：`MASTER_PRD_QUEUE.md` 中原路径为 `docs/prd/001_组织与身份中心.md`，但仓库中实际存在的文件名为 `001-组织与身份中心 PRD.md`。
- 影响：本次会把队列中 001 的 PRD File 修正为实际路径，避免后续任务读取失败。

## D002 - 实施目录命名

- 日期：2026-05-30
- 决策：实施目录使用 `docs/implementation/001_组织与身份中心/`。
- 原因：符合 AGENTS.md 示例格式 `编号_模块名`，同时与 PRD 编号保持一致。
- 影响：后续该 PRD 的进度、验收、当前切片都在此目录维护。

## D003 - 首个实现切片选择基础壳层

- 日期：2026-05-30
- 决策：下一步实现从 OIC-001 “信息架构、导航与基础数据壳层” 开始。
- 原因：PRD 覆盖 9 个页面和大量操作，先建立路由、菜单、权限上下文、类型、mock/service 壳层，能让后续页面切片在同一数据契约上演进。
- 影响：首个代码切片不实现完整 CRUD，只提供受控入口、状态基座和数据模型。

## D004 - 前端服务聚合为一个组织身份 service

- 日期：2026-05-30
- 决策：前端初期建议使用 `organizationIdentityService.ts` 聚合 PRD 中 TenantService、UserService、DepartmentService、UserGroupService、IdentityBindingService、LicenseService、AuditLogService 的 mock 调用。
- 原因：项目当前服务层以前端场景 service + mock 数据为主；先聚合可减少早期文件散落，后续若模块过大再拆分。
- 影响：类型仍保持按领域清晰命名，避免把业务逻辑塞入纯视觉组件。

## D005 - 路由菜单先接入受控页面壳

- 日期：2026-05-30
- 决策：OIC-001A 的 9 个二级入口统一进入 `OrganizationIdentityShellView`，无权限先使用 `/organization-identity/forbidden` 的受控 403 壳层，License 菜单先使用本地配置开关预留。
- 原因：当前切片只建立入口、标题、面包屑和状态壳，不实现业务页面；统一壳层能避免出现可点击假业务按钮。
- 影响：OIC-001B 将继续收口角色权限、菜单显隐和页面访问判断。

## D006 - 角色菜单矩阵以 OIC-001B 显式规则为准

- 日期：2026-05-30
- 决策：新增 `organizationIdentityPermissions.ts` 作为组织身份权限统一判断入口，菜单、路由守卫和后续操作按钮均应复用该工具。
- 原因：mock seed 中的权限上下文用于数据场景覆盖，但 OIC-001B 对四类角色菜单可见性有更明确的收口要求，尤其组织管理员不展示第三方账号绑定入口。
- 影响：后续页面不应在 Vue 组件内重复拼装角色规则；如需新增页面或操作权限，应先补充该矩阵。

## D007 - 通用状态表达集中到组织身份组件目录

- 日期：2026-05-30
- 决策：OIC-001F 新增 `src/components/business/organization-identity/` 组件目录，集中提供状态块、权限守卫和禁用原因提示。
- 原因：后续列表、详情、弹窗切片都需要一致的 loading、empty、error、403、404 和 disabled 表达，提前收口能减少页面内重复状态逻辑。
- 影响：后续组织身份页面应优先复用 `OrgIdentityStateBlock`、`OrgIdentityPermissionGuard` 和 `DisabledReasonTip`，不要在业务页面内重复硬编码通用状态文案。

## D008 - 审计日志写入使用运行期内存 store

- 日期：2026-05-30
- 决策：OIC-001G 中 `recordIdentityAuditLog` 不再只返回临时对象，而是写入 `organizationIdentityService.ts` 内的运行期内存审计日志 store；`listIdentityAuditLogs` 从同一 store 查询。
- 原因：当前项目使用前端 mock service，后续业务写操作需要在同一浏览器运行期内手动写入后可被查询，满足“手动调用示例写入后，列表查询能看到完整字段”的验收点。
- 影响：该 store 不是持久化存储，刷新页面后仍回到 seed 数据；后续接真实后端时应替换为 AuditLogService API。

## D009 - 跨页面刷新采用轻量 topic 事件总线

- 日期：2026-05-30
- 决策：OIC-001H 新增 `organizationIdentityRefresh.ts`，使用内存 topic listener map 提供 `emitIdentityRefresh`、`subscribeIdentityRefresh` 和取消订阅；topic 对外提供 `groups`、`bindings`、`auditLogs` 等 PRD 语义别名，底层复用既有 `RefreshTopic` 稳定值。
- 原因：后续列表、详情、日志和概览页面需要在写操作成功后局部刷新，但当前阶段不应引入全局状态库或实现具体业务页面。
- 影响：刷新事件只通知页面重新调用 service，不携带权限结果、不替代 service 权限过滤；后续业务写操作应优先复用该工具发出相关 topic。
