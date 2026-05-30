**用户 ID-Mapping 配置功能 PRD**

**1. 文档信息**

| **项目** | **内容** |
| --- | --- |
| 产品模块 | 客户数据平台 / 数据融合 / ID 图谱构建 / ID-Mapping 配置 |
| 功能名称 | 用户 ID-Mapping 配置功能 |
| 文档类型 | 产品功能逻辑级 PRD |
| 适用范围 | 私有化客户数据平台、CDP、用户画像、标签、分群、营销触达、跨主体分析 |
| 目标用户 | 集团管理员、项目管理员、ID Mapping 管理员、数据平台管理员、数据治理人员 |
| 核心目标 | 通过配置主体、ID 类型、ID 数据源、ID 参考关系、OneID 生成图谱，将不同渠道、不同账号、不同设备上的用户标识融合为统一 OneID |
| 参考依据 | 上传的 ID-Mapping 配置逻辑、单主体配置、多主体配置、运维管理、最佳实践和 FAQ 文档 |

ID-Mapping 的本质是通过关联规则和融合算法，将不同渠道来源的同一用户识别并打通，是 VeCDP 数据档案、标签体系、分群、营销和洞察分析的基础底座；系统内 OneID 又称 BaseID，是围绕某个主体融合生成的唯一身份标识。

**2. 产品定位与建设目标**

**2.1 功能定位**

用户 ID-Mapping 配置功能用于解决以下问题：

企业数据中通常同时存在用户 ID、手机号、设备 ID、邮箱、OpenID、UnionID、External\_UserID、WebID 等多种身份标识。不同渠道上报的用户主键不统一，导致同一个自然人在不同系统、不同设备、不同业务场景中的数据无法串联。ID-Mapping 配置功能需要通过可视化配置方式，让管理员定义：

1. 哪些对象需要被识别为同一个主体；
2. 每个主体有哪些 ID 类型；
3. 每个 ID 类型的数据从哪里来；
4. 不同 ID 之间如何建立参考关系；
5. 当多个 ID 发生冲突时，谁优先、如何选取；
6. 最终如何生成稳定、可追溯、可运维的 OneID。

单主体场景主要围绕“用户”进行 ID 识别和打通，用于跨平台用户识别、营销活动优化和个性化推荐。

**2.2 产品目标**

本功能上线后，需要达到以下目标：

| **目标** | **说明** |
| --- | --- |
| 可配置 | 管理员可以通过页面完成主体、ID、参考关系、优先级、策略、数据源配置 |
| 可校验 | 系统在配置过程中自动校验 ID 标识唯一性、数据源合法性、字段类型、关系合法性 |
| 可生成 | 配置发布后自动生成 OneID 任务、ID 数据同步任务、关系生成任务 |
| 可追踪 | 支持查看任务运行状态、DAG 依赖、运行记录、血缘和下游影响 |
| 可排查 | 支持通过 ID 查询 OneID 映射关系，查看 OneID 重组变化 |
| 可管控 | 支持权限控制、主体可见范围、ID 可见范围、在线服务配置 |
| 可扩展 | 支持未来扩展多主体关系、人车关系、人店关系、商品关系等场景 |

**3. 核心概念定义**

**3.1 主体 Subject**

主体是需要进行 ID-Mapping 的目标对象，又称对象、个体或实体，例如人、车、门店、商品品类等。主体通常应具备主动行为日志或经营日志，并且具有完整生命周期变化。

在本 PRD 中，默认主要建设“用户”主体，但系统设计必须支持未来扩展为多主体。

**主体判断逻辑**

系统在产品层面不自动判断主体是否合理，但页面配置时需要引导管理员按以下逻辑定义：

| **判断条件** | **处理逻辑** |
| --- | --- |
| 不同数据对象具有相同或相似行为路径 | 可以配置为同一主体 |
| 不同数据对象行为完全不同 | 应配置为不同主体 |
| 不同业务部门要求客户资产绝对隔离 | 即使行为相似，也应配置为不同主体 |
| 不同渠道用户可被集团交叉运营 | 可配置为同一主体 |
| 不同渠道用户属于部门独立资产 | 建议配置为不同主体 |

**3.2 OneID / BaseID**

OneID 是 ID-Mapping 融合后的最终产物，表示某个主体下被识别为同一个对象的唯一身份标识。系统内可以统一命名为 base\_id。

核心规则：

| **规则** | **说明** |
| --- | --- |
| 一个 ID 值只能对应一个 OneID | 任何 ID 查询 OneID 时只能返回一个结果 |
| 多个 ID 可以对应同一个 OneID | 例如 UID、手机号、设备 ID 被识别为同一用户 |
| OneID 是标签、画像、分群、营销触达的基础主键 | 下游应用默认以 OneID 作为用户粒度 |
| OneID 可以因配置变化或参考关系变化而重组 | 需通过重组变化功能追踪 |

OneID 是通过 ID-Mapping 产生的唯一身份标识，VeCDP 数据档案和标签体系均以 BaseID 作为主键构建；通过不同 ID 查询 OneID 只能查询到一个结果，不存在一个 ID 对应多个 OneID。

**3.3 ID 类型**

ID 类型是主体身份的某类标识，例如：

| **ID 类型** | **示例** | **说明** |
| --- | --- | --- |
| 业务 ID | UID、MemberID | 业务系统注册产生的用户 ID |
| 手机号 | Phone、Phone\_MD5、Phone\_SHA256 | 可用于短信触达或认证识别 |
| 设备标识 | DeviceID、IDFA、OAID、IMEI | 用于匿名用户识别和跨设备归因 |
| 微信标识 | OpenID、UnionID、APPID + OpenID | 用于微信生态用户识别 |
| 邮箱 | Email | 可用于账号识别或邮件触达 |
| 组合 ID | APPID + OpenID | 两个字段组合才能唯一识别一个用户 |

系统需要支持单一 ID 和组合 ID。组合 ID 不直接等于两个独立 ID，而是一个复合身份标识。

**3.4 参考关系**

参考关系是 ID 融合打通的关键。它表示两个 ID 类型之间存在可用于身份融合的业务关联。

例如：

| **来源 ID** | **参考 ID** | **业务含义** |
| --- | --- | --- |
| DeviceID | UID | 某设备登录过某 UID |
| OpenID | DeviceID | 微信小程序可获得设备信息 |
| Phone | UID | 某手机号绑定某会员 |
| UnionID | UID | 通过授权登录绑定企业微信用户 |

参考关系不是多主体转换关系。参考关系服务于同一主体内部多个 ID 的 OneID 生成；主体转换关系服务于不同主体之间的转换，例如人和车、人和店。

**3.5 优先级**

优先级用于决定 OneID 生成时的基准 ID 顺序。

最佳实践要求：

| **原则** | **说明** |
| --- | --- |
| 业务 ID 最高优 | 业务 UID、车辆 VIN、商家 ShopID 等通常优先级最高 |
| 非最高优先级 ID 不可孤立 | 低优先级 ID 应尽量配置参考关系，参考高优先级 ID |
| 默认配置保持沉默 | 不应轻易修改系统默认生成策略 |

“业务 ID 最高优、非最高优先级不可孤立、默认设置保持沉默”。

**4. 用户角色与权限**

**4.1 角色定义**

| **角色** | **权限范围** |
| --- | --- |
| 集团管理员 admin | 拥有全部 ID 图谱配置、运行、删除、授权、高级配置权限 |
| 项目管理员 | 可查看项目内 ID-Mapping 配置，可按授权范围执行部分管理操作 |
| ID Mapping 管理员 | 被授权后可编辑 ID 图谱配置 |
| 普通分析用户 | 默认只能使用 ID-Mapping 结果，不可修改配置 |
| 运维用户 | 可查看任务信息、运行记录、血缘和数据探查结果，是否可重跑由权限决定 |

**4.2 权限校验规则**

**4.2.1 页面访问权限**

进入 /data-fusion/id-mapping 时，前端调用：

GET /api/idm/permission/current

返回：

{

"canView": true,

"canEdit": true,

"canRun": true,

"canDelete": true,

"canAuthorize": true,

"role": "GROUP\_ADMIN"

}

页面处理逻辑：

| **条件** | **页面表现** |
| --- | --- |
| canView = false | 显示无权限页面 |
| canView = true && canEdit = false | 页面只读，隐藏新建、编辑、删除、发布按钮 |
| canRun = false | 隐藏手动运行、重新运行按钮 |
| canDelete = false | 隐藏删除 ID、删除主体、删除关系按钮 |
| canAuthorize = false | 隐藏授权 ID Mapping 配置权限入口 |

**5. 信息架构**

**5.1 一级入口**

菜单路径：

元数据管理 / ID 图谱构建

**5.2 页面结构**

ID-Mapping 模块包含以下页面：

| **页面** | **路由** | **说明** |
| --- | --- | --- |
| ID 图谱首页 | /data-fusion/id-mapping | 展示主体列表、配置状态、任务状态 |
| 主体配置页 | /data-fusion/id-mapping/subjects | 新建、编辑、查看主体 |
| OneID 配置页 | /data-fusion/id-mapping/subjects/:subjectId/oneid | 配置 ID 类型、参考关系、生成图谱 |
| ID 类型配置页 | /data-fusion/id-mapping/subjects/:subjectId/ids | 管理 ID 类型与数据源 |
| 参考关系配置页 | /data-fusion/id-mapping/subjects/:subjectId/relations | 管理同主体 ID 参考关系 |
| OneID 图谱编辑页 | /data-fusion/id-mapping/subjects/:subjectId/graph | 拖拽配置优先级、参考边、策略 |
| 多主体转换关系页 | /data-fusion/id-mapping/cross-subject-relations | 配置主体之间的转换关系 |
| 任务信息页 | /data-fusion/id-mapping/tasks | 查看任务列表、运行状态、重跑 |
| 血缘管理页 | /data-fusion/id-mapping/lineage | 查看上下游血缘 |
| 数据探查页 | /data-fusion/id-mapping/explore | 查询 ID 到 OneID 映射、OneID 重组变化 |
| 高级配置页 | /data-fusion/id-mapping/settings | 权限、在线服务、可见范围、数据修正 |

**6. 总体业务流程**

**6.1 配置主流程**

完整配置流程如下：

进入 ID 图谱构建

↓

新建主体

↓

配置 ID 类型

↓

配置 ID 全量数据源

↓

配置 ID 参考关系

↓

配置 OneID 生成图谱

↓

预检查

↓

发布配置

↓

生成 / 更新 ID-Mapping 任务

↓

运行任务

↓

产出 OneID 映射表

↓

同步至下游查询存储

↓

供标签、分群、画像、营销、分析使用

单主体文档中将流程拆为：配置主体、配置 ID 类型、配置参考关系、配置 OneID 生成图谱；其中 OneID 图谱通过 ID 优先级和 ID 参考关系定义 OneID 生成逻辑，是最核心配置。

**7. 功能一：ID 图谱首页**

**7.1 页面目标**

ID 图谱首页用于让管理员快速了解当前环境中已经配置了哪些主体、每个主体的 OneID 配置状态、任务运行状态、最近更新时间和异常情况。

**7.2 页面布局**

页面分为四个区域：

[顶部操作区]

- 新建主体

- 任务信息

- 数据探查

- 高级配置

[指标概览区]

- 主体总数

- 已发布主体数

- 待发布主体数

- 今日成功任务数

- 今日失败任务数

- 最近一次运行时间

[主体列表区]

- 主体名称

- 主体类型

- ID 类型数量

- 参考关系数量

- OneID 生成状态

- 任务状态

- 最近发布时间

- 操作

[异常提示区]

- 存在失败任务

- 存在未发布配置

- 存在无数据源 ID

- 存在孤立低优先级 ID

**7.3 主体列表字段**

| **字段** | **类型** | **说明** |
| --- | --- | --- |
| subjectName | string | 主体名称 |
| subjectType | enum | USER、VEHICLE、SHOP、ITEM、CUSTOM |
| idTypeCount | number | 已配置 ID 类型数量 |
| relationCount | number | 已配置参考关系数量 |
| graphStatus | enum | NOT\_CONFIGURED、DRAFT、PUBLISHED、RUNNING、FAILED |
| latestTaskStatus | enum | SUCCESS、FAILED、RUNNING、WAITING、NOT\_RUN |
| lastPublishedAt | datetime | 最近发布时间 |
| lastRunAt | datetime | 最近运行时间 |
| createdBy | string | 创建人 |
| updatedBy | string | 最近更新人 |

**7.4 操作逻辑**

| **操作** | **入口** | **逻辑** |
| --- | --- | --- |
| 新建主体 | 顶部按钮 | 进入新建主体弹窗 |
| 编辑配置 | 主体行操作 | 进入该主体 OneID 配置页 |
| 查看图谱 | 主体行操作 | 进入只读图谱页面 |
| 查看任务 | 主体行操作 | 跳转任务信息页并带入主体筛选 |
| 删除主体 | 主体行操作 | 仅草稿且无下游依赖时允许删除 |
| 发布配置 | 主体行操作 | 触发配置预检查，通过后发布 |

**7.5 空状态**

当无主体时，页面显示：

当前还没有配置 ID 图谱。

你可以先新建一个主体，例如“用户”，再配置用户 ID、手机号、设备 ID 等身份标识。

按钮：

新建主体

**8. 功能二：主体配置**

**8.1 功能目标**

主体配置用于定义一个需要进行 ID-Mapping 的业务对象。每个主体会生成一套独立的 OneID 数据内容。主体可以是人、车、店铺、商品等，OneID 是该主体的唯一身份 ID。

**8.2 新建主体入口**

入口：

ID 图谱首页 / 新建主体

点击后打开右侧抽屉或弹窗。

**8.3 新建主体表单**

| **字段** | **控件** | **必填** | **规则** |
| --- | --- | --- | --- |
| 主体类型 | Select | 是 | USER、VEHICLE、SHOP、ITEM、CUSTOM |
| 主体头像 | 自动展示 | 否 | 根据主体类型自动生成默认头像 |
| 主体名称 | Input | 是 | 2-30 个字符，同一集团内不可重复 |
| 主体英文标识 | Input | 是 | 仅支持小写字母、数字、下划线；创建后不可修改 |
| 主体描述 | Textarea | 否 | 最多 200 字 |
| 是否启用 | Switch | 是 | 默认启用 |

**8.4 主体英文标识生成逻辑**

当用户选择主体类型后，系统自动生成默认英文标识：

| **主体类型** | **默认英文标识** |
| --- | --- |
| 用户 | user |
| 车辆 | vehicle |
| 门店 | shop |
| 商品 | item |
| 自定义 | custom\_subject |

如果默认标识已存在，系统自动追加数字后缀：

user\_2

user\_3

用户可手动修改，但需满足：

^[a-z][a-z0-9\_]{1,63}$

**8.5 校验逻辑**

点击“确定”时按以下顺序校验：

1. 主体名称不能为空；
2. 主体名称同集团内不可重复；
3. 主体英文标识不能为空；
4. 主体英文标识格式必须合法；
5. 主体英文标识同集团内不可重复；
6. 主体描述不能超过 200 字。

错误提示：

| **场景** | **提示** |
| --- | --- |
| 名称为空 | 请输入主体名称 |
| 名称重复 | 当前主体名称已存在，请修改 |
| 英文标识为空 | 请输入主体英文标识 |
| 英文标识格式错误 | 英文标识仅支持小写字母、数字、下划线，且必须以字母开头 |
| 英文标识重复 | 当前主体英文标识已存在，请修改 |

**8.6 创建成功后的系统动作**

创建主体成功后，系统需要：

1. 创建主体记录；
2. 初始化主体配置版本；
3. 初始化 OneID 配置草稿；
4. 跳转到该主体的 OneID 配置页；
5. 页面顶部显示配置步骤条。

**8.7 数据结构**

interface IdmSubject {

id: string;

tenantId: string;

projectId?: string;

subjectName: string;

subjectCode: string;

subjectType: 'USER' | 'VEHICLE' | 'SHOP' | 'ITEM' | 'CUSTOM';

avatarType: string;

description?: string;

status: 'ENABLED' | 'DISABLED';

configStatus: 'DRAFT' | 'PUBLISHED';

createdBy: string;

updatedBy: string;

createdAt: string;

updatedAt: string;

}

**9. 功能三：ID 类型配置**

**9.1 功能目标**

ID 类型配置用于定义该主体下参与 OneID 生成的身份标识，例如 UID、手机号、DeviceID、OpenID、UnionID 等。创建 ID 类型只是 OneID 的准备阶段，ID 暂时不会真正参与 OneID 生成；只有配置数据源并加入 OneID 图谱后，才参与 OneID 计算。

**9.2 ID 类型列表**

**页面字段**

| **字段** | **说明** |
| --- | --- |
| ID 名称 | 例如用户 ID、手机号、设备 ID |
| ID 英文标识 | 接口传参字段，全集团唯一 |
| ID 类型 | 单一 ID / 组合 ID |
| 数据类型 | String、Number |
| 渠道识别标识 | Phone、IDFA、OAID、Email、Custom |
| 数据来源 | 仅实时 / 离线 + 实时 |
| 数据集 | Hive 数据集名称 |
| 更新方式 | 全量 / 增量 |
| 是否可用于 OneID | 已配置全量数据才可用 |
| 配置状态 | 未配置数据源 / 已配置数据源 / 已加入图谱 |
| 操作 | 编辑、配置数据源、删除、查看血缘 |

**9.3 创建方式**

系统支持两种创建方式：

1. 模板批量创建；
2. 自定义创建。

模板批量创建可基于 ID 类型列表批量创建；自定义创建支持单一 ID 或组合 ID，例如 phoneid 是单一 ID，appid + openid 是组合 ID。

**9.4 模板批量创建**

**9.4.1 入口**

ID 类型列表 / 新建 ID 类型 / 模板批量创建

**9.4.2 模板列表字段**

| **字段** | **默认值** | **可编辑** |
| --- | --- | --- |
| 是否选择 | false | 是 |
| ID 类型名称 | 手机号、设备 ID、用户 ID 等 | 是 |
| ID 英文标识 | phone、device\_id、uid 等 | 是 |
| ID 数据类型 | String | 是 |
| 渠道识别标识 | Phone、IDFA、OAID 等 | 是 |
| 来源类型 | 业务 ID、手机号认证、设备标识等 | 否 |
| 推荐优先级 | 1、2、3 | 否 |

**9.4.3 操作逻辑**

1. 用户打开模板批量创建弹窗；
2. 系统加载内置模板；
3. 用户勾选需要创建的 ID；
4. 用户可修改 ID 名称和 ID 英文标识；
5. 点击“确定”；
6. 系统逐条校验；
7. 若全部通过，批量创建；
8. 若部分失败，弹窗展示失败原因，允许用户修改后重试。

**9.4.4 批量校验规则**

| **校验项** | **规则** |
| --- | --- |
| ID 英文标识唯一 | 全集团唯一 |
| ID 英文标识格式 | 英文字母、数字、下划线 |
| ID 名称非空 | 必填 |
| 同批次不可重复 | 当前批量创建列表中不能有重复英文标识 |
| 渠道识别标识合法 | 必须属于系统枚举 |

**9.5 自定义创建：单一 ID**

**9.5.1 表单字段**

| **字段** | **控件** | **必填** | **说明** |
| --- | --- | --- | --- |
| ID 名称 | Input | 是 | 例如手机号 |
| ID 类型描述 | Textarea | 否 | 用于解释 ID 业务含义 |
| ID 英文标识 | Input | 是 | 接口传参字段，全集团唯一 |
| ID 数据类型 | Select | 是 | String、Number，默认 String |
| 渠道识别标识 | Select | 否 | Phone、Email、IDFA、OAID、Custom |
| 是否配置数据 | Switch | 是 | 默认关闭 |
| 数据来源 | Radio | 条件必填 | 仅实时 / 离线 + 实时 |
| 数据集 | Select | 条件必填 | 仅支持 Hive 类型数据集 |
| 日期分区字段 | Select | 条件必填 | 选择数据集分区字段 |
| 日期分区格式 | Select | 条件必填 | yyyyMMdd、yyyy-MM-dd 等 |
| 更新方式 | Radio | 条件必填 | 全量 / 增量 |
| ID 对应字段 | Select | 条件必填 | 数据集中对应 ID 的字段 |

ID 数据类型建议与数仓类型保持一致；渠道识别标识是下游系统识别的重要标记，例如选择 Phone 后下游任务可发送短信，需要谨慎选择。

**9.5.2 是否配置数据逻辑**

| **是否配置数据** | **页面逻辑** |
| --- | --- |
| 关闭 | 仅保存 ID 元信息，该 ID 不可加入 OneID 图谱 |
| 开启 | 展示数据来源、数据集、字段映射、更新方式配置 |

保存后：

| **条件** | **状态** |
| --- | --- |
| 未配置数据 | DATA\_NOT\_CONFIGURED |
| 配置仅实时 | REALTIME\_ONLY |
| 配置离线 + 实时 | OFFLINE\_REALTIME |

**9.5.3 数据来源逻辑**

**仅实时数据**

适用场景：

实时行为中直接携带 ID，并通过实时 ID-Mapping 算子生成 OneID。

页面逻辑：

1. 不要求选择 Hive 数据集；
2. 保存后该 ID 默认可被实时任务使用；
3. 如果需要加入离线 OneID 生成图谱，必须后续补充离线全量数据源。

**离线 + 实时数据**

适用场景：

每天通过 Hive 全量数据集提供 ID 数据，实时数据用于补充当天新增关系。

页面逻辑：

1. 必须选择 Hive 类型数据集；
2. 必须选择日期分区字段；
3. 必须选择 ID 对应字段；
4. 必须选择更新方式；
5. 数据集必须为定时天级更新，否则下拉列表不展示。

ID 图谱构建模块中的数据集特指离线全量 ID 的数据集，目前仅可选 Hive 类型数据集；通过可视化建模输出的全量数据集也需要按 Hive 存储并选择日期字段作为一级分区。

**9.6 自定义创建：组合 ID**

组合 ID 适用于单个字段不能唯一识别用户，必须由两个字段组合形成唯一身份的场景，例如：

APPID + OpenID

**9.6.1 表单结构**

组合 ID 表单分三部分：

基础信息

- 组合 ID 名称

- 组合 ID 英文标识

- 组合 ID 描述

ID1 配置

- ID1 名称

- ID1 英文标识

- ID1 数据类型

- ID1 对应字段

ID2 配置

- ID2 名称

- ID2 英文标识

- ID2 数据类型

- ID2 对应字段

高级配置

- 是否配置维表

- 维表数据集

- 维度值字段

- 维度展示名字段

**9.6.2 组合 ID 生成规则**

后端存储时，不直接拼接展示值作为唯一值，而是生成标准化组合键：

composite\_id\_value = hash(normalize(id1\_value) + '::' + normalize(id2\_value))

其中：

function normalize(value: string | number): string {

return String(value).trim().toLowerCase();

}

前端展示时：

APPID=xxx / OpenID=yyy

后端计算时：

hash(APPID::OpenID)

**9.6.3 高级配置逻辑**

组合 ID 高级配置用于为 ID1 配置可选维度名称，例如 APPID + OpenID 中，APPID 可通过维表映射为“小程序名称”。该维表只用于圈选时分类展示，不参与 OneID 生成。文档中也明确说明，组合 ID 高级配置中的维表用于定义 ID1 可选维度名称，不参与 OneID 生成。

**9.7 编辑 ID 类型**

**可编辑字段**

| **字段** | **未发布前** | **发布后** |
| --- | --- | --- |
| ID 名称 | 可编辑 | 可编辑 |
| ID 描述 | 可编辑 | 可编辑 |
| ID 英文标识 | 可编辑 | 不可编辑 |
| ID 数据类型 | 可编辑 | 不可编辑 |
| 渠道识别标识 | 可编辑 | 谨慎编辑，需二次确认 |
| 数据源 | 可编辑 | 可编辑，但需重新发布 |
| 更新方式 | 可编辑 | 可编辑，但需重新发布 |

**发布后修改影响**

当已发布 ID 修改以下字段时，系统标记配置为：

DRAFT\_CHANGED

并提示：

当前修改会影响 OneID 生成逻辑，需要重新发布并运行 ID-Mapping 任务后生效。

**9.8 删除 ID**

ID 配置页面支持删除 ID；删除 ID 后，该 ID 绑定的 OneID 数据将在下次任务更新时被清空，且删除不可撤回；删除还会影响 OneID 配置、参考关系、多主体关系和在线服务。

**删除权限**

允许删除的角色：

集团管理员

项目管理员

ID Mapping 管理员

**禁止删除条件**

| **条件** | **处理** |
| --- | --- |
| 系统联动 ID | 不允许删除 |
| 当前 ID 被下游标签、分群、资产输出依赖 | 允许删除前必须展示血缘影响并二次确认 |
| 当前 ID 开启在线服务 | 必须提示接口调用可能失败 |
| 当前 ID 参与多主体转换关系 | 必须提示转换关系将失效 |
| 当前 ID 是唯一高优 ID | 必须提示 OneID 生成结果可能大规模变化 |

**删除确认弹窗**

弹窗内容：

删除 ID 后不可恢复。

该 ID 与其他 ID 的参考关系将被删除。

依赖该 ID 的多主体转换关系将失效。

若该 ID 已开启在线服务，相关接口调用将失败。

该 ID 绑定的 OneID 数据将在下次任务更新时被清空。

用户必须输入 ID 英文标识确认：

请输入 ID 英文标识以确认删除：phone

**10. 功能四：ID 数据源配置**

**10.1 功能目标**

ID 数据源配置用于告诉系统每个 ID 类型的全量数据来自哪里。只有完成数据源配置的 ID，才可以加入 OneID 图谱。

**10.2 数据集选择逻辑**

**数据集过滤条件**

下拉选择数据集时，后端只返回满足以下条件的数据集：

| **条件** | **说明** |
| --- | --- |
| 类型为 Hive | 仅支持 Hive 数据集 |
| 定时天级更新 | 非天级任务不展示 |
| 有日期分区字段 | 必须具备一级日期分区 |
| 用户有权限 | 无权限数据集不展示 |
| 未被删除 | 删除状态不展示 |

**10.3 全量与增量更新逻辑**

文档定义：

| **更新方式** | **读取逻辑** |
| --- | --- |
| 全量更新 | 每天读取最新分区，p\_date = 最新一天 |
| 增量更新 | 每天读取历史全部分区，p\_date <= 最新一天 |

该规则在单主体和多主体配置文档中均有说明。

**10.4 配置表单**

| **字段** | **必填** | **说明** |
| --- | --- | --- |
| 数据集 | 是 | Hive 数据集 |
| 日期分区字段 | 是 | 例如 p\_date |
| 日期分区格式 | 是 | 例如 yyyyMMdd |
| 更新方式 | 是 | 全量 / 增量 |
| ID 对应字段 | 是 | 数据集中对应 ID 的字段 |
| 过滤条件 | 否 | 可选 SQL Where 条件 |
| 空值处理 | 是 | 默认过滤空值 |
| 去重方式 | 是 | 默认按 ID 值去重 |

**10.5 字段类型校验**

当用户选择 ID 对应字段后，系统校验：

| **ID 数据类型** | **允许字段类型** |
| --- | --- |
| String | string、varchar、char |
| Number | int、bigint、double、decimal |

如果不匹配，提示：

当前字段类型与 ID 数据类型不一致，请重新选择字段或修改 ID 数据类型。

**10.6 数据预览**

配置数据源后，点击“数据预览”，系统查询最新分区前 100 条数据。

展示字段：

| **字段** | **说明** |
| --- | --- |
| ID 值 | 当前 ID 字段值 |
| 分区日期 | p\_date |
| 是否为空 | true / false |
| 是否重复 | true / false |
| 数据样例 | 原始字段值 |

**10.7 数据质量检查**

保存前自动执行轻量检查：

| **检查项** | **规则** |
| --- | --- |
| 空值率 | 空值率超过 20% 提醒 |
| 重复率 | 重复率超过 90% 提醒 |
| 分区存在性 | 最新分区必须存在 |
| 字段存在性 | 所选字段必须存在 |
| 数据量 | 最新分区数据量为 0 时禁止保存 |

提示示例：

当前 ID 字段在最新分区中的空值率为 35.2%，可能影响 OneID 生成质量，是否继续保存？

**11. 功能五：ID 参考关系配置**

**11.1 功能目标**

参考关系用于定义同一主体下不同 ID 之间如何连接。存在参考关系的 ID 可以被系统识别为同一个 OneID。参考关系通常与优先级组合使用，共同决定 OneID 生成顺序和融合规则。

**11.2 新建参考关系入口**

OneID 配置页 / 参考关系 / 新建参考关系

**11.3 参考关系表单**

| **字段** | **控件** | **必填** | **说明** |
| --- | --- | --- | --- |
| 关系名称 | Input | 是 | 例如设备登录用户关系 |
| 关系描述 | Textarea | 否 | 说明业务含义 |
| 关系数据集 | Select | 是 | 仅支持定时天级 Hive 数据集 |
| 日期分区字段 | Select | 是 | 例如 p\_date |
| 日期分区格式 | Select | 是 | yyyyMMdd 等 |
| 更新方式 | Radio | 是 | 全量 / 增量 |
| 来源 ID 类型 | Select | 是 | 例如 DeviceID |
| 来源 ID 字段 | Select | 是 | 关系数据集中字段 |
| 目标 ID 类型 | Select | 是 | 例如 UID |
| 目标 ID 字段 | Select | 是 | 关系数据集中字段 |
| 映射逻辑 | Radio | 是 | 1:1、1:N、N:1、N:N |
| 是否启用参考策略 | Switch | 否 | 默认关闭 |
| 策略字段 | Select | 条件必填 | 例如 last\_login\_time |
| 策略逻辑 | Select | 条件必填 | 最新、最早、最大、最小 |
| 是否开启解绑 | Switch | 否 | 默认关闭 |

**11.4 映射逻辑**

| **映射逻辑** | **说明** | **示例** |
| --- | --- | --- |
| 1:1 | 一个来源 ID 对应一个目标 ID | 一个 UID 绑定一个 Phone |
| 1:N | 一个来源 ID 对应多个目标 ID | 一个设备登录多个 UID |
| N:1 | 多个来源 ID 对应一个目标 ID | 多个设备登录一个 UID |
| N:N | 多个来源 ID 与多个目标 ID 相互关联 | 多手机号、多设备复杂绑定 |

**11.5 参考策略逻辑**

当参考关系存在一对多或多对多时，如果没有策略，系统默认随机选择一个参考 ID。为了确保结果符合业务预期，需要配置策略字段和策略逻辑。举例：设备 ID 参考手机号时，如果一个设备对应多个手机号，可以设置“最新使用时间”的手机号作为参考手机号。

**策略字段要求**

| **要求** | **说明** |
| --- | --- |
| 字段必须来自关系数据集 | 不能选择其他数据集字段 |
| 字段不能全为空 | 全为空时策略无效 |
| 字段类型必须匹配策略逻辑 | 时间字段可选最新/最早，数值字段可选最大/最小 |
| 同一来源 ID 下策略结果必须可排序 | 否则回退到系统默认 |

**策略逻辑**

| **策略逻辑** | **适用字段类型** | **说明** |
| --- | --- | --- |
| 最新 | datetime、date、timestamp、number | 取最大时间或最大数值 |
| 最早 | datetime、date、timestamp、number | 取最小时间或最小数值 |
| 最大 | number | 取最大值 |
| 最小 | number | 取最小值 |

**策略执行伪代码**

function resolveReferenceTarget(records, sourceId, targetIdField, strategyField, strategyType) {

const candidates = records.filter(r => r.source\_id === sourceId);

if (candidates.length === 0) {

return null;

}

if (!strategyField || !strategyType) {

return randomPick(candidates).target\_id;

}

const validCandidates = candidates.filter(r => r[strategyField] !== null);

if (validCandidates.length === 0) {

return randomPick(candidates).target\_id;

}

switch (strategyType) {

case 'LATEST':

return maxBy(validCandidates, strategyField).target\_id;

case 'EARLIEST':

return minBy(validCandidates, strategyField).target\_id;

case 'MAX':

return maxBy(validCandidates, strategyField).target\_id;

case 'MIN':

return minBy(validCandidates, strategyField).target\_id;

}

}

**11.6 解绑逻辑**

OneID 生成过程中会优先参考已经生成的 OneID，其次依据最新参考关系；开启解绑后，系统优先参考最新一天的参考关系，其次才考虑复用历史 OneID，从而保证 OneID 是最新绑定关系下的结果。

**默认未开启解绑**

场景：

T-1 天：会员 ID 1 绑定手机号 A，生成 baseid1

T 天：会员 ID 1 改绑手机号 B，手机号 A 不再绑定

未开启解绑时：

手机号 A 可能继续复用历史 baseid1

**开启解绑**

开启解绑后：

手机号 A 不再优先复用历史 baseid1，而是根据最新关系重新生成或绑定新的 OneID

开启换绑后，被换绑的手机号不应继续跟原始会员关联。

**11.7 参考关系校验**

保存参考关系时，按以下规则校验：

| **校验项** | **规则** |
| --- | --- |
| 来源 ID 与目标 ID 不能相同 | 禁止自引用 |
| 两个 ID 必须属于同一主体 | 参考关系只服务于同主体内部 |
| 两个 ID 必须已配置数据源 | 未配置全量数据不可创建参考关系 |
| 关系数据集必须为 Hive | 非 Hive 不可选 |
| 字段不能为空 | 来源字段、目标字段必填 |
| 映射逻辑必选 | 不可为空 |
| 策略字段与策略逻辑必须成对出现 | 开启策略时必须同时配置 |
| 不能形成无意义循环 | 允许图上有连接，但不允许同优先级互相参考导致计算歧义 |

**12. 功能六：OneID 生成图谱配置**

**12.1 功能目标**

OneID 生成图谱是 ID-Mapping 配置的核心。它通过 ID 优先级和 ID 参考关系定义 OneID 生成逻辑，最终决定系统如何生成 OneID。文档明确说明，该阶段决定 OneID 如何生成，并最终产生符合标准的 OneID 数据。

**12.2 页面结构**

页面采用图编辑器形式：

左侧：可加入图谱的 ID 类型列表

中间：OneID 生成图谱画布

右侧：选中节点 / 边的配置面板

底部：配置检查结果

顶部：保存草稿、预检查、发布、运行

**12.3 节点逻辑**

每个 ID 类型在图谱中是一个节点。

节点展示：

[ID 名称]

[ID 英文标识]

[优先级：1]

[数据源状态]

[策略标记]

节点状态：

| **状态** | **说明** |
| --- | --- |
| 可加入 | 已配置数据源，尚未加入图谱 |
| 已加入 | 已参与 OneID 生成 |
| 不可加入 | 未配置数据源 |
| 异常 | 数据源失效或字段缺失 |
| 只读 | 已发布配置中，当前用户无编辑权限 |

**12.4 添加 ID 到图谱**

操作：

1. 用户从左侧拖拽 ID 到画布；
2. 系统生成节点；
3. 节点默认追加到最低优先级；
4. 页面标记为草稿未发布。

限制：

| **条件** | **处理** |
| --- | --- |
| ID 未配置数据源 | 禁止拖入 |
| ID 已在图谱中 | 禁止重复添加 |
| ID 被禁用 | 禁止添加 |
| 组合 ID 缺少任一字段配置 | 禁止添加 |

**12.5 优先级配置**

用户通过拖拽节点顺序调整优先级。

**优先级规则**

优先级数字越小，优先级越高。

例如：

UID：1

Phone：2

DeviceID：3

OpenID：4

OneID 生成时，系统优先基于高优先级 ID 生成或复用 OneID。

**12.6 参考边配置**

用户可以在画布中通过连线方式添加 ID 参考关系。

边方向：

低优先级 ID → 高优先级 ID

例如：

DeviceID → UID

Phone → UID

OpenID → DeviceID

业务含义：

DeviceID 参考 UID，若 DeviceID 能通过关系找到 UID，则复用 UID 所在的 OneID。

**12.7 图谱配置检查**

点击“预检查”时，系统执行以下检查：

| **检查项** | **严重级别** | **规则** |
| --- | --- | --- |
| 是否至少有一个 ID | Error | 图谱不能为空 |
| 是否存在未配置数据源 ID | Error | 图谱中的 ID 必须已配置数据源 |
| 是否存在孤立低优先级 ID | Warning | 非最高优先级 ID 建议配置参考关系 |
| 是否存在字段失效 | Error | 数据集字段被删除或类型变化 |
| 是否存在循环参考 | Error | 禁止导致生成顺序歧义的循环 |
| 是否存在多个最高优 ID | Warning | 允许，但需提示可能生成多个 OneID 源头 |
| 是否配置强制一对一冲突 | Error | 强制一对一和关闭 OneID 变化不建议同时配置 |
| 是否存在 N:N 关系但无策略 | Warning | 建议配置参考策略 |
| 是否有下游影响 | Warning | 修改已发布图谱需提示下游影响 |

强制一对一和关闭 OneID 变化不要同时执行，同时配置时可能存在问题。

**13. 功能七：OneID 生成策略配置**

**13.1 策略入口**

入口：

OneID 图谱编辑页 / 高级策略

策略分为：

1. 强制一对一；
2. OneID 是否可变；
3. 离线参考实时；
4. 参考策略；
5. 换解绑策略。

**13.2 强制一对一**

强制一对一默认关闭，表示默认无需强制某种 ID 一个值只能独立对应一个人；当某种渠道 ID 不管如何融合都要求每个 ID 实际对应一个人时，可开启。

**配置字段**

| **字段** | **说明** |
| --- | --- |
| ID 类型 | 选择需要强制一对一的 ID |
| 是否开启 | 默认关闭 |
| 备注 | 必填，说明业务原因 |

**业务逻辑**

未开启：

一个人有两个手机号，两个手机号可能因参考同一设备而融合为同一个 OneID。

开启：

每个手机号分别对应不同 OneID。

**适用场景**

| **场景** | **是否建议开启** |
| --- | --- |
| 所有低优先级 ID 都参考最高优 ID | 不建议开启 |
| 最高优先级 ID 参考低优先级 ID | 建议对最高优 ID 开启 |
| 会员 ID 与手机号要求严格一对一 | 可开启，并配合参考策略 |
| 设备 ID 场景 | 通常不建议开启 |

**13.3 OneID 是否可变**

**功能目标**

控制当参考关系变化时，系统是否允许历史 OneID 被重新组织。

**配置项**

| **字段** | **默认值** |
| --- | --- |
| 是否允许 OneID 变化 | 允许 |
| 是否记录变化日志 | 是 |
| 是否触发数据修正 | 否，需单独开启 |

**处理逻辑**

| **配置** | **结果** |
| --- | --- |
| 允许变化 | 新任务运行后，OneID 可根据最新关系重组 |
| 不允许变化 | 尽量复用历史 OneID，减少下游波动 |
| 配合解绑开启 | 优先依据最新绑定关系，而不是历史 OneID |

**13.4 离线参考实时**

离线参考实时默认开启。当 ID 同时有离线和实时数据时，离线侧数据更全但时效差，实时数据时效高但关系可能不完整，需要决定 OneID 更重视准确性还是更重视实时串联。

**配置项**

| **字段** | **默认值** |
| --- | --- |
| 离线参考实时 | 开启 |
| 实时优先窗口 | 当天 |
| 离线修正实时结果 | 开启 |

**生成逻辑**

实时阶段：

根据实时上报 ID 和实时关系生成临时 OneID。

离线阶段：

每天上游数据集更新完成后，离线任务读取全量关系；

离线任务运行时纳入当天实时数据；

若离线关系更完整，则修正实时 OneID。

IDM 支持离线天级更新和实时更新；离线每天依赖上游数据集执行，实时可秒级生成 OneID；离线和实时可以相互融合，离线更新时也会统计当天实时数据，实时也会参考离线 OneID。

**14. 功能八：发布配置与任务生成**

**14.1 发布入口**

OneID 图谱编辑页 / 发布配置

**14.2 发布前置条件**

发布前必须满足：

| **条件** | **不满足时处理** |
| --- | --- |
| 主体已创建 | 禁止发布 |
| 至少一个 ID 加入图谱 | 禁止发布 |
| 图谱中所有 ID 已配置数据源 | 禁止发布 |
| 所有引用数据集有效 | 禁止发布 |
| 所有引用字段有效 | 禁止发布 |
| 预检查无 Error | 禁止发布 |
| 用户有编辑权限 | 禁止发布 |

Warning 不阻塞发布，但必须在弹窗中展示，并要求用户确认。

**14.3 发布确认弹窗**

展示：

本次发布将更新用户主体的 OneID 生成逻辑。

发布后需要运行 ID-Mapping 任务，新的 OneID 结果才会生效。

如果本次修改涉及 ID 优先级、参考关系、强制一对一、解绑策略，可能导致 OneID 发生变化，并影响下游标签、分群、画像、营销任务。

按钮：

取消

确认发布

**14.4 配置版本管理**

每次发布生成一个不可变版本：

interface IdmConfigVersion {

id: string;

subjectId: string;

versionNo: number;

versionName: string;

configSnapshot: IdmGraphConfig;

publishStatus: 'PUBLISHED' | 'ROLLBACKED';

publishedBy: string;

publishedAt: string;

changeSummary: string;

}

**14.5 任务生成逻辑**

发布成功后，系统为主体生成或更新以下任务：

| **任务类型** | **说明** |
| --- | --- |
| OneID 生成任务 | 一个主体一个任务，控制整体 OneID 生成逻辑，落地 Hive 表 |
| ID 数据同步任务 | 依赖 OneID 生成任务，将 ID 到 BaseID 映射同步至 ClickHouse |
| 多主体关系生成任务 | 依赖 OneID 生成任务，将主体间关系构建为 BaseID 到 BaseID |
| 多主体关系数据同步任务 | 依赖多主体关系生成任务，将关系同步至 ClickHouse |

**15. 功能九：手动运行与任务重跑**

**15.1 手动运行所有任务**

入口：

任务信息页 / 运行

点击后运行所有 ID-Mapping 任务。

点击运行按钮可以手动运行所有 ID-Mapping 任务，可能导致 OneID 改变。

**15.2 单任务重新运行**

入口：

任务列表 / 操作 / 重新运行

逻辑：

1. 用户点击重新运行；
2. 系统判断任务状态；
3. 若任务正在运行，禁止重跑；
4. 若任务失败或成功，允许重新运行；
5. 重跑时保留本次运行记录；
6. 任务状态变为 RUNNING；
7. 下游依赖任务根据 DAG 重新调度。

**15.3 重跑确认**

弹窗：

重新运行该任务可能导致 OneID 结果发生变化。

如果该任务存在下游标签、分群、画像或营销依赖，下游数据可能出现短暂不一致。

是否继续？

**16. 功能十：任务信息管理**

**16.1 页面目标**

任务信息页用于展示所有 ID-Mapping 任务详情，包括库表名、身份标识 ID、创建时间、运行状态、任务类型、主体、多主体关系等。文档中说明该页面支持任务总览、筛选、运行视图、运行记录和单独重新运行。

**16.2 顶部总览**

| **指标** | **说明** |
| --- | --- |
| 总任务数 | 当前环境下所有 ID-Mapping 任务数 |
| 成功任务数 | 最近一次运行成功 |
| 失败任务数 | 最近一次运行失败 |
| 运行中任务数 | 当前正在运行 |
| 等待中任务数 | 等待上游依赖 |
| 最近运行时间 | 最近一次任务触发时间 |

**16.3 筛选项**

| **筛选项** | **可选值** |
| --- | --- |
| 任务大类 | 主体 OneID 任务 / 多主体关系任务 |
| 任务类型 | OneID 生成、ID 数据同步、多主体关系生成、多主体关系同步 |
| 主体 | 已配置主体 |
| 多主体关系 | 已配置关系 |
| 运行状态 | 成功、失败、运行中、等待、未运行 |
| 创建时间 | 日期范围 |
| 更新时间 | 日期范围 |

**16.4 任务列表字段**

| **字段** | **说明** |
| --- | --- |
| 任务名称 | 系统生成 |
| 任务类型 | OneID 生成等 |
| 主体 | 用户、车、门店等 |
| 多主体关系 | 人车购买关系等 |
| 库表名 | Hive 或 ClickHouse 表名 |
| 身份标识 ID | ID 英文标识 |
| 创建时间 | 任务创建时间 |
| 最近运行时间 | 最近一次运行时间 |
| 运行状态 | SUCCESS / FAILED / RUNNING |
| 耗时 | 最近一次任务耗时 |
| 操作 | 运行视图、运行记录、重新运行 |

**16.5 运行视图**

点击“运行视图”后，展示该任务上游依赖 DAG。

节点展示：

| **信息** | **说明** |
| --- | --- |
| 任务名称 | 节点名称 |
| 任务类型 | 数据集任务 / OneID 任务 / 同步任务 |
| 状态 | 成功、失败、运行中、等待 |
| 开始时间 | 开始运行时间 |
| 结束时间 | 结束时间 |
| 耗时 | 运行耗时 |

**16.6 运行记录**

展示最近 30 天执行情况。

字段：

| **字段** | **说明** |
| --- | --- |
| 运行日期 | yyyy-MM-dd |
| 触发方式 | 自动 / 手动 / 重跑 |
| 状态 | 成功 / 失败 / 运行中 |
| 开始时间 | datetime |
| 结束时间 | datetime |
| 耗时 | duration |
| 数据分区 | p\_date |
| 错误信息 | 失败时展示 |

**17. 功能十一：数据探查分析**

**17.1 功能目标**

数据探查用于排查 ID 到 OneID 的映射关系，以及 OneID 变化记录。文档中说明，数据探查支持查询 ID 到 OneID 的映射关系，以及 OneID 变更记录。

**17.2 OneID 映射查询**

**查询入口**

数据探查 / OneID 映射

**查询条件**

| **字段** | **必填** | **说明** |
| --- | --- | --- |
| 主体 | 是 | 选择用户主体 |
| 查询环境 | 是 | 离线 / 实时 / 全部 |
| ID 类型 | 是 | UID、Phone、DeviceID 等 |
| ID 值 | 是 | 支持单个或批量输入 |
| 查询时间 | 否 | 默认最新 |

**查询结果**

| **字段** | **说明** |
| --- | --- |
| ID 类型 | 查询的 ID 类型 |
| ID 值 | 查询输入值 |
| OneID | 映射得到的 OneID |
| 来源环境 | 离线 / 实时 |
| 生成任务 | 对应任务 |
| 最近更新时间 | 更新时间 |
| 是否异常 | 是否存在环境不一致 |
| 操作 | 查看详情、查看血缘、查看重组变化 |

**异常判断**

| **场景** | **异常提示** |
| --- | --- |
| 同一 ID 在离线和实时环境 OneID 不同 | 离线与实时 OneID 不一致，请检查任务更新情况 |
| 查询不到 OneID | 当前 ID 未生成 OneID，请检查 ID 数据源或参考关系 |
| 批量查询中部分 ID 无结果 | 部分 ID 暂无映射结果 |

**17.3 OneID 重组变化**

**目标**

查看 OneID 的变化过程，用于排查因 ID-Mapping 配置变化或参考关系变化带来的 OneID 重组。文档中也建议，如果 ID 对应的 OneID 频繁变动，应检查参考关系配置或关系数据。

**查询条件**

| **字段** | **必填** | **说明** |
| --- | --- | --- |
| 主体 | 是 | 用户 |
| ID 类型 | 是 | 查询入口 ID |
| ID 值 | 是 | 具体 ID |
| 时间范围 | 是 | 默认最近 30 天 |

**查询结果**

| **字段** | **说明** |
| --- | --- |
| 变更时间 | OneID 变化时间 |
| 变更前 OneID | old\_base\_id |
| 变更后 OneID | new\_base\_id |
| 变更原因 | 参考关系变化 / 优先级变化 / 策略变化 / 数据修正 |
| 触发任务 | task\_id |
| 配置版本 | version\_no |
| 操作人 | 若为手动发布导致，则显示发布人 |

**18. 功能十二：血缘管理**

**18.1 功能目标**

血缘管理用于查看 ID-Mapping 上下游依赖，帮助运维排查异常任务，提高处理效率。文档说明血缘视图支持查看标签、分群、数据集、资产输出、IDM 在线导入、多主体转换关系的上下游血缘情况。

**18.2 血缘对象**

系统需要支持以下对象血缘：

| **对象** | **上游** | **下游** |
| --- | --- | --- |
| ID 类型 | Hive 数据集、实时算子 | OneID 任务、标签、分群、在线服务 |
| OneID 任务 | ID 数据、参考关系 | ID 同步任务、标签、画像 |
| 多主体关系 | 关系数据集、主体 OneID | 跨主体圈选、跨主体分析 |
| 标签 | OneID、行为数据 | 分群、营销触达 |
| 分群 | 标签、OneID | 营销任务 |
| 在线服务 | ID 映射表 | API 调用方 |

**18.3 交互逻辑**

1. 用户进入血缘视图；
2. 选择对象类型；
3. 输入对象名称或 ID；
4. 点击查询；
5. 画布展示上下游 DAG；
6. 点击节点展示详情；
7. 支持展开上游、展开下游；
8. 支持跳转到对应配置页或任务页。

**19. 功能十三：多主体转换关系配置**

虽然本 PRD 重点是用户 ID-Mapping，但系统需要预留多主体关系配置能力，因为用户主体经常需要与车、门店、商品等主体建立关系。多主体 ID 图谱支持构建“人”以外的主体，如车、商户等，并通过配置多主体间映射关系，实现多主体场景管理与分析。

**19.1 配置入口**

ID 图谱构建 / 主体转换关系配置 / 配置 / 新建主体转换关系

**19.2 表单字段**

| **字段** | **必填** | **说明** |
| --- | --- | --- |
| 关系名称 | 是 | 如人车购买关系 |
| 关系描述 | 否 | 业务说明 |
| 关系数据集 | 是 | Hive 数据集 |
| 日期分区字段 | 是 | p\_date |
| 日期分区格式 | 是 | yyyyMMdd |
| 更新方式 | 是 | 全量 / 增量 |
| 主体 A | 是 | 如人 |
| 主体 A ID | 是 | 如 UID |
| 主体 A 字段 | 是 | 数据集字段 |
| 主体 B | 是 | 如车 |
| 主体 B ID | 是 | 如 VIN |
| 主体 B 字段 | 是 | 数据集字段 |
| A 到 B 转换方式 | 是 | 一对一 / 一对多 / 不允许转换 |
| B 到 A 转换方式 | 是 | 一对一 / 一对多 / 不允许转换 |
| 转换策略字段 | 条件必填 | 一对一但数据一对多时必填 |
| 转换策略逻辑 | 条件必填 | 最新 / 最早 / 最大 / 最小 |

转换方式支持一对多、一对一和不允许转换；如果设置一对一但实际存在一对多关系，需要配置转换策略，否则随机选择。

**19.3 转换方式逻辑**

| **配置** | **逻辑** |
| --- | --- |
| 一对多 | A 可以转换出多个 B |
| 一对一 | A 只能转换出一个 B，若数据中有多个，按策略选择 |
| 不允许转换 | 该方向不可用 |

示例：

人 -> 车：一对多

车 -> 人：一对一，按最新购买时间选择

**20. 功能十四：高级配置**

**20.1 授权 ID Mapping 配置权限**

入口：

高级配置 / 授权 ID Mapping 配置权限

逻辑：

1. 点击后跳转项目中心；
2. 支持配置 ID Mapping 管理员；
3. 被授权者拥有编辑 ID 图谱权限。

**20.2 管理 ID Mapping 在线服务配置**

入口：

高级配置 / 管理 IDMapping 在线服务配置

功能：

为主体及转换关系构建在线服务，用于高 QPS、低延迟接口查询。

该入口支持对 ID Mapping 的主体及转换关系构建在线服务，用于高 QPS、低延迟接口快速查询。

**在线服务配置字段**

| **字段** | **说明** |
| --- | --- |
| 服务对象 | 主体 / 转换关系 |
| 主体 | 用户、车等 |
| ID 类型 | 可查询的 ID 类型 |
| 返回字段 | OneID、关联 ID、转换主体 |
| QPS 限制 | 默认值 |
| 是否启用 | 开启 / 关闭 |
| 鉴权方式 | Token / AKSK |
| 备注 | 服务用途 |

**20.3 管理主体及可见范围**

入口：

高级配置 / 管理主体及可见范围

该功能支持对主体和 ID 进行反向禁用，默认全部可用，勾选特定对象后可批量禁用。

**主体资源权限**

| **操作** | **说明** |
| --- | --- |
| 按用户筛选 | 选择用户 |
| 勾选主体资源 | 选择要禁用的主体 |
| 批量禁用 | 禁用后该用户访问各项目时生效 |

**ID 类型资源权限**

| **操作** | **说明** |
| --- | --- |
| 按用户筛选 | 支持 |
| 按用户组筛选 | 支持 |
| 按角色筛选 | 支持 |
| 勾选 ID 类型 | 选择要禁用的 ID |
| 批量禁用 | 禁用后不可在下游使用 |

**21. 功能十五：OneID 数据修正**

**21.1 功能目标**

当用户先匿名访问、后实名登录，或 ID-Mapping 配置发生变化时，历史行为数据可能记录在旧 OneID 上，导致前后行为无法串联。OneID 数据修正用于将历史 OneID 修正为最新 OneID。文档中说明，IDM 基于完整 ID 血缘体系提供数据自动修正能力，可以将历史 OneID 修正为最新 OneID。

**21.2 功能开关**

默认关闭。

配置项：

interface OneIdCorrectionSetting {

enabled: boolean;

correctionScope: Array<'VISUAL\_MODELING' | 'PROFILE\_DETAIL' | 'BEHAVIOR\_DETAIL'>;

scheduleType: 'DAILY';

maxBackfillDays: number;

}

**21.3 支持范围**

支持范围包括：

| **范围** | **是否支持** |
| --- | --- |
| 可视化建模任务，包含 IDM 算子且开启回刷开关 | 支持 |
| 注册为数据档案且包含 IDM 算子的任务 | 支持 |
| 行为 / 明细数据档案 | 支持 |
| 标签 | 不支持 |
| 分群 | 不支持 |

**21.4 修正逻辑**

每天定时任务启动

↓

读取 OneID 重组变化表

↓

识别 old\_base\_id -> new\_base\_id 映射

↓

扫描支持修正的数据资产

↓

将历史 old\_base\_id 回刷为 new\_base\_id

↓

记录修正日志

↓

更新血缘与任务状态

**22. OneID 生成核心算法逻辑**

**22.1 算法定位**

VeCDP 的 ID-Mapping 使用了图模型，但没有直接使用传统连通图算法，也没有使用图存储，而是通过自研算法和关联表存储来保证高效、符合业务事实且可追溯。

因此本系统实现时，不应简单把所有连通 ID 全部合并，而应遵循：

优先级

参考关系

参考策略

历史 OneID 复用

解绑策略

强制一对一

离线与实时融合

**22.2 生成流程**

输入：

- ID 类型配置

- ID 全量数据

- ID 参考关系数据

- ID 优先级

- OneID 策略

- 历史 OneID 映射

输出：

- ID -> OneID 映射表

- OneID 变化记录表

- OneID 生成任务日志

**22.3 生成伪代码**

function generateOneId(subjectConfig, idData, relationData, historyMapping) {

const idTypes = sortByPriority(subjectConfig.idTypes);

const result = new Map<string, string>();

const changes = [];

for (const idType of idTypes) {

const ids = idData[idType.code];

for (const idValue of ids) {

const idKey = buildIdKey(idType.code, idValue);

const referencedOneId = findReferencedOneId({

idType,

idValue,

relationData,

result,

subjectConfig

});

const historicalOneId = historyMapping.get(idKey);

let finalOneId;

if (subjectConfig.unbindEnabledFor(idType)) {

finalOneId = referencedOneId || createNewOneId(idKey);

} else {

finalOneId = referencedOneId || historicalOneId || createNewOneId(idKey);

}

if (subjectConfig.forceOneToOneEnabled(idType)) {

finalOneId = enforceOneToOne(idType, idValue, finalOneId);

}

result.set(idKey, finalOneId);

if (historicalOneId && historicalOneId !== finalOneId) {

changes.push({

idType: idType.code,

idValue,

oldBaseId: historicalOneId,

newBaseId: finalOneId,

reason: detectChangeReason(idType, idValue)

});

}

}

}

return {

mapping: result,

changes

};

}

**23. 数据模型设计**

**23.1 主体表**

CREATE TABLE idm\_subject (

id STRING,

tenant\_id STRING,

project\_id STRING,

subject\_name STRING,

subject\_code STRING,

subject\_type STRING,

avatar\_type STRING,

description STRING,

status STRING,

config\_status STRING,

created\_by STRING,

updated\_by STRING,

created\_at TIMESTAMP,

updated\_at TIMESTAMP

);

**23.2 ID 类型表**

CREATE TABLE idm\_id\_type (

id STRING,

tenant\_id STRING,

subject\_id STRING,

id\_name STRING,

id\_code STRING,

id\_kind STRING,

id\_data\_type STRING,

channel\_identifier STRING,

description STRING,

data\_source\_type STRING,

dataset\_id STRING,

partition\_field STRING,

partition\_format STRING,

update\_mode STRING,

id\_field STRING,

status STRING,

created\_by STRING,

updated\_by STRING,

created\_at TIMESTAMP,

updated\_at TIMESTAMP

);

**23.3 参考关系表**

CREATE TABLE idm\_reference\_relation (

id STRING,

tenant\_id STRING,

subject\_id STRING,

relation\_name STRING,

relation\_desc STRING,

dataset\_id STRING,

partition\_field STRING,

partition\_format STRING,

update\_mode STRING,

source\_id\_type\_id STRING,

source\_field STRING,

target\_id\_type\_id STRING,

target\_field STRING,

mapping\_type STRING,

strategy\_enabled BOOLEAN,

strategy\_field STRING,

strategy\_type STRING,

unbind\_enabled BOOLEAN,

status STRING,

created\_by STRING,

updated\_by STRING,

created\_at TIMESTAMP,

updated\_at TIMESTAMP

);

**23.4 图谱配置表**

CREATE TABLE idm\_graph\_config (

id STRING,

tenant\_id STRING,

subject\_id STRING,

version\_no BIGINT,

config\_status STRING,

graph\_json STRING,

published\_at TIMESTAMP,

published\_by STRING,

created\_at TIMESTAMP,

updated\_at TIMESTAMP

);

**23.5 ID 到 OneID 映射表**

CREATE TABLE idm\_id\_oneid\_mapping (

tenant\_id STRING,

subject\_id STRING,

id\_type\_code STRING,

id\_value STRING,

base\_id STRING,

env STRING,

config\_version BIGINT,

task\_instance\_id STRING,

updated\_at TIMESTAMP,

p\_date STRING

);

**23.6 OneID 变化记录表**

CREATE TABLE idm\_oneid\_change\_log (

id STRING,

tenant\_id STRING,

subject\_id STRING,

id\_type\_code STRING,

id\_value STRING,

old\_base\_id STRING,

new\_base\_id STRING,

change\_reason STRING,

config\_version BIGINT,

task\_instance\_id STRING,

changed\_at TIMESTAMP,

p\_date STRING

);

**24. 接口设计**

**24.1 获取主体列表**

GET /api/idm/subjects

返回：

{

"list": [

{

"id": "subj\_user",

"subjectName": "用户",

"subjectCode": "user",

"subjectType": "USER",

"idTypeCount": 4,

"relationCount": 3,

"configStatus": "PUBLISHED",

"latestTaskStatus": "SUCCESS",

"lastRunAt": "2026-05-22 08:00:00"

}

]

}

**24.2 创建主体**

POST /api/idm/subjects

请求：

{

"subjectName": "用户",

"subjectCode": "user",

"subjectType": "USER",

"description": "平台用户主体"

}

**24.3 创建 ID 类型**

POST /api/idm/subjects/{subjectId}/id-types

请求：

{

"idName": "手机号",

"idCode": "phone",

"idKind": "SINGLE",

"idDataType": "STRING",

"channelIdentifier": "PHONE",

"description": "用户手机号",

"dataConfig": {

"enabled": true,

"dataSourceType": "OFFLINE\_REALTIME",

"datasetId": "ds\_user\_phone",

"partitionField": "p\_date",

"partitionFormat": "yyyyMMdd",

"updateMode": "FULL",

"idField": "phone"

}

}

**24.4 创建参考关系**

POST /api/idm/subjects/{subjectId}/reference-relations

请求：

{

"relationName": "设备登录用户关系",

"datasetId": "ds\_device\_uid\_relation",

"partitionField": "p\_date",

"partitionFormat": "yyyyMMdd",

"updateMode": "FULL",

"sourceIdTypeId": "device\_id",

"sourceField": "device\_id",

"targetIdTypeId": "uid",

"targetField": "uid",

"mappingType": "MANY\_TO\_ONE",

"strategyEnabled": true,

"strategyField": "last\_login\_time",

"strategyType": "LATEST",

"unbindEnabled": false

}

**24.5 保存图谱草稿**

PUT /api/idm/subjects/{subjectId}/graph/draft

**24.6 预检查**

POST /api/idm/subjects/{subjectId}/graph/validate

返回：

{

"hasError": false,

"items": [

{

"level": "WARNING",

"code": "LOW\_PRIORITY\_ID\_ISOLATED",

"message": "设备 ID 为低优先级 ID，但未配置参考关系，可能独立生成 OneID。"

}

]

}

**24.7 发布配置**

POST /api/idm/subjects/{subjectId}/graph/publish

**24.8 查询 OneID 映射**

POST /api/idm/explore/oneid-mapping

请求：

{

"subjectId": "subj\_user",

"env": "ALL",

"idTypeCode": "phone",

"idValues": ["13800000000"]

}

**25. 状态机设计**

**25.1 配置状态**

NOT\_CONFIGURED

↓

DRAFT

↓

VALIDATED

↓

PUBLISHED

↓

RUNNING

↓

EFFECTIVE

异常状态：

VALIDATE\_FAILED

PUBLISH\_FAILED

TASK\_FAILED

**25.2 任务状态**

| **状态** | **说明** |
| --- | --- |
| NOT\_RUN | 未运行 |
| WAITING | 等待上游 |
| RUNNING | 运行中 |
| SUCCESS | 成功 |
| FAILED | 失败 |
| CANCELED | 已取消 |

**26. 验收标准**

**26.1 主体配置验收**

| **编号** | **验收标准** |
| --- | --- |
| A1 | 管理员可以创建用户主体 |
| A2 | 主体英文标识全集团唯一 |
| A3 | 普通用户不可创建主体 |
| A4 | 创建主体后自动进入 OneID 配置页 |

**26.2 ID 类型配置验收**

| **编号** | **验收标准** |
| --- | --- |
| B1 | 支持模板批量创建 ID 类型 |
| B2 | 支持自定义创建单一 ID |
| B3 | 支持自定义创建组合 ID |
| B4 | ID 英文标识全集团唯一 |
| B5 | 未配置数据源的 ID 不可加入 OneID 图谱 |
| B6 | Hive 数据集之外的数据集不可选择 |
| B7 | 字段类型不匹配时有明确提示 |

**26.3 参考关系验收**

| **编号** | **验收标准** |
| --- | --- |
| C1 | 支持 1:1、1:N、N:1、N:N 映射逻辑 |
| C2 | 支持参考策略字段和策略逻辑 |
| C3 | 支持解绑开关 |
| C4 | 来源 ID 和目标 ID 不能相同 |
| C5 | 未配置数据源的 ID 不能创建参考关系 |

**26.4 OneID 图谱验收**

| **编号** | **验收标准** |
| --- | --- |
| D1 | 支持拖拽 ID 到图谱 |
| D2 | 支持拖拽调整优先级 |
| D3 | 支持连线配置参考关系 |
| D4 | 发布前必须预检查 |
| D5 | 存在 Error 时禁止发布 |
| D6 | 发布后生成配置版本 |
| D7 | 发布后生成或更新 OneID 任务 |

**26.5 运维验收**

| **编号** | **验收标准** |
| --- | --- |
| E1 | 任务信息页展示所有 ID-Mapping 任务 |
| E2 | 支持按任务类型、主体、状态筛选 |
| E3 | 支持查看运行视图 |
| E4 | 支持查看最近 30 天运行记录 |
| E5 | 支持单任务重跑 |
| E6 | 支持查询 ID 到 OneID |
| E7 | 支持查看 OneID 重组变化 |
| E8 | 支持查看血缘和下游影响 |

**27. 非功能要求**

**27.1 性能要求**

| **场景** | **要求** |
| --- | --- |
| 主体列表加载 | 2 秒内返回 |
| ID 类型列表加载 | 2 秒内返回 |
| 图谱节点数 50 以下 | 拖拽无明显卡顿 |
| OneID 映射单 ID 查询 | 1 秒内返回 |
| OneID 批量查询 1000 个 ID | 10 秒内返回 |
| 在线服务查询 | 支持高 QPS、低延迟 |

**27.2 安全要求**

1. 所有配置操作必须记录操作日志；
2. 删除 ID、发布配置、运行任务必须记录审计日志；
3. 手机号、邮箱等敏感 ID 展示时默认脱敏；
4. 用户无权限时，不返回敏感 ID 明文；
5. 在线服务必须鉴权；
6. 权限变更必须记录操作人、时间、变更前后内容。

**27.3 可追溯要求**

系统必须能追溯：

| **对象** | **追溯内容** |
| --- | --- |
| OneID | 由哪些 ID 生成 |
| ID 映射 | 来源数据集、任务、配置版本 |
| OneID 变化 | 变更前、变更后、原因 |
| 配置变更 | 修改人、修改时间、配置快照 |
| 任务运行 | 运行参数、分区、状态、错误信息 |

**28. 关键产品原则**

本功能开发时需要严格遵守以下原则：

1. **业务 ID 最高优先级**：UID、会员 ID 等业务主键优先级通常最高；
2. **低优 ID 不应孤立**：设备 ID、OpenID、UnionID 等应尽量通过参考关系连接到高优 ID；
3. **OneID 不能简单按连通图合并**：必须考虑优先级、参考策略、解绑、历史复用和强制一对一；
4. **配置修改必须可追溯**：所有影响 OneID 的配置都要有版本；
5. **发布和运行分离**：发布只是配置生效准备，任务运行后数据结果才更新；
6. **删除必须强提醒**：删除 ID 会影响参考关系、多主体关系、在线服务和下游任务；
7. **默认配置不要轻易改**：强制一对一、关闭 OneID 变化等高级策略必须谨慎开放；
8. **所有下游影响必须显式提示**：标签、分群、画像、营销、在线服务都可能受到 OneID 变化影响。

以上原则来自上传文档中的配置逻辑、最佳实践、运维管理和 FAQ：ID-Mapping 使用图模型但并非传统连通图算法；系统需通过配置的 ID 类型、参考关系、优先级和策略生成可追溯的 OneID。